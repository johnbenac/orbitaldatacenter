// Cross-domain acceptance tests. These use delivered mission samples, not
// hand-set angles inside a renderer.
import assert from 'node:assert/strict';
import {defaults} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {earthDiskView} from './dist/physics.js';
import {DAY,DEG,dot} from './dist/orbit.js';
import {DEPLOY_END_S} from './dist/commissioning-clock.js';

const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<=tol,`${a} versus ${b}`);
const d={...defaults,missionYears:.01};
const sim=createSimulation(d),pass=sim.events(0,DAY).find(e=>e.type==='contact'&&e.start>DEPLOY_END_S);
for(const k of [.20,.60,.92]){
 near(earthDiskView(1,k),k*k);
 near(earthDiskView(0,k),2*(Math.asin(k)-k*Math.sqrt(1-k*k))/Math.PI);
}
const sample=sim.window(DEPLOY_END_S,6000,81),day=sim.daySummary(0);
assert.ok(sample.some(s=>s.eclipse)&&sample.some(s=>!s.eclipse));
assert.ok(sample.some(s=>Math.abs(s.wingRateDegS)>0.01)&&sample.some(s=>Math.abs(s.upperRadiatorRateDegS)>0.01));
for(const s of sample){
 near(s.solarIncidenceCos,Math.max(0,dot(s.sunECI,s.pvNormalECI)));
 near(s.solarKW,1.361*s.solarDeployedM2*s.solarIncidenceCos*(s.eclipse?0:1)*d.pvEfficiency*d.solarDelivery*d.pvRetention**Math.max(0,s.windowAgeYears));
 near(s.absorbedKW,s.radiatorDirectSolarKW+s.radiatorAlbedoKW+s.radiatorEarthIRKW);
 near(s.netRejectionKW,s.grossEmissionKW-s.absorbedKW);
 near(s.upperRadiatorNetKW+s.lowerRadiatorNetKW,s.netRejectionKW);
 if(s.eclipse){near(s.radiatorDirectSolarKW,0);assert.ok(s.radiatorEarthIRKW>0);}
}
near(day.energyKWh.absorbed,day.energyKWh.radiatorDirectSolar+day.energyKWh.radiatorAlbedo+day.energyKWh.radiatorEarthIR,1e-6);
const shifted=sim.daySummary(1234.5);
near(Object.values(shifted.attitudeModeSeconds).reduce((a,b)=>a+b,0),DAY,1e-5);
near(shifted.energyKWh.absorbed,shifted.energyKWh.radiatorDirectSolar+shifted.energyKWh.radiatorAlbedo+shifted.energyKWh.radiatorEarthIR,1e-6);
const changing=createSimulation({...d,attitude:'lowdrag'}),second=changing.daySummary(0);
assert.ok(Math.abs(day.energyKWh.solar-second.energyKWh.solar)>15);
assert.ok(Math.abs(day.energyKWh.radiatorDirectSolar-second.energyKWh.radiatorDirectSolar)>2);
assert.ok(Math.abs(day.energyKWh.discharge-second.energyKWh.discharge)>1);
assert.ok(sample.some(s=>Math.abs(s.radiatorK-changing.at(s.t).radiatorK)>.1));

const first=sim.at(pass.start+.2),acquired=sim.at(pass.start+90),end=sim.at(pass.end+.5);
assert.equal(first.attitudeMode,'contact');assert.ok(first.terminalErrorDeg>15&&!first.acquired);
assert.ok(acquired.acquired&&acquired.goodputMbps>0);assert.ok(acquired.terminalErrorDeg<.01);
assert.ok(first.terminalKW>sim.at(pass.start-5).terminalKW);assert.equal(end.station,null);
const starved=createSimulation({...d,cmgMomentumNms:2,cmgTorqueNm:.1}),held=starved.at(DEPLOY_END_S+10);
assert.equal(held.burn,false);assert.match(held.burnHold,/CMG/);near(held.propellantKg,d.propellantKg);
const t=43200.001,reboost=sim.at(t);assert.equal(reboost.burn,true);assert.equal(reboost.attitudeMode,'reboost');
near(dot(reboost.bodyZECI,reboost.velocityECI)/Math.hypot(...reboost.velocityECI),1,.000086);
assert.ok(sim.at(t-30).attitudeMode==='prepoint');
const replay=sim.at(DAY-.001),next=sim.at(DAY+.001);
near(dot(replay.bodyUpECI,next.bodyUpECI),1,1e-7);near(replay.batteryKWh,next.batteryKWh,.001);near(replay.radiatorK,next.radiatorK,.001);
near(replay.wingPitchDeg,next.wingPitchDeg,.01);
console.log('Attitude-to-power and heat closure, finite Earth disk, changing drive rates, same-hardware attitude trade, terminal acquisition, burn alignment and replay continuity passed.');
