import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {sizeDesign,missionStarter} from './dist/design.js';
import {architectureFamilies} from './dist/architecture-families.js';
import {buildPartsCatalog,resolveScenePart} from './dist/parts-catalog.js';
import {createPartModel,partObjectDescriptor,visiblePartObject} from './dist/part-model.js';
import {canvas as testCanvas} from './render-test-canvas.mjs';

function canvas(){const c=testCanvas(),get=c.getContext;c.getContext=type=>type==='2d'?get():null;c.style={};c.addEventListener=c.removeEventListener=c.setAttribute=c.remove=()=>{};c.toDataURL=()=>'';return c;}
globalThis.document={hidden:false,createElement:tag=>tag==='canvas'?canvas():{append(){},style:{}},addEventListener(){},removeEventListener(){}};
const input=missionStarter('text'),h=sizeDesign(input),catalog=buildPartsCatalog(h),before=JSON.stringify(h);
const model=createPartModel(h,'flight'),other=createPartModel(h,'flight'),array=catalog.byId['flight:02.01'];
model.pose(array);other.pose(array);const one=model.select(array),two=other.select(array);assert(one.available&&two.available);
const bounds=meshes=>{const b=new T.Box3();for(const o of meshes)if(visiblePartObject(o))b.union(new T.Box3().setFromObject(o));return b;};
const deployed=bounds(one.meshes);model.pose(array,0,'deployment');const stowed=bounds(one.meshes);assert(deployed.getSize(new T.Vector3()).length()>stowed.getSize(new T.Vector3()).length(),'existing deployment geometry must change extent');
assert.deepEqual(bounds(two.meshes).toArray?.()||bounds(two.meshes),deployed,'a parts animation cannot move another factory');
for(let i=0;i<one.meshes.length;i++)if(!one.meshes[i].geometry.userData.shared)assert.notEqual(one.meshes[i].geometry,two.meshes[i].geometry,'dynamic UV geometry must be private');
const shared=one.meshes.flatMap(o=>[o.geometry,...[].concat(o.material)]).filter(o=>o.userData.shared);let sharedDisposals=0;for(const object of shared)object.addEventListener('dispose',()=>sharedDisposals++);
const unknown={id:'missing',render:{family:'flight',names:['Not an installed component']}};assert.equal(model.select(unknown).available,false,'unmatched selector must not show a substitute assembly');
const unavailable={...array,render:{family:'flight',unavailable:true,unavailableReason:'Allocated quantity only'}};assert.equal(model.select(unavailable).geometryStatus,'Allocated quantity only');
for(const family of Object.keys(architectureFamilies)){
 const hardware=sizeDesign({...input,architectureFamily:family}),records=buildPartsCatalog(hardware),flight=createPartModel(hardware,'flight');
 for(const id of ['flight:01.01','flight:01.02','flight:01.03','flight:02.01','flight:02.02','flight:03.01','flight:04.01','flight:04.02','flight:05.02','flight:05.03','flight:06.01','flight:06.03','flight:06.04','flight:07.01','flight:07.02','flight:08.01']){const record=records.byId[id];flight.pose(record);assert(flight.select(record).available,family+' '+id);}
 const fuel=records.byId['flight:06.03'];flight.pose(fuel);const source=flight.select(fuel).meshes[0];assert(resolveScenePart(records,partObjectDescriptor(source,flight))?.id.startsWith('flight:06.03'),'vessel selection retains fuel/oxidizer identity');
 flight.dispose();
}
const launch=createPartModel(h,'launch',()=>{},{gpu:false});assert.equal(launch.factory.ground.environment.status,'ready');assert.equal(launch.factory.ground.environment.labels().length,0,'isolated viewer must not initialize geographic panorama');
for(const id of ['launch:vehicle','launch:core','launch:fairing','ground:checkout','ground:thermal','ground:lifting-yoke','ground:lifting-frame','ground:transfer-support','site:launch-position','site:utility-distribution']){const record=catalog.byId[id];assert(record,id);launch.pose(record);assert(launch.select(record).available,id);}
const thermal=catalog.byId['ground:thermal'];launch.pose(thermal);const thermalSelection=launch.select(thermal);assert(thermalSelection.meshes.some(o=>o.name==='Ground conditioning pump'));launch.pose(catalog.byId['ground:power']);assert.equal(thermalSelection.meshes.filter(visiblePartObject).length,0,'station cache cannot leak an inactive checkout station');
for(const id of ['ground:thermal','ground:power','ground:checkout']){
 launch.detail.clear();const record=catalog.byId[id];launch.pose(record);const selected=launch.select(record);launch.detail.prepare({meshes:selected.meshes});const stats=launch.detail.stats();
 assert(stats.activeHigh+stats.activeMedium>0,id+' newly created station geometry must support detailed inspection');
 assert(stats.triangles<=stats.budget.triangles&&stats.drawCalls<=stats.budget.drawCalls,id+' stays inside thumbnail resource limits');
 assert.deepEqual(launch.select(record).meshes,selected.meshes,'generated inspection features never grow the MEL geometry selection');
 let detail;for(const source of selected.meshes)source.traverse(o=>{if(o.isMesh&&o.userData.hardwareDetail)detail=o;});
 assert(detail?.hardwareDetailSource,'station detail keeps an authoritative source for picking');assert.deepEqual(partObjectDescriptor(detail,launch),partObjectDescriptor(detail.hardwareDetailSource,launch),'inspection details navigate to the existing component');
}
model.dispose();other.dispose();launch.dispose();assert.equal(sharedDisposals,0,'shared material/geometry resources survive part lifecycle');assert.equal(JSON.stringify(h),before,'part exploration cannot modify the design or mass ledger');

const {createPartViewer}=await import('./dist/part-viewer.js');
const originalError=console.error;console.error=()=>{};
let viewer;try{viewer=createPartViewer({append(){}},{offscreen:true,width:128,height:96});}finally{console.error=originalError;}
viewer.setPart(catalog.byId['flight:06.03'],h);assert(viewer.getState().available);
assert.equal(viewer.getState().detailMode,'high','focused inspection and static thumbnails default to bounded high detail');
assert(viewer.getState().detailStats.activeHigh+viewer.getState().detailStats.activeMedium>0,'selected hardware receives a real detailed variant');
const detailPixels=Uint8ClampedArray.from(viewer.captureFrame({width:256,height:192}).frame.data),detailStats=viewer.getState().detailStats;
assert(detailStats.triangles<=detailStats.budget.triangles&&detailStats.drawCalls<=detailStats.budget.drawCalls,'software thumbnails obey geometry and draw-call ceilings');
viewer.setDetail('low');assert.equal(viewer.getState().detailStats.triangles,0);assert.equal(viewer.getState().detailStats.activeHigh+viewer.getState().detailStats.activeMedium,0);
const overviewPixels=viewer.captureFrame({width:256,height:192}).frame.data;assert(detailPixels.some((v,i)=>v!==overviewPixels[i]),'high detail changes the actual rendered part, not just its status label');
viewer.setDetail('high');const stableRevision=viewer.getState().detailStats.revision;viewer.captureFrame({width:256,height:192});assert.equal(viewer.getState().detailStats.revision,stableRevision,'a stable inspection frame does not rebuild geometry');
const coverage=pixels=>{let n=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])n++;return n;};
viewer.setMode('solid');const solidCoverage=coverage(viewer.captureFrame({width:512,height:384}).frame.data);
viewer.setMode('wireframe');const wirePixels=Uint8ClampedArray.from(viewer.captureFrame({width:512,height:384}).frame.data),wireCoverage=coverage(wirePixels);
assert(wireCoverage>0&&wireCoverage<solidCoverage*.9,'parts wireframe exposes open triangle interiors instead of a solid cyan model');
viewer.setDetail('low');const coarseWirePixels=viewer.captureFrame({width:512,height:384}).frame.data;assert(wirePixels.some((v,i)=>v!==coarseWirePixels[i]),'wireframe reveals the selected high-detail mesh’s additional geometry');viewer.setDetail('high');
viewer.setMode('materials');viewer.setContext(true);viewer.setProjection('orthographic');viewer.setView('side');
const appearance=viewer.beginCaptureAppearance({lighting:'realistic',exposureEV:1,guides:false});const image=viewer.captureFrame({width:256,height:192});assert.equal(image.width,256);assert.equal(image.height,192);assert(image.frame?.data.some(v=>v>0),'actual geometry must rasterize into the capture');appearance.release();assert.equal(viewer.captureSettings().exposureEV,0,'capture overrides cannot leak into viewer defaults');
viewer.setPart(array,h);viewer.setAnimation('deployment');viewer.setProgress(.4);viewer.setAnimation('deployment');assert.equal(viewer.getState().progress,.4,'resuming keeps animation position');const release=viewer.holdPlayback();release();release();
let frames=0;const recording=viewer.beginRecording({width:128,height:96,onFrame:frame=>{assert(frame.width>0);frames++;}});assert(frames>=1);recording.release();recording.release();viewer.destroy();viewer.destroy();assert.equal(sharedDisposals,0);
// Exercise a visible on-demand viewport as well as the offscreen capture path.
// An LOD wake must request one settled frame and leave the browser idle again.
let scheduledFrames=0;globalThis.window={devicePixelRatio:1};globalThis.requestAnimationFrame=fn=>{scheduledFrames++;return setTimeout(()=>fn(performance.now()),0);};globalThis.cancelAnimationFrame=clearTimeout;
console.error=()=>{};let visibleViewer;try{visibleViewer=createPartViewer({append(){},getBoundingClientRect:()=>({width:192,height:144})});}finally{console.error=originalError;}
visibleViewer.setPart(catalog.byId['flight:06.03'],h);await new Promise(resolve=>setTimeout(resolve,500));assert.equal(visibleViewer.getState().detailStats.pending,0);const settledFrames=scheduledFrames;
await new Promise(resolve=>setTimeout(resolve,240));assert.equal(scheduledFrames,settledFrames,'completed refinement and its notifier leave the parts viewport idle');
const previewAppearance=visibleViewer.beginCaptureAppearance({lighting:'studio'});let previewChanges=0,previewFrames=0,previewTimer=null;
function drawPreview(){previewFrames++;visibleViewer.captureFrame({width:192,height:144});}
const stopPreview=previewAppearance.onChange(()=>{previewChanges++;if(!previewTimer)previewTimer=setTimeout(()=>{previewTimer=null;drawPreview();},0);});
drawPreview();const previewRevision=visibleViewer.captureStatus().revision;await new Promise(resolve=>setTimeout(resolve,460));
assert.equal(previewChanges,0,'capturing the unchanged preview cannot trigger recurring appearance notifications');assert.equal(previewFrames,1,'capture-frame callbacks do not feed a deferred-wake render loop');assert.equal(visibleViewer.captureStatus().revision,previewRevision,'an unchanged capture preview keeps a stable revision');
stopPreview();previewAppearance.release();if(previewTimer)clearTimeout(previewTimer);visibleViewer.destroy();
console.log('Parts viewer: actual geometry across 7 families, live station isolation, private poses, selection identity, capture overrides, recording, idle rendering and resource lifecycle passed.');
