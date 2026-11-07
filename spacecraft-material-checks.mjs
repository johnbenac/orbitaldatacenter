import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from './dist/vendor/three.module.js';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign,referenceConfigurationMetadata} from './dist/reference-configurations.js';
import {makeCraft} from './dist/craft.js';
import {buildEquipmentList} from './dist/equipment-list.js';
import {spacecraftMaterials,spacecraftSurfaceAssignments,materialForRole} from './dist/spacecraft-materials.js';
import {thermalSkin} from './dist/thermal-view.js';
import {focusHardware} from './dist/hardware-focus.js';
import {domainSceneSpecs} from './dist/domain-scene.js';
import {softRenderer} from './dist/software-scene.js';
import {canvas} from './render-test-canvas.mjs';

// The flight meshes and their actual UV buffers are audited in Node. Asset
// decoding and asynchronous browser repaint remain part of browser review.
const painter=new Proxy({},{get:(_,key)=>['createLinearGradient','createRadialGradient'].includes(key)?()=>({addColorStop(){}}):()=>{},set:()=>true});
globalThis.document={createElement:()=>({getContext:()=>painter})};
const near=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<2e-5*Math.max(1,Math.abs(expected)),`${label}: ${actual} != ${expected}`);
const manifest=JSON.parse(readFileSync(new URL('./dist/assets/materials/manifest.json',import.meta.url),'utf8'));
assert.equal(Object.keys(manifest.maps).length,Object.keys(spacecraftMaterials).length,'Every library material has a complete texture set');
let assetCount=0;
for(const [id,record] of Object.entries(spacecraftMaterials)){
 assert.deepEqual(record.texture.tileSizeM,manifest.maps[id].tileSizeM,id+' physical texture pitch');
 assert(record.texture.tileSizeM.every(v=>Number.isFinite(v)&&v>0));
 for(const field of ['baseColorUrl','normalUrl','roughnessUrl','previewUrl']){
  const bytes=readFileSync(new URL('./dist/'+record.texture[field],import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'RIFF',id+' '+field);assert.equal(bytes.toString('ascii',8,12),'WEBP',id+' '+field);assetCount++;
 }
}

function checkCraft(h){
 const inputBefore=JSON.stringify(h.input),massBefore=JSON.stringify(h.massLedger),c=makeCraft(h),mel=buildEquipmentList(h),details=spacecraftSurfaceAssignments(h),roles=new Set(details.map(row=>row.role)),parents=new Set(mel.rows.map(row=>row.wbs));
 assert.equal(JSON.stringify(h.input),inputBefore,'Material/render construction does not alter controlled inputs');
 assert.equal(JSON.stringify(h.massLedger),massBefore,'Material/render construction does not add another material mass');
 near(mel.totals.launchKg,h.launchKg,'MEL launch mass closure');
 for(const row of details){assert(parents.has(row.parentWbs),row.id+' parent exists');assert.equal(row.massAccounting,'included-in-parent');assert(spacecraftMaterials[row.materialId]);assert(row.evidence.status&&row.evidence.basis);}
 assert.equal(c.root.userData.materialCoverage.unassigned,0,'Every physical mesh is assigned or explicitly an engineering graphic');
 c.root.traverse(o=>{
  if(!o.isMesh||o.userData.physicalMaterial===false)return;
  assert(roles.has(o.userData.materialRole),'Visible role lacks an active MEL detail: '+o.userData.materialRole);
  assert.equal(o.userData.materialId,materialForRole(h,o.userData.materialRole));
  assert.equal(o.userData.textureId,spacecraftMaterials[o.userData.materialId].textureId);
  if(o.geometry.attributes.uv)for(const n of o.geometry.attributes.uv.array)assert(Number.isFinite(n)&&Math.abs(n)<1e6,'Finite, bounded surface UVs across repeated builds');
 });
 return c;
}

let designs=0;
for(const id of Object.keys(referenceConfigurationMetadata))for(const communicationsPackage of ['full','optical-ttc','optical-only']){
 const h=sizeDesign({...buildReferenceDesign(id),communicationsPackage}),c=checkCraft(h);designs++;
 if(communicationsPackage!=='full')assert.equal(c.root.userData.materialCoverage.byRole['rf-reflector'],undefined,'No phantom Ka reflector material with Ka removed');
 if(communicationsPackage==='optical-only')assert.equal(c.root.userData.materialCoverage.byRole['rf-radome'],undefined,'No phantom S-band dielectric with the patches removed');
 // A cell or blanket tile retains the same physical pitch throughout payout.
 for(const progress of [.3,.7,1]){
  c.positionPanels(progress);
  for(const wing of c.wings)for(const face of [wing.front,wing.back]){
   const uv=face.geometry.attributes.uv,tile=face.material.userData.textureTileM;
   const us=Array.from({length:uv.count},(_,i)=>uv.getX(i)),vs=Array.from({length:uv.count},(_,i)=>uv.getY(i));
   near((Math.max(...us)-Math.min(...us))*tile[0],face.geometry.parameters.width*face.parent.scale.x,'Payout texture span');
   near((Math.max(...vs)-Math.min(...vs))*tile[1],face.geometry.parameters.height,'Blanket texture depth');
  }
 }
}
const legacy=sizeDesign(buildReferenceDesign('redwire-8kw',{revision:'odc-study-2026-11-r1'}));checkCraft(legacy);designs++;

// Rebuilds must not rescale, corrupt, or dispose a previously drawn craft's
// shared source UVs. This catches BufferGeometry.clone's shared userData trap.
const stable=checkCraft(sizeDesign(buildReferenceDesign('redwire-8kw'))),uvs=[];
stable.root.traverse(o=>{if(o.isMesh&&o.geometry.attributes.uv)uvs.push([o.geometry.attributes.uv,Float32Array.from(o.geometry.attributes.uv.array)]);});
for(let i=0;i<5;i++)checkCraft(sizeDesign(buildReferenceDesign(i%2?'starcloud-3':'starmind-ai1')));
for(const [attribute,before] of uvs)assert.deepEqual(attribute.array,before,'Another spacecraft cannot mutate this spacecraft UV buffer');

for(const pv of ['silicon','multijunction'])for(const coating of ['osr','paint']){
 const c=checkCraft(sizeDesign({...buildReferenceDesign('redwire-8kw'),pv,coating}));
 assert.equal(c.wings[0].front.userData.materialId,pv==='silicon'?'pv-silicon':'pv-multijunction');
 const finishes=[];c.root.traverse(o=>{if(o.userData.materialRole==='radiator-finish')finishes.push(o.userData.materialId);});
 assert(finishes.length>0);assert(finishes.every(id=>id===(coating==='paint'?'radiator-white-paint':'radiator-osr')),'Finish follows the active model selection');
}

// Domain emphasis and temperature overlays restore the exact source-linked
// materials, rather than leaving a diagnostic tint behind on the spacecraft.
const originals=new Map();stable.root.traverse(o=>{if(o.isMesh||o.isLine)originals.set(o,o.material);});
const focus=focusHardware(stable.root);
for(const id of Object.keys(domainSceneSpecs)){focus.apply(id);focus.clear();for(const [o,m] of originals)assert.equal(o.material,m,'Focus restoration');}
focus.destroy();
const thermal=thermalSkin(stable.root),nodes=new Set();stable.root.traverse(o=>{if(o.userData.thermalNode)nodes.add(o.userData.thermalNode);});
thermal.apply([...nodes].map(id=>({id,temperatureK:300,status:'normal'})));
assert([...originals].some(([o,m])=>o.material!==m),'Thermal overlay actually overrides a surface');
thermal.clear();for(const [o,m] of originals)assert.equal(o.material,m,'Thermal restoration');thermal.destroy();
// Display camera changes do not rewrite the native physical texture coordinates.
const camera=new T.PerspectiveCamera(34,1,.1,10000),before=Float32Array.from(stable.wings[0].front.geometry.attributes.uv.array);
camera.zoom=4;camera.position.set(200,-30,90);camera.updateProjectionMatrix();stable.root.updateMatrixWorld(true);
assert.deepEqual(stable.wings[0].front.geometry.attributes.uv.array,before,'Camera zoom does not change cell size on the blanket');

// Exercise the actual Canvas fallback with ordinary ImageLoader-style Texture,
// not only CanvasTexture. This catches a white multiplier without a usable map,
// image replacement caching, UV wrapping and metals washed out by studio fills.
globalThis.document={createElement:()=>canvas()};
const output=canvas(),software=softRenderer(output);software.setSize(64,64);
const scene=new T.Scene(),view=new T.OrthographicCamera(-1,1,1,-1,.1,50);view.position.z=2;view.lookAt(0,0,0);view.updateProjectionMatrix();
scene.userData.exposureEV=0;scene.userData.lightState={ambient:.355,direct:1.12,sun:new T.Vector3(.4,.5,1).normalize(),rim:.1,rimDirection:new T.Vector3(-1,.3,.4).normalize(),softbox:new T.Vector3(-.65,.78,1).normalize(),bounce:new T.Vector3(.82,.1,.55).normalize()};
function tile(left,right=left){const source=canvas();source.width=source.height=2;source.getContext('2d').putImageData({width:2,height:2,data:new Uint8ClampedArray([...left,255,...right,255,...left,255,...right,255])});return source;}
const ordinary=new T.Texture(tile([184,135,56],[48,53,57]));ordinary.colorSpace=T.SRGBColorSpace;ordinary.wrapS=ordinary.wrapT=T.RepeatWrapping;ordinary.magFilter=T.NearestFilter;
const displayMat=new T.MeshStandardMaterial({color:'#ffffff',metalness:.58,roughness:.48,map:ordinary,side:T.DoubleSide});displayMat.userData={materialId:'mli-aluminized-polyimide',materialFallbackColor:new T.Color('#b88738')};
const sample=new T.Mesh(new T.PlaneGeometry(2,2),displayMat);scene.add(sample);for(let i=0;i<4;i++)sample.geometry.attributes.uv.setX(i,sample.geometry.attributes.uv.getX(i)*2);
const pixel=x=>Array.from(output.frame.data.slice(4*(32*64+x),4*(32*64+x)+3));
software.render(scene,view);assert(pixel(6)[0]>pixel(6)[2]+35&&pixel(38)[0]>pixel(38)[2]+35,'Ordinary Texture base color and physical UV repeats remain visible');assert(pixel(22)[0]<pixel(6)[0]-40,'Dark composite stays distinct from amber film');
ordinary.image=tile([20,110,45]);ordinary.needsUpdate=true;software.render(scene,view);assert(pixel(6)[1]>pixel(6)[0]+30,'Replacing a decoded image updates the fallback texture cache');
ordinary.image=null;ordinary.needsUpdate=true;displayMat.userData.materialFallbackColor=new T.Color('#192d4b');software.render(scene,view);assert(pixel(32)[2]>pixel(32)[0]+20&&pixel(32)[0]<150,'Missing texture preserves the catalog color instead of the white multiplier');
ordinary.image=tile([193,200,204]);ordinary.needsUpdate=true;displayMat.metalness=.70;displayMat.roughness=.55;software.render(scene,view);const aluminum=pixel(32);
ordinary.image=tile([231,232,225]);ordinary.needsUpdate=true;displayMat.metalness=0;displayMat.roughness=.94;software.render(scene,view);const coating=pixel(32);
assert(coating[0]-aluminum[0]>15,'Studio software shading distinguishes satin aluminum from white paint');
software.dispose();sample.geometry.dispose();displayMat.dispose();ordinary.dispose();
console.log(`${Object.keys(spacecraftMaterials).length} materials / ${assetCount} texture files; ${designs} reference/package builds including legacy; mass-safe MEL details, no phantom RF finishes, fixed payout pitch, repeated-build UV isolation, selected finishes, exact diagnostic restoration and Canvas image/repeat/material fallback passed. Studio aluminum ${aluminum.join('/')} versus white coating ${coating.join('/')}.`);
