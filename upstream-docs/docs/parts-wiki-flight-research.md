# Flight parts wiki: research and coverage

Editorial review date: 2026-11-07 (the Site client date).

## Scope and implementation

The module `dist/part-knowledge-flight.js` owns flight-category parent MEL allocations only. It exports `flightKnowledgeSources` and `flightKnowledge(record, catalog, hardware)` and returns null for material children, launch records, site records and ground equipment. It does not modify engineering inputs, hardware sizing, supplier selection or the underlying MEL.

Each article provides a summary; three teaching sections with six explanatory paragraphs; annotated manufacturer, institution or real-hardware examples; meaningful alternatives with tradeoffs; model-inspection guidance; a short glossary; related part IDs; and source IDs that the common renderer resolves into linked reading cards. Live quantities, configuration evidence and geometry boundaries remain in the catalog’s separate In this design section.

Coverage is 31 unique parent topics with 69 curated primary-source entries. The default 31-article collection contains 16,253 words, including section headings, supplier cards, alternatives, inspection notes and glossary definitions, but excluding the source registry and live MEL. Individual default articles range from 463 to 580 words. All tested architecture and chemistry variants remain within the requested 450–700-word range.

## Configuration-dependent editorial behavior

- Passive-local Redwire: describes local spreading, heat pipes, short thermal paths and the separate assumed bus strap; explicitly does not install a remote pump station, ammonia inventory or pumped-fluid rotary crossing.
- Pumped loop: describes ammonia transport, duty/standby pumps and shared distribution paths. A spare pump is not misrepresented as a separate independent fluid circuit.
- Redundant-pumped Starmind: identifies two independently contained half-duty loops and does not claim full-load operation after losing one.
- Heat lift: explains cold-side load, compressor work, hot-side rejection and cooling COP. The Star Catcher reference is a concept analysis; no qualified compressor, refrigerant circuit or supplier product is invented. This is the selected self-powered workbench case, not an assumed power-beaming contract.
- Engine chemistry: MMH/MON-3 and selectable Aerozine-50/NTO have distinct engine-reference, fuel and oxidizer explanations. Apollo heritage is identified as a much larger historical system; the study’s small engine mass adaptation is not treated as a qualified AJ10 variant.
- Launch interface: circular retained-upper-ring and rectangular-lug/open-cradle configurations get different mass-boundary and evidence explanations. The rectangular cradle does not become a provider-approved ring-release product.
- Optional hardware: the resolver covers a topic only when its MEL record exists. Starmind’s tested catalog has 30 parents because optional Ka-band equipment is absent; it is not a coverage failure.

## Evidence practices

Technical references were checked through primary publisher pages, manufacturer documentation, NASA/ESA publications, DLA specification records and a manufacturer SEC filing. No third-party summaries or invented mission logos/assets are used. Most general engineering explanations are original teaching prose rather than brochure paraphrases. Specific supplier capabilities are kept narrow and linked. Published product ratings are not copied into live configuration facts.

Supplier cards explicitly distinguish actual product families, historical systems, research demonstrations and procurement organizations from installed workbench hardware. Examples include Saft VES16 cell-level evidence versus the selected study battery chemistry; HPE computing aboard a pressurized ISS accommodation versus an unpressurized free flyer; body-pointed TBIRD versus the articulated study optical terminal; and Juno’s radiation vault versus an Earth-orbiting data center.

## Source integrity findings shared with the root integrator

- The legacy Apollo source URL for NTRS 19740005081 resolves to a shuttle seal-material report, not the Apollo SPS. The articles instead use NASA’s Apollo engine history and Apollo propulsion documentation. The root integrator confirmed that the existing catalog reference was corrected.
- The old Sodern 2025 HYDRA PDF path returned 404. The article uses the current HYDRA product page. The root integrator corrected the legacy catalog reference.
- The old www.crisa.airbus.com power-management path is no longer reliable. The registry uses Airbus’s current Power Conditioning and Distribution Units page, independently opened and verified, with EVO, MEGA and regulator information.
- NASA NESC Technical Bulletin 24-01 is titled Material Compatibility of Common Aerospace Metals in MMH/MON-3. Its specific scope is preserved; it is not generalized into approval of every alloy, geometry or other fuel.
- The CMG research record was verified by title and normalized to its NTRS citation page, which exposes the downloadable paper.
- Helium suppliers are supported by NASA’s procurement announcement. DLA is labeled a procurement/specification organization, not a manufacturer. CF Industries’ filing establishes NTO production, not a selected MON-3 flight batch. Mitsubishi Gas Chemical NEXT’s MMH listing does not establish propellant-grade acceptance.

## Validation

- `node --check dist/part-knowledge-flight.js` passed.
- A small import/resolver audit exercised the default text starter, all six current design-reference snapshots and an Aerozine-50/NTO starter: 247 present parent-record resolutions, 31 distinct WBS topics, no missing article or undefined source ID.
- All articles had three teaching sections and at least three source IDs. All eight tested cases rejected records outside this module’s ownership.
- Source registry contains 69 unique HTTPS entries with review date 2026-11-07. Full browser rendering and Site publication belong to the root integrator.

## Article inventory (default configuration)

| WBS | Article | Words | Linked sources |
| --- | --- | ---: | ---: |
| 01.01 | Accelerator boards and cold plates | 558 | 6 |
| 01.02 | Host electronics, memory and tray carrier | 536 | 5 |
| 01.03 | Solid-state storage modules | 580 | 5 |
| 01.04 | Payload network fabric and host interfaces | 533 | 5 |
| 02.01 | Solar wings with cells and substrates | 554 | 4 |
| 02.02 | Battery enclosures, cells and BMS | 573 | 4 |
| 02.03 | Power conditioning and distribution | 554 | 3 |
| 03.01 | Radiator panels and surface finish | 494 | 6 |
| 03.02 | Liquid loop and cold-control equipment | 522 | 6 |
| 03.03 | Tailored exterior MLI covers | 528 | 4 |
| 04.01 | Pyramid-mounted CMGs and drive electronics | 506 | 5 |
| 04.02 | Magnetic unload rods and drive stages | 507 | 5 |
| 04.03 | Attitude sensors and electronics | 513 | 5 |
| 05.01 | S-band patches and tracking, telemetry and command radio | 506 | 6 |
| 05.02 | Ka-band reflector, positioner and RF chain | 490 | 4 |
| 05.03 | Optical terminals and fine pointing assemblies | 501 | 5 |
| 06.01 | Aft engine heads and bipropellant valves | 504 | 4 |
| 06.02 | Pressurization and liquid feed assembly | 529 | 5 |
| 06.03 | Fuel vessel, PMD and mounts | 522 | 5 |
| 06.04 | Oxidizer vessel, PMD and mounts | 526 | 7 |
| 06.05 | Helium pressure bottle and mounts | 512 | 4 |
| 06.06 | MMH fuel at loading | 463 | 9 |
| 06.07 | MON-3 oxidizer at loading | 513 | 9 |
| 06.08 | Helium charge at loading | 546 | 4 |
| 07.01 | Primary frame and tray mounts | 533 | 4 |
| 07.02 | Sandwich enclosure walls | 526 | 4 |
| 07.03 | Internal radiation shielding | 535 | 5 |
| 07.04 | Wing and radiator deployment and tracking drives | 529 | 5 |
| 07.05 | Power and data harness | 524 | 5 |
| 08.01 | Flight avionics and GNSS navigation | 530 | 6 |
| 09.01 | Launch adapter and separation interface | 506 | 4 |

## Curated primary-source registry

- **flight-a100** — [NVIDIA A100 Tensor Core GPU](https://www.nvidia.com/en-us/data-center/a100/) — NVIDIA. GPU architecture and downloadable product briefs; a terrestrial computing reference.
- **flight-dgx** — [DGX H100/H200 User Guide — Introduction](https://docs.nvidia.com/dgx/dgxh100-user-guide/introduction-to-dgxh100.html) — NVIDIA. Anatomy of a complete accelerator server: hosts, memory, interconnects, storage, power and packaging. Suggested location: Hardware Overview and Power Specifications.
- **flight-tpu** — [TPU v6e](https://docs.cloud.google.com/tpu/docs/v6e) — Google Cloud. A contrasting accelerator architecture, including memory, host connections and inter-chip topology. Suggested location: System architecture.
- **flight-hpe** — [HPE Spaceborne Computer-2 returns to the International Space Station](https://www.hpe.com/us/en/newsroom/press-release/2024/01/hpe-spaceborne-computer-2-returns-to-the-international-space-station.html) — Hewlett Packard Enterprise. A documented commercial-server experiment aboard the ISS; its accommodation differs from an unpressurized free flyer.
- **flight-micron** — [7450 NVMe SSD](https://www.micron.com/products/storage/ssd/data-center-ssd/7450-ssd) — Micron. Enterprise SSD family, interfaces, form factors and linked technical briefs.
- **flight-fsm** — [FSM-C VPX Flash Storage Module Carrier](https://defense-solutions.curtisswright.com/products/storage-recorders/modules-drives/fsm-c) — Curtiss-Wright. A conduction-cooled carrier around a commercial SATA drive; useful for understanding packaging boundaries.
- **flight-quantum** — [QM97XX NDR InfiniBand Switch Systems User Manual](https://networking-docs.nvidia.com/qm97x0hw) — NVIDIA. A terrestrial fabric reference with port configurations, cooling, interfaces and specifications.
- **flight-spacewire** — [SpaceWire](https://www.esa.int/Enabling_Support/Space_Engineering_Technology/Onboard_Computers_and_Data_Handling/SpaceWire) — European Space Agency. Introduces onboard serial links, routers and the associated ECSS standards.
- **flight-avionics** — [State-of-the-Art of Small Spacecraft Technology — Small Spacecraft Avionics](https://www.nasa.gov/smallsat-institute/sst-soa/small-spacecraft-avionics/) — NASA. Onboard computing architectures, interfaces, software and radiation mitigation. Small-spacecraft examples need scale-specific interpretation.
- **flight-power** — [State-of-the-Art of Small Spacecraft Technology — Power](https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/) — NASA. A starting guide to solar generation, rechargeable storage and electrical power systems.
- **flight-saftware** — [Space batteries](https://saft.com/en/market-sectors/aerospace-performance/space) — Saft. Space-cell and battery capabilities, including integrated packs and cell balancing.
- **flight-ves16** — [VES 16 — Long life high DOD LEO Space Cell](https://saft4u.saft.com/en/download_file/0161cebe-24b5-4e32-9a12-ca5c2a130d19/English) — Saft. Cell-level charge, discharge, temperature and life specifications. These are not complete-pack ratings.
- **flight-battery-workshop** — [NASA Aerospace Battery Workshop — Past Presentations](https://www.nasa.gov/nasa-aerospace-battery-workshop/) — NASA. Accessible battery life-test and mission-experience presentations, including Saft VES16 results.
- **flight-crisa** — [Power Conditioning and Distribution Units](https://www.airbus.com/en/products-services/space/equipment/power/power-conditioning-and-distribution-units) — Airbus Crisa. EVO and MEGA PCDU families, power regulators and downloadable technical sheets.
- **flight-spectrolab** — [Space photovoltaics](https://www.spectrolab.com/photovoltaics.html) — Spectrolab. Multijunction cell choices, beginning/end-of-life performance and panel integration information.
- **flight-rosa** — [Roll Out Solar Array — ROSA](https://rdw.com/product-archive/power/rosa/) — Redwire. Rollable photovoltaic blankets, strain-energy deployment and reference array configurations.
- **flight-rosa-nasa** — [Impact Story: Roll-Out Solar Arrays](https://www.nasa.gov/directorates/stmd/impact-story-roll-out-solar-arrays/) — NASA. Explains the development and deployment principle of ROSA with mission examples.
- **flight-thermal** — [State-of-the-Art of Small Spacecraft Technology — Thermal Control](https://www.nasa.gov/smallsat-institute/sst-soa/thermal-control/) — NASA. Passive surfaces, blankets, heat pipes, radiators, heaters and active thermal technologies.
- **flight-iss-thermal** — [Active Thermal Control System Overview](https://www.nasa.gov/wp-content/uploads/2021/02/473486main_iss_atcs_overview.pdf) — NASA / ISS program. A worked system example connecting cold plates, heat exchangers, ammonia loops, pumps and radiators.
- **flight-act** — [Copper/Water Heat Pipes and HiK Plates for Spacecraft Applications](https://www.1-act.com/resources/learning-center/case-studies/copperwater-heat-pipes-and-hik-plates-for-spacecraft-applications/) — Advanced Cooling Technologies. Heat spreading and the Advanced Passive Thermal experiment; a useful precedent for local thermal paths.
- **flight-redwire-thermal** — [Orbital Data Centers: Power and Thermal Management for Scalable Architectures](https://rdw.com/wp-content/uploads/2026/05/RDW26-053-ODC-Power-Thermal-Study-White-Paper-R11-Digital.pdf) — Redwire. A published radiator-mounted compute concept and the architectural motivation for short thermal paths. Suggested location: Thermal architecture, printed page 9.
- **flight-starcatcher** — [The orbital data center power problem — and how to solve it](https://www.star-catcher.com/news/the-orbital-data-center-power-problem-and-how-to-solve-it) — Star Catcher. A systems-level discussion of power and heat lift. It does not identify a qualified heat pump for this workbench.
- **flight-osr** — [Optical Solar Reflectors](https://www.excelitas.com/file-download/download/public/58606?filename=Qioptiq_Space-Qualified_Solar_Reflectors_Datasheet.pdf) — Qioptiq / Excelitas. Examples of solar absorptance, infrared emittance, glass options and conductive coatings.
- **flight-az93** — [AZ-93 white thermal-control coating](https://www.aztechnology.com/product/1/az-93) — AZ Technology. Optical properties and environmental test information for a real white spacecraft coating.
- **flight-mli** — [Satellite Multilayer Insulation](https://www.beyondgravity.com/en/satellites/thermal-control-solutions/satellite-insulation) — Beyond Gravity. Mission-tailored blankets, their construction and examples of spacecraft applications.
- **flight-gnc** — [State-of-the-Art of Small Spacecraft Technology — Guidance, Navigation, and Control](https://www.nasa.gov/smallsat-institute/sst-soa/guidance-navigation-and-control/) — NASA. Sensors, estimation, actuators and practical distinctions between attitude knowledge and control.
- **flight-cmg** — [CMG 15-45 S](https://www.airbus.com/sites/g/files/jlcbta136/files/2022-02/AVIONICS-CMG15-45-v5-2022.pdf) — Airbus Defence and Space. A real control-moment-gyro reference, with wheel/gimbal diagrams and separate torque and momentum ratings.
- **flight-cmg-design** — [Design Considerations for Miniaturized Control Moment Gyroscopes for Rapid Retargeting and Precision Pointing of Small Satellites](https://ntrs.nasa.gov/citations/20150003779) — NASA Technical Reports Server. Engineering tradeoffs between rapid slews, precision pointing and small CMG design.
- **flight-rod** — [Magnetorquer Rods](https://www.newspacesystems.com/products/magnetorquer-rods/) — NewSpace Systems. Rod configurations, magnetic-moment tailoring and manufacturer-reported applications.
- **flight-wheel** — [Reaction Wheels](https://www.newspacesystems.com/products/reaction-wheels/) — NewSpace Systems. A conventional momentum-exchange alternative to CMGs.
- **flight-hydra** — [Hydra star tracker range](https://sodern.com/en/ranges/hydra) — Sodern. Optical heads, baffles, processing options and mission-dependent configurations.
- **flight-anywaves** — [S-Band TT&C Antenna](https://anywaves.com/products/s-band-ttc-antenna/) — Anywaves. Beam coverage, polarization, electrical interface and the distinction between an antenna and a complete radio.
- **flight-comms** — [State-of-the-Art of Small Spacecraft Technology — Communications](https://www.nasa.gov/smallsat-institute/sst-soa/soa-communications/) — NASA. RF and optical link architectures, antennas, radios, ground stations and design considerations.
- **flight-nisar** — [Ka-band High-Rate Downlink System for the NISAR Mission](https://ntrs.nasa.gov/citations/20210008861) — NASA JPL. A high-rate RF architecture including coding, dual polarization and ground-system requirements.
- **flight-tbird** — [TeraByte InfraRed Delivery — TBIRD](https://www.ll.mit.edu/r-d/projects/terabyte-infrared-delivery-tbird) — MIT Lincoln Laboratory. A demonstrated optical downlink, including body pointing and the role of buffering and retransmission.
- **flight-tesat** — [SCOT80 optical terminals for a GPS demonstration](https://www.tesat.de/news/press/1031-tesat-gov-delivers-scot80-for-lockheed-martin-gps-demonstration) — TESAT. A real optical crosslink-terminal example; link standards and flight configuration remain distinct from this study.
- **flight-click** — [CubeSat Laser Infrared CrosslinK — CLICK](https://www.nasa.gov/smallspacecraft/what-is-click/) — NASA. Fine-steering mirrors and optical crosslink acquisition in a different size and rate class.
- **flight-engine** — [400 N Bipropellant Apogee Motors](https://www.space-propulsion.com/spacecraft-propulsion/apogee-motors/) — ArianeGroup. S400 engine family, propellants, pressure range, nozzle options and interface drawings.
- **flight-propulsion** — [State-of-the-Art of Small Spacecraft Technology — In-Space Propulsion](https://www.nasa.gov/smallsat-institute/sst-soa/in-space_propulsion/) — NASA. Chemical, electric and other propulsion architectures; useful for comparing mission-level alternatives.
- **flight-feed** — [Spacecraft Propulsion Components](https://www.moog.com/products/propulsion/space-propulsion/spacecraft-propulsion/propulsion-components.html) — Moog. Isolation and thruster valves, regulators and other elements of real propulsion feed systems.
- **flight-pmd** — [Propellant Management Device Tanks](https://www.northropgrumman.com/what-we-do/space/mission-enabling-products/pmd-tanks) — Northrop Grumman. Mission-specific PMD vessels with individual geometry, pressure and material references.
- **flight-pmd-history** — [A Detailed Historical Review of Propellant Management Devices for Low Gravity Propellant Acquisition](https://ntrs.nasa.gov/citations/20170000667) — NASA Technical Reports Server. Explains vanes, sponges and screen-channel acquisition devices and their applications.
- **flight-pressurant-tank** — [Pressurant Tanks](https://www.northropgrumman.com/what-we-do/space/mission-enabling-products/pressurant-tanks) — Northrop Grumman. Metal and composite-overwrapped vessels for high-pressure gas storage.
- **flight-sp8112** — [Pressurization Systems for Liquid Rockets — NASA SP-8112](https://ntrs.nasa.gov/citations/19760015212) — NASA. A downloadable engineering monograph on pressurant requirements, components and integrated system behavior.
- **flight-copv-life** — [COPV Damage Tolerance Life Demonstration Guidelines](https://www.nasa.gov/centers-and-facilities/nesc/copv-damage-tolerance-life-demonstration-guidelines/) — NASA Engineering and Safety Center. Why pressure-vessel evaluation includes load history, inspection, material behavior and damage tolerance.
- **flight-mmh-spec** — [MIL-PRF-27404 — Propellant, Monomethylhydrazine](https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=18796) — Defense Logistics Agency. The official record and revisions for propellant-grade MMH. Use it to distinguish a chemical name from a controlled procurement specification.
- **flight-mon-spec** — [MIL-PRF-26539 — Propellants, Dinitrogen Tetroxide](https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=18374) — Defense Logistics Agency. Defines NTO and mixed-oxide-of-nitrogen grades, including MON-3.
- **flight-mmh-maker** — [Monomethylhydrazine — product information](https://www.mgcnext.co.jp/eng/products/search/detail.html?pdid=176) — Mitsubishi Gas Chemical NEXT. An actual MMH producer listing. Its advertised chemical grade is not automatically the mission propellant grade.
- **flight-cf-nto** — [2024 Form 10-K — Yazoo City facility](https://www.sec.gov/Archives/edgar/data/1324404/000132440425000006/cf-20241231.htm) — CF Industries / U.S. SEC. Identifies dinitrogen-tetroxide production and storage at Yazoo City; it does not specify a purchased flight batch.
- **flight-dla** — [Aerospace Energy](https://www.dla.mil/Energy/Products/Aerospace-Energy/) — Defense Logistics Agency. Explains the aerospace propellant and gas supply chain and identifies controlled product categories.
- **flight-fluid-compatibility** — [Material Compatibility of Common Aerospace Metals in MMH/MON-3 — NESC Technical Bulletin 24-01](https://ntrs.nasa.gov/api/citations/20240004924/downloads/TB_24-01_051324.pdf) — NASA Engineering and Safety Center. Why alloy, propellant condition, wall thickness and exposure evidence matter for MMH/MON-3 hardware.
- **flight-apollo** — [60 Years Ago: First Test Firing of the Apollo Service Propulsion System](https://www.nasa.gov/history/60-years-ago-first-test-firing-of-the-apollo-service-propulsion-system/) — NASA. Aerojet AJ10-137 development and Aerozine-50/NTO heritage. The historical engine is much larger than the study engine heads.
- **flight-apollo-manual** — [Apollo Lunar Module — Main Propulsion](https://www.nasa.gov/wp-content/uploads/static/history/alsj/lm09_main_propulsion_ppmp1-22.pdf) — NASA. Fuel composition, separate propellant systems, helium pressurization and a worked pressure-fed architecture.
- **flight-helium-supply** — [NASA Selects Contractors to Supply Centers with Helium](https://www.nasa.gov/news-release/nasa-selects-contractors-to-supply-centers-with-helium/) — NASA. Documents actual aerospace helium supply by Messer, Linde and Airgas. It does not select a supplier or gas grade for this study.
- **flight-structure** — [State-of-the-Art of Small Spacecraft Technology — Structures, Materials, and Mechanisms](https://www.nasa.gov/smallsat-institute/sst-soa/structures-materials-and-mechanisms/) — NASA. Load-bearing structures, materials, deployables and radiation shielding approaches.
- **flight-beyond-structure** — [Satellite Structures](https://www.beyondgravity.com/en/satellites/mechanical-solutions/satellite-structures) — Beyond Gravity. Examples of mission-specific spacecraft structural assemblies and manufacturing capabilities.
- **flight-hexweb** — [HexWeb Honeycomb](https://www.hexcel.com/Products/Honeycomb/HexWeb-Honeycomb/) — Hexcel. Core materials, cell forms, density choices and linked data sheets for sandwich construction. A core product is not a complete qualified panel.
- **flight-gevs** — [General Environmental Verification Standard — GSFC-STD-7000B](https://standards.nasa.gov/standard/GSFC/GSFC-STD-7000) — NASA Goddard. Environmental verification planning and methods; application is tailored to the project rather than inferred from a rendered model.
- **flight-rha** — [Avionics Radiation Hardness Assurance](https://www.nasa.gov/reference/jsc-radiation/) — NASA Johnson. Distinguishes cumulative dose, displacement damage and single-event effects, and introduces the assurance process. Suggested location: Avionics Radiation Hardness Assurance.
- **flight-juno** — [Juno Jupiter Orbit Insertion Press Kit — Spacecraft](https://www.jpl.nasa.gov/news/press_kits/juno/spacecraft/) — NASA JPL. A spacecraft-level example of a titanium electronics vault and its thermal, power and avionics interfaces. Suggested location: Electronics Vault.
- **flight-sada** — [Type 2 Solar Array Drive Assembly](https://www.moog.com/content/dam/moog/literature/sdg/space/spacecraft-mechanisms/moog-type-2-solar-array-drive-assembly-datasheet.pdf) — Moog. A real drive with actuator, position sensing and slip-ring or cable-transfer considerations.
- **flight-harness** — [Interconnect Cable / Conduit Assemblies](https://www.glenair.com/complex-cables-integrated-and-flex-assemblies/) — Glenair. Power, controlled-impedance, coaxial and optical harness options with linked catalogs.
- **flight-workmanship** — [NASA-STD-8739.4 — Crimping, Interconnecting Cables, Harnesses, and Wiring](https://standards.nasa.gov/standard/nasa/nasa-std-87394) — NASA. Harness design and assembly considerations, including strain relief, identification, terminations and inspection.
- **flight-iau** — [Integrated Avionics Unit](https://www.moog.com/content/dam/moog/literature/sdg/space/avionics/moog-integrated-avionics-unit-datasheet.pdf) — Moog. An example of integrated command/data handling, power interfaces and spacecraft I/O.
- **flight-rad750** — [GPS III satellite launches with RAD750 single-board computers](https://www.baesystems.com/en/article/gps-iii-satellite-launches-with-rad750--single-board-computers) — BAE Systems. Manufacturer evidence for a radiation-hardened flight-computer family.
- **flight-gnss** — [Gemini GPS / GNSS receivers and antennas](https://www.newspacesystems.com/products/gps-receivers-and-antenna/) — NewSpace Systems. Spacecraft navigation and timing receiver examples; antenna accommodation and mission applicability still need analysis.
- **flight-separation** — [Satellite Separation Systems](https://www.beyondgravity.com/en/launchers/separation-systems) — Beyond Gravity. Clamp-band, hard-point, adapter, connector and separation-spring configurations.
- **flight-lightband** — [Motorized Lightband](https://rocketlabcorp.com/space-systems/separation-systems/motorized-lightband/) — Rocket Lab. A motorized separation-ring alternative with linked technical material.
- **flight-falcon-guide** — [Falcon Payload User’s Guide](https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf) — SpaceX. A concrete example of launcher environments, payload interfaces, integration and separation requirements. Apply the selected launcher’s own guide to the active design.

## Final configuration review

Battery prose was compared with the NMC/LFP presets and the finite converter/current limits; it does not assign VES16 NCA-cell qualification to either study pack. Thermal prose was compared with the live energy-system paths, including independent-loop capacity, passive bus strap, cold-control exclusions and heat-pump work accounting. Propulsion prose was checked against both selectable chemistries and the mass model. The helium article explicitly includes initial gas in both the bottle and liquid-tank ullage; helium redistribution does not incorrectly remove it from spacecraft mass. No unresolved configuration contradiction was found in these parent articles.

## Remaining evidence boundaries

No selected supplier bill of materials, pressure-vessel qualification, device radiation lifetime, terminal service contract, heat-pump procurement or launcher acceptance is inferred. Those are explicit study boundaries, not missing educational text. Fluid inventories and unresolved internal shielding retain their appropriate no-separate-solid-geometry status. The module adds learning content without creating fictitious CAD or operational instructions.
