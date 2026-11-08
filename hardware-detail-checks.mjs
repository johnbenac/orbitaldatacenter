import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {createHardwareDetail,hardwareDetailTier,hardwareDetailBudget,detailSource} from './dist/hardware-detail.js';
import {createPartModel} from './dist/part-model.js';
import {buildPartsCatalog} from './dist/parts-catalog.js';
import {missionStarter,sizeDesign} from './dist/design.js';
import {canvas} from './render-test-canvas.mjs';
globalThis.document={createElement:()=>canvas()};

let clock=0;
function hardware(root,name,x=0,y=0,z=0){
 const geometry=new T.BoxGeometry(1,.5,.7),material=new T.MeshStandardMaterial({color:'#a7b6bb',metalness:.5,roughness:.5}),mesh=new T.Mesh(geometry,material);
 mesh.name=name;mesh.userData={part:name,materialRole:'electronics-case'};mesh.position.set(x,y,z);root.add(mesh);return {mesh,geometry,material};
}
function budgetCheck(detail){const s=detail.stats();assert(s.triangles<=s.budget.triangles,'triangle cap');assert(s.drawCalls<=s.budget.drawCalls,'draw-call cap');assert(s.activeHigh+s.activeMedium<=s.budget.models,'active model cap');assert(s.cacheBytes<=s.budget.cacheBytes,'geometry byte cap');assert(s.cachedModels<=s.budget.cacheModels,'geometry cache count cap');return s;}
function settle(detail,options={},limit=160){for(let n=0;n<limit;n++){detail.update({...options,force:true,now:clock+=200});const s=budgetCheck(detail);if(!s.pending)return n+1;}assert.fail('stationary view must finish refinement and stop requesting frames');}
const tier=mesh=>mesh.children.find(o=>o.userData.hardwareDetail)?.userData.detailTier||'low';

assert.equal(hardwareDetailTier({pixels:90,focused:true,current:'low'}),'medium');
assert.equal(hardwareDetailTier({pixels:90,focused:true,current:'high'}),'high','a small reverse zoom preserves an active high tier');
assert.equal(hardwareDetailTier({pixels:100,current:'low'}),'low');
assert.equal(hardwareDetailTier({pixels:100,current:'medium'}),'medium','medium tier has a distinct exit threshold');
assert.equal(hardwareDetailTier({pixels:8,focused:true,mode:'high'}),'low','selection never forces invisible-size scene geometry');
assert.equal(hardwareDetailTier({pixels:800,thermal:true}),'low','temperature mode suppresses decorative surfaces');
for(const pixels of [0,2,4])assert.equal(hardwareDetailTier({pixels,focused:true,mode:'high',surface:'parts'}),'low','inspection preference does not refine offscreen or subpixel hardware');
assert.equal(hardwareDetailTier({pixels:4,focused:true,mode:'high',surface:'parts',current:'medium'}),'medium','tiny parts use hysteresis while crossing the detail threshold');
assert.equal(hardwareDetailTier({pixels:12,focused:true,mode:'high',surface:'parts'}),'medium');assert.equal(hardwareDetailTier({pixels:22,focused:true,mode:'high',surface:'parts'}),'high');
assert.equal(hardwareDetailTier({pixels:Infinity,focused:true,mode:'high',surface:'thumbnail'}),'high','camera-free thumbnail preparation can prebuild a bounded selected set');
const standard=hardwareDetailBudget({gpu:true,deviceMemory:16,cores:12}),compact=hardwareDetailBudget({gpu:true,deviceMemory:4,cores:4}),software=hardwareDetailBudget({gpu:false});
assert(standard.triangles>compact.triangles&&compact.triangles>software.triangles,'device tiers bound work before live frame measurements');

const root=new T.Group(),near=hardware(root,'near'),peer=hardware(root,'peer',1.25),distant=hardware(root,'distant',0,0,-300),outside=hardware(root,'outside',60),behind=hardware(root,'behind',0,0,20);
const detail=createHardwareDetail(root,{gpu:true}),camera=new T.PerspectiveCamera(45,1.5,.1,1000);camera.position.set(0,0,6);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
const options={camera,width:900,height:600,mode:'auto',surface:'scene',focusedObjects:new Set([near.mesh,distant.mesh,behind.mesh,outside.mesh])};
settle(detail,options);assert.equal(tier(near.mesh),'high');assert.equal(tier(peer.mesh),'medium','nearby context gets only the projected-size tier');
assert.equal(tier(distant.mesh),'low','a selected but distant part stays coarse');assert.equal(tier(outside.mesh),'low','offscreen geometry stays coarse');assert.equal(tier(behind.mesh),'low','geometry behind the camera stays coarse');
const highGeometry=near.mesh.geometry,group=near.mesh.children.find(o=>o.userData.hardwareDetail),descendant=group.children[0];
assert.equal(detailSource(descendant),near.mesh,'detail picking resolves the authoritative part');assert.doesNotThrow(()=>group.clone(true),'detail metadata supports Three.js recursive cloning without reference cycles');
const rev=detail.stats().revision;detail.update({...options,force:true,now:clock+=200});assert.equal(detail.stats().revision,rev,'steady view does not replace or rebuild its active variants');
settle(detail,{...options,mode:'low'});for(const p of [near,peer,distant,outside,behind])assert.equal(p.mesh.geometry,p.geometry,'standard mode restores exact source geometry');
settle(detail,options);assert.equal(near.mesh.geometry,highGeometry,'returning to detail reuses a live cached variant');

// In orthographic views physical depth does not shrink projected component size.
settle(detail,{...options,mode:'low'});const orthographic=new T.OrthographicCamera(-7.5,7.5,5,-5,.1,1000);orthographic.position.copy(camera.position);orthographic.lookAt(0,0,0);orthographic.zoom=2;orthographic.updateProjectionMatrix();
settle(detail,{...options,camera:orthographic});assert.equal(tier(near.mesh),'high');assert.equal(tier(distant.mesh),'high');assert.equal(tier(outside.mesh),'low');assert.equal(tier(behind.mesh),'low');
settle(detail,{...options,surface:'parts',mode:'high',focusedObjects:new Set([near.mesh])});assert.equal(tier(peer.mesh),'low','unselected ghost context receives no inspection variants');assert.equal(tier(distant.mesh),'low');
settle(detail,{...options,surface:'parts',mode:'high'});assert.equal(tier(outside.mesh),'low','parts inspector also excludes offscreen sources');assert.equal(tier(behind.mesh),'low','parts inspector also excludes sources behind the camera');
near.mesh.visible=false;settle(detail,{...options,surface:'parts',mode:'high',focusedObjects:new Set([near.mesh])});assert.equal(tier(near.mesh),'low');near.mesh.visible=true;
const ghost=new T.MeshBasicMaterial();ghost.userData.domainGhost=true;near.mesh.material=ghost;settle(detail,options);assert.equal(tier(near.mesh),'low','domain ghost materials are never refined');near.mesh.material=near.material;ghost.dispose();
settle(detail,{...options,thermal:true});assert.equal(detail.stats().activeHigh+detail.stats().activeMedium,0);settle(detail,options);

// Detaching a dynamic station returns its source buffers before disposing only
// the private variants. The factory can safely reattach that same station.
const privateGeometries=new Set();near.mesh.traverse(o=>{if(o.geometry&&o.geometry!==near.geometry)privateGeometries.add(o.geometry);});
let baseDisposals=0;near.geometry.addEventListener('dispose',()=>baseDisposals++);const disposalCounts=new Map();for(const g of privateGeometries)g.addEventListener('dispose',()=>disposalCounts.set(g,(disposalCounts.get(g)||0)+1));
root.remove(near.mesh);settle(detail,options);assert.equal(near.mesh.geometry,near.geometry);for(const g of privateGeometries)assert.equal(disposalCounts.get(g),1);assert.equal(baseDisposals,0);
root.add(near.mesh);settle(detail,options);assert.equal(tier(near.mesh),'high');detail.dispose();detail.dispose();assert.equal(near.mesh.geometry,near.geometry);assert.equal(baseDisposals,0,'controller never disposes factory-owned originals');

// Resource saturation must converge even when most candidates cannot fit. Cost
// metadata must survive eviction; otherwise each frame rebuilds rejected models.
const dense=new T.Group(),denseParts=Array.from({length:90},(_,i)=>hardware(dense,'rack-'+i)),limited=createHardwareDetail(dense,{gpu:false});
settle(limited,{mode:'high',surface:'scene'});const first=budgetCheck(limited),settledRevision=first.revision;assert(first.activeHigh+first.activeMedium>0);assert(first.activeHigh+first.activeMedium<denseParts.length);
for(let i=0;i<5;i++)limited.update({mode:'high',surface:'scene',force:true,now:clock+=200});assert.equal(limited.stats().pending,0);assert.equal(limited.stats().revision,settledRevision);
for(let i=0;i<24;i++){limited.update({mode:'high',surface:'scene',frameMs:200,force:true,now:clock+=200});budgetCheck(limited);}
settle(limited,{mode:'high',surface:'scene'});const slow=budgetCheck(limited);assert(slow.performanceScale<1&&slow.performanceScale>=.45,'sustained slow rendering lowers the budget without disabling useful detail');assert(slow.budget.triangles<first.budget.triangles);
for(let i=0;i<145;i++)limited.update({mode:'high',surface:'scene',frameMs:5,force:true,now:clock+=200});assert(limited.stats().performanceScale>slow.performanceScale,'sustained recovery can restore detail gradually');budgetCheck(limited);limited.dispose();

const h=sizeDesign(missionStarter('text')),catalog=buildPartsCatalog(h),launch=createPartModel(h,'launch',()=>{},{gpu:false});
for(let cycle=0;cycle<3;cycle++)for(const id of ['ground:thermal','ground:power','ground:checkout']){
 launch.pose(catalog.byId[id]);const selection=launch.select(catalog.byId[id]);launch.detail.prepare({meshes:selection.meshes});const s=budgetCheck(launch.detail);assert(s.activeHigh+s.activeMedium>0,id+' station returns with live detail after repeated domain switches');assert.equal(s.pending,0,'thumbnail preparation completes without a rendering loop');
}
launch.dispose();

// A last wheel event can arrive within the evaluation cadence, after the view
// would otherwise stop painting. It needs exactly one deferred wake, not a loop
// of change callbacks scheduling another skipped-cadence paint.
const deferredRoot=new T.Group(),deferredPart=hardware(deferredRoot,'deferred'),deferredCamera=new T.PerspectiveCamera(45,1,.1,1000);deferredCamera.position.z=100;deferredCamera.lookAt(0,0,0);
const deferredOptions={camera:deferredCamera,width:600,height:600,mode:'auto',focusedObjects:new Set([deferredPart.mesh])};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));let wakes=0,deferredPaints=0,changes=0,paintTimer=null;
const deferred=createHardwareDetail(deferredRoot,{gpu:true,onChange(){changes++;},onWake(){wakes++;if(!paintTimer)paintTimer=setTimeout(()=>{paintTimer=null;deferredPaints++;deferred.update(deferredOptions);},0);}});
deferred.update(deferredOptions);assert.equal(tier(deferredPart.mesh),'low');
for(let i=0;i<4;i++)deferred.update(deferredOptions);await wait(220);assert.equal(wakes,0,'identical capture or display frames schedule no deferred wake');assert.equal(deferredPaints,0);
deferred.update({...deferredOptions,force:true});deferredCamera.position.z=6;
for(let i=0;i<4;i++)deferred.update(deferredOptions);assert.equal(tier(deferredPart.mesh),'low','rapid final zoom waits for its settled pass');
await wait(240);assert.equal(tier(deferredPart.mesh),'high','the final camera position is eventually evaluated');assert.equal(wakes,1,'one deferred wake serves all events in the cadence window');assert.equal(deferredPaints,1);assert.equal(changes,1);
for(let i=0;i<4;i++)deferred.update(deferredOptions);await wait(220);assert.equal(wakes,1,'a settled view stays idle despite repeated identical updates');assert.equal(deferredPaints,1,'change notifications cannot feed a new rendering loop');
deferred.update({...deferredOptions,force:true});deferredOptions.motionKey=1;deferredPart.mesh.position.x=60;deferred.update(deferredOptions);assert.equal(tier(deferredPart.mesh),'high','a changed articulated pose waits for its settled pass');await wait(220);assert.equal(tier(deferredPart.mesh),'low');assert.equal(wakes,2,'a final changed pose also wakes once with an unchanged camera');
deferredPart.mesh.position.x=0;deferredOptions.motionKey=2;deferred.update({...deferredOptions,force:true});assert.equal(tier(deferredPart.mesh),'high');deferred.update({...deferredOptions,height:20});assert.equal(tier(deferredPart.mesh),'low','capture or viewport dimension changes evaluate immediately inside the cadence');
deferredCamera.position.z=100;deferred.update({...deferredOptions,force:true});deferredCamera.position.z=6;deferred.update(deferredOptions);deferred.dispose();const wakeCount=wakes;
await wait(220);assert.equal(wakes,wakeCount,'disposal cancels a pending cadence wake');assert.equal(deferredPaints,2);deferredPart.geometry.dispose();deferredPart.material.dispose();
for(const p of [...[near,peer,distant,outside,behind],...denseParts]){p.geometry.dispose();p.material.dispose();}
console.log('Hardware detail: projected size, frustum, hysteresis, focus/context, thermal gating, saturated convergence, adaptive budgets, repeated stations, source restoration, one-shot settled zoom and disposal passed.');
