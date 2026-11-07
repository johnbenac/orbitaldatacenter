// Surface energy follows the same articulated panels as rendering and mass properties.
import {deploymentLayout,leafPose,leafAxes,deploymentSchedule} from './deployment.js';
import {energySolarDelivery} from './energy-system.js';
import {ramSilhouette} from './silhouette.js';
import {dot,unit,R} from './orbit.js';
const clip=(v,a,b)=>Math.max(a,Math.min(b,v)),SIGMA=5.670374419e-8;
const add=(a,b,k=1)=>a.map((v,i)=>v+k*b[i]);
function blockedByBody(p,dir,h){
 const half=[h.bodyWidthM/2,h.bodyHeightM/2,h.bodyLengthM/2];let lo=1e-5,hi=Infinity;
 for(let k=0;k<3;k++){
  if(Math.abs(dir[k])<1e-10){if(Math.abs(p[k])>half[k])return false;continue;}
  const a=(-half[k]-p[k])/dir[k],b=(half[k]-p[k])/dir[k];lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return false;
 }
 return hi>lo;
}
function illuminatedFraction(panel,panels,sun,h){
 if(panel.area<=1e-10)return 0;
 let visible=0;
 for(const [u,v] of [[0,0],[-.3,-.3],[-.3,.3],[.3,-.3],[.3,.3]]){
  let p=add(add(panel.center,panel.axes[0],u*panel.width),panel.axes[2],v*panel.depth);p=add(p,sun,1e-4);
  let blocked=blockedByBody(p,sun,h);
  if(!blocked)for(const q of panels){
   if(q===panel||q.area<1e-10)continue;
   const den=dot(sun,q.axes[1]);if(Math.abs(den)<1e-8)continue;
   const t=dot(q.center.map((x,k)=>x-p[k]),q.axes[1])/den;if(t<=1e-4)continue;
   const at=add(p,sun,t).map((x,k)=>x-q.center[k]);
   if(Math.abs(dot(at,q.axes[0]))<q.width/2-1e-5&&Math.abs(dot(at,q.axes[2]))<q.depth/2-1e-5){blocked=true;break;}
  }
  if(!blocked)visible++;
 }
 return visible/5;
}
export function resolvedSurfaces(h,g,deployment,fluxOnly,burnDirection,att,earthDiskView){
 const d=h.input,layout=deploymentLayout(h),motion=deploymentSchedule(deployment,h),basis=[att.bodyXECI,att.bodyUpECI,att.bodyZECI];
 const toBody=v=>basis.map(a=>dot(v,a)),toECI=v=>basis[0].map((_,k)=>basis.reduce((s,a,i)=>s+a[k]*v[i],0));
 const sun=toBody(g.sunECI),earth=toBody(g.radial),sunlit=g.eclipse?0:1,external=g.carrierAttached?0:1,sinRadius=clip(R/(R+g.altitudeKm),0,1);
 const eps=d.emissivity*d.emissivityRetention**g.windowAgeYears,alpha=clip(d.absorptivity+d.alphaGrowth*g.windowAgeYears,0,1),albedoScale=1361*.30*Math.max(0,g.sunRadial);
 const panels=layout.descriptors.map(desc=>{const p=leafPose(layout,desc,deployment,d.solarTiltDeg,att),axes=leafAxes(p),width=p.width??desc.width,depth=p.depth??desc.depth;return {desc,p,axes,center:[p.x,p.y,p.z],width,depth,area:Math.max(0,width*depth)};});
 let solarArea=0,solarProjected=0,radArea=0,radSun=0,radEarth=0,radExposed=0,radCoupled=0,absorbed=0;
 const banks=[{area:0,exposed:0,coupled:0,absorbed:0,sun:0,earth:0,normal:[0,0,0]},{area:0,exposed:0,coupled:0,absorbed:0,sun:0,earth:0,normal:[0,0,0]}];
 const samples=[];
 for(const p of panels){
  const n=p.axes[1],sunCos=dot(n,sun),shadow=external*illuminatedFraction(p,panels,sun,h);
  if(p.desc.type==='pv'){
   solarArea+=p.area;solarProjected+=p.area*Math.max(0,sunCos)*shadow;
   samples.push({id:p.desc.id??`pv-${p.desc.side}-${p.desc.end}`,kind:'solar',areaM2:p.area,normalBody:n,illuminationFraction:shadow,solarCos:Math.max(0,sunCos)});continue;
  }
  const index=p.desc.end>0?1:0,b=banks[index],count=Math.max(1,layout.descriptors.filter(q=>q.type==='rad'&&q.end===p.desc.end).length);
  const root=index?motion.lowerRoot:motion.upperRoot,unfold=index?motion.lowerTip:motion.upperTip;
  const exposure=external*(1/(2*count)+root/(2*count)+(1-1/count)*unfold);
  const flow=h.thermalTopology==='passive-local'||h.input.architectureFamily==='redwire-platform'?1:(index?motion.lowerFlow:motion.upperFlow);
  const ev=earthDiskView(dot(n,earth),sinRadius),sc=Math.abs(sunCos)*shadow,exposed=p.area*exposure;
  const kw=exposed*(alpha*(1361*sunlit*sc+albedoScale*ev)+eps*237*ev)/1000;
  b.area+=p.area;b.exposed+=exposed;b.coupled+=p.area*flow;b.absorbed+=kw;b.sun+=exposed*sc;b.earth+=exposed*ev;
  for(let k=0;k<3;k++)b.normal[k]+=n[k]*p.area;
  radArea+=p.area;radExposed+=exposed;radCoupled+=p.area*flow;radSun+=exposed*sc;radEarth+=exposed*ev;absorbed+=kw;
  samples.push({id:p.desc.id??`rad-${p.desc.end}-${p.desc.j}`,kind:'radiator',areaM2:p.area,normalBody:n,illuminationFraction:shadow,solarCos:Math.abs(sunCos),exposureFraction:exposure});
 }
 const weighted=(n,area)=>area>0?n/area:0,cos=weighted(solarProjected,solarArea),radSunCos=weighted(radSun,radExposed),earthView=weighted(radEarth,radExposed);
 const view=n=>earthDiskView(dot(n,earth),sinRadius),boxArea=h.enclosure?.grossAreaM2||2*(h.bodyHeightM*h.bodyLengthM+h.bodyWidthM*h.bodyLengthM+h.bodyWidthM*h.bodyHeightM);
 const boxProjection=v=>h.bodyHeightM*h.bodyLengthM*Math.abs(v[0])+h.bodyWidthM*h.bodyLengthM*Math.abs(v[1])+h.bodyWidthM*h.bodyHeightM*Math.abs(v[2]);
 const earthFraction=(h.bodyHeightM*h.bodyLengthM*view([1,0,0])+h.bodyWidthM*h.bodyLengthM*view([0,1,0])+h.bodyWidthM*h.bodyHeightM*view([0,0,1]))/boxArea;
 const enclosureIRWm2=237*earthFraction,enclosureSolarWm2=1361*(sunlit*boxProjection(sun)/boxArea+.30*Math.max(0,g.sunRadial)*earthFraction);
 if(fluxOnly)return {enclosureSolarWm2,enclosureIRWm2,solarIncidenceCos:cos,radiatorSunCos:radSunCos};
 const solarArrayInputKW=1.361*solarProjected*sunlit*d.pvEfficiency*d.solarDelivery*d.pvRetention**g.windowAgeYears,source=energySolarDelivery(h,solarArrayInputKW);
 const ram=unit([g.velocityECI[0]+.00007292115*g.positionECI[1],g.velocityECI[1]-.00007292115*g.positionECI[0],g.velocityECI[2]]),ramBody=toBody(ram);
 const normal=b=>b.area?toECI(unit(b.normal)):[0,0,0];
 return {...att,bodyXECI:basis[0],bodyUpECI:basis[1],bodyZECI:basis[2],burnDirection,solarDeployedM2:solarArea,radiatorCoupledM2:radCoupled,radiatorExposedM2:radExposed,
  upperRadiatorAreaM2:banks[0].area,lowerRadiatorAreaM2:banks[1].area,radiatorBankAreaFractions:banks.map(b=>weighted(b.area,radArea)),
  upperExposureFraction:weighted(banks[0].exposed,banks[0].area),lowerExposureFraction:weighted(banks[1].exposed,banks[1].area),
  upperEarthView:weighted(banks[0].earth,banks[0].exposed),lowerEarthView:weighted(banks[1].earth,banks[1].exposed),spaceViewFactor:1-earthView*.5,
  upperRadiatorNormalECI:normal(banks[0]),lowerRadiatorNormalECI:normal(banks[1]),radiatorNormalECI:normal(banks[0]),
  upperRadiatorFlow:weighted(banks[0].coupled,banks[0].area),lowerRadiatorFlow:weighted(banks[1].coupled,banks[1].area),upperAbsorbedKW:banks[0].absorbed,lowerAbsorbedKW:banks[1].absorbed,
  upperEmissionCoeff:banks[0].exposed*2*eps*SIGMA/1000,lowerEmissionCoeff:banks[1].exposed*2*eps*SIGMA/1000,
  pvDeployment:motion.pv,radiatorDeployment:weighted(radCoupled,radArea),deploymentStep:motion.step,deploymentTitle:motion.title,enclosureSolarWm2,enclosureIRWm2,
  pvNormalECI:toECI(panels.find(p=>p.desc.type==='pv')?.axes[1]||[0,1,0]),ramBody,ramAreaM2:ramSilhouette(h,ramBody,deployment,att),solarIncidenceCos:cos,radiatorSunCos:radSunCos,earthView,
  solarKW:source.busKW,solarArrayInputKW,solarConversionLossKW:source.mpptLossKW,solarHarnessLossKW:source.arrayHarnessLossKW,solarHardwareCurtailedKW:source.curtailedKW,generationKW:source.busKW,emissivity:eps,absorptivity:alpha,
  solarIrradiance:1361*sunlit,albedoIrradiance:albedoScale*earthView,earthIRIrradiance:237*earthView,absorbedKW:absorbed,emissionCoeff:radExposed*2*eps*SIGMA/1000,
  radiatorDirectSolarKW:radExposed*alpha*1.361*sunlit*radSunCos,radiatorAlbedoKW:radExposed*alpha*albedoScale*earthView/1000,radiatorEarthIRKW:radExposed*eps*237*earthView/1000,
  surfaceSamples:samples,radiatorExposureBasis:'Actual family panel normals and areas. Five-point direct-Sun body/panel occlusion screen; folded emission is a bounded exposure allocation. Earth-disk loading omits detailed mutual view factors.'};
}
