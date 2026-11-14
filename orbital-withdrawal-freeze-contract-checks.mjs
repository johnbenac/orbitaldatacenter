// Direct H08-P4 helper semantics plus one public synthetic moving snapshot.
// The private helper is compiled byte-for-byte from the selected real kernel.
// This file exports no helper, memo, or caller-controlled trust operation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {types as nodeTypes} from 'node:util';

const root = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), options = {};
for (let i = 0; i < args.length; i += 2) {
  assert(['--module', '--receipt'].includes(args[i]) && args[i + 1] && !Object.hasOwn(options, args[i]), 'Use [--module KERNEL] --receipt NEW.json');
  options[args[i]] = args[i + 1];
}
assert(options['--receipt'], 'A new --receipt path is required.');
const modulePath = path.resolve(root, options['--module'] || 'orbital-withdrawal-rectangle.mjs');
const receiptPath = path.resolve(root, options['--receipt']);
assert(!fs.existsSync(receiptPath));
const source = fs.readFileSync(modulePath, 'utf8');
const start = source.indexOf('// BEGIN trusted recursive freeze');
const end = source.indexOf('// END trusted recursive freeze');
assert(start >= 0 && end > start);
const helper = source.slice(start, end);
const original = `function freeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value); for (const child of Object.values(value)) freeze(child, seen); return Object.freeze(value);
}`;
assert(fs.readFileSync(path.join(root, 'docs/harnessing-work/H08-all-targets/work/p3-rectangle.copy.mjs'), 'utf8').includes(original), 'Reference helper must match retained P3 bytes.');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceBefore = sha(source), results = [], started = Date.now();
function subject(code = helper) {
  const visits = [], freezes = [];
  const observedObject = new Proxy(Object, {get(target, key) {
    if (key === 'values') return value => { visits.push(value); return Object.values(value); };
    if (key === 'freeze') return value => { freezes.push(value); return Object.freeze(value); };
    return target[key];
  }});
  const freeze = new Function('nodeTypes', 'Object', 'Array', 'Reflect', 'WeakSet', `${code}\nreturn freeze;`)(nodeTypes, observedObject, Array, Reflect, WeakSet);
  return {freeze, visits, freezes};
}
function test(name, body) {
  try { const evidence = body(); results.push({name, pass: true, evidence: evidence ?? null}); }
  catch (error) { results.push({name, pass: false, error: {name: error.name, message: error.message, stack: error.stack}}); }
  console.log(JSON.stringify(results.at(-1)));
}
const frozen = (...values) => values.forEach(value => assert(Object.isFrozen(value)));

test('primitives-and-functions-preserve-original-return-and-traversal', () => {
  const s = subject(), fn = () => {}; fn.child = {};
  for (const value of [null, undefined, false, 0, 1n, 'text', Symbol('x'), fn]) assert.equal(s.freeze(value), value);
  assert.equal(s.visits.length, 0); assert.equal(Object.isFrozen(fn), false); assert.equal(Object.isFrozen(fn.child), false);
});
test('shared-cyclic-data-graphs-complete-before-repeated-reuse', () => {
  const s = subject(), leaf = {point: [1, 2, 3]}, a = {leaf}, b = {leaf, a}; a.b = b;
  assert.equal(s.freeze(a), a); frozen(a, b, leaf, leaf.point); assert.equal(a.leaf, b.leaf);
  const visits = s.visits.length; assert.equal(new Set(s.visits).size, visits);
  s.freeze(b); s.freeze(a); assert.equal(s.visits.length, visits, 'Completed graph identities should skip subsequent traversal.');
  assert.throws(() => leaf.point[0] = 9, TypeError);
  return {uniqueInitialVisits: visits, repeatVisits: 0};
});
test('externally-shallow-frozen-parents-still-freeze-descendants', () => {
  const s = subject(), child = {nested: [1, 2]}, parent = Object.freeze({child});
  assert(!Object.isFrozen(child)); s.freeze(parent); frozen(parent, child, child.nested);
  assert(s.visits.includes(parent) && s.visits.includes(child));
});
test('interrupted-cycle-never-publishes-early-child-completion', () => {
  const s = subject(), a = {}, b = {ancestor: a}; a.early = b;
  a.late = new Proxy({}, {preventExtensions() { throw new Error('late ancestor failure'); }});
  assert.throws(() => s.freeze(a), /late ancestor failure/); assert(Object.isFrozen(b)); assert(!Object.isFrozen(a));
  delete a.late; a.newGeometry = {points: [[3, 4, 5]]};
  s.freeze(b); frozen(a, b, a.newGeometry, a.newGeometry.points, a.newGeometry.points[0]);
});
test('late-accessor-taint-reaches-earlier-cycle-on-later-call', () => {
  const s = subject(), a = {}, b = {ancestor: a}, generated = []; a.early = b;
  a.later = {get value() { const value = {generation: generated.length}; generated.push(value); return value; }};
  s.freeze(a); s.freeze(b); assert.equal(generated.length, 2); frozen(...generated);
});
test('frozen-getters-still-produce-fresh-recursively-frozen-values', () => {
  const s = subject(), generated = [], root = {get next() { const value = {geometry: [generated.length]}; generated.push(value); return value; }};
  s.freeze(root); s.freeze(root); assert.equal(generated.length, 2);
  for (const value of generated) frozen(value, value.geometry);
});
test('self-replacing-getter-preserves-original-two-call-behavior', () => {
  function run(code) {
    const s = subject(code), first = {first: true}, replacement = {points: [1, 2, 3]}, root = {};
    Object.defineProperty(root, 'geometry', {enumerable: true, configurable: true, get() {
      Object.defineProperty(root, 'geometry', {value: replacement, enumerable: true, configurable: true, writable: true}); return first;
    }});
    s.freeze(root); const afterFirst = [Object.isFrozen(root), Object.isFrozen(first), Object.isFrozen(replacement)];
    s.freeze(root); frozen(root, first, replacement, replacement.points); return afterFirst;
  }
  assert.deepEqual(run(helper), run(original)); assert.deepEqual(run(helper), [true, true, false]);
});
test('reentrant-and-failed-outer-traversal-cannot-publish-nested-memo', () => {
  const s = subject(), nested = {coordinates: [1, 2, 3]}, root = {};
  Object.defineProperty(root, 'first', {enumerable: true, get() { s.freeze(nested); return {}; }});
  root.late = new Proxy({}, {preventExtensions() { throw new Error('outer incomplete'); }});
  assert.throws(() => s.freeze(root), /outer incomplete/); frozen(nested, nested.coordinates);
  const before = s.visits.filter(value => value === nested).length;
  s.freeze(nested); assert.equal(s.visits.filter(value => value === nested).length, before + 1);
});
test('original-values-evaluation-and-postorder-freeze-order-retained', () => {
  function run(code) {
    const s = subject(code), events = [], first = {}, second = {}, root = {};
    Object.defineProperties(root, {a: {enumerable: true, get() { events.push('get:a'); return first; }}, b: {enumerable: true, get() { assert.equal(Object.isFrozen(first), false, 'Object.values must read all getters before descending into the first child.'); events.push('get:b'); return second; }}});
    s.freeze(root); return {events, order: s.freezes.map(v => v === root ? 'root' : v === first ? 'first' : 'second')};
  }
  assert.deepEqual(run(helper), run(original)); assert.deepEqual(run(helper), {events: ['get:a', 'get:b'], order: ['first', 'second', 'root']});
});
test('native-exotics-including-spoofed-prototypes-use-original-fallback', () => {
  const s = subject();
  const values = [new Map(), new Set(), new Date(), /x/, new Uint8Array(0), Object(7), Promise.resolve(1)];
  const spoofedMap = Object.setPrototypeOf(new Map(), Object.prototype), spoofedView = Object.setPrototypeOf(new Uint8Array(0), Object.prototype);
  values.push(spoofedMap, spoofedView);
  for (const value of values) {
    value.visibleChild = {point: [1, 2]}; s.freeze(value); frozen(value, value.visibleChild, value.visibleChild.point);
    const before = s.visits.length; s.freeze(value); assert(s.visits.length > before, 'Exotic object must not enter completed memo.');
  }
  return {fallbackGraphs: values.length, nativeBrandsRetainedAfterPrototypeChange: true};
});
test('proxy-traps-and-later-proxy-failure-exactly-match-original', () => {
  function run(code) {
    const s = subject(code), events = [], target = {child: {point: [1, 2]}}, handler = {};
    for (const name of ['getPrototypeOf', 'ownKeys', 'getOwnPropertyDescriptor', 'get', 'preventExtensions', 'defineProperty']) {
      handler[name] = (...args) => { events.push(name + (typeof args[1] === 'string' ? ':' + args[1] : '')); return Reflect[name](...args); };
    }
    const proxy = new Proxy(target, handler); s.freeze(proxy); s.freeze(proxy); frozen(target, target.child, target.child.point);
    handler.preventExtensions = () => { events.push('preventExtensions:throw'); throw new Error('repeat proxy failure'); };
    assert.throws(() => s.freeze(proxy), /repeat proxy failure/); return events;
  }
  const actual = run(helper), expected = run(original); assert.deepEqual(actual, expected); assert(!actual.includes('getPrototypeOf'));
  return {trapTraceLength: actual.length, matchesOriginal: true};
});
test('revoked-proxy-exceptions-are-preserved-even-after-earlier-freeze', () => {
  function run(code) {
    const s = subject(code), revoked = Proxy.revocable({}, {}); s.freeze(revoked.proxy); revoked.revoke();
    assert.throws(() => s.freeze(revoked.proxy), TypeError);
  }
  run(helper); run(original);
});
test('hidden-symbol-and-function-edges-never-create-trusted-graphs', () => {
  for (const mode of ['hidden', 'symbol', 'function']) {
    const s = subject(), root = {visible: {point: [1]}}, ignored = {notEnumerated: true};
    if (mode === 'hidden') Object.defineProperty(root, 'hidden', {value: ignored});
    else if (mode === 'symbol') root[Symbol('hidden')] = ignored;
    else root.callback = () => ignored;
    s.freeze(root); const count = s.visits.length; s.freeze(root); assert(s.visits.length > count);
    frozen(root, root.visible, root.visible.point); assert(!Object.isFrozen(ignored));
  }
});
test('fresh-moving-graphs-freeze-beside-reused-fixed-graphs', () => {
  const s = subject(), fixed = {triangles: [[[0, 1, 2], [1, 2, 3], [2, 3, 4]]]}; s.freeze(fixed);
  const a = {fixed, moving: {points: [[1, 0, 0]]}}, b = {fixed, moving: {points: [[2, 0, 0]]}};
  s.freeze(a); s.freeze(b); frozen(a, b, a.moving, b.moving, a.moving.points[0], b.moving.points[0]);
  assert.equal(s.visits.filter(value => value === fixed).length, 1); assert.notEqual(a.moving.points[0], b.moving.points[0]);
});

const kernel = await import(pathToFileURL(modulePath));
test('public-certifier-freezes-actual-moving-points-endpoints-solids-and-apertures', () => {
  const route = {id: 'moving-route', points: [[0, 0, 0], [0, 0, 1]], radiusM: .001, clearanceM: .001,
    from: {position: [0, 0, 0]}, to: {position: [0, 0, 1]}};
  const solid = (id, x) => ({id, type: 'box', min: [x, 4, 4], max: [x + 1, 5, 5], bounds: {min: [x, 4, 4], max: [x + 1, 5, 5]},
    sourceVertices: [[x, 4, 4], [x + 1, 5, 5]], apertures: [{id: id + '-aperture', type: 'box', routeIds: [route.id], min: [x, 4, 4], max: [x + .1, 4.1, 4.1]}]});
  const moving = solid('moving-solid', 4), fixed = solid('fixed-solid', 10);
  const proof = kernel.createWithdrawalAffineProof({domain: {from: [0, .01], to: [0, .01]}, baseline: {routes: [route], obstacles: [moving, fixed]},
    participantManifest: {routeIds: [route.id], obstacleIds: [moving.id, fixed.id], physicalObstacleIds: [moving.id, fixed.id], serviceObstacleIds: [], terminalObstacleIds: [], movingRouteIds: [route.id], movingObstacleIds: [moving.id]},
    ownedRouteIds: [route.id], routeMotions: [{id: route.id, kind: 'rigid-translation', fromCoefficient: [1, 0, 0], toCoefficient: [0, 1, 0]}],
    obstacleMotions: [{id: moving.id, kind: 'rigid-translation', fromCoefficient: [1, 0, 0], toCoefficient: [0, 1, 0]}, {id: fixed.id, kind: 'stationary'}]});
  const snapshots = [], originalFreeze = Object.freeze;
  let certificate;
  try {
    Object.freeze = value => { const result = originalFreeze(value); if (value && Array.isArray(value.routes) && Array.isArray(value.obstacles)) snapshots.push(value); return result; };
    certificate = kernel.certifyWithdrawalRectangle({proof, maxCells: 4, maxSamples: 16, maxDepth: 4, maxElapsedMs: 1000});
  } finally { Object.freeze = originalFreeze; }
  assert(certificate.accepted, JSON.stringify(certificate.issues)); assert.equal(snapshots.length, 5);
  const positionArrays = new Set();
  for (const snapshot of snapshots) {
    const r = snapshot.routes[0], m = snapshot.obstacles[0];
    frozen(snapshot, snapshot.routes, r, r.points, ...r.points, r.from, r.from.position, r.to, r.to.position,
      snapshot.obstacles, m, m.min, m.max, m.bounds, m.bounds.min, m.bounds.max, m.sourceVertices, ...m.sourceVertices, m.apertures, m.apertures[0], m.apertures[0].min, m.apertures[0].max);
    assert.equal(snapshot.obstacles[1], fixed); assert.notEqual(m, moving); positionArrays.add(r.points[0]);
    assert.throws(() => r.points[0][0] = 42, TypeError);
  }
  assert.equal(positionArrays.size, 5);
  return {syntheticSnapshots: snapshots.length, movingPositionIdentities: positionArrays.size, fixedIdentityPreserved: true, acceptedSyntheticOnly: true};
});
const unchangedSource = sourceBefore === sha(fs.readFileSync(modulePath));
const receipt = {schema: 'orbital-data-center/H08-P4-freeze-contract-receipt/1', startedAt: new Date(started).toISOString(), finishedAt: new Date().toISOString(), elapsedMs: Date.now() - started,
  module: path.relative(root, modulePath), moduleSha256: sourceBefore, exactHelperSha256: sha(helper), testSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))),
  extraction: 'Exact delimited private helper bytes; same native brand checks and intrinsics, with observing Object.values/Object.freeze delegates. Public-path fixture imports the actual complete candidate module.',
  actualSceneLoaded: false, H08Accepted: false, completed: true, accepted: unchangedSource && results.every(row => row.pass), unchangedSource, total: results.length, passed: results.filter(row => row.pass).length, failed: results.filter(row => !row.pass).length, results};
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({completed: true, accepted: receipt.accepted, total: receipt.total, passed: receipt.passed, failed: receipt.failed, unchangedSource, H08Accepted: false}));
process.exitCode = receipt.accepted ? 0 : 1;
