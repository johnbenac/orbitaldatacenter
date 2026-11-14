import * as T from './vendor/three.module.js';
import {reconcileInstalledElectricalRouting,electricalBoxMoves} from './electrical-architecture.js';
import {anchorInFrame,normalInFrame} from './connection-geometry.js';
import {obstacleFromMesh,routeFromTube,auditRoutes,routeClearance,routingMatrix} from './routing-audit.js';
import {planElectricalRoute,fixedLengthFlex} from './electrical-routing.js';
import {roundedConnectionRoute,routeLength} from './connection-routes.js';
import {deploymentLayout} from './deployment.js';
import {constantLengthHingeRoute,routingMotionFor} from './flight-fluid-routing.js';
import {planarHingeFlex,redwireHingeFlexAllocation} from './hinge-flex-routing.js';
import {createOperationalRoutingEnvelopes} from './routing-operational-envelopes.js';
import {allocateMatingReservoir,sampleMatingReservoir,matingReservoirSweptObstacles} from './electrical-service-loops.js';
import {createSolarTrackingEnvelopes} from './flight-solar-routing-motion.js';
import {prepareInlineElectricalInstallation} from './inline-electrical-installation.js';
import {createConnectorBoreDatums} from './connector-bore-datums.js';
import {inspectFixedCollectorHardware,inspectInstalledEquipmentHardware} from './fixed-collector-accommodation.js';
import {allocatePcduPayloadComb,inspectPcduPayloadComb} from './pcdu-routing-comb.js';
import {prepareAcceptedJuneRackPowerTrays} from './rack-power-trays.js';
import {createRedwireHarnessInstallation,redwirePanelRouteControls,redwirePanelLane} from './redwire-harness-installation.js';
const V=p=>new T.Vector3(...(p||[0,0,0]));
const inherited=(o,key)=>{for(let p=o;p;p=p.parent)if(p.userData?.[key]!=null)return p.userData[key];};
export const electricalRoutingDiagnostics={onBeforeRoute:null,onRoute:null,onServiceRoute:null,onBeforeService:null,onPlanningContext:null,onTrayInstallation:null};

// H11's one static collector conductor uses the outboard aisle before the
// retained coolant crossing, then enters the PCDU from the aft side. These
// controls are only a proposal: planElectricalRoute checks current complete
// solids, foreign terminal reservations and every already occupied route.
// Keep this outside global nearby presets so the preceding conductors cannot
// inherit a newly added construction seed.
export function starmindCollectorStaticHint(h,layout,line,a,b,na,nb,waypoints=[]){
 const spec=line.r?.spec,near=(p,q)=>Array.isArray(p)&&p.length===3&&p.every((x,i)=>Number.isFinite(x)&&Math.abs(x-q[i])<1e-10),zero=p=>p?.x===0&&p?.y===0&&p?.z===0;
 if(h.input?.referenceCenterId!=='starmind-ai1'||layout.familyId!=='starmind-cross'||line.id!=='P-SA-1/2'||spec?.id!=='P-SA-1'||spec.fromBoxId!=='solar-root-1'||spec.toBoxId!=='pcdu'||spec.fromPortId!=='P-SA-1:from'||spec.toPortId!=='P-SA-1:to'||spec.terminationAllowanceM!==.3||line.radiusM!==.00675||line.bendRadiusM!==.135||line.r.from.matingTravel!==.045||line.r.to.matingTravel!==.045||!zero(line.r.from.plug.position)||!zero(line.r.to.plug.position)||line.fromEscape||line.toEscape||line.fromPortal||line.toPortal||waypoints.length)return null;
 if(!near(a,[-1.9782798074995969,.7766492071371994,-.18280000000000002])||!near(b,[-1.0269325992139549,-.2241873113848126,-2.4924897022735237])||!near(na,[0,0,-1])||!near(nb,[0,0,1]))return null;
 return [[...a],[a[0],a[1],-.65],[-1.70,a[1],-.65],[-1.70,a[1],-2.08],[-1.70,b[1],-2.08],[b[0],b[1],-2.08],[...b]];
}

export function physicalFlightMeshes(root){
 const meshes=[];root.traverse(o=>{if(!o.isMesh||!o.geometry?.attributes?.position||o.userData.dynamicConnection||inherited(o,'electricalOverview')||inherited(o,'engineeringGraphic')||inherited(o,'sceneFlow')||inherited(o,'groundEquipment')||o.material?.userData?.physicalMaterial===false)return;
  // Cutaway inventory fills and removed shell alternatives are display glyphs,
  // not additional solids. Visibility toggles never remove a physical wall.
  if(o.userData.routingNonPhysical)return;meshes.push(o);});return meshes;
}

export function createInstalledElectricalRouting({factory,h,architecture,routes,ports,cards=new Map(),actualBoxes,raw,colors,metal,planFluidRoutes=true}){
 const root=factory.root,layout=deploymentLayout(h),lines=[],plans=new Map(),banks=new Map();
 const storageAllocation=h.propulsion?.storageAccommodation,accommodationIssues=layout.familyId==='protected-core'?!storageAllocation?[{code:'missing-protected-storage-accommodation'}]:storageAllocation.ok?[]:storageAllocation.issues.map(issue=>({...issue,scope:'Protected recorder installation'})):[];
 for(const box of architecture.boxes.filter(b=>b.frame==='solar-root'&&!b.deploymentMotion)){const allocation=architecture.collectorAccommodations?.find(a=>a.boxId===box.id);if(!allocation)accommodationIssues.push({code:'missing-fixed-collector-accommodation',boxId:box.id});else accommodationIssues.push(...allocation.issues);}
 for(const box of architecture.boxes.filter(b=>b.routingAccommodation))accommodationIssues.push(...(box.routingAccommodation.issues||[]));
 let operationalEnvelopes=null;const borePoint=createConnectorBoreDatums();
 for(const r of routes.values())for(let i=0;i<r.tubes.length;i++)lines.push({id:r.spec.id+'/'+i,r,i,tube:r.tubes[i],from:r.from.exits[i],to:r.to.exits[i],radiusM:r.spec.cableDiameterM/2,bendRadiusM:r.spec.bendRadiusM});
 const inline=prepareInlineElectricalInstallation({factory,h,architecture,lines,routes,ports,colors,metal,onPlan:record=>electricalRoutingDiagnostics.onRoute?.(record)});
 if(inline){const replaced=new Set(inline.logicalLines);for(let i=lines.length-1;i>=0;i--)if(replaced.has(lines[i]))lines.splice(i,1);}
 if(layout.familyId!=='redwire-platform'){const order=new Map([...routes.keys()].map((id,i)=>[id,i]));lines.sort((a,b)=>order.get(a.r.spec.id)-order.get(b.r.spec.id)||(a.r.spec.connectorTypeId.startsWith('hv-single')?(a.i^1)-(b.i^1):a.i-b.i));}
 function obstacles({frame=null}={}){
  root.updateWorldMatrix(true,true);operationalEnvelopes=createOperationalRoutingEnvelopes(factory,{frame});const result=[...physicalFlightMeshes(root).map(mesh=>{
   const portId=inherited(mesh,'electricalPortId'),apertures=[];
   // A connector bore belongs to its physical shell. Capture its mated datum
   // once in that shell's frame: fixed receptacles keep fixed holes while the
   // cable plug and its bore move together through the withdrawal stroke.
   if(portId)for(const line of lines){const anchor=line.r.spec.fromPortId===portId?line.from:line.r.spec.toPortId===portId?line.to:null;if(!anchor)continue;apertures.push(borePoint.contactBox(mesh,line.id,anchor,{id:line.id+':termination',routeIds:[line.id],halfSizeM:(line.radiusM+.002)*3,frame}));}
   return {...obstacleFromMesh(mesh,{id:mesh.uuid,frame,apertures}),motionModel:routingMotionFor(mesh)};
  }),...operationalEnvelopes.obstacles];return inline?inline.decorateObstacles(result,{frame}):result;
 }
 const dims=[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM],boxById=architecture.boxById;
 const world=anchor=>root.worldToLocal(anchor.getWorldPosition(V())).toArray(),normal=anchor=>normalInFrame(anchor,root).toArray();
 function addEndpoint(line,which){
  const box=boxById[line.r.spec[which+'BoxId']],p=world(line[which]);
  // Both plugs of a rotary-transfer downstream cut belong to the same leaf.
  // It is a carried static cable, with no bus-wall or flexible hinge crossing.
  if(layout.familyId==='redwire-platform'&&['from','to'].every(end=>boxById[line.r.spec[end+'BoxId']]?.frame==='payload'))return;
  if(box.id==='gnss-antenna'&&layout.familyId==='protected-core'){
   // The protected bus's stowed radiator covers the external roof service
   // lane. Feed its antenna through a real underside SMA/roof gland so the
   // installed coax and its withdrawal reservoir stay inside the bus.
   factory.addRoutingFeedthrough({id:'gnss-under-roof-feed',axis:'y',sign:1,positionM:[p[0],dims[1]/2,p[2]],radiusM:.018,part:'communications',straightM:.12});
  }
  if(box.id.startsWith('sband-patch-')){const n=normal(line[which]),axis=[0,1,2].reduce((a,k)=>Math.abs(n[k])>Math.abs(n[a])?k:a,0),sign=-Math.sign(n[axis]),center=p.map((x,i)=>i===axis?sign*dims[i]/2:x);factory.addRoutingFeedthrough({id:'rf-rear-feed:'+box.id,axis:['x','y','z'][axis],sign,positionM:center,radiusM:.018,part:'communications',straightM:.07});}
  const outside=p.some((x,i)=>Math.abs(x)>dims[i]/2+.008);if(!outside&&(box.frame==='body'||box.frame==='solar-root'&&!box.deploymentMotion))return;
  const key=box.frame==='payload'?'payload-hinge':box.id;
  if(!banks.has(key))banks.set(key,{key,box,members:[],external:p});banks.get(key).members.push({line,which});
 }
 root.updateWorldMatrix(true,true);for(const line of lines){addEndpoint(line,'from');addEndpoint(line,'to');}
 for(const bank of banks.values()){
  const {box,key,members}=bank;let axis,sign,center;
  if(box.frame==='payload'){const allocation=redwireHingeFlexAllocation(layout);axis=1;sign=1;center=[-.55+(members.length-1)*.045/2,h.bodyHeightM/2,allocation.fixedClamp[2]];}
  else if(box.frame==='solar-root'){axis=0;sign=Math.sign(bank.external[0])||1;center=[sign*dims[0]/2,-dims[1]*.27,Math.max(h.propulsion.forwardDeckZ+.7,dims[2]*.30)];}
  else{axis=[0,1,2].reduce((best,i)=>Math.abs(bank.external[i])/dims[i]>Math.abs(bank.external[best])/dims[best]?i:best,0);sign=Math.sign(bank.external[axis])||1;center=bank.external.map((x,i)=>i===axis?sign*dims[i]/2:Math.max(-dims[i]*.38,Math.min(dims[i]*.38,x)));const tangent=axis===0?2:0;center[tangent]=Math.max(-dims[tangent]*.40,Math.min(dims[tangent]*.40,center[tangent]+.34));}
  // The protected Ka terminal points over the roof. Its fixed connector faces
  // left, so the roof gland belongs in that left service lane, clear of the
  // complete pointing-head envelope and the yawing support.
  if(layout.familyId==='protected-core'&&box.id.startsWith('ka-')&&axis===1)center[0]=Math.max(-dims[0]*.40,bank.external[0]-.95);
  const tangent=axis===0?2:0,vertical=axis===1?2:1,solar=box.frame==='solar-root'&&!box.deploymentMotion,pitch=Math.max(box.frame==='payload'?.045:solar?.075:.033,...members.map(x=>x.line.radiusM*2+.018)),width=Math.max(.08,(solar?Math.ceil(members.length/2):members.length)*pitch+.025),height=solar?.18:.07;
  const portal=factory.addRoutingFeedthrough({id:'electrical:'+key,axis:['x','y','z'][axis],sign,positionM:center,widthM:width,heightM:height,part:'harness',straightM:.12});bank.portal=portal;bank.axis=axis;bank.sign=sign;bank.center=center;bank.tangent=tangent;
  const solarColumns=solar?[...new Set(members.map(({line,which})=>+Math.abs(world(line[which])[0]).toFixed(6)))].sort((a,b)=>a-b):[];
  members.forEach(({line,which},i)=>{const c=[...portal.center];if(solar){const column=solarColumns.indexOf(+Math.abs(world(line[which])[0]).toFixed(6));c[tangent]+=(column-(solarColumns.length-1)/2)*pitch;c[vertical]+=(i%2?1:-1)*.05;}else c[tangent]+=(i-(members.length-1)/2)*pitch;const reach=line.bendRadiusM*2.4+.13,n=[0,0,0];n[axis]=sign;line[which+'Portal']={bank,center:c,normal:n,inner:c.map((x,k)=>x-n[k]*reach),outer:c.map((x,k)=>x+n[k]*reach),lane:i};});
 }
 const redwireInstallation=createRedwireHarnessInstallation({factory,h,architecture,material:metal});
 const cardSweeps=[];for(const definition of architecture.cards.filter(c=>!c.external)){const card=cards.get(definition.itemId);if(!card)continue;const travelM=Math.max(.06,definition.dimensionsM[2]*1.4),box=new T.Box3().setFromObject(card),d=V([0,0,travelM]).transformDirection(card.parent.matrixWorld).multiplyScalar(travelM).toArray(),min=box.min.toArray().map((x,k)=>Math.min(x,x+d[k])),max=box.max.toArray().map((x,k)=>Math.max(x,x+d[k]));cardSweeps.push({id:definition.id+':extraction-sweep',type:'box',min,max,bounds:{min,max}});}
 const solarEnvelopes=createSolarTrackingEnvelopes(factory,h),allObstacles=[...obstacles(),...solarEnvelopes.obstacles,...cardSweeps];
 // Accepted coolant and propellant lines already occupy physical space.
 // Electrical paths and their withdrawal reservoirs must reserve that space
 // from the first candidate, including the fixed fitting leads which cannot
 // be repaired by a later fluid replanning pass.
 const fluidReservations=[],planned=[];
 // Fixed collectors are accommodated inside the complete wall envelope after
 // packing. Any genuinely external endpoint still uses the ordinary planner
 // with its actual connector normal and explicit outer/inner portal waypoints.
 // A prebuilt Y dogleg would override a Z-facing plug and cross adjacent exits.
 // A crowded source bank gets a comb-shaped fan-out before entering the main
 // tray. Ordered offsets prevent an earlier circuit occupying a later exit.
 if(layout.familyId==='redwire-platform')for(const line of lines.filter(l=>l.r.spec.id.startsWith('P-SA-'))){
  const end=line.r.spec.fromBoxId==='pcdu'?'from':'to',a=world(line[end]),instance=line[end].userData.circuitInstance||0,x=-h.bodyWidthM/2+.185+instance*.040,controls=[a,[x,a[1],a[2]],[x,a[1],h.bodyLengthM*.30]],shape=roundedConnectionRoute(controls,line.bendRadiusM);
  line[end+'Escape']={end,anchor:a,points:shape.points,controlPoints:controls,minimumBendRadiusM:shape.minimumBendRadiusM,lengthM:shape.lengthM,normal:[0,0,1]};
 }
 if(layout.familyId!=='redwire-platform')for(const line of lines.filter(l=>l.r.spec.id.startsWith('P-SA-')&&['left','right'].includes(architecture.portById[l.r.spec.toPortId]?.face))){
  const end=line.r.spec.fromBoxId==='pcdu'?'from':'to',port=architecture.portById[line.r.spec[end+'PortId']],a=world(line[end]),columns=port.packing.columns,column=(line[end].userData.circuitInstance||0)%columns,pitch=line.radiusM*2+.012,sign=port.face==='right'?1:-1,rackSide=Math.max(0,...h.rackLayout.slots.map(s=>Math.abs(s.x)+h.rackLayout.slotDimensionsM[0]/2)),x=layout.familyId==='orbital-rack'&&sign>0?Math.max(a[0]+2*line.bendRadiusM+.020,rackSide+line.bendRadiusM+.045)+(columns-1-column)*pitch:a[0]+sign*(2*line.bendRadiusM+.020+(columns-1-column)*pitch),z=boxById.pcdu.positionM[2]+.45,controls=[a,[x,a[1],a[2]],[x,a[1],z]],shape=roundedConnectionRoute(controls,line.bendRadiusM);
  line[end+'Escape']={end,anchor:a,points:shape.points,controlPoints:controls,minimumBendRadiusM:shape.minimumBendRadiusM,lengthM:shape.lengthM,normal:[0,0,1]};
 }
 if(layout.familyId==='redwire-platform'){
  const control=lines.filter(l=>l.r.spec.fromBoxId==='avionics'&&l.r.spec.kind==='control'),columns=[...new Set(control.map(l=>+world(l.from)[2].toFixed(6)))].sort((a,b)=>a-b);
  for(const line of control){const a=world(line.from),column=columns.indexOf(+a[2].toFixed(6)),x=-.70+(columns.length-1-column)*.060,controls=[a,[x,a[1],a[2]],[x,a[1],h.bodyLengthM*.30],...(line.r.spec.id==='C-ka-1'?[[x,h.bodyHeightM*.26,h.bodyLengthM*.30]]:[])],shape=roundedConnectionRoute(controls,line.bendRadiusM);line.fromEscape={end:'from',anchor:a,points:shape.points,controlPoints:controls,minimumBendRadiusM:shape.minimumBendRadiusM,lengthM:shape.lengthM,normal:line.r.spec.id==='C-ka-1'?[0,1,0]:[0,0,1]};}
 }
 const payloadComb=allocatePcduPayloadComb(lines.map(line=>({id:line.id,fromBoxId:line.r.spec.fromBoxId,from:world(line.from),fromNormal:normal(line.from),radiusM:line.radiusM,bendRadiusM:line.bendRadiusM})),{rackLayout:h.rackLayout});
 const batchServiceAllocation=layout.familyId==='protected-core'||payloadComb.active;
 for(const escape of payloadComb.escapes)lines.find(line=>line.id===escape.id).fromEscape=escape;
 const connectorSweeps=[];
 for(const port of ports.values())for(const [index,mate] of port.mates.entries()){
  const owner=[...lines,...(inline?.physicalLines||[])].find(line=>line.from===port.exits[index]||line.to===port.exits[index]);if(!owner)continue;
  const box=new T.Box3().setFromObject(mate.male),n=normal(port.exits[index]),d=n.map(x=>x*port.matingTravel),min=box.min.toArray().map((x,k)=>Math.min(x,x+d[k])),max=box.max.toArray().map((x,k)=>Math.max(x,x+d[k]));
  connectorSweeps.push({id:owner.id+':'+port.port.id+':backshell-service-sweep',lineId:owner.id,type:'box',min,max,bounds:{min,max}});
 }
 // These reserved volumes keep unrelated cables out of each backshell's
 // complete withdrawal stroke. Only its own cable may share that volume;
 // the actual moving cable and plug are still checked together in motion CI.
 // A mounted U run turns at its allocated lane. Reserve its actual straight
 // lead through the complete withdrawal stroke, not the generic 2.4R ray
 // beyond that turn. The full curved service sweep is still independently
 // constructed and added after the route passes the ordinary clearance checks.
 function terminalApproachEnd(line,end,a,n,escape){
  const lane=layout.familyId==='redwire-platform'&&redwirePanelLane(line.r.spec,architecture);
  if(lane){const point=localPoints([a],factory.payloadRack)[0];point[0]=lane.x-lane.side*line.bendRadiusM+lane.side*Math.max(line.r.from.matingTravel,line.r.to.matingTravel);return transformed([point],factory.payloadRack)[0];}
  return escape&&layout.familyId!=='redwire-platform'?escape.points[1]:a.map((x,i)=>x+n[i]*(line.bendRadiusM*2.4+.015));
 }
 const terminalVolumes=[...connectorSweeps,...lines.flatMap(line=>['from','to'].flatMap(end=>{const a=world(line[end]),n=normal(line[end]),escape=line[end+'Escape'],b=terminalApproachEnd(line,end,a,n,escape),r=line.radiusM+.002,volume=(a,b,suffix)=>({id:line.id+':'+end+':'+suffix,lineId:line.id,type:'capsule',a,b,radiusM:r,bounds:{min:[0,1,2].map(i=>Math.min(a[i],b[i])-r),max:[0,1,2].map(i=>Math.max(a[i],b[i])+r)}}),portal=line[end+'Portal'];return [volume(a,b,'approach'),...(portal&&!line[end+'Escape']?.includesPortal?[volume(portal.inner,portal.outer,'feedthrough')]:[])];}))];
 for(const line of lines)for(const escape of [line.fromEscape,line.toEscape].filter(Boolean))for(let i=1;i<escape.points.length;i++){const a=escape.points[i-1],b=escape.points[i],r=line.radiusM+.002;terminalVolumes.push({id:line.id+':'+escape.end+':fanout:'+i,lineId:line.id,type:'capsule',a,b,radiusM:r,bounds:{min:[0,1,2].map(k=>Math.min(a[k],b[k])-r),max:[0,1,2].map(k=>Math.max(a[k],b[k])+r)}});}
 for(const line of layout.familyId==='redwire-platform'?[]:lines)for(const escape of [line.fromEscape,line.toEscape].filter(Boolean)){const a=escape.points.at(-1),b=a.map((v,k)=>v+escape.normal[k]*(line.bendRadiusM*2.4+.015)),r=line.radiusM+.002;terminalVolumes.push({id:line.id+':'+escape.end+':fanout-entry',lineId:line.id,type:'capsule',a,b,radiusM:r,bounds:{min:[0,1,2].map(k=>Math.min(a[k],b[k])-r),max:[0,1,2].map(k=>Math.max(a[k],b[k])+r)}});}
 if(inline)terminalVolumes.push(...inline.endpointVolumes(),...inline.connectorSweeps());
 payloadComb.installedValidation=inspectPcduPayloadComb(payloadComb,allObstacles,terminalVolumes);accommodationIssues.push(...payloadComb.installedValidation.issues);root.userData.pcduPayloadComb=payloadComb;
 const collectorAccommodation=inspectFixedCollectorHardware({root,architecture,actualBoxes,physicalMeshes:physicalFlightMeshes(root),lines,obstacles:allObstacles,terminalVolumes,world,normal});
 accommodationIssues.push(...collectorAccommodation.issues);root.userData.fixedCollectorAccommodation=collectorAccommodation;
 for(const row of collectorAccommodation.rows){const allocation=architecture.collectorAccommodations.find(a=>a.boxId===row.boxId);allocation.installedHardware=row;allocation.ok=allocation.ok&&row.ok;allocation.issues.push(...row.issues);}
 const equipmentAccommodation=inspectInstalledEquipmentHardware({root,architecture,actualBoxes,physicalMeshes:physicalFlightMeshes(root),lines,obstacles:allObstacles,terminalVolumes,world,normal});
 accommodationIssues.push(...equipmentAccommodation.issues);root.userData.equipmentRoutingAccommodation=equipmentAccommodation;
 for(const row of equipmentAccommodation.rows)architecture.boxById[row.boxId].routingAccommodation.installedHardware=row;
 // All real connector banks and wall glands exist before either discipline
 // chooses a route. Give the fixed connector approaches and withdrawal
 // strokes priority, then route the electrical runs around accepted plumbing.
 // A final combined audit still checks every actual tube against every solid.
 // The complete accepted June allocation is admitted atomically from its
 // exact interfaces. Its real tubes and full service reservations precede
 // fluid and unrelated electrical planning; no new geometry is searched.
 const rackPowerTrays=prepareAcceptedJuneRackPowerTrays({configurationId:h.input?.referenceCenterId,familyId:layout.familyId,lines,world,normal,terminalVolumes});
 const originalTerminalVolumes=[...terminalVolumes],controlledTrayLines=[];
 if(rackPowerTrays.applicable&&!rackPowerTrays.ok)accommodationIssues.push(...rackPowerTrays.issues);
 if(rackPowerTrays.applicable&&rackPowerTrays.ok){
  const replaced=new Set(rackPowerTrays.replacedReservationIds);
  for(let i=terminalVolumes.length-1;i>=0;i--)if(replaced.has(terminalVolumes[i].id))terminalVolumes.splice(i,1);
  for(const line of lines){
   const record=rackPowerTrays.records.get(line.id);if(!record)continue;
   const allocation=record.allocation;
   line.controlledTray=true;line.serviceAllocation=allocation;
   line.staticControls=allocation.controls;line.staticPoints=allocation.baseline.points;
   line.initialFrom=world(line.from);line.initialTo=world(line.to);
   line.restLengthM=allocation.restLengthM;line.minimumStaticBendM=allocation.baseline.minimumBendRadiusM;line.lengthToleranceM=3e-5;
   plans.set(line.id,line);controlledTrayLines.push(line);
   planned.push({id:line.id,points:line.staticPoints,radiusM:line.radiusM});
  }
 }
 const servicePlanningObstacles=[...rackPowerTrays.reservations],fluidPlanningReservations=[...terminalVolumes,...operationalEnvelopes.obstacles,...solarEnvelopes.obstacles,...cardSweeps,...rackPowerTrays.reservations];
 allObstacles.push(...rackPowerTrays.reservations);
 function updateAcceptedTrayLines(){
  root.updateWorldMatrix(true,true);
  for(const line of controlledTrayLines){
   const allocation=line.serviceAllocation;
   const stroke=end=>Math.max(0,V(world(line[end])).sub(V(end==='from'?allocation.controls[0]:allocation.controls.at(-1))).dot(V(allocation[end+'Normal'])));
   const fromWithdrawalM=stroke('from'),toWithdrawalM=stroke('to');
   if(line.lastWithdrawal?.[0]===fromWithdrawalM&&line.lastWithdrawal?.[1]===toWithdrawalM)continue;
   const shape=sampleMatingReservoir(allocation,{fromWithdrawalM,toWithdrawalM});
   line.tube.update(shape.points,{sampled:true,minimumBendRadiusM:shape.minimumBendRadiusM});
   line.lastWithdrawal=[fromWithdrawalM,toWithdrawalM];
  }
 }
 updateAcceptedTrayLines();root.userData.rackPowerTrayInstallation=rackPowerTrays;
 electricalRoutingDiagnostics.onTrayInstallation?.({factory,h,architecture,layout,lines,world,normal,routes,ports,actualBoxes,rackPowerTrays,controlledTrayLines,plans,planned,allObstacles,originalTerminalVolumes,terminalVolumes,servicePlanningObstacles,fluidPlanningReservations,updateAcceptedTrayLines,boundary:'Controlled tubes and service reservations installed before fluid replanning and unrelated electrical route search'});
 if(planFluidRoutes)factory.replanFluidConnections?.({reservedObstacles:fluidPlanningReservations});
 fluidReservations.push(...(factory.fluidRoutingSnapshot?.().routes||[]));planned.push(...fluidReservations);
 if(inline){planned.push(...inline.plan({obstacles:allObstacles,otherRoutes:fluidReservations,terminalVolumes}));const volumes=inline.serviceSweepVolumes||[];terminalVolumes.push(...volumes);fluidPlanningReservations.push(...volumes);servicePlanningObstacles.push(...volumes);}
 function plan(line,a,b,na,nb,waypoints=[],extra={}){
  const reserved=[...allObstacles,...terminalVolumes.filter(o=>o.lineId!==line.id)],escapes=[line.fromEscape,line.toEscape].filter(Boolean),escape=escapes.find(e=>V(a).distanceTo(V(e.anchor))<1e-6),suffix=escapes.find(e=>V(b).distanceTo(V(e.anchor))<1e-6);
  const candidateControls=starmindCollectorStaticHint(h,layout,line,a,b,na,nb,waypoints);
  const result=planElectricalRoute(escape?escape.points.at(-1):a,suffix?suffix.points.at(-1):b,{id:line.id,fromNormal:escape?escape.normal:na,toNormal:suffix?suffix.normal:nb,radiusM:line.radiusM,bendRadiusM:line.bendRadiusM,obstacles:reserved,otherRoutes:planned,waypoints,candidateControls,clearanceM:.002,maxAttempts:120,...extra});
  if(escape){const points=[...escape.points,...result.points.slice(1)],screen=routeClearance({id:line.id,points,radiusM:line.radiusM,clearanceM:.002},reserved,{otherRoutes:planned});result.points=points;result.controlPoints=[...escape.controlPoints,...result.controlPoints.slice(1)];result.lengthM=routeLength(points);result.minimumBendRadiusM=Math.min(result.minimumBendRadiusM,escape.minimumBendRadiusM);result.ok=result.ok&&screen.ok&&escape.minimumBendRadiusM+1e-7>=line.bendRadiusM;if(!screen.ok)result.screen=screen;}
  if(suffix){const points=[...result.points,...[...suffix.points].reverse().slice(1)],screen=routeClearance({id:line.id,points,radiusM:line.radiusM,clearanceM:.002},reserved,{otherRoutes:planned});result.points=points;result.controlPoints=[...result.controlPoints,...[...suffix.controlPoints].reverse().slice(1)];result.lengthM=routeLength(points);result.minimumBendRadiusM=Math.min(result.minimumBendRadiusM,suffix.minimumBendRadiusM);result.ok=result.ok&&screen.ok&&suffix.minimumBendRadiusM+1e-7>=line.bendRadiusM;if(!screen.ok)result.screen=screen;}
  if(!result.ok){line.planningIssues??=[];line.planningIssues.push({...result.screen,grid:result.gridFailure,reason:result.screen?.reason||'bend-or-clearance'});}return result;
 }
 function localPoints(points,frame){const inverse=frame.matrixWorld.clone().invert().multiply(root.matrixWorld);return points.map(p=>V(p).applyMatrix4(inverse).toArray());}
 function transformed(points,frame){const matrix=routingMatrix(frame,root);return points.map(p=>V(p).applyMatrix4(matrix).toArray());}
 function direction(vector,frame){return V(vector).transformDirection(routingMatrix(frame,root)).toArray();}
 function flexShape(line){const moving=transformed([line.movingClampLocal],line.movingFrame)[0];return line.planarFlex?planarHingeFlex(line.fixedClamp,moving,{...line.planarFlex,fromTangent:line.planarFlex.fixedTangent,toTangent:direction(line.planarFlex.movingTangentLocal,line.movingFrame)}):roundedConnectionRoute(constantLengthHingeRoute(line.fixedClamp,moving,{outward:line.outward,restLengthM:line.flexLengthM,bendRadiusM:line.bendRadiusM}),line.bendRadiusM);}
 electricalRoutingDiagnostics.onPlanningContext?.({factory,h,architecture,layout,lines,allObstacles,terminalVolumes,planned,plan,world,normal,actualBoxes,collectorAccommodation,equipmentAccommodation,payloadComb});
 const occupied=planned;
 for(const line of lines){
  if(line.controlledTray)continue;
  electricalRoutingDiagnostics.onBeforeRoute?.({id:line.id});
  const {r}=line,a=world(line.from),b=world(line.to),na=normal(line.from),nb=normal(line.to),movingEnd=electricalBoxMoves(boxById[r.spec.fromBoxId])?'from':electricalBoxMoves(boxById[r.spec.toBoxId])?'to':null;
  if(layout.familyId==='redwire-platform'&&boxById[r.spec.fromBoxId]?.frame==='payload'&&boxById[r.spec.toBoxId]?.frame==='payload'){
   line.rigidFrame=factory.payloadRack;
   const local=localPoints([a,b],line.rigidFrame),controlsLocal=redwirePanelRouteControls(r.spec,architecture,local[0],local[1]);
   if(!controlsLocal)throw new Error(line.id+': missing mounted payload route allocation');
   const controls=transformed(controlsLocal,line.rigidFrame),shape=roundedConnectionRoute(controls,line.bendRadiusM),reserved=[...allObstacles,...terminalVolumes.filter(o=>o.lineId!==line.id)],screen=routeClearance({id:line.id,points:shape.points,radiusM:line.radiusM,clearanceM:.002},reserved,{otherRoutes:planned}),ends=auditRoutes([{id:line.id,points:shape.points,radiusM:line.radiusM,from:{position:a,normal:na},to:{position:b,normal:nb}}],[],{maxIssues:8});
   // This is an installed tray construction, not a search seed for a route
   // allowed to escape into free space. All ordinary geometric predicates
   // still apply to the actual full-radius cable and complete neighboring solids.
   if(shape.bendLimited||!screen.ok||!ends.ok)line.planningIssues=[{reason:'mounted-payload-tray-clearance-or-bend',bendLimited:shape.bendLimited,screen,issues:ends.issues}];
   line.staticPoints=shape.points;line.staticControls=controls;line.initialFrom=a;line.initialTo=b;line.restLengthM=shape.lengthM;line.minimumStaticBendM=shape.minimumBendRadiusM;
   line.rigidPoints=localPoints(shape.points,line.rigidFrame);line.rigidControls=controlsLocal;
  }else if(movingEnd){
   const reverse=movingEnd==='from',movingBox=boxById[r.spec[movingEnd+'BoxId']],frame=actualBoxes.get(movingBox.id).frame,portal=line[movingEnd+'Portal'],index=portal.lane;
   const bodyAnchor=reverse?line.to:line.from,movingAnchor=reverse?line.from:line.to;
   let fixed,moving,outward,fixedArrival,movingDeparture,afterPrefix=null;
   if(movingBox.frame==='payload'){
    const station=-.55+index*.045,allocation=redwireHingeFlexAllocation(layout,{stationM:station,bendRadiusM:line.bendRadiusM}),payloadFrame=factory.payloadRack;
    line.planarFlex=allocation;line.movingFrame=payloadFrame;fixed=allocation.fixedClamp;moving=transformed([allocation.movingClampLocal],payloadFrame)[0];outward=allocation.fixedTangent;fixedArrival=outward.map(x=>-x);movingDeparture=direction(allocation.movingTangentLocal,payloadFrame);
    const R=line.bendRadiusM,local=Array.from({length:49},(_,k)=>{const angle=k*Math.PI/96;return allocation.movingClampLocal.map((v,i)=>v+(i===1?-R*Math.sin(angle):i===2?R*(1-Math.cos(angle)):0));});afterPrefix={local,points:transformed(local,payloadFrame),normal:direction([0,0,1],payloadFrame)};
   }else{
    const base=actualBoxes.get(movingBox.id).frame.parent,position=base.getWorldPosition(V()).toArray(),side=Math.sign(position[0])||1;
    fixed=[position[0]+side*.55,-.82,position[2]+.30+index*.050];moving=base.localToWorld(V([side*.55,.30+index*.050,.28])).toArray();outward=[side,0,0];line.movingFrame=base;
   }
   line.fixedClamp=fixed;line.movingClampLocal=localPoints([moving],line.movingFrame)[0];line.outward=outward;
   const before=plan(line,world(bodyAnchor),fixed,normal(bodyAnchor),fixedArrival||outward.map(x=>-x),line.planarFlex?[portal.inner]:[portal.inner,portal.outer]);
   const after=plan(line,afterPrefix?afterPrefix.points.at(-1):moving,world(movingAnchor),afterPrefix?afterPrefix.normal:movingDeparture||outward.map(x=>-x),normal(movingAnchor));
   line.afterPrefix=afterPrefix;
   if(afterPrefix){after.points=[...afterPrefix.points,...after.points.slice(1)];after.lengthM=routeLength(after.points);after.minimumBendRadiusM=Math.min(after.minimumBendRadiusM,line.bendRadiusM);}
   line.beforePlan=before;line.afterPlan=after;
   line.before=before.points;line.afterLocal=localPoints(after.points,line.movingFrame);line.reverse=reverse;
   line.flexLengthM=line.planarFlex?.restLengthM??Math.max(movingBox.frame==='solar-root'?2.8:2.4+index*.12,V(moving).distanceTo(V(fixed))+line.bendRadiusM*5.5);
   line.minimumStaticBendM=Math.min(before.minimumBendRadiusM,after.minimumBendRadiusM);line.restLengthM=routeLength(before.points)+line.flexLengthM+routeLength(after.points);
   line.supportAnchors=[{frame:root,point:fixed},{frame:line.movingFrame,point:line.movingClampLocal}];
  }else{
   const via=[];if(line.fromPortal&&!line.fromEscape?.includesPortal)via.push(line.fromPortal.outer,line.fromPortal.inner);if(line.toPortal&&!line.toEscape?.includesPortal)via.push(line.toPortal.inner,line.toPortal.outer);
   const result=plan(line,a,b,na,nb,via);line.staticPoints=result.points;line.initialFrom=a;line.initialTo=b;line.restLengthM=result.lengthM;line.minimumStaticBendM=result.minimumBendRadiusM;line.staticControls=result.controlPoints;
  }
  const shape=line.movingFrame?flexShape(line):null,occupied=line.movingFrame?[...line.before,...shape.points.slice(1),...transformed(line.afterLocal,line.movingFrame).slice(1)]:line.staticPoints;
  line.lengthToleranceM=(shape?.renderedLengthErrorM||0)+3e-5;
  if(!line.planningIssues)planned.push({id:line.id,points:occupied,radiusM:line.radiusM});
  plans.set(line.id,line);
  electricalRoutingDiagnostics.onRoute?.({id:line.id,passed:!line.planningIssues,issues:line.planningIssues||[]});
  if(!line.planningIssues&&!batchServiceAllocation)allocateLineService(line);
 }
 // Allocate protected and explicitly accommodated high-density tray layouts
 // before their reservoirs
 // so an early solar loop cannot consume a later equipment corridor. Every
 // service allocation retains all installed routes and the complete swept
 // volumes of earlier reservoirs. Other families retain incremental layout.
 // The independent motion certificate still proves every complete stroke.
 function servicePlan(line,controls,fromTravelM,toTravelM){const reserved=[...allObstacles,...terminalVolumes.filter(o=>o.lineId!==line.id)],neighbors=occupied.filter(r=>r.id!==line.id),at=(a,b)=>V(a).distanceTo(V(b))<1e-7,terminalNormal=(point,fallback)=>{for(const end of['from','to'])if(at(point,world(line[end])))return normal(line[end]);if(line.planarFlex&&line.fixedClamp&&at(point,line.fixedClamp))return line.planarFlex.fixedTangent.map(x=>-x);if(line.afterPrefix&&at(point,line.afterPrefix.points.at(-1)))return line.afterPrefix.normal;return fallback;},fromNormal=terminalNormal(controls[0],V(controls[1]).sub(V(controls[0])).normalize().toArray()),toNormal=terminalNormal(controls.at(-1),V(controls.at(-2)).sub(V(controls.at(-1))).normalize().toArray());electricalRoutingDiagnostics.onBeforeService?.({id:line.id,controls,fromTravelM,toTravelM,fromNormal,toNormal,radiusM:line.radiusM,bendRadiusM:line.bendRadiusM,obstacles:reserved,otherRoutes:neighbors});return allocateMatingReservoir(controls,{id:line.id,bendRadiusM:line.bendRadiusM,radiusM:line.radiusM,fromNormal,toNormal,fromTravelM,toTravelM,obstacles:reserved,otherRoutes:neighbors,...(line.rigidFrame?{allowNewLoop:false,allowEndpointExtension:false}:{})});}
 function localAllocation(allocation,frame){const matrix=frame.matrixWorld.clone().invert().multiply(root.matrixWorld);return {...allocation,controls:localPoints(allocation.controls,frame),axis:V(allocation.axis).transformDirection(matrix).toArray(),fromNormal:V(allocation.fromNormal).transformDirection(matrix).toArray(),toNormal:V(allocation.toNormal).transformDirection(matrix).toArray()};}
 function reserveServiceStroke(line,allocation,section){
  const swept=matingReservoirSweptObstacles(allocation,{id:line.id+':'+section,radiusM:line.radiusM,clearanceM:0});
  if(!swept.ok){line.servicePlanningIssues??=[];line.servicePlanningIssues.push({end:section,reason:'unverified-service-sweep',issues:swept.issues});return;}
  const solids=swept.obstacles.map(o=>({...o,lineId:line.id,ownerRouteId:line.id}));servicePlanningObstacles.push(...solids);allObstacles.push(...solids);fluidPlanningReservations.push(...solids);
 }
 function allocateLineService(line){
  if(line.controlledTray)return;
  const fail=(end,result)=>{line.servicePlanningIssues??=[];line.servicePlanningIssues.push({end,...result});};
  if(!line.movingFrame){
   const allocation=servicePlan(line,line.staticControls,line.r.from.matingTravel,line.r.to.matingTravel);
   if(allocation.ok){line.serviceAllocation=allocation;line.staticControls=allocation.controls;line.staticPoints=allocation.baseline.points;line.restLengthM=allocation.restLengthM;line.minimumStaticBendM=allocation.baseline.minimumBendRadiusM;reserveServiceStroke(line,allocation,'service');if(line.rigidFrame){line.rigidService=localAllocation(allocation,line.rigidFrame);line.rigidPoints=localPoints(allocation.baseline.points,line.rigidFrame);}}else fail('both',allocation);
  }else{
   const bodyPort=line.reverse?line.r.to:line.r.from,movingPort=line.reverse?line.r.from:line.r.to,before=servicePlan(line,line.beforePlan.controlPoints,bodyPort.matingTravel,0),after=servicePlan(line,line.afterPlan.controlPoints,0,movingPort.matingTravel);
   if(before.ok){line.beforeService=before;line.before=before.baseline.points;}else fail('body',before);
   if(after.ok){line.afterService=localAllocation(after,line.movingFrame);line.afterPrefixLocal=line.afterPrefix?localPoints(line.afterPrefix.points,line.movingFrame):[];line.afterLocal=[...line.afterPrefixLocal.slice(0,-1),...localPoints(after.baseline.points,line.movingFrame)];}else fail('moving',after);
   line.restLengthM=routeLength(line.before)+line.flexLengthM+routeLength(line.afterLocal);line.minimumStaticBendM=Math.min(before.ok?before.baseline.minimumBendRadiusM:line.beforePlan.minimumBendRadiusM,after.ok?after.baseline.minimumBendRadiusM:line.afterPlan.minimumBendRadiusM);
   if(before.ok)reserveServiceStroke(line,before,'body-service');if(after.ok)reserveServiceStroke(line,after,'moving-service');
  }
  occupied.find(r=>r.id===line.id).points=line.movingFrame?[...line.before,...flexShape(line).points.slice(1),...transformed(line.afterLocal,line.movingFrame).slice(1)]:line.staticPoints;
  electricalRoutingDiagnostics.onServiceRoute?.({id:line.id,passed:!line.servicePlanningIssues,issues:line.servicePlanningIssues||[]});
 }
 if(batchServiceAllocation)for(const line of lines)if(!line.planningIssues)allocateLineService(line);
 reconcileInstalledElectricalRouting(architecture,[...lines.map(line=>({id:line.id,harnessId:line.r.spec.id,lengthM:line.restLengthM,minimumBendRadiusM:line.minimumStaticBendM,planningPassed:line.controlledTray?null:!line.planningIssues&&!line.servicePlanningIssues,...(line.controlledTray?{installationBasis:'Controlled June tray allocation; current-source full-scene clearance remains unassessed',currentSourceClearanceAccepted:false}:{})})),...(inline?.reconciliationRecords()||[])]);
 const withdrawal=(point,allocation,end)=>Math.max(0,V(point).sub(V(end==='from'?allocation.controls[0]:allocation.controls.at(-1))).dot(V(allocation[end+'Normal'])));
 function update(){
  inline?.update();updateAcceptedTrayLines();
  root.updateMatrixWorld(true);for(const line of lines){const {tube,r}=line;let points,minimum;
   if(line.controlledTray)continue;
   if(line.rigidFrame){
    if(line.rigidService){const endpoints=localPoints([world(line.from),world(line.to)],line.rigidFrame),shape=sampleMatingReservoir(line.rigidService,{fromWithdrawalM:withdrawal(endpoints[0],line.rigidService,'from'),toWithdrawalM:withdrawal(endpoints[1],line.rigidService,'to')});points=transformed(shape.points,line.rigidFrame);minimum=shape.minimumBendRadiusM;}else{points=transformed(line.rigidPoints,line.rigidFrame);minimum=line.minimumStaticBendM;}
   }else if(line.movingFrame){const flex=flexShape(line);if(line.beforeService)line.before=sampleMatingReservoir(line.beforeService,{fromWithdrawalM:withdrawal(world(line.reverse?line.to:line.from),line.beforeService,'from')}).points;if(line.afterService){const endpoint=localPoints([world(line.reverse?line.from:line.to)],line.movingFrame)[0],after=sampleMatingReservoir(line.afterService,{toWithdrawalM:withdrawal(endpoint,line.afterService,'to')});line.afterLocal=[...line.afterPrefixLocal.slice(0,-1),...after.points];}const after=transformed(line.afterLocal,line.movingFrame);if(flex.ok===false)throw new Error(line.id+': '+flex.reason);points=[...line.before,...flex.points.slice(1),...after.slice(1)];minimum=Math.min(line.minimumStaticBendM,flex.minimumBendRadiusM);line.currentFlex=flex;line.lengthToleranceM=(flex.renderedLengthErrorM||0)+3e-5;if(line.reverse)points.reverse();}
   else {if(line.serviceAllocation){const fromWithdrawalM=withdrawal(world(line.from),line.serviceAllocation,'from'),toWithdrawalM=withdrawal(world(line.to),line.serviceAllocation,'to');if(line.lastWithdrawal?.[0]===fromWithdrawalM&&line.lastWithdrawal?.[1]===toWithdrawalM)continue;line.lastWithdrawal=[fromWithdrawalM,toWithdrawalM];const shape=sampleMatingReservoir(line.serviceAllocation,{fromWithdrawalM,toWithdrawalM});points=shape.points;minimum=shape.minimumBendRadiusM;}else{points=line.staticPoints.map(p=>[...p]);points[0]=world(line.from);points[points.length-1]=world(line.to);minimum=line.minimumStaticBendM;}}
   // The persistent scene may be translated/rotated by the view. The plan's
   // body-space metres are independent of that camera placement.
   tube.update(points,{sampled:true,minimumBendRadiusM:minimum});
  }
 }
 function snapshot({frame=null}={}){root.updateWorldMatrix(true,true);const matrix=routingMatrix(root,frame),point=p=>V(p).applyMatrix4(matrix),axis=d=>V(d).transformDirection(matrix);return {routes:[...lines.map(line=>{
  const route=routeFromTube(line.tube,{id:line.id,frame,from:line.from,to:line.to,minBendRadiusM:line.bendRadiusM,restLengthM:line.restLengthM,lengthToleranceM:line.lengthToleranceM,maximumLengthM:line.restLengthM+3e-5}),total=routeLength(route.points);
  if(line.rigidFrame){const model=routingMotionFor(line.rigidFrame),motionFrame=root.getObjectByProperty('uuid',model.frameId)||line.rigidFrame,origin=V().applyMatrix4(routingMatrix(motionFrame,frame)),radiusM=Math.max(...route.points.map(p=>V(p).distanceTo(origin)));route.motionSpans=[{id:line.id+':carried',startM:0,endM:total,...model,radiusM}];}
  else if(!line.movingFrame)route.motionSpans=[{id:line.id+':fixed',startM:0,endM:total,kind:'rigid',frameId:'body',attachment:'body'}];
  else{
   const before=routeLength(line.before),after=routeLength(line.afterLocal),flexLength=line.currentFlex?.lengthM||line.flexLengthM,afterPoints=transformed(line.afterLocal,line.movingFrame),model=routingMotionFor(line.movingFrame),motionFrame=root.getObjectByProperty('uuid',model.frameId)||line.movingFrame,origin=V().applyMatrix4(routingMatrix(motionFrame,root)),radiusM=Math.max(...afterPoints.map(p=>V(p).distanceTo(origin))),allocation=line.planarFlex;
   const flex=allocation?{kind:'planar-hinge',bankEnd:layout.banks[0].end,restLengthM:line.flexLengthM,bendRadiusM:line.bendRadiusM,normalOffsetM:allocation.normalOffsetM,spanOffsetM:allocation.spanOffsetM,leadM:allocation.leadM,arcSteps:allocation.arcSteps,planeAxis:axis([1,0,0]).toArray(),planeOffsetM:point(line.fixedClamp).dot(axis([1,0,0])),planeRangeToleranceM:2e-6}:{kind:'unverified-flex'};
   route.motionSpans=[{id:line.id+':fixed',startM:0,endM:before,kind:'rigid',frameId:'body',attachment:'body'},{id:line.id+':flex',startM:before,endM:before+flexLength,...flex},{id:line.id+':carried',startM:before+flexLength,endM:total,...model,radiusM}];
   // Overlapping convex windows cover local self-clearance through the
   // reservoir and both clamp transitions. Each has monotone tangent turn
   // at most pi for the complete declared 0..pi/2 hinge range. They carry
   // actual nominal vertices so the checker can reject a corrupted buffer.
   const shape=line.currentFlex;
   if(allocation&&shape?.cornerRanges){
    const points=[...line.before,...shape.points.slice(1),...afterPoints.slice(1)],prefix=[0];for(let i=1;i<points.length;i++)prefix.push(prefix.at(-1)+V(points[i]).distanceTo(V(points[i-1])));
    const rendered=line.reverse?[...route.points].reverse():route.points,renderedPrefix=[0];for(let i=1;i<rendered.length;i++)renderedPrefix.push(renderedPrefix.at(-1)+V(rendered[i]).distanceTo(V(rendered[i-1])));
    const boundary=index=>{const p=point(points[index]);let closest=Infinity,at=-1;for(let i=0;i<rendered.length;i++){const gap=V(rendered[i]).distanceTo(p);if(gap<closest){closest=gap;at=i;}}return closest<=1e-6?renderedPrefix[at]:prefix[index];};
    const offset=line.before.length-1,afterOffset=offset+shape.points.length-1,corners=shape.cornerRanges;
    let start=offset;while(start>0&&V(points[start]).sub(V(points[start-1])).normalize().dot(V(allocation.fixedTangent))>1-1e-10)start--;
    let end=afterOffset+(line.afterPrefixLocal?.length||line.afterPrefix?.points.length||1)-1;end=Math.min(end,points.length-1);const finalDirection=direction([0,0,1],line.movingFrame);while(end<points.length-1&&V(points[end+1]).sub(V(points[end])).normalize().dot(V(finalDirection))>1-1e-10)end++;
    const windows=[[start,offset+corners[2].entryIndex],[offset+corners[0].exitIndex,afterOffset],[offset+corners[1].exitIndex,end]];
    for(const [index,[lo,hi]] of windows.entries())route.motionSpans.push({id:line.id+':convex-'+index,proofOnly:true,startM:boundary(lo),endM:boundary(hi),...flex,nominalPoints:points.slice(lo,hi+1).map(p=>point(p).toArray()),convexSelfProof:{kind:index===2?'bounded-turn':'convex-planar',minimumBendRadiusM:line.bendRadiusM,maximumTurnRad:Math.PI,maximumChordDeviationM:shape.maximumSagittaM,maximumBufferDeviationM:1e-6,radiusLowerBoundA:line.radiusM-1e-9,radiusUpperBoundA:line.radiusM+7e-6,basis:'The allocated planar quarter-turn hinge uses two fixed 90-degree circular fillets and a third turn in [0,90 degrees]. The first two overlapping windows have at most 180 degrees of monotone tangent rotation; the third has at most 180 degrees of total absolute turn including its carried departure fillet. Radius stays above the declared bend allocation and straight tangent gaps remain nonnegative for every hinge angle. Window boundaries snap only to actual vertices within the stated one-micrometre nominal buffer envelope; the checker validates the complete nominal/actual correspondence.'}});
   }
   route.flexPlaneSection=null;
   if(allocation){
    // The reservoir's fixed arrival and carried departure retain the same
    // hinge-axis coordinate. Include their actual contiguous planar vertices
    // so an interval certificate need not treat two adjacent support stubs as
    // arbitrarily moving cables. The carried frame rotates only about X.
    const rendered=line.reverse?[...route.points].reverse():route.points,prefix=[0],axis=V(flex.planeAxis),offset=flex.planeOffsetM;
    for(let i=1;i<rendered.length;i++)prefix.push(prefix.at(-1)+V(rendered[i]).distanceTo(V(rendered[i-1])));
    const nearestArc=x=>prefix.reduce((best,v,i)=>Math.abs(v-x)<Math.abs(prefix[best]-x)?i:best,0),inPlane=p=>Math.abs(V(p).dot(axis)-offset)<=flex.planeRangeToleranceM;
    let lo=nearestArc(before),hi=nearestArc(before+flexLength);while(lo>0&&inPlane(rendered[lo-1]))lo--;while(hi<rendered.length-1&&inPlane(rendered[hi+1]))hi++;
    const startM=prefix[lo],endM=prefix[hi];route.motionSpans.push({id:line.id+':plane-window',proofOnly:true,startM,endM,...flex});
    route.flexPlaneSection={id:line.id+':plane-window',startLengthM:line.reverse?total-endM:startM,endLengthM:line.reverse?total-startM:endM,axis:flex.planeAxis,offsetM:offset,toleranceM:flex.planeRangeToleranceM,radiusUpperBoundM:line.radiusM+7e-6};
   }
   if(line.reverse)route.motionSpans=route.motionSpans.reverse().map(s=>({...s,startM:total-s.endM,endM:total-s.startM,...(s.nominalPoints?{nominalPoints:[...s.nominalPoints].reverse()}:{})}));
  }
  return route;
 }),...(inline?.snapshotRoutes({frame})||[])],obstacles:obstacles({frame})};}
 function audit(options={}){const s=snapshot();return auditRoutes(s.routes,s.obstacles,options);}
 return {update,snapshot,audit,lines:[...lines,...(inline?.physicalLines||[])],ordinaryLines:lines,inline,plans:new Map([...plans,...(inline?.plans||[])]),obstacles,banks,terminalReservations:terminalVolumes,fluidPlanningReservations,servicePlanningObstacles,accommodationIssues,collectorAccommodation,equipmentAccommodation,payloadComb,rackPowerTrays,redwireInstallation,get operationalEnvelopes(){return operationalEnvelopes;},revision:layout.familyId==='redwire-platform'?'installed-routing-redwire-mounted-rotary-r2':'installed-routing-r1'};
}
