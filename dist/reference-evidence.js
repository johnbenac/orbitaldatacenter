// Dated, field-level evidence. An illustration can support topology while a
// neighboring dimension remains an allocation. Unknowns never become zero.
export const referenceEvidenceRevision='odc-evidence-2026-11-r2';
export const evidenceReviewDate='2026-11-07';
export const evidenceClassLabels=Object.freeze({specification:'Published specification',visual:'Manufacturer visual',announcement:'Company / supplier intent',filing:'Regulatory application',patent:'Optional patent embodiment',derived:'Derived from source',allocation:'Project allocation',unknown:'Unresolved'});
const source=(id,title,url,date,kind,location,extra={})=>({id,title,url,date,kind,location,reviewed:evidenceReviewDate,...extra});
export const referenceSources=Object.freeze({
 redwire:source('redwire-202605','Redwire — Orbital Data Centers: Power and Thermal Management for Scalable Architectures','https://rdw.com/wp-content/uploads/2026/05/RDW26-053-ODC-Power-Thermal-Study-White-Paper-R11-Digital.pdf','2026-05','manufacturer engineering study','Printed pages 7–9; Figures 5, 7 and 8'),
 starcloudTour:source('starcloud-tour-20261031','Sourcery — Starcloud factory tour with Philip Johnston, Ezra Feilden and engineering staff','https://www.sourcery.vc/p/breaking-23b-starcloud-factory-tour','2026-10-31','firsthand interview; attributed company statements','Starcloud-3 manufacturing demonstrator from 24:22; written tour'),
 starcloud:source('starcloud-3-page','Starcloud — Starcloud-3 official concept animation','https://www.starcloud.com/starcloud-3','Reviewed 2026-11-07','manufacturer concept visualization','Embedded 36.52-second animation; inspected at approximately 14 seconds'),
 starcloudMay:source('starcloud-interview-20260508','McKinsey — The case for data centers in space, Philip Johnston interview','https://www.mckinsey.com/industries/technology-media-and-telecommunications/our-insights/the-case-for-data-centers-in-space','2026-05-08','firsthand company interview','Earlier Starcloud-3 approximately 200 kW / 3 tonne configuration'),
 starcloudLasers:source('starcloud-lasers-20260526','Starcloud — Starlink Mini Laser terminal procurement announcement','https://www.businesswire.com/news/home/20260526670395/en/Starcloud-to-Integrate-SpaceXs-Starlink-Mini-Lasers-Into-Its-Orbital-Data-Center-Constellation','2026-05-26','company announcement','50-plus terminals across 25-plus satellites; two per spacecraft, up to 25 Gbit/s and 4,000 km'),
 starcloudFCC:source('starcloud-fcc-2026','FCC — Starcloud application public notice DOC-419509A1','https://docs.fcc.gov/public/attachments/DOC-419509A1.pdf','Application filed 2026-02-04','regulatory application; indexed official notice','SAT-LOA-20260202-00073; 600–850 km SSO, optical ISL and backup Ka TT&C',{retrieval:'Official indexed notice text reviewed; direct PDF endpoint returned 403 during the audit.'}),
 starcloudPatent:source('starcloud-patent-20260312','Starcloud Inc. — WO2026055239A1, Orbital data center','https://patents.google.com/patent/WO2026055239A1/en','2026-03-12','patent; alternative embodiments','Paragraphs 0029, 0040 and 0077. These alternatives do not identify a Starcloud-3 flight build.'),
 starmind:source('spacex-ai1','SpaceX — Starmind AI1 public overview','https://new.spacex.com/spacexai/starmind','Reviewed 2026-11-07','manufacturer concept specification','AI1 overview; matched August archive retains detailed thermal and solar fields'),
 starmindArchive:source('spacex-ai1-archive-20260804','SpaceX — Archived AI1 page data: Overview, Thermal and Solar','https://web.archive.org/web/20260804210223jm_/https://www.spacex.com/7083.7e86f4011bddeea7.js','2026-08-04T21:02:23Z','archived manufacturer specification','Original JavaScript page-data asset; 68,551 bytes',{sha256:'6d1d0851a3e1e0aac7e292f2e9a9d8fc163d18f2fc354d6fb3fa66ddaccfe284',applicability:'Dated August concept snapshot; later flight hardware may differ.'}),
 starmindOverviewImage:source('spacex-ai1-image-20260804','SpaceX — Archived AI1 overview image','https://web.archive.org/web/20260804210223im_/https://content.spacex.com/cms-assets/assets/AI_1_1_v2_e4e64195a7.jpg','2026-08-04','manufacturer concept image','Two broad lateral solar wings and opposed radiator blades; interpretation is qualitative, not a scaled drawing'),
 starmindThermalImage:source('spacex-ai1-thermal-image-20260804','SpaceX — Archived AI1 thermal image','https://web.archive.org/web/20260804210223im_/https://content.spacex.com/cms-assets/assets/AI_1_2_v2_b92c3f62a6.jpg','2026-08-04','manufacturer concept image','Thermal arrangement accompanying the archived 160 m² radiator specification'),
 starmindSEC:source('spacex-ai1-sec-20260608','SpaceX — SEC-filed technical conversation','https://www.sec.gov/Archives/edgar/data/1181412/000162828026041761/fwp_cfointerview.htm','2026-06-08','issuer technical discussion','Exhibit B, AI1: double-sided radiators edge-on to the Sun and optical Starlink route; earlier power/span revision'),
 starmindProspectus:source('spacex-prospectus-20260605','SpaceX — EU prospectus','https://content.spacex.com/cms-assets/FINAL_Documents%20and%20Updates/SpaceX%20-%20EU%20Prospectus%20%28Approved%20by%20Bafin%29%20-%20June%205%2C%202026.pdf','2026-06-05','issuer prospectus','Printed pages 70–71; vapor chambers, active coolant loops and reduced RF equipment'),
 nvidia:source('nvidia-starmind-20260824','NVIDIA — SpaceXAI adopts Vera and plans an optimized Vera Rubin NVL72 for Starmind','https://investor.nvidia.com/news/press-release-details/2026/SpaceXAI-Adopts-NVIDIA-Vera-CPU-to-Accelerate-Agentic-AI-at-Massive-Scale/default.aspx','2026-08-24','compute supplier announcement','NVIDIA Accelerated Computing, From Earth to Orbit'),
 orbitalJune:source('orbital-20260630','Orbital — 100,000-satellite constellation announcement','https://orbital.inc/press/orbital-100000-constellation.html','2026-06-30','manufacturer announcement','Matched June approximately 2 t mass, 100 m span, 100 kW generation and rack description'),
 orbitalImage:source('orbital-image-20260414','Orbital — April company announcement and concept render','https://www.globenewswire.com/news-release/2026/04/14/3273430/0/en/Orbital-sets-date-for-first-test-mission-to-put-AI-data-centers-in-low-earth-orbit.html','2026-04-14','company-issued concept image','Historical antecedent: rectangular bus, two long dark wings, two shorter pale perpendicular appendages'),
 orbitalSeptember:source('orbital-reflex-20260910','Reflex Aerospace — Orbital spacecraft platform development agreement','https://www.reflexaerospace.com/press-releases/orbital-selects-reflex-as-exclusive-satellite-platform-partner-space-data-center-constellation','2026-09-10','spacecraft platform supplier announcement','Orbital-1 approaching-250 kW peak target; large arrays and passive rejection to space'),
 orbitalFCC:source('orbital-fcc-2026','FCC — Orbital application public notice DOC-424016A1','https://docs.fcc.gov/public/attachments/DOC-424016A1.pdf','Application 2026-06-24','regulatory application; indexed official notice','Page 2; SAT-LOA-20260624-00251, 500–850 km SSO, optical relay and backup Ka TT&C',{retrieval:'Official indexed notice text reviewed; direct PDF endpoint returned 403 during the audit.'}),
 starCatcher:source('starcatcher-20260331','Star Catcher — The orbital data center power problem','https://www.star-catcher.com/news/the-orbital-data-center-power-problem-and-how-to-solve-it','2026-03-31','supplier analytical study','Self-powered 250 kW node, PUE 1.3, spacecraft mass-per-power and active temperature lift')
});
const registry=Object.fromEntries(Object.values(referenceSources).map(s=>[s.id,s]));
export function getReferenceSource(id){return registry[id]||null}
const field=(id,label,evidence,value,basis,sourceIds=[],extra={})=>({id,label,evidence,value,basis,sourceIds,reviewed:evidenceReviewDate,...extra});
const unknown=(id,label,basis,sourceIds=[])=>field(id,label,'unknown',null,basis,sourceIds);
const records={
 'redwire-8kw':[
  field('core.form','Primary structure','specification','Flat-stack bus','Source packaging study; full equipment arrangement and bus dimensions remain allocated.',['redwire-202605'],{location:'Figure 5'}),
  field('solar.wings','Solar wing geometry','specification','2 × 2 m × 20 m ROSA','80 m² collecting blanket area; elastic roll-out deployment.',['redwire-202605'],{location:'Printed page 7, Figure 5'}),
  field('thermal.radiator','Compute radiator','specification','1 × 3.25 m × 3.25 m','10.5625 m² physical planform, 21.125 m² two-face emitting surface.',['redwire-202605'],{location:'Printed pages 7–9'}),
  field('payload.location','Compute location','specification','On deployable radiator platform','GPU/CPU and associated memory couple through a 1 m square spreader; auxiliary equipment may stay on the bus.',['redwire-202605']),
  field('thermal.transport','Payload heat transport','specification','Passive spreader + heat pipes','Only electrical harness crosses the compute-platform hinge; no remote payload fluid loop is inferred.',['redwire-202605']),
  field('deployment.platform','Platform deployment','specification','Hold-downs and damped spring hinges','The PDR model allocates timing, clearances and mechanism ratings.',['redwire-202605']),
  field('thermal.point','Published thermal comparison','specification','48°C interface at 8 kW; 66°C at 10 kW','Steady state at beta 90° with high-performance interfaces. Neither value is a GPU junction rating.',['redwire-202605']),
  field('launch.stow','Source stowed height','specification','Approximately 1.1 m on Falcon 9','The New Glenn nested arrangement is different; its height is not set to 1.1 m.',['redwire-202605'],{location:'Figures 5 and 7'}),
  field('thermal.rating','Installed passive transport ratings','allocation','1.2 kW/K; 12 kW payload capacity','Bus conductance 0.2 kW/K; allocated preliminary bounds, not qualified pipe performance.'),
  field('thermal.bus-route','Additional bus heat route','allocation','0.2 kW/K bus-to-platform thermal strap','This operational study accommodation has an unverified hinge route. It is distinct from the paper’s electrical-only payload-platform hinge and is not silently added to the isolated published 8/10 kWt payload comparison.'),
  unknown('mass.total','Complete spacecraft mass','No all-up mass was located in the reviewed point design.',['redwire-202605']),
  unknown('bus.equipment','Battery, propulsion and communications','The model supplies separate bus allocations; source payload topology does not establish flight bus equipment.',['redwire-202605'])
 ],
 'starcloud-3':[
  field('core.form','Central structure','visual','Thin rectangular equipment / truss bay','Observed in the manufacturer animation; exact dimensions are not inferred from perspective.',['starcloud-3-page'],{location:'Approximately 14 s'}),
  field('appendages.layout','Appendage layout','visual','Two opposed inline deployable sequences','The model assigns inboard radiator and outboard photovoltaic roles as an explicit interpretation; image alone does not fix every panel role.',['starcloud-3-page'],{location:'Approximately 14 s'}),
  field('thermal.crossings','Fluid crossings','visual','Flexible tubing loops at hinges','Supports fluid-carrying deployment. Working fluid, bore and bend limits remain allocations.',['starcloud-3-page']),
  field('mass.total','October whole-vehicle mass','announcement','Approximately 2 t','Direct company-attributed factory-tour statement; no complete matched mass ledger.',['starcloud-tour-20261031'],{location:'Starcloud-3 section, 24:22 onward'}),
  field('power.stated','October stated power','announcement','235 kW; boundary unresolved','Continuous IT, average total load and array generation are not interchangeable. The recipe’s 235 kW IT stress case is allocated.',['starcloud-tour-20261031']),
  field('appendages.dimension','Reported deployable dimension','announcement','400 ft ≈ 121.92 m','Wing versus whole-span boundary unresolved; this does not constrain the modeled full span.',['starcloud-tour-20261031']),
  field('appendages.model','Installed appendage allocation','allocation','1,721 m² PV / 431 m² radiator planform; PV aspect 10','Two inboard-radiator / outboard-PV sequences conserve these installed areas. Their derived full span is reported separately from the ambiguous 400 ft source dimension.'),
  field('launch.stack','Starship packing intent','announcement','50 vehicles; two across, 25 stacked','A packing target, not an interface or verified dispenser-clearance result.',['starcloud-tour-20261031']),
  field('comms.terminals','Optical terminal allocation','announcement','Two Starlink Mini Lasers per spacecraft','Initial contract covers 25-plus satellites, up to 25 Gbit/s per terminal and 4,000 km. Mapping this procurement to Starcloud-3 is explicit.',['starcloud-lasers-20260526']),
  field('comms.backup','Backup communications','filing','Ka TT&C; optical primary relay','18.8–19.3 GHz down / 28.6–29.1 GHz up in the filing; this does not specify antenna size or a large payload-data dish.',['starcloud-fcc-2026']),
  field('history.may','Earlier Starcloud-3 revision','announcement','May 2026: approximately 200 kW / 3 t','Retained separately; not averaged with the October 235 kW / 2 t statement.',['starcloud-interview-20260508']),
  field('design.alternatives','Patent alternatives','patent','Flat forms, pumped loops, inline radiator / PV options','Optional embodiments inform design vocabulary; no docking spine, immersion tank or heat pump is automatically installed in Starcloud-3.',['starcloud-patent-20260312']),
  unknown('appendages.exact','Matched dimensions, areas and segmentation','Detailed FCC attachments remained inaccessible. No secondary 220 m footprint or 107 m array dimension is adopted.'),
  unknown('propulsion.flight','Flight propulsion and coolant','Starcloud-2 hardware does not establish the Starcloud-3 propulsion system or thermal working fluid.')
 ],
 'starmind-ai1':[
  field('envelope.deployed','Deployed overall envelope','specification','75 m span × 30 m height','Archived August concept dimensions; not a folded launch envelope.',['spacex-ai1-archive-20260804']),
  field('power.compute','Compute power','specification','175 kW average / 250 kW peak','Same dated AI1 specification; duty and installed compute implementation remain separately declared.',['spacex-ai1-archive-20260804']),
  field('solar.generation','Solar rating','specification','210 kW at 250 W/m²','Archived Solar record; source does not establish this as an EOL net IT rating.',['spacex-ai1-archive-20260804']),
  field('solar.area','Effective collecting area','derived','840 m²','210,000 W ÷ 250 W/m², conditional on matched rating conditions; not independently measured blanket dimensions.',['spacex-ai1-archive-20260804']),
  field('thermal.area','Published radiator area','specification','160 m²; face convention unresolved','The source does not distinguish panel planform from total emitting surface. Keep the number in a separate stated-area field.',['spacex-ai1-archive-20260804']),
  field('thermal.area-model','Installed radiator area interpretation','allocation','160 m² planform / 320 m² emitting','Two active faces are a declared area convention. Compare against 80 m² planform if the published 160 m² means both faces.'),
  field('appendages.layout','Depicted geometry','visual','Broad lateral solar pair and opposed tall radiator blades','Orthogonal compact-core interpretation from official overview and thermal images. Exact section widths and folding sequence are allocations.',['spacex-ai1-image-20260804','spacex-ai1-thermal-image-20260804']),
  field('thermal.loops','Thermal transport','specification','Active fluid cooling and redundant pumping loops','Micrometeoroid protection is stated; pressure, fluid and independent-loop capacity are not published.',['spacex-ai1-archive-20260804']),
  field('thermal.loop-allocation','Modeled redundant loops','allocation','Two independent half-duty loops','Each has one duty and one standby pump. Loss of one loop removes its allocated capacity; full-load single-fault tolerance is not claimed.'),
  field('payload.family','Payload technology intent','announcement','Optimized Vera Rubin NVL72','Future orbital adaptation; generic modeled trays do not establish flight NVL72 mass, dimensions, throughput or GPU count.',['nvidia-starmind-20260824']),
  field('comms.route','Communications direction','announcement','Optical route through Starlink; reduced RF hardware','Terminal count and detailed antenna equipment remain project allocations.',['spacex-ai1-sec-20260608','spacex-prospectus-20260605']),
  field('comms.package','Installed communications package','allocation','Optical + S-band TT&C; no Ka payload reflector','One optical head and two S-band patches with command electronics are explicit project allocations. The large Ka reflector is omitted from mass, geometry and service. Alternative RF packages remain configurable; no supplier terminal count or command implementation is inferred.'),
  unknown('mass.total','Whole-vehicle mass','75 kW/t does not establish a mass until the numerator power boundary is specified.',['spacex-ai1']),
  unknown('launch.fold','Flight fold schedule and launch interface','The 75 m × 30 m envelope does not supply a dispenser, Starship interface or folded package.')
 ],
 'orbital-1-202606':[
  field('payload.form','Payload accommodation','announcement','One rack; about eight servers','June description establishes rack-centered function, not server dimensions or qualified flight hardware.',['orbital-20260630']),
  field('solar.generation','Solar generation','announcement','Approximately 100 kW','Generated power, not continuous IT or customer-delivered compute.',['orbital-20260630']),
  field('envelope.span','Whole deployed span','announcement','Approximately 100 m','June matched configuration; the model constrains the full solar-axis span.',['orbital-20260630']),
  field('mass.total','Whole-vehicle mass','announcement','Approximately 2 t','June mass statement; independent model mass remains separate.',['orbital-20260630']),
  field('appendages.layout','Antecedent visual topology','visual','Rectangular bus, paired long wings, perpendicular short appendages','April company image predates the June specification. Pale appendages are interpreted as radiators, not proven by color alone.',['orbital-image-20260414']),
  field('thermal.transport','Installed heat transport','allocation','Pumped rack-to-radiator circuit','A runnable engineering choice. Published rejection to space does not establish this particular transport system.'),
  field('solar.area','Installed array area','allocation','285 m² triple-junction photovoltaic area','Approximately 100.07 kW BOL before MPPT at the allocated efficiency/delivery; no source blanket area is claimed.'),
  field('comms.mission','Program mission and communications','filing','500–850 km SSO; optical relay and Ka backup TT&C','Applies at program level; terminal hardware and relay service are still allocations.',['orbital-fcc-2026']),
  unknown('launch.package','Operational launcher and folded package','Falcon 9 for the separate GPU demonstration does not identify the complete June spacecraft carrier.'),
  unknown('thermal.radiator','Matched radiator area, temperature and fluid','Unpublished in the reviewed June announcement; explicitly allocated in the study.')
 ],
 'orbital-1-202609':[
  field('program.platform','Platform authority','announcement','Reflex-led platform and systems integration','Dedicated development agreement, not an off-the-shelf completed spacecraft.',['orbital-reflex-20260910']),
  field('power.target','Peak electrical target','announcement','Approaching 250 kW; boundary unresolved','The model’s 250 kW peak IT interpretation is a stress-case allocation.',['orbital-reflex-20260910']),
  field('solar.topology','Solar collection','announcement','Large onboard arrays','Array count, area and exact deployed span are not specified in the September agreement.',['orbital-reflex-20260910']),
  field('thermal.rejection','Heat rejection','announcement','Continuous passive radiation to space','This describes radiative rejection and does not distinguish pumped fluid from heat pipes.',['orbital-reflex-20260910']),
  field('core.form','Runnable structure','allocation','Compact rectangular bus with paired arrays and radiator banks','Shares an implementation family with the rack concept; no claim that the April render depicts the September spacecraft.'),
  field('thermal.transport','Installed thermal circuit','allocation','Pumped preliminary bus','Fluid, temperatures, capacity and packaging are controlled project allocations.'),
  field('comms.mission','Program mission and communications','filing','500–850 km SSO; optical relay and Ka backup TT&C','Mapping the program filing to the September revision is explicit; network access remains uncontracted.',['orbital-fcc-2026']),
  unknown('mass.total','September whole-vehicle mass','June’s approximately 2 t value is not imported.'),
  unknown('envelope.span','September deployed dimensions','June’s 100 m span and the April rendered topology do not establish this revised configuration.'),
  unknown('launch.package','Operational launcher and interfaces','The model supplies a candidate carrier; no approved supplier launch interface is asserted.')
 ],
 'star-catcher-self-powered':[
  field('power.total','Total average electrical load','specification','250 kW at PUE 1.3','Analytical complete-node boundary; no beamed power is credited.',['starcatcher-20260331']),
  field('power.it','IT allocation','derived','192.3077 kW','250 kW ÷ 1.3; leaves 57.6923 kW for all non-IT demand.',['starcatcher-20260331']),
  field('mass.total','Analytical whole-node mass','derived','10,275 kg','41.1 kg per total electrical kW × 250 kW; not a measured flight mass.',['starcatcher-20260331']),
  field('solar.area','Source array allocation','specification','Approximately 1,100 m²','Self-powered node, with eclipse storage in the source account.',['starcatcher-20260331']),
  field('thermal.lift','Heat-lift architecture','specification','Cold side near 100°C → hot side near 150°C','Electrical work must be added to both bus load and hot-side rejection.',['starcatcher-20260331']),
  field('thermal.cop-bound','Minimum COP consistency bound','derived','3.33 before any other overhead','192.3077 ÷ 57.6923; real bus demand raises the requirement. This is not demonstrated hardware performance.',['starcatcher-20260331']),
  field('thermal.heat-pump','Installed analytical heat pump','allocation','COP 4; 200 kW cold-side capacity; 625 kg','373.15 K cold / 423.15 K hot; drive included. Requires component, coolant, pressure, material and qualification evidence.'),
  field('core.form','Physical layout','allocation','Analytical node geometry','A functional hot/cold thermal layout is shown; the source does not define a uniquely branded flight silhouette.'),
  unknown('thermal.fluid','Qualified hot-loop working fluid and compressor','No ammonia applicability is presumed at 423.15 K; fluid/material selection remains unresolved.'),
  unknown('launch.package','Folded geometry and launcher interface','No source flight package or operational launcher is specified.')
 ]
};
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value)}return value;};
export const referenceEvidence=freeze(records);
export function referenceEvidenceFor(id){return referenceEvidence[id]||[]}
export function referenceEvidenceSummary(id){
 const rows=referenceEvidenceFor(id),counts={documented:0,interpreted:0,allocated:0,unresolved:0};
 for(const row of rows)counts[row.evidence==='unknown'?'unresolved':row.evidence==='allocation'?'allocated':['visual','derived','patent'].includes(row.evidence)?'interpreted':'documented']++;
 return {...counts,total:rows.length,reviewed:evidenceReviewDate,qualification:'open'};
}
export const referenceRetrievalBacklog=freeze([
 {referenceId:'starcloud-3',title:'September FCC response',url:'https://api-prod.fcc.gov/icfs-attachment/exp/api/v1/d3840f7acf97c710ade47d642f851c70',status:'Not independently retrieved — HTTP 403',needed:'Matched deployed dimensions, array geometry, battery and mission-shell details'},
 {referenceId:'starcloud-3',title:'September debris-assessment logs',url:'https://api-prod.fcc.gov/icfs-attachment/exp/api/v1/e1a48f7acf97c710ade47d642f851cae',status:'Not independently retrieved — HTTP 403',needed:'Matched area/mass boundary and disposal allocations'},
 {referenceId:'starcloud-3',title:'May FCC response',url:'https://api-prod.fcc.gov/icfs-attachment/exp/api/v1/584fc22dcfd14790c2eff2c42f851c2f',status:'Not independently retrieved — HTTP 403',needed:'Earlier filing revision; do not merge with October without reconciliation'}
]);
