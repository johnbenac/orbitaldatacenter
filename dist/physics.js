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
export function surfaces(h,g,deployment,fluxOnly=false){
 const motion=deployment<=0?stowed:deployment>=1?deployed:deploymentSchedule(deployment);
 const d=h.input,roll=(d.rollDeg??0)*DEG,tilt=(d.solarTiltDeg??0)*DEG*motion.tracking,mode=String(d.attitude), ram=unit([g.velocityECI[0]+.00007292115*g.positionECI[1],g.velocityECI[1]-.00007292115*g.positionECI[0],g.velocityECI[2]]);
 let base=g.sunECI;
 if(/low.?drag/.test(mode))base=g.normal;
 else if(/nadir/.test(mode))base=g.radial;
 else if(/inertial/.test(mode))base=[1,0,0];
 else if(/manual/.test(mode)){const p=d.pitchDeg*DEG,y=d.yawDeg*DEG,along=unit(cross(g.normal,g.radial));base=g.radial.map((x,i)=>x*Math.cos(p)*Math.cos(y)+along[i]*Math.cos(p)*Math.sin(y)+g.normal[i]*Math.sin(p));}
 const ortho=unit(cross(base,Math.abs(base[2])>.9?[1,0,0]:[0,0,1])),axis=unit(cross(ortho,base));
 const pv=unit(base.map((x,i)=>x*Math.cos(roll+tilt)+axis[i]*Math.sin(roll+tilt))),rad=unit(axis.map((x,i)=>x*Math.cos(roll)-base[i]*Math.sin(roll))),normalCos=Math.max(0,dot(pv,g.sunECI));
 const sunlit=g.eclipse?0:1,radSunCos=Math.abs(dot(rad,g.sunECI)),earthDisk=(R/(R+g.altitudeKm))**2;
 const earthView=earthDisk*(.22+.78*Math.abs(dot(rad,g.radial))),albedo=1361*.30*Math.max(0,g.sunRadial)*earthView,earthIR=237*earthView;
 const bodyUp=base.map((v,i)=>v*Math.cos(roll)+axis[i]*Math.sin(roll)),bodyZ=unit(cross(rad,bodyUp)),ramBody=[dot(ram,rad),dot(ram,bodyUp),dot(ram,bodyZ)],ramArea=fluxOnly?0:ramSilhouette(h,ramBody,deployment);
 const y=g.windowAgeYears,eps=d.emissivity*fraction(d.emissivityRetention,y),alpha=clip(d.absorptivity+(d.alphaGrowth||0)*y,0,1),solarKW=1.361*h.solarM2*normalCos*sunlit*motion.pv*d.pvEfficiency*(d.solarDelivery??.86)*fraction(d.pvRetention,y);
 // Area-averaged solar exposure of a convex six-sided box; Earth-disk
 // loading blends the nadir projection with an isotropic hemispheric view.
 const boxArea=h.enclosure?.grossAreaM2||2*(h.bodyHeightM*h.bodyLengthM+h.bodyWidthM*h.bodyLengthM+h.bodyWidthM*h.bodyHeightM);
 const boxProjection=v=>h.bodyHeightM*h.bodyLengthM*Math.abs(dot(v,rad))+h.bodyWidthM*h.bodyLengthM*Math.abs(dot(v,bodyUp))+h.bodyWidthM*h.bodyHeightM*Math.abs(dot(v,bodyZ));
 const earthFraction=earthDisk*(.5*boxProjection(g.radial)/boxArea+.125),enclosureIRWm2=237*earthFraction,enclosureSolarWm2=1361*(sunlit*boxProjection(g.sunECI)/boxArea+.30*Math.max(0,g.sunRadial)*earthFraction);
 if(fluxOnly)return {enclosureSolarWm2,enclosureIRWm2};
 return {pvDeployment:motion.pv,radiatorDeployment:motion.radiator,deploymentStep:motion.step,deploymentTitle:motion.title,enclosureSolarWm2,enclosureIRWm2,pvNormalECI:pv,radiatorNormalECI:rad,ramBody,ramAreaM2:ramArea,solarIncidenceCos:normalCos,radiatorSunCos:radSunCos,earthView,solarKW,generationKW:solarKW,emissivity:eps,absorptivity:alpha,solarIrradiance:1361*sunlit,albedoIrradiance:albedo,earthIRIrradiance:earthIR,absorbedKW:h.radiatorM2*motion.radiator*(alpha*(1361*sunlit*radSunCos+albedo)+eps*earthIR)/1000,emissionCoeff:h.radiatorM2*2*eps*motion.radiator*SIGMA/1000};
}
export function linkBudget(d,g,pointingDeg,available){
 let mode=String(d.link||'auto').toLowerCase();
 let name=/optic|laser/.test(mode)?'Optical':/sband|s-band|^s$/.test(mode)?'S-band':'Ka';
 if(/auto/.test(mode))name=available>1e4?'Optical':available>1?'Ka':'S-band';
 const active=!!g.station, range=Math.max(1,g.rangeKm)*1000,atmos=2/Math.max(.20,Math.sin(g.elevationDeg*DEG));
 let line,gain=0,margin=0,width=0,draw=0,bandwidth,required=5,rxPowerDbm=0;
 if(name==='Optical'){
  const divergence=1.22*1.55e-6/(d.opticalApertureM||.1),jitter=(d.opticalJitterUrad??1.5)*1e-6,diam=.5,loss=10**(-(atmos+4)/10)*Math.exp(-2*(jitter/divergence)**2),receivedW=(d.opticalTxW??1)*Math.min(1,(diam/(2*range*divergence))**2)*loss;
  rxPowerDbm=10*Math.log10(Math.max(1e-30,receivedW)*1000);bandwidth=2e9;line=Math.min(bandwidth,receivedW/(6.62607015e-34*299792458/1.55e-6)/100);margin=10*Math.log10(Math.max(1e-12,line)/1e9);width=2*divergence/DEG;draw=.24;
 }else{
  const ka=name==='Ka',freq=ka?26e9:2.2e9,lambda=299792458/freq,dish=d.kaDishM||.60,db=x=>10*Math.log10(x),fspl=20*Math.log10(4*Math.PI*range/lambda);bandwidth=ka?250e6:2e6;gain=ka?db(.60*(Math.PI*dish/lambda)**2):5;width=ka?70*lambda/dish:80;
  const pointLoss=12*(pointingDeg/width)**2,tx=ka?20:2,gt=ka?35:12,cn0=db(tx)+gain+gt-fspl-atmos-pointLoss-2+228.6;
  line=Math.min(bandwidth*2,10**((cn0-required)/10));margin=cn0-10*Math.log10(bandwidth*2)-required;draw=ka?.205:.035;
 }
 const freqUp=2.05e9,lossUp=20*Math.log10(4*Math.PI*range*freqUp/299792458),upCNo=47+5-10*Math.log10(500)-lossUp-3+228.6;
 const uplinkRate=Math.min(2e6,10**((upCNo-5)/10))/1e6;
 return {groundLink:active?name:null,contact:active,lineMbps:active?line/1e6:0,uplinkMbps:active?uplinkRate:0,linkMarginDb:active?margin:0,antennaGainDbi:gain,beamwidthDeg:width,footprintKm:active?2*g.rangeKm*Math.tan(width*DEG/2):0,bandwidthMHz:bandwidth/1e6,rxPowerDbm,acquisitionSec:name==='Optical'?35:name==='Ka'?20:5,terminalKW:active?draw:.015};
}
