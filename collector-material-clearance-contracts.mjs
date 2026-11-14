#!/usr/bin/env node
// H12-C2: twenty finite contracts. No native factory or material-join calls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import * as T from './dist/vendor/three.module.js';
import {routingMatrix,obstacleFromMesh,segmentObstacleClearance as kernel} from './dist/routing-audit.js';
import {diagnoseCollectorMeshEdgeDistance} from './dist/inline-collector-clearance.js';

const OUTPUT='docs/harnessing-work/H12-C2-result.json',BASE='docs/harnessing-work/H12-work/',SOURCE_BASE='ad19a8e6c193d6eb283cebbfec0619397a37bedc';
const SMALL=BASE+'g1a.small-extracts.json',C1='docs/harnessing-work/H12-C1-result.json';
const PINS={[SMALL]:'c4a37917be5e99e52f6e206f19b9ac9548ff5fa80db1edc3e9afc8a397350294',[C1]:'4170437fe46f8c602672a88d0cdea4ecd640efcb2d63fb69f9d020a7ad4c3e72'};
assert.deepEqual(process.argv.slice(2),['--output',OUTPUT]);for(const path of[OUTPUT,OUTPUT+'.tmp'])assert(!fs.existsSync(path),'Refusing retained output overwrite: '+path);
const hash=data=>createHash('sha256').update(data).digest('hex'),fileRecord=path=>{const bytes=fs.readFileSync(path);return {path,bytes:bytes.length,sha256:hash(bytes)};};
const encode=(key,value)=>typeof value==='number'&&!Number.isFinite(value)?{numberEncoding:Number.isNaN(value)?'NaN':value<0?'negative-infinity':'positive-infinity',field:key}:value;
const started=performance.now(),cpuStarted=process.cpuUsage();
const report={schema:'orbital-data-center/H12-C2-clearance-contracts/1',taskId:'H12-C2',startedAt:new Date().toISOString(),completed:false,contractsAccepted:false,componentAccepted:false,acceptanceComplete:false,nativeFactoryExecuted:false,materialJoinHelperExecuted:false,publicationAttempted:false,cases:[],helperInvocations:0,referenceInvocations:0,expectedCounts:{namedContracts:20,helperInvocations:22,referenceInvocations:21},executionBoundary:'One helper and reference comparison per synthetic contract; two before/after pairs for each mutation contract. The actual fixed pair uses retained C1 as its reference without rerunning that baseline.'};
function progress(status){report.status=status;report.elapsedSeconds=(performance.now()-started)/1000;fs.writeFileSync(OUTPUT+'.tmp',JSON.stringify(report,encode,2)+'\n',{flag:'wx'});fs.renameSync(OUTPUT+'.tmp',OUTPUT);console.log(JSON.stringify({status,cases:report.cases.length,helperInvocations:report.helperInvocations,referenceInvocations:report.referenceInvocations}));}

// BEGIN frozen R1 extraction
const V=p=>new T.Vector3(...p),distance=(a,b)=>Math.hypot(...a.map((x,k)=>x-b[k]));
function bounds(points){return {min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))};}
function boxDistance(a,b){return Math.hypot(...[0,1,2].map(k=>Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])));}
const geomCache=new WeakMap();
const sub3=(a,b)=>a.map((x,k)=>x-b[k]),cross3=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm3=a=>Math.hypot(...a);
function actualGeometry(mesh,root){
 if(geomCache.has(mesh))return geomCache.get(mesh);
 const g=mesh.geometry,p=g.attributes.position,ix=g.index,M=routingMatrix(mesh,root),vertices=Array.from({length:p.count},(_,i)=>V([p.getX(i),p.getY(i),p.getZ(i)]).applyMatrix4(M).toArray()),triangles=[],edges=[],seen=new Set(),extraction={indexedTriangleCount:Math.floor((ix?.count??p.count)/3),discardedExactlyZeroAreaTriangles:0,coordinateSnapping:false,windingChanges:false};
 for(let i=0,n=ix?.count??p.count;i+2<n;i+=3){const t=[0,1,2].map(j=>vertices[ix?ix.getX(i+j):i+j]);if(norm3(cross3(sub3(t[1],t[0]),sub3(t[2],t[0])))===0){extraction.discardedExactlyZeroAreaTriangles++;continue;}triangles.push(Object.freeze(t.map(Object.freeze)));for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3],key=[a.join(','),b.join(',')].sort().join('|');if(!seen.has(key)){seen.add(key);edges.push([a,b]);}}}
 const original=obstacleFromMesh(mesh,{frame:root}),obstacle={id:mesh.uuid,type:'mesh',triangles:Object.freeze(triangles),bounds:bounds(vertices),closed:original.type==='mesh'?original.closed:true,apertures:[]},data={mesh,vertices,triangles,edges,obstacle,extraction};geomCache.set(mesh,data);return data;
}
// END frozen R1 extraction

// BEGIN frozen C1 byte reconstruction
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
// END frozen C1 byte reconstruction

function referenceEdgeLoop(A,B,threshold,segmentObstacleClearance){
 let minimum=Infinity,witness=null;for(const [one,other]of[[A,B],[B,A]])for(const edge of one.edges){const d=segmentObstacleClearance(...edge,other.obstacle);if(d<minimum){minimum=d;witness={edgeMeshId:one.mesh.uuid,otherMeshId:other.mesh.uuid,edge,distanceM:d};}if(d<threshold-1e-7)return {minimumDistanceM:minimum,method:'bidirectional-actual-mesh-edge-solid',witness};}
 return {minimumDistanceM:minimum,method:'bidirectional-actual-mesh-edge-solid',witness};
}

function excerpt(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a);return source.slice(a,b);}
function verifyCopies(){
 const original=fs.readFileSync('starcloud-collector-passage-checks.mjs','utf8'),prior=fs.readFileSync('collector-material-clearance-probe.mjs','utf8'),self=fs.readFileSync('collector-material-clearance-contracts.mjs','utf8'),helper=fs.readFileSync('dist/inline-collector-clearance.js','utf8');
 const extraction=excerpt(original,'const V=p=>new T.Vector3','\nconst expectedIds=')+'\n'+excerpt(original,'function bounds(points)','\nfunction pointInFrame')+'\n'+excerpt(original,'const geomCache=new WeakMap();','\nfunction meshDistance(');
 const reconstruction=excerpt(prior,'function rawGeometryHash(raw){','\nfunction excerpt('),loop=excerpt(original,' let minimum=Infinity,witness=null;for','\n}\nfunction inspectJoin');
 assert.equal(excerpt(self,'// BEGIN frozen R1 extraction\n','\n// END frozen R1 extraction').slice('// BEGIN frozen R1 extraction\n'.length),extraction);
 assert.equal(excerpt(self,'// BEGIN frozen C1 byte reconstruction\n','\n// END frozen C1 byte reconstruction').slice('// BEGIN frozen C1 byte reconstruction\n'.length),reconstruction);
 assert.equal(excerpt(self,'function referenceEdgeLoop(A,B,threshold,segmentObstacleClearance){\n','\n}\n').split('\n').slice(1).join('\n'),loop);
 assert.equal(excerpt(helper,'function originalEdgeLoop(A,B,threshold,segmentObstacleClearance){\n','\n}\n').split('\n').slice(1).join('\n'),loop);
 return [{name:'actual extraction',sha256:hash(extraction),bytes:Buffer.byteLength(extraction),byteIdentical:true},{name:'C1 byte reconstruction',sha256:hash(reconstruction),bytes:Buffer.byteLength(reconstruction),byteIdentical:true},{name:'original edge loop in reference and helper',sha256:hash(loop),bytes:Buffer.byteLength(loop),byteIdentical:true}];
}

function box(lo,hi){
 const [x,y,z]=lo,[X,Y,Z]=hi,v=[[x,y,z],[X,y,z],[X,Y,z],[x,Y,z],[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]],faces=[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
 return faces.flatMap(q=>[[v[q[0]],v[q[1]],v[q[2]]],[v[q[0]],v[q[2]],v[q[3]]]]);
}
function synthetic(id,input,{closed=true,mutable=false,apertures=[]}={}){
 const triangles=input.map(t=>t.map(p=>[...p]));if(!mutable){for(const t of triangles){t.forEach(Object.freeze);Object.freeze(t);}Object.freeze(triangles);}
 const vertices=triangles.flat(),edges=[],seen=new Set();for(const t of triangles)for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3],key=[a.join(','),b.join(',')].sort().join('|');if(!seen.has(key)){seen.add(key);edges.push([a,b]);}}
 return {mesh:{uuid:id},vertices,triangles,edges,obstacle:{id,type:'mesh',triangles,bounds:bounds(vertices),closed,apertures}};
}
function rigid(point){const [x,y,z]=point,ax=.371,az=.619,cx=Math.cos(ax),sx=Math.sin(ax),cz=Math.cos(az),sz=Math.sin(az),q=[x,cx*y-sx*z,sx*y+cx*z];return [cz*q[0]-sz*q[1]+3.17,sz*q[0]+cz*q[1]-2.41,q[2]+.83];}
const immutableInput=data=>JSON.parse(JSON.stringify({id:data.mesh.uuid,triangles:data.obstacle.triangles,edges:data.edges,bounds:data.obstacle.bounds,closed:data.obstacle.closed,apertures:data.obstacle.apertures}));
function queryRows(trace,A,B){
 const rows=[];let previous=-1;
 for(const query of trace){
  assert(Object.isFrozen(query));assert.equal(query.argumentCount,3);const direction=query.obstacle===B.obstacle?0:query.obstacle===A.obstacle?1:-1;assert(direction>=0);
  const one=direction?B:A,edgeIndex=one.edges.findIndex(edge=>edge[0]===query.a&&edge[1]===query.b);assert(edgeIndex>=0,'Evaluated call must retain its exact original endpoint references');
  assert.deepEqual(query.aSnapshot,one.edges[edgeIndex][0]);assert.deepEqual(query.bSnapshot,one.edges[edgeIndex][1]);const position=(direction?A.edges.length:0)+edgeIndex;assert(position>previous,'Evaluated call order must be an original subsequence');previous=position;
  rows.push({direction,edgeIndex,position,edgeMeshId:one.mesh.uuid,obstacleId:query.obstacle.id,edge:[query.aSnapshot,query.bSnapshot],distanceM:query.value,argumentCount:query.argumentCount,inputIdentityPreserved:true});
 }
 return rows;
}
function reference(A,B,threshold){
 report.referenceInvocations++;const queries=[],before=performance.now(),result=referenceEdgeLoop(A,B,threshold,function(a,b,obstacle){const argumentCount=arguments.length,value=kernel(a,b,obstacle);queries.push(Object.freeze({a,b,obstacle,argumentCount,value,aSnapshot:Object.freeze([...a]),bSnapshot:Object.freeze([...b])}));return value;});
 return {result,queries:queryRows(queries,A,B),elapsedSeconds:(performance.now()-before)/1000};
}
function coverage(result,queries,A,B){
 assert(result.complete&&!result.unresolvedKernel);const c=result.coverage;assert.equal(c.directions.length,2);assert.equal(c.totalExpectedEdges,A.edges.length+B.edges.length);
 let processed=0,evaluated=0,skipped=0;
 for(const [i,row]of c.directions.entries()){
  const n=i?B.edges.length:A.edges.length;assert.equal(row.index,i);assert.equal(row.expectedEdges,n);let next=0,evalCount=0,blockCount=0,edgeCount=0;
  for(const run of row.runs){assert.equal(run.firstEdge,next);assert(Number.isInteger(run.edgeCount)&&run.edgeCount>0);next+=run.edgeCount;
   const observed=queries.filter(q=>q.direction===i&&q.edgeIndex>=run.firstEdge&&q.edgeIndex<next);
   if(run.action==='evaluated'){assert.equal(observed.length,run.edgeCount);assert.equal(run.minimumEvaluatedDistanceM,Math.min(...observed.map(q=>q.distanceM)));evalCount+=run.edgeCount;}
   else{assert.equal(observed.length,0);assert(Number.isFinite(run.minimumLowerBoundM)&&run.minimumLowerBoundM>.002+1e-8);assert(row.screening.eligible);if(run.action==='block-bound'){assert.equal(run.blockSize,64);assert.equal(run.edgeCount,(run.blockCount-1)*64+run.lastBlockEdgeCount);blockCount+=run.edgeCount;}else{assert.equal(run.action,'edge-bound');edgeCount+=run.edgeCount;}}
  }
  assert.equal(next,row.processedEdges);assert.equal(evalCount,row.evaluatedEdges);assert.equal(blockCount,row.blockSkippedEdges);assert.equal(edgeCount,row.edgeSkippedEdges);assert.equal(next,evalCount+blockCount+edgeCount);assert.equal(row.complete,next===n);assert.deepEqual(row.unprocessed,next===n?null:{firstEdge:next,edgeCount:n-next});processed+=next;evaluated+=evalCount;skipped+=blockCount+edgeCount;
 }
 assert.equal(processed,c.totalProcessedEdges);assert.equal(evaluated,c.evaluatedEdges);assert.equal(evaluated,queries.length);assert.equal(skipped,c.skippedEdges);assert.equal(processed,evaluated+skipped);
 assert.equal(result.positiveCoverageComplete,!result.earlyRejected&&c.directions.every(row=>row.complete));
 if(skipped){assert.equal(result.minimumDistanceKind,'conservative-lower-bound');assert.equal(result.minimumDistanceM,Math.min(result.minimumSkippedLowerBoundM,result.minimumEvaluatedDistanceM));if(result.minimumSkippedLowerBoundM<result.minimumEvaluatedDistanceM)assert.equal(result.witness,null);}
 else{assert.equal(result.minimumDistanceKind,'evaluated-original-edge-minimum');assert.equal(result.minimumDistanceM,result.minimumEvaluatedDistanceM);}
 if(result.earlyRejected)assert(queries.at(-1).distanceM<.002-1e-7);
 return {complete:true,orderedRangesPartitionProcessedPrefix:true,unprocessedRemainderExplicit:true,evaluatedArgumentsRetainIdentity:true};
}
function inspect(A,B,{threshold=.002,forceExact=false,retainedReference=null,retainInputs=true}={}){
 const inputs=retainInputs?[immutableInput(A),immutableInput(B)]:null,baseline=retainedReference??reference(A,B,threshold),before=performance.now();report.helperInvocations++;const observation=diagnoseCollectorMeshEdgeDistance(A,B,threshold,{forceExact}),elapsedSeconds=(performance.now()-before)/1000,actual=observation.result,queries=queryRows(observation.queries,A,B);
 const baselineRejected=baseline.result.minimumDistanceM<threshold-1e-7,actualRejected=actual.minimumDistanceM<threshold-1e-7;assert.equal(actualRejected,baselineRejected);assert(Number.isFinite(actual.minimumDistanceM));const comparisonRoundoffM=1e-12;assert(actual.minimumDistanceM<=baseline.result.minimumDistanceM+comparisonRoundoffM);
 if(baseline.queries){const byPosition=new Map(baseline.queries.map(q=>[q.position,q]));for(const q of queries){assert(byPosition.has(q.position));assert.deepEqual(q,byPosition.get(q.position));}}
 let checkedCoverage=null;
 if(forceExact||threshold!==.002){assert.deepEqual(Object.keys(actual).sort(),['method','minimumDistanceM','witness']);assert.deepEqual(actual,baseline.result);assert.deepEqual(queries,baseline.queries);}
 else{checkedCoverage=coverage(actual,queries,A,B);assert.equal(actual.earlyRejected,actualRejected);if(actualRejected){assert.equal(actual.minimumDistanceM,baseline.result.minimumDistanceM);assert.deepEqual(actual.witness,baseline.result.witness);}if(!actual.coverage.skippedEdges)assert.deepEqual({minimumDistanceM:actual.minimumDistanceM,method:actual.method,witness:actual.witness},baseline.result);}
 // Keep each before/after observation independent of subsequent input mutation.
 return {inputs,thresholdM:threshold,forceExact,baseline:structuredClone(baseline),actual:structuredClone(actual),queries,elapsedSeconds,comparisonRoundoffM,checkedCoverage,passed:true};
}
function contract(name,work){const before=performance.now();let row;try{row={name,...work(),passed:true};}catch(error){row={name,passed:false,error:{name:error.name,message:error.message,stack:error.stack}};}row.elapsedSeconds=(performance.now()-before)/1000;report.cases.push(row);console.log(JSON.stringify({contract:name,passed:row.passed}));progress('checking-c2-contracts');}
function gapPair(name,gap){return [synthetic(name+'/a',box([0,0,0],[1,1,1])),synthetic(name+'/b',box([1+gap,0,0],[2+gap,1,1]))];}

let exitCode=2,sourcePaths=[];
try{
 report.sourceBaseCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();assert.equal(report.sourceBaseCommit,SOURCE_BASE);
 const declarationPath=BASE+'c2.declaration.json',declaration=JSON.parse(fs.readFileSync(declarationPath,'utf8'));assert.equal(declaration.taskId,'H12-C2');assert.equal(declaration.sourceBaseCommit,SOURCE_BASE);assert.equal(declaration.externalCapSeconds,120);assert.equal(declaration.nodeHeapMiB,2048);assert.deepEqual(declaration.command,['node','--max-old-space-size=2048','collector-material-clearance-contracts.mjs','--output',OUTPUT]);assert.deepEqual(declaration.inputFiles.map(row=>fileRecord(row.path)),declaration.inputFiles);
 sourcePaths=[...declaration.inputFiles.map(row=>row.path),declarationPath].sort();report.sourceStart=sourcePaths.map(fileRecord);for(const [path,pin]of Object.entries(PINS))assert.equal(fileRecord(path).sha256,pin);report.copiedSource=verifyCopies();
 const small=JSON.parse(fs.readFileSync(SMALL,'utf8')),c1=JSON.parse(fs.readFileSync(C1,'utf8'));assert(c1.completed&&c1.diagnosticComplete&&c1.originalProcedureComplete&&!c1.componentAccepted&&!c1.acceptanceComplete);assert.equal(c1.totalCompletedQueries,24662);
 let before=performance.now();const root=new T.Group();root.matrixAutoUpdate=false;root.updateWorldMatrix(true,false);const records=['collector/rotor-carrier','P-SA-1/4/collector/copper'].map(name=>{const matches=small.clearanceRecords.filter(row=>row.name===name);assert.equal(matches.length,1);return matches[0];});assert.deepEqual(records,c1.input.meshRecords);
 const meshes=records.map(record=>rehydrate(record,small.clearanceBuffers.find(raw=>raw.sha256===record.geometrySha256),root));report.fixedPairReconstructionSeconds=(performance.now()-before)/1000;before=performance.now();const fixed=meshes.map(mesh=>actualGeometry(mesh,root));report.fixedPairColdExtractionSeconds=(performance.now()-before)/1000;
 const geometry=fixed.map(data=>({id:data.mesh.uuid,vertices:data.vertices.length,triangles:data.triangles.length,distinctEdges:data.edges.length,extraction:data.extraction,bounds:data.obstacle.bounds,closed:data.obstacle.closed,orderedVerticesSha256:hash(JSON.stringify(data.vertices)),orderedTrianglesSha256:hash(JSON.stringify(data.triangles)),orderedEdgesSha256:hash(JSON.stringify(data.edges))}));assert.deepEqual(geometry,c1.geometry);report.fixedPair={source:fileRecord(C1),packet:fileRecord(SMALL),meshRecords:records,geometry,originalWholeAABBRulesUnchanged:true,wholeAABB:c1.wholeAABB,baselineCacheBasis:c1.cacheBasis};assert.equal(boxDistance(fixed[0].obstacle.bounds,fixed[1].obstacle.bounds),0);

 contract('saved-c1-carrier-copper-pair',()=>{const check=inspect(...fixed,{retainedReference:{result:c1.result,queries:null,source:fileRecord(C1)},retainInputs:false});assert(check.actual.positiveCoverageComplete);assert.equal(check.actual.coverage.totalProcessedEdges,24662);const reverse=check.actual.coverage.directions[1];assert.equal(reverse.blockSkippedEdges+reverse.edgeSkippedEdges,24644);assert.equal(reverse.evaluatedEdges,0);assert(check.actual.coverage.evaluatedEdges<=18);assert(check.actual.minimumDistanceM>.002);return {checks:[check],requiredReverseExclusions:24644,maximumKernelCalls:18};});
 const crossA=box([-2,-.25,-.25],[2,.25,.25]),crossB=box([-.25,-2,-.2],[.25,2,.2]);
 contract('crossing-closed-bars',()=>{const check=inspect(synthetic('cross/a',crossA),synthetic('cross/b',crossB));assert(check.actual.earlyRejected);return {checks:[check]};});
 contract('rigidly-rotated-crossing-bars',()=>{const check=inspect(synthetic('rotated-cross/a',crossA.map(t=>t.map(rigid))),synthetic('rotated-cross/b',crossB.map(t=>t.map(rigid))));assert(check.actual.earlyRejected);return {checks:[check]};});
 contract('full-containment',()=>{const check=inspect(synthetic('contained/a',box([.2,.2,.2],[.4,.4,.4])),synthetic('contained/b',box([0,0,0],[1,1,1])));assert(check.actual.earlyRejected);assert.equal(check.actual.minimumDistanceM,0);return {checks:[check]};});
 contract('far-block-before-near-edge',()=>{const a=synthetic('late-near/a',[...Array.from({length:4},(_,i)=>box([4+i,0,0],[4.1+i,.1,.1])).flat(),...box([.9,.2,.2],[1.1,.4,.4])]),b=synthetic('late-near/b',box([0,0,0],[1,1,1])),check=inspect(a,b);assert(check.actual.earlyRejected);assert.equal(check.queries[0].direction,0);assert.equal(check.queries[0].edgeIndex,72);assert.equal(check.actual.coverage.directions[0].blockSkippedEdges,64);return {checks:[check],firstNearQueryIndex:72};});
 contract('gap-below-required-threshold',()=>{const check=inspect(...gapPair('below',.002-2e-7));assert(check.actual.earlyRejected);return {checks:[check]};});
 contract('gap-exactly-two-millimetres',()=>{const check=inspect(...gapPair('exact',.002));assert(!check.actual.earlyRejected&&check.queries.length>0);return {checks:[check]};});
 contract('gap-above-threshold-inside-padding',()=>{const check=inspect(...gapPair('inside-padding',.002+2e-8));assert(!check.actual.earlyRejected&&check.queries.length>0);return {checks:[check]};});
 contract('comfortably-separated-complete-coverage',()=>{const check=inspect(...gapPair('far',.020));assert(check.actual.positiveCoverageComplete);assert.equal(check.queries.length,0);assert(check.actual.coverage.skippedEdges>0);assert.equal(check.actual.witness,null);return {checks:[check]};});
 contract('thin-triangle-capsule-outside-raw-aabb',()=>{const y=-.002002,a=synthetic('thin/a',[[[-.01,y,0],[.01,y,0],[1,1,0]]],{closed:false}),b=synthetic('thin/b',[[[-5e-6,0,0],[5e-6,0,0],[0,8e-6,0]]],{closed:false}),raw=boxDistance(bounds(a.edges[0]),b.obstacle.bounds);assert(raw>.002+1e-8);const check=inspect(a,b);assert(check.actual.earlyRejected);assert.equal(check.actual.coverage.directions[0].screening.reason,'thin-triangle-kernel-capsule-fallback');assert.equal(check.queries[0].edgeIndex,0);return {checks:[check],rawEdgeAABBWouldExcludeM:raw,thinTriangleDoubledAreaM2:8e-11};});
 contract('positive-area-ill-conditioned-triangle',()=>{const a=synthetic('ill-conditioned/a',box([4,4,4],[4.1,4.1,4.1])),b=synthetic('ill-conditioned/b',[[[-1,0,0],[1,0,0],[0,1e-6,0]]],{closed:false}),check=inspect(a,b);assert.equal(check.actual.coverage.directions[0].screening.reason,'aspect-outside-screening-domain');assert.equal(check.actual.coverage.directions[0].evaluatedEdges,a.edges.length);return {checks:[check]};});
 contract('nonmanifold-conservative-enclosure',()=>{const p=[0,0,0],q=[1,0,0],b=synthetic('conservative/b',[[p,q,[0,1,0]],[q,p,[0,0,1]],[p,q,[0,1,1]]],{closed:true}),a=synthetic('conservative/a',box([.7,.7,.7],[.8,.8,.8])),check=inspect(a,b);assert(check.actual.earlyRejected);assert.equal(check.actual.minimumDistanceM,0);return {checks:[check],threeFacesShareOneEdge:true};});
 contract('nonempty-aperture-metadata-falls-back',()=>{const [a,b]=gapPair('apertures',.020),aperture={id:'unused',routeIds:['unqueried-route'],min:[0,0,0],max:[.1,.1,.1]};a.obstacle.apertures=[aperture];b.obstacle.apertures=[aperture];const check=inspect(a,b);assert.equal(check.actual.coverage.skippedEdges,0);assert(check.actual.coverage.directions.every(row=>row.screening.reason==='nonempty-or-unresolved-apertures'));return {checks:[check]};});
 contract('mutable-edge-between-calls',()=>{const a=synthetic('mutable-edge/a',box([3,3,3],[4,4,4])),b=synthetic('mutable-edge/b',box([0,0,0],[1,1,1])),before=inspect(a,b);assert(!before.actual.earlyRejected);a.edges[0]=[[.2,.2,.2],[.3,.2,.2]];const after=inspect(a,b);assert(after.actual.earlyRejected);assert.equal(after.queries[0].edgeIndex,0);return {checks:[before,after],mutation:'Replace the first current query edge; the record identity and edge array identity remain unchanged.'};});
 contract('mutable-triangle-between-calls',()=>{const a=synthetic('mutable-triangle/a',box([.4,.4,.4],[.5,.5,.5])),b=synthetic('mutable-triangle/b',box([3,3,3],[4,4,4]),{mutable:true}),before=inspect(a,b);assert(!before.actual.earlyRejected);for(const p of b.obstacle.triangles.flat())for(let k=0;k<3;k++)p[k]-=2.8;b.obstacle.bounds=bounds(b.obstacle.triangles.flat());const after=inspect(a,b);assert(after.actual.earlyRejected);assert.equal(after.actual.minimumDistanceM,0);return {checks:[before,after],mutation:'Translate coordinates in the same mutable triangle arrays, update their actual bounds, and retain the record identity.'};});
 contract('unsupported-ordinary-threshold',()=>{const check=inspect(...gapPair('unsupported-threshold',.003),{threshold:.001});assert.equal(check.actual.minimumDistanceM,check.baseline.result.minimumDistanceM);return {checks:[check]};});
 for(const [name,gap,within]of [['force-exact-shell-gap-below',.0001,false],['force-exact-shell-gap-within',.0004,true],['force-exact-shell-gap-above',.0008,false]])contract(name,()=>{const check=inspect(...gapPair(name,gap),{threshold:.0002,forceExact:true});assert.equal(check.actual.minimumDistanceM>=.0002&&check.actual.minimumDistanceM<=.0006,within);return {checks:[check],matingIntervalM:[.0002,.0006],withinInterval:within};});
 contract('force-exact-opened-support',()=>{const check=inspect(...gapPair('opened-support',.010),{threshold:0,forceExact:true});assert(check.actual.minimumDistanceM>.009999999);return {checks:[check]};});

 for(const [i,mesh]of meshes.entries()){assert.equal(actualBufferHash(mesh.geometry),records[i].geometrySha256);assert.deepEqual([...routingMatrix(mesh,root).elements],records[i].bodyMatrix);}
 report.fixedPairBuffersAndMatricesUnchanged=true;report.sourceFinish=sourcePaths.map(fileRecord);report.sourceUnchanged=JSON.stringify(report.sourceStart)===JSON.stringify(report.sourceFinish);report.completed=report.cases.length===20&&report.helperInvocations===22&&report.referenceInvocations===21;report.contractsAccepted=report.completed&&report.sourceUnchanged&&report.cases.every(row=>row.passed);report.summary={namedContracts:report.cases.length,passed:report.cases.filter(row=>row.passed).length,failed:report.cases.filter(row=>!row.passed).length,helperInvocations:report.helperInvocations,referenceInvocations:report.referenceInvocations,fixedPairPassed:report.cases[0]?.passed};exitCode=report.contractsAccepted?0:1;
}catch(error){report.unexpectedError={name:error.name,message:error.message,stack:error.stack};console.error(error.stack);if(sourcePaths.length){report.sourceFinish=sourcePaths.map(path=>{try{return fileRecord(path);}catch(e){return {path,error:e.message};}});report.sourceUnchanged=JSON.stringify(report.sourceStart)===JSON.stringify(report.sourceFinish);}}
report.finishedAt=new Date().toISOString();report.cpuMicroseconds=process.cpuUsage(cpuStarted);report.resourceUsage=process.resourceUsage();progress(report.contractsAccepted?'complete-c2-contracts':'failed-c2-contracts');process.exitCode=exitCode;
