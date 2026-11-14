import fs from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {routingSourceFingerprint,sameRoutingSourceFingerprint} from './scripts/routing-source-fingerprint.mjs';
import * as T from './dist/vendor/three.module.js';
import {defaults,missionStarter,applyPreset,sizeDesign} from './dist/design.js';
import {launchCompatibility} from './dist/launch-compatibility.js';
import {launchFleet} from './dist/launch-fleet.js';
import {launchSitesFor} from './dist/launch-sites.js';
import {launchClockFor,launchRiseM,superHeavyDeparture,superHeavyDepartureEnvelope} from './dist/launch-effects-state.js';
import {makeLaunch} from './dist/launch-scene.js';
import {starshipCargoFlight,cargoBay} from './dist/starship-cargo.js';
import {auditRoutes,auditSweptRoutes,createRoutingCollisionCache,createRoutingStationaryCertificate,segmentObstacleClearance,segmentSegmentDistance} from './dist/routing-audit.js';

const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{const u=clamp(x);return u*u*(3-2*u);};
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0),scale=(a,k)=>a.map(x=>x*k),norm=a=>Math.hypot(...a),unit=a=>scale(a,1/(norm(a)||1)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const BUFFER_M=2e-5,RADIUS_ENVELOPE_M=.000103;
const brush=new Proxy({},{get:(_,k)=>['createRadialGradient','createLinearGradient'].includes(k)?()=>({addColorStop(){}}):()=>{}});
function installCanvasStub(){if(typeof document==='undefined')globalThis.document={createElement:()=>({getContext:()=>brush})};}
function fraction(t,release){return smooth((t-release.motionStart)/Math.max(.001,release.motionEnd-release.motionStart));}
function travel(a,b,fn){const mid=(a+b)/2,m=fn(mid);return Math.max(Math.abs(fn(a)-m),Math.abs(fn(b)-m));}
function releaseTravel(a,b,m){return travel(a,b,t=>fraction(t,m.release));}
function projectedSolid(o,axis,origin){
 const offset=dot(origin,axis);if(o.type==='obb'){const c=dot(o.center,axis)-offset,e=o.axes.reduce((v,a,i)=>v+Math.abs(dot(a,axis))*o.halfSize[i],0);return [c-e,c+e];}
 if(o.type==='cylinder'){const d=dot(o.axis,axis),c=dot(o.center,axis)-offset,e=Math.abs(d)*o.halfLengthM+Math.sqrt(Math.max(0,1-d*d))*o.radiusM;return [c-e,c+e];}
 if(o.type==='capsule'){const a=dot(o.a,axis)-offset,b=dot(o.b,axis)-offset;return [Math.min(a,b)-o.radiusM,Math.max(a,b)+o.radiusM];}
 if(o.sourceVertices?.length){let lo=Infinity,hi=-Infinity;for(const p of o.sourceVertices){const value=dot(p,axis)-offset;lo=Math.min(lo,value);hi=Math.max(hi,value);}return [lo,hi];}
 let lo=0,hi=0;for(let k=0;k<3;k++){const a=o.bounds.min[k]*axis[k],b=o.bounds.max[k]*axis[k];lo+=Math.min(a,b);hi+=Math.max(a,b);}return [lo-offset,hi-offset];
}
function firstLead(route,a,b,arc){
 const m=route.motion;if(m?.type!=='launch-loop'||!a||!b||!arc||arc[1]>m.fixedLengthM+m.freeLeadMinM-BUFFER_M*4+1e-8||arc[1]<m.fixedLengthM-1e-4)return null;
 const at=p=>dot(sub(p,m.fixedEnd),m.normal),deviation=p=>norm(sub(sub(p,m.fixedEnd),scale(m.normal,at(p))));
 if(Math.max(deviation(a),deviation(b))>BUFFER_M*2||Math.max(at(a),at(b))<=BUFFER_M*2)return null;
 return {origin:m.fixedEnd,axis:m.normal,endM:m.freeLeadMinM,startM:Math.min(0,at(a),at(b))};
}
function finalLead(route,a,b,arc){
 const m=route.motion;if(m?.type!=='launch-loop'||!a||!b||!arc||arc[1]>route.lengthM+1e-8||arc[0]<route.lengthM-m.freeLeadMinM+BUFFER_M*4-1e-8)return null;
 const at=p=>dot(sub(p,m.endpoint),m.normal),deviation=p=>norm(sub(sub(p,m.endpoint),scale(m.normal,at(p))));
 if(Math.max(deviation(a),deviation(b))>BUFFER_M*2||Math.min(at(a),at(b))<-BUFFER_M*2||Math.max(at(a),at(b))<=BUFFER_M*2)return null;
 return {origin:m.endpoint,axis:m.normal};
}
function ownerKey(m,domain){return domain.kind==='ground'?(m.owner==='ground'?'ground':'stage'):m.owner;}
function ownerTravel(a,b,owner,domain,geometry,clock,launcher){
 const H=geometry.heightM,R=geometry.fairingRadiusM,U=geometry.upperLengthM,L=geometry.lowerLengthM;
 if(domain.kind==='ground'){if(owner==='ground')return 0;const rise=travel(a,b,t=>launchRiseM(t,launcher)),rotation=.76/540*(b-a)/2;return rise+2*H*rotation;}
 if(owner==='ground')return 0;
 if(owner==='lower'){
  if(launcher==='starship'){if(b<=clock.stageSeparation||a>=clock.boostbackCutoff)return 0;
   // Midpoint integrator: |a| <= 47+10.5; a partial step is <= .25 s.
   // Command derivative <= 49 m/s^3 and theta' <= (150deg)*1.5/14.
   // Differentiating v*h + a(u+h/2)*h^2/2 gives the final h^2*a'/4 term.
   const thetaRate=150*Math.PI/180*1.5/14,rate=57.5*(45+.25)+49/64+2*H*thetaRate;return rate*(b-a)/2;
  }
  if(launcher==='longMarch5B')return travel(a,b,t=>clamp((t-clock.release)/(clock.releaseClear-clock.release)))*geometry.baseRadiusM*4;
  const d=travel(a,b,t=>clamp((t-clock.stageSeparation)/45));return d*(.75*L+R+.15*2*H);
 }

 if(owner.startsWith('booster-')){const duration=launcher==='falconHeavy'?25:40,d=travel(a,b,t=>clamp((t-clock.boosterSeparation)/duration));return d*(3*geometry.baseRadiusM+.36*L+.16*2*H);}
 if(launcher!=='starship'){const d=travel(a,b,t=>clamp((t-clock.release)/(clock.releaseClear-clock.release)));if(owner==='fitting'||owner==='upper')return d*U*1.5;if(owner==='payload')return d*R*1.45;return 0;}
 // The catalog clock partitions each monotonic cargo stroke. Componentwise
 // endpoint ranges bound vector travel, using the installed lift allocation.
 const cargo=t=>starshipCargoFlight(t,clock,true,geometry.cargoLiftStrokeM);
 if(owner==='fitting')return travel(a,b,t=>cargo(t).carriageM);
 if(owner==='payload')return travel(a,b,t=>cargo(t).payloadM)+travel(a,b,t=>cargo(t).liftM);
 return 0;
}
function localObstacleTravel(a,b,o,domain,geometry){
 const m=o.motion,H=geometry.heightM;if(!m)return Infinity;
 if(m.type==='head'){const d=releaseTravel(a,b,m);return d*(m.internal?.24:m.pivot?1.10*m.pivotRadiusM:m.clearanceM);}
 if(m.type==='arm')return releaseTravel(a,b,m)*1.10*m.axisRadiusM;
 if(m.type==='spine')return travel(a,b,t=>smooth(t/4))*8*Math.PI/180*m.axisRadiusM;
 if(m.type==='jaw')return travel(a,b,t=>smooth(t/.45))*.97*m.axisRadiusM;
 if(m.type==='fairing-half'){
  const fraction=t=>clamp((t-domain.clock.fairingJettison)/46),d=travel(a,b,fraction);if(!d)return 0;
  const f=fraction((a+b)/2),tx=m.side*3.7*geometry.fairingRadiusM*f,ty=-2*geometry.fairingRadiusM*f;let radius=0;
  for(const x of [o.bounds.min[0],o.bounds.max[0]])for(const y of [o.bounds.min[1],o.bounds.max[1]])radius=Math.max(radius,Math.hypot(x-tx,y-ty));
  return d*(Math.hypot(3.7,2)*geometry.fairingRadiusM+.9*radius);
 }
 if(m.type==='Retained cargo door')return travel(a,b,t=>starshipCargoFlight(t,domain.clock,true,geometry.cargoLiftStrokeM).hatch)*cargoBay.travelRad*2*geometry.fairingRadiusM;
 if(m.type==='Retained cargo carriage'||m.type==='Telescoping retained guide')return travel(a,b,t=>starshipCargoFlight(t,domain.clock,true,geometry.cargoLiftStrokeM).carriageM);
 if(['Guided separation plunger','Separation shoe stem','Two-axis separation shoe'].includes(m.type)){
  // Pin rise is the product of increasing lift and subsequent retraction.
  // The domains split at eject and each retraction boundary; each factor is
  // monotonic there. Product difference <= |dlift| + liftMax*|d(retract)|.
  const lift=travel(a,b,t=>smooth((t-domain.clock.release)/(domain.clock.eject-domain.clock.release)))*geometry.cargoLiftStrokeM,retract=travel(a,b,t=>smooth((t-domain.clock.eject-3)/6))*geometry.cargoLiftStrokeM;
  const kick=travel(a,b,t=>Math.min(.14,Math.max(0,t-domain.clock.eject)<2?.035*Math.max(0,t-domain.clock.eject)**2:.14*(Math.max(0,t-domain.clock.eject)-1)))+travel(a,b,t=>smooth((t-domain.clock.eject-2)/4))*.14;
  return lift+retract+(m.type==='Two-axis separation shoe'?kick:0);
 }
 if(m.type==='Retracting launch clamp'||m.type==='Allocated flat-package release clamp')return a<575&&b>=575?.12:0;
 return 0;
}
function localRouteTravel(a,b,r,arc=null){
 const m=r.motion;if(m.type==='rigid')return 0;if(arc&&arc[1]<=m.fixedLengthM+1e-6)return 0;const f=releaseTravel(a,b,m);if(!f)return 0;
 const endpoint=f*(m.internal?.24:m.pivot?1.10*m.pivotRadiusM:m.clearanceM),R=m.bendRadiusM,h=m.minPerpendicularM,d=m.maxEndpointSeparationM,K=1.5+11*R/h+4*R*d/(h*h),polygon=R*(Math.PI/2*(1-Math.sin(Math.PI/32)/(Math.PI/32))+1-Math.cos(Math.PI/32));return K*endpoint+2*polygon+BUFFER_M*2;
}
const launchObstacleMotionTypes=new Set(['rigid','head','arm','spine','jaw','fairing-half','Retained cargo door','Retained cargo carriage','Telescoping retained guide','Guided separation plunger','Separation shoe stem','Two-axis separation shoe','Retracting launch clamp','Allocated flat-package release clamp']);
export function launchRoutingStationaryModel(domain,geometry,clock,launcher){
 const absolute=(a,b,{kind,record})=>{
  const m=record?.motion;if(!m||!(['ground','lower','upper','shell','fitting','payload'].includes(m.owner)||/^booster-\d+$/.test(m.owner)))return Infinity;
  if(kind==='route'?!['rigid','launch-loop'].includes(m.type):kind!=='obstacle'||!launchObstacleMotionTypes.has(m.type))return Infinity;
  if(['launch-loop','head','arm'].includes(m.type)&&(!m.release||!Number.isFinite(m.release.motionStart)||!Number.isFinite(m.release.motionEnd)))return Infinity;
  return ownerTravel(a,b,m.owner,domain,geometry,clock,launcher)+(kind==='route'?localRouteTravel(a,b,record):localObstacleTravel(a,b,record,domain,geometry));
 };
 return {
  stationaryMotionBound(a,b,participant){const entire=absolute(domain.start,domain.end,participant);if(!Number.isFinite(entire)||entire<0)return Infinity;return entire===0?0:absolute(a,b,participant)+BUFFER_M*2;},
  stationaryMotionBasis:'Only participants whose declared absolute owner and local mechanism displacement is exactly zero over this entire motion domain may reuse its independently audited full starting-pose baseline. A paused child interval inside a changing domain stays active. Every recovered actual tube centerline and physical radius, connector datum, solid, aperture, allocation and inventory must still match the baseline exactly at every interval endpoint and midpoint. All moving participants retain every solid, interline and self pair with the original motion bounds and geometric witnesses.'
 };
}
function trigRange(sine,cosine,lo,hi){const values=[sine*Math.sin(lo)+cosine*Math.cos(lo),sine*Math.sin(hi)+cosine*Math.cos(hi)],stationary=Math.atan2(sine,cosine);for(let k=Math.floor((lo-stationary)/Math.PI)-1;k<=Math.ceil((hi-stationary)/Math.PI)+1;k++){const angle=stationary+k*Math.PI;if(angle>=lo&&angle<=hi)values.push(sine*Math.sin(angle)+cosine*Math.cos(angle));}return [Math.min(...values),Math.max(...values)];}
function affineTrigRange(sine,cosine,linear,rate,lo,hi){
 const value=f=>sine*Math.sin(rate*f)+cosine*Math.cos(rate*f)+linear*f,values=[value(lo),value(hi)],A=rate*sine,B=-rate*cosine,amplitude=Math.hypot(A,B),phase=Math.atan2(B,A),target=-linear/amplitude;
 if(amplitude>1e-15&&Math.abs(target)<=1){const angle=Math.acos(target),range=[rate*lo,rate*hi].sort((x,y)=>x-y);for(const root of [phase-angle,phase+angle])for(let k=Math.floor((range[0]-root)/(2*Math.PI))-1;k<=Math.ceil((range[1]-root)/(2*Math.PI))+1;k++){const f=(root+k*Math.PI*2)/rate;if(f>=lo&&f<=hi)values.push(value(f));}}
 return [Math.min(...values),Math.max(...values)];
}
function fairingXProjection(obstacle,a,b,geometry,clock){
 const side=obstacle.motion.side,mid=(a+b)/2,f=clamp((mid-clock.fairingJettison)/46),lo=clamp((a-clock.fairingJettison)/46),hi=clamp((b-clock.fairingJettison)/46),theta=-side*.9*f,c=Math.cos(theta),s=Math.sin(theta),tx=side*3.7*geometry.fairingRadiusM*f,ty=-2*geometry.fairingRadiusM*f;let low=Infinity,high=-Infinity;
 for(const x of [obstacle.bounds.min[0],obstacle.bounds.max[0]])for(const y of [obstacle.bounds.min[1],obstacle.bounds.max[1]]){const dx=x-tx,dy=y-ty,X=c*dx+s*dy,Y=-s*dx+c*dy,range=affineTrigRange(-Y,X,side*3.7*geometry.fairingRadiusM,-side*.9,lo,hi);low=Math.min(low,range[0]);high=Math.max(high,range[1]);}
 return [low-BUFFER_M*2,high+BUFFER_M*2];
}
function groundFlexProjection(route,a,b){
 const m=route.motion,axis=m.normal,span=route.motionSpans.find(s=>s.id===route.id+':flex'),f0=fraction(a,m.release),f1=fraction(b,m.release);let endpoints;
 if(m.pivot){const vector=sub(m.zeroHead,m.pivotOrigin),angles=[1.10*m.pivotDirection*f0,1.10*m.pivotDirection*f1].sort((x,y)=>x-y),turn=trigRange(axis[0]*vector[2]-axis[2]*vector[0],axis[0]*vector[0]+axis[2]*vector[2],...angles),offset=dot(add(m.pivotOrigin,sub(m.zeroEndpoint,m.zeroHead)),axis);endpoints=turn.map(x=>x+offset);}
 else{const start=dot(m.zeroEndpoint,axis),travel=m.releaseMode==='drop-away'?0:m.clearanceM;endpoints=[start+travel*f0,start+travel*f1];}
 return [Math.min(...endpoints,dot(m.fixedEnd,axis),dot(span.nominalPoints[0],axis))-BUFFER_M*2,dot(m.fixedEnd,axis)+m.restLengthM+BUFFER_M*2];
}
function endpointProjectionRange(route,a,b,axis=route.motion.normal){
 const m=route.motion,f0=fraction(a,m.release),f1=fraction(b,m.release);
 if(m.pivot){const vector=sub(m.zeroHead,m.pivotOrigin),angles=[1.10*m.pivotDirection*f0,1.10*m.pivotDirection*f1].sort((x,y)=>x-y),turn=trigRange(axis[0]*vector[2]-axis[2]*vector[0],axis[0]*vector[0]+axis[2]*vector[2],...angles),offset=dot(sub(add(m.pivotOrigin,sub(m.zeroEndpoint,m.zeroHead)),m.fixedEnd),axis);return turn.map(x=>x+offset);}
 const start=dot(sub(m.zeroEndpoint,m.fixedEnd),axis),travel=m.internal?.24*dot(m.normal,axis):m.releaseMode==='drop-away'?-m.clearanceM*axis[1]:m.clearanceM*dot(m.normal,axis);return [start+travel*f0,start+travel*f1].sort((x,y)=>x-y);
}
function risingSolidProjection(obstacle,a,b,axis,launcher){
 const mid=(a+b)/2,theta=-.76*mid/540,c=Math.cos(theta),s=Math.sin(theta),rise=launchRiseM(mid,launcher),angles=[-.76*b/540,-.76*a/540];let low=Infinity,high=-Infinity;
 const inverse=([x,y,z],direction=false)=>{const Y=direction?y:y-rise;return [c*x+s*Y,-s*x+c*Y,z];},range=p=>{const [x,y,z]=p,turn=trigRange(-axis[0]*y,axis[0]*x,...angles);return turn.map(v=>v+axis[2]*z);};
 if(obstacle.type==='cylinder'){const centre=range(inverse(obstacle.center)),axial=range(inverse(obstacle.axis,true)),extent=obstacle.radiusM+obstacle.halfLengthM*Math.max(Math.abs(axial[0]),Math.abs(axial[1]));return [centre[0]-extent-BUFFER_M*2,centre[1]+extent+BUFFER_M*2];}
 const vertices=obstacle.type==='obb'?Array.from({length:8},(_,i)=>obstacle.center.map((v,k)=>v+obstacle.axes.reduce((sum,ax,j)=>sum+(i&(1<<j)?1:-1)*ax[k]*obstacle.halfSize[j],0))):obstacle.type==='capsule'?[obstacle.a,obstacle.b]:obstacle.sourceVertices||obstacle.triangles?.flat()||Array.from({length:8},(_,i)=>obstacle.bounds.min.map((v,k)=>i&(1<<k)?obstacle.bounds.max[k]:v)),padding=obstacle.type==='capsule'?obstacle.radiusM:0;
 for(const p of vertices){const q=range(inverse(p));low=Math.min(low,q[0]-padding);high=Math.max(high,q[1]+padding);}
 return [low-BUFFER_M*2,high+BUFFER_M*2];
}
function motionModel(domain,geometry,clock,launcher){
 const owner=(a,b,m)=>ownerTravel(a,b,m.owner,domain,geometry,clock,launcher),base=(a,b,x,y)=>{
  if(ownerKey(x,domain)===ownerKey(y,domain))return 0;
  if(launcher==='starship'&&domain.kind==='flight'&&new Set([x.owner,y.owner]).has('fitting')&&new Set([x.owner,y.owner]).has('payload')){const cargo=t=>starshipCargoFlight(t,clock,true,geometry.cargoLiftStrokeM);return travel(a,b,t=>cargo(t).payloadM-cargo(t).carriageM)+travel(a,b,t=>cargo(t).liftM);}
  return owner(a,b,x)+owner(a,b,y);
 };
 const departureRanges=new Map(),projectionCache=new WeakMap(),flexProjectionCache=new WeakMap(),loopPlaneWitnesses=new WeakMap(),terminalPlaneWitnesses=new WeakMap(),rigidLineHeights=new WeakMap(),internalProjections=new WeakMap();
 const risingProjection=(o,a,b,axis)=>{let cache=projectionCache.get(o);if(!cache){cache=new Map();projectionCache.set(o,cache);}const key=[a,b,...axis].join(',');if(!cache.has(key))cache.set(key,risingSolidProjection(o,a,b,axis,launcher));return cache.get(key);};
 const flexProjection=(r,a,b)=>{let cache=flexProjectionCache.get(r);if(!cache){cache=new Map();flexProjectionCache.set(r,cache);}const key=a+':'+b;if(!cache.has(key))cache.set(key,groundFlexProjection(r,a,b));return cache.get(key);};
 function departureProjection(a,b,obstacle){
  const key=a+':'+b;let cache=departureRanges.get(key);if(!cache){cache={range:superHeavyDepartureEnvelope(a,b),pose:superHeavyDeparture((a+b)/2),solids:new WeakMap()};departureRanges.set(key,cache);}
  if(cache.solids.has(obstacle))return cache.solids.get(obstacle);const {range,pose}=cache,cy=-geometry.upperLengthM-geometry.lowerLengthM/2,c=Math.cos(pose.angleRad),s=Math.sin(pose.angleRad);let low=Infinity,high=-Infinity;
  // The inverse transform of this actual enclosing box contains the entire
  // rigid lower-stage solid in its own centre frame. Every resulting corner
  // is projected over the complete analytic rotation and translation range.
  for(const x of [obstacle.bounds.min[0],obstacle.bounds.max[0]])for(const y of [obstacle.bounds.min[1],obstacle.bounds.max[1]]){const dx=x-pose.sideM,dy=y-cy-pose.axialM,qx=c*dx+s*dy,qy=-s*dx+c*dy,turn=trigRange(qx,qy,...range.angleRad);low=Math.min(low,cy+range.axialM[0]+turn[0]);high=Math.max(high,cy+range.axialM[1]+turn[1]);}
  const projection=[low-BUFFER_M,high+BUFFER_M];cache.solids.set(obstacle,projection);return projection;
 }
 function loopPlaneWitness(p,snapshots,a,b){
  const r=p.routeA,m=r.motion,o=p.obstacle,head=o.motion.type==='head',origin=head?m.endpoint:m.fixedEnd,tangent=m.planeTangent,vertical=unit(cross(m.normal,tangent)),span=r.motionSpans.find(s=>s.id===r.id+':flex');
  let cache=loopPlaneWitnesses.get(r);if(!cache){cache=new WeakMap();loopPlaneWitnesses.set(r,cache);}if(cache.has(o))return cache.get(o);
  const transverse=endpointProjectionRange(r,a,b,tangent),height=endpointProjectionRange(r,a,b,vertical).map(x=>-x).sort((x,y)=>x-y);if(!(height[0]>0)){cache.set(o,null);return null;}
  const angles=[];for(const x of transverse)for(const h of height)angles.push(Math.atan2(x,h));const beta=[Math.min(...angles)-1e-7,Math.max(...angles)+1e-7];
  const project=point=>{const delta=sub(point,origin);return trigRange(dot(delta,vertical),dot(delta,tangent),...beta);};let low=Infinity,high=-Infinity;
  if(o.type==='cylinder'){const center=project(o.center),q=trigRange(dot(o.axis,vertical),dot(o.axis,tangent),...beta),extent=o.radiusM+o.halfLengthM*Math.max(Math.abs(q[0]),Math.abs(q[1]));low=center[0]-extent;high=center[1]+extent;}
  else{const vertices=o.type==='obb'?Array.from({length:8},(_,i)=>o.center.map((v,k)=>v+o.axes.reduce((sum,axis,j)=>sum+(i&(1<<j)?1:-1)*axis[k]*o.halfSize[j],0))):o.type==='capsule'?[o.a,o.b]:o.sourceVertices||o.triangles?.flat()||Array.from({length:8},(_,i)=>o.bounds.min.map((v,k)=>i&(1<<k)?o.bounds.max[k]:v)),padding=o.type==='capsule'?o.radiusM:0;for(const point of vertices){const q=project(point);low=Math.min(low,q[0]-padding);high=Math.max(high,q[1]+padding);}}
  const rangeA=[-BUFFER_M*3,BUFFER_M*3],rangeB=[low-BUFFER_M*4,high+BUFFER_M*4];if(Math.max(rangeA[0]-rangeB[1],rangeB[0]-rangeA[1])<=r.radiusM+BUFFER_M+r.clearanceM){cache.set(o,null);return null;}
  const frames={};for(const key of ['start','mid','end']){const q=snapshots[key].routes.find(x=>x.id===r.id).motion;frames[key]={axis:unit(cross(q.normal,sub(q.endpoint,q.fixedEnd))),origin:q.fixedEnd};}
  const witness={axis:frames.mid.axis,projectionFrames:frames,rangeA,rangeB,sectionA:{startLengthM:span.startM,endLengthM:Infinity},radiusUpperBoundA:r.radiusM+BUFFER_M,basis:'The complete circular U and its straight incoming lead lie in the endpoint/normal plane. Exact withdrawal extrema bound the binormal angle atan2(tangential travel,positive terminal height). Every point of the rigid solid, relative to the fixed endpoint or its own translating head endpoint, is projected over that entire angular interval.'};cache.set(o,witness);return witness;
 }
 function terminalPlaneWitness(p,snapshots,which,a,b){
  const r=p.routeA,m=r.motion,g=m.freeLeadMinM-BUFFER_M*4,section=which==='head'?{startLengthM:m.fixedLengthM,endLengthM:r.lengthM-g}:{startLengthM:m.fixedLengthM+g,endLengthM:r.lengthM};if(!(g>0)||!p.sourceArcA||p.sourceArcA[0]<section.startLengthM-1e-8||p.sourceArcA[1]>section.endLengthM+1e-8)return null;
  const origin=which==='head'?m.endpoint:m.fixedEnd,axis=m.normal,o=p.obstacle;let entries;if(o.id){let cache=terminalPlaneWitnesses.get(r);if(!cache){cache=new WeakMap();terminalPlaneWitnesses.set(r,cache);}entries=cache.get(o);if(!entries){entries=new Map();cache.set(o,entries);}if(entries.has(which))return entries.get(which);}const remember=value=>{entries?.set(which,value);return value;},projection=projectedSolid(o,axis,origin);let perpendicular=0,absolute=0;
  if(o.type==='cylinder'){const delta=sub(o.center,origin),along=dot(delta,axis),axisDot=dot(o.axis,axis);perpendicular=norm(sub(delta,scale(axis,along)))+o.halfLengthM*Math.sqrt(Math.max(0,1-axisDot*axisDot))+o.radiusM;absolute=norm(delta)+o.halfLengthM+o.radiusM;}
  else for(const x of [o.bounds.min[0],o.bounds.max[0]])for(const y of [o.bounds.min[1],o.bounds.max[1]])for(const z of [o.bounds.min[2],o.bounds.max[2]]){const delta=sub([x,y,z],origin);perpendicular=Math.max(perpendicular,norm(sub(delta,scale(axis,dot(delta,axis)))));absolute=Math.max(absolute,norm(delta));}
  const axial=endpointProjectionRange(r,a,b),offset=which==='head'?g:-g,aMax=Math.max(Math.abs(axial[0]+offset),Math.abs(axial[1]+offset))+BUFFER_M*2,cosine=m.minPerpendicularM/Math.hypot(m.minPerpendicularM,aMax);if(projection[1]>=g)return remember(null);
  const rangeB=[-m.maxEndpointSeparationM-absolute-BUFFER_M*6,cosine*(projection[1]-g)+perpendicular*Math.sqrt(Math.max(0,1-cosine*cosine))+BUFFER_M*6],rangeA=[-BUFFER_M*2,m.restLengthM+BUFFER_M*2];if(rangeA[0]-rangeB[1]<=r.radiusM+BUFFER_M+r.clearanceM)return remember(null);
  const frames={};for(const key of ['start','mid','end']){const route=snapshots[key].routes.find(q=>q.id===r.id),q=route.motion,difference=sub(q.endpoint,q.fixedEnd),along=dot(difference,q.normal),transverse=sub(difference,scale(q.normal,along)),height=norm(transverse),v=scale(transverse,1/height),normal=unit(add(scale(q.normal,height),scale(v,which==='head'?-(along+g):g-along)));frames[key]={axis:normal,origin:which==='head'?q.fixedEnd:q.endpoint};}
  return remember({axis:frames.mid.axis,projectionFrames:frames,rangeA,rangeB,sectionA:section,radiusUpperBoundA:r.radiusM+BUFFER_M,basis:'After removing a guaranteed straight terminal lead, the untrimmed circular U lies in the convex hull of its remaining straight controls. Its supporting-plane normal has connector-normal component at least h_min/hypot(h_min,max|a±g|), where exact sinusoidal or monotonic withdrawal extrema enclose the axial endpoint difference a throughout this interval. The entire rigid terminal solid is bounded by its exact axial support and transverse radius in that moving frame.'});
 }
 function fixedFlexLineWitness(p,snapshots,a,b){
  if(!p.routeB||!p.sourceArcA||!p.sourceArcB||!p.a||!p.c||ownerKey(p.routeA.motion,domain)!==ownerKey(p.routeB.motion,domain))return null;
  for(const reverse of [false,true]){
   const flex=reverse?p.routeB:p.routeA,fixed=reverse?p.routeA:p.routeB,arc=reverse?p.sourceArcB:p.sourceArcA,otherArc=reverse?p.sourceArcA:p.sourceArcB,points=reverse?[p.a,p.b]:[p.c,p.d];
   if(flex.motion.type!=='launch-loop'||!(fixed.motion.type==='rigid'||otherArc[1]<=fixed.motion.fixedLengthM+1e-8))continue;
   const obstacle={type:'mesh',sourceVertices:points,bounds:{min:[0,1,2].map(k=>Math.min(...points.map(q=>q[k]))),max:[0,1,2].map(k=>Math.max(...points.map(q=>q[k])))}};
   const witness=terminalPlaneWitness({routeA:flex,sourceArcA:arc,obstacle},snapshots,'fixed',a,b);if(!witness)continue;
   if(witness.rangeA[0]-witness.rangeB[1]<=flex.radiusM+fixed.radiusM+BUFFER_M*2+Math.max(flex.clearanceM,fixed.clearanceM))continue;
   const section={startLengthM:otherArc[0],endLengthM:otherArc[1]},basis=witness.basis+' The opposite selected line span is rigid in the same owner frame; all of its rendered points are checked inside the stated projected envelope.';
   return reverse?{...witness,rangeA:witness.rangeB,rangeB:witness.rangeA,sectionA:section,sectionB:witness.sectionA,radiusUpperBoundA:fixed.radiusM+BUFFER_M,radiusUpperBoundB:flex.radiusM+BUFFER_M,basis}:{...witness,sectionB:section,radiusUpperBoundB:fixed.radiusM+BUFFER_M,basis};
  }
  return null;
 }
 return {
  motionBound(a,b,{mid}){let maximum=0;for(const r of mid.routes)maximum=Math.max(maximum,owner(a,b,r.motion)+localRouteTravel(a,b,r));for(const o of mid.obstacles)maximum=Math.max(maximum,owner(a,b,o.motion)+localObstacleTravel(a,b,o,domain,geometry));return 2*maximum+BUFFER_M*2;},
  pairMotionBound(a,b,p){
   const x=p.routeA,m=x.motion,la=firstLead(x,p.a,p.b,p.sourceArcA),tail=finalLead(x,p.a,p.b,p.sourceArcA);
   if(p.kind==='solid'){
    const n=p.obstacle.motion,relative=base(a,b,m,n),ordinary=relative+localRouteTravel(a,b,x,p.sourceArcA)+localObstacleTravel(a,b,p.obstacle,domain,geometry);
    if(ownerKey(m,domain)===ownerKey(n,domain)&&n.type==='head'&&n.groupId===m.groupId&&tail){const margin={radiusM:x.radiusM,clearanceM:x.clearanceM,routeId:x.id},full=segmentObstacleClearance(tail.origin,add(tail.origin,scale(tail.axis,m.freeLeadMinM)),p.obstacle,margin),current=segmentObstacleClearance(p.a,p.b,p.obstacle,margin);return (Number.isNaN(current)||Number.isNaN(full)?Infinity:Number.isFinite(current)&&Number.isFinite(full)?Math.max(0,current-full):0)+BUFFER_M*4;}
    if(relative===0&&n.type==='rigid'&&la&&!p.obstacle.apertures?.some(q=>q.routeIds.includes(x.id))&&projectedSolid(p.obstacle,la.axis,la.origin)[1]<=la.endM-BUFFER_M*2){
     // Any first-lead tessellation subset is bounded by the complete invariant
     // ray. Use its exact distance lower bound instead of claiming that moving
     // subdivision endpoints are material points with zero displacement.
     const margin={radiusM:x.radiusM,clearanceM:x.clearanceM,routeId:x.id},full=segmentObstacleClearance(add(la.origin,scale(la.axis,la.startM)),add(la.origin,scale(la.axis,la.endM)),p.obstacle,margin),current=segmentObstacleClearance(p.a,p.b,p.obstacle,margin);return Math.max(0,current-full)+BUFFER_M*4;
    }
    return ordinary;
   }
   const y=p.routeB,n=y.motion,relative=base(a,b,m,n),lb=firstLead(y,p.c,p.d,p.sourceArcB),fixedB=n.type==='rigid'||p.sourceArcB&&p.sourceArcB[1]<=n.fixedLengthM+1e-6,fixedA=m.type==='rigid'||p.sourceArcA&&p.sourceArcA[1]<=m.fixedLengthM+1e-6;
   if(relative===0&&la&&fixedB&&p.c&&Math.max(dot(sub(p.c,la.origin),la.axis),dot(sub(p.d,la.origin),la.axis))<=la.endM-BUFFER_M*2){const current=segmentSegmentDistance(p.a,p.b,p.c,p.d).distanceM,full=segmentSegmentDistance(add(la.origin,scale(la.axis,la.startM)),add(la.origin,scale(la.axis,la.endM)),p.c,p.d).distanceM;return Math.max(0,current-full)+BUFFER_M*4;}
   if(relative===0&&lb&&fixedA&&p.a&&Math.max(dot(sub(p.a,lb.origin),lb.axis),dot(sub(p.b,lb.origin),lb.axis))<=lb.endM-BUFFER_M*2){const current=segmentSegmentDistance(p.a,p.b,p.c,p.d).distanceM,full=segmentSegmentDistance(p.a,p.b,add(lb.origin,scale(lb.axis,lb.startM)),add(lb.origin,scale(lb.axis,lb.endM))).distanceM;return Math.max(0,current-full)+BUFFER_M*4;}
   if(relative===0&&la&&lb){const full=segmentSegmentDistance(add(la.origin,scale(la.axis,la.startM)),add(la.origin,scale(la.axis,la.endM)),add(lb.origin,scale(lb.axis,lb.startM)),add(lb.origin,scale(lb.axis,lb.endM))).distanceM;return Math.max(0,segmentSegmentDistance(p.a,p.b,p.c,p.d).distanceM-full)+BUFFER_M*4;}
   return relative+localRouteTravel(a,b,x,p.sourceArcA)+localRouteTravel(a,b,y,p.sourceArcB);
  },
  pairSeparationLowerBound(a,b,p,snapshots){
   if(p.kind!=='solid'){const witness=fixedFlexLineWitness(p,snapshots,a,b);if(witness)return witness;}
   const x=p.routeA,m=x.motion;if(m.type!=='launch-loop')return null;const span=x.motionSpans.find(s=>s.id===x.id+':flex'),inFlex=p.sourceArcA&&p.sourceArcA[0]>=span.startM-1e-8&&p.sourceArcA[1]<=span.endM+1e-8;
   if(p.kind==='solid'&&ownerKey(m,domain)===ownerKey(p.obstacle.motion,domain)){
    if(p.obstacle.motion.type==='head'&&p.obstacle.motion.groupId===m.groupId){if(inFlex){const plane=loopPlaneWitness(p,snapshots,a,b);if(plane)return plane;}const witness=terminalPlaneWitness(p,snapshots,'head',a,b);if(witness)return witness;}
    else if(p.obstacle.motion.type==='rigid'){if(inFlex&&p.obstacle.name==='Open cable clamp'){const plane=loopPlaneWitness(p,snapshots,a,b);if(plane)return plane;}const witness=terminalPlaneWitness(p,snapshots,'fixed',a,b);if(witness)return witness;}
   }
   if(p.kind==='solid'&&domain.kind==='ground'&&m.owner==='ground'&&firstLead(x,p.a,p.b,p.sourceArcA)&&p.obstacle.motion.owner==='ground'&&(['rigid','arm'].includes(p.obstacle.motion.type)||p.obstacle.motion.type==='head'&&p.obstacle.motion.release.mode!=='drop-away')){
    const rangeA=[m.fixedEnd[1]-BUFFER_M*2,m.fixedEnd[1]+BUFFER_M*2],rangeB=[p.obstacle.bounds.min[1]-BUFFER_M*2,p.obstacle.bounds.max[1]+BUFFER_M*2],gap=Math.max(rangeA[0]-rangeB[1],rangeB[0]-rangeA[1]),lead=x.motionSpans.find(s=>s.id===x.id+':fixed-lead');
    if(gap>x.radiusM+BUFFER_M+x.clearanceM)return {axis:[0,1,0],rangeA,rangeB,sectionA:{startLengthM:lead.startM,endLengthM:lead.endM},radiusUpperBoundA:x.radiusM+BUFFER_M,basis:'The length/construction inequalities retain this entire fixed straight lead at constant height throughout withdrawal. The ground solid is fixed or moves only horizontally, preserving its complete vertical extent.'};
   }
   if(p.kind==='solid'&&domain.kind==='flight'&&m.internal&&p.obstacle.motion.type==='rigid'&&Math.abs(m.normal[1])<1e-8&&((launcher!=='starship'&&['fitting','payload','upper',...(launcher==='longMarch5B'?['lower']:[])].includes(p.obstacle.motion.owner))||(launcher==='starship'&&b<=clock.release&&['fitting','payload'].includes(p.obstacle.motion.owner)))){
    const axis=m.normal;let rangeA=internalProjections.get(x);if(!rangeA){const endpoint=endpointProjectionRange(x,a,b),fixed=(x.renderedPoints||x.points).filter((_,i)=>i===0||x.renderedPrefix?.[i]<=m.fixedLengthM),fixedValues=fixed.map(q=>dot(sub(q,m.fixedEnd),axis));rangeA=[Math.min(0,...fixedValues,...endpoint)-BUFFER_M*3,m.restLengthM+Math.max(0,...fixedValues)+BUFFER_M*3];internalProjections.set(x,rangeA);}const raw=projectedSolid(p.obstacle,axis,m.fixedEnd),rangeB=[raw[0]-BUFFER_M*3,raw[1]+BUFFER_M*3],gap=Math.max(rangeA[0]-rangeB[1],rangeB[0]-rangeA[1]);
    if(gap>x.radiusM+BUFFER_M+x.clearanceM){const frames={};for(const key of ['start','mid','end']){const q=snapshots[key].routes.find(r=>r.id===x.id).motion;frames[key]={axis:q.normal,origin:q.fixedEnd};}return {axis,projectionFrames:frames,rangeA,rangeB,radiusUpperBoundA:x.radiusM+BUFFER_M,basis:'The carrier tube is outside the payload along the horizontal connector normal. Its fixed prefix and convex-U controls bound its entire projection throughout withdrawal. These rigid owners translate only vertically (or share the retained carriage before release), so their relative projection on this axis is invariant.'};}
   }
   if(p.kind==='solid'&&domain.kind==='flight'&&launcher!=='starship'&&m.internal&&b<=clock.release&&p.obstacle.motion.type==='fairing-half'){
    const rangeA=[Math.min(...x.points.map(q=>q[0]))-BUFFER_M,Math.max(...x.points.map(q=>q[0]))+BUFFER_M],rangeB=fairingXProjection(p.obstacle,a,b,geometry,clock),gap=Math.max(rangeA[0]-rangeB[1],rangeB[0]-rangeA[1]);
    if(gap>x.radiusM+BUFFER_M+x.clearanceM)return {axis:[1,0,0],rangeA,rangeB,radiusUpperBoundA:x.radiusM+BUFFER_M,basis:'The flight lead remains fixed before payload separation. Exact extrema of the fairing half’s affine translation plus sinusoidal rigid rotation enclose every actual inverse-transformed solid-box corner throughout this jettison interval.'};
   }
   if(inFlex&&p.kind==='solid'&&domain.kind==='ground'&&m.owner==='ground'&&p.obstacle.motion.owner!=='ground'&&p.obstacle.motion.type==='rigid'&&Math.abs(m.normal[1])<1e-8){
    const rangeA=flexProjection(x,a,b),rangeB=risingProjection(p.obstacle,a,b,m.normal),gap=Math.max(rangeA[0]-rangeB[1],rangeB[0]-rangeA[1]);
    if(gap>m.nominalRadiusM+RADIUS_ENVELOPE_M+x.clearanceM)return {axis:m.normal,rangeA,rangeB,sectionA:{startLengthM:x.motionSpans.find(s=>s.id===x.id+':flex').startM,endLengthM:Infinity},radiusUpperBoundA:m.nominalRadiusM+RADIUS_ENVELOPE_M,basis:'The verified untrimmed U lies in the convex hull of its straight controls; its lowest radial projection is bounded by the exact pull/drop or rotating-head extrema. Actual rising-solid bounds are inverse-transformed to the stage and projected over exact attitude extrema. Vertical liftoff translation has zero projection on this horizontal axis.'};
   }
   if(p.kind==='solid'&&launcher==='starship'&&domain.kind==='flight'&&m.internal&&m.owner==='fitting'&&b<=clock.boostbackCutoff&&p.obstacle.motion.owner==='lower'&&p.obstacle.motion.type==='rigid'){
    const rangeA=[Math.min(...x.points.map(q=>q[1]))-BUFFER_M,Math.max(...x.points.map(q=>q[1]))+BUFFER_M],rangeB=departureProjection(a,b,p.obstacle),gap=Math.max(rangeA[0]-rangeB[1],rangeB[0]-rangeA[1]);
    if(gap>x.radiusM+BUFFER_M+x.clearanceM)return {axis:[0,1,0],rangeA,rangeB,radiusUpperBoundA:x.radiusM+BUFFER_M,basis:'The flight lead remains rigid in the stage frame before payload release. Interval arithmetic encloses every partial step of the renderer’s booster departure integrator, and exact trigonometric extrema enclose the complete rigid solid rotation about the lower-stage centre.'};
   }
   if(p.kind==='self')return {kind:'convex-u',spanId:x.id+':flex',minimumBendRadiusM:m.bendRadiusM,minimumLegSeparationM:m.minPerpendicularM,radiusLowerBoundA:m.nominalRadiusM,radiusUpperBoundA:m.nominalRadiusM+RADIUS_ENVELOPE_M,maximumChordDeviationM:m.bendRadiusM*(1-Math.cos(Math.PI/32)),maximumBufferDeviationM:BUFFER_M,basis:'The fixed-length U construction has nonnegative straight portions, two untrimmed radius-R fillets with total turn pi, and the checked all-time perpendicular leg separation.'};
   if(inFlex&&p.kind==='solid'&&m.owner==='ground'&&domain.kind==='ground'&&p.obstacle.motion.owner==='ground'&&['rigid','arm'].includes(p.obstacle.motion.type)){
    // The first/last U leads are horizontal and its middle is monotone in Y.
    // Ground-rigid solids and service arms rotating about Y keep their entire
    // Y projection, so this is an all-time separation plane, not a motion skip.
    const rangeA=[m.minimumEndpointHeightM-BUFFER_M,m.fixedEnd[1]+BUFFER_M],rangeB=[p.obstacle.bounds.min[1]-BUFFER_M,p.obstacle.bounds.max[1]+BUFFER_M],gap=Math.max(rangeA[0]-rangeB[1],rangeB[0]-rangeA[1]);
    if(gap>m.nominalRadiusM+RADIUS_ENVELOPE_M+x.clearanceM)return {axis:[0,1,0],rangeA,rangeB,sectionA:{startLengthM:x.motionSpans.find(s=>s.id===x.id+':flex').startM,endLengthM:Infinity},radiusUpperBoundA:m.nominalRadiusM+RADIUS_ENVELOPE_M,basis:'The verified untrimmed convex U remains between the fixed lead height and the lowest prescribed head height. This solid is ground-rigid or rotates only about the vertical axis, so its complete vertical bounds are invariant.'};
   }
   const y=p.routeB,n=y?.motion;
   if(inFlex&&p.kind==='line'&&domain.kind==='ground'&&m.owner==='ground'&&n?.owner==='ground'){
    const rangeA=[m.minimumEndpointHeightM-BUFFER_M*2,m.fixedEnd[1]+BUFFER_M*2];let rangeB,sectionB;
    if(n.type==='rigid'){rangeB=rigidLineHeights.get(y);if(!rangeB){rangeB=[Math.min(...y.points.map(q=>q[1]))-BUFFER_M*2,Math.max(...y.points.map(q=>q[1]))+BUFFER_M*2];rigidLineHeights.set(y,rangeB);}}
    else if(n.type==='launch-loop'){const other=y.motionSpans.find(s=>s.id===y.id+':flex');if(p.sourceArcB&&p.sourceArcB[0]>=other.startM-1e-8&&p.sourceArcB[1]<=other.endM+1e-8){rangeB=[n.minimumEndpointHeightM-BUFFER_M*2,n.fixedEnd[1]+BUFFER_M*2];sectionB={startLengthM:other.startM,endLengthM:Infinity};}}
    if(rangeB&&Math.max(rangeA[0]-rangeB[1],rangeB[0]-rangeA[1])>x.radiusM+y.radiusM+BUFFER_M*2+Math.max(x.clearanceM,y.clearanceM))return {axis:[0,1,0],rangeA,rangeB,sectionA:{startLengthM:span.startM,endLengthM:Infinity},sectionB,radiusUpperBoundA:x.radiusM+BUFFER_M,radiusUpperBoundB:y.radiusM+BUFFER_M,basis:'Each U remains between its prescribed terminal heights; the other circuit is fixed or has a disjoint all-time vertical U interval. Every rendered point in the selected spans is checked against those full-motion ranges.'};
   }
   if(!inFlex||p.kind!=='line'||n?.type!=='launch-loop'||n.groupId!==m.groupId||n.owner!==m.owner)return null;const otherSpan=y.motionSpans.find(s=>s.id===y.id+':flex');if(!p.sourceArcB||p.sourceArcB[0]<otherSpan.startM-1e-8||p.sourceArcB[1]>otherSpan.endM+1e-8)return null;
   const frames={};for(const key of ['start','mid','end']){const r=snapshots[key].routes.find(r=>r.id===x.id),q=r.motion;frames[key]={origin:q.fixedEnd,axis:unit(cross(q.normal,sub(q.endpoint,q.fixedEnd)))};}
   const maxTan=m.maxTangentialTravelM||0,cMin=m.minPerpendicularM/Math.hypot(m.minPerpendicularM,maxTan),offset=n.planeOffsetM-m.planeOffsetM,epsilon=BUFFER_M*5;
   return {axis:frames.mid.axis,projectionFrames:frames,rangeA:[-epsilon,epsilon],rangeB:[Math.min(offset,offset*cMin)-epsilon,Math.max(offset,offset*cMin)+epsilon],sectionA:{startLengthM:x.motionSpans.find(s=>s.id===x.id+':flex').startM,endLengthM:Infinity},sectionB:{startLengthM:y.motionSpans.find(s=>s.id===y.id+':flex').startM,endLengthM:Infinity},radiusUpperBoundA:m.nominalRadiusM+RADIUS_ENVELOPE_M,radiusUpperBoundB:n.nominalRadiusM+RADIUS_ENVELOPE_M,basis:'Each circuit in this head has the same normal and common perpendicular endpoint motion; its entire U lies in a parallel translated plane. In the shared rotating plane frame, the lane projection is its port offset times h/sqrt(h²+tangentTravel²), bounded analytically over the full withdrawal.'};
  }
 };
}
function constructionProof(snapshot){
 const failures=[],records=[];for(const r of snapshot.routes){const m=r.motion;if(m.type!=='launch-loop')continue;const R=m.bendRadiusM,h=m.minPerpendicularM,d=m.maxEndpointSeparationM,L=m.restLengthM,a=Math.sqrt(Math.max(0,d*d-h*h)),trim=R*(d+a)/h,middleRatio=R/h*(1+a/d),free=(L-d-Math.PI*R)/2,lo=(L-d+(4-Math.PI)*R)/2,hi=(L-h+4*R*d/h)/2,ok=m.lengthMetric==='developed'&&r.lengthEvidence?.ok===true&&h>=2*R&&middleRatio<.49&&free>(.02/.98)*trim&&lo>2.1*R&&hi<L;
  const record={routeId:r.id,ok,minimumPerpendicularM:h,maximumChordM:d,bendRadiusM:R,physicalLoopRestLengthM:L,maximumLoopChordDeficitM:Math.PI*R*(1-Math.sin(Math.PI/32)/(Math.PI/32)),maximumLengthSolverErrorM:2*L/2**28,maximumMiddleTrimRatio:middleRatio,minimumStraightLeadM:free,solverLeadBracketM:[lo,hi],initialLengthEvidence:r.lengthEvidence};records.push(record);if(!ok)failures.push({code:'unproven-flex-construction',...record});}
 return {ok:!failures.length,issues:failures,records,basis:'Monotonic pull/drop and exact rotating-head extrema bound endpoint chord d and its perpendicular component h. The fixed endpoint stays above every head pose. The inequalities retain both untrimmed radius-R fillets and keep the lead root inside its bisection bracket. Their total turn is pi and their tangent trims sum to 2 R d/h, so physical developed length is 2*lead+d+pi*R-4*R*d/h, with derivative 2 in lead. The 28 bisections therefore conserve the allocated physical cut length within 2*L/2^28 plus explicit numerical roundoff. Every rendered angular chord is at most pi/16, giving the independently checked chord-deficit bound pi*R*(1-sin(pi/32)/(pi/32)); this display deficit is distinct from the physical length error.'};
}
function terrainProof(snapshot){
 const safeRadius=snapshot.groundPlane.radiusM-Math.SQRT2*snapshot.groundPlane.cellStepM-.001,issues=[],records=[];
 for(const route of snapshot.routes){const m=route.motion;if(m.owner!=='ground')continue;const fixed=route.points.filter((_,i)=>m.type==='rigid'||i<=route.points.findIndex(p=>norm(sub(p,m.fixedEnd))<1e-7)),fixedRadius=Math.max(...fixed.map(p=>Math.hypot(p[0],p[2])+route.radiusM)),flexRadius=m.type==='launch-loop'?Math.hypot(m.fixedEnd[0],m.fixedEnd[2])+m.restLengthM+route.radiusM:0,radius=Math.max(fixedRadius,flexRadius);records.push({routeId:route.id,maximumFootprintRadiusM:radius});if(!(radius<safeRadius))issues.push({code:'unproven-terrain-footprint',routeId:route.id,maximumRadiusM:radius,flatCellRadiusM:safeRadius});}
 return {ok:!issues.length,issues,safeRadiusM:safeRadius,records,basis:'The full tube footprint is at least one 18 m terrain-cell diagonal inside the renderer’s flat grading disk. Every possible contacting terrain triangle therefore has all vertices at or below grade; the audited grade solid conservatively encloses it.'};
}
function domainsFor(launcher,clock){
 const end=900,parallel=launcher==='falconHeavy',single=launcher==='longMarch5B',ground=[0,.45,2,4,10,26,35],flight=[35,clock.boosterSeparation,clock.boosterSeparation+(parallel?25:40),clock.stageSeparation,clock.stageSeparation+(launcher==='starship'?45:45),clock.fairingJettison,clock.fairingJettison===null?null:clock.fairingJettison+46,540,clock.release,clock.release+1.5,clock.releaseClear,...(launcher==='starship'?[552,575,585,587,588,591,594,635,660,680]:[]),end].filter(t=>Number.isFinite(t)&&t>=35&&t<=end),times=[...new Set([...ground,...flight])].sort((a,b)=>a-b);
 return times.slice(1).map((b,i)=>{const a=times[i],kind=a<35?'ground':'flight';return {id:kind+'-'+a+'-'+b,start:a,end:b,kind,clock,launcher,includePart:owner=>{if(kind==='ground')return true;if(owner==='ground')return false;if(owner==='lower'&&!single&&a>=(launcher==='starship'?clock.boostbackCutoff:clock.stageSeparation+45))return false;if(owner.startsWith('booster-')&&a>=clock.boosterSeparation+(parallel?25:40))return false;if(owner==='shell'&&launcher!=='starship'&&a>=clock.fairingJettison+46)return false;return true;}};});
}
export {motionModel as launchRoutingMotionModel,domainsFor as launchRoutingDomains};
function update(lv,t){lv.update({t,altitudeKm:t<35?launchRiseM(t,lv.umbilicals.design.launcherId)/1000:0,flightPhase:t<0?'pad':t<540?'ascent':'insertion'},'ascent',{phase:'D',domain:'launcher'});lv.root.updateWorldMatrix(true,true);}
function inventoryIssues(s){return [...s.planningFailures.map(f=>({code:'unresolved-route-plan',...f})),...s.inventory.unregisteredTubeMeshes.map(id=>({code:'unregistered-drawn-tube',meshId:id})),...s.inventory.missingTubeMeshes.map(id=>({code:'missing-drawn-tube',meshId:id}))];}
function matingIssues(lv){const issues=[];for(const g of lv.umbilicals.groups)for(const tail of g.tails){const flight=tail.flight.localToWorld(new T.Vector3(0,.0825,0)),ground=tail.groundHead.localToWorld(g.normal.clone().multiplyScalar(-.18)),gapM=flight.distanceTo(ground);if(gapM>2e-5)issues.push({code:'unmated-interface',routeId:tail.connection.id,gapM});}return issues;}
function summary(report){return {ok:report.ok,issueCount:report.issueCount??report.issues.length,issues:report.issues,counts:report.counts,minimumClearanceM:report.minimumClearanceM,samples:report.samples,certifiedIntervals:report.certifiedIntervals,unresolvedIntervals:report.unresolvedIntervals,intervals:report.intervals};}

export function checkLaunchMotionEnclosures(){
 const issues=[],intervals=[[35,142],[142,168],[168,187],[186.99,190]];for(let step=0;step<=180;step++){const time=142+step*.25;intervals.push([time-.0037,time+.0061]);}
 let poses=0;for(const [a,b]of intervals){const envelope=superHeavyDepartureEnvelope(a,b);for(let i=0;i<=20;i++){const time=a+(b-a)*i/20,p=superHeavyDeparture(time);poses++;for(const field of ['sideM','axialM'])if(p[field]<envelope[field][0]-1e-7||p[field]>envelope[field][1]+1e-7)issues.push({code:'departure-enclosure-regression',interval:[a,b],time,field,actual:p[field],range:envelope[field]});}}
 for(const sine of [-12,-.3,8])for(const cosine of [-8,.2,15])for(const linear of [-4,0,3])for(const rate of [-.9,.9]){const range=affineTrigRange(sine,cosine,linear,rate,0,1);for(let i=0;i<=100;i++){const f=i/100,value=sine*Math.sin(rate*f)+cosine*Math.cos(rate*f)+linear*f;if(value<range[0]-1e-10||value>range[1]+1e-10)issues.push({code:'fairing-trigonometric-envelope-regression',sine,cosine,linear,rate,f,value,range});}}
 const normal=[.8,0,.6],tangent=[.6,0,-.8],P=[5,5,3],pivot=[1,2,-3],head=[4,2,8],zeroEndpoint=add(add(head,scale(normal,.18)),scale(tangent,.35)),g=.6;
 for(const direction of [-1,1])for(const [a,b]of [[0,2],[0,.45],[.45,1.4],[1.4,2]]){
  const r={motion:{normal,planeTangent:tangent,fixedEnd:P,pivot:true,pivotDirection:direction,pivotOrigin:pivot,zeroHead:head,zeroEndpoint,release:{motionStart:0,motionEnd:2}}},ranges=[normal,tangent,[0,1,0]].map(axis=>endpointProjectionRange(r,a,b,axis));
  for(let i=0;i<=40;i++){const t=a+(b-a)*i/40,angle=direction*1.10*fraction(t,r.motion.release),v=sub(head,pivot),Q=add(add(pivot,[Math.cos(angle)*v[0]+Math.sin(angle)*v[2],v[1],-Math.sin(angle)*v[0]+Math.cos(angle)*v[2]]),sub(zeroEndpoint,head)),delta=sub(Q,P),along=dot(delta,normal),transverse=sub(delta,scale(normal,along)),h=norm(transverse),across=scale(transverse,1/h);
   for(const [k,axis]of [normal,tangent,[0,1,0]].entries()){const value=dot(delta,axis);if(value<ranges[k][0]-1e-10||value>ranges[k][1]+1e-10)issues.push({code:'withdrawal-projection-envelope-regression',direction,interval:[a,b],t,value,range:ranges[k]});}
   for(const which of ['head','fixed']){const axis=unit(add(scale(normal,h),scale(across,which==='head'?-(along+g):g-along))),origin=which==='head'?P:Q,controls=which==='head'?[P,add(P,scale(normal,5)),add(Q,scale(normal,5)),add(Q,scale(normal,g))]:[add(P,scale(normal,g)),add(P,scale(normal,5)),add(Q,scale(normal,5)),Q];for(const point of controls)if(dot(sub(point,origin),axis)<-1e-10)issues.push({code:'terminal-support-plane-regression',which,direction,t,point});}
  }
 }
 // Tessellation vertices are not material points. A local first-lead subset
 // can move along the same invariant ray, so its midpoint distance must be
 // reduced to the full-ray lower bound before using it as a certificate.
 const route={id:'regression-flex',lengthM:10,motion:{type:'launch-loop',owner:'ground',groupId:'regression',fixedLengthM:0,firstStraightLengthM:4,freeLeadMinM:4,fixedEnd:[0,0,0],normal:[1,0,0]},radiusM:.01,clearanceM:0},fixed={id:'regression-fixed',motion:{type:'rigid',owner:'ground'},radiusM:.01,clearanceM:0},pair={kind:'line',routeA:route,routeB:fixed,a:[2,0,0],b:[3,0,0],c:[.5,.05,0],d:[.5,.1,0],sourceArcA:[2,3],sourceArcB:[0,.05]},model=motionModel({kind:'ground'},{},launchClockFor('starship'),'starship'),bound=model.pairMotionBound(0,1,pair),required=segmentSegmentDistance(pair.a,pair.b,pair.c,pair.d).distanceM-.05;
 if(!Number.isFinite(bound)||bound<required)issues.push({code:'terminal-ray-envelope-regression',boundM:bound,requiredM:required});
 return {ok:!issues.length,issues,intervals:intervals.length,poses,basis:'Regression samples cross every integrator-step boundary; acceptance of real launch intervals still requires analytic enclosures and actual-buffer finite-radius certificates.'};
}

const allLaunchConfigurations=()=>Object.keys(launchFleet).flatMap(launcher=>launchSitesFor(launcher).map(site=>({launcher,site:site.id})));
// This gate certifies the complete launcher/service installation with a named,
// positively fitted test article. The independently gated joined matrix retains
// every shipped spacecraft/carrier pair, including its production hold outcome.
export function launchRoutingHardware(launcher,site){
 const candidates=[
  {id:'default-flight-article',label:'Default flight article',input:defaults},
  {id:'finetune-flight-article',label:'Fine-tuning mission flight article',input:missionStarter('finetune')},
  {id:'compact-launch-service-article',label:'One-tray launcher service test article',input:{...defaults,trayCount:1,solarM2:24,radiatorM2:8,batteryKWh:8,propellantKg:100,storageTB:1}}
 ];
 for(const candidate of candidates){
  const hardware=sizeDesign({...applyPreset(candidate.input,'launcher',launcher),launchSite:site}),compatibility=launchCompatibility(hardware);
  if(compatibility.ok&&!hardware.inputErrors?.length)return {hardware,article:{id:candidate.id,label:candidate.label,input:hardware.input,compatibility,stowedDiameterM:hardware.stowedDiameterM,stowedLengthM:hardware.stowedLengthM,launchMassKg:hardware.launchKg,radialClearanceM:hardware.fairing.radialClearanceM,axialClearanceM:hardware.fairing.axialClearanceM}};
 }
 throw new Error('No positively compatible launcher service test article for '+launcher+'/'+site);
}
const launchSourceFingerprint=()=>routingSourceFingerprint({entries:[fileURLToPath(import.meta.url)]});
export function validLaunchDomainProof(proof,domain){
 if(!proof||proof.id!==domain.id||proof.kind!==domain.kind||proof.start!==domain.start||proof.end!==domain.end||proof.ok!==true||proof.issueCount!==0||!Array.isArray(proof.issues)||proof.issues.length||proof.unresolvedIntervals!==0||!Number.isInteger(proof.samples)||proof.samples<3||!Array.isArray(proof.intervals)||proof.certifiedIntervals!==proof.intervals.length||!proof.intervals.length)return false;
 let cursor=domain.start;for(const interval of proof.intervals){if(!Number.isFinite(interval.start)||!Number.isFinite(interval.end)||interval.end<=interval.start||Math.abs(interval.start-cursor)>1e-10||interval.end>domain.end+1e-10||!Number.isFinite(interval.clearanceLowerBoundM)||!(interval.clearanceLowerBoundM>1e-7))return false;cursor=interval.end;}return Math.abs(cursor-domain.end)<=1e-10;
}
function validLaunchCaseProof(entry){
 if(!entry||!launchFleet[entry.launcher]||!launchSitesFor(entry.launcher).some(site=>site.id===entry.site)||entry.ok!==true||entry.static?.ok!==true||entry.static.issueCount!==0||!Array.isArray(entry.static.issues)||entry.static.issues.length||!Array.isArray(entry.matingIssues)||entry.matingIssues.length||!Array.isArray(entry.inventoryIssues)||entry.inventoryIssues.length||entry.construction?.ok!==true||entry.terrain?.ok!==true||!Number.isInteger(entry.routes)||entry.routes<1||!Number.isInteger(entry.obstacles)||entry.obstacles<1||!Array.isArray(entry.domains))return false;
 if(!entry.article?.id||entry.article.compatibility?.ok!==true||entry.article.compatibility.issues?.length||![entry.article.stowedDiameterM,entry.article.stowedLengthM].every(x=>Number.isFinite(x)&&x>0))return false;
 const domains=domainsFor(entry.launcher,launchClockFor(entry.launcher));return entry.domains.length===domains.length&&domains.every((domain,index)=>validLaunchDomainProof(entry.domains[index],domain));
}
function launchReport(cases,sourceFingerprint,sourceUnchanged,regressions,issues=[],selection={}){
 const all=allLaunchConfigurations(),actual=new Set(cases.map(c=>c.launcher+'/'+c.site)),complete=actual.size===all.length&&all.every(c=>actual.has(c.launcher+'/'+c.site)),selectedComplete=sourceUnchanged&&!issues.length&&regressions.ok&&cases.length>0&&cases.every(validLaunchCaseProof);
 return {schema:'orbital-launch-routing-audit/v1',ok:complete&&selectedComplete,sourceFingerprint,sourceUnchanged,selection,issues,coverage:{complete,selectedComplete,expectedConfigurations:all.length,checkedConfigurations:cases.length,routes:cases.reduce((n,c)=>n+(c.routes||0),0),obstacles:cases.reduce((n,c)=>n+(c.obstacles||0),0),allActiveMotionDomains:complete&&selectedComplete},cases,regressions:{sharedKernel:'routing-audit-checks.mjs',motionEnclosures:regressions},basis:{geometry:'Actual transformed tube rings, caps, connector anchors and physical solid buffers, including source manifolds, site water lines, lightning conductors and guy wires.',motion:'Every interval must receive a conservative clearance certificate; collisions, missing geometry, invalid proofs and resource-limited or unresolved intervals fail.',scope:'Preliminary modeled routing allocations. Provider ICD, fabrication drawings, installed bend-life capability and physical qualification remain separate evidence.'}};
}

export function mergeLaunchRoutingReports(reports){
 const sourceFingerprint=launchSourceFingerprint(),issues=[],cases=[],seen=new Set();
 for(const report of reports){
  if(report?.schema!=='orbital-launch-routing-audit/v1'||report.sourceUnchanged!==true||!sameRoutingSourceFingerprint(report.sourceFingerprint,sourceFingerprint))issues.push({code:'stale-launch-source',fingerprint:report?.sourceFingerprint?.value});
  if(report?.coverage?.selectedComplete!==true||report.issues?.length)issues.push({code:'incomplete-launch-shard'});
  for(const entry of report?.cases||[]){const id=entry.launcher+'/'+entry.site;if(seen.has(id)){issues.push({code:'duplicate-launch-case',case:id});continue;}seen.add(id);cases.push(entry);if(!validLaunchCaseProof(entry))issues.push({code:'invalid-launch-case-proof',case:id});}
 }
 for(const expected of allLaunchConfigurations()){const id=expected.launcher+'/'+expected.site;if(!seen.has(id))issues.push({code:'missing-launch-case',case:id});}
 const order=new Map(allLaunchConfigurations().map((c,i)=>[c.launcher+'/'+c.site,i]));cases.sort((a,b)=>order.get(a.launcher+'/'+a.site)-order.get(b.launcher+'/'+b.site));
 return launchReport(cases,sourceFingerprint,true,checkLaunchMotionEnclosures(),issues,{mergedReports:reports.length});
}

export function runLaunchRoutingChecks({onProgress=()=>{},maxIssues=100,launchers=null,sites=null,maxSamples=1025,maxDepth=16,onInterval=null,domainKind=null,onCheckpoint=()=>{},shard=null,resume=null}={}){
 installCanvasStub();const sourceFingerprint=launchSourceFingerprint(),motionRegressions=checkLaunchMotionEnclosures(),cases=[],issues=[],selection={launchers,sites,domainKind,shard};let sourceUnchanged=true;
 if(shard&&(!Number.isInteger(shard.index)||!Number.isInteger(shard.count)||shard.count<1||shard.index<0||shard.index>=shard.count))throw new Error('Launch shard must have an integer index in [0,count).');
 if(resume&&(!['orbital-launch-routing-partial/v1','orbital-launch-routing-audit/v1'].includes(resume.schema)||resume.sourceUnchanged!==true||!sameRoutingSourceFingerprint(resume.sourceFingerprint,sourceFingerprint)))return launchReport([],sourceFingerprint,true,motionRegressions,[{code:'stale-launch-checkpoint'}],selection);
 const selected=allLaunchConfigurations().filter((c,i)=>(!launchers||launchers.includes(c.launcher))&&(!sites||sites.includes(c.site))&&(!shard||i%shard.count===shard.index)),previous=new Map((resume?.completedCases||resume?.cases||[]).map(c=>[c.launcher+'/'+c.site,c]));
 const checkpoint=entry=>{sourceUnchanged=sourceUnchanged&&sameRoutingSourceFingerprint(sourceFingerprint,launchSourceFingerprint());onCheckpoint({schema:'orbital-launch-routing-partial/v1',ok:false,sourceFingerprint,sourceUnchanged,selection,launcher:entry.launcher,site:entry.site,completedCases:cases,entry});};
 for(const {launcher,site}of selected){
  const tag=launcher+'/'+site,finished=previous.get(tag);if(validLaunchCaseProof(finished)){cases.push(finished);onProgress({stage:'launch-resumed-case',case:tag,sourceFingerprint:sourceFingerprint.value});checkpoint(finished);continue;}
  onProgress({stage:'launch-case',case:tag,sourceFingerprint:sourceFingerprint.value});const started=Date.now();let entry={launcher,site,ok:false,domains:[]};
  try{
   const fixture=launchRoutingHardware(launcher,site),lv=makeLaunch(fixture.hardware,null,{environment:false}),clock=launchClockFor(launcher),cache=createRoutingCollisionCache();entry.article=fixture.article;update(lv,-45);
   const initial=lv.umbilicals.routingSnapshot({frame:lv.parts.tower}),staticAudit=auditRoutes(initial.routes,initial.obstacles,{maxIssues,expectedRouteIds:initial.expectedRouteIds,expectedObstacleIds:initial.expectedObstacleIds,collisionCache:cache,snapshotEvidence:initial}),inventory=inventoryIssues(initial),mating=matingIssues(lv),construction=constructionProof(initial),terrain=terrainProof(initial);
   entry={...entry,routes:initial.routes.length,obstacles:initial.obstacles.length,inventory:initial.inventory,static:summary(staticAudit),matingIssues:mating,inventoryIssues:inventory,construction,terrain};
   if(staticAudit.ok&&!inventory.length&&!mating.length&&construction.ok&&terrain.ok){
    const prior=resume?.entry?.launcher===launcher&&resume.entry.site===site?resume.entry:finished,priorDomains=new Map((prior?.domains||[]).map(d=>[d.id,d]));
    for(const domain of domainsFor(launcher,clock).filter(d=>!domainKind||d.kind===domainKind)){
     const saved=priorDomains.get(domain.id);if(validLaunchDomainProof(saved,domain)){entry.domains.push(saved);onProgress({stage:'launch-resumed-domain',case:tag,domain:domain.id});checkpoint(entry);continue;}
     cache.clear();onProgress({stage:'launch-domain',case:tag,domain:domain.id});
     const sample=t=>{update(lv,t);return lv.umbilicals.routingSnapshot({frame:domain.kind==='ground'?lv.parts.tower:lv.parts.stage,scope:domain.kind==='ground'?'all':'flight',includePart:domain.includePart});},model=motionModel(domain,initial.geometry,clock,launcher),baseline=createRoutingStationaryCertificate(sample(domain.start),{auditOptions:{maxIssues,collisionCache:cache}}),report=baseline.ok?auditSweptRoutes({sample,start:domain.start,end:domain.end,...model,...launchRoutingStationaryModel(domain,initial.geometry,clock,launcher),stationaryCertificate:baseline.certificate,maxDepth,maxSamples,onInterval:info=>onInterval?.({case:tag,domain:domain.id,...info}),motionBoundBasis:'Analytic smoothstep/linear joint ranges, launcher rise and rigid rotation envelopes, and the checked fixed-length circular-U derivative bound. Distinct fixed/moving owners, finite terminal rays and verified plane/self witnesses retain all collision pairs.',auditOptions:{maxIssues,collisionCache:cache}}):{...baseline.audit,ok:false,issues:baseline.issues,samples:1,certifiedIntervals:0,unresolvedIntervals:1,intervals:[]};
     entry.domains.push({id:domain.id,start:domain.start,end:domain.end,kind:domain.kind,...summary(report)});checkpoint(entry);onProgress({stage:'launch-domain-result',case:tag,domain:domain.id,ok:report.ok,samples:report.samples,certifiedIntervals:report.certifiedIntervals,issues:report.issues.slice(0,3)});if(!report.ok)break;
    }
   }
   const expected=domainsFor(launcher,clock);entry.coverage={expectedDomains:expected.length,completedDomains:entry.domains.length,complete:entry.domains.length===expected.length&&expected.every((domain,index)=>validLaunchDomainProof(entry.domains[index],domain))};entry.ok=staticAudit.ok&&!inventory.length&&!mating.length&&construction.ok&&terrain.ok&&entry.coverage.complete;entry.cache=cache.stats;
  }catch(error){entry.error=String(error);entry.stack=error.stack;}
  entry.seconds=(Date.now()-started)/1000;cases.push(entry);checkpoint(entry);onProgress({stage:'launch-result',case:tag,ok:entry.ok,staticIssues:entry.static?.issueCount,domains:entry.coverage,seconds:entry.seconds});
 }
 sourceUnchanged=sourceUnchanged&&sameRoutingSourceFingerprint(sourceFingerprint,launchSourceFingerprint());if(!sourceUnchanged)issues.push({code:'launch-source-changed-during-check'});
 return launchReport(cases,sourceFingerprint,sourceUnchanged,motionRegressions,issues,selection);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const at=key=>{const i=process.argv.indexOf(key);return i<0?null:process.argv[i+1];},output=at('--output'),launcher=at('--launcher'),site=at('--site'),max=Number(at('--max-samples')||1025),kind=at('--domain-kind'),parts=at('--shard')?.split('/').map(Number),shard=parts?{index:parts[0]-1,count:parts[1]}:null,resumePath=at('--resume'),mergePaths=at('--merge')?.split(',');
 const report=mergePaths?mergeLaunchRoutingReports(mergePaths.map(file=>JSON.parse(fs.readFileSync(file,'utf8')))):runLaunchRoutingChecks({launchers:launcher?[launcher]:null,sites:site?[site]:null,maxSamples:max,domainKind:kind,shard,resume:resumePath?JSON.parse(fs.readFileSync(resumePath,'utf8')):null,onCheckpoint:output?r=>{const file=output+'.partial',temporary=file+'.tmp';fs.writeFileSync(temporary,JSON.stringify(r,null,2));fs.renameSync(temporary,file);}:()=>{},onProgress:p=>console.log(JSON.stringify(p)),onInterval:process.argv.includes('--diagnostic')?x=>console.log(JSON.stringify({stage:'interval',...x})):null});
 if(output)fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({schema:report.schema,ok:report.ok,sourceFingerprint:report.sourceFingerprint.value,sourceUnchanged:report.sourceUnchanged,coverage:report.coverage,issues:report.issues,failures:report.cases.filter(c=>!c.ok).map(c=>({launcher:c.launcher,site:c.site,static:c.static?.issues,inventory:c.inventoryIssues,mating:c.matingIssues,construction:c.construction?.issues,terrain:c.terrain?.issues,domains:c.domains?.filter(d=>!d.ok),error:c.error}))},null,2));process.exitCode=report.ok||shard&&report.coverage.selectedComplete?0:1;
}
