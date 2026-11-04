// Exercise the actual DOM event routing against the numerical model without a GPU.
import assert from 'node:assert/strict';
const imp=name=>import(new URL('./dist/'+name,import.meta.url));
const ids=new Map(),listeners=new Map(),files=new Map();
class Element{
 constructor(id=''){this.id=id;this.innerHTML='';this.dataset={};this.open=false;this.style={setProperty(){}};this.classList={add(){},remove(){},toggle(){},contains(){return false}}}
 setAttribute(k,v){this[k]=v}getAttribute(k){return this[k]??null}removeAttribute(k){delete this[k]}matches(){return false}getBoundingClientRect(){return {width:760,height:390,left:0,right:760,top:0,bottom:390}}querySelector(sel){if(sel==='[data-sd-sheet]')return null;return new Element()}contains(){return false}focus(){}querySelectorAll(){return []}append(){}appendChild(){}remove(){}addEventListener(){}insertBefore(){}insertAdjacentHTML(){}showModal(){this.open=true}close(){this.open=false}scrollIntoView(){}closest(){return this}click(){if(this.download)files.set(this.download,this.href)} getContext(){return null} getClientRects(){return []}
}
globalThis.document={body:new Element(),getElementById(id){if(!ids.has(id))ids.set(id,new Element(id));return ids.get(id)},querySelectorAll(){return []},querySelector(){return new Element()},createElement(){return new Element()},addEventListener(k,f,capture){listeners.set((capture?'capture:':'')+k,f)}};
const backing=new Map();globalThis.window={localStorage:{getItem:k=>backing.get(k)??null,setItem:(k,v)=>backing.set(k,v)},scrollTo(){},addEventListener(){}};globalThis.matchMedia=()=>({matches:true});globalThis.location=new URL('https://example.test'+(process.env.ODC_DEEP||''));const frames=new Map();let frameCount=0;globalThis.requestAnimationFrame=f=>{frames.set(++frameCount,f);return frameCount};globalThis.innerWidth=1280;globalThis.innerHeight=800;


const realTimeout=globalThis.setTimeout;globalThis.setTimeout=(f,t,...a)=>{const r=realTimeout(f,t,...a);if(t>=2500)r.unref?.();return r};
const rawError=console.error;console.error=(e)=>{if(e?.stack?.includes('scene.js')||e?.stack?.includes('three.module.js'))return;rawError(e)};
class AuditWorker{async postMessage(input){const {chronologicalAudit}=await imp('mission-worker.js');try {this.onmessage({data:chronologicalAudit(input,p=>this.onmessage({data:{progress:p}}))})} catch(e){this.onerror(e)}}terminate(){}}
globalThis.Worker=AuditWorker;
await imp('app.js');
const el=id=>document.getElementById(id), fire=async(data)=>{const e=new Element();e.dataset=data;await listeners.get('click')({target:e})},change=async(id,value,data={})=>{const q=new Element(id);Object.assign(q,{value,valueAsNumber:Number(value),dataset:data,tagName:'SELECT'});return listeners.get('change')({target:q})};
const {decodeScenario}=await imp('exports.js');
const snapshot=async()=>{await fire({action:'share'});const encoded=el('dialogbody').innerHTML.match(/#design=([A-Za-z0-9_-]+)/)[1];await fire({action:'close'});return decodeScenario(encoded)};
const accept=async()=>{assert.equal(el('dialogtitle').textContent,'Review design change');assert.match(el('dialogbody').innerHTML,/Apply design change/);await fire({action:'applyimpact'})};
const {domainIds}=await imp('matrix-ui.js');
await fire({domain:'power'});await change('',182,{param:'packWhKg'});const old=(await snapshot()).design;
await change('','lfp',{param:'battery'});assert.match(el('dialogbody').innerHTML,/Edited preset values will be replaced/);assert.match(el('dialogbody').innerHTML,/Battery pack volume/);assert.match(el('dialogbody').innerHTML,/Retained assumptions to verify/);assert.match(el('dialogbody').innerHTML,/Same 24-hour window/);
await fire({action:'cancelimpact'});assert.deepEqual((await snapshot()).design,old);
await change('','lfp',{param:'battery'});await accept();const lfp=(await snapshot()).design;assert.equal(lfp.battery,'lfp');assert.notEqual(lfp.packWhKg,182);
await change('',147,{param:'packWhKg'});await fire({action:'compare'});await fire({preset:'battery',id:'lfp'});
assert.equal(el('dialogtitle').textContent,'Review design change');assert.match(el('dialogbody').innerHTML,/Edited preset values will be replaced/);await fire({action:'cancelimpact'});assert.equal(el('dialogtitle').textContent,'Technology comparison');await fire({action:'close'});assert.equal((await snapshot()).design.packWhKg,147);
await fire({guideKey:'battery'});assert(el('guide-dialog').open);assert.match(el('guide-body').innerHTML,/href="https:/);await fire({action:'guideclose'});
await fire({domain:'launcher'});assert.match(el('fleet-host').innerHTML,/Falcon Heavy/);await change('phase-solve','throughput');await accept();
for(const id of ['falconHeavy','longMarch9']){
 const before=await snapshot();await fire({useLauncher:id});assert.match(el('dialogbody').innerHTML,/reference orbit/);await fire({action:'cancelimpact'});assert.deepEqual((await snapshot()).design,before.design);
 await fire({useLauncher:id});await accept();const after=await snapshot();assert.equal(after.design.launcher,id);assert.equal(after.design.launchAllowanceKg,before.design.launchAllowanceKg);assert.equal(after.view.solve,before.view.solve);
}
await change('',.003,{param:'missionYears'});if(el('dialog').open)await accept();
await fire({phase:'B'});for(const domain of domainIds){await fire({domain});assert.match(el('system-choice').innerHTML,/>Design</);assert.match(el('engineering-toggle').innerHTML,/>Analysis</);assert(!el('study').hidden&&!el('lower').hidden&&!el('timeline').hidden);assert.match(el('study').innerHTML,/data-chart=/);assert.match(el('lower').innerHTML,/ledger|Engineering readouts/i)}
await fire({phase:'C'});await fire({domain:'thermal'});await fire({domain:'data'});assert(!(await snapshot()).view.overlays.includes('thermal'));
await fire({phase:'D'});await fire({domain:'launcher'});const before=(await snapshot()).design;await fire({useLauncher:'terran'});assert.deepEqual((await snapshot()).design,before);
console.log('All Phase B Design and Analysis sections, cited field help, coupled impact preview/cancel/apply, custom overrides, solver and allowance retention, flight locks and thermal layer isolation passed.');

await fire({phase:'A'});await fire({domain:'conops'});assert.equal((el('purpose-brief').innerHTML.match(/class="purpose-shortcut /g)||[]).length,6);
const original=await snapshot();await fire({openPurpose:'agents'});assert.equal((await snapshot()).view.domain,'purpose');assert.equal((await snapshot()).design.aiPurpose,'text');
await fire({usePurpose:'agents'});assert.match(el('dialogbody').innerHTML,/Earth customer|Agentic research/i);await fire({action:'cancelimpact'});assert.deepEqual((await snapshot()).design,original.design);
await fire({usePurpose:'agents'});await accept();const agentMission=(await snapshot()).design;
for(const key of ['workload','compute','trayCount','paramsB','storageTB','batteryKWh','solarM2','radiatorM2'])assert.equal(agentMission[key],original.design[key],'retained '+key);
const {sizeDesign}=await imp('design.js');const oldH=sizeDesign(original.design),agentH=sizeDesign(agentMission);for(const key of ['launchKg','dryKg','bodyLengthM','stowedDiameterM','stowedLengthM'])assert.equal(agentH[key],oldH[key],key);
assert.equal(agentMission.aiPurpose,'agents');await fire({studyPurpose:'text'});assert.match(el('dialogbody').innerHTML,/accelerator memory/);await fire({action:'close'});
await fire({previewPurpose:'batch'});assert.equal((await snapshot()).design.aiPurpose,'agents');await fire({provisionPurpose:'batch'});await accept();const batchMission=(await snapshot()).design;assert.equal(batchMission.aiPurpose,'batch');assert.notEqual(batchMission.storageTB,original.design.storageTB);
await fire({domain:'conops'});assert.doesNotMatch(el('phase-content').innerHTML,/data-param="(?:ttftTargetS|latencyTargetS|requiredTps)"/);
await fire({openPurpose:'pretrain'});await fire({provisionPurpose:'pretrain'});await accept();const trainingMission=(await snapshot()).design;assert.equal(trainingMission.aiPurpose,'pretrain');
await fire({action:'ai-transfer'});await fire({artifactCase:'trillion'});assert.match(el('dialogbody').innerHTML,/2 TB/);assert.match(el('dialogbody').innerHTML,/26 min 40 s/);await fire({action:'close'});
await fire({phase:'D'});await fire({usePurpose:'text'});assert.deepEqual((await snapshot()).design,trainingMission);assert.doesNotMatch(el('purpose-host').innerHTML,/data-provision-purpose/);
console.log('Earth-purpose navigation, preview, cancel, fixed-install comparison, physical provisioning, CONOPS fields, trillion-parameter transfer and flight-phase locks passed.');
