// Exercise the actual craft guard and app startup/update paths without native
// routing or a GPU. A changing flight snapshot must not retry missing geometry.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Object3D} from './dist/vendor/three.module.js';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {makeCraft} from './dist/craft.js';
import {installedLinePlanningAssessment} from './dist/electrical-architecture.js';
import {ConstructionCacheMissError,constructionCacheMissCode,
 createConstructionPendingState} from './dist/scene-construction-state.js';

// Stop at the first geometry attachment. A construction miss must happen
// before this boundary; explicit analysis must still reach it normally.
const add=Object3D.prototype.add,geometryBoundary=Error('geometry boundary');
let attachments=0;
Object3D.prototype.add=function(){attachments++;throw geometryBoundary;};
try{
 for(const id of ['star-catcher-self-powered','starmind-ai1']){
  const changed=sizeDesign(buildReferenceDesign(id));
  if(id==='starmind-ai1')assert.throws(()=>makeCraft(changed,{routingMode:'construction'}),
   error=>error===geometryBoundary,'The published SpaceX construction remains available');
  // The sized object already owns its electrical graph. Change a checked
  // physical datum without running a second support allocator in this guard test.
  changed.bodyWidthM+=.001;
  const before=attachments;
  assert.throws(()=>makeCraft(changed,{routingMode:'construction'}),error=>
   error instanceof ConstructionCacheMissError&&error.code===constructionCacheMissCode&&
   error.referenceCenterId===id&&error.architectureFamilyId===changed.architectureFamilyId);
  assert.equal(attachments,before,'A cache miss cannot begin building a partial craft');
  assert.throws(()=>makeCraft(changed,{routingMode:'analysis'}),error=>error===geometryBoundary);
  assert.equal(attachments,before+1,'Explicit native analysis remains available');
  assert.throws(()=>makeCraft(changed,{routingMode:'construction',installElectrical:false,
   planFluidRoutes:false}),error=>error===geometryBoundary);
 }
}finally{Object3D.prototype.add=add;}

// Execute the production app functions with only their browser/module boundary
// supplied here. This covers asynchronous first load and an already-live view;
// testing a separate model of the state machine would miss the null-scene bug.
const app=fs.readFileSync(new URL('./dist/app.js',import.meta.url),'utf8'),
 start=app.indexOf('let sceneLoad;'),end=app.indexOf('let activeLesson=',start);
assert(start>=0&&end>start);
const block=app.slice(start,end),loader="import('./scene.js')";
assert.equal(block.split(loader).length,2,'Keep exactly one lazy scene import boundary');
class Element{
 constructor(){this.children=[];this.dataset={};this.events={};this.hidden=true;}
 set innerHTML(value){this.html=value;this.children=[];}
 get innerHTML(){return this.html||'';}
 set textContent(value){this.text=value;this.children=[];}
 get textContent(){return this.text||'';}
 append(...children){this.children.push(...children);}
 addEventListener(name,callback){this.events[name]=callback;}
}
const host=new Element(),status=new Element(),counts={loads:0,created:0,updated:0,destroyed:0},
 errors=[],elements=new Map([['scene',host],['scene-loading',status]]);
const hardware=id=>({input:{referenceCenterId:'star-catcher-self-powered'},id}),
 missing=hardware('edited'),restored=hardware('restored');
missing.failure=new ConstructionCacheMissError(missing);
const sandbox={
 createConstructionPendingState,scene:null,hardware:missing,input:missing.input,snap:{t:0},
 referencePage:null,view:{phase:'E',domain:'conops',overlays:[]},console:{error:error=>errors.push(error)},
 $:id=>elements.get(id),document:{createElement:()=>new Element()},
 getReferenceIllustration:()=>null,esc:value=>String(value),
 commissioning:()=>false,inspect(){},openPartView(){},resolveScenePart(){},currentPartsCatalog(){},
 updatePointingPanels(){},syncCameraChoices(){},syncBayView(){},replayMotion:()=>0,
 effectiveLayers:()=>[],help:{component(){}},
 loadSceneModule:()=>{
  counts.loads++;
  return Promise.resolve({createScene:()=>{
   counts.created++;host.append(new Element());let destroyed=false;
   return new Proxy({
    update(h){
     assert.equal(destroyed,false,'A disposed scene cannot receive an update');counts.updated++;
     if(h.failure)throw h.failure;
     host.dataset.renderedReferenceCenter=h.input.referenceCenterId;
     host.dataset.renderedRouting='compiled-native';host.dataset.renderedFrames='1';
    },
    destroy(){assert.equal(destroyed,false);destroyed=true;counts.destroyed++;}
   },{get(target,key){
    if(key in target)return target[key];
    return ()=>assert.equal(destroyed,false,'Startup continued after a pending scene was disposed');
   }});
  }});
 }
};
vm.createContext(sandbox);
vm.runInContext(block.replace(loader,'loadSceneModule()')+`
 globalThis.sceneHarness={
  start(){ensureScene();return sceneLoad;},update:updateScene,
  state(){return {scene,sceneLoad};}
 };
`,sandbox,{filename:'app.js:scene-lifecycle'});
const ui=sandbox.sceneHarness;
await ui.start();
assert.equal(counts.created,1);assert.equal(counts.updated,1);assert.equal(counts.destroyed,1);
assert.equal(ui.state().scene,null);assert.equal(status.hidden,false);
assert.match(status.innerHTML,/Harness routing has not been prepared/);
assert.equal(status.children.length,1);
assert.equal(status.children[0].dataset.restoreReference,'star-catcher-self-powered');
assert.equal(host.children.length,0);assert.equal(host.dataset.renderedRouting,'pending');
assert.equal(host.dataset.renderedReferenceCenter,undefined);
assert.equal(errors.length,0,'A known cache miss is a pending state, not a generic startup failure');
for(let t=1;t<=90;t++){
 sandbox.snap={t};await ui.start();assert.equal(ui.update(),false);
 assert.equal(sandbox.hardware,missing,'Clock ticks retain the sized hardware identity');
}
assert.equal(counts.loads,1,'Clock ticks must not reload or retry unchanged pending hardware');
assert.equal(counts.updated,1);

// A fresh sizing result can retry and the normal prepared reference stays live.
sandbox.hardware=restored;sandbox.input=restored.input;
await ui.start();
assert.equal(counts.loads,2);assert.equal(counts.created,2);
assert(ui.state().scene);assert.equal(status.hidden,true);
assert.equal(host.dataset.renderedRouting,'compiled-native');
for(let t=91;t<=95;t++){sandbox.snap={t};assert.equal(ui.update(),true);}
assert.equal(counts.created,2,'Prepared geometry remains visible across clock updates');

// An edit to a live view removes its old geometry and its old rendered markers.
const secondEdit=hardware('second edit');secondEdit.failure=new ConstructionCacheMissError(secondEdit);
sandbox.hardware=secondEdit;sandbox.input=secondEdit.input;
assert.equal(ui.update(),false);assert.equal(ui.state().scene,null);
assert.equal(counts.destroyed,2);assert.equal(host.children.length,0);
assert.equal(host.dataset.renderedFrames,undefined);assert.equal(status.hidden,false);
await ui.start();assert.equal(counts.loads,2);

// Other failures keep the existing retry/error path; they are never silently
// converted into a pending design or suppressed by the construction gate.
const broken=hardware('unrelated failure'),unexpected=Error('renderer failed');
broken.failure=unexpected;sandbox.hardware=broken;sandbox.input=broken.input;
await ui.start();
assert.equal(counts.loads,3);assert.equal(errors.length,1);assert.equal(errors[0],unexpected);
assert.match(status.innerHTML,/3D view could not start/);
const retry=status.children.find(child=>child.textContent==='Retry 3D view');assert(retry);
delete broken.failure;retry.events.click();await ui.state().sceneLoad;
assert.equal(counts.loads,4);assert(ui.state().scene);assert.equal(status.hidden,true);
broken.failure=unexpected;
assert.throws(()=>ui.update(),error=>error===unexpected,'Unrelated live-scene failures propagate');

const assessment=(planningIssues,servicePlanningIssues)=>installedLinePlanningAssessment({
 constructionOnly:true,planningIssues,servicePlanningIssues});
assert.equal(assessment([],[]).planningPassed,null);
assert.equal(assessment([],[{unassessed:true,reason:'retainer release not modeled'}]).planningPassed,null);
assert.equal(assessment([],[{reason:'insufficient withdrawal stroke'}]).planningPassed,false,
 'A captured hard service failure cannot become unassessed when its geometry is displayed');
assert.equal(assessment([],[{unassessed:true},{reason:'service sweep collision'}]).planningPassed,false);
assert.equal(assessment([{reason:'solid collision'}],[]).planningPassed,false);
assert.equal(assessment([],[{reason:'service sweep collision'}]).serviceWithdrawalAssessment,'unassessed');
assert.equal(installedLinePlanningAssessment({serviceWithdrawalAssessment:'unassessed',
 servicePlanningIssues:[{reason:'service sweep collision'}]}).planningPassed,false,
 'A known service failure remains failed even when other withdrawal evidence is unassessed');
console.log('PASS construction pending: Star/SpaceX misses stop before geometry; explicit analysis remains; '+
 'actual app initial/edit paths clear stale scenes, suppress clock retries, recover on new hardware, '+
 'preserve unrelated errors and retain hard service failures.');
