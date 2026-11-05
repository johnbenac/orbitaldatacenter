import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {sizeDesign,missionStarter} from './dist/design.js';
import {propulsionSectionDrawing} from './dist/propulsion-drawing.js';
import {makeCraft} from './dist/craft.js';
import {makeLaunch} from './dist/launch-scene.js';
// Only procedural texture painting needs a DOM. The audit reads the actual flight geometry buffers.
const g=new Proxy({},{get:(_,key)=>['createLinearGradient','createRadialGradient'].includes(key)?()=>({addColorStop(){}}):()=>{},set:()=>true});
globalThis.document={createElement:()=>({width:512,height:256,getContext:()=>g})};
const V=()=>new T.Vector3(), h=sizeDesign({}),craft=makeCraft(h),launch=makeLaunch(h), closed=new Set(craft.walls.map(m=>m.geometry));
const geoms=new Map(),a=V(),b=V(),c=V(),m=V(),n=V(),normal=V();let checked=0,poles=0,meshes=0;
for(const root of [craft.root,launch.root]){root.updateMatrixWorld(true);root.traverse(o=>{if(!o.isMesh)return;meshes++;assert(o.matrixWorld.determinant()>0);geoms.set(o.geometry,o.name||o.userData.part||o.parent.userData.part);if(o.name==='Closed reflector shell')closed.add(o.geometry);});}
for(const [geo,name] of geoms){
 const p=geo.attributes.position,no=geo.attributes.normal,idx=geo.index,edges=new Map();let volume=0;
 for(let i=0;i<(idx?.count??p.count);i+=3){
  const ids=[0,1,2].map(k=>idx?idx.getX(i+k):i+k);[a,b,c].forEach((v,k)=>v.fromBufferAttribute(p,ids[k]));assert([a,b,c].every(v=>Number.isFinite(v.x+v.y+v.z)));
  normal.subVectors(b,a).cross(m.subVectors(c,a));if(normal.lengthSq()<1e-21){poles++;continue;}
  n.set(0,0,0);ids.forEach(j=>n.add(m.fromBufferAttribute(no,j)));assert(normal.dot(n)>-1e-10,'Winding differs from normals: '+geo.type+' '+name+' triangle '+i/3);checked++;
  if(closed.has(geo)){volume+=a.dot(m.crossVectors(b,c))/6;const ids=[a,b,c].map(v=>v.toArray().map(x=>Math.round(x*1e6)).join(','));for(let k=0;k<3;k++){const e=ids[k],f=ids[(k+1)%3],key=[e,f].sort().join('/'),v=edges.get(key)||[0,0];v[0]++;v[1]+=e<f?1:-1;edges.set(key,v);}}
 }
 if(closed.has(geo)){assert(volume>0,'Negative closed volume '+name);for(const [key,[degree,dir]]of edges){assert.equal(degree,2,'Nonmanifold edge '+name+' '+key);assert.equal(dir,0,'Incorrect edge winding '+name);}}
}
assert.equal(poles,0);assert.equal(closed.size,7);assert.equal(craft.walls.length,6);
for(const wall of craft.walls){const {axis,sign,holes}=wall.userData.wall,dir=V();dir[axis]=sign;assert(new T.Raycaster(dir.clone().multiplyScalar(50),dir.clone().negate()).intersectObject(wall,false).length>0,wall.name);assert.equal(wall.material.side,T.FrontSide);
 for(const hole of holes){const ray=new T.Raycaster(new T.Vector3(hole.u,hole.v,1).applyMatrix4(wall.matrixWorld),dir.clone().negate());assert.equal(ray.intersectObject(wall,false).length,0,wall.name+' aperture');assert(ray.intersectObject(wall,true).length>0,wall.name+' gland');}}
for(const [flightPhase,t]of[['integration',-3200],['pad',-60],['ascent',240],['insertion',560],['commissioning',1050],['operations',7800],['deorbit',90000]]){const f=launch.update({flightPhase,t,altitudeKm:80},flightPhase);assert(Number.isFinite(f.center.length()+f.half)&&f.half>0);}
for(const trays of [4,12,16,26,981]){const variant=makeCraft({...h,trays});assert.equal(variant.trayRows.length,Math.min(28,trays));}
// All six mission builds retain one internal service bay and the paired −Z thrust deck.
for(const purpose of ['text','voice','batch','agents','finetune','pretrain']){
 const hw=sizeDesign(missionStarter(purpose)),bus=makeCraft(hw),spec=hw.propulsion;
 assert.equal(bus.cells.length,2);assert.equal(bus.engines.length,2);assert.equal(bus.plumes.length,2);
 const shelf=bus.internal.position.z-hw.bodyLengthM*bus.internal.scale.z/2;
 assert(Math.abs(shelf-spec.forwardDeckZ)<1e-6);assert(!bus.service.visible);
 for(const tank of spec.tanks){
  const vessel=bus.tankMap[tank.id],shell=vessel.children[0];
  assert.equal(shell.name,tank.id+' pressure vessel');assert(shell.scale.toArray().every(v=>v===tank.radiusM));
  assert(Math.abs(vessel.position.x)+tank.radiusM<hw.bodyWidthM/2);
  assert(Math.abs(vessel.position.z)+tank.radiusM<hw.bodyLengthM/2);
  assert(vessel.position.y-tank.radiusM>-hw.bodyHeightM/2);
  assert(vessel.position.z+tank.radiusM<spec.forwardDeckZ);
 }
 for(const [i,exit] of spec.engines.entries()){
  const engine=bus.engines[i],plume=bus.plumes[i];
  assert.equal(engine.position.x,exit.x);assert.equal(engine.position.z,exit.z);assert.equal(engine.position.y,exit.y);
  assert.equal(plume.parent,engine);assert(!plume.visible);
  assert(exit.z<exit.throatZ&&exit.throatZ< -hw.bodyLengthM/2);
  assert(Math.abs(plume.position.y+plume.scale.y/2)<1e-8,'Plume starts at the nozzle exit');
  assert(bus.walls.find(w=>w.userData.wall.axis==='z'&&w.userData.wall.sign<0).userData.wall.holes.some(q=>q.engine&&Math.abs(q.u+exit.x)<1e-7&&Math.abs(q.v-exit.y)<1e-7));
 }
 const drawing=propulsionSectionDrawing(hw);assert(!/NaN|undefined|Infinity/.test(drawing));assert(drawing.includes('Launch-axis section'));
}
console.log(JSON.stringify({meshes,geometries:geoms.size,checkedTriangles:checked,zeroAreaPoleTriangles:poles,closedSolids:closed.size,shellSides:craft.walls.length,occupiedPorts:craft.walls.reduce((n,w)=>n+w.userData.wall.holes.length,0)}));
