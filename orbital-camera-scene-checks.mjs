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
function sameFraming(a,b,message){close(a.radius,b.radius,message+' distance');close(a.height,b.height,message+' span');close(a.rotation.angleTo(b.rotation),0,message+' orientation',1e-6);}


const V=(...a)=>new Vector3(...a),degrees=r=>r*180/Math.PI;
const hardware=sizeDesign(missionStarter('text')),simulation=createSimulation(hardware),base=simulation.at(7800);
const container=new Element();body.append(container);
let picked=0;const modeChanges=[];
const scene=createScene(container,{onPick:()=>{picked++;},onCameraFrameChange:mode=>modeChanges.push(mode)}),canvas=container.children[0];
// One real simulation supplies model fields. Independent orbital and attitude
// rotations isolate the camera frames without integrating additional missions.
function orbitalSnapshot(t,orbitAngle,sunAngle,bodyAngle,planeTilt=0){
 const plane=new Quaternion().setFromAxisAngle(V(1,0,0),planeTilt);
 const radial=V(Math.cos(orbitAngle),Math.sin(orbitAngle),0).applyQuaternion(plane),along=V(-Math.sin(orbitAngle),Math.cos(orbitAngle),0).applyQuaternion(plane);
 const attitude=new Quaternion().setFromAxisAngle(V(1,2,3).normalize(),bodyAngle);
 const range=Math.hypot(...base.positionECI),speed=Math.hypot(...base.velocityECI);
 return {...base,t,radial:radial.toArray(),along:along.toArray(),normal:V(0,0,1).applyQuaternion(plane).toArray(),
  positionECI:radial.clone().multiplyScalar(range).toArray(),velocityECI:along.clone().multiplyScalar(speed).toArray(),
  sunECI:[Math.cos(sunAngle),Math.sin(sunAngle),0],bodyXECI:V(1,0,0).applyQuaternion(attitude).toArray(),
  bodyUpECI:V(0,1,0).applyQuaternion(attitude).toArray(),bodyZECI:V(0,0,1).applyQuaternion(attitude).toArray()};
}
const first=orbitalSnapshot(7800,0,0,0),later=orbitalSnapshot(8400,.7,.2,.35,.2),latest=orbitalSnapshot(9000,1.1,-.1,.8,-.25);
let snapshot=first;
function draw(){scene.update(hardware,snapshot);return frame();}
const savedState=()=>JSON.parse(JSON.stringify(scene.getCameraState()));
function bodyDirection(a,s=snapshot){
 const ray=V(...a),x=V(...s.bodyXECI),y=V(...s.bodyUpECI),z=x.clone().cross(y).normalize();
 return V(ray.dot(x),ray.dot(y),ray.dot(z)).normalize();
}
function bodyToECI(a,s=snapshot){return V(...s.bodyXECI).multiplyScalar(a.x).addScaledVector(V(...s.bodyUpECI),a.y).addScaledVector(V(...s.bodyZECI),a.z);}
function cameraComponents(a,camera){return V(a.dot(camera.right),a.dot(camera.up),a.dot(camera.direction));}
function earthInCamera(camera){return cameraComponents(bodyDirection(snapshot.positionECI.map(x=>-x)),camera);}
function inertialBasis(camera){return {right:bodyToECI(camera.right),up:bodyToECI(camera.up),direction:bodyToECI(camera.direction)};}
function sameBasis(a,b,message){for(const key of ['right','up','direction'])samePoint(a[key],b[key],message+' '+key);}
function rotationEqual(a,b,message){close(a.angleTo(b),0,message,1e-6);}
function samePose(a,b,message){samePoint(a.eye,b.eye,message+' eye');samePoint(a.pivot,b.pivot,message+' pivot');sameFraming(a,b,message);}
function sameRangeAndPivot(a,b,message){close(a.radius,b.radius,message+' range');close(a.height,b.height,message+' scale');samePoint(a.pivot,b.pivot,message+' pivot');}
function assertMode(mode,label){assert.equal(scene.getCameraMode(),mode,label+' selected mode');assert.equal(scene.getCameraTracking(),mode,label+' rendered frame');}
function assertSun(actual,label){
 assertMode('sun-velocity',label);
 const sun=bodyDirection(snapshot.sunECI),velocity=bodyDirection(snapshot.velocityECI);
 const bisector=sun.clone().add(velocity).normalize(),normal=sun.clone().cross(velocity).normalize();
 close(degrees(actual.direction.angleTo(bisector)),22.5,label+' out-of-plane angle',1e-6);
 const inPlane=actual.direction.clone().addScaledVector(normal,-actual.direction.dot(normal)).normalize();
 samePoint(inPlane,bisector,label+' actual unit-vector bisector');
 const sx=sun.dot(actual.right),sy=sun.dot(actual.up),vx=velocity.dot(actual.right),vy=velocity.dot(actual.up);
 const separation=Math.abs(sx*vy-sy*vx)/Math.hypot(sx,sy)/Math.hypot(vx,vy);
 assert.ok(separation>1e-4,label+' projects Sun and velocity to distinct lines');
 if(Math.abs(sun.dot(velocity))<.1)assert.ok(separation>.2,label+' visibly separates the perpendicular sample');
}
function pointer(type,x,y,button=0){return fire(canvas,type,{clientX:x,clientY:y,button});}
function drag(x,y,toX,toY,button=0){pointer('pointerdown',x,y,button);pointer('pointermove',toX,toY,button);pointer('pointerup',toX,toY,button);}
function key(key,values={}){assert.ok(fire(canvas,'keydown',{key,...values}).defaultPrevented,'Camera key is handled: '+key);}
function navigationPreservesMode(mode){
 const start=draw(),untouched=savedState();
 pointer('pointerdown',160,100);pointer('pointermove',163,100);pointer('pointerup',163,100);pointer('pointermove',160,100);
 assert.deepEqual(savedState(),untouched,mode+': click, hover and three-pixel jitter do not rotate');
 const clicked=draw();samePose(clicked,start,mode+': click preserves camera');assertMode(mode,'After click');
 fire(canvas,'wheel',{deltaY:-100});const zoomed=frame();assertMode(mode,'After wheel');assert.ok(zoomed.height<start.height,'Wheel changes visible scale');
 drag(160,100,180,109,1);const panned=frame();assertMode(mode,'After middle-button pan');
 assert.ok(panned.pivot.distanceTo(zoomed.pivot)>.01,'Pan moves the target');
 key('ArrowRight',{shiftKey:true});frame();assertMode(mode,'After keyboard pan');
 const picksBeforePinch=picked;
 fire(canvas,'pointerdown',{pointerType:'touch',pointerId:11,clientX:100,clientY:100});
 fire(canvas,'pointerdown',{pointerType:'touch',pointerId:12,clientX:220,clientY:100});
 fire(canvas,'pointermove',{pointerType:'touch',pointerId:12,clientX:230,clientY:100});frame();assertMode(mode,'During pinch');
 fire(canvas,'pointerup',{pointerType:'touch',pointerId:12,clientX:230,clientY:100});
 fire(canvas,'pointermove',{pointerType:'touch',pointerId:11,clientX:100,clientY:100});
 fire(canvas,'pointermove',{pointerType:'touch',pointerId:11,clientX:102,clientY:101});
 fire(canvas,'pointerup',{pointerType:'touch',pointerId:11,clientX:102,clientY:101});
 const result=draw();assertMode(mode,'After pinch and release jitter');
 assert.equal(picked,picksBeforePinch,'Ending a pinch must not activate a pick');return result;
}
function roundTrip(saved,expected,mode){
 // Home resets the current frame, then importing must recover both its mode
 // and geometry even when the saved values came from a different mission time.
 key('Home');frame();assertMode(mode,mode+' Home');
 scene.setCameraMode(mode==='body'?'inertial':'body');frame();
 scene.setCameraState(JSON.parse(JSON.stringify(saved)));const restored=frame();assertMode(mode,mode+' restored');
 samePose(restored,expected,mode+' saved frame at changed time');assert.deepEqual(savedState(),saved,mode+' serialized round trip');return restored;
}

scene.setDomain('conops','E');scene.setChapter('operations');scene.setView('spacecraft');scene.update(hardware,snapshot);scene.resetCamera();
const opening=frame();assertMode('orbit','Opening');assert.equal(scene.getSpacecraftFocus(),'core');
assert.deepEqual(savedState()._camera,{version:1,mode:'orbit',legacy:[],bodyPan:[]});
const openingEarth=earthInCamera(opening);
snapshot=later;const orbitFollowing=draw();assertMode('orbit','Untouched orbit');
samePoint(earthInCamera(orbitFollowing),openingEarth,'Orbit default keeps Earth direction fixed through orbit and attitude changes');
assert.ok(orbitFollowing.rotation.angleTo(opening.rotation)>.08,'Orbit mode actively follows the changing physical frame');

snapshot=first;draw();const orbitNavigation=navigationPreservesMode('orbit'),navigationState=savedState();
const navigationEarth=earthInCamera(orbitNavigation),navigationPan=cameraComponents(orbitNavigation.pivot,orbitNavigation);
snapshot=later;const beforeOrbitDrag=draw();samePoint(earthInCamera(beforeOrbitDrag),navigationEarth,'Orbit following after pan/zoom');
samePoint(cameraComponents(beforeOrbitDrag.pivot,beforeOrbitDrag),navigationPan,'Orbit pan remains in the orbital frame');
assert.deepEqual(savedState(),navigationState,'Following does not rewrite pan, zoom or turn state');
drag(160,100,192,117);const orbitDrag=frame();assertMode('orbit','Orbit drag');sameRangeAndPivot(orbitDrag,beforeOrbitDrag,'Orbit drag');
assert.ok(orbitDrag.rotation.angleTo(beforeOrbitDrag.rotation)>.03,'Orbit drag visibly turns');
const orbitSaved=savedState(),orbitEarth=earthInCamera(orbitDrag),orbitPan=cameraComponents(orbitDrag.pivot,orbitDrag);
assert.ok([10,14].includes(orbitSaved.spacecraft.length),'Orbit rotation is serialized');
snapshot=latest;const orbitHeld=draw();assertMode('orbit','Orbit after drag and time advance');
samePoint(earthInCamera(orbitHeld),orbitEarth,'Earth direction stays fixed after an Orbit drag');
samePoint(cameraComponents(orbitHeld.pivot,orbitHeld),orbitPan,'Orbit pan follows the selected frame after drag');
assert.deepEqual(savedState(),orbitSaved);roundTrip(orbitSaved,orbitHeld,'orbit');

// Standard mode changes preserve the displayed composition. Their different
// behavior is visible only as the physical frame changes afterward.
scene.setCameraMode('body');const bodyStart=frame();assertMode('body','Orbit to Body');samePose(bodyStart,orbitHeld,'Orbit to Body has no jump');
snapshot=first;const bodyHeld=draw();samePose(bodyHeld,bodyStart,'Body view remains fixed through orbit and attitude changes');
drag(160,100,180,111);const bodyDrag=frame();assertMode('body','Body drag');sameRangeAndPivot(bodyDrag,bodyHeld,'Body drag');
const bodySaved=savedState();snapshot=later;const bodyLater=draw();samePose(bodyLater,bodyDrag,'Body rotation stays body-relative');
roundTrip(bodySaved,bodyLater,'body');
scene.setDomain('power','E');const bodyDomain=frame();samePose(bodyDomain,bodyLater,'Body view survives a domain change');
scene.setSpacecraftFocus('entire');rotationEqual(frame().rotation,bodyLater.rotation,'Entire focus preserves orientation');
scene.setSpacecraftFocus('core');samePose(frame(),bodyLater,'Returning to core preserves camera');
container.width=400;container.height=260;scene.resize();rotationEqual(frame().rotation,bodyLater.rotation,'Resize preserves orientation');
container.width=320;container.height=200;scene.resize();samePose(frame(),bodyLater,'Restoring viewport preserves camera');

scene.setCameraMode('inertial');const inertialStart=frame();assertMode('inertial','Body to Inertial');samePose(inertialStart,bodyLater,'Body to Inertial has no jump');
const inertialInitialBasis=inertialBasis(inertialStart),inertialInitialPan=bodyToECI(inertialStart.pivot);
snapshot=latest;const inertialHeld=draw();sameBasis(inertialBasis(inertialHeld),inertialInitialBasis,'Inertial view stays fixed in physical ECI');
samePoint(bodyToECI(inertialHeld.pivot),inertialInitialPan,'Inertial pan stays fixed in physical ECI');
drag(160,100,182,113);const inertialDrag=frame();assertMode('inertial','Inertial drag');sameRangeAndPivot(inertialDrag,inertialHeld,'Inertial drag');
const inertialSaved=savedState(),turnedInertialBasis=inertialBasis(inertialDrag),turnedInertialPan=bodyToECI(inertialDrag.pivot);
snapshot=first;const inertialLater=draw();sameBasis(inertialBasis(inertialLater),turnedInertialBasis,'Inertial drag retains the ECI frame');
samePoint(bodyToECI(inertialLater.pivot),turnedInertialPan,'Inertial pan remains stable after a drag');
roundTrip(inertialSaved,inertialLater,'inertial');
scene.setCameraMode('orbit');const backToOrbit=frame();assertMode('orbit','Inertial to Orbit');samePose(backToOrbit,inertialLater,'Inertial to Orbit has no jump');
const returnedOrbitEarth=earthInCamera(backToOrbit);snapshot=latest;const returnedOrbit=draw();
samePoint(earthInCamera(returnedOrbit),returnedOrbitEarth,'Returning to Orbit adopts orbital-frame following');

// Sun–velocity is an explicit assisted composition. Navigation preserves it;
// deliberate rotation visibly changes the selected mode to Body.
scene.setDomain('conops','E');scene.setCameraMode('sun-velocity');const sunOpening=frame();assertSun(sunOpening,'Explicit Sun–velocity');
assert.ok(sunOpening.rotation.angleTo(returnedOrbit.rotation)>.01,'Selecting Sun–velocity recomposes the camera');
key('Home');assertSun(frame(),'Home in Sun–velocity');snapshot=first;draw();
const sunNavigation=navigationPreservesMode('sun-velocity'),sunNavigationState=savedState();assertSun(sunNavigation,'Sun navigation');
snapshot=later;const sunFollowing=draw();assertSun(sunFollowing,'Sun following');
assert.ok(sunFollowing.rotation.angleTo(sunNavigation.rotation)>.08,'Sun–velocity follows changing vector geometry');
assert.deepEqual(savedState(),sunNavigationState,'Sun following preserves user navigation state');
pointer('pointerdown',160,100);assertMode('sun-velocity','Sun pointerdown');pointer('pointermove',192,117);const sunDrag=frame();pointer('pointerup',192,117);
assertMode('body','Sun drag takeover');assert.equal(modeChanges.at(-1),'body','Sun drag announces the new selector value');
sameRangeAndPivot(sunDrag,sunFollowing,'Sun-to-Body takeover');
assert.equal(savedState().spacecraft.length,14,'Frozen Sun composition retains a base quaternion');
snapshot=latest;samePose(draw(),sunDrag,'Sun takeover stays body-relative');
key('Home');frame();assertMode('body','Home after Sun takeover');
scene.setCameraMode('sun-velocity');assertSun(frame(),'Reselect Sun–velocity');

// A held pointer must take over from the latest displayed Sun composition.
scene.setCameraState(sunNavigationState);snapshot=first;const waitingStart=draw();pointer('pointerdown',160,100);
snapshot=later;const waitingCurrent=draw();assertSun(waitingCurrent,'While holding a pointer');
assert.ok(waitingCurrent.rotation.angleTo(waitingStart.rotation)>.08,'A stationary pointer allows following to advance');
pointer('pointermove',192,117);const delayedTakeover=frame();pointer('pointerup',192,117);
assertMode('body','Delayed Sun takeover');samePose(delayedTakeover,sunDrag,'Delayed drag starts from the current displayed frame');
scene.setCameraMode('sun-velocity');frame();key('ArrowLeft');frame();assertMode('body','Sun keyboard turn');
scene.setCameraMode('sun-velocity');frame();key('q');const rolled=frame();assertMode('body','Sun keyboard roll');
snapshot=latest;samePose(draw(),rolled,'Sun keyboard roll remains body-relative');

// Old six/ten-value saves retain their former rendering path. A 14-value save
// without metadata is the previous body-fixed format, not a new Orbit save.
scene.setCameraMode('orbit');scene.setDomain('conops','E');snapshot=later;draw();key('Home');frame();
const oldDefault=[.61,.49,1.2,.1,-.2,.3];scene.setCameraState({spacecraft:oldDefault});const migrated=frame();assertMode('orbit','Old default angles adopt Orbit');
samePoint(migrated.pivot,V(...oldDefault.slice(3)),'Old body-coordinate pan does not jump on import');
assert.deepEqual(savedState()._camera.bodyPan,[],'Old pan is converted once into the chosen frame');
const oldSix=[.82,.37,1.2,.1,-.2,.3];scene.setCameraState({spacecraft:oldSix});const legacySix=frame();assert.equal(scene.getCameraTracking(),'legacy');
assert.deepEqual(savedState().spacecraft,oldSix);assert.ok(savedState()._camera.legacy.includes('spacecraft'));
const local=V(Math.sin(oldSix[0])*Math.cos(oldSix[1]),-Math.cos(oldSix[0])*Math.cos(oldSix[1]),Math.sin(oldSix[1]));
const legacyECI=V(...snapshot.along).multiplyScalar(local.x).addScaledVector(V(...snapshot.normal),local.y).addScaledVector(V(...snapshot.radial),local.z);
samePoint(legacySix.direction,bodyDirection(legacyECI.toArray()),'Old six-value camera keeps its original orbital-frame sightline');
const oldTurn=new Quaternion().setFromAxisAngle(V(1,2,-1).normalize(),.28),oldTen=[...oldSix,...oldTurn.toArray()];
scene.setCameraState({spacecraft:oldTen});const legacyTen=frame();assert.equal(scene.getCameraTracking(),'legacy');
rotationEqual(legacyTen.rotation,legacySix.rotation.clone().multiply(oldTurn),'Old ten-value save retains its relative turn');
const legacyExport=savedState();key('Home');frame();scene.setCameraState(legacyExport);samePose(frame(),legacyTen,'Legacy metadata preserves the old rendering path');
assert.equal(scene.getCameraTracking(),'legacy');assert.deepEqual(savedState(),legacyExport);
scene.setCameraState({spacecraft:[1.2,.8,1,0,0,0]});const legacyBeforeTakeover=frame();key('ArrowRight');const legacyTakenOver=frame();assertMode('orbit','Legacy rotation adopts selected frame');
sameRangeAndPivot(legacyTakenOver,legacyBeforeTakeover,'Legacy rotation handoff');
rotationEqual(legacyTakenOver.rotation,legacyBeforeTakeover.rotation.clone().multiply(new Quaternion().setFromAxisAngle(V(0,1,0),.1)),'Legacy handoff applies only the requested turn');
const legacyEarth=earthInCamera(legacyTakenOver);snapshot=latest;samePoint(earthInCamera(draw()),legacyEarth,'Legacy takeover follows Orbit afterward');
const oldBase=new Quaternion().setFromAxisAngle(V(1,3,2).normalize(),.51),oldFourteen=[.61,.49,1.4,.15,-.12,.2,...oldTurn.toArray(),...oldBase.toArray()];
scene.setCameraState({spacecraft:oldFourteen});const oldBody=frame();assertMode('body','Old 14-value save implies Body');
rotationEqual(oldBody.rotation,oldBase.clone().multiply(oldTurn),'Old 14-value base and turn retain their meaning');
samePoint(oldBody.pivot,V(...oldFourteen.slice(3,6)),'Old 14-value pan remains in body coordinates');
snapshot=first;samePose(draw(),oldBody,'Old body save stays body-fixed through time');

// The dedicated core camera uses the selected frame but keeps independent
// per-view navigation. Mode changes deliberately clear the inactive base.
scene.setCameraMode('orbit');frame();const spacecraftBeforeCore=savedState().spacecraft;
scene.setView('core');key('Home');const coreOpening=frame();assertMode('orbit','Core opening');const coreEarth=earthInCamera(coreOpening);
snapshot=later;samePoint(earthInCamera(draw()),coreEarth,'Core Orbit default keeps Earth direction constant');
key('ArrowUp');const coreDrag=frame();assertMode('orbit','Core keyboard turn');const coreTurnedEarth=earthInCamera(coreDrag);
snapshot=latest;samePoint(earthInCamera(draw()),coreTurnedEarth,'Core rotation retains Orbit');
scene.setView('spacecraft');frame();assert.deepEqual(savedState().spacecraft,spacecraftBeforeCore,'Core navigation does not rewrite spacecraft navigation');
scene.setCameraMode('body');frame();assert.equal(savedState().core.length,6,'A frame change clears the inactive camera base and turn');
scene.setView('core');frame();assertMode('body','Core honors selected Body mode');key('Home');frame();assertMode('body','Core Home keeps Body mode');

// Scene-specific overview and close-up presets remain outside these modes.
scene.setView('orbit');frame();assert.equal(scene.getCameraTracking(),'preset','Earth overview keeps its preset');
scene.setView('spacecraft');scene.setChapter('commissioning');scene.setDeploymentLens('wing');frame();assert.equal(scene.getCameraTracking(),'preset','Commissioning wing closeup keeps its preset');
scene.setDeploymentLens('elbow');frame();assert.equal(scene.getCameraTracking(),'preset','Commissioning elbow closeup keeps its preset');
scene.setDeploymentLens('vehicle');frame();assertMode('body','Commissioning whole vehicle uses selected frame');
scene.setChapter('operations');scene.setView('launch');scene.setDomain('launcher','D');frame();assert.equal(scene.getCameraTracking(),'preset','Launch scene keeps its preset');
scene.destroy();
console.log('Orbital production-camera checks passed: Orbit/Body/Inertial frame stability, Sun–velocity takeover, gestures, no-jump mode changes, saved-state migration, and preset scope.');
