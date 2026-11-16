import {allocateStarcatcherPayloadRoutes} from './starcatcher-payload-routing.js';
import {deploymentLayout,mechanismPose} from './deployment.js';
import {roundedConnectionRoute} from './connection-routes.js';
import {allocatePcduPayloadComb} from './pcdu-routing-comb.js';
import {auditRoutes,routeClearance} from './routing-audit.js';
import {starcatcherHarnessInstallationHardware} from './starcatcher-harness-installation.js';
import {cableInstallationHardware} from './cable-installation-mass.js';
import {retainedStarcatcherSupplementalInstallation,applyStarcatcherPayloadSupportOverrides}
 from './starcatcher-supplemental-installation.js';

// The lower bank's return formerly descended through the left payload trunk.
// Move the real pierced floor station and its sleeve together, and carry the
// return above the cable plenum through the free left-side equipment aisle.
// The fluid planner still screens the complete proposed tube normally.
export function starcatcherLoopTwoReturnAccommodation(h,{bankIndex,side,a=null,b=null,section='internal'}={}){
 if(h.architectureFamilyId!=='heatlift-study'||h.input?.referenceCenterId!=='star-catcher-self-powered'||bankIndex!==1||side!==-1)return null;
 const stationOffsetM=[-.14,0,0];let controlPoints=null;
 if(a&&b){
  if(section==='union'){
   const lead=Math.min(.25,Math.abs(b[1]-a[1])/3);
   controlPoints=[a,[a[0],a[1]-lead,a[2]],[b[0],b[1]+lead,b[2]],b];
  }else{
   const wall=Math.max(.018,Math.min(h.bodyWidthM,h.bodyHeightM,h.bodyLengthM)*.024),
    outboard=-h.bodyWidthM/2+.17,low=-h.bodyHeightM/2+wall+.2782;
   // The hot-side distribution manifold is on the real heat-lift package's
   // left face. Its -X fitting leaves straight into the service aisle before
   // descending; it no longer borrows the cold pump's upward connector.
   controlPoints=[a,[outboard,a[1],a[2]],
    [outboard,low,a[2]],[outboard,low,b[2]],[b[0],low,b[2]],b];
  }
 }
 return {stationOffsetM,controlPoints,minimumBendRadiusM:.108,
  basis:'Loop 2 return has its own 68 mm floor penetration 140 mm farther left of the payload trunk. The 36 mm tube descends in the outboard service aisle and crosses above the under-rack electrical plenum before entering the relocated sleeve. The external union feed retains full-radius oblique transitions to its unchanged inlet.'};
}

// Turn the complete payload bank down in the aft equipment bay, before the
// first compute row, then forward in the under-rack service plenum. Rows nest
// the +X/-Y elbows; source-Z rank nests the -Y/+Z elbows. No endpoint moves.
export function allocateStarcatcherPayloadDeparture(h,allocation){
 if(h.architectureFamilyId!=='heatlift-study'||!allocation.active||!allocation.ok)return allocation;
 if(allocation.starcatcherUnderRack)return allocation;
 const ys=[...new Set(allocation.escapes.map(e=>e.anchor[1]))].sort((a,b)=>a-b);
 const zs=[...new Set(allocation.escapes.map(e=>e.anchor[2]))].sort((a,b)=>a-b);
 const radius=Math.max(...allocation.escapes.map(e=>e.radiusM));
 const bend=Math.max(...allocation.escapes.map(e=>e.bendRadiusM));
 const pitch=2*radius+.006,lead=3*bend+.015;
 const wall=Math.max(.018,Math.min(h.bodyWidthM,h.bodyHeightM,h.bodyLengthM)*.024);
 const floor=-h.bodyHeightM/2+wall+.0002,bottomY=floor+.055;
 const exitZ=Math.max(...zs)+bend+.020,entryZ=exitZ+lead;
 for(const escape of allocation.escapes){
  const a=[...escape.anchor],x=a[0]+lead+ys.indexOf(a[1])*pitch;
  const y=bottomY+zs.indexOf(a[2])*pitch,start=[x,y,exitZ],end=[x,y,entryZ];
  escape.controlPoints=[a,[x,a[1],a[2]],[x,y,a[2]],end];
  const shape=roundedConnectionRoute(escape.controlPoints,escape.bendRadiusM);
  Object.assign(escape,{points:shape.points,lengthM:shape.lengthM,minimumBendRadiusM:shape.minimumBendRadiusM,
   normal:[0,0,1],mountedDeparture:{startM:start,endM:end},entryEnd:end});
  if(shape.bendLimited)allocation.issues.push({code:'starcatcher-under-rack-bend',routeId:escape.id,
   actualM:shape.minimumBendRadiusM,requiredM:escape.bendRadiusM});
 }
 const routes=allocation.escapes.map(e=>({id:e.id,points:e.points,radiusM:e.radiusM,clearanceM:.002,
  from:{position:e.anchor,normal:e.fromNormal}}));
 const validation=auditRoutes(routes,[],{maxIssues:12});
 allocation.issues.push(...validation.issues.map(issue=>({...issue,code:'starcatcher-under-rack-'+issue.code})));
 const minXM=Math.min(...allocation.escapes.map(e=>e.mountedDeparture.startM[0]))-radius,
  maxXM=Math.max(...allocation.escapes.map(e=>e.mountedDeparture.startM[0]))+radius,
  minYM=bottomY-radius,maxYM=bottomY+(zs.length-1)*pitch+radius;
 Object.assign(allocation,{ok:allocation.issues.length===0,exitZ,starcatcherUnderRack:true,pitchM:pitch,sourceColumns:zs,
  corridor:{id:'under-rack-payload-plenum',minXM,maxXM,minYM,maxYM,minZM:exitZ,maxZM:entryZ,
   widthM:maxXM-minXM,heightM:maxYM-minYM,floorM:floor,
   basis:'Actual physical cable-bundle bounds in the final under-rack straight; source columns are ordered by ascending source Z.'},
  minimumInterlineClearanceM:validation.minimumClearanceM,
  underRack:{floorM:floor,bottomY,topY:bottomY+(zs.length-1)*pitch,pitchM:pitch},
  basis:'The real +X payload exits turn downward in the equipment bay and forward below the compute rack. Ordered source rows and columns retain every full-radius cable. The complete final straight is reserved before fluid and unrelated electrical planning.'});
 return allocation;
}

function retainedBranchLadder(h,graph,corridor,comb){
 const length=corridor.fromM[1]-corridor.toM[1],maximumPitchM=.25,
  rows=[...new Set(comb.escapes.map(e=>e.anchor[1]))].sort((a,b)=>b-a),
  candidates=rows.slice(1).map((y,i)=>corridor.fromM[1]-(rows[i]+y)/2)
   .filter(s=>s>=.006&&s<=length-.006).sort((a,b)=>a-b),
  routes=comb.escapes.map(e=>({id:e.id,points:e.points,radiusM:e.radiusM,clearanceM:.002}));
 const accepted=[],checked=new Map();let retentionFailure=null;
 function screen(station){
  if(checked.has(station))return checked.get(station);
  const schedule=starcatcherHarnessInstallationHardware(h,graph,[{...corridor,retainerStationsM:[station]}]),
   pieces=cableInstallationHardware(schedule)[0].pieces.filter(p=>p.id.startsWith('retainer-')),
   obstacles=pieces.map(p=>{
    const halfSize=p.dimensionsM.map(v=>v/2),extent=[0,1,2].map(k=>halfSize.reduce((n,v,j)=>n+v*Math.abs(p.axes[j][k]),0));
    return {id:p.id,type:'obb',center:p.positionM,axes:p.axes,halfSize,
     bounds:{min:p.positionM.map((v,k)=>v-extent[k]),max:p.positionM.map((v,k)=>v+extent[k])}};
   });
  let minimumMarginM=Infinity,ok=true;
  for(const route of routes){const result=routeClearance(route,obstacles);minimumMarginM=Math.min(minimumMarginM,result.minimumClearanceM);if(!result.ok){ok=false;break;}}
  const result={stationM:station,bodyYM:corridor.fromM[1]-station,ok,minimumMarginM};checked.set(station,result);return result;
 }
 let cursor=0;
 while(length-cursor>maximumPitchM+1e-9){
  let choice=candidates.filter(s=>s>cursor+.012&&s<=cursor+maximumPitchM+1e-9).reverse().map(screen).find(r=>r.ok);
  if(!choice){
   // Smaller source banks leave a straight ladder span below their last
   // connector row. Retain that real material too, using the same full bar
   // clearance predicate. Existing inter-row choices retain first priority.
   const upper=Math.min(length-.006,cursor+maximumPitchM),extra=[upper,length-.006,
    ...Array.from({length:Math.max(0,Math.floor((length-.012)/.012)+1)},(_,i)=>.006+i*.012)]
    .filter(s=>s>cursor+.012&&s<=upper+1e-9).sort((a,b)=>b-a);
   const clear=extra.map(screen).find(r=>r.ok);
   if(clear)choice={...clear,stationBasis:'Clear straight ladder span; finite cap and legs screened against every physical prefix'};
  }
  if(!choice){
   retentionFailure={code:'starcatcher-ladder-retention-unavailable',corridorId:corridor.id,
    lastRetainedStationM:cursor,remainingLengthM:length-cursor,maximumUnsupportedSpanM:maximumPitchM};
   comb.issues.push(retentionFailure);comb.ok=false;break;
  }
  accepted.push(choice);cursor=choice.stationM;
 }
 const stations=accepted.map(row=>row.stationM),gaps=[stations[0]||length,...stations.slice(1).map((s,i)=>s-stations[i]),length-(stations.at(-1)||0)];
 return {...corridor,retainerStationsM:stations,retentionAllocation:{maximumPitchM,maximumUnsupportedSpanM:Math.max(...gaps),stations:accepted,
  sourceRowYM:rows,screenedPhysicalCircuits:routes.length,...(retentionFailure?{ok:false,issues:[retentionFailure]}:{}),
  basis:'PEEK front bridges lie between real source connector rows. Every selected cap and both legs are screened as their full material boxes against all physical cable radii plus 2 mm clearance. Continuous rear rails support the bridge legs; horizontal branch entries remain open.'+(accepted.some(row=>row.stationBasis)?' Additional clear straight spans use the same material screen at no more than 250 mm pitch.':'')}};
}

const unique=values=>[...new Set(values)].sort((a,b)=>a-b);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const identity=[[1,0,0],[0,1,0],[0,0,1]];
function supportContext(h,graph,{circuitExitPose,connectorTypes}){
 const fixed=[],issues=[];
 const box=(id,center,dimensions,pad=0)=>{const halfSize=dimensions.map(v=>v/2+pad);fixed.push({id,type:'obb',center,axes:identity,halfSize,bounds:{min:center.map((v,i)=>v-halfSize[i]),max:center.map((v,i)=>v+halfSize[i])}});};
 // New electrical enclosures have the same 8 mm lid seams as the renderer.
 // Existing compute chassis keep their real dimensions. All receive 2 mm
 // separation; a fictitious 6 mm flange would consume their narrow aisle.
 // Cold-plate block/ring bounds use the installColdPlateCollection datums.
 for(const part of graph.boxes.filter(part=>(part.frame||'body')==='body')){
  const dimensions=part.dimensionsM.map((v,i)=>i===1&&part.geometry==='new'?Math.max(v,v*.96+.008):v);
  box(part.id,part.positionM,dimensions,.002);
  for(const panel of part.connectorPanels||[])box(part.id+':'+panel.id,part.positionM.map((v,i)=>v+panel.positionM[i]),panel.dimensionsM,.002);
 }
 // Every installed connector instance includes its real panel datum and
 // backshell/boot endpoint. Rectangular flanges retain their actual narrow
 // height, enlarged only where the round strain relief is physically wider.
 for(const port of graph.ports.filter(port=>(graph.boxById[port.boxId].frame||'body')==='body')){
  const type=connectorTypes?.[port.connectorTypeId];
  if(!type){issues.push({code:'starcatcher-support-connector-geometry-unavailable',portId:port.id});continue;}
  for(let instance=0;instance<port.quantity;instance++)for(const polarity of port.connectorTypeId.startsWith('hv-single')?[-1,1]:[0]){
   const pose=circuitExitPose(h,graph,port.id,{instance,polarity}),a=pose.positionM,b=pose.cableExitM,n=pose.normal;
   let q=n[2]<-1+1e-10?[0,-1,0,0]:[-n[1],n[0],0,1+n[2]],qn=Math.hypot(...q);q=q.map(v=>v/qn);
   const [qx,qy,qz,qw]=q,x=[1-2*(qy*qy+qz*qz),2*(qx*qy+qz*qw),2*(qx*qz-qy*qw)],y=[2*(qx*qy-qz*qw),1-2*(qx*qx+qz*qz),2*(qy*qz+qx*qw)],axes=[x,y,n];
   const rectangular=port.connectorTypeId==='spacewire-a'||port.connectorTypeId.startsWith('mtp-optical')||port.connectorTypeId==='lc-sm-100g-lr4';
   const center=a.map((v,i)=>(v+b[i])/2),halfSize=[type.diameterM/2+.002,type.diameterM*(rectangular?.31:.5)+.002,Math.hypot(...sub(b,a))/2+.002];
   const extent=[0,1,2].map(k=>halfSize.reduce((sum,v,i)=>sum+v*Math.abs(axes[i][k]),0));
   fixed.push({id:port.id+'/'+instance+'/'+polarity+':mating-envelope',type:'obb',center,axes,halfSize,bounds:{min:center.map((v,i)=>v-extent[i]),max:center.map((v,i)=>v+extent[i])}});
  }
 }
 const [tw,th,td]=h.rackLayout.slotDimensionsM;
 for(const slot of h.rackLayout.slots)for(const side of[-1,1])box('cold-plate-'+slot.index+'-'+side,[slot.x-tw*.47-.024,slot.y+th*.29,slot.z+side*td*.28],[.048,.024,.035],.002);
 const layout=deploymentLayout(h),initial=mechanismPose(layout,0,h.input.solarTiltDeg||0),floorOpenings=[];
 for(const [bankIndex,bank] of initial.banks.entries())if(bank.root[1]<0)for(const side of[-1,1]){
  let z=Math.max(-h.bodyLengthM*.40,Math.min(h.bodyLengthM*.40,bank.root[2]-1.10));
  if(Math.abs(z-h.propulsion.forwardDeckZ)<.20)z=h.propulsion.forwardDeckZ+.24;
  const offset=starcatcherLoopTwoReturnAccommodation(h,{bankIndex,side})?.stationOffsetM||[0,0,0];
  floorOpenings.push({id:'coolant-floor-'+side,positionM:[side*.20+offset[0],z+offset[2]],radiusM:.034,
   basis:'Nominal root-cant coolant feedthrough station from the same bank/root geometry as craft-family; actual pierced material is checked in the rendered installation.'});
 }
 return {fixed,floorOpenings,issues};
}
export {supportContext as starcatcherInstallationSupportContext};
function boxesOverlap(a,b){
 if(a.bounds.min.some((v,i)=>v>=b.bounds.max[i]-1e-9||a.bounds.max[i]<=b.bounds.min[i]+1e-9))return false;
 const delta=sub(a.center,b.center),axes=[...a.axes,...b.axes,...a.axes.flatMap(x=>b.axes.map(y=>cross(x,y)))];
 for(const axis of axes){if(Math.hypot(...axis)<1e-9)continue;const reach=(o)=>o.halfSize.reduce((sum,v,i)=>sum+v*Math.abs(dot(axis,o.axes[i])),0);if(Math.abs(dot(delta,axis))>=reach(a)+reach(b)-1e-9)return false;}
 return true;
}
function fixedHardwareContacts(solids,fixed){
 return solids.flatMap(solid=>fixed.filter(other=>boxesOverlap(solid,other)).map(other=>({materialId:solid.id,hardwareId:other.id})));
}
function installationObstacles(schedule){
 return cableInstallationHardware(schedule).flatMap(part=>part.pieces.filter(piece=>piece.shape!=='allocated').map(piece=>{
  const halfSize=piece.dimensionsM.map(v=>v/2),extent=[0,1,2].map(k=>halfSize.reduce((n,v,j)=>n+v*Math.abs(piece.axes[j][k]),0));
  return {id:part.id+':'+piece.id,type:'obb',center:piece.positionM,axes:piece.axes,halfSize,
   bounds:{min:piece.positionM.map((v,k)=>v-extent[k]),max:piece.positionM.map((v,k)=>v+extent[k])}};
 }));
}
function screenInstallationRows(rows,solids){
 let minimumClearanceM=Infinity;const issues=[];
 for(const row of rows){const result=routeClearance(row,solids);minimumClearanceM=Math.min(minimumClearanceM,result.minimumClearanceM);if(!result.ok)issues.push({id:row.id,...result});}
 return {ok:!issues.length,minimumClearanceM,issues};
}
export function inspectStarcatcherInstallationMaterial(h,graph,corridors,
 {routes=[],context={fixed:[]}}={}){
 const solids=installationObstacles(starcatcherHarnessInstallationHardware(h,graph,corridors));
 return {solids,routes:screenInstallationRows(routes,solids),
  hardwareContacts:fixedHardwareContacts(solids,context.fixed)};
}
export function starcatcherInstallationMaterialOverlaps(h,graph,corridors){
 const solids=installationObstacles(starcatcherHarnessInstallationHardware(h,graph,corridors))
  .sort((a,b)=>a.bounds.min[0]-b.bounds.min[0]),contacts=[];
 const owner=solid=>solid.id.slice(0,solid.id.lastIndexOf(':'));
 for(let i=0;i<solids.length;i++)for(let j=i+1;j<solids.length&&
   solids[j].bounds.min[0]<solids[i].bounds.max[0]-1e-9;j++){
  if(owner(solids[i])===owner(solids[j])||!boxesOverlap(solids[i],solids[j]))continue;
  contacts.push({first:solids[i].id,second:solids[j].id});
 }
 return contacts;
}
function inspectPayloadSupportConstruction(h,graph,rows,corridors,wall,issues=[]){
 const schedule=starcatcherHarnessInstallationHardware(h,graph,corridors),
  solids=installationObstacles(schedule),validation=screenInstallationRows(rows,solids);
 let minimumBodyMarginM=Infinity,minimumInnerBodyMarginM=Infinity;
 for(const solid of solids)for(let axis=0;axis<3;axis++){
  const margin=[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM][axis]/2-
   Math.max(Math.abs(solid.bounds.min[axis]),Math.abs(solid.bounds.max[axis]));
  minimumBodyMarginM=Math.min(minimumBodyMarginM,margin);
  minimumInnerBodyMarginM=Math.min(minimumInnerBodyMarginM,margin-wall);
 }
 if(minimumInnerBodyMarginM< -1e-9)issues.push({
  code:'starcatcher-installation-outside-inner-body',minimumInnerBodyMarginM});
 return {corridors,schedule,issues,validation,solids,minimumBodyMarginM,minimumInnerBodyMarginM};
}
function allocatePayloadSupports(h,graph,rows,comb,sourceLadder,context){
 // All placements below are real material schedules. A candidate support is
 // accepted only when its full boxes clear every complete payload cable.
 // A failed placement remains a structured installation issue.
 const issues=[],r=Math.max(...rows.map(row=>row.radiusM)),R=Math.max(...rows.map(row=>row.minimumBendRadiusM)),pad=r+.010;
 const corridors=[],floor=comb.underRack.floorM;
 const wall=h.bodyHeightM/2+floor,insideBody=solids=>solids.every(solid=>solid.bounds.min.every((v,k)=>v>=-[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM][k]/2+wall-1e-9&&solid.bounds.max[k]<=[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM][k]/2-wall+1e-9));
 const underYs=rows.map(row=>row.laneMetadata.underY),bottom=Math.min(...underYs),top=Math.max(...underYs);
 const minY=bottom-pad,maxY=top+pad,centerY=(minY+maxY)/2,backY=minY-.001;
 const floorMount=(x,z,target)=>{
  const clear=station=>context.floorOpenings.every(hole=>Math.hypot(Math.max(0,Math.abs(x-hole.positionM[0])-.030),Math.max(0,Math.abs(station-hole.positionM[1])-.020))>=hole.radiusM+.006);
  const station=[z,z-.080,z+.080,z-.160,z+.160].find(clear);
  if(station==null)issues.push({code:'starcatcher-floor-foot-aperture',positionM:[x,floor,z]});
  return {attachmentPointM:[x,floor,station??z],trayPointM:target,attachmentNormalBody:[0,1,0],attachment:'Inner bottom sandwich face; preliminary bolted insert attachment'};
 };
 function makeRetention(corridor){
  const delta=sub(corridor.toM,corridor.fromM),length=Math.hypot(...delta),accepted=[];let cursor=0;
  while(length-cursor>.25+1e-9||!accepted.length){
   const upper=Math.min(length-.006,cursor+.25),candidates=[upper,...Array.from({length:Math.ceil(upper/.012)},(_,i)=>upper-(i+1)*.012)].filter(s=>s>cursor+.012&&s>=.006);
   let selected=null;
   for(const station of candidates){
    const schedule=starcatcherHarnessInstallationHardware(h,graph,[{...corridor,retainerStationsM:[station]}]),solids=installationObstacles(schedule).filter(p=>p.id.includes(':retainer-')),result=screenInstallationRows(rows,solids);
    if(result.ok&&!fixedHardwareContacts(solids,context.fixed).length){selected={stationM:station,minimumMarginM:result.minimumClearanceM};break;}
   }
   if(!selected){issues.push({code:'retainer-unavailable',corridorId:corridor.id,cursorM:cursor,remainingM:length-cursor});break;}
   accepted.push(selected);cursor=selected.stationM;
  }
  const stations=accepted.map(row=>row.stationM),gaps=[stations[0]||length,...stations.slice(1).map((s,i)=>s-stations[i]),length-(stations.at(-1)||0)];
  return {...corridor,retainerStationsM:stations,retentionAllocation:{maximumPitchM:.25,maximumUnsupportedSpanM:Math.max(...gaps),stations:accepted,screenedPhysicalCircuits:rows.length}};
 }
 function addCorridor(corridor){
  const solids=installationObstacles(starcatcherHarnessInstallationHardware(h,graph,[{...corridor,retainerStationsM:[]}])),before=screenInstallationRows(rows,solids),fixedContacts=fixedHardwareContacts(solids,context.fixed);
  if(!before.ok)issues.push({code:'support-material-contact',corridorId:corridor.id,...before});
  if(fixedContacts.length)issues.push({code:'support-fixed-hardware-contact',corridorId:corridor.id,contacts:fixedContacts});
  const result=makeRetention(corridor);corridors.push(result);return result;
 }
 const minX=Math.min(...rows.map(row=>row.laneMetadata.trunkX))-pad,maxX=Math.max(...rows.map(row=>row.laneMetadata.trunkX))+pad;
 const fanStart=Math.min(...rows.map(row=>row.laneMetadata.fanZ))-R-.008,fanEnd=Math.max(...rows.map(row=>row.laneMetadata.fanZ))+R+.010;
 const fanLength=fanEnd-fanStart,fanIntervals=Math.max(1,Math.ceil((fanLength-.012)/.25)),fanStations=Array.from({length:fanIntervals+1},(_,i)=>fanStart+.006+(fanLength-.012)*i/fanIntervals);
 const footCount=Math.max(2,Math.ceil((maxX-minX)/.5)+1),footXs=Array.from({length:footCount},(_,i)=>minX+(maxX-minX)*i/(footCount-1));
 // The broad fanout has intermediate floor stands at each actual rear rung.
 // Its front restraints sit below the lowest rack rail, above the departing
 // first-bay elbows; a low full-width cap would cut those physical branches.
 const fanTop=Math.min(...h.rackLayout.slots.map(slot=>slot.y))-h.rackLayout.slotDimensionsM[1]/2-.036,fanCenterY=(minY+fanTop)/2;
 addCorridor({id:'payload-fanout-floor',label:'Star Catcher supported under-rack payload fanout',fromM:[(minX+maxX)/2,fanCenterY,fanStart],toM:[(minX+maxX)/2,fanCenterY,fanEnd],widthM:maxX-minX,depthM:fanTop-minY,normalBody:[0,1,0],routeIds:rows.map(row=>row.id),openEntry:true,mounts:fanStations.flatMap(z=>footXs.map(x=>floorMount(x,z,[x,backY,z])))});
 for(const column of unique(rows.map(row=>row.laneMetadata.column))){
  const group=rows.filter(row=>row.laneMetadata.column===column),x0=Math.min(...group.map(row=>row.laneMetadata.commonX))-pad,x1=Math.max(...group.map(row=>row.laneMetadata.trunkX))+pad;
  const end=Math.max(...group.map(row=>row.laneMetadata.riseZ))+R+.01,length=end-fanEnd,intervals=Math.max(1,Math.ceil((length-.012)/.25));
  const stations=Array.from({length:intervals+1},(_,i)=>fanEnd+.006+(length-.012)*i/intervals);
  const mountStations=stations.filter((_,i)=>i%2===0||i===stations.length-1),mountX=x1+.009;
  addCorridor({id:'payload-column-'+column+'-floor',label:'Star Catcher column '+(column+1)+' under-rack cable trunk',fromM:[(x0+x1)/2,centerY,fanEnd],toM:[(x0+x1)/2,centerY,end],widthM:x1-x0,depthM:maxY-minY,normalBody:[0,1,0],routeIds:group.map(row=>row.id),openEntry:true,mounts:mountStations.map(z=>floorMount(mountX,z,[mountX,backY,z]))});
  for(const bay of unique(group.map(row=>row.laneMetadata.bay))){
   const bank=group.filter(row=>row.laneMetadata.bay===bay),x=bank[0].laneMetadata.commonX;
   const y0=top+R+.020,y1=Math.max(...bank.map(row=>row.to.position[1]))+.025;
   // Bound only the actual portion carried by this ladder. A control-corner
   // bound extended the rear rail into the previous bay's coolant fittings.
   const carried=[];
   for(const row of bank)for(let i=1;i<row.points.length;i++){
    const a=row.points[i-1],b=row.points[i];
    if(a[1]>=y0&&Math.abs(a[0]-x)<.012)carried.push(a);
    if((a[1]-y0)*(b[1]-y0)<0){const t=(y0-a[1])/(b[1]-a[1]),p=a.map((v,k)=>v+(b[k]-v)*t);if(Math.abs(p[0]-x)<.012)carried.push(p);}
   }
   const z0=Math.min(...carried.map(p=>p[2]))-pad,z1=Math.max(...bank.map(row=>row.to.position[2]))+pad;
   const rungY=y0+.006,backX=x+.011;
   const riser={id:'payload-column-'+column+'-bay-'+bay+'-riser',label:'Star Catcher column '+(column+1)+' bay '+(bay+1)+' retained payload riser',fromM:[x,y0,(z0+z1)/2],toM:[x,y1,(z0+z1)/2],widthM:z1-z0,depthM:.020,normalBody:[-1,0,0],routeIds:bank.map(row=>row.id),openEntry:true,mounts:[]};
   // Riser back rails begin above the underfloor elbow band. Stand endpoints
   // lie on the real end rungs; an upper sandwich restraint is available when
   // the dense first-bay fanout prevents a second straight floor stand.
   for(const z of[z0+.015,z1-.015]){
    const target=[backX,rungY,z],targetZs=[z,...Array.from({length:Math.floor((z1-z0-.03)/.024)},(_,i)=>z0+.015+(i+1)*.024)].filter(zz=>riser.mounts.every(m=>Math.abs(zz-m.trayPointM[2])>.075));
    const candidates=targetZs.flatMap(targetZ=>[targetZ,z1+.08,z1+.16,z0-.08,z0-.16].flatMap(footZ=>[.040,.080,.120,-.040,-.080].map(offset=>floorMount(x-offset,footZ,[backX,rungY,targetZ]))));
    const roofMounts=[z,z+.160,z+.240,z-.160,z-.240,z+.320].map(station=>({attachmentPointM:[backX,-floor,station],trayPointM:[backX,y1-.006,z],attachmentNormalBody:[0,-1,0],attachment:'Inner top sandwich face; preliminary bolted insert restraint'}));
    const selected=[...candidates,...roofMounts].find(mount=>{const solids=installationObstacles(starcatcherHarnessInstallationHardware(h,graph,[{...riser,mounts:[mount],retainerStationsM:[]}])).filter(p=>p.id.includes(':mount-'));return insideBody(solids)&&screenInstallationRows(rows,solids).ok&&!fixedHardwareContacts(solids,context.fixed).length;});
    if(!selected)issues.push({code:'riser-mount-unavailable',corridorId:riser.id,target});
    riser.mounts.push(selected||candidates[0]);
   }
   addCorridor(riser);
  }
 }
 if(sourceLadder)corridors.unshift(sourceLadder);
 return {...inspectPayloadSupportConstruction(h,graph,rows,corridors,wall,issues),
  parameters:{floor,bottom,top,minX,maxX,fanStart,fanEnd,retentionPitchM:.25}};
}

// A finite shared installation for the actual body-fixed data routes. The
// source fan-out sits in one roof-covered ladder tray. A shared source frame,
// three rear entries and three service-aisle frames retain native repairs;
// each occupied compute column/bay has one physical drop ladder. The same
// corridor records join the payload schedule before WBS and mass assignment.
export function allocateStarcatcherDataSupports(h,graph,dataRows,
 {screenRoutes=dataRows,context={fixed:[],floorOpenings:[]}}={}){
 if(h.architectureFamilyId!=='heatlift-study'||
    h.input?.referenceCenterId!=='star-catcher-self-powered'||!dataRows?.length)
  return {applicable:false,corridors:[],issues:[]};
 screenRoutes=screenRoutes.map(row=>({...row,clearanceM:Math.max(.002,row.clearanceM||0)}));
 const rows=dataRows.map(row=>({...row,to:Array.isArray(row.to)?row.to:
  row.to?.position||row.points.at(-1)})),issues=[],corridors=[],dataFixed=[],
  wall=Math.max(.018,Math.min(h.bodyWidthM,h.bodyHeightM,h.bodyLengthM)*.024),
  roof=h.bodyHeightM/2-wall-.0002,floor=-roof,
  rackTop=Math.max(...h.rackLayout.slots.map(slot=>slot.y))+
   h.rackLayout.slotDimensionsM[1]/2,
  trayFloor=rackTop+.008,backY=trayFloor-.001,
  worker=rows.filter(row=>/^D-WORKER-\d+\/0$/.test(row.id)),
  fabric=rows.filter(row=>!/^D-WORKER-/.test(row.id)),
  fanPoints=rows.flatMap(row=>row.points.filter(p=>p[1]>=trayFloor)),
  fanStart=Math.min(...fanPoints.map(p=>p[2]))-.008,
  fanEnd=Math.max(...fanPoints.map(p=>p[2]))+.012,
  fanCarried=fanPoints.filter(p=>p[2]<=fanEnd),
  fanX0=Math.min(...fanCarried.map(p=>p[0]))-.040,
  fanX1=Math.min(1.200,Math.max(...fanCarried.map(p=>p[0]))+.012),
  fanTop=roof;
 const target=row=>row.to,slot=row=>h.rackLayout.slots[Number(
  /^D-WORKER-(\d+)\/0$/.exec(row.id)[1])-1];
 const mount=(x,z,target,side=1)=>({attachmentPointM:[x,side>0?roof:floor,z],
  trayPointM:target,attachmentNormalBody:[0,-side,0],
  attachment:side>0?'Inner top sandwich face; preliminary bolted tray hanger':
   'Inner bottom sandwich face; preliminary bolted ladder foot'});
 function material(corridor){return installationObstacles(
  starcatcherHarnessInstallationHardware(h,graph,[corridor]));}
 function clear(solids){
  const routes=screenInstallationRows(screenRoutes,solids);
  return routes.ok&&!fixedHardwareContacts(solids,[...context.fixed,...dataFixed]).length;
 }
 function railCrossovers(corridor){
  // Thin ladder edge strips need actual exit openings where another complete
  // route crosses their material. Clip the finite tube envelope to each real
  // rail box; never erase a whole corridor or exempt the passing cable.
  const length=Math.hypot(...sub(corridor.toM,corridor.fromM)),
   along=sub(corridor.toM,corridor.fromM).map(v=>v/length),
   openings=[...(corridor.railOpeningsM||[])],
   bars=material({...corridor,rungStationsM:[],retainerStationsM:[]})
    .filter(p=>p.id.includes(':longeron-'));
  for(const bar of bars)for(const row of screenRoutes){
   const pad=row.radiusM+Math.max(.002,row.clearanceM||0);
   for(let j=1;j<row.points.length;j++){
    const a=row.points[j-1],b=row.points[j];
    if(a.some((v,k)=>Math.min(v,b[k])>bar.bounds.max[k]+pad||
      Math.max(v,b[k])<bar.bounds.min[k]-pad))continue;
    if(routeClearance({...row,points:[a,b]},[bar]).ok)continue;
    const localA=bar.axes.map(axis=>dot(sub(a,bar.center),axis)),
     localB=bar.axes.map(axis=>dot(sub(b,bar.center),axis));
    let enter=0,leave=1;
    for(let k=0;k<3&&enter<=leave;k++){
     const delta=localB[k]-localA[k],half=bar.halfSize[k]+pad;
     if(Math.abs(delta)<1e-12){if(Math.abs(localA[k])>half)enter=2;}
     else{
      const q=(-half-localA[k])/delta,r=(half-localA[k])/delta;
      enter=Math.max(enter,Math.min(q,r));leave=Math.min(leave,Math.max(q,r));
     }
    }
    if(enter>leave)continue;
    const station=t=>dot(sub(a.map((v,k)=>v+(b[k]-v)*t),corridor.fromM),along),
     s0=station(enter),s1=station(leave),
     fromM=Math.max(0,Math.min(s0,s1)-pad-.004),
     toM=Math.min(length,Math.max(s0,s1)+pad+.004);
    if(toM-fromM>.12){
     issues.push({code:'starcatcher-data-long-rail-overlap',
      corridorId:corridor.id,routeId:row.id,fromM,toM});continue;
    }
    openings.push({side:bar.id.includes(':longeron--1')?-1:1,fromM,toM,
     basis:'Physical edge-strip opening at '+row.id+
      '; the complete tube radius and 2 mm clearance determine the cut-out.'});
   }
  }
  const merged=[];
  for(const side of[-1,1])for(const opening of openings.filter(o=>o.side===side)
    .sort((a,b)=>a.fromM-b.fromM)){
   const last=merged.at(-1);
   if(last&&last.side===side&&opening.fromM-last.toM<.012){
    last.toM=Math.max(last.toM,opening.toM);
    if(!last.basis.includes(opening.basis))last.basis+=' '+opening.basis;
   }else merged.push({...opening});
  }
  corridor.railOpeningsM=merged;
 }
 function retainedStations(corridor,kind){
  const length=Math.hypot(...sub(corridor.toM,corridor.fromM)),selected=[],
   fixed=kind==='rung'?(corridor.requiredRungStationsM||[]):[],
   maximumPitchM=kind==='retainer'?(corridor.maximumRetainerPitchM||.25):.25;
  const available=station=>{
   if((corridor.railOpeningsM||[]).some(o=>
     station+.006>o.fromM&&station-.006<o.toM))return false;
   const item={...corridor,rungStationsM:kind==='rung'?[station]:[],
    retainerStationsM:kind==='retainer'?[station]:[]};
   return clear(material(item).filter(part=>part.id.includes(':'+kind+'-')));
  };
  for(const station of fixed){
   if(station>=.006&&station<=length-.006&&available(station))selected.push(station);
   else issues.push({code:'starcatcher-data-hanger-rung-unavailable',
    corridorId:corridor.id,stationM:station});
  }
  let cursor=0;
  while(length-cursor>maximumPitchM+1e-9){
   const prescribed=selected.filter(s=>s>cursor+.012&&s<=cursor+maximumPitchM+1e-9)
    .sort((a,b)=>b-a)[0];
   if(prescribed!=null){cursor=prescribed;continue;}
   const limit=Math.min(length-.006,cursor+maximumPitchM),
    candidates=(kind==='retainer'&&corridor.retainerCandidatesM?
     corridor.retainerCandidatesM.filter(s=>s<=limit+1e-9).sort((a,b)=>b-a):
     [limit,...Array.from({length:21},(_,i)=>limit-(i+1)*.010)])
    .filter(s=>s>cursor+.012&&s>=.006&&
     selected.every(q=>Math.abs(q-s)>=.012));
   const found=candidates.find(available);
   if(found==null){issues.push({code:'starcatcher-data-'+kind+'-station-unavailable',
    corridorId:corridor.id,afterM:cursor,remainingM:length-cursor});break;}
   selected.push(found);cursor=found;
  }
  // A physical end rung anchors each end of the two continuous longerons.
  if(kind==='rung')for(const end of[.006,length-.006])
   if(selected.every(s=>Math.abs(s-end)>=.012)&&available(end))selected.push(end);
  selected.sort((a,b)=>a-b);return selected;
 }
 function add(corridor){
  railCrossovers(corridor);
  const bareRails=material({...corridor,rungStationsM:[],retainerStationsM:[]})
   .filter(p=>p.id.includes(':longeron-')),
   onRail=point=>bareRails.some(p=>p.axes.every((axis,i)=>
    Math.abs(dot(sub(point,p.center),axis))<=p.halfSize[i]+1e-9)),
   length=Math.hypot(...sub(corridor.toM,corridor.fromM)),
   along=sub(corridor.toM,corridor.fromM).map(v=>v/length);
  for(let i=0;i<corridor.mounts.length;i++){
   const current=corridor.mounts[i];
   if(onRail(current.trayPointM)||current.attachmentPartId)continue;
   const alternatives=[-.040,.040,-.060,.060,-.080,.080]
    .map(shift=>({...current,
     attachmentPointM:current.attachmentPointM.map((v,k)=>v+along[k]*shift),
     trayPointM:current.trayPointM.map((v,k)=>v+along[k]*shift)}));
   const selected=alternatives.find(candidate=>onRail(candidate.trayPointM)&&
    clear(material({...corridor,mounts:[candidate],rungStationsM:[],
     retainerStationsM:[]}).filter(p=>p.id.includes(':mount-'))));
   if(selected)corridor.mounts[i]=selected;
   else issues.push({code:'starcatcher-data-stand-attachment-unavailable',
    corridorId:corridor.id,mountIndex:i});
  }
  const bare={...corridor,rungStationsM:[],retainerStationsM:[]};
  const baseline=material(bare),screen=screenInstallationRows(screenRoutes,baseline),
   contacts=fixedHardwareContacts(baseline,[...context.fixed,...dataFixed]);
  if(!screen.ok)issues.push({code:'starcatcher-data-support-material-contact',
   corridorId:corridor.id,...screen});
  if(contacts.length)issues.push({code:'starcatcher-data-support-hardware-contact',
   corridorId:corridor.id,contacts});
  corridor.rungStationsM=retainedStations(corridor,'rung');
  corridor.retainerStationsM=retainedStations(corridor,'retainer');
  const gaps=stations=>[stations[0]||length,...stations.slice(1)
    .map((s,i)=>s-stations[i]),length-(stations.at(-1)||0)];
  corridor.retentionAllocation={maximumPitchM:corridor.maximumRetainerPitchM||.25,
   maximumUnsupportedSpanM:Math.max(...gaps(corridor.retainerStationsM)),
   maximumRungPitchM:Math.max(...gaps(corridor.rungStationsM)),
   screenedPhysicalCircuits:screenRoutes.length};
  corridors.push(corridor);
  dataFixed.push(...material(corridor));
 }
 function placeRoofHangers(corridor,stations,sides){
  const mounts=[],length=corridor.toM[2]-corridor.fromM[2];
  for(const nominal of stations)for(const side of sides){
   const x=corridor.fromM[0]+side*(corridor.widthM/2+.009);
   let chosen=null;
   for(const shift of[0,.035,-.035,.070,-.070,.120,-.120,.180,-.180]){
    const station=nominal+shift;
    if(station<.006||station>length-.006||
      (corridor.railOpeningsM||[]).some(o=>o.side===side&&
       station+.010>o.fromM&&station-.010<o.toM))continue;
    const z=corridor.fromM[2]+station,
     candidate={...mount(x,z,[x,backY,z]),footDimensionsM:[.040,.012,.003]};
    if(mounts.some(m=>Math.abs(m.trayPointM[2]-z)<.035&&
      Math.abs(m.trayPointM[0]-x)<.012))continue;
    if(clear(material({...corridor,mounts:[candidate],rungStationsM:[],
      retainerStationsM:[]}).filter(p=>p.id.includes(':mount-')))){
     chosen=candidate;break;
    }
   }
   if(chosen)mounts.push(chosen);
   else issues.push({code:'starcatcher-data-roof-hanger-unavailable',
    corridorId:corridor.id,side,stationM:nominal});
  }
  corridor.mounts=mounts;
 }
 const exitOpenings=(group,start,end)=>unique(group.map(row=>target(row)[2]))
  .filter(z=>z>start&&z<end).map(z=>({side:1,
   fromM:Math.max(0,z-start-.024),toM:Math.min(end-start,z-start+.024),
   basis:'48 mm physical side-rail opening for the full-radius equipment drop; '+
    'adjacent roof hangers and rear rungs retain both remaining rail sections.'}));
 // Roof hangers are between the actual switch rows. They meet real rear rungs,
 // rather than ending at an arbitrary point in the cable-space envelope.
 const frontPlanes=unique(graph.boxes.filter(box=>box.id.startsWith('fabric-'))
  .map(box=>box.positionM[2])).sort((a,b)=>a-b),
  hangerZ=frontPlanes.map(z=>z+.464).filter(z=>z>fanStart+.006&&z<fanEnd-.006);
 if(!hangerZ.length)hangerZ.push((fanStart+fanEnd)/2);
 while(fanEnd-hangerZ.at(-1)>.85)hangerZ.push(hangerZ.at(-1)+.8);
 if(fanEnd-hangerZ.at(-1)>.30)hangerZ.push(fanEnd-.080);
 const fan={id:'data-roof-fanout',label:'Star Catcher supported roof data fan-out',
  fromM:[(fanX0+fanX1)/2,(trayFloor+fanTop)/2,fanStart],
  toM:[(fanX0+fanX1)/2,(trayFloor+fanTop)/2,fanEnd],
  widthM:fanX1-fanX0,depthM:fanTop-trayFloor,normalBody:[0,1,0],
  routeIds:rows.map(row=>row.id),openEntry:true,
  retentionBoundary:'inner-top-sandwich',
  railOpeningsM:exitOpenings(worker.filter(row=>slot(row).column===2),fanStart,fanEnd),
  mounts:[]};
 placeRoofHangers(fan,hangerZ.map(z=>z-fanStart),[-1,1]);
 add(fan);
 for(const column of unique(worker.map(row=>slot(row).column))){
  const group=worker.filter(row=>slot(row).column===column);
  for(const bay of unique(group.map(row=>slot(row).bay))){
   const bank=group.filter(row=>slot(row).bay===bay),b=target(bank[0]),
    x0=b[0]+.074,x1=column===2?(bay===1?1.208:1.200):b[0]+.140,
    y0=trayFloor-.040,
    y1=Math.min(...bank.map(row=>target(row)[1]))-.025,z=b[2],
    width=x1-x0,center=(x0+x1)/2,backZ=z-.011,
    parent=fan,
    parentRight=parent?(parent.fromM[0]+parent.widthM/2+.009):x1+.009,
    useRail=parent&&Math.abs(parentRight-(x1+.009))<.035,
    rungZ=parent?.rungStationsM.map(s=>parent.fromM[2]+s)
     .filter(station=>station<=z-.030).sort((a,b)=>b-a)[0],
    attachmentZ=useRail?z-.045:rungZ,
    attachmentX=useRail?parentRight:x1+.009,
    topMount={attachmentPointM:[attachmentX,trayFloor-.002,attachmentZ??z-.05],
     trayPointM:[x1+.009,y0-.006,backZ],attachmentNormalBody:[0,-1,0],
     footDimensionsM:useRail?[.060,.012,.003]:[.012,.060,.003],
     standNormalBody:[0,0,1],attachmentPartId:'starcatcher:raceway:'+parent?.id,
     attachment:useRail?'Shared data tray longeron lower face; bolted ladder bracket':
      'Shared data tray rear rung lower face; bolted ladder bracket'};
   if(!parent||attachmentZ==null)issues.push({code:'starcatcher-data-parent-tray-attachment-unavailable',
    column,bay,parentId:parent?.id});
   const drop={id:'data-column-'+column+'-bay-'+bay+'-drop',
    label:'Star Catcher column '+(column+1)+' bay '+(bay+1)+' data drop ladder',
    fromM:[center,y0,z],toM:[center,y1,z],widthM:width,depthM:.020,
    normalBody:[0,0,1],routeIds:bank.map(row=>row.id),openEntry:true,
    requiredRungStationsM:[.006,y0-y1-.006],mounts:[topMount,
     {...mount(x1+.009,z+.08,[x1+.009,y1+.006,backZ],-1),
      standNormalBody:[0,0,1]}]};
   const clearMount=candidate=>clear(material({...drop,mounts:[candidate],
    rungStationsM:[],retainerStationsM:[]}).filter(p=>p.id.includes(':mount-')));
   if(!clearMount(drop.mounts[0])&&parent){
    const possible=useRail?[attachmentZ,...[-.04,.04,-.08,.08,-.16,.16]
     .map(d=>attachmentZ+d)]:parent.rungStationsM.map(s=>parent.fromM[2]+s)
      .filter(s=>Math.abs(s-z)<.35).sort((a,b)=>Math.abs(a-z)-Math.abs(b-z));
    const chosen=possible.filter(s=>s>parent.fromM[2]+.006&&
     s<parent.toM[2]-.006).map(s=>({...topMount,
      attachmentPointM:[attachmentX,trayFloor-.002,s]})).find(clearMount);
    if(chosen)drop.mounts[0]=chosen;
   }
   if(!clearMount(drop.mounts[1])){
    const chosen=[.08,.12,.16,.24,-.08,-.12,-.16,-.24]
     .flatMap(dz=>[0,.03,-.03].map(dx=>({...drop.mounts[1],
      attachmentPointM:[x1+.009+dx,floor,z+dz]}))).find(clearMount);
    if(chosen)drop.mounts[1]=chosen;
   }
   add(drop);
  }
 }
 const firstRackFace=Math.min(...h.rackLayout.slots.map(s=>s.z))-
  h.rackLayout.slotDimensionsM[2]/2,
  sourceBack=-2.985,sourceFront=-2.480,
  sourceLow=worker.flatMap(row=>row.points.filter(p=>p[2]>=sourceBack&&
   p[2]<=sourceFront&&p[1]<=.742&&p[1]>=-.800));
 if(sourceLow.length){
  const x0=-.620,x1=1.260,
   y0=.742,y1=-.800,back=sourceBack-.001,
   source={id:'data-source-drop-frame',
    label:'Star Catcher shared data source-drop ladder',
    fromM:[(x0+x1)/2,y0,(sourceBack+sourceFront)/2],
    toM:[(x0+x1)/2,y1,(sourceBack+sourceFront)/2],
    widthM:x1-x0,depthM:sourceFront-sourceBack,normalBody:[0,0,1],
    routeIds:worker.filter(row=>row.points.some(p=>p[2]>=sourceBack&&
     p[2]<=sourceFront&&p[1]<=y0&&p[1]>=y1)).map(row=>row.id),
    openEntry:true,maximumRetainerPitchM:.36,
    retainerCandidatesM:Array.from({length:768},(_,i)=>(i+3)*.002)
     .filter(s=>s<y0-y1-.006),
    retentionBasis:'The dense source branch crossings use keeper planes with '+
     'an explicit 360 mm maximum allocated interval. '+
     'Continuous rear rails and rear rungs retain 250 mm spacing. Joint '+
     'strength and cable restraint loads remain preliminary design quantities.',mounts:[]};
  for(const [side,x]of[[-1,x0-.009],[1,x1+.009]]){
   const target=[x,y0-.006,back],parentX=side>0?fanX1+.009:x,
    candidates=side>0?[sourceBack+.040,sourceBack+.100,sourceBack+.160]
      .map(z=>({attachmentPointM:[parentX,trayFloor-.002,z],
       trayPointM:target,attachmentNormalBody:[0,-1,0],
       footDimensionsM:[.060,.012,.003],
       attachmentPartId:'starcatcher:raceway:'+fan.id,
       attachment:'Shared roof data tray longeron lower face; source ladder bracket'})):
     fan.rungStationsM.map(s=>fanStart+s).filter(z=>Math.abs(z-sourceBack)<.35)
      .map(z=>({attachmentPointM:[parentX,trayFloor-.002,z],
       trayPointM:target,attachmentNormalBody:[0,-1,0],
       footDimensionsM:[.012,.060,.003],
       attachmentPartId:'starcatcher:raceway:'+fan.id,
       attachment:'Shared roof data tray rear rung lower face; source ladder bracket'}));
   const top=candidates.find(candidate=>clear(material({...source,mounts:[candidate],
    rungStationsM:[],retainerStationsM:[]}).filter(p=>p.id.includes(':mount-'))));
   if(top)source.mounts.push(top);
   else issues.push({code:'starcatcher-data-source-top-mount-unavailable',side});
   const feet=[0,side*.08,side*.16,side*.24].flatMap(dx=>
    [sourceBack,sourceBack-.10,sourceBack+.10,sourceBack-.20]
     .map(z=>({...mount(x+dx,z,[x,y1+.006,back],-1),standNormalBody:[0,0,1]})));
   const bottom=feet.find(candidate=>clear(material({...source,mounts:[candidate],
    rungStationsM:[],retainerStationsM:[]}).filter(p=>p.id.includes(':mount-'))));
   if(bottom)source.mounts.push(bottom);
   else issues.push({code:'starcatcher-data-source-floor-mount-unavailable',side});
  }
  add(source);
  // Three seated source exits turn down behind the common front-of-PCDU
  // frame. Their narrow retained entry ladders stay clear of the connector
  // bank and attach to the roof tray and the real rear face of that frame.
  for(const row of worker){
   const descent=row.points.slice(1).map((b,i)=>({a:row.points[i],b}))
    .find(({a,b})=>Math.abs(a[0]-b[0])<1e-8&&Math.abs(a[2]-b[2])<1e-8&&
     a[1]>.742&&b[1]<.742&&a[2]<sourceBack&&a[1]-b[1]>.25);
   if(!descent)continue;
   const x=descent.a[0],z=descent.a[2],bottom=descent.b[1]-.055,
    right=x+.024,rear=z-.011,entry={id:'data-source-entry-'+
     /^D-WORKER-(\d+)/.exec(row.id)[1],label:'Star Catcher retained '+row.id+' source entry',
     fromM:[x,.742,z],toM:[x,bottom,z],widthM:.030,depthM:.020,
     normalBody:[0,0,1],routeIds:[row.id],openEntry:true,mounts:[]};
   const topChoices=[{attachmentPointM:[right,y0-.006,sourceBack-.002],
     trayPointM:[right,.736,rear],attachmentNormalBody:[0,0,-1],
     footDimensionsM:[.060,.012,.003],
     attachmentPartId:'starcatcher:raceway:'+source.id,
     attachment:'Shared source-frame top rung rear face; retained entry bracket'},
    ...fan.rungStationsM.map(s=>fanStart+s)
    .filter(station=>Math.abs(station-z)<.35).map(station=>({
     attachmentPointM:[right,trayFloor-.002,station],
     trayPointM:[right,.736,rear],attachmentNormalBody:[0,-1,0],
     footDimensionsM:[.012,.060,.003],attachmentPartId:'starcatcher:raceway:'+fan.id,
     attachment:'Shared roof data tray rear rung lower face; rear entry bracket'}))];
   const target=[right,bottom+.006,rear],useLeft=right<x0+.030,
    lowerChoices=useLeft?[{attachmentPointM:[x0-.009,target[1],sourceBack-.002],
     trayPointM:target,attachmentNormalBody:[0,0,-1],
     footDimensionsM:[.012,.060,.003],attachmentPartId:'starcatcher:raceway:'+source.id,
     attachment:'Shared source-frame left longeron rear face; entry bracket'}]:
     source.rungStationsM.map(s=>y0-s).filter(y=>Math.abs(y-target[1])<.20)
      .map(y=>({attachmentPointM:[right,y,sourceBack-.002],trayPointM:target,
       attachmentNormalBody:[0,0,-1],footDimensionsM:[.060,.012,.003],
       attachmentPartId:'starcatcher:raceway:'+source.id,
       attachment:'Shared source-frame rear rung rear face; entry bracket'}));
   for(const [kind,choices]of[['roof',topChoices],['source-frame',lowerChoices]]){
    const selected=choices.find(candidate=>clear(material({...entry,mounts:[candidate],
     rungStationsM:[],retainerStationsM:[]}).filter(p=>p.id.includes(':mount-'))));
    if(selected)entry.mounts.push(selected);
    else issues.push({code:'starcatcher-data-rear-entry-mount-unavailable',
     corridorId:entry.id,kind});
   }
   add(entry);
  }
 }
 // Native full-radius repairs also use the lower service aisles. Three
 // longitudinal open ladders retain these runs. Removable front hoops sit in
 // the real 100 mm gaps between compute bays; rear rungs remain at 250 mm
 // pitch. The allocated hoop interval follows the 800 mm rack bay pitch,
 // with a 50 mm station allowance, and is stated separately from joint sizing.
 for(const column of[0,1,2]){
  const b=worker.find(row=>slot(row).column===column)?.to;
  if(!b)continue;
  const backX=b[0]-.050,
   frontX=column===0?0:column===1?.880:b[0]+.240,
   bottomY=-.810,topY=.742,carried=[];
  for(const row of worker)for(let i=1;i<row.points.length;i++){
   const a=row.points[i-1],b=row.points[i];
   if(Math.abs(b[2]-a[2])<.5||
     Math.min(a[0],b[0])<backX-.020||Math.max(a[0],b[0])>frontX-.004||
     Math.min(a[1],b[1])<bottomY+.004||Math.max(a[1],b[1])>topY-.004)continue;
   carried.push({id:row.id,a,b});
  }
  if(!carried.length)continue;
  const z0=Math.max(firstRackFace-.040,Math.min(...carried.flatMap(s=>[s.a[2],s.b[2]]))-.025),
   z1=Math.max(...carried.flatMap(s=>[s.a[2],s.b[2]]))+.125,
   length=z1-z0,bayZ=unique(h.rackLayout.slots.map(s=>s.z)),
   gaps=[bayZ[0]-h.rackLayout.slotDimensionsM[2]/2-.050,
    ...bayZ.slice(1).map((z,i)=>(z+bayZ[i])/2)],
   candidateZ=[z0+.012,z0+.080,z0+.160,
    ...gaps.flatMap(z=>Array.from({length:41},(_,i)=>z+(i-20)*.002))]
     .filter(z=>z>z0+.006&&z<z1-.006),
   corridor={id:'data-column-'+column+'-lower-aisle',
    label:'Star Catcher column '+(column+1)+' lower service-aisle ladder',
    fromM:[(backX+frontX)/2,(bottomY+topY)/2,z0],
    toM:[(backX+frontX)/2,(bottomY+topY)/2,z1],
    widthM:topY-bottomY,depthM:frontX-backX,normalBody:[1,0,0],
    routeIds:[...new Set(carried.map(s=>s.id)),
     ...(column===2?['P-SVC-deployment-control/0']:[])],openEntry:true,
    maximumRetainerPitchM:.85,retainerCandidatesM:candidateZ.map(z=>z-z0),
    retentionBasis:'Rear ladder rungs have 250 mm pitch. Removable front hoops '+
     'use the actual gaps between 800 mm compute bays, with up to 50 mm '+
     'local station adjustment; joint strength and cable restraint loads '+
     'remain preliminary design quantities.',mounts:[]};
  const stations=[z0+.05,...gaps.filter(z=>z>z0+.1&&z<z1-.1),z1-.05];
  for(const z of stations)for(const side of[-1,1]){
   const y=side>0?topY+.009:bottomY-.009,target=[backX-.001,y,z];
   const shared=side>0&&z>fanStart&&z<fanEnd?fan.rungStationsM
    .map(s=>fanStart+s).filter(s=>Math.abs(s-z)<.20)
    .sort((a,b)=>Math.abs(a-z)-Math.abs(b-z)).map(s=>({
     attachmentPointM:[backX-.001,trayFloor-.002,s],trayPointM:target,
     attachmentNormalBody:[0,-1,0],footDimensionsM:[.012,.060,.003],
     attachmentPartId:'starcatcher:raceway:'+fan.id,
     attachment:'Shared roof data tray rear rung lower face; bolted aisle-frame bracket'})):[];
   const candidates=[...shared,...[0,.035,-.035,.070,-.070,.12,-.12,.18,.24]
    .flatMap(dz=>[0,-.020,.020,-.060,.060]
    .map(dx=>({...mount(backX-.001+dx,z+dz,[...target.slice(0,2),z+dz],side),
     footDimensionsM:[.040,.012,.003]})))].filter(m=>
      m.trayPointM[2]>=z0+.006&&m.trayPointM[2]<=z1-.006);
   const selected=candidates.find(candidate=>clear(material({...corridor,
    mounts:[candidate],rungStationsM:[],retainerStationsM:[]})
     .filter(p=>p.id.includes(':mount-'))));
   if(selected)corridor.mounts.push(selected);
   else issues.push({code:'starcatcher-data-aisle-mount-unavailable',
    corridorId:corridor.id,side,stationM:z-z0});
  }
  add(corridor);
 }
 const schedule=starcatcherHarnessInstallationHardware(h,graph,corridors),
  solids=installationObstacles(schedule),validation=screenInstallationRows(screenRoutes,solids);
 return {applicable:true,ok:!issues.length&&validation.ok,corridors,issues,validation,
  dataPhysicalCuts:rows.length,screenedPhysicalCuts:screenRoutes.length,
  materialPieceCount:solids.length,parameters:{roof,floor,trayFloor,fanStart,fanEnd,
   fanX0,fanX1,fanTop},
  basis:'One roof-covered source tray, one source frame, three retained rear entries, '+
   'three service-aisle frames and one attached ladder for each occupied compute '+
   'column/bay. Explicit finite material and '+
   'retention stations are screened against the supplied physical tubes; final '+
   'current-vehicle installation admission and joint strength remain separate.'};
}

// Construction-only reuse avoids repeating the finite support search for a
// mission-only edit. Current spacecraft solids, fluids and installed acceptance
// are never cached here. Separate clones prevent scene or ledger annotations
// from changing another design's proposed installation.
const constructionCache=new Map();
export function declareStarcatcherHarnessInstallation(h,graph,{circuitExitPose,connectorTypes}){
 if(h.architectureFamilyId!=='heatlift-study')return null;
 graph.starcatcherSupportConnectorGeometry=[...new Set(graph.ports
  .map(port=>port.connectorTypeId))].sort().map(id=>
   [id,connectorTypes[id].diameterM,connectorTypes[id].lengthM]);
 const feeds=graph.harnesses.filter(a=>a.fromBoxId==='pcdu'&&a.id.startsWith('P-PAY-'));
 const lines=feeds.flatMap(a=>Array.from({length:a.quantity},(_,instance)=>{
  const from=circuitExitPose(h,graph,a.fromPortId,{instance}),to=circuitExitPose(h,graph,a.toPortId,{instance});
  return {id:a.id+'/'+instance,fromBoxId:a.fromBoxId,from:from.cableExitM,to:to.cableExitM,
   fromNormal:from.normal,toNormal:to.normal,radiusM:a.cableDiameterM/2,bendRadiusM:a.bendRadiusM};
 }));
 const context=supportContext(h,graph,{circuitExitPose,connectorTypes}),
  supplementalInstallation=retainedStarcatcherSupplementalInstallation(h,graph);
 const key=JSON.stringify(['starcatcher-mounted-installation-r5',supplementalInstallation?.revision,
  h.input?.referenceCenterId,
  h.architectureFamilyId,[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM],
  h.rackLayout.slots,h.rackLayout.slotDimensionsM,lines,context,
  graph.boxes.map(box=>[box.id,box.frame,box.positionM,box.dimensionsM,box.connectorPanels])]);
 if(constructionCache.has(key)){
  const cached=constructionCache.get(key);constructionCache.delete(key);constructionCache.set(key,cached);
  const {installation,schedule}=structuredClone(cached);
  graph.starcatcherHarnessInstallation=installation;graph.installationHardware.push(...schedule);
  return installation;
 }
 const comb=allocateStarcatcherPayloadDeparture(h,allocatePcduPayloadComb(lines,{rackLayout:h.rackLayout}));
 const retainedPayload=supplementalInstallation?.payloadCorridors;
 let sourceLadder=retainedPayload?.find(c=>c.id==='payload-drop-ladder')||null;
 if(!retainedPayload&&comb.active&&comb.ok){
  const xs=comb.escapes.map(e=>e.mountedDeparture.startM[0]);
  const pad=Math.max(...lines.map(l=>l.radiusM))+.010,minX=Math.min(...xs)-pad,maxX=Math.max(...xs)+pad;
  const sourceZ=comb.escapes.map(e=>e.anchor[2]),zMin=Math.min(...sourceZ)-pad,zMax=Math.max(...sourceZ)+pad;
  const top=Math.max(...comb.escapes.map(e=>e.anchor[1]))+.025;
  const bottom=comb.underRack.topY+comb.maximumBendRadiusM+.040,backX=maxX+.001;
  if(top-bottom>.025)sourceLadder=retainedBranchLadder(h,graph,{id:'payload-drop-ladder',label:'Star Catcher retained payload drop ladder',
   fromM:[(minX+maxX)/2,top,(zMin+zMax)/2],toM:[(minX+maxX)/2,bottom,(zMin+zMax)/2],
   widthM:zMax-zMin,depthM:maxX-minX,normalBody:[-1,0,0],openEntry:true,
   routeIds:lines.map(l=>l.id),mounts:[zMin+.035,zMax-.035].map(z=>({
    attachmentPointM:[backX+.035,comb.underRack.floorM,z],trayPointM:[backX,bottom+.006,z],
    attachmentNormalBody:[0,1,0],attachment:'Inner bottom sandwich face; two bolted ladder stands'}))},comb);
 }
 const payloadRouting=allocateStarcatcherPayloadRoutes(h,lines,comb);
 const supports=payloadRouting.ok&&payloadRouting.rows.length?
  retainedPayload?inspectPayloadSupportConstruction(h,graph,payloadRouting.rows,
   retainedPayload,h.bodyHeightM/2+comb.underRack.floorM):
   allocatePayloadSupports(h,graph,payloadRouting.rows,comb,sourceLadder,context):null;
 const payloadCorridors=retainedPayload||applyStarcatcherPayloadSupportOverrides(
  supports?.corridors||(sourceLadder?[sourceLadder]:[]),supplementalInstallation);
 if(supports&&!retainedPayload&&supplementalInstallation?.payloadSupportOverrides?.length){
  supports.solids=installationObstacles(starcatcherHarnessInstallationHardware(
   h,graph,payloadCorridors));
  supports.validation=screenInstallationRows(payloadRouting.rows,supports.solids);
 }
 const corridors=[...payloadCorridors,
  ...(supplementalInstallation?.corridors||[])],
  issues=[...context.issues,...(payloadRouting.issues||[]),...(supports?.issues||[])];
 if(supports&&!supports.validation.ok)issues.push({code:'starcatcher-installation-material-contact',...supports.validation});
 const installation={revision:'starcatcher-mounted-installation-r5',comb,payloadRouting,
  payloadSupportConstruction:retainedPayload?'guarded-fixed-material':'allocated-material',
  supplementalInstallation,corridors,ok:!issues.length,issues,
  supportValidation:supports?{...supports.validation,minimumBodyMarginM:supports.minimumBodyMarginM,minimumInnerBodyMarginM:supports.minimumInnerBodyMarginM,screenedPhysicalCircuits:payloadRouting.rows.length,materialPieceCount:supports.solids.length}:null,
  basis:'Every payload feed follows one coordinated full-radius route from its real PCDU exit to its real compute connector. A retained source ladder feeds a floor-supported fanout, three under-rack trunk trays and narrow equipment risers. The guarded default installation adds shared data, source, primary-power, service, RF and thermal ladders. One complete explicit material and attachment schedule drives the renderer and mass/MEL; current-scene clearance and joint strength remain separate assessments.'};
 graph.starcatcherHarnessInstallation=installation;
 const schedule=starcatcherHarnessInstallationHardware(h,graph,corridors);
 installation.materialPieceCount=schedule.reduce((n,p)=>n+p.materialPieces.length,0);
 graph.installationHardware.push(...schedule);
 constructionCache.set(key,structuredClone({installation,schedule}));
 if(constructionCache.size>4)constructionCache.delete(constructionCache.keys().next().value);
 return installation;
}
