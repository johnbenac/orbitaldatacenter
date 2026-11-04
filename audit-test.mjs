import assert from 'node:assert/strict';
import {defaults, sizeDesign, estimateLife, applyPreset, YEAR} from './dist/design.js';
import {chronologicalAudit} from './dist/mission-worker.js';
import {DAY} from './dist/orbit.js';
import {createSimulation} from './dist/model.js';
import {loadScenario, scenarios} from './verification-fixtures.mjs';

const near=(a,b,tolerance=1e-6)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance,`${a} vs ${b}`);
const testDays=2.75;
const dayTime=days=>({...defaults,missionYears:days*DAY/YEAR});
const baseline=dayTime(testDays),audit=chronologicalAudit(baseline),sim=createSimulation(sizeDesign(baseline));
const end=sim.at(sim.duration);
for(const key of ['socPct','queueGB','propellantKg','generatedGB','deliveredGB','uploadedGB','unmetKWh','tokensGenerated','momentumNms','burnImpulseNs'])near(end[key],audit.result.finalState[key]);
const events=sim.events(0,sim.duration);
for(const type of ['burst','eclipse','contact','reboost','trim','desat'])assert.equal(audit.result[type+'Count']||0,events.filter(e=>e.type===type).length,type);
const sum=key=>audit.dayStats.reduce((a,b)=>a+b[key],0);
for(const key of ['generatedGB','deliveredGB','uploadedGB','unmetKWh','propellantUsedKg','droppedGB'])near(sum(key),end[key]);
near(end.queueGB+end.deliveredGB+end.droppedGB,baseline.initialQueueGB+end.generatedGB);
assert.ok(audit.dayStats.every(s=>s.minSocPct>=0&&s.maxSocPct<=100&&s.maxJunctionK>150));
assert.equal(audit.result.days,3);
assert.equal(audit.result.firstCrossing.id,'battery');
assert.equal(audit.result.firstCrossing.side,'low');
assert.equal(audit.result.firstCrossing.time,audit.result.thermalQualifiedUntilS);
const long=chronologicalAudit(dayTime(5.25));
for(const key of ['prop','momentum','queue','energy','heat','usedImpulse'])for(let i=1;i<audit.seeds.length;i++)near(long.seeds[i][key],audit.seeds[i][key]);
const failures=[
 [{solarM2:5,batteryKWh:1},/electr|power|SOC/i],
 [{thermalMode:'applied',appliedHeatKw:500,radiatorM2:5},/thermal|junction/i],
 [{storageTB:4,initialQueueGB:3200,bulkMbps:950,link:'s'},/record|stor|write/i],
 [{propellantKg:1,trimDv:120},/propellant|trim|reboost/i],
 [{cmgMomentumNms:2,dipoleAm2:10,cpOffsetM:1},/CMG|momentum|magnetic/i]
];
for(const [over,pattern] of failures){
 const {result}=chronologicalAudit({...dayTime(1.25),batteryOpMinK:245,junctionOpMinK:240,...over});
 assert.match(result.firstCrossing.limit,pattern);
 assert.ok(result.firstCrossing.time>=0&&result.firstCrossing.time<DAY);
}
assert.equal(estimateLife(sizeDesign({...defaults,launchAllowanceKg:100})).years,0);
const packA=estimateLife(sizeDesign({...defaults,batteryKWh:28})),packB=estimateLife(sizeDesign(applyPreset({...defaults,batteryKWh:28},'battery','lfp')));
assert.ok(packB.years>=packA.years);
for(const c of scenarios){
 const d=loadScenario(c.id),sim=createSimulation(sizeDesign(d.design)),s=sim.at(d.instant);
 assert.deepEqual(sizeDesign(d.design).errors,[]);
 if(d.id==='bulk-optical'){
  assert.equal(s.groundLink,'Optical');assert.equal(s.station,'Madrid');assert.ok(s.acquired&&s.goodputMbps>1000);
  assert.ok(sim.at(d.event.end).deliveredGB>sim.at(d.event.start).deliveredGB+10);
 }else if(d.id==='compute-burst'){
  assert.ok(s.burst);near(s.itKW,32);assert.ok(sim.at(d.event.end+2).itKW<s.itKW/2);
 }else {assert.equal(sim.daySummary(0).shadowSeconds,0);assert.ok(Math.abs(s.betaDeg)>75);}
}
console.log('Passed chronological replay, partial final day, all event types, energy/data/propellant counters, restart invariance, five physical failure modes, sizing lifetime sensitivity and three named mission scenarios.');
