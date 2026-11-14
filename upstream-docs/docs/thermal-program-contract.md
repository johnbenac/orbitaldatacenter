# Thermal engineering records

`dist/thermal-program.js` owns configuration identity, requirement allocations, verification plans and locally retained artifacts. The analysis adapter and numerical solver are separate modules. Neither the solver, a chamber animation, a test-approach selector nor a CSV import closes verification.

## Configuration and hierarchy

```js
const program = buildThermalProgram(hardware, catalog, {
  phase: 'B',
  overrides: {items: {}, plans: {}}
});
const view = thermalProgramForItem(program, 'flight:02.02');
// view = {item, requirements, plans}
```

The hierarchy contains every catalog record, retaining its stable ID and parent relation, plus `thermal:spacecraft` and `thermal:subsystem:<WBS group>`. Flight assemblies, material/component details, launch-provider items, ground equipment and site infrastructure remain identifiable categories. The whole spacecraft has no single `nodeId`; its `thermal.nodes` carry the individual modeled boundaries.

`thermalConfigurationIdentity(hardware, catalog, overrides)` returns the same identity used by the builder. `config.id` / `fingerprint` include the reference and recipe revision, evidence revision, actual design inputs, catalog identities/mass/material/supplier associations and explicit requirement/plan overrides. `baseFingerprint` and `scopeId` exclude those local overrides so an allocation edit remains accessible in its hardware scope. Changed installed hardware, reference, mission configuration or recipe produces a different scope. Object-key order and catalog order do not change identity. The fingerprint is a deterministic change identifier, not a security signature. Empty `items`/`plans` maps and empty per-item/per-plan patches are normalized away before identity calculation and program construction, so a reset restores the original program, model and case identities. Explicit null allocations, actual values and provenance remain meaningful and are retained, including an explicitly adopted value that equals the numerical default.

The configuration records carry the reference architecture, thermal topology and mission case. An item retains the catalog's manufacturer, reference hardware and source information. Those catalog references do not constitute temperature qualification evidence.

`thermalNodeOwnerItems` identifies the direct owner of each reduced-model boundary. Edited owner allocations propagate, with their provenance, into spacecraft/subsystem per-node requirements and model inputs before requirements are generated. Junction and cold plate belong to the compute assembly; the coolant assembly's additional cold-plate interface is context and cannot overwrite that ownership. Detail rows receive an updated parent context while their own unknown limits remain unknown. Scalar temperature overrides on synthetic spacecraft/subsystem rows are rejected because those rows contain several distinct temperature boundaries.

## Four distinct meanings of temperature

| Record | Meaning | Default treatment |
| --- | --- | --- |
| `item.capabilityRatings` | Supplier-qualified capability at an identified boundary, revision and applicability | Empty until actual controlled evidence is supplied; no rating is fabricated |
| `item.thermal.operating` / `survival`, `limits`, requirement `criterion` | Editable project allowable range | Existing six-node study allocations are explicitly labeled; unsupported component/provider/site limits remain null |
| Analysis model and run | Predicted response for specified properties, loads and environments | Separate configuration-owned numerical artifact; retains assumptions and validity limits |
| Verification-plan `parameters` | Candidate exposure and measurement targets | Derived from allocated allowable ranges plus an explicit test margin, or supplied as a documented target; never derived from a favorable prediction |

An assembly-level node is not a measured internal component temperature. Material and detail rows retain their parent node as context (`thermal.proxy`, `criterionEligible:false`) while their own allowable temperatures remain unallocated. The adapter must explicitly distinguish a dedicated local model from this parent context. The schema does not duplicate model heat capacities, geometry, conductance or radiation properties; those belong to the analysis model and its assumptions.

`limits` accepts `operatingMinK`, `operatingMaxK`, `survivalMinK`, `survivalMaxK`, `allowedGradientK`, `allowedRateKPerMin`, `powerCapabilityW`, `measurementUncertaintyK`, `correlationRmseK` and `correlationBiasK`. Each has units and a basis in `criteriaMeta`. A transport-capacity value already in the design is a project allocation, not a supplier rating. The non-operating range must contain the operating range. Null is an explicit unknown or cleared allocation.

## Requirements and plans

Requirements retain `id`, criterion-derived `revision`, `configurationId`, `itemId`, parent requirement IDs, statement, criterion, methods, planned phase, review gate, owner, source IDs and linked plan IDs. Their numerical allocation status is independent of `verificationStatus:'open'`. Coverage, functional and documentary requirements retain their unresolved criteria instead of being shown as verified because prose exists.

Planning covers phases A–F: requirement allocation, PDR planning, detailed design/characterization, integration/environmental verification, operations reconciliation and disposal/archive. Inspection, analysis, test and demonstration are separate method values. A demonstration requires identified hardware and observed functional results; a visual sequence illustrates the proposed demonstration.

Plan kinds are `thermal-analysis`, `tvac-cycling`, `thermal-balance`, `atmospheric-cycling` and `interface-review`. Provider vehicle and civil/facility items receive interface and analysis plans without an automatically imposed flight-unit chamber exposure. Detail/coupon exposure and parent-assembly coverage require tailoring. Atmospheric cycling is explicitly distinct from a vacuum test.

The `approach` field distinguishes engineering development, design qualification, protoflight and article acceptance. Selecting an approach changes the proposed article and review obligations. It does not approve a plan, demonstrate hardware or silently apply a universal temperature margin. Article acceptance requires a justified design and an approved recurring procedure.

The editable plan parameters are:

| Parameter | Unit | Purpose |
| --- | --- | --- |
| `hotK`, `coldK` | K | Candidate article targets at the named boundary |
| `testMarginK` | K | Explicit extension beyond operating allowances |
| `ambientK` | K | Initial / ambient numerical scenario |
| `cycles` | cycle | Proposed repeat count |
| `rampKPerMin` | K/min | Boundary ramp |
| `dwellS` | s | Dwell counted after article stabilization |
| `stabilityKPerHour`, `stabilityWindowS` | K/h, s | Article stability criterion and observation window |
| `toleranceK`, `maxPlateauS` | K, s | Target tolerance and maximum plateau time |
| `pressurePa` | Pa | Declared chamber/environment pressure |
| `hotLoadFraction`, `coldLoadFraction` | fraction | Mode-dependent internal loads |
| `heaterEnabled` | boolean | Simulated control availability |

Every parameter carries a `parameterMeta` unit, basis, source IDs and a status: simulation scenario, derived target, user allocation or unallocated. The numerical starting scenarios are not published GEVS test requirements. Zero extra margin remains explicitly unallocated. Exceeding a non-operating limit produces an open issue; it never expands that limit. Multi-node spacecraft targets require individual sensor/interface allocations. Thermal-balance boundaries must come from mission heat flux, interfaces and operating loads; cycling temperatures do not establish a balance case.

`validateThermalOverrides` rejects malformed objects, unknown fields, nonfinite values, invalid units/ranges, inverted temperature bands, unsupported approach values and impossible plateau/dwell combinations. The builder also validates the effective merged criteria and target ranges. The override records accept `basis`, `sourceUrl`, `owner`, `procedureRevision` and `approach` alongside supported numerical fields. User source URLs become source records.

## Local drafts and retained artifacts

```js
const store = createThermalProgramStore(); // optional Storage-compatible argument
store.setDraft(program.config.scopeId, 'program', overrides);
store.setDraft(program.config.scopeId, 'model:flight:02.02', modelOverrides);
store.setDraft(program.config.scopeId, 'case:' + plan.id, caseOverrides);
const overridesAgain = store.getDraft(program.config.scopeId, 'program');

const saved = store.saveRun(program, run);
const evidence = store.attachEvidence(program, evidenceInput);
const exportObject = store.export(program);
```

Store methods return `{ok, persistent, error?}`; artifact methods also return `record` when a complete record has been constructed, including on quota/write failure. Validation failures return `{ok:false,error}`. The caller must show a failed-save result and can export the returned unsaved artifact. Existing records are preserved. Storage is bounded at four million JSON characters, with no silent pruning. Unavailable storage falls back to session memory. An unreadable preexisting store is not overwritten. `status()` exposes persistence and the latest error.

`saveRun` rejects a supplied stale configuration ID or fingerprint. Runs retain model/case snapshots from the solver and add requirement criterion/revision snapshots plus the linked plan snapshot. Stored runs are always predictions, with verification open and acceptance/qualification not established. An old run is not relabeled after a criteria edit.

Evidence input:

```js
{
  kind: 'measured-temperature-series', // or test-report, inspection-record,
                                     // analysis-report, supplier-document
  title: 'Engineering model thermal run',
  itemId: 'flight:02.02',
  requirementIds: ['THR:<reference>:flight:02.02:operating'],
  planId: 'THP:<reference>:flight:02.02:tvac-cycling',
  articleId: 'EM-001',
  procedureRevision: 'TV-01 A',
  recordedAt: '2026-11-08T12:00:00Z', // omit when unknown
  measurementUncertaintyK: 0.5,
  sourceUrl: 'https://example.org/project/test-report', // optional
  data: {
    timeUnit: 's', temperatureUnit: 'K',
    samples: [
      {timeS: 0, temperatures: {battery: 293.15}},
      {timeS: 10, temperatures: {battery: 294}}
    ]
  },
  analysis: {modelRunId: '...', biasK: -0.2, rmseK: 0.7, maxAbsK: 1.1}
}
```

Temperature series must contain 2–20,000 observations with finite, nonnegative, strictly increasing seconds and named positive finite Kelvin measurements. Declared temperature/time units are required. Links must resolve to the selected configuration and item. Uncertainty must be nonnegative. Source URLs must use HTTP(S). Supplied actual dates are kept separate from import time; an unknown actual date remains null. Missing article identity, procedure revision, uncertainty, date or requirement links are recorded as open items.

Imported observations are always `pending-review`. A low bias/RMSE is a comparison statistic, not approval, calibration evidence or qualification. Independent validation cases, actual boundary/power histories, sensor calibration and authorized disposition remain necessary. This workbench retains reviewable planning and evidence packages; it does not impersonate a configuration-control or acceptance authority.

Exports include the complete current program, all scoped draft namespaces, retained runs/evidence and explicit stale artifact IDs. JSON snapshots preserve the distinctions above when passed to other engineering tools.

## Authoritative sources and applicability

- [GSFC-STD-7000B current standards record](https://standards.nasa.gov/standard/gsfc/gsfc-std-7000) and [current administrative-extension PDF](https://standards.nasa.gov/system/files/tmp/GSFC-STD-7000B_Approved_Admn%20Ext.pdf): §2.6.1 definitions, §2.6.2 applicability/tailoring, §2.6.3 thermal-vacuum verification, §2.6.4 thermal balance. The NASA record identifies B as active and describes GSFC applicability; the workbench does not assert automatic adoption for commercial, provider or ground equipment.
- [NASA Systems Engineering Handbook: Technical Planning](https://www.nasa.gov/reference/6-1-technical-planning/): verification planning begins with requirements and matures through PDR and subsequent design reviews.
- [NASA Systems Engineering Handbook: Product Verification](https://www.nasa.gov/reference/5-3-product-verification/) and [appendices](https://www.nasa.gov/reference/system-engineering-handbook-appendix/): method distinctions, design qualification versus article acceptance, and requirement/evidence traceability.
- [ECSS-E-ST-31C Thermal Control](https://ecss.nl/standard/ecss-e-st-31c-thermal-control/) and [ECSS-E-ST-10-03C Rev.1 Testing](https://ecss.nl/home/ecss-e-st-10-03c-rev-1-testing-31-may-2022/): controlled thermal requirements, interfaces and test documentation; project adoption and tailoring remain explicit.
- [NASA Passive Thermal Control Engineering Guidebook v5.1](https://ntrs.nasa.gov/api/citations/20220006584/downloads/NASAPassiveThermalGuidebookv5%201Public.pdf), §4.5: actual test configuration, sensors, power, boundary conditions and model correlation.

## Semantic checks

Run `node thermal-program-checks.mjs`. The checks cover custom plus all six current design references, complete catalog/hierarchy traceability, unknown component ratings, allowable-derived targets, approach/margin separation, invalid allocation rejection, stable identities, stale-run prevention, pending-review measured data, scoped persistence, corrupted storage, quota preservation and JSON export. Solver conservation/convergence and visual integration are tested by their owning modules.
