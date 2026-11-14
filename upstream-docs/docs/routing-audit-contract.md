# Routing geometry and continuous-clearance contract

**Scope note, 14 November 2026:** this document retains the detailed validator's
technical contract. Project PDR routing acceptance now follows
[the harnessing PDR scope](harnessing-pdr-scope.md). That review does not require
closing the exact-material or universal continuous-motion proof campaign.
Missing or unresolved coverage still fails this validator's own report; no
failure, unknown or historical result is reclassified as a full engineering
pass. PDR findings and detailed verification results are reported separately.

`dist/routing-audit.js` supplies the shared routing check. All coordinates,
physical radii, bend radii and clearances are in metres in a common frame.
`node routing-audit-checks.mjs` runs adversarial checks, including an obstruction
between otherwise clear animation poses and corruption of rendered mesh buffers.

## Route and obstacle records

`auditRoutes(routes, obstacles, options)` returns `ok`, `issues`, `issueCount`,
`minimumClearanceM` and coverage counts. Every route needs a unique `id`, at least
two finite `points` arrays, and a positive physical `radiusM`. Optional fields:

- `from` and `to`: `{position: [x,y,z], normal?: [x,y,z], toleranceM?}`. Normals
  point outward from the connector into the cable; endpoint gaps and departure
  direction are checked. Three Object3D anchors are accepted by the tube adapter.
- `clearanceM`: required free space beyond the outer jacket.
- `minBendRadiusM`: the required minimum radius. `minimumBendRadiusM` is a
  constructed or measured actual radius, never the requirement copied back.
- `maximumLengthM`: maximum available cut length; `restLengthM` with
  `lengthToleranceM` additionally checks that moving lines do not create cable.

Use `routeFromTube(tube, options)` for `connectionTube` geometry. It reconstructs
every ring centre and radius from the actual transformed position buffer. It
also checks that rendered caps and ring centres match the generator's samples.
For a constructed path, it independently resamples the original double-precision
point sequence with every source vertex preserved and compares every resulting
ring against the actual buffer. Agreement with `pointAt` alone is insufficient:
changing the nominal recipe while retaining the old displayed curve must fail.
The accepted minimum bend radius is the smaller of the construction's declared
radius and the circumradius measured from those original points, before extra
collinear ring subdivisions are added. Only double-precision collinear noise
within a one-picometre floor plus a coordinate/transform roundoff bound is
removed. A relative angular test retains densely sampled tight arcs that an
absolute triangle-area threshold would miss. A nominal angular jump exceeding
45 degrees cannot claim to be a finely sampled circular fillet and fails.
Exact point/buffer/transform comparisons govern the cached measurements.

This avoids a false half-radius estimate from short subdivisions of a faceted
arc while still rejecting a tight curve falsely assigned a generous bend
radius, an unrounded three-point corner, and a forged straight recipe. Generic
polylines receive a discrete circumcircle/reversal curvature screen.

Obstacles may be explicit `{id, type: 'box', min, max}` allocations or come from
`obstacleFromMesh(mesh, {id})`. The latter uses the actual world transform and
either exact oriented-box distance or transformed surface triangles. Closed
triangle meshes additionally check contained segments; a cable wholly inside
a solid cannot pass because it did not cross a surface. Open surfaces remain
two-sided collision boundaries. Unsupported instanced geometry throws instead
of silently omitting physical obstacles.

`obstaclesFromMeshes` adapts several meshes. Neither adapter skips an obstacle
because it is hidden, belongs to an endpoint, has a particular material or is
unrelated to a selected part. The caller must provide the complete physical
registry; visualization and engineering overlays must not enter that registry.
Use `expectedRouteIds` and `expectedObstacleIds` options to enforce its coverage.

The checker treats cable segments as capsules. It checks finite radius against
solids, nonadjacent segments of the same cable, and all other registered lines.
Self adjacency is limited by intrinsic arclength, not by an arbitrary number of
neighbouring vertices. Required bend radius handles physically tight turns.
Shared physical sections should be one continuous route with duplicate junction
points removed; separate circuits must not claim the same space.

Real pierced meshes are preferred for bulkheads. Explicit apertures use
`obstacle.apertures: [{id, min, max, routeIds: [exactRouteId]}]`. The route must
fit inside the throat after shrinking it by its full radius plus clearance. The
allowance affects only that obstacle and those route IDs, only within the
declared volume. The throat must extend through the complete wall thickness.
There is no blanket source/destination or whole-wall exclusion.

`segmentObstacleClearance(a,b,obstacle,{radiusM,clearanceM,routeId})` and
`routeClearance(route,obstacles,{otherRoutes,stopAtCollision:true})` support
planning with the same geometry. `auditRoutes(...,{maxIssues:1})` short circuits
after a failed check. Normal audits retain a capped issue list and total count.

## Installation planning order

The complete installation builds real equipment, electrical connector banks,
fluid fittings and pierced wall glands before routing either discipline. Fixed
electrical fan-outs, straight connector approaches and backshell withdrawal
volumes are reserved first. `planStaticFluidConnections` accepts these as
`reservedObstacles`, in addition to every actual physical mesh. The resulting
fluid centreline buffers then occupy space for both electrical route selection
and the allocation of constant-length connector service loops. The protected
bus first allocates its complete tray layout, then places the service reservoirs
against every retained route and the swept reservations of earlier reservoirs.
This prevents an early solar loop from consuming a later equipment corridor.
Other families allocate each route and its service reservoir before selecting
the next circuit. A compact reservoir may use a free local bay along
a long straight run; its complete finite-radius geometry and withdrawal poses
pass the same screens as the larger reservoir candidates. All future connector
approaches and withdrawal volumes remain reserved throughout this process.
Every accepted reservoir additionally proves an affine, constant-radius,
constant-length construction over both independent plug strokes. Oriented
segment enclosures include the full jacket, required clearance and derived
numerical padding. Each retained circuit must clear that complete enclosure,
including between the construction poses. These volumes are planning
reservations, not fictitious physical hardware or collision exemptions.
The final fluid
recheck retains the same terminal reservations and all installed electrical
routes. A failed proposal remains a reported failure; its previous tube stays in
the physical inventory so that subsequent work cannot route through it.

This order prevents a fluid route planned before a connector existed from
blocking that connector, and prevents electrical service loops from crossing
fixed plumbing. It does not replace the final combined static and continuous
audits. No successful per-discipline result grants a collision exemption.

Termination apertures are fixed in the local frame of their actual physical
shell. Withdrawing a plug moves its own bore while the fixed panel receptacle's
bore remains in place. Per-route scope and finite-radius material-contact
interval checks apply to both. Moving a cable endpoint never moves a hole in
unrelated fixed material.

Circular fillets share each adjacent segment according to the sum of their
actual tangent trims. A shallow corner can use less than half the segment while
its steeper neighbour uses more; only a genuinely insufficient combined tangent
budget reduces the radius and fails the bend requirement. The constructor
reports both rendered chord length and `developedLengthM`, the exact sum of
remaining straight lengths and circular arc lengths. Procurement and fluid
accounting can therefore distinguish exact constructed length from a sampled
display centreline.

## Motion is an interval problem

`auditSweptRoutes({sample,start,end,motionBound,motionBoundBasis,...})` evaluates
the actual route/obstacle snapshots returned by `sample(t)`. A caller supplies
an analytic bound on the change of **each pair's clearance** from the interval
midpoint to any time in that interval. Both moving participants and any change
of shape must be included. The bound is not merely the observed displacement
between sampled poses. For rigid rotation about a known axis, angular travel
times maximum axis radius is a conservative displacement bound; sum the bounds
for two independently moving participants. Translation, radius changes and
procedural flex geometry need their own bounds.

An interval is certified only when its midpoint clearance exceeds the full
bound. Otherwise it is subdivided. A collision fails immediately; an interval
that is still unresolved at `maxDepth` or `minInterval` fails. Missing bounds,
observably understated bounds and topology changes fail. Split separate motion
domains at connector release/disconnect events and use stable route, obstacle
and sample identities within each domain. The result reports sample counts,
certified intervals, unresolved intervals and the supplied bound's basis.

This establishes collision clearance for the modeled geometry and motion
contract. Sampled endpoint/bend/length checks remain separately visible and do
not establish fatigue life, fluid performance, workmanship or qualification.
Supplier bend-life limits, clamp loads and as-built evidence remain distinct.

## Conservative reductions and motion certificates per pair

Collision work may simplify the rendered centreline by at most 2 micrometres.
The collision radius is increased by the same amount; connector, length, bend,
cap and seam checks still inspect the full buffer. Thus simplification cannot
create clearance. Cached segment bounds are invalidated by in-place point
changes. The adapter also retains the declared physical radius if floating
point ring measurements happen to be smaller.

Closed circular cylinders use a conservative analytic solid-distance adapter.
A retracted, zero-length cylinder remains its actual finite-radius cap disk,
with a stable obstacle ID. An occupied cable segment may be supplied as
`{id,type:'capsule',a,b,radiusM,bounds?}`; distance is exact segment-to-segment
distance minus the obstacle radius. Open or partial cylinders and arbitrary
meshes still use the displayed triangles. These are finite-radius solid checks,
not ray intersection tests.

For mixed rigid and flexible assemblies, `auditSweptRoutes` accepts the optional
`pairMotionBound(a,b,pair,{start,mid,end})` callback. It returns a nonnegative
bound in metres, or `{maxRelativeDisplacementM: bound}`. The `pair` record has:

- `kind`: `solid`, `self` or `line`.
- `routeA`, and `routeB` for line/self comparisons, preserving caller metadata.
- `obstacle` for a solid comparison, preserving caller metadata.
- `segmentA`, `segmentB` and endpoint arrays `a`, `b`, `c`, `d`.
- Null segment indices for a whole-route broad-phase bound. That bound must
  cover every segment of the route. Segment indices refer to the conservative
  collision polyline; `route.prefix` supplies its intrinsic arclength.

The ordinary collision audit still checks every supplied pair. The interval
certificate uses each pair's clearance minus its own motion bound. A known
common rigid attachment may have a zero relative bound even while its world
pose changes. A deforming cable must not declare its whole parent, whole
endpoint obstacle, or whole route invariant. An invariant terminal portion
requires a geometric proof of its maintained straight lead and local contact;
the rest of that cable remains subject to its deformation bound.

The global `motionBound` and documented analytic basis remain required. Sampled
geometry must not exceed that bound. Per-pair observed lower and upper distance
bounds additionally reject an understated relative-clearance bound when the
sampled geometry proves the discrepancy. Neither diagnostic derives a valid
continuous derivative bound from three poses: the caller must establish that
bound for the complete procedural motion. Unknown or unresolved domains fail.

A permitted throat is a finite geometric constraint. Its clearance participates
in the certificate even when a segment is fully inside the allowed contact
volume. A regression moves a line out of its throat between otherwise clear
coarse poses; it must fail. This prevents an exemption from appearing to have
infinite motion clearance.


## Reference frames and bounded memory

The actual-buffer adapters accept an optional rigid Three Object3D `frame`.
They apply `inverse(frame.matrixWorld) * mesh.matrixWorld`, preserving metres;
nonunit scale or shear in the reference frame fails. Object3D connector anchors
are transformed into that frame. Plain coordinate connector records and explicit
aperture boxes must already use the requested frame. A common vehicle frame
removes irrelevant world translation and rotation without removing any pair.

The observed-motion sanity check compares the actual geometric polylines, not
same-index tessellation vertices. Moving a tessellation point along an unchanged
straight cable does not imply physical motion. This check is an observed lower
bound only; the caller's analytic all-time motion enclosure remains mandatory.

The adaptive checker retains only its recursive endpoint/midpoint frontier.
Full triangle and tube snapshots therefore consume memory proportional to the
subdivision depth rather than the total number of evaluated poses.

## Verified separating-axis envelopes

An invariant projection can prove separation even when motion in other axes is
large. `auditSweptRoutes` therefore also accepts
`pairSeparationLowerBound(a,b,pair,{start,mid,end})`. Return `null` for ordinary
motion bounds, or the following explicit witness:

```js
{
  axis: [1, 0, 0],                 // unit vector in the snapshot frame
  rangeA: [-0.00001, 0.00001],    // full-interval centreline projection
  rangeB: [0.02999, 0.03001],
  sectionA: {startLengthM: 2, endLengthM: 3.5}, // optional rendered arclength span
  sectionB: {startLengthM: 4, endLengthM: 5.5},
  radiusUpperBoundA: 0.01001,     // full-interval jacket plus numerical envelope
  radiusUpperBoundB: 0.01001,
  basis: 'Both analytic loops remain in their fixed X planes for this interval.'
}
```

The selected span must contain the entire current collision segment. Its
original rendered arclength is available in `pair.sourceArcA` / `sourceArcB`;
collision simplification does not change those identifiers. A partial span does
not certify a whole-route broad-phase pair. With no section, the whole route is
selected. For a solid participant, range B encloses the full actual solid
projection and no radius B is required.

The engine verifies the projection of every actual rendered point in each
selected span at start, midpoint and end, including interpolated span boundaries.
It also verifies the actual physical radii against the supplied upper bounds.
False or malformed envelopes fail. The radius bound must include the 2 µm
conservative collision inflation as well as any all-time buffer rounding error.
The engine computes the separating gap minus those radii and required clearance;
a positive result strengthens only that pair's interval certificate. Ordinary
collision checking, all other pairs and global motion sanity checks remain.

Three-pose consistency is a corruption check, not the analytic proof. The caller
must establish that the procedural motion stays in the declared projected ranges
for every time in the interval. Invariant affine coordinate planes, or rigorous
projected interval arithmetic, provide such a basis; sampled extrema do not.

## Moving projection frames

A separating axis may rotate with a known analytic construction. Supply
`projectionFrames: {start:{axis,origin}, mid:{axis,origin}, end:{axis,origin}}`
in addition to the ordinary witness. Each axis must be a unit vector and each
origin finite. The engine verifies actual points against the stated ranges in
the corresponding frame at all three poses. Projection subtracts the origin.
The caller must prove that the same ranges hold in that moving frame throughout
the interval. Instantaneous unit-axis separation is valid regardless of motion
in the other directions; an arbitrary moving frame is not itself a proof.
A rotating, translating pair of parallel lanes and a deliberately incorrect
frame are regression cases.

## Convex U construction witness

A radius-constrained U with two convex turns totalling pi, nonnegative tangent
straight portions, opposite parallel terminal leads, and perpendicular lead
spacing at least twice the bend radius has an intrinsic self-clearance bound.
The optional separation callback may return this typed witness for a self pair:

```js
{
  kind: 'convex-u',
  spanId: 'circuit:flex',
  minimumBendRadiusM: 0.1,
  minimumLegSeparationM: 0.5,
  radiusLowerBoundA: 0.01,
  radiusUpperBoundA: 0.010003,
  maximumChordDeviationM: 0.1 * (1 - Math.cos(Math.PI / 32)),
  maximumBufferDeviationM: 0.00002,
  basis: 'Documented all-time generator inequalities, including nonnegative leads.'
}
```

The route must provide
`motionSpans: [{id, startM, endM, nominalPoints}]`; `sectionId` is accepted as an
alias for `id`. The span boundaries are actual rendered arclength. Nominal points
are the constructed circular-fillet polyline in the same reference frame,
retained alongside the actual buffer. Both complete collision segments must
lie within the selected span. A verified invariant straight continuation may
be included at an end; an adjacent curved or moving section may not be included
without satisfying the same construction.

The kernel verifies planarity, monotonic total turn, terminal directions,
minimum constructed radius, perpendicular leg spacing, physical radius bounds,
and actual-buffer distance to the nominal polyline at start, midpoint and end.
The supplied all-time construction proof must ensure these conditions continue
to hold, including the rounding generator's trim and length-solver limits.
The spacing is **perpendicular distance between the leads**, not endpoint chord
length. No generic nonconvex curve or an endpoint-obstacle pair is exempted.

Let `s0 = max(0, pi * radiusLowerBoundA + requiredClearance - arclengthError)`.
The default arclength error is twice the full rendered point count times the
buffer envelope plus a 10 nm projection tolerance. Optional
`maximumArclengthErrorM` may supply a tighter analytic bound; observed inflation
is checked against it. Actual points must also project in nondecreasing
arclength order onto the nominal polyline. A conservative intrinsic
chord lower bound is the smaller of `2 R sin(min(s0, pi R)/(2 R))` and the minimum
leg spacing. Subtract both jacket radii, required clearance, twice the maximum
arc/chord deviation and twice the buffer envelope. This strengthens a self pair
only if the resulting bound is positive. A claimed bound larger than an exact
observed pair distance fails. Radius corruption, nonplanar buffer corruption,
short leads and skew U geometries are covered by regressions.

## Exact caches and diagnostics

### Material inside compound meshes

Closed-mesh containment is evaluated separately for each edge-connected closed
component, and their material interiors form a union. Whole-mesh even/odd ray
parity would incorrectly cancel the interiors of two overlapping closed parts
stored in one buffer. Duplicate faces are removed for topology analysis, and a
closed component retains its interior even when the same buffer also contains
open sheet components. A connected annular part keeps its actual through-bore.
Nonmanifold components whose material topology is ambiguous use their complete
bounding boxes as conservative solid enclosures, including segment crossings
and aperture contact intervals. They cannot create a false clearance through
uncertain material. Disconnected nested closed shells are conservatively
treated as a union; cavities should have an actual connected boundary, as the
modeled drilled panels and annular fittings do. Tests include overlapping,
oppositely oriented, duplicated and touching box components, a mixed open and
closed mesh, and the clear bore and solid material of a torus.

### Reusing a complete stationary baseline

`createRoutingStationaryCertificate(snapshot, { auditOptions })` runs the full
static audit, including every route–solid, route–route and self pair. It also
checks the snapshot's expected IDs, inventory, planning failures and additional
issues. It returns `{ ok, audit, issues, certificate }`; a certificate is issued
only for a complete baseline with positive clearance. Self and interline checks
cannot be disabled for this baseline. The returned certificate is an opaque,
process-local token. Copying, reconstructing or deserializing its public fields
does not create a valid certificate.

The swept checker accepts `stationaryCertificate`, `stationaryMotionBasis` and
`stationaryMotionBound(a, b, participant, { start, mid, end })`. A participant has
`{ kind: 'route' | 'obstacle', id, record }`. The callback must provide a finite,
nonnegative **absolute displacement bound over the complete interval**, measured
from its midpoint. An exact zero asserts that the participant's full geometry,
radius and relevant metadata remain invariant throughout that interval; equal
sampled poses alone do not prove this. The basis must identify the construction
or kinematic property establishing the bound. Positive bounds keep the
participant active, even when its sampled geometry happens to equal the
baseline.

Before reusing a zero-motion participant, the engine compares its actual
geometry against the baseline at the current pose and both interval endpoints.
Route comparisons include every rendered centerline point before collision
simplification, physical radius, required clearance, connector positions and
normals, endpoint tolerances, bend requirements and measurements, rendered
buffer/topology checks, length limits and motion-span boundaries. Solid
comparisons include primitive parameters, exact transformed triangles, closure
and aperture geometry. No coordinate rounding or numerical equivalence
tolerance is used. Every pose must preserve the complete route and solid ID
sets, inventory and effective audit settings. Missing or extra participants,
inventory changes, a false zero-motion assertion or a forged token fail closed.
The ordinary per-pose buffer, endpoint, bend, length and inventory checks still
run for stationary participants.

Only pairs whose participants are both verified stationary reuse the baseline
clearance certificate. Every active route is checked against all solids and all
other routes; every active solid is checked against all routes. Active self
checks also remain enabled. The baseline's conservative minimum clearance is
retained in the interval certificate. The optimization avoids creating
quadratic diagnostic rows for unchanged pairs; counts report
`stationaryRoutes`, `stationaryObstacles`, `reusedStationarySolidPairs`,
`reusedStationaryLinePairs` and `reusedStationarySelfRoutes`.

For a direct static audit, pass the token and the complete
`snapshotEvidence` to `auditRoutes`. Its optional motion callback takes only
`participant`; a motion-aware call also requires `stationaryMotionBasis`.
A static call without motion callbacks may reuse exact baseline geometry, but
that result alone is not an all-time motion certificate. Tests cover silent
mesh/tube-buffer edits, metadata changes, false zero bounds, missing and extra
IDs, forged tokens, and moving routes or solids that collide between otherwise
clear sampled poses.

### Bounded exact collision caches

`createRoutingCollisionCache()` creates a bounded cache that can be passed as
`auditOptions.collisionCache` to the swept checker, or directly to `auditRoutes`.
Solid keys include exact coordinates, shape, closure and aperture geometry.
Route keys include every collision point, physical radius and required
clearance. No rounding is used in cache identities. Changing an obstacle,
aperture, route point or radius invalidates its result. Whole route–solid and
route–route results are reused only for identical geometry and a zero relative
motion bound. Static checks on connectors, bend allocation, length and actual
buffer integrity still run. Whole-route bounds may be requested for `solid`,
`self` and `line` pairs; null segment/arclength selectors mean the entire route.

The cache also has global limits, rather than multiplying a per-solid allowance
by every installed solid. Defaults retain at most 50,000 solid/aperture segment
results, 20,000 line results, 150,000 whole-pair results and 32 MiB of solid
signatures. Whole-pair results refer to current geometry generations rather
than retaining obsolete coordinate strings. Absent route and obstacle IDs are
pruned. `cache.occupancy` reports retained counts, and `cache.clear()` releases
all retained results between independent activity certificates. Eviction or
clearing triggers exact recomputation; it cannot change the acceptance rule.
Deeply frozen triangle arrays may use immutable identity tokens instead of
repeatedly serializing their coordinates. This applies only after all nested
coordinate arrays are verified frozen. The adapter still compares every source
buffer value and transform before reusing the array; mutable caller arrays use
complete coordinate signatures. Replacing triangles while retaining the same
bounding box invalidates the result.

The broad phase groups at most eight consecutive collision segments into an
axis-aligned box. A box may certify its segments only when its finite-radius
distance lower bound exceeds the applicable whole-route motion bound. Nearby
blocks retain the exact segment comparisons, aperture checks and scoped
witnesses. This reduces repeated distant-pair work without changing the
geometric predicate. Collision simplification preserves every declared
`motionSpans` boundary, including `proofOnly` spans. A boundary between rendered
vertices preserves both bracketing vertices and inserts an exact collinear
collision-only point at the boundary. The displayed buffers remain unchanged.
Source arclength selectors retain their original rendered values and cannot
silently grow across a declared motion or intrinsic-proof boundary.

A positive, validated separating-axis witness can likewise prune a complete
solid or interline pair, or a selected segment pair. The adapter still projects
all selected actual rendered points and the complete conservative solid at
every supplied pose and checks physical radius bounds. Its finite projection
gap remains in the certificate and clearance report. Intrinsic self witnesses
retain their ordinary exact distance and intrinsic-adjacency checks; they are
not used to skip those tests.

The mesh adapters also cache recovered geometry. Their cache key compares the
geometry and attribute identities, topology parameters, full frame matrix and
**every actual position and index buffer value**. Attribute version numbers are
insufficient: a silent `setX` or index mutation must invalidate the cache even
without `needsUpdate`. Recovered solid arrays are immutable; returned route
points are fresh copies. Connector anchors, declared radii, current generator
samples and options are checked on every extraction. Dynamic tubes also verify
their exact side and cap index topology. Analytic cylinders are bounded from
the actual vertex radius and axial extent, so a mutated or translated buffer
cannot remain hidden inside a stale nominal primitive allocation.

Large immutable mesh surfaces use a triangle AABB hierarchy for exact distance,
ray containment and local material-contact queries. Hierarchy nodes enclose
actual triangle coordinates; a node is skipped only when its lower bound proves
it cannot change the result. Reuse requires recursively frozen recovered
coordinates. Mutable caller-supplied triangles retain direct scans, while a
changed actual position/index buffer generates a new immutable surface and a
new hierarchy. Large geographic terrain therefore remains physical geometry in
runtime routing instead of forcing every candidate segment to scan every distant
terrain triangle.

`routeClearance`, the planning helper, has separate solid and occupied-line
AABB hierarchies. Their cache identities compare current bounds exactly; leaf
checks always use the current solid and current line coordinates. Primitive
bounds are reconstructed from their physical dimensions, so a changed capsule
radius cannot retain a stale smaller caller box. Distant nodes contribute finite
conservative clearance lower bounds. Possible contacts use the same exact
finite-radius kernel, and invalid coordinates, radii or apertures fail closed.

The adaptive checker also accepts `onInterval(info)` and `maxSamples`.
Diagnostics expose the interval, depth, sample count, clearance certificate and
limiting pairs. Each limiting pair includes its worst segment indices, original
arclength spans, clearance, motion bound, witness result and obstacle name.
Exhausting the sample budget returns `motion-sample-budget` with unresolved
coverage and fails the release gate. Diagnostics and resource limits never turn
an unresolved interval into a pass.

Collapsed physical meshes remain in the registry. A zero-length circular
cylinder remains its disk. Other entirely degenerate meshes receive a
conservative capsule containing every transformed vertex and edge. Their stable
source-geometry identity and source vertices allow a continuous check to follow
collapse and re-expansion without discarding the hardware. An unrelated topology
or source-vertex count change still requires a separate declared domain.
Collapsed or very thin faces inside an otherwise ordinary mesh are retained
too. Their conservative segment/capsule distance cannot erase an edge simply
because another face has nonzero area.

For route-scoped apertures in a nonconvex mesh, the continuous throat margin is
computed over the union of real finite-radius material-contact intervals for
every triangle and every closed-solid interior interval. Empty space inside
the mesh's bounding box does not manufacture a zero axial throat margin. Each
contact interval still has to fit inside a registered, fully radius-shrunk
aperture, and the remaining route is checked against the complete solid. An
unrelated face in the same mesh remains an obstruction.

## Launch and site gate

`launch-routing-checks.mjs` inventories every rendered service, water, commodity,
lightning and guy-wire tube in the fifteen shipped launcher/site pairings.
It checks actual fixed and flexible tube rings, source and receiving fittings,
finite-radius solids, interline/self clearance, bend allocation and developed
length. Continuous domains follow pad withdrawal, liftoff, staging, fairing
separation and payload release; explicitly declared stage-presence boundaries
match the modeled scene. An absent, failed or unresolved domain fails coverage.
Subset command-line runs are diagnostic and cannot return a complete-matrix
pass. Partial checkpoint files are explicitly marked incomplete.

Pull-away head stow positions are allocated outside the horizontal projection
of the complete actual vehicle geometry through the first 35 seconds of
attitude rotation, with a one-metre design margin. This prevents a later rising
appendage from striking a disconnected lead that only cleared the local
barrel. The Super Heavy grid-fin regression restores the former 3.015 m payload
withdrawal and must detect the real lattice strike at 4.46875 seconds; the
corrected allocation also passes the actual-buffer pose check. This placement
envelope does not replace the continuous collision gate or the separate
provider interface and mechanism qualification evidence.

Launch U loops explicitly request `lengthMetric: 'developed'` from
`constantLengthHingeRoute`. Their physical cut length includes the true circular
fillets. The shared helper's compatibility default remains the rendered
polygon length; existing perpendicular fluid loops have constant corner angles
and therefore a constant arc/chord deficit. A skew launch loop must not use
that default: preserving its polygon length alone allowed the underlying
physical length to vary as the tessellation's chord count changed.

For an untrimmed U with chord length `d`, perpendicular chord component `h`,
common straight control length `l` and bend radius `R`, the two fillets turn
through a total of pi and their tangent trims sum to `2 R d/h`. Its physical
length is `2 l + d + pi R - 4 R d/h`. The construction inequalities below retain
both full-radius fillets over the entire motion. Bisection on that developed
length has slope 2; 28 iterations bound its length error by `2 L / 2^28`, plus
reported double-precision roundoff.

The displayed tube follows polygonal chords. Every arc chord subtends at most
`pi/16`, so the complete U's deficit is at most
`pi R (1 - sin(pi/32)/(pi/32))`. Fixed feeds use their independently computed
total corner angle in the same bound. `lengthEvidence` reports physical rest
length, independently reconstructed developed length and its error, actual
rendered length, chord deficit and both numerical bounds. The generic rendered
length check permits only this declared chord deficit and the bound derived
from actual ring-to-curve error. A separate strict physical-length check does
not use that display tolerance. It regenerates the canonical fillets from
retained controls and compares their original points to the rendered tube's
recipe; the usual adapter still verifies every displayed ring. A 100-micrometre
physical-length corruption must fail even though it is smaller than the valid
display chord deficit. These checks are snapshot issues and remain mandatory
at every continuous-proof sample.

Long launch matrices may run in independent shards, for example:

```sh
node launch-routing-checks.mjs --shard 1/2 --output /tmp/launch-1.json
node launch-routing-checks.mjs --shard 2/2 --output /tmp/launch-2.json
node launch-routing-checks.mjs --merge /tmp/launch-1.json,/tmp/launch-2.json --output /tmp/launch-complete.json
```

A finished shard may report `coverage.selectedComplete: true`, while its main
`ok` and `coverage.complete` remain false until all fifteen configurations are
present. Only the merge gate may produce the full-matrix pass. It requires
every case exactly once, the exact expected motion domains, positive interval
certificates covering each entire domain without gaps, zero unresolved
intervals, and passing static, inventory, mating, construction and terrain
checks. Missing, duplicated or incomplete cases remain failures.

Each report and atomic `.partial` checkpoint contains a SHA-256 manifest of the
checker, its local import closure and public JSON assets. Source identity is
checked again at every checkpoint and at completion. The merge gate compares
every shard against the current source. A trusted checkpoint produced by the
checker can be resumed with `--resume /tmp/launch-1.json.partial`; only successful
domains from exactly matching source may be reused, and an incomplete case's
static and construction checks run again. Unfingerprinted older reports and
reports from a process whose source changed cannot resume or merge. These
manifests detect stale or mixed-source evidence; they are not authentication of
arbitrary externally supplied reports. The source helper in
`scripts/routing-source-fingerprint.mjs` also supports the full public
production/test script and data manifest used by the aggregate gate.

The launch proof uses exact rigid translation/rotation bounds, fixed-length
circular-U construction inequalities and validated separating projections.
Each motion domain also receives a full starting-pose collision certificate.
Only hardware with exactly zero analytic absolute owner and local-joint motion
over that entire domain can reuse its fixed-pair results. A temporarily paused
subinterval inside a moving domain stays active. The shared opaque-baseline
validator rechecks actual centerlines, radii, endpoints, solid geometry,
apertures, allocations and inventory at every sampled pose. Unknown owners or
motion types fail, and every moving participant is still checked against all
others. The pad's fixed datums use exact ancestor-matrix products so an unrelated
camera-follow translation cannot introduce artificial aperture motion.
Terminal-ray refinements cover only the guaranteed minimum straight length,
with those boundaries retained in the collision polyline. Starship booster
departure is enclosed by interval arithmetic over every partial 0.25-second
step of the renderer's own midpoint integrator. Fairing bounds use exact extrema
of affine translation plus trigonometric rotation. These are interval proofs;
regression poses crossing integration boundaries verify the implementation but
do not replace the proofs.

For an untrimmed U, removing a guaranteed terminal straight leaves a curve in
the convex hull of the remaining straight controls. A plane through the
opposite endpoint and shortened lead gives a positive separation bound from
the terminal hardware or a fixed incoming line span. Its connector-normal
component is bounded using exact interval extrema of the axial endpoint
difference. The binormal of the entire U is also enclosed by the exact range
of `atan2(tangential travel, positive terminal height)`. Projecting every actual
solid vertex over this angular range can separate neighbouring couplings and
clamps without assigning them zero motion. Every selected rendered span, solid
and physical radius is checked against these enclosures at each sampled pose.
The intrinsic self predicate and ordinary distance predicate remain active
where no positive projection certificate is available.

`kind: 'convex-planar'` generalizes the intrinsic witness to a convex planar
span whose total tangent rotation is at most pi. It uses the same fields as
`convex-u` except that perpendicular leg spacing is not required. Optional
`maximumTurnRad` defaults to pi and may be smaller. The validator rejects an
inflection, reversal, nonplanarity, or observed turn exceeding that limit.
For curvature bounded by `1/R`, projection on the tangent-angle bisector bounds
a span's chord by `2 R sin(min(pi,S/R)/2)` at intrinsic separation `S`; the same
finite-radius, polygon and buffer deductions apply. A path with greater total
turn needs overlapping individually valid spans and ordinary checking for
pairs that share no such span. A whole 270-degree loop does not qualify.


`kind: 'bounded-turn'` accepts a planar span with inflections only when its
**total absolute** tangent variation is at most `maximumTurnRad <= pi`. It
retains the radius, actual-buffer, arclength-order and arclength-error guards.
To see the bound, enclose all tangents in an interval of width theta and project
on its bisector. Traversing that interval with curvature at most `1/R` requires
at least `R theta` length and contributes at least `2 R sin(theta/2)` projection.
Every remaining length contributes at least `cos(theta/2)` per metre. Thus the
projection is at least `2 R sin(theta/2) + (S-R theta) cos(theta/2)`, minimized at
`theta=min(pi,S/R)`. A longer subarc still has chord at least `2R`. The caller's
all-time construction proof must bound absolute variation, including every
inflection; a small net end-to-end tangent change is insufficient.

## Export and replay

The inspector exports an `orbital-routing-export-v1` envelope using
`serializeRoutingExport` from `dist/routing-export.js`. Its `payload` contains
the pose report and snapshot. `numberEncoding` is
`path-tagged-json-numbers-v1`; `specialNumbers` explicitly lists each payload
path containing positive or negative infinity, NaN, or negative zero. The
corresponding JSON value is a null placeholder. Every other finite value and
ordinary null retains its meaning.

This distinction is required for a straight tube: its valid infinite bend
radius becomes null under ordinary `JSON.stringify`, which must fail the
strict bend-measurement check. Invalid NaN coordinates must likewise remain
invalid after export. A consumer must decode the declared envelope and must
never infer infinity from an untagged null. The parser rejects unknown schemas,
unknown number tokens, duplicate or missing paths, untagged non-finite numbers,
and markers that would overwrite a finite value.

```js
import { readFileSync } from 'node:fs';
import { parseRoutingExport } from './dist/routing-export.js';
import { auditFlightRoutingSnapshot } from './dist/flight-routing-registry.js';

const { snapshot } = parseRoutingExport(readFileSync(exportPath, 'utf8'));
const result = auditFlightRoutingSnapshot(snapshot);
```

Replaying a pose snapshot repeats its geometric check. It does not establish a
continuous motion certificate or close the separately disclosed supplier,
hydraulic-network, tolerance, and fatigue evidence.

## Service-reservoir planning envelopes

`matingReservoirSweptObstacles(allocation, { id, radiusM, clearanceM })` in
`dist/electrical-service-loops.js` reserves the whole rectangle of independent
source and destination plug withdrawal strokes. It returns `ok`, `issues`,
`obstacles`, and `proof`. An unresolved proof returns no substitute obstacles
and must block acceptance. The allocator performs this proof before it caches
or returns a service allocation, so another cut pair or placement can be tried.

The proof starts with the affine control-point coefficients. It verifies fixed
edge directions, positive edge lengths, conserved developed length, unchanged
turn topology, and sufficient tangent lengths for the full allocated circular
fillet radius throughout both strokes. The four corner constructions and a
midpoint are consistency checks on that analytic construction; they do not
replace the all-domain proof. Every straight polyline segment lies in the
convex hull of its two endpoints at the four stroke extremes. An oriented box
encloses that hull with cable radius, configured clearance, and numerical
padding. Stationary segments retain ordinary capsules. This avoids inflating
every direction by the stroke, which would unnecessarily close parallel lanes.

These are planning reservations, not extra physical scene meshes. They remain
available to subsequent electrical and fluid planners, carry exact owning
route IDs, and use the allocation's coordinate frame. A caller that transforms
an allocation must transform its controls and directions consistently before
constructing the envelopes. The final continuous actual-buffer collision
certificate remains mandatory: a planning reservation is not a substitute for
checking the installed cable, both connectors, nearby solids, and other lines.

## Fixed collector banks

`accommodateFixedSolarCollectors` places each body-fixed solar source bank only
after its repeated connector count and separate polarity footprints are packed.
The allocation includes the enclosure, attached panels, all mating shells and
backshells, the complete45mm withdrawal stroke, and the allocated straight cable
approach along each physical connector normal. A bank moves inward by its
measured side-wall shortfall. If its footprint overlaps occupied rack slots or
the actual35mm rack rails, it moves above their full envelope; the nearest free
axial station clears the unchanged magnetic rods. Every face remains bounded by
the real wall thickness. The12mm planning margin is a project accommodation
allocation, not a universal workmanship standard or supplier qualification.

The pure layout is checked independently against installed physical material by
`inspectFixedCollectorHardware`. Actual rendered mesh edges and closed-solid
containment test the junction and connector assembly against every neighboring
object; conservative operating envelopes are retained. The full plug stroke is
reserved before comparing it with other hardware, including the other plugs in
the same bank. Only that particular plug's mating receptacle may share its
stroke. Explicitly identified members of the same rigid busbar/junction assembly
may meet mechanically, but they remain obstacles to all routed cables. Missing
material, missing circuits or strokes, moved datums, and unresolved interference
enter the canonical routing accommodation issues and block the routing gate.

Both body and local connector datums change together, and installed part
metadata records the corrected station. Existing connector quantities retain
their harness mass allocation. The PV material and root-drive mass stations are
not reassigned to a small fixed junction: an independently measured collector
enclosure/busbar mass split remains open and is reported with the allocation.
The shared routing configuration catalog supplies all six mission starters and
all six reference studies to the packing regression.

## Dense PCDU departure corridors

An explicit project policy assigns payload banks with at least 64 physical feeds
their own coordinated source comb. Every actual +X connector retains its
position, normal and radius. Source Z rank orders the departure distance in X;
source Y rows remain separate. This prevents an early longitudinal run from
blocking a later connector's departure. The complete rounded guides and their
following straight planning leads are checked pairwise, checked against actual
hardware and all other terminal volumes, and reserved before fluid routing.
An unsupported source frame or unresolved corridor remains an accommodation
failure. The 64-feed threshold selects this corridor policy; it grants no
collision, bend, inventory or motion exemption to smaller banks.

These banks allocate all static circuits before mating reservoirs. Every new
reservoir retains the other complete static paths and the full previously
accepted swept volumes. Source-comb validation is a local accommodation result;
the complete routes, all fluid reroutes, all connector strokes and the full
animation-domain certificates remain separate required gates.

## Packed equipment accommodation

Multiple rows of fabric cassettes use separate overhead service bays along body
Z. The original 85 mm vertical pitch was smaller than populated front panels
and placed unrelated MPO plugs in one another's withdrawal volumes. The bay
policy reserves each complete panel and forward service corridor, keeps every
worker/uplink/control/power interface, and reports an infeasible wall or rack
allocation rather than growing the enclosure or removing equipment. The same
`electricalBoxLayout` centers drive both the rendered cassettes and their
existing equal-share fabric mass distribution.

High-density controllers whose original enclosures intersect occupied rack
slots receive declared side pockets. A high-current controller's full approach
must follow the side aisle; the tall rear-facing bank is real populated
connector geometry. Independently measured controller mass splits remain open
within the existing thermal/deployment allowances. Moving an interface does not
move the pumps, radiator, hinges or entire subsystem mass stations.

Every box carrying `routingAccommodation` metadata is inspected after actual
hardware construction. The guard checks its declared datum and full connector
inventory against actual enclosure/panel/plug material, all neighboring objects,
all complete plug strokes and all straight cable approaches. Missing or
interfering material enters the canonical accommodation issues. Analytic bay
fit, actual hardware accommodation and complete circuit/motion verification are
separate results; none substitutes for the others.
