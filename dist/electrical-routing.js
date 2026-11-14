import {roundedConnectionRoute,routeLength} from './connection-routes.js';
import {segmentObstacleClearance,segmentSegmentDistance,routeClearance,auditRoutes,simplifyCollisionPolyline} from './routing-audit.js';
import {routingPlanPresets} from './routing-plan-presets.js';

// Deterministic physical accommodation. A route is selected once, from the
// actual solid geometry, then retained; it is never re-optimized during motion.
const add=(a,b,k=1)=>a.map((x,i)=>x+k*b[i]),sub=(a,b)=>add(a,b,-1),len=a=>Math.hypot(...a),unit=a=>a.map(x=>x/(len(a)||1));
const distance=(a,b)=>len(sub(a,b)),axes=[0,1,2],orders=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
const compact=points=>points.filter((p,i)=>!i||distance(p,points[i-1])>1e-7).filter((p,i,a)=>!i||i===a.length-1||len(sub(unit(sub(p,a[i-1])),unit(sub(a[i+1],p))))>1e-5);
const presetPlans=new Map(routingPlanPresets.map(p=>[p.key,p.controlPoints]));
export const routingPlanObservations=new Map();
const bounds=o=>o.bounds||{min:o.min,max:o.max};
const closedComponentCache=new WeakMap();
function closedMeshComponents(triangles){
 if(!Array.isArray(triangles)||triangles.length<8)return null;
 const immutable=Object.isFrozen(triangles)&&triangles.every(t=>Object.isFrozen(t)&&t.every(Object.isFrozen));if(immutable&&closedComponentCache.has(triangles))return closedComponentCache.get(triangles);
 const finish=value=>{if(immutable)closedComponentCache.set(triangles,value);return value;},parent=triangles.map((_,i)=>i),vertices=new Map(),edges=new Map();let vertexCount=0;
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;},join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;};
 for(let i=0;i<triangles.length;i++){
  const triangle=triangles[i];if(!Array.isArray(triangle)||triangle.length!==3||triangle.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)))return finish(null);
  const ids=triangle.map(p=>{const key=p.join(',');if(!vertices.has(key))vertices.set(key,vertexCount++);return vertices.get(key);});if(new Set(ids).size!==3)return finish(null);
  const u=sub(triangle[1],triangle[0]),v=sub(triangle[2],triangle[0]);if(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])<=1e-18)return finish(null);
  for(let k=0;k<3;k++){const a=ids[k],b=ids[(k+1)%3],key=Math.min(a,b)+':'+Math.max(a,b),direction=a<b?1:-1,prior=edges.get(key);if(prior){if(++prior.count>2||prior.direction===direction)return finish(null);join(i,prior.triangle);}else edges.set(key,{triangle:i,count:1,direction});}
 }
 // Exact shared vertices and two oppositely directed faces at every edge
 // prove each component is a closed shell. Gaps, nonmanifold joins, collapsed
 // faces and ambiguous seams retain the original mesh/whole-bound fallback.
 if([...edges.values()].some(e=>e.count!==2))return finish(null);
 const components=new Map();for(let i=0;i<triangles.length;i++){const key=find(i);if(!components.has(key))components.set(key,{triangles:[],bounds:{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]}});const component=components.get(key);component.triangles.push(triangles[i]);for(const p of triangles[i])for(const k of axes){component.bounds.min[k]=Math.min(component.bounds.min[k],p[k]);component.bounds.max[k]=Math.max(component.bounds.max[k],p[k]);}}
 if(components.size<2)return finish(null);const result=[...components.values()];if(immutable)for(const component of result)Object.freeze(component.triangles);return finish(result);
}
const key=points=>points.map(p=>p.map(x=>x.toFixed(5)).join(',')).join(';');
const overlaps=(a,b,o,pad)=>{const bb=bounds(o);return axes.every(i=>Math.max(a[i],b[i])+pad>=bb.min[i]&&Math.min(a[i],b[i])-pad<=bb.max[i]);};
function firstSolid(points,obstacles,radiusM,id){
 if(!obstacles.length)return null;const query=spatialIndex(obstacles);
 for(let i=0;i<points.length-1;i++)for(const o of query(points[i],points[i+1],radiusM)){if(!overlaps(points[i],points[i+1],o,radiusM))continue;if(segmentObstacleClearance(points[i],points[i+1],o,{radiusM,routeId:id})<-1e-8)return {index:i,obstacle:o};}return null;
}
function rectilinear(a,b,order){const out=[[...a]],p=[...a];for(const axis of order){p[axis]=b[axis];out.push([...p]);}return compact(out);}

export function planElectricalRoute(from,to,{id='route',fromNormal=[1,0,0],toNormal=[-1,0,0],radiusM=.003,bendRadiusM=.05,obstacles=[],otherRoutes=[],waypoints=[],candidateControls=null,clearanceM=.002,maxAttempts=900,gridStepM=null,gridMarginM=null,maxGridNodes=65000}={}){
 if(otherRoutes.length){const occupied=[],deviationM=2e-6;for(const route of otherRoutes){
  // A capsule around each simplified chord, enlarged by the complete RDP
  // deviation, contains every original rendered interval. This reduces long
  // straight96-ring pipes to one conservative occupied solid without losing
  // their finite radius or granting any previous route a collision exemption.
  const points=simplifyCollisionPolyline(route.points,deviationM),r=route.radiusM+deviationM;
  for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];occupied.push({id:route.id+':segment:'+i,type:'capsule',a,b,radiusM:r,bounds:{min:axes.map(k=>Math.min(a[k],b[k])-r),max:axes.map(k=>Math.max(a[k],b[k])+r)}});
 }}obstacles=[...obstacles,...occupied];}
 const a=[...from],b=[...to],r=bendRadiusM,na=unit(fromNormal),nb=unit(toNormal),lead=r*2.4+.015;
 for(const [end,point] of [['from',a],['to',b]]){const hit=firstSolid([point,point],obstacles,radiusM+clearanceM,id);if(hit){const controlPoints=[a,add(a,na,lead),add(b,nb,lead),b];return {...roundedConnectionRoute(controlPoints,r),ok:false,controlPoints,attempts:0,screen:{reason:'connector-exit-inside-solid',end,obstacleId:hit.obstacle.id,terminalBlocked:true}};}}
 const cacheKey=JSON.stringify([a,b,na,nb,radiusM,r,waypoints].map(x=>x)),remember=result=>{if(result.ok)routingPlanObservations.set(cacheKey,{key:cacheKey,controlPoints:result.controlPoints.map(p=>[...p])});return result;};
 const candidate=routingPlanObservations.get(cacheKey)?.controlPoints||presetPlans.get(cacheKey);
 // An installer may propose controls for one exact interface. The proposal
 // enters the same finite-radius, endpoint/self and complete occupied-solid
 // admission as cached plans; it never supplies an acceptance exemption.
 for(const [controls,hinted] of [[candidateControls,true],[candidate,false]]){
  if(!Array.isArray(controls)||controls.length<2||controls.some(p=>!Array.isArray(p)||p.length!==3||p.some(x=>!Number.isFinite(x))))continue;
  const shape=roundedConnectionRoute(controls,r),endpoints=auditRoutes([{id,points:shape.points,radiusM,from:{position:a,normal:na},to:{position:b,normal:nb}}],[],{stopAfterFirstIssue:true,maxIssues:1});
  if(!shape.bendLimited&&endpoints.ok){const screen=routeClearance({id,points:shape.points,radiusM,clearanceM},obstacles);if(screen.ok)return remember({...shape,ok:true,controlPoints:controls,attempts:0,minimumClearanceM:screen.minimumClearanceM,...(hinted?{constructionHintAccepted:true}:{cacheHit:true})});}
 }
 // Mass balancing can shift a real connector by a fraction of a millimetre.
 // Nearby constructions are only search seeds: move each straight endpoint
 // lead with its connector, then recheck the entire new finite-radius route.
 // Adjacent circuits may also propose a translated construction up to250mm
 // away; their entire path is translated before reconnecting the final lead.
 // Neither proposal inherits any previous collision or self-clearance result.
 const nearby=[];for(const record of [...routingPlanObservations.values(),...routingPlanPresets]){
  if(record.key===cacheKey||record.controlPoints.length<4)continue;const [ca,cb,cna,cnb,cr,cR,cw]=JSON.parse(record.key);
  if(distance(ca,a)>.25||distance(cb,b)>.25||distance(cna,na)>1e-8||distance(cnb,nb)>1e-8||Math.abs(cr-radiusM)>1e-6||Math.abs(cR-r)>1e-7||cw.length!==waypoints.length)continue;
  const da=sub(a,ca),db=sub(b,cb),sameWaypoints=cw.every((p,i)=>distance(p,waypoints[i])<=1e-8),translatedWaypoints=cw.every((p,i)=>distance(add(p,da),waypoints[i])<=1e-8);
  if(!sameWaypoints&&!translatedWaypoints)continue;
  nearby.push({record,score:distance(ca,a)+distance(cb,b),da,db,translateMiddle:!sameWaypoints});
 }nearby.sort((a,b)=>a.score-b.score);
 for(const seed of nearby.slice(0,8)){const localNudge=!seed.translateMiddle&&Math.max(len(seed.da),len(seed.db))<=.005,controls=seed.record.controlPoints.map((p,i,all)=>i>=all.length-2?add(p,seed.db):i<2||!localNudge?add(p,seed.da):[...p]),shape=roundedConnectionRoute(controls,r);if(shape.bendLimited)continue;
  const endpoints=auditRoutes([{id,points:shape.points,radiusM,from:{position:a,normal:na},to:{position:b,normal:nb}}],[],{stopAfterFirstIssue:true,maxIssues:1});if(!endpoints.ok)continue;const screen=routeClearance({id,points:shape.points,radiusM,clearanceM},obstacles);if(screen.ok)return remember({...shape,ok:true,controlPoints:controls,attempts:0,minimumClearanceM:screen.minimumClearanceM,adaptedCandidate:true});
 }
 function approach(point,n){const minimum=r*1.04+.001;let lo=minimum,hi=lead;if(!firstSolid([point,add(point,n,hi)],obstacles,radiusM+clearanceM,id))return add(point,n,hi);for(let k=0;k<18;k++){const mid=(lo+hi)/2;if(firstSolid([point,add(point,n,mid)],obstacles,radiusM+clearanceM,id))hi=mid;else lo=mid;}return add(point,n,Math.max(minimum,lo-.003));}
 const p=approach(a,na),q=approach(b,nb),queue=[],seen=new Set();let attempts=0,best=null;
 const enqueue=(points,penalty=0)=>{const middle=points.slice(1,-1);if(!middle.length||distance(middle[0],p)>1e-7)middle.unshift(p);if(distance(middle.at(-1),q)>1e-7)middle.push(q);points=compact([a,...middle,b]);if(points.length>31)return;const k=key(points);if(seen.has(k))return;seen.add(k);queue.push({points,score:routeLength(points)+points.length*.025+penalty});};
 const validShape=rounded=>auditRoutes([{id,points:rounded.points,radiusM,from:{position:a,normal:na},to:{position:b,normal:nb}}],[],{stopAfterFirstIssue:true,maxIssues:1}).ok;
 if(!waypoints.length){
  const candidates=[[a,p,q,b]];for(const axis of axes)for(const sign of [-1,1]){const value=(sign<0?Math.min(p[axis],q[axis]):Math.max(p[axis],q[axis]))+sign*(r*2.2+.030),u=[...p],v=[...q];u[axis]=v[axis]=value;candidates.push([a,p,u,v,q,b]);}
  for(const input of candidates){const controls=compact(input);if(firstSolid(controls,obstacles,radiusM+clearanceM,id))continue;const shape=roundedConnectionRoute(controls,r);if(shape.bendLimited||!validShape(shape))continue;const screen=routeClearance({id,points:shape.points,radiusM,clearanceM},obstacles);if(screen.ok)return remember({...shape,ok:true,controlPoints:controls,attempts:0,minimumClearanceM:screen.minimumClearanceM});}
 }
 // A free bay may admit an oblique span between the two tangent leads.
 // Its actual circular fillets, self-clearance and finite-radius solid
 // clearance pass the same checks as every orthogonal candidate.
 enqueue([a,p,...waypoints,q,b]);
 for(const order of orders){let pts=[a,p],start=p;for(const target of [...waypoints,q]){pts.push(...rectilinear(start,target,order).slice(1));start=target;}pts.push(b);enqueue(pts);}
 while(queue.length&&attempts++<Math.min(18,maxAttempts)){
  queue.sort((a,b)=>a.score-b.score);const candidate=queue.shift(),pts=candidate.points;
  const collision=firstSolid(pts,obstacles,radiusM+clearanceM,id);
  if(!collision){
   const rounded=roundedConnectionRoute(pts,r),screen=routeClearance({id,points:rounded.points,radiusM,clearanceM},obstacles);
   if(!rounded.bendLimited&&screen.ok&&validShape(rounded))return remember({ok:true,points:pts,...rounded,controlPoints:pts,attempts,minimumClearanceM:screen.minimumClearanceM});
   if(!best||(!rounded.bendLimited&&best.bendLimited))best={...rounded,controlPoints:pts,screen,attempts,ok:false};
   // Keep a problematic corner away from the solid by displacing its route
   // vertex, never by exempting that solid from the audit.
   if(screen.obstacleId){const o=obstacles.find(o=>o.id===screen.obstacleId),i=Math.min(pts.length-2,Math.max(1,Math.round((screen.segment+1)/rounded.points.length*pts.length)));for(const axis of axes)for(const sign of [-1,1]){const next=pts.map(p=>[...p]);next[i][axis]=(sign<0?bounds(o).min[axis]:bounds(o).max[axis])+sign*(r*2.2+radiusM+clearanceM);enqueue(next,.1);}}
   if(screen.otherRouteId){const other=otherRoutes.find(o=>o.id===screen.otherRouteId),j=screen.segments[1],otherBox={min:axes.map(i=>Math.min(other.points[j][i],other.points[j+1][i])-other.radiusM),max:axes.map(i=>Math.max(other.points[j][i],other.points[j+1][i])+other.radiusM)};for(let i=1;i<pts.length-2;i++)if(overlaps(pts[i],pts[i+1],otherBox,radiusM+.003))detour(pts,i,{...otherBox,bounds:otherBox},r*2.2+radiusM+.004,enqueue);}
   if(rounded.bendLimited){for(let i=1;i<pts.length-1;i++)for(const axis of axes)for(const sign of [-1,1]){const next=pts.map(p=>[...p]);next[i][axis]+=sign*r*2.2;enqueue(next,.3);}}
   continue;
  }
  // A blocked connector lead means the connector accommodation itself is
  // wrong. The caller must relocate its bank; a route cannot pass through it.
  if(collision.index===0||collision.index===pts.length-2){
   const first=collision.index===0,short=first?[a,p]:[q,b],hit=firstSolid(short,obstacles,radiusM+clearanceM,id);
   if(hit){if(!best)best={ok:false,controlPoints:pts,screen:{obstacleId:hit.obstacle.id,terminalBlocked:true},attempts};continue;}
   // Compacting a collinear approach must not turn a distant obstruction into
   // an allegedly blocked connector. Restore just the physical straight lead.
   const expanded=first?[a,p,...pts.slice(1)]:[...pts.slice(0,-1),q,b];
   detour(expanded,first?1:expanded.length-3,collision.obstacle,r*2.2+radiusM+clearanceM,enqueue);continue;
  }
  detour(pts,collision.index,collision.obstacle,r*2.2+radiusM+clearanceM,enqueue);
 }
 // A bounded orthogonal visibility search handles occupied bays which cannot
 // be cleared by one local detour. Its turn state reserves real fillet length.
 const stops=[p,...waypoints,q];
 function reservedPrefix(points,trim){const result=[],total=routeLength(points);let travelled=0;for(let k=1;k<points.length;k++){const x=points[k-1],y=points[k],length=distance(x,y),keep=Math.min(length,total-trim-travelled);if(keep>1e-7){const z=add(x,sub(y,x),keep/length);result.push({id:id+':already-routed:'+k,type:'capsule',a:x,b:z,radiusM,bounds:{min:axes.map(i=>Math.min(x[i],z[i])-radiusM),max:axes.map(i=>Math.max(x[i],z[i])+radiusM)}});}travelled+=length;}return result;}
 function visibilitySearch(searchSolids,maxNodes){const joined=[a];for(let i=1;i<stops.length;i++){
  const start=stops[i-1],finish=stops[i];if(i===1)joined.push(start);
  const incoming=i===1?na:unit(sub(joined.at(-1),joined.at(-2))),outgoing=i===stops.length-1?nb.map(x=>-x):unit(sub(stops[i+1],stops[i]));
  const searchObstacles=[...searchSolids,...reservedPrefix(joined,r*2.1+radiusM*2),...reservedPrefix([b,q],r*2.1+radiusM*2)];
  const finalLeg=i===stops.length-1,acceptPath=path=>{const pts=compact([...joined,...path.slice(1),...(finalLeg?[b]:[])]),shape=roundedConnectionRoute(pts,r);return finalLeg?!shape.bendLimited&&validShape(shape)&&routeClearance({id,points:shape.points,radiusM,clearanceM},obstacles).ok:auditRoutes([{id,points:shape.points,radiusM}],[],{stopAfterFirstIssue:true,maxIssues:1}).ok;};
  const path=gridPath(start,finish,{obstacles:searchObstacles,radiusM:radiusM+clearanceM,bendRadiusM:r,id,maxNodes,incoming,outgoing,gridStepM,gridMarginM,acceptPath});
  if(!path)return {ok:false,controlPoints:[a,p,...waypoints,q,b],screen:{reason:'no-free-route',...gridPath.lastFailure},gridFailure:gridPath.lastFailure,attempts};joined.push(...path.slice(1));
 }joined.push(b);const pts=compact(joined),rounded=roundedConnectionRoute(pts,r),screen=routeClearance({id,points:rounded.points,radiusM,clearanceM},obstacles);return {...rounded,ok:!rounded.bendLimited&&screen.ok&&validShape(rounded),controlPoints:pts,screen,attempts,minimumClearanceM:screen.minimumClearanceM};}
 // Remote closed components are enclosed by their complete bounds for a
 // cheap search proposal. This preserves aisles between separate tray pieces
 // which happen to share one merged material mesh. Each shell's bounding box
 // encloses both its faces and its complete interior. Ambiguous topology keeps
 // the original mesh or its conservative whole bound. Connector/waypoint
 // neighbourhoods retain exact component triangles; every scoped aperture
 // and every finite-radius occupied capsule stay exact. Filling a
 // remote cavity can only reject a possible corridor; the original search
 // remains the fallback. Both searches validate each complete rounded result
 // against the unchanged original solids, occupied routes and endpoint/self
 // checks above before it can become a retained construction candidate.
 const protectedPoints=[a,b,p,q,...waypoints],nearDistance=Math.max(.25,2*r+.15),near=bb=>protectedPoints.some(point=>Math.hypot(...axes.map(k=>Math.max(bb.min[k]-point[k],0,point[k]-bb.max[k])))<nearDistance);let coarseObstacleCount=0,coarseComponentCount=0;
 const coarseObstacles=obstacles.flatMap(o=>{if(o.type!=='mesh'||o.apertures?.length)return [o];const bb=bounds(o);if(!bb?.min?.every(Number.isFinite)||!bb?.max?.every(Number.isFinite))return [o];const components=closedMeshComponents(o.triangles);if(components){let changed=false;const pieces=components.map((component,index)=>{const id=o.id+':proposal-component:'+index;if(near(component.bounds))return {id,type:'mesh',triangles:component.triangles,closed:true,bounds:component.bounds};changed=true;coarseComponentCount++;return {id,type:'box',min:component.bounds.min,max:component.bounds.max,bounds:component.bounds};});if(changed)coarseObstacleCount++;return pieces;}if(near(bb))return [o];coarseObstacleCount++;coarseComponentCount++;return [{id:o.id,type:'box',min:bb.min,max:bb.max,bounds:bb}];});
 if(coarseObstacleCount){const proposal=visibilitySearch(coarseObstacles,Math.min(5000,maxGridNodes));if(proposal.ok)return remember({...proposal,visibilitySearch:'conservative-bounds',coarseObstacleCount,coarseComponentCount});}
 const exact=visibilitySearch(obstacles,maxGridNodes);if(exact.ok)return remember({...exact,visibilitySearch:'exact',coarseObstacleCount,coarseComponentCount});
 if(exact.gridFailure){if(best)best.gridFailure=exact.gridFailure;else best=exact;}else if(!best||exact.screen?.ok)best=exact;
 const failed=best||{ok:false,controlPoints:[a,p,...waypoints,q,b],attempts,screen:{reason:'no-free-route'}};
 return {...roundedConnectionRoute(failed.controlPoints,r),...failed,attempts};
}

class Heap{
 constructor(){this.a=[];}push(v){const a=this.a;a.push(v);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].f<=v.f)break;a[i]=a[p];i=p;}a[i]=v;}pop(){const a=this.a,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(a[j].f>=last.f)break;a[i]=a[j];i=j;}a[i]=last;}return first;}get length(){return this.a.length;}
}
const indexCache=new WeakMap();
function spatialIndex(obstacles){
 if(indexCache.has(obstacles))return indexCache.get(obstacles);
 function build(list){const bb={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};for(const obstacle of list){const box=bounds(obstacle);for(const axis of axes){bb.min[axis]=Math.min(bb.min[axis],box.min[axis]);bb.max[axis]=Math.max(bb.max[axis],box.max[axis]);}}if(list.length<=9)return {...bb,items:list};const axis=axes.reduce((a,b)=>bb.max[b]-bb.min[b]>bb.max[a]-bb.min[a]?b:a,0);list.sort((a,b)=>bounds(a).min[axis]+bounds(a).max[axis]-bounds(b).min[axis]-bounds(b).max[axis]);const mid=list.length>>1;return {...bb,left:build(list.slice(0,mid)),right:build(list.slice(mid))};}
 const tree=build([...obstacles]);function query(a,b,pad){const result=[],stack=[tree];while(stack.length){const n=stack.pop();if(!overlaps(a,b,n,pad))continue;if(n.items)result.push(...n.items);else stack.push(n.left,n.right);}return result;}
 indexCache.set(obstacles,query);return query;
}
function gridPath(a,b,{obstacles,radiusM,bendRadiusM,id,maxNodes,incoming,outgoing,gridStepM,gridMarginM,acceptPath}){
 gridPath.lastFailure=null;
 const query=spatialIndex(obstacles),free=(x,y)=>query(x,y,radiusM).every(o=>!overlaps(x,y,o,radiusM)||segmentObstacleClearance(x,y,o,{radiusM,routeId:id})>=-1e-7);
 const direction=v=>{const k=axes.reduce((a,b)=>Math.abs(v[b])>Math.abs(v[a])?b:a,0);return Math.abs(v[k])>.999?k*2+(v[k]>0?1:0):-1;},inDir=direction(incoming),outDir=direction(outgoing),straightDir=direction(unit(sub(b,a)));
 if(free(a,b)&&axes.filter(i=>Math.abs(a[i]-b[i])>1e-7).length<=1&&straightDir!==(inDir^1)&&straightDir!==(outDir^1)&&(!acceptPath||acceptPath([[...a],[...b]])))return [[...a],[...b]];
 if(!free(a,a)||!free(b,b)){const p=!free(a,a)?a:b,o=query(p,p,radiusM).find(o=>segmentObstacleClearance(p,p,o,{radiusM,routeId:id})<-1e-7);gridPath.lastFailure={reason:'waypoint-inside-solid',point:p,obstacleId:o?.id};return null;}
 const step=gridStepM??Math.max(.045,Math.min(.11,bendRadiusM*.8)),margin=gridMarginM??Math.max(.45,bendRadiusM*3.3);
 const coords=axes.map(k=>{const lo=Math.min(a[k],b[k])-margin,hi=Math.max(a[k],b[k])+margin,out=[a[k],b[k]];for(let x=lo;x<=hi;x+=step)out.push(x);return [...new Set(out.map(x=>+x.toFixed(8)))].sort((x,y)=>x-y);});
 const at=p=>coords.map((a,k)=>a.reduce((best,x,j)=>Math.abs(x-p[k])<Math.abs(a[best]-p[k])?j:best,0)),from=at(a),to=at(b),point=cell=>cell.map((i,k)=>coords[k][i]),distanceTo=cell=>cell.reduce((s,i,k)=>s+Math.abs(coords[k][i]-b[k]),0);
 const needed=bendRadiusM*2.06,quant=step/2,start={cell:from,dir:inDir,run:needed,g:0,prev:null,f:distanceTo(from)},heap=new Heap(),visited=new Map(),freeCache=new Map();heap.push(start);let nodes=0;
 const turnCache=new Map(),vector=d=>axes.map(k=>k===(d>>1)?(d%2?1:-1):0);
 function clearTurn(cell,oldDir,newDir){if(oldDir<0||newDir<0||oldDir===newDir)return true;if(newDir===(oldDir^1))return false;const k=cell.join(',')+'/'+oldDir+'/'+newDir;if(turnCache.has(k))return turnCache.get(k);const p=point(cell),ends=[add(p,vector(oldDir),-bendRadiusM*1.02),p,add(p,vector(newDir),bendRadiusM*1.02)],lo=axes.map(i=>Math.min(...ends.map(p=>p[i]))),hi=axes.map(i=>Math.max(...ends.map(p=>p[i]))),near=query(lo,hi,radiusM);if(!near.length){turnCache.set(k,true);return true;}const pts=roundedConnectionRoute(ends,bendRadiusM).points;let ok=true;for(let i=1;i<pts.length&&ok;i++)for(const o of near)if(overlaps(pts[i-1],pts[i],o,radiusM)&&segmentObstacleClearance(pts[i-1],pts[i],o,{radiusM,routeId:id})<-1e-7){ok=false;break;}turnCache.set(k,ok);return ok;}
 const state=(c,d,r)=>c.join(',')+'/'+d+'/'+Math.min(32,Math.floor(r/quant));
 while(heap.length&&nodes++<maxNodes){const n=heap.pop(),nk=state(n.cell,n.dir,n.run);if(visited.has(nk)&&visited.get(nk)<n.g-1e-8)continue;
  if(n.cell.every((v,k)=>v===to[k])&&(outDir<0||n.dir===outDir||(n.dir!==(outDir^1)&&n.run+1e-8>=needed))&&clearTurn(n.cell,n.dir,outDir)){const path=[];for(let p=n;p;p=p.prev)path.push(point(p.cell));const result=compact(path.reverse());if(!acceptPath||acceptPath(result))return result;}
  const p=point(n.cell);
  for(let d=0;d<6;d++){
   if(n.dir>=0&&(d===(n.dir^1)||(d!==n.dir&&n.run+1e-8<needed)))continue;
   if(d!==n.dir&&!clearTurn(n.cell,n.dir,d))continue;
   const axis=d>>1,cell=[...n.cell];cell[axis]+=d%2?1:-1;if(cell[axis]<0||cell[axis]>=coords[axis].length)continue;
   const q=point(cell),length=distance(p,q),edge=n.cell.join(',')+'>'+cell.join(',');let clear=freeCache.get(edge);if(clear===undefined){clear=free(p,q);freeCache.set(edge,clear);}if(!clear)continue;
   // Heading-aware search can revisit a point from another direction. Do not
   // accept that as a cable loop through its own already traversed centreline.
   let separated=true,walked=0;for(let prior=n;prior?.prev;prior=prior.prev){const x=point(prior.cell),y=point(prior.prev.cell);walked+=distance(x,y);if(walked<bendRadiusM*2.1)continue;const bb={bounds:{min:axes.map(i=>Math.min(x[i],y[i])),max:axes.map(i=>Math.max(x[i],y[i]))}};if(overlaps(p,q,bb,2*radiusM)&&segmentSegmentDistance(p,q,x,y).distanceM<2*radiusM-1e-7){separated=false;break;}}if(!separated)continue;
   const run=Math.min(needed,(d===n.dir?n.run:0)+length),g=n.g+length+(n.dir>=0&&d!==n.dir?.04:0),k=state(cell,d,run);if(visited.has(k)&&visited.get(k)<=g)continue;visited.set(k,g);heap.push({cell,dir:d,run,g,prev:n,f:g+distanceTo(cell)*1.45});
  }
 }
 gridPath.lastFailure={reason:heap.length?'search-bound':'no-connected-corridor',from:a,to:b,nodes};return null;
}
function detour(pts,i,obstacle,pad,enqueue){
 const a=pts[i],b=pts[i+1],bb=bounds(obstacle),delta=sub(b,a),dominant=axes.reduce((k,j)=>Math.abs(delta[j])>Math.abs(delta[k])?j:k,0);
 for(const axis of axes.filter(j=>j!==dominant))for(const sign of [-1,1]){
  const side=(sign<0?Math.min(bb.min[axis],a[axis],b[axis]):Math.max(bb.max[axis],a[axis],b[axis]))+sign*pad;
  const x=[...a],y=[...b];x[axis]=y[axis]=side;enqueue([...pts.slice(0,i+1),x,y,...pts.slice(i+1)]);
 }
}

// C1 cubic flex loop with a fixed developed length. Only the local flex zone
// changes shape. End positions and tangents remain on the same clamps.
export function fixedLengthFlex(from,to,{fromTangent,toTangent,restLengthM,bendRadiusM=.05,normal=[0,1,0],samples=72}={}){
 const a=[...from],b=[...to],u=unit(fromTangent),v=unit(toTangent),n=unit(normal);
 function shape(amplitude){const lead=Math.max(bendRadiusM*2,.04),c=add(a,u,lead),d=add(b,v,-lead),out=[];for(let i=0;i<=samples;i++){const t=i/samples,s=1-t,base=axes.map(k=>s*s*s*a[k]+3*s*s*t*c[k]+3*s*t*t*d[k]+t*t*t*b[k]),bulge=amplitude*16*t*t*s*s;out.push(add(base,n,bulge));}return out;}
 let lo=0,hi=Math.max(restLengthM,.1);for(let i=0;i<28;i++){const mid=(lo+hi)/2;if(routeLength(shape(mid))<restLengthM)lo=mid;else hi=mid;}const points=shape((lo+hi)/2);
 let minimum=Infinity;for(let i=1;i<points.length-1;i++){const x=sub(points[i],points[i-1]),y=sub(points[i+1],points[i]),z=sub(points[i+1],points[i-1]),area2=len([x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]]);if(area2>1e-10)minimum=Math.min(minimum,len(x)*len(y)*len(z)/(2*area2));}
 return {points,lengthM:routeLength(points),minimumBendRadiusM:minimum,bendLimited:minimum+1e-5<bendRadiusM};
}
