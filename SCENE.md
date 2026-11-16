scene.js exports createScene(container, {onPick:(componentId)=>{}}={}) synchronously. It returns {update(hardware, snapshot), setView(view), setOverlays(listOfIds), highlight(id), resetCamera(), destroy()}. view can be 'spacecraft','orbit','core' or displayed labels. Overlay IDs sun, albedo, ir, radiator, ram, pressure, thrust, dimensions. Component IDs solar,radiator,compute,storage,battery,propellant,cmg,communications,propulsion,structure. Selection invokes onPick with a component ID. The container must have position:relative, an explicit surface height, and the scene fills its bounds absolutely. Overlay controls/buttons and externally rendered annotation text are owned by the root UI.

The static client vendors Three.js r160, licensed under MIT (dist/vendor/THREE-LICENSE.txt). The Earth surface is NASA Blue Marble imagery distributed in the Three.js examples at https://github.com/mrdoob/three.js/blob/r128/examples/textures/planets/earth_atmos_2048.jpg. Flight views render the textured globe from the current inertial spacecraft position. The Earth texture follows Greenwich sidereal rotation. A separate 49° perspective pass preserves kilometre-scale depth while the foreground uses vehicle-scale inspection geometry. The local flight frame is along-track, orbit normal and radial up. Whole-vehicle views hold the observer in that frame. The compute-core and mechanism close-ups follow the bus and retain the same georeferenced sky. The global view shows the illuminated orbit, recent sub-satellite track, actual receiving station and an enlarged directional body-axis glyph in Attitude.

The inertial sky uses [NASA SVS Deep Star Maps 2020 by Ernie Wright](https://svs.gsfc.nasa.gov/4851/). The bundled 4096 × 2048 equatorial JPEG was tone-compressed from the linear EXR using a 0.62 display power and a white ceiling. The map places RA 0 at its center, north up, with RA increasing left. The rendered Milky Way, dust lanes and bright stars follow that J2000 survey. The Sun follows the simulation ephemeris. Its disk subtends [1,919 arcseconds at 1 AU](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html), with a separate illustrative camera glow. The sky is centered on the observer and rotates in the inertial frame. The foreground Earth naturally occludes it. A close spacecraft view also suppresses the Sun during the model’s eclipse state. The external Earth Orbit camera uses its own occultation geometry. The survey map loads from the site and triggers a redraw when ready. Before then the renderer draws a dark, exposure-sensitive background.

Four rolled solar blankets uncoil on tip mandrels deployed by paired slit-tube booms. After deployment the upper and lower root drives trim each bank independently and the solar rotary heads track the projected Sun. Ka and optical azimuth turntables carry elevation trunnions ahead of the reflector and within the optical barrel. Their static standoffs clear the swept heads above the deck. Every joint takes its realized angle or boresight from the engineering snapshot. The close-up truncates the transmitting beam at the vehicle-view extent. The globe shows both ends at orbital scale. A common depth-buffered triangle renderer implements the same camera and transforms on devices without WebGL.

Run `node flight-frame-checks.mjs` for observer ground motion, optical and RF boresights, deck clearance and moving-joint closure.

## Launch, enclosure, and drawing verification

The fourth camera key is `launch`. The scene accepts `setChapter(id)` and an `onHover(id, clientX, clientY)` callback. The launch configuration follows the shared flight phase and time, including negative elapsed time on the ground. Outside the launch and disposal episodes it displays a labeled, stowed design reference. The ten fleet configurations use the stowed sections from the launch sizing model and the geographic pad assignments in [launch-sites.js](dist/launch-sites.js). Pad release, exhaust handling and artwork follow the selected ground system. Flown equipment, proposed facilities and regional study pins carry separate provenance. The Starship scene retains the bay on its ship. Site structures, staging times and the plume and water-cloud shapes are visual reconstructions.

The operational vehicle has six finite-thickness enclosure walls with explicit round apertures. Occupied sleeves and gasket flanges are dimensioned from the enclosure inventory. The positive-axis side, deck and bulkhead are removed only for the Compute Core preset. The three other walls and the rack mounts remain visible. Each forward radiator bank has two rigid panels, a permanent root pivot, a second hinge and flexible supply and return lines. Each photovoltaic wing pays flexible blanket material off a travelling tip drum from a stationary root saddle. The compute cutaway shows one installed row per tray through 28 trays. Larger designs show 28 representative rows with an explicit on-screen count.

Run `node mesh-checks.mjs` to check scale handedness, finite vertex coordinates, face winding against mesh normals, zero-area triangles, manifold edge parity, positive enclosed volume, ray hits on all six exterior walls, occupied penetrations, chapter framing and tray representation. The software renderer uses the same Three.js buffers and normal matrices, interpolated lighting, perspective-correct texture sampling, mipmaps, alpha and antialiasing. GPU launch scenes additionally cast shadows from the installed hardware and handling fixtures.

## Terminal signals

At a flight instant, `snapshot.terminalActivity` contains the directional service volumes from the accepted integration step. Broad S-band fronts on the facing patch, Ka wavefronts at the reflector aperture, and near-infrared packet tracers on the optical aperture show the modeled direct paths. Incoming RF fronts move along the station sightline. Signal colors and pulse timing are illustrative. Nearby views truncate the path for inspection. Earth Orbit extends it to the station coordinates. A local symbol identifies traffic on the assumed optical relay, whose ephemeris is unspecified.

In Phase E Communications, **Find a transfer** opens the selected window’s terminal log. **Inspect** pauses the flight at an active instant and **Watch at 1×** plays from there. The PDR includes machine-readable terminal intervals. A receiver can accept commands during a pass that carries no customer payload.

In Phase D Communications, choose S-band, Ka or optical at the checkout stand. **Run test** records a modeled response to the selected attenuation or boresight offset. **Locate fixture in 3D** shows the physical test interface. The three fixtures disconnect before mating. The master timeline links its planned communications checkout to the benches, and the quantitative PDR stores executed checks in `verification/communications-ground-tests.json`.

## Temperature layer and camera controls

Pass `thermal` to `scene.setOverlays()` for the live temperature field. The six mapped nodes are chip junction, cold plate, coolant loop, radiator face, battery pack and exterior blanket. Color uses the spacecraft's current `thermalQualification` records and one of two fixed scales. Working spans 245–305 K and is selected initially. Full spans 180–380 K. The endpoints saturate while the exact model temperatures remain available in the readout. The legend counts assessed nodes beyond those endpoints. Neither scale changes with the clock. White diagonal hatching denotes a cold or hot excursion against the active band's full-precision limits. Gray represents hardware without a live temperature node. The stowed operational reference and the Earth-scale camera point visitors to the vehicle views. Ground-integration and launch visuals can show the modeled payload skin and stowed radiator under the prescribed thermal boundary.

`onHover(part, clientX, clientY, qualification)` and `onPick(part, qualification)` receive the current mesh's qualification record or null. `setLegendVisible(boolean)` controls the in-view key. Use `setThermalScale('working'|'full')` and `getThermalScale()` to restore or save its range. Choosing a range in the legend fires the optional `onThermalScale(id)` callback. Middle drag pans in screen coordinates, the wheel zooms, and two contacts pan and pinch. Shift + arrow keys pan. Home resets the current preset.

An orbital view uses a virtual trackball centered in the viewport. Starting inside the ring tumbles the vehicle. Starting outside it and tracing an arc rolls the view one degree for each degree of pointer travel around the center. Rotation holds the target, camera distance, and image scale fixed. Q and E also roll the orbital view. Ground facilities, pad views, ascent, and parked launch references keep the upright orbit control. [Autodesk Free Orbit](https://help.autodesk.com/cloudhelp/2026/ENU/AutoCAD-Core/files/GUID-06EA7461-FA6C-4282-9B2E-C24EB367F0F4.htm) · [Shoemake, Arcball Rotation Control](https://research.cs.wisc.edu/graphics/Courses/559-f2001/Examples/Gl3D/arcball-gems.pdf)

`getCameraState()` and `setCameraState(states)` retain the six original values [azimuth, elevation, zoom, panX, panY, panZ]. A rotated orbital view appends its camera-local turn quaternion [x, y, z, w]. The turn composes with the moving preset frame during flight. The ground control ignores it.

Run `node scene-interaction-checks.mjs` to exercise material mapping and restoration, band hatching, the common palette, neutral hardware and the four cameras' pan, zoom, reset and serialization paths.

## Commissioning mechanism and nominal clearance

The four solar cassettes sit on reinforced ±X face stations, each with a central bearing and captive end launch locks. Each strain-energy boom terminates at a moving tip mandrel. The membrane pays out as the wound radius falls. Two rigid radiator packs fold flat against the ±Y walls. Their distal release fittings retract and the packs swing about their fixed root pins and open at the outer knuckles. Flexible coolant lines bridge the hinges. After lock, each bank twists about its deployed span. The face normal and the width of the mesh follow the same root-cant and span-trim rotation as the heat and drag calculations. The ODC 20-minute sequence starts at mission time 900 s and brings each bank onto the loop only after latching.

For clearance evidence run `node deployment-checks.mjs 2400` and repeat with `--ai`. The measured quantities include physical component separation, pin/receiver coincidence, exposed and wound blanket length, and hose endpoint closure. The same mechanism poses set the mass stations, radiator normals, stowed envelope and displayed geometry. These are nominal kinematic checks. Structural qualification, release loads, dynamic disturbances and hose fatigue are outside their scope.

## Disposal drawings

`scene.setDisposalPlan(sim.disposal())` attaches the computed Phase F trajectory to the globe. The teal ground track, target tolerance and impact contour use Earth-fixed coordinates. Each elevated trajectory sample is rotated at its own epoch to reconstruct inertial geometry. Reentry orients the globe near the landing region. The raised-orbit view resolves the orbital plane from propagated positions and overlays the achieved final ring. A burn marker and thrust-direction cue track the mission clock. Camera pan and rotation remain available in both cases.

[disposal-views.js](dist/disposal-views.js) renders target/impact and impact-centered views in east/north kilometres with an azimuthal-equidistant projection. The latter shows the actual covariance footprint near the nominal impact even when the target miss is much larger than the ellipse. Graveyard disposal uses the propagated altitude history, actual burn windows and final perigee/apogee. The map models a surviving reference body under the stated assumptions.

## Domain inspections

Pass `setDomain(domain, phase)` before changing the camera or mission instant. Phase C, D and E use the selected discipline's hardware, callouts and flow state. [domain-scene.js](dist/domain-scene.js) contains the stable camera suggestions and live instruments. [hardware-focus.js](dist/hardware-focus.js) assigns x-ray context to unrelated parts, restores the original materials when the presentation changes, and animates the recorder's active data routes. Explicit temperature overlays take precedence. Temperature callouts otherwise belong to the Thermal discipline.

The Data & delivery cutaway retains the modular recorder, flight data switch and terminals. Recorder capacity sets the number of physical drive sleds, grouped above 12 visible sleds. Text production comes from current tokens per second × serialized bytes per token. Bulk arrivals are the remaining offered traffic. Pulses on the downlink branch require measured application goodput and end at the selected terminal. Pulse motion conveys direction; numeric readouts carry rate and inventory.

Phase D uses the launch preset for payload and vehicle disciplines. A close-up follows the stowed live payload through pad operations and ascent, then follows the separating spacecraft. A side-view inset projects the live core, side boosters, shroud and payload coordinates at that same instant. Orbit keeps the Earth-scale view. The launcher comparison uses [launch-fleet.js](dist/launch-fleet.js) for ten entries, including true parallel-booster counts and the direct-injection single-stage Long March 5B. Stage lengths and internal staging cues remain illustrative. The standalone launch integration view emphasizes adapter and fit; the Launch vehicle view emphasizes the core, booster architecture and enclosure.

Run `node domain-graphics-checks.mjs` for discipline framing and readouts, hardware isolation, recorder flow gating, and checks of all ten launcher configurations. `node scene-interaction-checks.mjs` verifies camera/thermal restoration, and `node mesh-checks.mjs` measures the scene buffers recorded in [surface-audit.js](dist/surface-audit.js).

## AI customer workloads

The AI Data Center Purpose domain follows staged customer inputs, active accelerator work, recorder occupancy and Earth-received product bytes on the mission clock. The agentic profile distinguishes peer messages exchanged by workers on the internal fabric from final research products delivered to Earth. Training profiles distinguish the requested artifact size from its received bytes. The purpose schematic includes each customer's qualification or quality gate. Earth-offer replay uses the installed hardware and route; it is an alternative demand experiment rather than additional flight traffic.

Run `node ai-purpose-ui-checks.mjs` for the six profiles across phases A–F. Use `node deployment-checks.mjs 2400 --ai` for a separate 2,401-pose sweep of every suggested build, including designs that exceed their selected launch envelope.


## Starship lateral cargo handling

Keep the cargo deck, nose, windward tiles and flap roots in the ship frame. The rigid ground transfer, retained leeward hatch, telescoping carriage, guided lift, free payload and hatch recovery share geometry in `dist/starship-cargo.js` and the carrier clock in `dist/launch-effects-state.js`. With the article outboard, the guided lift clears the installed nozzle tips above the retained adapter before lateral push-off. Four ground and orbital presentations use this path: integration bay, insertion camera, transverse section and master timeline. The attached payload mass and control authority switch at the end of guided extraction. Reverse playback reads the same mission instants. Check fixed and moving clearances with `node starship-cargo-checks.mjs` and interior visibility with `node mesh-checks.mjs`.


## SpaceX workbench startup

The interactive scene requests `makeCraft(h, {routingMode: 'construction'})` for
Starmind-family hardware. The shipped `starmind-ai1` reference can reuse a compact
native construction asset only when its complete physical configuration matches.
The installer verifies every electrical endpoint, normal, connector identity and
cable radius, and every stored fluid endpoint and mounting frame, before using it.
A different configuration uses the normal analysis path. `makeCraft(h)` itself
continues to run the full engineering analysis by default.

The asset contains the native bounded static planner's 496 electrical returns and
the final native pipe constructions. It retains full numeric precision, existing
failed results, the 128 mounted payload feeds, and all 26 supporting raceways.
Compilation uses zero detour/grid expansion for electrical candidates and does not
allocate connector withdrawal reservoirs. This is the preliminary static
construction basis, not a successful full-vehicle clearance or service review.
Runtime reuse leaves clearance and withdrawal unassessed, retains known failures,
and prevents an unassessed connector withdrawal from stretching installed cables.
The inspection snapshot still uses the actual rendered material when requested.

Displaying the construction does not replace the independently accounted harness
mass or MEL. In particular, opening a scene cannot silently change the hardware
revision and discard the already prepared mission window.

Regenerate the application geometry after changing its native source:

```sh
node scripts/compile-starmind-construction.mjs
node scripts/compile-starmind-construction.mjs --check-source
node starmind-scene-startup-checks.mjs
```

The compressed ES module is application input. Do not commit compilation logs or
working evidence. Its source manifest covers the complete loaded native dependency
closure; the structural startup suite rejects a stale manifest. That suite also
checks real cable/pipe buffers, physical inventory, mass/MEL preservation, and the
absence of full-scene planning or service searches during cached construction.
The local fluid feedthrough allocator retains its exact clearance predicate and
candidate order, using conservative nearby-solid bounds before triangulation.
`fluid-feedthrough-broad-phase-checks.mjs` compares it with the exhaustive oracle.

A canvas alone is not a successful startup. The scene records `renderedFrames`
and `renderedReferenceCenter` only after its render returns. The browser check
requires those markers, a closed startup cover, an available WebGL context, and a
successful camera change followed by another rendered frame:

```sh
python3 scripts/check-workbench-startup.py --browsers chromium firefox
```

That command requires installed Playwright browsers and checks fresh default,
SpaceX and Star Catcher studies at desktop and mobile sizes. It is separate from the inherited
metadata smoke test; the latter does not establish that the spacecraft has rendered.


## Star Catcher workbench startup

The `heatlift-study` family uses the same bounded construction path for the shipped
`star-catcher-self-powered` reference. Its separate native asset contains all 537 electrical
cuts and the corresponding planned fixed pipes. Complete physical configuration and each
actual endpoint, normal, diameter, identity and mounting frame must match before reuse.
Changed geometry rejects reuse. The live view shows that routing for the changed design is
pending and offers Restore reference; it does not silently start native route searches on the
browser's main thread. Explicit native analysis remains available to the construction compiler
and developer checks, with its own findings.

```sh
node scripts/compile-starcatcher-construction.mjs
node scripts/compile-starcatcher-construction.mjs --check-source
node starcatcher-scene-startup-checks.mjs
```

Compilation writes both the losslessly packed geometry module and the small data-only
`starcatcher-harness-takeoff.js` inventory. Sizing imports only the latter; it does not import
the scene or decompress its geometry. The paired source/design guards prevent the physical
construction and mass takeoff from drifting apart. The startup check rejects full electrical,
fluid or withdrawal planning and compares the actual rendered cable/pipe buffers with the
retained construction. Browser acceptance additionally requires an observed rendered frame
and a responsive camera or other scene interaction.

The mass inventory retains its exact native design hash and a second complete fingerprint
with geometric numbers compared at nine decimal places (one nanometre for metre coordinates).
This accommodates last-bit differences between browser and Node math libraries. Only the
comparison fingerprint is rounded; stored geometry and measured cuts retain full precision.
Inputs, inventory, interface IDs, conductor sizes, cable diameters and bend radii remain exact;
a changed design cannot borrow the default cuts. The source check verifies both identities
and every record against the compiled geometry.

Diagnostic `--context-only --context /absolute/path/outside-the-repository.json.gz` stops after
constructing native physical interfaces and initial fluid planning. The optional
`--unplanned-fluid-context` is explicitly diagnostic and cannot write a runtime asset.
Working contexts, checkpoints, logs and other evidence stay outside the repository.

The supplementary support table is also losslessly packed. Its exported
`starcatcherSupplementalInstallationData` object retains the complete physical configuration,
unrounded corridor coordinates, real attachment points and guarded payload corrections.
Importing `dist/starcatcher-supplemental-installation-data.js` returns that full JSON object for
inspection. Sizing compares its physical guard and constructs the declared material; it does
not rerun the support-placement search. The same material builder supplies rendering, mass,
CG, inertia and the MEL.

## Browser asset revalidation

The Pages response policy in `dist/_headers` requires revalidation of the entry
page, HTML documents, JavaScript modules (including workers), stylesheets and the
downloadable asset index. These stable URLs can change between deployments, so a
fresh deployment must not be hidden behind a still-fresh browser copy of old code.
Image, texture and other media caching keeps its existing policy.

The assembly copies `_headers` into the deployment directory. Pages consumes it
as configuration rather than serving it as an asset, so it is deliberately absent
from `assets.json.zip`; the site's static export must not try to download it.
Verify the actual public `Cache-Control` responses after changing this policy,
because a zone rule can affect browser caching. A previously cached response keeps
its prior freshness lifetime until it is revalidated; the new policy cannot
replace an already running module graph. An existing stale tab may need a hard
reload to retrieve the policy and current code. If worker code remains stale,
empty the browser cache and reload.
