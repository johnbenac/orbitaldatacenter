// Published reference facts are independent of the runnable workbench studies.
// A missing value remains null. Model allocations must never fill these records.
export const referenceEvidenceDate='2026-11-07';
import {referenceSources as sources,referenceEvidenceFor,referenceEvidenceSummary} from './reference-evidence.js';

const quantity=(value,unit,basis,sourceIds,extra={})=>({value,unit,basis,sourceIds,...extra});
const unreported=(unit,basis,sourceIds=[])=>quantity(null,unit,basis,sourceIds,{qualifier:'Not published in the reviewed evidence'});
const quantities=(sourceIds,values={})=>({
 massKg:unreported('kg','Complete spacecraft mass',sourceIds),
 itPowerKW:unreported('kW','IT power; average or continuous basis must be stated',sourceIds),
 peakItPowerKW:unreported('kW','Peak IT power',sourceIds),
 busPowerKW:unreported('kW','Spacecraft services excluding IT',sourceIds),
 totalPowerKW:unreported('kW','Total spacecraft electrical load',sourceIds),
 generationPowerKW:unreported('kW','Solar generation',sourceIds),
 statedPowerKW:unreported('kW','Power with an unspecified accounting boundary',sourceIds),
 solarAreaM2:unreported('m²','Photovoltaic collecting area',sourceIds),
 radiatorPlanformM2:unreported('m²','Radiator panel planform; one physical face',sourceIds),
 radiatingAreaM2:unreported('m²','Total active emitting surface area',sourceIds),
 radiatorStatedAreaM2:unreported('m²','Radiator area with unspecified face convention',sourceIds),
 stowedHeightM:unreported('m','Stowed spacecraft height',sourceIds),
 deployedSpanM:unreported('m','Full deployed span',sourceIds),
 deployedHeightM:unreported('m','Deployed height',sourceIds),
 deployableDimensionM:unreported('m','Reported deployable dimension; boundary must be stated',sourceIds),
 orbitAltitudeKm:unreported('km','Selected operating altitude',sourceIds),
 ...values
});

const records={
 'redwire-8kw':{
  id:'redwire-8kw',name:'Redwire 8 kW compute node',shortName:'Redwire 8 kW',organization:'Redwire',revision:'May 2026 point design',category:'engineering',group:'main',
  summary:'A small, single-spacecraft reference with published solar, radiator and launch-stowage geometry.',
  status:{label:'Engineering point design',detail:'Published power/thermal study; complete flight-vehicle qualification is not established.',flown:false},
  reported:quantities(['redwire-202605'],{
   itPowerKW:quantity(8,'kW','Assumed compute electrical load',['redwire-202605']),
   busPowerKW:quantity(2,'kW','Allocated spacecraft services',['redwire-202605']),
   totalPowerKW:quantity(10,'kW','8 kW compute plus 2 kW spacecraft services',['redwire-202605']),
   solarAreaM2:quantity(80,'m²','Two 2 m × 20 m silicon ROSA blankets',['redwire-202605']),
   radiatorPlanformM2:quantity(10.5625,'m²','One 3.25 m × 3.25 m radiator panel',['redwire-202605'],{method:'3.25 × 3.25'}),
   radiatingAreaM2:quantity(21.125,'m²','Both faces of the radiator',['redwire-202605']),
   stowedHeightM:quantity(1.1,'m','Falcon 9 packing study; not the New Glenn configuration',['redwire-202605'],{qualifier:'Approximately'}),
   orbitAltitudeKm:quantity(1500,'km','Sun-synchronous reference orbit',['redwire-202605'])
  }),
  architecture:{kind:'radiator-compute-platform',family:'redwire-platform',label:'Radiator-mounted compute',summary:'Flat-stack bus with two roll-out solar wings and one deployable compute/radiator platform.',power:'Two 2 m × 20 m ROSA wings.',thermal:'Compute directly couples to a heat spreader and passive heat-pipe radiator; only electrical harness crosses the deployment hinges. Auxiliary bus heat has a separately allocated path.',packaging:'Figure 5 uses a ≥4.6 m payload volume. New Glenn permits a different nested stowage arrangement.',evidence:'Published topology and point dimensions; missing bus equipment remains a study allocation.',sourceIds:['redwire-202605']},
  thermalReference:{loadKW:8,interfaceC:48,alternateLoadKW:10,alternateInterfaceC:66,betaDeg:90,absorptivity:0.15,emissivity:0.85,basis:'Steady-state study with high-performance interfaces; interface temperature is not GPU junction temperature.',sourceIds:['redwire-202605']},
  launch:{families:['New Glenn'],evidence:'Family-level packaging discussion. The 1.1 m baseline uses Falcon 9; no approved-list variant is qualified.',sourceIds:['redwire-202605']},
  unresolved:['All-up mass and complete equipment list','Battery, propulsion and communications allocations','New Glenn stowed envelope and adapter','Target-orbit launch performance and lifetime verification'],
  assumptions:['A runnable workbench study supplies the unpublished bus and operating parameters.','The published thermal point is not a mission-wide thermal qualification.'],
  sources:[sources.redwire]
 },
 'starcloud-3':{
  id:'starcloud-3',name:'Starcloud-3',shortName:'Starcloud-3',organization:'Starcloud',revision:'October 2026 factory-tour configuration',category:'commercial',group:'main',
  summary:'A commercial spacecraft concept with a stated whole-vehicle mass and a Starship packing target.',
  status:{label:'Manufacturing demonstrator',detail:'Primary-structure demonstrator shown; the numerical figures are attributed CTO statements in a firsthand factory tour.',flown:false},
  reported:quantities(['starcloud-tour-20261031'],{
   massKg:quantity(2000,'kg','Company-stated whole-vehicle mass',['starcloud-tour-20261031'],{qualifier:'Approximately; no subsystem mass breakdown'}),
   statedPowerKW:quantity(235,'kW','Generation versus IT, average versus peak and EOL basis unspecified',['starcloud-tour-20261031']),
   deployableDimensionM:quantity(121.92,'m','400 ft deployable dimension; wing versus full-span boundary unspecified',['starcloud-tour-20261031'],{qualifier:'Approximately 122 m',method:'400 ft × 0.3048 m/ft'})
  }),
  architecture:{kind:'inline-deployables',family:'starcloud-inline',label:'Inline solar / radiator wings',summary:'Thin central equipment bay with two opposed inline deployable sequences and separated optical terminals.',power:'Own solar arrays; matched collecting area and storage remain allocations.',thermal:'Flexible fluid crossings are depicted. Inboard radiator / outboard solar segmentation is an identified interpretation, with shared appendage orientation.',packaging:'Company describes 50 spacecraft per Starship, two across and 25 stacked; a qualified dispenser is not established.',evidence:'Official animation at approximately 14 seconds supports topology. Exact component dimensions and role boundaries remain allocated.',sourceIds:['starcloud-tour-20261031','starcloud-3-page']},
  communications:{opticalTerminals:2,terminalGbps:25,terminalRangeKm:4000,basis:'Initial 25-plus-satellite Starlink Mini Laser procurement; mapping to this Starcloud-3 study is explicit and does not guarantee simultaneous service.',sourceIds:['starcloud-lasers-20260526']},
  sourceHistory:[{date:'2026-05-08',massKg:3000,statedPowerKW:200,basis:'Earlier CEO interview; retained separately from October.',sourceIds:['starcloud-interview-20260508']}],
  launch:{families:['Starship'],evidence:'Company packing intent; exact folded envelope, dispenser and V3 interface remain unpublished.',sourceIds:['starcloud-tour-20261031']},
  unresolved:['Electrical meaning of 235 kW','Matched array/radiator areas and operating temperatures','Folded dimensions and complete wet-mass breakdown','Detailed FCC attachments, exact orbit and lifetime for this revision'],
  assumptions:['A workbench study must choose its own power boundary and unpublished equipment allocations.','Earlier 200 kW / 3 tonne statements describe a different configuration.'],
  sources:[sources.starcloudTour,sources.starcloud,sources.starcloudLasers,sources.starcloudFCC,sources.starcloudMay,sources.starcloudPatent]
 },
 'starmind-ai1':{
  id:'starmind-ai1',name:'SpaceX Starmind AI1',shortName:'Starmind AI1',organization:'SpaceX',revision:'August 2026 specification snapshot; November evidence review',category:'commercial',group:'main',
  summary:'A proposed Starship-deployed compute satellite with separate average and peak IT-power ratings.',
  status:{label:'Announced flight system',detail:'Manufacturer concept specification; a complete qualified spacecraft package is not public.',flown:false},
  reported:quantities(['spacex-ai1-archive-20260804'],{
   itPowerKW:quantity(175,'kW','Average compute payload power',['spacex-ai1-archive-20260804']),
   peakItPowerKW:quantity(250,'kW','Peak compute payload power',['spacex-ai1-archive-20260804'],{qualifier:'Up to'}),
   generationPowerKW:quantity(210,'kW','Archived solar-array rating; illumination, temperature and EOL basis not fully specified',['spacex-ai1-archive-20260804']),
   solarSpecificWm2:quantity(250,'W/m²','Archived solar-array power density',['spacex-ai1-archive-20260804']),
   solarAreaM2:quantity(840,'m²','Effective collecting area if the two archived solar ratings share their conditions',['spacex-ai1-archive-20260804'],{method:'210,000 W ÷ 250 W/m²',qualifier:'Derived; not independently measured blanket dimensions'}),
   radiatorStatedAreaM2:quantity(160,'m²','Archived deployable liquid radiator; planform versus total emitting-face convention unresolved',['spacex-ai1-archive-20260804']),
   deployedSpanM:quantity(75,'m','Deployed wingspan; not a solar collecting area',['spacex-ai1-archive-20260804']),
   deployedHeightM:quantity(30,'m','Deployed height; not a launch envelope',['spacex-ai1-archive-20260804']),
   specificPowerKWPerT:quantity(75,'kW/t','Published vehicle-efficiency figure; numerator power basis unspecified',['spacex-ai1'])
  }),
  architecture:{kind:'orthogonal-cross',family:'starmind-cross',label:'Broad arrays / tall radiator blades',summary:'Thin central structure, two broad solar wings and opposed approximately orthogonal radiator blades.',power:'Archived 210 kW array at 250 W/m² implies 840 m² effective collecting area under matched conditions.',thermal:'Archived 160 m² liquid radiator, active fluid cooling, redundant pumping loops and micrometeoroid protection. The area face convention remains unresolved.',packaging:'75 m × 30 m deployed envelope; Starship fold schedule and dispenser remain allocations.',evidence:'Dated manufacturer specification and qualitative imagery. The workbench explicitly interprets 160 m² as planform; two-face emitting area is a model assumption.',sourceIds:['spacex-ai1-archive-20260804','spacex-ai1-image-20260804','spacex-ai1-thermal-image-20260804','nvidia-starmind-20260824']},
  computeReference:{label:'Optimized NVIDIA Vera Rubin NVL72',basis:'Supplier describes an orbital adaptation; this does not establish flown throughput, mass or thermal performance.',sourceIds:['nvidia-starmind-20260824']},
  launch:{families:['Starship'],evidence:'Explicit Starship deployment intent; no V3-specific complete integration is established.',sourceIds:['spacex-ai1']},
  unresolved:['Unambiguous complete spacecraft mass','Power basis of 75 kW/t and face convention of the 160 m² radiator','Folded envelope, adapter and dispenser','Flight coolant, terminal count and mission-wide thermal/lifetime budgets'],
  assumptions:['Do not infer mass from 75 kW/t without a specified numerator.','A workbench performance model is not a measured NVL72-in-orbit benchmark.'],
  sources:[sources.starmindArchive,sources.starmind,sources.starmindOverviewImage,sources.starmindThermalImage,sources.starmindSEC,sources.starmindProspectus,sources.nvidia]
 },
 'orbital-1-202609':{
  id:'orbital-1-202609',name:'Orbital-1 / Reflex',shortName:'Orbital-1 · Sep 2026',organization:'Orbital / Reflex Aerospace',revision:'September 2026 platform agreement',category:'commercial',group:'main',
  summary:'The updated spacecraft program targets a higher power level, with a dedicated Reflex bus development effort.',
  status:{label:'Platform in development',detail:'Joint spacecraft development agreement; a complete packaged flight configuration is not published.',flown:false},
  reported:quantities(['orbital-reflex-20260910'],{
   statedPowerKW:quantity(250,'kW','Peak power; IT versus total electrical boundary unspecified',['orbital-reflex-20260910'],{qualifier:'Approaching, not an exact rating'})
  }),
  architecture:{kind:'reflex-functional',family:'orbital-reflex',label:'Reflex-led preliminary platform',summary:'Dedicated compute bus with large solar arrays and onboard radiative heat rejection; September geometry is unresolved.',power:'Large onboard solar arrays and electrical distribution are explicit development objectives.',thermal:'Passive radiation to space is explicit; this does not establish pump-free internal heat transport.',packaging:'No matched operational launch package is published.',evidence:'Functional architecture is public. The displayed compact bus and deployables are project allocations, not a reconstruction of the September spacecraft.',sourceIds:['orbital-reflex-20260910']},
  launch:{families:[],evidence:'No operational configuration on an approved candidate launcher is established.',sourceIds:['orbital-reflex-20260910']},
  unresolved:['Updated whole mass and deployed dimensions','Electrical boundary of the peak target','Array/radiator geometry and thermal budget','Operational launcher and folded package'],
  assumptions:['June 2026 mass and span are not transferred to this revised power target.','The separate Falcon 9 GPU demonstration is not the Orbital-1 flight package.'],
  sources:[sources.orbitalSeptember,sources.orbitalFCC]
 },
 'orbital-1-202606':{
  id:'orbital-1-202606',name:'Orbital June reference',shortName:'Orbital · Jun 2026',organization:'Orbital',revision:'June 2026 historical configuration',category:'historical',group:'historical',
  summary:'The original matched mass, span and generation statement, retained separately from the September target.',
  status:{label:'Historical concept',detail:'Earlier company configuration; not the current 250 kW platform specification.',flown:false},
  reported:quantities(['orbital-20260630'],{
   massKg:quantity(2000,'kg','Complete spacecraft statement',['orbital-20260630'],{qualifier:'Roughly'}),
   generationPowerKW:quantity(100,'kW','Generated by onboard solar arrays; not specified as net IT power',['orbital-20260630'],{qualifier:'Roughly'}),
   deployedSpanM:quantity(100,'m','Spacecraft span',['orbital-20260630'],{qualifier:'About'})
  }),
  architecture:{kind:'rack-cross',family:'orbital-rack',label:'Rack-centered two-axis spacecraft',summary:'One high-density rack, described as about eight servers, with paired solar wings and a separately allocated radiator axis.',power:'Approximately 100 kW generation and approximately 100 m deployed span belong to the June configuration.',thermal:'Short pale appendages in the April image are interpreted as radiators; transport and exact thermal hardware remain allocations.',packaging:'No folded envelope or operational carrier identified.',evidence:'June numerical statements plus an explicitly historical April visual antecedent. The image is not claimed as the exact June configuration.',sourceIds:['orbital-20260630','orbital-image-20260414']},
  launch:{families:[],evidence:'Falcon 9 was named for a separate single-GPU demonstration, not this complete operating spacecraft.',sourceIds:['orbital-20260630']},
  unresolved:['Folded dimensions and operational launch integration','Complete power and thermal budgets','Equipment breakdown and lifetime margins'],
  assumptions:['Keep these June figures together; do not combine them with September’s peak power target.'],
  sources:[sources.orbitalJune,sources.orbitalImage,sources.orbitalFCC]
 },
 'star-catcher-self-powered':{
  id:'star-catcher-self-powered',name:'Star Catcher self-powered node model',shortName:'Self-powered 250 kW',organization:'Star Catcher',revision:'March 2026 analytical baseline',category:'analytical',group:'analytical',
  summary:'An analytical complete-node mass and power benchmark with onboard solar arrays and eclipse batteries.',
  status:{label:'Analytical baseline',detail:'A modeled spacecraft node, not a packaged manufacturer vehicle or a flown data center.',flown:false},
  reported:quantities(['starcatcher-20260331'],{
   massKg:quantity(10275,'kg','Model total from whole-spacecraft specific mass',['starcatcher-20260331'],{method:'250 kW × 41.1 kg/kW',qualifier:'Derived analytical value; not measured vehicle mass'}),
   itPowerKW:quantity(250/1.3,'kW','IT load inferred from total electrical load and PUE',['starcatcher-20260331'],{method:'250 kW ÷ 1.3',qualifier:'Derived model value'}),
   totalPowerKW:quantity(250,'kW','Average total spacecraft electrical power',['starcatcher-20260331']),
   solarAreaM2:quantity(1100,'m²','Self-powered average-generation baseline',['starcatcher-20260331'],{qualifier:'Approximately'}),
   pue:quantity(1.3,'ratio','Total spacecraft electrical power / IT power',['starcatcher-20260331']),
   specificMassKgPerKW:quantity(41.1,'kg/kW','Whole spacecraft mass per total electrical kW',['starcatcher-20260331'])
  }),
  architecture:{kind:'analytical-self-powered',family:'heatlift-study',label:'Cold loop / heat pump / hot radiator',summary:'Analytical self-powered node with separate cold and hot thermal stages, solar arrays, batteries and spacecraft services.',power:'Own solar arrays with eclipse recharge allowance and batteries; heat-pump electrical work is accounted explicitly.',thermal:'Active heat lift from about 100°C to 150°C; COP, implementation and radiator area are study allocations.',packaging:'No folded geometry or launcher interface is defined.',evidence:'Analytical topology, not a manufacturer flight shape. Any rendered geometry is explicitly a workbench study layout.',sourceIds:['starcatcher-20260331']},
  launch:{families:[],evidence:'No particular launch vehicle or complete launch package is specified.',sourceIds:['starcatcher-20260331']},
  unresolved:['Real packaged geometry and launch interfaces','Component realization of the assumed heat pump','A qualified equipment list and mission performance'],
  assumptions:['Only the self-powered baseline is retained; externally powered variants violate the one-launch utility boundary.','The study’s larger 81-node cluster is not credited as one-launch capacity.'],
  sources:[sources.starCatcher]
 }
};

for(const record of Object.values(records)){
 record.fieldEvidence=referenceEvidenceFor(record.id);
 record.evidenceSummary=referenceEvidenceSummary(record.id);
}

const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value)}return value};
export const referenceCenters=freeze(records);
export const referenceCenterOrder=Object.freeze(['redwire-8kw','starcloud-3','starmind-ai1','orbital-1-202609','orbital-1-202606','star-catcher-self-powered']);
export const defaultReferenceCenterId='redwire-8kw';
export function getReferenceCenter(id){return Object.prototype.hasOwnProperty.call(referenceCenters,id)?referenceCenters[id]:null}
