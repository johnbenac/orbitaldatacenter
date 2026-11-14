// H09: actual production hookup and inventory. This intentionally stops before
// fluid replanning or unrelated route search and issues no full-scene clearance
// or continuous-motion certificate.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {makeCraft} from './dist/craft.js';
import {electricalRoutingDiagnostics,physicalFlightMeshes} from './dist/installed-electrical-routing.js';
import {prepareAcceptedJuneRackPowerTrays} from './dist/rack-power-trays.js';
import {juneRackPowerTrayInstallation as controlled} from './dist/rack-power-tray-installation.js';
import {sampleMatingReservoir} from './dist/electrical-service-loops.js';
import {sampleConnectionRoute} from './dist/connection-routes.js';
import {routeFromTube} from './dist/routing-audit.js';
import {routingSourceFingerprint,sameRoutingSourceFingerprint} from './scripts/routing-source-fingerprint.mjs';

const started=Date.now(),configurationId='orbital-1-202606';
const outputIndex=process.argv.indexOf('--output'),output=process.argv[outputIndex+1];
assert(outputIndex>=0&&output,'Use --output <H09-installation-result.json>');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const jsonDigest=value=>digest(JSON.stringify(value));
const bytes=path=>readFileSync(new URL(path,import.meta.url));
const read=path=>JSON.parse(bytes(path));
const equal=(actual,expected,message)=>assert.equal(jsonDigest(actual),jsonDigest(expected),message);
const clone=value=>structuredClone(value);
const distance=(a,b)=>Math.hypot(...a.map((x,k)=>x-b[k]));
const point=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const maxGap=(actual,expected)=>{assert.equal(actual.length,expected.length,'Corresponding path sample count');return Math.max(0,...actual.map((p,i)=>{assert(point(p)&&point(expected[i]),'Finite path points');return distance(p,expected[i]);}));};
// World/local conversion can perturb a measured stroke by a few ulps. The
// renderer's longest-piece tie break may then assign an extra ring to another
// equal-length segment. Compare physical polylines in both directions, while
// separately retaining exact nominal-vertex correspondence and the native
// buffer/topology consistency check. Ring-index difference is diagnostic only.
function directedPolylineGap(points,polyline){let maximum2=0;for(const p of points){let nearest2=Infinity;for(let i=1;i<polyline.length;i++){const a=polyline[i-1],b=polyline[i],dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],qx=p[0]-a[0],qy=p[1]-a[1],qz=p[2]-a[2],length2=dx*dx+dy*dy+dz*dz,t=length2?Math.max(0,Math.min(1,(qx*dx+qy*dy+qz*dz)/length2)):0,x=qx-t*dx,y=qy-t*dy,z=qz-t*dz;nearest2=Math.min(nearest2,x*x+y*y+z*z);}maximum2=Math.max(maximum2,nearest2);}return Math.sqrt(maximum2);}
const fingerprint=()=>routingSourceFingerprint({entries:['orbital-rack-installation-checks.mjs']});
const report={schema:'orbital-data-center/H09-installed-tray/1',taskId:'H09',configurationId,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),startedAt:new Date(started).toISOString(),runtimeCapSeconds:240,status:'running',phase:'initializing',completed:false,hookupAccepted:false,inventoryAccepted:false,fullVehicleAcceptance:false,currentSourceClearanceAccepted:false,continuousMotionAccepted:false,publicationAttempted:false,groups:[],sourceStart:fingerprint(),sourceFinish:null,inputs:[],scope:{ownedConductors:44,fullElectricalInventory:104,geometrySearch:false,fullSceneClearance:false,continuousMotion:false,fluidReplanning:false,otherElectricalRouting:false},coverage:{kind:'production-installation-and-update-mapping',withdrawalProbesM:[[0,0],[.045,0],[0,.045],[.045,.045]],restoredMated:false}};
function save(phase){report.phase=phase;report.elapsedMs=Date.now()-started;writeFileSync(output+'.tmp',JSON.stringify(report,null,2)+'\n');renameSync(output+'.tmp',output);}
function group(name,details={}){report.groups.push({name,ok:true,...details});save(name);console.log(JSON.stringify({phase:name,elapsedMs:Date.now()-started,...details}));}
function pin(path,expectedSha256,expectedBytes){const value=bytes(path),sha256=digest(value);assert.equal(sha256,expectedSha256,'Pinned evidence '+path);if(expectedBytes!==undefined)assert.equal(value.length,expectedBytes,'Pinned size '+path);if(!report.inputs.some(row=>row.path===path))report.inputs.push({path,sha256,bytes:value.length});return value;}
const interfaceKeys=['id','harnessId','index','fromPortId','toPortId','fromBoxId','toBoxId','from','to','fromNormal','toNormal','radiusM','bendRadiusM','terminationAllowanceM','fromTravelM','toTravelM'];
const allocationKeys=['controls','first','last','axis','bendRadiusM','fromNormal','toNormal','fromTravelM','toTravelM','fromPrefixLast','toSuffixFirst','controlAlignment'];
const select=(row,keys)=>Object.fromEntries(keys.filter(key=>row[key]!==undefined).map(key=>[key,row[key]]));
const owner=(node,key)=>{for(let p=node;p;p=p.parent)if(p.userData?.[key]!=null)return p.userData[key];};
function pathOf(node,root){const path=[];for(let p=node;p&&p!==root;p=p.parent)path.push((p.parent?.children.indexOf(p)??0)+':'+(p.name||p.type));return 'body/'+path.reverse().join('/');}
function geometryDigest(mesh){const hash=createHash('sha256'),p=mesh.geometry.attributes.position;hash.update(Buffer.from(p.array.buffer,p.array.byteOffset,p.array.byteLength));if(mesh.geometry.index){const a=mesh.geometry.index.array;hash.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}return hash.digest('hex');}
const meshKeys=['path','name','electricalBoxId','portId','part','physicalPartId','geometryType','geometryDigest','bodyMatrix'];
function physicalInventory(factory){const root=factory.root;root.updateWorldMatrix(true,true);const meshes=[...new Set([...physicalFlightMeshes(root),...factory.fluidConnections.map(c=>c.tube.mesh)])];return meshes.map(mesh=>select({path:pathOf(mesh,root),name:mesh.name,electricalBoxId:owner(mesh,'electricalBoxId')??null,portId:owner(mesh,'electricalPortId')??null,part:owner(mesh,'part')??null,physicalPartId:owner(mesh,'physicalPartId')??null,geometryType:mesh.geometry.type,geometryDigest:geometryDigest(mesh),bodyMatrix:[...root.matrixWorld.clone().invert().multiply(mesh.matrixWorld).elements]},meshKeys));}

save('before-evidence-read');
try{
 const manifestPath='./docs/harnessing-work/H09-input-manifest.json',manifestBytes=bytes(manifestPath),manifest=JSON.parse(manifestBytes);
 report.inputs.push({path:manifestPath,sha256:digest(manifestBytes),bytes:manifestBytes.length});
 assert.equal(manifest.configurationId,configurationId);assert.equal(manifest.inputs.length,6);
 equal(controlled.sourceRecords,manifest.inputs,'Browser source provenance matches declared exact inputs');
 for(const input of manifest.inputs)pin('./'+input.path,input.sha256,input.bytes);
 const h06=JSON.parse(gunzipSync(bytes('./docs/harnessing-work/H06-current-evidence.json.gz')));
 const prefix='./docs/harnessing-work/H08-all-targets/';
 const models=read(prefix+'model-bundles/dispatch-candidate-p21.json'),common=read(prefix+'receipts/dispatch-static-p23.json'),closed=read(prefix+'receipts/all-five-acceptance-p23.json'),ledger=read(prefix+'H08-CLOSE-P23-ledger.json'),index=read(prefix+'receipt-index-p23.json');
 assert(h06.postAllocationValidation.ok&&h06.postAllocationValidation.rows.length===34,'The retained payload/left construction was accepted');
 assert(ledger.taskCompleted&&ledger.H08CloseCompleted&&ledger.H08Accepted&&ledger.bankH08Accepted,'Final H08 completion prerequisite');
 assert(closed.completed&&closed.accepted&&closed.H08Accepted&&closed.closure.ok&&closed.closure.geometryRerun===false,'Exact-five native closure prerequisite');
 assert(common.completed&&common.accepted&&common.staticAccepted&&common.preparation.ready,'P23 common static prerequisite');
 equal(index.receipts.map(row=>row.pairIndex),[0,1,2,3,4],'Exactly five ordered accepted receipts');
 assert.equal(ledger.commonIdentity.bankIdentity.modelBundleSha256,digest(bytes(prefix+'model-bundles/dispatch-candidate-p21.json')));
 assert.equal(ledger.commonIdentity.bankIdentity.frozenSceneSha256,digest(bytes('./docs/harnessing-work/H06-current-evidence.json.gz')));
 equal(closed.bankIdentity,common.bankIdentity,'Closure/common static identity');
 for(const member of ledger.members){
  const native=JSON.parse(pin('./'+member.receipt.path,member.receipt.sha256,member.receipt.bytes));
  const indexed=index.receipts.find(row=>row.pairIndex===member.pairIndex);
  assert(indexed&&indexed.receipt===member.receipt.path&&indexed.sha256===member.receipt.sha256);
  assert(native.completed&&native.accepted&&native.H08Accepted&&native.unchangedSource&&native.unchangedChecker&&native.unchangedInputs);
  equal(native.bankIdentity,closed.bankIdentity,'All members retain one common identity');
  assert(member.coverage.completeCertifiedCoverage&&member.coverage.completePartition);
  assert.equal(member.coverageByStatus.rejected.cells,0);assert.equal(member.coverageByStatus.unresolved.cells,0);
 }
 report.historicalPrerequisite={H08CloseCompleted:true,pairs:5,sourceFingerprint:ledger.commonIdentity.sourceFingerprint,checkerFingerprint:ledger.commonIdentity.checkerFingerprint,bankIdentitySha256:ledger.commonIdentity.bankIdentitySha256,transferredToH09Source:false};
 group('accepted-source-prerequisites',{acceptedPairs:5});

 const expectedInterfaces=h06.reproductionStates[0].interfaces.map(row=>select(row,interfaceKeys));
 const expectedRows=[...h06.frozenProposal.routes.map(row=>({id:row.id,allocation:select(row.allocation,allocationKeys),sweepId:row.id+':coordinated-service',sweepClearanceM:0})),...models.models.map(row=>({id:row.id,allocation:row.allocation,sweepId:row.id,sweepClearanceM:.002}))];
 equal(controlled.interfaces,expectedInterfaces,'All 104 browser interface records equal independent H06 data');
 equal(controlled.rows,expectedRows,'All 44 browser allocations equal independent H06/P21 data');
 equal(controlled.replacedReservationIds,h06.frozenProposal.replacedVirtualApproachIds,'Exactly the declared virtual terminal replacements');
 assert.equal(controlled.rows.length,44);assert.equal(controlled.interfaces.length,104);assert.equal(new Set(controlled.rows.map(row=>row.id)).size,44);
 assert.equal(controlled.rows.find(row=>row.id==='P-SA-2/8').allocation.fromPrefixLast,3,'Preserve repaired source payout');
 assert(Object.isFrozen(controlled)&&controlled.rows.every(row=>Object.isFrozen(row.allocation.controls)),'Controlled input arrays are immutable');
 const expectedPaths=new Map([...h06.frozenProposal.routes,...common.staticChecks.pairs.flatMap(pair=>pair.checks.constructedRoutes)].map(row=>[row.id,row.points]));
 const expectedSweeps=[...h06.frozenProposal.reservations,...common.preparation.constructionChecks.flatMap(row=>row.affineSweep.obstacles)];
 const expectedById=new Map(expectedRows.map(row=>[row.id,row]));
 group('controlled-data-equality',{ownedAllocations:44,interfaces:104,reservations:expectedSweeps.length});

 const source=bytes('./dist/installed-electrical-routing.js').toString('utf8');
 const observerAt=source.indexOf('electricalRoutingDiagnostics.onTrayInstallation?.('),firstFluidAt=source.indexOf('if(planFluidRoutes)factory.replanFluidConnections?.({reservedObstacles:fluidPlanningReservations})');
 assert(observerAt>0&&firstFluidAt>observerAt,'Observer precedes the actual first fluid planning call using the exposed registry');
 assert(source.includes('for(const line of lines){\n  if(line.controlledTray)continue;'),'Controlled lines bypass generic route search');
 assert(source.includes('function allocateLineService(line){\n  if(line.controlledTray)return;'),'Both incremental and batch service paths preserve the exact allocation');
 assert(source.includes('inline?.update();updateAcceptedTrayLines();'),'Normal production update uses the observed helper');
 assert(source.includes('if(line.controlledTray)continue;\n   if(line.movingFrame)'),'Normal generic update cannot overwrite controlled tubes');
 group('production-call-order-and-preservation');

 const painter=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});
 globalThis.document={createElement:()=>({getContext:()=>painter})};
 const stop=new Error('H09 actual installation boundary'),h=sizeDesign(buildReferenceDesign(configurationId));
 let context,routeSearches=0,serviceSearches=0;
 electricalRoutingDiagnostics.onBeforeRoute=()=>routeSearches++;
 electricalRoutingDiagnostics.onBeforeService=()=>serviceSearches++;
 electricalRoutingDiagnostics.onTrayInstallation=value=>{context=value;throw stop;};
 save('before-production-installation');
 try{makeCraft(h);}catch(error){if(error!==stop)throw error;}finally{electricalRoutingDiagnostics.onTrayInstallation=null;electricalRoutingDiagnostics.onBeforeRoute=null;electricalRoutingDiagnostics.onBeforeService=null;}
 assert(context,'Actual production installation boundary reached');assert.equal(routeSearches,0);assert.equal(serviceSearches,0);
 const {factory,architecture,lines,world,normal,rackPowerTrays,terminalVolumes,originalTerminalVolumes,servicePlanningObstacles,fluidPlanningReservations,allObstacles,planned,plans,controlledTrayLines,updateAcceptedTrayLines}=context;
 assert(rackPowerTrays.applicable&&rackPowerTrays.ok,rackPowerTrays.reason||'Complete production allocation admission');
 assert.equal(rackPowerTrays.currentSourceClearanceAccepted,false);assert.equal(rackPowerTrays.fullVehicleAcceptance,false);
 assert.equal(lines.length,104);assert.equal(new Set(lines.map(line=>line.id)).size,104);assert.equal(new Set(lines.map(line=>line.tube.mesh)).size,104);
 equal(lines.map(line=>line.id),h06.reproductionStates[0].productionLineOrder,'Complete actual electrical ordering retained');
 assert.equal(context.routes.size,82);assert.equal(context.ports.size,164);assert.equal(architecture.boxes.length,46);
 assert.equal(controlledTrayLines.length,44);assert.equal(lines.filter(line=>!line.controlledTray).length,60);
 assert.equal(plans.size,44);assert.equal(planned.length,44);assert.equal(new Set(planned.map(row=>row.id)).size,44);
 for(const line of lines){const expected=expectedInterfaces.find(row=>row.id===line.id);assert(expected);assert.equal(line.radiusM,expected.radiusM);assert.equal(line.tube.radiusM,expected.radiusM);assert.equal(line.bendRadiusM,expected.bendRadiusM);assert.equal(line.r.from.matingTravel,expected.fromTravelM);assert.equal(line.r.to.matingTravel,expected.toTravelM);}
 const hardware=physicalInventory(factory),expectedHardware=h06.baseline.physicalMeshes.map(row=>select(row,meshKeys));
 equal(hardware,expectedHardware,'Every original physical mesh, connector, material buffer and datum retained');
 assert.equal(hardware.length,2390);assert.equal(hardware.filter(row=>row.electricalBoxId==='thermal-drive').length,13);
 assert(architecture.boxById['thermal-drive'].routingAccommodation,'H05 controller pocket remains enabled');
 const fluidProjection=route=>select(route,['id','points','radiusM','sectionIds']);
 const actualFluids=factory.fluidRoutingSnapshot().routes.map(fluidProjection),expectedFluids=h06.baseline.fluidRoutes.map(fluidProjection);
 equal(actualFluids,expectedFluids,'All original native fluid paths retained at installation boundary');assert.equal(actualFluids.length,135);assert.equal(factory.fluidConnections.length,175);
 report.inventory={electricalCircuits:104,ownedTrayCircuits:44,unownedElectricalCircuits:60,harnesses:82,ports:164,boxes:46,physicalMeshes:2390,fluidMeshes:175,nativeFluidRoutes:135,pumpControllerMeshes:13,pumpControllerPositionM:architecture.boxById['thermal-drive'].positionM,hardwareSha256:jsonDigest(hardware),fluidGeometrySha256:jsonDigest(actualFluids),routeSearches,serviceSearches,boundary:context.boundary};
 group('actual-installed-hardware-inventory',report.inventory);

 equal(originalTerminalVolumes,h06.baseline.terminalReservations,'Unmodified original terminal registry');
 const replaced=new Set(controlled.replacedReservationIds);
 equal(terminalVolumes,originalTerminalVolumes.filter(row=>!replaced.has(row.id)),'Exactly ten declared virtual approaches replaced');
 assert.equal(originalTerminalVolumes.length,533);assert.equal(terminalVolumes.length,523);assert.equal(replaced.size,10);
 equal(rackPowerTrays.reservations,expectedSweeps,'Actual service reservations exactly match retained H06/P23 geometry');
 equal(servicePlanningObstacles,expectedSweeps,'Electrical service registry contains every accepted sweep');
 assert.equal(new Set(expectedSweeps.map(row=>row.id)).size,expectedSweeps.length,'Unique sweep IDs');
 for(const reservation of rackPowerTrays.reservations){assert(allObstacles.includes(reservation),'Exact reservation enters actual electrical planner');assert(fluidPlanningReservations.includes(reservation),'Exact reservation enters actual first-fluid registry');}
 for(const terminal of terminalVolumes)assert(fluidPlanningReservations.includes(terminal),'Retained terminals reach fluid planner');
 assert(!fluidPlanningReservations.some(row=>replaced.has(row.id)),'Replaced virtual approaches do not survive in the fluid registry');
 report.reservations={originalTerminals:533,retainedTerminals:523,replacedIds:[...replaced],payloadAndLeftSweeps:h06.frozenProposal.reservations.length,rightSweeps:expectedSweeps.length-h06.frozenProposal.reservations.length,totalSweeps:expectedSweeps.length,sweepSha256:jsonDigest(expectedSweeps),fluidPlanningReservationCount:fluidPlanningReservations.length,geometryEqualsRetainedRecords:true};
 group('actual-service-and-fluid-reservations',report.reservations);

 report.ownedRoutes=controlledTrayLines.map(line=>{const expected=expectedById.get(line.id),sourceAllocation=select(line.serviceAllocation,allocationKeys);equal(sourceAllocation,expected.allocation,'Installed exact allocation '+line.id);equal(line.staticPoints,expectedPaths.get(line.id),'Installed exact mated path '+line.id);assert.equal(plans.get(line.id),line);assert.equal(planned.filter(row=>row.id===line.id).length,1);return {id:line.id,allocationSha256:jsonDigest(sourceAllocation),matedPathSha256:jsonDigest(line.staticPoints),radiusM:line.radiusM,bendRadiusM:line.bendRadiusM,restLengthM:line.restLengthM,reservationCount:rackPowerTrays.reservations.filter(row=>row.ownerRouteId===line.id).length};});
 group('installed-allocation-and-baseline-equality',{ownedRoutes:report.ownedRoutes.length});

 const unowned=lines.filter(line=>!line.controlledTray),unownedBuffers=unowned.map(line=>({id:line.id,sha256:geometryDigest(line.tube.mesh)}));
 const originalPorts=new Map();for(const line of controlledTrayLines)for(const end of ['from','to'])originalPorts.set(line.r[end].plug,[...line.r[end].plug.position.toArray()]);
 const fromPlugs=new Set(controlledTrayLines.map(line=>line.r.from.plug)),toPlugs=new Set(controlledTrayLines.map(line=>line.r.to.plug));
 assert([...fromPlugs].every(plug=>!toPlugs.has(plug)),'Probe port directions have distinct plug roots');
 report.updateProbes=[];
 function probe(fromWithdrawalM,toWithdrawalM){
  for(const plug of fromPlugs)plug.position.z=originalPorts.get(plug)[2]+fromWithdrawalM;
  for(const plug of toPlugs)plug.position.z=originalPorts.get(plug)[2]+toWithdrawalM;
  factory.root.updateWorldMatrix(true,true);updateAcceptedTrayLines();
  let maximumNominalGapM=0,maximumBufferGapM=0,maximumRingIndexDifferenceM=0,maximumEndpointGapM=0,maximumRadiusErrorM=0;
  const bufferDigests=[];
  for(const line of controlledTrayLines){
   const expected=sampleMatingReservoir(expectedById.get(line.id).allocation,{fromWithdrawalM,toWithdrawalM}),nominalGap=maxGap(line.tube.route.points,expected.points);
   assert(nominalGap<=1e-12,'Exact mapped construction '+line.id);maximumNominalGapM=Math.max(maximumNominalGapM,nominalGap);
   const actual=routeFromTube(line.tube,{id:line.id,frame:factory.root,from:line.from,to:line.to}),rendered=sampleConnectionRoute(expected.points,384,{preserveVertices:true}),ringIndexDifferenceM=maxGap(actual.points,rendered),bufferGap=Math.max(directedPolylineGap(actual.points,expected.points),directedPolylineGap(expected.points,actual.points));
   if(!(bufferGap<=2e-6&&Number.isFinite(actual.renderedCenterlineMismatchM)&&actual.renderedCenterlineMismatchM<=2e-6))report.failedProbe={routeId:line.id,fromWithdrawalM,toWithdrawalM,nominalGapM:nominalGap,bufferGapM:bufferGap,ringIndexDifferenceM,nativeBufferMismatchM:actual.renderedCenterlineMismatchM};
   assert(bufferGap<=2e-6&&Number.isFinite(actual.renderedCenterlineMismatchM)&&actual.renderedCenterlineMismatchM<=2e-6,'Actual rendered buffer '+line.id);maximumBufferGapM=Math.max(maximumBufferGapM,bufferGap);maximumRingIndexDifferenceM=Math.max(maximumRingIndexDifferenceM,ringIndexDifferenceM);
   const endpointGap=Math.max(distance(actual.points[0],world(line.from)),distance(actual.points.at(-1),world(line.to)));assert(endpointGap<=2e-6,'Actual cable endpoint closure '+line.id);maximumEndpointGapM=Math.max(maximumEndpointGapM,endpointGap);
   const radiusError=Math.abs(actual.radiusM-line.radiusM);assert(radiusError<=2e-6,'Actual jacket radius '+line.id);maximumRadiusErrorM=Math.max(maximumRadiusErrorM,radiusError);
   assert(!expected.bendLimited);assert(Math.abs(expected.lengthM-line.restLengthM)<=1e-9,'Retained construction length '+line.id);
   bufferDigests.push({id:line.id,sha256:geometryDigest(line.tube.mesh)});
  }
  equal(unowned.map(line=>({id:line.id,sha256:geometryDigest(line.tube.mesh)})),unownedBuffers,'All 60 unowned tube buffers remain present and unchanged');
  return {fromWithdrawalM,toWithdrawalM,ownedRenderedRoutes:44,maximumNominalGapM,maximumBufferGapM,maximumRingIndexDifferenceM,ringIndexDifferenceIsDiagnosticOnly:true,maximumEndpointGapM,maximumRadiusErrorM,bufferDigest:jsonDigest(bufferDigests),unownedBuffersUnchanged:true};
 }
 try{for(const [from,to] of report.coverage.withdrawalProbesM)report.updateProbes.push(probe(from,to));}finally{for(const [plug,position] of originalPorts)plug.position.set(...position);factory.root.updateWorldMatrix(true,true);updateAcceptedTrayLines();}
 report.matedRestore=probe(0,0);report.coverage.restoredMated=true;
 equal(physicalInventory(factory),hardware,'All physical material and connector datums restored exactly');
 group('production-update-mapping-probes',{probes:4,ownedRoutesPerProbe:44,uniqueFromPlugs:fromPlugs.size,uniqueToPlugs:toPlugs.size,restoredMated:true});

 const parameters={configurationId,familyId:context.layout.familyId,lines,world,normal,terminalVolumes:originalTerminalVolumes};
 const changeLine=(id,change)=>lines.map(line=>line.id===id?change(line):line),selected=controlledTrayLines[0],unownedLine=unowned[0];
 const cases=[
  ['wrong-configuration',{configurationId:'orbital-1-202609'},false],
  ['wrong-family',{familyId:'protected-core'},true],
  ['missing-id',{lines:lines.filter(line=>line.id!==selected.id)},true],
  ['duplicate-id',{lines:lines.map((line,i)=>i===lines.length-1?lines[0]:line)},true],
  ['nonfinite-endpoint',{world:anchor=>anchor===selected.from?[NaN,0,0]:world(anchor)},true],
  ['changed-endpoint',{world:anchor=>anchor===selected.to?world(anchor).map((v,k)=>v+(k===0?.001:0)):world(anchor)},true],
  ['changed-unowned-endpoint',{world:anchor=>anchor===unownedLine.from?world(anchor).map((v,k)=>v+(k===0?.001:0)):world(anchor)},true],
  ['changed-jacket',{lines:changeLine(selected.id,line=>({...line,radiusM:line.radiusM+.001}))},true],
  ['changed-stroke',{lines:changeLine(selected.id,line=>({...line,r:{...line.r,from:{...line.r.from,matingTravel:.044}}}))},true],
  ['nonfinite-construction',{lines:changeLine(selected.id,line=>({...line,bendRadiusM:NaN}))},true],
  ['missing-replaced-terminal',{terminalVolumes:originalTerminalVolumes.filter(row=>row.id!==controlled.replacedReservationIds[0])},true],
  ['duplicate-replaced-terminal',{terminalVolumes:[...originalTerminalVolumes,originalTerminalVolumes.find(row=>row.id===controlled.replacedReservationIds[0])]},true]
 ];
 report.guardCases=cases.map(([name,override,applicable])=>{const result=prepareAcceptedJuneRackPowerTrays({...parameters,...override});assert.equal(result.applicable,applicable,name);if(applicable)assert.equal(result.ok,false,name);assert.equal(result.records.size,0,name+' installs no partial rows');assert.equal(result.reservations.length,0,name+' creates no partial reservations');assert.equal(result.replacedReservationIds.length,0,name+' removes no terminals');return {name,ok:true,applicable,reason:result.reason||'outside-controlled-configuration',installedRows:0};});
 equal(physicalInventory(factory),hardware,'Rejected admission probes cannot mutate physical material');
 equal(terminalVolumes,originalTerminalVolumes.filter(row=>!replaced.has(row.id)),'Rejected admission probes cannot mutate terminal registry');
 equal(controlled.rows,expectedRows,'Rejected admission probes cannot mutate controlled data');
 group('atomic-admission-negative-regressions',{cases:report.guardCases.length});

 report.sourceFinish=fingerprint();report.unchangedSource=sameRoutingSourceFingerprint(report.sourceStart,report.sourceFinish);assert(report.unchangedSource,'Source changed during H09 acceptance');
 report.unchangedInputs=report.inputs.every(input=>digest(bytes(input.path))===input.sha256);assert(report.unchangedInputs,'Pinned input changed during H09 acceptance');
 assert.notEqual(report.sourceStart.value,ledger.commonIdentity.sourceFingerprint,'H09 owns its changed runtime source identity');
 report.completed=true;report.hookupAccepted=true;report.inventoryAccepted=true;report.status='installed-tray-hookup-accepted';report.finishedAt=new Date().toISOString();
 group('source-and-input-stability',{unchangedSource:true,unchangedInputs:true,hookupAccepted:true,inventoryAccepted:true});
 save('finished');
 console.log(JSON.stringify({status:report.status,completed:report.completed,hookupAccepted:true,inventoryAccepted:true,fullVehicleAcceptance:false,groups:report.groups.length,elapsedMs:report.elapsedMs,output}));
}catch(error){report.status='failed';report.error={name:error.name,message:String(error.message).slice(0,5000),stack:String(error.stack).slice(0,7000)};try{report.sourceFinish=fingerprint();report.unchangedSource=sameRoutingSourceFingerprint(report.sourceStart,report.sourceFinish);}catch{}report.finishedAt=new Date().toISOString();save('failed');console.error(JSON.stringify({status:report.status,phase:report.groups.at(-1)?.name,error:report.error,elapsedMs:report.elapsedMs}));process.exitCode=1;}
