import {DEPLOY_END_S} from './dist/commissioning-clock.js';
import assert from 'node:assert/strict';
import {createSimulation} from './dist/model.js';
import {chronologicalAudit} from './dist/mission-worker.js';
import {defaults,normalizeDesign,validateDesign} from './dist/design.js';
import {DAY,YEAR} from './dist/orbit.js';
import {thermalNodes,thermalStates,thermalControls,newThermalSummary,accumulateThermal,mergeThermal,deriveBound} from './dist/thermal-limits.js';
const near=(a,b,slack=1e-5)=>assert.ok(Math.abs(a-b)<=slack,`${a} vs ${b} (allow ${slack})`);
assert.equal(thermalControls.length,24);assert.equal(new Set(thermalControls.map(c=>c.key)).size,24);
const d={...defaults,missionYears:3.25*DAY/YEAR},m=createSimulation(d),at=(t,id)=>m.at(t).thermalQualification.find(q=>q.id===id);
const pad=m.at(-100),ascent=m.at(100);assert.ok(pad.thermalQualification.every(r=>r.state==='survival'));near(pad.enclosureOuterK,d.launchBoundaryK);near(ascent.enclosureOuterK,d.launchBoundaryK);assert.equal(at(100,'battery').state,'operating');assert.equal(at(540,'enclosure').state,'operating');
const pass=m.events(0,DAY).find(e=>e.type==='burst'),idle=pass.end+5;
assert.equal(at(idle,'junction').activity,'Powered idle');assert.equal(at(idle,'coldPlate').state,'operating');assert.equal(at(idle,'radiator').state,'operating');
const off=createSimulation({...d,duty:0,idleComputePolicy:'off',pumpStandbyPolicy:'follow'}),shut=off.at(idle);assert.equal(shut.itKW,0);assert.equal(shut.servedPumpKW,0);assert.equal(shut.thermalQualification.find(x=>x.id==='junction').state,'survival');assert.equal(shut.thermalQualification.find(x=>x.id==='radiator').state,'operating');
const powerless=createSimulation({...d,solarM2:5,batteryKWh:1,socInitial:d.socMin});
let unserved=powerless.window(DEPLOY_END_S,DAY,450).find(s=>s.eclipse&&s.unmetKW>.1&&s.itKW<.001);assert.ok(unserved);assert.equal(unserved.thermalQualification.find(x=>x.id==='junction').state,'survival');assert.equal(unserved.thermalQualification.find(x=>x.id==='coolant').state,'survival');assert.equal(unserved.thermalQualification.find(x=>x.id==='enclosure').state,'operating');
const end=m.at(m.duration);assert.ok(end.thermalQualification.every(r=>r.status==='unassessed'));
const cut=m.at(m.disposal().cutoff);assert.equal(cut.deployment,1);assert.equal(cut.thermalQualification.find(r=>r.id==='radiator').state,'operating');assert.equal(cut.thermalQualification.find(r=>r.id==='enclosure').state,'operating');
const w=m.thermalWindow(0,m.duration),result=chronologicalAudit(d).result,audit=result.thermal;
if(w.firstViolation){assert.equal(audit.firstViolation.id,w.firstViolation.id);near(audit.firstViolation.time,w.firstViolation.time,.1);}else assert.equal(audit.firstViolation,null);
near(result.thermalQualifiedUntilS,w.firstViolation?.time??w.coveredSeconds,.1);near(w.coveredSeconds,result.finalState.spacecraftModelEndedAt,1e-5);
for(const n of thermalNodes){
 const rows=w.rows.filter(x=>x.id===n.id);near(rows.reduce((t,row)=>t+row.durationS,0),w.coveredSeconds);
 for(const state of thermalStates){const row=rows.find(r=>r.state===state),ref=audit.rows.find(r=>r.id===n.id&&r.state===state);
  near(row.minK,ref.minK,.005);near(row.maxK,ref.maxK,.005);near(row.lowSeconds,ref.lowSeconds,.01);near(row.highSeconds,ref.highSeconds,.01);assert.equal(row.lowCount,ref.lowCount);assert.equal(row.highCount,ref.highCount);
  for(const side of ['min','max']){const out=deriveBound(audit,n.id,state,side,1);if(out.status==='derived'){assert.deepEqual(validateDesign({...d,[out.key]:out.valueK}),[]);assert.ok(side==='min'?out.valueK<=out.observedK-1:out.valueK>=out.observedK+1);}else{assert.equal(out.status,'infeasible');assert.equal(out.valueK,null);}}
 }
}
const spans=m.thermalWindow(-600,700);near(spans.coveredSeconds,700);near(spans.rows.find(r=>r.id==='battery'&&r.state==='survival').durationS,600);
const none=deriveBound(off.thermalWindow(DEPLOY_END_S,3600),'junction','operating','max');assert.equal(none.status,'no-data');assert.equal(none.valueK,null);assert.equal(none.coverageS,0);
const nested=deriveBound(m.thermalWindow(0,300),'enclosure','survival','max',3);assert.equal(nested.valueK,d.enclosureOpMaxK);assert.equal(nested.observedK,d.launchBoundaryK);
const infeasible=deriveBound(audit,'battery','operating','min',200);assert.equal(infeasible.status,'infeasible');assert.equal(infeasible.valueK,null);
assert.ok(validateDesign({...d,batterySurvivalMinK:d.batteryOpMinK+1}).length);
for(const n of thermalNodes){const changed={...d,[n.keys.operating.min]:d[n.keys.operating.min]+1};assert.equal(normalizeDesign(JSON.parse(JSON.stringify(changed)))[n.keys.operating.min],changed[n.keys.operating.min]);}
const after=createSimulation({...d,batteryOpMinK:256,junctionLimitK:340});for(const t of [0,2000,23000,DAY])for(const n of thermalNodes)near(m.at(t)[n.tempKey],after.at(t)[n.tempKey]);assert.equal(createSimulation({...d,initialBatteryK:366}).at(0).batteryK,366);
const synthetic={...d,junctionOpMinK:270,junctionLimitK:300},r1=newThermalSummary(synthetic,0,10,'test',true),r2=newThermalSummary(synthetic,10,20,'test',true),joint=newThermalSummary(synthetic,0,20,'test'),temps=k=>[k,294,294,294,294,294];
accumulateThermal(r1,0,10,1,temps(280),temps(260));accumulateThermal(r2,10,20,1,temps(260),temps(320));mergeThermal(joint,r1);mergeThermal(joint,r2);const jr=joint.rows[0];assert.equal(jr.lowCount,1);assert.equal(jr.highCount,1);near(jr.firstLowTime,5);near(jr.lowSeconds,5+10/6);near(jr.firstHighTime,10+40/6);near(jr.highSeconds,10/3);
console.log('Thermal tests passed: 24 independent input bounds, duty/standby and starvation, passive and prelaunch states, three-store thermal network and finite cold control, inverse bounds, crossing duration and boundary merge, window/audit agreement, stop at physical termination.');
