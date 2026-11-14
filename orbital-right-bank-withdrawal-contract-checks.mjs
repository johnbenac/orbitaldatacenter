// H08-P2 bounded runner contracts. No H06 decompression, actual-scene audit,
// route search, motion dispatch, or actual H08 acceptance is performed here.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  H08_WITHDRAWAL as H, withdrawalDigest as sha, parseWithdrawalArgs,
  validateWithdrawalModelBundle, validateWithdrawalReceiptIndex,
  validatePinnedMotionSourceFiles, safeWithdrawalOutput,
  validateH07BankInputManifest,
  createWithdrawalReceiptWriter, withdrawalCheckerFingerprint,
  bindWithdrawalParticipants, constructWithdrawalModels, auditWithdrawalPose,
  requireWithdrawalStaticReceipt, requireWithdrawalMotionReceipt,
  closeWithdrawalReceiptSet, classifyWithdrawalOutcome,
} from './orbital-right-bank-withdrawal-checks.mjs';
import {validateWithdrawalRectangleCoverage} from './orbital-withdrawal-rectangle.mjs';
import {routingSourceFingerprint, sameRoutingSourceFingerprint} from './scripts/routing-source-fingerprint.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2);
if (args.length && !(args.length === 2 && args[0] === '--receipt' && args[1])) throw new Error('Usage: node orbital-right-bank-withdrawal-contract-checks.mjs [--receipt NEW.json]');
const started = Date.now(), checkerStart = withdrawalCheckerFingerprint(), sourceStart = routingSourceFingerprint({entries: ['orbital-right-bank-diagnostic.mjs']}), results = [];
const fixturePaths = ['docs/harnessing-work/H08-all-targets/model-bundles/initial-readiness.json', H.motionContext];
const fixtureInputs = fixturePaths.map(repositoryPath => { const bytes = fs.readFileSync(path.join(ROOT, repositoryPath)); return {repositoryPath, sha256: sha(bytes), bytes: bytes.length}; });
const historicalBundle = JSON.parse(fs.readFileSync(path.join(ROOT, fixturePaths[0]))), context = JSON.parse(fs.readFileSync(path.join(ROOT, fixturePaths[1])));
// This synthetic construction fixture deliberately retains the initial bad /8
// allocation. Only its fixture provenance follows the current test context;
// no historical model or receipt file is rewritten or accepted by this clone.
const bundle = {...historicalBundle, h07BankReceiptSha256: H.h07BankReceiptSha256, motionContextSha256: H.motionContextSha256};
const clone = structuredClone;
const reject = (body, code) => assert.throws(body, error => error && (!code || error.code === code), code || 'Expected rejection');
const test = (name, body) => {
  const at = Date.now();
  try { const evidence = body(); const row = {name, pass: true, elapsedMs: Date.now() - at, evidence: evidence ?? null}; results.push(row); console.log(JSON.stringify(row)); }
  catch (error) { const row = {name, pass: false, elapsedMs: Date.now() - at, error: {name: error.name, code: error.code, message: error.message, stack: error.stack, actual: error.actual, expected: error.expected}}; results.push(row); console.log(JSON.stringify(row)); }
};
console.log(JSON.stringify({schema: 'orbital-data-center/H08-P2-contract-start/1', startedAt: new Date(started).toISOString(), sourceStart, checkerStart, fixtureInputs, actualH08Accepted: false}));
const cli = (operation, extra = []) => ['--operation', operation, '--models', 'models.json', '--output', 'receipt.json', ...extra];

test('all-five-actual-selectors-and-required-mode-inputs', () => {
  for (let pair = 0; pair < 5; pair++) {
    assert.equal(parseWithdrawalArgs(cli('prepare', ['--pair', String(pair)])).pairIndex, pair);
    assert.equal(parseWithdrawalArgs(cli('motion', ['--pair', String(pair), '--static-receipt', 'static.json'])).pairIndex, pair);
    assert.equal(parseWithdrawalArgs(cli('pose', ['--pair', String(pair), '--from-m', '0', '--to-m', '.045'])).pairIndex, pair);
  }
  assert.equal(parseWithdrawalArgs(cli('static')).operation, 'static');
  assert.equal(parseWithdrawalArgs(cli('close', ['--static-receipt', 'static.json', '--receipt-index', 'index.json'])).operation, 'close');
  for (const pair of ['', '-1', '5', 'all', '0,1', '01', '1.0']) reject(() => parseWithdrawalArgs(cli('prepare', ['--pair', pair])));
  for (const operation of ['prepare', 'motion', 'pose']) reject(() => parseWithdrawalArgs(cli(operation)));
  reject(() => parseWithdrawalArgs(cli('static', ['--pair', '0'])));
  reject(() => parseWithdrawalArgs(cli('motion', ['--pair', '0'])));
  reject(() => parseWithdrawalArgs(cli('prepare', ['--pair', '0', '--pair', '1'])));
  reject(() => parseWithdrawalArgs(cli('prepare', ['--pair', '0', '--weaken', 'true'])));
  reject(() => parseWithdrawalArgs(cli('close', ['--static-receipt', 'static.json'])));
  return {pairs: [0, 1, 2, 3, 4], independentDomainM: H.domainM};
});

test('pose-coordinate-validation-and-no-cross-mode-leak', () => {
  const base = cli('pose', ['--pair', '3']);
  const valid = parseWithdrawalArgs([...base, '--from-m', '0.0255', '--to-m', '0.0255']);
  assert.equal(valid.fromWithdrawalM, .0255); assert.equal(valid.toWithdrawalM, .0255);
  for (const value of ['NaN', 'Infinity', '-0.001', '0.04500001', '', '1e-2', '0x0', ' 0']) reject(() => parseWithdrawalArgs([...base, '--from-m', value, '--to-m', '0']));
  reject(() => parseWithdrawalArgs([...base, '--from-m', '0']));
  reject(() => parseWithdrawalArgs([...base, '--to-m', '0']));
  reject(() => parseWithdrawalArgs(cli('static', ['--from-m', '0', '--to-m', '0'])));
});

test('exact-ten-model-scope-and-interface-contract', () => {
  validateWithdrawalModelBundle(bundle, context.participants);
  const changes = [
    b => b.models.pop(), b => b.models.push(clone(b.models[0])),
    b => b.models.reverse(), b => b.models[0].id = 'P-SA-2/10',
    b => b.domainM.to[1] = .044, b => b.configurationId = 'another-design',
    b => b.stateId = 'another-state', b => b.motionContextSha256 = '0'.repeat(64),
    b => b.h07BankReceiptSha256 = '0'.repeat(64),
    b => b.models[0].radiusM = 0, b => b.models[0].allocation.fromTravelM = .001,
    b => b.models[0].allocation.controls[0][0] += .0001,
    b => b.models[0].allocation.toNormal = [0, 1, 0],
    b => b.models[0].allocation.axis = [0, 0, 0],
    b => b.models[0].allocation.first = -1,
    b => b.models[0].allocation.parameterMap = {from: 'to', to: 'from'},
  ];
  for (const change of changes) { const b = clone(bundle); change(b); reject(() => validateWithdrawalModelBundle(b, context.participants)); }
  return {sourceOrderedModels: bundle.models.map(row => row.id), rejectedMutations: changes.length};
});

test('saved-nine-valid-models-and-raw-eight-rejection-are-recomputed', () => {
  const result = constructWithdrawalModels(bundle, context.participants);
  assert.equal(result.checks.length, 10); assert.equal(result.ready, false); assert.equal(result.readyCount, 9);
  assert.deepEqual(result.rejectedRouteIds, ['P-SA-2/8']);
  assert(result.checks.at(-1).issues.length > 0);
  const outcome = classifyWithdrawalOutcome('prepare', result);
  assert.equal(outcome.completed, true); assert.equal(outcome.preparationReady, false); assert.equal(outcome.H08Accepted, false); assert.equal(outcome.accepted, false);
  return {readyCount: result.readyCount, checks: result.checks.map(row => ({id: row.id, ok: row.ok, issues: row.issues})), outcome};
});

test('context-pins-all-nine-files-including-connector-motion', () => {
  const rows = validatePinnedMotionSourceFiles(context);
  assert.equal(rows.length, 9);
  reject(() => validatePinnedMotionSourceFiles(context, file => { const bytes = fs.readFileSync(path.join(ROOT, file)); return file === 'dist/flight-connector-routing-motion.js' ? Buffer.concat([bytes, Buffer.from('\n')]) : bytes; }), 'motion-source-changed');
  const omitted = clone(context); omitted.inputs.inspectedSourceFiles.pop(); reject(() => validatePinnedMotionSourceFiles(omitted), 'motion-source-manifest');
  const roles = ['scene', 'anchor-candidate', 'anchor-receipt', 'ledger', ...[0, 2, 3, 4].flatMap(pair => ['accepted-pair-' + pair + '-candidate', 'accepted-pair-' + pair + '-receipt', 'prior-pair-' + pair + '-input:ledger']), 'source-transition'];
  const bank = {inputs: roles.map((role, i) => ({role, repositoryPath: 'synthetic/' + i + '.json'}))};
  validateH07BankInputManifest(bank, {transitionRequired: true});
  for (const mutate of [b => b.inputs.pop(), b => b.inputs.at(-1).role = 'another-role', b => b.inputs.at(-1).repositoryPath = b.inputs[0].repositoryPath]) {
    const b = clone(bank); mutate(b); reject(() => validateH07BankInputManifest(b, {transitionRequired: true}), 'H07-input-manifest');
  }
  return {motionFileSha256: rows.find(row => row.repositoryPath === 'dist/flight-connector-routing-motion.js').sha256};
});

const box = (id, x, lineId = undefined) => ({id, type: 'box', min: [x, 100, 100], max: [x + .1, 100.1, 100.1], bounds: {min: [x, 100, 100], max: [x + .1, 100.1, 100.1]}, ...(lineId ? {lineId} : {})});
function bindingFixture() {
  const c = clone(context), movingRows = [...c.movingPhysicalObstacles, ...c.fixedConnectorObstacles];
  const physical = movingRows.map((row, i) => {
    const solid = {...box(row.obstacleId, 100 + i), sourceMesh: row.sourceMesh, apertures: []};
    row.geometryType = solid.type; row.frozenGeometryDigest = sha(solid); row.apertureIds = [];
    return solid;
  });
  while (physical.length < 2444) physical.push(box('synthetic-physical-' + physical.length, 300 + physical.length));
  const services = Array.from({length: 2526}, (_, i) => box('synthetic-service-' + i, 3000 + i));
  const terminals = Array.from({length: 523}, (_, i) => box('synthetic-terminal-' + i, 6000 + i, i === 0 ? H.pairs[0][0] : 'foreign-fixed-owner-' + i));
  c.terminalRegistry.records = terminals.map(row => ({id: row.id, lineId: row.lineId, motionLaw: 'fixed'}));
  c.terminalRegistry.sourceIntegrityManifest = {ids: terminals.map(row => row.id), count: 523, geometryDigest: sha(terminals)};
  const interfaces = [...clone(c.participants), ...Array.from({length: 94}, (_, i) => ({id: 'synthetic-interface-' + i}))];
  const mandatoryRoutes = Array.from({length: 177}, (_, i) => ({id: 'synthetic-fixed-route-' + i, points: [[100 + i, 0, 0], [100 + i, 0, 1]], radiusM: .001, clearanceM: 0}));
  const rightRoutes = H.pairs.flat().map((id, i) => ({id, points: [[i * 2, 0, 0], [i * 2, 0, 1]], radiusM: .001, clearanceM: .002}));
  return {context: c, physical, services, terminals, interfaces, mandatoryRoutes, rightRoutes};
}

test('complete-category-membership-and-exact-sixty-mover-joins', () => {
  const f = bindingFixture(), bound = bindWithdrawalParticipants(f);
  assert.equal(bound.routes.length, 187); assert.equal(bound.obstacles.length, 5493);
  assert.equal(bound.obstacleMotions.filter(row => row.kind === 'rigid-translation').length, 60);
  assert.equal(bound.participantManifest.movingRouteIds.length, 10); assert.equal(bound.participantManifest.terminalObstacleIds.length, 523);
  const changes = [
    x => x.physical.pop(), x => x.services.pop(), x => x.terminals.pop(),
    x => x.mandatoryRoutes.pop(), x => x.rightRoutes.pop(),
    x => x.physical[0].sourceMesh = 'same-count-wrong-mesh',
    x => x.physical[0].min[0] += .001,
    x => x.context.movingPhysicalObstacles[0].translationCoefficientsPerMeter.to = [0, 0, 0],
    x => x.context.movingPhysicalObstacles[0].routeId = 'synthetic-interface-0',
    x => x.context.movingPhysicalObstacles[0].obstacleId = x.services[0].id,
    x => x.context.movingPhysicalObstacles[0].apertureIds.push('omitted-aperture'),
    x => x.context.banks[0].movingPhysicalObstacleIds.pop(),
    x => x.context.terminalRegistry.movingCount = 1,
    x => x.terminals[1].lineId = H.pairs[0][0],
    x => x.context.participants[0].from[0] += .0001,
    x => x.services[0].id = x.physical[0].id,
  ];
  for (const change of changes) { const x = clone(f); change(x); reject(() => bindWithdrawalParticipants(x)); }
  return {routes: 187, obstacles: 5493, movingModels: 10, movingSolids: 60, fixedTerminals: 523, rejectedMutations: changes.length};
});

function poseFixture(f = bindingFixture()) {
  const bound = bindWithdrawalParticipants(f);
  return {models: {ready: true}, bound, routeMotions: [...f.mandatoryRoutes.map(row => ({id: row.id, kind: 'stationary'})), ...f.rightRoutes.map(row => ({id: row.id, kind: 'rigid-translation', fromCoefficient: [0, 1, 0], toCoefficient: [1, 0, 0]}))]};
}
test('analytic-posed-snapshot-retains-all-context-and-never-accepts-motion', () => {
  const pose = auditWithdrawalPose(poseFixture(), {pairIndex: 0, fromWithdrawalM: .0255, toWithdrawalM: .0255});
  assert.equal(pose.ok, true); assert.equal(pose.H08Accepted, false); assert.equal(pose.continuousCoverageAssessed, false);
  assert.deepEqual(pose.inventory, {routes: 187, obstacles: 5493, movingRoutes: 10, movingObstacles: 60, fixedTerminals: 523});
  assert(pose.checks.every(row => row.retainedNeighborRoutes === 186));
  assert.deepEqual(pose.checks[0].excludedOwnTerminalIds, ['synthetic-terminal-0']);
  assert.deepEqual(pose.checks[1].excludedOwnTerminalIds, []);
  const outcome = classifyWithdrawalOutcome('pose', pose);
  assert.equal(outcome.poseClear, true); assert.equal(outcome.accepted, false); assert.equal(outcome.H08Accepted, false); assert.equal(outcome.staticAccepted, false);
  return {inventory: pose.inventory, outcome};
});

test('fixed-foreign-terminal-witness-is-retained-at-posed-route', () => {
  const f = bindingFixture();
  f.terminals[1] = {id: 'synthetic-terminal-1', type: 'capsule', a: [.0255, .0255, .4], b: [.0255, .0255, .6], radiusM: .01, bounds: {min: [.0155, .0155, .39], max: [.0355, .0355, .61]}, lineId: 'foreign-fixed-owner-1'};
  f.context.terminalRegistry.sourceIntegrityManifest.geometryDigest = sha(f.terminals);
  const pose = auditWithdrawalPose(poseFixture(f), {pairIndex: 0, fromWithdrawalM: .0255, toWithdrawalM: .0255});
  assert.equal(pose.ok, false);
  assert(pose.checks[0].audit.issues.some(row => row.code === 'solid-collision' && row.obstacleId === 'synthetic-terminal-1'));
  assert.equal(pose.H08Accepted, false);
  return {ownedRouteId: pose.checks[0].id, witness: pose.checks[0].audit.issues};
});

function receiptFixture() {
  const manifest = bindWithdrawalParticipants(bindingFixture()).participantManifest;
  const sourceFiles = [{path: 'synthetic-runtime.js', sha256: sha('runtime')}], checkerFiles = [{path: 'synthetic-checker.mjs', sha256: sha('checker')}];
  const source = {algorithm: 'sha256', files: sourceFiles, value: sha(sourceFiles)}, checker = {algorithm: 'sha256', files: checkerFiles, value: sha(checkerFiles)};
  const commonInputs = ['context.json', 'models.json', 'H07.json'].map(repositoryPath => ({repositoryPath, bytes: 10, sha256: sha(repositoryPath)}));
  const staticReceiptRecord = {repositoryPath: 'static.json', bytes: 100, sha256: sha('static')};
  const identity = {configurationId: H.configurationId, stateId: H.stateId, domainM: clone(H.domainM), h07BankReceiptSha256: H.h07BankReceiptSha256, h07LedgerSha256: H.h07LedgerSha256, motionContextSha256: H.motionContextSha256, modelBundleSha256: sha('model-fixture'), frozenSceneSha256: sha('synthetic-scene'), staticBaselineSha256: sha('synthetic-baseline'), participantManifestSha256: sha(manifest), movingModelSha256: sha('synthetic-all-ten'), fixedContextSha256: sha('synthetic-fixed')};
  const common = {schema: H.receiptSchema, completed: true, accepted: true, phase: 'finished', unchangedSource: true, unchangedChecker: true, unchangedInputs: true, sourceStart: source, sourceFinish: source, checkerStart: checker, checkerFinish: checker, bankIdentity: identity, inputs: clone(commonInputs)};
  const staticChecks = {ok: true, expectedPairs: 5, completedPairs: 5, totalRoutes: 187, immutableNeighborsPerPair: 185, pairs: H.pairs.map((pairIds, pairIndex) => ({pairIndex, pairIds, checks: {ok: true, constructionIssues: [], pairAudit: {ok: true, issueCount: 0, truncated: false, issues: []}, neighboringClearance: pairIds.map(id => ({id, ok: true})), lengths: pairIds.map(id => ({id, ok: true}))}}))};
  const staticReceipt = {...common, operation: 'static', status: 'withdrawal-static-accepted', H08Accepted: false, staticAccepted: true, staticChecks};
  const members = H.pairs.map((ownedRouteIds, pairIndex) => {
    const cells = [{path: '', bounds: clone(H.domainM), status: 'certified', minimumCertificateMarginM: .1, ownedResults: ownedRouteIds.map(id => ({id, ok: true, issueCount: 0, truncated: false, issues: [], selfNeighborhood: {ok: true}, retainedNeighborRoutes: 186}))}];
    const certificate = {schema: 'orbital-data-center/H08-withdrawal-rectangle/1', status: 'withdrawal-rectangle-accepted', completed: true, accepted: true, coverageComplete: true, externalSamplerCertified: false, issues: [], unresolvedCells: 0, rejectedCells: 0, certifiedCells: 1, cells, domain: clone(H.domainM), ownedRouteIds, participantManifest: manifest, coverage: validateWithdrawalRectangleCoverage({domain: H.domainM, cells})};
    return {pairIndex, value: {...clone(common), operation: 'motion', status: 'withdrawal-pair-accepted', pairIndex, ownedRouteIds, domainM: clone(H.domainM), H08Accepted: true, staticAccepted: true, staticReceiptSha256: staticReceiptRecord.sha256, inputs: [...clone(commonInputs), clone(staticReceiptRecord)], certificate}};
  });
  return {expected: {identity, source, checker, commonInputs, staticReceiptRecord, staticReceiptSha256: staticReceiptRecord.sha256}, staticReceipt, members};
}

test('common-static-and-all-five-collector-positive-structural-control', () => {
  const f = receiptFixture(); requireWithdrawalStaticReceipt(f.staticReceipt, f.expected, f.staticReceipt.staticChecks);
  for (const member of f.members) requireWithdrawalMotionReceipt(member.value, f.expected);
  const result = closeWithdrawalReceiptSet(f.members, f.expected);
  assert.equal(result.ok, true); assert.equal(result.completedPairs, 5); assert.equal(result.geometryRerun, false);
  return {scope: 'Synthetic receipt metadata validation only; no actual motion claim.', completedPairs: 5, geometryRerun: false};
});

test('collector-rejects-missing-duplicate-outside-and-misindexed-pairs', () => {
  const f = receiptFixture();
  reject(() => closeWithdrawalReceiptSet(f.members.slice(0, 4), f.expected), 'receipt-set');
  const duplicate = clone(f.members); duplicate[4] = clone(duplicate[0]); reject(() => closeWithdrawalReceiptSet(duplicate, f.expected), 'receipt-set');
  const outside = clone(f.members); outside[4].pairIndex = 5; reject(() => closeWithdrawalReceiptSet(outside, f.expected), 'receipt-set');
  const mismatch = clone(f.members); mismatch[4].value.pairIndex = 3; reject(() => closeWithdrawalReceiptSet(mismatch, f.expected), 'receipt-set');
});

test('collector-rejects-stale-model-static-context-source-and-missing-inputs', () => {
  const f = receiptFixture(), mutations = [
    r => r.bankIdentity.modelBundleSha256 = sha('changed-model'),
    r => r.bankIdentity.staticBaselineSha256 = sha('changed-baseline'),
    r => r.bankIdentity.motionContextSha256 = sha('changed-context'),
    r => r.bankIdentity.movingModelSha256 = sha('changed-neighbor-model'),
    r => r.staticReceiptSha256 = sha('changed-static'),
    r => r.sourceStart.value = sha('changed-source'),
    r => r.sourceFinish.value = sha('changed-source-at-finish'),
    r => r.checkerFinish.value = sha('changed-checker'),
    r => r.inputs.pop(), r => r.inputs.splice(0, 1),
    r => r.inputs[0].sha256 = sha('changed-input'),
    r => r.inputs.push(clone(r.inputs[0])),
    r => r.inputs = [],
  ];
  for (const mutate of mutations) { const members = clone(f.members); mutate(members[2].value); reject(() => closeWithdrawalReceiptSet(members, f.expected)); }
  const staticMissing = clone(f.staticReceipt); staticMissing.inputs.splice(0, 1); reject(() => requireWithdrawalStaticReceipt(staticMissing, f.expected), 'receipt-inputs');
  return {rejectedMemberMutations: mutations.length, requiredCurrentInputs: f.expected.commonInputs.length + 1};
});

test('collector-rejects-partial-rejected-incomplete-and-boolean-only-claims', () => {
  const f = receiptFixture(), mutations = [
    r => r.operation = 'prepare', r => r.operation = 'static', r => r.operation = 'pose',
    r => r.status = 'withdrawal-pair-rejected', r => r.completed = false,
    r => r.accepted = false, r => r.H08Accepted = false, r => r.staticAccepted = false,
    r => r.unchangedInputs = false, r => r.unchangedSource = false, r => r.unchangedChecker = false,
    r => r.phase = 'before-withdrawal-rectangle', r => r.error = {code: 'timeout'},
    r => r.domainM.from[1] = .02, r => r.ownedRouteIds.reverse(),
    r => r.certificate.completed = false, r => r.certificate.accepted = false,
    r => r.certificate.coverageComplete = false, r => r.certificate.externalSamplerCertified = true,
    r => r.certificate.issues.push({code: 'unresolved'}),
    r => r.certificate.rejectedCells = 1, r => r.certificate.unresolvedCells = 1,
    r => r.certificate.cells[0].status = 'unresolved',
    r => r.certificate.cells[0].minimumCertificateMarginM = 0,
    r => r.certificate.cells[0].ownedResults[0].ok = false,
    r => r.certificate.cells[0].ownedResults[0].selfNeighborhood.ok = false,
    r => r.certificate.cells[0].ownedResults[0].retainedNeighborRoutes = 185,
    r => r.certificate.cells[0].ownedResults.pop(),
    r => r.certificate.participantManifest.routeIds.pop(),
    r => r.certificate.participantManifest.obstacleIds.pop(),
    r => r.certificate.cells = [],
    r => { r.certificate.cells[0].path = '0'; r.certificate.cells[0].bounds.from[1] = .0225; },
    r => r.certificate.coverage.certifiedAreaM2 = 0,
  ];
  for (const mutate of mutations) { const members = clone(f.members); mutate(members[0].value); reject(() => closeWithdrawalReceiptSet(members, f.expected)); }
  return {rejectedMemberMutations: mutations.length};
});

test('static-prerequisite-needs-all-five-current-real-predicates', () => {
  const f = receiptFixture(), mutations = [
    r => r.H08Accepted = true, r => r.staticAccepted = false,
    r => r.staticChecks.pairs.pop(), r => r.staticChecks.pairs[4].pairIndex = 3,
    r => r.staticChecks.immutableNeighborsPerPair = 184,
    r => r.staticChecks.pairs[0].checks.constructionIssues.push({code: 'construction'}),
    r => r.staticChecks.pairs[0].checks.pairAudit.truncated = true,
    r => r.staticChecks.pairs[0].checks.neighboringClearance[0].ok = false,
    r => r.staticChecks.pairs[0].checks.lengths[0].ok = false,
  ];
  for (const mutate of mutations) { const receipt = clone(f.staticReceipt); mutate(receipt); reject(() => requireWithdrawalStaticReceipt(receipt, f.expected)); }
  const differentCurrentAudit = clone(f.staticReceipt.staticChecks); differentCurrentAudit.pairs[0].checks.newEvidence = 'changed';
  reject(() => requireWithdrawalStaticReceipt(f.staticReceipt, f.expected, differentCurrentAudit), 'static-receipt-reconstruction');
});

test('exact-five-receipt-index-and-path-contract', () => {
  const index = {schema: H.indexSchema, receipts: H.pairs.map((_ids, pairIndex) => ({pairIndex, receipt: 'receipts/pair-' + pairIndex + '.json', sha256: sha(String(pairIndex))}))};
  validateWithdrawalReceiptIndex(index);
  const mutations = [
    x => x.receipts.pop(), x => x.receipts[4].pairIndex = 0,
    x => x.receipts[4].pairIndex = 5, x => x.receipts[4].pairIndex = '4',
    x => x.receipts[4].receipt = x.receipts[0].receipt,
    x => x.receipts[4].receipt = '../outside.json',
    x => x.receipts[4].receipt = '/absolute.json',
    x => x.receipts[4].sha256 = 'not-a-sha',
    x => x.receipts[4].optional = true,
  ];
  for (const mutate of mutations) { const x = clone(index); mutate(x); reject(() => validateWithdrawalReceiptIndex(x)); }
});

test('new-atomic-receipts-reject-file-link-temp-and-resolved-parent-aliases', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'H08-P2-artifact-contract-'));
  try {
    const input = path.join(directory, 'input.json'); fs.writeFileSync(input, '{"source":"preserve"}\n'); const before = fs.readFileSync(input);
    reject(() => safeWithdrawalOutput(input, [input]));
    const hard = path.join(directory, 'hard.json'); fs.linkSync(input, hard); reject(() => safeWithdrawalOutput(hard, [input]));
    const symlink = path.join(directory, 'symlink.json'); fs.symlinkSync(input, symlink); reject(() => safeWithdrawalOutput(symlink, [input]));
    const broken = path.join(directory, 'broken.json'); fs.symlinkSync(path.join(directory, 'absent.json'), broken); reject(() => safeWithdrawalOutput(broken, [input]));
    const temp = path.join(directory, 'temp.json'); fs.writeFileSync(temp + '.tmp', '{}'); reject(() => safeWithdrawalOutput(temp, [input]), 'output-temp-exists');
    const alias = path.join(directory, 'parent-alias'); fs.symlinkSync(directory, alias); reject(() => safeWithdrawalOutput(path.join(alias, 'input.json'), [input]), 'output-input-alias');
    const nestedInput = path.join(directory, 'nested.json.tmp'); fs.writeFileSync(nestedInput, '{}'); reject(() => safeWithdrawalOutput(path.join(directory, 'nested.json'), [nestedInput]), 'output-input-alias');
    const output = path.join(directory, 'fresh', 'receipt.json'), save = createWithdrawalReceiptWriter(output, [input]);
    save({completed: false}); save({completed: true}); assert.equal(JSON.parse(fs.readFileSync(output)).completed, true); assert.equal(fs.existsSync(output + '.tmp'), false);
    fs.writeFileSync(output, '{"external":true}'); reject(() => save({completed: true}), 'output-changed');
    assert.deepEqual(fs.readFileSync(input), before);
    return {originalInputUnchanged: true, newAtomicCheckpointVerified: true};
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});

test('status-separation-preparation-static-pose-motion-and-closure', () => {
  for (const operation of ['prepare', 'pose', 'static']) {
    const result = classifyWithdrawalOutcome(operation, {ready: true, ok: true});
    assert.equal(result.H08Accepted, false); if (operation !== 'static') assert.equal(result.accepted, false);
  }
  const incomplete = classifyWithdrawalOutcome('motion', {completed: false, accepted: false}); assert.equal(incomplete.completed, false); assert.equal(incomplete.H08Accepted, false);
  const rejected = classifyWithdrawalOutcome('motion', {completed: true, accepted: false}); assert.equal(rejected.completed, true); assert.equal(rejected.H08Accepted, false);
  assert.equal(classifyWithdrawalOutcome('motion', {completed: true, accepted: true}).H08Accepted, true);
});

const checkerFinish = withdrawalCheckerFingerprint(), sourceFinish = routingSourceFingerprint({entries: ['orbital-right-bank-diagnostic.mjs']});
const unchangedChecker = sameRoutingSourceFingerprint(checkerStart, checkerFinish), unchangedSource = sameRoutingSourceFingerprint(sourceStart, sourceFinish);
const unchangedInputs = fixtureInputs.every(row => { const bytes = fs.readFileSync(path.join(ROOT, row.repositoryPath)); return bytes.length === row.bytes && sha(bytes) === row.sha256; });
const receipt = {schema: 'orbital-data-center/H08-P2-contract-receipt/1', startedAt: new Date(started).toISOString(), finishedAt: new Date().toISOString(), elapsedMs: Date.now() - started, completed: true, accepted: results.every(row => row.pass) && unchangedChecker && unchangedSource && unchangedInputs, actualH08Accepted: false, actualSceneLoaded: false, sourceStart, sourceFinish, checkerStart, checkerFinish, unchangedChecker, unchangedSource, unchangedInputs, fixtureInputs, total: results.length, passed: results.filter(row => row.pass).length, failed: results.filter(row => !row.pass).length, results};
if (args.length) createWithdrawalReceiptWriter(path.resolve(args[1]), [...checkerStart.files.map(row => path.join(ROOT, row.path)), ...fixtureInputs.map(row => path.join(ROOT, row.repositoryPath))])(receipt);
console.log(JSON.stringify({kind: 'H08-P2-contract-finish', completed: receipt.completed, accepted: receipt.accepted, actualH08Accepted: false, total: receipt.total, passed: receipt.passed, failed: receipt.failed, unchangedChecker, unchangedSource, unchangedInputs, elapsedMs: receipt.elapsedMs}));
process.exitCode = receipt.accepted ? 0 : 1;
