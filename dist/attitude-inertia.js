// Composite-body inertia about the instantaneous vehicle center of mass.
// Matrices are symmetric, row-major, in kg m². Off-diagonal entries are
// -integral(x y dm), -integral(x z dm), and -integral(y z dm).
import {componentMassProperties,equipmentAllocations,terminalMassElements,mechanismStations} from './component-stations.js';
import {equipmentResources} from './equipment-resources.js';
import {deploymentLayout,mechanismPose,leafPose,leafAxes} from './deployment.js';

export const inertiaReferences=[
 {name:'NASA NESC · mass properties and rotational dynamics',url:'https://ntrs.nasa.gov/api/citations/20220013375/downloads/20220013375.pdf',note:'Sections 3.3–3.5 describe component moments and products, the parallel-axis theorem and Euler equations. Section 8.9 uses a centered wall-wetting liquid-shell approximation.'},
 {name:'NASA · composite inertia and center of gravity',url:'https://ntrs.nasa.gov/citations/19700000152',note:'Calculate component tensors in their own axes, transform to common axes, and combine their mass properties.'},
 {name:'MIT · the three-dimensional inertia tensor',url:'https://ocw.mit.edu/courses/16-07-dynamics-fall-2009/resources/mit16_07f09_lec26/',note:'Angular momentum, principal moments and principal axes for rigid-body dynamics.'}
];

const BODY_AXES=[[1,0,0],[0,1,0],[0,0,1]];
const zero=()=>Array(9).fill(0);
const diagonal=a=>[a[0],a[4],a[8]];
const difference=(a,b)=>a.map((v,i)=>v-b[i]);
const sumInto=(target,source,scale=1)=>{for(let i=0;i<9;i++)target[i]+=source[i]*scale;};

export function tensorVector(a,v){
 return [a[0]*v[0]+a[1]*v[1]+a[2]*v[2],a[3]*v[0]+a[4]*v[1]+a[5]*v[2],a[6]*v[0]+a[7]*v[1]+a[8]*v[2]];
}
export function inverseTensor(a){
 const scale=Math.max(...a.map(Math.abs));
 if(!(scale>0))throw Error('A positive inertia tensor is required');
 const [x,b,c,,y,e,,,z]=a.map(v=>v/scale);
 const xx=y*z-e*e,xy=c*e-b*z,xz=b*e-c*y,yy=x*z-c*c,yz=b*c-x*e,zz=x*y-b*b;
 const determinant=x*xx+b*xy+c*xz;
 if(!(determinant>1e-18))throw Error('The inertia tensor is singular');
 return [xx,xy,xz,xy,yy,yz,xz,yz,zz].map(v=>v/(determinant*scale));
}
// Closed-form symmetric eigensolution. Scaling avoids overflow in large studies.
export function principalMoments(a){
 const scale=Math.max(...a.map(Math.abs));
 if(scale===0)return [0,0,0];
 const t=a.map(v=>v/scale),mean=(t[0]+t[4]+t[8])/3;
 const spread=Math.sqrt(((t[0]-mean)**2+(t[4]-mean)**2+(t[8]-mean)**2+2*(t[1]**2+t[2]**2+t[5]**2))/6);
 if(spread<1e-15)return [mean*scale,mean*scale,mean*scale];
 const b=t.map((v,i)=>(v-(i%4===0?mean:0))/spread);
 const determinant=b[0]*(b[4]*b[8]-b[5]*b[5])-b[1]*(b[1]*b[8]-b[5]*b[2])+b[2]*(b[1]*b[5]-b[4]*b[2]);
 const phi=Math.acos(Math.max(-1,Math.min(1,determinant/2)))/3;
 const largest=mean+2*spread*Math.cos(phi),smallest=mean+2*spread*Math.cos(phi+2*Math.PI/3);
 return [smallest,3*mean-largest-smallest,largest].map(v=>v*scale);
}
export function parallelAxisTensor(mass,[x,y,z]){
 return [mass*(y*y+z*z),-mass*x*y,-mass*x*z,-mass*x*y,mass*(x*x+z*z),-mass*y*z,-mass*x*z,-mass*y*z,mass*(x*x+y*y)];
}
function orient(principal,axes=BODY_AXES){
 const out=zero();
 for(let k=0;k<3;k++)for(let i=0;i<3;i++)for(let j=0;j<3;j++)out[3*i+j]+=principal[k]*axes[k][i]*axes[k][j];
 return out;
}
export function boxInertia(mass,[x,y,z],axes=BODY_AXES){
 return orient([mass*(y*y+z*z)/12,mass*(x*x+z*z)/12,mass*(x*x+y*y)/12],axes);
}
function sphereInertia(mass,radius,inner=0){
 // The quotient's thin-shell limit is 5 R² / 3.
 const ratio=inner/radius;
 const radial=radius>0?(ratio>.999999?5*radius*radius/3:radius*radius*(1-ratio**5)/(1-ratio**3)):0;
 const value=.4*mass*radial;
 return [value,0,0,0,value,0,0,0,value];
}
function cylinderInertia(mass,radius,length,axes=BODY_AXES,axis=2,inner=0){
 const ring=radius*radius+inner*inner,axial=.5*mass*ring,transverse=mass*(ring/4+length*length/12),moments=Array(3).fill(transverse);
 moments[axis]=axial;return orient(moments,axes);
}
function perimeterInertia(mass,width,height){
 const horizontal=width/(width+height),vertical=1-horizontal;
 const x=mass*height*height*(horizontal/4+vertical/12),y=mass*width*width*(horizontal/12+vertical/4);
 return [x,0,0,0,y,0,0,0,x+y];
}
function envelopeInertia(mass,[width,height,length]){
 const out=zero(),areas=[height*length,width*length,width*height],total=2*areas.reduce((s,n)=>s+n,0);
 for(let axis=0;axis<3;axis++){
  const dims=[width,height,length],offset=[0,0,0],faceMass=mass*areas[axis]/total;
  offset[axis]=dims[axis]/2;dims[axis]=0;
  sumInto(out,boxInertia(faceMass,dims),2);sumInto(out,parallelAxisTensor(faceMass,offset),2);
 }
 return out;
}
function aboutPoint(elements,origin){
 const tensor=zero();
 for(const part of elements){
  sumInto(tensor,part.intrinsicTensorKgM2);
  sumInto(tensor,parallelAxisTensor(part.massKg,difference(part.centroidM,origin)));
 }
 return tensor;
}
function intrinsicElement(id,massKg,centroidM,intrinsicTensorKgM2,axes=BODY_AXES){
 return {id,massKg,centroidM,intrinsicTensorKgM2,axes};
}

const fixedCache=new WeakMap();
function fixedShape(h,row){
 let cache=fixedCache.get(h);if(!cache){cache=new Map();fixedCache.set(h,cache)}
 if(cache.has(row.wbs))return cache.get(row.wbs);
 const {wbs,stationsM,stationShares,centroidM}=row,w=h.bodyWidthM,b=h.bodyHeightM,l=h.bodyLengthM;
 const resource=equipmentResources({wbs,quantity:stationsM.length},h);
 let basis='Uniform envelope from the equipment dimension register at its installed station.',elements;
 if(['03.03','07.02','07.03','07.05'].includes(wbs)){
  basis='Uniform areal mass over the six body faces. The equipment ledger supplies the total mass.';
  elements=[intrinsicElement(wbs,1,centroidM,envelopeInertia(1,[w,b,l]))];
 }else{
  elements=stationsM.map((position,index)=>{
   const mass=stationShares[index];let tensor;
   if(wbs==='07.01'){
    const label=h.enclosure.frameLabels[index];
    if(label.startsWith('Longeron'))tensor=boxInertia(mass,[.035,.035,l]);
    else if(label.startsWith('Transverse')||label.startsWith('End fitting'))tensor=perimeterInertia(mass,w,b);
    else if(label.startsWith('Tray mount'))tensor=boxInertia(mass,[h.rackLayout.slotDimensionsM[0],.015,h.rackLayout.slotDimensionsM[2]]);
    else tensor=boxInertia(mass,[.10,.10,.10]);
   }else if(/^06\.0[345]$/.test(wbs)){
    tensor=sphereInertia(mass,h.propulsion.tanks[Number(wbs.slice(3))-3].radiusM,h.propulsion.tanks[Number(wbs.slice(3))-3].radiusM);
   }else tensor=boxInertia(mass,resource.dimensionsM);
   return intrinsicElement(wbs+'-'+index,mass,position,tensor);
  });
 }
 if(wbs==='07.01')basis='Installed frame mass shares. Longitudinal bars, transverse perimeter frames, small hardpoints and tray-support plates use the common mounting stations.';
 if(/^06\.0[345]$/.test(wbs))basis='Thin spherical shell at the installed outer vessel radius. Mount and pressure-management allowance is distributed over that shell.';
 if(wbs==='01.01'||wbs==='01.02')basis='Uniform tray volumes at every occupied rack slot. Accelerator and host allocations partition the shared tray mass.';
 if(wbs==='04.01')basis='Four uniform mechanism envelopes at their installed mounting stations. Rotor spin momentum is an additional attitude-state variable.';
 const result={specificTensor:aboutPoint(elements,centroidM),basis};cache.set(wbs,result);return result;
}

function movingSurfaces(h,rows,deploy,attitude){
 const g=deploymentLayout(h),pose=mechanismPose(g,deploy,h.input.solarTiltDeg,attitude),solar=rows.find(r=>r.wbs==='02.01'),radiator=rows.find(r=>r.wbs==='03.01'),elements=[];
 for(const [i,wing] of pose.wings.entries()){
  const mass=solar.predictedKg*solar.stationShares[i],fraction=wing.span/(wing.span+wing.rolledLength),axes=wing.axes||leafAxes({pitch:wing.pitch});
  const flat=wing.root.map((v,k)=>(v+wing.tip[k])/2),rolled=wing.tip.map((v,k)=>v+wing.rollRadius*axes[1][k]);
  const prefix='wing-'+wing.side+'-'+wing.end;
  elements.push({...intrinsicElement(prefix+'-sheet',mass*fraction,flat,boxInertia(mass*fraction,[wing.span,g.blanketGaugeM,g.ww],axes),axes),wbs:'02.01',kind:'solarSheet'});
  elements.push({...intrinsicElement(prefix+'-roll',mass*(1-fraction),rolled,cylinderInertia(mass*(1-fraction),wing.rollRadius,g.ww,axes,2,g.coreRadiusM),axes),wbs:'02.01',kind:'solarRoll',symmetryAxis:2,spinAngleRad:wing.rollAngle});
 }
 for(const d of g.descriptors.filter(d=>d.type==='rad')){
  const p=leafPose(g,d,deploy,h.input.solarTiltDeg,attitude),axes=leafAxes(p),mass=radiator.predictedKg*(d.width*d.depth)/g.descriptors.filter(q=>q.type==='rad').reduce((a,q)=>a+q.width*q.depth,0);
  elements.push({...intrinsicElement('radiator-'+d.end+'-'+d.j,mass,[p.x,p.y,p.z],boxInertia(mass,[d.width,d.thickness,d.depth],axes),axes),wbs:'03.01',kind:'radiatorLeaf'});
 }
 return elements;
}
function payloadElements(h,rows,deploy,attitude){
 if(h.payloadLocation!=='radiator')return [];
 const g=deploymentLayout(h),d=g.descriptors.find(d=>d.type==='rad'),p=leafPose(g,d,deploy,h.input.solarTiltDeg,attitude),axes=leafAxes(p);
 return rows.filter(r=>['01.01','01.02','03.02','07.03'].includes(r.wbs)).flatMap(row=>row.stationsM.map((center,i)=>{
  const kg=row.predictedKg*row.stationShares[i],moving=i<(row.movingStationCount??h.rackLayout.slots.length),dims=['03.02','07.03'].includes(row.wbs)?(moving?[1,.06,1]:[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM]):h.rackLayout.slotDimensionsM;
  return {...intrinsicElement(row.wbs+'-platform-'+i,kg,center,boxInertia(kg,dims,moving?axes:BODY_AXES),moving?axes:BODY_AXES),wbs:row.wbs,kind:moving?'radiatorPayload':'busHost',moving};
 }));
}
function terminalElements(h,attitude){
 const growth=1+(h.input.structureMargin??0);
 return terminalMassElements(h,attitude).map(part=>{
  const mass=part.massKg*growth;
  return {...part,massKg:mass,intrinsicTensorKgM2:part.moving?cylinderInertia(mass,part.radiusM,part.lengthM,part.axes,1):boxInertia(mass,part.dimensionsM),kind:part.moving?'terminalHead':'terminalBase'};
 });
}
function jointElements(h,rows,deploy,attitude){
 const row=rows.find(r=>r.wbs==='07.04'),stations=mechanismStations(h,deploy,attitude);
 return stations.map((station,i)=>{
  const mass=row.predictedKg*(row.stationShares?.[i]??1/stations.length),center=row.stationsM?.[i]||station.centroidM;
  return {...intrinsicElement(station.id,mass,center,boxInertia(mass,[.16,.16,.20])),wbs:'07.04',kind:'mechanismJoint'};
 });
}
const movingMassCache=new WeakMap();
// Geometry-only path for mechanism angular momentum and rate derivatives.
// Each axes array contains local X/Y/Z unit vectors in the body frame.
// Tip-roll mass moves from the annulus into its blanket during deployment.
export function movingMassElements(h,{deployment=1,attitude=null}={}){
 let rows=movingMassCache.get(h);
 if(!rows){
  const growth=1+(h.input.structureMargin??0);
  const pose=mechanismPose(deploymentLayout(h),1),counts={'02.01':pose.wings.length,'03.01':pose.banks.length,'07.04':mechanismStations(h).length};
  rows=equipmentAllocations(h).filter(r=>Object.hasOwn(counts,r.wbs)).map(r=>({...r,predictedKg:r.kg*growth,stationShares:Array(counts[r.wbs]).fill(1/counts[r.wbs])}));
  movingMassCache.set(h,rows);
 }
 const u=Math.max(0,Math.min(1,deployment)),payload=h.payloadLocation==='radiator'?payloadElements(h,componentMassProperties(h,h.propellantKg,u,false,true,attitude).rows,u,attitude).filter(p=>p.moving):[];
 return [...movingSurfaces(h,rows,u,attitude),...payload,...terminalElements(h,attitude).filter(p=>p.moving),...jointElements(h,rows,u,attitude)];
}
function liquidShape(h,row){
 const tank=h.propulsion.tanks[Number(row.wbs.slice(3))-6],density=row.wbs==='06.06'?h.input.fuelDensity:h.input.oxidizerDensity;
 const radius=Math.cbrt(.001*tank.volumeL*3/(4*Math.PI)),volume=row.massKg/density;
 const bubble=radius*Math.cbrt(Math.max(0,1-volume/tank.volumeL));
 return sphereInertia(row.predictedKg,radius,bubble);
}
function pressurantShape(h,row,remainingKg){
 const fraction=Math.max(0,Math.min(1,remainingKg/h.propellantKg));
 return row.stationsM.map((center,i)=>{
  const tank=h.propulsion.tanks[i],radius=Math.cbrt(.001*tank.volumeL*3/(4*Math.PI)),mass=row.predictedKg*row.stationShares[i];
  const bubble=i<2?radius*Math.cbrt(Math.max(0,1-fraction*h.propulsion.liquidL[i]/tank.volumeL)):radius;
  return intrinsicElement('helium-'+i,mass,center,sphereInertia(mass,bubble));
 });
}

const recent=new WeakMap();
const poseKeys=['wingPitchDeg','upperRadiatorPitchDeg','lowerRadiatorPitchDeg','upperRadiatorRollDeg','lowerRadiatorRollDeg'];
// Result objects are read-only by convention. Four exact recent poses bound cache
// memory while allowing a control step and its finite-difference poses to recur.
export function componentInertia(h,{remainingKg=h.propellantKg,deployment=1,adapterAttached=false,attitude=null}={}){
 const deploy=Math.max(0,Math.min(1,deployment)),left=Math.max(0,Math.min(h.propellantKg,remainingKg));
 const key=[left,deploy,Number(adapterAttached),...poseKeys.map(k=>attitude?.[k]??''),...(attitude?.dishBoresightBody??attitude?.dish??[]),...(attitude?.opticalBoresightBody??attitude?.optic??[])].join('/');
 let cache=recent.get(h);if(!cache){cache=new Map();recent.set(h,cache)}
 if(cache.has(key))return cache.get(key);
 const properties=componentMassProperties(h,left,deploy,adapterAttached,true,attitude),{rows,cm}=properties;
 const surfaces=movingSurfaces(h,rows,deploy,attitude),payload=payloadElements(h,rows,deploy,attitude),terminals=terminalElements(h,attitude),joints=jointElements(h,rows,deploy,attitude),tensorKgM2=zero(),contributions=[];
 for(const row of rows){
  let tensor,basis;
  if(row.wbs==='02.01'||row.wbs==='03.01'){
   tensor=aboutPoint(surfaces.filter(p=>p.wbs===row.wbs),cm);
   basis=row.wbs==='02.01'?'Uniform wing mass split by paid-out length between each exposed blanket and its annular tip roll. Positions and axes follow the deployment geometry.':'Area-weighted radiator leaf volumes at their actual family deployment and operating poses; mass sums to the equipment allocation.';
  }else if(h.payloadLocation==='radiator'&&['01.01','01.02','03.02','07.03'].includes(row.wbs)){
   tensor=aboutPoint(payload.filter(p=>p.wbs===row.wbs),cm);basis='Compute packages follow the deployable local radiator platform; auxiliary host allocation remains in the bus.';
  }else if(row.wbs==='05.02'||row.wbs==='05.03'){
   tensor=aboutPoint(terminals.filter(p=>p.wbs===row.wbs),cm);
   basis='Fixed radio and positioner allowance at the pedestal foot. The aperture-scaled moving head is an axisymmetric cylinder at the rendered elevation pivot and geometric head centroid.';
  }else if(row.wbs==='06.06'||row.wbs==='06.07'){
   tensor=liquidShape(h,row);sumInto(tensor,parallelAxisTensor(row.predictedKg,difference(row.centroidM,cm)));
   basis='Centered wall-wetting liquid shell with a central ullage bubble. The modeled inventory and density set the occupied volume. Settling and slosh require a fluid-dynamics model.';
  }else if(row.wbs==='06.08'){
   tensor=aboutPoint(pressurantShape(h,row,left),cm);
   basis='Uniform helium gas in the central bubbles of both liquid vessels and in the pressure bottle. The pressure-regulated inventory determines each mass share.';
  }else if(row.wbs==='07.04'){
   tensor=aboutPoint(joints,cm);
   basis='Mechanism mass shares at the installed family solar and radiator joints. Compact body-aligned motor envelopes follow their actual joint centers; their relative translations also enter articulation momentum.';
  }else{
   const fixed=fixedShape(h,row);tensor=fixed.specificTensor.map(v=>v*row.predictedKg);basis=fixed.basis;
   sumInto(tensor,parallelAxisTensor(row.predictedKg,difference(row.centroidM,cm)));
  }
  sumInto(tensorKgM2,tensor);
  contributions.push({wbs:row.wbs,massKg:row.predictedKg,equipmentKg:row.massKg,centroidM:row.centroidM,tensorKgM2:tensor,diagonalKgM2:diagonal(tensor),basis});
 }
 const result={massKg:properties.massKg,equipmentKg:properties.equipmentKg,allocatedGrowthKg:properties.allocatedGrowthKg,cm,tensorKgM2,diagonalKgM2:diagonal(tensorKgM2),principalKgM2:principalMoments(tensorKgM2),contributions,
  movingElements:[...surfaces,...payload.filter(p=>p.moving),...terminals.filter(p=>p.moving),...joints],
  basis:'Equipment-ledger masses and installed stations with uniform shape proxies. Every component tensor is translated to the current center of mass. Liquid is a centered wetting-shell surrogate. Internal structural flexibility and fluid slosh require additional models.'};
 cache.set(key,result);if(cache.size>4)cache.delete(cache.keys().next().value);return result;
}
