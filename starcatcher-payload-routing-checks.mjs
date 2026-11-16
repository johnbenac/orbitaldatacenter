// Bounded checks of the complete body-fixed payload paths. This exercises the
// current endpoint geometry without constructing the full vehicle or claiming
// qualification of plumbing, deployment or connector withdrawal.
import assert from 'node:assert/strict';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {
 buildElectricalArchitecture,electricalCircuitExitPose,installedLinePlanningAssessment
} from './dist/electrical-architecture.js';
import {allocateStarcatcherPayloadRoutes} from './dist/starcatcher-payload-routing.js';
import {inspectPcduPayloadComb} from './dist/pcdu-routing-comb.js';
import {routeLength} from './dist/connection-routes.js';
import {auditRoutes,routeClearance} from './dist/routing-audit.js';

const h=sizeDesign(buildReferenceDesign('star-catcher-self-powered'));
const graph=buildElectricalArchitecture(h),comb=graph.starcatcherHarnessInstallation.comb;
const inputs=graph.harnesses.filter(a=>a.groupId==='payload').flatMap(a=>
 Array.from({length:a.quantity},(_,instance)=>{
  const from=electricalCircuitExitPose(h,graph,a.fromPortId,{instance});
  const to=electricalCircuitExitPose(h,graph,a.toPortId,{instance});
  return {id:a.id+'/'+instance,from:from.cableExitM,to:to.cableExitM,
   fromNormal:from.normal,toNormal:to.normal,radiusM:a.cableDiameterM/2,
   bendRadiusM:a.bendRadiusM};
 }));
const allocation=allocateStarcatcherPayloadRoutes(h,inputs,comb);
assert(allocation.applicable&&allocation.ok,JSON.stringify(allocation.issues));
assert.equal(inputs.length,128,'Every installed compute tray has a physical power feed');
assert.equal(allocation.rows.length,128,'Every physical feed has one complete route');
assert.deepEqual(allocation.rows.map(r=>r.id).sort(),inputs.map(r=>r.id).sort());
assert.equal(new Set(allocation.rows.map(r=>r.id)).size,128);

const close=(a,b,tolerance=1e-9)=>Math.abs(a-b)<=tolerance;
const distance=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]));
const unit=(a,b)=>{const d=distance(a,b);return a.map((v,k)=>(v-b[k])/d);};
const half=[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM].map(v=>v/2);
const wall=Math.max(.018,Math.min(h.bodyWidthM,h.bodyHeightM,h.bodyLengthM)*.024);
const inner=half.map(v=>v-wall);
const shell=[];
for(let axis=0;axis<3;axis++)for(const sign of[-1,1]){
 const min=half.map(v=>-v),max=[...half];
 if(sign<0)max[axis]=-inner[axis];else min[axis]=inner[axis];
 shell.push({id:'body-wall-'+axis+'-'+sign,type:'box',min,max});
}
const routes=allocation.rows.map(row=>{
 const input=inputs.find(i=>i.id===row.id);
 assert.deepEqual(row.points[0],input.from,'The source is its actual connector exit');
 assert.deepEqual(row.points.at(-1),input.to,'The target is its actual connector exit');
 assert(distance(unit(row.points[1],row.points[0]),input.fromNormal)<1e-9);
 assert(distance(unit(row.points.at(-2),row.points.at(-1)),input.toNormal)<1e-9);
 assert(!row.bendLimited&&row.minimumBendRadiusM+1e-9>=input.bendRadiusM);
 assert(close(routeLength(row.points),row.lengthM,1e-10),
  'Each physical cut retains the length of its own complete rendered centreline');
 assert(row.lengthM>distance(input.from,input.to),'A routed cut includes its actual detour');
 assert(distance(row.points[0],row.points[1])>=.045,
  'The source retains the declared plug withdrawal straight');
 assert(distance(row.points.at(-1),row.points.at(-2))>=.045,
  'The target retains the declared plug withdrawal straight');
 for(const point of row.points)assert(point.every((v,k)=>
  Math.abs(v)+row.radiusM+row.clearanceM<inner[k]),
 'The finite cable stays inside the actual inner body envelope');
 return {...row,minBendRadiusM:input.bendRadiusM};
});
assert(new Set(routes.map(r=>r.lengthM.toFixed(6))).size>100,
 'Individual circuits retain their different developed lengths, not a group maximum');
const audit=auditRoutes(routes,shell,{maxIssues:12});
assert(audit.ok,JSON.stringify(audit.issues));

// The final bay retains its two actual middle-column trays.
const sparse=routes.filter(r=>r.laneMetadata.bay===6);
assert.equal(sparse.length,2);
assert(sparse.every(r=>r.laneMetadata.column===1));

// Exercise the same foreign-reservation filtering used before fluid planning.
// Reservations contain each complete finite cable, including its own path;
// only that cable's own reservations may be omitted from its individual screen.
const reservations=routes.flatMap(row=>row.points.slice(1).map((b,i)=>{
 const a=row.points[i],radiusM=row.radiusM+.002;
 return {id:row.id+':mounted:'+i,lineId:row.id,type:'capsule',a,b,radiusM,
  bounds:{min:a.map((v,k)=>Math.min(v,b[k])-radiusM),
   max:a.map((v,k)=>Math.max(v,b[k])+radiusM)}};
}));
const mounted={...comb,issues:[],escapes:routes.map(r=>({id:r.id,points:r.points,
 entryEnd:r.points.at(-1),radiusM:r.radiusM}))};
const reserved=inspectPcduPayloadComb(mounted,shell,reservations,{maxIssues:8});
assert(reserved.ok,JSON.stringify(reserved.issues));
const witness=routes.find(r=>r.laneMetadata.column===2&&r.laneMetadata.bay===2);
const own=reservations.filter(r=>r.lineId===witness.id);
assert(!routeClearance(witness,own).ok,
 'A route would collide with its own reservation if ownership filtering were lost');

// Put real finite material in an otherwise clear long trunk. The mounted
// allocation must fail the same clearance predicate as any searched route.
const segments=witness.points.slice(1).map((p,i)=>({i,length:distance(p,witness.points[i])}));
const longest=segments.sort((a,b)=>b.length-a.length)[0];
const midpoint=witness.points[longest.i].map((v,k)=>
 (v+witness.points[longest.i+1][k])/2);
const obstruction={id:'inserted-payload-trunk-obstruction',type:'box',
 min:midpoint.map(v=>v-.020),max:midpoint.map(v=>v+.020)};
const blocked=auditRoutes([witness],[obstruction],{maxIssues:8});
assert(!blocked.ok&&blocked.issues.some(i=>i.code==='solid-collision'&&
 i.obstacleId===obstruction.id),'Inserted material remains a physical obstruction');
assert(!inspectPcduPayloadComb(mounted,[obstruction],reservations).ok,
 'Complete-route reservation inspection does not waive a foreign solid');

const missing=allocateStarcatcherPayloadRoutes(h,inputs.slice(1),comb);
assert(!missing.ok&&missing.rows.length===0&&missing.issues.length,
 'An incomplete physical inventory cannot be installed as a complete payload star');
const wrongNormal=inputs.map((r,i)=>i? r:{...r,toNormal:[0,1,0]});
assert.equal(allocateStarcatcherPayloadRoutes(h,wrongNormal,comb).rows.length,0,
 'A changed connector face is not silently connected using the old topology');
assert.equal(allocateStarcatcherPayloadRoutes({...h,architectureFamilyId:'redwire-platform'},
 inputs,comb).applicable,false,'Other reference families retain their own routing');

// Static route correctness and service qualification are different evidence.
// Mounted rows have no modeled retainer-release/withdrawal sequence, so their
// aggregate planning state stays unassessed even when the static route passes.
const unassessed={mountedPayload:true,serviceWithdrawalAssessment:'unassessed',
 servicePlanningIssues:[{reason:'mounted-service-withdrawal-unassessed',unassessed:true}]};
assert.equal(installedLinePlanningAssessment(unassessed).planningPassed,null);
const staticFailure={...unassessed,planningIssues:[{reason:'solid-collision'}]};
assert.equal(installedLinePlanningAssessment(staticFailure).planningPassed,false,
 'A real static failure remains failed even while withdrawal is unassessed');
const serviceFailure={...unassessed,servicePlanningIssues:[
 ...unassessed.servicePlanningIssues,{reason:'blocked-withdrawal'}]};
assert.equal(installedLinePlanningAssessment(serviceFailure).planningPassed,false);
assert.equal(installedLinePlanningAssessment({}).planningPassed,true,
 'The existing ordinary-route assessment retains its behavior');
assert.equal(installedLinePlanningAssessment({planningIssues:[{}]}).planningPassed,false);

console.log('PASS Starcatcher payload routing: 128 complete finite-radius body paths, '+
 'individual cuts, endpoints, pair/self clearance, owned reservations and obstruction '+
 'negative controls; mounted withdrawal remains explicitly unassessed.');
