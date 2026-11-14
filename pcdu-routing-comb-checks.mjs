import assert from 'node:assert/strict';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {buildElectricalArchitecture,electricalCircuitExitPose} from './dist/electrical-architecture.js';
import {allocatePcduPayloadComb,inspectPcduPayloadComb,pcduPayloadCombPolicy} from './dist/pcdu-routing-comb.js';
import {auditRoutes} from './dist/routing-audit.js';
import {roundedConnectionRoute} from './dist/connection-routes.js';

const h=sizeDesign(buildReferenceDesign('starmind-ai1')),graph=buildElectricalArchitecture(h),lines=[];
for(const a of graph.harnesses.filter(a=>a.id.startsWith('P-PAY-')))for(let i=0;i<a.quantity;i++){
 const pose=electricalCircuitExitPose(h,graph,a.fromPortId,{instance:i});
 lines.push({id:a.id+'/'+i,fromBoxId:a.fromBoxId,from:pose.cableExitM,fromNormal:pose.normal,radiusM:a.cableDiameterM/2,bendRadiusM:a.bendRadiusM});
}
const original=JSON.stringify(lines),comb=allocatePcduPayloadComb(lines,{rackLayout:h.rackLayout});
assert.equal(comb.ok,true,JSON.stringify(comb.issues));assert.equal(comb.active,true);assert.equal(comb.count,128);assert.equal(comb.escapes.length,128);assert.equal(JSON.stringify(lines),original,'A corridor allocation must preserve the actual input datums.');
for(const e of comb.escapes){const line=lines.find(l=>l.id===e.id);assert.deepEqual(e.anchor,line.from);assert.deepEqual(e.fromNormal,line.fromNormal);assert.ok(e.minimumBendRadiusM>=line.bendRadiusM-1e-8);assert.ok(Math.abs(e.entryEnd[2]-e.points.at(-1)[2]-(2.4*line.bendRadiusM+.015))<1e-10);}
assert.equal(inspectPcduPayloadComb(comb,[],[]).ok,true);
assert.ok(comb.corridor&&comb.escapes.every(e=>e.entryEnd[0]-e.radiusM-.002>=comb.corridor.minXM&&e.entryEnd[0]+e.radiusM+.002<=comb.corridor.maxXM),'The complete bundle enters an actual compute-column aisle.');
const noAisle=allocatePcduPayloadComb(lines,{rackLayout:{...h.rackLayout,slotDimensionsM:[h.rackLayout.pitchM[0],...h.rackLayout.slotDimensionsM.slice(1)]}});assert.equal(noAisle.ok,false,'Removing the actual inter-column aisle must block the accommodation.');
const completeReservations=comb.escapes.flatMap(e=>{const points=[...e.points,e.entryEnd],r=e.radiusM+.002;return points.slice(1).map((b,i)=>{const a=points[i];return {id:e.id+':reserved-guide:'+i,lineId:e.id,type:'capsule',a,b,radiusM:r,bounds:{min:a.map((v,k)=>Math.min(v,b[k])-r),max:a.map((v,k)=>Math.max(v,b[k])+r)}};});});
assert.equal(inspectPcduPayloadComb(comb,[],completeReservations).ok,true,'Every other full guide and entry can be reserved simultaneously before fluid routing.');

// Collapsing the departure columns produces real coincident longitudinal
// runs. The validator must catch this despite intact connector endpoints.
const collapsed=comb.escapes.map(e=>{const turn=[e.anchor[0]+.35,e.anchor[1],e.anchor[2]],shape=roundedConnectionRoute([e.anchor,turn,[turn[0],turn[1],comb.exitZ]],e.bendRadiusM);return {id:e.id,points:shape.points,radiusM:e.radiusM};});
assert.equal(auditRoutes(collapsed,[],{maxIssues:1,stopAfterFirstIssue:true}).ok,false);

const e=comb.escapes[0],center=e.entryEnd.map((v,i)=>i===2?v-.025:v),block={id:'future-equipment-in-complete-entry',type:'box',min:center.map(v=>v-.002),max:center.map(v=>v+.002)};
assert.equal(inspectPcduPayloadComb(comb,[block],[]).ok,false,'The straight planning entry after the rounded source guide remains protected.');
const hidden=inspectPcduPayloadComb(comb,[block],[],{maxIssues:0});assert.equal(hidden.ok,false);assert.ok(hidden.issueCount>0);assert.equal(hidden.issues.length,0);

// A source cannot inherit the +X comb when its physical connector actually
// faces elsewhere. The alternate interface needs its own checked allocation.
const rotated=lines.map(l=>({...l,fromNormal:[...l.fromNormal]}));rotated[0].fromNormal=[0,0,-1];assert.equal(allocatePcduPayloadComb(rotated).ok,false);
const invalid=lines.map(l=>({...l}));invalid[0].bendRadiusM=0;assert.equal(allocatePcduPayloadComb(invalid).ok,false);
const inactive=allocatePcduPayloadComb(lines.slice(0,pcduPayloadCombPolicy.minimumCircuits-1));assert.equal(inactive.active,false);assert.equal(inactive.escapes.length,0);

const retained={id:'other-circuit',points:[[center[0]-.04,center[1],center[2]],[center[0]+.04,center[1],center[2]]],radiusM:.004};
assert.equal(inspectPcduPayloadComb(comb,[],[],{otherRoutes:[retained]}).ok,false,'A previously installed circuit cannot be hidden by the comb allocation.');
console.log(JSON.stringify({ok:true,groups:10,physicalPayloadCircuits:comb.count,sourceColumns:comb.sourceColumns.length,pitchM:comb.pitchM,exitZ:comb.exitZ,corridor:comb.corridor,minimumInterlineClearanceM:comb.minimumInterlineClearanceM,scope:'Actual Starmind architecture datums, full bend construction and finite-radius complete-guide/entry separation. The installed factory separately screens every actual solid and terminal reservation.'}));
