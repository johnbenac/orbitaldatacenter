// Facilities and launch-side attachment planes. These data describe the carrier
// selected for this study. The spacecraft-side pattern is a separate, fixed datum.
const ref=(title,url)=>({title,url});
const sources={
 star:ref('SpaceX · Starship Users Guide, rev. 1.0 (2020), pp. 2–4','https://www.spacex.com/media/starship_users_guide_v1.pdf'),
 observed:ref('The Ringwatchers · Ship 33 dispenser and forward barrel photographs','https://ringwatchers.com/article/s33-pez'),
 flight:ref('SpaceX · Flight 13 results, July 2026','https://www.spacex.com/launches/starship-flight-13'),
 florida:ref('FAA · LC-39A environmental review, Vol. I, ES-8','https://www.faa.gov/space/stakeholder_engagement/spacex_starship_ksc/SpaceX-SSH-LC-39A-Final-EIS-Volume-I.pdf'),
 cape:ref('FAA · SLC-37 Starship proposal','https://www.faa.gov/space/stakeholder_engagement/spacex_starship_ccsfs'),
 louisiana:ref('Louisiana Economic Development · proposed Starbase Louisiana campus','https://www.opportunitylouisiana.gov/news/spacex-launches-new-era-of-commercial-spaceflight-with-100-billion-louisiana-campus'),
 falcon:ref('SpaceX · Falcon User’s Guide (2025), §4.1.5.1, §8 and Fig. A-1','https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf'),
 falconWest:ref('U.S. Space Force · SLC-6 redevelopment decision','https://www.vandenberg.spaceforce.mil/News/Article-Display/Article/4323318/notice-of-availability-of-the-final-environmental-impact-statement-and-record-o/'),
 terran:ref('Relativity · LC-16 crane and cleanroom construction, July 2026 update','https://www.relativityspace.com/press-release/2026/8/11/july-2026-company-update'),
 terranSite:ref('Relativity · Cape Canaveral payload-processing plans','https://www.relativityspace.com/locations'),
 glenn:ref('Blue Origin · New Glenn Payload User’s Guide, rev. C (2018), §5.3.1 and Fig. 5-12, archived copy','https://yellowdragonblog.com/wp-content/uploads/2019/01/new_glenn_payload_users_guide_rev_c.pdf#page=68'),
 hybrid:ref('Blue Origin · horizontal/vertical integration plan, June 2026','https://www.blueorigin.com/news/new-glenn-return-to-flight'),
 cif:ref('Blue Origin · customer integration facility and LC-36 construction, October 2026','https://www.blueorigin.com/news/building-infrastructure-for-more-frequent-launches-in-florida'),
 vulcan:ref('ULA · Vulcan User’s Guide (2023), Table 4.2.2-1a and §5.3','https://www.ulalaunch.com/docs/default-source/rockets/2023_vulcan_user_guide.pdf'),
 vulcanWest:ref('ULA · West Coast Vulcan construction','https://blog.ulalaunch.com/blog/west-coast-vulcan-construction-update'),
 ariane:ref('Arianespace · Ariane 6 User’s Manual, issue 2, §5.3.4, §5.4 and §6.2.3','https://www.arianespace.com/wp-content/uploads/2021/03/Mua-6_Issue-2_Revision-0_March-2021.pdf'),
 arianeLift:ref('ESA · MTG-I2 encapsulation and gantry lift (2026)','https://www.esa.int/ESA_Multimedia/Images/2026/08/MTG-I2_inside_Ariane_6'),
 csg:ref('CNES · Ariane 6 encapsulation and final assembly','https://centrespatialguyanais.cnes.fr/en/ariane-6'),
 wenchang:ref('China Manned Space · Mengtian payload processing at Wenchang','https://en.cmse.gov.cn/news/202211/t20221106_51260.html'),
 cz5:ref('China Manned Space · integrated Mengtian and CZ-5B transfer','https://en.cmse.gov.cn/news/202211/t20221117_51523.html'),
 cz5family:ref('CNSA · Long March 5 family vertical assembly sequence, Chang’e 6 mission','https://www.cnsa.gov.cn/english/n6465652/n6465653/c10530800/content.html'),
 cz9:ref('State Council · CALT two-stage heavy-lift design study (2023)','https://english.www.gov.cn/news/topnews/202301/19/content_WS63c8b4ccc6d0a757729e5d88.html'),
 cz9site:ref('State Council Information Office · Wenchang future pad planning','https://english.scio.gov.cn/chinavoices/2020-11/26/content_76950300.htm')
};
const item=(label,text,source)=>({label,text,source});
const pcd='Launch-side bolt-circle diameter';
const face=(name,diameterMm,bolts,status,basis,source,diameterMeaning=pcd)=>({name,diameterMm,diameterMeaning,bolts,status,basis,source});
const star={
 family:'starship',kind:'ship-bay',facility:'Starbase ship high bay · cargo study',location:'Starbase, Texas',
 handling:'A bridge crane handles a single upright spacecraft and its forward cargo assembly. The tanks, aft flaps and six engines belong to the ship below the cargo deck.',
 mating:'SpaceX’s 2020 concept moved the enclosed payload upright to the pad and lifted it onto the ship. This study brings the lift inside a high bay to show the vehicle and its load path together.',
 provenance:'Large-cargo ground sequence and support fixtures are workbench assumptions. SpaceX has published a large-payload concept and flown a different dispenser for flat satellites.',
 interface:face('Proposed cargo-deck fitting',2000,48,'study','The 2,000 mm circle and 48 positions are workbench choices for the cradle foot. SpaceX’s heritage clamp-band sizes describe payload separation hardware. The guide supplies no V3 cradle-foot bolt drawing.',sources.star),
 evidence:[
 item('Provider concept · 2020','The guide describes upright integration in a cleanroom. In orbit, a retained door opens and the payload and adapter tilt for release. It lists 937, 1,194, 1,666 and 2,624 mm clamp-band options.',sources.star),
 item('Photographed hardware','Ringwatchers documents the sliding slot and dispenser in Ship 33’s forward barrel with labeled photographs. The assembly photographs show how hardware can be installed before the forward section joins the vehicle.',sources.observed),
 item('Flight evidence · 2026','Flight 13 deployed 20 flat Starlink V3 satellites. That flight demonstrates the dispenser workload. The large door and dedicated cargo cradle shown here are a separate design study.',sources.flight)
 ]
};
const falcon={
 family:'falcon',kind:'horizontal',facility:'Payload processing cleanroom',location:'Florida Space Coast · LC-39A campaign',
 handling:'An overhead crane lowers the upright spacecraft onto its adapter in the processing facility. Fairing halves close around the checked assembly.',
 mating:'The enclosed assembly goes to the LC-39A hangar. There it turns horizontal and joins the second stage before the full stack rolls to the pad.',
 provenance:'The Falcon guide defines the handling sequence. The rendered bay, lifting tooling and spacecraft-specific adapter are illustrative.',
 interface:face('Falcon standard payload attach fitting',1575.054,120,'published','Appendix A, figure A-1 specifies a 62.010 in bolt circle with 120 holes. This is the fixed fitting beneath the mission adapter. A separate release joint frees the spacecraft.',sources.falcon),
 evidence:[item('Provider sequence','SpaceX separates cleanroom encapsulation from horizontal mating to the launch vehicle. The enclosed spacecraft can be transferred between those facilities.',sources.falcon)]
};
const terran={
 family:'terran',kind:'horizontal',facility:'LC-16 cleanroom and integration hangar',location:'Cape Canaveral, Florida · LC-16',
 handling:'The study lowers the spacecraft onto its mission adapter beneath a bridge crane, then encloses it for transfer. Both Terran R recovery choices use the same handling study.',
 mating:'Relativity’s strongback receives the rocket stages in the horizontal integration hall. The enclosed payload’s path to the stages is a workbench assumption.',
 provenance:'Relativity reported a crane proof load, strongback delivery and cleanroom outfitting in 2026. Its public update establishes those building features. The payload lift path and mounting flange are proposed here.',
 interface:face('Proposed Terran R payload fitting',1575,120,'study','This study borrows the nominal 1,575 mm class and 120-position layout from familiar launch interfaces. Relativity’s public site update gives no Terran R mounting drawing.',sources.terran),
 evidence:[item('Observed construction','Relativity reported proof-loading the bridge crane and receiving the transporter-erector upper strongback at LC-16. The company also describes planned customer payload-processing infrastructure.',sources.terran),item('Site plan','Relativity identifies LC-16 as its Terran R site and lists a payload-processing facility among the planned expansions.',sources.terranSite)]
};
const glenn={
 family:'glenn',kind:'vertical-transfer',facility:'Customer encapsulation bay · planned baseline',location:'Cape Canaveral, Florida · LC-36A campaign',
 handling:'Technicians mate the payload to its fixed adapter and close the seven-metre fairing in a dedicated processing bay.',
 mating:'Blue Origin’s announced hybrid flow joins the two stages horizontally. A crane raises the rocket at the pad and then lifts the enclosed payload onto it.',
 provenance:'The 2018 guide supplies the interface geometry. The 2026 return-to-flight plan supplies the revised mating flow. The four-bay customer facility was under construction in the October 2026 update.',
 interface:face('New Glenn high-capacity fixed adapter',3169.9,120,'published','The modeled envelope uses the high-capacity option. Section 5.3.1 gives the 3,169.9 mm launch-side bolt circle and 120 positions at 3° intervals. The optional separation system above it has its own diameter.',sources.glenn),
 evidence:[item('Provider operations plan','The June 2026 plan retains horizontal stage integration and adds crane-assisted vertical mating of the enclosed payload at the pad.',sources.hybrid),item('Facility under construction','In October 2026 Blue Origin described a customer facility with four payload bays and two encapsulation bays to serve both New Glenn variants.',sources.cif)]
};
const vulcan={
 family:'vulcan',kind:'vertical-transfer',facility:'Payload processing and encapsulation bay',location:'Florida Space Coast · SLC-41 campaign',
 handling:'The crew joins the payload to its launch interface upright. Fairing halves meet around it, and the conditioned assembly moves onto a transporter.',
 mating:'The transporter carries the enclosed payload upright to SLC-41’s vertical integration facility. Its crane lifts the assembly into position above Centaur V.',
 provenance:'ULA publishes the two-facility sequence and interface drawings. The workbench supplies the spacecraft tooling and the bay layout.',
 interface:face('Vulcan 1575 payload attach fitting',1575.05,120,'published','ULA Table 4.2.2-1a shows the 1,575.05 mm, 120-hole circle on the nonseparating spacer option. The selected mission adapter attaches at this forward plane.',sources.vulcan),
 evidence:[item('Provider sequence','ULA keeps environmental conditioning active during vertical transfer from the processing building to the East Coast vertical integration facility or West Coast mobile service tower.',sources.vulcan)]
};
const ariane={
 family:'ariane',kind:'upper-composite',facility:'BAF-HE upper-composite encapsulation hall',location:'Guiana Space Centre, Kourou · ELA-4',
 handling:'The team installs the upright spacecraft and adapter on the launch vehicle adapter in the encapsulation hall. Following the MTG-I2 campaign, the crane lowers the already joined fairing over the upright spacecraft.',
 mating:'A dedicated transporter takes the upper composite 8.5 km to ELA-4. A lifting arm inside the mobile gantry places it on the upper stage.',
 provenance:'CNES describes the transfer route and gantry. Arianespace supplies the nominal interface size. The workbench does not assign a bolt count to that size.',
 interface:face('Ariane 6 standard launch vehicle adapter',1780,null,'published','Section 5.3.4 references the 1,780 mm standard LVA interface and a separate 2,624 mm heavy option. The drawing uses 1,780 mm as a nominal diameter. Hole count and drilling geometry require a controlled drawing.',sources.ariane,'Nominal standard LVA interface diameter'),
 evidence:[item('Photographed encapsulation','For MTG-I2 the fairing halves had been joined before the crane lowered the cone over the satellite. The enclosed assembly was later hoisted onto Ariane 6 inside its mobile gantry.',sources.arianeLift),item('Flight facility','The encapsulation hall builds the upper composite separately from the launcher. CNES describes a dedicated trailer and final lifting arm at the mobile gantry.',sources.csg)]
};
const cz5={
 family:'cz5',kind:'vertical-transfer',facility:'Wenchang technical-area integration hall',location:'Wenchang, Hainan · Launch Complex 101',
 handling:'A crane lowers the payload onto its adapter for an upright fit check before encapsulation. The precise loading fixtures for this data center are assumed.',
 mating:'The large payload rides over the core of the single-stage CZ-5B. The assembled rocket and payload travel from the technical area to the pad together.',
 provenance:'China Manned Space records the assembly, checks and rollout of Mengtian on CZ-5B. CNSA provides vertical assembly evidence for the wider CZ-5 family. The illustrated data-center handling fixture is a study design.',
 interface:face('Proposed CZ-5B payload support flange',2200,60,'study','The Wenchang mission reports establish the launch of a station module. This study assigns 2,200 mm and 60 positions to a bespoke flange. The reports do not give those dimensions.',sources.cz5),
 evidence:[item('Flight campaign','The 2022 Mengtian campaign completed spacecraft assembly and testing at Wenchang before joint checks with the rocket. The combined rocket and module were transported to the pad.',sources.cz5),item('Family handling reference','CNSA describes vertical assembly on the launch platform for the related CZ-5 lunar launcher. The CZ-5B station-module configuration omits the upper stage.',sources.cz5family)]
};
const cz9={
 family:'cz9',kind:'concept',facility:'Future heavy-lift integration hall · study',location:'Wenchang, Hainan · proposed heavy-lift site',
 handling:'A study crane lowers the spacecraft onto a provisional large-diameter transition fitting. The building, lift fixtures and service platforms are illustrative.',
 mating:'The model assumes vertical assembly and transfer of the enclosed payload. Public plans identify a future heavy-launch site while leaving the customer interface open.',
 provenance:'The launcher follows the 2023 two-stage study. Facility details, handling method and mounting dimensions are assumptions for comparison.',
 interface:face('Proposed CZ-9 payload support flange',3200,96,'study','The CALT concept sets the vehicle context. The workbench selects a 3,200 mm circle with 96 positions for the hypothetical flange. A provider interface drawing would replace both values.',sources.cz9),
 evidence:[item('Concept baseline','The State Council reported CALT’s two-stage design study. The workbench uses this revision to keep comparisons reproducible.',sources.cz9),item('Site planning','Wenchang officials described plans for a future launch pad. An operational processing flow has yet to be documented in these references.',sources.cz9site)]
};

const glenn9={
 ...glenn,facility:'Customer encapsulation bay · 9×4 development',location:'Cape Canaveral, Florida · LC-36B campaign',
 handling:'The 9×4 study uses the planned shared customer facility. The larger fairing surrounds the spacecraft and its mission adapter in a dedicated encapsulation bay.',
 mating:'Blue Origin designated LC-36B for 9×4. The company describes a shared hybrid launch flow and a new vertical integration facility under construction for this variant.',
 provenance:'The October 2026 update confirms the planned buildings. The 9×4 flange, crane clearances and exact handling fixtures use study assumptions.',
 interface:face('Proposed 9×4 high-capacity fitting',3169.9,120,'study','This is an explicit carryover of the 2018 high-capacity 7×2 bolt pattern for comparison. Blue Origin’s 9×4 facility announcement does not establish this as the 9×4 attachment.',sources.glenn)
};
const shipsElsewhere={
 'ksc-starship':['Florida ship high bay · study','Kennedy Space Center · LC-39A proposal','The FAA review identifies work at Roberts Road to support future Starship integration. This high-bay interior and its large-payload transfer are modeled from the Texas study.',sources.florida],
 'cape-slc37':['Cape ship high bay · study','Cape Canaveral · SLC-37 proposal','The FAA review covers proposed SLC-37 operations. A Texas-derived high bay and local cargo transfer are workbench assumptions for this site.',sources.cape],
 'louisiana-study':['Louisiana ship high bay · study','Pecan Island · proposed campus','Louisiana announced a new spaceport campus. The selected hall, service decks and indoor cargo lift are concept assumptions for that proposal.',sources.louisiana]
};
const profiles={terran,terranX:terran,glenn,glenn9,starship:star,falconHeavy:falcon,vulcan6:vulcan,ariane64:ariane,longMarch5B:cz5,longMarch9:cz9};
const facilities={};
for(const [id,[facility,location,note,source]] of Object.entries(shipsElsewhere)){
 facilities[id]={...star,facility,location,provenance:note,evidence:[...star.evidence,item('Site-specific basis',note,source)]};
}
facilities['vandenberg-slc6']={...falcon,facility:'West Coast processing bay · SLC-6 study',location:'Vandenberg, California · SLC-6',
 mating:'After vertical encapsulation, the study transfers the payload to the horizontal integration hangar authorized for SLC-6.',
 provenance:'The 2025 decision selected a new hangar south of SLC-6. The payload route and internal tooling shown here extrapolate the published Falcon process.',
 evidence:[...falcon.evidence,item('West Coast decision','The Department of the Air Force chose a new hangar south of the launch complex for the Falcon redevelopment.',sources.falconWest)]};
facilities['vandenberg-slc3e']={...vulcan,kind:'mobile-tower',facility:'West Coast payload processing bay',location:'Vandenberg, California · SLC-3E',
 mating:'ULA’s West Coast plan transports the enclosed payload upright to the mobile service tower at SLC-3E. The tower crane lifts it onto the rocket there.',
 provenance:'ULA’s guide specifies the West Coast mobile-tower mate. Local work area, service tooling and access platforms are schematic.',
 evidence:[...vulcan.evidence,item('West Coast construction','ULA describes the Vulcan conversion of its SLC-3 West Coast complex.',sources.vulcanWest)]};

for(const p of new Set([...Object.values(profiles),...Object.values(facilities)])){
 p.sources=[...new Set([p.interface.source,...p.evidence.map(row=>row.source)])];
}

/** Case-specific processing flow and nominal launch-side attachment plane. */
export function integrationProfile(launcherId,siteId){
 const profile=Object.hasOwn(profiles,launcherId)?profiles[launcherId]:null;
 if(!profile)throw new RangeError('Unknown launch vehicle: '+launcherId);
 const site=Object.hasOwn(facilities,siteId)?facilities[siteId]:null;
 return site?.family===profile.family?site:profile;
}
