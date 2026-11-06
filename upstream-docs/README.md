# Orbital Data Center

Orbital Data Center is a static Three.js engineering workbench. The spacecraft, subsystem diagrams, event playback and exported results use one client-side numerical model. The distribution includes the renderer, its assets and the mission-integration worker.

The current engineering basis is **workbench/model 21.0**, **Mission Baseline ODC-MB-001 Rev B**, and **spacecraft architecture ODC-01 Rev I**. The review target is preliminary design near the end of Phase B. Configurable missions evaluate a defined spacecraft; the workbench does not require every selectable mission to close.

To run the checkout locally, start a static server from the project directory and open http://localhost:8000.

```sh
python3 -m http.server 8000 --directory dist
```

To deploy, upload the contents of `dist/` to an HTTP(S) static host, preserving the relative paths. Scenario links restore a configuration from the URL fragment on that host.

## Fly the launch vehicle

In Phase A, choose Launch Vehicle and a compatible facility. The change preview shows the launch-site assignment and the insertion angles for departure from that site at the design epoch. Phase D opens the full stack, pad works and vehicle detail cameras. The first-minute controls use real mission seconds. In Earth Orbit the site marker and the ascent trace share the same Earth rotation as the spacecraft.

Open `?phase=D&domain=launcher&chapter=pad&launcher=starship&met=-8` to watch Super Heavy and Starship at Starbase Pad 2. Substitute `falconHeavy` for the LC-39A mission or `ariane64` for ELA-4 in French Guiana. These examples start with a site-matched insertion orbit. An imported study retains its specified orbit and reports its separation from the site-local ascent until the visitor adopts the site-derived angles.

## Follow flight pointing

**Mission insignia.** The sidebar, loading artwork and vehicle livery use `dist/mission-patch.svg`. The optical reduction in `dist/mark.svg` supports small favicons. Run `python tools/build-identity.py` with Pillow and Inkscape to rebuild the static PNG, ICO, splash and ZIP assets. Visitors can download the artwork from **Mission patch** in the footer.

**Flight vectors** starts on in orbital views. Cyan shows inertial velocity and gold points toward the Sun, including in eclipse. Lavender points to the selected station when it is above its configured elevation mask. The Earth Orbit arrow ends at the station. The closer cameras use shortened arrows for inspection. The switch is saved in shared designs, and `vectors=off` opens a clean view. The sky uses a bundled equatorial Milky Way survey and the same Sun direction as the lighting model.

Open `?phase=E&domain=attitude&chapter=contact&met=9390&play=0` for the live-text starter just before its sunlit pass over Canberra. Play from there or select a contact in the orbit-response plot. The Spacecraft camera follows the local orbital frame. Compute Core follows the bus, and Earth Orbit shows the station, ground track and spacecraft. Switching cameras preserves the instant.

The same realized vehicle axes, four wing-drive angles (a common command), two fluid-carrying radiator roots and terminal boresight drive the geometry, projected sunlight, Earth exposure, drag, joint power, link acquisition and thermal balance. The operational radiators rotate at the root after their outer hinges lock. Phase B explains the mode priorities and actuator limits. Phase C compares editable pointing laws at matched instants. In Phase E, playback and event selection operate the clock.

## Navigate the mission

The phase tabs select the kind of work. The domain navigation selects the subsystem or question. The same seventeen domains are available in all six phases.

| Phase | Work in this phase |
| --- | --- |
| A · Mission inputs | Choose a customer mission and its starting spacecraft, size from an installed configuration, workload, launch allowance or lifetime requirement, and select the retirement route. |
| B · Subsystem design | The Preliminary design section shows the installed configuration, engineering graphic, numerical checks and evidence needed at PDR. The Analysis section below shows the clock, charts, operating quantities and ledger. Follow buses, coolant loops, payload queues, actuator momentum, mass allocations or natural and induced environmental loads. |
| C · Integrated vehicle | Inspect assembled hardware in 3D. Pin the current design and change one input to compare responses at matching mission times. Full chronological comparisons add whole-mission quantities and histories. |
| D · Launch and insertion | Inspect the stowed stack, fairing fit and assembly clearances. Follow ascent and release. The spacecraft trims after its appendages lock. |
| E · Operations | Use the shared clock to inspect commissioning, compute bursts, ground contacts, reboost and momentum unloading. |
| F · Decommissioning | Review the selected retirement maneuver, actual consumption, achieved trajectory and endpoint. Targeted reentry follows a modeled surviving reference body. Graveyard transfer reports the raised orbit. |

The domains are Mission CONOPS, AI Data Center Purpose, Environment, Flight Dynamics, Compute & Storage, Data & Delivery, Communications, Electrical Power, Thermal, Attitude Determination & Control, Propulsion, Mass Budget, Launch & Insertion, Launch Vehicle, Mechanical Design, Command & Data Handling, and Flight Software.

In Phase E, open Communications and its engineering instruments. Select a ground pass on the timeline. Read the terminal acquisition, dish direction, CMG draw, pack charge and recorder queue at the same instant. Move the 24-hour window later in the mission to inspect the effects of aging hardware.

The thermal view maps six modeled nodes to fixed Kelvin color scales. Select a node to inspect its operating or survival range, temperature and signed margin. The selected-window and chronological-mission reviews also report excursions.

## PDR design workspaces

All seventeen domains contain an instantiated preliminary design: a parameterized engineering graphic, installed design quantities, numerical capability checks, applicable GOLD references, explicit evidence gaps and PDR / later verification products. Domain 04 is **Flight Dynamics**. The Mission Baseline’s **Domain assessments** tab opens the review workspace for each domain; **Architecture & interfaces** connects the reference mission, topology decision and shared subsystem interfaces.

The installed vehicle and mission case have separate reproducible identifiers. Changing the orbit, environment, workload or service target evaluates the existing hardware. Selecting a sizing action proposes a revised configuration; once accepted, the installed quantities are retained. Solar sizing includes the adopted >15% EOL power screen, and dry mass carries the separate >10% basic-mass PDR headroom. Unknown item growth, qualification, uncertainty or provider evidence remains open even when numerical screens meet.

Each domain reports three separate results: **numerical capability**, **study/interface applicability**, and **evidence and acceptance**. An installation can have a numerical shortfall while remaining inside a model's supported range. An orbit beyond the nominal drag source range marks the affected flight-dynamics and propulsion analyses; it does not invalidate the unchanged compute hardware. Inside an allocated study envelope does not establish qualification. Nominal operating life is assessed separately from PDR reserve compliance, so an unmet PDR reserve does not by itself imply zero operating life.

The quantitative PDR retains the seventeen original domain graphics and adds eight supplemental domain graphics. The architecture program supplies seven standalone SVGs for seasonal illumination, matched packaging, electrical distribution, thermal transport, compute fabric, the Earth-service route, and structural/control bounds. The offline reports preserve the same status axes, assumptions and interface records as the workbench.

The package includes `design/configuration-contract.json`, `design/energy-system.json`, `design/service-architecture.json`, `design/architecture-trade.json`, and `design/applicability.json`. `mission-baseline/architecture-program.html` and its JSON record connect the decisions, evidence products and public comparisons. Standalone program drawings are under `interfaces/`; domain records, original graphics and supplemental SVGs are under `domains/`. The bounded `pdr-*-checks.mjs` suites exercise calculations, hardware/mission invariants, actual input and sizing events, and the export/import round trip.

## Mission baseline

**Design rules & margins** (`?reference=mission`) establishes ODC-MB-001 Rev B: the tailored systems engineering management plan for PDR at the end of Phase B, fixed margin definitions, a complete GSFC-STD-1000I rule disposition register, equipment maturity evidence and PDR closure products. It separates project adoption from completed verification. All 77 active GOLD rules and 59 reserved slots are accounted for. Read-only policy and the current design assessment can be downloaded as a complete HTML plan, JSON or rule CSV; the same records are included in the quantitative PDR package.

The persistent **Spacecraft architecture** and **Master equipment list** views are available from every phase. ODC-01 Rev I retains a protected central compute core, four solar wings, two articulated radiator banks, two internal liquid tanks, a separate helium bottle and two engines. Its controlled reference is an eclipse-capable 550 km circular, 53° mission with a five-year allocation. The reference carries 12 trays with 24 kW of accelerator allocation plus explicit host and fabric demand. The mission does not claim continuous sunlight.

The matched architecture trade compares that integrated installation with a compact core/external backbone and attached compute/radiator modules, holding useful load, orbit, life and major resources constant. Candidate estimates carry additional hinges, fluid or electrical interfaces, local shielding and compute obscuration as applicable. Only the selected topology uses the integrated station layout and tapered-fairing check. The alternatives have defined PDR selection gates and do not masquerade as qualified flight vehicles. A sized variant can exceed a component study limit, an engine's published range or a launch vehicle's available envelope.

The equipment list gives separate power, dimensions and mass bases and sources. Mechanical Design filters equipment stations by WBS, part number or subsystem and calculates the selected group’s center of mass. Command & Data Handling records spacecraft commands and housekeeping alongside the AI payload. The equipment list separates supplier reference masses from the vehicle allocations and rolls them up through dry, wet and launch mass. CSV and JSON retain the work breakdown structure, source information and sizing basis. The quantitative PDR includes the installed equipment register, vessel volumes, engine stations, mass properties at depletion states and geometric clearance screens.

## Explicit subsystem interfaces

**Electrical power.** The selected 120 V reference family and optional 400 V development family have finite MPPT, payload, service, battery-converter and distribution ratings. Four source wings feed a regulated main bus, isolated 48 V payload branches and a 28 V flight/service rail. Routed wire lengths, conductor sizes, current and voltage-drop limits determine harness mass and loss. The `solarDelivery` input covers cell packing and array mismatch; MPPT conversion and harness loss are calculated separately. Battery C-rates remain bounded by installed conversion capacity. Source-cell voltage, protection, arcing/EMC, rotary interfaces and exact supplier qualification remain evidence tasks. The 400 V case is a project development allocation, not inherited 120 V flight qualification. Source boundaries are recorded in [energy-system.js](dist/energy-system.js).

**Thermal transport.** The installed ammonia loop has a duty/cold-standby pump station, two isolatable parallel radiator branches, finite tube bores and an expansion accumulator. Pressure loss, flow velocity, pump/system intersection and fluid heat capacity constrain heat transport. The two banks share the pump station and headers; they are not independent redundant loops. Battery, equipment/fluid loop and radiator are three separate finite thermal stores. An implicit radiation step and conservative exchange terms advance their temperatures. Finite heaters add electrical load and heat at the receiving store. Bypass mixing changes loop-to-radiator conductance; it leaves physical emitting area and environmental absorption intact. Junction-to-cold-plate resistance is a local per-tray quantity. Coolant rise and the cold-plate-to-fluid path are evaluated separately. Fluid-property coverage, pressure/phase limits and qualification remain visible. See [thermal-network.js](dist/thermal-network.js) and [ENGINE.md](ENGINE.md).

**Compute and Earth service.** Repeated trays have an explicit host, memory, cold-plate, electrical and data boundary. Additional host modules are counted only when the tray's included resources do not cover the allocation. The onboard fabric selects finite 25/50/100/200/400 Gbit/s physical ports, uses an 80% useful-rate allocation, and checks topology, bisection, cable routing and local memory placement. The selected optical modem allocates at most 1,600 Mbit/s per direction from a 2 Gbit/s line-rate interface. A relay cycle loses the greater of the configured handover and a 35 s acquisition requirement. One optical terminal receives no simultaneous make-before-break credit. Provider compatibility, receiver ephemeris and optical ground-weather availability remain unassessed. These definitions are in [service-architecture.js](dist/service-architecture.js).

**Checkpoint custody.** Training reserves two restart slots. A pending write consumes the installed storage interface over time while the last complete checkpoint remains intact. The model advances the committed recovery point only when the entire pending package has been written. Requests during an active save are deferred; a partial file is not counted as a completed save. Payload hashes, autonomous recovery and power-loss behavior remain verification requirements. Fast representative-day projections identify their custody estimates; chronological integration retains the discrete commit history. See [data-custody.js](dist/data-custody.js).

**Mechanical, navigation and assurance.** Preliminary beam bounds and a conservative longeron-only load path expose structural/control and launch-load sensitivities. Mechanism torque calculations use documented analysis-stage factors against explicit project output requirements. GNSS and independent S-band ground tracking have separate position, velocity and insertion-correction requirements; the nominal propagator still assumes exact state. Propulsion reports a deterministic uncertainty sensitivity alongside the unresolved statistical 3σ gate. Shield areal mass and Al-equivalent thickness receive no invented dose or SEE credit. Component application differences, five-year life allocations, command independence, isolation and recovery provisions are recorded with their remaining evidence in [architecture-trades.js](dist/architecture-trades.js).

## Save, share and export

Phase A starts with six customer missions. Each mission includes a workload, hardware configuration and starting operating assumptions. Review a mission to see its accelerator count, storage, power and physical constraints before applying it. Selecting the same starter twice reproduces the same spacecraft. The mission orbit, duration, environment and disposal settings carry over.

The compact current-design bar provides **Save as…** and **Saved designs**. Named designs preserve inputs, sizing mode and thermal requirements. Open, import, download and unload them in **Saved designs**. Existing scenario links and earlier preset JSON files reopen their stored configuration.

In Phase A, hover or focus an input for selection advice. Its **?** button opens the basis, worked example where available, and links to the relevant source sections. **Model & sources** includes a searchable field guide. GEVS and the Goddard GOLD Rules anchor environmental verification and margin guidance. Worked study values, equipment references and mission requirements are identified separately.

**AI Data Center Purpose** assigns one Earth customer mission to a design: live text, live voice, batch inference, agentic research or engineering, fine-tuning, or training. Select a card in Phase A CONOPS or open the domain from the drawer. Preview a mission and review its starting spacecraft. To study a different workload on installed equipment, use the secondary current-spacecraft action or the fixed-hardware comparison. The design-change dialogue shows which inputs and physical quantities change. Flight phases inspect the committed goal. Saved files that predate the purpose field open under live text.

The service analysis records customer outcomes against the modeled direct contacts or an explicitly assumed relay allocation. The selected-day study and the optional multi-day order study have independent horizons. Training requires calibration evidence to claim target quality. The model transfer budget gives ideal active transfer times after the selected artifact is released. PDR exports include the installed compute estimate and selected-window customer metrics.

**Launch Vehicle** compares carrier configurations and their reference payload, fairing and recovery assumptions. **Launch & Insertion** follows the selected spacecraft on that carrier through integration and release. In design phases a change review shows replaced inputs, retained interfaces to check, updated coupled quantities and any exceeded sizing limits. Cancel or apply the proposal before switching hardware. A carrier change keeps the active sizing mode and the mission-specific allowance.

**Master timeline** is under Mission Baseline. Open `?reference=timeline` for the liftoff callout, or `?reference=timeline&segment=countdown&events=all` for the full final count. Four approximate ground-processing dates and two launch-control planning calls precede the animated hour before release. The early flight record ends at the close of the first complete ground-station window beginning after deployment, or after 24 hours of operations if none completes. An earlier mission boundary can shorten the window. The CSV and JSON carry the complete unfiltered sequence and are included in the quantitative PDR under `operations/master-timeline`.

**Mechanical Design** shows how each stowed solar roll and each rigid folded radiator transfers inertial load into a long face of the primary box. The cutaway, drawings, component stations, launch restraints, tray lattice and tapered fairing screen use the shared installation coordinates. Phase D offers end-on and side elevations of the stowed spacecraft. The live-text factory build pairs the revised spine with New Glenn for clearance in the forward taper. Explicit launcher selections in imported designs retain their original value.

**Flight Software** follows the same mode executive and encoder feedback that drive the vehicle. Inspect priority, body and engine permissions, terminal lock, or the two-sided radiator exposure. Pointing guides show the achieved geometry. The acute angle to a radiator face normal is 90° at grazing incidence.

**Share** restores the scenario, phase, domain, camera, clock and selected event. **Export & import** provides scenario JSON, telemetry CSV, a static-site bundle and the quantitative PDR ZIP. Scenario JSON and PDR packages can be imported from a design phase.

The quick mission preview uses representative days for later mission ages. **Run mission analysis** integrates each mission day in sequence in a local Web Worker. Preparing a PDR uses the chronological run and includes the printable quantitative review, design budgets, evaluated clearances, thermal requirements, time histories and verification data. After preparation, the download link remains available in the current session.

## Calculation feedback

Costly actions acknowledge the input immediately and show the current calculation stage and elapsed time. Design changes run the sizing assessment and matched mission preview in a dedicated local worker before opening **Review design change**. **Cancel calculation** stops that worker and retains the installed design. Accepting a reviewed proposal has its own feedback while the spacecraft, diagrams and budgets refresh. Navigation, mission-window changes, comparisons, imports and site packaging use the same activity display; archive progress reports the actual file count and compression progress.

The activity card uses live status announcements, keyboard-accessible cancellation and a reduced-motion presentation. Related controls remain unavailable only while their action runs, preventing duplicate proposals. The numerical models and review criteria are unchanged. Browsers without module workers show the same feedback and run the comparison locally; cancellation cannot interrupt a synchronous calculation in that fallback.

New expensive actions should use `runWork` in `dist/app.js`. Reuse its active job for nested work, report actual stages, yield before synchronous calculation, and keep cancellation available only before committing a design. Keep worker calculation and main-thread rendering separate; never add an artificial wait or simulated percentage.

## Commissioning playback

Open Phase E and select **Deploy spacecraft**, or use `?phase=E&domain=conops&chapter=commissioning`. The 20-minute study sequence begins at mission elapsed time 900 s. You can scrub it, pause it, select a stage or inspect the moving tip drum and radiator knuckle. At sequence end the clock pauses for verification. Continue to operations to follow the mission.

Four roll-out solar blankets stay attached at their individual roots. Two side-mounted radiator banks swing at their permanent root hinges, open their outer panels, latch and then admit coolant. The Sources and Architecture pages link the flight and supplier publications used for these mechanisms.

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
node mission-baseline-checks.mjs
node pdr-flight-checks.mjs
node pdr-resources-checks.mjs
node pdr-service-checks.mjs
node pdr-integration-checks.mjs
node pdr-ui-checks.mjs
node pdr-export-checks.mjs
node design-review-task-checks.mjs
node work-feedback-checks.mjs
node architecture-design-checks.mjs
node pdr-applicability-checks.mjs
node energy-design-checks.mjs
node service-architecture-checks.mjs
node checkpoint-runtime-checks.mjs
node ai-purpose-ui-checks.mjs
node ai-core-checks.mjs
node ai-service-test.mjs
```

**Model & sources** documents equations, reference conditions, technology assumptions and model boundaries. **Numerical checks** provides reproducible comparisons in the workbench. Data volumes use decimal GB and TB, mission elapsed time is measured from the selected UTC epoch, and component temperatures use kelvin.
