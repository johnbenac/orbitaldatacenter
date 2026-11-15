import {allocateStarmindPayloadRoutes} from './starmind-payload-routing.js';
import {deploymentLayout,mechanismPose} from './deployment.js';
import {roundedConnectionRoute} from './connection-routes.js';
import {allocatePcduPayloadComb} from './pcdu-routing-comb.js';
import {auditRoutes,routeClearance} from './routing-audit.js';
import {starmindHarnessInstallationHardware} from './starmind-harness-installation.js';
import {cableInstallationHardware} from './cable-installation-mass.js';

// The lower radiator supply crosses the payload distribution plane through
// its own real floor penetration, beyond the transverse cable fanout. Keep
// the hole, its support keepout and both connected pipe proposals together.
// Ordinary fluid planning still screens every proposed section and can
// replace it; this is an installed station, never a clearance exemption.
export function starmindLoopTwoSupplyAccommodation(h,{bankIndex,side,a=null,b=null,section='internal'}={}){
 if(h.architectureFamilyId!=='starmind-cross'||h.input.referenceCenterId!=='starmind-ai1'||bankIndex!==1||side!==1)return null;
 const stationOffsetM=[.04,0,.30];let controlPoints=null;
 if(a&&b){
  if(section==='union'){
   const lead=Math.min(.15,Math.abs(b[1]-a[1])/3);
   controlPoints=[a,[a[0],a[1]-lead,a[2]],[b[0],b[1]+lead,b[2]],b];
  }else{
   const top=Math.max(-.27,a[1]+.145),forward=Math.max(2.90,a[2]+.30);
   controlPoints=[a,[a[0],top,a[2]],[a[0],top,forward],[b[0],-.85,forward],[b[0],-.85,b[2]],b];
  }
 }
 return {stationOffsetM,controlPoints,minimumBendRadiusM:.108,
  basis:'Loop 2 supply uses a separate 68 mm floor aperture 40 mm farther outboard and 300 mm forward of the original station. The internal pipe clears the transverse payload ribbon; the fixed union feed retains a full-radius oblique offset to its unchanged inlet.'};
}

// Turn the complete payload bank down in the aft equipment bay, before the
// first compute row, then forward in the under-rack service plenum. Rows nest
// the +X/-Y elbows; source-Z rank nests the -Y/+Z elbows. No endpoint moves.
export function allocateStarmindPayloadDeparture(h,allocation){
 if(h.architectureFamilyId!=='starmind-cross'||!allocation.active||!allocation.ok)return allocation;
 if(allocation.starmindUnderRack)return allocation;
 const ys=[...new Set(allocation.escapes.map(e=>e.anchor[1]))].sort((a,b)=>a-b);
 const zs=[...new Set(allocation.escapes.map(e=>e.anchor[2]))].sort((a,b)=>a-b);
 const radius=Math.max(...allocation.escapes.map(e=>e.radiusM));
 const bend=Math.max(...allocation.escapes.map(e=>e.bendRadiusM));
 const pitch=2*radius+.006,lead=2.4*bend+.015;
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
  if(shape.bendLimited)allocation.issues.push({code:'starmind-under-rack-bend',routeId:escape.id,
   actualM:shape.minimumBendRadiusM,requiredM:escape.bendRadiusM});
 }
 const routes=allocation.escapes.map(e=>({id:e.id,points:e.points,radiusM:e.radiusM,clearanceM:.002,
  from:{position:e.anchor,normal:e.fromNormal}}));
 const validation=auditRoutes(routes,[],{maxIssues:12});
 allocation.issues.push(...validation.issues.map(issue=>({...issue,code:'starmind-under-rack-'+issue.code})));
 const minXM=Math.min(...allocation.escapes.map(e=>e.mountedDeparture.startM[0]))-radius,
  maxXM=Math.max(...allocation.escapes.map(e=>e.mountedDeparture.startM[0]))+radius,
  minYM=bottomY-radius,maxYM=bottomY+(zs.length-1)*pitch+radius;
 Object.assign(allocation,{ok:allocation.issues.length===0,exitZ,starmindUnderRack:true,pitchM:pitch,sourceColumns:zs,
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
  const schedule=starmindHarnessInstallationHardware(h,graph,[{...corridor,retainerStationsM:[station]}]),
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
   retentionFailure={code:'starmind-ladder-retention-unavailable',corridorId:corridor.id,
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
  if(!type){issues.push({code:'starmind-support-connector-geometry-unavailable',portId:port.id});continue;}
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
  const offset=starmindLoopTwoSupplyAccommodation(h,{bankIndex,side})?.stationOffsetM||[0,0,0];
  floorOpenings.push({id:'coolant-floor-'+side,positionM:[side*.20+offset[0],z+offset[2]],radiusM:.034,
   basis:'Nominal root-cant coolant feedthrough station from the same bank/root geometry as craft-family; actual pierced material is checked in the rendered installation.'});
 }
 return {fixed,floorOpenings,issues};
}
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
  if(station==null)issues.push({code:'starmind-floor-foot-aperture',positionM:[x,floor,z]});
  return {attachmentPointM:[x,floor,station??z],trayPointM:target,attachmentNormalBody:[0,1,0],attachment:'Inner bottom sandwich face; preliminary bolted insert attachment'};
 };
 function makeRetention(corridor){
  const delta=sub(corridor.toM,corridor.fromM),length=Math.hypot(...delta),accepted=[];let cursor=0;
  while(length-cursor>.25+1e-9||!accepted.length){
   const upper=Math.min(length-.006,cursor+.25),candidates=[upper,...Array.from({length:Math.ceil(upper/.012)},(_,i)=>upper-(i+1)*.012)].filter(s=>s>cursor+.012&&s>=.006);
   let selected=null;
   for(const station of candidates){
    const schedule=starmindHarnessInstallationHardware(h,graph,[{...corridor,retainerStationsM:[station]}]),solids=installationObstacles(schedule).filter(p=>p.id.includes(':retainer-')),result=screenInstallationRows(rows,solids);
    if(result.ok&&!fixedHardwareContacts(solids,context.fixed).length){selected={stationM:station,minimumMarginM:result.minimumClearanceM};break;}
   }
   if(!selected){issues.push({code:'retainer-unavailable',corridorId:corridor.id,cursorM:cursor,remainingM:length-cursor});break;}
   accepted.push(selected);cursor=selected.stationM;
  }
  const stations=accepted.map(row=>row.stationM),gaps=[stations[0]||length,...stations.slice(1).map((s,i)=>s-stations[i]),length-(stations.at(-1)||0)];
  return {...corridor,retainerStationsM:stations,retentionAllocation:{maximumPitchM:.25,maximumUnsupportedSpanM:Math.max(...gaps),stations:accepted,screenedPhysicalCircuits:rows.length}};
 }
 function addCorridor(corridor){
  const solids=installationObstacles(starmindHarnessInstallationHardware(h,graph,[{...corridor,retainerStationsM:[]}])),before=screenInstallationRows(rows,solids),fixedContacts=fixedHardwareContacts(solids,context.fixed);
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
 addCorridor({id:'payload-fanout-floor',label:'Starmind supported under-rack payload fanout',fromM:[(minX+maxX)/2,fanCenterY,fanStart],toM:[(minX+maxX)/2,fanCenterY,fanEnd],widthM:maxX-minX,depthM:fanTop-minY,normalBody:[0,1,0],routeIds:rows.map(row=>row.id),openEntry:true,mounts:fanStations.flatMap(z=>footXs.map(x=>floorMount(x,z,[x,backY,z])))});
 for(const column of unique(rows.map(row=>row.laneMetadata.column))){
  const group=rows.filter(row=>row.laneMetadata.column===column),x0=Math.min(...group.map(row=>row.laneMetadata.commonX))-pad,x1=Math.max(...group.map(row=>row.laneMetadata.trunkX))+pad;
  const end=Math.max(...group.map(row=>row.laneMetadata.riseZ))+R+.01,length=end-fanEnd,intervals=Math.max(1,Math.ceil((length-.012)/.25));
  const stations=Array.from({length:intervals+1},(_,i)=>fanEnd+.006+(length-.012)*i/intervals);
  const mountStations=stations.filter((_,i)=>i%2===0||i===stations.length-1),mountX=x1+.009;
  addCorridor({id:'payload-column-'+column+'-floor',label:'Starmind column '+(column+1)+' under-rack cable trunk',fromM:[(x0+x1)/2,centerY,fanEnd],toM:[(x0+x1)/2,centerY,end],widthM:x1-x0,depthM:maxY-minY,normalBody:[0,1,0],routeIds:group.map(row=>row.id),openEntry:true,mounts:mountStations.map(z=>floorMount(mountX,z,[mountX,backY,z]))});
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
   const riser={id:'payload-column-'+column+'-bay-'+bay+'-riser',label:'Starmind column '+(column+1)+' bay '+(bay+1)+' retained payload riser',fromM:[x,y0,(z0+z1)/2],toM:[x,y1,(z0+z1)/2],widthM:z1-z0,depthM:.020,normalBody:[-1,0,0],routeIds:bank.map(row=>row.id),openEntry:true,mounts:[]};
   // Riser back rails begin above the underfloor elbow band. Stand endpoints
   // lie on the real end rungs; an upper sandwich restraint is available when
   // the dense first-bay fanout prevents a second straight floor stand.
   for(const z of[z0+.015,z1-.015]){
    const target=[backX,rungY,z],targetZs=[z,...Array.from({length:Math.floor((z1-z0-.03)/.024)},(_,i)=>z0+.015+(i+1)*.024)].filter(zz=>riser.mounts.every(m=>Math.abs(zz-m.trayPointM[2])>.075));
    const candidates=targetZs.flatMap(targetZ=>[targetZ,z1+.08,z1+.16,z0-.08,z0-.16].flatMap(footZ=>[.040,.080,.120,-.040,-.080].map(offset=>floorMount(x-offset,footZ,[backX,rungY,targetZ]))));
    const roofMounts=[z,z+.160,z+.240,z-.160,z-.240,z+.320].map(station=>({attachmentPointM:[backX,-floor,station],trayPointM:[backX,y1-.006,z],attachmentNormalBody:[0,-1,0],attachment:'Inner top sandwich face; preliminary bolted insert restraint'}));
    const selected=[...candidates,...roofMounts].find(mount=>{const solids=installationObstacles(starmindHarnessInstallationHardware(h,graph,[{...riser,mounts:[mount],retainerStationsM:[]}])).filter(p=>p.id.includes(':mount-'));return insideBody(solids)&&screenInstallationRows(rows,solids).ok&&!fixedHardwareContacts(solids,context.fixed).length;});
    if(!selected)issues.push({code:'riser-mount-unavailable',corridorId:riser.id,target});
    riser.mounts.push(selected||candidates[0]);
   }
   addCorridor(riser);
  }
 }
 if(sourceLadder)corridors.unshift(sourceLadder);
 const schedule=starmindHarnessInstallationHardware(h,graph,corridors),solids=installationObstacles(schedule),validation=screenInstallationRows(rows,solids);
 let minimumBodyMarginM=Infinity,minimumInnerBodyMarginM=Infinity;
 for(const solid of solids)for(let k=0;k<3;k++){
  const margin=[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM][k]/2-Math.max(Math.abs(solid.bounds.min[k]),Math.abs(solid.bounds.max[k]));
  minimumBodyMarginM=Math.min(minimumBodyMarginM,margin);minimumInnerBodyMarginM=Math.min(minimumInnerBodyMarginM,margin-wall);
 }
 if(minimumInnerBodyMarginM< -1e-9)issues.push({code:'starmind-installation-outside-inner-body',minimumInnerBodyMarginM});
 return {corridors,schedule,issues,validation,minimumBodyMarginM,minimumInnerBodyMarginM,parameters:{floor,bottom,top,minX,maxX,fanStart,fanEnd,retentionPitchM:.25},solids};
}

// Construction-only reuse avoids repeating the finite support search for a
// mission-only edit. Current spacecraft solids, fluids and installed acceptance
// are never cached here. Separate clones prevent scene or ledger annotations
// from changing another design's proposed installation.
const constructionCache=new Map();
export function declareStarmindHarnessInstallation(h,graph,{circuitExitPose,connectorTypes}){
 if(h.architectureFamilyId!=='starmind-cross')return null;
 const feeds=graph.harnesses.filter(a=>a.fromBoxId==='pcdu'&&a.id.startsWith('P-PAY-'));
 const lines=feeds.flatMap(a=>Array.from({length:a.quantity},(_,instance)=>{
  const from=circuitExitPose(h,graph,a.fromPortId,{instance}),to=circuitExitPose(h,graph,a.toPortId,{instance});
  return {id:a.id+'/'+instance,fromBoxId:a.fromBoxId,from:from.cableExitM,to:to.cableExitM,
   fromNormal:from.normal,toNormal:to.normal,radiusM:a.cableDiameterM/2,bendRadiusM:a.bendRadiusM};
 }));
 const context=supportContext(h,graph,{circuitExitPose,connectorTypes});
 const key=JSON.stringify(['starmind-mounted-installation-r3',h.input?.referenceCenterId,
  h.architectureFamilyId,[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM],
  h.rackLayout.slots,h.rackLayout.slotDimensionsM,lines,context,
  graph.boxes.map(box=>[box.id,box.frame,box.positionM,box.dimensionsM,box.connectorPanels])]);
 if(constructionCache.has(key)){
  const cached=constructionCache.get(key);constructionCache.delete(key);constructionCache.set(key,cached);
  const {installation,schedule}=structuredClone(cached);
  graph.starmindHarnessInstallation=installation;graph.installationHardware.push(...schedule);
  return installation;
 }
 const comb=allocateStarmindPayloadDeparture(h,allocatePcduPayloadComb(lines,{rackLayout:h.rackLayout}));
 let sourceLadder=null;
 if(comb.active&&comb.ok){
  const xs=comb.escapes.map(e=>e.mountedDeparture.startM[0]);
  const pad=Math.max(...lines.map(l=>l.radiusM))+.010,minX=Math.min(...xs)-pad,maxX=Math.max(...xs)+pad;
  const sourceZ=comb.escapes.map(e=>e.anchor[2]),zMin=Math.min(...sourceZ)-pad,zMax=Math.max(...sourceZ)+pad;
  const top=Math.max(...comb.escapes.map(e=>e.anchor[1]))+.025;
  const bottom=comb.underRack.topY+comb.maximumBendRadiusM+.040,backX=maxX+.001;
  if(top-bottom>.025)sourceLadder=retainedBranchLadder(h,graph,{id:'payload-drop-ladder',label:'Starmind retained payload drop ladder',
   fromM:[(minX+maxX)/2,top,(zMin+zMax)/2],toM:[(minX+maxX)/2,bottom,(zMin+zMax)/2],
   widthM:zMax-zMin,depthM:maxX-minX,normalBody:[-1,0,0],openEntry:true,
   routeIds:lines.map(l=>l.id),mounts:[zMin+.035,zMax-.035].map(z=>({
    attachmentPointM:[backX+.035,comb.underRack.floorM,z],trayPointM:[backX,bottom+.006,z],
    attachmentNormalBody:[0,1,0],attachment:'Inner bottom sandwich face; two bolted ladder stands'}))},comb);
 }
 const payloadRouting=allocateStarmindPayloadRoutes(h,lines,comb);
 const supports=payloadRouting.ok&&payloadRouting.rows.length?allocatePayloadSupports(h,graph,payloadRouting.rows,comb,sourceLadder,context):null;
 const corridors=supports?.corridors||(sourceLadder?[sourceLadder]:[]),issues=[...context.issues,...(payloadRouting.issues||[]),...(supports?.issues||[])];
 if(supports&&!supports.validation.ok)issues.push({code:'starmind-installation-material-contact',...supports.validation});
 const installation={revision:'starmind-mounted-installation-r3',comb,payloadRouting,corridors,ok:!issues.length,issues,
  supportValidation:supports?{...supports.validation,minimumBodyMarginM:supports.minimumBodyMarginM,minimumInnerBodyMarginM:supports.minimumInnerBodyMarginM,screenedPhysicalCircuits:payloadRouting.rows.length,materialPieceCount:supports.solids.length}:null,
  basis:'Every payload feed follows one coordinated full-radius route from its real PCDU exit to its real compute connector. A retained source ladder feeds a floor-supported fanout, four under-rack trunk trays and narrow equipment risers. All finite rails, rungs, retention bridges, mounting feet and stands are screened against the complete physical payload cables. The same explicit material and attachment schedule drives the renderer and mass/MEL.'};
 graph.starmindHarnessInstallation=installation;
 const schedule=supports?.schedule||starmindHarnessInstallationHardware(h,graph,corridors);
 graph.installationHardware.push(...schedule);
 constructionCache.set(key,structuredClone({installation,schedule}));
 if(constructionCache.size>4)constructionCache.delete(constructionCache.keys().next().value);
 return installation;
}
