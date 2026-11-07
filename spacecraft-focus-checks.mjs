// Check fit geometry and the actual production camera, including free navigation.
// Camera multipliers alone cannot detect a viewport that breathes as arrays turn.
import assert from 'node:assert/strict';
import {Object3D,Quaternion,Vector3} from './dist/vendor/three.module.js';
import {canvas as rasterCanvas} from './render-test-canvas.mjs';
import {sizeDesign} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {referenceCenterOrder} from './dist/reference-centers.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {deploymentLayout,leafCorners,leafPose} from './dist/deployment.js';
import {chassisFitHalfHeight,normalizeSpacecraftFocus,spacecraftFocusAvailable} from './dist/spacecraft-framing.js';
import {createScene} from './dist/scene.js';

const V=(...a)=>new Vector3(...a),close=(a,b,message,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${message}: ${a} != ${b}`);
const samePoint=(a,b,message)=>assert.ok(a.distanceTo(b)<1e-7,message);
function chassisCorners(h,rotation=new Quaternion()){
 const corners=[];
 for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5])corners.push(V(x*h.bodyWidthM,y*h.bodyHeightM,z*h.bodyLengthM).applyQuaternion(rotation));
 return corners;
}
function projectedBounds(points,right,up){
 const x=points.map(p=>p.dot(right)),y=points.map(p=>p.dot(up));
 return {left:Math.min(...x),right:Math.max(...x),bottom:Math.min(...y),top:Math.max(...y)};
}

assert.equal(normalizeSpacecraftFocus(undefined),'core');assert.equal(normalizeSpacecraftFocus('unknown'),'core');
assert.equal(normalizeSpacecraftFocus('entire'),'entire');
for(const camera of ['spacecraft','core','orbit','launch'])assert.equal(spacecraftFocusAvailable(camera,'operations'),camera==='spacecraft');
assert.ok(spacecraftFocusAvailable('spacecraft','commissioning','vehicle'));
for(const lens of ['wing','elbow'])assert.equal(spacecraftFocusAvailable('spacecraft','commissioning',lens),false);

// Independent corner projections cover six different chassis, both viewport
// shapes, tilted cameras and non-identity model rotations. The tight bound also
// rejects accidentally including a solar array or external payload platform.
const hardware=new Map(referenceCenterOrder.map(id=>[id,sizeDesign(buildReferenceDesign(id))]));
for(const [id,h] of hardware)for(const aspect of [16/9,3/4])for(const angle of [0,45,90,180]){
 const cameraTurn=new Quaternion().setFromAxisAngle(V(1,2,3).normalize(),angle*Math.PI/180);
 const right=V(1,0,0).applyQuaternion(cameraTurn),up=V(0,1,0).applyQuaternion(cameraTurn);
 for(const rotation of [new Quaternion(),new Quaternion().setFromAxisAngle(V(2,-1,3).normalize(),.71)]){
  const bounds=projectedBounds(chassisCorners(h,rotation),right,up),half=chassisFitHalfHeight(h,right,up,aspect,rotation);
  const needed=Math.max((bounds.right-bounds.left)/aspect,bounds.top-bounds.bottom)/2;
  assert.ok(half>=needed,`${id}: a chassis corner was clipped`);
  assert.ok(half<=needed*1.17,`${id}: core fit included geometry beyond the chassis padding`);
  close(chassisFitHalfHeight({...h,wingLengthM:h.wingLengthM*100,radiatorLengthM:h.radiatorLengthM*100},right,up,aspect,rotation),half,`${id}: appendage dimensions changed core fit`);
 }
}

class Element{
 constructor(){this.children=[];this.style={};this.events={};this.attributes={};this.dataset={};this.width=256;this.height=144;}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
 getBoundingClientRect(){return {width:this.width,height:this.height,left:0,top:0};}
 getClientRects(){return [this.getBoundingClientRect()];}
 addEventListener(k,f){this.events[k]=f;}
 setAttribute(k,v){this.attributes[k]=String(v);}
 removeEventListener(){} setPointerCapture(){} releasePointerCapture(){} remove(){}
 focus(){document.activeElement=this;}
 toDataURL(){return 'data:image/jpeg;base64,';}
}
function createElement(tag){
 const el=new Element();if(tag!=='canvas')return el;
 const backing=rasterCanvas(),ctx=backing.getContext('2d');
 Object.assign(backing,el);Object.setPrototypeOf(backing,Element.prototype);
 backing.getContext=kind=>kind==='2d'?ctx:null;return backing;
}
globalThis.document={createElement,createElementNS:(_,tag)=>createElement(tag)};
globalThis.ResizeObserver=class{observe(){}disconnect(){}};
globalThis.window={devicePixelRatio:1};
globalThis.fetch=async()=>{throw new Error('Imagery downloads are unnecessary for camera regression');};
let nextFrame=0;const scheduled=new Map();
globalThis.requestAnimationFrame=fn=>{const id=++nextFrame;scheduled.set(id,fn);return id;};
globalThis.cancelAnimationFrame=id=>scheduled.delete(id);

const h=hardware.get('redwire-8kw'),sim=createSimulation(h),base=sim.at(7800),container=new Element(),scene=createScene(container),canvas=container.children[0];
let snapshot=base;
function frame(){
 const lookAt=Object3D.prototype.lookAt;let camera,pivot;
 Object3D.prototype.lookAt=function(target,...args){if(!camera&&this.isCamera){camera=this;pivot=target.clone();}return lookAt.call(this,target,...args);};
 try{
  for(let pass=0;pass<5&&!camera;pass++){
   assert.ok(scheduled.size,'Camera operation did not request a frame');
   const jobs=[...scheduled.values()];scheduled.clear();for(const job of jobs)job();
  }
 }finally{Object3D.prototype.lookAt=lookAt;}
 assert.ok(camera,'No rendered camera was found');
 const eye=camera.position.clone(),radius=eye.distanceTo(pivot);
 return {eye,pivot,radius,height:2*(camera.isPerspectiveCamera?radius:1)/camera.projectionMatrix.elements[5],
  right:V().setFromMatrixColumn(camera.matrixWorld,0),up:V().setFromMatrixColumn(camera.matrixWorld,1),rotation:camera.quaternion.clone()};
}
function draw(){scene.update(h,snapshot);return frame();}
function sameFrame(a,b,message){
 close(a.height,b.height,message+' span');close(a.radius,b.radius,message+' range');
 samePoint(a.eye,b.eye,message+' eye');samePoint(a.pivot,b.pivot,message+' pivot');close(a.rotation.angleTo(b.rotation),0,message+' rotation');
}
function pointer(type,x,y,button=0){canvas.events[type]({clientX:x,clientY:y,pointerId:1,pointerType:'mouse',button,preventDefault(){}});}
function drag(x,y,toX,toY,button=0){pointer('pointerdown',x,y,button);pointer('pointermove',toX,toY,button);pointer('pointerup',toX,toY,button);}
function wheel(deltaY){canvas.events.wheel({deltaY,preventDefault(){}});}

// Preserve the existing Entire deployment-envelope fit, including tracked
// panel positions. This geometric oracle checks both containment and the
// original 14% framing allowance, in actual rendered screen coordinates.
const layout=deploymentLayout(h),sweep=[0,.54,.59,.77,.82,1].flatMap(u=>layout.descriptors.flatMap(d=>leafCorners(leafPose(layout,d,u,h.input.solarTiltDeg),d).map(p=>V(...p))));
for(const x of [-.6,.6])for(const y of [-.6,.6])for(const z of [-.65,.65])sweep.push(V(x*h.bodyWidthM,y*h.bodyHeightM,z*h.bodyLengthM));
function assertEntireFit(actual,label){
 const points=[...sweep,...layout.descriptors.flatMap(d=>leafCorners(leafPose(layout,d,snapshot.deployment,h.input.solarTiltDeg,snapshot),d).map(p=>V(...p)))];
 const b=projectedBounds(points,actual.right,actual.up),aspect=container.width/container.height;
 close(actual.height,Math.max((b.right-b.left)/aspect,b.top-b.bottom)*1.14,label+' preserves the complete fit');
 close(actual.pivot.dot(actual.right),(b.left+b.right)/2,label+' horizontal center');
 close(actual.pivot.dot(actual.up),(b.bottom+b.top)/2,label+' vertical center');
}

scene.setDomain('conops','E');scene.setChapter('operations');scene.setView('spacecraft');scene.update(h,snapshot);scene.resetCamera();
assert.equal(scene.getSpacecraftFocus(),'core');const opening=frame();
scene.setSpacecraftFocus('core');sameFrame(draw(),opening,'Explicit core matches the new default');

const sampled=[];
for(const degrees of [0,45,90,180]){
 snapshot=sim.at(base.t+base.periodSec*degrees/360);assert.equal(snapshot.deployment,1);
 scene.setSpacecraftFocus('core');const core=draw();
 const b=projectedBounds(chassisCorners(h),core.right,core.up),aspect=container.width/container.height;
 assert.ok(core.height>=b.top-b.bottom&&core.height*aspect>=b.right-b.left,'Actual camera must contain the chassis');
 samePoint(core.pivot,V(),'Core remains centered on the bus, including Redwire’s external payload');
 scene.setSpacecraftFocus('entire');const entire=frame();assertEntireFit(entire,`Redwire at ${degrees} orbital degrees`);
 // The Sun–velocity camera can look nearly along the deployed architecture.
 // The projected-geometry oracle above verifies the full fit at each angle.
 assert.ok(entire.height>core.height,'Entire must include the appendages beyond the chassis');
 sampled.push({degrees,core:core.height,entire:entire.height});
}
const spread=key=>Math.max(...sampled.map(s=>s[key]))/Math.min(...sampled.map(s=>s[key]));
assert.ok(spread('core')<1.2,'Redwire core should remain near a stable scale over orbital attitude changes');
assert.ok(spread('entire')>1.5,'The regression must exercise changing projected array aspect ratios');

snapshot=base;scene.setSpacecraftFocus('core');const coreBase=draw();
for(const deployment of [0,.5,1]){
 snapshot={...base,deployment};sameFrame(draw(),coreBase,'Deployment does not enlarge Core framing');
}
snapshot={...base,wingPitchDeg:base.wingPitchDeg+75,upperRadiatorPitchDeg:base.upperRadiatorPitchDeg+25};
sameFrame(draw(),coreBase,'Appendage tracking does not enlarge Core framing');

// Communications formerly forced a close fit in the Spacecraft camera. The
// explicit focus selector now has to work there as well as in ConOps.
snapshot=base;scene.setDomain('comm','E');scene.setSpacecraftFocus('core');const commCore=draw();
scene.setSpacecraftFocus('entire');const commEntire=frame();assertEntireFit(commEntire,'Communications Entire');
assert.ok(commEntire.height>commCore.height*3,'Domain close preset must not defeat Entire focus');

// A selection changes only the fit subject. Keep all navigation degrees of
// freedom, including a nonidentity orbital tumble quaternion, through toggles.
scene.setDomain('conops','E');scene.setSpacecraftFocus('core');scene.resetCamera();draw();
wheel(-140);const zoomed=frame();assert.ok(zoomed.height<coreBase.height);
drag(90,65,108,77,1);const panned=frame();assert.ok(panned.pivot.distanceTo(zoomed.pivot)>.01);
drag(128,72,150,61);const turned=frame();assert.ok(turned.rotation.angleTo(panned.rotation)>.05);
close(turned.height,panned.height,'Manual tumble preserves fit scale');samePoint(turned.pivot,panned.pivot,'Manual tumble preserves pan');
const saved=JSON.parse(JSON.stringify(scene.getCameraState()));assert.equal(saved.spacecraft.length,14,'Flight tumble retains its frozen base and free quaternion');
scene.setSpacecraftFocus('entire');frame();assert.deepEqual(scene.getCameraState(),saved,'Entire selection preserves pan, zoom and rotation');
scene.setSpacecraftFocus('core');sameFrame(frame(),turned,'Returning to Core preserves the free camera');
assert.deepEqual(scene.getCameraState(),saved);
scene.resetCamera();frame();assert.equal(scene.getSpacecraftFocus(),'core');scene.setCameraState(saved);sameFrame(frame(),turned,'Saved camera restores with Core focus');
container.width=320;container.height=180;scene.resize();sameFrame(frame(),turned,'Same-aspect resizing preserves framing and navigation');

// Core must retain the full-spacecraft zoom-out context, even though this
// requires a smaller multiplier than the old 0.25 close-view floor.
scene.resetCamera();frame();scene.setSpacecraftFocus('entire');const entireBase=frame();
scene.setSpacecraftFocus('core');frame();for(let i=0;i<12;i++)wheel(1000);const distant=frame();
assert.ok(distant.height>=entireBase.height*3.999,'Core zoom-out must reach the full architecture and surrounding context');
assert.ok(scene.getCameraState().spacecraft[2]<.25,'Close Core framing needs the extended finite zoom-out range');
const farState=JSON.parse(JSON.stringify(scene.getCameraState()));scene.resetCamera();frame();scene.setCameraState(farState);sameFrame(frame(),distant,'Extended Core zoom survives restore');
wheel(-120);assert.ok(frame().height<distant.height,'Core zoom-in remains free after maximum retreat');

// The separate cutaway camera and Earth overview must retain their own framing.
for(const view of ['core','orbit']){
 scene.setView(view);scene.resetCamera();scene.setSpacecraftFocus('core');const before=draw();
 scene.setSpacecraftFocus('entire');sameFrame(frame(),before,view+' ignores the Spacecraft focus preference');
}
scene.setView('spacecraft');scene.setChapter('commissioning');scene.setDeploymentLens('wing');scene.resetCamera();scene.setSpacecraftFocus('core');
const inspection=draw();scene.setSpacecraftFocus('entire');sameFrame(frame(),inspection,'Dedicated commissioning close-up remains unchanged');
scene.setChapter('operations');scene.setDeploymentLens('vehicle');scene.resetCamera();frame();assert.equal(scene.getSpacecraftFocus(),'entire','Home retains the selected fit subject');
scene.destroy();
console.log('All six reference chassis fit in landscape and portrait; Core/Entire availability and normalization passed.');
console.log('Redwire actual camera heights by orbital offset (degrees, Core metres, Entire metres): '+sampled.map(s=>[s.degrees,s.core.toFixed(3),s.entire.toFixed(3)].join('/')).join(', '));
console.log('Entire geometry, domain override, deployment independence, free pan/zoom/tumble, finite wide retreat, saved states and unaffected inspection cameras passed.');
