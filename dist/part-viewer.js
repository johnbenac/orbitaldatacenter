import * as T from './vendor/three.module.js';
import {softRenderer} from './software-scene.js';
import {createLaunchRendering} from './launch-rendering.js';
import {onSpacecraftTextureUpdate,spacecraftTextureStatus} from './spacecraft-material-render.js';
import {createPartModel,partConfigurationKey,partAnimations,partObjectDescriptor,visiblePartObject} from './part-model.js';
import {detailMaterialRevision} from './detail-materials.js';
import {createVerificationSetting} from './part-verification-scenes.js';
import {getFacilityAsset,chooseFacilityAsset,assessFacilityFit} from './test-facilities.js';
import {stablePerspectiveNear} from './camera-clipping.js';
import {thermalScales,temperatureColor} from './thermal-colors.js';
import {activeThermalBoundaryIds} from './thermal-engineering-visuals.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),array=x=>Array.isArray(x)?x:[x];
const BG='#0c141d',presets={iso:[.8,.42],front:[0,0],side:[Math.PI/2,0],top:[0,Math.PI/2-.001]};
const settings=new Set(['studio','installed','review','vibration','thermal-vacuum','thermal-cycle','acoustic','rf-chamber','optical-bench','load-frame','mass-properties','pressure-bench','electrical-bench','clean-inspection','deployment','fit-check','propulsion-stand','site-commissioning']);
const facilitySettings=new Set(['vibration','thermal-vacuum','thermal-cycle','acoustic','rf-chamber']);
const scaleModes=new Set(['auto','none','banana','person','ruler','container']);
const raf=fn=>requestAnimationFrame(fn),caf=id=>cancelAnimationFrame(id);

// A single instance is used by a focused page, or by the shared thumbnail queue.
// Source geometry belongs to this instance; presentation materials are private.
export function createPartViewer(container,{onSelect,onStatus,onChange,onHoldPlayback,offscreen=false,width=320,height=220,facilityAssetId=null}={}){
 let canvas=document.createElement('canvas'),renderer,gpu=true,alive=true,frame=0,lastTime=0,visible=true;
 try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:offscreen?'low-power':'default'});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;}
 catch(error){canvas=document.createElement('canvas');renderer=softRenderer(canvas);gpu=false;}
 canvas.className='part-scene-canvas';canvas.style.cssText='display:block;width:100%;height:100%;touch-action:none;outline-offset:-3px;background:'+BG;canvas.tabIndex=offscreen?-1:0;canvas.setAttribute('aria-label','Part model. Drag to rotate, shift-drag or right-drag to pan, scroll to zoom. Arrow keys rotate; plus and minus zoom; Home resets.');
 container.append(canvas);
 const overlay=offscreen?null:document.createElement('canvas');if(overlay){overlay.className='part-setting-labels';overlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';overlay.setAttribute('aria-hidden','true');container.append(overlay);}
 const scene=new T.Scene(),objects=new T.Group(),axes=new T.AxesHelper(1);scene.add(objects,axes);axes.visible=false;
 const perspective=new T.PerspectiveCamera(34,1,.001,1e6),ortho=new T.OrthographicCamera(-1,1,1,-1,.001,1e6);
 const hemi=new T.HemisphereLight(0xe4f0ff,0x8f9caa,1.3),key=new T.DirectionalLight(0xffedcf,3.2),rim=new T.DirectionalLight(0xaccfff,1.4);scene.add(hemi,key,rim,key.target,rim.target);
 const softbox=new T.DirectionalLight(0xfff1db,2.65),bounce=new T.DirectionalLight(0xdcecff,1.6);scene.add(softbox,bounce,softbox.target,bounce.target);
 const rendering=createLaunchRendering(renderer,gpu),models=new Map(),materials=new Set(),pairs=[];
 const state={available:false,geometryStatus:'Choose a part to inspect.',contextOnly:false,animations:[],animationId:null,progress:1,playing:false,mode:'materials',detailMode:'high',context:false,setting:offscreen?'studio':'review',facilityAssetId:null,scaleMode:'auto',projection:'perspective',axes:false,autoRotate:false,lighting:'studio',exposureEV:0,thermalScale:'full'};
 let configKey='',model=null,record=null,snapshot={},selection=null,selectedObjects=new Set(),detailRevision=-1,renderMs=0,camera=perspective,w=width,ht=height,radius=1,distance=5,yaw=.8,pitch=.42,target=V(),revision=0,holds=0,appearance=null,recording=null,capturing=false;
 const bounds=new T.Box3(),box=new T.Box3(),size=V(),center=V(),trackedCenter=V(),raycaster=new T.Raycaster(),pointer=new T.Vector2();
 let stage=null,parentRecord=null,parentSelection=null,stageOffset=V(),partSize=V(),mateTravel=0;
 let thermalRun=null,thermalFrame=null,thermalProgress=0,thermalMapped=0,thermalDisplay=null;
 const stageBounds=new T.Box3(),presentationOffset=V(),facilitySelections=new Map();
 const initialFacility=getFacilityAsset(facilityAssetId);if(initialFacility)facilitySelections.set(initialFacility.kind,initialFacility.id);
 const electricalItem=()=>record?.render?.electricalItemId||record?.id;
 const electricalMate=()=>!!model?.factory.electrical?.canMate(electricalItem());
 const reducedMotion=()=>!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const getState=()=>({...state,animations:state.animations.map(a=>({...a})),scaleReferences:stage?.references||[],settingStats:stage?.stats||null,facility:stage?.facility||null,modeledSizeM:partSize.toArray(),detailStats:model?.detail?.stats()||null,thermal:thermalRun?{available:!!thermalFrame,runId:thermalRun.id,modelId:thermalRun.modelId,caseId:thermalRun.caseId,status:'predicted',timeS:thermalFrame?.timeS??0,durationS:thermalRun.frames?.at(-1)?.timeS??0,progress:thermalProgress,mappedMeshes:thermalMapped,scale:state.thermalScale}:null,renderer:gpu?'webgl':'canvas',width:w,height:ht});
 function report(status=false){const value=getState();if(status)onStatus?.(value);onChange?.(value);}
 function request(){if(!alive||offscreen||frame||!visible||document.hidden)return;frame=raf(paint);}
 function changed(status=false){revision++;report(status);appearance?.listener?.();request();}
 function dropDisplay(){objects.clear();pairs.length=0;for(const m of materials)m.dispose();materials.clear();}
 function dropStage(){if(stage){scene.remove(stage.root);stage.dispose();stage=null;}stageBounds.makeEmpty();overlay?.getContext('2d')?.clearRect(0,0,overlay.width,overlay.height);}
 function animationsForSetting(){
  state.animations=partAnimations(record);
  if(state.setting==='fit-check'&&state.available&&!state.contextOnly)state.animations.push({id:'mate',label:electricalMate()?'Connector mating rehearsal':'Nominal mating rehearsal'});
  if(stage?.animated&&state.available)state.animations.push({id:'fixture',label:'Test-setting walkthrough'});
 }
 const displayMode=()=>appearance?.thermal===true&&thermalFrame?'thermal':appearance?.thermal===false&&state.mode==='thermal'?'materials':state.mode;
 function sourceThermalNode(source){
  for(let node=source?.hardwareDetailSource||source;node;node=node.parent)if(node.userData?.thermalNode)return node.userData.thermalNode;
  return null;
 }
 function thermalNodeFor(source){
  if(!thermalRun)return null;
  const nodes=thermalRun.nodes||[],article=nodes.find(n=>n.id===thermalRun.articleNodeId&&n.partIds?.includes(record?.id));
  // A local article model deliberately has one uniform temperature. An
  // integrated run colors only geometry tagged to its actual solved node.
  if(article?.role==='article')return article;
  const legacy=sourceThermalNode(source);
  return legacy?nodes.find(n=>n.legacyNodeId===legacy||n.id===legacy)||null:null;
 }
 function applyThermal(){
  const visible=displayMode()==='thermal'&&!!thermalFrame;thermalMapped=0;const mapped=new Map();
  for(const {source,object,ghost} of pairs){
   if(ghost||!visible)continue;
   const node=thermalNodeFor(source),temperatureK=thermalFrame.temperaturesK?.[node?.id],color=node?temperatureColor(temperatureK,state.thermalScale):null;
   for(const m of array(object.material))m.color?.setHex(color??0x48535c);
   if(color!==null&&object.visible){thermalMapped++;mapped.set(node.id,{...node,temperatureK});}
  }
  // Context ghosts, scale references and room geometry never borrow the
  // selected part's temperature. Probe symbols mark model output locations.
  const rows=[...mapped.values()],article=rows.find(n=>n.role==='article')||rows[0],interfaceNode=thermalRun?.nodes?.find(n=>n.role==='interface'),activeBoundaries=new Set(activeThermalBoundaryIds(thermalRun)),boundary=Object.fromEntries(Object.entries(thermalFrame?.boundariesK||{}).filter(([id])=>activeBoundaries.has(id)));
  thermalDisplay=visible?{rows,article,boundary,frame:thermalFrame}:null;
  stage?.setThermalState?.(visible?{articleK:article?.temperatureK,articleLabel:article?.label,interfaceK:thermalFrame.temperaturesK?.[interfaceNode?.id],shroudK:boundary.shroud,fixtureK:boundary.fixture,airK:boundary.air,scale:state.thermalScale,guides:appearance?.guides!==false}:null);
 }
 function articleMassKg(){
  for(const value of [record?.massKg,record?.extendedMassKg])if(Number.isFinite(value)&&value>=0)return value;
  const fact=record?.facts?.find(f=>/^(?:Mass|Allocation mass|Included allocation mass)$/i.test(f.label||'')&&/^kg$/i.test(f.unit||''));
  return Number.isFinite(fact?.value)&&fact.value>=0?fact.value:null;
 }
 function buildStage(){
  dropStage();state.facilityAssetId=null;if(!state.available||!boundsForPart()){animationsForSetting();return;}
  bounds.getSize(partSize);mateTravel=Math.max(.01,partSize.x,partSize.y,partSize.z)*1.15;
  if(!['studio','installed'].includes(state.setting)){
   const anchor=bounds.clone(),origin=anchor.getCenter(V());origin.y=anchor.min.y;
   const sourcePorts=[...(model?.factory.electrical?.articlePorts(electricalItem())||[])],selected=new Set(selection.meshes);
   for(const connection of model?.factory.fluidConnections||[])for(const port of [connection.a,connection.b]){let belongs=false;port.traverse(o=>{if(selected.has(o))belongs=true;});if(belongs&&!sourcePorts.some(p=>p.id===port.uuid))sourcePorts.push({id:port.uuid,kind:'fluid',position:port.getWorldPosition(V()),normal:V(0,0,1).applyQuaternion(port.getWorldQuaternion(new T.Quaternion())),diameterM:connection.part==='propulsion'?.024:.036});}
   const articlePorts=sourcePorts.map(p=>({...p,position:p.position.clone().sub(origin),normal:p.normal.clone()}));
   const article={sizeM:partSize.toArray(),massKg:articleMassKg()},facilityAsset=facilitySettings.has(state.setting)?chooseFacilityAsset(state.setting,article,facilitySelections.get(state.setting)):null,facilityFit=facilityAsset?assessFacilityFit(facilityAsset,article):null;
   stage=createVerificationSetting({kind:state.setting,size:partSize.clone(),scaleMode:state.scaleMode,software:!gpu,articlePorts,facilityAsset,facilityFit});
   state.facilityAssetId=stage.facility?.assetId||null;
   anchor.getCenter(stageOffset);stageOffset.y=anchor.min.y-stage.placement.y;stageOffset.x-=stage.placement.x;stageOffset.z-=stage.placement.z;
   stage.root.position.copy(stageOffset);stage.root.updateMatrixWorld(true);scene.add(stage.root);stageBounds.copy(stage.fitBounds).translate(stageOffset);stage.update?.(0);
  }
  animationsForSetting();
 }
 function ownMaterial(source,ghost){
  let m;const mode=displayMode();
  if(ghost)m=source.isLineBasicMaterial?new T.LineBasicMaterial({color:0x7794a5,transparent:true,opacity:.14,depthWrite:false}):new T.MeshBasicMaterial({color:0x7294a7,transparent:true,opacity:.085,depthWrite:false,side:T.DoubleSide});
  else if(mode==='thermal')m=source.isLineBasicMaterial?new T.LineBasicMaterial({color:0x48535c,toneMapped:false}):new T.MeshBasicMaterial({color:0x48535c,toneMapped:false,side:source.side});
  else if(mode==='solid')m=source.isLineBasicMaterial?new T.LineBasicMaterial({color:0x788d99}):new T.MeshStandardMaterial({color:0xb8ccd2,metalness:.18,roughness:.64,side:source.side});
  else if(mode==='wireframe')m=source.isLineBasicMaterial?new T.LineBasicMaterial({color:0x8de0dd}):new T.MeshBasicMaterial({color:0x8de0dd,wireframe:true,side:T.DoubleSide});
  else{m=source.clone();m.userData={...source.userData,shared:false};if(m.isMeshStandardMaterial)m.envMapIntensity=m.metalness>.5?.95:.48;}
  materials.add(m);return m;
 }
 function rebuild(){
  dropDisplay();if(!selection?.available)return;
  const selected=new Set(selection.meshes),contextSources=state.setting==='fit-check'&&parentSelection?.available?parentSelection.meshes:selection.all,sources=new Set(state.context?[...contextSources,...selection.meshes]:selection.meshes),cache=new Map();
  // Detailed children move with the selected source; surrounding ghost geometry
  // stays at the overview tier. Source selectors never absorb generated meshes.
  for(const source of selection.meshes)source.traverse(child=>{if(child!==source&&child.userData.hardwareDetail&&child.geometry&&child.material){sources.add(child);selected.add(child);}});
  if(state.animationId==='electrical')for(const source of model.factory.electrical?.activityFor(electricalItem())||[]){sources.add(source);selected.add(source);}
  for(const source of sources){
   const ghost=!selected.has(source),cacheKey=ghost?'ghost':displayMode()==='thermal'?'thermal/'+(thermalNodeFor(source)?.id||'unmapped'):'part';let bySource=cache.get(cacheKey);if(!bySource){bySource=new Map();cache.set(cacheKey,bySource);}
   const mats=array(source.material).map(m=>{if(!bySource.has(m))bySource.set(m,ownMaterial(m,ghost));return bySource.get(m);}),mat=Array.isArray(source.material)?mats:mats[0];
   let object;if(source.isInstancedMesh){object=new T.InstancedMesh(source.geometry,mat,source.count);object.instanceMatrix=source.instanceMatrix;object.instanceColor=source.instanceColor;}
   else object=source.isLineSegments?new T.LineSegments(source.geometry,mat):source.isLine?new T.Line(source.geometry,mat):source.isPoints?new T.Points(source.geometry,mat):new T.Mesh(source.geometry,mat);
   object.name=source.name;object.matrixAutoUpdate=false;object.frustumCulled=true;object.userData.partSource=source;object.renderOrder=ghost?-1:source.renderOrder;objects.add(object);pairs.push({source,object,ghost});
  }
  sync();applyThermal();
 }
 function sync(){
  model?.factory.root.updateMatrixWorld(true);
  presentationOffset.set(0,0,0);
  if(state.animationId==='mate'&&!electricalMate()){const p=state.progress*state.progress*(3-2*state.progress);presentationOffset.x=-mateTravel*(1-p);}
  else if(state.animationId==='fixture'&&stage?.contentOffset)presentationOffset.copy(stage.contentOffset);
  for(const {source,object,ghost} of pairs){object.geometry=source.geometry;object.matrix.copy(source.matrixWorld);if(!ghost){object.matrix.elements[12]+=presentationOffset.x;object.matrix.elements[13]+=presentationOffset.y;object.matrix.elements[14]+=presentationOffset.z;}object.matrixWorldNeedsUpdate=true;object.visible=visiblePartObject(source);
   if(!ghost&&displayMode()==='materials'){const src=array(source.material),dst=array(object.material);for(let i=0;i<src.length;i++){dst[i].opacity=src[i].opacity;dst[i].visible=src[i].visible;if(src[i].map!==dst[i].map){dst[i].map=src[i].map;dst[i].needsUpdate=true;}}}
  }
  objects.updateMatrixWorld(true);
 }
 function refreshDetail(force=false,prepare=false){
  if(!selection?.available||!model?.detail)return false;
  if(prepare&&state.detailMode!=='low')model.detail.prepare({meshes:selection.meshes,tier:'high'});
  const updated=model.detail.update({camera,width:w,height:ht,mode:state.detailMode,focusedObjects:selectedObjects,surface:offscreen?'thumbnail':'parts',force,frameMs:renderMs,motionKey:state.animationId+'/'+state.progress,now:performance.now()}),stats=model.detail.stats();
  if(updated||detailRevision!==stats.revision){detailRevision=stats.revision;rebuild();revision++;appearance?.listener?.();return true;}
  return false;
 }
 function boundsForPart(){bounds.makeEmpty();for(const {source,object,ghost} of pairs)if(!ghost&&object.visible&&!source.userData.engineeringGraphic){if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();box.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);bounds.union(box);}return !bounds.isEmpty();}
 function followPart(){if(boundsForPart()){bounds.getCenter(center);if(!stage)target.add(center.clone().sub(trackedCenter));trackedCenter.copy(center);}}
 function updateCamera(){
  const aspect=Math.max(.05,w/ht),half=distance*Math.tan(perspective.fov*Math.PI/360),near=Math.max(.00001,distance-radius*3),far=Math.max(distance+radius*6,near+10);
  camera=state.projection==='orthographic'?ortho:perspective;perspective.aspect=aspect;ortho.left=-half*aspect;ortho.right=half*aspect;ortho.top=half;ortho.bottom=-half;
  for(const c of [perspective,ortho]){c.near=c.isPerspectiveCamera?stablePerspectiveNear(distance,near):near;c.far=far;c.position.copy(target).add(V(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(distance));c.up.set(0,1,0);c.lookAt(target);c.updateProjectionMatrix();c.updateMatrixWorld();}
  axes.position.copy(target);axes.scale.setScalar(radius*.75);axes.visible=state.available&&state.axes&&(appearance?.guides??true);
 }
 function fit(reset=false){
  sync();if(!boundsForPart())return;bounds.getCenter(trackedCenter);
  if(state.setting==='fit-check'&&electricalMate()){
   // Frame the actual mating envelope, including the plug/card's withdrawn
   // position. The bench and ghosted parent remain context, not the subject.
   const envelope=bounds.clone(),electrical=model.factory.electrical,progress=state.animationId==='mate'?state.progress:1;
   try{for(const endpoint of [0,1]){electrical.mating(electricalItem(),endpoint);sync();if(boundsForPart())envelope.union(bounds);}}
   finally{electrical.mating(electricalItem(),progress);sync();}
   bounds.copy(envelope);
  }else if(state.animationId==='mate'){bounds.translate(presentationOffset.clone().negate());box.copy(bounds).translate(V(-mateTravel,0,0));bounds.union(box);}
  if(stage&&state.setting!=='fit-check')bounds.union(stageBounds);
  bounds.getCenter(target);bounds.getSize(size);radius=Math.max(.005,size.length()/2);
  // Fit the projected corners: broad panels and tall launch structures retain useful scale.
  if(reset)[yaw,pitch]=presets.iso;
  const forward=V(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)),right=V().crossVectors(V(0,1,0),forward).normalize(),up=V().crossVectors(forward,right).normalize(),tan=Math.tan(perspective.fov*Math.PI/360),aspect=Math.max(.05,w/ht);
  distance=radius*.2;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const v=V(x,y,z).sub(target);distance=Math.max(distance,(Math.max(Math.abs(v.dot(right))/aspect,Math.abs(v.dot(up)))/tan+v.dot(forward))*1.17);}
  distance=Math.max(radius*1.35,distance);updateCamera();changed();
 }
 function light(){
  const mode=appearance?.lighting??state.lighting,studio=mode==='studio'||mode==='auto'&&snapshot.eclipse,ev=appearance?.exposureEV??state.exposureEV;
  let sun=V(-.6,.8,1).normalize();if(model?.family==='flight'&&snapshot.sunECI&&snapshot.bodyXECI&&snapshot.bodyUpECI){const x=V(...snapshot.bodyXECI),up=V(...snapshot.bodyUpECI),z=V().crossVectors(x,up).normalize(),s=V(...snapshot.sunECI);sun.set(s.dot(x),s.dot(up),s.dot(z)).normalize();}
  const direct=studio||model?.family==='launch'||!snapshot.eclipse;key.position.copy(target).addScaledVector(sun,radius*3);key.target.position.copy(target);key.intensity=direct?3.2:0;hemi.intensity=studio?1.35:.045;rim.intensity=studio?1.5:.12;rim.position.copy(target).add(V(1,.4,-1).multiplyScalar(radius*3));rim.target.position.copy(target);
  scene.userData.exposureEV=ev;const lighting={ambient:studio?.42:.015,direct:direct?1.12:0,sun,rim:studio?.35:.04,rimDirection:V(1,.4,-1)};
  softbox.visible=bounce.visible=studio;
  if(studio){const front=V(-.65,.78,1).normalize().applyQuaternion(camera.quaternion),fill=V(.82,.1,.55).normalize().applyQuaternion(camera.quaternion);softbox.position.copy(target).addScaledVector(front,radius*3);bounce.position.copy(target).addScaledVector(fill,radius*3);softbox.target.position.copy(target);bounce.target.position.copy(target);lighting.softbox=front;lighting.bounce=fill;}
  scene.userData.lightState=lighting;
  if(gpu)renderer.toneMappingExposure=1.16*2**ev;rendering.update(scene,{lighting:studio?'studio':'realistic',studioSpacecraft:true});scene.background=new T.Color(stage?.background||BG);
 }
 function poseAnimation(){if(state.animationId==='mate'&&electricalMate())model?.pose(record,state.progress,'mate',snapshot);else if(['mate','fixture'].includes(state.animationId)){if(state.animationId==='fixture')stage?.update?.(state.progress);}else model?.pose(record,state.progress,state.animationId,{...snapshot,reducedMotion:reducedMotion()});if(state.animationId==='electrical')stage?.update?.(state.progress);sync();followPart();}
 function animate(dt){
  if(holds)return;
  if(state.playing&&state.animationId&&state.available&&model){state.progress=(state.progress+dt/10)%1;poseAnimation();revision++;onChange?.(getState());}
  if(state.autoRotate){yaw+=dt*.18;revision++;}
 }
 function copyFrame(output,context){
  if(output.width!==canvas.width)output.width=canvas.width;if(output.height!==canvas.height)output.height=canvas.height;
  context.save();try{context.setTransform(1,0,0,1,0,0);context.globalAlpha=1;context.globalCompositeOperation='source-over';context.fillStyle=BG;context.fillRect(0,0,output.width,output.height);context.drawImage(canvas,0,0);drawLabels(context,output.width,output.height);}finally{context.restore();}
 }
 function drawLabels(ctx,width,height){
  const sx=width/w,sy=height/ht,occupied=[];
  ctx.save();ctx.scale(sx,sy);ctx.font='500 10px system-ui, sans-serif';ctx.textBaseline='middle';
  if(appearance?.guides!==false)for(const label of stage?.labels||[]){if(label.hidden)continue;const point=(label.position?.clone?label.position.clone():V(...label.position)).add(stageOffset).project(camera);if(point.z<-1||point.z>1)continue;const x=(point.x*.5+.5)*w,y=(-point.y*.5+.5)*ht,text=String(label.text),tw=ctx.measureText(text).width+14,left=x-tw/2,top=y-10;if(left<7||left+tw>w-7||top<7||top+21>ht-34)continue;if(occupied.some(r=>left<r.x+r.w&&left+tw>r.x&&top<r.y+22&&top+22>r.y))continue;occupied.push({x:left,y:top,w:tw});ctx.fillStyle='rgba(9,19,28,.84)';ctx.fillRect(left,top,tw,21);ctx.fillStyle='#c2ddd9';ctx.fillText(text,left+7,top+10.5);}
  if(thermalDisplay){
   const left=10,top=10,panelWidth=Math.min(260,w-20),stops=thermalScales[state.thermalScale],frame=thermalDisplay.frame,rows=thermalDisplay.rows;
   const shorten=(text,max=36)=>String(text).length>max?String(text).slice(0,max-1)+'…':String(text),temp=value=>Number.isFinite(value)?value.toFixed(1)+' K':'Unresolved';
   const duration=Math.max(0,frame.timeS||0),clock=duration<3600?(duration/60).toFixed(1)+' min':(duration/3600).toFixed(2)+' h';
   const lines=[shorten(clock+' · '+String(frame.stageLabel||frame.stageId||'Transient prediction').replaceAll('-',' '))];
   for(const row of rows.slice(0,3))lines.push(shorten(row.label||row.id,25)+' · '+temp(row.temperatureK));
   if(!rows.length)lines.push('No solved node maps to this geometry');
   for(const [id,value] of Object.entries(thermalDisplay.boundary).filter(([id,value])=>['shroud','fixture','air'].includes(id)&&Number.isFinite(value)))lines.push((id==='shroud'?'Shroud boundary':id==='air'?'Air boundary':'Fixture boundary')+' · '+temp(value));
   const panelHeight=72+lines.length*15;ctx.fillStyle='rgba(8,17,26,.93)';ctx.fillRect(left,top,panelWidth,panelHeight);
   ctx.fillStyle='#c1d7e0';ctx.font='600 9px ui-monospace, monospace';ctx.fillText('PREDICTED THERMAL STATE',left+10,top+13);
   ctx.font='500 10px system-ui, sans-serif';lines.forEach((text,i)=>{ctx.fillStyle=i===0?'#94acbd':'#d4e6e8';ctx.fillText(shorten(text,Math.max(15,Math.floor((panelWidth-18)/5.5))),left+10,top+31+i*15);});
   const barY=top+39+lines.length*15,barWidth=panelWidth-20;
   for(let i=0;i<stops.length;i++){ctx.fillStyle=stops[i][1];ctx.fillRect(left+10+i*barWidth/stops.length,barY,barWidth/stops.length+1,5);}
   ctx.fillStyle='#adbfcd';ctx.font='500 8px ui-monospace, monospace';ctx.fillText('≤'+stops[0][0]+' K',left+10,barY+14);ctx.fillText('≥'+stops.at(-1)[0]+' K',left+panelWidth-49,barY+14);
   ctx.fillStyle='#94adb7';ctx.fillText('Lumped nodes · gray = unmapped',left+10,barY+27);
  }
  ctx.restore();
 }
 function renderNow(){
  if(!alive)return;updateCamera();stage?.updateCamera?.(camera);if(refreshDetail())report();applyThermal();light();const start=performance.now();renderer.render(scene,camera);renderMs=performance.now()-start;
  if(overlay){if(overlay.width!==w)overlay.width=w;if(overlay.height!==ht)overlay.height=ht;const ctx=overlay.getContext('2d');ctx.clearRect(0,0,w,ht);drawLabels(ctx,w,ht);}
  if(recording&&!capturing){const token=recording;try{copyFrame(token.canvas,token.context);token.onFrame(token.canvas);}catch(error){releaseRecording(token);token.onError?.(error);}}
 }
 function paint(now){
  frame=0;if(!alive||!visible||document.hidden)return;const dt=lastTime?Math.min(.05,(now-lastTime)/1000):0;lastTime=now;animate(dt);renderNow();
  if(model?.detail?.stats().pending||!holds&&(state.playing||state.autoRotate))request();else lastTime=0;
 }
 function textureChanged(){if(!alive)return;sync();revision++;appearance?.listener?.();request();}
 const unsubscribe=onSpacecraftTextureUpdate(textureChanged);
 function setPart(next,h,s={},options={}){
  if(!alive)return getState();const signature=partConfigurationKey(h),family=next?.render?.family||'flight';
  thermalRun=thermalFrame=thermalDisplay=null;thermalMapped=thermalProgress=0;if(state.mode==='thermal')state.mode='materials';
  model?.detail?.clear();detailRevision=-1;selectedObjects=new Set();
  if(signature!==configKey){dropDisplay();for(const m of models.values())m.dispose();models.clear();model=null;configKey=signature;}
  record=next;snapshot=s||{};parentRecord=options.parentRecord||null;parentSelection=null;state.playing=false;state.progress=1;state.animationId=null;state.animations=partAnimations(record);dropStage();
  if(settings.has(options.setting))state.setting=options.setting;else if(options.context===true)state.setting='installed';
  if(Object.prototype.hasOwnProperty.call(options,'facilityAssetId')){const requested=getFacilityAsset(options.facilityAssetId);if(!options.facilityAssetId)facilitySelections.delete(state.setting);else if(requested?.kind===state.setting)facilitySelections.set(state.setting,requested.id);}
  state.facilityAssetId=null;
  if(scaleModes.has(options.scaleMode))state.scaleMode=options.scaleMode;state.context=['installed','fit-check'].includes(state.setting);
  if(!record||record.render?.unavailable){selection=null;dropDisplay();partSize.set(0,0,0);state.available=false;state.contextOnly=false;state.geometryStatus=record?.render?.unavailableReason||'This allocation has no independent modeled geometry.';changed(true);return getState();}
  if(!models.has(family))models.set(family,createPartModel(h,family,textureChanged,{renderer,gpu}));model=models.get(family);model.pose(record,1,null,snapshot);selection=model.select(record);selectedObjects=new Set(selection.meshes);
  if(parentRecord&&parentRecord.render?.family===family){parentSelection=model.select(parentRecord);selection=model.select(record);selectedObjects=new Set(selection.meshes);}
  Object.assign(state,{available:selection.available,geometryStatus:selection.geometryStatus,contextOnly:selection.contextOnly});rebuild();if(selection.available){buildStage();fit(options.reset!==false);if(refreshDetail(true,offscreen))fit(false);}else partSize.set(0,0,0);changed(true);return getState();
 }
 function resize(dimensions){
  if(!alive)return;const r=dimensions||(!offscreen?container.getBoundingClientRect():{width,height});if(!(r.width>0&&r.height>0))return;
  w=Math.max(1,Math.floor(r.width));ht=Math.max(1,Math.floor(r.height));
  if(gpu){renderer.setPixelRatio(recording?recording.scale:offscreen?1:Math.min(window.devicePixelRatio||1,1.6));renderer.setSize(w,ht,false);}else renderer.setSize(recording?Math.round(w*recording.scale):w,recording?Math.round(ht*recording.scale):ht);
  updateCamera();request();
 }
 function setMode(value){if(!['materials','solid','wireframe','thermal'].includes(value)||value===state.mode||value==='thermal'&&!thermalFrame)return;state.mode=value;rebuild();changed();}
 function setThermalRun(run,{progress=0}={}){
  const usable=run&&Array.isArray(run.nodes)&&Array.isArray(run.frames)&&run.frames.length&&run.frames.every(f=>f&&Number.isFinite(f.timeS)&&f.temperaturesK&&typeof f.temperaturesK==='object');
  thermalRun=usable?run:null;thermalProgress=clamp(Number(progress)||0,0,1);thermalFrame=usable?run.frames[Math.round(thermalProgress*(run.frames.length-1))]:null;thermalDisplay=null;thermalMapped=0;
  if(!usable&&state.mode==='thermal')state.mode='materials';
  state.playing=false;state.animationId=null;model?.pose(record,1,null,snapshot);rebuild();changed();return getState();
 }
 function setThermalFrame(frame,{run=thermalRun,progress}={}){
  if(run!==thermalRun)setThermalRun(run,{progress:progress??0});
  if(!thermalRun)return getState();
  const wasAvailable=!!thermalFrame;
  thermalFrame=frame&&Number.isFinite(frame.timeS)&&frame.temperaturesK?frame:null;
  thermalProgress=clamp(Number.isFinite(progress)?progress:(frame?.timeS||0)/Math.max(1,thermalRun.frames.at(-1)?.timeS||1),0,1);
  if(!thermalFrame&&state.mode==='thermal'){state.mode='materials';rebuild();}
  applyThermal();
  // Thermal playback has its own controls. Updating a temperature sample
  // must not rebuild every settings control and learning-page caption.
  if(wasAvailable!==!!thermalFrame)changed();else{revision++;appearance?.listener?.();request();}
  return getState();
 }
 function setThermalScale(value){if(!thermalScales[value]||value===state.thermalScale)return;state.thermalScale=value;applyThermal();changed();}
 function setDetail(value){if(!['auto','high','low'].includes(value)||value===state.detailMode)return;state.detailMode=value;refreshDetail(true,offscreen);changed(true);}
 function setSetting(value){if(!settings.has(value)||state.setting===value)return;state.setting=value;state.context=['installed','fit-check'].includes(value);state.playing=false;state.animationId=null;state.progress=1;model?.pose(record,1,null,snapshot);rebuild();buildStage();fit(true);changed(true);}
 function setFacility(assetId){
  if(!alive||!facilitySettings.has(state.setting))return getState();const asset=getFacilityAsset(assetId);if(assetId&&asset?.kind!==state.setting)return getState();
  if(assetId)facilitySelections.set(state.setting,asset.id);else facilitySelections.delete(state.setting);
  state.playing=false;state.animationId=null;state.progress=1;model?.pose(record,1,null,snapshot);rebuild();buildStage();fit(true);changed(true);return getState();
 }
 function setScale(value){if(!scaleModes.has(value)||state.scaleMode===value)return;state.scaleMode=value;state.playing=false;state.animationId=null;state.progress=1;model?.pose(record,1,null,snapshot);sync();buildStage();fit();changed(true);}
 function setContext(value){setSetting(value?'installed':'studio');}
 function setProjection(value){if(!['perspective','orthographic'].includes(value))return;state.projection=value;changed();}
 function setView(value){if(!presets[value])return;[yaw,pitch]=presets[value];fit();}
 function setAxes(value){state.axes=!!value;changed();}
 function setAutoRotate(value){state.autoRotate=!!value;lastTime=0;changed();}
 function setLighting(value){if(!['auto','studio','realistic'].includes(value))return;state.lighting=value;changed();}
 function setExposure(value){state.exposureEV=clamp(Number(value)||0,-2,2);changed();}
 function setAnimation(id,playing=true){
  if(id===false||id==null||!state.available||!model){state.playing=false;changed();return;}
  if(!state.animations.some(a=>a.id===id))return;
  if(state.animationId===id){state.playing=!!playing;lastTime=0;changed();return;}
  state.animationId=id;state.playing=!!playing&&!reducedMotion();state.progress=reducedMotion()?(id==='mate'?1:.5):0;
  if(id==='electrical')rebuild();
  if(['mate','fixture'].includes(id)){model.pose(record,1,null,snapshot);poseAnimation();fit();lastTime=0;changed();return;}
  // Frame deployed appendages before beginning their existing stow/deploy path.
  model?.pose(record,id==='deployment'?1:0,id,snapshot);sync();fit();
  model?.pose(record,0,id,snapshot);sync();followPart();lastTime=0;changed();
 }
 function setPlaying(value){state.playing=!!value&&!!state.animationId&&state.available&&!!model;lastTime=0;changed();}
 function setProgress(value){state.playing=false;if(!state.available||!model){changed();return;}state.progress=clamp(Number(value)||0,0,1);if(!state.animationId)state.animationId=state.animations[0]?.id||null;poseAnimation();changed();}
 function holdPlayback(){const releaseExternal=onHoldPlayback?.();holds++;lastTime=0;let released=false;return ()=>{if(released)return;released=true;holds=Math.max(0,holds-1);releaseExternal?.();lastTime=0;request();};}
 function captureSettings(){return {lightingAvailable:true,lighting:state.lighting,exposureEV:state.exposureEV,leaders:false,leadersAvailable:false,vectorsAvailable:false,signalsAvailable:false,guides:state.axes||!!stage,guidesAvailable:state.axes||!!stage,thermalAvailable:!!thermalFrame,thermal:state.mode==='thermal'};}
 function beginCaptureAppearance(options={}){
  if(appearance)throw Error('A capture preview is already open.');const token={};appearance=token;
  const update=(next={})=>{if(appearance!==token)return;const mode=displayMode();token.lighting=['auto','studio','realistic'].includes(next.lighting)?next.lighting:state.lighting;token.exposureEV=clamp(Number(next.exposureEV??state.exposureEV)||0,-2,2);token.guides=next.guides!==false;token.thermal=typeof next.thermal==='boolean'?next.thermal:state.mode==='thermal';if(displayMode()!==mode)rebuild();revision++;request();};
  update(options);return {update,release(){if(appearance!==token)return;const mode=displayMode();appearance=null;if(displayMode()!==mode)rebuild();request();},onChange(listener){token.listener=listener;return ()=>{token.listener=null;};}};
 }
 function captureStatus(){const tex=spacecraftTextureStatus();return {ready:alive&&state.available&&(!gpu||!renderer.getContext().isContextLost()),revision,loading:tex.pending>0,assetError:tex.failed.length>0,width:w,height:ht,renderer:gpu?'webgl':'canvas'};}
 function captureDimensions({width=1920,height=1080,video=false}={}){
  if(!captureStatus().ready)throw Error('Choose a modeled part before capturing.');if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Capture dimensions must be positive numbers.');
  const edge=video?1920:4096,gl=gpu?renderer.getContext():null,viewport=gl?.getParameter(gl.MAX_VIEWPORT_DIMS),limit=gpu?Math.min(edge,renderer.capabilities.maxTextureSize,gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),viewport[0],viewport[1]):video?Math.max(w,ht):2048,scale=Math.min(width/w,height/ht,limit/w,limit/ht,Math.sqrt(8388608/(w*ht)));
  return {width:Math.max(1,Math.floor(w*scale)),height:Math.max(1,Math.floor(ht*scale)),scale};
 }
 function captureFrame({width=1920,height=1080,canvas:output=null}={}){
  if(capturing||recording)throw Error('A part capture is already in progress.');const dims=captureDimensions({width,height});output??=document.createElement('canvas');if(output===canvas)throw Error('Use a separate capture canvas.');const ctx=output.getContext('2d',{alpha:false});if(!ctx)throw Error('Capture canvas unavailable.');
  const ratio=gpu?renderer.getPixelRatio():1,oldW=canvas.width,oldH=canvas.height;capturing=true;
  try{if(gpu){renderer.setPixelRatio(dims.scale);renderer.setSize(w,ht,false);}else renderer.setSize(dims.width,dims.height);renderNow();copyFrame(output,ctx);return output;}
  finally{capturing=false;if(gpu){renderer.setPixelRatio(ratio);renderer.setSize(w,ht,false);}else renderer.setSize(oldW,oldH);renderNow();}
 }
 function releaseRecording(token){if(recording!==token)return;recording=null;if(alive){resize();request();}}
 function beginRecording({width=1920,height=1080,onFrame,onError}={}){
  if(recording||capturing)throw Error('A part capture is already in progress.');if(typeof onFrame!=='function')throw Error('Recording requires a frame callback.');const dims=captureDimensions({width,height,video:true}),output=document.createElement('canvas'),context=output.getContext('2d',{alpha:false});if(!context)throw Error('Recording canvas unavailable.');
  const token={canvas:output,context,onFrame,onError,scale:dims.scale};recording=token;
  try{resize();renderNow();}catch(error){releaseRecording(token);throw error;}
  return {width:dims.width,height:dims.height,release:()=>releaseRecording(token)};
 }
 const pointers=new Map();let drag=null;
 function pointerDown(e){if(e.button>2||offscreen)return;canvas.focus({preventScroll:true});canvas.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false,button:e.button,shift:e.shiftKey};}
 function pan(dx,dy){const scale=2*distance*Math.tan(perspective.fov*Math.PI/360)/ht,right=V(1,0,0).applyQuaternion(camera.quaternion),up=V(0,1,0).applyQuaternion(camera.quaternion);target.addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);}
 function pointerMove(e){
  if(!pointers.has(e.pointerId)||!drag)return;const old=[...pointers.values()];pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const points=[...pointers.values()];
  if(points.length===2&&old.length===2){const before=Math.hypot(old[1].x-old[0].x,old[1].y-old[0].y),after=Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y);if(after>0)distance=clamp(distance*before/after,radius*.03,radius*100);pan((points[0].x+points[1].x-old[0].x-old[1].x)/2,(points[0].y+points[1].y-old[0].y-old[1].y)/2);drag.moved=true;}
  else{const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(drag.button!==0||drag.shift||e.shiftKey)pan(dx,dy);else{yaw-=dx*.008;pitch=clamp(pitch+dy*.008,-Math.PI/2+.003,Math.PI/2-.003);}drag.moved||=Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>4;}
  drag.x=e.clientX;drag.y=e.clientY;state.autoRotate=false;changed();
 }
 function pointerUp(e){
  const pick=drag&&!drag.moved&&pointers.size===1&&drag.button===0;pointers.delete(e.pointerId);if(!pointers.size)drag=null;
  if(pick&&onSelect){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(objects.children,false).find(h=>h.object.visible);if(hit)onSelect(partObjectDescriptor(hit.object.userData.partSource,model),{clientX:e.clientX,clientY:e.clientY,record});}
 }
 function wheel(e){e.preventDefault();distance=clamp(distance*Math.exp(e.deltaY*.001),radius*.03,radius*100);changed();}
 function keyDown(e){let handled=true;if(e.key==='Home')fit(true);else if(e.key==='ArrowLeft')yaw-=.12;else if(e.key==='ArrowRight')yaw+=.12;else if(e.key==='ArrowUp')pitch=clamp(pitch+.12,-1.568,1.568);else if(e.key==='ArrowDown')pitch=clamp(pitch-.12,-1.568,1.568);else if(['+','='].includes(e.key))distance=Math.max(radius*.03,distance*.9);else if(e.key==='-')distance=Math.min(radius*100,distance/ .9);else handled=false;if(handled){e.preventDefault();changed();}}
 function contextMenu(e){e.preventDefault();}
 const events=[['pointerdown',pointerDown],['pointermove',pointerMove],['pointerup',pointerUp],['pointercancel',e=>{pointers.delete(e.pointerId);drag=null;}],['wheel',wheel,{passive:false}],['keydown',keyDown],['contextmenu',contextMenu]];
 if(!offscreen)for(const [type,fn,opts] of events)canvas.addEventListener(type,fn,opts);
 const ro=!offscreen&&typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>resize()):null;ro?.observe(container);
 const io=!offscreen&&typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;lastTime=0;if(visible)request();else if(frame){caf(frame);frame=0;}}):null;io?.observe(container);
 function visibility(){lastTime=0;if(document.hidden&&frame){caf(frame);frame=0;}else request();}
 if(!offscreen)document.addEventListener('visibilitychange',visibility);
 function destroy(){if(!alive)return;alive=false;if(frame)caf(frame);unsubscribe();ro?.disconnect();io?.disconnect();document.removeEventListener('visibilitychange',visibility);for(const [type,fn,opts] of events)canvas.removeEventListener(type,fn,opts);appearance=null;recording=null;dropStage();dropDisplay();for(const m of models.values())m.dispose();models.clear();axes.geometry.dispose();array(axes.material).forEach(m=>m.dispose());rendering.dispose();renderer.dispose();if(gpu)renderer.forceContextLoss();canvas.remove();overlay?.remove();}
 resize(offscreen?{width,height}:undefined);
 return {setPart,setMode,setDetail,setContext,setSetting,setFacility,setScale,setProjection,setView,setAxes,setAnimation,setPlaying,setProgress,setAutoRotate,setLighting,setExposure,setThermalRun,setThermalFrame,setThermalScale,fit,resize,destroy,getState,holdPlayback,captureSettings,captureStatus,captureDimensions,captureFrame,beginCaptureAppearance,beginRecording,
  // Used only by the static thumbnail queue; no canvas is attached to MEL rows.
  renderThumbnail(){renderNow();return canvas.toDataURL('image/webp',.78);}};
}

let thumbnailViewer=null,thumbnailHost=null,thumbnailQueue=[],thumbnailBusy=false,thumbnailIdle=0;
const thumbnailCache=new Map(),thumbnailPending=new Map();
function thumbnailKey(record,h,width,height){return detailMaterialRevision+'|'+partConfigurationKey(h)+'|'+record.id+'|'+JSON.stringify(record.render)+'|'+width+'x'+height;}
function abortError(){return new DOMException('Thumbnail request canceled.','AbortError');}
function idleTurn(){return new Promise(resolve=>{if(typeof requestIdleCallback==='function')requestIdleCallback(resolve,{timeout:250});else setTimeout(resolve,0);});}
async function runThumbnails(){
 if(thumbnailBusy)return;thumbnailBusy=true;clearTimeout(thumbnailIdle);
 try{while(thumbnailQueue.length){const job=thumbnailQueue.shift();if(job.canceled()){job.reject(abortError());thumbnailPending.delete(job.key);continue;}
   try{await idleTurn();if(job.canceled())throw abortError();
    if(!thumbnailViewer){thumbnailHost=document.createElement('div');thumbnailViewer=createPartViewer(thumbnailHost,{offscreen:true,width:job.width,height:job.height});}
    thumbnailViewer.resize({width:job.width,height:job.height});const state=thumbnailViewer.setPart(job.record,job.h,job.s);if(!state.available){job.resolve(null);continue;}
    // Maps are shared with the main application. Give an initial decode a short
    // opportunity to finish; fallback material colors remain valid if offline.
    const start=performance.now();while(spacecraftTextureStatus().pending&&performance.now()-start<1200&&!job.canceled())await new Promise(r=>setTimeout(r,50));
    if(job.canceled())throw abortError();const url=thumbnailViewer.renderThumbnail();thumbnailCache.set(job.key,url);while(thumbnailCache.size>192)thumbnailCache.delete(thumbnailCache.keys().next().value);job.resolve(url);
   }catch(error){job.reject(error);}finally{thumbnailPending.delete(job.key);}
  }}finally{thumbnailBusy=false;thumbnailIdle=setTimeout(()=>{if(!thumbnailBusy){thumbnailViewer?.destroy();thumbnailViewer=null;thumbnailHost=null;}},20000);}
}
export function generatePartThumbnail(record,h,s={},options={}){
 const width=clamp(Math.round(options.width||176),64,512),height=clamp(Math.round(options.height||116),48,384),key=thumbnailKey(record,h,width,height),signal=options.signal;
 if(signal?.aborted)return Promise.reject(abortError());if(record.render?.unavailable)return Promise.resolve(null);if(thumbnailCache.has(key))return Promise.resolve(thumbnailCache.get(key));
 // Each caller can cancel its subscription; shared work is canceled only after
 // every subscriber leaves. This prevents one hidden list canceling another.
 let entry=thumbnailPending.get(key);
 if(!entry){entry={users:new Set()};entry.promise=new Promise((resolve,reject)=>thumbnailQueue.push({key,record,h,s,width,height,resolve,reject,canceled:()=>!entry.users.size}));thumbnailPending.set(key,entry);}
 const token={};entry.users.add(token);
 const promise=new Promise((resolve,reject)=>{let done=false;const finish=(fn,value)=>{if(done)return;done=true;signal?.removeEventListener('abort',abort);entry.users.delete(token);fn(value);},abort=()=>finish(reject,abortError());signal?.addEventListener('abort',abort,{once:true});entry.promise.then(url=>finish(resolve,url),error=>finish(reject,error));});
 runThumbnails();return promise;
}
export function hydratePartThumbnails(container,catalog,h,s={},options={}){
 const controller=new AbortController(),slots=[...container.querySelectorAll('[data-part-thumbnail]')],started=new WeakSet();let alive=true;
 const get=id=>catalog.byId instanceof Map?catalog.byId.get(id):catalog.byId?.[id]||catalog.records?.find(r=>r.id===id);
 async function show(slot){
  if(started.has(slot)||!alive)return;started.add(slot);const record=get(slot.dataset.partThumbnail);if(!record)return;slot.dataset.thumbnailState='loading';
  try{const url=await generatePartThumbnail(record,h,s,{...options,signal:controller.signal});if(!alive||!slot.isConnected)return;if(!url){slot.dataset.thumbnailState='unavailable';slot.hidden=true;return;}
   const img=slot.tagName==='IMG'?slot:document.createElement('img');img.alt='3D preview of '+record.title;img.decoding='async';img.src=url;img.hidden=false;if(img!==slot)slot.replaceChildren(img);slot.dataset.thumbnailState='ready';
  }catch(error){if(error.name!=='AbortError'&&alive){slot.dataset.thumbnailState='error';slot.hidden=true;}}
 }
 const observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);show(entry.target);}},{rootMargin:'180px'}):null;
 for(const slot of slots){if(observer)observer.observe(slot);else show(slot);}
 return {destroy(){if(!alive)return;alive=false;observer?.disconnect();controller.abort();}};
}
