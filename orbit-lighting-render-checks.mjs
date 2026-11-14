// Inspect the production light objects as well as the software-rendered passes.
// No playback clock is running: seeks and mode changes must repaint on their own.
import assert from 'node:assert/strict';
import {Object3D,Vector3} from './dist/vendor/three.module.js';
import {canvas as rasterCanvas} from './render-test-canvas.mjs';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {sizeDesign} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {createScene} from './dist/scene.js';

class Element{
 constructor(){this.children=[];this.style={};this.dataset={};this.events={};this.attributes={};this.width=160;this.height=100;}
 append(...children){this.children.push(...children);}
 replaceChildren(){this.children=[];}
 getBoundingClientRect(){return {width:this.width,height:this.height,left:0,top:0};}
 getClientRects(){return [this.getBoundingClientRect()];}
 addEventListener(k,f){this.events[k]=f;}
 setAttribute(k,v){this.attributes[k]=v;}
 removeEventListener(){} setPointerCapture(){} remove(){}
 toDataURL(){return 'data:image/jpeg;base64,';}
}
function createElement(tag){
 const el=new Element();if(tag!=='canvas')return el;
 const backing=rasterCanvas(),ctx=backing.getContext('2d');
 Object.assign(backing,el);Object.setPrototypeOf(backing,Element.prototype);
 backing.getContext=kind=>kind==='2d'?ctx:null;
 return backing;
}
globalThis.document={createElement,createElementNS:(_,tag)=>createElement(tag)};
globalThis.ResizeObserver=class{observe(){}disconnect(){}};
let pendingFrame;globalThis.requestAnimationFrame=fn=>{pendingFrame=fn;return 1};globalThis.cancelAnimationFrame=()=>{};
globalThis.window={devicePixelRatio:1};

const hardware=sizeDesign(buildReferenceDesign('redwire-8kw',{missionCase:'common'}));
const sim=createSimulation(hardware),day=sim.at(7800),night=sim.at(6402);
assert.equal(day.eclipse,false);assert.equal(night.eclipse,true);assert.equal(night.solarKW,0);
const physical=JSON.stringify([day,night]),host=new Element();
let foreground;
const add=Object3D.prototype.add;
Object3D.prototype.add=function(...children){
 if(this.isScene&&children.some(o=>o.isHemisphereLight))foreground=this;
 return add.apply(this,children);
};
let viewer;
try{viewer=createScene(host);}finally{Object3D.prototype.add=add;}
assert(foreground,'Inspect the production foreground scene');
const canvas=host.children[0],ctx=canvas.getContext('2d'),drawImage=ctx.drawImage;
let passes=[],camera;
ctx.drawImage=(...args)=>{drawImage(...args);passes.push(canvas.frame.data.slice());};
function paint(){
 passes=[];assert(pendingFrame,'A paused state or mode change must request a paint');
 const lookAt=Object3D.prototype.lookAt;
 Object3D.prototype.lookAt=function(...args){if(this.isCamera&&!camera)camera=this;return lookAt.apply(this,args);};
 try{const frame=pendingFrame;pendingFrame=null;camera=null;frame();}
 finally{Object3D.prototype.lookAt=lookAt;}
 return passes;
}
function lights(studio){
 const directional=foreground.children.filter(o=>o.isDirectionalLight),[sun,,softbox,bounce]=directional;
 assert.equal(directional.length,4);
 assert.equal(sun.intensity,night.eclipse?0:3.2);
 assert.equal(softbox.visible,studio);assert.equal(bounce.visible,studio);
 if(studio){
  const eye=camera.getWorldDirection(new Vector3()).negate();
  for(const light of [softbox,bounce]){
   assert(light.intensity>1,'Studio fills need real nonzero WebGL intensity');
   const direction=light.getWorldPosition(new Vector3()).sub(light.target.getWorldPosition(new Vector3())).normalize();
   assert(direction.dot(eye)>.5,'Studio fills must follow the visible camera hemisphere');
  }
 }
}
// Keep the article geometry fixed while comparing lighting pixels. Automatic
// detail refinement may add legitimate hardware between successive frames.
viewer.setHardwareDetail('low');viewer.setDomain('conops','E');viewer.setChapter('operations');
for(const view of ['spacecraft','core']){
 viewer.setView(view);viewer.update(hardware,night);viewer.setLightingMode('realistic');
 const [sky,dark]=paint();lights(false);
 viewer.setLightingMode('auto');const [autoSky,autoLit]=paint();lights(true);
 assert.deepEqual(autoSky,sky,'Inspection lights must preserve Earth and the sky');
 let brightened=0;
 for(let i=0;i<dark.length;i+=4)if(autoLit[i]+autoLit[i+1]+autoLit[i+2]>dark[i]+dark[i+1]+dark[i+2]+60)brightened++;
 assert(brightened>75,`${view}: Auto must visibly reveal the eclipsed spacecraft (${brightened} pixels)`);
 viewer.setLightingMode('studio');assert.deepEqual(paint()[1],autoLit,'Auto and explicit Studio use identical rendering');
 viewer.setLightingMode('auto');viewer.update(hardware,day);const sunlit=paint();
 viewer.setLightingMode('realistic');assert.deepEqual(paint(),sunlit,'Auto leaves Studio at eclipse exit');
 viewer.setLightingMode('auto');viewer.update(hardware,night);assert.deepEqual(paint()[1],autoLit,'A paused seek into eclipse must activate Studio');lights(true);
 console.log(`${view}: Auto reveals ${brightened} pixels and matches explicit Studio at eclipse entry.`);
}

// Rotation and pan must not leave the camera-relative fills pointing away.
for(const [key,shiftKey] of [['ArrowRight',false],['ArrowUp',false],['q',false],['ArrowLeft',true]]){
 canvas.events.keydown({key,shiftKey,preventDefault(){}});paint();lights(true);
}
const settings=viewer.captureSettings(),viewState=viewer.getCameraState(),baseline=passes.map(p=>p.slice());
const capture=viewer.beginCaptureAppearance({lighting:'realistic',exposureEV:-1});
paint();lights(false);
assert.equal(foreground.userData.exposureEV,-1);
assert.deepEqual(viewer.captureSettings(),settings,'Capture lighting must not alter working preferences');
capture.update({lighting:'studio',exposureEV:0});paint();lights(true);
capture.release();assert.deepEqual(paint(),baseline,'Closing capture restores the working Auto image');
assert.deepEqual(viewer.getCameraState(),viewState,'Lighting must not alter the chosen camera');
assert.equal(JSON.stringify([day,night]),physical,'Display lighting must not change solar or thermal telemetry');
viewer.destroy();
console.log('Paused eclipse transitions, actual THREE fill directions/intensities, camera turns, isolated capture lighting, backgrounds and physical telemetry passed.');
