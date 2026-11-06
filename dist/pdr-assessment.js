import {assessFlightDomains} from './pdr-flight.js';
import {assessResourceDomains} from './pdr-resources.js';
import {assessServiceDomains} from './pdr-service.js';
import {designIdentity} from './design-contract.js';
import {missionBaseline} from './mission-policy.js';
import {goldRules,goldInventory} from './mission-gold-rules.js';
import {sizingEnvelope} from './design.js';
import {architectureApplicability} from './architecture-trades.js';

export const pdrDomainOrder=Object.freeze(['conops','purpose','environment','orbit','compute','data','comm','power','thermal','attitude','prop','mass','launch','launcher','mechanical','avionics','software']);
const domainOwners={conops:'Mission / operations lead',purpose:'Mission / service lead',environment:'Environment / assurance lead',orbit:'Flight dynamics lead',compute:'Compute payload lead',data:'Data handling lead',comm:'Communications lead',power:'Electrical power lead',thermal:'Thermal lead',attitude:'Attitude control lead',prop:'Propulsion lead',mass:'Mass properties / systems lead',launch:'Launch interface lead',launcher:'Launch integration lead',mechanical:'Mechanical / structures lead',avionics:'Avionics / parts assurance lead',software:'Flight software lead'};
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const number=value=>value===Infinity?'Not limiting':Number.isFinite(value)?(value!==0&&Math.abs(value)<.001?value.toExponential(2):value.toLocaleString('en-US',{maximumFractionDigits:3})):typeof value==='string'?value:'Unassessed';
const labels={meets:'Screen meets',shortfall:'Shortfall',unassessed:'Unassessed',not_applicable:'Not applicable'};
const scopeLabels={inside:'Inside allocated bounds',outside:'Outside allocated bounds',unassessed:'Applicability unassessed'};
// A model boundary applies only to the discipline using that model. In
// particular, extrapolated drag does not invalidate installed compute hardware.
const allArchitecture=['trays','electronics','wing-span','wing-width','radiator-span','radiator-width','core-length','mission-life','drag-perigee','drag-apogee','drag-eccentricity','cmg-catalogue'];
const hardwareArchitecture=allArchitecture.filter(id=>!id.startsWith('drag-')&&id!=='mission-life');
const electricalInterfaces=['energy-family','energy-mppt','energy-payload','energy-service','energy-distribution','energy-harness'];
const thermalInterfaces=['thermal-flow','thermal-velocity','thermal-pressure','thermal-expansion'];
export const pdrApplicabilityMap=Object.freeze({
 conops:{architecture:allArchitecture,energy:[...electricalInterfaces,...thermalInterfaces],fabric:true,route:true},
 purpose:{architecture:['trays','electronics','core-length','mission-life'],energy:['energy-family','energy-payload'],fabric:true,route:true},
 environment:{architecture:['mission-life','drag-perigee','drag-apogee','drag-eccentricity']},
 orbit:{architecture:['mission-life','drag-perigee','drag-apogee','drag-eccentricity']},
 compute:{architecture:['trays','electronics','core-length','mission-life'],energy:['energy-family','energy-payload'],fabric:true,compute:true},
 data:{architecture:['trays','core-length','mission-life'],fabric:true,route:true},
 comm:{architecture:['core-length','mission-life'],energy:['energy-service'],route:true},
 power:{architecture:['electronics','wing-span','wing-width','core-length','mission-life'],energy:electricalInterfaces},
 thermal:{architecture:['electronics','radiator-span','radiator-width','core-length','mission-life'],energy:['energy-family',...thermalInterfaces]},
 attitude:{architecture:['wing-span','wing-width','radiator-span','radiator-width','core-length','cmg-catalogue','mission-life'],energy:['energy-service']},
 prop:{architecture:['core-length','cmg-catalogue','mission-life','drag-perigee','drag-apogee','drag-eccentricity'],energy:['energy-service']},
 mass:{architecture:hardwareArchitecture,energy:[...electricalInterfaces,...thermalInterfaces],fabric:true},
 launch:{architecture:hardwareArchitecture},
 launcher:{architecture:['wing-span','wing-width','radiator-span','radiator-width','core-length']},
 mechanical:{architecture:[...hardwareArchitecture,'mission-life']},
 avionics:{architecture:['mission-life'],energy:['energy-service']},
 software:{architecture:['mission-life']}
});
for(const mapping of Object.values(pdrApplicabilityMap)){for(const value of Object.values(mapping))if(Array.isArray(value))Object.freeze(value);Object.freeze(mapping);}

/** Domain-specific study / installed-interface coverage. Evidence stays separate. */
export function domainApplicability(h,id,report={}){
 const mapping=pdrApplicabilityMap[id];if(!mapping)throw Error('Unknown applicability domain: '+id);
 const base=h.applicability||architectureApplicability(h),energy=h.energySystem,service=h.serviceArchitecture,checks=[];
 const status=within=>within===true?'inside':within===false?'outside':'unassessed';
 const missing=(key,label,source,kind)=>({id:key,label,status:'unassessed',actual:null,minimum:null,maximum:null,unit:'',kind,source,basis:'The required controlled allocation or installed interface record is unavailable.'});
 for(const key of mapping.architecture){
  const row=base.checks?.find(c=>c.id===key);
  checks.push(row?{...row,source:base.referenceId||'ODC-DRM-001',status:Object.hasOwn(scopeLabels,row.status)?row.status:'unassessed'}:missing(key,key,base.referenceId||'ODC-DRM-001','study'));
 }
 for(const key of mapping.energy||[]){
  const row=energy?.checks?.find(c=>c.id===key),lower=row&&['≥','>='].includes(row.operator);
  checks.push(row?{id:key,label:row.label,actual:row.actual,minimum:lower?row.required:null,maximum:lower?null:row.required,unit:row.unit,kind:'installed interface',source:energy.revision,status:row.status==='meets'?'inside':row.status==='shortfall'?'outside':'unassessed',basis:row.basis}:missing(key,key,energy?.revision||'ODC-ENERGY-001','installed interface'));
 }
 if(mapping.fabric){
  if(service?.fabric?.limits?.length)for(const row of service.fabric.limits)checks.push({id:row.id,label:row.label,actual:row.actual,minimum:null,maximum:row.limit,unit:row.unit,kind:'fabric interface',source:service.revision,status:status(row.within),basis:'Selected port class, finite switch topology and routed core-length allocation. Protocol efficiency is distinct from NASA margins and measured flight performance.'});
  else checks.push(missing('fabric-allocation','Payload fabric allocation',service?.revision||'ODC-SA-001','fabric interface'));
 }
 if(mapping.compute){
  const c=service?.compute,known=typeof c?.knownProfile==='boolean'&&typeof c?.referenceMatch==='boolean';
  checks.push({id:'compute-reference',label:'Selected compute reference applicability',actual:known?Number(c.knownProfile&&c.referenceMatch):null,minimum:1,maximum:1,unit:'reference match',kind:'component reference',source:service?.revision||'ODC-SA-001',status:known?status(c.knownProfile&&c.referenceMatch):'unassessed',basis:c?.evidence||'A complete compute tray reference is required. A source match does not qualify its flight adaptation.'});
 }
 if(mapping.route){
  const route=service?.route,terminal=service?.terminal,valid=route&&['direct','relay','hybrid'].includes(route.id);
  checks.push({id:'service-route-model',label:'Selected Earth-service route model',actual:route?.id??null,minimum:null,maximum:null,unit:'',kind:'service model',source:service?.revision||'ODC-SA-001',status:route?status(valid):'unassessed',basis:route?.usesRelay?route.scenario:valid?'Orbit-derived direct contacts with the selected terminal, acquisition and ground-station allocation. Site availability and service agreements remain separate evidence.':'The selected direct or relay route model is unavailable.'});
  if(route?.usesRelay){
   for(const direction of ['Up','Down'])checks.push({id:'relay-'+direction.toLowerCase()+'-interface',label:'Relay '+direction.toLowerCase()+'link within installed modem allocation',actual:route['requested'+direction+'Mbps'],minimum:0,maximum:terminal?.['relay'+direction+'CapMbps']??null,unit:'Mbit/s',kind:'terminal interface',source:terminal?.id||'ODC-COM-ICD-01',status:status(Number.isFinite(route['requested'+direction+'Mbps'])&&Number.isFinite(terminal?.['relay'+direction+'CapMbps'])?route['requested'+direction+'Mbps']<=terminal['relay'+direction+'CapMbps']:null),basis:'Requested service allocation is compared with the selected modem customer-rate cap. Provider access and compatibility are evidence tasks.'});
   checks.push({id:'relay-geometry-model',label:'Relay receiver geometry applicability',actual:null,minimum:null,maximum:null,unit:'',kind:'service model',source:terminal?.id||'ODC-COM-ICD-01',status:'unassessed',basis:'The repeatable access cycle has no selected receiver ephemeris, occultation or field-of-regard analysis. The current relay service is a bounded scheduling sensitivity.'});
  }
  if(route?.opticalDirect)checks.push({id:'optical-weather-model',label:'Optical ground-service availability',actual:null,minimum:null,maximum:null,unit:'',kind:'service model',source:terminal?.id||'ODC-COM-ICD-01',status:'unassessed',basis:'Direct optical propagation is a clear-sky case. Cloud, correlated-site availability and diversity need the selected ground-network data.'});
 }
 // The thermal property correlation has a narrower scope than its rated pipe
 // or pump. A calculated temperature outside it does not inherit liquid data.
 if(id==='thermal'){
  const row=report.checks?.find(c=>c.id==='thermal-fluid-properties');
  checks.push(row?{id:row.id,label:row.label,actual:row.actual,minimum:0,maximum:null,unit:row.unit,kind:'property model',source:energy?.revision||'ODC-ENERGY-001',status:row.status==='meets'?'inside':Number.isFinite(row.actual)&&row.actual<0?'outside':'unassessed',basis:row.basis}:missing('thermal-fluid-properties','Fluid-property model coverage',energy?.revision||'ODC-ENERGY-001','property model'));
 }
 const counts=Object.fromEntries(Object.keys(scopeLabels).map(s=>[s,checks.filter(c=>c.status===s).length]));
 const overall=counts.outside?'outside':counts.unassessed||!checks.length?'unassessed':'inside';
 return {schema:'odc-domain-applicability/1',domain:id,referenceId:base.referenceId||'ODC-DRM-001',status:overall,label:scopeLabels[overall],counts,checks,basis:'Only domain-relevant project study limits, installed interface allocations and model support are included. Inside these bounds does not establish hardware qualification or independent review acceptance.',evidenceStatus:'open'};
}
const ruleLink=id=>{
  const row=goldRules.find(r=>r.id===id);
  return row?'<a href="'+goldInventory.sourceUrl+'#page='+row.sourcePage+'" target="_blank" rel="noopener noreferrer">GOLD '+esc(id)+' ↗</a>':esc(id);
};
const statusBadge=(status,label=labels[status]||status)=>'<span class="pdr-status" data-status="'+esc(status)+'">'+esc(label)+'</span>';

export function assessPdrDomains(context){
  const h=context.h||context.hardware;if(!h)throw Error('An installed spacecraft is required for PDR assessment');
  const ctx={...context,h,s:context.s||context.state||null,envelope:context.envelope||sizingEnvelope(h),view:context.view||{},day:context.day||null};
  const reports={...assessFlightDomains(ctx),...assessResourceDomains(ctx),...assessServiceDomains(ctx)},identity=designIdentity(h);
  const requested=context.domainIds||pdrDomainOrder;
  if(requested.some(id=>!pdrDomainOrder.includes(id)))throw Error('Unknown PDR domain selection');
  const domains=pdrDomainOrder.filter(id=>requested.includes(id)).map(id=>{
    const report=reports[id];if(!report)throw Error('Missing PDR design domain: '+id);
    const owner=domainOwners[id],checks=(report.checks||[]).map(c=>({...c,status:Object.hasOwn(labels,c.status)?c.status:'unassessed',ruleIds:c.ruleIds||[],owner:c.owner||owner,verificationMethod:c.verificationMethod||(c.actual!=null&&c.required!=null?'Preliminary analysis':'Technical evidence review')}));
    const counts=Object.fromEntries(Object.keys(labels).map(status=>[status,checks.filter(c=>c.status===status).length]));
    const reviewActions=(report.pdrNow||[]).map((description,index)=>({id:id+'-PDR-'+String(index+1).padStart(2,'0'),description,owner,gate:'PDR',status:'open',closureEvidence:null}));
    const applicability=domainApplicability(h,id,report),numericalStatus=counts.shortfall?'shortfall':counts.meets?'meets':'unassessed';
    const supplementalGraphics=(report.supplementalGraphics||[]).map(g=>({id:String(g.id),title:String(g.title),svg:g.svg}));
    return {...report,id,owner,ownerAssignment:'Role defined; individual assignment open',checks,counts,reviewActions,supplementalGraphics,applicability,numericalStatus,numericalScope:'Aggregates the assessed comparisons only. Unassessed checks and physical verification are reported separately; a known screen meeting its threshold is not whole-domain closure.',evidenceStatus:'open',evidence:{status:'open',unassessedChecks:counts.unassessed,openPdrActions:reviewActions.length,independentAcceptance:'unrecorded'},screenStatus:counts.shortfall?'shortfall':counts.unassessed?'unassessed':'meets',reviewStatus:'Open — independent acceptance has not been recorded',vehicleId:identity.vehicleId,missionId:identity.missionId};
  });
  return {schema:'odc-pdr-domain-assessments/1',baseline:{id:missionBaseline.id,revision:missionBaseline.revision},identity,configuration:{...h.input},scope:{instantSeconds:Number.isFinite(ctx.s?.t)?ctx.s.t:null,missionYears:h.input.missionYears,windowStartSeconds:ctx.view.start??null,chronologicalMission:!!ctx.sim?.audit,method:'Preliminary analyses of the installed vehicle in the selected mission. Numerical capability, domain-specific study/interface applicability and evidence/acceptance are reported separately.'},reviewStatus:'Open — PDR acceptance is an independent recorded decision',domains};
}

function checkRows(checks){
  return checks.map(c=>{
    const known=c.actual!=null&&c.required!=null;
    const compare=known?esc(number(c.actual))+' <span class="pdr-operator">'+esc(c.operator||'vs')+'</span> '+esc(number(c.required))+' '+esc(c.unit||''):c.actual!=null?esc(number(c.actual))+' '+esc(c.unit||''):c.required!=null?'Required '+esc(c.operator||'')+' '+esc(number(c.required))+' '+esc(c.unit||''):'Basis required';
    return '<tr data-status="'+c.status+'"><th scope="row"><strong>'+esc(c.label)+'</strong><small>'+esc(c.id)+'</small></th><td class="pdr-comparison">'+compare+'</td><td>'+statusBadge(c.status)+'</td><td><p>'+esc(c.basis||'')+'</p>'+(c.evidence?'<small>'+esc(c.evidence)+'</small>':'')+'<div class="pdr-rule-links">'+c.ruleIds.map(ruleLink).join(' · ')+'</div></td></tr>';
  }).join('');
}
function checksTable(checks){return '<div class="pdr-table-scroll" tabindex="0" role="region" aria-label="Preliminary design assessments"><table class="pdr-checks"><thead><tr><th scope="col">Requirement / check</th><th scope="col">Calculated / required</th><th scope="col">Result</th><th scope="col">Basis and evidence</th></tr></thead><tbody>'+checkRows(checks)+'</tbody></table></div>';}

function applicabilityBadge(status){return '<span class="pdr-status pdr-applicability-status" data-applicability="'+esc(status)+'">'+esc(scopeLabels[status]||scopeLabels.unassessed)+'</span>';}
function applicabilityDetails(applicability,{exported=false}={}){
 const a=applicability;if(!a)return '';
 const limit=c=>c.minimum!=null&&c.maximum!=null?c.minimum===c.maximum?number(c.minimum):number(c.minimum)+'–'+number(c.maximum):c.minimum!=null?'≥ '+number(c.minimum):c.maximum!=null?'≤ '+number(c.maximum):'Stated model scope';
 const rows=a.checks.map(c=>'<tr data-applicability="'+esc(c.status)+'"><th scope="row"><strong>'+esc(c.label)+'</strong><small>'+esc(c.kind)+' · '+esc(c.id)+'</small></th><td>'+esc(number(c.actual))+(c.unit?' '+esc(c.unit):'')+'<small>Boundary: '+esc(limit(c))+(c.unit?' '+esc(c.unit):'')+'</small></td><td>'+applicabilityBadge(c.status)+'</td><td><p>'+esc(c.basis)+'</p><small>'+esc(c.source)+'</small></td></tr>').join('');
 return '<details class="pdr-detail pdr-applicability-detail"'+(exported?' open':'')+'><summary>Study and interface applicability · '+a.counts.outside+' outside / '+a.counts.unassessed+' unassessed</summary><p class="pdr-applicability-note">'+esc(a.basis)+'</p><div class="pdr-table-scroll" tabindex="0" role="region" aria-label="Domain study and interface applicability"><table class="pdr-checks pdr-applicability-table"><thead><tr><th scope="col">Applicable boundary</th><th scope="col">Current / allocated</th><th scope="col">Applicability</th><th scope="col">Model or hardware scope</th></tr></thead><tbody>'+rows+'</tbody></table></div></details>';
}
function statusReadouts(report){
 const c=report.counts,a=report.applicability,numeric=report.numericalStatus||(c.shortfall?'shortfall':c.meets?'meets':'unassessed');
 const summary=c.shortfall?c.shortfall+' screened shortfall'+(c.shortfall===1?'':'s'):c.meets?'Known screens meet':'Numerical assessment pending';
 return '<div class="pdr-status-readouts"><section data-pdr-status-axis="numerical" data-status="'+numeric+'"><h3>Numerical capability</h3><strong>'+esc(summary)+'</strong><p>'+c.meets+' meet · '+c.shortfall+' shortfall · '+c.unassessed+' checks unassessed</p></section><section data-pdr-status-axis="applicability" data-applicability="'+esc(a?.status||'unassessed')+'"><h3>Study / interface applicability</h3><strong>'+esc(a?.label||scopeLabels.unassessed)+'</strong><p>'+(a?a.counts.inside+' inside · '+a.counts.outside+' outside · '+a.counts.unassessed+' unassessed':'Domain boundary record required')+'</p></section><section data-pdr-status-axis="evidence" data-evidence="open"><h3>Evidence and acceptance</h3><strong>Evidence open</strong><p>Independent PDR acceptance unrecorded</p></section></div>';
}

export function renderPdrDomain(report,record,{compact=false,exported=false}={}){
  const c=report.counts;
  const facts=(report.design||[]).slice(0,compact?4:6);
  const ordered=[...report.checks.filter(x=>x.status==='shortfall'),...report.checks.filter(x=>x.status!=='shortfall')];
  const primary=exported?ordered:ordered.slice(0,Math.max(4,c.shortfall)),more=exported?[]:ordered.slice(primary.length);
  const part='<header class="pdr-heading"><div><p class="pdr-kicker">DESIGN & MARGIN ASSESSMENT</p>'+(exported?'<h2>'+esc(report.title)+'</h2>':'')+'<p>'+esc(report.designSummary)+'</p></div></header>'
  +'<div class="pdr-configuration"><span>Vehicle <b>'+esc(record.identity.vehicleId)+'</b></span><span>Mission <b>'+esc(record.identity.missionId)+'</b></span><span>Basis <b>'+esc(record.identity.analysisId)+'</b></span><span>'+esc(missionBaseline.id)+' Rev '+esc(missionBaseline.revision)+'</span><span>Assessment MET '+esc(number(record.scope.instantSeconds))+' s</span>'+(exported?'':'<button type="button" class="textbutton" data-page="mission">Design rules ↗</button>')+'</div>'
  +statusReadouts(report)
  +(report.graphic?'<figure class="pdr-engineering-graphic">'+report.graphic+'</figure>':'')
  +(report.supplementalGraphics||[]).map(g=>'<figure class="pdr-engineering-graphic pdr-supplemental-graphic" data-pdr-supplemental="'+esc(g.id)+'"><figcaption>'+esc(g.title)+'</figcaption>'+g.svg+'</figure>').join('')
  +'<dl class="pdr-design-facts">'+facts.map(x=>'<div><dt>'+esc(x.label)+'</dt><dd>'+esc(number(x.value))+' <em>'+esc(x.unit||'')+'</em></dd><small>'+esc(x.basis||'')+'</small></div>').join('')+'</dl>'
  +checksTable(primary)
  +(more.length?'<details class="pdr-detail"><summary>All '+report.checks.length+' design assessments</summary>'+checksTable(more)+'</details>':'')
  +applicabilityDetails(report.applicability,{exported})
  +'<details class="pdr-detail"'+(exported?' open':'')+'><summary>Design basis, interfaces and review evidence</summary>'
  +'<p class="pdr-owner">Responsible role: '+esc(report.owner)+'. '+esc(report.ownerAssignment)+'.</p><div class="pdr-gates"><section><h3>Required for PDR</h3><ul>'+(report.pdrNow||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></section><section><h3>At later gates</h3><ul>'+(report.later||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></section></div>'
  +((report.limitations||[]).length?'<h3>Analysis scope</h3><ul>'+(report.limitations||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'')
  +'<div class="pdr-interfaces">'+(report.interfaces||[]).map(x=>exported?'<span>'+esc(x.label)+'</span>':'<button type="button" class="chip" data-domain="'+esc(x.domain)+'">'+esc(x.label)+' →</button>').join('')+'</div></details>';
  return '<section class="pdr-domain" id="pdr-domain-'+esc(report.id)+'" data-pdr-domain="'+esc(report.id)+'">'+part+'</section>';
}

export function renderPdrRegister(record,{exported=false}={}){
  const rows=record.domains.map((r,i)=>{
   const name=String(i+1).padStart(2,'0')+' · '+esc(r.title),domain=exported?'<a href="#pdr-domain-'+esc(r.id)+'">'+name+'</a>':'<button type="button" class="textbutton" data-pdr-open-domain="'+esc(r.id)+'">'+name+' →</button>';
   return '<tr><th scope="row">'+domain+'</th><td>'+statusBadge(r.numericalStatus||r.screenStatus,r.numericalStatus==='meets'?'Known screens meet':labels[r.numericalStatus||r.screenStatus])+'<small>'+r.counts.meets+' meet / '+r.counts.shortfall+' shortfall / '+r.counts.unassessed+' unassessed</small></td><td>'+applicabilityBadge(r.applicability?.status||'unassessed')+'<small>'+(r.applicability?r.applicability.counts.outside+' outside / '+r.applicability.counts.unassessed+' unassessed':'Boundary record required')+'</small></td><td><span class="pdr-status" data-evidence="open">Evidence open</span><small>PDR acceptance unrecorded</small></td></tr>';
  }).join('');
  return '<section class="mb-section pdr-register"><h2>Domain design assessments</h2><p>Each domain uses the same installed vehicle, mission inputs and controlled policy. Numerical capability, domain-relevant study/interface applicability and evidence are separate review questions. A changed mission can exceed a capability or a model boundary without resizing the spacecraft.</p><div class="pdr-configuration"><span>Vehicle <b>'+esc(record.identity.vehicleId)+'</b></span><span>Mission <b>'+esc(record.identity.missionId)+'</b></span></div><div class="pdr-table-scroll"><table class="pdr-checks pdr-register-table"><thead><tr><th scope="col">Domain</th><th scope="col">Numerical capability</th><th scope="col">Study / interface applicability</th><th scope="col">Evidence and acceptance</th></tr></thead><tbody>'+rows+'</tbody></table></div><p class="mb-muted">Inside the allocated study bounds does not establish qualification. A numerical screen does not close component heritage, uncertainty, provider or verification evidence.</p></section>';
}

export function pdrAssessmentHtml(record){
  const style='body{font:15px/1.5 system-ui,sans-serif;color:#182b35;margin:32px auto;max-width:1200px;padding:0 24px}h1,h2,h3{line-height:1.25}.pdr-domain{margin:36px 0;border-top:2px solid #bdcdd1;padding-top:20px}.pdr-kicker{font-size:11px;letter-spacing:.1em}.pdr-configuration,.pdr-design-facts,.pdr-gates{display:flex;gap:18px;flex-wrap:wrap}.pdr-design-facts>div{flex:1;min-width:150px}.pdr-design-facts dd{font-size:23px;margin:0}.pdr-design-facts em{font-size:13px}small{display:block;color:#52616b}table{border-collapse:collapse;width:100%;font-size:12px}th,td{padding:10px;border-bottom:1px solid #cbd6db;text-align:left;vertical-align:top}th:first-child{width:22%}p{margin:4px 0 9px}a{color:#185a67}.pdr-engineering-graphic{background:#111c23;border-radius:8px;padding:12px;margin:18px 0;color:#d8e4e8}.pdr-engineering-graphic svg{display:block;width:100%;height:auto}.pdr-status{font-weight:650}[data-status="shortfall"]>.pdr-status,[data-status="shortfall"]>strong{color:#a73535}.pdr-interfaces{display:flex;gap:10px}details{margin:16px 0}button{display:none}@media print{body{font-size:10pt;padding:0}tr,figure{break-inside:avoid}h2,h3{break-after:avoid}thead{display:table-header-group}}';
  const statusStyle='.pdr-status-readouts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0}.pdr-status-readouts section{border:1px solid #bdcdd1;border-left:3px solid #6d8d9d;border-radius:5px;padding:14px}.pdr-status-readouts h3{font-size:12px;margin:0 0 8px}.pdr-status-readouts strong{font-size:15px}.pdr-status-readouts p{font-size:11px;margin:6px 0 0}.pdr-status-readouts [data-status="shortfall"],.pdr-status-readouts [data-applicability="outside"]{border-left-color:#ac5a43}.pdr-status-readouts [data-evidence="open"]{border-left-color:#a98036}.pdr-status[data-applicability="inside"]{color:#275d75}.pdr-status[data-applicability="outside"]{color:#a64c36}.pdr-status[data-applicability="unassessed"],.pdr-status[data-evidence="open"]{color:#876317}.pdr-supplemental-graphic figcaption{font-size:13px;font-weight:650;margin:0 0 12px}.pdr-applicability-note{font-size:12px;margin:12px 0}.pdr-table-scroll{overflow-x:auto}.pdr-register-table{min-width:720px}.pdr-register-table th,.pdr-register-table td{width:25%}.pdr-applicability-status{white-space:normal}@media(max-width:700px){.pdr-status-readouts{grid-template-columns:1fr}body{padding:0 15px}.pdr-engineering-graphic{overflow-x:auto}.pdr-engineering-graphic svg{min-width:620px}}@media print{.pdr-status-readouts{grid-template-columns:repeat(3,minmax(0,1fr));break-inside:avoid}.pdr-engineering-graphic svg{min-width:0}.pdr-register-table{min-width:0}}';
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ODC preliminary domain designs</title><style>'+style+statusStyle+'</style><h1>Orbital Data Center · Preliminary domain designs</h1><p>'+esc(record.baseline.id+' Rev '+record.baseline.revision)+' · '+esc(record.identity.vehicleId)+' · '+esc(record.identity.missionId)+'</p><p>'+esc(record.scope.method)+'</p>'+renderPdrRegister(record,{exported:true})+record.domains.map(r=>renderPdrDomain(r,record,{exported:true})).join('')+'<script type="application/json" id="pdr-domain-record">'+JSON.stringify(record).replaceAll('<','\\u003c')+'</script></html>';
}
