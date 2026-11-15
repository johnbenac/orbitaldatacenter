import * as T from './vendor/three.module.js';
import {tagMaterial,roleMaterial,boxMaterialUV} from './spacecraft-material-render.js';

// The routed installation supplies actual straight raceway sections and their
// structural attachment points. This module makes the same finite material
// pieces for the scene and the mass/MEL schedule. Empty cable space is not metal.
export const starmindHarnessInstallationPolicy=Object.freeze({
 revision:'starmind-mounted-raceways-1',wallThicknessM:.002,railWidthM:.018,
 rungWidthM:.012,maximumRungPitchM:.25,footThicknessM:.003,
 footWidthM:.040,footLengthM:.060,standWidthM:.018,standThicknessM:.003,
 aluminiumDensityKgM3:2700,retainerDensityKgM3:1300,
 basis:'Preliminary body-fixed ladder raceways and retained short equipment drops. Each section has explicit structural attachment points; the same material schedule drives its rendered hardware, MEL, mass, center of gravity and inertia.'
});
const P=starmindHarnessInstallationPolicy;
const add=(a,b,k=1)=>a.map((v,i)=>v+k*b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a);
const unit=a=>{const n=norm(a);if(!(n>1e-9))throw new Error('Degenerate Starmind installation axis');return a.map(v=>v/n);};
const point=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const box=(id,dimensionsM,positionM,extra={})=>({id,shape:'box',dimensionsM,positionM,...extra});
function frame(zDirection,openingDirection){
 const z=unit(zDirection),projection=dot(openingDirection,z),candidate=add(openingDirection,z,-projection);
 if(norm(candidate)<1e-8)throw new Error('Raceway opening normal is parallel to its run');
 const y=unit(candidate),x=unit(cross(y,z));return [x,y,z];
}
function linkFrame(zDirection){
 const z=unit(zDirection),reference=Math.abs(z[1])<.9?[0,1,0]:[1,0,0];return frame(z,reference);
}
const localPoint=(p,origin,axes)=>axes.map(axis=>dot(sub(p,origin),axis));
const localAxes=(worldAxes,axes)=>worldAxes.map(direction=>axes.map(axis=>dot(direction,axis)));
const worldPoint=(p,origin,axes)=>origin.map((v,i)=>v+p.reduce((n,x,k)=>n+x*axes[k][i],0));

function addMount(pieces,mount,index,origin,axes){
 const attachment=mount.attachmentPointM,target=mount.trayPointM;
 if(!point(attachment)||!point(target)||!mount.attachment)throw new Error('Raceway mount needs real attachment and tray points');
 const direction=unit(sub(target,attachment)),normal=unit(mount.attachmentNormalBody||direction);
 if(dot(direction,normal)<=0)throw new Error('Raceway mount must extend into the free side of its attachment');
 const footCenter=add(attachment,normal,P.footThicknessM/2),start=add(attachment,normal,P.footThicknessM),delta=sub(target,start),length=norm(delta);
 if(length<.002)throw new Error('Raceway stand needs a positive material length');
 pieces.push(box('mount-'+index+'-foot',[P.footWidthM,P.footLengthM,P.footThicknessM],localPoint(footCenter,origin,axes),{axes:localAxes(linkFrame(normal),axes),attachment:mount.attachment,attachmentPointM:[...attachment]}));
 pieces.push(box('mount-'+index+'-stand',[P.standWidthM,P.standThicknessM,length],localPoint(add(start,delta,.5),origin,axes),{axes:localAxes(linkFrame(delta),axes),attachment:mount.attachment}));
 // Two bolt/nut/washer sets per foot are an explicit preliminary purchased-
 // hardware allowance, distinct from the plate and stand material volume.
 return {id:'mount-'+index+'-fasteners',label:'Two M4 fastener sets',massKg:.008,positionM:localPoint(footCenter,origin,axes),axes:localAxes(linkFrame(normal),axes),dimensionsM:[.030,.030,.012],renderEnvelope:false,basis:'Two allocated 4 g M4 bolt/nut/washer sets per physical mounting foot; final fastener grade and joint sizing are detailed design work.'};
}

export function starmindHarnessInstallationHardware(h,architecture,corridors=architecture.starmindHarnessInstallation?.corridors||[]){
 if(h.architectureFamilyId!=='starmind-cross')return [];
 const seen=new Set();
 return corridors.map((corridor,index)=>{
  const {id,fromM,toM,widthM,depthM,normalBody,mounts}=corridor;
  if(!id||seen.has(id)||!point(fromM)||!point(toM)||!point(normalBody)||!(widthM>0&&depthM>0)||!Array.isArray(mounts)||!mounts.length)throw new Error('Invalid or unsupported Starmind raceway '+id);
  seen.add(id);
  const delta=sub(toM,fromM),length=norm(delta),axes=frame(delta,normalBody),origin=add(fromM,delta,.5),t=P.wallThicknessM,r=P.railWidthM;
  if(length<=P.rungWidthM)throw new Error('Starmind raceway is shorter than its end rung');
  const pieces=[],massItems=[],railY=-depthM/2-t/2;
  for(const sign of[-1,1])pieces.push(box('longeron-'+sign,[r,t,length],[sign*(widthM+r)/2,railY,0]));
  const intervalCount=Math.max(1,Math.ceil((length-P.rungWidthM)/P.maximumRungPitchM));
  const stations=Array.from({length:intervalCount+1},(_,k)=>-length/2+P.rungWidthM/2+(length-P.rungWidthM)*k/intervalCount);
  for(const [j,z]of stations.entries()){
   // Rungs butt against the inner rail edges: no overlapped metal is charged.
   pieces.push(box('rung-'+j,[widthM,t,P.rungWidthM],[0,railY,z]));
  }
  // Explicit stations are metres along the run from fromM. A branch-entry
  // ladder uses verified gaps between branch rows; continuous back rails
  // support both bridge legs even when a bridge is between the rear rungs.
  if(corridor.retainerStationsM!=null&&!Array.isArray(corridor.retainerStationsM))throw new Error('Starmind retention stations must be an array '+id);
  const retention=Array.isArray(corridor.retainerStationsM)?[...corridor.retainerStationsM]:(corridor.openEntry?[]:stations.map(z=>z+length/2));
  if(retention.some((s,j)=>!Number.isFinite(s)||s<P.rungWidthM/2-1e-9||s>length-P.rungWidthM/2+1e-9||j>0&&s-retention[j-1]<P.rungWidthM))throw new Error('Invalid Starmind retention stations '+id);
  for(const [j,station]of retention.entries()){
   const z=station-length/2;
   const retainer={material:'PEEK retention bridge preliminary selection',densityKgM3:P.retainerDensityKgM3};
   pieces.push(box('retainer-'+j+'-cap',[widthM+2*r,t,P.rungWidthM],[0,depthM/2+t/2,z],retainer));
   for(const sign of[-1,1])pieces.push(box('retainer-'+j+'-leg-'+sign,[t,depthM,P.rungWidthM],[sign*(widthM/2+r-t/2),0,z],retainer));
  }
  for(const [j,mount]of mounts.entries())massItems.push(addMount(pieces,mount,j,origin,axes));
  const wbs='07.07.'+String(index+1).padStart(3,'0');
  return {id:'starmind:raceway:'+id,label:corridor.label||'AI1 '+id+' cable raceway',wbs,itemId:'flight:'+wbs,owner:'starmind-harness-installation',frame:'body',positionM:origin,axes,material:'6061 aluminium preliminary selection',densityKgM3:P.aluminiumDensityKgM3,materialPieces:pieces,massItems,sourceUrl:'./starmind-harness-installation.js',basis:P.basis,routeIds:[...(corridor.routeIds||[])],corridor:{...corridor,lengthM:length,axes,originM:origin,maximumRungPitchM:(length-P.rungWidthM)/intervalCount,rungStationsM:stations.map(z=>worldPoint([0,0,z],origin,axes)),retainerStationsM:retention,retainerPointsM:retention.map(s=>worldPoint([0,0,s-length/2],origin,axes))}};
 });
}

export function createStarmindHarnessInstallation({factory,h,architecture,material}){
 if(h.architectureFamilyId!=='starmind-cross')return null;
 const schedule=(architecture.installationHardware||[]).filter(part=>part.owner==='starmind-harness-installation'),root=new T.Group(),parts=new Map(),meshes=[],materials=new Map();
 root.name='Starmind body-mounted harness raceways';root.userData.part='harness';factory.root.add(root);
 const basis=axes=>new T.Matrix4().makeBasis(...axes.map(axis=>new T.Vector3(...axis)));
 function pieceMaterial(piece){
  const key=piece.material||'aluminium';if(materials.has(key))return materials.get(key);
  const m=(material||roleMaterial(h,'electronics-case')).clone();m.color.set(key.includes('PEEK')?'#637079':'#92a3ad');materials.set(key,m);return m;
 }
 for(const part of schedule){
  const group=new T.Group();group.name=part.id;group.position.set(...part.positionM);if(part.axes)group.quaternion.setFromRotationMatrix(basis(part.axes));
  group.userData={part:'harness',physicalPartId:part.itemId,electricalItemIds:[part.itemId],installationHardwareId:part.id,installationBasis:part.basis};root.add(group);parts.set(part.id,group);
  for(const piece of part.materialPieces){
   if(piece.shape&&piece.shape!=='box')throw new Error('Unsupported Starmind raceway material shape '+piece.shape);
   const m=tagMaterial(new T.Mesh(new T.BoxGeometry(...piece.dimensionsM),pieceMaterial(piece)));m.name=part.label+' · '+piece.id;m.position.set(...piece.positionM);if(piece.axes)m.quaternion.setFromRotationMatrix(basis(piece.axes));
   Object.assign(m.userData,{...group.userData,materialPieceId:piece.id,attachment:piece.attachment||null});group.add(m);boxMaterialUV(m,...piece.dimensionsM);meshes.push(m);
  }
 }
 const declared=architecture.starmindHarnessInstallation;
 const result={revision:P.revision,root,parts,meshes,schedule,materialMeshCount:meshes.length,
  ok:declared?.ok??false,issues:[...(declared?.issues||[])],supportValidation:declared?.supportValidation};
 factory.starmindHarnessInstallation=result;return result;
}
