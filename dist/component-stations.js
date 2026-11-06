// Installed mass and body stations. Distances in m, masses in kg. Instance stations
// for a group use equal unit masses unless its measured weight shares are supplied.
import {deploymentLayout,leafPose,mechanismPose,terminalLayout} from './deployment.js';

const xyz=o=>[o.x,o.y,o.z];
const mean=(points,weights=null)=>points.reduce((out,p,i)=>out.map((v,k)=>v+p[k]*(weights?weights[i]:1/points.length)),[0,0,0]);
// The terminal allocation separates the fixed radio/positioner allowance from
// its aperture-scaled moving head. Head centroids are geometry surrogates.
// Axes are right-handed local X/Y/Z expressed in the spacecraft body frame.
export function terminalMassElements(h,attitude=null){
 const d=h.input,layout=terminalLayout(h.bodyWidthM,h.bodyHeightM,d.kaDishM,d.opticalApertureM);
 const definitions=[
  ['05.02','dish',10,10*d.kaDishM**2,d.kaDishM/2,.42*d.kaDishM,layout.kaHeight,-layout.kaPin+.21*d.kaDishM,attitude?.dishBoresightBody??attitude?.dish],
  ['05.03','optic',7,250*d.opticalApertureM**2,.8*d.opticalApertureM,d.opticalApertureM,layout.opticalHeight,-layout.opticalPin+.5*d.opticalApertureM,attitude?.opticalBoresightBody??attitude?.optic]
 ];
 return definitions.flatMap(([wbs,id,fixedKg,headKg,radiusM,lengthM,height,offset,direction])=>{
  const foot=h.propulsion.stations[wbs],norm=direction?Math.hypot(...direction):0;
  const n=norm>0?direction.map(v=>v/norm):[0,1,0],az=Math.atan2(n[0],n[2]),el=Math.atan2(Math.hypot(n[0],n[2]),n[1]);
  const axes=[[Math.cos(az),0,-Math.sin(az)],n,[Math.sin(az)*Math.cos(el),-Math.sin(el),Math.cos(az)*Math.cos(el)]];
  return [
   {id:id+'-base',wbs,massKg:fixedKg,centroidM:foot,dimensionsM:[radiusM*.8,lengthM*.5,radiusM*.8],moving:false},
   {id:id+'-head',wbs,massKg:headKg,centroidM:foot.map((v,i)=>v+(i===1?height:0)+offset*n[i]),radiusM,lengthM,axes,symmetryAxis:1,moving:true}
  ];
 });
}
export function heliumDistribution(p,remainingKg){
 const left=Math.max(0,Math.min(1,remainingKg/(p.fuelKg+p.oxidizerKg)));
 const inTanks=[0,1].map(i=>p.feedPa*(p.tanks[i].volumeL-left*p.liquidL[i])*.001/(2077.1*p.temperatureK));
 return [...inTanks,p.pressurantKg-inTanks[0]-inTanks[1]];
}
export function equipmentAllocations(h){
 const d=h.input,p=h.propulsion,m=p.massKg,by=Object.fromEntries(h.massLedger.map(v=>[v.id,v]));
 const specs=[
 ['01.01','compute'],['01.02','host'],['01.03','storage'],['01.04','switch',h.serviceArchitecture.fabric.massKg],
 ['02.01','array'],['02.02','battery'],['02.03','switch',h.energySystem.masses.electricalKg],['03.01','radiator'],['03.02','coolant'],['03.03','blanket'],
 ['04.01','cmg',by.cmg.kg-6-.0015*d.dipoleAm2],['04.02','cmg',.0015*d.dipoleAm2],['04.03','cmg',6],
 ['05.01','terminals',2],['05.02','terminals',10+10*d.kaDishM**2],['05.03','terminals',7+250*d.opticalApertureM**2],
 ['06.01','engine',m.engineHeads],['06.02','engine',m.feedAssembly],['06.03','tanks',m.fuelShell],
 ['06.04','tanks',m.oxidizerShell],['06.05','tanks',m.heliumShell],['06.06','fuel'],['06.07','oxidizer'],['06.08','pressurant'],
 ['07.01','structure'],['07.02','skin'],['07.03','shield'],['07.04','hinges'],['07.05','cables'],['08.01','switch',12],['09.01','adapter']
 ];
 return specs.map(([wbs,id,kg])=>({wbs,id,kg:kg??by[id].kg,group:by[id].group}));
}
function leafGroups(h,deploy,attitude){
 const g=deploymentLayout(h),pose=mechanismPose(g,deploy,h.input.solarTiltDeg,attitude);
 // A uniform blanket/boom assembly has flat material along the deployed span
 // and the remaining material coiled on its translating tip drum.
 const pv=pose.wings.map(w=>{
  const exposed=w.span/(w.span+w.rolledLength);
  const center=w.tip.map((v,i)=>v+(w.root[i]-v)*exposed/2);
  center[1]+=(1-exposed)*w.rollRadius*Math.cos(w.pitch);
  center[2]+=(1-exposed)*w.rollRadius*Math.sin(w.pitch);
  return center;
 });
 const rad=pose.banks.map(b=>mean(g.descriptors.filter(d=>d.type==='rad'&&d.end===b.end).map(d=>xyz(leafPose(g,d,deploy,h.input.solarTiltDeg,attitude)))));
 const mechanisms=[...pose.wings.map(q=>q.root),...pose.banks.flatMap(q=>[q.root,q.elbow])];
 return {pv,rad,mechanisms};

}
const fixedCentroids=new WeakMap();
function partsAt(h,deploy,attitude){
 const p=h.propulsion,d=h.input,w=h.bodyWidthM,b=h.bodyHeightM,l=h.bodyLengthM;
 const supplied=p.stations||{},rows=equipmentAllocations(h);
 const leaves=leafGroups(h,deploy,attitude),engines=p.engines.map(e=>e.throatZ!=null?[e.x,e.y,.5*(e.throatZ+e.z)]:[e.x,.5*(e.throatY+e.y),e.z]);
 const terminals=terminalMassElements(h,attitude);
 const stack=h.fairing?.stack||[],bus=stack.find(v=>/insulated bus/i.test(v.part)),adapter=stack[0];
 const suppliedPoint=(wbs,id)=>supplied[wbs]||supplied[id]||[0,0,0];
 const radii=p.tanks.map(xyz);
 const points={
  '02.01':leaves.pv,'03.01':leaves.rad,'07.04':leaves.mechanisms,'06.01':engines,
  '06.03':[radii[0]],'06.04':[radii[1]],'06.05':[radii[2]],'06.06':[radii[0]],'06.07':[radii[1]],'06.08':radii,
  '09.01':[[0,0,adapter&&bus?(adapter.z0M+h.payloadInterface.upperFaceStationM-bus.z0M-bus.z1M)/2:-l*.5-.24]]
 };
 for(const row of rows){
  if(row.wbs==='05.02'||row.wbs==='05.03'){
   const parts=terminals.filter(p=>p.wbs===row.wbs),total=parts.reduce((sum,p)=>sum+p.massKg,0);
   row.stationsM=parts.map(p=>p.centroidM);row.stationShares=parts.map(p=>p.massKg/total);
   row.centroidM=mean(row.stationsM,row.stationShares);continue;
  }
  // Integration model may explicitly locate individual units (e.g. CMGs).
  const direct=supplied[row.wbs],preferred=(Array.isArray(direct?.[0])?direct:null);
  const centers=points[row.wbs]||preferred||[suppliedPoint(row.wbs,row.id)];
  if(preferred){
   let fixed=fixedCentroids.get(centers);
   if(!fixed){
    const shares=row.wbs==='07.01'?h.enclosure.frameShares:centers.map(()=>1/centers.length);
    fixed={stationsM:centers,stationShares:shares,centroidM:mean(centers,shares)};fixedCentroids.set(centers,fixed);
   }
   Object.assign(row,fixed);
  }else{
   row.stationShares=centers.map(()=>1/centers.length);row.stationsM=centers;row.centroidM=mean(centers);
  }
 }
 return rows;
}
// Cache immutable hardware by pose. A sizing iteration can bypass the cache until
// the engine installation is final. A live burn changes liquid/gas mass only.
const memo=new WeakMap();
export function componentMassProperties(h,remainingKg=h.propellantKg,deployedFraction=1,adapterAttached=false,cache=true,attitude=null){
 const p=h.propulsion,loaded=p.fuelKg+p.oxidizerKg,liquid=Math.min(loaded,Math.max(0,remainingKg??loaded));
 const frac=Math.max(0,Math.min(1,deployedFraction)),poses=memo.get(h)??{};
 let base=cache&&!attitude&&poses[frac];
 if(!base){base=partsAt(h,frac,attitude);if(cache&&!attitude&&(frac===0||frac===1)){poses[frac]=base;memo.set(h,poses)}}
 const gas=heliumDistribution(p,liquid),dryGrowth=h.input.structureMargin??0;
 let massKg=0,equipmentKg=0,allocatedGrowthKg=0;const moment=[0,0,0];
 const rows=base.map(row=>{
  const {wbs,group}=row;let kg=row.kg,cm=row.centroidM;
  if(wbs==='06.06')kg=liquid/(1+h.input.mixtureRatio);
  if(wbs==='06.07')kg=liquid-liquid/(1+h.input.mixtureRatio);
  if(wbs==='06.08'){kg=p.pressurantKg;cm=mean(row.stationsM,gas.map(m=>m/kg));}
  if(wbs==='09.01'&&!adapterAttached)kg=0;
  const growth=group==='Hardware'?kg*dryGrowth:0,predictedKg=kg+growth;
  for(let i=0;i<3;i++)moment[i]+=cm[i]*predictedKg;
  massKg+=predictedKg;equipmentKg+=kg;allocatedGrowthKg+=growth;
  return {...row,massKg:kg,predictedKg,centroidM:cm,stationShares:wbs==='06.08'?gas.map(m=>m/kg):row.stationShares};
 });
 return {massKg,equipmentKg,allocatedGrowthKg,cm:moment.map(x=>x/massKg),momentKgM:moment,rows};
}

const momentCache=new WeakMap();
export function componentCentroid(h,remainingKg,deploy=1,adapterAttached=false,attitude=null){
 // Fixed-mixture liquids and regulated ullage masses vary linearly with remaining
 // stock. Interpolate first moments, then divide by the instantaneous total mass.
 if(attitude||deploy!==0&&deploy!==1)return componentMassProperties(h,remainingKg,deploy,adapterAttached,false,attitude).cm;
 let poses=momentCache.get(h);if(!poses){poses={};momentCache.set(h,poses)}
 const key=deploy+'/'+adapterAttached;
 const ends=poses[key]??=( [componentMassProperties(h,0,deploy,adapterAttached),componentMassProperties(h,h.propellantKg,deploy,adapterAttached)] );
 const f=Math.min(1,Math.max(0,remainingKg/h.propellantKg)),mass=ends[0].massKg*(1-f)+ends[1].massKg*f;
 return ends[0].momentKgM.map((v,k)=>(v*(1-f)+ends[1].momentKgM[k]*f)/mass);
}
