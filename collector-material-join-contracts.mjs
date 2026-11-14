#!/usr/bin/env node
// Pure deterministic H12-J1 fixtures. No scene construction or R1 imports.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {inspectCollectorMaterialJoin} from './dist/inline-collector-join-geometry.js';

const TOL=2e-7;
const plus=(a,b)=>a.map((x,k)=>x+b[k]);
const minus=(a,b)=>a.map((x,k)=>x-b[k]);
const times=(a,s)=>a.map(x=>x*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=a=>Math.hypot(...a);
const triangleArea=t=>length(cross(minus(t[1],t[0]),minus(t[2],t[0])))/2;
const mesh=(id,triangles)=>({id,closed:true,triangles});

function box(lo,hi,fan=false){
 const [x,y,z]=lo,[X,Y,Z]=hi,v=[[x,y,z],[X,y,z],[X,Y,z],[x,Y,z],[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]],faces=[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]],triangles=[];
 for(const indices of faces){const q=indices.map(i=>v[i]);if(fan){const c=q.reduce((s,p)=>plus(s,times(p,.25)),[0,0,0]);for(let k=0;k<4;k++)triangles.push([q[k],q[(k+1)%4],c]);}else triangles.push([q[0],q[1],q[2]],[q[0],q[2],q[3]]);}
 return triangles;
}
// Vertices are specified analytically. The jacket's inner boundary uses the
// same analytic point formula, with the opposite orientation. No validator
// code participates in fixture construction or expected contact area.
function tube({inner=0,outer=1,z0=0,z1=2,segments=1,sides=16,elbowRadius=null,angle=Math.PI/3}={}){
 const ring=(r,j)=>Array.from({length:sides},(_,i)=>{const phi=2*Math.PI*i/sides;if(elbowRadius===null)return [r*Math.cos(phi),r*Math.sin(phi),z0+(z1-z0)*j/segments];const theta=angle*j/segments;return [(elbowRadius+r*Math.cos(phi))*Math.cos(theta)-elbowRadius,r*Math.sin(phi),(elbowRadius+r*Math.cos(phi))*Math.sin(theta)];});
 // For the elbow, increasing theta has tangent [-sin(theta),0,cos(theta)],
 // and the radial basis [cos(theta),0,sin(theta)] crossed with +Y is tangent.
 const outerRings=Array.from({length:segments+1},(_,j)=>ring(outer,j)),innerRings=inner>0?Array.from({length:segments+1},(_,j)=>ring(inner,j)):null,triangles=[],sideTriangles=[];
 function walls(rings,inward){for(let j=0;j<segments;j++)for(let i=0;i<sides;i++){const k=(i+1)%sides,a=rings[j][i],b=rings[j][k],c=rings[j+1][k],d=rings[j+1][i],pair=inward?[[a,c,b],[a,d,c]]:[[a,b,c],[a,c,d]];triangles.push(...pair);if(!inward)sideTriangles.push(...pair);}}
 walls(outerRings,false);if(innerRings)walls(innerRings,true);
 for(const j of[0,segments])for(let i=0;i<sides;i++){const k=(i+1)%sides,o=outerRings[j],pieces=[];if(innerRings){const r=innerRings[j];pieces.push([o[i],r[i],r[k]],[o[i],r[k],o[k]]);}else{const c=elbowRadius===null?[0,0,z0+(z1-z0)*j/segments]:[elbowRadius*Math.cos(angle*j/segments)-elbowRadius,0,elbowRadius*Math.sin(angle*j/segments)];pieces.push([c,o[k],o[i]]);}for(const t of pieces)triangles.push(j===0?t:[t[0],t[2],t[1]]);}
 return {triangles,outerSideAreaM2:sideTriangles.reduce((s,t)=>s+triangleArea(t),0)};
}
function transformPoint(p){
 // One fixed proper rigid transform: rotate about X, then Z, then translate.
 const ax=.371,az=.619,cx=Math.cos(ax),sx=Math.sin(ax),cz=Math.cos(az),sz=Math.sin(az),q=[p[0],cx*p[1]-sx*p[2],sx*p[1]+cx*p[2]];
 return [cz*q[0]-sz*q[1]+3.17,sz*q[0]+cz*q[1]-2.41,q[2]+.83];
}
const transformed=m=>({...m,id:m.id+'/rigid',triangles:m.triangles.map(t=>t.map(transformPoint))});
const hashFile=name=>{const data=fs.readFileSync(name);return {path:name,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')};};
const SHA_FILES=['collector-material-join-contracts.mjs','dist/inline-collector-join-geometry.js','docs/harnessing-work/H12-J1-card.md'];

function fixtures(){
 const list=[];
 const add=(name,a,b,expected,minimumContactAreaM2=1e-6,extra={})=>list.push({name,a:mesh(name+'/a',a),b:mesh(name+'/b',b),minimumContactAreaM2,expected,...extra});
 const clear={complete:true,interpenetration:false,ok:false,area:0};
 const overlap={complete:true,interpenetration:true,ok:false};
 const incomplete={complete:false,interpenetration:null,ok:false};
 add('disjoint-closed-boxes',box([0,0,0],[1,1,1]),box([2,0,0],[3,1,1]),clear);
 add('zero-area-request-permits-separated-solids',box([0,0,0],[1,1,1]),box([2,0,0],[3,1,1]),{...clear,ok:true},0);
 add('separated-annular-material',tube({inner:1,outer:2}).triangles,tube({inner:1,outer:2,z0:3,z1:4}).triangles,clear);
 add('solid-entirely-in-true-annular-hole',tube({inner:1,outer:2}).triangles,tube({outer:.5,z0:.25,z1:1.75}).triangles,clear);
 add('full-containment',box([0,0,0],[3,3,3]),box([1,1,1],[2,2,2]),overlap);
 add('identical-occupied-solids',box([0,0,0],[1,1,1]),box([0,0,0],[1,1,1],true),overlap);
 add('partial-positive-volume-overlap',box([0,0,0],[1,1,1]),box([.4,.3,.2],[1.4,1.3,1.2]),overlap);
 // Orthogonal bars have no vertex strictly inside the other bar. Both bars
 // pass through faces of the other; vertex-only containment misses this case.
 add('edge-through-face-with-all-vertices-outside',box([-2,-.25,-.25],[2,.25,.25]),box([-.25,-2,-.2],[.25,2,.2]),overlap,1e-6,{allVerticesOutsideByConstruction:true});
 add('finite-full-planar-contact',box([0,0,0],[1,1,1]),box([1,0,0],[2,1,1]),{complete:true,interpenetration:false,ok:true,area:1},.99);
 add('partial-coplanar-contact-differing-triangulations',box([0,0,0],[1,1,1]),box([1,.25,.2],[2,1.25,1.2],true),{complete:true,interpenetration:false,ok:true,area:.6},.59);
 add('only-line-contact',box([0,0,0],[1,1,1]),box([1,1,0],[2,2,1]),clear);
 add('only-point-contact',box([0,0,0],[1,1,1]),box([1,1,1],[2,2,2]),clear);
 const seatArea=16*2*Math.sin(Math.PI/16)*1.5;
 add('matching-curved-faceted-seat',tube({outer:1}).triangles,tube({inner:1,outer:1.25,z0:.25,z1:1.75}).triangles,{complete:true,interpenetration:false,ok:true,area:seatArea},seatArea*.99);
 add('radially-corrupted-faceted-seat',tube({outer:1}).triangles,tube({inner:.96,outer:1.25,z0:.25,z1:1.75}).triangles,overlap);
 const copper=tube({outer:.004126,segments:8,z1:.32}),jacket=tube({inner:.004126,outer:.005126,segments:8,z1:.32});
 add('inner-conductor-annular-jacket',copper.triangles,jacket.triangles,{complete:true,interpenetration:false,ok:true,area:16*2*.004126*Math.sin(Math.PI/16)*.32},.008);
 add('radial-jacket-corruption-enters-conductor',copper.triangles,tube({inner:.0039,outer:.005126,segments:8,z1:.32}).triangles,overlap);
 const elbow=tube({outer:.004126,segments:12,elbowRadius:.08}),elbowJacket=tube({inner:.004126,outer:.005126,segments:12,elbowRadius:.08});
 add('curved-elbow-conductor-jacket',elbow.triangles,elbowJacket.triangles,{complete:true,interpenetration:false,ok:true,area:elbow.outerSideAreaM2},elbow.outerSideAreaM2*.99);
 add('overlapping-components-are-union-not-parity', [...box([0,0,0],[2,2,2]),...box([1,.5,.25],[3,2.5,2.25])],box([1.2,.8,.7],[1.4,1,.9]),overlap);
 add('overlapping-coplanar-union-contact-counted-once',[...box([0,0,0],[1.5,1,1]),...box([.5,0,0],[2,1,1],true)],box([0,-1,0],[2,0,1]),{complete:true,interpenetration:false,ok:true,area:2},1.99);
 add('open-input-despite-closed-metadata',box([0,0,0],[1,1,1]).slice(1),box([1,0,0],[2,1,1]),incomplete);
 const nonmanifold=box([0,0,0],[1,1,1]);nonmanifold.push(nonmanifold[0]);add('nonmanifold-boundary',nonmanifold,box([1,0,0],[2,1,1]),incomplete);
 const reversed=box([0,0,0],[1,1,1]);reversed[0]=[reversed[0][0],reversed[0][2],reversed[0][1]];add('inconsistently-oriented-boundary',reversed,box([1,0,0],[2,1,1]),incomplete);
 add('inward-oriented-closed-component',box([0,0,0],[1,1,1]).map(t=>[t[0],t[2],t[1]]),box([1,0,0],[2,1,1]),incomplete);
 const selfCross=box([0,0,0],[1,1,1]).map(t=>t.map(p=>p.every(x=>x===1)?[.5,.5,-.5]:p));add('closed-topology-self-intersecting-surface',selfCross,box([2,0,0],[3,1,1]),incomplete);
 // This closed oriented combinatorial box has an inset top plane that crosses
 // z=0 at an angle below 1e-12 radians. Its broad triangles remain nondegenerate
 // even though its occupied thickness is numerically unresolved. Treating the
 // nearly parallel crossing planes as separated must never produce a pass.
 const nearParallel=box([0,0,0],[1,1,1]).map(t=>t.map(p=>{if(p[2]===0)return p;const x=.2+.6*p[0],y=.2+.6*p[1];return [x,y,5e-13*(x+y-.7)];}));
 add('closed-boundary-near-parallel-crossing-is-unresolved',nearParallel,box([2,0,0],[3,1,1]),incomplete);
 const nonfinite=box([0,0,0],[1,1,1]).map(t=>t.map(p=>[...p]));nonfinite[0][0][0]=NaN;add('nonfinite-input',nonfinite,box([1,0,0],[2,1,1]),incomplete);
 add('small-nonzero-gap-is-not-shared-contact',box([0,0,0],[1,1,1]),box([1+TOL/4,0,0],[2,1,1]),incomplete);
 add('small-penetration-is-unresolved-not-waived',box([0,0,0],[1,1,1]),box([1-TOL/4,0,0],[2,1,1]),incomplete);
 const longCopper=tube({outer:.004126,segments:512,sides:16,z1:2}),longJacket=tube({inner:.004126,outer:.005126,segments:512,sides:16,z1:2}),longArea=16*2*.004126*Math.sin(Math.PI/16)*2;
 add('512-segment-16-sided-actual-pair-scale',longCopper.triangles,longJacket.triangles,{complete:true,interpenetration:false,ok:true,area:longArea},longArea*.99,{scale:{longitudinalSegments:512,radialSides:16,copperTriangles:longCopper.triangles.length,jacketTriangles:longJacket.triangles.length}});
 return list;
}
function compare(actual,expected){const failures=[];for(const key of['complete','interpenetration','ok'])if(actual[key]!==expected[key])failures.push({field:key,expected:expected[key],actual:actual[key]});if(expected.area!==undefined){const tolerance=Math.max(1e-11,Math.abs(expected.area)*2e-9);if(!Number.isFinite(actual.contactAreaM2)||Math.abs(actual.contactAreaM2-expected.area)>tolerance)failures.push({field:'contactAreaM2',expected:expected.area,actual:actual.contactAreaM2,tolerance});}return failures;}

const args=process.argv.slice(2),stage=args[0]==='--stage'?args.splice(0,2)[1]:'j1';if(!['j1','j2'].includes(stage)||args.length!==2||args[0]!=='--output')throw new Error('Expected [--stage j2] --output <immutable-result.json>');const output=args[1];if(fs.existsSync(output))throw new Error('Refusing existing output: '+output);if(stage==='j2')SHA_FILES.push('docs/harnessing-work/H12-J2-card.md');const taskId=stage==='j2'?'H12-J2':'H12-J1';
const started=performance.now(),report={schema:`orbital-data-center/${taskId}-material-join-contracts/1`,taskId,revalidatedLegacyTaskId:stage==='j2'?'H12-J1':undefined,startedAt:new Date().toISOString(),runtime:{nodeVersion:process.version,platform:process.platform,architecture:process.arch},completed:false,accepted:false,sourceStart:SHA_FILES.map(hashFile),toleranceM:TOL,cases:[],nativeGeometryExecuted:false,publicationAttempted:false,method:'Complete finite boundary face arrangements with oriented component-union membership',limits:'Exact arithmetic-level contact only; unresolved geometry at 2e-7 m fails; each input component must be an embedded outward-oriented closed manifold; separate cavity shells unsupported'};
let status=2;
try{
 for(const fixture of fixtures()){
  for(const variant of['base','swapped','rigid']){
   let a=fixture.a,b=fixture.b;if(variant==='swapped')[a,b]=[b,a];if(variant==='rigid'){a=transformed(a);b=transformed(b);}const before=performance.now(),actual=inspectCollectorMaterialJoin({a,b,minimumContactAreaM2:fixture.minimumContactAreaM2,toleranceM:TOL}),failures=compare(actual,fixture.expected),row={name:fixture.name,variant,inputTriangleCounts:{a:a.triangles.length,b:b.triangles.length},scale:fixture.scale,expected:fixture.expected,minimumContactAreaM2:fixture.minimumContactAreaM2,elapsedSeconds:(performance.now()-before)/1000,passed:failures.length===0,failures,result:actual};report.cases.push(row);console.log(JSON.stringify({name:row.name,variant,passed:row.passed,reason:actual.reason,seconds:row.elapsedSeconds,cells:actual.checkedCounts.arrangementCells}));
  }
 }
 report.completed=true;report.sourceFinish=SHA_FILES.map(hashFile);report.sourceUnchanged=JSON.stringify(report.sourceFinish)===JSON.stringify(report.sourceStart);report.accepted=report.cases.every(row=>row.passed)&&report.sourceUnchanged;report.summary={caseExecutions:report.cases.length,passed:report.cases.filter(row=>row.passed).length,failed:report.cases.filter(row=>!row.passed).length,scaleCases:report.cases.filter(row=>row.scale).map(row=>({variant:row.variant,counts:row.inputTriangleCounts,elapsedSeconds:row.elapsedSeconds,checkedCounts:row.result.checkedCounts,passed:row.passed}))};status=report.accepted?0:1;
}catch(error){report.error={name:error.name,message:error.message,stack:error.stack};console.error(error.stack);}
report.finishedAt=new Date().toISOString();report.elapsedSeconds=(performance.now()-started)/1000;fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({completed:report.completed,accepted:report.accepted,elapsedSeconds:report.elapsedSeconds,cases:report.cases.length}));process.exitCode=status;
