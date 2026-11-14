# U.S. test-facility research notes

Reviewed **8 November 2026**. The companion data file exports **8 campuses, 28 named systems/capabilities and 18 measured assets**: four NASA campuses and four commercial campuses. Evidence comes from NASA or the facility operator. These are public specifications, not confirmation of booking availability or a test configuration accepted by the operator.

## Modeling and provenance rules

- Preserve the published dimensional meaning. Only explicitly documented internal test volumes or working spaces receive an article-fit `envelope`. A vessel height, room size, access door or shaker mounting surface does not establish an article envelope.
- A source that simply calls a number a chamber or room size receives `published-chamber-dimensions` or `published-room-dimensions`. JPL combines a stated test diameter with a vessel height and receives `published-vessel-dimensions`. These honest additional roles avoid labeling ambiguous measurements as clear interior space.
- Walls, supports, thicknesses and arrangement are schematic. Sunnyvale's TVAC and DTB's drive-in chamber use wireframe extents, avoiding an invented physical enclosure. Sunnyvale's source does not establish the cross-section shape. The four assets labeled working-envelope also render as volume outlines in the geometry builder, not as measured vessels.
- Unknown geometry is `null`. Shaker force is a machine rating, not a maximum payload. No shaker model has an article envelope or an invented equipment height.
- Conversion constants: feet × 0.3048; inches × 0.0254; lbf × 0.004448221615 = kN; Torr × 133.322 = Pa; °C + 273.15 = K. Preserve published SI dimensions where the source supplies both systems; do not replace rounded SI measurements with more precise-looking imperial conversions.
- Campus coordinates are explicitly approximate address-based locators, not surveyed equipment positions. Experior's coordinates are the destination coordinates in the operator's own Google Maps link. Addresses remain separate from coordinates so map directions use the official address.

## 1. NASA Armstrong Test Facility — Space Environments Complex

**6100 Columbus Avenue, Sandusky, Ohio 44870.** NASA Glenn operates the government campus formerly named Plum Brook Station.

[Current SEC capabilities](https://www.nasa.gov/centers-and-facilities/glenn/space-environments-complex/) — published 29 March 2025. Evidence: “30.48-m- (100-ft-) diameter by 37.19-m- (122-ft-) tall test area”. The vacuum test area is **30.48 m diameter × 37.19 m high**. The separately published cylindrical cryoshroud is **12.19 m diameter × 12.19 m high**. The reconfigurable shroud option is recorded as a specification, not silently substituted as the normal envelope. The published acoustic room is **11.4 m W × 14.5 m D × 17.4 m H**; MVF has a **6.7 m table**, **34,000 kg** payload and **7.2 m** maximum center-of-gravity height. EMI/EMC is an additional use of the vacuum facility, not a second independently sized chamber. The same page explicitly describes reimbursable access for government, universities and private-sector users.

[Official address](https://www.nasa.gov/centers-and-facilities/glenn/map-and-directions/) — published 19 March 2015. Evidence: “6100 Columbus Avenue”. Address is under the historical Plum Brook name; the current SEC page establishes the renamed campus. Locator: approximately **41.345, −82.654**.

## 2. NASA Goddard — Environmental Test and Integration Facilities

**8800 Greenbelt Road, Greenbelt, Maryland 20771.** Main-gate/campus address, not a receiving bay.

[Space Environment Simulator](https://etd.gsfc.nasa.gov/capabilities/facilities-listing/space-environment-simulator/) — updated 17 February 2026. Evidence: “internal test volume of 27’ in diameter and 40’ in height”. Model and published envelope: **8.2296 m diameter × 12.192 m high**. Optional helium shrouds are configuration-dependent and are not assumed to cover the full main volume.

[Acoustic Test Facility](https://etd.gsfc.nasa.gov/capabilities/facilities-listing/acoustic-test-facility/) — evidence: “internal dimensions of 33 feet in length, 27 feet in width, and 42 feet in height”. Model: **8.2296 m W × 10.0584 m D × 12.8016 m H**. The **15 ft × 30 ft** access opening is a separate door constraint. Maximum OASPL: **150 dB**. The page documents testing for other NASA centers and private industry; this does not imply automatic rental.

[Additional environmental/vibration capability](https://etd.gsfc.nasa.gov/capabilities/capabilities-listing/environmental-testing-thermal-vacuum-chamber/) documents three-axis vibration testing. No complete public shaker dimensions are asserted; geometry remains null.

[Official main-gate address](https://www.nasa.gov/goddard/mediaresources/) supports the Greenbelt address. Locator: approximately **38.992, −76.853**.

## 3. NASA Johnson — Space Environment Simulation Laboratory

**2101 NASA Parkway, Houston, Texas 77058.** Campus address; test-entry instructions require confirmation.

[Current Thermal Vacuum facility page](https://www.nasa.gov/reference/jsc-thermal-vacuum/) — evidence: “55 feet diameter by 80 feet tall shroud volume”. Chamber A's current published shroud envelope is **16.764 m diameter × 24.384 m high**, at **35 K** capability. Chamber B's published SI internal dimensions are **7.6 m diameter × 7.9 m high**. Radiant-heat and human-rated vibration capabilities are included with unknown geometry. NASA's customer-facing capability/contact invitation is described without assuming universal rental access.

**Version caveat:** archival Chamber A material distinguishes a 65 ft vessel, a different nitrogen-shroud height and a smaller helium zone. Do not combine those archival measurements with the current page or use the vessel diameter as the current working envelope. This record follows the current 55 ft × 80 ft shroud description.

[Official JSC campus address](https://www.nasa.gov/receiving-inspection-and-test-facility/) is provided on the Receiving, Inspection and Test Facility contact page. It is used solely for the campus address, not to claim SESL occupies that laboratory. Locator: approximately **29.552, −95.093**.

## 4. NASA / Caltech JPL — Environmental Test Laboratory

**4800 Oak Grove Drive, La Cañada Flintridge, California 91011.** This is the official street-map address; JPL's Pasadena mailing address differs.

[25-Foot Space Simulator](https://www.nasa.gov/setmo/facilities/25-foot-space-simulator/) — updated 27 September 2023. Evidence: “a test diameter of 25 feet and a height of 85 feet”. Model: **7.62 m diameter × 25.908 m vessel height**. The source does not establish an 85 ft usable thermal envelope; none is assigned. The **15 ft × 25 ft** door is separate.

[JPL's Griffin lander testing account](https://www.jpl.nasa.gov/news/nasa-jpl-testing-readies-voyager-technologies-lander-for-moon-mission/) — 13 October 2026. Documents thermal-vacuum, vibration, acoustic and spin/mass-property testing for a commercial mission. Those additional capabilities have null geometry. **153 dB** is the reported mission-test level, not a published facility maximum; the data labels it accordingly. The commercial example establishes documented external-project use, not open booking access.

[Official directions and maps](https://www.jpl.nasa.gov/jpl-and-the-community/directions-and-maps/) supports the street address. Locator: approximately **34.201, −118.172**.

## 5. Experior Laboratories — Oxnard

**1635 Ives Avenue, Oxnard, California 93033.** Commercial environmental-testing campus.

[Thermal vacuum specifications](https://experiorlabs.com/thermal-vacuum-testing/) — evidence: “Chamber #3 Inner Working Volume: 23” x 23″ x 23””. Chamber #3's explicit working cube is **0.5842 m per side**, modeled with a matching envelope. Chambers #1 and #2 publish only width and depth; the records retain those stated sizes as text and **do not infer a cylindrical diameter or missing height**. General advertised TVAC pressure/temperature ranges are not promoted to a Chamber #3 configuration guarantee.

[UD T4000 and TEAM T-Film slip table](https://experiorlabs.com/ud-t4000-and-team-t-film-bearing-slip-table/) provides a **72 in × 72 in** table and **40,000 lbf** sine/random force. Model: **1.8288 m square** table surface, with no article envelope.

[Space-testing service](https://experiorlabs.com/space-testing/) supports the commercial enquiry/access description. [Operator contact page](https://experiorlabs.com/contact/) gives the address and links to Google Maps. The destination coordinates in that operator-linked map are **34.1798862, −119.1628673**; these are not the map URL's viewport-center coordinates.

## 6. Dayton T. Brown — Bohemia

**1175 Church Street, Bohemia, New York 11716.** Use the current operator location page; confirm the actual receiving entrance.

[Temperature and environmental-stress facility page](https://www.dtb.com/services/testing-and-engineering/environmental-testing-services/temperature-and-environmental-stress-testing/) — evidence: “25 ft. drive-in chamber (25 ft. x 15 ft. x 12 ft.)”. Published dimensions convert to **7.62 × 4.572 × 3.6576 m**. The visualization interprets the ordered triple as length/depth, width, height and explicitly records this interpretation. No clear working envelope or door opening is inferred.

[Vibration-testing datasheet](https://www.dtb.com/wp-content/uploads/2025/03/DTB-Vibration-Testing.pdf) — direct two-page PDF verified, hosted in March 2025 directory. Evidence: “Integrated 60 x 60 inch (1524 x 1524 mm) slip table.” The T5500-3's surface is **1.524 m square** and sine/random rating **55,000 lbf**. The matching head expander is documented but not counted as a separate shaker.

[Specialized environmental conditions](https://www.dtb.com/services/testing-and-engineering/environmental-testing-services/specialized-environmental-conditions/) adds thermal-vacuum capability without a fabricated chamber size. [Current facilities/location page](https://www.dtb.com/our-company/facilities-locations/) gives **1175 Church Street**; the vibration PDF footer says **1195 Church Street**. The difference is disclosed in the data. Locator **40.77, −73.10** is deliberately a coarse campus-vicinity point, not a delivery gate.

## 7–8. Lockheed Martin — Littleton and Sunnyvale

[Environmental Testing Services: Test Systems and Locations](https://www.lockheedmartin.com/content/dam/lockheed-martin/space/documents/space/productization/Testing_as_a_Service_web_Final.pdf) — **©2024, document 24-12372**. Short table evidence: “29’D x 65’H”; “18’H x 18’W x 30’L”. The official search index supplied the PDF's tables; **direct PDF retrieval returned HTTP 403**. Values are therefore traceable to the indexed official document, with that retrieval limitation explicitly recorded. The older 2023 datasheet was not mixed into the dimensions or limits. Clear article envelopes are not specified in the 2024 tables.

| Campus | Published system | Metre reconstruction | Constraint / caveat |
| --- | --- | --- | --- |
| Littleton | 29 ft diameter × 65 ft TVAC | Ø8.8392 × 19.812 high | Published chamber dimensions; interior/exterior unspecified |
| Littleton | 31 W × 36 D × 68 H ft acoustic | 9.4488 W × 10.9728 D × 20.7264 H | Published room dimensions; 151 dB OASPL |
| Littleton | V994, 72 in diameter head expander | Ø1.8288 mounting surface | 65,000 lbf sine/random; no article envelope |
| Sunnyvale | 18 H × 18 W × 30 L ft TVAC | 5.4864 H × 5.4864 W × 9.144 D | Bounding box only; cross-section and clear volume unspecified |
| Sunnyvale | 44 W × 50 D × 86 H ft acoustic | 13.4112 W × 15.24 D × 26.2128 H | Published room dimensions; 156.5 dB OASPL |
| Sunnyvale | 45K, 84 in diameter head expander | Ø2.1336 mounting surface | 45,000 lbf sine; 36,000 lbf random |

[Current Testing as a Service description](https://www.lockheedmartin.com/en-us/capabilities/space/deep-space-exploration.html) supports the commercial service description. The dated inventory is not a verification that a specific system is available today; customers must confirm configuration and current location.

**Littleton:** [operator's Waterton event directions](https://news.lockheedmartin.com/2013-07-10-Media-Invited-To-See-NASAs-Maven-Mars-Spacecraft-At-Lockheed-Martin), 10 July 2013, give **12257 S. Wadsworth Boulevard, Littleton, Colorado**. This is a historical operator-published campus address, not a current receiving instruction. Approximate Waterton locator: **39.50, −105.10**.

**Sunnyvale:** [operator visitor map](https://www.lockheedmartin.com/content/dam/lockheed-martin/eo/documents/code-quest/2018/SSC_SVLvisitors.pdf), hosted with 2018 material, labels **1111 Lockheed Martin Way, Sunnyvale, California 94089**. The legacy map is disclosed; confirm the current entrance and system location. Approximate campus locator: **37.417, −122.035**.

## Validation

The U.S. records pass the shared `validateTestFacilities(usFacilities)` checks: eight facilities, 28 capabilities, 18 modeled assets, no missing/invalid dimensions or broken local source references. Every campus has at least one measured asset. Ten additional capabilities intentionally have no model. Review date is a source-review date, not an equipment inspection or booking check.
