// H07-P2: frozen-scene continuation only. No scene recapture, production caller,
// service allocation, route search, or publication gate is invoked here.
// Run each CLI audit under an external 300 s cap. Historical inputs and ledger
// snapshots remain immutable; each later receipt names every input byte stream.
import {readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, realpathSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {roundedConnectionRoute} from './dist/connection-routes.js';
import {extractFrozenScene, validateCandidate, staticLengthAccounting, auditStaticPair, readSceneFile} from './orbital-right-bank-pair-checks.mjs';
import {routingSourceFingerprint, sameRoutingSourceFingerprint} from './scripts/routing-source-fingerprint.mjs';
import {readSourceTransitionInput} from './orbital-right-bank-source-transition.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
export const H07_CONTINUATION = Object.freeze({
  source: 'f03eccfd099b94e0de1ffd269c481752bdc21ba8fbbb1e0ca95e38fc6be4bf2b',
  scene: '06281853046657c6384c776c2e49959b5d52d8b957b980d99faaa9de0ffa9760',
  anchor: '64e454779c06f8c9d777c5e05274b94e2e99fac76e145613aae5664b40279e5f',
  anchorReceipt: 'b0c371ab76c550f4724602f272397437545f1474e0f5e57730b7af37e6586cd5',
  anchorChecker: 'a2b4bbcf03191a9196f72eaa8963b0626259b38df2a40d891ca66d422c5993f3',
  anchorFile: 'docs/harnessing-work/H08-all-targets/source-refresh-p7/anchor-candidate.json',
  anchorReceiptFile: 'docs/harnessing-work/H08-all-targets/source-refresh-p7/anchor-acceptance.json',
  sourceTransition: 'docs/harnessing-work/H08-all-targets/source-refresh-p7/source-transition.json',
  sourceTransitionSha256: '1ef00a8654e983e963b4ff45a4571de9ccf6f1caaa965a2f75e44811c1410215',
  ledgerSchema: 'orbital-data-center/H07-continuation-ledger/1',
  pairReceiptSchema: 'orbital-data-center/H07-continuation-pair-receipt/1',
  bankReceiptSchema: 'orbital-data-center/H07-complete-bank-static-receipt/1'
});
const PAIR_SCHEMA = 'orbital-data-center/H07-static-pair-candidate/1';
const APPEND_ORDER = [0, 2, 3, 4];
const inputRegistries = new WeakMap();
const sha = value => createHash('sha256').update(Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clone = value => JSON.parse(JSON.stringify(value));
const ids = rows => rows.map(row => row.id);
const manifest = rows => ({ids: ids(rows), count: rows.length, geometryDigest: sha(rows)});
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; };
const runtimeFingerprint = () => routingSourceFingerprint({entries: ['orbital-right-bank-diagnostic.mjs']});
const checkerFingerprint = () => routingSourceFingerprint({entries: ['orbital-right-bank-continuation-checks.mjs']});
const anchorCheckerFingerprint = () => routingSourceFingerprint({entries: ['orbital-right-bank-pair-checks.mjs']});
const routeValue = route => ({id: route.id, points: route.points, radiusM: route.radiusM, clearanceM: route.clearanceM ?? 0, sectionIds: route.sectionIds});
const routeRecord = route => { const value = routeValue(route); return {...value, geometryDigest: sha(value)}; };

export class ContinuationError extends Error {
  constructor(code, message, details = {}) { super(message); this.name = 'ContinuationError'; this.code = code; this.details = details; }
}
function requireValue(condition, code, message, details) { if (!condition) throw new ContinuationError(code, message, details); }
function exact(actual, expected, code, message) { requireValue(equal(actual, expected), code, message); }
function exactKeys(value, keys, name) { requireValue(value && typeof value === 'object' && !Array.isArray(value) && equal(Object.keys(value).sort(), [...keys].sort()), 'input-schema', name + ' permits exactly ' + keys.join(', ')); }
function checkBudget(prepared) { requireValue(Date.now() - prepared.started <= 300000, 'runtime-cap-exceeded', 'The bounded 300 s continuation execution is incomplete.'); }
function phase(prepared, name) { checkBudget(prepared); prepared.onPhase?.(name); }

/** A ledger is an immutable prefix; the historical anchor is supplied separately. */
export function validateContinuationLedger(value) {
  exactKeys(value, ['schema', 'entries'], 'Continuation ledger');
  requireValue(value.schema === H07_CONTINUATION.ledgerSchema && Array.isArray(value.entries) && value.entries.length <= APPEND_ORDER.length, 'ledger-schema', 'An H07 continuation ledger has at most four appended entries.');
  value.entries.forEach((entry, i) => {
    exactKeys(entry, ['pairIndex', 'candidate', 'receipt'], 'Ledger entry');
    requireValue(entry.pairIndex === APPEND_ORDER[i], 'ledger-order', 'Accepted continuation pairs must be the exact prefix [0, 2, 3, 4].');
    requireValue(typeof entry.candidate === 'string' && entry.candidate.length > 0 && !path.isAbsolute(entry.candidate) && typeof entry.receipt === 'string' && entry.receipt.length > 0 && !path.isAbsolute(entry.receipt), 'ledger-input', 'Every accepted pair needs repository-owned candidate and receipt paths relative to its ledger.');
  });
  return value.entries;
}

function captureInput(prepared, filename, role) {
  const resolved = path.resolve(filename), bytes = readFileSync(resolved);
  const repositoryPath = path.relative(ROOT, resolved).split(path.sep).join('/');
  requireValue(repositoryPath && !repositoryPath.startsWith('../') && !path.isAbsolute(repositoryPath), 'nonportable-input', 'Save continuation inputs in the repository before acceptance so future checkouts can replay the same artifacts.');
  const record = {role, path: resolved, repositoryPath, sha256: sha(bytes), bytes: bytes.length};
  const existing = prepared.inputs.find(row => row.path === resolved);
  requireValue(!existing || existing.sha256 === record.sha256, 'input-changed', 'A repeated input changed during preparation: ' + resolved);
  if (!existing) inputRegistries.get(prepared).push(freeze(record));
  return {record, bytes};
}

/** Historical absolute paths are evidence labels; repo-relative paths replay. */
export function resolveRecordedContinuationInput(row, {root = ROOT} = {}) {
  requireValue(typeof row?.path === 'string' && path.isAbsolute(row.path), 'receipt-inputs', 'A recorded input needs its original absolute path.');
  let relative = row.repositoryPath;
  if (relative === undefined) {
    const fromCurrentRoot = path.relative(root, row.path);
    if (fromCurrentRoot && !fromCurrentRoot.startsWith('..' + path.sep) && !path.isAbsolute(fromCurrentRoot)) relative = fromCurrentRoot;
    else {
      // Compatibility is limited to the repository-owned H07 evidence tree;
      // never search the filesystem or fall back to another external file.
      const marker = '/docs/harnessing-work/', index = row.path.lastIndexOf(marker);
      requireValue(index >= 0, 'nonportable-input', 'A historical input has no safe repository-relative identity.');
      relative = row.path.slice(index + 1);
    }
  }
  requireValue(typeof relative === 'string' && relative.length > 0 && !path.isAbsolute(relative), 'nonportable-input', 'A portable input path must be repository-relative.');
  const resolved = path.resolve(root, relative), checked = path.relative(root, resolved);
  requireValue(checked && checked !== '..' && !checked.startsWith('..' + path.sep) && !path.isAbsolute(checked), 'nonportable-input', 'A recorded relative path leaves the repository.');
  return resolved;
}

export function verifyRecordedContinuationInput(row, options = {}) {
  const resolved = resolveRecordedContinuationInput(row, options), bytes = readFileSync(resolved);
  requireValue(bytes.length === row.bytes && sha(bytes) === row.sha256, 'receipt-input-changed', 'An input to a previously accepted execution changed: ' + resolved);
  return {path: resolved, bytes: bytes.length, sha256: sha(bytes)};
}
function readJsonInput(prepared, filename, role) {
  const captured = captureInput(prepared, filename, role);
  return {...captured, value: JSON.parse(captured.bytes.toString('utf8'))};
}
function derivedPairs(state) {
  const byId = new Map(state.interfaces.map(row => [row.id, row]));
  const right = state.rightOrder.map(id => byId.get(id));
  requireValue(right.length === 10 && right.every(row => row?.harnessId === 'P-SA-2'), 'bank-inventory', 'The validated source must provide all ten ordered right conductors.');
  const pairs = Array.from({length: 5}, (_, index) => {
    const interfaces = right.slice(index * 2, index * 2 + 2);
    requireValue(interfaces[0].instance === interfaces[1].instance && interfaces[0].polarity === -interfaces[1].polarity, 'pair-identity', 'Adjacent source records do not form one actual feed/return circuit.');
    return {index, ids: ids(interfaces), instance: interfaces[0].instance, interfaces};
  });
  exact(pairs.map(pair => pair.ids), [[1, 0], [3, 2], [5, 4], [7, 6], [9, 8]].map(pair => pair.map(n => 'P-SA-2/' + n)), 'bank-order', 'The frozen current bank order differs from the bounded H07 continuation scope.');
  return pairs;
}

/** The only mutable design fields remain two finite control arrays. */
export function reconstructContinuationCandidate(scene, candidate) {
  const rows = validateCandidate(candidate, scene);
  return rows.map(row => {
    const line = scene.pair.find(item => item.id === row.id);
    const shape = roundedConnectionRoute(row.controls, line.bendRadiusM, 8);
    return {route: routeRecord({id: row.id, points: shape.points, radiusM: line.radiusM, clearanceM: .002}), bendLimited: shape.bendLimited, length: {id: row.id, ...staticLengthAccounting(shape, scene.descriptor.terminationAllowancesM[row.id])}};
  });
}

/** An earlier path is preserved by exact points/radius, not an equal count. */
export function requirePreservedRoutes(actual, expected) {
  exact(ids(actual), ids(expected), 'immutable-route-identity', 'Immutable route membership or order changed.');
  for (let i = 0; i < expected.length; i++) {
    exact(actual[i].points, expected[i].points, 'immutable-route-geometry', 'An already retained route changed: ' + expected[i].id);
    requireValue(actual[i].radiusM === expected[i].radiusM, 'immutable-route-radius', 'An already retained cable radius changed: ' + expected[i].id);
  }
}

export function checkRecordedAcceptance(receipt, {schema, candidateInput, scene, currentSource, currentChecker, actualChecks}) {
  requireValue(receipt?.schema === schema && receipt.status === 'static-pair-accepted' && receipt.completed === true && receipt.accepted === true && receipt.phase === 'finished' && receipt.unchangedSource === true && receipt.unchangedChecker === true && receipt.unchangedInputs === true, 'unaccepted-ledger-entry', 'A ledger entry must name a complete accepted execution with stable source, checker and inputs.');
  requireValue(sameRoutingSourceFingerprint(receipt.sourceStart, currentSource) && sameRoutingSourceFingerprint(receipt.sourceStart, receipt.sourceFinish), 'receipt-source', 'Accepted receipt source identity does not match the frozen runtime.');
  requireValue(sameRoutingSourceFingerprint(receipt.checkerStart, currentChecker) && sameRoutingSourceFingerprint(receipt.checkerStart, receipt.checkerFinish), 'receipt-checker', 'Accepted receipt checker identity does not match the applicable unchanged checker.');
  if (scene.descriptor.sourceTransition) {
    const expected = scene.descriptor.sourceTransition.declaration;
    const rows = Array.isArray(receipt.inputs) ? receipt.inputs.filter(row => row.role === 'source-transition') : [receipt.inputs?.sourceTransition].filter(Boolean);
    requireValue(rows.length === 1 && rows[0].repositoryPath === expected.repositoryPath && rows[0].sha256 === expected.sha256 && rows[0].bytes === expected.bytes,
      'receipt-transition', 'The current-source receipt must retain its exact frozen-geometry transition input.');
  }
  if (schema === H07_CONTINUATION.pairReceiptSchema) {
    requireValue(Array.isArray(receipt.inputs), 'receipt-inputs', 'A continuation receipt needs its full input manifest.');
    const expected = [
      ['scene', scene.identity.sha256], ['anchor-candidate', H07_CONTINUATION.anchor], ['anchor-receipt', H07_CONTINUATION.anchorReceipt], ['candidate', candidateInput.sha256],
      ...scene.descriptor.acceptedPrefix.flatMap(row => [['accepted-pair-' + row.pairIndex + '-candidate', row.candidateSha256], ['accepted-pair-' + row.pairIndex + '-receipt', row.receiptSha256]])
    ];
    for (const [role, digest] of expected) {
      const rows = receipt.inputs.filter(row => row.role === role);
      requireValue(rows.length === 1 && rows[0].sha256 === digest, 'receipt-inputs', 'The accepted receipt omits or changes its actual ' + role + ' input identity.');
    }
    requireValue(receipt.inputs.filter(row => row.role === 'ledger').length === 1, 'receipt-inputs', 'The accepted receipt needs one unambiguous prior ledger input.');
  }
  const recordedCandidate = Array.isArray(receipt.inputs) ? receipt.inputs.find(row => row.role === 'candidate') : receipt.inputs?.candidate;
  requireValue(recordedCandidate?.sha256 === candidateInput.sha256 && recordedCandidate.bytes === candidateInput.bytes, 'receipt-candidate', 'The accepted receipt names different candidate bytes.');
  exact(receipt.sceneIdentity, scene.identity, 'receipt-scene', 'The accepted receipt names another derived frozen context.');
  exact(receipt.sceneDescriptor, scene.descriptor, 'receipt-scene', 'The accepted receipt descriptor differs from the actual reconstructed context.');
  requireValue(actualChecks.ok === true, 'accepted-route-regression', 'A recorded accepted pair fails its complete present re-audit.');
  exact(receipt.checks, actualChecks, 'receipt-reconstruction', 'The saved acceptance predicates or constructed paths differ from a complete reconstruction and re-audit.');
}

function revalidateRecordedInputs(prepared, receipt, pairIndex) {
  requireValue(Array.isArray(receipt.inputs) && receipt.inputs.length >= 5, 'receipt-inputs', 'A continuation receipt must retain its complete transitive input inventory.');
  const recorded = receipt.inputs;
  requireValue(new Set(recorded.map(row => resolveRecordedContinuationInput(row))).size === recorded.length, 'receipt-inputs', 'A continuation receipt repeats an input path.');
  for (const role of ['scene', 'anchor-candidate', 'anchor-receipt', 'ledger', 'candidate']) requireValue(recorded.filter(row => row.role === role).length === 1, 'receipt-inputs', 'A continuation receipt needs exactly one ' + role + ' input.');
  for (const row of recorded) {
    requireValue(typeof row.path === 'string' && path.isAbsolute(row.path) && typeof row.role === 'string' && /^[0-9a-f]{64}$/.test(row.sha256) && Number.isInteger(row.bytes) && row.bytes > 0, 'receipt-inputs', 'A recorded input has incomplete identity.');
    const verified = verifyRecordedContinuationInput(row);
    captureInput(prepared, verified.path, 'prior-pair-' + pairIndex + '-input:' + row.role);
  }
  const priorLedgerRow = recorded.find(row => row.role === 'ledger');
  const priorLedgerPath = resolveRecordedContinuationInput(priorLedgerRow);
  const priorLedger = JSON.parse(readFileSync(priorLedgerPath, 'utf8'));
  const prefix = validateContinuationLedger(priorLedger);
  exact(prefix.map(row => row.pairIndex), prepared.accepted.map(row => row.pairIndex), 'receipt-prefix', 'A predecessor receipt does not bind the actual prior accepted ledger prefix.');
  const directory = path.dirname(priorLedgerPath);
  prefix.forEach((row, i) => {
    const previous = prepared.accepted[i];
    requireValue(sha(readFileSync(path.resolve(directory, row.candidate))) === previous.candidateInput.sha256 && sha(readFileSync(path.resolve(directory, row.receipt))) === previous.receiptInput.sha256, 'receipt-prefix', 'A predecessor receipt ledger references different accepted candidate or receipt bytes.');
  });
}

function allKnownRightRoutes(prepared) {
  const later = prepared.accepted.filter(row => row.pairIndex !== 0).flatMap(row => row.checks.constructedRoutes);
  const pair0 = prepared.accepted.find(row => row.pairIndex === 0)?.checks.constructedRoutes ?? prepared.pair0BaselineRoutes;
  return [...pair0, ...prepared.anchor.checks.constructedRoutes, ...later];
}

/** Build a context only from validated frozen geometry and re-audited history. */
export function continuationPairScene(prepared, pairIndex, {completeBank = false} = {}) {
  requireValue(prepared.anchor.candidateInput.sha256 === H07_CONTINUATION.anchor && prepared.anchor.receiptInput.sha256 === H07_CONTINUATION.anchorReceipt, 'anchor-changed', 'The historical first-pair candidate and receipt identities must stay pinned.');
  const pair = prepared.pairs[pairIndex];
  requireValue(pair && pair.index === pairIndex, 'pair-index', 'Pair index must select one of the five actual source circuits.');
  if (completeBank) requireValue(prepared.accepted.length === 4, 'bank-incomplete', 'Complete-bank acceptance needs all four continuation entries plus the fixed anchor.');
  const neighbors = [...prepared.mandatoryRoutes, ...allKnownRightRoutes(prepared).filter(route => !pair.ids.includes(route.id))];
  requireValue(new Set(ids(neighbors)).size === neighbors.length && !neighbors.some(route => pair.ids.includes(route.id)), 'neighbor-inventory', 'The immutable neighbor inventory is duplicated or includes an owned route.');
  const descriptor = {
    schema: 'orbital-data-center/H07-continuation-scene/1',
    mode: completeBank ? 'complete-bank-recheck' : 'ordered-pair-acceptance',
    baseSceneIdentity: prepared.baseScene.identity,
    configurationId: 'orbital-1-202606', stateId: prepared.baseScene.identity.stateId,
    sourceFingerprint: prepared.sourceStart.value,
    pairIndex, pairIds: pair.ids, circuitInstance: pair.instance,
    interfaceDigest: sha(prepared.interfaces),
    physicalAndOperational: prepared.baseScene.descriptor.geometry.physicalAndOperational,
    finalTerminalRegistry: prepared.baseScene.descriptor.geometry.finalTerminalRegistry,
    proposalServiceEnvelopes: prepared.baseScene.descriptor.geometry.proposalServiceEnvelopes,
    immutableRoutes: manifest(neighbors),
    mandatoryRouteDigest: sha(prepared.mandatoryRoutes),
    anchor: {candidateSha256: prepared.anchor.candidateInput.sha256, receiptSha256: prepared.anchor.receiptInput.sha256},
    acceptedPrefix: prepared.accepted.map(row => ({pairIndex: row.pairIndex, candidateSha256: row.candidateInput.sha256, receiptSha256: row.receiptInput.sha256})),
    clearanceM: .002,
    terminationAllowancesM: Object.fromEntries(pair.interfaces.map(row => [row.id, row.terminationAllowanceM])),
    ...(prepared.baseScene.descriptor.sourceTransition ? {sourceTransition: prepared.baseScene.descriptor.sourceTransition} : {})
  };
  const {priorRightRoutes: historicalH06PriorRightRoutes, ...baseCounts} = prepared.baseScene.counts;
  return freeze({
    descriptor,
    identity: {sha256: prepared.baseScene.identity.sha256, sourceFingerprint: prepared.sourceStart.value, stateId: prepared.baseScene.identity.stateId, geometryDigest: sha(descriptor)},
    pair: pair.interfaces, pairIds: pair.ids,
    physical: prepared.baseScene.physical, services: prepared.baseScene.services, terminals: prepared.baseScene.terminals,
    neighbors, ownedBaselineRoutes: pairIndex === 0 ? prepared.pair0BaselineRoutes : [],
    counts: {...baseCounts, historicalH06PriorRightRoutes, ownedBaselineRoutes: pairIndex === 0 ? 2 : 0, immutableRoutes: neighbors.length, neighboringRightRoutes: neighbors.filter(route => route.id.startsWith('P-SA-2/')).length, knownRightRoutes: allKnownRightRoutes(prepared).length}
  });
}

/** Rebind controls only after their original input/receipt has been validated. */
export function makeContinuationCandidate(prepared, pairIndex, routes, options = {}) {
  const scene = continuationPairScene(prepared, pairIndex, options);
  const candidate = {schema: PAIR_SCHEMA, scene: clone(scene.identity), routes: clone(routes)};
  validateCandidate(candidate, scene);
  return candidate;
}

/** Exact source controls define pair 0's canonical full-route construction. */
export function canonicalHistoricalPair0(prepared, scene, candidate, reconstructed) {
  const rows = validateCandidate(candidate, scene), changes = [];
  const bits = value => { const view = new DataView(new ArrayBuffer(8)); view.setFloat64(0, value); return view.getBigUint64(0); };
  for (const row of rows) {
    const attempt = prepared.historicalRightAttempts.find(item => item.id === row.id);
    requireValue(attempt?.ok === true && Array.isArray(attempt.controlPoints), 'historical-construction', 'Pair 0 needs its actual successful archived controls.');
    exact(row.controls, attempt.controlPoints, 'immutable-route-controls', 'Pair 0 controls differ from the actual archived construction: ' + row.id);
    const line = scene.pair.find(item => item.id === row.id), canonical = roundedConnectionRoute(attempt.controlPoints, line.bendRadiusM, 8);
    const actual = reconstructed.find(item => item.route.id === row.id).route, original = prepared.pair0BaselineRoutes.find(item => item.id === row.id);
    exact(actual.points, canonical.points, 'historical-construction', 'Pair 0 does not exactly match the pinned full-route constructor.');
    requireValue(actual.radiusM === original.radiusM && original.points.length === canonical.points.length, 'historical-construction', 'Pair 0 construction changes its original radius or point topology.');
    const changedCoordinates = [];
    for (let pointIndex = 0; pointIndex < canonical.points.length; pointIndex++) for (let coordinate = 0; coordinate < 3; coordinate++) {
      const before = original.points[pointIndex][coordinate], after = canonical.points[pointIndex][coordinate];
      if (before === after) continue;
      const delta = bits(before) > bits(after) ? bits(before) - bits(after) : bits(after) - bits(before);
      requireValue(Math.sign(before) === Math.sign(after) && delta <= 1n, 'historical-construction-difference', 'A pair 0 constructor difference exceeds the measured one-ULP normalization and needs a separate diagnosis.');
      changedCoordinates.push({pointIndex, coordinate, before, after, differenceM: after - before, ulpSteps: Number(delta)});
    }
    changes.push({id: row.id, controlsUnchanged: true, controlsDigest: sha(row.controls), originalPointsDigest: sha(original.points), canonicalPointsDigest: sha(canonical.points), changedCoordinateCount: changedCoordinates.length, maximumAbsoluteDifferenceM: Math.max(0, ...changedCoordinates.map(item => Math.abs(item.differenceM))), changedCoordinates});
  }
  return {basis: 'Exact archived controls are reconstructed by the pinned full-route radius/8-chord constructor. Original H06 prefix/suffix points remain evidence. Only the observed machine-precision arithmetic normalization is recorded; every geometry predicate audits the exact canonical points with unchanged tolerances.', routes: changes};
}

function auditWithPreservation(prepared, scene, candidate, pairIndex) {
  const reconstructed = reconstructContinuationCandidate(scene, candidate);
  const normalization = pairIndex === 0 ? canonicalHistoricalPair0(prepared, scene, candidate, reconstructed) : null;
  const checks = auditStaticPair(scene, candidate);
  if (normalization) checks.retainedPathNormalization = normalization;
  checkBudget(prepared);
  return checks;
}

/** Load once for bounded geometry work; only compactContext should be printed. */
export function prepareContinuation({
  sceneFile = path.join(ROOT, 'docs/harnessing-work/H06-current-evidence.json.gz'),
  anchorFile = path.join(ROOT, H07_CONTINUATION.anchorFile),
  anchorReceiptFile = path.join(ROOT, H07_CONTINUATION.anchorReceiptFile),
  sourceTransitionFile = H07_CONTINUATION.sourceTransition, expectTransition = H07_CONTINUATION.sourceTransitionSha256,
  ledgerFile = null, expectSource = H07_CONTINUATION.source, expectScene = H07_CONTINUATION.scene,
  started = Date.now(), onPhase = null
} = {}) {
  const prepared = {started, onPhase, accepted: []};
  inputRegistries.set(prepared, []);
  Object.defineProperty(prepared, 'inputs', {enumerable: true, get: () => Object.freeze([...inputRegistries.get(prepared)])});
  requireValue(expectSource === H07_CONTINUATION.source && expectScene === H07_CONTINUATION.scene, 'frozen-identity', 'This prerequisite is bound to the declared current source and immutable H06 geometry packet.');
  requireValue(Boolean(sourceTransitionFile) === Boolean(expectTransition) && expectTransition === H07_CONTINUATION.sourceTransitionSha256,
    'transition-identity', 'The current epoch requires its exact pinned frozen-geometry transition.');
  prepared.sourceStart = runtimeFingerprint(); prepared.checkerStart = checkerFingerprint(); prepared.anchorCheckerStart = anchorCheckerFingerprint();
  requireValue(prepared.sourceStart.value === H07_CONTINUATION.source && prepared.anchorCheckerStart.value === H07_CONTINUATION.anchorChecker, 'source-mismatch', 'The historical H06 runtime or accepted first-pair checker changed.');
  phase(prepared, 'before-validating-frozen-scene');
  const sceneInput = captureInput(prepared, sceneFile, 'scene');
  requireValue(sceneInput.record.sha256 === expectScene, 'scene-mismatch', 'The complete H06 compressed packet changed.');
  const loaded = readSceneFile(sceneInput.record.path);
  requireValue(loaded.sha256 === sceneInput.record.sha256, 'input-changed', 'The scene changed between input capture and extraction.');
  let transition = null;
  if (sourceTransitionFile) {
    const current = readSourceTransitionInput(sourceTransitionFile, {root: ROOT, expectedSha256: expectTransition});
    transition = readJsonInput(prepared, current.record.path, 'source-transition');
    requireValue(transition.record.sha256 === current.record.sha256, 'input-changed', 'The transition changed while being captured.');
  }
  prepared.baseScene = extractFrozenScene(loaded.report, {sceneSha256: loaded.sha256, sceneBytes: loaded.bytes, expectedSource: expectSource, currentSource: prepared.sourceStart, sourceTransition: transition?.value ?? null, sourceTransitionRecord: transition?.record ?? null});
  const state = loaded.report.reproductionStates[0];
  prepared.interfaces = state.interfaces; prepared.pairs = derivedPairs(state);
  prepared.historicalRightAttempts = loaded.report.rightReplay;
  prepared.mandatoryRoutes = prepared.baseScene.neighbors.filter(route => !route.id.startsWith('P-SA-2/'));
  prepared.pair0BaselineRoutes = prepared.baseScene.neighbors.filter(route => prepared.pairs[0].ids.includes(route.id));
  requireValue(prepared.mandatoryRoutes.length === 177 && prepared.pair0BaselineRoutes.length === 2, 'bank-inventory', 'The complete mandatory base or preserved first circuit is absent.');
  exact(ids(prepared.pair0BaselineRoutes), prepared.pairs[0].ids, 'bank-order', 'The preceding right pair order changed.');
  exact(prepared.baseScene.pairIds, prepared.pairs[1].ids, 'anchor-scope', 'The accepted historical repair is not actual pair 1.');
  requireValue(prepared.interfaces.every(row => Number.isFinite(row.terminationAllowanceM) && row.terminationAllowanceM >= 0), 'length-policy', 'Every authoritative frozen interface needs its source termination allowance.');
  phase(prepared, 'before-revalidating-historical-anchor');
  const anchorCandidate = readJsonInput(prepared, anchorFile, 'anchor-candidate');
  const anchorReceipt = readJsonInput(prepared, anchorReceiptFile, 'anchor-receipt');
  requireValue(anchorCandidate.record.sha256 === H07_CONTINUATION.anchor && anchorReceipt.record.sha256 === H07_CONTINUATION.anchorReceipt, 'anchor-changed', 'The accepted H07 first-pair candidate and receipt bytes must remain unchanged.');
  const anchorChecks = auditStaticPair(prepared.baseScene, anchorCandidate.value);
  checkRecordedAcceptance(anchorReceipt.value, {schema: 'orbital-data-center/H07-static-pair-receipt/1', candidateInput: anchorCandidate.record, scene: prepared.baseScene, currentSource: prepared.sourceStart, currentChecker: prepared.anchorCheckerStart, actualChecks: anchorChecks});
  prepared.anchor = {pairIndex: 1, candidate: anchorCandidate.value, candidateInput: anchorCandidate.record, receiptInput: anchorReceipt.record, checks: anchorChecks};
  const ledger = ledgerFile ? readJsonInput(prepared, ledgerFile, 'ledger') : {value: {schema: H07_CONTINUATION.ledgerSchema, entries: []}, record: null};
  const entries = validateContinuationLedger(ledger.value), ledgerDirectory = ledger.record ? path.dirname(ledger.record.path) : ROOT;
  prepared.ledgerInput = ledger.record;
  for (const entry of entries) {
    phase(prepared, 'before-revalidating-accepted-pair-' + entry.pairIndex);
    const candidateInput = readJsonInput(prepared, path.resolve(ledgerDirectory, entry.candidate), 'accepted-pair-' + entry.pairIndex + '-candidate');
    const receiptInput = readJsonInput(prepared, path.resolve(ledgerDirectory, entry.receipt), 'accepted-pair-' + entry.pairIndex + '-receipt');
    revalidateRecordedInputs(prepared, receiptInput.value, entry.pairIndex);
    const scene = continuationPairScene(prepared, entry.pairIndex);
    const checks = auditWithPreservation(prepared, scene, candidateInput.value, entry.pairIndex);
    checkRecordedAcceptance(receiptInput.value, {schema: H07_CONTINUATION.pairReceiptSchema, candidateInput: candidateInput.record, scene, currentSource: prepared.sourceStart, currentChecker: prepared.checkerStart, actualChecks: checks});
    requireValue(receiptInput.value.pairIndex === entry.pairIndex, 'receipt-pair', 'The acceptance receipt names another pair.');
    prepared.accepted.push({pairIndex: entry.pairIndex, candidate: candidateInput.value, candidateInput: candidateInput.record, receiptInput: receiptInput.record, checks});
  }
  prepared.nextPairIndex = APPEND_ORDER[prepared.accepted.length] ?? null;
  prepared.makeCandidate = (pairIndex, routes, options) => makeContinuationCandidate(prepared, pairIndex, routes, options);
  prepared.pairScene = pairIndex => continuationPairScene(prepared, pairIndex);
  phase(prepared, 'frozen-continuation-ready');
  for (const key of ['sourceStart', 'checkerStart', 'anchorCheckerStart', 'interfaces', 'pairs', 'historicalRightAttempts', 'mandatoryRoutes', 'pair0BaselineRoutes', 'anchor', 'accepted']) freeze(prepared[key]);
  return Object.freeze(prepared);
}

/** Full pair audit; acceptance can only append the next actual circuit. */
export function auditContinuation(prepared, candidate) {
  requireValue(prepared.nextPairIndex !== null, 'bank-complete', 'All continuation entries are present; use complete-bank acceptance.');
  const pairIndex = prepared.nextPairIndex, scene = continuationPairScene(prepared, pairIndex);
  phase(prepared, 'before-static-pair-' + pairIndex);
  const checks = auditWithPreservation(prepared, scene, candidate, pairIndex);
  return {pairIndex, scene, checks};
}

/** All five pairs are checked against the same final 187-route scene. */
export function auditCompleteBank(prepared) {
  requireValue(prepared.accepted.length === 4 && prepared.nextPairIndex === null, 'bank-incomplete', 'The bank needs pair 0, the preserved anchor, and pairs 2, 3 and 4.');
  const knownRight = allKnownRightRoutes(prepared), routes = [...prepared.mandatoryRoutes, ...knownRight];
  exact(ids(knownRight), prepared.pairs.flatMap(pair => pair.ids), 'bank-order', 'The final bank route inventory is not the actual ten-conductor order.');
  requireValue(routes.length === 187 && new Set(ids(routes)).size === 187, 'bank-inventory', 'The final static scene must retain exactly 187 distinct route records.');
  const results = prepared.pairs.map(pair => {
    phase(prepared, 'before-complete-bank-pair-' + pair.index);
    const origin = pair.index === 1 ? prepared.anchor : prepared.accepted.find(row => row.pairIndex === pair.index);
    const scene = continuationPairScene(prepared, pair.index, {completeBank: true});
    requireValue(scene.neighbors.length === 185, 'neighbor-inventory', 'Every final owned pair must retain all 185 other routes.');
    const candidate = makeContinuationCandidate(prepared, pair.index, origin.candidate.routes, {completeBank: true});
    const checks = auditWithPreservation(prepared, scene, candidate, pair.index);
    requirePreservedRoutes(checks.constructedRoutes, origin.checks.constructedRoutes);
    return {pairIndex: pair.index, pairIds: pair.ids, sourceCandidateSha256: origin.candidateInput.sha256, sourceReceiptSha256: origin.receiptInput.sha256, sceneIdentity: scene.identity, sceneDescriptor: scene.descriptor, checks};
  });
  return {ok: results.every(row => row.checks.ok), completedPairs: results.length, expectedPairs: 5, inventory: {interfaces: prepared.interfaces.length, physicalAndOperational: prepared.baseScene.physical.length, serviceEnvelopes: prepared.baseScene.services.length, finalTerminals: prepared.baseScene.terminals.length, nativeFluidRoutes: 135, proposalRoutes: 34, batteryRoutes: 8, rightRoutes: knownRight.length, completeRoutes: routes.length, immutableRoutesPerPair: 185}, finalRouteManifest: manifest(routes), pairs: results, scope: 'All five right-bank circuit pairs at the one frozen deployed/mated pose. Original physical geometry, native fluids, proposal service envelopes, battery/left/payload paths and all prior accepted right paths are preserved. This is complete-context right-bank static acceptance only; H08 motion, H09 production hookup and publication remain unassessed.'};
}

/** Safe small output for a new card or a geometry worker; no mesh dump. */
export function compactContinuationContext(prepared, pairIndex = prepared.nextPairIndex) {
  requireValue(pairIndex !== null, 'bank-complete', 'No next pair remains; use the complete-bank audit.');
  const pair = prepared.pairs[pairIndex], scene = continuationPairScene(prepared, pairIndex);
  return {
    schema: 'orbital-data-center/H07-continuation-readiness/1', readinessOnly: true, staticAcceptanceAssessed: false,
    nextPairIndex: prepared.nextPairIndex, selectedPairIndex: pairIndex, pairIds: pair.ids, circuitInstance: pair.instance,
    scene: scene.identity, descriptor: scene.descriptor, inventory: scene.counts,
    anchorCandidateSha256: prepared.anchor.candidateInput.sha256,
    interfaces: pair.interfaces,
    ownTerminalRecords: scene.terminals.filter(row => pair.ids.includes(row.lineId)),
    seeds: pair.interfaces.map(line => {
      const attempt = prepared.historicalRightAttempts.find(row => row.id === line.id);
      return attempt ? {id: line.id, historicalPlannerSeed: true, historicalAttemptAccepted: attempt.ok, controls: attempt.controlPoints, pointCount: attempt.points.length, pointsDigest: sha(attempt.points), provenance: 'Exact H06 ordered attempt; pair 0 controls are immutable, with full-route arithmetic normalization explicitly recorded at acceptance.'} : {id: line.id, historicalPlannerSeed: false, controls: null, provenance: 'Unattempted in H06. Source endpoints, unit normals and frozen own terminal fanouts are authoritative constraints for a new proposed design, not a historical planner seed.'};
    }),
    inputs: prepared.inputs,
    scope: 'Readiness/context only. No route search, production change or accepted new pair is implied.'
  };
}

export function continuationInputStability(prepared) {
  const sourceFinish = runtimeFingerprint(), checkerFinish = checkerFingerprint();
  const unchangedSource = sameRoutingSourceFingerprint(prepared.sourceStart, sourceFinish);
  const unchangedChecker = sameRoutingSourceFingerprint(prepared.checkerStart, checkerFinish) && sameRoutingSourceFingerprint(prepared.anchorCheckerStart, anchorCheckerFingerprint());
  const unchangedInputs = prepared.inputs.every(row => { const bytes = readFileSync(row.path); return bytes.length === row.bytes && sha(bytes) === row.sha256; });
  return {sourceFinish, checkerFinish, unchangedSource, unchangedChecker, unchangedInputs};
}

function parseArgs(args) {
  const allowed = ['--scene', '--anchor', '--anchor-receipt', '--ledger', '--candidate', '--output', '--prepare', '--complete', '--expect-source', '--expect-scene', '--source-transition', '--expect-transition'];
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    requireValue(allowed.includes(args[i]) && !options[args[i]] && typeof args[i + 1] === 'string' && !args[i + 1].startsWith('--'), 'arguments', 'Options are unique name/value pairs. Use --ledger <snapshot.json> and exactly one of --candidate <pair.json>, --prepare <context.json>, or --complete true; audits also require --output <receipt.json>.');
    options[args[i]] = args[i + 1];
  }
  requireValue(options['--ledger'], 'arguments', '--ledger must name an immutable ledger snapshot, including for the empty prefix.');
  requireValue([options['--candidate'], options['--prepare'], options['--complete']].filter(Boolean).length === 1 && (!options['--complete'] || options['--complete'] === 'true'), 'arguments', 'Choose exactly one candidate, preparation or complete-bank operation.');
  requireValue(options['--prepare'] || options['--output'], 'arguments', 'Audit mode needs a separate --output receipt.');
  requireValue(Boolean(options['--source-transition']) === Boolean(options['--expect-transition']), 'arguments', 'An explicit transition requires both its file and expected SHA256.');
  return options;
}

/** Reject output aliases before granting any checkpoint writer a path. */
export function safeContinuationOutput(options) {
  const destination = path.resolve(options['--output'] ?? options['--prepare']);
  requireValue(/\.json$/i.test(destination), 'arguments', 'The output must be a separate JSON file.');
  const inputPaths = new Set([
    options['--scene'] ?? path.join(ROOT, 'docs/harnessing-work/H06-current-evidence.json.gz'),
    options['--anchor'] ?? path.join(ROOT, H07_CONTINUATION.anchorFile),
    options['--anchor-receipt'] ?? path.join(ROOT, H07_CONTINUATION.anchorReceiptFile),
    options['--ledger'], ...(options['--candidate'] ? [options['--candidate']] : []),
    ...((options['--source-transition'] ?? H07_CONTINUATION.sourceTransition) ? [options['--source-transition'] ?? H07_CONTINUATION.sourceTransition] : [])
  ].map(filename => path.resolve(filename)));
  const ledgerPath = path.resolve(options['--ledger']);
  const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
  for (const row of validateContinuationLedger(ledger)) {
    inputPaths.add(path.resolve(path.dirname(ledgerPath), row.candidate));
    const receiptPath = path.resolve(path.dirname(ledgerPath), row.receipt);
    inputPaths.add(receiptPath);
    const previousReceipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
    if (Array.isArray(previousReceipt.inputs)) for (const input of previousReceipt.inputs) if (typeof input?.path === 'string') inputPaths.add(resolveRecordedContinuationInput(input));
  }
  const canonical = filename => existsSync(filename) ? realpathSync(filename) : path.resolve(filename);
  const outputPath = canonical(destination);
  requireValue(![...inputPaths].some(filename => canonical(filename) === outputPath), 'output-input-alias', 'The output aliases a scene, anchor, ledger, candidate, receipt or transitive predecessor input.');
  requireValue(!existsSync(destination), 'output-exists', 'Use a new output filename so an earlier receipt, context or evidence file cannot be overwritten.');
  requireValue(!existsSync(destination + '.tmp'), 'output-temp-exists', 'The atomic checkpoint temporary path must also be new.');
  return destination;
}

function main() {
  const started = Date.now(); let prepared, options, output;
  const receipt = {schema: H07_CONTINUATION.pairReceiptSchema, startedAt: new Date(started).toISOString(), runtimeCapSeconds: 300, externalRuntimeCapRequired: true, status: 'incomplete', completed: false, accepted: false, phase: 'initializing', sourceStart: null, checkerStart: null, inputs: []};
  const save = name => { receipt.phase = name; receipt.elapsedMs = Date.now() - started; if (output) { mkdirSync(path.dirname(output), {recursive: true}); writeFileSync(output + '.tmp', JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'}); renameSync(output + '.tmp', output); } };
  try {
    options = parseArgs(process.argv.slice(2));
    output = safeContinuationOutput(options);
    if (options['--complete']) receipt.schema = H07_CONTINUATION.bankReceiptSchema;
    if (options['--prepare']) receipt.schema = 'orbital-data-center/H07-continuation-preparation/1';
    save('before-reading-inputs');
    prepared = prepareContinuation({sceneFile: options['--scene'], anchorFile: options['--anchor'], anchorReceiptFile: options['--anchor-receipt'], ledgerFile: options['--ledger'], expectSource: options['--expect-source'], expectScene: options['--expect-scene'], sourceTransitionFile: options['--source-transition'], expectTransition: options['--expect-transition'], started, onPhase: save});
    receipt.sourceStart = prepared.sourceStart; receipt.checkerStart = prepared.checkerStart; receipt.inputs = prepared.inputs;
    requireValue(!prepared.inputs.some(row => row.path === output), 'arguments', 'An output cannot overwrite any anchor, ledger or accepted-history input.');
    if (options['--prepare']) {
      receipt.context = compactContinuationContext(prepared); receipt.status = 'continuation-context-prepared'; receipt.readinessOnly = true; receipt.staticAcceptanceAssessed = false;
    } else if (options['--complete']) {
      receipt.checks = auditCompleteBank(prepared); receipt.accepted = receipt.checks.ok; receipt.status = receipt.accepted ? 'complete-bank-static-accepted' : 'complete-bank-static-rejected';
    } else {
      const candidate = readJsonInput(prepared, options['--candidate'], 'candidate');
      const audited = auditContinuation(prepared, candidate.value);
      receipt.pairIndex = audited.pairIndex; receipt.pairIds = audited.scene.pairIds; receipt.sceneIdentity = audited.scene.identity; receipt.sceneDescriptor = audited.scene.descriptor; receipt.inventory = audited.scene.counts;
      receipt.checks = audited.checks; receipt.accepted = audited.checks.ok; receipt.status = receipt.accepted ? 'static-pair-accepted' : 'static-pair-rejected';
    }
  } catch (error) {
    receipt.accepted = false; receipt.status = error.code ? 'invalid-input' : 'fixture-error'; receipt.error = {name: error.name, code: error.code ?? 'fixture-error', message: error.message, details: error.details ?? null};
  }
  try {
    if (prepared) {
      Object.assign(receipt, continuationInputStability(prepared)); receipt.inputs = prepared.inputs;
      if (!receipt.unchangedSource || !receipt.unchangedChecker || !receipt.unchangedInputs) { receipt.accepted = false; receipt.status = 'identity-changed-during-check'; }
    } else { receipt.unchangedSource = false; receipt.unchangedChecker = false; receipt.unchangedInputs = false; }
    if (Date.now() - started > 300000) { receipt.accepted = false; receipt.status = 'runtime-cap-exceeded'; }
    receipt.completed = true; receipt.finishedAt = new Date().toISOString(); save('finished');
  } catch (error) {
    receipt.accepted = false; receipt.status = 'finalization-error'; receipt.completed = false; receipt.finalizationError = {name: error.name, message: error.message};
    try { save('finalization-error'); } catch { /* Keep the latest incomplete checkpoint. */ }
  }
  const preparedOnly = options?.['--prepare'] && receipt.status === 'continuation-context-prepared' && receipt.unchangedSource && receipt.unchangedChecker && receipt.unchangedInputs;
  console.log(JSON.stringify({status: receipt.status, completed: receipt.completed, accepted: receipt.accepted, readinessOnly: !!options?.['--prepare'], output: output ?? null, error: receipt.error ?? receipt.finalizationError ?? null, elapsedMs: Date.now() - started}));
  if (!receipt.accepted && !preparedOnly) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
