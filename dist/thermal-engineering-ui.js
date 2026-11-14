import {buildThermalProgram,thermalProgramForItem,createThermalProgramStore,thermalNodeOwnerItems,thermalTestApproaches} from './thermal-program.js';
import {buildThermalAnalysisModel,buildThermalCase} from './thermal-analysis-model.js';
import {runThermalAnalysis,thermalRunFrame} from './thermal-analysis.js';
import {thermalNumber as num,thermalTemperaturePlot,thermalNetworkDiagram,parseThermalMeasurements,compareThermalMeasurements,thermalTraceCSV,thermalMeasurementTemplate,activeThermalBoundaryIds} from './thermal-engineering-visuals.js';
import {retainFile,fileLink} from './file-delivery.js';

const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const clone=v=>JSON.parse(JSON.stringify(v)),finite=Number.isFinite,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const fine=v=>finite(v)&&v!==0&&Math.abs(v)<.0001?v.toExponential(3):num(v,5);
const duration=s=>finite(s)?(s>=3600?num(s/3600,2)+' h':num(s/60,1)+' min'):'—';
const tabs=[['requirements','Requirements'],['model','Thermal model'],['test','Test & analysis'],['results','Results'],['evidence','Evidence'],['lifecycle','Lifecycle']];
const requirementFields=[['operatingMinK','Operating minimum','K'],['operatingMaxK','Operating maximum','K'],['survivalMinK','Survival minimum','K'],['survivalMaxK','Survival maximum','K'],['allowedGradientK','Allowed interface gradient','K'],['allowedRateKPerMin','Allowed temperature rate','K/min'],['powerCapabilityW','Allocated heat transport','W'],['measurementUncertaintyK','Measurement uncertainty','K'],['correlationRmseK','Correlation RMS criterion','K'],['correlationBiasK','Absolute bias criterion','K']];
const badge=(text,kind='')=>'<span class="te-badge '+kind+'">'+esc(text)+'</span>';
const button=(action,text,extra='')=>'<button type="button" data-te-action="'+action+'" '+extra+'>'+esc(text)+'</button>';
const table=(headers,rows)=>rows.length?'<div class="te-table-wrap"><table class="te-table"><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':'<p class="te-empty">No records allocated for this boundary.</p>';
const list=a=>'<ul>'+a.map(v=>'<li>'+esc(typeof v==='string'?v:v.description||v.label||JSON.stringify(v))+'</li>').join('')+'</ul>';
const section=(title,description,actions='')=>'<div class="te-section-head"><div><h3>'+esc(title)+'</h3><p>'+esc(description)+'</p></div>'+actions+'</div>';
const safeUrl=value=>{try{const u=new URL(value);return /^https?:$/.test(u.protocol)?u.href:null;}catch{return null;}};
function inputField(field,group){
 const {id,label,value,unit,basis}=field;
 if(field.type==='boolean'||typeof value==='boolean')return '<label class="te-check"><input type="checkbox" data-te-group="'+group+'" data-te-field="'+esc(id)+'" '+(value?'checked':'')+'> <span>'+esc(label)+'</span></label>';
 return '<label>'+esc(label)+(unit?' <span class="te-unit">'+esc(unit)+'</span>':'')+'<input type="number" inputmode="decimal" step="any" data-te-group="'+group+'" data-te-field="'+esc(id)+'" value="'+(finite(value)?value:'')+'" '+(finite(field.min)?'min="'+field.min+'" ':'')+(finite(field.max)?'max="'+field.max+'" ':'')+' placeholder="Unallocated">'+(basis?'<small>'+esc(basis)+'</small>':'')+'</label>';
}
function criterionText(c={}){
 if(c.nodes?.length)return c.nodes.map(n=>esc(n.label||n.nodeId)+': '+num(n.minK)+'–'+num(n.maxK)+' K').join('<br>');
 if(c.kind==='temperature-band')return num(c.minK)+'–'+num(c.maxK)+' K<br><small>'+esc(c.sensorBoundary||'Measurement boundary not allocated')+'</small>';
 if(c.allocations)return Object.entries(c.allocations).map(([key,v])=>esc(requirementFields.find(f=>f[0]===key)?.[1]||key)+': '+(v==null?'unallocated':num(v))).join('<br>');
 if(c.kind==='correlation')return 'RMS ≤ '+num(c.rmseLimitK)+' K; |bias| ≤ '+num(c.biasLimitK)+' K';
 return esc(c.description||c.statement||c.basis||c.kind||'Criterion requires allocation');
}

export function mountThermalEngineering(host,options={}){
 let {hardware,catalog,record=null,phase='B',compact=false,simulation=null,onRun,onFrame,onOpenPart}=options;
 const uid='thermal-'+Math.random().toString(36).slice(2),store=createThermalProgramStore();
 let program,scopeId,overrides={},itemId,planId,item,requirements=[],plans=[],plan,model,caseDefinition,modelDraft={},caseDraft={};
 let tab,run=null,stale=false,busy=false,alive=true,job=0,worker=null,cancelCalculation=null,progress=0,playing=false,raf=0,lastTime=0,holds=0,resumeAfterHold=false,pendingRun=null;
 let message='',error=false,requirementPage=0,measurements=null,comparison=null,prepared={},transientEvidence=[],persistenceWarning='';
 const sessionDrafts=new Map(),readDraft=namespace=>clone(sessionDrafts.get(scopeId+'|'+namespace)||store.getDraft(scopeId,namespace));
 const persist=(namespace,value)=>{sessionDrafts.set(scopeId+'|'+namespace,clone(value));const r=store.setDraft(scopeId,namespace,value);if(!r.ok||!r.persistent)persistenceWarning=(r.error||'Browser storage is unavailable.')+' Changes remain available in this session. Export the engineering package to preserve them.';return r;};
 function exportedProgram(){const out=store.export(program);for(const [key,value]of sessionDrafts)if(key.startsWith(scopeId+'|'))out.drafts[key.slice(scopeId.length+1)]=clone(value);return out;}
 const saveWorkspace=()=>persist('workspace',{itemId,planId,tab});
 function resolve(){
  const selected=thermalProgramForItem(program,itemId);item=selected.item;requirements=selected.requirements;plans=selected.plans;
  if(!item)throw Error('The selected item is not part of this configuration.');
  plan=plans.find(p=>p.id===planId)||plans.find(p=>p.kind===(item.category!=='flight'&&!item.synthetic?'atmospheric-cycling':phase==='D'?'tvac-cycling':'thermal-analysis'))||plans.find(p=>p.kind==='atmospheric-cycling')||plans[0];planId=plan?.id;
  modelDraft=readDraft('model:'+itemId);caseDraft=readDraft('case:'+planId);
  rebuild();
 }
 function rebuild(){
  const part=catalog?.byId?.[item.recordId||item.id]||null;
  model=buildThermalAnalysisModel(hardware,{record:part,catalog,item,config:program.config,overrides:modelDraft});
  caseDefinition=buildThermalCase(model,plan||{},caseDraft);
 }
 function initialize(){
  const base=buildThermalProgram(hardware,catalog,{phase});scopeId=base.config.scopeId;overrides=readDraft('program');program=buildThermalProgram(hardware,catalog,{overrides,phase});
  if(!store.status().persistent)persistenceWarning=(store.status().lastError||'Browser storage is unavailable.')+' Export an engineering package to preserve your session.';
  const saved=readDraft('workspace');itemId=record?.id||saved.itemId||'thermal:spacecraft';if(!program.items.some(i=>i.id===itemId))itemId='thermal:spacecraft';
  planId=compact?null:saved.planId;tab=compact?({A:'requirements',B:'model',C:'test',D:'test',E:'results',F:'test'}[phase]||'test'):saved.tab||({A:'requirements',B:'model',C:'test',D:'test',E:'results',F:'test'}[phase]||'model');
  if(!tabs.some(t=>t[0]===tab))tab='model';resolve();
 }
 function sendRun(value,meta={}){if(holds){pendingRun={value,meta};return;}onRun?.(value,meta);}
 function stop(){playing=false;if(raf)cancelAnimationFrame(raf);raf=0;lastTime=0;}
 function cancelJob(){job++;cancelCalculation?.();cancelCalculation=null;worker?.terminate();worker=null;busy=false;}
 function invalidate(){cancelJob();stop();resumeAfterHold=false;stale=!!run;measurements=null;comparison=null;prepared={};sendRun(null,{invalidated:true});}
 function chooseItem(id){
  if(id===itemId)return;
  const target=program.items.find(i=>i.id===id);if(!target)return;
  if(compact){if(target.recordId||catalog?.byId?.[id]){onOpenPart?.(target.recordId||id);return;}message='Open Thermal control from the discipline navigation to review this subsystem or vehicle network.';error=false;render();return;}
  invalidate();itemId=id;planId=null;run=null;stale=false;progress=0;requirementPage=0;resolve();saveWorkspace();render();
 }
 function choosePlan(id){if(id===planId)return;invalidate();planId=id;resolve();saveWorkspace();render();}
 function collect(group){
  const result={};for(const el of host.querySelectorAll('[data-te-group="'+group+'"]')){
   if(el.type==='checkbox'){result[el.dataset.teField]=el.checked;continue;}
   if(!el.checkValidity()){el.reportValidity();throw Error('Check '+(el.closest('label')?.firstChild?.textContent||el.dataset.teField)+'.');}
   result[el.dataset.teField]=el.value.trim()===''?null:Number(el.value);if(result[el.dataset.teField]!==null&&!finite(result[el.dataset.teField]))throw Error('Use a finite number for '+el.dataset.teField+'.');
  }return result;
 }
 function applyCase(){
  const values=collect('case'),approach=host.querySelector('[data-te-approach]')?.value;
  // Reading an unchanged default must not freeze a calculated chamber command.
  // Retain explicit edits, including cleared values, until edited again or reset.
  caseDraft={...caseDraft};for(const [id,value] of Object.entries(values))if(value!==(caseDraft[id]===null?null:caseDefinition.parameters[id]))caseDraft[id]=value;
  if(approach&&approach!==caseDefinition.approach)caseDraft.approach=approach;
  persist('case:'+planId,caseDraft);invalidate();rebuild();
 }
 function applyRequirements(reset=false){
  const next=clone(overrides);next.items||={};
  if(reset)delete next.items[itemId];else next.items[itemId]={...next.items[itemId],...collect('requirement'),basis:host.querySelector('[data-te-basis]')?.value.trim()||'',sourceUrl:host.querySelector('[data-te-source]')?.value.trim()||''};
  const candidate=buildThermalProgram(hardware,catalog,{overrides:next,phase});
  overrides=next;program=candidate;persist('program',overrides);invalidate();resolve();message=reset?'Restored the study allocation. Previous results retain their original requirement snapshots.':'Draft allocation applied in this workspace. Recalculate to assess the revised criteria.';error=false;render();
 }
 const sources=(ids=[])=>'<div class="te-sources">'+[...new Set(ids)].map(id=>program.sources?.[id]).filter(Boolean).map(s=>'<a href="'+esc(safeUrl(s.url)||'#')+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+' ↗<small>'+esc(s.section||s.description||'')+'</small></a>').join('')+'</div>';
 const assumptions=(title,values)=>values?.length?'<details class="te-disclosure"><summary>'+esc(title)+'</summary><div>'+list(values)+'</div></details>':'';
 const missing=values=>values?.length?'<div class="te-note te-error"><strong>Inputs still required</strong>'+list([...new Set(values)])+'</div>':'';
 function allocationOverview(){
  const a=item.studyAllocation;if(!a||item.synthetic)return '';const temp=k=>finite(k)?num(k,2)+' K ('+num(k-273.15,2)+' °C)':'Unallocated',operating=item.thermal?.operating||{},survival=item.thermal?.survival||{};
  return '<article class="te-card te-allocation"><h4>Engineering baseline · '+esc(a.title)+'</h4><p>'+esc(item.measurementBoundary||a.measurementBoundary)+'</p>'+table(['Allocation','Cold','Hot'],[['Article operating envelope',temp(operating.minK),temp(operating.maxK)],['Article non-operating envelope',temp(survival.minK),temp(survival.maxK)]])+'<p>'+esc(a.basis)+'</p><small>'+esc(a.revision)+' · Project allocation · Verification open</small></article>';
 }
 function chamberAllocationOverview(){
  if(!caseDefinition.articleTargets)return '';
  const c=caseDefinition,labels=Object.keys(c.articleTargets.cold||{}),temp=k=>finite(k)?num(k,2)+' K ('+num(k-273.15,2)+' °C)':'Unallocated';
  return '<article class="te-card te-allocation"><h4>Article targets & chamber commands</h4>'+table(['Boundary','Cold case','Hot case'],[...labels.map(id=>[esc(model.nodes.find(n=>n.id===id)?.label||id)+' target',temp(c.articleTargets.cold[id]),temp(c.articleTargets.hot[id])]),['Shroud / controlled fixture command',temp(c.parameters.coldK),temp(c.parameters.hotK)]])+'<p>'+(Object.values(c.boundaryAllocation||{}).some(x=>x?.status==='derived-steady-balance')?'The initial chamber commands account for the article’s allocated heat load, mounting path and radiation. The transient prediction must still reach the article target, stabilize and complete dwell.':'The chamber commands are separate inputs. The transient prediction determines whether every article reaches its own target and completes dwell.')+'</p><p class="te-muted">Model scope: '+esc(model.scope)+'.</p></article>';
 }
 function requirementsView(){
  const fields=requirementFields.filter((_,index)=>!item.synthetic||index>=4).map(([id,label,unit])=>inputField({id,label,unit,value:item.limits?.[id],min:id.includes('MinK')||id.includes('MaxK')?.1:0,max:1e12},'requirement')).join('');
  const owners=item.synthetic?[...new Set((item.thermal?.nodes||[]).map(n=>n.ownerItemId||thermalNodeOwnerItems[n.id]).filter(Boolean))]:[];
  const ownerLinks=owners.map(id=>{const p=program.items.find(i=>i.id===id);return button('choose-item',p?.label||id,'class="te-text-button" data-te-item="'+esc(id)+'"');}).join('');
  const start=requirementPage*24,visible=requirements.slice(start,start+24);
  return section('Requirements & measurement boundaries','Each record belongs to this design configuration. Project allocations, supplier capability and physical evidence remain separate.',badge(requirements.length+' requirements · open'))+
   '<div class="te-grid"><article class="te-card"><h4>'+esc(item.label||item.title)+'</h4><p>'+esc(item.modelCoverage||'Allocate an item-specific thermal boundary and verification approach.')+'</p><p><strong>Supplier capability:</strong> '+esc(item.ratingStatus==='supplier-rating-unallocated'?'Not yet established for this article. A reference product or parent assembly does not establish its limits.':item.ratingStatus)+'</p>'+(item.thermal?.inherited||item.thermal?.proxy?'<p>Parent node context is available for learning and traceability. It does not assign a temperature rating to this child part.</p>':'')+(item.parentId?button('choose-item','View parent allocation','class="te-text-button" data-te-item="'+esc(item.parentId)+'"'):'')+'</article><article class="te-card"><h4>What these records mean</h4><p><strong>Allocation:</strong> the proposed requirement at a named sensor or interface. <strong>Prediction:</strong> the modeled response to an identified case. <strong>Test target:</strong> the commanded environment and article criterion. <strong>Evidence:</strong> a traceable measurement or report awaiting review.</p><p>Saving a value or completing a simulated dwell never closes a requirement.</p></article></div>'+
   allocationOverview()+'<details class="te-disclosure"><summary>Edit draft allocation for this item</summary><div>'+(item.synthetic?'<p>Temperature bands are allocated at the owning hardware boundaries, then carried into this coupled network. Edit the corresponding assembly to change its band.</p><div class="te-actions">'+ownerLinks+'</div>':'')+'<div class="te-fields">'+fields+'</div><label>Allocation basis<textarea data-te-basis rows="3" placeholder="Identify the temperature boundary, rationale and approving authority">'+esc(item.override?.basis||'')+'</textarea></label><label>Supporting source URL<input type="url" data-te-source value="'+esc(item.override?.sourceUrl||'')+'" placeholder="https://…"></label><div class="te-actions">'+button('apply-requirements','Apply draft allocation','class="te-primary"')+button('reset-requirements','Restore study allocation')+'</div></div></details>'+
   table(['Requirement / traceability','Criterion','Verification method','Disposition'],visible.map(r=>['<strong>'+esc(r.title)+'</strong><p>'+esc(r.statement)+'</p><small>'+esc(r.id)+(r.parentIds?.length?'<br>Parent: '+r.parentIds.map(esc).join('<br>'):'')+'</small>',criterionText(r.criterion),esc((r.verificationMethods||[]).join(' · '))+'<small>'+num(r.verificationPlanIds?.length||0)+' linked plans</small>',badge(r.status)+'<small>Verification open</small>']))+
   (requirements.length>24?'<div class="te-actions">'+button('previous-requirements','Previous',requirementPage?'':'disabled')+'<span>'+num(start+1)+'–'+num(Math.min(start+24,requirements.length))+' of '+requirements.length+'</span>'+button('next-requirements','Next',start+24<requirements.length?'':'disabled')+'</div>':'')+
   assumptions('Open engineering inputs',item.unknowns)+sources(requirements.flatMap(r=>r.sourceIds||[]));
 }
 function modelView(){
  const named=id=>esc(model.nodes.find(n=>n.id===id)?.label||id||'boundary');
  return section('Thermal network','Stored energy, heat paths, exposed surfaces and active control are explicit model inputs.',badge(model.available?'Reduced model allocated':'Inputs unallocated',model.available?'':'bad'))+
   '<p>'+esc(model.description)+'</p>'+missing(model.missingInputs)+thermalNetworkDiagram(model)+
   table(['Node','Heat capacity','Dissipation','Initial state','Resolution'],model.nodes.map(n=>[named(n.id),num(n.capacityJPerK)+' J/K',num(n.loadW)+' W',num(n.initialK)+' K',esc(n.role||'Lumped node')+'<small>'+esc(n.legacyNodeId||n.id)+'</small>']))+
   '<details class="te-disclosure"><summary>Conductive interfaces, radiation and active control</summary><div><h4>Conductive paths</h4>'+table(['Path','Conductance','Capacity','Activation'],model.conductors.map(l=>[named(l.from)+' → '+named(l.to||l.boundaryId),num(l.conductanceWPerK)+' W/K',finite(l.capacityW)?num(l.capacityW)+' W':'No assigned cap',esc((l.activeIn||[]).join(' · ')||'All applicable cases')+(l.requiresPower?'<small>Requires supplied transport power</small>':'')]))+'<h4>Radiative exchange</h4>'+table(['Path','Area','IR emittance','View factor'],model.radiation.map(l=>[named(l.from)+' → '+named(l.to||l.boundaryId),num(l.areaM2)+' m²',num(l.emissivity,4),num(l.viewFactor??1,4)]))+'<h4>Heater authority</h4>'+table(['Node','Maximum power','On below','Off above'],model.heaters.map(h=>[named(h.nodeId),num(h.maxW)+' W',num(h.onK)+' K',num(h.offK)+' K']))+'<h4>Active heat pumps</h4>'+table(['Cold → hot node','Cold-side capacity','COP','Setpoint'],model.heatPumps.map(h=>[named(h.from)+' → '+named(h.to),num(h.coldCapacityW)+' W',num(h.cop),num(h.setpointK)+' K']))+'<h4>Atmospheric convection</h4><p>These paths are disabled in vacuum and orbital cases.</p>'+table(['Node','Boundary','Assigned coefficient / conductance'],model.convection.map(c=>[named(c.nodeId||c.from),esc(c.boundaryId||'air'),finite(c.conductanceWPerK)?num(c.conductanceWPerK)+' W/K':num(c.hWPerM2K??c.coefficientWPerM2K)+' W/(m²·K)']))+'</div></details>'+
   '<details class="te-disclosure" '+(!model.available?'open':'')+'><summary>Edit analysis inputs</summary><div><p>These inputs describe an engineering model. They do not create supplier ratings or approved requirements.</p><div class="te-fields">'+model.editableFields.map(f=>inputField(f,'model')).join('')+'</div><div class="te-actions">'+button('apply-model','Apply model inputs','class="te-primary"')+button('reset-model','Restore model allocation')+'</div></div></details>'+assumptions('Model assumptions & unresolved physics',model.assumptions)+sources(model.sourceIds);
 }
 function testView(){
  if(plan?.kind==='interface-review')return section('Thermal interface & evidence review','Review the allocated interfaces and evidence supporting this item. Select a numerical analysis or test plan to calculate a temperature history.',badge('Review record · verification open'))+'<label>Planned activity<select data-te-plan-select aria-label="Thermal analysis or test plan">'+plans.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===planId?'selected':'')+'>'+esc(p.title)+'</option>').join('')+'</select></label>'+allocationOverview()+'<article class="te-card"><h4>Review objectives</h4>'+list(plan.steps||[])+'</article>'+assumptions('Evidence and disposition still to be reviewed',plan.openItems||[])+sources(plan.sourceIds);
  const approach=thermalTestApproaches[caseDefinition.approach],purpose=['tvac-cycling','atmospheric-cycling'].includes(caseDefinition.kind)?approach?.purpose||plan?.purpose:plan?.purpose;
  const activeFields=caseDefinition.editableFields.filter(f=>caseDefinition.kind!=='orbital-transient'||(!['ambientK','dwellS','stabilityKPerHour','stabilityWindowS','maxPlateauS','coldLoadFraction'].includes(f.id)||f.id==='ambientK'&&model.environmentBasis?.kind==='local-surface'));
  const fields=activeFields.map(f=>inputField(caseDraft[f.id]===null?{...f,value:null}:f,'case')).join('')+(model.heaters.length?inputField({id:'heaterEnabled',label:'Enable allocated survival / control heaters',type:'boolean',value:caseDefinition.parameters.heaterEnabled},'case'):'');
  return section('Test & analysis plan','A complete engineering starting case is provided. Adjust it for the article, fixture or operating mode you want to study.',badge(caseDefinition.available?'Ready to predict · verification open':'Prediction inputs incomplete',caseDefinition.available?'':'bad'))+
   '<div class="te-fields te-two"><label>Planned activity<select data-te-plan-select aria-label="Thermal analysis or test plan">'+plans.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===planId?'selected':'')+'>'+esc(p.title)+'</option>').join('')+'</select></label><label>Article approach<select data-te-approach>'+[['engineering','Engineering development'],['qualification','Qualification'],['protoflight','Protoflight'],['acceptance','Acceptance']].map(([id,label])=>'<option value="'+id+'" '+(caseDefinition.approach===id?'selected':'')+'>'+label+'</option>').join('')+'</select><small>Changing the approach does not invent margins, cycles or an approved procedure.</small></label></div>'+
   '<div class="te-card"><h4>'+esc(plan?.title||'Thermal activity')+'</h4><p>'+esc(purpose||'')+'</p><small>'+esc(planId)+' · Article: '+esc(thermalTestApproaches[caseDefinition.approach]?.article||plan?.article?.kind||'not identified')+'</small>'+(approach?.purpose&&approach.purpose!==purpose?'<p>'+esc(approach.purpose)+'</p>':'')+'</div>'+
   (caseDefinition.kind==='orbital-transient'?'<p class="te-note">The orbital case samples the current reference geometry, Sun, eclipse, Earth infrared and albedo. Its electrical supply is an ideal available boundary; use the coupled mission timeline for battery state of charge and load dispatch.</p>':caseDefinition.kind==='installed-environment'?'<p class="te-note">This installed environmental analysis covers '+esc(model.scope.toLowerCase())+'. Prescribed ambient, mounting and air conditions produce a local temperature response; the scope is distinct from a whole launcher or facility model.</p>':'<p class="te-note">The chamber boundary and the article are different temperatures. Dwell starts only after the monitored article nodes meet their target and stability criteria. Thermal balance uses mission-equivalent absorbed heat and stabilization, separately from TVAC cycling.</p>')+chamberAllocationOverview()+
   '<div class="te-fields">'+fields+'</div><div class="te-actions">'+button('apply-case','Apply case inputs')+button('reset-case','Restore planned scenario')+'</div>'+missing(caseDefinition.missingInputs)+
   table(['Sequence','Control','Duration / article criterion'],caseDefinition.steps.map(s=>[esc(s.label||s.id),s.type==='timeline'?'Sampled orbital environment':Object.entries(s.boundariesK||{}).filter(([id])=>id!=='air'||caseDefinition.convectionEnabled).map(([id,k])=>esc(id)+': '+num(k)+' K').join('<br>'),s.type==='hold'?(s.sensorTargetsK?Object.entries(s.sensorTargetsK).map(([id,k])=>esc(model.nodes.find(n=>n.id===id)?.label||id)+': '+num(k)+' ± '+num(s.toleranceK||caseDefinition.parameters.toleranceK)+' K').join('<br>'):'Article stabilization; no imposed article target')+'<small>Window '+duration(s.stabilityWindowS)+' · range/hour ≤ '+num(s.stabilityKPerHour)+' K/h · monitors '+(caseDefinition.monitorNodeIds||[]).map(esc).join(', ')+'</small>Stabilize, then '+duration(s.dwellS)+' continuous dwell<br><small>Stop at '+duration(s.maxDurationS)+' if not demonstrated</small>':duration(s.durationS)]))+
   '<div class="te-actions">'+button('run',busy?'Calculating thermal response…':'Run thermal prediction','class="te-primary" '+(busy||!caseDefinition.available?'disabled':''))+(run?button('show-results','View recorded result'):'')+'</div>'+assumptions('Case assumptions, test limitations & numerical sampling',caseDefinition.assumptions)+
   '<details class="te-disclosure"><summary>Physical test readiness and evidence</summary><div><p>Before physical execution, identify the article serial and configuration, approved procedure, calibrated sensors and uncertainty, mounting interfaces, shroud and pressure instrumentation, functional load scripts, safety limits, anomaly disposition and pre/post-test inspections. Record actual temperatures, power and chamber conditions.</p><p>A thermal-balance comparison supports model correlation. Cycling supports workmanship and environmental verification only when the complete tailored procedure, functional checks and evidence have been reviewed. Neither is established by this animation or a numerical run.</p>'+list(plan?.openItems||plan?.evidenceNeeds||[])+'</div></details>'+sources(caseDefinition.sourceIds);
 }
 function currentFrame(){return run?thermalRunFrame(run,progress):null;}
 function frameReadout(frame=currentFrame()){
  if(!frame)return '';
  const nodes=run.nodes||[],activeBoundaries=new Set(activeThermalBoundaryIds(run)),boundaries=Object.entries(frame.boundariesK||{}).filter(([id])=>activeBoundaries.has(id));
  let html=table(['At the selected instant','Temperature','Celsius'],[...nodes.map(n=>[esc(n.label||n.id),num(frame.temperaturesK?.[n.id])+' K',num(frame.temperaturesK?.[n.id]-273.15)+' °C']),...boundaries.map(([id,k])=>[esc(id)+' boundary',num(k)+' K',num(k-273.15)+' °C'])]);
  if(frame.environment){const e=frame.environment;html+='<div class="te-environment">'+badge(e.eclipse?'Eclipse':'Sunlit')+'<span>Solar '+num(e.solarWm2)+' W/m²</span><span>Earth IR '+num(e.earthIRWm2)+' W/m²</span><span>Albedo '+num(e.albedo)+'</span><span>Earth view '+num(e.earthViewFraction,3)+'</span><span>β '+num(e.betaDeg)+'°</span></div>';}
  return html;
 }
 function missionContext(){return '<p class="te-note">This configuration uses '+esc(program.config.thermalTopology||hardware.energySystem?.thermal?.kind||'the allocated thermal architecture')+'. The existing flight timeline couples thermal response to power dispatch and mission events. These retained engineering cases isolate their stated boundary conditions so that test plans, model assumptions and measured data can be reviewed together.</p>';}
 function resultsView(){
  if(!run)return section('Results','Run an identified case to produce temperature histories, dwell assessments and an energy ledger.')+'<p class="te-empty">No thermal prediction has been run for this selection.</p><div class="te-actions">'+button('show-test','Configure a thermal case','class="te-primary"')+'</div>'+missionContext();
  const summary=run.summary||{},numerics=summary.numerics||{},convergence=numerics.convergence||{},stats=summary.nodes||[],frame=currentFrame(),temps=stats.flatMap(n=>[n.minK,n.maxK]).filter(finite),minimum=temps.reduce((a,b)=>Math.min(a,b),Infinity),maximum=temps.reduce((a,b)=>Math.max(a,b),-Infinity);
  const warnings=[...(summary.warnings||[])];if(convergence.status&&convergence.status!=='converged'&&convergence.status!=='within-tolerance'&&convergence.status!=='within-study-tolerance'&&!warnings.some(v=>/refin|step|converg/i.test(v)))warnings.push('Numerical refinement: '+convergence.status+'. Review the automatic half-step comparison below.');
  return section(run.caseLabel||run.caseTitle||'Thermal prediction','Retained model response. Numerical completion and physical verification are separate dispositions.',badge('Predicted · uncorrelated'))+
   (run.model?.scope?'<p class="te-note"><strong>Modeled article:</strong> '+esc(run.model.scope)+'. The temperature history applies to this stated scope.</p>':'')+
   (stale?'<p class="te-note te-error"><strong>Recorded result uses earlier inputs.</strong> Its original model, case and criteria remain attached. It will not color the current 3D part or be compared with current allocations until recalculated.</p>':'')+
   '<div class="te-metrics"><div><small>Lowest node temperature</small><strong>'+num(minimum)+' <em>K</em></strong></div><div><small>Highest node temperature</small><strong>'+num(maximum)+' <em>K</em></strong></div><div><small>Elapsed simulation</small><strong>'+duration(run.durationS)+'</strong></div><div><small>Maximum energy residual</small><strong>'+fine(numerics.maxResidualW)+' <em>W</em></strong></div></div>'+
   (warnings.length?'<div class="te-note"><strong>Assessment notes</strong>'+list(warnings)+'</div>':'')+
   thermalTemperaturePlot(run,{limits:compact&&!stale?item.thermal?.operating:null,timeS:frame?.timeS||0,measured:measurements})+
   '<div class="te-playback">'+button('play',playing?'Pause replay':'Replay result',(stale||holds?'disabled':'')+' aria-pressed="'+playing+'"')+'<label class="te-sr-only" for="'+uid+'-cursor">Thermal result elapsed time</label><input id="'+uid+'-cursor" type="range" min="0" max="1000" value="'+Math.round(progress*1000)+'" data-te-cursor aria-label="Thermal result elapsed time"><output data-te-time>'+duration(frame?.timeS||0)+' · '+esc(frame?.stageLabel||'')+'</output></div><div data-te-frame>'+frameReadout(frame)+'</div>'+
   '<h4>Node envelope assessment</h4><p class="te-muted">Extrema and excursion duration use every integration step, including intervals between plot samples. Limits are the bands carried with this run.</p>'+table(['Node','Minimum / maximum','Cold / hot margin','Time outside band','Assessment'],stats.map(n=>[esc(n.label||n.id),num(n.minK)+' / '+num(n.maxK)+' K',num(n.coldMarginK)+' / '+num(n.hotMarginK)+' K',duration((n.coldSeconds||0)+(n.hotSeconds||0)),badge(n.assessment||'Unallocated',n.assessment==='outside-carried-envelope'?'bad':'')]))+
   '<h4>Article stabilization & dwell</h4>'+table(['Stage','Elapsed','Stabilized after','Continuous dwell','Disposition'],(summary.stages||[]).map(s=>[esc(s.label||s.id)+(s.sensorRatesKPerHour?'<small>Final window rates: '+Object.entries(s.sensorRatesKPerHour).map(([id,v])=>esc(id)+' '+num(v)+' K/h').join(' · ')+'</small>':''),duration(s.durationS),s.type==='hold'?(finite(s.stabilizedAtS)?duration(s.stabilizedAtS-s.startS):'Not demonstrated'):'—',s.type==='hold'?duration(s.dwellAccumulatedS)+' / '+duration(s.requiredDwellS):'—',badge(s.status||'Recorded',s.status==='target-not-demonstrated'?'bad':s.completed?'good':'')]))+
   '<details class="te-disclosure"><summary>Energy balance, time-step sensitivity & artifact identity</summary><div>'+table(['Numerical check','Recorded value'],[['Applied energy',num(numerics.totalAppliedJ/1e6,5)+' MJ'],['Rejected energy',num(numerics.totalRejectedJ/1e6,5)+' MJ'],['Stored energy change',num(numerics.totalStoredJ/1e6,5)+' MJ'],['Integrated residual',fine(numerics.integratedResidualJ)+' J'],['Largest node residual',fine(numerics.maxNodeResidualW)+' W'],['Integration step / plotted sample interval',num(numerics.nominalStepS)+' / '+num(numerics.recordedSampleEveryS)+' s'],['Automatic refined integration step',num(convergence.refinedStepS)+' s'],['Temperature difference at equal elapsed time (includes stage shifts)',num(convergence.maxTemperatureDeltaK,5)+' K'],['Temperature response at matching time within each stage',num(convergence.responseMaxTemperatureDeltaK,5)+' K'],['Stage-aligned response refinement',esc(convergence.responseStatus||'Unavailable')],['Largest individual stage duration shift',duration(convergence.maxStageDurationDeltaS)],['Stage timing comparison',esc(convergence.scheduleStatus||'Unavailable')],['Study comparison tolerance',num(convergence.toleranceK)+' K'],['Duration difference',num(convergence.durationDeltaS,3)+' s'],['Numerical refinement disposition',esc(convergence.status||'Unavailable')]])+'<p>'+esc(convergence.basis||'The automatic comparison evaluates integration epochs rather than only sparse plot samples.')+'</p>'+(convergence.responseComparisonBasis?'<p>'+esc(convergence.responseComparisonBasis)+'</p><p>'+esc(convergence.scheduleComparisonBasis||'')+'</p>':'')+'<p class="te-mono">Run '+esc(run.id)+'<br>Configuration '+esc(run.configurationId)+'<br>Model '+esc(run.modelId)+'<br>Case '+esc(run.caseId)+'<br>Plan '+esc(run.planId)+'</p><p>Good energy closure checks the numerical ledger. It does not establish the physical adequacy of an uncertain model or calibration.</p></div></details>'+
   '<div class="te-actions">'+button('refine',busy?'Calculating…':'Re-run with half the time step',(busy||stale?'disabled':'')+' class="te-primary"')+button('prepare-trace','Prepare temperature CSV')+button('prepare-package','Prepare engineering package')+'</div>'+preparedLinks()+missionContext();
 }
 function preparedLinks(){return '<div class="te-actions te-downloads">'+Object.keys(prepared).map(key=>fileLink(uid+':'+key,{package:'Download engineering JSON',trace:'Download temperature CSV',template:'Download measurement template'}[key])).join('')+'</div>';}
 function evidenceMetadata(){
  return '<div class="te-fields te-two"><label>Article serial / lot<input data-te-evidence="articleId" placeholder="Identify the physical article"></label><label>Executed procedure revision<input data-te-evidence="procedureRevision" placeholder="Procedure ID and revision"></label><label>Actual measurement / report date<input type="datetime-local" data-te-evidence="recordedAt"><small>Leave blank if unknown. Import time is recorded separately.</small></label><label>Measurement uncertainty (K)<input type="number" step="any" min="0" data-te-evidence="measurementUncertaintyK" placeholder="Unallocated"></label><label class="te-wide">Source / calibration / report URL<input type="url" data-te-evidence="sourceUrl" placeholder="https://…"></label></div>';
 }
 function comparisonView(){
  if(!comparison)return '';
  const r=comparison;return '<article class="te-card"><h4>Measured minus predicted</h4><p>Signed bias '+num(r.biasK,4)+' K · RMS '+num(r.rmseK,4)+' K · maximum absolute error '+num(r.maxAbsK,4)+' K.</p>'+table(['Channel','Samples','Signed bias','RMS','Maximum |error|'],r.channels.map(c=>[esc(c.nodeId),num(c.sampleCount),num(c.biasK,4)+' K',num(c.rmseK,4)+' K',num(c.maxAbsK,4)+' K']))+'<p>'+esc(r.method)+' '+num(r.outsideSamples)+' samples outside the simulated time interval were excluded.</p><p>This comparison retains the measurements for review. It does not automatically fit model parameters or approve a requirement.</p></article>';
 }
 function evidenceView(){
  const runs=store.listRuns(scopeId).filter(r=>r.itemId===itemId),evidence=[...store.listEvidence(scopeId),...transientEvidence].filter(e=>e.itemId===itemId),canImport=!!run&&!stale;
  return section('Evidence & reproducible artifacts','Keep predictions, measurements, reports and requirement revisions linked to the article and configuration.',badge('All verification open'))+
   '<p class="te-note">Records are kept in this browser with a bounded storage budget. Download the engineering package for a portable copy. A full or unavailable browser store reports the failure and preserves its previous records.</p>'+
   '<div class="te-actions">'+button('prepare-package','Prepare complete engineering package','class="te-primary"')+button('prepare-template','Prepare measurement CSV template',run?'':'disabled')+'</div>'+preparedLinks()+
   '<details class="te-disclosure" open><summary>Compare measured temperatures with the current result</summary><div><p>Use elapsed seconds in <code>time_s</code> and identified node channels such as <code>article_K</code> or <code>article_C</code>. The template contains only column headings. No observations are invented.</p>'+(!canImport?'<p class="te-note">Run the current model and case before importing a temperature history.</p>':'')+evidenceMetadata()+'<label class="te-file-label">Temperature CSV<input type="file" accept=".csv,text/csv" data-te-measurements '+(canImport?'':'disabled')+'><small>Up to 2 MB and 10,000 rows; times must increase and each temperature channel must match this run.</small></label><details class="te-disclosure"><summary>Or paste a small CSV</summary><div><textarea data-te-csv rows="5" placeholder="time_s,article_K&#10;…" '+(canImport?'':'disabled')+'></textarea><div class="te-actions">'+button('import-paste','Compare pasted CSV',canImport?'':'disabled')+'</div></div></details>'+comparisonView()+'</div></details>'+
   '<details class="te-disclosure"><summary>Attach a supporting document</summary><div><div class="te-fields te-two"><label>Evidence type<select data-te-document-kind><option value="test-report">Test report</option><option value="inspection-record">Inspection record</option><option value="analysis-report">Analysis report</option><option value="supplier-document">Supplier document</option></select></label><label>Document title<input data-te-document-title placeholder="Report title and revision"></label></div><p>The article, procedure, date and URL fields above are attached to this record.</p><div class="te-actions">'+button('attach-document','Attach for review')+'</div></div></details>'+
   '<h4>Recorded predictions for this item</h4>'+(runs.length?runs.slice().reverse().map(r=>'<article class="te-artifact"><div><strong>'+esc(r.caseLabel||r.caseTitle||r.id)+'</strong><small>'+esc(r.recordedAt||r.createdAt||'')+' · '+esc(r.configurationId)+'</small>'+badge(r.configurationId===program.config.id?'Current configuration':'Earlier configuration')+'</div>'+button('open-run','Open recorded result ↗','data-te-run="'+esc(r.id)+'"')+'</article>').join(''):'<p class="te-empty">No stored runs for this item yet.</p>')+
   '<h4>Evidence awaiting review</h4>'+(evidence.length?evidence.slice().reverse().map(e=>'<article class="te-artifact"><div><strong>'+esc(e.title)+'</strong><small>'+esc(e.kind)+' · '+esc(e.recordedAt?'Recorded '+e.recordedAt:'Measurement / report date unallocated')+'</small><small>Imported '+esc(e.importedAt||'')+' · '+esc(e.configurationId)+'</small>'+badge('Pending review')+(e.openItems?.length?'<small>Open: '+e.openItems.map(esc).join(' · ')+'</small>':'')+'</div>'+(safeUrl(e.sourceUrl)?'<a target="_blank" rel="noopener noreferrer" href="'+esc(safeUrl(e.sourceUrl))+'">Source ↗</a>':'')+'</article>').join(''):'<p class="te-empty">No measurement or document evidence attached for this item.</p>')+sources(['th-nasa-guide','th-se-verification','th-gevs-balance']);
 }
 function lifecycleView(){return section('Thermal engineering across the lifecycle','Requirements flow down to identified hardware boundaries; verification evidence returns through integration and review.')+'<p class="te-note">The lifecycle identifies planned work and review gates. It does not claim that an unreviewed plan, a simulation or an illustrative fixture has passed a flight-program gate.</p><div class="te-phase-list">'+program.lifecycle.map(p=>'<article class="te-card '+(p.phase===phase?'te-current-phase':'')+'"><strong>'+esc(p.phase)+'</strong><div><h4>'+esc(p.title)+'</h4>'+list(p.deliverables)+'<p><b>Review gate:</b> '+esc(p.gate)+'</p></div></article>').join('')+'</div>'+sources(['th-se-handbook','th-se-verification','th-gevs','th-ecss-test']);}
 function itemSelector(){return '<label>Item / assembly<select data-te-item-select aria-label="Thermal engineering item">'+[['flight','Flight hardware & vehicle'],['launch','Launch vehicle'],['ground','Ground support'],['site','Launch site']].map(([category,label])=>'<optgroup label="'+label+'">'+program.items.filter(i=>(i.category||'flight')===category).map(i=>'<option value="'+esc(i.id)+'" '+(i.id===itemId?'selected':'')+'>'+esc(i.label||i.title)+' · '+esc(i.level)+'</option>').join('')+'</optgroup>').join('')+'</select></label>';}
 function render(){
  if(!alive)return;
  const content={requirements:requirementsView,model:modelView,test:testView,results:resultsView,evidence:evidenceView,lifecycle:lifecycleView}[tab]();
  host.innerHTML='<section class="thermal-engineering '+(compact?'te-compact':'')+'" aria-label="Thermal engineering"><header class="te-head"><div><span class="te-overline">Requirements → analysis → verification</span><h2>Thermal engineering</h2><p>'+esc(item.label||item.title)+'</p></div><div class="te-config">'+esc(program.config.name)+'<br>'+esc(program.config.id)+'<br>Phase '+esc(phase)+' · engineering study</div></header>'+(!compact?'<div class="te-toolbar">'+itemSelector()+'<div>'+badge(program.requirements.length+' configuration requirements')+badge('Verification open')+'</div></div>':'')+'<div class="te-tabs" role="tablist" aria-label="Thermal engineering sections">'+tabs.map(([id,label])=>'<button type="button" role="tab" id="'+uid+'-'+id+'" aria-controls="'+uid+'-panel" aria-selected="'+(id===tab)+'" tabindex="'+(id===tab?0:-1)+'" data-te-tab="'+id+'">'+label+'</button>').join('')+'</div>'+(persistenceWarning?'<p class="te-status te-error" role="status">'+esc(persistenceWarning)+'</p>':'')+(message?'<p class="te-status '+(error?'te-error':'')+'" role="'+(error?'alert':'status')+'">'+esc(message)+'</p>':'')+'<div class="te-content" id="'+uid+'-panel" role="tabpanel" aria-labelledby="'+uid+'-'+tab+'">'+content+'</div></section>';
  paintFrame();
 }
 function paintFrame(){
  if(!alive||!run)return;const frame=currentFrame();if(!frame)return;
  const slider=host.querySelector('[data-te-cursor]');if(slider)slider.value=Math.round(progress*1000);
  const output=host.querySelector('[data-te-time]');if(output)output.textContent=duration(frame.timeS)+' · '+(frame.stageLabel||frame.stageId||'');
  const reads=host.querySelector('[data-te-frame]');if(reads)reads.innerHTML=frameReadout(frame);
  const cursor=host.querySelector('.te-cursor-line');if(cursor){const first=run.frames[0].timeS,span=Math.max(1,run.frames.at(-1).timeS-first),x=63+(frame.timeS-first)/span*862;cursor.setAttribute('d','M'+x+' 18V256');}
  if(!stale&&!holds)onFrame?.(frame,run,progress);
 }
 function tick(time){if(!alive||!playing||holds)return;if(lastTime)progress=clamp(progress+(time-lastTime)/40000,0,1);lastTime=time;paintFrame();if(progress>=1){stop();render();}else raf=requestAnimationFrame(tick);}
 function start(){if(!run||stale||holds)return;if(progress>=1)progress=0;playing=true;lastTime=0;render();raf=requestAnimationFrame(tick);}
 function holdPlayback(){
  if(!alive)return ()=>{};if(holds++===0){resumeAfterHold=playing;stop();}
  let released=false;return ()=>{if(released)return;released=true;holds=Math.max(0,holds-1);if(!alive||holds)return;const queued=pendingRun;pendingRun=null;if(queued)onRun?.(queued.value,queued.meta);paintFrame();const resume=resumeAfterHold;resumeAfterHold=false;if(resume&&!stale)start();else if(tab==='results')render();};
 }
 async function calculate(refine=false){
  if(busy)return;stop();const mine=++job;busy=true;error=false;message='Integrating the identified model and comparing against a half-size time step…';
  let localWorker=null;const chosenModel=clone(model),refinedInputs=refine?{...caseDraft,dtS:(run?.summary?.numerics?.nominalStepS||caseDefinition.dtS||20)/2}:null,chosenCase=refine?buildThermalCase(model,plan,refinedInputs):clone(caseDefinition),chosenProgram=program,chosenRequirements=clone(requirements),chosenPlan=clone(plan);
  if(!chosenCase.available){busy=false;message=chosenCase.missingInputs.join(' ');error=true;render();return;}
  render();
  try{
   await new Promise(resolve=>requestAnimationFrame(resolve));if(!alive||mine!==job)return;
   const output=await new Promise((resolve,reject)=>{
    cancelCalculation=()=>reject(Error('Thermal calculation cancelled after inputs changed.'));
    if(typeof Worker==='undefined'){try{resolve(runThermalAnalysis(chosenModel,chosenCase));}catch(e){reject(e);}return;}
    try{localWorker=new Worker(new URL('./thermal-engineering-worker.js',import.meta.url),{type:'module'});worker=localWorker;localWorker.onmessage=e=>e.data?.ok?resolve(e.data.run):reject(Error(e.data?.error||'The thermal worker returned no result.'));localWorker.onerror=e=>reject(Error(e.message||'The thermal worker could not complete.'));localWorker.postMessage({model:chosenModel,caseDefinition:chosenCase,options:{}});}catch(e){reject(e);}
   });
   if(!alive||mine!==job)return;if(!output?.frames?.length)throw Error('The solver produced no temperature history.');
   run={...output,configurationId:chosenProgram.config.id,configurationFingerprint:chosenProgram.config.fingerprint,planId:chosenPlan.id,caseTitle:chosenPlan.title,createdAt:new Date().toISOString(),requirementSnapshot:chosenRequirements,verificationStatus:'open'};
   if(refinedInputs){caseDraft=refinedInputs;caseDefinition=chosenCase;persist('case:'+planId,caseDraft);}
   const saved=store.saveRun(chosenProgram,run);if(saved.record)run=saved.record;
   stale=false;progress=0;measurements=null;comparison=null;prepared={};tab='results';
   message=saved.ok?(saved.persistent?'Prediction recorded. Review temperature margins, incomplete dwells and numerical sensitivity before interpreting the result.':'Prediction available for this session. Browser persistence is unavailable; download the engineering package.'):'Prediction complete, but not saved in browser storage: '+saved.error+' Download the engineering package to retain it.';error=!saved.ok;
   sendRun(run,{setting:chosenPlan.setting||(['orbital-transient','installed-environment'].includes(chosenCase.kind)?'installed':null)});saveWorkspace();
  }catch(e){if(alive&&mine===job){message=e.message||String(e);error=true;}}
  finally{localWorker?.terminate();if(worker===localWorker)worker=null;if(alive&&mine===job){busy=false;cancelCalculation=null;render();}}
 }
 function readEvidenceMetadata(){
  const values={};for(const el of host.querySelectorAll('[data-te-evidence]')){
   if(!el.checkValidity()){el.reportValidity();throw Error('Check the evidence metadata.');}
   const key=el.dataset.teEvidence,value=el.value.trim();values[key]=key==='measurementUncertaintyK'?(value===''?null:Number(value)):key==='recordedAt'?(value?new Date(value).toISOString():null):value||null;
  }
  if(values.sourceUrl&&!safeUrl(values.sourceUrl))throw Error('Use an http or https source URL.');return values;
 }
 function addMeasurements(text,title,metadata){
  if(!run||stale)throw Error('Run the current model and case before comparing measurements.');
  const data=parseThermalMeasurements(text,run.nodes.map(n=>n.id)),analysis=compareThermalMeasurements(run,data),saved=store.attachEvidence(program,{kind:'measured-temperature-series',title,itemId,planId,requirementIds:requirements.map(r=>r.id),...metadata,data,analysis});
  if(!saved.ok&&!saved.record)throw Error(saved.error);if(!saved.ok&&saved.record)transientEvidence.push(saved.record);
  measurements=data;comparison=analysis;message=saved.ok?'Temperature history attached for review. Bias is measured minus predicted; no model fitting or requirement approval was performed.':'Comparison complete. '+saved.error+' Export the engineering package to retain the unsaved evidence.';error=!saved.ok;prepared={};render();
 }
 async function importFile(file){
  if(!file)return;if(file.size>2000000)throw Error('Use a temperature CSV smaller than 2 MB.');const selectedRun=run,selectedItem=itemId,mine=job,metadata=readEvidenceMetadata(),text=await file.text();
  if(!alive||run!==selectedRun||itemId!==selectedItem||job!==mine||stale)return;
  addMeasurements(text,'Measured temperature series · '+file.name,metadata);
 }
 function prepare(kind){
  let text,type,filename;const slug=String((kind==='package'?itemId:run?.itemId)||itemId).replace(/[^a-zA-Z0-9_-]/g,'-'),identity=String((kind==='package'?program.config.fingerprint:run?.configurationFingerprint||run?.configurationId)||program.config.fingerprint);
  if(kind==='package'){
   text=JSON.stringify({schema:'odc-thermal-engineering-package',schemaVersion:1,exportedAt:new Date().toISOString(),program:exportedProgram(),selectedItemId:itemId,selectedPlanId:planId,model,caseDefinition,activeRun:run,activeRunMatchesInputs:!!run&&!stale,measurementComparison:comparison,unsavedEvidence:transientEvidence,units:{temperature:'K',time:'s',power:'W',conductance:'W/K',capacitance:'J/K'},verificationStatus:'open'},null,2);type='application/json';filename='thermal-'+slug+'-'+identity+'-engineering.json';
  }else{if(!run)throw Error('Run a case before preparing its temperature channels.');text=kind==='trace'?thermalTraceCSV(run):thermalMeasurementTemplate(run);type='text/csv;charset=utf-8';filename='thermal-'+slug+'-'+identity+(kind==='trace'?'-trace.csv':'-measurement-template.csv');}
  retainFile(uid+':'+kind,new Blob([text],{type}),filename);prepared[kind]=true;message='File prepared. Use its download link to save the artifact.';error=false;render();
 }
 function openRun(id){
  const saved=store.listRuns(scopeId).find(r=>r.id===id&&r.itemId===itemId);if(!saved)return;
  cancelJob();stop();run=saved;stale=saved.configurationId!==program.config.id||saved.modelId!==model.id||saved.caseId!==caseDefinition.id;progress=0;measurements=null;comparison=null;prepared={};tab='results';message=stale?'Opened the original recorded result. Recalculate before applying it to the current model or 3D part.':'Opened the recorded result matching the current model and case.';error=false;
  sendRun(stale?null:run,{setting:stale?null:plan?.setting||(['orbital-transient','installed-environment'].includes(run.caseKind)?'installed':null),invalidated:stale});saveWorkspace();render();
 }
 function notifyFailure(e){if(alive){message=e.message||String(e);error=true;render();}}
 function handleClick(event){
  const target=event.target.closest('[data-te-action],[data-te-tab]');if(!target||!host.contains(target)||target.disabled)return;
  if(target.dataset.teTab){tab=target.dataset.teTab;saveWorkspace();render();host.querySelector('[data-te-tab="'+tab+'"]')?.focus();return;}
  const action=target.dataset.teAction;
  try{
   if(action==='choose-item'){chooseItem(target.dataset.teItem);return;}
   if(action==='apply-requirements'){applyRequirements();return;}
   if(action==='reset-requirements'){applyRequirements(true);return;}
   if(action==='previous-requirements'||action==='next-requirements'){requirementPage=Math.max(0,requirementPage+(action==='next-requirements'?1:-1));render();return;}
   if(action==='apply-model'||action==='reset-model'){modelDraft=action==='reset-model'?{}:{...modelDraft,...collect('model')};persist('model:'+itemId,modelDraft);invalidate();rebuild();message='Model inputs updated. Previous predictions retain their original inputs.';error=false;render();return;}
   if(action==='apply-case'){applyCase();message='Case inputs applied. Recalculate to evaluate this boundary history.';error=false;render();return;}
   if(action==='reset-case'){caseDraft={};persist('case:'+planId,caseDraft);invalidate();rebuild();message='Restored the planned scenario.';error=false;render();return;}
   if(action==='run'){applyCase();calculate().catch(notifyFailure);return;}
   if(action==='refine'){calculate(true).catch(notifyFailure);return;}
   if(action==='play'){if(playing){stop();render();}else start();return;}
   if(action==='show-test'||action==='show-results'){tab=action==='show-test'?'test':'results';saveWorkspace();render();return;}
   if(action.startsWith('prepare-')){prepare(action.slice(8));return;}
   if(action==='open-run'){openRun(target.dataset.teRun);return;}
   if(action==='import-paste'){addMeasurements(host.querySelector('[data-te-csv]')?.value||'','Measured temperature series · pasted CSV',readEvidenceMetadata());return;}
   if(action==='attach-document'){
    const saved=store.attachEvidence(program,{kind:host.querySelector('[data-te-document-kind]').value,title:host.querySelector('[data-te-document-title]').value.trim(),itemId,planId,requirementIds:requirements.map(r=>r.id),...readEvidenceMetadata()});
    if(!saved.ok&&!saved.record)throw Error(saved.error);if(!saved.ok)transientEvidence.push(saved.record);message=saved.ok?'Document attached with pending-review status. Verification remains open.':saved.error+' Export the engineering package to retain this record.';error=!saved.ok;prepared={};render();
   }
  }catch(e){notifyFailure(e);}
 }
 function handleChange(event){
  try{if(event.target.matches('[data-te-item-select]'))chooseItem(event.target.value);else if(event.target.matches('[data-te-plan-select]'))choosePlan(event.target.value);else if(event.target.matches('[data-te-measurements]'))importFile(event.target.files?.[0]).catch(notifyFailure);}catch(e){notifyFailure(e);}
 }
 function handleInput(event){if(event.target.matches('[data-te-cursor]')){stop();progress=clamp(Number(event.target.value)/1000,0,1);paintFrame();const play=host.querySelector('[data-te-action="play"]');if(play){play.textContent='Replay result';play.setAttribute('aria-pressed','false');}}}
 function handleKey(event){
  if(!event.target.matches('[data-te-tab]')||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=tabs.findIndex(t=>t[0]===tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tab=tabs[next][0];saveWorkspace();render();host.querySelector('[data-te-tab="'+tab+'"]')?.focus();
 }
 function selectCaseForSetting(setting){
  const kind=setting==='thermal-vacuum'?'tvac-cycling':setting==='thermal-cycle'?'atmospheric-cycling':null,next=plans.find(p=>p.kind===kind)||plans.find(p=>p.setting===setting);
  if(!next)return false;if(next.id!==planId){invalidate();planId=next.id;resolve();}tab='test';saveWorkspace();render();return true;
 }
 host.addEventListener('click',handleClick);host.addEventListener('change',handleChange);host.addEventListener('input',handleInput);host.addEventListener('keydown',handleKey);
 try{initialize();render();}catch(e){host.innerHTML='<section class="thermal-engineering"><div class="te-content"><h2>Thermal engineering</h2><p class="te-error" role="alert">'+esc(e.message||e)+'</p></div></section>';}
 return {
  getState:()=>({itemId,planId,tab,run,progress,playing,stale,configurationId:program?.config.id}),holdPlayback,selectCaseForSetting,
  update(next={}){cancelJob();stop();sendRun(null,{invalidated:true});hardware=next.hardware||hardware;catalog=next.catalog||catalog;record=next.record===undefined?record:next.record;phase=next.phase||phase;simulation=next.simulation||simulation;run=null;stale=false;measurements=null;comparison=null;progress=0;prepared={};message='';transientEvidence=[];initialize();render();},
  destroy(){if(!alive)return;alive=false;cancelJob();stop();pendingRun=null;host.removeEventListener('click',handleClick);host.removeEventListener('change',handleChange);host.removeEventListener('input',handleInput);host.removeEventListener('keydown',handleKey);host.innerHTML='';}
 };
}
