// Finite synthetic provenance contracts. No H06 scene or geometry is loaded.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {H07_SOURCE_TRANSITION_SCHEMA, validTransitionFingerprint, sourceTransitionDelta,
  readSourceTransitionInput, validateFrozenGeometrySourceTransition} from './orbital-right-bank-source-transition.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2);
assert(args.length === 0 || args.length === 2 && args[0] === '--receipt' && args[1], 'Use [--receipt NEW.json].');
const output = args[1] ? path.resolve(root, args[1]) : null;
if (output) { assert(!fs.existsSync(output)); assert(output.startsWith(root)); }
const digest = value => createHash('sha256').update(Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const clone = structuredClone, rows = [], startedAt = new Date().toISOString();
const fingerprint = files => ({algorithm: 'sha256', value: digest(files), files});
const origin = fingerprint([{path: 'dist/geometry.js', sha256: digest('geometry')}, {path: 'dist/routing-audit.js', sha256: digest('old-audit')}]);
const current = fingerprint([{path: 'dist/geometry.js', sha256: digest('geometry')}, {path: 'dist/routing-audit.js', sha256: digest('new-audit')}]);
const scene = {repositoryPath: 'docs/synthetic-scene.json.gz', sha256: digest('frozen-scene'), bytes: 120};
const transition = {schema: H07_SOURCE_TRANSITION_SCHEMA, geometryInputOnly: true, acceptanceTransferred: false,
  requiresFreshH07AndH08: true, changePurpose: 'exact-immutable-obstacle-signature-reuse', frozenScene: scene,
  originalSource: origin, currentSource: current, sourceChanges: sourceTransitionDelta(origin, current), reviewedRuntimePaths: ['dist/routing-audit.js']};
const record = {repositoryPath: 'docs/synthetic-transition.json', sha256: digest('declaration'), bytes: 200};
const expected = {originSource: origin, currentSource: current, sceneSha256: scene.sha256, sceneBytes: scene.bytes, record};
const reject = (action, code) => assert.throws(action, error => !code || error.code === code);
function test(name, run) { try { const evidence = run(); rows.push({name, passed: true, evidence: evidence ?? null}); } catch (error) { rows.push({name, passed: false, error: {name: error.name, code: error.code ?? null, message: error.message, stack: error.stack}}); } }

test('exact-source-epochs-are-geometry-provenance-with-no-acceptance-transfer', () => {
  const provenance = validateFrozenGeometrySourceTransition(transition, expected);
  assert.equal(provenance.originSourceFingerprint, origin.value); assert.equal(provenance.currentSourceFingerprint, current.value);
  assert.equal(provenance.originSceneSha256, scene.sha256); assert.equal(provenance.acceptanceTransferred, false);
  assert.deepEqual(provenance.declaration, record); return provenance;
});
test('complete-manifests-reject-corrupt-digests-duplicates-order-and-escape', () => {
  for (const mutate of [f => f.value = digest('wrong'), f => f.files.push(clone(f.files[0])), f => f.files.reverse(), f => f.files[0].path = '../outside.js']) {
    const f = clone(origin); mutate(f); assert.equal(validTransitionFingerprint(f), false);
    reject(() => sourceTransitionDelta(f, current), 'transition-source-manifest');
  }
});
test('actual-current-native-manifest-cannot-be-replaced-by-a-declaration', () => {
  const different = fingerprint([{path: 'dist/geometry.js', sha256: digest('changed-geometry')}, ...current.files.slice(1)]);
  reject(() => validateFrozenGeometrySourceTransition(transition, {...expected, currentSource: different}), 'transition-source-manifest');
  const wrongOrigin = clone(transition); wrongOrigin.originalSource = current;
  reject(() => validateFrozenGeometrySourceTransition(wrongOrigin, expected), 'transition-source-manifest');
});
test('delta-must-enumerate-exactly-every-change', () => {
  for (const mutate of [t => t.sourceChanges = [], t => t.sourceChanges.push(clone(t.sourceChanges[0])), t => t.sourceChanges[0].before = digest('other'), t => t.sourceChanges[0].after = digest('other')]) {
    const t = clone(transition); mutate(t); reject(() => validateFrozenGeometrySourceTransition(t, expected), 'transition-delta');
  }
});
test('declarations-cannot-admit-unreviewed-added-removed-or-other-runtime-files', () => {
  for (const files of [
    [...current.files, {path: 'dist/unreviewed.js', sha256: digest('new')}],
    current.files.filter(row => row.path !== 'dist/geometry.js'),
    [{path: 'dist/geometry.js', sha256: digest('changed')}, ...current.files.slice(1)],
  ]) {
    const f = fingerprint(files), t = {...clone(transition), currentSource: f, sourceChanges: sourceTransitionDelta(origin, f)};
    t.reviewedRuntimePaths = t.sourceChanges.map(row => row.path);
    reject(() => validateFrozenGeometrySourceTransition(t, {...expected, currentSource: f}), 'transition-runtime-shape');
  }
  const missing = clone(transition); missing.reviewedRuntimePaths = [];
  reject(() => validateFrozenGeometrySourceTransition(missing, expected), 'transition-unreviewed-source');
});
test('scene-identity-includes-compressed-byte-count-and-hash', () => {
  reject(() => validateFrozenGeometrySourceTransition(transition, {...expected, sceneSha256: digest('changed')}), 'transition-scene');
  reject(() => validateFrozenGeometrySourceTransition(transition, {...expected, sceneBytes: scene.bytes + 1}), 'transition-scene');
  const t = clone(transition); t.frozenScene.repositoryPath = '../outside';
  reject(() => validateFrozenGeometrySourceTransition(t, expected), 'transition-scene');
});
test('acceptance-transfer-and-broadened-purpose-are-rejected', () => {
  for (const mutate of [t => t.acceptanceTransferred = true, t => t.requiresFreshH07AndH08 = false, t => t.geometryInputOnly = false]) {
    const t = clone(transition); mutate(t); reject(() => validateFrozenGeometrySourceTransition(t, expected), 'transition-scope');
  }
  const t = clone(transition); t.changePurpose = 'arbitrary-runtime-repair';
  reject(() => validateFrozenGeometrySourceTransition(t, expected), 'transition-purpose');
});
test('source-transition-needs-an-exact-captured-input-record', () => {
  for (const invalid of [null, {...record, sha256: 'bad'}, {...record, bytes: -1}, {...record, repositoryPath: '/outside'}]) {
    reject(() => validateFrozenGeometrySourceTransition(transition, {...expected, record: invalid}), 'transition-record');
  }
});
test('file-reader-rejects-changed-bytes-symlinks-and-path-escape', () => {
  const directory = fs.mkdtempSync(path.join(root, '.p7-source-transition-contract-'));
  try {
    const file = path.join(directory, 'transition.json'), bytes = Buffer.from(JSON.stringify(transition)); fs.writeFileSync(file, bytes);
    const read = readSourceTransitionInput(file, {root, expectedSha256: digest(bytes)});
    assert.deepEqual(read.value, transition); assert.equal(read.record.bytes, bytes.length);
    reject(() => readSourceTransitionInput(file, {root, expectedSha256: digest('other')}), 'transition-input-changed');
    const alias = path.join(directory, 'alias.json'); fs.symlinkSync(file, alias);
    reject(() => readSourceTransitionInput(alias, {root, expectedSha256: digest(bytes)}), 'transition-input');
    reject(() => readSourceTransitionInput(file, {root: directory + '/nested', expectedSha256: digest(bytes)}), 'transition-input');
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});
const passed = rows.every(row => row.passed);
const receipt = {schema: 'orbital-data-center/H07-source-transition-contract-receipt/1', startedAt, finishedAt: new Date().toISOString(),
  completed: true, passed, total: rows.length, passedGroups: rows.filter(row => row.passed).length, failedGroups: rows.filter(row => !row.passed).length,
  actualGeometryLoaded: false, actualH07Accepted: false, actualH08Accepted: false, results: rows};
if (output) fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(receipt)); process.exitCode = passed ? 0 : 1;
