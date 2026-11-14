// Ground service chains and flight separation leads share the interface record
// and the mission clock. All meshes are allocated once; seeking only changes
// cached transforms. Recognition geometry is not a provider connector drawing.
import * as T from './vendor/three.module.js';
import {launchUmbilicalState} from './launch-umbilicals.js';
import {connectionTube,connectionAnchor,anchorInFrame,normalInFrame} from './connection-geometry.js';
import {constantLengthHingeRoute,perforatedPanelGeometry} from './connection-installation-geometry.js';
import {planElectricalRoute} from './electrical-routing.js';
import {routeFromTube,obstacleFromMesh,auditRoutes,routeClearance,segmentSegmentDistance,routingMatrix} from './routing-audit.js';
import {routingContactBox} from './routing-frame.js';
import {roundedConnectionRoute,routeLength} from './connection-routes.js';
import {LOCAL_PAD_FLAT_RADIUS_M,LOCAL_PAD_MESH_STEP_M} from './launch-environment.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Y=V(0,1,0);
const clamp=x=>Math.max(0,Math.min(1,x));
const COLORS={lox:'#88cce4',methane:'#dfbc82',hydrogen:'#bcafe5',rp1:'#c99a6a',power:'#e7c16c',data:'#91cabc','conditioned-air':'#a9d2db',nitrogen:'#b3c3c6',helium:'#a9c89f',grounding:'#b9c79c','unknown-fuel':'#a0a5a4','unknown-oxidizer':'#9baeb1'};
const mediumColor=id=>COLORS[id]||'#b3bdc0';
const isGas=id=>['nitrogen','helium','conditioned-air'].includes(id);
const isWire=id=>['power','data','grounding'].includes(id);

// Independent length evidence: canonical fillets are regenerated from the
// retained controls, then matched to the tube recipe whose every rendered ring
// is checked by routeFromTube. A wide polygon-vs-arc tolerance alone could hide
// a physical cut-length change, so developed length has its own strict check.
export function launchConnectionLengthEvidence(tail,fixedActual,flexActual){
 const id=tail.connection.id,issues=[],R=tail.bendRadiusM,issue=(code,values={})=>issues.push({code,routeId:id,...values}),fixed=roundedConnectionRoute(tail.routingPlan.controlPoints,R),flex=roundedConnectionRoute(tail.flexControls,R),physicalRestLengthM=tail.fixedDevelopedLengthM+tail.restLengthM,developedLengthM=fixed.developedLengthM+flex.developedLengthM;
 const finite=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite),mismatch=(a,b)=>!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length?Infinity:Math.max(0,...a.map((p,i)=>finite(p)&&finite(b[i])?Math.hypot(...p.map((x,k)=>x-b[i][k])):Infinity));
 const recipeMismatchM=Math.max(mismatch(fixed.points,tail.fixedTube.route.points),mismatch(flex.points,tail.flexTube.route.points));
 if(!(recipeMismatchM<=1e-9))issue('launch-length-recipe-mismatch',{gapM:recipeMismatchM});
 if(fixed.bendLimited||flex.bendLimited)issue('launch-length-clipped-fillet');
 const pointMagnitude=Math.max(1,...[...tail.routingPlan.controlPoints,...tail.flexControls].flat().map(Math.abs)),numericalM=256*Number.EPSILON*Math.max(1,physicalRestLengthM,pointMagnitude),maximumPhysicalErrorM=2*tail.restLengthM/2**28+numericalM,physicalErrorM=Math.abs(developedLengthM-physicalRestLengthM);
 if(!(Number.isFinite(physicalRestLengthM)&&physicalRestLengthM>0&&physicalErrorM<=maximumPhysicalErrorM))issue('launch-physical-cut-length',{actualM:developedLengthM,requiredM:physicalRestLengthM,errorM:physicalErrorM,maximumErrorM:maximumPhysicalErrorM});
 const controls=[];for(const p of tail.routingPlan.controlPoints)if(!controls.length||Math.hypot(...p.map((x,k)=>x-controls.at(-1)[k]))>1e-8)controls.push(p);let fixedTurn=0;
 for(let i=1;i<controls.length-1;i++){const a=controls[i].map((x,k)=>x-controls[i-1][k]),b=controls[i+1].map((x,k)=>x-controls[i][k]),cosine=a.reduce((n,x,k)=>n+x*b[k],0)/(Math.hypot(...a)*Math.hypot(...b));fixedTurn+=Math.acos(Math.max(-1,Math.min(1,cosine)));}
 // Default fillets use ceil(8*theta/(pi/2)) chords, so every angular chord
 // is <= pi/16. The U's total circular turn is pi throughout its motion.
 const halfStep=Math.PI/32,maximumChordDeficitM=R*(fixedTurn+Math.PI)*(1-Math.sin(halfStep)/halfStep)+numericalM,chordDeficitM=developedLengthM-fixed.lengthM-flex.lengthM;
 if(!(chordDeficitM>=-numericalM&&chordDeficitM<=maximumChordDeficitM+numericalM))issue('launch-unbounded-chord-deficit',{actualM:chordDeficitM,maximumM:maximumChordDeficitM});
 const renderedLengthM=routeLength(fixedActual.points)+routeLength(flexActual.points),expectedRenderedLengthM=fixed.lengthM+flex.lengthM,renderedRoundingBoundM=2*(fixedActual.points.length-1)*fixedActual.renderedCenterlineMismatchM+2*(flexActual.points.length-1)*flexActual.renderedCenterlineMismatchM+numericalM,renderedErrorM=Math.abs(renderedLengthM-expectedRenderedLengthM);
 if(!(Number.isFinite(renderedRoundingBoundM)&&renderedErrorM<=renderedRoundingBoundM))issue('launch-rendered-cut-length',{actualM:renderedLengthM,expectedM:expectedRenderedLengthM,errorM:renderedErrorM,roundingBoundM:renderedRoundingBoundM});
 return {ok:!issues.length,issues,physicalRestLengthM,developedLengthM,physicalErrorM,maximumPhysicalErrorM,renderedLengthM,expectedRenderedLengthM,renderedErrorM,renderedRoundingBoundM,chordDeficitM,maximumChordDeficitM,lengthToleranceM:maximumChordDeficitM+renderedRoundingBoundM+maximumPhysicalErrorM};
}

export function buildLaunchUmbilicals({design,site,tower,parts,geometry,serviceFrame,serviceSources=new Map(),utilityRouting=[],routingProgress=null}){
 const {lower,upper,boosters,payload,shell,fitting}=parts;
 const {baseY,heightM:H,lowerLengthM:L,upperLengthM:U,fairingRadiusM:R,fairingHeightM:F,baseRadiusM:r,payloadWidthM,payloadHeightM,payloadSeatM,flightRingRadiusM=.60}=geometry;
 const isWithin=(object,ancestor)=>{for(let p=object;p;p=p.parent)if(p===ancestor)return true;return false;};
 const physicalMeshes=[];
 const effect=o=>{for(let p=o;p;p=p.parent)if(p.userData.engineeringGraphic||p.userData.presentationOnly||p.userData.fuel||p.userData.mergedJet||['Water curtain','Pad water and exhaust effluent','Ascent wake'].includes(p.name))return true;return false;};
 for(const owner of [tower,lower,upper,...boosters,payload,shell,fitting])owner?.traverse(o=>{if(o.isMesh&&!o.userData.routingLine&&!effect(o)&&!physicalMeshes.includes(o))physicalMeshes.push(o);});
 const targetObstacles=physicalMeshes.map(mesh=>obstacleFromMesh(mesh,{id:'launch-solid:'+mesh.uuid}));
 const departureObstacles=targetObstacles.filter((_,i)=>!isWithin(physicalMeshes[i],tower));
 routingProgress?.({stage:'inventory',solids:targetObstacles.length,triangles:targetObstacles.reduce((sum,o)=>sum+(o.triangles?.length||0),0)});
 const root=new T.Group();root.name='Ground umbilical network';root.userData.part='pad';tower.add(root);
 const annotations=[],groups=[],connectionMeshes=new Map(),connectionAnchors=new Map(),contexts=new Map(),flightRoots=[];
 const steel=new T.MeshStandardMaterial({color:'#788d92',metalness:.54,roughness:.49});
 const pale=new T.MeshStandardMaterial({color:'#c4cdcb',metalness:.42,roughness:.56});
 const dark=new T.MeshStandardMaterial({color:'#3d5058',metalness:.35,roughness:.64});
 const support=new T.MeshStandardMaterial({color:'#657a80',metalness:.34,roughness:.6});
 const boxGeom=new T.BoxGeometry(1,1,1),tubeGeom=new T.CylinderGeometry(1,1,1,8),portGeom=new T.CylinderGeometry(1,1,1,16),ballGeom=new T.SphereGeometry(1,8,6);
 const tempA=V(),tempB=V(),tempD=V(),tempM=V();let selectedId=null,lastState=null;
 const sourceCounters=new Map(),sourceBanks=new Map(),sourceAnchors=new Map(),routingFailures=[],routeRecords=[],guideMeshes=[];
 const group=(p,name,part='pad')=>{const o=new T.Group();o.name=name;o.userData.part=part;p.add(o);return o;};
 const mesh=(p,geo,mat,name)=>{const o=new T.Mesh(geo,mat);o.name=name;o.userData.part=p.userData.part||'pad';p.add(o);return o;};
 const box=(p,pos,size,mat,name)=>{const o=mesh(p,boxGeom,mat,name);o.position.copy(pos);o.scale.copy(size);return o;};
 const rod=(p,a,b,rad,mat,name)=>{const o=mesh(p,tubeGeom,mat,name);setRod(o,a,b,rad);return o;};
 function setRod(o,a,b,rad){tempD.copy(b).sub(a);const length=tempD.length();o.visible=length>1e-7;if(!o.visible)return;o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(Y,tempD.multiplyScalar(1/length));o.scale.set(rad,length,rad);}
 function staticPipe(p,points,rad,mat,name){return points.slice(1).map((b,i)=>rod(p,points[i],b,rad,mat,name));}
 const groundPortPitch=spec=>spec.visual?.target==='core'&&boosters.length>=4?3:5;
 function withdrawalClearance(spec,head,normal){
  let clearance=Math.max(1.2,r*.67);if(spec.release.mode!=='pull-away')return clearance;
  // A disconnected head has to clear every later rising appendage, including
  // Super Heavy's grid fins, not just the barrel at its original elevation.
  // Enclose all actual vehicle solids through the complete ground-view
  // attitude range. Vertical rise has zero projection on this horizontal
  // connector normal. This is a design allocation; the motion gate still
  // checks the full withdrawal and ascent against every rendered solid.
  const lo=-.76*35/540,hi=0;let outer=-Infinity;
  for(const obstacle of departureObstacles)for(const x of [obstacle.bounds.min[0],obstacle.bounds.max[0]])for(const y of [obstacle.bounds.min[1],obstacle.bounds.max[1]])for(const z of [obstacle.bounds.min[2],obstacle.bounds.max[2]]){
   const A=normal.x*x,B=-normal.x*y,C=normal.z*z,values=[A*Math.cos(lo)+B*Math.sin(lo)+C,A+C],stationary=Math.atan2(B,A);
   for(let k=-2;k<=2;k++){const theta=stationary+k*Math.PI;if(theta>=lo&&theta<=hi)values.push(A*Math.cos(theta)+B*Math.sin(theta)+C);}
   outer=Math.max(outer,...values);
  }
  if(!Number.isFinite(outer))throw new Error('Cannot allocate a pull-away head without the complete vehicle departure envelope.');
  return Math.max(clearance,outer-head.dot(normal)+1.0);
 }
 function targetFor(spec){
  routingProgress?.({stage:'azimuth',id:spec.id});
  const {target,boosterIndex=0,heightFraction=.1,azimuthDeg=225}=spec.visual||{};
  let angle=azimuthDeg*Math.PI/180,unit=V(Math.sin(angle),0,Math.cos(angle));
  // Interface azimuths in this study are allocations, not provider drawings.
  // Select an outward-facing azimuth with a clear radial escape corridor;
  // assigning every side booster 225 degrees points one of them into its core.
  if(target!=='payload'||spec.release.event!=='payload-release'){
   const selected=target==='booster'?boosters[boosterIndex]:null,center=selected?V(selected.position.x,0,selected.position.z):V(),radius=selected?.userData.radiusM||r;
   const bodies=[{center:V(),radius:r,owner:lower},...boosters.map(owner=>({center:V(owner.position.x,0,owner.position.z),radius:owner.userData.radiusM,owner}))];
   const targetY=selected?baseY+heightFraction*selected.userData.lengthM:target==='core'?baseY+heightFraction*L:target==='upper'?-U+heightFraction*U:heightFraction*F,escapeRadius=selected?radius*1.030:target==='payload'?R:target==='upper'?(r+(R-r)*heightFraction)*1.008:r*1.013;
   let best=null;const azimuthCandidates=[];for(let k=0;k<64;k++){const a=k*Math.PI/32,n=V(Math.sin(a),0,Math.cos(a));if(selected&&n.dot(center.clone().normalize())<.40)continue;
    const start=center.clone().addScaledVector(n,radius+.10),finish=center.clone().addScaledVector(n,radius+Math.max(4,r*3)),delta=finish.clone().sub(start);let minimum=Infinity;
    for(const body of bodies){if(body.owner===(selected||lower))continue;const t=Math.max(0,Math.min(1,body.center.clone().sub(start).dot(delta)/delta.lengthSq())),gap=start.clone().addScaledVector(delta,t).distanceTo(body.center)-body.radius;minimum=Math.min(minimum,gap);}
    const corridorStart=center.clone().addScaledVector(n,escapeRadius+.85),corridorEnd=center.clone().addScaledVector(n,escapeRadius+Math.max(5,r*3));corridorStart.y=corridorEnd.y=targetY;
    const narrow=routeClearance({id:'terminal-azimuth',points:[center.clone().addScaledVector(n,escapeRadius+.44).setY(targetY).toArray(),corridorEnd.toArray()],radiusM:Math.max(.06,r*.04)},targetObstacles);
    const corridor=routeClearance({id:'azimuth-check',points:[corridorStart.toArray(),corridorEnd.toArray()],radiusM:.75},targetObstacles),toward=(spec.id==='payload-ecs'?V(-1,0,0):V(serviceFrame.mastX-center.x,0,serviceFrame.mastZ-center.z)).normalize(),reserved=groups.some(g=>!g.internal&&segmentSegmentDistance(corridorStart.toArray(),corridorEnd.toArray(),g.headPoint.clone().setY(targetY).toArray(),g.headPoint.clone().addScaledVector(g.normal,6).setY(targetY).toArray()).distanceM<Math.max(.8,(g.connections.length+design.connections.filter(c=>c.groupId===spec.id).length)*Math.min(.14,r*.034)*2.5+.15)),preference=spec.id==='payload-ecs'?0:n.dot(unit)*.35,score=n.dot(toward)+preference+(minimum>r*.25?10:-100+minimum)+(corridor.ok&&narrow.ok&&!reserved?100:0)-(reserved?1000:0);const candidate={n,a,score};azimuthCandidates.push(candidate);if(!best||score>best.score)best=candidate;
   }
   const interfaceCons=design.connections.filter(c=>c.groupId===spec.id),portRad=Math.max(.055,Math.min(.14,r*.034)),groupBend=Math.max(.1,...interfaceCons.map(c=>(isWire(c.medium)?.38:c.medium==='conditioned-air'?1.16:.64)*portRad*6));
   for(const candidate of azimuthCandidates.sort((a,b)=>b.score-a.score)){const n=candidate.n,tangent=V(n.z,0,-n.x),head=center.clone().addScaledVector(n,escapeRadius+.2625);head.y=targetY;const clearance=withdrawalClearance(spec,head,n),base=V(serviceFrame.mastX,Math.min(serviceFrame.mastTopY-.3,Math.max(serviceFrame.grade+1.1,head.y)),serviceFrame.mastZ-Math.max(1.2,H*.075)),low=head.y<baseY+L*.16,arm=head.clone().sub(base),pseudo={spec,internal:false,headPoint:head,normal:n,clearance,base,armPivot:!low,pivotDirection:Math.sign(V(arm.z,0,-arm.x).dot(n))||1};let clean=true;
    for(const [i,c] of interfaceCons.entries()){const rr=isWire(c.medium)?portRad*.38:c.medium==='conditioned-air'?portRad*1.16:portRad*.64,rad=Math.max(.1,rr*6),offset=(i-(interfaceCons.length-1)/2)*portRad*groundPortPitch(spec),tail={offset,fixedEnd:head.clone().addScaledVector(tangent,offset).addScaledVector(n,clearance+4*rad+1.7).add(V(0,Math.max(4*groupBend+.4,.45*maximumTangentialTravel(pseudo)+1),0))},restLengthM=maximumLoopSeparation(pseudo,tail)+8*rad+1;
     for(const f of [0,.015625,.03125,.0625,.09375,.125,.1875,.25,.375,.5,.625,.75,.875,1]){const route=roundedConnectionRoute(constantLengthHingeRoute(tail.fixedEnd,loopEnd(pseudo,tail,f),{outward:n,restLengthM,bendRadiusM:rad,lengthMetric:'developed'}),rad);if(route.bendLimited||!routeClearance({id:'candidate-loop',points:route.points,radiusM:rr,clearanceM:Math.max(.008,rad*.02+.01)},targetObstacles).ok){clean=false;break;}}if(!clean)break;
    }if(clean&&candidate.score>50){best=candidate;break;}
   }if(best){unit=best.n;angle=best.a;}
  }
  if(target==='booster'){
   const part=boosters[boosterIndex];if(!part)return null;
   const radius=part.userData.radiusM,hh=part.userData.lengthM;
   return {part,point:unit.clone().multiplyScalar(radius*1.030).add(V(0,heightFraction*hh,0)),normal:unit,radius:radius*1.030,center:V(part.position.x,baseY+heightFraction*hh,part.position.z)};
  }
  if(target==='upper'){
   if(!U)return null;const radius=r+(R-r)*heightFraction;
   return {part:upper,point:unit.clone().multiplyScalar(radius*1.008).add(V(0,-U+heightFraction*U,0)),normal:unit,radius,center:V(0,-U+heightFraction*U,0)};
  }
  if(target==='payload'){
   const internal=spec.release.event==='payload-release'||spec.release.mode==='flight-separation';
   if(internal)unit=V(1,0,0);
   const radius=internal?Math.min(R-.95,Math.max(flightRingRadiusM*.90,payloadWidthM*.52+.02)):R;
   const yy=internal?payloadSeatM+.03:Math.max(.2,Math.min(F*.65,heightFraction*F));
   return {part:internal?payload:shell,point:unit.clone().multiplyScalar(radius).add(V(0,yy,0)),normal:unit,viewDirection:unit.clone().add(V(0,.20,0)).normalize(),radius,center:V(0,yy,0),internal};
  }
  return {part:lower,point:unit.clone().multiplyScalar(r*1.013).add(V(0,baseY+heightFraction*L,0)),normal:unit,radius:r,center:V(0,baseY+heightFraction*L,0)};
 }
 function connector(parent,point,normal,rad,name){
  const g=group(parent,name,parent===root?'pad':'launcher');g.position.copy(point);g.quaternion.setFromUnitVectors(Y,normal);
  const boss=mesh(g,portGeom,dark,'Flight receptacle');boss.scale.set(rad*1.5,.11,rad*1.5);
  const face=mesh(g,portGeom,pale,'Connector face');face.scale.set(rad,.035,rad);face.position.y=.065;
  return g;
 }
 function sourcePoint(medium,index,routeId,physicalRadiusM){
  const aliases={methane:['methane','lng','lch4'],hydrogen:['hydrogen','lh2'],lox:['lox','oxygen'],rp1:['rp1','kerosene']};
  let point=null;for(const key of aliases[medium]||[medium])if(serviceSources.has(key)){point=serviceSources.get(key).clone();break;}
  if(!point){const allocated=[...new Set(design.connections.map(c=>c.medium))],station=allocated.indexOf(medium);point=V(serviceFrame.mastX-serviceFrame.widthM*4.0-station*3,serviceFrame.grade+.9,serviceFrame.mastZ-serviceFrame.widthM*2.5);}
  const slot=sourceCounters.get(medium)||0;sourceCounters.set(medium,slot+1);
  if(['power','data','conditioned-air','grounding'].includes(medium))point.z-=.76;if(medium==='conditioned-air')point.x+=.18;
  let bank=sourceBanks.get(medium);if(!bank){const count=design.connections.filter(c=>c.medium===medium&&c.groupId!=='payload-flight').length,body=group(root,medium+' service distribution bank');body.position.copy(point);const solid=box(body,V(0,0,0),V(Math.max(.40,count*.40+.18),.30,.20),dark,'Dedicated '+medium+' source manifold');solid.userData.routingSolid=true;guideMeshes.push(solid);bank={root:body,count,point};sourceBanks.set(medium,bank);}
  const rise=.15+Math.max(.1375,physicalRadiusM+.020),outlet=point.clone().add(V((slot-(bank.count-1)/2)*.40,rise,0));
  const port=connector(root,outlet.clone().add(V(0,-.0825,0)),V(0,1,0),physicalRadiusM*1.1,medium+' outlet '+(slot+1));const barrel=port.children[0],barrelLength=rise-.0275-.15;barrel.scale.y=barrelLength;barrel.position.y=.055-barrelLength/2;port.userData.serviceSource=true;port.userData.sourceRouteId=routeId;port.userData.sourceEndpoint=outlet.toArray();sourceAnchors.set(routeId,port);
  return outlet;
 }
 function material(medium){return new T.MeshStandardMaterial({color:mediumColor(medium),metalness:.3,roughness:.53,emissive:mediumColor(medium),emissiveIntensity:0});}
 function annotation(spec,anchor,priority=100){const entry={id:'umbilical-'+spec.id,title:spec.name,detail:spec.status+' · connected',anchor,kind:'ground',priority,groupId:spec.id};annotations.push(entry);return entry;}
 const specs=design.groups||[];
 for(const spec of specs){
  const target=targetFor(spec);if(!target)continue;
  const cons=design.connections.filter(c=>c.groupId===spec.id);if(!cons.length)continue;
  const internal=target.internal||spec.release.mode==='flight-separation';
  const assembly=group(internal?fitting:root,spec.name,internal?'adapter':'pad');assembly.userData.umbilicalGroup=spec.id;
  const portRoot=group(target.part,spec.name+' · vehicle interfaces','launcher');flightRoots.push(portRoot);
  const normal=target.normal,tangent=Math.abs(normal.y)>.9?V(1,0,0):V(normal.z,0,-normal.x),rad=internal?.035:Math.max(.055,Math.min(.14,r*.034));
  const panelWidth=Math.max(rad*4,cons.length*rad*(internal?3:groundPortPitch(spec))),panelHeight=Math.max(rad*3.4,internal?.20:.38);
  const panel=box(portRoot,target.point,V(panelWidth,panelHeight,.12),pale,'Vehicle service plate');
  panel.quaternion.setFromUnitVectors(V(0,0,1),normal);
  target.part.updateWorldMatrix(true,false);const headPoint=internal?target.point.clone().addScaledVector(normal,.2625):tower.worldToLocal(target.part.localToWorld(target.point.clone())).addScaledVector(normal,.2625),retractPoint=headPoint.clone();
  const head=group(assembly,'Ground quick-disconnect head',internal?'adapter':'pad');head.position.copy(headPoint);
  if(internal)head.position.copy(target.point).addScaledVector(normal,.2625);
  const headBox=box(head,V(),V(panelWidth+.12,panelHeight+.13,.26),dark,internal?'Carrier connector half':'Ground connector plate');headBox.quaternion.setFromUnitVectors(V(0,0,1),normal);
  const motion=group(assembly,'Service retraction mechanism',internal?'adapter':'pad');
  if(!internal)motion.position.y=-1.25;
  const base=V(serviceFrame.mastX,Math.min(serviceFrame.mastTopY-.3,Math.max(serviceFrame.grade+1.1,headPoint.y)),serviceFrame.mastZ-Math.max(1.2,H*.075));
  const low=headPoint.y<baseY+L*.16;let armPivot=null;
  // Aft services use local pedestals. Higher interfaces are carried from the
  // selected pad's mast or transporter spine; none are suspended in space.
  if(low&&!internal){
   base.copy(headPoint).addScaledVector(normal,Math.max(1.9,r*.76)).addScaledVector(tangent,panelWidth*.5+1.1);base.y=serviceFrame.grade+1.0;
   const hh=Math.max(1,headPoint.y-base.y);box(motion,V(base.x,base.y+hh*.5,base.z),V(Math.max(.5,r*.14),hh,Math.max(.5,r*.14)),support,'Aft umbilical pedestal');
   base.y=headPoint.y;box(motion,base,V(1.0,.22,.75),steel,'Aft service hinge');rod(motion,base,headPoint,Math.max(.05,r*.018),support,'Aft service support beam');
  }else if(!internal){
   armPivot=group(motion,'Retractable umbilical arm hinge');armPivot.position.copy(base);
   const a=V(),b=headPoint.clone().addScaledVector(normal,.7).sub(base),mid=a.clone().lerp(b,.5);
   const width=Math.max(.36,r*.15),length=a.distanceTo(b);
   const arm=box(armPivot,mid,V(length,width,width*1.4),support,'Umbilical support arm');arm.quaternion.setFromUnitVectors(V(1,0,0),b.clone().sub(a).normalize());
   rod(armPivot,a.clone().add(V(0,-Math.min(1.5,length*.12),0)),b,width*.16,steel,'Arm diagonal');
  }
  // Fixed service supply remains on the ground during transporter tipback.
  // A notional exterior raceway supports the retained trunk; only the local
  // disconnect loop flexes. Reparenting the whole source run to the spine
  // previously pulled its lower end out of the distribution equipment.
  const fixedRoot=group(assembly,'Fixed service routing',internal?'adapter':'pad'),tails=[];
  const couplingSpan=Math.max(.9,r*.44),clearance=internal?Math.max(1.2,r*.67):withdrawalClearance(spec,headPoint,normal);
  const entry=annotation(spec,head,internal?93:104);entry.connectionId=cons[0]?.id;
  const armVector=headPoint.clone().sub(base),pivotDirection=Math.sign(V(armVector.z,0,-armVector.x).dot(normal))||1;
  const item={spec,target,assembly,portRoot,head,headBox,motion,armPivot,base,headPoint,normal,clearance,entry,tails,internal,retractPoint,pivotDirection,connections:cons};groups.push(item);
  for(const [i,c] of cons.entries()){
   const offset=(i-(cons.length-1)/2)*rad*(internal?3:groundPortPitch(spec)),medium=c.medium,wire=isWire(medium),rr=wire?rad*.38:medium==='conditioned-air'?rad*1.16:rad*.64;
   const color=material(medium),padPoint=target.point.clone().addScaledVector(tangent,offset),flight=connector(portRoot,padPoint,normal,rr,c.name+' · flight side');
   // Separate colored media remain separate tubes and couplings. These ports
   // symbolize the interface allocation, not a released pin or hose count.
   const local=V().addScaledVector(tangent,offset),groundHead=group(head,c.name+' · ground side',internal?'adapter':'pad');groundHead.position.copy(local);
   const coupling=mesh(groundHead,portGeom,color,'Breakaway coupling');coupling.quaternion.setFromUnitVectors(Y,normal);coupling.scale.set(rr*1.16,.36,rr*1.16);
   const bendRadiusM=Math.max(.10,rr*6),fixedEnd=internal?target.point.clone().addScaledVector(normal,.18).add(V(0,-.45,0)):headPoint.clone().addScaledVector(tangent,offset).addScaledVector(normal,clearance+bendRadiusM*4+1.7).add(V(0,bendRadiusM*4+.4,0));
   let points;
   if(internal){
    points=[V(normal.x*.5,payloadSeatM-.48,normal.z*.5),fixedEnd];
   }else{
    const source=sourcePoint(medium,i,c.id,rr),baseLow=V(fixedEnd.x,serviceFrame.grade+.9+i*.035,fixedEnd.z),sourceTurn=V(source.x,baseLow.y,baseLow.z);
    points=[source,sourceTurn,baseLow,fixedEnd];
   }
   const fixedMeshes=[];
   const hose=group(assembly,c.name+' · retained flexible lead',internal?'adapter':'pad'),segments=[];
   for(let j=0;j<6;j++)segments.push(mesh(hose,tubeGeom,color,c.name+' · flexible segment'));
   const beads=[];
   for(let j=0;j<2;j++){const bead=mesh(hose,ballGeom,color,c.name+' · selected route marker');bead.scale.setScalar(rr*1.42);bead.userData.serviceCue='Route highlight, not active fluid or electrical transfer';beads.push(bead);}
   const tail={connection:c,offset,rr,color,flight,groundHead,coupling,hose,segments,beads,fixedEnd,points:Array.from({length:7},()=>V()),materials:[color],source:points[0],bendRadiusM,fixedRoot,fixedMeshes};tails.push(tail);
   connectionMeshes.set(c.id,{groupId:spec.id,flight,groundHead,fixedMeshes,hose,segments,material:color,head,assembly});connectionAnchors.set(c.id,internal?flight:groundHead);
   contexts.set(c.id,{anchor:internal?flight:groundHead,halfM:internal?Math.max(1.2,panelWidth*2):Math.max(4.4,r*2.45,base.distanceTo(headPoint)*.55),groupId:spec.id,internal,direction:target.viewDirection||normal.clone().add(V(0,.20,0)).normalize()});
  }
  headBox.geometry=perforatedPanelGeometry(panelWidth+.12,panelHeight+.13,.26,tails.map(t=>({id:t.connection.id,u:t.offset,v:0,radiusM:t.rr*1.22})));headBox.scale.set(1,1,1);headBox.userData.routingSolid=true;head.updateWorldMatrix(true,true);portRoot.updateWorldMatrix(true,true);for(const owner of [head,portRoot])owner.traverse(o=>{if(o.isMesh)targetObstacles.push(obstacleFromMesh(o,{id:'launch-solid:'+o.uuid}));});
 }
 // Instantiate actual round tubes from the same routes that the checker reads.
 // Each circuit retains a static source-to-clamp run and a fixed-length local
 // service loop. No route is re-optimized as the mechanism moves.
 function headAt(g,f){if(g.internal)return g.target.point.clone().addScaledVector(g.normal,.2625+f*.24);if(g.armPivot&&g.spec.release.mode==='pivot-away')return g.headPoint.clone().sub(g.base).applyAxisAngle(Y,g.pivotDirection*1.10*f).add(g.base);return g.headPoint.clone().addScaledVector(g.spec.release.mode==='drop-away'?V(0,-1,0):g.normal,g.clearance*f);}
 function loopEnd(g,tail,f){return headAt(g,f).addScaledVector(V(g.normal.z,0,-g.normal.x),tail.offset).addScaledVector(g.normal,.18);}
 function maximumTangentialTravel(g){if(!(g.armPivot&&g.spec.release.mode==='pivot-away'))return 0;const t=V(g.normal.z,0,-g.normal.x),v=g.headPoint.clone().sub(g.base),a=t.x*v.x+t.z*v.z,b=t.x*v.z-t.z*v.x,travel=g.pivotDirection*1.10,angles=[0,travel];for(let k=-2;k<=2;k++){const x=Math.atan2(b,a)+k*Math.PI;if(x>=Math.min(0,travel)&&x<=Math.max(0,travel))angles.push(x);}return Math.max(...angles.map(x=>Math.abs(a*(Math.cos(x)-1)+b*Math.sin(x))));}
 function maximumLoopSeparation(g,tail){const candidates=[0,1];if(g.armPivot&&g.spec.release.mode==='pivot-away'){const tangent=V(g.normal.z,0,-g.normal.x),a=tail.fixedEnd.clone().sub(g.base).addScaledVector(tangent,-tail.offset).addScaledVector(g.normal,-.18),b=g.headPoint.clone().sub(g.base),phase=Math.atan2(a.x*b.z-a.z*b.x,a.x*b.x+a.z*b.z)+Math.PI,travel=g.pivotDirection*1.10;for(let k=-2;k<=2;k++){const f=(phase+k*Math.PI*2)/travel;if(f>0&&f<1)candidates.push(f);}}return Math.max(...candidates.map(f=>tail.fixedEnd.distanceTo(loopEnd(g,tail,f))));}
 const reservedFlex=[];
 for(const g of groups){g.flexHeightM=Math.max(...g.tails.map(t=>4*t.bendRadiusM+.4),.45*maximumTangentialTravel(g)+1);if(!g.internal)for(const tail of g.tails)tail.fixedEnd.y=g.headPoint.y+g.flexHeightM;}
 for(const g of groups)for(const tail of g.tails){const id=tail.connection.id,rad=tail.bendRadiusM;
  let sourceNormal=V(0,1,0);if(g.internal){const tangent=V(g.normal.z,0,-g.normal.x);tail.fixedEnd.copy(g.target.point).addScaledVector(tangent,tail.offset).addScaledVector(g.normal,.7425).add(V(0,.38,0));tail.source.copy(tail.fixedEnd).add(V(0,.60,0));sourceNormal=V(0,-1,0);const p=connector(g.assembly,tail.source.clone().addScaledVector(sourceNormal,-.0825),sourceNormal,tail.rr*1.5,id+' retained carrier output');p.userData.sourceRouteId=id;p.userData.sourceEndpoint=tail.source.toArray();sourceAnchors.set(id,p);}
  tail.sourceNormal=sourceNormal;
  for(const segment of tail.segments){segment.removeFromParent();segment.visible=false;}tail.segments=[];
  tail.flexTube=connectionTube(tail.hose,{radius:tail.rr,material:tail.color,part:g.internal?'adapter':'pad',segments:128,radialSegments:8,bendRadiusM:rad,name:tail.connection.name+' · constant-length disconnect loop'});
  const longest=maximumLoopSeparation(g,tail);
  tail.restLengthM=g.internal?longest+.45:longest+rad*8+1;
  // A visible stand-off clamp supports each transition, without occupying its
  // cable bore. Its frame is not a cable-solid collision exemption.
  const clampFrame=group(g.assembly,id+' fixed cable clamp',g.internal?'adapter':'pad');clampFrame.position.copy(tail.fixedEnd);clampFrame.quaternion.setFromUnitVectors(V(0,0,1),g.normal);const shape=perforatedPanelGeometry(tail.rr*5+.04,tail.rr*5+.04,.04,[{id,u:0,v:0,radiusM:tail.rr+.012}]),clampMesh=mesh(clampFrame,shape,support,'Open cable clamp');clampMesh.userData.routingSolid=true;guideMeshes.push(clampMesh);
  for(const f of [0,.5,1]){const shape=roundedConnectionRoute(constantLengthHingeRoute(tail.fixedEnd,loopEnd(g,tail,f),{outward:g.normal,restLengthM:tail.restLengthM,bendRadiusM:rad,lengthMetric:'developed'}),rad);reservedFlex.push({id:id+':loop-envelope-'+f,ownerId:id,points:shape.points,radiusM:tail.rr});}tail.flexControls=constantLengthHingeRoute(tail.fixedEnd,loopEnd(g,tail,0),{outward:g.normal,restLengthM:tail.restLengthM,bendRadiusM:rad,lengthMetric:'developed'});tail.flexTube.update(tail.flexControls);tail.points=tail.flexTube.sampledPoints();
 }
 tower.updateWorldMatrix(true,true);for(const p of [lower,upper,...boosters,payload,shell,fitting])p?.updateWorldMatrix(true,true);
 const utilityTerminals=new Map();for(const record of utilityRouting)for(const terminal of record.terminations){const entries=utilityTerminals.get(terminal.mesh)||[];entries.push({record,anchor:terminal.anchor});utilityTerminals.set(terminal.mesh,entries);}
 const utilityAperture=entry=>{const p=entry.anchor.getWorldPosition(V()).toArray(),half=entry.record.radiusM*2+.020;return {id:entry.record.id+':terminal-contact',routeIds:[entry.record.id],min:p.map(x=>x-half),max:p.map(x=>x+half)};};
 const tailById=new Map(groups.flatMap(g=>g.tails).map(t=>[t.connection.id,t]));
 const obstacleRecord=(mesh)=>{const own=mesh.parent?.userData.sourceRouteId,tail=tailById.get(own),p=tail?sourceAnchors.get(own).localToWorld(V(0,.0825,0)).toArray():null,half=tail?tail.rr*2+.032:0;return obstacleFromMesh(mesh,{id:'launch-solid:'+mesh.uuid,apertures:utilityTerminals.has(mesh)?utilityTerminals.get(mesh).map(utilityAperture):tail?[{id:own+':source-contact',routeIds:[own],min:p.map(x=>x-half),max:p.map(x=>x+half)}]:[]});};
 const sourceMeshes=[];for(const owner of [root,...groups.filter(g=>g.internal).map(g=>g.assembly)])owner.traverse(o=>{if(o.isMesh&&o.parent.userData.sourceRouteId)sourceMeshes.push(o);});
 const interfaceMeshes=[];for(const g of groups)for(const owner of [g.head,g.portRoot])owner.traverse(o=>{if(o.isMesh&&!o.userData.serviceCue)interfaceMeshes.push(o);});
 const structuralMeshes=[...new Set([...physicalMeshes,...guideMeshes,...sourceMeshes,...interfaceMeshes,...groups.flatMap(g=>g.motion.children.flatMap(c=>{const a=[];c.traverse(o=>{if(o.isMesh)a.push(o);});return a;}))])];
 const initialObstacles=structuralMeshes.map(obstacleRecord),planned=[];let circuitIndex=0;
 for(const record of utilityRouting){routingProgress?.({stage:'utility',id:record.id});const id=record.id,from=anchorInFrame(record.from,record.parent).toArray(),to=anchorInFrame(record.to,record.parent).toArray(),screen=routeClearance({id,points:record.tube.route.points,radiusM:record.radiusM,clearanceM:.008},initialObstacles,{otherRoutes:planned});let plan={ok:screen.ok&&!record.tube.route.bendLimited,controlPoints:record.controlPoints,screen};if(!plan.ok)plan=planElectricalRoute(from,to,{id,fromNormal:normalInFrame(record.from,record.parent).toArray(),toNormal:normalInFrame(record.to,record.parent).toArray(),radiusM:record.radiusM,bendRadiusM:record.bendRadiusM,obstacles:initialObstacles,otherRoutes:planned,waypoints:record.controlPoints.slice(1,-1),clearanceM:.008,maxAttempts:32,gridStepM:Math.max(.35,record.bendRadiusM*1.2),gridMarginM:Math.max(1.5,record.bendRadiusM*5),maxGridNodes:16000});record.routingPlan=plan;if(plan.ok)record.tube.update(plan.controlPoints);else routingFailures.push({id,stage:'utility-route',detail:plan.screen});planned.push({id,points:record.tube.route.points,radiusM:record.radiusM});}
 for(const g of groups)for(const tail of g.tails){
  const id=tail.connection.id,rad=tail.bendRadiusM;routingProgress?.({stage:'umbilical',id});
  const sourceNormal=tail.sourceNormal,otherRoutes=[...planned,...reservedFlex.filter(x=>x.ownerId!==id)];
  const approach=tail.fixedEnd.clone().addScaledVector(g.normal,-(rad*2.2+.30)),outerZ=Math.min(tail.source.z-rad*3-.4,serviceFrame.mastZ-Math.max(H*.20,serviceFrame.widthM*1.7))-circuitIndex*.28,laneY=Math.max(...g.tails.map(t=>t.fixedEnd.y+4*t.bendRadiusM))+1+g.tails.filter(t=>t.fixedEnd.clone().addScaledVector(g.normal,-(t.bendRadiusM*2.2+.30)).z<approach.z-1e-8).length*.40;
  const sourceLeadY=Math.max(tail.source.y+rad*2.2+.4,serviceFrame.grade+6+circuitIndex*.25);
  const controlled=g.internal?[tail.source.toArray(),tail.source.clone().addScaledVector(sourceNormal,rad*2.2).toArray(),approach.toArray(),tail.fixedEnd.toArray()]:[tail.source.toArray(),[tail.source.x,sourceLeadY,tail.source.z],[tail.source.x,sourceLeadY,outerZ],[tail.source.x,laneY,outerZ],[approach.x,laneY,outerZ],[approach.x,laneY,approach.z],approach.toArray(),tail.fixedEnd.toArray()];circuitIndex++;
  const direct=roundedConnectionRoute(controlled,rad),directScreen=routeClearance({id,points:direct.points,radiusM:tail.rr,clearanceM:.008},initialObstacles,{otherRoutes});
  tail.directScreen=directScreen;tail.directControls=controlled;
  const joinsClean=shape=>auditRoutes([{id,points:[...shape.points,...tail.flexTube.route.points.slice(1)],radiusM:tail.rr}],[],{maxIssues:1}).ok;
  const flank=(approach.x<0?-1:1)*Math.max(Math.max(r*3,...boosters.map(b=>Math.abs(b.position.x)+b.userData.radiusM))+3+rad*2+circuitIndex*.18,approach.x<0?Math.abs(serviceFrame.mastX)+serviceFrame.widthM*3:0),wide=g.internal?controlled:[...controlled.slice(0,4),[flank,laneY,outerZ],[flank,laneY,approach.z],[approach.x,laneY,approach.z],approach.toArray(),tail.fixedEnd.toArray()],wideRoute=roundedConnectionRoute(wide,rad),wideScreen=routeClearance({id,points:wideRoute.points,radiusM:tail.rr,clearanceM:.008},initialObstacles,{otherRoutes});
  let selected=!direct.bendLimited&&directScreen.ok&&joinsClean(direct)?{shape:direct,control:controlled,screen:directScreen}:!wideRoute.bendLimited&&wideScreen.ok&&joinsClean(wideRoute)?{shape:wideRoute,control:wide,screen:wideScreen}:null;
  if(!selected&&!g.internal)for(const shift of [.6,-.6,1.2,-1.2,1.8,2.4,3,3.6,4.2,4.8,5.4,6,7.2,8.4]){if(laneY+shift<tail.fixedEnd.y+rad*2.2+.3)continue;for(const baseControl of [controlled,wide]){const control=baseControl.map((p,i)=>i>=3&&i<baseControl.length-2?[p[0],p[1]+shift,p[2]]:p),shape=roundedConnectionRoute(control,rad);if(shape.bendLimited)continue;const screen=routeClearance({id,points:shape.points,radiusM:tail.rr,clearanceM:.008},initialObstacles,{otherRoutes});if(screen.ok&&joinsClean(shape)){selected={shape,control,screen};break;}}if(selected)break;}
  if(!selected)routingProgress?.({stage:'search',id,direct:directScreen,wide:wideScreen,bendLimited:direct.bendLimited,joined:joinsClean(direct)});
  const route=selected?{ok:true,...selected.shape,controlPoints:selected.control,minimumClearanceM:selected.screen.minimumClearanceM}:planElectricalRoute(tail.source.toArray(),tail.fixedEnd.toArray(),{id,fromNormal:sourceNormal.toArray(),toNormal:g.normal.clone().negate().toArray(),radiusM:tail.rr,bendRadiusM:rad,obstacles:initialObstacles,otherRoutes,waypoints:g.internal?[]:wide.slice(1,-1),clearanceM:.008,maxAttempts:24,gridStepM:g.internal?.075:Math.max(.50,rad*1.3),gridMarginM:g.internal?.35:Math.max(1.8,rad*6),maxGridNodes:6000});
  if(route.ok&&!joinsClean(roundedConnectionRoute(route.controlPoints,rad))){route.ok=false;route.screen={reason:'fixed-flex-self-collision'};}tail.routingPlan=route;if(!route.ok)routingFailures.push({id,stage:'fixed-route',detail:route.screen});
  tail.fixedTube=connectionTube(tail.fixedRoot,{radius:tail.rr,material:tail.color,part:g.internal?'adapter':'pad',segments:192,radialSegments:8,bendRadiusM:rad,name:tail.connection.name+' · supported fixed feed'});tail.fixedTube.update(route.controlPoints);tail.fixedDevelopedLengthM=roundedConnectionRoute(route.controlPoints,rad).developedLengthM;tail.fixedMeshes.push(tail.fixedTube.mesh);planned.push({id,points:tail.fixedTube.route.points,radiusM:tail.rr});

 }
 const jointRadii=new WeakMap();function radiusAboutJoint(object,joint){let radii=jointRadii.get(object);if(!radii){radii=new WeakMap();jointRadii.set(object,radii);}if(radii.has(joint))return radii.get(joint);object.geometry.computeBoundingBox();object.updateWorldMatrix(true,false);joint.updateWorldMatrix(true,false);const matrix=joint.matrixWorld.clone().invert().multiply(object.matrixWorld),bounds=object.geometry.boundingBox;let radius=0;for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])radius=Math.max(radius,V(x,y,z).applyMatrix4(matrix).length());radii.set(joint,radius);return radius;}

 for(const g of groups)for(const tail of g.tails){const sourcePort=sourceAnchors.get(tail.connection.id);tail.sourceAnchor=connectionAnchor(sourcePort,[0,.0825,0],[0,1,0],tail.connection.id+' physical source exit');tail.endAnchor=connectionAnchor(tail.groundHead,g.normal.clone().multiplyScalar(.18).toArray(),g.normal.toArray(),tail.connection.id+' physical coupling exit');const record=connectionMeshes.get(tail.connection.id);record.fixedTube=tail.fixedTube;record.flexTube=tail.flexTube;record.segments=[];}
 function routingSnapshot({frame=null,scope='all',includePart=null,activeOnly=false}={}){
  tower.updateWorldMatrix(true,true);for(const owner of [lower,upper,...boosters,payload,shell,fitting])owner?.updateWorldMatrix(true,true);
  // Cancel a common parent algebraically before transforming physical datums.
  // Sending a fixed pad point through world space and subtracting the changing
  // camera-follow translation introduced tiny false aperture motions. The
  // same exact ancestor product is used by the actual-buffer mesh adapter.
  const frameMatrices=new WeakMap(),matrixInFrame=node=>{let matrix=frameMatrices.get(node);if(!matrix){matrix=routingMatrix(node,frame);frameMatrices.set(node,matrix);}return matrix;};
  const localPoint=(node,point=V())=>point.clone().applyMatrix4(matrixInFrame(node)).toArray();
  const localDirection=(node,direction)=>direction.clone().transformDirection(matrixInFrame(node)).toArray();
  const present=node=>{if(!activeOnly)return true;for(let p=node;p;p=p.parent)if(p.userData.routingPresent===false||p.userData.routingReferenceRepresentation&&p.userData.routingPresent!==true)return false;return true;};
  const selectedGroups=groups.filter(g=>(scope==='flight'?g.internal:scope==='ground'?!g.internal:true)&&present(g.assembly)),selectedUtility=scope==='flight'||!present(tower)?[]:utilityRouting;
  const additionalIssues=[],routes=selectedUtility.map(record=>({...routeFromTube(record.tube,{id:record.id,frame,from:record.from,to:record.to,minBendRadiusM:record.bendRadiusM}),clearanceM:.004,motion:{type:'rigid',owner:'ground'},restLengthM:record.tube.route.lengthM,lengthToleranceM:Math.max(.00008,record.tube.route.lengthM*2e-6)}));
  for(const g of selectedGroups)for(const tail of g.tails){
   const a=routeFromTube(tail.fixedTube,{id:tail.connection.id,frame,from:tail.sourceAnchor}),b=routeFromTube(tail.flexTube,{id:tail.connection.id,frame,to:tail.endAnchor}),points=[...a.points,...b.points.slice(1)],fixedLengthM=routeLength(a.points),hMin=Math.abs(tail.fixedEnd.y-loopEnd(g,tail,0).y),dMax=maximumLoopSeparation(g,tail),R=tail.bendRadiusM,freeLeadMinM=(tail.restLengthM-dMax-Math.PI*R)/2;
   // The invariant straight into the clamp is part of the same convex U.
   // Retain its actual rendered arclength boundary so a simplified collision
   // segment across the clamp is still covered by the construction witness.
   const direction=localDirection(g.assembly,g.normal),joint=points[a.points.length-1],delta=p=>p.map((x,i)=>x-joint[i]),projection=p=>delta(p).reduce((v,x,i)=>v+x*direction[i],0),offAxis=p=>Math.hypot(...delta(p).map((x,i)=>x-projection(p)*direction[i]));let straightIndex=a.points.length-1;
   while(straightIndex>0&&projection(a.points[straightIndex-1])<=2e-5&&offAxis(a.points[straightIndex-1])<=1e-5)straightIndex--;
   const flexSpanStartM=routeLength(a.points.slice(0,straightIndex+1)),firstProjection=projection(a.points[straightIndex]),nominalFlex=b.points.length?tail.flexTube.route.points.map(p=>localPoint(tail.flexTube.mesh,V(...p))):[];
   if(firstProjection<-.0001)nominalFlex.unshift(nominalFlex[0].map((x,i)=>x+direction[i]*firstProjection));
   const lengthEvidence=launchConnectionLengthEvidence(tail,a,b);additionalIssues.push(...lengthEvidence.issues);
   routes.push({id:tail.connection.id,points,radiusM:Math.max(a.radiusM,b.radiusM,tail.rr+.0001),measuredRadiusM:Math.max(a.radiusM,b.radiusM),minBendRadiusM:R,minimumBendRadiusM:Math.min(a.minimumBendRadiusM,b.minimumBendRadiusM),bendRadiusBasis:'constructed-circular-fillets',renderedCenterlineMismatchM:Math.max(a.renderedCenterlineMismatchM,b.renderedCenterlineMismatchM),renderedEndpointMismatchM:Math.max(a.renderedEndpointMismatchM,b.renderedEndpointMismatchM),from:a.from,to:b.to,restLengthM:lengthEvidence.physicalRestLengthM,lengthToleranceM:lengthEvidence.lengthToleranceM,lengthMeasurementBasis:'physical-developed-with-bounded-rendered-chord-deficit',lengthEvidence,clearanceM:.004,motionSpans:[{id:tail.connection.id+':flex',startM:flexSpanStartM,endM:fixedLengthM+routeLength(b.points),nominalPoints:nominalFlex},{id:tail.connection.id+':u-material',proofOnly:true,startM:fixedLengthM,endM:fixedLengthM+routeLength(b.points)},{id:tail.connection.id+':fixed-lead',proofOnly:true,startM:flexSpanStartM,endM:fixedLengthM+Math.max(0,freeLeadMinM-.00008)},{id:tail.connection.id+':moving-lead',proofOnly:true,startM:fixedLengthM+routeLength(b.points)-Math.max(0,freeLeadMinM-.00008),endM:fixedLengthM+routeLength(b.points)}],
    motion:{type:'launch-loop',owner:g.internal?'fitting':'ground',groupId:g.spec.id,internal:g.internal,release:g.spec.release,pivot:!!(g.armPivot&&g.spec.release.mode==='pivot-away'),pivotRadiusM:g.headPoint.distanceTo(g.base),pivotDirection:g.pivotDirection,pivotOrigin:localPoint(g.assembly,g.base),zeroHead:localPoint(g.assembly,g.headPoint),zeroEndpoint:localPoint(g.assembly,loopEnd(g,tail,0)),releaseMode:g.spec.release.mode,clearanceM:g.clearance,normal:localDirection(g.assembly,g.normal),fixedEnd:points[a.points.length-1],endpoint:points.at(-1),fixedLengthM,firstStraightLengthM:V(...tail.flexTube.route.points[1]).distanceTo(V(...tail.flexTube.route.points[0])),restLengthM:tail.restLengthM,lengthMetric:'developed',minPerpendicularM:hMin,maxEndpointSeparationM:dMax,maxTangentialTravelM:maximumTangentialTravel(g),minimumEndpointHeightM:Math.min(loopEnd(g,tail,0).y,loopEnd(g,tail,1).y),freeLeadMinM,nominalRadiusM:tail.rr,bendRadiusM:R,planeOffsetM:tail.offset,planeTangent:localDirection(g.assembly,V(g.normal.z,0,-g.normal.x))}});
  }
  const meshes=new Set(physicalMeshes),interfaces=new Map();for(const owner of [root,...groups.flatMap(g=>[g.assembly,g.portRoot])])owner.traverse(o=>{if(o.isMesh&&!o.userData.dynamicConnection&&!o.userData.serviceCue)meshes.add(o);});
  for(const [mesh,entries] of utilityTerminals)interfaces.set(mesh,entries.map(entry=>routingContactBox(entry.anchor,{id:entry.record.id+':terminal-contact',routeIds:[entry.record.id],halfSizeM:entry.record.radiusM*2+.020},frame)));
  for(const g of groups)for(const tail of g.tails){const id=tail.connection.id,sourcePort=sourceAnchors.get(id),halfSizeM=tail.rr*2+.032;sourcePort.traverse(o=>{if(o.isMesh)interfaces.set(o,[routingContactBox(tail.sourceAnchor,{id:id+':source-contact',routeIds:[id],halfSizeM},frame)]);});interfaces.set(tail.coupling,[routingContactBox(tail.endAnchor,{id:id+':disconnect-contact',routeIds:[id],halfSizeM},frame)]);}
  const ownerOf=object=>isWithin(object,tower)?'ground':isWithin(object,fitting)?'fitting':isWithin(object,payload)?'payload':isWithin(object,shell)?'shell':isWithin(object,upper)?'upper':isWithin(object,lower)?'lower':boosters.some(p=>isWithin(object,p))?'booster-'+boosters.findIndex(p=>isWithin(object,p)):'unclassified';
  const obstacles=[];for(const mesh of meshes){const owner=ownerOf(mesh);if(scope==='flight'&&owner==='ground'||!present(mesh)||includePart&&!includePart(owner,mesh))continue;let motion={type:'rigid',owner};
   for(const g of groups){if(isWithin(mesh,g.head)){motion={type:'head',owner,groupId:g.spec.id,release:g.spec.release,internal:g.internal,pivot:!!(g.armPivot&&g.spec.release.mode==='pivot-away'),pivotRadiusM:g.headPoint.distanceTo(g.base),clearanceM:g.clearance};break;}if(g.armPivot&&isWithin(mesh,g.armPivot)){motion={type:'arm',owner,groupId:g.spec.id,release:g.spec.release,pivotRadiusM:g.headPoint.distanceTo(g.base),axisRadiusM:radiusAboutJoint(mesh,g.armPivot)};break;}}
   if(serviceFrame.movingSpine&&isWithin(mesh,serviceFrame.movingSpine))motion={type:'spine',owner:'ground',axisRadiusM:radiusAboutJoint(mesh,serviceFrame.movingSpine)};
   for(let p=mesh;p;p=p.parent){if(p.name==='Hydraulic release jaw'){motion={type:'jaw',owner:'ground',jointId:p.uuid,axisRadiusM:radiusAboutJoint(mesh,p)};break;}if(p.userData.halfSide){motion={type:'fairing-half',owner:'shell',side:p.userData.halfSide};break;}if(['Retained cargo door','Retained cargo carriage','Telescoping retained guide','Guided separation plunger','Two-axis separation shoe','Separation shoe stem','Retracting launch clamp','Allocated flat-package release clamp'].includes(p.name)){motion={type:p.name,owner,jointId:p.uuid};break;}}
   obstacles.push({...obstacleFromMesh(mesh,{id:'launch-solid:'+mesh.uuid,frame,apertures:interfaces.get(mesh)||[]}),motion,name:mesh.name});
  }
  // The renderer grades all terrain vertices within this radius to one
  // plane. The gate additionally proves every ground tube and its all-time
  // flex envelope stays one complete terrain-cell diagonal inside that disk.
  // Thus this conservative solid contains every potentially contacting terrain
  // triangle, independent of asynchronously loaded elevation imagery.
  if(scope!=='flight'&&present(tower)&&(!includePart||includePart('ground')))obstacles.push({id:'launch-solid:graded-local-terrain',type:'obb',center:localPoint(tower,V(0,serviceFrame.grade-5000,0)),axes:[V(1,0,0),V(0,1,0),V(0,0,1)].map(axis=>localDirection(tower,axis)),halfSize:[LOCAL_PAD_FLAT_RADIUS_M,5000,LOCAL_PAD_FLAT_RADIUS_M],motion:{type:'rigid',owner:'ground'},name:'Graded local terrain · conservative cell enclosure'});
  const registeredMeshes=[...selectedUtility.map(x=>x.tube.mesh),...selectedGroups.flatMap(g=>g.tails.flatMap(t=>[t.fixedTube.mesh,t.flexTube.mesh]))],drawnMeshes=[];for(const owner of [tower,fitting])owner.traverse(o=>{if(o.isMesh&&o.userData.dynamicConnection&&present(o)&&(scope==='flight'?isWithin(o,fitting):scope==='ground'?isWithin(o,tower):true))drawnMeshes.push(o);});
  return {routes,obstacles,additionalIssues,planningFailures:routingFailures.filter(f=>routes.some(r=>r.id===f.id)),expectedRouteIds:[...design.connections.filter(c=>{const internal=design.groups.find(g=>g.id===c.groupId)?.release.event==='payload-release';return (scope==='flight'?internal:scope==='ground'?!internal:true)&&(!activeOnly||selectedGroups.some(g=>g.spec.id===c.groupId));}).map(c=>c.id),...selectedUtility.map(c=>c.id)],expectedObstacleIds:obstacles.map(o=>o.id),inventory:{registeredTubeMeshes:registeredMeshes.length,drawnTubeMeshes:drawnMeshes.length,unregisteredTubeMeshes:drawnMeshes.filter(m=>!registeredMeshes.includes(m)).map(m=>m.uuid),missingTubeMeshes:registeredMeshes.filter(m=>!drawnMeshes.includes(m)).map(m=>m.uuid)},scope,time:lastState?.t,groundPlane:{heightM:serviceFrame.grade,radiusM:LOCAL_PAD_FLAT_RADIUS_M,cellStepM:LOCAL_PAD_MESH_STEP_M},geometry:{heightM:H,baseRadiusM:r,fairingRadiusM:R,lowerLengthM:L,upperLengthM:U,cargoLiftStrokeM:geometry.cargoLiftStrokeM||0}};
 }
 const stateCache={t:null,value:null};
 function update(t,{pad=true,ascent=false,integration=false,reference=false,vehicleStudy=false,cargoHeld=false}={}){
  const modelTime=vehicleStudy?-45:t;
  if(stateCache.t!==modelTime){stateCache.t=modelTime;stateCache.value=launchUmbilicalState(design,modelTime);}lastState=stateCache.value;
  const byGroup=new Map(lastState.groups.map(s=>[s.id,s])),byConnection=new Map(lastState.connections.map(s=>[s.id,s]));
  root.visible=pad||ascent;
  for(const g of groups){
   const state=byGroup.get(g.spec.id),f=state?.releaseFraction??0,connected=state?.connected??false;
   const visible=!integration&&(!reference||vehicleStudy)&&(!cargoHeld||!g.internal);
   g.assembly.visible=g.assembly.userData.routingPresent=visible&&(g.internal||pad||ascent);g.portRoot.visible=g.portRoot.userData.routingPresent=visible;
   if(!visible)continue;
   const retreat=g.spec.release.mode==='drop-away'?V(0,-g.clearance,0):g.normal.clone().multiplyScalar(g.clearance);
   g.retractPoint.copy(g.headPoint).addScaledVector(retreat,f);
   if(g.armPivot){
    const angle=g.spec.release.mode==='pivot-away'?g.pivotDirection*1.10*f:0;g.armPivot.rotation.y=angle;
    if(angle)g.retractPoint.copy(g.headPoint).sub(g.base).applyAxisAngle(Y,angle).add(g.base);
   }
   if(g.internal)g.retractPoint.copy(g.target.point).addScaledVector(g.normal,.2625+f*.24);
   g.head.position.copy(g.retractPoint);
   // At breakaway the head immediately belongs to the ground. It is not
   // evaluated from a moving rocket endpoint, so no line can follow liftoff.
   g.entry.detail=state?.state==='clear'?'Disconnected · ground hardware retained':state?.state==='releasing'?'Breakaway · retracting clear':g.internal?'Carrier-to-spacecraft interface':g.spec.status+' · connected';
   for(const tail of g.tails){
    const cs=byConnection.get(tail.connection.id),attached=cs?.connected??connected;
    const tangent=Math.abs(g.normal.y)>.9?V(1,0,0):V(g.normal.z,0,-g.normal.x),end=g.retractPoint.clone().addScaledVector(tangent,tail.offset).addScaledVector(g.normal,.18);
    const controls=constantLengthHingeRoute(tail.fixedEnd,end,{outward:g.normal,restLengthM:tail.restLengthM,bendRadiusM:tail.bendRadiusM,lengthMetric:'developed'});if(tail.flexTube.update(controls))tail.flexControls=controls;tail.points=tail.flexTube.sampledPoints();
    for(let j=0;j<tail.beads.length;j++){
     const bead=tail.beads[j];bead.visible=tail.connection.id===selectedId;
     // Fixed markers identify the selected route. Physical attachment does
     // not mean a propellant valve is open or payload power is energized.
     const f=(j+1)/3,index=f*(tail.points.length-1),a=Math.floor(index);bead.position.copy(tail.points[a]).lerp(tail.points[Math.min(a+1,tail.points.length-1)],index-a);
    }
   }
  }
  return lastState;
 }
 function setSelectedConnection(id){
  selectedId=connectionMeshes.has(id)?id:null;
  for(const [key,m] of connectionMeshes){m.material.emissiveIntensity=key===selectedId?.55:0;}
  for(const g of groups){const chosen=g.connections.find(c=>c.id===selectedId);g.entry.priority=chosen?180:g.internal?93:104;g.entry.connectionId=chosen?.id||g.connections[0]?.id;for(const tail of g.tails)for(const bead of tail.beads)bead.visible=tail.connection.id===selectedId;}
 }
 function getConnectionAnchor(id){
  if(connectionAnchors.has(id))return connectionAnchors.get(id);
  const g=groups.find(g=>!g.internal&&g.target.part===shell)||groups.find(g=>g.spec.visual.target==='upper')||groups.find(g=>!g.internal)||groups[0];return g?.head||null;
 }
 function getConnectionContext(id){
  if(contexts.has(id))return contexts.get(id);
  const anchor=getConnectionAnchor(id),g=groups.find(g=>g.head===anchor);
  return {anchor,halfM:Math.max(5.4,r*3.8),groupId:g?.spec.id||null,internal:!!g?.internal,direction:g?.normal.clone().add(V(0,.20,0)).normalize()||V(-.70,.14,-.70).normalize()};
 }
 update(-45,{pad:true});
 return {root,design,groups,utilityRouting,annotations,connectionMeshes,connectionAnchors,flightRoots,update,setSelectedConnection,getConnectionAnchor,getConnectionContext,routingSnapshot,auditRouting(options={}){const s=routingSnapshot();return auditRoutes(s.routes,s.obstacles,{expectedRouteIds:s.expectedRouteIds,expectedObstacleIds:s.expectedObstacleIds,snapshotEvidence:s,...options});},get state(){return lastState;},get selectedConnection(){return selectedId;}};
}
