// Small rejection/construction contracts. Synthetic geometry here exercises the
// checker kernel; it is never represented as a real H06/H07 readiness result.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {roundedConnectionRoute} from './dist/connection-routes.js';
import {extractFrozenScene, validateManifest, validateCandidate, staticLengthAccounting, auditStaticPair, readSceneFile} from './orbital-right-bank-pair-checks.mjs';

const clone = value => structuredClone(value);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const reject = (action, code) => assert.throws(action, error => error.code === code);
const box = (id, min, max, lineId) => ({id, type: 'box', min, max, bounds: {min, max}, ...(lineId ? {lineId} : {})});
const pairIds = ['P-SA-2/1', 'P-SA-2/0'];
const identity = {sha256: 'a'.repeat(64), sourceFingerprint: 'b'.repeat(64), stateId: 'synthetic-kernel-only', geometryDigest: 'c'.repeat(64)};
const scene = {
  identity, pairIds, descriptor: {terminationAllowancesM: Object.fromEntries(pairIds.map(id => [id, .3]))},
  pair: pairIds.map((id, i) => ({id, from: [0, i, 0], to: [4, i, 0], fromNormal: [1, 0, 0], toNormal: [-1, 0, 0], radiusM: .01, bendRadiusM: .1})),
  physical: [box('physical', [2, 3, -.2], [3, 3.2, .2])],
  services: [box('service', [2, 4, -.2], [3, 4.2, .2])],
  terminals: pairIds.flatMap((id, i) => [box(id + ':from', [-.02, i - .02, -.02], [.02, i + .02, .02], id), box(id + ':to', [3.98, i - .02, -.02], [4.02, i + .02, .02], id)]),
  neighbors: [{id: 'native-neighbor', points: [[0, 2, 0], [4, 2, 0]], radiusM: .02, clearanceM: 0}]
};
const candidate = {schema: 'orbital-data-center/H07-static-pair-candidate/1', scene: clone(identity), routes: scene.pair.map(row => ({id: row.id, controls: [row.from, row.to]}))};
let groups = 0;

// Neither missing mates nor malformed/overriding records reach the rounder.
for (const mutate of [c => c.routes.pop(), c => c.routes[1].id = c.routes[0].id, c => c.routes[1].id = 'P-SA-2/3']) {
  const changed = clone(candidate); mutate(changed); reject(() => validateCandidate(changed, scene), 'candidate-pair');
}
for (const controls of [null, [], [[0, 0, 0]], [[0, 0], [4, 0, 0]], [[0, 0, 0], [NaN, 0, 0]], [[0, 0, 0], [Infinity, 0, 0]], [[0, 0, 0], [0, 0, 0], [4, 0, 0]], [[0, 0, 0], [1e-9, 0, 0], [4, 0, 0]], [[0, 0, 0], [2, 0, 0], [0, 0, 0], [4, 0, 0]]]) {
  const changed = clone(candidate); changed.routes[0].controls = controls; reject(() => validateCandidate(changed, scene), 'candidate-controls');
}
const override = clone(candidate); override.routes[0].radiusM = 0; reject(() => validateCandidate(override, scene), 'candidate-schema');
for (const field of ['sha256', 'sourceFingerprint', 'stateId', 'geometryDigest']) {
  const changed = clone(candidate); changed.scene[field] = 'changed'; reject(() => validateCandidate(changed, scene), 'candidate-scene-mismatch');
}
groups++;

// Whole-category manifests catch omissions and edits even outside a local box.
const manifestRows = [box('near', [0, 0, 0], [1, 1, 1]), box('distant', [100, 100, 100], [101, 101, 101])];
const manifest = {ids: manifestRows.map(r => r.id), count: manifestRows.length, geometryDigest: digest(manifestRows)};
validateManifest(manifest, manifestRows, 'test inventory');
reject(() => validateManifest(manifest, manifestRows.slice(0, 1), 'test inventory'), 'scene-manifest');
const moved = clone(manifestRows); moved[1].max[0] += .1; reject(() => validateManifest(manifest, moved, 'test inventory'), 'scene-manifest');
groups++;

// The real archived blocked report cannot be promoted to H07. Source and pose
// corruption are rejected before geometry audit; no synthetic scene is accepted.
const old = readSceneFile(new URL('./docs/harnessing-work/H06-right-bank-evidence.json.gz', import.meta.url));
const extraction = {sceneSha256: old.sha256, expectedSource: old.report.sourceStart.value, currentSource: old.report.sourceStart};
reject(() => extractFrozenScene(old.report, extraction), 'incomplete-h06');
reject(() => extractFrozenScene(old.report, {...extraction, expectedSource: '0'.repeat(64)}), 'source-mismatch');
const wrongPose = clone(old.report); wrongPose.status = 'diagnosis-recorded'; wrongPose.diagnosisComplete = true; wrongPose.boundedExecutionComplete = true; wrongPose.reproductionStates[0].deploymentProgress = .5;
reject(() => extractFrozenScene(wrongPose, extraction), 'scene-state');
groups++;

// Independent quarter-circle calculation distinguishes analytical fillet length
// from the 8-chord rendering; no arbitrary old cut/rest allocation is imposed.
const fillet = roundedConnectionRoute([[0, 0, 0], [2, 0, 0], [2, 2, 0]], .2, 8);
const length = staticLengthAccounting(fillet, .3), analytic = 4 - 2 * .2 + Math.PI * .2 / 2;
assert(Math.abs(length.analyticalDevelopedLengthM - analytic) < 1e-12);
assert(length.chordDeficitM > 0 && length.proposedDevelopedCutLengthM > length.modelCutLengthM);
assert.equal(length.proposedDevelopedCutLengthM, analytic + .3);
assert.equal(length.conservationAssessed, false);
reject(() => staticLengthAccounting({...fillet, developedLengthM: fillet.lengthM - .1}, .3), 'length-accounting');
reject(() => staticLengthAccounting({...fillet, lengthM: fillet.lengthM + .01}, .3), 'length-accounting');
reject(() => staticLengthAccounting(fillet, -1), 'length-accounting');
groups++;

// Nonempty kernel fixture: own terminals are excluded per route, while other
// terminals, every physical/service solid and immutable route remain active.
const baseline = auditStaticPair(scene, candidate); assert.equal(baseline.ok, true);
for (const category of ['physical', 'services', 'terminals']) {
  const changed = clone(scene); changed[category].push(box('foreign-' + category, [1.9, -.02, -.02], [2.1, .02, .02], category === 'terminals' ? 'foreign-route' : undefined));
  const result = auditStaticPair(changed, candidate); assert.equal(result.ok, false); assert.equal(result.neighboringClearance[0].obstacleId, 'foreign-' + category);
}
const occupied = clone(scene); occupied.neighbors[0].points = [[2, -.5, 0], [2, .5, 0]];
assert.equal(auditStaticPair(occupied, candidate).neighboringClearance[0].otherRouteId, 'native-neighbor');
groups++;

const endpoint = clone(candidate); endpoint.routes[0].controls[0][0] = .01;
assert(auditStaticPair(scene, endpoint).pairAudit.issues.some(i => i.code === 'connector-gap'));
const tangent = clone(candidate); tangent.routes[0].controls = [[0, 0, 0], [1, 1, 0], [3, 1, 0], [4, 0, 0]];
assert(auditStaticPair(scene, tangent).pairAudit.issues.some(i => i.code === 'connector-tangent'));
const tight = clone(candidate); tight.routes[0].controls = [[0, 0, 0], [.02, 0, 0], [.02, .02, 0], [3, .02, 0], [4, 0, 0]];
assert(auditStaticPair(scene, tight).constructionIssues.some(i => i.code === 'bend-limited-construction'));
const crossing = clone(candidate); crossing.routes[1].controls = [[0, 1, 0], [1, 1, 0], [1, -1, 0], [3, -1, 0], [3, 1, 0], [4, 1, 0]];
assert(auditStaticPair(scene, crossing).pairAudit.issues.some(i => i.code === 'line-collision'));
const self = clone(candidate); self.routes[0].controls = [[0, 0, 0], [3, 0, 0], [3, 2, 0], [1, 2, 0], [1, -1, 0], [3.5, -1, 0], [3.5, 0, 0], [4, 0, 0]];
assert(auditStaticPair(scene, self).pairAudit.issues.some(i => i.code === 'self-collision'));
groups++;

console.log(JSON.stringify({ok: true, contractGroups: groups, realH07ReadinessAssessed: false, basis: 'Strict frozen-input, malformed-candidate, geometry retention, static construction and analytical length contracts only. A complete current H06 failure and its actual rejected candidate remain a separate required regression.'}));
