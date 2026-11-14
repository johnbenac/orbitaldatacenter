// Generated losslessly from src/parts-knowledge/part-knowledge-flight.js.
// Edit the authored module, then run npm run package:parts-knowledge.
import {knowledgeText as __kt} from "./part-knowledge-text.js";
// Learning material supplements the live MEL. Supplier examples do not select
// flight hardware, change engineering inputs, or confer qualification.
const reviewed='2026-11-07';
const source=(title,organization,url,kind,description,section='')=>({title,organization,url,kind,description,section,reviewed});
export const flightKnowledgeSources={
 'flight-a100':source('NVIDIA A100 Tensor Core GPU','NVIDIA','https://www.nvidia.com/en-us/data-center/a100/','Product documentation','GPU architecture and downloadable product briefs; a terrestrial computing reference.'),
 'flight-dgx':source('DGX H100/H200 User Guide — Introduction','NVIDIA','https://docs.nvidia.com/dgx/dgxh100-user-guide/introduction-to-dgxh100.html','Hardware manual','Anatomy of a complete accelerator server: hosts, memory, interconnects, storage, power and packaging.','Hardware Overview and Power Specifications'),
 'flight-tpu':source('TPU v6e','Google Cloud','https://docs.cloud.google.com/tpu/docs/v6e','Architecture documentation','A contrasting accelerator architecture, including memory, host connections and inter-chip topology.','System architecture'),
 'flight-hpe':source('HPE Spaceborne Computer-2 returns to the International Space Station','Hewlett Packard Enterprise',__kt[0],'Mission report','A documented commercial-server experiment aboard the ISS; its accommodation differs from an unpressurized free flyer.'),
 'flight-micron':source('7450 NVMe SSD','Micron','https://www.micron.com/products/storage/ssd/data-center-ssd/7450-ssd','Product documentation','Enterprise SSD family, interfaces, form factors and linked technical briefs.'),
 'flight-fsm':source('FSM-C VPX Flash Storage Module Carrier','Curtiss-Wright','https://defense-solutions.curtisswright.com/products/storage-recorders/modules-drives/fsm-c','Product documentation','A conduction-cooled carrier around a commercial SATA drive; useful for understanding packaging boundaries.'),
 'flight-quantum':source('QM97XX NDR InfiniBand Switch Systems User Manual','NVIDIA','https://networking-docs.nvidia.com/qm97x0hw','Hardware manual','A terrestrial fabric reference with port configurations, cooling, interfaces and specifications.'),
 'flight-spacewire':source('SpaceWire','European Space Agency','https://www.esa.int/Enabling_Support/Space_Engineering_Technology/Onboard_Computers_and_Data_Handling/SpaceWire','Technical introduction','Introduces onboard serial links, routers and the associated ECSS standards.'),
 'flight-avionics':source('State-of-the-Art of Small Spacecraft Technology — Small Spacecraft Avionics','NASA','https://www.nasa.gov/smallsat-institute/sst-soa/small-spacecraft-avionics/','Technical survey',__kt[1]),
 'flight-power':source('State-of-the-Art of Small Spacecraft Technology — Power','NASA','https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/','Technical survey','A starting guide to solar generation, rechargeable storage and electrical power systems.'),
 'flight-saftware':source('Space batteries','Saft','https://saft.com/en/market-sectors/aerospace-performance/space','Supplier overview','Space-cell and battery capabilities, including integrated packs and cell balancing.'),
 'flight-ves16':source('VES 16 — Long life high DOD LEO Space Cell','Saft','https://saft4u.saft.com/en/download_file/0161cebe-24b5-4e32-9a12-ca5c2a130d19/English','Cell datasheet','Cell-level charge, discharge, temperature and life specifications. These are not complete-pack ratings.'),
 'flight-battery-workshop':source('NASA Aerospace Battery Workshop — Past Presentations','NASA','https://www.nasa.gov/nasa-aerospace-battery-workshop/','Technical presentation collection','Accessible battery life-test and mission-experience presentations, including Saft VES16 results.'),
 'flight-crisa':source('Power Conditioning and Distribution Units','Airbus Crisa','https://www.airbus.com/en/products-services/space/equipment/power/power-conditioning-and-distribution-units','Supplier documentation','EVO and MEGA PCDU families, power regulators and downloadable technical sheets.'),
 'flight-spectrolab':source('Space photovoltaics','Spectrolab','https://www.spectrolab.com/photovoltaics.html','Cell and panel documentation','Multijunction cell choices, beginning/end-of-life performance and panel integration information.'),
 'flight-rosa':source('Roll Out Solar Array — ROSA','Redwire','https://rdw.com/product-archive/power/rosa/','Product documentation','Rollable photovoltaic blankets, strain-energy deployment and reference array configurations.'),
 'flight-rosa-nasa':source('Impact Story: Roll-Out Solar Arrays','NASA','https://www.nasa.gov/directorates/stmd/impact-story-roll-out-solar-arrays/','Technology history','Explains the development and deployment principle of ROSA with mission examples.'),
 'flight-thermal':source('State-of-the-Art of Small Spacecraft Technology — Thermal Control','NASA','https://www.nasa.gov/smallsat-institute/sst-soa/thermal-control/','Technical survey','Passive surfaces, blankets, heat pipes, radiators, heaters and active thermal technologies.'),
 'flight-iss-thermal':source('Active Thermal Control System Overview','NASA / ISS program','https://www.nasa.gov/wp-content/uploads/2021/02/473486main_iss_atcs_overview.pdf','System overview PDF','A worked system example connecting cold plates, heat exchangers, ammonia loops, pumps and radiators.'),
 'flight-act':source('Copper/Water Heat Pipes and HiK Plates for Spacecraft Applications','Advanced Cooling Technologies',__kt[2],'Supplier technical case study','Heat spreading and the Advanced Passive Thermal experiment; a useful precedent for local thermal paths.'),
 'flight-redwire-thermal':source('Orbital Data Centers: Power and Thermal Management for Scalable Architectures','Redwire','https://rdw.com/wp-content/uploads/2026/05/RDW26-053-ODC-Power-Thermal-Study-White-Paper-R11-Digital.pdf','Concept white paper','A published radiator-mounted compute concept and the architectural motivation for short thermal paths.','Thermal architecture, printed page 9'),
 'flight-starcatcher':source('The orbital data center power problem — and how to solve it','Star Catcher','https://www.star-catcher.com/news/the-orbital-data-center-power-problem-and-how-to-solve-it','Concept analysis','A systems-level discussion of power and heat lift. It does not identify a qualified heat pump for this workbench.'),
 'flight-osr':source('Optical Solar Reflectors','Qioptiq / Excelitas',__kt[3],'Surface datasheet','Examples of solar absorptance, infrared emittance, glass options and conductive coatings.'),
 'flight-az93':source('AZ-93 white thermal-control coating','AZ Technology','https://www.aztechnology.com/product/1/az-93','Coating documentation','Optical properties and environmental test information for a real white spacecraft coating.'),
 'flight-mli':source('Satellite Multilayer Insulation','Beyond Gravity','https://www.beyondgravity.com/en/satellites/thermal-control-solutions/satellite-insulation','Supplier overview','Mission-tailored blankets, their construction and examples of spacecraft applications.'),
 'flight-gnc':source('State-of-the-Art of Small Spacecraft Technology — Guidance, Navigation, and Control','NASA','https://www.nasa.gov/smallsat-institute/sst-soa/guidance-navigation-and-control/','Technical survey','Sensors, estimation, actuators and practical distinctions between attitude knowledge and control.'),
 'flight-cmg':source('CMG 15-45 S','Airbus Defence and Space','https://www.airbus.com/sites/g/files/jlcbta136/files/2022-02/AVIONICS-CMG15-45-v5-2022.pdf','Mechanism datasheet','A real control-moment-gyro reference, with wheel/gimbal diagrams and separate torque and momentum ratings.'),
 'flight-cmg-design':source(__kt[4],'NASA Technical Reports Server','https://ntrs.nasa.gov/citations/20150003779','Research paper','Engineering tradeoffs between rapid slews, precision pointing and small CMG design.'),
 'flight-rod':source('Magnetorquer Rods','NewSpace Systems','https://www.newspacesystems.com/products/magnetorquer-rods/','Product documentation','Rod configurations, magnetic-moment tailoring and manufacturer-reported applications.'),
 'flight-wheel':source('Reaction Wheels','NewSpace Systems','https://www.newspacesystems.com/products/reaction-wheels/','Product documentation','A conventional momentum-exchange alternative to CMGs.'),
 'flight-hydra':source('Hydra star tracker range','Sodern','https://sodern.com/en/ranges/hydra','Product documentation','Optical heads, baffles, processing options and mission-dependent configurations.'),
 'flight-anywaves':source('S-Band TT&C Antenna','Anywaves','https://anywaves.com/products/s-band-ttc-antenna/','Antenna documentation','Beam coverage, polarization, electrical interface and the distinction between an antenna and a complete radio.'),
 'flight-comms':source('State-of-the-Art of Small Spacecraft Technology — Communications','NASA','https://www.nasa.gov/smallsat-institute/sst-soa/soa-communications/','Technical survey','RF and optical link architectures, antennas, radios, ground stations and design considerations.'),
 'flight-nisar':source('Ka-band High-Rate Downlink System for the NISAR Mission','NASA JPL','https://ntrs.nasa.gov/citations/20210008861','Technical paper record','A high-rate RF architecture including coding, dual polarization and ground-system requirements.'),
 'flight-tbird':source('TeraByte InfraRed Delivery — TBIRD','MIT Lincoln Laboratory','https://www.ll.mit.edu/r-d/projects/terabyte-infrared-delivery-tbird','Mission overview and video','A demonstrated optical downlink, including body pointing and the role of buffering and retransmission.'),
 'flight-tesat':source('SCOT80 optical terminals for a GPS demonstration','TESAT','https://www.tesat.de/news/press/1031-tesat-gov-delivers-scot80-for-lockheed-martin-gps-demonstration','Supplier announcement','A real optical crosslink-terminal example; link standards and flight configuration remain distinct from this study.'),
 'flight-click':source('CubeSat Laser Infrared CrosslinK — CLICK','NASA','https://www.nasa.gov/smallspacecraft/what-is-click/','Mission technology overview','Fine-steering mirrors and optical crosslink acquisition in a different size and rate class.'),
 'flight-engine':source('400 N Bipropellant Apogee Motors','ArianeGroup','https://www.space-propulsion.com/spacecraft-propulsion/apogee-motors/','Engine documentation','S400 engine family, propellants, pressure range, nozzle options and interface drawings.'),
 'flight-propulsion':source('State-of-the-Art of Small Spacecraft Technology — In-Space Propulsion','NASA','https://www.nasa.gov/smallsat-institute/sst-soa/in-space_propulsion/','Technical survey','Chemical, electric and other propulsion architectures; useful for comparing mission-level alternatives.'),
 'flight-feed':source('Spacecraft Propulsion Components','Moog','https://www.moog.com/products/propulsion/space-propulsion/spacecraft-propulsion/propulsion-components.html','Component catalog','Isolation and thruster valves, regulators and other elements of real propulsion feed systems.'),
 'flight-pmd':source('Propellant Management Device Tanks','Northrop Grumman','https://www.northropgrumman.com/what-we-do/space/mission-enabling-products/pmd-tanks','Tank catalog','Mission-specific PMD vessels with individual geometry, pressure and material references.'),
 'flight-pmd-history':source('A Detailed Historical Review of Propellant Management Devices for Low Gravity Propellant Acquisition','NASA Technical Reports Server','https://ntrs.nasa.gov/citations/20170000667','Technical review','Explains vanes, sponges and screen-channel acquisition devices and their applications.'),
 'flight-pressurant-tank':source('Pressurant Tanks','Northrop Grumman','https://www.northropgrumman.com/what-we-do/space/mission-enabling-products/pressurant-tanks','Supplier documentation','Metal and composite-overwrapped vessels for high-pressure gas storage.'),
 'flight-sp8112':source('Pressurization Systems for Liquid Rockets — NASA SP-8112','NASA','https://ntrs.nasa.gov/citations/19760015212','Design monograph','A downloadable engineering monograph on pressurant requirements, components and integrated system behavior.'),
 'flight-copv-life':source('COPV Damage Tolerance Life Demonstration Guidelines','NASA Engineering and Safety Center','https://www.nasa.gov/centers-and-facilities/nesc/copv-damage-tolerance-life-demonstration-guidelines/','Engineering guidance','Why pressure-vessel evaluation includes load history, inspection, material behavior and damage tolerance.'),
 'flight-mmh-spec':source('MIL-PRF-27404 — Propellant, Monomethylhydrazine','Defense Logistics Agency','https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=18796','Material specification record',__kt[5]),
 'flight-mon-spec':source('MIL-PRF-26539 — Propellants, Dinitrogen Tetroxide','Defense Logistics Agency','https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=18374','Material specification record','Defines NTO and mixed-oxide-of-nitrogen grades, including MON-3.'),
 'flight-mmh-maker':source('Monomethylhydrazine — product information','Mitsubishi Gas Chemical NEXT','https://www.mgcnext.co.jp/eng/products/search/detail.html?pdid=176','Chemical product listing','An actual MMH producer listing. Its advertised chemical grade is not automatically the mission propellant grade.'),
 'flight-cf-nto':source('2024 Form 10-K — Yazoo City facility','CF Industries / U.S. SEC','https://www.sec.gov/Archives/edgar/data/1324404/000132440425000006/cf-20241231.htm','Manufacturer filing','Identifies dinitrogen-tetroxide production and storage at Yazoo City; it does not specify a purchased flight batch.'),
 'flight-dla':source('Aerospace Energy','Defense Logistics Agency','https://www.dla.mil/Energy/Products/Aerospace-Energy/','Procurement reference','Explains the aerospace propellant and gas supply chain and identifies controlled product categories.'),
 'flight-fluid-compatibility':source('Material Compatibility of Common Aerospace Metals in MMH/MON-3 — NESC Technical Bulletin 24-01','NASA Engineering and Safety Center','https://ntrs.nasa.gov/api/citations/20240004924/downloads/TB_24-01_051324.pdf','Technical bulletin','Why alloy, propellant condition, wall thickness and exposure evidence matter for MMH/MON-3 hardware.'),
 'flight-apollo':source('60 Years Ago: First Test Firing of the Apollo Service Propulsion System','NASA','https://www.nasa.gov/history/60-years-ago-first-test-firing-of-the-apollo-service-propulsion-system/','Mission engineering history',__kt[6]),
 'flight-apollo-manual':source('Apollo Lunar Module — Main Propulsion','NASA','https://www.nasa.gov/wp-content/uploads/static/history/alsj/lm09_main_propulsion_ppmp1-22.pdf','Historical system manual','Fuel composition, separate propellant systems, helium pressurization and a worked pressure-fed architecture.'),
 'flight-helium-supply':source('NASA Selects Contractors to Supply Centers with Helium','NASA','https://www.nasa.gov/news-release/nasa-selects-contractors-to-supply-centers-with-helium/','Procurement announcement',__kt[7]),
 'flight-structure':source('State-of-the-Art of Small Spacecraft Technology — Structures, Materials, and Mechanisms','NASA','https://www.nasa.gov/smallsat-institute/sst-soa/structures-materials-and-mechanisms/','Technical survey','Load-bearing structures, materials, deployables and radiation shielding approaches.'),
 'flight-beyond-structure':source('Satellite Structures','Beyond Gravity','https://www.beyondgravity.com/en/satellites/mechanical-solutions/satellite-structures','Supplier overview','Examples of mission-specific spacecraft structural assemblies and manufacturing capabilities.'),
 'flight-hexweb':source('HexWeb Honeycomb','Hexcel','https://www.hexcel.com/Products/Honeycomb/HexWeb-Honeycomb/','Material catalog',__kt[8]),
 'flight-gevs':source('General Environmental Verification Standard — GSFC-STD-7000B','NASA Goddard','https://standards.nasa.gov/standard/GSFC/GSFC-STD-7000','Verification guide',__kt[9]),
 'flight-rha':source('Avionics Radiation Hardness Assurance','NASA Johnson','https://www.nasa.gov/reference/jsc-radiation/','Engineering introduction','Distinguishes cumulative dose, displacement damage and single-event effects, and introduces the assurance process.','Avionics Radiation Hardness Assurance'),
 'flight-juno':source('Juno Jupiter Orbit Insertion Press Kit — Spacecraft','NASA JPL','https://www.jpl.nasa.gov/news/press_kits/juno/spacecraft/','Mission reference','A spacecraft-level example of a titanium electronics vault and its thermal, power and avionics interfaces.','Electronics Vault'),
 'flight-sada':source('Type 2 Solar Array Drive Assembly','Moog',__kt[10],'Mechanism datasheet','A real drive with actuator, position sensing and slip-ring or cable-transfer considerations.'),
 'flight-harness':source('Interconnect Cable / Conduit Assemblies','Glenair','https://www.glenair.com/complex-cables-integrated-and-flex-assemblies/','Supplier documentation','Power, controlled-impedance, coaxial and optical harness options with linked catalogs.'),
 'flight-workmanship':source('NASA-STD-8739.4 — Crimping, Interconnecting Cables, Harnesses, and Wiring','NASA','https://standards.nasa.gov/standard/nasa/nasa-std-87394','Workmanship standard','Harness design and assembly considerations, including strain relief, identification, terminations and inspection.'),
 'flight-iau':source('Integrated Avionics Unit','Moog','https://www.moog.com/content/dam/moog/literature/sdg/space/avionics/moog-integrated-avionics-unit-datasheet.pdf','Avionics datasheet','An example of integrated command/data handling, power interfaces and spacecraft I/O.'),
 'flight-rad750':source('GPS III satellite launches with RAD750 single-board computers','BAE Systems','https://www.baesystems.com/en/article/gps-iii-satellite-launches-with-rad750--single-board-computers','Flight hardware report','Manufacturer evidence for a radiation-hardened flight-computer family.'),
 'flight-gnss':source('Gemini GPS / GNSS receivers and antennas','NewSpace Systems','https://www.newspacesystems.com/products/gps-receivers-and-antenna/','Product documentation',__kt[11]),
 'flight-separation':source('Satellite Separation Systems','Beyond Gravity','https://www.beyondgravity.com/en/launchers/separation-systems','Supplier documentation','Clamp-band, hard-point, adapter, connector and separation-spring configurations.'),
 'flight-lightband':source('Motorized Lightband','Rocket Lab','https://rocketlabcorp.com/space-systems/separation-systems/motorized-lightband/','Product documentation','A motorized separation-ring alternative with linked technical material.'),
 'flight-falcon-guide':source('Falcon Payload User’s Guide','SpaceX','https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf','Payload user guide',__kt[12])
};
const p=(text,...sources)=>({text,sources});
const sec=(id,title,...paragraphs)=>({id,title,paragraphs});
const supplier=(name,offering,note,...sources)=>({name,offering,note,sources});
const alternative=(name,description,tradeoff,...sources)=>({name,description,tradeoff,sources});
const term=(term,definition)=>({term,definition});
const flight=(...ids)=>ids.map(id=>'flight:'+id);
const articles={
 '01.01':{
  summary:__kt[13],
  sections:[
   sec('purpose','The computing payload',
    p(__kt[14],'flight-a100','flight-tpu'),
    p(__kt[15])),
   sec('operation','From silicon to the radiator',
    p(__kt[16]),
    p(__kt[17],'flight-dgx')),
   sec('engineering','What sets the design',
    p(__kt[18]),
    p(__kt[19],'flight-rha','flight-hpe'))
  ],
  suppliers:[supplier('NVIDIA','A100 and DGX H100/H200 references',__kt[20],'flight-a100','flight-dgx'),supplier('Google','TPU v6e / Trillium',__kt[21],'flight-tpu')],
  alternatives:[alternative('GPU, TPU or another accelerator architecture','Choose against the actual model, precision, memory capacity and software stack.','Changing the chip also changes host software, data movement, packaging and qualification work.','flight-a100','flight-tpu'),alternative('Distribute compute close to radiator surfaces','Shorten heat-transport paths by spreading the payload across modules.','More distributed modules require electrical/data routing and structural accommodation.','flight-redwire-thermal')],
  inspection:[__kt[22]],
  terms:[term('HBM','High-bandwidth memory placed close to an accelerator.'),term('Heat flux','Heat flow per unit contact or surface area.'),term('Checkpoint','A saved computation state from which work can resume.')],
  relatedIds:flight('01.02','01.04','02.03','03.01','03.02'),sourceIds:['flight-a100','flight-dgx','flight-tpu','flight-hpe','flight-rha','flight-redwire-thermal']
 },
 '01.02':{
  summary:__kt[23],
  sections:[
   sec('purpose','The rest of the computer',
    p(__kt[24]),
    p(__kt[25],'flight-dgx')),
   sec('operation','Packaging is an engineering function',
    p(__kt[26]),
    p(__kt[27],'flight-gevs')),
   sec('engineering','Host capacity and spacecraft authority',
    p(__kt[28]),
    p(__kt[29],'flight-hpe','flight-avionics'))
  ],
  suppliers:[supplier('Hewlett Packard Enterprise','Spaceborne Computer-2',__kt[30],'flight-hpe'),supplier('NVIDIA','DGX H100/H200 server architecture','A complete-system reference for understanding the supporting host resources around accelerators.','flight-dgx')],
  alternatives:[alternative('One host per tray','Keep each tray an independently addressable compute unit.','More hosts add idle power and software instances, while localizing workload and hardware boundaries.'),alternative('Shared hosts for several accelerator trays','Consolidate host resources and reduce repeated support hardware.','The shared host and its interconnect can become throughput, availability and integration bottlenecks.','flight-dgx'),alternative('Conduction-cooled modular electronics','Use card carriers and controlled thermal interfaces.','Packaging flexibility must be reconciled with connector standards and heat-transfer capacity.','flight-fsm')],
  inspection:['Look at the carrier and mounting surfaces, then select Installed to see the tray’s place in the structure.'],
  terms:[term('Host','The processor and system software coordinating accelerator work.'),term('Datum','A reference surface or point used to locate hardware accurately.')],
  relatedIds:flight('01.01','01.03','01.04','07.01','08.01'),sourceIds:['flight-dgx','flight-hpe','flight-fsm','flight-avionics','flight-gevs']
 },
 '01.03':{
  summary:__kt[31],
  sections:[
   sec('purpose','Capacity is only one requirement',
    p(__kt[32]),
    p(__kt[33],'flight-micron')),
   sec('operation','How a flash-storage subsystem behaves',
    p(__kt[34]),
    p(__kt[35],'flight-fsm')),
   sec('engineering','Preserving useful work',
    p(__kt[36]),
    p(__kt[37],'flight-hpe','flight-rha'))
  ],
  suppliers:[supplier('Micron','7450 NVMe SSD family',__kt[38],'flight-micron'),supplier('Curtiss-Wright','FSM-C storage carrier','A rugged conduction-cooled packaging comparison with SATA storage, not a drop-in substitute for an NVMe flight module.','flight-fsm'),supplier('KIOXIA / HPE','ISS Spaceborne Computer-2 storage','Documented flash hardware used aboard an ISS-hosted server experiment.','flight-hpe')],
  alternatives:[alternative('Local storage on every compute tray','Keep frequently used models and working files close to their processors.','Repeated copies consume capacity and require version synchronization.'),alternative('Shared storage pool','Concentrate capacity and simplify some data-management tasks.','Fabric bandwidth and shared-control availability become more important.','flight-quantum'),alternative('Reduce or schedule generated data','Choose checkpoint cadence, compression and retention according to the mission.','Recomputation and recovery time can increase when fewer intermediate states are retained.')],
  inspection:[__kt[39]],
  terms:[term('DWPD','Drive writes per day, an endurance measure tied to capacity and warranty conditions.'),term('Goodput','Useful delivered data rate after protocol overhead and retransmissions.')],
  relatedIds:flight('01.01','01.04','05.02','05.03'),sourceIds:['flight-micron','flight-fsm','flight-hpe','flight-rha','flight-quantum']
 },
 '01.04':{
  summary:__kt[40],
  sections:[
   sec('purpose','Several different kinds of traffic',
    p(__kt[41]),
    p(__kt[42],'flight-avionics')),
   sec('operation','Links, switches and bottlenecks',
    p(__kt[43]),
    p(__kt[44],'flight-quantum','flight-spacewire')),
   sec('engineering','What to compare',
    p(__kt[45]),
    p(__kt[46]))
  ],
  suppliers:[supplier('NVIDIA','Quantum-2 / QM97XX InfiniBand switches','A terrestrial high-bandwidth network reference with detailed port and interface documentation.','flight-quantum'),supplier('ESA / ECSS ecosystem','SpaceWire onboard links and routers',__kt[47],'flight-spacewire')],
  alternatives:[alternative('Ethernet-based fabric','Use a broad networking ecosystem and standard host interfaces.',__kt[48],'flight-dgx'),alternative('InfiniBand or accelerator-specific interconnect','Optimize for tightly coupled distributed compute.','Software, adapters, switching and physical integration become tied to the selected ecosystem.','flight-quantum','flight-tpu'),alternative('Separate service and payload networks','Reserve spacecraft control paths from customer data traffic.','Bridges, monitoring and additional interfaces add integration work.','flight-spacewire','flight-avionics')],
  inspection:[__kt[49]],
  terms:[term('Oversubscription','More potential input traffic than a shared output path can carry.'),term('Collective','A coordinated data exchange involving multiple computing devices.')],
  relatedIds:flight('01.01','01.02','01.03','05.02','05.03','07.05','08.01'),sourceIds:['flight-quantum','flight-spacewire','flight-dgx','flight-tpu','flight-avionics']
 },
 '02.01':{
  summary:__kt[50],
  sections:[
   sec('purpose','From sunlight to a working power supply',
    p(__kt[51],'flight-power'),
    p(__kt[52])),
   sec('operation','Cells and deployable structure',
    p(__kt[53],'flight-spectrolab'),
    p(__kt[54],'flight-rosa','flight-rosa-nasa')),
   sec('engineering','Area brings consequences',
    p(__kt[55]),
    p(__kt[56]))
  ],
  suppliers:[supplier('Redwire','ROSA solar-array family',__kt[57],'flight-rosa'),supplier('Boeing Spectrolab','Multijunction cells and space panels','Cell and panel supplier examples; substrate, cell choice and mission conditions determine the integrated result.','flight-spectrolab')],
  alternatives:[alternative('Rigid hinged panels','Use panel stiffness and discrete hinge lines to deploy a wing.','The stowed stack, hinge count and panel mass differ from a rolled blanket.','flight-power'),alternative('Rollable blanket arrays','Pack a large collecting surface into a compact stowed form.','Boom behavior, blanket tension, deployment dynamics and current routing need coordinated design.','flight-rosa'),alternative('Body-mounted cells','Avoid a major deployable mechanism for a small power demand.','Available area and changing orientation usually constrain sustained computing power.','flight-power')],
  inspection:[__kt[58]],
  terms:[term('BOL / EOL','Beginning / end of life; ratings depend on the stated conditions.'),term('MPP','The operating point at which a photovoltaic source delivers maximum electrical power.')],
  relatedIds:flight('02.02','02.03','04.01','07.04','07.05'),sourceIds:['flight-power','flight-spectrolab','flight-rosa','flight-rosa-nasa']
 },
 '02.02':{
  summary:__kt[59],
  sections:[
   sec('purpose','Why the spacecraft needs a battery',
    p(__kt[60],'flight-power'),
    p(__kt[61])),
   sec('operation','Cells, balancing and thermal control',
    p(__kt[62]),
    p(__kt[63],'flight-saftware','flight-ves16')),
   sec('engineering','What governs useful life',
    p(__kt[64],'flight-battery-workshop'),
    p(__kt[65]))
  ],
  suppliers:[supplier('Saft','Space lithium-ion cells, modules and batteries',__kt[66],'flight-saftware','flight-ves16'),supplier('NASA Aerospace Battery Workshop','Battery test and mission experience','A learning collection rather than a hardware vendor, useful for understanding the conditions behind life claims.','flight-battery-workshop')],
  alternatives:[alternative('NMC study pack','Use the higher specific-energy option represented in the workbench.',__kt[67]),alternative('LFP study pack','Compare a different cell-chemistry and pack-performance assumption.',__kt[68]),alternative('Smaller pack with scheduled payload demand','Reduce computing during eclipse or other constrained periods.','This trades continuous service and completion time against storage mass and recharge demand.')],
  inspection:[__kt[69]],
  terms:[term('Depth of discharge','The fraction of rated capacity withdrawn during a cycle.'),term('C-rate','Charge or discharge current expressed relative to rated capacity.'),term('BMS','Battery-management electronics and control functions.')],
  relatedIds:flight('02.01','02.03','03.02','07.05'),sourceIds:['flight-power','flight-saftware','flight-ves16','flight-battery-workshop']
 },
 '02.03':{
  summary:__kt[70],
  sections:[
   sec('purpose','The electrical traffic controller',
    p(__kt[71],'flight-crisa'),
    p(__kt[72])),
   sec('operation','MPPT, conversion and protection',
    p(__kt[73],'flight-power','flight-crisa'),
    p(__kt[74])),
   sec('engineering','Voltage is an architectural choice',
    p(__kt[75]),
    p(__kt[76],'flight-crisa'))
  ],
  suppliers:[supplier('Airbus Crisa','MEGA and EVO PCDU families',__kt[77],'flight-crisa'),supplier('Moog','Integrated Avionics Unit',__kt[78],'flight-iau')],
  alternatives:[alternative('MPPT source regulation','Operate array strings near their best power point as illumination and temperature change.','Additional conversion and control must be accommodated and verified.','flight-crisa'),alternative('Direct energy transfer','Use an array/battery/bus architecture with more direct source coupling.','Array matching and regulation behavior become different design constraints.','flight-crisa'),alternative('Distributed conversion near loads','Move some voltage conversion close to the computing trays.','This can reduce low-voltage routing loss while spreading heat and increasing the number of electronics modules.')],
  inspection:[__kt[79]],
  terms:[term('PCDU','Power conditioning and distribution unit.'),term('Inrush','A brief startup current that can exceed the steady operating current.'),term('Bus','A shared electrical supply and its defined voltage range.')],
  relatedIds:flight('02.01','02.02','07.05','08.01'),sourceIds:['flight-crisa','flight-power','flight-iau']
 }
};

function radiatorArticle(hardware){
 const kind=hardware?.energySystem?.thermal?.kind||'pumped';
 const local=kind==='passive-local',lift=kind==='heat-lift';
 return {
  summary:local?__kt[80]:__kt[81],
  sections:[
   sec('purpose','Where the waste heat goes',
    p(__kt[82],'flight-thermal'),
    p(local?__kt[83]:lift?__kt[84]:__kt[85],local?'flight-redwire-thermal':lift?'flight-starcatcher':'flight-iss-thermal')),
   sec('operation','Temperature and the view to space',
    p(__kt[86]),
    p(__kt[87],'flight-az93','flight-osr')),
   sec('engineering','Panel area is not the whole design',
    p(__kt[88]),
    p(__kt[89],'flight-gevs'))
  ],
  suppliers:[supplier('AZ Technology','AZ-93 thermal-control coating',__kt[90],'flight-az93'),supplier('Qioptiq / Excelitas','Optical solar reflectors',__kt[91],'flight-osr'),...(local?[supplier('Redwire','Orbital data center power/thermal concept','The published local-compute platform motivates this architecture; its concept geometry is not supplier CAD.','flight-redwire-thermal')]:[])],
  alternatives:[alternative('White paint or optical solar reflectors','Select a finish around the required solar absorption, infrared emission and integration process.','Coating application and bonded tiles have different manufacturing and electrical details.','flight-az93','flight-osr'),alternative('Hotter heat rejection','Increase radiator temperature if equipment or heat-lift hardware can support it.','Direct cooling may exceed device limits; active heat lift consumes power and increases total rejection.','flight-starcatcher')],
  inspection:[__kt[92]],
  terms:[term('Emittance','How effectively a surface emits thermal radiation relative to an ideal emitter.'),term('View factor','The geometric share of radiation exchanged between surfaces.')],
  relatedIds:flight('01.01','03.02','03.03','07.04'),sourceIds:['flight-thermal','flight-az93','flight-osr',local?'flight-redwire-thermal':lift?'flight-starcatcher':'flight-iss-thermal','flight-gevs']
 };
}

function transportArticle(hardware){
 const kind=hardware?.energySystem?.thermal?.kind||'pumped';
 if(kind==='passive-local')return {
  summary:__kt[93],
  sections:[
   sec('purpose','A short thermal route',
    p(__kt[94]),
    p(__kt[95],'flight-redwire-thermal')),
   sec('operation','What happens inside a heat pipe',
    p(__kt[96],'flight-thermal'),
    p(__kt[97],'flight-act')),
   sec('engineering','Heating, cooling and deployment',
    p(__kt[98]),
    p(__kt[99],'flight-gevs'))
  ],
  suppliers:[supplier('Advanced Cooling Technologies','Heat pipes and HiK plates',__kt[100],'flight-act'),supplier('Redwire','Radiator-mounted computing concept','An architectural reference for short heat paths, not a procurement declaration for each heat pipe or strap.','flight-redwire-thermal')],
  alternatives:[alternative('Direct conduction only','Use a sufficiently short, conductive path with no working fluid.','The required cross-section or temperature gradient can become large as the transport distance grows.'),alternative('Mechanically pumped loop','Move heat between separated payload and radiator locations.','Adds pumps, plumbing, fluid inventory and control interfaces.','flight-iss-thermal'),alternative('Loop heat pipe','Use a passive two-phase transport architecture for a different separation or routing need.','Startup behavior, fluid management and interfaces must be analyzed for the chosen configuration.','flight-thermal')],
  inspection:[__kt[101]],
  terms:[term('Latent heat','Energy absorbed or released during a phase change.'),term('Thermal conductance','Heat flow per degree of temperature difference across a specified path.')],
  relatedIds:flight('01.01','03.01','02.02','07.04'),sourceIds:['flight-redwire-thermal','flight-act','flight-thermal','flight-iss-thermal','flight-gevs']
 };
 if(kind==='heat-lift')return {
  summary:__kt[102],
  sections:[
   sec('purpose','Why lift the temperature?',
    p(__kt[103]),
    p(__kt[104],'flight-starcatcher')),
   sec('operation','Follow both heat and work',
    p(__kt[105]),
    p(__kt[106],'flight-thermal')),
   sec('engineering','Count the supporting equipment',
    p(__kt[107]),
    p(__kt[108],'flight-iss-thermal'))
  ],
  suppliers:[supplier('Star Catcher','Published orbital-data-center heat-lift analysis','A concept reference explaining the system trade. No qualified heat-pump supplier is selected in this workbench.','flight-starcatcher'),supplier('NASA / ISS program','Active Thermal Control System',__kt[109],'flight-iss-thermal')],
  alternatives:[alternative('Direct pumped cooling','Reject heat without raising it above the collection temperature.','Avoids compressor work but generally requires a larger radiator at the lower allowable temperature.','flight-iss-thermal'),alternative('Local passive transport','Place computing close to a compatible radiator surface.','Reduces transport machinery but constrains packaging and temperature coupling.','flight-redwire-thermal'),alternative('Reduce or schedule compute load','Match heat generation to available rejection capacity.','Thermal relief comes at a throughput or service-availability cost.')],
  inspection:[__kt[110]],
  terms:[term('Cooling COP','Cold-side heat divided by the work supplied to the heat pump.'),term('Temperature lift','The difference between the colder collection and hotter rejection interfaces.')],
  relatedIds:flight('01.01','02.03','03.01','02.02'),sourceIds:['flight-starcatcher','flight-thermal','flight-iss-thermal','flight-redwire-thermal']
 };
 const independent=kind==='redundant-pumped';
 return {
  summary:__kt[111],
  sections:[
   sec('purpose','Connect equipment to the radiator',
    p(__kt[112]),
    p(independent?__kt[113]:__kt[114])),
   sec('operation','Pumps, fluid volume and branches',
    p(__kt[115],'flight-iss-thermal'),
    p(__kt[116],'flight-iss-thermal')),
   sec('engineering','Treat the entire route as hardware',
    p(__kt[117]),
    p(__kt[118],'flight-thermal','flight-gevs'))
  ],
  suppliers:[supplier('NASA / ISS program','External Active Thermal Control System',__kt[119],'flight-iss-thermal'),supplier('Advanced Cooling Technologies','Passive heat pipes and HiK plates',__kt[120],'flight-act')],
  alternatives:[alternative('Independent liquid circuits','Split heat sources and radiators into separately contained systems.','Reduces shared fluid paths but duplicates hardware and needs explicit capacity allocation.'),alternative('Passive local heat transport','Place sources near heat pipes and radiator surfaces.','Avoids continuous pumping while constraining geometry and transport limits.','flight-act','flight-redwire-thermal'),alternative('Heat lift','Reject at a higher temperature using added electrical work.','The hot side must reject both payload heat and compressor input.','flight-starcatcher')],
  inspection:[__kt[121]],
  terms:[term('Accumulator','A volume-control element that accommodates fluid expansion and pressure behavior.'),term('Pressure drop','The pressure lost as fluid moves through a resistance.')],
  relatedIds:flight('01.01','03.01','02.02','07.04'),sourceIds:['flight-iss-thermal','flight-thermal','flight-act','flight-gevs','flight-redwire-thermal','flight-starcatcher']
 };
}

Object.assign(articles,{
 '03.03':{
  summary:__kt[122],
  sections:[
   sec('purpose','Control where heat can travel',
    p(__kt[123],'flight-thermal'),
    p(__kt[124],'flight-mli')),
   sec('operation','Why many thin layers help',
    p(__kt[125],'flight-thermal'),
    p(__kt[126])),
   sec('engineering','Tailor the blanket around real interfaces',
    p(__kt[127]),
    p(__kt[128],'flight-gevs'))
  ],
  suppliers:[supplier('Beyond Gravity','Satellite insulation assemblies',__kt[129],'flight-mli'),supplier('NASA','Thermal-control technology survey','A practical reference for comparing blankets with coatings, heaters and conductive thermal paths.','flight-thermal')],
  alternatives:[alternative('Surface coating','Control absorption and emission directly on an exposed wall.','Useful when radiative exchange is desired; it does not provide the same decoupling as a blanket.','flight-az93'),alternative('Thermal straps and controlled heaters','Deliberately route heat or add it where needed.','These solve local conduction or cold-temperature problems and still need appropriate external insulation.'),alternative('Different blanket coverage','Leave selected surfaces exposed and insulate others.','Improves routing flexibility but requires analysis of seams, openings and changing view factors.')],
  inspection:[__kt[130]],
  terms:[term('MLI','Multilayer insulation: a tailored assembly of reflective layers and separators.'),term('Thermal leak','An unintended heat-transfer path through a gap, attachment or conductive bridge.')],
  relatedIds:flight('03.01','03.02','07.02','04.03'),sourceIds:['flight-mli','flight-thermal','flight-gevs','flight-az93']
 },
 '04.01':{
  summary:__kt[131],
  sections:[
   sec('purpose','Turn the spacecraft while preserving momentum',
    p(__kt[132],'flight-gnc'),
    p(__kt[133],'flight-cmg')),
   sec('operation','The cluster is more than four independent motors',
    p(__kt[134],'flight-cmg-design'),
    p(__kt[135])),
   sec('engineering','Pointing performance includes flexible hardware',
    p(__kt[136]),
    p(__kt[137],'flight-cmg'))
  ],
  suppliers:[supplier('Airbus Defence and Space','CMG 15-45 S',__kt[138],'flight-cmg'),supplier('NewSpace Systems','Reaction wheels','A real alternative momentum-exchange actuator family for comparing torque, stored momentum and control complexity.','flight-wheel')],
  alternatives:[alternative('Reaction-wheel cluster','Use wheel-speed changes for attitude torque.','Often simpler kinematics, with a different torque-to-mass and momentum trade.','flight-wheel'),alternative('Thruster control','Exchange momentum through expelled propellant.','Requires propellant and introduces impulse, plume and minimum-command considerations.','flight-propulsion'),alternative('Magnetic unloading','Use Earth’s magnetic field to remove accumulated momentum.','Available torque changes around the orbit and cannot point arbitrarily at every instant.','flight-gnc')],
  inspection:[__kt[139]],
  terms:[term('Angular momentum','The rotational quantity exchanged between the spacecraft and its internal actuators.'),term('Singularity','A mechanism configuration in which a requested torque direction becomes unavailable or poorly conditioned.')],
  relatedIds:flight('04.02','04.03','07.01','08.01'),sourceIds:['flight-cmg','flight-cmg-design','flight-gnc','flight-wheel','flight-propulsion']
 },
 '04.02':{
  summary:__kt[140],
  sections:[
   sec('purpose','Give internal actuators somewhere to unload',
    p(__kt[141],'flight-gnc'),
    p(__kt[142],'flight-rod')),
   sec('operation','The orbit changes available torque',
    p(__kt[143]),
    p(__kt[144],'flight-gnc')),
   sec('engineering','Accommodation includes magnetic cleanliness',
    p(__kt[145]),
    p(__kt[146],'flight-rod','flight-gevs'))
  ],
  suppliers:[supplier('NewSpace Systems','Magnetorquer rods',__kt[147],'flight-rod'),supplier('Airbus Defence and Space','CMG 15-45 S',__kt[148],'flight-cmg')],
  alternatives:[alternative('Thruster unloading','Remove momentum with carefully arranged impulses.','Works independently of geomagnetic torque direction but spends propellant and requires plume accommodation.','flight-propulsion'),alternative('Larger momentum storage','Increase the interval before unloading is needed.','Adds actuator capability but does not remove persistent external torque.'),alternative('Disturbance-conscious attitude planning','Choose allowable orientations that reduce accumulated torque.','Must be balanced against power, thermal, communication and payload pointing needs.')],
  inspection:[__kt[149]],
  terms:[term('Magnetic dipole moment','The strength and direction of the magnetic actuator, commonly expressed in ampere-square-metres.'),term('Momentum unloading','Using an external torque to restore useful capacity in internal momentum actuators.')],
  relatedIds:flight('04.01','04.03','02.03','08.01'),sourceIds:['flight-rod','flight-gnc','flight-cmg','flight-gevs','flight-propulsion']
 },
 '04.03':{
  summary:__kt[150],
  sections:[
   sec('purpose','Measure orientation before commanding it',
    p(__kt[151],'flight-gnc'),
    p(__kt[152],'flight-gnc')),
   sec('operation','Combine measurements with a model',
    p(__kt[153]),
    p(__kt[154],'flight-hydra')),
   sec('engineering','Alignment belongs to the whole spacecraft',
    p(__kt[155]),
    p(__kt[156],'flight-avionics','flight-gevs'))
  ],
  suppliers:[supplier('Sodern','HYDRA star-tracker range',__kt[157],'flight-hydra'),supplier('NASA','Guidance, navigation and control technology survey','A useful reference for comparing star trackers, Sun sensors, gyros and magnetic measurements.','flight-gnc')],
  alternatives:[alternative('Star tracker plus rate sensor','Combine accurate external updates with fast short-term rotation measurements.','Needs good timing, alignment and behavior when stars are temporarily unavailable.','flight-gnc'),alternative('Coarse Sun and magnetic sensing','Support lower-accuracy acquisition or protective modes.','Does not substitute for every precision optical-pointing requirement.','flight-gnc'),alternative('Terminal-level fine pointing','Correct small optical line-of-sight errors locally.','Adds terminal hardware and controls while still requiring the bus to acquire the target.','flight-click')],
  inspection:[__kt[158]],
  terms:[term('Attitude','The orientation of the spacecraft relative to a reference frame.'),term('Boresight','The reference viewing direction of an optical sensor or antenna.')],
  relatedIds:flight('04.01','04.02','05.03','08.01'),sourceIds:['flight-hydra','flight-gnc','flight-avionics','flight-gevs','flight-click']
 },
 '05.01':{
  summary:__kt[159],
  sections:[
   sec('purpose','Keep the spacecraft operable',
    p(__kt[160],'flight-comms'),
    p(__kt[161])),
   sec('operation','Coverage is an antenna property',
    p(__kt[162]),
    p(__kt[163],'flight-anywaves')),
   sec('engineering','Separate a radio link from an operations service',
    p(__kt[164]),
    p(__kt[165],'flight-avionics'))
  ],
  suppliers:[supplier('Anywaves','S-band TT&C antenna','A real antenna reference. It is not a complete radio, ground-network contract or assurance of all-attitude coverage.','flight-anywaves'),supplier('Moog','Integrated Avionics Unit','A reference for the onboard command/data-handling interfaces that connect spacecraft communication to flight functions.','flight-iau')],
  alternatives:[alternative('Broad-beam RF command link','Prioritize operational coverage with comparatively simple pointing.','Available gain and data rate are limited relative to a narrow high-gain antenna.','flight-comms'),alternative('Separate high-gain payload link','Send bulk customer data through Ka-band or optical terminals.','Adds acquisition, pointing and ground-network requirements.','flight-nisar','flight-tbird'),alternative('Relay-assisted operations','Use a compatible relay service to extend access.',__kt[166])],
  inspection:[__kt[167]],
  terms:[term('TT&C','Tracking, telemetry and command.'),term('Link budget','An accounting of signal power, losses, noise and required margin along a communication path.'),term('Polarization','The orientation behavior of the radio wave’s electric field.')],
  relatedIds:flight('05.02','05.03','07.05','08.01'),sourceIds:['flight-anywaves','flight-comms','flight-avionics','flight-iau','flight-nisar','flight-tbird']
 },
 '05.02':{
  summary:__kt[168],
  sections:[
   sec('purpose','Concentrate radio energy toward the receiver',
    p(__kt[169],'flight-comms'),
    p(__kt[170])),
   sec('operation','Track a moving line of sight',
    p(__kt[171]),
    p(__kt[172],'flight-nisar')),
   sec('engineering','Rate, contact time and weather',
    p(__kt[173]),
    p(__kt[174],'flight-comms'))
  ],
  suppliers:[supplier('NASA JPL','NISAR Ka-band high-rate downlink',__kt[175],'flight-nisar'),supplier('Anywaves','S-band TT&C antenna',__kt[176],'flight-anywaves')],
  alternatives:[alternative('Optical downlink','Use a much shorter wavelength and a narrow optical beam.','Requires fine pointing and an appropriate ground-weather strategy.','flight-tbird'),alternative('Lower-frequency RF link','Choose a different balance of antenna size, spectrum and propagation behavior.','Available bandwidth, hardware dimensions and ground compatibility change.','flight-comms'),alternative('Several ground sites','Increase usable opportunities and diversify local conditions.',__kt[177])],
  inspection:[__kt[178]],
  terms:[term('Antenna gain','How strongly an antenna concentrates energy in a direction relative to a reference.'),term('Coding','Structured redundancy used to recover data in a noisy link.')],
  relatedIds:flight('01.03','01.04','04.03','05.01','05.03'),sourceIds:['flight-nisar','flight-comms','flight-anywaves','flight-tbird']
 },
 '05.03':{
  summary:__kt[179],
  sections:[
   sec('purpose','Connect the computing spacecraft to a destination',
    p(__kt[180],'flight-comms'),
    p(__kt[181],'flight-tbird','flight-tesat')),
   sec('operation','Acquire first, then hold the beam',
    p(__kt[182]),
    p(__kt[183],'flight-click','flight-tbird')),
   sec('engineering','A fast link still needs a data service',
    p(__kt[184]),
    p(__kt[185],'flight-comms'))
  ],
  suppliers:[supplier('TESAT','SCOT80 optical communication terminal',__kt[186],'flight-tesat'),supplier('MIT Lincoln Laboratory','TBIRD',__kt[187],'flight-tbird')],
  alternatives:[alternative('Body pointing','Aim a compatible terminal by orienting the spacecraft itself.','Can reduce terminal mechanism complexity while coupling communications to array and radiator attitude.','flight-tbird'),alternative('Gimbal plus fine steering','Separate coarse terminal motion from fast optical correction.','Adds mechanisms, alignment and control interfaces.','flight-click'),alternative('RF downlink','Use a radio terminal for a different availability and ground-network trade.','Antenna, spectrum and achievable-rate constraints differ.','flight-nisar')],
  inspection:[__kt[188]],
  terms:[term('Acquisition','Establishing the initial usable optical connection.'),term('Crosslink','A communication path between spacecraft.'),term('Goodput','Useful application data delivered after protocol overhead and losses.')],
  relatedIds:flight('01.03','01.04','04.03','05.02','08.01'),sourceIds:['flight-tbird','flight-tesat','flight-click','flight-comms','flight-nisar']
 }
});

function engineArticle(hardware){
 const aero=hardware?.input?.engine==='aero';
 return {
  summary:__kt[189],
  sections:[
   sec('purpose','Change orbital motion',
    p(__kt[190]),
    p(aero?__kt[191]:__kt[192],aero?'flight-apollo':'flight-engine')),
   sec('operation','Pressure, valves and nozzle expansion',
    p(__kt[193],'flight-engine','flight-apollo'),
    p(__kt[194])),
   sec('engineering','The engine affects nearby hardware',
    p(__kt[195]),
    p(__kt[196],'flight-propulsion'))
  ],
  suppliers:[supplier('ArianeGroup','S400 bipropellant apogee motors',__kt[197],'flight-engine'),supplier('Aerojet / NASA Apollo program','AJ10-137 service-propulsion engine',__kt[198],'flight-apollo')],
  alternatives:[alternative('Electric propulsion','Trade high propellant efficiency for low thrust and electrical demand.','Maneuvers take longer and compete with the data center for electrical power.','flight-propulsion'),alternative('Monopropellant propulsion','Use a different feed and reaction architecture.','Performance, catalyst, storage and qualification requirements change.','flight-propulsion'),alternative('Different storable bipropellant engine','Match an actual product to the required thrust and lifetime.','Tank, feed, mixture and mounting choices must follow the selected engine envelope.','flight-engine')],
  inspection:[__kt[199]],
  terms:[term('Specific impulse','Delivered impulse divided by propellant weight flow; commonly expressed in seconds.'),term('Hypergolic','A fuel/oxidizer pair that ignites on contact under its intended operating conditions.')],
  relatedIds:flight('06.02','06.03','06.04','06.06','06.07','07.01'),sourceIds:[aero?'flight-apollo':'flight-engine','flight-engine','flight-apollo','flight-propulsion','flight-feed']
 };
}

Object.assign(articles,{
 '06.02':{
  summary:__kt[200],
  sections:[
   sec('purpose','Turn stored fluids into a controlled supply',
    p(__kt[201],'flight-sp8112'),
    p(__kt[202],'flight-feed')),
   sec('operation','Regulation is a system behavior',
    p(__kt[203],'flight-sp8112'),
    p(__kt[204])),
   sec('engineering','Interfaces need chemical and mechanical evidence',
    p(__kt[205],'flight-fluid-compatibility'),
    p(__kt[206]))
  ],
  suppliers:[supplier('Moog','Spacecraft propulsion components',__kt[207],'flight-feed'),supplier('ArianeGroup','S400 engine interfaces','A real downstream engine reference that helps explain why the feed system must meet a particular inlet envelope.','flight-engine')],
  alternatives:[alternative('Regulated pressure feed','Maintain a bounded supply pressure through most of the usable pressurant range.','Adds a regulator and requires analysis of its behavior and end-of-life margin.','flight-sp8112'),alternative('Blowdown pressure feed','Allow tank pressure to decline as propellant is consumed.','Simplifies some hardware but changes thrust and flow conditions through the mission.','flight-sp8112'),alternative('Pump-fed architecture','Use a pump to establish required feed pressure.','Changes power, machinery and control requirements; it is not represented by this pressure-fed allocation.','flight-propulsion')],
  inspection:[__kt[208]],
  terms:[term('Ullage','The gas-filled space above the liquid inventory in a tank.'),term('Regulator','A component that controls downstream pressure within its design envelope.'),term('Wetted surface','A surface exposed to the stored or flowing fluid.')],
  relatedIds:flight('06.01','06.03','06.04','06.05','06.08'),sourceIds:['flight-sp8112','flight-feed','flight-engine','flight-fluid-compatibility','flight-propulsion']
 },
 '06.03':{
  summary:__kt[209],
  sections:[
   sec('purpose','Store fuel and deliver the usable portion',
    p(__kt[210]),
    p(__kt[211],'flight-pmd-history')),
   sec('operation','The outlet must stay connected to liquid',
    p(__kt[212]),
    p(__kt[213],'flight-sp8112')),
   sec('engineering','Separate chemical, pressure and mount requirements',
    p(__kt[214],'flight-fluid-compatibility'),
    p(__kt[215],'flight-pmd'))
  ],
  suppliers:[supplier('Northrop Grumman','PMD propellant tanks',__kt[216],'flight-pmd'),supplier('Moog','Propulsion feed components',__kt[217],'flight-feed')],
  alternatives:[alternative('Screen-channel or vane PMD','Use capillary structures to acquire liquid in the intended acceleration environment.','The design must match flow, fluid and depletion conditions.','flight-pmd-history'),alternative('Positive-expulsion tank','Separate pressurant and liquid using a bladder or diaphragm.','Changes material compatibility, usable volume and mechanical behavior.','flight-pmd-history'),alternative('Settling-assisted delivery','Use a mission operation that places liquid favorably before demand.','Requires an appropriate acceleration source and operational sequence rather than relying solely on passive acquisition.')],
  inspection:[__kt[218]],
  terms:[term('PMD','Propellant-management device: internal hardware that helps acquire liquid in low gravity.'),term('Residual','Propellant remaining but unavailable or reserved outside the modeled usable delivery.')],
  relatedIds:flight('06.02','06.04','06.05','06.06','07.01'),sourceIds:['flight-pmd','flight-pmd-history','flight-sp8112','flight-fluid-compatibility','flight-feed']
 },
 '06.04':{
  summary:__kt[219],
  sections:[
   sec('purpose','Accommodate the mixture requirement',
    p(__kt[220]),
    p(__kt[221],'flight-pmd','flight-pmd-history')),
   sec('operation','Maintain liquid delivery without mixing circuits',
    p(__kt[222],'flight-sp8112'),
    p(__kt[223],'flight-mon-spec')),
   sec('engineering','A similar shape does not imply an interchangeable tank',
    p(__kt[224],'flight-fluid-compatibility'),
    p(__kt[225]))
  ],
  suppliers:[supplier('Northrop Grumman','PMD propellant tanks',__kt[226],'flight-pmd'),supplier('Moog','Oxidizer-path valves and regulators within its propulsion portfolio',__kt[227],'flight-feed')],
  alternatives:[alternative('Different oxidizer grade','Use the grade required by a selected, compatible engine system.','Requires coordinated engine, materials, thermal and procurement review.','flight-mon-spec','flight-engine'),alternative('Positive-expulsion architecture','Separate gas and oxidizer with a moving barrier.','The barrier introduces its own compatibility, life and volume constraints.','flight-pmd-history'),alternative('Separate smaller vessels','Distribute oxidizer storage across the structure.','Can improve packaging while adding plumbing, mounts and fluid-management interfaces.')],
  inspection:[__kt[228]],
  terms:[term('Mixture ratio','Oxidizer mass flow divided by fuel mass flow.'),term('MON','Mixed oxides of nitrogen; a family of controlled oxidizer grades.')],
  relatedIds:flight('06.02','06.03','06.05','06.07','07.01'),sourceIds:['flight-pmd','flight-pmd-history','flight-sp8112','flight-mon-spec','flight-fluid-compatibility','flight-feed']
 },
 '06.05':{
  summary:__kt[229],
  sections:[
   sec('purpose','Store pressurization energy compactly',
    p(__kt[230],'flight-sp8112'),
    p(__kt[231],'flight-pressurant-tank')),
   sec('operation','Pressure changes as gas is used',
    p(__kt[232]),
    p(__kt[233],'flight-sp8112')),
   sec('engineering','A vessel is qualified for a defined life',
    p(__kt[234],'flight-copv-life'),
    p(__kt[235]))
  ],
  suppliers:[supplier('Northrop Grumman','Pressurant tanks',__kt[236],'flight-pressurant-tank'),supplier('Moog','Pressurization components','A real component family for the regulator and isolation interfaces connected to the bottle.','flight-feed')],
  alternatives:[alternative('All-metal pressure vessel','Use a metallic shell to carry pressure.','Changes mass, manufacturing, damage response and inspection compared with a composite-overwrapped design.','flight-pressurant-tank'),alternative('Composite-overwrapped vessel','Use fiber reinforcement around a liner.','Can offer useful mass performance but requires configuration-specific life and damage evidence.','flight-copv-life'),alternative('Different storage pressure or bottle count','Trade compactness against vessel and regulation requirements.','Changing pressure can affect dry mass, usable residual, fittings and ground servicing.')],
  inspection:[__kt[237]],
  terms:[term('COPV','Composite-overwrapped pressure vessel.'),term('Proof pressure','A specified verification pressure used in a controlled qualification or acceptance program.'),term('Usable pressurant','Gas that can still be delivered at conditions meeting downstream requirements.')],
  relatedIds:flight('06.02','06.03','06.04','06.08','07.01'),sourceIds:['flight-pressurant-tank','flight-sp8112','flight-copv-life','flight-feed']
 },
 '06.08':{
  summary:__kt[238],
  sections:[
   sec('purpose','Push the liquids without joining the combustion pair',
    p(__kt[239],'flight-sp8112'),
    p(__kt[240],'flight-helium-supply','flight-dla')),
   sec('operation','Loaded gas is different from usable gas',
    p(__kt[241]),
    p(__kt[242],'flight-sp8112')),
   sec('engineering','Keep the mass accounting and specification clear',
    p(__kt[243]),
    p(__kt[244]))
  ],
  suppliers:[supplier('Messer, Linde and Airgas','Helium supply to NASA centers',__kt[245],'flight-helium-supply'),supplier('Defense Logistics Agency Energy','Aerospace Energy procurement','A procurement and logistics reference, not a helium manufacturer or a hardware selection.','flight-dla')],
  alternatives:[alternative('Different bottle pressure and volume','Trade initial storage conditions while maintaining the required usable inventory.','Bottle mass, regulator margin and gas thermal behavior change together.','flight-sp8112'),alternative('Another compatible pressurant','Consider a different gas only in a redesigned, verified system.','Molecular mass, solubility, chemical compatibility and thermal behavior can change requirements.','flight-sp8112'),alternative('Blowdown architecture','Let propellant-tank pressure decline through the operating interval.','Changes the required pressure history and engine performance instead of simply deleting gas mass.','flight-sp8112')],
  inspection:[__kt[246]],
  terms:[term('Pressurant','A gas used to establish or maintain pressure in a fluid system.'),term('Charge','The quantity of gas loaded into the system.'),term('Gas residual','Inventory that remains when required delivery conditions can no longer be met.')],
  relatedIds:flight('06.02','06.05','06.06','06.07'),sourceIds:['flight-sp8112','flight-helium-supply','flight-dla','flight-pressurant-tank']
 }
});

function fuelArticle(hardware){
 const aero=hardware?.input?.engine==='aero';
 const fuel=aero?'Aerozine-50':'MMH';
 return {
  summary:fuel+__kt[247],
  sections:[
   sec('purpose','What the fuel contributes',
    p(aero?__kt[248]:__kt[249],aero?'flight-apollo-manual':'flight-engine'),
    p(__kt[250])),
   sec('operation','Loaded, reserved and consumed are different states',
    p(__kt[251]),
    p(__kt[252],'flight-pmd-history','flight-sp8112')),
   sec('engineering','Chemistry is a controlled specification',
    p(aero?__kt[253]:__kt[254],aero?'flight-apollo-manual':'flight-mmh-spec',...(aero?[]:['flight-mmh-maker'])),
    p(__kt[255],'flight-fluid-compatibility'))
  ],
  suppliers:aero?[supplier('Aerojet / NASA Apollo program','Historical Aerozine-50/NTO system','A documented propulsion reference. No present-day fuel manufacturer is assigned by this historical example.','flight-apollo'),supplier('Defense Logistics Agency Energy','Aerospace propellant procurement','A reference for controlled aerospace supply chains, not the manufacturer of the modeled liquid.','flight-dla')]:[supplier('Mitsubishi Gas Chemical NEXT','Monomethylhydrazine',__kt[256],'flight-mmh-maker'),supplier('Defense Logistics Agency','MIL-PRF-27404 and Aerospace Energy','Specification and procurement references; DLA is not the installed fuel manufacturer.','flight-mmh-spec','flight-dla')],
  alternatives:[alternative(aero?'MMH / MON-3':'Aerozine-50 / NTO','Choose a complete compatible engine-and-propellant package.','Performance, density and material requirements change together; fuel alone is not a drop-in replacement.',aero?'flight-engine':'flight-apollo'),alternative('Electric propulsion','Spend electrical energy to achieve a different propellant-efficiency trade.','Longer burn durations and electrical demand can change mission operations.','flight-propulsion')],
  inspection:[__kt[257]],
  terms:[term('Wet mass','Spacecraft mass including its loaded consumables.'),term('Propellant reserve','Inventory retained for uncertainty or later required maneuvers rather than already spent.')],
  relatedIds:flight('06.01','06.02','06.03','06.07','06.08'),sourceIds:[aero?'flight-apollo-manual':'flight-mmh-spec',aero?'flight-apollo':'flight-mmh-maker','flight-engine','flight-dla','flight-pmd-history','flight-fluid-compatibility','flight-sp8112','flight-propulsion']
 };
}

function oxidizerArticle(hardware){
 const aero=hardware?.input?.engine==='aero';
 const oxidizer=aero?'NTO':'MON-3';
 return {
  summary:oxidizer+__kt[258],
  sections:[
   sec('purpose','Bring the oxidizer to the reaction',
    p(__kt[259]),
    p(aero?__kt[260]:__kt[261],aero?'flight-apollo':'flight-mon-spec')),
   sec('operation','Match the two liquid streams',
    p(__kt[262]),
    p(__kt[263],'flight-pmd-history','flight-sp8112')),
   sec('engineering','Use the actual grade and compatible materials',
    p(__kt[264],'flight-mon-spec','flight-cf-nto'),
    p(__kt[265],'flight-fluid-compatibility'))
  ],
  suppliers:[supplier('CF Industries','Dinitrogen-tetroxide production at Yazoo City',__kt[266],'flight-cf-nto'),supplier('Defense Logistics Agency','MIL-PRF-26539 and Aerospace Energy','Official specification and procurement references; not a claim that DLA manufactures the oxidizer.','flight-mon-spec','flight-dla')],
  alternatives:[alternative(aero?'MMH / MON-3 package':'Aerozine-50 / NTO package','Change to a compatible propulsion architecture with its own documented operating envelope.','Requires coordinated fuel, engine, tank and materials changes.',aero?'flight-engine':'flight-apollo'),alternative('Other specified MON grade','Use only the grade accepted by the selected propulsion hardware.','Temperature behavior, impurity limits and qualification evidence must match that choice.','flight-mon-spec'),alternative('Non-bipropellant propulsion','Select an electric or monopropellant system for a different mission trade.','Changes electrical demand, thrust, performance and stored-material requirements.','flight-propulsion')],
  inspection:[__kt[267]],
  terms:[term('Oxidizer','The reactant that provides the oxidizing component of combustion.'),term('NTO','Common abbreviation for nitrogen tetroxide, also written N2O4.'),term('Propellant grade','A specified composition and quality boundary for procured material.')],
  relatedIds:flight('06.01','06.02','06.04','06.06','06.08'),sourceIds:['flight-mon-spec','flight-cf-nto','flight-dla','flight-pmd-history','flight-sp8112','flight-fluid-compatibility',aero?'flight-apollo':'flight-engine','flight-propulsion']
 };
}

export function flightKnowledge(record,catalog,hardware){
 if(record?.category!=='flight'||record.massAccounting!=='mel-allocation')return null;
 const article=record.wbs==='03.01'?radiatorArticle(hardware):record.wbs==='03.02'?transportArticle(hardware):record.wbs==='06.01'?engineArticle(hardware):record.wbs==='06.06'?fuelArticle(hardware):record.wbs==='06.07'?oxidizerArticle(hardware):record.wbs==='07.04'?mechanismArticle(hardware):record.wbs==='09.01'?adapterArticle(hardware):articles[record.wbs];
 if(!article)return null;
 const sourceIds=[...new Set([...(article.sourceIds||[]),...article.sections.flatMap(s=>s.paragraphs.flatMap(p=>p.sources||[])),...(article.suppliers||[]).flatMap(s=>s.sources||[]),...(article.alternatives||[]).flatMap(a=>a.sources||[])])];
 return {...article,key:'flight-'+record.wbs,sourceIds};
}

Object.assign(articles,{
 '07.01':{
  summary:__kt[268],
  sections:[
   sec('purpose','Give every load a route',
    p(__kt[269]),
    p(__kt[270],'flight-beyond-structure','flight-structure')),
   sec('operation','Stiffness and strength solve different problems',
    p(__kt[271]),
    p(__kt[272])),
   sec('engineering','Design the joints and assembly sequence',
    p(__kt[273]),
    p(__kt[274],'flight-gevs','flight-falcon-guide'))
  ],
  suppliers:[supplier('Beyond Gravity','Satellite central structures, struts and panels',__kt[275],'flight-beyond-structure'),supplier('SpaceX','Falcon payload interface requirements',__kt[276],'flight-falcon-guide')],
  alternatives:[alternative('Frame with separate enclosure panels','Concentrate primary loads in members and fittings.','Can simplify access but adds joints and may use panel area less efficiently.'),alternative('Load-bearing sandwich enclosure','Let structural walls participate in the main load path.','Changes panel attachments, cutout reinforcement and the consequences of late access changes.','flight-structure'),alternative('Composite central structure','Tailor stiffness and thermal behavior using a composite load path.','Requires laminate, joint, manufacturing and inspection evidence specific to that construction.','flight-beyond-structure')],
  inspection:[__kt[277]],
  terms:[term('Load path','The connected route by which force passes through hardware and joints.'),term('Mode shape','A characteristic deformation pattern during vibration.'),term('Buckling','Loss of structural stability under a compressive load.')],
  relatedIds:flight('01.02','06.03','06.04','07.02','09.01'),sourceIds:['flight-beyond-structure','flight-structure','flight-gevs','flight-falcon-guide']
 },
 '07.02':{
  summary:__kt[278],
  sections:[
   sec('purpose','Separate material to resist bending',
    p(__kt[279],'flight-structure'),
    p(__kt[280],'flight-hexweb','flight-beyond-structure')),
   sec('operation','Loads must enter the sandwich correctly',
    p(__kt[281]),
    p(__kt[282])),
   sec('engineering','A wall can have several jobs',
    p(__kt[283]),
    p(__kt[284],'flight-gevs'))
  ],
  suppliers:[supplier('Beyond Gravity','Satellite honeycomb panels',__kt[285],'flight-beyond-structure'),supplier('Hexcel','HexWeb honeycomb',__kt[286],'flight-hexweb')],
  alternatives:[alternative('Metal face sheets','Use a familiar conductive material for panel faces.','Thermal expansion, mass and local joint behavior must meet the mission requirements.','flight-beyond-structure'),alternative('Composite face sheets','Tailor directional stiffness and thermal response.','Requires laminate design, process control and appropriate joint/inspection methods.','flight-beyond-structure'),alternative('Machined or stiffened solid panel','Avoid a bonded lightweight core in a local region.','May simplify some attachments while increasing mass for the same broad-area bending stiffness.')],
  inspection:[__kt[287]],
  terms:[term('Face sheet','An outer structural layer of a sandwich panel.'),term('Core shear','The shear loading carried by the lightweight material between the faces.'),term('Insert','A reinforced feature that transfers a concentrated attachment load into a panel.')],
  relatedIds:flight('03.03','07.01','07.03','07.05'),sourceIds:['flight-structure','flight-hexweb','flight-beyond-structure','flight-gevs']
 },
 '07.03':{
  summary:__kt[288],
  sections:[
   sec('purpose','Reduce exposure where it matters',
    p(__kt[289],'flight-rha'),
    p(__kt[290])),
   sec('operation','Material changes the transported radiation',
    p(__kt[291]),
    p(__kt[292],'flight-juno')),
   sec('engineering','Combine transport analysis with electronics evidence',
    p(__kt[293],'flight-rha','flight-avionics'),
    p(__kt[294]))
  ],
  suppliers:[supplier('NASA JPL','Juno electronics vault',__kt[295],'flight-juno'),supplier('BAE Systems','RAD750 flight-computer family',__kt[296],'flight-rad750')],
  alternatives:[alternative('Local shielding around sensitive electronics','Place material where the protected hardware needs it.','Can reduce unnecessary mass but requires detailed treatment of openings and heat paths.'),alternative('Radiation-tolerant device selection','Choose parts with evidence appropriate to the mission environment.','Performance, availability and cost may differ from high-throughput terrestrial accelerators.','flight-rad750','flight-rha'),alternative('System-level error management','Use detection, correction, checkpointing and controlled recovery.','Addresses particular failure consequences; it does not establish immunity to every radiation mechanism.','flight-avionics')],
  inspection:[__kt[297]],
  terms:[term('TID','Total ionizing dose: cumulative deposited ionizing energy affecting device behavior.'),term('Single-event effect','A device response initiated by an individual energetic-particle interaction.'),term('Radiation assurance','The process of matching environment, device evidence and mitigations to mission requirements.')],
  relatedIds:flight('01.01','01.03','07.02','08.01'),sourceIds:['flight-rha','flight-juno','flight-avionics','flight-rad750','flight-structure']
 },
 '07.05':{
  summary:__kt[298],
  sections:[
   sec('purpose','Make the equipment interfaces real',
    p(__kt[299]),
    p(__kt[300],'flight-harness')),
   sec('operation','Current, heat and voltage drop interact',
    p(__kt[301]),
    p(__kt[302],'flight-spacewire','flight-quantum')),
   sec('engineering','Routing is part of the specification',
    p(__kt[303]),
    p(__kt[304],'flight-workmanship'))
  ],
  suppliers:[supplier('Glenair','Integrated cable and flex assemblies',__kt[305],'flight-harness'),supplier('Airbus Crisa','Power conditioning and distribution units','A real source-side interface example showing why protected feeds and harness capability must be considered together.','flight-crisa')],
  alternatives:[alternative('Higher-voltage distribution with local conversion','Reduce current over long power routes.','Adds conversion and insulation requirements near the loads while changing conductor sizing.'),alternative('Optical data interconnect','Move selected data over fiber.','Changes transceiver power, bend limits, connectors and handling; it does not carry spacecraft electrical power.','flight-harness'),alternative('Rigid-flex or integrated backplane','Consolidate connections inside a local electronics assembly.','Can reduce free wiring while coupling mechanical design and maintenance to the electronics layout.')],
  inspection:[__kt[306]],
  terms:[term('Voltage drop','The reduction in voltage along a current-carrying path.'),term('Strain relief','Support that prevents cable loads from being carried directly by a termination.'),term('Controlled impedance','A designed electrical property of a high-speed signal path.')],
  relatedIds:flight('01.04','02.03','05.01','07.04','08.01'),sourceIds:['flight-harness','flight-workmanship','flight-crisa','flight-spacewire','flight-quantum']
 },
 '08.01':{
  summary:__kt[307],
  sections:[
   sec('purpose','Keep vehicle authority separate from customer workloads',
    p(__kt[308],'flight-avionics'),
    p(__kt[309],'flight-iau')),
   sec('operation','Turn measurements into coordinated actions',
    p(__kt[310]),
    p(__kt[311],'flight-gnss')),
   sec('engineering','Design for understood behavior under faults',
    p(__kt[312]),
    p(__kt[313],'flight-rad750','flight-rha'))
  ],
  suppliers:[supplier('Moog','Integrated Avionics Unit','A real integrated spacecraft-avionics product reference; board selections and interfaces remain project decisions.','flight-iau'),supplier('BAE Systems','RAD750 single-board computers','A documented flight-computer family used to compare radiation-aware vehicle computing with customer accelerators.','flight-rad750'),supplier('NewSpace Systems','Gemini GPS/GNSS receivers and antennas','A real navigation-hardware family; mission and accommodation suitability still require verification.','flight-gnss')],
  alternatives:[alternative('Integrated avionics box','Combine several vehicle functions in one assembly.','Can simplify packaging while concentrating interfaces and shared resources.','flight-iau'),alternative('Distributed controllers','Place control electronics near equipment or functional domains.','Adds network, synchronization and authority-management requirements.','flight-avionics'),alternative('Higher-performance commercial processing','Use commercial devices where their performance justifies the assurance work.',__kt[314],'flight-hpe','flight-rha')],
  inspection:[__kt[315]],
  terms:[term('GNSS','Global navigation satellite system: a source of navigation and timing observations.'),term('Watchdog','A monitoring function that detects a missing expected response and can initiate recovery.'),term('State estimate','A calculated best estimate of variables such as position, velocity or orientation.')],
  relatedIds:flight('01.02','04.03','05.01','07.03','07.05'),sourceIds:['flight-avionics','flight-iau','flight-rad750','flight-gnss','flight-rha','flight-hpe']
 }
});

function mechanismArticle(hardware){
 const local=hardware?.energySystem?.thermal?.kind==='passive-local';
 return {
  summary:__kt[316],
  sections:[
   sec('purpose','Survive launch, then move deliberately',
    p(__kt[317]),
    p(local?__kt[318]:__kt[319],local?'flight-redwire-thermal':'flight-iss-thermal')),
   sec('operation','Deployment and tracking are different motions',
    p(__kt[320],'flight-rosa'),
    p(__kt[321],'flight-sada')),
   sec('engineering','Allow margin for the installed assembly',
    p(__kt[322]),
    p(__kt[323],'flight-structure','flight-gevs'))
  ],
  suppliers:[supplier('Moog','Type 2 Solar Array Drive Assembly',__kt[324],'flight-sada'),supplier('Redwire','ROSA',__kt[325],'flight-rosa')],
  alternatives:[alternative('Stored-energy deployment','Use springs or elastic booms to deploy a surface.','Reduces continuous drive needs but still requires release, motion control and final-state assurance.','flight-rosa'),alternative('Motor-driven articulation','Command position through an actuator and transmission.','Adds power, sensing and mechanical life requirements.','flight-sada'),alternative('Fixed surface geometry','Avoid some deployment or tracking mechanisms.','Constrains launch packaging, orientation flexibility and available surface area.')],
  inspection:[__kt[326]],
  terms:[term('Hold-down and release','Hardware that restrains a structure for launch and frees it on command.'),term('Slip ring','An electrical connection that transfers circuits across a rotating joint.'),term('Latch','A device that holds a mechanism in a defined position.')],
  relatedIds:flight('02.01','03.01','03.02','04.01','07.05'),sourceIds:['flight-sada','flight-rosa','flight-structure','flight-gevs',local?'flight-redwire-thermal':'flight-iss-thermal']
 };
}

function adapterArticle(hardware){
 const rectangular=hardware?.payloadInterface?.attachmentShape==='rectangular-lugs';
 return {
  summary:__kt[327],
  sections:[
   sec('purpose','Connect two independently designed vehicles',
    p(__kt[328],'flight-falcon-guide'),
    p(rectangular?__kt[329]:__kt[330])),
   sec('operation','Restrain first, then create a clean separation',
    p(__kt[331]),
    p(__kt[332],'flight-separation','flight-lightband')),
   sec('engineering','Release conditions matter to the next mission phase',
    p(__kt[333]),
    p(__kt[334],'flight-falcon-guide','flight-gevs'))
  ],
  suppliers:[supplier('Beyond Gravity','Payload adapters and separation systems',__kt[335],'flight-separation'),supplier('Rocket Lab','Motorized Lightband','A real motorized ring-release alternative. Suitability depends on its specific load, diameter and interface envelope.','flight-lightband')],
  alternatives:[alternative('Clamp-band interface','Distribute retention around compatible circular flanges.','Requires appropriate flange geometry, preload and release/shock characterization.','flight-separation'),alternative('Motorized ring release','Use a compatible electromechanical separation ring.','Changes actuation, power and verification requirements.','flight-lightband'),alternative('Point or lug attachments','Connect through discrete structural locations.','Concentrates loads locally and needs an explicitly designed release and clearance arrangement.','flight-separation')],
  inspection:[__kt[336]],
  terms:[term('Tip-off','An angular rate imparted to the spacecraft during separation.'),term('Separation plane','The defined boundary where the departing spacecraft disconnects from retained hardware.'),term('Interface control','The agreed definition of geometry, loads, connections and responsibilities between systems.')],
  relatedIds:['flight:07.01','flight:08.01','launch:vehicle','ground:adapter','ground:fit'],sourceIds:['flight-separation','flight-lightband','flight-falcon-guide','flight-gevs']
 };
}
