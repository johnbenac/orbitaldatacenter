// Bounded chronological integration of the real spacecraft model. A deliberately
// slow installed write interface exposes partial A/B saves and artifact contention.
// This is an accounting fixture, not a flight-performance or reliability claim.
import assert from 'node:assert/strict';
import {missionStarter,sizeDesign} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {DEPLOY_END_S} from './dist/commissioning-clock.js';

const tolerance=1e-8;
const close=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${label}: ${actual} != ${expected}`);
const h=sizeDesign({
 ...missionStarter('finetune'),missionYears:.003,
 diskWrite:.01,trainableFraction:.1,checkpointIntervalH:.05,
 fineTuneTokensM:6,initialInputGB:0,
 serviceRoute:'relay',relayUpMbps:50,relayDownMbps:200,relayHandoverS:0,
 duty:1,bulkMbps:0,initialQueueGB:0,trimDv:0
});
assert.deepEqual(h.errors,[],'Fixture must stay inside the configurable input ranges');
assert.equal(h.ai.fit,true);
assert.equal(h.ai.checkpointSlots,2);
close(h.ai.checkpointReserveGB,2*h.ai.restartGB,'A/B storage reservation');
assert.ok(h.ai.saveTimeS>2*h.ai.checkpointIntervalS,'The fixture must make a save span several requested save periods');

const sim=createSimulation(h);
// serviceDay and auditStep integrate only the requested bounded window. They do
// not trigger the cached whole-day path used by an arbitrary cursor lookup.
let seed=sim.serviceDay(undefined,DEPLOY_END_S).end;
let prior={aiCheckpointWriteGB:seed.aiCheckpointGB,aiCheckpointPendingGB:seed.aiCheckpointPendingGB,
 aiCheckpointCommits:seed.aiCheckpointCommits,aiCheckpointCompleteUnits:seed.aiCheckpointCompleteUnits,
 aiInputUploadedGB:seed.aiUploaded,aiProductGeneratedGB:seed.aiPGenerated,aiProductDroppedGB:seed.aiPDropped,
 writeGB:seed.writeGB,deliveredGB:seed.delivered,aiDatasetReadGB:seed.aiUnits*h.input.corpusTokenBytes/1e9};
let sawPartial=false,sawRetainedPrior=false,sawDeferred=false,sawArtifactWaiting=false,sawSharedCommitAndProduct=false,maxRecorderRate=0;
const commits=[];
for(let i=0;i<60;i++){
 const before=seed,span=30,part=sim.auditStep(seed,span),s=part.state;
 seed=part.end;
 const checkpoint=s.aiCheckpointWriteGB-prior.aiCheckpointWriteGB;
 const incoming=s.aiInputUploadedGB-prior.aiInputUploadedGB;
 const products=(s.aiProductGeneratedGB-prior.aiProductGeneratedGB)-(s.aiProductDroppedGB-prior.aiProductDroppedGB);
 const recorder=s.writeGB-prior.writeGB,capacity=h.diskWriteGBs*(seed.t-before.t);
 const reads=s.aiDatasetReadGB-prior.aiDatasetReadGB+s.deliveredGB-prior.deliveredGB;
 for(const [label,bytes] of [['checkpoint',checkpoint],['incoming',incoming],['actual product',products],['recorder total',recorder]]){
  assert.ok(bytes>=-tolerance,`${label} write count went backwards at ${seed.t}`);
  assert.ok(bytes<=capacity+tolerance,`${label} exceeded the installed interface at ${seed.t}: ${bytes} GB / ${capacity} GB`);
 }
 assert.ok(incoming+checkpoint+products<=capacity+tolerance,'All three users must share the same write direction');
 assert.ok(reads>=-tolerance&&reads<=h.diskReadGBs*span+tolerance,'Training input and downlink must share the installed read direction');
 assert.ok(Number.isFinite(s.storageReadGBs)&&s.storageReadGBs<=h.diskReadGBs+tolerance,'Instantaneous shared-read telemetry must fit the installed interface');
 assert.ok(Number.isFinite(s.storageWriteGBs)&&s.storageWriteGBs<=h.diskWriteGBs+tolerance,'Instantaneous shared-write telemetry must fit the installed interface');
 close(recorder,incoming+checkpoint+products,'Recorder write ledger');
 maxRecorderRate=Math.max(maxRecorderRate,recorder/span);
 assert.ok(s.aiCheckpointPendingGB>=0&&s.aiCheckpointPendingGB<=h.ai.restartGB+tolerance,'Only one incomplete alternate slot can exist');
 assert.equal(s.aiCheckpointCustodyProjected,false,'The bounded case must use chronological custody');
 const partialWritten=s.aiCheckpointPendingGB>0?h.ai.restartGB-s.aiCheckpointPendingGB:0;
 close(s.aiCheckpointWriteGB,s.aiCheckpointCommits*h.ai.restartGB+partialWritten,'Committed and partial checkpoint bytes');
 if(s.aiCheckpointCommits===prior.aiCheckpointCommits){
  assert.equal(s.aiCheckpointCompleteUnits,prior.aiCheckpointCompleteUnits,'A partial save cannot replace the last complete state');
 }else{
  assert.equal(s.aiCheckpointCommits,prior.aiCheckpointCommits+1);
  assert.equal(s.aiCheckpointPendingGB,0,'Commit requires all bytes of the alternate slot');
  assert.equal(s.aiCheckpointCompleteUnits,before.aiCheckpointTargetUnits,'The committed state is the snapshot that started the pending save');
  assert.ok(s.aiCheckpointCompleteUnits>prior.aiCheckpointCompleteUnits);
  assert.ok(s.aiCheckpointCommitS>before.t&&s.aiCheckpointCommitS<=seed.t);
  commits.push({met:s.aiCheckpointCommitS,units:s.aiCheckpointCompleteUnits});
 }
 if(s.aiCheckpointPendingGB>0){
  sawPartial=true;
  if(s.aiCheckpointCommits>0)sawRetainedPrior=true;
  if(prior.aiCheckpointPendingGB>0&&s.aiCheckpointCommits===prior.aiCheckpointCommits)assert.equal(seed.aiCheckpointTargetUnits,before.aiCheckpointTargetUnits,'A new save request cannot retarget an occupied slot');
 }
 if(s.aiCheckpointDeferred>0)sawDeferred=true;
 if(s.aiCompletedAt!==null&&s.aiCheckpointPendingGB>0){
  sawArtifactWaiting=true;
  assert.equal(s.aiProductGeneratedGB,0,'The final artifact must wait for remaining drive bandwidth');
 }
 if(checkpoint>0&&products>0)sawSharedCommitAndProduct=true;
 prior=s;
}

assert.ok(sawPartial&&sawRetainedPrior&&sawDeferred,'The fixture must observe a partial save, retained prior checkpoint and deferred new request');
assert.ok(sawArtifactWaiting&&sawSharedCommitAndProduct,'The completed artifact must contend for the checkpoint write direction');
assert.ok(commits.length>=2,'At least two complete checkpoints must commit');
assert.equal(prior.aiCheckpointPendingGB,0);
close(prior.aiTrainingTokens,h.ai.trainingGoalTokens,'Completed training work');
close(prior.aiProductGeneratedGB,h.ai.artifactGB,'Complete artifact written');
close(prior.aiInputUploadedGB,h.ai.corpusGB,'Corpus ingress written');
close(prior.aiProductDroppedGB,0,'No dropped artifact bytes');
close(prior.writeGB,prior.aiInputUploadedGB+prior.aiCheckpointWriteGB+prior.aiProductGeneratedGB,'Final shared-recorder ledger');
console.log(`Checkpoint runtime passed: ${commits.length} atomic commits, ${prior.aiCheckpointDeferred} deferred save requests, ${prior.aiCheckpointWriteGB.toFixed(3)} GB checkpoint writes, ${prior.aiProductGeneratedGB.toFixed(3)} GB artifact, ${(maxRecorderRate*1000).toFixed(3)} MB/s maximum shared writes against ${(h.diskWriteGBs*1000).toFixed(3)} MB/s installed.`);
