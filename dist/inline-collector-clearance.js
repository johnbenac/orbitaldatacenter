// H12-C2: local edge-loop screening after the caller's unchanged whole-AABB
// check. No native geometry, material ownership, or global routing changes.
// Exclusions independently bound the occupied geometric envelope, including
// current bounds, containment fringe and explicit ray-domain extensions.
// They do not claim universal bitwise equivalence with spurious legacy
// floating-point predicate zeros. Unscreened calls retain the original kernel.
import {segmentObstacleClearance as kernel} from './routing-audit.js';

const KERNEL_EPS=1e-10,BLOCK_SIZE=64;
const sub=(a,b)=>a.map((x,k)=>x-b[k]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a),finite=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const now=()=>globalThis.performance?.now?.()??Date.now();
const emptyBounds=()=>({min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
function include(box,p){for(let k=0;k<3;k++){box.min[k]=Math.min(box.min[k],p[k]);box.max[k]=Math.max(box.max[k],p[k]);}}
function edgeBounds(edges,first,count){const box=emptyBounds();for(let i=first;i<first+count;i++)for(const p of edges[i])include(box,p);return box;}
function boxDistance(a,b){return Math.hypot(...[0,1,2].map(k=>Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])));}

// This body is byte-identical to the retained R1 edge loop. The function
// parameter is the unchanged kernel, or the private diagnostic recorder.
function originalEdgeLoop(A,B,threshold,segmentObstacleClearance){
 let minimum=Infinity,witness=null;for(const [one,other]of[[A,B],[B,A]])for(const edge of one.edges){const d=segmentObstacleClearance(...edge,other.obstacle);if(d<minimum){minimum=d;witness={edgeMeshId:one.mesh.uuid,otherMeshId:other.mesh.uuid,edge,distanceM:d};}if(d<threshold-1e-7)return {minimumDistanceM:minimum,method:'bidirectional-actual-mesh-edge-solid',witness};}
 return {minimumDistanceM:minimum,method:'bidirectional-actual-mesh-edge-solid',witness};
}

function screeningDomain(one,other){
 const obstacle=other.obstacle,base={eligible:false,reason:null,triangleCount:obstacle?.triangles?.length??0};
 const unsupported=(reason,detail={})=>({...base,reason,...detail});
 if(obstacle?.type!=='mesh'||!Array.isArray(obstacle.triangles)||!obstacle.triangles.length)return unsupported('not-an-ordinary-triangle-mesh');
 if(!Array.isArray(obstacle.apertures??[])||(obstacle.apertures??[]).length)return unsupported('nonempty-or-unresolved-apertures');
 if(!finite(obstacle.bounds?.min)||!finite(obstacle.bounds?.max)||obstacle.bounds.min.some((x,k)=>x>obstacle.bounds.max[k]))return unsupported('unresolved-obstacle-bounds');
 const envelope=emptyBounds();let magnitude=1,minimumAltitudeM=Infinity,minimumAspect=Infinity;
 const visit=p=>{if(!finite(p))return false;include(envelope,p);for(const x of p)magnitude=Math.max(magnitude,Math.abs(x));return true;};
 visit(obstacle.bounds.min);visit(obstacle.bounds.max);
 for(let i=0;i<obstacle.triangles.length;i++){
  const t=obstacle.triangles[i];if(!Array.isArray(t)||t.length!==3||!t.every(visit))return unsupported('nonfinite-or-malformed-obstacle-triangle',{triangle:i});
  const u=sub(t[1],t[0]),v=sub(t[2],t[0]),area2=norm(cross(u,v)),longest=Math.max(norm(u),norm(v),norm(sub(t[2],t[1]))),altitude=area2/longest,aspect=area2/(longest*longest);
  if(!Number.isFinite(area2)||!Number.isFinite(altitude)||!Number.isFinite(aspect))return unsupported('unresolved-triangle-arithmetic',{triangle:i});
  if(area2<=KERNEL_EPS)return unsupported('thin-triangle-kernel-capsule-fallback',{triangle:i,doubledAreaM2:area2});
  if(altitude<=8e-7)return unsupported('altitude-outside-screening-domain',{triangle:i,altitudeM:altitude});
  if(aspect<1e-6)return unsupported('aspect-outside-screening-domain',{triangle:i,aspect});
  minimumAltitudeM=Math.min(minimumAltitudeM,altitude);minimumAspect=Math.min(minimumAspect,aspect);
 }
 // Read every current query endpoint. No cross-call cache, identity shortcut,
 // or inherited edge bound can survive a mutation between inspections.
 for(let i=0;i<one.edges.length;i++){
  const edge=one.edges[i];if(!Array.isArray(edge)||edge.length!==2||!edge.every(finite))return unsupported('nonfinite-or-malformed-query-edge',{edge:i});
  for(const p of edge)for(const x of p)magnitude=Math.max(magnitude,Math.abs(x));
 }
 if(magnitude>64)return unsupported('coordinate-magnitude-outside-screening-domain',{coordinateMagnitudeM:magnitude});
 const diameter=2*Math.sqrt(3)*magnitude,arithmeticGuardM=256*Number.EPSILON*magnitude;
 // sqrt(EPS) encloses the kernel's squared-distance containment tolerance.
 // A tolerated barycentric triangle point extends by at most 3*EPS*D;
 // the segment parameter extends by EPS*D. 8*EPS*D conservatively covers
 // both domains with a second such allowance. The separate arithmetic guard
 // is also subtracted from every resulting AABB-distance lower bound.
 const paddingM=Math.sqrt(KERNEL_EPS)+8*KERNEL_EPS*diameter+arithmeticGuardM;
 return {...base,eligible:true,reason:'finite-resolved-2mm-screening-domain',coordinateMagnitudeM:magnitude,minimumAltitudeM,minimumAspect,unexpandedEnvelope:envelope,paddingM,rayDomainDiameterM:diameter,arithmeticGuardM,envelope:{min:envelope.min.map(x=>x-paddingM),max:envelope.max.map(x=>x+paddingM)},boundsRecomputedThisCall:true};
}

function appendCoverage(row,action,firstEdge,edgeCount,value,block=false){
 const last=row.runs.at(-1),field=action==='evaluated'?'minimumEvaluatedDistanceM':'minimumLowerBoundM';
 if(last&&last.action===action&&last.firstEdge+last.edgeCount===firstEdge){last.edgeCount+=edgeCount;last[field]=Math.min(last[field],value);if(block){last.blockCount++;last.lastBlockEdgeCount=edgeCount;}}
 else row.runs.push({action,firstEdge,edgeCount,[field]:value,...(block?{blockSize:BLOCK_SIZE,blockCount:1,lastBlockEdgeCount:edgeCount}:{})});
 row.processedEdges+=edgeCount;
 if(action==='block-bound')row.blockSkippedEdges+=edgeCount;else if(action==='edge-bound')row.edgeSkippedEdges+=edgeCount;else row.evaluatedEdges+=edgeCount;
}

function run(A,B,threshold,forceExact,trace){
 const segmentObstacleClearance=trace?function(a,b,obstacle){
  const argumentCount=arguments.length,value=kernel(a,b,obstacle);
  trace.push(Object.freeze({a,b,obstacle,argumentCount,value,aSnapshot:Object.freeze([...a]),bSnapshot:Object.freeze([...b])}));return value;
 }:kernel;
 // No screening preparation precedes these original paths.
 if(forceExact||threshold!==.002)return originalEdgeLoop(A,B,threshold,segmentObstacleClearance);
 const started=now(),directions=[[A,B],[B,A]].map(([one,other],index)=>({index,edgeMeshId:one.mesh.uuid,obstacleId:other.mesh.uuid,expectedEdges:one.edges.length,processedEdges:0,blockSkippedEdges:0,edgeSkippedEdges:0,evaluatedEdges:0,blockTests:0,edgeTests:0,runs:[],screening:null}));
 let evaluatedMinimum=Infinity,boundMinimum=Infinity,evaluatedWitness=null,earlyRejected=false,unresolvedKernel=false,preparationSeconds=0,kernelSeconds=0;
 outer:for(const [index,[one,other]]of [[A,B],[B,A]].entries()){
  const row=directions[index],before=now(),domain=screeningDomain(one,other);row.screening=domain;preparationSeconds+=(now()-before)/1000;
  const lowerFor=box=>Math.max(0,boxDistance(box,domain.envelope)-domain.arithmeticGuardM);
  for(let first=0;first<one.edges.length;first+=BLOCK_SIZE){
   const count=Math.min(BLOCK_SIZE,one.edges.length-first);
   if(domain.eligible){row.blockTests++;const lower=lowerFor(edgeBounds(one.edges,first,count));if(lower>threshold+1e-8){boundMinimum=Math.min(boundMinimum,lower);appendCoverage(row,'block-bound',first,count,lower,true);continue;}}
   for(let i=first;i<first+count;i++){
    const edge=one.edges[i];
    if(domain.eligible){row.edgeTests++;const lower=lowerFor(edgeBounds(one.edges,i,1));if(lower>threshold+1e-8){boundMinimum=Math.min(boundMinimum,lower);appendCoverage(row,'edge-bound',i,1,lower);continue;}}
    const before=now(),d=segmentObstacleClearance(...edge,other.obstacle);kernelSeconds+=(now()-before)/1000;appendCoverage(row,'evaluated',i,1,d);
    if(!Number.isFinite(d)){unresolvedKernel=true;break outer;}
    if(d<evaluatedMinimum){evaluatedMinimum=d;evaluatedWitness={edgeMeshId:one.mesh.uuid,otherMeshId:other.mesh.uuid,edge,distanceM:d};}
    if(d<threshold-1e-7){earlyRejected=true;break outer;}
   }
  }
 }
 for(const row of directions){let next=0;for(const run of row.runs){if(run.firstEdge!==next||run.edgeCount<1)throw Error('Noncontiguous collector edge coverage');next+=run.edgeCount;}if(next!==row.processedEdges||row.processedEdges!==row.blockSkippedEdges+row.edgeSkippedEdges+row.evaluatedEdges||row.processedEdges>row.expectedEdges)throw Error('Collector edge coverage counts disagree');row.complete=row.processedEdges===row.expectedEdges;row.unprocessed=row.complete?null:{firstEdge:row.processedEdges,edgeCount:row.expectedEdges-row.processedEdges};}
 const skippedEdges=directions.reduce((sum,row)=>sum+row.blockSkippedEdges+row.edgeSkippedEdges,0),evaluatedEdges=directions.reduce((sum,row)=>sum+row.evaluatedEdges,0),minimum=unresolvedKernel?NaN:Math.min(boundMinimum,evaluatedMinimum),boundDeterminesMinimum=boundMinimum<evaluatedMinimum;
 return {minimumDistanceM:minimum,method:skippedEdges?'bidirectional-actual-mesh-edges/conservative-block-and-edge-bounds':'bidirectional-actual-mesh-edge-solid',witness:boundDeterminesMinimum?null:evaluatedWitness,minimumDistanceKind:skippedEdges?'conservative-lower-bound':'evaluated-original-edge-minimum',minimumSkippedLowerBoundM:boundMinimum,minimumEvaluatedDistanceM:evaluatedMinimum,closestEvaluatedWitness:evaluatedWitness,earlyRejected,complete:!unresolvedKernel&&(earlyRejected||directions.every(row=>row.complete)),positiveCoverageComplete:!unresolvedKernel&&!earlyRejected&&directions.every(row=>row.complete),unresolvedKernel,coverage:{blockSize:BLOCK_SIZE,directions,totalExpectedEdges:directions.reduce((sum,row)=>sum+row.expectedEdges,0),totalProcessedEdges:directions.reduce((sum,row)=>sum+row.processedEdges,0),skippedEdges,evaluatedEdges},timings:{preparationSeconds,kernelSeconds,totalSeconds:(now()-started)/1000},screeningScope:'Ordinary 2 mm edge checks after the unchanged caller whole-AABB check; no cross-call geometry cache'};
}

export function collectorMeshEdgeDistance(A,B,threshold,{forceExact=false}={}){return run(A,B,threshold,forceExact,null);}

// Diagnostic-only collection has no executable caller callback. Descriptors
// and coordinate snapshots are frozen; retained object references allow the
// contract suite to verify identity before serializing compact evidence.
export function diagnoseCollectorMeshEdgeDistance(A,B,threshold,{forceExact=false}={}){
 const trace=[],result=run(A,B,threshold,forceExact,trace);return {result,queries:Object.freeze(trace)};
}
