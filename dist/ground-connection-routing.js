import * as T from './vendor/three.module.js';
import {connectionTube} from './connection-geometry.js';
import {routeFromTube,routeClearance,routingMatrix} from './routing-audit.js';
import {roundedConnectionRoute} from './connection-routes.js';

// All units are metres. These are preliminary, source-labelled layout envelopes,
// not a cable part selection or a supplier's bend-life qualification.
const V=p=>p?.isVector3?p.clone():new T.Vector3(...p);
const EPS=1e-8;
function segmentBox(a,b,box){let lo=0,hi=1;for(const k of ['x','y','z']){const d=b[k]-a[k];if(Math.abs(d)<EPS){if(a[k]<=box.min[k]+EPS||a[k]>=box.max[k]-EPS)return false;}else{let p=(box.min[k]-a[k])/d,q=(box.max[k]-a[k])/d;if(p>q)[p,q]=[q,p];lo=Math.max(lo,p);hi=Math.min(hi,q);if(lo>=hi-EPS)return false;}}return hi>EPS&&lo<1-EPS;}
export function routeAroundObstacles(start,end,obstacles=[],{clearanceM=.015,bendRadiusM=.04,startNormal=null,endNormal=null,lane=0}={}){
 const a=V(start),b=V(end),lead=Math.max(bendRadiusM*2.1,clearanceM*3,.025),aa=startNormal?a.clone().addScaledVector(V(startNormal).normalize(),lead):a.clone(),bb=endNormal?b.clone().addScaledVector(V(endNormal).normalize(),lead):b.clone();
 const boxes=obstacles.map(o=>o.isBox3?o.clone():new T.Box3(V(o.min),V(o.max))).map(o=>o.expandByScalar(clearanceM+bendRadiusM));
 const axes=['x','y','z'];
 const candidates=[];
 for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]){
  const points=[a.clone()];if(aa.distanceTo(a)>EPS)points.push(aa.clone());let p=aa.clone();for(const axis of order){const q=p.clone();q[axes[axis]]=bb[axes[axis]];if(p.distanceTo(q)>EPS){points.push(q);p=q;}}if(p.distanceTo(b)>EPS)points.push(b.clone());
  if(points.slice(1).some((p,i)=>i>0&&i<points.length-2&&boxes.some(box=>segmentBox(points[i],p,box))))continue;
  const first=points[2]?.clone().sub(aa),last=points.at(-2)?.clone().sub(points.at(-3));if(startNormal&&first&&first.dot(V(startNormal))<-EPS||endNormal&&last&&last.dot(V(endNormal))>EPS)continue;
  const rounded=roundedConnectionRoute(points.map(p=>p.toArray()),bendRadiusM);if(rounded.minimumBendRadiusM+1e-7<bendRadiusM)continue;
  candidates.push({points,length:rounded.lengthM});
 }
 if(candidates.length)return candidates.sort((a,b)=>a.length-b.length)[0].points;
 const coords=axes.map(k=>[...new Set([aa[k],bb[k],...boxes.flatMap(o=>[o.min[k]-.0001,o.max[k]+.0001])])].sort((x,y)=>x-y));
 // Complete rectilinear visibility grid; each edge is checked as a segment,
 // not just at vertices, so a thin wall cannot be skipped.
 const [nx,ny,nz]=coords.map(c=>c.length),size=nx*ny*nz,id=(x,y,z)=>(x*ny+y)*nz+z,decode=n=>{const z=n%nz;n=(n-z)/nz;const y=n%ny;return [(n-y)/ny,y,z];},point=n=>{const q=decode(n);return new T.Vector3(...q.map((v,i)=>coords[i][v]));};
 const startId=id(...axes.map((k,i)=>coords[i].indexOf(aa[k]))),endId=id(...axes.map((k,i)=>coords[i].indexOf(bb[k]))),dist=new Float64Array(size).fill(Infinity),prev=new Int32Array(size).fill(-1),visited=new Uint8Array(size),heap=[];
 const push=(n,d)=>{heap.push([d,n]);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p][0]<=d)break;heap[i]=heap[p];i=p;}heap[i]=[d,n];};
 const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1][0]<heap[j][0])j++;if(last[0]<=heap[j][0])break;heap[i]=heap[j];i=j;}heap[i]=last;}return first;};
 dist[startId]=0;push(startId,0);
 while(heap.length){const [cost,n]=pop();if(visited[n])continue;visited[n]=1;if(n===endId)break;const q=decode(n),p=point(n);for(let axis=0;axis<3;axis++)for(const step of [-1,1]){const qq=q.slice();qq[axis]+=step;if(qq[axis]<0||qq[axis]>=coords[axis].length)continue;const nn=id(...qq);if(visited[nn])continue;const pp=point(nn),delta=pp.clone().sub(p);if(n===startId&&startNormal&&delta.dot(V(startNormal))<-EPS)continue;if(nn===endId&&endNormal&&delta.dot(V(endNormal))>EPS)continue;if(boxes.some(box=>segmentBox(p,pp,box)))continue;const next=cost+p.distanceTo(pp)+(axis===((lane%3)+3)%3?0:.00001);if(next+EPS<dist[nn]){dist[nn]=next;prev[nn]=n;push(nn,next);}}}
 if(!Number.isFinite(dist[endId]))throw new Error('No collision-free service route between '+a.toArray()+' and '+b.toArray());
 const path=[];for(let n=endId;n!==-1;n=prev[n])path.push(point(n));path.reverse();
 const result=[a];if(a.distanceTo(aa)>EPS)result.push(aa);for(const p of path.slice(1,-1)){const previous=result.at(-1),next=path[path.indexOf(p)+1];if(previous&&next&&p.clone().sub(previous).cross(next.clone().sub(p)).lengthSq()<EPS)continue;result.push(p);}if(bb.distanceTo(result.at(-1))>EPS)result.push(bb);if(b.distanceTo(bb)>EPS)result.push(b);
 return result;
}

export function addGroundTube(parent,{id,name=id,points,radiusM=.006,bendRadiusM=radiusM*10,material,segments=96,from=null,to=null,fromNormal=null,toNormal=null,scope='support',flex=false}={}){
 const tube=connectionTube(parent,{radius:radiusM,bendRadiusM,material,segments,radialSegments:6,name,part:scope==='launch'?'pad':'verification-harness'});tube.update(points);
 const record={id,tube,radiusM,minBendRadiusM:bendRadiusM,from:from||V(points[0]),to:to||V(points.at(-1)),fromNormal,toNormal,scope,flex,geometryBasis:'Preliminary layout; cable/hose part and dynamic life remain open'};
 tube.mesh.userData.groundConnection=record;
 tube.mesh.geometry.parameters={...(tube.mesh.geometry.parameters||{}),path:{getPoint:t=>tube.pointAt(t),getPointAt:t=>tube.pointAt(t),getLength:()=>tube.route.lengthM}};
 return tube;
}

// Compact fixtures need a choice of real lanes, not a spline that is hoped to
// miss the enclosure. Every proposed rounded centreline is screened against
// the same finite-radius solids and earlier independent circuits used by CI.
export function planGroundConnection(start,end,{id='ground-service',startNormal=[1,0,0],endNormal=[0,0,1],radiusM=.003,bendRadiusM=.018,obstacles=[],otherRoutes=[],bounds=null,lane=0}={}){
 const a=V(start),b=V(end),na=V(startNormal).normalize(),nb=V(endNormal).normalize(),axes=['x','y','z'],orders=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]],candidates=[],seen=new Set();
 const compact=points=>{const out=[];for(const p of points)if(!out.length||p.distanceTo(out.at(-1))>1e-7)out.push(p.clone());for(let i=1;i<out.length-1;i++){const u=out[i].clone().sub(out[i-1]).normalize(),v=out[i+1].clone().sub(out[i]).normalize();if(u.dot(v)>1-1e-7){out.splice(i,1);i--;}}return out;};
 const rect=(p,q,order)=>{const out=[p.clone()];for(const axis of order){p=p.clone();p[axes[axis]]=q[axes[axis]];out.push(p);}return out;};
 const add=points=>{points=compact(points);const key=points.map(p=>p.toArray().map(n=>n.toFixed(6)).join(',')).join(';');if(seen.has(key))return;seen.add(key);const rounded=roundedConnectionRoute(points.map(p=>p.toArray()),bendRadiusM);if(rounded.bendLimited)return;candidates.push({points,rounded});};
 const box=bounds?.isBox3?bounds:new T.Box3().setFromPoints([a,b]).expandByScalar(Math.max(.35,bendRadiusM*8)),stubValues=[Math.max(bendRadiusM*2.2,.055),Math.max(bendRadiusM*4.2,.13),Math.max(bendRadiusM*8.2,.26),Math.max(bendRadiusM*12,.40)];
 for(const la of stubValues)for(const lb of stubValues){const aa=a.clone().addScaledVector(na,la),bb=b.clone().addScaledVector(nb,lb);for(const order of orders)add([a,...rect(aa,bb,order),b]);}
 const size=box.getSize(new T.Vector3()),inset=Math.max(.04,bendRadiusM*2.2+radiusM),pool=axes.map(k=>[box.min[k]+inset,box.max[k]-inset,...[.18,.34,.50,.66,.82].map(f=>box.min[k]+size[k]*f),a[k]+(lane+1)*.075,a[k]-(lane+1)*.075,b[k]+(lane+1)*.075,b[k]-(lane+1)*.075].filter(x=>x>box.min[k]+radiusM&&x<box.max[k]-radiusM));
 for(const la of [stubValues[1],stubValues[3]])for(const lb of [stubValues[2],stubValues[3]]){
  const aa=a.clone().addScaledVector(na,la),bb=b.clone().addScaledVector(nb,lb);
  for(let k=0;k<3;k++)for(const value of pool[k]){const p=aa.clone(),q=bb.clone();p[axes[k]]=q[axes[k]]=value;for(const order of orders.filter(o=>o[2]===k))add([a,aa,...rect(p,q,order),bb,b]);}
 }
 const orderedObstacles=[...obstacles].sort((a,b)=>(a.type==='mesh')-(b.type==='mesh'));
 let failure=null;
 const select=()=>{candidates.sort((x,y)=>x.rounded.lengthM-y.rounded.lengthM);for(const candidate of candidates){const route={id,points:candidate.rounded.points,radiusM,clearanceM:.001},separation=routeClearance(route,[],{otherRoutes});if(!separation.ok){failure??=separation;continue;}const screen=routeClearance(route,orderedObstacles);if(screen.ok)return candidate.points;failure??=screen;}return null;};
 const simple=select();if(simple)return simple;candidates.length=0;
 // A second offset plane permits an over/under crossing without touching the
 // earlier cable or changing either connector's exit tangent.
 for(const la of [stubValues[1],stubValues[3]])for(const lb of [stubValues[2],stubValues[3]]){
  const aa=a.clone().addScaledVector(na,la),bb=b.clone().addScaledVector(nb,lb);
  for(const order of orders)for(const x of pool[order[0]].slice(2))for(const y of pool[order[1]].slice(2)){
   const p=aa.clone(),q=aa.clone(),r=bb.clone(),s=bb.clone();p[axes[order[0]]]=x;q[axes[order[0]]]=x;q[axes[order[1]]]=y;r[axes[order[0]]]=x;r[axes[order[1]]]=y;s[axes[order[1]]]=y;add([a,aa,p,q,r,s,bb,b]);
  }
 }
 const detour=select();if(detour)return detour;
 throw new Error('No clear bounded service lane: '+id+' ('+(failure?.obstacleId||failure?.otherRouteId||'bend/connector accommodation')+')');
}
export function groundConnectionRecords(root,{includeInvisible=false,frame=null,includeNode=null}={}){
 const routes=[];root.updateMatrixWorld(true);root.traverse(node=>{const r=node.userData.groundConnection;if(!r||includeNode&&!includeNode(node))return;if(!includeInvisible){for(let p=node;p&&p!==root.parent;p=p.parent)if(!p.visible)return;}const matrix=routingMatrix(node,frame),anchor=(point,normal)=>({position:V(point).applyMatrix4(matrix).toArray(),...(normal?{normal:V(normal).transformDirection(matrix).toArray()}:{})});routes.push(routeFromTube(r.tube,{id:r.id,frame,minBendRadiusM:r.minBendRadiusM,from:anchor(r.from,r.fromNormal),to:anchor(r.to,r.toNormal),flex:r.flex,scope:r.scope}));});
 // The feedthrough divides the rendered mesh for visibility/disposal only;
 // it remains one physical circuit. Merge the actual drawn centreline halves.
 for(const inside of routes.filter(r=>r.id.endsWith(':internal'))){const id=inside.id.slice(0,-9),outside=routes.find(r=>r.id===id+':external');if(!outside)continue;const junctionGap=V(inside.points.at(-1)).distanceTo(V(outside.points[0])),innerEndpointGap=V(inside.points.at(-1)).distanceTo(V(inside.to.position)),outerEndpointGap=V(outside.points[0]).distanceTo(V(outside.from.position));inside.id=id;inside.points.push(...outside.points.slice(1));inside.to=outside.to;inside.radiusM=Math.max(inside.radiusM,outside.radiusM);inside.minimumBendRadiusM=Math.min(inside.minimumBendRadiusM,outside.minimumBendRadiusM);inside.renderedCenterlineMismatchM=Math.max(inside.renderedCenterlineMismatchM||0,outside.renderedCenterlineMismatchM||0);inside.renderedEndpointMismatchM=Math.max(inside.renderedEndpointMismatchM||0,outside.renderedEndpointMismatchM||0,junctionGap,innerEndpointGap,outerEndpointGap);inside.junctionGapM=junctionGap;if(inside.bendRadiusBasis!==outside.bendRadiusBasis)delete inside.bendRadiusBasis;routes.splice(routes.indexOf(outside),1);}
 return routes;
}
