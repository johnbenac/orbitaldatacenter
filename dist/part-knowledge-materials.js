// Generated losslessly from src/parts-knowledge/part-knowledge-materials.js.
// Edit the authored module, then run npm run package:parts-knowledge.
import {knowledgeText as __kt} from "./part-knowledge-text.js";
// Learning articles for the material and component children of flight MEL items.
// These explain engineering principles and reference products; live design facts
// and evidence status remain in the parts catalog, not in this editorial layer.
const reviewed = '2026-11-07';
const sourceSpecs = [
 ['thermal','State of the Art: Thermal Control','NASA','https://www.nasa.gov/smallsat-institute/sst-soa/thermal-control/','Technical handbook',__kt[337],'Chapter 7; especially thermal interfaces and straps'],
 ['structures','State of the Art: Structures, Materials, and Mechanisms','NASA','https://www.nasa.gov/smallsat-institute/sst-soa/structures-materials-and-mechanisms/','Technical handbook',__kt[338],'Chapter 6'],
 ['power','State of the Art: Power Subsystems','NASA','https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/','Technical handbook','A system-level introduction connecting solar generation, batteries, power conditioning and distribution.','Chapter 3'],
 ['gnc','State of the Art: Guidance, Navigation, and Control','NASA','https://www.nasa.gov/smallsat-institute/sst-soa/guidance-navigation-and-control/','Technical handbook','Use the actuator and sensor sections to understand momentum devices, magnetic unloading and attitude measurements.','Chapter 5'],
 ['beyond-structures','Satellite Structures','Beyond Gravity','https://www.beyondgravity.com/en/satellites/mechanical-solutions/satellite-structures','Manufacturer overview','Examples of spacecraft panels, inserts, cylinders and struts; useful for comparing actual structural product families.'],
 ['anodize','Preventing Cracking of Anodized Coatings','NASA','https://ntrs.nasa.gov/api/citations/19950025269/downloads/19950025269.pdf','Technical memorandum',__kt[339],'NASA-TM-104622'],
 ['act-chassis','Conduction Cooled Chassis','Advanced Cooling Technologies','https://www.1-act.com/thermal-solutions/embedded-computing/conduction-cooled-chassis/','Manufacturer technical guide',__kt[340]],
 ['act-radiator','Honeycomb Radiator Panels','Advanced Cooling Technologies','https://www.1-act.com/honeycomb-radiator-panels/','Manufacturer technical guide','Connects face sheets, honeycomb construction, bonded interfaces and integrated heat transport in radiator panels.'],
 ['act-hik','Copper/Water Heat Pipes and HiK Plates for Spacecraft Applications','Advanced Cooling Technologies',__kt[2],'Manufacturer case study',__kt[341]],
 ['heat-pipes','Heat Pipes','NASA Goddard Space Flight Center','https://extapps.ksc.nasa.gov/Reliability/Documents/Preferred_Practices/1209.pdf','Engineering practice','Explains evaporation, condensation, wick return and the design limitations of heat pipes.','Practice PD-ED-1209'],
 ['redwire','Orbital Data Centers: Power and Thermal Management for Scalable Architectures','Redwire','https://rdw.com/wp-content/uploads/2026/05/RDW26-053-ODC-Power-Thermal-Study-White-Paper-R11-Digital.pdf','Architecture white paper',__kt[342]],
 ['iss-atcs','International Space Station Active Thermal Control System','NASA','https://www.nasa.gov/wp-content/uploads/2021/02/473486main_iss_atcs_overview.pdf','System overview','A concrete example of collecting, transporting and rejecting heat through fluid circuits and heat exchangers.'],
 ['heat-pump','Vapor-Compression Heat Pumps for Operation Aboard Spacecraft','NASA Johnson Space Center','https://ntrs.nasa.gov/citations/20100014095','NASA Tech Brief','An accessible research reference for compressors, evaporators, condensers and microgravity-specific startup challenges.'],
 ['az93','AZ-93','AZ Technology','https://www.aztechnology.com/product/1/az-93','Coating product information',__kt[343]],
 ['osr','Optical Solar Reflectors','Excelitas / Qioptiq',__kt[3],'Manufacturer datasheet','Shows actual glass reflector families and coating options rather than treating every OSR as the same glass.'],
 ['mli-optics','Optical Properties of Multi-Layered Insulation','NASA','https://ntrs.nasa.gov/api/citations/20070017980/downloads/20070017980.pdf','Technical paper',__kt[344]],
 ['sheldahl','The Red Book','Sheldahl','https://www.sheldahl.com/wp-content/uploads/2023/07/RedBook.pdf','Materials handbook','A useful catalog of space film, coating and blanket materials, with property tables to compare constructions.','Revision E, January 2020'],
 ['beta','Beta Cloth','Dunmore','https://www.dunmore.com/products/beta-cloth.html','Manufacturer material guide','A primary reference for the PTFE and glass-fabric material class used as a protective blanket cover.'],
 ['rosa','Solar Cells Tested on Flexible Array Design','NASA Glenn Research Center','https://www.nasa.gov/centers-and-facilities/glenn/solar-cells-tested-on-flexible-array-design/','Technology demonstration','Shows why flexible solar blankets and deployable composite booms must be engineered as a system.'],
 ['spectrolab','Photovoltaics','Spectrolab','https://www.spectrolab.com/photovoltaics.html','Manufacturer product overview',__kt[345]],
 ['sharp','Space-Qualified Solar Cells','Sharp','https://global.sharp/solar/en/space-qualified/','Manufacturer product overview','Compare silicon and compound-semiconductor space-cell families without assuming either is the workbench supplier.'],
 ['esa-cell','Inside a Solar Cell','European Space Agency','https://www.esa.int/articles/inside-a-solar-cell','Engineering explainer','A readable introduction to cell layers, protective coverglass and electrical connections in a space solar array.'],
 ['workmanship','Workmanship','NASA Office of Safety and Mission Assurance','https://sma.nasa.gov/sma-disciplines/workmanship','Engineering standards portal','Find standards and training for printed wiring, soldering, cable and harness workmanship.'],
 ['a100','NVIDIA A100 Tensor Core GPU','NVIDIA','https://www.nvidia.com/en-us/data-center/a100/','Manufacturer product information',__kt[346]],
 ['ttm','Commercial Space','TTM Technologies','https://www.ttm.com/en/markets-we-serve/commercial-space','Manufacturer capability overview','Introduces a real supplier of circuit-board and advanced interconnect fabrication for space applications.'],
 ['storage','FSM-C Flash Storage Module Carrier','Curtiss-Wright Defense Solutions','https://defense-solutions.curtisswright.com/products/storage-recorders/modules-drives/fsm-c','Manufacturer product information',__kt[347]],
 ['iau','Integrated Avionics Unit','Moog','https://www.moog.com/content/dam/moog/literature/sdg/space/avionics/moog-integrated-avionics-unit-datasheet.pdf','Manufacturer datasheet',__kt[348]],
 ['airbus-power','Power Conditioning and Distribution Units','Airbus','https://www.airbus.com/en/products-services/space/equipment/power/power-conditioning-and-distribution-units','Manufacturer product overview','Links several spacecraft power-unit families and datasheets, including modular PCDU examples.'],
 ['beyond-power','Power Conditioning and Distribution','Beyond Gravity','https://www.beyondgravity.com/en/satellites/electronic-solutions/power-electronics','Manufacturer product overview','Compare conditioning and distribution functions, regulated buses and protected output channels.'],
 ['beyond-electronics','Electronic Solutions','Beyond Gravity','https://www.beyondgravity.com/en/satellites/electronic-solutions','Manufacturer capability overview',__kt[349]],
 ['saft','Performances of SAFT VES16 Lithium-Ion Cells in LEO/GEO Cycling','Saft; hosted by NASA','https://www.nasa.gov/wp-content/uploads/2024/01/saft-ves16-cell-life-test-performance-update.pdf','Battery workshop presentation','Read cell cycling and battery examples while keeping cell performance separate from enclosure and pack design.','NASA Aerospace Battery Workshop, 2016'],
 ['eagle','Space COTS Lithium-Ion Batteries','EaglePicher Technologies','https://www.eaglepicher.com/sites/default/files/Space%20COTS%200325_0.pdf','Manufacturer datasheet',__kt[350],'March 2025'],
 ['orion-battery','NASA Alternative Orion Small Cell Battery Design Support','NASA','https://ntrs.nasa.gov/citations/20160013684','Technical report','A design example showing how cell arrangement, thermal behavior and enclosure provisions interact.'],
 ['busbars','ROLINX Busbars','Rogers Corporation','https://www.rogerscorp.com/advanced-electronics-solutions/rolinx-busbars','Manufacturer technology guide','Introduces laminated power conductors and insulation; an industrial manufacturing comparison, not flight qualification.'],
 ['cmg','CMG 15-45 S','Airbus','https://www.airbus.com/sites/g/files/jlcbta136/files/2022-02/AVIONICS-CMG15-45-v5-2022.pdf','Manufacturer datasheet','A concrete control-moment-gyroscope example with a gimballed momentum assembly and mechanical/electrical interfaces.'],
 ['magnetorquer','Magnetorquer Rods','NewSpace Systems','https://www.newspacesystems.com/products/magnetorquer-rods/','Manufacturer product information','Compare real magnetic actuator families and the relationship among magnetic moment, electrical input and packaging.'],
 ['hydra','HYDRA','Sodern','https://sodern.com/en/ranges/hydra','Manufacturer product overview','Shows the optical-head and processing-unit architecture of a real star-tracker family.'],
 ['anywaves','Antenna Portfolio','Anywaves','https://content.anywaves.com/hubfs/Anywaves-Datasheets/PORTFOLIO-ANYWAVES_compressed.pdf','Manufacturer datasheets','Compare real patch antennas, radome materials and feed interfaces; different products use different constructions.'],
 ['rf-laminate','RT/duroid Laminates','Rogers Corporation','https://www.rogerscorp.com/advanced-electronics-solutions/rt-duroid-laminates','Manufacturer material guide',__kt[351]],
 ['contacts','Micro-D Connector Specification','Glenair','https://www.glenair.com/micro-d/low-profile-metal-and-plastic-shell-micro-d/pdf/connector-specification.pdf','Manufacturer specification',__kt[352]],
 ['harness','SpaceWire Cable 963-080-26','Glenair','https://cdn.glenair.com/speedline/pdf/963-080-26.pdf','Manufacturer drawing','An actual layered cable construction to compare conductors, insulation, shields and outer jacket.'],
 ['nisar','Ka-band High-Rate Downlink System for the NISAR Mission','NASA Jet Propulsion Laboratory','https://ntrs.nasa.gov/citations/20210008861','Mission engineering paper','A mission-level example of Ka-band data delivery and its antenna/system relationships.'],
 ['tbird','Terabyte Infrared Delivery (TBIRD)','MIT Lincoln Laboratory','https://www.ll.mit.edu/r-d/projects/terabyte-infrared-delivery-tbird','Mission technology overview',__kt[353]],
 ['optical-terminal','Optical Communication','Rocket Lab','https://rocketlabcorp.com/space-systems/optical-communication/','Manufacturer product overview','A real optical communications terminal family for comparison of terminal packaging and pointing interfaces.'],
 ['window','NIR-I Coated Fused Silica Window','Edmund Optics','https://www.edmundoptics.com/p/25mm-dia-3mm-thick-nir-i-coated-lambda4-fused-silica-window/45477/','Optical component datasheet',__kt[354]],
 ['superblack','Superblack Coatings for Space Components','European Space Agency','https://www.esa.int/articles/superblack-coatings-for-space-components','Technology overview','Explains the role of low-reflectance surfaces around sensitive optical instruments.'],
 ['hubble','Hubble Optics','NASA Goddard Space Flight Center','https://asd.gsfc.nasa.gov/archive/hubble/technology/optics.html','Instrument explainer','A well documented optical system to study light paths and the distinction between intended and unwanted illumination.'],
 ['pmd','PMD Tanks','Northrop Grumman','https://www.northropgrumman.com/what-we-do/space/mission-enabling-products/pmd-tanks','Manufacturer product overview',__kt[355]],
 ['pressurant','Pressurant Tanks','Northrop Grumman','https://www.northropgrumman.com/what-we-do/space/mission-enabling-products/pressurant-tanks','Manufacturer product overview','Compare metal vessels and composite-overwrapped alternatives for pressurizing gases.'],
 ['copv','Deceptively Complex: Composite Overwrapped Pressure Vessels Remain a Challenge','NASA Engineering and Safety Center',__kt[356],'Engineering article','Introduces why a liner and a composite overwrap must be assessed as a coupled pressure vessel.'],
 ['s400','Apogee Motors','ArianeGroup','https://www.space-propulsion.com/spacecraft-propulsion/apogee-motors/','Manufacturer technical information','S400 reference information; its chamber/throat material statement does not identify every expansion-bell material.'],
 ['valves','Spacecraft Propulsion Components','Moog','https://www.moog.com/products/propulsion/space-propulsion/spacecraft-propulsion/propulsion-components.html','Manufacturer component overview',__kt[357]],
 ['juno','Juno Spacecraft','NASA Jet Propulsion Laboratory','https://www.jpl.nasa.gov/news/press_kits/juno/spacecraft/','Mission reference','The radiation vault is a real shielding architecture example for Jupiter, not a shielding prescription for Earth orbit.'],
 ['radiation','Radiation Analysis','NASA Small Satellite Reliability Initiative','https://s3vi.ndc.nasa.gov/ssri-kb/topics/21/','Engineering knowledge base','Connects the modeled radiation environment, shielding and component susceptibility, with links to analysis resources.'],
 ['sada','Type 2 Solar Array Drive Assembly','Moog',__kt[10],'Manufacturer datasheet','A concrete mechanism example combining a drive, position measurement and rotating electrical connections.'],
 ['lightband','Advanced Lightband','Rocket Lab','https://rocketlabcorp.com/space-systems/separation-systems/advanced-lightband/','Manufacturer product information','An actual separation-system architecture for studying upper/lower interfaces and release functions.'],
 ['feedthrough','Ceramaseal Feedthroughs','CeramTec','https://www.ceramtec-industrial.com/en/products-applications/hermetically-sealed-components/ceramaseal-feedthroughs','Manufacturer component guide','Examples of ceramic-to-metal feedthroughs that separate sealing and electrical-insulation requirements.']
];
export const materialKnowledgeSources = Object.freeze(Object.fromEntries(sourceSpecs.map(([id,title,organization,url,kind,description,section]) => ['mat-'+id,{title,organization,url,kind,description,...(section?{section}:{}),reviewed}])));
const ids = (...values) => values.flat().map(value => value.startsWith('mat-')?value:'mat-'+value);
const paragraph = (text,...sources) => ({text,sources:ids(...sources)});
const section = (id,title,text,...sources) => ({id,title,paragraphs:[paragraph(text,...sources)]});
const maker = (name,offering,note,...sources) => ({name,offering,note,sources:ids(...sources)});
const alternative = (name,description,tradeoff,...sources) => ({name,description,tradeoff,sources:ids(...sources)});
const term = (term,definition) => ({term,definition});
function article(key,summary,sections,suppliers,alternatives,inspection,terms,relatedIds=[],reading=[]) {
 const sourceIds=[...new Set([...sections.flatMap(s=>s.paragraphs.flatMap(p=>p.sources)),...suppliers.flatMap(s=>s.sources),...alternatives.flatMap(s=>s.sources),...ids(reading)])];
 return {key,summary,sections,suppliers,alternatives,inspection,terms,relatedIds,sourceIds};
}
const topics = {};

topics.battery = article('battery-enclosure',
 __kt[358],[
 section('purpose','What the enclosure is for',__kt[359],'power','saft'),
 section('operation','How cells, heat and structure meet',__kt[360],'orion-battery'),
 section('engineering','What engineers specify',__kt[361],'anodize','structures')],
 [maker('Saft','VES16 cell and battery reference',__kt[362],'saft'),maker('EaglePicher','Space COTS battery families',__kt[363],'eagle')],
 [alternative('Modular battery packs','Separate packs can simplify accommodation and replacement during integration.','More housings, connectors and monitoring interfaces must be coordinated.','eagle'),alternative('Shared cold base with cell modules','Modules can share a strong thermal and structural mounting surface.','Thermal coupling and electrical isolation become important at the common interface.','orion-battery')],
 [__kt[364]],
 [term('Pack','Cells and the mechanical, electrical and monitoring provisions that make them usable together.'),term('Thermal interface','The contact through which heat passes between joined parts.')],['flight:02.02','flight:02.03','flight:03.02']);

topics.boards = article('accelerator-boards',
 __kt[365],[
 section('purpose','What is inside a compute tray',__kt[366],'a100'),
 section('operation','Why the board is an engineered stack',__kt[367],'workmanship','act-chassis'),
 section('engineering','Fabrication and verification choices',__kt[368],'ttm','workmanship')],
 [maker('NVIDIA','A100 accelerator','A computing reference, not a flight-qualified board selection or the layout reproduced in the viewer.','a100'),maker('TTM Technologies','Commercial-space circuit fabrication',__kt[369],'ttm')],
 [alternative('Replaceable accelerator cards','Cards permit modular assembly and individual replacement before launch.','Their sockets and retainers add interfaces and must carry launch loads.','act-chassis'),alternative('Integrated custom processor board','One board can match the enclosure, memory and power distribution closely.','Custom design and verification replace the convenience of an existing module.','ttm')],
 [__kt[370]],
 [term('PCB','Printed circuit board: patterned conductors supported by insulating layers.'),term('Return path','The route current takes back to its source, important to signal integrity.')],['flight:01.01','flight:01.01.01','flight:01.02']);

topics.chassis = article('compute-tray-chassis',
 __kt[371],[
 section('purpose','More than a shelf',__kt[372],'structures'),
 section('operation','The load path and the heat path',__kt[373],'act-chassis'),
 section('engineering','Manufacturing and assembly decisions',__kt[374],'anodize','structures')],
 [maker('Advanced Cooling Technologies','Conduction-cooled chassis','A useful packaging and heat-path comparison; its illustrated chassis is not the selected flight tray.','act-chassis'),maker('Beyond Gravity','Spacecraft structural products','Examples of panels, inserts and support structures around mounted equipment.','beyond-structures')],
 [alternative('Independent cold-plate trays','Each tray can have a defined thermal and mechanical interface.','More plumbing or thermal joints may be needed between trays.','thermal'),alternative('Shared card cage','Several cards share guide rails, enclosure and backplane.','Common interfaces constrain card formats and can couple servicing or thermal behavior.','act-chassis')],
 [__kt[375]],
 [term('Datum','A reference surface or axis used to locate parts consistently.'),term('Card cage','A structure that guides and retains multiple electronic cards.')],['flight:01.02','flight:01.01.02','flight:07.01']);

topics.storage = article('storage-carrier-enclosure',
 __kt[376],[
 section('purpose','Where data waits',__kt[377],'storage','beyond-electronics'),
 section('operation','Making a storage module usable in vacuum',__kt[378],'act-chassis'),
 section('engineering','Choosing the carrier architecture',__kt[379],'structures','anodize')],
 [maker('Curtiss-Wright','FSM-C flash storage carrier',__kt[380],'storage'),maker('Moog','Integrated Avionics Unit',__kt[381],'iau')],
 [alternative('Standalone storage enclosure','Separates storage installation and interfaces from the processor trays.','Additional housing, cabling and thermal contacts consume accommodation space.','storage'),alternative('Storage on a processor or avionics card','Can shorten internal data connections and consolidate packaging.','Replacement and failure isolation become tied to the host assembly.','iau')],
 [__kt[382]],
 [term('Carrier','The mechanical assembly that holds a device and presents its installation interfaces.'),term('Data integrity','Preserving the correctness and recoverability of stored information.')],['flight:01.03','flight:01.01','flight:05.03']);

topics.network = article('network-switch-enclosure',
 __kt[383],[
 section('purpose','Connecting the computing system',__kt[384],'beyond-electronics'),
 section('operation','Signals still need a physical installation',__kt[385],'harness','act-chassis'),
 section('engineering','Packaging the fabric',__kt[386],'structures','workmanship')],
 [maker('Beyond Gravity','Onboard data-network electronics','A spacecraft supplier comparison for network hardware; this does not specify the payload fabric used here.','beyond-electronics'),maker('Glenair','SpaceWire cable construction','An actual cable example for studying layered interconnects, not a declaration that this fabric uses SpaceWire.','harness')],
 [alternative('Central switch enclosure','Consolidates routing and simplifies a recognizable network boundary.','Cable concentration and shared-equipment dependencies need evaluation.','beyond-electronics'),alternative('Distributed switching','Places switching closer to payload nodes.','Adds power, thermal and management interfaces across the spacecraft.','beyond-electronics')],
 [__kt[387]],
 [term('Fabric','The interconnection system through which computing nodes exchange data.'),term('Signal integrity','Preserving a signal’s intended electrical behavior across an interconnect.')],['flight:01.04','flight:01.01','flight:01.03','flight:07.05']);

topics.pcdu = article('pcdu-converter-enclosure',
 __kt[388],[
 section('purpose','Where spacecraft power is organized',__kt[389],'airbus-power','beyond-power'),
 section('operation','Heat, current and isolation',__kt[390],'busbars','act-chassis'),
 section('engineering','Designing the box around the circuits',__kt[391],'workmanship','airbus-power')],
 [maker('Airbus','EVO, MEGA and other PCDU families','Actual power-unit examples for comparing modular packaging and functions; none is established as the modeled unit.','airbus-power'),maker('Beyond Gravity','cPCDU and cPDU','Examples that distinguish conditioning from distribution and protected output channels.','beyond-power')],
 [alternative('Centralized PCDU','Provides a common location for bus management and protected outputs.','Harness routing and shared-unit dependencies require careful architecture.','beyond-power'),alternative('Distributed converters','Places voltage conversion close to loads.','More local electronics must be supported, cooled and commanded.','airbus-power')],
 [__kt[392]],
 [term('PCDU','Power conditioning and distribution unit.'),term('Baseplate','A mounting surface that can also carry heat out of an electronics unit.')],['flight:02.03','flight:02.03.02','flight:02.02','flight:01.01']);

topics.avionics = article('flight-avionics-enclosure',
 __kt[393],[
 section('purpose','The spacecraft’s control equipment',__kt[394],'iau'),
 section('operation','Cards, connectors and a controlled environment',__kt[395],'act-chassis','harness'),
 section('engineering','Why packaging is a system decision',__kt[396],'anodize','workmanship')],
 [maker('Moog','Integrated Avionics Unit',__kt[397],'iau'),maker('Beyond Gravity','Computer and data-handling products','A second spacecraft-specific reference for understanding where an avionics enclosure fits in the control system.','beyond-electronics')],
 [alternative('Integrated avionics unit','Combines several spacecraft-control functions within a coordinated package.','Internal interfaces and common resources become part of the unit architecture.','iau'),alternative('Separate control boxes','Allows individual functions to have distinct packaging and thermal interfaces.','Additional harness, mounts and connectors consume mass and volume.','beyond-electronics')],
 [__kt[398]],
 [term('Telemetry','Measurements and status sent from the spacecraft to operators.'),term('Backplane','A shared electrical interface connecting multiple electronic cards.')],['flight:08.01','flight:07.05','flight:02.03','flight:04.03']);

function solarCells(record) {
 const silicon=record.materialId==='pv-silicon';
 return article(silicon?'silicon-cell-assembly':'multijunction-cell-assembly',
  `${silicon?'Silicon':'Multijunction'} photovoltaic cells are the active electrical surface of the solar blanket. Cell packages, interconnects and protective layers must function together while the blanket is stowed, deployed and repeatedly heated and cooled.`,[
  section('purpose','Turning illuminated area into power',__kt[399],'esa-cell','power'),
  section('operation','What this cell technology changes',silicon?__kt[400]:__kt[401],'spectrolab','sharp'),
  section('engineering','Engineering a deployable cell assembly',__kt[402],'rosa','esa-cell')],
  [maker('Sharp','Silicon and compound-semiconductor space cells','A real product family for comparing cell technologies; this does not establish the supplier of the modeled blanket.','sharp'),maker('Spectrolab','Multijunction cells and CIC assemblies','A cell-interconnect-coverglass offering illustrating the assembled product boundary.','spectrolab')],
  [alternative(silicon?'Multijunction cells':'Silicon cells',silicon?'Can reduce the active area required for a specified power target.':'Offer a different cost, fabrication and power-density trade.', 'The complete comparison includes radiation degradation, temperature, packaging and procurement, not efficiency alone.','sharp','spectrolab'),alternative('Rigid-panel cell mounting','Supports cells on a relatively stiff substrate.','Stowage and deployment geometry differ from a flexible blanket.','rosa')],
  [__kt[403]],
  [term('CIC','Cell-interconnect-coverglass assembly.'),term('String','A connected group of cells arranged to provide a useful electrical output.')],['flight:02.01','flight:02.01.02','flight:02.01.03','flight:02.03']);
}

topics.coverglass = article('solar-cell-coverglass',
 __kt[404],[
 section('purpose','Protecting without blocking useful light',__kt[405],'esa-cell'),
 section('operation','A transparent layer has several interfaces',__kt[406],'spectrolab','rosa'),
 section('engineering','Choosing a complete optical package',__kt[407],'spectrolab','sharp')],
 [maker('Spectrolab','Cell-interconnect-coverglass assemblies',__kt[408],'spectrolab'),maker('Sharp','Space-cell assembly examples','A second primary reference for comparing cell technology and packaging, rather than choosing coverglass by appearance.','sharp')],
 [alternative('Thicker protective glass','May suit a different environmental protection requirement.','Adds mass and affects cell-assembly mechanics and optical transmission.','esa-cell'),alternative('Different coating or bonding stack','Can tune transmission and environmental behavior for the selected cell.','Compatibility must be demonstrated for the complete assembly.','spectrolab')],
 [__kt[409]],
 [term('Antireflection coating','A surface coating designed to reduce reflected light over a specified wavelength range.'),term('Optical transmission','The fraction of incident light that passes through a material or assembly.')],['flight:02.01.01','flight:02.01.03']);

topics.backing = article('solar-blanket-backing',
 __kt[410],[
 section('purpose','Holding the active surface together',__kt[411],'rosa','sheldahl'),
 section('operation','Flexibility with controlled strain',__kt[412],'rosa'),
 section('engineering','Film, reinforcement and surface choices',__kt[413],'sheldahl','thermal')],
 [maker('Sheldahl','Space films and coated materials',__kt[414],'sheldahl'),maker('Redwire','Deployable-array architecture reference',__kt[415],'redwire')],
 [alternative('Reinforced flexible blanket','Local reinforcement can control load transfer at supports and edges.','Extra layers change folding, mass and local stiffness.','rosa'),alternative('Rigid panel substrate','Provides a more stable mounting surface for cells.','It needs a different stowage and deployment strategy.','structures')],
 [__kt[416]],
 [term('Laminate','A bonded stack of layers that work together.'),term('Bend radius','The radius of curvature imposed on a flexible assembly.')],['flight:02.01.01','flight:02.01.04','flight:07.04']);

topics.boom = article('deployable-array-composite-boom',
 __kt[417],[
 section('purpose','Creating a large array from a small package',__kt[418],'rosa','structures'),
 section('operation','Why a composite boom can change shape',__kt[419],'rosa'),
 section('engineering','What a dark woven surface cannot tell you',__kt[420],'structures','redwire')],
 [maker('Redwire','ROSA-class deployable-array reference',__kt[421],'redwire','rosa'),maker('Beyond Gravity','Spacecraft structural products','Useful for comparing composite and metal structural families and their interfaces.','beyond-structures')],
 [alternative('Hinged rigid-panel array','Uses panel hinges to unfold a stiff array.','The stowed package, number of joints and deployment kinematics differ.','structures'),alternative('Motor-driven extendable support','Can control extension through a dedicated drive architecture.','Adds mechanism, power and control interfaces that require their own design.','sada')],
 [__kt[422]],
 [term('Ply','One oriented layer in a composite laminate.'),term('Buckling','A loss of structural stability under compressive or combined loading.')],['flight:02.01','flight:02.01.03','flight:07.04']);

topics.busbar = article('power-bus-conductors',
 __kt[423],[
 section('purpose','A shared route for electrical energy',__kt[424],'power','busbars'),
 section('operation','Resistance, heating and changing currents',__kt[425],'busbars'),
 section('engineering','Connections often govern the installation',__kt[426],'workmanship','iss-atcs')],
 [maker('Rogers Corporation','ROLINX laminated busbars',__kt[427],'busbars')],
 [alternative('Insulated cable harness','Can accommodate flexible routes and separate branch connections.','Bend space, terminations and thermal behavior differ from a rigid bar.','harness'),alternative('Laminated conductor assembly','Can bring supply and return paths close together in a compact package.','The insulation stack and terminal geometry require coordinated fabrication.','busbars')],
 [__kt[428]],
 [term('Voltage drop','The reduction in voltage caused by current passing through impedance.'),term('Inductance','The property that relates changing current to an induced voltage.')],['flight:02.03','flight:02.03.01','flight:07.05']);

function coldPlate(hardware) {
 const kind=hardware?.energySystem?.thermal?.kind;
 const specific=kind==='passive-local'?__kt[429]:kind==='heat-lift'?__kt[430]:__kt[431];
 return article('payload-thermal-interface-'+(kind||'pumped'),
  __kt[432],[
  section('purpose','Connecting a hot device to the cooling system',__kt[433],'thermal','act-chassis'),
  section('operation','The heat path in this configuration',specific+__kt[434],'heat-pipes','iss-atcs','redwire'),
  section('engineering','Choosing construction and interfaces',__kt[435],'act-hik','act-chassis')],
  [maker('Advanced Cooling Technologies','HiK plates and embedded heat-pipe technology',__kt[436],'act-hik'),maker('Redwire','ODC thermal architecture study','A relevant local heat-transport reference; it is not a supplier drawing for this plate.','redwire')],
  [alternative('Solid heat spreader','Distributes heat without an internal working fluid.','Long distances or high heat loads can require more metal or a larger temperature difference.','thermal'),alternative('Embedded heat pipes','Move heat through phase change within a plate or panel.','Operating temperature, wick behavior and working-fluid compatibility must be established.','heat-pipes')],
  [__kt[437]],
  [term('Thermal resistance','Temperature rise per unit of heat flow through a path.'),term('Spreader','A part that distributes heat from a concentrated source over a larger area.')],['flight:01.01','flight:01.01.02','flight:03.02','flight:03.01']);
}

function radiatorFinish(record) {
 const paint=record.materialId==='radiator-white-paint';
 return article(paint?'radiator-white-coating':'radiator-glass-osr',
  paint?__kt[438]:__kt[439],[
  section('purpose','The surface that space sees',__kt[440],'thermal'),
  section('operation',paint?'How a white thermal coating works':'How a second-surface reflector works',paint?__kt[441]:__kt[442],paint?'az93':'osr'),
  section('engineering','Finishing a deployable radiator',__kt[443],'act-radiator','redwire')],
  [maker(paint?'AZ Technology':'Excelitas / Qioptiq',paint?'AZ-93 white coating':'Optical Solar Reflector families',paint?'A real thermal coating example, not a released application specification for these panels.':'Real glass reflector products for comparison; no particular glass or conductive layer is selected here.',paint?'az93':'osr')],
  [alternative(paint?'Glass OSR finish':'White thermal-control coating',paint?'Provides another way to combine solar reflectance with thermal emission.':'Can cover complex surfaces without an array of separate glass elements.',paint?'Adds tile bonding, joints and glass-handling considerations.':'Application process, aging and optical performance must match the mission.',paint?'osr':'az93'),alternative('Different controlled optical stack','Can address a different temperature or environmental requirement.','The choice requires measured properties and a compatible substrate, not a color match.','thermal')],
  [__kt[444]],
  [term('Absorptance','The fraction of incident radiation absorbed by a surface.'),term('Emittance','How effectively a surface emits thermal radiation compared with an ideal emitter.')],['flight:03.01','flight:03.01.02','flight:03.01.03']);
}

topics.radiatorFace = article('radiator-face-sheets',
 __kt[445],[
 section('purpose','A panel skin with two jobs',__kt[446],'act-radiator'),
 section('operation','How heat reaches the whole surface',__kt[447],'thermal','redwire'),
 section('engineering','Manufacture and load introduction',__kt[448],'beyond-structures','act-radiator')],
 [maker('Advanced Cooling Technologies','Honeycomb radiator panels','A real integrated-panel comparison connecting structural construction with thermal transport.','act-radiator'),maker('Redwire','ODC power and thermal study',__kt[449],'redwire')],
 [alternative('Different skin thickness or alloy','Can shift the balance among stiffness, heat spreading and mass.','Changes must be assessed with the core, joints and load cases.','structures'),alternative('Composite structural skin with a thermal path','May suit a stiffness or expansion requirement.','Heat spreading and metal-to-composite interfaces need separate attention.','beyond-structures')],
 [__kt[450]],
 [term('Face sheet','A structural skin bonded to a sandwich core.'),term('Gauge','The specified thickness of sheet material.')],['flight:03.01.01','flight:03.01.03','flight:03.01.04']);

topics.radiatorCore = article('radiator-sandwich-core',
 __kt[451],[
 section('purpose','Making a broad, lightweight panel',__kt[452],'beyond-structures','structures'),
 section('operation','Cells, bonds and local loads',__kt[453],'act-radiator'),
 section('engineering','Why honeycomb is only one allocation',__kt[454],'redwire','beyond-structures')],
 [maker('Advanced Cooling Technologies','Honeycomb radiator-panel construction','A relevant manufacturing example with integrated thermal hardware, not a specified supplier for this core.','act-radiator'),maker('Beyond Gravity','Sandwich spacecraft panels','Examples of real panels and inserts to compare load introduction and fabrication.','beyond-structures')],
 [alternative('Foam-based core or spreader','Offers a different internal structure and possible heat-spreading behavior.','Density, conductivity, bonding and local-load capacity must be compared.','redwire'),alternative('Stiffened metal panel','Uses ribs or other features instead of a bonded cellular sandwich.','Mass, thermal distortion and fabrication trade differently.','structures')],
 [__kt[455]],
 [term('Shear transfer','Passing a load parallel to a bonded interface.'),term('Insert','A local fitting that introduces an attachment load into a lightweight panel.')],['flight:03.01.02','flight:03.01.04','flight:07.02.03']);

function radiatorPassage(hardware) {
 const lift=hardware?.energySystem?.thermal?.kind==='heat-lift';
 return article(lift?'heat-lift-radiator-passages':'pumped-radiator-passages',
  __kt[456],[
  section('purpose','Delivering heat across a radiator',__kt[457],'iss-atcs','act-radiator'),
  section('operation','The working-fluid boundary',lift?__kt[458]:__kt[459],lift?'heat-pump':'iss-atcs'),
  section('engineering','Joining thermal and pressure hardware',__kt[460],'act-radiator','thermal')],
  [maker('Advanced Cooling Technologies','Integrated radiator panels',__kt[461],'act-radiator')],
  [alternative('Embedded heat pipes','Can distribute heat through sealed passive devices.','Operating range and capillary limits replace some pumped-flow considerations.','heat-pipes'),alternative('Different passage spacing or parallel routing','Can change temperature uniformity and pressure loss.','Additional joints and flow balancing may be needed.','iss-atcs')],
  [__kt[462]],
  [term('Wetted material','Material directly in contact with the working fluid.'),term('Pressure boundary','The structure that contains a pressurized fluid.')],['flight:03.01','flight:03.01.02','flight:03.02']);
}

topics.coolant = article('pumped-coolant-hardware',
 __kt[463],[
 section('purpose','Connecting separated thermal equipment',__kt[464],'iss-atcs'),
 section('operation','Flow has a cost',__kt[465],'iss-atcs','thermal'),
 section('engineering','Materials and joints follow the fluid',__kt[466],'heat-pipes','structures')],
 [maker('NASA / ISS program','Active thermal-control system reference',__kt[467],'iss-atcs'),maker('Advanced Cooling Technologies','Spacecraft thermal hardware','A relevant thermal-manufacturing comparison; individual products require a matched fluid and interface specification.','act-radiator')],
 [alternative('Local passive transport','Can connect nearby heat sources and radiators without a circulation pump.','Distance, temperature difference and passive transport limits govern feasibility.','heat-pipes'),alternative('Separate redundant loops','Can create multiple thermal transport paths.','Additional pumps, plumbing and controls consume mass and power.','iss-atcs')],
 [__kt[468]],
 [term('Header','A manifold that distributes or collects fluid among branches.'),term('Pressure loss','The reduction in fluid pressure along a flow path.')],['flight:03.02','flight:03.01.04','flight:01.01.01']);

topics.passive = article('local-heat-pipes-and-straps',
 __kt[469],[
 section('purpose','A short, deliberate heat path',__kt[470],'redwire','thermal'),
 section('operation','Conduction versus phase change',__kt[471],'heat-pipes'),
 section('engineering','Mechanical flexibility is useful too',__kt[472],'act-hik','thermal')],
 [maker('Advanced Cooling Technologies','Heat pipes and HiK plates',__kt[473],'act-hik'),maker('Redwire','ODC local thermal architecture','A relevant reference for placing transport near the payload and radiator.','redwire')],
 [alternative('Solid or flexible thermal strap','A straightforward conductive connection with no internal working fluid.','Long paths or large loads can demand more material or temperature difference.','thermal'),alternative('Pumped liquid loop','Can distribute heat across a larger separated system.','Adds pump power, fluid-routing and control requirements.','iss-atcs')],
 [__kt[474]],
 [term('Wick','A porous or grooved structure that returns liquid by capillary action.'),term('Capillary limit','A heat-pipe operating limit associated with available liquid-return pressure.')],['flight:03.02','flight:01.01.01','flight:03.01']);

topics.heatPump = article('heat-pump-enclosure',
 __kt[475],[
 section('purpose','Moving heat to a hotter rejection system',__kt[476],'heat-pump','thermal'),
 section('operation','The machinery behind the housing',__kt[477],'heat-pump'),
 section('engineering','Several interfaces share one package',__kt[478],'structures','workmanship')],
 [maker('NASA Johnson Space Center','Spacecraft vapor-compression heat-pump research',__kt[479],'heat-pump')],
 [alternative('Direct rejection with a larger radiator','Avoids the heat-lift compressor cycle.','The required radiator depends on payload temperature and environmental heat loads.','thermal'),alternative('Local heat pipes and spreaders','Can support a passive architecture when useful temperature differences exist.','They do not independently lift heat to a hotter sink.','heat-pipes')],
 [__kt[480]],
 [term('Heat lift','Using work to transfer heat to a higher rejection temperature.'),term('Condenser','The heat exchanger where vapor rejects heat and condenses in a vapor-compression cycle.')],['flight:03.02','flight:03.02.02','flight:03.01.04','flight:02.03']);

topics.heatLiftLines = article('heat-lift-transport-lines',
 __kt[481],[
 section('purpose','Connecting unlike thermal conditions',__kt[482],'heat-pump'),
 section('operation','Fluid state changes the design problem',__kt[483],'heat-pump'),
 section('engineering','Why the material remains unresolved',__kt[484],'iss-atcs','structures')],
 [maker('NASA Johnson Space Center','Heat-pump technology research','Provides a real engineering context for the fluid-network problem, not a released design for these lines.','heat-pump'),maker('Advanced Cooling Technologies','Integrated thermal-hardware examples',__kt[485],'act-radiator')],
 [alternative('Separate secondary transport loop','Can place an interface heat exchanger between the heat pump and remote equipment.','Adds thermal resistance, pumping or other transport equipment and more interfaces.','iss-atcs'),alternative('Direct heat-pump circuit connection','Can reduce the number of intermediate heat exchanges.','Extends the working-fluid circuit and its operating constraints through more of the spacecraft.','heat-pump')],
 [__kt[486]],
 [term('Two-phase flow','Flow containing both liquid and vapor.'),term('Secondary loop','A separate transport circuit coupled through a heat exchanger.')],['flight:03.02.01','flight:03.01.04','flight:01.01.01']);

topics.mliAmber = article('amber-blanket-outer-cover',
 __kt[487],[
 section('purpose','The outer boundary of an insulation system',__kt[488],'mli-optics'),
 section('operation','Why the surface looks amber',__kt[489],'mli-optics','sheldahl'),
 section('engineering','A blanket is fabricated around its equipment',__kt[490],'sheldahl','thermal')],
 [maker('Sheldahl','Coated films and blanket materials',__kt[491],'sheldahl')],
 [alternative('White outer cover','Can provide a different environmental and optical outer surface over insulation.','The outer cover and concealed stack still require coordinated design.','beta'),alternative('Different coated-film stack','Can be tailored for exposure, grounding or handling requirements.','Changing one layer changes more than appearance and requires property verification.','sheldahl')],
 [__kt[492]],
 [term('MLI','Multilayer insulation: separated reflective layers that reduce radiative heat transfer.'),term('Outer cover','The exposed protective and optical surface of a blanket assembly.')],['flight:03.03','flight:03.03.02','flight:03.03.03']);

topics.mliWhite = article('white-blanket-outer-cover',
 __kt[493],[
 section('purpose','Protecting the insulation underneath',__kt[494],'beta','mli-optics'),
 section('operation','Fabric and reflective layers do different jobs',__kt[495],'sheldahl','thermal'),
 section('engineering','Choosing a cover construction',__kt[496],'beta','sheldahl')],
 [maker('Dunmore','Beta cloth materials',__kt[497],'beta'),maker('Sheldahl','Space thermal-control material handbook','Useful for placing the cover within a larger menu of blanket films and constructions.','sheldahl')],
 [alternative('Aluminized polymer outer film','Provides a lightweight film-based external surface.','Handling, optical behavior and environmental protection differ from fabric.','mli-optics'),alternative('Locally reinforced blanket cover','Can address attachment or handling demands around a specific feature.','Reinforcement adds stiffness and may create local thermal paths.','thermal')],
 [__kt[498]],
 [term('Beta cloth','A glass-fabric material class associated with a PTFE treatment.'),term('Thermal bridge','A local path that transfers more heat across an insulating assembly.')],['flight:03.03.01','flight:03.03.03','flight:03.01.01']);

topics.mliInner = article('concealed-reflective-insulation-stack',
 __kt[499],[
 section('purpose','Insulation without a thick solid wall',__kt[500],'mli-optics','thermal'),
 section('operation','Keeping the layers from becoming one conductor',__kt[501],'sheldahl','mli-optics'),
 section('engineering','Making a blanket that fits',__kt[502],'thermal','sheldahl')],
 [maker('Sheldahl','Reflective films and thermal-control materials','A real handbook for comparing potential layer materials; it does not define this blanket’s complete recipe.','sheldahl'),maker('NASA','MLI optical-property research','A primary source for understanding why outer-film measurements and assembled-blanket behavior are different questions.','mli-optics')],
 [alternative('Different layer and spacer construction','Can be adapted to temperature, handling and mass requirements.','More layers are not automatically better if installation creates excessive contact.','sheldahl'),alternative('Controlled conductive mounting','Can deliberately couple equipment to a thermal sink where insulation is undesirable.','The resulting heat path must be designed with the surrounding blanket.','thermal')],
 [__kt[503]],
 [term('Effective emittance','A system-level parameter representing the radiative behavior of an assembly.'),term('Spacer','Material or geometry that keeps adjacent reflective layers apart.')],['flight:03.03','flight:03.03.01','flight:03.03.02']);

topics.cmg = article('cmg-housing-and-gimbal-frame',
 __kt[504],[
 section('purpose','Turning stored momentum into attitude control',__kt[505],'cmg','gnc'),
 section('operation','The interfaces around a moving rotor',__kt[506],'cmg'),
 section('engineering','Stiffness, alignment and disturbance',__kt[507],'structures','anodize')],
 [maker('Airbus','CMG 15-45 S',__kt[508],'cmg')],
 [alternative('Reaction-wheel assembly','Changes wheel speed to exchange momentum with the spacecraft.','Torque capability and control architecture differ from gimballed momentum exchange.','gnc'),alternative('Different CMG mounting arrangement','Can alter packaging and the directions available to the actuator cluster.','Structural dynamics and control singularities need joint analysis.','gnc')],
 [__kt[509]],
 [term('Gimbal','A pivoting support that changes an assembly’s orientation.'),term('Angular momentum','The rotational quantity whose change is associated with applied torque.')],['flight:04.01','flight:04.02','flight:07.01']);

topics.magCase = article('magnetorquer-outer-casing',
 __kt[510],[
 section('purpose','Packaging a magnetic actuator',__kt[511],'magnetorquer','gnc'),
 section('operation','Orientation matters as much as appearance',__kt[512],'gnc'),
 section('engineering','A casing in a magnetic environment',__kt[513],'magnetorquer','structures')],
 [maker('NewSpace Systems','Magnetorquer rod families',__kt[514],'magnetorquer')],
 [alternative('Air-core magnetic coil','Produces a magnetic dipole without a ferromagnetic rod core.','Packaging, electrical power and achievable moment differ.','gnc'),alternative('Separate actuator mounts','Can orient individual rods independently around available structure.','More attachments and longer harness routes may be required.','structures')],
 [__kt[515]],
 [term('Magnetic dipole','A directional magnetic moment produced by a magnet or current loop.'),term('Momentum unloading','Reducing stored momentum in attitude-control devices through an external torque.')],['flight:04.02','flight:04.02.02','flight:04.01']);

topics.magWinding = article('magnetorquer-conductor-winding',
 __kt[516],[
 section('purpose','Converting electrical current into magnetic moment',__kt[517],'gnc','magnetorquer'),
 section('operation','More turns involve several tradeoffs',__kt[518],'magnetorquer'),
 section('engineering','Building and supporting a coil',__kt[519],'workmanship','structures')],
 [maker('NewSpace Systems','Magnetorquer rod products',__kt[520],'magnetorquer'),maker('NASA','Electrical workmanship resources','Useful for understanding why termination and insulation quality matter alongside the electromagnetic design.','workmanship')],
 [alternative('Different wire gauge and turn count','Can trade electrical resistance, current and packaging.','The core and driver must be analyzed with the revised winding.','magnetorquer'),alternative('Air-core coil','Removes the ferromagnetic core from the actuator.','It changes the attainable moment, volume and power requirements.','gnc')],
 [__kt[521]],
 [term('Ampere-turns','Current multiplied by the number of coil turns.'),term('Winding resistance','The electrical resistance of the coil conductor and its connections.')],['flight:04.02','flight:04.02.01','flight:02.03']);

topics.starBaffle = article('star-tracker-baffle',
 __kt[522],[
 section('purpose','Helping a sensor recognize the sky',__kt[523],'hydra','hubble'),
 section('operation','Geometry before black paint',__kt[524],'superblack','hydra'),
 section('engineering','Placement, cleanliness and thermal alignment',__kt[525],'structures','superblack')],
 [maker('Sodern','HYDRA star-tracker family',__kt[526],'hydra')],
 [alternative('Different baffle geometry','Can change the balance between clear field of view and stray-light rejection.','Length and opening affect accommodation and thermal behavior.','hubble'),alternative('Different low-reflectance coating','Can improve performance in a particular spectral or angular range.','Qualification, contamination and handling requirements must match the optical system.','superblack')],
 [__kt[527]],
 [term('Stray light','Unwanted illumination reaching an optical system.'),term('Field of view','The angular region an optical instrument is intended to observe.')],['flight:04.03','flight:05.03.02','flight:07.01']);

topics.patchFace = article('s-band-patch-dielectric-face',
 __kt[528],[
 section('purpose','An RF surface, not just a protective lid',__kt[529],'anywaves','rf-laminate'),
 section('operation','Materials affect the electromagnetic design',__kt[530],'rf-laminate','anywaves'),
 section('engineering','Comparing real constructions',__kt[531],'anywaves','structures')],
 [maker('Anywaves','S-band patch antenna families',__kt[532],'anywaves'),maker('Rogers Corporation','RT/duroid microwave laminates','A relevant substrate-material comparison, not evidence that the outer cover uses that laminate.','rf-laminate')],
 [alternative('Different dielectric or radome construction','Can meet a different mechanical or electromagnetic requirement.','The antenna must be analyzed and tested with the revised material.','anywaves'),alternative('Another antenna geometry','A non-patch solution can offer different coverage or packaging.','Gain, polarization, accommodation and feed requirements change.','nisar')],
 [__kt[533]],
 [term('Dielectric','An electrically insulating material that responds to an electric field.'),term('Radome','A cover designed to protect an antenna while allowing its radio-frequency operation.')],['flight:05.01','flight:05.01.02','flight:07.05']);

function rfContact(ka) {
 return article(ka?'ka-feed-contact-finish':'s-band-feed-contact-finish',
  `The ${ka?'Ka-band':'S-band'} contact finish is a thin functional layer on a conductor or connector interface. The gold-colored detail represents plating, not a solid-gold antenna part or a complete RF feed specification.`,[
  section('purpose','Keeping an electrical interface usable',__kt[534],'contacts',ka?'nisar':'anywaves'),
  section('operation',ka?'Why the Ka-band feed needs its own design':'Why the S-band feed needs its own design',ka?__kt[535]:__kt[536],ka?'nisar':'anywaves','contacts'),
  section('engineering','Specifying the layer rather than the color',__kt[537],'contacts','workmanship')],
  [maker('Glenair','Documented contact-plating construction','A primary example of contact materials and finish layers, with a different connector function from an RF feed.','contacts'),maker(ka?'NASA JPL':'Anywaves',ka?'NISAR Ka-band downlink reference':'Patch antenna product portfolio',ka?'A mission-system reference for the surrounding RF architecture, not the supplier of this contact.':'A relevant antenna-level reference for understanding what the contact must connect to.',ka?'nisar':'anywaves')],
  [alternative('Another qualified contact finish','Can meet different mating, corrosion or electrical requirements.','The full connector specification must support the change.','contacts'),alternative('Different feed interface','A different connector or guided-wave arrangement can suit the antenna architecture.','Mechanical and RF interfaces need redesign together.',ka?'nisar':'anywaves')],
  [__kt[538]],
  [term('Plating','A thin deposited layer on a base material.'),term('Impedance match','Compatibility between electrical interfaces that limits unwanted signal reflections.')],ka?['flight:05.02','flight:05.02.01']:['flight:05.01','flight:05.01.01']);
}

topics.reflector = article('ka-reflector-and-support',
 __kt[539],[
 section('purpose','Concentrating a communications beam',__kt[540],'nisar'),
 section('operation','Shape and alignment become RF properties',__kt[541],'nisar','structures'),
 section('engineering','Metal and composite implementations',__kt[542],'beyond-structures','act-radiator')],
 [maker('Advanced Cooling Technologies','Panel and reflector-support manufacturing examples','A structural-manufacturing reference, not an RF antenna supplier selection for this dish.','act-radiator'),maker('NASA JPL','NISAR Ka-band downlink system','A real mission reference for studying an antenna in its complete communications system.','nisar')],
 [alternative('Composite reflector with conductive surface','Can tailor structural and thermal behavior.','Coating, laminate and joint tolerances must preserve the RF surface.','beyond-structures'),alternative('Phased-array antenna architecture','Can use an electronically controlled aperture instead of this reflector arrangement.','Power, thermal, control and hardware complexity change substantially.','anywaves')],
 [__kt[543]],
 [term('Aperture','The effective opening or area of an antenna that interacts with the wave.'),term('Feed','The component that couples radio-frequency energy into or out of the antenna.')],['flight:05.02','flight:05.02.02','flight:07.01']);

topics.opticalSupport = article('optical-terminal-yoke',
 __kt[544],[
 section('purpose','Holding a precise communications direction',__kt[545],'optical-terminal','tbird'),
 section('operation','Motion, alignment and connections',__kt[546],'optical-terminal','sada'),
 section('engineering','Mounting an optical system on a warm structure',__kt[547],'structures','anodize')],
 [maker('Rocket Lab','Optical communications terminal family','A real terminal comparison for packaging and pointing interfaces; this model is not a product-level replica.','optical-terminal'),maker('MIT Lincoln Laboratory','TBIRD demonstration','An alternative mission example for studying how terminal and spacecraft pointing can be coordinated.','tbird')],
 [alternative('Spacecraft-body pointing','Can reduce the need for a large articulating terminal mount.','Communications orientation competes with other spacecraft pointing needs.','tbird'),alternative('Articulated optical head','Provides terminal-level pointing freedom.','Moving joints, cable management and alignment add design work.','optical-terminal')],
 [__kt[548]],
 [term('Line of sight','The direction along which the optical terminal transmits or receives.'),term('Backlash','Lost motion when a mechanism reverses direction.')],['flight:05.03','flight:05.03.02','flight:05.03.04','flight:04.01']);

topics.opticalBaffle = article('communications-optical-baffle',
 __kt[549],[
 section('purpose','A clean optical view for a narrow beam',__kt[550],'optical-terminal','superblack'),
 section('operation','Blocking and absorbing unwanted rays',__kt[551],'hubble','superblack'),
 section('engineering','Interfaces with the terminal',__kt[552],'structures','anodize')],
 [maker('Rocket Lab','Optical terminal product family','A real communications-head reference to compare packaging; no internal baffle geometry is selected here.','optical-terminal'),maker('European Space Agency','Superblack coating research','A technical reference for the surface side of stray-light control, not a selected coating vendor.','superblack')],
 [alternative('Longer or differently vaned baffle','Can reject additional unwanted optical paths.','Adds accommodation and can restrict field of regard.','hubble'),alternative('Different absorbing coating','Can target the terminal’s spectral band more effectively.','Environmental durability and optical cleanliness must remain compatible.','superblack')],
 [__kt[553]],
 [term('Field of regard','The range of directions to which a terminal can point.'),term('Beam clipping','Obstructing part of the intended optical beam.')],['flight:05.03.01','flight:05.03.04','flight:04.03.01']);

topics.opticalFinish = article('optical-head-housing-finish',
 __kt[554],[
 section('purpose','Keeping an optical package thermally predictable',__kt[555],'thermal','optical-terminal'),
 section('operation','Solar reflection and infrared emission differ',__kt[556],'az93'),
 section('engineering','Coating around precision interfaces',__kt[557],'anodize','thermal')],
 [maker('AZ Technology','AZ-93 thermal-control coating','A relevant material-class example; the modeled head has no released supplier application process.','az93'),maker('Rocket Lab','Optical communications terminal reference','Useful for studying the surrounding instrument package, not for attributing this finish to that product.','optical-terminal')],
 [alternative('Different thermal coating or surface stack','Can target a different exposure or temperature requirement.','Measured optical properties and compatibility need reassessment.','osr'),alternative('Local insulation around the head','Can reduce some unwanted heat exchange.','It changes the heat path and must preserve apertures and moving interfaces.','mli-optics')],
 [__kt[558]],
 [term('Solar absorptance','The fraction of incident solar energy absorbed.'),term('Masking','Protecting selected areas from a coating or finishing process.')],['flight:05.03.01','flight:05.03.02','flight:05.03.04','flight:03.01.01']);

topics.opticalAperture = article('optical-terminal-entrance-optic',
 __kt[559],[
 section('purpose','Admitting the useful beam',__kt[560],'optical-terminal','hubble'),
 section('operation','Several specifications describe one clear part',__kt[561],'window'),
 section('engineering','Glass, coating and mount work together',__kt[562],'structures','superblack')],
 [maker('Edmund Optics','Coated fused-silica window example',__kt[563],'window'),maker('Rocket Lab','Optical communications terminal family','A complete-terminal comparison; its internal prescription is not inferred here.','optical-terminal')],
 [alternative('Separate protective window','Can protect internal optics behind a defined external boundary.','Adds surfaces, possible reflections and a mounting interface.','window'),alternative('Different glass and coating system','Can address a selected wavelength and temperature environment.','Optical transmission, expansion and manufacturing tolerances must be compared together.','window')],
 [__kt[564]],
 [term('Clear aperture','The usable portion of an optic through which the intended light passes.'),term('Optical prescription','The detailed geometry and materials that define an optical system.')],['flight:05.03','flight:05.03.02','flight:05.03.03']);

topics.nozzle = article('engine-expansion-bell-surface',
 __kt[565],[
 section('purpose','The geometry after the throat',__kt[566],'s400'),
 section('operation','Temperature and structure share one thin surface',__kt[567],'s400','structures'),
 section('engineering','What the S400 reference actually establishes',__kt[568],'s400')],
 [maker('ArianeGroup','S400 apogee-motor family',__kt[569],'s400')],
 [alternative('Different nozzle expansion geometry','Can change vacuum performance and the physical envelope.','Mass, length and engine-level thermal design change together.','s400'),alternative('Different engine architecture','May suit another thrust or propulsion requirement.','Propellant, feed system and spacecraft integration must be reconsidered as a system.','valves')],
 [__kt[570]],
 [term('Throat','The narrow nozzle section controlling the flow through a choked rocket nozzle.'),term('Expansion ratio','The ratio of nozzle exit area to throat area.')],['flight:06.01','flight:06.02','flight:06.03','flight:06.04']);

topics.propFeed = article('propellant-feed-and-regulation-hardware',
 __kt[571],[
 section('purpose','Moving fluids under control',__kt[572],'valves','pmd'),
 section('operation','Pressure, flow and compatibility',__kt[573],'valves','pressurant'),
 section('engineering','A propulsion network is assembled through interfaces',__kt[574],'valves','workmanship')],
 [maker('Moog','Chemical-propulsion valves and helium regulators',__kt[575],'valves'),maker('Northrop Grumman','Propellant and pressurant vessel families','Useful references for the upstream interfaces that the feed network must connect.','pmd','pressurant')],
 [alternative('Regulated pressurization','Can maintain a controlled downstream supply as storage conditions change.','Adds regulation hardware and associated interfaces.','valves'),alternative('Different isolation arrangement','Can divide the system into different controllable sections.','Command logic, leakage boundaries and component count change.','valves')],
 [__kt[576]],
 [term('Regulator','A component that controls downstream pressure according to its design.'),term('Isolation valve','A valve used to establish or remove a fluid connection.')],['flight:06.02','flight:06.01','flight:06.03','flight:06.04','flight:06.05']);

function propellantTank(oxidizer) {
 return article(oxidizer?'oxidizer-tank-shell':'fuel-tank-shell',
  `The ${oxidizer?'oxidizer':'fuel'} tank shell contains one of the two separately stored propellants used by the modeled bipropellant system. Its pressure boundary, attachments and internal fluid-management provisions must work together throughout the mission.`,[
  section('purpose',oxidizer?'Keeping the oxidizer separate and available':'Holding fuel for controlled delivery',oxidizer?__kt[577]:__kt[578], 'pmd','valves'),
  section('operation','A shell is part of a fluid system',__kt[579],'pmd'),
  section('engineering',oxidizer?'Compatibility comes before cosmetic material choice':'Material choice includes the complete wetted assembly',oxidizer?__kt[580]:__kt[581],'pmd','structures')],
  [maker('Northrop Grumman','Titanium PMD tank families',__kt[582],'pmd'),maker('Moog','Propulsion valves and regulators','A reference for the connected feed components, not the manufacturer of this shell.','valves')],
  [alternative('Different vessel geometry','Can fit a different spacecraft envelope or packaging constraint.','Wall loads, supports, internal management and usable volume must be reassessed.','pmd'),alternative('Different propellant-management architecture','Can suit another fluid or mission acceleration environment.','The outlet behavior and residual usable inventory need new evidence.','pmd')],
  [__kt[583]],
  [term('PMD','Propellant-management device: internal hardware that helps control liquid delivery.'),term('Wetted assembly','All parts and surfaces that contact the stored or flowing fluid.')],oxidizer?['flight:06.04','flight:06.03','flight:06.02','flight:06.05']:['flight:06.03','flight:06.04','flight:06.02','flight:06.05']);
}

topics.overwrap = article('pressurant-bottle-composite-overwrap',
 __kt[584],[
 section('purpose','Storing pressurant in a light vessel',__kt[585],'pressurant','copv'),
 section('operation','Fiber directions carry pressure loads',__kt[586],'copv'),
 section('engineering','The vessel must be assessed as an assembly',__kt[587],'copv','structures')],
 [maker('Northrop Grumman','Pressurant tank families','A real comparison of metal and COPV options. The modeled carbon overwrap does not identify a specific product.','pressurant'),maker('NASA Engineering and Safety Center','COPV engineering reference','Explains why liner and overwrap behavior cannot be reduced to a simple external texture.','copv')],
 [alternative('All-metal pressure vessel','Uses a metallic wall as the principal pressure structure.','Mass, manufacture and pressure-life behavior differ from a COPV.','pressurant'),alternative('Another liner and winding architecture','Can address a different fluid, pressure or accommodation need.','Load sharing and manufacturing verification must be repeated for that construction.','copv')],
 [__kt[588]],
 [term('COPV','Composite-overwrapped pressure vessel.'),term('Boss','A reinforced vessel fitting or opening that connects the pressure boundary to an interface.')],['flight:06.05','flight:06.02','flight:06.03','flight:06.04']);

export function materialKnowledge(record,catalog,hardware={}) {
 if(!record||record.category!=='flight'||record.massAccounting!=='included-in-parent')return null;
 const wbs=record.wbs||record.id.replace(/^flight:/,'');
 const kind=hardware?.energySystem?.thermal?.kind;
 switch(wbs){
  case '01.01.01': return coldPlate(hardware);
  case '01.01.02': return topics.boards;
  case '01.02.01': return topics.chassis;
  case '01.03.01': return topics.storage;
  case '01.04.01': return topics.network;
  case '02.01.01': return solarCells(record);
  case '02.01.02': return topics.coverglass;
  case '02.01.03': return topics.backing;
  case '02.01.04': return topics.boom;
  case '02.02.01': return topics.battery;
  case '02.03.01': return topics.pcdu;
  case '02.03.02': return topics.busbar;
  case '03.01.01': return radiatorFinish(record);
  case '03.01.02': return topics.radiatorFace;
  case '03.01.03': return topics.radiatorCore;
  case '03.01.04': return radiatorPassage(hardware);
  case '03.02.01': return kind==='passive-local'?topics.passive:kind==='heat-lift'?topics.heatPump:topics.coolant;
  case '03.02.02': return topics.heatLiftLines;
  case '03.03.01': return topics.mliAmber;
  case '03.03.02': return topics.mliWhite;
  case '03.03.03': return topics.mliInner;
  case '04.01.01': return topics.cmg;
  case '04.02.01': return topics.magCase;
  case '04.02.02': return topics.magWinding;
  case '04.03.01': return topics.starBaffle;
  case '05.01.01': return topics.patchFace;
  case '05.01.02': return rfContact(false);
  case '05.02.01': return topics.reflector;
  case '05.02.02': return rfContact(true);
  case '05.03.01': return topics.opticalSupport;
  case '05.03.02': return topics.opticalBaffle;
  case '05.03.03': return topics.opticalFinish;
  case '05.03.04': return topics.opticalAperture;
  case '06.01.01': return topics.nozzle;
  case '06.02.01': return topics.propFeed;
  case '06.03.01': return propellantTank(false);
  case '06.04.01': return propellantTank(true);
  case '06.05.01': return topics.overwrap;
  case '07.01.01': return topics.primaryFrame||null;
  case '07.01.02': return typeof launchAttachment==='function'?launchAttachment(false):null;
  case '07.02.01': return topics.structuralFace||null;
  case '07.02.02': return topics.feedthrough||null;
  case '07.02.03': return topics.structuralCore||null;
  case '07.03.01': return topics.shield||null;
  case '07.04.01': return topics.mechanism||null;
  case '07.05.01': return topics.harness||null;
  case '08.01.01': return topics.avionics;
  case '09.01.01': return typeof launchAttachment==='function'?launchAttachment(true):null;
  default:return null;
 }
}

topics.primaryFrame = article('primary-frame-and-tray-supports',
 __kt[589],[
 section('purpose','Giving every installed item a load path',__kt[590],'structures','beyond-structures'),
 section('operation','Stiffness is different from strength',__kt[591],'structures'),
 section('engineering','Materials, manufacture and access',__kt[592],'beyond-structures','anodize')],
 [maker('Beyond Gravity','Satellite structural products',__kt[593],'beyond-structures'),maker('NASA','Structures and mechanisms handbook','A system-level reference for evaluating architecture and manufacturing choices in context.','structures')],
 [alternative('Panel-dominated structure','Uses load-carrying panels to support equipment and stabilize the body.','Openings and concentrated attachments need careful reinforcement.','beyond-structures'),alternative('Composite primary members','Can tailor stiffness and expansion behavior.','Joints, inspection and thermal/electrical interfaces differ from metal framing.','structures')],
 [__kt[594]],
 [term('Longeron','A principal structural member running along a vehicle’s length.'),term('Load path','The connected route through which forces pass between parts.')],['flight:07.01','flight:01.02.01','flight:07.01.02','flight:07.02.01']);

function launchAttachment(lower) {
 return article(lower?'launch-side-adapter-fitting':'retained-spacecraft-attachment',
  lower?__kt[595]:__kt[596],[
  section('purpose',lower?'Bridging payload and launch vehicle':'Giving the spacecraft a defined attachment',lower?__kt[597]:__kt[598],'lightband','structures'),
  section('operation','Carrying loads before a controlled release',__kt[599],'lightband'),
  section('engineering','Interface drawings govern the details',__kt[600],'beyond-structures','structures')],
  [maker('Rocket Lab','Advanced Lightband',__kt[601],'lightband'),maker('Beyond Gravity','Spacecraft structural interface products','A relevant construction comparison for adapters, panels and local attachments.','beyond-structures')],
  [alternative('Ring-style separation interface','Provides a defined circumferential attachment and release boundary.','The payload and launcher must match its allowed geometry and loads.','lightband'),alternative('Custom adapter or carriage interface','Can accommodate a different payload geometry or launch concept.','Requires its own structural, release and integration evidence.','structures')],
  [lower?__kt[602]:__kt[603]],
  [term('Interface control','The agreed dimensions, loads and functional requirements at a shared boundary.'),term('Retained hardware','Hardware that remains with the specified vehicle after an operation or separation.')],lower?['flight:09.01','flight:07.01.02','launch:vehicle']:['flight:07.01','flight:09.01','flight:09.01.01']);
}

topics.structuralFace = article('core-sandwich-face-sheets',
 __kt[604],[
 section('purpose','A structural skin around the core',__kt[605],'structures','beyond-structures'),
 section('operation','Separated skins resist bending',__kt[606],'beyond-structures'),
 section('engineering','Designing a panel for its actual neighbors',__kt[607],'structures','anodize')],
 [maker('Beyond Gravity','Satellite sandwich panels and inserts',__kt[608],'beyond-structures')],
 [alternative('Machined or stiffened metal panel','Can integrate local bosses and access features without a bonded core.','Mass, stiffness and fabrication effort trade differently.','structures'),alternative('Composite face sheets','Can tailor in-plane stiffness and thermal expansion.','Joining, conductivity and through-thickness behavior need separate treatment.','beyond-structures')],
 [__kt[609]],
 [term('Sandwich panel','Two structural skins separated by a lightweight supporting core.'),term('Local reinforcement','Additional structure where a concentrated load or opening requires it.')],['flight:07.02','flight:07.02.03','flight:07.01.01','flight:03.01.02']);

topics.feedthrough = article('feedthrough-seals-and-insulators',
 __kt[610],[
 section('purpose','Preserving a boundary around a connection',__kt[611],'feedthrough','harness'),
 section('operation','Isolation and sealing are separate requirements',__kt[612],'feedthrough'),
 section('engineering','Matching the part to the interface',__kt[613],'structures','workmanship')],
 [maker('CeramTec','Ceramaseal feedthroughs',__kt[614],'feedthrough'),maker('Glenair','Layered cable and connector references','Useful for distinguishing cable insulation from a boundary seal or connector insert.','harness','contacts')],
 [alternative('Hermetic ceramic-to-metal feedthrough','Can suit a boundary requiring both electrical isolation and controlled leakage.','Material joining and thermal expansion require a matched assembly.','feedthrough'),alternative('Connector or grommet at an unpressurized panel','Can provide retention, strain relief and abrasion protection without a hermetic boundary.','It should not be credited with pressure sealing or fluid compatibility it has not demonstrated.','harness')],
 [__kt[615]],
 [term('Hermetic','Designed to provide a specified very low leakage boundary.'),term('Strain relief','Support that prevents cable loads from concentrating at a termination.')],['flight:07.02','flight:07.05','flight:06.02','flight:02.03']);

topics.structuralCore = article('core-enclosure-sandwich-core',
 __kt[616],[
 section('purpose','Supporting thin structural skins',__kt[617],'structures','beyond-structures'),
 section('operation','Loads enter through more than cell walls',__kt[618],'beyond-structures'),
 section('engineering','Making the concealed volume manufacturable',__kt[619],'structures','act-radiator')],
 [maker('Beyond Gravity','Sandwich spacecraft structures','A real construction reference including panels and local interfaces; no particular core product is selected.','beyond-structures'),maker('Advanced Cooling Technologies','Bonded honeycomb-panel manufacturing','A related panel-manufacturing example, with radiator-specific functions that should not be assumed for this enclosure.','act-radiator')],
 [alternative('Foam core','Provides a different cellular support structure.','Mechanical, bonding and environmental properties need comparison for the intended panel.','redwire'),alternative('Rib-stiffened sheet construction','Creates stiffness through discrete structural features.','The load paths, access and manufacturing process differ from a bonded sandwich.','structures')],
 [__kt[620]],
 [term('Closeout','A detail that finishes or reinforces the edge of a sandwich panel.'),term('Bond line','The adhesive interface joining two parts.')],['flight:07.02.01','flight:07.02','flight:03.01.03']);

topics.shield = article('local-radiation-shield-liner',
 __kt[621],[
 section('purpose','Protecting sensitive equipment selectively',__kt[622],'radiation','structures'),
 section('operation','The whole surrounding geometry matters',__kt[623],'structures','radiation'),
 section('engineering','What the Juno example does and does not show',__kt[624],'juno','radiation')],
 [maker('NASA JPL / Juno mission','Titanium electronics vault','A documented reference architecture, not a commercial shield product or proof of LEO performance.','juno'),maker('NASA','Electronics radiation-analysis resources','A primary starting point for connecting environment, shielding and component susceptibility.','radiation')],
 [alternative('Use existing structural shielding','Equipment placement can take advantage of material already carried by the spacecraft.','The shielding is directional and must be evaluated at the actual component location.','structures'),alternative('Spot or layered shielding','Can tailor protection around a particularly sensitive device.','Material sequence, secondary particles and added mass require analysis.','structures')],
 [__kt[625]],
 [term('TID','Total ionizing dose accumulated by a material or device.'),term('Single-event effect','A device response caused by an individual energetic particle.')],['flight:07.03','flight:01.01','flight:01.03','flight:08.01']);

topics.mechanism = article('deployment-drums-hinges-yokes-drives',
 __kt[626],[
 section('purpose','Moving large appendages through a controlled sequence',__kt[627],'rosa','structures'),
 section('operation','Motion must preserve other interfaces',__kt[628],'sada'),
 section('engineering','The awkward details determine success',__kt[629],'structures','anodize')],
 [maker('Moog','Type 2 Solar Array Drive Assembly',__kt[630],'sada'),maker('Redwire / NASA ROSA reference','Flexible-array deployment architecture','A relevant example of coordinated boom and blanket deployment rather than a universal mechanism recipe.','rosa','redwire')],
 [alternative('Stored-energy deployment','Can use the elastic behavior of a stowed structure to extend it.','Release, rate control and final configuration still need design and verification.','rosa'),alternative('Motor-driven deployment','Can provide commanded motion and position control.','Adds power, drive electronics and mechanism interfaces.','sada')],
 [__kt[631]],
 [term('Launch restraint','Hardware that holds a component in its stowed configuration during launch.'),term('Slip ring','An electrical connection designed to accommodate relative rotation.')],['flight:07.04','flight:02.01.04','flight:03.01','flight:07.05']);

topics.harness = article('power-and-data-harness-covering',
 __kt[632],[
 section('purpose','Making electrical connections survivable',__kt[633],'harness','workmanship'),
 section('operation','Different layers solve different problems',__kt[634],'harness'),
 section('engineering','Routing is part of the design',__kt[635],'contacts','workmanship')],
 [maker('Glenair','SpaceWire cable and connector specifications',__kt[636],'harness','contacts'),maker('NASA','Workmanship standards and training','A primary reference for cable, harness and termination practices that turn materials into a reliable assembly.','workmanship')],
 [alternative('Individual insulated wires with local sleeving','Can adapt to branching routes and varied electrical functions.','Bundle restraint and protection need attention throughout the route.','workmanship'),alternative('Rigid-flex or integrated interconnect','Can remove some cable and connector transitions within a unit.','Fabrication, bend constraints and repairability differ from a conventional harness.','ttm')],
 [__kt[637]],
 [term('Shield termination','The electrical connection of a cable shield at an interface.'),term('Bend allowance','Space needed to route a cable without exceeding its permissible curvature.')],['flight:07.05','flight:02.03.02','flight:01.04','flight:08.01','flight:07.04']);
