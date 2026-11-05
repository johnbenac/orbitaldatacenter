// Quaternions [x,y,z,w] actively rotate body vectors into Earth-centred inertial axes.
// Guided rigid-body kinematics. Drives and body pointing are advanced from the previous
// inventory checkpoint so scrubbing, replay and integration follow the same trajectory.
import {DEG,R,clip,cross,dot,unit} from './orbit.js';
import {deploymentSchedule} from './deployment.js';

export const guidanceReferences=[
 ['ISS solar tracking rotary joints','https://www.nasa.gov/wp-content/uploads/2022/06/508318main_iss_ref_guide_nov2010.pdf'],
 ['NASA thermal radiator pointing','https://ntrs.nasa.gov/citations/20000032541'],
 ['ISS thermal rotary fluid interface','https://www.nasa.gov/wp-content/uploads/2021/02/473486main_iss_atcs_overview.pdf'],
 ['NASA guidance, navigation and control','https://www.nasa.gov/smallsat-institute/sst-soa/guidance-navigation-and-control/']
];
const X=[1,0,0],Y=[0,1,0],Z=[0,0,1],neg=a=>[-a[0],-a[1],-a[2]];
const IDENTITY=[0,0,0,1],safeAcos=x=>Math.acos(clip(x,-1,1)),wrap=a=>a-360*Math.floor((a+180)/360);
const rad2deg=1/DEG;
const motionCaps={wingRateDegS:2,radiatorRateDegS:.4,dishRateDegS:4,opticalRateDegS:3,terminalConeDeg:75,pointingToleranceDeg:.75};
const limitCache=new WeakMap();
export function attitudeLimits(h){
 if(limitCache.has(h))return limitCache.get(h);
 const d=h.input,w=h.bodyWidthM,b=h.bodyHeightM,l=h.bodyLengthM;
 const mp=h.solarM2*d.pvKgM2,mr=h.radiatorM2*d.radKgM2;
 const bus=Math.max(1,h.dryKg+h.propellantKg-mp-mr),span=h.wingLengthM,root=w/2+.28;
 const wingX2=root*root+root*span+span*span/3,wingZ2=(h.wingWidthM*.62)**2+h.wingWidthM**2/12;
 const rr=h.radiatorLengthM,rz=l/2+.43,ry=b/2+.16;
 const rY2=ry*ry+ry*rr*Math.SQRT1_2+rr*rr/6,rZ2=rz*rz+rz*rr*Math.SQRT1_2+rr*rr/6,rX2=h.radiatorWidthM**2/12;
 const inertia=[bus*(b*b+l*l)/12+mp*wingZ2+mr*(rY2+rZ2),bus*(w*w+l*l)/12+mp*(wingX2+wingZ2)+mr*(rX2+rZ2),bus*(b*b+w*w)/12+mp*wingX2+mr*(rX2+rY2)];
 const maxI=Math.max(1,...inertia),H=.8*d.cmgMomentumNms,T=.8*d.cmgTorqueNm;
 const bodyRateDegS=Math.min(.8,H/maxI/DEG),bodyAccelDegS2=T/maxI/DEG;
 const limits={...motionCaps,inertiaKgM2:inertia,maneuverMomentumNms:H,maneuverTorqueNm:T,bodyRateDegS,bodyAccelDegS2,prepointS:Math.ceil(180/bodyRateDegS+2*bodyRateDegS/bodyAccelDegS2+90)};
 limitCache.set(h,limits);return limits;
}
function multiply(a,b){
 const [x,y,z,w]=a,[i,j,k,l]=b;
 return [w*i+x*l+y*k-z*j,w*j-x*k+y*l+z*i,w*k+x*j-y*i+z*l,w*l-x*i-y*j-z*k];
}
function basisQuat(x,y,z){
 const a=x[0],b=y[1],c=z[2],tr=a+b+c;
 let q;
 if(tr>0){const k=2*Math.sqrt(tr+1);q=[(y[2]-z[1])/k,(z[0]-x[2])/k,(x[1]-y[0])/k,k/4];}
 else if(a>=b&&a>=c){const k=2*Math.sqrt(1+a-b-c);q=[k/4,(x[1]+y[0])/k,(z[0]+x[2])/k,(y[2]-z[1])/k];}
 else if(b>=c){const k=2*Math.sqrt(1+b-a-c);q=[(x[1]+y[0])/k,k/4,(z[1]+y[2])/k,(z[0]-x[2])/k];}
 else{const k=2*Math.sqrt(1+c-a-b);q=[(z[0]+x[2])/k,(z[1]+y[2])/k,k/4,(x[1]-y[0])/k];}
 return q;
}
function axes([x,y,z,w]){return [[1-2*(y*y+z*z),2*(x*y+w*z),2*(x*z-w*y)],[2*(x*y-w*z),1-2*(x*x+z*z),2*(y*z+w*x)],[2*(x*z+w*y),2*(y*z-w*x),1-2*(x*x+y*y)]];}
const rotateLocal=(q,a,theta)=>{const s=Math.sin(theta/2);return multiply(q,[a[0]*s,a[1]*s,a[2]*s,Math.cos(theta/2)]);};
const fromBody=(n,x,y,z)=>[0,1,2].map(i=>x[i]*n[0]+y[i]*n[1]+z[i]*n[2]);
const normalFor=(p,y,z)=>{const a=p*DEG,cy=Math.cos(a),sz=Math.sin(a);return [y[0]*cy+z[0]*sz,y[1]*cy+z[1]*sz,y[2]*cy+z[2]*sz];};
function thrustFrame(g,sign){
 const z=sign>0?unit(g.velocityECI):neg(unit(g.velocityECI)),y=unit(cross(z,sign>0?neg(g.normal):g.normal)),x=cross(y,z);
 return basisQuat(x,y,z);
}
const modes={
 launch:['Launch vehicle control','The launch vehicle carries the restrained spacecraft.'],
 insertion:['Separation hold','Align +Z with velocity and retain the launch restraints.'],
 deployment:['Commissioning hold','Maintain +Z along velocity while the appendages release, unfold and lock.'],
 tracking:['Solar tracking','Follow the orbital frame and roll toward the Sun projection. Rotate the wing drives to collect sunlight.'],
 nadir:['Nadir pointing','Keep the +Y communications deck facing Earth and +Z along track.'],
 inertial:['Inertial hold','Maintain a fixed orientation with respect to the inertial stars.'],
 lowdrag:['Low-drag pointing','Place the +X wing span along the atmosphere-relative velocity.'],
 manual:['Commanded orbital attitude','Apply the selected roll, pitch and yaw relative to the local orbital frame.'],
 eclipse:['Eclipse hold','Continue the nominal body reference and predict the Sun position for shadow exit.'],
 contact:['Station pointing','Face the +Y terminal deck toward Earth. Steer the selected terminal to the visible station.'],
 desat:['Momentum unloading','Maintain the nominal body reference while magnetic torque removes stored CMG momentum.'],
 prepoint:['Maneuver prepoint','Slew +Z to the upcoming burn direction and park both radiator roots symmetrically for thrust alignment.'],
 trim:['Insertion trim','Hold +Z along velocity during insertion trim.'],
 reboost:['Reboost pointing','Hold +Z along velocity during the station-keeping burn.'],
 disposal:['Disposal burn pointing','Align +Z with the planned disposal thrust vector.'],
 coast:['Disposal coast','Coast between maneuver events with the payload switched off.'],
 passive:['Passivated','Active pointing and joint drives have ended. The displayed orientation is the last controlled pose.']
};
export const attitudeModes=modes;
function selectMode(d,g,o,l){
 if(o.passivated||g.flightPhase==='entry')return 'passive';
 if(g.t<540)return 'launch';
 if(g.t<900)return 'insertion';
 if(o.burnDirection)return ['trim','reboost'].includes(o.burnKind)?o.burnKind:'disposal';
 if(o.deployment<1)return 'deployment';
 if(o.plannedBurnDirection&&o.plannedBurnLeadS>=0&&o.plannedBurnLeadS<=l.prepointS)return 'prepoint';
 if(g.flightPhase==='deorbit')return 'coast';
 if(g.station&&o.terminal)return 'contact';
 if(o.unloading)return 'desat';
 if(g.eclipse)return 'eclipse';
 return modes[d.attitude]?d.attitude:'tracking';
}
function reference(d,g,mode,o){
 if(['trim','reboost','disposal','prepoint','deployment','insertion'].includes(mode)){
  const sign=mode==='prepoint'?o.plannedBurnDirection:o.burnDirection;return thrustFrame(g,sign||1);
 }
 const x=neg(g.normal),y=neg(g.radial),z=g.along;
 let q=basisQuat(x,y,z);
 if(mode==='launch'){
  // An assumed upper-stage pitch-over connects the pad vertical to insertion.
  const u=clip(g.t/540,0,1),a=(3-2*u)*u*u*Math.PI/2;
  const bz=unit(g.radial.map((v,i)=>v*Math.cos(a)+g.along[i]*Math.sin(a)));
  return basisQuat(x,cross(bz,x),bz);
 }
 if(mode==='contact'||mode==='coast')return q;
 let roll=(d.rollDeg||0)*DEG;
 if(d.attitude==='inertial')q=IDENTITY;
 else if(d.attitude==='lowdrag'){
  const p=g.positionECI,v=g.velocityECI,ram=unit([v[0]+.00007292115*p[1],v[1]-.00007292115*p[0],v[2]]);
  const bz=unit(cross(ram,y));q=basisQuat(ram,cross(bz,ram),bz);
 }else if(d.attitude==='manual'){
  q=rotateLocal(q,Y,(d.yawDeg||0)*DEG);q=rotateLocal(q,X,(d.pitchDeg||0)*DEG);
 }else if(d.attitude!=='nadir'){
  // Bounded cant reduces the untrackable component along X without a yaw
  // singularity at orbital noon, beta zero, or a continuous-sun season.
  roll-=25*DEG*2*dot(x,g.sunECI)*dot(y,g.sunECI);
 }
 return roll?rotateLocal(q,Z,roll):q;
}
function followBody(target,old,dt,limits,hold){
 if(!old)return {q:target,rate:0,error:0,axis:X,momentum:0};
 const [x,y,z,w]=old.q,rel=multiply([-x,-y,-z,w],target);
 if(rel[3]<0)for(let i=0;i<4;i++)rel[i]=-rel[i];
 const sn=Math.hypot(rel[0],rel[1],rel[2]),angle=2*Math.atan2(sn,rel[3])/DEG;
 if(hold)return {q:old.q,rate:0,error:angle,axis:X,momentum:0};
 if(dt<=0)return {q:old.q,rate:old.rate||0,error:angle,axis:old.axis||X,momentum:old.momentum||0};
 if(sn<1e-12)return {q:target,rate:0,error:0,axis:X,momentum:0};
 const axis=[rel[0]/sn,rel[1]/sn,rel[2]/sn],I=Math.hypot(...axis.map((v,i)=>v*limits.inertiaKgM2[i]));
 const accel=limits.maneuverTorqueNm/(I*DEG),maximum=Math.min(.8,limits.maneuverMomentumNms/(I*DEG));
 // Accelerate in the geodesic rotation direction. Angular rate along the
 // new rotation axis includes only the projection of previous angular speed.
 const initial=clip((old.rate||0)*dot(old.axis||axis,axis),0,maximum);
 const ramp=Math.max(0,(maximum-initial)/accel),ta=Math.min(dt,ramp);
 const maxTravel=(initial+.5*accel*ta)*ta+maximum*(dt-ta);
 const travel=Math.min(angle,maxTravel);
 const q=travel>=angle?target:rotateLocal(old.q,axis,travel*DEG);
 return {q,rate:travel/dt,error:Math.max(0,angle-travel),axis,momentum:travel/dt*DEG*I};
}
function moveAngle(goal,old,dt,rate,cyclic=false){
 if(old==null)return [goal,0];
 const delta=cyclic?wrap(goal-old):goal-old,step=clip(delta,-dt*rate,dt*rate);
 return [old+step,dt?step/dt:0];
}
function radiatorTarget(sign,s,e,g,d,previous){
 const lo=sign<0?-65:30,hi=sign<0?-30:65;
 const age=g.windowAgeYears||0,alpha=clip(d.absorptivity+(d.alphaGrowth||0)*age,0,1),eps=d.emissivity*(d.emissivityRetention??1)**age;
 const sun=alpha*1361*(g.eclipse?0:1),earth=(eps*237+alpha*1361*.3*Math.max(0,g.sunRadial))*.78*(R/(R+g.altitudeKm))**2;
 function score(a){const c=Math.cos(a*DEG),v=Math.sin(a*DEG);return sun*Math.abs(c*s[1]+v*s[2])+earth*Math.abs(c*e[1]+v*e[2]);}
 // Positive sums of |sinusoids| are concave between zero crossings;
 // an absorbed-flux minimum lies at a travel stop or a grazing incidence.
 let best=lo,value=score(lo);
 for(const candidate of [hi,Math.atan2(-s[1],s[2])/DEG,Math.atan2(-e[1],e[2])/DEG]){
  const p=lo+((candidate-lo)%180+180)%180;if(p>hi+1e-8)continue;
  const v=score(p);if(v<value){best=p;value=v;}
 }
 // 1 W/m² deadband avoids needless hunting under nearly flat illumination.
 if(previous>=lo&&previous<=hi&&score(previous)<=value+1)return previous;
 return best;
}
function coneTarget(dir){
 const angle=safeAcos(dir[1]),stop=motionCaps.terminalConeDeg*DEG;
 if(angle<=stop)return dir;
 const n=Math.hypot(dir[0],dir[2]);return [n>1e-10?dir[0]/n*Math.sin(stop):Math.sin(stop),Math.cos(stop),n>1e-10?dir[2]/n*Math.sin(stop):0];
}
function moveVector(old,to,dt,rate){
 if(!old)return [to,0];const a=safeAcos(dot(old,to)),max=rate*DEG*dt;
 if(a<1e-7)return [to,0];
 if(max>=a)return [to,a/DEG/dt];
 if(max===0)return [old,0];
 const b=Math.sin(max)/Math.sin(a),c=Math.sin(a-max)/Math.sin(a);
 return [unit(old.map((v,i)=>v*c+to[i]*b)),rate];
}
const deployed=deploymentSchedule(1),stowed=deploymentSchedule(0);
export function attitudeGuidance(h,g,options={}){
 const o=options,d=h.input,l=attitudeLimits(h),u=o.deployment??1,m=u>=1?deployed:u<=0?stowed:deploymentSchedule(u);
 const mode=selectMode(d,g,o,l),hold=mode==='passive',old=o.previous,dt=Math.max(0,o.elapsedS??(old?g.t-old.t:0));
 const goal=hold&&old?old.q:reference(d,g,mode,o);
 const body=followBody(goal,mode==='launch'?null:old,dt,l,hold),[x,y,z]=axes(body.q);
 const toBody=v=>[dot(x,v),dot(y,v),dot(z,v)],sun=toBody(g.sunECI),earth=toBody(g.radial);
 const wingGoal=Math.hypot(sun[1],sun[2])>1e-8?wrap(Math.atan2(sun[2],sun[1])/DEG+(d.solarTiltDeg||0)):(old?.wing??0);
 const commissioningWing=wrap(wingGoal)*m.tracking;
 const [wing,wingRate]=moveAngle(hold?old?.wing??0:u<1?commissioningWing:wingGoal,old?.wing,dt,l.wingRateDegS,true);
 const angleFor=(sign,fraction,prev)=>{
  // Root and elbow follow the latched deployment trajectory until verification.
  // The operational rotary head then uses a separate, bounded travel envelope.
  if(u<1)return [sign*45*fraction,old&&dt?(sign*45*fraction-prev)/dt:0];
  const alignThrust=['trim','reboost','disposal','prepoint'].includes(mode);
  const target=alignThrust?sign*45:radiatorTarget(sign,sun,earth,g,d,prev);
  return moveAngle(hold?prev??sign*45:target,prev,dt,l.radiatorRateDegS);
 };
 const [upper,upperRate]=angleFor(-1,m.upperRoot,old?.upper),[lower,lowerRate]=angleFor(1,m.lowerRoot,old?.lower);
 const sight=g.stationECI&&g.station?toBody(unit(g.stationECI.map((v,i)=>v-g.positionECI[i]))):null;
 const terminal=mode==='contact'?o.terminal:null,aim=terminal&&sight?coneTarget(sight):Y;
 // A receiver near zenith follows a curved path even between adjacent replay
 // checkpoints. Re-evaluate its line of sight in the reconstructed body frame.
 const anchor=o.terminalPrevious??old,terminalDt=o.terminalElapsedS??dt;
 const [dish,dishRate]=moveVector(anchor?.dish,hold?old?.dish??Y:terminal==='Ka'?aim:Y,terminalDt,l.dishRateDegS);
 const [optic,opticRate]=moveVector(anchor?.optic,hold?old?.optic??Y:terminal==='Optical'?aim:Y,terminalDt,l.opticalRateDegS);
 const directional=terminal==='Ka'||terminal==='Optical',encoder=terminal==='Ka'?dish:optic;
 const residual=directional&&sight?safeAcos(dot(encoder,sight))/DEG:null;
 const reachable=!!sight&&terminal!=null&&(!directional||sight[1]>=Math.cos(l.terminalConeDeg*DEG)-1e-12);
 const acq=terminal==='Optical'?35:terminal==='Ka'?20:5;
 const beamHalfDeg=terminal==='Optical'?1.22*1.55e-6/(d.opticalApertureM||.1)/DEG:35*299792458/(26e9*(d.kaDishM||.6));
 const state=hold?'passivated':u<1?'stowed':!terminal?'parked':!directional?'fixed patch':!reachable?'travel limit':residual>beamHalfDeg||(o.contactAge??0)<acq?'acquiring':'tracking';
 const rates=dt===0&&old?.rates&&!hold?old.rates:[wingRate,upperRate,lowerRate,Math.max(dishRate,opticRate)];
 const attitudeState={t:g.t,q:body.q,rate:body.rate,axis:body.axis,momentum:body.momentum,wing,upper,lower,dish,optic,rates};
 return {attitudeState,attitudeMode:mode,attitudeModeLabel:modes[mode][0],attitudeObjective:modes[mode][1],
  bodyXECI:x,bodyUpECI:y,bodyZECI:z,attitudeSlewErrorDeg:body.error,bodyRateDegS:body.rate,bodySlewMomentumNms:body.momentum,
  wingPitchDeg:wrap(wing),wingTargetDeg:wingGoal,wingRateDegS:rates[0],upperRadiatorPitchDeg:upper,lowerRadiatorPitchDeg:lower,upperRadiatorRateDegS:rates[1],lowerRadiatorRateDegS:rates[2],
  pvNormalECI:normalFor(wing,y,z),upperRadiatorNormalECI:normalFor(upper,y,z),lowerRadiatorNormalECI:normalFor(lower,y,z),
  terminalState:state,terminalErrorDeg:residual,terminalReachable:reachable,terminalAngularRateDegS:rates[3],
  dishBoresightBody:dish,opticalBoresightBody:optic,terminalBoresightECI:directional?fromBody(encoder,x,y,z):null,stationDirectionBody:sight};
}

// Replay of two accepted integration checkpoints. Preserve their observed
// angular rates through random access, including the limit as a seek tends to an endpoint.
export function interpolateAttitudeState(a,b,fraction){
 if(!a||!b)return a||b;
 const f=clip(fraction,0,1);
 if(f===0)return a;if(f===1)return b;
 const mix=(v,w)=>v+(w-v)*f;
 let cosine=a.q.reduce((s,n,i)=>s+n*b.q[i],0),q1=b.q;
 if(cosine<0){cosine=-cosine;q1=q1.map(n=>-n);}
 let q;
 if(cosine>1-1e-9)q=unit(a.q.map((v,i)=>mix(v,q1[i])));
 else{
  const theta=safeAcos(cosine),sin=Math.sin(theta),left=Math.sin((1-f)*theta)/sin,right=Math.sin(f*theta)/sin;
  q=a.q.map((v,i)=>left*v+right*q1[i]);
 }
 const angular=a.axis.map((v,i)=>mix(v*a.rate,b.axis[i]*b.rate)),rate=Math.hypot(...angular);
 const dir=(v,w)=>moveVector(v,w,f,safeAcos(dot(v,w))/DEG)[0];
 return {t:mix(a.t,b.t),q,rate,axis:rate>1e-12?angular.map(v=>v/rate):a.axis,momentum:mix(a.momentum,b.momentum),
  wing:a.wing+f*wrap(b.wing-a.wing),upper:mix(a.upper,b.upper),lower:mix(a.lower,b.lower),
  dish:dir(a.dish,b.dish),optic:dir(a.optic,b.optic),rates:a.rates.map((v,i)=>mix(v,b.rates[i]))};
}
