// Reduced-order thermal analysis. SI throughout: K, s, W, J/K, W/K and m².
// Numerical predictions are separate from measured evidence or hardware acceptance.
export const THERMAL_SOLVER_REVISION='thermal-network-be-2';
const SIGMA=5.670374419e-8,finite=Number.isFinite,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sum=a=>a.reduce((v,x)=>v+x,0),copy=x=>JSON.parse(JSON.stringify(x));
const value=(x,d=0)=>finite(x)?x:d;
const maxAbs=a=>Math.max(0,...a.map(Math.abs));
const thermalError=message=>new Error('Thermal analysis: '+message);

export function validateThermalModel(model){
 const errors=[],nodes=model?.nodes||[],ids=new Set(),boundaries=new Set((model?.boundaries||[]).map(b=>b.id));
 if(!nodes.length)errors.push('At least one allocated thermal node is required.');
 if(nodes.length>64)errors.push('This reduced-order solver supports at most 64 thermal nodes.');
 for(const n of nodes){
  if(!n.id||ids.has(n.id))errors.push('Thermal node identifiers must be unique.');ids.add(n.id);
  if(!finite(n.capacityJPerK)||n.capacityJPerK<=0)errors.push(n.id+': heat capacity must be positive and finite.');
  if(!finite(n.initialK)||n.initialK<=0)errors.push(n.id+': initial temperature must be positive kelvin.');
  if(!finite(n.loadW??0)||(n.loadW??0)<0)errors.push(n.id+': dissipation must be nonnegative finite watts.');
 }
 if(boundaries.size!==(model?.boundaries||[]).length)errors.push('Boundary identifiers must be unique.');
 for(const b of model?.boundaries||[])if(!b.id||!finite(b.temperatureK)||b.temperatureK<=0)errors.push(b.id+': boundary temperature must be positive kelvin.');
 const endpoint=e=>{if(!ids.has(e.from))errors.push(e.id+': source node is missing.');if(e.to&&!ids.has(e.to))errors.push(e.id+': receiving node is missing.');if(e.boundaryId&&!boundaries.has(e.boundaryId))errors.push(e.id+': boundary is missing.');if(!e.to&&!e.boundaryId)errors.push(e.id+': a receiving node or boundary is required.');if(e.from===e.to)errors.push(e.id+': a node cannot exchange heat with itself.');};
 for(const e of model?.conductors||[]){endpoint(e);if(!finite(e.conductanceWPerK)||e.conductanceWPerK<0)errors.push(e.id+': conductance must be nonnegative.');if(e.capacityW!=null&&(!finite(e.capacityW)||e.capacityW<0))errors.push(e.id+': transport capacity must be nonnegative.');}
 for(const e of model?.radiation||[]){endpoint(e);if(!finite(e.areaM2)||e.areaM2<0||!finite(e.emissivity)||e.emissivity<0||e.emissivity>1||!finite(e.viewFactor??1)||(e.viewFactor??1)<0||(e.viewFactor??1)>1)errors.push(e.id+': invalid radiating area, emissivity or view factor.');}
 for(const e of model?.convection||[]){endpoint(e);if(!finite(e.coefficientWPerM2K)||e.coefficientWPerM2K<0||!finite(e.areaM2)||e.areaM2<0)errors.push(e.id+': invalid convection allocation.');}
 for(const p of model?.heatPumps||[]){if(!ids.has(p.from)||!ids.has(p.to)||p.from===p.to||!finite(p.cop)||!(p.cop>0)||!finite(p.coldCapacityW)||!(p.coldCapacityW>=0)||!finite(p.setpointK)||p.setpointK<=0)errors.push(p.id+': invalid active heat-transport allocation.');}
 for(const h of model?.heaters||[]){if(!ids.has(h.nodeId)||!finite(h.maxW)||!(h.maxW>=0)||!finite(h.onK)||!(h.onK>0)||!finite(h.offK)||!(h.offK>=h.onK))errors.push(h.id+': invalid heater allocation.');}
 return errors;
}

function linearSolve(matrix,rhs){
 const a=matrix.map((r,i)=>[...r,rhs[i]]),n=a.length;
 for(let k=0;k<n;k++){
  let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[pivot][k]))pivot=i;
  if(Math.abs(a[pivot][k])<1e-18)throw thermalError('The thermal matrix is singular.');
  if(pivot!==k)[a[k],a[pivot]]=[a[pivot],a[k]];
  const divisor=a[k][k];for(let j=k;j<=n;j++)a[k][j]/=divisor;
  for(let i=k+1;i<n;i++){const f=a[i][k];if(!f)continue;for(let j=k;j<=n;j++)a[i][j]-=f*a[k][j];}
 }
 const out=Array(n).fill(0);for(let i=n-1;i>=0;i--){out[i]=a[i][n];for(let j=i+1;j<n;j++)out[i]-=a[i][j]*out[j];}return out;
}
const enabled=(edge,kind)=>!edge.activeIn||edge.activeIn.includes(kind==='orbital-transient'?'orbit':'test');
function evaluateBalance(model,temperatures,old,dt,conditions,heaterOn){
 const nodes=model.nodes,n=nodes.length,index=new Map(nodes.map((x,i)=>[x.id,i])),net=Array(n).fill(0),jac=Array.from({length:n},()=>Array(n).fill(0)),links=[];
 const loadsW={},externalW={},heatersW={},heatPumps=[],boundaryFlowsW={};
 for(let i=0;i<n;i++){
  const node=nodes[i],load=Object.hasOwn(conditions.loadsW||{},node.id)?conditions.loadsW[node.id]:(node.loadW||0)*conditions.loadFraction;
  loadsW[node.id]=load;externalW[node.id]=value(conditions.externalFluxW?.[node.id]);heatersW[node.id]=0;net[i]=load+externalW[node.id];
 }
 for(const h of model.heaters||[]){const i=index.get(h.nodeId),power=conditions.heaterEnabled&&heaterOn[h.id]?h.maxW:0;net[i]+=power;heatersW[h.nodeId]+=power;}
 for(const h of model.heatPumps||[]){
  const i=index.get(h.from),j=index.get(h.to),cold=temperatures[i],hot=temperatures[j],lift=hot-cold,carnot=lift>0?cold/lift:Infinity;
  const valid=h.cop<carnot&&cold>0,band=Math.max(.1,h.bandK||5),fraction=clamp((cold-(h.setpointK-band))/band,0,1);
  const coldW=conditions.transportEnabled&&valid?h.coldCapacityW*fraction:0,workW=coldW/h.cop,derivative=conditions.transportEnabled&&valid&&fraction>0&&fraction<1?h.coldCapacityW/band:0;
  net[i]-=coldW;net[j]+=coldW+workW;jac[i][i]-=derivative;jac[j][i]+=derivative*(1+1/h.cop);
  heatPumps.push({id:h.id,from:h.from,to:h.to,coldRemovalW:coldW,inputW:workW,hotRejectionW:coldW+workW,thermodynamicallyValid:valid,cop:h.cop});
 }
 const exchange=(edge,q,di,dj,kind)=>{
  const i=index.get(edge.from),j=edge.to?index.get(edge.to):-1;
  net[i]-=q;jac[i][i]-=di;
  if(j>=0){net[j]+=q;jac[i][j]-=dj;jac[j][i]+=di;jac[j][j]+=dj;}
  else boundaryFlowsW[edge.boundaryId]=(boundaryFlowsW[edge.boundaryId]||0)+q;
  links.push({id:edge.id,from:edge.from,to:edge.to||edge.boundaryId,kind,heatW:q,capacityW:edge.capacityW??null,saturated:finite(edge.capacityW)&&Math.abs(q)>=edge.capacityW-1e-9});
 };
 for(const e of model.conductors||[]){
  if(!enabled(e,conditions.kind)||e.requiresPower&&!conditions.transportEnabled)continue;
  const i=index.get(e.from),other=e.to?temperatures[index.get(e.to)]:conditions.boundariesK[e.boundaryId],g=e.conductanceWPerK*value(conditions.conductanceFactors?.[e.id],1),raw=g*(temperatures[i]-other),cap=e.capacityW??Infinity,q=clamp(raw,-cap,cap),slope=Math.abs(raw)<cap?g:0;
  exchange(e,q,slope,-slope,'conduction');
 }
 for(const e of model.radiation||[]){
  if(!enabled(e,conditions.kind))continue;
  const i=index.get(e.from),other=e.to?temperatures[index.get(e.to)]:value(conditions.radiativeBoundaryK?.[e.from],conditions.boundariesK[e.boundaryId]),factor=clamp(value(conditions.radiationFactors?.[e.id],e.viewFactor??1),0,1),k=SIGMA*e.areaM2*e.emissivity*factor;
  exchange(e,k*(temperatures[i]**4-other**4),4*k*temperatures[i]**3,-4*k*other**3,'radiation');
 }
 if(conditions.convectionEnabled)for(const e of model.convection||[]){const i=index.get(e.from),other=e.to?temperatures[index.get(e.to)]:conditions.boundariesK[e.boundaryId],g=e.coefficientWPerM2K*e.areaM2;exchange(e,g*(temperatures[i]-other),g,-g,'convection');}
 const residual=nodes.map((node,i)=>node.capacityJPerK*(temperatures[i]-old[i])/dt-net[i]);
 for(let i=0;i<n;i++){for(let j=0;j<n;j++)jac[i][j]=-jac[i][j];jac[i][i]+=nodes[i].capacityJPerK/dt;}
 const storedW=sum(nodes.map((node,i)=>node.capacityJPerK*(temperatures[i]-old[i])/dt)),appliedW=sum(Object.values(loadsW))+sum(Object.values(externalW))+sum(Object.values(heatersW))+sum(heatPumps.map(p=>p.inputW)),rejectedW=sum(Object.values(boundaryFlowsW));
 return {residual,jac,loadsW,externalFluxW:externalW,heatersW,heatPumps,boundaryFlowsW,links,storedW,appliedW,rejectedW,residualW:storedW-appliedW+rejectedW};
}
function solveStep(model,old,dt,conditions,heaterOn){
 let t=[...old],balance,iterations=0;
 for(;iterations<32;iterations++){
  balance=evaluateBalance(model,t,old,dt,conditions,heaterOn);
  // Subtracting nearby large stored energies has a finite precision floor.
  // Without this scale-aware bound, massive reference assemblies falsely fail
  // Newton convergence during an otherwise converged low-power recovery.
  const roundoff=Math.max(...model.nodes.map((n,i)=>n.capacityJPerK*Math.max(t[i],old[i])/dt))*16*Number.EPSILON;
  const tolerance=Math.max(1e-7,Math.abs(balance.appliedW)*1e-10,roundoff);
  if(maxAbs(balance.residual)<tolerance)return {temperatures:t,balance,iterations:iterations+1};
  const step=linearSolve(balance.jac,balance.residual),before=maxAbs(balance.residual);let damping=1,accepted=false;
  for(let j=0;j<12;j++){
   const candidate=t.map((k,i)=>k-damping*step[i]);
   if(candidate.every(k=>finite(k)&&k>.1&&k<20000)){
    const b=evaluateBalance(model,candidate,old,dt,conditions,heaterOn);
    if(maxAbs(b.residual)<before||maxAbs(step)*damping<1e-10){t=candidate;accepted=true;break;}
   }damping*=.5;
  }
  if(!accepted)break;
 }
 throw thermalError('Nonlinear solve did not converge; reduce the time step or revise the thermal inputs.');
}
const lerp=(a,b,f)=>a+(b-a)*f;
function mapMix(a={},b={},f){const out={};for(const k of new Set([...Object.keys(a),...Object.keys(b)]))out[k]=lerp(value(a[k],value(b[k])),value(b[k],value(a[k])),f);return out;}
function timelineAt(points,t){
 if(!points?.length)return {};
 let lo=0,hi=points.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(points[mid].timeS<=t)lo=mid;else hi=mid;}const i=lo;
 const a=points[i],b=points[Math.min(i+1,points.length-1)],f=b.timeS>a.timeS?clamp((t-a.timeS)/(b.timeS-a.timeS),0,1):0;
 return {...a,boundariesK:mapMix(a.boundariesK,b.boundariesK,f),externalFluxW:mapMix(a.externalFluxW,b.externalFluxW,f),loadsW:mapMix(a.loadsW,b.loadsW,f),radiativeBoundaryK:mapMix(a.radiativeBoundaryK,b.radiativeBoundaryK,f),radiationFactors:mapMix(a.radiationFactors,b.radiationFactors,f),loadFraction:lerp(value(a.loadFraction,1),value(b.loadFraction,1),f),environment:a.environment};
}
function excursionSeconds(a,b,min,max,dt){
 const below=limit=>a<limit&&b<limit?dt:a>=limit&&b>=limit?0:dt*(a<limit?(limit-a)/(b-a):(limit-b)/(a-b));
 const above=limit=>a>limit&&b>limit?dt:a<=limit&&b<=limit?0:dt*(a>limit?(a-limit)/(a-b):(b-limit)/(b-a));
 return {cold:finite(min)?Math.max(0,below(min)):0,hot:finite(max)?Math.max(0,above(max)):0};
}
function integrate(model,c,options={}){
 const dtNominal=clamp(value(options.dtS,c.dtS||20),.05,300),sampleEveryS=Math.max(dtNominal,value(options.sampleEveryS,c.sampleEveryS||60)),nodes=model.nodes,ids=nodes.map(n=>n.id),index=new Map(ids.map((id,i)=>[id,i]));
 let temperatures=nodes.map(n=>value(c.initialTemperaturesK?.[n.id],n.initialK)),timeS=0,lastSample=-Infinity,maxResidualW=0,maxNodeResidualW=0,totalAppliedJ=0,totalRejectedJ=0,totalStoredJ=0,stepsTaken=0;
 const frames=[],comparisonTrace=[],stageResults=[],heaterOn={},heaterEnergyJ={},heatPumpEnergyJ={},warnings=new Set(),nodeStats=nodes.map((n,i)=>({id:n.id,label:n.label,minK:temperatures[i],maxK:temperatures[i],minTimeS:0,maxTimeS:0,maximumRateKPerHour:0,coldSeconds:0,hotSeconds:0,coldMarginK:null,hotMarginK:null,limitBasis:n.limits?.basis||'Carried study limit; hardware verification remains open.'}));
 let previousBoundaries=Object.fromEntries((model.boundaries||[]).map(b=>[b.id,value(c.initialBoundariesK?.[b.id],b.temperatureK)]));
 const blankBalance={loadsW:{},externalFluxW:{},heatersW:{},heatPumps:[],boundaryFlowsW:{},links:[],storedW:0,appliedW:0,rejectedW:0,residualW:0};
 const frame=(stage,conditions,balance,extra={})=>({timeS,stageId:stage.id,stageLabel:stage.label,mode:conditions.mode,temperaturesK:Object.fromEntries(ids.map((id,i)=>[id,temperatures[i]])),boundariesK:{...conditions.boundariesK},radiativeBoundaryK:{...conditions.radiativeBoundaryK},loadsW:{...balance.loadsW},externalFluxW:{...balance.externalFluxW},heaterW:sum(Object.values(balance.heatersW)),heatersW:{...balance.heatersW},heatPumps:copy(balance.heatPumps),links:copy(balance.links),boundaryFlowsW:{...balance.boundaryFlowsW},storedW:balance.storedW,appliedW:balance.appliedW,rejectedW:balance.rejectedW,residualW:balance.residualW,pressurePa:c.pressurePa??null,environment:conditions.environment||null,...extra});
 for(const [stageIndex,stage] of c.steps.entries()){
  const startS=timeS,fromBoundaries={...previousBoundaries},duration=stage.type==='hold'?Math.max(dtNominal,value(stage.maxDurationS,14400)):Math.max(dtNominal,value(stage.durationS,3600));
  if(options.recordConvergenceTrace)comparisonTrace.push({timeS,stageIndex,stageId:stage.id,stageElapsedS:0,temperaturesK:Object.fromEntries(ids.map((id,i)=>[id,temperatures[i]]))});
  let dwellAccumulatedS=0,stabilizedAtS=null,completed=false,stabilityRates={},sensorErrors={},history=[],lastBalance=blankBalance,lastConditions;
  const monitor=(stage.monitorNodeIds||c.monitorNodeIds||[model.articleNodeId||ids[0]]).filter(id=>index.has(id));
  if(!monitor.length)throw thermalError('At least one modeled monitoring node is required.');
  const snapshotConditions=(elapsed,at)=>{
   const f=stage.type==='ramp'?clamp(elapsed/duration,0,1):1,targets={...fromBoundaries,...stage.boundariesK},timeline=stage.type==='timeline'?timelineAt(c.timeline||stage.timeline,at):{};
   return {kind:c.kind,mode:stage.mode||c.mode||'operating',boundariesK:{...mapMix(fromBoundaries,targets,f),...timeline.boundariesK},loadFraction:value(timeline.loadFraction,value(stage.loadFraction,1)),loadsW:{...stage.loadsW,...timeline.loadsW},externalFluxW:{...stage.externalFluxW,...timeline.externalFluxW},radiativeBoundaryK:{...stage.radiativeBoundaryK,...timeline.radiativeBoundaryK},conductanceFactors:stage.conductanceFactors||{},radiationFactors:{...stage.radiationFactors,...timeline.radiationFactors},heaterEnabled:stage.heaterEnabled??c.heaterEnabled??true,transportEnabled:stage.transportEnabled??true,convectionEnabled:['atmospheric-cycling','installed-environment'].includes(c.kind)&&c.convectionEnabled===true,environment:timeline.environment||stage.environment||null};
  };
  lastConditions=snapshotConditions(0,timeS);history.push({timeS,temperatures:[...temperatures]});frames.push(frame(stage,lastConditions,blankBalance,{stageStart:true}));lastSample=timeS;
  while(timeS-startS<duration-1e-8){
   if(++stepsTaken>50000)throw thermalError('Case exceeds 50,000 integration steps. Shorten its duration or increase the time step.');
   let dt=Math.min(dtNominal,duration-(timeS-startS));
   if(stage.type==='timeline')for(const event of c.eventTimesS||[])if(event>timeS+1e-7&&event<timeS+dt){dt=event-timeS;break;}
   if(timeS+dt>Math.min(c.maxDurationS||2592000,2592000)){warnings.add('Case duration limit reached.');break;}
   let conditions=snapshotConditions(timeS-startS+dt,timeS+dt);
   for(const h of model.heaters||[]){const k=temperatures[index.get(h.nodeId)];if(!conditions.heaterEnabled)heaterOn[h.id]=false;else if(k<=h.onK)heaterOn[h.id]=true;else if(k>=h.offK)heaterOn[h.id]=false;}
   let solved;
   for(let retry=0;retry<8;retry++){try{solved=solveStep(model,temperatures,dt,conditions,heaterOn);break;}catch(error){if(retry===7)throw error;dt*=.5;conditions=snapshotConditions(timeS-startS+dt,timeS+dt);}}
   const old=temperatures;temperatures=solved.temperatures;timeS+=dt;lastBalance=solved.balance;lastConditions=conditions;
   if(options.recordConvergenceTrace)comparisonTrace.push({timeS,stageIndex,stageId:stage.id,stageElapsedS:timeS-startS,temperaturesK:Object.fromEntries(ids.map((id,i)=>[id,temperatures[i]]))});
   maxResidualW=Math.max(maxResidualW,Math.abs(lastBalance.residualW));maxNodeResidualW=Math.max(maxNodeResidualW,maxAbs(lastBalance.residual));
   totalAppliedJ+=lastBalance.appliedW*dt;totalRejectedJ+=lastBalance.rejectedW*dt;totalStoredJ+=lastBalance.storedW*dt;
   for(const [id,power] of Object.entries(lastBalance.heatersW))heaterEnergyJ[id]=(heaterEnergyJ[id]||0)+power*dt;
   for(const pump of lastBalance.heatPumps){heatPumpEnergyJ[pump.id]=(heatPumpEnergyJ[pump.id]||0)+pump.inputW*dt;if(!pump.thermodynamicallyValid)warnings.add(pump.id+': allocated COP exceeds the instantaneous Carnot limit; active transfer is disabled.');}
   for(let i=0;i<nodes.length;i++){
    const s=nodeStats[i],node=nodes[i],k=temperatures[i],lim=node.limits?.[conditions.mode]||node.limits?.operating||{};
    if(k<s.minK){s.minK=k;s.minTimeS=timeS;}if(k>s.maxK){s.maxK=k;s.maxTimeS=timeS;}s.maximumRateKPerHour=Math.max(s.maximumRateKPerHour,Math.abs(k-old[i])*3600/dt);
    const outside=excursionSeconds(old[i],k,lim.minK,lim.maxK,dt);s.coldSeconds+=outside.cold;s.hotSeconds+=outside.hot;
    if(finite(lim.minK))s.coldMarginK=Math.min(s.coldMarginK??Infinity,Math.min(k,old[i])-lim.minK);if(finite(lim.maxK))s.hotMarginK=Math.min(s.hotMarginK??Infinity,lim.maxK-Math.max(k,old[i]));
   }
   history.push({timeS,temperatures:[...temperatures]});
   const windowS=Math.max(dtNominal,value(stage.stabilityWindowS,c.stabilityWindowS||600));while(history.length>2&&history[1].timeS<timeS-windowS)history.shift();
   let stable=false;
   if(stage.type==='hold'){
    const first=history[0],historySpan=timeS-first.timeS;
    // Range over the complete window catches oscillations that endpoint drift hides.
    stabilityRates=Object.fromEntries(monitor.map(id=>{const i=index.get(id),samples=history.map(h=>h.temperatures[i]);return [id,historySpan>0?(Math.max(...samples)-Math.min(...samples))*3600/historySpan:Infinity];}));
    sensorErrors=Object.fromEntries(Object.entries(stage.sensorTargetsK||{}).filter(([id])=>index.has(id)).map(([id,k])=>[id,temperatures[index.get(id)]-k]));
    stable=historySpan>=windowS-1e-7&&Object.values(stabilityRates).every(rate=>rate<=value(stage.stabilityKPerHour,c.stabilityKPerHour||1))&&Object.values(sensorErrors).every(error=>Math.abs(error)<=value(stage.toleranceK,c.toleranceK||2));
    if(stable){stabilizedAtS??=timeS;dwellAccumulatedS=timeS-stabilizedAtS;}else{dwellAccumulatedS=0;stabilizedAtS=null;}
    completed=stable&&dwellAccumulatedS>=Math.max(0,value(stage.dwellS,value(c.dwellS,1800)))&&timeS-startS>=value(stage.minDurationS,0);
   }else completed=timeS-startS>=duration-1e-7;
   if(timeS-lastSample>=sampleEveryS-1e-8||completed||timeS-startS>=duration-1e-8){frames.push(frame(stage,conditions,lastBalance,{stable,dwellAccumulatedS,sensorRatesKPerHour:{...stabilityRates},sensorErrorsK:{...sensorErrors}}));lastSample=timeS;}
   if(completed)break;
  }
  previousBoundaries={...lastConditions.boundariesK};
  stageResults.push({id:stage.id,label:stage.label,type:stage.type,startS,endS:timeS,durationS:timeS-startS,completed,stabilizedAtS,dwellAccumulatedS,requiredDwellS:stage.type==='hold'?value(stage.dwellS,c.dwellS||1800):null,sensorRatesKPerHour:stabilityRates,sensorErrorsK:sensorErrors,status:completed?'predicted-complete':'target-not-demonstrated',mode:stage.mode||c.mode||'operating'});
  if(!completed)warnings.add(stage.label+': the configured sensor stability, target or dwell condition was not reached within the allowed duration.');
 }
 for(let i=0;i<nodeStats.length;i++){nodeStats[i].finalK=temperatures[i];nodeStats[i].assessment=nodeStats[i].hotSeconds>1e-6||nodeStats[i].coldSeconds>1e-6?'outside-carried-envelope':nodeStats[i].coldMarginK==null&&nodeStats[i].hotMarginK==null?'unallocated':'within-carried-envelope';}
 const totalCapacity=sum(nodes.map(n=>n.capacityJPerK)),absoluteStoredJ=sum(nodes.map((n,i)=>n.capacityJPerK*(temperatures[i]-value(c.initialTemperaturesK?.[n.id],n.initialK))));
 return {frames,comparisonTrace,stageResults,durationS:timeS,nodeStats,warnings:[...warnings],numerics:{method:'Backward Euler with damped Newton iteration; bidirectional exchange cancels internally.',nominalStepS:dtNominal,recordedSampleEveryS:sampleEveryS,steps:stepsTaken,maxResidualW,maxNodeResidualW,integratedResidualJ:totalStoredJ-totalAppliedJ+totalRejectedJ,totalAppliedJ,totalRejectedJ,totalStoredJ:absoluteStoredJ,totalCapacityJPerK:totalCapacity},heaterEnergyJ,heatPumpEnergyJ};
}

function frameAtTime(run,timeS){
 const f=run.frames;if(!f?.length)return null;if(timeS<=f[0].timeS)return copy(f[0]);if(timeS>=f.at(-1).timeS)return copy(f.at(-1));
 let lo=0,hi=f.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(f[mid].timeS<=timeS)lo=mid;else hi=mid;}
 const a=f[lo],b=f[hi],u=(timeS-a.timeS)/Math.max(1e-12,b.timeS-a.timeS);
 const out={...copy(a),timeS,temperaturesK:mapMix(a.temperaturesK,b.temperaturesK,u),boundariesK:mapMix(a.boundariesK,b.boundariesK,u),radiativeBoundaryK:mapMix(a.radiativeBoundaryK,b.radiativeBoundaryK,u),loadsW:mapMix(a.loadsW,b.loadsW,u),externalFluxW:mapMix(a.externalFluxW,b.externalFluxW,u),heatersW:mapMix(a.heatersW,b.heatersW,u),boundaryFlowsW:mapMix(a.boundaryFlowsW,b.boundaryFlowsW,u),interpolated:true,solvedSampleTimeS:a.timeS};
 for(const key of ['heaterW','residualW','storedW','appliedW','rejectedW'])out[key]=lerp(value(a[key]),value(b[key]),u);
 for(const [key,fields] of [['links',['heatW']],['heatPumps',['coldRemovalW','inputW','hotRejectionW']]])out[key]=(a[key]||[]).map(row=>{const other=(b[key]||[]).find(r=>r.id===row.id),next={...row};if(other)for(const f of fields)next[f]=lerp(value(row[f]),value(other[f]),u);return next;});
 out.interpolationBasis='Temperature and continuous heat-flow interpolation between solved samples; discrete control flags retain the preceding sample.';return out;
}
export function thermalRunFrame(run,progress=0){return frameAtTime(run,clamp(value(progress),0,1)*(run.durationS||0));}

const unavailableStageConvergence=()=>({responseMaxTemperatureDeltaK:null,responseStatus:'comparison-unavailable',responseComparedSamples:0,responseComparedStages:0,scheduleStatus:'comparison-unavailable',maxStageDurationDeltaS:null,maxStageEndDeltaS:null,stageTimingDeltas:[]});
function stageConvergence(baseline,refined,toleranceK){
 // Stabilization-controlled holds can move every later stage in global time.
 // Compare their response at the same elapsed time within the same stage,
 // without stretching either duration or extrapolating beyond common coverage.
 const fineByStage=new Map();
 for(const sample of refined.comparisonTrace||[]){const samples=fineByStage.get(sample.stageIndex)||[];samples.push(sample);fineByStage.set(sample.stageIndex,samples);}
 let maximum=0,comparedSamples=0;const comparedStages=new Set();
 for(const sample of baseline.comparisonTrace||[]){
  const points=fineByStage.get(sample.stageIndex),otherStage=refined.stageResults[sample.stageIndex];
  if(!points?.length||otherStage?.id!==sample.stageId||sample.stageElapsedS>points.at(-1).stageElapsedS+1e-7)continue;
  let lo=0,hi=points.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(points[mid].stageElapsedS<=sample.stageElapsedS)lo=mid;else hi=mid;}
  const a=points[lo],b=points[hi],fraction=b.stageElapsedS>a.stageElapsedS?clamp((sample.stageElapsedS-a.stageElapsedS)/(b.stageElapsedS-a.stageElapsedS),0,1):0;
  for(const [id,k] of Object.entries(sample.temperaturesK))maximum=Math.max(maximum,Math.abs(k-lerp(a.temperaturesK[id],b.temperaturesK[id],fraction)));
  comparedSamples++;comparedStages.add(sample.stageIndex);
 }
 const stageTimingDeltas=baseline.stageResults.map((stage,stageIndex)=>{
  const candidate=refined.stageResults[stageIndex],other=candidate?.id===stage.id?candidate:null,baselineStabilizationElapsedS=finite(stage.stabilizedAtS)?stage.stabilizedAtS-stage.startS:null,refinedStabilizationElapsedS=other&&finite(other.stabilizedAtS)?other.stabilizedAtS-other.startS:null;
  return {stageIndex,id:stage.id,label:stage.label,baselineDurationS:stage.durationS,refinedDurationS:other?.durationS??null,durationDeltaS:other?other.durationS-stage.durationS:null,baselineEndS:stage.endS,refinedEndS:other?.endS??null,endDeltaS:other?other.endS-stage.endS:null,baselineStabilizationElapsedS,refinedStabilizationElapsedS,stabilizationDeltaS:finite(baselineStabilizationElapsedS)&&finite(refinedStabilizationElapsedS)?refinedStabilizationElapsedS-baselineStabilizationElapsedS:null,completionAgreement:!!other&&stage.completed===other.completed};
 });
 const durations=stageTimingDeltas.map(s=>s.durationDeltaS).filter(finite),ends=stageTimingDeltas.map(s=>s.endDeltaS).filter(finite),maxStageDurationDeltaS=durations.length?maxAbs(durations):null,maxStageEndDeltaS=ends.length?maxAbs(ends):null,completionAgreement=baseline.stageResults.length===refined.stageResults.length&&stageTimingDeltas.every(s=>s.completionAgreement);
 return {responseMaxTemperatureDeltaK:comparedSamples?maximum:null,responseStatus:comparedSamples?(maximum<=toleranceK?'within-study-tolerance':'refinement-needed'):'comparison-unavailable',responseComparedSamples:comparedSamples,responseComparedStages:comparedStages.size,responseComparisonBasis:'Temperature comparison at every baseline integration epoch within matching stages and their common elapsed-time coverage. No stage stretching or extrapolation is used. This response diagnostic does not replace the equal-global-time comparison or establish physical model correlation.',scheduleStatus:!completionAgreement?'stage-completion-differs':maxStageDurationDeltaS>1e-7||maxStageEndDeltaS>1e-7||stageTimingDeltas.some(s=>finite(s.stabilizationDeltaS)&&Math.abs(s.stabilizationDeltaS)>1e-7)?'stage-timing-shift':'same-stage-timing',scheduleComparisonBasis:'Per-stage duration, end time and stabilization timing differences are refined minus baseline. Timing shifts and any disagreement about completing a stage are reported separately; no schedule acceptance tolerance is assumed.',maxStageDurationDeltaS,maxStageEndDeltaS,stageTimingDeltas};
}

export function runThermalAnalysis(model,caseDefinition,options={}){
 const errors=validateThermalModel(model);if(model.available===false)errors.unshift(...(model.missingInputs||['The model is not allocated.']));
 if(!caseDefinition?.steps?.length)errors.push('An executable thermal case requires a nonempty step sequence.');
 if(caseDefinition?.available===false)errors.push(...(caseDefinition.missingInputs||['The case has unresolved inputs.']));
 if(errors.length)throw thermalError([...new Set(errors)].join(' '));
 const c=copy(caseDefinition);
 if(!['atmospheric-cycling','installed-environment'].includes(c.kind)&&c.convectionEnabled)throw thermalError('Vacuum and orbital cases cannot include air convection.');
 const ids=new Set(model.nodes.map(n=>n.id)),boundaryIds=new Set((model.boundaries||[]).map(n=>n.id));
 for(const [id,k] of Object.entries(c.initialTemperaturesK||{}))if(!ids.has(id)||!finite(k)||k<=0)throw thermalError('Invalid initial article temperature '+id+'.');
 for(const [id,k] of Object.entries(c.initialBoundariesK||{}))if(!boundaryIds.has(id)||!finite(k)||k<=0)throw thermalError('Invalid initial boundary temperature '+id+'.');
 if(options.dtS!=null&&(!finite(options.dtS)||options.dtS<=0))throw thermalError('Integration step must be positive and finite.');
 const checkConditions=(stage)=>{for(const [id,k] of Object.entries(stage.boundariesK||{}))if(!boundaryIds.has(id)||!finite(k)||k<=0)throw thermalError(stage.id+': invalid boundary '+id);for(const key of ['loadsW','externalFluxW'])for(const [id,w] of Object.entries(stage[key]||{}))if(!ids.has(id)||!finite(w)||w<0)throw thermalError(stage.id+': invalid '+key+' allocation for '+id);for(const [id,k] of Object.entries(stage.sensorTargetsK||{}))if(!ids.has(id)||!finite(k)||k<=0)throw thermalError(stage.id+': invalid article target '+id);if(!finite(stage.loadFraction??1)||(stage.loadFraction??1)<0)throw thermalError(stage.id+': load fraction must be nonnegative.');};
 for(const stage of c.steps){checkConditions(stage);if(!['ramp','hold','timeline'].includes(stage.type))throw thermalError('Unknown stage type.');if(!finite(stage.type==='hold'?stage.maxDurationS:stage.durationS)||(stage.type==='hold'?stage.maxDurationS:stage.durationS)<=0)throw thermalError(stage.id+': positive finite duration is required.');}
 for(const point of c.timeline||[])checkConditions(point);
 const result=integrate(model,c,{...options,recordConvergenceTrace:options.verifyConvergence!==false}),createdAt=new Date().toISOString();
 const run={schema:'odc.thermal.run.v1',id:'thermal-run-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),revision:THERMAL_SOLVER_REVISION,createdAt,status:'predicted',verificationStatus:'unverified',modelId:model.id,modelRevision:model.revision,modelFingerprint:model.fingerprint,configurationId:model.configurationId,configurationFingerprint:model.configurationFingerprint,planId:c.planId||c.id,planRevision:c.planRevision||c.revision,caseId:c.id,caseKind:c.kind,caseLabel:c.label,articleNodeId:model.articleNodeId||null,itemId:model.itemId||null,nodes:copy(model.nodes),boundaries:copy(model.boundaries||[]),frames:result.frames,durationS:result.durationS,caseDefinition:c,model:copy(model),summary:{nodes:result.nodeStats,stages:result.stageResults,numerics:result.numerics,heaterEnergyJ:result.heaterEnergyJ,heatPumpEnergyJ:result.heatPumpEnergyJ,allPlateausCompleted:result.stageResults.every(s=>s.completed),warnings:result.warnings,temperatureAssessmentBasis:'Comparison to carried operating or survival allocations. A qualification test can intentionally extend operating limits; numerical agreement does not demonstrate hardware performance.'},provenance:{kind:'numerical-prediction',solver:THERMAL_SOLVER_REVISION,configuration:model.configuration||null,modelAssumptions:copy(model.assumptions||[]),caseAssumptions:copy(c.assumptions||[]),sourceIds:[...new Set([...(model.sourceIds||[]),...(c.sourceIds||[])])],correlationStatus:'uncorrelated',measuredData:false}};
 if(options.verifyConvergence!==false){
  if(result.numerics.nominalStepS<=.05+1e-12){run.summary.numerics.convergence={refinedStepS:null,maxTemperatureDeltaK:null,durationDeltaS:null,toleranceK:value(options.convergenceToleranceK,.25),status:'minimum-step-reached',...unavailableStageConvergence(),basis:'The solver minimum step prevents a further halving check. No convergence claim is made.'};run.summary.warnings.push('The minimum integration step was reached; a further time-step convergence check is unavailable.');return run;}
  let fine;try{fine=integrate(model,c,{...options,dtS:result.numerics.nominalStepS*.5,recordConvergenceTrace:true,verifyConvergence:false});}catch(error){run.summary.numerics.convergence={refinedStepS:result.numerics.nominalStepS*.5,maxTemperatureDeltaK:null,durationDeltaS:null,toleranceK:value(options.convergenceToleranceK,.25),status:'refinement-unavailable',...unavailableStageConvergence(),basis:'The baseline prediction completed, but the finer integration could not complete: '+error.message};run.summary.warnings.push('Automatic time-step check unavailable: '+error.message);return run;}
  const comparison={frames:fine.comparisonTrace,durationS:fine.durationS};let maximum=0;
  for(const frame of result.comparisonTrace){if(frame.timeS>fine.durationS)continue;const sampled=frameAtTime(comparison,frame.timeS);for(const id of Object.keys(frame.temperaturesK))maximum=Math.max(maximum,Math.abs(frame.temperaturesK[id]-sampled.temperaturesK[id]));}
  const toleranceK=value(options.convergenceToleranceK,.25),durationDeltaS=Math.abs(fine.durationS-result.durationS);
  run.summary.numerics.convergence={refinedStepS:fine.numerics.nominalStepS,maxTemperatureDeltaK:maximum,durationDeltaS,toleranceK,status:maximum<=toleranceK?'within-study-tolerance':'refinement-needed',...stageConvergence(result,fine,toleranceK),basis:'Time-step halving comparison at every baseline global integration time, independently of recorded plot spacing. Stabilization-controlled holds can shift later stages, so this diagnostic includes schedule drift as well as response differences. Numerical convergence is distinct from physical model correlation.'};
  if(maximum>toleranceK)run.summary.warnings.push('Time-step refinement changes a modeled temperature by '+maximum.toFixed(3)+' K; use a smaller step before relying on this prediction.');
 }
 return run;
}

export function correlateThermalMeasurements(run,measurements,{toleranceK=null}={}){
 const groups=new Map(),rejected=[];
 for(const [i,row] of (measurements||[]).entries()){
  if(!finite(row.timeS)||row.timeS<0||row.timeS>run.durationS||!finite(row.temperatureK)||row.temperatureK<=0||!run.nodes.some(n=>n.id===row.nodeId)){rejected.push({row:i+1,reason:'A known node, a time within this run and a positive finite measured temperature in kelvin are required.'});continue;}
  const f=frameAtTime(run,row.timeS),error=f.temperaturesK[row.nodeId]-row.temperatureK,list=groups.get(row.nodeId)||[];list.push({timeS:row.timeS,measuredK:row.temperatureK,predictedK:f.temperaturesK[row.nodeId],errorK:error,sensorId:row.sensorId||row.nodeId});groups.set(row.nodeId,list);
 }
 const nodes=[...groups].map(([nodeId,samples])=>({nodeId,samples,count:samples.length,biasK:sum(samples.map(s=>s.errorK))/samples.length,rmseK:Math.sqrt(sum(samples.map(s=>s.errorK**2))/samples.length),maxAbsoluteErrorK:Math.max(...samples.map(s=>Math.abs(s.errorK)))}));
 return {runId:run.id,configurationFingerprint:run.configurationFingerprint,status:nodes.length?'comparison-available':'no-matched-data',verificationStatus:'unverified',nodes,rejected,toleranceK,withinAllocatedTolerance:finite(toleranceK)&&nodes.length?nodes.every(n=>n.maxAbsoluteErrorK<=toleranceK):null,basis:'User-supplied observations compared without changing model parameters. Sensor calibration, article identity, as-run power/boundaries and independent correlation review must accompany the evidence.'};
}
