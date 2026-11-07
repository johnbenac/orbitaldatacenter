# Reference architecture differentiation — r2

Status: preliminary design studies. Evidence reviewed 7 November 2026. Recipe revision: `odc-study-2026-11-r2`; evidence revision: `odc-evidence-2026-11-r2`; physical manifest: `odc-physical-architecture/1`.

## Purpose and boundary

Each reference now selects an explicit physical family. The selected family determines appendage count and placement, payload location, deployment order, thermal connections, terminal stations and spacecraft-side launch attachment. The same physical descriptions feed the rendered spacecraft, surface loading, mass properties and geometric screens. A mission edit evaluates this installed vehicle; it does not enlarge hardware to recover a passing result.

These are evidence-informed, configurable engineering studies. Public specifications, manufacturer imagery, company intent, regulatory proposals, derived quantities, project allocations and unresolved fields remain distinct. A promotional image supports a qualitative arrangement without establishing its dimensions or a qualified mechanism. Reported vehicle mass remains separate from the workbench equipment ledger. The NASA-tailored margins and PDR gates are unchanged.

## Family and area contracts

All model radiator areas below are physical planform. Two modeled emitting faces give twice that area before exposure and obstruction effects. This convention is not silently assigned to an ambiguous source number.

| Reference / family ID | Physical arrangement | Controlled area and dimension basis | Thermal path |
| --- | --- | --- | --- |
| Redwire / `redwire-platform` | Two ROSA blankets; one moving compute/radiator platform; service-only bus | Source: two 2 × 20 m blankets = 80 m²; one 3.25 m square platform = 10.5625 m² planform and 21.125 m² emitting surface. Bus dimensions are accommodation allocations. | Local spreader and heat pipes, with a separate allocated bus thermal strap whose hinge route is unassessed. No remote pumped payload loop or fluid crossing at the platform hinge. |
| Starcloud-3 / `starcloud-inline` | Thin equipment bay; two opposed inboard-radiator/outboard-PV sequences; two optical terminal stations | Topology is interpreted from the manufacturer animation. 1,721 m² PV, 431 m² radiator planform and solar aspect 10 are project allocations. Actual full span is derived and shown separately from the unresolved 400 ft statement. | Allocated pumped transport through the inline deployment. Radiators remain fixed after deployment; no independent Sun-avoidance rotation is credited. |
| AI1 / `starmind-cross` | Two broad wings; two opposing tall radiator banks; compact equipment bay | Source envelope 75 × 30 m. 840 m² PV is conditional on 210 kW and 250 W/m² sharing the same rating boundary. Source radiator area is 160 m² with unresolved face convention; this recipe allocates 160 m² planform / 320 m² emission. | Two allocated independent half-duty loops, each with duty and standby pumps. Published redundancy does not establish full-load operation after losing one whole loop. |
| Orbital June / `orbital-rack` | Rack-centered bay; two long wings and a separate radiator axis | June 100 m full span and about 100 kW generation are retained. 285 m² PV, 66 m² radiator planform and 35 kW IT are allocations. April imagery is an explicitly earlier visual antecedent. | Allocated pumped rack-to-radiator transport. |
| Orbital September / `orbital-reflex` | Separate Reflex-led revision; allocated rectangular bay and paired deployables | 1,505 m² PV and 455 m² radiator planform are study allocations. June mass and 100 m span are not imported into September. The approaching-250 kW peak statement has an unresolved electrical boundary. | Allocated pumped transport. Passive radiation to space does not imply pump-free internal transport. |
| Self-powered benchmark / `heatlift-study` | Allocated protected-core geometry with four blankets and two banks | Source analytical PV allocation about 1,100 m²; model radiator planform 351 m². No manufacturer flight shape is claimed. | Distinct cold store, powered heat-pump stage and hot radiator store. Compressor power enters electrical demand and hot-side rejection. |

The legacy `protected-core` family remains available for old saved designs and the original matched architecture trade. That trade’s three alternatives do not become a validated comparison of the new families. New-family architecture reviews show the installed family and mark the legacy matched alternatives unassessed.

## Evidence and source versions

The executable field register is `dist/reference-evidence.js`; each field records evidence class, source IDs, basis, review date and, where available, page, figure or timestamp. The catalog and dossier show this provenance alongside model values. Unknowns remain null or explicitly unresolved.

- **Redwire, May 2026:** the [power and thermal paper](https://rdw.com/wp-content/uploads/2026/05/RDW26-053-ODC-Power-Thermal-Study-White-Paper-R11-Digital.pdf), printed pages 7–9 and Figures 5, 7 and 8, supports the dimensions and local compute/radiator topology. Its approximately 1.1 m Falcon 9 folded arrangement is not assigned to the distinct New Glenn installation. The 8 and 10 kWt payload comparisons at beta 90° are separate from a seasonal mission case; routing the 2 kW bus allocation onto that platform is not established by the plotted payload thermal cases.
- **Starcloud:** the [official animation](https://www.starcloud.com/starcloud-3), inspected at approximately 14 seconds, supports paired inline appendages and fluid-carrying hinge details qualitatively. The [31 October company factory tour](https://www.sourcery.vc/p/breaking-23b-starcloud-factory-tour) supplies the approximately 2 t, 235 kW and 400 ft statements, whose boundaries are not interchangeable. The [8 May interview](https://www.mckinsey.com/industries/technology-media-and-telecommunications/our-insights/the-case-for-data-centers-in-space) remains a separate approximately 200 kW / 3 t revision. The [26 May terminal procurement](https://www.businesswire.com/news/home/20260526670395/en/Starcloud-to-Integrate-SpaceXs-Starlink-Mini-Lasers-Into-Its-Orbital-Data-Center-Constellation) supports two Mini Laser terminals within its announced scope, not guaranteed simultaneous relay service. The patent remains optional embodiment evidence, not a Starcloud-3 flight bill of materials.
- **AI1, 4 August 2026 archive:** the [manufacturer page-data snapshot](https://web.archive.org/web/20260804210223jm_/https://www.spacex.com/7083.7e86f4011bddeea7.js) retains the Overview, Thermal and Solar records. The register records its 68,551-byte length and SHA-256. The 160 m² radiator statement is preserved without resolving its face convention. Silicon cells are a model allocation; reproducing aggregate 250 W/m² does not qualify cell technology, strings or I–V curves. The [24 August NVIDIA announcement](https://investor.nvidia.com/news/press-release-details/2026/SpaceXAI-Adopts-NVIDIA-Vera-CPU-to-Accelerate-Agentic-AI-at-Massive-Scale/default.aspx) describes an optimized orbital NVL72 intention; the generic tray proxy is not presented as its flight hardware.
- **Orbital:** [30 June](https://orbital.inc/press/orbital-100000-constellation.html) and [10 September Reflex](https://www.reflexaerospace.com/press-releases/orbital-selects-reflex-as-exclusive-satellite-platform-partner-space-data-center-constellation) are separate records. Neither later statement retroactively supplies dimensions for the April image, and June mass and span do not fill September unknowns.
- **Heat-lift benchmark, 31 March:** the [analytical study](https://www.star-catcher.com/news/the-orbital-data-center-power-problem-and-how-to-solve-it) is represented as a single self-powered node. Beamed power and the multi-node cluster are outside this case. Cooling COP 4, 200 kW cold capacity and the detailed package are project allocations; the 373.15/423.15 K cold/hot boundary is not an extension of the ammonia property correlation.

Detailed Starcloud FCC attachments could not be retrieved during the audit. Their exact URLs remain in `referenceRetrievalBacklog`; unverified secondary footprint numbers are not promoted into geometry. Regulatory notices supply proposed mission bands, not licensed final flight configurations.

## Installed communications and service boundaries

`dist/communications-packages.js` defines an explicit installed-equipment choice. Every package retains the family’s optical stations: two for Starcloud and one for the other families. Optional RF equipment changes the physical manifest, rendered apertures, terminal stations, equipment mass and power allocation, service availability and test applicability together.

| Package | Ka terminal | S-band patches and independent TT&C radio |
| --- | --- | --- |
| `full` | One | Two patches and one radio allocation |
| `optical-ttc` | Omitted | Two patches and one radio allocation |
| `optical-ka` | One | Omitted |
| `optical-only` | Omitted | Omitted |

Legacy studies keep the full package. The r2 AI1 recipe explicitly chooses optical plus S-band TT&C, omitting the common large Ka terminal. This is a project accommodation consistent with its reduced RF intent, not a supplier specification for the exact radio or patch count. Other r2 recipes keep the full package as an explicit allocation. Ka currently supplies the modeled payload downlink; it is not credited as an independent command receiver. A study without S-band shows an unresolved command path and independent ground-tracking evidence. Its omitted radios receive no data rate, power, equipment mass or successful bench-test credit. A no-equipment test is not applicable, rather than passed.

Starcloud’s announced up-to-25 Gbit/s intersatellite terminal capability is separate from the allocated 2 Gbit/s direct optical Earth receiver model. Direct-ground compatibility remains unverified. Both optical stations appear physically, but the service model retains one active payload route and does not invent simultaneous handover or doubled delivered capacity. Terminal mass, power, field of regard and availability are preliminary allocations where a matched supplier interface is unavailable.

## Redwire source-point thermal comparison

`dist/reference-thermal-comparison.js` evaluates the paper’s 8 and 10 kWt payload cases separately from mission operations. The dossier plots the reported maximum compute-interface temperatures of 48 and 66 °C against the allocated lumped spreader-interface calculation. This is a fixed reference-load comparison independent of edited spacecraft inputs. A spatial maximum from the paper and a lumped model temperature are different statistics; neither is a chip-junction temperature or a qualification result.

The default comparison deposits no bus heat on the platform because the published plotted cases identify payload heat. A separate 2 kW bus sensitivity shows how that boundary changes the result. The calculation records its emissivity, absorptivity, Earth view, environmental flux and passive conductance assumptions without fitting them to the source. The operational spacecraft includes an additional allocated bus strap. Its route through the platform hinge is unassessed and is explicitly distinguished from the paper’s electrical-only hinge description.

## Mission cases and conservation

`dist/reference-missions.js` separates **Source mission** from **Common comparison**. Opening a reference proposes the complete case for design review. Switching the catalog selector only previews that case until the user opens it.

The common case is circular 550 km, 53°, five years, epoch `2026-11-04T00:00:00Z`, RAAN 30°. Source cases use Redwire 1,500 km SSO; Starcloud 700 km inside its proposed 600–850 km band; AI1 an allocated 550 km SSO; both Orbital revisions 650 km inside the program’s proposed 500–850 km band. The heat-lift study retains the common orbit. Exact epoch, 18:00 LTAN for the SSO cases, selected altitudes within bands and mission durations are identified as allocations.

The standard resource screen retains the conservative circular zero-beta eclipse and policy margins. A separate seasonal screen samples 25 dates in each of the first and last mission years, using the existing secular J2 and seasonal Sun model. It reports sampled beta, minimum sunlight and longest eclipse, with a separately evaluated source-environment resource case. Zero sampled eclipse is not a continuous-sun guarantee. Eccentric or invalid inputs remain unassessed by this circular seasonal helper.

Required invariants:

1. Source and common cases have identical installed hardware and physical identity: areas, equipment, tanks, propellant, storage, batteries and actuator ratings do not change.
2. A prescribed full span or height constrains shape while conserving installed area. Impossible constraints become visible shortfalls rather than silently changing area.
3. Geometry and source dimensions use a declared canonical pose; achieved flight pointing is evaluated separately.
4. Heat-lift bookkeeping obeys `Q_hot = Q_cold + W_electric`; thermal capacity, served power and the thermodynamic COP bound constrain operation.
5. Passive transport installs no fictitious pump, ammonia inventory, accumulator or remote payload fluid crossing.
6. Resource closure, sampled rigid geometry, applicability and qualification evidence remain separate statuses. A pass in one is not a PDR acceptance claim.

## Reproducibility and review surfaces

`dist/reference-configurations-r1.js` preserves the original raw snapshots and metadata. Opening an archived revision restores its canonical legacy inputs, protected-core family and common case. Existing links or saves are not automatically migrated into r2. The active-reference strip identifies the earlier revision and offers an explicit current-recipe review. Modified variants retain their provenance while the saved inputs remain authoritative.

The dossier and comparison table show source values, independent model mass and dimensions, field evidence, conservative resource checks, seasonal environment and assembly screens. The architecture and subsystem pages use actual counts, payload location and thermal path. Fixed radiator families do not display fictitious trim encoders. New flat/rack/dispenser families use four allocated corner attachments; the legacy circular ring’s bolt pattern is not assigned to them.

The PDR export retains the exact installed physical manifest and launch interface; selected mission and seasonal environment; field evidence and source versions; separate resource, assembly and qualification assessments; and the Redwire fixed-load comparison. The latter is also exported as `reference/source-thermal-comparison.json`. Importing a scenario restores its saved package and geometry; the new recipe does not replace them.

Implementation entry points are `reference-configurations.js`, `reference-evidence.js`, `reference-missions.js`, `reference-thermal-comparison.js`, `communications-packages.js`, `architecture-families.js`, `architecture-thermal.js`, `architecture-assessment.js` and their existing domain consumers. Relevant regression commands are:

```sh
node reference-centers-checks.mjs
node reference-history-checks.mjs
node architecture-geometry-checks.mjs
node architecture-energy-checks.mjs
node architecture-design-checks.mjs
node architecture-integration-checks.mjs
node architecture-radio-runtime-checks.mjs
node reference-thermal-comparison-checks.mjs
node equipment-list-checks.mjs
node comm-verification-checks.mjs
node pdr-flight-checks.mjs
node pdr-service-checks.mjs
node flight-software-checks.mjs
node teaching-checks.mjs
```

The reference checks exercise source/allocation boundaries, archive identity, six distinct families, identical hardware across mission cases, conservation of installed areas and exact configured envelopes. Geometry checks cover manifest/renderer agreement; energy checks cover transport and power/heat accounting. Radio-package checks verify absent equipment cannot provide traffic, command reception, telemetry, electrical demand or test qualification credit. These checks verify the implementation contract, not flight qualification.

## Remaining engineering evidence

Provider drawings, accepted launch interfaces and dispenser packing remain open. The current rigid-body sweep and terminal ray samples do not establish continuous swept clearance, flexible modes, coupled loads, mechanism torque/life, harness or fluid-line life, or contamination acceptability. Terminal counts do not establish relay ephemerides, peer scheduling, protocol compatibility or a service contract. Generic compute trays do not establish supplier orbital package performance or radiation lifetime. The high-temperature heat-lift case still requires qualified electronics, refrigerant, seals and pressure/material evidence.

The highest-value source clarifications are the AI1 radiator face convention; Starcloud’s matched array/radiator dimensions, power boundary and complete mass ledger; the September Orbital physical arrangement; Redwire bus heat routing and passive transport qualification; and accepted launcher/spacecraft interface records for each implementation. These uncertainties are retained in the product so that later evidence can refine individual fields without rewriting the reference history.


## Publication verification

The final integration pass exercised all six current families plus archived r1 restoration. Mission, orbit, epoch, pointing-command and demand edits preserve installed vehicle identity. Source/common cases retain the same hardware. Area, wet mass, intrinsic inertia, parallel-axis terms and moving joint masses reconcile through the sampled deployment poses. The rigid-volume clearance screen includes folded panels, the bus and translating solar rolls; all six bundled r2 poses passed the sampled sweep. The Starcloud root/tip stand-offs increased the allocated full span to approximately 239.39 m without changing collecting or emitting area. AI1 remains 75 × 30 m and the June Orbital solar span remains 100 m.

The terminal and energy checks cover all four communications packages, missing-radio service and power, local recording with unmet command requests, and an explicit unavailable result for an absent selected terminal. Optional articles receive no simulated successful bench verification. Thermal checks exercise passive transport, independent loops, compressor power/heat conservation, upstream losses and the separately declared Redwire source-load comparison.

The PDR ZIP round-trip was checked with the legacy default, Redwire and AI1, each using a bounded 94,672.8-second fixture. Each archive restored its exact configuration and contained 16 domain assessments and 16 primary domain graphics, with supplemental graphics and all relative HTML/SVG links resolving. Reference provenance, family-specific commissioning, actual launch attachment, physical manifest, seasonal evidence, open assembly/qualification items and the Redwire comparison survive export. The bounded export fixture does not constitute a multiyear mission-closure analysis.

All six 3D families were visually inspected, including the moving Redwire compute platform, and all six launch scenes were constructed and updated at integration, pad and insertion states. The catalog, mission-case preview, review modal and AI1 dossier were checked in the live browser. The comparison case preview leaves the active configuration intact until the user applies the review. Camera rotation remains free. [AI1 dossier verification snapshot](architecture-r2-ai1-review.jpg).

Additional focused regression commands:

```sh
node architecture-integration-checks.mjs
node architecture-mechanism-checks.mjs
node architecture-radio-runtime-checks.mjs
node reference-thermal-comparison-checks.mjs
node inertia-checks.mjs
node launch-structure-checks.mjs
node interface-checks.mjs
node commissioning-flight-checks.mjs
node terminal-activity-checks.mjs
node comm-verification-checks.mjs
node service-architecture-checks.mjs
node pdr-service-checks.mjs
node pdr-resources-checks.mjs
node work-feedback-checks.mjs
node reference-window-checks.mjs
node pdr-export-checks.mjs
node pdr-export-checks.mjs redwire-8kw
node pdr-export-checks.mjs starmind-ai1
```

Passing implementation checks establishes internal consistency within the declared model. Resource shortfalls, payload accommodation limits, provider interfaces, structural/flexible deployment evidence and hardware qualification remain explicit engineering results.


The production startup check also identified a redundant first-day integration: requesting the midnight endpoint before recording the visible day ran an extra history pass and displayed an unhelpful “day 1 of 60” progress label. Window preparation now records the displayed day first and reuses its endpoint. The focused worker test confirms exact summary, sampled-window, service and instantaneous-state parity, first-day-only work, reusable caches, cancellation and retained Phase F preparation.
