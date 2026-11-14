import {types as nodeTypes} from 'node:util';
import {auditRoutes, createRoutingCollisionCache, segmentSegmentDistance, ownRoutingObstacleList} from './dist/routing-audit.js';
import {matingReservoirSweptObstacles, sampleMatingReservoir} from './dist/electrical-service-loops.js';

/**
 * A source-independent acceptance kernel for one explicitly owned route group.
 * It certifies a declared affine model over two independent, complete strokes.
 * The scene/CLI owner must bind that model and the participant manifest to the
 * actual installation and preserve its source/input fingerprints.
 *
 * No sampled callback can create a proof. Route motion is either exactly
 * stationary, exactly rigid translation, or the existing analytically proved
 * mating-reservoir construction. Solids and their apertures translate rigidly.
 * Source samples are a separate diagnostic API and never acquire continuous
 * acceptance. The certifier constructs every pose internally from its proof.
 */
export const WITHDRAWAL_RECTANGLE_SCHEMA = 'orbital-data-center/H08-withdrawal-rectangle/1';
const proofs = new WeakMap();
const ZERO = Object.freeze([0, 0, 0]);
const add = (a, b) => a.map((x, i) => x + b[i]);
const sub = (a, b) => a.map((x, i) => x - b[i]);
const mul = (a, x) => a.map(v => v * x);
const norm = a => Math.hypot(...a);
const distance = (a, b) => norm(sub(a, b));
const point = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
const same = (a, b) => {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => Object.hasOwn(b, k) && same(a[k], b[k]));
};
const omit = (object, keys) => Object.fromEntries(Object.entries(object).filter(([k]) => !keys.includes(k)));

class ContractError extends Error {
  constructor(code, message, details = {}) { super(message); this.code = code; this.details = details; }
}
const requireValue = (test, code, message, details) => { if (!test) throw new ContractError(code, message, details); };
function exactKeys(value, keys, name) {
  requireValue(value && typeof value === 'object' && !Array.isArray(value) && same(Object.keys(value).sort(), [...keys].sort()), 'invalid-contract', name + ' requires exactly ' + keys.join(', '));
}
// BEGIN trusted recursive freeze
// This engineering kernel is consumed by Node CLIs. Effect-free native brand
// checks exclude proxies and native exotics before inspecting ordinary own-data
// records/arrays; prototype shape alone is not a recursive-immutability proof.
const completedFreezes = new WeakSet();
let activeFreezeTraversal = null;
const nonDataFreezeBrands = [
  'isAnyArrayBuffer', 'isArrayBufferView', 'isArgumentsObject', 'isBoxedPrimitive',
  'isDate', 'isMap', 'isMapIterator', 'isModuleNamespaceObject', 'isNativeError',
  'isPromise', 'isRegExp', 'isSet', 'isSetIterator', 'isWeakMap', 'isWeakSet',
  'isGeneratorObject', 'isExternal', 'isKeyObject', 'isCryptoKey',
].map(name => nodeTypes[name]).filter(test => typeof test === 'function');
function ordinaryFreezeData(value) {
  if (nodeTypes.isProxy(value)) return false;
  const array = Array.isArray(value), prototype = Object.getPrototypeOf(value);
  if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) return false;
  if (!array && nonDataFreezeBrands.some(test => test(value))) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    const descriptor = descriptors[key];
    if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value === 'function' ||
        typeof key !== 'string' || (!descriptor.enumerable && !(array && key === 'length'))) return false;
  }
  return true;
}
function freeze(value) {
  const parent = activeFreezeTraversal;
  const traversal = {eligible: parent === null, pending: []}, seen = new WeakSet();
  // A getter/proxy can re-enter this helper. Neither invocation may publish
  // completion while the outer graph still has outstanding work or can throw.
  if (parent) parent.eligible = false;
  activeFreezeTraversal = traversal;
  function visit(current) {
    if (!current || typeof current !== 'object') {
      if (typeof current === 'function') traversal.eligible = false;
      return current;
    }
    if (seen.has(current) || completedFreezes.has(current)) return current;
    seen.add(current);
    // Inspect before Object.values: a getter can replace itself during its read.
    // Once tainted, use only the original traversal operations for the rest.
    if (traversal.eligible && !ordinaryFreezeData(current)) traversal.eligible = false;
    for (const child of Object.values(current)) visit(child);
    Object.freeze(current);
    if (traversal.eligible) traversal.pending.push(current);
    return current;
  }
  try {
    const result = visit(value);
    // Commit the entire successful eligible graph together. A cyclic child
    // frozen before an ancestor fails must never become a trusted shortcut.
    if (traversal.eligible) for (const current of traversal.pending) completedFreezes.add(current);
    return result;
  } finally {
    activeFreezeTraversal = parent;
  }
}
// END trusted recursive freeze
function ids(rows, name) {
  requireValue(Array.isArray(rows) && rows.every(x => typeof x === 'string' && x.length > 0) && new Set(rows).size === rows.length, 'invalid-participant-manifest', name + ' must contain unique nonempty IDs.');
  return [...rows];
}
function sameIds(actual, expected, name) {
  const left = ids(actual, name + ' actual'), right = ids(expected, name + ' expected');
  requireValue(left.length === right.length && left.every(x => right.includes(x)), 'participant-inventory-mismatch', name + ' differs from the complete declared inventory.', {missing: right.filter(x => !left.includes(x)), unexpected: left.filter(x => !right.includes(x))});
}
function validateDomain(domain) {
  exactKeys(domain, ['from', 'to'], 'Withdrawal domain');
  for (const key of ['from', 'to']) requireValue(Array.isArray(domain[key]) && domain[key].length === 2 && domain[key][0] === 0 && Number.isFinite(domain[key][1]) && domain[key][1] > 0, 'invalid-withdrawal-domain', 'Both independent strokes must start at zero and have finite positive full travel.', {parameter: key});
  requireValue(Number.isFinite(domain.from[1] * domain.to[1]) && domain.from[1] * domain.to[1] > 0 && domain.from[1] / 2 ** 30 > 0 && domain.to[1] / 2 ** 30 > 0, 'unrepresentable-withdrawal-domain', 'The complete area and bounded dyadic subdivisions must remain representable.');
  return {from: [...domain.from], to: [...domain.to]};
}
function coefficient(record, key) {
  requireValue(point(record[key]), 'invalid-motion-coefficient', key + ' must be a finite 3D vector.', {id: record.id});
  return [...record[key]];
}
function shifted(p, motion, f, t) { return add(p, add(mul(motion.from, f), mul(motion.to, t))); }
function moving(coefficients) { return coefficients.some(c => norm(c.from) > 0 || norm(c.to) > 0); }
function numericPadding(points, coefficients, domain) {
  const scale = points.reduce((m, x) => Math.max(m, norm(x)), 1) + domain.from[1] * coefficients.reduce((m, c) => Math.max(m, norm(c.from)), 0) + domain.to[1] * coefficients.reduce((m, c) => Math.max(m, norm(c.to)), 0);
  return 256 * Number.EPSILON * scale;
}
function solidPoints(solid) {
  const values = [];
  for (const key of ['min', 'max', 'center', 'a', 'b']) if (solid[key] !== undefined) { requireValue(point(solid[key]), 'invalid-solid-geometry', 'Solid position must be a finite vector.', {id: solid.id, key}); values.push(solid[key]); }
  if (solid.bounds) { requireValue(point(solid.bounds.min) && point(solid.bounds.max), 'invalid-solid-geometry', 'Solid bounds are invalid.', {id: solid.id}); values.push(solid.bounds.min, solid.bounds.max); }
  if (solid.triangles) { requireValue(Array.isArray(solid.triangles) && solid.triangles.every(x => Array.isArray(x) && x.length === 3 && x.every(point)), 'invalid-solid-geometry', 'Mesh triangles are invalid.', {id: solid.id}); for (const triangle of solid.triangles) for (const p of triangle) values.push(p); }
  if (solid.sourceVertices) { requireValue(Array.isArray(solid.sourceVertices) && solid.sourceVertices.every(point), 'invalid-solid-geometry', 'Source vertices are invalid.', {id: solid.id}); for (const p of solid.sourceVertices) values.push(p); }
  for (const aperture of solid.apertures || []) values.push(...solidPoints(aperture));
  requireValue(values.length > 0, 'invalid-solid-geometry', 'A solid/aperture needs explicit positional geometry.', {id: solid.id});
  return values;
}
function validateSolidBounds(solid) {
  const positions = solidPoints(solid), low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
  const include = p => { for (let k = 0; k < 3; k++) { low[k] = Math.min(low[k], p[k]); high[k] = Math.max(high[k], p[k]); } };
  if (solid.type === 'box') {
    requireValue(point(solid.min) && point(solid.max) && solid.min.every((x, k) => x <= solid.max[k]), 'invalid-solid-geometry', 'Box geometry is invalid.', {id: solid.id}); include(solid.min); include(solid.max);
    for (const p of solid.sourceVertices || []) requireValue(p.every((x, k) => x >= solid.min[k] - 1e-12 && x <= solid.max[k] + 1e-12), 'inconsistent-source-vertices', 'Analytic box does not enclose its source vertices.', {id: solid.id});
  }
  else if (solid.type === 'capsule') {
    requireValue(point(solid.a) && point(solid.b) && Number.isFinite(solid.radiusM) && solid.radiusM > 0, 'invalid-solid-geometry', 'Capsule geometry is invalid.', {id: solid.id});
    include(solid.a.map((x, k) => Math.min(x, solid.b[k]) - solid.radiusM)); include(solid.a.map((x, k) => Math.max(x, solid.b[k]) + solid.radiusM));
    for (const p of solid.sourceVertices || []) requireValue(segmentSegmentDistance(p, p, solid.a, solid.b).distanceM <= solid.radiusM + 1e-12, 'inconsistent-source-vertices', 'Recovered capsule does not enclose its source vertices.', {id: solid.id});
  } else if (solid.type === 'cylinder') {
    requireValue(point(solid.center) && point(solid.axis) && Math.abs(norm(solid.axis) - 1) <= 1e-8 && Number.isFinite(solid.radiusM) && solid.radiusM > 0 && Number.isFinite(solid.halfLengthM) && solid.halfLengthM >= 0, 'invalid-solid-geometry', 'Cylinder geometry is invalid.', {id: solid.id});
    const extent = solid.axis.map(x => Math.abs(x) * solid.halfLengthM + Math.sqrt(Math.max(0, 1 - x * x)) * solid.radiusM); include(sub(solid.center, extent)); include(add(solid.center, extent));
    for (const p of solid.sourceVertices || []) {
      const relative = sub(p, solid.center), axial = relative.reduce((sum, x, k) => sum + x * solid.axis[k], 0), radial = Math.sqrt(Math.max(0, relative.reduce((sum, x) => sum + x * x, 0) - axial * axial));
      requireValue(Math.abs(axial) <= solid.halfLengthM + 1e-12 && radial <= solid.radiusM + 1e-12, 'inconsistent-source-vertices', 'Analytic cylinder does not enclose its source vertices.', {id: solid.id});
    }
  } else if (solid.type === 'obb') {
    requireValue(point(solid.center) && point(solid.halfSize) && solid.halfSize.every(x => x >= 0) && Array.isArray(solid.axes) && solid.axes.length === 3 && solid.axes.every(point) && solid.axes.every(a => Math.abs(norm(a) - 1) <= 1e-8) && solid.axes.every((a, i) => solid.axes.every((b, j) => i === j || Math.abs(a.reduce((s, x, k) => s + x * b[k], 0)) <= 1e-8)), 'invalid-solid-geometry', 'OBB axes or dimensions are invalid.', {id: solid.id});
    const extent = [0, 1, 2].map(k => solid.axes.reduce((s, a, j) => s + Math.abs(a[k]) * solid.halfSize[j], 0)); include(sub(solid.center, extent)); include(add(solid.center, extent));
    for (const p of solid.sourceVertices || []) requireValue(solid.axes.every((axis, k) => Math.abs(sub(p, solid.center).reduce((sum, x, j) => sum + x * axis[j], 0)) <= solid.halfSize[k] + 1e-12), 'inconsistent-source-vertices', 'Analytic OBB does not enclose its source vertices.', {id: solid.id});
  } else if (solid.type === 'mesh') {
    requireValue(Array.isArray(solid.triangles) && solid.triangles.length > 0, 'invalid-solid-geometry', 'A mesh requires its explicit triangles.', {id: solid.id});
    const vertices = solid.sourceVertices && new Set(solid.sourceVertices.map(p => JSON.stringify(p)));
    for (const triangle of solid.triangles) for (const p of triangle) { include(p); if (vertices) requireValue(vertices.has(JSON.stringify(p)), 'inconsistent-source-vertices', 'A mesh triangle differs from its actual source vertices.', {id: solid.id}); }
  }
  for (const p of solid.sourceVertices || []) include(p);
  if (solid.bounds) {
    requireValue(point(solid.bounds.min) && point(solid.bounds.max) && solid.bounds.min.every((x, k) => x <= low[k] + 1e-12 && solid.bounds.max[k] >= high[k] - 1e-12), 'nonconservative-solid-bounds', 'Supplied bounds do not enclose the actual physical geometry.', {id: solid.id, required: {min: low, max: high}});
  } else requireValue(['box', 'capsule', 'mesh'].includes(solid.type), 'missing-solid-bounds', 'This solid type requires explicit conservative bounds.', {id: solid.id});
  return positions;
}
function translateSolid(solid, motion, f, t) {
  if (norm(motion.from) === 0 && norm(motion.to) === 0) return solid;
  const out = {...solid};
  for (const key of ['min', 'max', 'center', 'a', 'b']) if (solid[key] !== undefined) out[key] = shifted(solid[key], motion, f, t);
  if (solid.bounds) out.bounds = {min: shifted(solid.bounds.min, motion, f, t), max: shifted(solid.bounds.max, motion, f, t)};
  if (solid.triangles) out.triangles = solid.triangles.map(triangle => triangle.map(p => shifted(p, motion, f, t)));
  if (solid.sourceVertices) out.sourceVertices = solid.sourceVertices.map(p => shifted(p, motion, f, t));
  if (solid.apertures) out.apertures = solid.apertures.map(aperture => translateSolid(aperture, motion, f, t));
  return out;
}
function moveEndpoint(endpoint, coefficient, f, t) {
  return endpoint ? {...endpoint, position: shifted(endpoint.position, coefficient, f, t)} : endpoint;
}
function motionRows(rows, expected, name) {
  requireValue(Array.isArray(rows), 'invalid-motion-manifest', name + ' must be an array.');
  sameIds(rows.map(x => x?.id), expected, name);
  return new Map(rows.map(x => [x.id, structuredClone(x)]));
}

/**
 * Freeze the supplied baseline by reference, retaining shared immutable meshes.
 * All routes/solids require explicit motion rows. No ID omission means stationary.
 * parameterMap maps a cable's physical from/to plugs to the two bank parameters;
 * null denotes a plug that does not participate in either selected bank.
 */
export function createWithdrawalAffineProof({domain, baseline, participantManifest, ownedRouteIds, routeMotions, obstacleMotions}) {
  const d = validateDomain(domain);
  exactKeys(participantManifest, ['routeIds', 'obstacleIds', 'physicalObstacleIds', 'serviceObstacleIds', 'terminalObstacleIds', 'movingRouteIds', 'movingObstacleIds'], 'Participant manifest');
  const manifest = Object.fromEntries(Object.entries(participantManifest).map(([k, v]) => [k, ids(v, k)]));
  requireValue(baseline && Array.isArray(baseline.routes) && baseline.routes.length > 0 && Array.isArray(baseline.obstacles), 'invalid-baseline', 'The baseline needs its complete route and obstacle arrays.');
  sameIds(baseline.routes.map(x => x?.id), manifest.routeIds, 'Routes');
  sameIds(baseline.obstacles.map(x => x?.id), manifest.obstacleIds, 'Obstacles');
  const categoryIds = [...manifest.physicalObstacleIds, ...manifest.serviceObstacleIds, ...manifest.terminalObstacleIds];
  sameIds(categoryIds, manifest.obstacleIds, 'Disjoint physical/service/terminal partition');
  const owned = ids(ownedRouteIds, 'ownedRouteIds');
  requireValue(owned.length > 0 && owned.every(id => manifest.routeIds.includes(id)), 'invalid-owned-scope', 'Owned routes must be a nonempty explicit subset of the complete route registry.');
  requireValue(manifest.movingRouteIds.every(id => manifest.routeIds.includes(id)) && manifest.movingObstacleIds.every(id => manifest.obstacleIds.includes(id)), 'invalid-participant-manifest', 'Moving IDs must belong to the complete inventory.');
  const routeRows = motionRows(routeMotions, manifest.routeIds, 'Route motion records'), obstacleRows = motionRows(obstacleMotions, manifest.obstacleIds, 'Obstacle motion records');
  const routeModels = new Map(), obstacleModels = new Map();
  for (const route of baseline.routes) {
    requireValue(Array.isArray(route.points) && route.points.length >= 2 && route.points.every(point) && Number.isFinite(route.radiusM) && route.radiusM > 0 && Number.isFinite(route.clearanceM) && route.clearanceM >= 0, 'invalid-route-geometry', 'Every retained route needs finite points, radius and explicit clearance.', {id: route.id});
    for (const end of ['from', 'to']) if (route[end]) requireValue(point(route[end].position), 'invalid-route-endpoint', 'An endpoint position is required.', {id: route.id, end});
    const row = routeRows.get(route.id); let model;
    if (row.kind === 'stationary') {
      exactKeys(row, ['id', 'kind'], 'Stationary route motion');
      model = {kind: row.kind, base: route, points: route.points, coefficients: route.points.map(() => ({from: ZERO, to: ZERO})), enclosureM: 0, sample: () => route};
    } else if (row.kind === 'rigid-translation') {
      exactKeys(row, ['id', 'kind', 'fromCoefficient', 'toCoefficient'], 'Rigid route motion');
      const c = {from: coefficient(row, 'fromCoefficient'), to: coefficient(row, 'toCoefficient')}, coefficients = route.points.map(() => c);
      model = {kind: row.kind, base: route, points: route.points, coefficients, enclosureM: numericPadding(route.points, coefficients, d), sample: (f, t) => ({...route, points: route.points.map(p => shifted(p, c, f, t)), ...(route.from ? {from: moveEndpoint(route.from, c, f, t)} : {}), ...(route.to ? {to: moveEndpoint(route.to, c, f, t)} : {})})};
    } else if (row.kind === 'mating-reservoir') {
      exactKeys(row, ['id', 'kind', 'allocation', 'parameterMap'], 'Mating-reservoir route motion');
      exactKeys(row.parameterMap, ['from', 'to'], 'Reservoir parameter map');
      const allocation = freeze(row.allocation), map = row.parameterMap;
      requireValue(['from', 'to', null].includes(map.from) && ['from', 'to', null].includes(map.to), 'invalid-reservoir-parameter-map', 'Each physical plug maps to one selected bank parameter or null.', {id: route.id});
      requireValue(allocation?.fromTravelM === (map.from ? d[map.from][1] : 0) && allocation?.toTravelM === (map.to ? d[map.to][1] : 0), 'reservoir-domain-mismatch', 'The allocation must contain the complete source-bound strokes of its mapped plugs.', {id: route.id});
      const sweep = matingReservoirSweptObstacles(allocation, {id: route.id, radiusM: route.radiusM, clearanceM: route.clearanceM});
      requireValue(sweep.ok, 'unproved-affine-construction', 'The unchanged full-rectangle reservoir proof rejected this allocation.', {id: route.id, issues: sweep.issues});
      for (let i = 1; i < allocation.controls.length - 1; i++) {
        const before = sub(allocation.controls[i], allocation.controls[i - 1]), after = sub(allocation.controls[i + 1], allocation.controls[i]), u = mul(before, 1 / norm(before)), v = mul(after, 1 / norm(after)), angle = Math.acos(Math.max(-1, Math.min(1, u.reduce((s, x, k) => s + x * v[k], 0))));
        requireValue(angle >= 1e-5 || distance(u, v) <= 1e-12, 'unrounded-curvature-corner', 'The local-self proof requires every genuine turn to receive its full circular fillet.', {id: route.id, corner: i, angle});
      }
      const shapeAt = (f, t) => sampleMatingReservoir(allocation, {fromWithdrawalM: map.from === 'from' ? f : map.from === 'to' ? t : 0, toWithdrawalM: map.to === 'from' ? f : map.to === 'to' ? t : 0});
      const baseShape = shapeAt(0, 0), a = shapeAt(d.from[1], 0), b = shapeAt(0, d.to[1]), ab = shapeAt(d.from[1], d.to[1]);
      requireValue([a, b, ab].every(s => !s.bendLimited && s.points.length === baseShape.points.length), 'affine-topology-change', 'The proved construction changed rounded-point topology.', {id: route.id});
      const affineNumericalErrorM = 4 * (sweep.proof.maximumNumericalErrorM + sweep.proof.maximumCornerResidualM + sweep.proof.coordinateRoundoffM), enclosureM = affineNumericalErrorM + sweep.proof.bufferPaddingM;
      requireValue(route.points.length === baseShape.points.length && route.points.every((p, i) => distance(p, baseShape.points[i]) <= enclosureM), 'reservoir-baseline-mismatch', 'The declared baseline does not match the proved reservoir construction.', {id: route.id});
      requireValue(route.minBendRadiusM === allocation.bendRadiusM && route.bendRadiusBasis === 'constructed-circular-fillets' && Number.isFinite(route.restLengthM) && Math.abs(route.restLengthM - baseShape.lengthM) <= 1e-8, 'reservoir-allocation-mismatch', 'The route must retain the proved bend and baseline length allocation.', {id: route.id});
      for (const end of ['from', 'to']) requireValue(route[end] && point(route[end].normal) && distance(route[end].normal, allocation[end + 'Normal']) <= 1e-10 && distance(route[end].position, end === 'from' ? baseShape.points[0] : baseShape.points.at(-1)) <= enclosureM, 'reservoir-endpoint-mismatch', 'Both physical endpoint datums must agree with the allocation.', {id: route.id, end});
      const coefficients = baseShape.points.map((p, i) => ({from: mul(sub(a.points[i], p), 1 / d.from[1]), to: mul(sub(b.points[i], p), 1 / d.to[1])}));
      requireValue(ab.points.every((p, i) => distance(p, shifted(baseShape.points[i], coefficients[i], d.from[1], d.to[1])) <= enclosureM), 'affine-coefficient-mismatch', 'The derived coefficients disagree with the analytically proved construction.', {id: route.id});
      const endCoefficient = end => ({from: map[end] === 'from' ? allocation[end + 'Normal'] : ZERO, to: map[end] === 'to' ? allocation[end + 'Normal'] : ZERO});
      // The reservoir's length proof does not require its moving control
      // prefixes/suffixes to respect physical endpoint ownership. Derive both
      // endpoint coefficients directly from the actual control construction;
      // each physical datum must have its mapped normal and zero cross term.
      // Float32 jacket padding cannot excuse a physical cross-coupling error.
      for (const end of ['from', 'to']) for (const parameter of ['from', 'to']) {
        const index = end === 'from' ? 0 : allocation.controls.length - 1, firstActive = map.from === parameter, lastActive = map.to === parameter;
        const middle = index >= allocation.first && index <= allocation.last ? mul(allocation.axis, (Number(firstActive) + Number(lastActive)) / 2) : ZERO;
        const actual = add(middle, add(firstActive && index <= (allocation.fromPrefixLast ?? 0) ? allocation.fromNormal : ZERO, lastActive && index >= (allocation.toSuffixFirst ?? allocation.controls.length - 1) ? allocation.toNormal : ZERO));
        const expected = endCoefficient(end)[parameter], roundoff = 64 * Number.EPSILON * (1 + norm(actual) + norm(expected)), derived = end === 'from' ? coefficients[0][parameter] : coefficients.at(-1)[parameter];
        requireValue(distance(actual, expected) <= roundoff && distance(derived, actual) * d[parameter][1] <= affineNumericalErrorM, 'reservoir-endpoint-coefficient-mismatch', 'A physical endpoint must follow only its mapped bank normal throughout the complete rectangle.', {id: route.id, end, parameter, actualCoefficient: actual, expectedCoefficient: expected, derivedCoefficient: derived, coefficientRoundoff: roundoff, derivedDisplacementEnclosureM: affineNumericalErrorM});
      }
      const R = allocation.bendRadiusM, maximumChordDeviationM = R * (1 - Math.cos(Math.PI / 32)), chordDeficitM = Math.max(0, baseShape.developedLengthM - baseShape.lengthM), corners = [baseShape, a, b, ab].map(s => s.points), selfPieces = [];
      // Only a supplementary self-neighborhood proof uses these subdivisions.
      // They preserve each original straight chord exactly and do not alter any
      // candidate, rendered path, or auditRoutes input.
      for (let i = 0; i < baseShape.points.length - 1; i++) {
        const maximumLength = Math.max(...corners.map(ps => distance(ps[i], ps[i + 1]))) + 2 * affineNumericalErrorM, parts = Math.max(1, Math.ceil(maximumLength / (Math.PI * R / 8)));
        requireValue(selfPieces.length + parts <= 2048, 'self-neighborhood-size-budget', 'The bounded local-self proof would exceed2048 pieces.', {id: route.id});
        for (let j = 0; j < parts; j++) selfPieces.push({index: i, fraction: j / parts});
      }
      selfPieces.push({index: baseShape.points.length - 2, fraction: 1});
      model = {kind: row.kind, base: route, points: baseShape.points, coefficients, enclosureM, affineNumericalErrorM, sweepProof: sweep.proof, parameterMap: map, radiusOfCurvatureM: R, maximumChordDeviationM, chordDeficitM, selfPieces, sample: (f, t) => {
        const shape = shapeAt(f, t);
        requireValue(!shape.bendLimited && shape.points.length === baseShape.points.length, 'affine-topology-change', 'A proved reservoir changed construction topology.', {id: route.id});
        return {...route, points: shape.points, minimumBendRadiusM: shape.minimumBendRadiusM, from: moveEndpoint(route.from, endCoefficient('from'), f, t), to: moveEndpoint(route.to, endCoefficient('to'), f, t)};
      }};
    } else throw new ContractError('unsupported-route-motion-proof', 'Only stationary, rigid-translation and analytically proved mating-reservoir routes are supported.', {id: route.id, kind: row.kind});
    freeze(model.points); freeze(model.coefficients); routeModels.set(route.id, model);
  }
  for (const obstacle of baseline.obstacles) {
    requireValue(['box', 'obb', 'mesh', 'capsule', 'cylinder'].includes(obstacle.type), 'unsupported-solid', 'The physical obstacle must use a supported explicit shape.', {id: obstacle.id});
    const row = obstacleRows.get(obstacle.id), positions = validateSolidBounds(obstacle); let c;
    if (row.kind === 'stationary') { exactKeys(row, ['id', 'kind'], 'Stationary solid motion'); c = {from: ZERO, to: ZERO}; }
    else if (row.kind === 'rigid-translation') { exactKeys(row, ['id', 'kind', 'fromCoefficient', 'toCoefficient'], 'Rigid solid motion'); c = {from: coefficient(row, 'fromCoefficient'), to: coefficient(row, 'toCoefficient')}; }
    else throw new ContractError('unsupported-solid-motion-proof', 'Solids and all their apertures must be stationary or translate rigidly together.', {id: obstacle.id, kind: row.kind});
    obstacleModels.set(obstacle.id, {kind: row.kind, base: obstacle, points: positions, coefficients: [c], enclosureM: Math.max(1e-12, moving([c]) ? numericPadding(positions, [c], d) : 0), sample: (f, t) => translateSolid(obstacle, c, f, t)});
  }
  sameIds([...routeModels].filter(([, m]) => moving(m.coefficients)).map(([id]) => id), manifest.movingRouteIds, 'Moving route participation');
  sameIds([...obstacleModels].filter(([, m]) => moving(m.coefficients)).map(([id]) => id), manifest.movingObstacleIds, 'Moving solid participation');
  for (const key of ['from', 'to']) requireValue([...routeModels.values(), ...obstacleModels.values()].some(m => m.coefficients.some(c => norm(c[key]) > 0)), 'unrepresented-withdrawal-parameter', 'Each independent bank parameter must have an actual moving participant.', {parameter: key});
  const terminalIds = new Set(manifest.terminalObstacleIds);
  for (const obstacle of baseline.obstacles) if (terminalIds.has(obstacle.id)) requireValue(typeof obstacle.lineId === 'string' && obstacle.lineId.length > 0, 'unowned-terminal-record', 'Every terminal record must retain its explicit owner; foreign owners need not be routed by this task.', {id: obstacle.id, lineId: obstacle.lineId});
  freeze(baseline); freeze(manifest); freeze(d); freeze(owned);
  const token = freeze({schema: 'orbital-data-center/H08-affine-withdrawal-proof/1', domain: d, ownedRouteIds: [...owned], participantManifest: manifest, routeConstructions: [...routeModels].map(([id, m]) => ({id, kind: m.kind, numericalEnclosureM: m.enclosureM, ...(m.sweepProof ? {sweepProof: m.sweepProof, parameterMap: m.parameterMap} : {})})), solidConstructions: [...obstacleModels].map(([id, m]) => ({id, kind: m.kind, numericalEnclosureM: m.enclosureM}))});
  proofs.set(token, {domain: d, baseline, manifest, owned, routeModels, obstacleModels, terminalIds});
  return token;
}

export function sampleWithdrawalAffineProof(proof, {fromWithdrawalM, toWithdrawalM}) {
  const p = proofs.get(proof); requireValue(p, 'invalid-affine-proof', 'Use an opaque proof returned by createWithdrawalAffineProof.');
  requireValue(Number.isFinite(fromWithdrawalM) && Number.isFinite(toWithdrawalM) && fromWithdrawalM >= 0 && fromWithdrawalM <= p.domain.from[1] && toWithdrawalM >= 0 && toWithdrawalM <= p.domain.to[1], 'sample-outside-domain', 'Both sample parameters must lie inside their complete stroke domains.');
  return {...p.baseline, routes: p.baseline.routes.map(r => p.routeModels.get(r.id).sample(fromWithdrawalM, toWithdrawalM)), obstacles: p.baseline.obstacles.map(o => p.obstacleModels.get(o.id).sample(fromWithdrawalM, toWithdrawalM))};
}

function checkPoint(actual, expected, origin, coefficient, f, t, enclosureM, detail) {
  requireValue(point(actual), 'motion-topology-change', 'An observed geometry position is not a finite vector.', detail);
  const displacementBound = norm(add(mul(coefficient.from, f), mul(coefficient.to, t))) + 2 * enclosureM;
  requireValue(distance(actual, origin) <= displacementBound + 1e-12, 'understated-observed-bound', 'Observed geometry displacement exceeds the proven affine bound.', {...detail, observedM: distance(actual, origin), boundM: displacementBound});
  requireValue(distance(actual, expected) <= enclosureM + 1e-12, 'affine-model-mismatch', 'Observed geometry does not agree with its proven affine construction.', {...detail, errorM: distance(actual, expected), enclosureM});
}
function checkEndpoint(actual, expected, name, detail, enclosureM) {
  requireValue(!!actual === !!expected, 'motion-topology-change', 'Endpoint registry changed.', {...detail, endpoint: name});
  if (!expected) return;
  requireValue(same(omit(actual, ['position']), omit(expected, ['position'])) && point(actual.position) && distance(actual.position, expected.position) <= enclosureM + 1e-12, 'endpoint-motion-mismatch', 'Endpoint datum or normal differs from the proved physical translation.', {...detail, endpoint: name});
}
function solidMetadata(solid) {
  return {...omit(solid, ['min', 'max', 'center', 'a', 'b', 'bounds', 'triangles', 'sourceVertices', 'apertures']), ...(solid.apertures ? {apertures: solid.apertures.map(solidMetadata)} : {})};
}
function validateSample(actual, expected, p, f, t) {
  requireValue(actual && Array.isArray(actual.routes) && Array.isArray(actual.obstacles), 'invalid-snapshot', 'A sample needs complete route and obstacle arrays.');
  sameIds(actual.routes.map(x => x?.id), p.manifest.routeIds, 'Sample routes'); sameIds(actual.obstacles.map(x => x?.id), p.manifest.obstacleIds, 'Sample obstacles');
  requireValue(same(omit(actual, ['routes', 'obstacles']), omit(expected, ['routes', 'obstacles'])), 'snapshot-inventory-change', 'Snapshot inventory, additional issues, or other source evidence changed.');
  const er = new Map(expected.routes.map(r => [r.id, r])), eo = new Map(expected.obstacles.map(o => [o.id, o]));
  for (const route of actual.routes) {
    const model = p.routeModels.get(route.id), target = er.get(route.id); if (route === target) continue;
    requireValue(Array.isArray(route.points) && route.points.length === model.points.length, 'motion-topology-change', 'Rounded route-point topology changed.', {id: route.id});
    requireValue(same(omit(route, ['points', 'from', 'to']), omit(target, ['points', 'from', 'to'])), 'route-construction-change', 'Route radius, clearance, length, bend or other construction metadata changed.', {id: route.id});
    for (let i = 0; i < route.points.length; i++) checkPoint(route.points[i], target.points[i], model.points[i], model.coefficients[i], f, t, model.enclosureM, {kind: 'route', id: route.id, pointIndex: i});
    checkEndpoint(route.from, target.from, 'from', {id: route.id}, model.enclosureM); checkEndpoint(route.to, target.to, 'to', {id: route.id}, model.enclosureM);
  }
  for (const obstacle of actual.obstacles) {
    const model = p.obstacleModels.get(obstacle.id), target = eo.get(obstacle.id); if (obstacle === target) continue;
    requireValue(same(solidMetadata(obstacle), solidMetadata(target)), 'solid-construction-change', 'Solid shape, aperture permissions, axes, or other metadata changed.', {id: obstacle.id});
    const points = solidPoints(obstacle), targets = solidPoints(target);
    requireValue(points.length === model.points.length && targets.length === model.points.length, 'motion-topology-change', 'Solid or aperture vertex topology changed.', {id: obstacle.id});
    for (let i = 0; i < points.length; i++) checkPoint(points[i], targets[i], model.points[i], model.coefficients[0], f, t, model.enclosureM, {kind: 'obstacle', id: obstacle.id, pointIndex: i});
  }
}

/** Sampled correspondence is diagnostic only, including when all samples match. */
export function checkWithdrawalAffineSamples({proof, sample, parameters = null} = {}) {
  const p = proofs.get(proof), result = {schema: 'orbital-data-center/H08-sampled-affine-correspondence/1', accepted: false, continuousCoverageAssessed: false, matched: false, checkedSamples: 0, issues: []};
  try {
    requireValue(p, 'invalid-affine-proof', 'An opaque affine proof is required.');
    requireValue(typeof sample === 'function', 'invalid-sampler', 'A synchronous diagnostic sampler is required.');
    const values = parameters ?? [[0, 0], [p.domain.from[1], 0], [0, p.domain.to[1]], [p.domain.from[1], p.domain.to[1]], [p.domain.from[1] / 2, p.domain.to[1] / 2]];
    requireValue(Array.isArray(values) && values.length > 0 && values.length <= 128 && values.every(x => Array.isArray(x) && x.length === 2 && x.every(Number.isFinite)), 'invalid-diagnostic-samples', 'Provide one to128 finite parameter pairs.');
    for (const [f, t] of values) { const expected = sampleWithdrawalAffineProof(proof, {fromWithdrawalM: f, toWithdrawalM: t}), actual = sample({fromWithdrawalM: f, toWithdrawalM: t}); result.checkedSamples++; validateSample(actual, expected, p, f, t); }
    result.matched = true; return result;
  } catch (error) { result.issues.push({code: error.code || 'diagnostic-error', message: error.message, ...error.details}); return result; }
}

function boundsForPath(domain, path) {
  const cell = {from: [...domain.from], to: [...domain.to]};
  for (let depth = 0; depth < path.length; depth++) { const key = depth % 2 ? 'to' : 'from', mid = (cell[key][0] + cell[key][1]) / 2; if (path[depth] === '0') cell[key][1] = mid; else cell[key][0] = mid; }
  return cell;
}

/** Independently check the exact binary partition, not a rounded area sum. */
export function validateWithdrawalRectangleCoverage({domain, cells}) {
  try {
    const d = validateDomain(domain); requireValue(Array.isArray(cells) && cells.length > 0 && cells.length <= 100001, 'invalid-cell-partition', 'A finite nonempty leaf partition is required.');
    const trie = {}; let maxDepth = 0;
    for (const cell of cells) {
      requireValue(typeof cell.path === 'string' && /^[01]*$/.test(cell.path) && cell.path.length <= 30 && ['certified', 'rejected', 'unresolved'].includes(cell.status), 'invalid-cell-partition', 'Every leaf needs a valid bounded binary path and status.');
      requireValue(same(cell.bounds, boundsForPath(d, cell.path)), 'cell-domain-mismatch', 'Cell coordinates do not match their exact domain/path identity.', {path: cell.path});
      let node = trie;
      for (const bit of cell.path) { requireValue(!node.leaf, 'overlapping-cells', 'A parent leaf overlaps a child.'); node = node[bit] ||= {}; }
      requireValue(!node.leaf && !node[0] && !node[1], 'overlapping-cells', 'A duplicate or overlapping leaf was supplied.'); node.leaf = cell.status; maxDepth = Math.max(maxDepth, cell.path.length);
    }
    const complete = node => node.leaf ? true : !!node[0] && !!node[1] && complete(node[0]) && complete(node[1]);
    requireValue(complete(trie), 'incomplete-cell-partition', 'The binary leaf partition leaves part of the rectangle unrepresented.');
    const totalUnits = 1n << BigInt(maxDepth), certifiedUnits = cells.filter(c => c.status === 'certified').reduce((sum, c) => sum + (1n << BigInt(maxDepth - c.path.length)), 0n), fullArea = d.from[1] * d.to[1];
    return {ok: true, completePartition: true, completeCertifiedCoverage: certifiedUnits === totalUnits, maxDepth, totalDyadicUnits: totalUnits.toString(), certifiedDyadicUnits: certifiedUnits.toString(), domainAreaM2: fullArea, certifiedAreaM2: fullArea * Number(certifiedUnits) / Number(totalUnits)};
  } catch (error) { return {ok: false, completePartition: false, completeCertifiedCoverage: false, issue: {code: error.code || 'coverage-error', message: error.message, ...error.details}}; }
}

function selectedCoefficients(model, renderedPrefix, arc) {
  if (!arc) return model.coefficients;
  const selected = new Set();
  for (let i = 0; i < renderedPrefix.length - 1; i++) if (renderedPrefix[i + 1] >= arc[0] - 3e-5 && renderedPrefix[i] <= arc[1] + 3e-5) { selected.add(i); selected.add(i + 1); }
  requireValue(selected.size > 0, 'missing-piece-motion-proof', 'The audited original-arc range has no proven vertex coefficients.');
  return [...selected].map(i => model.coefficients[i]);
}
function relativeDisplacement(left, right, halfFrom, halfTo) {
  let bound = 0;
  for (const a of left) for (const b of right) { const u = mul(sub(a.from, b.from), halfFrom), v = mul(sub(a.to, b.to), halfTo); bound = Math.max(bound, norm(add(u, v)), norm(sub(u, v))); }
  return bound;
}
function completeCellSelfNeighborhood(model, route, bounds, cornerRoutes) {
  if (model.kind !== 'mating-reservoir') return {ok: true, basis: 'Rigid or stationary geometry preserves every static intrinsic self-neighborhood exactly.', checkedPairs: 0, intrinsicPairs: 0, unresolved: [], collisions: []};
  const interpolate = (points, part) => add(points[part.index], mul(sub(points[part.index + 1], points[part.index]), part.fraction));
  const subdivide = points => model.selfPieces.map(part => interpolate(points, part));
  const prefix = points => { const result = [0]; for (let i = 1; i < points.length; i++) result.push(result.at(-1) + distance(points[i - 1], points[i])); return result; };
  const points = subdivide(route.points), centerPrefix = prefix(points), coefficients = model.selfPieces.map(part => ({from: interpolate(model.coefficients.map(c => c.from), part), to: interpolate(model.coefficients.map(c => c.to), part)}));
  const cornerPrefixes = cornerRoutes.map(corner => prefix(subdivide(corner.points)));
  const R = model.radiusOfCurvatureM, r = route.radiusM, clearance = route.clearanceM, required = 2 * r + clearance, adjacency = Math.PI * r + clearance + 1e-7, hf = (bounds.from[1] - bounds.from[0]) / 2, ht = (bounds.to[1] - bounds.to[0]) / 2;
  // For a unit-speed C1 curve with curvature <=1/R and L<=pi*R,
  // T(s).T(t)>=cos(|s-t|/R). Integrating both parameters gives
  // ||integral T ds||^2 >= 4R^2 sin^2(L/(2R)). The lower bound increases
  // on this domain. A pair outside the material-adjacency exemption has
  // developed separation >=adjacency; subtract both chord deviations and
  // both finite numerical/buffer enclosures before comparing cable jackets.
  const intrinsicMargin = adjacency <= Math.PI * R ? 2 * R * Math.sin(adjacency / (2 * R)) - 2 * model.maximumChordDeviationM - required - 4 * model.enclosureM : -Infinity;
  const unresolved = [], collisions = []; let checkedPairs = 0, intrinsicPairs = 0, separatedPairs = 0, unresolvedCount = 0, minimumMarginM = Infinity;
  for (let i = 0; i < points.length - 1; i++) for (let j = i + 2; j < points.length - 1; j++) {
    checkedPairs++; const pair = segmentSegmentDistance(points[i], points[i + 1], points[j], points[j + 1]), margin = pair.distanceM - required, bound = relativeDisplacement([coefficients[i], coefficients[i + 1]], [coefficients[j], coefficients[j + 1]], hf, ht) + 4 * model.enclosureM;
    if (margin - bound > 1e-7) { separatedPairs++; minimumMarginM = Math.min(minimumMarginM, margin - bound); continue; }
    // Segment lengths are convex functions of the two affine parameters.
    // Their sum's maximum is enclosed by the four rectangle extrema. The
    // complete (constant) arc/chord deficit bounds every partial deficit.
    const maximumDevelopedSpanM = Math.max(...cornerPrefixes.map(p => p[j + 1] - p[i])) + model.chordDeficitM + 2 * (j + 1 - i) * model.affineNumericalErrorM;
    if (maximumDevelopedSpanM <= Math.PI * R && intrinsicMargin > 1e-7) { intrinsicPairs++; minimumMarginM = Math.min(minimumMarginM, intrinsicMargin); continue; }
    const centerArcSeparationM = centerPrefix[j] + pair.t * (centerPrefix[j + 1] - centerPrefix[j]) - centerPrefix[i] - pair.s * (centerPrefix[i + 1] - centerPrefix[i]);
    if (centerArcSeparationM > adjacency && margin < -1e-7) { collisions.push({code: 'self-collision', routeId: route.id, proofPieces: [i, j], clearanceM: margin, centerArcSeparationM}); return {ok: false, checkedPairs, intrinsicPairs, separatedPairs, unresolvedCount, unresolved, collisions, minimumMarginM}; }
    unresolvedCount++;
    if (unresolved.length < 8) unresolved.push({proofPieces: [i, j], maximumDevelopedSpanM, intrinsicDomainMaximumM: Math.PI * R, intrinsicMarginM: intrinsicMargin, centerArcSeparationM, centerClearanceM: margin, relativeMotionBoundM: bound});
  }
  return {ok: unresolvedCount === 0, checkedPairs, intrinsicPairs, separatedPairs, unresolvedCount, unresolved, collisions, minimumMarginM, basis: 'Every nonadjacent supplementary chord-piece pair has an all-cell relative-displacement separation or an all-cell finite-curvature/material-adjacency proof. Long chords are subdivided by fixed affine fractions solely inside this proof; candidate and audited geometry are unchanged.'};
}
// A separating plane is an additional conservative proof. Every unsupported,
// nonfinite or nonpositive case returns null to the unchanged isotropic bound.
function affineNeighborSeparationWitness(pair, p, neighbor, bounds) {
  if (pair.kind !== 'solid' || !pair.obstacle || pair.segmentA === null || !Array.isArray(pair.sourceArcA)) return null;
  const b = neighbor.motion.get(pair.obstacle.id), a = p.routeModels.get(pair.routeA.id);
  if (!b || !a || !Number.isInteger(b.segmentIndex)) return null;
  const other = p.routeModels.get(b.routeId), prefix = pair.routeA.renderedPrefix, arc = pair.sourceArcA;
  if (!other || !Array.isArray(prefix) || prefix.length !== a.points.length || prefix.length !== a.coefficients.length || prefix.length < 2 || !prefix.every(Number.isFinite) || prefix.some((x, i) => i && !(x > prefix[i - 1])) || arc.length !== 2 || !arc.every(Number.isFinite) || !(arc[1] > arc[0])) return null;
  if (b.segmentIndex < 0 || b.segmentIndex + 1 >= other.points.length || other.points.length !== other.coefficients.length || !Number.isFinite(a.enclosureM) || a.enclosureM < 0 || !Number.isFinite(b.enclosureM) || b.enclosureM < 0 || !Number.isFinite(pair.routeA.radiusM) || pair.routeA.radiusM <= 0 || !Number.isFinite(pair.routeA.clearanceM) || pair.routeA.clearanceM < 0 || !Number.isFinite(pair.obstacle.radiusM) || pair.obstacle.radiusM <= 0) return null;
  if (!same(b.coefficients, [other.coefficients[b.segmentIndex], other.coefficients[b.segmentIndex + 1]])) return null;
  if (!bounds || !['from', 'to'].every(key => Array.isArray(bounds[key]) && bounds[key].length === 2 && bounds[key].every(Number.isFinite) && bounds[key][0] <= bounds[key][1])) return null;
  const E = Number.EPSILON, scale = Math.max(1, ...prefix.map(Math.abs), ...arc.map(Math.abs)), arcGuard = 32 * E * scale;
  if (!Number.isFinite(arcGuard)) return null;
  const lo = arc[0] - 3e-5 - arcGuard, hi = arc[1] + 3e-5 + arcGuard, selected = new Set(), materialPieces = [];
  if (![lo, hi].every(Number.isFinite)) return null;
  for (let i = 0; i < prefix.length - 1; i++) if (prefix[i + 1] >= lo && prefix[i] <= hi) {
    const span = prefix[i + 1] - prefix[i];
    if (!Number.isFinite(span) || !(span > 2 * arcGuard)) return null;
    const clipLo = Math.max(prefix[i], lo), clipHi = Math.min(prefix[i + 1], hi);
    // These outward-rounded fractions are fixed material coordinates selected
    // once from the center prefix, never numeric arclengths at future poses.
    const fractions = [Math.max(0, (clipLo - prefix[i]) / span - 8 * E), Math.min(1, (clipHi - prefix[i]) / span + 8 * E)];
    if (!fractions.every(Number.isFinite) || fractions[0] > fractions[1]) return null;
    materialPieces.push({sourceSegmentIndex: i, sourceIntervalM: [prefix[i], prefix[i + 1]], fractions});
    selected.add(i); selected.add(i + 1);
  }
  if (!materialPieces.length) return null;
  const leftIndices = [...selected], rightIndices = [b.segmentIndex, b.segmentIndex + 1], F = Math.max(...bounds.from.map(Math.abs)), T = Math.max(...bounds.to.map(Math.abs));
  const dot = (u, v) => u.reduce((sum, x, i) => sum + x * v[i], 0);
  const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  // Scale before normalization to avoid overflowing squared coordinates. The
  // upper squared-length and denominator factors deliberately make ||n||<=1.
  const safeAxis = raw => {
    if (!point(raw)) return null;
    const m = Math.max(...raw.map(Math.abs)); if (!(m > 0) || !Number.isFinite(m)) return null;
    const q = raw.map(x => x / m), s = q.reduce((sum, x) => sum + x * x, 0), denominator = Math.sqrt(s * (1 + 16 * E)) * (1 + 8 * E), axis = q.map(x => x / denominator);
    return point(axis) && norm(axis) <= 1 && norm(axis) >= 1 - 1e-7 ? axis : null;
  };
  const material = (model, indices, inflation, radiusScale, pieces = null) => {
    const points = []; let arithmeticScale = Math.max(1, inflation, radiusScale, model.enclosureM);
    for (const i of indices) {
      const origin = model.points[i], c = model.coefficients[i];
      if (!point(origin) || !point(c?.from) || !point(c?.to)) return null;
      // Use full ORIGINAL endpoint magnitudes, including cancellation-prone
      // coefficients; clipped-point magnitudes cannot bound roundoff safely.
      arithmeticScale = Math.max(arithmeticScale, origin.reduce((sum, x, k) => sum + Math.abs(x) + F * Math.abs(c.from[k]) + T * Math.abs(c.to[k]), 0));
      if (!pieces) for (const f of bounds.from) for (const t of bounds.to) { const value = shifted(origin, c, f, t); if (!point(value)) return null; points.push(value); }
    }
    if (pieces) for (const piece of pieces) for (const f of bounds.from) for (const t of bounds.to) {
      const i = piece.sourceSegmentIndex, left = shifted(model.points[i], model.coefficients[i], f, t), right = shifted(model.points[i + 1], model.coefficients[i + 1], f, t);
      if (!point(left) || !point(right)) return null;
      for (const fraction of piece.fractions) { const value = add(left, mul(sub(right, left), fraction)); if (!point(value)) return null; points.push(value); }
    }
    // Extra roundoff is additive, separate from every existing enclosure and
    // radius deduction. 512*EPS*S covers affine evaluation, material endpoint
    // interpolation, dot products and final interval arithmetic. Invalid or
    // overflowing scales produce no witness and preserve isotropic fallback.
    const roundoffM = 512 * E * arithmeticScale;
    if (![arithmeticScale, inflation, roundoffM].every(Number.isFinite)) return null;
    return {points, inflation, roundoffM, arithmeticScale};
  };
  const A = material(a, leftIndices, 2 * a.enclosureM, pair.routeA.radiusM, materialPieces), B = material(other, rightIndices, pair.obstacle.radiusM + 2 * b.enclosureM, pair.obstacle.radiusM);
  if (!A || !B || !point(pair.a) || !point(pair.b) || !point(pair.obstacle.a) || !point(pair.obstacle.b)) return null;
  let dominant = [0, 0, 0], dominantNorm = 0;
  for (const c of [...leftIndices.map(i => a.coefficients[i]), ...b.coefficients]) for (const key of ['from', 'to']) { const length = norm(c[key]); if (Number.isFinite(length) && length > dominantNorm) { dominant = c[key]; dominantNorm = length; } }
  const closest = segmentSegmentDistance(pair.a, pair.b, pair.obstacle.a, pair.obstacle.b);
  const axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1], safeAxis(sub(closest.pointA, closest.pointB)), safeAxis(cross(sub(pair.b, pair.a), dominant)), safeAxis(cross(sub(pair.obstacle.b, pair.obstacle.a), dominant))].filter(Boolean);
  const projection = (value, axis) => {
    const dots = value.points.map(point => dot(point, axis)); if (!dots.every(Number.isFinite)) return null;
    const range = [Math.min(...dots) - value.inflation - value.roundoffM, Math.max(...dots) + value.inflation + value.roundoffM];
    return range.every(Number.isFinite) ? range : null;
  };
  let best = null, bestMargin = 1e-7;
  for (const axis of axes) {
    const rangeA = projection(A, axis), rangeB = projection(B, axis); if (!rangeA || !rangeB) continue;
    const margin = Math.max(rangeA[0] - rangeB[1], rangeB[0] - rangeA[1]) - pair.routeA.radiusM - pair.routeA.clearanceM;
    if (!Number.isFinite(margin) || !(margin > bestMargin)) continue;
    bestMargin = margin;
    best = {axis, rangeA, rangeB, sectionA: {startLengthM: arc[0], endLengthM: arc[1]}, radiusUpperBoundA: pair.routeA.radiusM,
      basis: 'Both endpoints of each original material piece clipped to the padded center source arc, with outward-rounded fixed material fractions and every interior knot retained, and both full original neighbor segment endpoints, at all four corners of the same affine parameter cell. Convexity encloses every material fraction and interior parameter. Full capsule radius, owned audit radius/clearance, both existing two-enclosure allowances and separate projection/interpolation roundoff are retained. No future-pose arclength remapping or sampled-pose inference.',
      affineProjectionProof: {ownedRouteId: pair.routeA.id, neighborRouteId: b.routeId, neighborSourceSegment: b.segmentIndex, sourceArcM: [...arc], sourceSelectionPaddingM: 3e-5, sourceSelectionRoundoffM: arcGuard, sourceVertexIndices: leftIndices, sourceMaterialPieces: materialPieces, materialFractionsFixedAtCenter: true, outwardFractionGuard: 8 * E, neighborSourceVertexIndices: rightIndices, cellBounds: {from: [...bounds.from], to: [...bounds.to]}, cornerCount: 4, existingEnclosureDeductionsM: {owned: 2 * a.enclosureM, neighbor: 2 * b.enclosureM}, fullNeighborCapsuleRadiusM: pair.obstacle.radiusM, projectionRoundoffM: {owned: A.roundoffM, neighbor: B.roundoffM}, arithmeticScale: {owned: A.arithmeticScale, neighbor: B.arithmeticScale}, conservativeMarginM: margin}};
  }
  return best;
}

// Additional proof only for an actual capsule registered in the opaque model.
// Its complete outer capsule is conservative even when it has apertures.
// The existing derived-neighbor helper above is deliberately unchanged.
function affineActualCapsuleSeparationWitness(pair, p, bounds) {
  if (pair.kind !== 'solid' || !pair.obstacle || pair.segmentA === null || !Array.isArray(pair.sourceArcA)) return null;
  const b = p.obstacleModels.get(pair.obstacle.id), a = p.routeModels.get(pair.routeA.id), base = b?.base;
  if (!b || !a || !base || base.id !== pair.obstacle.id || base.type !== 'capsule' || pair.obstacle.type !== 'capsule' || !['stationary', 'rigid-translation'].includes(b.kind)) return null;
  if (!point(base.a) || !point(base.b) || !point(pair.obstacle.a) || !point(pair.obstacle.b) || !Number.isFinite(base.radiusM) || base.radiusM <= 0 || pair.obstacle.radiusM !== base.radiusM) return null;
  if (!Array.isArray(b.coefficients) || b.coefficients.length !== 1 || !point(b.coefficients[0]?.from) || !point(b.coefficients[0]?.to)) return null;
  const coefficient = b.coefficients[0];
  if (b.kind === 'stationary' && (!same(coefficient.from, ZERO) || !same(coefficient.to, ZERO))) return null;
  // b.points also includes bounds and aperture positions. They are not the
  // capsule centerline and must never replace its two full original endpoints.
  const other = {points: [base.a, base.b], coefficients: [coefficient, coefficient], enclosureM: b.enclosureM};
  const prefix = pair.routeA.renderedPrefix, arc = pair.sourceArcA;
  if (!Array.isArray(prefix) || !Array.isArray(a.points) || !Array.isArray(a.coefficients) || prefix.length !== a.points.length || prefix.length !== a.coefficients.length || prefix.length < 2 || !prefix.every(Number.isFinite) || prefix.some((x, i) => i && !(x > prefix[i - 1])) || arc.length !== 2 || !arc.every(Number.isFinite) || !(arc[1] > arc[0])) return null;
  if (!Number.isFinite(a.enclosureM) || a.enclosureM < 0 || !Number.isFinite(b.enclosureM) || b.enclosureM < 0 || !Number.isFinite(pair.routeA.radiusM) || pair.routeA.radiusM <= 0 || !Number.isFinite(pair.routeA.clearanceM) || pair.routeA.clearanceM < 0) return null;
  if (!bounds || !['from', 'to'].every(key => Array.isArray(bounds[key]) && bounds[key].length === 2 && bounds[key].every(Number.isFinite) && bounds[key][0] <= bounds[key][1])) return null;
  const E = Number.EPSILON, scale = Math.max(1, ...prefix.map(Math.abs), ...arc.map(Math.abs)), arcGuard = 32 * E * scale;
  if (!Number.isFinite(arcGuard)) return null;
  const lo = arc[0] - 3e-5 - arcGuard, hi = arc[1] + 3e-5 + arcGuard, selected = new Set(), materialPieces = [];
  if (![lo, hi].every(Number.isFinite)) return null;
  for (let i = 0; i < prefix.length - 1; i++) if (prefix[i + 1] >= lo && prefix[i] <= hi) {
    const span = prefix[i + 1] - prefix[i];
    if (!Number.isFinite(span) || !(span > 2 * arcGuard)) return null;
    const clipLo = Math.max(prefix[i], lo), clipHi = Math.min(prefix[i + 1], hi);
    // These outward-rounded fractions are fixed material coordinates selected
    // once from the center prefix, never numeric arclengths at future poses.
    const fractions = [Math.max(0, (clipLo - prefix[i]) / span - 8 * E), Math.min(1, (clipHi - prefix[i]) / span + 8 * E)];
    if (!fractions.every(Number.isFinite) || fractions[0] > fractions[1]) return null;
    materialPieces.push({sourceSegmentIndex: i, sourceIntervalM: [prefix[i], prefix[i + 1]], fractions});
    selected.add(i); selected.add(i + 1);
  }
  if (!materialPieces.length) return null;
  const leftIndices = [...selected], rightIndices = [0, 1], F = Math.max(...bounds.from.map(Math.abs)), T = Math.max(...bounds.to.map(Math.abs));
  const dot = (u, v) => u.reduce((sum, x, i) => sum + x * v[i], 0);
  const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  // Scale before normalization to avoid overflowing squared coordinates. The
  // upper squared-length and denominator factors deliberately make ||n||<=1.
  const safeAxis = raw => {
    if (!point(raw)) return null;
    const m = Math.max(...raw.map(Math.abs)); if (!(m > 0) || !Number.isFinite(m)) return null;
    const q = raw.map(x => x / m), s = q.reduce((sum, x) => sum + x * x, 0), denominator = Math.sqrt(s * (1 + 16 * E)) * (1 + 8 * E), axis = q.map(x => x / denominator);
    return point(axis) && norm(axis) <= 1 && norm(axis) >= 1 - 1e-7 ? axis : null;
  };
  const material = (model, indices, inflation, radiusScale, pieces = null) => {
    const points = []; let arithmeticScale = Math.max(1, inflation, radiusScale, model.enclosureM);
    for (const i of indices) {
      const origin = model.points[i], c = model.coefficients[i];
      if (!point(origin) || !point(c?.from) || !point(c?.to)) return null;
      // Use full ORIGINAL endpoint magnitudes, including cancellation-prone
      // coefficients; clipped-point magnitudes cannot bound roundoff safely.
      arithmeticScale = Math.max(arithmeticScale, origin.reduce((sum, x, k) => sum + Math.abs(x) + F * Math.abs(c.from[k]) + T * Math.abs(c.to[k]), 0));
      if (!pieces) for (const f of bounds.from) for (const t of bounds.to) { const value = shifted(origin, c, f, t); if (!point(value)) return null; points.push(value); }
    }
    if (pieces) for (const piece of pieces) for (const f of bounds.from) for (const t of bounds.to) {
      const i = piece.sourceSegmentIndex, left = shifted(model.points[i], model.coefficients[i], f, t), right = shifted(model.points[i + 1], model.coefficients[i + 1], f, t);
      if (!point(left) || !point(right)) return null;
      for (const fraction of piece.fractions) { const value = add(left, mul(sub(right, left), fraction)); if (!point(value)) return null; points.push(value); }
    }
    // Extra roundoff is additive, separate from every existing enclosure and
    // radius deduction. 512*EPS*S covers affine evaluation, material endpoint
    // interpolation, dot products and final interval arithmetic. Invalid or
    // overflowing scales produce no witness and preserve isotropic fallback.
    const roundoffM = 512 * E * arithmeticScale;
    if (![arithmeticScale, inflation, roundoffM].every(Number.isFinite)) return null;
    return {points, inflation, roundoffM, arithmeticScale};
  };
  const A = material(a, leftIndices, 2 * a.enclosureM, pair.routeA.radiusM, materialPieces), B = material(other, rightIndices, pair.obstacle.radiusM + 2 * b.enclosureM, pair.obstacle.radiusM);
  if (!A || !B || !point(pair.a) || !point(pair.b) || !point(pair.obstacle.a) || !point(pair.obstacle.b)) return null;
  let dominant = [0, 0, 0], dominantNorm = 0;
  for (const c of [...leftIndices.map(i => a.coefficients[i]), ...b.coefficients]) for (const key of ['from', 'to']) { const length = norm(c[key]); if (Number.isFinite(length) && length > dominantNorm) { dominant = c[key]; dominantNorm = length; } }
  const closest = segmentSegmentDistance(pair.a, pair.b, pair.obstacle.a, pair.obstacle.b);
  const axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1], safeAxis(sub(closest.pointA, closest.pointB)), safeAxis(cross(sub(pair.b, pair.a), dominant)), safeAxis(cross(sub(pair.obstacle.b, pair.obstacle.a), dominant))].filter(Boolean);
  const projection = (value, axis) => {
    const dots = value.points.map(point => dot(point, axis)); if (!dots.every(Number.isFinite)) return null;
    const range = [Math.min(...dots) - value.inflation - value.roundoffM, Math.max(...dots) + value.inflation + value.roundoffM];
    return range.every(Number.isFinite) ? range : null;
  };
  let best = null, bestMargin = 1e-7;
  for (const axis of axes) {
    const rangeA = projection(A, axis), rangeB = projection(B, axis); if (!rangeA || !rangeB) continue;
    const margin = Math.max(rangeA[0] - rangeB[1], rangeB[0] - rangeA[1]) - pair.routeA.radiusM - pair.routeA.clearanceM;
    if (!Number.isFinite(margin) || !(margin > bestMargin)) continue;
    bestMargin = margin;
    best = {axis, rangeA, rangeB, sectionA: {startLengthM: arc[0], endLengthM: arc[1]}, radiusUpperBoundA: pair.routeA.radiusM,
      basis: 'Both endpoints of each original material piece clipped to the padded center source arc, with outward-rounded fixed material fractions and every interior knot retained, and both full original endpoints of the registered actual capsule under its single stationary or rigid-translation coefficient, at all four corners of the same affine parameter cell. Convexity encloses every material fraction and interior parameter. The complete outer capsule remains a conservative superset with apertures. Full actual capsule radius, owned audit radius/clearance, both existing two-enclosure allowances and separate projection/interpolation roundoff are retained. No future-pose arclength remapping or sampled-pose inference.',
      affineProjectionProof: {ownedRouteId: pair.routeA.id, actualSolidId: base.id, actualSolidType: base.type, motionKind: b.kind, fullOriginalCapsuleEndpoints: [base.a, base.b], capsuleEndpointCoefficients: [coefficient, coefficient], sourceArcM: [...arc], sourceSelectionPaddingM: 3e-5, sourceSelectionRoundoffM: arcGuard, sourceVertexIndices: leftIndices, sourceMaterialPieces: materialPieces, materialFractionsFixedAtCenter: true, outwardFractionGuard: 8 * E, actualSolidEndpointIndices: rightIndices, cellBounds: {from: [...bounds.from], to: [...bounds.to]}, cornerCount: 4, existingEnclosureDeductionsM: {owned: 2 * a.enclosureM, actualSolid: 2 * b.enclosureM}, fullActualCapsuleRadiusM: base.radiusM, projectionRoundoffM: {owned: A.roundoffM, actualSolid: B.roundoffM}, arithmeticScale: {owned: A.arithmeticScale, actualSolid: B.arithmeticScale}, conservativeMarginM: margin}};
  }
  return best;
}


function neighborCapsules(snapshot, ownedRoute, p) {
  const capsules = [], motion = new Map();
  for (const route of snapshot.routes) if (route.id !== ownedRoute.id) {
    const model = p.routeModels.get(route.id), radiusM = route.radiusM + Math.max(0, route.clearanceM - ownedRoute.clearanceM) + model.enclosureM;
    for (let i = 0; i < route.points.length - 1; i++) {
      const id = 'H08-neighbor:' + JSON.stringify([ownedRoute.id, route.id, i]);
      requireValue(!p.obstacleModels.has(id), 'neighbor-identity-alias', 'A derived neighbor capsule aliases an actual obstacle ID.');
      capsules.push({id, type: 'capsule', a: route.points[i], b: route.points[i + 1], radiusM});
      motion.set(id, {coefficients: [model.coefficients[i], model.coefficients[i + 1]], enclosureM: model.enclosureM, routeId: route.id, segmentIndex: i});
    }
  }
  return {capsules, motion};
}

/**
 * Complete two-parameter coverage for ownedRouteIds, retaining every participant.
 * Sample budgets count actual internal model evaluations. At most16 snapshots are
 * retained; cell records contain only compact audits, never full source geometry.
 */
export function certifyWithdrawalRectangle({proof, sample = null, maxCells = 4096, maxSamples = 20000, maxDepth = 24, maxElapsedMs = 240000, onCell = null} = {}) {
  const started = Date.now(), issues = [], cells = [], cache = new Map(), p = proofs.get(proof);
  let samples = 0, evaluatedCells = 0, runtimeOrBudgetFailure = false, minimumCertificateMarginM = Infinity;
  const base = {schema: WITHDRAWAL_RECTANGLE_SCHEMA, completed: false, accepted: false, coverageComplete: false, externalSamplerCertified: false, scope: 'Complete independent two-bank parameter rectangle of the internally constructed analytic model for the explicit owned routes, retaining all declared route and obstacle participants. External callback correspondence is never continuously certified; this is not whole-vehicle acceptance.'};
  if (!p) return {...base, status: 'invalid-input', issues: [{code: 'invalid-affine-proof', message: 'An opaque verified affine proof is required; sampled callbacks cannot establish affine motion.'}], cells, samples, evaluatedCells};
  const resultBase = {...base, domain: p.domain, ownedRouteIds: p.owned, participantManifest: p.manifest, inventory: {routes: p.manifest.routeIds.length, ownedRoutes: p.owned.length, immutableNeighborsOfOwnedGroup: p.manifest.routeIds.length - p.owned.length, otherRoutesPerOwnedRoute: p.manifest.routeIds.length - 1, obstacles: p.manifest.obstacleIds.length, physical: p.manifest.physicalObstacleIds.length, services: p.manifest.serviceObstacleIds.length, terminals: p.manifest.terminalObstacleIds.length, movingRoutes: p.manifest.movingRouteIds.length, movingObstacles: p.manifest.movingObstacleIds.length}};
  try {
    requireValue(Number.isInteger(maxCells) && maxCells > 0 && maxCells <= 100000 && Number.isInteger(maxSamples) && maxSamples >= 5 && maxSamples <= 100000 && Number.isInteger(maxDepth) && maxDepth >= 0 && maxDepth <= 30 && Number.isFinite(maxElapsedMs) && maxElapsedMs > 0 && maxElapsedMs <= 1200000, 'invalid-resource-budget', 'Finite bounded cell, sample, depth and elapsed budgets are required.');
    requireValue(sample === null, 'external-sampler-not-certifiable', 'The certificate uses only the internally proved model. External source callbacks belong in checkWithdrawalAffineSamples and cannot establish continuous correspondence.');
    requireValue(onCell === null || typeof onCell === 'function', 'invalid-progress-callback', 'onCell must be a function when supplied.');
  } catch (error) { return {...resultBase, status: 'invalid-input', issues: [{code: error.code, message: error.message, ...error.details}], cells, samples, evaluatedCells}; }
  const collisionCache = createRoutingCollisionCache(), stack = [''];
  const budget = () => { requireValue(Date.now() - started <= maxElapsedMs, 'rectangle-runtime-budget', 'Rectangle certification exhausted its elapsed-time budget.'); };
  function at(f, t) {
    budget(); const key = f.toPrecision(17) + ',' + t.toPrecision(17);
    if (cache.has(key)) { const value = cache.get(key); cache.delete(key); cache.set(key, value); return value; }
    requireValue(samples < maxSamples, 'rectangle-sample-budget', 'Rectangle certification exhausted its sample budget.', {maxSamples});
    const expected = sampleWithdrawalAffineProof(proof, {fromWithdrawalM: f, toWithdrawalM: t}), actual = expected; samples++;
    validateSample(actual, expected, p, f, t); freeze(actual); budget();
    cache.set(key, actual); if (cache.size > 16) cache.delete(cache.keys().next().value); return actual;
  }
  while (stack.length) {
    const path = stack.pop(), bounds = boundsForPath(p.domain, path), cell = {path, bounds, status: 'unresolved'};
    try {
      budget(); requireValue(evaluatedCells < maxCells, 'rectangle-cell-budget', 'Rectangle certification exhausted its cell budget.', {maxCells}); evaluatedCells++;
      const f = (bounds.from[0] + bounds.from[1]) / 2, t = (bounds.to[0] + bounds.to[1]) / 2, hf = (bounds.from[1] - bounds.from[0]) / 2, ht = (bounds.to[1] - bounds.to[0]) / 2;
      const cornerRoutes = [];
      for (const ff of bounds.from) for (const tt of bounds.to) cornerRoutes.push(new Map(at(ff, tt).routes.map(r => [r.id, r])));
      // Only the shared audited center is admitted; corners and fresh owner-specific
      // neighbor capsules retain their original paths. Full admission stays inside
      // this cell's unchanged elapsed-time budget.
      const center = at(f, t), snapshot = {...center, obstacles: ownRoutingObstacleList(center.obstacles)};
      budget();
      const routeById = new Map(snapshot.routes.map(r => [r.id, r])), ownedResults = []; let margin = Infinity, failed = false;
      for (const ownedId of p.owned) {
        const ownedRoute = routeById.get(ownedId), neighbor = neighborCapsules(snapshot, ownedRoute, p), excluded = snapshot.obstacles.filter(o => p.terminalIds.has(o.id) && o.lineId === ownedId), retained = snapshot.obstacles.filter(o => !(p.terminalIds.has(o.id) && o.lineId === ownedId)), obstacles = [...retained, ...neighbor.capsules];
        const boundCache = new Map(), separationCache = new Map();
        function pairSeparationLowerBound(pair) {
          if (!pair.obstacle || pair.segmentA === null || !pair.sourceArcA) return null;
          const derivedNeighbor = neighbor.motion.has(pair.obstacle.id);
          if (!derivedNeighbor && pair.obstacle.type !== 'capsule') return null;
          // This cache is owned by one immutable proof, cell and owned route.
          const key = JSON.stringify([pair.routeA.id, pair.sourceArcA, pair.obstacle.id, bounds]);
          if (!separationCache.has(key)) separationCache.set(key, derivedNeighbor ? affineNeighborSeparationWitness(pair, p, neighbor, bounds) : affineActualCapsuleSeparationWitness(pair, p, bounds));
          return separationCache.get(key);
        }
        function pairMotionBound(pair) {
          const a = p.routeModels.get(pair.routeA.id), left = selectedCoefficients(a, pair.routeA.renderedPrefix, pair.sourceArcA); let right, errorB, identity;
          if (pair.obstacle) { const b = neighbor.motion.get(pair.obstacle.id) || p.obstacleModels.get(pair.obstacle.id); requireValue(b, 'missing-solid-motion-proof', 'An audited obstacle has no motion proof.', {id: pair.obstacle.id}); right = b.coefficients; errorB = b.enclosureM; identity = JSON.stringify(right); }
          else { const b = p.routeModels.get(pair.routeB?.id || pair.routeA.id), rb = pair.routeB || pair.routeA; right = selectedCoefficients(b, rb.renderedPrefix, pair.sourceArcB); errorB = b.enclosureM; identity = JSON.stringify(right); }
          const key = JSON.stringify([pair.routeA.id, pair.sourceArcA, identity, errorB]); if (boundCache.has(key)) return boundCache.get(key);
          const value = relativeDisplacement(left, right, hf, ht) + 2 * (a.enclosureM + errorB); boundCache.set(key, value); return value;
        }
        const audit = auditRoutes([ownedRoute], obstacles, {maxIssues: 16, selfCollision: true, interlineCollision: true, collisionToleranceM: 2e-6, pairMotionBound, pairSeparationLowerBound, collisionCache, expectedRouteIds: [ownedId], expectedObstacleIds: obstacles.map(o => o.id), snapshotEvidence: {inventory: snapshot.inventory, additionalIssues: snapshot.additionalIssues || [], additionalIssueCount: snapshot.additionalIssueCount || 0, planningFailures: snapshot.planningFailures || []}});
        budget();
        const selfNeighborhood = audit.ok ? completeCellSelfNeighborhood(p.routeModels.get(ownedId), ownedRoute, bounds, cornerRoutes.map(routes => routes.get(ownedId))) : null;
        budget();
        ownedResults.push({id: ownedId, ok: audit.ok && selfNeighborhood.ok, issueCount: audit.issueCount, truncated: audit.truncated, issues: audit.issues, minimumClearanceM: audit.minimumClearanceM, minimumCertificateMarginM: audit.minimumCertificateMarginM, selfNeighborhood, counts: audit.counts, retainedNeighborRoutes: p.manifest.routeIds.length - 1, derivedNeighborCapsules: neighbor.capsules.length, excludedOwnTerminalIds: excluded.map(o => o.id)});
        margin = Math.min(margin, audit.minimumCertificateMarginM);
        if (!audit.ok) { failed = true; issues.push(...audit.issues.map(issue => ({...issue, ownedRouteId: ownedId, fromWithdrawalM: f, toWithdrawalM: t, cellPath: path}))); if (!audit.issues.length) issues.push({code: 'failed-owned-route-audit', ownedRouteId: ownedId, issueCount: audit.issueCount, cellPath: path}); break; }
        if (selfNeighborhood.collisions.length) { failed = true; issues.push(...selfNeighborhood.collisions.map(issue => ({...issue, fromWithdrawalM: f, toWithdrawalM: t, cellPath: path}))); break; }
        margin = Math.min(margin, selfNeighborhood.ok ? selfNeighborhood.minimumMarginM ?? Infinity : 0);
      }
      cell.ownedResults = ownedResults; cell.minimumCertificateMarginM = margin; minimumCertificateMarginM = Math.min(minimumCertificateMarginM, margin);
      if (failed) { cell.status = 'rejected'; cells.push(cell); break; }
      if (margin > 1e-7) { onCell?.({path, status: 'certified', samples, evaluatedCells, minimumCertificateMarginM: margin}); budget(); cell.status = 'certified'; cells.push(cell); continue; }
      if (path.length >= maxDepth) { runtimeOrBudgetFailure = true; cell.reason = 'rectangle-depth-budget'; cells.push(cell); issues.push({code: 'unresolved-withdrawal-cell', reason: cell.reason, path, bounds, minimumCertificateMarginM: margin}); continue; }
      onCell?.({path, status: 'subdivided', samples, evaluatedCells, minimumCertificateMarginM: margin}); budget(); stack.push(path + '1', path + '0');
    } catch (error) {
      const code = error.code || 'rectangle-execution-error', budgetFailure = /budget/.test(code); runtimeOrBudgetFailure ||= budgetFailure; cell.reason = code; cell.status = budgetFailure ? 'unresolved' : 'rejected'; cells.push(cell); issues.push({code, message: error.message, ...error.details, cellPath: path}); break;
    }
  }
  for (const path of stack) cells.push({path, bounds: boundsForPath(p.domain, path), status: 'unresolved', reason: 'not-evaluated-after-failure'});
  let coverage = validateWithdrawalRectangleCoverage({domain: p.domain, cells});
  if (!coverage.ok) issues.push(coverage.issue);
  let certifiedCells = cells.filter(c => c.status === 'certified').length, unresolvedCells = cells.filter(c => c.status === 'unresolved').length, rejectedCells = cells.filter(c => c.status === 'rejected').length, elapsedMs = Date.now() - started;
  if (elapsedMs > maxElapsedMs) {
    runtimeOrBudgetFailure = true;
    if (!issues.some(issue => issue.code === 'rectangle-runtime-budget')) issues.push({code: 'rectangle-runtime-budget', message: 'Rectangle certification exhausted its elapsed-time budget before final acceptance.'});
    const last = cells.at(-1);
    if (last?.status === 'certified') { last.status = 'unresolved'; last.reason = 'rectangle-runtime-budget'; certifiedCells--; unresolvedCells++; coverage = validateWithdrawalRectangleCoverage({domain: p.domain, cells}); }
    elapsedMs = Date.now() - started;
  }
  const accepted = !runtimeOrBudgetFailure && issues.length === 0 && coverage.completeCertifiedCoverage === true;
  return {...resultBase, completed: !runtimeOrBudgetFailure, accepted, coverageComplete: accepted, status: accepted ? 'withdrawal-rectangle-accepted' : runtimeOrBudgetFailure ? 'withdrawal-rectangle-incomplete' : 'withdrawal-rectangle-rejected', issues, samples, evaluatedCells, certifiedCells, unresolvedCells, rejectedCells, minimumCertificateMarginM, elapsedMs, budgets: {maxCells, maxSamples, maxDepth, maxElapsedMs}, coverage, cells, motionBoundBasis: 'The opaque proof is built from exact stationary/rigid-translation motion or the unchanged all-domain affine mating-reservoir construction. For each source-arc pair, the maximum norm of relative vertex coefficient displacement over both half-widths bounds its motion throughout the rectangle cell. Both participants and the numerical enclosures contribute. Neighbor capsules come only from the complete proven route registry, preserving max(clearanceA, clearanceB). Every solid and its route-specific apertures share the proved rigid translation. Dyadic leaf identity proves full area coverage; finite samples alone never establish coverage. Eligible derived-neighbor segment pairs may additionally use the existing validated fixed-axis separation API with affine support intervals over all cell parameter corners and both endpoints of every original material piece clipped to the padded center section with outward-rounded fixed fractions, retaining all interior knots and full neighbor endpoints; full participant radii, the unchanged two-enclosure allowances, and separate conservative interpolation/projection roundoff are retained. Registered stationary or rigidly translating actual capsules may use the same conservative material/corner support construction with both full original capsule endpoints, full outer radius, both existing two-enclosure allowances, and additive roundoff. The existing derived-neighbor helper remains unchanged. Unsupported or nonpositive witnesses retain the unchanged coefficient-norm fallback.'};
}
