import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {canvas} from './render-test-canvas.mjs';
import {sizeDesign,missionStarter} from './dist/design.js';
import {architectureFamilies} from './dist/architecture-families.js';
import {buildPartsCatalog} from './dist/parts-catalog.js';
import {createPartModel} from './dist/part-model.js';
import {buildFlightPartDetail,flightDetailRoles} from './dist/flight-part-detail.js';
import {createDetailKit,refinePrimitiveGeometry,physicalBounds} from './dist/hardware-detail-primitives.js';
globalThis.document={createElement:()=>canvas()};

const triangles=g=>(g?.index?.count||g?.attributes?.position?.count||0)/3;
const geometryList=r=>[r?.geometry,...(r?.group?.children||[]).map(o=>o.geometry)].filter(Boolean);
const cost=r=>geometryList(r).reduce((n,g)=>n+triangles(g),0);
function checkGeometry(g){
 for(const [name,a] of Object.entries(g.attributes))for(const x of a.array)assert(Number.isFinite(x),'finite '+name);
 if(g.index)for(const i of g.index.array)assert(i>=0&&i<g.attributes.position.count,'valid index');
 for(let i=0;i<g.attributes.normal.count;i++){
  const length=new T.Vector3().fromBufferAttribute(g.attributes.normal,i).length();assert(length>.95&&length<1.05,'unit normals');
 }
}
function dispose(r){for(const g of geometryList(r))g.dispose();}
const material=new T.MeshStandardMaterial(),box=new T.Mesh(new T.BoxGeometry(1,1,1),material);box.scale.set(2,.12,.8);
const originalPositions=box.geometry.attributes.position.array.slice(),originalUV=box.geometry.attributes.uv.array.slice();
const rounded=refinePrimitiveGeometry(box,'high');checkGeometry(rounded);assert(triangles(rounded)>triangles(box.geometry));
const originalBounds=physicalBounds(box);rounded.computeBoundingBox();const roundedBounds=rounded.boundingBox.clone().applyMatrix4(new T.Matrix4().makeScale(...box.scale.toArray()));
assert(roundedBounds.min.distanceTo(originalBounds.min)<1e-6&&roundedBounds.max.distanceTo(originalBounds.max)<1e-6,'bevel keeps source envelope');
assert.deepEqual(box.geometry.attributes.position.array,originalPositions);assert.deepEqual(box.geometry.attributes.uv.array,originalUV,'source UVs stay unchanged');
// A physical round fastener must not become an ellipse on a nonuniformly scaled box.
const kit=createDetailKit(box,{tier:'high'});kit.cylinder([0,.061,0],.01,.004,'metal');const detail=kit.finish(),fastener=detail.children[0].geometry;
const b=new T.Box3().setFromBufferAttribute(fastener.attributes.position).applyMatrix4(new T.Matrix4().makeScale(...box.scale.toArray())),size=b.getSize(new T.Vector3());
assert(Math.abs(size.x-size.z)<1e-7&&Math.abs(size.x-.02)<1e-7,'scaled source retains circular bolt');
assert.equal(detail.hardwareDetailSource,box);assert.equal(detail.userData.detailSourceId,box.id);assert.doesNotThrow(()=>JSON.stringify(detail.userData),'detail metadata is serializable');
const nonphysical=new T.Mesh(new T.BoxGeometry(),material);nonphysical.userData={materialRole:'compute-chassis',physicalMaterial:false};assert.equal(buildFlightPartDetail(nonphysical),null);

const rows=[],roles=new Set(),seenGeometryTypes=new Set(),input=missionStarter('text');let selected=0;
for(const family of Object.keys(architectureFamilies)){
 const h=sizeDesign({...input,architectureFamily:family}),snapshot=JSON.stringify(h),model=createPartModel(h,'flight'),catalog=buildPartsCatalog(h);
 model.pose(catalog.byId['flight:02.01']);const samples=new Map();
 model.factory.root.traverse(o=>{if(o.isMesh){const role=o.userData.materialRole,key=role+'/'+o.geometry.type;if(flightDetailRoles.includes(role)&&!samples.has(key))samples.set(key,o);}});
 let highTotal=0,mediumTotal=0,maximumCalls=0;
 for(const [key,source] of samples){
  const geometry=source.geometry,positions=geometry.attributes.position.array.slice(),uv=geometry.attributes.uv?.array.slice(),mat=source.material;
  const high=buildFlightPartDetail(source,{tier:'high'}),medium=buildFlightPartDetail(source,{tier:'medium'});
  assert.equal(source.geometry,geometry,'recipe cannot replace source directly');assert.equal(source.material,mat);assert.deepEqual(geometry.attributes.position.array,positions,'original geometry immutable');if(uv)assert.deepEqual(geometry.attributes.uv.array,uv);
  if(!high)continue;
  for(const g of geometryList(high))checkGeometry(g);
  if(medium)assert(cost(high)>=cost(medium),key+' high detail is at least medium detail');
  high.group?.traverse(o=>{assert.equal(o.userData.hardwareDetail,true);assert.equal(o.hardwareDetailSource,source);assert.doesNotThrow(()=>JSON.stringify(o.userData));});
  assert((high.group?.children.length||0)<=6,key+' bounded material batches');
  highTotal+=cost(high);mediumTotal+=cost(medium);maximumCalls=Math.max(maximumCalls,high.group?.children.length||0);roles.add(source.userData.materialRole);seenGeometryTypes.add(geometry.type);dispose(high);dispose(medium);
 }
 // Every independent, modeled MEL flight page gets at least one applicable
 // close-inspection recipe. Explicit unavailable allocations remain unchanged.
 for(const record of catalog.records.filter(r=>r.category==='flight')){
  model.pose(record);const selection=model.select(record);if(!selection.available)continue;
  let found=false;for(const source of selection.meshes){const result=buildFlightPartDetail(source,{tier:'high'});if(result){found=true;dispose(result);break;}}
  assert(found,family+' detailed page '+record.id);selected++;
 }
 assert.equal(JSON.stringify(h),snapshot,'visual detail never changes analytical design');
 rows.push({family,roleVariants:samples.size,highTriangles:highTotal,mediumTriangles:mediumTotal,maxDrawCalls:maximumCalls});model.dispose();
}
assert(roles.size>=30,'material-specific flight coverage');assert(seenGeometryTypes.has('LatheGeometry'),'dish/nozzle profiles covered');assert(seenGeometryTypes.has('BufferGeometry'),'rack batches covered');

// UV seeds must remain valid when a detailed dynamic cylinder changes length,
// then revert to the lightweight source without changing the deployment pose.
const {createHardwareDetail}=await import('./dist/hardware-detail.js');
const h=sizeDesign(input),model=createPartModel(h,'flight'),catalog=buildPartsCatalog(h),array=catalog.byId['flight:02.01'];
model.pose(array,.4,'deployment');const source=model.factory.wings[0].booms[0],base=source.geometry,baseSeed=source.userData.materialCylinderUV;
const controller=createHardwareDetail(model.factory.root,{family:'flight',hardware:h,gpu:true});controller.prepare({meshes:[source]});assert.notEqual(source.geometry,base,'selected dynamic cylinder is actually refined');
model.pose(array,.7,'deployment');for(const x of source.geometry.attributes.uv.array)assert(Number.isFinite(x),'dynamic replacement UVs remain finite');
const pose={position:source.position.toArray(),scale:source.scale.toArray(),quaternion:source.quaternion.toArray()};controller.clear();assert.equal(source.geometry,base);assert.equal(source.userData.materialCylinderUV,baseSeed);
model.pose(array,.7,'deployment');assert.deepEqual({position:source.position.toArray(),scale:source.scale.toArray(),quaternion:source.quaternion.toArray()},pose,'LOD never changes deployment articulation');
controller.dispose();model.dispose();rounded.dispose();fastener.dispose();box.geometry.dispose();material.dispose();
console.table(rows);console.log(`Flight detail: ${roles.size} material roles, ${selected} modeled part pages across ${rows.length} families; finite geometry, unchanged engineering envelopes/design, bounded draw calls, nonuniform scale, private UVs and animated restore passed.`);
