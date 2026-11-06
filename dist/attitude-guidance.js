import {payloadFreeMET,INSERTION_MET} from './launch-effects-state.js';
// Quaternions [x,y,z,w] actively rotate body vectors into Earth-centred inertial axes.
// Controlled rigid-body dynamics. Body momentum, gimbals and mechanism encoders
// advance from the same inventory checkpoint for chronological and replay views.
import {R as earthRadiusKm,DEG,clip,cross,dot,unit} from './orbit.js';
import {componentInertia} from './attitude-inertia.js';
import {stepAttitude,transformEciToBody} from './attitude-dynamics.js';
import {mechanismMomentum} from './mechanism-momentum.js';
import {deploymentSchedule,deploymentLayout,bankNormal,terminalLayout,terminalStations} from './deployment.js';

export const guidanceReferences=[
 ['ISS solar tracking rotary joints','https://www.nasa.gov/wp-content/uploads/2022/06/508318main_iss_ref_guide_nov2010.pdf'],
 ['NASA thermal radiator pointing','https://ntrs.nasa.gov/citations/20000032541'],
 ['ISS thermal rotary fluid interface','https://www.nasa.gov/wp-content/uploads/2021/02/473486main_iss_atcs_overview.pdf'],
 ['NASA guidance, navigation and control','https://www.nasa.gov/smallsat-institute/sst-soa/guidance-navigation-and-control/'],
 ['NASA NESC mass properties and rotational dynamics','https://ntrs.nasa.gov/citations/20220013375'],
 ['Draper CMG dynamics and steering geometry','https://paradiso.media.mit.edu/papers/CMG-Search-Manifesto.pdf'],
 ['NASA singularity-robust steering','https://ntrs.nasa.gov/citations/19870019449']
];
const X=[1,0,0],Y=[0,1,0],Z=[0,0,1],neg=a=>[-a[0],-a[1],-a[2]];
const IDENTITY=[0,0,0,1],safeAcos=x=>Math.acos(clip(x,-1,1)),wrap=a=>a-360*Math.floor((a+180)/360);
const rad2deg=1/DEG;
const motionCaps={wingRateDegS:2,radiatorRateDegS:.4,radiatorTrimRateDegS:.75,radiatorTrimStopDeg:105,dishRateDegS:4,opticalRateDegS:3,terminalConeDeg:75,pointingToleranceDeg:.75};
const limitCache=new WeakMap();
export function attitudeLimits(h){
 if(limitCache.has(h))return limitCache.get(h);
 const d=h.input,w=h.bodyWidthM,b=h.bodyHeightM,l=h.bodyLengthM;
 const properties=componentInertia(h),inertia=properties.diagonalKgM2;
 const maxI=Math.max(1,...properties.principalKgM2),H=.8*d.cmgMomentumNms,T=.8*d.cmgTorqueNm;
 const bodyRateDegS=Math.min(.8,H/maxI/DEG),bodyAccelDegS2=T/maxI/DEG;
 const k=deploymentLayout(h),ry=k.rootY,rz=k.radRoot;
 // Keep each swept panel entirely within its own side of the bank pair. Include
 // the hinge offset, sheet edge and clearance for fittings. Wider banks need more cant.
 const bankHalfWidthM=h.radiatorWidthM/2+.18,bankClearanceY=Math.max(.02,ry-b/2-.135-.25*Math.min(.40,.052*Math.min(w,b)));
 const bankCantDeg=clip(safeAcos(bankClearanceY/bankHalfWidthM)/DEG+1,45,89.96);
 // The upper bank shares the +Y deck with two moving terminals. Bound each
 // swept head by a sphere, then test it against the bank's full rotary cylinder.
 const fixture=terminalLayout(w,b,d.kaDishM,d.opticalApertureM);
 const mounts=terminalStations(w,l,d),targets=[[mounts.ka[0],fixture.kaHeight+b/2-ry,mounts.ka[1]-rz,.61*d.kaDishM+.065],
  [mounts.optical[0],fixture.opticalHeight+b/2-ry,mounts.optical[1]-rz,1.05*d.opticalApertureM+.065]];
 function clearsTerminals(cant){
  const c=Math.cos(cant*DEG),s=Math.sin(cant*DEG);
  return targets.every(([x,y,z,r])=>y*s+z*c+r<0||Math.hypot(x,y*c-z*s)>bankHalfWidthM+r);
 }
 let upperBankCantDeg=bankCantDeg;
 while(upperBankCantDeg>45&&!clearsTerminals(upperBankCantDeg))upperBankCantDeg=Math.max(45,upperBankCantDeg-.25);
 const upperTrimEnabled=clearsTerminals(upperBankCantDeg);
 const limits={...motionCaps,bankHalfWidthM,bankClearanceY,bankCantDeg,upperBankCantDeg,upperTrimEnabled,inertiaKgM2:inertia,inertiaTensorKgM2:properties.tensorKgM2,principalInertiaKgM2:properties.principalKgM2,maneuverMomentumNms:H,maneuverTorqueNm:T,bodyRateDegS,bodyAccelDegS2,prepointS:Math.ceil(180/bodyRateDegS+2*bodyRateDegS/bodyAccelDegS2+90)};
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
// First matching guard wins. The flight console presents this same ordered table.
export const modeRules=[
 {id:'passive',label:'Retire actuators',guard:'Passivation commanded or entry interface reached.',test:(d,g,o)=>o.passivated||g.flightPhase==='entry'},
 {id:'launch',label:'Carrier control',guard:'The payload is still attached to its carrier.',test:(d,g)=>g.carrierAttached??g.t<payloadFreeMET(d.launcher)},
 {id:'insertion',label:'Separation hold',guard:'The adapter has released. Keep the appendages stowed until commissioning.',test:(d,g)=>g.t<900},
 {id:'burn',label:'Active maneuver',guard:'A signed chemical burn is in progress.',test:(d,g,o)=>o.burnDirection,mode:(d,o)=>['trim','reboost'].includes(o.burnKind)?o.burnKind:'disposal'},
 {id:'deployment',label:'Commissioning hold',guard:'The deployment sequence is incomplete.',test:(d,g,o)=>o.deployment<1},
 {id:'prepoint',label:'Prepare for ignition',guard:'A maneuver falls inside the calculated lead time for this vehicle.',test:(d,g,o,l)=>o.plannedBurnDirection&&o.plannedBurnLeadS>=0&&o.plannedBurnLeadS<=(o.plannedBurnWindowS??l.prepointS)},
 {id:'coast',label:'Disposal coast',guard:'The vehicle is on its retirement trajectory between burns.',test:(d,g)=>g.flightPhase==='deorbit'},
 {id:'contact',label:'Point to the station',guard:'A visible ground station and a selected terminal are available.',test:(d,g,o)=>g.station&&o.terminal},
 {id:'desat',label:'Unload momentum',guard:'The magnetic unloading scheduler has released the actuator.',test:(d,g,o)=>o.unloading},
 {id:'eclipse',label:'Shadow hold',guard:'Earth blocks direct sunlight.',test:(d,g)=>g.eclipse},
 {id:'nominal',label:'Nominal body policy',guard:'The configured reference governs routine flight.',test:()=>true,mode:d=>modes[d.attitude]?d.attitude:'tracking'}
];
function reference(d,g,mode,o){
 if(['trim','reboost','disposal','prepoint','deployment','insertion'].includes(mode)){
  const sign=mode==='prepoint'?o.plannedBurnDirection:o.burnDirection;return thrustFrame(mode==='prepoint'&&o.prepointGeometry?o.prepointGeometry:g,sign||1);
 }
 const x=neg(g.normal),y=neg(g.radial),z=g.along;
 let q=basisQuat(x,y,z);
 if(mode==='launch'){
  // An assumed upper-stage pitch-over connects the pad vertical to insertion.
  const u=clip(g.t/INSERTION_MET,0,1),a=(3-2*u)*u*u*Math.PI/2;
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
const inverse=q=>[-q[0],-q[1],-q[2],q[3]];
function referenceRate(previous,target,dt){
 if(!previous||dt<=0)return [0,0,0];
 const rel=multiply(inverse(previous),target);
 if(rel[3]<0)for(let i=0;i<4;i++)rel[i]=-rel[i];
 const sn=Math.hypot(...rel.slice(0,3));
 if(sn<1e-12)return [0,0,0];
 const rate=2*Math.atan2(sn,rel[3])/(dt*sn);
 return rel.slice(0,3).map(v=>v*rate);
}
function drivePose(state){
 if(!state)return null;
 return {
  wingPitchDeg:state.wing,upperRadiatorPitchDeg:state.upper,lowerRadiatorPitchDeg:state.lower,
  upperRadiatorRollDeg:state.upperRoll,lowerRadiatorRollDeg:state.lowerRoll,
  dishBoresightBody:state.dish,opticalBoresightBody:state.optic
 };
}
function followBody(h,g,target,old,dt,limits,hold,mode,options){
 const properties=options.inertiaProperties??componentInertia(h,{remainingKg:options.remainingKg??h.propellantKg,
  deployment:options.deployment??1,adapterAttached:!!g.carrierAttached,attitude:drivePose(old)});
 const referenceDot=old?.referenceQ?Math.abs(old.referenceQ.reduce((sum,v,i)=>sum+v*target[i],0)):0;
 const continuous=referenceDot>Math.cos(.5*DEG);
 const tracking=!!old&&(old.mode===mode||continuous),referenceVelocity=tracking?
  (dt>0?referenceRate(old.referenceQ,target,dt):old.referenceRate??[0,0,0]):[0,0,0];
 const initial=mode==='launch'||!old?{q:target,omegaBodyRadS:[0,0,0],cmgAnglesRad:[0,0,0,0]}:old.dynamics??{
  q:old.q,omegaBodyRadS:(old.axis||X).map(v=>v*(old.rate||0)*DEG),cmgAnglesRad:[0,0,0,0]
 };
 const result=stepAttitude({
  state:initial,targetQ:target,startTargetQ:tracking?old.referenceQ:target,
  inertiaKgM2:properties.tensorKgM2,rotorMomentumNms:h.cmg.rawUnitMomentumNms,
  rotorTorqueNm:h.cmg.rawUnitTorqueNm,torqueLimitNm:limits.maneuverTorqueNm,
  momentumLimitNms:limits.maneuverMomentumNms,
  externalTorqueEciNm:options.externalTorqueEciNm??[0,0,0],
  magneticTorqueEciNm:options.magneticTorqueEciNm??[0,0,0],
  mechanismMomentumBodyNms:options.mechanismMomentumBodyNms??old?.dynamics?.mechanismMomentumBodyNms??[0,0,0],
  referenceRateBodyRadS:referenceVelocity,
  dt:hold||mode==='launch'?0:dt,powered:!hold&&mode!=='launch'&&options.controlPowered!==false,
  bodyRateLimitRadS:.8*DEG
 });
 const state=result.state,omega=state.omegaBodyRadS,rate=Math.hypot(...omega);
 const diagnostic={
  bodyRateRadS:omega,gimbalAnglesRad:state.cmgAnglesRad,gimbalRatesRadS:result.cmgGimbalRatesRadS,
  requestedTorqueNm:result.commandTorqueBodyNm,appliedTorqueNm:result.achievedTorqueBodyNm,
  externalTorqueNm:transformEciToBody(state.q,options.externalTorqueEciNm??[0,0,0]),
  magneticTorqueNm:transformEciToBody(state.q,options.magneticTorqueEciNm??[0,0,0]),
  cmgMomentumBodyNms:result.cmgMomentumBodyNms,mechanismMomentumBodyNms:state.mechanismMomentumBodyNms,
  steeringCondition:result.steeringCondition,steeringAuthorityNm:result.steeringAuthority,
  torqueResidualNm:Math.hypot(...result.torqueResidualBodyNm),
  rateLimited:result.rateLimited,momentumLimited:result.momentumLimited,torqueLimited:result.torqueLimited,
  gimbalRateLimitRadS:result.gimbalRateLimitRadS,controlBandwidthRadS:result.controlBandwidthRadS,
  angularMomentumResidualNms:result.angularMomentumResidualNms,bodyAccelerationRadS2:result.bodyAccelerationRadS2,
  totalMomentumEciNms:state.totalMomentumEciNms,
  status:mode==='launch'?'Carrier controlled':hold?'Last controlled state':options.controlPowered===false?'Unpowered coast':
   result.momentumLimited?'Momentum limit':result.rateLimited?'Gimbal rate limit':result.torqueLimited?'Torque limit':
   result.steeringCondition<.18?'Limited steering direction':'Tracking'
 };
 return {q:state.q,rate:rate/DEG,axis:rate>1e-12?omega.map(v=>v/rate):X,
  error:result.trackingErrorDeg,momentum:Math.hypot(...multiplyTensor(properties.tensorKgM2,omega)),
  dynamics:state,diagnostics:diagnostic,properties,referenceRate:referenceVelocity};
}
function multiplyTensor(a,v){return [0,1,2].map(i=>a[i*3]*v[0]+a[i*3+1]*v[1]+a[i*3+2]*v[2]);}
function moveAngle(goal,old,dt,rate,cyclic=false){
 if(old==null)return [goal,0];
 const delta=cyclic?wrap(goal-old):goal-old,step=clip(delta,-dt*rate,dt*rate);
 return [old+step,dt?step/dt:0];
}
// A two-sided panel has two equivalent plane solutions 180 degrees apart.
// Choose the nearest attainable solution; if neither is in travel, compare the
// two stops by their *actual* projected flux. The bounded joint never wraps.
function trimGoal(dir,pitch,limit,previous,face){
 const yz=Math.cos(pitch*DEG)*dir[1]+Math.sin(pitch*DEG)*dir[2],x=dir[0];
 if(Math.hypot(x,yz)<1e-8)return clip(previous,-limit,limit);
 const base=wrap(Math.atan2(yz,x)/DEG+(face?90:0));
 let best,travel=Infinity;
 for(const goal of [base,base-180,base+180]){
  const distance=Math.abs(goal-previous);
  if(Math.abs(goal)<=limit&&distance<travel){best=goal;travel=distance;}
 }
 if(best!==undefined)return best;
 const plus=Math.abs(-x*Math.sin(limit*DEG)+yz*Math.cos(limit*DEG));
 const minus=Math.abs(x*Math.sin(limit*DEG)+yz*Math.cos(limit*DEG));
 if(Math.abs(plus-minus)<1e-9)return previous<0?-limit:limit;
 return (face?plus>minus:plus<minus)?limit:-limit;
}
export function bankTrimTravel(cant,l,upper=false){
 if(upper&&!l.upperTrimEnabled)return 0;
 const clearance=l.bankClearanceY/(l.bankHalfWidthM*Math.cos(cant*DEG));
 return clearance>=1?l.radiatorTrimStopDeg:Math.asin(clip(clearance,0,1))/DEG;
}
function bankDrive(sign,fraction,oldPitch,oldRoll,ctx){
 const {u,dt,hold,park,cold,g,sun,earth,l,sunriseSlew}=ctx;
 if(u<1){
  const pitch=sign*45*fraction;
  return {pitch,roll:0,pitchGoal:pitch,rollGoal:0,limit:0,pitchRate:dt&&oldPitch!=null?(pitch-oldPitch)/dt:0,rollRate:0};
 }
 const previous=oldRoll??0,coldCant=g.eclipse&&cold;
 // A warm radiator deploys steeply to give span trim its clearance from the wall.
 // In cold eclipse the root can cant back toward Earth after the roll clears the wall.
 const targetCant=park||coldCant?45:(sign<0?l.upperBankCantDeg:l.bankCantDeg);
 const allowedThere=park?0:bankTrimTravel(targetCant,l,sign<0);
 const unwind=Math.abs(previous)>allowedThere+.01;
 const pitchGoal=hold||unwind?(oldPitch??sign*45):sign*targetCant;
 const [pitch,pitchRate]=moveAngle(pitchGoal,oldPitch,dt,l.radiatorRateDegS);
 const limit=bankTrimTravel(pitch,l,sign<0);
 const rollGoal=hold?previous:park||unwind?0:trimGoal(g.eclipse&&!sunriseSlew?earth:sun,pitch,limit,previous,coldCant);
 const [roll,rollRate]=moveAngle(rollGoal,oldRoll,dt,l.radiatorTrimRateDegS);
 return {pitch,roll,pitchGoal,rollGoal,limit,pitchRate,rollRate};
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
 const rule=modeRules.find(r=>r.test(d,g,o,l)),mode=rule.mode?rule.mode(d,o):rule.id,hold=mode==='passive',old=o.previous,dt=Math.max(0,o.elapsedS??(old?g.t-old.t:0));
 const goal=hold&&old?old.q:reference(d,g,mode,o);
 const controlLimits=o.controlLimits?{...l,...o.controlLimits}:l;
 let body=followBody(h,g,goal,old,dt,controlLimits,hold,mode,o),[x,y,z]=axes(body.q);
 const toBody=v=>[dot(x,v),dot(y,v),dot(z,v)];
 let sun=toBody(g.sunECI),earth=toBody(g.radial);
 const wingGoal=Math.hypot(sun[1],sun[2])>1e-8?wrap(Math.atan2(sun[2],sun[1])/DEG+(d.solarTiltDeg||0)):(old?.wing??0);
 const commissioningWing=wrap(wingGoal)*m.tracking;
 const [wing,wingRate]=moveAngle(hold?old?.wing??0:u<1?commissioningWing:wingGoal,old?.wing,dt,l.wingRateDegS,true);
 const park=['trim','reboost','disposal','prepoint'].includes(mode);
 // Hysteresis uses the prior integrated loop temperature. The margins above
 // the editable operating minima are study assumptions, not ammonia flight setpoints.
 const coldThresholdK=Math.max(d.radiatorOpMinK??203,d.coolantOpMinK??233)+8;
 const loopTemperatureK=o.loopTemperatureK??d.initialCoreK??293;
 const cold=loopTemperatureK<=coldThresholdK||(old?.cold===true&&loopTemperatureK<coldThresholdK+5);
 // Wide fold-flat panels track from a steep deployed cant. A warm loop
 // can begin trimming for sunrise before the finite-rate joint is illuminated.
 // Extrapolate the short outgoing coast to the cylindrical umbra boundary.
 let sunriseSlew=false;
 if(g.eclipse&&!cold&&g.positionECI&&g.velocityECI){
  const r=g.positionECI,v=g.velocityECI,rs=dot(r,g.sunECI),vs=dot(v,g.sunECI),radialSlope=dot(r,v)-rs*vs;
  const lead=40,perp2=dot(r,r)-rs*rs+2*lead*radialSlope+lead*lead*(dot(v,v)-vs*vs);
  sunriseSlew=dot(r,r)-rs*rs<earthRadiusKm**2&&radialSlope>0&&perp2>=earthRadiusKm**2;
 }
 const ctx={u,dt,hold,park,cold,g,sun,earth,l,sunriseSlew};
 const up=bankDrive(-1,m.upperRoot,old?.upper,old?.upperRoll,ctx),lo=bankDrive(1,m.lowerRoot,old?.lower,old?.lowerRoll,ctx);
 const upper=up.pitch,lower=lo.pitch;
 const upperN=bankNormal(upper*DEG,up.roll*DEG),lowerN=bankNormal(lower*DEG,lo.roll*DEG);
 const radiatorControlLaw=hold?'Hold last encoder position':u<1?'Deployment interlock':park?'Park for thrust':!g.eclipse?'Turn emitting faces edge-on to sunlight':sunriseSlew?'Warm loop · prepoint for shadow exit':cold?'Cold loop · turn faces toward Earth':'Warm loop · minimize Earth infrared';
 let sight=g.stationECI&&g.station?toBody(unit(g.stationECI.map((v,i)=>v-g.positionECI[i]))):null;
 const terminal=mode==='contact'?o.terminal:null,aim=terminal&&sight?coneTarget(sight):Y;
 // A receiver near zenith follows a curved path even between adjacent replay
 // checkpoints. Re-evaluate its line of sight in the reconstructed body frame.
 const anchor=o.terminalPrevious??old,terminalDt=o.terminalElapsedS??dt;
 const [dish,dishRate]=moveVector(anchor?.dish,hold?old?.dish??Y:terminal==='Ka'?aim:Y,terminalDt,l.dishRateDegS);
 const [optic,opticRate]=moveVector(anchor?.optic,hold?old?.optic??Y:terminal==='Optical'?aim:Y,terminalDt,l.opticalRateDegS);
 const pose={deployment:u,wing,upper,lower,upperRoll:up.roll,lowerRoll:lo.roll,dish,optic};
 const properties=componentInertia(h,{remainingKg:o.remainingKg??h.propellantKg,deployment:u,
  adapterAttached:!!g.carrierAttached,attitude:drivePose(pose)});
 const relativeMomentum=hold?[0,0,0]:mechanismMomentum(h,old,pose,dt,properties);
 // Predictor-corrector coupling. The first body estimate supplies mechanism
 // targets. Reintegrate the same interval with their final inertia and relative
 // momentum so moving appendages react on the chassis during this interval.
 body=followBody(h,g,goal,old,dt,controlLimits,hold,mode,{...o,inertiaProperties:properties,mechanismMomentumBodyNms:relativeMomentum});
 [x,y,z]=axes(body.q);sun=toBody(g.sunECI);earth=toBody(g.radial);
 sight=g.stationECI&&g.station?toBody(unit(g.stationECI.map((v,i)=>v-g.positionECI[i]))):null;
 const directional=terminal==='Ka'||terminal==='Optical',encoder=terminal==='Ka'?dish:optic;
 const residual=directional&&sight?safeAcos(dot(encoder,sight))/DEG:null;
 const reachable=!!sight&&terminal!=null&&(!directional||sight[1]>=Math.cos(l.terminalConeDeg*DEG)-1e-12);
 const acq=terminal==='Optical'?35:terminal==='Ka'?20:5;
 const beamHalfDeg=terminal==='Optical'?1.22*1.55e-6/(d.opticalApertureM||.1)/DEG:35*299792458/(26e9*(d.kaDishM||.6));
 const state=hold?'passivated':u<1?'stowed':!terminal?'parked':!directional?'fixed patch':!reachable?'travel limit':residual>beamHalfDeg||(o.contactAge??0)<acq?'acquiring':'tracking';
 const rates=dt===0&&old?.rates&&!hold?old.rates:[wingRate,up.pitchRate,lo.pitchRate,Math.max(dishRate,opticRate),up.rollRate,lo.rollRate];
 const attitudeState={t:g.t,mode,...pose,referenceQ:goal,referenceRate:body.referenceRate,dynamics:body.dynamics,q:body.q,rate:body.rate,axis:body.axis,momentum:body.momentum,cold,rates};
 return {attitudeState,modeRuleId:rule.id,prepointLeadWindowS:o.plannedBurnWindowS??l.prepointS,attitudeMode:mode,attitudeModeLabel:modes[mode][0],attitudeObjective:modes[mode][1],
  attitudeDynamics:{...body.diagnostics,inertiaKgM2:body.properties.tensorKgM2,principalKgM2:body.properties.principalKgM2,cmM:body.properties.cm},
  bodyReferenceQ:goal,bodyAttitudeQ:body.q,bodyXECI:x,bodyUpECI:y,bodyZECI:z,attitudeSlewErrorDeg:body.error,bodyRateDegS:body.rate,bodySlewMomentumNms:body.momentum,
  wingPitchDeg:wrap(wing),wingTargetDeg:hold?wrap(wing):u<1?commissioningWing:wingGoal,wingRateDegS:rates[0],upperRadiatorPitchDeg:upper,lowerRadiatorPitchDeg:lower,upperRadiatorRateDegS:rates[1],lowerRadiatorRateDegS:rates[2],
  upperRadiatorRollDeg:up.roll,lowerRadiatorRollDeg:lo.roll,upperRadiatorRollRateDegS:rates[4]||0,lowerRadiatorRollRateDegS:rates[5]||0,
  upperRadiatorTrimLimitDeg:up.limit,lowerRadiatorTrimLimitDeg:lo.limit,
  upperRadiatorTargetDeg:up.pitchGoal,lowerRadiatorTargetDeg:lo.pitchGoal,upperRadiatorTargetRollDeg:up.rollGoal,lowerRadiatorTargetRollDeg:lo.rollGoal,
  radiatorControlLaw,radiatorControlTemperatureK:loopTemperatureK,radiatorColdThresholdK:coldThresholdK,radiatorColdProtection:cold&&g.eclipse&&!park&&!hold&&u===1,
  pvNormalECI:normalFor(wing,y,z),upperRadiatorNormalECI:fromBody(upperN,x,y,z),lowerRadiatorNormalECI:fromBody(lowerN,x,y,z),
  upperRadiatorSunCos:Math.abs(dot(upperN,sun)),lowerRadiatorSunCos:Math.abs(dot(lowerN,sun)),
  dishTargetBody:hold?dish:terminal==='Ka'?aim:Y,opticalTargetBody:hold?optic:terminal==='Optical'?aim:Y,
  terminalBeamHalfDeg:directional?beamHalfDeg:null,terminalConeMarginDeg:directional&&sight?l.terminalConeDeg-safeAcos(sight[1])/DEG:null,
  terminalState:state,terminalErrorDeg:residual,terminalReachable:reachable,terminalAngularRateDegS:rates[3],
  dishBoresightBody:dish,opticalBoresightBody:optic,terminalBoresightECI:directional?fromBody(encoder,x,y,z):null,stationDirectionBody:sight};
}
