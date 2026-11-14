import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {sizeDesign,missionStarter} from './dist/design.js';
import {buildPartsCatalog} from './dist/parts-catalog.js';
import {canvas as backingCanvas} from './render-test-canvas.mjs';
import {changePartAnimation} from './dist/parts-ui.js';
import {getFacilityAsset,assessFacilityFit} from './dist/test-facilities.js';
import {facilityEquipmentDimensions} from './dist/facility-geometry.js';

// Observe scene ownership at the public Three.js boundary. The production
// viewer has no debug export and its private source model remains untouched.
const added=T.Scene.prototype.add,projection=T.PerspectiveCamera.prototype.updateProjectionMatrix;
let scene,camera;
const stages=[];
T.PerspectiveCamera.prototype.updateProjectionMatrix=function(){if(this.fov===34)camera=this;return projection.call(this);};
T.Scene.prototype.add=function(...children){
 for(const child of children)if(child.userData?.verificationSetting){
  scene=this;const geometries=new Set(),materials=new Set(),entry={root:child,disposedGeometry:0,disposedMaterial:0};
  child.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
  for(const g of geometries)g.addEventListener('dispose',()=>entry.disposedGeometry++);
  for(const m of materials)m.addEventListener('dispose',()=>entry.disposedMaterial++);
  entry.geometryCount=geometries.size;entry.materialCount=materials.size;stages.push(entry);
 }
 return added.apply(this,children);
};
function canvas(){
 const c=backingCanvas(),get=c.getContext,base=get('2d');c.labels=[];
 const ctx=new Proxy(base,{get:(target,key)=>key==='fillText'?text=>c.labels.push(String(text)):Reflect.get(target,key)});
 c.getContext=type=>type==='2d'?ctx:null;c.style={};c.addEventListener=c.removeEventListener=c.setAttribute=c.remove=()=>{};c.toDataURL=()=>'';return c;
}
globalThis.document={hidden:false,createElement:tag=>tag==='canvas'?canvas():{append(){},style:{}},addEventListener(){},removeEventListener(){}};
const {createPartViewer}=await import('./dist/part-viewer.js');
const h=sizeDesign(missionStarter('text')),before=JSON.stringify(h),catalog=buildPartsCatalog(h),part=catalog.byId['flight:02.02'];
const originalError=console.error,animationNotifications=[];let viewer;
try{console.error=()=>{};viewer=createPartViewer({append(){}},{offscreen:true,width:384,height:256,onChange:state=>animationNotifications.push(state.animationId)});}finally{console.error=originalError;}
const clones=()=>scene.children.find(o=>o.children?.some(c=>c.userData.partSource))?.children||[];
const activeStage=()=>scene.children.find(o=>o.userData.verificationSetting);
const partClones=()=>clones().filter(o=>o.renderOrder!==-1);
const meshBounds=objects=>{const b=new T.Box3();for(const o of objects)if(o.visible){o.geometry.computeBoundingBox();b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}return b;};
const close=(a,b,tolerance=1e-8)=>a.every((value,i)=>Math.abs(value-b[i])<tolerance);
const inFrame=(b,message)=>{for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const p=new T.Vector3(x,y,z).project(camera);assert(p.z>=-1&&p.z<=1&&Math.abs(p.x)<=1&&Math.abs(p.y)<=1,message);}};
const projectedSpan=b=>{const p=new T.Box2();for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const v=new T.Vector3(x,y,z).project(camera);p.expandByPoint(new T.Vector2(v.x,v.y));}const s=p.getSize(new T.Vector2()),v=viewer.getState();return Math.max(s.x*v.width/2,s.y*v.height/2);};

try{
 viewer.setDetail('low');viewer.setPart(part,h,{}, {setting:'review'});
 assert(viewer.getState().available);assert.equal(viewer.getState().setting,'review');assert(activeStage());
 const sources=new Map(partClones().map(o=>[o.userData.partSource,o.userData.partSource.matrixWorld.elements.slice()]));
 assert(sources.size>0);for(const o of partClones())assert(close(o.matrix.elements,o.userData.partSource.matrixWorld.elements),'review stage must leave source and clone coordinates aligned');
 const baseline=meshBounds(partClones());
 const supported=['review','vibration','thermal-vacuum','thermal-cycle','acoustic','rf-chamber','optical-bench','load-frame','mass-properties','pressure-bench','electrical-bench','clean-inspection','deployment','fit-check','propulsion-stand','site-commissioning'];
 const animated=new Set(['vibration','load-frame','deployment']);
 for(const setting of supported){
  viewer.setSetting(setting);const state=viewer.getState();assert.equal(state.settingStats.kind,setting);assert.equal(scene.children.filter(o=>o.userData.verificationSetting).length,1,'switching retains exactly one setting');
  assert.equal(state.animations.some(a=>a.id==='fixture'),animated.has(setting),'only animated fixtures offer a walkthrough');
  assert.equal(state.animations.some(a=>a.id==='mate'),setting==='fit-check','mating is confined to the fitting setting');
  for(const [source,matrix] of sources)assert(close(source.matrixWorld.elements,matrix),setting+' cannot alter source coordinates');
  if(setting!=='fit-check')for(const ref of state.scaleReferences)inFrame(ref.bounds.clone().translate(activeStage().position),setting+' must fit its scale reference');
 }

 // Electrical fitting moves the actual cable plug along its mating axis in
 // this viewer's private model. The battery case and surrounding vehicle stay
 // fixed, and display clones remain aligned to that physical connector pose.
 viewer.setSetting('fit-check');viewer.setAnimation('mate',false);viewer.setProgress(0);
 const open=meshBounds(partClones());assert(partClones().some(o=>{const prior=sources.get(o.userData.partSource);return prior&&!close(o.matrix.elements,prior);}), 'connector withdrawal must change the physical plug pose');assert(clones().some(o=>o.renderOrder===-1),'fit rehearsal retains surrounding source geometry');
 for(const o of partClones()){assert(close(o.matrix.elements,o.userData.partSource.matrixWorld.elements),'electrical fitting never translates the whole article as a display-only trick');if(o.userData.partSource.userData.materialRole==='battery-case')assert(close(o.matrix.elements,sources.get(o.userData.partSource)),'battery housing remains seated');}
 viewer.setProgress(1);viewer.fit();viewer.setProgress(0);inFrame(meshBounds(partClones()),'Home at the seated endpoint must still frame the withdrawn endpoint');
 viewer.setProgress(1);assert(close(meshBounds(partClones()).min.toArray(),baseline.min.toArray()),'fully seated display returns to its real model coordinates');
 for(const [source,matrix] of sources)assert(close(source.matrixWorld.elements,matrix),'mating does not transform engineering sources');

 viewer.setSetting('vibration');viewer.setAnimation('fixture',false);viewer.setProgress(1/24);
 assert(partClones().some(o=>Math.abs(o.matrix.elements[13]-o.userData.partSource.matrixWorld.elements[13])>1e-7),'fixture movement carries the displayed article');
 for(const [source,matrix] of sources)assert(close(source.matrixWorld.elements,matrix),'fixture movement leaves source coordinates intact');
 viewer.setScale('person');assert.equal(viewer.getState().animationId,null);assert.equal(viewer.getState().progress,1,'changing reference restores the nominal pose and position state');
 const human=viewer.getState().scaleReferences.find(r=>r.type==='person');assert(Math.abs(human.bounds.getSize(new T.Vector3()).y-1.75)<1e-5);inFrame(human.bounds.clone().translate(activeStage().position),'fixed-height scale figure fits the initial frame');

 viewer.setSetting('review');viewer.setScale('banana');viewer.setDetail('high');
 const image=viewer.captureFrame({width:768,height:512});
 assert(image.frame.data.some(v=>v!==0));assert(image.labels.some(text=>text.includes('Banana')),'capture includes the projected scale label');
 assert(viewer.getState().detailStats.activeHigh+viewer.getState().detailStats.activeMedium>0,'the translated stage preserves focused high-detail selection');
 for(const o of partClones())assert(close(o.matrix.elements,o.userData.partSource.matrixWorld.elements),'high-detail clones keep their world-space source transforms');
 const hide=viewer.beginCaptureAppearance({guides:false}),plain=viewer.captureFrame({width:384,height:256});assert.equal(plain.labels.length,0,'capture overlay toggle omits stage labels');hide.release();
 let recordedLabels=[];const recording=viewer.beginRecording({width:384,height:256,onFrame:frame=>{recordedLabels=frame.labels;}});assert(recordedLabels.some(text=>text.includes('Banana')),'video frames include the same setting labels');recording.release();

 viewer.setSetting('installed');assert.equal(activeStage(),undefined);assert.equal(viewer.getState().settingStats,null);assert.equal(viewer.getState().context,true);assert(clones().some(o=>o.renderOrder===-1));
 viewer.setSetting('studio');assert.equal(activeStage(),undefined);assert.equal(viewer.getState().context,false);assert(!viewer.captureSettings().guidesAvailable);
 // A select change must survive the viewer's synchronous control callbacks.
 // Reproduce the reported Omnetics connector transition from continuity to
 // context-only mating, then the Home key's zero-position scrub.
 const microD=catalog.byId['flight:07.05.66'];assert(microD,'reported connector remains in the catalog');
 viewer.setPart(microD,h,{}, {setting:'fit-check',parentRecord:catalog.byId[microD.parentId]});
 inFrame(meshBounds(partClones()),'small connector fits on entry');
 assert(projectedSpan(meshBounds(partClones()))>viewer.getState().height*.25,'the 50 mm connector must be inspectable instead of fitting the whole benchtop');
 viewer.fit(true);assert(projectedSpan(meshBounds(partClones()))>viewer.getState().height*.25,'Fit part retains useful connector magnification');
 assert(viewer.getState().animations.some(a=>a.id==='electrical')&&viewer.getState().animations.some(a=>a.id==='mate'));
 changePartAnimation(viewer,'electrical');assert.equal(viewer.getState().animationId,'electrical');animationNotifications.length=0;
 changePartAnimation(viewer,'mate');assert.equal(viewer.getState().animationId,'mate');assert(animationNotifications.length>0&&animationNotifications.every(id=>id==='mate'),'select change must never publish the previous animation during the transition');
 viewer.setProgress(0);assert.equal(viewer.getState().animationId,'mate','Home on the position control retains mating');assert.equal(viewer.getState().progress,0);assert.equal(viewer.getState().playing,false);
 for(const progress of [0,.25,.5,.75,1]){viewer.setProgress(progress);inFrame(meshBounds(partClones()),'connector remains in frame through actual mating travel');}
 viewer.fit();viewer.setProgress(0);inFrame(meshBounds(partClones()),'Fit part at seated connector retains withdrawn connector');
 changePartAnimation(viewer,'electrical');assert.equal(viewer.getState().animationId,'electrical','the reverse selection works too');
 for(const id of ['flight:08.01','launch:fairing']){
  viewer.setPart(catalog.byId[id],h,{}, {setting:'fit-check'});assert(viewer.getState().available,id+' remains independently viewable');inFrame(meshBounds(partClones()),id+' fits at its ordinary scale');
  viewer.setAnimation('mate',false);viewer.setProgress(1);viewer.fit(true);
  for(const progress of [0,.25,.5,.75,1]){viewer.setProgress(progress);inFrame(meshBounds(partClones()),id+' fitting does not clip its full travel');}
 }
 // A selected physical facility remains fixed as the article and viewpoint
 // change. Fit results use the article's mass, and never turn table size into
 // a facility-wide article envelope.
 const selectedFacility=getFacilityAsset('nasa-armstrong-sec/mvf'),alternateFacility=getFacilityAsset('experior-oxnard/t4000'),solar=catalog.byId['flight:02.01'];assert(selectedFacility&&alternateFacility&&solar);
 viewer.setDetail('low');viewer.setPart(solar,h,{}, {setting:'vibration',facilityAssetId:selectedFacility.id,scaleMode:'person'});
 let facilityState=viewer.getState();assert.equal(facilityState.facilityAssetId,selectedFacility.id);assert.equal(facilityState.facility.assetId,selectedFacility.id);assert.equal(facilityState.facility.facilityId,selectedFacility.facilityId);assert.equal(facilityState.facility.name,selectedFacility.name);assert.equal(facilityState.facility.fit.massKg,solar.extendedMassKg);assert.deepEqual(facilityState.facility.fit,assessFacilityFit(selectedFacility,{sizeM:facilityState.modeledSizeM,massKg:solar.extendedMassKg}));assert.notEqual(facilityState.facility.fit.status,'envelope-screened');assert.equal(facilityState.facility.outside,true,'Deployed solar wings are beside the fixed shaker');
 const equipment=()=>activeStage().children.find(o=>o.userData.facilityAssetId===viewer.getState().facilityAssetId),equipmentDimensions=()=>new T.Box3().setFromObject(equipment().getObjectByName('Fixed facility equipment')).getSize(new T.Vector3()).toArray();
 const fixedSize=equipmentDimensions();assert.deepEqual(equipment().userData.dimensionsM,facilityEquipmentDimensions(selectedFacility));inFrame(meshBounds(partClones()),'The enormous article remains at true scale within the camera frame');inFrame(new T.Box3().setFromObject(equipment().getObjectByName('Fixed facility equipment')),'The fixed equipment remains in the same comparison frame');
 viewer.setScale('none');assert.equal(viewer.getState().facilityAssetId,selectedFacility.id);assert(close(equipmentDimensions(),fixedSize));viewer.setSetting('review');assert.equal(viewer.getState().facility,null);viewer.setSetting('vibration');assert.equal(viewer.getState().facilityAssetId,selectedFacility.id,'Explicit facility choice persists through other settings');assert(close(equipmentDimensions(),fixedSize));
 viewer.setPart(part,h,{}, {setting:'vibration'});assert.equal(viewer.getState().facilityAssetId,selectedFacility.id);assert(close(equipmentDimensions(),fixedSize),'A small battery cannot resize the selected equipment');inFrame(new T.Box3().setFromObject(equipment().getObjectByName('Fixed facility equipment')),'The small-article comparison still frames fixed equipment');
 viewer.setFacility(alternateFacility.id);assert.equal(viewer.getState().facilityAssetId,alternateFacility.id);assert.deepEqual(equipment().userData.dimensionsM,facilityEquipmentDimensions(alternateFacility));viewer.setFacility(null);assert(viewer.getState().facilityAssetId);assert.equal(viewer.getState().facility.assetId,viewer.getState().facilityAssetId);
 viewer.setPart(catalog.byId['flight:02.01.02'],h,{}, {setting:'review'});assert.equal(viewer.getState().available,false);assert.equal(activeStage(),undefined);assert.deepEqual(viewer.getState().modeledSizeM,[0,0,0]);assert(!viewer.captureStatus().ready);assert.equal(clones().length,0,'a layer allocation cannot inherit the preceding part geometry');
 viewer.setPart(part,h,{}, {setting:'review'});viewer.setPart({id:'missing-selector',render:{family:'flight',names:['No modeled component uses this name']}},h,{}, {setting:'review'});assert.equal(viewer.getState().available,false);assert.deepEqual(viewer.getState().modeledSizeM,[0,0,0],'unmatched selectors clear previous model dimensions');assert.equal(activeStage(),undefined);
 viewer.setPart(part,h,{}, {setting:'review'});viewer.destroy();viewer.destroy();
 for(const entry of stages){assert.equal(entry.root.parent,null);assert.equal(entry.root.children.length,0);assert.equal(entry.disposedGeometry,entry.geometryCount,'setting geometries dispose once');assert.equal(entry.disposedMaterial,entry.materialCount,'setting materials dispose once');}
 assert.equal(JSON.stringify(h),before,'verification viewing never changes the design or MEL ledger');
 console.log(JSON.stringify({passed:true,settingsChecked:supported.length,disposedSettings:stages.length,checks:['scene switching','source transforms','mating fit at both endpoints','fixture motion','high-detail clone synchronization','actual reference size','facility selection persistence','fixed equipment for oversized solar wings','article mass fit screening','still/video overlays','unmodeled records','resource disposal']},null,2));
}finally{
 viewer?.destroy();T.Scene.prototype.add=added;T.PerspectiveCamera.prototype.updateProjectionMatrix=projection;
}
