// Shared finite-radius routing checks. Coordinates and clearances are metres.
// The renderer supplies its actual tube buffers; declarations are never used
// as a substitute for the geometry being displayed.
import {sampleConnectionRoute} from './connection-routes.js';
const EPS=1e-10;
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,s)=>a.map(v=>v*s);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=a=>Math.hypot(...a),distance=(a,b)=>len(sub(a,b));
const unit=a=>mul(a,1/(len(a)||1));
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const finitePoint=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const xyz=p=>Array.isArray(p)?p:p?.toArray?p.toArray():p&&[p.x,p.y,p.z];
const lerp=(a,b,t)=>add(a,mul(sub(b,a),t));
const pointBoxDistanceSq=(p,min,max)=>p.reduce((s,v,i)=>s+Math.max(min[i]-v,0,v-max[i])**2,0);
const boundsOf=points=>{const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const p of points)for(let i=0;i<3;i++){min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}return {min,max};};
const routeSegmentCache=new WeakMap();
function segmentsOf(route){let entry=routeSegmentCache.get(route);if(entry?.points===route.points&&entry.coordinates.length===route.points.length*3&&route.points.every((p,i)=>xyz(p).every((x,k)=>x===entry.coordinates[i*3+k])))return entry.segments;const coordinates=route.points.flatMap(xyz),segments=route.points.slice(1).map((p,i)=>({a:xyz(route.points[i]),b:xyz(p),bounds:boundsOf([xyz(route.points[i]),xyz(p)])}));routeSegmentCache.set(route,{points:route.points,coordinates,segments});return segments;}
export function simplifyCollisionPolyline(points,toleranceM=2e-6,preserveIndices=[]){
 if(points.length<3||toleranceM<=0)return points;const keep=new Set([0,points.length-1,...preserveIndices.filter(i=>Number.isInteger(i)&&i>=0&&i<points.length)]),anchors=[...keep].sort((a,b)=>a-b),stack=anchors.slice(1).map((hi,i)=>[anchors[i],hi]);
 while(stack.length){const [lo,hi]=stack.pop(),a=points[lo],b=points[hi],d=sub(b,a),dd=dot(d,d);let maximum=toleranceM,at=-1;for(let i=lo+1;i<hi;i++){const t=dd>EPS?clamp(dot(sub(points[i],a),d)/dd):0,error=distance(points[i],lerp(a,b,t));if(error>maximum){maximum=error;at=i;}}if(at>=0){keep.add(at);stack.push([lo,at],[at,hi]);}}
 return [...keep].sort((a,b)=>a-b).map(i=>points[i]);
}
function boxesDistance(a,b){return Math.hypot(Math.max(a.min[0]-b.max[0],b.min[0]-a.max[0],0),Math.max(a.min[1]-b.max[1],b.min[1]-a.max[1],0),Math.max(a.min[2]-b.max[2],b.min[2]-a.max[2],0));}
function transform(p,m){const w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];return [(m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12])/w,(m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13])/w,(m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14])/w];}

/** Exact closest points of two finite segments, including degenerate ones. */
export function segmentSegmentDistance(a,b,c,d){
 const u=sub(b,a),v=sub(d,c),w=sub(a,c),uu=dot(u,u),uv=dot(u,v),vv=dot(v,v),uw=dot(u,w),vw=dot(v,w);let s=0,t=0;
 if(uu<=1e-24&&vv<=1e-24)return {distanceM:distance(a,c),s,t,pointA:[...a],pointB:[...c]};
 if(uu<=1e-24)t=clamp(vw/vv);
 else if(vv<=1e-24)s=clamp(-uw/uu);
 else{const denominator=uu*vv-uv*uv;s=denominator>Number.EPSILON*16*uu*vv?clamp((uv*vw-vv*uw)/denominator):0;t=(uv*s+vw)/vv;if(t<0){t=0;s=clamp(-uw/uu);}else if(t>1){t=1;s=clamp((uv-uw)/uu);}}
 const pointA=lerp(a,b,s),pointB=lerp(c,d,t);return {distanceM:distance(pointA,pointB),s,t,pointA,pointB};
}

/** Exact Euclidean distance to a closed AABB, not only a centreline ray test. */
export function segmentBoxDistance(a,b,min,max){
 const delta=sub(b,a),cuts=[0,1];
 for(let i=0;i<3;i++)if(Math.abs(delta[i])>EPS)for(const bound of [min[i],max[i]]){const t=(bound-a[i])/delta[i];if(t>0&&t<1)cuts.push(t);}
 cuts.sort((x,y)=>x-y);let best=Infinity,bestT=0;
 function consider(t){const d=pointBoxDistanceSq(lerp(a,b,t),min,max);if(d<best){best=d;bestT=t;}}
 for(let k=1;k<cuts.length;k++){
  const lo=cuts[k-1],hi=cuts[k],mid=(lo+hi)/2;let aa=0,bb=0;
  for(let i=0;i<3;i++){const p=a[i]+delta[i]*mid,target=p<min[i]?min[i]:p>max[i]?max[i]:null;if(target!==null){aa+=delta[i]**2;bb+=delta[i]*(a[i]-target);}}
  consider(lo);consider(hi);if(aa>EPS)consider(clamp(-bb/aa,lo,hi));
 }
 const point=lerp(a,b,bestT),surface=point.map((x,i)=>clamp(x,min[i],max[i]));return {distanceM:Math.sqrt(best),t:bestT,point,surface};
}

function pointTriangleDistanceSq(p,a,b,c){
 const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return dot(ap,ap);
 const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return dot(bp,bp);
 const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const q=add(a,mul(ab,d1/(d1-d3)));return dot(sub(p,q),sub(p,q));}
 const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return dot(cp,cp);
 const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const q=add(a,mul(ac,d2/(d2-d6)));return dot(sub(p,q),sub(p,q));}
 const va=d3*d6-d5*d4;if(va<=0&&d4-d3>=0&&d5-d6>=0){const q=add(b,mul(sub(c,b),(d4-d3)/((d4-d3)+(d5-d6))));return dot(sub(p,q),sub(p,q));}
 const denominator=va+vb+vc;
 if(!(denominator>0))return 0; // A numerically unresolved near-degenerate face must not overstate clearance.
 const q=add(add(a,mul(ab,vb/denominator)),mul(ac,vc/denominator));return dot(sub(p,q),sub(p,q));
}

function rayTriangle(origin,direction,a,b,c){
 const e1=sub(b,a),e2=sub(c,a),p=cross(direction,e2),det=dot(e1,p);if(Math.abs(det)<EPS)return null;
 const inv=1/det,s=sub(origin,a),u=dot(s,p)*inv;if(u<-EPS||u>1+EPS)return null;
 const q=cross(s,e1),v=dot(direction,q)*inv;if(v<-EPS||u+v>1+EPS)return null;
 const t=dot(e2,q)*inv;return t>=-EPS?t:null;
}
export function segmentTriangleDistance(a,b,triangle){
 const [x,y,z]=triangle,delta=sub(b,a),area2=len(cross(sub(y,x),sub(z,x)));
 if(area2<=EPS){const edges=[[x,y,z],[y,z,x],[z,x,y]].sort((u,v)=>distance(v[0],v[1])-distance(u[0],u[1])),[p,q,r]=edges[0],radius=segmentSegmentDistance(r,r,p,q).distanceM;return Math.max(0,segmentSegmentDistance(a,b,p,q).distanceM-radius);}
 const hit=rayTriangle(a,delta,x,y,z);if(hit!==null&&hit<=1+EPS)return 0;
 return Math.sqrt(Math.min(pointTriangleDistanceSq(a,x,y,z),pointTriangleDistanceSq(b,x,y,z),...[[x,y],[y,z],[z,x]].map(([c,d])=>segmentSegmentDistance(a,b,c,d).distanceM**2)));
}
const triangleHierarchyCache=new WeakMap(),meshContainmentCache=new WeakMap(),immutableTriangleTokens=new WeakMap();let immutableTriangleGeneration=0;
function triangleCacheKey(triangles){
 if(!Array.isArray(triangles)||!Object.isFrozen(triangles))return triangles;
 const known=immutableTriangleTokens.get(triangles);if(known)return known;
 if(!triangles.every(triangle=>Object.isFrozen(triangle)&&triangle.every(Object.isFrozen)))return triangles;
 // The adapter compares every actual source-buffer value before returning
 // this deeply frozen coordinate array. Identity is therefore an exact key;
 // a new transform/buffer creates a new array and cannot reuse this token.
 const token='immutable-triangles:'+ ++immutableTriangleGeneration;immutableTriangleTokens.set(triangles,token);return token;
}
function triangleHierarchy(triangles){
 if(triangles.length<32||!Object.isFrozen(triangles))return null;
 if(triangleHierarchyCache.has(triangles))return triangleHierarchyCache.get(triangles);
 // Only immutable, adapter-recovered coordinates may reuse a hierarchy.
 // Plain mutable caller records keep exact direct scans; a silent edit must
 // never inherit spatial bounds from old geometry.
 if(!triangles.every(triangle=>Object.isFrozen(triangle)&&triangle.every(Object.isFrozen))){triangleHierarchyCache.set(triangles,null);return null;}
 const build=rows=>{const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};for(const row of rows)for(let k=0;k<3;k++){bounds.min[k]=Math.min(bounds.min[k],row.bounds.min[k]);bounds.max[k]=Math.max(bounds.max[k],row.bounds.max[k]);}if(rows.length<=8)return {bounds,triangles:rows.map(row=>row.triangle)};const axis=[0,1,2].sort((a,b)=>(bounds.max[b]-bounds.min[b])-(bounds.max[a]-bounds.min[a]))[0];rows.sort((a,b)=>(a.bounds.min[axis]+a.bounds.max[axis])-(b.bounds.min[axis]+b.bounds.max[axis]));const middle=rows.length>>1;return {bounds,left:build(rows.slice(0,middle)),right:build(rows.slice(middle))};};
 const tree=build(triangles.map(triangle=>({triangle,bounds:boundsOf(triangle)})));triangleHierarchyCache.set(triangles,tree);return tree;
}
function rayIntersectsBox(origin,direction,bounds){let lo=0,hi=Infinity;for(let k=0;k<3;k++){if(Math.abs(direction[k])<1e-15){if(origin[k]<bounds.min[k]||origin[k]>bounds.max[k])return false;}else{let a=(bounds.min[k]-origin[k])/direction[k],b=(bounds.max[k]-origin[k])/direction[k];if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return false;}}return true;}
function rayTriangles(origin,direction,obstacle){const tree=triangleHierarchy(obstacle.triangles);if(!tree)return obstacle.triangles;const found=[],stack=[tree];while(stack.length){const node=stack.pop();if(!rayIntersectsBox(origin,direction,node.bounds))continue;if(node.triangles)found.push(...node.triangles);else stack.push(node.left,node.right);}return found;}
function meshSurfaceDistance(a,b,obstacle){const tree=triangleHierarchy(obstacle.triangles);if(!tree){let minimum=Infinity;for(const tri of obstacle.triangles){minimum=Math.min(minimum,segmentTriangleDistance(a,b,tri));if(minimum<EPS)break;}return minimum;}const bounds=boundsOf([a,b]),stack=[tree];let minimum=Infinity;while(stack.length){const node=stack.pop();if(boxesDistance(bounds,node.bounds)>minimum)continue;if(node.triangles){for(const tri of node.triangles){minimum=Math.min(minimum,segmentTriangleDistance(a,b,tri));if(minimum<EPS)return minimum;}}else{const left=boxesDistance(bounds,node.left.bounds),right=boxesDistance(bounds,node.right.bounds);if(left<right)stack.push(node.right,node.left);else stack.push(node.left,node.right);}}return minimum;}
function nearbyTriangles(a,b,obstacle,radius){const tree=triangleHierarchy(obstacle.triangles);if(!tree)return obstacle.triangles;const bounds=boundsOf([a,b]),found=[],stack=[tree];while(stack.length){const node=stack.pop();if(boxesDistance(bounds,node.bounds)>radius)continue;if(node.triangles)found.push(...node.triangles);else stack.push(node.left,node.right);}return found;}
function meshContainment(triangles){
 const immutable=typeof triangleCacheKey(triangles)==='string';if(immutable&&meshContainmentCache.has(triangles))return meshContainmentCache.get(triangles);
 // A concatenated mesh is a union of physical closed components. Applying
 // even/odd parity to the complete mesh cancels two overlapping solids.
 // Weld only at the existing 10 nm closure tolerance, remove duplicate
 // faces, and recover edge-connected shells before any containment query.
 const key=p=>p.map(v=>Math.round(v*1e8)).join(','),rows=[],unique=new Set(),edges=new Map(),parent=[];
 const root=i=>{let r=i;while(parent[r]!==r)r=parent[r];while(parent[i]!==i){const next=parent[i];parent[i]=r;i=next;}return r;};
 for(const triangle of triangles){if(len(cross(sub(triangle[1],triangle[0]),sub(triangle[2],triangle[0])))<=EPS)continue;const keys=triangle.map(key);if(new Set(keys).size<3)continue;const face=[...keys].sort().join('|');if(unique.has(face))continue;unique.add(face);const index=rows.length;rows.push(triangle);parent.push(index);for(let k=0;k<3;k++){const a=keys[k],b=keys[(k+1)%3],edge=a<b?a+'|'+b:b+'|'+a,adjacent=edges.get(edge);if(adjacent){parent[root(index)]=root(adjacent[0]);adjacent.push(index);}else edges.set(edge,[index]);}}
 const groups=new Map();for(let i=0;i<rows.length;i++){const r=root(i);let component=groups.get(r);if(!component){component={triangles:[],boundaryEdges:0,nonmanifoldEdges:0};groups.set(r,component);}component.triangles.push(rows[i]);}
 for(const adjacent of edges.values()){const component=groups.get(root(adjacent[0]));if(adjacent.length===1)component.boundaryEdges++;if(adjacent.length>2)component.nonmanifoldEdges++;}
 const components=[...groups.values()].map(c=>{const bounds=boundsOf(c.triangles.flat()),closed=c.boundaryEdges===0&&c.nonmanifoldEdges===0;return {...c,bounds,closed,conservative:c.nonmanifoldEdges>0,triangles:immutable?Object.freeze(c.triangles):c.triangles};}),result={components,hasEnclosure:components.some(c=>c.closed||c.conservative)};
 if(immutable)meshContainmentCache.set(triangles,result);return result;
}
function pointInsideMesh(p,obstacle){
 if(!obstacle.closed||pointBoxDistanceSq(p,obstacle.bounds.min,obstacle.bounds.max)>EPS)return false;
 const direction=unit([1,.3713906763541037,.529177210903]);
 for(const component of meshContainment(obstacle.triangles).components){
  if((!component.closed&&!component.conservative)||pointBoxDistanceSq(p,component.bounds.min,component.bounds.max)>EPS)continue;
  // Nonmanifold touching/overlapping shells have ambiguous material topology.
  // Their component AABB is a conservative enclosure; an uncertain interior
  // cannot be reported as empty space. Ordinary connected annular shells are
  // manifold, so their real through-holes retain the exact parity test.
  if(component.conservative)return true;
  const hits=[];for(const tri of rayTriangles(p,direction,component)){const t=rayTriangle(p,direction,...tri);if(t!==null&&t>EPS)hits.push(t);}
  hits.sort((a,b)=>a-b);let count=0,last=-Infinity;for(const t of hits)if(t-last>EPS){count++;last=t;}if(count%2===1)return true;
 }
 return false;
}
function isClosedTriangles(triangles){return meshContainment(triangles).hasEnclosure;}

export function objectMatrixInFrame(mesh,frame){
 mesh.updateWorldMatrix?.(true,false);if(!frame)return mesh.matrixWorld;
 frame.updateWorldMatrix?.(true,false);
 const chain=[],ancestors=new Map();let ancestor=mesh;while(ancestor){ancestors.set(ancestor,chain.length);chain.push(ancestor);ancestor=ancestor.parent;}
 const frameChain=[];ancestor=frame;while(ancestor&&!ancestors.has(ancestor)){frameChain.push(ancestor);ancestor=ancestor.parent;}
 if(ancestor){const source=mesh.matrixWorld.clone().identity(),target=source.clone();for(let i=ancestors.get(ancestor)-1;i>=0;i--)source.multiply(chain[i].matrix);for(let i=frameChain.length-1;i>=0;i--)target.multiply(frameChain[i].matrix);return frameChain.length?target.invert().multiply(source):source;}
 return mesh.matrixWorld.clone().premultiply(frame.matrixWorld.clone().invert());
}
export function routingMatrix(mesh,frame){
 if(frame){frame.updateWorldMatrix?.(true,false);const m=frame.matrixWorld.elements,columns=[[m[0],m[1],m[2]],[m[4],m[5],m[6]],[m[8],m[9],m[10]]];
  if(columns.some(a=>Math.abs(len(a)-1)>1e-7)||Math.max(Math.abs(dot(columns[0],columns[1])),Math.abs(dot(columns[0],columns[2])),Math.abs(dot(columns[1],columns[2])))>1e-7)throw new Error('Routing reference frame must be rigid and metre-preserving');
 }
 return objectMatrixInFrame(mesh,frame);
}
const obstacleExtractionCache=new WeakMap(),tubeExtractionCache=new WeakMap(),tubeBendCache=new WeakMap();
const attributeArray=attribute=>attribute?.array||attribute?.data?.array;
function equalBuffer(actual,saved){if(!actual&&!saved)return true;if(!actual||!saved||actual.length!==saved.length)return false;for(let i=0;i<actual.length;i++)if(!Object.is(actual[i],saved[i]))return false;return true;}
function extractionMatches(entry,geometry,matrix,signature){return entry&&entry.geometry===geometry&&entry.position===geometry.attributes.position&&entry.index===geometry.index&&entry.signature===signature&&equalBuffer(matrix,entry.matrix)&&equalBuffer(attributeArray(geometry.attributes.position),entry.positions)&&equalBuffer(attributeArray(geometry.index),entry.indices);}
function freezeRecovered(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;for(const child of Object.values(value))freezeRecovered(child);return Object.freeze(value);}
function extractionEntry(geometry,matrix,signature,value){return {geometry,position:geometry.attributes.position,index:geometry.index,signature,matrix:Array.from(matrix),positions:attributeArray(geometry.attributes.position)?.slice(),indices:attributeArray(geometry.index)?.slice(),value:freezeRecovered(value)};}
/** Adapter for one real Three.js mesh. Rotated boxes remain oriented boxes. */
export function obstacleFromMesh(mesh,{id=mesh?.uuid,apertures=[],closed,frame}={}){
 if(!mesh?.geometry?.attributes?.position)throw new Error('Routing obstacle has no mesh position buffer: '+id);
 const geometry=mesh.geometry,m=routingMatrix(mesh,frame).elements,signature=JSON.stringify([geometry.type,geometry.parameters,mesh.isInstancedMesh]),prior=obstacleExtractionCache.get(mesh);
 let recovered;if(extractionMatches(prior,geometry,m,signature))recovered=prior.value;else{recovered=recoverObstacleFromMesh(mesh,{id:mesh.uuid},m);obstacleExtractionCache.set(mesh,extractionEntry(geometry,m,signature,recovered));}
 return {...recovered,id,apertures,...(recovered.type==='mesh'&&closed!==undefined?{closed}:{})};
}

function recoverObstacleFromMesh(mesh,{id=mesh?.uuid,apertures=[],closed,frame}={},matrixOverride=null){
 if(!mesh?.geometry?.attributes?.position)throw new Error('Routing obstacle has no mesh position buffer: '+id);
 const geometry=mesh.geometry,position=geometry.attributes.position,m=matrixOverride||routingMatrix(mesh,frame).elements;
 if(geometry.type==='BoxGeometry'&&!mesh.isInstancedMesh){
  geometry.computeBoundingBox();const localMin=geometry.boundingBox.min.toArray(),localMax=geometry.boundingBox.max.toArray(),columns=[[m[0],m[1],m[2]],[m[4],m[5],m[6]],[m[8],m[9],m[10]]],scales=columns.map(len),axes=columns.map(unit);
  if(scales.every(x=>x>EPS)&&Math.max(Math.abs(dot(axes[0],axes[1])),Math.abs(dot(axes[0],axes[2])),Math.abs(dot(axes[1],axes[2])))<1e-7){
   const center=transform(mul(add(localMin,localMax),.5),m),halfSize=sub(localMax,localMin).map((v,i)=>v*.5*scales[i]),corners=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])corners.push(add(add(add(center,mul(axes[0],x*halfSize[0])),mul(axes[1],y*halfSize[1])),mul(axes[2],z*halfSize[2])));
   return {id,type:'obb',center,axes,halfSize,bounds:boundsOf(corners),apertures,sourceMesh:mesh.uuid};
  }
 }
 if(geometry.type==='CylinderGeometry'&&!mesh.isInstancedMesh){const p=geometry.parameters,columns=[[m[0],m[1],m[2]],[m[4],m[5],m[6]],[m[8],m[9],m[10]]],scales=columns.map(len),axes=columns.map(unit);
  if(scales[1]<1e-12)axes[1]=unit(cross(axes[2],axes[0]));
  if(scales[0]>EPS&&scales[2]>EPS&&!p.openEnded&&Math.abs((p.thetaLength??Math.PI*2)-Math.PI*2)<1e-9&&Math.abs(p.radiusTop-p.radiusBottom)<1e-9&&Math.abs(scales[0]-scales[2])<1e-8&&Math.max(Math.abs(dot(axes[0],axes[1])),Math.abs(dot(axes[0],axes[2])),Math.abs(dot(axes[1],axes[2])))<1e-7){
   // Construction parameters do not track BufferAttribute edits. Enclose
   // every actual vertex; altered or translated cylinder buffers cannot hide
   // outside the old nominal cylinder, including without needsUpdate.
   let radial=0,low=Infinity,high=-Infinity;for(let i=0;i<position.count;i++){radial=Math.max(radial,Math.hypot(position.getX(i),position.getZ(i)));low=Math.min(low,position.getY(i));high=Math.max(high,position.getY(i));}
   const center=transform([0,(low+high)/2,0],m),radiusM=radial*scales[0],halfLengthM=(high-low)*scales[1]/2,axis=axes[1],extent=axis.map(v=>Math.abs(v)*halfLengthM+Math.sqrt(Math.max(0,1-v*v))*radiusM);
   return {id,type:'cylinder',center,axis,radiusM,halfLengthM,bounds:{min:sub(center,extent),max:add(center,extent)},apertures,sourceMesh:mesh.uuid};
  }
 }
 const vertices=[];for(let i=0;i<position.count;i++)vertices.push(transform([position.getX(i),position.getY(i),position.getZ(i)],m));
 const index=geometry.index,triangles=[],nondegenerate=[];
 if(mesh.isInstancedMesh)throw new Error('Instanced routing obstacles require one explicit instance mesh per physical obstacle: '+id);
 for(let i=0,n=index?.count??position.count;i+2<n;i+=3){const tri=[0,1,2].map(k=>vertices[index?index.getX(i+k):i+k]);triangles.push(tri);if(len(cross(sub(tri[1],tri[0]),sub(tri[2],tri[0])))>EPS)nondegenerate.push(tri);}
 if(!nondegenerate.length&&vertices.length){let a=vertices[0],b=a;for(const p of vertices)if(distance(p,a)>distance(b,a))b=p;for(const p of vertices)if(distance(p,b)>distance(a,b))a=p;let radiusM=1e-10;for(const p of vertices)radiusM=Math.max(radiusM,segmentSegmentDistance(p,p,a,b).distanceM+1e-10);const bounds=boundsOf([a,b]);return {id,type:'capsule',a:[...a],b:[...b],radiusM,bounds:{min:bounds.min.map(x=>x-radiusM),max:bounds.max.map(x=>x+radiusM)},apertures,sourceMesh:mesh.uuid,sourceGeometry:geometry.uuid,sourceVertices:vertices,degenerateGeometry:true};}
 return {id,type:'mesh',triangles,bounds:boundsOf(vertices),closed:closed??isClosedTriangles(nondegenerate),apertures,sourceMesh:mesh.uuid,sourceGeometry:geometry.uuid,sourceVertices:vertices};
}
export const obstaclesFromMeshes=(meshes,options={})=>meshes.map((mesh,i)=>obstacleFromMesh(mesh,{...options,id:options.idPrefix?options.idPrefix+i:mesh.uuid}));

function anchorRecord(value,frame){
 if(!value)return undefined;
 if(value.isObject3D){const m=routingMatrix(value,frame).elements;return {position:transform([0,0,0],m),normal:unit([m[8],m[9],m[10]])};}
 return {...value,position:xyz(value.position??value.positionM??value),...(value.normal?{normal:xyz(value.normal)}:{})};
}
function nominalBendMeasures(points,roundoffM=1e-12){
 // Remove only double-precision collinear noise before measuring curvature.
 // An absolute triangle-area cutoff would silently miss densely sampled
 // tight circles; use a relative angular threshold after this bounded screen.
 const stable=[];for(const point of points){stable.push(point);while(stable.length>=3){const a=stable.at(-3),b=stable.at(-2),c=stable.at(-1),d=sub(c,a),dd=dot(d,d),t=dd?dot(sub(b,a),d)/dd:-1;if(t<0||t>1||distance(b,lerp(a,c,t))>roundoffM)break;stable.splice(stable.length-2,1);}}
 let minimum=Infinity,maximumTurnRad=0;for(let i=1;i<stable.length-1;i++){const u=sub(stable[i],stable[i-1]),v=sub(stable[i+1],stable[i]),a=len(u),b=len(v);if(a<=roundoffM||b<=roundoffM)continue;const area2=len(cross(u,v)),uv=dot(u,v);maximumTurnRad=Math.max(maximumTurnRad,Math.atan2(area2,uv));if(area2<=64*Number.EPSILON*a*b){if(uv<0)minimum=0;continue;}minimum=Math.min(minimum,a*b*distance(stable[i-1],stable[i+1])/(2*area2));}
 return {minimumBendRadiusM:minimum,maximumTurnRad};
}
/** Recover ring centres from the actual drawn buffer, including cap corruption. */
export function routeFromTube(tube,options={}){
 const {frame,...recordOptions}=options;
 const mesh=tube.mesh||tube,geometry=mesh.geometry,position=geometry?.attributes?.position,uv=geometry?.attributes?.uv;
 if(!position)throw new Error('Routing tube has no mesh position buffer');mesh.updateWorldMatrix?.(true,false);
 const metadata=geometry.userData?.connection||geometry.userData?.routing||mesh.userData?.routing||{};
 let radialSegments=options.radialSegments??tube.radialSegments??metadata.radialSegments??geometry.userData.radialSegments??geometry.parameters?.radialSegments;
 let segments=options.segments??tube.segments??metadata.segments??geometry.userData.segments??geometry.parameters?.tubularSegments;
 if(!radialSegments&&uv){let stride=1;while(stride<position.count-2&&Math.abs(uv.getY(stride)-uv.getY(0))<1e-9)stride++;if(stride>2&&stride<position.count-2)radialSegments=stride-1;}
 const caps=geometry.userData.dynamicConnection?2:0;
 if(!segments&&radialSegments)segments=(position.count-caps)/(radialSegments+1)-1;
 if(!Number.isInteger(segments)||segments<1||!Number.isInteger(radialSegments)||radialSegments<3)throw new Error('Routing tube needs its actual segments/radialSegments metadata: '+(options.id||mesh.name));
 const stride=radialSegments+1,m=routingMatrix(mesh,frame).elements,signature=JSON.stringify([segments,radialSegments,caps,geometry.drawRange]);
 if(position.count!==(segments+1)*stride+caps)throw new Error('Routing tube buffer count does not match its rendered ring topology: '+(options.id||mesh.name));
 let recovered;const prior=tubeExtractionCache.get(mesh);
 if(extractionMatches(prior,geometry,m,signature))recovered=prior.value;else{
  const centres=[],points=[];let measuredRadiusM=0,seamMismatchM=0,endpointMismatchM=0,topologyMismatch=false;
  for(let i=0;i<=segments;i++){
   let centre=[0,0,0];const ring=[];for(let j=0;j<radialSegments;j++){const n=i*stride+j,p=transform([position.getX(n),position.getY(n),position.getZ(n)],m);ring.push(p);centre=add(centre,p);}centre=mul(centre,1/radialSegments);for(const p of ring)measuredRadiusM=Math.max(measuredRadiusM,distance(p,centre));centres.push(centre);points.push(centre);const seam=i*stride+radialSegments,seamPoint=transform([position.getX(seam),position.getY(seam),position.getZ(seam)],m);measuredRadiusM=Math.max(measuredRadiusM,distance(seamPoint,centre));seamMismatchM=Math.max(seamMismatchM,distance(seamPoint,ring[0]));
  }
  if(caps){for(const [pointIndex,n] of [[0,position.count-2],[segments,position.count-1]]){const cap=transform([position.getX(n),position.getY(n),position.getZ(n)],m);endpointMismatchM=Math.max(endpointMismatchM,distance(points[pointIndex],cap));points[pointIndex]=cap;}
   const index=geometry.index;let offset=0;const check=expected=>{if(!index||offset>=index.count||index.getX(offset)!==expected)topologyMismatch=true;offset++;};
   for(let i=0;i<segments;i++)for(let j=0;j<radialSegments;j++){const a=i*stride+j,b=a+stride;for(const n of [a,a+1,b,b,a+1,b+1])check(n);}
   const cap0=(segments+1)*stride,cap1=cap0+1;for(let j=0;j<radialSegments;j++){const n=segments*stride+j;for(const k of [cap0,j+1,j,cap1,n,n+1])check(k);}if(index?.count!==offset||geometry.drawRange?.start!==0||Number.isFinite(geometry.drawRange?.count)&&geometry.drawRange.count!==offset)topologyMismatch=true;
  }
  recovered={centres,points,measuredRadiusM,seamMismatchM,endpointMismatchM,topologyMismatch};tubeExtractionCache.set(mesh,extractionEntry(geometry,m,signature,recovered));
 }
 const scaleMaximum=Math.max(Math.hypot(m[0],m[1],m[2]),Math.hypot(m[4],m[5],m[6]),Math.hypot(m[8],m[9],m[10])),radiusM=Math.max(recovered.measuredRadiusM,(tube.radiusM||mesh.userData.physicalRadiusM||0)*scaleMaximum,options.radiusM||0);let renderedCenterlineMismatchM=recovered.topologyMismatch?Infinity:recovered.seamMismatchM;
 // Recovered geometry can be cached; current anchors and generator samples
 // still need checking. Altering a recipe without its displayed buffer fails.
 if(tube.pointAt)for(let i=0;i<=segments;i++){const expected=transform(tube.pointAt(i/segments,mesh.position.clone()).toArray(),m);renderedCenterlineMismatchM=Math.max(renderedCenterlineMismatchM,distance(recovered.centres[i],expected));}
 let nominalMinimumBendRadiusM=Infinity,nominalMaximumTurnRad=0,bendSamplingMismatchM=0,bendConstructionIssue;
 if(tube.route&&tube.pointAt){
  const source=tube.route.points,previous=tubeBendCache.get(mesh),valid=Array.isArray(source)&&source.length>=2&&source.length<=segments+1&&source.every(p=>finitePoint(xyz(p)));
  if(!valid){bendSamplingMismatchM=Infinity;bendConstructionIssue='invalid-original-bend-points';nominalMinimumBendRadiusM=0;}
  else{
   const unchanged=previous?.recovered===recovered&&source.length===previous.source.length&&source.every((p,i)=>xyz(p).every((x,k)=>Object.is(x,previous.source[i][k])));
   let checked=unchanged?previous:null;
   if(!checked){
    const originals=source.map(p=>[...xyz(p)]),origin=originals[0],physical=originals.map(p=>{const q=sub(p,origin);return [m[0]*q[0]+m[4]*q[1]+m[8]*q[2],m[1]*q[0]+m[5]*q[1]+m[9]*q[2],m[2]*q[0]+m[6]*q[1]+m[10]*q[2]];}),samples=sampleConnectionRoute(originals,segments,{preserveVertices:true}),roundoffM=1e-12+64*Number.EPSILON*Math.max(...originals.flat().map(Math.abs))*scaleMaximum;let mismatchM=0;
    for(let i=0;i<=segments;i++)mismatchM=Math.max(mismatchM,distance(recovered.centres[i],transform(samples[i],m)));
    checked={recovered,source:originals,...nominalBendMeasures(physical,roundoffM),mismatchM};tubeBendCache.set(mesh,checked);
   }
   nominalMinimumBendRadiusM=checked.minimumBendRadiusM;nominalMaximumTurnRad=checked.maximumTurnRad;bendSamplingMismatchM=checked.mismatchM;
   // A large unresolved corner is not a sampled circular fillet. The real
   // constructors use fine arc subdivisions; three arbitrary control points
   // must not obtain a bend certificate from their large circumcircle.
   if(nominalMaximumTurnRad>Math.PI/4+1e-7){bendConstructionIssue='unresolved-nominal-bend-corner';nominalMinimumBendRadiusM=0;}
  }
  renderedCenterlineMismatchM=Math.max(renderedCenterlineMismatchM,bendSamplingMismatchM);
 }
 return {...recordOptions,id:options.id||mesh.userData.routingId||mesh.userData.electricalHarnessId||mesh.uuid,points:recovered.points.map(p=>[...p]),radiusM,minBendRadiusM:options.minBendRadiusM??metadata.minBendRadiusM??tube.minBendRadiusM??tube.bendRadiusM??geometry.userData?.bendRadiusM,minimumBendRadiusM:Math.min(tube.route?.minimumBendRadiusM??Infinity,options.minimumBendRadiusM??Infinity,nominalMinimumBendRadiusM),nominalMinimumBendRadiusM,nominalMaximumTurnRad,bendSamplingMismatchM,bendConstructionIssue,bendRadiusBasis:tube.route&&tube.pointAt?'constructed-circular-fillets':undefined,renderedEndpointMismatchM:recovered.endpointMismatchM,renderedCenterlineMismatchM,renderedTopologyMismatch:recovered.topologyMismatch,from:anchorRecord(options.from,frame),to:anchorRecord(options.to,frame)};
}

/** Circumcircle curvature screen of the drawn centreline, preserving reversals. */
export function minimumPolylineBendRadius(points){
 let minimum=Infinity;for(let i=1;i<points.length-1;i++){const u=sub(points[i],points[i-1]),v=sub(points[i+1],points[i]),a=len(u),b=len(v);if(a<EPS||b<EPS)continue;const area2=len(cross(u,v));if(area2<EPS){if(dot(u,v)<0)minimum=0;continue;}minimum=Math.min(minimum,a*b*distance(points[i-1],points[i+1])/(2*area2));}return minimum;
}
function boxInterval(a,b,min,max){
 let lo=0,hi=1;for(let k=0;k<3;k++){const d=b[k]-a[k];if(Math.abs(d)<EPS){if(a[k]<min[k]||a[k]>max[k])return null;}else{let x=(min[k]-a[k])/d,y=(max[k]-a[k])/d;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);if(hi<lo)return null;}}return [lo,hi];
}
function validAperture(aperture){
 if(!aperture?.id||!Array.isArray(aperture.routeIds)||!aperture.routeIds.length||aperture.routeIds.some(id=>typeof id!=='string'||!id))return false;
 if(aperture.axes!==undefined)return finitePoint(aperture.center)&&finitePoint(aperture.halfSize)&&aperture.halfSize.every(v=>v>0)&&Array.isArray(aperture.axes)&&aperture.axes.length===3&&aperture.axes.every(finitePoint)&&aperture.axes.every(a=>Math.abs(len(a)-1)<=1e-7)&&aperture.axes.every((a,i)=>aperture.axes.every((b,j)=>i===j||Math.abs(dot(a,b))<=1e-7));
 return finitePoint(aperture.min)&&finitePoint(aperture.max)&&aperture.min.every((v,i)=>v<aperture.max[i]);
}
const aperturePoint=(aperture,p)=>aperture.axes?aperture.axes.map(axis=>dot(sub(p,aperture.center),axis)):p;
const apertureBounds=aperture=>aperture.axes?{min:aperture.halfSize.map(v=>-v),max:aperture.halfSize}:{min:aperture.min,max:aperture.max};
function outsideApertures(a,b,route,obstacle,radius){
 let intervals=[[0,1]];
 for(const aperture of obstacle.apertures||[]){
  // A hole belongs to one exact obstacle and an explicit list of routes.
  // Shrinking the throat ensures the full tube, not merely its axis, fits.
  if(!aperture.routeIds?.includes(route.id)||!validAperture(aperture))continue;
  const bounds=apertureBounds(aperture),min=bounds.min.map(v=>v+radius),max=bounds.max.map(v=>v-radius);if(min.some((v,i)=>v>=max[i]))continue;
  const hole=boxInterval(aperturePoint(aperture,a),aperturePoint(aperture,b),min,max);if(!hole)continue;
  intervals=intervals.flatMap(([lo,hi])=>hole[1]<=lo||hole[0]>=hi?[[lo,hi]]:[...(hole[0]>lo?[[lo,hole[0]]]:[]),...(hole[1]<hi?[[hole[1],hi]]:[])]);
 }
 return intervals.filter(([a,b])=>b-a>EPS).map(([lo,hi])=>[lerp(a,b,lo),lerp(a,b,hi)]);
}
function apertureMotionMargin(a,b,route,obstacle,radius){
 const apertures=(obstacle.apertures||[]).filter(p=>p.routeIds?.includes(route.id));if(!apertures.length||solidDistance(a,b,obstacle)>radius)return Infinity;
 // A terminal contact/port permission is itself a moving geometric boundary.
 // Clearance to that boundary must participate in continuous certification;
 // otherwise a wholly exempt segment would have infinite apparent clearance
 // and could leave its narrow throat unnoticed between sampled poses.
 const potential=boxInterval(a,b,obstacle.bounds.min.map(x=>x-radius),obstacle.bounds.max.map(x=>x+radius));if(!potential)return Infinity;
 const contact=f=>{let lo=potential[0],hi=potential[1];for(let i=0;i<44;i++){const x=lo+(hi-lo)/3,y=hi-(hi-lo)/3;if(f(x)<f(y))hi=y;else lo=x;}const middle=(lo+hi)/2,limit=radius+1e-8+distance(a,b)*(hi-lo);let entry=potential[0],exit=potential[1];if(f(entry)>limit){let l=entry,h=middle;for(let i=0;i<44;i++){const t=(l+h)/2;if(f(t)>limit)l=t;else h=t;}entry=Math.max(potential[0],l-1e-10);}if(f(exit)>limit){let l=middle,h=exit;for(let i=0;i<44;i++){const t=(l+h)/2;if(f(t)>limit)h=t;else l=t;}exit=Math.min(potential[1],h+1e-10);}return [entry,exit];};
 let intervals;
 if(obstacle.type==='mesh'){
  // A nonconvex mesh's AABB contains free space. Retain the complete union
  // of real material-contact intervals: each triangle is convex, while
  // closed-solid interior intervals are found between all ray crossings.
  // Bounding those intervals by a throat does not invent an infinite axial
  // tunnel through unrelated parts of the same engine or panel mesh.
  intervals=[];for(const triangle of nearbyTriangles(a,b,obstacle,radius+1e-8))if(segmentTriangleDistance(a,b,triangle)<=radius+1e-8)intervals.push(contact(t=>{const p=lerp(a,b,t);return segmentTriangleDistance(p,p,triangle);}));
  if(obstacle.closed)for(const component of meshContainment(obstacle.triangles).components)if(component.conservative&&segmentBoxDistance(a,b,component.bounds.min,component.bounds.max).distanceM<=radius+1e-8)intervals.push(contact(t=>{const p=lerp(a,b,t);return segmentBoxDistance(p,p,component.bounds.min,component.bounds.max).distanceM;}));
  if(obstacle.closed){const cuts=[...potential],delta=sub(b,a);for(const triangle of rayTriangles(a,delta,obstacle)){const t=rayTriangle(a,delta,...triangle);if(t!==null&&t>potential[0]&&t<potential[1])cuts.push(t);}cuts.sort((x,y)=>x-y);for(let i=1;i<cuts.length;i++)if(cuts[i]-cuts[i-1]>1e-12&&pointInsideMesh(lerp(a,b,(cuts[i]+cuts[i-1])/2),obstacle))intervals.push([cuts[i-1],cuts[i]]);}
  if(!intervals.length)return 0;
 }else intervals=[contact(t=>{const p=lerp(a,b,t);return solidDistance(p,p,obstacle);})];
 let margin=Infinity;for(const interval of intervals){const ends=interval.map(t=>lerp(a,b,t));let covered=0;for(const p of apertures){if(!validAperture(p))continue;const bounds=apertureBounds(p);let value=Infinity;for(const end of ends){const point=aperturePoint(p,end);for(let k=0;k<3;k++)value=Math.min(value,point[k]-bounds.min[k]-radius,bounds.max[k]-radius-point[k]);}covered=Math.max(covered,value);}margin=Math.min(margin,covered);}return margin;
}
// BEGIN owned obstacle signature provenance
// Production Node certifiers may explicitly admit complete immutable data
// copies. Browser/worker callers retain the original fallback when effect-free
// native Proxy/exotic brand guards are unavailable. No trust registrar is public.
// This optional synchronous lookup introduces no Node module import or loader.
const routingSnapshotNodeTypes = (() => {
  try {
    const host=globalThis.process;
    if(!host || host.release?.name!=='node' || typeof host.getBuiltinModule!=='function')return null;
    const types=host.getBuiltinModule('node:util')?.types, captured={};
    if(!types)return null;
    for(const name of ['isProxy','isMap','isAnyArrayBuffer','isArrayBufferView','isArgumentsObject','isBoxedPrimitive',
      'isDate','isMapIterator','isModuleNamespaceObject','isNativeError','isPromise','isRegExp','isSet','isSetIterator',
      'isWeakMap','isWeakSet','isGeneratorObject','isExternal','isKeyObject','isCryptoKey']){
      const guard=types[name];if(typeof guard==='function')captured[name]=guard;
    }
    if(typeof captured.isProxy!=='function'||typeof captured.isMap!=='function')return null;
    return captured;
  } catch { return null; }
})();
const routingSnapshotApply = Reflect.apply;
const routingSnapshotOwnKeys = Reflect.ownKeys;
const routingSnapshotGetDescriptor = Object.getOwnPropertyDescriptor;
const routingSnapshotGetDescriptors = Object.getOwnPropertyDescriptors;
const routingSnapshotGetPrototype = Object.getPrototypeOf;
const routingSnapshotDefine = Object.defineProperty;
const routingSnapshotCreate = Object.create;
const routingSnapshotFreeze = Object.freeze;
const routingSnapshotIsArray = Array.isArray;
const routingSnapshotObjectPrototype = Object.prototype;
const routingSnapshotArrayPrototype = Array.prototype;
const routingSnapshotObjectToString = Object.prototype.toString;
const routingSnapshotFunctionToString = Function.prototype.toString;
const routingSnapshotHasOwnMethod = Object.prototype.hasOwnProperty;
const routingSnapshotHasOwn = (value,key) => routingSnapshotApply(routingSnapshotHasOwnMethod,value,[key]);
const routingSnapshotWeakMapGet = (map, key) => routingSnapshotApply(routingSnapshotWeakMapGetMethod, map, [key]);
const routingSnapshotWeakMapSet = (map, key, value) => routingSnapshotApply(routingSnapshotWeakMapSetMethod, map, [key, value]);
const routingSnapshotWeakSetHas = (set, key) => routingSnapshotApply(routingSnapshotWeakSetHasMethod, set, [key]);
const routingSnapshotWeakSetAdd = (set, key) => routingSnapshotApply(routingSnapshotWeakSetAddMethod, set, [key]);
const routingSnapshotWeakMapGetMethod = WeakMap.prototype.get;
const routingSnapshotWeakMapSetMethod = WeakMap.prototype.set;
const routingSnapshotWeakSetHasMethod = WeakSet.prototype.has;
const routingSnapshotWeakSetAddMethod = WeakSet.prototype.add;
const routingSnapshotWeakMapConstructor = WeakMap;
const routingSnapshotWeakSetConstructor = WeakSet;
const routingSnapshotOrigins = new routingSnapshotWeakMapConstructor();
const routingSnapshotOwnedNodes = new routingSnapshotWeakSetConstructor();
const routingSnapshotSignatureFields = ['type','bounds','min','max','center','axes','halfSize','axis','radiusM','halfLengthM','a','b','triangles','closed','apertures'];
const routingSnapshotKinds = ['box','obb','capsule','cylinder'];
const routingSnapshotExoticTests = [
  'isAnyArrayBuffer','isArrayBufferView','isArgumentsObject','isBoxedPrimitive',
  'isDate','isMap','isMapIterator','isModuleNamespaceObject','isNativeError',
  'isPromise','isRegExp','isSet','isSetIterator','isWeakMap','isWeakSet',
  'isGeneratorObject','isExternal','isKeyObject','isCryptoKey',
].map(name => routingSnapshotNodeTypes?.[name]).filter(test => typeof test === 'function');
const routingSnapshotIsProxy = routingSnapshotNodeTypes?.isProxy;

function routingSnapshotSameDescriptor(a, b) {
  if(a===undefined)return b===undefined;
  if(b===undefined)return false;
  const fields=['value','get','set','writable','enumerable','configurable'];
  for(let i=0;i<fields.length;i++){
    const field=fields[i],left=routingSnapshotHasOwn(a,field),right=routingSnapshotHasOwn(b,field);
    if(left!==right || (left && a[field]!==b[field]))return false;
  }
  return true;
}
const routingSnapshotPrototypeStates = [routingSnapshotObjectPrototype, routingSnapshotArrayPrototype].map(object => ({
  object, prototype: routingSnapshotGetPrototype(object), keys: routingSnapshotOwnKeys(object), descriptors: routingSnapshotGetDescriptors(object),
}));
const routingSnapshotWatchedProperties = [
  [globalThis,'JSON'],[globalThis,'Object'],[globalThis,'Array'],[globalThis,'Number'],[globalThis,'Math'],
  [JSON,'stringify'],[Array,'isArray'],[Object,'isFrozen'],[Number,'isFinite'],[Math,'min'],[Math,'max'],
  // A hit looks up the existing native entry before the original expression.
  // That lookup must not become a caller-controlled Map getter or method.
  [Map.prototype,'get'],
].map(([object,key]) => ({object,key,descriptor:routingSnapshotGetDescriptor(object,key)}));
const routingSnapshotNativeFunctions = [JSON.stringify, Array.isArray, Object.isFrozen, Number.isFinite,
  Math.min, Math.max, Array.prototype.map, Array.prototype.every, Array.prototype[Symbol.iterator], Map.prototype.get];
const routingSnapshotBaselinePlain = routingSnapshotGetPrototype(routingSnapshotObjectPrototype) === null &&
  routingSnapshotGetPrototype(routingSnapshotArrayPrototype) === routingSnapshotObjectPrototype &&
  !routingSnapshotGetDescriptor(routingSnapshotObjectPrototype,'toJSON') && !routingSnapshotGetDescriptor(routingSnapshotArrayPrototype,'toJSON') &&
  !routingSnapshotGetDescriptor(routingSnapshotObjectPrototype,'toArray') &&
  routingSnapshotSignatureFields.every(key => !routingSnapshotGetDescriptor(routingSnapshotObjectPrototype,key)) &&
  routingSnapshotNativeFunctions.every(fn => routingSnapshotApply(routingSnapshotFunctionToString,fn,[]).includes('[native code]'));

function routingSnapshotEnvironmentOkay() {
  if (!routingSnapshotNodeTypes || !routingSnapshotBaselinePlain) return false;
  for (let i=0;i<routingSnapshotWatchedProperties.length;i++) {
    const state=routingSnapshotWatchedProperties[i];
    if (!routingSnapshotSameDescriptor(state.descriptor,routingSnapshotGetDescriptor(state.object,state.key))) return false;
  }
  for (let i=0;i<routingSnapshotPrototypeStates.length;i++) {
    const state=routingSnapshotPrototypeStates[i];
    if (routingSnapshotGetPrototype(state.object)!==state.prototype) return false;
    const keys=routingSnapshotOwnKeys(state.object);
    if (keys.length!==state.keys.length) return false;
    for (let j=0;j<keys.length;j++) {
      const key=keys[j];
      if (key!==state.keys[j] || !routingSnapshotSameDescriptor(state.descriptors[key],routingSnapshotGetDescriptor(state.object,key))) return false;
    }
  }
  return true;
}

// The skipped expression has a smaller dependency set than normalization.
// Owned roots have own string id/type and only absent/undefined triangles, so
// triangleCacheKey reaches just Array.isArray and returns undefined. Dense
// arrays and own-data descendants need only the inherited toJSON checks.
const routingSnapshotSignatureWatched = [
  [globalThis,'JSON'],[globalThis,'Array'],[JSON,'stringify'],[Array,'isArray'],[Map.prototype,'get'],
].map(([object,key])=>({object,key,descriptor:routingSnapshotGetDescriptor(object,key)}));
function routingSnapshotSignatureEnvironmentOkay(origin){
  if(!routingSnapshotBaselinePlain || routingSnapshotGetPrototype(routingSnapshotObjectPrototype)!==null || routingSnapshotGetPrototype(routingSnapshotArrayPrototype)!==routingSnapshotObjectPrototype ||
      routingSnapshotGetDescriptor(routingSnapshotObjectPrototype,'toJSON') || routingSnapshotGetDescriptor(routingSnapshotArrayPrototype,'toJSON'))return false;
  for(let i=0;i<routingSnapshotSignatureWatched.length;i++){
    const state=routingSnapshotSignatureWatched[i];
    if(!routingSnapshotSameDescriptor(state.descriptor,routingSnapshotGetDescriptor(state.object,state.key)))return false;
  }
  if(origin.objectPrototype)for(let i=0;i<origin.missing.length;i++)if(routingSnapshotGetDescriptor(routingSnapshotObjectPrototype,origin.missing[i]))return false;
  return true;
}
function routingSnapshotMakeOrigin(object,key,normalKey,shape){
  const missing=[];for(let i=0;i<routingSnapshotSignatureFields.length;i++)if(!routingSnapshotGetDescriptor(object,routingSnapshotSignatureFields[i]))missing.push(routingSnapshotSignatureFields[i]);
  return routingSnapshotFreeze({key,normalKey,shape,missing:routingSnapshotFreeze(missing),objectPrototype:routingSnapshotGetPrototype(object)===routingSnapshotObjectPrototype});
}

class routingSnapshotUnsupported extends Error { constructor(reason) { super(reason); this.reason=reason; } }

// Descriptor inspection never evaluates caller accessors. Every produced node
// is an ordinary object/array created here. Known native JSON-special brands,
// proxies, symbols, functions, BigInts, cycles and nonstandard properties are
// rejected; an unsupported source is returned exactly as supplied.
function routingSnapshotPlan(value, plans, active, nodes, allowOwned=false) {
  if (value===null || typeof value!=='object') {
    if (typeof value==='function'||typeof value==='symbol'||typeof value==='bigint') throw new routingSnapshotUnsupported('non-data-value');
    return {primitive:true,value};
  }
  if (allowOwned && routingSnapshotWeakSetHas(routingSnapshotOwnedNodes,value)) return {primitive:true,value};
  if (routingSnapshotIsProxy(value)) throw new routingSnapshotUnsupported('proxy');
  if (routingSnapshotWeakSetHas(active,value)) throw new routingSnapshotUnsupported('cycle');
  const prior=routingSnapshotWeakMapGet(plans,value);if(prior)return prior;
  const array=routingSnapshotIsArray(value), prototype=routingSnapshotGetPrototype(value);
  if (array ? prototype!==routingSnapshotArrayPrototype : prototype!==routingSnapshotObjectPrototype && prototype!==null) throw new routingSnapshotUnsupported('prototype');
  const descriptors=routingSnapshotGetDescriptors(value), keys=routingSnapshotOwnKeys(descriptors);
  if (routingSnapshotGetDescriptor(value,'toJSON')) throw new routingSnapshotUnsupported('serialization-hook');
  for (let i=0;i<keys.length;i++) {
    const key=keys[i],descriptor=descriptors[key];
    if (typeof key!=='string'||!routingSnapshotGetDescriptor(descriptor,'value')||(!descriptor.enumerable&&!(array&&key==='length'))) throw new routingSnapshotUnsupported('non-data-property');
  }
  if (!array) {
    for (let i=0;i<routingSnapshotExoticTests.length;i++) if (routingSnapshotExoticTests[i](value)) throw new routingSnapshotUnsupported('native-exotic');
    if (routingSnapshotApply(routingSnapshotObjectToString,value,[])!=='[object Object]') throw new routingSnapshotUnsupported('native-exotic');
  } else {
    const length=descriptors.length.value;
    if(keys.length!==length+1)throw new routingSnapshotUnsupported('sparse-or-extra-array-property');
    for(let i=0;i<length;i++)if(keys[i]!==i+'')throw new routingSnapshotUnsupported('sparse-or-extra-array-property');
    if(keys[length]!=='length')throw new routingSnapshotUnsupported('array-length');
  }
  const node={source:value,array,prototype,keys,descriptors,children:[]};
  routingSnapshotWeakMapSet(plans,value,node);routingSnapshotWeakSetAdd(active,value);
  nodes.push(node);
  for(let i=0;i<keys.length;i++)if(!(array&&keys[i]==='length'))node.children.push([keys[i],routingSnapshotPlan(descriptors[keys[i]].value,plans,active,nodes,allowOwned)]);
  // Remove completed nodes from this traversal's active set so shared
  // descendants are not mistaken for cycles.
  routingSnapshotApply(routingSnapshotWeakSetDeleteMethod,active,[value]);
  return node;
}
const routingSnapshotWeakSetDeleteMethod = WeakSet.prototype.delete;

function routingSnapshotCreateOwnedObstacleSnapshot(original) {
  // Without trusted native guards, return before touching caller data or traps.
  if (!routingSnapshotNodeTypes || !routingSnapshotEnvironmentOkay()) return original;
  const existing=routingSnapshotWeakMapGet(routingSnapshotOrigins,original);
  if(existing)return original;
  try {
    if(!original||typeof original!=='object'||routingSnapshotIsProxy(original))return original;
    const type=routingSnapshotGetDescriptor(original,'type');
    if(!type||!routingSnapshotHasOwn(type,'value')||typeof type.value!=='string'||!routingSnapshotKinds.includes(type.value))return original;
    const id=routingSnapshotGetDescriptor(original,'id');
    if(!id||!routingSnapshotHasOwn(id,'value')||typeof id.value!=='string')return original;
    const triangles=routingSnapshotGetDescriptor(original,'triangles');
    if(triangles&&(!routingSnapshotHasOwn(triangles,'value')||triangles.value!==undefined))return original;
    const nodes=[],plan=routingSnapshotPlan(original,new routingSnapshotWeakMapConstructor(),new routingSnapshotWeakSetConstructor(),nodes);
    if(plan.array)return original;
    const copies=new routingSnapshotWeakMapConstructor();
    function copy(node){
      if(node.primitive)return node.value;
      const old=routingSnapshotWeakMapGet(copies,node.source);if(old)return old;
      const value=node.array?[]:routingSnapshotCreate(node.prototype);routingSnapshotWeakMapSet(copies,node.source,value);
      for(let i=0;i<node.children.length;i++){const [key,child]=node.children[i];routingSnapshotDefine(value,key,{value:copy(child),enumerable:true,writable:true,configurable:true});}
      return routingSnapshotFreeze(value);
    }
    const result=copy(plan);
    if(!routingSnapshotEnvironmentOkay())return original;
    // No trust is published until every descendant is copied and frozen.
    for(let i=0;i<nodes.length;i++)routingSnapshotWeakSetAdd(routingSnapshotOwnedNodes,routingSnapshotWeakMapGet(copies,nodes[i].source));
    const rawKey=routingSnapshotFreeze({}),normalKey=routingSnapshotFreeze({});
    routingSnapshotWeakMapSet(routingSnapshotOrigins,result,routingSnapshotMakeOrigin(result,rawKey,normalKey,type.value));
    return result;
  } catch { return original; }
}
function routingSnapshotOwnObstacleList(obstacles) { return obstacles.map(routingSnapshotCreateOwnedObstacleSnapshot); }

// This registrar is private to this canonical routing runtime. The native
// normalizer, and only that normalizer, supplies its result here. Raw and
// canonical-normalized representations deliberately use different identities.
function routingSnapshotFinishNormalization(original,normalized,origin) {
  if(normalized===original)return normalized;
  try {
    if(!routingSnapshotEnvironmentOkay())return normalized;
    const nodes=[];routingSnapshotPlan(normalized,new routingSnapshotWeakMapConstructor(),new routingSnapshotWeakSetConstructor(),nodes,true);
    for(let i=nodes.length-1;i>=0;i--)routingSnapshotFreeze(nodes[i].source);
    if(!routingSnapshotEnvironmentOkay())return normalized;
    for(let i=0;i<nodes.length;i++)routingSnapshotWeakSetAdd(routingSnapshotOwnedNodes,nodes[i].source);
    routingSnapshotWeakMapSet(routingSnapshotOrigins,normalized,routingSnapshotMakeOrigin(normalized,origin.normalKey,origin.normalKey,origin.shape));
  } catch { /* Retain the native normalized result without trusted provenance. */ }
  return normalized;
}
function routingSnapshotOwnedOrigin(obstacle) {
  const origin=routingSnapshotWeakMapGet(routingSnapshotOrigins,obstacle);
  return origin&&routingSnapshotSignatureEnvironmentOkay(origin)?origin:null;
}

export {
  routingSnapshotCreateOwnedObstacleSnapshot as createOwnedRoutingObstacleSnapshot,
  routingSnapshotOwnObstacleList as ownRoutingObstacleList,
};
// END owned obstacle signature provenance

function normalizeObstacleNative(o){
 if(!o||typeof o!=='object')return o;
 if(o.type==='capsule'&&!o.bounds&&finitePoint(xyz(o.a))&&finitePoint(xyz(o.b))&&Number.isFinite(o.radiusM)){const b=boundsOf([xyz(o.a),xyz(o.b)]);return {...o,a:xyz(o.a),b:xyz(o.b),bounds:{min:b.min.map(v=>v-o.radiusM),max:b.max.map(v=>v+o.radiusM)}};}
 if(o.type==='box'||(!o.type&&o.min&&o.max))return {...o,type:'box',bounds:{min:o.min,max:o.max}};
 if(o.type==='mesh'&&!o.bounds&&Array.isArray(o.triangles)&&o.triangles.every(t=>Array.isArray(t)&&t.every(finitePoint)))return {...o,bounds:boundsOf(o.triangles.flat())};return o;
}
function normalizeObstacle(o){
 const origin=routingSnapshotWeakMapGet(routingSnapshotOrigins,o);
 if(origin&&(origin.shape==='obb'||origin.shape==='cylinder'))return normalizeObstacleNative(o);
 const eligible=origin&&routingSnapshotEnvironmentOkay()?origin:null;
 const normalized=normalizeObstacleNative(o);
 return eligible?routingSnapshotFinishNormalization(o,normalized,eligible):normalized;
}
function solidDistance(a,b,o){
 if(o.type==='capsule')return Math.max(0,segmentSegmentDistance(a,b,xyz(o.a),xyz(o.b)).distanceM-o.radiusM);
 if(o.type==='box')return segmentBoxDistance(a,b,o.min,o.max).distanceM;
 if(o.type==='obb'){const project=p=>o.axes.map(axis=>dot(sub(p,o.center),axis));return segmentBoxDistance(project(a),project(b),o.halfSize.map(v=>-v),o.halfSize).distanceM;}
 if(o.type==='cylinder'){
  const f=t=>{const p=sub(lerp(a,b,t),o.center),y=dot(p,o.axis),radial=Math.sqrt(Math.max(0,dot(p,p)-y*y));return Math.hypot(Math.max(0,radial-o.radiusM),Math.max(0,Math.abs(y)-o.halfLengthM));};
  // Distance to this convex solid is convex along a segment. The remaining
  // interval diameter bounds minimization error and is subtracted, so the
  // numerical solver cannot overstate available clearance.
  if(distance(a,b)<1e-12)return f(0);let lo=0,hi=1;for(let i=0;i<52;i++){const p=lo+(hi-lo)/3,q=hi-(hi-lo)/3;if(f(p)<f(q))hi=q;else lo=p;}return Math.max(0,Math.min(f(0),f(1),f((lo+hi)/2))-distance(a,b)*(hi-lo));
 }
 if(o.type==='mesh'){
  if(pointInsideMesh(a,o)||pointInsideMesh(b,o))return 0;
  let enclosure=Infinity;if(o.closed)for(const component of meshContainment(o.triangles).components)if(component.conservative){enclosure=Math.min(enclosure,segmentBoxDistance(a,b,component.bounds.min,component.bounds.max).distanceM);if(enclosure<EPS)return enclosure;}
  return Math.min(enclosure,meshSurfaceDistance(a,b,o));
 }
 return NaN;
}

/** Planner helper: signed surface clearance of a finite-radius segment. */
export function segmentObstacleClearance(a,b,obstacle,{radiusM=0,clearanceM=0,routeId}={}){
 const o=normalizeObstacle(obstacle),required=radiusM+clearanceM;if(!o?.bounds)return NaN;
 let minimum=Infinity;for(const [x,y] of outsideApertures(xyz(a),xyz(b),{id:routeId},o,required))minimum=Math.min(minimum,solidDistance(x,y,o)-required);return minimum;
}

const planningSolidIndexes=new WeakMap(),planningLineIndexes=new WeakMap(),planningMeshBounds=new WeakMap(),planningMeshValidity=new WeakMap();
function planningSolid(original){
 const o=normalizeObstacle(original);if(!o||!['box','obb','mesh','cylinder','capsule'].includes(o.type))return null;let bounds;
 if(o.type==='box'){if(!finitePoint(o.min)||!finitePoint(o.max))return null;bounds={min:o.min,max:o.max};}
 if(o.type==='capsule'){const a=xyz(o.a),b=xyz(o.b);if(!finitePoint(a)||!finitePoint(b)||!Number.isFinite(o.radiusM)||o.radiusM<0)return null;const q=boundsOf([a,b]);bounds={min:q.min.map(x=>x-o.radiusM),max:q.max.map(x=>x+o.radiusM)};}
 if(o.type==='obb'){if(!finitePoint(o.center)||!Array.isArray(o.axes)||o.axes.length!==3||!o.axes.every(finitePoint)||!finitePoint(o.halfSize)||o.halfSize.some(x=>x<0)||o.axes.some(a=>Math.abs(len(a)-1)>1e-6)||o.axes.some((a,i)=>o.axes.some((b,j)=>i!==j&&Math.abs(dot(a,b))>1e-6)))return null;const extent=[0,1,2].map(k=>o.axes.reduce((sum,a,i)=>sum+Math.abs(a[k])*o.halfSize[i],0));bounds={min:sub(o.center,extent),max:add(o.center,extent)};}
 if(o.type==='cylinder'){if(!finitePoint(o.center)||!finitePoint(o.axis)||Math.abs(len(o.axis)-1)>1e-6||!Number.isFinite(o.radiusM)||o.radiusM<0||!Number.isFinite(o.halfLengthM)||o.halfLengthM<0)return null;const extent=o.axis.map(v=>Math.abs(v)*o.halfLengthM+Math.sqrt(Math.max(0,1-v*v))*o.radiusM);bounds={min:sub(o.center,extent),max:add(o.center,extent)};}
 if(o.type==='mesh'){
  const triangles=o.triangles;if(!Array.isArray(triangles)||!triangles.length)return null;let immutable=planningMeshValidity.get(triangles);
  if(immutable===undefined){const valid=triangles.every(t=>Array.isArray(t)&&t.length===3&&t.every(finitePoint));if(!valid)return null;immutable=Object.isFrozen(triangles)&&triangles.every(t=>Object.isFrozen(t)&&t.every(Object.isFrozen));if(immutable)planningMeshValidity.set(triangles,true);}
  if(immutable&&planningMeshBounds.has(triangles))bounds=planningMeshBounds.get(triangles);else{bounds=boundsOf(triangles.flat());if(immutable)planningMeshBounds.set(triangles,bounds);}
 }
 if(!bounds||!finitePoint(bounds.min)||!finitePoint(bounds.max)||bounds.min.some((v,i)=>v>bounds.max[i]))return null;
 if((o.apertures||[]).some(a=>!validAperture(a)))return null;
 return {...o,bounds};
}
function planningIndex(items,key,cache){
 const coordinates=items.flatMap(item=>[...item.bounds.min,...item.bounds.max]),previous=cache.get(key);if(previous&&equalBuffer(coordinates,previous.coordinates))return previous.tree;
 function build(rows){const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};for(const row of rows)for(let k=0;k<3;k++){bounds.min[k]=Math.min(bounds.min[k],row.bounds.min[k]);bounds.max[k]=Math.max(bounds.max[k],row.bounds.max[k]);}if(rows.length<=8)return {bounds,indices:rows.map(row=>row.index)};const axis=[0,1,2].sort((a,b)=>(bounds.max[b]-bounds.min[b])-(bounds.max[a]-bounds.min[a]))[0];rows.sort((a,b)=>(a.bounds.min[axis]+a.bounds.max[axis])-(b.bounds.min[axis]+b.bounds.max[axis]));const middle=rows.length>>1;return {bounds,left:build(rows.slice(0,middle)),right:build(rows.slice(middle))};}
 const tree=items.length?build(items.map((item,index)=>({bounds:item.bounds,index}))):null;cache.set(key,{coordinates,tree});return tree;
}
function planningQuery(tree,items,bounds,radius,far,near){
 if(!tree)return true;const stack=[tree];while(stack.length){const node=stack.pop(),lower=boxesDistance(bounds,node.bounds)-radius;if(lower>1e-7){far(lower);continue;}if(node.indices){for(const index of node.indices){const item=items[index],distance=boxesDistance(bounds,item.bounds)-radius;if(distance>1e-7)far(distance);else if(near(item)===false)return false;}}else{const a=boxesDistance(bounds,node.left.bounds),b=boxesDistance(bounds,node.right.bounds);if(a<b)stack.push(node.right,node.left);else stack.push(node.left,node.right);}}return true;
}
/** Efficient planning screen; exact possible contacts, conservative finite far bounds. */
export function routeClearance(route,obstacles,{otherRoutes=[],stopAtCollision=true,clearanceM=0}={}){
 const invalid=(details={})=>({ok:false,minimumClearanceM:NaN,clearanceM:NaN,reason:'invalid-planning-geometry',...details});
 if(!Array.isArray(obstacles)||!Array.isArray(otherRoutes)||!Array.isArray(route?.points)||route.points.length<2||!route.points.every(p=>finitePoint(xyz(p)))||!Number.isFinite(route.radiusM)||route.radiusM<0||!Number.isFinite(route.clearanceM??clearanceM)||(route.clearanceM??clearanceM)<0)return invalid({routeId:route?.id});
 const required=route.radiusM+(route.clearanceM??clearanceM),solids=[];for(const original of obstacles){const o=planningSolid(original);if(!o)return invalid({obstacleId:original?.id});solids.push(o);}
 const occupied=[];for(const other of otherRoutes){if(!Array.isArray(other?.points)||other.points.length<2||!other.points.every(p=>finitePoint(xyz(p)))||!Number.isFinite(other.radiusM)||other.radiusM<0||!Number.isFinite(other.clearanceM??0)||(other.clearanceM??0)<0)return invalid({otherRouteId:other?.id});const expansion=other.radiusM+(other.clearanceM??0);for(const [index,segment]of segmentsOf(other).entries())occupied.push({other,index,...segment,bounds:{min:segment.bounds.min.map(x=>x-expansion),max:segment.bounds.max.map(x=>x+expansion)}});}
 const solidTree=planningIndex(solids,obstacles,planningSolidIndexes),lineTree=planningIndex(occupied,otherRoutes,planningLineIndexes),segments=segmentsOf(route);let minimumClearanceM=Infinity,failure=null;
 const far=value=>{minimumClearanceM=Math.min(minimumClearanceM,value);};
 for(let i=0;i<segments.length;i++){
  const {a,b,bounds}=segments[i];if(!planningQuery(solidTree,solids,bounds,required,far,o=>{const value=segmentObstacleClearance(a,b,o,{radiusM:route.radiusM,clearanceM:route.clearanceM??clearanceM,routeId:route.id});far(value);if(!Number.isFinite(value)&&value!==Infinity||value<-1e-7){failure={ok:false,minimumClearanceM:value,clearanceM:value,obstacleId:o.id,segment:i};if(stopAtCollision)return false;}}))return failure;
  if(!planningQuery(lineTree,occupied,bounds,required,far,s=>{const separation=route.radiusM+s.other.radiusM+Math.max(route.clearanceM??clearanceM,s.other.clearanceM??0),value=segmentSegmentDistance(a,b,s.a,s.b).distanceM-separation;far(value);if(!Number.isFinite(value)||value<-1e-7){failure={ok:false,minimumClearanceM:value,clearanceM:value,otherRouteId:s.other.id,segments:[i,s.index]};if(stopAtCollision)return false;}}))return failure;
 }
 return failure?{...failure,minimumClearanceM,clearanceM:minimumClearanceM}:{ok:minimumClearanceM>=-1e-7,minimumClearanceM,clearanceM:minimumClearanceM};
}

function selectedRouteProjection(route,axis,section){
 const points=route.renderedPoints||route.points,prefix=route.renderedPrefix||(()=>{const a=[0];for(let i=1;i<points.length;i++)a.push(a.at(-1)+distance(points[i-1],points[i]));return a;})(),start=section?.startLengthM??0,end=section?.endLengthM??prefix.at(-1);
 if(!Number.isFinite(start)||start<0||!(Number.isFinite(end)||end===Infinity)||end<start||start>prefix.at(-1)+1e-7)return null;
 let minimum=Infinity,maximum=-Infinity;for(let i=1;i<points.length;i++){const lo=Math.max(start,prefix[i-1]),hi=Math.min(end,prefix[i]);if(hi<lo)continue;const span=prefix[i]-prefix[i-1];for(const at of [lo,hi]){const q=lerp(points[i-1],points[i],span?clamp((at-prefix[i-1])/span):0),value=dot(q,axis);minimum=Math.min(minimum,value);maximum=Math.max(maximum,value);}}
 return Number.isFinite(minimum)?[minimum,maximum]:null;
}
function selectedRoutePoints(route,section){
 const points=route.renderedPoints||route.points,prefix=route.renderedPrefix||(()=>{const a=[0];for(let i=1;i<points.length;i++)a.push(a.at(-1)+distance(points[i-1],points[i]));return a;})(),start=section.startLengthM,end=section.endLengthM,out=[];
 for(let i=1;i<points.length;i++){const lo=Math.max(start,prefix[i-1]),hi=Math.min(end,prefix[i]);if(hi<lo)continue;for(const at of [lo,hi]){const p=lerp(points[i-1],points[i],clamp((at-prefix[i-1])/(prefix[i]-prefix[i-1])));if(!out.length||distance(out.at(-1),p)>1e-9)out.push(p);}}
 return out;
}
function validateNominalEnvelope(actual,points,witness,pointCount){
 const deviation=witness.maximumBufferDeviationM,maximumError=witness.maximumArclengthErrorM??2*pointCount*(deviation+1e-8),prefix=[0];for(let i=1;i<points.length;i++)prefix.push(prefix.at(-1)+distance(points[i-1],points[i]));let previous=-Infinity,first=null,last=null,actualLength=0;
 for(let k=0;k<actual.length;k++){const p=actual[k];let closest=Infinity,parameter=0;for(let i=1;i<points.length;i++){const value=segmentSegmentDistance(p,p,points[i-1],points[i]);if(value.distanceM<closest){closest=value.distanceM;parameter=prefix[i-1]+value.t*(prefix[i]-prefix[i-1]);}}if(closest>deviation+1e-8||parameter+1e-8<previous)return false;if(first===null)first=parameter;last=parameter;previous=parameter;if(k)actualLength+=distance(actual[k-1],p);}
 return actualLength-(last-first)<=maximumError+1e-8;
}
function validateConvexUSpan(route,span,witness){
 const points=span?.nominalPoints,actual=span&&selectedRoutePoints(route,{startLengthM:span.startM,endLengthM:span.endM}),R=witness.minimumBendRadiusM,deviation=witness.maximumBufferDeviationM;
 if(!Array.isArray(points)||points.length<4||!points.every(finitePoint)||!actual?.length||minimumPolylineBendRadius(points)+1e-7<R)return false;
 const direction=unit(sub(points[1],points[0])),delta=sub(points.at(-1),points[0]),perpendicular=sub(delta,mul(direction,dot(delta,direction))),h=len(perpendicular),across=unit(perpendicular),plane=unit(cross(direction,across));if(h+2*deviation<witness.minimumLegSeparationM)return false;
 const first=unit(sub(points[1],points[0])),last=unit(sub(points.at(-1),points.at(-2)));if(dot(first,last)>-1+1e-7)return false;let angle=0;
 for(let i=1;i<points.length;i++){if(Math.abs(dot(sub(points[i],points[0]),plane))>deviation)return false;const edge=unit(sub(points[i],points[i-1]));let phi=Math.atan2(dot(edge,across),dot(edge,direction));if(phi<-Math.PI+1e-6)phi+=2*Math.PI;if(phi<-1e-6||phi>Math.PI+1e-6||phi+1e-6<angle)return false;angle=Math.max(angle,phi);}
 return validateNominalEnvelope(actual,points,witness,(route.renderedPoints||route.points).length);
}

function validateConvexPlanarSpan(route,span,witness){
 const original=span?.nominalPoints,actual=span&&selectedRoutePoints(route,{startLengthM:span.startM,endLengthM:span.endM}),R=witness.minimumBendRadiusM,deviation=witness.maximumBufferDeviationM,limit=witness.maximumTurnRad??Math.PI;
 if(!Array.isArray(original)||original.length<2||!original.every(finitePoint)||!actual?.length)return false;
 const points=original.filter((p,i)=>i===0||distance(p,original[i-1])>1e-10);if(points.length<2||minimumPolylineBendRadius(points)+1e-7<R)return false;
 const direction=unit(sub(points[1],points[0]));let plane=null;
 for(let i=2;i<points.length;i++){const candidate=cross(direction,unit(sub(points[i],points[i-1])));if(len(candidate)>1e-8){plane=unit(candidate);break;}}
 const across=plane?unit(cross(plane,direction)):null,boundedTurn=witness.kind==='bounded-turn';let angle=0,totalTurn=0;
 for(let i=1;i<points.length;i++){const edge=unit(sub(points[i],points[i-1]));if(!plane){if(dot(edge,direction)<1-1e-7)return false;continue;}if(Math.abs(dot(sub(points[i],points[0]),plane))>deviation)return false;let phi=Math.atan2(dot(edge,across),dot(edge,direction));if(boundedTurn){while(phi-angle>Math.PI)phi-=2*Math.PI;while(phi-angle< -Math.PI)phi+=2*Math.PI;totalTurn+=Math.abs(phi-angle);if(totalTurn>limit+1e-6)return false;angle=phi;}else{if(phi<-Math.PI+1e-6)phi+=2*Math.PI;if(phi<-1e-6||phi>limit+1e-6||phi+1e-6<angle)return false;angle=Math.max(angle,phi);}}
 return validateNominalEnvelope(actual,points,witness,(route.renderedPoints||route.points).length);
}

function solidProjection(obstacle,axis){
 if(obstacle.type==='obb'){const middle=dot(obstacle.center,axis),extent=obstacle.axes.reduce((sum,a,i)=>sum+Math.abs(dot(a,axis))*obstacle.halfSize[i],0);return [middle-extent,middle+extent];}
 if(obstacle.type==='cylinder'){const projection=dot(obstacle.axis,axis),middle=dot(obstacle.center,axis),extent=Math.abs(projection)*obstacle.halfLengthM+Math.sqrt(Math.max(0,1-projection*projection))*obstacle.radiusM;return [middle-extent,middle+extent];}
 if(obstacle.type==='capsule'){const a=dot(xyz(obstacle.a),axis),b=dot(xyz(obstacle.b),axis);return [Math.min(a,b)-obstacle.radiusM,Math.max(a,b)+obstacle.radiusM];}
 if(obstacle.type==='mesh'){let minimum=Infinity,maximum=-Infinity;for(const t of obstacle.triangles)for(const p of t){const value=dot(p,axis);minimum=Math.min(minimum,value);maximum=Math.max(maximum,value);}return [minimum,maximum];}
 const b=obstacle.bounds||{min:obstacle.min,max:obstacle.max};let minimum=0,maximum=0;for(let k=0;k<3;k++){const a=b.min[k]*axis[k],c=b.max[k]*axis[k];minimum+=Math.min(a,c);maximum+=Math.max(a,c);}return [minimum,maximum];
}

/** Exact-coordinate cache. Eviction only recomputes a geometric predicate. */
// Cache metadata aliases only the native bounded signature string. It is
// weakly keyed by the existing entry and never authorizes mutable input reuse.
const routingSnapshotMapGet = Map.prototype.get, routingSnapshotMapPrototype = Map.prototype;
const routingSnapshotIsMap = routingSnapshotNodeTypes?.isMap;
function routingSnapshotSafeNativeLookup(map){
 return !!routingSnapshotNodeTypes && !routingSnapshotIsProxy(map) && routingSnapshotIsMap(map) &&
   routingSnapshotGetPrototype(map)===routingSnapshotMapPrototype && !routingSnapshotGetDescriptor(map,'get');
}
function routingSnapshotReusableEntry(entry,origin,owners){
 if(!entry||typeof entry!=='object'||routingSnapshotIsProxy(entry))return false;
 const memo=routingSnapshotWeakMapGet(owners,entry);if(!memo||memo.origin!==origin.key)return false;
 const descriptor=routingSnapshotGetDescriptor(entry,'signature');
 return !!descriptor&&routingSnapshotHasOwn(descriptor,'value')&&descriptor.value===memo.signature;
}
const routingSnapshotWeakMapDeleteMethod=WeakMap.prototype.delete;
function routingSnapshotForget(map,key){routingSnapshotApply(routingSnapshotWeakMapDeleteMethod,map,[key]);}

export function createRoutingCollisionCache({maxSegmentsPerObstacle=4096,maxLinePairs=20000,maxSolidSegments=50000,maxWholePairs=150000,maxSignatureBytes=32*1024*1024,maxRouteEntries=2048}={}){
 const limit=x=>Number.isFinite(x)&&x>=0?Math.floor(x):0;
 maxSegmentsPerObstacle=limit(maxSegmentsPerObstacle);maxLinePairs=limit(maxLinePairs);maxSolidSegments=limit(maxSolidSegments);maxWholePairs=limit(maxWholePairs);maxSignatureBytes=limit(maxSignatureBytes);maxRouteEntries=limit(maxRouteEntries);
 const solids=new Map(),lines=new Map(),routePairs=new Map(),wholeLines=new Map(),solidEntries=new Set(),wholeEntries=new Set();let generation=0,signatureBytes=0;
 const signatureOwners=new routingSnapshotWeakMapConstructor(),signatureReuse={builds:0,hits:0,fallbacks:0};
 const stats={solidHits:0,solidMisses:0,lineHits:0,lineMisses:0,wholeSolidHits:0,wholeLineHits:0,invalidations:0,evictions:0,clears:0};
 function remove(record,pool){record.map.delete(record.key);pool.delete(record);}
 function empty(map,pool){for(const record of map.values())pool.delete(record);map.clear();}
 function put(map,key,value,pool,maximum,localMaximum=Infinity){
  if(!maximum||!localMaximum)return;const previous=map.get(key);if(previous)remove(previous,pool);
  while(map.size>=localMaximum){remove(map.values().next().value,pool);stats.evictions++;}
  while(pool.size>=maximum){remove(pool.values().next().value,pool);stats.evictions++;}
  const record={map,key,value};map.set(key,record);pool.add(record);
 }
 function dropSolid(id){const entry=solids.get(id);if(!entry)return;signatureBytes-=entry.signature.length*2;empty(entry.segments,solidEntries);empty(entry.apertures,solidEntries);solids.delete(id);}
 function dropRoute(id){const entry=routePairs.get(id);if(!entry)return;empty(entry.solids,wholeEntries);routePairs.delete(id);}
 function clear(){solids.clear();lines.clear();routePairs.clear();wholeLines.clear();solidEntries.clear();wholeEntries.clear();signatureBytes=0;stats.clears++;}
 return {stats,clear,get signatureReuse(){return {...signatureReuse};},get occupancy(){return {solids:solids.size,routes:routePairs.size,solidSegments:solidEntries.size,linePairs:lines.size,wholePairs:wholeEntries.size,signatureBytes};},prepare(obstacles,routes=null){
  const live=new Set(obstacles.map(o=>o.id));for(const id of solids.keys())if(!live.has(id))dropSolid(id);
  if(routes){const ids=new Set(routes.map(r=>r.id));for(const id of routePairs.keys())if(!ids.has(id))dropRoute(id);for(const record of wholeLines.values())if(!ids.has(record.value.aId)||!ids.has(record.value.bId))remove(record,wholeEntries);}
  const records=new Map();for(const o of obstacles){
   const origin=routingSnapshotOwnedOrigin(o),eligible=!!origin&&routingSnapshotSafeNativeLookup(solids);let signature,entry;
   if(eligible){
    entry=routingSnapshotApply(routingSnapshotMapGet,solids,[o.id]);
    if(routingSnapshotReusableEntry(entry,origin,signatureOwners)){signature=routingSnapshotGetDescriptor(entry,'signature').value;signatureReuse.hits++;}
    else{signature=JSON.stringify([o.type,o.bounds,o.min,o.max,o.center,o.axes,o.halfSize,o.axis,o.radiusM,o.halfLengthM,o.a,o.b,triangleCacheKey(o.triangles),o.closed,o.apertures]);entry=solids.get(o.id);signatureReuse.builds++;}
   }else{
    // Preserve the original expression and JSON-before-ID/cache lookup order.
    signature=JSON.stringify([o.type,o.bounds,o.min,o.max,o.center,o.axes,o.halfSize,o.axis,o.radiusM,o.halfLengthM,o.a,o.b,triangleCacheKey(o.triangles),o.closed,o.apertures]);entry=solids.get(o.id);signatureReuse.fallbacks++;
   }
   if(!entry||entry.signature!==signature){if(entry){stats.invalidations++;dropSolid(o.id);}entry={signature,generation:++generation,segments:new Map(),apertures:new Map()};
    const bytes=signature.length*2;if(bytes<=maxSignatureBytes){while(solids.size&&signatureBytes+bytes>maxSignatureBytes){dropSolid(solids.keys().next().value);stats.evictions++;}solids.set(o.id,entry);signatureBytes+=bytes;}
   }records.set(o,entry);
   const confirmed=eligible&&routingSnapshotOwnedOrigin(o);
   if(confirmed&&confirmed.key===origin.key)routingSnapshotWeakMapSet(signatureOwners,entry,{origin:origin.key,signature});
   else routingSnapshotForget(signatureOwners,entry);
  }
  const routeSignatures=new WeakMap();const routeKey=r=>{let key=routeSignatures.get(r);if(!key){key=JSON.stringify([r.points,r.radiusM,r.clearanceM]);routeSignatures.set(r,key);}return key;};
  const routeEntry=r=>{const signature=routeKey(r);let entry=routePairs.get(r.id);if(!entry||entry.signature!==signature){if(entry)dropRoute(r.id);entry={signature,generation:++generation,solids:new Map()};if(maxRouteEntries){while(routePairs.size>=maxRouteEntries){dropRoute(routePairs.keys().next().value);stats.evictions++;}routePairs.set(r.id,entry);}}return entry;};
  return {
   wholeSolid(r,o){const found=routeEntry(r).solids.get(o.id)?.value;if(found?.obstacleGeneration!==records.get(o)?.generation)return null;stats.wholeSolidHits++;return found.value;},
   storeWholeSolid(r,o,value){put(routeEntry(r).solids,o.id,{obstacleGeneration:records.get(o).generation,value:{lowerM:value.lowerM,upperM:value.upperM}},wholeEntries,maxWholePairs);},
   wholeLine(a,b){const value=wholeLines.get(JSON.stringify([a.id,b.id]))?.value;if(value?.aGeneration!==routeEntry(a).generation||value?.bGeneration!==routeEntry(b).generation)return null;stats.wholeLineHits++;return value.value;},
   storeWholeLine(a,b,value){put(wholeLines,JSON.stringify([a.id,b.id]),{aId:a.id,bId:b.id,aGeneration:routeEntry(a).generation,bGeneration:routeEntry(b).generation,value:{lowerM:value.lowerM,upperM:value.upperM}},wholeEntries,maxWholePairs);},
   solid(a,b,o){const entry=records.get(o),key=JSON.stringify([a,b]),found=entry.segments.get(key);if(found){stats.solidHits++;return found.value;}stats.solidMisses++;const value=solidDistance(a,b,o);put(entry.segments,key,value,solidEntries,maxSolidSegments,maxSegmentsPerObstacle);return value;},
   aperture(a,b,r,o,radius){if(!o.apertures?.some(p=>p.routeIds?.includes(r.id)))return Infinity;const entry=records.get(o),key=JSON.stringify([a,b,r.id,radius]),found=entry.apertures.get(key);if(found){stats.solidHits++;return found.value;}stats.solidMisses++;const value=apertureMotionMargin(a,b,r,o,radius);put(entry.apertures,key,value,solidEntries,maxSolidSegments,maxSegmentsPerObstacle);return value;},
   line(a,b,c,d){const key=JSON.stringify([a,b,c,d]);if(lines.has(key)){stats.lineHits++;return lines.get(key);}stats.lineMisses++;const value=segmentSegmentDistance(a,b,c,d);if(maxLinePairs){if(lines.size>=maxLinePairs){lines.delete(lines.keys().next().value);stats.evictions++;}lines.set(key,value);}return value;}
  };
 }};
}

const stationaryCertificates=new WeakMap();
const exactSignature=value=>JSON.stringify(value,(_,v)=>typeof v==='number'&&!Number.isFinite(v)?{$number:String(v)}:v===undefined?{$undefined:true}:v);
function stationarySettings(options={}){return exactSignature([options.clearanceM??0,options.endpointToleranceM??2e-5,options.maxTangentAngleDeg??25,options.bendToleranceM??2e-5,options.collisionToleranceM??2e-6,options.selfCollision!==false,options.interlineCollision!==false]);}
function stationaryRouteKey(route,settings={}){
 const end=value=>{const a=anchorRecord(value);return a&&[value?.isObject3D?value.uuid:a.id,a.connectorId,a.position,a.normal,a.toleranceM,a.maxTangentAngleDeg];};
 return exactSignature([route.points.map(xyz),route.radiusM,route.clearanceM??settings.clearanceM??0,end(route.from),end(route.to),route.minBendRadiusM,route.minimumBendRadiusM,route.bendRadiusBasis,route.nominalMinimumBendRadiusM,route.nominalMaximumTurnRad,route.bendSamplingMismatchM,route.bendConstructionIssue,route.renderedCenterlineMismatchM,route.renderedEndpointMismatchM,route.renderedTopologyMismatch,route.restLengthM,route.maximumLengthM,route.lengthToleranceM,(route.motionSpans||[]).map(s=>[s.startM,s.endM])]);
}
function stationaryObstacleKey(o){return exactSignature([o.type,o.bounds,o.min,o.max,o.center,o.axes,o.halfSize,o.axis,o.radiusM,o.halfLengthM,o.a,o.b,o.closed,o.apertures||[],o.sourceMesh,o.sourceGeometry]);}
function sameTriangles(a,b){if(a===b)return true;if(!a||!b)return !a&&!b;if(a.length!==b.length)return false;for(let i=0;i<a.length;i++){if(a[i].length!==b[i].length)return false;for(let j=0;j<a[i].length;j++)for(let k=0;k<3;k++)if(!Object.is(a[i][j][k],b[i][j][k]))return false;}return true;}
function snapshotEvidenceIssues(snapshot){
 const issues=[];if(!snapshot)return issues;
 if(snapshot.additionalIssues!==undefined&&!Array.isArray(snapshot.additionalIssues))issues.push({code:'invalid-snapshot-issues'});else issues.push(...(snapshot.additionalIssues||[]));
 if(snapshot.additionalIssueCount!==undefined&&(!Number.isInteger(snapshot.additionalIssueCount)||snapshot.additionalIssueCount<0))issues.push({code:'invalid-snapshot-issue-count'});
 if((snapshot.additionalIssueCount||0)>(snapshot.additionalIssues?.length||0))issues.push({code:'unreported-snapshot-issues',issueCount:snapshot.additionalIssueCount});
 if(snapshot.planningFailures?.length)issues.push(...snapshot.planningFailures.map(f=>({code:'unresolved-route-plan',...f})));
 const visit=(node,path)=>{if(!node||typeof node!=='object'||Array.isArray(node))return;if(node.ok===false||node.complete===false||(node.issueCount||0)>0||(node.issues?.length||0)>0)issues.push({code:'invalid-snapshot-inventory',path});for(const [key,value]of Object.entries(node)){if(Array.isArray(value)&&value.length&&(/^(missing|unregistered|unexpected)/i.test(key)))issues.push({code:'invalid-snapshot-inventory',path:path+'.'+key});else if(value&&typeof value==='object'&&!Array.isArray(value))visit(value,path+'.'+key);}};visit(snapshot.inventory,'inventory');return issues;
}
function inventorySignature(snapshot){return exactSignature([snapshot?.inventory??null,snapshot?.expectedRouteIds??null,snapshot?.expectedObstacleIds??null]);}

/** Full positive baseline for exact unchanged participants; the token is opaque. */
export function createRoutingStationaryCertificate(snapshot,{auditOptions={}}={}){
 const options={...auditOptions,selfCollision:true,interlineCollision:true,collectMotionPairs:false,snapshotEvidence:snapshot,expectedRouteIds:snapshot?.expectedRouteIds??auditOptions.expectedRouteIds,expectedObstacleIds:snapshot?.expectedObstacleIds??auditOptions.expectedObstacleIds};
 delete options.stationaryCertificate;delete options.stationaryMotionBound;delete options.pairMotionBound;delete options.pairSeparationLowerBound;
 const audit=auditRoutes(snapshot?.routes,snapshot?.obstacles||[],options);
 if(!audit.ok||!(audit.minimumClearanceM>1e-7))return {ok:false,audit,issues:audit.ok?[{code:'nonpositive-stationary-baseline-clearance',clearanceM:audit.minimumClearanceM}]:audit.issues,certificate:null};
 const routeRecords=new Map(snapshot.routes.map(r=>[r.id,stationaryRouteKey(r,options)])),obstacleRecords=new Map((snapshot.obstacles||[]).map(input=>{const o=normalizeObstacle(input),triangles=o.triangles&&(typeof triangleCacheKey(o.triangles)==='string'?o.triangles:freezeRecovered(o.triangles.map(t=>t.map(p=>[...p]))));return [o.id,{key:stationaryObstacleKey(o),triangles}];}));
 const certificate=Object.freeze({kind:'stationary-routing-baseline',version:1,routes:routeRecords.size,obstacles:obstacleRecords.size,minimumClearanceM:audit.minimumClearanceM});
 stationaryCertificates.set(certificate,{routes:routeRecords,obstacles:obstacleRecords,inventory:inventorySignature(snapshot),settings:stationarySettings(options),minimumClearanceM:audit.minimumClearanceM});
 return {ok:true,audit,issues:[],certificate};
}

/** Static routing validation. Missing/invalid records are failures, never skips. */
export function auditRoutes(routes,obstacles=[],options={}){
 const settings={clearanceM:0,endpointToleranceM:2e-5,maxTangentAngleDeg:25,bendToleranceM:2e-5,collisionToleranceM:2e-6,maxIssues:100,...options},issues=[],counts={routes:0,obstacles:0,segments:0,collisionSegments:0,solidPairs:0,linePairs:0,selfPairs:0};let issueCount=0,minimumClearanceM=Infinity,minimumCertificateMarginM=Infinity;const collectMotion=!!(options.pairMotionBound||options.pairSeparationLowerBound||options.collectMotionPairs||(options.collisionCache&&options.collectMotionPairs!==false)),motionPairs=new Map(),witnessChecks=new Map();
 function issue(code,details){issueCount++;if(issues.length<settings.maxIssues)issues.push({code,...details});}
 for(const failure of snapshotEvidenceIssues(options.snapshotEvidence))issue(failure.code||'snapshot-issue',failure);
 const shortCircuit=options.stopAfterFirstIssue||settings.maxIssues===1;
 function result(){return {ok:issueCount===0,issues,issueCount,truncated:issueCount>issues.length,minimumClearanceM,minimumCertificateMarginM:collectMotion?minimumCertificateMarginM:minimumClearanceM,counts,...(collectMotion?{motionPairs:[...motionPairs.values()]}:{})};}
 function pairInfo(kind,routeA,segmentA,obstacle=null,routeB=null,segmentB=null){const byKind=routeA.pairKeys[kind],other=obstacle||routeB||routeA;let key=byKind.get(other);if(!key){key=JSON.stringify([kind,routeA.id,other.id]);byKind.set(other,key);}const arc=(r,i)=>!r||i===null?null:[r.collisionSourceArclengths?.[i]??r.renderedPrefix[r.collisionPointIndices[i]],r.collisionSourceArclengths?.[i+1]??r.renderedPrefix[r.collisionPointIndices[i+1]]];return {key,kind,routeA,routeB,obstacle,segmentA,segmentB,sourceArcA:arc(routeA,segmentA),sourceArcB:arc(routeB,segmentB),a:segmentA===null?null:routeA.points[segmentA],b:segmentA===null?null:routeA.points[segmentA+1],c:segmentB===null||!routeB?null:routeB.points[segmentB],d:segmentB===null||!routeB?null:routeB.points[segmentB+1]};}
 function pairBound(pair){if(!options.pairMotionBound)return 0;const value=options.pairMotionBound(pair),bound=typeof value==='number'?value:value?.maxRelativeDisplacementM;if(!Number.isFinite(bound)||bound<0){issue('invalid-pair-motion-bound',{kind:pair.kind,routeId:pair.routeA.id,otherRouteId:pair.routeB?.id,obstacleId:pair.obstacle?.id});return Infinity;}return bound;}
 function intrinsicConvexWitness(pair,witness){
  if(pair.kind!=='self')return -Infinity;const span=pair.routeA.motionSpans?.find(s=>(s.id||s.sectionId)===witness.spanId);if(!span)return -Infinity;const contains=arc=>arc&&arc[0]>=span.startM-1e-8&&arc[1]<=span.endM+1e-8;if(!contains(pair.sourceArcA)||!contains(pair.sourceArcB))return -Infinity;
  const {minimumBendRadiusM:R,minimumLegSeparationM:h,radiusLowerBoundA:r0,radiusUpperBoundA:r1,maximumChordDeviationM:chord,maximumBufferDeviationM:deviation,basis}=witness,planar=witness.kind==='convex-planar'||witness.kind==='bounded-turn',turnLimit=witness.maximumTurnRad??Math.PI;
  if(![R,r0,r1,chord,deviation,turnLimit].every(Number.isFinite)||R<=0||(!planar&&(!Number.isFinite(h)||h<2*R))||turnLimit<0||turnLimit>Math.PI||(witness.maximumArclengthErrorM!==undefined&&(!Number.isFinite(witness.maximumArclengthErrorM)||witness.maximumArclengthErrorM<0))||r0<=0||r1<r0||chord<0||deviation<=0||typeof basis!=='string'||!basis.trim()){issue('invalid-intrinsic-witness',{routeId:pair.routeA.id,spanId:witness.spanId});return -Infinity;}
  const key=JSON.stringify([witness.kind,pair.routeA.id,witness]);if(witnessChecks.has(key))return witnessChecks.get(key);
  const sources=[pair.routeA,...(options.witnessSnapshots||[]).map(s=>s.routes.find(r=>r.id===pair.routeA.id))];for(const route of sources){const proofSpan=route?.motionSpans?.find(s=>(s.id||s.sectionId)===witness.spanId);if(!route||route.radiusM<r0-1e-9||route.radiusM>r1+1e-9||!(planar?validateConvexPlanarSpan(route,proofSpan,witness):validateConvexUSpan(route,proofSpan,witness))){issue('violated-intrinsic-witness',{routeId:pair.routeA.id,spanId:witness.spanId});witnessChecks.set(key,-Infinity);return -Infinity;}}
  // A convex U comprises two constant-radius turns totalling pi, separated
  // by a nonnegative tangent straight and parallel end leads. Inserting those
  // straights cannot reduce a short-arc chord below the radius-R circular
  // comparison; opposite legs are at least h >= 2R apart. The intrinsic
  // adjacency cutoff is pi*r + clearance. Subtract the polygon and actual
  // buffer envelopes twice before treating this as a clearance lower bound.
  const count=(pair.routeA.renderedPoints||pair.routeA.points).length,arclengthError=witness.maximumArclengthErrorM??2*count*(deviation+1e-8),intrinsic=Math.max(0,Math.PI*r0+pair.routeA.clearanceM-arclengthError),lower=Math.min(2*R*Math.sin(Math.min(intrinsic,Math.PI*R)/(2*R)),planar?Infinity:h)-2*r1-pair.routeA.clearanceM-2*(chord+deviation);witnessChecks.set(key,lower);return lower;
 }
 function separatingWitness(pair){
  if(!options.pairSeparationLowerBound)return -Infinity;const witness=options.pairSeparationLowerBound(pair);if(witness===null||witness===undefined)return -Infinity;if(witness.kind==='convex-u'||witness.kind==='convex-planar'||witness.kind==='bounded-turn')return intrinsicConvexWitness(pair,witness);
  const {axis,rangeA,rangeB,sectionA,sectionB,basis,radiusUpperBoundA,radiusUpperBoundB,projectionFrames}=witness;
  const contains=(arc,section,route)=>!section||arc?(!section||arc[0]>=(section.startLengthM??0)-1e-8&&arc[1]<=(section.endLengthM??Infinity)+1e-8):((section.startLengthM??0)===0&&(section.endLengthM??Infinity)>=route.lengthM);
  if(!contains(pair.sourceArcA,sectionA,pair.routeA)||pair.routeB&&!contains(pair.sourceArcB,sectionB,pair.routeB))return -Infinity;
  const validRange=x=>Array.isArray(x)&&x.length===2&&x.every(Number.isFinite)&&x[0]<=x[1];
  if(!finitePoint(axis)||Math.abs(len(axis)-1)>1e-7||!validRange(rangeA)||!validRange(rangeB)||typeof basis!=='string'||!basis.trim()||!Number.isFinite(radiusUpperBoundA)||radiusUpperBoundA<pair.routeA.radiusM-1e-9||pair.routeB&&(!Number.isFinite(radiusUpperBoundB)||radiusUpperBoundB<pair.routeB.radiusM-1e-9)){
   issue('invalid-separation-witness',{kind:pair.kind,routeId:pair.routeA.id,otherRouteId:pair.routeB?.id,obstacleId:pair.obstacle?.id});return -Infinity;
  }
  const key=JSON.stringify([pair.kind,pair.routeA.id,pair.routeB?.id,pair.obstacle?.id,axis,rangeA,rangeB,sectionA,sectionB,radiusUpperBoundA,radiusUpperBoundB,projectionFrames]);if(witnessChecks.has(key))return witnessChecks.get(key);
  const snapshots=options.witnessSnapshots||[],sources=[{routes:[pair.routeA,...(pair.routeB?[pair.routeB]:[])],obstacles:pair.obstacle?[pair.obstacle]:[]},...snapshots];
  for(const [sourceIndex,snapshot] of sources.entries()){const frame=projectionFrames?.[['mid','start','end'][sourceIndex]],projectAxis=frame?.axis||axis,origin=frame?.origin||[0,0,0];if(projectionFrames&&(!frame||!finitePoint(projectAxis)||Math.abs(len(projectAxis)-1)>1e-7||!finitePoint(origin))){issue('invalid-separation-witness',{routeId:pair.routeA.id,message:'Every supplied projection frame must have a finite origin and a unit axis.'});witnessChecks.set(key,-Infinity);return -Infinity;}const offset=dot(origin,projectAxis),a=snapshot.routes?.find(r=>r.id===pair.routeA.id),b=pair.routeB?snapshot.routes?.find(r=>r.id===pair.routeB.id):snapshot.obstacles?.find(o=>o.id===pair.obstacle.id),rawA=a&&selectedRouteProjection(a,projectAxis,sectionA),rawB=b&&(pair.routeB?selectedRouteProjection(b,projectAxis,sectionB):solidProjection(normalizeObstacle(b),projectAxis)),pa=rawA?.map(v=>v-offset),pb=rawB?.map(v=>v-offset);
   if(!a||!b||!pa||!pb||pa[0]<rangeA[0]-1e-7||pa[1]>rangeA[1]+1e-7||pb[0]<rangeB[0]-1e-7||pb[1]>rangeB[1]+1e-7||a.radiusM>radiusUpperBoundA+1e-9||pair.routeB&&b.radiusM>radiusUpperBoundB+1e-9){issue('violated-separation-witness',{kind:pair.kind,routeId:pair.routeA.id,otherRouteId:pair.routeB?.id,obstacleId:pair.obstacle?.id,projectedA:pa,projectedB:pb,rangeA,rangeB});witnessChecks.set(key,-Infinity);return -Infinity;}
  }
  const gap=Math.max(rangeA[0]-rangeB[1],rangeB[0]-rangeA[1]),clearance=gap-radiusUpperBoundA-(pair.routeB?radiusUpperBoundB:0)-Math.max(pair.routeA.clearanceM,pair.routeB?.clearanceM??0);witnessChecks.set(key,clearance);return clearance;
 }
 function contribute(pair,lower,upper,bound,separation=-Infinity){if(!collectMotion)return;if(Number.isFinite(upper)&&separation>upper+1e-7)issue('overstated-separation-witness',{kind:pair.kind,routeId:pair.routeA.id,otherRouteId:pair.routeB?.id,obstacleId:pair.obstacle?.id,claimedM:separation,observedM:upper});minimumCertificateMarginM=Math.min(minimumCertificateMarginM,Math.max(lower-bound,separation));const key=pair.key;let row=motionPairs.get(key);if(!row){row={key,kind:pair.kind,routeId:pair.routeA.id,otherRouteId:pair.routeB?.id,obstacleId:pair.obstacle?.id,lowerM:Infinity,upperM:Infinity,boundM:0,certificateLowerM:Infinity};motionPairs.set(key,row);}row.lowerM=Math.min(row.lowerM,lower);row.upperM=Math.min(row.upperM,upper);row.boundM=Math.max(row.boundM,bound);const certificate=Math.max(lower-bound,separation);if(certificate<row.certificateLowerM){row.certificateLowerM=certificate;row.worst={segmentA:pair.segmentA,segmentB:pair.segmentB,sourceArcA:pair.sourceArcA,sourceArcB:pair.sourceArcB,lowerM:lower,boundM:bound,separationM:Number.isFinite(separation)?separation:null,obstacleName:pair.obstacle?.name,obstacleMotion:pair.obstacle?.motion?.type};}}

 if(!Array.isArray(routes)){issue('invalid-route-registry',{message:'Routes must be an array'});routes=[];}
 if(!Array.isArray(obstacles)){issue('invalid-obstacle-registry',{message:'Obstacles must be an array'});obstacles=[];}
 const checked=[],routeIds=new Set();
 for(const input of routes){
  const r={...input,points:Array.isArray(input?.points)?input.points.map(xyz):input?.points};counts.routes++;
  if(!r.id||routeIds.has(r.id)){issue('route-identity',{routeId:r.id,message:'Route ids must be present and unique'});continue;}routeIds.add(r.id);
  if(!Array.isArray(r.points)||r.points.length<2||!r.points.every(finitePoint)||!Number.isFinite(r.radiusM)||r.radiusM<=0){issue('invalid-route',{routeId:r.id,message:'Finite rendered points and positive physical radius are required'});continue;}
  if(r.points.slice(1).some((p,i)=>distance(p,r.points[i])<EPS)){issue('collapsed-segment',{routeId:r.id});continue;}
  const prefix=[0];for(let i=1;i<r.points.length;i++)prefix.push(prefix.at(-1)+distance(r.points[i],r.points[i-1]));
  r.pairKeys={solid:new Map(),line:new Map(),self:new Map()};r.prefix=prefix;r.renderedPoints=r.points;r.renderedPrefix=prefix;r.collisionPointIndices=r.points.map((_,i)=>i);r.collisionSourceArclengths=prefix;r.lengthM=prefix.at(-1);r.clearanceM=r.clearanceM??settings.clearanceM;r.bounds=boundsOf(r.points);r.segments=segmentsOf(r);counts.segments+=r.points.length-1;
  if(!Number.isFinite(r.clearanceM)||r.clearanceM<0){issue('invalid-clearance',{routeId:r.id});continue;}
  for(const [side,index,next] of [['from',0,1],['to',r.points.length-1,r.points.length-2]]){
   const endpoint=anchorRecord(r[side]);if(!endpoint)continue;
   if(!finitePoint(endpoint.position)){issue('invalid-connector',{routeId:r.id,end:side});continue;}
   const gapM=distance(r.points[index],endpoint.position),toleranceM=endpoint.toleranceM??settings.endpointToleranceM;
   if(gapM>toleranceM)issue('connector-gap',{routeId:r.id,end:side,gapM,toleranceM});
   if(endpoint.normal){if(!finitePoint(endpoint.normal)||len(endpoint.normal)<EPS)issue('invalid-connector-normal',{routeId:r.id,end:side});else{let meaningful=next;const direction=side==='from'?1:-1,measurementToleranceM=Math.max(2e-6,toleranceM);while(meaningful+direction>=0&&meaningful+direction<r.points.length&&distance(r.points[meaningful],r.points[index])<=measurementToleranceM)meaningful+=direction;const cosine=clamp(dot(unit(sub(r.points[meaningful],r.points[index])),unit(endpoint.normal)),-1,1),angleDeg=Math.acos(cosine)*180/Math.PI;if(angleDeg>(endpoint.maxTangentAngleDeg??settings.maxTangentAngleDeg))issue('connector-tangent',{routeId:r.id,end:side,angleDeg,measurementToleranceM});}}
  }
  if((r.renderedEndpointMismatchM||0)>settings.endpointToleranceM)issue('rendered-cap-gap',{routeId:r.id,gapM:r.renderedEndpointMismatchM});
  if((r.renderedCenterlineMismatchM||0)>settings.endpointToleranceM)issue('rendered-centerline-mismatch',{routeId:r.id,gapM:r.renderedCenterlineMismatchM});
  if(r.bendConstructionIssue)issue('invalid-bend-construction',{routeId:r.id,reason:r.bendConstructionIssue,maximumTurnRad:r.nominalMaximumTurnRad});
  // Uniform samples of an already tessellated arc can straddle a polygon
  // vertex unevenly and create an artificial half-radius circumcircle. The
  // renderer's constructed circular radius is the physical bend definition;
  // its actual buffer must still match every sampled centreline point. A
  // generic route without that construction evidence uses the discrete screen.
  const measured=minimumPolylineBendRadius(r.points),analytic=r.bendRadiusBasis==='constructed-circular-fillets'&&(r.renderedCenterlineMismatchM??Infinity)<=settings.endpointToleranceM,
   actual=analytic&&typeof r.minimumBendRadiusM==='number'&&!Number.isNaN(r.minimumBendRadiusM)?r.minimumBendRadiusM:Math.min(measured,r.minimumBendRadiusM??Infinity);
  if(r.minBendRadiusM!==undefined&&(!Number.isFinite(r.minBendRadiusM)||r.minBendRadiusM<=0))issue('invalid-bend-allocation',{routeId:r.id});
  else if(r.minBendRadiusM&&actual+settings.bendToleranceM<r.minBendRadiusM)issue('bend-radius',{routeId:r.id,actualM:actual,requiredM:r.minBendRadiusM});
  if(r.minimumBendRadiusM!==undefined&&(typeof r.minimumBendRadiusM!=='number'||Number.isNaN(r.minimumBendRadiusM)||r.minimumBendRadiusM<0))issue('invalid-bend-measurement',{routeId:r.id});
  for(const field of ['restLengthM','maximumLengthM'])if(r[field]!==undefined&&(!Number.isFinite(r[field])||r[field]<=0))issue('invalid-length-allocation',{routeId:r.id,field});
  if(r.lengthToleranceM!==undefined&&(!Number.isFinite(r.lengthToleranceM)||r.lengthToleranceM<0))issue('invalid-length-allocation',{routeId:r.id,field:'lengthToleranceM'});
  if(Number.isFinite(r.maximumLengthM)&&r.lengthM>r.maximumLengthM+settings.endpointToleranceM)issue('length-exceeded',{routeId:r.id,actualM:r.lengthM,maximumM:r.maximumLengthM});
  if(Number.isFinite(r.restLengthM)&&Math.abs(r.lengthM-r.restLengthM)>(r.lengthToleranceM??settings.endpointToleranceM))issue('length-not-conserved',{routeId:r.id,actualM:r.lengthM,restLengthM:r.restLengthM});
  if(options.stationaryCertificate)r.stationaryBaselineKey=stationaryRouteKey(r,settings);
  if(settings.collisionToleranceM>0||r.motionSpans?.length){
   const boundaries=[...new Set((r.motionSpans||[]).flatMap(span=>[span.startM,span.endM]).filter(at=>Number.isFinite(at)&&at>=0&&at<=r.lengthM))].sort((a,b)=>a-b),points=[],sourceArcs=[],sourceIndices=[],preserve=new Set();let next=0;
   const push=(point,arc,index)=>{points.push(point);sourceArcs.push(arc);sourceIndices.push(index);};
   for(let i=0;i<r.renderedPoints.length;i++){
    const arc=r.renderedPrefix[i];push(r.renderedPoints[i],arc,i);
    while(next<boundaries.length&&boundaries[next]<=arc+1e-10){if(Math.abs(boundaries[next]-arc)<=1e-10)preserve.add(points.length-1);next++;}
    if(i===r.renderedPoints.length-1)break;
    while(next<boundaries.length&&boundaries[next]<r.renderedPrefix[i+1]-1e-10){const at=boundaries[next++],length=r.renderedPrefix[i+1]-arc;preserve.add(points.length-1);push(lerp(r.renderedPoints[i],r.renderedPoints[i+1],(at-arc)/length),at,null);preserve.add(points.length-1);preserve.add(points.length);}
   }
   const simplified=simplifyCollisionPolyline(points,settings.collisionToleranceM,[...preserve]),indices=new Map(points.map((point,i)=>[point,i]));r.collisionPointIndices=simplified.map(point=>sourceIndices[indices.get(point)]);r.collisionSourceArclengths=simplified.map(point=>sourceArcs[indices.get(point)]);r.points=simplified;if(simplified.length<points.length)r.radiusM+=settings.collisionToleranceM;r.prefix=[0];for(let i=1;i<r.points.length;i++)r.prefix.push(r.prefix.at(-1)+distance(r.points[i],r.points[i-1]));r.segments=segmentsOf(r);
  }
  r.blocks=[];for(let start=0;start<r.points.length-1;start+=8){const end=Math.min(r.points.length-1,start+8);r.blocks.push({start,end,bounds:boundsOf(r.points.slice(start,end+1))});}
  counts.collisionSegments+=r.points.length-1;
  checked.push(r);
 }
 if(options.expectedRouteIds){const expected=new Set(options.expectedRouteIds);for(const id of expected)if(!routeIds.has(id))issue('missing-route',{routeId:id});for(const id of routeIds)if(!expected.has(id))issue('unexpected-route',{routeId:id});}
 const obstacleIds=new Set(),solids=[];
 for(const original of obstacles){const o=normalizeObstacle(original);counts.obstacles++;
  if(!o?.id||obstacleIds.has(o.id)||!['box','obb','mesh','cylinder','capsule'].includes(o.type)||!finitePoint(o.bounds?.min)||!finitePoint(o.bounds?.max)||o.bounds.min.some((x,i)=>x>o.bounds.max[i])){issue('invalid-obstacle',{obstacleId:o?.id});continue;}
  obstacleIds.add(o.id);if((o.type==='capsule'&&(!finitePoint(xyz(o.a))||!finitePoint(xyz(o.b))||!Number.isFinite(o.radiusM)||o.radiusM<=0))||(o.type==='cylinder'&&(!finitePoint(o.center)||!finitePoint(o.axis)||Math.abs(len(o.axis)-1)>1e-6||!Number.isFinite(o.radiusM)||o.radiusM<=0||!Number.isFinite(o.halfLengthM)||o.halfLengthM<0))){issue('invalid-obstacle',{obstacleId:o.id});continue;}if(o.type==='mesh'&&(!Array.isArray(o.triangles)||!o.triangles.length||o.triangles.some(t=>t.length!==3||!t.every(finitePoint)))){issue('invalid-obstacle',{obstacleId:o.id});continue;}
  for(const a of o.apertures||[])if(!validAperture(a))issue('invalid-aperture',{obstacleId:o.id,apertureId:a.id});
  solids.push(o);
 }
 if(options.expectedObstacleIds)for(const id of options.expectedObstacleIds)if(!obstacleIds.has(id))issue('missing-obstacle',{obstacleId:id});
 const stationaryRoutes=new Set(),stationarySolids=new Set();
 if(options.stationaryCertificate){
  const baseline=stationaryCertificates.get(options.stationaryCertificate),motion=options.stationaryMotionBound,needsMotion=!!(options.pairMotionBound||options.pairSeparationLowerBound);
  if(!baseline)issue('invalid-stationary-certificate',{message:'A successful full baseline token from this engine is required.'});
  else if(baseline.settings!==stationarySettings(settings))issue('stationary-certificate-settings-change',{});
  else{
   for(const [kind,actual,expected]of [['route',routeIds,baseline.routes],['obstacle',obstacleIds,baseline.obstacles]]){for(const id of expected.keys())if(!actual.has(id))issue('stationary-certificate-missing-participant',{kind,id});for(const id of actual)if(!expected.has(id))issue('stationary-certificate-extra-participant',{kind,id});}
   if(inventorySignature(options.snapshotEvidence)!==baseline.inventory)issue('stationary-certificate-inventory-change',{});
   if((needsMotion||motion)&&(!(typeof motion==='function')||typeof options.stationaryMotionBasis!=='string'||!options.stationaryMotionBasis.trim()))issue('missing-stationary-motion-bound',{message:'A documented absolute displacement bound for each participant is required before reusing continuous stationary pairs.'});
   else for(const [kind,records,expected,eligible]of [['route',checked,baseline.routes,stationaryRoutes],['obstacle',solids,baseline.obstacles,stationarySolids]]){
    const otherSamples=(options.stationarySamples||[]).map(snapshot=>new Map((kind==='route'?snapshot.routes:snapshot.obstacles).map(record=>[record.id,kind==='route'?record:normalizeObstacle(record)])));
    for(const record of records){
    const saved=expected.get(record.id);if(!saved)continue;let unchanged=kind==='route'?record.stationaryBaselineKey===saved:stationaryObstacleKey(record)===saved.key&&sameTriangles(record.triangles,saved.triangles);
    const bound=motion?motion({kind,id:record.id,record}):null;
    if(motion&&(!Number.isFinite(bound)||bound<0)){issue('invalid-stationary-motion-bound',{kind,id:record.id,boundM:bound});continue;}
    if(bound===0&&unchanged)unchanged=otherSamples.every(records=>{const actual=records.get(record.id);return actual&&(kind==='route'?stationaryRouteKey(actual,settings)===saved:stationaryObstacleKey(actual)===saved.key&&sameTriangles(actual.triangles,saved.triangles));});
    if(motion&&bound===0&&!unchanged){issue('false-stationary-motion-bound',{kind,id:record.id,message:'The claimed invariant participant differs from the full baseline geometry, connector or allocation.'});continue;}
    if(unchanged&&(!motion||bound===0))eligible.add(record);
    }
   }
   counts.stationaryRoutes=stationaryRoutes.size;counts.stationaryObstacles=stationarySolids.size;counts.reusedStationarySolidPairs=stationaryRoutes.size*stationarySolids.size;counts.reusedStationaryLinePairs=stationaryRoutes.size*(stationaryRoutes.size-1)/2;counts.reusedStationarySelfRoutes=stationaryRoutes.size;
   if(stationaryRoutes.size){minimumClearanceM=Math.min(minimumClearanceM,baseline.minimumClearanceM);minimumCertificateMarginM=Math.min(minimumCertificateMarginM,baseline.minimumClearanceM);}
  }
 }
 if(issueCount&&shortCircuit)return result();
 const kernel=options.collisionCache?.prepare(solids,checked),distanceSolid=kernel?kernel.solid:solidDistance,distanceLine=kernel?kernel.line:segmentSegmentDistance,marginAperture=kernel?kernel.aperture:apertureMotionMargin;
 const changingSolids=stationarySolids.size?solids.filter(o=>!stationarySolids.has(o)):solids,changingRoutes=stationaryRoutes.size?checked.filter(r=>!stationaryRoutes.has(r)):checked,routeOrder=new Map(checked.map((r,i)=>[r,i]));
 for(const r of checked){
  const radius=r.radiusM+r.clearanceM,activeSolids=[];
  for(const o of stationaryRoutes.has(r)?changingSolids:solids){const pair=collectMotion?pairInfo('solid',r,null,o):null,bound=collectMotion?pairBound(pair):0,cached=bound===0?kernel?.wholeSolid(r,o):null,separation=collectMotion?separatingWitness(pair):-Infinity;
   if(cached){counts.solidPairs+=r.points.length-1;counts.cachedSolidPairs=(counts.cachedSolidPairs||0)+1;minimumClearanceM=Math.min(minimumClearanceM,cached.lowerM);contribute(pair,cached.lowerM,cached.upperM,0,separation);continue;}
   if(separation>1e-7){counts.solidPairs+=r.points.length-1;counts.prunedWitnessPairs=(counts.prunedWitnessPairs||0)+1;minimumClearanceM=Math.min(minimumClearanceM,separation);contribute(pair,separation,Infinity,bound,separation);continue;}
   const lower=boxesDistance(r.bounds,o.bounds)-radius;if(lower>Math.max(bound,1e-5,Math.min(.02,minimumClearanceM))){counts.solidPairs+=r.points.length-1;minimumClearanceM=Math.min(minimumClearanceM,lower);contribute(pair,lower,Infinity,bound,separation);if(kernel)kernel.storeWholeSolid(r,o,{lowerM:lower,upperM:Infinity});continue;}activeSolids.push({obstacle:o,pair,bound,separation});
  }
  for(const block of r.blocks){
   const nearby=[];for(const entry of activeSolids){const lower=boxesDistance(block.bounds,entry.obstacle.bounds)-radius;if(lower>Math.max(entry.bound,1e-5,Math.min(.02,minimumClearanceM))){counts.solidPairs+=block.end-block.start;counts.prunedSolidBlocks=(counts.prunedSolidBlocks||0)+1;minimumClearanceM=Math.min(minimumClearanceM,lower);contribute(entry.pair,lower,Infinity,entry.bound,entry.separation);}else nearby.push(entry.obstacle);}
   for(let i=block.start;i<block.end;i++){
   const a=r.points[i],b=r.points[i+1];
   for(const o of nearby){
    const pair=collectMotion?pairInfo('solid',r,i,o):null,bound=collectMotion?pairBound(pair):0,separation=collectMotion?separatingWitness(pair):-Infinity,broad=boxesDistance(r.segments[i].bounds,o.bounds)-radius;if(separation>1e-7||broad>Math.max(bound,1e-5,Math.min(.02,minimumClearanceM))){counts.solidPairs++;const lower=Math.max(broad,separation);minimumClearanceM=Math.min(minimumClearanceM,lower);contribute(pair,lower,Infinity,bound,separation);continue;}
    const apertureMargin=marginAperture(a,b,r,o,radius);minimumClearanceM=Math.min(minimumClearanceM,apertureMargin);if(Number.isFinite(apertureMargin))contribute(pair,apertureMargin,Infinity,bound,separation);
    for(const [x,y] of outsideApertures(a,b,r,o,radius)){
     counts.solidPairs++;const lower=boxesDistance(boundsOf([x,y]),o.bounds)-radius;
     // Far-pair AABB distances are conservative separation lower bounds and
     // remain in the result for swept certification; they are not Infinity.
     if(lower>Math.max(bound,1e-5,Math.min(.02,minimumClearanceM))){minimumClearanceM=Math.min(minimumClearanceM,lower);contribute(pair,lower,Infinity,bound,separation);continue;}
     const clearance=distanceSolid(x,y,o)-radius;minimumClearanceM=Math.min(minimumClearanceM,clearance);contribute(pair,clearance,clearance,bound,separation);
     if(!Number.isFinite(clearance))issue('unresolved-obstacle',{routeId:r.id,obstacleId:o.id,segment:i});
     else if(clearance<-1e-7)issue('solid-collision',{routeId:r.id,obstacleId:o.id,segment:i,clearanceM:clearance});
     if(issueCount&&shortCircuit)return result();
    }
   }
  }
  }
  if(kernel&&collectMotion)for(const {obstacle:o} of activeSolids){const row=motionPairs.get(pairInfo('solid',r,null,o).key);if(row&&row.lowerM>=0)kernel.storeWholeSolid(r,o,row);}
  if(stationaryRoutes.has(r))continue;
  const selfWhole=collectMotion?pairInfo('self',r,null,null,r,null):null,selfBound=collectMotion?pairBound(selfWhole):0,selfCached=selfBound===0?kernel?.wholeLine(r,r):null;
  if(options.selfCollision!==false&&selfCached){minimumClearanceM=Math.min(minimumClearanceM,selfCached.lowerM);counts.cachedLinePairs=(counts.cachedLinePairs||0)+1;contribute(selfWhole,selfCached.lowerM,selfCached.upperM,0);}
  else if(options.selfCollision!==false)for(let bi=0;bi<r.blocks.length;bi++)for(let bj=bi;bj<r.blocks.length;bj++){
   const left=r.blocks[bi],right=r.blocks[bj],blockLower=boxesDistance(left.bounds,right.bounds)-2*r.radiusM-r.clearanceM;
   if(blockLower>Math.max(selfBound,1e-5,Math.min(.02,minimumClearanceM))){for(let i=left.start;i<left.end;i++)counts.selfPairs+=Math.max(0,right.end-Math.max(i+2,right.start));counts.prunedSelfBlocks=(counts.prunedSelfBlocks||0)+1;minimumClearanceM=Math.min(minimumClearanceM,blockLower);contribute(selfWhole,blockLower,Infinity,selfBound);continue;}
   for(let i=left.start;i<left.end;i++)for(let j=Math.max(i+2,right.start);j<right.end;j++){
   counts.selfPairs++;const motionPair=collectMotion?pairInfo('self',r,i,null,r,j):null,bound=collectMotion?pairBound(motionPair):0,separation=collectMotion?separatingWitness(motionPair):-Infinity,lower=boxesDistance(r.segments[i].bounds,r.segments[j].bounds)-2*r.radiusM-r.clearanceM;if(lower>bound){minimumClearanceM=Math.min(minimumClearanceM,lower);contribute(motionPair,lower,Infinity,bound,separation);continue;}const pair=distanceLine(r.points[i],r.points[i+1],r.points[j],r.points[j+1]),arcSeparation=(r.prefix[j]+pair.t*(r.prefix[j+1]-r.prefix[j]))-(r.prefix[i]+pair.s*(r.prefix[i+1]-r.prefix[i]));
   // Neighbouring pieces of the same continuous tube share their envelope.
   // This exemption is bounded by intrinsic arclength, never by object id.
   if(arcSeparation<=Math.PI*r.radiusM+r.clearanceM+1e-7)continue;
   const clearance=pair.distanceM-2*r.radiusM-r.clearanceM;minimumClearanceM=Math.min(minimumClearanceM,clearance);contribute(motionPair,clearance,clearance,bound,separation);if(clearance<-1e-7)issue('self-collision',{routeId:r.id,segments:[i,j],clearanceM:clearance});
   if(issueCount&&shortCircuit)return result();
  }
  }
  if(kernel&&collectMotion&&options.selfCollision!==false&&!selfCached){const row=motionPairs.get(selfWhole.key);if(row&&row.lowerM>=0)kernel.storeWholeLine(r,r,row);}
 }
 if(options.interlineCollision!==false)for(let i=0;i<checked.length;i++)for(const b of stationaryRoutes.has(checked[i])?changingRoutes:checked){
  if(routeOrder.get(b)<=i)continue;
  const a=checked[i],required=a.radiusM+b.radiusM+Math.max(a.clearanceM,b.clearanceM),lower=boxesDistance(a.bounds,b.bounds)-required;
  const wholePair=collectMotion?pairInfo('line',a,null,null,b,null):null,wholeBound=collectMotion?pairBound(wholePair):0,wholeSeparation=collectMotion?separatingWitness(wholePair):-Infinity,cached=wholeBound===0?kernel?.wholeLine(a,b):null;
  if(cached){counts.cachedLinePairs=(counts.cachedLinePairs||0)+1;minimumClearanceM=Math.min(minimumClearanceM,cached.lowerM);contribute(wholePair,cached.lowerM,cached.upperM,0,wholeSeparation);continue;}
  if(wholeSeparation>1e-7){counts.linePairs+=(a.points.length-1)*(b.points.length-1);counts.prunedWitnessPairs=(counts.prunedWitnessPairs||0)+1;minimumClearanceM=Math.min(minimumClearanceM,wholeSeparation);contribute(wholePair,wholeSeparation,Infinity,wholeBound,wholeSeparation);continue;}
  if(lower>Math.max(wholeBound,1e-5,Math.min(.02,minimumClearanceM))){minimumClearanceM=Math.min(minimumClearanceM,lower);contribute(wholePair,lower,Infinity,wholeBound,wholeSeparation);if(kernel)kernel.storeWholeLine(a,b,{lowerM:lower,upperM:Infinity});continue;}
  for(const left of a.blocks)for(const right of b.blocks){
   const blockLower=boxesDistance(left.bounds,right.bounds)-required;if(blockLower>Math.max(wholeBound,1e-5,Math.min(.02,minimumClearanceM))){counts.linePairs+=(left.end-left.start)*(right.end-right.start);counts.prunedLineBlocks=(counts.prunedLineBlocks||0)+1;minimumClearanceM=Math.min(minimumClearanceM,blockLower);contribute(wholePair,blockLower,Infinity,wholeBound,wholeSeparation);continue;}
   for(let ia=left.start;ia<left.end;ia++)for(let ib=right.start;ib<right.end;ib++){
   counts.linePairs++;const motionPair=collectMotion?pairInfo('line',a,ia,null,b,ib):null,bound=collectMotion?pairBound(motionPair):0,separation=collectMotion?separatingWitness(motionPair):-Infinity,lower=boxesDistance(a.segments[ia].bounds,b.segments[ib].bounds)-required;if(separation>1e-7||lower>bound){minimumClearanceM=Math.min(minimumClearanceM,Math.max(lower,separation));contribute(motionPair,Math.max(lower,separation),Infinity,bound,separation);continue;}const pair=distanceLine(a.points[ia],a.points[ia+1],b.points[ib],b.points[ib+1]),clearance=pair.distanceM-required;minimumClearanceM=Math.min(minimumClearanceM,clearance);contribute(motionPair,clearance,clearance,bound,separation);if(clearance<-1e-7)issue('line-collision',{routeId:a.id,otherRouteId:b.id,segments:[ia,ib],clearanceM:clearance});
   if(issueCount&&shortCircuit)return result();
  }
  }
  if(kernel&&collectMotion){const row=motionPairs.get(wholePair.key);if(row&&row.lowerM>=0)kernel.storeWholeLine(a,b,row);}
 }
 return result();
}

function samePoints(a,b){if(a===b)return true;if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)for(let k=0;k<3;k++)if(!Object.is(a[i][k],b[i][k]))return false;return true;}
function polylineVertexSeparation(a,b){
 if(samePoints(a,b))return 0;
 const left=simplifyCollisionPolyline(a.map(xyz),2e-6),right=simplifyCollisionPolyline(b.map(xyz),2e-6);let maximum=0;
 const directed=(source,target)=>{for(const p of source){let nearest=Infinity;for(let i=1;i<target.length;i++){const q=target[i-1],e=target[i],dx=e[0]-q[0],dy=e[1]-q[1],dz=e[2]-q[2],dd=dx*dx+dy*dy+dz*dz,t=dd>1e-24?clamp(((p[0]-q[0])*dx+(p[1]-q[1])*dy+(p[2]-q[2])*dz)/dd):0,d=Math.hypot(p[0]-q[0]-t*dx,p[1]-q[1]-t*dy,p[2]-q[2]-t*dz);nearest=Math.min(nearest,d);}maximum=Math.max(maximum,Math.max(0,nearest-2e-6));}};directed(left,right);directed(right,left);return maximum;
}
function snapshotMotion(a,b){
 if(a.routes.length!==b.routes.length||a.obstacles.length!==b.obstacles.length)return Infinity;let motion=0;
 const rb=new Map(b.routes.map(r=>[r.id,r])),ob=new Map(b.obstacles.map(o=>[o.id,normalizeObstacle(o)]));
 for(const r of a.routes){const s=rb.get(r.id);if(!s||r.points.length!==s.points.length)return Infinity;const radial=Math.abs(r.radiusM-s.radiusM);motion=Math.max(motion,polylineVertexSeparation(r.points,s.points)+radial);}
 for(const original of a.obstacles){const o=normalizeObstacle(original),p=ob.get(o.id);if(!p)return Infinity;if(o.sourceGeometry&&o.sourceGeometry===p.sourceGeometry&&o.sourceVertices&&p.sourceVertices){if(o.sourceVertices.length!==p.sourceVertices.length)return Infinity;if(o.sourceVertices!==p.sourceVertices)for(let i=0;i<o.sourceVertices.length;i++)motion=Math.max(motion,distance(o.sourceVertices[i],p.sourceVertices[i]));continue;}if(o.type!==p.type)return Infinity;if(o.type==='mesh'){if(o.triangles.length!==p.triangles.length)return Infinity;if(o.triangles!==p.triangles)for(let i=0;i<o.triangles.length;i++)for(let k=0;k<3;k++)motion=Math.max(motion,distance(o.triangles[i][k],p.triangles[i][k]));}else{motion=Math.max(motion,distance(o.bounds.min,p.bounds.min),distance(o.bounds.max,p.bounds.max));if(o.type==='obb')for(let k=0;k<3;k++)motion=Math.max(motion,distance(add(o.center,mul(o.axes[k],o.halfSize[k])),add(p.center,mul(p.axes[k],p.halfSize[k]))));}}
 return motion;
}

/**
 * Conservative continuous collision screen. motionBound(a,b) must bound the
 * change of EVERY relevant pair's clearance from the interval midpoint to
 * ANY time in [a,b], including shape changes and both moving participants.
 * Supply a proven analytic bound, not an observed endpoint displacement.
 * All uncertain intervals fail at maxDepth/minInterval; dense sampling is not
 * relabelled as proof. Discontinuous connect/disconnect events need separate
 * intervals with an unchanged route/solid registry.
 */
export function auditSweptRoutes({sample,start=0,end=1,motionBound,motionBoundBasis,pairMotionBound=null,pairSeparationLowerBound=null,stationaryCertificate=null,stationaryMotionBound=null,stationaryMotionBasis=null,onInterval=null,maxSamples=Infinity,maxDepth=14,minInterval=1e-7,clearanceToleranceM=1e-7,auditOptions={}}){
 const issues=[],certified=[],unresolved=[];let samples=0,minimumClearanceM=Infinity,budgetExceeded=false;
 if(typeof sample!=='function'||!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return {ok:false,issues:[{code:'invalid-motion-domain'}],samples,certifiedIntervals:0,unresolvedIntervals:0};
 if(typeof motionBound!=='function'||!motionBoundBasis)return {ok:false,issues:[{code:'missing-motion-bound',message:'A conservative relative-motion bound and its basis are required for continuous certification'}],samples,certifiedIntervals:0,unresolvedIntervals:1};
 if(stationaryCertificate&&(!stationaryCertificates.has(stationaryCertificate)||typeof stationaryMotionBound!=='function'||typeof stationaryMotionBasis!=='string'||!stationaryMotionBasis.trim()))return {ok:false,issues:[{code:stationaryCertificates.has(stationaryCertificate)?'missing-stationary-motion-bound':'invalid-stationary-certificate'}],samples,certifiedIntervals:0,unresolvedIntervals:1};
 function at(t,boundFactory=null,witnessFactory=null,witnessSnapshots=null,stationaryFactory=null){if(samples>=maxSamples){if(!budgetExceeded)issues.push({code:'motion-sample-budget',maxSamples,time:t,message:'Continuous coverage remains unresolved; the sample budget is a release blocker.'});budgetExceeded=true;return null;}const snapshot=sample(t),record={snapshot:{...snapshot,routes:snapshot.routes||[],obstacles:snapshot.obstacles||[]},audit:auditRoutes(snapshot.routes,snapshot.obstacles||[],{...auditOptions,snapshotEvidence:snapshot,expectedRouteIds:snapshot.expectedRouteIds??auditOptions.expectedRouteIds,expectedObstacleIds:snapshot.expectedObstacleIds??auditOptions.expectedObstacleIds,...((pairMotionBound||pairSeparationLowerBound||stationaryCertificate)?{collectMotionPairs:true}:{}),...(stationaryCertificate?{stationaryCertificate}:{}),...(boundFactory?{pairMotionBound:pair=>boundFactory(pair,snapshot)}:{}),...(witnessFactory?{pairSeparationLowerBound:pair=>witnessFactory(pair,snapshot),witnessSnapshots}:{}),...(stationaryFactory?{stationaryMotionBound:participant=>stationaryFactory(participant,snapshot),stationaryMotionBasis,stationarySamples:witnessSnapshots}:{})})};samples++;minimumClearanceM=Math.min(minimumClearanceM,record.audit.minimumClearanceM);if(!record.audit.ok)issues.push(...(record.audit.issues.length?record.audit.issues:[{code:'failed-pose-audit',issueCount:record.audit.issueCount,message:'The pose audit failed even though its diagnostic issue limit suppressed the details.'}]).map(issue=>({...issue,time:t})));return record;}
 function visit(a,b,depth,left,right){
  if(budgetExceeded||!left||!right)return;
  const mid=(a+b)/2,center=at(mid,pairMotionBound?(pair,snapshot)=>pairMotionBound(a,b,pair,{start:left.snapshot,mid:snapshot,end:right.snapshot}):pairSeparationLowerBound||stationaryCertificate?(pair,snapshot)=>{const result=motionBound(a,b,{start:left.snapshot,mid:snapshot,end:right.snapshot});return typeof result==='number'?result:result?.maxDisplacementM;}:null,pairSeparationLowerBound?(pair,snapshot)=>pairSeparationLowerBound(a,b,pair,{start:left.snapshot,mid:snapshot,end:right.snapshot}):null,[left.snapshot,right.snapshot],stationaryCertificate?(participant,snapshot)=>stationaryMotionBound(a,b,participant,{start:left.snapshot,mid:snapshot,end:right.snapshot}):null);if(!center)return;if(!left.audit.ok||!center.audit.ok||!right.audit.ok)return;
  const result=motionBound(a,b,{start:left.snapshot,mid:center.snapshot,end:right.snapshot}),bound=typeof result==='number'?result:result?.maxDisplacementM;
  if(!Number.isFinite(bound)||bound<0){issues.push({code:'invalid-motion-bound',interval:[a,b]});return;}
  const observed=Math.max(snapshotMotion(left.snapshot,center.snapshot),snapshotMotion(right.snapshot,center.snapshot));
  if(!Number.isFinite(observed)){issues.push({code:'motion-topology-change',interval:[a,b],message:'Split at topology/disconnect events; route ids, sample counts and physical radii must stay fixed'});return;}
  if(observed>bound+clearanceToleranceM){issues.push({code:'understated-motion-bound',interval:[a,b],observedDisplacementM:observed,boundM:bound});return;}
  if(pairMotionBound){const ends=[left,right].map(x=>new Map(x.audit.motionPairs.map(p=>[p.key,p])));for(const p of center.audit.motionPairs)for(const map of ends){const q=map.get(p.key);if(!q)continue;const observedChange=Math.max(p.lowerM-q.upperM,q.lowerM-p.upperM,0);if(observedChange>p.boundM+clearanceToleranceM){issues.push({code:'understated-pair-motion-bound',interval:[a,b],kind:p.kind,routeId:p.routeId,otherRouteId:p.otherRouteId,obstacleId:p.obstacleId,observedClearanceChangeM:observedChange,boundM:p.boundM});return;}}}
  const certificate=pairMotionBound||pairSeparationLowerBound||stationaryCertificate?center.audit.minimumCertificateMarginM:center.audit.minimumClearanceM-bound;
  onInterval?.({a,b,depth,samples,certificateM:certificate,motionBoundM:bound,minimumClearanceM:center.audit.minimumClearanceM,worstPairs:(center.audit.motionPairs||[]).slice().sort((x,y)=>x.certificateLowerM-y.certificateLowerM).slice(0,8)});
  if(certificate>clearanceToleranceM){certified.push({start:a,end:b,clearanceLowerBoundM:certificate});return;}
  if(depth>=maxDepth||b-a<=minInterval){unresolved.push({start:a,end:b,clearanceM:center.audit.minimumClearanceM,motionBoundM:bound});return;}
  visit(a,mid,depth+1,left,center);visit(mid,b,depth+1,center,right);
 }
 visit(start,end,0,at(start),at(end));if(unresolved.length)issues.push({code:'unresolved-motion-clearance',intervals:unresolved.length,first:unresolved[0]});
 return {ok:issues.length===0&&unresolved.length===0,issues,samples,minimumClearanceM,certifiedIntervals:certified.length,unresolvedIntervals:unresolved.length+(budgetExceeded?1:0),intervals:certified,unresolved,motionBoundBasis,scope:'Finite-radius collision clearance for the supplied geometry and analytic motion bound; fabrication and qualification are separate.'};
}
