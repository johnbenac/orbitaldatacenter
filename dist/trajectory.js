import {R,MU,DEG,TAU,dot,cross,unit,clip} from './orbit.js';

const G0=9.80665,spin=7.292115e-5;
export const ENTRY_KM=120;
const speedAt=(r,a)=>Math.sqrt(MU*(2/r-1/a));
export function disposalRequirement(d){
 const a=R+d.altitudeKm,ra=a*(1+d.ecc),rp=R+(d.disposalTargetPerigeeKm??80);
 return Math.max(0,1000*(speedAt(ra,a)-speedAt(ra,(ra+rp)/2)));
}
export function disposalIgnition(d,duration){
 const period=TAU*Math.sqrt((R+d.altitudeKm)**3/MU),firstApogee=540+(Math.PI-d.meanAnomalyDeg*DEG)/TAU*period;
 // Select the last nominal apogee allowing a full transfer half-period and burn margin.
 const latest=duration-period,cycle=Math.floor((latest-firstApogee)/period);
 return Math.max(1200,firstApogee+cycle*period);
}
function elements(p,v){
 const r=Math.hypot(...p),h=cross(p,v),eVec=cross(v,h).map((q,i)=>q/MU-p[i]/r);
 const e=Math.hypot(...eVec),a=1/(2/r-dot(v,v)/MU);
 return {perigeeKm:a*(1-e)-R,apogeeKm:a*(1+e)-R};
}
function advanceVector(z,dt,thrust,massFlow){
 function slope(s){const r=Math.hypot(s[0],s[1],s[2]),v=Math.hypot(s[3],s[4],s[5]),a=-MU/r**3,b=-thrust/(1000*s[6]*v);
  return [s[3],s[4],s[5],a*s[0]+b*s[3],a*s[1]+b*s[4],a*s[2]+b*s[5],-massFlow];}
 const shift=(s,k,h)=>s.map((v,i)=>v+h*k[i]),k1=slope(z),k2=slope(shift(z,k1,dt/2)),k3=slope(shift(z,k2,dt/2)),k4=slope(shift(z,k3,dt));
 return z.map((v,i)=>v+dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);
}
// Finite retrograde thrust is propagated with central gravity. Guidance cuts off
// at the specified osculating perigee. An unsuccessful trial is held at the
// pre-ignition state instead of consuming fuel in a known failed maneuver.
export function planDisposal(g,d,wet,available,end){
 const start=g.t,goal=d.disposalTargetPerigeeKm??80,flow=d.thrustN/(G0*d.isp),minMass=wet-Math.max(0,available);
 const z0=[...g.positionECI,...g.velocityECI,wet],samples=[{t:start,z:z0}],p0=elements(g.positionECI,g.velocityECI),requiredDv=Math.max(0,1000*(Math.hypot(...g.velocityECI)-speedAt(Math.hypot(...g.positionECI),(Math.hypot(...g.positionECI)+R+goal)/2)));
 let t=start,z=z0,cutoff=null,entry=null;
 const failed=why=>({start,cutoff:null,entry:null,end:start,feasible:false,reason:why,requiredDv,paidDv:0,usedKg:0,goal,perigeeKm:p0.perigeeKm,initialWet:wet,samples:[]});
 if(g.orbitLost||g.altitudeKm<=ENTRY_KM)return failed('Vehicle already at the modeled atmospheric interface');
 if(available<=0)return failed('No usable disposal propellant');
 const metric=(z,thrust)=>thrust?elements(z.slice(0,3),z.slice(3,6)).perigeeKm-goal:Math.hypot(z[0],z[1],z[2])-R-ENTRY_KM;
 while(t<end-1e-7){const powered=cutoff===null,thrust=powered?d.thrustN:0,mdot=powered?flow:0;
  let step=Math.min(powered?3:8,end-t,powered?(z[6]-minMass)/flow:Infinity);
  if(step<1e-6)return failed('Available propellant cannot reach the target perigee');
  const next=advanceVector(z,step,thrust,mdot);
  if(metric(next,powered)<=0){let lo=0,hi=step;for(let i=0;i<22;i++){const m=(lo+hi)/2;if(metric(advanceVector(z,m,thrust,mdot),powered)>0)lo=m;else hi=m;}
   step=hi;z=advanceVector(z,step,thrust,mdot);t+=step;samples.push({t,z});if(powered){cutoff=t;continue;}entry=t;break;
  }
  z=next;t+=step;samples.push({t,z});
  if(powered&&Math.hypot(z[0],z[1],z[2])-R<ENTRY_KM)return failed('Interface reached before guided engine cutoff');
 }
 if(!entry)return failed(cutoff===null?'Finite burn cannot reach the target before the horizon':'No descending interface crossing before the horizon');
 return {start,cutoff,entry,end:entry,feasible:true,reason:'Descending 120 km atmospheric interface',requiredDv,paidDv:G0*d.isp*Math.log(wet/z[6]),usedKg:wet-z[6],goal,perigeeKm:goal,initialWet:wet,samples};
}
export function trajectoryAt(plan,t){
 const rows=plan.samples;let i=0,j=rows.length-1;while(i<j){const m=Math.ceil((i+j)/2);if(rows[m].t<=t)i=m;else j=m-1;}
 const a=rows[i],b=rows[Math.min(i+1,rows.length-1)],k=a===b?0:clip((t-a.t)/(b.t-a.t),0,1);
 // Position uses Hermite interpolation to preserve altitude at the event edges.
 const dt=b.t-a.t,k2=k*k,k3=k2*k,z=a.z.map((v,n)=>n<3?(2*k3-3*k2+1)*v+(k3-2*k2+k)*dt*a.z[n+3]+(-2*k3+3*k2)*b.z[n]+(k3-k2)*dt*b.z[n+3]:v+(b.z[n]-v)*k);
 const positionECI=z.slice(0,3),velocityECI=z.slice(3,6);
 return {positionECI,velocityECI,...elements(positionECI,velocityECI),trajectoryWetKg:z[6]};
}
// Kinematic upper-stage ascent terminating at the design's insertion state.
// The pad is inferred from that state. It is not a catalogued launch complex.
export function ascentTrack(end,t){
 const tf=540,p=end.positionECI,v=end.velocityECI,u=unit(p),r=Math.hypot(...p),vr=dot(u,v),trans=v.map((x,i)=>x-u[i]*vr),along=unit(trans);
 const sweep=Math.hypot(...trans)/r*tf*.48,pad=u.map((x,i)=>x*Math.cos(sweep)-along[i]*Math.sin(sweep)),padV=[-spin*pad[1],spin*pad[0],0];
 if(t<0){const c=Math.cos(spin*t),s=Math.sin(spin*t),p=[(c*pad[0]-s*pad[1])*R,(s*pad[0]+c*pad[1])*R,pad[2]*R];return {positionECI:p,velocityECI:[-spin*p[1],spin*p[0],0],perigeeKm:0,apogeeKm:0};}
 const k=clip(t/tf,0,1),q=k*k,q3=q*k,h=[2*q3-3*q+1,q3-2*q+k,-2*q3+3*q,q3-q],h1=[(6*q-6*k)/tf,3*q-4*k+1,(-6*q+6*k)/tf,3*q-2*k];
 const dir=pad.map((x,i)=>h[0]*x+h[1]*tf*padV[i]+h[2]*u[i]+h[3]*tf*trans[i]/r),norm=Math.hypot(...dir),n=unit(dir);
 const dn=pad.map((x,i)=>h1[0]*x+h1[1]*padV[i]+h1[2]*u[i]+h1[3]*trans[i]/r),pd=dot(dn,n);
 const radius=R+h[2]*(r-R)+h[3]*tf*vr,rd=h1[2]*(r-R)+h1[3]*vr;
 return {positionECI:n.map(x=>x*radius),velocityECI:n.map((x,i)=>rd*x+radius*(dn[i]-pd*x)/norm),perigeeKm:0,apogeeKm:radius-R};
}
