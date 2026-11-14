// H12-D3: six retained faces; exact boundary evidence and one partition each.
// No native reconstruction, full join replay, membership or material acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const BASE='docs/harnessing-work/H12-work/',OUTPUT='docs/harnessing-work/H12-D3-result.json';
const SOURCE_BASE='3e40eed861bd4f704518a8ff367cfd2021815776';
assert.deepEqual(process.argv.slice(2),['--output',OUTPUT]);assert(!process.env.NODE_OPTIONS);
const hash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const encode=(key,value)=>typeof value==='number'&&!Number.isFinite(value)?{numberEncoding:Number.isNaN(value)?'NaN':value<0?'negative-infinity':'positive-infinity',field:key}:value;
const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const fileRecord=path=>{const bytes=fs.readFileSync(path);return {path,bytes:bytes.length,sha256:hash(bytes)};};
const save=(path,value)=>fs.writeFileSync(path,JSON.stringify(value,encode,2)+'\n',{flag:'wx'});
const PINS={
 [BASE+'d2.captured-inputs.json']:'7f50a9e73c48006e308312a51d103346b465db85ecddce504dbaadf44bb77822',
 [BASE+'d2.exact-certificates.json']:'996f989ee4da5d49376d0123ba4cd2caad0c297e3b3e8de4ee5be23c7ac05b94',
 'docs/harnessing-work/H12-D2-result.json':'1ffc5f0298053eccb763afa325616b0d56e3ce2ba3e31497a2ca0edffb75ef9d',
 [BASE+'d2.process.json']:'0ac48693027fbdcf4eb721b6bb509cdb372bbcbaef6f489e20e8616e063f8e20',
 [BASE+'d2-exact-certificates.py']:'9f6a628d3c02f4c9d4d52a593c65625885b71f36d65600825a63bd3937b2c348',
 'dist/inline-collector-join-geometry.js':'212f2af8c83be79b704e58e4d0f32ca5d786eb53a6a56885eeef3ca0784c9072'
};
const TARGETS=[
 {id:'enclosure-shell/0/4',side:'a',triangle:10,seedLine:101,seedPair:[94,101]},
 {id:'enclosure-shell/1/5',side:'a',triangle:8,seedLine:15,seedPair:[323,317]},
 {id:'P-SA-1/0/collector/copper-brush',side:'b',triangle:20,seedLine:14,seedPair:[16400,16402],control:{line:13,cap:16398,edge:1,walls:[14,15]}},
 {id:'P-SA-1/0/collector/copper-terminal',side:'a',triangle:16385,seedLine:0,seedPair:[56,58]},
 {id:'P-SA-1/0/collector/flange-shell',side:'a',triangle:5,seedLine:33,seedPair:[42,46],control:{line:44,cap:6,edge:1,walls:[166,167]}},
 {id:'P-SA-1/0/collector/terminal-insulator/flange',side:'a',triangle:6,seedLine:12,seedPair:[27,23]}
];
const CERTIFICATE_COMMAND=['python3',BASE+'d3-planar-certificates.py','--input',BASE+'d2.captured-inputs.json','--prior-certificates',BASE+'d2.exact-certificates.json','--output',BASE+'d3.planar-certificates.json'];
const started=Date.now(),report={schema:'orbital-data-center/H12-D3-planar-diagnostic/1',taskId:'H12-D3',sourceBaseCommit:SOURCE_BASE,startedAt:new Date(started).toISOString(),completed:false,diagnosisComplete:false,componentAccepted:false,acceptanceComplete:false,nativeSceneConstructed:false,fullJoinReplayExecuted:false,materialMembershipExecuted:false,clearanceTraversalExecuted:false,productionHelperChanged:false,publicationAttempted:false,cases:[],events:[]};
assert(!fs.existsSync(OUTPUT));save(OUTPUT,report);
function checkpoint(stage,extra={}){report.status=stage;report.elapsedMs=Date.now()-started;report.events.push({stage,elapsedMs:report.elapsedMs,...extra});const temp=OUTPUT+'.tmp';fs.writeFileSync(temp,JSON.stringify(report,encode,2)+'\n',{flag:'wx'});fs.renameSync(temp,OUTPUT);process.stdout.write(JSON.stringify({stage,elapsedMs:report.elapsedMs,...extra})+'\n');}

function ancestry(trace,id){
 const parents=new Map();for(const [index,split]of trace.splits.entries())for(const child of split.children){assert(!parents.has(child));parents.set(child,{...split,splitIndex:index});}
 const rows=[],seen=new Set();let current=id;
 while(parents.has(current)){assert(!seen.has(current),'Acyclic polygon ancestry');seen.add(current);const row=parents.get(current);rows.push({splitIndex:row.splitIndex,originalLineIndex:row.originalLineIndex,parent:row.parent,child:current});current=row.parent;}
 if(id!==null)assert(trace.initialPolygonIds.includes(current),'Failure ancestry reaches the original query polygon');
 return rows.reverse();
}

async function createPartitionHarness(source){
 assert.equal(hash(source),PINS['dist/inline-collector-join-geometry.js']);
 const start=source.indexOf('function cells(t,candidates,ctx){'),end=source.indexOf('\n/** Inspect actual material solids.',start);assert(start>=0&&end>start);
 const original=source.slice(start,end);
 const supplied=original.replace('function cells(t,candidates,ctx){','function d3Cells(t,providedLines,ctx){').replace('const f=frame(t),lines=arrangementLines(t,candidates,ctx,f);','const f=frame(t),lines=providedLines;');
 assert.equal(supplied.replace('function d3Cells(t,providedLines,ctx){','function cells(t,candidates,ctx){').replace('const f=frame(t),lines=providedLines;','const f=frame(t),lines=arrangementLines(t,candidates,ctx,f);'),original);
 let traced=supplied,insertionCount=0;
 const insert=(anchor,text,{after=false}={})=>{assert.equal(traced.split(anchor).length,2,'Unique partition observer anchor');const at=traced.indexOf(anchor)+(after?anchor.length:0),n=insertionCount++;traced=traced.slice(0,at)+`/*D3_INSERT_BEGIN:${n}*/${text}/*D3_INSERT_END:${n}*/`+traced.slice(at);};
 insert('let polygons=[t.p.map(f.to)];','d3Initial(polygons);',{after:true});
 insert('const pieces=[clip(poly,line,1,ctx.eps),clip(poly,line,-1,ctx.eps)];','d3Split(poly,line,pieces);',{after:true});
 insert('for(const piece of pieces){','d3Piece(piece);',{after:true});
 insert(' let accumulated=0;',' d3Final(polygons);\n');
 insert('  if(!(margin>ctx.tol))fail','  d3Cell(poly,a,p,margin);\n');
 const stripped=traced.replace(/\/\*D3_INSERT_BEGIN:(\d+)\*\/[\s\S]*?\/\*D3_INSERT_END:\1\*\//g,'');assert.equal(stripped,supplied);
 const observation=String.raw`
let d3Active=null;
function d3Polygon(poly){if(!d3Active.ids.has(poly)){const id=d3Active.trace.polygons.length;d3Active.ids.set(poly,id);d3Active.trace.polygons.push({id,vertices:poly.map(p=>[...p])});}return d3Active.ids.get(poly);}
function d3Initial(polygons){d3Active.trace.initialPolygonIds=polygons.map(d3Polygon);}
function d3Split(poly,line,pieces){const originalLineIndex=d3Active.lineIndices.get(line);if(!Number.isInteger(originalLineIndex))throw new Error('Unknown original partition line');d3Active.trace.splits.push({parent:d3Polygon(poly),originalLineIndex,children:pieces.map(d3Polygon)});}
function d3Piece(piece){d3Active.currentPiece=d3Polygon(piece);}
function d3Final(polygons){d3Active.trace.finalPolygonIds=polygons.map(d3Polygon);}
function d3Cell(poly,a,p,margin){d3Active.currentCell={polygonId:d3Polygon(poly),areaM2:a,centroid:[...p],inradiusLowerBoundM:margin};}
export function runD3Partition(face,retainedIndices){
 if(d3Active)throw new Error('D3 partition cannot nest');
 const lines=retainedIndices.map(i=>face.originalLines[i]),ctx={tol:face.toleranceM,eps:face.arithmeticToleranceM,counts:{...face.countsBefore}};
 const trace={initialPolygonIds:[],finalPolygonIds:[],polygons:[],splits:[],firstFailure:null};
 d3Active={trace,ids:new WeakMap(),lineIndices:new Map(lines.map((line,i)=>[line,retainedIndices[i]])),currentCell:null,currentPiece:null};
 const output={diagnosticOnly:true,componentAccepted:false,acceptanceComplete:false,membershipExecuted:false,partitionResolved:false,originalLineCount:face.originalLines.length,retainedLineIndices:[...retainedIndices],removedLineIndices:face.originalLines.map((_,i)=>i).filter(i=>!retainedIndices.includes(i)),trace};
 try{output.cells=d3Cells(face.query,lines,ctx);output.partitionResolved=true;output.checkedCounts=ctx.counts;}
 catch(error){if(!(error instanceof Unresolved))throw error;output.reason=error.message;output.unresolved=error.detail;const polygonId=error.message==='arrangement-cell-below-resolution'?d3Active.currentCell?.polygonId??null:error.message==='unresolved-arrangement-sliver'?d3Active.currentPiece:null;trace.firstFailure={reason:error.message,detail:structuredClone(error.detail),polygonId,cell:error.message==='arrangement-cell-below-resolution'?structuredClone(d3Active.currentCell):null};}
 finally{d3Active=null;}
 return output;
}
`;
 const moduleSource=source+'\n'+observation+'\n'+traced;
 const module=await import('data:text/javascript;base64,'+Buffer.from(moduleSource).toString('base64'));
 return {partition:module.runD3Partition,source:moduleSource,verification:{acceptedJ2Sha256:hash(source),originalHelperPrefixUnchanged:true,originalCellsSha256:hash(original),suppliedLineCellsSha256:hash(supplied),tracedCellsSha256:hash(traced),strippedTraceSha256:hash(stripped),observerInsertionCount:insertionCount,strippedBytesEqualSuppliedLineRoutine:true,onlyNumericalSourceChanges:'Function name/signature and provided-line substitution; all remaining original cell operations are byte-identical',derivedModuleSha256:hash(moduleSource),membershipExecuted:false}};
}

try{
 const declaration=read(BASE+'d3.declaration.json');assert.equal(declaration.sourceBaseCommit,SOURCE_BASE);assert.equal(declaration.externalCapSeconds,60);assert.equal(declaration.nodeHeapMiB,1024);assert.deepEqual(declaration.certificateCommand,CERTIFICATE_COMMAND);assert.deepEqual(declaration.targets,TARGETS);
 report.sourceStart=declaration.inputFiles.map(row=>{const actual=fileRecord(row.path);assert.deepEqual(actual,row);return actual;});
 report.pinnedInputs=Object.entries(PINS).map(([path,digest])=>{const row=fileRecord(path);assert.equal(row.sha256,digest);return row;});
 const captured=read(BASE+'d2.captured-inputs.json'),prior=read(BASE+'d2.exact-certificates.json'),old=read('docs/harnessing-work/H12-D2-result.json'),priorProcess=read(BASE+'d2.process.json');
 assert(old.completed&&old.diagnosisComplete&&priorProcess.diagnosisComplete&&priorProcess.inputFilesUnchanged&&priorProcess.originalValidationEqualityVerified);assert.equal(priorProcess.exitCode,0);assert.equal(captured.cases.length,19);assert(prior.completed);
 const cases=new Map(captured.cases.map(r=>[r.id,r])),previous=new Map(prior.cases.map(r=>[r.id,r])),oldCases=new Map(old.cases.map(r=>[r.id,r])),oldPartitions=new Map(old.counterfactuals.map(r=>[r.id,r]));
 report.targets=TARGETS;report.retainedD2={process:fileRecord(BASE+'d2.process.json'),capturedInputs:fileRecord(BASE+'d2.captured-inputs.json'),exactCertificates:fileRecord(BASE+'d2.exact-certificates.json'),result:fileRecord('docs/harnessing-work/H12-D2-result.json')};
 for(const target of TARGETS){const c=cases.get(target.id),f=c?.trace.face,p=oldPartitions.get(target.id);assert(c&&f&&p&&!p.partitionResolved);assert.equal(c.kind,'arrangement');assert(c.originalValidationEqual);assert.deepEqual(c.validation,oldCases.get(target.id).validation);assert.equal(f.input,target.side);assert.equal(f.query.i,target.triangle);assert.equal(c.validation.reason,'arrangement-cell-below-resolution');assert.equal(p.reason,'arrangement-cell-below-resolution');assert.equal(f.toleranceM,2e-7);assert(f.candidates.every(row=>row.owner==='other'&&row.triangle.component===0));assert.deepEqual(previous.get(target.id).retainedLineIndices,p.retainedLineIndices);}
 checkpoint('verified-six-retained-faces');
 const harness=await createPartitionHarness(fs.readFileSync('dist/inline-collector-join-geometry.js','utf8'));
 fs.writeFileSync(BASE+'d3.cells-instrumented.mjs',harness.source,{flag:'wx'});save(BASE+'d3.source-copy-verification.json',harness.verification);
 report.diagnosticCopy=fileRecord(BASE+'d3.cells-instrumented.mjs');report.sourceCopyVerification=fileRecord(BASE+'d3.source-copy-verification.json');
 report.certificateCommand=CERTIFICATE_COMMAND;checkpoint('starting-planar-certificates');
 const out=fs.openSync(BASE+'d3.certificate.stdout.log','wx'),err=fs.openSync(BASE+'d3.certificate.stderr.log','wx');let child;
 try{child=spawnSync(CERTIFICATE_COMMAND[0],CERTIFICATE_COMMAND.slice(1),{stdio:['ignore',out,err]});}finally{fs.closeSync(out);fs.closeSync(err);}
 assert(!child.error,child.error?.message);assert.equal(child.status,0,'D3 exact certificate child must complete');
 const certificates=read(BASE+'d3.planar-certificates.json');assert(certificates.completed);assert.equal(certificates.inputSha256,PINS[BASE+'d2.captured-inputs.json']);assert.equal(certificates.priorCertificatesSha256,PINS[BASE+'d2.exact-certificates.json']);assert.equal(certificates.fractionPrimitivesSha256,PINS[BASE+'d2-exact-certificates.py']);assert.deepEqual(certificates.cases.map(r=>r.id),TARGETS.map(t=>t.id));report.planarCertificates=fileRecord(BASE+'d3.planar-certificates.json');
 for(const [index,target]of TARGETS.entries()){
  const original=cases.get(target.id),face=original.trace.face,cert=certificates.cases[index],oldCert=previous.get(target.id);assert.equal(cert.originalValidationSha256,original.originalValidationSha256);assert.equal(cert.querySide,target.side);assert.equal(cert.queryTriangle,target.triangle);assert.equal(cert.originCertificates.length,face.lineEvents.length);assert.equal(cert.candidatePlaneCertificates.length,face.candidates.length);assert.equal(cert.lines.length,original.lineGroups.length);assert.deepEqual(cert.priorRetainedLineIndices,oldCert.retainedLineIndices);
  for(const [i,origin]of cert.originCertificates.entries()){const event=face.lineEvents[i],oldOrigin=oldCert.originCertificates[i];for(const key of ['event','candidate','kind','edge'])assert.equal(origin[key],event[key]);assert.equal(origin.priorD2ExclusionProved,oldOrigin.excludedFromQueryRelativeInteriorProved);for(const j of origin.internalSeamCertificateIndices){const seam=cert.internalSeamCertificates[j];assert(seam.internalSeamProved&&seam.events.includes(i));}assert.equal(origin.covered,origin.priorD2ExclusionProved||origin.originalPlaneFiniteEdgeExclusion.proved||origin.internalSeamCertificateIndices.length>0);}
  for(const [i,line]of cert.lines.entries()){assert.equal(line.index,i);assert.deepEqual(line.origins,original.lineGroups[i].origins);assert.equal(line.allOriginsCovered,line.origins.every(j=>cert.originCertificates[j].covered));assert.equal(line.retained,!line.allOriginsCovered);}
  const retained=cert.lines.filter(line=>line.retained).map(line=>line.index);assert.deepEqual(retained,cert.retainedLineIndices);assert(retained.every(i=>oldCert.retainedLineIndices.includes(i)));
  if(target.control){assert(cert.control.retained&&retained.includes(target.control.line));assert.deepEqual(cert.control.walls,target.control.walls);assert.equal(cert.control.cap,target.control.cap);assert.equal(cert.control.edge,target.control.edge);assert(cert.control.unresolvedOrigins.length>0);}
  const partition=harness.partition(face,retained);assert.equal(partition.membershipExecuted,false);assert.equal(partition.componentAccepted,false);assert.equal(partition.acceptanceComplete,false);
  const failureId=partition.trace.firstFailure?.polygonId??null;partition.trace.firstFailureAncestry=failureId===null?[]:ancestry(partition.trace,failureId);
  const originalFailureId=face.firstFailure?.cell?.polygonId??null,originalTrace={...face,initialPolygonIds:face.initialPolygonIds,splits:face.splits.map(s=>({...s,originalLineIndex:s.line}))};
  report.cases.push({id:target.id,target,originalCapturedCaseSha256:hash(original),originalValidationSha256:original.originalValidationSha256,query:face.query,candidateCount:face.candidates.length,originalLineOriginCount:face.lineEvents.length,priorRetainedLineIndices:oldCert.retainedLineIndices,originalFailure:face.firstFailure,originalFailureAncestry:originalFailureId===null?[]:ancestry(originalTrace,originalFailureId),seed:cert.seed,control:cert.control,certificateCaseIndex:index,partition});
  checkpoint('partitioned-one-captured-face',{index:index+1,id:target.id,originalLines:face.originalLines.length,priorRetainedLines:oldCert.retainedLineIndices.length,retainedLines:retained.length,partitionResolved:partition.partitionResolved,reason:partition.reason??null});
 }
 report.sourceFinish=declaration.inputFiles.map(row=>fileRecord(row.path));assert.deepEqual(report.sourceFinish,report.sourceStart);report.pinnedInputsAfter=Object.entries(PINS).map(([path,digest])=>{const row=fileRecord(path);assert.equal(row.sha256,digest);return row;});assert.deepEqual(report.pinnedInputsAfter,report.pinnedInputs);
 report.sourceUnchanged=true;report.summary={targets:6,partitionCalls:report.cases.length,controls:report.cases.filter(r=>r.control).length,controlsRetained:report.cases.filter(r=>r.control?.retained).length,partitionsResolved:report.cases.filter(r=>r.partition.partitionResolved).length,partitionsUnresolved:report.cases.filter(r=>!r.partition.partitionResolved).length,candidateTriangles:certificates.cases.reduce((n,r)=>n+r.candidatePlaneCertificates.length,0),exactlyCoplanarCandidates:certificates.cases.reduce((n,r)=>n+r.candidatePlaneCertificates.filter(c=>c.exactlyCoplanarWithQuery).length,0),internalSeamsProved:certificates.cases.reduce((n,r)=>n+r.internalSeamCertificates.filter(c=>c.internalSeamProved).length,0),originalLineOrigins:certificates.cases.reduce((n,r)=>n+r.originCertificates.length,0),newlyCoveredOrigins:certificates.cases.reduce((n,r)=>n+r.originCertificates.filter(c=>c.covered&&!c.priorD2ExclusionProved).length,0),originalLines:report.cases.reduce((n,r)=>n+r.partition.originalLineCount,0),retainedLines:report.cases.reduce((n,r)=>n+r.partition.retainedLineIndices.length,0),unionCoverageComputed:false,materialMembershipExecuted:false,componentAccepted:false,acceptanceComplete:false};
 report.completed=report.diagnosisComplete=true;report.finishedAt=new Date().toISOString();checkpoint('completed-six-planar-boundary-diagnoses');
}catch(error){report.error={name:error.name,message:error.message,stack:error.stack};report.finishedAt=new Date().toISOString();checkpoint('incomplete-planar-boundary-diagnosis');process.exitCode=2;}
