import assert from 'node:assert/strict';
import {defaults,sizeDesign} from './dist/design.js';
import {geometry,dot,unit,cross,DEG} from './dist/orbit.js';
import {bankNormal,deploymentLayout,leafPose,leafAxes} from './dist/deployment.js';
import {attitudeGuidance,attitudeLimits} from './dist/attitude-guidance.js';
const h=sizeDesign(defaults),close=(x,y,tol=1e-8)=>assert.ok(Math.abs(x-y)<tol,`${x} vs ${y}`),length=v=>Math.hypot(...v);
const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,dot(a,b))))/DEG;
const qAngle=(a,b)=>2*Math.acos(Math.min(1,Math.abs(a.reduce((sum,v,i)=>sum+v*b[i],0))))/DEG;
const step=(t,prev,o={})=>attitudeGuidance(h,geometry(h.input,t),{deployment:1,previous:prev?.attitudeState,...o});
function certify(s,g){
 const [x,y,z]=[s.bodyXECI,s.bodyUpECI,s.bodyZECI];close(dot(cross(x,y),z),1);for(const axis of [x,y,z])close(length(axis),1);
 const wing=s.wingPitchDeg*DEG;
 close(dot(s.pvNormalECI,x),0);close(dot(s.pvNormalECI,y),Math.cos(wing));close(dot(s.pvNormalECI,z),Math.sin(wing));
 for(const [bank,sign] of [['upper',-1],['lower',1]]){
  const p=s[bank+'RadiatorPitchDeg'],r=s[bank+'RadiatorRollDeg'],n=s[bank+'RadiatorNormalECI'];
  assert.ok(sign*p>=45-1e-9&&sign*p<=attitudeLimits(h).bankCantDeg+1e-9);assert.ok(Math.abs(r)<=105);
  const local=bankNormal(p*DEG,r*DEG),layout=deploymentLayout(h);
  for(const desc of layout.descriptors.filter(q=>q.type==='rad'&&q.end===sign)){
   const mesh=leafAxes(leafPose(layout,desc,1,0,s))[1];
   for(const [i,axis] of [x,y,z].entries()){close(dot(n,axis),local[i]);close(mesh[i],local[i]);}
  }
  close(s[bank+'RadiatorSunCos'],Math.abs(dot(n,g.sunECI)));
 }
 for(const v of [s.dishBoresightBody,s.opticalBoresightBody]){close(length(v),1);assert.ok(v[1]>=Math.cos(75*DEG)-1e-9);}
}
let prev=null,wingRange=[],hits=new Set();
for(let t=86400;t<=86400+6200;t+=5){
 const g=geometry(h.input,t),a=step(t,prev);certify(a,g);hits.add(a.attitudeMode);wingRange.push(a.wingPitchDeg);
 if(prev){assert.ok(qAngle(a.attitudeState.q,prev.attitudeState.q)<=.8*5+1e-7);assert.ok(Math.abs(a.wingRateDegS)<=2+1e-8);assert.ok(a.bodySlewMomentumNms<=attitudeLimits(h).maneuverMomentumNms+1e-7);}
 prev=a;
}
assert.ok(hits.has('tracking')&&hits.has('eclipse'));assert.ok(Math.max(...wingRange)-Math.min(...wingRange)>340);
const current=step(prev.attitudeState.t,prev);for(const key of ['bodyRateDegS','wingPitchDeg','wingRateDegS','upperRadiatorRateDegS','lowerRadiatorRateDegS'])close(prev[key],current[key]);
// The former single-pitch architecture put one bank near broadside here.
let warm=null,maxIncidence=0,covered=0;
for(let t=86400;t<92600;t+=10){
 const g=geometry(h.input,t);warm=attitudeGuidance(h,g,{deployment:1,previous:warm?.attitudeState,loopTemperatureK:295});
 if(!g.eclipse){covered++;maxIncidence=Math.max(maxIncidence,warm.upperRadiatorSunCos,warm.lowerRadiatorSunCos);}
}
assert.ok(covered>250&&maxIncidence<.15,'Hot-case banks should stay near edge-on over the sunlit arc: '+maxIncidence);
const testEclipse={...geometry(h.input,88590),eclipse:true,station:null};
const cold=attitudeGuidance(h,testEclipse,{deployment:1,loopTemperatureK:230});
const hot=attitudeGuidance(h,testEclipse,{deployment:1,loopTemperatureK:300});
for(const key of ['upperRadiatorNormalECI','lowerRadiatorNormalECI'])assert.ok(Math.abs(dot(cold[key],testEclipse.radial))>Math.abs(dot(hot[key],testEclipse.radial))+.12);
const hysteresis=attitudeGuidance(h,testEclipse,{deployment:1,loopTemperatureK:cold.radiatorColdThresholdK+2,previous:cold.attitudeState});
assert.equal(hysteresis.radiatorColdProtection,true);assert.equal(hot.radiatorColdProtection,false);
const time=96000,g=geometry(defaults,time),free={...g,eclipse:false,station:null,stationECI:null};
for(const law of ['tracking','manual','nadir','inertial','lowdrag']){
 const hw=sizeDesign({...defaults,attitude:law,...(law==='manual'?{rollDeg:75,pitchDeg:20,yawDeg:11}:{})});
 const s=attitudeGuidance(hw,free,{deployment:1});certify(s,free);assert.equal(s.attitudeMode,law);
 if(law==='nadir')close(dot(s.bodyUpECI,g.radial),-1);
 if(law==='inertial')assert.deepEqual(s.bodyXECI,[1,0,0]);
 if(law==='lowdrag'){const p=g.positionECI,v=g.velocityECI;close(dot(s.bodyXECI,unit([v[0]+.00007292115*p[1],v[1]-.00007292115*p[0],v[2]])),1);}
}
for(const sign of [-1,1]){
 const burn=attitudeGuidance(h,free,{burnDirection:sign,burnKind:'disposal',deployment:1});close(dot(burn.bodyZECI,unit(g.velocityECI)),sign);
 const pulse=attitudeGuidance(h,{...free,t:g.t+1},{deployment:1,burnDirection:-sign,burnKind:'disposal',previous:burn.attitudeState});assert.ok(pulse.attitudeSlewErrorDeg>179);
 const pre=attitudeGuidance(h,free,{deployment:1,plannedBurnDirection:sign,plannedBurnLeadS:50});assert.equal(pre.attitudeMode,'prepoint');close(dot(pre.bodyZECI,unit(g.velocityECI)),sign);
}
const nadir=h.input.attitude==='nadir'?h:sizeDesign({...defaults,attitude:'nadir'});
const target=unit(g.radial.map((v,i)=>-v+.70*g.along[i])),site=n=>({...free,station:'test',rangeKm:600,stationECI:g.positionECI.map((v,i)=>v+600*n[i])});
let state=attitudeGuidance(nadir,free,{deployment:1});
for(let k=0;k<=25;k++){
 const visible={...site(target),t:g.t+k};state=attitudeGuidance(nadir,visible,{deployment:1,terminal:'Ka',contactAge:k,previous:state.attitudeState});
 if(k===0){assert.ok(state.terminalErrorDeg>30);assert.equal(state.terminalState,'acquiring');}
}
assert.equal(state.terminalState,'tracking');close(state.terminalErrorDeg,0,1e-5);close(dot(state.terminalBoresightECI,target),1);
const masked=attitudeGuidance(nadir,site(g.radial),{deployment:1,contactAge:80,terminal:'Optical'});assert.equal(masked.terminalState,'travel limit');assert.equal(masked.terminalReachable,false);assert.ok(masked.terminalErrorDeg>=104);
const frozen=attitudeGuidance(h,{...geometry(defaults,time+600),flightPhase:'entry'},{previous:state.attitudeState,deployment:1});assert.equal(frozen.attitudeMode,'passive');assert.deepEqual(frozen.attitudeState.q,state.attitudeState.q);close(frozen.wingPitchDeg,state.wingPitchDeg);assert.equal(frozen.terminalErrorDeg,null);
console.log('Attitude guidance verified across a sunlit/eclipsed orbit, body policies, bounded CMG slews, both burn directions, aperture acquisition, signed radiator drives and retirement.');
