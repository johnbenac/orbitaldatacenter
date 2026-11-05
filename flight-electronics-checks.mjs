import assert from 'node:assert/strict';
import {defaults,sizeDesign} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {gyroCatalog,issGyros,gyroComparison,gyroCandidateDesign,sizeGyros,renderAvionics,renderGyroBenchmark} from './dist/flight-electronics.js';
const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} ≠ ${b}`);
const h=sizeDesign(defaults),g=h.cmg;
// The longer equipment frame needs the 75-75 S catalog cluster for acquisition
// and trim. Existing saved 80 N·m·s designs still install the smaller package.
near(g.totalKg,4*69);near(g.plannedMomentumNms,150);assert.equal(g.model,'CMG 75-75 S');
const previous=sizeGyros({...defaults,cmgMomentumNms:80});near(previous.totalKg,152);near(previous.plannedMomentumNms,80);
near(h.massLedger.find(r=>r.id==='cmg').kg,g.totalKg+6+.0015*h.input.dipoleAm2);
const cmp=gyroComparison(h,{wetKg:3000});near(cmp.iss.massFraction,.25936546,1e-6);near(cmp.iss.litresPerKg,7.02315,1e-4);
near(cmp.scaledScalarMomentumNms,4*4760*3000/issGyros.stationKg);
for(let i=0;i<3;i++){const d=gyroCandidateDesign(defaults,i),c=sizeGyros(d);near(c.unitKg,gyroCatalog[i].unitKg);near(c.rawUnitMomentumNms*2,d.cmgMomentumNms);assert.equal(c.catalogMatch,true);}
const issStudy=gyroCandidateDesign(defaults,'iss',h);
near(issStudy.cmgMomentumNms,Math.round(h.wetKg*4*4760/issGyros.stationKg*.5));near(issStudy.cmgTorqueNm,defaults.cmgTorqueNm);
const legacy=sizeGyros({...defaults,cmgMomentumNms:600});assert.ok(!legacy.catalogMatch&&legacy.totalKg>4*69);near(legacy.plannedMomentumNms,600);
const days=.01,sim=createSimulation({...defaults,missionYears:days,hkPeriodS:1,hkRecorderMB:1}),a=sim.at(1500),b=sim.at(8500);
near(sim.at(0).hkStoredMB,0);near(a.hkRateKbps,2.048);near(a.cdhKW,.045);assert.ok(a.auxKW>=a.cdhKW);
assert.ok(b.hkStoredMB<=1&&b.hkStoredMB>.999&&b.hkOverwrittenMB>0);
const day=sim.daySummary(0);assert.ok(day.peakControlTorqueNm>0&&day.peakMomentumNms>0);
const hc=renderGyroBenchmark(h,b,day,'B');assert.ok(hc.includes('data-gyro-case="0"')&&hc.includes('NASA actuator performance')&&hc.includes('Momentum')&&!hc.includes('NaN'));
assert.ok(!renderGyroBenchmark(h,b,day,'E').includes('data-gyro-case'));
for(const phase of 'ABCDEF'){const html=renderAvionics(h,b,phase);assert.ok(html.includes('Engineering log')&&html.includes('Moog integrated avionics')&&!html.includes('NaN'));}
const during=sim.events(0,86400).find(e=>e.type==='contact');assert.ok(during);const pass=sim.at(during.start+90);assert.ok(pass.commandUploadedGB>0&&pass.cdhKW>0);
const noCommand=createSimulation({...defaults,commandKbps:0}).at(during.start+90);near(noCommand.commandUploadedGB,0);
const long=sim.at(sim.duration),end=sim.disposal();if(end?.entry!=null){near(long.hkRateKbps,0);near(long.cdhKW,0);near(long.hkStoredMB,sim.at(end.entry+1).hkStoredMB);}
console.log('ISS ratios, three four-gyro packages, estimated custom sizing, day demand, protected avionics commands, circular recorder closure, read-only flight and terminal logging checked.');
