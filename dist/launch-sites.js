// Immutable range → complex → launch-position catalog. Compatible vehicle
// assignments, public infrastructure evidence and approximate map pins live
// here, independently of spacecraft sizing and portable processing equipment.
import {launchSiteReviewed,launchSiteInfrastructure,launchInfrastructureSources} from './launch-site-infrastructure.js';
export {launchSiteReviewed};
const source=(title,url)=>{
 let hash=2166136261;for(const c of url)hash=Math.imul(hash^c.charCodeAt(0),16777619);
 return {id:'site-ref-'+(hash>>>0).toString(36),title,url,section:'Public reference',reviewed:launchSiteReviewed};
};
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;};
const padMap=source('McDowell · launch-pad geographical register','https://planet4589.org/space/gcat/data/tables/lp.html');
const blueMap=source('Blue Origin · LC-36A and LC-36B assignments','https://www.blueorigin.com/news/returning-launch-complex-36-to-two-pads');
const blueRebuild=source('Blue Origin · LC-36A rebuild and revised integration','https://www.blueorigin.com/news/new-glenn-return-to-flight');
const spaceXLog=source('SpaceX · flight and pad records','https://www.spacex.com/launches');
const starbase=source('SpaceX · V3 and Starbase Pad 2 design','https://new.spacex.com/updates');
const east={range:'Cape Canaveral Space Force Station',country:'United States',region:'Florida',terrain:'florida'};
const kennedy={...east,range:'Kennedy Space Center'};
const west={range:'Vandenberg Space Force Base',country:'United States',region:'California',terrain:'california'};
const wenchang={range:'Wenchang Space Launch Site',country:'China',region:'Hainan',terrain:'hainan'};
const site=(id,name,location,lat,lon,status,statusLabel,ground,siteNote,sources,pinBasis='Approximate launch-complex coordinates')=>Object.freeze({
 id,name,...location,lat,lon,status,statusLabel,...ground,siteNote,sources,pinBasis
});
const ground=(tower,exhaust,trenchOutlets,water='deluge')=>({tower,exhaust,trenchOutlets,water});
const siteReferences={
 'cape-lc16':site('cape-lc16','LC-16',east,28.502,-80.552,'development','Terran R pad in development',ground('strongback','diverter',1),
  'Both Terran R recovery configurations use LC-16. Relativity describes an erector strongback, a 93 m water tower and a flame diverter. The outlet geometry and liftoff sequence are study representations of the new installation.',
  [source('Relativity · diverter installation','https://www.relativityspace.com/press-release/2026/9/10/august-2026-company-update'),source('Relativity · LC-16 water tower','https://www.relativityspace.com/press-release/2026/6/4/may-2026-company-updatenbspnbsp'),source('Relativity · launch mount and strongback','https://www.relativityspace.com/press-release/2026/3/8/february-2026-company-update'),padMap]),
 'cape-lc36a':site('cape-lc36a','LC-36A',east,28.472,-80.538,'flown','Flown site · pad rebuild',ground('umbilical','duct-trench',1),
  'New Glenn 7×2 has flown from this coastal complex. The reference ground system uses a water-cooled deflector and a concrete exhaust duct. Blue Origin’s rebuild uses a crane to place the vehicle on a refurbished launch table with tower umbilicals.',
  [blueMap,blueRebuild,source('Blue Origin · New Glenn user guide, §8.4.2 and Table 8-1 (2018)','https://yellowdragonblog.com/wp-content/uploads/2019/01/new_glenn_payload_users_guide_rev_c.pdf'),padMap]),
 'cape-lc36b':site('cape-lc36b','LC-36B',east,28.48,-80.54,'development','9×4 pad under construction',ground('umbilical','duct-trench',1,'study'),
  'Blue Origin designates this second pad for the nine-engine New Glenn. The rendering borrows the 36A family’s duct and water-suppression layout as a preliminary assumption. Vandenberg SLC-14 is a separate Blue Origin heavy-launch lease candidate with no published allocation to this variant.',
  [blueMap,blueRebuild,source('U.S. Space Force · Vandenberg SLC-14 lease process','https://www.ssc.spaceforce.mil/Newsroom/Article/4459862/us-space-force-advances-heavy-launch-capability-development-at-vandenberg')],'FAA SLC-36B/11 infrastructure area, rounded to 0.01°. The pin is not a surveyed launch-mount coordinate.'),
 'starbase-pad2':site('starbase-pad2','Pad 2',{range:'Starbase',region:'Texas',country:'United States',terrain:'texas'},25.997,-97.158,'flown','Flown V3 pad',ground('catch','split-trench',2),
  'Pad 2 launched the V3 stack. Its mount divides exhaust between two outlets. A top-deck deflector, water cooling, short catch arms and a rotating ship quick-disconnect distinguish this installation from the original orbital mount.',
  [starbase,spaceXLog,source('FAA · Boca Chica ground systems and environmental documents','https://www.faa.gov/space/stakeholder_engagement/spacex_starship'),padMap]),
 'ksc-starship':site('ksc-starship','LC-39A · Starship mount',kennedy,28.61,-80.60,'planned','Reviewed Starship proposal',ground('catch','split-trench',2),
  'The Florida proposal places a dedicated Starship mount within LC-39A beside the Falcon facility. The environmental design depicts a bifurcated diverter with water released inside the mount. The depicted tower and duct dimensions are illustrative.',
  [source('FAA · LC-39A environmental decision','https://www.faa.gov/space/stakeholder_engagement/spacex_starship_ksc'),source('FAA · proposed bifurcated diverter and deluge, §2','https://www.faa.gov/space/stakeholder_engagement/spacex_starship_ksc/SpaceX-SSH-LC-39A-Final-EIS-Volume-I.pdf')],'LC-39A complex reference, rounded to 0.01°. Dedicated Starship mount shown schematically.'),
 'cape-slc37':site('cape-slc37','SLC-37 · Starship proposal',east,28.53,-80.57,'planned','Construction approval · launch review',ground('catch','split-trench',2,'study'),
  'The Department of the Air Force authorized specified site work. FAA announced a supplemental review of proposed Starship operations in September 2026. The scene uses a study mount with a divided exhaust path and deluge.',
  [source('FAA · SLC-37 project and licensing review','https://www.faa.gov/space/stakeholder_engagement/spacex_starship_ccsfs'),padMap],'SLC-37 complex reference, rounded to 0.01°. Final mount position and ground-system geometry are illustrative.'),
 'louisiana-study':site('louisiana-study','Pecan Island · proposed campus',{range:'Starbase Louisiana',country:'United States',region:'Vermilion Parish, Louisiana',terrain:'louisiana'},29.64,-92.45,'planned','Announced campus · illustrative pad',ground('catch','split-trench',2,'study'),
  'Louisiana and SpaceX announced a coastal campus in Vermilion Parish with multiple future pad pairs. The map pin identifies the Pecan Island area. The displayed catch tower, split diverter and water system are Starbase-derived study assumptions.',
  [source('Louisiana Economic Development · Pecan Island spaceport announcement','https://www.opportunitylouisiana.gov/news/spacex-launches-new-era-of-commercial-spaceflight-with-100-billion-louisiana-campus'),starbase],'Pecan Island regional pin. Individual proposed launch mounts are unlocated in this study.'),
 'ksc-lc39a':site('ksc-lc39a','LC-39A · Falcon pad',kennedy,28.608,-80.604,'flown','Flown Falcon Heavy pad',ground('fixed-service','duct-trench',1),
  'The three-core Falcon rolls up to the Florida pad on a transporter-erector. Its fixed service structure stands beside the stack. NASA describes a roofed exhaust duct with water injection for sound suppression.',
  [source('SpaceX · Falcon User’s Guide, §8.1','https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf'),source('NASA Engineering and Safety Center · LC-39A flame duct','https://www.nasa.gov/wp-content/uploads/2023/05/techup-2023-web-110923v2-singles.pdf'),spaceXLog,padMap]),
 'vandenberg-slc6':site('vandenberg-slc6','SLC-6',west,34.581,-120.627,'development','Authorized Falcon redevelopment',ground('strongback','trench',1),
  'The authorized west-coast plan supports Falcon Heavy and Falcon 9. It converts the existing trench to a single-direction water-cooled diverter, adds acoustic suppression and provides for a new integration hangar.',
  [source('U.S. Space Force · Falcon redevelopment decision','https://www.vandenberg.spaceforce.mil/News/Article-Display/Article/4323318/notice-of-availability-of-the-final-environmental-impact-statement-and-record-o/'),source('Final EIS · SLC-6 trench and water system','https://www.vsfbfalconlauncheis.com/Portals/falconprogrameis/PublicDocuments/FEIS%20Documents/VSFBFalcon100LaunchFinalEIS20251014.pdf'),padMap]),
 'cape-slc41':site('cape-slc41','SLC-41',east,28.583,-80.583,'flown','Flown Vulcan launch complex',ground('umbilical','trench',1),
  'Vulcan rides a mobile platform from the Vertical Integration Facility to the coastal pad. The fixed flame trench and acoustic deluge handle the combined BE-4 exhaust and the selected VC6L’s six solid-motor plumes.',
  [source('ULA · Vulcan site and countdown guide','https://www.ulalaunch.com/docs/default-source/default-document-library/2023_vulcan_user_guide.pdf'),source('U.S. Air Force · SLC-41 infrastructure assessment','https://www.nasa.gov/wp-content/uploads/2024/01/final-vulcan-ea-and-fonsi-2019.pdf'),padMap]),
 'vandenberg-slc3e':site('vandenberg-slc3e','SLC-3E',west,34.640,-120.590,'development','West Coast Vulcan conversion',ground('mobile-gantry','trench',1),
  'ULA is adapting the former Atlas pad for Vulcan. Its mobile service tower rolls away from the rocket before ignition. The Air Force assessment documents the deluge-water requirement. A single exhaust outlet represents the trench in this study.',
  [source('ULA · West Coast Vulcan pad conversion','https://blog.ulalaunch.com/blog/west-coast-vulcan-construction-update'),source('U.S. Space Force · SLC-3E water system','https://www.vandenberg.spaceforce.mil/Portals/18/EIAP-2022-12-1_SEA_ULA_Vulcan.pdf'),padMap]),
 'kourou-ela4':site('kourou-ela4','ELA-4',{range:'Guiana Space Centre',country:'France',region:'Kourou, French Guiana',terrain:'guiana'},5.2646,-52.7920,'flown','Flown Ariane 64 pad',ground('mobile-gantry','split-trench',2),
  'Europe’s spaceport is on the Atlantic coast of South America. The mobile assembly gantry rolls back before launch, leaving the mast and launch table. Two concrete trenches turn the exhaust away from the rocket while deluge water suppresses sound.',
  [source('ESA · Ariane 6 launch zone and water sequence','https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/Ariane_6_the_launch_zone'),source('ESA · pad and twin trenches','https://www.esa.int/ESA_Multimedia/Images/2024/08/Ariane_6_infographic_launch_pad'),source('CNES · site survey, §1.1','https://www.guyane.developpement-durable.gouv.fr/IMG/pdf/ged_17349_v2_ed_03_rev_00_etude_d_impact.pdf'),source('Arianespace · first four-booster mission','https://newsroom.arianespace.com/arianespace-successfully-launches-32-amazon-leo-satellites-with-the-first-ariane-64/?lang=eng'),source('OpenStreetMap contributors · mapped Ariane 6 launch-pad area','https://www.openstreetmap.org/way/513173238')],'Mapped Ariane 6 launch-pad area center, rounded to 0.0001°, cross-checked against IGN orthophotography. This locates the pad within ELA-4; it is not a surveyed interface or clearance origin.'),
 'wenchang-lc101':site('wenchang-lc101','Launch Complex 101',wenchang,19.614,110.951,'flown','Flown Long March 5B pad',ground('swing-arms','split-trench',2),
  'Long March 5B flies from Wenchang’s coastal national launch site. The tower’s rotating access platforms clear the vehicle. The Long March 5 trench design team describes bilateral exhaust deflection, curved exits and direct water injection into the gas flow.',
  [source('CNSA · Tianhe launch from Wenchang','https://www.cnsa.gov.cn/english/n6465652/n6465653/c6811970/content.html'),source('Beijing Institute of Technology · Long March 5 flame-channel design','https://www.bit.edu.cn/xww/mtlg/a130473.htm'),source('CASC / CAST · water and launch-channel description','https://www.cast.cn/news/4565'),source('China Manned Space · 5B flight configuration','https://en.cmse.gov.cn/news/202005/t20200506_46488.html'),source('The Space Devs · LC-101 map pin','https://ll.thespacedevs.com/2.3.0/pads/175/')]),
 'wenchang-study':site('wenchang-study','Future heavy-lift pad · study',wenchang,19.61,110.95,'study','Site proposal · pad unassigned',ground('concept','concept',0,'study'),
  'Wenchang planners described a future dedicated Long March 9 pad. Its final location, exhaust scheme and stage propellants for the catalog’s 2023 two-stage concept remain open. The animation uses a regional pin and a schematic installation.',
  [source('State Council Information Office · Wenchang planning department on a future pad','https://english.scio.gov.cn/chinavoices/2020-11/26/content_76950300.htm'),source('CALT briefing · 2023 two-stage design case','https://english.www.gov.cn/news/topnews/202301/19/content_WS63c8b4ccc6d0a757729e5d88.html')],'Wenchang range pin only. No assigned Long March 9 pad coordinates.')
};
const assignments={
 terran:['cape-lc16'],terranX:['cape-lc16'],glenn:['cape-lc36a'],glenn9:['cape-lc36b'],
 starship:['starbase-pad2','ksc-starship','cape-slc37','louisiana-study'],
 falconHeavy:['ksc-lc39a','vandenberg-slc6'],vulcan6:['cape-slc41','vandenberg-slc3e'],
 ariane64:['kourou-ela4'],longMarch5B:['wenchang-lc101'],longMarch9:['wenchang-study']
};
const rangeReferences={
 'cape-canaveral':{name:'Cape Canaveral Space Force Station',country:'United States',region:'Florida'},
 kennedy:{name:'Kennedy Space Center',country:'United States',region:'Florida'},
 vandenberg:{name:'Vandenberg Space Force Base',country:'United States',region:'California'},
 starbase:{name:'Starbase',country:'United States',region:'Texas'},
 'starbase-louisiana':{name:'Starbase Louisiana · proposed campus',country:'United States',region:'Vermilion Parish, Louisiana'},
 guiana:{name:'Guiana Space Centre',country:'France',region:'Kourou, French Guiana'},
 wenchang:{name:'Wenchang Space Launch Site',country:'China',region:'Hainan'}
};
const complexReferences={
 'cape-lc16':{name:'Launch Complex 16',rangeId:'cape-canaveral',siteIds:['cape-lc16']},
 'cape-lc36':{name:'Launch Complex 36',rangeId:'cape-canaveral',siteIds:['cape-lc36a','cape-lc36b'],sharing:'36A and 36B are separate launch positions. Selected processing services may be shared.'},
 'starbase-orbital':{name:'Starbase orbital launch site',rangeId:'starbase',siteIds:['starbase-pad2']},
 'ksc-lc39a':{name:'Launch Complex 39A',rangeId:'kennedy',siteIds:['ksc-lc39a','ksc-starship'],sharing:'Falcon and Starship use distinct launch mounts within the same complex. Pad services are not interchangeable.'},
 'cape-slc37':{name:'Space Launch Complex 37',rangeId:'cape-canaveral',siteIds:['cape-slc37']},
 'louisiana-campus-study':{name:'Pecan Island campus · unassigned complex',rangeId:'starbase-louisiana',siteIds:['louisiana-study'],sharing:'The announced campus contains multiple future pad pairs. This record does not assign a particular pair.'},
 'vandenberg-slc6':{name:'Space Launch Complex 6',rangeId:'vandenberg',siteIds:['vandenberg-slc6']},
 'cape-slc41':{name:'Space Launch Complex 41',rangeId:'cape-canaveral',siteIds:['cape-slc41'],sharing:'Vulcan and Atlas V share the complex through vehicle-specific platforms and services. Only Vulcan is in this fleet.'},
 'vandenberg-slc3':{name:'Space Launch Complex 3',rangeId:'vandenberg',siteIds:['vandenberg-slc3e']},
 'kourou-ela4':{name:'Ariane Launch Complex 4',rangeId:'guiana',siteIds:['kourou-ela4']},
 'wenchang-national':{name:'Wenchang national launch complex',rangeId:'wenchang',siteIds:['wenchang-lc101']},
 'wenchang-heavy-study':{name:'Future heavy-lift complex · unassigned',rangeId:'wenchang',siteIds:['wenchang-study']}
};
export const launchComplexes=freeze(Object.fromEntries(Object.entries(complexReferences).map(([id,c])=>[id,{schema:'odc-launch-complex/1',id,...c,reviewed:launchSiteReviewed}])));
export const launchRanges=freeze(Object.fromEntries(Object.entries(rangeReferences).map(([id,r])=>[id,{schema:'odc-launch-range/1',id,...r,complexIds:Object.values(launchComplexes).filter(c=>c.rangeId===id).map(c=>c.id),reviewed:launchSiteReviewed}])));
const siteEntities=Object.fromEntries(Object.entries(siteReferences).map(([id,base])=>{
 const complex=Object.values(launchComplexes).find(c=>c.siteIds.includes(id));
 const infrastructure=launchSiteInfrastructure[id],sourceIds=[...new Set(Object.values(infrastructure).flatMap(f=>f.sourceIds))];
 const named=sourceIds.map(key=>launchInfrastructureSources[key]),sources=[...named];
 for(const ref of base.sources)if(!sources.some(s=>s.url===ref.url))sources.push(ref);
 const compatibleVehicles=Object.entries(assignments).filter(([,ids])=>ids.includes(id)).map(([vehicle])=>vehicle);
 const kind=['louisiana-study','wenchang-study'].includes(id)?'study-area':'launch-position';
 return [id,{...base,schema:'odc-launch-site/1',kind,rangeId:complex.rangeId,complexId:complex.id,compatibleVehicles,reviewed:launchSiteReviewed,infrastructure,sources,
  geometryBasis:'Schematic spatial arrangement. Map coordinates identify an approximate launch complex or study area; offsets, pipe routes and service clearances are not surveyed geometry.',
  acceptanceStatus:'open',
  openItems:['Provider-confirmed site and payload-interface allocation','Service continuity, disconnect clearance and launch-readiness evidence','Site-approved lightning, hazardous-services and water-system verification'],
  portableGSEPolicy:'Traveling spacecraft GSE may move between approved facilities; launch structures, protected zones, commodity farms and umbilical mechanisms remain site-specific.'
 }];
}));
export const launchSites=freeze(siteEntities);
export const launchSiteSources=freeze(Object.fromEntries(Object.values(launchSites).flatMap(s=>s.sources).map(s=>[s.id,s])));
export function launchSiteById(id){return Object.hasOwn(launchSites,id)?launchSites[id]:null;}
export function launchComplexFor(siteId){const s=launchSiteById(siteId);return s?launchComplexes[s.complexId]:null;}
export function launchRangeFor(siteId){const s=launchSiteById(siteId);return s?launchRanges[s.rangeId]:null;}
export function isLaunchSiteCompatible(launcherId,siteId){return !!launchSiteById(siteId)?.compatibleVehicles.includes(launcherId);}
export function launchSitesFor(launcherId){return Object.hasOwn(assignments,launcherId)?assignments[launcherId].map(id=>launchSites[id]):[];}
export function launchSiteFor(launcherId,siteId){const options=launchSitesFor(launcherId);return options.find(s=>s.id===siteId)??options[0]??null;}
const profile=(core,booster,upper)=>Object.freeze({core,booster,upper});
const allMethane=profile('methalox',null,'methalox'),glenn=profile('methalox',null,'hydrolox');
const propellants={
 terran:allMethane,terranX:allMethane,starship:allMethane,glenn,glenn9:glenn,
 falconHeavy:profile('kerolox','kerolox','kerolox'),vulcan6:profile('methalox','solid','hydrolox'),
 ariane64:profile('hydrolox','solid','hydrolox'),longMarch5B:profile('hydrolox','kerolox',null),
 longMarch9:profile('unknown',null,'unknown')
};
export function launchPropulsionFor(id){return Object.hasOwn(propellants,id)?propellants[id]:null;}

// For unflown combinations the link describes a design or construction record.
const carrierReferences={
 terran:source('Relativity · Terran R manufacturing and pad imagery','https://www.relativityspace.com/press-release/2026/9/10/august-2026-company-update'),
 glenn:source('Blue Origin · NG-1 mission at LC-36','https://www.blueorigin.com/missions/ng-1'),
 glenn9:blueMap,
 starship:source('SpaceX · first V3 launch from Pad 2','https://www.spacex.com/launches/starship-flight-12'),
 falconHeavy:source('SpaceX · NROL-97 liftoff and both side-booster landings','https://www.spacex.com/launches/nrol97/'),
 vulcan6:source('ULA · six-booster Vulcan Leo 1 mission and site illustrations','https://www.ulalaunch.com/missions/next-launch/vulcan-leo-1'),
 ariane64:source('ESA video · first four-booster Ariane 6 liftoff','https://www.esa.int/esatv/Videos/2026/02/Liftoff_power_launch_of_first_Ariane_6_with_four_boosters'),
 longMarch5B:source('China Manned Space · Mengtian launch from Wenchang','https://en.cmse.gov.cn/missions/mengtian/'),
 longMarch9:source('CALT briefing · two-stage launch-vehicle concept','https://english.www.gov.cn/news/topnews/202301/19/content_WS63c8b4ccc6d0a757729e5d88.html')
};
export function launchReferenceFor(id){const key=id==='terranX'?'terran':id;return Object.hasOwn(carrierReferences,key)?carrierReferences[key]:null;}
