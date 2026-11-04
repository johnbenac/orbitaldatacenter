// The production scene can exercise its material mapper and camera controls in
// Node without a GPU. Separate rendering checks exercise the software rasterizer.
import assert from 'node:assert/strict';
import {sizeDesign} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {makeCraft} from './dist/craft.js';
import {makeLaunch} from './dist/launch-scene.js';
import {temperatureColor,thermalSkin,thermalScales} from './dist/thermal-view.js';
import {createScene} from './dist/scene.js';

const paint=new Proxy({}, {get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):
 ['createLinearGradient','createRadialGradient'].includes(k)?()=>({addColorStop(){}}):()=>{},set:()=>true});
class Element{
 constructor(){this.children=[];this.style={};this.events={};this.attributes={};this.width=160;this.height=100;}
 append(...children){this.children.push(...children);}
 replaceChildren(){this.children=[];}
 getBoundingClientRect(){return {width:this.width,height:this.height,left:0,top:0};}
 getClientRects(){return [this.getBoundingClientRect()];}
 getContext(kind){return kind==='2d'?paint:null;}
 addEventListener(k,f){this.events[k]=f;}
 setAttribute(k,v){this.attributes[k]=v;}
 removeEventListener(){} setPointerCapture(){} remove(){}
 toDataURL(){return 'data:image/jpeg;base64,';}
}
globalThis.document={createElement:()=>new Element(),createElementNS:()=>new Element()};
globalThis.ResizeObserver=class{observe(){}disconnect(){}};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
globalThis.window={devicePixelRatio:1};

const h=sizeDesign({}),sim=createSimulation(h),snap=sim.at(7800),q=snap.thermalQualification;
assert.equal(q.length,6);const craft=makeCraft(h),skin=thermalSkin(craft.root);
assert.deepEqual(skin.mappedNodes.sort(),q.map(r=>r.id).sort());
const initial=new Map();craft.root.traverse(o=>{if(o.isMesh)initial.set(o,o.material);});
skin.apply(q);
for(const [mesh,old] of initial){
 const id=mesh.userData.thermalNode;assert.notEqual(mesh.material,old);
 if(!id){const c=mesh.material.color;assert.equal(c.r,c.g);assert.equal(c.g,c.b);continue;}
 const cell=q.find(v=>v.id===id);
 assert.equal(mesh.material.color.getHex(),temperatureColor(cell.temperatureK));
 assert.equal(mesh.material.userData.hatch.value,Number(['hot','cold'].includes(cell.status)));
}
for(const [scale,stops] of Object.entries(thermalScales)){
 for(const [k,c] of stops)assert.equal(temperatureColor(k,scale),parseInt(c.slice(1),16));
 assert.equal(temperatureColor(0,scale),temperatureColor(stops[0][0],scale));assert.equal(temperatureColor(1000,scale),temperatureColor(stops.at(-1)[0],scale));
}
const battery=[...initial.keys()].find(m=>m.userData.thermalNode==='battery');
const oldColor=battery.material.color.getHex(),oldHatch=battery.material.userData.hatch.value;
skin.apply(q,1,'full');assert.notEqual(battery.material.color.getHex(),oldColor);
assert.equal(battery.material.color.getHex(),temperatureColor(snap.batteryK,'full'));assert.equal(battery.material.userData.hatch.value,oldHatch);

assert.equal(temperatureColor(-10),temperatureColor(180));assert.equal(temperatureColor(500),temperatureColor(380));
assert.equal(temperatureColor(NaN),null);
skin.destroy();for(const [mesh,old]of initial)assert.equal(mesh.material,old);
const launch=makeLaunch(h),stowed=thermalSkin(launch.root);assert.deepEqual(stowed.mappedNodes.sort(),['enclosure','radiator']);stowed.destroy();
const box=new Element(),picks=[],changes=[],scene=createScene(box,{onPick:id=>picks.push(id),onThermalScale:id=>changes.push(id)}),canvas=box.children[0];
function fire(type,x,y,id=1,button=0,pointerType='mouse'){
 let prevented=false;canvas.events[type]({clientX:x,clientY:y,pointerId:id,button,pointerType,preventDefault(){prevented=true;}});return prevented;
}
for(const view of ['spacecraft','core','orbit','launch']){
 scene.setView(view);scene.update(h,view==='launch'?sim.at(-2700):snap);scene.resetCamera();
 scene.setOverlays(['thermal']);const before=scene.getCameraState();
 assert(fire('pointerdown',42,35,10,1));fire('pointermove',66,39,10,1);fire('pointerup',66,39,10,1);const after=scene.getCameraState();
 assert.deepEqual(after[view].slice(0,3),before[view].slice(0,3));assert.notDeepEqual(after[view].slice(3),before[view].slice(3));
 for(const k of Object.keys(before).filter(k=>k!==view))assert.deepEqual(after[k],before[k]);
 scene.setView(view==='orbit'?'core':'orbit');scene.setView(view);assert.deepEqual(scene.getCameraState(),after);
 box.width+=10;box.height+=10;scene.resize();assert.deepEqual(scene.getCameraState(),after);
 scene.resetCamera();assert.deepEqual(scene.getCameraState()[view].slice(3),[0,0,0]);
 scene.setCameraState(after);assert.deepEqual(scene.getCameraState(),after);
}
assert.equal(picks.length,0);
scene.setView('core');scene.resetCamera();scene.update(h,snap);scene.setOverlays(['thermal']);
const legend=box.children.find(c=>c.attributes['aria-label']==='Thermal overlay legend');assert.equal(legend.hidden,false);
assert.equal(scene.getThermalScale(),'working');const [head,bar,ticks,key,clipped]=legend.children;
const [working,full]=head.children[0].children;
assert.deepEqual(ticks.children.map(e=>e.textContent),['≤245','257','269','281','293','≥305']);assert.match(clipped.textContent,/below 245 K/);
full.events.click();assert.equal(scene.getThermalScale(),'full');assert.deepEqual(changes,['full']);assert.equal(full.attributes['aria-pressed'],'true');assert.equal(ticks.children[0].textContent,'≤180');
scene.update(h,sim.at(4600));assert.equal(scene.getThermalScale(),'full');assert.equal(ticks.children.at(-1).textContent,'≥380');
scene.setThermalScale('working');assert.deepEqual(changes,['full']);assert.equal(working.attributes['aria-pressed'],'true');scene.setThermalScale('bogus');assert.equal(scene.getThermalScale(),'working');
scene.setLegendVisible(false);assert.equal(legend.hidden,true);scene.setLegendVisible(true);
fire('pointerdown',50,40,1,0,'touch');fire('pointerdown',92,40,2,0,'touch');fire('pointermove',115,48,2,0,'touch');fire('pointerup',115,48,2,0,'touch');fire('pointerup',50,40,1,0,'touch');
assert.equal(picks.length,0);const touched=scene.getCameraState().core;assert(touched[2]>1);assert(touched.slice(3).some(v=>v!==0));
canvas.events.wheel({deltaY:100,preventDefault(){}});assert(scene.getCameraState().core[2]<touched[2]);
canvas.events.keydown({key:'Home',preventDefault(){}});assert.deepEqual(scene.getCameraState().core.slice(2),[1,0,0,0]);
scene.setOverlays([]);assert.equal(legend.hidden,true);scene.destroy();
console.log('Six thermal node mappings, neutral surfaces, two fixed scales, live saturation flags, button callbacks, band hatching, both stowed nodes, material restoration and four-camera pan/zoom/resize/reset/restore passed.');
