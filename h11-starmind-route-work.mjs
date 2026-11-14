// H11 bounded saved-context construction work. Preserve the exact H10
// context and report whether each retained neighbor has materialized geometry;
// zero-filled tube buffers are identities, not physical cable occupancy.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {routingPlanPresets} from './dist/routing-plan-presets.js';
import {roundedConnectionRoute,routeLength} from './dist/connection-routes.js';
import {routeClearance,auditRoutes,segmentObstacleClearance,segmentSegmentDistance} from './dist/routing-audit.js';
import {routingSourceFingerprint,sameRoutingSourceFingerprint} from './scripts/routing-source-fingerprint.mjs';

export const ownedId='P-SA-1/2';
export const contextPath='docs/harnessing-work/H10-attempt-2-context.json.gz';
export const sha=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const add=(a,b,k=1)=>a.map((x,i)=>x+k*b[i]);
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const bounds=points=>({min:[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),max:[0,1,2].map(i=>Math.max(...points.map(p=>p[i])))});
export function loadContext(){
 const compressed=fs.readFileSync(contextPath);
 assert.equal(compressed.length,24033818);assert.equal(sha(compressed),'fa287d86fad06f88da328b5cf185b24326a65fd3cc28bb74477c323ba86bca5b');
 const raw=gunzipSync(compressed);assert.equal(sha(raw),'5fea399bdc3b8d4cb74b387cfc5e5d92e6189c93d2ed1804fcfa2df8bb80424f');
 const packet=JSON.parse(raw);assert.equal(packet.schema,'orbital-data-center/H10-frozen-static-context/1');assert.equal(packet.configurationId,'starmind-ai1');assert.equal(packet.state.deploymentProgress,1);assert.equal(packet.state.plugWithdrawalM,0);assert.equal(packet.state.planFluidRoutes,true);
 for(const key of ['interfaces','physicalMeshes','electricalTubes','allObstacles','terminalVolumes','plannedRoutes'])assert.equal(sha(packet[key]),packet.manifests[key].sha256,'Frozen '+key+' remains complete and exact');
 assert.equal(packet.interfaces.length,496);assert.equal(packet.physicalMeshes.length,9278);assert.equal(packet.allObstacles.length,8678);assert.equal(packet.terminalVolumes.length,3594);
 return packet;
}
export function fullContext(packet){
 const electricalIds=new Set(packet.interfaces.map(row=>row.id));
 const preceding=packet.plannedRoutes.filter(row=>electricalIds.has(row.id));
 const fluids=packet.plannedRoutes.filter(row=>!electricalIds.has(row.id));
 assert.equal(preceding.length,19);assert.equal(fluids.length,595);
 const authoritative=new Map(preceding.map(row=>[row.id,row]));
 const electrical=packet.electricalTubes.filter(row=>row.id!==ownedId).map(row=>authoritative.get(row.id)||{id:row.id,points:row.points,radiusM:row.radiusM,geometryStatus:'retained-initial-provisional'});
 assert.equal(electrical.length,495);assert.equal(electrical.filter(row=>row.geometryStatus==='retained-initial-provisional').length,476);
 const neighbors=[...fluids,...electrical];assert.equal(new Set(neighbors.map(row=>row.id)).size,1090);assert.equal(neighbors.length,1090);
 const foreignTerminals=packet.terminalVolumes.filter(row=>row.lineId!==ownedId);assert.equal(foreignTerminals.length,3590);
 return {own:packet.interfaces.find(row=>row.id===ownedId),neighbors,preceding,fluids,obstacles:[...packet.allObstacles,...foreignTerminals],foreignTerminals};
}
function inspection(packet,context){
 const ids=['P-SA-1/1','P-SA-1/0','P-SA-1/3',ownedId],interfaces=packet.interfaces.filter(row=>ids.includes(row.id));
 const selected=interfaces.map(row=>({interface:row,planned:packet.plannedRoutes.find(route=>route.id===row.id)||null,presetMatches:routingPlanPresets.filter(record=>{const [a,b,na,nb,r,R]=JSON.parse(record.key);return distance(a,row.from)<1e-8&&distance(b,row.to)<1e-8&&distance(na,row.fromNormal)<1e-8&&distance(nb,row.toNormal)<1e-8&&Math.abs(r-row.radiusM)<1e-8&&Math.abs(R-row.bendRadiusM)<1e-8;})}));
 const meshById=new Map(packet.physicalMeshes.map(row=>[row.id,row]));
 const bodyMaterial=packet.allObstacles.filter(row=>row.type==='mesh').map(row=>({id:row.id,bounds:row.bounds,triangles:row.triangles.length,apertures:row.apertures?.length||0,identity:meshById.get(row.sourceMesh||row.id)||null})).filter(row=>['compute','body','pcdu','frame'].includes(row.identity?.part)||row.id==='973118c6-e49b-47a4-9dad-a18d7e475896');
 return {selected,bodyMaterial,neighborManifest:{count:context.neighbors.length,electrical:495,precedingElectrical:19,provisionalElectrical:476,nativeFluid:595,ids:context.neighbors.map(row=>row.id),sha256:sha(context.neighbors)},frozenManifests:packet.manifests,ownBounds:bounds([context.own.from,context.own.to]),input:packet.state.input};
}
export function probe(controls,context){
 const {own,obstacles,neighbors}=context,shape=roundedConnectionRoute(controls,own.bendRadiusM);
 const route={id:own.id,points:shape.points,radiusM:own.radiusM,clearanceM:.002,minBendRadiusM:own.bendRadiusM,from:{position:own.from,normal:own.fromNormal},to:{position:own.to,normal:own.toNormal}};
 // The constructor bound is reported separately. The audit also measures
 // sampled curvature rather than accepting a declared minimum in its place.
 const intrinsic=auditRoutes([route],[],{maxIssues:10});
 const screen=routeClearance(route,obstacles,{otherRoutes:neighbors});
 return {controlPoints:controls,shape,intrinsic,screen,passed:!shape.bendLimited&&intrinsic.ok&&screen.ok,neighborCount:neighbors.length,physicalObstacleCount:obstacles.length};
}
function hypothesisA(packet,context){
 const mate=packet.interfaces.find(row=>row.id==='P-SA-1/3'),saved=packet.plannedRoutes.find(row=>row.id===mate.id),lead=mate.bendRadiusM*2.4+.015,top=mate.from[1]+mate.bendRadiusM*2.2+.030;
 const construction=(own,y,zOffset)=>{const a=own.from,b=own.to,p=add(a,own.fromNormal,lead),q=add(b,own.toNormal,lead);p[2]+=zOffset;q[2]+=zOffset;return [a,p,[p[0],y,p[2]],[q[0],y,q[2]],q,b].map(p=>[...p]);};
 const recovered=construction(mate,top,0),shape=roundedConnectionRoute(recovered,mate.bendRadiusM);
 assert.equal(shape.points.length,saved.points.length);assert(shape.points.every((p,i)=>distance(p,saved.points[i])<1e-12),'Mate controls reconstruct its exact retained production path');
 const delta=Math.abs(mate.from[1]-context.own.from[1]);
 return {description:'A parallel overhead lane, separated from the passing mate by staggering both internal axial lead planes in z.',mateControls:recovered,mateReconstructionMaximumErrorM:Math.max(...shape.points.map((p,i)=>distance(p,saved.points[i]))),candidates:[-delta,delta].flatMap(yOffset=>[-delta,-.080,-.100,delta,.080,.100].map(zOffset=>({name:`parallel-y${yOffset.toFixed(5)}-z${zOffset.toFixed(5)}`,yOffsetM:yOffset,zOffsetM:zOffset,controlPoints:construction(context.own,top+yOffset,zOffset)})))};
}
function hypothesisB(packet,context){
 const {from:a,to:b}=context.own;
 return {description:'A separate outboard aft-aisle topology: source axial run outside compute, descent at one rear plane, transverse x run aft of compute, and exact axial entry to PCDU.',candidates:[-2.02,-1.99,-2.05,-2.08,-2.11,-2.20,-2.23,-2.26,-2.29,-2.32,-2.335,-2.345].map(z=>({name:'aft-aisle-z'+z.toFixed(3),rearPlaneM:z,controlPoints:[a,[a[0],a[1],z],[a[0],b[1],z],[b[0],b[1],z],b].map(p=>[...p])}))};
}
function hypothesisC(packet,context){
 const {from:a,to:b}=context.own;
 return {description:'H11-R1: a source fanout beyond the original terminal approaches, before the diagnosed coolant crossing, followed by an outboard aft aisle. Prefix-static construction only.',candidates:[-.65,-.75].flatMap(sourceZ=>[-1.70,-1.65,-1.60].flatMap(laneX=>[-2.02,-2.08].map(rearZ=>({name:`source-z${sourceZ.toFixed(2)}-lane-x${laneX.toFixed(2)}-rear-z${rearZ.toFixed(2)}`,sourcePlaneM:sourceZ,laneXM:laneX,rearPlaneM:rearZ,controlPoints:[a,[a[0],a[1],sourceZ],[laneX,a[1],sourceZ],[laneX,a[1],rearZ],[laneX,b[1],rearZ],[b[0],b[1],rearZ],b].map(p=>[...p])}))))};
}
function provisionalQuality(context){
 const rows=context.neighbors.filter(row=>row.geometryStatus==='retained-initial-provisional').map(row=>({id:row.id,pointCount:row.points.length,uniquePointCount:new Set(row.points.map(p=>p.join(','))).size,bounds:bounds(row.points),lengthM:routeLength(row.points),radiusM:row.radiusM,sha256:sha(row)}));
 return {count:rows.length,collapsedCount:rows.filter(row=>row.uniquePointCount<2||row.lengthM<=1e-8).length,rows,basis:'Actual retained H10 tube-buffer path. A collapsed buffer preserves an object identity but does not establish a physical neighboring cable path.'};
}
function diagnoseD1(packet,context){
 const journals=['hypothesis-a','hypothesis-b'].map(phase=>{const file=`docs/harnessing-work/H11-work/${phase}.json`,bytes=fs.readFileSync(file),result=JSON.parse(bytes);assert(result.completed&&result.candidates.length===12&&!result.acceptedCandidate);return {phase,path:file,sha256:sha(bytes),result};});
 const meshById=new Map(packet.physicalMeshes.map(row=>[row.id,row])),referencedRoutes=new Map(),referencedObstacles=new Map();
 const witnesses=journals.flatMap(journal=>journal.result.candidates.map(candidate=>{
  const screen=candidate.screen,points=candidate.shape.points,common={phase:journal.phase,candidateName:candidate.name,controlPoints:candidate.controlPoints,ownedRadiusM:context.own.radiusM,clearanceAllocationM:.002,originalScreen:screen};
  if(screen.otherRouteId){
   const other=context.neighbors.find(row=>row.id===screen.otherRouteId);assert(other);referencedRoutes.set(other.id,{id:other.id,points:other.points,radiusM:other.radiusM,clearanceM:other.clearanceM??0});
   const [i,j]=screen.segments,a=points[i],b=points[i+1],c=other.points[j],d=other.points[j+1],closest=segmentSegmentDistance(a,b,c,d),requiredM=context.own.radiusM+other.radiusM+Math.max(.002,other.clearanceM??0),marginM=closest.distanceM-requiredM;
   assert(Math.abs(marginM-screen.clearanceM)<1e-12);
   return {...common,kind:'exact-segment-pair',segments:[i,j],ownedSegment:[a,b],otherSegment:[c,d],otherRouteId:other.id,otherRadiusM:other.radiusM,closest,requiredM,marginM};
  }
  const obstacle=context.obstacles.find(row=>row.id===screen.obstacleId);assert(obstacle);referencedObstacles.set(obstacle.id,{geometry:obstacle,identity:meshById.get(obstacle.sourceMesh||obstacle.id)||null,geometrySha256:sha(obstacle)});
  const i=screen.segment,a=points[i],b=points[i+1],marginM=segmentObstacleClearance(a,b,obstacle,{radiusM:context.own.radiusM,clearanceM:.002,routeId:ownedId});assert(Math.abs(marginM-screen.clearanceM)<1e-12);
  return {...common,kind:'exact-segment-obstacle',segment:i,ownedSegment:[a,b],obstacleId:obstacle.id,obstacleType:obstacle.type,obstacleGeometrySha256:sha(obstacle),marginM};
 }));
 const focusPoints=[context.own.from,context.own.to,...witnesses.flatMap(row=>row.otherSegment||[])];
 const localMaterial=context.obstacles.filter(row=>{const bb=row.bounds||{min:row.min,max:row.max};return bb?.min&&focusPoints.some(p=>Math.hypot(...[0,1,2].map(k=>Math.max(bb.min[k]-p[k],0,p[k]-bb.max[k])))<=.35);}).map(row=>({id:row.id,type:row.type,bounds:row.bounds||{min:row.min,max:row.max},lineId:row.lineId??null,triangleCount:row.triangles?.length??null,apertureCount:row.apertures?.length??0,identity:meshById.get(row.sourceMesh||row.id)||null,geometrySha256:sha(row)}));
 const quality=provisionalQuality(context);assert.equal(quality.collapsedCount,476);
 const sourceFiles=['dist/electrical-harness-scene.js','dist/connection-geometry.js','dist/electrical-architecture.js','dist/installed-electrical-routing.js'].map(file=>({path:file,sha256:sha(fs.readFileSync(file))}));
 return {inputJournals:journals.map(({result,...row})=>row),geometrySearch:false,newCandidateCount:0,productionEdits:false,witnesses,referencedRoutes:[...referencedRoutes.values()],referencedObstacles:[...referencedObstacles.values()],localMaterial,connectorFanout:packet.interfaces.filter(row=>row.harnessId==='P-SA-1'),materialization:{...quality,authoritativePreplanningPathsAvailable:false,unplannedIdsAbsentFromPlannedRoutes:quality.rows.every(row=>!packet.plannedRoutes.some(other=>other.id===row.id)),nativeConstructionOrder:['connectionTube constructs zero-filled Float32 buffers and an empty route.points array.','electrical-harness-scene constructs all circuit tubes before calling createInstalledElectricalRouting synchronously.','H10 stops inside that installation call after its twentieth static route returns a failure.','updateRoutes executes only after createInstalledElectricalRouting returns; with installedRouting assigned, it calls installedRouting.update().','The legacy routeElectricalHarness fallback is a different branch and did not supply any H10 path.'],sourceFiles,scopeConsequence:'The 476 saved identities are present, but no accepted or physically materialized complete paths exist in the frozen context. No all-neighbor clearance certificate may count them as complete occupied cable routes.'},nextPrerequisites:[{id:'H11-D2-neighbor-occupancy',question:'Obtain authoritative physical paths for the 476 later electrical circuits or a justified conservative reservation covering them; retain all interfaces, radii and current material. Invented legacy fallback geometry is insufficient.',acceptance:'A complete noncollapsed geometry/coverage manifest for every one of the 495 unowned electrical IDs, with the 19 already-passing paths unchanged.'},{id:'H11-D3-local-fanout',question:'Use the exact native-fluid crossing and paired-route crossings to declare one bounded local fanout construction. It is only an intermediate prefix repair until D2 is resolved.',acceptance:'A finite explicit path family and original full material/native-fluid/19-prefix validation; no claim of full-neighbor acceptance.'}]};
}

async function main(){
 const argv=process.argv.slice(2),options={};for(let i=0;i<argv.length;i+=2){assert(['--phase','--output'].includes(argv[i])&&argv[i+1]);options[argv[i]]=argv[i+1];}
 const phase=options['--phase'],output=options['--output'];assert(['inspect','hypothesis-a','hypothesis-b','hypothesis-c','diagnosis-d1'].includes(phase)&&output);assert(!fs.existsSync(output),'Retain each exact work receipt');
 fs.mkdirSync(path.dirname(output),{recursive:true});const started=Date.now(),fingerprint=()=>routingSourceFingerprint({entries:['h11-starmind-route-work.mjs']}),sourceStart=fingerprint();
 const report={schema:'orbital-data-center/H11-bounded-static-work/1',taskId:'H11',phase,completed:false,status:'initializing',startedAt:new Date(started).toISOString(),sourceStart,candidateLimit:phase.startsWith('hypothesis-')?12:0,ownedId,candidates:[]};
 function save(status){report.status=status;report.elapsedMs=Date.now()-started;fs.writeFileSync(output+'.tmp',JSON.stringify(report,null,2)+'\n');fs.renameSync(output+'.tmp',output);console.log(JSON.stringify({phase,status,elapsedMs:report.elapsedMs,candidates:report.candidates.length}));}
 save('loading-exact-frozen-context');
 try{
  const packet=loadContext(),context=fullContext(packet);save('frozen-context-verified');
  if(phase==='inspect')report.inspection=inspection(packet,context);
  else if(phase==='diagnosis-d1')report.diagnosis=diagnoseD1(packet,context);
  else {
   const activeContext=phase==='hypothesis-c'?{...context,neighbors:[...context.fluids,...context.preceding]}:context;
   const declared=phase==='hypothesis-a'?hypothesisA(packet,context):phase==='hypothesis-b'?hypothesisB(packet,context):hypothesisC(packet,context);report.declaredHypothesis=declared;report.neighborManifest={count:activeContext.neighbors.length,ids:activeContext.neighbors.map(row=>row.id),sha256:sha(activeContext.neighbors)};report.provisionalNeighborQuality=provisionalQuality(context);report.allNeighborPhysicalGeometryEstablished=report.provisionalNeighborQuality.collapsedCount===0;report.fullNeighborAcceptance=false;report.prefixStaticCandidatePassed=false;save('candidate-set-declared');
   for(const proposed of declared.candidates){
    assert(report.candidates.length<12);assert(Date.now()-started<170000,'Internal construction bound reached');
    report.currentCandidate=proposed.name;save('before-candidate');
    const candidate={...proposed,...probe(proposed.controlPoints,activeContext)};report.candidates.push(candidate);save(candidate.passed?'candidate-passed':'candidate-rejected');
    if(candidate.passed){report.acceptedCandidate=candidate;report.prefixStaticCandidatePassed=true;break;}
   }
  }
  report.sourceFinish=fingerprint();assert(sameRoutingSourceFingerprint(sourceStart,report.sourceFinish));report.completed=true;report.finishedAt=new Date().toISOString();save('complete');
 }catch(error){report.error={message:error.message,stack:error.stack};report.finishedAt=new Date().toISOString();save('incomplete');throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
