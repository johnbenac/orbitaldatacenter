// Exercise the real installed scene, including every retained cable and pipe.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

if(!process.argv.includes('--construct')){
 execFileSync(process.execPath,[fileURLToPath(new URL('./scripts/compile-starcatcher-construction.mjs',
  import.meta.url)),'--check-source'],{stdio:'inherit',timeout:15000});
 execFileSync(process.execPath,[fileURLToPath(import.meta.url),'--construct'],
  {stdio:'inherit',timeout:90000});
}else{
 const {canvas}=await import('./render-test-canvas.mjs');
 globalThis.document={createElement:canvas};
 const [{sizeDesign},{buildReferenceDesign},{makeCraft},electrical,installed,
  routing,fluid,audit,cache,{anchorInFrame,normalInFrame},{buildEquipmentList}]=await Promise.all([
  import('./dist/design.js'),import('./dist/reference-configurations.js'),import('./dist/craft.js'),
  import('./dist/electrical-architecture.js'),import('./dist/installed-electrical-routing.js'),
  import('./dist/electrical-routing.js'),import('./dist/flight-fluid-routing.js'),
  import('./dist/routing-audit.js'),import('./dist/starcatcher-construction-cache.js'),
  import('./dist/connection-geometry.js'),import('./dist/equipment-list.js')
 ]);
 const h=sizeDesign(buildReferenceDesign('star-catcher-self-powered'));
 const graph=electrical.buildElectricalArchitecture(h),asset=cache.matchStarcatcherConstruction(h,graph);
 assert(asset,'Default Star Catcher has a matching compiled native construction');
 assert(asset.electrical.every(row=>row.planningIssues.length===0),
  'Every shipped default fixed cut must retain successful native static admission');
 assert(asset.fluid.every(row=>row.routingPlan.ok===true),
  'Every shipped fixed pipe must retain successful native static admission');
 const {starcatcherDataRouteProposals}=await import('./dist/starcatcher-data-route-proposals.js'),
  retainedData=new Map(starcatcherDataRouteProposals.map(row=>[row.id,row]));
 assert.equal(retainedData.size,273);
 for(const row of asset.electrical){
  const declared=retainedData.get(row.id);if(!declared)continue;
  assert.deepEqual(row.controls,declared.controlPoints,
   row.id+': default native construction must install the declared data route');
 }
 assert.equal(h.installedHarnessAccounting.status,'installed-route-mass-adopted');
 const {retainedHarnessTakeoff}=await import('./dist/installed-harness-mass.js'),
  takeoff=retainedHarnessTakeoff(h,graph),
  rounded=retainedHarnessTakeoff({...h,bodyWidthM:h.bodyWidthM+1e-14},graph);
 assert(rounded,'Browser math roundoff retains the complete published material inventory');
 assert.equal(rounded.source.capturedDesignKey,takeoff.designKey);
 assert.deepEqual(rounded.records,takeoff.records,'Roundoff cannot alter any measured cut');
 assert.equal(cache.matchStarcatcherConstruction({...h,bodyWidthM:h.bodyWidthM+.001},graph),null,
  'Changed material geometry rejects cached routes');
 assert.equal(cache.matchStarcatcherConstruction({...h,architectureFamilyId:'starmind-cross'},graph),null,
  'A different reference cannot reuse Star Catcher construction');
 const changed=structuredClone(graph);changed.harnesses[0].cableDiameterM+=.001;
 assert.equal(cache.matchStarcatcherConstruction(h,changed),null,'Changed cable radius rejects reuse');
 const before=JSON.stringify({ledger:h.massLedger,accounting:h.installedHarnessAccounting,
  mel:buildEquipmentList(h)}),events=[];
 let query=null,queries=0,triangulations=0;
 routing.electricalRouteDiagnostics.onPlan=()=>assert.fail('Startup searched electrical routes');
 fluid.fluidRoutingDiagnostics.onPlanningContext=()=>assert.fail('Startup searched plumbing');
 installed.electricalRoutingDiagnostics.onBeforeService=()=>assert.fail('Startup searched service loops');
 installed.electricalRoutingDiagnostics.onPlanningContext=context=>assert.equal(context.allObstacles.length,0);
 installed.electricalRoutingDiagnostics.onRoute=event=>events.push(event);
 fluid.fluidRoutingDiagnostics.onFeedthroughStart=record=>{assert.equal(query,null);query={...record,count:0};};
 fluid.fluidRoutingDiagnostics.onFeedthroughEnd=record=>{
  assert(query);assert.equal(query.count,record.queriedCandidateCount);
  assert(record.queriedCandidateCount<=record.candidateMeshCount);
  assert(record.candidateMeshCount<record.physicalMeshCount);
  queries++;query=null;
 };
 audit.routingAuditDiagnostics.onObstacleFromMesh=()=>{
  assert(query,'Startup built collision solids outside a bounded feedthrough query');
  query.count++;triangulations++;
 };
 const started=performance.now(),craft=makeCraft(h,{routingMode:'construction'}),r=craft.electrical.routing;
 assert(r.constructionOnly);assert.equal(query,null);assert(queries>0);
 assert.equal(r.lines.length,537);assert.equal(events.length,537);
 assert(events.every(event=>event.passed!==true),'Displaying geometry is not clearance acceptance');
 assert.deepEqual(new Set(r.lines.map(line=>line.id)),
  new Set(graph.harnessMassRecords.flatMap(row=>row.routeIds)));
 craft.root.updateWorldMatrix(true,true);
 const frame={world:a=>anchorInFrame(a,craft.root).toArray(),normal:a=>normalInFrame(a,craft.root).toArray()};
 const records=cache.validateStarcatcherConstructionLines(asset,r.lines,frame);
 assert(records instanceof Map);
 assert.equal(cache.validateStarcatcherConstructionLines(asset,r.lines.slice(1),frame),null);
 const near=(a,b,label)=>assert(Math.hypot(...a.map((v,i)=>v-b[i]))<3e-6,label);
 for(const line of r.lines){
  const row=records.get(line.id);assert(row);assert(line.constructionOnly);
  assert.equal(line.constructionSource,'compiled-native');
  assert.deepEqual(line.staticControls,row.controls);assert.deepEqual(line.staticPoints,row.points);
  assert.equal(line.radiusM,row.radiusM);assert.equal(line.restLengthM,row.lengthM);
  assert(line.tube.mesh.geometry.attributes.position.count>0);
  const endpoints=line.tube.endpoints.map(point=>craft.root.worldToLocal(
   line.tube.mesh.localToWorld(point.clone())).toArray());
  near(endpoints[0],frame.world(line.from),line.id+' actual source');
  near(endpoints[1],frame.world(line.to),line.id+' actual destination');
  assert.deepEqual(line.planningIssues||[],row.planningIssues||[]);
  assert.equal(electrical.installedLinePlanningAssessment(line).planningPassed,
   row.planningIssues.length||row.servicePlanningIssues.some(issue=>!issue.unassessed)?false:null);
  assert.equal(line.serviceWithdrawalAssessment,'unassessed');
 }
 const fluids=new Map(craft.fluidConnections.map(line=>[line.id,line]));
 for(const row of asset.fluid){
  const line=fluids.get(row.id);assert(line);
  near(anchorInFrame(line.a,line.parent).toArray(),row.from,row.id+' fluid source');
  near(anchorInFrame(line.b,line.parent).toArray(),row.to,row.id+' fluid destination');
  assert.deepEqual(line.staticSampledPoints,row.points);
  assert.equal(line.routingPlan.capturedPlanningOk,row.routingPlan.ok);
  assert.equal(line.routingPlan.ok,row.routingPlan.ok===false?false:null);
 }
 assert.equal(craft.fluidRoutingPlans.length,0);
 assert.equal(r.lines.filter(line=>line.mountedPayload).length,128);
 const schedule=graph.installationHardware.filter(part=>part.id.startsWith('starcatcher:raceway:'));
 assert.equal(schedule.filter(part=>part.id.startsWith('starcatcher:raceway:payload-')).length,24);
 assert.deepEqual(craft.starcatcherHarnessInstallation.schedule,schedule,
  'The scene retains the complete shared payload, data and power material schedule');
 assert.equal(craft.starcatcherHarnessInstallation.materialMeshCount,
  schedule.reduce((count,part)=>count+part.materialPieces.length,0));
 assert.equal(new Set(schedule.map(part=>part.wbs)).size,schedule.length,
  'Every shared raceway has one distinct MEL identity');
 assert.equal(electrical.reconcileInstalledMassFromCraft(h,craft),false);
 assert.equal(JSON.stringify({ledger:h.massLedger,accounting:h.installedHarnessAccounting,
  mel:buildEquipmentList(h)}),before,'Opening a scene preserves the independently adopted mass/MEL');
 console.log('PASS Star Catcher startup:537 complete cuts,128 mounted feeds, preserved plumbing, '+
  'mass and MEL; no route/service searches; '+triangulations+' local feedthrough triangulations; '+
  ((performance.now()-started)/1000).toFixed(2)+' s');
}
