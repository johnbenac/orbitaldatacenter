import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {sizeDesign,missionStarter} from './dist/design.js';
import {makeLaunch} from './dist/launch-scene.js';
import {buildGroundPartDetail,groundDetailRecipe} from './dist/ground-part-detail.js';
import {groundProcessingState} from './dist/ground-processing.js';
import {buildPartsCatalog} from './dist/parts-catalog.js';
import {createPartModel,modelPath} from './dist/part-model.js';
import {canvas} from './render-test-canvas.mjs';

globalThis.document={createElement:tag=>tag==='canvas'?canvas():{style:{},append(){}}};
const indexedA=new T.Group(),indexedB=new T.Group(),indexed={parts:{boosters:[indexedA,indexedB]},array:[{part:indexedA},{part:indexedB}]};
assert.deepEqual(modelPath(indexed,'parts.boosters.0'),[indexedA]);assert.deepEqual(modelPath(indexed,'parts.boosters[1]'),[indexedB]);assert.deepEqual(modelPath(indexed,'parts.boosters.*'),[indexedA,indexedB]);assert.deepEqual(modelPath(indexed,'array.part'),[indexedA,indexedB]);
const triangles=g=>(g.index?.count||g.attributes.position.count)/3;
const bounds=g=>new T.Box3().setFromBufferAttribute(g.attributes.position);
const dispose=result=>{result?.geometry?.dispose();result?.group?.traverse(o=>o.geometry?.dispose());};
const stats={sources:0,refined:0,features:0,trianglesBefore:0,trianglesAfter:0,maxDetailDraws:0,recipes:{},named:{}};
const seen=new WeakSet();
function check(source){
 if(seen.has(source)||!source.isMesh)return;seen.add(source);
 const recipe=groundDetailRecipe(source),original=source.geometry,mat=source.material,positions=original.attributes.position.array.slice(),uv=original.attributes.uv?.array.slice(),children=source.children.slice(),transform=source.matrix.clone();
 const high=buildGroundPartDetail(source,{tier:'high'});if(!high)return;
 const low=buildGroundPartDetail(source,{tier:'medium'});
 assert.equal(source.geometry,original,'builder cannot swap the authoritative geometry');assert.equal(source.material,mat);assert.deepEqual(source.children,children);assert.deepEqual(source.matrix,transform);
 assert.deepEqual(original.attributes.position.array,positions,'source vertices stay immutable');if(uv)assert.deepEqual(original.attributes.uv.array,uv,'supplier material UVs stay immutable');
 assert(high.group?.children.length<=4||!high.group,'features merge to at most four material draws');
 let detailTriangles=0;high.group?.traverse(o=>{if(o.isMesh){assert(o.userData.hardwareDetail);assert(o.hardwareDetailSource===source);assert(o.geometry.attributes.position.array.every(Number.isFinite));detailTriangles+=triangles(o.geometry);}});
 if(high.geometry){
  const a=bounds(original),b=bounds(high.geometry),d=a.getSize(new T.Vector3()),p=original.parameters||{},r=p.radius||Math.max(p.radiusTop||0,p.radiusBottom||0),segments=p.radialSegments||p.widthSegments||32;
  // A coarse polygon undersamples the nominal circular radius. Refinement may
  // recover that sagitta, while straight dimensions and the actual radii stay.
  const tolerance=Math.max(1e-5,d.length()*.006,r*(1-Math.cos(Math.PI/segments))*1.1);
  for(const axis of ['x','y','z']){assert(Math.abs(a.min[axis]-b.min[axis])<tolerance,source.name+' minimum '+axis);assert(Math.abs(a.max[axis]-b.max[axis])<tolerance,source.name+' maximum '+axis);}
  assert(high.geometry.attributes.position.array.every(Number.isFinite));
 }
 const before=triangles(original),after=triangles(high.geometry||original)+detailTriangles;
 assert(after>=before,source.name+' detailed model cannot lose surface geometry');
 if(low){let lowTriangles=triangles(low.geometry||original);low.group?.traverse(o=>{if(o.isMesh)lowTriangles+=triangles(o.geometry);});assert(after>=lowTriangles,source.name+' high tier must not have fewer triangles than medium');}
 stats.sources++;stats.refined+=!!high.geometry;stats.features+=!!high.group;stats.trianglesBefore+=before;stats.trianglesAfter+=after;stats.maxDetailDraws=Math.max(stats.maxDetailDraws,high.group?.children.length||0);stats.recipes[recipe]=(stats.recipes[recipe]||0)+1;
 if(source.name&&['engine','shell','cabinet','pump','wheel','hoist','girder','pierced-deck','platform','bearing','connector','vessel','barrel','hose'].includes(recipe))stats.named[source.name]={before,after,draws:high.group?.children.length||0};
 if(recipe==='engine'){
  // No triangles may cap the nozzle exit. Its innermost exit radius stays open.
  const p=high.geometry.attributes.position,box=bounds(high.geometry),radius=Math.min(Math.abs(box.max.x),Math.abs(box.min.x));
  for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i)-box.min.y)<1e-5)assert(Math.hypot(p.getX(i),p.getZ(i))>radius*.85);
 }
 if(recipe==='pierced-deck'){
  assert.equal(high.geometry,undefined,'the existing pierced deck is retained');
  for(const a of source.userData.apertures)high.group.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)assert(Math.hypot(p.getX(i)-a.x,p.getZ(i)-a.z)>a.r*.93,'detail cannot close an exhaust passage');}});
 }
 dispose(high);dispose(low);
}

for(const launcher of ['terran','starship','falconHeavy']){
 const h=sizeDesign({...missionStarter('text'),launcher}),factory=makeLaunch(h,()=>{},{environment:false});
 factory.update({flightPhase:'integration',t:-3599,altitudeKm:0},'integration',{phase:'D',domain:'conops'});factory.root.traverse(check);
 for(const [domain,bench] of [['compute'],['data'],['power'],['thermal'],['attitude'],['prop'],['mass'],['mechanical'],['launch'],['launcher'],['environment'],['orbit'],['avionics'],['comm','sband'],['comm','ka'],['comm','optical']]){
  factory.bay.select(domain,true,bench||'sband');factory.root.traverse(check);
 }
 factory.bay.select('prop',true,'sband',groundProcessingState(h,'propellant',.35));factory.root.traverse(check);
 // Exclusions apply to descendants, not just named effect roots.
 let markings=0,effects=0;factory.root.traverse(o=>{if(o.userData.launchMarking){markings++;assert.equal(buildGroundPartDetail(o),null);}if(/engine exhaust/.test(o.name)){o.traverse(child=>{if(child.isMesh){effects++;assert.equal(buildGroundPartDetail(child),null);}});}});
 assert(markings>0);assert(effects>0);
 factory.dispose?.();
}
for(const key of ['engine','shell','cabinet','pump','wheel','hoist','girder','pierced-deck','platform','bearing','connector','vessel','barrel','hose'])assert(stats.recipes[key]>0,'real sources exercise '+key);
assert(stats.trianglesAfter>stats.trianglesBefore*1.2,'inspection geometry has a meaningful aggregate increase');
const catalogCoverage=[];
for(const launcher of ['terran','starship','falconHeavy']){
 const h=sizeDesign({...missionStarter('text'),launcher}),unchanged=JSON.stringify(h),catalog=buildPartsCatalog(h),model=createPartModel(h,'launch',()=>{},{gpu:false}),summary={launcher,available:0,unmodeled:[],initialEligible:model.detail.stats().eligible};
 for(const record of catalog.records.filter(r=>r.render.family==='launch')){
  model.pose(record);const selection=model.select(record);
  if(!selection.available){assert(!['launch:booster-1','launch:booster-2','ground:lifting-yoke','ground:lifting-frame','site:water-supply'].includes(record.id),launcher+' must expose its actual modeled '+record.id);summary.unmodeled.push(record.id);continue;}
  model.detail.prepare({meshes:selection.meshes,tier:'high'});const s=model.detail.stats();
  assert(s.activeHigh+s.activeMedium>0,launcher+' '+record.id+' needs visible inspection geometry');
  if(/^launch:booster-\d+$/.test(record.id)){
   const index=Number(record.id.split('-').at(-1))-1,root=model.factory.parts.boosters[index];assert(root?.isObject3D);assert(s.activeHigh>0,'individual booster has high-detail hardware');
   for(const mesh of selection.meshes){let belongs=false;for(let p=mesh;p;p=p.parent)if(p===root)belongs=true;assert(belongs,'booster page cannot select a neighboring core');}
  }
  assert(s.triangles<=s.budget.triangles,'software geometry budget');assert(s.drawCalls<=s.budget.drawCalls,'software draw-call budget');assert(s.cachedModels<=s.budget.cacheModels,'geometry cache bound');
  summary.available++;
 }
 if(launcher==='starship')for(const id of ['ground:lifting-yoke','ground:lifting-frame'])for(const p of [0,.5,1]){
  const record=catalog.byId[id];model.pose(record,p,'integration');assert(model.select(record).available,id+' follows its existing visible handling interval');
 }
 if(launcher==='starship'){
  for(const id of ['ground:adapter-stand','site:lightning-protection'])assert(catalog.byId[id].render.unavailable,'genuinely absent hardware remains explicit');
  const record=catalog.byId['site:water-supply'];model.pose(record);const selection=model.select(record);assert(selection.available);assert(selection.meshes.every(o=>['Water cooling manifold','Water injection nozzle'].includes(o.name)),'Starship water page selects actual existing pipework, not an invented tank or spray effect');
 }
 summary.finalEligible=model.detail.stats().eligible;assert(summary.finalEligible>summary.initialEligible,'lazy ground stations must enter the controller index');
 model.dispose();assert.equal(JSON.stringify(h),unchanged,'inspection cannot modify the sizing model or equipment accounting');catalogCoverage.push(summary);
}
console.log(JSON.stringify({sources:stats.sources,refined:stats.refined,features:stats.features,trianglesBefore:stats.trianglesBefore,trianglesAfter:stats.trianglesAfter,maxDetailDraws:stats.maxDetailDraws,recipes:stats.recipes,catalogCoverage,sample:Object.fromEntries(['Engine nozzle','Fairing half shell','Ground conditioning pump','Ground instrumentation rack','Crane traveling hoist','Ground service lead','Pierced exhaust deck'].map(name=>[name,stats.named[name]]))},null,2));
