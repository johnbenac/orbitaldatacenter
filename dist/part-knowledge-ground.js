// Generated losslessly from src/parts-knowledge/part-knowledge-ground.js.
// Edit the authored module, then run npm run package:parts-knowledge.
import {knowledgeText as __kt} from "./part-knowledge-text.js";
// Original learning articles for ground equipment and launch-site services.
// Supplier examples describe the cited offering, never a procurement selection.
const reviewed='2026-11-07';
const source=(title,organization,url,kind,description,section='')=>({title,organization,url,kind,description,section,reviewed});
export const groundKnowledgeSources={
 'ground-gse':source('NASA-STD-5005 — Design and Fabrication of Ground Support Equipment','NASA','https://standards.nasa.gov/standard/nasa/nasa-std-5005','Design standard',__kt[638]),
 'ground-gevs':source('GSFC-STD-7000 — General Environmental Verification Standard','NASA Goddard','https://standards.nasa.gov/standard/gsfc/gsfc-std-7000','Verification standard',__kt[639]),
 'ground-ditl':source('Integration and Test: Day-in-the-Life Testing','NASA Small Spacecraft Systems Virtual Institute','https://s3vi.ndc.nasa.gov/ssri-kb/topics/36/','Learning guide','An introduction to integrated mission rehearsals, with links to lessons learned and additional test literature.'),
 'ground-terma-checkout':source('Satellite Testing and Simulation','Terma','https://www.terma.com/products/space/test-and-simulation/','Supplier overview',__kt[640]),
 'ground-terma-payload':source('Payload EGSE','Terma','https://www.terma.com/products/space/payload-egse/','Supplier overview','A real example of automated payload test equipment and configurable instrument interfaces.'),
 'ground-mlperf':source('MLPerf Inference: Datacenter','MLCommons','https://mlcommons.org/benchmarks/inference-datacenter/','Benchmark specification','Defines repeatable inference workloads and distinguishes throughput from latency and output-quality conditions.'),
 'ground-mlperf-docs':source('MLPerf Inference Documentation','MLCommons','https://docs.mlcommons.org/inference/','Technical documentation','Read the workload, scenario and measurement rules before interpreting a headline accelerator result.'),
 'ground-cfdp':source('CCSDS File Delivery Protocol, 727.0-B-5','CCSDS','https://ccsds.org/Pubs/727x0b5e1.pdf','Protocol standard','A complete specification for spacecraft file-transfer services, including acknowledged and unacknowledged operation.'),
 'ground-yamcs':source('CFDP Service — Yamcs Server Manual','Yamcs','https://docs.yamcs.org/yamcs-server-manual/services/instance/cfdp/','Implementation documentation','Shows how one ground-system implementation exposes file-transfer operations and documents supported protocol features.'),
 'ground-sas':source('How to Simulate the Behavior of Solar Arrays in Space','Keysight','https://www.keysight.com/us/en/use-cases/simulate-the-behavior-of-solar-arrays-in-space.html','Application guide','Explains why a solar-array simulator must reproduce a current–voltage curve and its changes during an orbit.'),
 'ground-battery-test':source('How to Test Satellite Batteries','Keysight','https://www.keysight.com/us/en/use-cases/test-satellite-batteries.html','Application guide','A ground-test perspective on power sources, electronic loads, battery emulation and mission profiles.'),
 'ground-chiller':source('Kodiak Recirculating Chiller Technical Manual','Boyd','https://info.boydcorp.com/hubfs/Thermal/Liquid-Cooling/Boyd-Recirculating-Chiller-Technical-Manual-820-0109.pdf','Equipment manual',__kt[641]),
 'ground-pump':source('Liquid Cooling System Pump Overview','Eaton Boyd Thermal',__kt[642],'Engineering guide','Compares centrifugal and positive-displacement pumps and explains why system pressure loss affects delivered flow.'),
 'ground-phe':source('How Gasketed Plate Heat Exchangers Work','Alfa Laval','https://www.alfalaval.com/microsites/gasketed-plate-heat-exchangers/tools/how-gphes-work/','Illustrated technical guide','Includes animations of separated hot and cold flow paths, plate construction, and counterflow operation.'),
 'ground-star-stim':source('Star Trackers and Dynamic Optical Ground Support Equipment','Terma','https://www.terma.com/products/space/star-trackers?region=India','Supplier overview','Describes optical stimulators used with star trackers for repeatable open-loop and closed-loop tests.'),
 'ground-simulation':source('Simulation & Modeling','NASA Johnson','https://www.nasa.gov/reference/jsc-simulation-modeling/','Facility capabilities','Examples of simulation facilities that connect models, control software and flight-like hardware.'),
 'ground-gnss-sim':source('GSS9000 GNSS Constellation Simulator Datasheet','Spirent',__kt[643],'Historical supplier datasheet',__kt[644]),
 'ground-propellants':source('Propellant Handling and Servicing','NASA Kennedy','https://www.nasa.gov/kennedy/partnerships/propellanthandlingandservicing/','Facility capabilities','Describes the engineering, analysis, distribution and servicing support behind launch-site fluids.'),
 'ground-astrotech-prop':source('Propellant Services','Astrotech Space Operations','https://www.astrotech.com/propellant-services.html','Service-provider overview','A commercial example of spacecraft loading, simulation, pressure testing and decontamination services.'),
 'ground-astrotech':source('Payload Processing','Astrotech Space Operations','https://www.astrotech.com/payload-processing.html','Service-provider overview','Shows how cleanrooms, control rooms, transport and launch-pad connectivity fit into a payload-processing campaign.'),
 'ground-mass':source('Physical Properties Machines','ESA ESTEC','https://www.esa.int/Enabling_Support/Space_Engineering_Technology/Physical_Properties_Machines','Facility guide','Distinguishes weighing, center-of-gravity measurements, inertia measurements and dynamic balancing.'),
 'ground-raptor':source('Weight and CG of Large Objects and Spacecraft','Raptor Scientific / Space Electronics','https://raptor-scientific.com/products/weight-and-cg-of-large-objects-and-spacecraft/','Supplier engineering guide',__kt[645]),
 'ground-brunson':source('2024 Alignment Telescope — Metric','Brunson Instrument Company','https://www.brunson.us/2024-metric-alignment-telescope.html','Instrument datasheet',__kt[646]),
 'ground-brunson-learning':source('Alignment Telescopes','Brunson Instrument Company','https://www.brunson.us/blog/post/alignment-telescopes','Technical introduction','Explains optical reference lines, collimation, autocollimation and related tooling.'),
 'ground-mgse':source('System Mechanical Ground Support Equipment','Beyond Gravity','https://www.beyondgravity.com/en/satellites/ground-support-solutions/other-mgse','Supplier overview','Examples of spacecraft lifting devices, test adapters, integration stands and panel-handling equipment.'),
 'ground-trolley':source('Multi-Purpose Trolleys','Beyond Gravity','https://www.beyondgravity.com/en/satellites/ground-support-solutions/multi-purpose-trolleys','Supplier overview','Shows a configurable approach to supporting and reorienting spacecraft during assembly and integration.'),
 'ground-crane':source('Kennedy Space Center Cleanroom Crane Case Study','American Crane & Equipment Corporation','https://americancrane.com/resource-center/case-studies/kennedy-space-center-2/','Supplier case study','An example of a crane designed for spacecraft cleanroom work, including the Orion processing application.'),
 'ground-clean':source('Cleanroom Tech Key to Success in Space','NASA','https://www.nasa.gov/organizations/osi/setmo/cleanroom-tech-key-to-success-in-space/','Learning article',__kt[647]),
 'ground-pms':source('Contamination Monitors for Aerospace & Defense','Particle Measuring Systems','https://www.pmeasuring.com/industry/aerospace-and-defense/','Supplier overview',__kt[648]),
 'ground-rf-scoe':source('Radio Frequency Special Check-Out Equipment','Terma','https://www.terma.com/products/space/rf-scoe/','Supplier overview','Describes automated spacecraft RF measurements and links to TT&C and repeater-test brochures.'),
 'ground-rf-brochure':source('TT&C SCOE — Telemetry, Tracking & Control Specific Check-Out Equipment','Terma','https://www.terma.com/media/zctfrtmk/brochure-ttandc_scoe_tcr_tester_a4.pdf','Supplier brochure','Block diagrams identify the modem, converters, attenuators, measurement instruments and spacecraft test interfaces.'),
 'ground-eo1':source('Measurement of the Earth-Observer-1 Satellite X-Band Phased Array','NASA Goddard and collaborators','https://ntrs.nasa.gov/api/citations/20030093738/downloads/20030093738.pdf','Technical paper',__kt[649],'Section 3: Antenna Testing on EO-1 Spacecraft'),
 'ground-tbird':source('Pointing, Acquisition, and Tracking for the TBIRD CubeSat Mission: System Design and Pre-Flight Results','MIT Lincoln Laboratory / NASA','https://ntrs.nasa.gov/citations/20210026049','Technical paper',__kt[650]),
 'ground-ogse':source('Optical Ground Support Equipment','Safran Reosc','https://www.safran-group.com/products-services/ogse-optical-ground-support-equipment','Supplier overview',__kt[651]),
 'ground-jena':source('Optical Ground Support Equipment for Space Applications','Jena-Optronik','https://www.jena-optronik.de/products/services/optical-ground-support-equipment.html','Supplier overview',__kt[652]),
 'ground-ground-data':source('Small Spacecraft Technology: Ground Data Systems and Mission Operations','NASA','https://www.nasa.gov/smallsat-institute/sst-soa/ground-data-systems-and-mission-operations/','Technical survey',__kt[653]),
 'ground-falcon':source('Falcon Payload User’s Guide','SpaceX','https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf','Payload user guide',__kt[654],'Payload interfaces and launch-site operations'),
 'ground-ariane':source('Ariane 6 User’s Manual, Issue 2','Arianespace','https://www.arianespace.com/app/uploads/sites/4/2024/10/Mua-6_Issue-2_Revision-0_March-2021.pdf','Payload user guide',__kt[655],'Payload accommodation and launch operations'),
 'ground-vulcan':source('Vulcan Centaur User’s Guide','United Launch Alliance','https://www.ulalaunch.com/docs/default-source/default-document-library/2023_vulcan_user_guide.pdf?sfvrsn=37856b50_1','Payload user guide','Read the interface and processing chapters to compare a different launch provider’s integration arrangements.'),
 'ground-letf':source('Launch Equipment Test Facility Capabilities','NASA Kennedy','https://www.nasa.gov/kennedy/partnerships/launchequipmenttestfacilityletfcapabilities/','Facility capabilities','Explains the dedicated test infrastructure used to assess launch umbilicals, access arms and large ground mechanisms.'),
 'ground-umbilicals':source('Mobile Launcher Tower Umbilicals and Accessories','NASA Kennedy','https://www.nasa.gov/wp-content/uploads/2018/06/fs-2018-02-250-ksc-ml_umbilical_fact_sheet.pdf','Illustrated fact sheet',__kt[656]),
 'ground-pad':source('Launch Complex 39B','NASA Kennedy','https://www.nasa.gov/reference/launch-complex-39b/','Facility guide','An accessible example showing how a pad combines exhaust management, utilities, water, access and lightning protection.'),
 'ground-deflector':source('Launch Pad 39B Flame Trench Nears Completion','NASA Kennedy','https://www.nasa.gov/humans-in-space/launch-pad-39b-flame-trench-nears-completion/','Construction case study','Illustrates a real flame-deflector and trench project and the surrounding civil works.'),
 'ground-deluge':source('Water Deluge Test a Success at Launch Pad 39B','NASA Kennedy','https://www.nasa.gov/humans-in-space/water-deluge-test-a-success-at-launch-pad-39b/','Test case study','Explains why water-flow tests precede launch and what the ignition-overpressure and sound-suppression system protects.'),
 'ground-lightning':source('Lightning Towers Stand Tall at NASA Kennedy’s Launch Pad 39B','NASA Kennedy','https://www.nasa.gov/missions/artemis/lightning-towers-stand-tall-at-nasa-kennedys-launch-pad-39b/','Engineering case study','A real example of catenary conductors intercepting strikes and routing current toward ground.'),
 'ground-bonding':source(__kt[657],'NASA Kennedy','https://standards.nasa.gov/standard/KSC/KSC-STD-E-0022','Engineering standard','Reference for electrical interfaces between fixed facilities, portable ground equipment and sensitive test systems.'),
 'ground-fluid-faq':source('Rocket Propellants and Propellant Support — FAQ','NASA Kennedy','https://public.ksc.nasa.gov/propellants/faq/','Technical introduction','Introduces launch-site commodities, specifications and support arrangements without assuming a particular vehicle.'),
 'ground-gas-supply':source('NASA Awards Contracts for Acquisition of Liquid Nitrogen and Oxygen','NASA','https://www.nasa.gov/news-release/nasa-awards-contracts-for-acquisition-of-liquid-nitrogen-oxygen/','Procurement reference',__kt[658]),
 'ground-hydrogen-supply':source('NASA Awards Liquid Hydrogen Supply Contracts','NASA','https://www.nasa.gov/news-release/nasa-awards-liquid-hydrogen-supply-contracts/','Procurement reference','Identifies Air Products and Plug Power in a dated agency hydrogen-supply award, distinct from vehicle manufacture.'),
 'ground-helium-supply':source('NASA Selects Contractors to Supply Centers with Helium','NASA','https://www.nasa.gov/news-release/nasa-selects-contractors-to-supply-centers-with-helium/','Procurement reference','A documented helium-supply example for readers tracing the commodity supply chain.'),
 'ground-airliquide':source('Space: Cryogenic Fluids and Equipment','Air Liquide','https://usa.airliquide.com/markets/space','Supplier overview','Examples of spaceport fluid supply and cryogenic equipment, including work at the Guiana Space Center.')
};
const sid=id=>id.startsWith('ground-')?id:'ground-'+id;
const P=(text,...sources)=>({text,sources:sources.flat().map(sid)});
const supplier=(name,offering,note,...sources)=>({name,offering,note,sources:sources.flat().map(sid)});
const alternative=(name,description,tradeoff,...sources)=>({name,description,tradeoff,sources:sources.flat().map(sid)});
const term=(term,definition)=>({term,definition});
const S=(id,title,paragraphs)=>({id,title,paragraphs:Array.isArray(paragraphs)?paragraphs:[paragraphs]});
function article(key,summary,purpose,operation,engineering,extras={}){
 const sections=[S('purpose','Purpose and place in the system',purpose),S('operation','How it works',operation),S('engineering','Interfaces and design choices',engineering)];
 const value={key:'ground-'+key,summary,sections,suppliers:[],alternatives:[],inspection:[],terms:[],relatedIds:[],...extras};
 value.sourceIds=[...new Set([...(extras.sourceIds||[]).map(sid),...value.sections.flatMap(s=>s.paragraphs.flatMap(p=>p.sources||[])),...value.suppliers.flatMap(s=>s.sources||[]),...value.alternatives.flatMap(a=>a.sources||[])])];
 return value;
}
const topics={};
topics.facility=article('facility',
 __kt[659],
 P(__kt[660],'astrotech'),
 P(__kt[661]),
 P(__kt[662],'falcon','ariane'),
 {suppliers:[supplier('Astrotech Space Operations','Payload-processing facilities and campaign services','A real service-provider example; the selected study facility is identified separately in the configuration.','astrotech')],alternatives:[alternative('Provider-integrated processing','Keep payload operations close to the vehicle integration team.','Facility availability and access follow the provider’s campaign schedule.'),alternative('Independent processing facility','Complete customer operations in a dedicated facility before transfer.','Transport, interface handover and continuity of environmental control need their own plan.','astrotech')],inspection:[__kt[663]],terms:[term('AIT','Assembly, integration and test: the campaign that turns delivered equipment into a verified spacecraft.'),term('EGSE / MGSE','Electrical / mechanical ground support equipment.')],relatedIds:['ground:checkout','ground:bridge-crane','ground:environment','site:launch-position']});
topics.checkout=article('checkout',
 __kt[664],
 P(__kt[665],'ditl'),
 P(__kt[666]),
 P(__kt[667],'terma-checkout'),
 {suppliers:[supplier('Terma','CCS5 and Test Sequence Controller','Examples of central spacecraft checkout software; no commercial checkout package is installed by this browser model.','terma-checkout')],alternatives:[alternative('Scripted unit bench','Exercise a small component directly with simple equipment.','Fast to diagnose, but it omits interactions with the integrated spacecraft.'),alternative('Full mission rehearsal','Connect flight software, representative interfaces and operations procedures.','Requires more integration work and careful control of what is simulated.','ditl')],inspection:[__kt[668]],terms:[term('Inhibit','A condition that prevents a command from energizing or releasing hardware.'),term('Telemetry','Measurements and status reported by the spacecraft.')],relatedIds:['ground:avionics','ground:orbit','flight:08.01']});
topics.compute=article('compute',
 __kt[669],
 P(__kt[670],'mlperf','mlperf-docs'),
 P(__kt[671]),
 P(__kt[672]),
 {suppliers:[supplier('Terma','Payload electrical ground support equipment','An example of configurable payload interfaces and automated testing; the AI workload harness would be project-specific.','terma-payload'),supplier('MLCommons','MLPerf benchmark definitions','A measurement reference and software ecosystem, not the maker of the depicted rack.','mlperf')],alternatives:[alternative('Representative compute workload','Run the actual software stack with a controlled job set.','Best for service validation; results depend on the workload and software versions.'),alternative('Electrical or thermal load emulator','Replace computation with a known power or heat load.','Useful for utility testing, but it cannot demonstrate correct AI output.')],inspection:[__kt[673]],terms:[term('Throughput','Completed work per unit time.'),term('Latency','Elapsed time between a request and its required response.')],relatedIds:['flight:01.01','flight:01.02','ground:power','ground:thermal','ground:data']});
topics.data=article('data',
 __kt[674],
 P(__kt[675]),
 P(__kt[676],'cfdp','yamcs'),
 P(__kt[677]),
 {suppliers:[supplier('Yamcs','CFDP service in the Yamcs ground system','A documented implementation example; protocol support and interoperability must be checked for a chosen mission.','yamcs'),supplier('Terma','Payload EGSE and instrument interfaces','An example of hardware and automation for exercising payload data interfaces.','terma-payload')],alternatives:[alternative('Raw link bit test','Measure error behavior of a defined digital stream.','Helps characterize the link, but does not prove storage and application-level delivery.'),alternative('End-to-end file test','Validate a named artifact through storage, transfer and the receiving application.','Adds software and queue behavior to the experiment and needs traceable test data.','cfdp')],inspection:[__kt[678]],terms:[term('Checksum','A value computed from data to help detect unintended changes.'),term('Goodput','Useful application data delivered per unit time after overhead and retransmission.')],relatedIds:['flight:01.03','flight:01.04','ground:rf-ka','ground:rf-optical']});
topics.power=article('power',
 __kt[679],
 P(__kt[680]),
 P(__kt[681],'sas','battery-test'),
 P(__kt[682]),
 {suppliers:[supplier('Keysight','Solar-array simulators and battery-test power equipment','Commercial examples for ground testing, with their own voltage, current and dynamic limits.','sas','battery-test'),supplier('Terma','Spacecraft EGSE power-test systems','An example of power testing integrated with central checkout.','terma-checkout')],alternatives:[alternative('Regulated bench supply','Power electronics at a fixed bus operating point.','Simple, but it does not reproduce a photovoltaic source curve.'),alternative('Solar-array simulator plus battery interface','Exercise source tracking and battery handover with repeatable profiles.','More representative, with additional configuration and calibration work.','sas')],inspection:['Separate the cart’s supply and sense/control paths from the spacecraft battery and PCDU.'],terms:[term('SAS','Solar-array simulator: equipment that reproduces an array’s electrical behavior.'),term('Remote sense','Measurement of voltage at the load to compensate for cable drop.')],relatedIds:['ground:power-converter','flight:02.01','flight:02.02','flight:02.03']});
topics.thermal=article('thermal',
 __kt[683],
 P(__kt[684]),
 P(__kt[685],'chiller','phe'),
 P(__kt[686],'gevs'),
 {suppliers:[supplier('Eaton Boyd Thermal','Recirculating chillers and liquid-cooling systems',__kt[687],'chiller','pump'),supplier('Alfa Laval','Plate heat exchangers','An example of equipment separating a clean process loop from another cooling circuit.','phe')],alternatives:[alternative('Facility-water heat exchanger','Reject heat to a building utility loop.','Requires an adequate facility supply and leaves a finite temperature difference across the exchanger.'),alternative('Self-contained refrigeration cart','Control process temperature independently of ordinary room air.','Adds electrical demand, compressor heat and maintenance.','chiller')],inspection:[__kt[688]],terms:[term('Process loop','The fluid circuit serving the hardware being tested.'),term('Heat sink','The receiving environment or system to which heat is ultimately rejected.')],relatedIds:['ground:cooling-pump','ground:cooling-reservoir','ground:heat-exchanger','flight:03.01','flight:03.02']});
topics.attitude=article('attitude',
 __kt[689],
 P(__kt[690]),
 P(__kt[691],'star-stim','simulation'),
 P(__kt[692]),
 {suppliers:[supplier('Terma','Dynamic Optical Ground Support Equipment','A documented star-tracker stimulus system; it is an example rather than the supplier of this schematic bench.','star-stim')],alternatives:[alternative('Electrical sensor emulation','Inject synthetic measurements after the sensor.','Efficient for control-software testing, but bypasses optics and sensor processing.'),alternative('Optical stimulation','Present a controlled sky to the actual optical head.','Includes more of the sensing chain and requires calibrated optical alignment.','star-stim')],inspection:['Identify the stimulus head and its shroud. The bench does not represent an unrestricted free-floating spacecraft.'],terms:[term('Attitude','The orientation of a body relative to a chosen reference frame.'),term('Hardware in the loop','A simulation that exchanges signals with real equipment.')],relatedIds:['flight:04.01','flight:04.02','flight:04.03','ground:alignment','ground:orbit']});
topics.propulsion=article('propulsion',
 __kt[693],
 P(__kt[694]),
 P(__kt[695],'propellants'),
 P(__kt[696]),
 {suppliers:[supplier('Astrotech Space Operations','Propulsion pressure testing and servicing support','A real provider of spacecraft propellant and checkout services. No cart model or capacity has been selected here.','astrotech-prop'),supplier('NASA Kennedy','Propellants and Life Support capabilities','Institutional engineering and servicing reference, not a catalog cart manufacturer.','propellants')],alternatives:[alternative('Portable service cart','Bring a dedicated test interface to the article.','Flexible, with portable connections that require configuration control.'),alternative('Fixed facility test manifold','Keep instrumentation and supply infrastructure installed in one cell.','Reduces repeated setup but ties the operation to that facility.')],inspection:['Trace the distinct flight fuel, oxidizer and pressurant interfaces; the cart is ground support and is not launched.'],terms:[term('Wetted material','Any material that contacts the service fluid.'),term('Leak test','A defined measurement of unintended fluid escape across a pressure boundary.')],relatedIds:['ground:propellant-loading','flight:06.02','flight:06.03','flight:06.04','flight:06.05'],sourceIds:['gse']});
topics.mass=article('mass',
 __kt[697],
 P(__kt[698]),
 P(__kt[699],'mass'),
 P(__kt[700],'raptor'),
 {suppliers:[supplier('Raptor Scientific / Space Electronics','Weight, center-of-gravity and inertia instruments','A manufacturer of actual mass-properties equipment; the modeled pedestal load cells do not inherit a product rating.','raptor'),supplier('ESA ESTEC','Physical-properties test facilities','An example of a specialist measurement service.','mass')],alternatives:[alternative('Multiple calibrated support cells','Measure reactions at known support points.','Can reveal in-plane center of gravity; fixture geometry and tare matter.'),alternative('Dedicated mass-properties machine','Measure several properties using controlled orientations or motion.','More specialized equipment and handling are required.','mass')],inspection:['Look at the number and location of support points, then compare the flight article with the fixture beneath it.'],terms:[term('Tare','The contribution of the empty fixture removed from a measurement.'),term('Moment of inertia','Resistance to angular acceleration about a specified axis.')],relatedIds:['ground:checkout-stand','ground:lifting-yoke','flight:07.01','flight:09.01']});
topics.alignment=article('alignment',
 __kt[701],
 P(__kt[702]),
 P(__kt[703],'brunson','brunson-learning'),
 P(__kt[704]),
 {suppliers:[supplier('Brunson Instrument Company','Alignment telescopes and optical tooling','A real instrument family for understanding the station’s function; the rendered telescope is schematic.','brunson'),supplier('Beyond Gravity','Alignment tooling within system MGSE','An example of project-specific fixtures supporting spacecraft surveys.','mgse')],alternatives:[alternative('Line-of-sight optical tooling','Check straightness, offsets and angular relationships.','Requires suitable reference targets and clear sight lines.'),alternative('Three-dimensional metrology','Survey a network of points across the integrated article.','Adds coordinate fitting and uncertainty management; not every surface is a useful datum.')],inspection:[__kt[705]],terms:[term('Datum','A defined reference feature or frame used for dimensions and alignment.'),term('Autocollimation','Using reflected collimated light to measure angular alignment.')],relatedIds:['ground:alignment-telescope','flight:07.01','flight:05.03','ground:adapter']});
topics.fit=article('fit',
 __kt[706],
 P(__kt[707],'falcon','ariane'),
 P(__kt[708]),
 P(__kt[709]),
 {suppliers:[supplier('Launch provider','Controlled payload envelope and interface definition',__kt[710],'falcon','ariane','vulcan'),supplier('Beyond Gravity','Custom test adapters and integration tooling','An example supplier of project-specific mechanical fixtures.','mgse')],alternatives:[alternative('Physical go/no-go gauge','Provide a tangible reference near a critical feature.','Easy to interpret locally, but may represent only part of the full envelope.'),alternative('Digital clearance survey','Compare measured or modeled geometry with the full allowed volume.','Depends on faithful configuration, registration and uncertainty.')],inspection:['Use side and end views to inspect taper, protrusions and the stowed deployment hardware.'],terms:[term('Dynamic envelope','The space reserved for an article including expected motion or deflection.'),term('Separation plane','The interface where the payload departs from its launch attachment.')],relatedIds:['launch:fairing','flight:09.01','flight:07.04','ground:adapter']});
topics.adapter=article('adapter',
 __kt[711],
 P(__kt[712]),
 P(__kt[713],'mgse'),
 P(__kt[714],'falcon','vulcan'),
 {suppliers:[supplier('Beyond Gravity','Spacecraft test and handling adapters','An example of custom ground adapters; the flight separation system is a different article.','mgse'),supplier('Launch provider','Flight interface and mission accommodation data','The selected provider and spacecraft team jointly resolve the actual interface.','falcon','vulcan')],alternatives:[alternative('Flight-hardware fit check','Mate the actual controlled interface articles.','Representative, but exposes valuable hardware to handling and schedule constraints.'),alternative('Qualified interface surrogate','Use a verified replica for access and alignment work.','Requires traceability to the current flight drawing and its tolerances.')],inspection:[__kt[715]],terms:[term('Interface control document','The agreed definition of how independently developed systems connect.'),term('Fit-check article','Hardware used to verify geometric compatibility.')],relatedIds:['ground:adapter-stand','flight:09.01','launch:vehicle']});
topics.environment=article('environment',
 __kt[716],
 P(__kt[717],'clean'),
 P(__kt[718],'pms'),
 P(__kt[719]),
 {suppliers:[supplier('Particle Measuring Systems','Portable and fixed contamination monitors',__kt[720],'pms')],alternatives:[alternative('Portable sampling','Move an instrument near the current work area.','Good for local investigation but provides incomplete coverage when moved elsewhere.'),alternative('Fixed monitoring plus witness samples','Track environmental trends and material reaching selected surfaces.','Needs a planned sensor network and a separate interpretation of airborne versus deposited contamination.')],inspection:[__kt[721]],terms:[term('Witness sample','A representative surface exposed alongside hardware to assess contamination.'),term('Molecular contamination','Thin films or residues that are not counted simply as airborne dust particles.')],relatedIds:['ground:facility','ground:gse-storage','flight:03.03','flight:05.03']});
topics.orbit=article('orbit',
 __kt[722],
 P(__kt[723]),
 P(__kt[724],'simulation','gnss-sim'),
 P(__kt[725]),
 {suppliers:[supplier('Spirent','GNSS constellation simulators','An example of RF navigation-signal simulation; the linked historical datasheet is not a current product selection.','gnss-sim'),supplier('Terma','Spacecraft simulators and processor emulation','Examples of operational and software-validation environments.','terma-checkout')],alternatives:[alternative('Software-only simulation','Run the controller and mission environment as software.','Fast and repeatable, with fidelity limited by the modeled hardware.'),alternative('Hardware-in-the-loop simulation','Connect representative electronics through real interfaces.','Exercises timing and interfaces but requires calibrated test hardware and synchronized execution.')],inspection:['The rack represents a source of simulated conditions; it does not move the spacecraft or recreate vacuum.'],terms:[term('Ephemeris','A time-indexed description of an object’s position and motion.'),term('Real-time simulation','A model that progresses at the same rate as the connected physical system.')],relatedIds:['ground:checkout','ground:attitude','flight:08.01','flight:04.03']});
topics.avionics=article('avionics',
 __kt[726],
 P(__kt[727]),
 P(__kt[728],'terma-checkout','ground-ground-data'),
 P(__kt[729]),
 {suppliers:[supplier('Terma','CCS5 central checkout and operations software','A real example of shared test and operations tooling.','terma-checkout'),supplier('Yamcs','Mission-control and file-transfer services','An example of documented ground software; the workbench does not install a mission-control system.','yamcs')],alternatives:[alternative('Direct engineering interface','Access the flight computer through a local debug or maintenance port.','Useful during development, but may bypass the operational command chain.'),alternative('Operational command route','Use the intended packet, modem and spacecraft interfaces.','More representative, requiring compatible ground and flight configurations.')],inspection:['Compare the ground console with the linked flight avionics enclosure; they have different roles and mass boundaries.'],terms:[term('Command database','The definition of command identifiers, parameters and encoding.'),term('Housekeeping telemetry','Status describing the spacecraft’s health and operating state.')],relatedIds:['flight:08.01','ground:checkout','ground:rf','ground:orbit']});

topics.rf=article('rf',
 __kt[730],
 P(__kt[731]),
 P(__kt[732],'rf-brochure'),
 P(__kt[733]),
 {suppliers:[supplier('Terma','RF SCOE and TT&C test systems',__kt[734],'rf-scoe')],alternatives:[alternative('Conducted RF test','Connect through a specified cable or test port.','Repeatable and useful for fault isolation, but excludes some antenna behavior.'),alternative('Radiated or coupled test','Exchange signals through installed antenna hardware.','Includes more of the end-to-end path, while the test geometry requires careful interpretation.')],inspection:['Follow the station-to-antenna test path and distinguish the external rack from the flight transceiver.'],terms:[term('TT&C','Telemetry, tracking and command: the communications needed to monitor and control a spacecraft.'),term('Attenuation','A controlled reduction of signal power.')],relatedIds:['ground:rf-test-hat','ground:avionics','flight:05.01']});
topics['rf-ka']=article('rf-ka',
 __kt[735],
 P(__kt[736]),
 P(__kt[737],'rf-scoe'),
 P(__kt[738]),
 {suppliers:[supplier('Terma','Automated spacecraft RF test equipment',__kt[739],'rf-scoe','rf-brochure')],alternatives:[alternative('Known-pattern bit-error test','Compare recovered bits against a deterministic reference.','Provides a focused physical-link measurement but may omit file handling and application behavior.'),alternative('End-to-end file delivery test','Transfer representative payload products and verify their integrity.','Exercises more of the mission chain, but diagnosis requires measurements at intermediate layers.','cfdp')],inspection:[__kt[740]],terms:[term('Bit-error ratio','The number of incorrect recovered bits divided by the number examined.'),term('Goodput','Useful application data delivered per unit time, excluding protocol overhead and retransmissions.')],relatedIds:['ground:ka-test-port','ground:data','flight:05.02']});
topics['rf-optical']=article('rf-optical',
 __kt[741],
 P(__kt[742]),
 P(__kt[743],'tbird','ogse','jena'),
 P(__kt[744]),
 {suppliers:[supplier('Safran Reosc','Optical ground support equipment','Examples of precision optical test and calibration systems.','ogse'),supplier('Jena-Optronik','Optical ground support equipment and metrology','An example of reference optics and alignment services; not a selected vendor for this workbench.','jena')],alternatives:[alternative('Internal optical loopback','Exercise the terminal’s electronics and portions of its optical path locally.','Efficient for functional checks but may bypass external pointing and beam quality.'),alternative('External reference bench','Measure the terminal against independent optics and detectors.','Adds alignment and environmental requirements but includes more of the assembled optical interface.')],inspection:[__kt[745]],terms:[term('Boresight','The defined pointing axis of an optical or radio instrument.'),term('Collimator','Optics that produce or receive a nearly parallel bundle of rays.')],relatedIds:['ground:optical-test-head','ground:alignment','flight:05.03']});
topics['propellant-loading']=article('propellant-loading',
 __kt[746],
 P(__kt[747],'propellants'),
 P(__kt[748],'astrotech-prop'),
 P(__kt[749]),
 {suppliers:[supplier('Astrotech Space Operations','Spacecraft propellant services','A real processing-service example; capability for a particular spacecraft must be established with the provider.','astrotech-prop'),supplier('NASA Kennedy','Propellant handling and servicing capabilities','An institutional reference for the supporting engineering disciplines.','propellants')],alternatives:[alternative('Dedicated processing cell','Conduct servicing in an established facility adapted for the selected mission.','Can separate activities and centralize infrastructure, with additional transfer and scheduling interfaces.'),alternative('Mission-specific servicing equipment','Bring compatible equipment into an approved processing arrangement.','Offers flexibility but does not remove facility, configuration or interface requirements.')],inspection:[__kt[750]],terms:[term('Wetted materials','Materials that contact the working fluid.'),term('Loaded configuration','The documented hardware and fluid state after servicing.')],relatedIds:['ground:propulsion','ground:facility','flight:06.03','flight:06.04','flight:06.06','flight:06.07']});

topics['checkout-stand']=article('checkout-stand',
 __kt[751],
 P(__kt[752]),
 P(__kt[753],'mgse','trolley'),
 P(__kt[754],'gse'),
 {suppliers:[supplier('Beyond Gravity','Spacecraft integration stands and handling trolleys','Examples of custom mechanical ground support equipment; the rendered stand has no assigned manufacturer.','mgse','trolley')],alternatives:[alternative('Fixed support stand','Hold one controlled spacecraft orientation.','Mechanically simple but may require additional equipment to access other faces.'),alternative('Tilting or rotating fixture','Present different faces to personnel and instruments.','Improves access while adding motion, restraint and configuration-management requirements.')],inspection:[__kt[755]],terms:[term('Hard point','A structural feature intended to accept a defined load or attachment.'),term('Support footprint','The area bounded by the stand’s floor contact points.')],relatedIds:['ground:facility','ground:checkout','ground:adapter-stand','flight:07.01','flight:09.01']});
topics['adapter-stand']=article('adapter-stand',
 __kt[756],
 P(__kt[757]),
 P(__kt[758],'mgse'),
 P(__kt[759]),
 {suppliers:[supplier('Beyond Gravity','Test adapters and integration stands','A supplier example for dedicated interface tooling. No flight separation-system selection follows from this example.','mgse'),supplier('Launch provider','Payload interface definition',__kt[760],'falcon','ariane','vulcan')],alternatives:[alternative('Dedicated adapter fixture','Optimize support and access for one interface family.','Requires a controlled configuration for each adapter variant.'),alternative('Configurable interface stand','Use interchangeable adapters on a common base.','Reduces duplicate equipment while adding changeover and configuration checks.')],inspection:[__kt[761]],terms:[term('Mating surface','A controlled surface that contacts or aligns with another assembly.'),term('Ground adapter','A fixture interface that connects flight hardware to non-flight support equipment.')],relatedIds:['ground:adapter','ground:checkout-stand','flight:09.01']});
topics['bridge-crane']=article('bridge-crane',
 __kt[762],
 P(__kt[763]),
 P(__kt[764],'crane'),
 P(__kt[765],'gse'),
 {suppliers:[supplier('American Crane & Equipment Corporation','Cleanroom overhead crane systems',__kt[766],'crane')],alternatives:[alternative('Building-mounted bridge crane','Cover a substantial integration work area from overhead.','Requires compatible building structure and an unobstructed travel envelope.'),alternative('Dedicated gantry or lifting fixture','Place the lifting function around one operation.','Can localize infrastructure but may constrain access and usable floor space.')],inspection:[__kt[767]],terms:[term('Runway','The supporting track along which a bridge crane travels.'),term('Below-hook tooling','The specialized lifting equipment between the crane hook and the lifted article.')],relatedIds:['ground:crane-hoist','ground:lifting-yoke','ground:lifting-frame','ground:receiving-cradle','ground:checkout-stand']});
topics['crane-hoist']=article('crane-hoist',
 __kt[768],
 P(__kt[769]),
 P(__kt[770],'crane'),
 P(__kt[771],'gse'),
 {suppliers:[supplier('American Crane & Equipment Corporation','Spacecraft-processing crane and hoist systems','A real application example; no hoist mechanism, brake architecture or rated capacity is assigned to this rendering.','crane')],alternatives:[alternative('Single central hoist with a spreader','Introduce one suspended load path and distribute it below the hook.','Simple at the crane interface but requires suitable below-hook tooling.'),alternative('Purpose-built synchronized lifting system','Control multiple support points as one handling operation.','Can address specialized geometry while introducing synchronization and load-sharing requirements.')],inspection:['Look at hook height and the space occupied by the yoke before judging whether the spacecraft can clear its stand.'],terms:[term('Headroom','The vertical space consumed by lifting equipment above the article.'),term('Reeving','The arrangement of rope through sheaves that establishes a hoist’s mechanical advantage and travel.')],relatedIds:['ground:bridge-crane','ground:lifting-yoke','ground:lifting-frame']});
topics['lifting-yoke']=article('lifting-yoke',
 __kt[772],
 P(__kt[773]),
 P(__kt[774],'mgse'),
 P(__kt[775],'gse'),
 {suppliers:[supplier('Beyond Gravity','Spacecraft lifting devices','An example of the supplier category. The modeled yoke is explanatory geometry with no assigned certified rating.','mgse')],alternatives:[alternative('Rigid lifting beam or yoke','Maintain defined spacing between pickup points.','Adds tooling mass and headroom but can protect the article from unwanted lateral loads.'),alternative('Engineered sling arrangement','Use flexible members between a hook and designated lifting points.','Compact to store, with load distribution and clearance sensitive to geometry and suspended attitude.')],inspection:[__kt[776]],terms:[term('Pickup point','A designated attachment through which an article may be lifted.'),term('Load sharing','How total force divides among several supports or attachments.')],relatedIds:['ground:bridge-crane','ground:crane-hoist','ground:lifting-frame','flight:07.01']});
topics['lifting-frame']=article('lifting-frame',
 __kt[777],
 P(__kt[778]),
 P(__kt[779],'mgse'),
 P(__kt[780],'gse'),
 {suppliers:[supplier('Beyond Gravity','Custom spacecraft lifting and handling tooling','A real supplier example for this equipment class; the workbench frame is not a vendor drawing.','mgse')],alternatives:[alternative('Dedicated lifting frame','Design the tooling around one spacecraft geometry and pickup arrangement.','Offers tailored clearance with limited reuse across different configurations.'),alternative('Modular lifting tooling','Use controlled interchangeable interfaces on a common structure.','Can support a product family, with added attention to configuration and incorrect assembly prevention.')],inspection:[__kt[781]],terms:[term('Handling interface','The mechanical connection and constraints used to support or move an article on the ground.'),term('Tooling envelope','The space occupied by a tool throughout installation, use and removal.')],relatedIds:['ground:lifting-yoke','ground:checkout-stand','ground:cargo-load-bridge','flight:07.01']});
topics['receiving-cradle']=article('receiving-cradle',
 __kt[782],
 P(__kt[783]),
 P(__kt[784],'trolley'),
 P(__kt[785],'clean'),
 {suppliers:[supplier('Beyond Gravity','Custom handling and support equipment','An example of the broader MGSE equipment class, not an identified supplier of this launcher-side support.','trolley','mgse')],alternatives:[alternative('Dedicated receiving cradle','Provide a stable configuration optimized for receipt and inspection.','Adds a transfer before the article reaches its next support.'),alternative('Combined transport and integration support','Keep the article on one compatible fixture through several activities.','Reduces transfers but requires one structure to satisfy several access and restraint needs.')],inspection:[__kt[786]],terms:[term('Cradle','A support that locates an article through shaped or arranged contact points.'),term('Staging','Holding an article in a controlled configuration between operations.')],relatedIds:['ground:facility','launch:upper','launch:vehicle','ground:transfer-support','ground:environment']});
topics['gse-storage']=article('gse-storage',
 __kt[787],
 P(__kt[788]),
 P(__kt[789],'gse','clean'),
 P(__kt[790]),
 {suppliers:[supplier('Payload-processing provider','Controlled tooling and support areas',__kt[791],'astrotech')],alternatives:[alternative('Dedicated project storage','Keep one spacecraft’s tools and interfaces together.','Easy to identify, with greater space demand and potentially duplicated equipment.'),alternative('Shared equipment pool','Reuse controlled ground equipment across projects.','Can improve utilization, while increasing scheduling and configuration-management responsibilities.')],inspection:[__kt[792]],terms:[term('Configuration identification','Knowing which controlled version and arrangement of an item is present.'),term('Calibration status','The documented relationship between a measurement instrument and its reference checks.')],relatedIds:['ground:facility','ground:environment','ground:alignment','ground:lifting-frame']});
topics['fairing-carrier']=article('fairing-carrier',
 __kt[793],
 P(__kt[794]),
 P(__kt[795],'mgse'),
 P(__kt[796],'falcon','ariane'),
 {suppliers:[supplier('Launch provider and its MGSE suppliers','Fairing-specific handling fixtures',__kt[797],'mgse')],alternatives:[alternative('Dedicated half-shell carrier','Support and present an individual fairing section.','Requires fixture geometry matched to that shell and mating sequence.'),alternative('Integrated enclosure handling','Move or assemble a larger enclosure unit as part of provider processing.','Changes access, lifting and facility needs; not interchangeable with a half-shell procedure.')],inspection:['Inspect support contacts and clearance around the fairing edges. The rendered carrier is not flight equipment.'],terms:[term('Fairing half','One shell section of a separable payload enclosure.'),term('Kinematic support','A support arrangement intended to locate an article without redundant geometric constraint.')],relatedIds:['launch:fairing','ground:fit','ground:transfer-support','ground:facility']});
topics['transfer-support']=article('transfer-support',
 __kt[798],
 P(__kt[799]),
 P(__kt[800],'mgse','trolley'),
 P(__kt[801],'falcon','vulcan'),
 {suppliers:[supplier('Beyond Gravity','Handling adapters, integration stands and trolleys','Examples of the equipment family; the modeled transfer support has no assigned manufacturer or certified capacity.','mgse','trolley')],alternatives:[alternative('Dedicated intermediate fixture','Provide a stable handoff point between two operations.','Adds tooling and a transfer, but can simplify access and interface control.'),alternative('Common support through several operations','Retain one compatible adapter or carrier longer in the campaign.','Reduces handoffs while imposing more requirements on the shared support.')],inspection:[__kt[802]],terms:[term('Handoff','The transition of support or control from one system to another.'),term('Integration flow','The ordered arrangement of assembly, test and handling activities.')],relatedIds:['ground:checkout-stand','ground:lifting-frame','ground:fairing-carrier','flight:09.01','launch:vehicle']});
topics['cargo-load-bridge']=article('cargo-load-bridge',
 __kt[803],
 P(__kt[804]),
 P(__kt[805]),
 P(__kt[806],'gse','letf'),
 {suppliers:[supplier('No provider-confirmed supplier','Workbench cargo-access concept',__kt[807],'mgse')],alternatives:[alternative('Dedicated temporary loading bridge','Support an article across a defined gap during insertion.','Requires verified interfaces and a feasible withdrawal path after the payload is secured.'),alternative('Provider-defined integrated handling system','Use the launch provider’s eventual controlled cargo-handling architecture.','Its geometry and constraints must come from provider documentation; they are not resolved by this workbench.')],inspection:['Inspect the opening, payload sweep and bridge removal space. Treat the carriage and motion as conceptual geometry.'],terms:[term('Sweep envelope','The volume occupied by an article throughout its movement.'),term('Temporary support','Ground tooling removed before the vehicle enters its flight configuration.')],relatedIds:['launch:fairing','ground:lifting-frame','ground:transfer-support','flight:09.01']});

topics['cooling-pump']=article('cooling-pump',
 __kt[808],
 P(__kt[809]),
 P(__kt[810],'pump','chiller'),
 P(__kt[811]),
 {suppliers:[supplier('Eaton Boyd Thermal / Boyd','Liquid-cooling pumps and recirculating chillers',__kt[812],'pump','chiller')],alternatives:[alternative('Centrifugal pump','Serve a continuous-flow cooling circuit with a suitable operating point.','Flow changes with circuit resistance, so the system curve matters.'),alternative('Positive-displacement pump','Move a controlled volume through a circuit with an appropriate control arrangement.','Pressure behavior and protection need to match the connected hardware.')],inspection:[__kt[813]],terms:[term('System curve','The relationship between circuit flow and the pressure needed to drive it.'),term('Operating point','The flow and pressure at which a pump and its connected circuit settle.')],relatedIds:['ground:thermal','ground:cooling-reservoir','ground:heat-exchanger','flight:03.01']});
topics['cooling-reservoir']=article('cooling-reservoir',
 __kt[814],
 P(__kt[815]),
 P(__kt[816],'chiller'),
 P(__kt[817],'gse'),
 {suppliers:[supplier('Boyd','Recirculating process chillers',__kt[818],'chiller')],alternatives:[alternative('Reservoir-based recirculation','Provide accessible inventory within a packaged ground loop.','Adds volume and thermal mass while simplifying some service and inventory functions.'),alternative('Closed circuit with expansion accommodation','Use a sealed loop and a dedicated means of accepting volume change.','Can isolate the fluid from ambient air, with different pressure and gas-management requirements.')],inspection:[__kt[819]],terms:[term('Working inventory','The quantity of fluid participating in a particular circuit.'),term('Thermal expansion','The change in material volume as temperature changes.')],relatedIds:['ground:thermal','ground:cooling-pump','ground:heat-exchanger','flight:03.02']});
topics['heat-exchanger']=article('heat-exchanger',
 __kt[820],
 P(__kt[821]),
 P(__kt[822],'phe'),
 P(__kt[823],'chiller'),
 {suppliers:[supplier('Alfa Laval','Plate heat exchangers','A real supplier example with clear explanatory diagrams; no particular product or thermal capacity is selected.','phe'),supplier('Boyd','Packaged recirculating chillers','An example of integrating heat exchange with the rest of the ground cooling circuit.','chiller')],alternatives:[alternative('Liquid-to-liquid exchanger','Reject process heat into a compatible facility circuit.','Compact integration may be possible, but depends on facility temperature and capacity.'),alternative('Packaged refrigerated chiller','Use a refrigeration system to control the process coolant.','Offers a wider temperature range while adding compressor power, controls and another heat-rejection path.')],inspection:[__kt[824]],terms:[term('Approach temperature','The remaining temperature difference between a process stream and its thermal sink.'),term('Counterflow','An arrangement where the two heat-exchanger streams move in opposite overall directions.')],relatedIds:['ground:thermal','ground:cooling-pump','ground:cooling-reservoir','flight:03.01']});
topics['power-converter']=article('power-converter',
 __kt[825],
 P(__kt[826]),
 P(__kt[827],'battery-test','sas'),
 P(__kt[828]),
 {suppliers:[supplier('Keysight Technologies','Spacecraft power-source and battery-test equipment',__kt[829],'sas','battery-test')],alternatives:[alternative('Regulated ground DC supply','Provide a defined power bus for functional checkout.','Simple interpretation, but it may hide source dynamics experienced in flight.'),alternative('Programmable source emulator','Reproduce changing current–voltage characteristics or battery behavior.','More representative for selected tests, with greater model and control requirements.')],inspection:[__kt[830]],terms:[term('Remote sense','Measuring voltage near the load to account for cable voltage drop.'),term('Source emulation','Reproducing the electrical behavior of another source instead of merely supplying a fixed voltage.')],relatedIds:['ground:power','flight:02.03','flight:02.02','site:connection-payload-power']});
topics['alignment-telescope']=article('alignment-telescope',
 __kt[831],
 P(__kt[832]),
 P(__kt[833],'brunson','brunson-learning'),
 P(__kt[834]),
 {suppliers:[supplier('Brunson Instrument Company','Alignment telescopes and optical tooling',__kt[835],'brunson')],alternatives:[alternative('Alignment telescope','Inspect a defined line, offset or angular relationship.','Requires an appropriate target and line of sight.'),alternative('Three-dimensional survey system','Measure a set of points and fit their coordinate relationships.','Offers broader geometry while adding registration, target-placement and uncertainty considerations.')],inspection:[__kt[836]],terms:[term('Collimation','Establishing or checking an optical reference with parallel rays.'),term('Measurement uncertainty','The quantified range associated with confidence in a measurement result.')],relatedIds:['ground:alignment','ground:adapter','flight:05.03','flight:07.01']});
topics['rf-test-hat']=article('rf-test-hat',
 __kt[837],
 P(__kt[838]),
 P(__kt[839],'eo1'),
 P(__kt[840],'rf-scoe'),
 {suppliers:[supplier('Terma','RF checkout instrumentation','An example of the rack-side equipment. The antenna-specific hat itself has no assigned supplier.','rf-scoe'),supplier('NASA Goddard and EO-1 collaborators','Published hat-coupler test example','A technical precedent for the method, not evidence of a matching product or frequency band.','eo1')],alternatives:[alternative('Conducted test connection','Measure the radio through a cable at an approved port.','Simplifies calibration but bypasses some installed antenna hardware.'),alternative('Antenna-range measurement','Measure fields or patterns in a purpose-built arrangement.','Provides different and more complete antenna evidence, with greater space and calibration requirements.')],inspection:['The hat is temporary ground tooling. It should be distinguished from the flight antenna beneath it.'],terms:[term('Coupler','A device that transfers a controlled portion of electromagnetic energy between paths.'),term('Near field','The region near an antenna where field structure is strongly dependent on distance and geometry.')],relatedIds:['ground:rf','flight:05.01','ground:environment']});
topics['ka-test-port']=article('ka-test-port',
 __kt[841],
 P(__kt[842]),
 P(__kt[843],'rf-scoe','rf-brochure'),
 P(__kt[844]),
 {suppliers:[supplier('Terma','Ka-capable spacecraft RF checkout systems',__kt[845],'rf-scoe')],alternatives:[alternative('Conducted reference-plane test','Connect instruments at a specified electrical interface.','Supports repeatability and isolation while excluding downstream hardware.'),alternative('Installed-antenna test','Measure through a coupler or a calibrated radiated arrangement.','Includes more of the installed path, with additional geometry and calibration requirements.','eo1')],inspection:[__kt[846]],terms:[term('Reference plane','The defined location to which an RF measurement is calibrated or referred.'),term('Return loss','A measure related to how much signal reflects from an impedance discontinuity.')],relatedIds:['ground:rf-ka','ground:data','flight:05.02']});
topics['optical-test-head']=article('optical-test-head',
 __kt[847],
 P(__kt[848]),
 P(__kt[849],'ogse','jena'),
 P(__kt[850],'tbird'),
 {suppliers:[supplier('Safran Reosc','Optical test and calibration equipment','A real supplier of specialized optical ground equipment.','ogse'),supplier('Jena-Optronik','Reference optics and optical metrology','A second source of real equipment examples; neither is identified as the installed workbench head.','jena')],alternatives:[alternative('Collimated target or source','Present a controlled angular reference to the terminal.','Useful for pointing tests, with calibration of the reference optical axis.'),alternative('Receiver head with independent metrology','Collect the emitted beam and compare it with an external reference.','Can expose outgoing alignment errors, while detector and bench properties enter the uncertainty.')],inspection:[__kt[851]],terms:[term('Stray light','Light reaching a detector through unintended paths.'),term('Optical prescription','The detailed specification of optical surfaces, spacing and materials.')],relatedIds:['ground:rf-optical','ground:alignment','flight:05.03']});

const siteTopics={};
siteTopics['launch-position']=article('launch-position',
 __kt[852],
 P(__kt[853]),
 P(__kt[854],'pad'),
 P(__kt[855],'falcon','ariane','vulcan'),
 {suppliers:[supplier('Launch provider and site operator','Launch complex and mission integration services',__kt[856],'pad')],alternatives:[alternative('Fixed service infrastructure','Bring the vehicle to permanent pad structures and interfaces.','Concentrates infrastructure at the pad but ties vehicle access closely to that location.'),alternative('Mobile integration or launch platform','Move part of the support and service architecture with the vehicle.','Can shift work away from the pad while adding transport and mobile-to-fixed interfaces.')],inspection:[__kt[857]],terms:[term('Range','The broader operational area and supporting organization associated with launch activities.'),term('Ground-to-vehicle interface','The boundary where a facility service or support connects to the launch vehicle.')],relatedIds:['site:launch-table','site:exhaust-path','site:pad-support','site:commodity-services','ground:facility','launch:vehicle']});
siteTopics['launch-table']=article('launch-table',
 __kt[858],
 P(__kt[859]),
 P(__kt[860],'pad','deflector'),
 P(__kt[861]),
 {suppliers:[supplier('Launch provider and civil/mechanical contractors','Vehicle-specific bearing and launch structures',__kt[862],'pad','deflector')],alternatives:[alternative('Permanent launch table','Integrate the bearing structure directly with fixed pad works.','Simplifies some fixed interfaces while constraining integration and maintenance to the pad.'),alternative('Mobile launch structure','Carry the vehicle’s support interface on a moving platform.','Changes load paths, transport demands and connections to fixed site services.')],inspection:[__kt[863]],terms:[term('Bearing interface','The contact arrangement through which structural load is transferred.'),term('Foundation','The civil structure that transfers loads into the ground.')],relatedIds:['site:restraints','site:exhaust-path','site:launch-position','launch:core']});
siteTopics.restraints=article('restraints',
 __kt[864],
 P(__kt[865]),
 P(__kt[866],'letf'),
 P(__kt[867],'gse'),
 {suppliers:[supplier('Launch vehicle provider','Hold-down and release hardware','The provider’s controlled design governs the actual mechanism; no manufacturer or release rating is assigned here.'),supplier('NASA Kennedy Launch Equipment Test Facility','Ground mechanism and interface testing','An institutional example of the facilities used to verify such equipment classes.','letf')],alternatives:[alternative('Actively released restraint','Use a controlled mechanism to remove a structural constraint.','Requires defined actuation, state confirmation and clearance behavior.'),alternative('Other provider-defined support and release architecture','Implement the launch vehicle’s particular departure interface.','Must be evaluated from the actual vehicle design; different concepts are not interchangeable.')],inspection:[__kt[868]],terms:[term('Constraint','A restriction on an article’s permitted movement.'),term('Clear state','The condition in which a released interface no longer obstructs the intended motion.')],relatedIds:['site:launch-table','site:pad-support','launch:core']});
siteTopics['exhaust-path']=article('exhaust-path',
 __kt[869],
 P(__kt[870]),
 P(__kt[871],'deflector','deluge'),
 P(__kt[872]),
 {suppliers:[supplier('Launch-site civil and mechanical contractors','Exhaust civil works and associated infrastructure',__kt[873],'deflector')],alternatives:[alternative('Trench and deflector arrangement','Turn and route exhaust through dedicated civil works.','Requires geometry and materials appropriate to the selected launch environment.'),alternative('Other open or distributed exhaust arrangement','Accommodate the plume through a different provider-defined layout.','Changes nearby exposure and infrastructure requirements; it must be assessed as a complete site design.')],inspection:[__kt[874]],terms:[term('Plume impingement','Interaction of an engine exhaust flow with a surface.'),term('Ignition overpressure','A transient pressure environment associated with engine ignition and the nearby flow geometry.')],relatedIds:['site:launch-table','site:water-supply','site:pad-support','launch:core']});
siteTopics['pad-support']=article('pad-support',
 __kt[875],
 P(__kt[876]),
 P(__kt[877],'umbilicals','falcon'),
 P(__kt[878]),
 {suppliers:[supplier('Launch provider and ground-system contractors','Vehicle access and service support structures',__kt[879],'umbilicals','falcon')],alternatives:[alternative('Fixed service tower','Support access and umbilicals from a permanent structure.','Offers a stable facility interface while requiring clearance from the departing vehicle.'),alternative('Transporter-associated service structure','Combine transport or erection interfaces with some pad services.','Can consolidate equipment, with additional motion and transition interfaces.')],inspection:[__kt[880]],terms:[term('Transporter-erector','Ground equipment that moves a vehicle and changes it from transport to launch orientation.'),term('Service arm','A structure that brings a ground service or access route near the vehicle.')],relatedIds:['site:launch-position','site:utility-distribution','site:launch-table','launch:vehicle']});
siteTopics['water-supply']=article('water-supply',
 __kt[881],
 P(__kt[882]),
 P(__kt[883],'deluge'),
 P(__kt[884],'pad'),
 {suppliers:[supplier('Launch-site operator and fluid-system contractors','Pad water supply and distribution',__kt[885],'deluge')],alternatives:[alternative('Dedicated stored-water delivery','Provide a site system designed around a defined launch demand.','Requires storage, distribution and civil integration sized together.'),alternative('Other provider-defined cooling or acoustic architecture','Use the selected pad’s documented combination of geometry and fluids.','Effectiveness must follow that complete design; one site’s water arrangement is not a universal template.')],inspection:[__kt[886]],terms:[term('Manifold','A component that distributes a common fluid supply into several paths.'),term('Acoustic environment','The pressure fluctuations and sound levels experienced by nearby structures and hardware.')],relatedIds:['site:exhaust-path','site:launch-table','site:commodity-services','ground:thermal']});
siteTopics['lightning-protection']=article('lightning-protection',
 __kt[887],
 P(__kt[888]),
 P(__kt[889],'lightning'),
 P(__kt[890],'bonding'),
 {suppliers:[supplier('Launch-site operator and electrical engineering contractors','Site lightning protection and grounding networks',__kt[891],'lightning','bonding')],alternatives:[alternative('Catenary interception system','Use elevated conductors to define preferred strike paths around a protected area.','Requires a site-specific structural and grounding design.'),alternative('Other site-specific interception and grounding layout','Use the arrangement established for the actual launch complex.','Protection depends on the complete geometry and electrical network, not the appearance of one mast.')],inspection:[__kt[892]],terms:[term('Catenary conductor','A suspended conductor forming part of an overhead interception arrangement.'),term('Bonding','Intentional electrical connection between conductive structures to control their relative potential.')],relatedIds:['site:utility-distribution','site:connection-vehicle-bond','site:launch-position']});
siteTopics['commodity-services']=article('commodity-services',
 __kt[893],
 P(__kt[894]),
 P(__kt[895],'propellants','fluid-faq'),
 P(__kt[896],'gas-supply'),
 {suppliers:[supplier('Air Liquide','Space-sector industrial gases and cryogenic services','A real supplier example with documented space applications; not an installed supplier selection.','airliquide'),supplier('NASA Kennedy','Propellant and high-pressure-gas support','An institutional reference for commodity infrastructure and engineering.','propellants')],alternatives:[alternative('Dedicated bulk supply infrastructure','Provide medium-specific storage and distribution for the site.','Can support repeat campaigns while creating fixed capacity and interface commitments.'),alternative('Campaign-specific supply arrangements','Bring compatible supply capability to an approved service boundary.','Offers flexibility, with logistics and infrastructure interfaces that still require definition.')],inspection:[__kt[897]],terms:[term('Commodity','A supplied fluid or gas used by the vehicle or its ground infrastructure.'),term('Pressurant','A gas used to establish or maintain pressure in another system.')],relatedIds:['site:utility-distribution','site:commodity-lox','site:commodity-lng','site:commodity-lh2','site:commodity-rp1','site:commodity-n2','site:commodity-he']});
siteTopics['utility-distribution']=article('utility-distribution',
 __kt[898],
 P(__kt[899]),
 P(__kt[900],'umbilicals'),
 P(__kt[901],'bonding','propellants'),
 {suppliers:[supplier('Site operator and ground-system integrator','Integrated utility interfaces',__kt[902],'pad','gse')],alternatives:[alternative('Central distribution boundary','Coordinate services through a defined common interface area.','Can simplify integration visibility while concentrating routing and access demands.'),alternative('Distributed service interfaces','Place service boundaries near their particular consumers.','May shorten local routes while increasing the number of coordinated site interfaces.')],inspection:[__kt[903]],terms:[term('Service boundary','The agreed point at which responsibility or interface definition changes.'),term('Interface direction','The stated flow of energy, information or fluid between source and destination.')],relatedIds:['site:commodity-services','site:pad-support','site:connection-vehicle-power','site:connection-vehicle-data','site:connection-vehicle-bond']});

const commodityTopics={},umbilicalTopics={},connectionTopics={};
const factValue=(record,label)=>record.facts?.find(item=>item.label===label)?.value;
function cloneArticle(value){
 return {...value,sections:value.sections.map(section=>({...section,paragraphs:section.paragraphs.map(p=>({...p,sources:[...(p.sources||[])]}))})),suppliers:value.suppliers.map(item=>({...item,sources:[...(item.sources||[])]})),alternatives:value.alternatives.map(item=>({...item,sources:[...(item.sources||[])]})),inspection:[...value.inspection],terms:value.terms.map(item=>({...item})),relatedIds:[...value.relatedIds],sourceIds:[...value.sourceIds]};
}
export function groundKnowledge(record,catalog,hardware){
 if(!record||!['ground','site'].includes(record.category))return null;
 let template;
 if(record.category==='ground')template=topics[record.id.slice(7)];
 else{
  const localId=record.id.slice(5);
  if(localId.startsWith('commodity-')&&localId!=='commodity-services'){
   const medium=localId.slice(10),aliases={rp1:'kerosene',lng:'methane',lh2:'hydrogen',n2:'nitrogen',he:'helium'};
   template=commodityTopics[aliases[medium]||medium];
  }else if(localId.startsWith('connection-'))template=connectionTopics[factValue(record,'Medium')]||connectionTopics.unknown;
  else if(localId.startsWith('umbilical-')){
   const children=(catalog?.records||[]).filter(child=>child.parentId===record.id),media=children.map(child=>factValue(child,'Medium'));
   template=media.includes('conditioned-air')?umbilicalTopics.environmental:media.length&&media.every(m=>['power','data','grounding'].includes(m))?umbilicalTopics.electrical:umbilicalTopics.fluid;
  }else template=siteTopics[localId];
 }
 if(!template)return null;
 const value=cloneArticle(template);
 if(record.category==='ground'&&['ground:thermal','ground:cooling-pump','ground:cooling-reservoir','ground:heat-exchanger'].includes(record.id)){
  const passive=hardware?.energySystem?.thermal?.kind==='passive-local';
  value.sections.find(s=>s.id==='operation').paragraphs.push(P(passive?__kt[904]:__kt[905]));
 }
 if(record.id.startsWith('site:connection-')){
  value.relatedIds=[record.parentId,...value.relatedIds].filter(Boolean);
 }
 if(record.id.startsWith('site:umbilical-'))value.relatedIds=[...(catalog?.records||[]).filter(child=>child.parentId===record.id).map(child=>child.id),...value.relatedIds];
 value.relatedIds=[...new Set([...value.relatedIds,...(record.relatedIds||[])])].filter(id=>id!==record.id);
 if(record.render?.unavailable)value.inspection.push(__kt[906]);
 return value;
}

Object.assign(groundKnowledgeSources,{
 'ground-rp1-product':source('RP-1 Propellant, Rocket-Grade Kerosene','American Hydrocarbons / Haltermann Solutions','https://www.haltermannsolutions.com/products?id=124009/rp-1-propellant-rocket-grade-kerosene','Supplier product page',__kt[907]),
 'ground-rp1-development':source('Rocket Fuel Development','Haltermann Solutions','https://www.haltermannsolutions.com/tech-talk/rocket-fuel-development','Supplier technical article',__kt[908]),
 'ground-linde-space':source('Cryogenic Gases to Support Engine Testing and Launch','Linde','https://www.linde-gas.com/industries/space/engine-testing-and-launch','Supplier application overview','An industry overview of cryogenic propellants and the separate roles of cooling, purge and pressurization gases.'),
 'ground-methane-history':source('Rocket Laboratory — Final Years','NASA Glenn','https://www.nasa.gov/rocket-laboratory-final-years/','Technical history',__kt[909],'Methane for Thruster Systems')
});
commodityTopics.lox=article('commodity-lox',
 __kt[910],
 P(__kt[911]),
 P(__kt[912],'fluid-faq','linde-space'),
 P(__kt[913]),
 {suppliers:[supplier('Industrial gas suppliers','Launch-site oxygen supply',__kt[914],'gas-supply'),supplier('Linde','Cryogenic gases for space applications','A documented commercial supplier category, not an installed sourcing decision.','linde-space')],alternatives:[alternative('Bulk cryogenic oxygen supply','Serve the vehicle through dedicated oxygen-compatible infrastructure.','Requires an integrated storage and distribution architecture.'),alternative('Different propulsion chemistry','Select a vehicle designed around another oxidizer system.','Changes the engine, tanks and ground infrastructure; it is not a substitute fluid for a LOX system.')],inspection:['Distinguish the ground oxygen service from the vehicle oxidizer tank and from any nitrogen cooling service.'],terms:[term('Oxidizer','A substance that enables the chemical reaction with the fuel.'),term('Cryogenic liquid','A liquid maintained at a very low temperature relative to ordinary ambient conditions.')],relatedIds:['site:commodity-services','site:connection-core-oxidizer','site:connection-upper-oxidizer','launch:core','launch:upper']});
commodityTopics.methane=article('commodity-methane',
 __kt[915],
 P(__kt[916],'methane-history'),
 P(__kt[917]),
 P(__kt[918],'propellants'),
 {suppliers:[supplier('Vehicle-approved fuel supplier','Specified methane-rich or methane fuel supply',__kt[919],'linde-space')],alternatives:[alternative('Methane/oxygen vehicle architecture','Use tanks, engines and infrastructure designed for this propellant pair.','Requires cryogenic fuel services and compatibility with the specified fuel composition.'),alternative('Kerosene/oxygen or hydrogen/oxygen architecture','Choose a different complete propulsion system.','Changes tank volume, thermal requirements and engine design; fuels are not interchangeable at the service port.')],inspection:[__kt[920]],terms:[term('LNG',__kt[921]),term('Propellant pair','The selected fuel and oxidizer used together by an engine.')],relatedIds:['site:commodity-lox','site:commodity-services','site:connection-core-fuel','launch:core']});
commodityTopics.hydrogen=article('commodity-hydrogen',
 __kt[922],
 P(__kt[923],'methane-history'),
 P(__kt[924],'linde-space','hydrogen-supply'),
 P(__kt[925]),
 {suppliers:[supplier('Air Products and Plug Power','Liquid hydrogen supply',__kt[926],'hydrogen-supply'),supplier('Linde','Cryogenic propellant supply services','An additional commercial example of the supply category.','linde-space')],alternatives:[alternative('Hydrogen/oxygen propulsion architecture','Design the engine, stages and ground services around hydrogen fuel.','Offers a distinct propulsion trade while placing strong demands on cryogenic storage and tank volume.'),alternative('Methane or kerosene fuel architecture','Select a vehicle designed around a denser fuel.',__kt[927])],inspection:['Check which stage the hydrogen connection serves. Do not infer that all visible fuel lines carry the same medium.'],terms:[term('Boil-off','Conversion of stored liquid to vapor as heat enters the fluid.'),term('Fuel density','Fuel mass per unit volume, which affects required tank volume.')],relatedIds:['site:commodity-lox','site:connection-upper-fuel','site:commodity-services','launch:upper']});
commodityTopics.kerosene=article('commodity-kerosene',
 __kt[928],
 P(__kt[929],'rp1-development'),
 P(__kt[930],'fluid-faq'),
 P(__kt[931]),
 {suppliers:[supplier('American Hydrocarbons / Haltermann Solutions','RP-1 rocket-grade kerosene',__kt[932],'rp1-product')],alternatives:[alternative('Specified rocket-grade kerosene','Use fuel meeting the vehicle’s controlled requirement.','Combines dense liquid storage with composition and cleanliness constraints.'),alternative('Another approved propulsion architecture','Choose a launcher designed for methane, hydrogen or another fuel system.','Changes engines, tanks and ground services; it is not an interchangeable commodity choice at an existing interface.')],inspection:[__kt[933]],terms:[term('RP-1','A specification-controlled rocket-grade kerosene.'),term('Fuel traceability','The ability to connect a supplied batch with its identity, specification and supporting records.')],relatedIds:['site:commodity-lox','site:commodity-services','site:connection-core-fuel','launch:core']});
commodityTopics.nitrogen=article('commodity-nitrogen',
 __kt[934],
 P(__kt[935]),
 P(__kt[936],'linde-space','fluid-faq'),
 P(__kt[937]),
 {suppliers:[supplier('Industrial gas suppliers','Nitrogen supply for agency and space-sector applications',__kt[938],'gas-supply'),supplier('Linde','Space-sector support gases','A real application example covering non-propellant fluid functions.','linde-space')],alternatives:[alternative('Delivered liquid or gaseous nitrogen','Use a specified industrial supply arrangement matched to the consumer.','Requires appropriate storage, conversion and distribution for the needed state.'),alternative('Another controlled environmental service','Use conditioned air or another approved gas where the application permits it.',__kt[939])],inspection:[__kt[940]],terms:[term('Purge gas','A specified gas used to establish a controlled environment in a system or enclosure.'),term('Dew point','A measure related to the moisture content of a gas.')],relatedIds:['site:commodity-services','site:commodity-he','site:connection-payload-air','site:water-supply']});
commodityTopics.helium=article('commodity-helium',
 __kt[941],
 P(__kt[942]),
 P(__kt[943],'fluid-faq','linde-space'),
 P(__kt[944]),
 {suppliers:[supplier('Agency helium-supply contractors','Helium for NASA centers','The linked NASA award is a documented market example. It does not identify a supplier for the selected commercial site.','helium-supply'),supplier('Air Liquide','Space-sector gases and cryogenic services','An additional real industrial supplier example, without an installation claim.','airliquide')],alternatives:[alternative('Helium-based pressure or service system','Use helium where its properties match the approved design.','Requires a compatible supply and pressure-system architecture.'),alternative('Another designed pressurization architecture','Use a different approved gas or vehicle-specific method.','Changes thermal, compatibility and system behavior; gas substitution is an engineering redesign, not a catalog toggle.')],inspection:[__kt[945]],terms:[term('Inert gas','A gas with low chemical reactivity under the intended conditions.'),term('Pressurization system','The equipment and gas path used to establish a specified pressure in another volume.')],relatedIds:['site:commodity-services','site:commodity-n2','flight:06.05','flight:06.08']});

Object.assign(groundKnowledgeSources,{
 'ground-glenair-space':source('Space Interconnect Systems for Launch Vehicles, Satellites, and Payloads','Glenair','https://www.glenair.com/space-grade-connector-and-interconnect-cable-solutions/','Supplier technical catalog',__kt[946]),
 'ground-glenair-release':source('Lanyard-Release Quick-Disconnect Connectors','Glenair','https://www.glenair.com/lanyard-release/','Supplier catalog',__kt[947]),
 'ground-staubli':source('Advanced Quick Connection Solutions for Launch Site and Rocket','Stäubli','https://www.staubli.com/us/en/fluid-connectors/industries/aerospace-defense/launch-site-rocket.html','Supplier application overview',__kt[948]),
 'ground-osmu-test':source('Orion Service Module Umbilical Testing Wraps Up at Launch Equipment Test Facility','NASA Kennedy',__kt[949],'Test case study',__kt[950])
});
umbilicalTopics.fluid=article('umbilical-fluid',
 __kt[951],
 P(__kt[952]),
 P(__kt[953],'umbilicals','letf'),
 P(__kt[954]),
 {suppliers:[supplier('Stäubli','Launch-site fluid connection systems',__kt[955],'staubli'),supplier('NASA Kennedy Launch Equipment Test Facility','Umbilical and ground-mechanism testing','A documented institutional example of interface verification.','letf')],alternatives:[alternative('Separate service interfaces','Give each medium its own controlled interface and supporting route.','Can simplify individual compatibility boundaries while increasing the number of coordinated connections.'),alternative('Integrated service assembly','Organize several defined circuits within one support or disconnect structure.','Can consolidate geometry, with stronger coupling between mechanical alignment and individual circuit requirements.')],inspection:[__kt[956]],terms:[term('Umbilical','A temporary service connection between ground infrastructure and a vehicle.'),term('Disconnect envelope','The space occupied by an interface and its support while separating and moving clear.')],relatedIds:['site:utility-distribution','site:commodity-services','site:pad-support','launch:vehicle']});
umbilicalTopics.electrical=article('umbilical-electrical',
 __kt[957],
 P(__kt[958]),
 P(__kt[959],'glenair-space','glenair-release','umbilicals'),
 P(__kt[960]),
 {suppliers:[supplier('Glenair','Launch and space electrical interconnects',__kt[961],'glenair-space','glenair-release')],alternatives:[alternative('Separate power and data connectors','Keep circuit families on distinct physical interfaces.','Can simplify separation of electrical requirements while adding mating and release interfaces.'),alternative('Integrated electrical interface','Combine defined contact arrangements in one controlled assembly.','Can reduce interface count, with tighter coordination of pinout, shielding and release behavior.')],inspection:[__kt[962]],terms:[term('Pinout','The assignment of electrical functions to connector contacts.'),term('Blind mate','An interface designed to engage through controlled alignment without direct visual access to the contacts.')],relatedIds:['site:utility-distribution','site:connection-payload-power','site:connection-payload-data','site:connection-vehicle-power','site:connection-vehicle-data']});
umbilicalTopics.environmental=article('umbilical-environmental',
 __kt[963],
 P(__kt[964]),
 P(__kt[965],'falcon','ariane','osmu-test'),
 P(__kt[966]),
 {suppliers:[supplier('Launch provider and payload-processing facility','Payload environmental-control service',__kt[967],'falcon','ariane'),supplier('NASA Kennedy','Environmental umbilical verification example','The linked Orion test demonstrates the method class, not a matching interface for every launcher.','osmu-test')],alternatives:[alternative('Enclosure-level conditioned air','Control the environment around the encapsulated spacecraft.','Depends on duct layout, enclosure mixing and the payload’s actual heat sources.'),alternative('Dedicated payload thermal-service interface','Use an explicitly designed direct thermal connection where the provider supports it.','Can target a particular heat path, with additional compatibility and disconnect requirements.')],inspection:['Trace the duct toward the enclosure rather than assuming it enters a flight coolant reservoir.'],terms:[term('Environmental control system','Equipment that maintains specified surrounding conditions such as temperature, humidity and cleanliness.'),term('Encapsulation','Enclosing the payload within its launch enclosure.')],relatedIds:['site:connection-payload-air','site:utility-distribution','launch:fairing','ground:environment','ground:thermal']});

connectionTopics.power=article('connection-power',
 __kt[968],
 P(__kt[969]),
 P(__kt[970],'falcon','vulcan','glenair-space'),
 P(__kt[971]),
 {suppliers:[supplier('Glenair','Space and launch power interconnects','A verified supplier example. The selected pad connector and rating remain unspecified.','glenair-space','glenair-release')],alternatives:[alternative('Dedicated external power interface','Provide a separate controlled ground power path.','Supports sustained checkout but adds a handover and disconnect boundary.'),alternative('Onboard power for a defined campaign interval','Use the vehicle’s approved internal power configuration.','Reduces dependence on an external path while consuming stored energy and changing thermal or recharge needs.')],inspection:['Use the source and destination fields to tell whether this circuit serves the launch vehicle or the spacecraft.'],terms:[term('Power return','The intended path completing a normal electrical power circuit.'),term('Power handover','The transition between external supply and another approved source.')],relatedIds:['site:utility-distribution','ground:power-converter','flight:02.03','flight:02.02']});
connectionTopics.data=article('connection-data',
 __kt[972],
 P(__kt[973]),
 P(__kt[974],'ground-ground-data','glenair-space'),
 P(__kt[975],'falcon'),
 {suppliers:[supplier('Glenair','Signal and high-speed data interconnects','An actual connector and cable supplier example, not an identification of the modeled interface.','glenair-space'),supplier('Terma','Spacecraft checkout and command software',__kt[976],'terma-checkout')],alternatives:[alternative('Wired service interface','Provide a controlled local command and telemetry route.','Can offer predictable access but requires a physical disconnect and compatible ground routing.'),alternative('Approved radio checkout route','Use the flight radio chain during a defined test or campaign interval.','Includes a different set of hardware and propagation effects, with its own operational interface constraints.')],inspection:['Follow the cable to its intended electronics rather than assuming every data connection reaches the compute payload.'],terms:[term('Signal integrity','Preservation of an electrical signal’s intended waveform and timing through its path.'),term('Protocol','The agreed rules and formats used by communicating systems.')],relatedIds:['site:utility-distribution','ground:avionics','ground:rf','flight:08.01']});
connectionTopics.grounding=article('connection-bond',
 __kt[977],
 P(__kt[978]),
 P(__kt[979],'bonding'),
 P(__kt[980],'lightning'),
 {suppliers:[supplier('Ground-system electrical integrator','Bonding hardware and coordinated grounding design',__kt[981],'bonding')],alternatives:[alternative('Dedicated bonding path','Provide an explicitly controlled conductive connection between structures.','Makes the intended relationship visible, with attachment and verification requirements.'),alternative('Designed bonding through structural interfaces','Use an approved structural path as part of the electrical network.','Requires demonstrated electrical continuity and control of coatings, joints and configuration changes.')],inspection:[__kt[982]],terms:[term('Grounding','The defined connection of an electrical system or structure to a reference, often including earth.'),term('Electromagnetic interference','Unwanted electromagnetic interaction that can disturb equipment behavior.')],relatedIds:['site:utility-distribution','site:lightning-protection','site:connection-vehicle-power','site:connection-vehicle-data']});
connectionTopics['conditioned-air']=article('connection-air',
 __kt[983],
 P(__kt[984]),
 P(__kt[985],'falcon','ariane','osmu-test'),
 P(__kt[986]),
 {suppliers:[supplier('Launch provider and payload-processing operator','Conditioned payload-air service',__kt[987],'falcon','ariane')],alternatives:[alternative('Enclosure air conditioning','Control the environment around the spacecraft.','Can serve a broad volume but depends on mixing, local heat loads and duct routing.'),alternative('Specific direct thermal service','Connect approved cooling equipment to a defined payload thermal interface.','Can address a targeted heat path but adds fluid or conductive-interface requirements distinct from air conditioning.')],inspection:[__kt[988]],terms:[term('Supply condition','The specified state of a service at a defined delivery interface.'),term('Environmental handover','The transition between different means of maintaining the payload’s surrounding conditions.')],relatedIds:['site:umbilical-payload-ecs','ground:environment','ground:thermal','launch:fairing']});
connectionTopics.lox=article('connection-lox',
 __kt[989],
 P(__kt[990]),
 P(__kt[991],'letf','propellants'),
 P(__kt[992]),
 {suppliers:[supplier('Stäubli','Launch-site fluid connection systems',__kt[993],'staubli'),supplier('NASA Kennedy Launch Equipment Test Facility','Umbilical interface verification','An institutional reference for testing complete mechanisms and service interfaces.','letf')],alternatives:[alternative('Dedicated oxygen disconnect','Provide a separately defined oxygen-compatible interface.','Keeps the medium boundary explicit while adding an individual alignment and release interface.'),alternative('Integrated service carrier with distinct circuits','Mount several separately engineered connections on one support.','Can consolidate motion, with tighter coordination of alignment, loads and individual fluid requirements.')],inspection:[__kt[994]],terms:[term('Fluid boundary','The defined interface separating two fluid-system responsibilities or volumes.'),term('Wetted interface','The connector surfaces and materials in direct contact with the fluid.')],relatedIds:['site:commodity-lox','site:commodity-services','site:utility-distribution']});
connectionTopics.methane=article('connection-methane',
 __kt[995],
 P(__kt[996]),
 P(__kt[997],'methane-history','propellants'),
 P(__kt[998]),
 {suppliers:[supplier('Stäubli','Custom fluid connections for launch-site applications',__kt[999],'staubli'),supplier('NASA Kennedy Launch Equipment Test Facility','Ground-to-vehicle interface tests','A reference for the complete mechanism-testing problem, not a certification of this model.','letf')],alternatives:[alternative('Dedicated fuel connection','Engineer an individual medium-specific route and disconnect.','Makes its boundary clear while requiring separate alignment and release coordination.'),alternative('Multicircuit service assembly','Carry the fuel connection alongside other independently defined circuits.','Can share structure, but fluid boundaries and compatibility remain separate.')],inspection:[__kt[1000]],terms:[term('Medium','The particular fluid, gas, electrical service or signal carried by a connection.'),term('Relative motion','Movement of the vehicle interface with respect to the supporting ground interface.')],relatedIds:['site:commodity-lng','site:commodity-lox','site:commodity-services','site:utility-distribution']});
connectionTopics.hydrogen=article('connection-hydrogen',
 __kt[1001],
 P(__kt[1002]),
 P(__kt[1003],'umbilicals','linde-space'),
 P(__kt[1004]),
 {suppliers:[supplier('Launch provider and specialized fluid-equipment suppliers','Hydrogen-compatible service interface',__kt[1005],'staubli'),supplier('NASA Kennedy','Cryogenic umbilical and interface verification examples','Published infrastructure and test capabilities provide primary references.','umbilicals','letf')],alternatives:[alternative('Dedicated hydrogen interface','Use a separately engineered service connection for the fuel path.','Makes thermal and compatibility requirements explicit at one local boundary.'),alternative('Integrated cryogenic service structure','Support separate fuel and oxidizer circuits within a coordinated mechanism.','Shares geometry and motion while retaining distinct fluid paths and requirements.')],inspection:[__kt[1006]],terms:[term('Thermal contraction','Dimensional change as a component cools.'),term('Cryogenic interface','A connection designed for a fluid system operating at very low temperatures.')],relatedIds:['site:commodity-lh2','site:commodity-lox','site:utility-distribution','launch:upper']});
connectionTopics.rp1=article('connection-rp1',
 __kt[1007],
 P(__kt[1008]),
 P(__kt[1009],'propellants','rp1-development'),
 P(__kt[1010]),
 {suppliers:[supplier('Stäubli','Launch-site fluid connection systems',__kt[1011],'staubli'),supplier('American Hydrocarbons / Haltermann Solutions','RP-1 fuel','A verified example of the supplied commodity, distinct from the manufacturer of the connector.','rp1-product')],alternatives:[alternative('Individual fuel disconnect','Provide a separately controlled fuel-service interface.','Simplifies identification of the fluid boundary while adding a dedicated mating and release point.'),alternative('Fuel interface on a shared service carrier','Combine structural support with other independently defined circuits.','Can reduce duplicated support hardware while coupling mechanical alignment and release behavior.')],inspection:[__kt[1012]],terms:[term('Sealing interface','The surfaces and elements that prevent unintended fluid passage at a connection.'),term('Interface owner','The organization responsible for defining and maintaining one side or the agreed boundary of a connection.')],relatedIds:['site:commodity-rp1','site:commodity-kerosene','site:commodity-lox','site:utility-distribution']});

function unresolvedFluid(kind){
 const fuel=kind==='fuel',name=fuel?'fuel':'oxidizer';
 return article('connection-unknown-'+kind,
  'This record reserves a '+name+__kt[1013],
  P(__kt[1014]+name+__kt[1015]),
  P(fuel?__kt[1016]:__kt[1017],'propellants'),
  P(__kt[1018],'gse','letf'),
  {suppliers:[supplier('Not yet established','Provider-defined '+name+' service interface',__kt[1019],'staubli')],alternatives:[alternative('Retain an explicit open interface','Show the service function while leaving unresolved details unassigned.','Preserves architectural visibility without implying procurement or compatibility.'),alternative('Resolve against provider documentation','Replace the open definition with a controlled medium and interface.','Requires actual mission evidence and may change geometry, materials and ground infrastructure.')],inspection:['Read the interface-status field before interpreting the line. Its color and route do not establish the fluid identity.'],terms:[term('Open interface','A required connection whose complete technical definition has not yet been agreed or evidenced.'),term('Architecture allocation','Assignment of a system function before every implementing detail is resolved.')],relatedIds:['site:commodity-services','site:utility-distribution','launch:vehicle']});
}
connectionTopics['unknown-fuel']=unresolvedFluid('fuel');
connectionTopics['unknown-oxidizer']=unresolvedFluid('oxidizer');
connectionTopics.unknown=article('connection-unresolved',
 __kt[1020],
 P(__kt[1021]),
 P(__kt[1022],'umbilicals'),
 P(__kt[1023],'gse','letf'),
 {suppliers:[supplier('Not yet established','Service interface equipment',__kt[1024])],alternatives:[alternative('Keep an explicit unresolved connection','Preserve the required relationship and identify the missing interface evidence.','Supports architecture discussion while limiting detailed analysis.'),alternative('Adopt a verified provider interface','Use a controlled definition for the selected mission.','Enables hardware selection and verification but can alter neighboring systems and routing.')],inspection:[__kt[1025]],terms:[term('Interface requirement','A controlled statement of what two connected systems must provide or tolerate.'),term('Verification boundary','The portion of a system included in a particular test or analysis.')],relatedIds:['site:utility-distribution','site:launch-position']});
