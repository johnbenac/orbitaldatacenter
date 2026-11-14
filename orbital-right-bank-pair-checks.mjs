// H07 accepts only a supplied static pair in a complete, source-bound H06 scene.
// It never constructs a scene, searches for routes, or allocates service travel.
// Run under an external 300 s cap; interruption leaves an incomplete receipt:
// timeout --signal=TERM --kill-after=5s 300s node orbital-right-bank-pair-checks.mjs \
//   --scene H06.json.gz --candidate pair.json --expect-source <sha256> --output receipt.json
import {readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, realpathSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sizeDesign} from './dist/design.js';
import {buildElectricalArchitecture} from './dist/electrical-architecture.js';
import {rackPowerTrayCandidates} from './dist/rack-power-tray-candidates.js';
import {roundedConnectionRoute, routeLength} from './dist/connection-routes.js';
import {auditRoutes, routeClearance, segmentObstacleClearance, segmentSegmentDistance} from './dist/routing-audit.js';
import {routingSourceFingerprint, sameRoutingSourceFingerprint} from './scripts/routing-source-fingerprint.mjs';
import {readSourceTransitionInput, validateFrozenGeometrySourceTransition} from './orbital-right-bank-source-transition.mjs';

const CONFIGURATION = 'orbital-1-202606';
const CLEARANCE_M = .002;
const PAIR_SCHEMA = 'orbital-data-center/H07-static-pair-candidate/1';
const sha = value => createHash('sha256').update(Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const point = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const positive = n => Number.isFinite(n) && n > 0;
const hash = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const ids = rows => rows.map(row => row.id);
const sorted = values => [...values].sort();
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; };

class ContractError extends Error {
  constructor(code, message, details = {}) { super(message); this.name = 'ContractError'; this.code = code; this.details = details; }
}
function requireValue(condition, code, message, details) { if (!condition) throw new ContractError(code, message, details); }
function exact(actual, expected, name) { requireValue(equal(actual, expected), 'scene-integrity', name + ' differs from the frozen declaration'); }
function uniqueIds(rows, name) {
  requireValue(Array.isArray(rows) && rows.every(row => typeof row?.id === 'string' && row.id.length > 0), 'scene-inventory', name + ' needs identified records');
  requireValue(new Set(ids(rows)).size === rows.length, 'scene-inventory', name + ' contains duplicate IDs');
  return new Map(rows.map(row => [row.id, row]));
}
function sameIds(actual, expected, name) { exact(sorted(actual), sorted(expected), name + ' IDs'); }
function validFingerprint(value) {
  return value?.algorithm === 'sha256' && hash(value.value) && Array.isArray(value.files) && value.files.length > 0 &&
    value.files.every(row => typeof row.path === 'string' && hash(row.sha256)) && new Set(value.files.map(row => row.path)).size === value.files.length && sha(value.files) === value.value;
}
const routeValue = route => ({id: route.id, points: route.points, radiusM: route.radiusM, clearanceM: route.clearanceM ?? 0, sectionIds: route.sectionIds});
const routeRecord = route => { const value = routeValue(route); return {...value, geometryDigest: sha(value)}; };
function validateRoute(route, name) {
  requireValue(Array.isArray(route?.points) && route.points.length >= 2 && route.points.every(point) && positive(route.radiusM) && Number.isFinite(route.clearanceM) && route.clearanceM >= 0, 'scene-geometry', name + ' needs finite points, positive radius and explicit nonnegative clearance');
  requireValue(hash(route.geometryDigest) && sha(routeValue(route)) === route.geometryDigest, 'scene-integrity', name + ' geometry digest differs');
}

/** Validate complete category membership and content before any collision audit. */
export function validateManifest(manifest, rows, name) {
  uniqueIds(rows, name);
  requireValue(manifest && Number.isInteger(manifest.count) && manifest.count === rows.length && hash(manifest.geometryDigest), 'scene-manifest', name + ' manifest is missing or has the wrong count');
  exact(manifest.ids, ids(rows), name + ' ordered manifest');
  requireValue(manifest.geometryDigest === sha(rows), 'scene-manifest', name + ' content differs from its manifest');
}
function validateSolid(o, name) {
  const bounds = o?.bounds;
  requireValue(o && ['box', 'obb', 'mesh', 'capsule', 'cylinder'].includes(o.type) && point(bounds?.min) && point(bounds?.max) && bounds.min.every((v, i) => v <= bounds.max[i]), 'scene-geometry', name + ' has invalid solid type/bounds');
  let vertices;
  if (o.type === 'box') {
    requireValue(point(o.min) && point(o.max) && o.min.every((v, i) => v <= o.max[i]), 'scene-geometry', name + ' has invalid box geometry');
    vertices = [o.min, o.max];
  } else if (o.type === 'mesh') {
    requireValue(Array.isArray(o.triangles) && o.triangles.length > 0 && o.triangles.every(t => Array.isArray(t) && t.length === 3 && t.every(point)), 'scene-geometry', name + ' has incomplete mesh geometry');
    vertices = o.triangles.flat();
  } else if (o.type === 'capsule') {
    requireValue(point(o.a) && point(o.b) && positive(o.radiusM), 'scene-geometry', name + ' has invalid capsule geometry');
    vertices = [o.a, o.b].flatMap(p => [p.map(v => v - o.radiusM), p.map(v => v + o.radiusM)]);
  } else if (o.type === 'obb') {
    requireValue(point(o.center) && point(o.halfSize) && o.halfSize.every(v => v >= 0) && Array.isArray(o.axes) && o.axes.length === 3 && o.axes.every(point) && o.axes.every(a => Math.abs(Math.hypot(...a) - 1) <= 1e-6) && o.axes.every((a, i) => o.axes.every((b, j) => i === j || Math.abs(a.reduce((s, v, k) => s + v * b[k], 0)) <= 1e-6)), 'scene-geometry', name + ' has invalid oriented box geometry');
    const extent = [0, 1, 2].map(k => o.axes.reduce((s, a, i) => s + Math.abs(a[k]) * o.halfSize[i], 0));
    vertices = [o.center.map((v, i) => v - extent[i]), o.center.map((v, i) => v + extent[i])];
  } else {
    requireValue(point(o.center) && point(o.axis) && Math.abs(Math.hypot(...o.axis) - 1) <= 1e-6 && positive(o.radiusM) && Number.isFinite(o.halfLengthM) && o.halfLengthM >= 0, 'scene-geometry', name + ' has invalid cylinder geometry');
    const extent = o.axis.map(v => Math.abs(v) * o.halfLengthM + Math.sqrt(Math.max(0, 1 - v * v)) * o.radiusM);
    vertices = [o.center.map((v, i) => v - extent[i]), o.center.map((v, i) => v + extent[i])];
  }
  requireValue(vertices.every(p => p.every((v, i) => v >= bounds.min[i] - 1e-8 && v <= bounds.max[i] + 1e-8)), 'scene-geometry', name + ' bounds omit solid geometry');
}

/** Extract only a completed, fully manifested H06 failure; no recapture occurs. */
export function extractFrozenScene(report, {sceneSha256, sceneBytes, expectedSource, currentSource, sourceTransition = null, sourceTransitionRecord = null} = {}) {
  requireValue(hash(sceneSha256) && hash(expectedSource), 'scene-identity', 'Exact scene bytes and expected source SHA256 are required');
  requireValue(validFingerprint(report?.sourceStart) && validFingerprint(report?.sourceFinish) && validFingerprint(currentSource), 'source-identity', 'Complete source fingerprints are required');
  requireValue(report.unchangedSource === true && sameRoutingSourceFingerprint(report.sourceStart, report.sourceFinish) && currentSource.value === expectedSource, 'source-mismatch', 'The immutable H06 origin must be source-stable and the expected source must be the actual current source');
  let sourceProvenance = null;
  if (sourceTransition !== null) {
    sourceProvenance = validateFrozenGeometrySourceTransition(sourceTransition, {originSource: report.sourceStart, currentSource, sceneSha256, sceneBytes, record: sourceTransitionRecord});
  } else {
    requireValue(sameRoutingSourceFingerprint(report.sourceStart, currentSource), 'source-mismatch', 'A changed runtime requires an explicit exact frozen-geometry source transition and fresh acceptance');
  }
  requireValue(report.schema === 'orbital-data-center/H06-right-bank-diagnosis/1' && report.configurationId === CONFIGURATION && report.status === 'diagnosis-recorded' && report.diagnosisComplete === true && report.boundedExecutionComplete === true && report.routingAccepted === false, 'incomplete-h06', 'H07 needs a complete H06 diagnosis with an actual reproduced right-bank failure');
  requireValue(Array.isArray(report.reproductionStates) && report.reproductionStates.length === 1, 'scene-state', 'Exactly one frozen reproduction state is required');
  const state = report.reproductionStates[0];
  requireValue(state.id === 'june-deployed-mated-proposed-layout' && state.configurationId === CONFIGURATION && state.deploymentProgress === 1 && equal(state.plugWithdrawalM, {from: 0, to: 0}) && state.planFluidRoutes === false && state.sourceUnintegrated === true && state.input && state.frame === 'craft root metres', 'scene-state', 'H07 is restricted to the deployed, fully mated June proposed layout');
  requireValue(Array.isArray(state.rootMatrix) && state.rootMatrix.length === 16 && state.rootMatrix.every(Number.isFinite), 'scene-state', 'Frozen frame transform is missing');
  const interfaces = uniqueIds(state.interfaces, 'interfaces');
  requireValue(interfaces.size === 104 && report.baseline?.counts?.physicalElectricalCircuits === 104, 'scene-inventory', 'The complete 104-interface inventory is required');
  exact(state.productionLineOrder, ids(state.interfaces), 'production interface order');
  // Pure source-bound catalog construction only; no makeCraft, route search,
  // service allocation or whole-graph installed reconciliation is called.
  const graph = buildElectricalArchitecture(sizeDesign(state.input));
  const specs = new Map(graph.harnesses.map(spec => [spec.id, spec]));
  const expectedInterfaces = graph.harnesses.flatMap(spec => Array.from({length: spec.quantity * (spec.connectorTypeId.startsWith('hv-single') ? 2 : 1)}, (_, i) => spec.id + '/' + i));
  sameIds(ids(state.interfaces), expectedInterfaces, 'source electrical inventory');
  for (const row of state.interfaces) {
    const spec = specs.get(row.harnessId), singles = spec?.connectorTypeId.startsWith('hv-single') ? 2 : 1;
    requireValue(spec && row.id === spec.id + '/' + row.index && Number.isInteger(row.index) && row.index >= 0 && row.index < spec.quantity * singles && row.instance === Math.floor(row.index / singles) && row.polarity === (singles === 2 ? row.index % 2 ? 1 : -1 : 0), 'scene-interface', 'Interface circuit identity differs: ' + row.id);
    for (const end of ['from', 'to']) {
      requireValue(point(row[end]) && point(row[end + 'Normal']) && Math.abs(Math.hypot(...row[end + 'Normal']) - 1) <= 1e-6 && row[end + 'PortId'] === spec[end + 'PortId'] && row[end + 'BoxId'] === spec[end + 'BoxId'] && row[end + 'TravelM'] === .045 && equal(row[end + 'PlugOffsetM'], [0, 0, 0]), 'scene-interface', 'Complete mated endpoint and unit normal are required: ' + row.id + ':' + end);
    }
    requireValue(positive(row.radiusM) && positive(row.bendRadiusM) && Math.abs(row.radiusM - spec.cableDiameterM / 2) < 1e-12 && Math.abs(row.bendRadiusM - spec.bendRadiusM) < 1e-12 && Number.isFinite(spec.terminationAllowanceM) && spec.terminationAllowanceM >= 0, 'scene-interface', 'Source cable construction or length policy differs: ' + row.id);
    if (row.terminationAllowanceM !== undefined) exact(row.terminationAllowanceM, spec.terminationAllowanceM, row.id + ' termination allowance');
  }
  const batteryIds = ids(state.interfaces.filter(r => r.harnessId.startsWith('P-BAT'))), leftIds = ids(state.interfaces.filter(r => r.harnessId === 'P-SA-1')), rightIds = ids(state.interfaces.filter(r => r.harnessId === 'P-SA-2')), payloadIds = ids(state.interfaces.filter(r => r.harnessId.startsWith('P-PAY-')));
  requireValue(batteryIds.length === 8 && leftIds.length === 10 && rightIds.length === 10 && payloadIds.length === 24, 'scene-inventory', 'Required battery, collector and payload inventory differs');
  exact(state.batteryOrder, batteryIds, 'battery order'); exact(state.leftOrder, leftIds, 'left order'); exact(state.rightOrder, rightIds, 'right order');
  const pairIds = report.proposedRepairGroup?.routeIds;
  requireValue(report.proposedRepairGroup?.status === 'diagnosis-only' && Array.isArray(pairIds) && pairIds.length === 2 && new Set(pairIds).size === 2 && pairIds.every(id => rightIds.includes(id)), 'pair-scope', 'H06 must identify exactly one right feed/return pair');
  const pair = pairIds.map(id => interfaces.get(id));
  requireValue(pair[0].instance === pair[1].instance && pair[0].polarity === -pair[1].polarity && report.proposedRepairGroup.proposedConductors === 2, 'pair-scope', 'Selected conductors do not form the witnessed circuit pair');
  const rightReplay = report.rightReplay ?? [report.rightAttempt];
  requireValue(Array.isArray(rightReplay) && rightReplay.length >= 1 && rightReplay.length <= 10 && report.rightAttempts === rightReplay.length && rightReplay.at(-1)?.ok === false && rightReplay.slice(0, -1).every(r => r.ok === true), 'right-witness', 'An ordered bounded right replay ending in the first failure is required');
  exact(ids(rightReplay), rightIds.slice(0, rightReplay.length), 'right replay order'); exact(report.rightAttempt, rightReplay.at(-1), 'last right attempt');
  requireValue(pairIds.includes(report.rightAttempt.id) && ['first-right-route', 'right-bank-route'].includes(report.failure?.phase) && report.failure.routeId === report.rightAttempt.id && report.failure.independentCompleteRouteScreen?.ok === false, 'right-witness', 'The actual failing conductor must belong to this pair');
  exact(report.failure.repairGroup, pairIds, 'witness pair');
  for (const attempt of rightReplay) exact(attempt.interface, interfaces.get(attempt.id), attempt.id + ' witnessed interface');
  const prerequisite = report.proposalValidation, post = report.postAllocationValidation, proposal = report.frozenProposal, geometry = report.requiredNeighborGeometry;
  requireValue(prerequisite?.current === true && prerequisite.applicable === true && prerequisite.ok === true && prerequisite.records === 34 && prerequisite.serviceAllocationReached === true && prerequisite.issues?.length === 0 && post?.ok === true && post.clearanceM === CLEARANCE_M && Array.isArray(post.rows) && post.rows.length === 34 && post.rows.every(r => r.ok === true && r.screen?.ok === true && r.self?.ok === true && r.bendLimited === false), 'prerequisite-failed', 'All 34 final allocated proposal prerequisites must pass');
  requireValue(geometry?.completePhysicalAndOperational === true && geometry.integrity, 'incomplete-geometry', 'A local vicinity excerpt cannot be used as the H07 scene');
  exact(report.selectedProposalRecords, rackPowerTrayCandidates, 'source proposal records');
  const physicalRows = geometry.physicalAndOperational;
  uniqueIds(physicalRows, 'physical and operational geometry'); uniqueIds(report.baseline.obstacles, 'baseline physical and operational geometry');
  exact(ids(physicalRows), ids(report.baseline.obstacles), 'all physical and operational obstacle IDs');
  const physical = physicalRows.map((row, i) => {
    requireValue(row.geometry && row.geometry.id === row.id && hash(row.geometryDigest) && sha(row.geometry) === row.geometryDigest && row.geometryDigest === report.baseline.obstacles[i].geometryDigest, 'scene-integrity', 'Physical geometry is absent or changed: ' + row.id);
    const {geometry: ignored, ...summary} = row;
    exact(summary, report.baseline.obstacles[i], row.id + ' obstacle metadata');
    validateSolid(row.geometry, row.id); return row.geometry;
  });
  validateManifest(geometry.integrity.physicalAndOperational, physical, 'physicalAndOperational');
  requireValue(sha(physical) === report.baseline.geometryDigest && physical.length === report.baseline.counts.originalProductionObstacles + report.baseline.counts.additionalActualFluidSolids, 'scene-integrity', 'Full baseline physical geometry changed or was omitted');
  const meshes = uniqueIds(report.baseline.physicalMeshes, 'physical mesh inventory');
  requireValue(meshes.size === report.baseline.counts.retainedPhysicalMeshes && meshes.size === report.baseline.counts.ordinaryPhysicalMeshes + report.baseline.counts.fluidTubeMeshes && [...meshes.keys()].every(id => physical.some(o => o.sourceMesh === id)), 'scene-inventory', 'A captured physical mesh is absent from the complete solids');
  requireValue(report.physicalInventoryPreservation?.exactlyEqual === true && report.physicalInventoryPreservation.originalCount === meshes.size && report.physicalInventoryPreservation.currentCount === meshes.size && report.physicalInventoryPreservation.originalDigest === sha(report.baseline.physicalMeshes) && report.physicalInventoryPreservation.currentDigest === sha(report.baseline.physicalMeshes), 'scene-integrity', 'Physical preservation evidence differs');
  const native = report.baseline.fluidRoutes;
  uniqueIds(native, 'native fluid routes'); requireValue(native.length === 135 && report.baseline.counts.nativeFluidRoutes === 135, 'scene-inventory', 'All 135 native fluid paths are mandatory');
  native.forEach(route => validateRoute(route, route.id));
  requireValue(proposal && Array.isArray(proposal.routes) && proposal.routes.length === 34 && Array.isArray(proposal.reservations) && proposal.reservations.length > 0, 'scene-inventory', 'Complete 34-route service allocation is required');
  uniqueIds(proposal.routes, 'proposal routes'); uniqueIds(proposal.reservations, 'service envelopes');
  sameIds(ids(proposal.routes), [...payloadIds, ...leftIds], 'proposal routes'); exact(proposal.routeIds, ids(proposal.routes), 'declared proposal routes'); sameIds(proposal.payloadRouteIds, payloadIds, 'payload proposal routes'); sameIds(proposal.leftRouteIds, leftIds, 'left proposal routes'); sameIds(ids(post.rows), ids(proposal.routes), 'post-allocation validation');
  requireValue(sha({routes: proposal.routes, reservations: proposal.reservations}) === proposal.geometryDigest && prerequisite.reservations === proposal.reservations.length, 'scene-integrity', 'Frozen proposal content changed');
  validateManifest(geometry.integrity.proposalServiceEnvelopes, proposal.reservations, 'proposalServiceEnvelopes'); exact(geometry.proposalServiceEnvelopeIds, ids(proposal.reservations), 'all service envelope IDs');
  for (const route of proposal.routes) {
    validateRoute(route, route.id);
    const line = interfaces.get(route.id), allocation = route.allocation, reservations = proposal.reservations.filter(o => o.ownerRouteId === route.id), source = rackPowerTrayCandidates.find(r => r.id === route.id);
    requireValue(allocation?.ok === true && allocation.baseline?.bendLimited === false && allocation.fromTravelM === .045 && allocation.toTravelM === .045 && allocation.bendRadiusM === line.bendRadiusM && equal(route.serviceDomainM, {from: [0, .045], to: [0, .045]}) && positive(allocation.restLengthM), 'service-domain', 'Complete frozen service domain is missing: ' + route.id);
    exact(route.points, allocation.baseline.points, route.id + ' allocated baseline'); exact(route.sourceControls, source.controls, route.id + ' original controls'); exact(allocation.fromNormal, line.fromNormal, route.id + ' service source normal'); exact(allocation.toNormal, line.toNormal, route.id + ' service destination normal');
    requireValue(route.radiusM === line.radiusM && distance(route.points[0], line.from) < 1e-9 && distance(route.points.at(-1), line.to) < 1e-9, 'scene-interface', 'Allocated proposal endpoint/construction differs: ' + route.id);
    exact(route.reservationIds, ids(reservations), route.id + ' service envelope inventory');
    requireValue(reservations.length === route.points.length - 1 && reservations.every((o, i) => o.sourceSegment === i && o.serviceReservoirSweep === true && o.lineId === route.id) && allocation.sweepProof?.sourceSegments === reservations.length && allocation.sweepProof.fromTravelM === .045 && allocation.sweepProof.toTravelM === .045, 'service-domain', 'Service geometry does not cover every baseline segment: ' + route.id);
  }
  proposal.reservations.forEach(o => validateSolid(o, o.id));
  requireValue(proposal.reservations.every(o => proposal.routeIds.includes(o.ownerRouteId)), 'service-domain', 'A service envelope has no frozen owner');
  const terminals = geometry.finalTerminalRegistry, initialTerminals = report.baseline.terminalReservations;
  uniqueIds(initialTerminals, 'baseline terminal registry'); uniqueIds(terminals, 'final terminal registry');
  requireValue(initialTerminals.length === report.baseline.counts.terminalReservations && sha(initialTerminals) === report.baseline.terminalGeometryDigest, 'scene-integrity', 'Initial terminal inventory changed');
  sameIds(proposal.replacedVirtualApproachIds, leftIds.map(id => id + ':to:approach'), 'declared virtual approach replacements');
  exact(terminals, initialTerminals.filter(o => !proposal.replacedVirtualApproachIds.includes(o.id)), 'complete final terminal registry');
  exact(proposal.retainedTerminals, ids(terminals), 'retained terminal IDs'); validateManifest(geometry.integrity.finalTerminalRegistry, terminals, 'finalTerminalRegistry');
  terminals.forEach(o => validateSolid(o, o.id));
  for (const line of pair) for (const end of ['from', 'to']) requireValue(terminals.some(o => o.lineId === line.id && (o.id.includes(line.id + ':' + end + ':') || o.id.includes(line[end + 'PortId'] + ':'))), 'scene-interface', 'Selected pair endpoint reservation is absent: ' + line.id + ':' + end);
  requireValue(Array.isArray(report.batteryReplay) && report.batteryReplay.length === 8 && report.batteryReplay.every(r => r.ok === true), 'prerequisite-failed', 'All eight battery routes must be retained'); exact(ids(report.batteryReplay), batteryIds, 'battery replay order');
  for (const attempt of report.batteryReplay) exact(attempt.interface, interfaces.get(attempt.id), attempt.id + ' battery interface');
  const priorRight = rightReplay.slice(0, -1), expectedOwned = priorRight.filter(r => pairIds.includes(r.id));
  const retained = report.retainedSurroundingRoutes, owned = report.ownedBaselineRoutes ?? [];
  uniqueIds(retained, 'retained surrounding routes'); uniqueIds(owned, 'owned baseline routes');
  validateManifest(geometry.integrity.retainedSurroundingRoutes, retained, 'retainedSurroundingRoutes');
  if (geometry.integrity.ownedBaselineRoutes || owned.length) validateManifest(geometry.integrity.ownedBaselineRoutes, owned, 'ownedBaselineRoutes');
  const attemptRoute = attempt => routeRecord({id: attempt.id, points: attempt.points, radiusM: interfaces.get(attempt.id).radiusM, clearanceM: 0});
  const mandatory = [...native.map(routeRecord), ...proposal.routes.map(routeRecord), ...report.batteryReplay.map(attemptRoute)];
  exact(retained, [...mandatory, ...priorRight.filter(r => !pairIds.includes(r.id)).map(attemptRoute)], 'complete immutable surrounding route geometry');
  exact(owned, expectedOwned.map(attemptRoute), 'previously passed owned mate geometry');
  retained.forEach(r => validateRoute(r, r.id)); owned.forEach(r => validateRoute(r, r.id)); exact(geometry.retainedRouteIds, ids(retained), 'retained route IDs');
  requireValue(retained.length >= 177 && retained.length <= 186 && !retained.some(r => pairIds.includes(r.id)), 'scene-inventory', 'Immutable surrounding routes contain an owned route or omit the mandatory base');
  exact(report.plannedPreservation?.currentPlannedIds, [...ids(mandatory), ...ids(priorRight)], 'complete production planned inventory');
  for (const [category, rows] of [['nativeFluids', native], ['frozenProposal', proposal.routes]]) {
    const proof = report.plannedPreservation?.[category], records = rows.map(routeRecord);
    requireValue(proof?.exactlyEqual === true && proof.expectedDigest === sha(records) && proof.actualDigest === sha(records), 'scene-integrity', category + ' preservation evidence differs'); exact(proof.expectedIds, ids(rows), category + ' expected IDs'); exact(proof.actualIds, ids(rows), category + ' actual IDs');
  }
  const preserved = report.preservation;
  for (const key of ['originalGeometryUnchanged', 'nativeFluidRoutesUnchanged', 'allOriginalPhysicalMeshesPresent', 'terminalChangeExactlyDeclaredReplacement', 'frozenProposalGeometryUnchanged', 'batteryRoutesRetained', 'leftRoutesRetained', 'batteryServiceAllocationDeferred']) requireValue(preserved?.[key] === true, 'scene-preservation', 'H06 preservation assertion is absent: ' + key);
  requireValue(preserved.originalObstacleCount === physical.length && preserved.rightRoutesAdded === priorRight.length, 'scene-preservation', 'Preserved scene counts differ');
  const witness = report.failure.obstacle, allSolids = [...physical, ...proposal.reservations, ...terminals], witnessedSolid = allSolids.find(o => o.id === report.failure.obstacleId);
  const witnessedRoute = [...retained, ...owned].find(r => r.id === report.failure.otherRouteId);
  requireValue((witness && witnessedSolid && witness.id === witnessedSolid.id && witness.geometryDigest === sha(witnessedSolid) && equal(witness.geometry, witnessedSolid)) || (witnessedRoute && equal(report.failure.otherRoute, witnessedRoute)), 'right-witness', 'Failure needs an exact solid or retained-route witness from the complete frozen geometry');
  const attempted = report.rightAttempt, failedLine = interfaces.get(attempted.id);
  requireValue(Array.isArray(attempted.points) && attempted.points.length >= 2 && attempted.points.every(point) && Array.isArray(report.failure.collidingSegments) && report.failure.collidingSegments.length > 0, 'right-witness', 'Concrete failed route segments are required');
  for (const segment of report.failure.collidingSegments) {
    requireValue(Number.isInteger(segment.segment) && equal(segment.a, attempted.points[segment.segment]) && equal(segment.b, attempted.points[segment.segment + 1]) && segment.clearanceM < -1e-7, 'right-witness', 'Failed segment does not belong to the attempted path');
    if (!witnessedSolid) requireValue(Number.isInteger(segment.otherSegment) && equal(segment.otherA, witnessedRoute.points[segment.otherSegment]) && equal(segment.otherB, witnessedRoute.points[segment.otherSegment + 1]), 'right-witness', 'Other collision segment does not belong to its retained route');
    const actual = witnessedSolid ? segmentObstacleClearance(segment.a, segment.b, witnessedSolid, {radiusM: failedLine.radiusM, clearanceM: CLEARANCE_M, routeId: failedLine.id}) : segmentSegmentDistance(segment.a, segment.b, segment.otherA, segment.otherB).distanceM - failedLine.radiusM - witnessedRoute.radiusM - Math.max(CLEARANCE_M, witnessedRoute.clearanceM);
    requireValue(Number.isFinite(actual) && actual < -1e-7 && Math.abs(actual - segment.clearanceM) < 1e-8, 'right-witness', 'The stored failed segment no longer reproduces its collision');
  }
  const descriptor = {schema: 'orbital-data-center/H07-frozen-scene/1', configurationId: CONFIGURATION, stateId: state.id, stateDigest: sha(state), sourceFingerprint: expectedSource, pairIds, geometry: geometry.integrity, interfaceDigest: sha(state.interfaces), nativeRouteDigest: sha(native), proposalDigest: proposal.geometryDigest, rightReplayDigest: sha(rightReplay), clearanceM: CLEARANCE_M, terminationAllowancesM: Object.fromEntries(pair.map(row => [row.id, specs.get(row.harnessId).terminationAllowanceM])), ...(sourceProvenance ? {sourceTransition: sourceProvenance} : {})};
  return freeze({descriptor, identity: {sha256: sceneSha256, sourceFingerprint: expectedSource, stateId: state.id, geometryDigest: sha(descriptor)}, pair, physical, services: proposal.reservations, terminals, neighbors: retained, ownedBaselineRoutes: owned, pairIds, counts: {interfaces: 104, nativeFluidRoutes: 135, proposalRoutes: 34, payloadServices: 24, leftRoutes: 10, batteryRoutes: 8, priorRightRoutes: priorRight.length, ownedBaselineRoutes: owned.length, immutableRoutes: retained.length, physicalAndOperational: physical.length, serviceEnvelopes: proposal.reservations.length, finalTerminals: terminals.length}});
}

function exactKeys(value, keys, name) { requireValue(value && typeof value === 'object' && !Array.isArray(value) && equal(sorted(Object.keys(value)), sorted(keys)), 'candidate-schema', name + ' permits only ' + keys.join(', ')); }
export function validateCandidate(candidate, scene) {
  exactKeys(candidate, ['schema', 'scene', 'routes'], 'Candidate');
  requireValue(candidate.schema === PAIR_SCHEMA, 'candidate-schema', 'Unsupported static pair candidate schema');
  exactKeys(candidate.scene, ['sha256', 'sourceFingerprint', 'stateId', 'geometryDigest'], 'Candidate scene identity');
  requireValue(Object.keys(scene.identity).every(key => candidate.scene[key] === scene.identity[key]), 'candidate-scene-mismatch', 'Candidate is not bound to these exact H06 bytes, source, state and geometry');
  requireValue(Array.isArray(candidate.routes) && candidate.routes.length === 2 && new Set(candidate.routes.map(r => r?.id)).size === 2 && equal(sorted(candidate.routes.map(r => r?.id)), sorted(scene.pairIds)), 'candidate-pair', 'Candidate must supply both and only the witnessed pair IDs');
  for (const route of candidate.routes) {
    exactKeys(route, ['id', 'controls'], route.id);
    requireValue(Array.isArray(route.controls) && route.controls.length >= 2 && route.controls.length <= 4096 && route.controls.every(point), 'candidate-controls', 'Controls must be 2–4096 finite three-coordinate points: ' + route.id);
    const seen = new Set();
    for (let i = 0; i < route.controls.length; i++) {
      const key = JSON.stringify(route.controls[i]);
      requireValue(!seen.has(key) && (i === 0 || distance(route.controls[i], route.controls[i - 1]) > 1e-8), 'candidate-controls', 'Duplicate/collapsed controls would be silently filtered: ' + route.id);
      seen.add(key);
    }
  }
  return scene.pairIds.map(id => candidate.routes.find(route => route.id === id));
}

/** Static design accounting; no pre-existing rest/cut ceiling is asserted. */
export function staticLengthAccounting(shape, terminationAllowanceM) {
  const measuredChordLengthM = routeLength(shape.points), toleranceM = Math.max(1e-10, measuredChordLengthM * 1e-12);
  const modelCutLengthM = measuredChordLengthM + terminationAllowanceM, proposedDevelopedCutLengthM = shape.developedLengthM + terminationAllowanceM;
  requireValue(positive(shape.lengthM) && positive(shape.developedLengthM) && positive(modelCutLengthM) && positive(proposedDevelopedCutLengthM) && Number.isFinite(terminationAllowanceM) && terminationAllowanceM >= 0 && Math.abs(shape.lengthM - measuredChordLengthM) <= toleranceM && shape.developedLengthM + toleranceM >= measuredChordLengthM, 'length-accounting', 'Finite, consistent chord and analytical developed length plus source termination allowance are required');
  return {ok: true, staticAccountingOnly: true, renderedChordLengthM: measuredChordLengthM, analyticalDevelopedLengthM: shape.developedLengthM, chordDeficitM: shape.developedLengthM - measuredChordLengthM, terminationAllowanceM, modelCutLengthM, proposedDevelopedCutLengthM, conservationAssessed: false, fullWithdrawalProof: 'H08-unassessed', basis: 'The installed model reconciles the new rendered path plus termination allowance. The analytical fillet cut is reported separately. H07 imposes no independent maximum cut length and does not assert constant length through withdrawal.'};
}

export function auditStaticPair(scene, candidate) {
  const rows = validateCandidate(candidate, scene), lengths = [], constructionIssues = [];
  const routes = rows.map(row => {
    const line = scene.pair.find(r => r.id === row.id), shape = roundedConnectionRoute(row.controls, line.bendRadiusM, 8);
    if (shape.bendLimited) constructionIssues.push({code: 'bend-limited-construction', routeId: row.id});
    lengths.push({id: row.id, ...staticLengthAccounting(shape, scene.descriptor.terminationAllowancesM[row.id])});
    return {id: row.id, points: shape.points, radiusM: line.radiusM, clearanceM: CLEARANCE_M, from: {position: line.from, normal: line.fromNormal}, to: {position: line.to, normal: line.toNormal}, minBendRadiusM: line.bendRadiusM, minimumBendRadiusM: shape.minimumBendRadiusM, bendRadiusBasis: 'constructed-circular-fillets', renderedCenterlineMismatchM: 0};
  });
  const commonSolids = [...scene.physical, ...scene.services, ...scene.terminals.filter(o => !scene.pairIds.includes(o.lineId))];
  const pairAudit = auditRoutes(routes, commonSolids, {clearanceM: CLEARANCE_M, collisionToleranceM: 0, expectedRouteIds: scene.pairIds, expectedObstacleIds: ids(commonSolids), maxIssues: 100});
  const neighboringClearance = routes.map(route => ({id: route.id, excludedOwnTerminalIds: ids(scene.terminals.filter(o => o.lineId === route.id)), ...routeClearance(route, [...scene.physical, ...scene.services, ...scene.terminals.filter(o => o.lineId !== route.id)], {otherRoutes: scene.neighbors, stopAtCollision: false})}));
  return {ok: constructionIssues.length === 0 && pairAudit.ok && neighboringClearance.every(r => r.ok) && lengths.every(r => r.ok), constructionIssues, pairAudit, neighboringClearance, lengths, constructedRoutes: routes.map(routeRecord), scope: 'Exactly the selected static pair at deployment 1 and zero withdrawal; all immutable geometry retained. No service, motion, production or publication acceptance is implied.'};
}

export function readSceneFile(filename) {
  const bytes = readFileSync(filename), data = bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes;
  return {report: JSON.parse(data.toString('utf8')), sha256: sha(bytes), bytes: bytes.length};
}
function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i];
    requireValue(['--scene', '--candidate', '--expect-source', '--expect-scene', '--source-transition', '--expect-transition', '--output'].includes(name) && !options[name] && args[i + 1] && !args[i + 1].startsWith('--'), 'arguments', 'Use --scene <H06.json.gz> --candidate <pair.json> --expect-source <sha256> [--expect-scene <sha256>] [--source-transition <declaration.json> --expect-transition <sha256>] --output <NEW-receipt.json>');
    options[name] = args[i + 1];
  }
  for (const name of ['--scene', '--candidate', '--expect-source', '--output']) requireValue(options[name], 'arguments', 'Missing ' + name);
  requireValue(hash(options['--expect-source']) && (!options['--expect-scene'] || hash(options['--expect-scene'])), 'arguments', 'Expected identities must be SHA256 values');
  requireValue(Boolean(options['--source-transition']) === Boolean(options['--expect-transition']) && (!options['--expect-transition'] || hash(options['--expect-transition'])), 'arguments', 'A source transition requires both a file and its exact expected SHA256');
  const output = path.resolve(options['--output']);
  requireValue(/\.json$/i.test(output) && !existsSync(output) && !existsSync(output + '.tmp'), 'arguments', 'Output and its atomic temporary path must be new JSON receipt paths');
  const inputs = [options['--scene'], options['--candidate'], options['--source-transition']].filter(Boolean).map(file => realpathSync(path.resolve(file)));
  let parent = path.dirname(output), tail = path.basename(output);
  while (!existsSync(parent)) { tail = path.join(path.basename(parent), tail); parent = path.dirname(parent); }
  const canonical = path.join(realpathSync(parent), tail);
  requireValue(!inputs.includes(canonical) && !inputs.includes(canonical + '.tmp'), 'arguments', 'Output must not alias a scene, candidate or source-transition input');
  return options;
}
function main() {
  const started = Date.now(); let options, output, transitionInput;
  const receipt = {schema: 'orbital-data-center/H07-static-pair-receipt/1', startedAt: new Date(started).toISOString(), runtimeCapSeconds: 300, externalRuntimeCapRequired: true, status: 'incomplete', completed: false, accepted: false, phase: 'initializing', sourceStart: null, sourceFinish: null, checkerStart: null, checkerFinish: null, inputs: null};
  const source = () => routingSourceFingerprint({entries: ['orbital-right-bank-diagnostic.mjs']});
  const checker = () => routingSourceFingerprint({entries: ['orbital-right-bank-pair-checks.mjs']});
  const save = phase => { receipt.phase = phase; receipt.elapsedMs = Date.now() - started; if (output) { writeFileSync(output + '.tmp', JSON.stringify(receipt, null, 2) + '\n'); renameSync(output + '.tmp', output); } };
  try {
    options = parseArgs(process.argv.slice(2)); output = path.resolve(options['--output']); mkdirSync(path.dirname(output), {recursive: true}); save('before-reading-inputs');
    receipt.sourceStart = source(); receipt.checkerStart = checker();
    const loaded = readSceneFile(options['--scene']), candidateBytes = readFileSync(options['--candidate']);
    transitionInput = options['--source-transition'] ? readSourceTransitionInput(options['--source-transition'], {root: fileURLToPath(new URL('.', import.meta.url)), expectedSha256: options['--expect-transition']}) : null;
    receipt.inputs = {scene: {path: path.resolve(options['--scene']), sha256: loaded.sha256, bytes: loaded.bytes}, candidate: {path: path.resolve(options['--candidate']), sha256: sha(candidateBytes), bytes: candidateBytes.length}, expectedSource: options['--expect-source'], expectedScene: options['--expect-scene'] ?? null, ...(transitionInput ? {sourceTransition: transitionInput.record} : {})};
    save('before-validating-scene');
    requireValue(!options['--expect-scene'] || options['--expect-scene'] === loaded.sha256, 'scene-mismatch', 'Scene bytes differ from --expect-scene');
    const scene = extractFrozenScene(loaded.report, {sceneSha256: loaded.sha256, sceneBytes: loaded.bytes, expectedSource: options['--expect-source'], currentSource: receipt.sourceStart, sourceTransition: transitionInput?.value ?? null, sourceTransitionRecord: transitionInput?.record ?? null});
    receipt.sceneIdentity = scene.identity; receipt.sceneDescriptor = scene.descriptor; receipt.inventory = scene.counts;
    const candidate = JSON.parse(candidateBytes.toString('utf8'));
    validateCandidate(candidate, scene); save('before-static-pair-audit');
    receipt.checks = auditStaticPair(scene, candidate); receipt.accepted = receipt.checks.ok;
    receipt.status = receipt.accepted ? 'static-pair-accepted' : 'static-pair-rejected';
  } catch (error) {
    receipt.accepted = false; receipt.status = error instanceof ContractError ? 'invalid-input' : 'fixture-error';
    receipt.error = {name: error.name, code: error.code ?? 'fixture-error', message: error.message, details: error.details ?? null};
  }
  try {
    receipt.sourceFinish = source(); receipt.checkerFinish = checker();
    receipt.unchangedSource = sameRoutingSourceFingerprint(receipt.sourceStart, receipt.sourceFinish);
    receipt.unchangedChecker = sameRoutingSourceFingerprint(receipt.checkerStart, receipt.checkerFinish);
    receipt.unchangedInputs = !!receipt.inputs && sha(readFileSync(receipt.inputs.scene.path)) === receipt.inputs.scene.sha256 && sha(readFileSync(receipt.inputs.candidate.path)) === receipt.inputs.candidate.sha256 && (!transitionInput || sha(readFileSync(transitionInput.record.path)) === transitionInput.record.sha256 && readFileSync(transitionInput.record.path).length === transitionInput.record.bytes);
    if (receipt.accepted && (!receipt.unchangedSource || !receipt.unchangedChecker || !receipt.unchangedInputs)) { receipt.accepted = false; receipt.status = 'identity-changed-during-check'; }
    if (Date.now() - started > 300000) { receipt.accepted = false; receipt.status = 'runtime-cap-exceeded'; }
    receipt.completed = true; receipt.finishedAt = new Date().toISOString(); save('finished');
  } catch (error) {
    receipt.accepted = false; receipt.status = 'finalization-error'; receipt.completed = false; receipt.finalizationError = {name: error.name, message: error.message};
    try { save('finalization-error'); } catch { /* The last atomic incomplete receipt is retained. */ }
  }
  console.log(JSON.stringify({status: receipt.status, completed: receipt.completed, accepted: receipt.accepted, output: output ?? null, error: receipt.error ?? receipt.finalizationError ?? null, elapsedMs: Date.now() - started}));
  if (!receipt.accepted) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
