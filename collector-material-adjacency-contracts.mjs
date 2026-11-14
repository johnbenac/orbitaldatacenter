#!/usr/bin/env node
// H12-J2 only: unchanged legacy87, exact shared-edge fixtures, independent
// Fraction certificates. No native scene, physical constructor or R1 runner.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {inspectCollectorSharedEdgePair} from './dist/inline-collector-join-geometry.js';

const OUTPUT='docs/harnessing-work/H12-J2-result.json';
const LEGACY='docs/harnessing-work/H12-J2-legacy-result.json';
const INPUT='docs/harnessing-work/H12-work/j2.pair-inputs.json';
const FRACTION='docs/harnessing-work/H12-work/j2.fraction.json';
const SMALL='docs/harnessing-work/H12-work/g1a.small-extracts.json';
const G1A='docs/harnessing-work/H12-G1A-result.json';
const HISTORICAL='docs/harnessing-work/H12-J1-result.json';
const PINS={
 [SMALL]:'c4a37917be5e99e52f6e206f19b9ac9548ff5fa80db1edc3e9afc8a397350294',
 [G1A]:'2ed0c74075ac8fe16d9c88c056fabca6d1e72e1658cc72d87951469d09cced2e',
 [HISTORICAL]:'cb934ee7c2ced9293d2c0b3896ec22b356977b36eb4898939e57ac90da7f0a12'
};
const SOURCE_FILES=[
 'collector-material-adjacency-contracts.mjs','collector-material-join-contracts.mjs',
 'dist/inline-collector-join-geometry.js','docs/harnessing-work/H12-work/certify-adjacency.py',
 'docs/harnessing-work/H12-work/run-adjacency-process.py','docs/harnessing-work/H12-J2-card.md',
 'docs/harnessing-work/H12-J1-card.md','docs/harnessing-work/H12-J1-receipt.md',
 'docs/harnessing-work/H12-J1-review.md','docs/harnessing-work/H12-work/j1.source.zip',
 'docs/harnessing-work/H12-G1A-receipt.md',SMALL,G1A,HISTORICAL
];
const hashFile=path=>{const data=fs.readFileSync(path);return {path,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')};};
const variants=['base','swapped','axis-permutation','sign-change','power-two-scale'];
const row=(i,p,ids,component=0)=>({i,p,ids,component});

function fixtures(small){
 const list=[];
 const add=(name,a,b,classification,reason=null,determinantSign=null,provenance=null)=>list.push({name,a,b,expected:{classification,...(reason?{reason}:{}),...(determinantSign===null?{}:{determinantSign})},provenance});
 for(const material of ['copper','jacket']){
  const extract=small.triangleExtracts.find(item=>item.id===`P-SA-1/0/collector/${material}`);
  assert(extract&&extract.triangles.length===2);
  for(const [frame,field] of [['local','localVertices'],['body','bodyVertices']]){
   const [a,b]=extract.triangles.map(t=>row(t.filteredTriangleIndex,t[field],t.vertexIndices));
   add(`captured-${material}-${frame}`,a,b,'edge-only',null,null,{sourcePacket:SMALL,meshId:extract.id,frame,geometrySha256:extract.source.geometrySha256,sourceBodyMatrix:extract.source.bodyMatrix,sourceLocalMatrix:extract.source.localMatrix,filteredTriangleIndices:extract.requestedFilteredTriangleIndices});
  }
 }
 const P=[0,0,0],Q=[1,0,0],R=[0,1,0];
 const a=()=>row(0,[P,Q,R],[0,1,2]);
 const b=S=>row(1,[Q,P,S],[1,0,3]);
 add('positive-two-to-minus-40',a(),b([0,-1,2**-40]),'edge-only','exact-noncoplanar-shared-edge',1);
 add('negative-two-to-minus-40',a(),b([0,-1,-(2**-40)]),'edge-only','exact-noncoplanar-shared-edge',-1);
 add('coplanar-opposite-sides',a(),b([0,-1,0]),'edge-only','exact-coplanar-opposite-sides',0);
 add('coplanar-same-side-positive-area',a(),b([.25,.5,0]),'coplanar-positive-area-overlap','exact-coplanar-same-side-overlap',0);
 add('collapsed-actual-shared-edge',row(0,[P,P,R],[0,1,2]),row(1,[P,P,[0,-1,0]],[1,0,3]),'unresolved','exact-collapsed-shared-edge',0);
 add('collinear-first-triangle',row(0,[P,Q,[.5,0,0]],[0,1,2]),b([0,-1,0]),'unresolved','exact-degenerate-adjacent-triangle',0);
 add('collinear-second-triangle',a(),b([.5,0,0]),'unresolved','exact-degenerate-adjacent-triangle',0);
 add('signed-zero-endpoint-equality',row(0,[[0,0,-0],[1,-0,0],R],[0,1,2]),row(1,[[1,0,-0],[-0,0,0],[0,-1,0]],[1,0,3]),'edge-only','exact-coplanar-opposite-sides',0);
 add('positive-subnormal-height',a(),b([0,-1,Number.MIN_VALUE]),'edge-only','exact-noncoplanar-shared-edge',1);
 add('negative-subnormal-height',a(),b([0,-1,-Number.MIN_VALUE]),'edge-only','exact-noncoplanar-shared-edge',-1);
 add('welded-but-nonidentical-first-endpoint',a(),row(1,[Q,[2**-45,0,0],[0,-1,0]],[1,0,3]),'ineligible','actual-edge-endpoints-not-exactly-equal');
 add('welded-but-nonidentical-second-endpoint',a(),row(1,[[1+2**-45,0,0],P,[0,-1,0]],[1,0,3]),'ineligible','actual-edge-endpoints-not-exactly-equal');
 add('wrong-shared-edge-orientation',a(),row(1,[P,Q,[0,-1,0]],[0,1,3]),'ineligible','shared-edge-orientation-not-opposite');
 add('duplicate-three-shared-vertices',a(),row(1,[Q,P,R],[1,0,2]),'ineligible','not-exactly-two-shared-topology-ids');
 add('one-vertex-crossing-keeps-original-handling',a(),row(1,[P,[.75,.75,-1],[.75,.75,1]],[0,3,4]),'ineligible','not-exactly-two-shared-topology-ids');
 add('nonadjacent-crossing-keeps-original-handling',a(),row(1,[[-.25,.5,-1],[.75,.5,1],[.75,.5,-1]],[3,4,5]),'ineligible','not-exactly-two-shared-topology-ids');
 add('different-components-cannot-receive-adjacency-credit',a(),{...b([0,-1,0]),component:1},'ineligible','different-or-unresolved-component');
 assert.equal(list.length,21);
 return list;
}

function variantPair(fixture,variant){
 const transform=p=>variant==='axis-permutation'?[p[1],p[2],p[0]]:variant==='sign-change'?[-p[0],-p[1],p[2]]:variant==='power-two-scale'?p.map(x=>x*2):[...p];
 const pair=[fixture.a,fixture.b].map(t=>({...t,p:t.p.map(transform),ids:[...t.ids]}));
 if(variant==='swapped')pair.reverse();
 for(const t of pair)for(const p of t.p)for(const x of p)assert(Number.isFinite(x));
 // ×2, never ÷2: even the minimum subnormal remains nonzero and exact.
 if(variant==='power-two-scale')for(const [i,t] of [fixture.a,fixture.b].entries())for(const [j,p] of t.p.entries())for(const [k,x] of p.entries())assert.equal(pair[i].p[j][k]/2,x);
 return pair;
}

function certificateFailures(actual,oracle,pair){
 const failures=[];
 const check=(field,x,y)=>{if(JSON.stringify(x)!==JSON.stringify(y))failures.push({field,expected:y,actual:x});};
 check('classification',actual.classification,oracle.classification);check('reason',actual.reason,oracle.reason);
 check('scope',actual.scope,'triangle-pair-adjacency-only');
 check('edgeOnlyProved',actual.edgeOnlyProved,oracle.classification==='edge-only');
 check('coplanarPositiveAreaOverlapProved',actual.coplanarPositiveAreaOverlapProved,oracle.classification==='coplanar-positive-area-overlap');
 check('requiresOriginalHandling',actual.requiresOriginalHandling,oracle.classification==='ineligible');
 if(!oracle.exact){check('certificate',actual.certificate,null);return failures;}
 const c=actual.certificate,e=oracle.exact;
 if(!c){failures.push({field:'certificate',expected:'Exact certificate',actual:null});return failures;}
 check('certificate.classification',c.classification,oracle.classification);check('certificate.reason',c.reason,oracle.reason);
 check('certificate.vertices',c.vertices,e.vertices);check('certificate.edgeUses',c.edgeUses,e.edgeUses);
 check('certificate.actualTriangles',c.actualTriangles,pair.map(t=>t.p));check('certificate.topologyIds',c.topologyIds,pair.map(t=>t.ids));
 check('certificate.component',c.component,pair[0].component);check('certificate.triangles',c.triangles,pair.map(t=>t.i));
 check('certificate.correspondingActualEndpointsExactlyEqual',c.correspondingActualEndpointsExactlyEqual,true);
 check('certificate.determinantSign',c.determinantSign,e.determinantSign);check('certificate.projectionAxis',c.projectionAxis,e.projectionAxis);check('certificate.projectedSideSigns',c.projectedSideSigns,e.projectedSideSigns);
 const ex=c.axisExponents;
 if(!Array.isArray(ex)||ex.length!==3||!ex.every(Number.isInteger)){failures.push({field:'certificate.axisExponents',actual:ex});return failures;}
 const normalExponents=[ex[1]+ex[2],ex[2]+ex[0],ex[0]+ex[1]];
 check('certificate.normalComponentExponents',c.normalComponentExponents,normalExponents);check('certificate.determinantExponent',c.determinantExponent,ex.reduce((sum,x)=>sum+x,0));
 const rationalCheck=(field,integer,exponent,fraction)=>{
  if(typeof integer!=='string'||!/^[-]?[0-9]+$/.test(integer)||!Number.isInteger(exponent)){failures.push({field,expected:'Integer string and integer exponent',actual:{integer,exponent}});return;}
  const n=BigInt(integer),actualNumerator=exponent>=0?n<<BigInt(exponent):n,actualDenominator=exponent>=0?1n:1n<<BigInt(-exponent);
  if(actualNumerator*BigInt(fraction.denominator)!==BigInt(fraction.numerator)*actualDenominator)failures.push({field,expected:fraction,actual:{integer,exponent}});
 };
 for(const key of ['U','V','W','N','M'])for(let k=0;k<3;k++)rationalCheck(`certificate.${key}[${k}]`,c.integerVectors[key][k],['N','M'].includes(key)?normalExponents[k]:ex[k],e.vectors[key][k]);
 rationalCheck('certificate.determinant',c.determinantInteger,c.determinantExponent,e.determinant);
 return failures;
}

const args=process.argv.slice(2);if(args.length!==2||args[0]!=='--output'||args[1]!==OUTPUT)throw new Error('Expected only the declared --output '+OUTPUT);
for(const path of [OUTPUT,LEGACY,INPUT,FRACTION])if(fs.existsSync(path))throw new Error('Refusing retained output overwrite: '+path);
const started=performance.now(),cpuStarted=process.cpuUsage();
const report={schema:'orbital-data-center/H12-J2-exact-adjacency-contracts/1',taskId:'H12-J2',startedAt:new Date().toISOString(),runtime:{nodeVersion:process.version,platform:process.platform,architecture:process.arch},completed:false,accepted:false,nativeGeometryExecuted:false,publicationAttempted:false,materialAcceptanceConferred:false,sourceStart:SOURCE_FILES.map(hashFile),children:[],cases:[],expectedCounts:{legacy:87,focused:105,total:192},limits:'Shared-edge self-pair predicate only. All contact offsets, thin-panel inputs, arrangement cells and native component acceptance remain unresolved outside this task.'};
let status=2;
function child(command){
 const before=performance.now(),startedAt=new Date().toISOString();console.log(JSON.stringify({stage:'j2-child-start',command}));
 const result=spawnSync(command[0],command.slice(1),{stdio:'inherit',env:process.env});
 const record={command,startedAt,finishedAt:new Date().toISOString(),elapsedSeconds:(performance.now()-before)/1000,exitCode:result.status,signal:result.signal,error:result.error?String(result.error):null};report.children.push(record);console.log(JSON.stringify({stage:'j2-child-finish',...record}));return record;
}
try{
 for(const [path,pin] of Object.entries(PINS))assert.equal(hashFile(path).sha256,pin,'Pinned evidence changed: '+path);
 const legacyChild=child(['node','--max-old-space-size=4096','collector-material-join-contracts.mjs','--stage','j2','--output',LEGACY]);
 const legacy=JSON.parse(fs.readFileSync(LEGACY,'utf8')),historical=JSON.parse(fs.readFileSync(HISTORICAL,'utf8'));
 const expectedRows=data=>data.cases.map(row=>({name:row.name,variant:row.variant,expected:row.expected,minimumContactAreaM2:row.minimumContactAreaM2,inputTriangleCounts:row.inputTriangleCounts,scale:row.scale}));
 const expectationsPreserved=JSON.stringify(expectedRows(legacy))===JSON.stringify(expectedRows(historical));
 const scaleRows=legacy.cases.filter(row=>row.scale),scaleInstrumentation=scaleRows.length===3&&scaleRows.every(row=>{
  const counts=row.result.checkedCounts,triangles=row.inputTriangleCounts.a+row.inputTriangleCounts.b;
  return triangles===49248&&counts.exactSharedEdgePairs===triangles*3/2&&counts.exactSharedEdgePairs===counts.exactNoncoplanarEdgeProofs+counts.exactCoplanarOppositeSideProofs&&counts.selfTrianglePairs===counts.exactSharedEdgePairs+counts.selfTrianglePairsReconstructed&&counts.exactDecodedScalars>0&&row.result.representativeAdjacencyCertificates.length<=8;
 });
 const retainedCrossingChecks=legacy.cases.filter(row=>['closed-topology-self-intersecting-surface','closed-boundary-near-parallel-crossing-is-unresolved'].includes(row.name));
 const originalReconstructionExercised=retainedCrossingChecks.length===6&&retainedCrossingChecks.every(row=>!row.result.complete&&row.result.checkedCounts.selfTrianglePairsReconstructed>0);
 report.legacy={artifact:hashFile(LEGACY),child:legacyChild,completed:legacy.completed,accepted:legacy.accepted,sourceUnchanged:legacy.sourceUnchanged,expectationsPreserved,scaleInstrumentation,expectedScaleSharedEdgesPerVariant:73872,originalReconstructionExercised,summary:legacy.summary,cases:legacy.cases};
 const small=JSON.parse(fs.readFileSync(SMALL,'utf8')),base=fixtures(small),inputs=[];
 for(const fixture of base)for(const variant of variants){const [a,b]=variantPair(fixture,variant);inputs.push({name:fixture.name,variant,a,b});}
 assert.equal(inputs.length,105);fs.writeFileSync(INPUT,JSON.stringify({schema:'orbital-data-center/H12-J2-exact-pair-inputs/1',taskId:'H12-J2',cases:inputs},null,2)+'\n',{flag:'wx'});
 const fractionChild=child(['python3','docs/harnessing-work/H12-work/certify-adjacency.py','--input',INPUT,'--output',FRACTION]);
 const fraction=JSON.parse(fs.readFileSync(FRACTION,'utf8')),oracles=new Map(fraction.cases.map(row=>[row.name+'/'+row.variant,row.result]));
 report.independentFraction={artifact:hashFile(FRACTION),inputArtifact:hashFile(INPUT),child:fractionChild,completed:fraction.completed,sourceUnchanged:fraction.sourceUnchanged,g1aProvenanceVerified:fraction.g1aProvenanceVerified,g1aCaseCount:fraction.g1aCaseCount};
 const byName=new Map(base.map(row=>[row.name,row]));
 for(const input of inputs){
  const fixture=byName.get(input.name),oracle=oracles.get(input.name+'/'+input.variant);assert(oracle,'Missing independent Fraction case');
  const before=performance.now(),actual=inspectCollectorSharedEdgePair({a:input.a,b:input.b}),failures=certificateFailures(actual,oracle,[input.a,input.b]);
  for(const [key,value] of Object.entries(fixture.expected)){const observed=key==='determinantSign'?actual.certificate?.determinantSign:actual[key];if(observed!==value)failures.push({field:'declared.'+key,expected:value,actual:observed});}
  const row={name:input.name,variant:input.variant,expected:fixture.expected,provenance:fixture.provenance,input:{a:input.a,b:input.b},independentExpected:oracle,result:actual,elapsedSeconds:(performance.now()-before)/1000,passed:failures.length===0,failures};
  report.cases.push(row);console.log(JSON.stringify({name:row.name,variant:row.variant,passed:row.passed,classification:actual.classification,reason:actual.reason}));
 }
 report.sourceFinish=SOURCE_FILES.map(hashFile);report.sourceUnchanged=JSON.stringify(report.sourceStart)===JSON.stringify(report.sourceFinish);
 report.completed=report.cases.length===105&&legacy.cases.length===87&&fraction.cases.length===105;
 report.accepted=report.completed&&report.sourceUnchanged&&legacyChild.exitCode===0&&legacy.completed&&legacy.accepted&&legacy.sourceUnchanged&&expectationsPreserved&&scaleInstrumentation&&originalReconstructionExercised&&legacy.cases.every(row=>row.passed)&&fractionChild.exitCode===0&&fraction.completed&&fraction.sourceUnchanged&&fraction.g1aProvenanceVerified&&fraction.g1aCaseCount===20&&report.cases.every(row=>row.passed);
 report.summary={caseExecutions:legacy.cases.length+report.cases.length,legacyExecutions:legacy.cases.length,focusedExecutions:report.cases.length,legacyPassed:legacy.cases.filter(row=>row.passed).length,focusedPassed:report.cases.filter(row=>row.passed).length,focusedClassifications:report.cases.reduce((sum,row)=>(sum[row.result.classification]=(sum[row.result.classification]||0)+1,sum),{}),scaleCases:legacy.summary?.scaleCases,exactCertificateAgreement:report.cases.every(row=>row.passed)};
 status=report.accepted?0:1;
}catch(error){report.error={name:error.name,message:error.message,stack:error.stack};console.error(error.stack);}
report.finishedAt=new Date().toISOString();report.elapsedSeconds=(performance.now()-started)/1000;report.wrapperCpuMicroseconds=process.cpuUsage(cpuStarted);report.wrapperResourceUsage=process.resourceUsage();
fs.writeFileSync(OUTPUT,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({completed:report.completed,accepted:report.accepted,elapsedSeconds:report.elapsedSeconds,focusedCases:report.cases.length}));process.exitCode=status;
