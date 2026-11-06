import assert from 'node:assert/strict';
import {defaults,sizeDesign} from './dist/design.js';
import {componentInertia,tensorVector} from './dist/attitude-inertia.js';
import {mechanismMomentum} from './dist/mechanism-momentum.js';
import {attitudeGuidance} from './dist/attitude-guidance.js';
import {transformBodyToEci} from './dist/attitude-dynamics.js';
import {terminalLayout} from './dist/deployment.js';
import {geometry,cross,DEG} from './dist/orbit.js';
import {createSimulation} from './dist/model.js';

const norm=v=>Math.hypot(...v);
const close=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} versus ${expected}`);
const nearVector=(actual,expected,tolerance=1e-8)=>actual.forEach((value,i)=>close(value,expected[i],tolerance));
const qAngle=(a,b)=>2*Math.acos(Math.min(1,Math.abs(a.reduce((sum,v,i)=>sum+v*b[i],0))))/DEG;
const h=sizeDesign(defaults);
const pose={deployment:1,wing:20,upper:-45,lower:45,upperRoll:0,lowerRoll:0,dish:[0,1,0],optic:[0,1,0]};
const snapshotPose=p=>({
 wingPitchDeg:p.wing,upperRadiatorPitchDeg:p.upper,lowerRadiatorPitchDeg:p.lower,
 upperRadiatorRollDeg:p.upperRoll,lowerRadiatorRollDeg:p.lowerRoll,
 dishBoresightBody:p.dish,opticalBoresightBody:p.optic
});
const properties=componentInertia(h,{attitude:snapshotPose(pose)});

// Deployed wing centroids lie on their X-axis drives. Their prescribed pitch
// therefore contributes intrinsic Ixx times angular speed, with no orbital term.
for(const sign of [-1,0,1]) {
 const previous={...pose,wing:pose.wing-sign},rate=sign*.5*DEG;
 const expected=properties.movingElements.filter(part=>part.kind==='solarSheet')
  .reduce((sum,part)=>sum.map((value,i)=>value+tensorVector(part.intrinsicTensorKgM2,[rate,0,0])[i]),[0,0,0]);
 const actual=mechanismMomentum(h,previous,pose,2,properties);
 nearVector(actual,expected);
 if(sign)assert.equal(Math.sign(actual[0]),sign);
}
const oneSecond=mechanismMomentum(h,{...pose,wing:19.5},pose,1,properties);
const fiveSeconds=mechanismMomentum(h,{...pose,wing:17.5},pose,5,properties);
nearVector(oneSecond,fiveSeconds,1e-9);

// A steered aperture also translates around its elevation pin. Its analytical
// angular momentum includes both m r_COM × v and intrinsic I omega.
const theta=.2,rate=.005,dt=2;
const headPose={...pose,dish:[Math.sin(theta),Math.cos(theta),0]};
const headBefore={...headPose,dish:[Math.sin(theta-rate*dt),Math.cos(theta-rate*dt),0]};
const headProperties=componentInertia(h,{attitude:snapshotPose(headPose)});
const head=headProperties.movingElements.find(part=>part.id==='dish-head');
const fixture=terminalLayout(h.bodyWidthM,h.bodyHeightM,h.input.kaDishM,h.input.opticalApertureM);
const pivot=h.propulsion.stations['05.02'].map((value,i)=>value+(i===1?fixture.kaHeight:0));
const omega=[0,0,-rate],radius=head.centroidM.map((value,i)=>value-pivot[i]);
const offset=head.centroidM.map((value,i)=>value-headProperties.cm[i]);
const translation=cross(offset,cross(omega,radius)).map(value=>value*head.massKg);
const spin=tensorVector(head.intrinsicTensorKgM2,omega);
nearVector(mechanismMomentum(h,headBefore,headPose,dt,headProperties),translation.map((value,i)=>value+spin[i]),3e-7);
assert.ok(norm(translation)>norm(spin));

// The same integrated guidance that supplies the renderer must conserve total
// inertial angular momentum while internal mechanisms and CMGs are moving.
function orbitSlice(stepS) {
 let previous=null,result,initialMomentum,peakRelativeMomentum=0,peakWingRate=0,peakRadiatorRate=0;
 const start=3600,end=start+600;
 for(let t=start;t<=end;t+=stepS) {
  const g={...geometry(h.input,t),station:null,stationECI:null};
  result=attitudeGuidance(h,g,{
   deployment:1,previous,elapsedS:previous?stepS:0,
   externalTorqueEciNm:[0,0,0],magneticTorqueEciNm:[0,0,0]
  });
  previous=result.attitudeState;
  const dynamics=result.attitudeDynamics;
  initialMomentum??=dynamics.totalMomentumEciNms;
  nearVector(dynamics.totalMomentumEciNms,initialMomentum,1e-9);
  assert.ok(dynamics.angularMomentumResidualNms<1e-8);
  peakRelativeMomentum=Math.max(peakRelativeMomentum,norm(dynamics.mechanismMomentumBodyNms));
  peakWingRate=Math.max(peakWingRate,Math.abs(result.wingRateDegS));
  peakRadiatorRate=Math.max(peakRadiatorRate,Math.abs(result.upperRadiatorRollRateDegS),Math.abs(result.lowerRadiatorRollRateDegS));
  const exact=componentInertia(h,{deployment:1,attitude:result});
  nearVector(dynamics.inertiaKgM2,exact.tensorKgM2,1e-7);
  nearVector(dynamics.cmM,exact.cm,1e-12);
  const bodyMomentum=tensorVector(dynamics.inertiaKgM2,dynamics.bodyRateRadS);
  const observed=transformBodyToEci(result.bodyAttitudeQ,bodyMomentum.map((value,i)=>
   value+dynamics.cmgMomentumBodyNms[i]+dynamics.mechanismMomentumBodyNms[i]));
  nearVector(observed,initialMomentum,1e-8);
 }
 assert.ok(peakRelativeMomentum>.1&&peakWingRate>.01&&peakRadiatorRate>.001);
 return result;
}
const coarse=orbitSlice(5),fine=orbitSlice(1);
assert.ok(qAngle(coarse.bodyAttitudeQ,fine.bodyAttitudeQ)<.01);
nearVector(coarse.attitudeDynamics.bodyRateRadS,fine.attitudeDynamics.bodyRateRadS,2e-6);
nearVector(coarse.attitudeDynamics.mechanismMomentumBodyNms,fine.attitudeDynamics.mechanismMomentumBodyNms,.01);

// Off-grid mission seeks reconstruct one consistent state for the geometry,
// tensor, gimbal-derived momentum, scalar instruments and Earth-frame vector.
const sim=createSimulation({...defaults,missionYears:.005});
for(const t of [2132.25,2190.5,3600.125,43220.25]) {
 const s=sim.at(t),dynamics=s.attitudeDynamics;
 const exact=componentInertia(sim.hardware,{remainingKg:s.propellantKg,deployment:s.deployment,attitude:s});
 nearVector(dynamics.inertiaKgM2,exact.tensorKgM2,1e-7);
 nearVector(dynamics.cmM,exact.cm,1e-12);
 close(s.momentumNms,norm(dynamics.cmgMomentumBodyNms),1e-8);
 close(s.cmgMarginNms+s.momentumNms,sim.hardware.input.cmgMomentumNms,1e-8);
 nearVector(s.storedMomentumEciNms,transformBodyToEci(s.bodyAttitudeQ,dynamics.cmgMomentumBodyNms),1e-8);
}

console.log('Mechanism momentum signs, aperture offset motion, same-pose inertia, conserved inertial momentum during active articulation, 5 s/1 s convergence and consistent interpolated readouts passed.');
