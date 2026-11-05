# Orbital Data Center

Orbital Data Center is a static Three.js engineering workbench. The spacecraft, subsystem diagrams, event playback and exported results use one client-side numerical model. The distribution includes the renderer, its assets and the mission-integration worker.

To run the checkout locally, start a static server from the project directory and open http://localhost:8000.

```sh
python3 -m http.server 8000 --directory dist
```

To deploy, upload the contents of `dist/` to an HTTP(S) static host, preserving the relative paths. Scenario links restore a configuration from the URL fragment on that host.

## Fly the launch vehicle

In Phase A, choose Launch Vehicle and a compatible facility. The change preview shows the launch-site assignment and the insertion angles for departure from that site at the design epoch. Phase D opens the full stack, pad works and vehicle detail cameras. The first-minute controls use real mission seconds. In Earth Orbit the site marker and the ascent trace share the same Earth rotation as the spacecraft.

Open `?phase=D&domain=launcher&chapter=pad&launcher=starship&met=-8` to watch Super Heavy and Starship at Starbase Pad 2. Substitute `falconHeavy` for the LC-39A mission or `ariane64` for ELA-4 in French Guiana. These examples start with a site-matched insertion orbit. An imported study retains its specified orbit and reports its separation from the site-local ascent until the visitor adopts the site-derived angles.

## Follow flight pointing

Open `?phase=E&domain=attitude&chapter=contact&met=9390&play=0` for the live-text starter just before its sunlit pass over Canberra. Play from there or select a contact in the orbit-response plot. The Spacecraft camera follows the local orbital frame. Compute Core follows the bus, and Earth Orbit shows the station, ground track and spacecraft. Switching cameras preserves the instant.

The same realized vehicle axes, four wing-drive angles (a common command), two fluid-carrying radiator roots and terminal boresight drive the geometry, projected sunlight, Earth exposure, drag, joint power, link acquisition and thermal balance. The operational radiators rotate at the root after their outer hinges lock. Phase B explains the mode priorities and actuator limits. Phase C compares editable pointing laws at matched instants. In Phase E, playback and event selection operate the clock.

## Navigate the mission

The phase tabs select the kind of work. The domain navigation selects the subsystem or question. The same seventeen domains are available in all six phases.

| Phase | Work in this phase |
| --- | --- |
| A · Mission inputs | Choose a customer mission and its starting spacecraft, size from an installed configuration, workload, launch allowance or lifetime requirement, and select the retirement route. |
| B · Subsystem design | The Design section exposes installed assumptions and component schematics. The Analysis section below always shows the clock, charts, operating quantities and ledger. Follow buses, coolant loops, payload queues, actuator momentum, mass allocations or natural and induced environmental loads. |
| C · Integrated vehicle | Inspect assembled hardware in 3D. Pin the current design and change one input to compare responses at matching mission times. Full chronological comparisons add whole-mission quantities and histories. |
| D · Launch and insertion | Inspect the stowed stack, fairing fit and assembly clearances. Follow ascent and release. The spacecraft trims after its appendages lock. |
| E · Operations | Use the shared clock to inspect commissioning, compute bursts, ground contacts, reboost and momentum unloading. |
| F · Decommissioning | Review the selected retirement maneuver, actual consumption, achieved trajectory and endpoint. Targeted reentry follows a modeled surviving reference body. Graveyard transfer reports the raised orbit. |

The domains are Mission CONOPS, AI Data Center Purpose, Environment, Orbit & Eclipse, Compute & Storage, Data & Delivery, Communications, Electrical Power, Thermal, Attitude Determination & Control, Propulsion, Mass Budget, Launch & Insertion, Launch Vehicle, Mechanical Design, and Command & Data Handling.

In Phase E, open Communications and its engineering instruments. Select a ground pass on the timeline. Read the terminal acquisition, dish direction, CMG draw, pack charge and recorder queue at the same instant. Move the 24-hour window later in the mission to inspect the effects of aging hardware.

The thermal view maps six modeled nodes to fixed Kelvin color scales. Select a node to inspect its operating or survival range, temperature and signed margin. The selected-window and chronological-mission reviews also report excursions.

## Spacecraft baseline

The persistent **Spacecraft architecture** and **Master equipment list** views are available from every phase. The ODC-01 Rev F bus keeps the same enclosure, four solar wings, two radiator banks, two internal liquid tanks, separate helium bottle and two engines across customer missions. A sized variant can exceed an envelope, including an engine's published range or a launch vehicle’s available fairing.

The equipment list gives separate power, dimensions and mass bases and sources. Mechanical Design filters equipment stations by WBS, part number or subsystem and calculates the selected group’s center of mass. Command & Data Handling records spacecraft commands and housekeeping alongside the AI payload. The equipment list separates supplier reference masses from the vehicle allocations and rolls them up through dry, wet and launch mass. CSV and JSON retain the work breakdown structure, source information and sizing basis. The quantitative PDR includes the installed equipment register, vessel volumes, engine stations, mass properties at depletion states and geometric clearance screens.

## Save, share and export

Phase A starts with six customer missions. Each mission includes a workload, hardware configuration and starting operating assumptions. Review a mission to see its accelerator count, storage, power and physical constraints before applying it. Selecting the same starter twice reproduces the same spacecraft. The mission orbit, duration, environment and disposal settings carry over.

The compact current-design bar provides **Save as…** and **Saved designs**. Named designs preserve inputs, sizing mode and thermal requirements. Open, import, download and unload them in **Saved designs**. Existing scenario links and earlier preset JSON files reopen their stored configuration.

In Phase A, hover or focus an input for selection advice. Its **?** button opens the basis, worked example where available, and links to the relevant source sections. **Model & sources** includes a searchable field guide. GEVS and the Goddard GOLD Rules anchor environmental verification and margin guidance. Worked study values, equipment references and mission requirements are identified separately.

**AI Data Center Purpose** assigns one Earth customer mission to a design: live text, live voice, batch inference, agentic research or engineering, fine-tuning, or training. Select a card in Phase A CONOPS or open the domain from the drawer. Preview a mission and review its starting spacecraft. To study a different workload on installed equipment, use the secondary current-spacecraft action or the fixed-hardware comparison. The design-change dialogue shows which inputs and physical quantities change. Flight phases inspect the committed goal. Saved files that predate the purpose field open under live text.

The service analysis records customer outcomes against the modeled direct contacts or an explicitly assumed relay allocation. The selected-day study and the optional multi-day order study have independent horizons. Training requires calibration evidence to claim target quality. The model transfer budget gives ideal active transfer times after the selected artifact is released. PDR exports include the installed compute estimate and selected-window customer metrics.

**Launch Vehicle** compares carrier configurations and their reference payload, fairing and recovery assumptions. **Launch & Insertion** follows the selected spacecraft on that carrier through integration and release. In design phases a change review shows replaced inputs, retained interfaces to check, updated coupled quantities and any exceeded sizing limits. Cancel or apply the proposal before switching hardware. A carrier change keeps the active sizing mode and the mission-specific allowance.

**Flight Software** follows the same mode executive and encoder feedback that drive the vehicle. Inspect priority, body and engine permissions, terminal lock, or the two-sided radiator exposure. Pointing guides show the achieved geometry. The acute angle to a radiator face normal is 90° at grazing incidence.

**Share** restores the scenario, phase, domain, camera, clock and selected event. **Export & import** provides scenario JSON, telemetry CSV, a static-site bundle and the quantitative PDR ZIP. Scenario JSON and PDR packages can be imported from a design phase.

The quick mission preview uses representative days for later mission ages. **Run mission analysis** integrates each mission day in sequence in a local Web Worker. Preparing a PDR uses the chronological run and includes the printable quantitative review, design budgets, evaluated clearances, thermal requirements, time histories and verification data. After preparation, the download link remains available in the current session.

## Commissioning playback

Open Phase E and select **Deploy spacecraft**, or use `?phase=E&domain=conops&chapter=commissioning`. The 20-minute study sequence begins at mission elapsed time 900 s. You can scrub it, pause it, select a stage or inspect the moving tip drum and radiator knuckle. At sequence end the clock pauses for verification. Continue to operations to follow the mission.

Four roll-out solar blankets stay attached at their individual roots. Two forward radiator banks swing at their permanent root hinges, open their outer panels, latch and then admit coolant. The Sources and Architecture pages link the flight and supplier publications used for these mechanisms.

## Local verification

From the checkout, run the production-model regression suites with Node.js.

```sh
node design-test.mjs
node engine-checks.mjs
node audit-test.mjs
node disposal-engine-test.mjs
node geometry-checks.mjs
node deployment-checks.mjs
node deployment-checks.mjs 2400 --ai
node mesh-checks.mjs
node schematic-checks.mjs
node thermal-test.mjs
node scene-interaction-checks.mjs
node domain-graphics-checks.mjs
node domain-checks.mjs
node matrix-checks.mjs
node lifecycle-checks.mjs
node coupling-ui-checks.mjs
node launch-fleet-checks.mjs
node input-guidance-test.mjs
node ai-purpose-ui-checks.mjs
node ai-core-checks.mjs
node ai-service-test.mjs
```

**Model & sources** documents equations, reference conditions, technology assumptions and model boundaries. **Numerical checks** provides reproducible comparisons in the workbench. Data volumes use decimal GB and TB, mission elapsed time is measured from the selected UTC epoch, and component temperatures use kelvin.
