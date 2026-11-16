// Compile native fixed construction into an application geometry asset. This
// preserves failed planning results and never creates a clearance certificate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'dist/starcatcher-construction-cache-data.js');
const takeoffOutput=path.join(root,'dist/starcatcher-harness-takeoff.js');
const digest=value=>createHash('sha256').update(value).digest('hex');
const option=name=>{const index=process.argv.indexOf(name);if(index<0)return null;assert(process.argv[index+1]&&!process.argv[index+1].startsWith('--'),'Missing '+name+' path');return path.resolve(process.argv[index+1]);};
const checkpointPath=option('--checkpoint'),recoverPath=option('--recover'),contextPath=option('--context');
const contextOnly=process.argv.includes('--context-only'),
 unplannedFluidContext=process.argv.includes('--unplanned-fluid-context'),contextComplete=Symbol('context-complete');
assert(!contextOnly||contextPath,'Context-only inspection requires an external --context path');
assert(!unplannedFluidContext||contextOnly,
 'Unplanned fluid geometry is only available for diagnostic context inspection');
for(const file of [checkpointPath,recoverPath,contextPath].filter(Boolean))assert(path.relative(root,file).startsWith('..'+path.sep),
 'Working construction checkpoints must stay outside the repository');
const recovered=recoverPath?JSON.parse(fs.readFileSync(recoverPath,'utf8')):null;
function sourceManifest(){
 const pending=['dist/craft.js','dist/design.js'],seen=new Set();
 while(pending.length){
  const name=pending.pop();if(seen.has(name)||name.includes('construction-cache')||
   name==='dist/starcatcher-harness-takeoff.js')continue;
  const source=fs.readFileSync(path.join(root,name),'utf8');seen.add(name);
  for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["'](\.[^"']+)["']/g)){
   const next=path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1]));
   if(/\.(?:js|mjs|json)$/.test(next))pending.push(next);
  }
 }
 return [...seen].sort().map(name=>({path:name,sha256:digest(fs.readFileSync(path.join(root,name)))}));
}
async function writeConstructionAsset(data){
 const json=JSON.stringify(data),sha256=digest(json);
 await import('../dist/vendor/jszip.min.js');
 const zip=new globalThis.JSZip();zip.file('construction.json',json,{date:new Date('1980-01-01T00:00:00Z'),createFolders:false});
 const base64=await zip.generateAsync({type:'base64',compression:'DEFLATE',compressionOptions:{level:9},platform:'DOS'});
 const roundtrip=await globalThis.JSZip.loadAsync(base64,{base64:true,checkCRC32:true});
 assert.equal(await roundtrip.file('construction.json').async('string'),json);
 const module=`// Generated runtime geometry. Regenerate with scripts/compile-starcatcher-construction.mjs.\n// This is application input, not a clearance certificate. JSON SHA-256: ${sha256}\nexport const starcatcherConstructionData=await(async()=>{\n if(!globalThis.JSZip)await import('./vendor/jszip.min.js');\n const archive=await globalThis.JSZip.loadAsync('${base64}',{base64:true,checkCRC32:true});\n const files=Object.values(archive.files).filter(file=>!file.dir);\n if(files.length!==1||files[0].name!=='construction.json')throw new Error('Invalid Star Catcher construction archive');\n const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};\n return freeze(JSON.parse(await files[0].async('string')));\n})();\n`;
 assert(Buffer.byteLength(module)<1.7*1024*1024,'Runtime construction asset exceeds available headroom');
 const {starcatcherHarnessRoutingRevision}=await import('../dist/installed-harness-mass.js');
 assert(data.massDesignKey,'The native construction must include its exact material design key');
 assert(/^sha256:[a-f0-9]{64}$/.test(data.massCompatibilityKey),
  'The native construction must include its complete rounded-geometry identity');
 const takeoff={schema:'orbital-data-center/starcatcher-harness-takeoff/1',
  routingRevision:starcatcherHarnessRoutingRevision,designKey:data.massDesignKey,
  compatibilityKey:data.massCompatibilityKey,
  records:takeoffRecords(data),source:{kind:'compiled-native-starcatcher-construction',
   constructionSchema:data.schema,constructionKey:data.geometryKey,constructionSha256:sha256,
   sourceFiles:data.source.files,sourceManifestSha256:data.source.sha256,
   clearanceAssessment:'unassessed',serviceWithdrawalAssessment:'unassessed'}};
 fs.writeFileSync(takeoffOutput+'.tmp',
  '// Generated physical cut inventory; retained planning findings are not qualification.\n'+
  'export const starcatcherHarnessTakeoff='+JSON.stringify(takeoff)+';\n');
 fs.writeFileSync(output+'.tmp',module);fs.renameSync(output+'.tmp',output);
 fs.renameSync(takeoffOutput+'.tmp',takeoffOutput);
 return {output:path.relative(root,output),bytes:Buffer.byteLength(module),jsonBytes:Buffer.byteLength(json),sha256};
}
function takeoffRecords(data){
 return data.electrical.map(row=>{
  assert(Number.isFinite(row.minimumBendRadiusM),row.id+': takeoff bend must be a finite measured value');
  return {id:row.id,harnessId:row.harnessId,lengthM:row.lengthM,
   minimumBendRadiusM:row.minimumBendRadiusM,
   planningPassed:row.planningIssues?.length||row.servicePlanningIssues?.some(issue=>!issue.unassessed)?false:null,
   serviceWithdrawalAssessment:'unassessed'};
 });
}
if(process.argv.includes('--check-source')){
 const {starcatcherConstructionData:data}=await import(pathToFileURL(output));
 assert(data,'Compile the default Star Catcher construction first');
 const current=new Map(sourceManifest().map(row=>[row.path,row.sha256]));
 const stale=data.source.files.filter(row=>current.get(row.path)!==row.sha256);
 assert.equal(stale.length,0,'Stale construction source: '+stale.map(row=>row.path).join(', '));
 assert.equal(current.size,data.source.files.length,'Native source closure must remain complete');
 const {starcatcherHarnessTakeoff:takeoff}=await import(pathToFileURL(takeoffOutput));
 assert(takeoff,'The shipped native cut inventory must be present');
 assert.equal(takeoff.designKey,data.massDesignKey);
 assert.equal(takeoff.compatibilityKey,data.massCompatibilityKey);
 assert.equal(takeoff.source.constructionSha256,digest(JSON.stringify(data)));
 assert.equal(takeoff.source.constructionKey,data.geometryKey);
 assert.equal(takeoff.source.sourceManifestSha256,data.source.sha256);
 assert.deepEqual(takeoff.source.sourceFiles,data.source.files);
 assert.deepEqual(takeoff.records,takeoffRecords(data));
 console.log('Star Catcher construction source identity: pass');
 process.exit(0);
}
if(process.argv.includes('--attach-configuration')){
 const [{starcatcherConstructionData:data},{sizeDesign},{buildReferenceDesign},electrical,cache]=await Promise.all([
  import(pathToFileURL(output)),import('../dist/design.js'),import('../dist/reference-configurations.js'),
  import('../dist/electrical-architecture.js'),import('../dist/starcatcher-construction-cache.js')
 ]);
 assert(data,'Compile the native Star Catcher construction first');
 const h=sizeDesign(buildReferenceDesign('star-catcher-self-powered')),graph=electrical.buildElectricalArchitecture(h);
 assert.equal(cache.starcatcherConstructionKey(h,graph),data.geometryKey,
  'Fresh physical configuration must exactly match the captured native geometry identity');
 const physicalConfiguration=structuredClone(cache.starcatcherConstructionConfiguration(h,graph));
 console.log(JSON.stringify({stage:'configuration-attached',...await writeConstructionAsset({...data,physicalConfiguration})}));
 process.exit(0);
}
const manifest=sourceManifest();
const [{canvas},{sizeDesign},{buildReferenceDesign},{makeCraft},electrical,installed,
 fluid,{anchorInFrame,normalInFrame},{starcatcherConstructionKey,starcatcherConstructionConfiguration},
 {routingPlanObservations}]=await Promise.all([
 import('../render-test-canvas.mjs'),import('../dist/design.js'),
 import('../dist/reference-configurations.js'),import('../dist/craft.js'),
 import('../dist/electrical-architecture.js'),import('../dist/installed-electrical-routing.js'),
 import('../dist/flight-fluid-routing.js'),import('../dist/connection-geometry.js'),
 import('../dist/starcatcher-construction-cache.js'),import('../dist/electrical-routing.js')
]);
globalThis.document={createElement:canvas};
const started=performance.now(),cpu=process.cpuUsage();
let electricalCount=0,fluidCount=0;
const report=(stage,extra={})=>{const used=process.cpuUsage(cpu);console.log(JSON.stringify({stage,
 seconds:(performance.now()-started)/1000,cpuSeconds:(used.user+used.system)/1e6,
 rssMiB:process.memoryUsage().rss/1048576,electricalCount,fluidCount,...extra}));};
report('imports-loaded');
const h=sizeDesign(buildReferenceDesign('star-catcher-self-powered'));
const {installedHarnessDesignKey,starcatcherHarnessCompatibilityKey}=await import('../dist/installed-harness-mass.js');
const massDesignKey=installedHarnessDesignKey(h,electrical.buildElectricalArchitecture(h));
const massCompatibilityKey=starcatcherHarnessCompatibilityKey(h,electrical.buildElectricalArchitecture(h));
const geometryKey=starcatcherConstructionKey(h,electrical.buildElectricalArchitecture(h));
const physicalConfiguration=structuredClone(starcatcherConstructionConfiguration(h,electrical.buildElectricalArchitecture(h)));
const settings={electricalPlannerLimits:{maxAttempts:0,maxGridNodes:0},allocateElectricalService:false,
 ...(unplannedFluidContext?{planFluidRoutes:false}:{})};
const source={files:manifest,sha256:digest(JSON.stringify(manifest))};
if(recovered){
 assert.equal(recovered.schema,'orbital-data-center/starcatcher-construction-checkpoint/1');
 assert.deepEqual(recovered.source,source,'Recovery requires identical complete native source');
 assert.equal(recovered.geometryKey,geometryKey,'Recovery requires the exact original geometry identity');
 assert.deepEqual(recovered.physicalConfiguration,physicalConfiguration,'Recovery requires identical configuration');
 assert.deepEqual(recovered.settings,settings,'Recovery requires identical native planner settings');
 if(recovered.stage==='complete'){
  assert.deepEqual(recovered.data.source,source);assert.equal(recovered.data.geometryKey,geometryKey);
  assert.deepEqual(recovered.data.physicalConfiguration,physicalConfiguration);
  assert.equal(recovered.data.electrical.length,537);
  report('recovered-complete',{...await writeConstructionAsset(recovered.data)});process.exit(0);
 }
 assert.equal(recovered.stage,'native-static-prefix');
}
const point=value=>value.isVector3?value.toArray():[...value],meshNames=new Map();
function nameObjects(factory){factory.root.traverse(node=>{const parts=[];for(let item=node;item&&item!==factory.root;item=item.parent)parts.push((item.parent?.children.indexOf(item)??0)+':'+(item.name||item.type));const name=parts.reverse().join('/');meshNames.set(node.uuid,name);if(node.geometry&&!meshNames.has(node.geometry.uuid))meshNames.set(node.geometry.uuid,name+'/geometry');});}
const clean=value=>JSON.parse(JSON.stringify(value,(_key,row)=>{
 if(typeof row==='number'&&!Number.isFinite(row)){assert(!Number.isNaN(row),'Native checkpoint contains NaN');return String(row);}
 if(typeof row==='string')return row.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,id=>meshNames.has(id)?'captured:'+meshNames.get(id):id);
 return row;
}));
function electricalRecord(line,factory){
 assert(!line.movingFrame&&!line.rigidFrame&&!line.serviceAllocation&&!line.rigidService&&!line.beforeService&&!line.afterService,line.id+' must be fixed without a withdrawal allocation');
 assert(line.staticPoints.length>1&&line.restLengthM>0);
 return clean({id:line.id,harnessId:line.r.spec.id,fromPortId:line.r.spec.fromPortId,toPortId:line.r.spec.toPortId,
  from:anchorInFrame(line.from,factory.root).toArray(),to:anchorInFrame(line.to,factory.root).toArray(),
  fromNormal:normalInFrame(line.from,factory.root).toArray(),toNormal:normalInFrame(line.to,factory.root).toArray(),
  radiusM:line.radiusM,bendRadiusM:line.bendRadiusM,points:line.staticPoints.map(point),controls:line.staticControls.map(point),
  minimumBendRadiusM:line.minimumStaticBendM,lengthM:line.restLengthM,lengthToleranceM:line.lengthToleranceM,
  mountedPayload:!!line.mountedPayload,planningIssues:line.planningIssues||[],servicePlanningIssues:line.servicePlanningIssues||[]});
}
function fluidRecordsFor(factory){return factory.fluidConnections.filter(connection=>connection.routingPlan).map(connection=>{
 assert(!connection.restLengthM);const plan=connection.routingPlan;
 return clean({id:connection.id,radiusM:connection.radiusM,bendRadiusM:connection.bendRadiusM,
  from:anchorInFrame(connection.a,connection.parent).toArray(),to:anchorInFrame(connection.b,connection.parent).toArray(),
  fromNormal:normalInFrame(connection.a,connection.parent).toArray(),toNormal:normalInFrame(connection.b,connection.parent).toArray(),
  parentMatrix:factory.root.matrixWorld.clone().invert().multiply(connection.parent.matrixWorld).elements,
  points:connection.tube.route.points.map(point),controls:connection.staticPlan?.map(point)||null,
  minimumBendRadiusM:connection.staticBendRadiusM??connection.tube.route.minimumBendRadiusM,
  routingPlan:{ok:plan.ok,attempts:plan.attempts,screen:plan.screen||null,gridFailure:plan.gridFailure||null}});
});}
const hashRows=rows=>{const hash=createHash('sha256');for(const row of rows)hash.update(JSON.stringify(clean(row))+'\n');return hash.digest('hex');};
let context=null,initialContext=null,initialFluid=null;
const returned=[];
function checkpoint(stage,data=null){
 if(!checkpointPath)return;
 // Never replace a longer saved prefix with a partly reverified prefix if a
 // recovery itself is interrupted. Keep the previous complete atomic record.
 if(recovered?.stage==='native-static-prefix'&&stage!=='complete'&&
  returned.length<recovered.electrical.length)return;
 const value={schema:'orbital-data-center/starcatcher-construction-checkpoint/1',source,geometryKey,physicalConfiguration,settings,stage,
  ...(data?{data}:{initialContext,initialFluid,lineOrder:context.lines.map(line=>line.id),electrical:returned,
   observations:clean([...routingPlanObservations]),planned:clean(context.planned.map(row=>({id:row.id,points:row.points,radiusM:row.radiusM,clearanceM:row.clearanceM})))})};
 fs.mkdirSync(path.dirname(checkpointPath),{recursive:true});fs.writeFileSync(checkpointPath+'.tmp',JSON.stringify(value));fs.renameSync(checkpointPath+'.tmp',checkpointPath);
}
installed.electricalRoutingDiagnostics.onPlanningContext=value=>{
 context=value;nameObjects(context.factory);initialFluid=fluidRecordsFor(context.factory);
 if(contextPath){
  const meshes=[];
  context.factory.root.traverse(mesh=>{
   if(!mesh.isMesh||!mesh.geometry?.attributes?.position)return;
   const lineage=[];
   for(let p=mesh;p&&p!==context.factory.root;p=p.parent)lineage.push({
    name:p.name,part:p.userData.part,electricalBoxId:p.userData.electricalBoxId,
    hardwareComponentId:p.userData.hardwareComponentId});
   meshes.push({id:mesh.uuid,name:mesh.name,lineage});
  });
  const packet=clean({schema:'orbital-data-center/starcatcher-layout-context/1',
   source,geometryKey,physicalConfiguration,
   fluidAssessment:unplannedFluidContext?'Initial physical construction; native planning unassessed':'Native initial static planning',
   dimensionsM:[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM],
   interfaces:context.lines.map(line=>({id:line.id,harnessId:line.r.spec.id,
    fromBoxId:line.r.spec.fromBoxId,toBoxId:line.r.spec.toBoxId,
    from:context.world(line.from),to:context.world(line.to),
    fromNormal:context.normal(line.from),toNormal:context.normal(line.to),
    radiusM:line.radiusM,bendRadiusM:line.bendRadiusM,
    fromEscape:line.fromEscape||null,toEscape:line.toEscape||null})),
   meshes,obstacles:context.allObstacles,terminals:context.terminalVolumes,
   fluids:context.planned,initialFluid});
  fs.mkdirSync(path.dirname(contextPath),{recursive:true});
  fs.writeFileSync(contextPath,gzipSync(JSON.stringify(packet),{level:6}));
 }
 if(contextOnly){report('diagnostic-context-written',{contextPath,unplannedFluidContext});throw contextComplete;}
 initialContext={lineOrder:context.lines.map(line=>line.id),obstacles:hashRows(context.allObstacles),
  terminals:hashRows(context.terminalVolumes),fluids:hashRows(initialFluid),
  initialObservations:hashRows([...routingPlanObservations]),
  interfaces:hashRows(context.lines.map(line=>({id:line.id,from:context.world(line.from),to:context.world(line.to),
   fromNormal:context.normal(line.from),toNormal:context.normal(line.to),radiusM:line.radiusM,bendRadiusM:line.bendRadiusM})))};
 if(recovered){assert.deepEqual(initialContext,recovered.initialContext,'Recovery requires identical native solids, terminals, fluids, interfaces, order and initial planner observations');assert.deepEqual(initialFluid,recovered.initialFluid);}
 checkpoint('native-static-prefix');report('native-context-checkpointed');
};
installed.electricalRoutingDiagnostics.onBeforeRoute=({id})=>{if(electricalCount%20===0)report('before-route',{id});};
installed.electricalRoutingDiagnostics.onRoute=({id,passed})=>{
 assert(context,'Native planning context must precede route returns');
 const line=context.lines[electricalCount];assert.equal(line.id,id);
 const record=electricalRecord(line,context.factory);
 // Replay the genuine native prefix on recovery. It is deliberately not a
 // clearance shortcut: each returned point, control and failure must agree
 // before advancing beyond the saved boundary.
 if(recovered&&electricalCount<recovered.electrical.length)assert.deepEqual(record,recovered.electrical[electricalCount],id+': recovered native return changed');
 returned.push(record);electricalCount++;
 if(recovered&&electricalCount===recovered.electrical.length){
  assert.deepEqual(clean([...routingPlanObservations]),recovered.observations,'Recovered native planner observations changed');
  assert.deepEqual(clean(context.planned.map(row=>({id:row.id,points:row.points,radiusM:row.radiusM,clearanceM:row.clearanceM}))),recovered.planned,'Recovered normal planned prefix changed');
  report('native-prefix-reverified',{returns:electricalCount});
 }
 checkpoint('native-static-prefix');
 if(electricalCount%20===0)report('route',{id,passed});
};
installed.electricalRoutingDiagnostics.onBeforeService=()=>assert.fail('Compilation must not allocate service');
fluid.fluidRoutingDiagnostics.onPlan=row=>{fluidCount++;if(fluidCount%5===0||!row.ok)report('fluid',{id:row.id,ok:row.ok,attempts:row.attempts,issue:row.issue});};
report('constructing');
let craft;
try{craft=makeCraft(h,settings);}catch(error){if(error===contextComplete)process.exit(0);throw error;}
report('constructed');
assert.equal(installedHarnessDesignKey(h,electrical.buildElectricalArchitecture(h)),massDesignKey,
 'Actual cut mass adoption must preserve the complete physical design identity');
assert.equal(starcatcherHarnessCompatibilityKey(h,electrical.buildElectricalArchitecture(h)),massCompatibilityKey,
 'Actual cut mass adoption must preserve the cross-runtime geometry identity');
craft.root.updateWorldMatrix(true,true);
nameObjects(craft);
const lines=craft.electrical.routing.lines;
assert.equal(lines.length,537);assert.equal(new Set(lines.map(line=>line.id)).size,537);
const records=lines.map(line=>electricalRecord(line,craft)),fluidRecords=fluidRecordsFor(craft);
const data={schema:'orbital-data-center/starcatcher-construction/1',referenceCenterId:'star-catcher-self-powered',
 geometryKey,physicalConfiguration,source,massDesignKey,massCompatibilityKey,
 policy:{...settings,fluidPlanning:'Native initial and final static fluid planning',
  clearanceAssessment:'unassessed',serviceWithdrawalAssessment:'unassessed',
  basis:'Exact fixed geometry returned by the bounded native planner; failures are retained. Runtime reuse does not certify current-scene clearance, service or deployment.'},
 electrical:records,fluid:fluidRecords};
checkpoint('complete',data);
report('compiled',{...await writeConstructionAsset(data),
 electrical:records.length,electricalFailures:records.filter(row=>row.planningIssues.length).length,fluid:fluidRecords.length,fluidFailures:fluidRecords.filter(row=>!row.routingPlan.ok).length});
