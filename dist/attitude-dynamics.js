// Body-to-inertial quaternions use [x,y,z,w]. Inertia tensors are row-major 3×3.
// Constant-speed, single-gimbal CMGs with negligible gimbal inertia.
// Euler's equation is integrated in inertial momentum form,
// L = R(q) [Iω + h_CMG + h_mechanism], dL/dt = τ_external.
// This retains gyroscopic coupling and conserves momentum as I changes.
export const attitudeDynamicsReferences = [
 ['CMG dynamics and pyramid geometry', 'https://paradiso.media.mit.edu/papers/CMG-Search-Manifesto.pdf'],
 ['Singularity-robust steering', 'https://ntrs.nasa.gov/citations/19870019449']
];

const ZERO = [0, 0, 0];
const IDENTITY = [0, 0, 0, 1];
const DEG = Math.PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const add = (a, b) => a.map((v, i) => v + b[i]);
const subtract = (a, b) => a.map((v, i) => v - b[i]);
const scale = (a, k) => a.map(v => v*k);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const magnitude = a => Math.hypot(...a);
const blend = (a, b, u) => a.map((v, i) => v + (b[i]-v)*u);

export function tensorVector(m, v) {
 return [dot(m.slice(0,3),v), dot(m.slice(3,6),v), dot(m.slice(6,9),v)];
}
function inverse(m) {
 const [a,b,c,d,e,f,g,h,i] = m;
 const A=e*i-f*h, B=f*g-d*i, C=d*h-e*g;
 const det=a*A+b*B+c*C;
 if (!(det>1e-24)) throw Error('Attitude inertia or steering matrix must be positive definite.');
 return [A,c*h-b*i,b*f-c*e,B,a*i-c*g,c*d-a*f,C,b*g-a*h,a*e-b*d].map(v=>v/det);
}
function symmetricEigenvalues(m) {
 const mean=(m[0]+m[4]+m[8])/3;
 const p=Math.sqrt(((m[0]-mean)**2+(m[4]-mean)**2+(m[8]-mean)**2+2*(m[1]**2+m[2]**2+m[5]**2))/6);
 if(p<1e-12) return [mean,mean,mean];
 const b=m.map((v,i)=>(v-(i%4===0?mean:0))/p);
 const det=b[0]*(b[4]*b[8]-b[5]*b[7])-b[1]*(b[3]*b[8]-b[5]*b[6])+b[2]*(b[3]*b[7]-b[4]*b[6]);
 const theta=Math.acos(clamp(det/2,-1,1))/3;
 const high=mean+2*p*Math.cos(theta), low=mean+2*p*Math.cos(theta+2*Math.PI/3);
 return [Math.max(0,low),3*mean-high-low,high];
}
function multiply(a,b) {
 const [x,y,z,w]=a,[i,j,k,l]=b;
 return [w*i+x*l+y*k-z*j,w*j-x*k+y*l+z*i,w*k+x*j-y*i+z*l,w*l-x*i-y*j-z*k];
}
function normalize(q) { return scale(q,1/magnitude(q)); }
function rotationVector(q,target) {
 const relative=multiply([-q[0],-q[1],-q[2],q[3]],target);
 const sign=relative[3]<0?-1:1, sine=magnitude(relative.slice(0,3));
 const factor=sine>1e-12?sign*2*Math.atan2(sine,Math.abs(relative[3]))/sine:2*sign;
 return relative.slice(0,3).map(v=>v*factor);
}
function rotateBy(q,rotation) {
 const angle=magnitude(rotation), k=angle>1e-12?Math.sin(angle/2)/angle:.5;
 return normalize(multiply(q,[rotation[0]*k,rotation[1]*k,rotation[2]*k,Math.cos(angle/2)]));
}
function interpolateQuaternion(a,b,u) { return rotateBy(a,scale(rotationVector(a,b),u)); }
export function transformBodyToEci(q,v) {
 const xyz=q.slice(0,3), t=scale(cross(xyz,v),2);
 return add(v,add(scale(t,q[3]),cross(xyz,t)));
}
export function transformEciToBody(q,v) { return transformBodyToEci([-q[0],-q[1],-q[2],q[3]],v); }

// Gimbal axes are normal to four 54.7356° pyramid faces. Index order matches
// the installed transverse stations −X−Y, −X+Y, +X−Y, +X+Y.
const skew=Math.atan(Math.SQRT2), sinSkew=Math.sin(skew), cosSkew=Math.cos(skew);
export const cmgPyramid = [5,3,7,1].map(n=>{
 const azimuth=n*Math.PI/4, c=Math.cos(azimuth), s=Math.sin(azimuth);
 return {gimbalAxis:[sinSkew*c,sinSkew*s,cosSkew],zeroRotorAxis:[-s,c,0]};
});
function clusterGeometry(angles) {
 const rotorAxes=[],columns=[],momentum=ZERO.slice(),gram=Array(9).fill(0);
 for(let i=0;i<4;i++) {
  const {gimbalAxis,zeroRotorAxis}=cmgPyramid[i];
  const derivative=cross(gimbalAxis,zeroRotorAxis),a=angles[i];
  const spin=add(scale(zeroRotorAxis,Math.cos(a)),scale(derivative,Math.sin(a)));
  const column=cross(gimbalAxis,spin);
  rotorAxes.push(spin);columns.push(column);
  for(let j=0;j<3;j++) {
   momentum[j]+=spin[j];
   for(let k=0;k<3;k++) gram[j*3+k]+=column[j]*column[k];
  }
 }
 const eigen=symmetricEigenvalues(gram);
 return {rotorAxes,columns,momentum,gram,condition:Math.sqrt(eigen[0]/Math.max(eigen[2],1e-12)),minimumSingularValue:Math.sqrt(eigen[0])};
}
export function clusterState(angles,rotorMomentumNms) {
 const geometry=clusterGeometry(angles);
 return {momentumBodyNms:scale(geometry.momentum,rotorMomentumNms),rotorAxes:geometry.rotorAxes,
  gimbalAxes:cmgPyramid.map(g=>g.gimbalAxis),jacobianColumns:geometry.columns.map(c=>scale(c,rotorMomentumNms)),
  condition:geometry.condition};
}
function rotorMomentum(angles,h) {
 const out=ZERO.slice();
 for(let i=0;i<4;i++) {
  const {gimbalAxis:g,zeroRotorAxis:s}=cmgPyramid[i],d=cross(g,s),c=Math.cos(angles[i]),sn=Math.sin(angles[i]);
  for(let j=0;j<3;j++) out[j]+=h*(s[j]*c+d[j]*sn);
 }
 return out;
}

function steer(angles,torque,options) {
 const {rotorMomentumNms:h,gimbalRateLimitRadS,torqueLimitNm,powered}=options, geometry=clusterGeometry(angles);
 if(!powered||h<=0||gimbalRateLimitRadS<=0||torqueLimitNm<=0) return {rates:[0,0,0,0],geometry,rateLimited:false,torqueLimited:powered&&magnitude(torque)>1e-9};
 // Normalized Jacobian avoids changing the damping law with cluster scale.
 const damping=1e-6+.15*Math.max(0,1-(geometry.condition/.18)**2)**2;
 const regularized=geometry.gram.map((v,i)=>v+(i%4===0?damping*damping:0));
 const inv=inverse(regularized),requested=magnitude(torque),torqueScale=Math.min(1,torqueLimitNm/Math.max(requested,1e-30));
 const multiplier=tensorVector(inv,scale(torque,-torqueScale/h));
 let rates=geometry.columns.map(c=>dot(c,multiplier));
 // A small projected log-determinant gradient improves conditioning locally.
 // Damped null projection can leak torque; the physical propagation retains it.
 if(geometry.condition<.25) {
  const gradient=geometry.rotorAxes.map((s,i)=>-2*dot(s,tensorVector(inv,geometry.columns[i])));
  const gradientEffect=ZERO.slice();
  for(let i=0;i<4;i++) for(let k=0;k<3;k++) gradientEffect[k]+=geometry.columns[i][k]*gradient[i];
  const projected=tensorVector(inv,gradientEffect);
  const nullRate=gradient.map((v,i)=>v-dot(geometry.columns[i],projected));
  const gain=.02/Math.max(1,magnitude(nullRate));
  rates=rates.map((v,i)=>v+gain*nullRate[i]);
 }
 const rateScale=Math.min(1,gimbalRateLimitRadS/Math.max(1e-30,...rates.map(Math.abs)));
 return {rates:rates.map(v=>v*rateScale),geometry,rateLimited:rateScale<1-1e-10,torqueLimited:torqueScale<1-1e-10};
}
function limitedRates(angles,rates,dt,options,geometry) {
 const h=options.rotorMomentumNms,oldH=scale(geometry.momentum,h),oldMagnitude=magnitude(oldH);
 let torqueLimited=false,momentumLimited=false;
 const startTorque=ZERO.slice();
 for(let i=0;i<4;i++) for(let k=0;k<3;k++) startTorque[k]+=h*geometry.columns[i][k]*rates[i];
 // |dτ/dt| ≤ h Σ δ̇ᵢ² bounds the entire constant-rate substep, including
 // the torque leaked by damped null motion. Solve a k² + b k ≤ τ_limit.
 const curvature=h*rates.reduce((sum,v)=>sum+v*v,0)*dt,initial=magnitude(startTorque);
 if(initial+curvature>options.torqueLimitNm) {
  const factor=curvature>1e-20?2*options.torqueLimitNm/(initial+Math.sqrt(initial*initial+4*curvature*options.torqueLimitNm)):
   options.torqueLimitNm/Math.max(initial,1e-30);
  rates=scale(rates,factor);torqueLimited=true;
 }
 const next=angles.map((v,i)=>v+rates[i]*dt),newH=rotorMomentum(next,h);
 const limit=options.momentumLimitNms;
 if(magnitude(newH)>Math.max(oldMagnitude,limit)+1e-9) {
  momentumLimited=true;
  let low=0,high=1;
  for(let iteration=0;iteration<18;iteration++) {
   const middle=(low+high)/2,trial=angles.map((v,i)=>v+rates[i]*dt*middle);
   if(magnitude(rotorMomentum(trial,h))<=Math.max(oldMagnitude,limit)+1e-10) low=middle;
   else high=middle;
  }
  rates=scale(rates,low);
 }
 return {rates,torqueLimited,momentumLimited};
}
function control(q,omega,angles,inertia,inertiaRate,mechanism,mechanismRate,target,external,options) {
 const h=rotorMomentum(angles,options.rotorMomentumNms),error=rotationVector(q,target);
 const referenceRate=transformEciToBody(q,transformBodyToEci(target,options.referenceRateBodyRadS));
 let desiredRate=add(referenceRate,scale(error,options.controlBandwidthRadS/2));
 const speedScale=Math.min(1,options.bodyRateLimitRadS/Math.max(magnitude(desiredRate),1e-30));
 desiredRate=scale(desiredRate,speedScale);
 // Reserve 20% of the configured operational momentum for disturbances.
 const motionH=magnitude(tensorVector(inertia,desiredRate));
 desiredRate=scale(desiredRate,Math.min(1,.8*options.momentumLimitNms/Math.max(motionH,1e-30)));
 const alpha=scale(subtract(desiredRate,omega),2*options.controlBandwidthRadS);
 const angularMomentum=add(tensorVector(inertia,omega),add(h,mechanism));
 const torque=subtract(add(tensorVector(inertia,alpha),add(cross(omega,angularMomentum),add(tensorVector(inertiaRate,omega),mechanismRate))),external);
 return {torque,error,alpha,...steer(angles,torque,options)};
}

/** Propagate one continuous flight interval. All torque inputs are in N·m.
 * referenceRateBodyRadS uses the desired body's axes. Target interpolation
 * follows startTargetQ → targetQ; state.referenceQ supplies the previous target.
 * At dt=0 the pose and rotor encoders are retained. Angular velocity is
 * remapped from conserved momentum if the supplied mass configuration changes.
 * The 0.06 rad/s bandwidth, critical damping, 20% momentum reserve and local
 * null-motion gains are study choices. Sensor estimates are ideal.
 */
export function stepAttitude({state={},targetQ=state.q??IDENTITY,startTargetQ,
 inertiaKgM2,rotorMomentumNms,rotorTorqueNm,torqueLimitNm,momentumLimitNms,
 externalTorqueBodyNm=ZERO,magneticTorqueBodyNm=ZERO,externalTorqueEciNm=ZERO,magneticTorqueEciNm=ZERO,
 referenceRateBodyRadS=ZERO,mechanismMomentumBodyNms=ZERO,dt=0,powered=true,
 bodyRateLimitRadS=.8*DEG,controlBandwidthRadS=.06,maxStepS=8}) {
 const options={rotorMomentumNms:Math.max(0,rotorMomentumNms),torqueLimitNm:Math.max(0,torqueLimitNm),momentumLimitNms:Math.max(0,momentumLimitNms),
  gimbalRateLimitRadS:rotorMomentumNms>0?Math.max(0,rotorTorqueNm)/rotorMomentumNms:0,powered,referenceRateBodyRadS,bodyRateLimitRadS,controlBandwidthRadS};
 const duration=Math.max(0,dt),startTensor=state.inertiaKgM2??inertiaKgM2,startMechanism=state.mechanismMomentumBodyNms??mechanismMomentumBodyNms;
 const inertiaRate=duration?scale(subtract(inertiaKgM2,startTensor),1/duration):state.inertiaRateKgM2PerS??Array(9).fill(0);
 const mechanismRate=duration?scale(subtract(mechanismMomentumBodyNms,startMechanism),1/duration):state.mechanismMomentumRateBodyNm??ZERO;
 let q=normalize(state.q??targetQ),angles=(state.cmgAnglesRad??[0,0,0,0]).slice();
 let omega=(state.omegaBodyRadS??ZERO).slice();
 const initialH=state.totalMomentumEciNms??transformBodyToEci(q,add(tensorVector(startTensor,omega),add(rotorMomentum(angles,rotorMomentumNms),startMechanism)));
 let totalH=initialH.slice(),rates=(state.gimbalRatesRadS??[0,0,0,0]).slice();
 let torqueLimited=duration===0&&!!state.torqueLimited,rateLimited=duration===0&&!!state.rateLimited,momentumLimited=duration===0&&!!state.momentumLimited;
 const externalBody=add(externalTorqueBodyNm,magneticTorqueBodyNm),externalEci=add(externalTorqueEciNm,magneticTorqueEciNm);
 const externalAt=q=>add(externalBody,transformEciToBody(q,externalEci));
 const momentumImpulse=ZERO.slice(),oldOmega=omega.slice(),referenceStart=normalize(startTargetQ??state.referenceQ??targetQ);
 let lastControl;
 const initialError=magnitude(rotationVector(q,referenceStart)),bodyRate=magnitude(omega),gimbalRate=Math.max(...rates.map(Math.abs));
 const activeSlew=initialError>3*DEG||bodyRate>.02||gimbalRate>.03;
 const settled=powered&&!state.momentumLimited&&!state.rateLimited&&!state.torqueLimited&&initialError<.1*DEG&&bodyRate<.005&&gimbalRate<.001&&magnitude(referenceRateBodyRadS)<.005;
 const stepLimit=Math.max(.05,Math.min(activeSlew?1:settled?8:4,maxStepS));
 const steps=Math.max(1,Math.ceil(duration/stepLimit)),step=duration/steps;
 for(let index=0;index<steps&&duration>0;index++) {
  const u=index/steps,mid=(index+.5)/steps,end=(index+1)/steps;
  const tensor=blend(startTensor,inertiaKgM2,u),midTensor=blend(startTensor,inertiaKgM2,mid),endTensor=blend(startTensor,inertiaKgM2,end);
  const mechanism=blend(startMechanism,mechanismMomentumBodyNms,u),midMechanism=blend(startMechanism,mechanismMomentumBodyNms,mid),endMechanism=blend(startMechanism,mechanismMomentumBodyNms,end);
  const omegaFrom=(attitude,total,rotors,matrix,relative)=>tensorVector(inverse(matrix),subtract(subtract(transformEciToBody(attitude,total),rotorMomentum(rotors,rotorMomentumNms)),relative));
  omega=omegaFrom(q,totalH,angles,tensor,mechanism);
  const initial=control(q,omega,angles,tensor,inertiaRate,mechanism,mechanismRate,interpolateQuaternion(referenceStart,targetQ,u),externalAt(q),options);
  const halfAngles=angles.map((v,i)=>v+initial.rates[i]*step/2),halfQ=rotateBy(q,scale(omega,step/2));
  const externalMidEci=add(transformBodyToEci(halfQ,externalBody),externalEci);
  const halfTotal=add(totalH,scale(externalMidEci,step/2));
  const halfOmega=omegaFrom(halfQ,halfTotal,halfAngles,midTensor,midMechanism);
  lastControl=control(halfQ,halfOmega,halfAngles,midTensor,inertiaRate,midMechanism,mechanismRate,interpolateQuaternion(referenceStart,targetQ,mid),externalAt(halfQ),options);
  const bounded=limitedRates(angles,lastControl.rates,step,options,initial.geometry);rates=bounded.rates;
  // Recompute the midpoint rate after operational limits affect the rotors.
  const acceptedHalfAngles=angles.map((v,i)=>v+rates[i]*step/2);
  const acceptedOmega=omegaFrom(halfQ,halfTotal,acceptedHalfAngles,midTensor,midMechanism);
  q=rotateBy(q,scale(acceptedOmega,step));
  angles=angles.map((v,i)=>v+rates[i]*step);
  for(let axis=0;axis<3;axis++) {totalH[axis]+=externalMidEci[axis]*step;momentumImpulse[axis]+=externalMidEci[axis]*step;}
  omega=omegaFrom(q,totalH,angles,endTensor,endMechanism);
  torqueLimited ||= lastControl.torqueLimited||bounded.torqueLimited;
  rateLimited ||= lastControl.rateLimited;
  momentumLimited ||= bounded.momentumLimited;
 }
 if(duration===0) omega=tensorVector(inverse(inertiaKgM2),subtract(subtract(transformEciToBody(q,totalH),rotorMomentum(angles,rotorMomentumNms)),mechanismMomentumBodyNms));
 if(!powered) rates=[0,0,0,0];
 const finalControl=control(q,omega,angles,inertiaKgM2,inertiaRate,mechanismMomentumBodyNms,mechanismRate,targetQ,externalAt(q),options);
 const cluster=clusterState(angles,rotorMomentumNms),achieved=ZERO.slice();
 for(let i=0;i<4;i++) for(let k=0;k<3;k++) achieved[k]-=cluster.jacobianColumns[i][k]*rates[i];
 const observed=transformBodyToEci(q,add(tensorVector(inertiaKgM2,omega),add(cluster.momentumBodyNms,mechanismMomentumBodyNms)));
 const expected=add(initialH,momentumImpulse);
 rateLimited ||= finalControl.rateLimited;
 torqueLimited ||= finalControl.torqueLimited;
 const command=powered?finalControl.torque:ZERO.slice();
 return {state:{q,omegaBodyRadS:omega,cmgAnglesRad:angles,gimbalRatesRadS:rates,totalMomentumEciNms:totalH,inertiaKgM2:inertiaKgM2.slice(),
   mechanismMomentumBodyNms:mechanismMomentumBodyNms.slice(),inertiaRateKgM2PerS:inertiaRate.slice(),mechanismMomentumRateBodyNm:mechanismRate.slice(),
   referenceQ:targetQ.slice(),rateLimited,torqueLimited,momentumLimited},
  cmgMomentumBodyNms:cluster.momentumBodyNms,cmgGimbalRatesRadS:rates,cmgRotorAxes:cluster.rotorAxes,
  commandTorqueBodyNm:command,achievedTorqueBodyNm:achieved,torqueResidualBodyNm:subtract(command,achieved),
  steeringCondition:cluster.condition,steeringAuthority:powered?Math.min(options.torqueLimitNm,finalControl.geometry.minimumSingularValue*rotorMomentumNms*options.gimbalRateLimitRadS):0,
  rateLimited,torqueLimited,momentumLimited,trackingErrorDeg:magnitude(finalControl.error)/DEG,
  bodyAccelerationRadS2:duration?scale(subtract(omega,oldOmega),1/duration):ZERO.slice(),
  angularMomentumResidualNms:magnitude(subtract(observed,expected)),controlBandwidthRadS,gimbalRateLimitRadS:options.gimbalRateLimitRadS,
  externalTorqueBodyNm:externalAt(q)};
}
