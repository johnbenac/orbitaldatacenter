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
 for(const t of [-3599,-2400,-1920,-1500,-960,-660]){
  lv.update({t,flightPhase:'integration',altitudeKm:0},'integration',{phase:'D',domain:'launcher'});
  lv.root.updateMatrixWorld(true);
  const top=id==='starship'?null:bounds(parts.facility.getObjectByName('Adapter bearing plate')).max.y,ring=parts.fitting.getObjectByName('Carrier attachment ring');
  const passed=hw.payloadInterface.passes,closed=passed&&hw.fairing.fit,layout=lv.bay.layout;
  if(top!=null&&(t<=-1920||!closed))near(bounds(ring).min.y,top);
  const support=parts.facility.getObjectByName('Checkout bearing plate'),cells=named(parts.facility,'Pedestal load cell');
  assert.equal(cells.length,4);for(const cell of cells)near(bounds(cell).max.y,bounds(support).min.y);
  if(t===-3599)near(parts.payload.position.x);else if(t>=(id==='starship'?-1500:-2400)&&closed)near(parts.payload.position.distanceTo(parts.fitting.position));
  if(t===-660&&closed&&id!=='starship'){
   near(parts.shell.position.distanceTo(parts.fitting.position));
   const carrier=lv.geometry.stages===1?parts.lower:parts.upper;
   near(parts.fitting.position.distanceTo(carrier.position));near(parts.fitting.rotation.z,carrier.rotation.z);
  }
  if(id==='starship'){
   assert(parts.upper.visible&&!parts.lower.visible);
   assert.equal(named(parts.upper,'Raptor 3').length,3);assert.equal(named(parts.upper,'Raptor Vacuum').length,3);
   assert.equal(named(parts.facility,'Forward module storage shoe').length,0);
   near(parts.shell.position.distanceTo(parts.upper.position));
   const opened=parts.shell.getObjectByName('Retained cargo door').rotation.y;
   if(closed&&t>=-2400&&t<=-960)assert(opened< -1.8);else near(opened);
   if(t===-1500&&closed)assert(parts.fitting.position.x<layout.receiverX-9);
   if(t===-660&&closed)near(parts.fitting.position.x,layout.receiverX);
  }else if(!layout.wholeCap){
   const shoes=named(parts.facility,'Fairing rim shoe');assert.equal(shoes.length,6);
   if(t<=-1920||!closed){
    const rim=hw.fairing.outerDiameterM*.5*hw.fairing.profile[0][1]/Math.max(...hw.fairing.profile.map(r=>r[1]));
    for(const shoe of shoes){const q=shoe.getWorldPosition(V()),half=parts.shell.children.find(o=>o.userData.halfSide===Math.sign(shoe.position.x));
     const pt=half.worldToLocal(V(q.x,bounds(shoe).max.y,q.z));near(pt.y);near(Math.hypot(pt.x,pt.z),rim);}
   }
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
console.log('Ghosted shell blends over room depth at three viewing angles. Foreground wall and floor fully occlude it. Carrier seating, supported fairings, six Starship engines and loading through the retained hatch checked against the integration clock.');
