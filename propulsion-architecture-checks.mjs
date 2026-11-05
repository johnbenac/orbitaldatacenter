import assert from 'node:assert/strict';
import {DEPLOY_END_S} from './dist/commissioning-clock.js';
import {sizeDesign,defaults,missionStarter} from './dist/design.js';
import {propulsionReview} from './dist/spacecraft-architecture.js';
import {createSimulation} from './dist/model.js';
const near=(a,b,e=1e-7)=>assert.ok(Math.abs(a-b)<e,`${a} vs ${b}`);
const purposes=['text','voice','batch','agents','finetune','pretrain'];
const cases=purposes.map(k=>missionStarter(k)).concat([{...defaults,propellantKg:1},{...defaults,engine:'aero',propellantKg:200000,tankFill:.5,mixtureRatio:3,fuelDensity:.3},{...defaults,trayCount:2000,batteryKWh:25000}]);
for(const d of cases){
 const h=sizeDesign(d),p=h.propulsion,[f,o,b]=p.tanks;
 assert.equal(p.tanks.length,3);assert.equal(p.engines.length,2);
 near(f.volumeL*d.tankFill*d.fuelDensity,h.fuelKg);
 near(o.volumeL*d.tankFill*d.oxidizerDensity,h.oxidizerKg);
 near(f.volumeL+o.volumeL,h.tankVolumeL);
 near((b.volumeL/1000)*(p.bottlePa-p.endPa),h.tankVolumeL/1000*d.tankFill*p.feedPa);
 near(f.shellKg+o.shellKg+b.shellKg,h.massLedger.find(row=>row.id==='tanks').kg);
 near(p.massKg.engineHeads+p.massKg.feedAssembly,h.massLedger.find(row=>row.id==='engine').kg);
 near(h.massLedger.reduce((n,row)=>n+row.kg,0),h.launchKg);
 for(const t of p.tanks){
  assert.ok(Math.abs(t.x)+t.radiusM<h.bodyWidthM/2&&Math.abs(t.z)+t.radiusM<h.bodyLengthM/2);
  assert.ok(t.y-t.radiusM> -h.bodyHeightM/2&&t.z+t.radiusM<p.forwardDeckZ&&Math.abs(t.y)+t.radiusM<h.bodyHeightM/2);
 }
 for(const [a,c] of [[f,o],[f,b],[o,b]])assert.ok(Math.hypot(a.x-c.x,a.y-c.y,a.z-c.z)-a.radiusM-c.radiusM>=.0599);
 const wet=propulsionReview(h),drained=propulsionReview(h,0);
 near(wet.bottlePressureMPa,30);near(drained.bottlePressureMPa,2);
 assert.ok(wet.missM<.001);assert.ok(wet.stowedCM.every(Number.isFinite));
 assert.ok(wet.radiatorMarginM>0);
}
const base=createSimulation({...defaults,missionYears:.01});
assert.equal(base.at(600).burn,false);near(base.at(DEPLOY_END_S-.001).propellantKg,defaults.propellantKg);
const on=base.at(DEPLOY_END_S+.1),after=base.at(DEPLOY_END_S+20);assert.ok(on.burn&&on.deployment===1&&on.propellantKg<defaults.propellantKg);
near(on.bodyZECI.reduce((sum,x,i)=>sum+x*on.velocityECI[i],0)/Math.hypot(...on.velocityECI),1);
assert.ok(!after.burn&&after.trimPaidDv>1.99);
const held=createSimulation({...defaults,missionYears:.01,thrustN:20000,solarM2:200,solarTiltDeg:90}),st=held.at(DEPLOY_END_S+10);
assert.ok(!st.burn&&st.burnHold.length>0);near(st.propellantKg,defaults.propellantKg);
const plan=held.disposal();assert.ok(!plan.feasible&&plan.reason.length>0);near(plan.usedKg,0);
const hot=sizeDesign({...defaults,thrustN:20000});assert.ok(!propulsionReview(hot).clear&&hot.propulsion.engineMountMarginM<0);
console.log('Internal envelopes, pressure and mass closure, all mission starters and range edges, nominal wet thrust line, stowed interlock, post-lock impulse, pointing, wing impingement hold, blocked disposal and oversize heads passed.');
