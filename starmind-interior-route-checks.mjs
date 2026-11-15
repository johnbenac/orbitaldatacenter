// Bounded checks for four interior corridor proposals. Complete scene solids,
// fluid lines and earlier electrical paths are checked by the native planner.
import assert from 'node:assert/strict';
import {starmindInteriorRouteHint} from './dist/installed-electrical-routing.js';
import {roundedConnectionRoute} from './dist/connection-routes.js';
import {auditRoutes} from './dist/routing-audit.js';
import {planElectricalRoute} from './dist/electrical-routing.js';

const h={input:{referenceCenterId:'starmind-ai1'},architectureFamilyId:'starmind-cross',
 bodyWidthM:4.279662996069774,bodyHeightM:2.514653772303748,bodyLengthM:10.323177545532943};
const layout={familyId:'starmind-cross'},cases=[
 {id:'P-SVC-fabric-11',fromBox:'pcdu',toBox:'fabric-11',kind:'power',group:'service',
  radiusM:.0032645083840347707,bendRadiusM:.06529016768069541,
  from:[-1.1845325992139548,-.08776731138481259,-2.7667897022735235],
  to:[-1.0155,1.0167751956165842,-.9761897022735233],
  fromNormal:[-1,0,0],toNormal:[0,0,1]},
 {id:'D-WORKER-16',fromBox:'fabric-1',toBox:'compute-16',kind:'data',group:'fabric',
  radiusM:.0015,bendRadiusM:.03,
  from:[-.7720000000000001,1.0292751956165842,-2.5853897022735235],
  to:[1.4394,-.0572,-1.8408987812018631],fromNormal:[0,0,1],toNormal:[1,0,0]},
 {id:'D-WORKER-52',fromBox:'fabric-4',toBox:'compute-52',kind:'data',group:'fabric',
  radiusM:.0015,bendRadiusM:.03,
  from:[.44500000000000006,.9722751956165843,-2.5853897022735235],
  to:[-.8406000000000001,.3927999999999999,-1.040898781201863],
  fromNormal:[0,0,1],toNormal:[1,0,0]},
 {id:'D-WORKER-53',fromBox:'fabric-4',toBox:'compute-53',kind:'data',group:'fabric',
  radiusM:.0015,bendRadiusM:.03,
  from:[.4770000000000001,.9722751956165843,-2.5853897022735235],
  to:[-.8406000000000001,-.7321999999999999,-1.040898781201863],
  fromNormal:[0,0,1],toNormal:[1,0,0]}
];
const makeLine=c=>({id:c.id+'/0',radiusM:c.radiusM,bendRadiusM:c.bendRadiusM,r:{spec:{
 id:c.id,kind:c.kind,groupId:c.group,fromBoxId:c.fromBox,toBoxId:c.toBox,
 fromPortId:c.id+':from',toPortId:c.id+':to',terminationAllowanceM:.3
},from:{matingTravel:.045,plug:{position:{x:0,y:0,z:0}}},
 to:{matingTravel:.045,plug:{position:{x:0,y:0,z:0}}}}});
const distance=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k])),routes=[];
for(const c of cases){
 const line=makeLine(c),call=(hardware=h,frame=layout,l=line,a=c.from,b=c.to,
  na=c.fromNormal,nb=c.toNormal,w=[])=>starmindInteriorRouteHint(hardware,frame,l,a,b,na,nb,w);
 const controls=call();assert(controls&&controls.length>2);
 const shape=roundedConnectionRoute(controls,c.bendRadiusM);
 assert.deepEqual(controls[0],c.from);assert.deepEqual(controls.at(-1),c.to);
 assert(!shape.bendLimited&&shape.minimumBendRadiusM>=c.bendRadiusM-1e-10);
 assert(distance(shape.points[0],shape.points[1])>=.045);
 assert(distance(shape.points.at(-1),shape.points.at(-2))>=.045);
 const body=[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM],wall=h.bodyHeightM*.024;
 assert(shape.points.every(p=>p.every((v,k)=>Math.abs(v)+c.radiusM+.002<body[k]/2-wall)),
  'The complete route remains inside the body wall allocation');
 const row={id:line.id,points:shape.points,radiusM:c.radiusM,clearanceM:.002,
  minBendRadiusM:c.bendRadiusM,minimumBendRadiusM:shape.minimumBendRadiusM,
  from:{position:c.from,normal:c.fromNormal},to:{position:c.to,normal:c.toNormal}};
 const options={id:line.id,fromNormal:c.fromNormal,toNormal:c.toNormal,
  radiusM:c.radiusM,bendRadiusM:c.bendRadiusM,clearanceM:.002,
  candidateControls:controls,otherRoutes:routes,maxAttempts:0,maxGridNodes:0};
 const result=planElectricalRoute(c.from,c.to,options);
 assert(result.ok&&result.constructionHintAccepted,
  'The ordinary planner admits the proposal with its neighboring corridor proposals');
 const midpoint=controls[3].map((v,k)=>(v+controls[4][k])/2),box={
  id:'actual-roof-obstruction',type:'box',min:midpoint.map(v=>v-.03),
  max:midpoint.map(v=>v+.03)};
 const rejected=planElectricalRoute(c.from,c.to,{...options,obstacles:[box]});
 assert(!rejected.constructionHintAccepted&&!auditRoutes([row],[box]).ok,
  'A real obstructing solid rejects the hint');
 const crossing={id:'occupied-roof-cable',radiusM:.004,
  points:[midpoint.map((v,k)=>v-(k===1?.04:0)),
   midpoint.map((v,k)=>v+(k===1?.04:0))]};
 assert(!planElectricalRoute(c.from,c.to,{...options,
  otherRoutes:[...routes,crossing]}).constructionHintAccepted,
  'A physical neighboring cable also rejects the hint');
 routes.push(row);

 assert.equal(call({...h,input:{referenceCenterId:'redwire'} }),null);
 assert.equal(call({...h,architectureFamilyId:'redwire-platform'}),null);
 assert.equal(call({...h,bodyHeightM:h.bodyHeightM+.01}),null);
 assert.equal(call(h,{familyId:'protected-core'}),null);
 assert.equal(call(h,layout,{...line,id:'D-L2-S2/0'}),null);
 assert.equal(call(h,layout,{...line,radiusM:c.radiusM+.001}),null);
 assert.equal(call(h,layout,{...line,bendRadiusM:c.bendRadiusM+.01}),null);
 assert.equal(call(h,layout,{...line,toEscape:{}}),null);
 assert.equal(call(h,layout,{...line,fromPortal:{}}),null);
 assert.equal(call(h,layout,line,c.from.map((v,k)=>v+(k===0?.001:0))),null);
 assert.equal(call(h,layout,line,c.from,c.to.map((v,k)=>v+(k===2?.001:0))),null);
 assert.equal(call(h,layout,line,c.from,c.to,[0,1,0]),null);
 assert.equal(call(h,layout,line,c.from,c.to,c.fromNormal,[0,1,0]),null);
 assert.equal(call(h,layout,line,c.from,c.to,c.fromNormal,c.toNormal,[[0,0,0]]),null);
 const withdrawn=makeLine(c);withdrawn.r.to.plug.position.z=.001;
 assert.equal(call(h,layout,withdrawn),null);
 const wrongPort=makeLine(c);wrongPort.r.spec.fromPortId+='-other';
 assert.equal(call(h,layout,wrongPort),null);
 const changedStroke=makeLine(c);changedStroke.r.from.matingTravel=.05;
 assert.equal(call(h,layout,changedStroke),null);
}
const audit=auditRoutes(routes,[],{maxIssues:5});assert(audit.ok,JSON.stringify(audit.issues));
console.log('PASS Starmind interior routes: four full-radius paths, 45 mm plug straights, '+
 'body containment, pair/self clearance, ordinary obstruction rejection and exact guards.');
