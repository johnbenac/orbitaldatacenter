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
class AuditWorker{async postMessage(input){if(input.firstDay||input.acceptedWindow){this.onmessage({data:{result:{purpose:input.design.aiPurpose,window:{start:input.start,end:input.start+input.span,span:input.span},offers:0,onTime:0,metrics:[],network:{route:input.design.serviceRoute},sources:[],status:'no-offers'}}});return}const {chronologicalAudit}=await imp('mission-worker.js');try {this.onmessage({data:chronologicalAudit(input,p=>this.onmessage({data:{progress:p}}))})} catch(e){this.onerror(e)}}terminate(){}}
globalThis.Worker=AuditWorker;
await imp('app.js');
const el=id=>document.getElementById(id), fire=async(data)=>{const e=new Element();e.dataset=data;await listeners.get('click')({target:e})},change=async(id,value,data={})=>{const q=new Element(id);Object.assign(q,{value,valueAsNumber:Number(value),dataset:data,tagName:'SELECT'});return listeners.get('change')({target:q})};
const {decodeScenario}=await imp('exports.js');
const snapshot=async()=>{await fire({action:'share'});const encoded=el('dialogbody').innerHTML.match(/#design=([A-Za-z0-9_-]+)/)[1];await fire({action:'close'});return decodeScenario(encoded)};
const accept=async()=>{assert.equal(el('dialogtitle').textContent,'Review design change');assert.match(el('dialogbody').innerHTML,/data-action="applyimpact"/);await fire({action:'applyimpact'})};
const {domainIds}=await imp('matrix-ui.js');
// A deep link chooses the initial view, and playing advances only the cursor.
if(!process.env.ODC_DEEP){
 const original=await snapshot(),originalUrl=location;
 globalThis.location=new URL('https://example.test/?phase=C&domain=orbit&field=ecc');
 await imp('app.js?window-route');
 const linked=await snapshot();assert.equal(linked.view.phase,'C');assert.deepEqual(linked.design,original.design);
 await fire({action:'window'});el('windowdate').value=original.design.epoch.slice(0,10)+'T06:00:00';await fire({action:'setwindow'});
 const chosen=await snapshot();assert.equal(chosen.view.start,21600);assert.equal(chosen.view.t,29400);
 await fire({action:'flightplay'});frames.get(frameCount)(performance.now()+100);
 const ticked=await snapshot();assert.ok(ticked.view.t>chosen.view.t);assert.equal(ticked.view.start,chosen.view.start);
 // Commissioning itself is available immediately; a deliberate late seek starts the worker.
 let requests=0;
 globalThis.Worker=class extends AuditWorker{postMessage(input){if(input.firstDay)return super.postMessage(input);requests++}};
 await fire({phase:'D'});await fire({phase:'E'});assert.equal((await snapshot()).view.chapter,'commissioning');assert.equal(requests,0);
 await fire({action:'midlife'});assert.equal(requests,1);await fire({action:'cancelaudit'});
 globalThis.Worker=AuditWorker;globalThis.location=originalUrl;await imp('app.js?default-after-window');
 console.log('Deep-link starter orbit, arbitrary UTC playback window and explicit late jump from commissioning passed.');
}
await fire({domain:'attitude'});await fire({gyroCase:'iss'});assert.equal(el('dialogtitle').textContent,'Review design change');await fire({action:'cancelimpact'});
await fire({gyroCase:'0'});await accept();assert.equal((await snapshot()).design.cmgMomentumNms,30);
await fire({gyroCase:'1'});await accept();await fire({domain:'conops'});
const initial=await snapshot();
await fire({page:'architecture'});assert.equal(el('title').textContent,'Spacecraft architecture');assert.match(el('subsystem').innerHTML,/Ground rules and assumptions/);
const linked=await snapshot();assert.equal(linked.view.reference,'architecture');assert.deepEqual(linked.design,initial.design);
await fire({page:'equipment'});assert.equal(el('title').textContent,'Master equipment list');assert.match(el('subsystem').innerHTML,/Helium/);
assert.deepEqual((await snapshot()).design,initial.design);
await fire({page:'architecture'});await fire({inspectBay:'true'});const cutaway=await snapshot();assert.equal(cutaway.view.phase,'C');assert.equal(cutaway.view.domain,'prop');assert.equal(cutaway.view.camera,'core');
await fire({phase:'A'});

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
await fire({phase:'B'});for(const domain of domainIds){await fire({domain});assert.match(el('system-choice').innerHTML,/>Preliminary design</);assert.match(el('engineering-toggle').innerHTML,/>Analysis</);assert(!el('study').hidden&&!el('lower').hidden&&!el('timeline').hidden);assert.match(el('study').innerHTML,/data-chart=/);assert.match(el('lower').innerHTML,/ledger|Engineering readouts/i)}
await fire({phase:'C'});await fire({domain:'thermal'});await fire({domain:'data'});assert(!(await snapshot()).view.overlays.includes('thermal'));
await fire({phase:'D'});await fire({domain:'launcher'});const before=(await snapshot()).design;await fire({useLauncher:'terran'});assert.deepEqual((await snapshot()).design,before);
console.log('All Phase B Design and Analysis sections, cited field help, coupled impact preview/cancel/apply, custom overrides, solver and allowance retention, flight locks and thermal layer isolation passed.');

await fire({phase:'A'});await fire({domain:'conops'});assert(el('purpose-brief').hidden);assert(!el('purpose-host').hidden);assert.equal((el('purpose-host').innerHTML.match(/data-preview-purpose=/g)||[]).length,6);assert.doesNotMatch(el('presetshelf').innerHTML,/designstrip|data-design=/);
await fire({previewPurpose:'finetune'});assert.equal((await snapshot()).view.domain,'conops');assert.equal((await snapshot()).design.aiPurpose,'text');
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

await fire({phase:'A'});await fire({domain:'conops'});const beforeBrowsing=(await snapshot()).design;
await fire({action:'newpreset'});assert.deepEqual((await snapshot()).design,beforeBrowsing,'Browsing starter choices is non-destructive');
await fire({previewPurpose:'finetune'});await fire({provisionPurpose:'finetune'});await accept();
const first=await snapshot();assert.equal(first.view.preset,'starter');assert.equal(first.view.aiPurpose,'finetune');assert.equal(first.view.modified,false);assert.equal(first.design.missionYears,beforeBrowsing.missionYears);
await change('',first.design.trayCount+1,{param:'trayCount'});if(el('dialog').open)await accept();await fire({action:'resetpreset'});await accept();
assert.deepEqual((await snapshot()).design,first.design,'Restoring the starter reproduces the selected hardware and mission context');
await fire({action:'savepreset'});el('preset-name').value='My tuned spacecraft';el('preset-description').value='Reusable adapter study';await fire({action:'commitpreset'});
const saved=(await snapshot()).view.preset;assert.match(saved,/^user-/);
await fire({provisionPurpose:'agents'});await accept();assert.equal((await snapshot()).view.preset,'starter');
await fire({action:'managepresets'});assert.match(el('dialogbody').innerHTML,/My tuned spacecraft/);assert(el('dialogbody').innerHTML.includes('data-design="'+saved+'"'));await fire({design:saved});await fire({action:'cancelimpact'});assert.equal(el('dialogtitle').textContent,'Saved designs');await fire({design:saved});await accept();
const reopened=await snapshot();assert.equal(reopened.view.presetName,'My tuned spacecraft');assert.deepEqual(reopened.design,first.design);
console.log('Single combined mission selector, reusable starter, exact named-design restore and cancel passed.');

const {DEPLOY_START_S,DEPLOY_END_S,deploymentMET}=await imp('commissioning-clock.js');
await fire({phase:'D'});await fire({phase:'E'});assert.equal(el('title').textContent,'Spacecraft deployment');assert.equal((await snapshot()).view.t,DEPLOY_START_S);
await fire({deployAt:'.59'});assert.equal((await snapshot()).view.t,deploymentMET(.59));assert.match(el('guidepanel').innerHTML,/outer hinge 90°/);
await fire({deploymentLens:'hinge'});assert.equal((await snapshot()).view.deploymentLens,'hinge');
await fire({deployAt:'1'});const locked=await snapshot();assert.equal(locked.view.chapter,'commissioning');assert.equal(locked.view.t,DEPLOY_END_S);
assert.match(el('guidepanel').innerHTML,/Replay/);
await fire({action:'flightplay'});assert.equal((await snapshot()).view.t,DEPLOY_START_S);
console.log('Deployment handoff, one-clock milestones, physical hinge inspection and locked-state replay passed.');

// A phase-C comparison can run and scrub the same flight director without changing the design.
await fire({phase:'C'});await fire({domain:'attitude'});
assert.match(el('guidepanel').innerHTML,/Play analysis/);
const {createSimulation}=await imp('model.js');const tested=await snapshot();
const contact=createSimulation(tested.design).events(0,86400).find(e=>e.type==='contact'&&e.start>DEPLOY_END_S);assert.ok(contact);
await fire({attitudeTime:String((contact.start+contact.end)/2)});const held=await snapshot();
assert.ok(el('attitude-strip').innerHTML.includes(contact.station));assert.match(el('attitude-history').innerHTML,/data-attitude-time/);
await fire({camera:'orbit'});const switched=await snapshot();assert.equal(switched.view.t,held.view.t);assert.deepEqual(switched.design,held.design);
assert.match(el('attitude-strip').innerHTML,/Earth-centered view/);
await fire({action:'flightplay'});assert.match(el('guidepanel').innerHTML,/Pause/);await fire({action:'flightplay'});
await fire({phase:'B'});assert.match(el('system-choice').innerHTML,/Flight pointing modes and actuator design/);
assert.equal(el('attitude-strip').hidden,true);assert.equal(el('attitude-history').hidden,true);
console.log('Pointing mode design, orbital scrub, camera continuity, coupled telemetry and analysis playback passed.');

await fire({phase:'A'});await fire({domain:'launcher'});await fire({useLauncher:'starship'});await accept();
const launch=(await snapshot()).design;assert.equal(launch.launchSite,'starbase-pad2');
await change('', 'ksc-starship',{param:'launchSite'});await fire({action:'cancelimpact'});assert.equal((await snapshot()).design.launchSite,'starbase-pad2');
await fire({watchLiftoff:''});await fire({launchTime:'4'});await fire({launchLens:'ship'});
const clock=await snapshot();assert.equal(clock.view.t,4);assert.equal(clock.view.launchLens,'ship');assert.equal(clock.view.speed,1);assert.match(el('guidepanel').innerHTML,/Starbase/);
console.log('Site-coupled launcher selection, cancel, liftoff clock, lens and share persistence passed.');

// Rehearse the bay as a visitor: switch teams, inspect their tools, then share this exact stop.
const {bayLesson}=await imp('bay-lessons.js');
await fire({chapter:'integration'});
const bayStart=await snapshot(),bayHardware=sizeDesign(bayStart.design);
assert.equal(bayStart.view.phase,'D');assert.equal(bayStart.view.chapter,'integration');
for(const domain of domainIds){
 await fire({domain});
 const now=await snapshot(), lesson=bayLesson(domain,bayHardware);
 assert.equal(now.view.domain,domain);assert.equal(now.view.camera,'launch');
 assert.equal(now.view.t,bayStart.view.t,domain+' kept time');assert.equal(now.view.chapter,'integration');
 assert.deepEqual(now.design,bayStart.design,domain+' kept flight configuration');
 assert.ok(el('guidepanel').innerHTML.includes(lesson.stationName),domain+' station');
 assert.ok(el('storyextras').innerHTML.includes(lesson.facts[0].label),domain+' design evidence');
}
await fire({domain:'thermal'});assert.match(el('guidepanel').innerHTML,/Coolant service cart/);
for(const lens of ['equipment','overview','interface']){
 await fire({bayLens:lens});assert.equal((await snapshot()).view.bayLens,lens);
 assert.match(el('cameras').innerHTML,new RegExp(`data-bay-lens="${lens}" aria-pressed="true"`));
}
await fire({bayToggle:'labels'});await fire({bayToggle:'isolate'});
listeners.get('capture:toggle')({target:{matches:s=>s==='.bay-basis',open:true}});
await fire({domain:'power'});assert.match(el('guidepanel').innerHTML,/Ground power cart/);
assert.match(el('guidepanel').innerHTML,/data-chapter="pad"/);assert.match(el('storyextras').innerHTML,/data-bay-analysis/);
const baySaved=await snapshot();assert.equal(baySaved.view.t,bayStart.view.t);assert.deepEqual(baySaved.design,bayStart.design);
function checkBaySelection(view){
 assert.equal(view.phase,'D');assert.equal(view.chapter,'integration');assert.equal(view.domain,'power');
 assert.equal(view.camera,'launch');assert.equal(view.bayLens,'interface');assert.equal(view.bayBasis,true);
 assert.equal(view.bayLabels,false);assert.equal(view.bayIsolate,false);
 assert.equal(el('bay-display').hidden,false);assert.match(el('bay-display').innerHTML,/data-bay-toggle="labels" aria-pressed="false"/);
 assert.match(el('bay-display').innerHTML,/data-bay-toggle="isolate" aria-pressed="false"/);
 assert.match(el('storyextras').innerHTML,/<details class="bay-basis" open/);
}
checkBaySelection(baySaved.view);
await fire({action:'share'});const bayFragment=el('dialogbody').innerHTML.match(/#design=[A-Za-z0-9_-]+/)[0];await fire({action:'close'});
await fire({bayAnalysis:''});const analysis=await snapshot();assert.equal(analysis.view.phase,'C');assert.equal(analysis.view.domain,'power');assert.deepEqual(analysis.design,baySaved.design);
assert.equal(el('bay-display').hidden,true);
// A new app instance reads the same #design URL a recipient opens, including the bay display state.
globalThis.location=new URL(bayFragment,'https://example.test');await imp('app.js?bay-share-restore');
const bayRestored=await snapshot();checkBaySelection(bayRestored.view);assert.equal(bayRestored.view.t,baySaved.view.t);assert.deepEqual(bayRestored.design,baySaved.design);
await fire({chapter:'pad'});const pad=await snapshot();assert.equal(pad.view.phase,'D');assert.equal(pad.view.chapter,'pad');assert.equal(pad.view.t,-8);
assert.deepEqual(pad.design,bayRestored.design);assert.equal(el('bay-display').hidden,true);assert.doesNotMatch(el('guidepanel').innerHTML,/Inside the integration bay/);
console.log('All integration teams, clock and design continuity, three lenses, display controls, reopened share, pad and analysis handoffs passed.');

// Same-tab reload immediately after choosing Data & delivery keeps the rocket and clock.
window.history={state:null,replaceState(state){this.state=structuredClone(state)}};
await fire({phase:'A'});await fire({domain:'launcher'});await fire({useLauncher:'falconHeavy'});await accept();
await fire({phase:'D'});assert.match(el('guidepanel').innerHTML,/See Falcon Heavy on the pad/);
await fire({chapter:'pad'});await fire({launchTime:'6'});await fire({domain:'data'});
await fire({phase:'D'});const beforeReload=await snapshot();
assert.equal(beforeReload.view.t,6);assert.equal(beforeReload.view.chapter,'ascent');
await imp('app.js?reload-data');const afterReload=await snapshot();
assert.equal(afterReload.view.domain,'data');assert.equal(afterReload.view.t,6);
assert.equal(afterReload.view.chapter,'ascent');assert.equal(afterReload.design.launcher,'falconHeavy');
console.log('Immediate reload at Falcon Heavy liftoff preserves the selected domain, rocket and clock.');

// Inspect the launch adapter, follow the stowed spacecraft, and stop the handling
// rehearsal at its final mate on the same mission clock used by the flight view.
await fire({phase:'A'});await fire({domain:'launcher'});await fire({useLauncher:'starship'});await accept();
await fire({phase:'B'});assert.match(el('fleet-host').innerHTML,/ODC-LI-01/);
await fire({watchLoading:''});await fire({bayLens:'payload'});await fire({loadingAt:'-960'});
let loadState=await snapshot();assert.equal(loadState.view.t,-960);assert.equal(loadState.view.bayLens,'payload');assert.equal(loadState.view.chapter,'integration');
assert.match(el('loading-player').innerHTML,/Latch hatch/);
await fire({loadingAt:'-660'});assert.match(el('loading-player').innerHTML,/Replay payload loading/);
await fire({loadingPlay:''});loadState=await snapshot();
assert.equal(loadState.view.t,-3000);assert.equal(loadState.view.speed,120);assert.equal(loadState.design.launcher,'starship');
// Exercise the same UI buttons as the insertion director, including a direction
// change while the clock is moving. Exact wall time makes the MET comparisons deterministic.
const nativeClock=globalThis.performance;let wall=nativeClock.now();
globalThis.performance={now:()=>wall};
const advanceWall=ms=>{wall+=ms;frames.get(frameCount)(wall)};
try{
 await fire({loadingAt:'-960'});await change('flight-rate',10);await fire({loadingPlay:'reverse'});
 assert.match(el('loading-player').innerHTML,/Pause reverse playback/);
 advanceWall(800);assert.equal((await snapshot()).view.t,-968);
 await fire({loadingPlay:''});advanceWall(800);assert.equal((await snapshot()).view.t,-960);
 await fire({chapter:'insertion'});await fire({launchTime:'600'});await change('flight-rate',10);
 await fire({action:'flightreverse'});assert.match(el('guidepanel').innerHTML,/Pause reverse playback/);
 advanceWall(800);await fire({action:'flightplay'});advanceWall(800);
 assert.equal((await snapshot()).view.t,600);
 await fire({action:'flightreverse'});advanceWall(800);
 assert.equal((await snapshot()).view.t,592);
 await fire({loadingPlay:''}); // The bay-only button has no effect in orbit.
 await fire({chapter:'integration'});await fire({loadingAt:'-3000'});await change('flight-rate',600);
 await fire({loadingPlay:'reverse'});advanceWall(1500);
 assert.equal((await snapshot()).view.t,-3600);
}finally{globalThis.performance=nativeClock}
console.log('Adapter-to-integration handoff, reversible payload milestones, follow camera and replay stay on one mission clock.');

await fire({phase:'C'});await fire({camera:'spacecraft'});await fire({attitudeTime:'6402'});
const orbitBefore=await snapshot();assert.equal(orbitBefore.view.lighting,'studio');
assert.equal(el('orbit-lighting').hidden,false);
assert.equal(orbitBefore.view.orbitVectors,true);assert.equal(el('flight-vector-toggle').getAttribute('aria-pressed'),'true');
await fire({action:'flightvectors'});
const hiddenVectors=await snapshot();
assert.equal(hiddenVectors.view.orbitVectors,false);assert.equal(el('flight-vector-key').hidden,true);
assert.deepEqual(hiddenVectors.design,orbitBefore.design);assert.equal(hiddenVectors.view.t,orbitBefore.view.t);
await fire({lighting:'realistic'});assert.equal((await snapshot()).view.lighting,'realistic');
await fire({lighting:'studio'});await change('camera-exposure',1);const studioView=await snapshot();
assert.deepEqual(studioView.design,orbitBefore.design);assert.equal(studioView.view.t,orbitBefore.view.t);
assert.equal(studioView.view.camera,orbitBefore.view.camera);assert.equal(studioView.view.lighting,'studio');
await fire({camera:'core'});assert.equal(el('lighting-studio').getAttribute('aria-pressed'),'true');
await fire({action:'share'});const studioLink=el('dialogbody').innerHTML.match(/#design=[A-Za-z0-9_-]+/)[0];await fire({action:'close'});
globalThis.location=new URL(studioLink,'https://example.test');await imp('app.js?shared-orbital-lighting');
const sharedLighting=await snapshot();assert.equal(sharedLighting.view.orbitVectors,false,'Shared view preserves the vector switch');assert.equal(sharedLighting.view.lighting,'studio');assert.equal(sharedLighting.view.exposureEV,1);await fire({phase:'D'});
assert.equal(el('orbit-lighting').hidden,true);
console.log('Lighting defaults, camera continuity, fixed mission time and design, shared studio view, and ground-view scope passed.');
