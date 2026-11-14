// H06 diagnosis only. This explicitly proposed-layout replay never installs
// tray proposals or enables a production caller. A recorded failure is the
// expected result, not an electrical/fluid/motion acceptance certificate.
import assert from 'node:assert/strict';
import {writeFileSync,renameSync,readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {makeCraft} from './dist/craft.js';
import {electricalRoutingDiagnostics,physicalFlightMeshes} from './dist/installed-electrical-routing.js';
import {prepareRackPowerTrays} from './dist/rack-power-trays.js';
import {rackPowerTrayCandidates} from './dist/rack-power-tray-candidates.js';
import {roundedConnectionRoute} from './dist/connection-routes.js';
import {obstacleFromMesh,routeClearance,segmentObstacleClearance,segmentSegmentDistance,auditRoutes} from './dist/routing-audit.js';
import {routingPlanObservations} from './dist/electrical-routing.js';
import {routingSourceFingerprint,sameRoutingSourceFingerprint} from './scripts/routing-source-fingerprint.mjs';

const started=Date.now(),configurationId='orbital-1-202606';
const outputIndex=process.argv.indexOf('--output'),output=outputIndex<0?null:process.argv[outputIndex+1];
assert(output,'Use --output <evidence.json>; every costly phase writes an incomplete checkpoint.');
const fingerprint=()=>routingSourceFingerprint({entries:['orbital-right-bank-diagnostic.mjs']});
const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const clone=value=>JSON.parse(JSON.stringify(value));
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const boundsOf=points=>({min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))});
const report={schema:'orbital-data-center/H06-right-bank-diagnosis/1',configurationId,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),startedAt:new Date(started).toISOString(),runtimeCapSeconds:300,scope:'CURRENT proposed-layout diagnostic; the rack tray helper is unintegrated in production.',status:'running',diagnosisComplete:false,routingAccepted:false,sourceStart:fingerprint(),sourceFinish:null,phase:'initializing',elapsedMs:0,reproductionStates:[],failure:null,proposalValidation:null,batteryReplay:[],rightReplay:[],rightAttempts:0,ownedBaselineRoutes:[],repairSeeds:[],limits:{maximumRightAttempts:10,repairConductorsNormally:2,repairConductorsMaximum:4,fluidReplanning:false,batteryServiceAllocation:false,productionMutation:false}};
function save(phase){report.phase=phase;report.elapsedMs=Date.now()-started;writeFileSync(output+'.tmp',JSON.stringify(report,null,2)+'\n');renameSync(output+'.tmp',output);}
function log(value){console.log(JSON.stringify({elapsedMs:Date.now()-started,...value}));}
function checkBudget(){if(Date.now()-started>=report.runtimeCapSeconds*1000){const error=new Error('The bounded H06 runtime cap was reached; the last checkpoint remains incomplete.');error.name='RuntimeCapError';throw error;}}
const manifest=rows=>({ids:rows.map(r=>r.id),count:rows.length,geometryDigest:digest(rows)});
function inherited(node,key){for(let p=node;p;p=p.parent)if(p.userData?.[key]!=null)return p.userData[key];return null;}
function pathOf(node,root){const path=[];for(let p=node;p&&p!==root;p=p.parent)path.push((p.parent?.children.indexOf(p)??0)+':'+(p.name||p.type));return 'body/'+path.reverse().join('/');}
function meshRecord(mesh,root){const hash=createHash('sha256'),p=mesh.geometry.attributes.position;hash.update(Buffer.from(p.array.buffer,p.array.byteOffset,p.array.byteLength));if(mesh.geometry.index){const a=mesh.geometry.index.array;hash.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}return {id:mesh.uuid,path:pathOf(mesh,root),name:mesh.name,electricalBoxId:inherited(mesh,'electricalBoxId'),portId:inherited(mesh,'electricalPortId'),harnessId:inherited(mesh,'electricalHarnessId'),part:inherited(mesh,'part'),physicalPartId:inherited(mesh,'physicalPartId'),geometryType:mesh.geometry.type,geometryDigest:hash.digest('hex'),bodyMatrix:[...root.matrixWorld.clone().invert().multiply(mesh.matrixWorld).elements]};}
function obstacleRecord(obstacle,geometry=false){const {id,type,sourceMesh,lineId,ownerRouteId,sourceSegment,serviceReservoirSweep,operationalEnvelope}=obstacle;const record={id,type,sourceMesh,lineId,ownerRouteId,sourceSegment,serviceReservoirSweep,operationalEnvelope,bounds:obstacle.bounds||{min:obstacle.min,max:obstacle.max},geometryDigest:digest(obstacle)};if(geometry)record.geometry=clone(obstacle);return record;}
function routeRecord(route){const value={id:route.id,points:route.points,radiusM:route.radiusM,clearanceM:route.clearanceM??0,sectionIds:route.sectionIds};return {...value,geometryDigest:digest(value)};}
function finish(status){
 if(report.baseline&&context?.factory){
  const {factory,planned}=context,root=factory.root;root.updateMatrixWorld(true);
  const currentMeshes=[...new Set([...physicalFlightMeshes(root),...factory.fluidConnections.map(c=>c.tube.mesh)])].map(m=>meshRecord(m,root));
  report.physicalInventoryPreservation={originalCount:report.baseline.physicalMeshes.length,currentCount:currentMeshes.length,originalDigest:digest(report.baseline.physicalMeshes),currentDigest:digest(currentMeshes)};
  report.physicalInventoryPreservation.exactlyEqual=report.physicalInventoryPreservation.originalCount===currentMeshes.length&&report.physicalInventoryPreservation.originalDigest===report.physicalInventoryPreservation.currentDigest;
  assert(report.physicalInventoryPreservation.exactlyEqual,'Fresh physical inventory differs from the captured scene');
  const compare=(expected)=>{const ids=expected.map(r=>r.id),actual=planned.filter(r=>ids.includes(r.id)).map(routeRecord),expectedGeometry=expected.map(routeRecord);return {expectedIds:ids,actualIds:actual.map(r=>r.id),expectedDigest:digest(expectedGeometry),actualDigest:digest(actual),exactlyEqual:digest(expectedGeometry)===digest(actual)};};
  const completedRoutes=rows=>rows.filter(r=>r.ok).map(r=>({id:r.id,points:r.points,radiusM:r.interface.radiusM}));
  report.plannedPreservation={nativeFluids:compare(report.baseline.fluidRoutes),...(report.frozenProposal?{frozenProposal:compare(report.frozenProposal.routes)}:{}),batteries:compare(completedRoutes(report.batteryReplay)),precedingRight:compare(completedRoutes(report.rightReplay)),currentPlannedIds:planned.map(r=>r.id)};
  assert(report.plannedPreservation.nativeFluids.exactlyEqual,'Current native fluid route geometry changed');
  if(report.frozenProposal)assert(report.plannedPreservation.frozenProposal.exactlyEqual,'Current frozen proposal route geometry changed');
  assert(report.plannedPreservation.batteries.exactlyEqual,'Current battery route geometry changed');
  assert(report.plannedPreservation.precedingRight.exactlyEqual,'A passing preceding right route changed');
  if(report.preservation)report.preservation.allOriginalPhysicalMeshesPresent=report.physicalInventoryPreservation.exactlyEqual;
 }
 report.sourceFinish=fingerprint();report.unchangedSource=sameRoutingSourceFingerprint(report.sourceStart,report.sourceFinish);assert(report.unchangedSource,'Runtime source changed during the diagnostic');
 const geometricWitness=!!report.failure?.obstacleId&&!!report.failure?.obstacle?.geometry||!!report.failure?.otherRouteId&&report.failure?.otherRoute?.id===report.failure.otherRouteId;
 report.diagnosisComplete=status==='diagnosis-recorded'&&report.postAllocationValidation?.ok===true&&report.postAllocationValidation.rows.length===34&&report.rightAttempt?.ok===false&&report.rightAttempts===report.rightReplay.length&&report.rightAttempts>=1&&report.rightAttempts<=report.limits.maximumRightAttempts&&report.rightReplay.slice(0,-1).every(r=>r.ok)&&report.rightReplay.at(-1)?.id===report.failure?.routeId&&geometricWitness&&report.failure?.collidingSegments?.some(s=>Number.isFinite(s.clearanceM)&&s.clearanceM<-1e-7)&&report.failure?.witnessVerification?.actualReturnedPoints===true&&report.requiredNeighborGeometry?.completePhysicalAndOperational===true&&report.batteryReplay.filter(r=>r.ok).length===8&&report.preservation?.leftRoutesRetained===true&&report.preservation?.payloadRoutesRetained===true&&report.preservation?.precedingRightRoutesRetained===true;
 report.boundedExecutionComplete=true;report.status=status==='diagnosis-recorded'&&!report.diagnosisComplete?'diagnosis-incomplete':status;report.finishedAt=new Date().toISOString();save('finished');log({status:report.status,diagnosisComplete:report.diagnosisComplete,routingAccepted:false,failure:report.failure&&{phase:report.failure.phase,routeId:report.failure.routeId,obstacleId:report.failure.obstacleId,kind:report.failure.kind},rightAttempts:report.rightAttempts,batteryRoutes:report.batteryReplay.filter(r=>r.ok).length});
}

save('before-production-scene-capture');
let context;
try{
 const input=buildReferenceDesign(configurationId),h=sizeDesign(input),stop=new Error('H06 unchanged production planning boundary');
 const painter=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});
 globalThis.document={createElement:()=>({getContext:()=>painter})};
 electricalRoutingDiagnostics.onPlanningContext=value=>{context=value;throw stop;};
 try{makeCraft(h,{planFluidRoutes:false});}catch(error){if(error!==stop)throw error;}finally{electricalRoutingDiagnostics.onPlanningContext=null;}
 assert(context,'Production planning context was not reached');
 const {factory,architecture,layout,lines,allObstacles,terminalVolumes,planned,plan,world,normal,payloadComb}=context,root=factory.root;
 root.updateMatrixWorld(true);
 const physicalMeshes=physicalFlightMeshes(root),fluidMeshes=[...new Set(factory.fluidConnections.map(c=>c.tube.mesh))],physicalIds=new Set(physicalMeshes.map(m=>m.uuid));
 // The ordinary production registry excludes dynamic tube meshes. Their
 // unchanged actual buffers additionally enter proposal/route screens here;
 // the captured native fluid routes also remain in the plan closure.
 const fluidObstacles=fluidMeshes.filter(m=>!physicalIds.has(m.uuid)).map(m=>obstacleFromMesh(m,{frame:root}));
 allObstacles.push(...fluidObstacles);
 const initialObstacles=[...allObstacles],initialTerminals=[...terminalVolumes],initialFluids=[...planned];
 const physicalInventory=[...new Set([...physicalMeshes,...fluidMeshes])].map(m=>meshRecord(m,root));
 const initialGeometryDigest=digest(initialObstacles),initialFluidsDigest=digest(initialFluids),initialTerminalDigest=digest(initialTerminals);
 const interfaceRecord=line=>({id:line.id,harnessId:line.r.spec.id,index:line.i,instance:line.from.userData.circuitInstance,polarity:line.from.userData.polarity,fromPortId:line.r.spec.fromPortId,toPortId:line.r.spec.toPortId,fromBoxId:line.r.spec.fromBoxId,toBoxId:line.r.spec.toBoxId,from:world(line.from),to:world(line.to),fromNormal:normal(line.from),toNormal:normal(line.to),radiusM:line.radiusM,bendRadiusM:line.bendRadiusM,terminationAllowanceM:line.r.spec.terminationAllowanceM,fromTravelM:line.r.from.matingTravel,toTravelM:line.r.to.matingTravel,fromPlugOffsetM:line.r.from.plug.position.toArray(),toPlugOffsetM:line.r.to.plug.position.toArray(),fromEscape:line.fromEscape?clone(line.fromEscape):null,toEscape:line.toEscape?clone(line.toEscape):null});
 const batteries=lines.filter(l=>l.r.spec.id.startsWith('P-BAT')),left=lines.filter(l=>l.r.spec.id==='P-SA-1'),right=lines.filter(l=>l.r.spec.id==='P-SA-2');
 assert.equal(batteries.length,8);assert.equal(left.length,10);assert.equal(right.length,10);
 assert.equal(routingPlanObservations.size,0,'Use a fresh process without earlier electrical route search');
 assert(lines.every(l=>l.r.from.plug.position.z===0&&l.r.to.plug.position.z===0),'The sole reproduction uses fully mated plugs');
 const state={id:'june-deployed-mated-proposed-layout',configurationId,input:clone(input),frame:'craft root metres',deploymentProgress:1,deploymentBasis:'makeCraft calls positionPanels(1) before constructing the installed electrical planning boundary.',plugWithdrawalM:{from:0,to:0},planFluidRoutes:false,fluidState:'Unchanged currently rendered tube buffers and native fluid snapshot; no fluid replanning or acceptance implied.',construction:'Capture unchanged production plan closure, revalidate and freeze proposal routes/full service envelopes, retain native fluid snapshot, then route batteries and at most ten right-collector conductors in captured order. Each successful right path is retained as fixed neighboring geometry; stop at the first actual failure.',productionLineOrder:lines.map(l=>l.id),batteryOrder:batteries.map(l=>l.id),leftOrder:left.map(l=>l.id),rightOrder:right.map(l=>l.id),interfaces:lines.map(interfaceRecord),rootMatrix:[...root.matrixWorld.elements],payloadComb:clone(payloadComb),sourceUnintegrated:true};
 state.batteryServicePolicy={productionBatchAllocation:layout.familyId==='protected-core'||payloadComb.active,diagnosticAllocation:'Deferred throughout this explicitly proposed-layout replay, as required for the H06 mixed baseline. The current June production comb is inactive; this deferral is diagnostic construction policy, not a claim about the enabled production service schedule.'};
 report.reproductionStates.push(state);assert.equal(report.reproductionStates.length,1);
 report.baseline={current:true,counts:{ordinaryPhysicalMeshes:physicalMeshes.length,fluidTubeMeshes:fluidMeshes.length,retainedPhysicalMeshes:physicalInventory.length,originalProductionObstacles:initialObstacles.length-fluidObstacles.length,additionalActualFluidSolids:fluidObstacles.length,terminalReservations:initialTerminals.length,nativeFluidRoutes:initialFluids.length,physicalElectricalCircuits:lines.length},physicalMeshes:physicalInventory,obstacles:initialObstacles.map(o=>obstacleRecord(o)),terminalReservations:clone(initialTerminals),fluidRoutes:initialFluids.map(routeRecord),geometryDigest:initialGeometryDigest,fluidGeometryDigest:initialFluidsDigest,terminalGeometryDigest:initialTerminalDigest,collectorAccommodation:clone(context.collectorAccommodation),equipmentAccommodation:clone(context.equipmentAccommodation),acceptance:'Current geometry inventory only; earlier battery/left results and current native fluid paths are not certificates.'};
 report.connectorBanks=['from','to'].map(end=>({id:'connector-bank:P-SA-2:'+end,portId:right[0].r.spec[end+'PortId'],boxId:right[0].r.spec[end+'BoxId'],routeIds:right.map(l=>l.id),interfaces:right.map(interfaceRecord),physicalMeshIds:physicalInventory.filter(m=>m.portId===right[0].r.spec[end+'PortId']).map(m=>m.id)}));
 log({phase:'current-scene-captured',physicalMeshes:physicalInventory.length,fluidRoutes:initialFluids.length,terminalReservations:initialTerminals.length,firstRight:right[0].id});
 report.selectedProposalRecords=clone(rackPowerTrayCandidates);
 const priorProposal=JSON.parse(gunzipSync(readFileSync(new URL('./docs/harnessing-work/H06-right-bank-evidence.json.gz',import.meta.url)))).selectedProposalRecords,pairIds=['P-SA-1/9','P-SA-1/8'],unowned=rows=>rows.filter(r=>!pairIds.includes(r.id));
 assert.deepEqual(unowned(report.selectedProposalRecords),unowned(priorProposal),'The 24 payload and other eight left proposals are frozen');
 for(const id of pairIds){const before=priorProposal.find(r=>r.id===id),after=report.selectedProposalRecords.find(r=>r.id===id);assert.deepEqual({...before,controls:null},{...after,controls:null},'Pair interfaces and cable construction are fixed');for(const i of [0,1,7,8])assert.deepEqual(before.controls[i],after.controls[i]);}
 report.prerequisiteChange={card:'H06-P1',scope:'Only the instance-4 left conductor pair against unchanged frozen native pipe geometry.',routeIds:pairIds,originalPair:priorProposal.filter(r=>pairIds.includes(r.id)),currentPair:report.selectedProposalRecords.filter(r=>pairIds.includes(r.id)),preservedProposalCount:32,originalPreservedDigest:digest(unowned(priorProposal)),currentPreservedDigest:digest(unowned(report.selectedProposalRecords)),clearanceM:.002,interpretation:'Reported route screens subtract the finite cable jacket radius and the absolute 2 mm allocated separation. A negative margin is not a measured penetration depth.'};
 save('before-current-proposal-revalidation');
 checkBudget();const tray=prepareRackPowerTrays({familyId:layout.familyId,lines,world,normal,obstacles:allObstacles,terminalVolumes});checkBudget();
 report.proposalValidation={current:true,applicable:tray.applicable,ok:tray.ok,reason:tray.reason||null,issues:tray.issues,records:tray.records.size,reservations:tray.reservations.length,replacedReservationIds:tray.replacedReservationIds||[],basis:tray.basis||null,validationBoundary:'Current endpoints/construction; original physical, operational and card solids; actual current fluid mesh buffers; all retained foreign terminal reservations; proposed baseline paths. Full service allocation starts only if every baseline proposal passes. These are construction screens, not final assembly or motion certificates.',baselineRejectedRouteIds:tray.issues.filter(i=>i.code==='coordinated-rack-tray-rejected').map(i=>i.routeId),serviceAllocationReached:tray.applicable&&!tray.issues.some(i=>i.code==='coordinated-rack-tray-rejected')};
 if(!tray.applicable||!tray.ok){
  const issue=tray.issues[0]||{code:'proposal-not-applicable',reason:tray.reason},routeId=issue.routeId||null,row=rackPowerTrayCandidates.find(r=>r.id===routeId),screen=issue.clearance||issue,obstacleId=screen.obstacleId||issue.issues?.[0]?.obstacleId||null,obstacle=allObstacles.find(o=>o.id===obstacleId)||initialTerminals.find(o=>o.id===obstacleId);
  const shape=row?roundedConnectionRoute(row.controls,row.bendRadiusM):null,segment=screen.segment,collisionSegment=shape&&Number.isInteger(segment)?{segment,a:shape.points[segment],b:shape.points[segment+1],clearanceM:screen.clearanceM}:null;
  report.failure={phase:'current-proposal-revalidation',kind:'blocked-before-right-bank-replay',routeId,obstacleId,issue,geometry:row?{proposal:row,rounded:shape}:null,collisionSegment,obstacle:obstacle?obstacleRecord(obstacle,true):null,obstaclePhysicalIdentity:physicalInventory.find(m=>m.id===obstacle?.sourceMesh)||null,meaning:'Current prerequisite revalidation blocks this mixed replay. Any physical obstacle witness belongs to the proposed baseline at the mated reproduction pose; it is not the historical right-bank/payload service-envelope interference. That historical result is not asserted as newly reproduced.'};
  report.proposedRepairGroup={status:'blocked',routeIds:[],reason:'Resolve and freshly revalidate the identified prerequisite before defining a right-bank repair from a reproduced right-bank witness.'};
  const blockedLine=lines.find(l=>l.id===routeId),pair=blockedLine?lines.filter(l=>l.r.spec.id===blockedLine.r.spec.id&&Math.floor(l.i/2)===Math.floor(blockedLine.i/2)):[];
  if(pair.length===2&&pair.every(l=>tray.issues.some(i=>i.routeId===l.id&&i.clearance?.obstacleId===obstacleId)))report.prerequisiteRepairGroup={card:'H06-P1',status:'queued-not-started',routeIds:pair.map(l=>l.id),conductors:2,obstacleId,obstaclePhysicalIdentity:report.failure.obstaclePhysicalIdentity,stateId:state.id,scope:'Resolve this exact feed/return pair against the unchanged current physical pipe geometry at deployed pose 1; preserve every surrounding participant. Revalidate the prerequisite before resuming H06. No right-bank repair or service certificate is authorized by this diagnostic result.'};
  finish('blocked-before-right-bank');
 }else{
  assert.equal(tray.records.size,34);assert.equal(tray.replacedReservationIds.length,10);
  assert.deepEqual([...tray.replacedReservationIds].sort(),left.map(l=>l.id+':to:approach').sort());
  const replacements=new Set(tray.replacedReservationIds);assert(tray.replacedReservationIds.every(id=>initialTerminals.some(o=>o.id===id)));
  // Only declared virtual straight extensions are replaced, with complete
  // actual service reservations. Physical material and plug strokes stay.
  for(let i=terminalVolumes.length-1;i>=0;i--)if(replacements.has(terminalVolumes[i].id))terminalVolumes.splice(i,1);
  const frozenReservations=tray.reservations.map(o=>freeze(clone(o)));
  allObstacles.push(...frozenReservations);
  const proposedRoutes=[];
  for(const [id,record] of tray.records){const line=lines.find(l=>l.id===id),allocation=freeze(clone(record.allocation));assert.equal(allocation.fromTravelM,.045);assert.equal(allocation.toTravelM,.045);const route=freeze({id,points:allocation.baseline.points,radiusM:line.radiusM});planned.push(route);proposedRoutes.push({...routeRecord(route),sourceControls:clone(record.sourceControls),allocation,serviceDomainM:{from:[0,.045],to:[0,.045]},reservationIds:frozenReservations.filter(o=>o.ownerRouteId===id).map(o=>o.id)});}
  report.frozenProposal={routeIds:proposedRoutes.map(r=>r.id),payloadRouteIds:proposedRoutes.filter(r=>r.id.startsWith('P-PAY-')).map(r=>r.id),leftRouteIds:proposedRoutes.filter(r=>r.id.startsWith('P-SA-1/')).map(r=>r.id),routes:proposedRoutes,reservations:frozenReservations,replacedVirtualApproachIds:[...replacements],retainedTerminals:terminalVolumes.map(o=>o.id),geometryDigest:digest({routes:proposedRoutes,reservations:frozenReservations}),acceptance:'Fresh proposal construction revalidation only; all routes and envelopes are frozen as surrounding geometry, with independent final assembly and continuous-motion proof still required.'};
  const frozenProposalDigest=report.frozenProposal.geometryDigest;
  save('before-final-proposal-revalidation');
  report.postAllocationValidation={phase:'final-proposal-revalidation',clearanceM:.002,scope:'All 34 final allocated baselines against every original physical/operational solid, all foreign retained terminals and full foreign service reservations, all 135 native fluid routes and the other 33 final baselines. This static construction predicate is separate from later continuous service-motion acceptance.',rows:proposedRoutes.map(route=>{const row=rackPowerTrayCandidates.find(r=>r.id===route.id),allocation=route.allocation,solids=[...initialObstacles,...terminalVolumes.filter(o=>o.lineId!==route.id),...frozenReservations.filter(o=>o.ownerRouteId!==route.id)],neighbors=[...initialFluids,...proposedRoutes.filter(r=>r.id!==route.id)],candidate={id:route.id,points:route.points,radiusM:route.radiusM,clearanceM:.002},screen=routeClearance(candidate,solids,{otherRoutes:neighbors}),self=auditRoutes([{...candidate,from:{position:row.from,normal:row.fromNormal},to:{position:row.to,normal:row.toNormal},minBendRadiusM:row.bendRadiusM,minimumBendRadiusM:allocation.baseline.minimumBendRadiusM}],[],{maxIssues:3});return {id:route.id,ok:screen.ok&&self.ok&&!allocation.baseline.bendLimited,screen,self:{ok:self.ok,issues:self.issues},bendLimited:allocation.baseline.bendLimited,minimumBendRadiusM:allocation.baseline.minimumBendRadiusM};})};
  report.postAllocationValidation.ok=report.postAllocationValidation.rows.every(r=>r.ok);save('after-final-proposal-revalidation');
  const finalProposalFailure=report.postAllocationValidation.rows.find(r=>!r.ok);
  if(finalProposalFailure){
   const route=proposedRoutes.find(r=>r.id===finalProposalFailure.id),obstacleId=finalProposalFailure.screen.obstacleId||null,obstacle=allObstacles.find(o=>o.id===obstacleId)||terminalVolumes.find(o=>o.id===obstacleId),segment=finalProposalFailure.screen.segment;
   report.failure={phase:'final-proposal-revalidation',kind:'blocked-before-right-bank-replay',routeId:route.id,obstacleId,screen:finalProposalFailure.screen,geometry:route,obstacle:obstacle?obstacleRecord(obstacle,true):null,collisionSegment:Number.isInteger(segment)?{segment,a:route.points[segment],b:route.points[segment+1],clearanceM:finalProposalFailure.screen.clearanceM}:null,meaning:'A final allocated proposal fails the explicit full-context static predicate; the right-bank witness has not been reached.'};
   report.proposedRepairGroup={status:'blocked',routeIds:[],reason:'Resolve the recorded final-allocation prerequisite before attempting the right bank.'};finish('blocked-before-right-bank');
  }else{
  function attempt(line){checkBudget();const via=[];if(line.fromPortal&&!line.fromEscape?.includesPortal)via.push(line.fromPortal.outer,line.fromPortal.inner);if(line.toPortal&&!line.toEscape?.includesPortal)via.push(line.toPortal.inner,line.toPortal.outer);const time=Date.now(),result=plan(line,world(line.from),world(line.to),normal(line.from),normal(line.to),via);checkBudget();assert(Array.isArray(result.points)&&result.points.length>=2&&result.points.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)),'Planner result lacks finite witness points for '+line.id);return {id:line.id,elapsedMs:Date.now()-time,interface:interfaceRecord(line),waypoints:via,...clone(result),planningIssues:clone(line.planningIssues||[])};}
  let batteryFailure=null;
  for(const line of batteries){save('before-battery:'+line.id);const result=attempt(line);report.batteryReplay.push(result);log({phase:'battery-route',id:line.id,ok:result.ok,attempts:result.attempts,elapsedMs:Date.now()-started});if(!result.ok){batteryFailure=result;break;}planned.push(freeze({id:line.id,points:clone(result.points),radiusM:line.radiusM}));}
  if(batteryFailure){report.failure={phase:'battery-replay',kind:'blocked-before-right-bank-replay',routeId:batteryFailure.id,obstacleId:batteryFailure.screen?.obstacleId||batteryFailure.gridFailure?.obstacleId||null,screen:batteryFailure.screen,gridFailure:batteryFailure.gridFailure,reproduction:batteryFailure,meaning:'Current battery routing prerequisite failed with full proposed service and neighboring geometry retained. The historical right-bank result is not asserted as newly reproduced.'};report.proposedRepairGroup={status:'blocked',routeIds:[],reason:'Current battery prerequisite requires diagnosis before a right-bank repair group can be supported.'};finish('blocked-before-right-bank');}
  else{
   assert.equal(report.batteryReplay.filter(r=>r.ok).length,8);
   const finalTerminalDigest=digest(terminalVolumes),rightSuccessIds=()=>report.rightReplay.filter(r=>r.ok).map(r=>r.id);
   function snapshotNeighbors(pair=[]){
    const owned=new Set(pair.map(l=>l.id));
    report.retainedSurroundingRoutes=planned.filter(r=>!owned.has(r.id)).map(routeRecord);
    report.ownedBaselineRoutes=planned.filter(r=>owned.has(r.id)).map(routeRecord);
    report.requiredNeighborGeometry??={selection:'Full original physical and operational obstacle geometry, complete final terminal registry, every retained neighboring route and full proposal service reservation. The full scene is captured before any right attempt; an owned passing mate is separately recorded and remains in the actual plan.',capturedBeforeAnyRightAttempt:report.rightAttempts===0,completePhysicalAndOperational:true,physicalAndOperational:initialObstacles.map(o=>obstacleRecord(o,true)),finalTerminalRegistry:clone(terminalVolumes),proposalServiceEnvelopeIds:frozenReservations.map(o=>o.id),integrity:{physicalAndOperational:manifest(initialObstacles),finalTerminalRegistry:manifest(terminalVolumes),proposalServiceEnvelopes:manifest(frozenReservations)}};
    const geometry=report.requiredNeighborGeometry;
    geometry.foreignTerminals=clone(terminalVolumes.filter(o=>!owned.has(o.lineId)));
    geometry.retainedRouteIds=report.retainedSurroundingRoutes.map(r=>r.id);
    geometry.ownedBaselineRouteIds=report.ownedBaselineRoutes.map(r=>r.id);
    geometry.currentPlannedRouteIds=planned.map(r=>r.id);
    geometry.currentPlannedGeometryDigest=digest(planned.map(routeRecord));
    geometry.integrity.retainedSurroundingRoutes=manifest(report.retainedSurroundingRoutes);
    geometry.integrity.ownedBaselineRoutes=manifest(report.ownedBaselineRoutes);
    geometry.snapshotAfterRightAttempts=report.rightReplay.length;
   }
   function recordPreservation(){
    report.preservation={originalObstacleCount:initialObstacles.length,originalGeometryUnchanged:digest(initialObstacles)===initialGeometryDigest,nativeFluidRoutesUnchanged:digest(initialFluids)===initialFluidsDigest,terminalChangeExactlyDeclaredReplacement:terminalVolumes.length===initialTerminals.length-10&&terminalVolumes.every(o=>initialTerminals.includes(o)),finalTerminalRegistryUnchanged:digest(terminalVolumes)===finalTerminalDigest,frozenProposalGeometryUnchanged:digest({routes:proposedRoutes,reservations:frozenReservations})===frozenProposalDigest,batteryRoutesRetained:batteries.every(l=>planned.some(r=>r.id===l.id)),leftRoutesRetained:left.every(l=>planned.some(r=>r.id===l.id)),payloadRoutesRetained:proposedRoutes.filter(r=>r.id.startsWith('P-PAY-')).every(r=>planned.some(p=>p.id===r.id)),precedingRightRoutesRetained:report.rightReplay.filter(r=>r.ok).every(r=>{const actual=planned.find(p=>p.id===r.id);return actual&&digest(routeRecord(actual))===digest(routeRecord({id:r.id,points:r.points,radiusM:r.interface.radiusM}));}),rightRoutesAdded:planned.filter(r=>r.id.startsWith('P-SA-2/')).length,batteryServiceAllocationDeferred:true};
    assert(Object.entries(report.preservation).filter(([key])=>!['originalObstacleCount','rightRoutesAdded'].includes(key)).every(([,value])=>value===true));
    assert.equal(report.preservation.rightRoutesAdded,rightSuccessIds().length);
   }
   snapshotNeighbors();recordPreservation();
   report.beforeRightSnapshot={capturedAt:new Date().toISOString(),rightAttempts:0,integrity:clone(report.requiredNeighborGeometry.integrity),plannedRouteIds:planned.map(r=>r.id)};
   report.proposedRepairGroup={status:'awaiting-first-current-failure',routeIds:[],reason:'No finite right repair pair is selected until an actual current failed attempt supplies its scope.'};
   save('complete-neighbor-snapshot-before-right-bank');
   let rightFailure=false;
   for(const line of right.slice(0,report.limits.maximumRightAttempts)){
    checkBudget();report.inFlightRight={id:line.id,ordinal:report.rightAttempts+1};save('before-right-route:'+line.id);
    const result=attempt(line);assert.equal(result.id,line.id);report.rightReplay.push(result);report.rightAttempt=result;report.rightAttempts=report.rightReplay.length;report.inFlightRight=null;
    log({phase:'right-route',id:line.id,ok:result.ok,attempts:result.attempts,rightOrdinal:report.rightAttempts,routeElapsedMs:result.elapsedMs});
    if(result.ok){
     planned.push(freeze({id:line.id,points:clone(result.points),radiusM:line.radiusM}));
     snapshotNeighbors();recordPreservation();save('after-passing-right-route:'+line.id);continue;
    }
    rightFailure=true;
    const pair=right.filter(l=>Math.floor(l.i/2)===Math.floor(line.i/2));assert.equal(pair.length,2);
    const pairIds=pair.map(l=>l.id),priorRightIds=rightSuccessIds();
    snapshotNeighbors(pair);recordPreservation();
    report.repairSeeds=pair.map(mate=>{const attempt=report.rightReplay.find(r=>r.id===mate.id);return {id:mate.id,status:attempt?attempt.ok?'passing-owned-baseline':'failed-attempt':'unattempted',interface:interfaceRecord(mate),controlPoints:attempt?.controlPoints?clone(attempt.controlPoints):null,points:attempt?.points?clone(attempt.points):null,attemptOk:attempt?.ok??null};});
    report.proposedRepairGroup={status:'diagnosis-only',routeIds:pairIds,harnessId:'P-SA-2',circuitInstance:line.from.userData.circuitInstance,maximumConductors:4,proposedConductors:2,connectorBankIds:['connector-bank:P-SA-2:from','connector-bank:P-SA-2:to'],reason:'The first actually failed current conductor and its opposite-polarity mate share one physical circuit instance and both connector banks. No evidence supports enlarging this pair to the other right-bank circuits.',missingSeedRouteIds:report.repairSeeds.filter(r=>r.status==='unattempted').map(r=>r.id),previousRightSuccessOrder:priorRightIds,frozenNeighbors:{batteryRouteIds:batteries.map(l=>l.id),leftRouteIds:left.map(l=>l.id),payloadRouteIds:proposedRoutes.filter(r=>r.id.startsWith('P-PAY-')).map(r=>r.id),precedingRightRouteIds:priorRightIds.filter(id=>!pairIds.includes(id))},nextAcceptance:{card:'H07',proposedFixture:'orbital-right-bank-pair-checks.mjs',implemented:false,scope:pairIds,requirements:['Provide and revalidate a complete static feed/return candidate pair against every captured neighbor. An unattempted mate has no invented seed.','Retain the eight battery and ten left-collector paths, all 24 payload service envelopes, and prior successful right routes outside this pair.','Prove cable construction, endpoints, finite-radius static clearance and pair self/interline clearance.','If the pair is inseparable from another circuit, record the exact dependency before expanding to at most four conductors.']},followingServiceAcceptance:{card:'H08',implemented:false,scope:pairIds,requiredDomainM:{from:[0,.045],to:[0,.045]},requirements:['After static pair acceptance, prove both complete connector strokes and the independent two-ended withdrawal rectangle for that same finite pair.']}};
    const reserved=[...allObstacles,...terminalVolumes.filter(o=>o.lineId!==line.id)],screen=routeClearance({id:line.id,points:result.points,radiusM:line.radiusM,clearanceM:.002},reserved,{otherRoutes:planned});
    assert.notEqual(screen.reason,'invalid-planning-geometry','The independently checked failed route has invalid diagnostic geometry');
    const obstacle=screen.obstacleId?reserved.find(o=>o.id===screen.obstacleId):null,other=screen.otherRouteId?planned.find(r=>r.id===screen.otherRouteId):null;
    if(screen.obstacleId)assert(obstacle,'Independent witness obstacle is absent from actual geometry');
    if(screen.otherRouteId)assert(other,'Independent witness route is absent from actual planned geometry');
    const owner=proposedRoutes.find(r=>r.id===obstacle?.ownerRouteId);
    const segments=obstacle?result.points.slice(1).flatMap((b,i)=>{const a=result.points[i],clearanceM=segmentObstacleClearance(a,b,obstacle,{radiusM:line.radiusM,clearanceM:.002,routeId:line.id});return clearanceM<-1e-7?[{segment:i,a,b,clearanceM}]:[];}):other?result.points.slice(1).flatMap((b,i)=>other.points.slice(1).flatMap((otherB,j)=>{const a=result.points[i],otherA=other.points[j],clearanceM=segmentSegmentDistance(a,b,otherA,otherB).distanceM-line.radiusM-other.radiusM-Math.max(.002,other.clearanceM??0);return clearanceM<-1e-7?[{segment:i,a,b,otherSegment:j,otherA,otherB,clearanceM}]:[];})):[];
    const witnessVerified=segments.length>0&&segments.every(s=>digest([s.a,s.b])===digest(result.points.slice(s.segment,s.segment+2))&&Number.isFinite(s.clearanceM));
    const plannerNamesSameWitness=obstacle?result.screen?.obstacleId===obstacle.id:other?result.screen?.otherRouteId===other.id:false;
    report.requiredNeighborGeometry.firstFailureBounds=boundsOf([...result.points,...pair.flatMap(l=>[world(l.from),world(l.to)])]);
    report.failure={phase:'right-bank-route',kind:obstacle?.serviceReservoirSweep?'service-reservation-interference':other?'retained-route-interference':'route-planning-failure',routeId:line.id,rightOrdinal:report.rightAttempts,obstacleId:obstacle?.id??null,otherRouteId:other?.id??null,plannerScreen:result.screen||null,independentCompleteRouteScreen:screen,gridFailure:result.gridFailure||null,collidingSegments:segments,obstacle:obstacle?obstacleRecord(obstacle,true):null,otherRoute:other?routeRecord(other):null,obstaclePhysicalIdentity:physicalInventory.find(m=>m.id===obstacle?.sourceMesh)||null,serviceOwner:owner?{ownerRouteId:owner.id,sourceSegment:obstacle.sourceSegment,domainM:owner.serviceDomainM,allocation:owner.allocation,proof:owner.allocation.sweepProof,baselineSegment:[owner.points[obstacle.sourceSegment],owner.points[obstacle.sourceSegment+1]],allOwnerReservationIds:owner.reservationIds}:null,witnessVerification:{routeId:line.id,actualReturnedPoints:witnessVerified,pointCount:result.points.length,pointsDigest:digest(result.points),plannerNamesSameWitness,selection:'The witness is selected by a fresh complete-route check of the actual returned points against current reserved solids and actual planned routes. The raw planner screen remains separately recorded.',independentSegmentFunction:other?'segmentSegmentDistance minus both jacket radii and allocated separation':'segmentObstacleClearance',clearanceM:.002},previousRightSuccessOrder:priorRightIds,meaning:obstacle?.serviceReservoirSweep?'The attempted finite-radius route overlaps a frozen full-domain service reservation. This planning-envelope interference does not itself assert material collision at the mated pose.':other?'The actual attempted route violates finite-radius separation from the exact retained route recorded here. No surrogate obstacle or collision exemption is introduced.':'The current planner rejected this construction; only independently reproduced geometric witnesses support diagnosis completion.',repairGroup:pairIds};
    finish('diagnosis-recorded');break;
   }
   if(!rightFailure){
    assert.equal(report.rightAttempts,10);report.failure=null;report.proposedRepairGroup={status:'no-current-right-failure',routeIds:[],reason:'All ten current right-bank conductors passed this bounded static planning replay with preceding successful paths retained. No failed pair is invented.'};
    snapshotNeighbors();recordPreservation();finish('right-bank-static-planning-passed');
   }
  }
  }
 }
}catch(error){
 electricalRoutingDiagnostics.onPlanningContext=null;
 report.status=error.name==='RuntimeCapError'?'runtime-cap':'fixture-error';report.diagnosisComplete=false;report.boundedExecutionComplete=false;report.error={name:error.name,message:error.message,stack:error.stack};report.sourceFinish=fingerprint();report.unchangedSource=sameRoutingSourceFingerprint(report.sourceStart,report.sourceFinish);save(report.status);log({status:report.status,error:error.message});process.exitCode=1;
}
