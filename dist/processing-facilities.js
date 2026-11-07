// PDR campaign routes, not reservations or as-built facility models. A published
// service does not establish compatibility with this spacecraft or its propellants.
import {launchSiteFor} from './launch-sites.js';

const source=(id,title,url,section)=>({id,title,url,section});
export const PROCESSING_SOURCES={
 falcon:source('falcon','SpaceX · Falcon User’s Guide (May 2025)','https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf','§§10.1–10.4; Table 10-1, pp. 75–80'),
 falconWest:source('falcon-west','U.S. Space Force · SLC-6 redevelopment decision','https://www.vandenberg.spaceforce.mil/News/Article-Display/Article/4323318/notice-of-availability-of-the-final-environmental-impact-statement-and-record-o/','SLC-6 redevelopment and integration hangar'),
 astrotech:source('astrotech','Astrotech · Florida and California facilities','https://www.astrotech.com/locations.html','Locations; cleanrooms, customer control rooms and utilities'),
 astrotechServices:source('astrotech-services','Astrotech · Propellant Services','https://www.astrotech.com/propellant-services.html','End-to-End Service; stand-alone loading equipment'),
 astrotechHistory:source('astrotech-history','Astrotech · Mission History','https://www.astrotech.com/our-history.html','GOES-U / Falcon Heavy (2024); ESCAPADE / New Glenn (2025)'),
 vulcan:source('vulcan','ULA · Vulcan Launch Systems User’s Guide (October 2023)','https://www.ulalaunch.com/docs/default-source/rockets/2023_vulcan_user_guide.pdf','§§5.1.1–5.1.3, 5.2.1–5.2.3 and 5.3'),
 terran:source('terran','Relativity · July 2026 Company Update','https://www.relativityspace.com/press-release/2026/8/11/july-2026-company-update','Launch: LC-16 HIF, bridge crane and cleanroom outfitting'),
 terranSite:source('terran-site','Relativity · Locations','https://www.relativityspace.com/locations','Cape Canaveral / Launch Complex 16; future PPF expansion'),
 glenn:source('glenn-cif','Blue Origin · Customer integration facility construction (October 2026)','https://www.blueorigin.com/news/building-infrastructure-for-more-frequent-launches-in-florida','Preparing missions in parallel'),
 glennPads:source('glenn-pads','Blue Origin · Returning Launch Complex 36 to Two Pads (August 2026)','https://www.blueorigin.com/news/returning-launch-complex-36-to-two-pads','LC-36A / 7×2 and LC-36B / 9×4 assignments'),
 glennFlow:source('glenn-flow','Blue Origin · New Glenn Return to Flight (June 2026)','https://www.blueorigin.com/news/new-glenn-return-to-flight','Horizontal / vertical hybrid operations plan'),
 ariane:source('ariane','Arianespace · Ariane 6 User’s Manual, Issue 2 / Rev. 0 (2021)','https://www.arianespace.com/app/uploads/sites/4/2024/10/Mua-6_Issue-2_Revision-0_March-2021.pdf','§§6.2.2–6.2.3; §7.5 launch campaign'),
 epcu:source('epcu','CNES · Satellite preparation at the Guiana Space Centre','https://centrespatialguyanais.cnes.fr/en/epcu','Tailored treatment at the EPCUs; S5C and S5A/S5B'),
 csg:source('csg','CNES · Ariane 6 launch preparation','https://centrespatialguyanais.cnes.fr/en/ariane-6','Preparing for a launch; upper composite and mobile gantry'),
 starbase:source('starbase','FAA · Boca Chica Starship project','https://www.faa.gov/space/stakeholder_engagement/spacex_starship','Project and environmental documents; site context only'),
 starKsc:source('star-ksc','FAA · Starship at Kennedy LC-39A','https://www.faa.gov/space/stakeholder_engagement/spacex_starship_ksc','Proposed Action; EIS and Record of Decision'),
 starCape:source('star-cape','FAA · Starship at Cape Canaveral SLC-37','https://www.faa.gov/space/stakeholder_engagement/spacex_starship_ccsfs','Proposed Starship operations; site context only'),
 starLouisiana:source('star-louisiana','Louisiana Economic Development · Proposed Pecan Island campus','https://www.opportunitylouisiana.gov/news/spacex-launches-new-era-of-commercial-spaceflight-with-100-billion-louisiana-campus','August 2026 announcement; planned campus'),
 cz5:source('cz5','China Manned Space · Mengtian / CZ-5B transfer at Wenchang','https://en.cmse.gov.cn/news/202211/t20221117_51523.html','October 25, 2022 campaign report'),
 cz5Prep:source('cz5-preparation','China Manned Space · Mengtian preparation at Wenchang','https://en.cmse.gov.cn/news/202211/t20221106_51260.html','Spacecraft assembly and testing before launch'),
 cz9:source('cz9','State Council · CALT heavy-lift design study','https://english.www.gov.cn/news/topnews/202301/19/content_WS63c8b4ccc6d0a757729e5d88.html','January 2023 two-stage concept'),
 cz9Site:source('cz9-site','State Council Information Office · Wenchang future pad planning','https://english.scio.gov.cn/chinavoices/2020-11/26/content_76950300.htm','Future heavy-launch site planning'),
 wallops:source('wallops-range','NASA · Wallops Range User’s Handbook (2024)','https://www.nasa.gov/wp-content/uploads/2023/09/wallopsrangeusershandbook-2024.pdf','§§3.2.2–3.2.5, pp. 37–38: SFF, HIF, PPF and MPPF'),
 wallopsTesting:source('wallops-testing','NASA · Wallops Integration and Testing Customer Handbook (2022)','https://ntrs.nasa.gov/citations/20220017691','§2.1 EMI/EMC; §3 environmental testing; facility-specific limits')
};
const S=PROCESSING_SOURCES;
const role=(id,label,description)=>({id,label,description});
const gse=(id,label,description)=>({id,label,description});
const commonGSE=[
 gse('egse','Command and telemetry rack','Travels with the spacecraft; reconnect and verify the facility power, grounding and data interfaces.'),
 gse('charging','Ground power and battery charger','Controlled spacecraft supply and charger; mission-defined charge limits and telemetry remain with the hardware.'),
 gse('rf','Cabled RF checkout kit','Test hats, attenuation and ground receiver for a contained link check; radiated operation needs a separate release.'),
 gse('optical','Optical terminal test head','Enclosed alignment target, beam capture and test electronics for the optical terminal.'),
 gse('cooling','Ground cooling cart','A secondary ground loop removes heat through an isolating heat exchanger; flight ammonia stays in its separate spacecraft circuit.'),
 gse('fluid-servicing','Propellant service equipment','Separate compatible fuel and oxidizer equipment; facility services and an approved campaign remain necessary.'),
 gse('handling','Lifting fixture and transport cradle','Mission-specific interfaces travel with the hardware; local crane, door and route limits must be checked.'),
 gse('metrology','Inspection and measurement kit','Calibrated sensors, scales and witness records support receiving and post-transport checks.')
];
const approvals=[
 role('facility-fit','Facility and transport compatibility','Confirm stowed envelope, lift mass and center of gravity, crane reach, door clearance and the complete transfer route.'),
 role('services','Ground-service interfaces','Agree power quality and grounding, cooling, cleanliness, purge, data links and storage with the selected operator.'),
 role('hazardous-operations','Hazardous operations release','Approve the selected spacecraft propellants, battery configuration, contamination controls and separate work windows.'),
 role('emissions','RF and optical test release','Agree cabled versus radiated tests, RF permissions, shielding and optical beam containment.'),
 role('campaign','Campaign and verification readiness','Assign responsibilities and facility slots; carry approved verification evidence, handling procedures and open-item dispositions into campaign reviews.')
];
const capability=(id,label,status,basis,sourceIds=[])=>({id,label,status,basis,sourceIds});
function makeFacility(spec){
 const documented=spec.status==='documented',hazardous=spec.hazardousStatus??'unconfirmed';
 const sources=[...spec.sources,S.astrotechServices].filter((s,i,a)=>a.findIndex(x=>x.id===s.id)===i);
 const zones=[
  {id:'clean',label:spec.visual.processingLabel,description:'Receiving, inspection, controlled electrical checkout and spacecraft preparation.',tone:'teal'},
  {id:'hazardous',label:spec.visual.hazardousLabel,description:'Separate servicing work area. Its displayed position is schematic; the campaign assigns an approved facility and work window.',tone:'amber'},
  {id:'control',label:'Remote operations / EGSE',description:'Customer telemetry, command, video and records separated from the controlled work area.',tone:'blue'},
  {id:'logistics',label:'Portable GSE / receiving',description:'Traveling carts, flight-container staging and mission handling fixtures.',tone:'slate'},
  {id:'encapsulation',label:spec.visual.matingLabel,description:'Carrier-specific payload transfer and mating; may take place in a separate building.',tone:'violet'}
 ];
 return {
  ...spec,facilityClass:documented?'documented':spec.status==='planned'?'planning':'concept',
  hazardousCell:true,hazardousStatus:hazardous,
  schematic:true,missionApproval:'open',
  scope:'PDR facility and campaign planning; the rendered work areas are schematic and do not certify facility fit or completed verification.',
  zones,portableGSE:commonGSE,requiredApprovals:approvals,
  capabilities:[
   capability('clean-processing','Controlled spacecraft preparation',spec.cleanStatus??(documented?'documented':'planned'),spec.cleanBasis??'The selected route provides the planning context; the mission must establish the required cleanliness and service interfaces.',spec.cleanSourceIds??[sources[0].id]),
   capability('hazardous-fluid-servicing','Spacecraft propellant servicing',hazardous,spec.hazardousBasis??'An approved spacecraft hazardous-processing location is still to be selected; a cart in the scene does not establish this capability.',spec.hazardousSourceIds??[]),
   capability('battery-charging','Battery charging and ground power','planned','Portable spacecraft EGSE and a mission-approved charge plan; local power capacity, grounding and battery controls remain to be agreed.'),
   capability('rf-checkout','Cabled or shielded RF checkout','planned','Plan a contained ground link check. Range-approved radiated testing and full EMC qualification are separate activities.'),
   capability('encapsulation','Payload integration and closeout',spec.integrationStatus??(documented?'documented':'planned'),spec.integrationBasis??'The provider flow identifies the integration destination. Mission tooling and spacecraft access remain open.',[sources[0].id]),
   capability('conditioned-transfer','Protected payload transfer',spec.transferStatus??(documented?'documented':'unconfirmed'),spec.transferBasis??'Plan clean transport, environmental monitoring and post-transfer checks for the selected route.',[sources[0].id]),
   capability('environmental-test','Environmental verification','offsite','Allocate vibration, acoustic, thermal-vacuum and EMC work to qualified test facilities. Review evidence before shipment; this hall is not assumed to contain those test facilities.')
  ],
  limitations:[...spec.limitations,'No ODC facility contract, compatibility acceptance or completed test is implied.','Portable GSE still needs local service interfaces, calibration, access and operating approval.'],
  candidateFacilities:spec.candidateFacilities??[],sources
 };
}
const astrotechCandidate=(coast,heritage)=>({id:`astrotech-${coast}`,name:coast==='florida'?'Astrotech Titusville':'Astrotech Vandenberg',status:'candidate',basis:heritage??'Published commercial payload-processing services; mission selection and compatibility remain open.',sourceIds:['astrotech']});

const records={
 'terran-cape':makeFacility({
  id:'terran-cape',name:'LC-16 cleanroom and Terran R integration campaign',shortName:'LC-16 · Terran R',location:'Cape Canaveral, Florida',status:'planned',statusLabel:'Facility development · mission flow to confirm',evidenceStatus:'Published construction; spacecraft servicing details open',color:'#49c6c0',
  roles:[role('prepare','LC-16 cleanroom / planned PPF','Receiving and payload preparation; Relativity reports cleanroom outfitting and a future PPF expansion.'),role('integrate','LC-16 horizontal integration facility','Rocket-stage mating is documented; the enclosed payload route and mission tooling remain study assumptions.')],
  limitations:['Cleanroom construction is not evidence of qualified MMH / MON-3 spacecraft fueling services.','Recovered and expendable Terran R cases share this campaign route.'],
  visual:{theme:'terran',zoneStyle:'horizontal',processingLabel:'LC-16 cleanroom · development',matingLabel:'Terran R HIF transfer',hazardousLabel:'Servicing facility · to confirm'},sources:[S.terran,S.terranSite]
 }),
 'glenn-a':makeFacility({
  id:'glenn-a',name:'New Glenn customer integration facility · planned 7×2 route',shortName:'New Glenn · LC-36A',location:'Cape Canaveral, Florida',status:'planned',statusLabel:'Customer facility under construction',evidenceStatus:'October 2026 provider construction plan',color:'#55a8f5',
  roles:[role('prepare','Planned customer integration facility','The shared facility is planned with payload preparation and encapsulation bays.'),role('integrate','LC-36A hybrid integration route','The announced flow joins rocket stages horizontally, then mates the encapsulated payload vertically.')],
  limitations:['The new customer facility is a planning baseline, not a claim that it is operational.','Astrotech has New Glenn campaign heritage; the ODC processing provider and service scope remain unassigned.'],
  candidateFacilities:[astrotechCandidate('florida','Astrotech lists the 2025 ESCAPADE / New Glenn campaign; this does not establish ODC fit or a service agreement.')],
  visual:{theme:'glenn',zoneStyle:'vertical-transfer',processingLabel:'New Glenn CIF · planned',matingLabel:'Encapsulation → LC-36A',hazardousLabel:'Hazardous processing · to confirm'},sources:[S.glenn,S.glennFlow,S.glennPads,S.astrotech,S.astrotechHistory]
 }),
 'glenn-b':makeFacility({
  id:'glenn-b',name:'New Glenn customer integration facility · planned 9×4 route',shortName:'New Glenn 9×4 · LC-36B',location:'Cape Canaveral, Florida',status:'planned',statusLabel:'Customer facility and 9×4 VIF in development',evidenceStatus:'Published 9×4 facility plan; mission interfaces open',color:'#708ff1',
  roles:[role('prepare','Planned shared customer integration facility','Payload preparation and encapsulation support are planned for both New Glenn variants.'),role('integrate','9×4 vertical integration facility / LC-36B','The new VIF and second launch pad are under development; detailed payload handoffs remain to be agreed.')],
  limitations:['The 9×4 facility announcement does not establish ODC crane capacity, door clearance or spacecraft-service compatibility.','A 7×2 flight campaign does not qualify the larger 9×4 route.'],
  visual:{theme:'glenn9',zoneStyle:'vertical-transfer',processingLabel:'Shared New Glenn CIF · planned',matingLabel:'9×4 VIF → LC-36B',hazardousLabel:'Hazardous processing · to confirm'},sources:[S.glenn,S.glennPads,S.glennFlow]
 }),
 'falcon-florida':makeFacility({
  id:'falcon-florida',name:'Falcon payload processing facility → LC-39A hangar',shortName:'Falcon · Florida PPF',location:'Florida Space Coast · Falcon Heavy campaign',status:'documented',statusLabel:'Published provider processing route',evidenceStatus:'2025 Falcon guide; mission PPF selection open',color:'#64b9da',
  cleanBasis:'The Falcon guide provides a controlled PPF for receiving, final assembly and spacecraft checkout.',
  hazardousStatus:'documented',hazardousBasis:'The guide describes hazardous processing in suitable PPFs. The campaign must confirm the chosen facility and the exact spacecraft propellants.',hazardousSourceIds:['falcon'],
  roles:[role('prepare','SpaceX-arranged payload processing facility','Spacecraft preparation, approved hazardous processing, adapter mate and fairing encapsulation.'),role('integrate','LC-39A integration hangar','The enclosed payload transfers to the hangar for horizontal mating to the rocket.')],
  candidateFacilities:[astrotechCandidate('florida','Astrotech lists GOES-U / Falcon Heavy processing heritage. Selection and ODC compatibility remain open.')],
  limitations:['A provider PPF route is established; the particular ODC building and booking are not.'],
  visual:{theme:'falcon',zoneStyle:'horizontal',processingLabel:'Falcon payload cleanroom',matingLabel:'Encapsulation → LC-39A hangar',hazardousLabel:'Designated hazardous work area'},sources:[S.falcon,S.astrotech,S.astrotechHistory]
 }),
 'falcon-west':makeFacility({
  id:'falcon-west',name:'Vandenberg payload processing → SLC-6 study route',shortName:'Falcon · Vandenberg',location:'Vandenberg, California',status:'planned',statusLabel:'Published Falcon flow · developing SLC-6 route',evidenceStatus:'Guide-based campaign; SLC-6 assignment requires confirmation',color:'#8aafd5',
  roles:[role('prepare','Mission-selected Vandenberg PPF','Use a payload facility matched to hazardous and non-hazardous requirements.'),role('integrate','SLC-6 integration hangar · development','The guide’s encapsulated-payload flow informs this SLC-6 planning route.')],
  candidateFacilities:[astrotechCandidate('california')],
  limitations:['The Falcon guide explicitly excludes Vandenberg Building 398 from hypergolic operations.','Published Falcon processing capability does not establish the final SLC-6 payload transfer route.'],
  visual:{theme:'falcon-west',zoneStyle:'horizontal',processingLabel:'Vandenberg PPF · to select',matingLabel:'SLC-6 hangar · development',hazardousLabel:'Approved hazardous PPF · to select'},sources:[S.falcon,S.falconWest,S.astrotech]
 }),
 'vulcan-florida':makeFacility({
  id:'vulcan-florida',name:'Astrotech Titusville → SLC-41 Vertical Integration Facility',shortName:'Astrotech → Vulcan VIF',location:'Titusville / Cape Canaveral, Florida',status:'documented',statusLabel:'ULA-published primary PPF route',evidenceStatus:'Vulcan guide names Astrotech; ODC services not contracted',color:'#c8a868',
  cleanBasis:'ULA identifies Astrotech Titusville as its primary PPF for Vulcan-class payloads.',
  hazardousStatus:'documented',hazardousBasis:'Astrotech publishes spacecraft propellant services. Exact chemical compatibility, equipment and campaign approval remain mission-specific.',hazardousSourceIds:['astrotech-services'],
  transferBasis:'ULA describes upright transfer with environmental conditioning and shock, temperature and humidity monitoring.',
  roles:[role('prepare','Astrotech Titusville PPF','Standalone spacecraft processing and approved propellant servicing.'),role('encapsulate','Astrotech encapsulation bay','Upright adapter mate and payload-fairing closeout.'),role('integrate','SLC-41 Vertical Integration Facility','Conditioned transport, vertical lift and mate above Centaur V.')],
  limitations:['Astrotech is the published primary route; mission acceptance and contracted services remain open.'],
  visual:{theme:'vulcan',zoneStyle:'vertical-transfer',processingLabel:'Astrotech payload cleanroom',matingLabel:'Vertical transfer → SLC-41 VIF',hazardousLabel:'Astrotech hazardous servicing'},sources:[S.vulcan,S.astrotech,S.astrotechServices]
 }),
 'vulcan-west':makeFacility({
  id:'vulcan-west',name:'Vandenberg commercial PPF → SLC-3E Mobile Service Tower',shortName:'Vandenberg PPF → Vulcan MST',location:'Vandenberg, California',status:'planned',statusLabel:'Published West Coast flow · facility selection open',evidenceStatus:'ULA guide; commercial PPF and local readiness to confirm',color:'#d1b687',
  roles:[role('prepare','Mission-selected commercial PPF','The ULA guide provides for commercial processing and vertical encapsulation.'),role('integrate','SLC-3E Mobile Service Tower','The enclosed payload is transported upright with environmental conditioning for tower-crane mating.')],
  candidateFacilities:[astrotechCandidate('california')],transferStatus:'documented',transferBasis:'The Vulcan guide specifies a conditioned vertical transfer from a commercial PPF to SLC-3E.',
  limitations:['ULA’s West Coast guide does not assign Astrotech to this mission.','Confirm local Vulcan conversion readiness and PPF compatibility before committing a campaign.'],
  visual:{theme:'vulcan-west',zoneStyle:'mobile-tower',processingLabel:'Commercial PPF · to select',matingLabel:'Vertical transfer → SLC-3E MST',hazardousLabel:'Hazardous PPF · to confirm'},sources:[S.vulcan,S.astrotech,S.astrotechServices]
 }),
 'ariane-kourou':makeFacility({
  id:'ariane-kourou',name:'EPCU S5 → BAF-HE → ELA-4',shortName:'Ariane 6 · EPCU S5',location:'Guiana Space Centre, Kourou',status:'documented',statusLabel:'Published preparation and upper-composite route',evidenceStatus:'CNES facility descriptions and Ariane 6 manual',color:'#9bbd78',
  cleanBasis:'CNES identifies S5C for non-hazardous spacecraft work and S5A / S5B for hazardous preparation.',cleanSourceIds:['epcu'],
  hazardousStatus:'documented',hazardousBasis:'The S5 hazardous halls provide the planning basis for spacecraft propellant servicing; the exact propellant system still needs acceptance.',hazardousSourceIds:['epcu','ariane'],
  roles:[role('prepare','EPCU S5C','Receiving, inspection and non-hazardous spacecraft checkout.'),role('service','EPCU S5A / S5B','Approved spacecraft hazardous processing in designated halls.'),role('encapsulate','BAF-HE','Spacecraft / adapter integration and vertical fairing encapsulation.'),role('integrate','ELA-4 mobile gantry','Protected upper-composite transfer and lift onto the launcher.')],
  limitations:['S5 preparation, BAF-HE encapsulation and ELA-4 launcher mating are separate work areas.'],
  visual:{theme:'ariane',zoneStyle:'connected-halls',processingLabel:'EPCU S5C · clean preparation',matingLabel:'BAF-HE → ELA-4',hazardousLabel:'S5A / S5B · hazardous halls'},sources:[S.ariane,S.epcu,S.csg]
 }),
 'cz5-wenchang':makeFacility({
  id:'cz5-wenchang',name:'Wenchang technical-area payload preparation → LC-101',shortName:'Wenchang · CZ-5B',location:'Wenchang, Hainan',status:'documented',statusLabel:'Flight-campaign route · service details open',evidenceStatus:'Mengtian / CZ-5B campaign reports',color:'#cf9a7d',
  cleanStatus:'unconfirmed',cleanBasis:'Public campaign reports establish preparation and testing, but do not publish a customer cleanroom/service specification.',transferStatus:'unconfirmed',transferBasis:'The assembled CZ-5B and Mengtian were transported to the pad. ODC transport protection requirements remain to be established.',
  roles:[role('prepare','Wenchang technical area','Spacecraft preparation and checks are supported by the Mengtian campaign record.'),role('integrate','CZ-5B assembly and rollout route','The integrated launcher and payload move to the launch area together.')],
  limitations:['Published flight activity does not establish available customer hazardous-processing services or ODC access.','Customer preparation rooms, utilities, fueling arrangements and detailed handling fixtures remain unconfirmed.'],
  visual:{theme:'wenchang',zoneStyle:'vertical-assembly',processingLabel:'Wenchang technical area',matingLabel:'Integrated stack → LC-101',hazardousLabel:'Servicing location · unconfirmed'},sources:[S.cz5,S.cz5Prep]
 }),
 'cz9-study':makeFacility({
  id:'cz9-study',name:'Future Wenchang heavy-lift processing hall · study',shortName:'CZ-9 · facility study',location:'Wenchang, Hainan · unassigned future site',status:'study',statusLabel:'Concept only · facility not assigned',evidenceStatus:'Public launcher concept and site planning context',color:'#b59bbd',
  roles:[role('prepare','Concept payload preparation hall','Illustrative receiving, checkout and servicing allocation.'),role('integrate','Concept heavy-lift integration hall','Vertical handling is a workbench assumption, awaiting a provider interface and facility plan.')],
  limitations:['No operational CZ-9 payload processing facility, customer service specification or qualified handling route is established by these references.'],
  visual:{theme:'concept',zoneStyle:'concept',processingLabel:'Heavy-lift cleanroom · concept',matingLabel:'Integration hall · concept',hazardousLabel:'Separate servicing · concept'},sources:[S.cz9,S.cz9Site]
 })
};
for(const [siteId,shortName,location,siteSource] of [
 ['starbase-pad2','Starbase cargo study','Starbase, Texas',S.starbase],
 ['ksc-starship','Kennedy cargo study','Kennedy Space Center, Florida',S.starKsc],
 ['cape-slc37','SLC-37 cargo study','Cape Canaveral, Florida',S.starCape],
 ['louisiana-study','Louisiana cargo study','Pecan Island, Louisiana · proposed campus',S.starLouisiana]
]){
 const id=`starship-${siteId}`;
 records[id]=makeFacility({
  id,name:`${shortName} · payload preparation and ship loading`,shortName,location,status:'study',statusLabel:'ODC large-cargo handling study',evidenceStatus:'Site context published; this payload-handling concept unqualified',color:siteId==='starbase-pad2'?'#9cc6cb':siteId==='louisiana-study'?'#9fbd8f':'#91a9d6',
  roles:[role('prepare','Separate payload preparation area · study','Spacecraft checkout and approved hazardous servicing precede transfer to the ship.'),role('integrate','Ship high bay / cargo loading station · study','The large hatch, lateral carriage, lifts and local service interfaces are ODC concept hardware.')],
  limitations:['Starship satellite-dispenser heritage does not qualify this large spacecraft cargo-loading concept.','Site approval or construction does not establish a customer PPF, MMH / MON-3 servicing, crane capacity or payload door clearance.'],
  visual:{theme:siteId==='starbase-pad2'?'starbase':siteId==='louisiana-study'?'louisiana':'starship-florida',zoneStyle:'ship-high-bay',processingLabel:`${shortName} · preparation`,matingLabel:'Ship cargo station · study',hazardousLabel:'Separate hazardous PPF · to confirm'},sources:[siteSource]
 });
}
const routes={
 terran:{'cape-lc16':'terran-cape'},terranX:{'cape-lc16':'terran-cape'},
 glenn:{'cape-lc36a':'glenn-a'},glenn9:{'cape-lc36b':'glenn-b'},
 starship:Object.fromEntries(['starbase-pad2','ksc-starship','cape-slc37','louisiana-study'].map(id=>[id,`starship-${id}`])),
 falconHeavy:{'ksc-lc39a':'falcon-florida','vandenberg-slc6':'falcon-west'},
 vulcan6:{'cape-slc41':'vulcan-florida','vandenberg-slc3e':'vulcan-west'},
 ariane64:{'kourou-ela4':'ariane-kourou'},longMarch5B:{'wenchang-lc101':'cz5-wenchang'},longMarch9:{'wenchang-study':'cz9-study'}
};
function deepFreeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))deepFreeze(child)}return value}
export const PROCESSING_FACILITIES=deepFreeze(records);
export const FACILITY_REFERENCES=deepFreeze({
 astrotech:{id:'astrotech-reference',name:'Astrotech Space Operations',role:'Commercial processing and portable service equipment reference',
  summary:'Florida and California facilities publish cleanroom, hazardous-processing, customer control and GSE support. Portable service equipment still needs an accepted facility interface and campaign.',
  sources:[S.astrotech,S.astrotechServices,S.astrotechHistory]},
 wallops:{id:'wallops-reference',name:'NASA Wallops · processing and test facilities',role:'Reference facility / candidate offsite test service',launchAssignment:false,
  summary:'The Range Handbook distinguishes the V-55 spacecraft fueling facility, H-100 payload processing, launch-vehicle integration and F-7 multipayload work. The I&T handbook separately identifies EMC and environmental test facilities.',
  limitations:['None of the selected launch vehicles is assigned to Wallops in this catalog.','Chamber size, test capability, access and schedule must be checked for each article; Wallops is not a generic substitute for the selected launch campaign.'],
  sources:[S.wallops,S.wallopsTesting]}
});
deepFreeze(PROCESSING_SOURCES);

/** Accept an assembled hardware model, a design object, or explicit launcher/site IDs. */
export function processingFacility(hOrLauncherId,siteId){
 const d=typeof hOrLauncherId==='string'?{launcher:hOrLauncherId,launchSite:siteId}:(hOrLauncherId?.input??hOrLauncherId?.design??hOrLauncherId);
 const launcher=d?.launcher,selected=launchSiteFor(launcher,siteId??d?.launchSite);
 if(!selected||!Object.hasOwn(routes,launcher))throw new RangeError('Unknown launch vehicle: '+launcher);
 const id=routes[launcher][selected.id];
 if(!id)throw new RangeError('No payload-processing route for '+launcher+' at '+selected.id);
 return PROCESSING_FACILITIES[id];
}
