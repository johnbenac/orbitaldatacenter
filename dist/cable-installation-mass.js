// The installed raceway/support schedule is shared with the physical renderer.
// Metal is counted from material pieces, so hollow cable space adds no mass.
// Functional rotary internals may instead have explicitly named PDR estimates.
import {deploymentLayout,leafPose,leafAxes,mechanismPose} from './deployment.js';

const identity=[[1,0,0],[0,1,0],[0,0,1]];
const finiteVector=value=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite);
const add=(a,b)=>a.map((value,index)=>value+b[index]);
const rotate=(point,axes)=>[0,1,2].map(axis=>point.reduce((sum,value,index)=>sum+value*axes[index][axis],0));
const positive=value=>Number.isFinite(value)&&value>0;
const sum=values=>values.reduce((total,value)=>total+value,0);
const center=(pieces,key='positionM')=>[0,1,2].map(axis=>sum(pieces.map(piece=>piece[key][axis]*piece.massKg))/sum(pieces.map(piece=>piece.massKg)));
const sourceLabel='Shared installed cable hardware schedule; geometry and material density are preliminary selections.';

function annularSectorProperties(outer,inner,length,axis,start,angle){
 const end=start+angle,area=(outer**2-inner**2)*angle/2;
 const first=(outer**3-inner**3)/(3*area),second=(outer**4-inner**4)/(4*area);
 const u=first*(Math.sin(end)-Math.sin(start)),v=first*(Math.cos(start)-Math.cos(end));
 const uu=second*(angle/2+(Math.sin(2*end)-Math.sin(2*start))/4)-u*u;
 const vv=second*(angle/2-(Math.sin(2*end)-Math.sin(2*start))/4)-v*v;
 const uv=second*(Math.sin(end)**2-Math.sin(start)**2)/2-u*v;
 const [U,V,A]=axis===0?[[0,0,-1],[0,1,0],[1,0,0]]:axis===1?[[1,0,0],[0,0,1],[0,1,0]]:[[1,0,0],[0,1,0],[0,0,1]];
 const covariance=Array.from({length:9},(_,index)=>{const i=Math.floor(index/3),j=index%3;return uu*U[i]*U[j]+vv*V[i]*V[j]+uv*(U[i]*V[j]+V[i]*U[j])+length**2/12*A[i]*A[j];});
 const trace=covariance[0]+covariance[4]+covariance[8];
 return {volumeM3:area*length,centroidOffsetM:U.map((value,index)=>value*u+V[index]*v),intrinsicTensorPerKg:covariance.map((value,index)=>(index%4===0?trace:0)-value)};
}

function axesFor(value,label){
 const axes=value||identity;
 if(!Array.isArray(axes)||axes.length!==3||!axes.every(finiteVector))throw new Error(label+': invalid material axes');
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)if(Math.abs(sum(axes[i].map((v,k)=>v*axes[j][k]))-(i===j?1:0))>1e-8)throw new Error(label+': material axes must be orthonormal');
 return axes.map(axis=>[...axis]);
}
function normalizePiece(piece,part,index,allocated=false){
 const label=part.id+':'+(piece.id||index),shape=allocated?'allocated':piece.shape||'box',positionM=piece.positionM||[0,0,0],axes=axesFor(piece.axes,label);
 if(!finiteVector(positionM))throw new Error(label+': invalid material position');
 let dimensionsM=piece.dimensionsM,volumeM3=null,massKg,axisIndex=1,outerRadiusM=null,innerRadiusM=0,lengthM=null,centroidOffsetM=[0,0,0],intrinsicTensorPerKg=null,angleRad=null,startAngleRad=null;
 const materialTakeoff=piece.materialTakeoff||null,motion=piece.motion;
 if(motion&&(motion.kind!=='solar-rotor'||!Number.isInteger(motion.wingInstance)||motion.wingInstance<0||!finiteVector(motion.originM)))throw new Error(label+': invalid solar rotor material frame');
 const densityKgM3=piece.densityKgM3??part.densityKgM3,material=piece.material||part.material||'Preliminary material';
 if(shape==='box'||shape==='allocated'){
  if(!finiteVector(dimensionsM)||!dimensionsM.every(positive))throw new Error(label+': invalid material dimensions');
  if(shape==='box')volumeM3=dimensionsM.reduce((a,b)=>a*b,1);
 }else if(shape==='annulus'||shape==='cylinder'){
  axisIndex={x:0,y:1,z:2}[piece.axis||'y'];outerRadiusM=piece.outerRadiusM??piece.radiusM;innerRadiusM=piece.innerRadiusM??0;lengthM=piece.lengthM;
  if(axisIndex===undefined||!positive(outerRadiusM)||!positive(lengthM)||!Number.isFinite(innerRadiusM)||innerRadiusM<0||innerRadiusM>=outerRadiusM)throw new Error(label+': invalid annular material dimensions');
  angleRad=piece.angleRad??2*Math.PI;startAngleRad=piece.startAngleRad??0;
  if(!positive(angleRad)||angleRad>2*Math.PI+1e-9||!Number.isFinite(startAngleRad))throw new Error(label+': invalid annular sector angles');
  ({volumeM3,centroidOffsetM,intrinsicTensorPerKg}=annularSectorProperties(outerRadiusM,innerRadiusM,lengthM,axisIndex,startAngleRad,angleRad));
  dimensionsM=[0,1,2].map(axis=>axis===axisIndex?lengthM:2*outerRadiusM);
 }else throw new Error(label+': unsupported material shape '+shape);
 if(allocated){
  if(!positive(piece.massKg)||!piece.basis)throw new Error(label+': a functional component needs an explicit positive mass and basis');
  massKg=piece.massKg;
  if(materialTakeoff){
   if(!Array.isArray(materialTakeoff)||!materialTakeoff.length||materialTakeoff.some(row=>![row.quantity,row.cutLengthM,row.areaMM2,row.densityKgM3].every(positive)))throw new Error(label+': invalid internal material takeoff');
   volumeM3=sum(materialTakeoff.map(row=>row.quantity*row.cutLengthM*row.areaMM2*1e-6));
   const calculated=sum(materialTakeoff.map(row=>row.quantity*row.cutLengthM*row.areaMM2*1e-6*row.densityKgM3));
   if(Math.abs(calculated-massKg)>1e-8)throw new Error(label+': internal material estimate does not match its cut schedule');
   massKg=calculated;
  }
 }else{
  if(!positive(densityKgM3))throw new Error(label+': material density is required');
  massKg=volumeM3*densityKgM3;
 }
 return {id:piece.id||String(index+1),label:piece.label||part.label,shape,positionM:[...positionM],centroidOffsetM,intrinsicTensorPerKg,axes,dimensionsM:[...dimensionsM],axisIndex,outerRadiusM,innerRadiusM,lengthM,angleRad,startAngleRad,material,densityKgM3:allocated?null:densityKgM3,volumeM3,massKg,materialTakeoff,occlusion:piece.occlusion||part.occlusion||'exposed',basis:allocated?piece.basis:piece.basis||part.basis||sourceLabel,massBasis:materialTakeoff?'contained-cut-volume-times-density':allocated?'declared-functional-component':'material-volume-times-density',...(motion?{motion:{kind:motion.kind,wingInstance:motion.wingInstance,originM:[...motion.originM]}}:{})};
}
function pieceExtent(piece,axes){
 if(piece.shape==='annulus'||piece.shape==='cylinder')return [0,1,2].map(axis=>Math.abs(axes[piece.axisIndex][axis])*piece.lengthM/2+piece.outerRadiusM*Math.sqrt(Math.max(0,1-axes[piece.axisIndex][axis]**2)));
 return [0,1,2].map(axis=>sum(piece.dimensionsM.map((dimension,index)=>dimension*Math.abs(axes[index][axis])/2)));
}
export function cableInstallationHardware(schedule=[]){
 const ids=new Set(),wbsIds=new Set();
 return schedule.map(part=>{
  const wbs=part.wbs||part.itemId,frame=part.frame||'body';
  if(!part.id||!part.label||!/^07\.(06|07|08)\./.test(wbs||'')||ids.has(part.id)||wbsIds.has(wbs))throw new Error('Installed cable hardware needs unique IDs and WBS 07.06/07.07/07.08 rows');
  if(!['body','payload'].includes(frame)||!finiteVector(part.positionM))throw new Error(part.id+': unsupported hardware frame or position');
  if(part.quantity!=null&&part.quantity!==1)throw new Error(part.id+': list each installed hardware instance at its own physical position');
  ids.add(part.id);wbsIds.add(wbs);
  const axes=axesFor(part.axes,part.id),materialPieces=part.materialPieces||[{dimensionsM:part.dimensionsM,positionM:[0,0,0]}];
  const pieces=[...materialPieces.map((piece,index)=>normalizePiece(piece,part,index)),...(part.massItems||[]).map((piece,index)=>normalizePiece(piece,part,materialPieces.length+index,true))];
  if(!pieces.length)throw new Error(part.id+': installed hardware has no material or functional components');
  const framed=pieces.map(piece=>({...piece,shapePositionM:add(part.positionM,rotate(piece.positionM,axes)),positionM:add(part.positionM,rotate(add(piece.positionM,rotate(piece.centroidOffsetM,piece.axes)),axes)),axes:piece.axes.map(axis=>rotate(axis,axes))}));
  const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  for(const piece of framed){const extent=pieceExtent(piece,piece.axes);for(let axis=0;axis<3;axis++){bounds.min[axis]=Math.min(bounds.min[axis],piece.shapePositionM[axis]-extent[axis]);bounds.max[axis]=Math.max(bounds.max[axis],piece.shapePositionM[axis]+extent[axis]);}}
  const massKg=sum(pieces.map(piece=>piece.massKg)),materialVolumeM3=sum(pieces.map(piece=>piece.volumeM3||0)),allocatedInternalMassKg=sum(pieces.filter(piece=>piece.massBasis==='declared-functional-component').map(piece=>piece.massKg));
  return {id:part.id,wbs,ledgerId:'cable-installation:'+part.id,label:part.label,frame,positionM:[...part.positionM],axes,pieces:framed,massKg,materialVolumeM3,materialMassKg:massKg-allocatedInternalMassKg,allocatedInternalMassKg,centroidM:center(framed),dimensionsM:bounds.max.map((value,axis)=>value-bounds.min[axis]),sourceUrl:part.sourceUrl||'./redwire-harness-installation.js',basis:part.basis||sourceLabel};
 });
}

export function adoptCableInstallationHardware(h,graph){
 const parts=cableInstallationHardware(graph.installationHardware||[]);
 const retained=h.massLedger.filter(row=>!row.cableInstallationPartId),at=retained.findIndex(row=>row.id==='margin');
 retained.splice(at<0?retained.length:at,0,...parts.map(part=>({id:part.ledgerId,label:part.label,kg:part.massKg,group:'Hardware',cableInstallationPartId:part.id,wbs:part.wbs})));
 h.massLedger.splice(0,h.massLedger.length,...retained);
 h.cableInstallationHardware={parts,totalMassKg:sum(parts.map(part=>part.massKg)),materialMassKg:sum(parts.map(part=>part.materialMassKg)),allocatedInternalMassKg:sum(parts.map(part=>part.allocatedInternalMassKg)),basis:'Each physical cable-installation assembly owns one hardware ledger row. Material volume and named functional-component estimates are separate from cable, connector and existing deployment-mechanism masses.'};
 graph.installationHardwareMass=h.cableInstallationHardware;
 return h.cableInstallationHardware;
}

export function installWorkerOpticsPlacements(h,graph){
 const optics=h.serviceArchitecture?.fabric?.workerOptics;if(!optics)return;
 const seen=new Set(),placements=[],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 for(const harness of graph.harnesses.filter(harness=>harness.kind==='data'&&harness.id.startsWith('D-WORKER-')))for(const portId of [harness.fromPortId,harness.toPortId]){
  const port=graph.portById[portId],box=graph.boxById[port.boxId];
  if(!/^(fabric-|compute-)/.test(box.id)||seen.has(portId))continue;seen.add(portId);
  const z=port.normal,x0=cross(Math.abs(z[1])<.9?[0,1,0]:[1,0,0],z),length=Math.hypot(...x0),x=x0.map(value=>value/length),y=cross(z,x);
  placements.push({id:'lr4:'+portId,boxId:box.id,portId,frame:box.frame||'body',positionM:box.positionM.map((value,axis)=>value+port.positionM[axis]-z[axis]*.04),axes:[x,y,z],dimensionsM:optics.moduleDimensionsM,massKg:optics.unitMassKg});
 }
 if(placements.length!==optics.moduleCount)throw new Error('LR4 endpoint count does not match the installed worker links');
 optics.placements=placements;
}

function installedFrame(h,frame,deployment,attitude){
 if(frame!=='payload')return {axes:identity,origin:[0,0,0]};
 const layout=deploymentLayout(h),descriptor=layout.descriptors.find(part=>part.type==='rad'),pose=leafPose(layout,descriptor,deployment,h.input.solarTiltDeg,attitude),axes=leafAxes(pose);
 return {axes,origin:[pose.x,pose.y,pose.z].map((value,axis)=>value+.06*axes[1][axis])};
}
const opticsElementCache=new WeakMap(),installationElementCache=new WeakMap();
// Hardware schedules are immutable between adoptions. Keep body-fixed pieces
// in their installed frame once; an electrical takeoff revision or a replaced
// schedule invalidates them. Articulated payload pieces still follow every pose.
function framedElements(entries,deployment,attitude,h,movingOnly,frames={}){
 return entries.flatMap(entry=>{
  if(entry.fixed)return movingOnly?[]:entry.fixed;
  if(entry.motion){
   const poses=frames.solar??=mechanismPose(deploymentLayout(h),deployment,h.input.solarTiltDeg,attitude).wings,pose=poses[entry.motion.wingInstance],origin=entry.motion.originM;
   if(!pose||pose.root.some((value,axis)=>Math.abs(value-origin[axis])>1e-8))throw new Error('Solar rotor material frame does not match its installed wing root');
   const axes=pose.axes||leafAxes({pitch:pose.pitch});
   return entry.parts.map(part=>({...part,centroidM:add(origin,rotate(part.positionM.map((value,axis)=>value-origin[axis]),axes)),axes:part.axes.map(axis=>rotate(axis,axes))}));
  }
  const frame=frames.payload??=installedFrame(h,'payload',deployment,attitude);
  return entry.parts.map(part=>({...part,centroidM:add(frame.origin,rotate(part.positionM,frame.axes)),axes:part.axes.map(axis=>rotate(axis,frame.axes))}));
 });
}
function bodyElements(parts){
 return parts.map(part=>({...part,centroidM:add([0,0,0],rotate(part.positionM,identity)),axes:part.axes.map(axis=>rotate(axis,identity))}));
}
export function workerOpticsMassElements(h,deployment=1,attitude=null,{movingOnly=false}={}){
 const optics=h.serviceArchitecture?.fabric?.workerOptics;if(!optics?.massKg)return [];
 if(movingOnly&&!optics.placements?.some(part=>part.frame==='payload'))return [];
 const revision=h.electricalMassRevision||0;let cached=opticsElementCache.get(h);
 if(!cached||cached.optics!==optics||cached.placements!==optics.placements||cached.massRevision!==revision||cached.massKg!==optics.massKg){
  const placements=optics.placements||[{id:'lr4:pre-layout',frame:'body',positionM:[0,0,0],axes:identity,dimensionsM:optics.moduleDimensionsM,massKg:optics.massKg}];
  const entries=placements.map(part=>{const parts=[{...part,wbs:'01.05',moving:part.frame==='payload'}];return part.frame==='payload'?{parts}:{fixed:bodyElements(parts)};});
  cached={optics,placements:optics.placements,massRevision:revision,massKg:optics.massKg,entries,fixed:entries.every(entry=>entry.fixed)?entries.flatMap(entry=>entry.fixed):null};opticsElementCache.set(h,cached);
 }
 if(cached.fixed)return movingOnly?[]:cached.fixed;
 return framedElements(cached.entries,deployment,attitude,h,movingOnly);
}

function installationElements(h,movingOnly=false){
 const hardware=h.cableInstallationHardware,parts=hardware?.parts||[];
 if(!parts.length)return null;
 const revision=h.electricalMassRevision||0;let cached=installationElementCache.get(h);
 if(!cached||cached.hardware!==hardware||cached.parts!==parts||cached.massRevision!==revision){
  // A motion-only request for an entirely fixed schedule must not read or
  // transform its material geometry. Once adopted, the stored motion flag
  // also avoids scanning thousands of fixed pieces on every control step.
  if(movingOnly&&!parts.some(part=>part.frame==='payload'||part.pieces.some(piece=>piece.motion)))return null;
  const records=parts.map(part=>{
   const pieces=part.pieces.map(piece=>({...piece,id:part.id+':'+piece.id,partId:part.id,wbs:part.wbs,moving:part.frame==='payload'||!!piece.motion}));
   const fixed=bodyElements(pieces.filter(piece=>!piece.moving)),movingPieces=pieces.filter(piece=>piece.moving),
    entries=part.frame==='payload'?[{parts:movingPieces}]:movingPieces.map(piece=>({parts:[piece],motion:piece.motion}));
   let fixedIndex=0,movingIndex=0;
   const order=pieces.map(piece=>({moving:piece.moving,index:piece.moving?movingIndex++:fixedIndex++}));
   return {entries,group:{partId:part.id,fixed,moving:[],order}};
  });
  const hasMoving=records.some(record=>record.entries.length),groups=new Map(records.map(record=>[record.group.partId,record.group]));
  cached={hardware,parts,massRevision:revision,records,groups,hasMoving,
   fixed:hasMoving?null:records.flatMap(record=>record.group.fixed)};
  installationElementCache.set(h,cached);
 }
 return cached;
}

// Fixed groups retain their array identity even when another piece in the
// installation rotates. Their mass moments can therefore be reused without
// regrouping or reconstructing body-fixed material at every attitude pose.
// The order map retains the original per-assembly piece ordering for callers
// that need the complete material inventory rather than its mass moments.
export function cableInstallationMassGroups(h,deployment=1,attitude=null){
 const cached=installationElements(h);if(!cached)return new Map();
 if(!cached.hasMoving)return cached.groups;
 const frames={},groups=new Map();
 for(const {entries,group} of cached.records)groups.set(group.partId,entries.length?
  {...group,moving:framedElements(entries,deployment,attitude,h,false,frames)}:group);
 return groups;
}

// Returns one mass element per actual material piece or named internal component.
// The payload frame is the rendered payloadRack, 60 mm above its radiator datum.
export function cableInstallationMassElements(h,deployment=1,attitude=null,{movingOnly=false}={}){
 const cached=installationElements(h,movingOnly);if(!cached)return [];
 if(movingOnly){
  if(!cached.hasMoving)return [];
  const frames={};return cached.records.flatMap(({entries})=>entries.length?
   framedElements(entries,deployment,attitude,h,false,frames):[]);
 }
 if(cached.fixed)return cached.fixed;
 return [...cableInstallationMassGroups(h,deployment,attitude).values()].flatMap(group=>
  !group.moving.length?group.fixed:group.order.map(slot=>(slot.moving?group.moving:group.fixed)[slot.index]));
}
