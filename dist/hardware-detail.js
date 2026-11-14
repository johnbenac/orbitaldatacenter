// Visual refinement is independent of the engineering model and its mass ledger.
// Only private geometry is swapped; factories retain their lightweight originals.
import * as T from './vendor/three.module.js';
import {buildFlightPartDetail} from './flight-part-detail.js';
import {buildGroundPartDetail} from './ground-part-detail.js';
import {acquireDetailMaterials} from './detail-materials.js';

const MB=1024*1024,now=()=>globalThis.performance?.now?.()??Date.now();
const triangles=g=>Math.floor((g?.index?.count??g?.attributes?.position?.count??0)/3);
const bytes=g=>Object.values(g?.attributes||{}).reduce((n,a)=>n+(a.array?.byteLength||0),g?.index?.array?.byteLength||0);
const materials=o=>[].concat(o.material||[]);
const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
export function detailSource(object){for(let p=object;p;p=p.parent)if(p.hardwareDetailSource)return p.hardwareDetailSource;return object;}
export function normalizeHardwareDetail(value){return ['high','low'].includes(value)?value:'auto';}

// Hysteresis is deliberately larger than a few pixels: a slow zoom should not
// rebuild the same fasteners at every boundary crossing.
export function hardwareDetailTier({pixels=0,focused=false,mode='auto',surface='scene',current='low',visible=true,thermal=false,performanceScale=1}={}){
 if(mode==='low'||!visible||thermal||pixels<=0)return 'low';
 if(surface!=='scene')return focused&&pixels>=(current==='low'?5:3)?(pixels>=(mode==='high'?18:40)?'high':'medium'):'low';
 const factor=(mode==='high'?.7:1)/Math.max(.45,performanceScale);
 const high=(focused?(current==='high'?72:96):(current==='high'?168:216))*factor;
 const medium=(focused?(current!=='low'?25:36):(current!=='low'?78:108))*factor;
 return pixels>=high?'high':pixels>=medium?'medium':'low';
}

export function hardwareDetailBudget({gpu=true,deviceMemory=globalThis.navigator?.deviceMemory,cores=globalThis.navigator?.hardwareConcurrency,surface='scene',performanceScale=1}={}){
 const limited=(deviceMemory>0&&deviceMemory<=4)||(cores>0&&cores<=4),profile=!gpu?'software':limited?'compact':'standard';
 const table=gpu?(limited?{scene:[60000,100,22,16],parts:[120000,180,42,28],thumbnail:[65000,110,28,18]}:{scene:[110000,160,36,28],parts:[220000,280,72,48],thumbnail:[100000,150,40,28]}):{scene:[6500,24,6,6],parts:[22000,64,18,12],thumbnail:[14000,48,14,10]};
 const [tris,calls,models,cache]=table[surface]||table.scene,scale=Math.max(.45,Math.min(1,performanceScale));
 return {triangles:Math.floor(tris*scale),drawCalls:Math.max(12,Math.floor(calls*scale)),models:Math.max(4,Math.floor(models*scale)),cacheBytes:cache*MB,cacheModels:Math.max(models*2,24),profile};
}

function candidateMesh(o){
 if(!o.isMesh||!o.geometry?.attributes?.position||o.isInstancedMesh||o.isSkinnedMesh||o.userData.hardwareDetail||o.userData.hardwareDetailExclude||o.userData.dynamicConnection)return false;
 for(let p=o;p;p=p.parent){const d=p.userData||{};if(d.hardwareDetail||d.landscape||d.engineeringGraphic||d.sceneFlow||d.serviceCue||d.launchCloud||d.waterEffect||d.exhaust||d.missionPatch||d.launchMarking)return false;}
 const m=materials(o);return m.length>0&&!m.every(m=>m.userData?.physicalMaterial===false);
}
function geometryCost(recipe,base){
 const geometries=new Set();let count=0,calls=0;
 if(recipe.geometry){geometries.add(recipe.geometry);count+=Math.max(0,triangles(recipe.geometry)-triangles(base));}
 recipe.group?.traverse(o=>{if(o.isMesh&&o.geometry){geometries.add(o.geometry);count+=triangles(o.geometry);calls+=Array.isArray(o.material)?Math.max(1,o.geometry.groups.length):1;}});
 return {triangles:count,drawCalls:calls,bytes:[...geometries].reduce((n,g)=>n+bytes(g),0),geometries};
}

export function createHardwareDetail(root,{family='flight',hardware,renderer,gpu=true,onChange,onWake}={}){
 const palette=acquireDetailMaterials(),records=[],byMesh=new Map(),sphere=new T.Sphere(),viewPoint=new T.Vector3(),matrix=new T.Matrix4(),frustum=new T.Frustum();
 let alive=true,revision=0,lastCheck=-Infinity,pending=0,mode='auto',surface='scene',activeHigh=0,activeMedium=0,activeTriangles=0,activeCalls=0,cacheBytes=0,cacheModels=0;
 let performanceScale=1,averageMs=0,slow=0,fast=0,lastBudget=hardwareDetailBudget({gpu}),lastSignature='',lastCameraKey='',wake=null;
 function register(mesh){if(byMesh.has(mesh)||!candidateMesh(mesh))return;const geometry=mesh.geometry;geometry.computeBoundingSphere();if(!Number.isFinite(geometry.boundingSphere?.radius)||geometry.boundingSphere.radius<=0)return;
  const ids=new Set();for(let p=mesh;p;p=p.parent){if(p.userData.part)ids.add(p.userData.part);if(p.userData.bayRole)ids.add('bay:'+p.userData.bayRole);}
  const r={mesh,base:geometry,bounds:geometry.boundingSphere.clone(),ids,variants:new Map(),costs:new Map(),active:null,baseUV:mesh.userData.materialCylinderUV,used:0};records.push(r);byMesh.set(mesh,r);
 }
 function refresh(){
  const present=new Set();root.traverse(mesh=>{present.add(mesh);register(mesh);});
  // Station factories cache and reattach their own low-detail meshes. Return
  // detached sources to that cache; their base resources still belong to it.
  for(let i=records.length-1;i>=0;i--){const r=records[i];if(present.has(r.mesh))continue;activate(r,null);for(const [tier,v] of r.variants)if(v)releaseVariant(r,tier,v);byMesh.delete(r.mesh);records.splice(i,1);}
 }
 root.traverse(register);
 function notify(){onChange?.();}
 function focused(r,objects,parts){if(objects?.size)for(let p=r.mesh;p;p=p.parent)if(objects.has(p))return true;return parts?.size&&[...r.ids].some(id=>parts.has(id));}
 function activate(r,v){
  if(r.active===v)return false;
  r.active?.group?.removeFromParent();
  if(!r.active&&r.mesh.geometry===r.base)r.baseUV=r.mesh.userData.materialCylinderUV;
  r.mesh.geometry=v?.geometry||r.base;
  const uv=v?.geometry?.userData?.hardwareCylinderUV||r.baseUV;
  if(uv)r.mesh.userData.materialCylinderUV=uv;else delete r.mesh.userData.materialCylinderUV;
  delete r.mesh.userData.materialCylinderKey;
  if(v?.group)r.mesh.add(v.group);
  r.active=v;r.used=now();revision++;return true;
 }
 function releaseVariant(r,tier,v){if(r.active===v)return;v.group?.removeFromParent();for(const g of v.cost.geometries)g.dispose();r.variants.delete(tier);cacheBytes-=v.cost.bytes;cacheModels--;}
 function evict(budget){
  if(cacheBytes<=budget.cacheBytes&&cacheModels<=budget.cacheModels)return;
  const choices=records.flatMap(r=>[...r.variants].filter(([,v])=>v&&v!==r.active).map(([tier,v])=>({r,tier,v}))).sort((a,b)=>a.r.used-b.r.used);
  for(const {r,tier,v} of choices){releaseVariant(r,tier,v);if(cacheBytes<=budget.cacheBytes&&cacheModels<=budget.cacheModels)break;}
 }
 function build(r,tier){
  if(r.variants.has(tier))return r.variants.get(tier);
  // Recipes always see the original envelope, never a previous refinement.
  const current=r.mesh.geometry;r.mesh.geometry=r.base;let recipe;
  try{recipe=(family==='flight'?buildFlightPartDetail:buildGroundPartDetail)(r.mesh,{tier,materials:palette,hardware,family,renderer,gpu});}
  finally{r.mesh.geometry=current;}
  if(!recipe?.geometry&&!recipe?.group){r.variants.set(tier,null);r.costs.set(tier,null);return null;}
  const cost=geometryCost(recipe,r.base),v={...recipe,tier,cost};
  r.costs.set(tier,{triangles:cost.triangles,drawCalls:cost.drawCalls});
  recipe.group?.traverse(o=>{
   o.hardwareDetailSource=r.mesh;o.userData={...r.mesh.userData,...o.userData,hardwareDetail:true,detailSourceId:r.mesh.id};
   delete o.userData.materialCylinderUV;delete o.userData.materialCylinderKey;
   if(o.isMesh){o.castShadow=r.mesh.castShadow;o.receiveShadow=r.mesh.receiveShadow;}
  });
  r.variants.set(tier,v);cacheBytes+=cost.bytes;cacheModels++;return v;
 }
 function sample(ms){
  if(!(ms>0&&ms<2000))return;
  averageMs=averageMs?averageMs*.92+ms*.08:ms;const limit=gpu?34:85;
  if(averageMs>limit){slow++;fast=0;}else if(averageMs<limit*.65){fast++;slow=0;}else{slow=fast=0;}
  if(slow>=8){performanceScale=Math.max(.45,performanceScale-.2);slow=0;lastCheck=-Infinity;}
  if(fast>=90){performanceScale=Math.min(1,performanceScale+.1);fast=0;lastCheck=-Infinity;}
 }
 function summary(){activeHigh=activeMedium=activeTriangles=activeCalls=0;for(const r of records)if(r.active){r.active.tier==='high'?activeHigh++:activeMedium++;activeTriangles+=r.active.cost.triangles;activeCalls+=r.active.cost.drawCalls;}}
 function run(options={},prepared=false){
  if(!alive)return false;
  const stamp=options.now??now(),nextMode=normalizeHardwareDetail(options.mode??mode),nextSurface=options.surface||surface;
  const objects=options.focusedObjects instanceof Set?options.focusedObjects:new Set(options.focusedObjects||[]),parts=new Set(options.focusedParts||[]);
  const camera=options.camera,width=options.width||800,height=options.height||600;
  camera?.updateMatrixWorld();
  const cameraKey=[...(camera?.matrixWorld.elements||[]),...(camera?.projectionMatrix.elements||[]),options.motionKey||''].join(',');
  const signature=[nextMode,nextSurface,width,height,options.thermal,options.enabled,Array.from(objects,o=>o.id).sort((a,b)=>a-b).join(','),[...parts].sort().join(',')].join('/');
  sample(options.frameMs);mode=nextMode;surface=nextSurface;
  if(!prepared&&!options.force&&!pending&&signature===lastSignature&&stamp-lastCheck<180){
   // A final wheel/drag event inside the cadence window still gets a settled
   // detail pass. One timeout wakes the on-demand view; there is no idle loop.
   if(cameraKey!==lastCameraKey&&!wake&&onWake)wake=setTimeout(()=>{wake=null;if(alive){lastCheck=-Infinity;onWake();}},Math.max(1,180-(stamp-lastCheck)));
   return false;
  }
  if(wake){clearTimeout(wake);wake=null;}
  lastSignature=signature;lastCameraKey=cameraKey;lastCheck=stamp;pending=0;
  const revisionBefore=revision;refresh();
  const budget=lastBudget=hardwareDetailBudget({gpu,surface,performanceScale});
  root.updateWorldMatrix(true,true);
  if(camera){camera.updateMatrixWorld();matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);}
  const candidates=[];let changed=revision!==revisionBefore;
  for(const r of records){
   let pixels=Infinity;const isFocused=!!focused(r,objects,parts),shown=options.enabled!==false&&visible(r.mesh)&&!materials(r.mesh).every(m=>m.userData?.domainGhost);
   if(shown&&camera){
    sphere.copy(r.bounds).applyMatrix4(r.mesh.matrixWorld);
    if(!frustum.intersectsSphere(sphere)){pixels=0;}
    else if(camera.isOrthographicCamera)pixels=2*sphere.radius*height*camera.zoom/Math.max(.0001,camera.top-camera.bottom);
    else{viewPoint.copy(sphere.center).applyMatrix4(camera.matrixWorldInverse);pixels=viewPoint.z>=sphere.radius?0:sphere.radius*height/Math.max(sphere.radius*.1,-viewPoint.z)/Math.tan(T.MathUtils.degToRad(camera.fov/2));}
   }
   let tier=hardwareDetailTier({pixels,focused:isFocused,mode,surface,current:r.active?.tier||'low',visible:shown,thermal:options.thermal,performanceScale});
   if(options.maxTier==='medium'&&tier==='high')tier='medium';
   if(tier==='low'){changed=activate(r,null)||changed;continue;}
   const physicalRadius=r.bounds.radius*Math.max(...r.mesh.scale.toArray().map(Math.abs));
   candidates.push({r,tier,rank:(isFocused?1e8:0)+(Number.isFinite(pixels)?Math.min(pixels,10000)*100:physicalRadius)});
  }
  candidates.sort((a,b)=>b.rank-a.rank);
  let usedTriangles=0,usedCalls=0,models=0,builds=0;const accepted=new Set(),started=now(),timeBudget=surface==='scene'?4:9,buildLimit=surface==='scene'?3:12;
  const candidateLimit=Math.min(candidates.length,budget.models*4);
  for(let i=0;i<candidateLimit;i++){
   const {r}=candidates[i];let tier=candidates[i].tier;if(models>=budget.models||usedTriangles>=budget.triangles*.94||usedCalls>budget.drawCalls-2)break;
   const fits=cost=>cost&&usedTriangles+cost.triangles<=budget.triangles&&usedCalls+cost.drawCalls<=budget.drawCalls;
   // Keep tiny cost records after eviction. An oversized variant must not be
   // built and evicted on every pending frame when the active budget is full.
   if(r.costs.has(tier)&&!fits(r.costs.get(tier))){if(tier==='high')tier='medium';else continue;}
   if(r.costs.has(tier)&&!fits(r.costs.get(tier)))continue;
   let v=r.variants.get(tier);
   if(!r.variants.has(tier)){
    if(!prepared&&(builds>=buildLimit||builds>0&&now()-started>timeBudget)){pending=candidateLimit-i;break;}
    v=build(r,tier);builds++;
   }
   if(v&&!fits(v.cost)&&tier==='high'){
    if(r.costs.has('medium')&&!fits(r.costs.get('medium')))continue;
    if(!r.variants.has('medium')){
     if(!prepared&&(builds>=buildLimit||builds>0&&now()-started>timeBudget)){pending=candidateLimit-i;break;}
     v=build(r,'medium');builds++;
    }else v=r.variants.get('medium');
   }
   if(!v||!fits(v.cost))continue;
   accepted.add(r);usedTriangles+=v.cost.triangles;usedCalls+=v.cost.drawCalls;models++;changed=activate(r,v)||changed;
  }
  // Retain an already accepted refinement during incremental preparation only
  // if it still fits the same hard budgets; hidden/ghosted objects never remain.
  if(pending)for(const {r} of candidates)if(!accepted.has(r)&&r.active&&models<budget.models&&usedTriangles+r.active.cost.triangles<=budget.triangles&&usedCalls+r.active.cost.drawCalls<=budget.drawCalls){accepted.add(r);usedTriangles+=r.active.cost.triangles;usedCalls+=r.active.cost.drawCalls;models++;}
  for(const r of records)if(r.active&&!accepted.has(r))changed=activate(r,null)||changed;
  summary();evict(budget);if(changed)notify();return changed;
 }
 function clear(){if(wake){clearTimeout(wake);wake=null;}let changed=false;for(const r of records){changed=activate(r,null)||changed;for(const [tier,v] of r.variants)if(v)releaseVariant(r,tier,v);r.variants.clear();}pending=0;lastCheck=-Infinity;summary();if(changed)notify();return changed;}
 return {
  update:options=>run(options),
  prepare({meshes=[],tier='high'}={}){return run({focusedObjects:new Set(meshes),mode:tier==='medium'?'auto':'high',surface:'thumbnail',maxTier:tier,force:true},true);},
  refresh,
  clear,
  stats:()=>({revision,mode,surface,activeHigh,activeMedium,triangles:activeTriangles,drawCalls:activeCalls,cachedModels:cacheModels,cacheBytes,pending,eligible:records.length,deviceProfile:lastBudget.profile,performanceScale,renderMs:Math.round(averageMs*10)/10,budget:{...lastBudget}}),
  dispose(){if(!alive)return;clear();alive=false;palette.release();records.length=0;byMesh.clear();}
 };
}
