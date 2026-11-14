# International test-facility research

Reviewed 8 November 2026. Data file: `dist/facility-data-international.js`.

## Scope and evidence standard

Eight campuses in eight countries, with 33 named systems/capabilities and 14 dimensional reconstructions. Sources are facility operators, universities, space agencies or their official publications. Source IDs are local to each campus. Each source record includes an evidence note of at most 25 words. Measurements remain fixed when an article changes size.

Published vessel dimensions, room interiors, usable working space and mounting surfaces have separate meanings. Only explicitly described usable space or test-article dimensions populate `envelope`. A shaker table provides a mounting interface; its area does not determine specimen height, mass, centre of gravity or allowable motion. Unknown dimensions remain `geometry: null`.

Coordinates are approximate campus or area locators unless an official coordinate is cited. They are not surveyed equipment locations, building boundaries or access instructions. CSL is the exception: its access point comes directly from the university campus directory. The ISITE pin is deliberately described as an approximate Karthik Nagar / Marathahalli area locator, because only its postal address was verified. A map should preserve these precision labels and offer an address-based map link.

## Campus evidence and modeling decisions

| Campus | Dimensioned assets | Measurement boundary and useful source |
| --- | --- | --- |
| ESA ESTEC, Noordwijk | Phenix, LSS, LEAF, HYDRA | [Phenix](https://www.esa.int/Enabling_Support/Space_Engineering_Technology/Test_centre/Phenix_Thermal_Vacuum_Chamber) distinguishes a 4.5 m diameter × 11.8 m vessel from the 2.5 W × 3 H × 4.2 L m thermal tent. [HYDRA](https://www.esa.int/Enabling_Support/Space_Engineering_Technology/Hydra_multi-axis_vibration_test_facility2) has an octagonal 5.5 × 5.5 m plate; the square rendering represents its extents only. |
| RAL Space NSTF, Harwell | Large Space Test Chamber, EMC room, DFAN setup | [Operator specification](https://www.ralspace.stfc.ac.uk/facilities/large-scale-test-facilities) explicitly gives 7 m diameter × 12 m usable thermal space. The EMC room is 18 × 18 × 14 m. DFAN's 4 m diameter × 5.5 m default item size is a reconfigurable acoustic setup, not a cylindrical room. |
| IABG, Ottobrunn | CCO working volume; bench surface specifications only | [CCO specification](https://www.iabg.de/en/industries/space/competence-centre-optics) gives 5 m usable diameter × 14 m length; optical fixtures consume part of this space. One bench segment has 2.6 × 6.8 m usable surface. Its 6000 kg load includes article and equipment. |
| CSL, Liège | FOCAL6.5 optical setup volume | [2025 CSL facility sheet hosted by ESA](https://exchange.esa.int/download/TE_Testing/TE_TESTING_2025-05-28_TE-facility-Focal6.5_CSL.pdf) defines a 4 W × 3.7 H × 4 L m allowed optical setup volume. This box is the setup envelope; any surrounding vessel is explicitly notional. |
| David Florida Laboratory, Ottawa | Largest thermal-vacuum vessel | [CSA evaluation, printed p. 24](https://publications.gc.ca/collections/collection_2017/asc-csa/ST99-34-2014-eng.pdf) explicitly gives internal diameter 6.7 m and length 10.7 m. Its appendix rounds these to 7 × 10 m; the explicit internal values take precedence. Geometry is historical published evidence, not a current configuration guarantee. |
| JAXA Tsukuba | 13 m Space Chamber and acoustic chamber | [Space chamber specification](https://shiken.jaxa.jp/en/facility/spaceChamber13m.html) gives internal Ø13 × 16 m and calls the vessel “side laid hammer-like.” A cylinder is a simplified main-volume reference. [Acoustic specification](https://shiken.jaxa.jp/en/facility/acousticTestFacility1600.html) gives 10.5 W × 17.1 H × 9 D m and 151 dB maximum overall empty-field level. |
| ISRO ISITE, Bengaluru | CATVAC thermal-vacuum vessel | [ISRO 2025 procurement sheet](https://eproc.isro.gov.in/common/viewDocument?id=ff80818199db9eae019a105363e85a37&indentId=IS2025001479) describes an existing horizontal vessel, inner Ø6.5 × 10 m, with movable torispherical end dishes. Its mounting fixture and thermal clearances are not a published usable envelope. |
| INPE LIT, São José dos Campos | CVT 6×8 m chamber extent | [INPE 2009 report](https://www.inpe.br/noticias/noticia.php?Cod_Noticia=1920) gives internal extents 6 W × 7.5 H × 8 D m. The box represents these dimensions only, not exact vessel contour or volume. [Current INPE notice](https://www.gov.br/inpe/pt-br/assuntos/anuncio-de-oportunidades/abertos/processo-de-selecao-de-bolsa-pmm-038) identifies ongoing CVT 6×8 operations for Amazônia-1B. |

## Current status and access

- **David Florida Laboratory is operational under MDA Space.** The [CSA's current description](https://www.asc-csa.gc.ca/eng/laboratories-and-warehouse/david-florida/about.asp) records transfer under a temporary occupancy licence in June 2025. [MDA's operator page](https://mda.space/launchpad-mda-space-david-florida-laboratory) describes the facility as back in business and open to all. The prior closure announcement must not be presented as its current state. The data classifies this as government property with commercial operation (`public-private`).
- RAL explicitly offers commercial access to UK and international organisations. CSL explicitly offers external customer testing. ETS and IABG advertise commercial test services. JAXA publishes a shared-use enquiry programme. These are access policies, not live availability calendars.
- ISRO and INPE facility descriptions establish capabilities and activity; no booking availability or guaranteed eligibility is inferred.
- ISITE's postal campus in Marathahalli is separate from URSC's headquarters address on Old Airport Road. The record uses the [ISRO ISITE venue notice](https://www.isro.gov.in/media_isro/pdf/recruitmentNotice/2023_Jan/ElectronicMechanicHSFC6_3_22.pdf).

## Units and qualifiers

Metres, kilograms, newtons expressed in kilonewtons, kelvin and pascals are used in machine-readable fields. RAL's pressure ceiling of 10⁻⁵ mbar converts to 0.001 Pa. JAXA's pressure already uses pascals. Celsius temperatures convert by adding 273.15; values described as “below” or “at or below” remain qualified in the accompanying specification.

IABG and JAXA force designations whose waveform basis is unspecified are text specifications, not invented sine/random limits. ISRO's “29 Ton” vibration designation is not interpreted as a 29,000 kg specimen payload. No shaker height or mounting area is inferred from photographs.

## Deliberate omissions

Airbus Toulouse has a current official multi-capability service page, but the readily found dimensioned SIMMER/SIMLES publications are decades old and did not provide a sufficiently clean current asset/address match within this pass. It was omitted in favour of eight stronger records. No planned facility is labelled operational. No claimed room volume is derived by multiplying nominal bounding dimensions where the original vessel shape is more complex.

## Renderer integration audit

The optical-bench record has `geometry: null`: the operator supplies 2.6 × 6.8 m usable surface, but no bench height. The surface specification and load remain sourced; no numeric height is invented to satisfy the catalog validator.

The user subsequently authorized plausible surrounding equipment when it is explicitly marked as notional. Published dimensions and fit envelopes remain unchanged. Every `working-envelope` geometry therefore retains a fixed comparison volume, with any outer vessel, supports, internal fixture or instrumentation identified separately as notional context. That context supplies no new capacity rating or article-fit constraint.

For RAL DFAN, the published cylinder is an article/setup envelope; any surrounding loudspeaker array and its dimensions are notional. It is not a cylindrical acoustic chamber. For CSL FOCAL6.5, the published box is the allowed optical setup volume; a surrounding vacuum vessel or optical bench is notional. RAL LSTC and IABG CCO usable dimensions likewise do not establish external vessel dimensions.

INPE CVT additionally sets `geometry.representation: wireframe-volume` to identify its measured internal extents as a comparison reference. Any surrounding vessel contour is notional; no usable article envelope or exact pressure-vessel shape is inferred.

## Catalog regression check

Run `node facility-data-checks.mjs` from the repository root. This pure-data harness validates provenance and required metrics, known positive/negative dimensional screens, payload limits, explicit orientation changes, unknown inputs, omitted/corrupt source and dimension fields, and the invariant that article inputs never resize the catalog. Rendering checks belong to the separate geometry harness.

## World-map attribution audit

The atlas uses `dist/vendor/earth/day-1k.jpg`. Its SHA-256 matches the archived `dist/vendor/earth/manifest.json.zip` entry: `9d1ec054b6802ce313e70cb9942b7ab929d3ad4f1c1c2ff838697442d56849b6`. The image is the NASA Blue Marble: Next Generation September 2004 surface composite, reduced to 1024 × 512 pixels. The exact day-source credit is **NASA Earth Observatory / NASA Goddard Space Flight Center; Blue Marble data courtesy of Reto Stöckli**. The day source and NASA media-usage record are already documented in `dist/vendor/earth/README.md`; Solar System Scope credits elsewhere in the repository concern different assets.
