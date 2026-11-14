import {missionBaseline,baselineSources,designApproach,technicalProcesses,marginRules,policyValues,pdrEvidence,changeRules,massMargin,capacityMargin,resolveItemGrowth,responsibilityRoles,lifecyclePlan} from './mission-policy.js';
import {architectureProgramRecord,renderArchitectureProgram} from './architecture-program-view.js';
import {goldRules,reservedRules,goldInventory} from './mission-gold-rules.js';
import {buildEquipmentList} from './equipment-list.js';
import {sizingEnvelope} from './design.js';
import {retainFile} from './file-delivery.js';
import {assessPdrDomains,renderPdrRegister,pdrAssessmentHtml} from './pdr-assessment.js';
import {groundProcessingPlan,renderProcessingPlan} from './processing-plan.js';
import {launchGroundPlan,renderLaunchGroundPlan} from './launch-ground-plan.js';
import {buildElectricalProgram,electricalLifecycle} from './electrical-program.js';

const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const num=(value,places=2)=>Number.isFinite(value)?value.toLocaleString('en-US',{maximumFractionDigits:places}):'Unassessed';
const percent=value=>Number.isFinite(value)?num(value*100)+'%':'Unassessed';
const sourceLink=(id,label,page)=>{
  const source=baselineSources.find(s=>s.id===id);
  if(!source)return esc(label||id);
  const url=source.url+(page?'#page='+page:'');
  return '<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label||source.title)+' ↗</a>';
};
const dispositions={adopt:'Adopt',tailor:'Tailor',not_applicable:'Not applicable',conditional:'Conditional'};
const tone=key=>key==='adopt'?'adopt':key==='not_applicable'?'neutral':'review';
const badge=(text,type='neutral')=>'<span class="mb-badge" data-tone="'+esc(type)+'">'+esc(text)+'</span>';
const table=(heads,rows)=>'<div class="mb-table-scroll" tabindex="0" role="region" aria-label="'+esc(heads.join(', '))+'"><table><thead><tr>'+heads.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((c,i)=>'<'+(i?'td':'th scope="row"')+'>'+c+'</'+(i?'td':'th')+'>').join('')+'</tr>').join('')+'</tbody></table></div>';

export function filterGoldRules({query='',discipline='',disposition=''}={}){
  const tokens=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return goldRules.filter(r=>(!discipline||r.discipline===discipline)&&(!disposition||r.disposition===disposition)&&tokens.every(t=>[r.id,r.title,r.discipline,r.owner,r.rationale,r.pdrEvidence,r.laterEvidence].join(' ').toLowerCase().includes(t)));
}

export function baselineRecord(h,s=null,context={}){
  const equipment=buildEquipmentList(h,s),envelope=sizingEnvelope(h),d=h.input;
  const basicKg=equipment.totals.hardwareKg;
  const allowableDryKg=d.launchAllowanceKg-h.propellantKg-h.pressurantKg-d.adapterKg;
  const massScreen=massMargin(basicKg,h.dryKg,allowableDryKg);
  const powerScreen=capacityMargin(envelope.pdr.power.eolPowerAvailableKW,envelope.pdr.power.eolPowerBudgetKW);
  const maturity=equipment.rows.map(r=>({wbs:r.wbs,item:r.item,classification:r.classification,subsystem:r.subsystem,...r.maturity,referenceEvidence:r.evidence,referenceModel:r.referenceModel,referenceSource:r.sourceUrl,...resolveItemGrowth(r)}));
  return {
    schema:'odc-mission-baseline/1',baseline:missionBaseline,electricalEngineering:buildElectricalProgram(h),
    configuration:{purpose:d.aiPurpose,missionYears:d.missionYears,epoch:d.epoch,launcher:d.launcher,altitudeKm:d.altitudeKm,disposalMethod:d.disposalMethod,designInputs:{...d}},
    architectureProgram:architectureProgramRecord(h,s),groundProcessing:groundProcessingPlan(h),launchGround:launchGroundPlan(h),authority:baselineSources,designApproach,technicalProcesses,responsibilityRoles,lifecyclePlan,domainAssessments:assessPdrDomains({...context,h,s,envelope}),
    marginPolicy:{values:policyValues,rules:marginRules,control:changeRules},
    goldRules:{inventory:goldInventory,rules:goldRules,reserved:reservedRules},
    pdrEvidence,reviewStatus:'Open — PDR acceptance has not been recorded',
    currentAssessment:{
      mass:{status:'open',screen:massScreen,basicDryKg:basicKg,predictedDryKg:h.dryKg,allowableDryKg,provisionalGrowthKg:equipment.totals.growthKg,loadedPropellantKg:h.propellantKg,pressurantKg:h.pressurantKg,launchOnlyAdapterKg:d.adapterKg,launchAllowanceKg:d.launchAllowanceKg,reason:'Line-item MGA evidence and orbit-specific provider allocation are required. The current model includes a provisional whole-dry-mass allowance.'},
      power:{status:'open',screen:powerScreen,availableKW:envelope.pdr.power.eolPowerAvailableKW,budgetKW:envelope.pdr.power.eolPowerBudgetKW,installedAreaM2:h.solarM2,requiredAreaM2:envelope.solarDemandM2,policyRequiredAreaM2:envelope.solarNeeded,epoch:'End of selected mission life',reason:'Bus-side margin from the bounded EOL source, explicit conversion/harness losses and eclipse recharge requirement. Full seasonal mode coverage and verified source/load budgets remain required.'},
      propulsion:{status:'open',modelReserveFraction:d.reserveFraction,residualFraction:d.residualFraction,reason:'A configured reserve fraction is not the required mission-specific 3σ uncertainty analysis.'},
      maturity,unassessedGrowthItems:maturity.filter(r=>r.status==='unassessed').length
    }
  };
}

function overviewSection(record){
  return '<section class="mb-intro"><div><p class="mb-kicker">'+esc(missionBaseline.id)+' · REV '+esc(missionBaseline.revision)+' · '+esc(missionBaseline.date)+'</p><h2>A common basis for preliminary design</h2><p>'+esc(missionBaseline.scope)+'</p><p class="mb-emphasis">Target: PDR near the end of Phase B. The review demonstrates a credible design, adequate margins and a viable path to verification.</p></div><div class="mb-summary"><div><small>Review basis</small><strong>Late Phase B</strong><span>Preliminary Design Review</span></div><div><small>Goddard rules</small><strong>'+goldRules.length+' assessed</strong><span>Every active rule has a disposition</span></div><div><small>Margin authority</small><strong>Mission policy</strong><span>Read-only criteria, traced to sources</span></div><div><small>Evidence status</small><strong>Open</strong><span>Policy adoption is separate from verification</span></div></div></section>'
  +'<section class="mb-section"><h3>How this mission is designed</h3><p class="mb-muted">This is the mission’s concise systems engineering management plan. Each rule has an owner and a traceable work product.</p><div class="mb-approach">'+designApproach.map(r=>'<article><div class="mb-rule-number">'+esc(r.id)+'</div><div><h4>'+esc(r.title)+'</h4><p>'+esc(r.text)+'</p><small>'+esc(r.owner)+'</small></div></article>').join('')+'</div></section>'
  +'<section class="mb-section"><h3>Mission boundary and fixed architecture</h3><p>'+esc(missionBaseline.architecture)+'</p><p>'+esc(missionBaseline.simulationScope)+'</p><div class="mb-profile-list">'+missionBaseline.serviceProfiles.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div><p>'+esc(missionBaseline.sourceHierarchy||missionBaseline.authority)+'</p><p class="mb-muted">'+esc(missionBaseline.obligations||missionBaseline.authority)+'</p></section>'
  +'<details class="mb-disclosure"><summary>Selected mission configuration</summary>'+table(['Configuration item','Current design'],[['Service profile',esc(record.configuration.purpose)],['Mission life',esc(record.configuration.missionYears)+' years'],['Mission epoch',esc(record.configuration.epoch)],['Launch vehicle',esc(record.configuration.launcher)],['Orbit altitude',esc(record.configuration.altitudeKm)+' km'],['Disposal method',esc(record.configuration.disposalMethod)]])+'<p class="mb-muted">The JSON download and the full plan’s embedded record retain every normalized design input for this configuration. Changing the configuration requires reassessing applicability, budgets and evidence.</p></details>'
  +'<section class="mb-section"><h3>Domain responsibilities and interfaces</h3><p>'+esc(missionBaseline.domainPartition)+'</p><div class="mb-profile-list"><button type="button" class="btn" data-domain="avionics">Command &amp; Data Handling →</button><button type="button" class="btn" data-domain="data">Payload Data Handling →</button><button type="button" class="btn" data-domain="software">Flight Software →</button></div></section>'
  +'<section class="mb-section"><h3>Responsibilities and decisions</h3>'+table(['Role','Responsibility','Assignment'],responsibilityRoles.map(r=>[esc(r.role),esc(r.responsibility),esc(r.status)]))+'<p class="mb-muted">'+esc(missionBaseline.changeAuthority)+'</p></section>'
  +'<details class="mb-disclosure"><summary>Lifecycle plan · A through F</summary>'+table(['Phase','Technical focus','Evidence'],lifecyclePlan.map(r=>[esc(r.phase+' · '+r.title),esc(r.focus),esc(r.evidence)]))+'<p class="mb-muted">Workspace tabs organize design and simulation views. They do not declare that the corresponding lifecycle review has been passed.</p></details>'
  +'<details class="mb-disclosure"><summary>Electrical interfaces through phases A–F</summary>'+table(['Phase','Electrical work products'],electricalLifecycle.map(r=>[esc(r.phase+' · '+r.title),'<ul>'+r.deliverables.map(d=>'<li>'+esc(d)+'</li>').join('')+'</ul>']))+'<p>The current electrical baseline contains '+record.electricalEngineering.requirements.length+' requirements and '+record.electricalEngineering.plans.length+' verification activities. Its JSON record retains the source/load graph, mating definitions, harness schedule, numerical criteria and planned evidence.</p></details>'
  +'<details class="mb-disclosure"><summary>All 17 systems engineering processes</summary>'+table(['Process','Implementation in this mission'],technicalProcesses.map(r=>[esc((r.number||'')+' '+r.process)+'<small>'+esc(r.group||'')+'</small>',esc(r.implementation)]))+'<p>'+sourceLink('processes')+' · '+sourceLink('7123')+'</p></details>'
  +'<details class="mb-disclosure"><summary>Baseline change and exception control</summary><ol>'+changeRules.map(r=>'<li>'+esc(r)+'</li>').join('')+'</ol><p>'+esc(missionBaseline.configuration)+'</p><p class="mb-muted">'+esc(missionBaseline.naming)+'</p></details>';
}

function marginSection(record){
  const a=record.currentAssessment;
  return '<section class="mb-section"><div class="mb-section-head"><div><h2>Margin policy</h2><p>Resource boundaries, denominators and evidence are part of each rule. The scenario user does not set the required margin.</p></div>'+badge('PDR · late Phase B','adopt')+'</div>'
  +'<div class="mb-margin-cards">'+marginRules.slice(0,4).map(r=>'<article><small>'+esc(r.domain)+'</small><strong>'+esc(r.value)+'</strong><span>'+esc(r.basis)+'</span></article>').join('')+'</div>'
  +'<div class="mb-callout"><strong>One uncertainty, one allocation.</strong><p>Basic estimates, expected item growth, degradation, physical residuals, analysis uncertainty and unallocated mission headroom remain separately visible. A component’s maturity can reduce its justified growth allowance; it does not remove mission-level margin.</p></div>'
  +'<div class="mb-margin-list">'+marginRules.map(r=>'<article><div><p class="mb-kicker">'+esc(r.id)+' · '+esc(r.kind)+'</p><h3>'+esc(r.domain)+'</h3><strong>'+esc(r.value)+'</strong></div><div><p class="mb-formula">'+esc(r.formula)+'</p><p>'+esc(r.application)+'</p><details><summary>Evidence and interpretation</summary><p><b>Required evidence.</b> '+esc(r.evidence)+'</p><p>'+esc(r.caution)+'</p></details><small>'+sourceLink(r.source,r.basis,r.page)+'</small></div></article>').join('')+'</div></section>'
  +'<section class="mb-section"><h3>Current design · preliminary screens</h3><p>These calculations expose the present design and its evidence gaps. They are not a closed PDR compliance assessment.</p>'
  +table(['Resource','Current model result','Basis needed for closure'],[
    ['Dry mass','<strong>'+percent(a.mass.screen.fraction)+'</strong> headroom on basic dry mass<br>'+num(a.mass.basicDryKg)+' kg basic + '+num(a.mass.provisionalGrowthKg)+' kg provisional growth<br>'+num(a.mass.allowableDryKg)+' kg available to dry spacecraft',esc(a.mass.reason)],
    ['EOL power','<strong>'+percent(a.power.screen.fraction)+'</strong> representative sizing headroom<br>'+num(a.power.availableKW)+' kW available / '+num(a.power.budgetKW)+' kW required at the bus<br>'+num(a.power.installedAreaM2)+' m² installed array',esc(a.power.reason)],
    ['Propellant',num(a.propulsion.modelReserveFraction*100)+'% carried operational-reserve assumption<br>'+num(a.propulsion.residualFraction*100)+'% modeled trapped residual',esc(a.propulsion.reason)]
  ])+'<p class="mb-muted">The mass screen subtracts loaded liquids, helium and the launch-only adapter from the mission launch allowance before comparing dry mass. The power screen uses the existing sizing envelope at the selected mission lifetime.</p></section>'
  +'<section class="mb-section"><h3>Equipment maturity and growth assignment</h3><p>'+a.unassessedGrowthItems+' dry-hardware allocations need an item-specific growth basis. Flight and supplier references remain attached to the MEL; their readiness is not automatically assigned to the installed design.</p><p>The controlled assignment records hardware category, design maturity, fabrication status, reference applicability and evidence. If any required basis is missing, the result remains <strong>unassessed</strong>.</p><button type="button" class="btn" data-page="equipment">Open Master equipment list →</button><details><summary>Current item assessment register</summary>'+table(['WBS / allocation','Evidence on record','Growth assignment'],a.maturity.filter(r=>r.classification==='Hardware').map(r=>[esc(r.wbs+' · '+r.item),esc(r.referenceEvidence)+'<small>'+esc(r.referenceModel)+'</small>',badge(r.status==='assigned'?'Assigned':'Unassessed','review')+'<small>'+esc(r.mgaBasis||'Item basis required')+'</small>']))+'</details></section>';
}

function goldCards(rows){
  if(!rows.length)return '<p class="mb-empty">No rules match these filters.</p>';
  return rows.map(r=>'<details class="mb-gold-rule" data-rule-id="'+esc(r.id)+'"><summary><span class="mb-rule-id">'+esc(r.id)+'</span><span class="mb-gold-title">'+esc(r.title)+'<small>'+esc(r.discipline)+'</small></span>'+badge(dispositions[r.disposition]||r.disposition,tone(r.disposition))+'</summary><div class="mb-gold-body"><p>'+esc(r.rationale)+'</p><dl><div><dt>Required by PDR</dt><dd>'+esc(r.pdrEvidence)+'</dd></div><div><dt>Later verification</dt><dd>'+esc(r.laterEvidence)+'</dd></div><div><dt>Responsible role</dt><dd>'+esc(r.owner)+'</dd></div><div><dt>Evidence status</dt><dd>'+esc(r.closure==='not_applicable'?'Scope decision; reopen if the configuration changes':r.closure||'Open')+'</dd></div></dl><p>'+sourceLink('gold','GSFC-STD-1000I · Rule '+r.id,r.sourcePage)+'</p></div></details>').join('');
}

function goldSection(){
  const counts=Object.keys(dispositions).map(k=>({key:k,count:goldRules.filter(r=>r.disposition===k).length}));
  const disciplines=[...new Set(goldRules.map(r=>r.discipline))];
  return '<section class="mb-section"><div class="mb-section-head"><div><h2>Goddard Rules Register</h2><p>All '+goldRules.length+' active rules in Revision I, plus all '+reservedRules.length+' reserved number slots. Expand a rule for its mission decision, owner and evidence gates.</p></div>'+sourceLink('gold','Read the source standard')+'</div><div class="mb-counts">'+counts.map(r=>'<span>'+badge(dispositions[r.key],tone(r.key))+' <b>'+r.count+'</b></span>').join('')+'</div><p class="mb-muted">Adopt preserves the rule’s intent. Tailor records a mission-specific implementation or scope. Conditional retains a rule while its applicability trigger is resolved. Not applicable records a present scope exclusion. Later testing remains an obligation where the rule applies.</p>'
  +'<div class="mb-filterbar"><label>Find a rule<input type="search" data-gold-search placeholder="Rule ID, hardware, owner or topic" autocomplete="off"></label><label>Discipline<select data-gold-discipline><option value="">All disciplines</option>'+disciplines.map(x=>'<option>'+esc(x)+'</option>').join('')+'</select></label><label>Disposition<select data-gold-disposition><option value="">All dispositions</option>'+Object.entries(dispositions).map(([id,name])=>'<option value="'+id+'">'+name+'</option>').join('')+'</select></label></div><p class="mb-filter-status" data-gold-status role="status">'+goldRules.length+' of '+goldRules.length+' active rules</p><div data-gold-results>'+goldCards(goldRules)+'</div>'
  +'<details class="mb-disclosure"><summary>Reserved numbers · '+reservedRules.length+' slots with no active rule</summary><p>'+reservedRules.map(esc).join(' · ')+'</p><p>These numbers are retained for traceability to the source contents. They create no current requirement and are not counted as waived rules.</p></details></section>';
}

function evidenceSection(){
  return '<section class="mb-section"><h2>Evidence required for PDR</h2><p>Preliminary design is the current target. The package must support a credible decision to proceed with detailed design. Evidence remains open until it is reviewed for the controlled mission configuration.</p><div class="mb-callout"><strong>Review exit</strong><p>Requirements and interfaces are sufficiently mature; the selected design is expected to satisfy them with acceptable risk; resource margins are adequate; critical technologies have credible paths; integration and verification plans are baselined; and remaining actions have owners, resources and closure dates. The independent panel and mission decision authority record their decisions.</p></div>'
  +pdrEvidence.map(r=>'<article class="mb-evidence"><header><div><p class="mb-kicker">'+esc(r.id)+' · '+esc(r.owner)+'</p><h3>'+esc(r.product)+'</h3></div>'+badge('Evidence open','review')+'</header><div class="mb-evidence-grid"><div><h4>By PDR</h4><p>'+esc(r.now)+'</p></div><div><h4>At later gates</h4><p>'+esc(r.later)+'</p></div></div><p class="mb-evidence-state"><b>Present record.</b> '+esc(r.evidence)+'</p><small>Closure gate: '+esc(r.gate)+'</small></article>').join('')
  +'<p>'+sourceLink('pdr','NASA PDR criteria · §G.7 / Table G-6')+' · '+sourceLink('nid','Lifecycle management basis')+'</p></section>';
}

function referencesSection(){
  return '<section class="mb-section"><h2>Controlled source register</h2><p>'+esc(missionBaseline.authority)+'</p><p>The source register records the adopted editions and individual review dates. The baseline fixes the adopted revision. A later source change is assessed before updating mission rules.</p>'+baselineSources.map(s=>'<article class="mb-source"><div><span class="mb-rule-id">'+esc(s.id)+'</span><h3>'+sourceLink(s.id,s.title)+'</h3></div><p><strong>'+esc(s.revision)+'</strong> · '+esc(s.locator)+'</p><p>'+esc(s.use)+'</p>'+(s.status?'<small>'+esc(s.status)+'</small>':'')+'</article>').join('')+'</section>';
}

export function renderMissionBaseline(h,s=null,context={}){
  const record=baselineRecord(h,s,context);
  const tabs=[['approach','Design approach'],['architecture','Architecture & interfaces'],['processing','Ground processing'],['launch-ground','Launch sites & umbilicals'],['margins','Margins'],['domains','Domain assessments'],['rules','Goddard rules'],['evidence','PDR evidence'],['references','Sources']];
  return '<div class="mission-baseline" data-mission-baseline><div class="mb-toolbar"><div role="tablist" aria-label="Design rules and margins sections">'+tabs.map(([id,title],i)=>'<button type="button" role="tab" id="mb-tab-'+id+'" aria-controls="mb-panel-'+id+'" aria-selected="'+(!i)+'" tabindex="'+(i?-1:0)+'" data-mb-tab="'+id+'">'+title+'</button>').join('')+'</div><div class="mb-downloads"><a class="btn" data-mb-file="html" download="ODC-Mission-Baseline-Rev-C.html">Full plan ↓</a><a class="btn" data-mb-file="domains" download="ODC-Preliminary-Domain-Designs.html">Domain designs ↓</a><a class="btn" data-mb-file="json" download="ODC-Mission-Baseline-Rev-C.json">JSON ↓</a><a class="btn" data-mb-file="csv" download="ODC-Goddard-Rules-Rev-C.csv">Rules CSV ↓</a></div></div>'
  +tabs.map(([id],i)=>'<div id="mb-panel-'+id+'" role="tabpanel" aria-labelledby="mb-tab-'+id+'"'+(i?' hidden':'')+'>' +({approach:()=>overviewSection(record),architecture:()=>renderArchitectureProgram(record),processing:()=>renderProcessingPlan(record.groundProcessing),'launch-ground':()=>renderLaunchGroundPlan(record.launchGround),margins:()=>marginSection(record),domains:()=>renderPdrRegister(record.domainAssessments),rules:goldSection,evidence:evidenceSection,references:referencesSection}[id]())+'</div>').join('')+'</div>';
}

const csv=rows=>{
  const keys=Array.from(new Set(rows.flatMap(Object.keys))),cell=value=>'"'+String(value==null?'':typeof value==='object'?JSON.stringify(value):value).replaceAll('"','""')+'"';
  return [keys.map(cell),...rows.map(r=>keys.map(k=>cell(r[k])))].map(r=>r.join(',')).join('\r\n');
};
export const goldRulesCsv=()=>csv(goldRules.map(r=>({...r,sourceRevision:'GSFC-STD-1000I',sourceUrl:goldInventory.sourceUrl+'#page='+r.sourcePage,policyRevision:missionBaseline.id+' Rev '+missionBaseline.revision})));

export function baselineHtml(record){
  const body=overviewSection(record)+renderArchitectureProgram(record)+renderProcessingPlan(record.groundProcessing)+(record.launchGround?renderLaunchGroundPlan(record.launchGround):'')+marginSection(record)+evidenceSection()+'<section class="mb-section"><h2>Complete Goddard Rules Register</h2>'+table(['Rule / disposition','Mission decision','PDR evidence','Later evidence / owner'],goldRules.map(r=>[esc(r.id+' · '+r.title)+'<br>'+esc(dispositions[r.disposition])+'<br>'+sourceLink('gold','Source',r.sourcePage),esc(r.rationale),esc(r.pdrEvidence),esc(r.laterEvidence)+'<small>'+esc(r.owner)+'</small>']))+'<h3>Reserved numbers</h3><p>'+reservedRules.map(esc).join(' · ')+'</p></section>'+referencesSection();
  const style='body{margin:0;background:#fff;color:#182b35;font:15px/1.55 system-ui,sans-serif}.mission-baseline{max-width:1100px;margin:auto;padding:32px}h1{font-size:32px;line-height:1.2}h2{font-size:25px}h3{font-size:19px}h4{font-size:15px}a{color:#13636b}small{display:block;color:#52616b}.mb-kicker{font-size:12px;letter-spacing:.08em;color:#49646c}.mb-section{margin:30px 0;border-top:1px solid #b6c5cb;padding-top:18px}.mb-approach article,.mb-margin-list article,.mb-evidence,.mb-source{border-top:1px solid #d6dfe3;padding:13px 0}.mb-rule-number,.mb-rule-id{font-family:ui-monospace,monospace;color:#5a6545}.mb-summary,.mb-margin-cards,.mb-evidence-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.mb-summary>div,.mb-margin-cards>article{padding:12px;background:#edf3f3}.mb-summary strong,.mb-margin-cards strong{display:block;font-size:21px}.mb-summary span{display:block}.mb-callout{padding:14px;background:#edf4f2;border-left:4px solid #3a7067}.mb-formula{font-family:ui-monospace,monospace;background:#edf3f5;padding:10px}.mb-muted{color:#52616b}.mb-profile-list span{display:inline-block;margin:3px 10px 3px 0}.mb-badge{display:inline-block;font-size:12px;padding:3px 6px;border:1px solid #a4b8bb;border-radius:4px}.mb-disclosure{margin:14px 0}summary{font-weight:600;cursor:pointer}table{border-collapse:collapse;width:100%;font-size:12px;table-layout:fixed}td,th{padding:8px;border-bottom:1px solid #ccd7dc;text-align:left;vertical-align:top;overflow-wrap:anywhere}thead th{background:#edf3f5}th:first-child{width:22%}p{margin:8px 0}li{margin:8px 0}.mb-evidence-state{background:#f1f3f4;padding:10px}.mb-interface-figures figure{margin:24px 0}.mb-interface-figures figcaption{font-weight:650;margin-bottom:8px}.mb-interface-figures svg{display:block;width:100%;height:auto}.mb-interface-figures figure{break-inside:avoid}button{display:none}@media print{body{font-size:10pt}.mission-baseline{padding:0}.mb-section{break-inside:auto}h2,h3,h4,summary{break-after:avoid}tr,.mb-approach article,.mb-margin-list article,.mb-evidence{break-inside:avoid}thead{display:table-header-group}details>*{display:block!important}a{color:inherit}}';
  // Export every disclosure expanded; the downloaded plan is complete offline.
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ODC Design Rules &amp; Margins · Rev C</title><style>'+style+'</style><main class="mission-baseline"><h1>Orbital Data Center · Design rules &amp; margins</h1><p>'+esc(missionBaseline.id+' Rev '+missionBaseline.revision+' · '+missionBaseline.date)+'</p><p>'+esc(missionBaseline.authority)+'</p>'+body.replaceAll('<details','<details open')+'</main><script type="application/json" id="odc-mission-baseline-record">'+JSON.stringify(record).replaceAll('<','\\u003c')+'</script></html>';
}

export function bindMissionBaseline(container,h,s=null,context={}){
  const root=container.querySelector('[data-mission-baseline]');if(!root)return;
  const record=baselineRecord(h,s,context),tabs=[...root.querySelectorAll('[data-mb-tab]')];
  const selectTab=button=>{
    for(const tab of tabs){const selected=tab===button;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;root.querySelector('#mb-panel-'+tab.dataset.mbTab).hidden=!selected;}
  };
  tabs.forEach((button,i)=>{
    button.addEventListener('click',()=>selectTab(button));
    button.addEventListener('keydown',event=>{
      let index;if(event.key==='ArrowRight')index=(i+1)%tabs.length;else if(event.key==='ArrowLeft')index=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')index=0;else if(event.key==='End')index=tabs.length-1;else return;
      event.preventDefault();selectTab(tabs[index]);tabs[index].focus();
    });
  });
  const search=root.querySelector('[data-gold-search]'),discipline=root.querySelector('[data-gold-discipline]'),disposition=root.querySelector('[data-gold-disposition]');
  const filter=()=>{
    const rows=filterGoldRules({query:search.value,discipline:discipline.value,disposition:disposition.value});
    root.querySelector('[data-gold-results]').innerHTML=goldCards(rows);
    root.querySelector('[data-gold-status]').textContent=rows.length+' of '+goldRules.length+' active rules';
  };
  search.addEventListener('input',filter);discipline.addEventListener('change',filter);disposition.addEventListener('change',filter);
  const files=[['domains','text/html;charset=utf-8',pdrAssessmentHtml(record.domainAssessments),'ODC-Preliminary-Domain-Designs.html'],['html','text/html;charset=utf-8',baselineHtml(record),'ODC-Mission-Baseline-Rev-C.html'],['json','application/json',JSON.stringify(record,null,2),'ODC-Mission-Baseline-Rev-C.json'],['csv','text/csv;charset=utf-8',goldRulesCsv(),'ODC-Goddard-Rules-Rev-C.csv']];
  for(const [key,type,body,name] of files){const link=root.querySelector('[data-mb-file="'+key+'"]');link.href=retainFile('mission-baseline-'+key,new Blob([body],{type}),name).url;}
}
