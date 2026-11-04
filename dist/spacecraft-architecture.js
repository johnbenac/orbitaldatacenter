// Body X across the wings, +Y above the propulsion deck, +Z along the spine.
// Distances are metres, mass kg, vessel volume L. Pressures below are absolute.
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
 const sep=r[0]+r[1]+2*r[2]+2*gap,zFuel=-oxidizerKg/d.propellantKg*sep;
 const z=[zFuel,zFuel+sep,zFuel+r[0]+r[2]+gap];
 const tanks=['fuel','oxidizer','helium'].map((id,i)=>({id,x:0,y:0,z:z[i],radiusM:r[i],volumeL:tankVolumes[i],shellKg:shells[i]}));
 const headKg=2*4.30*(d.thrustN/850)**.65,feedAssembly=7.5+.016*d.thrustN;
 return {fuelKg,oxidizerKg,tankVolumeL,liquidL,heliumL,bottlePa,feedPa,endPa,temperatureK,
  pressurantKg:gasKg(bottlePa,heliumL)+gasKg(feedPa,tankVolumeL-liquidL[0]-liquidL[1]),
  tanks,maxRadiusM:Math.max(...r),tankHalfLengthM:Math.max(...r.map((v,i)=>v+Math.abs(z[i]))),
  massKg:{engineHeads:headKg,feedAssembly,fuelShell:shells[0],oxidizerShell:shells[1],heliumShell:shells[2]},
  engineRangeOK:d.engine==='mmh'&&d.thrustN/2>=340&&d.thrustN/2<=440&&d.mixtureRatio>=1.5&&d.mixtureRatio<=1.8,
  plumeHalfAngleDeg:coneDeg,installationAllowanceDeg:installationDeg};
}

export function installPropulsion(p,d,g,ledger){
 const {bodyWidthM:w,bodyHeightM:h,bodyLengthM:l}=g,wall=.024*Math.min(w,h,l);
 const floor=-h/2+wall+gap,top=floor+2*p.maxRadiusM+gap;
 p.bayTopY=top;
 // Allocate dry mass to stations corresponding to the rendered enclosure. Paired deployed
 // wings/banks and their hinges share the bus longitudinal midpoint. Roll-up margin
 // is distributed proportionally across physical dry mass rather than counted as hardware.
 const upper=y=>(top+h/2)/2+y*(h/2-top);
 const stations={compute:[0,upper(0),0],host:[0,upper(0),0],switch:[-.313*w,upper(.05),-.401*l],storage:[.10*w,upper(-.025),-.407*l],battery:[0,upper(-.06),.408*l],terminals:[-.16*w,.52*h,-.12*l],coolant:[0,upper(-.12),0],cmg:[0,upper(.32),0],radiator:[0,-.225*h,0],array:[0,.01*h,0],hinges:[0,0,0]};
 const inert=ledger.filter(row=>row.group==='Hardware'&&!['tanks','engine'].includes(row.id));
 const total=inert.reduce((n,row)=>n+row.kg,0);
 const dryCenter=[0,0,0].map((_,i)=>inert.reduce((n,row)=>n+row.kg*(stations[row.id]?.[i]||0),0)/total);
 // Center the liquid combination about the deployed platform's transverse CM, provided
 // wall clearance permits. Opposed stations track mixture mass, not equal liquid volume.
 const lengthRoom=Math.max(0,l/2-wall-gap-p.tankHalfLengthM),widthRoom=Math.max(0,w/2-wall-gap-p.maxRadiusM);
 const dx=Math.max(-widthRoom,Math.min(widthRoom,dryCenter[0])),dz=Math.max(-lengthRoom,Math.min(lengthRoom,dryCenter[2]));
 for(const t of p.tanks){t.x=dx;t.y=floor+t.radiusM;t.z+=dz;}
 const coeff=1+d.structureMargin;
 const dryMass=ledger.filter(row=>row.group==='Hardware'||row.group==='Margin').reduce((n,row)=>n+row.kg,0);
 const dryMoment=dryCenter.map(n=>n*total*coeff);
 const add=(mass,xyz)=>xyz.forEach((v,i)=>dryMoment[i]+=mass*coeff*v);
 for(const t of p.tanks)add(t.shellKg,[t.x,t.y,t.z]);
 // Place both engine stations around the initial wet transverse centroid of everything
 // other than the two heads and their feed assembly. This is a build-time alignment.
 const gas=gasDistribution(p,d.propellantKg);
 const initialMass=p.tanks.map((t,i)=>gas[i]+[p.fuelKg,p.oxidizerKg,0][i]);
 const exclude=dryMass-(p.massKg.engineHeads+p.massKg.feedAssembly)*coeff+d.propellantKg+p.pressurantKg;
 const center=[0,2].map((k,j)=>(dryMoment[k]+p.tanks.reduce((v,t,i)=>v+initialMass[i]*[t.x,t.z][j],0))/exclude);
 const nozzleR=.146*Math.sqrt(d.thrustN/850),bellHeight=.38*Math.sqrt(d.thrustN/850);
 const spacing=Math.max(nozzleR*1.35,.20*w),throatY=-h/2-.03;
 p.engines=[-1,1].map(sign=>({x:center[0]+sign*spacing,y:throatY-bellHeight,z:center[1],exitRadiusM:nozzleR,throatY}));
 add(p.massKg.engineHeads,[center[0],throatY-bellHeight*.4,center[1]]);
 add(p.massKg.feedAssembly,[center[0],floor,center[1]]);
 Object.assign(p,{dryMoment,dryMass,tankMarginM:Math.min(...p.tanks.flatMap(t=>[w/2-wall-Math.abs(t.x)-t.radiusM,l/2-wall-Math.abs(t.z)-t.radiusM,t.y-t.radiusM+h/2-wall,top-t.y-t.radiusM])),
  engineMountMarginM:Math.min(...p.engines.flatMap(e=>[w/2-Math.abs(e.x)-e.exitRadiusM,l/2-Math.abs(e.z)-e.exitRadiusM])),
  pvMass:ledger.find(r=>r.id==='array').kg*coeff,radMass:ledger.find(r=>r.id==='radiator').kg*coeff});
 return p;
}

function gasDistribution(p,propKg){
 const left=Math.min(1,Math.max(0,propKg/(p.fuelKg+p.oxidizerKg)));
 const mass=[0,1].map(i=>p.feedPa*(p.tanks[i].volumeL-left*p.liquidL[i])*.001/(gasR*p.temperatureK));
 return [...mass,p.pressurantKg-mass[0]-mass[1]];
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
   const dy=c[1]-b[1]-e.y;
   const dx=Math.max(0,Math.abs(c[0]-e.x)-b[0]),dz=Math.max(0,Math.abs(c[2]-e.z)-b[2]);
   const margin=Math.max(dy,(Math.hypot(dx,dz)-e.exitRadiusM)*Math.cos(angle)+dy*Math.sin(angle));
   if(d.type==='pv')wingMarginM=Math.min(wingMarginM,margin);
   else radiatorMarginM=Math.min(radiatorMarginM,margin);
  }
 }
 const values={radiatorMarginM,wingMarginM,plumeMarginM:Math.min(radiatorMarginM,wingMarginM),cassetteCenterM:g.center};
 reviewCache.set(h,values);return values;
}

export function propulsionReview(h,remainingKg=h.propellantKg){
 const p=h.propulsion,surfaces=reviewCache.get(h)||surfaceReview(h),kg=Math.max(0,Math.min(h.propellantKg,remainingKg)),gas=gasDistribution(p,kg);
 const masses=[kg/(1+h.input.mixtureRatio),kg*h.input.mixtureRatio/(1+h.input.mixtureRatio),0].map((m,i)=>m+gas[i]);
 const mass=p.dryMass+p.pressurantKg+kg,cm=p.dryMoment.map((n,i)=>(n+p.tanks.reduce((total,t,j)=>total+masses[j]*[t.x,t.y,t.z][i],0))/mass);
 const e=[(p.engines[0].x+p.engines[1].x)/2,p.engines[0].throatY,p.engines[0].z];
 const missM=Math.hypot(cm[0]-e[0],cm[2]-e[2]),lever=Math.max(.001,cm[1]-e[1]),alignmentDeg=Math.atan2(missM,lever)/rad;
 const stowedCM=[cm[0],cm[1]+((-.24-.01*h.bodyHeightM)*p.pvMass+(.30+.225*h.bodyHeightM)*p.radMass)/mass,cm[2]+(p.pvMass+p.radMass)*surfaces.cassetteCenterM/mass];
 const torqueNm=missM*h.input.thrustN,alignmentLimitDeg=installationDeg;
 return {...surfaces,cm,stowedCM,missM,torqueNm,axis:[0,1,0],alignmentDeg,alignmentLimitDeg,
  engineRangeOK:p.engineRangeOK,tankMarginM:p.tankMarginM,plumeHalfAngleDeg:coneDeg,engineMountMarginM:p.engineMountMarginM,
  bottlePressureMPa:gas[2]*gasR*p.temperatureK/(p.heliumL*.001)*1e-6,
  clear:p.tankMarginM>=0&&p.engineMountMarginM>=0&&surfaces.plumeMarginM>0&&alignmentDeg<=alignmentLimitDeg&&torqueNm<=h.input.cmgTorqueNm};
}
