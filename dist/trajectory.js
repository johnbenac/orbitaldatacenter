import {entrySolution,surfacePoint,distanceKm} from './entry.js';
import {R,MU,DEG,TAU,dot,cross,unit,clip,geometry} from './orbit.js';

const G0=9.80665,spin=7.292115e-5;
export const ENTRY_KM=120;
const speedAt=(r,a)=>Math.sqrt(MU*(2/r-1/a));
export function disposalRequirement(d){
 const a=R+d.altitudeKm,ra=a*(1+d.ecc),rp=R+(d.disposalTargetPerigeeKm??80);
 if(d.disposalMethod==='graveyard'){const r1=a*(1-d.ecc),r2=R+(d.graveyardAltitudeKm??900),trans=(r1+r2)/2;return Math.max(0,1000*(speedAt(r1,trans)-speedAt(r1,a)+speedAt(r2,r2)-speedAt(r2,trans)));}
 return Math.max(0,1000*(speedAt(ra,a)-speedAt(ra,(ra+rp)/2)));
}
function nominalApogee(d,duration){
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
// Signed force is positive retrograde, negative prograde (newtons).
function advanceVector(z,dt,thrust,massFlow){
 function slope(s){const r=Math.hypot(s[0],s[1],s[2]),v=Math.hypot(s[3],s[4],s[5]),a=-MU/r**3,b=-thrust/(1000*s[6]*v);
  return [s[3],s[4],s[5],a*s[0]+b*s[3],a*s[1]+b*s[4],a*s[2]+b*s[5],-massFlow];}
 const shift=(s,k,h)=>s.map((v,i)=>v+h*k[i]),k1=slope(z),k2=slope(shift(z,k1,dt/2)),k3=slope(shift(z,k2,dt/2)),k4=slope(shift(z,k3,dt));
 return z.map((v,i)=>v+dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);
}
// Finite retrograde thrust is propagated with central gravity. Guidance cuts off
// at the specified osculating perigee. An unsuccessful trial is held at the
// pre-ignition state instead of consuming fuel in a known failed maneuver.
function retrogradeTransfer(g,d,wet,available,end){
 const start=g.t,goal=d.disposalTargetPerigeeKm??80,flow=d.thrustN/(G0*d.isp),minMass=wet-Math.max(0,available);
 const z0=[...g.positionECI,...g.velocityECI,wet],samples=[{t:start,z:z0}],p0=elements(g.positionECI,g.velocityECI);
 // Scale the full inertial velocity vector until energy and angular momentum
 // place perigee at rp; valid at off-apsis ignition as well as at apogee.
 const v2=dot(g.velocityECI,g.velocityECI),r=Math.hypot(...g.positionECI),rp=R+goal,hmag=Math.hypot(...cross(g.positionECI,g.velocityECI));
 const speedFraction=Math.sqrt(Math.max(0,2*MU*(1/rp-1/r)/(hmag*hmag/(rp*rp)-v2))),requiredDv=Math.max(0,1000*Math.sqrt(v2)*(1-speedFraction));
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
function graveyardTransfer(g,d,wet,available,end){
 const start=g.t,goal=d.graveyardAltitudeKm??900,initial=elements(g.positionECI,g.velocityECI),flow=d.thrustN/(G0*d.isp);
 const fail=reason=>({method:'graveyard',outcome:'infeasible',feasible:false,targetMet:false,reason,start,end:start,entry:null,cutoff:null,usedKg:0,paidDv:0,requiredDv:disposalRequirement(d),goal,initialWet:wet,finalPerigeeKm:initial.perigeeKm,finalApogeeKm:initial.apogeeKm,burns:[],samples:[],groundTrack:[]});
 if(g.orbitLost||goal<=initial.apogeeKm+1)return fail('The selected raised circle must clear the current apogee by more than 1 km.');
 let t=start,z=[...g.positionECI,...g.velocityECI,wet];const samples=[{t,z}],burns=[],el=z=>elements(z.slice(0,3),z.slice(3,6));
 function propagate(stop,thrust,role){
  const t0=t,m0=z[6],mdot=thrust?flow:0;
  while(t<end-1e-5){const left=thrust?(z[6]-wet+available)/flow:Infinity;let dt=Math.min(end-t,left,thrust?3:8);if(dt<1e-6)return false;
   let next=advanceVector(z,dt,-thrust,mdot);if(stop(next,t+dt)>=0){let lo=0,hi=dt;for(let i=0;i<21;i++){const mid=(lo+hi)/2;if(stop(advanceVector(z,mid,-thrust,mdot),t+mid)<0)lo=mid;else hi=mid;}dt=hi;next=advanceVector(z,dt,-thrust,mdot);t+=dt;z=next;samples.push({t,z});if(thrust)burns.push({start:t0,end:t,role,usedKg:m0-z[6],dvMs:G0*d.isp*Math.log(m0/z[6])});return true;}
   t+=dt;z=next;samples.push({t,z});
  }return false;
 }
 if(!propagate(x=>el(x).apogeeKm-goal,d.thrustN,'Raise apogee'))return fail('Insufficient usable propellant or maneuver time for orbit raising.');
 const p=z.slice(0,3),v=z.slice(3,6),rad=Math.hypot(...p),a=(el(z).perigeeKm+goal)/2+R,e=(R+goal)/a-1,n=Math.sqrt(MU/a**3);
 const E=Math.atan2(dot(p,v)/(e*Math.sqrt(MU*a)),(1-rad/a)/e),mean=E-e*Math.sin(E);
 const toApo=((Math.PI-mean+TAU)%TAU)/n,dv2=1000*(speedAt(R+goal,R+goal)-speedAt(R+goal,a)),dt2=z[6]*(-Math.expm1(-dv2/(G0*d.isp)))/flow,burnAt=t+toApo-dt2/2;
 if(burnAt<t||!propagate((_,u)=>u-burnAt,0,'Coast'))return fail('The transfer gives insufficient coast time for a centered circularization burn.');
 if(!propagate(x=>{const q=el(x);return (q.apogeeKm+q.perigeeKm)/2-goal;},d.thrustN,'Circularize'))return fail('Insufficient usable propellant or maneuver time to circularize.');
 const final=el(z);if(Math.max(Math.abs(final.perigeeKm-goal),Math.abs(final.apogeeKm-goal))>5)return fail('Achieved circularization misses the ±5 km radial tolerance.');
 return {method:'graveyard',outcome:'graveyard',feasible:true,targetMet:true,reason:'Raised disposal orbit established within ±5 km of the requested circular altitude.',goal,start,end:t,entry:null,cutoff:t,firstCutoff:burns[0].end,usedKg:wet-z[6],paidDv:G0*d.isp*Math.log(wet/z[6]),requiredDv:disposalRequirement(d),initialWet:wet,finalPerigeeKm:final.perigeeKm,finalApogeeKm:final.apogeeKm,perigeeKm:final.perigeeKm,burns,samples};
}
function trackPoints(d,samples){const stride=Math.max(1,Math.floor(samples.length/240));return samples.filter((s,i)=>i%stride===0||i===samples.length-1).map(s=>surfacePoint(d,s.t,s.z.slice(0,3)));}
function targetOf(d){return {latDeg:d.targetLatDeg??-48.9,lonDeg:d.targetLonDeg??-123.4,toleranceKm:d.targetToleranceKm??200};}
function nominalDescent(d,t,wet){const g=geometry(d,t),p=retrogradeTransfer(g,d,wet,wet*.99,t+20000);if(!p.feasible)return null;const r=entrySolution(p.entry,p.samples.at(-1).z,d,false);if(!r)return null;
 const rad=unit(r.z.slice(0,3));return {arc:Math.atan2(dot(rad,g.along),dot(rad,g.radial)),dt:r.impact.t-t};}
export function disposalIgnition(d,duration,wet=3000){
 const per=TAU*Math.sqrt((R+d.altitudeKm)**3/MU);
 if(d.disposalMethod==='graveyard'){const transferPeriod=TAU*Math.sqrt(((R+d.altitudeKm+R+(d.graveyardAltitudeKm??900))/2)**3/MU),first=540-d.meanAnomalyDeg*DEG/TAU*per;
  return Math.max(1500,first+Math.floor((duration-1.2*transferPeriod-first)/per)*per);}
 const target=targetOf(d),epoch=nominalApogee(d,duration),window=Math.min(.18*duration,(d.targetSearchHours??36)*3600);
 let estimate=nominalDescent(d,epoch,wet);if(!estimate)return epoch;
 let best=epoch;
 for(let pass=0;pass<2;pass++){const latest=duration-estimate.dt-300,earliest=Math.max(1500,latest-window),ca=Math.cos(estimate.arc),sa=Math.sin(estimate.arc);
  if(latest<=earliest)return epoch;
  function error(t){const g=geometry(d,t),p=g.radial.map((x,i)=>x*ca+g.along[i]*sa);return distanceKm(target,surfacePoint(d,t+estimate.dt,p));}
  let bestError=Infinity;for(let t=earliest;t<=latest;t+=90){const e=error(t);if(e<bestError){bestError=e;best=t;}}
  if(error(latest)<bestError)best=latest;
  let lo=Math.max(earliest,best-90),hi=Math.min(latest,best+90);for(let j=0;j<22;j++){const a=(2*lo+hi)/3,b=(lo+2*hi)/3;if(error(a)<error(b))hi=b;else lo=a;}best=(lo+hi)/2;
  if(pass===0)estimate=nominalDescent(d,best,wet)||estimate;
 }
 return best;
}
function airAtEntry(p){const index=p.samples.findIndex(s=>s.t===p.entry),z=p.samples[index].z,v=[z[3]+spin*z[1],z[4]-spin*z[0],z[5]],r=unit(z.slice(0,3)),speed=Math.hypot(...v);return {speed:1000*speed,fpa:Math.asin(clip(dot(r,v)/speed,-1,1))/DEG};}
export function planDisposal(g,d,wet,available,end){
 if(d.disposalMethod==='graveyard'){const p=graveyardTransfer(g,d,wet,available,end);p.groundTrack=trackPoints(d,p.samples);return p;}
 const target=targetOf(d),p=retrogradeTransfer(g,d,wet,available,end);
 const fail=reason=>({...p,method:'reentry',outcome:'infeasible',targetMet:false,target,feasible:false,reason,cutoff:null,entry:null,end:g.t,usedKg:0,paidDv:0,burns:[],samples:[],groundTrack:[]});
 if(Math.abs(target.latDeg)>Math.min(d.inclinationDeg,180-d.inclinationDeg)+target.toleranceKm/R/DEG+.15)return fail('Requested latitude is outside the reachable orbital ground-track band and target tolerance.');
 if(!p.feasible)return fail(p.reason);
 const down=entrySolution(p.entry,p.samples.at(-1).z,d,true);if(!down||down.impact.t>end)return fail('No reference-body surface intersection inside the selected mission horizon.');
 const targetErrorKm=distanceKm(target,down.impact),targetMet=targetErrorKm<=target.toleranceKm,burns=[{start:p.start,end:p.cutoff,role:'Retrograde deorbit',usedKg:p.usedKg,dvMs:p.paidDv}];
 p.samples.push(...down.samples);
 const ev=airAtEntry(p);
 return {...p,interfaceSpeedMs:ev.speed,interfaceFpaDeg:ev.fpa,end:down.impact.t,method:'reentry',outcome:targetMet?'impact':'target-miss',targetMet,target,targetErrorKm,impact:down.impact,footprint:down.footprint,referenceBody:'Non-lifting, non-ablating surviving reference body',ballisticCoefficientKgM2:d.entryBallisticKgM2??150,entryPoint:surfacePoint(d,p.entry,p.samples.find(x=>x.t===p.entry).z.slice(0,3)),burns,finalPerigeeKm:null,finalApogeeKm:null,groundTrack:trackPoints(d,p.samples),reason:targetMet?'Nominal surviving-body impact is within the specified target radius.':'Closest planned opportunity misses the specified target radius.'};
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
