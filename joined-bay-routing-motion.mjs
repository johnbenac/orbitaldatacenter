import * as T from './dist/vendor/three.module.js';
import {INTEGRATION_TIMES,integrationState} from './dist/integration-sequence.js';
import {bayHandlingPose} from './dist/integration-rig.js';
import {cargoBay} from './dist/starship-cargo.js';
import {segmentObstacleClearance} from './dist/routing-audit.js';

const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,k)=>a.map(v=>v*k),norm=p=>Math.hypot(...p),unit=p=>mul(p,1/(norm(p)||1));
const I=x=>Array.isArray(x)?x:[x,x],plus=(a,b)=>[I(a)[0]+I(b)[0],I(a)[1]+I(b)[1]],minus=(a,b)=>[I(a)[0]-I(b)[1],I(a)[1]-I(b)[0]],times=(a,b)=>{const v=I(a).flatMap(x=>I(b).map(y=>x*y));return [Math.min(...v),Math.max(...v)];};
const smooth=x=>{const q=Math.max(0,Math.min(1,x));return q*q*(3-2*q);},ramp=(q,a,b)=>I(q).map(x=>smooth((x-a)/(b-a)));
const trig=(sine,cosine,lo,hi)=>{const values=[sine*Math.sin(lo)+cosine*Math.cos(lo),sine*Math.sin(hi)+cosine*Math.cos(hi)],first=Math.atan2(sine,cosine);for(let k=Math.floor((lo-first)/Math.PI)-1;k<=Math.ceil((hi-first)/Math.PI)+1;k++){const t=first+k*Math.PI;if(t>=lo&&t<=hi)values.push(sine*Math.sin(t)+cosine*Math.cos(t));}return [Math.min(...values),Math.max(...values)];};
const vector=(x=0,y=0,z=0)=>[I(x),I(y),I(z)],translate=(a,b)=>a.map((r,i)=>plus(r,b[i]));
const rotateYPoint=(height,angle)=>[times(-height,trig(1,0,...angle)),times(height,trig(0,1,...angle)),[0,0]];
const point=(p,m)=>new T.Vector3(...p).applyMatrix4(m).toArray(),direction=(p,m)=>new T.Vector3(...p).transformDirection(m).toArray();
const corners=b=>Array.from({length:8},(_,i)=>b.min.map((v,k)=>i&(1<<k)?b.max[k]:v));
const box=ps=>({min:[0,1,2].map(k=>Math.min(...ps.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...ps.map(p=>p[k])))});
const displacement=(ranges,p)=>Math.hypot(...ranges.map((q,i)=>Math.max(Math.abs(q[0]-p[i]),Math.abs(q[1]-p[i]))));
const PAD=4e-6;

// Interval extension of bayHandlingPose. Products retain both endpoint
// extrema, and each smoothstep is monotone on its clamped input. This is an
// enclosure of every intermediate transform, not a hull of sampled poses.
export function bayMotionEnclosure(h,g,a,b,{held=false}={}){
 const at=t=>integrationState(held?Math.min(t,-3000):t),lo=at(a),hi=at(b),mid=at((a+b)/2),seat=[lo.seat,hi.seat],close=h.fairing.fit?[lo.close,hi.close]:[0,0],lift=h.fairing.fit?[lo.lift,hi.lift]:[0,0],transfer=h.fairing.fit?[lo.transfer,hi.transfer]:[0,0],mate=h.fairing.fit?[lo.mate,hi.mate]:[0,0],pose=bayHandlingPose(h,g,mid),zero=[0,0],effectiveClose=h.fairing.fit?mid.close:0;
 let article,assembly,cap,angle=zero;
 if(g.star){
  const C=times(cargoBay.strokeM,times(close,minus(1,transfer)));
  assembly=vector(minus(g.receiverX,C),g.portY+cargoBay.deckM,0);cap=vector(g.receiverX,g.portY,0);
  article=mid.lift>=1?assembly:vector(times(g.receiverX-cargoBay.strokeM,ramp(close,.48,1)),minus(times(g.portY+cargoBay.deckM+1.1,ramp(close,0,.48)),times(1.1,lift)),0);
 }else{
  const clearY=g.horizontal?g.portY:g.portY+Math.max(g.radius,2);
  angle=g.horizontal?times(Math.PI/2,ramp(lift,.35,1)):zero;
  if(g.horizontal)assembly=vector(minus(plus(g.ringX,times(g.receiverX-g.ringX,transfer)),times(3,times(minus(1,mate),transfer))),times(clearY,ramp(lift,0,.35)),0);
  else assembly=vector(plus(plus(g.ringX,times(g.receiverX-g.space-g.ringX,transfer)),times(g.space,ramp(mate,.48,.78))),minus(plus(times(1.1,lift),times(clearY-1.1,ramp(mate,0,.45))),times(clearY-g.portY,ramp(mate,.8,1))),0);
  article=mid.seat<1?vector(times(g.ringX,ramp(seat,.22,.75)),times(1.8,minus(ramp(seat,0,.24),ramp(seat,.77,1))),0):assembly;
  cap=g.wholeCap&&effectiveClose<1?vector(g.ringX,times(h.stowedLengthM+1.5,minus(ramp(close,0,.3),ramp(close,.72,1))),times(-g.space,minus(1,ramp(close,.33,.68)))):assembly;
 }
 const capped=!g.star&&mid.close>0&&h.fairing.fit,pickCap=g.wholeCap&&capped&&mid.close<1,loadKind=pickCap||capped&&mid.close===1?'fairing':'payload',loadRoot=loadKind==='fairing'?(pickCap?cap:assembly):article,loadAngle=loadKind==='fairing'?angle:zero,headHeight=loadKind==='fairing'?g.capH+1.45:h.stowedLengthM+(g.star?1.15:1.1),attachHeight=loadKind==='fairing'?.18:h.stowedLengthM,arm=loadKind==='fairing'?g.radius+.12:Math.max(h.stowedDiameterM*.52,h.bodyHeightM*.59),tip=translate(loadRoot,rotateYPoint(headHeight,loadAngle)),trolley=vector(tip[0],0,0),transporter=vector(g.horizontal?assembly[0]:plus(g.ringX,times(g.receiverX-g.space-g.ringX,transfer)),0,0),opening=g.star?times(seat,minus(1,mate)):g.wholeCap?zero:minus(1,close),carriage=g.star?times(cargoBay.strokeM,times(close,minus(1,transfer))):zero;
 const endpoints=[];
 for(let i=0;i<2;i++){const sign=i?1:-1;endpoints[i]={from:vector(tip[0],g.craneY+.07,sign*.29),to:translate(tip,vector(0,.12,sign*arm))};endpoints[i+2]={from:translate(translate(tip,rotateYPoint(-.16,loadAngle)),vector(0,0,sign*arm)),to:translate(translate(loadRoot,rotateYPoint(attachHeight+.10,loadAngle)),vector(0,0,sign*arm))};}
 return {article,assembly,cap,angle,loadAngle,tip,trolley,transporter,opening,carriage,lift,endpoints,pose,loadKind,pickCap,held,basis:'Interval extension of the shared clamped smoothstep integration controls and exact rigid handling transforms.'};
}

function invertSmooth(value){let a=0,b=1;for(let i=0;i<60;i++){const m=(a+b)/2;if(smooth(m)<value)a=m;else b=m;}return (a+b)/2;}
export function joinedBayDomains(h,g,{held=false}={}){
 const events=[...INTEGRATION_TIMES,-600];if(g.horizontal)events.push(-1920+420*invertSmooth(.999));
 const times=[...new Set(events)].sort((a,b)=>a-b);
 return times.slice(1).map((end,i)=>({id:'bay-'+times[i]+'-'+end,start:times[i],end,kind:held?'compatibility-hold':'bay',endpointLimitS:times[i]>=-3000?1e-5:0}));
}

export function joinedBayMotionModel({hardware:h,layout:g,domain,flightRouteIds,flightObstacleIds,held=false}){
 const flightRoutes=new Set(flightRouteIds),flightSolids=new Set(flightObstacleIds),contexts=new WeakMap(),intervals=new Map();
 const isFlight=(kind,r)=>kind==='route'?flightRoutes.has(r.id):flightSolids.has(r.id);
 const sameFlight=p=>flightRoutes.has(p.routeA.id)&&(p.kind==='self'||p.kind==='line'&&flightRoutes.has(p.routeB.id)||p.kind==='solid'&&flightSolids.has(p.obstacle.id));
 function context(snapshot){let c=contexts.get(snapshot);if(c)return c;const proof=snapshot.joinedMotion;if(!proof?.bodyToProof||!proof?.serviceSnapshot)throw new Error('Missing joined bay proof coordinates');c={time:proof.evaluatedTime,toProof:new T.Matrix4().fromArray(proof.bodyToProof),toBody:new T.Matrix4().fromArray(proof.proofToBody),nativeRoutes:new Map(proof.serviceSnapshot.routes.map(r=>[r.id,r])),nativeSolids:new Map(proof.serviceSnapshot.obstacles.map(o=>[o.id,o])),records:new WeakMap()};contexts.set(snapshot,c);return c;}
 function interval(a,b){const key=a+':'+b;let e=intervals.get(key);if(!e){e=bayMotionEnclosure(h,g,a,b,{held});if(intervals.size>128)intervals.delete(intervals.keys().next().value);intervals.set(key,e);}return e;}
 function native(r,kind,c){if(!r)return null;let q=c.records.get(r);if(q)return q;const original=(kind==='route'?c.nativeRoutes:c.nativeSolids).get(r.id);
  if(original)q={...r,...original,...(kind==='route'?{renderedPoints:original.renderedPoints||original.points}:{})};else if(kind==='route'){const points=(r.renderedPoints||r.points).map(p=>point(p,c.toProof));q={...r,points,renderedPoints:points,motion:{type:'rigid',owner:'bay:article'}};}else q={...r,type:'box',bounds:box(corners(r.bounds).map(p=>point(p,c.toProof))),motion:{type:'rigid',owner:'bay:article'}};
  c.records.set(r,q);return q;
 }
 function modelFor(r,e){const m=r.motion||{};let owner=m.owner,type=m.type;
  if(['upper','lower'].includes(owner)||/^booster-\d+$/.test(owner))return {key:'bay:fixed',root:vector(),angle:[0,0]};
  if(owner==='payload')owner='bay:article';if(owner==='fitting')owner='bay:assembly';
  if(owner==='shell'){
   const extra=type==='fairing-half'?vector(0,0,times(-m.side*g.radius*2.25,e.opening)):vector(),root=translate(e.cap,extra),local=type==='Retained cargo door'?2*g.radius*cargoBay.travelRad:type==='Retained cargo carriage'||type==='Telescoping retained guide'?cargoBay.strokeM:0;
   return {key:'bay:shell:'+type+':'+(m.side||0),root,angle:e.angle,local,type};
  }
  if(type==='hoist-payout')return {key:owner,type,lineIndex:m.lineIndex};
  if(type==='hoist-eye')return {key:owner,type,lineIndex:m.lineIndex,end:m.end,routeId:m.routeId};
  if(owner==='bay:article')return {key:owner,root:e.article,angle:e.angle};
  if(owner==='bay:assembly')return {key:owner,root:e.assembly,angle:e.angle,local:['Retracting launch clamp','Allocated flat-package release clamp'].includes(type)&&g.star&&e.lift[0]<1&&e.lift[1]>=1?.12:0,type};
  if(owner==='bay:cap')return {key:owner,root:e.cap,angle:e.angle};
  if(owner==='bay:yoke')return {key:owner,root:e.tip,angle:[0,0]};
  if(owner==='bay:trolley')return {key:owner,root:e.trolley,angle:[0,0]};
  if(owner==='bay:transporter')return {key:owner,root:e.transporter,angle:[0,0]};
  if(owner?.startsWith('bay:fairing-shoe:'))return {key:owner,root:vector(g.ringX,0,times(-m.side*g.radius*2.25,e.opening)),angle:[0,0]};
  if(owner==='bay:fixed')return {key:owner,root:vector(),angle:[0,0]};
  return null;
 }
 function actualPoints(r,kind){if(kind==='route')return r.renderedPoints||r.points;if(r.bounds)return corners(r.bounds);if(r.center&&r.halfSize)return Array.from({length:8},(_,i)=>r.axes.reduce((p,axis,k)=>add(p,mul(axis,(i&(1<<k)?1:-1)*r.halfSize[k])),r.center));throw new Error('Missing bay obstacle enclosure: '+r.id);}
 const rawPoint=(range)=>range.map(r=>(r[0]+r[1])/2);
 function description(r,kind,c,a,b){const e=interval(a,b),current=bayMotionEnclosure(h,g,c.time,c.time,{held}),m=modelFor(r,e),at=modelFor(r,current);if(!m||!at)return null;const ps=actualPoints(r,kind),padding=PAD;
  if(m.type==='hoist-payout'){const endpoint=e.endpoints[m.lineIndex],now=current.endpoints[m.lineIndex],ranges=[0,1,2].map(k=>[Math.min(endpoint.from[k][0],endpoint.to[k][0])-padding,Math.max(endpoint.from[k][1],endpoint.to[k][1])+padding]),bound=Math.max(displacement(endpoint.from,rawPoint(now.from)),displacement(endpoint.to,rawPoint(now.to)))+padding;return {model:m,ranges,bound};}
  if(m.type==='hoist-eye'){
   const ranges=e.endpoints[m.lineIndex][m.end],now=current.endpoints[m.lineIndex][m.end],center=rawPoint(now),radius=Math.max(...ps.map(p=>norm(sub(p,center)))),line=current.endpoints[m.lineIndex],length=norm(sub(rawPoint(line.to),rawPoint(line.from))),aTravel=displacement(e.endpoints[m.lineIndex].from,rawPoint(line.from)),bTravel=displacement(e.endpoints[m.lineIndex].to,rawPoint(line.to)),change=aTravel+bTravel,angle=m.lineIndex<2?(change>=length?Math.PI:2*change/(length-change)):2*Math.max(Math.abs(e.loadAngle[0]-current.loadAngle[0]),Math.abs(e.loadAngle[1]-current.loadAngle[0]));
   return {model:m,ranges:ranges.map(q=>[q[0]-radius-padding,q[1]+radius+padding]),bound:displacement(ranges,center)+Math.min(2*radius,radius*angle)+padding};
  }
  const origin=rawPoint(at.root),theta=at.angle[0],cos=Math.cos(theta),sin=Math.sin(theta),local=ps.map(p=>{const q=sub(p,origin);return [cos*q[0]+sin*q[1],-sin*q[0]+cos*q[1],q[2]];}),ranges=[[Infinity,-Infinity],[Infinity,-Infinity],[Infinity,-Infinity]];
  for(const p of local){const q=[plus(trig(-p[1],p[0],...m.angle),m.root[0]),plus(trig(p[0],p[1],...m.angle),m.root[1]),plus(p[2],m.root[2])];for(let k=0;k<3;k++){ranges[k][0]=Math.min(ranges[k][0],q[k][0]);ranges[k][1]=Math.max(ranges[k][1],q[k][1]);}}
  let localTravel=0;if(m.type==='Retained cargo door')localTravel=m.local*Math.max(Math.abs(e.opening[0]-current.opening[0]),Math.abs(e.opening[1]-current.opening[0]));else if(m.type==='Retained cargo carriage'||m.type==='Telescoping retained guide')localTravel=Math.max(Math.abs(e.carriage[0]-current.carriage[0]),Math.abs(e.carriage[1]-current.carriage[0]));else if(m.local)localTravel=m.local;
  const bound=displacement(m.root,origin)+Math.max(Math.abs(m.angle[0]-theta),Math.abs(m.angle[1]-theta))*Math.max(...local.map(norm))+localTravel+padding;
  return {model:m,ranges:ranges.map(q=>[q[0]-localTravel-padding,q[1]+localTravel+padding]),bound};
 }
 const descriptionCache=new WeakMap();
 function described(r,kind,snapshot,a,b){const c=context(snapshot),q=native(r,kind,c);let cache=descriptionCache.get(q);if(!cache){cache=new Map();descriptionCache.set(q,cache);}const key=a+':'+b;if(!cache.has(key))cache.set(key,description(q,kind,c,a,b));return {record:q,description:cache.get(key)};}
 function sameRigid(x,y){return x?.model&&y?.model&&x.model.key===y.model.key&&!x.model.local&&!y.model.local&&!['hoist-eye','hoist-payout'].includes(x.model.type)&&!['hoist-eye','hoist-payout'].includes(y.model.type);}
 function eyeBound(p,snapshot){
  if(p.kind!=='solid'||p.obstacle.motion?.type!=='hoist-eye'||p.obstacle.motion.routeId!==p.routeA.id)return null;
  const r=p.routeA,o=p.obstacle,points=r.renderedPoints||r.points;if(points.length!==2||!r.motion?.kind)return null;const end=o.motion.end==='from'?points[0]:points[1],other=o.motion.end==='from'?points[1]:points[0],axis=unit(sub(other,end)),extent=Math.max(...corners(o.bounds).map(q=>norm(sub(q,end))))+.01,margin={radiusM:r.radiusM,clearanceM:r.clearanceM,routeId:r.id},full=segmentObstacleClearance(sub(end,mul(axis,extent)),add(end,mul(axis,extent)),o,margin),current=segmentObstacleClearance(...points,o,margin);
  // The independently checked taut span terminates at this physical swivel
  // eye. Its anchor normal is exactly the span axis. Any pose is a rigid
  // rotation of that eye about this axis plus a rigid placement; distance
  // to the complete axis is invariant. Extending only this route's line
  // through the finite eye bounds gives a conservative minimum, never an
  // exclusion of the eye or any unrelated hardware.
  return Number.isFinite(full)&&Number.isFinite(current)?Math.max(0,current-full)+PAD:null;
 }
 const globals=new WeakMap();
 function global(a,b,snapshots){let cache=globals.get(snapshots.mid);if(!cache){cache=new Map();globals.set(snapshots.mid,cache);}const key=a+':'+b;if(cache.has(key))return cache.get(key);const c=context(snapshots.mid),e=interval(a,b),now=bayMotionEnclosure(h,g,c.time,c.time,{held});let maximum=0,radius=0;
  for(const [kind,records]of [['route',snapshots.mid.routes],['obstacle',snapshots.mid.obstacles]])for(const r of records){if(isFlight(kind,r))continue;const q=described(r,kind,snapshots.mid,a,b);if(!q.description)return Infinity;maximum=Math.max(maximum,q.description.bound);for(const p of actualPoints(q.record,kind))radius=Math.max(radius,norm(sub(p,now.pose.article.toArray())));}
  const value=2*(maximum+displacement(e.article,now.pose.article.toArray())+Math.max(Math.abs(e.angle[0]-now.angle[0]),Math.abs(e.angle[1]-now.angle[0]))*radius)+PAD;cache.set(key,value);return value;
 }
 return {
  motionBound:global,
  motionBoundBasis:'An interval extension of every shared integration smoothstep encloses article, fairing, carriage, crane, yoke and transporter translations and rotations over the whole time interval. Every rigid point is projected through exact sine/cosine extrema. Taut winch spans stay in the convex hull of their independently checked endpoints; swivel eyes use bounded rigid rotations. The common spacecraft presentation transform is included in the absolute displacement bound.',
  stationaryMotionBound(a,b,{kind,record},snapshots){return isFlight(kind,record)?0:held?0:global(a,b,snapshots)+PAD;},
  stationaryMotionBasis:'The stowed spacecraft is invariant in its own exact body frame. In a preexisting compatibility hold the existing controller also fixes all bay mechanisms at seat=0. Only these whole-domain invariants can reuse the full positive baseline, and the kernel still compares every actual coordinate, connector, allocation and inventory at every pose.',
  pairMotionBound(a,b,p,snapshots){if(sameFlight(p))return 0;const ownEye=eyeBound(p,snapshots.mid);if(ownEye!==null)return ownEye;const x=described(p.routeA,'route',snapshots.mid,a,b).description,y=p.kind==='self'?x:described(p.obstacle||p.routeB,p.kind==='solid'?'obstacle':'route',snapshots.mid,a,b).description;if(!x||!y)return Infinity;return sameRigid(x,y)?0:x.bound+y.bound;},
  pairSeparationLowerBound(a,b,p,snapshots){
   if(sameFlight(p)||p.kind==='self')return null;const x=described(p.routeA,'route',snapshots.mid,a,b).description,y=described(p.obstacle||p.routeB,p.kind==='solid'?'obstacle':'route',snapshots.mid,a,b).description;if(!x||!y)return null;
   const margin=p.routeA.radiusM+(p.routeB?.radiusM||0)+Math.max(p.routeA.clearanceM||0,p.routeB?.clearanceM||0),axes=[0,1,2].sort((i,j)=>Math.max(y.ranges[j][0]-x.ranges[j][1],x.ranges[j][0]-y.ranges[j][1])-Math.max(y.ranges[i][0]-x.ranges[i][1],x.ranges[i][0]-y.ranges[i][1]));
   for(const k of axes){if(Math.max(y.ranges[k][0]-x.ranges[k][1],x.ranges[k][0]-y.ranges[k][1])<=margin+PAD)continue;const axis=[0,0,0];axis[k]=1;const frames={};for(const key of ['start','mid','end']){const c=context(snapshots[key]);frames[key]={axis:direction(axis,c.toBody),origin:point([0,0,0],c.toBody)};}
    return {axis:frames.mid.axis,projectionFrames:frames,rangeA:x.ranges[k],rangeB:y.ranges[k],radiusUpperBoundA:p.routeA.radiusM+PAD,...(p.routeB?{radiusUpperBoundB:p.routeB.radiusM+PAD}:{}),basis:'Interval arithmetic encloses the shared integration controls for every time in this cell, including each clamped smoothstep, product and rigid rotation. All actual rigid geometry is inverse-transformed at the audited pose and projected over exact trigonometric extrema; taut rope and swivel-eye enclosures include their full endpoint or orientation range. Both projection axes and origins are then carried into the exact spacecraft audit frame.'};
   }return null;
  }
 };
}
