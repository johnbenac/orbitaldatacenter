import assert from 'node:assert/strict';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

// Portable H08-P1 capability contracts. The original eight independent probes
// are retained below. All fixtures are synthetic and explicitly constructed;
// this file performs no allocator search and loads no actual vehicle scene.
// Usage: node orbital-withdrawal-rectangle-contract-checks.mjs [--receipt FILE]
const CONTRACT = fileURLToPath(import.meta.url);
const MODULE = fileURLToPath(new URL('./orbital-withdrawal-rectangle.mjs', import.meta.url));
const KERNEL = fileURLToPath(new URL('./dist/routing-audit.js', import.meta.url));
const RESERVOIR = fileURLToPath(new URL('./dist/electrical-service-loops.js', import.meta.url));
const args = process.argv.slice(2);
if (args.length && !(args.length === 2 && args[0] === '--receipt' && args[1])) {
  console.error('Usage: node orbital-withdrawal-rectangle-contract-checks.mjs [--receipt FILE]');
  process.exit(2);
}
const RECEIPT = args.length ? resolve(args[1]) : null;
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const json = value => JSON.stringify(value, (_key, v) => typeof v === 'number' && !Number.isFinite(v) ? String(v) : v, 2);
const before = {module: digest(MODULE), contract: digest(CONTRACT), routingAudit: digest(KERNEL), reservoirConstruction: digest(RESERVOIR)};
const startedAt = new Date().toISOString();
const results = [];
console.log(json({kind: 'H08-P1-contract-checks-start', startedAt, source: MODULE, before}));

const {
  createWithdrawalAffineProof,
  sampleWithdrawalAffineProof,
  checkWithdrawalAffineSamples,
  certifyWithdrawalRectangle,
  validateWithdrawalRectangleCoverage,
} = await import('./orbital-withdrawal-rectangle.mjs');
const {auditRoutes} = await import('./dist/routing-audit.js');
const {sampleMatingReservoir, matingReservoirSweptObstacles} = await import('./dist/electrical-service-loops.js');

const DOMAIN = {from: [0, 1], to: [0, 1]};
const ROUTE_ID = 'independent-xy-route';
const RADIUS = 0.005;
const CLEARANCE = 0.005;
const box = (id, min, max, extra = {}) => ({id, type: 'box', min, max, bounds: {min: [...min], max: [...max]}, ...extra});
function fixture(obstacles) {
  const baseline = {
    routes: [{id: ROUTE_ID, points: [[0, 0, -0.1], [0, 0, 0.1]], radiusM: RADIUS, clearanceM: CLEARANCE}],
    obstacles: structuredClone(obstacles),
  };
  return {
    domain: structuredClone(DOMAIN),
    baseline,
    participantManifest: {
      routeIds: [ROUTE_ID], obstacleIds: obstacles.map(o => o.id),
      physicalObstacleIds: obstacles.map(o => o.id), serviceObstacleIds: [], terminalObstacleIds: [],
      movingRouteIds: [ROUTE_ID], movingObstacleIds: [],
    },
    ownedRouteIds: [ROUTE_ID],
    routeMotions: [{id: ROUTE_ID, kind: 'rigid-translation', fromCoefficient: [1, 0, 0], toCoefficient: [0, 1, 0]}],
    obstacleMotions: obstacles.map(o => ({id: o.id, kind: 'stationary'})),
  };
}
function independentPose(input, f, t) {
  return {
    routes: input.baseline.routes.map(route => ({...route, points: route.points.map(p => [p[0] + f, p[1] + t, p[2]])})),
    obstacles: input.baseline.obstacles,
  };
}
function auditPose(snapshot) {
  return auditRoutes(snapshot.routes, snapshot.obstacles, {
    selfCollision: true, interlineCollision: true, maxIssues: 16,
    expectedRouteIds: snapshot.routes.map(r => r.id), expectedObstacleIds: snapshot.obstacles.map(o => o.id),
  });
}
function auditedAt(input, f, t) {
  const a = auditPose(independentPose(input, f, t));
  return {parameters: [f, t], ok: a.ok, issues: a.issues, minimumClearanceM: a.minimumClearanceM};
}
function assertSolidCollision(audit, obstacleId) {
  assert.equal(audit.ok, false, 'The independently constructed witness must collide.');
  assert(audit.issues.some(i => i.code === 'solid-collision' && i.obstacleId === obstacleId), 'The witness needs an actual solid-collision issue.');
}
function assertRejectedCollision(result, obstacleId) {
  assert.equal(result.accepted, false);
  assert.equal(result.coverageComplete, false);
  assert.equal(result.completed, true, 'A witnessed collision must be a completed rejection, not a budget stop.');
  assert(result.issues.some(i => i.code === 'solid-collision' && i.obstacleId === obstacleId));
}
function runCase(name, body) {
  try {
    const detail = body();
    const result = {name, pass: true, detail};
    results.push(result);
    console.log(json(result));
  } catch (error) {
    const result = {name, pass: false, error: {name: error.name, code: error.code, message: error.message, stack: error.stack, details: error.details, actual: error.actual, expected: error.expected, evidence: error.evidence}};
    results.push(result);
    console.log(json(result));
  }
}

runCase('clear-full-rectangle-positive-control', () => {
  const input = fixture([box('far-clear-box', [3.9, 3.9, -0.1], [4.1, 4.1, 0.1])]);
  const separationLowerBoundM = Math.hypot(3.9 - 1, 3.9 - 1) - RADIUS - CLEARANCE;
  assert(separationLowerBoundM > 4);
  const proof = createWithdrawalAffineProof(input);
  const result = certifyWithdrawalRectangle({proof, maxCells: 64, maxSamples: 256, maxDepth: 12, maxElapsedMs: 20000});
  assert.equal(result.accepted, true, 'An obvious clear analytical rectangle must pass.');
  assert.equal(result.completed, true);
  assert.equal(result.coverageComplete, true);
  assert.equal(result.coverage.completeCertifiedCoverage, true);
  assert.equal(result.unresolvedCells, 0);
  assert.equal(result.issues.length, 0);
  return {separationArgument: 'For all f,t in [0,1], each XY gap to the box is at least 2.9 m.', separationLowerBoundM, result};
});

runCase('interior-only-two-independent-xy-parameters', () => {
  const obstacle = box('off-center-interior-box', [0.23, 0.23, -0.02], [0.27, 0.27, 0.02]);
  const input = fixture([obstacle]);
  // Every boundary pose has x or y equal to 0 or 1. The nearest possible
  // separation in that coordinate is 0.23 m, independently of the other one.
  const allBoundarySeparationLowerBoundM = 0.23 - RADIUS - CLEARANCE;
  assert(allBoundarySeparationLowerBoundM > 0);
  const initialDiagnosticPositions = [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5]];
  const initialAudits = initialDiagnosticPositions.map(([f, t]) => auditedAt(input, f, t));
  assert(initialAudits.every(a => a.ok), 'All four initial corners and the initial center must be clear.');
  const witness = auditedAt(input, 0.25, 0.25);
  assertSolidCollision(witness, obstacle.id);
  const proof = createWithdrawalAffineProof(input);
  const result = certifyWithdrawalRectangle({proof, maxCells: 64, maxSamples: 256, maxDepth: 12, maxElapsedMs: 20000});
  assertRejectedCollision(result, obstacle.id);
  const hits = result.issues.filter(i => i.code === 'solid-collision');
  assert(hits.every(i => i.fromWithdrawalM > 0 && i.fromWithdrawalM < 1 && i.toWithdrawalM > 0 && i.toWithdrawalM < 1));
  assert(result.evaluatedCells > 1, 'This fixture must require more than the first diagnostic cell.');
  return {allBoundarySeparationLowerBoundM, initialAudits, independentInteriorWitness: witness, result};
});

runCase('actual-colliding-solid-with-forged-far-bounds-rejects-creation', () => {
  const capsule = {
    id: 'forged-bounds-capsule', type: 'capsule', a: [0.45, 0.5, 0], b: [0.55, 0.5, 0], radiusM: 0.025,
    bounds: {min: [100, 100, 100], max: [101, 101, 101]},
  };
  const honestCapsule = {...capsule, bounds: {min: [0.425, 0.475, -0.025], max: [0.575, 0.525, 0.025]}};
  const witness = auditedAt(fixture([honestCapsule]), 0.5, 0.5);
  assertSolidCollision(witness, capsule.id);
  let rejection = null;
  try { createWithdrawalAffineProof(fixture([capsule])); }
  catch (error) { rejection = {code: error.code, message: error.message, details: error.details}; }
  assert(rejection, 'A non-enclosing broad-phase bound must fail before creation returns a proof.');
  assert.equal(rejection.code, 'nonconservative-solid-bounds');
  return {independentActualGeometryWitness: witness, forgedBounds: capsule.bounds, rejection};
});

runCase('physical-same-owner-obstacle-remains-collision-participant', () => {
  const obstacle = box('same-owner-physical-box', [0.48, 0.48, -0.02], [0.52, 0.52, 0.02], {lineId: ROUTE_ID, category: 'physical'});
  const input = fixture([obstacle]);
  const witness = auditedAt(input, 0.5, 0.5);
  assertSolidCollision(witness, obstacle.id);
  const proof = createWithdrawalAffineProof(input);
  const result = certifyWithdrawalRectangle({proof, maxCells: 64, maxSamples: 256, maxDepth: 12, maxElapsedMs: 20000});
  assertRejectedCollision(result, obstacle.id);
  assert.equal(result.inventory.physical, 1);
  assert.equal(result.inventory.terminals, 0);
  assert(result.cells.flatMap(c => c.ownedResults || []).every(r => !r.excludedOwnTerminalIds.includes(obstacle.id)));
  return {independentCollisionWitness: witness, result};
});

runCase('nonlinear-callback-matches-diagnostics-but-cannot-obtain-continuous-acceptance', () => {
  const input = fixture([box('nonlinear-hidden-collision-box', [3.9, 3.9, -0.1], [4.1, 4.1, 0.1])]);
  const proof = createWithdrawalAffineProof(input);
  const queries = [];
  const bump = (f, t) => f * (1 - f) * t * (1 - t) * ((f - 0.5) ** 2 + (t - 0.5) ** 2);
  const peak = bump(0.25, 0.25);
  const nonlinear = ({fromWithdrawalM: f, toWithdrawalM: t}) => {
    queries.push([f, t]);
    const snapshot = structuredClone(sampleWithdrawalAffineProof(proof, {fromWithdrawalM: f, toWithdrawalM: t}));
    const shift = 3.75 * bump(f, t) / peak;
    snapshot.routes[0].points = snapshot.routes[0].points.map(p => [p[0] + shift, p[1] + shift, p[2]]);
    return snapshot;
  };
  const diagnostic = checkWithdrawalAffineSamples({proof, sample: nonlinear});
  const diagnosticQueries = structuredClone(queries);
  assert.equal(diagnostic.matched, true);
  assert.equal(diagnostic.checkedSamples, 5);
  assert.equal(diagnostic.accepted, false);
  assert.equal(diagnostic.continuousCoverageAssessed, false);
  assert.equal(diagnostic.issues.length, 0);
  const hiddenPose = nonlinear({fromWithdrawalM: 0.25, toWithdrawalM: 0.25});
  const hiddenAudit = auditPose(hiddenPose);
  assertSolidCollision(hiddenAudit, 'nonlinear-hidden-collision-box');
  let externalCallsDuringCertification = 0;
  const result = certifyWithdrawalRectangle({proof, sample: parameters => { externalCallsDuringCertification++; return nonlinear(parameters); }, maxCells: 64, maxSamples: 256, maxDepth: 12, maxElapsedMs: 20000});
  assert.equal(result.accepted, false);
  assert.equal(result.coverageComplete, false);
  assert.equal(result.externalSamplerCertified, false);
  assert(result.issues.some(i => i.code === 'external-sampler-not-certifiable'));
  assert.equal(externalCallsDuringCertification, 0);
  return {polynomial: 'f(1-f)t(1-t)((f-0.5)^2+(t-0.5)^2), scaled to translate XY by 3.75 m at (0.25,0.25)', diagnosticQueries, diagnostic, hiddenWitness: {parameters: [0.25, 0.25], routePoints: hiddenPose.routes[0].points, ok: hiddenAudit.ok, issues: hiddenAudit.issues}, externalCallsDuringCertification, result};
});

for (const [name, budgets, expectedCode] of [
  ['cell', {maxCells: 1, maxSamples: 128, maxDepth: 12}, 'rectangle-cell-budget'],
  ['sample', {maxCells: 128, maxSamples: 5, maxDepth: 12}, 'rectangle-sample-budget'],
  ['depth', {maxCells: 128, maxSamples: 128, maxDepth: 0}, 'unresolved-withdrawal-cell'],
]) {
  runCase(`finite-${name}-budget-exhaustion-never-passes-clear-observations`, () => {
    const input = fixture([box('near-but-z-separated-box', [0.23, 0.23, 0.15], [0.27, 0.27, 0.19])]);
    // Independent full-domain proof: all route points remain in z <= 0.1 and
    // the entire physical box remains in z >= 0.15, for both parameters.
    const globalSeparationLowerBoundM = 0.15 - 0.1 - RADIUS - CLEARANCE;
    assert(globalSeparationLowerBoundM > 0.039);
    const rootAudits = [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5]].map(([f, t]) => auditedAt(input, f, t));
    assert(rootAudits.every(a => a.ok));
    const proof = createWithdrawalAffineProof(input);
    const result = certifyWithdrawalRectangle({proof, ...budgets, maxElapsedMs: 20000});
    assert.equal(result.accepted, false);
    assert.equal(result.coverageComplete, false);
    assert.equal(result.completed, false);
    assert.equal(result.status, 'withdrawal-rectangle-incomplete');
    assert.equal(result.samples, 5, 'Each budget fixture should stop after the five clear root observations.');
    assert(result.unresolvedCells > 0);
    assert.equal(result.rejectedCells, 0);
    assert(result.issues.some(i => i.code === expectedCode));
    assert(!result.issues.some(i => /collision/.test(i.code)));
    return {globalSeparationLowerBoundM, rootAudits, result};
  });
}

// ADDITIONAL_CAPABILITY_CONTRACTS

const FULL_BUDGET = {maxCells: 256, maxSamples: 1024, maxDepth: 16, maxElapsedMs: 20000};
const rigid = id => ({id, kind: 'rigid-translation', fromCoefficient: [1, 0, 0], toCoefficient: [0, 1, 0]});
const vectorDistance = (a, b) => Math.hypot(...a.map((x, k) => x - b[k]));
const measuredLength = points => points.slice(1).reduce((sum, p, i) => sum + vectorDistance(p, points[i]), 0);
function expectCreationRejection(input, expectedCode) {
  let rejection;
  try { createWithdrawalAffineProof(input); }
  catch (error) { rejection = {code: error.code, message: error.message, details: error.details}; }
  assert(rejection, 'An invalid construction must not yield an opaque proof.');
  if (expectedCode) assert.equal(rejection.code, expectedCode);
  return rejection;
}
function reservoirFixture({fromTravelM = 0.04, toTravelM = 0.03} = {}) {
  // A declared U-loop, not an allocator proposal or route search. The middle
  // shifts by (f+t)/2; the two straight leads change by (t-f)/2 and (f-t)/2.
  // Therefore the complete developed length is constant for independent f,t.
  const allocation = {
    controls: [[0, 0, 0], [0, 0, 0.6], [0.6, 0, 0.6], [0.6, 0, 0]],
    first: 1, last: 2, axis: [0, 0, 1], bendRadiusM: 0.05,
    fromNormal: [0, 0, 1], toNormal: [0, 0, 1],
    fromTravelM, toTravelM, fromPrefixLast: 0, toSuffixFirst: 3,
  };
  const shape = sampleMatingReservoir(allocation);
  const id = 'two-independent-plugs-reservoir';
  return {
    domain: {from: [0, fromTravelM], to: [0, toTravelM]},
    baseline: {routes: [{
      id, points: shape.points, radiusM: 0.005, clearanceM: 0.002,
      minBendRadiusM: allocation.bendRadiusM, minimumBendRadiusM: shape.minimumBendRadiusM,
      bendRadiusBasis: 'constructed-circular-fillets', renderedCenterlineMismatchM: 0,
      restLengthM: shape.lengthM, lengthToleranceM: 1e-7,
      from: {position: [0, 0, 0], normal: [0, 0, 1]},
      to: {position: [0.6, 0, 0], normal: [0, 0, 1]},
    }], obstacles: []},
    participantManifest: {
      routeIds: [id], obstacleIds: [], physicalObstacleIds: [], serviceObstacleIds: [], terminalObstacleIds: [],
      movingRouteIds: [id], movingObstacleIds: [],
    },
    ownedRouteIds: [id],
    routeMotions: [{id, kind: 'mating-reservoir', allocation, parameterMap: {from: 'from', to: 'to'}}],
    obstacleMotions: [],
  };
}
function movingApertureFixture() {
  const cylinder = {
    id: 'co-moving-cylinder', type: 'cylinder', center: [0, 0, 0], axis: [0, 0, 1], radiusM: 0.15, halfLengthM: 0.1,
    bounds: {min: [-0.15, -0.15, -0.1], max: [0.15, 0.15, 0.1]},
    sourceVertices: [[-0.15, 0, 0], [0.15, 0, 0], [0, -0.15, 0], [0, 0.15, 0], [0, 0, -0.1], [0, 0, 0.1]],
    apertures: [{id: 'cylinder-throat', type: 'box', routeIds: [ROUTE_ID], min: [-0.06, -0.06, -0.2], max: [0.06, 0.06, 0.2]}],
  };
  const vertices = [[-0.15, -0.15, 0.5], [0.15, -0.15, 0.5], [0.15, 0.15, 0.5], [-0.15, 0.15, 0.5]];
  const mesh = {
    id: 'co-moving-mesh', type: 'mesh', closed: false,
    triangles: [[vertices[0], vertices[1], vertices[2]], [vertices[0], vertices[2], vertices[3]]],
    sourceVertices: vertices, bounds: {min: [-0.15, -0.15, 0.5], max: [0.15, 0.15, 0.5]},
    apertures: [{id: 'mesh-throat', type: 'box', routeIds: [ROUTE_ID], min: [-0.06, -0.06, 0.3], max: [0.06, 0.06, 0.7]}],
  };
  const input = fixture([cylinder, mesh]);
  input.baseline.routes[0].points = [[0, 0, -1], [0, 0, 1]];
  input.participantManifest.movingObstacleIds = [cylinder.id, mesh.id];
  input.obstacleMotions = [rigid(cylinder.id), rigid(mesh.id)];
  return input;
}

runCase('full-mating-reservoir-construction-endpoints-length-and-all-cell-self-clearance', () => {
  const input = reservoirFixture(), proof = createWithdrawalAffineProof(input);
  const positions = [[0, 0], [0.04, 0], [0, 0.03], [0.04, 0.03], [0.013, 0.019], [0.031, 0.007]];
  const observations = positions.map(([f, t]) => {
    const snapshot = sampleWithdrawalAffineProof(proof, {fromWithdrawalM: f, toWithdrawalM: t}), route = snapshot.routes[0];
    const lengthErrorM = Math.abs(measuredLength(route.points) - input.baseline.routes[0].restLengthM);
    assert(lengthErrorM < 1e-10, 'The independently measured cable length must remain constant.');
    assert(vectorDistance(route.points[0], [0, 0, f]) < 1e-12);
    assert(vectorDistance(route.points.at(-1), [0.6, 0, t]) < 1e-12);
    assert.deepEqual(route.from.position, route.points[0]);
    assert.deepEqual(route.to.position, route.points.at(-1));
    const audit = auditPose(snapshot);
    assert.equal(audit.ok, true, json(audit.issues));
    return {parameters: [f, t], lengthErrorM, from: route.from.position, to: route.to.position, auditOk: audit.ok};
  });
  const result = certifyWithdrawalRectangle({proof, ...FULL_BUDGET});
  if (!result.accepted) {
    const error = new Error('The complete declared reservoir rectangle was not certified.');
    error.evidence = {observations, result};
    throw error;
  }
  assert.equal(result.accepted, true, json(result.issues));
  assert.equal(result.coverage.completeCertifiedCoverage, true);
  assert(result.cells.length > 0);
  for (const cell of result.cells) {
    assert.equal(cell.status, 'certified');
    for (const owned of cell.ownedResults) {
      assert.equal(owned.selfNeighborhood.ok, true);
      assert(owned.selfNeighborhood.checkedPairs > 0, 'The reservoir must exercise its complete local-self proof.');
      assert.equal(owned.selfNeighborhood.unresolvedCount, 0);
      assert.equal(owned.selfNeighborhood.collisions.length, 0);
    }
  }
  // A separate small but complete two-stroke domain can be resolved in one
  // cell, making its five-snapshot budget an unambiguous accounting contract.
  const oneCellInput = reservoirFixture({fromTravelM: 0.0001, toTravelM: 0.000075});
  const oneCell = certifyWithdrawalRectangle({proof: createWithdrawalAffineProof(oneCellInput), ...FULL_BUDGET, maxCells: 1, maxSamples: 5, maxDepth: 0});
  if (!oneCell.accepted) {
    const error = new Error('The small-stroke reservoir did not satisfy the one-cell sample-accounting fixture.');
    error.evidence = {oneCell};
    throw error;
  }
  assert.equal(oneCell.samples, 5, 'One complete reservoir cell must use only its five budgeted pose snapshots.');
  assert.equal(oneCell.evaluatedCells, 1);
  assert.equal(oneCell.coverage.completeCertifiedCoverage, true);
  return {allocation: input.routeMotions[0].allocation, observations, result, oneCellAccounting: oneCell};
});

runCase('invalid-affine-construction-and-supplied-partial-domain-rejected', () => {
  const invalidProof = certifyWithdrawalRectangle({proof: {schema: 'orbital-data-center/H08-affine-withdrawal-proof/1', domain: DOMAIN}});
  assert.equal(invalidProof.accepted, false);
  assert(invalidProof.issues.some(i => i.code === 'invalid-affine-proof'));
  const checks = [];
  for (const [name, mutate, code] of [
    ['partial-reservoir-from-stroke', i => { i.domain.from[1] = 0.02; }, 'reservoir-domain-mismatch'],
    ['nonzero-domain-origin', i => { i.domain.from[0] = 0.01; }, 'invalid-withdrawal-domain'],
    ['zero-domain-travel', i => { i.domain.to[1] = 0; }, 'invalid-withdrawal-domain'],
    ['nonfinite-domain', i => { i.domain.to[1] = Infinity; }, 'invalid-withdrawal-domain'],
    ['non-affine-reservoir-axis', i => { i.routeMotions[0].allocation.axis = [0.001, 0, Math.sqrt(1 - 0.001 ** 2)]; }, 'unproved-affine-construction'],
    ['unproved-callback-motion-kind', i => { i.routeMotions[0] = {id: i.ownedRouteIds[0], kind: 'sampled-callback'}; }, 'unsupported-route-motion-proof'],
  ]) {
    const input = reservoirFixture(); mutate(input);
    checks.push({name, rejection: expectCreationRejection(input, code)});
  }
  return {invalidProof, checks};
});

runCase('reservoir-endpoints-cannot-cross-couple-independent-plug-strokes', () => {
  // The unchanged construction proof accepts this constant-length straight
  // reservoir, but both endpoint controls move by f-t. Physical plug metadata
  // permits the from plug to move only by f, and the to plug only by -t.
  const id = 'crossed-endpoints', travel = 3e-5;
  const allocation = {
    controls: [[0, 0, 0], [1, 0, 0], [2, 0, 0]], first: 1, last: 1, axis: [1, 0, 0],
    bendRadiusM: 0.03, fromNormal: [1, 0, 0], toNormal: [-1, 0, 0],
    fromTravelM: travel, toTravelM: travel, fromPrefixLast: 2, toSuffixFirst: 0,
  };
  const shape = sampleMatingReservoir(allocation);
  const sweep = matingReservoirSweptObstacles(allocation, {id, radiusM: 0.001, clearanceM: 0.001});
  assert.equal(sweep.ok, true, 'The counterexample must pass the unchanged all-domain construction proof.');
  const input = {
    domain: {from: [0, travel], to: [0, travel]},
    baseline: {routes: [{
      id, points: shape.points, radiusM: 0.001, clearanceM: 0.001,
      minBendRadiusM: 0.03, minimumBendRadiusM: shape.minimumBendRadiusM,
      bendRadiusBasis: 'constructed-circular-fillets', renderedCenterlineMismatchM: 0, restLengthM: shape.lengthM,
      from: {position: [0, 0, 0], normal: [1, 0, 0]}, to: {position: [2, 0, 0], normal: [-1, 0, 0]},
    }], obstacles: []},
    participantManifest: {
      routeIds: [id], obstacleIds: [], physicalObstacleIds: [], serviceObstacleIds: [], terminalObstacleIds: [],
      movingRouteIds: [id], movingObstacleIds: [],
    }, ownedRouteIds: [id],
    routeMotions: [{id, kind: 'mating-reservoir', allocation, parameterMap: {from: 'from', to: 'to'}}], obstacleMotions: [],
  };
  const corner = sampleMatingReservoir(allocation, {fromWithdrawalM: 0, toWithdrawalM: travel});
  const fromEndpointGapM = vectorDistance(corner.points[0], [0, 0, 0]);
  assert(fromEndpointGapM > 2e-5, 'One full corner must violate the physical connector tolerance.');
  const rejection = expectCreationRejection(input, 'reservoir-endpoint-coefficient-mismatch');
  return {unchangedSweepAccepted: sweep.ok, independentCorner: {parameters: [0, travel], fromEndpointGapM}, rejection};
});

runCase('complete-participant-moving-and-category-manifests-required', () => {
  const checks = [];
  for (const [name, mutate] of [
    ['missing-route-in-baseline', i => { i.baseline.routes = []; }],
    ['extra-unmanifested-route', i => { i.baseline.routes.push({...structuredClone(i.baseline.routes[0]), id: 'unexpected-route'}); }],
    ['missing-physical-obstacle', i => { i.baseline.obstacles = []; }],
    ['extra-unmanifested-obstacle', i => { i.baseline.obstacles.push(box('unexpected-box', [8, 8, 8], [9, 9, 9])); }],
    ['missing-moving-route', i => { i.participantManifest.movingRouteIds = []; }],
    ['extra-moving-route', i => { i.participantManifest.movingRouteIds.push('phantom-moving-route'); }],
    ['stationary-solid-listed-moving', i => { i.participantManifest.movingObstacleIds = [...i.participantManifest.obstacleIds]; }],
    ['moving-solid-omitted', i => { i.obstacleMotions = [rigid(i.baseline.obstacles[0].id)]; }],
    ['missing-motion-row', i => { i.routeMotions = []; }],
    ['missing-category-assignment', i => { i.participantManifest.physicalObstacleIds = []; }],
    ['overlapping-category-assignment', i => { i.participantManifest.terminalObstacleIds = [...i.participantManifest.obstacleIds]; }],
  ]) {
    const input = fixture([box('manifest-box', [4, 4, 4], [5, 5, 5])]); mutate(input);
    checks.push({name, rejection: expectCreationRejection(input)});
  }
  return {checks};
});

runCase('only-owned-terminal-records-receive-terminal-exemption', () => {
  const makeTerminal = owner => {
    const input = fixture([box('terminal-record', [0.48, 0.48, -0.02], [0.52, 0.52, 0.02], {lineId: owner})]);
    input.participantManifest.physicalObstacleIds = [];
    input.participantManifest.terminalObstacleIds = ['terminal-record'];
    return input;
  };
  const ownInput = makeTerminal(ROUTE_ID);
  assertSolidCollision(auditedAt(ownInput, 0.5, 0.5), 'terminal-record');
  const own = certifyWithdrawalRectangle({proof: createWithdrawalAffineProof(ownInput), ...FULL_BUDGET});
  assert.equal(own.accepted, true);
  assert(own.cells.flatMap(c => c.ownedResults).every(r => r.excludedOwnTerminalIds.includes('terminal-record')));
  const foreign = certifyWithdrawalRectangle({proof: createWithdrawalAffineProof(makeTerminal('foreign-route-owner')), ...FULL_BUDGET});
  assertRejectedCollision(foreign, 'terminal-record');
  assert(foreign.cells.flatMap(c => c.ownedResults || []).every(r => !r.excludedOwnTerminalIds.includes('terminal-record')));
  return {own, foreign};
});

runCase('rigid-moving-cylinder-mesh-source-vertices-and-authorized-apertures', () => {
  const input = movingApertureFixture(), proof = createWithdrawalAffineProof(input);
  const snapshot = sampleWithdrawalAffineProof(proof, {fromWithdrawalM: 0.25, toWithdrawalM: 0.75});
  const translation = [0.25, 0.75, 0];
  const expectedPoint = p => p.map((x, k) => x + translation[k]);
  for (const [i, solid] of snapshot.obstacles.entries()) {
    assert.deepEqual(solid.sourceVertices, input.baseline.obstacles[i].sourceVertices.map(expectedPoint));
    assert.deepEqual(solid.apertures[0].min, expectedPoint(input.baseline.obstacles[i].apertures[0].min));
    assert.deepEqual(solid.apertures[0].max, expectedPoint(input.baseline.obstacles[i].apertures[0].max));
    if (solid.triangles) assert.deepEqual(solid.triangles, input.baseline.obstacles[i].triangles.map(triangle => triangle.map(expectedPoint)));
  }
  const result = certifyWithdrawalRectangle({proof, maxCells: 1, maxSamples: 5, maxDepth: 0, maxElapsedMs: 20000});
  assert.equal(result.accepted, true, 'Genuine co-motion must preserve the two aperture clearances over the complete rectangle: ' + json(result.issues));
  assert.equal(result.coverage.completeCertifiedCoverage, true);
  const unauthorized = [];
  for (const id of ['co-moving-cylinder', 'co-moving-mesh']) {
    const denied = movingApertureFixture();
    denied.baseline.obstacles.find(o => o.id === id).apertures[0].routeIds = ['foreign-route'];
    const rejection = certifyWithdrawalRectangle({proof: createWithdrawalAffineProof(denied), ...FULL_BUDGET});
    assertRejectedCollision(rejection, id);
    unauthorized.push({id, result: rejection});
  }
  return {independentRelativeTranslationM: [0, 0, 0], sampledTranslation: translation, result, unauthorized};
});

runCase('copied-motion-inputs-isolated-and-opaque-proof-not-forgeable', () => {
  const input = reservoirFixture(), proof = createWithdrawalAffineProof(input);
  const parameters = {fromWithdrawalM: 0.013, toWithdrawalM: 0.019};
  const beforeMutation = structuredClone(sampleWithdrawalAffineProof(proof, parameters));
  input.routeMotions[0].allocation.controls[1][0] = 100;
  input.routeMotions[0].parameterMap.from = 'to';
  input.domain.from[1] = 10;
  input.participantManifest.routeIds.push('injected-route');
  assert.throws(() => { input.baseline.routes[0].points[0][0] = 100; }, TypeError, 'The documented shared baseline must remain immutable.');
  assert.deepEqual(sampleWithdrawalAffineProof(proof, parameters), beforeMutation, 'Caller-owned copied motion/domain/manifest records must not mutate the verified model.');
  const copiedProof = certifyWithdrawalRectangle({proof: structuredClone(proof), ...FULL_BUDGET});
  assert.equal(copiedProof.accepted, false);
  assert(copiedProof.issues.some(i => i.code === 'invalid-affine-proof'));
  const collisionId = 'immutable-owned-scope-collision';
  const collisionProof = createWithdrawalAffineProof(fixture([box(collisionId, [0.48, 0.48, -0.02], [0.52, 0.52, 0.02])]));
  const first = certifyWithdrawalRectangle({proof: collisionProof, ...FULL_BUDGET});
  assertRejectedCollision(first, collisionId);
  let returnedScopeMutationBlocked = false;
  try { first.ownedRouteIds.length = 0; }
  catch (error) { assert(error instanceof TypeError); returnedScopeMutationBlocked = true; }
  const second = certifyWithdrawalRectangle({proof: collisionProof, ...FULL_BUDGET});
  if (second.accepted) {
    const error = new Error('Mutating a returned receipt removed the collision predicates from the opaque proof.');
    error.evidence = {first, second, returnedScopeMutationBlocked};
    throw error;
  }
  assertRejectedCollision(second, collisionId);
  assert.deepEqual(second.ownedRouteIds, [ROUTE_ID]);
  assert(second.cells.some(c => c.ownedResults?.some(r => r.id === ROUTE_ID)), 'The second certification must still audit the owned route.');
  return {copiedMotionAndDomainMutationsIgnored: true, sharedBaselineMutationRejected: true, copiedProof, returnedScopeMutationBlocked, repeatedCollisionCertificate: second};
});

runCase('coverage-partitions-must-be-complete-disjoint-and-coordinate-bound', () => {
  const root = {path: '', bounds: structuredClone(DOMAIN), status: 'certified'};
  const left = {path: '0', bounds: {from: [0, 0.5], to: [0, 1]}, status: 'certified'};
  const right = {path: '1', bounds: {from: [0.5, 1], to: [0, 1]}, status: 'certified'};
  const valid = validateWithdrawalRectangleCoverage({domain: DOMAIN, cells: [left, right]});
  assert.equal(valid.completeCertifiedCoverage, true);
  assert.equal(valid.certifiedAreaM2, 1);
  const checks = [];
  for (const [name, cells] of [
    ['empty', []], ['missing-half', [left]], ['duplicate-leaf', [left, right, right]],
    ['parent-overlaps-child', [root, left]],
    ['incorrect-cell-coordinates', [left, {...right, bounds: {from: [0.4, 1], to: [0, 1]}}]],
    ['invalid-path', [{...root, path: '2'}]],
  ]) {
    const result = validateWithdrawalRectangleCoverage({domain: DOMAIN, cells});
    assert.equal(result.ok, false, name);
    assert.equal(result.completeCertifiedCoverage, false, name);
    checks.push({name, result});
  }
  const unresolved = validateWithdrawalRectangleCoverage({domain: DOMAIN, cells: [left, {...right, status: 'unresolved'}]});
  assert.equal(unresolved.ok, true);
  assert.equal(unresolved.completePartition, true);
  assert.equal(unresolved.completeCertifiedCoverage, false);
  assert.equal(unresolved.certifiedAreaM2, 0.5);
  return {valid, checks, unresolved};
});

runCase('sampled-correspondence-rejects-metadata-topology-and-understated-motion', () => {
  const input = movingApertureFixture();
  input.baseline.routes[0].from = {position: [0, 0, -1], normal: [0, 0, 1]};
  input.baseline.routes[0].to = {position: [0, 0, 1], normal: [0, 0, -1]};
  const proof = createWithdrawalAffineProof(input), checks = [];
  for (const [name, mutate, code] of [
    ['route-point-topology', s => { s.routes[0].points.push([9, 9, 9]); }, 'motion-topology-change'],
    ['route-clearance-metadata', s => { s.routes[0].clearanceM += 0.01; }, 'route-construction-change'],
    ['understated-route-displacement', s => { s.routes[0].points[0][0] += 10; }, 'understated-observed-bound'],
    ['endpoint-normal', s => { s.routes[0].from.normal = [1, 0, 0]; }, 'endpoint-motion-mismatch'],
    ['solid-axis', s => { s.obstacles[0].axis = [1, 0, 0]; }, 'solid-construction-change'],
    ['aperture-permission', s => { s.obstacles[0].apertures[0].routeIds = ['foreign-route']; }, 'solid-construction-change'],
    ['aperture-independent-motion', s => { s.obstacles[0].apertures[0].min[0] += 10; }, 'understated-observed-bound'],
    ['source-vertices-independent-motion', s => { s.obstacles[0].sourceVertices[0][0] += 10; }, 'understated-observed-bound'],
    ['missing-sampled-participant', s => { s.obstacles.pop(); }, 'participant-inventory-mismatch'],
  ]) {
    const result = checkWithdrawalAffineSamples({proof, parameters: [[0.25, 0.75]], sample: parameters => {
      const snapshot = structuredClone(sampleWithdrawalAffineProof(proof, parameters)); mutate(snapshot); return snapshot;
    }});
    assert.equal(result.accepted, false, name);
    assert.equal(result.continuousCoverageAssessed, false, name);
    assert.equal(result.matched, false, name);
    assert(result.issues.some(i => i.code === code), name + ': ' + json(result.issues));
    checks.push({name, result});
  }
  return {checks};
});

runCase('analytic-solids-must-enclose-declared-physical-source-vertices', () => {
  // Independent review identified this counterexample before execution. The
  // physical source point lies on the cable, while the claimed analytic solid
  // is five metres away. An enlarged AABB must not legitimize that mismatch.
  const sourceVertices = [[0, 0, 0], [5.1, 0, 0]];
  const bounds = {min: [0, -0.1, -0.1], max: [5.1, 0.1, 0.1]};
  const corrupt = [
    {id: 'false-cylinder', type: 'cylinder', center: [5, 0, 0], axis: [0, 0, 1], radiusM: 0.1, halfLengthM: 0.1, sourceVertices, bounds},
    {id: 'false-obb', type: 'obb', center: [5, 0, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], halfSize: [0.1, 0.1, 0.1], sourceVertices, bounds},
    {id: 'false-box', type: 'box', min: [4.9, -0.1, -0.1], max: [5.1, 0.1, 0.1], sourceVertices, bounds},
  ];
  const physicalWitness = {
    id: 'actual-source-contact', type: 'mesh', closed: false,
    triangles: [[[0, 0, 0], [0.02, 0, 0], [0, 0.02, 0]]],
    sourceVertices: [[0, 0, 0], [0.02, 0, 0], [0, 0.02, 0]],
    bounds: {min: [0, 0, 0], max: [0.02, 0.02, 0]},
  };
  const witness = auditedAt(fixture([physicalWitness]), 0, 0);
  assertSolidCollision(witness, physicalWitness.id);
  const checks = corrupt.map(solid => {
    const input = fixture([solid]);
    input.obstacleMotions = [rigid(solid.id)];
    input.participantManifest.movingObstacleIds = [solid.id];
    return {type: solid.type, rejection: expectCreationRejection(input, 'inconsistent-source-vertices')};
  });
  return {independentPhysicalSourceContact: witness, checks};
});

runCase('final-cell-deadline-expiry-cannot-produce-acceptance', () => {
  const proof = createWithdrawalAffineProof(fixture([box('deadline-clear-box', [4, 4, 4], [5, 5, 5])]));
  const actualNow = Date.now;
  let clock = actualNow(), result, callbackCount = 0;
  try {
    Date.now = () => clock;
    result = certifyWithdrawalRectangle({
      proof, maxCells: 1, maxSamples: 5, maxDepth: 0, maxElapsedMs: 10,
      onCell: cell => {
        callbackCount++;
        assert.equal(cell.status, 'certified');
        clock += 11;
      },
    });
  } finally {
    Date.now = actualNow;
  }
  assert.equal(callbackCount, 1, 'The clock should advance only after the clear final cell completes.');
  assert.equal(result.accepted, false);
  assert.equal(result.coverageComplete, false);
  assert.equal(result.completed, false);
  assert.equal(result.status, 'withdrawal-rectangle-incomplete');
  assert(result.issues.some(i => i.code === 'rectangle-runtime-budget'));
  return {clockRestored: Date.now === actualNow, deterministicElapsedMs: 11, result};
});

runCase('extended-finite-runtime-ceiling-still-enforces-the-deadline', () => {
  const proof = createWithdrawalAffineProof(fixture([box('extended-budget-clear-box', [4, 4, 4], [5, 5, 5])]));
  const options = {proof, maxCells: 1, maxSamples: 5, maxDepth: 0};
  const admitted = certifyWithdrawalRectangle({...options, maxElapsedMs: 1200000});
  assert.equal(admitted.accepted, true);
  assert.equal(admitted.coverageComplete, true);
  assert.equal(admitted.budgets.maxElapsedMs, 1200000);
  const aboveCeiling = certifyWithdrawalRectangle({...options, maxElapsedMs: 1200001});
  assert.equal(aboveCeiling.accepted, false);
  assert.equal(aboveCeiling.status, 'invalid-input');
  assert(aboveCeiling.issues.some(issue => issue.code === 'invalid-resource-budget'));
  const actualNow = Date.now;
  let clock = actualNow(), expired, callbackCount = 0;
  try {
    Date.now = () => clock;
    expired = certifyWithdrawalRectangle({...options, maxElapsedMs: 1200000, onCell: cell => {
      callbackCount++;
      assert.equal(cell.status, 'certified');
      clock += 1200001;
    }});
  } finally {
    Date.now = actualNow;
  }
  assert.equal(callbackCount, 1);
  assert.equal(expired.accepted, false);
  assert.equal(expired.completed, false);
  assert.equal(expired.coverageComplete, false);
  assert(expired.issues.some(issue => issue.code === 'rectangle-runtime-budget'));
  return {admitted, aboveCeiling, expired, clockRestored: Date.now === actualNow, elapsedTimeWasSimulated: true};
});

const after = {module: digest(MODULE), contract: digest(CONTRACT), routingAudit: digest(KERNEL), reservoirConstruction: digest(RESERVOIR)};
const stale = Object.keys(before).some(key => before[key] !== after[key]);
const summary = {
  kind: 'H08-P1-contract-checks-summary', startedAt, finishedAt: new Date().toISOString(),
  module: MODULE, contract: CONTRACT, before, after, stale,
  passed: results.filter(r => r.pass).length, failed: results.filter(r => !r.pass).length,
  total: results.length, contractFailureObserved: results.some(r => !r.pass),
  scope: 'Focused synthetic H08-P1 capability contracts only. No actual H06/H07/H08 scene, allocator search, or publication gate.',
};
if (RECEIPT) {
  mkdirSync(dirname(RECEIPT), {recursive: true});
  writeFileSync(RECEIPT, json({summary, results}) + '\n');
}
console.log(json(summary));
if (RECEIPT) console.log('RECEIPT ' + RECEIPT);
process.exitCode = stale ? 3 : summary.failed ? 1 : 0;
