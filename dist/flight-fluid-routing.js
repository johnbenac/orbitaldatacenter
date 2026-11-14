import * as T from './vendor/three.module.js';
import {perforatedPanelGeometry,constantLengthHingeRoute,routingHoleBounds as bounds} from './connection-installation-geometry.js';
export {perforatedPanelGeometry,constantLengthHingeRoute};
import {installedFluidLengthAccounting} from './fluid-route-length-accounting.js';
import {fluidFlexLengthEvidence} from './fluid-flex-length.js';
import {fluidInterfaceAllocationReport} from './fluid-interface-allocation.js';
import {connectionAnchor,anchorInFrame,normalInFrame} from './connection-geometry.js';
import {roundedConnectionRoute,routeLength} from './connection-routes.js';
import {tagMaterial} from './spacecraft-material-render.js';
import {planElectricalRoute} from './electrical-routing.js';
import {obstacleFromMesh,routeClearance,routeFromTube,auditRoutes,simplifyCollisionPolyline,routingMatrix} from './routing-audit.js';
import {routingContactBox} from './routing-frame.js';

const V=(p=[0,0,0])=>new T.Vector3(...p),axisIndex=a=>typeof a==='number'?a:({x:0,y:1,z:2})[a];
const panelAxes=axis=>axis===0?[2,1]:axis===1?[0,2]:[0,1];
// Open fitting bore aligned with the connector's local +Z axis. The hose
// terminates at z=0; its declared internal passage occupies z<0.
export function hollowFluidFitting(parent,{outerRadiusM=.025,boreRadiusM=.020,lengthM=.024,material,part='radiator',name='Open fluid fitting'}={}){
 const shape=new T.Shape();shape.absarc(0,0,outerRadiusM,0,Math.PI*2,false);const bore=new T.Path();bore.absarc(0,0,boreRadiusM,0,-Math.PI*2,true);shape.holes.push(bore);const geometry=new T.ExtrudeGeometry(shape,{depth:lengthM,bevelEnabled:false,steps:1,curveSegments:12});geometry.translate(0,0,-lengthM);const mesh=tagMaterial(new T.Mesh(geometry,material));mesh.name=name;mesh.userData={...mesh.userData,part,routingInterface:true,routingBoreRadiusM:boreRadiusM};parent.add(mesh);return mesh;
}
export function createRoutingWall(parent,{id,axis,sign=1,positionM,dimensionsM,material,part='structure',thermalTag=null}){
 const ai=axisIndex(axis),[u,v]=panelAxes(ai),thicknessM=dimensionsM[ai],widthM=dimensionsM[u],heightM=dimensionsM[v];
 const mesh=tagMaterial(new T.Mesh(perforatedPanelGeometry(widthM,heightM,thicknessM),material));mesh.name=id;mesh.position.set(...positionM);mesh.userData={...mesh.userData,part,routingSolid:true,routingWallId:id};
 // Local +Z is the physical body normal; local X/Y follow panelAxes.
 const x=V(),y=V(),z=V();x.setComponent(u,1);y.setComponent(v,1);z.crossVectors(x,y);mesh.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));parent.add(mesh);
 const descriptor={id,mesh,axis:ai,sign,positionM:[...positionM],widthM,heightM,thicknessM,holes:[],layers:[],thermalTag};mesh.userData.routingPanelId=id;return descriptor;
}
export function addRoutingWallLayer(wall,mesh){wall.layers.push(mesh);mesh.userData.routingPanelId=wall.id;return mesh;}
function rebuildPanel(wall){
 const targets=[wall.mesh,...wall.layers];for(const mesh of targets){const old=mesh.geometry,thin=mesh===wall.mesh?wall.thicknessM:mesh.userData.routingLayerThicknessM||0;mesh.geometry=perforatedPanelGeometry(wall.widthM,wall.heightM,thin,wall.holes);if(!old.userData.shared)old.dispose();}
}
// Cut a real aperture in every registered layer; the sleeve is an annulus,
// never the solid capped cylinder which previously filled the modeled bore.
export function routingFeedthroughFactory({root,walls,dimensionsM,material,sealMaterial=null,registry=[]}){
 return function addRoutingFeedthrough({id,axis,sign=1,positionM,radiusM=null,widthM=null,heightM=null,part='harness',straightM=.08,panelId=null}){
  const ai=axisIndex(axis),[u,v]=panelAxes(ai);if(ai==null||!positionM?.every(Number.isFinite))throw Error('Invalid routing feedthrough '+id);
  const normal=[0,0,0];normal[ai]=sign;const center=[...positionM];if(!panelId)center[ai]=sign*dimensionsM[ai]/2;
  const matching=walls.filter(w=>panelId?w.id===panelId:!w.internal&&w.axis===ai&&w.sign===sign);if(!matching.length)throw Error('No physical wall registered for '+id);
  root.updateWorldMatrix(true,true);const targets=[];for(const wall of matching){const local=wall.mesh.worldToLocal(root.localToWorld(V(center)));const hole={id,u:local.x,v:local.y,...(radiusM?{radiusM}:{widthM,heightM})},bb=bounds(hole);if(bb[2]<-wall.widthM/2||bb[0]>wall.widthM/2||bb[3]<-wall.heightM/2||bb[1]>wall.heightM/2)continue;wall.holes.push(hole);rebuildPanel(wall);targets.push(wall.mesh,...wall.layers);}
  if(!targets.length)throw Error('Feedthrough misses all physical panels: '+id);const wall=matching[0],half=Math.max(radiusM||widthM/2,radiusM||heightM/2),width=(radiusM?2*radiusM:widthM)+.018,height=(radiusM?2*radiusM:heightM)+.018;
  const port=connectionAnchor(root,center,normal,id+' bulkhead fitting');port.userData={part,routingFeedthroughId:id};
  // A rectangular mounting frame retains a circular or rectangular open bore.
  const localHole={id,u:0,v:0,...(radiusM?{radiusM}:{widthM,heightM})};
  const sleeve=tagMaterial(new T.Mesh(perforatedPanelGeometry(width,height,wall.thicknessM+.024,[localHole]),material));sleeve.name=id+' open feedthrough sleeve';sleeve.userData={...sleeve.userData,part,routingSolid:true,routingFeedthroughId:id};port.add(sleeve);
  const inner=connectionAnchor(root,center.map((x,i)=>x-normal[i]*(wall.thicknessM+.024+straightM)/2),normal.map(x=>-x),id+' inner connector');
  const outer=connectionAnchor(root,center.map((x,i)=>x+normal[i]*(.024+straightM)/2),normal,id+' outer connector');
  inner.userData={part,routingFeedthroughId:id,routingOwnerId:port.uuid};outer.userData={part,routingFeedthroughId:id,routingOwnerId:port.uuid};
  const boreIn=connectionAnchor(root,inner.position.toArray(),normal,id+' bore entry'),boreOut=connectionAnchor(root,outer.position.toArray(),normal.map(x=>-x),id+' bore exit');boreIn.userData={...inner.userData};boreOut.userData={...outer.userData};inner.userData.routingJunctionId=boreIn.userData.routingJunctionId=id+':inner';outer.userData.routingJunctionId=boreOut.userData.routingJunctionId=id+':outer';
  const result={id,center,normal,inner,outer,boreIn,boreOut,frame:port,meshes:[sleeve],wallMeshes:targets,radiusM,widthM,heightM,halfSizeM:half};registry.push(result);return result;
 };
}

export function routingMotionFor(object){for(let p=object;p;p=p.parent)if(p.userData?.routingMotion)return {...p.userData.routingMotion};return {kind:'unverified',frameId:null};}
// End positions move by da/db. The chord changes by at most da+db; its
// direction changes by at most 2(da+db)/minimumChord. Developed-length
// conservation changes the U lead by at most half the chord change. Circular
// corner offsets add at most two bend radii times the direction changes.
export function constantLengthHingeDisplacementBound({fromDisplacementM,toDisplacementM,axisRotationRad,restLengthM,bendRadiusM,minimumChordM}={}){
 const values=[fromDisplacementM,toDisplacementM,axisRotationRad,restLengthM,bendRadiusM,minimumChordM];if(values.some(x=>!Number.isFinite(x))||values.slice(0,3).some(x=>x<0)||restLengthM<=0||bendRadiusM<=0||minimumChordM<=0)return Infinity;
 const sum=fromDisplacementM+toDisplacementM,direction=Math.min(2,axisRotationRad),chordDirection=Math.min(2,2*sum/minimumChordM),leadMaximum=restLengthM/2+2*bendRadiusM;return Math.max(fromDisplacementM,toDisplacementM)+sum/2+leadMaximum*direction+2*bendRadiusM*(direction+chordDirection);
}
export function fluidMotionSpansForSegment(route,index=null){
 const spans=route.motionSpans;if(!Array.isArray(spans)||!spans.length)return [];
 if(index==null)return spans;const prefix=route.prefix||(()=>{const a=[0];for(let i=1;i<route.points.length;i++)a.push(a.at(-1)+Math.hypot(...route.points[i].map((x,k)=>x-route.points[i-1][k])));return a;})();
 const lo=prefix[index]-.001,hi=prefix[index+1]+.001;return spans.filter(s=>s.endM>=lo&&s.startM<=hi);
}
export function fluidRouteRecord(connection,{frame=null}={}){
 const {tube,a,b}=connection;const record=routeFromTube(tube,{id:connection.id||connection.name,frame,from:a,to:b,minBendRadiusM:connection.bendRadiusM>0?connection.bendRadiusM:connection.radiusM*4});
 if(connection.restLengthM){record.restLengthM=connection.restLengthM;record.lengthToleranceM=2e-5;record.flexLengthEvidence=fluidFlexLengthEvidence(connection);record.developedLengthM=record.flexLengthEvidence.developedLengthM;record.physicalCutLengthM=record.flexLengthEvidence.ok?record.flexLengthEvidence.physicalCutLengthM:null;}record.circuitId=connection.circuitId||connection.id||connection.name;record.fluidKind=connection.fluidKind||'external-fluid-line';record.junctions=[a.userData.routingJunctionId||a.uuid,b.userData.routingJunctionId||b.uuid];record.lengthM=routeLength(record.points);const model=connection.motionModel||(connection.restLengthM?{kind:'unverified-flex',frameId:null,fromFrameId:routingMotionFor(a).frameId,toFrameId:routingMotionFor(b).frameId}:routingMotionFor(connection.parent));record.motionSpans=[{...model,startM:0,endM:record.lengthM,sectionId:record.id,...(connection.restLengthM?{restLengthM:connection.restLengthM,bendRadiusM:connection.bendRadiusM,nominalPoints:tube.route.points.map(p=>V(p).applyMatrix4(routingMatrix(tube.mesh,frame)).toArray())}:{})}];return record;
}

// Register a pre-existing, axis-aligned box layer (e.g. a blanket tile) without
// changing its outer dimensions or material identity.
export function registerRoutingBox(mesh,axis,sign,id=mesh.name){
 const ai=axisIndex(axis),[u,v]=panelAxes(ai);mesh.geometry.computeBoundingBox();const dims=mesh.geometry.boundingBox.getSize(new T.Vector3()).multiply(mesh.scale).toArray(),center=mesh.geometry.boundingBox.getCenter(new T.Vector3()).multiply(mesh.scale);mesh.position.add(center);const old=mesh.geometry;mesh.geometry=perforatedPanelGeometry(dims[u],dims[v],dims[ai]);mesh.scale.set(1,1,1);const x=V(),y=V(),z=V();x.setComponent(u,1);y.setComponent(v,1);z.crossVectors(x,y);mesh.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));mesh.userData.routingSolid=true;mesh.userData.routingWallId=id;if(!old.userData.shared)old.dispose();return {id,mesh,axis:ai,sign,widthM:dims[u],heightM:dims[v],thicknessM:dims[ai],holes:[],layers:[]};
}

export function fluidPhysicalMeshes(root){
 const out=[];const flag=(o,k)=>{for(let p=o;p;p=p.parent)if(p.userData?.[k])return true;return false;};
 root.traverse(o=>{if(!o.isMesh||!o.geometry?.attributes?.position||o.userData.dynamicConnection||o.userData.routingNonPhysical||flag(o,'electricalOverview')||flag(o,'groundEquipment')||flag(o,'engineeringGraphic')||flag(o,'sceneFlow')||o.material?.userData?.physicalMaterial===false)return;out.push(o);});return out;
}

// Choose a nearby explicitly allocated panel station which does not intersect
// a structural frame or installed component. Only the pierced wall layers are
// cuttable; a primary beam is never silently treated as an aperture.
export function locateFluidFeedthrough(root,{axis=0,sign=1,positionM,dimensionsM,ignoreRoot=null,radiusM=.045}={}){
 root.updateWorldMatrix(true,true);const ai=axisIndex(axis),[u,v]=panelAxes(ai),inside=o=>{for(let p=o;p;p=p.parent)if(p===ignoreRoot)return true;return false;},cuttable=m=>{if(!m.userData.routingPanelId&&!m.userData.routingWallId)return false;const n=new T.Vector3(0,0,1).applyQuaternion(m.getWorldQuaternion(new T.Quaternion())),p=root.worldToLocal(m.getWorldPosition(new T.Vector3()));return Math.abs(n.getComponent(ai))>.999&&Math.abs(p.getComponent(ai)-sign*dimensionsM[ai]/2)<.10;},obstacles=fluidPhysicalMeshes(root).filter(m=>!inside(m)&&!cuttable(m)).map(m=>obstacleFromMesh(m,{id:m.uuid})),offsets=[0,-.12,.12,-.24,.24,-.36,.36];
 for(const du of offsets)for(const dv of offsets){const point=[...positionM];point[u]+=du;point[v]+=dv;if(Math.abs(point[u])>dimensionsM[u]*.42||Math.abs(point[v])>dimensionsM[v]*.42)continue;const a=[...point],b=[...point];a[ai]-=sign*.14;b[ai]+=sign*.14;if(routeClearance({id:'feedthrough-accommodation',points:[a,b],radiusM},obstacles).ok)return point;}
 throw new Error('No clear fluid feedthrough station near '+positionM.join(','));
}
export const fluidRoutingDiagnostics={onPlan:null,onPlanningContext:null,onBeforePlan:null};
export function planStaticFluidConnections(root,connections,{maxAttempts=160,onPlan=null,otherRoutes:reservedRoutes=[],reservedObstacles=[]}={}){
 root.updateWorldMatrix(true,true);const meshes=fluidPhysicalMeshes(root),base=meshes.map(mesh=>({mesh,obstacle:obstacleFromMesh(mesh,{id:mesh.uuid})})),rows=[];
 const ancestor=(mesh,id)=>{for(let p=mesh;p;p=p.parent)if(p.uuid===id)return true;return false;},pending=connections.filter(c=>!c.restLengthM&&(c.planRouting||c.part==='propulsion'||c.name.includes('supported internal pipe')||c.name.includes('fixed union feed'))),accepted=connections.filter(c=>!pending.includes(c));
 fluidRoutingDiagnostics.onPlanningContext?.({root,connections,pending,reservedObstacles,reservedRoutes});
 for(const c of pending){
  const localA=anchorInFrame(c.a,c.parent),localB=anchorInFrame(c.b,c.parent),a=c.a.getWorldPosition(new T.Vector3()).toArray(),b=c.b.getWorldPosition(new T.Vector3()).toArray(),worldNormal=anchor=>new T.Vector3(0,0,1).transformDirection(anchor.matrixWorld).toArray(),na=worldNormal(c.a),nb=worldNormal(c.b),actual=fluidRouteRecord(c),scale=c.parent.getWorldScale(new T.Vector3()),nonUniform=Math.max(scale.x,scale.y,scale.z)-Math.min(scale.x,scale.y,scale.z)>1e-8,limits=[c.a,c.b].map(anchor=>({owners:anchor.userData.routingOwnerIds||[anchor.userData.routingOwnerId||anchor.parent.uuid],point:anchor.getWorldPosition(new T.Vector3()).toArray()}));
  const obstacles=[...base.map(({mesh,obstacle})=>({...obstacle,apertures:limits.filter(p=>p.owners.some(id=>ancestor(mesh,id))).map((p,i)=>({id:c.id+':termination-'+i,routeIds:[c.id],min:p.point.map(x=>x-c.radiusM*2.2-.002),max:p.point.map(x=>x+c.radiusM*2.2+.002)}))})),...reservedObstacles];
  const junctions=[c.a,c.b].map(a=>a.userData.routingJunctionId||a.uuid),otherRoutes=accepted.filter(other=>!other.circuitId||other.circuitId!==c.circuitId||![other.a,other.b].some(a=>junctions.includes(a.userData.routingJunctionId||a.uuid))).map(other=>{const record=fluidRouteRecord(other);return {...record,points:simplifyCollisionPolyline(record.points),radiusM:record.radiusM+2e-6};});otherRoutes.push(...reservedRoutes.map(r=>({...r,points:simplifyCollisionPolyline(r.points),radiusM:r.radiusM+2e-6})));
  for(const other of pending.filter(other=>other!==c&&!accepted.includes(other)))for(const anchor of [other.a,other.b]){if(other.circuitId===c.circuitId&&junctions.includes(anchor.userData.routingJunctionId||anchor.uuid))continue;const p=anchor.getWorldPosition(new T.Vector3()),n=new T.Vector3(0,0,1).transformDirection(anchor.matrixWorld),lead=Math.max(other.bendRadiusM*1.12+.008,other.radiusM*3);otherRoutes.push({id:other.id+':reserved-fitting-lead:'+anchor.uuid,points:[p.toArray(),p.clone().addScaledVector(n,lead).toArray()],radiusM:other.radiusM+2e-6});}
  fluidRoutingDiagnostics.onBeforePlan?.({connection:c,obstacles,otherRoutes,a,b,na,nb});
  const initial=routeClearance({...actual,clearanceM:.001},obstacles,{otherRoutes}),manual=!nonUniform&&!c.tube.route.bendLimited&&initial.ok&&auditRoutes([actual],[],{maxIssues:1}).ok;
  const localControls=c.staticPlan||[localA,...(c.via?c.via(localA,localB):[]),localB],worldControls=localControls.map(p=>c.parent.localToWorld(p.isVector3?p.clone():V(p)).toArray()),plan=manual?{ok:true,points:actual.points,controlPoints:worldControls,minimumBendRadiusM:actual.minimumBendRadiusM,attempts:0,minimumClearanceM:initial.minimumClearanceM}:planElectricalRoute(a,b,{id:c.id,fromNormal:na,toNormal:nb,radiusM:actual.radiusM,bendRadiusM:c.bendRadiusM||c.radiusM*4,obstacles,otherRoutes,clearanceM:.001,maxAttempts});
  if(plan.ok){c.staticPlan=plan.controlPoints.map(p=>c.parent.worldToLocal(V(p)).toArray());c.staticSampledPoints=plan.points.map(p=>c.parent.worldToLocal(V(p)).toArray());c.staticBendRadiusM=plan.minimumBendRadiusM;c.tube.update(c.staticSampledPoints,{sampled:true,minimumBendRadiusM:c.staticBendRadiusM});}accepted.push(c);c.routingPlan=plan;rows.push({id:c.id,ok:plan.ok,attempts:plan.attempts,issue:plan.screen?.obstacleId?(()=>{const m=base.find(x=>x.obstacle.id===plan.screen.obstacleId)?.mesh;return m?(m.name||m.userData.materialRole||m.geometry.type)+' @ '+m.getWorldPosition(new T.Vector3()).toArray().map(x=>x.toFixed(3)).join(','):plan.screen.obstacleId;})():plan.screen?.reason||null});onPlan?.(rows.at(-1));fluidRoutingDiagnostics.onPlan?.(rows.at(-1));
 }
 return rows;
}

// Join only known sections of one circuit at the same declared physical fitting.
// Other coincident or crossing lines remain separate and are audited normally.
export function joinedFluidRoutes(connections,{frame=null}={}){
 const records=connections.map(c=>fluidRouteRecord(c,{frame})),out=[],remaining=new Set(records);
 while(remaining.size){const first=remaining.values().next().value;remaining.delete(first);let route={...first,points:first.points.map(p=>[...p]),motionSpans:first.motionSpans.map(s=>({...s})),sectionIds:[first.id]},changed=true;
  while(changed){changed=false;for(const next of remaining){if(next.circuitId!==route.circuitId)continue;let side=-1,flip=false;if(route.junctions[1]===next.junctions[0])side=1;else if(route.junctions[1]===next.junctions[1]){side=1;flip=true;}else if(route.junctions[0]===next.junctions[1])side=0;else if(route.junctions[0]===next.junctions[0]){side=0;flip=true;}if(side<0)continue;
    const pts=flip?[...next.points].reverse():next.points,joins=flip?[...next.junctions].reverse():next.junctions,near=side?route.points.at(-1):route.points[0],at=side?pts[0]:pts.at(-1);if(Math.hypot(...near.map((x,i)=>x-at[i]))>2e-5)continue;
    const nextSpans=flip?next.motionSpans.map(s=>({...s,startM:next.lengthM-s.endM,endM:next.lengthM-s.startM,...(s.nominalPoints?{nominalPoints:[...s.nominalPoints].reverse()}:{} )})).reverse():next.motionSpans,oldLength=route.lengthM;if(side)route.motionSpans.push(...nextSpans.map(s=>({...s,startM:s.startM+oldLength,endM:s.endM+oldLength})));else route.motionSpans=[...nextSpans,...route.motionSpans.map(s=>({...s,startM:s.startM+next.lengthM,endM:s.endM+next.lengthM}))];
    if(side){route.points.push(...pts.slice(1));route.junctions[1]=joins[1];route.to=flip?next.from:next.to;}else{route.points=[...pts.slice(0,-1),...route.points];route.junctions[0]=joins[0];route.from=flip?next.to:next.from;}
    route.radiusM=Math.max(route.radiusM,next.radiusM);route.minimumBendRadiusM=Math.min(route.minimumBendRadiusM,next.minimumBendRadiusM);delete route.minBendRadiusM;route.renderedCenterlineMismatchM=Math.max(route.renderedCenterlineMismatchM||0,next.renderedCenterlineMismatchM||0);route.renderedEndpointMismatchM=Math.max(route.renderedEndpointMismatchM||0,next.renderedEndpointMismatchM||0);route.sectionIds.push(next.id);route.id=route.sectionIds.join(' + ');route.lengthM=routeLength(route.points);delete route.restLengthM;remaining.delete(next);changed=true;break;
  }}if(route.sectionIds.length>1)delete route.minBendRadiusM;out.push(route);
 }return out;
}

// Every installed cold plate has two actual fittings. Riser tees and supply /
// return headers occupy the allocated column aisles; their internal channels
// belong to the tee/manifold components, rather than intersecting tube meshes.
export function installColdPlateCollection({h,root,rack,pumps,link,kit,coldPlateTopFactor=.29}){
 const {box,cyl,join,v,material}=kit,[tw,th,td]=h.rackLayout.slotDimensionsM,slots=h.rackLayout.slots,columns=[...new Set(slots.map(s=>s.x))].sort((a,b)=>a-b),floor=-h.bodyHeightM*.32,parts=[],ports=[];
 function port(parent,point,normal,name,owner=parent){const a=connectionAnchor(parent,point,normal,name);a.userData.routingOwnerIds=[owner.uuid,a.uuid];hollowFluidFitting(a,{outerRadiusM:.012,boreRadiusM:.010,lengthM:.010,material,name:name+' open fitting'});ports.push(a);return a;}
 function tee(point,name){const g=join(rack,...point,'radiator');g.name=name;box(g,0,0,0,.030,.030,.030,material,'radiator');parts.push(g);return {root:g,left:port(g,[-.015,0,0],[-1,0,0],name+' side'),right:port(g,[.015,0,0],[1,0,0],name+' cold-plate branch'),bottom:port(g,[0,-.015,0],[0,-1,0],name+' lower'),top:port(g,[0,.015,0],[0,1,0],name+' upper'),front:port(g,[0,0,-.015],[0,0,-1],name+' forward'),back:port(g,[0,0,.015],[0,0,1],name+' aft')};}
 const platePorts=new Map();for(const slot of slots){const g=join(rack,0,0,0,'radiator'),q={};g.name='Cold-plate fittings · tray '+(slot.index+1);for(const side of [-1,1]){const y=slot.y+th*coldPlateTopFactor,z=slot.z+side*td*.28,x=slot.x-tw*.47;box(g,x-.024,y,z,.048,.020,.035,material,'radiator');q[side]=port(g,[x-.048,y,z],[-1,0,0],`Tray ${slot.index+1} coolant ${side<0?'supply':'return'}`,g);}platePorts.set(slot.index,q);parts.push(g);}
 for(const [columnIndex,x] of columns.entries()){
  const selected=slots.filter(s=>s.x===x),bays=[...new Set(selected.map(s=>s.z))].sort((a,b)=>a-b),pump=pumps[columnIndex%pumps.length];
  for(const side of [-1,1]){
   const headerX=x-tw/2-(side<0?.10:.16),circuitId='coldplates-'+columnIndex+'-'+side,bases=[];
   for(const [bayIndex,z] of bays.entries()){
    const rows=selected.filter(s=>s.z===z).sort((a,b)=>a.y-b.y),laneZ=z+side*td*.28,base=tee([headerX,floor,laneZ],`Column ${columnIndex+1} ${side<0?'supply':'return'} header tee ${bayIndex+1}`);bases.push(base);let prior=base.top;
    for(const slot of rows){const y=slot.y+th*coldPlateTopFactor,t=tee([headerX,y,laneZ],`Tray ${slot.index+1} ${side<0?'supply':'return'} riser tee`);link(prior,t.bottom,{part:'radiator',radius:.008,bendRadiusM:0,parent:rack,circuitId,name:`Tray ${slot.index+1} ${side<0?'supply':'return'} vertical riser`,via:()=>[]});link(t.right,platePorts.get(slot.index)[side],{part:'radiator',radius:.004,bendRadiusM:0,parent:rack,circuitId,name:`Tray ${slot.index+1} ${side<0?'supply':'return'} cold-plate fitting lead`,via:()=>[]});prior=t.top;}
    if(bases.length>1)link(bases.at(-2).back,base.front,{part:'radiator',radius:.008,bendRadiusM:0,parent:rack,circuitId,name:`Column ${columnIndex+1} ${side<0?'supply':'return'} header span ${bayIndex}`,via:()=>[]});
   }
   const toward=pump.root.position.x<0?1:-1,assigned=columns.filter((_,i)=>i%pumps.length===columnIndex%pumps.length).length,localIndex=Math.floor(columnIndex/pumps.length),portZ=side*.10+(localIndex-(assigned-1)/2)*.035,pumpPort=port(pump.root,[toward*.16,side*.045,portZ],[toward,0,0],`Column ${columnIndex+1} ${side<0?'cold supply':'warm return'} pump station connection`,pump.root),target=bases[0].front;
   link(pumpPort,target,{part:'radiator',radius:.008,bendRadiusM:.04,parent:root,circuitId,name:`Column ${columnIndex+1} ${side<0?'supply':'return'} supported internal pipe`,via:(a,b)=>{const lane=floor-.12-.03*columnIndex-(side<0?.04:0),lead=a.clone().add(v(toward*.16,0,0));return [lead,v(lead.x,lane,lead.z),v(b.x,lane,lead.z),v(b.x,lane,b.z-.12),v(b.x,b.y,b.z-.12)];}});
  }
 }
 return {coldPlateCount:slots.length,coldPlatePortCount:2*slots.length,columnCount:columns.length,parts,ports,platePorts,topology:'Pump station → column supply header → cold-plate internal passages → column return header → radiator distribution; radiator return → pump station',basis:'Project routing allocation; pipe pressure drop, balancing, coolant compatibility and supplier fitting qualification remain separate.'};
}

export function bindFluidJunctions(connections){
 // Only use this for the retained rigid circuit whose fitting locations were
 // already defined in its assembly. A circuit id prevents unrelated routes
 // at coincident coordinates from becoming an inferred connection.
 const locations=new Map();for(const c of connections){if(!c.circuitId)continue;for(const a of [c.a,c.b]){if(a.userData.routingJunctionId)continue;a.updateWorldMatrix(true,false);const p=a.getWorldPosition(new T.Vector3()),key=c.circuitId+':'+p.toArray().map(x=>x.toFixed(7)).join(',');if(!locations.has(key))locations.set(key,[]);locations.get(key).push(a);}}
 for(const [key,anchors] of locations)if(anchors.length>1)for(const a of anchors)a.userData.routingJunctionId=key;
}
export function fluidRoutingInventory(root,connections){
 const issues=[],ids=new Set(),meshes=new Set(),anchors=new Set(),objects=new Map(),belongs=o=>{for(let p=o;p;p=p.parent)if(p===root)return true;return false;};
 for(const c of connections){if(!c.id||ids.has(c.id))issues.push({code:'fluid-route-identity',routeId:c.id});ids.add(c.id);if(!c.tube?.mesh||!belongs(c.tube.mesh))issues.push({code:'missing-rendered-fluid-line',routeId:c.id});else meshes.add(c.tube.mesh.uuid);for(const [end,a]of [['from',c.a],['to',c.b]]){if(!a||!belongs(a))issues.push({code:'missing-fluid-connector',routeId:c.id,end});else anchors.add(a.uuid);}}
 for(const c of connections)if(c.restLengthM)issues.push(...fluidFlexLengthEvidence(c).issues);
 root.traverse(o=>{objects.set(o.uuid,o);if(!o.isMesh)return;let ground=false;for(let p=o;p;p=p.parent)if(p.userData.groundEquipment||p.userData.electricalOverview||p.userData.engineeringGraphic)ground=true;if(ground)return;if(o.userData.staticFluidLine)issues.push({code:'unregistered-rigid-fluid-line',meshId:o.uuid,role:o.userData.staticFluidLine.role});if(o.userData.fluidConnectionId&&!meshes.has(o.uuid))issues.push({code:'unregistered-rendered-fluid-line',routeId:o.userData.fluidConnectionId,meshId:o.uuid});});
 for(const channel of root.userData.fluidComponentChannels||[])for(const portId of channel.portIds||[])if(!anchors.has(portId))issues.push({code:'unconnected-fluid-component-port',componentId:channel.componentId,portId,name:channel.name});
 for(const channel of root.userData.fluidComponentChannels||[]){const d=channel.jointDatums;if(!d){if(channel.interfaceType==='rotary-coolant'&&Number.isInteger(channel.hingeIndex)&&channel.hingeIndex>0)issues.push({code:'fluid-rotary-datum-declaration',componentId:channel.componentId});continue;}const fixed=objects.get(d.fixedId),moving=objects.get(d.movingId);if(!fixed||!moving||!Array.isArray(d.axis)||d.axis.length!==3||!d.axis.every(Number.isFinite)||!(Math.hypot(...d.axis)>0)||!(d.positionToleranceM>0&&d.positionToleranceM<=2e-5)||!(d.axisToleranceRad>0&&d.axisToleranceRad<=1e-5)){issues.push({code:'fluid-rotary-datum-declaration',componentId:channel.componentId});continue;}fixed.updateWorldMatrix(true,false);moving.updateWorldMatrix(true,false);const distanceM=fixed.getWorldPosition(new T.Vector3()).distanceTo(moving.getWorldPosition(new T.Vector3())),a=V(d.axis).transformDirection(fixed.matrixWorld),b=V(d.axis).transformDirection(moving.matrixWorld),angleRad=Math.acos(Math.min(1,Math.max(-1,a.dot(b))));if(!Number.isFinite(distanceM)||!Number.isFinite(angleRad)||distanceM>d.positionToleranceM||angleRad>d.axisToleranceRad)issues.push({code:'fluid-rotary-datum-discontinuity',componentId:channel.componentId,name:channel.name,distanceM,angleRad,positionToleranceM:d.positionToleranceM,axisToleranceRad:d.axisToleranceRad});}
 return {ok:issues.length===0,issues,registeredSections:connections.length,renderedMeshes:meshes.size,connectorAnchors:anchors.size};
}
export function flightFluidSnapshot(root,connections,{inventoryConnections=connections,frame=null}={}){
 root.updateWorldMatrix(true,true);const sections=connections.map(c=>fluidRouteRecord(c,{frame})),routes=joinedFluidRoutes(connections,{frame}),routeOf=new Map(routes.flatMap(r=>r.sectionIds.map(id=>[id,r.id]))),meshes=fluidPhysicalMeshes(root),ancestor=(mesh,id)=>{for(let p=mesh;p;p=p.parent)if(p.uuid===id)return true;return false;};
 const terminals=connections.flatMap(c=>[c.a,c.b].map((a,i)=>({id:c.id+':port-'+i,routeId:routeOf.get(c.id),owners:a.userData.routingOwnerIds||[a.userData.routingOwnerId||a.parent.uuid],anchor:a,radius:c.radiusM*2.2+.002})));
 const obstacles=meshes.map(mesh=>({...obstacleFromMesh(mesh,{id:mesh.uuid,frame,apertures:terminals.filter(t=>t.owners.some(id=>ancestor(mesh,id))).map(t=>routingContactBox(t.anchor,{id:t.id,routeIds:[t.routeId],halfSizeM:t.radius},frame))}),motionModel:routingMotionFor(mesh)}));
 const inventory=fluidRoutingInventory(root,inventoryConnections),sectionAudit=auditRoutes(sections,[],{interlineCollision:false,selfCollision:false,maxIssues:60}),sectionValidation={...sectionAudit,ok:sectionAudit.ok&&inventory.ok,issueCount:sectionAudit.issueCount+inventory.issues.length,issues:[...inventory.issues,...sectionAudit.issues]};
 return {routes,sections,obstacles,meshes,inventory,sectionValidation,interfaceAllocation:fluidInterfaceAllocationReport(root),installedLengthAccounting:installedFluidLengthAccounting(connections,root.userData.fluidThermalModel,{sections}),counts:{tubeSections:sections.length,continuousRoutes:routes.length,obstacles:obstacles.length},coverage:'Actual rendered flight-fluid tube buffers, installed fittings, all physical scene solids; electrical/fluid cross-circuit checks require the shared combined registry.'};
}
export function auditFlightFluidSnapshot(snapshot,options={}){
 const collision=auditRoutes(snapshot.routes,snapshot.obstacles,options),section=snapshot.sectionValidation;return {...collision,ok:collision.ok&&section.ok,issueCount:collision.issueCount+section.issueCount,issues:[...section.issues,...collision.issues].slice(0,options.maxIssues||100),sectionCounts:section.counts,sectionIssueCount:section.issueCount};
}
