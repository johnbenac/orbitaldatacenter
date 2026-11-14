# Test facilities atlas

The Reference navigation now contains **Test facilities**, with 16 campuses in nine countries, 61 documented systems/capabilities and 32 dimensioned 3D reconstructions. Each campus has an operator, ownership category, sourced address, approximate geographic locator, access statement, public status and review date. Sources are attached to individual dimensions, usable envelopes, limits and specifications, as well as to the campus record.

## User-facing workflow

Search or filter by country, operator category and test capability. Select a campus and then a named system. The equipment panel switches between a 3D equipment view, a zoomable world atlas, and a 2D aerial campus locator. Official facility pages, map links and numbered evidence links are available without leaving the selection context. Campus and system links survive reload and browser history. A return action takes a visitor back to the selected part.

The 3D viewer provides material, solid and wireframe rendering, a camera-dependent cutaway, dimension labels, a fixed 1.75 m person, four camera presets, fit, orbit, pan and zoom. It uses one disposable viewer, renders on demand, and falls back to the existing software renderer when WebGL is unavailable. It does not create a render loop per card or map marker.

The Parts navigator uses the same equipment geometry for thermal vacuum, temperature cycling, vibration, acoustics and RF/EMC settings. Its facility selector names the actual system, shows the dimensional screen and source links, and opens the corresponding atlas page. The integration-facility reference panel links offsite environmental verification to this atlas.

## Physical dimensions and notional context

The user explicitly authorized plausible surrounding equipment geometry when only a published test volume is available. Published volumes and bounding dimensions remain the metric references. The surrounding chamber housing, doors, supports, racks, speaker arrangements and ancillary services may be **notional**, and the model and page label them accordingly. These models are not operator CAD or surveyed as-built installation drawings.

The renderer takes a facility asset, never an article dimension. A selected 6.7 m table remains 6.7 m when the article changes from a small component to a 150 m deployable. The article can be shown beside equipment at true scale. Generic schematic comparison supports are also bounded.

Measurement roles remain distinct:

- Chamber interior, published vessel dimensions and room dimensions establish only those reported extents.
- A published working envelope is stored separately and drives a conservative article-bounds screen.
- A mounting tabletop is an interface; it is not an allowed spacecraft envelope.
- Door opening, payload limit, waveform-specific force ratings, temperature range and vacuum pressure retain separate units and sources.
- Notional housing dimensions never become usable-volume, doorway or payload limits.

For example, NASA Armstrong's 30.48 m diameter × 37.19 m vacuum area is separate from the 12.19 m diameter × 12.19 m cylindrical cryoshroud. ESA Phenix's 4.5 m diameter × 11.8 m vessel is separate from the 2.5 m wide × 3 m high × 4.2 m long thermal tent. Sources and alternate configurations are recorded with these entries.

## Fit assessment and defaults

`assessFacilityFit` requires exactly three finite positive article dimensions. It compares conservative axis-aligned bounds with published box or cylindrical envelopes, checking all axis permutations to identify an orientation-dependent result. It separately checks a published payload limit when article mass is known, and a published access opening when present. An axis-aligned failed screen is not a general proof that no detailed packing or handling solution exists.

Missing usable dimensions remain unassessed. Chamber shell dimensions do not silently substitute for missing thermal working space. Explicit user system selections are retained even if their screen fails.

The automatic default prefers a small documented envelope that accommodates the displayed bounds. For vibration, a separate presentation heuristic chooses a small published tabletop appropriate to the displayed footprint; the result remains **mounting-interface review required**. If no suitable comparison is available, a real fixed-size system is retained and the unresolved/exceeded screen is shown. No dimensions are synthesized from the article to produce a fit pass.

The thermal prediction retains its allocated article targets and boundary conditions. Selecting a facility illustrates and screens equipment; it does not silently change requirements or certify that a particular chamber can deliver the campaign profile.

## Evidence and locations

The U.S. catalog contains NASA Armstrong, Goddard, Johnson and JPL; Experior Oxnard; Dayton T. Brown Bohemia; and Lockheed Martin Littleton and Sunnyvale. The international catalog contains ESA ESTEC, RAL Space NSTF, IABG Ottobrunn, CSL Liège, MDA David Florida Laboratory, JAXA Tsukuba, ISRO ISITE and INPE LIT.

Current and historical evidence are distinguished in record notes. DFL's current MDA operation is sourced separately from its older explicit chamber-dimension source. Lockheed's dated 2024 testing-services inventory is identified as such. Operator contacts must establish current campaign access and scheduling.

Map points are approximate campus locators unless a more specific operator map location is documented. They are not surveyed equipment coordinates or arrival-gate instructions. The world map reuses the bundled NASA Blue Marble: Next Generation texture; the local map displays Esri World Imagery raster tiles with provider attribution and retains OpenStreetMap/address links. The map requests only the current viewport and uses normal browser caching.

## Publication checks

`npm run check:facilities` runs catalog/fit contracts, fixed-dimension geometry checks and the existing parts verification-stage checks. It is included in `check:publish` and the engineering-readiness GitHub workflow. Negative cases cover omitted dimensions and sources, invalid numerical values, missing envelopes, inconsistent articles, overstated shaker capacity and unexpectedly oversized geometry. Model checks cover actual metric extents, notional-context attribution, unchanged equipment across article sizes, camera bounds and disposal.

The existing full electrical, payload, thermal, convergence and engineering-readiness publication gate remains required.

## Implementation

- `dist/facility-data-us.js`, `dist/facility-data-international.js`: primary-source records.
- `dist/test-facilities.js`: indexing, validation, selection and dimensional screening.
- `dist/facility-geometry.js`: fixed metric equipment and annotated notional context.
- `dist/facility-viewer.js`: demand-rendered 3D interaction and resource lifecycle.
- `dist/facilities-ui.js`, `dist/test-facilities.css`: atlas, evidence and equipment selection.
- `dist/facility-map.js`: viewport-only, attributed 2D Esri imagery; pan, zoom, recenter and keyboard controls without a WebGL dependency.
- Parts UI/viewer, verification scenes, Reference navigation and workspace history integrate the same identities.

See `facilities-data-contract.md`, `facilities-us-research.md` and `facilities-international-research.md` for the schema and research details.

## Recorded validation result

The full `npm run check:publish -- --output /tmp/facilities-engineering-readiness.json` gate passed on 2026-11-08: 17 reference configurations, 3,051 part instances, 6,287 ready thermal plans, 848 full thermal predictions and 15,776 executable electrical checks. Existing predicted shortfalls and unverified evidence remain separately reported rather than converted into acceptance. The complete machine-readable report is retained in `facilities-readiness-20261108.json.gz`.

Facility checks passed: 51 data/fit/UI-value checks, 42 negative cases, 225 evidence references, 64 model builds covering all 32 dimensioned assets in both renderer modes, 516 verification-stage cases and 121 artifact cases. Additional parts viewer tests covered 33 stage lifecycles, selection persistence, true-scale solar wings, mass screening, thermal-node mapping, capture behavior and disposal.

Browser inspection verified country/operator filters, world-map campus selection, loaded Esri imagery with zoom and keyboard pan, rendering and cutaway controls, Phenix vessel/thermal-tent distinction, CSL notional housing labels, solar-wing oversize screening, the Parts → facility → Parts round trip and browser history. The cloud browser used the software-rendering fallback because WebGL was unavailable; GPU rendering was not visually inspected in that environment.
