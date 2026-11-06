import assert from 'node:assert/strict';
import {defaults,missionStarter,sizeDesign} from './dist/design.js';
import {componentMassProperties} from './dist/component-stations.js';
import {componentInertia,boxInertia,parallelAxisTensor,principalMoments,inverseTensor,tensorVector} from './dist/attitude-inertia.js';

const close=(a,b,relative=1e-9)=>assert.ok(Math.abs(a-b)<=relative*Math.max(1,Math.abs(a),Math.abs(b)),`${a} differs from ${b}`);
const equalVector=(a,b,tolerance)=>a.forEach((v,i)=>close(v,b[i],tolerance));
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const subtract=(a,b)=>a.map((v,i)=>v-b[i]);
const positiveTensor=a=>{
 assert.ok(a.every(Number.isFinite));
 close(a[1],a[3]);close(a[2],a[6]);close(a[5],a[7]);
 const moments=principalMoments(a);
 assert.ok(moments[0]>0&&moments[0]<=moments[1]&&moments[1]<=moments[2]);
 assert.ok(moments[2]<=moments[0]+moments[1]+1e-7,'Physical principal moments obey the triangle inequality');
 close(moments.reduce((s,n)=>s+n,0),a[0]+a[4]+a[8]);
 equalVector(tensorVector(inverseTensor(a),tensorVector(a,[.2,-.7,1.3])),[.2,-.7,1.3]);
};

// Independent analytic fixtures exercise intrinsic moments, signed products and rotation.
equalVector(boxInertia(12,[2,3,4]),[25,0,0,0,20,0,0,0,13]);
equalVector(parallelAxisTensor(2,[1,2,3]),[26,-4,-6,-4,20,-12,-6,-12,10]);
const s=Math.SQRT1_2,axes=[[s,s,0],[-s,s,0],[0,0,1]];
equalVector(boxInertia(12,[2,3,4],axes),[22.5,2.5,0,2.5,22.5,0,0,0,13]);
equalVector(principalMoments(boxInertia(12,[2,3,4],axes)),[13,20,25]);

const hardware=sizeDesign(defaults),poses=[
 {deployment:0,adapterAttached:true},
 {deployment:.25},{deployment:.5},{deployment:.74},{deployment:1},
 {deployment:1,remainingKg:0},
 {deployment:1,remainingKg:.37*hardware.propellantKg,attitude:{wingPitchDeg:37,upperRadiatorPitchDeg:-72,lowerRadiatorPitchDeg:63,upperRadiatorRollDeg:-35,lowerRadiatorRollDeg:45,dishBoresightBody:[.6,.8,0],opticalBoresightBody:[0,.8,.6]}}
];
for(const options of poses){
 const result=componentInertia(hardware,options),props=componentMassProperties(hardware,options.remainingKg??hardware.propellantKg,options.deployment,options.adapterAttached??false,true,options.attitude);
 close(result.massKg,props.massKg);equalVector(result.cm,props.cm);
 close(result.contributions.reduce((sum,row)=>sum+row.massKg,0),result.massKg);
 equalVector(result.contributions.reduce((sum,row)=>add(sum,row.tensorKgM2),Array(9).fill(0)),result.tensorKgM2);
 for(const wbs of ['02.01','03.01']){
  const parts=result.movingElements.filter(p=>p.wbs===wbs),row=result.contributions.find(r=>r.wbs===wbs),mass=parts.reduce((sum,p)=>sum+p.massKg,0);
  close(mass,row.massKg);
  const center=parts.reduce((sum,p)=>add(sum,p.centroidM.map(v=>v*p.massKg/mass)),[0,0,0]);
  equalVector(center,row.centroidM);
 }
 assert.equal(new Set(result.movingElements.map(p=>p.id)).size,14);
 assert.ok(result.contributions.every(r=>r.basis.length>20));
 positiveTensor(result.tensorKgM2);
}

// A translated gyro cluster must alter both the COM and the complete tensor.
const delta=[.31,-.19,.72],original=componentInertia(hardware),gyro=original.contributions.find(r=>r.wbs==='04.01');
const moved={...hardware,propulsion:{...hardware.propulsion,stations:{...hardware.propulsion.stations,'04.01':hardware.propulsion.stations['04.01'].map(p=>add(p,delta))}}};
const changed=componentInertia(moved),offset=subtract(gyro.centroidM,original.cm);
equalVector(subtract(changed.cm,original.cm),delta.map(v=>v*gyro.massKg/original.massKg));
const expected=subtract(subtract(parallelAxisTensor(gyro.massKg,add(offset,delta)),parallelAxisTensor(gyro.massKg,offset)),parallelAxisTensor(gyro.massKg**2/original.massKg,delta));
equalVector(subtract(changed.tensorKgM2,original.tensorKgM2),expected);

const stowed=componentInertia(hardware,{deployment:0}),deployed=componentInertia(hardware),empty=componentInertia(hardware,{remainingKg:0});
assert.ok(deployed.diagonalKgM2[1]>stowed.diagonalKgM2[1]);
assert.ok(deployed.diagonalKgM2[2]>stowed.diagonalKgM2[2]);
close(deployed.massKg-empty.massKg,hardware.propellantKg);
assert.ok(empty.principalKgM2.every((v,i)=>v<deployed.principalKgM2[i]));
const attached=componentInertia(hardware,{adapterAttached:true});close(attached.massKg-deployed.massKg,hardware.input.adapterKg);
const tilted=componentInertia(hardware,{attitude:{wingPitchDeg:37}});
close(tilted.tensorKgM2[0]+tilted.tensorKgM2[4]+tilted.tensorKgM2[8],deployed.tensorKgM2[0]+deployed.tensorKgM2[4]+deployed.tensorKgM2[8]);
assert.ok(Math.abs(tilted.tensorKgM2[5]-deployed.tensorKgM2[5])>1,'Tilt rotates the wing products of inertia');
const aimed=componentInertia(hardware,{attitude:{dishBoresightBody:[.8,.6,0]}});
assert.ok(Math.abs(aimed.cm[0]-deployed.cm[0])>1e-7,'The same moving head mass updates center of mass');
assert.ok(aimed.movingElements.find(p=>p.id==='dish-head').centroidM[0]!==deployed.movingElements.find(p=>p.id==='dish-head').centroidM[0]);

for(const purpose of ['text','voice','batch','agents','finetune','pretrain']){
 const h=sizeDesign(missionStarter(purpose));
 for(const deployment of [0,.6,1])positiveTensor(componentInertia(h,{deployment}).tensorKgM2);
}
assert.equal(componentInertia(hardware,{attitude:{wingPitchDeg:21}}),componentInertia(hardware,{attitude:{wingPitchDeg:21}}),'Exact pose cache is deterministic');
console.log('Component inertia verified against analytic shapes, signed parallel-axis products, gyro relocation, MEL mass/COM closure, articulation, depletion, release, inverse tensors and all six mission purposes.');
