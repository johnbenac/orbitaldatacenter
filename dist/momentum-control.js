// Disturbance momentum is stored in inertial axes. A rotating body frame must
// not rotate yesterday's impulse with today's spacecraft attitude.
import {R,MU,cross,dot} from './orbit.js';

export function localFieldUT(radial,altitudeKm){
 // The terrestrial magnetic moment points toward geographic south.
 const k=-31*(R/(R+altitudeKm))**3,mu=3*radial[2];
 return [k*mu*radial[0],k*mu*radial[1],k*(mu*radial[2]-1)];
}

// Command the component of -H reachable by magnetic torque. The dipole
// vector follows B × target / |B|², so the applied torque always equals m × B.
export function magneticControl(H,fieldUT,dipoleLimit,enable,dt){
 const field=fieldUT.map(v=>v*1e-6),B=Math.hypot(...field),h=Math.hypot(...H);
 const unitB=B?field.map(v=>v/B):[0,0,0],parallel=dot(H,unitB);
 const perpendicular=H.map((v,i)=>v-parallel*unitB[i]),perp=Math.hypot(...perpendicular);
 const authority=h?dipoleLimit*B*Math.min(1,perp/h):0;
 const command=enable&&perp>1e-12&&B>0?Math.min(1/Math.max(120,dt),dipoleLimit*B/perp):0;
 const torque=perpendicular.map(v=>-command*v);
 const dipole=B?cross(unitB,torque).map(v=>v/B):[0,0,0];
 return {authority,torque,dipole,removalRate:h?-dot(torque,H)/h:0,driveFraction:dipoleLimit>0?Math.min(1,Math.hypot(...dipole)/dipoleLimit):0};
}

export function availableControl(limits,d,storedMomentum,previousTorque){
 const steeringTorque=d.cmgTorqueNm/(1+(storedMomentum/d.cmgMomentumNms)**2);
 return {
  maneuverMomentumNms:Math.min(limits.maneuverMomentumNms,Math.max(0,d.cmgMomentumNms-storedMomentum)),
  maneuverTorqueNm:Math.min(limits.maneuverTorqueNm,Math.max(0,steeringTorque-previousTorque))
 };
}

// Tensor and radial direction are both expressed in the achieved body frame.
// MU and orbit radius share kilometre units, giving the required inverse s².
export function gravityGradientTorque(tensor,radialBody,altitudeKm){
 const ir=[0,1,2].map(i=>tensor[3*i]*radialBody[0]+tensor[3*i+1]*radialBody[1]+tensor[3*i+2]*radialBody[2]);
 return cross(radialBody,ir).map(v=>v*3*MU/(R+altitudeKm)**3);
}
