import {starcatcherHarnessInstallationHardware} from './starcatcher-harness-installation.js';
import {cableInstallationHardware} from './cable-installation-mass.js';

const dot=(a,b)=>a.reduce((sum,value,index)=>sum+value*b[index],0);
const subtract=(a,b)=>a.map((value,index)=>value-b[index]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],
 a[0]*b[1]-a[1]*b[0]];
const unit=vector=>{const length=Math.hypot(...vector);return vector.map(v=>v/length);};
const extent=(solid,axis)=>solid.halfSize.reduce((sum,value,index)=>
 sum+value*Math.abs(dot(axis,solid.axes[index])),0);

// Touching faces are intentional joints. The tolerance only admits numerical
// roundoff at those faces; it cannot bridge a measurable gap between parts.
function touches(a,b,toleranceM){
 if(a.minimumM.some((value,index)=>value>b.maximumM[index]+toleranceM||
  a.maximumM[index]<b.minimumM[index]-toleranceM))return false;
 const delta=subtract(a.centerM,b.centerM);
 for(const direction of [...a.axes,...b.axes,
  ...a.axes.flatMap(left=>b.axes.map(right=>cross(left,right)))]){
  const length=Math.hypot(...direction);
  if(length<1e-10)continue;
  const gap=Math.abs(dot(delta,direction))-extent(a,direction)-extent(b,direction);
  if(gap>toleranceM*length)return false;
 }
 return true;
}

function pointOnFace(point,normal,solid,toleranceM){
 const local=solid.axes.map(axis=>dot(subtract(point,solid.centerM),axis));
 if(local.some((value,index)=>Math.abs(value)>solid.halfSize[index]+toleranceM))
  return false;
 return solid.axes.some((axis,index)=>Math.abs(Math.abs(local[index])-
  solid.halfSize[index])<=toleranceM&&
  dot(normal,axis)*Math.sign(local[index])>1-1e-8);
}

function footMeetsPlane(foot,point,normal,toleranceM){
 const half=extent(foot,normal),distance=dot(subtract(foot.centerM,point),normal);
 return half>0&&Math.abs(distance-half)<=toleranceM;
}

export function inspectStarcatcherSupportConnectivity(h,graph,corridors,
 {contactToleranceM=1e-7}={}){
 if(!(contactToleranceM>0&&contactToleranceM<=1e-6))
  throw new Error('Support connectivity needs a sub-micrometre touch tolerance');
 const schedule=starcatcherHarnessInstallationHardware(h,graph,corridors),
  parts=cableInstallationHardware(schedule),solids=[];
 for(const part of parts)for(const piece of part.pieces){
  if(piece.shape==='allocated')continue;
  const halfSize=piece.dimensionsM.map(value=>value/2),
   worldExtent=[0,1,2].map(axis=>halfSize.reduce((sum,value,index)=>
    sum+value*Math.abs(piece.axes[index][axis]),0));
  solids.push({id:part.id+':'+piece.id,partId:part.id,pieceId:piece.id,
   centerM:piece.positionM,axes:piece.axes,halfSize,massKg:piece.massKg,
   minimumM:piece.positionM.map((value,index)=>value-worldExtent[index]),
   maximumM:piece.positionM.map((value,index)=>value+worldExtent[index])});
 }
 const byId=new Map(solids.map((solid,index)=>[solid.id,{solid,index}])),
  byPart=new Map(parts.map(part=>[part.id,solids.filter(s=>s.partId===part.id)])),
  parent=solids.map((_,index)=>index),roots=[],attachmentIssues=[];
 const find=index=>{while(parent[index]!==index){parent[index]=parent[parent[index]];
  index=parent[index];}return index;};
 const join=(a,b)=>{const left=find(a),right=find(b);if(left!==right)parent[right]=left;};
 const ordered=solids.map((solid,index)=>({solid,index}))
  .sort((a,b)=>a.solid.minimumM[0]-b.solid.minimumM[0]);
 let touchingPairs=0;
 for(let i=0;i<ordered.length;i++)for(let j=i+1;j<ordered.length&&
  ordered[j].solid.minimumM[0]<=ordered[i].solid.maximumM[0]+contactToleranceM;j++){
  if(!touches(ordered[i].solid,ordered[j].solid,contactToleranceM))continue;
  join(ordered[i].index,ordered[j].index);touchingPairs++;
 }
 const wall=Math.max(.018,Math.min(h.bodyWidthM,h.bodyHeightM,h.bodyLengthM)*.024),
  limits=[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM].map(value=>value/2-wall-.0002),
  bulkheadFrontM=h.propulsion?.forwardDeckZ+.017/2;
 function actualBoundary(point,normal){
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
   if(Math.abs(point[axis]-sign*limits[axis])>contactToleranceM||
    normal[axis]*sign>-1+1e-8||point.some((value,index)=>
     index!==axis&&Math.abs(value)>limits[index]+contactToleranceM))continue;
   return ['port/starboard inner sandwich','top/bottom inner sandwich',
    'fore/aft inner sandwich'][axis];
  }
  if(Number.isFinite(bulkheadFrontM)&&
   Math.abs(point[2]-bulkheadFrontM)<=contactToleranceM&&normal[2]>1-1e-8&&
   Math.abs(point[0])<=limits[0]+contactToleranceM&&
   Math.abs(point[1])<=limits[1]+contactToleranceM)return 'equipment bulkhead forward face';
  return null;
 }
 for(const corridor of corridors){
  const partId='starcatcher:raceway:'+corridor.id;
  for(const [index,mount]of corridor.mounts.entries()){
   const id=partId+':mount-'+index+'-foot',record=byId.get(id),
    point=mount.attachmentPointM,
    normal=unit(mount.attachmentNormalBody||subtract(mount.trayPointM,point));
   if(!record||!footMeetsPlane(record.solid,point,normal,contactToleranceM)){
    attachmentIssues.push({id,code:'foot-does-not-meet-declared-surface'});continue;
   }
   if(mount.attachmentPartId){
    const candidates=byPart.get(mount.attachmentPartId)||[],
     contact=candidates.find(other=>pointOnFace(point,normal,other,contactToleranceM)&&
      touches(record.solid,other,contactToleranceM));
    if(!contact)attachmentIssues.push({id,code:'shared-foot-misses-parent-material',
     parentPartId:mount.attachmentPartId,attachmentPointM:point});
    // A shared foot is not a root. Its physical contact joins it to the parent
    // material above, which must itself lead to an actual structural foot.
   }else{
    const boundary=actualBoundary(point,normal);
    if(boundary)roots.push({id,index:record.index,boundary});
    else attachmentIssues.push({id,code:'foot-misses-actual-structural-face',
     attachmentPointM:point});
   }
  }
  if(corridor.retentionBoundary==='inner-top-sandwich'){
   for(const solid of byPart.get(partId)||[]){
    if(!/^retainer-\d+-roof-foot-/.test(solid.pieceId))continue;
    const point=[solid.centerM[0],limits[1],solid.centerM[2]],normal=[0,-1,0];
    if(actualBoundary(point,normal)&&footMeetsPlane(solid,point,normal,contactToleranceM))
     roots.push({id:solid.id,index:byId.get(solid.id).index,boundary:'inner roof keeper foot'});
    else attachmentIssues.push({id:solid.id,code:'keeper-foot-misses-actual-roof'});
   }
  }
 }
 const anchored=new Set(roots.map(root=>find(root.index))),components=new Map();
 for(const [index,solid]of solids.entries()){
  const root=find(index);
  if(!components.has(root))components.set(root,{anchored:anchored.has(root),
   pieceIds:[],railIds:[],keeperIds:[],massKg:0});
  const component=components.get(root);component.pieceIds.push(solid.id);
  component.massKg+=solid.massKg;
  if(solid.pieceId.startsWith('longeron-'))component.railIds.push(solid.id);
  if(solid.pieceId.startsWith('retainer-'))component.keeperIds.push(solid.id);
 }
 const disconnected=[...components.values()].filter(component=>!component.anchored),
  isolatedRailIds=disconnected.filter(component=>component.railIds.length===
   component.pieceIds.length).flatMap(component=>component.railIds),
  keeperIdsWithoutLoadPath=disconnected.flatMap(component=>component.keeperIds);
 return {ok:!attachmentIssues.length&&!disconnected.length,
  materialPieces:solids.length,contactToleranceM,touchingPairs,
  components:components.size,anchoredComponents:anchored.size,
  structuralRoots:roots.map(({index,...root})=>root),attachmentIssues,
  disconnected,isolatedRailIds,keeperIdsWithoutLoadPath,
  basis:'Finite material contact graph. Shell and bulkhead feet must meet their '+
   'actual structural face; shared feet must touch the declared parent material. '+
   'Every remaining piece and keeper must connect to an anchored component. '+
   'This verifies geometric continuity, not joint strength or qualification.'};
}
