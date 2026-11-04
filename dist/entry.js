// Conditional impact of a zero-lift, constant-ballistic-coefficient reference
// body. Density is log-interpolated in geometric altitude from USSA76 reference
// values. Atmosphere rigidly co-rotates. No wind, ablation, lift or breakup.
import {R,MU,DEG,TAU,dot,cross,unit,clip} from './orbit.js';
const OMEGA=7.292115e-5;
const densities=[1.225,.41351,.08891,.01841,.003996,.001027,.0003097,.00008283,.00001846,.000003416,5.604e-7,9.708e-8,2.222e-8];
export function entryDensity(alt){const x=Math.max(0,alt)/10,i=Math.min(11,Math.floor(x));return densities[i]*Math.exp((x-i)*Math.log(densities[i+1]/densities[i]));}
export function surfacePoint(d,t,p){
 const days=(Date.parse(d.epoch)-Date.UTC(2000,0,1,12))/86400000+t/86400;
 const angle=((280.46061837+360.98564736629*days)%360)*DEG,lon=(Math.atan2(p[1],p[0])-angle)/DEG;
 return {t,latDeg:Math.atan2(p[2],Math.hypot(p[0],p[1]))/DEG,lonDeg:((lon+540)%360+360)%360-180,altitudeKm:Math.hypot(...p)-R};
}
function enu(p,q){const a=p.latDeg*DEG,b=q.latDeg*DEG,l=(q.lonDeg-p.lonDeg)*DEG,e=Math.cos(b)*Math.sin(l),n=Math.cos(a)*Math.sin(b)-Math.sin(a)*Math.cos(b)*Math.cos(l),s=Math.hypot(e,n),c=Math.sin(a)*Math.sin(b)+Math.cos(a)*Math.cos(b)*Math.cos(l),scale=s>1e-14?R*Math.atan2(s,c)/s:0;return [e*scale,n*scale];}
export function distanceKm(p,q){const a=p.latDeg*DEG,b=q.latDeg*DEG,dl=(q.lonDeg-p.lonDeg)*DEG;return 2*R*Math.asin(Math.sqrt(clip(Math.sin((b-a)/2)**2+Math.cos(a)*Math.cos(b)*Math.sin(dl/2)**2,0,1)));}
function fromENU(p,e,n){const a=p.latDeg*DEG,dist=Math.hypot(e,n)/R,br=Math.atan2(e,n),lat=Math.asin(clip(Math.sin(a)*Math.cos(dist)+Math.cos(a)*Math.sin(dist)*Math.cos(br),-1,1)),dl=Math.atan2(Math.sin(br)*Math.sin(dist)*Math.cos(a),Math.cos(dist)-Math.sin(a)*Math.sin(lat));return {latDeg:lat/DEG,lonDeg:((p.lonDeg+dl/DEG+540)%360)-180};}
export function airVelocity(z){return [z[3]+OMEGA*z[1],z[4]-OMEGA*z[0],z[5]];}
function descent(start,z,d,perturb={},keep=false){
 const beta=(d.entryBallisticKgM2??150)*Math.exp(perturb.beta||0),scale=Math.exp(perturb.density||0),v=airVelocity(z),speed=Math.hypot(...v),rad=unit(z.slice(0,3)),tangent=unit(cross(rad,v)),a=perturb.azimuth||0;
 const vertical=dot(rad,v),horizontal=Math.sqrt(Math.max(0,speed**2-vertical**2)),unitH=unit(v.map((x,i)=>x-vertical*rad[i])),dv=perturb.speed||0;
 const initial=v.map((_,i)=>(vertical*rad[i]+horizontal*(unitH[i]*Math.cos(a)+tangent[i]*Math.sin(a)))*(1+dv/(1000*speed)));
 let x=[...z.slice(0,3),initial[0]-OMEGA*z[1],initial[1]+OMEGA*z[0],initial[2],z[6]],t=start;const samples=[];
 function slope(s){const r=Math.hypot(s[0],s[1],s[2]),air=airVelocity(s),k=-.5*entryDensity(r-R)*scale*Math.hypot(...air)*1000/beta,grav=-MU/r**3;return [s[3],s[4],s[5],s[0]*grav+air[0]*k,s[1]*grav+air[1]*k,s[2]*grav+air[2]*k,0];}
 function step(s,h){const add=(a,b,c)=>a.map((v,i)=>v+b[i]*c),k1=slope(s),k2=slope(add(s,k1,h/2)),k3=slope(add(s,k2,h/2)),k4=slope(add(s,k3,h));return s.map((v,i)=>v+h*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);}
 const alt=s=>Math.hypot(s[0],s[1],s[2])-R;
 while(alt(x)>0&&t<start+15000){const airspeed=1000*Math.hypot(...airVelocity(x)),h=Math.min(4,.30*beta/(entryDensity(alt(x))*scale*Math.max(.01,airspeed)));if(!(h>0))break;
  let dt=h,next=step(x,dt);if(alt(next)<=0){let lo=0,hi=dt;for(let i=0;i<21;i++){const mid=(hi+lo)/2;if(alt(step(x,mid))>0)lo=mid;else hi=mid;}dt=hi;next=step(x,dt);}
  t+=dt;x=next;if(keep)samples.push({t,z:x});
 }
 if(alt(x)>.001)return null;
 return {impact:{...surfacePoint(d,t,x.slice(0,3)),altitudeKm:0,speedMs:1000*Math.hypot(...airVelocity(x))},z:x,samples};
}
export function entrySolution(t,z,d,detail=true){
 const nominal=descent(t,z,d,{},detail);if(!nominal||!detail)return nominal;
 // Symmetric +/-1-sigma sensitivities in the impact tangent plane. Independent
 // input errors; covariance is J diag(sigma²) Jᵀ, with a bivariate Gaussian contour.
 const sigmas={density:Math.log1p((d.entryDensitySigmaPct??15)/100),beta:Math.log1p((d.entryBallisticSigmaPct??15)/100),speed:d.entryVelocitySigmaMs??2,azimuth:(d.entryAzimuthSigmaDeg??.08)*DEG};
 let ee=0,en=0,nn=0;for(const [key,sigma] of Object.entries(sigmas)){if(!sigma)continue;const pos=descent(t,z,d,{[key]:sigma}),neg=descent(t,z,d,{[key]:-sigma});if(!pos||!neg)return {...nominal,footprint:null};const a=enu(nominal.impact,pos.impact),b=enu(nominal.impact,neg.impact),east=(a[0]-b[0])/2,north=(a[1]-b[1])/2;ee+=east*east;nn+=north*north;en+=east*north;}
 const k=-2*Math.log(.05),delta=Math.hypot(ee-nn,2*en),maj=Math.sqrt(Math.max(0,(ee+nn+delta)*.5*k)),min=Math.sqrt(Math.max(0,(ee+nn-delta)*.5*k)),theta=.5*Math.atan2(2*en,nn-ee),points=[];
 for(let j=0;j<=96;j++){const u=maj*Math.cos(TAU*j/96),v=min*Math.sin(TAU*j/96);points.push(fromENU(nominal.impact,u*Math.sin(theta)+v*Math.cos(theta),u*Math.cos(theta)-v*Math.sin(theta)));}
 return {...nominal,footprint:{confidence:.95,semiMajorKm:maj,semiMinorKm:min,bearingDeg:((theta/DEG)+180)%180,covarianceKm2:[[ee,en],[en,nn]],points,center:nominal.impact,convention:'East/north covariance; major-axis bearing clockwise from true north',method:'Conditional 95% bivariate Gaussian; independent entry and drag uncertainties propagated by symmetric finite differences'}};
}
