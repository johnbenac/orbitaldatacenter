import assert from 'node:assert/strict';
import {defaults,sizeDesign} from './dist/design.js';
import {commTestCases,opticalOffsetAllowance,runCommVerification} from './dist/comm-verification.js';

const hardware=sizeDesign(defaults);
const before=JSON.stringify(hardware);
const run=(id,x,h=hardware)=>runCommVerification(h,id,x);
for(const {id,control} of commTestCases){
 const initial=run(id),stressed=run(id,control.max);
 assert.equal(initial.passed,true,id);
 assert.equal(stressed.passed,false,id);
 assert.equal(initial.stages.length,4);
 assert.deepEqual(initial,run(id,control.initial),'The same test article and fixture must replay identically.');
 assert.deepEqual(initial.evidence,JSON.parse(JSON.stringify(initial.evidence)));
 for(const row of initial.evidence.requirements){assert.ok(Number.isFinite(row.observed)&&Number.isFinite(row.limit));assert.equal(row.passed,true)}
 assert.equal(initial.evidence.outcome,'pass');assert.equal(stressed.evidence.outcome,'fail');
 assert.ok(stressed.trace.current.y<initial.trace.current.y);
 for(const {x,y} of initial.trace.samples)assert.equal(run(id,x).trace.current.y,y);
 assert.equal(run(id,-2).setting,control.min);assert.equal(run(id,control.max+5).setting,control.max);
}
assert.equal(JSON.stringify(hardware),before,'A checkout cannot spend flight inventory or change hardware.');
assert.throws(()=>run('unknown'),RangeError);
for(const [communicationsPackage,absent] of [['optical-ttc',['ka']],['optical-ka',['sband']],['optical-only',['ka','sband']]]){
 const reduced=sizeDesign({...defaults,communicationsPackage});
 for(const id of absent){
  const result=run(id,0,reduced);
  assert.equal(result.applicable,false);assert.equal(result.passed,null);
  assert.equal(result.evidence.outcome,'not_applicable');
  assert.equal(result.trace,null,'Absent equipment must not produce a passing numerical sweep.');
  assert.ok(result.stages.every(stage=>stage.status==='not_applicable'));
 }
 assert.equal(run('optical',0,reduced).passed,true,'Each package retains the optical test article.');
}

const uplinkOnly=run('sband',12);
assert.deepEqual(uplinkOnly.stages.map(s=>s.status),['pass','pass','pass','fail']);
assert.equal(uplinkOnly.evidence.requirements.find(r=>r.id==='match').observed,null);
const noCommand=run('sband',24);
assert.deepEqual(noCommand.stages.map(s=>s.status),['pass','fail','blocked','blocked']);
const late=run('sband',0,sizeDesign({...defaults,hkPeriodS:20}));
assert.equal(late.evidence.requirements.find(r=>r.id==='match').observed,42);
assert.equal(late.passed,false);assert.ok(late.evidence.requirements.find(r=>r.id==='deadline').observed>20);
assert.notEqual(late.signature,run('sband').signature);

const corrupt=run('ka',6),blocked=run('ka',24);
assert.ok(corrupt.trace.current.y>0&&corrupt.evidence.requirements.find(r=>r.id==='mismatch').observed>0);
assert.strictEqual(blocked.evidence.requirements.find(r=>r.id==='mismatch').observed,null);
assert.strictEqual(blocked.evidence.requirements.find(r=>r.id==='count').observed,0);
const throttled=run('ka',6,sizeDesign({...defaults,linkCapMbps:10}));
assert.ok(throttled.passed&&throttled.trace.current.y>corrupt.trace.current.y);
assert.equal(run('ka',0,sizeDesign({...defaults,kaDishM:2})).signature,run('ka').signature,'Conducted check bypasses the dish.');

const a=run('optical',12),b=run('optical',12,sizeDesign({...defaults,opticalApertureM:defaults.opticalApertureM/2}));
assert.equal(a.stages[1].status,'pass');assert.equal(a.stages.at(-1).status,'fail');
const loss=r=>r.evidence.requirements.find(row=>row.id==='coupling').observed;
assert.ok(Math.abs(loss(a)-4*loss(b))<1e-10,'Doubling the divergence quarters the pointing loss in dB.');
assert.equal(b.passed,true);
const aboveBudget=sizeDesign({...defaults,opticalJitterUrad:40});
assert.equal(run('optical',0,aboveBudget).passed,false);assert.equal(opticalOffsetAllowance(aboveBudget),null);
assert.ok(Math.abs(run('optical',opticalOffsetAllowance(hardware)).trace.current.y)<1e-10);
console.log('Ground communications checkout: nominal and stressed links, one-way command loss, delayed housekeeping, locked corrupt PRBS, optical boresight error, architecture coupling, numerical evidence and flight-state isolation passed.');

const {rehearseFirstPass}=await import('./dist/comm-rehearsal.js');
const {missionStarter}=await import('./dist/design.js'),{createSimulation}=await import('./dist/model.js');
const {masterTimeline}=await import('./dist/master-timeline.js');
const design=missionStarter('text'),sim=createSimulation(design),ledger=masterTimeline(sim);
const r=rehearseFirstPass(sim,1),los=ledger.rows.find(row=>row.id==='los-'+ledger.firstOperationsPassId);
assert.equal(r.outcome,'met');assert.equal(r.pass.endMET,los.start);assert.equal(r.pass.station,los.station);
assert.equal(r.pass.directPayloadGB,los.measurements.direct_payload_gb);
assert.equal(r.pass.returnedTelemetryGB,los.measurements.downlinked_telemetry_gb);assert.ok(r.pass.receivedCommandGB>0);
assert.equal(rehearseFirstPass(sim,25).outcome,'missed');
assert.deepEqual(rehearseFirstPass(sim,1),r);
assert.throws(()=>rehearseFirstPass(sim,0),RangeError);
const relayed=rehearseFirstPass(createSimulation({...design,serviceRoute:'relay'}),.001);
assert.equal(relayed.outcome,'missed');assert.equal(relayed.pass.directPayloadGB,0);assert.ok(relayed.pass.relayPayloadGB>0);
const noPass=rehearseFirstPass(createSimulation({...design,network:'svalbard',inclinationDeg:0,elevationDeg:75}),1);
assert.equal(noPass.outcome,'no-pass');assert.equal(noPass.pass,null);assert.equal(noPass.criteria.payloadMet,null);
console.log('First complete post-deployment direct pass, changed goal, clock and station ledger, relay attribution and contactless rehearsal passed.');
