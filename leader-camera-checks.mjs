// Exercise real annotation markup, camera transforms, and bubbling input events.
// No browser or GPU is needed; imagery downloads are irrelevant to this check.
import assert from 'node:assert/strict';
import {Object3D,Vector3} from './dist/vendor/three.module.js';
import {canvas as rasterCanvas} from './render-test-canvas.mjs';
import {sizeDesign,missionStarter} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {makeLaunch} from './dist/launch-scene.js';
import {createScene} from './dist/scene.js';

const captures=new Map();
class Element{
 constructor(tag='div'){
  this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;this.style={};this.dataset={};
  this.listeners=new Map();this.attributes={};this.className='';this.width=800;this.height=480;
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
 return {eye,pivot,radius,height,rotation:camera.quaternion.clone(),near:camera.near};
}
const close=(a,b,message,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${message}: ${a} != ${b}`);
const samePoint=(a,b,message)=>assert.ok(a.distanceTo(b)<1e-7,`${message}: ${a.toArray()} != ${b.toArray()}`);
function sameFraming(a,b,message){close(a.radius,b.radius,message+' distance');close(a.height,b.height,message+' span');close(a.rotation.angleTo(b.rotation),0,message+' orientation');}

const hardware=sizeDesign(missionStarter('text')),sim=createSimulation(hardware),container=new Element(),picked=[];
body.append(container);
const scene=createScene(container,{onPick:id=>picked.push(id)}),canvas=container.children[0],reference=makeLaunch(hardware);
let snapshot=sim.at(-20),chapter='pad';
function updateReference(){reference.update(snapshot,chapter,{phase:'D',domain:'launcher',commBench:'sband'});reference.root.updateMatrixWorld(true);}
function redraw(){scene.update(hardware,snapshot);return frame();}
const pin=id=>container.querySelectorAll('[data-scene-anchor]').find(n=>n.dataset.sceneAnchor===id);
const anyPin=()=>{const p=container.querySelector('[data-scene-anchor]');assert.ok(p,'Expected an interactive leader');return p;};

// Camera gestures own leader activation; a click must not leak out to the
// application's older inspection or preset-selection delegates.
let escapedClicks=0;
doc.addEventListener('click',e=>{if(e.target.closest('[data-scene-anchor]'))escapedClicks++;});
function groundAnchor(id){const entry=[...reference.ground.annotations,...reference.umbilicals.annotations].find(e=>e.id===id);assert.ok(entry,'Expected a production ground anchor: '+id);return entry.anchor.getWorldPosition(new Vector3());}

scene.setDomain('launcher','D');scene.setChapter(chapter);scene.setView('launch');scene.setLaunchLens('site');scene.update(hardware,snapshot);scene.resetCamera();
updateReference();const overview=frame();
assert.equal(typeof scene.focusAnnotation,'function','Scene needs a one-shot leader-focus action');
assert.equal(scene.focusAnnotation('not-a-real-leader'),false,'Unknown leaders must not mutate the camera');
const exhaust=reference.ground.annotations.find(a=>a.id==='exhaust-path').anchor.getWorldPosition(new Vector3());
assert.equal(scene.focusAnnotation('exhaust-path'),true,'Exhaust outlet needs an exact focus anchor');
const focused=frame();samePoint(focused.pivot,exhaust,'Exhaust focus');sameFraming(focused,overview,'Leader focus preserves framing');
// Crowded compact labels may be culled after centering. Exercise whichever
// actual annotation remains visible rather than changing that layout policy.
const exhaustPin=pin('exhaust-path')||anyPin();
assert.equal(exhaustPin.tagName,'BUTTON');assert.equal(exhaustPin.dataset.padInspect,undefined);assert.equal(exhaustPin.dataset.bayLens,undefined);

// Wheel events on both the label and canvas reach navigation exactly once.
const beforeWheel=scene.getCameraState().launch[2];
assert.ok(fire(exhaustPin,'wheel',{deltaY:160}).defaultPrevented,'Wheel over a leader must be handled');
close(scene.getCameraState().launch[2],beforeWheel*Math.exp(-.24),'Leader wheel applies once');
const fromLeader=frame();assert.ok(fromLeader.height>focused.height,'Leader wheel must visibly retreat');
const beforeCanvasWheel=scene.getCameraState().launch[2];
fire(canvas,'wheel',{deltaY:160});close(scene.getCameraState().launch[2],beforeCanvasWheel*Math.exp(-.24),'Canvas wheel applies once');frame();
for(let i=0;i<8;i++)fire(anyPin(),'wheel',{deltaY:1000});
const far=frame();assert.ok(far.height>=overview.height*3.999,'Leader focus must retain the full original site retreat');
fire(anyPin(),'wheel',{deltaY:-160});const inward=frame();assert.ok(inward.height<far.height,'Zoom-in must work after retreat');

// A middle-button pan that starts over an annotation reaches the scene, and
// further rotation does not reset the new target or alter the viewing range.
const middlePin=anyPin();
assert.ok(fire(middlePin,'pointerdown',{button:1,pointerId:11,clientX:360,clientY:260}).defaultPrevented);
fire(middlePin,'pointermove',{button:1,pointerId:11,clientX:430,clientY:295});
fire(middlePin,'pointerup',{button:1,pointerId:11,clientX:430,clientY:295});
const panned=frame();assert.ok(panned.pivot.distanceTo(inward.pivot)>1,'Middle drag over a leader must pan');sameFraming(panned,inward,'Pan preserves framing');
fire(canvas,'pointerdown',{clientX:350,clientY:250});fire(canvas,'pointermove',{clientX:386,clientY:271});fire(canvas,'pointerup',{clientX:386,clientY:271});
const turned=frame();samePoint(turned.pivot,panned.pivot,'Rotate must retain panned pivot');close(turned.radius,panned.radius,'Rotate distance');assert.ok(turned.rotation.angleTo(panned.rotation)>.05);
samePoint(redraw().pivot,turned.pivot,'Model refresh must not recapture the annotation');
scene.setLaunchLens('site');const repeatedPreset=frame();samePoint(repeatedPreset.pivot,turned.pivot,'Ordinary preset synchronization must retain pan');
const saved=JSON.parse(JSON.stringify(scene.getCameraState()));
container.width=880;container.height=528;scene.resize();const resized=frame();samePoint(resized.pivot,turned.pivot,'Resize must retain pan');
scene.resetCamera();frame();scene.setCameraState(saved);const restored=frame();samePoint(restored.pivot,resized.pivot,'Saved camera restores the free target');sameFraming(restored,resized,'Saved camera');

// Pointer gestures starting on pins must not become delayed clicks after a
// drag. A following normal click remains available without a timeout wait.
scene.resetCamera();frame();const dragPin=anyPin();
fire(dragPin,'pointerdown',{clientX:400,clientY:260,pointerId:20});
fire(dragPin,'pointermove',{clientX:440,clientY:280,pointerId:20});
fire(dragPin,'pointerup',{clientX:440,clientY:280,pointerId:20});
const afterDrag=JSON.parse(JSON.stringify(scene.getCameraState()));
fire(dragPin,'click',{clientX:440,clientY:280});
assert.deepEqual(scene.getCameraState(),afterDrag,'A leader drag must not activate its focus action');frame();
const clickPin=anyPin(),clickedAnchor=groundAnchor(clickPin.dataset.sceneAnchor),beforeMenu=JSON.parse(JSON.stringify(scene.getCameraState()));
fire(clickPin,'pointerdown',{pointerId:21});fire(clickPin,'pointerup',{pointerId:21});fire(clickPin,'click');
assert.deepEqual(scene.getCameraState(),beforeMenu,'A fresh leader click opens actions without changing the camera');
const centerAction=container.querySelector('[data-scene-part-action="center"]');
assert.ok(centerAction&&!centerAction.parentElement.hidden,'A fresh short click must open the part-actions menu');
assert.equal(centerAction.textContent,'Center view on this part','The previous focus action remains clearly labeled');
fire(centerAction,'click');
assert.equal(centerAction.parentElement.hidden,true,'Choosing Center closes the action menu');
samePoint(frame().pivot,clickedAnchor,'The Center action focuses the chosen leader');
const touchPin=anyPin(),touchStart=scene.getCameraState().launch.slice();
fire(touchPin,'pointerdown',{pointerType:'touch',pointerId:31,clientX:360,clientY:265});
fire(touchPin,'pointerdown',{pointerType:'touch',pointerId:32,clientX:410,clientY:265});
fire(touchPin,'pointermove',{pointerType:'touch',pointerId:32,clientX:460,clientY:295});
fire(touchPin,'pointerup',{pointerType:'touch',pointerId:32,clientX:460,clientY:295});
fire(touchPin,'pointerup',{pointerType:'touch',pointerId:31,clientX:360,clientY:265});
const afterPinch=JSON.parse(JSON.stringify(scene.getCameraState()));
fire(touchPin,'click',{pointerType:'touch'});
assert.deepEqual(scene.getCameraState(),afterPinch,'A pinch must not activate a leader');
const touchEnd=scene.getCameraState().launch;assert.ok(touchEnd[2]>touchStart[2],'Pinch starting over leader must zoom');assert.notDeepEqual(touchEnd.slice(3),touchStart.slice(3),'Pinch center movement must pan');frame();
const keyboardPin=anyPin(),keyStart=scene.getCameraState().launch.slice();
fire(keyboardPin,'keydown',{key:'ArrowRight',shiftKey:true});assert.notDeepEqual(scene.getCameraState().launch.slice(3),keyStart.slice(3),'Focused leader supports keyboard pan');frame();
assert.equal(picked.length,0,'Leader gestures must not pick the object underneath');
assert.equal(escapedClicks,0,'Leader pointer clicks must not reach legacy app inspection handlers');

// A close preset has the same outer retreat as its broad site context, rather
// than multiplying a tiny connector's dimensions by only four.
scene.setLaunchLens('services');
const internal=reference.umbilicals.design.connections.find(c=>reference.umbilicals.getConnectionContext(c.id).internal);
assert.ok(internal,'Need an internal connector for the narrowest inspection case');
scene.setPadConnection(internal.id);scene.update(hardware,snapshot);scene.resetCamera();const connector=frame();
assert.ok(connector.height<overview.height/5,'Service preset should begin at a genuinely close scale');
for(let i=0;i<24;i++)fire(canvas,'wheel',{deltaY:1000});
const distantService=frame();assert.ok(distantService.height>=overview.height*3.999,`Services retreat ${distantService.height} m must reach complete site extent ${overview.height*4} m`);
const serviceSaved=JSON.parse(JSON.stringify(scene.getCameraState()));assert.ok(serviceSaved.launch[2]<.25,'Services require an extended finite zoom-out multiplier');
scene.resetCamera();frame();scene.setCameraState(serviceSaved);const restoredService=frame();sameFraming(restoredService,distantService,'Extended service zoom restore');samePoint(restoredService.pivot,distantService.pivot,'Extended service target restore');
scene.setLaunchLens('site');frame();for(let i=0;i<8;i++)fire(canvas,'wheel',{deltaY:1000});frame();
assert.equal(scene.getCameraState().launch[2],.25,'Ordinary site overview retains its original finite zoom limit');

// The same one-shot behavior applies to both equipment and a spacecraft test
// point. Neither leader is allowed to switch to the tiny persistent bay lens.
chapter='integration';snapshot=sim.at(-3599);scene.setChapter(chapter);scene.setBayView('overview',true);scene.update(hardware,snapshot);scene.resetCamera();updateReference();
const bayOverview=frame();
for(const [id,anchor] of [['active-ground-tool',reference.bay.equipmentAnchor],['flight-test-point',reference.bay.portAnchor]]){
 assert.equal(scene.focusAnnotation(id),true,id+' has a focus action');const target=frame();
 samePoint(target.pivot,anchor.getWorldPosition(new Vector3()),id+' exact target');sameFraming(target,bayOverview,id+' retains Work area range');
 const state=scene.getCameraState().bay.slice();fire(anyPin(),'wheel',{deltaY:120});assert.ok(scene.getCameraState().bay[2]<state[2],id+' allows zoom-out');frame();
 scene.resetCamera();frame();
}
assert.equal(scene.focusAnnotation('flight-test-point'),true);frame();
for(let i=0;i<8;i++)fire(anyPin(),'wheel',{deltaY:1000});
assert.ok(frame().height>=bayOverview.height*3.999,'Test-point selection retains full facility retreat');
scene.resetCamera();const resetBay=frame();samePoint(resetBay.pivot,bayOverview.pivot,'Home restores Work area target');sameFraming(resetBay,bayOverview,'Home restores Work area framing');

scene.setBayView('interface',true);const interfaceView=frame();assert.ok(interfaceView.height<bayOverview.height/5);
for(let i=0;i<24;i++)fire(canvas,'wheel',{deltaY:1000});
const distantInterface=frame();assert.ok(distantInterface.height>=bayOverview.height*3.999,`Interface retreat ${distantInterface.height} m must reach facility extent ${bayOverview.height*4} m`);
const baySaved=JSON.parse(JSON.stringify(scene.getCameraState()));assert.ok(baySaved.bay[2]<.25);
scene.resetCamera();frame();scene.setCameraState(baySaved);const restoredInterface=frame();sameFraming(restoredInterface,distantInterface,'Extended facility zoom restore');samePoint(restoredInterface.pivot,distantInterface.pivot,'Extended facility target restore');
scene.setBayView('overview',true);frame();for(let i=0;i<8;i++)fire(canvas,'wheel',{deltaY:1000});frame();
assert.equal(scene.getCameraState().bay[2],.25,'Ordinary Work area retains its original finite zoom limit');

scene.destroy();
console.log('Leader cameras: exact exhaust/equipment/test-point focus; free wheel/pan/rotate/pinch over labels; drag-click suppression; site/facility retreat from close presets; redraw/resize/save/restore passed.');
