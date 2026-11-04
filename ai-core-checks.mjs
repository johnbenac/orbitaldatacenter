import assert from 'node:assert/strict';
import {aiPurposes} from './dist/ai-purpose.js';
import {defaults,sizeDesign,normalizeDesign,applyAIPurpose,sizingEnvelope,inverseSolve,YEAR} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {chronologicalAudit} from './dist/mission-worker.js';
const D=86400,near=(a,b,tol=1e-6)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} vs ${b}`);
const base=sizeDesign(defaults);assert.equal(normalizeDesign({}).aiPurpose,'text');assert.deepEqual(Object.keys(aiPurposes),['text','voice','batch','agents','finetune','pretrain']);
for(const id of Object.keys(aiPurposes)){
 const selected=applyAIPurpose(defaults,id);assert.deepEqual(selected,{...defaults,aiPurpose:id});
 const h=sizeDesign(selected);assert.equal(h.launchKg,base.launchKg);assert.deepEqual(h.massLedger,base.massLedger);assert.equal(h.bodyLengthM,base.bodyLengthM);assert.equal(h.bodyWidthM,base.bodyWidthM);
 const d=applyAIPurpose(defaults,id,true),built=sizeDesign(d);assert.equal(built.input.aiPurpose,id);assert.deepEqual(built.errors,[]);
 assert.ok(built.ai.activeUnitsPerSec>=0);if(id==='batch'||id==='agents')assert.ok(built.launchScreenFeasible,id);
}
const trillion=sizeDesign({...defaults,aiPurpose:'pretrain',pretrainParamsB:1000,trainingTokensB:1000,artifactBits:16,trainableFraction:.001});
assert.equal(trillion.ai.residentWeights,2000);assert.equal(trillion.ai.totalWeightGB,2000);assert.equal(trillion.ai.adapterGB,2);assert.equal(trillion.ai.restartGB,14000);assert.equal(trillion.ai.uniqueCorpusGB,4000);
assert.equal(sizeDesign({...trillion.input,artifactBits:4}).ai.totalWeightGB,500);
assert.ok(trillion.ai.memoryMarginGB<0);assert.equal(trillion.ai.activeUnitsPerSec,0);assert.equal(sizingEnvelope(trillion).feasible,false);
const weak=createSimulation(trillion).at(5000);assert.equal(weak.aiTrainingTokens,0);assert.equal(weak.tokensGenerated,0);assert.equal(weak.aiProductGeneratedGB,0);
const big=applyAIPurpose(defaults,'pretrain',true),dense=sizeDesign(big),sparse=sizeDesign({...big,activeParamFraction:.125});assert.equal(dense.ai.modelMemoryGB,sparse.ai.modelMemoryGB);assert.equal(dense.ai.artifactGB,sparse.ai.artifactGB);assert.ok(sparse.ai.activeUnitsPerSec>dense.ai.activeUnitsPerSec);assert.ok(dense.ai.trainingDays>big.trainingBudgetDays);
assert.ok(sizeDesign({...big,fabricGbps:10}).ai.activeTrainingTps<dense.ai.activeTrainingTps);
const ag=applyAIPurpose(defaults,'agents',true),starved=sizeDesign({...ag,hostCores:1,toolCpuSeconds:100});assert.ok(starved.ai.activeUnitsPerSec<sizeDesign(ag).ai.activeUnitsPerSec);assert.ok(starved.ai.hostKw>0);
const narrow=sizeDesign({...ag,agentFanout:1}),wide=sizeDesign({...ag,agentFanout:10000});assert.ok(wide.ai.agentWaves>1&&wide.ai.agentWorkerSlots<10000);assert.equal(wide.ai.agentCallsPerTask,ag.agentSerialSteps*10000);assert.equal(wide.ai.tokensPerUnit,10000*narrow.ai.tokensPerUnit);assert.equal(wide.ai.outputBytesPerUnit,narrow.ai.outputBytesPerUnit);assert.ok(wide.ai.activeUnitsPerSec<narrow.ai.activeUnitsPerSec);assert.equal(wide.ai.internalBytesPerTask,narrow.ai.internalBytesPerTask*10000);
const partial=createSimulation(wide).at(1300);assert.ok(partial.aiUnitsComputed>0&&partial.aiUnitsComputed<1);assert.equal(partial.aiProductGeneratedGB,0);assert.ok(partial.aiPeerTrafficGB>0);
near(10000*50*4*8/1e6,16);const voice=sizeDesign(applyAIPurpose(defaults,'voice',true));near(voice.ai.inputBytesPerUnit*8/voice.input.voiceTurnSeconds/1000,24);near(voice.ai.outputBytesPerUnit,voice.ai.inputBytesPerUnit);near(24*1000*.020/8,60);
function closure(h,x){const a=h.ai;near(a.preloadedGB+x.aiInputUploadedGB-x.aiInputConsumedGB,x.aiInputBufferGB);near(x.aiProductGeneratedGB,x.aiProductDeliveredGB+x.aiProductDroppedGB+x.aiProductQueueGB);near(h.initialQueueGB+x.generatedGB,x.deliveredGB+x.droppedGB+x.queueGB);assert.ok(x.aiProductDeliveredGB<=x.deliveredGB+1e-7);if(a.training)assert.equal(x.tokensGenerated,0);}
for(const id of Object.keys(aiPurposes)){
 const d={...applyAIPurpose(defaults,id,true),missionYears:.008},h=sizeDesign(d),m=createSimulation(h),x=m.at(D);closure(h,x);assert.ok(x.aiTrainingTokens<=h.ai.trainingGoalTokens+.01);
 const day=m.serviceDay(undefined,D),segments=m.serviceTimeline(0,D);for(const k of ['aiInputUploadedGB','aiProductDeliveredGB','aiProductGeneratedGB'])near(segments.reduce((n,p)=>n+p[k],0),x[k],1e-6);
 assert.ok(day.segments.every(s=>s.routeUpMbps>=0&&s.routeDownMbps>=0&&s.servedLoadKW<=s.loadKW+1e-7));
 const seed=m.serviceSeed(D/2),copy=m.serviceSeed(D/2);seed.aiBuffer=0;assert.equal(copy.aiBuffer,m.serviceSeed(D/2).aiBuffer);
 if(id==='pretrain')assert.equal(x.aiProductGeneratedGB,0);
}
for(const id of ['finetune','pretrain']){
 const d={...applyAIPurpose(defaults,'finetune',true),aiPurpose:id,missionYears:.009,pretrainParamsB:.5,trainingTokensB:.001,fineTuneTokensM:5,datasetGB:.02,initialInputGB:.02,artifactKind:id==='pretrain'?'full':'adapter',artifactBits:16,trainingBudgetDays:30,initialQueueGB:2,bulkMbps:1.2};
 const h=sizeDesign(d),m=createSimulation(h),r=chronologicalAudit(d).result,x=r.finalState;
 assert.ok(h.ai.fit&&h.ai.activeTrainingTps>0);near(x.aiTrainingTokens,h.ai.trainingGoalTokens);near(x.aiProductGeneratedGB,h.ai.artifactGB);near(x.aiProductDeliveredGB,h.ai.artifactGB);assert.equal(x.tokensGenerated,0);assert.ok(x.aiReturnedAt>=x.aiCompletedAt);closure(h,x);
 near(r.dayStats.reduce((n,y)=>n+y.aiProductDeliveredGB,0),x.aiProductDeliveredGB);assert.equal(x.aiProductDroppedGB,0);
 assert.ok(m.at(1100).aiProductGeneratedGB===0);near(m.at(m.duration).aiUnitsComputed,x.aiUnitsComputed);
 const infeasible=createSimulation({...d,initialInputGB:0,customerUplinkMbps:.001,datasetGB:100}).at(D);assert.equal(infeasible.aiTrainingTokens,0);assert.equal(infeasible.aiProductGeneratedGB,0);
}
const direct=createSimulation({...defaults,serviceRoute:'direct'}),relay=createSimulation({...defaults,serviceRoute:'relay',relayAvailability:.5,relayCycleS:600,relayHandoverS:5}),hybrid=createSimulation({...relay.hardware.input,serviceRoute:'hybrid'});for(const t of [1210,1501,5232,5510]){let r=relay.at(t),d=direct.at(t),h=hybrid.at(t);if(r.aiRelayOn){assert.equal(h.aiActiveRoute,'relay');near(h.aiRouteDownMbps,r.aiRouteDownMbps);assert.ok(h.terminalKW>=.24);}else{near(r.aiRouteDownMbps,0);assert.ok(h.aiRouteDownMbps<=d.aiRouteDownMbps+1e-9);}}
const hot=createSimulation({...defaults,thermalMode:'applied',appliedHeatKw:3000,serviceRoute:'relay'}),q=hot.serviceTimeline(1200,120);
assert.ok(q.some(r=>r.powerOnlyUnitsPerSec>0));assert.ok(q.every(r=>r.capacityUnitsPerSec===0));assert.ok(hot.at(1250).junctionK>defaults.junctionLimitK);
const a=sizeDesign({...big,artifactReturnHours:2}),b=sizeDesign({...big,artifactReturnHours:24});assert.ok(sizingEnvelope(a).goodputNeeded>10*sizingEnvelope(b).goodputNeeded);
console.log('Six fixed-hardware profiles, suggested builds, 1T memory/artifact arithmetic, sparse/collective bounds, replay and queue closure, direct/relay exclusivity and two completed training orders passed.');
