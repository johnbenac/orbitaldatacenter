# Orbital Data Center

Orbital Data Center is a static Three.js engineering workbench. The spacecraft, subsystem diagrams, event playback and exported results use one client-side numerical model. The distribution includes the renderer, its assets and the mission-integration worker.

To run the checkout locally, start a static server from the project directory and open http://localhost:8000.

```sh
python3 -m http.server 8000 --directory dist
```

To deploy, upload the contents of `dist/` to an HTTP(S) static host, preserving the relative paths. Scenario links restore a configuration from the URL fragment on that host.

## Navigate the mission

The phase tabs select the kind of work. The domain navigation selects the subsystem or question. The same twelve domains are available in all six phases.

| Phase | Work in this phase |
| --- | --- |
| A · Mission inputs | Choose a starting design, size from an installed configuration, workload, launch allowance or lifetime requirement, and select the retirement route. |
| B · Subsystem design | Select components on a schematic to inspect installed hardware and operating values. Follow buses, coolant loops, payload queues, actuator momentum, mass allocations or natural and induced environmental loads. |
| C · Integrated vehicle | Inspect assembled hardware in 3D. Pin the current design and change one input to compare responses at matching mission times. Full chronological comparisons add whole-mission quantities and histories. |
| D · Launch and insertion | Inspect the stowed stack, fairing fit and assembly clearances. Follow ascent, separation and trim in the launch chapters. |
| E · Operations | Use the shared clock to inspect commissioning, compute bursts, ground contacts, reboost and momentum unloading. |
| F · Decommissioning | Review the selected retirement maneuver, actual consumption, achieved trajectory and endpoint. Targeted reentry follows a modeled surviving reference body. Graveyard transfer reports the raised orbit. |

The domains are Mission CONOPS, Environment, Orbit & Eclipse, Compute & Storage, Data & Delivery, Communications, Battery & Power, Thermal, Attitude Control, Propellant, Mass Budget, and Launch & Insertion.

In Phase E, open Communications and its engineering instruments. Select a ground pass on the timeline. Read the terminal acquisition, dish direction, CMG draw, pack charge and recorder queue at the same instant. Move the 24-hour window later in the mission to inspect the effects of aging hardware.

The thermal view maps six modeled nodes to fixed Kelvin color scales. Select a node to inspect its operating or survival range, temperature and signed margin. The selected-window and chronological-mission reviews also report excursions.

## Save, share and export

Phase A includes five built-in design points, a new-mission action and a shelf for custom presets. **Save as preset** preserves design inputs, solver and thermal requirement settings. **Load preset** restores a preset JSON to the browser shelf. Downloaded presets are portable between browsers.

**Share** restores the scenario, phase, domain, camera, clock and selected event. **Export & import** provides scenario JSON, telemetry CSV, a static-site bundle and the quantitative PDR ZIP. Scenario JSON and PDR packages can be imported from a design phase.

The quick mission preview uses representative days for later mission ages. **Run mission analysis** integrates each mission day in sequence in a local Web Worker. Preparing a PDR uses the chronological run and includes the printable quantitative review, design budgets, evaluated clearances, thermal requirements, time histories and verification data. After preparation, the download link remains available in the current session.

## Local verification

From the checkout, run the production-model regression suites with Node.js.

```sh
node design-test.mjs
node engine-checks.mjs
node audit-test.mjs
node disposal-engine-test.mjs
node geometry-checks.mjs
node deployment-checks.mjs
node mesh-checks.mjs
node schematic-checks.mjs
node thermal-test.mjs
node scene-interaction-checks.mjs
node domain-checks.mjs
node matrix-checks.mjs
node lifecycle-checks.mjs
```

**Model & sources** documents equations, reference conditions, technology assumptions and model boundaries. **Numerical checks** provides reproducible comparisons in the workbench. Data volumes use decimal GB and TB, mission elapsed time is measured from the selected UTC epoch, and component temperatures use kelvin.
