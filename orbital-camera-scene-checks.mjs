// Exercise the production orbital camera and real input-event handlers.
// Keep the annotation-capable DOM harness because the scene renders stable pins.
// No browser or GPU is needed; imagery downloads are irrelevant to this check.
import assert from 'node:assert/strict';
import {Object3D,Quaternion,Vector3} from './dist/vendor/three.module.js';
import {canvas as rasterCanvas} from './render-test-canvas.mjs';
import {sizeDesign,missionStarter} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {createScene} from './dist/scene.js';

const captures=new Map();
class Element{
 constructor(tag='div'){
  this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;this.style={};this.dataset={};
  this.listeners=new Map();this.attributes={};this.className='';this.width=320;this.height=200;
 }
 append(...nodes){for(const n of nodes){n.remove?.();n.parentNode=this;this.children.push(n);}}
 appendChild(node){this.append(node);return node;}
 replaceChildren(...nodes){for(const n of this.children)n.parentNode=null;this.children=[];this.append(...nodes);}
 remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}}
 get parentElement(){return this.parentNode;}
 get classList(){return {contains:n=>this.className.split(/\s+/).includes(n),add:n=>{if(!this.classList.contains(n))this.className+=' '+n},remove:n=>{this.className=this.className.split(/\s+/).filter(v=>v!==n).join(' ')}};}
 setAttribute(k,v){this.attributes[k]=String(v);if(k==='class')this.className=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);}
 getAttribute(k){return this.attributes[k]??null;}
 removeAttribute(k){delete this.attributes[k];}
 hasAttribute(k){return Object.hasOwn(this.attributes,k);}
 matches(selector){return selector.split(',').some(s=>{
  s=s.trim();if(s.startsWith('.'))return this.classList.contains(s.slice(1));
  const attr=s.match(/^\[([^=\]]+)(?:=["']?([^"'\]]+)["']?)?\]$/);
  if(attr){const k=attr[1].startsWith('data-')?attr[1].slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()):null;
   const value=k?this.dataset[k]:this.attributes[attr[1]];return value!=null&&(attr[2]===undefined||value===attr[2]);}
  return this.tagName.toLowerCase()===s.toLowerCase();
 });}
 closest(selector){for(let e=this;e;e=e.parentNode)if(e.matches(selector))return e;return null;}
 contains(node){for(let e=node;e;e=e.parentNode)if(e===this)return true;return false;}
 querySelectorAll(selector){const out=[];for(const child of this.children){if(child.matches(selector))out.push(child);out.push(...child.querySelectorAll(selector));}return out;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 addEventListener(type,fn,options={}){const list=this.listeners.get(type)||[];list.push({fn,capture:options===true||options?.capture===true});this.listeners.set(type,list);}
 removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(v=>v.fn!==fn));}
 getBoundingClientRect(){return {width:this.width,height:this.height,left:0,top:0,right:this.width,bottom:this.height};}
 getClientRects(){return [this.getBoundingClientRect()];}
 setPointerCapture(id){captures.set(id,this);}
 releasePointerCapture(id){if(captures.get(id)===this)captures.delete(id);}
 hasPointerCapture(id){return captures.get(id)===this;}
 focus(){document.activeElement=this;}
 toDataURL(){return 'data:image/jpeg;base64,';}
}
function createElement(tag){
 const el=new Element(tag);if(tag!=='canvas')return el;
 const backing=rasterCanvas(),ctx=backing.getContext('2d');
 Object.assign(backing,el);Object.setPrototypeOf(backing,Element.prototype);
 backing.getContext=kind=>kind==='2d'?ctx:null;return backing;
}
const doc=new Element('document'),body=new Element('body');doc.append(body);
Object.assign(doc,{body,createElement,createElementNS:(_,tag)=>createElement(tag),activeElement:null});
globalThis.document=doc;globalThis.window={devicePixelRatio:1};
globalThis.ResizeObserver=class{observe(){}disconnect(){}};
globalThis.fetch=async()=>{throw new Error('Network imagery disabled in camera regression');};
let frameId=0;const scheduled=new Map();
globalThis.requestAnimationFrame=fn=>{const id=++frameId;scheduled.set(id,fn);return id;};
globalThis.cancelAnimationFrame=id=>scheduled.delete(id);

// This event path includes capture/bubble phases and pointer capture. In
// particular a sibling overlay does not accidentally dispatch to the canvas.
function fire(target,type,values={}){
 if(/^pointer(move|up|cancel)$/.test(type))target=captures.get(values.pointerId??1)||target;
 const path=[];for(let e=target;e;e=e.parentNode)path.push(e);
 const event={type,target,currentTarget:null,bubbles:true,cancelable:true,defaultPrevented:false,
  clientX:400,clientY:270,pointerId:1,pointerType:'mouse',button:0,buttons:1,detail:1,shiftKey:false,
  ...values,preventDefault(){this.defaultPrevented=true},stopPropagation(){this.stopped=true},
  stopImmediatePropagation(){this.stopped=this.immediate=true},composedPath:()=>path.slice()};
 const visit=(node,capture)=>{event.currentTarget=node;for(const l of node.listeners.get(type)||[]){if(l.capture===capture)l.fn(event);if(event.immediate)break;}};
 for(const node of [...path].reverse()){visit(node,true);if(event.stopped)break;}
 if(!event.stopped)for(const node of path){visit(node,false);if(event.stopped)break;}
 if(/^pointer(up|cancel)$/.test(type))captures.delete(event.pointerId);
 return event;
}
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
 const eye=camera.position.clone(),radius=eye.distanceTo(pivot),height=2*(camera.isPerspectiveCamera?radius:1)/camera.projectionMatrix.elements[5];
 return {eye,pivot,radius,height,rotation:camera.quaternion.clone(),near:camera.near,
  direction:eye.clone().sub(pivot).normalize(),right:new Vector3().setFromMatrixColumn(camera.matrixWorld,0),
  up:new Vector3().setFromMatrixColumn(camera.matrixWorld,1)};
}
const close=(a,b,message,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${message}: ${a} != ${b}`);
const samePoint=(a,b,message)=>assert.ok(a.distanceTo(b)<1e-7,`${message}: ${a.toArray()} != ${b.toArray()}`);
function sameFraming(a,b,message){close(a.radius,b.radius,message+' distance');close(a.height,b.height,message+' span');close(a.rotation.angleTo(b.rotation),0,message+' orientation');}


const V=(...a)=>new Vector3(...a),degrees=r=>r*180/Math.PI;
const hardware=sizeDesign(missionStarter('text')),simulation=createSimulation(hardware),base=simulation.at(7800);
const container=new Element();body.append(container);
let picked=0;
const scene=createScene(container,{onPick:()=>{picked++;}}),canvas=container.children[0];
// Preserve one real simulation's geometry/thermal/deployment fields, replacing
// only the orbital frame to isolate camera following from model integration.
function orbitalSnapshot(t,orbitAngle,sunAngle,bodyAngle){
 const radial=[Math.cos(orbitAngle),Math.sin(orbitAngle),0],along=[-Math.sin(orbitAngle),Math.cos(orbitAngle),0];
 const range=Math.hypot(...base.positionECI),speed=Math.hypot(...base.velocityECI);
 return {...base,t,radial,along,normal:[0,0,1],positionECI:radial.map(x=>x*range),velocityECI:along.map(x=>x*speed),
  sunECI:[Math.cos(sunAngle),Math.sin(sunAngle),0],
  bodyXECI:[Math.cos(bodyAngle),Math.sin(bodyAngle),0],bodyUpECI:[-Math.sin(bodyAngle),Math.cos(bodyAngle),0],bodyZECI:[0,0,1]};
}
const first=orbitalSnapshot(7800,0,0,0),later=orbitalSnapshot(8400,.7,.2,.35),latest=orbitalSnapshot(9000,1.1,-.1,.8);
let snapshot=first;
function draw(){scene.update(hardware,snapshot);return frame();}
function bodyDirection(a,s=snapshot){
 const ray=V(...a),x=V(...s.bodyXECI),y=V(...s.bodyUpECI),z=x.clone().cross(y).normalize();
 return V(ray.dot(x),ray.dot(y),ray.dot(z)).normalize();
}
function rotationEqual(a,b,message){close(a.angleTo(b),0,message,1e-6);}
function samePose(a,b,message){samePoint(a.eye,b.eye,message+' eye');samePoint(a.pivot,b.pivot,message+' pivot');sameFraming(a,b,message);}
function assertAuto(actual,label){
 assert.equal(scene.getCameraTracking(),'sun-velocity',label+' uses automatic orbital framing');
 const sun=bodyDirection(snapshot.sunECI),velocity=bodyDirection(snapshot.velocityECI);
 const bisector=sun.clone().add(velocity).normalize(),normal=sun.clone().cross(velocity).normalize();
 close(degrees(actual.direction.angleTo(bisector)),22.5,label+' out-of-plane angle',1e-6);
 const inPlane=actual.direction.clone().addScaledVector(normal,-actual.direction.dot(normal)).normalize();
 samePoint(inPlane,bisector,label+' in-plane component follows the actual unit-vector bisector');
 const sx=sun.dot(actual.right),sy=sun.dot(actual.up),vx=velocity.dot(actual.right),vy=velocity.dot(actual.up);
 const separation=Math.abs(sx*vy-sy*vx)/Math.hypot(sx,sy)/Math.hypot(vx,vy);
 assert.ok(separation>1e-4,label+' projects Sun and velocity to distinct lines');
 if(Math.abs(sun.dot(velocity))<.1)assert.ok(separation>.2,label+' has a visibly separated nondegenerate projection');
}
function pointer(type,x,y,button=0){return fire(canvas,type,{clientX:x,clientY:y,button});}
function drag(x,y,toX,toY,button=0){pointer('pointerdown',x,y,button);pointer('pointermove',toX,toY,button);pointer('pointerup',toX,toY,button);}
function key(key,values={}){assert.ok(fire(canvas,'keydown',{key,...values}).defaultPrevented,'Camera key is handled: '+key);}

scene.setDomain('conops','E');scene.setChapter('operations');scene.setView('spacecraft');scene.update(hardware,snapshot);scene.resetCamera();
let initial=frame();assertAuto(initial,'Spacecraft opening');
assert.equal(scene.getSpacecraftFocus(),'core','Opening framing still defaults to the core');

// Holding a pointer down or clicking is not a request to take over the camera.
const untouchedState=scene.getCameraState().spacecraft.slice();
pointer('pointerdown',160,100);assert.equal(scene.getCameraTracking(),'sun-velocity');
pointer('pointermove',163,100);pointer('pointerup',163,100);
pointer('pointermove',160,100);
assert.deepEqual(scene.getCameraState().spacecraft,untouchedState,'Three-pixel click jitter does not mutate camera state');
let afterClick=draw();samePose(afterClick,initial,'Click and hover preserve the opening camera');assertAuto(afterClick,'After click');

fire(canvas,'wheel',{deltaY:-100});let zoomed=frame();assertAuto(zoomed,'After wheel');
assert.ok(zoomed.height<initial.height,'Wheel still changes the visible scale');
drag(160,100,180,109,1);const panned=frame();assertAuto(panned,'After middle-button pan');
assert.ok(panned.pivot.distanceTo(zoomed.pivot)>.01,'Pan still moves the camera target');
key('ArrowRight',{shiftKey:true});const keyboardPanned=frame();assertAuto(keyboardPanned,'After keyboard pan');
// Ending a two-finger pan/pinch is not a rotation. A stationary remaining
// finger must still pass the normal movement threshold before taking over.
const picksBeforePinch=picked;
fire(canvas,'pointerdown',{pointerType:'touch',pointerId:11,clientX:100,clientY:100});
fire(canvas,'pointerdown',{pointerType:'touch',pointerId:12,clientX:220,clientY:100});
fire(canvas,'pointermove',{pointerType:'touch',pointerId:12,clientX:230,clientY:100});
assertAuto(frame(),'During two-finger navigation');
fire(canvas,'pointerup',{pointerType:'touch',pointerId:12,clientX:230,clientY:100});
fire(canvas,'pointermove',{pointerType:'touch',pointerId:11,clientX:100,clientY:100});
fire(canvas,'pointermove',{pointerType:'touch',pointerId:11,clientX:102,clientY:101});
fire(canvas,'pointerup',{pointerType:'touch',pointerId:11,clientX:102,clientY:101});
assertAuto(draw(),'After two-finger navigation and small release jitter');
assert.equal(picked,picksBeforePinch,'Ending a pinch must not activate the remaining finger as a click');
const navigationState=scene.getCameraState().spacecraft.slice();
snapshot=later;const following=draw();assertAuto(following,'Later orbital geometry');
assert.ok(following.rotation.angleTo(keyboardPanned.rotation)>.08,'An untouched camera follows changing Sun/velocity geometry');
assert.deepEqual(scene.getCameraState().spacecraft,navigationState,'Automatic following preserves the user zoom and pan');

// Real rotation takes over from the exact displayed frame. The handoff must
// not reframe the bus or translate the target underneath an ongoing gesture.
const beforeTakeover=following;
pointer('pointerdown',160,100);assert.equal(scene.getCameraTracking(),'sun-velocity','Pointerdown alone keeps following');
pointer('pointermove',192,117);const duringDrag=frame();
assert.equal(scene.getCameraTracking(),'manual','A real drag captures a manual body-frame camera');
close(duringDrag.radius,beforeTakeover.radius,'Drag handoff keeps range');
close(duringDrag.height,beforeTakeover.height,'Drag handoff keeps scale');
samePoint(duringDrag.pivot,beforeTakeover.pivot,'Drag handoff keeps pivot');
assert.ok(duringDrag.rotation.angleTo(beforeTakeover.rotation)>.03,'Rotation drag visibly turns the camera');
pointer('pointerup',192,117);
const manualState=scene.getCameraState();assert.equal(manualState.spacecraft.length,14,'Manual saves include turn and frozen base quaternions');
assert.deepEqual(manualState.spacecraft.slice(0,6),navigationState,'Rotation takes over without rewriting pan or zoom');
const manual=draw();rotationEqual(manual.rotation,duringDrag.rotation,'Releasing drag preserves orientation');
snapshot=latest;const held=draw();assert.equal(scene.getCameraTracking(),'manual');
samePose(held,manual,'Time and attitude changes preserve the chosen body-relative view');
assert.deepEqual(scene.getCameraState(),manualState,'Time does not rewrite manual camera state');

scene.setDomain('power','E');const domainChanged=frame();rotationEqual(domainChanged.rotation,manual.rotation,'Domain change preserves manual orientation');
assert.deepEqual(scene.getCameraState(),manualState,'Domain change preserves manual pan and zoom');
scene.setSpacecraftFocus('entire');const entire=frame();rotationEqual(entire.rotation,manual.rotation,'Entire focus preserves manual orientation');
scene.setSpacecraftFocus('core');samePose(frame(),held,'Returning to core preserves the held framing');
container.width=400;container.height=260;scene.resize();rotationEqual(frame().rotation,manual.rotation,'Resize preserves manual orientation');
assert.deepEqual(scene.getCameraState(),manualState,'Resize preserves saved pan and zoom');
container.width=320;container.height=200;scene.resize();samePose(frame(),held,'Returning to original size preserves framing');
scene.setView('core');const coreOpening=frame();assertAuto(coreOpening,'Core cutaway opening');
scene.setView('spacecraft');samePose(frame(),held,'Returning to spacecraft preserves its independent manual view');

// Restoring the serialized manual camera at another orbital time is a true
// round trip, not just a copied multiplier with a newly generated baseline.
scene.resetCamera();let reset=frame();assertAuto(reset,'Reset camera');
assert.equal(scene.getCameraState().spacecraft.length,6,'Reset removes the frozen manual base');
scene.setCameraState(manualState);const restored=frame();assert.equal(scene.getCameraTracking(),'manual');samePose(restored,held,'Manual saved state restores exact frame');
assert.deepEqual(scene.getCameraState(),manualState,'Manual saved state round trip');
key('Home');reset=frame();assertAuto(reset,'Home reset');
snapshot=first;const resumed=draw();assertAuto(resumed,'Following after Home');
assert.ok(resumed.rotation.angleTo(reset.rotation)>.08,'Home resumes time-dependent following');

// Reproduce the earlier drag while holding the pointer stationary as time and
// attitude advance. The final camera must match the same gesture started at
// the later displayed frame, rather than the frame that existed on pointerdown.
scene.setCameraState({spacecraft:navigationState});const waitingStart=draw();
pointer('pointerdown',160,100);
snapshot=later;const waitingCurrent=draw();assertAuto(waitingCurrent,'While holding a pointer');
assert.ok(waitingCurrent.rotation.angleTo(waitingStart.rotation)>.08,'A stationary held pointer allows following to advance');
pointer('pointermove',192,117);const delayedTakeover=frame();pointer('pointerup',192,117);
assert.equal(scene.getCameraTracking(),'manual');
samePose(delayedTakeover,duringDrag,'Delayed drag starts from the current displayed camera');
key('Home');frame();snapshot=first;draw();

// Rotate and roll keys are deliberate orientation changes, unlike pan keys.
key('ArrowLeft');const keyboardTurn=frame();assert.equal(scene.getCameraTracking(),'manual');
assert.equal(scene.getCameraState().spacecraft.length,14);
snapshot=later;rotationEqual(draw().rotation,keyboardTurn.rotation,'Keyboard turn stays body-fixed through time');
key('Home');frame();key('q');const keyboardRoll=frame();assert.equal(scene.getCameraTracking(),'manual');
snapshot=latest;rotationEqual(draw().rotation,keyboardRoll.rotation,'Keyboard roll stays body-fixed through time');

// The core camera has a separate manual state and the same follow/reset rules.
scene.setView('core');assertAuto(frame(),'Independent core camera');
key('ArrowUp');const coreManual=frame();assert.equal(scene.getCameraTracking(),'manual');
assert.equal(scene.getCameraState().core.length,14);
snapshot=first;rotationEqual(draw().rotation,coreManual.rotation,'Core manual camera stays body-fixed');
key('Home');assertAuto(frame(),'Core Home reset');
scene.setView('spacecraft');assert.equal((frame(),scene.getCameraTracking()),'manual','Core reset does not reset spacecraft');

// Old default states adopt following. Old customized states keep their former
// orbital-frame or body-frame rendering, including their relative quaternion.
scene.setDomain('conops','E');frame();
scene.setCameraState({spacecraft:[.61,.49,1.2,.1,-.2,.3]});assertAuto(frame(),'Old untouched angles');
const oldSix=[.82,.37,1.2,.1,-.2,.3];scene.setCameraState({spacecraft:oldSix});const legacySix=frame();
assert.equal(scene.getCameraTracking(),'legacy');assert.deepEqual(scene.getCameraState().spacecraft,oldSix);
const local=V(Math.sin(oldSix[0])*Math.cos(oldSix[1]),-Math.cos(oldSix[0])*Math.cos(oldSix[1]),Math.sin(oldSix[1]));
const legacyECI=V(...snapshot.along).multiplyScalar(local.x).addScaledVector(V(...snapshot.normal),local.y).addScaledVector(V(...snapshot.radial),local.z);
samePoint(legacySix.direction,bodyDirection(legacyECI.toArray()),'Old six-value camera retains its orbital-frame sightline');
const oldTurn=new Quaternion().setFromAxisAngle(V(1,2,-1).normalize(),.28),oldTen=[...oldSix,...oldTurn.toArray()];
scene.setCameraState({spacecraft:oldTen});const legacyTen=frame();assert.equal(scene.getCameraTracking(),'legacy');
rotationEqual(legacyTen.rotation,legacySix.rotation.clone().multiply(oldTurn),'Old ten-value camera retains its relative turn');
assert.deepEqual(scene.getCameraState().spacecraft,oldTen);
scene.setCameraState({spacecraft:[1.2,.8,1,0,0,0]});const legacyBeforeTakeover=frame();
key('ArrowRight');const legacyTakenOver=frame();assert.equal(scene.getCameraTracking(),'manual');
close(legacyTakenOver.radius,legacyBeforeTakeover.radius,'Legacy handoff keeps range');
close(legacyTakenOver.height,legacyBeforeTakeover.height,'Legacy handoff keeps scale');
samePoint(legacyTakenOver.pivot,legacyBeforeTakeover.pivot,'Legacy handoff keeps pivot');
rotationEqual(legacyTakenOver.rotation,legacyBeforeTakeover.rotation.clone().multiply(new Quaternion().setFromAxisAngle(V(0,1,0),.1)),'Legacy handoff applies only the requested keyboard turn');
key('Home');assertAuto(frame(),'Reset old customized camera');

// Existing scene-specific compositions are outside the new orbital default.
scene.setView('orbit');frame();assert.equal(scene.getCameraTracking(),'preset','Earth overview keeps its camera preset');
scene.setView('spacecraft');scene.setChapter('commissioning');scene.setDeploymentLens('wing');frame();
assert.equal(scene.getCameraTracking(),'preset','Commissioning wing closeup keeps its camera preset');
scene.setDeploymentLens('elbow');frame();assert.equal(scene.getCameraTracking(),'preset','Commissioning elbow closeup keeps its camera preset');
scene.setDeploymentLens('vehicle');assertAuto(frame(),'Commissioning whole vehicle');
scene.setChapter('operations');scene.setView('launch');scene.setDomain('launcher','D');frame();
assert.equal(scene.getCameraTracking(),'preset','Launch scene keeps its camera preset');

scene.destroy();
console.log('Orbital production-camera checks passed: 22.5-degree vector framing, following, interaction takeover, body-relative persistence, saved-state compatibility, and preset scope.');
