import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import * as T from './dist/vendor/three.module.js';
import {applyPreset,defaults,sizeDesign} from './dist/design.js';
import {launchFleet} from './dist/launch-fleet.js';
import {makeLaunch} from './dist/launch-scene.js';
const painter=new Proxy({},{get:(_,key)=>key==='createImageData'?(w,h)=>({data:new Uint8ClampedArray(w*h*4)}):['createLinearGradient','createRadialGradient'].includes(key)?()=>({addColorStop(){}}):()=>{}});
globalThis.document={createElement:()=>({getContext:()=>painter})};
let markings=0;
for(const id of Object.keys(launchFleet)){
 const model=makeLaunch(sizeDesign(applyPreset(defaults,'launcher',id))),seen=[];
 assert(model.root.userData.launchLivery.provider);
 model.root.traverse(o=>{
  const m=o.material;if(!m)return;
  if(m.userData.launchSurface){
   assert.equal(m.map.colorSpace,T.SRGBColorSpace);assert.equal(m.roughnessMap.colorSpace,T.NoColorSpace);assert.equal(m.bumpMap,m.roughnessMap);
  }
  for(const key of ['map','roughnessMap','bumpMap']){
   const file=m[key]?.userData.launchTexture;if(file)assert(existsSync(new URL('./dist/assets/launch-vehicles/'+file,import.meta.url)),file);
  }
  if(!o.userData.launchMarking)return;
  markings++;seen.push(o);assert.equal(o.castShadow,false);assert(o.receiveShadow);
  const p=o.geometry.attributes.position,uv=o.geometry.attributes.uv;
  for(let i=0;i<p.count;i++){assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)));assert(uv.getX(i)>=0&&uv.getX(i)<=1&&uv.getY(i)>=0&&uv.getY(i)<=1);}
  let half=o.parent;while(half&&!half.userData.halfSide)half=half.parent;
  if(half)for(let i=0;i<p.count;i++)assert(p.getX(i)*half.userData.halfSide>0,'Fairing mark must remain on its own half: '+id);
 });
 assert(seen.length>=6,id+' provider markings missing');
 if(id==='ariane64')assert(seen.some(m=>m.name.includes('ArianeGroup'))&&seen.some(m=>m.name.includes('Arianespace')));
 if(id.startsWith('longMarch'))assert(seen.some(m=>m.name.includes('CASC'))&&seen.some(m=>m.name.includes('CALT')));
 if(id==='starship'){
  const marks=seen.filter(m=>m.parent===model.parts.lower),r=model.geometry.diameterM/2;
  for(const m of marks){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)assert(Math.hypot(p.getX(i),p.getZ(i))>r,'Stainless-hull marking must be outside the cylinder');}
 }
}
console.log(`Verified ${markings} conformal markings across ${Object.keys(launchFleet).length} launchers: provider/manufacturer coverage, fairing ownership, source files, physical-material color spaces and stainless-hull decal offset.`);
