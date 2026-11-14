// H10 saved-context reproduction. This does not construct a scene, search for
// a cable route, change geometry, or issue a static/motion acceptance receipt.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {routeClearance,segmentObstacleClearance,segmentSegmentDistance,simplifyCollisionPolyline,auditRoutes} from './dist/routing-audit.js';
import {routingSourceFingerprint,sameRoutingSourceFingerprint} from './scripts/routing-source-fingerprint.mjs';

const repository=fileURLToPath(new URL('.',import.meta.url));
export const h10Digest=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const point=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const equal=(a,b,message)=>assert.equal(h10Digest(a),h10Digest(b),message);
const finiteMargin=value=>Number.isFinite(value)&&value<-1e-7;

function occupiedCapsule(id,neighbors){
 for(const route of neighbors){
  const prefix=route.id+':segment:';if(!id.startsWith(prefix))continue;
  const index=Number(id.slice(prefix.length)),points=simplifyCollisionPolyline(route.points,2e-6),radiusM=route.radiusM+2e-6;
  if(!Number.isInteger(index)||index<0||index>=points.length-1)continue;
  const a=points[index],b=points[index+1];
  return {id,type:'capsule',a,b,radiusM,bounds:{min:[0,1,2].map(k=>Math.min(a[k],b[k])-radiusM),max:[0,1,2].map(k=>Math.max(a[k],b[k])+radiusM)},sourceRouteId:route.id,sourceSimplifiedSegment:index,sourceDeviationM:2e-6};
 }
 return null;
}

function obstacleWitness(route,obstacle,segment){
 assert(Number.isInteger(segment)&&segment>=0&&segment<route.points.length-1,'Valid returned-path segment');
 const a=route.points[segment],b=route.points[segment+1],clearanceM=segmentObstacleClearance(a,b,obstacle,{radiusM:route.radiusM,clearanceM:route.clearanceM,routeId:route.id});
 return {kind:'obstacle-clearance',routeId:route.id,segment,a,b,obstacleId:obstacle.id,obstacleType:obstacle.type,clearanceM,negative:finiteMargin(clearanceM),geometrySha256:h10Digest(obstacle),sourceRouteId:obstacle.sourceRouteId??null,sourceSimplifiedSegment:obstacle.sourceSimplifiedSegment??null};
}

function originalTargetChecks(route,issues,obstacles,neighbors){
 const checks=[];
 for(const [issueIndex,issue] of issues.entries())for(const [scope,record] of [['screen',issue],['grid',issue.grid]]){
  if(!record?.obstacleId)continue;
  const obstacle=obstacles.find(o=>o.id===record.obstacleId)||occupiedCapsule(record.obstacleId,neighbors);
  if(!obstacle){checks.push({issueIndex,scope,obstacleId:record.obstacleId,resolved:false});continue;}
  let best=null;
  for(let segment=0;segment<route.points.length-1;segment++){
   const witness=obstacleWitness(route,obstacle,segment);
   if(Number.isFinite(witness.clearanceM)&&(!best||witness.clearanceM<best.clearanceM))best=witness;
  }
  const named=Number.isInteger(record.segment)&&record.segment<route.points.length-1?obstacleWitness(route,obstacle,record.segment):null;
  checks.push({issueIndex,scope,obstacleId:record.obstacleId,resolved:true,reportedSegment:record.segment??null,reportedSegmentWitness:named,minimumReturnedPathWitness:best,negativeReturnedPath:best?.negative===true,generatedNeighborCapsule:!!obstacle.sourceRouteId});
 }
 return checks;
}

export function replayStarmindFailure(packet){
 assert.equal(packet.schema,'orbital-data-center/H10-frozen-static-context/1');
 assert.equal(packet.configurationId,'starmind-ai1');assert.equal(packet.state.deploymentProgress,1);
 assert.equal(packet.state.planFluidRoutes,true);assert.equal(packet.state.plugWithdrawalM,0);
 assert(packet.failure?.originalEvent?.passed===false,'Original production planner failure retained');
 assert.equal(packet.failure.id,packet.failure.originalEvent.id);
 for(const key of ['interfaces','physicalMeshes','electricalTubes','allObstacles','terminalVolumes','plannedRoutes'])assert.equal(h10Digest(packet[key]),packet.manifests[key].sha256,'Exact '+key+' geometry/identity manifest');
 const route={id:packet.failure.id,points:packet.failure.points,radiusM:packet.failure.radiusM,clearanceM:.002};
 assert(route.points.length>=2&&route.points.every(point)&&Number.isFinite(route.radiusM)&&route.radiusM>0,'Finite actual returned candidate');
 const interfaces=packet.interfaces,expected=packet.inventory.expectedCircuitIds,actual=interfaces.map(row=>row.id);
 equal([...expected].sort(),[...actual].sort(),'Complete architecture circuit inventory');
 assert.equal(new Set(actual).size,actual.length);assert.equal(packet.electricalTubes.length,actual.length);
 equal([...packet.electricalTubes.map(row=>row.id)].sort(),[...actual].sort(),'Every circuit retains its actual rendered tube');
 assert(packet.preservation.hardwareExactlyEqual&&packet.preservation.electricalTubesExactlyEqual&&packet.preservation.interfacesExactlyEqual&&packet.preservation.nativeFluidsExactlyEqual,'Scene inventory and original interfaces preserved');
 const progress=packet.routeProgress;
 assert(progress.length>0&&progress.at(-1).id===route.id&&progress.at(-1).passed===false,'Stopped at the first original failed route');
 assert(progress.slice(0,-1).every(row=>row.passed===true),'Every preceding route succeeded');
 equal(progress.map(row=>row.id),packet.productionLineOrder.slice(0,progress.length),'Original production route order');
 assert(!packet.plannedRoutes.some(row=>row.id===route.id),'Failed route did not enter the accepted prefix');
 const prefix=packet.plannedRoutes.filter(row=>actual.includes(row.id));
 equal(prefix.map(row=>row.id),progress.slice(0,-1).map(row=>row.id),'Every preceding electrical route remains in the planner context');
 const obstacles=[...packet.allObstacles,...packet.terminalVolumes.filter(o=>o.lineId!==route.id)],neighbors=packet.plannedRoutes;
 const screen=routeClearance(route,obstacles,{otherRoutes:neighbors});
 assert.notEqual(screen.reason,'invalid-planning-geometry','Frozen context is valid planning geometry');
 let witness=null;
 if(screen.ok===false&&screen.obstacleId){
  const obstacle=obstacles.find(o=>o.id===screen.obstacleId);assert(obstacle,'Full-context witness names a retained obstacle');
  witness=obstacleWitness(route,obstacle,screen.segment);
  assert(Math.abs(witness.clearanceM-screen.clearanceM)<=1e-12,'Independent exact-segment clearance agrees');
  const material=packet.physicalMeshes.find(row=>row.id===(obstacle.sourceMesh||obstacle.id));
  witness.obstacleIdentity=material||{id:obstacle.id,type:obstacle.type,lineId:obstacle.lineId??null,ownerRouteId:obstacle.ownerRouteId??null,bounds:obstacle.bounds};
  witness.obstacleGeometry=obstacle;
 }else if(screen.ok===false&&screen.otherRouteId){
  const other=neighbors.find(row=>row.id===screen.otherRouteId),[i,j]=screen.segments;assert(other);
  const a=route.points[i],b=route.points[i+1],c=other.points[j],d=other.points[j+1],closest=segmentSegmentDistance(a,b,c,d),requiredM=route.radiusM+other.radiusM+Math.max(route.clearanceM,other.clearanceM??0),clearanceM=closest.distanceM-requiredM;
  assert(Math.abs(clearanceM-screen.clearanceM)<=1e-12,'Independent exact segment-pair clearance agrees');
  witness={kind:'interline-clearance',routeId:route.id,otherRouteId:other.id,segments:[i,j],a,b,c,d,closest,requiredM,clearanceM,negative:finiteMargin(clearanceM),otherRouteGeometry:other};
 }
 // An unsuccessful search is not automatically a collision. If its returned
 // candidate is clear, retain independent finite-radius bend/endpoint/self
 // findings; otherwise leave the diagnosis incomplete rather than inventing
 // a physical witness from the planner's failure status.
 let candidateAudit=null;
 if(!witness?.negative){
  const own=interfaces.find(row=>row.id===route.id);
  candidateAudit=auditRoutes([{...route,minBendRadiusM:own.bendRadiusM,...(Number.isFinite(packet.failure.minimumStaticBendM)?{minimumBendRadiusM:packet.failure.minimumStaticBendM}:{}),from:{position:own.from,normal:own.fromNormal},to:{position:own.to,normal:own.toNormal}}],[],{maxIssues:20});
  const issue=candidateAudit.issues.find(row=>['bend-radius','connector-gap','connector-tangent','self-collision','collapsed-segment'].includes(row.code));
  if(issue)witness={kind:'returned-candidate-geometry',routeId:route.id,issue,negative:true};
 }
 assert(witness?.negative===true,'The original returned candidate needs a reproducible negative geometric witness');
 const originalWitnesses=originalTargetChecks(route,packet.failure.originalEvent.issues,obstacles,neighbors);
 return {ok:true,diagnosisReproduced:true,geometrySearch:false,sceneConstruction:false,fullPoseExecutionComplete:false,staticAccepted:false,continuousMotionAccepted:false,configurationId:packet.configurationId,deploymentProgress:1,routeId:route.id,counts:{electricalCircuits:actual.length,physicalMeshes:packet.physicalMeshes.length,allObstacles:packet.allObstacles.length,terminalVolumes:packet.terminalVolumes.length,foreignTerminalVolumes:obstacles.length-packet.allObstacles.length,plannedRoutes:neighbors.length,precedingElectricalRoutes:prefix.length,attemptedElectricalRoutes:progress.length},fullContextScreen:screen,witness,originalPlannerTargetChecks:originalWitnesses,candidateAudit,distinction:'The full-context screen independently checks the actual failed returned candidate. Its first contact may differ from the planner screen, which can include conservative simplified-neighbor capsules. Original planner issues and all exact-target rechecks remain separately recorded.'};
}

async function main(){
 const argv=process.argv.slice(2),options={};for(let i=0;i<argv.length;i+=2){assert(['--input','--output'].includes(argv[i])&&argv[i+1]&&!options[argv[i]],'Use --input H10-result.json --output H10-replay.json');options[argv[i]]=argv[i+1];}
 assert(options['--input']&&options['--output']);assert(!fs.existsSync(options['--output']),'Do not overwrite a retained replay');
 const started=Date.now(),inputBytes=fs.readFileSync(options['--input']),receipt=JSON.parse(inputBytes),archivePath=path.resolve(repository,receipt.contextArchive.path),relative=path.relative(repository,archivePath);
 assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative),'Context archive stays in the repository');
 assert.equal(receipt.diagnosisComplete,true);assert.equal(receipt.fullPoseExecutionComplete,false);
 const current=routingSourceFingerprint({entries:['starmind-static-diagnostic.mjs']});assert(sameRoutingSourceFingerprint(current,receipt.sourceStart)&&sameRoutingSourceFingerprint(current,receipt.sourceFinish),'Replay exact captured source/checker closure');
 const bytes=fs.readFileSync(archivePath);assert.equal(bytes.length,receipt.contextArchive.bytes);assert.equal(h10Digest(bytes),receipt.contextArchive.sha256);
 const packet=JSON.parse(gunzipSync(bytes)),result=replayStarmindFailure(packet);
 equal(result,receipt.replay,'Independent process reproduces the recorded full result');
 const finish=routingSourceFingerprint({entries:['starmind-static-diagnostic.mjs']});assert(sameRoutingSourceFingerprint(current,finish),'Source unchanged during replay');
 const report={schema:'orbital-data-center/H10-saved-context-replay/1',taskId:'H10',generatedAt:new Date().toISOString(),completed:true,elapsedMs:Date.now()-started,sourceStart:current,sourceFinish:finish,sourceUnchanged:true,input:{path:options['--input'],sha256:h10Digest(inputBytes),bytes:inputBytes.length},contextArchive:receipt.contextArchive,...result};
 fs.writeFileSync(options['--output']+'.tmp',JSON.stringify(report,null,2)+'\n');fs.renameSync(options['--output']+'.tmp',options['--output']);
 console.log(JSON.stringify({completed:true,diagnosisReproduced:true,routeId:result.routeId,witness:result.witness.kind,elapsedMs:report.elapsedMs}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
