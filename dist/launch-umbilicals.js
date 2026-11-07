// Preliminary service architecture, not a provider fabrication drawing. The
// service assemblies, fluid circuits and two separation boundaries are explicit;
// unissued connector, valve, routing and electrical allocations remain open.
import {launchFleet} from './launch-fleet.js';
import {launchSiteFor,launchPropulsionFor} from './launch-sites.js';
import {launchClockFor} from './launch-effects-state.js';

const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
const source=(id,title,url,section)=>freeze({id,title,url,section});
export const UMBILICAL_SOURCES=freeze({
 falcon:source('falcon','SpaceX · Falcon User’s Guide, May 2025','https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf','§§2.3, 4.3–4.5, 5.2 and 10.4'),
 vulcan:source('vulcan','ULA · Vulcan Launch Systems User’s Guide, October 2023','https://www.ulalaunch.com/docs/default-source/rockets/2023_vulcan_user_guide.pdf','§§1.4, 4.3.2, 4.4.1–4.4.5 and 5.3'),
 ariane:source('ariane','Arianespace · Ariane 6 User’s Manual, Issue 2 Rev 0','https://www.arianespace.com/app/uploads/sites/4/2024/10/Mua-6_Issue-2_Revision-0_March-2021.pdf','February 2021 · §§5.5–5.6 and 6.2.3'),
 arianePad:source('arianePad','ESA · Ariane 6 launch zone','https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/Ariane_6_the_launch_zone','Core-stage connections, upper-stage cryogenic arms and payload ventilation'),
 glennPad:source('glennPad','Blue Origin · New Glenn return to flight','https://www.blueorigin.com/news/new-glenn-return-to-flight','30 June 2026 · horizontal/vertical integration CONOPS and tower umbilicals'),
 glenn:source('glenn','Blue Origin · New Glenn Payload User’s Guide, Rev C','https://yellowdragonblog.com/wp-content/uploads/2019/01/new_glenn_payload_users_guide_rev_c.pdf','October 2018 · archived manufacturer guide; electrical interfaces and environmental control'),
 glennVehicle:source('glennVehicle','Blue Origin · New Glenn','https://www.blueorigin.com/new-glenn','Methane first stage and hydrogen upper stage'),
 starship:source('starship','SpaceX · Introducing Starship V3','https://new.spacex.com/updates','Super Heavy V3 and Starbase Pad 2 change highlights'),
 terran:source('terran','Relativity · Terran R','https://www.relativityspace.com/terran-r/','Two-stage methane/oxygen vehicle architecture'),
 terranPad:source('terranPad','Relativity · May 2026 company update','https://www.relativityspace.com/press-release/2026/6/4/may-2026-company-updatenbspnbsp','LC-16 transporter-erector fluid brackets and piping'),
 terranGas:source('terranGas','NASA / Relativity · LC-16 gas-metering agreement','https://www.nasa.gov/saa/domestic/40893_KCA-4678-9%20Rev%20Basic%20-%20Final.pdf','KCA-4678-9 · GN2 and GHe metering for launch and processing'),
 lm5:source('lm5','China Manned Space · Long March 5B first-flight technical briefing','https://www.cmse.gov.cn/fxrw/czwhbyzhj/zhxw/202005/t20200506_46487.html','6 May 2020 · core, four liquid boosters, no second core stage and zero-second connectors'),
 lm5Umbilical:source('lm5Umbilical','China Manned Space · Rocket umbilicals','https://www.cmse.gov.cn/fxrw/czwhbyzhj/zhxw/202005/t20200503_46368.html','3 May 2020 · service functions and staged ground disconnection; general explanatory account'),
 lm9:source('lm9','CALT designer briefing · Long March 9 concept','https://english.www.gov.cn/news/topnews/202301/19/content_WS63c8b4ccc6d0a757729e5d88.html','January 2023 · retained two-stage LEO study; no released mission interface'),
});

export const UMBILICAL_MEDIA=freeze({
 lox:{label:'Liquid oxygen',color:'#8ec8e0',fluid:true},
 methane:{label:'Liquid methane / LNG',color:'#dfb076',fluid:true},
 hydrogen:{label:'Liquid hydrogen',color:'#c1a4e4',fluid:true},
 rp1:{label:'Kerosene',color:'#d9ac75',fluid:true},
 power:{label:'Electrical power',color:'#e4c679'},
 data:{label:'Command / telemetry',color:'#8fd1ba'},
 'conditioned-air':{label:'Conditioned air',color:'#a6c9ce',fluid:true},
 nitrogen:{label:'Gaseous nitrogen',color:'#b4c6df',fluid:true},
 grounding:{label:'Bonding / reference',color:'#aab4bd'},
 'unknown-fuel':{label:'Fuel · unallocated',color:'#bba68a',fluid:true},
 'unknown-oxidizer':{label:'Oxidizer · unallocated',color:'#97aab8',fluid:true},
});

export const UMBILICAL_REQUIREMENTS=freeze([
 {id:'UMB-01',subject:'Controlled interface allocation',method:'Design review and provider agreement',evidence:'Mission ICD identifying every service, connector owner, ground/flight boundary, pin allocation, line specification and permitted simultaneous operations.',owner:'ODC systems engineering + launch provider',status:'open'},
 {id:'UMB-02',subject:'Electrical protection and power handover',method:'Analysis, inspection and integrated checkout',evidence:'Accepted voltage/current allocation, conversion and current limiting, bonding/isolation, battery handover and disconnect-transient results. High-power computing remains inhibited in the launch configuration.',owner:'ODC power / avionics + provider electrical interface team',status:'open'},
 {id:'UMB-03',subject:'Fluid segregation and isolation',method:'Provider design evidence and approved acceptance tests',evidence:'Separate fuel/oxidizer service definitions, compatible materials, cleanliness, relief/vent/drain destinations and leak/isolation acceptance records.',owner:'Launch provider ground-fluid systems',status:'open'},
 {id:'UMB-04',subject:'Release and retained-hardware clearance',method:'Envelope analysis and representative disconnect demonstration',evidence:'Withdrawal envelope, compliance/slack, extraction loads, retained ground-side hardware, flight-side protection and positive clear indication at the appropriate release boundary.',owner:'Provider mechanisms + ODC separation interface',status:'open'},
 {id:'UMB-05',subject:'End-to-end command and environment',method:'Integrated functional and compatibility testing',evidence:'Power, command, telemetry and separation-loop verification; payload thermal/cleanliness continuity during transfer and countdown; approved EMI/RF configuration.',owner:'ODC verification lead + provider operations',status:'open'},
 {id:'UMB-06',subject:'Joint countdown release',method:'Configuration review and rehearsal',evidence:'Released service configuration, ground-power handover, launch inhibits, umbilical clear logic, discrepancy disposition and provider/range concurrence.',owner:'Mission operations + launch provider',status:'open'},
]);

const same=(value,sourceIds,basis)=>({status:value,sourceIds,basis});
const documented=(sourceIds,basis)=>same('documented',sourceIds,basis);
const study=(sourceIds,basis)=>same('study',sourceIds,basis);
const proposed=(sourceIds,basis)=>same('proposed',sourceIds,basis);
const cache=new Map();
const missionCache=new WeakMap();
const commonOpen=[
 'Provider-issued routing, connector selection, pinout, line sizes, extraction loads and service ratings are not allocated by the public reference model.',
 'Service pressure, temperature, flow, vent/drain routing, purge and pressurant allocation require the provider ground-system design. A line in this model denotes a service circuit, not a count of physical hoses.',
 'The ground-power voltage is an external-interface allocation. It is not inferred from the spacecraft flight-bus voltage; conversion, charge limits and load inhibits must be agreed.',
 'Ground services separate at the pad; the spacecraft-to-carrier harness remains with the flight stack until payload release. A plugged-in connector does not establish that it is energized or carrying fluid.',
];

function build(launcherId,site){
 const vehicle=launchFleet[launcherId],prop=launchPropulsionFor(launcherId),clock=launchClockFor(launcherId),groups=[],connections=[];
 const star=launcherId==='starship',falcon=launcherId==='falconHeavy',vulcan=launcherId==='vulcan6',ariane=launcherId==='ariane64',lm5=launcherId==='longMarch5B',lm9=launcherId==='longMarch9',glenn=launcherId==='glenn'||launcherId==='glenn9',terran=launcherId==='terran'||launcherId==='terranX';
 const primary=star?'starship':falcon?'falcon':vulcan?'vulcan':ariane?'ariane':glenn?'glenn':terran?'terran':'lm5';
 const familySources=star?['starship']:falcon?['falcon']:vulcan?['vulcan']:ariane?['ariane','arianePad']:glenn?['glenn','glennPad','glennVehicle']:terran?['terran','terranPad','terranGas']:lm9?['lm9']:['lm5','lm5Umbilical'];
 const laterSite=site.status==='planned'||site.status==='study'||site.status==='development';
 const publishedService=lm9?study(['lm9'],'Provider service allocation is unavailable for this dated design study.'):
  documented([primary],'The published vehicle architecture establishes these stage propellants; pipe and connector placement here is a preliminary allocation.');
 const groundRelease=(mode='pull-away',duration=2,basis='Ground service ends at model liftoff. The withdrawal duration and trajectory are illustrative, not a provider countdown requirement.')=>({event:'liftoff',met:0,motionStart:0,motionEnd:duration,mode,basis});
 function group(id,name,target,heightFraction,architecture,evidence,extra={}){
  const q={id,name,architecture,visual:{target,heightFraction,azimuthDeg:225,...extra.visual},release:extra.release||groundRelease(architecture==='rotating-arm'||architecture==='cryogenic-arm'?'pivot-away':architecture==='flight-harness'?'flight-separation':'pull-away'),...evidence,geometryBasis:'Illustrative service location; not a surveyed attachment point.',...extra};
  q.visual={target,heightFraction,azimuthDeg:225,...extra.visual};groups.push(q);return q;
 }
 function connection(id,groupId,name,medium,target,source,destination,evidence,extra={}){
  const g=groups.find(g=>g.id===groupId),m=UMBILICAL_MEDIA[medium];
  const q={id,groupId,name,category:g.release.event==='payload-release'||id.startsWith('payload-')?'payload':'stage',medium,target,source,destination,chain:[source,g.name,destination],purpose:'Provider-managed launch service.',direction:m.fluid?'supply / return allocation open':'bidirectional',color:m.color,interfaceStatus:'open',...evidence,...extra};
  if(m.fluid&&!q.returnPath)q.returnPath=medium==='conditioned-air'?'Fairing vents and ascent depressurization path; provider environmental-control analysis.':'Dedicated provider vent / drain / recovery route; isolated from the other propellant. Final routing and operating limits remain open.';
  connections.push(q);return q;
 }
 function fluids(groupId,target,kind,evidence=publishedService,prefix=target){
  const fuel=kind==='hydrolox'?'hydrogen':kind==='methalox'?'methane':kind==='kerolox'?'rp1':'unknown-fuel';
  connection(prefix+'-fuel',groupId,target+' fuel service',fuel,target,UMBILICAL_MEDIA[fuel].label+' supply',target+' fuel tank',evidence,{purpose:'Allocate an isolated fuel fill / drain circuit to this stage. Ground isolation and vent handling remain under provider control.'});
  connection(prefix+'-oxidizer',groupId,target+' oxidizer service',kind==='unknown'?'unknown-oxidizer':'lox',target,kind==='unknown'?'Oxidizer supply · unallocated':'Liquid-oxygen supply',target+' oxidizer tank',evidence,{purpose:'Allocate the stage oxidizer circuit independently of its fuel circuit. This does not connect to the spacecraft propulsion module.'});
 }
 let coreGroup='core-tail',upperGroup='upper-service',controlGroup='core-tail';
 if(star){
  const evidence=site.id==='starbase-pad2'?documented(['starship'],'V3 uses separate booster methane and oxygen quick-disconnect mechanisms at the launch mount.'):study(['starship'],'The V3 split booster-QD architecture is carried into this proposed site; site-specific hardware is unconfirmed.');
  group('core-fuel','Super Heavy methane QD','core',.055,'tail-mast',evidence,{visual:{azimuthDeg:215}});
  group('core-oxidizer','Super Heavy oxygen QD','core',.055,'tail-mast',evidence,{visual:{azimuthDeg:285}});
  group('upper-service','Starship rotating QD arm','upper',.12,'rotating-arm',site.id==='starbase-pad2'?documented(['starship'],'The ship propellant arm rotates away during launch.'):study(['starship'],'Starbase-derived ship-QD arrangement; local arm design remains open.'));
  connection('core-fuel','core-fuel','Super Heavy methane','methane','Super Heavy','Methane farm / isolated bunker','Super Heavy methane tank',evidence,{purpose:'Distinct methane service mechanism at the booster base.'});
  connection('core-oxidizer','core-oxidizer','Super Heavy oxygen','lox','Super Heavy','Oxygen farm / isolated bunker','Super Heavy oxygen tank',evidence,{purpose:'Distinct oxygen service mechanism, physically separate from the methane mechanism.'});
  fluids('upper-service','Starship','methalox',documented(['starship'],'The rotating ship arm supplies the methane/oxygen upper stage; individual pipe routing is illustrative.'),'upper');
  controlGroup='vehicle-control';group(controlGroup,'Booster electrical interface','core',.10,'tail-mast',study(['starship'],'An electrical ground/vehicle boundary is allocated here; the public V3 update does not define its pinout or attachment geometry.'),{visual:{azimuthDeg:250}});
 }else if(ariane){
  const e=documented(['arianePad'],'ESA places core cryogenic connections at ground level and upper-stage services on retracting mast arms.');
  group('core-fuel','Core hydrogen connection','core',.045,'tail-mast',e,{visual:{azimuthDeg:210}});
  group('core-oxidizer','Core oxygen connection','core',.045,'tail-mast',e,{visual:{azimuthDeg:315}});
  const release=groundRelease('pivot-away',2,'ESA reports upper arms can withdraw in less than 2.3 seconds. This illustration uses a 2-second motion at model liftoff; the actual sequence is provider controlled.');
  group('upper-fuel','Upper hydrogen arm','upper',.27,'cryogenic-arm',e,{visual:{azimuthDeg:215},release});
  group('upper-oxidizer','Upper oxygen arm','upper',.67,'cryogenic-arm',e,{visual:{azimuthDeg:285},release});
  connection('core-fuel','core-fuel','Core hydrogen','hydrogen','Core stage','Hydrogen supply','Core hydrogen tank',e);
  connection('core-oxidizer','core-oxidizer','Core oxygen','lox','Core stage','Liquid-oxygen supply','Core oxygen tank',e);
  connection('upper-fuel','upper-fuel','Upper-stage hydrogen','hydrogen','Upper stage','Hydrogen supply / mast riser','Upper hydrogen tank',e);
  connection('upper-oxidizer','upper-oxidizer','Upper-stage oxygen','lox','Upper stage','Oxygen supply / mast riser','Upper oxygen tank',e);
  controlGroup='vehicle-control';group(controlGroup,'Vehicle electrical service','core',.12,'tail-mast',study(['arianePad'],'Launch-tower electrical supply is documented; this circuit grouping and endpoint are preliminary.'));
 }else{
  const e=glenn?proposed(['glennPad'],'The current rebuild uses tower umbilicals, replacing the former transporter-erector arrangement.'):
   terran?proposed(['terranPad'],'Strongback fluid brackets and piping are documented during LC-16 construction. Service locations remain preliminary.'):
   vulcan?documented(['vulcan'],'The vehicle uses methane/oxygen and hydrogen/oxygen stages. Ground service assembly locations are schematic.'):
   falcon?documented(['falcon'],'The transporter-erector supports the three-core vehicle. Stage-circuit grouping is a preliminary architectural allocation.'):
   lm5?documented(['lm5'],'The 5B has one core and four liquid boosters, with zero-second ground connectors; exact circuit locations remain open.'):
   study(['lm9'],'Service assemblies are placeholders for the retained two-stage LEO concept.');
  group(coreGroup,glenn?'GS1 tower service':falcon?'Center-core tail service':terran?'First-stage tail service':lm9?'Core service · study':'Core-stage service','core',.065,glenn?'tower-arm':lm9?'concept':'tail-mast',e,vulcan?{visual:{azimuthDeg:240}}:{});
  fluids(coreGroup,lm5?'Core stage':glenn?'GS1':falcon?'Center core':'First stage',prop.core,publishedService,'core');
  if(prop.upper){
   group(upperGroup,glenn?'GS2 tower service':vulcan?'Centaur V service':lm9?'Upper service · study':'Upper-stage service','upper',.25,glenn?'tower-arm':vulcan?'mast-arm':terran||falcon?'strongback':'concept',e);
   fluids(upperGroup,glenn?'GS2':vulcan?'Centaur V':'Upper stage',prop.upper,publishedService,'upper');
  }
  if(prop.booster&&prop.booster!=='solid')for(let i=0;i<vehicle.boosters;i++){
   const id='booster-'+i;group(id,(falcon?'Side-core ':'Booster ')+(i+1)+' tail service','booster',.055,'tail-mast',e,{visual:{boosterIndex:i,azimuthDeg:225}});
   fluids(id,(falcon?'Side core ':'Booster ')+(i+1),prop.booster,publishedService,id);
  }
 }

 const controlEvidence=study(familySources.slice(0,1),'Ground electrical checkout and control are allocated to a provider interface; circuit counts and connector positions require the mission ICD.');
 connection('vehicle-power',controlGroup,'Vehicle electrical power','power','Launch vehicle','Provider ground power','Vehicle electrical system',controlEvidence,{purpose:'Vehicle checkout and transition to internal power are provider-managed. Attachment does not imply that ground power remains energized.'});
 connection('vehicle-data',controlGroup,'Vehicle command & telemetry','data','Launch vehicle','Provider launch control','Vehicle avionics / launch inhibit interface',controlEvidence,{purpose:'Maintain the agreed ground-control and health-monitoring boundary through the provider release sequence.'});
 connection('vehicle-bond',controlGroup,'Vehicle ground reference','grounding','Launch vehicle','Pad equipotential network','Vehicle ground-interface reference',controlEvidence,{purpose:'Allocate bonding and electrical-reference continuity. This functional path does not imply a separate wire, a protective-earth pin sequence or a verified lightning path.'});

 const payloadEvidence=falcon||vulcan||ariane?documented([primary],'The user guide defines payload-to-ground electrical connectivity and a separate spacecraft/carrier separation interface.'):
  glenn?proposed(['glenn','glennPad'],'The 2018 manufacturer guide establishes a payload electrical interface. The 2026 tower/payload umbilical arrangement requires a current mission ICD.'):
  study(familySources.slice(0,1),'ODC allocates a customer checkout interface. The reviewed public material does not establish a compatible mission-specific payload umbilical.');
 const payloadName=vulcan?'LVFA payload T0 umbilical':ariane?'Payload mast umbilical':glenn?'Payload tower umbilical':star?'ODC cargo service · study':'Payload electrical umbilical';
 group('payload-service',payloadName,lm5?'payload':'upper',lm5?.035:.95,star?'study-arm':falcon||terran?'strongback':'mast-arm',payloadEvidence);
 connection('payload-power','payload-service','Spacecraft checkout power','power','Spacecraft', 'Customer electrical GSE','ODC charge / checkout interface',payloadEvidence,{purpose:'Power the approved ground checkout and charge interface through protected ODC conversion. The launch-vehicle connector is not assumed to supply the full computing load.',chain:['Customer electrical GSE',payloadName,'Carrier harness / spacecraft interface','ODC charge / checkout input'],direction:'ground → spacecraft',constraint:ariane?'Transfer to internal power and turn ground supply off before liftoff (§5.5.1). Disconnect current limits are controlled by the mission ICD.':'Allocate input voltage, current limiting, protected conversion and battery handover before liftoff in the mission ICD.'});
 connection('payload-data','payload-service','Spacecraft command & telemetry','data','Spacecraft','Customer control-room EGSE','ODC command / health-monitor interface',payloadEvidence,{purpose:'Provide the agreed prelaunch command and health-monitoring path. Data rate, pin allocation and allowed commands remain mission-specific.',chain:['Customer control-room EGSE',payloadName,'Carrier harness / spacecraft interface','ODC avionics'],direction:'bidirectional'});
 const ecsEvidence=falcon||vulcan||ariane?documented([ariane?'arianePad':primary],'Fairing environmental conditioning is a published service; mission set points and acceptance limits require agreement.'):
  glenn?proposed(['glenn','glennPad'],'Payload environmental control is a heritage guide service; the rebuilt pad duct and final inlet need provider confirmation.'):
  study(familySources.slice(0,1),'A protected payload air-conditioning path is an ODC accommodation requirement; provider capability and routing remain open.');
 group('payload-ecs',star?'Cargo-bay conditioning · study':'Fairing environmental duct','payload',vulcan?.61:.30,'air-duct',ecsEvidence,{visual:{azimuthDeg:255}});
 connection('payload-air','payload-ecs',star?'Cargo-bay conditioned air':'Fairing conditioned air','conditioned-air','Payload compartment','Pad environmental-control equipment',star?'Cargo bay / agreed diffuser':'Fairing inlet / diffuser',ecsEvidence,{purpose:'Maintain the agreed prelaunch temperature, humidity and cleanliness around the encapsulated spacecraft. A dedicated spacecraft fluid connection is not implied.',direction:'ground → compartment → vents'});
 const releaseMET=clock.release;
 group('payload-flight','Spacecraft separation connector','payload',.025,'flight-harness',payloadEvidence,{release:{event:'payload-release',met:releaseMET,motionStart:releaseMET,motionEnd:releaseMET+1.5,mode:'flight-separation',basis:'Uses the application’s nominal payload-release event. Mission trajectory and connector extraction timing require provider approval.'},visual:{azimuthDeg:225}});
 connection('payload-flight-power','payload-flight','Retained payload power path','power','Spacecraft','Carrier retained payload harness','ODC charge / checkout input',payloadEvidence,{purpose:'The ground-power conductors cross the spacecraft separation interface and remain physically attached after liftoff. Their ground source is removed at the pad; they are not modeled as an in-flight power supply.',chain:['Carrier retained payload harness','Spacecraft separation connector','ODC charge / checkout input'],direction:'ground-origin circuit; source removed at liftoff',serviceOrigin:'ground',constraint:'Physical continuity after liftoff does not imply an energized circuit. In-flight power is not selected by this design.'});
 connection('payload-flight-data','payload-flight','Retained payload data path','data','Spacecraft','Carrier retained payload harness','ODC avionics interface',payloadEvidence,{purpose:'The prelaunch command/monitor conductors remain attached through the flight connector. The ground link ends at liftoff; any carrier-provided in-flight telemetry or commanding requires a separate agreed service.',chain:['Carrier retained payload harness','Spacecraft separation connector','ODC avionics interface'],direction:'ground-origin signal circuit',serviceOrigin:'ground',constraint:'In-flight use of these lines is not assumed from their physical presence.'});
 connection('payload-separation','payload-flight','Separation command & monitoring','data','Spacecraft','Carrier flight interface','Spacecraft separation interface',payloadEvidence,{purpose:'Allocate provider-authorized release commands and separation indication across the flight interface. The carrier half and harness stay with the launch vehicle.',chain:['Carrier flight avionics','Retained adapter harness','Spacecraft separation connector','Spacecraft separation / indication circuits'],direction:'command → spacecraft; indication → carrier'});

 const publicGap=star?'The large-cargo ODC spacecraft interface is a project study; it is not the flown Starlink dispenser interface.':terran?'A public mission-specific Terran R payload electrical interface was not established by the reviewed construction references.':lm5?'Public 5B references establish stage architecture and zero-second connectors, not an ODC customer-interface specification.':lm9?'No published stage propellant or payload-interface allocation is assumed for the retained 2023 concept.':glenn?'The 2018 guide is a heritage reference. The current pad rebuild and 9×4 variant require a newly issued provider ICD.':null;
 const used=[...new Set([...groups,...connections].flatMap(q=>q.sourceIds).concat(familySources))];
 const options=falcon?[{id:'payload-gn2',name:'Dedicated payload nitrogen purge',selected:false,status:'optional',basis:'Falcon §4.3.1 offers this as a nonstandard service; it is not selected by this ODC reference.',sourceIds:['falcon']},{id:'payload-cryo',name:'Spacecraft cryogenic loading',selected:false,status:site.id==='ksc-lc39a'?'optional':'unconfirmed',basis:'Falcon §4.3.2 describes a nonstandard LC-39A LOX/methane payload service. The ODC spacecraft’s separate propellant-servicing plan does not select it.',sourceIds:['falcon']}]:[];
 const summary=star?'Separate Super Heavy fuel and oxidizer QDs feed the booster; a rotating arm serves the ship. The large-cargo spacecraft electrical and air services are explicit ODC study interfaces.':
  falcon?'Three separate core-service allocations feed the kerosene/oxygen vehicle. The strongback carries upper-stage and payload services; the flight connector remains until spacecraft separation.':
  ariane?'Ground-level core services and two upper-stage cryogenic arms are distinct from payload electrical and ventilation connections. Solid boosters have no liquid fill umbilicals.':
  vulcan?'Methane/oxygen core service and hydrogen/oxygen Centaur V service remain separate. The LVFA payload T0 umbilical breaks at liftoff, ahead of the later spacecraft separation connector.':
  glenn?'Tower services are allocated separately to methane/oxygen GS1, hydrogen/oxygen GS2 and the payload, following the revised integration concept.':
  lm5?'One hydrogen/oxygen core and four kerosene/oxygen boosters receive separate service circuits. The 5B has no upper stage; the payload interface remains a mission accommodation.':
  lm9?'A complete service allocation is reserved for the two-stage study, with unidentified fuel and oxidizer and unconfirmed attachment hardware clearly retained as open items.':
  'The two methane/oxygen stages use distinct service allocations on the LC-16 transporter-erector. The recovered and expendable options share this ground interface architecture.';
 return freeze({schema:'odc-launch-umbilical-design/1',id:'umbilicals-'+launcherId+'-'+site.id,revision:'A',reviewed:'2026-11-06',launcherId,launcherName:vehicle.name,siteId:site.id,siteName:site.name,status:'Preliminary · mission interfaces open',
  scope:'PDR service allocation for the selected vehicle and launch mount. Rows describe functional circuits, not connector-housing or hose counts. It defines service ownership, routing boundaries and release functions; it is not a construction drawing or an approved countdown procedure.',
  model:{geometry:'Service locations, pipe sizes and withdrawal envelopes are illustrative unless individually sourced.',timing:'The animation shares the mission clock. Liftoff and payload separation are functional boundaries; retraction durations are explanatory.',evidence:'Playback does not create qualification, acceptance or readiness evidence.'},
  summary,siteApplicability:laterSite?'The selected site is in development, proposed or a study. Family interface heritage does not establish installed hardware at this mount.':'Public site/vehicle references establish the architectural basis; mission compatibility remains open.',
  groups,connections,requirements:UMBILICAL_REQUIREMENTS,openItems:[...commonOpen,...(publicGap?[publicGap]:[])],options,
  supportAllocation:{stagePressurants:'Provider-managed; exact gas inventory and ground connection allocation are open.',purge:'Separate provider purge/cleanliness allocation; dedicated spacecraft purge is not selected without an ICD.',spacecraftFluids:'The spacecraft is serviced in its approved processing facility. No pad cryogenic line is connected to its propulsion or ammonia loop.'},
  spacecraftInterface:{flightBusV:null,groundInputV:null,groundPowerW:null,compatibility:'open',basis:'The external service rating and ODC charge / checkout converter are separate from the installed flight bus.'},
  sources:used.map(id=>UMBILICAL_SOURCES[id]).filter(Boolean)});
}

export function launchUmbilicalDesign(hOrLauncherId,siteId){
 const d=typeof hOrLauncherId==='string'?{launcher:hOrLauncherId,launchSite:siteId}:hOrLauncherId?.input||hOrLauncherId||{};
 if(!Object.hasOwn(launchFleet,d.launcher))return null;
 const site=launchSiteFor(d.launcher,siteId||d.launchSite);if(!site)return null;
 const key=d.launcher+'/'+site.id;
 if(!cache.has(key))cache.set(key,build(d.launcher,site));
 const base=cache.get(key),v=hOrLauncherId?.energySystem?.electrical?.family?.primaryV;
 if(!Number.isFinite(v))return base;
 let entry=missionCache.get(hOrLauncherId);
 if(!entry||entry.key!==key||entry.v!==v){entry={key,v,design:freeze({...base,spacecraftInterface:{...base.spacecraftInterface,flightBusV:v}})};missionCache.set(hOrLauncherId,entry);}
 return entry.design;
}

const clamp=v=>Math.min(1,Math.max(0,v));
export function launchUmbilicalState(design,t){
 if(design?.schema!=='odc-launch-umbilical-design/1')design=launchUmbilicalDesign(design);
 const time=Number.isFinite(t)?t:-20;
 if(!design)return {t:time,groups:[],connections:[],connectedCount:0,groundConnectedCount:0,flightConnectedCount:0};
 const groups=design.groups.map(g=>{const r=g.release,u=clamp((time-r.motionStart)/Math.max(.001,r.motionEnd-r.motionStart)),releaseFraction=u*u*(3-2*u),connected=time<r.met;return {id:g.id,connected,releaseFraction,state:connected?'connected':releaseFraction<1?'releasing':'clear',event:r.event};});
 const byGroup=Object.fromEntries(groups.map(g=>[g.id,g]));
 const connections=design.connections.map(c=>({...byGroup[c.groupId],id:c.id,groupId:c.groupId,serviceState:c.serviceOrigin==='ground'&&time>=0?(c.medium==='power'?'Ground source removed':'Ground link ended'):'Service availability follows the approved countdown'}));
 return {t:time,groups,connections,connectedCount:connections.filter(c=>c.connected).length,groundConnectedCount:groups.filter(g=>g.connected&&g.event!=='payload-release').length,flightConnectedCount:groups.filter(g=>g.connected&&g.event==='payload-release').length};
}
