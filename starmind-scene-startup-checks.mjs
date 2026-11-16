// The first interactive scene must construct the installed spacecraft without
// launching full-scene searches or silently adopting display-only cable lengths.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

if(!process.argv.includes('--construct')){
 execFileSync(process.execPath,[fileURLToPath(new URL('./scripts/compile-starmind-construction.mjs',
  import.meta.url)),'--check-source'],{stdio:'inherit',timeout:15000});
 // This wall bound catches an accidental synchronous search before it can hold
 // a browser for minutes. Operation guards below are the primary regression.
 execFileSync(process.execPath,[fileURLToPath(import.meta.url),'--construct'],
  {stdio:'inherit',timeout:60000});
}else{
 const {canvas}=await import('./render-test-canvas.mjs');
 globalThis.document={createElement:canvas};
 const [{sizeDesign},{buildReferenceDesign},{makeCraft},electrical,
  installed,routing,audit,fluid,{anchorInFrame,normalInFrame},
  {sampleConnectionRoute},{buildEquipmentList},{retainedHarnessTakeoff},cache]=await Promise.all([
  import('./dist/design.js'),
  import('./dist/reference-configurations.js'),import('./dist/craft.js'),
  import('./dist/electrical-architecture.js'),import('./dist/installed-electrical-routing.js'),
  import('./dist/electrical-routing.js'),import('./dist/routing-audit.js'),
  import('./dist/flight-fluid-routing.js'),import('./dist/connection-geometry.js'),
  import('./dist/connection-routes.js'),import('./dist/equipment-list.js'),
  import('./dist/installed-harness-mass.js'),import('./dist/starmind-construction-cache.js')
 ]);
 const calls={electricalSearch:0,fluidSearch:0,service:0,obstacles:0};
 let measuring=false,feedthrough=null;
 const feedthroughQueries=[];
 const forbidden=key=>()=>{if(measuring){calls[key]++;
  assert.fail('First scene construction invoked '+key);}};
 routing.electricalRouteDiagnostics.onPlan=forbidden('electricalSearch');
 audit.routingAuditDiagnostics.onObstacleFromMesh=()=>{
  if(!measuring)return;
  assert(feedthrough,'Startup extracted a full-scene obstacle outside a bounded feedthrough query');
  calls.obstacles++;feedthrough.triangulations++;
 };
 fluid.fluidRoutingDiagnostics.onFeedthroughStart=record=>{
  if(!measuring)return;
  assert.equal(feedthrough,null);feedthrough={...record,triangulations:0};
 };
 fluid.fluidRoutingDiagnostics.onFeedthroughEnd=record=>{
  if(!measuring)return;
  assert(feedthrough);Object.assign(feedthrough,record);
  assert(feedthrough.candidateMeshCount<feedthrough.physicalMeshCount,
   'The bounded feedthrough query excludes unrelated spacecraft solids');
  assert.equal(feedthrough.triangulations,feedthrough.queriedCandidateCount);
  assert(feedthrough.queriedCandidateCount<=feedthrough.candidateMeshCount,
   'Each nearby solid is triangulated at most once in a feedthrough query');
  feedthroughQueries.push(feedthrough);feedthrough=null;
 };
 fluid.fluidRoutingDiagnostics.onPlanningContext=forbidden('fluidSearch');
 fluid.fluidRoutingDiagnostics.onBeforePlan=forbidden('fluidSearch');
 installed.electricalRoutingDiagnostics.onBeforeService=forbidden('service');
 const routeEvents=[];
 installed.electricalRoutingDiagnostics.onRoute=record=>routeEvents.push(record);
 installed.electricalRoutingDiagnostics.onPlanningContext=context=>{
  assert.equal(context.allObstacles.length,0,'First paint does not build collision solids');
 };

 const h=sizeDesign(buildReferenceDesign('starmind-ai1'));
 const g=electrical.buildElectricalArchitecture(h);
 const asset=cache.matchStarmindConstruction(h,g);
 assert(asset,'The shipped default reference has an exact native construction record');
 assert.equal(cache.matchStarmindConstruction({...h,bodyWidthM:h.bodyWidthM+.001},g),null,
  'A changed physical configuration cannot borrow the compiled construction');
 assert(Number.isFinite(g.harnesses[0].wire.areaMM2)&&g.harnesses[0].wire.areaMM2>0);
 const changedGauge={...g,harnesses:g.harnesses.map((harness,index)=>index?harness:
  {...harness,wire:{...harness.wire,areaMM2:harness.wire.areaMM2*1.01}})};
 assert.equal(cache.matchStarmindConstruction(h,changedGauge),null,
  'A changed conductor gauge cannot borrow the compiled construction');
 const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
 const near=(a,b,label)=>assert(distance(a,b)<1e-10,label);
 function renderedTube(tube,points,radiusM,label){
  const actual=tube.sampledPoints(),expected=sampleConnectionRoute(points,
   tube.mesh.userData.connectionSegments,{preserveVertices:true});
  assert.equal(actual.length,expected.length);
  const positions=tube.mesh.geometry.attributes.position.array,
   stride=(tube.mesh.userData.connectionRadialSegments+1)*3;
  actual.forEach((point,i)=>{
   const centre=point.toArray();
   assert(distance(centre,expected[i])<3e-6,label+' rendered ring '+i+' follows its native route');
   assert(Math.abs(distance(Array.from(positions.subarray(i*stride,i*stride+3)),centre)-radiusM)<3e-6,
    label+' rendered ring '+i+' retains its physical cable or pipe radius');
  });
 }
 const accounting=()=>JSON.stringify({dry:h.dryKg,wet:h.wetKg,launch:h.launchKg,
  ledger:h.massLedger,harness:h.installedHarnessAccounting,
  installation:h.cableInstallationHardware,takeoff:h.input.installedHarnessTakeoff,
  revision:h.electricalMassRevision,electrical:h.energySystem.electrical});
 const massBefore=accounting(),melBefore=JSON.stringify(buildEquipmentList(h)),
  takeoffBefore=JSON.stringify(retainedHarnessTakeoff(h,g));
 assert.equal(buildEquipmentList(h).harnessEntries.length,488);

 // Compare actual local tube buffers and world-space end datums with the same
 // native fluid construction before electrical installation. No collision
 // snapshot is needed to show that startup retains the pipes and fittings.
 function fluidGeometry(craft){
  craft.root.updateWorldMatrix(true,true);
  return craft.fluidConnections.map(connection=>{
   const positions=connection.tube.mesh.geometry.attributes.position.array;
   return {id:connection.id,radiusM:connection.radiusM,bendRadiusM:connection.bendRadiusM,
    circuitId:connection.circuitId,fluidKind:connection.fluidKind,
    from:anchorInFrame(connection.a,craft.root).toArray(),
    to:anchorInFrame(connection.b,craft.root).toArray(),
    matrix:connection.tube.mesh.matrixWorld.toArray(),
    lengthM:connection.tube.route.lengthM,
    vertices:createHash('sha256').update(Buffer.from(positions.buffer,
     positions.byteOffset,positions.byteLength)).digest('hex')};
  });
 }
 let bare=makeCraft(h,{installElectrical:false,planFluidRoutes:false});
 const fluidBefore=fluidGeometry(bare);
 assert(fluidBefore.length>500,'The full native coolant and propellant inventory remains');
 bare=null;measuring=true;
 const started=performance.now();
 const craft=makeCraft(h,{routingMode:'construction'}),r=craft.electrical.routing;
 assert(r.constructionOnly);
 const fluidAfter=fluidGeometry(craft),compiledFluids=new Map(asset.fluid.map(row=>[row.id,row]));
 assert.deepEqual(fluidAfter.map(row=>row.id),fluidBefore.map(row=>row.id),
  'The full native pipe inventory remains in the same construction');
 for(const [index,connection] of craft.fluidConnections.entries()){
  const row=compiledFluids.get(connection.id);
  if(!row){
   assert.deepEqual(fluidAfter[index],fluidBefore[index],
    connection.id+' preserves its unchanged native pipe buffer and datums');continue;
  }
  assert.equal(connection.radiusM,row.radiusM);assert.equal(connection.bendRadiusM,row.bendRadiusM);
  near(anchorInFrame(connection.a,connection.parent).toArray(),row.from,connection.id+' source');
  near(anchorInFrame(connection.b,connection.parent).toArray(),row.to,connection.id+' target');
  near(normalInFrame(connection.a,connection.parent).toArray(),row.fromNormal,connection.id+' source normal');
  near(normalInFrame(connection.b,connection.parent).toArray(),row.toNormal,connection.id+' target normal');
  near(craft.root.matrixWorld.clone().invert().multiply(connection.parent.matrixWorld).elements,
   row.parentMatrix,connection.id+' mounting frame');
  assert.deepEqual(connection.staticSampledPoints,row.points);
  if(row.controls)assert.deepEqual(connection.staticPlan,row.controls);
  assert.equal(connection.staticBendRadiusM,
   row.minimumBendRadiusM==='Infinity'?Infinity:row.minimumBendRadiusM);
  assert.equal(connection.routingPlan.capturedPlanningOk,row.routingPlan.ok,
   connection.id+' retains its historical native planning result');
  assert.equal(connection.routingPlan.ok,row.routingPlan.ok===false?false:null,
   connection.id+' preserves known failure without claiming current-scene acceptance');
  assert.equal(connection.routingPlan.assessment,'unassessed');
  renderedTube(connection.tube,row.points,row.radiusM,connection.id);
 }
 assert.equal(craft.capturedFluidRoutingPlans.length,asset.fluid.length);
 assert.equal(craft.fluidRoutingPlans.length,0,'Startup has not searched plumbing routes');
 const {installedFluidLengthAccounting}=await import('./dist/fluid-route-length-accounting.js');
 const fluidLedger=installedFluidLengthAccounting(craft.fluidConnections,h.energySystem?.thermal);
 for(const record of fluidLedger.rows){
  const row=compiledFluids.get(record.id);if(!row)continue;
  assert.equal(record.planningAccepted,row.routingPlan.ok===false?false:null,
   record.id+' cannot report accepted planning from a displayed construction');
 }

 // A late invalid fluid interface must not partially overwrite earlier pipes.
 // Give an earlier actual tube a visible sentinel path so an eager apply would
 // change its buffer even when the compiled path was already present before.
 const fluidById=new Map(craft.fluidConnections.map(connection=>[connection.id,connection]));
 const fluidEntries=asset.fluid.map(row=>fluidById.get(row.id));
 assert(fluidEntries.length>1);
 assert.equal(cache.applyStarmindFluidConstruction(asset,{...craft,
  fluidConnections:craft.fluidConnections.filter(connection=>connection!==fluidEntries[0])}),false,
  'A missing planned pipe rejects compiled construction');
 assert.equal(cache.applyStarmindFluidConstruction(asset,{...craft,
  fluidConnections:[...craft.fluidConnections,fluidEntries[0]]}),false,
  'A duplicate pipe rejects compiled construction');
 const usage=new Map();for(const connection of fluidEntries)for(const anchor of [connection.a,connection.b])
  usage.set(anchor,(usage.get(anchor)||0)+1);
 const invalidFluid=[...fluidEntries].reverse().find(connection=>usage.get(connection.b)===1);
 assert(invalidFluid&&fluidEntries.indexOf(invalidFluid)>0);
 const probe=fluidEntries[0],nativePoints=probe.tube.route.points.map(point=>[...point]),
  nativeMinimum=probe.tube.route.minimumBendRadiusM,sentinel=nativePoints.map(point=>[...point]),
  fluidDatum=invalidFluid.b.position.clone();
 sentinel[0][0]+=.001;
 probe.tube.update(sentinel,{sampled:true,minimumBendRadiusM:nativeMinimum});
 invalidFluid.b.position.x+=.001;
 const rejectedFluidBuffers=fluidGeometry(craft);
 try{
  assert.equal(cache.applyStarmindFluidConstruction(asset,craft),false,
   'An altered actual fluid datum rejects the complete construction');
  assert.deepEqual(fluidGeometry(craft),rejectedFluidBuffers,
   'A rejected fluid construction changes no actual pipe buffer');
 }finally{
  invalidFluid.b.position.copy(fluidDatum);
  probe.tube.update(nativePoints,{sampled:true,minimumBendRadiusM:nativeMinimum});
  craft.root.updateWorldMatrix(true,true);
 }
 assert.deepEqual(fluidGeometry(craft),fluidAfter,'Negative cache checks restore the native buffers');
 function assertBoundedStartup(){
  assert.equal(feedthrough,null);
  assert.deepEqual({...calls,obstacles:0},{electricalSearch:0,fluidSearch:0,service:0,obstacles:0});
  assert(feedthroughQueries.length>0,'Actual feedthrough allocation remains present');
  assert.equal(calls.obstacles,feedthroughQueries.reduce((n,q)=>n+q.triangulations,0));
 }
 assertBoundedStartup();
 assert.equal(r.operationalEnvelopes.assessed,false);
 assert.equal(r.operationalEnvelopes.ok,null);
 for(const name of ['collectorAccommodation','equipmentAccommodation']){
  assert.equal(r[name].assessed,false);assert.equal(r[name].ok,null);
 }

 const supports=craft.starmindHarnessInstallation;
 assert.equal(supports.schedule.length,26,'All structural raceways are still installed');
 assert.equal(supports.materialMeshCount,1000,'All physical rails, rungs, retainers and feet remain');
 assert.equal(supports.schedule.reduce((n,p)=>n+p.massItems.length,0),98);
 assert.equal(r.lines.length,496);
 assert.equal(new Set(r.lines.map(line=>line.id)).size,496);
 assert.deepEqual(new Set(r.lines.map(line=>line.id)),
  new Set(g.harnessMassRecords.flatMap(record=>record.routeIds)),
  'Every accounted physical cut has one actual displayed cable');
 assert.equal(routeEvents.length,496);
 assert(routeEvents.every(record=>record.passed!==true),
  'Constructing a displayed cable does not claim a successful engineering check');

 craft.root.updateWorldMatrix(true,true);
 const frame={world:anchor=>anchorInFrame(anchor,craft.root).toArray(),
  normal:anchor=>normalInFrame(anchor,craft.root).toArray()};
 const records=cache.validateStarmindConstructionLines(asset,r.lines,frame);
 assert(records instanceof Map);
 assert.equal(cache.validateStarmindConstructionLines(asset,r.lines.slice(1),frame),null,
  'A missing physical cut cannot reuse the compiled construction');
 const altered=r.lines[0],nativeRadius=altered.radiusM,
  nativePosition=altered.from.position.clone(),nativeOrientation=altered.from.quaternion.clone();
 try{
  altered.radiusM+=.001;
  assert.equal(cache.validateStarmindConstructionLines(asset,r.lines,frame),null,
   'An altered cut radius rejects compiled construction');
  altered.radiusM=nativeRadius;
  altered.from.position.x+=.001;
  assert.equal(cache.validateStarmindConstructionLines(asset,r.lines,frame),null,
   'An altered actual connector datum rejects compiled construction');
  altered.from.position.copy(nativePosition);altered.from.rotateY(.01);
  assert.equal(cache.validateStarmindConstructionLines(asset,r.lines,frame),null,
   'An altered actual connector normal rejects compiled construction');
 }finally{
  altered.radiusM=nativeRadius;altered.from.position.copy(nativePosition);
  altered.from.quaternion.copy(nativeOrientation);craft.root.updateWorldMatrix(true,true);
 }
 assert(cache.validateStarmindConstructionLines(asset,r.lines,frame) instanceof Map);
 for(const line of r.lines){
  const row=records.get(line.id);assert(row);
  assert(line.constructionOnly);
  assert.equal(line.constructionSource,'compiled-native');
  assert(line.restLengthM>0&&Number.isFinite(line.restLengthM));
  assert(line.tube.route.lengthM>0&&line.tube.mesh.geometry.attributes.position.count>0);
  assert.equal(line.tube.radiusM,line.r.spec.cableDiameterM/2);
  assert.equal(line.radiusM,row.radiusM);assert.equal(line.bendRadiusM,row.bendRadiusM);
  assert.equal(line.restLengthM,row.lengthM);assert.equal(line.minimumStaticBendM,row.minimumBendRadiusM);
  assert.equal(line.lengthToleranceM,row.lengthToleranceM);
  assert.deepEqual(line.staticControls,row.controls,line.id+' preserves native controls');
  assert.deepEqual(line.staticPoints,row.points,line.id+' preserves the complete native route');
  assert.deepEqual(line.planningIssues||[],row.planningIssues||[],
   line.id+' retains native findings without introducing a new intrinsic failure');
  assert.deepEqual(line.servicePlanningIssues||[],row.servicePlanningIssues||[],
   line.id+' retains its existing service findings');
  renderedTube(line.tube,row.points,row.radiusM,line.id);
  const ends=line.tube.endpoints.map(p=>craft.root.worldToLocal(
   line.tube.mesh.localToWorld(p.clone())).toArray());
  for(const [i,end] of ['from','to'].entries()){
   assert(distance(ends[i],anchorInFrame(line[end],craft.root).toArray())<3e-6,
    line.id+' remains seated at its actual '+end+' connector');
  }
  const assessment=electrical.installedLinePlanningAssessment(line);
  assert.equal(assessment.planningPassed,row.planningIssues?.length?false:null,
   line.id+' preserves failure or unassessed status without new acceptance');
  assert.equal(assessment.serviceWithdrawalAssessment,'unassessed');
  assert(!line.serviceAllocation&&!line.rigidService&&!line.beforeService&&!line.afterService,
   'Construction has not allocated or accepted a connector withdrawal reservoir');
 }

 const allocation=new Map(g.starmindHarnessInstallation.payloadRouting.rows.map(row=>[row.id,row]));
 const payload=r.lines.filter(line=>line.mountedPayload);
 assert.equal(payload.length,128);
 const sameAllocatedPoints=(actual,expected,label)=>{
  assert.equal(actual.length,expected.length,label+' retains its complete point inventory');
  actual.forEach((point,index)=>near(point,expected[index],label+' point '+index));
 };
 for(const line of payload){
  const row=allocation.get(line.id);assert(row);
  // The independently reconstructed allocation has not made the native
  // body/world matrix round trip. Compare these datums at the same geometric
  // tolerance as its connectors; captured-to-displayed points remain exact above.
  sameAllocatedPoints(line.staticControls,row.controlPoints,line.id+' mounted controls');
  sameAllocatedPoints(line.staticPoints,row.points,line.id+' full-radius path');
  assert(distance(row.from.position,anchorInFrame(line.from,craft.root).toArray())<1e-10);
  assert(distance(row.to.position,anchorInFrame(line.to,craft.root).toArray())<1e-10);
 }

 const battery=r.lines.find(line=>line.id==='P-BAT-4/3');
 const batteryControls=installed.starmindBatteryOutboardHint(h,{familyId:'starmind-cross'},battery,
  anchorInFrame(battery.from,craft.root).toArray(),anchorInFrame(battery.to,craft.root).toArray(),
  normalInFrame(battery.from,craft.root).toArray(),normalInFrame(battery.to,craft.root).toArray());
 assert(batteryControls&&batteryControls.length>4,'The installed battery return keeps its guarded route');
 assert.deepEqual(battery.staticControls,batteryControls);

 // The actual inspection API must keep an unassessed installation seated.
 // Test the connector and harness entries used by the real parts navigator.
 const specs=new Set(r.lines.map(line=>line.r.spec.id)),restrictedPorts=new Set(
  r.lines.flatMap(line=>[line.r.spec.fromPortId,line.r.spec.toPortId]));
 const serviceItems=[...g.assemblies.filter(item=>specs.has(item.exemplarHarnessId)),
  ...g.connectorDetails.filter(item=>restrictedPorts.has(item.exemplarPortId))];
 assert(serviceItems.length>0);
 const plugs=()=>[...craft.electrical.ports].map(([id,port])=>[id,port.plug.position.toArray()]);
 const seated=plugs();
 for(const item of serviceItems){
  assert.equal(craft.electrical.canMate(item.itemId),false);
  assert.match(craft.electrical.matingRestriction(item.itemId),/withdrawal has not been assessed/);
  assert.equal(craft.electrical.mating(item.itemId,0),false);
 }
 assert.deepEqual(plugs(),seated,'Unassessed service cannot stretch a displayed harness');
 assertBoundedStartup();

 assert.equal(electrical.reconcileInstalledMassFromCraft(h,craft),false,
  'Display-only lengths cannot overwrite the independently accounted takeoff');
 assert.equal(accounting(),massBefore,'Opening the spacecraft preserves the complete model ledger');
 assert.equal(JSON.stringify(buildEquipmentList(h)),melBefore,'Opening the scene preserves every MEL row');
 assert.equal(JSON.stringify(retainedHarnessTakeoff(h,g)),takeoffBefore);
 console.log('PASS Starmind scene startup: 496 physical cuts, 128 mounted feeds, 26 raceways / '+
  '1000 material pieces, preserved fluid buffers and mass/MEL, unassessed qualification, '+
  'and zero full-scene searches or service allocations; '+calls.obstacles+
  ' bounded feedthrough triangulations ('+
  ((performance.now()-started)/1000).toFixed(2)+' s).');
}
