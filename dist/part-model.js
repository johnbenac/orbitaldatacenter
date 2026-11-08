// A parts page owns its model. It never changes the orbital or integration scene.
// Selectors identify existing engineering geometry; an unmodeled allocation stays unmodeled.
import * as T from './vendor/three.module.js';
import {makeCraft} from './craft.js';
import {makeLaunch} from './launch-scene.js';
import {groundProcessingState} from './ground-processing.js';
import {INTEGRATION_TIMES} from './integration-sequence.js';
import {createHardwareDetail,detailSource} from './hardware-detail.js';

const list=x=>x==null?[]:Array.isArray(x)?x:[x],clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
const labels={deployment:'Deployment sequence',cmg:'Gimbal and rotor motion',terminals:'Terminal pointing',integration:'Integration sequence',fairing:'Fairing closing sequence',service:'Service arm release',processing:'Ground service rehearsal'};
export function partConfigurationKey(h){return JSON.stringify(h?.input||h||{});}
export function partAnimations(record){return list(record?.animations).map(a=>typeof a==='string'?{id:a,label:labels[a]||a}:a).filter(a=>labels[a?.id]).map(a=>({...a,label:a.label||labels[a.id]}));}
export function modelPath(factory,path){
 let values=[factory];
 const step=(value,key)=>{
  if(key==='*')return list(value?.children||value);
  // Keep an array intact until its numeric selector is read. Named properties
  // still traverse each member, as the terminal/assembly selectors expect.
  if(Array.isArray(value)&&!/^\d+$/.test(key))return value.flatMap(v=>step(v,key));
  const next=value?.[key];return next==null?[]:[next];
 };
 for(const key of String(path).replace(/\[(\d+)\]/g,'.$1').split('.'))values=values.flatMap(v=>step(v,key));
 return values.flat(Infinity).filter(o=>o?.isObject3D);
}
export function visiblePartObject(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}
const drawable=o=>!!(o.geometry&&(o.isMesh||o.isLine||o.isPoints));
const physical=o=>!ancestorValue(o,'hardwareDetail')&&!o.userData?.landscape&&!o.userData?.serviceCue&&!o.userData?.engineeringGraphic&&!(o.material&&list(o.material).every(m=>m.userData?.physicalMaterial===false));
function ancestorValue(o,key){for(let p=o;p;p=p.parent)if(p.userData?.[key]!=null)return p.userData[key];}
function childrenOf(roots){const set=new Set();for(const root of roots)root?.traverse(o=>set.add(o));return set;}

export function selectPartGeometry(model,record){
 const spec=record?.render||{},empty=reason=>({meshes:[],all:[],available:false,geometryStatus:reason,contextOnly:!!spec.contextOnly});
 if(spec.unavailable)return empty(spec.unavailableReason||'This allocation has no independent geometry in the current model.');
 const f=model.factory,scope=spec.scopeRoots?childrenOf(list(spec.scopeRoots).flatMap(p=>modelPath(f,p))):null;
 const roots=list(spec.roots).flatMap(p=>modelPath(f,p)),rootSet=childrenOf(roots);
 if(spec.connectionId){const c=f.umbilicals?.connectionMeshes.get(spec.connectionId);if(c)for(const root of [c.flight,c.groundHead,c.hose,...c.fixedMeshes])root?.traverse(o=>rootSet.add(o));}
 if(spec.umbilicalGroup)for(const g of f.umbilicals?.groups||[])if(g.spec.id===spec.umbilicalGroup)for(const root of [g.assembly,g.portRoot])root?.traverse(o=>rootSet.add(o));
 const names=new Set(list(spec.names)),roles=new Set(list(spec.roles)),ids=new Set(list(spec.partIds)),excluded=new Set(list(spec.excludeNames));
 f.root.traverse(o=>{if(names.has(o.name))o.traverse(c=>rootSet.add(c));});
 const all=[],meshes=[];
 f.root.traverse(o=>{
  if(!drawable(o)||!physical(o))return;all.push(o);
  if(scope&&!scope.has(o)||excluded.has(o.name))return;
  const matches=rootSet.has(o)||names.has(o.name)||roles.has(o.userData.materialRole)||ids.has(ancestorValue(o,'part'));
  if(matches)meshes.push(o);
 });
 let usedFallback=false;
 if(!meshes.some(visiblePartObject)){
  const fallbackRoots=childrenOf(list(spec.fallbackRoots).flatMap(p=>modelPath(f,p))),fallbackRoles=new Set(list(spec.fallbackRoles)),fallbackIds=new Set(list(spec.fallbackPartIds));
  for(const o of all)if((!scope||scope.has(o))&&(fallbackRoots.has(o)||fallbackRoles.has(o.userData.materialRole)||fallbackIds.has(ancestorValue(o,'part')))){meshes.push(o);usedFallback=true;}
 }
 if(!meshes.some(visiblePartObject))return empty('This part has no independently visible geometry in the current configuration.');
 const contextOnly=!!spec.contextOnly||usedFallback;
 return {meshes,all,available:true,contextOnly,usedFallback,geometryStatus:contextOnly?(spec.contextLabel||'Shown within its shared modeled package.'):'Actual configured geometry',roots};
}

// Keep each factory's dynamic UV buffers private. Display meshes share only this
// owned factory's buffers; cached materials and textures remain read-only.
export function createPartModel(h,family,onUpdate=()=>{},detailOptions=null){
 let alive=true;
 const factory=family==='launch'?makeLaunch(h,()=>{if(alive)onUpdate();},{environment:false}):makeCraft(h);
 const detail=detailOptions?createHardwareDetail(factory.root,{family,hardware:h,onWake:onUpdate,...detailOptions}):null;
 const model={factory,family,h,detail,pose,select:record=>selectPartGeometry(model,record),dispose};
 function pose(record,progress=1,animationId=null,snapshot={}){
  const spec=record?.render||{},p=clamp(progress),a=partAnimations(record).find(a=>a.id===animationId);
  if(family==='flight'){
   factory.positionPanels(animationId==='deployment'?p:1,snapshot||{});factory.setCoreView?.(false);
   if(factory.service)factory.service.visible=true;if(factory.gyroPack)factory.gyroPack.visible=true;
   for(const c of factory.cmgs||[]){c.gimbal.rotation.z=animationId==='cmg'?.65*Math.sin(p*Math.PI*2+c.index*.6):(snapshot.attitudeDynamics?.gimbalAnglesRad?.[c.index]||0);c.spin.rotation.x=animationId==='cmg'?p*Math.PI*12:0;}
   const q=animationId==='terminals'?p*Math.PI*2:0;
   factory.pointTerminals?.(new T.Vector3(.55*Math.sin(q),.3,1).normalize(),new T.Vector3(.7*Math.cos(q),.45,1).normalize());
  }else{
   const bay=!!(spec.stationDomain||spec.stationId||spec.processingId||record?.category==='ground'||['integration','fairing','processing'].includes(animationId));
   const domain=spec.stationDomain||'mechanical',bench=spec.commBench||'sband';
   let time=bay?(Number.isFinite(spec.integrationProgress)?INTEGRATION_TIMES[0]+clamp(spec.integrationProgress)*(INTEGRATION_TIMES.at(-1)-INTEGRATION_TIMES[0]):-3599):-45;
   if(animationId==='integration'){const from=Number.isFinite(a?.from)?a.from:INTEGRATION_TIMES[0],to=Number.isFinite(a?.to)?a.to:INTEGRATION_TIMES.at(-1);time=from+p*(to-from);}
   if(animationId==='fairing')time=INTEGRATION_TIMES[2]+p*(INTEGRATION_TIMES[3]-INTEGRATION_TIMES[2]);
   if(animationId==='service')time=(Number.isFinite(a?.from)?a.from:-45)+p*((Number.isFinite(a?.to)?a.to:0)-(Number.isFinite(a?.from)?a.from:-45));
   factory.update({flightPhase:bay?'integration':'pad',t:time,altitudeKm:0},bay?'integration':'pad',{phase:'D',domain:bay?domain:'launcher',commBench:bench});
   if(spec.stationId||spec.stationDomain||spec.processingId){
    const operation=a?.operation||spec.processingId;
    const processing=operation?groundProcessingState(h,operation,animationId==='processing'?p:.25,bench):null;
    factory.bay.setProcessingState?.(processing);factory.bay.select(domain,true,bench,processing);
    if(processing)factory.bay.animateProcessing?.(processing,true);
   }
  }
  factory.root.updateMatrixWorld(true);return model;
 }
 function dispose(){
  if(!alive)return;alive=false;detail?.dispose();const geometries=new Set(),materials=new Set(),textures=new Set();
  factory.root.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)geometries.add(o.geometry);for(const m of list(o.material)){if(m.userData.shared)continue;materials.add(m);for(const value of Object.values(m))if(value?.isTexture&&!value.userData.shared)textures.add(value);}});
  for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();factory.root.clear();
 }
 return model;
}

export function partObjectDescriptor(o,model){
 // A fastener or printed inspection tag belongs to its original MEL part.
 // Never route a generated detail mesh to a new or fabricated equipment row.
 o=detailSource(o);
 const names=[],ancestry=[];for(let p=o;p;p=p.parent){ancestry.push(p);if(p.name)names.push(p.name);}
 const f=model?.factory,paths=model?.family==='launch'?['bay.station',...Object.keys(f.parts).map(k=>'parts.'+k)]:['tankMap.fuel','tankMap.oxidizer','tankMap.helium','recorder','avionics','gyroPack','torquers','engines','regulator','patches','dish','optic','opticalTerminals','shelf','appendages','skin','enclosure','service','internal'];
 const ranked=f?paths.flatMap(path=>modelPath(f,path).filter(root=>ancestry.includes(root)).map(root=>({path,index:ancestry.indexOf(root)}))).sort((a,b)=>a.index-b.index):[];
 const roots=ranked.map(r=>r.path),partId=ancestorValue(o,'part');let category=model?.family==='launch'?(roots.includes('parts.facility')?'ground':roots.includes('parts.tower')?'site':'launch'):'flight',connectionId=null;
 for(const [id,c] of f?.umbilicals?.connectionMeshes||[])if([c.flight,c.groundHead,c.hose,...c.fixedMeshes].some(root=>ancestry.includes(root))){connectionId=id;break;}
 return {id:partId,partId,partIds:[...new Set(ancestry.map(p=>p.userData.part).filter(Boolean))],name:o.name,materialRole:o.userData.materialRole,names,rootKey:roots[0],rootKeys:roots,category,connectionId,stationId:ancestorValue(o,'stationId'),umbilicalGroup:ancestorValue(o,'umbilicalGroup')};
}
