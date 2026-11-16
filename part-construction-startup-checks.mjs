// Parts and MEL thumbnails are presentation consumers of the retained native
// installation. A single thumbnail must never launch the native routing solver.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const referenceIndex=process.argv.indexOf('--reference');
if(referenceIndex<0&&!process.argv.includes('--viewer')){
 for(const id of ['star-catcher-self-powered','starmind-ai1'])
  execFileSync(process.execPath,[fileURLToPath(import.meta.url),'--reference',id],
   {stdio:'inherit',timeout:45000});
 execFileSync(process.execPath,[fileURLToPath(import.meta.url),'--viewer'],
  {stdio:'inherit',timeout:10000});
 console.log('Part construction startup: retained default previews, bounded misses, pose selection, '+
  'honest unavailable state and thumbnail identity passed.');
}else if(referenceIndex>=0){
 const id=process.argv[referenceIndex+1],isStar=id==='star-catcher-self-powered';
 assert(isStar||id==='starmind-ai1');
 const {canvas}=await import('./render-test-canvas.mjs');
 globalThis.document={createElement:canvas};
 const [{sizeDesign},{buildReferenceDesign},{createPartModel,visiblePartObject},
  {buildPartsCatalog},{makeCraft},electrical,installed,routing,fluid,cache,T,
  {ConstructionCacheMissError}]=await Promise.all([
  import('./dist/design.js'),import('./dist/reference-configurations.js'),
  import('./dist/part-model.js'),import('./dist/parts-catalog.js'),import('./dist/craft.js'),
  import('./dist/electrical-architecture.js'),import('./dist/installed-electrical-routing.js'),
  import('./dist/electrical-routing.js'),import('./dist/flight-fluid-routing.js'),
  import(isStar?'./dist/starcatcher-construction-cache.js':'./dist/starmind-construction-cache.js'),
  import('./dist/vendor/three.module.js'),import('./dist/scene-construction-state.js')
 ]);
 const calls={electricalSearch:0,fluidSearch:0,serviceSearch:0},events=[];
 const forbidden=key=>()=>{calls[key]++;assert.fail('Part preview invoked '+key);};
 routing.electricalRouteDiagnostics.onPlan=forbidden('electricalSearch');
 fluid.fluidRoutingDiagnostics.onPlanningContext=forbidden('fluidSearch');
 fluid.fluidRoutingDiagnostics.onBeforePlan=forbidden('fluidSearch');
 installed.electricalRoutingDiagnostics.onBeforeService=forbidden('serviceSearch');
 installed.electricalRoutingDiagnostics.onPlanningContext=context=>
  assert.equal(context.allObstacles.length,0,'Part previews do not build native collision context');
 installed.electricalRoutingDiagnostics.onRoute=record=>events.push(record);
 const h=sizeDesign(buildReferenceDesign(id)),graph=electrical.buildElectricalArchitecture(h),
  match=isStar?cache.matchStarcatcherConstruction:cache.matchStarmindConstruction,
  asset=match(h,graph),catalog=buildPartsCatalog(h);
 assert(asset,'Published reference has a matching retained installation');
 const before={dryKg:h.dryKg,launchKg:h.launchKg,revision:h.electricalMassRevision};
 const start=performance.now(),model=createPartModel(h,'flight'),craft=model.factory,
  installedLines=craft.electrical.routing.lines;
 assert.equal(craft.electrical.routing.constructionOnly,true);
 assert.equal(installedLines.length,isStar?537:496);
 assert.equal(events.length,installedLines.length);
 assert(events.every(event=>event.passed!==true),'Displaying a route is not clearance acceptance');
 const retained=new Map(asset.electrical.map(row=>[row.id,row]));
 for(const line of installedLines){
  const row=retained.get(line.id);assert(row);
  assert.equal(line.constructionSource,'compiled-native');
  assert.deepEqual(line.staticControls,row.controls);
  assert.deepEqual(line.staticPoints,row.points);
  assert.equal(line.radiusM,row.radiusM);
 }
 const connections=new Map(craft.fluidConnections.map(row=>[row.id,row]));
 for(const row of asset.fluid){
  const connection=connections.get(row.id);assert(connection);
  assert.deepEqual(connection.staticSampledPoints,row.points);
  assert.equal(connection.routingPlan.capturedPlanningOk,row.routingPlan.ok);
 }
 const compute=catalog.byId['flight:01.01'],array=catalog.byId['flight:02.01'];
 model.pose(compute);assert(model.select(compute).available,'Compute selection uses actual hardware');
 const extent=()=>{
  const selection=model.select(array),box=new T.Box3();assert(selection.available);
  for(const mesh of selection.meshes)if(visiblePartObject(mesh))
   box.union(new T.Box3().setFromObject(mesh));
  return box.getSize(new T.Vector3()).toArray();
 };
 model.pose(array,1,'deployment');const deployed=extent();
 model.pose(array,0,'deployment');const stowed=extent();
 assert(deployed.some((value,i)=>Math.abs(value-stowed[i])>1e-3),
  'Retained preview keeps the actual deployment animation');
 model.pose(array,1,'deployment');assert.deepEqual(extent(),deployed);
 // Harness and connector records take a different selection/mating path from
 // whole equipment. Exercise it with the native-search tripwires still armed.
 const constructionPorts=new Set(installedLines.flatMap(line=>
  [line.r.spec.fromPortId,line.r.spec.toPortId])),previewed=new Set();
 const plugPositions=()=>[...craft.electrical.ports].map(([portId,port])=>
  [portId,port.plug.position.toArray()]);
 for(const kind of ['power','data','control','rf']){
  const assembly=graph.assemblies.find(row=>
   graph.harnesses.find(harness=>harness.id===row.exemplarHarnessId)?.kind===kind);
  if(!assembly)continue;
  const harness=graph.harnesses.find(row=>row.id===assembly.exemplarHarnessId),
   connector=graph.connectorDetails.find(row=>row.portIds.includes(harness.toPortId)&&
    constructionPorts.has(row.exemplarPortId));
  assert(connector,kind+' has a real connector record in its retained installation');
  for(const definition of [assembly,connector]){
   if(previewed.has(definition.itemId))continue;previewed.add(definition.itemId);
   const record=catalog.byId[definition.itemId];assert(record);
   model.pose(record);assert(model.select(record).available,
    definition.itemId+': individual electrical preview selects installed meshes');
   assert.equal(craft.electrical.canMate(record.id),false);
   assert.match(craft.electrical.matingRestriction(record.id),/withdrawal has not been assessed/);
   const seated=plugPositions();
   model.pose(record,.25,'electrical',{t:10});
   assert(model.select(record).available,'Continuity animation keeps the real selected assembly');
   model.pose(record,0,'mate');
   assert.deepEqual(plugPositions(),seated,
    'A requested withdrawal cannot move an unassessed construction connector');
   model.pose(record,1);
  }
 }
 assert(previewed.size>=4,'Power and data each exercise harness and connector previews');
 for(const line of installedLines)assert.deepEqual(line.staticPoints,retained.get(line.id).points,
  line.id+': part interaction preserves retained route geometry');
 assert.deepEqual({dryKg:h.dryKg,launchKg:h.launchKg,revision:h.electricalMassRevision},before,
  'Part presentation does not change installed mass or its revision');
 model.dispose();
 // The real cache miss must precede any geometry attachment. Explicit native
 // analysis still enters construction when requested by an engineering caller.
 const add=T.Object3D.prototype.add,boundary=Error('geometry attachment');let attachments=0;
 T.Object3D.prototype.add=function(){attachments++;throw boundary;};
 const width=h.bodyWidthM;h.bodyWidthM+=.001;
 try{
  assert.throws(()=>createPartModel(h,'flight'),error=>
   error instanceof ConstructionCacheMissError&&error.referenceCenterId===id);
  assert.equal(attachments,0,'Changed previews reject before partial geometry or search');
  assert.throws(()=>makeCraft(h,{routingMode:'analysis'}),error=>error===boundary);
  assert.equal(attachments,1,'The explicit native analysis API remains available');
 }finally{h.bodyWidthM=width;T.Object3D.prototype.add=add;}
 assert.deepEqual(calls,{electricalSearch:0,fluidSearch:0,serviceSearch:0});
 console.log(id+': '+installedLines.length+' retained cuts / '+asset.fluid.length+
  ' pipes, '+previewed.size+' individual electrical previews, real pose and selection, '+
  'no native searches; '+Math.round(performance.now()-start)+' ms.');
}else{
 // Exercise the complete production viewer and thumbnail queue. Only its
 // model-construction boundary is supplied, keeping this lifecycle regression
 // independent of a second full spacecraft construction or a browser GPU.
 const T=await import('./dist/vendor/three.module.js'),
  {canvas:backingCanvas}=await import('./render-test-canvas.mjs'),
  {ConstructionCacheMissError}=await import('./dist/scene-construction-state.js');
 function canvas(){
  const c=backingCanvas(),get=c.getContext;
  c.getContext=type=>type==='2d'?get():null;c.style={};
  c.addEventListener=c.removeEventListener=c.setAttribute=c.remove=()=>{};
  c.toDataURL=()=>createHash('sha256').update(c.frame?.data||new Uint8Array()).digest('hex');
  return c;
 }
 globalThis.document={hidden:false,createElement:tag=>tag==='canvas'?canvas():{append(){},style:{}},
  addEventListener(){},removeEventListener(){}};
 const realTimeout=globalThis.setTimeout,idleTimers=[];
 globalThis.setTimeout=(fn,delay,...args)=>{
  const timer=realTimeout(fn,delay,...args);
  if(delay===20000){timer.unref();idleTimers.push(timer);}
  return timer;
 };
 const calls=[],disposed=[],unexpected=Error('Unexpected model constructor failure');
 globalThis.__partConstructionFixture=(h,family)=>{
  calls.push({h,family});
  if(h.unexpected)throw unexpected;
  if(family==='flight'&&h.missing)throw new ConstructionCacheMissError(h);
  const root=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(1,1,1),
   new T.MeshBasicMaterial({color:0xcc8844}));root.add(mesh);root.updateMatrixWorld(true);
  return {h,family,factory:{root},detail:null,pose(){root.updateMatrixWorld(true);},
   select(){return {available:true,geometryStatus:'Actual configured geometry',
    contextOnly:false,meshes:[mesh],all:[mesh]};},
   dispose(){disposed.push(h);mesh.geometry.dispose();mesh.material.dispose();root.clear();}};
 };
 const base=new URL('./dist/part-viewer.js',import.meta.url),
  modelURL=new URL('./dist/part-model.js',import.meta.url).href,
  stub='export {partConfigurationKey,partAnimations,partObjectDescriptor,visiblePartObject} from '+
   JSON.stringify(modelURL)+'; export const createPartModel=(...args)=>globalThis.__partConstructionFixture(...args);',
  stubURL='data:text/javascript,'+encodeURIComponent(stub),
  source=readFileSync(base,'utf8').replace(/from '(\.\/[^']+)'/g,(all,relative)=>
   'from '+JSON.stringify(relative==='./part-model.js'?stubURL:new URL(relative,base).href)),
  {createPartViewer,generatePartThumbnail}=await import('data:text/javascript,'+encodeURIComponent(source));
 const originalError=console.error;
 console.error=(...args)=>{if(!String(args[0]).includes('THREE.WebGLRenderer'))originalError(...args);};
 const input={referenceCenterId:'star-catcher-self-powered'},
  hardware=extra=>({input,architectureFamilyId:'heatlift-study',...extra}),
  good=hardware(),missing=hardware({missing:true,bodyWidthM:1.001}),recovered=hardware(),
  record={id:'flight:01.01',title:'Compute',render:{family:'flight'},animations:[]},
  reports=[],viewer=createPartViewer({append(){}},{offscreen:true,width:96,height:64,
   onStatus:status=>reports.push(status)});
 try{
  const empty=viewer.renderThumbnail();
  assert(viewer.setPart(record,good).available);assert.notEqual(viewer.renderThumbnail(),empty);
  const goodCalls=calls.length;viewer.setPart(record,good,{t:1});
  assert.equal(calls.length,goodCalls,'A new snapshot reuses its hardware model');
  const pending=viewer.setPart(record,missing);
  assert.equal(pending.available,false);assert.equal(pending.constructionPending,true);
  assert.match(pending.geometryStatus,/unavailable.*routing.*does not match/i);
  assert.deepEqual(pending.modeledSizeM,[0,0,0]);assert.deepEqual(pending.animations,[]);
  assert(disposed.includes(good),'A same-input replacement cannot retain the old factory');
  assert.equal(viewer.renderThumbnail(),empty,'A missing construction clears old rendered geometry');
  assert.equal(viewer.captureStatus().ready,false);
  assert.throws(()=>viewer.captureFrame({width:96,height:64}),/Choose a modeled part/);
  const missCalls=calls.length;
  viewer.setPart({...record,id:'flight:01.02'},missing,{t:2});
  assert.equal(calls.length,missCalls,'A second part/snapshot cannot retry the same missing build');
  assert(viewer.setPart({...record,render:{family:'launch'}},missing).available,
   'Missing flight construction does not block a separate launch model');
  const launchCalls=calls.length;viewer.setPart(record,missing);
  assert.equal(calls.length,launchCalls,'Returning from launch retains the flight pending guard');
  viewer.setMode('wireframe');viewer.setContext(true);viewer.setProgress(.5);viewer.setPlaying(true);
  assert.equal(viewer.captureStatus().ready,false);assert.equal(viewer.getState().playing,false);
  assert.equal(viewer.renderThumbnail(),empty,'Other controls cannot resurrect the stale selection');
  assert(viewer.setPart(record,recovered).available);
  assert.equal(viewer.getState().constructionPending,false);
  assert.equal(viewer.captureStatus().ready,true);
  assert.throws(()=>viewer.setPart(record,hardware({unexpected:true})),error=>error===unexpected,
   'Unrelated errors are not converted to a construction-pending state');
  assert.equal(viewer.getState().constructionPending,false);
  assert.equal(viewer.captureStatus().ready,false);
  assert(reports.some(status=>status.constructionPending));
  const cached=hardware(),changed=hardware({missing:true,bodyWidthM:1.001});
  const thumbnail=await generatePartThumbnail(record,cached,{}, {width:96,height:64});
  assert(thumbnail);const cachedCalls=calls.length;
  assert.equal(await generatePartThumbnail(record,cached,{}, {width:96,height:64}),thumbnail);
  assert.equal(calls.length,cachedCalls,'Identical hardware still reuses its thumbnail');
  assert.equal(await generatePartThumbnail(record,changed,{}, {width:96,height:64}),null,
   'A cached good image cannot substitute for a fresh same-input mismatched build');
  const missingThumbnailCalls=calls.length;
  assert.equal(await generatePartThumbnail(record,changed,{}, {width:96,height:64}),null);
  assert.equal(calls.length,missingThumbnailCalls,'Thumbnail misses do not repeat construction');
  assert(await generatePartThumbnail(record,hardware(),{}, {width:96,height:64}),
   'A fresh valid build recovers after a thumbnail miss');
 }finally{
  viewer.destroy();for(const timer of idleTimers)clearTimeout(timer);
  globalThis.setTimeout=realTimeout;console.error=originalError;
  delete globalThis.__partConstructionFixture;
 }
 console.log('Part viewer lifecycle: cleared stale geometry, repeated-miss suppression, default recovery, '+
  'unexpected errors and cached-thumbnail physical identity passed.');
}
