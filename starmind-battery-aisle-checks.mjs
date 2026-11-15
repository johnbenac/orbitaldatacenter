// Bounded construction checks for three ordinary planner hints. Native scene
// clearance is assessed separately against actual equipment and fluid routes.
import assert from 'node:assert/strict';
import {starmindBatteryOutboardHint} from './dist/installed-electrical-routing.js';
import {roundedConnectionRoute} from './dist/connection-routes.js';
import {auditRoutes} from './dist/routing-audit.js';
import {planElectricalRoute} from './dist/electrical-routing.js';

const h={input:{referenceCenterId:'starmind-ai1'},architectureFamilyId:'starmind-cross'};
const layout={familyId:'starmind-cross'},fromNormal=[0,0,-1],toNormal=[0,0,1];
const cases=[
 {id:'P-BAT-3/2',harness:'P-BAT-3',box:'battery-3',
  from:[.1210974724705234,-.4930772921837871,3.3413061685461773],
  to:[-.8029325992139549,-.33426731138481264,-2.4924897022735237]},
 {id:'P-BAT-4/0',harness:'P-BAT-4',box:'battery-4',
  from:[.9230300716844785,-.4930772921837871,3.3413061685461773],
  to:[-.7449325992139548,-.33426731138481264,-2.4924897022735237]},
 {id:'P-BAT-4/3',harness:'P-BAT-4',box:'battery-4',
  from:[.9770300716844785,-.4409972921837871,3.3413061685461773],
  to:[-.6909325992139548,-.2821873113848126,-2.4924897022735237]}
];
const makeLine=c=>({id:c.id,radiusM:.00675,bendRadiusM:.135,r:{spec:{
 id:c.harness,groupId:'primary',kind:'power',fromBoxId:c.box,toBoxId:'pcdu',
 fromPortId:c.harness+':from',toPortId:c.harness+':to',terminationAllowanceM:.3
},from:{matingTravel:.045,plug:{position:{x:0,y:0,z:0}}},
 to:{matingTravel:.045,plug:{position:{x:0,y:0,z:0}}}}});
const distance=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]));
const routes=[];
for(const c of cases){
 const line=makeLine(c),controls=starmindBatteryOutboardHint(h,layout,line,
  c.from,c.to,fromNormal,toNormal),shape=roundedConnectionRoute(controls,.135);
 assert(controls&&controls.length>2);
 assert.deepEqual(controls[0],c.from);assert.deepEqual(controls.at(-1),c.to);
 assert(!shape.bendLimited&&shape.minimumBendRadiusM>=.135-1e-10);
 assert(distance(shape.points[0],shape.points[1])>=.045);
 assert(distance(shape.points.at(-1),shape.points.at(-2))>=.045);
 const row={id:c.id,points:shape.points,radiusM:.00675,clearanceM:.002,
  minBendRadiusM:.135,minimumBendRadiusM:shape.minimumBendRadiusM,
  from:{position:c.from,normal:fromNormal},to:{position:c.to,normal:toNormal}};
 const options={id:c.id,fromNormal,toNormal,radiusM:.00675,bendRadiusM:.135,
  clearanceM:.002,candidateControls:controls,otherRoutes:routes,maxAttempts:0,maxGridNodes:0};
 const accepted=planElectricalRoute(c.from,c.to,options);
 assert(accepted.ok&&accepted.constructionHintAccepted,
  'The ordinary planner admits the complete hint with its physical neighbors');
 const mid=controls[3].map((v,k)=>(v+controls[4][k])/2),obstruction={
  id:'physical-aisle-obstruction',type:'box',min:mid.map(v=>v-.03),max:mid.map(v=>v+.03)};
 const rejected=planElectricalRoute(c.from,c.to,{...options,obstacles:[obstruction]});
 assert(!rejected.constructionHintAccepted&&!auditRoutes([row],[obstruction]).ok,
  'A real solid in the aisle rejects the construction; the hint is not acceptance');
 routes.push(row);

 const call=(hardware=h,frame=layout,l=line,a=c.from,b=c.to,na=fromNormal,nb=toNormal,w=[])=>
  starmindBatteryOutboardHint(hardware,frame,l,a,b,na,nb,w);
 assert.equal(call({...h,input:{referenceCenterId:'another-reference'}}),null);
 assert.equal(call({...h,architectureFamilyId:'redwire-platform'}),null);
 assert.equal(call(h,{familyId:'protected-core'}),null);
 assert.equal(call(h,layout,{...line,id:c.id+'/other'}),null);
 assert.equal(call(h,layout,{...line,radiusM:.007}),null);
 assert.equal(call(h,layout,{...line,bendRadiusM:.14}),null);
 assert.equal(call(h,layout,{...line,fromEscape:{}}),null);
 assert.equal(call(h,layout,{...line,toPortal:{}}),null);
 assert.equal(call(h,layout,line,c.from.map((v,k)=>v+(k===0?.001:0))),null);
 assert.equal(call(h,layout,line,c.from,c.to.map((v,k)=>v+(k===2?.001:0))),null);
 assert.equal(call(h,layout,line,c.from,c.to,[1,0,0]),null);
 assert.equal(call(h,layout,line,c.from,c.to,fromNormal,[0,1,0]),null);
 assert.equal(call(h,layout,line,c.from,c.to,fromNormal,toNormal,[[0,0,0]]),null);
 const withdrawn=makeLine(c);withdrawn.r.from.plug.position.z=.001;
 assert.equal(call(h,layout,withdrawn),null);
 const changedStroke=makeLine(c);changedStroke.r.to.matingTravel=.05;
 assert.equal(call(h,layout,changedStroke),null);
}
const pair=auditRoutes(routes,[],{maxIssues:5});assert(pair.ok,JSON.stringify(pair.issues));
console.log('PASS Starmind battery aisle: three full-radius routes, 45 mm terminal straights, '+
 'pair/self clearance, ordinary obstacle rejection and exact-interface isolation.');
