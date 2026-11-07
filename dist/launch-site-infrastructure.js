// Public launch-site reference configurations. A documented system is not a
// site acceptance record. Geometry remains schematic unless a dimension below
// is explicitly supported; an unknown feature is not evidence of its absence.
export const launchSiteReviewed='2026-11-06';
const ref=(id,title,url,section)=>({id,title,url,section,reviewed:launchSiteReviewed});
export const launchInfrastructureSources={
 'terran-feb-2026':ref('terran-feb-2026','Relativity · February 2026 construction update','https://www.relativityspace.com/press-release/2026/3/8/february-2026-company-update','Launch: strongback, launch mount and lightning protection foundations'),
 'terran-may-2026':ref('terran-may-2026','Relativity · May 2026 construction update','https://www.relativityspace.com/press-release/2026/6/4/may-2026-company-updatenbspnbsp','Launch: 93 m water tower and strongback fluid brackets'),
 'terran-jun-2026':ref('terran-jun-2026','Relativity · June 2026 construction update','https://relativityspace.squarespace.com/press-release/2026/7/10/june-2026-company-update','Launch: two lightning protection systems, water farm and LOX tanks'),
 'terran-aug-2026':ref('terran-aug-2026','Relativity · August 2026 construction update','https://www.relativityspace.com/press-release/2026/9/10/august-2026-company-update','Launch: flame diverter, LNG farm and transporter-erector'),
 'terran-sep-2026':ref('terran-sep-2026','Relativity · September 2026 construction update','https://relativityspace.squarespace.com/press-release/2026/10/6/september-2026-company-update','Launch: 161.5 m east lightning tower and permanent pad power'),
 'blue-rebuild-2026':ref('blue-rebuild-2026','Blue Origin · New Glenn return to flight','https://www.blueorigin.com/news/new-glenn-return-to-flight','30 June 2026: surviving services, lost lightning tower and revised pad CONOPS'),
 'blue-pads-2026':ref('blue-pads-2026','Blue Origin · LC-36A and LC-36B assignments','https://www.blueorigin.com/news/returning-launch-complex-36-to-two-pads','12 August 2026: 7×2 at 36A, 9×4 at 36B and shared processing facilities'),
 'faa-lc36-lightning':ref('faa-lc36-lightning','FAA · proposed LC-36/11 lightning tower','https://oeaaa.faa.gov/oeaaa/services/case/2026-ASO-15270-OE','Public obstruction case 2026-ASO-15270-OE: 715 ft AGL, 28.476383°, −80.537890°; determination completed 27 October 2026, not operational acceptance'),
 'faa-lc36b-tower':ref('faa-lc36b-tower','FAA · proposed SLC-36B/11 umbilical tower','https://oeaaa.faa.gov/oeaaa/services/case/2026-ASO-15272-OE','Public obstruction case 2026-ASO-15272-OE: explicitly named SLC-36B/11, 28.47638333°, −80.53815833°; establishes adjacent infrastructure location'),
 'blue-guide-2018':ref('blue-guide-2018','Blue Origin · New Glenn Payload User’s Guide, Rev C','https://yellowdragonblog.com/wp-content/uploads/2019/01/new_glenn_payload_users_guide_rev_c.pdf','Provider-authored 2018 guide, §8.4.2 and Table 8-1; historical ground-system reference'),
 'blue-services':ref('blue-services','ArchKey · LC-36 construction scope','https://www.archkey.com/project/blue-origin-launch-pad/','Construction contractor: ECS, water tower, gas farms, lightning and electrical systems'),
 'spacex-v3-pad':ref('spacex-v3-pad','SpaceX · Starbase Launch Pad 2 changes','https://www.spacex.com/updates?s=04','Introducing Starship V3: propellant farm, catch arms, ship QD, bidirectional diverter and top-deck deflector'),
 'spacex-flight12':ref('spacex-flight12','SpaceX · first V3 flight from Pad 2','https://www.spacex.com/launches/starship-flight-12/','22 May 2026 mission report: first V3 launch and first use of Pad 2'),
 'faa-starbase':ref('faa-starbase','FAA · Starbase environmental documents','https://www.faa.gov/space/stakeholder_engagement/spacex_starship','Boca Chica launch-site project; proposal and operating scope'),
 'faa-ksc-starship':ref('faa-ksc-starship','FAA · LC-39A Starship Final EIS, Volume I','https://www.faa.gov/space/stakeholder_engagement/spacex_starship_ksc/SpaceX-SSH-LC-39A-Final-EIS-Volume-I.pdf','January 2026, §§2.1.3.2 and 2.1.4: notional diverter, stored-water deluge and propellant services'),
 'faa-ksc-status':ref('faa-ksc-status','FAA · LC-39A Starship project and decision','https://www.faa.gov/space/stakeholder_engagement/spacex_starship_ksc','Environmental decision and launch-license context; dedicated Starship installation'),
 'daf-slc37-eis':ref('daf-slc37-eis','Department of the Air Force · SLC-37 Starship Final EIS','https://spaceforcestarshipeis.com/wp-content/uploads/2025/11/SpaceX_Starship-SuperHeavy_CCSFS_Final_EIS_508.pdf','2025, Chapter 2 and §3.3.2.1.2.2: redevelopment, commodities, deluge and retained water'),
 'faa-slc37-status':ref('faa-slc37-status','FAA · SLC-37 supplemental review','https://www.faa.gov/space/stakeholder_engagement/spacex_starship_ccsfs','October 2026 project status; construction authority and pending operational license review'),
 'louisiana-campus':ref('louisiana-campus','Louisiana Economic Development · proposed Starbase Louisiana','https://www.opportunitylouisiana.gov/news/spacex-launches-new-era-of-commercial-spaceflight-with-100-billion-louisiana-campus','25 August 2026: proposed campus, five complexes with paired pads and propellant farms'),
 'falcon-guide-2025':ref('falcon-guide-2025','SpaceX · Falcon User’s Guide','https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf','May 2025, §5.3.7.4 lightning protection and §10 launch operations'),
 'nasa-falcon-pad':ref('nasa-falcon-pad','NASA · Falcon Heavy at LC-39A','https://svs.gsfc.nasa.gov/31395/','Psyche on Launch Pad and Psyche Launches: NASA imagery of fixed tower, mast and water tower'),
 'nasa-falcon-duct':ref('nasa-falcon-duct','NASA Engineering and Safety Center · LC-39A flame duct','https://www.nasa.gov/wp-content/uploads/2023/05/techup-2023-web-110923v2-singles.pdf','2023 Technical Update: water-injected, roofed flame duct at LC-39A'),
 'daf-slc6-eis':ref('daf-slc6-eis','Department of the Air Force · Falcon at Vandenberg Final EIS','https://www.vsfbfalconlauncheis.com/Portals/falconprogrameis/PublicDocuments/FEIS%20Documents/VSFBFalcon100LaunchFinalEIS20251014.pdf','October 2025, §2.1.7, pp.2-11–2-12: commodities, 200 ft tower and unidirectional water-cooled diverter'),
 'ussf-slc6-rebuild':ref('ussf-slc6-rebuild','U.S. Space Force · SLC-6 modernization','https://www.vandenberg.spaceforce.mil/News/Article-Display/Article/4519296/vandenberg-space-force-base-modernizes-historic-space-launch-complex-6-for-next/','June 2026: removal of legacy Delta IV service structures for Falcon redevelopment'),
 'ula-vulcan-guide':ref('ula-vulcan-guide','ULA · Vulcan Launch Systems User’s Guide','https://www.ulalaunch.com/docs/default-source/rockets/2023_vulcan_user_guide.pdf','October 2023, §§5.1–5.3: launch platform, fixed/mobile towers, environmental control and countdown'),
 'ula-vulcan-upgrades':ref('ula-vulcan-upgrades','ULA · Vulcan infrastructure modifications','https://blog.ulalaunch.com/blog/vulcan-infrastructure-modifications','June 2026: SLC-41 LNG and expanded cryogenic/acoustic systems; SLC-3 conversion'),
 'daf-vulcan-east':ref('daf-vulcan-east','U.S. Air Force · Vulcan operations at SLC-41 assessment','https://www.nasa.gov/wp-content/uploads/2024/01/final-vulcan-ea-and-fonsi-2019.pdf','2019, Chapter 2: LNG/LOX/LH2 systems and nitrogen-driven acoustic suppression tanks'),
 'nasa-slc41-lightning':ref('nasa-slc41-lightning','NASA · SLC-41 four-tower protection layout','https://www.nasa.gov/wp-content/uploads/2015/05/ksc_spm_mar2015.pdf','Spaceport Magazine, March 2015, Integrated Effort: four existing lightning towers'),
 'ussf-catenary':ref('ussf-catenary','U.S. Space Force · catenary lightning protection','https://www.dvidshub.net/news/447792/guardians-sky-overcoming-lightnings-fury-mission-success','45th Weather Squadron, 24 June 2023: protective wires, support towers and launch-weather monitoring'),
 'ula-vulcan-west':ref('ula-vulcan-west','ULA · West Coast Vulcan construction','https://blog.ulalaunch.com/blog/west-coast-vulcan-construction-update','3 December 2024: fixed launch platform, MST, umbilical tower, ECS and new cryogenic systems'),
 'ussf-vulcan-west':ref('ussf-vulcan-west','U.S. Space Force · SLC-3E supplemental assessment','https://www.vandenberg.spaceforce.mil/Portals/18/EIAP-2022-12-1_SEA_ULA_Vulcan.pdf','Vulcan conversion: deluge/sound suppression and contained wastewater; supply layout requires confirmation'),
 'esa-ela4-pad':ref('esa-ela4-pad','ESA · Ariane 6 launch-pad infographic','https://www.esa.int/ESA_Multimedia/Images/2024/08/Ariane_6_infographic_launch_pad','Launch table, mast services, twin trenches, four lightning towers and mobile gantry'),
 'esa-ela4-zone':ref('esa-ela4-zone','ESA · Ariane 6 launch zone','https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/Ariane_6_the_launch_zone','92 m water tower, T−6 s tunnel deluge and underground utility distribution'),
 'cnes-ela4':ref('cnes-ela4','CNES · launch installations at the Guiana Space Centre','https://centrespatialguyanais.cnes.fr/en/installations-lancement','Ariane 6 launch zone: 66 m mast, four lightning masts, launch gantry and water recovery'),
 'cnsa-wenchang-lightning':ref('cnsa-wenchang-lightning','CNSA · Wenchang protection and vertical transfer','https://www.cnsa.gov.cn/n6758968/n6758975/c6772608/content.html','1 July 2016: four lightning towers with overhead wires at each launch position'),
 'cnsa-wenchang-services':ref('cnsa-wenchang-services','CNSA · Wenchang assembly and propellant facilities','https://www.cnsa.gov.cn/n6758968/n6758975/c6772612/content.html','23 June 2016: dedicated CZ-5 launch position, rail transfer and separate LOX/LH2/kerosene filling stations'),
 'cast-wenchang':ref('cast-wenchang','CAST · Wenchang launch-site construction','https://www.cast.cn/news/4564','16 June 2016: two launch positions, four lightning towers per position and mobile-platform services'),
 'bit-cz5-trench':ref('bit-cz5-trench','Beijing Institute of Technology · Long March 5 exhaust-channel design','https://www.bit.edu.cn/xww/mtlg/a130473.htm','Design-team report, 10 November 2016: bilateral exhaust routing and direct water injection into exhaust'),
 'wenchang-future':ref('wenchang-future','State Council Information Office · Wenchang heavy-launch planning','https://english.scio.gov.cn/chinavoices/2020-11/26/content_76950300.htm','2020 site-planning statement: future Long March 9 installation, without an assigned mount'),
 'calt-cz9-study':ref('calt-cz9-study','CALT designer briefing · Long March 9 study','https://english.www.gov.cn/news/topnews/202301/19/content_WS63c8b4ccc6d0a757729e5d88.html','January 2023: dated two-stage LEO design case; no released pad interface')
};

const visual=(kind,render=kind!=='unknown',extra={})=>({kind,render,schematic:true,...extra});
const feature=(kind,label,status,basis,sourceIds,extra={})=>({kind,label,status,basis,sourceIds,...extra});
const support=(kind,label,status,basis,sourceIds)=>feature(kind,label,status,basis,sourceIds,{visual:visual(kind)});
const lightning=(kind,label,status,basis,sourceIds,count=null,mastCount=null,extra={})=>feature(kind,label,status,basis,sourceIds,{count,mastCount,heightM:null,visual:visual(kind),...extra});
const water=(kind,label,status,basis,sourceIds,towerCount=null,heightM=null,extra={})=>feature(kind,label,status,basis,sourceIds,{towerCount,heightM,sequence:null,visual:visual(kind==='tower-fed'?'water-tower':kind==='tank-fed'?'ground-tanks':kind==='unknown'?'unknown':'pipework'),...extra});
const exhaust=(kind,label,status,basis,sourceIds,outlets=null)=>feature(kind,label,status,basis,sourceIds,{outlets,visual:visual(kind)});
const fluids={lox:{id:'lox',label:'Liquid oxygen',state:'cryogenic'},lng:{id:'lng',label:'Liquid methane / LNG',state:'cryogenic'},lh2:{id:'lh2',label:'Liquid hydrogen',state:'cryogenic'},rp1:{id:'rp1',label:'RP-1 kerosene',state:'liquid'},kerosene:{id:'kerosene',label:'Kerosene',state:'liquid'},n2:{id:'n2',label:'Nitrogen service',state:'gas'},he:{id:'he',label:'Helium service',state:'gas'}};
const commodities=(ids,status,basis,sourceIds)=>feature(ids.length?'tank-farm':'unknown',ids.length?'Ground commodity services':'Commodity services unresolved',status,basis,sourceIds,{species:ids.map(id=>({...fluids[id]})),visual:visual(ids.length?'service-farm':'unknown'),inventoryBasis:'Symbols identify service commodities. Vessel count, capacity and separation distances are not a surveyed tank-farm design.'});

export const launchSiteInfrastructure={
 'cape-lc16':{
  support:support('strongback','Transporter-erector and launch mount','documented','Terran R uses a horizontal integration route, an erector strongback and a dedicated launch mount under construction.',['terran-feb-2026','terran-aug-2026']),
  lightning:lightning('free-standing','Two lightning protection systems','documented','Relativity identifies two systems. The east tower reached 161.5 m; the west tower height and final cable routing remain unconfirmed.',['terran-jun-2026','terran-sep-2026'],2,0,{masts:[{id:'east',label:'East lightning mast',heightM:161.5},{id:'west',label:'West lightning mast',heightM:null}],visual:visual('free-standing',true,{layout:'pair',heightRatio:1.86})}),
  water:water('tower-fed','93 m water tower and water farm','documented','The completed-height tower supplies the pad water system; ground storage tanks are also installed. Activation and acceptance remain launch-provider work.',['terran-may-2026','terran-jun-2026'],1,93),
  exhaust:exhaust('diverter','Flame diverter','documented','Relativity reports installation of the diverter. The displayed single outlet is a study layout, not released civil geometry.',['terran-aug-2026'],null),
  commodities:commodities(['lox','lng'],'documented','Separate LOX and LNG farms support the methane–oxygen vehicle; only commodity identity is represented.',['terran-jun-2026','terran-aug-2026'])
 },
 'cape-lc36a':{
  support:support('umbilical','Hybrid integration and tower umbilicals','documented','Blue Origin is rebuilding 36A around a horizontal/vertical hybrid route, replacing the former transporter-erector concept. Final service geometry remains provider-controlled.',['blue-rebuild-2026','blue-pads-2026']),
  lightning:lightning('unknown','Replacement lightning system unresolved','unknown','The original lightning tower was lost in May 2026. The reviewed rebuild statement does not establish the replacement arrangement.',['blue-rebuild-2026']),
  water:water('tower-fed','Pad water tower and cooled deflector','documented','Blue Origin confirms the water tower survived. The provider guide describes water-cooled exhaust works; the rebuilt configuration needs final confirmation.',['blue-rebuild-2026','blue-guide-2018'],1,null),
  exhaust:exhaust('duct-trench','Water-cooled deflector and exhaust duct','documented','The provider’s published LC-36 reference uses a cooled deflector and exhaust duct. Rebuild dimensions are not released.',['blue-guide-2018','blue-rebuild-2026'],1),
  commodities:commodities(['lox','lng','lh2'],'documented','The surviving farm supports methane–oxygen first-stage and hydrogen–oxygen upper-stage services.',['blue-rebuild-2026','blue-guide-2018'])
 },
 'cape-lc36b':{
  support:support('umbilical','9×4 tower and vertical integration route','proposed','Blue Origin assigns the new 36B installation and its vertical integration facility to New Glenn 9×4. This is a development configuration.',['blue-pads-2026']),
  lightning:lightning('planned-tower','Filed 217.9 m lightning tower · allocation inferred','proposed','FAA records a 715 ft (217.9 m) LC-36/11 lightning tower beside a separately named SLC-36B/11 umbilical tower. The 36B association is inferred from those adjacent locations and the provider’s new-pad announcement. Protection coverage, structural connection and construction status are unconfirmed.',['faa-lc36-lightning','faa-lc36b-tower','blue-pads-2026'],1,null,{heightM:217.9,allocationStatus:'inferred',visual:visual('free-standing',true,{layout:'single',basis:'Schematic position of the filed tower; its final structural connection to the launch tower is unresolved.'})}),
  water:water('deluge','Water suppression study','study','The drawing uses an LC-36-family water-supply concept. A 36B-specific supply layout, tower count and capacity have not been established by the reviewed reference.',['blue-pads-2026','blue-guide-2018'],null,null),
  exhaust:exhaust('duct-trench','LC-36-family exhaust study','study','A ducted deflector is a family-level visual assumption. The provider’s 36B construction announcement does not release the final exhaust layout.',['blue-pads-2026','blue-guide-2018'],null),
  commodities:commodities(['lox','lng','lh2'],'study','The 9×4 vehicle requires methane, hydrogen and oxygen services. Their pad allocation and storage topology remain an integration study.',['blue-pads-2026','blue-guide-2018'])
 },
 'starbase-pad2':{
  support:support('catch','Catch tower, ship QD and redesigned mount','documented','Pad 2 has shorter electromechanical catch arms, a revised rotating ship QD arm, and redesigned hold-down hardware for V3.',['spacex-v3-pad','spacex-flight12']),
  lightning:lightning('unknown','Lightning topology not established','unknown','The reviewed Pad 2 provider update does not specify the lightning protection layout. No independent masts are inferred from Florida installations.',['spacex-v3-pad','faa-starbase']),
  water:water('deluge','Cooled top deck and flame diverter','documented','The revised mount uses water-cooled exhaust protection. This model shows the cooling manifold; storage size and operating flow are not simulated.',['spacex-v3-pad'],null,null),
  exhaust:exhaust('split-trench','Bidirectional diverter and top-deck protection','documented','The V3 update identifies a bidirectional diverter beneath the mount and a separate top-deck deflector.',['spacex-v3-pad'],2),
  commodities:commodities(['lox','lng'],'documented','The upgraded propellant farm adds storage and pumping for the methane–oxygen stack. Its exact inventory and valve routing are outside this study.',['spacex-v3-pad'])
 },
 'ksc-starship':{
  support:support('catch','Dedicated Starship launch-and-catch tower','proposed','The reviewed LC-39A proposal places a dedicated Starship installation beside the separately retained Falcon pad.',['faa-ksc-starship','faa-ksc-status']),
  lightning:lightning('unknown','Starship protection layout unresolved','unknown','Falcon’s overhead-wire protection is not automatically a protection system for the separate, taller Starship installation. Its topology requires provider confirmation.',['faa-ksc-starship','falcon-guide-2025']),
  water:water('tank-fed','Stored-water deluge and retention ponds','proposed','The EIS describes stored water, pressure/pump distribution and collection for possible reuse. Detailed layout and operating parameters remain preliminary.',['faa-ksc-starship'],0,null),
  exhaust:exhaust('split-trench','Notional bifurcated diverter','proposed','The reviewed design divides the plume between opposite openings beneath the mount. The EIS explicitly describes this as a notional design.',['faa-ksc-starship'],2),
  commodities:commodities(['lox','lng','n2','he'],'proposed','The proposal includes methane and oxygen supply, inert services and potential onsite propellant production. The illustration represents services, not a construction plot.',['faa-ksc-starship'])
 },
 'cape-slc37':{
  support:support('catch','Starship launch-and-catch installation','proposed','SLC-37 redevelopment is authorized for construction, while launch operations remain subject to the supplemental review and licensing process.',['faa-slc37-status','daf-slc37-eis']),
  lightning:lightning('unknown','Starship lightning design unresolved','unknown','No new Starship lightning-system geometry is established here. The former Delta IV arrangement is not carried into the Starship design.',['daf-slc37-eis','faa-slc37-status']),
  water:water('tank-fed','Deluge storage and water-recovery ponds','proposed','The assessed project includes deluge for launch, landing and static firing, with retained water available for reuse. Final supply topology is open.',['daf-slc37-eis'],null,null),
  exhaust:exhaust('split-trench','Diverter layout under design','study','The proposal allows engineered exhaust diversion. The two-outlet illustration is a study assumption, not a final SLC-37 civil design.',['daf-slc37-eis'],null),
  commodities:commodities(['lox','lng','n2'],'proposed','The assessed project includes onsite methane liquefaction and air separation with stored launch commodities. Services remain specific to the new Starship facility.',['daf-slc37-eis'])
 },
 'louisiana-study':{
  support:support('catch','Unassigned Starship pad concept','study','The announced campus has paired pads within multiple complexes. This scene represents one unassigned study pad, not a surveyed installation.',['louisiana-campus']),
  lightning:lightning('unknown','Lightning design not released','unknown','The campus announcement does not establish mast count, cable topology or protected zones.',['louisiana-campus']),
  water:water('tank-fed','Launch-water concept','study','Stored-water suppression is a Starship-family study allowance. Louisiana-specific supply, recovery and discharge arrangements are not released.',['louisiana-campus','spacex-v3-pad'],null,null),
  exhaust:exhaust('split-trench','Exhaust-routing concept','study','The divided exhaust path is a Starbase-derived illustration. The Louisiana announcement does not fix individual pad geometry.',['louisiana-campus','spacex-v3-pad'],null),
  commodities:commodities(['lox','lng'],'study','The campus announcement includes propellant farms and production. Oxygen/methane service identities follow the selected Starship vehicle.',['louisiana-campus','spacex-v3-pad'])
 },
 'ksc-lc39a':{
  support:support('fixed-service','Falcon transporter-erector and fixed tower','documented','The transporter-erector supports the three-core launch vehicle. The adjacent fixed structure remains a separate pad asset.',['falcon-guide-2025','nasa-falcon-pad']),
  lightning:lightning('tower-mast','Fixed-tower mast and overhead wires','documented','SpaceX specifies overhead-wire protection at LC-39A. NASA imagery locates the mast on the fixed service structure; no coverage calculation is implied.',['falcon-guide-2025','nasa-falcon-pad'],0,1),
  water:water('tower-fed','Water tower and duct-injection system','documented','The site’s tower supplies launch-water services. NASA describes water injection within the covered flame duct; operational flow remains provider-controlled.',['nasa-falcon-pad','nasa-falcon-duct'],1,null),
  exhaust:exhaust('duct-trench','Covered flame duct','documented','NASA’s engineering description identifies a roofed exhaust duct with water injection at the Falcon installation.',['nasa-falcon-duct'],1),
  commodities:commodities(['lox','rp1','n2','he'],'documented','Falcon uses separate oxygen, RP-1 and inert-gas services. Symbols show service identity rather than the site’s vessel count.',['falcon-guide-2025'])
 },
 'vandenberg-slc6':{
  support:support('strongback','Falcon erector and rail-transfer route','proposed','The approved redevelopment replaces Delta IV service structures with Falcon integration and erection equipment. The former towers were demolished in June 2026.',['daf-slc6-eis','ussf-slc6-rebuild']),
  lightning:lightning('unknown','New Falcon lightning layout unresolved','unknown','The reviewed redevelopment EIS does not specify a lightning-mast arrangement. East-coast Falcon protection is not assumed to be installed here.',['daf-slc6-eis']),
  water:water('tower-fed','Planned 200 ft water tower and storage','proposed','The EIS specifies a 200 ft tower near the former tower site, supported by an existing uphill storage tank and local pad distribution.',['daf-slc6-eis'],1,60.96),
  exhaust:exhaust('trench','Unidirectional water-cooled diverter','proposed','The existing trench is retained and converted to one-direction exhaust diversion with deluge/acoustic suppression.',['daf-slc6-eis'],1),
  commodities:commodities(['lox','rp1','n2','he'],'proposed','The redevelopment identifies separate LOX, RP-1, nitrogen and helium storage; final new-versus-reused vessel allocation remains open.',['daf-slc6-eis'])
 },
 'cape-slc41':{
  support:support('umbilical','Mobile Vulcan launch platform and mast','documented','Vulcan rolls from its integration facility with its platform and service mast. The pad also supports Atlas V through separate vehicle provisions.',['ula-vulcan-guide','ula-vulcan-upgrades']),
  lightning:lightning('catenary','Four lightning towers and protective wires','documented','Four perimeter towers support the protective wire system. Spacing and cable heights in the scene are schematic.',['nasa-slc41-lightning','ussf-catenary'],4,0,{visual:visual('catenary',true,{layout:'rectangle',heightRatio:1.65})}),
  water:water('tank-fed','Acoustic suppression tanks and manifolds','documented','The assessed Vulcan upgrade uses ground water vessels, nitrogen activation and duct/manifold distribution, supported by the range water supply.',['daf-vulcan-east','ula-vulcan-upgrades'],0,null),
  exhaust:exhaust('trench','Flame duct and cooled exhaust outlet','documented','The pad’s exhaust works and acoustic manifolds support the Vulcan core and the selected solid-booster configuration.',['daf-vulcan-east'],1),
  commodities:commodities(['lox','lng','lh2','n2'],'documented','Dedicated LNG, oxygen and hydrogen systems serve Vulcan and Centaur; nitrogen also supports ground pneumatic and acoustic-water functions.',['daf-vulcan-east','ula-vulcan-upgrades'])
 },
 'vandenberg-slc3e':{
  support:support('mobile-gantry','Fixed platform, umbilical tower and mobile gantry','documented','ULA’s conversion replaces the launch platform and upgrades the umbilical tower, mobile service tower and environmental-control system.',['ula-vulcan-west','ula-vulcan-upgrades']),
  lightning:lightning('unknown','Pad lightning topology unresolved','unknown','The reviewed conversion references do not establish a mast-and-wire layout. Range lightning monitoring is not equivalent to a pad protection design.',['ula-vulcan-west','ussf-vulcan-west']),
  water:water('deluge','Deluge with a contained retention basin','documented','The supplemental assessment covers launch deluge and sound suppression with collection in the existing basin. Supply geometry is left open.',['ussf-vulcan-west'],null,null),
  exhaust:exhaust('trench','Retained launch exhaust works','documented','The conversion uses the existing launch position and collection works. The single outlet drawn here is a schematic layout.',['ussf-vulcan-west','ula-vulcan-west'],null),
  commodities:commodities(['lox','lng','lh2'],'documented','The conversion explicitly adds new oxygen, hydrogen and LNG systems. Storage shapes and offsets are illustrative.',['ula-vulcan-west','ula-vulcan-upgrades'])
 },
 'kourou-ela4':{
  support:support('mobile-gantry','Fixed mast and rail-mounted assembly gantry','documented','The gantry encloses the stack during preparation and withdraws for launch. The fixed mast supplies upper-stage and payload services.',['esa-ela4-pad','cnes-ela4']),
  lightning:lightning('free-standing','Four perimeter lightning towers','documented','ESA and CNES identify four towers surrounding the launch position. Their depicted spacing is illustrative.',['esa-ela4-pad','cnes-ela4'],4,0,{visual:visual('free-standing',true,{layout:'rectangle',heightRatio:1.65})}),
  water:water('tower-fed','92 m water tower and recovered deluge','documented','Water feeds the deflectors and exhaust tunnels; runoff is collected for treatment and reuse.',['esa-ela4-zone','esa-ela4-pad'],1,92,{sequence:{startMet:-6,basis:'ESA describes exhaust-tunnel deluge beginning six seconds before liftoff.',sourceIds:['esa-ela4-zone']}}),
  exhaust:exhaust('split-trench','Two concrete flame trenches','documented','Twin trenches turn the engine and booster exhaust away from the launch table.',['esa-ela4-pad','esa-ela4-zone'],2),
  commodities:commodities(['lox','lh2'],'documented','Separate oxygen and hydrogen services supply the core and upper stage. Solid boosters are not loaded from a ground fuel umbilical.',['esa-ela4-pad','esa-ela4-zone'])
 },
 'wenchang-lc101':{
  support:support('swing-arms','Fixed access tower and mobile launch platform','documented','The dedicated Long March 5 position receives the vertically transported stack. Access platforms and umbilical swing rods serve the vehicle.',['cnsa-wenchang-services','cast-wenchang']),
  lightning:lightning('catenary','Four lightning towers and overhead wires','documented','CNSA describes four towers with suspended wires at each Wenchang launch position. Exact height is not adopted from conflicting public dimensions.',['cnsa-wenchang-lightning','cast-wenchang'],4,0,{visual:visual('catenary',true,{layout:'rectangle',heightRatio:2.0})}),
  water:water('deluge','Water injection into the exhaust flow','documented','The design team describes direct water injection to reduce exhaust effects. The model shows delivery pipework; supply-tank geometry is unconfirmed.',['bit-cz5-trench'],null,null),
  exhaust:exhaust('split-trench','Bilateral exhaust channels','documented','The Long March 5 design team describes routing hot gas to both sides of the launch position.',['bit-cz5-trench'],2),
  commodities:commodities(['lox','lh2','kerosene'],'documented','The national launch site has separate oxygen, hydrogen and kerosene filling stations, matching the 5B core and liquid boosters.',['cnsa-wenchang-services'])
 },
 'wenchang-study':{
  support:support('concept','Unassigned heavy-lift installation','study','The dated Long March 9 mission case has no assigned customer pad or released ground interface. A simple support envelope preserves the concept study.',['wenchang-future','calt-cz9-study']),
  lightning:lightning('unknown','Protection design not released','unknown','The future-site planning reference does not establish lightning hardware for this Long March 9 configuration.',['wenchang-future']),
  water:water('unknown','Launch-water architecture unresolved','unknown','No pad-specific supply, suppression system or operating sequence has been established for this dated vehicle study.',['wenchang-future','calt-cz9-study']),
  exhaust:exhaust('concept','Exhaust architecture unresolved','study','The neutral support envelope is illustrative. Outlet count and flame-management geometry remain undefined.',['wenchang-future','calt-cz9-study'],null),
  commodities:commodities([],'unknown','Propellant services depend on a released vehicle and pad configuration; the study does not assign a tank farm.',['calt-cz9-study'])
 }
};

// Renderer hints never become surveyed physical facts. In particular, a study
// outlet count is separate from the public-record outlet count above.
const applications={
 'cape-lc16':'deflector','cape-lc36a':'deflector','cape-lc36b':'study',
 'starbase-pad2':'deck-deflector','ksc-starship':'deck-deflector','cape-slc37':'study',
 'louisiana-study':'study','ksc-lc39a':'duct-injection','vandenberg-slc6':'deflector',
 'cape-slc41':'duct-injection','vandenberg-slc3e':'pad-deluge','kourou-ela4':'tunnel-deluge',
 'wenchang-lc101':'exhaust-injection','wenchang-study':'unknown'
};
for(const [id,record] of Object.entries(launchSiteInfrastructure)){
 record.lightning.visual.catenary=['catenary','tower-mast'].includes(record.lightning.kind);
 record.water.visual.application=applications[id];
 record.exhaust.visual.outlets=record.exhaust.outlets??(record.exhaust.kind==='split-trench'?2:record.exhaust.kind==='concept'?0:1);
 record.exhaust.visual.basis=record.exhaust.outlets===null?'Illustrative outlet layout; no public count adopted.':'Public outlet count; dimensions and offsets schematic.';
}
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
freeze(launchInfrastructureSources);
freeze(launchSiteInfrastructure);
