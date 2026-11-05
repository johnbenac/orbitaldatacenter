// Spherical, direct-ascent geometry. Epoch is launch UTC. A documented pad or
// explicitly marked regional study point supplies the Earth-fixed origin.
import {DEG,MU,R,clip,cross,dot,geometry,unit} from './orbit.js';
import {launchSiteFor} from './launch-sites.js';
import {launchRiseM} from './launch-effects-state.js';
const END=540,spin=7.292115e-5,deg=x=>(x/DEG%360+360)%360;
export function insertionOffset(d){
 const a=R+d.altitudeKm,delta=-2*a*d.trimDv/(1000*Math.sqrt(MU/a));
 return Math.max(delta,(R+120)/(1-d.ecc)-a);
}
export function launchPath(d,offset=insertionOffset(d)){
 const site=launchSiteFor(d.launcher,d.launchSite),lat=site.lat*DEG;
 const sidereal=(280.46061837+360.98564736629*(Date.parse(d.epoch)-Date.UTC(2000,0,1,12))/86400000)*DEG;
 const lon=sidereal+site.lon*DEG,c=Math.cos(lat),s=Math.sin(lat),cl=Math.cos(lon),sl=Math.sin(lon);
 const pad=[c*cl,c*sl,s],east=[-sl,cl,0],north=[-s*cl,-s*sl,c];
 const min=Math.abs(site.lat),inc=clip(d.inclinationDeg,min,180-min);
 // The downrange branch illustrates a seaward launch. Range corridor and
 // dogleg approval require a mission-specific trajectory.
 const south=/vandenberg|starbase|louisiana|wenchang/.test(site.id);
 const az0=Math.asin(clip(Math.cos(inc*DEG)/c,-1,1)),az=south?Math.PI-az0:az0;
 const along=east.map((x,i)=>x*Math.sin(az)+north[i]*Math.cos(az));
 const h=unit(cross(pad,along)),raan=Math.atan2(h[0],-h[1]),node=[Math.cos(raan),Math.sin(raan),0],perp=cross(h,node);
 const u0=Math.atan2(dot(pad,perp),dot(pad,node)),a=R+d.altitudeKm+offset,e=d.ecc,p=a*(1-e*e);
 let sweep=.29,E,M;
 for(let j=0;j<12;j++){
  const nu=u0+sweep-d.argPeriDeg*DEG;
  E=2*Math.atan2(Math.sqrt(1-e)*Math.sin(nu*.5),Math.sqrt(1+e)*Math.cos(nu*.5));
  M=E-e*Math.sin(E);
  const r=p/(1+e*Math.cos(nu));sweep=Math.sqrt(MU*p)/(r*r)*END*.48;
 }
 const angles={inclinationDeg:inc,raanDeg:deg(raan),meanAnomalyDeg:deg(M)};
 const achieved=geometry({...d,...angles},END,offset),target=geometry(d,END,offset);
 const gapKm=Math.hypot(...achieved.positionECI.map((x,i)=>x-target.positionECI[i]));
 return {site,pad,achieved,angles,launcher:d.launcher,gapKm,headingDeg:deg(az),planeErrorDeg:Math.acos(clip(dot(achieved.normal,target.normal),-1,1))/DEG,latitudeLimited:Math.abs(inc-d.inclinationDeg)>1e-7};
}
export function ascentTrack(path,t){
 const {pad,achieved:end,launcher}=path,p=end.positionECI,v=end.velocityECI,u=unit(p),r=Math.hypot(...p),vr=dot(u,v),trans=v.map((x,i)=>x-u[i]*vr),padV=[-spin*pad[1],spin*pad[0],0];
 if(t<=0){const c=Math.cos(spin*t),s=Math.sin(spin*t),p=[(c*pad[0]-s*pad[1])*R,(s*pad[0]+c*pad[1])*R,pad[2]*R];return {positionECI:p,velocityECI:[-spin*p[1],spin*p[0],0],perigeeKm:0,apogeeKm:0};}
 const k=clip(t/END,0,1),q=k*k,q3=q*k,H=[2*q3-3*q+1,q3-2*q+k,-2*q3+3*q,q3-q],D=[(6*q-6*k)/END,3*q-4*k+1,(-6*q+6*k)/END,3*q-2*k];
 const dir=pad.map((x,i)=>H[0]*x+H[1]*END*padV[i]+H[2]*u[i]+H[3]*END*trans[i]/r),n=unit(dir),norm=Math.hypot(...dir);
 const dn=pad.map((x,i)=>D[0]*x+D[1]*padV[i]+D[2]*u[i]+D[3]*trans[i]/r),pd=dot(dn,n);
 const early=t=>launchRiseM(Math.max(0,t),launcher)/1000,vel=t=>t>=34.99?(early(t)-early(t-.01))/.01:(early(t+.01)-early(t-.01))/.02;
 let altitude,rd;
 if(t<=35){altitude=early(t);rd=vel(t);}else{
  const duration=END-35,j=clip((t-35)/duration,0,1),k=j*j,m=k*j,y0=early(35),v0=vel(35),y1=r-R;
  altitude=(2*m-3*k+1)*y0+(m-2*k+j)*duration*v0+(-2*m+3*k)*y1+(m-k)*duration*vr;
  rd=(6*k-6*j)*(y0-y1)/duration+(3*k-4*j+1)*v0+(3*k-2*j)*vr;
 }
 const radius=R+altitude;
 return {positionECI:n.map(x=>x*radius),velocityECI:n.map((x,i)=>rd*x+radius*(dn[i]-pd*x)/norm),perigeeKm:0,apogeeKm:altitude};
}
