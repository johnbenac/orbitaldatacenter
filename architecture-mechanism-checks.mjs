import assert from 'node:assert/strict';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign,referenceConfigurationMetadata} from './dist/reference-configurations.js';
import {componentMassProperties,mechanismStations} from './dist/component-stations.js';
import {componentInertia,movingMassElements,boxInertia,parallelAxisTensor} from './dist/attitude-inertia.js';
import {mechanismMomentum} from './dist/mechanism-momentum.js';
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${message}: ${a} ≠ ${b}`);
const vector=(a,b,message)=>a.forEach((v,k)=>near(v,b[k],message));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const cases=Object.keys(referenceConfigurationMetadata).map(id=>buildReferenceDesign(id));
cases.push(buildReferenceDesign('redwire-8kw',{revision:'odc-study-2026-11-r1'}));
for(const input of cases){
 const h=sizeDesign(input);
 for(const deployment of [0,.115,.5,.85,1]){
  const properties=componentInertia(h,{deployment}),row=componentMassProperties(h,h.propellantKg,deployment).rows.find(r=>r.wbs==='07.04'),stations=mechanismStations(h,deployment),joints=properties.movingElements.filter(p=>p.wbs==='07.04'),probe=movingMassElements(h,{deployment}).filter(p=>p.wbs==='07.04');
  near(joints.reduce((sum,p)=>sum+p.massKg,0),row.predictedKg,'Joint masses conserve their equipment account');
  assert.equal(joints.length,stations.length);assert.equal(new Set(joints.map(p=>p.id)).size,joints.length);
  const tensor=Array(9).fill(0);
  joints.forEach((p,i)=>{
   vector(p.centroidM,stations[i].centroidM,'Shared joint station');vector(p.centroidM,row.stationsM[i],'Joint / equipment location');vector(p.centroidM,probe[i].centroidM,'Current / differential geometry location');near(p.massKg,probe[i].massKg,'Current / differential geometry mass');
   const intrinsic=boxInertia(p.massKg,[.16,.16,.20]),parallel=parallelAxisTensor(p.massKg,p.centroidM.map((v,k)=>v-properties.cm[k]));
   for(let k=0;k<9;k++)tensor[k]+=intrinsic[k]+parallel[k];
  });
  vector(tensor,properties.contributions.find(p=>p.wbs==='07.04').tensorKgM2,'No joint inertia duplication or omission');
  near(properties.massKg,h.wetKg,'Full vehicle mass closure');
 }
}
// During the first inline arm root motion, isolate the compact joints. Their
// translational momentum must be present even with no local motor rotor spin.
const h=sizeDesign(buildReferenceDesign('starcloud-3')),dt=.1,u=.115,previous={deployment:u-.001,dish:[0,1,0],optic:[0,1,0]},current={deployment:u,wing:0,upper:0,lower:0,upperRoll:0,lowerRoll:0,dish:[0,1,0],optic:[0,1,0]},properties=componentInertia(h,{deployment:u}),joints=properties.movingElements.filter(p=>p.wbs==='07.04');
const actual=mechanismMomentum(h,previous,current,dt,{...properties,movingElements:joints}),before=movingMassElements(h,{deployment:u-.00001}).filter(p=>p.wbs==='07.04'),expected=[0,0,0];
joints.forEach((p,i)=>{const velocity=p.centroidM.map((v,k)=>(v-before[i].centroidM[k])/.001),offset=p.centroidM.map((v,k)=>v-properties.cm[k]),momentum=cross(offset,velocity);for(let k=0;k<3;k++)expected[k]+=p.massKg*momentum[k];});
vector(actual,expected,'Articulation momentum includes moving joint translation');assert.ok(Math.hypot(...actual)>1e-3,'Inline joint reaction is nonzero');
console.log('All six current families plus archived legacy conserve joint mass/inertia; the inline joint translation contributes '+Math.hypot(...actual).toFixed(3)+' N m s in the isolated test motion.');
