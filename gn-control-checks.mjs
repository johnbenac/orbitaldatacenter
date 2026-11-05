import assert from 'node:assert/strict';
import {defaults,applyPreset} from './dist/design.js';
import {availableControl,localFieldUT,magneticControl} from './dist/momentum-control.js';
import {createSimulation} from './dist/model.js';
import {DAY,DEG,cross,dot} from './dist/orbit.js';
import {DEPLOY_END_S} from './dist/commissioning-clock.js';

const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}`);
const field=localFieldUT([1,0,0],550);
assert.ok(field[2]>0&&localFieldUT([0,0,1],550)[2]<0);
for(const h of [[1,0,0],[0,0,2],[1,2,-3],[0,0,0]]){
 const ctl=magneticControl(h,field,350,true,60),torque=cross(ctl.dipole,field.map(n=>n*1e-6));
 torque.forEach((n,i)=>near(n,ctl.torque[i]));
 near(dot(torque,field),0);assert.ok(dot(torque,h)<=1e-11&&Math.hypot(...ctl.dipole)<=350+1e-9);
 assert.ok(ctl.removalRate<=ctl.authority+1e-12);
}
near(magneticControl([0,0,7],field,350,true,60).authority,0);
near(magneticControl([0,4,3],field,350,false,60).driveFraction,0);
const limits={maneuverTorqueNm:12,maneuverMomentumNms:64},d={cmgTorqueNm:16,cmgMomentumNms:80};
near(availableControl(limits,d,79,20).maneuverMomentumNms,1);near(availableControl(limits,d,79,20).maneuverTorqueNm,0);

const base={...applyPreset(defaults,'launcher','glenn'),missionYears:.02,serviceRoute:'direct',link:'optical'},sim=createSimulation(base);
assert.ok(sim.hardware.fit);
assert.equal(sim.at(DEPLOY_END_S+.01).burnPermitState,'firing');
const compactCluster=createSimulation({...base,cmgMomentumNms:80});
assert.equal(compactCluster.hardware.cmg.model,'CMG 40-60 S');
const missedTrim=compactCluster.at(DEPLOY_END_S+.01);
assert.equal(missedTrim.burnPermitState,'held');assert.match(missedTrim.burnHold,/CMG/);
near(missedTrim.propellantKg,base.propellantKg);
const pass=sim.events(0,DAY).find(e=>e.type==='contact'&&e.start>DEPLOY_END_S);
const mid=(pass.start+pass.end)/2,lock=sim.at(mid);
assert.ok(lock.directPayloadLock&&lock.goodputMbps>0);assert.ok(lock.lockErrorDeg<=lock.beamwidthDeg/2);
const jitter=createSimulation({...base,opticalJitterUrad:80}).at(mid);
assert.equal(jitter.terminalState,'pointing budget exceeded');assert.ok(!jitter.directPayloadLock&&jitter.goodputMbps===0);
const noPower=createSimulation({...base,solarM2:5,batteryKWh:1});
const brownout=noPower.events(0,DAY).filter(e=>e.type==='contact'&&e.start>DEPLOY_END_S)
 .map(e=>noPower.at((e.start+e.end)/2)).find(s=>s.eclipse&&s.unmetKW>1);
assert.ok(brownout);assert.ok(!brownout.acquired&&!brownout.directPayloadLock&&brownout.linkCapacityMbps===0);
assert.equal(brownout.terminalState,'insufficient terminal power');
const burn=sim.at(43200.001);
assert.equal(burn.burnPermitState,'firing');assert.ok(burn.burnAxisErrorDeg<.75);
near(dot(burn.bodyZECI,burn.velocityECI)/Math.hypot(...burn.velocityECI),Math.cos(burn.burnAxisErrorDeg*DEG));
const stressed=createSimulation({...base,cmgMomentumNms:30,cpOffsetM:.5});
const held=stressed.at(DEPLOY_END_S+2);assert.equal(held.burnPermitState,'held');near(held.propellantKg,base.propellantKg);
const episode=stressed.events(0,2*DAY).find(e=>e.type==='desat');
assert.ok(episode);const unload=stressed.at(episode.start+10);
assert.ok(unload.desat&&unload.unloadRequested&&!unload.unloadInhibit&&unload.coilKW>0);
near(dot(unload.magTorqueEciNm,unload.magFieldEciUT),0);
assert.ok(dot(unload.magTorqueEciNm,unload.storedMomentumEciNms)<0);
near(unload.propellantKg,stressed.at(episode.start+5).propellantKg);
console.log('Verified CMG headroom, signed torque/field geometry, powered unloading, burn hold/firing and optical pointing/power lock gates.');
