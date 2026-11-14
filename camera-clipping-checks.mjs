import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {stablePerspectiveNear} from './dist/camera-clipping.js';
import {sizeDesign,missionStarter} from './dist/design.js';
import {buildPartsCatalog} from './dist/parts-catalog.js';
import {createSimulation} from './dist/model.js';
import {canvas as rasterCanvas} from './render-test-canvas.mjs';

// The quantization estimate describes a 24-bit perspective depth buffer. It is
// a camera-math check, not a claim about the test machine's GPU or frame rate.
const depthStep=(depth,near,far)=>depth*depth*(far-near)/(far*near*16777215);
for(const distance of [.001,.01,.1,1,10,100,1000,100000]){
 const near=stablePerspectiveNear(distance),far=distance*55;
 assert(near>0&&near<distance&&far>near);
 assert(depthStep(distance,near,far)/distance<1.2e-5,'relative focus precision scales with the scene');
 assert.equal(stablePerspectiveNear(distance,distance*.02),distance*.02,'preserve larger scene-specific clearances');
}
for(const invalid of [NaN,Infinity,-Infinity,-1,0])assert.equal(stablePerspectiveNear(invalid),.00001);

class Element{
 constructor(){this.children=[];this.style={};this.events={};this.attributes={};this.dataset={};this.width=256;this.height=128;}
 append(...children){this.children.push(...children);}
 replaceChildren(){this.children=[];}
 getBoundingClientRect(){return {width:this.width,height:this.height,left:0,top:0};}
 getClientRects(){return [this.getBoundingClientRect()];}
 addEventListener(key,handler){this.events[key]=handler;}
 setAttribute(key,value){this.attributes[key]=value;}
 removeEventListener(){}setPointerCapture(){}remove(){}focus(){}
 toDataURL(){return 'data:image/jpeg;base64,';}
}
function createElement(tag){
 const element=new Element();if(tag!=='canvas')return element;
 const canvas=rasterCanvas(),context=canvas.getContext('2d');
 Object.assign(canvas,element);Object.setPrototypeOf(canvas,Element.prototype);
 canvas.getContext=type=>type==='2d'?context:null;return canvas;
}
globalThis.document={hidden:false,createElement,createElementNS:(_,tag)=>createElement(tag),addEventListener(){},removeEventListener(){}};
globalThis.ResizeObserver=class{observe(){}disconnect(){}};
globalThis.window={devicePixelRatio:1};
let frameId=0,frameTime=0;
const frames=new Map();globalThis.requestAnimationFrame=callback=>{frames.set(++frameId,callback);return frameId;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
const paint=()=>{const pending=[...frames];frames.clear();for(const [,callback]of pending)callback(frameTime+=16);};

// Observe production cameras and geometry at Three.js's public boundary. No
// test-only camera control is exposed by the application.
const oldProjection=T.PerspectiveCamera.prototype.updateProjectionMatrix,oldOrtho=T.OrthographicCamera.prototype.updateProjectionMatrix,oldLook=T.Object3D.prototype.lookAt,oldAdd=T.Scene.prototype.add;
let perspective,orthographic,partScene,firstCamera=null;
const pivots=new WeakMap();
T.PerspectiveCamera.prototype.updateProjectionMatrix=function(){if(this.fov===34)perspective=this;return oldProjection.call(this);};
T.OrthographicCamera.prototype.updateProjectionMatrix=function(){orthographic=this;return oldOrtho.call(this);};
T.Object3D.prototype.lookAt=function(target,...args){if(this.isCamera&&target?.isVector3){pivots.set(this,target.clone());firstCamera??=this;}return oldLook.call(this,target,...args);};
T.Scene.prototype.add=function(...children){if(children.some(child=>child.type==='AxesHelper'))partScene=this;return oldAdd.apply(this,children);};
const distance=camera=>camera.position.distanceTo(pivots.get(camera));
const checkPrecision=camera=>{const d=distance(camera);assert(Number.isFinite(camera.near)&&camera.near>0&&camera.far>camera.near);assert(camera.near<d,'the focus remains beyond the near plane');assert(depthStep(d,camera.near,camera.far)/d<1.2e-5);};
const selectedBounds=()=>{const result=new T.Box3();partScene.traverse(object=>{if(!object.userData.partSource||object.renderOrder===-1||!object.visible)return;object.geometry.computeBoundingBox();result.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));});return result;};
function checkDepthBounds(bounds,camera,message){
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
  const p=new T.Vector3(x,y,z).project(camera);assert(p.z>=-1-1e-7&&p.z<=1+1e-7,message);
 }
}
const {createPartViewer}=await import('./dist/part-viewer.js'),{createScene}=await import('./dist/scene.js');
const h=sizeDesign(missionStarter('text')),before=JSON.stringify(h),catalog=buildPartsCatalog(h),host=new Element();
const originalError=console.error;let viewer,scene;
let checkedFits=0,checkedGestures=0,bridgeGain=0,bayGain=0;
try{
 console.error=()=>{};viewer=createPartViewer(host);console.error=originalError;viewer.setDetail('low');
 const canvas=host.children[0],wheel=deltaY=>{canvas.events.wheel({deltaY,preventDefault(){}});paint();};
 const pointer=(type,x,y,button=1)=>canvas.events[type]({clientX:x,clientY:y,pointerId:1,button,shiftKey:false,preventDefault(){}});
 for(const [id,setting] of [['flight:05.03.04','review'],['flight:02.02','thermal-vacuum'],['ground:bridge-crane','site-commissioning'],['ground:facility','installed'],['launch:vehicle','studio']]){
  viewer.setPart(catalog.byId[id],h,{}, {setting});assert(viewer.getState().available,id);
  for(const view of ['iso','front','side','top']){
   viewer.setView(view);checkPrecision(perspective);checkDepthBounds(selectedBounds(),perspective,id+' fits without near/far clipping');
   for(const reference of viewer.getState().scaleReferences){const stage=partScene.children.find(o=>o.userData.verificationSetting);checkDepthBounds(reference.bounds.clone().translate(stage.position),perspective,id+' reference remains inside the depth range');}
   checkedFits++;
  }
  viewer.setView('iso');paint();
  if(id==='ground:bridge-crane'){const d=distance(perspective);bridgeGain=depthStep(d,.00001,perspective.far)/depthStep(d,perspective.near,perspective.far);assert(bridgeGain>10000,'the broad crane regression no longer uses a microscopic near plane');}
  pointer('pointerdown',128,64);pointer('pointermove',140,69);pointer('pointerup',140,69);paint();checkPrecision(perspective);
  canvas.events.keydown({key:'ArrowRight',preventDefault(){}});paint();checkPrecision(perspective);checkDepthBounds(selectedBounds(),perspective,id+' preserves part depth after pan and rotation');checkedGestures+=2;
  wheel(-500);checkPrecision(perspective);checkedGestures++;
  // Zoom through the model: clipping stays finite and the inspection focus is
  // still visible. Surfaces crossed by the camera are legitimately clipped.
  viewer.setView('iso');wheel(-10000);checkPrecision(perspective);assert(perspective.near<=distance(perspective)*.1);checkedGestures++;
  viewer.setProjection('orthographic');paint();assert.equal(orthographic.near,.00001,'orthographic close-inspection behavior is unchanged');
  viewer.setProjection('perspective');wheel(10000);checkPrecision(perspective);checkDepthBounds(selectedBounds(),perspective,id+' retains depth coverage at maximum zoom out');checkedGestures++;
 }
 viewer.destroy();viewer=null;

 const mainHost=new Element(),sim=createSimulation(h);scene=createScene(mainHost);scene.setHardwareDetail('low');
 scene.setDomain('launcher','D');scene.setView('launch');scene.setBayView('overview',false);
 for(const [chapter,time] of [['integration',-3600],['pad',-8],['ascent',50]]){
  scene.setChapter(chapter);scene.update(h,sim.at(time));scene.resetCamera();firstCamera=null;paint();const camera=firstCamera;
  assert(camera?.isPerspectiveCamera);checkPrecision(camera);
  if(chapter==='integration'){const d=distance(camera);bayGain=depthStep(d,.07,camera.far)/depthStep(d,camera.near,camera.far);assert(bayGain>3);}
  if(chapter==='pad')assert(Math.abs(camera.near-Math.max(.07,distance(camera)*.01))<1e-8,'ground landscape clearance is preserved');
 }
 scene.setView('orbit');scene.setChapter('operations');scene.update(h,sim.at(6402));scene.resetCamera();firstCamera=null;paint();assert(firstCamera.isOrthographicCamera);assert.equal(firstCamera.near,.001,'orbital orthographic clipping is unchanged');
 assert.equal(JSON.stringify(h),before,'camera inspection never modifies engineering inputs');
 console.log(JSON.stringify({passed:true,checkedFits,checkedGestures,bridgeNearPrecisionGain:Math.round(bridgeGain),bayNearPrecisionGain:Number(bayGain.toFixed(2)),checks:['part and reference depth coverage','fit/pan/rotate/zoom','camera inside geometry','fixed-scale and extreme ranges','shared integration/launch path','unchanged orthographic paths']},null,2));
}finally{
 console.error=originalError;viewer?.destroy();scene?.destroy();
 T.PerspectiveCamera.prototype.updateProjectionMatrix=oldProjection;T.OrthographicCamera.prototype.updateProjectionMatrix=oldOrtho;T.Object3D.prototype.lookAt=oldLook;T.Scene.prototype.add=oldAdd;
}
