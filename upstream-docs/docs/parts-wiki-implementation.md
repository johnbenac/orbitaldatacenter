# Parts Navigator learning collection

Implemented November 7, 2026 (America/New_York).

## Outcome

The Parts Navigator now combines its existing focused 3D viewer with a substantial, sourced learning article for every current catalog record. Articles cover purpose, operating principles, interfaces and engineering choices, makers or documented hardware examples, alternatives and tradeoffs, inspection prompts, terminology, related parts, and annotated further reading. Current design values remain supplied by the live catalog in a separate **In this design** section.

The collection is not a supplier selection or a claim that illustrative geometry constitutes a detailed flight design. Manufacturer examples and actual reference hardware have explicit relationships to the configured study. Concealed or unmodeled parts still have complete articles.

## Coverage measured by the integrated check

| Measure | Result |
| --- | ---: |
| Configurations | 17 |
| Part-page instances | 2,629 |
| Distinct record IDs | 187 |
| Editorial topics exercised | 172 |
| Registered source entries | 208 |
| Distinct source URLs, ignoring fragments | 176 |
| Minimum teaching-prose word count | 258 |
| Mean teaching-prose word count | 343 |
| Default starter collection teaching-prose words | 52,295 |

Word counts include introductions, teaching sections, supplier and alternative descriptions, and model-inspection prompts. They exclude glossary definitions, live configuration facts, reference annotations and headings. The count therefore understates the full visible article length. Configuration tests include six design references, ten launchers, and the alternate Aerozine-50/NTO propulsion package. The material authoring audit additionally covers silicon/multijunction cells and paint/OSR finishes.

Every tested part resolves to an article with substantive teaching sections, maker/reference examples, at least two alternatives, and at least two sources. Source IDs and article/citation targets resolve. Related-part links are restricted to parts present in the current catalog.

## Reading and navigation

- Read guide jumps from the part heading to the article.
- On this page links navigate the teaching sections, design data, makers, alternatives, related parts and sources.
- Numbered inline citations move keyboard focus and scroll to a highlighted source card.
- Source cards identify the publisher, document type, what to read, and a useful chapter or section where available.
- Search includes article prose, functions, manufacturer names, alternatives and terminology, as well as the existing part/WBS fields.
- Related links preserve the configured design and select the appropriate equipment family.
- Material-library and equipment-list links remain available.
- Articles are loaded on demand when the Parts Navigator opens. They create no additional canvases or 3D renderers.

## Evidence and architecture

Sources prioritize original NASA/ESA material, manufacturer documentation, standards, mission papers and payload guides. The authoring contract is in `parts-knowledge-authoring.md`; module-specific research records are in `parts-wiki-flight-research.md`, `parts-wiki-materials-research.md` and `parts-wiki-ground-research.md`. The launch source registry contains the reviewed provider guides and introductory NASA engineering references.

The article resolvers distinguish passive local heat transport, ordinary pumped loops, independently contained redundant loops and the analytical heat-lift option. They also distinguish the two modeled propellant packages, launcher families and real provider hardware from workbench-only cargo-handling concepts. The live quantities, equations, installed equipment totals and simulation behavior are not changed by article rendering.

The source review repaired three existing catalog problems:

1. The Apollo propulsion citation pointed to a seal-material report. It now points to NASA's relevant Apollo propulsion history, and the accompanying heritage statement matches that source.
2. The obsolete Sodern HYDRA PDF path was replaced with the current official HYDRA range page.
3. The obsolete Airbus Crisa PCDU path was replaced with the current official power-conditioning-and-distribution page.

The unavailable historic Starship Users Guide URL is omitted from the new article's supplemental links. The curated launch references provide the available manufacturer overview and identify workbench cargo geometry separately; historic geometry assumptions in the catalog were not silently recast as current supplier specifications.

## Verification

- `node parts-knowledge-checks.mjs`: complete coverage and content/schema checks for 2,629 instances; source registry consistency; valid section/citation targets; escaped content; search inclusion; immutable catalog and hardware data.
- `node parts-catalog-checks.mjs`: 16 design/launcher combinations, all MEL allocations, non-additive mass boundaries, exact scene selectors and six equipment-list lenses.
- Syntax validation for every changed application module.
- Browser preview: battery enclosure, battery parent assembly, ground power converter, spacecraft checkout power connection, New Glenn vehicle/fairing, and concealed cell coverglass.
- Browser interactions: Read guide, inline citation focus/scroll, maker search, related-part navigation across equipment families, and unavailable-geometry behavior.
- The cloud QA browser has WebGL disabled. Its existing software renderer displayed the part models; this task does not change detailed geometry or materials.

An independent review found that unavailable coverglass geometry could inherit a deployment animation. Playback and posing now require an available model, and the UI hides unavailable animation controls. The actual viewer was exercised with fresh/no-model, previously cached model, unmatched selection, normal deployment and resume cases.

## Static packaging

The existing site was close to its 256 MiB expanded deployment limit. This change preserves all active imagery and geometry while making space for the articles:

- 26 downloadable provenance JSON documents are packaged as one-file ZIPs. Exact original UTF-8 bytes were verified against the checksums in `parts-wiki-provenance-packaging.json`.
- The static export asset inventory is now `assets.json.zip`, read through the existing CRC-checking JSON-archive loader. Run `python build-asset-index.py` after adding or removing shipped files. The offline export includes the compressed index, so the exported site can export itself again.
- Formatting whitespace was removed from two material metadata JSON files; parsed values were checked for equality. The material-bank download still emits readable JSON.
- The unused former `vendor/orbital-limb.jpg` splash asset is retained in source under `docs/retired-assets/`; current splash and reference imagery are unchanged.
- The compressed export inventory was decoded through the same application loader, checked for duplicate paths, and every listed file was verified to exist, including all learning modules.

## Main implementation files

- `dist/part-knowledge-flight.js`, `dist/part-knowledge-materials.js`, `dist/part-knowledge-ground.js`, `dist/part-knowledge-launch.js`: authored content and source registries.
- `dist/parts-knowledge.js`: article resolution, citations, related-part filtering and searchable text.
- `dist/parts-learning.js`: safely escaped article rendering.
- `dist/parts-ui.js`, `dist/parts-ui.css`: lazy loading, search and reading navigation/layout.
- `dist/parts-catalog.js`: structured equipment-reference metadata inherited by component detail pages.
- `dist/part-viewer.js`: unavailable-model playback guards.
