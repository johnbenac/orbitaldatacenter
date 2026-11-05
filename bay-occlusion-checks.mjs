import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {softRenderer} from './dist/software-scene.js';
import {focusHardware} from './dist/hardware-focus.js';
import {thermalSkin} from './dist/thermal-view.js';
import {makeLaunch} from './dist/launch-scene.js';
import {sizeDesign,defaults,applyPreset} from './dist/design.js';
import {launchFleet} from './dist/launch-fleet.js';
import {canvas} from './render-test-canvas.mjs';
globalThis.document={createElement:canvas};
const V=(...v)=>new T.Vector3(...v);
const cv=canvas(),renderer=softRenderer(cv);renderer.setSize(196,132);
const camera=new T.PerspectiveCamera(41,196/132,.07,200),scene=new T.Scene(),stage=new T.Group();
scene.add(stage);
function mesh(parent,geometry,material,name,x,y,z){
 const m=new T.Mesh(geometry,material);m.userData.part=name;m.position.set(x,y,z);parent.add(m);return m;
}
const plane=(size,mat,name,x,y,z)=>mesh(scene,new T.PlaneGeometry(size,size),mat,name,x,y,z);
const roomMaterial=new T.MeshBasicMaterial({color:0x38454c,side:T.DoubleSide});
const wall=plane(24,roomMaterial,'pad',0,0,-2),floor=plane(24,roomMaterial,'pad',0,-1.2,0);floor.rotation.x=-Math.PI/2;
const caseMesh=mesh(stage,new T.BoxGeometry(1.7,2.05,1.5),new T.MeshBasicMaterial({color:0x6b8094}),'fairing',0,0,0);
const payload=mesh(stage,new T.BoxGeometry(.8,1.25,.7),new T.MeshBasicMaterial({color:0xafa55c}),'adapter',0,0,0);
const focus=focusHardware(stage);focus.apply('launch');
assert.equal(payload.material.transparent,false,'Opaque selected equipment must establish its actual depth');
assert.equal(caseMesh.material.depthWrite,false);assert.equal(caseMesh.material.depthTest,true);
function pixels(){renderer.render(scene,camera);return cv.frame.data.slice()}
function changes(a,b){let count=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>12)count++;return count}
function cameraAt(x,y,z){camera.position.set(x,y,z);camera.lookAt(0,0,0);camera.updateMatrixWorld();}
function compareGhost(){caseMesh.visible=false;const without=pixels();caseMesh.visible=true;return changes(pixels(),without)}
for(const p of [[.5,.5,6],[2.1,1.5,5],[-2.1,2.5,5]]){
 cameraAt(...p);
 assert.ok(compareGhost()>700,'Vehicle must contribute visible pixels over the textured-room depth, including the floor');
}
cameraAt(0,.1,6);wall.position.z=3;assert.equal(compareGhost(),0,'A foreground wall must hide the fairing');wall.position.z=-2;
cameraAt(0,-4,3);assert.equal(compareGhost(),0,'The floor must occlude the assembly from below');
focus.clear();focus.destroy();
const near=(v,goal=0)=>assert.ok(Math.abs(v-goal)<1e-5,`Expected ${goal}, measured ${v}`);
const bounds=o=>new T.Box3().setFromObject(o,true);
function named(root,name){const hits=[];root.traverse(o=>{if(o.name===name)hits.push(o)});return hits}
for(const id of Object.keys(launchFleet)){
 const hw=sizeDesign(applyPreset(defaults,'launcher',id)),lv=makeLaunch(hw),parts=lv.parts;
 const paint=focusHardware(parts.stage),thermal=thermalSkin(parts.stage),room=new Map();
 parts.facility.traverse(o=>{if(o.isMesh)room.set(o,o.material)});
 for(const domain of ['prop','power','thermal','launch']){
  paint.apply(domain);for(const [o,m] of room)assert.equal(o.material,m);
 }
 paint.clear();thermal.apply([]);for(const [o,m] of room)assert.equal(o.material,m);thermal.destroy();paint.destroy();
 for(const t of [-3599,-2150,-601]){
  lv.update({t,flightPhase:'integration',altitudeKm:0},'integration',{phase:'D',domain:'launch'});
  lv.root.updateMatrixWorld(true);
  const top=bounds(parts.facility.getObjectByName('Adapter bearing plate')).max.y;
  const adapter=parts.payload.children.find(o=>o.isMesh&&o.userData.part==='adapter');
  near(bounds(adapter).min.y,top);
  const standFloor=bounds(parts.facility.children.find(o=>o.geometry?.type==='PlaneGeometry')).min.y;
  const support=parts.facility.getObjectByName('Adapter bearing plate'),cells=named(parts.facility,'Pedestal load cell');
  assert.equal(cells.length,4);for(const cell of cells)near(bounds(cell).max.y,bounds(support).min.y);
  const rim=hw.fairing.outerDiameterM*.5*hw.fairing.profile[0][1]/Math.max(...hw.fairing.profile.map(r=>r[1]));
  const star=id==='starship',name=star?'Cargo mock-up rim shoe':'Fairing rim shoe';
  const shoes=named(parts.facility,name);
  assert.equal(shoes.length,star?4:6,id);
  const shellParts=star?[parts.shell]:parts.shell.children.filter(o=>o.userData.halfSide);
  for(const shoe of shoes){
   const p=shoe.getWorldPosition(V()),shell=shellParts.find(o=>star||o.userData.halfSide===Math.sign(shoe.position.x));
   assert.ok(shell);const pt=shell.worldToLocal(V(p.x,bounds(shoe).max.y,p.z));
   near(pt.y);near(Math.hypot(pt.x,pt.z),rim);
   assert.ok(bounds(shoe).min.y>standFloor);
  }
 }
}
// Use the actual fairing halves and the flight bay. A ghost must alter pixels
// occupied by the OPAQUE room, rather than just pixels with sky behind them.
const bay=makeLaunch(sizeDesign(defaults)),hall=new T.Scene();hall.add(bay.root);
const view=bay.update({t:-2580,flightPhase:'integration',altitudeKm:0},'integration',{phase:'D',domain:'launch'});
const isolation=focusHardware(bay.parts.stage);isolation.apply('launch');
const small=canvas(),raster=softRenderer(small);raster.setSize(300,210);
const eye=new T.PerspectiveCamera(34,300/210,.07,500);
const paint=()=>{raster.render(hall,eye);return small.frame.data.slice()};
const results=[];
for(const az of [.46,.86,-.5]){
 const el=.3,dir=V(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el));
 eye.position.copy(view.center).addScaledVector(dir,view.half/Math.tan(17*Math.PI/180));eye.lookAt(view.center);eye.updateMatrixWorld();
 bay.bay.setViewFrom(eye);bay.parts.stage.visible=false;const room=paint();
 bay.parts.stage.visible=true;bay.parts.shell.visible=false;const open=paint();
 bay.parts.shell.visible=true;const closed=paint();let visible=0;
 for(let p=0;p<room.length;p+=4)if(room[p+3]>250&&Math.max(...[0,1,2].map(k=>Math.abs(open[p+k]-closed[p+k])))>10)visible++;
 assert.ok(visible>500,'Too few ghost-shell pixels visible against the opaque room: '+visible);results.push(visible);
}
isolation.destroy();
console.log('Full bay at 300×210, shell pixels over opaque room geometry at three azimuths: '+results.join(' / ')+'.');
console.log('Ghosted shell blends over room depth at three viewing angles. Foreground wall and floor fully occlude it. Native facility materials, adapter, load cells and fairing shoes verified for ten launch configurations at three integration instants.');
