import * as T from './vendor/three.module.js';
import {connectionTube,connectionAnchor,anchorInFrame,normalInFrame} from './connection-geometry.js';
import {connectorSelections} from './electrical-architecture.js';
import {createInlineArmServiceChain} from './inline-arm-routing.js';
import {createInlineRootElectricalTransfer} from './inline-root-electrical-transfer.js';
import {routingMotionFor,hollowFluidFitting} from './flight-fluid-routing.js';
import {routeFromTube,routeClearance,simplifyCollisionPolyline,auditRoutes,routingMatrix} from './routing-audit.js';
import {planElectricalRoute,routingPlanObservations} from './electrical-routing.js';
import {routingPlanPresets} from './routing-plan-presets.js';
import {roundedConnectionRoute,routeLength} from './connection-routes.js';
import {allocateMatingReservoir,sampleMatingReservoir,matingReservoirSweptObstacles} from './electrical-service-loops.js';
import {createConnectorBoreDatums} from './connector-bore-datums.js';

const V=p=>new T.Vector3(...p);
const inherited=(object,key)=>{for(let p=object;p;p=p.parent)if(p.userData?.[key]!=null)return p.userData[key];};
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const staticPresets=new Map(routingPlanPresets.map(record=>[record.key,record.controlPoints]));
const append=(target,points)=>target.push(...(target.length?points.slice(1):points));
// The reservation encloses every original rendered segment. The conservative
// radius inflation is exactly the maximum RDP centreline deviation; raw tube
// buffers remain the source for final endpoint, bend, length and collision tests.
const reservation=route=>({...route,points:simplifyCollisionPolyline(route.points,2e-6),radiusM:route.radiusM+2e-6});
const boundsMeet=(a,b)=>[0,1,2].every(k=>a.min[k]<=b.max[k]&&a.max[k]>=b.min[k]);
function nearbyReservations(routes,region){const result=[];for(const route of routes){let points=[];const flush=()=>{if(points.length>1)result.push({...route,points});points=[];};for(let i=1;i<route.points.length;i++){const a=route.points[i-1],b=route.points[i],bounds={min:a.map((x,k)=>Math.min(x,b[k])-route.radiusM),max:a.map((x,k)=>Math.max(x,b[k])+route.radiusM)};if(boundsMeet(bounds,region)){if(!points.length)points.push(a);points.push(b);}else flush();}flush();}return result;}
export const inlineElectricalDiagnostics={onPrepared:null,onStage:null,onPlanningContext:null,onServiceContext:null};

// Each source conductor has two physically separate cables. The only
// connection across the two-axis root is the explicitly allocated rotary
// component. This adapter owns its extra interfaces, articulated arm and
// independently registered tube buffers; it never stretches the original
// body-to-array cable across the complete deploying arm.
export function prepareInlineElectricalInstallation({factory,h,architecture,lines,routes,ports,colors,metal,onPlan=null}={}){
 const logicalLines=lines.filter(line=>line.r.spec.rootTransfer);
 if(!logicalLines.length)return null;
 const root=factory.root,transfers=[],chains=[],physicalLines=[],extraTubes=[],extraPorts=new Map(),byCircuit=new Map(),plans=new Map(),serviceReservations=[],serviceSweepVolumes=[],borePoint=createConnectorBoreDatums();
 const world=anchor=>anchorInFrame(anchor,root).toArray(),normal=anchor=>normalInFrame(anchor,root).toArray();
 const transform=(points,frame)=>{const matrix=routingMatrix(frame,root);return points.map(p=>V(p).applyMatrix4(matrix).toArray());};
 const local=(points,frame)=>{const matrix=routingMatrix(root,frame);return points.map(p=>V(p).applyMatrix4(matrix).toArray());};
 const localAllocation=(allocation,frame)=>{const m=routingMatrix(root,frame);return {...allocation,controls:local(allocation.controls,frame),axis:V(allocation.axis).transformDirection(m).toArray(),fromNormal:V(allocation.fromNormal).transformDirection(m).toArray(),toNormal:V(allocation.toNormal).transformDirection(m).toArray()};};
 const groups=new Map();for(const line of logicalLines){const id=line.r.spec.rootTransfer.componentId;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(line);}
 for(const members of groups.values()){
  members.sort((a,b)=>a.i-b.i);const spec=members[0].r.spec,type=connectorSelections[spec.connectorTypeId],transfer=createInlineRootElectricalTransfer({factory,h,bankEnd:spec.rootTransfer.bankEnd,circuitIds:members.map(l=>l.id),radiusM:spec.cableDiameterM/2,connectorDiameterM:type.diameterM,connectorLengthM:type.lengthM,polesPerCable:spec.connectorTypeId.startsWith('hv-single')?1:2,material:metal});transfers.push(transfer);
  for(const role of ['stator','rotor']){
   const declaration=architecture.portById[spec.rootTransfer[role+'PortId']],fixtures=transfer.matingConnectors.filter(f=>f.role==='root-'+role),exits=fixtures.map(f=>f.exit);
   for(const [i,fixture]of fixtures.entries()){fixture.portId=declaration.id;fixture.exit.userData.electricalPortId=declaration.id;fixture.frame.userData.electricalPortId=declaration.id;fixture.exit.userData.circuitInstance=Math.floor(i/(spec.connectorTypeId.startsWith('hv-single')?2:1));fixture.exit.userData.polarity=spec.connectorTypeId.startsWith('hv-single')?(i%2?1:-1):0;}
   extraPorts.set(declaration.id,{port:declaration,type,exits,fixtures,matingTravel:.045,frame:role==='stator'?transfer.body:transfer.rotor,physicalDatumProvider:'inline-root-electrical-transfer'});
  }
  // Each conductor keeps its own straight, finite-radius passage. A single
  // actual rectangular gland cuts every skin/blanket layer in this bank.
  root.updateWorldMatrix(true,true);const points=members.map(l=>world(transfer.statorPorts.get(l.id))),sign=Math.sign(points[0][0])||1,center=[sign*h.bodyWidthM/2,(Math.min(...points.map(p=>p[1]))+Math.max(...points.map(p=>p[1])))/2,(Math.min(...points.map(p=>p[2]))+Math.max(...points.map(p=>p[2])))/2],portal=factory.addRoutingFeedthrough({id:transfer.id+':electrical-gland',axis:'x',sign,positionM:center,widthM:Math.max(...points.map(p=>p[2]))-Math.min(...points.map(p=>p[2]))+.10,heightM:Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]))+.10,part:'harness',straightM:.08});
  for(const [index,logical]of members.entries()){
   const {r,i,radiusM,bendRadiusM}=logical,bodyId=logical.id+'/body',armId=logical.id+'/arm',chain=createInlineArmServiceChain({factory,h,bankEnd:spec.rootTransfer.bankEnd,index,circuitCount:members.length,radiusM,bendRadiusM,id:armId,material:colors?.[spec.kind]});chains.push(chain);
   const bodyTube=logical.tube,armTube=connectionTube(r.root,{radius:radiusM,material:colors?.[spec.kind]||bodyTube.mesh.material,part:'harness',segments:3072,radialSegments:6,bendRadiusM,name:spec.label+' articulated arm conductor '+(i+1)});
   bodyTube.mesh.name=spec.label+' body conductor '+(i+1);bodyTube.mesh.userData.routingId=bodyId;armTube.mesh.userData={...armTube.mesh.userData,electricalHarnessId:spec.id,routingId:armId};r.tubes[i]=armTube;r.extraTubes??=[];r.extraTubes.push(bodyTube);extraTubes.push(bodyTube);
   const body={...logical,id:bodyId,logicalId:logical.id,section:'body',tube:bodyTube,from:transfer.statorPorts.get(logical.id),to:logical.to,initialFrom:null,initialTo:null,staticPoints:[],motionSpans:[]},arm={...logical,id:armId,logicalId:logical.id,section:'arm',tube:armTube,from:logical.from,to:transfer.rotorPorts.get(logical.id),chain,transfer,staticPoints:[],motionSpans:[]},entryFrame=chain.ports[0].frame,exitFrame=chain.ports.at(-1).frame;
   const p=world(body.from),glandInnerX=world(portal.inner)[0],glandOuterX=world(portal.outer)[0],lanePitch=Math.max(.026,2*radiusM+.012),laneX=glandInnerX-sign*(bendRadiusM+2*radiusM+.004+(index%4)*lanePitch),departure=[laneX,p[1],p[2]-(bendRadiusM*2.4+.06)],fanoutControls=[p,[laneX,p[1],p[2]],departure],fanoutShape=roundedConnectionRoute(fanoutControls,bendRadiusM);
   body.portal={center:[center[0],p[1],p[2]],outer:[glandOuterX,p[1],p[2]],straightExit:[glandInnerX-sign*(radiusM+.002),p[1],p[2]],inner:[laneX,p[1],p[2]],sign,portal};body.glandFanout={...fanoutShape,controlPoints:fanoutControls,end:departure,normal:[0,0,-1]};
   const support=connectionAnchor(root,departure,[0,0,-1],bodyId+' side-aisle routing guide'),clamp=hollowFluidFitting(support,{outerRadiusM:radiusM+.006,boreRadiusM:radiusM+.004,lengthM:.020,material:metal,part:'harness',name:support.name});support.userData={part:'harness',routingSupportCircuit:bodyId};clamp.userData.routingSupportCircuit=bodyId;
   // These open bored guides allow the allocated axial service travel. They
   // constrain the cable corridor without representing a locked material clamp.
   const destination=world(body.to),destinationNormal=normal(body.to),destinationSign=Math.sign(destinationNormal[0]);if(Math.abs(destinationNormal[0])<.999)throw Error('Inline PCDU fanout requires its declared side-face connector: '+bodyId);
   const column=Math.floor(i/(spec.connectorTypeId.startsWith('hv-single')?2:1))%(r.to.port.packing?.columns||1),targetX=destination[0]+destinationSign*(Math.max(.54,2.5*bendRadiusM+.03)+column*lanePitch),targetEnd=[targetX,destination[1],destination[2]-(bendRadiusM+.08)],targetControls=[destination,[targetX,destination[1],destination[2]],targetEnd],targetShape=roundedConnectionRoute(targetControls,bendRadiusM);
   body.destinationFanout={...targetShape,controlPoints:targetControls,end:targetEnd,normal:[0,0,-1],column};const targetSupport=connectionAnchor(root,targetEnd,[0,0,-1],bodyId+' PCDU approach guide'),targetClamp=hollowFluidFitting(targetSupport,{outerRadiusM:radiusM+.006,boreRadiusM:radiusM+.004,lengthM:.020,material:metal,part:'harness',name:targetSupport.name});targetSupport.userData={part:'harness',routingSupportCircuit:bodyId};targetClamp.userData.routingSupportCircuit=bodyId;
   const record={id:logical.id,logical,body,arm,chain,transfer,entryFrame,exitFrame};byCircuit.set(logical.id,record);physicalLines.push(body,arm);r.physicalSections??=[];r.physicalSections.push(body,arm);
  }
 }
 function decorateObstacles(obstacles,{frame=null}={}){
  root.updateWorldMatrix(true,true);const meshById=new Map(),byOwner=new Map(),byPort=new Map();root.traverse(o=>meshById.set(o.uuid,o));
  for(const line of physicalLines)for(const anchor of[line.from,line.to]){const scope={id:line.id+':termination:'+anchor.uuid,line,anchor,half:(line.radiusM+.002)*3},owner=anchor.userData.routingOwnerId,port=inherited(anchor,'electricalPortId');if(owner){if(!byOwner.has(owner))byOwner.set(owner,[]);byOwner.get(owner).push(scope);}if(port){if(!byPort.has(port))byPort.set(port,[]);byPort.get(port).push(scope);}}
  return obstacles.map(obstacle=>{const mesh=meshById.get(obstacle.sourceMesh||obstacle.id);if(!mesh)return obstacle;const apertures=[...(obstacle.apertures||[])],seen=new Set(apertures.map(a=>a.id)),scopes=[...(byPort.get(inherited(mesh,'electricalPortId'))||[])];for(let p=mesh;p;p=p.parent)scopes.push(...(byOwner.get(p.uuid)||[]));for(const scope of scopes)if(!seen.has(scope.id)){seen.add(scope.id);apertures.push(borePoint.contactBox(mesh,scope.id,scope.anchor,{id:scope.id,routeIds:[scope.line.id],halfSizeM:scope.half,frame}));}
   return {...obstacle,apertures};
  });
 }
 function endpointVolumes(){return physicalLines.flatMap(line=>[line.from,line.to].flatMap((anchor,i)=>{
  const a=world(anchor),n=normal(anchor),fanout=line.section==='body'?(i===0?line.glandFanout:line.destinationFanout):null,points=fanout?fanout.points:[a,a.map((x,k)=>x+n[k]*(line.bendRadiusM*2.4+.06))],r=line.radiusM+.002,segments=points.slice(1).map((b,j)=>({a:points[j],b,suffix:j}));
  if(fanout)segments.push({a:fanout.end,b:fanout.end.map((x,k)=>x+fanout.normal[k]*(1.6*line.bendRadiusM+.016)),suffix:'guide-departure'});
  return segments.map(({a,b,suffix})=>({id:line.id+':approach:'+i+':'+suffix,lineId:line.id,type:'capsule',a,b,radiusM:r,bounds:{min:[0,1,2].map(k=>Math.min(a[k],b[k])-r),max:[0,1,2].map(k=>Math.max(a[k],b[k])+r)}}));
 }));}

 function connectorSweeps(){return physicalLines.flatMap(line=>[line.from,line.to].flatMap(anchor=>{const fixture=transfers.flatMap(t=>t.matingConnectors).find(f=>f.exit===anchor);if(!fixture)return[];const box=new T.Box3().setFromObject(fixture.plug),n=normal(anchor),travel=fixture.matingTravel,min=box.min.toArray().map((x,k)=>Math.min(x,x+n[k]*travel)),max=box.max.toArray().map((x,k)=>Math.max(x,x+n[k]*travel));return [{id:fixture.id+':withdrawal',lineId:line.id,type:'box',min,max,bounds:{min,max}}];}));}
 function plan({obstacles=[],otherRoutes=[],terminalVolumes=[]}={}){
  for(const t of transfers)t.update();root.updateWorldMatrix(true,true);const solids=decorateObstacles(obstacles),approaches=[...terminalVolumes,...endpointVolumes(),...connectorSweeps()],occupied=[...otherRoutes,...chains.map(c=>({id:c.id+'/chain',ownerId:c.id,points:c.sample().points,radiusM:c.allocation.radiusM}))].map(reservation);
  const failures=(line,stage,result)=>{if(result.ok)return;line.planningIssues??=[];line.planningIssues.push({stage,reason:result.screen?.reason||result.reason||'bend-or-clearance',screen:result.screen,grid:result.gridFailure});};
  function routed(line,a,b,na,nb,{waypoints=[],preferred=null,preferredCandidates=[]}={}){
   const reserved=[...solids,...approaches.filter(o=>o.lineId!==line.id)],others=occupied.filter(r=>r.ownerId!==line.id&&r.id!==line.id);let result;
   const seed=[a,b,...waypoints,...(preferred||[])],margin=Math.max(.80,line.bendRadiusM*4),region={min:[0,1,2].map(k=>Math.min(...seed.map(p=>p[k]))-margin),max:[0,1,2].map(k=>Math.max(...seed.map(p=>p[k]))+margin)},nearSolids=reserved.filter(o=>boundsMeet(o.bounds||{min:o.min,max:o.max},region)),nearLines=nearbyReservations(others,region);
   inlineElectricalDiagnostics.onStage?.({id:line.id,event:'begin-route',from:a,to:b,fromNormal:na,toNormal:nb,waypoints,solids:reserved.length,reservedSegments:others.reduce((s,r)=>s+r.points.length-1,0),nearSolids:nearSolids.length,nearSegments:nearLines.reduce((s,r)=>s+r.points.length-1,0)});
   inlineElectricalDiagnostics.onPlanningContext?.({id:line.id,from:a,to:b,fromNormal:na,toNormal:nb,waypoints,radiusM:line.radiusM,bendRadiusM:line.bendRadiusM,obstacles:reserved,otherRoutes:others,nearSolids,nearLines});
   for(const controls of [...(preferred?[preferred]:[]),...preferredCandidates]){const shape=roundedConnectionRoute(controls,line.bendRadiusM);if(shape.bendLimited||!auditRoutes([{id:line.id,points:shape.points,radiusM:line.radiusM,from:{position:a,normal:na},to:{position:b,normal:nb}}],[],{stopAfterFirstIssue:true,maxIssues:1}).ok)continue;const screen=routeClearance({id:line.id,points:shape.points,radiusM:line.radiusM,clearanceM:.002},nearSolids,{otherRoutes:nearLines});if(!screen.ok)continue;const full=routeClearance({id:line.id,points:shape.points,radiusM:line.radiusM,clearanceM:.002},reserved,{otherRoutes:others});if(full.ok){const candidate={ok:true,...shape,controlPoints:controls,screen:full};result=candidate;break;}}
   const options={id:line.id,fromNormal:na,toNormal:nb,radiusM:line.radiusM,bendRadiusM:line.bendRadiusM,waypoints,clearanceM:.002,maxAttempts:120};
   if(!result)result=planElectricalRoute(a,b,{...options,obstacles:nearSolids,otherRoutes:nearLines});
   inlineElectricalDiagnostics.onStage?.({id:line.id,event:'local-proposal',ok:result.ok,screen:result.screen,gridFailure:result.gridFailure});
   // Local broadphase only accelerates proposal generation. An accepted
   // proposal must clear ALL original solids and every reserved conductor.
   if(result.ok){const screen=routeClearance({id:line.id,points:result.points,radiusM:line.radiusM,clearanceM:.002},reserved,{otherRoutes:others});if(!screen.ok)result={...result,ok:false,screen};}
   if(!result.ok)result=planElectricalRoute(a,b,{...options,obstacles:reserved,otherRoutes:others});
   if(result.ok){const key=JSON.stringify([a,b,na,nb,line.radiusM,line.bendRadiusM,waypoints]);routingPlanObservations.set(key,{key,controlPoints:result.controlPoints.map(p=>[...p])});}
   inlineElectricalDiagnostics.onStage?.({id:line.id,event:'route-result',ok:result.ok,attempts:result.attempts,screen:result.screen,gridFailure:result.gridFailure});return result;
  }
  function allocateService(line,controls,fromTravelM,toTravelM,{allowNewLoop=true}={}){
    const obstacles=[...solids,...approaches.filter(o=>o.lineId!==line.id)],otherRoutes=occupied.filter(r=>r.id!==line.id&&r.ownerId!==line.id),options={id:line.id,bendRadiusM:line.bendRadiusM,radiusM:line.radiusM,fromNormal:V(controls[1]).sub(V(controls[0])).normalize().toArray(),toNormal:V(controls.at(-2)).sub(V(controls.at(-1))).normalize().toArray(),fromTravelM,toTravelM,allowNewLoop},margin=4*line.bendRadiusM+.12+fromTravelM+toTravelM+line.radiusM+.002,region={min:[0,1,2].map(k=>Math.min(...controls.map(p=>p[k]))-margin),max:[0,1,2].map(k=>Math.max(...controls.map(p=>p[k]))+margin)},nearObstacles=obstacles.filter(o=>boundsMeet(o.bounds||{min:o.min,max:o.max},region)),nearRoutes=nearbyReservations(otherRoutes,region);
    inlineElectricalDiagnostics.onStage?.({id:line.id,event:'begin-service',fromTravelM,toTravelM,nearSolids:nearObstacles.length,nearSegments:nearRoutes.reduce((s,r)=>s+r.points.length-1,0)});
    inlineElectricalDiagnostics.onServiceContext?.({id:line.id,controls,options,obstacles,otherRoutes,nearObstacles,nearRoutes});
    let result=allocateMatingReservoir(controls,{...options,obstacles:nearObstacles,otherRoutes:nearRoutes});
    // Candidate generation is geometry-only. Rejection by this subset also
    // rejects the same candidates against the complete superset. Every locally
    // accepted baseline and withdrawn construction is checked against ALL
    // actual solids and every complete neighboring conductor before acceptance.
    if(result.ok){let complete=true;for(const[fa,ta]of[[0,0],[.5,0],[1,0],[0,.5],[0,1],[1,1]]){const shape=sampleMatingReservoir(result,{fromWithdrawalM:fa*fromTravelM,toWithdrawalM:ta*toTravelM}),screen=routeClearance({id:line.id,points:shape.points,radiusM:line.radiusM,clearanceM:.002},obstacles,{otherRoutes});if(!screen.ok){complete=false;break;}}if(!complete)result=allocateMatingReservoir(controls,{...options,obstacles,otherRoutes});}
    inlineElectricalDiagnostics.onStage?.({id:line.id,event:'service-result',fromTravelM,toTravelM,ok:result.ok,reason:result.reason,obstacleId:result.obstacleId,otherRouteId:result.otherRouteId});return result;
  }
  function reserveServiceSweep(line,allocation,stage){
   const sweep=matingReservoirSweptObstacles(allocation,{id:line.id,radiusM:line.radiusM,clearanceM:0});
   if(!sweep.ok){line.servicePlanningIssues??=[];line.servicePlanningIssues.push({stage:stage+'-continuous-reservation',reason:'unverified-service-sweep',issues:sweep.issues});return sweep;}
   const volumes=sweep.obstacles.map(o=>({...o,id:o.id+':'+stage,serviceSection:stage}));approaches.push(...volumes);serviceSweepVolumes.push(...volumes);return sweep;
  }
  const planningOrder=[...byCircuit.values()].sort((a,b)=>a.logical.r.spec.id.localeCompare(b.logical.r.spec.id)||(a.logical.i^1)-(b.logical.i^1));
  function sourceTailCandidates(line){
   const a=world(line.chain.exit),b=world(line.from),na=normal(line.chain.exit),nb=normal(line.from),key=JSON.stringify([a,b,na,nb,line.radiusM,line.bendRadiusM,[]]),retained=routingPlanObservations.get(key)?.controlPoints||staticPresets.get(key),candidates=retained?[retained]:[],axis=new T.Vector3().crossVectors(V(na),V(nb));
   if(axis.lengthSq()<.5)return candidates;axis.normalize();
   // Leave the panel-edge coolant return before crossing the last leaf. Each
   // proposal moves in the common transverse direction, then joins the source
   // normal. Full actual geometry, neighboring cables and tracking envelopes
   // still screen every candidate; these are search proposals, not exclusions.
   for(const lead of[.23,.28,.36,.48])for(const lift of[-.45,-.585,-.70,-.85,-1,.45,.60,.80])for(const tail of[.55,.70,.85,1,1.2]){
    const p=V(a).addScaledVector(V(na),lead),q=V(b).addScaledVector(V(nb),tail),height=V(a).dot(axis)+lift,p2=p.clone().addScaledVector(axis,height-p.dot(axis)),q2=q.clone().addScaledVector(axis,height-q.dot(axis));candidates.push([a,p.toArray(),p2.toArray(),q2.toArray(),q.toArray(),b]);
   }return candidates;
  }
  for(const record of planningOrder){
   const {body,arm,chain,entryFrame,exitFrame}=record;
   const bodyA=body.glandFanout.end,bodyB=body.destinationFanout.end,bodyEnd=world(body.to),bodyCandidates=[],reverseTarget=body.destinationFanout.points.slice(0,-1).reverse(),reverseTargetControls=body.destinationFanout.controlPoints.slice(0,-1).reverse();
   for(const record of routingPlanObservations.values()){const [from,to,,,radius,bend]=JSON.parse(record.key);if(distance(from,bodyA)<1e-9&&distance(to,bodyB)<1e-9&&Math.abs(radius-body.radiusM)<1e-9&&Math.abs(bend-body.bendRadiusM)<1e-9)bodyCandidates.push(record.controlPoints);}
   // Real source and destination fanouts reserve both connector banks before
   // planning. Their opposed Z tangents give the free span an explicit U bay;
   // shallow layer changes accommodate a different source/destination order.
   for(const lead of[.30,.38,.48,.65,.85]){const z=Math.min(bodyA[2],bodyB[2])-Math.max(lead,1.25*body.bendRadiusM+.04);bodyCandidates.push([bodyA,[bodyA[0],bodyA[1],z],[bodyB[0],bodyB[1],z],bodyB]);for(const cross of[0,1]){const corner=cross?[bodyB[0],bodyA[1],z]:[bodyA[0],bodyB[1],z];bodyCandidates.push([bodyA,[bodyA[0],bodyA[1],z],corner,[bodyB[0],bodyB[1],z],bodyB]);}}
   for(const dy of[-.10,-.16,-.22,-.06,.10,.16])for(const offset of[0,.06,.12,-.06])for(const lead of[.30,.38,.48,.65]){const x=bodyA[0]+body.portal.sign*offset,y=bodyA[1]+dy,z=Math.min(bodyA[2]-.75,bodyB[2])-Math.max(lead,1.25*body.bendRadiusM+.04),prefix=[bodyA,[bodyA[0],bodyA[1],bodyA[2]-.25],[x,y,bodyA[2]-.75],[x,y,z]];bodyCandidates.push([...prefix,[bodyB[0],bodyB[1],z],bodyB],[...prefix,[bodyB[0],y,z],[bodyB[0],bodyB[1],z],bodyB]);}
   const bodyPlan=routed(body,bodyA,bodyB,body.glandFanout.normal,body.destinationFanout.normal,{preferredCandidates:bodyCandidates}),bodyPoints=[...body.glandFanout.points,...bodyPlan.points.slice(1),...reverseTarget],bodyControls=[...body.glandFanout.controlPoints,...bodyPlan.controlPoints.slice(1),...reverseTargetControls],bodyScreen=routeClearance({id:body.id,points:bodyPoints,radiusM:body.radiusM,clearanceM:.002},[...solids,...approaches.filter(o=>o.lineId!==body.id)],{otherRoutes:occupied}),bodySelf=auditRoutes([{id:body.id,points:bodyPoints,radiusM:body.radiusM,from:{position:world(body.from),normal:normal(body.from)},to:{position:bodyEnd,normal:normal(body.to)}}],[],{stopAfterFirstIssue:true,maxIssues:1});
   if(!bodyScreen.ok||!bodySelf.ok){bodyPlan.ok=false;bodyPlan.screen=!bodyScreen.ok?bodyScreen:{reason:'complete-body-self-or-endpoint',issues:bodySelf.issues};}body.staticControls=bodyControls;body.staticPoints=bodyPoints;body.minimumStaticBendM=Math.min(bodyPlan.minimumBendRadiusM,body.glandFanout.minimumBendRadiusM,body.destinationFanout.minimumBendRadiusM);body.restLengthM=routeLength(bodyPoints);body.initialFrom=world(body.from);body.initialTo=world(body.to);failures(body,'fixed-body',bodyPlan);occupied.push(reservation({id:body.id,points:body.staticPoints,radiusM:body.radiusM}));
   const a=anchorInFrame(arm.to,entryFrame).toArray(),b=anchorInFrame(chain.entry,entryFrame).toArray(),preferred=transform([a,[b[0],a[1],a[2]],[b[0],b[1],a[2]],b],entryFrame),before=routed(arm,world(arm.to),world(chain.entry),normal(arm.to),normal(chain.entry),{preferred}),after=routed(arm,world(chain.exit),world(arm.from),normal(chain.exit),normal(arm.from),{preferredCandidates:sourceTailCandidates(arm)});
   record.beforePlan=before;record.afterPlan=after;record.beforeLocal=local(before.points,entryFrame);record.afterLocal=local(after.points,exitFrame);failures(arm,'root-to-first-clamp',before);failures(arm,'last-clamp-to-source',after);arm.minimumStaticBendM=Math.min(before.minimumBendRadiusM,after.minimumBendRadiusM,chain.allocation.bendRadiusM);arm.restLengthM=before.lengthM+chain.restLengthM+after.lengthM;
   const points=[];append(points,before.points);append(points,chain.sample().points);append(points,after.points);occupied.push(reservation({id:arm.id,points,radiusM:arm.radiusM}));plans.set(body.id,body);plans.set(arm.id,arm);onPlan?.({id:record.id,stage:'route',passed:!body.planningIssues&&!arm.planningIssues,issues:[...(body.planningIssues||[]),...(arm.planningIssues||[])]});
  }
  // Lay out every complete cable first. A service reservoir then has to clear
  // all later static cables as well as all previously accepted full withdrawal
  // envelopes. An early loop cannot consume an unplanned circuit's corridor.
  update();inlineElectricalDiagnostics.onStage?.({id:'inline',event:'static-batch-complete',routes:physicalLines.length});
  for(const record of planningOrder)allocateServices(record);
  function allocateServices(record){
   const {body,arm,entryFrame,exitFrame,chain}=record;

   const failed=(line,stage,allocation)=>{line.servicePlanningIssues??=[];line.servicePlanningIssues.push({stage,...allocation});};
   if(!body.planningIssues){const allocation=allocateService(body,body.staticControls,.045,record.logical.r.to.matingTravel,{allowNewLoop:false});if(allocation.ok){body.serviceAllocation=allocation;body.staticPoints=allocation.baseline.points;body.restLengthM=allocation.restLengthM;body.minimumStaticBendM=allocation.baseline.minimumBendRadiusM;serviceReservations.push({physicalId:body.id,frame:root,allocation,from:body.from,to:body.to});reserveServiceSweep(body,allocation,'body');}else failed(body,'both-body-ends',allocation);}
   const bodyOccupancy=occupied.find(r=>r.id===body.id);bodyOccupancy.points=simplifyCollisionPolyline(body.staticPoints,2e-6);
   if(!arm.planningIssues){const before=allocateService(arm,record.beforePlan.controlPoints,.045,0),after=allocateService(arm,record.afterPlan.controlPoints,0,record.logical.r.from.matingTravel);if(before.ok){record.beforeService=localAllocation(before,entryFrame);record.beforeLocal=record.beforeService.baseline?local(before.baseline.points,entryFrame):record.beforeLocal;serviceReservations.push({physicalId:arm.id,frame:entryFrame,allocation:record.beforeService,from:arm.to,to:chain.entry});reserveServiceSweep(arm,before,'root-rotor');}else failed(arm,'root-rotor',before);if(after.ok){record.afterService=localAllocation(after,exitFrame);record.afterLocal=local(after.baseline.points,exitFrame);serviceReservations.push({physicalId:arm.id,frame:exitFrame,allocation:record.afterService,from:chain.exit,to:arm.from});reserveServiceSweep(arm,after,'solar-source');}else failed(arm,'solar-source',after);arm.restLengthM=routeLength(record.beforeLocal)+chain.restLengthM+routeLength(record.afterLocal);arm.minimumStaticBendM=Math.min(arm.minimumStaticBendM,before.ok?before.baseline.minimumBendRadiusM:Infinity,after.ok?after.baseline.minimumBendRadiusM:Infinity);}
   const armOccupancy=occupied.find(r=>r.id===arm.id),points=[];append(points,transform(record.beforeLocal,entryFrame));append(points,chain.sample().points);append(points,transform(record.afterLocal,exitFrame));armOccupancy.points=simplifyCollisionPolyline(points,2e-6);const composition=auditRoutes([{id:arm.id,points,radiusM:arm.radiusM}],[],{maxIssues:1,stopAfterFirstIssue:true});if(!composition.ok)failed(arm,'complete-arm-self-clearance',{reason:'composed-service-overlap',issues:composition.issues});onPlan?.({id:record.id,stage:'service',passed:!body.planningIssues&&!arm.planningIssues&&!body.servicePlanningIssues&&!arm.servicePlanningIssues,issues:[...(body.planningIssues||[]),...(body.servicePlanningIssues||[]),...(arm.planningIssues||[]),...(arm.servicePlanningIssues||[])]});
  }
  update();return physicalLines.map(line=>({id:line.id,points:line.tube.route.points,radiusM:line.radiusM}));
 }
 function withdrawal(anchor,allocation,frame,end){const p=anchorInFrame(anchor,frame).toArray(),baseline=end==='from'?allocation.controls[0]:allocation.controls.at(-1);return Math.max(0,V(p).sub(V(baseline)).dot(V(allocation[end+'Normal'])));}
 function update(){
  for(const t of transfers)t.update();root.updateWorldMatrix(true,true);
  for(const record of byCircuit.values()){
   const {body,arm,chain,entryFrame,exitFrame}=record;if(!body.staticPoints.length||!record.beforeLocal)continue;
   if(body.serviceAllocation){const shape=sampleMatingReservoir(body.serviceAllocation,{fromWithdrawalM:withdrawal(body.from,body.serviceAllocation,root,'from'),toWithdrawalM:withdrawal(body.to,body.serviceAllocation,root,'to')});body.staticPoints=shape.points;}
   body.tube.update(body.staticPoints,{sampled:true,minimumBendRadiusM:body.minimumStaticBendM});body.lengthToleranceM=3e-5;
   if(record.beforeService)record.beforeLocal=sampleMatingReservoir(record.beforeService,{fromWithdrawalM:withdrawal(arm.to,record.beforeService,entryFrame,'from')}).points;
   if(record.afterService)record.afterLocal=sampleMatingReservoir(record.afterService,{toWithdrawalM:withdrawal(arm.from,record.afterService,exitFrame,'to')}).points;
   const shape=chain.sample(),before=transform(record.beforeLocal,entryFrame),after=transform(record.afterLocal,exitFrame),points=[],start=routeLength(before);append(points,before);append(points,shape.points);append(points,after);const total=routeLength(points),rigid=(frame,p)=>({...routingMotionFor(frame),radiusM:Math.max(...local(p,frame).map(v=>Math.hypot(...v)))});
   const spans=[{id:arm.id+':root-lead',sectionId:arm.id+':root-lead',startM:0,endM:start,...rigid(entryFrame,before)},...shape.motionSpans.map(s=>({...s,startM:s.startM+start,endM:s.endM+start})),{id:arm.id+':source-lead',sectionId:arm.id+':source-lead',startM:start+shape.lengthM,endM:total,...rigid(exitFrame,after)}];
   arm.motionSpans=spans.reverse().map(s=>({...s,startM:total-s.endM,endM:total-s.startM,...(s.nominalPoints?{nominalPoints:[...s.nominalPoints].reverse()}:{}),...(s.nominalPointsBody?{nominalPointsBody:[...s.nominalPointsBody].reverse()}:{})}));arm.lengthToleranceM=shape.lengthToleranceM;arm.currentChain=shape;arm.tube.update(points.reverse(),{sampled:true,minimumBendRadiusM:Math.min(arm.minimumStaticBendM,shape.minimumBendRadiusM)});
  }
 }
 function snapshotRoutes({frame=null}={}){root.updateWorldMatrix(true,true);const matrix=routingMatrix(root,frame),spanInFrame=span=>{const result={...span},point=p=>V(p).applyMatrix4(matrix),axis=p=>V(p).transformDirection(matrix);if(span.nominalPointsBody)result.nominalPoints=span.nominalPointsBody.map(p=>point(p).toArray());if(span.transverseAxisBody)result.transverseAxisWorld=axis(span.transverseAxisBody).toArray();if(span.transverseOriginBody)result.transverseOriginWorld=point(span.transverseOriginBody).toArray();if(span.planeAxisBody){const a=axis(span.planeAxisBody);result.planeAxis=a.toArray();result.planeOffsetM=point(V(span.planeAxisBody).multiplyScalar(span.planeOffsetBodyM).toArray()).dot(a);}return result;};return physicalLines.map(line=>{const route=routeFromTube(line.tube,{id:line.id,frame,from:line.from,to:line.to,minBendRadiusM:line.bendRadiusM,restLengthM:line.restLengthM,lengthToleranceM:line.lengthToleranceM,maximumLengthM:line.restLengthM+(line.lengthToleranceM||3e-5)});route.logicalCircuitId=line.logicalId;route.physicalSection=line.section;route.motionSpans=line.section==='body'?[{kind:'rigid',frameId:'body',attachment:'body',sectionId:line.id,startM:0,endM:routeLength(route.points)}]:line.motionSpans.map(spanInFrame);
  const prefix=[0];for(let i=1;i<route.points.length;i++)prefix.push(prefix.at(-1)+distance(route.points[i],route.points[i-1]));
  for(const span of route.motionSpans)if(span.proofOnly&&span.nominalPoints){for(const [key,p]of[['startM',span.nominalPoints[0]],['endM',span.nominalPoints.at(-1)]]){let gap=Infinity,nearest=0;for(let i=0;i<route.points.length;i++){const d=distance(p,route.points[i]);if(d<gap){gap=d;nearest=i;}}if(gap<=span.convexSelfProof.maximumBufferDeviationM)span[key]=prefix[nearest];}}
  route.rotaryTransferId=line.r.spec.rootTransfer.componentId;return route;});}
 function reconciliationRecords(){return [...byCircuit.values()].map(({id,logical,body,arm})=>({id,harnessId:logical.r.spec.id,lengthM:body.restLengthM+arm.restLengthM,minimumBendRadiusM:Math.min(body.minimumStaticBendM,arm.minimumStaticBendM),planningPassed:![body,arm].some(l=>l.planningIssues||l.servicePlanningIssues),physicalSections:[body,arm].map(l=>({id:l.id,lengthM:l.restLengthM,minimumBendRadiusM:l.minimumStaticBendM}))}));}
 function setMating(fixtureId,withdrawalM=0){const fixture=transfers.flatMap(t=>t.matingConnectors).find(f=>f.id===fixtureId);if(!fixture)throw Error('Unknown inline root mating connector '+fixtureId);if(!Number.isFinite(withdrawalM)||withdrawalM<0||withdrawalM>fixture.matingTravel+1e-10)throw Error('Inline root withdrawal outside declared stroke');fixture.plug.position.z=withdrawalM;update();return fixture;}
 const result={logicalLines,physicalLines,extraTubes,extraPorts,transfers,chains,plans,byCircuit,serviceReservations,serviceSweepVolumes,matingConnectors:transfers.flatMap(t=>t.matingConnectors),decorateObstacles,endpointVolumes,connectorSweeps,plan,update,snapshotRoutes,reconciliationRecords,setMating,basis:'Two real cable sections per conductor, separated by a declared two-axis rotary component. Seven independent constant-length circular flex reservoirs follow the actual accordion joints; each removable connector has a separate conserved-length service allocation.'};inlineElectricalDiagnostics.onPrepared?.(result,{factory,h,architecture});return result;
}
