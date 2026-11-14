// H08-P2: source-bound June right-bank preparation, static baseline, selected
// two-end withdrawal, and exact five-receipt closure. No allocator or hookup.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {prepareContinuation, auditCompleteBank, continuationPairScene, resolveRecordedContinuationInput, H07_CONTINUATION} from './orbital-right-bank-continuation-checks.mjs';
import {auditStaticPair, staticLengthAccounting} from './orbital-right-bank-pair-checks.mjs';
import {sampleMatingReservoir, matingReservoirSweptObstacles} from './dist/electrical-service-loops.js';
import {createWithdrawalAffineProof, sampleWithdrawalAffineProof, certifyWithdrawalRectangle, validateWithdrawalRectangleCoverage} from './orbital-withdrawal-rectangle.mjs';
import {auditRoutes, createRoutingCollisionCache} from './dist/routing-audit.js';
import {routingSourceFingerprint, sameRoutingSourceFingerprint} from './scripts/routing-source-fingerprint.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; };
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const withdrawalDigest = value => createHash('sha256').update(Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const ids = rows => rows.map(row => row.id);
const point = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
const ZERO = [0, 0, 0];
export const H08_WITHDRAWAL = freeze({
  configurationId: 'orbital-1-202606', stateId: 'june-deployed-mated-proposed-layout',
  domainM: {from: [0, .045], to: [0, .045]},
  pairs: [[1, 0], [3, 2], [5, 4], [7, 6], [9, 8]].map(pair => pair.map(i => 'P-SA-2/' + i)),
  modelSchema: 'orbital-data-center/H08-right-bank-model-bundle/1',
  receiptSchema: 'orbital-data-center/H08-right-bank-withdrawal-receipt/1',
  indexSchema: 'orbital-data-center/H08-receipt-index/1',
  h07BankReceipt: 'docs/harnessing-work/H08-all-targets/source-refresh-p7/bank-static-acceptance.json',
  h07BankReceiptSha256: '5d99a3bfe10419b396b15022f1d0db5e690972c571be8719ea536fd26319dd86',
  h07Ledger: 'docs/harnessing-work/H08-all-targets/source-refresh-p7/ledger-through-pair-4.json',
  h07LedgerSha256: '71077348aff0c7cd4218db41c188a2f968b2b543f20ffa5f2a5a1beb91981831',
  motionContext: 'docs/harnessing-work/H08-all-targets/source-refresh-p7/motion-context.json',
  motionContextSha256: '1dd80bb608dca87aa4132ad95ba9ecd574ccc39b8382bcde2c8ea256677b28a7',
  rectangleKernel: 'orbital-withdrawal-rectangle.mjs',
  rectangleKernelSha256: '387d2e28176ab649dfdf5e6ca34ad51d7bcfb7e555ae60859ee82fca47cd3423',
  runtimeFingerprint: H07_CONTINUATION.source,
  runtimeCapMs: 1260000
});

export class WithdrawalInputError extends Error {
  constructor(code, message, details = {}) { super(message); this.name = 'WithdrawalInputError'; this.code = code; this.details = details; }
}
const requireValue = (test, code, message, details) => { if (!test) throw new WithdrawalInputError(code, message, details); };
function exactKeys(value, keys, label) {
  requireValue(value && typeof value === 'object' && !Array.isArray(value) && equal(Object.keys(value).sort(), [...keys].sort()), 'input-schema', label + ' requires exactly ' + keys.join(', '));
}
const requireEqual = (actual, expected, code, message) => requireValue(equal(actual, expected), code, message);
const digestFile = file => withdrawalDigest(fs.readFileSync(file));
function lexists(file) { try { fs.lstatSync(file); return true; } catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false; throw error; } }
function repositoryPath(filename, root = ROOT) {
  requireValue(typeof filename === 'string' && filename.length > 0, 'input-path', 'An input path is required.');
  const resolved = path.resolve(root, filename), relative = path.relative(root, resolved);
  requireValue(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative), 'input-path', 'Inputs must be repository-owned paths.');
  requireValue(fs.statSync(resolved).isFile() && fs.realpathSync(resolved) === resolved, 'input-path', 'Inputs must be regular files without symlink aliases.');
  return {path: resolved, repositoryPath: relative.split(path.sep).join('/')};
}
function canonicalFuturePath(filename) {
  let ancestor = path.resolve(filename); const tail = [];
  while (!lexists(ancestor)) { const parent = path.dirname(ancestor); requireValue(parent !== ancestor, 'output-path', 'Output has no resolvable ancestor.'); tail.unshift(path.basename(ancestor)); ancestor = parent; }
  return path.join(fs.realpathSync(ancestor), ...tail);
}

export function parseWithdrawalArgs(args) {
  const allowed = ['--operation', '--models', '--output', '--pair', '--static-receipt', '--receipt-index', '--from-m', '--to-m'], values = {};
  requireValue(Array.isArray(args) && args.length % 2 === 0, 'arguments', 'Use unique name/value argument pairs.');
  for (let i = 0; i < args.length; i += 2) {
    requireValue(allowed.includes(args[i]) && !Object.hasOwn(values, args[i]) && typeof args[i + 1] === 'string' && args[i + 1] && !args[i + 1].startsWith('--'), 'arguments', 'Unknown, repeated, or missing option value.');
    values[args[i]] = args[i + 1];
  }
  const operation = values['--operation'];
  requireValue(['prepare', 'pose', 'static', 'motion', 'close'].includes(operation) && values['--models'] && values['--output'], 'arguments', 'Require --operation prepare|pose|static|motion|close, --models and --output.');
  const selected = ['prepare', 'pose', 'motion'].includes(operation);
  requireValue(selected ? /^[0-4]$/.test(values['--pair'] || '') : values['--pair'] === undefined, 'pair-selector', selected ? 'Select exactly one actual pair with --pair 0..4.' : 'Static and closure operations cover the exact complete bank and do not accept --pair.');
  const needsStatic = operation === 'motion' || operation === 'close';
  requireValue(needsStatic ? !!values['--static-receipt'] : values['--static-receipt'] === undefined, 'arguments', 'Only motion and close require --static-receipt.');
  requireValue(operation === 'close' ? !!values['--receipt-index'] : values['--receipt-index'] === undefined, 'arguments', 'Only close requires --receipt-index.');
  for (const name of ['--from-m', '--to-m']) requireValue(operation === 'pose' ? typeof values[name] === 'string' && /^(?:0(?:\.\d+)?|\.\d+)$/.test(values[name]) && Number.isFinite(Number(values[name])) && Number(values[name]) >= 0 && Number(values[name]) <= .045 : values[name] === undefined, 'pose-coordinate', 'Only pose requires both finite --from-m and --to-m coordinates in [0, 0.045] metres.');
  return {operation, models: values['--models'], output: values['--output'], ...(selected ? {pairIndex: Number(values['--pair'])} : {}), ...(needsStatic ? {staticReceipt: values['--static-receipt']} : {}), ...(operation === 'close' ? {receiptIndex: values['--receipt-index']} : {}), ...(operation === 'pose' ? {fromWithdrawalM: Number(values['--from-m']), toWithdrawalM: Number(values['--to-m'])} : {})};
}

/** This shape is also the dispatch package's portable ten-model interface. */
export function validateWithdrawalModelBundle(bundle, interfaces = null) {
  exactKeys(bundle, ['schema', 'configurationId', 'stateId', 'domainM', 'h07BankReceiptSha256', 'motionContextSha256', 'models'], 'Model bundle');
  requireValue(bundle.schema === H08_WITHDRAWAL.modelSchema && bundle.configurationId === H08_WITHDRAWAL.configurationId && bundle.stateId === H08_WITHDRAWAL.stateId, 'model-scope', 'The model bundle must name the exact June deployed/mated state.');
  requireEqual(bundle.domainM, H08_WITHDRAWAL.domainM, 'model-domain', 'Both complete independent 45 mm strokes are required.');
  requireValue(bundle.h07BankReceiptSha256 === H08_WITHDRAWAL.h07BankReceiptSha256 && bundle.motionContextSha256 === H08_WITHDRAWAL.motionContextSha256, 'model-provenance', 'The model bundle must bind the preserved H07 bank and motion context.');
  requireValue(Array.isArray(bundle.models), 'model-inventory', 'The complete ten-model array is required.');
  requireEqual(bundle.models.map(row => row?.id), H08_WITHDRAWAL.pairs.flat(), 'model-inventory', 'Supply all and only the ten actual conductors in source order.');
  const byId = interfaces && new Map(interfaces.map(row => [row.id, row]));
  for (const model of bundle.models) {
    exactKeys(model, ['id', 'allocation'], 'Model row');
    const a = model.allocation;
    exactKeys(a, ['controls', 'first', 'last', 'axis', 'bendRadiusM', 'fromNormal', 'toNormal', 'fromTravelM', 'toTravelM', 'fromPrefixLast', 'toSuffixFirst', ...(a?.controlAlignment !== undefined ? ['controlAlignment'] : [])], 'Reservoir allocation');
    if (a.controlAlignment !== undefined) {
      exactKeys(a.controlAlignment, ['maximumAdjustmentM', 'limitM', 'basis'], 'Historical alignment annotation');
      requireValue(Number.isFinite(a.controlAlignment.maximumAdjustmentM) && a.controlAlignment.maximumAdjustmentM >= 0 && Number.isFinite(a.controlAlignment.limitM) && a.controlAlignment.limitM >= a.controlAlignment.maximumAdjustmentM && typeof a.controlAlignment.basis === 'string', 'model-annotation', 'Retained alignment metadata must be finite and descriptive; it cannot grant construction readiness.');
    }
    requireValue(Array.isArray(a.controls) && a.controls.length >= 3 && a.controls.length <= 256 && a.controls.every(point) && point(a.axis) && Math.abs(Math.hypot(...a.axis) - 1) <= 1e-12, 'model-construction', 'Finite bounded controls and a unit reservoir axis are required.', {id: model.id});
    requireValue(Number.isInteger(a.first) && Number.isInteger(a.last) && a.first > 0 && a.last >= a.first && a.last < a.controls.length - 1 && Number.isInteger(a.fromPrefixLast) && a.fromPrefixLast >= 0 && a.fromPrefixLast < a.controls.length && Number.isInteger(a.toSuffixFirst) && a.toSuffixFirst >= 0 && a.toSuffixFirst < a.controls.length, 'model-construction', 'Reservoir and moving-prefix indices must lie inside their controls.', {id: model.id});
    requireValue(point(a.fromNormal) && point(a.toNormal) && a.fromTravelM === .045 && a.toTravelM === .045 && a.bendRadiusM === .135, 'model-construction', 'Keep the exact source stroke and bend allocations.', {id: model.id});
    if (byId) {
      const line = byId.get(model.id);
      requireValue(line && line.radiusM === .00675 && line.bendRadiusM === a.bendRadiusM && line.fromTravelM === a.fromTravelM && line.toTravelM === a.toTravelM && line.terminationAllowanceM === .3, 'model-interface', 'The authoritative source interface allocation differs.', {id: model.id});
      requireEqual(a.controls[0], line.from, 'model-interface', 'The exact source endpoint must be retained: ' + model.id);
      requireEqual(a.controls.at(-1), line.to, 'model-interface', 'The exact destination endpoint must be retained: ' + model.id);
      requireEqual(a.fromNormal, line.fromNormal, 'model-interface', 'The source normal must be retained: ' + model.id);
      requireEqual(a.toNormal, line.toNormal, 'model-interface', 'The destination normal must be retained: ' + model.id);
    }
  }
  return bundle;
}

export function validateWithdrawalReceiptIndex(index) {
  exactKeys(index, ['schema', 'receipts'], 'Receipt index');
  requireValue(index.schema === H08_WITHDRAWAL.indexSchema && Array.isArray(index.receipts) && index.receipts.length === 5, 'receipt-set', 'Closure requires exactly five motion receipts.');
  requireEqual(index.receipts.map(row => row?.pairIndex).sort((a, b) => a - b), [0, 1, 2, 3, 4], 'receipt-set', 'Missing, duplicate and outside pair IDs cannot close H08.');
  const filenames = new Set();
  for (const row of index.receipts) {
    exactKeys(row, ['pairIndex', 'receipt', 'sha256'], 'Receipt-index row');
    requireValue(typeof row.receipt === 'string' && row.receipt && !path.isAbsolute(row.receipt) && !row.receipt.split(/[\\/]/).includes('..') && /^[0-9a-f]{64}$/.test(row.sha256) && !filenames.has(row.receipt), 'receipt-index-input', 'Each pair needs a distinct repository-relative receipt and its exact SHA-256.');
    filenames.add(row.receipt);
  }
  return index.receipts;
}

export function validatePinnedMotionSourceFiles(context, readBytes = file => fs.readFileSync(path.resolve(ROOT, file))) {
  const rows = context?.inputs?.inspectedSourceFiles;
  requireValue(Array.isArray(rows) && rows.length === 9 && new Set(rows.map(row => row.repositoryPath)).size === 9 && rows.some(row => row.repositoryPath === 'dist/flight-connector-routing-motion.js'), 'motion-source-manifest', 'The context needs its exact nine inspected motion source files.');
  for (const row of rows) {
    const bytes = readBytes(row.repositoryPath);
    requireValue(bytes.length === row.bytes && withdrawalDigest(bytes) === row.sha256, 'motion-source-changed', 'A source used to select the frozen motion context changed.', {repositoryPath: row.repositoryPath});
  }
  return rows;
}

export function validateH07BankInputManifest(bank, {transitionRequired = Boolean(H07_CONTINUATION.sourceTransition)} = {}) {
  const expected = ['scene', 'anchor-candidate', 'anchor-receipt', 'ledger',
    ...[0, 2, 3, 4].flatMap(pair => ['accepted-pair-' + pair + '-candidate', 'accepted-pair-' + pair + '-receipt', 'prior-pair-' + pair + '-input:ledger']),
    ...(transitionRequired ? ['source-transition'] : [])].sort();
  requireValue(Array.isArray(bank?.inputs) && bank.inputs.length === expected.length &&
    new Set(bank.inputs.map(row => row.repositoryPath)).size === expected.length &&
    equal(bank.inputs.map(row => row.role).sort(), expected), 'H07-input-manifest', 'The H07 bank must retain every unique scene, transition, anchor, ledger and accepted-prefix input.');
  return bank.inputs;
}

function captureFactory(root) {
  const records = new Map();
  const capture = (filename, role, expectedHash = null) => {
    const location = repositoryPath(filename, root), bytes = fs.readFileSync(location.path), hash = withdrawalDigest(bytes);
    requireValue(expectedHash === null || hash === expectedHash, 'input-hash', 'Pinned input bytes differ.', {role, repositoryPath: location.repositoryPath});
    const previous = records.get(location.repositoryPath);
    requireValue(!previous || previous.sha256 === hash, 'input-changed', 'An input changed during preparation.', {repositoryPath: location.repositoryPath});
    if (!previous) records.set(location.repositoryPath, freeze({role, ...location, sha256: hash, bytes: bytes.length}));
    return {record: records.get(location.repositoryPath), value: JSON.parse(bytes.toString('utf8')), bytes};
  };
  capture.records = () => [...records.values()];
  capture.raw = (filename, role, expectedHash, expectedBytes) => {
    const location = repositoryPath(filename, root), bytes = fs.readFileSync(location.path), hash = withdrawalDigest(bytes);
    requireValue(hash === expectedHash && bytes.length === expectedBytes, 'input-hash', 'Pinned input bytes differ.', {role, repositoryPath: location.repositoryPath});
    const previous = records.get(location.repositoryPath);
    requireValue(!previous || previous.sha256 === hash, 'input-changed', 'An input changed while being captured.');
    if (!previous) records.set(location.repositoryPath, freeze({role, ...location, sha256: hash, bytes: bytes.length}));
    return records.get(location.repositoryPath);
  };
  return capture;
}

/** Discover every transitive read before output ownership is granted. */
export function preflightWithdrawalInputs(options, {root = ROOT} = {}) {
  const capture = captureFactory(root), bank = capture(H08_WITHDRAWAL.h07BankReceipt, 'H07-bank', H08_WITHDRAWAL.h07BankReceiptSha256), context = capture(H08_WITHDRAWAL.motionContext, 'motion-context', H08_WITHDRAWAL.motionContextSha256);
  const ledger = capture(H08_WITHDRAWAL.h07Ledger, 'H07-ledger', H08_WITHDRAWAL.h07LedgerSha256);
  requireValue(bank.value.status === 'complete-bank-static-accepted' && bank.value.completed && bank.value.accepted && bank.value.checks?.completedPairs === 5 && bank.value.checks?.expectedPairs === 5 && bank.value.unchangedSource && bank.value.unchangedChecker && bank.value.unchangedInputs, 'H07-not-accepted', 'The complete accepted H07 bank is required.');
  for (const row of validateH07BankInputManifest(bank.value)) capture.raw(path.relative(root, resolveRecordedContinuationInput(row, {root})), 'H07-input:' + row.role, row.sha256, row.bytes);
  const contextInputs = context.value.inputs;
  const currentRecord = row => ({repositoryPath: row.repositoryPath, sha256: row.sha256, bytes: row.bytes});
  requireEqual(contextInputs?.H07CompleteReceipt, currentRecord(bank.record), 'motion-context-provenance', 'The motion context must bind the exact current H07 bank receipt.');
  requireEqual(contextInputs?.H07CompleteLedger, currentRecord(ledger.record), 'motion-context-provenance', 'The motion context must bind the exact current H07 ledger.');
  requireEqual(contextInputs?.H07VerifiedTransitiveInputs, bank.value.inputs.map(({role, repositoryPath, sha256, bytes}) => ({role, repositoryPath, sha256, bytes})), 'motion-context-provenance', 'The motion context must preserve the complete current H07 transitive input manifest.');
  requireValue(context.value.sourceFingerprint === H08_WITHDRAWAL.runtimeFingerprint && context.value.H07CheckerFingerprint === bank.value.checkerStart?.value,
    'motion-context-provenance', 'The motion context must name the current H07 runtime and checker identities.');
  if (H07_CONTINUATION.sourceTransition) {
    const transition = bank.value.inputs.find(row => row.role === 'source-transition');
    requireEqual(context.value.sourceRevalidation?.sourceTransition, currentRecord(transition), 'motion-context-provenance', 'The refreshed context must retain the exact source-transition declaration.');
    requireEqual(context.value.sourceRevalidation?.currentSource, bank.value.sourceStart, 'motion-context-provenance', 'The refreshed context must retain the complete current runtime manifest.');
    requireValue(context.value.sourceRevalidation?.acceptanceTransferred === false, 'motion-context-provenance', 'Historical context selection cannot transfer engineering acceptance.');
    const origin = context.value.sourceRevalidation.previousContext;
    requireValue(origin && typeof origin.repositoryPath === 'string', 'motion-context-provenance', 'The refreshed context needs its immutable original selection record.');
    capture.raw(origin.repositoryPath, 'context-origin', origin.sha256, origin.bytes);
  }
  const summary = contextInputs?.H07CompleteSummary;
  requireValue(summary && typeof summary.repositoryPath === 'string', 'motion-context-provenance', 'The motion context must retain its current H07 summary record.');
  capture.raw(summary.repositoryPath, 'H07-summary', summary.sha256, summary.bytes);
  validatePinnedMotionSourceFiles(context.value, file => fs.readFileSync(repositoryPath(file, root).path));
  for (const row of context.value.inputs.inspectedSourceFiles) capture.raw(row.repositoryPath, 'context-source', row.sha256, row.bytes);
  requireValue(digestFile(path.join(root, H08_WITHDRAWAL.rectangleKernel)) === H08_WITHDRAWAL.rectangleKernelSha256, 'rectangle-kernel-changed', 'The reviewed rectangle kernel changed and needs its own refreshed acceptance.');
  const model = capture(options.models, 'models'); validateWithdrawalModelBundle(model.value, context.value.participants);
  const commonInputs = capture.records();
  const staticReceipt = options.staticReceipt ? capture(options.staticReceipt, 'static-receipt') : null;
  const index = options.receiptIndex ? capture(options.receiptIndex, 'receipt-index') : null;
  const members = index ? validateWithdrawalReceiptIndex(index.value).map(row => ({pairIndex: row.pairIndex, ...capture(row.receipt, 'pair-' + row.pairIndex + '-motion', row.sha256)})) : [];
  // Receipts bind all their inputs. Missing or stale nested input identities are
  // rejected even when a caller changes an outer accepted boolean or index hash.
  for (const receipt of [staticReceipt, ...members].filter(Boolean)) {
    requireValue(Array.isArray(receipt.value.inputs), 'receipt-inputs', 'A reused receipt needs its full input manifest.');
    for (const row of receipt.value.inputs) capture.raw(row.repositoryPath, 'reused-input:' + row.role, row.sha256, row.bytes);
  }
  return {capture, commonInputs, bank, context, ledger, model, staticReceipt, index, members};
}

export function safeWithdrawalOutput(filename, inputPaths) {
  const output = path.resolve(filename);
  requireValue(/\.json$/i.test(output), 'output-path', 'The output must be a new JSON receipt.');
  const canonicalInputs = new Set(inputPaths.map(p => fs.realpathSync(p)));
  requireValue(!canonicalInputs.has(canonicalFuturePath(output)) && !canonicalInputs.has(canonicalFuturePath(output + '.tmp')), 'output-input-alias', 'Output or temporary output aliases a required input.');
  requireValue(!lexists(output), 'output-exists', 'Use a new receipt path; existing files and symlinks cannot be overwritten.');
  requireValue(!lexists(output + '.tmp'), 'output-temp-exists', 'Use a new atomic temporary path.');
  return output;
}

export function createWithdrawalReceiptWriter(output, inputPaths) {
  const destination = safeWithdrawalOutput(output, inputPaths); let ownedHash = null;
  return value => {
    if (ownedHash !== null) requireValue(lexists(destination) && fs.lstatSync(destination).isFile() && !fs.lstatSync(destination).isSymbolicLink() && digestFile(destination) === ownedHash, 'output-changed', 'The owned checkpoint was changed externally.');
    else requireValue(!lexists(destination), 'output-exists', 'Output appeared after preflight.');
    requireValue(!lexists(destination + '.tmp'), 'output-temp-exists', 'The temporary output must remain new.');
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    requireValue(!inputPaths.some(p => fs.realpathSync(p) === canonicalFuturePath(destination) || fs.realpathSync(p) === canonicalFuturePath(destination + '.tmp')), 'output-input-alias', 'Output parent resolution aliases an input.');
    const bytes = JSON.stringify(value, null, 2) + '\n';
    fs.writeFileSync(destination + '.tmp', bytes, {flag: 'wx'}); fs.renameSync(destination + '.tmp', destination); ownedHash = withdrawalDigest(bytes);
  };
}

const runtimeFingerprint = () => routingSourceFingerprint({entries: ['orbital-right-bank-diagnostic.mjs']});
export const withdrawalCheckerFingerprint = () => routingSourceFingerprint({entries: ['orbital-right-bank-withdrawal-checks.mjs', 'orbital-right-bank-withdrawal-contract-checks.mjs', 'dist/flight-connector-routing-motion.js']});
function assertBudget(started) { requireValue(Date.now() - started <= H08_WITHDRAWAL.runtimeCapMs, 'runtime-cap-exceeded', 'The bounded H08 process is incomplete after its runtime cap.'); }
const rowIdentity = row => ({id: row.id, points: row.points, radiusM: row.radiusM, clearanceM: row.clearanceM ?? 0, ...(row.sectionIds ? {sectionIds: row.sectionIds} : {})});

/** Exact mover identity joins, independent of optional diagnostic labels. */
export function bindWithdrawalParticipants({context, physical, services, terminals, interfaces, mandatoryRoutes, rightRoutes}) {
  requireValue(context.configurationId === H08_WITHDRAWAL.configurationId && context.stateId === H08_WITHDRAWAL.stateId && context.motionContextContractComplete === true, 'motion-context', 'The completed exact June motion context is required.');
  requireEqual({from: context.domain.from, to: context.domain.to}, H08_WITHDRAWAL.domainM, 'motion-context', 'The actual motion domain changed.');
  const rightIds = H08_WITHDRAWAL.pairs.flat();
  requireEqual(ids(rightRoutes), rightIds, 'participant-inventory', 'All ten right models must be retained in source order.');
  requireEqual(ids(context.participants), rightIds, 'participant-inventory', 'The context omits or changes a moving route.');
  requireValue(physical.length === 2444 && services.length === 2526 && terminals.length === 523 && mandatoryRoutes.length === 177 && interfaces.length === 104, 'participant-inventory', 'The complete frozen category inventory is required.');
  const sourceInterfaces = new Map(interfaces.map(row => [row.id, row]));
  for (const entry of context.participants) {
    const actual = sourceInterfaces.get(entry.id);
    for (const key of ['id', 'harnessId', 'index', 'instance', 'polarity', 'fromPortId', 'toPortId', 'fromBoxId', 'toBoxId', 'from', 'to', 'fromNormal', 'toNormal', 'radiusM', 'bendRadiusM', 'terminationAllowanceM', 'fromTravelM', 'toTravelM', 'fromPlugOffsetM', 'toPlugOffsetM']) requireEqual(actual?.[key], entry[key], 'motion-interface', 'Motion context differs from source interface ' + entry.id + ':' + key);
  }
  requireValue(context.banks?.length === 2 && context.movingPhysicalObstacles?.length === 60 && context.fixedConnectorObstacles?.length === 40, 'moving-solids', 'Both complete plug banks and fixed receptacles are required.');
  const physicalById = new Map(physical.map(row => [row.id, row])), moving = new Map();
  for (const row of [...context.movingPhysicalObstacles, ...context.fixedConnectorObstacles]) {
    const actual = physicalById.get(row.obstacleId);
    requireValue(actual && actual.sourceMesh === row.sourceMesh && actual.type === row.geometryType && withdrawalDigest(actual) === row.frozenGeometryDigest, 'moving-solid-source', 'A selected solid differs from the actual frozen physical geometry.', {obstacleId: row.obstacleId});
    requireEqual((actual.apertures || []).map(a => a.id), row.apertureIds, 'moving-apertures', 'Selected solid apertures or their order changed.');
  }
  for (const [end, bankId] of [['from', 'connector-bank:P-SA-2:from'], ['to', 'connector-bank:P-SA-2:to']]) {
    const bank = context.banks.find(row => row.id === bankId), selected = context.movingPhysicalObstacles.filter(row => row.bankId === bankId), fixed = context.fixedConnectorObstacles.filter(row => row.bankId === bankId);
    requireValue(bank && bank.travelM === .045 && selected.length === 30 && fixed.length === 20, 'moving-solids', 'Each physical bank requires 30 moving and 20 fixed meshes.');
    requireEqual(bank.participantRouteIds, rightIds, 'participant-inventory', 'A physical bank must move all ten routes.');
    requireEqual([...bank.movingPhysicalObstacleIds].sort(), selected.map(row => row.obstacleId).sort(), 'moving-solids', 'Bank and selected moving IDs disagree.');
    requireEqual([...bank.fixedConnectorObstacleIds].sort(), fixed.map(row => row.obstacleId).sort(), 'moving-solids', 'Bank and fixed connector IDs disagree.');
    for (const row of selected) {
      const line = sourceInterfaces.get(row.routeId), from = end === 'from' ? line?.fromNormal : ZERO, to = end === 'to' ? line?.toNormal : ZERO;
      requireValue(line && rightIds.includes(row.routeId) && !moving.has(row.obstacleId), 'moving-solids', 'Moving solid ownership is absent or duplicated.');
      requireEqual(row.translationCoefficientsPerMeter, {from, to}, 'moving-solid-coefficient', 'Moving solids must use the exact per-metre physical bank normal.');
      moving.set(row.obstacleId, {id: row.obstacleId, kind: 'rigid-translation', fromCoefficient: from, toCoefficient: to});
    }
  }
  requireValue(moving.size === 60 && context.terminalRegistry.count === 523 && context.terminalRegistry.fixedCount === 523 && context.terminalRegistry.movingCount === 0, 'participant-inventory', 'All terminal reservations stay fixed.');
  requireEqual(ids(terminals), context.terminalRegistry.records.map(row => row.id), 'terminal-inventory', 'The fixed terminal registry differs.');
  requireEqual(ids(terminals), context.terminalRegistry.sourceIntegrityManifest.ids, 'terminal-inventory', 'The original complete terminal identity differs.');
  requireValue(withdrawalDigest(terminals) === context.terminalRegistry.sourceIntegrityManifest.geometryDigest, 'terminal-geometry', 'Fixed terminal geometry changed.');
  const routes = [...mandatoryRoutes.map(row => ({...row, clearanceM: row.clearanceM ?? 0})), ...rightRoutes], obstacles = [...physical, ...services, ...terminals];
  requireValue(new Set(ids(routes)).size === 187 && new Set(ids(obstacles)).size === 5493, 'participant-inventory', 'Duplicate or missing routes/solids cannot become a complete scene.');
  const participantManifest = {routeIds: ids(routes), obstacleIds: ids(obstacles), physicalObstacleIds: ids(physical), serviceObstacleIds: ids(services), terminalObstacleIds: ids(terminals), movingRouteIds: rightIds, movingObstacleIds: [...moving.keys()]};
  return {routes, obstacles, participantManifest, obstacleMotions: obstacles.map(row => moving.get(row.id) || {id: row.id, kind: 'stationary'})};
}

/** Construction readiness is deliberately separate from collision acceptance. */
export function constructWithdrawalModels(bundle, interfaces, historicalRoutes = []) {
  validateWithdrawalModelBundle(bundle, interfaces);
  const byId = new Map(interfaces.map(row => [row.id, row])), history = new Map(historicalRoutes.map(row => [row.id, row])), routes = [], checks = [];
  for (const model of bundle.models) {
    const line = byId.get(model.id), shape = sampleMatingReservoir(model.allocation, {fromWithdrawalM: 0, toWithdrawalM: 0});
    const route = {id: model.id, points: shape.points, radiusM: line.radiusM, clearanceM: .002, from: {position: line.from, normal: line.fromNormal}, to: {position: line.to, normal: line.toNormal}, minBendRadiusM: line.bendRadiusM, minimumBendRadiusM: shape.minimumBendRadiusM, bendRadiusBasis: 'constructed-circular-fillets', renderedCenterlineMismatchM: 0, restLengthM: shape.lengthM};
    const sweep = matingReservoirSweptObstacles(model.allocation, {id: model.id, radiusM: line.radiusM, clearanceM: .002});
    const result = {id: model.id, ok: false, allocationSha256: withdrawalDigest(model.allocation), affineSweep: sweep, staticLength: staticLengthAccounting(shape, line.terminationAllowanceM), baselineGeometrySha256: withdrawalDigest(rowIdentity(route)), baselinePointsChangedFromH07: !equal(shape.points, history.get(model.id)?.points), issues: []};
    if (shape.bendLimited) result.issues.push({code: 'bend-limited-construction'});
    if (!sweep.ok) result.issues.push(...sweep.issues);
    if (sweep.ok && !shape.bendLimited) {
      try {
        const proof = createWithdrawalAffineProof({domain: H08_WITHDRAWAL.domainM, baseline: {routes: [route], obstacles: []}, participantManifest: {routeIds: [route.id], obstacleIds: [], physicalObstacleIds: [], serviceObstacleIds: [], terminalObstacleIds: [], movingRouteIds: [route.id], movingObstacleIds: []}, ownedRouteIds: [route.id], routeMotions: [{id: route.id, kind: 'mating-reservoir', allocation: model.allocation, parameterMap: {from: 'from', to: 'to'}}], obstacleMotions: []});
        result.constructionProof = proof.routeConstructions[0]; result.ok = true;
      } catch (error) { result.issues.push({code: error.code || 'construction-proof-error', message: error.message, ...error.details}); }
    }
    routes.push(route); checks.push(result);
  }
  return {routes, checks, ready: checks.every(row => row.ok), readyCount: checks.filter(row => row.ok).length, rejectedRouteIds: checks.filter(row => !row.ok).map(row => row.id)};
}

function contextIdentity(preflight, scene, models, bound) {
  return freeze({configurationId: H08_WITHDRAWAL.configurationId, stateId: H08_WITHDRAWAL.stateId, domainM: H08_WITHDRAWAL.domainM, h07BankReceiptSha256: preflight.bank.record.sha256, h07LedgerSha256: preflight.ledger.record.sha256, motionContextSha256: preflight.context.record.sha256, modelBundleSha256: preflight.model.record.sha256, frozenSceneSha256: scene.baseScene.identity.sha256, staticBaselineSha256: withdrawalDigest(bound.routes.map(rowIdentity)), participantManifestSha256: withdrawalDigest(bound.participantManifest), movingModelSha256: withdrawalDigest(preflight.model.value.models), fixedContextSha256: withdrawalDigest({physical: scene.baseScene.descriptor.geometry.physicalAndOperational, services: scene.baseScene.descriptor.geometry.proposalServiceEnvelopes, terminals: scene.baseScene.descriptor.geometry.finalTerminalRegistry, mandatoryRoutes: scene.mandatoryRoutes.map(rowIdentity)}), baselineModelRows: models.checks.map(row => ({id: row.id, allocationSha256: row.allocationSha256, baselineGeometrySha256: row.baselineGeometrySha256}))});
}

function prepareActualScene(preflight, started, onPhase) {
  const scene = prepareContinuation({ledgerFile: preflight.ledger.record.path, started, onPhase});
  requireValue(sameRoutingSourceFingerprint(preflight.bank.value.sourceStart, scene.sourceStart) && sameRoutingSourceFingerprint(preflight.bank.value.sourceFinish, scene.sourceStart) &&
    sameRoutingSourceFingerprint(preflight.bank.value.checkerStart, scene.checkerStart) && sameRoutingSourceFingerprint(preflight.bank.value.checkerFinish, scene.checkerStart),
    'H07-source-reconstruction', 'The H07 bank receipt must be accepted under the actual current source and continuation checker.');
  const bankChecks = auditCompleteBank(scene); assertBudget(started);
  requireValue(bankChecks.ok, 'H07-recheck-failed', 'The complete unchanged H07 bank must remain accepted.');
  requireEqual(bankChecks, preflight.bank.value.checks, 'H07-reconstruction', 'The saved bank differs from its complete current-source reconstruction.');
  const historical = bankChecks.pairs.flatMap(row => row.checks.constructedRoutes), models = constructWithdrawalModels(preflight.model.value, scene.interfaces, historical); assertBudget(started);
  const bound = bindWithdrawalParticipants({context: preflight.context.value, physical: scene.baseScene.physical, services: scene.baseScene.services, terminals: scene.baseScene.terminals, interfaces: scene.interfaces, mandatoryRoutes: scene.mandatoryRoutes, rightRoutes: models.routes});
  const identity = contextIdentity(preflight, scene, models, bound);
  const routeMotions = [...scene.mandatoryRoutes.map(row => ({id: row.id, kind: 'stationary'})), ...preflight.model.value.models.map(row => ({id: row.id, kind: 'mating-reservoir', allocation: row.allocation, parameterMap: {from: 'from', to: 'to'}}))];
  return {scene, models, bound, identity, routeMotions, H07Rechecked: true};
}

/** Rebuild every NEW model baseline; never reuse immutable H07 geometry as it. */
export function auditWithdrawalStaticBaselines(prepared, bundle, onPair = null) {
  requireValue(prepared.models.ready, 'construction-not-ready', 'Every moving neighbor needs a valid complete-stroke construction before static dispatch.');
  const all = prepared.bound.routes, byModel = new Map(bundle.models.map(row => [row.id, row])), pairs = [];
  for (let pairIndex = 0; pairIndex < 5; pairIndex++) {
    onPair?.(pairIndex);
    const original = continuationPairScene(prepared.scene, pairIndex, {completeBank: true}), pairIds = H08_WITHDRAWAL.pairs[pairIndex];
    const scene = {...original, identity: {...original.identity, geometryDigest: withdrawalDigest({bank: prepared.identity, pairIndex})}, neighbors: all.filter(row => !pairIds.includes(row.id))};
    requireValue(scene.neighbors.length === 185, 'static-neighbor-inventory', 'Every new baseline pair retains the other185 actual model/context routes.');
    const candidate = {schema: 'orbital-data-center/H07-static-pair-candidate/1', scene: scene.identity, routes: pairIds.map(id => ({id, controls: byModel.get(id).allocation.controls}))};
    const checks = auditStaticPair(scene, candidate);
    for (const row of checks.constructedRoutes) requireEqual(rowIdentity(row), rowIdentity(all.find(route => route.id === row.id)), 'static-model-mismatch', 'The static checker must audit the exact new model baseline.');
    pairs.push({pairIndex, pairIds, checks});
  }
  return {ok: pairs.every(row => row.checks.ok), expectedPairs: 5, completedPairs: 5, totalRoutes: all.length, immutableNeighborsPerPair: 185, pairs};
}

/** One posed witness replay only. A clear sample never accepts H08 motion. */
export function auditWithdrawalPose(prepared, {pairIndex, fromWithdrawalM, toWithdrawalM}) {
  requireValue(Number.isInteger(pairIndex) && pairIndex >= 0 && pairIndex < 5 && [fromWithdrawalM, toWithdrawalM].every(v => Number.isFinite(v) && v >= 0 && v <= .045), 'pose-coordinate', 'A pose requires one actual pair and both coordinates inside the complete strokes.');
  requireValue(prepared.models.ready, 'construction-not-ready', 'Every moving neighbor needs a valid complete-stroke construction before a pose replay.');
  const ownedRouteIds = H08_WITHDRAWAL.pairs[pairIndex], proof = createWithdrawalAffineProof({domain: H08_WITHDRAWAL.domainM, baseline: {routes: prepared.bound.routes, obstacles: prepared.bound.obstacles}, participantManifest: prepared.bound.participantManifest, ownedRouteIds, routeMotions: prepared.routeMotions, obstacleMotions: prepared.bound.obstacleMotions});
  const snapshot = sampleWithdrawalAffineProof(proof, {fromWithdrawalM, toWithdrawalM}), terminalIds = new Set(proof.participantManifest.terminalObstacleIds), routeProofs = new Map(proof.routeConstructions.map(row => [row.id, row])), solidProofs = new Map(proof.solidConstructions.map(row => [row.id, row])), collisionCache = createRoutingCollisionCache(), checks = [];
  for (const id of ownedRouteIds) {
    const owned = snapshot.routes.find(row => row.id === id), neighborProofs = new Map(), capsules = [];
    for (const neighbor of snapshot.routes) if (neighbor.id !== id) {
      const enclosure = routeProofs.get(neighbor.id).numericalEnclosureM;
      for (let segment = 0; segment < neighbor.points.length - 1; segment++) {
        const capsuleId = 'H08-pose-neighbor:' + JSON.stringify([id, neighbor.id, segment]);
        requireValue(!solidProofs.has(capsuleId), 'neighbor-identity-alias', 'A pose neighbor capsule aliases an actual solid.');
        capsules.push({id: capsuleId, type: 'capsule', a: neighbor.points[segment], b: neighbor.points[segment + 1], radiusM: neighbor.radiusM + Math.max(0, neighbor.clearanceM - owned.clearanceM) + enclosure});
        neighborProofs.set(capsuleId, enclosure);
      }
    }
    const excluded = snapshot.obstacles.filter(row => terminalIds.has(row.id) && row.lineId === id), retained = snapshot.obstacles.filter(row => !(terminalIds.has(row.id) && row.lineId === id)), obstacles = [...retained, ...capsules], ownEnclosure = routeProofs.get(id).numericalEnclosureM;
    const audit = auditRoutes([owned], obstacles, {maxIssues: 16, selfCollision: true, interlineCollision: true, collisionToleranceM: 2e-6, collisionCache, expectedRouteIds: [id], expectedObstacleIds: obstacles.map(row => row.id), pairMotionBound: pair => 2 * (ownEnclosure + (pair.obstacle ? neighborProofs.get(pair.obstacle.id) ?? solidProofs.get(pair.obstacle.id).numericalEnclosureM : ownEnclosure))});
    checks.push({id, ok: audit.ok, retainedNeighborRoutes: snapshot.routes.length - 1, retainedActualObstacles: retained.length, derivedNeighborCapsules: capsules.length, excludedOwnTerminalIds: excluded.map(row => row.id), posedRouteGeometrySha256: withdrawalDigest(rowIdentity(owned)), audit});
  }
  return {ok: checks.every(row => row.ok), H08Accepted: false, continuousCoverageAssessed: false, fromWithdrawalM, toWithdrawalM, ownedRouteIds, participantManifest: proof.participantManifest, inventory: {routes: snapshot.routes.length, obstacles: snapshot.obstacles.length, movingRoutes: proof.participantManifest.movingRouteIds.length, movingObstacles: proof.participantManifest.movingObstacleIds.length, fixedTerminals: proof.participantManifest.terminalObstacleIds.length}, checks, scope: 'One internally constructed posed witness, with every co-moving model and solid and every fixed foreign terminal retained. A clear pose is not a static-bank prerequisite or a continuous withdrawal receipt.'};
}

export function requireStableWithdrawalReceipt(receipt, {operation, identity, source, checker, commonInputs, staticReceiptRecord}) {
  requireValue(receipt?.schema === H08_WITHDRAWAL.receiptSchema && receipt.operation === operation && receipt.completed === true && receipt.accepted === true && receipt.phase === 'finished' && receipt.unchangedSource === true && receipt.unchangedChecker === true && receipt.unchangedInputs === true, 'receipt-not-accepted', 'A reused receipt must be complete, accepted, source-stable and of the required operation.');
  requireValue(sameRoutingSourceFingerprint(receipt.sourceStart, source) && sameRoutingSourceFingerprint(receipt.sourceFinish, source) && sameRoutingSourceFingerprint(receipt.checkerStart, checker) && sameRoutingSourceFingerprint(receipt.checkerFinish, checker), 'receipt-source', 'A reused receipt names different source/checker bytes.');
  requireEqual(receipt.bankIdentity, identity, 'receipt-bank-identity', 'A receipt from another ten-model/context/baseline revision cannot be reused.');
  requireValue(Array.isArray(receipt.inputs) && receipt.inputs.length > 0 && !receipt.error, 'receipt-inputs', 'A reused receipt must retain complete inputs and no error.');
  requireValue(Array.isArray(commonInputs) && commonInputs.length > 0, 'receipt-inputs', 'Validation requires the current complete common input manifest.');
  const supplied = new Map();
  for (const row of receipt.inputs) {
    requireValue(typeof row.repositoryPath === 'string' && row.repositoryPath && /^[0-9a-f]{64}$/.test(row.sha256) && Number.isSafeInteger(row.bytes) && row.bytes >= 0 && !supplied.has(row.repositoryPath), 'receipt-inputs', 'The reused input manifest has an invalid or duplicate identity.');
    supplied.set(row.repositoryPath, row);
  }
  if (operation === 'motion') requireValue(staticReceiptRecord?.repositoryPath && /^[0-9a-f]{64}$/.test(staticReceiptRecord.sha256), 'receipt-inputs', 'A motion receipt needs the exact common static receipt input.');
  for (const row of [...commonInputs, ...(operation === 'motion' ? [staticReceiptRecord] : [])]) {
    const actual = supplied.get(row.repositoryPath);
    requireValue(actual && actual.sha256 === row.sha256 && actual.bytes === row.bytes, 'receipt-inputs', 'A required current common input is missing or changed.', {repositoryPath: row.repositoryPath});
  }
}

export function requireWithdrawalStaticReceipt(receipt, expected, actualChecks = null) {
  requireStableWithdrawalReceipt(receipt, {...expected, operation: 'static'});
  requireValue(receipt.status === 'withdrawal-static-accepted' && receipt.H08Accepted === false && receipt.staticAccepted === true && receipt.staticChecks?.ok === true && receipt.staticChecks.completedPairs === 5 && receipt.staticChecks.expectedPairs === 5 && receipt.staticChecks.totalRoutes === 187 && receipt.staticChecks.immutableNeighborsPerPair === 185, 'static-receipt', 'The baseline prerequisite must accept all five actual new static pairs.');
  requireEqual(receipt.staticChecks.pairs.map(row => row.pairIndex), [0, 1, 2, 3, 4], 'static-receipt', 'The static pair set is incomplete or duplicated.');
  for (const row of receipt.staticChecks.pairs) {
    requireEqual(row.pairIds, H08_WITHDRAWAL.pairs[row.pairIndex], 'static-receipt', 'Static pair ownership differs.');
    const c = row.checks;
    requireValue(c?.ok === true && Array.isArray(c.constructionIssues) && c.constructionIssues.length === 0 && c.pairAudit?.ok === true && c.pairAudit.issueCount === 0 && c.pairAudit.truncated === false && c.pairAudit.issues?.length === 0 && c.neighboringClearance?.length === 2 && c.neighboringClearance.every(n => n.ok === true) && c.lengths?.length === 2 && c.lengths.every(n => n.ok === true), 'static-receipt', 'A static predicate is missing or rejected.');
  }
  if (actualChecks) requireEqual(receipt.staticChecks, actualChecks, 'static-receipt-reconstruction', 'The accepted static receipt differs from a current re-audit of the exact model baselines.');
}

export function requireWithdrawalMotionReceipt(receipt, expected) {
  requireStableWithdrawalReceipt(receipt, {...expected, operation: 'motion'});
  const pairIndex = receipt.pairIndex;
  requireValue(receipt.status === 'withdrawal-pair-accepted' && Number.isInteger(pairIndex) && pairIndex >= 0 && pairIndex < 5 && receipt.H08Accepted === true && receipt.staticAccepted === true && receipt.staticReceiptSha256 === expected.staticReceiptSha256, 'motion-receipt', 'Motion acceptance needs the exact selected pair and common static prerequisite.');
  requireEqual(receipt.ownedRouteIds, H08_WITHDRAWAL.pairs[pairIndex], 'motion-receipt', 'The selected pair IDs differ.');
  requireEqual(receipt.domainM, H08_WITHDRAWAL.domainM, 'motion-receipt', 'Partial strokes cannot certify H08.');
  const c = receipt.certificate;
  requireValue(c?.schema === 'orbital-data-center/H08-withdrawal-rectangle/1' && c.status === 'withdrawal-rectangle-accepted' && c.completed === true && c.accepted === true && c.coverageComplete === true && c.externalSamplerCertified === false && Array.isArray(c.issues) && c.issues.length === 0 && c.unresolvedCells === 0 && c.rejectedCells === 0 && Array.isArray(c.cells) && c.cells.length > 0 && c.certifiedCells === c.cells.length, 'motion-receipt', 'Only complete internal-model rectangle acceptance can close a motion target.');
  requireEqual(c.domain, H08_WITHDRAWAL.domainM, 'motion-receipt', 'The certificate has another domain.');
  requireEqual(c.ownedRouteIds, receipt.ownedRouteIds, 'motion-receipt', 'The certificate owns another pair.');
  requireValue(withdrawalDigest(c.participantManifest) === expected.identity.participantManifestSha256, 'motion-receipt', 'The certificate participant manifest differs from the shared context.');
  const coverage = validateWithdrawalRectangleCoverage({domain: c.domain, cells: c.cells});
  requireValue(coverage.ok && coverage.completeCertifiedCoverage && equal(coverage, c.coverage), 'motion-receipt-coverage', 'The certificate must contain a complete exact certified leaf partition.');
  for (const cell of c.cells) requireValue(cell.status === 'certified' && Number.isFinite(cell.minimumCertificateMarginM) && cell.minimumCertificateMarginM > 1e-7 && cell.ownedResults?.length === 2 && cell.ownedResults.every(row => row.ok === true && row.issueCount === 0 && row.truncated === false && row.issues?.length === 0 && row.selfNeighborhood?.ok === true && row.retainedNeighborRoutes === 186) && equal(cell.ownedResults.map(row => row.id), receipt.ownedRouteIds), 'motion-receipt-cell', 'A leaf omits a certified owned-route predicate or actual neighbor context.');
  return {pairIndex, ownedRouteIds: receipt.ownedRouteIds, certifiedCells: c.cells.length, minimumCertifiedLeafMarginM: Math.min(...c.cells.map(cell => cell.minimumCertificateMarginM))};
}

export function closeWithdrawalReceiptSet(members, expected) {
  requireValue(Array.isArray(members) && members.length === 5, 'receipt-set', 'Exactly five motion receipts are required.');
  requireEqual(members.map(row => row.pairIndex).sort((a, b) => a - b), [0, 1, 2, 3, 4], 'receipt-set', 'The five motion receipts must cover each actual pair exactly once.');
  const results = members.map(member => {
    requireValue(member.value?.pairIndex === member.pairIndex, 'receipt-set', 'Index and receipt pair IDs disagree.');
    return requireWithdrawalMotionReceipt(member.value, expected);
  });
  return {ok: true, expectedPairs: 5, completedPairs: 5, pairs: results.sort((a, b) => a.pairIndex - b.pairIndex), geometryRerun: false, basis: 'Exact five accepted motion receipts, identical full model/static/context/source/checker identities and verified current input bytes. Any changed shared model requires a new baseline and all five replacement receipts.'};
}

export function classifyWithdrawalOutcome(operation, result) {
  if (operation === 'prepare') return {status: result.ready ? 'withdrawal-preparation-ready' : 'withdrawal-preparation-rejected', completed: true, accepted: false, H08Accepted: false, preparationReady: result.ready, staticAccepted: false};
  if (operation === 'pose') return {status: result.ok ? 'withdrawal-pose-clear' : 'withdrawal-pose-rejected', completed: true, accepted: false, H08Accepted: false, poseClear: result.ok, staticAccepted: false};
  if (operation === 'static') return {status: result.ok ? 'withdrawal-static-accepted' : 'withdrawal-static-rejected', completed: true, accepted: result.ok, H08Accepted: false, staticAccepted: result.ok};
  if (operation === 'motion') return {status: result.accepted ? 'withdrawal-pair-accepted' : result.completed ? 'withdrawal-pair-rejected' : 'withdrawal-pair-incomplete', completed: result.completed, accepted: result.accepted, H08Accepted: result.accepted, staticAccepted: true};
  return {status: result.ok ? 'withdrawal-bank-accepted' : 'withdrawal-bank-rejected', completed: true, accepted: result.ok, H08Accepted: result.ok, staticAccepted: true};
}

export function runWithdrawalCLI(args) {
  const started = Date.now(); let options, preflight, save, prepared;
  const receipt = {schema: H08_WITHDRAWAL.receiptSchema, startedAt: new Date(started).toISOString(), runtimeCapSeconds: H08_WITHDRAWAL.runtimeCapMs / 1000, externalRuntimeCapRequired: true, operation: null, status: 'incomplete', phase: 'initializing', completed: false, accepted: false, H08Accepted: false, staticAccepted: false, sourceStart: runtimeFingerprint(), checkerStart: withdrawalCheckerFingerprint(), inputs: []};
  const checkpoint = phase => { receipt.phase = phase; receipt.elapsedMs = Date.now() - started; if (preflight) receipt.inputs = preflight.capture.records(); save?.(receipt); };
  try {
    options = parseWithdrawalArgs(args); receipt.operation = options.operation;
    requireValue(receipt.sourceStart.value === H08_WITHDRAWAL.runtimeFingerprint, 'source-changed', 'The frozen June runtime identity changed.');
    preflight = preflightWithdrawalInputs(options); receipt.inputs = preflight.capture.records();
    save = createWithdrawalReceiptWriter(options.output, receipt.inputs.map(row => row.path)); checkpoint('inputs-verified');
    if (options.pairIndex !== undefined) { receipt.pairIndex = options.pairIndex; receipt.ownedRouteIds = H08_WITHDRAWAL.pairs[options.pairIndex]; }
    receipt.domainM = H08_WITHDRAWAL.domainM;
    if (options.operation === 'close') {
      const staticReceipt = preflight.staticReceipt.value, identity = staticReceipt.bankIdentity;
      requireValue(identity?.modelBundleSha256 === preflight.model.record.sha256 && identity.motionContextSha256 === preflight.context.record.sha256 && identity.h07BankReceiptSha256 === preflight.bank.record.sha256 && identity.h07LedgerSha256 === preflight.ledger.record.sha256 && identity.frozenSceneSha256 === H07_CONTINUATION.scene, 'receipt-bank-identity', 'The static prerequisite does not bind the requested current model/context.');
      const expected = {identity, source: receipt.sourceStart, checker: receipt.checkerStart, commonInputs: preflight.commonInputs, staticReceiptRecord: preflight.staticReceipt.record, staticReceiptSha256: preflight.staticReceipt.record.sha256};
      requireWithdrawalStaticReceipt(staticReceipt, expected);
      receipt.bankIdentity = identity; receipt.staticReceiptSha256 = expected.staticReceiptSha256;
      receipt.closure = closeWithdrawalReceiptSet(preflight.members, expected); Object.assign(receipt, classifyWithdrawalOutcome('close', receipt.closure));
      receipt.memberReceipts = preflight.members.map(row => ({pairIndex: row.pairIndex, repositoryPath: row.record.repositoryPath, sha256: row.record.sha256}));
    } else {
      prepared = prepareActualScene(preflight, started, checkpoint); receipt.bankIdentity = prepared.identity;
      receipt.inventory = {interfaces: 104, routes: 187, rightModels: 10, fixedNonRightRoutes: 177, physicalAndOperational: 2444, services: 2526, terminals: 523, movingSolids: 60, fixedConnectorSolids: 40};
      receipt.preparation = {H07Rechecked: true, ready: prepared.models.ready, readyModels: prepared.models.readyCount, rejectedRouteIds: prepared.models.rejectedRouteIds, constructionChecks: prepared.models.checks, participantManifest: prepared.bound.participantManifest};
      checkpoint('models-prepared');
      if (options.operation === 'prepare' || !prepared.models.ready) Object.assign(receipt, classifyWithdrawalOutcome('prepare', prepared.models));
      else if (options.operation === 'pose') {
        checkpoint('before-owned-pose-audit');
        receipt.pose = auditWithdrawalPose(prepared, options); assertBudget(started);
        Object.assign(receipt, classifyWithdrawalOutcome('pose', receipt.pose));
      } else {
        const staticChecks = auditWithdrawalStaticBaselines(prepared, preflight.model.value, pair => { assertBudget(started); checkpoint('static-pair-' + pair); }); assertBudget(started);
        if (options.operation === 'static') { receipt.staticChecks = staticChecks; Object.assign(receipt, classifyWithdrawalOutcome('static', staticChecks)); }
        else {
          requireWithdrawalStaticReceipt(preflight.staticReceipt.value, {identity: prepared.identity, source: receipt.sourceStart, checker: receipt.checkerStart, commonInputs: preflight.commonInputs}, staticChecks);
          receipt.staticReceiptSha256 = preflight.staticReceipt.record.sha256; receipt.staticAccepted = true;
          const proof = createWithdrawalAffineProof({domain: H08_WITHDRAWAL.domainM, baseline: {routes: prepared.bound.routes, obstacles: prepared.bound.obstacles}, participantManifest: prepared.bound.participantManifest, ownedRouteIds: H08_WITHDRAWAL.pairs[options.pairIndex], routeMotions: prepared.routeMotions, obstacleMotions: prepared.bound.obstacleMotions});
          assertBudget(started); checkpoint('before-withdrawal-rectangle');
          const maxElapsedMs = Math.min(1200000, H08_WITHDRAWAL.runtimeCapMs - (Date.now() - started) - 1000);
          requireValue(maxElapsedMs > 0, 'runtime-cap-exceeded', 'No motion budget remains after validated preparation.');
          receipt.certificate = certifyWithdrawalRectangle({proof, maxCells: 4096, maxSamples: 20000, maxDepth: 24, maxElapsedMs, onCell: progress => { receipt.lastCell = progress; }});
          Object.assign(receipt, classifyWithdrawalOutcome('motion', receipt.certificate));
        }
      }
    }
    assertBudget(started);
  } catch (error) {
    receipt.accepted = false; receipt.H08Accepted = false; receipt.completed = false;
    receipt.status = /budget|runtime-cap/.test(error.code || '') ? 'withdrawal-incomplete' : 'withdrawal-input-rejected';
    receipt.error = {code: error.code || 'withdrawal-execution-error', message: error.message, ...error.details};
  }
  try {
    receipt.sourceFinish = runtimeFingerprint(); receipt.checkerFinish = withdrawalCheckerFingerprint();
    receipt.unchangedSource = sameRoutingSourceFingerprint(receipt.sourceStart, receipt.sourceFinish);
    receipt.unchangedChecker = sameRoutingSourceFingerprint(receipt.checkerStart, receipt.checkerFinish);
    receipt.unchangedInputs = !!preflight && preflight.capture.records().every(row => { const bytes = fs.readFileSync(row.path); return bytes.length === row.bytes && withdrawalDigest(bytes) === row.sha256; });
    if (!(receipt.unchangedSource && receipt.unchangedChecker && receipt.unchangedInputs)) { receipt.accepted = false; receipt.H08Accepted = false; receipt.completed = false; receipt.status = 'withdrawal-identity-changed'; }
    assertBudget(started); receipt.finishedAt = new Date().toISOString(); checkpoint('finished');
  } catch (error) {
    receipt.accepted = false; receipt.H08Accepted = false; receipt.completed = false; receipt.status = 'withdrawal-finalization-incomplete'; receipt.finalizationError = {code: error.code || 'finalization-error', message: error.message};
    try { checkpoint('finalization-incomplete'); } catch { /* Preserve the last owned incomplete checkpoint. */ }
  }
  const successfulPreparation = receipt.operation === 'prepare' && receipt.status === 'withdrawal-preparation-ready' && receipt.completed && receipt.unchangedSource && receipt.unchangedChecker && receipt.unchangedInputs;
  const successfulPose = receipt.operation === 'pose' && receipt.poseClear && receipt.completed && receipt.unchangedSource && receipt.unchangedChecker && receipt.unchangedInputs;
  return {receipt, exitCode: receipt.accepted || successfulPreparation || successfulPose ? 0 : 1};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {receipt, exitCode} = runWithdrawalCLI(process.argv.slice(2));
  console.log(JSON.stringify({operation: receipt.operation, status: receipt.status, completed: receipt.completed, accepted: receipt.accepted, H08Accepted: receipt.H08Accepted, preparationReady: receipt.preparationReady ?? false, readyModels: receipt.preparation?.readyModels ?? null, rejectedRouteIds: receipt.preparation?.rejectedRouteIds ?? [], error: receipt.error ?? receipt.finalizationError ?? null, elapsedMs: receipt.elapsedMs}));
  process.exitCode = exitCode;
}
