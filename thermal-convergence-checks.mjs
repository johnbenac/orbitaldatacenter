import assert from 'node:assert/strict';
import {runThermalAnalysis} from './dist/thermal-analysis.js';
import {buildThermalAnalysisModel,buildThermalCase} from './dist/thermal-analysis-model.js';
import {buildThermalProgram,thermalProgramForItem} from './dist/thermal-program.js';
import {defaults,sizeDesign} from './dist/design.js';
import {buildPartsCatalog} from './dist/parts-catalog.js';

const close=(a,b,tolerance=1e-8)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance,`${a} versus ${b}`);
const maxAbs=values=>Math.max(0,...values.map(Math.abs));
let checks=0;

// A real stabilization-controlled case exposes schedule drift without hiding
// the original equal-global-time refinement result. Plot sampling must have
// no influence on the integration-epoch comparison.
const hardware=sizeDesign(defaults),catalog=buildPartsCatalog(hardware),program=buildThermalProgram(hardware,catalog),selected=thermalProgramForItem(program,'flight:01.04'),record=catalog.byId[selected.item.id];
const model=buildThermalAnalysisModel(hardware,{record,catalog,item:selected.item,config:program.config}),plan=selected.plans.find(p=>p.kind==='tvac-cycling'),candidate=buildThermalCase(model,plan);
assert.equal(candidate.available,true,candidate.missingInputs.join('; '));
const network=runThermalAnalysis(model,candidate,{sampleEveryS:100000}),nc=network.summary.numerics.convergence;
assert.equal(network.summary.allPlateausCompleted,true);
assert.equal(nc.status,'refinement-needed');assert.ok(nc.maxTemperatureDeltaK>nc.toleranceK);
assert.equal(nc.responseStatus,'within-study-tolerance');assert.ok(nc.responseMaxTemperatureDeltaK<=nc.toleranceK);
assert.ok(nc.maxTemperatureDeltaK>5*nc.responseMaxTemperatureDeltaK,'Stage alignment must explain the actual drift while preserving the larger global diagnostic.');
assert.equal(nc.scheduleStatus,'stage-timing-shift');assert.ok(nc.durationDeltaS>0);
assert.ok(network.summary.warnings.some(w=>w.includes('Time-step refinement')),'The original global-time refinement warning remains visible.');
assert.ok(nc.responseComparedSamples>network.frames.length*10,'All integration epochs, not sparse plot frames, support the response comparison.');
assert.equal(nc.responseComparedStages,candidate.steps.length);assert.equal(nc.stageTimingDeltas.length,candidate.steps.length);
for(const stage of nc.stageTimingDeltas){close(stage.durationDeltaS,stage.refinedDurationS-stage.baselineDurationS);close(stage.endDeltaS,stage.refinedEndS-stage.baselineEndS);assert.equal(stage.completionAgreement,true);if(stage.stabilizationDeltaS!==null)close(stage.stabilizationDeltaS,stage.refinedStabilizationElapsedS-stage.baselineStabilizationElapsedS);}
close(nc.maxStageDurationDeltaS,maxAbs(nc.stageTimingDeltas.map(s=>s.durationDeltaS)));close(nc.maxStageEndDeltaS,maxAbs(nc.stageTimingDeltas.map(s=>s.endDeltaS)));close(nc.durationDeltaS,Math.abs(nc.stageTimingDeltas.at(-1).endDeltaS));checks++;

// With a fixed schedule both comparisons must retain the same real thermal
// integration error. Stage alignment is not a numerical-pass override.
const fixedModel={id:'fixed-model',revision:'test',configurationId:'fixed-config',available:true,nodes:[{id:'article',label:'Article',capacityJPerK:1000,initialK:300,loadW:0}],boundaries:[{id:'fixture',temperatureK:300}],conductors:[{id:'mount',from:'article',boundaryId:'fixture',conductanceWPerK:10}],radiation:[],convection:[],heaters:[],heatPumps:[],articleNodeId:'article'};
const fixedCase={id:'fixed-case',kind:'tvac-cycling',available:true,dtS:20,sampleEveryS:100000,steps:[{id:'hot-ramp',label:'Fixed hot ramp',type:'ramp',durationS:200,boundariesK:{fixture:350}},{id:'cold-ramp',label:'Fixed cold ramp',type:'ramp',durationS:200,boundariesK:{fixture:280}}]};
const fixed=runThermalAnalysis(fixedModel,fixedCase),fc=fixed.summary.numerics.convergence;
assert.ok(fc.maxTemperatureDeltaK>0);close(fc.maxTemperatureDeltaK,fc.responseMaxTemperatureDeltaK);assert.equal(fc.scheduleStatus,'same-stage-timing');close(fc.maxStageDurationDeltaS,0);close(fc.maxStageEndDeltaS,0);close(fc.durationDeltaS,0);assert.equal(fc.status,fc.responseStatus);checks++;

// Cut the first hold between the coarse and fine completion times. The
// response may still agree closely, but stage completion must not be hidden.
const differing=nc.stageTimingDeltas.find(s=>candidate.steps[s.stageIndex].type==='hold'&&s.durationDeltaS<0);assert(differing,'The default network case must expose a stabilization timing difference.');
const limited=JSON.parse(JSON.stringify(candidate));limited.steps=limited.steps.slice(0,differing.stageIndex+1);limited.steps.at(-1).maxDurationS=(differing.baselineDurationS+differing.refinedDurationS)/2;
const mismatch=runThermalAnalysis(model,limited,{sampleEveryS:100000}),mc=mismatch.summary.numerics.convergence;
assert.equal(mismatch.summary.allPlateausCompleted,false);assert.equal(mc.scheduleStatus,'stage-completion-differs');assert.ok(mc.stageTimingDeltas.some(s=>!s.completionAgreement));assert.ok(Number.isFinite(mc.maxTemperatureDeltaK));checks++;

// The supported minimum step cannot claim that a missing half-step check
// established convergence, either globally or within a stage.
const minimum=runThermalAnalysis(fixedModel,{...fixedCase,dtS:.05,steps:[{id:'minimum',label:'Minimum-step exposure',type:'ramp',durationS:.2,boundariesK:{fixture:310}}]}),minimumCheck=minimum.summary.numerics.convergence;
assert.equal(minimumCheck.status,'minimum-step-reached');assert.equal(minimumCheck.maxTemperatureDeltaK,null);assert.equal(minimumCheck.responseMaxTemperatureDeltaK,null);assert.equal(minimumCheck.responseStatus,'comparison-unavailable');assert.equal(minimumCheck.scheduleStatus,'comparison-unavailable');assert.equal(minimumCheck.maxStageDurationDeltaS,null);assert.deepEqual(minimumCheck.stageTimingDeltas,[]);checks++;

console.log(JSON.stringify({checks,network:{globalDeltaK:nc.maxTemperatureDeltaK,responseDeltaK:nc.responseMaxTemperatureDeltaK,totalTimingDeltaS:nc.durationDeltaS,maxStageDurationDeltaS:nc.maxStageDurationDeltaS,comparedIntegrationEpochs:nc.responseComparedSamples,displayFrames:network.frames.length},fixedSchedule:{globalDeltaK:fc.maxTemperatureDeltaK,responseDeltaK:fc.responseMaxTemperatureDeltaK,scheduleStatus:fc.scheduleStatus},completionMismatch:mc.scheduleStatus},null,2));
