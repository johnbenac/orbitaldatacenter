// Bounded construction checks. Current vehicle solids, plumbing and the
// complete installed route set are admitted by the native construction pass.
import assert from 'node:assert/strict';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {buildElectricalArchitecture,electricalCircuitExitPose} from './dist/electrical-architecture.js';
import {selectStarcatcherDataRoute,starcatcherDataRouteCandidates,
 retainedStarcatcherDataProposal,starcatcherDataRoutingPolicy} from './dist/starcatcher-data-routing.js';
import {starcatcherServiceRouteHint} from './dist/starcatcher-service-routing.js';
import {roundedConnectionRoute} from './dist/connection-routes.js';
import {auditRoutes,routeClearance} from './dist/routing-audit.js';

const h=sizeDesign(buildReferenceDesign('star-catcher-self-powered'));
const graph=buildElectricalArchitecture(h);
const inputs=graph.harnesses.filter(row=>row.groupId==='fabric').flatMap(row=>
 Array.from({length:row.quantity},(_,instance)=>{
  const from=electricalCircuitExitPose(h,graph,row.fromPortId,{instance}),
   to=electricalCircuitExitPose(h,graph,row.toPortId,{instance});
  return {id:row.id+'/'+instance,from:from.cableExitM,to:to.cableExitM,
   fromNormal:from.normal,toNormal:to.normal,radiusM:row.cableDiameterM/2,
   bendRadiusM:row.bendRadiusM};
 }));
assert.equal(inputs.length,275,'Every declared physical fabric cut is enumerated');
const selected=[],retained=[];
for(const line of inputs){
 const result=selectStarcatcherDataRoute(h,line,line.from,line.to,
  line.fromNormal,line.toNormal);
 if(!result.applicable)continue;
 const controls=retainedStarcatcherDataProposal(line,line.from,line.to,
  line.fromNormal,line.toNormal);
 assert(controls,line.id+' must retain its current default construction proposal');
 const shape=roundedConnectionRoute(controls,line.bendRadiusM),points=shape.points;
 assert(!shape.bendLimited&&shape.minimumBendRadiusM>=line.bendRadiusM-1e-8,
  line.id+' retained construction must preserve its specified bend radius');
 retained.push({id:line.id,points,radiusM:line.radiusM,clearanceM:.002,
  sourceStraightM:Math.hypot(...points[0].map((v,k)=>v-points[1][k])),
  targetStraightM:Math.hypot(...points.at(-1).map((v,k)=>v-points.at(-2)[k])),
  bounds:{min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),
   max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))}});
 assert(result.ok,JSON.stringify(result.diagnostics));
 assert.deepEqual(result.controlPoints[0],line.from);
 assert.deepEqual(result.controlPoints.at(-1),line.to);
 assert(result.minimumBendRadiusM+1e-8>=line.bendRadiusM);
 assert(Math.hypot(...result.points[0].map((v,k)=>v-result.points[1][k]))>=.045-1e-9,
  line.id+' retains the real 45 mm source connector straight');
 assert(Math.hypot(...result.points.at(-1).map((v,k)=>v-result.points.at(-2)[k]))>=.045-1e-9,
  line.id+' retains the real 45 mm destination connector straight');
 assert(result.diagnostics.generated<=starcatcherDataRoutingPolicy.maximumCandidates);
 const route={id:line.id,points:result.points,radiusM:line.radiusM,
  from:{position:line.from,normal:line.fromNormal},
  to:{position:line.to,normal:line.toNormal}};
 assert(auditRoutes([route],[],{maxIssues:1}).ok,
  line.id+' retains both actual approach tangents and self clearance');
 selected.push({line,result,route});
}
assert.equal(selected.length,273,'128 worker, 144 leaf/spine and one recorder cut have proposals');
assert.equal(retained.length,273,'Every default data cut has a guarded retained proposal');
assert.equal(selected.filter(row=>row.line.id.startsWith('D-WORKER-')).length,128);
assert.equal(selected.filter(row=>row.line.id.startsWith('D-L')).length,144);
assert(inputs.filter(line=>!selected.some(row=>row.line.id===line.id))
 .every(line=>['D-ka-1/0','D-optical-1/0'].includes(line.id)),
 'Exterior terminal data runs retain their separate real wall interfaces');

// Validate the saved default construction itself. A selected alternate can
// satisfy the planner while hiding a short terminal lead or crossing in the
// retained proposal that the material schedule and default cache expect.
const minimumStraightM=starcatcherDataRoutingPolicy.minimumTerminalStraightM,
 retainedDefects=retained.flatMap(row=>
  Math.min(row.sourceStraightM,row.targetStraightM)>=minimumStraightM-1e-9?[]:
  [{id:row.id,reason:'short-retained-terminal-straight',requiredM:minimumStraightM,
   sourceStraightM:row.sourceStraightM,targetStraightM:row.targetStraightM}]),
 boundsDistance=(a,b)=>Math.hypot(...[0,1,2].map(k=>
  Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])));
for(let i=0;i<retained.length;i++)for(let j=0;j<i;j++){
 const a=retained[i],b=retained[j],required=a.radiusM+b.radiusM+.002;
 // This exact lower bound skips only pairs whose complete bounds are apart.
 if(boundsDistance(a.bounds,b.bounds)>required)continue;
 const screen=routeClearance(a,[],{otherRoutes:[b],stopAtCollision:false});
 if(!screen.ok)retainedDefects.push({id:a.id,reason:'retained-data-pair-clearance',...screen});
}

// Read both route families from the current production definitions. A material
// screen against these tubes does not establish their mutual cable clearance;
// an earlier worker proposal cleared an obsolete service path, then failed
// after that service path changed. No external route snapshots belong here.
const serviceRoutes=graph.harnesses.filter(spec=>
 /^(P-SVC|C-|RF-|D-ka|D-optical|P-THERMAL)/.test(spec.id)).flatMap(spec=>{
 const polarities=spec.connectorTypeId.startsWith('hv-single')?[-1,1]:[0];
 return Array.from({length:spec.quantity},(_,instance)=>polarities.map((polarity,index)=>{
  const from=electricalCircuitExitPose(h,graph,spec.fromPortId,{instance,polarity}),
   to=electricalCircuitExitPose(h,graph,spec.toPortId,{instance,polarity}),
   seated={plug:{position:{x:0,y:0,z:0}}},
   line={id:spec.id+'/'+(instance*polarities.length+index),
    radiusM:spec.cableDiameterM/2,bendRadiusM:spec.bendRadiusM,
    r:{spec,from:seated,to:seated}},
   controls=starcatcherServiceRouteHint(h,{familyId:h.architectureFamilyId},line,
    from.cableExitM,to.cableExitM,from.normal,to.normal);
  assert(controls,line.id+' must use its current production service proposal');
  const shape=roundedConnectionRoute(controls,line.bendRadiusM);
  assert(!shape.bendLimited&&shape.minimumBendRadiusM>=line.bendRadiusM-1e-8,
   line.id+' retains its specified service cable bend radius');
  return {id:line.id,points:shape.points,radiusM:line.radiusM,clearanceM:.002};
 })).flat();
});
assert.equal(serviceRoutes.length,48,'All current physical service cuts must be reserved');
assert.equal(new Set(serviceRoutes.map(row=>row.id)).size,48);
for(const route of retained){
 const screen=routeClearance(route,[],{otherRoutes:serviceRoutes});
 if(!screen.ok)retainedDefects.push({id:route.id,reason:'retained-service-clearance',...screen});
}
assert.deepEqual(retainedDefects,[],
 'All 273 retained data cuts need full terminal straights, mutual clearance and all 48 services clear');

const {line,result,route}=selected.find(row=>row.line.id==='D-WORKER-1/0');
const block={id:'blocked-real-data-exit',type:'box',
 min:line.from.map(v=>v-.02),max:line.from.map(v=>v+.02)};
assert(!routeClearance(route,[block]).ok);
const solidRejected=selectStarcatcherDataRoute(h,line,line.from,line.to,
 line.fromNormal,line.toNormal,{obstacles:[block],maximumCandidates:4});
assert(solidRejected.applicable&&!solidRejected.ok&&solidRejected.controlPoints===null);
assert.equal(solidRejected.diagnostics.attempted,4);
assert.equal(solidRejected.diagnostics.rejected.solid,4,
 'A bounded search failure never supplies an accepted fallback path');
const occupied={id:'foreign-tube-across-data-exit',radiusM:.012,
 points:[line.from.map((v,k)=>v+(k===0?-.05:k===2?.015:0)),
  line.from.map((v,k)=>v+(k===0?.05:k===2?.015:0))]};
const occupiedRejected=selectStarcatcherDataRoute(h,line,line.from,line.to,
 line.fromNormal,line.toNormal,{otherRoutes:[occupied],maximumCandidates:4});
assert(occupiedRejected.applicable&&!occupiedRejected.ok&&
 occupiedRejected.controlPoints===null);
assert.equal(occupiedRejected.diagnostics.rejected.occupied,4,
 'Every finite foreign tube remains an occupied interval');
assert.deepEqual(starcatcherDataRouteCandidates({...h,architectureFamilyId:'starmind-cross'},
 line,line.from,line.to,line.fromNormal,line.toNormal),[]);
assert.deepEqual(starcatcherDataRouteCandidates(h,{...line,id:'D-WORKER-1/1'},
 line.from,line.to,line.fromNormal,line.toNormal),[]);
assert.deepEqual(starcatcherDataRouteCandidates(h,line,line.from,line.to,
 [1,0,0],line.toNormal),[],'A changed physical source normal invalidates this route family');
assert.deepEqual(result.controlPoints[0],line.from,'Candidate testing does not mutate the interface');
console.log('PASS Starcatcher data proposals: all 273 internal physical cuts, exact endpoints, '+
 'retained full bends and terminal straights, all retained data pairs and 48 service cuts clear, '+
 'bounded in-body corridor proposals, '+
 'finite occupied-solid/tube rejection, '+
 'and configuration/interface guards. Native full-installation admission remains separate.');
