// Local feedthrough selection must match the original exhaustive solid query.
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {fluidPhysicalMeshes,locateFluidFeedthrough,fluidRoutingDiagnostics}
 from './dist/flight-fluid-routing.js';
import {obstacleFromMesh,routeClearance,routingAuditDiagnostics} from './dist/routing-audit.js';

const material=new T.MeshBasicMaterial(),defaults={axis:1,sign:1,
 positionM:[0,1,0],dimensionsM:[2,2,2],radiusM:.045};
function exhaustive(root,options){
 const {axis,sign,positionM,dimensionsM,radiusM,ignoreRoot=null}=options;
 root.updateWorldMatrix(true,true);
 const [u,v]=axis===0?[2,1]:axis===1?[0,2]:[0,1];
 const inside=mesh=>{for(let p=mesh;p;p=p.parent)if(p===ignoreRoot)return true;return false;};
 const cuttable=mesh=>{
  if(!mesh.userData.routingPanelId&&!mesh.userData.routingWallId)return false;
  const n=new T.Vector3(0,0,1).applyQuaternion(mesh.getWorldQuaternion(new T.Quaternion()));
  const p=root.worldToLocal(mesh.getWorldPosition(new T.Vector3()));
  return Math.abs(n.getComponent(axis))>.999&&Math.abs(p.getComponent(axis)-sign*dimensionsM[axis]/2)<.10;
 };
 const obstacles=fluidPhysicalMeshes(root).filter(m=>!inside(m)&&!cuttable(m))
  .map(mesh=>obstacleFromMesh(mesh,{id:mesh.uuid}));
 for(const du of [0,-.12,.12,-.24,.24,-.36,.36])for(const dv of [0,-.12,.12,-.24,.24,-.36,.36]){
  const point=[...positionM];point[u]+=du;point[v]+=dv;
  if(Math.abs(point[u])>dimensionsM[u]*.42||Math.abs(point[v])>dimensionsM[v]*.42)continue;
  const a=[...point],b=[...point];a[axis]-=sign*.14;b[axis]+=sign*.14;
  if(routeClearance({id:'feedthrough-accommodation',points:[a,b],radiusM},obstacles).ok)return point;
 }
 throw Error('No clear fluid feedthrough station near '+positionM.join(','));
}
function fixture(){
 const root=new T.Group();
 for(let i=0;i<48;i++){
  const mesh=new T.Mesh(new T.BoxGeometry(.08,.08,.08),material);
  mesh.position.set(5+i*.2,-3,2);root.add(mesh);
 }
 return root;
}
function add(root,geometry,position=[0,1,0]){
 const mesh=new T.Mesh(geometry,material);mesh.position.set(...position);root.add(mesh);return mesh;
}
const outcome=run=>{try{return {point:run()};}catch(error){return {error:error.message};}};
let cases=0,exactQueries=0;
function compare(root,options={},bounded=true){
 options={...defaults,...options};const expected=outcome(()=>exhaustive(root,options));
 let calls=0,scope=false,started,ended;
 fluidRoutingDiagnostics.onFeedthroughStart=record=>{assert(!scope);scope=true;started=record;};
 fluidRoutingDiagnostics.onFeedthroughEnd=record=>{assert(scope);scope=false;ended=record;};
 routingAuditDiagnostics.onObstacleFromMesh=()=>{assert(scope,'Extraction stays inside the local query');calls++;};
 let actual;
 try{actual=outcome(()=>locateFluidFeedthrough(root,options));}
 finally{
  fluidRoutingDiagnostics.onFeedthroughStart=null;fluidRoutingDiagnostics.onFeedthroughEnd=null;
  routingAuditDiagnostics.onObstacleFromMesh=null;
 }
 assert.deepEqual(actual,expected);assert(!scope);assert(started&&ended);
 assert.equal(calls,ended.queriedCandidateCount);
 assert(calls<=ended.candidateMeshCount,'Each relevant mesh is extracted at most once');
 if(bounded)assert(ended.candidateMeshCount<ended.physicalMeshCount,'Far solids stay outside the local query');
 cases++;exactQueries+=calls;return {actual,ended};
}

for(const axis of [0,1,2])for(const sign of [-1,1]){
 const root=fixture(),point=[0,0,0];point[axis]=sign;
 add(root,new T.BoxGeometry(.06,.06,.06),point);
 const {actual,ended}=compare(root,{axis,sign,positionM:point});
 assert.notDeepEqual(actual.point,point,'A real local beam still moves the selected station');
 assert(ended.queriedCandidateCount>0);assert(ended.testedStationCount>1);
}
for(const gap of [-2e-7,-5e-8,0,5e-8,2e-7]){
 const root=fixture();add(root,new T.BoxGeometry(.02,.3,.3),[.055+gap,1,0]);compare(root);
}
{
 const root=fixture();add(root,new T.BoxGeometry(2,.4,2));
 const {actual,ended}=compare(root);assert(actual.error);assert.equal(ended.testedStationCount,49);
 assert.equal(ended.queriedCandidateCount,1,'A rejecting solid is reused across candidate stations');
}
{
 // Edited cylinder buffers still represent the adapter's continuous radial
 // enclosure, even when their polygonal bounding box misses the query.
 const root=fixture(),geometry=new T.CylinderGeometry(.1,.1,.1,3);
 const position=geometry.attributes.position;
 for(let i=0;i<position.count;i++)position.setXYZ(i,1,0,0);
 add(root,geometry);const {actual}=compare(root);assert(actual.error);
}
{
 // Unused vertices contribute to the adapter's conservative capsule when
 // all indexed faces are degenerate. That capsule exceeds the vertex box.
 const root=fixture(),geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute([0,0,0,.2,0,0,0,.2,0],3));
 geometry.setIndex([0,1,1]);add(root,geometry,[.08,.9,0]);
 const {actual,ended}=compare(root);assert.notDeepEqual(actual.point,defaults.positionM);
 assert(ended.queriedCandidateCount>0);
}
{
 const root=fixture(),mesh=add(root,new T.BoxGeometry(.06,.06,.06),[0,1,0]);
 const position=mesh.geometry.attributes.position;
 for(let i=0;i<position.count;i++)position.setX(i,position.getX(i)+2);
 compare(root);const stale=mesh.geometry.boundingBox.clone();
 for(let i=0;i<position.count;i++)position.setX(i,position.getX(i)-2);
 mesh.geometry.boundingBox.copy(stale);
 // Run the optimized query first so the exhaustive adapter cannot refresh
 // this deliberately stale box before the test exercises invalidation.
 assert.notDeepEqual(locateFluidFeedthrough(root,defaults),defaults.positionM);
 compare(root);
}
{
 const root=fixture(),mesh=add(root,new T.CylinderGeometry(.09,.09,.4,7),[.055,1,0]);
 mesh.rotation.set(.4,.2,-.6);mesh.scale.set(1.2,.7,1.2);compare(root);
 const ignored=new T.Group();root.add(ignored);add(ignored,new T.BoxGeometry(2,2,2),[0,1,0]);
 compare(root,{ignoreRoot:ignored});
}
{
 const root=fixture(),instanced=new T.InstancedMesh(new T.BoxGeometry(.1,.1,.1),material,1);
 instanced.position.set(30,30,30);root.add(instanced);const {actual}=compare(root);
 assert.match(actual.error,/Instanced routing obstacles/,'Unsupported solids remain errors even when far away');
}
console.log(`PASS fluid feedthrough broad phase: ${cases} exhaustive-parity cases, `+
 `${exactQueries} required local extractions, bounded selection and cache invalidation.`);
