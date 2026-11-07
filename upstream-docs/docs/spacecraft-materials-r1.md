# Spacecraft materials and texture implementation — r1

Revision: `odc-materials-2026-11-r1` · 7 November 2026 · PDR study scope

## Implemented result

The spacecraft rendering, master equipment list (MEL), downloadable review package and Reference material library now share one material identity. The library contains 24 material/finish representations, 96 original texture assets (color, normal, roughness and preview), and 29 primary-source evidence records. It covers all six current reference architectures and the retained legacy architecture.

The texture bank is approximately 4.1 MB as a downloadable ZIP. The browser assembles it on demand from the same static maps used for rendering, with visible preparation progress; a second copy of the images is not shipped inside a static ZIP. Maps have controlled illustrative physical repeat scales, use mipmaps and anisotropic filtering, and share decoded resources across spacecraft instances. The detailed repeating surfaces use 1024-pixel maps; quieter metal surfaces use smaller maps. Texture resolution alone is not the quality mechanism: correct material placement, normal/roughness response, consistent UV scale and suitable reflection lighting matter together.

## Visible structures and selective material detail

The MEL retains its additive hardware and consumable rows. A separate `surfaceDetails` hierarchy supplies selective children for visible materials and necessary concealed layers. Each child identifies its parent WBS, material, texture, visibility, evidence, source and mass-accounting boundary. It does not create a fictitious independent mass allocation.

| Assembly | Material detail covered |
| --- | --- |
| Primary structure and interface | Frame, longerons, tray supports, retained attachment, adapter/cradle |
| Enclosure | Face sheets, concealed honeycomb core, feedthrough seals and insulation |
| Blanket assembly | Amber aluminized-polyimide outer cover, white Beta-cloth cover, concealed reflective films |
| Solar array | Silicon or III–V cell face, coverglass, inactive flexible backing, composite support boom |
| Radiator | Selected glass OSR or diffuse white coating, aluminum face sheets, allocated core, contained passages |
| Thermal transport | Passive heat pipes or active-loop tubing; separate unresolved heat-lift material basis |
| Payload and services | Cold plates, electronic boards, tray chassis, storage/avionics/power housings, battery enclosures, copper conductors, harness covering |
| ADCS and communications | CMG housing, magnetic rod and winding, sensor/terminal baffle, optical supports/housing/aperture, optional RF surfaces |
| Propulsion | Titanium PMD-tank inference, allocated COPV bottle, feed lines, unresolved engine-bell alloy |

Bulk propellants and pressurant are identified by the configured chemistry in the parent MEL. Enclosed fluid visualization, LEDs, plumes and labels are classified as illustrative graphics rather than opaque physical surface textures.

## Evidence discipline

Four assignment states distinguish documented material, inferred material, PDR allocation and unresolved material. Generic material heritage is kept separate from a reference provider's selection.

* Redwire explicitly specifies silicon cells and aluminum radiator face sheets. These narrow material facts are documented. The paper offers AZ-93 as a coating example and alternatives including POCO foam or aluminum honeycomb for the core. A configured OSR surface is disclosed as a workbench adaptation; no existing thermal input is silently overwritten. The separate spreader alloy remains allocated.
* Gold-colored MLI is represented as polymer over reflective aluminum. It is not assigned bulk gold. The outer cover and concealed reflective films are distinct layers; layer count, protective treatments and seams remain preliminary.
* The cited Northrop PMD family supports an all-titanium tank inference. Its pressurant catalog offers both titanium and composite-overwrapped vessels; the model's COPV appearance is explicitly allocated.
* The S400 reference identifies the chamber/throat as platinum alloy. The expansion bell remains alloy-unresolved, with a neutral metallic appearance.
* White thermal coating and glass OSR have different textures and reflection responses. A supplier's OSR glass composition is not generalized to all reflectors.
* Existing ammonia-loop material allocations use aluminum passages and stainless headers. Copper-colored wetted lines were removed. Heat-lift material compatibility remains unresolved and does not inherit the ammonia correlation.

The full evidence findings and links are in [material-evidence-notes.md](material-evidence-notes.md) and the application's expandable material entries.

## Engineering boundaries

Material appearance does not alter mass, area, density, thermal conductivity, thermal optical coefficients, degradation, structural allowables or qualification status. The current radiator and blanket optical inputs are exposed beside the material record. White/amber blanket area weighting, coating application details, AO protection, charging, contamination, outgassing, joints and material compatibility remain verification work for the physical design.

Texture seams, repeat dimensions, cell/contact patterns and laminate appearance are illustrative allocations. They do not claim supplier drawings or measured optical response. Honeycomb appears only at exposed core edges, and photovoltaic coverglass is included in the composite cell appearance rather than adding an opaque duplicate layer.

## Interface and downloads

Reference → **Materials & finishes** provides searchable material cards, active-spacecraft filtering, source-linked assignment detail and three schematic layer illustrations. MEL → **Materials & finishes** provides the corresponding WBS view, evidence filtering and direct library links. Existing mass and other MEL lenses retain their information, with material summaries added.

Simple downloads include the current material register JSON, complete texture bank ZIP, individual maps, MEL material-details CSV and the full MEL JSON. The standalone material record carries vehicle/mission/analysis identity, reference revision and physical architecture identity. The PDR ZIP includes the material assignment CSV/JSON, material library record and primary-source CSV, with links from its main HTML report.

## Verification

* All six references: material IDs, sources and parent WBS references resolve; optional absent communications hardware has no spurious assignment; mission changes leave material assignments unchanged.
* Existing MEL mass/power/station checks pass; all finish details remain non-additive.
* The bounded PDR ZIP roundtrip passes: 176 files, all 16 domains and their graphics, 170 engineering checks, exact scenario restoration, and all 13 report links resolved.
* Family geometry and launch-rendering checks pass. Source modules pass syntax checks.
* Renderer checks cover 24 materials / 96 assets and 19 reference, package and legacy builds, including repeated rebuilds, deployment texture pitch, physical-mesh coverage and exact restoration after overlays.
* A software-renderer regression verifies ordinary image maps, repeat sampling, image replacement, missing-image fallback and separation between aluminum and white paint under studio lighting. Existing launch-rendering checks continue to pass.
* Browser review verifies the library, material search, expandable evidence, MEL material hierarchy and spacecraft view. The review browser uses the Canvas fallback; the full WebGL normal-map and reflection response was checked in code but could not be visually inspected in that environment.
* Register and ZIP contents are validated locally and in the PDR export roundtrip. The cloud browser's file-capture mechanism failed during download review, so an end-to-end browser file save is not asserted.
* Five pre-existing launch surface-data maps use lossless WebP instead of PNG, with exact decoded-pixel comparison. Six launch-region elevation grids use ZIP compression, preserving their original JSON bytes and every numeric value. Together with on-demand texture-bank assembly, these changes keep the deployment below its 256 MiB expanded limit, including archive headers, without lowering texture resolution.
* The on-demand texture-bank roundtrip verifies 99 files, exact bytes for all 96 maps, 24 materials, 29 evidence records, progress reporting and a clear failure when an asset is missing. The deployed static payload is approximately 253.42 MiB before archive headers.

## Maintenance

The canonical data is in `dist/spacecraft-materials.js`; evidence is in `dist/material-evidence.js`. Material roles connect the craft builders to the MEL. New visible hardware should acquire a semantic role and a material assignment with an explicit WBS parent before a texture is applied.

Regenerate assets with `python3 scripts/generate-spacecraft-materials.py`, then run `node scripts/package-material-library.mjs` to update compact texture metadata, the bank catalog and the reproducible ZIP under `artifacts/` (outside the deployed static directory). Run `node materials-mel-checks.mjs`, `node spacecraft-material-checks.mjs`, `node material-download-checks.mjs` and the relevant geometry/export checks when those interfaces change.

When rebuilding launch elevation assets, run `python3 scripts/package-launch-elevation.py`; its integrity register records the original bytes and grid dimensions. The launch geography checks use the same lazy ZIP reader as the browser.
