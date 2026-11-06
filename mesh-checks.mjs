import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as T from './dist/vendor/three.module.js';
import {sizeDesign,missionStarter,applyPreset,defaults} from './dist/design.js';
import {launchClockFor} from './dist/launch-effects-state.js';
import {launchFleet} from './dist/launch-fleet.js';
import {propulsionSectionDrawing} from './dist/propulsion-drawing.js';
import {makeCraft} from './dist/craft.js';
import {makeLaunch} from './dist/launch-scene.js';
// Only procedural texture painting needs a DOM. The audit reads the actual flight geometry buffers.
const g=new Proxy({},{get:(_,key)=>['createLinearGradient','createRadialGradient'].includes(key)?()=>({addColorStop(){}}):()=>{},set:()=>true});
globalThis.document={createElement:()=>({width:512,height:256,getContext:()=>g})};
const V=()=>new T.Vector3(), h=sizeDesign({}),craft=makeCraft(h),launch=makeLaunch(h), closed=new Set(craft.walls.map(m=>m.geometry));
const geoms=new Map(),a=V(),b=V(),c=V(),m=V(),n=V(),normal=V();let checked=0,poles=0,meshes=0;
function addMeshes(root,description){
 root.updateMatrixWorld(true);root.traverse(o=>{
  if(!o.isMesh)return;
  meshes++;const name=description+' · '+(o.name||o.userData.part||o.parent.userData.part||o.geometry.type);
  assert(o.matrixWorld.determinant()>0,'Reflected or singular mesh '+name);
  geoms.set(o.geometry,name);
  if(o.name==='Closed reflector shell')closed.add(o.geometry);
 });
}
// Cast against the actual front-side flight meshes. Winding and a normal can
// agree on every triangle of a one-sided shell yet its inside is invisible.
function auditStarshipHull(model){
 const {shell}=model.parts,door=shell.getObjectByName('Retained cargo door'),clock=launchClockFor('starship');
 const hull=[],leaf=[];shell.traverse(o=>{
  if(o.isMesh&&/^(Fixed cargo shell|Fixed nose crown|Leeward plug door)( liner)?$/.test(o.name)){
   assert.equal(o.material.side,T.FrontSide,o.name);assert(!o.material.transparent&&o.material.depthWrite,o.name);
   hull.push(o);if(o.name.startsWith('Leeward plug door'))leaf.push(o);
  }
 });
 assert(hull.length>leaf.length&&leaf.length===2);
 const pose=(t,phase)=>{model.update({t,flightPhase:phase,altitudeKm:phase==='ascent'?80:550},phase,{phase:'D',domain:'launcher'});model.root.updateMatrixWorld(true)};
 const hits=(origin,direction,target)=>new T.Raycaster(origin,direction,0,15).intersectObjects(target,false);
 function probe(frame,y,theta,target,closed=true){
  const center=frame.localToWorld(new T.Vector3(0,y,0)),normal=new T.Vector3(Math.sin(theta),0,Math.cos(theta)).transformDirection(frame.matrixWorld);
  const far=center.clone().addScaledVector(normal,9);
  const inside=hits(center,normal,target),outside=hits(far,normal.clone().negate(),target);
  if(!closed){assert(!inside.some(h=>h.distance<5)&&!outside.some(h=>h.distance>4&&h.distance<6),'An open hatch obstructs its own aperture');return;}
  assert(inside.length&&outside.length,'Missing inner or outer surface at y='+y+' theta='+theta);
  const thick=9-outside[0].distance-inside[0].distance;
  assert(thick>.040&&thick<.085,'Finite opaque wall thickness at y='+y+' theta='+theta+': '+thick);
 }
 for(const [t,state] of [[clock.doorOpen,'closed'],[clock.hatchClear+.1,'open'],[clock.hatchLatched+.1,'closed'],[clock.hatchClear+.1,'open']]){
  pose(t,'insertion');
  for(const y of [3.25,8.25,12.65]){
   for(const angle of [.21,1.48,2.97])probe(shell,y,angle,hull);
   probe(shell,y,Math.PI*1.5+.013,hull,state==='closed');
   // Moving door faces use its own local coordinate frame at every position.
   probe(door.getObjectByName('Cargo door skin'),y,Math.PI*1.5+.013,leaf);
  }
  for(const angle of [.21,1.48,2.97,4.63])probe(shell,17.15,angle,hull);
  const cap=shell.getObjectByName('Fixed nose tip cap'),axis=new T.Vector3(0,1,0).transformDirection(shell.matrixWorld);
  assert(cap,'Solid nose cap');
  assert(hits(shell.localToWorld(new T.Vector3(.004,22,.003)),axis,[cap]).length,'Open axial sightline through nose');
  assert(hits(shell.localToWorld(new T.Vector3(.004,31,.003)),axis.negate(),[cap]).length,'Nose cap exterior');
 }
}
function auditHalfShells(model,id){
 const split=launchClockFor(id).fairingJettison,halves=model.parts.shell.children.filter(o=>o.userData.halfSide);
 assert.equal(halves.length,2,id);
 for(const t of [split-1,split+13]){
  model.update({t,flightPhase:'ascent',altitudeKm:70},'ascent',{phase:'D',domain:'launcher'});model.root.updateMatrixWorld(true);
  for(const half of halves){
   const outer=half.getObjectByName('Fairing half shell'),liner=half.getObjectByName('Fairing interior liner');
   const a=new T.Vector3(.98*half.userData.halfSide,0,.15).normalize().transformDirection(half.matrixWorld);
   const eye=half.localToWorld(new T.Vector3(0,1.1,0));
   const near=new T.Raycaster(eye,a).intersectObject(liner,false)[0];
   const far=new T.Raycaster(eye.clone().addScaledVector(a,20),a.negate()).intersectObject(outer,false)[0];
   assert(near&&far,id+' missing inner or outer fairing face at '+t);
   assert(20-far.distance-near.distance>.01,id+' split fairing should have material thickness');
  }
 }
}
addMeshes(craft.root,'Reference spacecraft');
for(const id of Object.keys(launchFleet)){
 const model=id===h.input.launcher?launch:makeLaunch(sizeDesign(applyPreset(defaults,'launcher',id)));
 addMeshes(model.root,id);if(id==='starship')auditStarshipHull(model);else auditHalfShells(model,id);
}
for(const [geo,name] of geoms){
 const p=geo.attributes.position,no=geo.attributes.normal,idx=geo.index,edges=new Map();let volume=0;
 assert(no&&no.count===p.count,'Missing vertex normals '+name);
 for(let i=0;i<no.count;i++){
  const len=n.fromBufferAttribute(no,i).length();assert(Math.abs(1-len)<1e-4,'Non-unit vertex normal '+name+' '+i+' length '+len);
 }
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
for(const trays of [4,12,16,26,981]){const build=sizeDesign({...h.input,trayCount:trays}),variant=makeCraft(build);assert.equal(variant.trayRows.length,trays);assert.deepEqual(variant.trayRows,build.rackLayout.slots);}
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
const audit={launcherVariants:Object.keys(launchFleet).length,meshes,geometries:geoms.size,checkedTriangles:checked,zeroAreaPoleTriangles:poles,closedSolids:closed.size,shellSides:craft.walls.length,occupiedPorts:craft.walls.reduce((n,w)=>n+w.userData.wall.holes.length,0)};
if(process.argv.includes('--write'))writeFileSync(new URL('./dist/surface-audit.js',import.meta.url),'// Reproduce using node mesh-checks.mjs --write.\nexport const surfaceAudit='+JSON.stringify(audit,null,2)+';\n');
console.log(JSON.stringify(audit));
