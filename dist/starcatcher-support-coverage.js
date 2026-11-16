import {starcatcherHarnessRetentionVolume,starcatcherHarnessInstallationPolicy}
 from './starcatcher-harness-installation.js';

const subtract=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const distance=(a,b)=>Math.hypot(...subtract(a,b));
const interpolate=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);

// The complete fixed schedule has explicit keeper stations. Its declared
// section length cannot hide a missing keeper run at either open end.
export function inspectStarcatcherRetentionStations(corridors){
 const rows=corridors.map(corridor=>{
  const lengthM=distance(corridor.fromM,corridor.toM),
   allocation=corridor.retentionAllocation,
   maximumPitchM=corridor.maximumRetainerPitchM??
    allocation?.maximumPitchM??
    starcatcherHarnessInstallationPolicy.maximumRungPitchM,
   stations=corridor.retainerStationsM,issues=[];
  const fail=(code,extra={})=>issues.push({code,corridorId:corridor.id,...extra});
  if(!(Number.isFinite(lengthM)&&lengthM>0&&Number.isFinite(maximumPitchM)&&
   maximumPitchM>0))fail('invalid-retention-allocation');
  if(allocation?.maximumPitchM!=null&&
   Math.abs(allocation.maximumPitchM-maximumPitchM)>1e-9)
   fail('inconsistent-retention-limit',{maximumPitchM,
    reportedMaximumPitchM:allocation.maximumPitchM});
  const valid=Array.isArray(stations)&&stations.every((station,index)=>
   Number.isFinite(station)&&station>=0&&station<=lengthM&&
    (index===0||station>stations[index-1]));
  if(!valid)fail('invalid-explicit-keeper-stations');
  const stops=valid?[0,...stations,lengthM]:[0,lengthM],
   gaps=stops.slice(1).map((endM,index)=>({startM:stops[index],endM,
    lengthM:endM-stops[index]})),
   maximumUnsupportedSpanM=Math.max(...gaps.map(gap=>gap.lengthM));
  for(const gap of gaps)if(gap.lengthM>maximumPitchM+1e-9)
   fail('keeper-gap-exceeds-allocation',{...gap,maximumPitchM});
  if(allocation?.maximumUnsupportedSpanM!=null&&
   Math.abs(allocation.maximumUnsupportedSpanM-maximumUnsupportedSpanM)>1e-9)
   fail('stale-retention-span',{maximumUnsupportedSpanM,
    reportedMaximumUnsupportedSpanM:allocation.maximumUnsupportedSpanM});
  return {id:corridor.id,ok:issues.length===0,lengthM,maximumPitchM,
   maximumUnsupportedSpanM,gaps,issues};
 });
 const issues=rows.flatMap(row=>row.issues);
 return {ok:issues.length===0,rows,issues};
}

// Clip the actual sampled curve against the free space between real keeper
// faces. Route membership labels are deliberately not used as support proof.
// Open section ends do not consume an extra cable radius; its complete radius
// must fit between both side faces and the front/rear retention boundaries.
function clip(a,b,volume,radiusM){
 const p=volume.axes.map(axis=>dot(subtract(a,volume.centerM),axis)),
  d=volume.axes.map(axis=>dot(subtract(b,a),axis));
 let low=0,high=1;
 for(let axis=0;axis<3;axis++){
  const radius=axis<2?radiusM:0,
   minimum=volume.minimumLocalM[axis]+radius,
   maximum=volume.maximumLocalM[axis]-radius;
  if(minimum>maximum)return null;
  if(Math.abs(d[axis])<1e-12){
   if(p[axis]<minimum-1e-10||p[axis]>maximum+1e-10)return null;
  }else{
   const first=(minimum-p[axis])/d[axis],last=(maximum-p[axis])/d[axis];
   low=Math.max(low,Math.min(first,last));high=Math.min(high,Math.max(first,last));
   if(low>=high-1e-12)return null;
  }
 }
 return [low,high];
}

export function measureStarcatcherSupportCoverage(routes,corridors,
 {maximumTransitionM=.85}={}){
 if(!(maximumTransitionM>0))throw new Error('A finite support transition limit is required');
 const retention=inspectStarcatcherRetentionStations(corridors),
  validIds=new Set(retention.rows.filter(row=>row.ok).map(row=>row.id));
 // An invalid keeper schedule contributes no retained volume. Separate
 // section issues still fail the inventory even if another tray overlaps it.
 const volumes=corridors.filter(corridor=>validIds.has(corridor.id)).map(corridor=>({id:corridor.id,
  ...starcatcherHarnessRetentionVolume(corridor)}));
 const rows=routes.map(route=>{
  if(!(route.radiusM>0)||!Array.isArray(route.points)||route.points.length<2)
   throw new Error('Support coverage requires a complete physical curve '+route.id);
  const points=route.points,stations=[0],intervals=[];
  for(let index=1;index<points.length;index++){
   const a=points[index-1],b=points[index],length=distance(a,b),start=stations.at(-1);
   stations.push(start+length);
   if(length<1e-12)continue;
   for(const volume of volumes){
    const clipped=clip(a,b,volume,route.radiusM);
    if(clipped)intervals.push({startM:start+clipped[0]*length,
     endM:start+clipped[1]*length,corridorIds:[volume.id]});
   }
  }
  const supported=[];
  for(const interval of intervals.sort((a,b)=>a.startM-b.startM)){
   const last=supported.at(-1);
   if(last&&interval.startM<=last.endM+1e-7){
    last.endM=Math.max(last.endM,interval.endM);
    for(const id of interval.corridorIds)
     if(!last.corridorIds.includes(id))last.corridorIds.push(id);
   }else supported.push({...interval});
  }
  const at=station=>{
   const index=stations.findIndex(value=>value>=station);
   if(index<=0)return [...points[0]];
   return interpolate(points[index-1],points[index],
    (station-stations[index-1])/(stations[index]-stations[index-1]));
  };
  const lengthM=stations.at(-1),uncovered=[];
  const addGap=(startM,endM)=>{
   if(endM-startM<1e-7)return;
   uncovered.push({startM,endM,lengthM:endM-startM,fromM:at(startM),toM:at(endM),
    points:[at(startM),...points.filter((_,index)=>stations[index]>startM+1e-8&&
     stations[index]<endM-1e-8),at(endM)]});
  };
  let cursor=0;
  for(const interval of supported){addGap(cursor,interval.startM);cursor=interval.endM;}
  addGap(cursor,lengthM);
  return {id:route.id,lengthM,radiusM:route.radiusM,
   coveredLengthM:supported.reduce((sum,row)=>sum+row.endM-row.startM,0),
   maximumUncoveredM:Math.max(0,...uncovered.map(row=>row.lengthM)),uncovered,supported};
 });
 const issues=rows.flatMap(row=>row.uncovered.filter(gap=>
  gap.lengthM>maximumTransitionM+1e-9).map(gap=>({id:row.id,...gap})));
 return {ok:issues.length===0&&retention.ok,retention,maximumTransitionM,
  corridorCount:corridors.length,
  physicalCuts:rows.length,totalLengthM:rows.reduce((sum,row)=>sum+row.lengthM,0),
  coveredLengthM:rows.reduce((sum,row)=>sum+row.coveredLengthM,0),rows,issues,
  basis:'Preliminary installation coverage of complete physical cable curves by actual '+
   'finite keeper interiors. Short connector and bend transitions are retained as explicit '+
   'gaps. This is not clearance acceptance, joint sizing, or qualification evidence.'};
}
