import {inspectCollectorQueryRegions,encloseCollectorPhysicalArea,addCollectorAreaBounds,collectorAreaThreshold,collectorExactRegionRationals} from './inline-collector-exact-regions.js';
import {createPatchExactContext,exactCoplanar,finiteProjectedEdgeExclusion,finiteOriginalEdgeExclusion,finiteTriangleExclusion,exactSelfPairFallback,buildExactPlanarPatches,projectedInternalSeam,exactPatchMembership} from './inline-collector-exact-patches.js';
/*
 * H12-J1: finite material contact between actual triangulated boundaries.
 * H12-J2 adds only an exact binary64 proof for eligible shared-edge pairs.
 *
 * Proven domain: bounded, finite, nondegenerate, embedded, consistently
 * outward-oriented closed triangle components. Components of one input are
 * occupied as a UNION. A connected annular component therefore retains its
 * hole; a separate inward-oriented cavity shell is outside this domain.
 * Topology is recovered at arithmetic roundoff, not at the requested physical
 * tolerance. No caller metadata, nominal fit, or ownership grants clearance.
 *
 * Completeness argument:
 * Each original triangle is split by every opposite boundary plane capable
 * of intersecting it and by the edge lines of every coplanar facet. A BVH
 * excludes only disjoint complete triangle AABBs. Thus every intersection of
 * the opposite boundary with the triangle lies in the resulting arrangement.
 * The interior of each convex cell has constant material membership. Its
 * interior probe classifies that entire cell, not a sampled approximation.
 * A cell strictly inside the other union proves volume overlap. Coincident
 * cells with the same outward normal also prove volume overlap. If positive
 * overlap exists between bounded polyhedral solids, its boundary contains
 * one of those two kinds of open cell (including containment/identical solids).
 * Conversely, only oppositely oriented, exposed cells can be material contact.
 * Own-component coplanar edge arrangements remove overlapping contact area by
 * canonical coverage ownership; other components are queried as a union.
 *
 * Self-intersections are checked separately within each recovered component,
 * including adjacent faces: the only allowed intersections are their actual
 * common topological edge/vertex. Vertex links must be single cycles.
 *
 * Numerical domain: toleranceM is a resolution floor, never a permission to
 * call a nonzero gap shared area. Arithmetic-roundoff coincidences are used
 * for exact arrangement topology. Nonzero offsets or cells unresolved within
 * toleranceM fail incomplete. Bounds on cell counts also fail incomplete.
 * Zero minimumContactAreaM2 requests noninterpenetration only; disjoint solids
 * may satisfy it. A positive obligation always requires positive actual area.
 * No cross-call mutable-geometry cache and no Three.js dependency are used.
 */

const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(a[0],a[1],a[2]);
const distance=(a,b)=>norm(sub(a,b));
const mix=(a,b,t)=>add(a,mul(sub(b,a),t));
const clamp=(x,lo=0,hi=1)=>Math.max(lo,Math.min(hi,x));
const finitePoint=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const bounds=points=>{const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const p of points)for(let k=0;k<3;k++){min[k]=Math.min(min[k],p[k]);max[k]=Math.max(max[k],p[k]);}return {min,max};};
const overlap=(a,b,e=0)=>a.min.every((x,k)=>x<=b.max[k]+e&&b.min[k]<=a.max[k]+e);
const pointBounds=(p,e=0)=>({min:p.map(x=>x-e),max:p.map(x=>x+e)});
const inBounds=(p,b,e=0)=>p.every((x,k)=>x>=b.min[k]-e&&x<=b.max[k]+e);
const METHOD='complete-boundary-face-arrangement/exact-query-regions/oriented-component-union/v4';
const ADJACENCY_METHOD='binary64-exact-shared-edge/dyadic-integers/v1';
class Unresolved extends Error { constructor(reason,detail={}){super(reason);this.detail=detail;} }
const fail=(reason,detail)=>{throw new Unresolved(reason,detail);};

// Decode the original binary64 scalar before doing ANY subtraction. A single
// inspection owns this cache: no geometry or scalar state survives a call.
function exactContext(){return {decoded:new Map(),bits:new DataView(new ArrayBuffer(8)),decodes:0,cacheHits:0};}
function dyadic(value,ctx){
 if(ctx.decoded.has(value)){ctx.cacheHits++;return ctx.decoded.get(value);}
 ctx.bits.setFloat64(0,value,false);const bits=ctx.bits.getBigUint64(0,false),fraction=bits&0xfffffffffffffn,exponent=Number((bits>>52n)&0x7ffn);
 const unsigned=exponent===0?fraction:(1n<<52n)|fraction;
 const decoded={integer:(bits>>63n)?-unsigned:unsigned,exponent:unsigned===0n?0:exponent===0?-1074:exponent-1075};
 ctx.decoded.set(value,decoded);ctx.decodes++;return decoded;
}
const exactCross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const exactSign=x=>x<0n?-1:x>0n?1:0;
const samePoint=(a,b)=>a.every((x,k)=>x===b[k]);
function exactSharedEdge(a,b,ctx){
 const ineligible=reason=>({classification:'ineligible',reason});
 if(!Number.isInteger(a.component)||a.component<0||a.component!==b.component)return ineligible('different-or-unresolved-component');
 if(a.ids.length!==3||b.ids.length!==3||new Set(a.ids).size!==3||new Set(b.ids).size!==3)return ineligible('nonunique-topology-ids');
 const shared=a.ids.filter(id=>b.ids.includes(id));
 if(shared.length!==2)return ineligible('not-exactly-two-shared-topology-ids');
 const ai=a.ids.findIndex((id,k)=>shared.includes(id)&&shared.includes(a.ids[(k+1)%3]));
 const bi=b.ids.findIndex((id,k)=>shared.includes(id)&&shared.includes(b.ids[(k+1)%3]));
 const from=a.ids[ai],to=a.ids[(ai+1)%3];
 if(b.ids[bi]!==to||b.ids[(bi+1)%3]!==from)return ineligible('shared-edge-orientation-not-opposite');
 const P=a.p[ai],Q=a.p[(ai+1)%3],R=a.p[(ai+2)%3],S=b.p[(bi+2)%3];
 if(!samePoint(P,b.p[(bi+1)%3])||!samePoint(Q,b.p[bi]))return ineligible('actual-edge-endpoints-not-exactly-equal');
 const decoded=[P,Q,R,S].map(point=>point.map(value=>dyadic(value,ctx))),axisExponents=[0,1,2].map(k=>{const nonzero=decoded.map(point=>point[k]).filter(value=>value.integer!==0n);return nonzero.length?Math.min(...nonzero.map(value=>value.exponent)):0;});
 const integers=decoded.map(point=>point.map((value,k)=>value.integer===0n?0n:value.integer<<BigInt(value.exponent-axisExponents[k])));
 const [p,q,r,s]=integers,U=q.map((x,k)=>x-p[k]),V=r.map((x,k)=>x-p[k]),W=s.map((x,k)=>x-p[k]),N=exactCross(U,V),M=exactCross(U,W),D=N[0]*W[0]+N[1]*W[1]+N[2]*W[2];
 const exact={a,b,ai,bi,P,Q,R,S,axisExponents,U,V,W,N,M,D,projectionAxis:N.findIndex(x=>x!==0n)};
 if(U.every(x=>x===0n))return {classification:'unresolved',reason:'exact-collapsed-shared-edge',exact};
 if(N.every(x=>x===0n)||M.every(x=>x===0n))return {classification:'unresolved',reason:'exact-degenerate-adjacent-triangle',exact};
 if(D!==0n)return {classification:'edge-only',reason:'exact-noncoplanar-shared-edge',exact};
 const k=exact.projectionAxis;
 if(M[k]===0n)return {classification:'unresolved',reason:'exact-degenerate-coplanar-projection',exact};
 return exactSign(N[k])!==exactSign(M[k])?{classification:'edge-only',reason:'exact-coplanar-opposite-sides',exact}:{classification:'coplanar-positive-area-overlap',reason:'exact-coplanar-same-side-overlap',exact};
}
function adjacencyCertificate(proof){
 if(!proof.exact)return null;
 const {a,b,ai,bi,P,Q,R,S,axisExponents,U,V,W,N,M,D,projectionAxis}=proof.exact;
 return {method:ADJACENCY_METHOD,classification:proof.classification,reason:proof.reason,component:a.component,triangles:[a.i,b.i],topologyIds:[a.ids,b.ids],edgeUses:[{triangle:a.i,from:a.ids[ai],to:a.ids[(ai+1)%3]},{triangle:b.i,from:b.ids[bi],to:b.ids[(bi+1)%3]}],actualTriangles:[a.p,b.p],vertices:{P,Q,R,S},correspondingActualEndpointsExactlyEqual:true,axisExponents,integerVectors:{U:U.map(String),V:V.map(String),W:W.map(String),N:N.map(String),M:M.map(String)},normalComponentExponents:[axisExponents[1]+axisExponents[2],axisExponents[2]+axisExponents[0],axisExponents[0]+axisExponents[1]],determinantInteger:String(D),determinantExponent:axisExponents.reduce((sum,x)=>sum+x,0),determinantSign:exactSign(D),projectionAxis,projectedSideSigns:projectionAxis<0?null:[exactSign(N[projectionAxis]),exactSign(M[projectionAxis])]};
}

/** Diagnostic only: exact adjacency of two supplied triangle records. The
 * records use {i,p:[[x,y,z],...],ids:[topologyId,...],component}. This proves no
 * closed mesh, contact area, or material acceptance. Ineligible pairs require
 * the original self-intersection checks. Signed zero is the same coordinate. */
export function inspectCollectorSharedEdgePair({a,b}={}){
 const valid=row=>row&&Number.isInteger(row.i)&&Array.isArray(row.p)&&row.p.length===3&&row.p.every(finitePoint)&&Array.isArray(row.ids)&&row.ids.length===3&&row.ids.every(id=>Number.isInteger(id)&&id>=0);
 if(!valid(a)||!valid(b))return {scope:'triangle-pair-adjacency-only',classification:'ineligible',reason:'malformed-triangle-pair',edgeOnlyProved:false,coplanarPositiveAreaOverlapProved:false,requiresOriginalHandling:true,certificate:null};
 const ctx=exactContext(),proof=exactSharedEdge(a,b,ctx);
 return {scope:'triangle-pair-adjacency-only',classification:proof.classification,reason:proof.reason,edgeOnlyProved:proof.classification==='edge-only',coplanarPositiveAreaOverlapProved:proof.classification==='coplanar-positive-area-overlap',requiresOriginalHandling:proof.classification==='ineligible',certificate:adjacencyCertificate(proof),checkedCounts:{decodedScalars:ctx.decodes,decodeCacheHits:ctx.cacheHits}};
}

function hierarchy(rows){
 const box={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
 for(const r of rows)for(let k=0;k<3;k++){box.min[k]=Math.min(box.min[k],r.bounds.min[k]);box.max[k]=Math.max(box.max[k],r.bounds.max[k]);}
 if(rows.length<=8)return {bounds:box,rows};
 let axis=0;for(let k=1;k<3;k++)if(box.max[k]-box.min[k]>box.max[axis]-box.min[axis])axis=k;
 rows.sort((a,b)=>(a.bounds.min[axis]+a.bounds.max[axis])-(b.bounds.min[axis]+b.bounds.max[axis]));const mid=rows.length>>1;
 return {bounds:box,left:hierarchy(rows.slice(0,mid)),right:hierarchy(rows.slice(mid))};
}
function query(tree,box,e=0){const found=[],stack=[tree];while(stack.length){const n=stack.pop();if(!overlap(n.bounds,box,e))continue;if(n.rows){for(const r of n.rows)if(overlap(r.bounds,box,e))found.push(r);}else stack.push(n.left,n.right);}return found;}
function rayBox(p,d,b,e){let lo=0,hi=Infinity;for(let k=0;k<3;k++){if(Math.abs(d[k])<1e-16){if(p[k]<b.min[k]-e||p[k]>b.max[k]+e)return false;}else{let a=(b.min[k]-e-p[k])/d[k],z=(b.max[k]+e-p[k])/d[k];if(a>z)[a,z]=[z,a];lo=Math.max(lo,a);hi=Math.min(hi,z);if(lo>hi)return false;}}return true;}
function rayRows(tree,p,d,e){const found=[],stack=[tree];while(stack.length){const n=stack.pop();if(!rayBox(p,d,n.bounds,e))continue;if(n.rows){for(const r of n.rows)if(rayBox(p,d,r.bounds,e))found.push(r);}else stack.push(n.left,n.right);}return found;}
function pointSegmentDistance(p,a,b){const d=sub(b,a),dd=dot(d,d);return distance(p,mix(a,b,dd?clamp(dot(sub(p,a),d)/dd):0));}
function pointTriangleDistance(p,t){
 const a=t.p[0],b=t.p[1],c=t.p[2],plane=dot(t.n,sub(p,a)),q=sub(p,mul(t.n,plane));
 if(pointInTriangle(q,t,0)>=0)return Math.abs(plane);
 return Math.min(pointSegmentDistance(p,a,b),pointSegmentDistance(p,b,c),pointSegmentDistance(p,c,a));
}
// Returns +1 in the open triangle, 0 on its boundary, -1 outside. Distances
// to its three supporting edge lines are measured in metres.
function pointInTriangle(p,t,e){let boundary=false;for(let k=0;k<3;k++){const a=t.p[k],b=t.p[(k+1)%3],edge=sub(b,a),s=dot(cross(edge,sub(p,a)),t.n)/norm(edge);if(s< -e)return -1;if(s<=e)boundary=true;}return boundary?0:1;}
function frame(t){let k=0;for(let i=1;i<3;i++)if(distance(t.p[i],t.p[(i+1)%3])>distance(t.p[k],t.p[(k+1)%3]))k=i;const o=t.p[k],d=sub(t.p[(k+1)%3],o),u=mul(d,1/norm(d)),v=cross(t.n,u);return {o,u,v,to:p=>[dot(sub(p,o),u),dot(sub(p,o),v)],from:p=>add(o,add(mul(u,p[0]),mul(v,p[1])))};}
const area2=poly=>poly.reduce((s,p,i)=>{const q=poly[(i+1)%poly.length];return s+p[0]*q[1]-p[1]*q[0];},0);
const area=poly=>Math.abs(area2(poly))/2;
function tidy(poly,e){const p=[];for(const q of poly)if(!p.length||Math.hypot(q[0]-p.at(-1)[0],q[1]-p.at(-1)[1])>e)p.push(q);if(p.length>1&&Math.hypot(p[0][0]-p.at(-1)[0],p[0][1]-p.at(-1)[1])<=e)p.pop();return p;}
function clip(poly,line,side,e){const result=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],x=side*(line[0]*a[0]+line[1]*a[1]+line[2]),y=side*(line[0]*b[0]+line[1]*b[1]+line[2]);if(x>=-e)result.push(a);if((x>e&&y< -e)||(x< -e&&y>e)){const f=x/(x-y);result.push([a[0]+f*(b[0]-a[0]),a[1]+f*(b[1]-a[1])]);}}return tidy(result,e);}
function clipTriangle(poly,tri,e){let result=poly;const sign=area2(tri)>=0?1:-1;for(let i=0;i<3&&result.length;i++){const p=tri[i],q=tri[(i+1)%3],dx=q[0]-p[0],dy=q[1]-p[1],l=Math.hypot(dx,dy);result=clip(result,[-dy/l,dx/l,(dy*p[0]-dx*p[1])/l],sign,e);}return result;}
function planeCut(t,other,e){const ds=t.p.map(p=>dot(other.n,sub(p,other.p[0]))),points=[];for(let i=0;i<3;i++){const j=(i+1)%3;if(Math.abs(ds[i])<=e)points.push(t.p[i]);if((ds[i]>e&&ds[j]< -e)||(ds[i]< -e&&ds[j]>e))points.push(mix(t.p[i],t.p[j],ds[i]/(ds[i]-ds[j])));}return points;}
function triangleIntersection(a,b,e){
 const da=a.p.map(p=>dot(b.n,sub(p,b.p[0]))),db=b.p.map(p=>dot(a.n,sub(p,a.p[0])));
 if(da.every(x=>x>e)||da.every(x=>x< -e)||db.every(x=>x>e)||db.every(x=>x< -e))return [];
 const axis=cross(a.n,b.n),s=norm(axis);
 if(s<1e-12){if(Math.max(...da.map(Math.abs),...db.map(Math.abs))>e)fail('unresolved-near-parallel-triangle-intersection',{triangles:[a.i,b.i],normalCrossMagnitude:s});const f=frame(a);return clipTriangle(a.p.map(f.to),b.p.map(f.to),e).map(f.from);}
 const x=planeCut(a,b,e),y=planeCut(b,a,e);if(!x.length||!y.length)return [];
 const d=mul(axis,1/s),origin=x[0],xx=x.map(p=>dot(sub(p,origin),d)),yy=y.map(p=>dot(sub(p,origin),d)),lo=Math.max(Math.min(...xx),Math.min(...yy)),hi=Math.min(Math.max(...xx),Math.max(...yy));
 if(hi<lo-e)return [];return hi-lo<=e?[add(origin,mul(d,(lo+hi)/2))]:[add(origin,mul(d,lo)),add(origin,mul(d,hi))];
}

function prepare(input,label,ctx){
 if(!input||input.closed!==true||!Array.isArray(input.triangles)||input.triangles.length<4)fail('invalid-or-declared-open-input',{input:label});
 const rows=[],vertices=[],buckets=new Map(),edges=new Map(),parents=[],patchMerges=[];
 const key=p=>p.map(x=>Math.floor(x/ctx.eps));
 function vertex(p){const q=key(p);for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){const ids=buckets.get([q[0]+x,q[1]+y,q[2]+z].join(','));if(ids)for(const id of ids)if(distance(vertices[id],p)<=ctx.eps)return id;}const id=vertices.length;vertices.push(p);const k=q.join(',');if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(id);return id;}
 const root=i=>{let r=i;while(parents[r]!==r)r=parents[r];while(parents[i]!==i){const j=parents[i];parents[i]=r;i=j;}return r;};
 for(let i=0;i<input.triangles.length;i++){
  const p=input.triangles[i];if(!Array.isArray(p)||p.length!==3||!p.every(finitePoint))fail('nonfinite-or-malformed-triangle',{input:label,triangle:i});
  const points=p.map(v=>[...v]),raw=cross(sub(points[1],points[0]),sub(points[2],points[0])),twice=norm(raw),longest=Math.max(...points.map((v,k)=>distance(v,points[(k+1)%3])));
  if(!(twice>0)||twice/longest<=ctx.tol*4)fail('degenerate-or-unresolved-triangle',{input:label,triangle:i,altitudeM:twice/longest});
  const ids=points.map(vertex);if(new Set(ids).size!==3)fail('collapsed-topology-edge',{input:label,triangle:i});
  const row={i,p:points,n:mul(raw,1/twice),area:twice/2,bounds:bounds(points),ids,adjacent:[]};rows.push(row);parents.push(i);
  for(let k=0;k<3;k++){const a=ids[k],b=ids[(k+1)%3],edge=a<b?a+':'+b:b+':'+a;if(!edges.has(edge))edges.set(edge,[]);edges.get(edge).push({i,from:a,to:b});}
 }
 for(const [edge,uses] of edges){if(uses.length!==2)fail(uses.length===1?'open-boundary-edge':'nonmanifold-edge',{input:label,edge,incidence:uses.length});const [a,b]=uses;if(a.from!==b.to||a.to!==b.from)fail('inconsistent-boundary-orientation',{input:label,edge,triangles:[a.i,b.i]});parents[root(a.i)]=root(b.i);rows[a.i].adjacent.push(b.i);rows[b.i].adjacent.push(a.i);}
 const groups=new Map();for(const row of rows){const r=root(row.i);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(row);}
 const components=[];for(const group of groups.values()){
  const component={i:components.length,rows:group,bounds:bounds(group.flatMap(t=>t.p))};for(const row of group)row.component=component.i;
  const origin=component.bounds.min.map((x,k)=>(x+component.bounds.max[k])/2);let volume=0;for(const row of group)volume+=dot(sub(row.p[0],origin),cross(sub(row.p[1],origin),sub(row.p[2],origin)))/6;
  if(!(volume>ctx.tol**3))fail('nonpositive-component-volume-or-inward-orientation',{input:label,component:component.i,signedVolumeM3:volume});component.volumeM3=volume;
  const fans=new Map();for(const row of group)for(const id of row.ids){if(!fans.has(id))fans.set(id,[]);fans.get(id).push(row.i);}
  for(const [id,fan] of fans){const allowed=new Set(fan),seen=new Set(),stack=[fan[0]];while(stack.length){const i=stack.pop();if(seen.has(i))continue;seen.add(i);const neighbors=rows[i].adjacent.filter(j=>allowed.has(j));if(neighbors.length!==2)fail('nonmanifold-vertex-link',{input:label,component:component.i,vertex:id});stack.push(...neighbors);}if(seen.size!==fan.length)fail('disconnected-vertex-link',{input:label,component:component.i,vertex:id});}
  component.tree=hierarchy([...group]);components.push(component);
 }
 const tree=hierarchy([...rows]);
 for(const a of rows)for(const b of query(tree,a.bounds,ctx.eps)){
  if(b.i<=a.i||b.component!==a.component)continue;ctx.counts.selfTrianglePairs++;
  const proof=exactSharedEdge(a,b,ctx.exact);
  if(proof.classification!=='ineligible'){
   ctx.counts.exactSharedEdgePairs++;
   if(proof.reason==='exact-noncoplanar-shared-edge')ctx.counts.exactNoncoplanarEdgeProofs++;
   else if(proof.reason==='exact-coplanar-opposite-sides')ctx.counts.exactCoplanarOppositeSideProofs++;
   else if(proof.classification==='coplanar-positive-area-overlap')ctx.counts.exactCoplanarOverlapProofs++;
   else ctx.counts.exactDegenerateEdgePairs++;
   if(ctx.adjacencyCertificates.length<8&&ctx.adjacencyCertificates.filter(row=>row.reason===proof.reason).length<4)ctx.adjacencyCertificates.push({input:label,meshId:input.id??label,...adjacencyCertificate(proof)});
   if(proof.classification==='edge-only'){if(proof.reason==='exact-coplanar-opposite-sides')patchMerges.push([a.i,b.i]);continue;}
   if(proof.classification==='coplanar-positive-area-overlap')fail('self-intersecting-component-boundary',{input:label,component:a.component,triangles:[a.i,b.i],exactAdjacency:adjacencyCertificate(proof)});
   fail('degenerate-exact-adjacent-boundary',{input:label,component:a.component,triangles:[a.i,b.i],exactAdjacency:adjacencyCertificate(proof)});
  }
  ctx.counts.selfTrianglePairsReconstructed++;
  if(proof.reason==='actual-edge-endpoints-not-exactly-equal')ctx.counts.exactEndpointMismatchPairs++;
  let hits;try{hits=triangleIntersection(a,b,ctx.eps);}catch(error){
   if(!(error instanceof Unresolved)||error.message!=='unresolved-near-parallel-triangle-intersection')throw error;
   ctx.counts.nearParallelSelfRescueAttempts++;const proof=exactSelfPairFallback(a,b,ctx.patchExact),certificate={input:label,meshId:input.id??label,component:a.component,triangles:[a.i,b.i],actualTriangles:[a.p,b.p],topologyIds:[a.ids,b.ids],originalFailure:{reason:error.message,detail:error.detail},proof};ctx.nearParallelSelfCertificates.push(certificate);
   if(!proof.legal)throw error;ctx.counts.nearParallelSelfRescues++;continue;
  }if(!hits.length)continue;
  const shared=a.ids.filter(id=>b.ids.includes(id));let legal=false;
  if(shared.length===1)legal=hits.every(p=>distance(p,vertices[shared[0]])<=ctx.eps*8);
  else if(shared.length===2)legal=hits.every(p=>pointSegmentDistance(p,vertices[shared[0]],vertices[shared[1]])<=ctx.eps*8);
  if(!legal){ctx.counts.exactSelfFallbackPairs++;const fallback=exactSelfPairFallback(a,b,ctx.patchExact);if(ctx.selfCertificates.length<8)ctx.selfCertificates.push({input:label,component:a.component,triangles:[a.i,b.i],...fallback});if(fallback.legal){ctx.counts.exactSelfFallbackLegal++;continue;}fail('self-intersecting-component-boundary',{input:label,component:a.component,triangles:[a.i,b.i],intersection:hits.slice(0,4),exactFallback:fallback});}
 }
 ctx.counts.inputTriangles+=rows.length;ctx.counts.vertices+=vertices.length;ctx.counts.closedComponents+=components.length;
 const patches=buildExactPlanarPatches(rows,patchMerges,ctx.patchExact);ctx.counts.planarPatches+=patches.length;ctx.counts.internalPlanarSeams+=patches.reduce((s,p)=>s+p.cancelled.length,0);
 return {id:input.id??label,rows,vertices,components,tree,bounds:tree.bounds,patches};
}

const RAYS=[[1,.3713906763541037,.529177210903],[.217189,1,.683771],[.731137,.283913,1],[-1,.618033988749895,.4142135623730951],[.3141592653589793,-1,.2718281828459045],[.6435942529055826,.917,-1]];
function componentInside(p,component,ctx){
 if(!inBounds(p,component.bounds,ctx.eps))return false;
 for(const direction of RAYS){let crossings=0,ambiguous=false;ctx.counts.containmentRays++;
  for(const t of rayRows(component.tree,p,direction,ctx.eps)){
   ctx.counts.rayTriangleTests++;const denominator=dot(t.n,direction),numerator=dot(t.n,sub(t.p[0],p));
   // An angular cutoff cannot prove that a nearly parallel finite ray misses
   // a face. Discard the entire ray direction and retry, never the crossing.
   if(Math.abs(denominator)<1e-12){ambiguous=true;break;}
   const parameter=numerator/denominator;if(parameter<=ctx.eps)continue;const q=add(p,mul(direction,parameter)),location=pointInTriangle(q,t,ctx.eps*4);
   if(location===0){ambiguous=true;break;}if(location===1)crossings++;
  }
  if(!ambiguous)return crossings%2===1;
 }
 fail('all-exact-containment-rays-degenerate',{point:p,component:component.i});
}
// Ordinary boundary results are strict facet hits; rescued entries identify
// the exact covering patch and retain the ambiguous facet only as provenance.
// Preserved finite boundaries make patch/component coverage constant per cell.
// A containing component takes precedence: union occupancy never uses parity.
function membership(p,mesh,ctx,knownRows=null,excludeComponent=null,queryTriangle=null){
 const near=knownRows??query(mesh.tree,pointBounds(p,ctx.tol),0),on=[],boundaryComponents=new Set(),deferred=[];
 for(const t of near){if(t.component===excludeComponent||!inBounds(p,t.bounds,ctx.tol))continue;const separation=dot(t.n,sub(p,t.p[0])),projection=sub(p,mul(t.n,separation)),location=pointInTriangle(projection,t,ctx.eps*4);if(location<0){if(pointTriangleDistance(p,t)<=ctx.tol&&pointTriangleDistance(p,t)>ctx.eps*8)deferred.push({t,separation,reason:'cell-probe-near-unresolved-boundary-edge'});continue;}
  if(Math.abs(separation)<=ctx.eps*8){if(location===0){deferred.push({t,separation,reason:'cell-probe-on-unpartitioned-boundary-edge'});continue;}on.push(t);boundaryComponents.add(t.component);}
  else if(Math.abs(separation)<=ctx.tol)fail('nonzero-surface-offset-below-resolution',{mesh:mesh.id,triangle:t.i,point:p,offsetM:separation});
 }
 // Only ambiguities from the SAME eligible exact patch can share a rescue.
 // Global boundary winding/clearance is independent of the face-local rows.
 const rescued=new Map();for(const entry of deferred){const {t,separation,reason}=entry;if(Math.abs(separation)>ctx.eps*8)fail(reason,{mesh:mesh.id,triangle:t.i,point:p,offsetM:separation,patch:t.patch.id});let proof=rescued.get(t.patch);if(!proof){ctx.counts.patchRescueAttempts++;proof=queryTriangle&&Math.abs(separation)<=ctx.eps*8&&exactCoplanar(queryTriangle,t.patch.reference,ctx.patchExact)?exactPatchMembership(p,t.patch,ctx.tol,ctx.patchExact):{inside:false,safe:false,classification:'ineligible-query-plane-or-offset'};rescued.set(t.patch,proof);if(proof.safe)ctx.counts.patchRescues++;if(ctx.patchCertificates.length<8)ctx.patchCertificates.push({mesh:mesh.id,triangle:t.i,point:p,legacyReason:reason,...proof});}
  if(!proof.inside||!proof.safe)fail(reason,{mesh:mesh.id,triangle:t.i,point:p,patch:t.patch.id,exactPatch:proof});
  if(!on.some(q=>q.patch===t.patch))on.push({...t,patchProbeWitness:true});boundaryComponents.add(t.component);
 }
 for(const component of mesh.components)if(component.i!==excludeComponent&&!boundaryComponents.has(component.i)&&componentInside(p,component,ctx))return {inside:true,on};
 return {inside:false,on};
}
function arrangementLines(t,candidates,ctx,f){
 const groups=[],facePoints=t.p.map(f.to);
 const append=(line,origin)=>{const n=Math.hypot(line[0],line[1]);if(n<=1e-12)fail('unresolved-arrangement-plane-angle',{triangle:t.i,projectedNormal:n});const q=line.map(x=>x/n);
  const equivalent=groups.filter(g=>[1,-1].some(sign=>facePoints.every(p=>Math.abs((g.line[0]-sign*q[0])*p[0]+(g.line[1]-sign*q[1])*p[1]+g.line[2]-sign*q[2])<=ctx.eps)));
  // A later origin may be equivalent to more than one retained line. Bind it
  // to every such group; no deduplicated cut loses an unresolved origin.
  if(equivalent.length)for(const g of equivalent)g.origins.push(origin);else groups.push({line:q,origins:[origin]});
 };
 for(const b of candidates){ctx.counts.arrangementCandidatePairs++;const alignment=dot(t.n,b.n),parallel=norm(cross(t.n,b.n))<1e-12,offsets=b.p.map(p=>dot(t.n,sub(p,t.p[0])));
  if(parallel){
   const reverseOffsets=t.p.map(p=>dot(b.n,sub(p,b.p[0]))),maximum=Math.max(...offsets.map(Math.abs),...reverseOffsets.map(Math.abs));
   if(ctx.regionGuardRows)ctx.regionGuardRows.push({candidate:ctx.regionGuardCandidateIndex.get(b),parallel:true,maximumOffsetM:maximum,offsetsM:offsets,reverseOffsetsM:reverseOffsets});
   if(maximum<=ctx.eps*8){const q=b.p.map(f.to);for(let k=0;k<3;k++){const a=q[k],z=q[(k+1)%3],dx=z[0]-a[0],dy=z[1]-a[1];append([-dy,dx,dy*a[0]-dx*a[1]],{candidate:b,edge:k,projected:[a,z],kind:'coplanar-edge'});}}
   else {
    const separated=values=>values.every(x=>x>ctx.eps)||values.every(x=>x< -ctx.eps);
    if(!separated(offsets)&&!separated(reverseOffsets))fail('unresolved-near-parallel-arrangement-crossing',{triangles:[t.i,b.i],offsetsM:offsets,reverseOffsetsM:reverseOffsets});
    if(maximum<=ctx.tol){const clipped=clipTriangle(t.p.map(f.to),b.p.map(f.to),ctx.eps);if(clipped.length>=3&&area(clipped)>ctx.eps**2)fail('near-coplanar-surfaces-have-unresolved-offset',{triangles:[t.i,b.i],offsetM:maximum,signedOffsetsM:offsets,alignment});}
   }
  }else {if(ctx.regionGuardRows)ctx.regionGuardRows.push({candidate:ctx.regionGuardCandidateIndex.get(b),parallel:false,offsetsM:offsets});append([dot(b.n,f.u),dot(b.n,f.v),dot(b.n,sub(f.o,b.p[0]))],{candidate:b,edge:null,kind:'nonparallel-plane'});}
 }
 // Every original angular/offset guard above runs before ANY exclusion.
 const proofByOrigin=new Map(),retained=[];for(const group of groups){let removable=true;for(const origin of group.origins){if(!proofByOrigin.has(origin)){const b=origin.candidate;const proof=origin.kind==='nonparallel-plane'?finiteTriangleExclusion(t,b,ctx.patchExact):finiteProjectedEdgeExclusion(facePoints,origin.projected,ctx.patchExact)||finiteOriginalEdgeExclusion(t,b,origin.edge,ctx.patchExact)||projectedInternalSeam(t,b,origin.edge,f,ctx.patchExact);proofByOrigin.set(origin,proof);if(proof)ctx.counts.certifiedCutOrigins++;}if(!proofByOrigin.get(origin))removable=false;}
  if(removable)ctx.counts.certifiedRemovedLines++;else retained.push(group.line);
 }
 if(ctx.cutTrace)ctx.cutTrace.push({triangle:t.i,groups:groups.map(g=>({line:g.line,retained:g.origins.some(o=>!proofByOrigin.get(o)),origins:g.origins.map(o=>({triangle:o.candidate.i,component:o.candidate.component,patch:o.candidate.patch?.id??null,edge:o.edge,kind:o.kind,actualTriangle:o.candidate.p,certificate:proofByOrigin.get(o)}))}))});
 return retained;
}
function cells(t,candidates,ctx){
 const f=frame(t),lines=arrangementLines(t,candidates,ctx,f);let polygons=[t.p.map(f.to)];
 for(const line of lines){const next=[];for(const poly of polygons){const values=poly.map(p=>line[0]*p[0]+line[1]*p[1]+line[2]);if(Math.min(...values)>=-ctx.eps||Math.max(...values)<=ctx.eps){next.push(poly);continue;}
   const pieces=[clip(poly,line,1,ctx.eps),clip(poly,line,-1,ctx.eps)];for(const piece of pieces){if(piece.length<3||area(piece)<=ctx.eps**2)fail('unresolved-arrangement-sliver',{triangle:t.i});next.push(piece);}
  }polygons=next;if(polygons.length>4096)fail('face-arrangement-complexity-bound',{triangle:t.i,cells:polygons.length});}
 let accumulated=0;const result=[];
 for(const poly of polygons){const a=area(poly),p=poly.reduce((s,q)=>[s[0]+q[0]/poly.length,s[1]+q[1]/poly.length],[0,0]);let margin=Infinity;for(let k=0;k<poly.length;k++){const x=poly[k],y=poly[(k+1)%poly.length],dx=y[0]-x[0],dy=y[1]-x[1];margin=Math.min(margin,Math.abs(dx*(p[1]-x[1])-dy*(p[0]-x[0]))/Math.hypot(dx,dy));}
  if(!(margin>ctx.tol))fail('arrangement-cell-below-resolution',{triangle:t.i,inradiusLowerBoundM:margin,areaM2:a});
  accumulated+=a;result.push({area:a,point:f.from(p),polygon:poly.map(f.from)});
 }
 if(Math.abs(accumulated-t.area)>Math.max(ctx.eps*t.area*64,ctx.eps**2*64))fail('arrangement-area-conservation-failed',{triangle:t.i,originalAreaM2:t.area,partitionAreaM2:accumulated});
 ctx.counts.arrangementCells+=result.length;ctx.counts.arrangementLines+=lines.length;if(ctx.counts.arrangementCells>2000000)fail('total-arrangement-complexity-bound');return result;
}

// A whole patch is staged before any material/ownership update. The exact
// replacement never shares a cache with another direction or another join.
const regionTriangle=t=>({i:t.i,p:t.p,ids:t.ids,n:t.n,area:t.area,bounds:t.bounds,component:t.component});
const regionPatch=(patch,key)=>({key,id:patch.id,component:patch.component,members:patch.members.map(regionTriangle),boundary:patch.boundary.map(e=>({triangle:e.triangle.i,edge:e.edge,a:e.a,b:e.b}))});
function stagePatch(one,other,patch,direction,ctx){
 const before={cells:ctx.counts.arrangementCells,lines:ctx.counts.arrangementLines},staged=[];let trigger=null;
 for(const t of patch.members){const opposite=query(other.tree,t.bounds,ctx.tol),own=query(one.tree,t.bounds,ctx.tol).filter(q=>q.component!==t.component);ctx.counts.ordinaryMemberAttempts++;
  try{const partition=cells(t,[...opposite,...own],ctx);staged.push(...partition.map(cell=>({t,opposite,own,cell})));}
  catch(error){if(!(error instanceof Unresolved)||!['arrangement-cell-below-resolution','unresolved-arrangement-sliver'].includes(error.message))throw error;trigger={reason:error.message,detail:error.detail,triangle:t.i};break;}
 }
 ctx.counts.ordinaryCellsCompletedDuringStaging+=ctx.counts.arrangementCells-before.cells;ctx.counts.ordinaryLinesCompletedDuringStaging+=ctx.counts.arrangementLines-before.lines;
 if(!trigger){ctx.counts.ordinaryPatchesAccepted++;ctx.counts.ordinaryMembersAccepted+=patch.members.length;return {entries:staged,exact:null};}
 // Discard every staged cell before reconstructing the complete patch. No
 // membership call, witness or contact has yet occurred for this patch.
 ctx.counts.discardedOrdinaryCells+=ctx.counts.arrangementCells-before.cells;ctx.counts.discardedOrdinaryLines+=ctx.counts.arrangementLines-before.lines;ctx.counts.arrangementCells=before.cells;ctx.counts.arrangementLines=before.lines;ctx.counts.exactRegionFallbackAttempts++;
 const patchBounds=bounds(patch.members.flatMap(t=>t.p)),opposite=query(other.tree,patchBounds,ctx.tol),own=query(one.tree,patchBounds,ctx.tol).filter(q=>q.component!==patch.component),all=[...opposite,...own],candidateIndex=new Map(all.map((t,i)=>[t,i])),packets=new Map(),candidates=all.map((t,i)=>{const owner=i<opposite.length?'other':'own-other-component',mesh=owner==='other'?other:one,key=direction+'/'+owner+'/'+t.patch.id;if(!packets.has(key))packets.set(key,regionPatch(t.patch,key));return {candidate:i,owner,meshId:mesh.id,triangle:regionTriangle(t),patchKey:key};}),guardResults=[];
 ctx.regionGuardCandidateIndex=candidateIndex;
 try{for(const t of patch.members){const localOpposite=query(other.tree,t.bounds,ctx.tol),localOwn=query(one.tree,t.bounds,ctx.tol).filter(q=>q.component!==t.component);ctx.regionGuardRows=[];arrangementLines(t,[...localOpposite,...localOwn],ctx,frame(t));if(ctx.regionGuardRows.some(r=>!Number.isInteger(r.candidate)))fail('exact-region-incomplete-candidate-closure',{patch:patch.id,triangle:t.i});guardResults.push({triangle:t.i,candidates:ctx.regionGuardRows.map(r=>r.candidate),passed:true,rows:ctx.regionGuardRows});ctx.counts.exactRegionGuardMembers++;}}
 finally{delete ctx.regionGuardRows;delete ctx.regionGuardCandidateIndex;}
 const input={id:direction+'/'+one.id+'/patch-'+patch.id,kind:'material-query-patch',queryPatch:regionPatch(patch,'query'),patches:[...packets.values()],candidates,patchBounds,candidateClosure:{otherRows:other.rows.map(t=>({i:t.i,component:t.component,bounds:t.bounds})),ownRows:one.rows.map(t=>({i:t.i,component:t.component,bounds:t.bounds})),oppositeIndices:opposite.map(t=>t.i),ownOtherIndices:own.map(t=>t.i)},guardResults,guardsComplete:true,toleranceM:ctx.tol,arithmeticToleranceM:ctx.eps},partition=inspectCollectorQueryRegions(input),evidence={direction,queryMeshId:one.id,otherMeshId:other.id,patch:patch.id,component:patch.component,referenceTriangle:patch.reference.i,referenceTriangleRole:'Plane and component provenance only; it need not contain a region probe',originalMemberTriangles:patch.members.map(t=>t.i),trigger,discardedOrdinaryCells:staged.length,input,partition,contactRegionIds:[],contactProjectedTwiceArea:collectorExactRegionRationals.zero(),contactAreaConversion:null};ctx.exactRegionPartitions.push(evidence);
 if(!partition.completed||!partition.eligible||!partition.regionsResolved||!partition.binary64RegionsResolved)fail('exact-query-patch-region-unresolved',{patch:patch.id,trigger,exactReason:partition.reason??partition.error??null,completed:partition.completed,eligible:partition.eligible,regionsResolved:partition.regionsResolved,binary64RegionsResolved:partition.binary64RegionsResolved,partitionEvidenceIndex:ctx.exactRegionPartitions.length-1});
 ctx.counts.exactRegionFallbacks++;ctx.counts.exactRegionMembersAccepted+=patch.members.length;ctx.counts.exactRegionPositiveFragments+=partition.fragments.length;ctx.counts.exactRegionsAccepted+=partition.regions.length;ctx.counts.arrangementCells+=partition.regions.length;ctx.counts.arrangementLines+=partition.lineGroups.length;if(ctx.counts.arrangementCells>2000000)fail('total-arrangement-complexity-bound');
 return {exact:evidence,entries:partition.regions.map(region=>({t:patch.reference,opposite,own,cell:{area:region.physicalArea.value,point:region.membershipProbe.certificate.roundedPoint,exactRegion:region}}))};
}

// New conversion capability failures stay incomplete; they never authorize a partition retry.
function regionAreaOperation(operation,context){try{return operation();}catch(error){if(['uncertified-physical-area-conversion','Positive finite physical-area conversion','Positive projected area required','Finite outward area accumulation','Nonfinite exact coordinate'].includes(error.message))fail('unresolved-exact-region-area-conversion',{...context,error:{name:error.name,message:error.message}});throw error;}}
/** Inspect actual material solids. Never mutates the supplied coordinates. */
export function inspectCollectorMaterialJoin({a,b,minimumContactAreaM2=0,toleranceM=2e-7}={}){
 const counts={inputTriangles:0,vertices:0,closedComponents:0,selfTrianglePairs:0,selfTrianglePairsReconstructed:0,exactSharedEdgePairs:0,exactNoncoplanarEdgeProofs:0,exactCoplanarOppositeSideProofs:0,exactCoplanarOverlapProofs:0,exactDegenerateEdgePairs:0,exactEndpointMismatchPairs:0,exactDecodedScalars:0,exactDecodeCacheHits:0,arrangementCandidatePairs:0,arrangementLines:0,arrangementCells:0,classifiedCells:0,containmentRays:0,rayTriangleTests:0,contactCells:0,unionDuplicateCells:0,internalUnionCells:0,exactSelfFallbackPairs:0,exactSelfFallbackLegal:0,planarPatches:0,internalPlanarSeams:0,certifiedCutOrigins:0,certifiedRemovedLines:0,patchRescueAttempts:0,patchRescues:0,nearParallelSelfRescueAttempts:0,nearParallelSelfRescues:0,ordinaryMemberAttempts:0,ordinaryCellsCompletedDuringStaging:0,ordinaryLinesCompletedDuringStaging:0,discardedOrdinaryCells:0,discardedOrdinaryLines:0,ordinaryPatchesAccepted:0,ordinaryMembersAccepted:0,exactRegionFallbackAttempts:0,exactRegionFallbacks:0,exactRegionGuardMembers:0,exactRegionMembersAccepted:0,exactRegionPositiveFragments:0,exactRegionsAccepted:0};
 const result={ok:false,complete:false,contactAreaM2:0,interpenetration:null,method:METHOD,adjacencyMethod:ADJACENCY_METHOD,toleranceM,inputIds:{a:a?.id??'a',b:b?.id??'b'},checkedCounts:counts,representativeAdjacencyCertificates:[],representativeSelfFallbackCertificates:[],representativePatchCertificates:[],nearParallelSelfCertificates:[],exactRegionPartitions:[],ordinaryContactCellAreasM2:[],representativeContactPatches:[],penetrationWitnesses:[],reason:null,domain:'Embedded outward oriented closed triangle components; component union; complete finite face arrangements; arithmetic coincidence only; unresolved sub-tolerance geometry fails',zeroRequestedAreaPolicy:'Noninterpenetration only; separated solids may pass zero area; positive requests require positive contact'};
 const ctx={tol:toleranceM,eps:1e-12,counts,exact:exactContext(),adjacencyCertificates:result.representativeAdjacencyCertificates,patchExact:createPatchExactContext(),selfCertificates:result.representativeSelfFallbackCertificates,patchCertificates:result.representativePatchCertificates,nearParallelSelfCertificates:result.nearParallelSelfCertificates,exactRegionPartitions:result.exactRegionPartitions};
 try{
  if(!Number.isFinite(toleranceM)||toleranceM<=0||!Number.isFinite(minimumContactAreaM2)||minimumContactAreaM2<0)fail('invalid-tolerance-or-minimum-area');
  let magnitude=1;for(const input of[a,b])if(Array.isArray(input?.triangles))for(const t of input.triangles)if(Array.isArray(t))for(const p of t)if(finitePoint(p))for(const x of p)magnitude=Math.max(magnitude,Math.abs(x));
  ctx.eps=Math.max(1e-13,Number.EPSILON*magnitude*128);result.arithmeticToleranceM=ctx.eps;if(ctx.eps*64>=ctx.tol)fail('coordinate-magnitude-exceeds-numerical-domain');
  const A=prepare(a,'a',ctx),B=prepare(b,'b',ctx);result.componentCounts={a:A.components.length,b:B.components.length};
  let penetration=false,contact=0,contactBounds={value:0,lower:0,upper:0};
  const witness=(kind,one,other,t,cell,extra={})=>{penetration=true;if(result.penetrationWitnesses.length<8)result.penetrationWitnesses.push({kind,surfaceMeshId:one.id,otherMeshId:other.id,triangle:t.i,point:cell.point,cellAreaM2:cell.area,...extra});};
  for(const [one,other,countContact,direction] of [[A,B,true,'a-to-b'],[B,A,false,'b-to-a']])for(const patch of one.patches){
   const staged=stagePatch(one,other,patch,direction,ctx);
   for(const {t,opposite,own,cell} of staged.entries){
    counts.classifiedCells++;const occupied=membership(cell.point,other,ctx,opposite,null,t);
    if(occupied.inside){witness('boundary-cell-inside-other-union',one,other,t,cell);continue;}
    if(!occupied.on.length)continue;
    let oppositeBoundary=false;for(const q of occupied.on){const alignment=dot(t.n,q.n);if(alignment>1-1e-10)witness('cooriented-coincident-boundary-cell',one,other,t,cell,{otherTriangle:q.i,normalAlignment:alignment});else if(alignment< -1+1e-10)oppositeBoundary=true;else fail('unresolved-noncoplanar-boundary-cell',{triangles:[t.i,q.i],point:cell.point,alignment});}
    if(!oppositeBoundary||!countContact)continue;
    // A contact patch must be exposed on both unions. Other components can
    // occupy a point strictly or supply the opposite side of a shared plane.
    const ownMembership=membership(cell.point,one,ctx,own,t.component,t);
    if(ownMembership.inside||ownMembership.on.some(q=>dot(q.n,t.n)< -1+1e-10)){counts.internalUnionCells++;continue;}
    const otherNormals=occupied.on.map(q=>dot(q.n,t.n));if(otherNormals.some(x=>x>1-1e-10)){counts.internalUnionCells++;continue;}
    if(ownMembership.on.some(q=>dot(q.n,t.n)>1-1e-10&&q.component<t.component)){counts.unionDuplicateCells++;continue;}
    if(cell.exactRegion){staged.exact.contactProjectedTwiceArea=collectorExactRegionRationals.add(staged.exact.contactProjectedTwiceArea,cell.exactRegion.exactProjectedTwiceArea);staged.exact.contactRegionIds.push(cell.exactRegion.id);}else {result.ordinaryContactCellAreasM2.push(cell.area);contactBounds=regionAreaOperation(()=>addCollectorAreaBounds(contactBounds,{value:cell.area,lower:cell.area,upper:cell.area}),{direction,patch:patch.id,stage:'ordinary-estimate-accumulation'});}counts.contactCells++;if(result.representativeContactPatches.length<8)result.representativeContactPatches.push({meshA:one.id,meshB:other.id,triangleA:t.i,trianglesB:occupied.on.filter(q=>dot(q.n,t.n)<0).map(q=>q.i),triangleIdsAreProbeWitnesses:!cell.exactRegion,triangleAIsPlaneComponentReference:!!cell.exactRegion,triangleWitnessMeaning:cell.exactRegion?'A is an arbitrary plane/component reference; B contains strict-interior facets or deferred-ambiguity patch references. Region coverage comes from exact members and oriented boundaries.':'Strict-interior facets or deferred-ambiguity patch references; coverage is certified by patch/component IDs',coveringPatchA:t.patch.id,componentA:t.component,coveringPatchesB:[...new Set(occupied.on.filter(q=>dot(q.n,t.n)<0).map(q=>q.patch.id))],componentsB:[...new Set(occupied.on.filter(q=>dot(q.n,t.n)<0).map(q=>q.component))],areaM2:cell.area,...(cell.exactRegion?{regionId:cell.exactRegion.id,referenceTriangleRole:'Plane/component provenance only',memberTriangles:[...new Set(cell.exactRegion.fragments.map(id=>staged.exact.partition.fragments[id].member[1]))],orientedBoundarySegments:cell.exactRegion.boundaryEdgeIds.map(id=>staged.exact.partition.fragmentEdges[id]),exactProjectedTwiceArea:cell.exactRegion.exactProjectedTwiceArea,probeCertificate:cell.exactRegion.membershipProbe.certificate,physicalAreaEnclosure:cell.exactRegion.physicalArea}:{polygon:cell.polygon}),normalA:t.n});
   }
   if(staged.exact&&staged.exact.contactRegionIds.length){const area=regionAreaOperation(()=>encloseCollectorPhysicalArea(staged.exact.contactProjectedTwiceArea,staged.exact.partition.projection),{direction,patch:patch.id,stage:'once-per-patch-contact-conversion',projectedTwiceArea:staged.exact.contactProjectedTwiceArea,projection:staged.exact.partition.projection});staged.exact.contactAreaConversion=area;contactBounds=regionAreaOperation(()=>addCollectorAreaBounds(contactBounds,area),{direction,patch:patch.id,stage:'converted-patch-accumulation',area});}
  }
  contact=contactBounds.value;result.contactAreaM2=contact;result.contactAreaEnclosure={...contactBounds,scope:'New exact-region conversion bounds combined with unchanged legacy cell area estimates'};result.interpenetration=penetration;
  const decision=collectorAreaThreshold(contactBounds,minimumContactAreaM2);result.areaThresholdCertificate={minimumContactAreaM2,relativeTolerance:1e-12,...decision};if(!decision.complete)fail('unresolved-contact-area-threshold',{minimumContactAreaM2,contactAreaEnclosure:result.contactAreaEnclosure});result.complete=true;const areaMet=decision.met;
  result.ok=!penetration&&areaMet;result.reason=penetration?'positive-volume-material-interpenetration':areaMet?'complete-material-contact-contract-satisfied':'insufficient-actual-contact-area';
 }catch(error){if(!(error instanceof Unresolved))throw error;result.reason=error.message;result.unresolved=error.detail;result.interpenetration=result.penetrationWitnesses.length?true:null;}
 result.noninterpenetrationProved=result.complete&&result.interpenetration===false;
 counts.exactDecodedScalars=ctx.exact.decodes;counts.exactDecodeCacheHits=ctx.exact.cacheHits;
 result.positiveVolumeOverlapProved=result.penetrationWitnesses.length>0;
 result.contactAreaResolved=result.complete;
 return result;
}

/** Focused diagnostics only. Neither validates nor accepts a closed solid. */
export function inspectCollectorSelfPair({a,b}={}){return {scope:'self-pair-sufficient-certificate-only',...exactSelfPairFallback(a,b,createPatchExactContext())};}
function diagnosticPatchRows(input){const rows=input.map((r,i)=>({...r,i,p:r.p.map(p=>[...p]),ids:[...r.ids],component:r.component??0})),ctx=exactContext(),merges=[];const edges=new Map();for(const row of rows)for(let k=0;k<3;k++){const ids=[row.ids[k],row.ids[(k+1)%3]].sort((a,b)=>a-b),key=row.component+':'+ids.join(':');if(!edges.has(key))edges.set(key,[]);edges.get(key).push(row);}for(const pair of edges.values())if(pair.length===2){const proof=exactSharedEdge(pair[0],pair[1],ctx);if(proof.reason==='exact-coplanar-opposite-sides')merges.push(pair.map(t=>t.i));}const exact=createPatchExactContext(),patches=buildExactPlanarPatches(rows,merges,exact);return {rows,patches,exact};}
export function inspectCollectorPlanarPatchPoint({rows:input,triangle=0,point,query:queryInput=null,toleranceM=2e-7}={}){const {rows,patches,exact}=diagnosticPatchRows(input),t=rows[triangle],eligible=!queryInput||exactCoplanar(queryInput,t.patch.reference,exact),classification=exactPatchMembership(point,t.patch,toleranceM,exact);return {scope:'finite-patch-point-only',materialAcceptanceConferred:false,eligible,patchCount:patches.length,memberTriangles:t.patch.members.map(r=>r.i),boundary:t.patch.boundary.map(e=>({triangle:e.triangle.i,edge:e.edge,a:e.a,b:e.b})),cancellations:t.patch.cancelled,classification:{...classification,safe:eligible&&classification.safe}};}
export function inspectCollectorArrangementCuts({query:queryInput,candidates:inputs,toleranceM=2e-7,arithmeticToleranceM=1e-12}={}){
 const all=[queryInput,...inputs],components=new Map(),records=all.map(r=>{const key=(r.sourceMeshId??'diagnostic-mesh')+'/'+r.component;if(!components.has(key))components.set(key,components.size);return {...r,component:components.get(key)};}),{rows,patches,exact}=diagnosticPatchRows(records);
 for(const [i,row]of rows.entries()){const raw=cross(sub(row.p[1],row.p[0]),sub(row.p[2],row.p[0]));row.n=all[i].n??mul(raw,1/norm(raw));}
 const ctx={tol:toleranceM,eps:arithmeticToleranceM,patchExact:exact,counts:{arrangementCandidatePairs:0,certifiedCutOrigins:0,certifiedRemovedLines:0},cutTrace:[]};const t=rows[0];arrangementLines(t,rows.slice(1),ctx,frame(t));
 return {scope:'finite-cut-origins-only',materialAcceptanceConferred:false,patchScope:'Only supplied actual reversed shared-edge pairs; unknown outside neighbors never cancelled',knownPatchCount:patches.length,groups:ctx.cutTrace[0].groups.map(g=>({...g,origins:g.origins.map(o=>({...o,triangle:all[o.triangle].i,component:all[o.triangle].component,sourceMeshId:all[o.triangle].sourceMeshId??null}))})),checkedCounts:ctx.counts};
}
