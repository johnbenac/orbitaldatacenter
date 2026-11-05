export const DAY=86400,YEAR=365.25*DAY,R=6378.137,MU=398600.4418,TAU=2*Math.PI,DEG=Math.PI/180;
export const clip=(x,min,max)=>Math.max(min,Math.min(max,x));
export const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const unit=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n)};
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const j2000=Date.UTC(2000,0,1,12);
export const stations=[{name:'Svalbard',lat:78.23,lon:15.40},{name:'Fairbanks',lat:64.86,lon:-147.85},{name:'Haleakalā',lat:20.71,lon:-156.26},{name:'Canberra',lat:-35.40,lon:148.98},{name:'Madrid',lat:40.43,lon:-4.25},{name:'Punta Arenas',lat:-53.15,lon:-70.92}];
export function groundSites(network='global'){
 const key=String(network).toLowerCase();
 if(/svalbard|single|arctic/.test(key))return [stations[0]];
 if(/polar/.test(key))return [stations[0],stations[1],stations[5]];
 if(/pacific/.test(key))return [stations[2]];
 return stations;
}
const geoCache=new WeakMap();
function constants(d){if(geoCache.has(d))return geoCache.get(d);const q={epochDays:(Date.parse(d.epoch)-j2000)/86400000,sites:groundSites(d.network).map(s=>{const lat=s.lat*DEG,lon=s.lon*DEG;return {...s,x:Math.cos(lat)*Math.cos(lon),y:Math.cos(lat)*Math.sin(lon),z:Math.sin(lat)};})};geoCache.set(d,q);return q;}
export function geometry(d,t,offsetKm=0,track=null){
 const context=constants(d),days=context.epochDays+t/DAY, e=d.ecc, a=R+d.altitudeKm+offsetKm, i=d.inclinationDeg*DEG, n=Math.sqrt(MU/a**3), p=a*(1-e*e),ci=Math.cos(i),si=Math.sin(i),J=1.5*.00108262668*(R/p)**2*n;
 const flight=Math.max(0,t-540), O=d.raanDeg*DEG-J*ci*flight,w=d.argPeriDeg*DEG+0.5*J*(5*ci*ci-1)*flight,cO=Math.cos(O),sO=Math.sin(O);
 // Mean phase follows the design mean motion. Small maintenance altitude excursions alter radius and speed only.
 const nRef=Math.sqrt(MU/(R+d.altitudeKm)**3),M=(d.meanAnomalyDeg*DEG+nRef*flight)%TAU;let E=M;
 for(let k=0;k<5;k++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
 let f=Math.atan2(Math.sqrt(1-e*e)*Math.sin(E),Math.cos(E)-e),u=w+f,cu=Math.cos(u),su=Math.sin(u),rr=a*(1-e*Math.cos(E)),radial=[cO*cu-sO*su*ci,sO*cu+cO*su*ci,su*si],along=[-cO*su-sO*cu*ci,-sO*su+cO*cu*ci,cu*si],normal=[sO*si,-cO*si,ci],pos=radial.map(x=>x*rr),scale=Math.sqrt(MU/p),vel=along.map((v,k)=>scale*((1+e*Math.cos(f))*v+e*Math.sin(f)*radial[k]));
 let perigeeKm=a*(1-e)-R,apogeeKm=a*(1+e)-R,periodSec=TAU/n;
 if(track){pos=track.positionECI;vel=track.velocityECI;rr=Math.hypot(...pos);radial=unit(pos);const angular=cross(pos,vel);if(Math.hypot(...angular)>1e-7)normal=unit(angular);along=unit(cross(normal,radial));perigeeKm=track.perigeeKm;apogeeKm=track.apogeeKm;periodSec=perigeeKm>0?TAU*Math.sqrt(((perigeeKm+apogeeKm)/2+R)**3/MU):0;u=Math.atan2(radial[2]/(Math.sin(i)||1e-9),cO*radial[0]+sO*radial[1]);}
 const lambda=(280.460+.9856474*days+1.915*Math.sin((357.528+.9856003*days)*DEG)+.020*Math.sin(2*(357.528+.9856003*days)*DEG))*DEG,ob=23.439*DEG,sun=[Math.cos(lambda),Math.cos(ob)*Math.sin(lambda),Math.sin(ob)*Math.sin(lambda)],sDot=dot(radial,sun),eclipse=sDot<0&&rr*rr*(1-sDot*sDot)<R*R;
 const earthRotationRad=((280.46061837+360.98564736629*days)*DEG)%TAU;let best=null,el=Number(d.elevationDeg??10)*DEG;
 const ct=Math.cos(earthRotationRad),stheta=Math.sin(earthRotationRad);
 for(const s of context.sites){
  const x=ct*s.x-stheta*s.y,y=stheta*s.x+ct*s.y,projection=pos[0]*x+pos[1]*y+pos[2]*s.z;
  if(projection<R||t<540)continue;
  const dist=Math.sqrt(Math.max(1,rr*rr+R*R-2*R*projection)),sinEl=(projection-R)/dist;if(sinEl<Math.sin(el))continue;
  const elev=Math.asin(clip(sinEl,-1,1)),st=[x*R,y*R,s.z*R],sight=st.map((v,k)=>(v-pos[k])/dist);
  if(elev>=el&&t>=540){el=elev;best={station:s.name,stationLatDeg:s.lat,stationLonDeg:s.lon,stationECI:st,rangeKm:dist,elevationDeg:elev/DEG,dishAzDeg:Math.atan2(dot(sight,normal),dot(sight,along))/DEG,dishElDeg:Math.acos(clip(-dot(sight,radial),-1,1))/DEG};}
 }
 return {t,windowAgeYears:t/YEAR,positionECI:pos,velocityECI:vel,sunECI:sun,radial,along,normal,earthRotationRad,altitudeKm:rr-R,perigeeKm,apogeeKm,periodSec,orbitNumber:1+Math.floor(flight*nRef/TAU),orbitPhaseRad:u,eclipse,betaDeg:Math.asin(clip(dot(normal,sun),-1,1))/DEG,sunRadial:sDot,relativeSpeedMs:Math.hypot(vel[0]+.00007292115*pos[1],vel[1]-.00007292115*pos[0],vel[2])*1000,station:null,stationECI:null,rangeKm:0,elevationDeg:0,dishAzDeg:0,dishElDeg:0,...best};
}
