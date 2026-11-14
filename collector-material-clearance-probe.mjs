#!/usr/bin/env node
// H12-C1: observe exactly one retained R1 pair; no scene factory or acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import * as T from './dist/vendor/three.module.js';
import {routingMatrix,obstacleFromMesh,segmentObstacleClearance as originalSegmentObstacleClearance} from './dist/routing-audit.js';

const OUTPUT='docs/harnessing-work/H12-C1-result.json',BASE='docs/harnessing-work/H12-work/',SOURCE_BASE='b33a474fc581a37cf169210145ef715e47d8aa5f';
assert.deepEqual(process.argv.slice(2),['--output',OUTPUT]);
for(const file of[OUTPUT,OUTPUT+'.tmp'])assert(!fs.existsSync(file),'Refusing retained output overwrite: '+file);
const started=performance.now(),hash=data=>createHash('sha256').update(data).digest('hex'),fileRecord=path=>{const data=fs.readFileSync(path);return {path,bytes:data.length,sha256:hash(data)};};
const encode=(key,value)=>typeof value==='number'&&!Number.isFinite(value)?{numberEncoding:Number.isNaN(value)?'NaN':value<0?'negative-infinity':'positive-infinity',field:key}:value;
const report={schema:'orbital-data-center/H12-C1-clearance-probe/1',taskId:'H12-C1',startedAt:new Date().toISOString(),completed:false,diagnosticComplete:false,componentAccepted:false,acceptanceComplete:false,publicationAttempted:false,nativeFactoryExecuted:false,materialJoinHelperExecuted:false,baselineCalls:0,scope:{pair:['collector/rotor-carrier','P-SA-1/4/collector/copper'],thresholdM:.002,forceExact:false,automaticPairSearch:false},timings:{progressWrites:0,progressWriteSecondsBeforeLastSave:0},directions:[],totalCompletedQueries:0,minimumSoFar:Infinity,witnessSoFar:null,lastCompletedQuery:null,slowestCompletedQuery:null,cacheBasis:'Cold extraction is timed separately; first-use routing cache construction remains included in the measured kernel calls. Earlier R1 cache warm-up is not reproduced; this fixed-pair timing does not identify the R1 timeout culprit.'};
function progress(status){
 report.status=status;report.elapsedSeconds=(performance.now()-started)/1000;report.savedAt=new Date().toISOString();report.timings.progressWrites++;
 const before=performance.now();fs.writeFileSync(OUTPUT+'.tmp',JSON.stringify(report,encode,2)+'\n',{flag:'wx'});fs.renameSync(OUTPUT+'.tmp',OUTPUT);report.timings.progressWriteSecondsBeforeLastSave+=(performance.now()-before)/1000;
 console.log(JSON.stringify({status,elapsedSeconds:report.elapsedSeconds,completedQueries:report.totalCompletedQueries,directions:report.directions.map(r=>({id:r.id,completedQueries:r.completedQueries,expectedEdges:r.expectedEdges}))}));
}
// BEGIN frozen R1 vector
const V=p=>new T.Vector3(...p),distance=(a,b)=>Math.hypot(...a.map((x,k)=>x-b[k]));
// END frozen R1 vector
// BEGIN frozen R1 bounds
function bounds(points){return {min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))};}
function boxDistance(a,b){return Math.hypot(...[0,1,2].map(k=>Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])));}
// END frozen R1 bounds
// BEGIN frozen R1 geometry oracle
const geomCache=new WeakMap();
const sub3=(a,b)=>a.map((x,k)=>x-b[k]),cross3=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm3=a=>Math.hypot(...a);
function actualGeometry(mesh,root){
 if(geomCache.has(mesh))return geomCache.get(mesh);
 const g=mesh.geometry,p=g.attributes.position,ix=g.index,M=routingMatrix(mesh,root),vertices=Array.from({length:p.count},(_,i)=>V([p.getX(i),p.getY(i),p.getZ(i)]).applyMatrix4(M).toArray()),triangles=[],edges=[],seen=new Set(),extraction={indexedTriangleCount:Math.floor((ix?.count??p.count)/3),discardedExactlyZeroAreaTriangles:0,coordinateSnapping:false,windingChanges:false};
 for(let i=0,n=ix?.count??p.count;i+2<n;i+=3){const t=[0,1,2].map(j=>vertices[ix?ix.getX(i+j):i+j]);if(norm3(cross3(sub3(t[1],t[0]),sub3(t[2],t[0])))===0){extraction.discardedExactlyZeroAreaTriangles++;continue;}triangles.push(Object.freeze(t.map(Object.freeze)));for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3],key=[a.join(','),b.join(',')].sort().join('|');if(!seen.has(key)){seen.add(key);edges.push([a,b]);}}}
 const original=obstacleFromMesh(mesh,{frame:root}),obstacle={id:mesh.uuid,type:'mesh',triangles:Object.freeze(triangles),bounds:bounds(vertices),closed:original.type==='mesh'?original.closed:true,apertures:[]},data={mesh,vertices,triangles,edges,obstacle,extraction};geomCache.set(mesh,data);return data;
}
function meshDistance(a,b,root,threshold=0,{forceExact=false}={}){
 const A=actualGeometry(a,root),B=actualGeometry(b,root),lower=boxDistance(A.obstacle.bounds,B.obstacle.bounds);if(!forceExact&&lower>threshold+1e-8)return {minimumDistanceM:lower,method:'positive-actual-buffer-AABB-lower-bound',witness:null};
 let minimum=Infinity,witness=null;for(const [one,other]of[[A,B],[B,A]])for(const edge of one.edges){const d=segmentObstacleClearance(...edge,other.obstacle);if(d<minimum){minimum=d;witness={edgeMeshId:one.mesh.uuid,otherMeshId:other.mesh.uuid,edge,distanceM:d};}if(d<threshold-1e-7)return {minimumDistanceM:minimum,method:'bidirectional-actual-mesh-edge-solid',witness};}
 return {minimumDistanceM:minimum,method:'bidirectional-actual-mesh-edge-solid',witness};
}
// END frozen R1 geometry oracle

const invocation={directions:null,current:-1};
// Observation only: the copied meshDistance calls this exact three-argument
// wrapper. Neither its arguments, returned value nor decision order changes.
function segmentObstacleClearance(a,b,obstacle){
 assert.equal(arguments.length,3);
 const index=invocation.directions.findIndex(row=>row.other.obstacle===obstacle);assert(index>=0);
 if(index!==invocation.current){
  assert.equal(index,invocation.current+1);
  if(index)assert.equal(report.directions[index-1].completedQueries,report.directions[index-1].expectedEdges);
  invocation.current=index;report.directions[index].startedAtElapsedSeconds=(performance.now()-started)/1000;progress('checking-c1-direction-'+index);
 }
 const data=invocation.directions[index],row=report.directions[index],edgeIndex=row.completedQueries,edge=data.one.edges[edgeIndex];
 assert(edge&&a===edge[0]&&b===edge[1],'The original edge order or arguments changed');
 const before=performance.now(),value=originalSegmentObstacleClearance(a,b,obstacle),seconds=(performance.now()-before)/1000;
 row.completedQueries++;row.kernelSeconds+=seconds;report.totalCompletedQueries++;
 const query={direction:index,edgeIndex,edgeMeshId:data.one.mesh.uuid,obstacleId:obstacle.id,edge:[a,b],distanceM:value,kernelSeconds:seconds};
 report.lastCompletedQuery=query;if(!report.slowestCompletedQuery||seconds>report.slowestCompletedQuery.kernelSeconds)report.slowestCompletedQuery=query;
 if(value<report.minimumSoFar){report.minimumSoFar=value;report.witnessSoFar={edgeMeshId:data.one.mesh.uuid,otherMeshId:obstacle.id,edge:[a,b],distanceM:value};}
 row.lastCompletedEdgeIndex=edgeIndex;row.elapsedSeconds=(performance.now()-started)/1000-row.startedAtElapsedSeconds;
 if(row.completedQueries%64===0)progress('checking-c1-edges');
 return value;
}
function rawGeometryHash(raw){
 const h=createHash('sha256');h.update(raw.type);
 for(const name of['position','normal','uv'])if(raw.attributes[name]){h.update(name);h.update(Buffer.from(raw.attributes[name].dataBase64,'base64'));}
 if(raw.index){h.update('index');h.update(Buffer.from(raw.index.dataBase64,'base64'));}return h.digest('hex');
}
function actualBufferHash(geometry){
 const h=createHash('sha256');h.update(geometry.type);
 for(const name of['position','normal','uv']){const a=geometry.attributes[name];if(a){h.update(name);h.update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));}}
 const a=geometry.index;if(a){h.update('index');h.update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));}return h.digest('hex');
}
function decoded(value){
 if(value&&typeof value==='object'&&!Array.isArray(value)&&value.numberEncoding){assert.equal(value.numberEncoding,'positive-infinity');assert.equal(value.field,'count');return Infinity;}
 if(Array.isArray(value))return value.map(decoded);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,decoded(item)]));return value;
}
function rehydrate(record,raw,root){
 assert.equal(rawGeometryHash(raw),record.geometrySha256);assert.equal(raw.sha256,record.geometrySha256);assert.equal(raw.type,record.geometryType);
 const types={Float32Array,Uint16Array},attribute=(row,index=false)=>{
  const Type=types[row.arrayType];assert(Type,'Unexpected retained typed array');const bytes=Buffer.from(row.dataBase64,'base64'),size=index?1:row.itemSize;
  assert.equal(bytes.byteLength,row.count*size*Type.BYTES_PER_ELEMENT);const array=new Type(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),value=new T.BufferAttribute(array,size,index?false:row.normalized);assert.equal(value.count,row.count);return value;
 };
 const geometry=new T.BufferGeometry();geometry.type=raw.type;if(raw.parameters!==null)geometry.parameters=decoded(raw.parameters);geometry.userData=decoded(raw.userData);geometry.drawRange=decoded(raw.drawRange);
 for(const [name,row]of Object.entries(raw.attributes))geometry.setAttribute(name,attribute(row));if(raw.index)geometry.setIndex(attribute(raw.index,true));
 const mesh=new T.Mesh(geometry);mesh.uuid=record.id;mesh.name=record.name;mesh.matrixAutoUpdate=false;mesh.matrix.fromArray(record.bodyMatrix);root.add(mesh);mesh.updateWorldMatrix(true,false);
 assert.deepEqual([...routingMatrix(mesh,root).elements],record.bodyMatrix);assert.equal(actualBufferHash(geometry),raw.sha256);return mesh;
}
function excerpt(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a);return source.slice(a,b);}
function verifyCopies(){
 const original=fs.readFileSync('starcloud-collector-passage-checks.mjs','utf8'),self=fs.readFileSync('collector-material-clearance-probe.mjs','utf8');
 return [
  ['vector','const V=p=>new T.Vector3','\nconst expectedIds='],
  ['bounds','function bounds(points)','\nfunction pointInFrame'],
  ['geometry oracle','const geomCache=new WeakMap();','\nfunction inspectJoin(']
 ].map(([name,start,end])=>{const text=excerpt(original,start,end),begin='// BEGIN frozen R1 '+name+'\n',finish='\n// END frozen R1 '+name;assert.equal(excerpt(self,begin,finish).slice(begin.length),text);return {name,sourcePath:'starcloud-collector-passage-checks.mjs',sha256:hash(text),bytes:Buffer.byteLength(text),byteIdentical:true};});
}
function rawBoundEstimates(A,B){
 const before=performance.now(),rows=[];
 for(const [one,other]of[[A,B],[B,A]]){
  let eligibleEdges=0;const blocks=[];
  for(let first=0;first<one.edges.length;first+=64){const edges=one.edges.slice(first,first+64),lower=boxDistance(bounds(edges.flat()),other.obstacle.bounds);let edgesOverThreshold=0;
   for(const edge of edges)if(boxDistance(bounds(edge),other.obstacle.bounds)>.002+1e-8){eligibleEdges++;edgesOverThreshold++;}
   blocks.push({firstEdge:first,edgeCount:edges.length,rawLowerBoundM:lower,rawBlockWouldExclude:lower>.002+1e-8,rawEdgesOverThreshold:edgesOverThreshold});
  }
  rows.push({edgeMeshId:one.mesh.uuid,obstacleId:other.mesh.uuid,totalEdges:one.edges.length,rawEdgesOverThreshold:eligibleEdges,blocks});
 }
 return {performed:true,operative:false,seconds:(performance.now()-before)/1000,blockSize:64,rows,qualification:'Raw vertex AABB estimates only. Thin-triangle fallback capsules (doubled area <=1e-10) may extend outside these bounds; future skips must enclose them and containment behavior or be disabled. No baseline query was skipped, reordered or changed. Force-exact callers remain outside this probe.'};
}
let exitCode=2,sourcePaths=[],meshes=[],records=[],root;
try{
 assert.equal(new Uint8Array(new Uint16Array([0x0102]).buffer)[0],2,'Retained byte order requires little-endian host');
 report.sourceBaseCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();assert.equal(report.sourceBaseCommit,SOURCE_BASE);
 const declarationPath=BASE+'c1.declaration.json',declaration=JSON.parse(fs.readFileSync(declarationPath,'utf8'));
 assert.equal(declaration.taskId,'H12-C1');assert.equal(declaration.sourceBaseCommit,SOURCE_BASE);assert.equal(declaration.externalCapSeconds,60);assert.equal(declaration.nodeHeapMiB,1536);
 assert.deepEqual(declaration.command,['node','--max-old-space-size=1536','collector-material-clearance-probe.mjs','--output',OUTPUT]);
 assert.deepEqual(declaration.inputFiles.map(row=>fileRecord(row.path)),declaration.inputFiles);
 sourcePaths=[...declaration.inputFiles.map(row=>row.path),declarationPath].sort();report.sourceStart=sourcePaths.map(fileRecord);report.copiedSource=verifyCopies();progress('loading-retained-c1-pair');
 let before=performance.now();const smallBytes=fs.readFileSync(BASE+'g1a.small-extracts.json');assert.equal(hash(smallBytes),'c4a37917be5e99e52f6e206f19b9ac9548ff5fa80db1edc3e9afc8a397350294');const packet=JSON.parse(smallBytes);
 const sourceReportBytes=fs.readFileSync('docs/harnessing-work/H12-G1A-result.json');assert.equal(hash(sourceReportBytes),'2ed0c74075ac8fe16d9c88c056fabca6d1e72e1658cc72d87951469d09cced2e');const sourceReport=JSON.parse(sourceReportBytes);assert(sourceReport.captureComplete&&sourceReport.snapshotOnly&&!sourceReport.componentAccepted&&!sourceReport.acceptanceComplete);assert.equal(packet.reportSha256,hash(sourceReportBytes));assert.deepEqual(packet.sourceResult,sourceReport.geometryArchive);
 records=report.scope.pair.map(name=>{const matches=packet.clearanceRecords.filter(row=>row.name===name);assert.equal(matches.length,1);return matches[0];});
 assert.deepEqual(records.map(row=>row.geometrySha256),['f404c1733373602e06525052321c0e1a4e9c7dee55cfed7650d52c79f66d914f','644fc1ad30956c7a9634c6c71a3e8bd6306a0e4b05a54e722917c611be021a1b']);
 report.input={smallPacket:fileRecord(BASE+'g1a.small-extracts.json'),captureReport:fileRecord('docs/harnessing-work/H12-G1A-result.json'),meshRecords:records};report.timings.inputLoadSeconds=(performance.now()-before)/1000;
 before=performance.now();root=new T.Group();root.matrixAutoUpdate=false;root.updateWorldMatrix(true,false);
 meshes=records.map(record=>{const matches=packet.clearanceBuffers.filter(row=>row.sha256===record.geometrySha256);assert.equal(matches.length,1);return rehydrate(record,matches[0],root);});assert.equal(root.children.length,2);
 report.timings.reconstructionSeconds=(performance.now()-before)/1000;report.rehydration={meshes:meshes.map((mesh,i)=>({id:mesh.uuid,geometryType:mesh.geometry.type,bufferSha256:actualBufferHash(mesh.geometry),bodyMatrix:[...routingMatrix(mesh,root).elements],attributes:Object.keys(mesh.geometry.attributes),indexCount:mesh.geometry.index?.count??null,drawRange:mesh.geometry.drawRange,parameters:mesh.geometry.parameters??null,rawHashMatches:actualBufferHash(mesh.geometry)===records[i].geometrySha256})),onlyDeclaredTwoMeshes:true};
 before=performance.now();const A=actualGeometry(meshes[0],root),aSeconds=(performance.now()-before)/1000;before=performance.now();const B=actualGeometry(meshes[1],root),bSeconds=(performance.now()-before)/1000;
 report.timings.coldExtractionSeconds={carrier:aSeconds,copper:bSeconds};
 report.geometry=[A,B].map(data=>({id:data.mesh.uuid,vertices:data.vertices.length,triangles:data.triangles.length,distinctEdges:data.edges.length,extraction:data.extraction,bounds:data.obstacle.bounds,closed:data.obstacle.closed,orderedVerticesSha256:hash(JSON.stringify(data.vertices)),orderedTrianglesSha256:hash(JSON.stringify(data.triangles)),orderedEdgesSha256:hash(JSON.stringify(data.edges))}));
 const lower=boxDistance(A.obstacle.bounds,B.obstacle.bounds);report.wholeAABB={lowerBoundM:lower,thresholdM:.002,exclusionMarginM:1e-8,excludedByOriginalRule:lower>.002+1e-8};
 invocation.directions=[{one:A,other:B},{one:B,other:A}];report.directions=invocation.directions.map(({one,other},i)=>({id:i,edgeMeshId:one.mesh.uuid,obstacleId:other.mesh.uuid,expectedEdges:one.edges.length,completedQueries:0,kernelSeconds:0,lastCompletedEdgeIndex:null}));progress('starting-original-c1-distance');
 before=performance.now();report.baselineCalls++;const result=meshDistance(meshes[0],meshes[1],root,.002,{forceExact:false});report.timings.originalDistanceElapsedSeconds=(performance.now()-before)/1000;report.result=result;
 if(report.wholeAABB.excludedByOriginalRule){assert.equal(report.totalCompletedQueries,0);assert.equal(result.minimumDistanceM,lower);assert.equal(result.method,'positive-actual-buffer-AABB-lower-bound');assert.equal(result.witness,null);report.originalEarlyRejection=false;}
 else{assert.equal(result.minimumDistanceM,report.minimumSoFar);assert.deepEqual(result.witness,report.witnessSoFar);assert.equal(result.method,'bidirectional-actual-mesh-edge-solid');report.originalEarlyRejection=result.minimumDistanceM<.002-1e-7;if(report.originalEarlyRejection)assert.equal(report.lastCompletedQuery.distanceM,result.minimumDistanceM);else for(const row of report.directions)assert.equal(row.completedQueries,row.expectedEdges);}
 assert(Number.isFinite(result.minimumDistanceM));report.originalProcedureComplete=true;report.timings.kernelSeconds=report.directions.reduce((sum,row)=>sum+row.kernelSeconds,0);progress('completed-original-c1-distance');
 report.nonoperativeBounds=report.wholeAABB.excludedByOriginalRule?{performed:false,reason:'Original whole-AABB exclusion; no further pair work.'}:rawBoundEstimates(A,B);
 for(const [i,mesh]of meshes.entries()){assert.equal(actualBufferHash(mesh.geometry),records[i].geometrySha256);assert.deepEqual([...routingMatrix(mesh,root).elements],records[i].bodyMatrix);}
 report.buffersAndMatricesUnchanged=true;report.sourceFinish=sourcePaths.map(fileRecord);report.sourceUnchanged=JSON.stringify(report.sourceStart)===JSON.stringify(report.sourceFinish);assert(report.sourceUnchanged);
 report.completed=true;report.diagnosticComplete=true;report.finishedAt=new Date().toISOString();exitCode=0;progress('complete-c1-diagnostic');
}catch(error){report.unexpectedError={name:error.name,message:error.message,stack:error.stack};report.finishedAt=new Date().toISOString();if(sourcePaths.length){report.sourceFinish=sourcePaths.map(path=>{try{return fileRecord(path);}catch(e){return {path,error:e.message};}});report.sourceUnchanged=JSON.stringify(report.sourceStart)===JSON.stringify(report.sourceFinish);}console.error(error.stack);progress('failed-c1-diagnostic');}
process.exitCode=exitCode;
