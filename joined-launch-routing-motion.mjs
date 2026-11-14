import * as T from './dist/vendor/three.module.js';
import {launchRoutingMotionModel} from './launch-routing-checks.mjs';
import {launchRiseM} from './dist/launch-effects-state.js';
import {starshipCargoFlight} from './dist/starship-cargo.js';

const norm=p=>Math.hypot(...p),add=(a,b)=>a.map((v,i)=>v+b[i]),scale=(p,k)=>p.map(v=>v*k),clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const q=clamp(x);return q*q*(3-2*q);};
const travel=(a,b,fn)=>{const m=fn((a+b)/2);return Math.max(Math.abs(fn(a)-m),Math.abs(fn(b)-m));};
const matrix=elements=>new T.Matrix4().fromArray(elements);
const point=(p,m)=>new T.Vector3(...p).applyMatrix4(m).toArray();
const direction=(p,m)=>new T.Vector3(...p).transformDirection(m).toArray();
const corners=b=>Array.from({length:8},(_,i)=>b.min.map((v,k)=>i&(1<<k)?b.max[k]:v));
const bounds=points=>({min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))});

function transformedAperture(a,m){
 if(a.center)return {...a,center:point(a.center,m),axes:a.axes.map(p=>direction(p,m))};
 return {...a,center:point(a.min.map((v,i)=>(v+a.max[i])/2),m),axes:[[1,0,0],[0,1,0],[0,0,1]].map(p=>direction(p,m)),halfSize:a.min.map((v,i)=>(a.max[i]-v)/2),min:undefined,max:undefined};
}
export function transformRoutingSolid(o,m){
 const out={...o};
 if(o.type==='box'||!o.type&&o.min){out.type='obb';out.center=point(o.min.map((v,i)=>(v+o.max[i])/2),m);out.axes=[[1,0,0],[0,1,0],[0,0,1]].map(p=>direction(p,m));out.halfSize=o.min.map((v,i)=>(o.max[i]-v)/2);delete out.min;delete out.max;}
 else if(o.center){out.center=point(o.center,m);if(o.axes)out.axes=o.axes.map(p=>direction(p,m));if(o.axis)out.axis=direction(o.axis,m);}
 if(o.a)out.a=point(o.a,m);if(o.b)out.b=point(o.b,m);
 if(o.triangles)out.triangles=o.triangles.map(t=>t.map(p=>point(p,m)));
 if(o.sourceVertices)out.sourceVertices=o.sourceVertices.map(p=>point(p,m));
 out.apertures=(o.apertures||[]).map(a=>transformedAperture(a,m));
 if(o.bounds)out.bounds=bounds(corners(o.bounds).map(p=>point(p,m)));
 else if(out.type==='obb')out.bounds=bounds(Array.from({length:8},(_,i)=>out.axes.reduce((p,axis,k)=>add(p,scale(axis,(i&(1<<k)?1:-1)*out.halfSize[k])),out.center)));
 return out;
}

// The viewport carries the actual flight factory in a sibling group, then
// hands it off to its orbit presentation. CI uses that exact same placement.
// The established launch mechanism proof uses tower/stage coordinates. Its
// distances and supporting planes are rigid-coordinate invariant, so these
// adapters carry those certificates into the spacecraft's body frame while
// preserving the original actual service records and every collision pair.
export function joinedLaunchMotionModel({domain,geometry,clock,launcher,flightRouteIds,flightObstacleIds,maximumFlightRadiusM,maximumMountRadiusM,handoffOriginM}){
 const flightRoutes=new Set(flightRouteIds),flightSolids=new Set(flightObstacleIds),H=Math.max(geometry.heightM,maximumFlightRadiusM+maximumMountRadiusM),model=launchRoutingMotionModel(domain,{...geometry,heightM:H},clock,launcher),contexts=new WeakMap();
 const isFlight=(kind,record)=>kind==='route'?flightRoutes.has(record.id):flightSolids.has(record.id);
 const handoff=a=>launcher!=='starship'&&a>=clock.releaseClear;
 function context(snapshot){
  let value=contexts.get(snapshot);if(value)return value;const proof=snapshot.joinedMotion;
  if(!proof?.bodyToProof||!proof?.proofToBody||!proof?.serviceSnapshot)throw new Error('Missing joined launch proof coordinates');
  const toProof=matrix(proof.bodyToProof),toBody=matrix(proof.proofToBody),routes=new Map(proof.serviceSnapshot.routes.map(r=>[r.id,r])),solids=new Map(proof.serviceSnapshot.obstacles.map(o=>[o.id,o]));
  value={toProof,toBody,service:proof.serviceSnapshot,routes,solids,transformed:new WeakMap()};contexts.set(snapshot,value);return value;
 }
 function proofRecord(record,kind,c){
  if(!record)return null;let found=c.transformed.get(record);if(found)return found;
  const native=(kind==='route'?c.routes:c.solids).get(record.id);
  if(kind==='route'){
   found={...record,...native,points:record.points.map(p=>point(p,c.toProof)),renderedPoints:(record.renderedPoints||record.points).map(p=>point(p,c.toProof)),motion:native?.motion||{type:'rigid',owner:'payload'}};
   found.bounds=bounds(found.points);found.lengthM=record.lengthM;found.renderedPrefix=record.renderedPrefix;found.prefix=record.prefix;
   if(!native)found.motionSpans=(record.motionSpans||[]).map(span=>({...span,...(span.nominalPoints?{nominalPoints:span.nominalPoints.map(p=>point(p,c.toProof))}:{})}));
  }else found=native||{...transformRoutingSolid(record,c.toProof),motion:{type:'rigid',owner:'payload'}};
  c.transformed.set(record,found);return found;
 }
 function proofPair(p,snapshot){const c=context(snapshot),out={...p,routeA:proofRecord(p.routeA,'route',c),routeB:proofRecord(p.routeB,'route',c),obstacle:proofRecord(p.obstacle,'obstacle',c)};for(const key of ['a','b','c','d'])if(p[key])out[key]=point(p[key],c.toProof);return out;}
 function flightPair(p){return flightRoutes.has(p.routeA.id)&&(p.kind==='self'||p.kind==='solid'&&flightSolids.has(p.obstacle.id)||p.kind==='line'&&flightRoutes.has(p.routeB.id));}
 function crossPair(p){return !flightPair(p)&&(flightRoutes.has(p.routeA.id)||p.kind==='solid'&&flightSolids.has(p.obstacle.id)||p.kind==='line'&&flightRoutes.has(p.routeB.id));}
 function handoffTravel(a,b){const df=travel(a,b,t=>smooth((t-clock.releaseClear)/(900-clock.releaseClear)));return (norm(handoffOriginM)+Math.PI*maximumFlightRadiusM)*df;}
 function frameTravel(a,b){
  if(domain.kind==='ground'){const angle=.76/540*(b-a)/2;return {translation:travel(a,b,t=>launchRiseM(t,launcher))+maximumMountRadiusM*angle,angle};}
  if(handoff(a)){const df=travel(a,b,t=>smooth((t-clock.releaseClear)/(900-clock.releaseClear)));return {translation:norm(handoffOriginM)*df,angle:Math.PI*df};}
  if(launcher==='starship'){const at=t=>starshipCargoFlight(t,clock,true,geometry.cargoLiftStrokeM);return {translation:travel(a,b,t=>at(t).payloadM)+travel(a,b,t=>at(t).liftM),angle:0};}
  return {translation:travel(a,b,t=>clamp((t-clock.release)/(clock.releaseClear-clock.release)))*geometry.fairingRadiusM*1.45,angle:0};
 }
 const globals=new WeakMap();
 function global(a,b,snapshots){
  let cache=globals.get(snapshots.mid);if(!cache){cache=new Map();globals.set(snapshots.mid,cache);}const key=a+':'+b;if(cache.has(key))return cache.get(key);
  const c=context(snapshots.mid),base=model.motionBound(a,b,{...snapshots,mid:c.service}),frame=frameTravel(a,b);let radius=maximumFlightRadiusM;
  // The displacement of a rotated point is at most angle*radius. The actual
  // mid-pose bounding box encloses every vertex. The original mechanism
  // displacement bound supplies the additional radius variation separately.
  for(const o of snapshots.mid.obstacles)if(!flightSolids.has(o.id)){const bb=o.bounds||(o.min&&{min:o.min,max:o.max});if(bb)for(const p of corners(bb))radius=Math.max(radius,norm(p));else if(o.center)radius=Math.max(radius,norm(o.center)+(o.halfSize?norm(o.halfSize):o.halfLengthM+o.radiusM));}
  for(const r of snapshots.mid.routes)if(!flightRoutes.has(r.id))for(const p of r.points)radius=Math.max(radius,norm(p));
  const value=base+2*frame.translation+2*frame.angle*radius+8e-5;cache.set(key,value);return value;
 }
 return {
  motionBound:global,
  motionBoundBasis:'Actual service geometry is audited in the spacecraft body frame. Tower/stage mechanism displacement bounds are composed with the shared live-craft placement: exact monotonic rise and payload translation, bounded attitude angle, and the post-release smoothstep position/quaternion handoff. angle*actual-midpoint-radius plus the original mechanism displacement encloses each transformed point. All flight geometry remains independently recovered in its exact unchanged body frame.',
  stationaryMotionBound(a,b,{kind,record},snapshots){return isFlight(kind,record)?0:global(a,b,snapshots)+4e-5;},
  stationaryMotionBasis:'Only the complete, stowed flight installation is body-fixed in this joined frame. The kernel compares all actual buffers, radii, connector datums, apertures, length/bend allocations and expected inventories to the full positive joined baseline at every checked pose. Every service participant remains active; no service owner is exempted by ID.',
  pairMotionBound(a,b,p,snapshots){if(flightPair(p))return 0;const value=model.pairMotionBound(a,b,proofPair(p,snapshots.mid));return value+(crossPair(p)&&handoff(a)?handoffTravel(a,b):0);},
  pairSeparationLowerBound(a,b,p,snapshots){
   if(flightPair(p)||crossPair(p)&&handoff(a))return null;
   const old={start:context(snapshots.start).service,mid:context(snapshots.mid).service,end:context(snapshots.end).service},witness=model.pairSeparationLowerBound(a,b,proofPair(p,snapshots.mid),old);if(!witness||witness.kind)return witness;
   const frames={};for(const key of ['start','mid','end']){const frame=witness.projectionFrames?.[key]||{axis:witness.axis,origin:witness.origin||[0,0,0]},c=context(snapshots[key]);frames[key]={axis:direction(frame.axis,c.toBody),origin:point(frame.origin||[0,0,0],c.toBody)};}
   return {...witness,axis:frames.mid.axis,projectionFrames:frames,basis:witness.basis+' The projection axis and origin are transformed by the shared live-craft rigid placement at every audit pose; signed projection ranges and finite physical radii are invariant under that coordinate change.'};
  }
 };
}
