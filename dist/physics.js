import {terminalPattern} from './terminal-activity.js';
import {attitudeGuidance} from './attitude-guidance.js';
import {deploymentSchedule} from './deployment.js';
import {ramSilhouette} from './silhouette.js';
import {densities,observedFlux} from './density.js';
import {clip,DEG,dot,cross,unit,R,YEAR,DAY} from './orbit.js';
const G0=9.80665,SIGMA=5.670374419e-8;
export const drag=(rho,v,cd,area)=>.5*rho*v*v*cd*area;
export const burnMass=(m,isp,dv)=>m*(-Math.expm1(-dv/(isp*G0)));
export const fraction=(ratio,years)=>Math.max(0,ratio)**years;
export function packStep(energy,gen,load,hours,min,max,chargeLimit,dischargeLimit,ce,de){
 const charge=Math.min(Math.max(0,gen-load),chargeLimit,Math.max(0,max-energy)/(ce*hours)),discharge=Math.min(Math.max(0,load-gen),dischargeLimit,Math.max(0,energy-min)*de/hours);
 return {energy:Math.min(max,Math.max(0,energy+(charge*ce-discharge/de)*hours)),charge,discharge,curtailed:Math.max(0,gen-load-charge),unmet:Math.max(0,load-gen-discharge)};
}
export function atmosphere(d,g){
 const age=g.windowAgeYears+(d.solarCyclePhase||0)*11,lo=d.f107Floor??70,hi=d.f107Ceiling??180;
 const observed=d.solarDriver==='observed',month=((age*12)%132+132)%132,indexMonth=Math.floor(month),mix=month-indexMonth;
 const observedAt=offset=>observedFlux[(indexMonth+132+offset)%132]*(1-mix)+observedFlux[(indexMonth+133+offset)%132]*mix;
 const f81=observed?(observedAt(-1)+observedAt(0)+observedAt(1))/3:(hi+lo)/2+(hi-lo)/2*Math.sin(2*Math.PI*age/11),fDaily=observed?observedAt(0):f81+8*Math.sin(g.t/27/DAY*2*Math.PI),activity=clip(f81+.25*(fDaily-f81)+.55*((d.ap??10)-15),65,250);
 const index=clip(Math.floor((g.altitudeKm-100)/20),0,densities.length-2),frac=clip((g.altitudeKm-(100+20*index))/20,0,160),col=activity<140?0:1,k=col===0?(activity-65)/75:(activity-140)/110;
 const logRho=j=>(1-k)*Math.log(densities[j][col])+k*Math.log(densities[j][col+1]);const densityKgM3=Math.exp(logRho(index)+(logRho(index+1)-logRho(index))*frac)*(1+.18*g.sunRadial);
 return {densityKgM3,f107Daily:fDaily,f107Mean:f81,densityExtrapolated:g.altitudeKm>900,fluxSource:observed?'NOAA PSL / NRC Canada 2009–2019 monthly replay; daily and 81-day proxies':'Nominal F10.7 envelope'};
}
const stowed=deploymentSchedule(0),deployed=deploymentSchedule(1);
// For two opposite faces, integrate |n·u|/π over the apparent Earth disk.
// If the disk crosses the tangent plane, the projected cap is bounded by
// an elliptical arc and the unit-circle limb. Their signed areas add.
export function earthDiskView(cosNormalToRadial, sinRadius){
 const c=clip(Math.abs(cosNormalToRadial),0,1),k=clip(sinRadius,0,1);
 if(c>=k)return k*k*c;
 const s=Math.sqrt(1-c*c),h=Math.sqrt(1-k*k),phi=Math.acos(clip(h*c/(k*s),0,1)),limb=Math.acos(clip(h/s,0,1));
 return clip(k*k*c*(1-2*phi/Math.PI)+2*(limb-h*s*k*Math.sin(phi))/Math.PI,0,1);
}
export function surfaces(h,g,deployment,fluxOnly=false,burnDirection=0,guidance=null){
 const motion=deployment<=0?stowed:deployment>=1?deployed:deploymentSchedule(deployment);
 const d=h.input,att=guidance??attitudeGuidance(h,g,{deployment,burnDirection}),rad=att.bodyXECI,bodyUp=att.bodyUpECI,bodyZ=att.bodyZECI;
 const pv=att.pvNormalECI,upperNormal=att.upperRadiatorNormalECI,lowerNormal=att.lowerRadiatorNormalECI;
 const ram=unit([g.velocityECI[0]+.00007292115*g.positionECI[1],g.velocityECI[1]-.00007292115*g.positionECI[0],g.velocityECI[2]]);
 const normalCos=Math.max(0,dot(pv,g.sunECI)),sunlit=g.eclipse?0:1,sinRadius=clip(R/(R+g.altitudeKm),0,1);
 const y=g.windowAgeYears,eps=d.emissivity*fraction(d.emissivityRetention,y),alpha=clip(d.absorptivity+(d.alphaGrowth||0)*y,0,1);
 const solarDeployedM2=h.solarM2*motion.pv,solarKW=1.361*solarDeployedM2*normalCos*sunlit*d.pvEfficiency*(d.solarDelivery??.86)*fraction(d.pvRetention,y);
 const upperSun=Math.abs(dot(upperNormal,g.sunECI)),lowerSun=Math.abs(dot(lowerNormal,g.sunECI));
 const view=n=>earthDiskView(dot(n,g.radial),sinRadius),upperView=view(upperNormal),lowerView=view(lowerNormal);
 const upper=motion.upperFlow,lower=motion.lowerFlow,total=upper+lower,mean=(a,b)=>total>0?(upper*a+lower*b)/total:0;
 const radSunCos=mean(upperSun,lowerSun),earthView=mean(upperView,lowerView),albedoScale=1361*.30*Math.max(0,g.sunRadial),albedo=albedoScale*earthView,earthIR=237*earthView;
 const radiatorCoupledM2=h.radiatorM2*total*.5;
 const incident=(cos,v)=>alpha*(1361*sunlit*cos+albedoScale*v)+eps*237*v;
 const upperAbsorbedKW=h.radiatorM2*upper*.0005*incident(upperSun,upperView),lowerAbsorbedKW=h.radiatorM2*lower*.0005*incident(lowerSun,lowerView);
 const ramBody=[dot(ram,rad),dot(ram,bodyUp),dot(ram,bodyZ)],ramArea=fluxOnly?0:ramSilhouette(h,ramBody,deployment,att);
 // Area-weight the three opposing face pairs for finite Earth disk loading.
 const boxArea=h.enclosure?.grossAreaM2||2*(h.bodyHeightM*h.bodyLengthM+h.bodyWidthM*h.bodyLengthM+h.bodyWidthM*h.bodyHeightM);
 const boxProjection=v=>h.bodyHeightM*h.bodyLengthM*Math.abs(dot(v,rad))+h.bodyWidthM*h.bodyLengthM*Math.abs(dot(v,bodyUp))+h.bodyWidthM*h.bodyHeightM*Math.abs(dot(v,bodyZ));
 const earthFraction=(h.bodyHeightM*h.bodyLengthM*view(rad)+h.bodyWidthM*h.bodyLengthM*view(bodyUp)+h.bodyWidthM*h.bodyHeightM*view(bodyZ))/boxArea,enclosureIRWm2=237*earthFraction,enclosureSolarWm2=1361*(sunlit*boxProjection(g.sunECI)/boxArea+.30*Math.max(0,g.sunRadial)*earthFraction);
 if(fluxOnly)return {enclosureSolarWm2,enclosureIRWm2,solarIncidenceCos:normalCos,radiatorSunCos:radSunCos};
 return {...att,radiatorDirectSolarKW:radiatorCoupledM2*alpha*1.361*sunlit*radSunCos,radiatorAlbedoKW:radiatorCoupledM2*alpha*albedo/1000,radiatorEarthIRKW:radiatorCoupledM2*eps*earthIR/1000,upperEarthView:upperView,lowerEarthView:lowerView,spaceViewFactor:1-earthView*.5,bodyXECI:rad,bodyUpECI:bodyUp,bodyZECI:bodyZ,burnDirection,solarDeployedM2,radiatorCoupledM2,upperRadiatorNormalECI:upperNormal,lowerRadiatorNormalECI:lowerNormal,upperRadiatorFlow:upper,lowerRadiatorFlow:lower,upperAbsorbedKW,lowerAbsorbedKW,pvDeployment:motion.pv,radiatorDeployment:motion.radiator,deploymentStep:motion.step,deploymentTitle:motion.title,enclosureSolarWm2,enclosureIRWm2,pvNormalECI:pv,radiatorNormalECI:upperNormal,ramBody,ramAreaM2:ramArea,solarIncidenceCos:normalCos,radiatorSunCos:radSunCos,earthView,solarKW,generationKW:solarKW,emissivity:eps,absorptivity:alpha,solarIrradiance:1361*sunlit,albedoIrradiance:albedo,earthIRIrradiance:earthIR,absorbedKW:upperAbsorbedKW+lowerAbsorbedKW,emissionCoeff:radiatorCoupledM2*2*eps*SIGMA/1000};
}
export function selectedTerminal(d,available){
 let mode=String(d.link||'auto').toLowerCase();
 let name=/optic|laser/.test(mode)?'Optical':/sband|s-band|^s$/.test(mode)?'S-band':'Ka';
 if(/auto/.test(mode))name=available>1e4?'Optical':available>1?'Ka':'S-band';
 return name;
}
export function linkBudget(d,g,pointingDeg,available,acquisitionResidualDeg=0,patchOffAxisDeg=0,name=selectedTerminal(d,available)){
 const active=!!g.station, range=Math.max(1,g.rangeKm)*1000,atmos=2/Math.max(.20,Math.sin(g.elevationDeg*DEG));
 const width=terminalPattern(d,name).fullWidthRad/DEG,patchLossDb=12*(patchOffAxisDeg/80)**2;
 let line,gain=0,margin=0,draw=0,bandwidth,required=5,rxPowerDbm=0;
 if(name==='Optical'){
  const divergence=width*DEG/2,jitter=(d.opticalJitterUrad??1.5)*1e-6,diam=.5,loss=10**(-(atmos+4)/10)*Math.exp(-2*(Math.hypot(jitter,acquisitionResidualDeg*DEG)/divergence)**2),receivedW=(d.opticalTxW??1)*Math.min(1,(diam/(2*range*divergence))**2)*loss;
  rxPowerDbm=10*Math.log10(Math.max(1e-30,receivedW)*1000);bandwidth=2e9;line=Math.min(bandwidth,receivedW/(6.62607015e-34*299792458/1.55e-6)/100);margin=10*Math.log10(Math.max(1e-12,line)/1e9);draw=.24;
 }else{
  const ka=name==='Ka',freq=ka?26e9:2.2e9,lambda=299792458/freq,dish=d.kaDishM||.60,db=x=>10*Math.log10(x),fspl=20*Math.log10(4*Math.PI*range/lambda);bandwidth=ka?250e6:2e6;gain=ka?db(.60*(Math.PI*dish/lambda)**2):5;
  const pointLoss=ka?12*(Math.hypot(pointingDeg,acquisitionResidualDeg)/width)**2:patchLossDb,tx=ka?20:2,gt=ka?35:12,cn0=db(tx)+gain+gt-fspl-atmos-pointLoss-2+228.6;
  line=Math.min(bandwidth*2,10**((cn0-required)/10));margin=cn0-10*Math.log10(bandwidth*2)-required;draw=ka?.205:.035;
 }
 const freqUp=2.05e9,lossUp=20*Math.log10(4*Math.PI*range*freqUp/299792458),upCNo=47+5-patchLossDb-10*Math.log10(500)-lossUp-3+228.6;
 const uplinkRate=Math.min(2e6,10**((upCNo-5)/10))/1e6;
 return {groundLink:active?name:null,patchOffAxisDeg,patchLossDb,contact:active,lineMbps:active?line/1e6:0,uplinkMbps:active?uplinkRate:0,linkMarginDb:active?margin:0,antennaGainDbi:gain,beamwidthDeg:width,footprintKm:active?2*g.rangeKm*Math.tan(width*DEG/2):0,bandwidthMHz:bandwidth/1e6,rxPowerDbm,acquisitionSec:name==='Optical'?35:name==='Ka'?20:5,terminalKW:active?draw:.015};
}
