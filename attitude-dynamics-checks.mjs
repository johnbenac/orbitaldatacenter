import assert from 'node:assert/strict';
import {stepAttitude,clusterState,transformBodyToEci,transformEciToBody,tensorVector} from './dist/attitude-dynamics.js';
import {magneticControl} from './dist/momentum-control.js';

const norm=v=>Math.hypot(...v),dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const close=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} versus ${b}`);
const nearVector=(a,b,tolerance=1e-9)=>a.forEach((v,i)=>close(v,b[i],tolerance));
const rotation=(axis,angle)=>[...axis.map(v=>v*Math.sin(angle/2)),Math.cos(angle/2)];
const angle=(a,b)=>2*Math.acos(Math.min(1,Math.abs(dot(a,b))))*180/Math.PI;
const identity=[0,0,0,1];
const inertia=[40000,1000,-400,1000,70000,500,-400,500,50000];
const base={inertiaKgM2:inertia,rotorMomentumNms:75,rotorTorqueNm:75,torqueLimitNm:16,momentumLimitNms:150};

// The four balanced rotors and their Jacobian share the rendered pyramid axes.
const zero=clusterState([0,0,0,0],75);
nearVector(zero.momentumBodyNms,[0,0,0]);
close(zero.condition,.5);
for(const angles of [[0,0,0,0],[.3,-.4,.8,-.9],[Math.PI/2,-Math.PI/2,.2,.1]]) {
 const c=clusterState(angles,75);
 for(let i=0;i<4;i++) {
  close(norm(c.gimbalAxes[i]),1);close(norm(c.rotorAxes[i]),1);close(dot(c.gimbalAxes[i],c.rotorAxes[i]),0);
  const epsilon=1e-6,after=angles.map((v,k)=>v+(k===i?epsilon:0)),before=angles.map((v,k)=>v-(k===i?epsilon:0));
  const forward=clusterState(after,75).momentumBodyNms,back=clusterState(before,75).momentumBodyNms;
  nearVector(forward.map((v,k)=>(v-back[k])/(2*epsilon)),c.jacobianColumns[i],2e-8);
 }
}
const q=rotation([0,1,0],.8),v=[1,2,3];
nearVector(transformEciToBody(q,transformBodyToEci(q,v)),v);

// An off-diagonal inertia tensor couples body axes during an external impulse.
const external=[.1,.2,-.3],impulse=stepAttitude({...base,state:{q:identity},targetQ:identity,dt:10,powered:false,externalTorqueEciNm:external});
nearVector(impulse.state.totalMomentumEciNms,external.map(v=>v*10));
assert.ok(impulse.angularMomentumResidualNms<1e-9);
assert.ok(angle(impulse.state.q,identity)>0);

// Rest-to-rest maneuvers retain the total spacecraft + rotor angular momentum.
for(const axis of [[1,0,0],[0,1,0],[0,0,1]]) {
 const target=rotation(axis,25*Math.PI/180);
 let state={q:identity},worstResidual=0,peakMomentum=0,result;
 for(let t=0;t<1000;t+=5) {
  result=stepAttitude({...base,state,targetQ:target,dt:5});state=result.state;
  worstResidual=Math.max(worstResidual,result.angularMomentumResidualNms);
  peakMomentum=Math.max(peakMomentum,norm(result.cmgMomentumBodyNms));
  close(norm(state.q),1,1e-12);
 }
 assert.ok(result.trackingErrorDeg<.005,`${axis} tracking error ${result.trackingErrorDeg}`);
 assert.ok(norm(state.omegaBodyRadS)<2e-6);
 assert.ok(peakMomentum<=150+1e-7&&worstResidual<1e-8);
 nearVector(state.totalMomentumEciNms,[0,0,0],1e-8);
}

// Torque-free asymmetric-body motion conserves L and nearly conserves energy.
const small=[1000,100,80,100,2000,-70,80,-70,2500],omega=[.01,.02,.03];
const free={...base,inertiaKgM2:small,state:{q:identity,omegaBodyRadS:omega},targetQ:identity,dt:600,powered:false};
const coarse=stepAttitude({...free,maxStepS:1}),fine=stepAttitude({...free,maxStepS:.5});
const energy=w=>dot(w,tensorVector(small,w))/2;
assert.ok(Math.abs(energy(coarse.state.omegaBodyRadS)/energy(omega)-1)<1e-4);
assert.ok(angle(coarse.state.q,fine.state.q)<.25);
nearVector(coarse.state.totalMomentumEciNms,tensorVector(small,omega),1e-9);
assert.ok(norm(coarse.state.omegaBodyRadS.map((v,i)=>v-omega[i]))>.01);

// A changed assembly inertia and internal mechanism momentum keep total L.
const oldTensor=[10,0,0,0,20,0,0,0,30],newTensor=[10,0,0,0,20,0,0,0,60];
const expansion=stepAttitude({...base,state:{q:identity,omegaBodyRadS:[0,0,.1],inertiaKgM2:oldTensor},
 inertiaKgM2:newTensor,targetQ:identity,powered:false,dt:1,maxStepS:.1});
close(expansion.state.omegaBodyRadS[2],.05);close(expansion.state.totalMomentumEciNms[2],3);
const articulation=stepAttitude({...base,state:{q:identity,mechanismMomentumBodyNms:[0,0,0]},inertiaKgM2:oldTensor,
 targetQ:identity,mechanismMomentumBodyNms:[0,0,1],powered:false,dt:2});
close(articulation.state.omegaBodyRadS[2],-1/30);nearVector(articulation.state.totalMomentumEciNms,[0,0,0],1e-10);
const remapped=stepAttitude({...base,state:{q:identity,omegaBodyRadS:[0,0,.1],inertiaKgM2:oldTensor},
 inertiaKgM2:newTensor,targetQ:identity,powered:false,dt:0});
close(remapped.state.omegaBodyRadS[2],.05);nearVector(remapped.state.q,identity);
assert.ok(remapped.angularMomentumResidualNms<1e-9);

// Inspection retains the latest inertia and relative-momentum derivatives, so
// the reported requested torque matches the accepted endpoint at the same time.
const rampTensor=inertia.map(v=>1.02*v),rampTarget=rotation([0,1,0],.1);
const ramp=stepAttitude({...base,state:{q:identity,omegaBodyRadS:[.001,.002,-.003],inertiaKgM2:inertia,mechanismMomentumBodyNms:[0,0,0]},
 inertiaKgM2:rampTensor,mechanismMomentumBodyNms:[.1,.2,.3],targetQ:rampTarget,dt:20});
const rampRead=stepAttitude({...base,state:ramp.state,inertiaKgM2:rampTensor,mechanismMomentumBodyNms:[.1,.2,.3],targetQ:rampTarget,dt:0});
nearVector(rampRead.commandTorqueBodyNm,ramp.commandTorqueBodyNm);
nearVector(rampRead.achievedTorqueBodyNm,ramp.achievedTorqueBodyNm);

// The real magnetic dipole command exports angular momentum while the CMGs
// hold the body. Its torque remains perpendicular to the local field.
let unloaded={q:identity,omegaBodyRadS:[0,0,0],cmgAnglesRad:[.1,.1,.1,.1]},unloadResult;
const storedBefore=norm(clusterState(unloaded.cmgAnglesRad,75).momentumBodyNms);
for(let t=0;t<120;t++) {
 const h=transformBodyToEci(unloaded.q,clusterState(unloaded.cmgAnglesRad,75).momentumBodyNms);
 const rods=magneticControl(h,[30,0,0],350,true,1);
 close(dot(rods.torque,[30,0,0]),0);
 unloadResult=stepAttitude({...base,state:unloaded,targetQ:identity,dt:1,magneticTorqueEciNm:rods.torque});unloaded=unloadResult.state;
}
assert.ok(norm(unloadResult.cmgMomentumBodyNms)<storedBefore-1);
assert.ok(unloadResult.trackingErrorDeg<.01);

// Finite gimbal-rate and operational momentum limits leave physical residuals.
const slow=stepAttitude({...base,state:{q:identity},targetQ:rotation([1,0,0],1),rotorTorqueNm:.01,dt:4});
assert.ok(slow.rateLimited);
assert.ok(Math.max(...slow.cmgGimbalRatesRadS.map(Math.abs))<=.01/75+1e-12);
assert.ok(norm(slow.torqueResidualBodyNm)>1);
const held=stepAttitude({...base,state:{q:identity},targetQ:identity,momentumLimitNms:1,externalTorqueEciNm:[.02,.03,.04],dt:150});
assert.ok(held.momentumLimited);assert.ok(norm(held.cmgMomentumBodyNms)<=1+1e-7);
assert.ok(norm(held.state.omegaBodyRadS)>1e-5);
const read=stepAttitude({...base,state:held.state,targetQ:identity,momentumLimitNms:1,externalTorqueEciNm:[.02,.03,.04],dt:0});
nearVector(read.state.q,held.state.q);nearVector(read.state.cmgAnglesRad,held.state.cmgAnglesRad);
assert.ok(read.momentumLimited);

// A rank-deficient cluster reports finite rates, condition and torque residual.
const singularAngles=[Math.PI/2,Math.PI/2,Math.PI/2,Math.PI/2];
assert.ok(clusterState(singularAngles,75).condition<1e-7);
const singular=stepAttitude({...base,state:{q:identity,cmgAnglesRad:singularAngles},targetQ:rotation([0,0,1],.2),momentumLimitNms:300,dt:1});
assert.ok(singular.state.q.every(Number.isFinite));
assert.ok(singular.cmgGimbalRatesRadS.every(Number.isFinite));
assert.ok(norm(singular.torqueResidualBodyNm)>1e-4);

// Low-rate orbital tracking uses smooth reference interpolation. Compare the
// adaptive four-second path with quarter-second integration over a complete orbit.
function track(maxStepS) {
 const n=.0011,axis=[1,0,0];let state={q:identity,omegaBodyRadS:[n,0,0]},result;
 for(let t=0;t<5760;t+=60) {
  result=stepAttitude({...base,state,startTargetQ:rotation(axis,t*n),targetQ:rotation(axis,(t+60)*n),
   referenceRateBodyRadS:[n,0,0],externalTorqueEciNm:[.0001,-.0002,.00015],dt:60,maxStepS});
  state=result.state;
 }
 return result;
}
const fast=track(8),moderate=track(4),accurate=track(.25);
assert.ok(angle(fast.state.q,accurate.state.q)<.025);
assert.ok(angle(moderate.state.q,accurate.state.q)<.025);
assert.ok(fast.trackingErrorDeg<.02);
assert.ok(fast.angularMomentumResidualNms<1e-8);
const replay=track(8);
nearVector(replay.state.q,fast.state.q,1e-12);nearVector(replay.state.cmgAnglesRad,fast.state.cmgAnglesRad,1e-12);

console.log('Full-tensor Euler motion, CMG Jacobian and rate limits, three-axis settling, inertial momentum conservation, changing inertia and mechanism reaction, saturation, singularity reporting, deterministic replay and integration-step convergence passed.');
