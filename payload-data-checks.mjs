// Cross-model contracts for the payload-data workspace. These checks deliberately
// use the shared mission integrator rather than a second payload simulation.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sizeDesign} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {commissioningClock} from './dist/commissioning-clock.js';
import {referenceCenterOrder} from './dist/reference-centers.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {purposeDisplay} from './dist/purpose-display.js';
import {payloadDataState,payloadDataStage,payloadServiceLink,renderPayloadDataWorkspace} from './dist/payload-data-handling.js';
import {buildElectricalArchitecture,electricalKinds} from './dist/electrical-architecture.js';
import {buildElectricalProgram,validateElectricalProgram,runElectricalCheck} from './dist/electrical-program.js';
import {electricalBlockDiagram,electricalCardDiagram,electricalResultMarkup,renderElectricalWorkspace,renderPartElectrical} from './dist/electrical-engineering-ui.js';
import {buildPartsCatalog} from './dist/parts-catalog.js';

let passed=0;
let integrations=0;
const contractsOnly=process.argv.includes('--contracts-only');
const failures=[];
const check=(name,fn)=>{try{fn();passed++;}catch(error){failures.push({name,message:error.message});}};
const close=(actual,expected,scale=1)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=Math.max(1e-7,Math.abs(scale)*1e-8),`${actual} differs from ${expected}`);
const clean=html=>assert.doesNotMatch(html,/\bundefined\b|\bNaN\b|\[object Object\]/);
const links=html=>[...html.matchAll(/data-electrical-open-part="([^"]+)"/g)].map(m=>m[1]);
const flowActive=(html,id)=>{const tag=html.match(new RegExp('<path data-payload-flow="'+id+'"[^>]*>'))?.[0];assert.ok(tag,'Missing '+id+' data-flow edge');return tag.includes('is-active');};
const cases=[];
const purposes=Object.keys(purposeDisplay);

function inspectSnapshot(h,s){
 const p=payloadDataState(h,s),scale=Math.max(1,h.initialQueueGB+s.generatedGB,h.ai.preloadedGB+s.aiInputUploadedGB);
 assert.equal(p.purpose,h.input.aiPurpose);
 assert.equal(p.complete,true);
 assert.equal(p.balanced,true,p.issues.join(' '));
 close(h.ai.preloadedGB+s.aiInputUploadedGB,s.aiInputConsumedGB+s.aiInputBufferGB,scale);
 close(s.aiProductGeneratedGB,s.aiProductDeliveredGB+s.aiProductQueueGB+s.aiProductDroppedGB,scale);
 close(h.initialQueueGB+s.generatedGB,s.deliveredGB+s.queueGB+s.droppedGB,scale);
 for(const [customer,total] of [['aiProductGeneratedGB','generatedGB'],['aiProductDeliveredGB','deliveredGB'],['aiProductQueueGB','queueGB'],['aiProductDroppedGB','droppedGB']])assert.ok(s[customer]<=s[total]+Math.max(1e-7,scale*1e-8),customer+' is not a subset of '+total);
 for(const name of ['aiInputMbps','aiInputReadMbps','aiProductGeneratedMbps','aiCheckpointWriteMbps','aiOutputMbps'])assert.ok(Number.isFinite(s[name])&&s[name]>=0,'Invalid byte-rate field '+name);
 assert.ok(s.aiInputMbps<=s.aiRouteUpMbps+1e-6,'Actual incoming exceeds available route capacity');
 assert.ok(s.aiInputReadMbps<=h.diskReadGBs*8000+1e-6,'Local input reads exceed installed drive bandwidth');
 assert.ok(s.aiCheckpointWriteMbps<=h.diskWriteGBs*8000+1e-6,'Checkpoint writes exceed installed drive bandwidth');
 if(h.ai.training)close(s.aiInputConsumedGB,0);
 close(p.checkpoint.writtenGB,s.aiCheckpointWriteGB);
 close(p.checkpoint.pendingGB,s.aiCheckpointPendingGB);
 const html=renderPayloadDataWorkspace(h,s,'E');clean(html);
 assert.ok(html.includes(purposeDisplay[h.input.aiPurpose].name));
 assert.equal(flowActive(html,'incoming'),s.aiInputMbps>0);
 assert.equal(flowActive(html,'input-read'),s.aiInputReadMbps>0);
 assert.equal(flowActive(html,'product'),s.aiProductGeneratedMbps>0);
 assert.equal(flowActive(html,'earth-receipt'),s.aiOutputMbps>0);
}

for(const reference of referenceCenterOrder){
 const recipe=buildReferenceDesign(reference);
 for(const purpose of purposes){
  const h=sizeDesign({...recipe,aiPurpose:purpose}),sim=createSimulation(h);
  check(reference+' / '+purpose+' / '+(contractsOnly?'initial model contract':'initial and integrated ledgers'),()=>{
   const initial=sim.at(0);
   inspectSnapshot(h,initial);
   // Bounded integration through deployment and ten minutes of service. This
   // avoids a full day per case while exercising real accepted byte counters.
   const state=contractsOnly?initial:sim.auditStep(undefined,commissioningClock(h).endS+600).state;
   if(!contractsOnly)integrations++;
   inspectSnapshot(h,state);cases.push({reference,purpose,h,state});
  });
 }
 console.log('Payload reference checked: '+reference);
}

const baseline=sizeDesign(buildReferenceDesign(referenceCenterOrder[0]));
const zeroState={aiInputUploadedGB:0,aiInputConsumedGB:0,aiInputBufferGB:baseline.ai.preloadedGB,aiProductGeneratedGB:0,aiProductDeliveredGB:0,aiProductQueueGB:0,aiProductDroppedGB:0,generatedGB:0,deliveredGB:0,queueGB:baseline.initialQueueGB,droppedGB:0,aiCheckpointPendingGB:0,aiCheckpointWriteGB:0,aiCheckpointCommits:0,aiCheckpointCompleteUnits:0,aiInputMbps:0,aiInputReadMbps:0,aiProductGeneratedMbps:0,aiCheckpointWriteMbps:0,aiOutputMbps:0,aiUnitRate:0,hkStoredMB:0};

check('Missing and nonfinite counters cannot pass ledger closure',()=>{
 const emptyHardware={...baseline,initialQueueGB:0,ai:{...baseline.ai,preloadedGB:0}};
 assert.equal(payloadDataState(emptyHardware,{}).balanced,false);
 const missing={...zeroState};delete missing.aiProductDeliveredGB;
 assert.equal(payloadDataState(baseline,missing).complete,false);
 assert.equal(payloadDataState(baseline,{...zeroState,generatedGB:NaN}).balanced,false);
 assert.ok(renderPayloadDataWorkspace(emptyHardware,{}).includes('required counters are missing'));
});
check('Shared recorder and negative subtotals cannot hide behind balanced customer outputs',()=>{
 assert.equal(payloadDataState(baseline,{...zeroState,generatedGB:1}).balanced,false);
 const bad={...zeroState,generatedGB:2,queueGB:baseline.initialQueueGB+2,aiProductGeneratedGB:3,aiProductQueueGB:3};
 const p=payloadDataState(baseline,bad);
 assert.equal(p.output.residualGB,0);assert.equal(p.shared.residualGB,0);
 assert.equal(p.other.generatedGB,-1);assert.equal(p.balanced,false);
 assert.ok(p.issues.some(x=>x.includes('subtotal')));
});
check('Training reads and local checkpoint writes do not invent downlink products',()=>{
 const training={...baseline,ai:{...baseline.ai,purposeId:'pretrain',training:true}};
 const s={...zeroState,aiUnitRate:50,aiRouteUpMbps:1600,aiInputReadMbps:8,aiCheckpointWriteMbps:64,aiCheckpointWriteGB:10,aiCheckpointPendingGB:4};
 const p=payloadDataState(training,s),html=renderPayloadDataWorkspace(training,s);
 assert.equal(p.inputActive,false);assert.equal(p.inputReadActive,true);assert.equal(p.checkpointActive,true);assert.equal(p.productActive,false);
 assert.equal(flowActive(html,'incoming'),false);assert.equal(flowActive(html,'input-read'),true);assert.equal(flowActive(html,'execution'),true);assert.equal(flowActive(html,'product'),false);
 assert.equal(p.output.generatedGB,0);assert.equal(p.balanced,true);
 assert.equal(payloadDataState(training,{...s,aiInputConsumedGB:1,aiInputBufferGB:baseline.ai.preloadedGB-1}).balanced,false);
});
check('Service interface opens the selected installed terminal',()=>{
 for(const [terminal,id] of [['Optical','flight:05.03'],['Ka','flight:05.02'],['S-band','flight:05.01']]){
  const h=sizeDesign({...buildReferenceDesign(referenceCenterOrder[0]),communicationsPackage:'full',serviceRoute:'direct'}),s={...zeroState,aiActiveRoute:'direct',selectedPayloadTerminal:terminal};
  assert.equal(payloadServiceLink(h,s).partId,id);
  assert.ok(renderPayloadDataWorkspace(h,s).includes('data-electrical-open-part="'+id+'"'));
 }
 assert.equal(payloadServiceLink(baseline,{aiRelayOn:true,selectedPayloadTerminal:'S-band'}).partId,'flight:05.03');
 const withoutRF=sizeDesign({...buildReferenceDesign(referenceCenterOrder[0]),communicationsPackage:'optical-only',serviceRoute:'direct',link:'sband'});
 const unavailable=payloadServiceLink(withoutRF,{aiActiveRoute:'outage',selectedPayloadTerminal:'S-band'});
 assert.equal(unavailable.installed,false);assert.equal(unavailable.partId,null);
});
check('Every phase and purpose retains the correct product and evidence boundary',()=>{
 for(const purpose of purposes){
  const h=cases.find(c=>c.purpose===purpose)?.h||sizeDesign({...buildReferenceDesign(referenceCenterOrder[0]),aiPurpose:purpose});
  for(const phase of ['A','B','C','D','E','F']){
   const stage=payloadDataStage(phase,h),html=renderPayloadDataWorkspace(h,zeroState,phase);
   assert.ok(stage.description.includes(purposeDisplay[purpose].name));assert.ok(html.includes('PHASE '+phase));clean(html);
   assert.ok(html.includes('Delivery bytes alone')||html.includes('Those service outcomes remain in Payload Operations'));
  }
 }
});

for(const reference of referenceCenterOrder){
 const entry=cases.find(c=>c.reference===reference),h=entry?.h||sizeDesign(buildReferenceDesign(reference)),s=entry?.state||zeroState;
 check(reference+' / electrical model, cards, requirements and navigation contracts',()=>{
  const graph=buildElectricalArchitecture(h),program=buildElectricalProgram(h),catalog=buildPartsCatalog(h,s);
  assert.deepEqual(validateElectricalProgram(program),[]);
  const run=runElectricalCheck(program);
  assert.equal(run.ready,true);assert.equal(run.evidenceStatus,'predicted');assert.equal(run.verificationStatus,'open');assert.ok(run.checks.length>0);
  close(graph.cards.reduce((v,c)=>v+c.massKg,0),h.cdh.suiteMassKg);
  close(graph.cards.reduce((v,c)=>v+c.powerW,0),h.cdh.operatingW);
  for(const kind of Object.keys(electricalKinds))clean(electricalBlockDiagram(graph,kind));
  const payload=renderPayloadDataWorkspace(h,s),electrical=renderElectricalWorkspace(h,s),cards=electricalCardDiagram(graph);
  for(const html of [payload,electrical,cards]){clean(html);for(const id of links(html))assert.ok(catalog.byId[id],'Unresolved Parts navigator link '+id);}
  assert.ok(cards.includes('project implementation'));
  for(const card of graph.cards){
   const html=renderPartElectrical(h,catalog.byId[card.itemId]);clean(html);
   assert.ok(html.includes(card.label));assert.ok(html.includes('Electrical capability and interface requirements'));assert.ok(html.includes('Required evidence:'));
   assert.ok(program.requirements.some(r=>r.itemId===card.itemId));
   assert.ok(program.plans.some(p=>p.itemId===card.itemId));
  }
 });
}

check('Payload diagram nodes support pointer and keyboard navigation',()=>{
 const app=readFileSync(new URL('./dist/app.js',import.meta.url),'utf8');
 assert.ok(app.includes('if(el.dataset.electricalOpenPart)'));
 assert.ok(app.includes("[data-payload-data-workspace] g[data-electrical-open-part]"));
 assert.ok(app.includes("e.key==='Enter'||e.key===' '"));
});
check('Electrical result rendering preserves blocked inputs and predicted shortfalls',()=>{
 const blocked=electricalResultMarkup({ready:false,status:'inputs-required',configurationId:'fixture',evidenceId:'input-check',inputErrors:[{path:'source.voltageV',message:'A finite source voltage is required.'}],checks:[]});
 clean(blocked);assert.ok(blocked.includes('ed-review'));assert.ok(blocked.includes('A finite source voltage is required.'));assert.ok(blocked.includes('cannot run'));
 const failed=electricalResultMarkup({ready:true,status:'predicted-shortfalls',configurationId:'fixture',evidenceId:'analysis-check',summary:{executed:1,shortfalls:1},checks:[{id:'drop',title:'Branch voltage drop',within:false,actual:1,limit:.56,unit:'V',status:'predicted-shortfall'}]});
 clean(failed);assert.ok(failed.includes('ed-review'));assert.ok(failed.includes('1 predicted shortfalls'));assert.ok(failed.includes('require measurements'));
});

for(const failure of failures)console.error('FAIL '+failure.name+'\n  '+failure.message);
console.log('Payload/data integration checks: '+passed+' passed, '+failures.length+' failed; '+cases.length+' reference/workload configurations, '+integrations+' bounded mission integrations.');
if(failures.length)process.exitCode=1;
