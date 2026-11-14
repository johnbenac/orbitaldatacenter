// An explicit source epoch change permits immutable H06 geometry to be read.
// It transfers no engineering acceptance: every H07/H08 predicate is re-audited.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const H07_SOURCE_TRANSITION_SCHEMA = 'orbital-data-center/H07-frozen-geometry-source-transition/1';
const digest = value => createHash('sha256').update(Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hash = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const relative = value => typeof value === 'string' && value.length > 0 && !path.isAbsolute(value) && !value.split(/[\\/]/).includes('..') && !value.includes('\\');
function requireValue(test, code, message) {
  if (!test) { const error = new Error(message); error.name = 'SourceTransitionError'; error.code = code; throw error; }
}

export function validTransitionFingerprint(value) {
  return value?.algorithm === 'sha256' && hash(value.value) && Array.isArray(value.files) && value.files.length > 0 &&
    value.files.every(row => row && equal(Object.keys(row).sort(), ['path', 'sha256']) && relative(row.path) && hash(row.sha256)) &&
    equal(value.files.map(row => row.path), [...new Set(value.files.map(row => row.path))].sort()) && digest(value.files) === value.value;
}

export function sourceTransitionDelta(originalSource, currentSource) {
  requireValue(validTransitionFingerprint(originalSource) && validTransitionFingerprint(currentSource), 'transition-source-manifest', 'Both source epochs need complete, ordered, digest-consistent manifests.');
  const before = new Map(originalSource.files.map(row => [row.path, row.sha256]));
  const after = new Map(currentSource.files.map(row => [row.path, row.sha256]));
  return [...new Set([...before.keys(), ...after.keys()])].sort().filter(file => before.get(file) !== after.get(file))
    .map(file => ({path: file, before: before.get(file) ?? null, after: after.get(file) ?? null}));
}

export function readSourceTransitionInput(filename, {root, expectedSha256} = {}) {
  requireValue(typeof filename === 'string' && filename && hash(expectedSha256) && typeof root === 'string', 'transition-input', 'A source transition requires an explicit repository file and exact expected SHA256.');
  const resolved = path.resolve(root, filename), repositoryPath = path.relative(root, resolved).split(path.sep).join('/');
  requireValue(relative(repositoryPath) && fs.statSync(resolved).isFile() && fs.realpathSync(resolved) === resolved, 'transition-input', 'The transition must be a regular repository file without symlink aliases.');
  const bytes = fs.readFileSync(resolved), sha256 = digest(bytes);
  requireValue(sha256 === expectedSha256, 'transition-input-changed', 'The declared source-transition bytes changed.');
  return {value: JSON.parse(bytes.toString('utf8')), record: {path: resolved, repositoryPath, sha256, bytes: bytes.length}};
}

/** Validate a declaration, never an assertion that historical acceptance survived. */
export function validateFrozenGeometrySourceTransition(transition, {originSource, currentSource, sceneSha256, sceneBytes, record} = {}) {
  requireValue(transition?.schema === H07_SOURCE_TRANSITION_SCHEMA && transition.geometryInputOnly === true && transition.acceptanceTransferred === false && transition.requiresFreshH07AndH08 === true,
    'transition-scope', 'The transition may authorize frozen geometry input only and must require fresh H07/H08 acceptance.');
  requireValue(validTransitionFingerprint(originSource) && validTransitionFingerprint(currentSource) &&
    equal(transition.originalSource, originSource) && equal(transition.currentSource, currentSource),
    'transition-source-manifest', 'The declaration must bind the exact original H06 and actual current runtime manifests.');
  requireValue(hash(sceneSha256) && Number.isSafeInteger(sceneBytes) && sceneBytes > 0 &&
    transition.frozenScene?.sha256 === sceneSha256 && transition.frozenScene.bytes === sceneBytes &&
    relative(transition.frozenScene.repositoryPath), 'transition-scene', 'The declaration must bind the complete unchanged compressed H06 input.');
  requireValue(record && relative(record.repositoryPath) && hash(record.sha256) && Number.isSafeInteger(record.bytes) && record.bytes > 0,
    'transition-record', 'The source declaration needs its captured exact input record.');
  const delta = sourceTransitionDelta(originSource, currentSource);
  requireValue(delta.length > 0 && equal(transition.sourceChanges, delta), 'transition-delta', 'Every changed, added or removed runtime source must exactly match the declared source delta.');
  requireValue(Array.isArray(transition.reviewedRuntimePaths) && equal(transition.reviewedRuntimePaths, delta.map(row => row.path)),
    'transition-unreviewed-source', 'The source change includes a path outside the explicit reviewed set.');
  requireValue(transition.changePurpose === 'exact-immutable-obstacle-signature-reuse', 'transition-purpose', 'This transition is restricted to the reviewed signature-reuse integration.');
  requireValue(delta.length === 1 && delta[0].path === 'dist/routing-audit.js' && hash(delta[0].before) && hash(delta[0].after),
    'transition-runtime-shape', 'This reviewed source epoch permits only the exact routing-audit replacement; added, removed or other runtime source changes need a separately reviewed transition.');
  return sourceTransitionProvenance(transition, record);
}

export function sourceTransitionProvenance(transition, record) {
  return {
    schema: 'orbital-data-center/H07-frozen-geometry-source-provenance/1',
    originSceneSha256: transition.frozenScene.sha256,
    originSourceFingerprint: transition.originalSource.value,
    currentSourceFingerprint: transition.currentSource.value,
    declaration: {repositoryPath: record.repositoryPath, sha256: record.sha256, bytes: record.bytes},
    acceptanceTransferred: false,
    basis: 'Immutable historical geometry input; current-source H07 and H08 checks must issue fresh acceptance receipts.'
  };
}
