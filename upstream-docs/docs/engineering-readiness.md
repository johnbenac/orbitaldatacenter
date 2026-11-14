# Engineering defaults and release readiness

The readiness gate answers a specific product question: **Can every numerical activity offered in the shipped configuration run without asking the visitor to supply missing engineering work?** It does not decide whether the design has adequate margin or whether flight hardware has been qualified.

## Release commands

Run from the repository root with Node 22 or later. These checks use the production JavaScript modules and need no installed npm dependencies.

```sh
npm run check:publish
```

This runs thermal physics and convergence checks, controller/UI integration checks, electrical allocation and geometry checks, payload data conservation, readiness regressions, and full default predictions for the thermal scenarios offered by the parts navigator. It also validates every numerical thermal plan, including plans reached through the global Thermal Control workspace, and the required inputs to other numerical domains. Electrical checks execute the installed register for each configuration, keeping predicted design shortfalls separate from missing inputs and unverified hardware.

For a complete machine-readable report:

```sh
node scripts/check-engineering-readiness.mjs --solves offered --output /tmp/engineering-readiness.json
```

For a faster allocation audit while editing:

```sh
npm run check:engineering-readiness
```

To isolate a reference or execute every numerical thermal plan:

```sh
node scripts/check-engineering-readiness.mjs --reference redwire-8kw --solves offered
node scripts/check-engineering-readiness.mjs --solves all --output /tmp/all-thermal-predictions.json
```

`--reference` can be repeated. It accepts the seven study/reference IDs as well as `launcher:<catalog-id>` and `engine:<preset-id>`. The command exits with code 1 on a missing input, invalid model/case, broken setting link, unresolved engineering source or numerical execution error. `--json` writes the full report to stdout; `--quiet` suppresses progress messages.

## What is covered

The default configuration matrix includes the custom study, all design references, every launch vehicle in `launchFleet`, and every alternate engine preset. The current matrix contains 17 configurations. Adding a new reference, launch vehicle or engine expands the matrix automatically.

| Check | Failure that blocks a release | What remains independent |
| --- | --- | --- |
| Declared design inputs | Missing, nonfinite or out-of-range values before normalization; missing initial control defaults; numerical views referencing undeclared controls | Whether the selected design achieves its mission |
| Subsystem allocations | Missing required fields in compute/fabric, storage, communications, power, thermal transport, attitude, propulsion, mass, launch fit, mechanical geometry and avionics | Supplier qualification, measured tolerances and as-built evidence |
| Numerical domain screens | Calculator exceptions, nonfinite results or a comparison claiming an assessed outcome without numeric operands | Honest `unassessed` evidence reviews and predicted design shortfalls |
| Communications checkout | Missing fixture settings or criteria, nonfinite numerical sweeps, invalid absent-hardware outcomes | A simulated link failure or a deliberately absent terminal |
| Electrical interfaces | Missing endpoint, connector, wire, pin map, route, capability criterion or source; incompatible registry identities; invalid prediction provenance | Predicted current, voltage-drop, signal-rate or mass shortfalls; supplier application approval and measured hardware evidence |
| Electrical geometry | Cable ends detached from plug exits, invalid normals, bend-radius violations, route longer than allocated cable, missing part selection or mating motion | Nominal geometry is not a tolerance stack, tool-access certification or released installation drawing |
| Payload data custody | Nonfinite counters, missing flow readouts, negative inventory, broken input/product/shared-recorder conservation or animation unrelated to actual bytes | A saturated link, deferred checkpoint, uncompleted training deliverable or queued customer product |
| Parts navigation | A thermal setting with no matching item/plan; wrong thermal plan selected for the setting | Illustrative test environments that do not claim numerical simulation |
| Thermal model | Unallocated or invalid required properties, bad topology, missing engineering bases/sources, unknown flight-item allocation profiles | Supplier capability ratings and physical model correlation |
| Thermal case | Missing hot/cold targets, invalid editable inputs, unresolved sensors/boundaries, stale configuration identity, invalid schedules or convection in vacuum | A predicted article that does not stabilize or reach its target |
| Thermal execution | Solver exceptions, missing/nonfinite temperatures or convergence comparisons, an energy ledger that does not conserve energy, or a prediction claiming measured/accepted evidence | Out-of-band temperatures, incomplete plateaus and refinement warnings, which remain visible engineering results |
| Prediction retention | A default run that cannot serialize or exceeds 3,500,000 serialized characters, leaving insufficient room for associated metadata in the browser store | User-requested finer export sampling; integration and extrema accuracy are never reduced to fit the artifact |

`--solves offered` executes the **complete production schedule at its shipped timestep**, including automatic half-step convergence comparison, for every TVAC/atmospheric-cycling setting offered in the parts navigator. It also executes the integrated-spacecraft thermal-balance case for every configuration. It does not shorten ramps, remove cycles, widen target tolerances or replace the production solver. `--solves all` extends execution to every numerical thermal plan. Interface/evidence review plans are not numerical capabilities and are excluded from the executable-plan count.

The report retains reference, item, plan, setting, field path and error code for each failure. Per-scenario readiness and prediction summaries make it possible to distinguish a missing allocation from a difficult thermal response. Counts of open verification requirements, unapproved plans and predicted shortfalls are reported separately.

The execution gate independently recomputes energy closure from applied, rejected and stored energy. The allowed absolute residual is the larger of 1 joule or `1e-8` times the largest absolute ledger total. Finite values alone are insufficient. The production half-step comparison must also return finite response and timing metrics; a finite `refinement-needed` result remains an engineering diagnostic rather than a missing-data error.

## Regression protection

`engineering-readiness-checks.mjs` deliberately removes or corrupts real required inputs to prove the gate detects omissions:

- Missing fabric defaults before normalization can silently restore a value.
- Missing power-converter capacity and fabric throughput allocations.
- A scene that offers TVAC after its matching plan has been removed.
- Unallocated chamber targets and invalid article thermal properties.
- Broken thermal edges, sensor targets, stage durations and model identities.
- Invalid exposure names that would silently disable a modeled heat path.
- Missing allocation explanations and references that do not resolve.
- A newly introduced flight item falling through to the general exploratory interface profile.
- Cross-item mutation of source lists or model fingerprints during model construction.
- Nonfinite prediction temperatures or numerical output falsely labeled as verified hardware.
- A finite but nonconserving energy ledger, or an absent refinement comparison.
- An oversized default prediction that would exhaust the browser artifact budget.

Zero heat dissipation, disabled heaters, absent communications hardware, open physical evidence and honestly predicted performance shortfalls are tested as valid states where appropriate.

`electrical-model-checks.mjs` exercises the declared `electricalReadinessContract`, connector/contact selection, pin maps, allocation accounting, configuration-owned requirements and omission/corruption cases. `electrical-ui-checks.mjs` checks all reference part links, numerical capability content, physical-evidence status and verification activities. `payload-data-checks.mjs` uses the actual mission integrator through commissioning plus ten minutes of service for all six references and six workload types. The electrical geometry regression exercises deployment, attitude and mating poses against the same port register used by the MEL and electrical diagrams.

## CI and publication

`.github/workflows/engineering-readiness.yml` runs the same physics, convergence, controller/UI, contract checks and complete offered-scenario predictions on push, pull request and manual dispatch when the repository is hosted on GitHub. It preserves the full JSON report as a workflow artifact. A Sites source repository does not implicitly execute GitHub Actions; Sites publication must run `npm run check:publish` before the source helper packages the deployment, or include the equivalent commands in the source-helper command list. A failed command must stop packaging/publication.

The workflow follows the official [`actions/checkout`](https://github.com/actions/checkout), [`actions/setup-node`](https://github.com/actions/setup-node) and [`actions/upload-artifact`](https://github.com/actions/upload-artifact) usage documentation. It uses Node 24, read-only repository permissions, no retained checkout credentials and no dependency cache.

The v67 failure inventory is retained in `docs/engineering-readiness-v67-baseline.json`. It records the actual scene offerings before the fix: 175 thermal settings across the custom study and six design references, only 21 runnable by default, and 154 blocked settings. The underlying gap was a mismatch between available verification environments, item-level allocations and local model coverage. Previous tests proved that unallocated data stayed unallocated; they did not require the activities exposed to a visitor to have complete, traceable numerical defaults.
