# Thermal engineering release — v67

## Scope and access

The Thermal Control discipline now has a configuration-scoped engineering workspace in phases A–F. The same workspace appears below the selected part's 3D viewer. Its six sections cover requirements, the thermal network, analysis/test plans, results, retained evidence and lifecycle gates. The selector includes the vehicle, subsystems, flight assemblies and detail parts, launch vehicle, ground support equipment and launch-site items.

This release creates a study and verification-planning system. It does not invent supplier ratings, approve procedures, or mark physical hardware qualified or accepted. Unknown criteria and local properties remain explicit open inputs. The pre-existing coupled flight simulator is preserved.

## Configuration and evidence contract

`thermal-program.js` identifies the selected reference, design inputs, architecture, requirement overrides and model revision. Items, requirements and plans carry stable IDs and revision fingerprints. Requirements retain their owning item, parent links, source rationale, allocated criteria, applicable verification methods and linked plans. System and subsystem temperature bands flow from the owning hardware boundaries; a child does not acquire a local supplier rating from a parent assembly.

Predictions carry immutable model, case and requirement snapshots. Input changes invalidate their use in the current 3D view. Opening a saved result compares configuration, model and case identity. Empty override containers are normalized so restoring an unchanged allocation restores the original identity; explicit null allocations and adopted values retain their provenance.

Evidence records distinguish the actual measurement/report date from import time and retain article identity, procedure revision, source, uncertainty, requirement links and the associated model run. A comparison or imported report remains pending review. The bounded browser store uses atomic writes and reports storage failure while preserving prior records. Session edits and unsaved evidence remain exportable in the complete JSON package.

See [the data contract](thermal-program-contract.md) for fields and ownership rules.

## Physical and numerical model

The solver integrates finite thermal stores with backward Euler and damped Newton iteration. Heat paths include conductance and transport limits, nonlinear radiative exchange, finite-authority hysteretic heaters, and applicable active heat-pump work and hot-side rejection. Convection participates only in the explicit atmospheric chamber case. The full-step energy ledger reports applied, rejected and stored energy together with residuals.

Architecture adapters preserve the reference topology: passive local paths, pumped loops, independently represented redundant circuits, or active heat lift. The vehicle network resolves assembly-scale nodes; a local item model resolves an article and its mounting interface when mass, heat capacity, area, heat load and interface properties are allocated. Unsupported local items require inputs instead of silently borrowing a parent mass or rating.

Orbital cases sample the existing orbit and surface geometry, solar input, Earth infrared, albedo and eclipse transitions. Their controlled electrical boundary assumes available power; the existing mission simulator remains the place to evaluate battery state of charge and load dispatch. A local orbital case exposes its prescribed installed mounting temperature and does not claim to solve the parent assembly.

Thermal balance has separate mission-equivalent hot operating, cold operating and payload-off survival cases. TVAC and atmospheric cycling distinguish boundary commands from article targets. Dwell starts after all monitored article nodes satisfy both target tolerance and window stability and resets if those conditions are lost. A missed plateau remains incomplete.

Every integration step contributes to extrema, excursion duration and energy checks. Automatic half-step comparison uses integration epochs, rather than the sparse samples retained for plotting. Results that exceed the study convergence tolerance request refinement. Low numerical residual does not imply an adequate physical model.

## 3D and presentation

Thermal chambers are sealed schematic cutaways with static doors. Their article and boundary probes follow recorded solver frames. Temperature mode is disabled without a current result; mapped hardware uses the solved lumped temperature and unresolved geometry remains gray. Fixed Kelvin scales are shared by the viewport and captured media. Nested capture holds prevent replay or asynchronous worker completion from changing the captured frame.

The active-boundary helper follows model connectivity and case activation, removing unused air/fixture readouts without hiding a real prescribed local interface. Temperature plots retain command discontinuities and missing-data gaps and keep the absolute-temperature axis at or above zero Kelvin.

## Validation evidence

Run the checks from the repository root:

```sh
node thermal-analysis-checks.mjs
node architecture-energy-checks.mjs
node thermal-program-checks.mjs
node thermal-engineering-ui-checks.mjs
node thermal-engineering-controller-checks.mjs
node parts-thermal-viewer-checks.mjs
node parts-verification-scenes-checks.mjs
node parts-verification-viewer-checks.mjs
```

Additional legacy parts lifecycle and verification-page checks were retained and run during integration. Tests cover all six named design references plus the custom baseline, requirements ownership, architecture-specific transport, numerical balances, uncertainty/open states, input invalidation, corrupted/quota storage, CSV units/validation, duplicate stage times, worker races and nested capture holds.

Browser checks exercised the battery TVAC run, measured-data comparison, requirement edits, saved-result reopening, replay-driven 3D probes, the vehicle-level orbital case and the shared phase-B workspace. A synthetic importer fixture, explicitly identified as nonphysical QA data, added 2 K to each of two predicted channels; the browser returned signed bias 2 K, RMS 2 K and maximum absolute error 2 K for both. The physical test date remained unallocated and evidence remained pending review.

The battery example reached 329.47 K against a 318 K operating allocation and did not demonstrate its powered hot dwells. Its cold dwell and recovery were evaluated independently. That is an engineering-study result under stated estimates, not a conclusion about a selected supplier battery.

An infrastructure cleanup interrupted initial browser file-picker QA. Recovered solver output was checked against a previously exported package: every one of 365 frames and the entire summary matched exactly, with zero temperature difference. The full requirements program also matched the preserved export exactly. The CSV parser and comparison path passed regression tests; the browser paste path passed end to end. A successful native file-picker upload could not be confirmed in this cloud-browser session. The prior engineering JSON download was independently validated as complete.

## Sources and physical limits

The source register links NASA GEVS (thermal-vacuum §2.6.3, thermal-balance §2.6.4), the NASA Passive Thermal Control Engineering Guidebook (test/model correlation §4.5), NASA systems-engineering planning and verification guidance, and ECSS thermal-control/testing standards. Those documents guide distinctions and traceability; default case values are editable study scenarios and do not claim a compliant project-specific procedure.

These are reduced lumped models. They do not resolve cell/die hot spots, stress, local material gradients, fluid phase change/freezing, pump-down gas dynamics or detailed chamber view factors. Several capacities, contact conductances and surface properties are explicit estimates. Qualification requires an applicable approved requirement set, characterized hardware and interfaces, calibrated instrumentation, actual functional results and authorized review.

Two existing launch-site JPEGs were losslessly re-encoded to keep the static deployment within its asset limit. Decoded pixels, dimensions, quantization and metadata were preserved exactly; no image was downsampled. See the separate packaging proof.
