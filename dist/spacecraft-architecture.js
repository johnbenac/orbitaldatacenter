// Body X spans the wings. +Z is launch-up. The −Z thrust deck faces the adapter.
// Distances are metres, mass kg, vessel volume L. Pressures below are absolute.
import {componentMassProperties,heliumDistribution,componentCentroid} from './component-stations.js';
import {deploymentLayout,leafPose,leafAxes} from './deployment.js';
const gasR=2077.1,temperatureK=293.15,bottlePa=30e6,feedPa=1.65e6,endPa=2e6;
const radius=litres=>Math.cbrt(.001*litres*3/(4*Math.PI));
const gap=.06,coneDeg=30,installationDeg=1,rad=Math.PI/180;

export const propulsionSources=[
 ['ESA · ATV service module','https://www.esa.int/content/view/full/194403','Flight reference for separate internal titanium propellant tanks, high-pressure helium and multiple pressure-fed reboost engines. ATV used eight liquid tanks, two helium bottles and four main engines.'],
 ['NASA · Apollo service propulsion system','https://ntrs.nasa.gov/api/citations/19740005081/downloads/19740005081.pdf','Flight system schematic and documented helium isolation, pressure regulation, separate propellant circuits, check valves and engine metering. Aerozine-50/NTO chemistry precedent.'],
 ['ArianeGroup · S400-15','https://www.space-propulsion.com/spacecraft-propulsion/apogee-motors/','MMH/MON apogee engine. Manufacturer lists 425 N nominal, 340–440 N range, 321 s nominal, 4.30 kg including valve and a 292 mm nozzle exit.'],
 ['ESA · ATV-3 flight facts','https://wsn.spaceflight.esa.int/docs/Factsheets/23%20ATV-3%20EA%20HR%20web.pdf','ATV-3 helium storage at 31 MPa anchors the 30 MPa screening assumption.'],
];
export function sizePropulsion(d){
 const fuelKg=d.propellantKg/(1+d.mixtureRatio),oxidizerKg=d.propellantKg-fuelKg;
 const liquidL=[fuelKg/d.fuelDensity,oxidizerKg/d.oxidizerDensity];
 const volumes=liquidL.map(l=>l/d.tankFill),tankVolumeL=volumes[0]+volumes[1];
 // Isothermal, ideal gas. Size for full liquid displacement, including trapped reserve.
 // P_b,i V_b − P_b,end V_b = P_reg times liquid displacement.
 const heliumL=(liquidL[0]+liquidL[1])*feedPa/(bottlePa-endPa);
 const gasKg=(p,l)=>p*(l/1000)/(gasR*temperatureK);
 const shellBudget=12+.085*d.propellantKg;
 const tankVolumes=[...volumes,heliumL],r=tankVolumes.map(l=>radius(l)*1.018+.008);
 const weights=tankVolumes.map((v,i)=>v*(i===2?bottlePa:feedPa)),wSum=weights.reduce((a,b)=>a+b,0);
 const shells=weights.map(v=>shellBudget*v/wSum);
 // Parallel liquid vessels straddle the thrust axis. Helium nests in the
 // triangular interstice above them. The two liquid centers share one axial station.
 const sep=r[0]+r[1]+gap,dx=[-oxidizerKg/d.propellantKg*sep,fuelKg/d.propellantKg*sep];
 const xHe=(dx[0]+dx[1])*.5,yHe=Math.sqrt(Math.max(0,(Math.max(r[0],r[1])+r[2]+gap)**2-(sep/2)**2));
 const tanks=['fuel','oxidizer','helium'].map((id,i)=>({id,x:i<2?dx[i]:xHe,y:i<2?0:yHe,z:0,radiusM:r[i],volumeL:tankVolumes[i],shellKg:shells[i]}));
 const headKg=2*4.30*(d.thrustN/850)**.65,feedAssembly=7.5+.016*d.thrustN;
 return {fuelKg,oxidizerKg,tankVolumeL,liquidL,heliumL,bottlePa,feedPa,endPa,temperatureK,
  pressurantKg:gasKg(bottlePa,heliumL)+gasKg(feedPa,tankVolumeL-liquidL[0]-liquidL[1]),
  tanks,maxRadiusM:Math.max(...r),packHalfWidth:Math.max(...tanks.map(t=>Math.abs(t.x)+t.radiusM)),packHalfHeight:Math.max(...tanks.map(t=>Math.abs(t.y)+t.radiusM)),
  massKg:{engineHeads:headKg,feedAssembly,fuelShell:shells[0],oxidizerShell:shells[1],heliumShell:shells[2]},
  engineRangeOK:d.engine==='mmh'&&d.thrustN/2>=340&&d.thrustN/2<=440&&d.mixtureRatio>=1.5&&d.mixtureRatio<=1.8,
  plumeHalfAngleDeg:coneDeg,installationAllowanceDeg:installationDeg};
}

export function installPropulsion(p,d,g,ledger){
 const {bodyWidthM:w,bodyHeightM:h,bodyLengthM:l}=g,wall=.024*Math.min(w,h,l);
 const aft=-l/2+wall+gap,face=aft+2*p.maxRadiusM+gap;
 p.forwardDeckZ=face;
 for(const t of p.tanks)t.z=aft+p.maxRadiusM;
 const cmgDims=g.cmg?.mechanismDimsM||[.55,.50,.57],gyZ=cmgDims[2];
 const end=l/2-wall-gyZ-.06,free=end-face;
 p.equipmentLengthM=free;p.equipmentCenterZ=(end+face)/2;
 const z=q=>p.equipmentCenterZ+q*free;
 const racks=[[-w*.225,0,z(0)],[w*.225,0,z(0)]],gyros=[-1,1].flatMap(a=>[-1,1].map(b=>[a*(cmgDims[0]/2+.015),b*(cmgDims[1]/2+.015),l*.5-wall-gyZ*.5-.025]));
 p.stations={'01.01':racks,'01.02':racks,compute:[0,0,z(0)],host:[0,0,z(0)],switch:[-.313*w,h*.05,z(-.401)],storage:[.10*w,-h*.025,z(-.407)],'02.02':[0,1,2,3].map(i=>[(i-1.5)*.20*w,-h*.06,z(.408)]),terminals:[0,h*.50,0],'05.01':[[-w*.49,h*.26,l*.30],[w*.49,h*.26,l*.30]],'05.02':[w*.16,h*.52,-l*.35],'05.03':[-w*.20,h*.52,l*.35],coolant:[0,0,z(0)],'04.01':gyros,cmg:[0,0,gyros[0][2]],'06.02':[0,0,aft],hinges:[0,0,0]};
 p.installDims={'04.01':cmgDims,'01.03':[.55*w,.66*h,.137*free],'08.01':[.20*w,.37*h,.13*free]};
 const nozzleR=.146*Math.sqrt(d.thrustN/850),length=.38*Math.sqrt(d.thrustN/850),spacing=Math.max(nozzleR*1.35,.20*w),throatZ=-l*.5-.035;
 p.engines=[-1,1].map(sign=>({x:sign*spacing,y:0,z:throatZ-length,exitRadiusM:nozzleR,throatZ}));
 const h0={...g,input:d,propulsion:p,massLedger:ledger,propellantKg:d.propellantKg};
 // Align the installed liquid pair to the nonconsumable transverse mass center.
 // Equalizing the full/empty lateral centers also limits the moment throughout depletion.
 for(let i=0;i<5;i++){
  const wet=componentMassProperties(h0,d.propellantKg,1,false,false),dry=componentMassProperties(h0,0,1,false,false);
  for(const key of ['x','y']){
   const k=key==='x'?0:1,rim=(k?h:w)*.5-wall-gap;
   const requested=(dry.cm[k]-wet.cm[k])*wet.massKg/d.propellantKg;
   const lo=Math.max(...p.tanks.map(t=>-rim+t.radiusM-t[key])),hi=Math.min(...p.tanks.map(t=>rim-t.radiusM-t[key]));
   const delta=Math.min(hi,Math.max(lo,requested));for(const t of p.tanks)t[key]+=delta;
   const mid=(p.engines[0][key]+p.engines[1][key])/2;for(const e of p.engines)e[key]+=wet.cm[k]-mid;
  }
 }
 p.tankMarginM=Math.min(...p.tanks.flatMap(t=>[w/2-wall-Math.abs(t.x)-t.radiusM,h/2-wall-Math.abs(t.y)-t.radiusM,t.z-t.radiusM+l/2-wall,face-t.z-t.radiusM]));
 p.engineMountMarginM=Math.min(...p.engines.flatMap(e=>[w/2-Math.abs(e.x)-e.exitRadiusM,h/2-Math.abs(e.y)-e.exitRadiusM]));
 return p;
}

const reviewCache=new WeakMap();
function surfaceReview(h){
 const g=deploymentLayout(h),p=h.propulsion,angle=(coneDeg+installationDeg)*rad;
 let radiatorMarginM=Infinity,wingMarginM=Infinity;
 // Conservative separation from an infinite conical frustum. The AABB encloses
 // the exact oriented rigid leaf incl thickness. Upstream distance or the closest
 // footprint relative to the widest cone slice furnishes a separation lower bound.
 for(const d of g.descriptors){
  const pos=leafPose(g,d,1,h.input.solarTiltDeg),axes=leafAxes(pos),extent=[d.width,d.thickness,d.depth];
  const b=[0,1,2].map(k=>axes.reduce((sum,a,i)=>sum+Math.abs(a[k])*extent[i]/2,0));
  const c=[pos.x,pos.y,pos.z].map((v,k)=>v+d.normalOffset*axes[1][k]);
  for(const e of p.engines){
   const axial=c[2]-b[2]-e.z;
   const dx=Math.max(0,Math.abs(c[0]-e.x)-b[0]),dy=Math.max(0,Math.abs(c[1]-e.y)-b[1]);
   const margin=Math.max(axial,(Math.hypot(dx,dy)-e.exitRadiusM)*Math.cos(angle)+axial*Math.sin(angle));
   if(d.type==='pv')wingMarginM=Math.min(wingMarginM,margin);
   else radiatorMarginM=Math.min(radiatorMarginM,margin);
  }
 }
 const values={radiatorMarginM,wingMarginM,plumeMarginM:Math.min(radiatorMarginM,wingMarginM),cassetteCenterM:g.center};
 reviewCache.set(h,values);return values;
}

export function propulsionReview(h,remainingKg=h.propellantKg){
 const p=h.propulsion,surfaces=reviewCache.get(h)||surfaceReview(h),kg=Math.max(0,Math.min(h.propellantKg,remainingKg)),gas=heliumDistribution(p,kg);
 const cm=componentCentroid(h,kg,1);
 const e=[(p.engines[0].x+p.engines[1].x)/2,(p.engines[0].y+p.engines[1].y)/2,p.engines[0].throatZ];
 const missM=Math.hypot(cm[0]-e[0],cm[1]-e[1]),lever=Math.max(.001,cm[2]-e[2]),alignmentDeg=Math.atan2(missM,lever)/rad;
 const stowedCM=componentCentroid(h,kg,0);
 const torqueNm=missM*h.input.thrustN,alignmentLimitDeg=installationDeg;
 return {...surfaces,cm,stowedCM,missM,torqueNm,axis:[0,0,1],alignmentDeg,alignmentLimitDeg,
  engineRangeOK:p.engineRangeOK,tankMarginM:p.tankMarginM,plumeHalfAngleDeg:coneDeg,engineMountMarginM:p.engineMountMarginM,
  bottlePressureMPa:gas[2]*gasR*p.temperatureK/(p.heliumL*.001)*1e-6,
  clear:p.tankMarginM>=0&&p.engineMountMarginM>=0&&surfaces.plumeMarginM>0&&alignmentDeg<=alignmentLimitDeg&&torqueNm<=h.input.cmgTorqueNm};
}
