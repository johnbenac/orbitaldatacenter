// Focused H07-P2 provenance/completeness contracts. All geometry below is
// synthetic; a passing result is not acceptance of the real right bank.
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readFileSync, rmSync, symlinkSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {H07_CONTINUATION as C, validateContinuationLedger, continuationPairScene, makeContinuationCandidate, auditContinuation, auditCompleteBank, checkRecordedAcceptance, safeContinuationOutput, resolveRecordedContinuationInput, verifyRecordedContinuationInput} from './orbital-right-bank-continuation-checks.mjs';

const clone = value => structuredClone(value);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const reject = (action, code) => assert.throws(action, error => error.code === code);
const ledger = indices => ({schema: C.ledgerSchema, entries: indices.map(pairIndex => ({pairIndex, candidate: 'pair-' + pairIndex + '.json', receipt: 'receipt-' + pairIndex + '.json'}))});
let groups = 0;

for (let count = 0; count <= 4; count++) validateContinuationLedger(ledger([0, 2, 3, 4].slice(0, count)));
for (const indices of [[2], [0, 3], [0, 2, 2], [0, 1], [0, 2, 4], [0, 2, 3, 4, 4]]) reject(() => validateContinuationLedger(ledger(indices)), indices.length > 4 ? 'ledger-schema' : 'ledger-order');
const absoluteLedger = ledger([0]); absoluteLedger.entries[0].candidate = '/old-checkout/candidate.json'; reject(() => validateContinuationLedger(absoluteLedger), 'ledger-input');
groups++;

const interfaces = Array.from({length: 10}, (_, ordinal) => {
  const index = ordinal % 2 ? ordinal - 1 : ordinal + 1;
  return {id: 'P-SA-2/' + index, instance: Math.floor(ordinal / 2), from: [0, ordinal, 0], to: [4, ordinal, 0], fromNormal: [1, 0, 0], toNormal: [-1, 0, 0], radiusM: .01, bendRadiusM: .1, terminationAllowanceM: .3};
});
const pairs = Array.from({length: 5}, (_, index) => ({index, ids: interfaces.slice(index * 2, index * 2 + 2).map(row => row.id), instance: index, interfaces: interfaces.slice(index * 2, index * 2 + 2)}));
const record = line => { const value = {id: line.id, points: [line.from, line.to], radiusM: line.radiusM, clearanceM: .002}; return {...value, geometryDigest: digest(value)}; };
const inputs = (role, sha256, bytes = 1) => ({role, path: '/synthetic/' + role, sha256, bytes});
const fingerprint = {algorithm: 'sha256', value: 'b'.repeat(64), files: [{path: 'synthetic.js', sha256: 'c'.repeat(64)}]};
const baseIdentity = {sha256: C.scene, sourceFingerprint: C.source, stateId: 'synthetic-kernel-only', geometryDigest: 'd'.repeat(64)};
const prepared = {
  started: Date.now(), sourceStart: fingerprint, checkerStart: fingerprint, interfaces, pairs,
  mandatoryRoutes: Array.from({length: 177}, (_, i) => record({id: 'synthetic-fixed-' + i, from: [0, 100 + i, 0], to: [4, 100 + i, 0], radiusM: .01})),
  pair0BaselineRoutes: interfaces.slice(0, 2).map(record),
  historicalRightAttempts: interfaces.slice(0, 2).map(row => ({id: row.id, ok: true, controlPoints: [row.from, row.to], points: [row.from, row.to]})),
  baseScene: {identity: baseIdentity, descriptor: {geometry: {physicalAndOperational: {}, finalTerminalRegistry: {}, proposalServiceEnvelopes: {}}}, physical: [], services: [], terminals: [], counts: {}},
  anchor: {pairIndex: 1, candidate: {routes: interfaces.slice(2, 4).map(row => ({id: row.id, controls: [row.from, row.to]}))}, candidateInput: inputs('anchor-candidate', C.anchor), receiptInput: inputs('anchor-receipt', C.anchorReceipt), checks: {constructedRoutes: interfaces.slice(2, 4).map(record)}},
  accepted: [], nextPairIndex: 0
};
assert.equal(continuationPairScene(prepared, 0).neighbors.length, 179);
const changedAnchor = clone(prepared); changedAnchor.anchor.candidateInput.sha256 = '0'.repeat(64);
reject(() => continuationPairScene(changedAnchor, 0), 'anchor-changed');
const changedReceipt = clone(prepared); changedReceipt.anchor.receiptInput.sha256 = '0'.repeat(64);
reject(() => continuationPairScene(changedReceipt, 0), 'anchor-changed');
const candidate0 = makeContinuationCandidate(prepared, 0, interfaces.slice(0, 2).map(row => ({id: row.id, controls: [row.from, row.to]})));
const baseline0 = auditContinuation(prepared, candidate0);
assert.equal(baseline0.checks.ok, true);
const moved0 = clone(candidate0); moved0.routes[0].controls.splice(1, 0, [2, .3, 0]);
reject(() => auditContinuation(prepared, moved0), 'immutable-route-controls');
const normalized0 = clone(prepared); normalized0.pair0BaselineRoutes = clone(prepared.pair0BaselineRoutes); normalized0.pair0BaselineRoutes[0].points[1][0] = 4 - Number.EPSILON * 2;
const normalizedResult = auditContinuation(normalized0, candidate0);
assert.equal(normalizedResult.checks.ok, true); assert.equal(normalizedResult.checks.retainedPathNormalization.routes[0].changedCoordinateCount, 1);
const displaced0 = clone(prepared); displaced0.pair0BaselineRoutes = clone(prepared.pair0BaselineRoutes); displaced0.pair0BaselineRoutes[0].points[1][0] -= 1e-5;
reject(() => auditContinuation(displaced0, candidate0), 'historical-construction-difference');
groups++;

const candidateInput = inputs('candidate', 'e'.repeat(64), 100);
const receipt = {
  schema: C.pairReceiptSchema, status: 'static-pair-accepted', phase: 'finished', completed: true, accepted: true,
  unchangedSource: true, unchangedChecker: true, unchangedInputs: true,
  sourceStart: clone(fingerprint), sourceFinish: clone(fingerprint), checkerStart: clone(fingerprint), checkerFinish: clone(fingerprint),
  inputs: [inputs('scene', C.scene), inputs('anchor-candidate', C.anchor), inputs('anchor-receipt', C.anchorReceipt), inputs('ledger', 'f'.repeat(64)), candidateInput],
  sceneIdentity: baseline0.scene.identity, sceneDescriptor: baseline0.scene.descriptor, checks: baseline0.checks
};
const verification = {schema: C.pairReceiptSchema, candidateInput, scene: baseline0.scene, currentSource: fingerprint, currentChecker: fingerprint, actualChecks: baseline0.checks};
checkRecordedAcceptance(receipt, verification);
for (const key of ['completed', 'accepted', 'unchangedSource', 'unchangedChecker', 'unchangedInputs']) {
  const changed = clone(receipt); changed[key] = false; reject(() => checkRecordedAcceptance(changed, verification), 'unaccepted-ledger-entry');
}
for (const key of ['status', 'phase']) { const changed = clone(receipt); changed[key] = 'incomplete'; reject(() => checkRecordedAcceptance(changed, verification), 'unaccepted-ledger-entry'); }
const staleSource = clone(receipt); staleSource.sourceStart.files[0].sha256 = '0'.repeat(64); reject(() => checkRecordedAcceptance(staleSource, verification), 'receipt-source');
const staleChecker = clone(receipt); staleChecker.checkerStart.files[0].sha256 = '0'.repeat(64); reject(() => checkRecordedAcceptance(staleChecker, verification), 'receipt-checker');
const missingInputs = clone(receipt); missingInputs.inputs = [candidateInput]; reject(() => checkRecordedAcceptance(missingInputs, verification), 'receipt-inputs');
const swappedCandidate = clone(receipt); swappedCandidate.inputs.find(row => row.role === 'candidate').sha256 = '0'.repeat(64); reject(() => checkRecordedAcceptance(swappedCandidate, verification), 'receipt-inputs');
const movedResult = clone(receipt); movedResult.checks.constructedRoutes[0].points[0][0] += .01; reject(() => checkRecordedAcceptance(movedResult, verification), 'receipt-reconstruction');
const changedPrefix = clone(receipt); changedPrefix.sceneDescriptor.acceptedPrefix.push({pairIndex: 2, candidateSha256: '0'.repeat(64), receiptSha256: '0'.repeat(64)}); reject(() => checkRecordedAcceptance(changedPrefix, verification), 'receipt-scene');
groups++;

reject(() => auditCompleteBank(prepared), 'bank-incomplete');
for (const index of [0, 2, 3, 4]) {
  prepared.nextPairIndex = index;
  const pair = pairs[index], candidate = makeContinuationCandidate(prepared, index, pair.interfaces.map(row => ({id: row.id, controls: [row.from, row.to]})));
  const audited = auditContinuation(prepared, candidate);
  assert.equal(audited.checks.ok, true);
  assert.equal(audited.scene.neighbors.length, index === 0 ? 179 : 177 + index * 2);
  if (index === 2) reject(() => checkRecordedAcceptance(receipt, {...verification, scene: audited.scene, actualChecks: audited.checks}), 'receipt-inputs');
  prepared.accepted.push({pairIndex: index, candidate, candidateInput: inputs('candidate', digest(candidate), 100), receiptInput: inputs('receipt', digest({index}), 100), checks: audited.checks});
}
prepared.nextPairIndex = null;
const complete = auditCompleteBank(prepared);
assert.equal(complete.ok, true); assert.equal(complete.completedPairs, 5); assert.equal(complete.inventory.completeRoutes, 187);
assert(complete.pairs.every(row => row.sceneDescriptor.immutableRoutes.count === 185));
assert.equal(complete.pairs[1].sourceCandidateSha256, C.anchor);
groups++;

const temporary = mkdtempSync(path.join(fileURLToPath(new URL('.', import.meta.url)), '.h07-continuation-contract-'));
try {
  const evidenceDirectory = path.join(temporary, 'docs/harnessing-work'); mkdirSync(evidenceDirectory, {recursive: true});
  const priorInput = path.join(evidenceDirectory, 'prior-ledger.json'), priorReceipt = path.join(temporary, 'prior-receipt.json'), ledgerFile = path.join(temporary, 'ledger.json'), candidateFile = path.join(temporary, 'candidate.json');
  writeFileSync(priorInput, JSON.stringify(ledger([])) + '\n');
  writeFileSync(priorReceipt, JSON.stringify({inputs: [{path: priorInput, repositoryPath: path.relative(fileURLToPath(new URL('.', import.meta.url)), priorInput)}]}));
  writeFileSync(candidateFile, '{"synthetic":true}\n');
  writeFileSync(ledgerFile, JSON.stringify({schema: C.ledgerSchema, entries: [{pairIndex: 0, candidate: 'candidate.json', receipt: 'prior-receipt.json'}]}));
  const options = {'--ledger': ledgerFile, '--candidate': candidateFile, '--output': priorInput};
  reject(() => safeContinuationOutput(options), 'output-input-alias');
  const linked = path.join(temporary, 'input-link.json'); symlinkSync(priorInput, linked);
  reject(() => safeContinuationOutput({...options, '--output': linked}), 'output-input-alias');
  const original = readFileSync(priorInput);
  const cli = spawnSync(process.execPath, [fileURLToPath(new URL('./orbital-right-bank-continuation-checks.mjs', import.meta.url)), '--ledger', ledgerFile, '--candidate', candidateFile, '--output', priorInput], {encoding: 'utf8'});
  assert.equal(cli.status, 1); assert(cli.stdout.includes('output-input-alias')); assert.deepEqual(readFileSync(priorInput), original);
  const safe = path.join(temporary, 'new-receipt.json'); assert.equal(safeContinuationOutput({...options, '--output': safe}), safe);
  writeFileSync(safe + '.tmp', '{"preservedTemporary":true}'); reject(() => safeContinuationOutput({...options, '--output': safe}), 'output-temp-exists'); rmSync(safe + '.tmp');
  writeFileSync(safe, '{"preserved":true}'); reject(() => safeContinuationOutput({...options, '--output': safe}), 'output-exists');
} finally { rmSync(temporary, {recursive: true, force: true}); }
groups++;

const relocation = mkdtempSync(path.join(tmpdir(), 'h07-continuation-relocation-'));
try {
  const beforeRoot = path.join(relocation, 'before'), afterRoot = path.join(relocation, 'after');
  const relative = 'docs/harnessing-work/H07-all-targets/ledger-empty.json';
  const beforeFile = path.join(beforeRoot, relative), afterFile = path.join(afterRoot, relative), bytes = Buffer.from(JSON.stringify(ledger([])) + '\n');
  mkdirSync(path.dirname(beforeFile), {recursive: true}); mkdirSync(path.dirname(afterFile), {recursive: true});
  writeFileSync(beforeFile, bytes); writeFileSync(afterFile, bytes);
  const recorded = {path: beforeFile, repositoryPath: relative, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length};
  rmSync(beforeRoot, {recursive: true});
  assert.equal(resolveRecordedContinuationInput(recorded, {root: afterRoot}), afterFile);
  assert.equal(verifyRecordedContinuationInput(recorded, {root: afterRoot}).sha256, recorded.sha256);
  const legacy = {...recorded}; delete legacy.repositoryPath; assert.equal(verifyRecordedContinuationInput(legacy, {root: afterRoot}).sha256, recorded.sha256);
  const relocatedPrepared = clone(prepared); relocatedPrepared.anchor.candidateInput.path = path.join(afterRoot, 'anchor.json'); relocatedPrepared.anchor.receiptInput.path = path.join(afterRoot, 'anchor-receipt.json');
  assert.deepEqual(continuationPairScene(relocatedPrepared, 0, {completeBank: true}).identity, continuationPairScene(prepared, 0, {completeBank: true}).identity);
  writeFileSync(afterFile, bytes.toString() + ' '); reject(() => verifyRecordedContinuationInput(recorded, {root: afterRoot}), 'receipt-input-changed');
  reject(() => resolveRecordedContinuationInput({...recorded, repositoryPath: '../outside.json'}, {root: afterRoot}), 'nonportable-input');
} finally { rmSync(relocation, {recursive: true, force: true}); }
groups++;

console.log(JSON.stringify({ok: true, contractGroups: groups, realH07ReadinessAssessed: false, basis: 'Synthetic provenance, immutable controls/canonical construction, strict ledger, five-pair completeness, non-destructive output and repository relocation contracts only.'}));
