// Exercise the production scene, camera controls and CPU lighting passes without a GPU.
import assert from 'node:assert/strict';
import {Object3D,Vector3} from './dist/vendor/three.module.js';
import {canvas as rasterCanvas} from './render-test-canvas.mjs';
import {sizeDesign} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {makeCraft} from './dist/craft.js';
import {makeLaunch} from './dist/launch-scene.js';
import {groundProcessingState} from './dist/ground-processing.js';
import {temperatureColor,thermalSkin,thermalScales} from './dist/thermal-view.js';
import {createScene} from './dist/scene.js';

class Element{
 constructor(){this.children=[];this.style={};this.events={};this.attributes={};this.width=160;this.height=100;}
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
scene.setOverlays([]);assert.equal(legend.hidden,true);

// Inspect the two actual software-rendered passes separately. A global exposure
// change could make the vehicle brighter while also incorrectly relighting Earth.
const ctx=canvas.getContext('2d'),copy=ctx.drawImage;
let passes=[];
ctx.drawImage=(...args)=>{copy(...args);passes.push(canvas.frame.data.slice());};
function paintFrame(){
 passes=[];assert.ok(pendingFrame,'Viewer should request a paint');const paint=pendingFrame;pendingFrame=null;paint();
 return passes;
}
// Read the camera actually used by the renderer. The saved zoom multiplier can
// remain constant even when automatic fitting changes the projected scale.
function cameraFrame(){
 const lookAt=Object3D.prototype.lookAt;let camera,pivot;
 Object3D.prototype.lookAt=function(target,...args){
  if(!camera&&this.isCamera){camera=this;pivot=target.clone()}
  return lookAt.call(this,target,...args);
 };
 try{paintFrame()}finally{Object3D.prototype.lookAt=lookAt}
 assert.ok(camera,'Expected the scene camera to aim at a pivot');
 const eye=camera.position.clone(),radius=eye.distanceTo(pivot);
 const height=2*(camera.isPerspectiveCamera?radius:1)/camera.projectionMatrix.elements[5];
 const right=new Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new Vector3().setFromMatrixColumn(camera.matrixWorld,1);
 return {eye,pivot,radius,height,right,up,orthographic:camera.isOrthographicCamera===true};
}
scene.setBayView('overview',false);
for(const [view,chapter,t,phase] of [['spacecraft','operations',6402,'E'],['spacecraft','commissioning',1700,'E'],['spacecraft','operations',1700,'C'],['launch','integration',-1500,'D']]){
 scene.setDomain('conops',phase);scene.setChapter(chapter);scene.setView(view);scene.update(h,sim.at(t));scene.resetCamera();
 const fit=cameraFrame();
 canvas.events.wheel({deltaY:-140,preventDefault(){}});const zoomed=cameraFrame();
 assert.ok(zoomed.height<fit.height,`${chapter}: wheel zoom must reduce the rendered span`);
 // Keep an off-centre target so that rotating around a freshly fitted origin also fails.
 fire('pointerdown',40,50,1,1);fire('pointermove',54,61,1,1);fire('pointerup',54,61,1,1);
 const panned=cameraFrame();assert.ok(panned.pivot.distanceTo(zoomed.pivot)>1e-3);
 const y=chapter==='integration'?-125:97;
 fire('pointerdown',canvas.width/2,canvas.height/2);fire('pointermove',139,y);fire('pointerup',139,y);
 const rotated=cameraFrame();
 assert.ok(rotated.eye.distanceTo(panned.eye)>1,`${chapter}: the drag must rotate the camera`);
 assert.ok(Math.abs(rotated.height/panned.height-1)<1e-8,`${chapter}: drag changed the visible span from ${panned.height} to ${rotated.height}`);
 assert.ok(Math.abs(rotated.radius/panned.radius-1)<1e-8,`${chapter}: drag changed the orbit radius`);
 assert.ok(rotated.pivot.distanceTo(panned.pivot)<1e-8,`${chapter}: drag moved the pan target`);
}
// A processing rehearsal must preserve the full Work area camera range. The
// closeout station is the same hardware with and without its rehearsal enabled.
scene.setDomain('launcher','D');scene.setChapter('integration');scene.setView('launch');scene.update(h,sim.at(-3599));
scene.setProcessingState(null);scene.resetCamera();const fullBay=cameraFrame();
scene.setProcessingState({...groundProcessingState(h,'closeout',0),enabled:true});const rehearsalBay=cameraFrame();
assert(Math.abs(rehearsalBay.height/fullBay.height-1)<1e-8,'Processing shortened the Work area zoom range');
assert(rehearsalBay.pivot.distanceTo(fullBay.pivot)<1e-8,'Processing moved the Work area target');
for(let i=0;i<4;i++)canvas.events.wheel({deltaY:1000,preventDefault(){}});
const distantBay=cameraFrame();
assert.equal(scene.getCameraState().bay[2],.25,'Integration keeps the original finite zoom-out limit');
assert(Math.abs(distantBay.height/fullBay.height-4)<1e-8,'Integration cannot reach its original maximum visible span');
canvas.events.wheel({deltaY:-140,preventDefault(){}});assert(cameraFrame().height<distantBay.height,'Integration must zoom back in from its limit');
scene.setProcessingState(null);scene.resetCamera();
console.log('Processing preserves full Work area framing and the original finite integration zoom range.');
// Drag the right-hand rim down to six o'clock. The physical canvas is resized
// above, so derive the three pointer positions from the actual viewport.
function rimDrag(){
 const x=canvas.width/2,y=canvas.height/2,r=.47*Math.min(canvas.width,canvas.height);
 fire('pointerdown',x+r,y);fire('pointermove',x+r/Math.SQRT2,y+r/Math.SQRT2);
 fire('pointermove',x,y+r);fire('pointerup',x,y+r);
}
const closeVector=(a,b)=>a.distanceTo(b)<1e-7;
for(const view of ['core','spacecraft','orbit']){
 scene.setDomain('compute','E');scene.setChapter('operations');scene.setView(view);scene.update(h,snap);scene.resetCamera();
 canvas.events.wheel({deltaY:-115,preventDefault(){}});
 // Offset the pivot to catch a roll that orbits a newly fitted center.
 fire('pointerdown',50,50,1,1);fire('pointermove',57,56,1,1);fire('pointerup',57,56,1,1);
 const initial=cameraFrame(),legacy=scene.getCameraState()[view].slice(0,6);
 rimDrag();const rolled=cameraFrame(),saved=JSON.parse(JSON.stringify(scene.getCameraState()));
 assert(closeVector(initial.eye,rolled.eye)&&closeVector(initial.pivot,rolled.pivot),view+': rim roll moved the sightline');
 assert(Math.abs(rolled.height/initial.height-1)<1e-8,view+': rim roll changed zoom');
 assert(closeVector(rolled.right,initial.up),view+': clockwise quarter-turn should map screen up to screen right');
 if(view==='core'){
  assert(Math.abs(initial.right.z)<1e-7&&initial.up.z>.5,'Expected longitudinal body Z to start visibly upright');
  assert(Math.abs(rolled.up.z)<1e-7&&rolled.right.z>.5,'Orbital core thrust axis should project horizontally');
  const cx=canvas.width/2,cy=canvas.height/2;
  fire('pointerdown',cx,cy);fire('pointermove',cx+21,cy-10);fire('pointerup',cx+21,cy-10);
  const tumble=cameraFrame();assert(tumble.eye.distanceTo(rolled.eye)>1);
  assert(closeVector(tumble.pivot,rolled.pivot)&&Math.abs(tumble.radius/rolled.radius-1)<1e-8);
 }
 scene.setCameraState({[view]:legacy});
 const restoredLegacy=cameraFrame();assert(closeVector(restoredLegacy.up,initial.up)&&closeVector(restoredLegacy.eye,initial.eye));
 scene.setCameraState(saved);
 const restored=cameraFrame();assert(closeVector(restored.up,rolled.up)&&closeVector(restored.eye,rolled.eye));
 scene.resetCamera();
}
// The launch camera serves both space and Earth. Scrub back into the bay, onto
// the pad and through high ascent after a roll in orbital insertion.
scene.setDomain('launcher','D');scene.setView('launch');scene.setChapter('insertion');scene.update(h,sim.at(700));scene.resetCamera();
const insertion=cameraFrame();rimDrag();const rolledInsertion=cameraFrame();assert(closeVector(rolledInsertion.right,insertion.up));
for(const [chapter,t] of [['integration',-1500],['pad',-8],['ascent',450]]){
 scene.setChapter(chapter);scene.update(h,sim.at(t));const ground=cameraFrame();
 assert(Math.abs(ground.right.y)<1e-7&&ground.up.y>0,chapter+': entering this view inherited a roll');
 rimDrag();const moved=cameraFrame();assert(Math.abs(moved.right.y)<1e-7&&moved.up.y>0,chapter+': vertical tilted under an edge drag');
 assert(moved.eye.distanceTo(ground.eye)>1e-3,chapter+': ground orbit stopped responding');
}
scene.setChapter('insertion');scene.update(h,sim.at(700));
const returned=cameraFrame();
scene.setCameraState({launch:scene.getCameraState().launch.slice(0,6)});
const withoutRoll=cameraFrame();
assert(closeVector(returned.right,withoutRoll.up)&&closeVector(returned.eye,withoutRoll.eye),'Returning from Earth lost the orbital roll');
scene.resetCamera();
console.log('Orbital center tumble, viewport-rim roll, horizontal core axis, locked terrestrial vertical and camera-state compatibility passed.');
// Both projections follow the same payload station. End-on looks along its
// launch axis and side elevation is perpendicular, with no perspective distortion.
scene.setDomain('mechanical','D');scene.setView('launch');scene.setChapter('integration');scene.update(h,sim.at(-3600));
scene.setBayView('endOn',false);const endOn=cameraFrame();
scene.setBayView('sideOn',false);const sideOn=cameraFrame();
assert(endOn.orthographic&&sideOn.orthographic);
assert(endOn.pivot.distanceTo(sideOn.pivot)<1e-7);
assert(Math.abs(endOn.eye.clone().sub(endOn.pivot).normalize().dot(sideOn.eye.clone().sub(sideOn.pivot).normalize()))<1e-6);
scene.setBayView('overview',false);
// Semantic flight vectors are present by default. They follow geometric visibility
// even without an acquired link, and a saved off state survives camera changes.
const vectorLabels=()=>box.children.flatMap(e=>e.children||[]).map(e=>e.attributes?.['data-orbit-vector']).filter(Boolean);
scene.setDomain('conops','E');scene.setView('spacecraft');scene.setChapter('operations');scene.resetCamera();
const visiblePass=sim.events(2200,86400).find(e=>e.type==='contact'&&e.start>2200);
const passState={...sim.at((visiblePass.start+visiblePass.end)/2),goodputMbps:0,acquired:false};
scene.update(h,passState);paintFrame();assert.deepEqual(vectorLabels().sort(),['station','sun','velocity']);
scene.setOrbitVectors(false);paintFrame();assert.equal(vectorLabels().length,0);
scene.setView('core');scene.update(h,passState);paintFrame();assert.equal(vectorLabels().length,0);
scene.setOrbitVectors(true);paintFrame();assert(vectorLabels().includes('station'));
scene.setView('launch');scene.update(h,sim.at(-300));paintFrame();assert(!vectorLabels().length);
scene.setView('spacecraft');scene.update(h,sim.at(6402));paintFrame();assert(!vectorLabels().includes('station'));
const shadow=sim.at(6402),original=structuredClone(shadow);
assert.ok(shadow.eclipse);assert.equal(shadow.solarKW,0);
scene.setDomain('conops','E');scene.setChapter('operations');scene.setView('spacecraft');scene.update(h,shadow);
scene.setLightingMode('realistic');
for(const view of ['spacecraft','core']){
 scene.setView(view);scene.resetCamera();
 const [earth,dark]=paintFrame(),camera=scene.getCameraState();
 assert.ok(earth.some(v=>v!==0));assert.ok(dark);
 scene.setLightingMode('studio');
 const [sameEarth,lit]=paintFrame();
 assert.deepEqual(sameEarth,earth,'Studio must preserve the Earth, atmosphere and stars');
 let revealed=0;
 for(let i=0;i<lit.length;i+=4){
  if(lit[i]+lit[i+1]+lit[i+2]>dark[i]+dark[i+1]+dark[i+2]+75)revealed++;
 }
 assert.ok(revealed>100,`${view}: only ${revealed} appreciably brighter pixels in eclipse`);
 scene.setLightingMode('auto');const [autoEarth,autoLit]=paintFrame();
 assert.deepEqual(autoEarth,earth,'Auto eclipse lighting must preserve the physical background');
 assert.deepEqual(autoLit,lit,'Auto in eclipse must use the actual Studio rendering path');
 scene.setLightingMode('realistic');const [,restored]=paintFrame();assert.deepEqual(restored,dark);
 assert.deepEqual(scene.getCameraState(),camera);
 console.log(`${view}: ${revealed} pixels brightened by more than 25 mean RGB levels at MET +6402 s.`);
}
// Auto responds to time changes while remaining selected. Compare actual pixels
// with the corresponding explicit mode at each instant, including both edges.
scene.setView('spacecraft');scene.resetCamera();
const sunlit=sim.at(7800),sunlitOriginal=structuredClone(sunlit);assert.equal(sunlit.eclipse,false);
scene.update(h,sunlit);scene.setLightingMode('realistic');const dayReference=paintFrame(),autoCamera=scene.getCameraState();
scene.setLightingMode('auto');assert.deepEqual(paintFrame(),dayReference,'Auto in sunlight must match Realistic');
scene.update(h,shadow);const automaticNight=paintFrame();
scene.setLightingMode('studio');assert.deepEqual(paintFrame(),automaticNight,'Auto must enter Studio when the advancing state enters eclipse');
scene.setLightingMode('auto');scene.update(h,sunlit);const automaticDay=paintFrame();
scene.setLightingMode('realistic');assert.deepEqual(paintFrame(),automaticDay,'Auto must return to Realistic when the state leaves eclipse');
assert.deepEqual(scene.getCameraState(),autoCamera,'Lighting changes must not alter free camera controls');
assert.deepEqual(sunlit,sunlitOriginal,'Auto must preserve sunlit mission telemetry');
assert.deepEqual(shadow,original,'Auto must preserve eclipsed mission telemetry');
scene.update(h,shadow);
scene.setOverlays(['thermal']);
const [,thermal]=paintFrame(),colors=shadow.thermalQualification.map(q=>temperatureColor(q.temperatureK));
scene.setLightingMode('studio');const [earthAtZero,thermalStudio]=paintFrame();
scene.setExposureEV(1);const [earthPlus,thermalPlus]=paintFrame();
assert.notDeepEqual(earthPlus,earthAtZero,'Raising camera exposure must also affect the orbital background');
scene.setExposureEV(0);assert.deepEqual(paintFrame()[1],thermalStudio,'Returning to 0 EV restores the image');
let measuredPixels=0;
for(let i=0;i<thermal.length;i+=4){
 const rgb=(thermal[i]<<16)|(thermal[i+1]<<8)|thermal[i+2];
 if(thermal[i+3]===255&&colors.includes(rgb)){
  measuredPixels++;
  for(const frame of [thermalStudio,thermalPlus])assert.equal((frame[i]<<16)|(frame[i+1]<<8)|frame[i+2],rgb);
 }
}
assert.ok(measuredPixels>20,'Both frames must include visible calibrated thermal surfaces');
assert.deepEqual(shadow,original,'Changing lights must preserve all mission telemetry');
scene.setOverlays([]);scene.setView('orbit');scene.resetCamera();
const [studioSky,studioMap]=paintFrame();scene.setLightingMode('realistic');const [realSky,realMap]=paintFrame();
assert.deepEqual(studioSky,realSky,'Studio mode preserves the inertial sky in Earth Orbit');
let changed=0;for(let i=0;i<studioMap.length;i+=4){
 if(realMap[i]!==studioMap[i]||realMap[i+1]!==studioMap[i+1]||realMap[i+2]!==studioMap[i+2])changed++;
}
assert.ok(changed>0&&changed<40,`Only the orbital vehicle marker should change (${changed} altered pixels)`);
scene.setLightingMode('auto');const [autoSky,autoMap]=paintFrame();
assert.deepEqual(autoSky,studioSky);assert.deepEqual(autoMap,studioMap,'Auto in eclipse lights only the orbital locator in the globe view');
scene.setLightingMode('studio');scene.setDomain('launcher','D');scene.setChapter('pad');scene.setView('launch');scene.update(h,sim.at(-8));
const [ground]=paintFrame();scene.setLightingMode('realistic');
if(!pendingFrame)scene.resize();
assert.deepEqual(paintFrame()[0],ground,'Studio preference must not relight a launch pad');
scene.setLightingMode('auto');assert.deepEqual(paintFrame()[0],ground,'Auto must not relight a launch pad');
scene.destroy();
console.log('Auto rendering matches Realistic in sunlight and Studio in eclipse, switches on the mission clock, preserves physical backgrounds and telemetry, and retains the camera.');
console.log('Six thermal node mappings, neutral surfaces, two fixed scales, live saturation flags, button callbacks, band hatching, both stowed nodes, material restoration and four-camera pan/zoom/resize/reset/restore passed.');
