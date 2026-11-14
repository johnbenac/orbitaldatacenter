# Ground equipment and launch-site parts: research and coverage

Reviewed: 2026-11-07. Implementation: dist/part-knowledge-ground.js.

## Delivered scope

The module supplies original educational articles for every ground and site record emitted by the current catalog across all ten launch-fleet choices and six design-reference configurations. It contains 38 ground-equipment topics and 28 selected site/service topics, plus an unrecognized-medium fallback. Repeated core, booster and upper-stage connections share the appropriate physical topic while retaining the catalog’s actual endpoints, release group and evidence status.

The audit resolved 1022 record instances, representing 85 distinct IDs and 66 selected editorial topics. There are 59 curated primary-source entries. Each selected article has at least two source references and two meaningful alternatives. The renderer’s prose count is 267–350 words per topic, excluding glossary terms, supplier names and alternative headings; the full visible article is approximately 308–387 words.

Each article includes purpose, operation, interface/design considerations, supplier or institutional examples, alternatives, model-inspection guidance, a short glossary and related part links. The main renderer supplies live design quantities and evidence separately.

## Evidence and architecture decisions

- NASA/ESA facilities, standards, technical papers, launch-provider manuals and actual manufacturer literature are the research base. Brochure language is not copied and product performance numbers are not assigned to schematic models. Supplier examples are distinguished from procurement selections.
- NASA-STD-5005 and KSC-STD-E-0022 are engineering references with their own applicability. They are not represented as universal requirements for every commercial or international site. The latter landing page was verified as Revision A dated 2026-09-23.
- The selected spacecraft thermal architecture changes the ground thermal explanation. Passive-local flight hardware is not described as having a flight coolant fill, pump or shared ground-fluid inventory. The ground pump, reservoir and exchanger remain separate external conditioning equipment.
- The receiving support is launcher-side: horizontal upper-stage cradle, Starship transport support or vertical launch interface according to the selected layout. It is not universally described as a spacecraft stand.
- The Starship cargo loading bridge is explicitly a workbench concept. It has no provider-confirmed supplier, mechanism, load rating or validated loading method. The obsolete Starship user-guide URL reported as 404 was not added to this source set.
- NASA LC-39B, SLS and Orion examples teach infrastructure and interface concepts. Their towers, tank counts, dimensions and release mechanisms are not projected onto every launch site. Site records retain their own documented, inferred or unresolved evidence states.
- Fluids are distinguished by actual medium. Methane/LNG labeling does not imply a verified rocket-fuel composition; generic kerosene does not prove RP-1. Unknown-fuel and unknown-oxidizer lines retain an explicit open definition.
- Fluid-service prose is conceptual, not a propellant-handling procedure. No pressure limits, valve sequence, connector compatibility, operational timings or fabrication instructions are invented.
- Conditioned payload air, nitrogen support gas, fluid coolant, electrical power, data and bonding each receive a separate explanation. A service-group symbol is not a statement that all circuits share one physical cabinet or fluid.
- EO-1 is an X-band hat-coupler precedent. It is cited to distinguish local functional coupling from antenna-pattern measurements, not to identify an S-band product. The GSS9000 source is explicitly labeled a historical 2014 simulator datasheet.
- RF parts link to the actual 05.xx communications allocations; attitude devices remain 04.xx. Helium site supply links to the flight helium bottle and pressurant inventory rather than the oxidizer tank. Umbilical groups link to their actual child connections in the active catalog.
- Source pages were verified using official-domain web search and direct retrieval. A product catalog or capability page supports the described example, not an assertion that the modeled hardware is qualified or compatible. Payload guides remain revision-specific starting references for mission interfaces.

## Verification

- Node syntax validation passes.
- Coverage audit spans all launchers and reference designs below, including unavailable geometry and future/unknown site interfaces.
- No missing article, unresolved registry source ID, invalid source URL scheme, short article, or missing alternative was found.
- Every call clones the selected article before adding architecture context and related links, so one design does not modify another design’s article.
- UI, catalog, publication and broader browser verification are handled by the parent task. This module changes no simulation, hardware sizing, geometry or operational behavior.

| Configuration | Ground/site record instances |
| --- | ---: |
| terran | 62 |
| terranX | 62 |
| glenn | 63 |
| glenn9 | 63 |
| starship | 63 |
| falconHeavy | 70 |
| vulcan6 | 64 |
| ariane64 | 65 |
| longMarch5B | 72 |
| longMarch9 | 60 |
| redwire-8kw | 63 |
| starcloud-3 | 63 |
| starmind-ai1 | 63 |
| orbital-1-202609 | 63 |
| orbital-1-202606 | 63 |
| star-catcher-self-powered | 63 |

## Editorial coverage

The count below uses the renderer’s prose definition. Related IDs are filtered by the active catalog in the shared renderer.

| Topic | Category | Minimum prose words | Sources | Record IDs |
| --- | --- | ---: | ---: | --- |
| ground-facility | ground | 298 | 3 | ground:facility |
| ground-checkout | ground | 293 | 2 | ground:checkout |
| ground-compute | ground | 323 | 3 | ground:compute |
| ground-data | ground | 324 | 3 | ground:data |
| ground-power | ground | 296 | 3 | ground:power |
| ground-thermal | ground | 350 | 4 | ground:thermal |
| ground-attitude | ground | 294 | 2 | ground:attitude |
| ground-propulsion | ground | 295 | 3 | ground:propulsion |
| ground-mass | ground | 283 | 2 | ground:mass |
| ground-alignment | ground | 293 | 3 | ground:alignment |
| ground-fit | ground | 300 | 4 | ground:fit |
| ground-adapter | ground | 294 | 3 | ground:adapter |
| ground-environment | ground | 282 | 2 | ground:environment |
| ground-orbit | ground | 293 | 3 | ground:orbit |
| ground-avionics | ground | 294 | 3 | ground:avionics |
| ground-rf | ground | 301 | 2 | ground:rf |
| ground-rf-ka | ground | 302 | 3 | ground:rf-ka |
| ground-rf-optical | ground | 319 | 3 | ground:rf-optical |
| ground-propellant-loading | ground | 319 | 2 | ground:propellant-loading |
| ground-checkout-stand | ground | 305 | 3 | ground:checkout-stand |
| ground-adapter-stand | ground | 300 | 4 | ground:adapter-stand |
| ground-bridge-crane | ground | 288 | 2 | ground:bridge-crane |
| ground-crane-hoist | ground | 293 | 2 | ground:crane-hoist |
| ground-lifting-yoke | ground | 289 | 2 | ground:lifting-yoke |
| ground-lifting-frame | ground | 295 | 2 | ground:lifting-frame |
| ground-receiving-cradle | ground | 297 | 3 | ground:receiving-cradle |
| ground-gse-storage | ground | 281 | 3 | ground:gse-storage |
| ground-fairing-carrier | ground | 299 | 3 | ground:fairing-carrier |
| ground-transfer-support | ground | 291 | 4 | ground:transfer-support |
| ground-cooling-pump | ground | 341 | 2 | ground:cooling-pump |
| ground-cooling-reservoir | ground | 345 | 2 | ground:cooling-reservoir |
| ground-heat-exchanger | ground | 344 | 2 | ground:heat-exchanger |
| ground-power-converter | ground | 309 | 2 | ground:power-converter |
| ground-alignment-telescope | ground | 286 | 2 | ground:alignment-telescope |
| ground-rf-test-hat | ground | 306 | 2 | ground:rf-test-hat |
| ground-ka-test-port | ground | 299 | 3 | ground:ka-test-port |
| ground-optical-test-head | ground | 299 | 3 | ground:optical-test-head |
| ground-launch-position | site | 309 | 4 | site:launch-position |
| ground-launch-table | site | 288 | 2 | site:launch-table |
| ground-restraints | site | 307 | 2 | site:restraints |
| ground-exhaust-path | site | 300 | 2 | site:exhaust-path |
| ground-pad-support | site | 298 | 2 | site:pad-support |
| ground-water-supply | site | 299 | 2 | site:water-supply |
| ground-lightning-protection | site | 287 | 2 | site:lightning-protection |
| ground-commodity-services | site | 302 | 4 | site:commodity-services |
| ground-utility-distribution | site | 276 | 5 | site:utility-distribution |
| ground-commodity-lox | site | 301 | 3 | site:commodity-lox |
| ground-commodity-methane | site | 302 | 3 | site:commodity-lng |
| ground-umbilical-fluid | site | 324 | 3 | site:umbilical-core-tail, site:umbilical-upper-service, site:umbilical-core-fuel, site:umbilical-core-oxidizer, site:umbilical-booster-0, site:umbilical-booster-1, site:umbilical-upper-fuel, site:umbilical-upper-oxidizer, site:umbilical-booster-2, site:umbilical-booster-3 |
| ground-connection-methane | site | 309 | 4 | site:connection-core-fuel, site:connection-upper-fuel |
| ground-connection-lox | site | 302 | 3 | site:connection-core-oxidizer, site:connection-upper-oxidizer, site:connection-booster-0-oxidizer, site:connection-booster-1-oxidizer, site:connection-booster-2-oxidizer, site:connection-booster-3-oxidizer |
| ground-connection-power | site | 287 | 4 | site:connection-vehicle-power, site:connection-payload-power |
| ground-connection-data | site | 305 | 4 | site:connection-vehicle-data, site:connection-payload-data |
| ground-connection-bond | site | 279 | 2 | site:connection-vehicle-bond |
| ground-umbilical-electrical | site | 294 | 3 | site:umbilical-payload-service, site:umbilical-vehicle-control |
| ground-umbilical-environmental | site | 313 | 3 | site:umbilical-payload-ecs |
| ground-connection-air | site | 294 | 3 | site:connection-payload-air |
| ground-commodity-hydrogen | site | 322 | 3 | site:commodity-lh2 |
| ground-connection-hydrogen | site | 297 | 4 | site:connection-upper-fuel, site:connection-core-fuel |
| ground-cargo-load-bridge | ground | 295 | 3 | ground:cargo-load-bridge |
| ground-commodity-kerosene | site | 290 | 3 | site:commodity-rp1, site:commodity-kerosene |
| ground-commodity-nitrogen | site | 288 | 3 | site:commodity-n2 |
| ground-commodity-helium | site | 297 | 4 | site:commodity-he |
| ground-connection-rp1 | site | 291 | 4 | site:connection-core-fuel, site:connection-upper-fuel, site:connection-booster-0-fuel, site:connection-booster-1-fuel, site:connection-booster-2-fuel, site:connection-booster-3-fuel |
| ground-connection-unknown-fuel | site | 267 | 4 | site:connection-core-fuel, site:connection-upper-fuel |
| ground-connection-unknown-oxidizer | site | 272 | 4 | site:connection-core-oxidizer, site:connection-upper-oxidizer |

## Annotated primary-source registry

URLs below are the exact links delivered to the reader. Descriptions explain what each source is useful for rather than presenting a bare bibliography.

### NASA-STD-5005 — Design and Fabrication of Ground Support Equipment

- Registry ID: ground-gse
- Publisher: NASA
- Type: Design standard
- Link: [NASA-STD-5005 — Design and Fabrication of Ground Support Equipment](https://standards.nasa.gov/standard/nasa/nasa-std-5005)
- Reading guidance: A reference for developing, documenting and maintaining purpose-built ground equipment. The landing page includes the current public document.
- Reviewed: 2026-11-07

### GSFC-STD-7000 — General Environmental Verification Standard

- Registry ID: ground-gevs
- Publisher: NASA Goddard
- Type: Verification standard
- Link: [GSFC-STD-7000 — General Environmental Verification Standard](https://standards.nasa.gov/standard/gsfc/gsfc-std-7000)
- Reading guidance: Explains how test and analysis demonstrate that flight hardware can tolerate its expected environments. Useful for separating checkout from qualification.
- Reviewed: 2026-11-07

### Integration and Test: Day-in-the-Life Testing

- Registry ID: ground-ditl
- Publisher: NASA Small Spacecraft Systems Virtual Institute
- Type: Learning guide
- Link: [Integration and Test: Day-in-the-Life Testing](https://s3vi.ndc.nasa.gov/ssri-kb/topics/36/)
- Reading guidance: An introduction to integrated mission rehearsals, with links to lessons learned and additional test literature.
- Reviewed: 2026-11-07

### Satellite Testing and Simulation

- Registry ID: ground-terma-checkout
- Publisher: Terma
- Type: Supplier overview
- Link: [Satellite Testing and Simulation](https://www.terma.com/products/space/test-and-simulation/)
- Reading guidance: Introduces central checkout software, processor emulation and test-data tools. Follow its datasheet links for actual architectures.
- Reviewed: 2026-11-07

### Payload EGSE

- Registry ID: ground-terma-payload
- Publisher: Terma
- Type: Supplier overview
- Link: [Payload EGSE](https://www.terma.com/products/space/payload-egse/)
- Reading guidance: A real example of automated payload test equipment and configurable instrument interfaces.
- Reviewed: 2026-11-07

### MLPerf Inference: Datacenter

- Registry ID: ground-mlperf
- Publisher: MLCommons
- Type: Benchmark specification
- Link: [MLPerf Inference: Datacenter](https://mlcommons.org/benchmarks/inference-datacenter/)
- Reading guidance: Defines repeatable inference workloads and distinguishes throughput from latency and output-quality conditions.
- Reviewed: 2026-11-07

### MLPerf Inference Documentation

- Registry ID: ground-mlperf-docs
- Publisher: MLCommons
- Type: Technical documentation
- Link: [MLPerf Inference Documentation](https://docs.mlcommons.org/inference/)
- Reading guidance: Read the workload, scenario and measurement rules before interpreting a headline accelerator result.
- Reviewed: 2026-11-07

### CCSDS File Delivery Protocol, 727.0-B-5

- Registry ID: ground-cfdp
- Publisher: CCSDS
- Type: Protocol standard
- Link: [CCSDS File Delivery Protocol, 727.0-B-5](https://ccsds.org/Pubs/727x0b5e1.pdf)
- Reading guidance: A complete specification for spacecraft file-transfer services, including acknowledged and unacknowledged operation.
- Reviewed: 2026-11-07

### CFDP Service — Yamcs Server Manual

- Registry ID: ground-yamcs
- Publisher: Yamcs
- Type: Implementation documentation
- Link: [CFDP Service — Yamcs Server Manual](https://docs.yamcs.org/yamcs-server-manual/services/instance/cfdp/)
- Reading guidance: Shows how one ground-system implementation exposes file-transfer operations and documents supported protocol features.
- Reviewed: 2026-11-07

### How to Simulate the Behavior of Solar Arrays in Space

- Registry ID: ground-sas
- Publisher: Keysight
- Type: Application guide
- Link: [How to Simulate the Behavior of Solar Arrays in Space](https://www.keysight.com/us/en/use-cases/simulate-the-behavior-of-solar-arrays-in-space.html)
- Reading guidance: Explains why a solar-array simulator must reproduce a current–voltage curve and its changes during an orbit.
- Reviewed: 2026-11-07

### How to Test Satellite Batteries

- Registry ID: ground-battery-test
- Publisher: Keysight
- Type: Application guide
- Link: [How to Test Satellite Batteries](https://www.keysight.com/us/en/use-cases/test-satellite-batteries.html)
- Reading guidance: A ground-test perspective on power sources, electronic loads, battery emulation and mission profiles.
- Reviewed: 2026-11-07

### Kodiak Recirculating Chiller Technical Manual

- Registry ID: ground-chiller
- Publisher: Boyd
- Type: Equipment manual
- Link: [Kodiak Recirculating Chiller Technical Manual](https://info.boydcorp.com/hubfs/Thermal/Liquid-Cooling/Boyd-Recirculating-Chiller-Technical-Manual-820-0109.pdf)
- Reading guidance: An accessible example of a complete ground coolant loop: reservoir, pump, heat exchanger, controls and process connections. Its ratings are product-specific.
- Reviewed: 2026-11-07

### Liquid Cooling System Pump Overview

- Registry ID: ground-pump
- Publisher: Eaton Boyd Thermal
- Type: Engineering guide
- Link: [Liquid Cooling System Pump Overview](https://www.eaton.com/us/en-us/products/thermal-management-solutions/liquid-cooling/liquid-cooling-system-pump-overview.html)
- Reading guidance: Compares centrifugal and positive-displacement pumps and explains why system pressure loss affects delivered flow.
- Reviewed: 2026-11-07

### How Gasketed Plate Heat Exchangers Work

- Registry ID: ground-phe
- Publisher: Alfa Laval
- Type: Illustrated technical guide
- Link: [How Gasketed Plate Heat Exchangers Work](https://www.alfalaval.com/microsites/gasketed-plate-heat-exchangers/tools/how-gphes-work/)
- Reading guidance: Includes animations of separated hot and cold flow paths, plate construction, and counterflow operation.
- Reviewed: 2026-11-07

### Star Trackers and Dynamic Optical Ground Support Equipment

- Registry ID: ground-star-stim
- Publisher: Terma
- Type: Supplier overview
- Link: [Star Trackers and Dynamic Optical Ground Support Equipment](https://www.terma.com/products/space/star-trackers?region=India)
- Reading guidance: Describes optical stimulators used with star trackers for repeatable open-loop and closed-loop tests.
- Reviewed: 2026-11-07

### Simulation & Modeling

- Registry ID: ground-simulation
- Publisher: NASA Johnson
- Type: Facility capabilities
- Link: [Simulation & Modeling](https://www.nasa.gov/reference/jsc-simulation-modeling/)
- Reading guidance: Examples of simulation facilities that connect models, control software and flight-like hardware.
- Reviewed: 2026-11-07

### GSS9000 GNSS Constellation Simulator Datasheet

- Registry ID: ground-gnss-sim
- Publisher: Spirent
- Type: Historical supplier datasheet
- Link: [GSS9000 GNSS Constellation Simulator Datasheet](https://support-kb.spirent.com/library/SPIRENT/MS9000%20Issue%201-02%20GSS9000%20Provisional%20Datasheet%20Specification.pdf)
- Reading guidance: A detailed example of RF navigation-signal simulation and trajectory inputs. The 2014 specification is a learning reference, not a current quotation.
- Reviewed: 2026-11-07

### Propellant Handling and Servicing

- Registry ID: ground-propellants
- Publisher: NASA Kennedy
- Type: Facility capabilities
- Link: [Propellant Handling and Servicing](https://www.nasa.gov/kennedy/partnerships/propellanthandlingandservicing/)
- Reading guidance: Describes the engineering, analysis, distribution and servicing support behind launch-site fluids.
- Reviewed: 2026-11-07

### Propellant Services

- Registry ID: ground-astrotech-prop
- Publisher: Astrotech Space Operations
- Type: Service-provider overview
- Link: [Propellant Services](https://www.astrotech.com/propellant-services.html)
- Reading guidance: A commercial example of spacecraft loading, simulation, pressure testing and decontamination services.
- Reviewed: 2026-11-07

### Payload Processing

- Registry ID: ground-astrotech
- Publisher: Astrotech Space Operations
- Type: Service-provider overview
- Link: [Payload Processing](https://www.astrotech.com/payload-processing.html)
- Reading guidance: Shows how cleanrooms, control rooms, transport and launch-pad connectivity fit into a payload-processing campaign.
- Reviewed: 2026-11-07

### Physical Properties Machines

- Registry ID: ground-mass
- Publisher: ESA ESTEC
- Type: Facility guide
- Link: [Physical Properties Machines](https://www.esa.int/Enabling_Support/Space_Engineering_Technology/Physical_Properties_Machines)
- Reading guidance: Distinguishes weighing, center-of-gravity measurements, inertia measurements and dynamic balancing.
- Reviewed: 2026-11-07

### Weight and CG of Large Objects and Spacecraft

- Registry ID: ground-raptor
- Publisher: Raptor Scientific / Space Electronics
- Type: Supplier engineering guide
- Link: [Weight and CG of Large Objects and Spacecraft](https://raptor-scientific.com/products/weight-and-cg-of-large-objects-and-spacecraft/)
- Reading guidance: Discusses load-cell geometry, fixture effects, coordinate references and spacecraft mass-property measurement equipment.
- Reviewed: 2026-11-07

### 2024 Alignment Telescope — Metric

- Registry ID: ground-brunson
- Publisher: Brunson Instrument Company
- Type: Instrument datasheet
- Link: [2024 Alignment Telescope — Metric](https://www.brunson.us/2024-metric-alignment-telescope.html)
- Reading guidance: A real line-of-sight instrument with micrometers and autocollimation features; useful for understanding what an alignment telescope measures.
- Reviewed: 2026-11-07

### Alignment Telescopes

- Registry ID: ground-brunson-learning
- Publisher: Brunson Instrument Company
- Type: Technical introduction
- Link: [Alignment Telescopes](https://www.brunson.us/blog/post/alignment-telescopes)
- Reading guidance: Explains optical reference lines, collimation, autocollimation and related tooling.
- Reviewed: 2026-11-07

### System Mechanical Ground Support Equipment

- Registry ID: ground-mgse
- Publisher: Beyond Gravity
- Type: Supplier overview
- Link: [System Mechanical Ground Support Equipment](https://www.beyondgravity.com/en/satellites/ground-support-solutions/other-mgse)
- Reading guidance: Examples of spacecraft lifting devices, test adapters, integration stands and panel-handling equipment.
- Reviewed: 2026-11-07

### Multi-Purpose Trolleys

- Registry ID: ground-trolley
- Publisher: Beyond Gravity
- Type: Supplier overview
- Link: [Multi-Purpose Trolleys](https://www.beyondgravity.com/en/satellites/ground-support-solutions/multi-purpose-trolleys)
- Reading guidance: Shows a configurable approach to supporting and reorienting spacecraft during assembly and integration.
- Reviewed: 2026-11-07

### Kennedy Space Center Cleanroom Crane Case Study

- Registry ID: ground-crane
- Publisher: American Crane & Equipment Corporation
- Type: Supplier case study
- Link: [Kennedy Space Center Cleanroom Crane Case Study](https://americancrane.com/resource-center/case-studies/kennedy-space-center-2/)
- Reading guidance: An example of a crane designed for spacecraft cleanroom work, including the Orion processing application.
- Reviewed: 2026-11-07

### Cleanroom Tech Key to Success in Space

- Registry ID: ground-clean
- Publisher: NASA
- Type: Learning article
- Link: [Cleanroom Tech Key to Success in Space](https://www.nasa.gov/organizations/osi/setmo/cleanroom-tech-key-to-success-in-space/)
- Reading guidance: An introduction to contamination control during spacecraft integration and transport. Use project cleanliness requirements for actual limits.
- Reviewed: 2026-11-07

### Contamination Monitors for Aerospace & Defense

- Registry ID: ground-pms
- Publisher: Particle Measuring Systems
- Type: Supplier overview
- Link: [Contamination Monitors for Aerospace & Defense](https://www.pmeasuring.com/industry/aerospace-and-defense/)
- Reading guidance: Examples of portable and fixed particle counters, with links to educational material on particulate and molecular contamination.
- Reviewed: 2026-11-07

### Radio Frequency Special Check-Out Equipment

- Registry ID: ground-rf-scoe
- Publisher: Terma
- Type: Supplier overview
- Link: [Radio Frequency Special Check-Out Equipment](https://www.terma.com/products/space/rf-scoe/)
- Reading guidance: Describes automated spacecraft RF measurements and links to TT&C and repeater-test brochures.
- Reviewed: 2026-11-07

### TT&C SCOE — Telemetry, Tracking & Control Specific Check-Out Equipment

- Registry ID: ground-rf-brochure
- Publisher: Terma
- Type: Supplier brochure
- Link: [TT&C SCOE — Telemetry, Tracking & Control Specific Check-Out Equipment](https://www.terma.com/media/zctfrtmk/brochure-ttandc_scoe_tcr_tester_a4.pdf)
- Reading guidance: Block diagrams identify the modem, converters, attenuators, measurement instruments and spacecraft test interfaces.
- Reviewed: 2026-11-07

### Measurement of the Earth-Observer-1 Satellite X-Band Phased Array

- Registry ID: ground-eo1
- Publisher: NASA Goddard and collaborators
- Type: Technical paper
- Link: [Measurement of the Earth-Observer-1 Satellite X-Band Phased Array](https://ntrs.nasa.gov/api/citations/20030093738/downloads/20030093738.pdf)
- Reading guidance: Contrasts a hat coupler used for functional monitoring with near-field antenna-pattern measurements. The flight example is X-band. Useful section: Section 3: Antenna Testing on EO-1 Spacecraft.
- Reviewed: 2026-11-07

### Pointing, Acquisition, and Tracking for the TBIRD CubeSat Mission: System Design and Pre-Flight Results

- Registry ID: ground-tbird
- Publisher: MIT Lincoln Laboratory / NASA
- Type: Technical paper
- Link: [Pointing, Acquisition, and Tracking for the TBIRD CubeSat Mission: System Design and Pre-Flight Results](https://ntrs.nasa.gov/citations/20210026049)
- Reading guidance: A useful example of optical alignment stability, pointing feedback and preflight testing for a laser communication payload.
- Reviewed: 2026-11-07

### Optical Ground Support Equipment

- Registry ID: ground-ogse
- Publisher: Safran Reosc
- Type: Supplier overview
- Link: [Optical Ground Support Equipment](https://www.safran-group.com/products-services/ogse-optical-ground-support-equipment)
- Reading guidance: Examples of specialized optical test and calibration equipment; follow the product links for collimator and metrology capabilities.
- Reviewed: 2026-11-07

### Optical Ground Support Equipment for Space Applications

- Registry ID: ground-jena
- Publisher: Jena-Optronik
- Type: Supplier overview
- Link: [Optical Ground Support Equipment for Space Applications](https://www.jena-optronik.de/products/services/optical-ground-support-equipment.html)
- Reading guidance: Describes precision reference optics, alignment equipment and optical test services, including environmental-test applications.
- Reviewed: 2026-11-07

### Small Spacecraft Technology: Ground Data Systems and Mission Operations

- Registry ID: ground-ground-data
- Publisher: NASA
- Type: Technical survey
- Link: [Small Spacecraft Technology: Ground Data Systems and Mission Operations](https://www.nasa.gov/smallsat-institute/sst-soa/ground-data-systems-and-mission-operations/)
- Reading guidance: Explains the relationships between spacecraft operations, ground software, communications, test systems and data delivery.
- Reviewed: 2026-11-07

### Falcon Payload User’s Guide

- Registry ID: ground-falcon
- Publisher: SpaceX
- Type: Payload user guide
- Link: [Falcon Payload User’s Guide](https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf)
- Reading guidance: A concrete launch-service example covering payload interfaces, environments, processing and electrical access. Requirements are mission- and revision-specific. Useful section: Payload interfaces and launch-site operations.
- Reviewed: 2026-11-07

### Ariane 6 User’s Manual, Issue 2

- Registry ID: ground-ariane
- Publisher: Arianespace
- Type: Payload user guide
- Link: [Ariane 6 User’s Manual, Issue 2](https://www.arianespace.com/app/uploads/sites/4/2024/10/Mua-6_Issue-2_Revision-0_March-2021.pdf)
- Reading guidance: An alternative integration architecture with extensive explanations of payload accommodation and launch-campaign interfaces. Useful section: Payload accommodation and launch operations.
- Reviewed: 2026-11-07

### Vulcan Centaur User’s Guide

- Registry ID: ground-vulcan
- Publisher: United Launch Alliance
- Type: Payload user guide
- Link: [Vulcan Centaur User’s Guide](https://www.ulalaunch.com/docs/default-source/default-document-library/2023_vulcan_user_guide.pdf?sfvrsn=37856b50_1)
- Reading guidance: Read the interface and processing chapters to compare a different launch provider’s integration arrangements.
- Reviewed: 2026-11-07

### Launch Equipment Test Facility Capabilities

- Registry ID: ground-letf
- Publisher: NASA Kennedy
- Type: Facility capabilities
- Link: [Launch Equipment Test Facility Capabilities](https://www.nasa.gov/kennedy/partnerships/launchequipmenttestfacilityletfcapabilities/)
- Reading guidance: Explains the dedicated test infrastructure used to assess launch umbilicals, access arms and large ground mechanisms.
- Reviewed: 2026-11-07

### Mobile Launcher Tower Umbilicals and Accessories

- Registry ID: ground-umbilicals
- Publisher: NASA Kennedy
- Type: Illustrated fact sheet
- Link: [Mobile Launcher Tower Umbilicals and Accessories](https://www.nasa.gov/wp-content/uploads/2018/06/fs-2018-02-250-ksc-ml_umbilical_fact_sheet.pdf)
- Reading guidance: Maps real service arms and connections on the SLS mobile launcher. It is a comparison architecture, not the layout of every pad.
- Reviewed: 2026-11-07

### Launch Complex 39B

- Registry ID: ground-pad
- Publisher: NASA Kennedy
- Type: Facility guide
- Link: [Launch Complex 39B](https://www.nasa.gov/reference/launch-complex-39b/)
- Reading guidance: An accessible example showing how a pad combines exhaust management, utilities, water, access and lightning protection.
- Reviewed: 2026-11-07

### Launch Pad 39B Flame Trench Nears Completion

- Registry ID: ground-deflector
- Publisher: NASA Kennedy
- Type: Construction case study
- Link: [Launch Pad 39B Flame Trench Nears Completion](https://www.nasa.gov/humans-in-space/launch-pad-39b-flame-trench-nears-completion/)
- Reading guidance: Illustrates a real flame-deflector and trench project and the surrounding civil works.
- Reviewed: 2026-11-07

### Water Deluge Test a Success at Launch Pad 39B

- Registry ID: ground-deluge
- Publisher: NASA Kennedy
- Type: Test case study
- Link: [Water Deluge Test a Success at Launch Pad 39B](https://www.nasa.gov/humans-in-space/water-deluge-test-a-success-at-launch-pad-39b/)
- Reading guidance: Explains why water-flow tests precede launch and what the ignition-overpressure and sound-suppression system protects.
- Reviewed: 2026-11-07

### Lightning Towers Stand Tall at NASA Kennedy’s Launch Pad 39B

- Registry ID: ground-lightning
- Publisher: NASA Kennedy
- Type: Engineering case study
- Link: [Lightning Towers Stand Tall at NASA Kennedy’s Launch Pad 39B](https://www.nasa.gov/missions/artemis/lightning-towers-stand-tall-at-nasa-kennedys-launch-pad-39b/)
- Reading guidance: A real example of catenary conductors intercepting strikes and routing current toward ground.
- Reviewed: 2026-11-07

### KSC-STD-E-0022A — Bonding, Grounding, Shielding, Electromagnetic Interference, Lightning and Transient Protection: Design Requirements for Ground Systems

- Registry ID: ground-bonding
- Publisher: NASA Kennedy
- Type: Engineering standard
- Link: [KSC-STD-E-0022A — Bonding, Grounding, Shielding, Electromagnetic Interference, Lightning and Transient Protection: Design Requirements for Ground Systems](https://standards.nasa.gov/standard/KSC/KSC-STD-E-0022)
- Reading guidance: Reference for electrical interfaces between fixed facilities, portable ground equipment and sensitive test systems.
- Reviewed: 2026-11-07

### Rocket Propellants and Propellant Support — FAQ

- Registry ID: ground-fluid-faq
- Publisher: NASA Kennedy
- Type: Technical introduction
- Link: [Rocket Propellants and Propellant Support — FAQ](https://public.ksc.nasa.gov/propellants/faq/)
- Reading guidance: Introduces launch-site commodities, specifications and support arrangements without assuming a particular vehicle.
- Reviewed: 2026-11-07

### NASA Awards Contracts for Acquisition of Liquid Nitrogen and Oxygen

- Registry ID: ground-gas-supply
- Publisher: NASA
- Type: Procurement reference
- Link: [NASA Awards Contracts for Acquisition of Liquid Nitrogen and Oxygen](https://www.nasa.gov/news-release/nasa-awards-contracts-for-acquisition-of-liquid-nitrogen-oxygen/)
- Reading guidance: A documented example of industrial suppliers serving agency fluid needs; it does not identify the supplier for this modeled pad.
- Reviewed: 2026-11-07

### NASA Awards Liquid Hydrogen Supply Contracts

- Registry ID: ground-hydrogen-supply
- Publisher: NASA
- Type: Procurement reference
- Link: [NASA Awards Liquid Hydrogen Supply Contracts](https://www.nasa.gov/news-release/nasa-awards-liquid-hydrogen-supply-contracts/)
- Reading guidance: Identifies Air Products and Plug Power in a dated agency hydrogen-supply award, distinct from vehicle manufacture.
- Reviewed: 2026-11-07

### NASA Selects Contractors to Supply Centers with Helium

- Registry ID: ground-helium-supply
- Publisher: NASA
- Type: Procurement reference
- Link: [NASA Selects Contractors to Supply Centers with Helium](https://www.nasa.gov/news-release/nasa-selects-contractors-to-supply-centers-with-helium/)
- Reading guidance: A documented helium-supply example for readers tracing the commodity supply chain.
- Reviewed: 2026-11-07

### Space: Cryogenic Fluids and Equipment

- Registry ID: ground-airliquide
- Publisher: Air Liquide
- Type: Supplier overview
- Link: [Space: Cryogenic Fluids and Equipment](https://usa.airliquide.com/markets/space)
- Reading guidance: Examples of spaceport fluid supply and cryogenic equipment, including work at the Guiana Space Center.
- Reviewed: 2026-11-07

### RP-1 Propellant, Rocket-Grade Kerosene

- Registry ID: ground-rp1-product
- Publisher: American Hydrocarbons / Haltermann Solutions
- Type: Supplier product page
- Link: [RP-1 Propellant, Rocket-Grade Kerosene](https://www.haltermannsolutions.com/products?id=124009/rp-1-propellant-rocket-grade-kerosene)
- Reading guidance: A real catalog entry for rocket-grade kerosene. The stated specification belongs to that offering, not every kerosene-fueled launcher.
- Reviewed: 2026-11-07

### Rocket Fuel Development

- Registry ID: ground-rp1-development
- Publisher: Haltermann Solutions
- Type: Supplier technical article
- Link: [Rocket Fuel Development](https://www.haltermannsolutions.com/tech-talk/rocket-fuel-development)
- Reading guidance: Explains why rocket-grade kerosene is a controlled fuel specification and why composition can matter even within a specification.
- Reviewed: 2026-11-07

### Cryogenic Gases to Support Engine Testing and Launch

- Registry ID: ground-linde-space
- Publisher: Linde
- Type: Supplier application overview
- Link: [Cryogenic Gases to Support Engine Testing and Launch](https://www.linde-gas.com/industries/space/engine-testing-and-launch)
- Reading guidance: An industry overview of cryogenic propellants and the separate roles of cooling, purge and pressurization gases.
- Reviewed: 2026-11-07

### Rocket Laboratory — Final Years

- Registry ID: ground-methane-history
- Publisher: NASA Glenn
- Type: Technical history
- Link: [Rocket Laboratory — Final Years](https://www.nasa.gov/rocket-laboratory-final-years/)
- Reading guidance: The methane-for-thruster-systems section gives a documented example of methane/oxygen research and its system-level motivations. Useful section: Methane for Thruster Systems.
- Reviewed: 2026-11-07

### Space Interconnect Systems for Launch Vehicles, Satellites, and Payloads

- Registry ID: ground-glenair-space
- Publisher: Glenair
- Type: Supplier technical catalog
- Link: [Space Interconnect Systems for Launch Vehicles, Satellites, and Payloads](https://www.glenair.com/space-grade-connector-and-interconnect-cable-solutions/)
- Reading guidance: Introduces power, signal, RF and data interconnects, including blind-mate and separation interfaces. Product qualification claims apply only to the specified supplier products.
- Reviewed: 2026-11-07

### Lanyard-Release Quick-Disconnect Connectors

- Registry ID: ground-glenair-release
- Publisher: Glenair
- Type: Supplier catalog
- Link: [Lanyard-Release Quick-Disconnect Connectors](https://www.glenair.com/lanyard-release/)
- Reading guidance: A concrete example of electrical umbilical connectors and alternative power, signal and high-speed contact arrangements.
- Reviewed: 2026-11-07

### Advanced Quick Connection Solutions for Launch Site and Rocket

- Registry ID: ground-staubli
- Publisher: Stäubli
- Type: Supplier application overview
- Link: [Advanced Quick Connection Solutions for Launch Site and Rocket](https://www.staubli.com/us/en/fluid-connectors/industries/aerospace-defense/launch-site-rocket.html)
- Reading guidance: Examples of custom fluid-connection systems for launch-site, cooling and hydraulic applications. Compatibility with a specific propellant must be separately established.
- Reviewed: 2026-11-07

### Orion Service Module Umbilical Testing Wraps Up at Launch Equipment Test Facility

- Registry ID: ground-osmu-test
- Publisher: NASA Kennedy
- Type: Test case study
- Link: [Orion Service Module Umbilical Testing Wraps Up at Launch Equipment Test Facility](https://www.nasa.gov/blogs/groundsystems/2016/10/21/orion-service-module-umbilical-testing-wraps-up-at-launch-equipment-test-facility/)
- Reading guidance: Shows how a real service umbilical was tested against a vehicle-motion simulator, including its environmental-control and coolant functions. It is a historical SLS/Orion example.
- Reviewed: 2026-11-07

