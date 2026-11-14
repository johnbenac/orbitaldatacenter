# Flight material and component learning articles

Reviewed: 2026-11-07 (site authoring date)

## Delivered scope

`dist/part-knowledge-materials.js` provides independent learning articles for every flight record whose mass accounting is `included-in-parent`. The resolver uses stable WBS identifiers, the selected material and the active thermal architecture. It does not depend on a mesh existing or on a rendering role surviving catalog fallback.

The module contains 57 annotated primary-source records. Across the supported configurations it produces 56 article variants covering 48 stable child IDs. Each article contains a substantive introduction; purpose, operation and engineering sections with paragraph source references; actual manufacturer or research examples; alternatives with tradeoffs; an accurate inspection note; glossary entries; and related part IDs. The live configuration quantities, evidence status and mass accounting remain the responsibility of the catalog/UI.

Articles contain 341–408 words excluding source annotations and live configuration facts. This range includes the article's supplier/reference cards, alternatives, inspection and glossary. Sources are curated reading recommendations and evidence for the specific examples; the explanatory engineering prose is original, not copied from brochures.

## Configuration-sensitive coverage

| Family | Editorial behavior |
| --- | --- |
| Payload thermal contact | Distinguishes passive local spreading, pumped coolant and heat-lift cold-side interfaces. |
| Solar active face | Distinguishes silicon and multijunction cell technology using the selected material. |
| Radiator finish | Explains white thermal coating or glass OSR construction using the selected material. |
| Radiator passages | Separates pumped-ammonia assumptions from unresolved heat-lift hot-side transport. |
| Thermal transport child 03.02.01 | Resolves to local heat pipes/straps, coolant hardware, or a heat-pump housing as appropriate. |
| Thermal transport child 03.02.02 | Dedicated heat-lift transport-lines article. |
| Shared enclosure material | Battery, storage, network fabric, PCDU and flight avionics each have distinct functional content. |
| Shared contact material | S-band contacts and Ka-band feed finish have separate context. |
| Shared baffle material | Star-tracker baffle and communications-terminal baffle explain different optical tasks. |
| Shared tank material | Fuel and oxidizer vessel shells have independent purpose and compatibility context. |
| Launch interface | Distinguishes retained spacecraft fittings from the lower adapter/interface allocation, without attributing custom cargo assumptions to launch providers. |
| Concealed or unavailable details | Coverglass, MLI layers, bus conductors, sensor baffles, shielding and other hidden allocations retain complete articles. |

## Evidence decisions

- Battery packaging is explained as mechanical retention, electrical interfaces and a thermal path, rather than the old quantity-only description. Saft cell cycling, EaglePicher battery packaging and NASA's Orion battery study are explicitly different reference boundaries. None is represented as the selected enclosure manufacturer.
- Electronics details and PCB textures do not reproduce a commercial processor board. NVIDIA is a terrestrial computation reference; TTM is a manufacturing example; Moog and Beyond Gravity provide spacecraft packaging comparisons.
- ACT conduction-cooled chassis and Curtiss-Wright storage hardware are useful packaging examples, not blanket claims of flight qualification.
- Copper in a dry electrical conductor or copper/water heat-pipe example is not carried over into ammonia-wetted hardware. Heat-lift articles do not inherit ammonia compatibility.
- Solar coverglass is integrated into a cell assembly; it is not described as an extra opaque panel. Cell imagery does not establish a specific supplier, cell dimensions or qualification.
- Amber MLI is polymer and reflective aluminum, not gold metal. White Beta cloth is an outer-cover class, not a complete blanket or an asserted debris shield.
- Anodizing is a finish on a substrate. Visible RGB color and roughness do not determine thermal emittance, solar absorptance, conductivity or structural allowables.
- Honeycomb belongs beneath structural skins. Radiator cores and enclosure cores have separate articles despite sharing a material class.
- Optical aperture glass and coating remain unresolved. The Edmund Optics stock window is explicitly a laboratory datasheet reading example; its NIR-I band is not presented as a selected laser-communications optic.
- The S400 reference identifies chamber/throat material. It is not extended to the entire nozzle expansion bell.
- A feedthrough can preserve electrical isolation or a local sealed boundary without implying that the entire spacecraft core is pressurized.
- Juno's titanium vault is an architecture analogy for a different radiation environment. LEO shielding efficacy is not claimed. The article links NASA radiation-analysis resources and distinguishes shielding from device-level response.
- Real supplier examples are labeled by relevance and do not imply procurement, compatibility, heritage or qualification of the workbench geometry.

## Source verification and link repairs

Official manufacturer pages, agency engineering handbooks, NASA-hosted technical reports and mission documents were searched and opened during authoring. Sources include the NASA Small Spacecraft State of the Art chapters, NASA technical reports on heat pipes/MLI/anodizing/batteries, the ISS thermal-system overview, NASA radiation-analysis resources, the Juno mission reference, and current manufacturer documentation.

Two older references already present in the project had broken or unreliable paths:

| Older reference | Verified replacement | Handling |
| --- | --- | --- |
| Sodern `wp-content/uploads/2025/04/HYDRA_BASELINE.pdf` | https://sodern.com/en/ranges/hydra | Old URL returned 404. The current product landing page is used; no unverified PDF path is fabricated. |
| Airbus Crisa page using `www.crisa.airbus.com/en/airbus-crisas-solutions/power-electronics/power-management-and-distribution-pcdus` | https://www.airbus.com/en/products-services/space/equipment/power/power-conditioning-and-distribution-units | Old path timed out and returned 404 on open. Airbus's current product page exposes EVO, MEGA and other power-unit references. |

Those findings were sent to the parent agent, which handles existing catalog source repairs. This module uses the current paths. The full URL inventory, document titles, organizations, kinds and reading annotations are exported in `materialKnowledgeSources` rather than duplicated here.

## Validation

- `node --check dist/part-knowledge-materials.js` passed.
- Coverage used every reference design and every launch vehicle plus explicit silicon/paint and multijunction/OSR variants: 18 configurations.
- All four thermal kinds were exercised: `passive-local`, `pumped`, `redundant-pumped`, `heat-lift`.
- 844 of 844 flight-child instances resolved; 48 unique stable child IDs were covered.
- All 113 encountered unavailable/concealed instances resolved independently of geometry.
- 56 unique article variants had 341–408 words and 3–6 source entries each.
- All paragraph source IDs were registered and present in their article's reading list. No missing articles or broken internal source references were found.
- Article content is plain text. Editorial section IDs use the authoring contract's nonreserved namespace.

The parent agent owns combined renderer checks, browser QA and publication. This module changes learning content only, not geometry, material assignments, quantities, mass, physics, camera behavior or rendering settings.
