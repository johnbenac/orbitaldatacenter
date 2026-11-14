// H12-D2: one saved R2 packet, 19 declared original failures, no native scene.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import * as T from './dist/vendor/three.module.js';
import {routingMatrix,obstacleFromMesh} from './dist/routing-audit.js';
import {createD2Harness,reconcileD2LineOrigins} from './docs/harnessing-work/H12-work/d2-j2-trace.mjs';

const BASE='docs/harnessing-work/H12-work/',OUTPUT='docs/harnessing-work/H12-D2-result.json';
const argv=process.argv.slice(2);assert.deepEqual(argv,['--output',OUTPUT]);assert(!process.env.NODE_OPTIONS);
const sha=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const encode=(key,value)=>typeof value==='number'&&!Number.isFinite(value)?{numberEncoding:Number.isNaN(value)?'NaN':value<0?'negative-infinity':'positive-infinity',field:key}:value;
const revive=(key,value)=>value&&typeof value==='object'&&value.numberEncoding?value.numberEncoding==='positive-infinity'?Infinity:value.numberEncoding==='negative-infinity'?-Infinity:NaN:value;
const read=path=>JSON.parse(fs.readFileSync(path,'utf8'),revive);
const fileRecord=path=>{const data=fs.readFileSync(path);return {path,bytes:data.length,sha256:sha(data)};};
const saveExclusive=(path,value)=>fs.writeFileSync(path,JSON.stringify(value,encode,2)+'\n',{flag:'wx'});
const started=Date.now();
const report={schema:'orbital-data-center/H12-D2-residual-diagnostic/1',taskId:'H12-D2',sourceBaseCommit:'e8c501a65583b9bcb93725ed1c711770b116adb0',startedAt:new Date(started).toISOString(),completed:false,diagnosisComplete:false,componentAccepted:false,acceptanceComplete:false,nativeSceneConstructed:false,clearanceTraversalExecuted:false,productionHelperChanged:false,publicationAttempted:false,cases:[],counterfactuals:[],events:[]};
assert(!fs.existsSync(OUTPUT));saveExclusive(OUTPUT,report);
function checkpoint(stage,extra={}){report.status=stage;report.elapsedMs=Date.now()-started;report.events.push({stage,elapsedMs:report.elapsedMs,...extra});const temp=OUTPUT+'.tmp';fs.writeFileSync(temp,JSON.stringify(report,encode,2)+'\n',{flag:'wx'});fs.renameSync(temp,OUTPUT);process.stdout.write(JSON.stringify({stage,elapsedMs:report.elapsedMs,...extra})+'\n');}
const PINS={
 [BASE+'r2.prejoin-geometry.json.gz']:'c5421dd9c5ccb03b833879bf4797e7f7256039f46dac90c5146c7621658f3b56',
 'docs/harnessing-work/H12-R2-result.json':'e7503ce18ae75f247aacab512b5fbfb7fb3ae41201d93246ee332ebdabb9a408',
 [BASE+'r2.process.json']:'9f56bedcee29f6da6620bf905442b7b8ee9db92476461c722bccb7dd53693542',
 'starcloud-collector-passage-checks.mjs':'2deeac7f82052351139a6277a1838eb3c399cd65cc6cc50e1b05f5efd43bb70f',
 'dist/inline-collector-join-geometry.js':'212f2af8c83be79b704e58e4d0f32ca5d786eb53a6a56885eeef3ca0784c9072'
};
const selfTargets=[
 {id:'outlet-panel-foot/panel',mesh:'collector/source-panel',pair:[1617,2232]},
 ...[14,16,31].map(i=>({id:`P-SA-1/${i}/collector/track-disk`,mesh:`P-SA-1/${i}/collector/track`,pair:[179,702]}))
].map(row=>({...row,kind:'self'}));
const arrangementTargets=[
 ['enclosure-shell/0/4',10],['enclosure-shell/1/4',10],['enclosure-shell/1/5',8],['enclosure-shell/2/4',10],
 ...[['track-disk',46],['rotary-sliding-contact',4],['copper-brush',20],['copper-jacket',610],['copper-terminal',16385],['flange-shell',5],['plug-boot',1],['boot-band',60],['terminal-insulator-outer',36],['terminal-insulator/flange',6]].map(([role,index])=>['P-SA-1/0/collector/'+role,index]),
 ['P-SA-1/16/collector/terminal-insulator/flange',0]
].map(([id,triangle])=>({id,triangle,kind:'arrangement'}));
const targets=[...selfTargets,...arrangementTargets];assert.equal(targets.length,19);

function excerpt(source,start,end){assert.equal(source.split(start).length,2,'Unique extraction start');const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(b>a);return source.slice(a,b);}
function extractionFactory(source){
 const actual=excerpt(source,'function actualGeometry(mesh,root){','\nfunction meshDistance('),vectors=excerpt(source,'const sub3=(a,b)=>','\nfunction actualGeometry('),box=excerpt(source,'function bounds(points){','\nfunction boxDistance(');
 const code=box+'\n'+vectors+'\n'+actual+'\nreturn actualGeometry;';
 const extract=new Function('V','routingMatrix','obstacleFromMesh','geomCache',code)(p=>new T.Vector3(...p),routingMatrix,obstacleFromMesh,new WeakMap());
 return {extract,verification:{sourceRunnerSha256:sha(source),actualGeometrySha256:sha(actual),vectorOperationsSha256:sha(vectors),boundsOperationSha256:sha(box),actualGeometrySourceIdentical:true,savedBodyMatrixUsedAsMatrixWorldWithNoParentOrFrame:true}};
}

const TYPES={Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array};
function attribute(raw,metadata,index=false){
 const Type=TYPES[raw.arrayType];assert(Type,'Declared ordinary numeric typed array');assert.equal(raw.arrayType,metadata.arrayType);assert.equal(raw.count,metadata.count);
 const bytes=Buffer.from(raw.dataBase64,'base64');assert.equal(bytes.toString('base64'),raw.dataBase64);assert.equal(bytes.length,metadata.byteLength);assert.equal(metadata.byteOffset%Type.BYTES_PER_ELEMENT,0);
 const backing=new ArrayBuffer(metadata.byteOffset+bytes.length);new Uint8Array(backing,metadata.byteOffset,bytes.length).set(bytes);
 const array=new Type(backing,metadata.byteOffset,bytes.length/Type.BYTES_PER_ELEMENT),itemSize=index?1:raw.itemSize;
 assert.equal(itemSize,metadata.itemSize);if(!index)assert.equal(raw.normalized,metadata.normalized);
 const a=new T.BufferAttribute(array,itemSize,metadata.normalized);a.usage=metadata.usage;a.gpuType=metadata.gpuType;
 assert.equal(a.count,raw.count);assert.equal(a.array.constructor.name,raw.arrayType);assert.equal(a.array.byteOffset,metadata.byteOffset);return a;
}
function rehydrate(record,metadata,raw){
 assert.equal(raw.sha256,record.geometrySha256);assert.equal(metadata.geometrySha256,raw.sha256);assert.equal(metadata.meshId,record.id);assert(metadata.allAttributeBytesRetained);
 assert.equal(raw.type,record.geometryType);assert.equal(raw.type,metadata.geometry.type);assert.deepEqual(raw.parameters,metadata.geometry.parameters);assert.deepEqual(raw.drawRange,metadata.geometry.drawRange);assert.deepEqual(raw.userData,metadata.geometry.userData);
 assert.deepEqual(Object.keys(raw.attributes).sort(),Object.keys(metadata.geometry.attributes).sort());
 const hash=createHash('sha256').update(raw.type||'BufferGeometry'),geometry=new T.BufferGeometry();geometry.type=raw.type;geometry.parameters=raw.parameters;
 for(const key of ['position','normal','uv'])if(raw.attributes[key]){const bytes=Buffer.from(raw.attributes[key].dataBase64,'base64');hash.update(key).update(bytes);geometry.setAttribute(key,attribute(raw.attributes[key],metadata.geometry.attributes[key]));}
 if(raw.index){assert(metadata.geometry.index);hash.update('index').update(Buffer.from(raw.index.dataBase64,'base64'));geometry.setIndex(attribute(raw.index,metadata.geometry.index,true));}else assert.equal(metadata.geometry.index,null);
 assert.equal(hash.digest('hex'),raw.sha256,'Actual retained raw geometry digest');
 geometry.drawRange={...raw.drawRange};geometry.userData=structuredClone(raw.userData);geometry.groups=structuredClone(metadata.geometry.groups);geometry.morphTargetsRelative=metadata.geometry.morphTargetsRelative;
 const matrixWorld=new T.Matrix4().fromArray(record.bodyMatrix),matrix=new T.Matrix4().fromArray(record.localMatrix);
 assert.deepEqual(matrixWorld.elements,record.bodyMatrix);assert.deepEqual(matrix.elements,record.localMatrix);
 // A data adapter, not a scene node: routingMatrix(mesh, undefined) returns
 // this exact retained matrixWorld without any matrix recomposition.
 return {uuid:record.id,geometry,matrixWorld,matrix,isInstancedMesh:false};
}
function triangleMapping(mesh,data){
 const position=mesh.geometry.attributes.position,index=mesh.geometry.index,map=[],discarded=[];
 const sub=(a,b)=>a.map((x,k)=>x-b[k]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 for(let i=0,n=index?.count??position.count;i+2<n;i+=3){const vertexIndices=[0,1,2].map(j=>index?index.getX(i+j):i+j),points=vertexIndices.map(j=>data.vertices[j]);if(Math.hypot(...cross(sub(points[1],points[0]),sub(points[2],points[0])))===0){discarded.push(i/3);continue;}assert.deepEqual(points,data.triangles[map.length]);map.push({filteredTriangleIndex:map.length,inputTriangleIndex:i/3,vertexIndices});}
 assert.equal(map.length,data.triangles.length);assert.equal(discarded.length,data.extraction.discardedExactlyZeroAreaTriangles);return {map,discarded};
}

try{
 const declaration=read(BASE+'d2.declaration.json');assert.equal(declaration.sourceBaseCommit,report.sourceBaseCommit);assert.equal(declaration.externalCapSeconds,120);assert.equal(declaration.nodeHeapMiB,4096);
 report.sourceStart=declaration.inputFiles.map(row=>{const now=fileRecord(row.path);assert.deepEqual(now,row);return now;});
 report.pinnedInputs=Object.entries(PINS).map(([path,expected])=>{const row=fileRecord(path);assert.equal(row.sha256,expected,'Frozen D2 input '+path);return row;});
 report.targets=targets;checkpoint('verified-source-and-inputs');
 const old=read('docs/harnessing-work/H12-R2-result.json'),oldById=new Map(old.joinChecks.map(row=>[row.id,row])),selectedJoins=targets.map(target=>{const row=oldById.get(target.id);assert(row?.validation&&!row.complete);return row;});
 const wanted=new Set(selectedJoins.flatMap(row=>[row.aMeshId,row.bMeshId]));assert.equal(wanted.size,27);
 let compressed=fs.readFileSync(BASE+'r2.prejoin-geometry.json.gz'),inflated=gunzipSync(compressed,{maxOutputLength:214319712});
 assert.equal(inflated.length,214319712);assert.equal(sha(inflated),'54fbc9cb60ea155684e238d4a525d1bb467d0967e410c9d6478db83306dd3e6e');compressed=null;
 let packet=JSON.parse(inflated.toString('utf8'),revive);inflated=null;
 assert.equal(packet.schema,'orbital-data-center/H12-R2-prejoin-geometry/1');assert.equal(packet.joinValidationPerformed,false);assert.equal(packet.rawGeometryBuffers.length,1483);assert.equal(packet.namedJoins.length,707);
 const records=packet.newRecords.filter(row=>wanted.has(row.id)),metadata=packet.newMetadata.filter(row=>wanted.has(row.meshId)),recordById=new Map(records.map(row=>[row.id,row])),metadataById=new Map(metadata.map(row=>[row.meshId,row]));assert.equal(records.length,27);assert.equal(metadata.length,27);
 const wantedGeometry=new Set(records.map(row=>row.geometrySha256)),buffers=packet.rawGeometryBuffers.filter(row=>wantedGeometry.has(row.sha256)),bufferBySha=new Map(buffers.map(row=>[row.sha256,row])),namedJoins=new Map(packet.namedJoins.filter(row=>targets.some(t=>t.id===row.id)).map(row=>[row.id,row]));assert.equal(bufferBySha.size,wantedGeometry.size);
 const oldRecords=new Map(old.contactInventory.materialRecords.map(row=>[row.id,row]));for(const row of records)assert.deepEqual(row,oldRecords.get(row.id),'Saved packet/result material record equality');
 for(const row of selectedJoins){const named=namedJoins.get(row.id);for(const key of ['a','b','aMeshId','bMeshId','kind'])assert.equal(named[key],row[key]);assert.equal(named.aGeometrySha256,recordById.get(row.aMeshId).geometrySha256);assert.equal(named.bGeometrySha256,recordById.get(row.bMeshId).geometrySha256);}
 packet=null;
 const extraction=extractionFactory(fs.readFileSync('starcloud-collector-passage-checks.mjs','utf8')),harness=await createD2Harness(fs.readFileSync('dist/inline-collector-join-geometry.js','utf8'));
 fs.writeFileSync(BASE+'d2.j2-instrumented.mjs',harness.sourceCopy,{flag:'wx'});saveExclusive(BASE+'d2.source-copy-verification.json',{...harness.verification,extraction:extraction.verification});
 report.sourceCopyVerification=fileRecord(BASE+'d2.source-copy-verification.json');report.diagnosticCopy=fileRecord(BASE+'d2.j2-instrumented.mjs');report.extraction=extraction.verification;
 const recovered=new Map();report.meshExtractions=[];
 for(const row of records){const mesh=rehydrate(row,metadataById.get(row.id),bufferBySha.get(row.geometrySha256)),data=extraction.extract(mesh,undefined),mapping=triangleMapping(mesh,data);assert(data.obstacle.closed===true);recovered.set(row.id,{mesh,data,mapping,record:row});report.meshExtractions.push({meshId:row.id,geometrySha256:row.geometrySha256,geometryType:row.geometryType,bodyMatrix:row.bodyMatrix,localMatrix:row.localMatrix,extraction:data.extraction,closed:data.obstacle.closed,filteredTriangleCount:data.triangles.length,filteredToInput:mapping.map.map(r=>r.inputTriangleIndex),discardedInputTriangleIndices:mapping.discarded,descriptorsVerified:true,rawHashVerified:true});}
 checkpoint('rehydrated-fixed-participants',{meshCount:recovered.size});
 const captured=[];
 function mappingFor(meshId,triangle){const rec=[...recovered.values()].find(r=>r.record.id===meshId||metadataById.get(r.record.id)?.collectorPhysicalId===meshId);assert(rec,'Captured mesh identity exists');const map=rec.mapping.map[triangle.i];assert(map);assert.deepEqual(rec.data.triangles[triangle.i],triangle.p);return {...map,meshUuid:rec.record.id,geometrySha256:rec.record.geometrySha256,localVertices:map.vertexIndices.map(i=>{const p=rec.mesh.geometry.attributes.position;return [p.getX(i),p.getY(i),p.getZ(i)];})};}
 for(const target of targets){const previous=oldById.get(target.id),a=recovered.get(previous.aMeshId),b=recovered.get(previous.bMeshId),input={a:{id:previous.a,triangles:a.data.triangles,closed:a.data.obstacle.closed},b:{id:previous.b,triangles:b.data.triangles,closed:b.data.obstacle.closed},minimumContactAreaM2:previous.requiredAreaM2,toleranceM:2e-7};assert.deepEqual(a.data.extraction,previous.extraction.a);assert.deepEqual(b.data.extraction,previous.extraction.b);
  const result=harness.replay(input,{failureTriangle:target.triangle??null}),serializedValidation=JSON.parse(JSON.stringify(result.validation,encode),revive);assert.deepEqual(serializedValidation,previous.validation,'Complete original serialized validation must reproduce: '+target.id);
  const row={id:target.id,kind:target.kind,originalValidationEqual:true,comparison:'Every field after the original R2 JSON encode roundtrip, including all counters and certificates; signed zero follows JSON number semantics',originalValidationSha256:sha(previous.validation),replayedValidationSha256:sha(serializedValidation),validation:serializedValidation,trace:result.trace};
  if(target.kind==='self'){assert(row.trace.self);assert.equal(row.trace.self.meshId,target.mesh);assert.deepEqual([row.trace.self.a.i,row.trace.self.b.i],target.pair);row.trace.self.a.rawMapping=mappingFor(target.mesh,row.trace.self.a);row.trace.self.b.rawMapping=mappingFor(target.mesh,row.trace.self.b);}
  else{assert(row.trace.face?.firstFailure);assert.equal(row.trace.face.query.i,target.triangle);row.trace.face.query.rawMapping=mappingFor(row.trace.face.meshId,row.trace.face.query);for(const candidate of row.trace.face.candidates)candidate.triangle.rawMapping=mappingFor(candidate.meshId,candidate.triangle);row.lineGroups=reconcileD2LineOrigins(row.trace.face);}
  captured.push(row);report.cases.push({id:row.id,kind:row.kind,originalValidationEqual:true,originalValidationSha256:row.originalValidationSha256,replayedValidationSha256:row.replayedValidationSha256,validation:row.validation,capturedFace:row.trace.face?{meshId:row.trace.face.meshId,input:row.trace.face.input,triangle:row.trace.face.query.i,candidates:row.trace.face.candidates.length,lines:row.trace.face.originalLines.length,lineOrigins:row.trace.face.lineEvents.length,polygons:row.trace.face.polygons.length}:null});checkpoint('replayed-original-target',{index:captured.length,id:target.id,reason:result.validation.reason});
 }
 saveExclusive(BASE+'d2.captured-inputs.json',{schema:'orbital-data-center/H12-D2-captured-inputs/1',taskId:'H12-D2',componentAccepted:false,acceptanceComplete:false,sourceCopyVerification:report.sourceCopyVerification,cases:captured});report.capturedInputs=fileRecord(BASE+'d2.captured-inputs.json');
 const certificateCommand=['python3',BASE+'d2-exact-certificates.py','--input',BASE+'d2.captured-inputs.json','--output',BASE+'d2.exact-certificates.json'];report.certificateCommand=certificateCommand;checkpoint('starting-exact-captured-pair-certificates');
 const certOut=fs.openSync(BASE+'d2.certificate.stdout.log','wx'),certErr=fs.openSync(BASE+'d2.certificate.stderr.log','wx');let child;try{child=spawnSync(certificateCommand[0],certificateCommand.slice(1),{stdio:['ignore',certOut,certErr]});}finally{fs.closeSync(certOut);fs.closeSync(certErr);}assert(!child.error,child.error?.message);assert.equal(child.status,0,'Exact certificate child must finish successfully');
 const certificates=read(BASE+'d2.exact-certificates.json');assert(certificates.completed);assert.equal(certificates.inputSha256,report.capturedInputs.sha256);assert.equal(certificates.cases.length,19);report.exactCertificates=fileRecord(BASE+'d2.exact-certificates.json');
 for(const original of captured.filter(row=>row.kind==='arrangement')){const certificate=certificates.cases.find(row=>row.id===original.id);assert(certificate?.kind==='arrangement');const result=harness.counterfactual(original.trace.face,certificate.retainedLineIndices);report.counterfactuals.push({id:original.id,...result});checkpoint('counterfactual-one-failed-face',{index:report.counterfactuals.length,id:original.id,removedLines:result.removedLineIndices.length,partitionResolved:result.partitionResolved,reason:result.reason??null});}
 report.sourceFinish=declaration.inputFiles.map(row=>fileRecord(row.path));assert.deepEqual(report.sourceFinish,report.sourceStart);report.pinnedInputsAfter=Object.entries(PINS).map(([path,expected])=>{const row=fileRecord(path);assert.equal(row.sha256,expected);return row;});assert.deepEqual(report.pinnedInputsAfter,report.pinnedInputs);
 report.sourceUnchanged=true;report.summary={targets:19,originalFailuresReproduced:report.cases.length,selfPairs:4,arrangementFaces:15,exactCertificateCases:certificates.cases.length,pairLegalIntersectionProved:certificates.cases.filter(r=>r.kind==='self'&&r.pairLegalIntersectionProved).length,actualIllegalSelfIntersectionsProved:certificates.cases.filter(r=>r.kind==='self'&&r.actualIllegalIntersectionProved).length,counterfactualPartitionsResolved:report.counterfactuals.filter(r=>r.partitionResolved).length,counterfactualPartitionsUnresolved:report.counterfactuals.filter(r=>!r.partitionResolved).length,componentAccepted:false,acceptanceComplete:false};
 report.completed=report.diagnosisComplete=true;report.finishedAt=new Date().toISOString();checkpoint('completed-saved-residual-diagnosis');
}catch(error){report.error={name:error.name,message:error.message,stack:error.stack};report.finishedAt=new Date().toISOString();checkpoint('incomplete-saved-residual-diagnosis');process.exitCode=2;}
