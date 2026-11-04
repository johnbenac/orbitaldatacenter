// Illustrative design-review requirements. Change these to match the actual
// assembly's qualified ratings and its integration and acceptance conditions.
const specs=[
 ['junction','Accelerator junction','junctionK',253,358,223,373],
 ['coldPlate','Cold plate','coldPlateK',233,343,213,363],
 ['coolant','Coolant loop','coolantK',233,333,213,353],
 ['radiator','Radiator bank','radiatorK',203,353,173,383],
 ['battery','Battery pack','batteryK',273,318,243,333],
 ['enclosure','Exterior blanket','enclosureOuterK',140,380,120,410]
];
export const thermalStates=['operating','survival'];
export const thermalNodes=specs.map(([id,label,tempKey,lo,hi,slo,shi],index)=>({
 id,label,tempKey,index,
 keys:{operating:{min:id+'OpMinK',max:id==='junction'?'junctionLimitK':id+'OpMaxK'},survival:{min:id+'SurvivalMinK',max:id+'SurvivalMaxK'}},
 assumptions:{operating:{min:lo,max:hi},survival:{min:slo,max:shi}}
}));
export const thermalControls=thermalNodes.flatMap(n=>thermalStates.flatMap(state=>['min','max'].map(side=>({
 key:n.keys[state][side],label:n.label+' · '+state+' '+(side==='min'?'minimum':'maximum'),group:'Thermal limits',unit:'K',min:3,max:1500,step:.1,value:n.assumptions[state][side]
}))));
export function validateThermalLimits(d){
 const errors=[];
 for(const n of thermalNodes){const s=n.keys.survival,o=n.keys.operating;
  if(d[s.min]>d[o.min]||d[o.max]<d[o.min]||d[o.max]>d[s.max])
   errors.push(n.label+' requires survival minimum ≤ operating minimum ≤ operating maximum ≤ survival maximum');}
 return errors;
}
const POWER_THRESHOLD=0.001; // kW, equivalent to 1 W
export function thermalActivityMask(t,itKw,pumpKw,deploy,chargeKw,dischargeKw){
 return (t>=0&&itKw>POWER_THRESHOLD?1:0)|(t>=0&&pumpKw>POWER_THRESHOLD?6:0)|
  (t>=0&&deploy>1e-7?8:0)|(t>=0&&Math.max(chargeKw,dischargeKw)>POWER_THRESHOLD?16:0)|(t>=540?32:0);
}
function activity(n,s,op){
 switch(n.id){
 case 'junction':return op?s.burst?'Powered compute burst':'Powered idle':'Accelerators unpowered';
 case 'coldPlate':return op?'Cold plate on circulating loop':'Loop in standby';
 case 'coolant':return op?'Pump circulating coolant':'Pump off / unserved';
 case 'radiator':return op?(s.radiatorDeployment??s.deployment)<.999?'Partially exposed radiator':'Deployed passive radiator':s.deployment>0&&s.deployment<1?'Radiator in deployment cassette':'Radiator stowed';
 case 'battery':return op?s.chargeKW>s.dischargeKW?'Pack charging':'Pack discharging':'Pack in standby';
 default:return op?'Exposed passive insulation':'Payload under launch boundary';
 }
}
export function qualifyNow(s,d){
 const mask=s.thermalActivityMask??thermalActivityMask(s.t,s.itKW,s.servedPumpKW,s.radiatorDeployment??s.deployment,s.chargeKW,s.dischargeKW);
 return thermalNodes.map(n=>{const op=!!(mask&(1<<n.index)),state=op?'operating':'survival',k=n.keys[state],minK=d[k.min],maxK=d[k.max],temperatureK=s[n.tempKey],observable=!s.referenceBody&&Number.isFinite(temperatureK)&&(s.terminatedAt==null||s.t<=s.terminatedAt+1e-7);
  return {id:n.id,label:n.label,tempKey:n.tempKey,temperatureK,state,activity:observable?activity(n,s,op):'Outside propagated mission',minK,maxK,marginK:observable?Math.min(temperatureK-minK,maxK-temperatureK):null,status:!observable?'unassessed':temperatureK<minK?'cold':temperatureK>maxK?'hot':'pass'};});
}
export function newThermalSummary(d,start,end,provenance,log=false){
 return {start,end,coveredSeconds:0,provenance,firstViolation:null,...(log?{excursions:[]}:{}),rows:thermalNodes.flatMap(n=>thermalStates.map(state=>{
  const k=n.keys[state];return {id:n.id,label:n.label,state,minLimitK:d[k.min],maxLimitK:d[k.max],durationS:0,minK:null,maxK:null,minTime:null,maxTime:null,lowCount:0,lowSeconds:0,highCount:0,highSeconds:0,firstLowTime:null,firstHighTime:null,lastLowEnd:null,lastHighEnd:null,firstViolation:null};
 }))};
}
function record(summary,row,side,from,to,limitK,tempK){
 if(to<=from)return;
 const low=side==='low',last=low?row.lastLowEnd:row.lastHighEnd,adjacent=last!=null&&Math.abs(last-from)<1e-5;
 if(low){if(!adjacent)row.lowCount++;row.lowSeconds+=to-from;row.firstLowTime??=from;row.lastLowEnd=to;}
 else{if(!adjacent)row.highCount++;row.highSeconds+=to-from;row.firstHighTime??=from;row.lastHighEnd=to;}
 if(!row.firstViolation||row.firstViolation.time>from){row.firstViolation={id:row.id,label:row.label,state:row.state,side,time:from,limitK,temperatureK:tempK};}
 if(!summary.firstViolation||summary.firstViolation.time>from)summary.firstViolation=row.firstViolation;
 if(summary.excursions){const prev=adjacent&&summary.excursions.findLast(e=>e.id===row.id&&e.state===row.state&&e.side===side);if(prev){prev.end=to;prev.seconds=to-prev.start;}else summary.excursions.push({id:row.id,state:row.state,side,start:from,end:to,seconds:to-from});}
}
// Piecewise-linear temperature inside each solver interval, using one-sided
// limits at activity switches. Never connects two different activity states.
export function accumulateThermal(summary,t0,t1,opMask,a,b){
 const span=t1-t0;if(!(span>0))return;summary.coveredSeconds+=span;
 for(let i=0;i<6;i++){
  const row=summary.rows[i*2+((opMask&(1<<i))?0:1)],v=a[i],w=b[i];if(!Number.isFinite(v)||!Number.isFinite(w))continue;
  row.durationS+=span;
  const vmin=Math.min(v,w),vmax=Math.max(v,w);
  if(row.minK===null||vmin<row.minK){row.minK=vmin;row.minTime=v<=w?t0:t1;}
  if(row.maxK===null||vmax>row.maxK){row.maxK=vmax;row.maxTime=v>=w?t0:t1;}
  if(vmin<row.minLimitK){const value=row.minLimitK,cut=v===w?t0:t0+(value-v)/(w-v)*span;record(summary,row,'low',v<value?t0:cut,w<value?t1:cut,value,Math.min(v,value));}
  if(vmax>row.maxLimitK){const value=row.maxLimitK,cut=v===w?t0:t0+(value-v)/(w-v)*span;record(summary,row,'high',v>value?t0:cut,w>value?t1:cut,value,Math.max(v,value));}
 }
}
export function mergeThermal(target,part){
 target.coveredSeconds+=part.coveredSeconds;
 if(part.firstViolation&&(!target.firstViolation||target.firstViolation.time>part.firstViolation.time))target.firstViolation=part.firstViolation;
 for(let i=0;i<target.rows.length;i++){const a=target.rows[i],b=part.rows[i];if(!b.durationS)continue;a.durationS+=b.durationS;
  if(a.minK===null||b.minK<a.minK){a.minK=b.minK;a.minTime=b.minTime;}if(a.maxK===null||b.maxK>a.maxK){a.maxK=b.maxK;a.maxTime=b.maxTime;}
  if(b.lowCount){a.lowCount+=b.lowCount-(a.lastLowEnd!==null&&Math.abs(a.lastLowEnd-b.firstLowTime)<1e-5?1:0);a.firstLowTime??=b.firstLowTime;a.lastLowEnd=b.lastLowEnd;a.lowSeconds+=b.lowSeconds;}
  if(b.highCount){a.highCount+=b.highCount-(a.lastHighEnd!==null&&Math.abs(a.lastHighEnd-b.firstHighTime)<1e-5?1:0);a.firstHighTime??=b.firstHighTime;a.lastHighEnd=b.lastHighEnd;a.highSeconds+=b.highSeconds;}
  a.firstViolation??=b.firstViolation;
 }
}
export function deriveBound(summary,id,state,side,marginK=0){
 const n=thermalNodes.find(x=>x.id===id),r=summary?.rows?.find(x=>x.id===id&&x.state===state);
 if(!n||!thermalStates.includes(state)||!['min','max'].includes(side)||!Number.isFinite(marginK)||marginK<0)throw Error('Choose a thermal node, state, bound and nonnegative margin.');
 const observedK=r?.[side+'K']??null,key=n.keys[state][side],time=r?.[side+'Time']??null,coverageS=r?.durationS??0;
 const requiredK=observedK===null?null:observedK+(side==='min'?-marginK:marginK);
 const result={id,state,side,key,observedK,requiredK,valueK:null,marginK,time,coverageS,provenance:summary?.provenance??null,start:summary?.start??null,end:summary?.end??null,status:'no-data',reason:'No exposure in this state during the selected interval.'};
 if(requiredK===null)return result;
 const operating=summary.rows.find(q=>q.id===id&&q.state==='operating'),survival=summary.rows.find(q=>q.id===id&&q.state==='survival');
 const min=side==='min';
 const low=state==='survival'?(min?3:operating.maxLimitK):(min?survival.minLimitK:operating.minLimitK);
 const high=state==='survival'?(min?operating.minLimitK:1500):(min?operating.maxLimitK:survival.maxLimitK);
 const candidate=min?Math.min(requiredK,high):Math.max(requiredK,low);
 if(candidate<low||candidate>high)return {...result,status:'infeasible',reason:'The observed requirement falls outside the interval allowed by the other fixed bounds.'};
 return {...result,valueK:candidate,status:'derived',reason:candidate===requiredK?'Observed extremum plus the specified design margin.':'The adjacent fixed bound sets the compatible requirement.'};
}
