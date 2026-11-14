// H10: one deployed, mated Starmind pose, ending at the first actual production
// static-planner failure. No production route, reservation or source is edited.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {canvas} from './render-test-canvas.mjs';
import {sizeDesign} from './dist/design.js';
import {routingCraftConfigurations} from './dist/routing-configurations.js';
import {makeCraft} from './dist/craft.js';
import {electricalRoutingDiagnostics,physicalFlightMeshes} from './dist/installed-electrical-routing.js';
import {routeFromTube} from './dist/routing-audit.js';
import {routingSourceFingerprint,sameRoutingSourceFingerprint} from './scripts/routing-source-fingerprint.mjs';
import {h10Digest,replayStarmindFailure} from './starmind-static-replay.mjs';

const started=Date.now(),configurationId='starmind-ai1',argv=process.argv.slice(2);
assert(argv.length===2&&argv[0]==='--output'&&argv[1],'Use --output docs/harnessing-work/H10-result.json');
const output=argv[1],contextPath=output.endsWith('-result.json')?output.slice(0,-12)+'-context.json.gz':output.replace(/\.json$/,'')+'-context.json.gz';
assert(!fs.existsSync(output)&&!fs.existsSync(contextPath),'Do not overwrite retained H10 evidence');
const clone=value=>JSON.parse(JSON.stringify(value));
const equal=(a,b,message)=>assert.equal(h10Digest(a),h10Digest(b),message);
const fingerprint=()=>routingSourceFingerprint({entries:['starmind-static-diagnostic.mjs']});
const runtimeFingerprint=()=>routingSourceFingerprint({entries:['flight-routing-checks.mjs']});
const sourceStart=fingerprint(),runtimeStart=runtimeFingerprint();
const report={schema:'orbital-data-center/H10-starmind-static-diagnosis/1',taskId:'H10',configurationId,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),startedAt:new Date(started).toISOString(),runtimeCapSeconds:300,status:'running',phase:'initializing',completed:false,diagnosisComplete:false,fullPoseExecutionComplete:false,staticAccepted:false,fullVehicleAcceptance:false,continuousMotionAccepted:false,publicationAttempted:false,sourceStart,sourceFinish:null,runtimeSourceStart:runtimeStart,runtimeSourceFinish:null,scope:{deploymentProgress:1,plugWithdrawalM:0,planFluidRoutes:true,productionGeometryEdits:false,routeReordering:false,maximumFailureGroups:1,sceneConstruction:true,stop:'First failed static line returned by the original production routing loop; preserve its exact full planning context.'},routeProgress:[],serviceProgress:[],inventory:null,failure:null,replay:null};
let tray,context,baseline,failedLine,failureEvent;
const stop=new Error('H10 first original production route failure');
function save(phase){report.phase=phase;report.elapsedMs=Date.now()-started;fs.writeFileSync(output+'.tmp',JSON.stringify(report,null,2)+'\n');fs.renameSync(output+'.tmp',output);}
function progress(phase,details={}){save(phase);console.log(JSON.stringify({phase,elapsedMs:Date.now()-started,...details}));}
function budget(){assert(Date.now()-started<300000,'H10 reached its declared 300-second bound');}
const owner=(node,key)=>{for(let p=node;p;p=p.parent)if(p.userData?.[key]!=null)return p.userData[key];return null;};
function pathOf(node,root){const parts=[];for(let p=node;p&&p!==root;p=p.parent)parts.push((p.parent?.children.indexOf(p)??0)+':'+(p.name||p.type));return 'body/'+parts.reverse().join('/');}
function geometryDigest(mesh){const hash=createHash('sha256'),p=mesh.geometry.attributes.position;hash.update(Buffer.from(p.array.buffer,p.array.byteOffset,p.array.byteLength));if(mesh.geometry.index){const a=mesh.geometry.index.array;hash.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}return hash.digest('hex');}
function meshRecord(mesh,root){return {id:mesh.uuid,path:pathOf(mesh,root),name:mesh.name,electricalBoxId:owner(mesh,'electricalBoxId'),portId:owner(mesh,'electricalPortId'),harnessId:owner(mesh,'electricalHarnessId'),part:owner(mesh,'part'),physicalPartId:owner(mesh,'physicalPartId'),geometryType:mesh.geometry.type,geometrySha256:geometryDigest(mesh),bodyMatrix:[...root.matrixWorld.clone().invert().multiply(mesh.matrixWorld).elements]};}
function physicalInventory(factory){const root=factory.root;root.updateWorldMatrix(true,true);return [...new Set([...physicalFlightMeshes(root),...factory.fluidConnections.map(c=>c.tube.mesh)])].map(mesh=>meshRecord(mesh,root));}
function electricalInventory(value){const {factory,lines}=value,root=factory.root;root.updateWorldMatrix(true,true);return lines.map(line=>{const drawn=routeFromTube(line.tube,{id:line.id,frame:root,from:line.from,to:line.to});return {id:line.id,mesh:meshRecord(line.tube.mesh,root),radiusM:drawn.radiusM,points:drawn.points,declaredRadiusM:line.radiusM};});}
function interfaceInventory(value){const {lines,world,normal}=value;return lines.map(line=>({id:line.id,harnessId:line.r.spec.id,index:line.i,fromPortId:line.r.spec.fromPortId,toPortId:line.r.spec.toPortId,fromBoxId:line.r.spec.fromBoxId,toBoxId:line.r.spec.toBoxId,from:world(line.from),to:world(line.to),fromNormal:normal(line.from),toNormal:normal(line.to),radiusM:line.radiusM,bendRadiusM:line.bendRadiusM,terminationAllowanceM:line.r.spec.terminationAllowanceM,fromTravelM:line.r.from.matingTravel,toTravelM:line.r.to.matingTravel,fromPlugOffsetM:line.r.from.plug.position.toArray(),toPlugOffsetM:line.r.to.plug.position.toArray(),fromEscape:line.fromEscape?clone(line.fromEscape):null,toEscape:line.toEscape?clone(line.toEscape):null,fromPortal:line.fromPortal?{inner:line.fromPortal.inner,outer:line.fromPortal.outer,center:line.fromPortal.center,normal:line.fromPortal.normal,lane:line.fromPortal.lane}:null,toPortal:line.toPortal?{inner:line.toPortal.inner,outer:line.toPortal.outer,center:line.toPortal.center,normal:line.toPortal.normal,lane:line.toPortal.lane}:null}));}
function expectedIds(architecture){return architecture.harnesses.flatMap(spec=>spec.physicalRouteSections?spec.physicalRouteSections.map(row=>row.id):Array.from({length:spec.quantity*(spec.connectorTypeId.startsWith('hv-single')?2:1)},(_,i)=>spec.id+'/'+i));}
function routeRecord(row){return clone(row);}
function manifest(rows){return {count:rows.length,ids:rows.map(row=>row.id),sha256:h10Digest(rows)};}

save('before-production-scene');
try{
 const selected=routingCraftConfigurations().find(([id])=>id===configurationId);assert(selected,'Required shipped Starmind configuration exists');
 const input=selected[1],h=sizeDesign(input);globalThis.document={createElement:()=>canvas()};
 electricalRoutingDiagnostics.onTrayInstallation=value=>{
  budget();tray=value;assert.equal(value.layout.familyId,'starmind-cross');assert.equal(value.controlledTrayLines.length,0,'June installation does not own Starmind conductors');
  const {architecture,lines,factory}=value,ids=expectedIds(architecture),actual=lines.map(line=>line.id);
  equal([...actual].sort(),[...ids].sort(),'Every declared physical circuit is present');assert.equal(new Set(actual).size,actual.length);assert.equal(new Set(lines.map(line=>line.tube.mesh)).size,lines.length);
  assert(lines.every(line=>line.r.from.plug.position.z===0&&line.r.to.plug.position.z===0),'All connector plugs are mated');
  for(const line of lines)for(const node of [line.tube.mesh,line.from,line.to]){let found=false;for(let p=node;p;p=p.parent)if(p===factory.root)found=true;assert(found,'Every tube and connector remains attached to the actual craft');}
  const collector=factory.root.userData.fixedCollectorAccommodation,equipment=factory.root.userData.equipmentRoutingAccommodation,rows=[...collector.rows,...equipment.rows],approaches=rows.reduce((n,row)=>n+row.straightApproaches,0);
  const declared={assemblies:19,connectorApproaches:443,electricalCircuits:496},enumerated={assemblies:rows.length,connectorApproaches:approaches,electricalCircuits:lines.length};
  report.inventory={declaredPriorCounts:declared,currentEnumeratedCounts:enumerated,priorCountsMatch:h10Digest(declared)===h10Digest(enumerated),expectedCircuitIds:ids,actualCircuitIds:actual,harnesses:value.routes.size,ports:value.ports.size,boxes:architecture.boxes.length,collectorAccommodation:clone(collector),equipmentAccommodation:clone(equipment),payloadComb:clone(factory.root.userData.pcduPayloadComb),preFluidPhysicalMeshes:physicalInventory(factory).length,preFluidTubeMeshes:factory.fluidConnections.length};
  progress('complete-hardware-before-native-fluid-replanning',{...enumerated,hardwareScreenPassed:collector.ok&&equipment.ok});
 };
 electricalRoutingDiagnostics.onPlanningContext=value=>{
  budget();context=value;assert(tray&&tray.factory===value.factory,'Same actual installation reaches the planner');
  const nativeFluids=value.factory.fluidRoutingSnapshot();
  baseline={physicalMeshes:physicalInventory(value.factory),electricalTubes:electricalInventory(value),interfaces:interfaceInventory(value),nativeFluids:clone(nativeFluids)};
  equal(value.planned.map(routeRecord),nativeFluids.routes.map(routeRecord),'Actual first-fluid routes enter the original planner without substitution');
  report.inventory.physicalMeshes=baseline.physicalMeshes.length;report.inventory.fluidTubeMeshes=value.factory.fluidConnections.length;report.inventory.nativeFluidRoutes=nativeFluids.routes.length;report.inventory.fluidInventory=clone(nativeFluids.inventory);report.inventory.nativeFluidValidation=clone(nativeFluids.sectionValidation);report.inventory.allObstacles=value.allObstacles.length;report.inventory.terminalReservations=value.terminalVolumes.length;
  progress('native-fluid-replanning-complete',{physicalMeshes:baseline.physicalMeshes.length,nativeFluidRoutes:nativeFluids.routes.length,terminalReservations:value.terminalVolumes.length});
 };
 electricalRoutingDiagnostics.onBeforeRoute=({id})=>{budget();assert(context,'The normal Starmind loop follows its planning-context boundary');report.currentRouteId=id;save('before-production-route');};
 electricalRoutingDiagnostics.onRoute=event=>{
  budget();assert(context,'Unexpected inline route before the declared Starmind planning boundary');
  const index=report.routeProgress.length;assert.equal(event.id,context.lines[index]?.id,'Production sequence remains unchanged');report.routeProgress.push(clone(event));
  if(!event.passed){failedLine=context.lines.find(line=>line.id===event.id);failureEvent=clone(event);progress('first-production-route-failed',{routeId:event.id,attemptedRoutes:report.routeProgress.length,issues:event.issues});throw stop;}
  if(report.routeProgress.length<=2||report.routeProgress.length%25===0)progress('production-route-prefix',{routes:report.routeProgress.length,lastRouteId:event.id});else save('production-route-prefix');
 };
 electricalRoutingDiagnostics.onBeforeService=({id})=>{budget();report.currentServiceId=id;save('before-original-service-allocation');};
 electricalRoutingDiagnostics.onServiceRoute=event=>{report.serviceProgress.push(clone(event));save('original-service-allocation');};
 let observed=false;
 try{makeCraft(h);}catch(error){if(error!==stop)throw error;observed=true;}
 assert(observed&&context&&failedLine&&failureEvent,'No first production route failure was captured; no selected-pose pass is inferred');
 assert(!failedLine.movingFrame&&Array.isArray(failedLine.staticPoints)&&Array.isArray(failedLine.staticControls),'H10 requires a returned static candidate at this diagnostic boundary');
 const physical=physicalInventory(context.factory),tubes=electricalInventory(context),interfaces=interfaceInventory(context),nativeFluids=clone(context.factory.fluidRoutingSnapshot());
 const preservation={hardwareExactlyEqual:h10Digest(physical)===h10Digest(baseline.physicalMeshes),electricalTubesExactlyEqual:h10Digest(tubes)===h10Digest(baseline.electricalTubes),interfacesExactlyEqual:h10Digest(interfaces)===h10Digest(baseline.interfaces),nativeFluidsExactlyEqual:h10Digest(nativeFluids)===h10Digest(baseline.nativeFluids),hardwareBeforeSha256:h10Digest(baseline.physicalMeshes),hardwareAfterSha256:h10Digest(physical),electricalTubesBeforeSha256:h10Digest(baseline.electricalTubes),electricalTubesAfterSha256:h10Digest(tubes),nativeFluidsBeforeSha256:h10Digest(baseline.nativeFluids),nativeFluidsAfterSha256:h10Digest(nativeFluids)};
 assert(Object.entries(preservation).filter(([key])=>key.endsWith('ExactlyEqual')).every(([,value])=>value),'All installed material, native fluids, electrical tubes and interfaces preserved');
 const packet={schema:'orbital-data-center/H10-frozen-static-context/1',taskId:'H10',configurationId,sourceStart,sourceCommit:report.sourceCommit,state:{id:'starmind-ai1-deployed-mated-production',input:clone(input),deploymentProgress:1,deploymentBasis:'The unchanged family factory calls positionPanels(1) before the installed electrical-routing boundary.',frame:'craft-root metres',rootMatrix:[...context.factory.root.matrixWorld.elements],plugWithdrawalM:0,planFluidRoutes:true,construction:'Original makeCraft default installation, including the first native fluid replan, original route order and original production static route search. Stop immediately after its first failed route return.'},inventory:report.inventory,interfaces,physicalMeshes:physical,electricalTubes:tubes,nativeFluidSnapshot:nativeFluids,allObstacles:clone(context.allObstacles),terminalVolumes:clone(context.terminalVolumes),plannedRoutes:context.planned.map(routeRecord),productionLineOrder:context.lines.map(line=>line.id),routeProgress:report.routeProgress,serviceProgress:report.serviceProgress,preservation,failure:{id:failedLine.id,originalEvent:failureEvent,points:clone(failedLine.staticPoints),controlPoints:clone(failedLine.staticControls),radiusM:failedLine.radiusM,bendRadiusM:failedLine.bendRadiusM,minimumStaticBendM:Number.isFinite(failedLine.minimumStaticBendM)?failedLine.minimumStaticBendM:null,restLengthM:failedLine.restLengthM,interface:interfaces.find(row=>row.id===failedLine.id),candidateInstalled:false,candidateBasis:'Actual returned production planner candidate, before the normal final rendering update. Initial actual rendered tube geometry is separately retained for every circuit.'}};
 packet.manifests=Object.fromEntries(['interfaces','physicalMeshes','electricalTubes','allObstacles','terminalVolumes','plannedRoutes'].map(key=>[key,manifest(packet[key])]));
 report.failure=packet.failure;report.preservation=preservation;
 // Persist the exact failed construction before independent reproduction:
 // an assertion or external timeout must not discard the captured geometry.
 const encoded=JSON.stringify(packet)+'\n',archive=gzipSync(Buffer.from(encoded),{level:6});fs.writeFileSync(contextPath+'.tmp',archive);fs.renameSync(contextPath+'.tmp',contextPath);
 report.contextArchive={path:path.relative(process.cwd(),path.resolve(contextPath)).split(path.sep).join('/'),bytes:archive.length,sha256:h10Digest(archive),uncompressedSha256:h10Digest(encoded)};
 progress('saved-frozen-failure-context',{routeId:failedLine.id,plannedRoutes:packet.plannedRoutes.length,archiveBytes:archive.length});
 const replay=replayStarmindFailure(packet);report.replay=replay;
 report.sourceFinish=fingerprint();report.runtimeSourceFinish=runtimeFingerprint();report.unchangedSource=sameRoutingSourceFingerprint(sourceStart,report.sourceFinish);report.unchangedRuntimeSource=sameRoutingSourceFingerprint(runtimeStart,report.runtimeSourceFinish);assert(report.unchangedSource&&report.unchangedRuntimeSource,'Captured diagnostic and production source remain unchanged');
 report.completed=true;report.diagnosisComplete=replay.diagnosisReproduced;report.status='diagnosis-recorded';report.finishedAt=new Date().toISOString();progress('finished',{diagnosisComplete:true,routeId:failedLine.id,witnessKind:replay.witness.kind,fullPoseExecutionComplete:false});
}catch(error){
 report.status='diagnosis-incomplete';report.error={name:error.name,message:error.message,stack:error.stack};report.sourceFinish=fingerprint();report.runtimeSourceFinish=runtimeFingerprint();report.unchangedSource=sameRoutingSourceFingerprint(sourceStart,report.sourceFinish);report.unchangedRuntimeSource=sameRoutingSourceFingerprint(runtimeStart,report.runtimeSourceFinish);report.finishedAt=new Date().toISOString();save('failed');console.error(error.stack);process.exitCode=1;
}finally{for(const key of ['onTrayInstallation','onPlanningContext','onBeforeRoute','onRoute','onBeforeService','onServiceRoute'])electricalRoutingDiagnostics[key]=null;}
