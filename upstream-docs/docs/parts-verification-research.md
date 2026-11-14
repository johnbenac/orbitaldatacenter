# Parts Navigator verification planning — research and data coverage

Reviewed November 7, 2026 (America/New_York). Implementation: `dist/part-verification.js`. This is an educational, configuration-reactive PDR planning layer. It is not an approved verification plan, acceptance database, supplier qualification statement or operating procedure.

## Coverage and ownership

The resolver covers every current stable catalog ID across the protected-core starter, six reference designs and ten launcher choices. It does not change `sizeDesign`, the MEL, the flight mass ledger, material assignments, spacecraft geometry or supplier selections.

| Catalog family | Distinct IDs | Treatment |
| --- | ---: | --- |
| Flight | 79 | 31 MEL parent allocations and 48 material/component details; equipment functions, environmental evidence, material/process boundaries and contained inventories |
| Launch vehicle | 23 | Provider-controlled vehicle, stage, engine, fairing, control-surface and launch-interface evidence; concept cargo interfaces stay explicitly conceptual |
| Ground support | 38 | Calibration, test-set reference cases, load/handling evidence, maintenance and commissioning of enabling equipment |
| Site | 47 | Installed facility commissioning, commodity-service definition and circuit/umbilical interfaces |
| **Total** | **187** | **137 resolved profiles; no current ID uses the defensive receiving-review fallback** |

The 17 standard configurations contain 2,629 record instances. The final data audit resolves 8,216 planned activity instances and 4,324 study analyses. Every record has at least two activities and one analysis. Taking one currently resolved plan per stable ID gives 569 activities and 288 analyses; these last two counts are illustrative because the same ID can change profile details with architecture or launcher selection.

The four method assignments are Test, Analysis, Inspection and Demonstration. Across the standard configuration sweep there are 3,779 test, 4,864 analysis, 6,633 inspection and 1,873 demonstration assignments; an activity may use multiple methods. No activity has a completed/pass/accepted status. Every activity has a requirement, objective, approach, measurements, substantive criterion, conditions, article boundary, prerequisites, evidence list and sources.

The used source set spans 183 source IDs and 155 distinct URLs. The implementation reuses the existing flight, material, launch and ground learning-source registries, then adds the current GEVS document and NASA systems-engineering references. Source counts include contextual supplier/facility references; a source is not evidence that this workbench article has undergone a test.

## Current GEVS source and reading record

NASA's [official GSFC-STD-7000 landing page](https://standards.nasa.gov/standard/GSFC/GSFC-STD-7000) identifies Version B, Change 0, approved April 28, 2021, as active. The currently linked [administratively extended PDF](https://standards.nasa.gov/system/files/tmp/GSFC-STD-7000B_Approved_Admn%20Ext.pdf) records an administrative extension on April 24, 2026 and a revalidation date of April 28, 2027. Its history does not identify a new technical revision for that extension.

The current PDF was downloaded and read directly using text extraction after a web parser produced a malformed repeated table. The earlier [NASA fixed-links B PDF](https://standards.nasa.gov/sites/default/files/standards/GSFC/B/0/gsfc-std-7000b_signature_cycle_04_28_2021_fixed_links.pdf) was used temporarily to recover thermal passages, then checked against the current downloaded document. Product links point to the current extended document, with precise section names rather than guessed PDF page anchors.

Downloaded PDF SHA-256: `3e4bf794cdba48b00af25be19a13734f9401fb66493cac23939b5adf5b435dfe`.

| GEVS section | Implementation consequence |
| --- | --- |
| 1.2–1.3, applicability and approach | GSFC environmental guidance is a planning reference requiring project applicability/tailoring. It is not imposed as a blanket civil, launch-provider or ground-equipment standard. |
| 1.9, failures/anomalies; 1.12–1.14, facilities/calibration/measurement | Evidence needs configuration, calibration, uncertainty, raw/reduced observations and anomaly disposition. Browser motion cannot close a requirement. |
| 2.1.1.1–2.1.1.6, performance-verification documentation | The activity schema connects requirements, methods, article/setup, criteria and required records; integration prerequisites identify lower-level evidence dependencies. |
| 2.2.1–2.2.5, levels, tailoring, similarity and factors | Tests belong at a physical level that represents the hardware. Material coupons, procurement lots and parent assemblies are distinguished. Heritage requires an applicability assessment, not a supplier-name match. |
| 2.3.1–2.3.5, electrical interfaces and functional performance | Verify interfaces before mating; use comprehensive baseline function and selected checks around stress exposure; retain firmware, dictionaries, operating modes and fault responses. |
| 2.4.1–2.4.4, loads, vibration, acoustic and shock | Predict and correlate loads/fixtures, choose appropriate assembly coverage and record notching/response limits. No universal random-vibration spectrum, grms, shock level or structural safety factor is assigned. |
| 2.4.5, mechanical function/life/force margin | Motion/fit demonstrations, life characterization and end-of-life force/torque evidence are separate from an illustrative deployment animation. |
| 2.4.7, mass properties | Distinguish mass allocation from measured mass, fixture tare, CG and inertia. Detail pages preserve included-in-parent accounting. |
| 2.5.1–2.5.3, EMC | Define representative harnesses, grounding and source impedance; select emissions/susceptibility tests from the project EMC plan. An RF test hat is not an antenna range. |
| 2.6.2–2.6.3, thermal vacuum | Derive article temperatures and chamber conditions from actual hardware limits and the selected approach. Operating-temperature inputs are not labeled qualification chamber set points. |
| 2.6.4, thermal balance | Hot, cold and survival/safe cases, measured heat/power, flight-like boundaries, fixture/chamber modeling and model correlation are represented as a different purpose from workmanship cycling. |
| 2.6.5–2.6.6, contamination during thermal testing and leak integrity | Protect sensitive surfaces, account for chamber/support contamination and link leak checks to stress/integration that can affect integrity. |
| 2.8.1–2.8.2, contamination/coatings engineering | Finish and blanket records use material/process lots, witness/representative specimens, optical properties, adhesion/bond/coverage and parent thermal evidence. GEVS's coatings milestones call for key surface selection and preliminary test evidence at PDR; the workbench leaves unavailable evidence open. |

GEVS distinguishes prototype/qualification, protoflight and recurring acceptance exposure. These are not interchangeable labels. The plan explains that the project must select the verification approach and approve limits, margins, durations and flight-article use. It intentionally does not copy GEVS tables as universal settings for every displayed part.

## Systems-engineering basis

The [NASA Systems Engineering Handbook, §6.1 Technical Planning](https://www.nasa.gov/reference/6-1-technical-planning/) identifies verification planning at PDR and the methods analysis, inspection, demonstration and test. Multiple methods can support one requirement. Plans must mature with the design and the physical level of the item.

[§5.3 Product Verification](https://www.nasa.gov/reference/5-3-product-verification/) supplies the distinctions between verification, design qualification, acceptance of each produced item and certification. It also requires the enabling equipment, approved requirements, procedures, calibrated instrumentation, collected records and disposition of deficiencies needed to turn a plan into evidence.

[§5.2 Product Integration](https://www.nasa.gov/reference/5-2-product-integration/) connects lower-level realization to interface verification and the assembled product. This is a recursive product loop, not a claim that every selected item is the smallest component in the system.

The [handbook Appendix I](https://www.nasa.gov/reference/system-engineering-handbook-appendix/) contains the annotated V&V plan outline, including PDR baseline, requirements flowdown, end-item verification and integration into larger assemblies. The website's Appendix I heading says “Integration Plan Outline,” while its body is the verification and validation outline; the source description discloses that mismatch rather than inventing a separate URL.

For ground equipment, [NASA-STD-5005](https://standards.nasa.gov/standard/nasa/nasa-std-5005) is linked as an applicable-design-framework reference, subject to the facility/project's actual authority. The official page currently lists D with Change 2, revalidated September 30, 2024. The ground electrical/umbilical plans also link [KSC-STD-E-0022](https://standards.nasa.gov/standard/KSC/KSC-STD-E-0022), whose active Revision A is dated September 23, 2026. Its KSC scope is not silently imposed on another operator's facility. Existing primary supplier, NASA/ESA facility and payload-user-guide references provide context for equipment and interface concepts.

## Important tailoring decisions

- **Battery:** Capacity, cell balance, pack sensing/protection and power interfaces are separated from life/abuse investigations on appropriate representative articles. The live nominal energy window is `batteryKWh × (socMax − socMin)` and explicitly excludes aging, rate, temperature, losses and reserve; it is not a measured accepted capacity.
- **Thermal architecture:** Passive-local transport receives spreader/strap/heat-pipe and bond characterization, not a fictional common pumped-ammonia service. Pumped, independently contained redundant-pumped and heat-lift selections retain their actual topology and live design inputs. Working-fluid integrity is conditional on the selected construction.
- **Material layers:** The 48 details resolve through 30 type-specific process/characterization profiles and explicit per-ID functional context. Coverglass, coatings, MLI layers, dielectric, plating, overwrap and hidden conductors do not become independently massed flight shaker articles. The parent/coupon/procurement-lot boundary is visible.
- **Propellant inventory:** Fuel, oxidizer and helium follow lot identity, compatibility, measured loading and the containing vessel. Aerozine-50 uses DLA/Apollo/compatibility references rather than MMH specification links. Numeric purchase/service limits remain unallocated until the controlled specification is selected.
- **RF/optical equipment:** Conducted loops, test hats, calibrated RF/optical reference planes and antenna/pointing characterization have distinct purposes. No coupled test or nominal aperture is reported as measured far-field gain or mission link closure.
- **Launch vehicle:** Provider evidence requests and customer interface verification are explicit. The module does not assert unpublished provider test campaigns, certified limits or completion. Large-cargo Starship door/carriage/track views remain study concepts.
- **Ground equipment:** The supported flight article's mass/power/thermal allocations can inform required equipment range, but are never converted into a certified crane, stand, cart, pump or instrument rating. Reference-case verification, calibration, commissioning and maintenance are part of the GSE's own plan.
- **Civil works and fixed facilities:** Installed/site-commissioning settings and operational/as-built handover replace bench/mating language for entire buildings, cranes and site assets. Unresolved exhaust/water/tower architectures remain unresolved; no capacity, tank count or separation distance is invented.
- **Umbilicals:** Individual power/data/bond/air/fluid circuits have their own methods and conditions; the group adds support loads, combined states and release evidence. Functional circuit counts are not physical connector or hose counts. Unidentified fuel/oxidizer circuits require definition before pressure/compatibility requirements can close.
- **Fit demonstration:** Root-supported `mate` motion is offered only for meaningful discrete geometry. Unsupported animations owned by a parent are not presented as operable child controls; the plan points to the linked parent. Nominal motion never certifies tolerances, contact forces, clearances under load or as-built fit.

## Live analyses and evidence limits

Analyses use values already present in the selected record/hardware object, plus transparent elementary arithmetic. Included cases cover mass per listed unit, storage/I/O allocation, source voltage/power, the battery SOC energy window, EPS capacity minus modeled demand, thermal transport/flow boundaries, CMG cluster allocations, magnetic unloading inputs, pointing/RF interfaces, vessel sizing, integration-envelope clearances, shielding mass boundaries, harness resistance/drop inputs and actual linked umbilical circuit counts.

All quantitative values have units and an input/model basis. The analysis cards include equations when arithmetic is performed and explicit limits. There are no newly invented finite-element, radiation-transport, aerodynamic, structural stress, pressure-proof, thermal-correlation, reliability or measured performance results. Unselected limits are strings such as “Unallocated,” not zeros that could appear to pass.

Representative thermal-finish, coverglass, RF-dielectric and blanket-cover specimens also have a thermal-cycling activity; its atmospheric screen is explicitly distinguished from parent thermal-vacuum verification. The activity diagrams are qualitative sequences. They are labeled planned/illustrative and do not draw fake measured vibration PSDs, hot/cold telemetry curves, load-deflection traces or pass badges. The 3D test environments are instructional settings; the data module does not designate them as certified facilities.

## API and verification

Exports:

- `verificationSources`: existing learning sources plus primary verification references.
- `verificationSettings`: the agreed 18 scene IDs and descriptions.
- `partVerification(record, catalog, hardware)`: a fresh plan with profile/title/summary/level/scope/default setting, relevant setting IDs, activities, analyses, integration handoff and source IDs.

`chart` uses `{kind, steps:[{label, description}], caption, articleLabel?}`. Activity status is always `planned`; analysis status is `study` or `planned`. The source registry and settings registry are immutable exports, while each returned plan is independent. The resolver accepts the catalog's object `byId` and also tolerates a Map or a records-only lookup.

Read-only audits checked all 17 standard configurations for complete coverage, required fields, valid source IDs and setting IDs, supported motion controls, valid handoff parent links, nonempty evidence/prerequisites/measurements, finite numeric outputs, all four method values, and no mutation of the hardware or catalog. A separate Aerozine-50 configuration checked commodity sourcing. UI and viewer/scene tests are owned and reported by their respective agents/root.

No operating limits are authorized by this release. The educational plans make missing design allocations and evidence explicit so that a real project can replace them with approved requirements, selected hardware, calibrated procedures, measured records and responsible review decisions.
