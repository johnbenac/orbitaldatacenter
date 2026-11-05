// Installed mass and body stations. Distances in m, masses in kg. Instance stations
// for a group use equal unit masses unless its measured weight shares are supplied.
import {deploymentLayout,leafPose,mechanismPose} from './deployment.js';

const xyz=o=>[o.x,o.y,o.z];
const mean=(points,weights=null)=>points.reduce((out,p,i)=>out.map((v,k)=>v+p[k]*(weights?weights[i]:1/points.length)),[0,0,0]);
export function heliumDistribution(p,remainingKg){
 const left=Math.max(0,Math.min(1,remainingKg/(p.fuelKg+p.oxidizerKg)));
 const inTanks=[0,1].map(i=>p.feedPa*(p.tanks[i].volumeL-left*p.liquidL[i])*.001/(2077.1*p.temperatureK));
 return [...inTanks,p.pressurantKg-inTanks[0]-inTanks[1]];
}
export function equipmentAllocations(h){
 const d=h.input,p=h.propulsion,m=p.massKg,by=Object.fromEntries(h.massLedger.map(v=>[v.id,v]));
 const specs=[
 ['01.01','compute'],['01.02','host'],['01.03','storage'],['01.04','switch',by.switch.kg-20],
 ['02.01','array'],['02.02','battery'],['02.03','switch',8],['03.01','radiator'],['03.02','coolant'],['03.03','blanket'],
 ['04.01','cmg',by.cmg.kg-6-.0015*d.dipoleAm2],['04.02','cmg',.0015*d.dipoleAm2],['04.03','cmg',6],
 ['05.01','terminals',2],['05.02','terminals',10+10*d.kaDishM**2],['05.03','terminals',7+250*d.opticalApertureM**2],
 ['06.01','engine',m.engineHeads],['06.02','engine',m.feedAssembly],['06.03','tanks',m.fuelShell],
 ['06.04','tanks',m.oxidizerShell],['06.05','tanks',m.heliumShell],['06.06','fuel'],['06.07','oxidizer'],['06.08','pressurant'],
 ['07.01','structure'],['07.02','skin'],['07.03','shield'],['07.04','hinges'],['07.05','cables'],['08.01','switch',12],['09.01','adapter']
 ];
 return specs.map(([wbs,id,kg])=>({wbs,id,kg:kg??by[id].kg,group:by[id].group}));
}
function leafGroups(h,deploy){
 const g=deploymentLayout(h),pose=mechanismPose(g,deploy,h.input.solarTiltDeg);
 // A uniform blanket/boom assembly has flat material along the deployed span
 // and the remaining material coiled on its translating tip drum.
 const pv=pose.wings.map(w=>{
  const exposed=w.span/(w.span+w.rolledLength);
  return w.tip.map((v,i)=>v+(w.root[i]-v)*exposed/2);
 });
 const rad=pose.banks.map(b=>mean(g.descriptors.filter(d=>d.type==='rad'&&d.end===b.end).map(d=>xyz(leafPose(g,d,deploy,h.input.solarTiltDeg)))));
 const mechanisms=[...pose.wings.map(q=>q.root),...pose.banks.flatMap(q=>[q.root,q.elbow])];
 return {pv,rad,mechanisms};

}
function partsAt(h,deploy){
 const p=h.propulsion,d=h.input,w=h.bodyWidthM,b=h.bodyHeightM,l=h.bodyLengthM;
 const supplied=p.stations||{},rows=equipmentAllocations(h);
 const leaves=leafGroups(h,deploy),engines=p.engines.map(e=>e.throatZ!=null?[e.x,e.y,.5*(e.throatZ+e.z)]:[e.x,.5*(e.throatY+e.y),e.z]);
 const stack=h.fairing?.stack||[],bus=stack.find(v=>/insulated bus/i.test(v.part)),adapter=stack[0];
 const suppliedPoint=(wbs,id)=>supplied[wbs]||supplied[id]||[0,0,0];
 const radii=p.tanks.map(xyz);
 const points={
  '02.01':leaves.pv,'03.01':leaves.rad,'07.04':leaves.mechanisms,'06.01':engines,
  '06.03':[radii[0]],'06.04':[radii[1]],'06.05':[radii[2]],'06.06':[radii[0]],'06.07':[radii[1]],'06.08':radii,
  '09.01':[[0,0,adapter&&bus?(adapter.z0M+adapter.z1M-bus.z0M-bus.z1M)/2:-l*.5-.24]]
 };
 for(const row of rows){
  // Integration model may explicitly locate individual units (e.g. CMGs).
  const direct=supplied[row.wbs],preferred=(Array.isArray(direct?.[0])?direct:null);
  const centers=points[row.wbs]||preferred||[suppliedPoint(row.wbs,row.id)];
  const count=h.trays??Math.ceil(h.input.trayCount);
  const weights=['01.01','01.02'].includes(row.wbs)&&centers.length===2?[Math.ceil(count/2)/count,Math.floor(count/2)/count]:centers.map(()=>1/centers.length);
  row.stationShares=weights;row.stationsM=centers;row.centroidM=mean(centers,weights);
 }
 return rows;
}
// Cache immutable hardware by pose. A sizing iteration can bypass the cache until
// the engine installation is final. A live burn changes liquid/gas mass only.
const memo=new WeakMap();
export function componentMassProperties(h,remainingKg=h.propellantKg,deployedFraction=1,adapterAttached=false,cache=true){
 const p=h.propulsion,loaded=p.fuelKg+p.oxidizerKg,liquid=Math.min(loaded,Math.max(0,remainingKg??loaded));
 const frac=Math.max(0,Math.min(1,deployedFraction)),poses=memo.get(h)??{};
 let base=cache&&poses[frac];
 if(!base){base=partsAt(h,frac);if(cache&&(frac===0||frac===1)){poses[frac]=base;memo.set(h,poses)}}
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
export function componentCentroid(h,remainingKg,deploy=1,adapterAttached=false){
 // Fixed-mixture liquids and regulated ullage masses vary linearly with remaining
 // stock. Interpolate first moments, then divide by the instantaneous total mass.
 if(deploy!==0&&deploy!==1)return componentMassProperties(h,remainingKg,deploy,adapterAttached).cm;
 let poses=momentCache.get(h);if(!poses){poses={};momentCache.set(h,poses)}
 const key=deploy+'/'+adapterAttached;
 const ends=poses[key]??=( [componentMassProperties(h,0,deploy,adapterAttached),componentMassProperties(h,h.propellantKg,deploy,adapterAttached)] );
 const f=Math.min(1,Math.max(0,remainingKg/h.propellantKg)),mass=ends[0].massKg*(1-f)+ends[1].massKg*f;
 return ends[0].momentKgM.map((v,k)=>(v*(1-f)+ends[1].momentKgM[k]*f)/mass);
}
