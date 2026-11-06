import {createSimulation} from './model.js';
import {newThermalSummary,mergeThermal} from './thermal-limits.js';
import {DAY} from './orbit.js';

export function chronologicalAudit(design, progress = () => {}) {
 const sim=createSimulation(design),totalDays=Math.ceil(sim.duration/DAY),seeds=[],dayStats=[];
 let seed,previousEdges=[],finalState,firstCrossing=null,minSoc=Infinity,maxTemp=-Infinity,minSocTime=0,maxJunctionTime=0,peakQueueGB=0;
 const eventTotals={},energyKWh={},attitudeModeSeconds={},annual=[];
 const thermal=newThermalSummary(sim.hardware.input,0,sim.duration,'Full chronological mission · through modeled termination');
 for(let i=0;i<totalDays;i++){
  const step=sim.auditStep(seed,Math.min(DAY,sim.duration-i*DAY));
  if(i===0)seeds.push(null);
  if(step.end.t%DAY===0)seeds.push(step.end);
  seed=step.end; finalState=step.state;const stats=step.stats;
  // Calendar-day bins are assigned to their mission year by start time.
  const year=Math.floor(i/365.25)+1;let yr=annual.at(-1);if(!yr||yr.year!==year){yr={year,startSeconds:i*DAY,shadowSeconds:0,contactSeconds:0,deliveredGB:0,generatedGB:0,propellantUsedKg:0,unmetKWh:0,minSocPct:Infinity,maxJunctionK:-Infinity,peakQueueGB:0,energyKWh:{},eventTotals:{}};annual.push(yr);}
  const before={...eventTotals};yr.endSeconds=step.end.t;
  if(!yr.thermal)yr.thermal=newThermalSummary(sim.hardware.input,yr.startSeconds,step.end.t,'Chronological mission-year bin');
  yr.thermal.end=step.end.t;mergeThermal(yr.thermal,stats.thermal);mergeThermal(thermal,stats.thermal);
  stats.firstThermalViolation=stats.thermal.firstViolation;delete stats.thermal;
  for(const k of ['aiUnitsComputed','aiTrainingTokens','aiInputUploadedGB','aiInputConsumedGB','aiProductGeneratedGB','aiProductDeliveredGB','aiProductDroppedGB','aiCheckpointWriteGB','payloadServiceSeconds','activeComputeSeconds','shadowSeconds','contactSeconds','deliveredGB','generatedGB','uploadedGB','textDeliveredGB','textGeneratedGB','textDroppedGB','bulkDeliveredGB','tokensDelivered','commandDroppedMB','housekeepingTelemetryGB','propellantUsedKg','unmetKWh'])yr[k]=(yr[k]||0)+stats[k];yr.minSocPct=Math.min(yr.minSocPct,stats.minSocPct);yr.maxJunctionK=Math.max(yr.maxJunctionK,stats.maxJunctionK);yr.peakQueueGB=Math.max(yr.peakQueueGB,stats.peakQueueGB);
  yr.attitudeModeSeconds??={};for(const [k,v] of Object.entries(stats.attitudeModeSeconds)){yr.attitudeModeSeconds[k]=(yr.attitudeModeSeconds[k]||0)+v;attitudeModeSeconds[k]=(attitudeModeSeconds[k]||0)+v;}
  for(const [k,v] of Object.entries(stats.energyKWh)){energyKWh[k]=(energyKWh[k]||0)+v;yr.energyKWh[k]=(yr.energyKWh[k]||0)+v;}
  for(const [key,value] of Object.entries(stats.counts))eventTotals[key]=(eventTotals[key]||0)+value;
  for(const e of stats.edges)if(e.start===i*DAY&&previousEdges.some(p=>p.type===e.type&&p.label===e.label&&p.end===e.start))eventTotals[e.type+'Count']--;
  for(const [k,v] of Object.entries(eventTotals))yr.eventTotals[k]=(yr.eventTotals[k]||0)+v-(before[k]||0);
  previousEdges=stats.edges;delete stats.edges;dayStats.push(stats);
  if(stats.minSocPct<minSoc){minSoc=stats.minSocPct;minSocTime=stats.minSocTime;}
  if(stats.maxJunctionK>maxTemp){maxTemp=stats.maxJunctionK;maxJunctionTime=stats.maxJunctionTime;}
  peakQueueGB=Math.max(peakQueueGB,stats.peakQueueGB);if(!firstCrossing&&stats.firstCrossing)firstCrossing=stats.firstCrossing;
  if(i%8===0||i===totalDays-1)progress({days:i+1,totalDays});
 }
 const terminal=seed?.plan?Object.fromEntries(Object.entries(seed.plan).filter(([k])=>k!=='samples')):null;
 finalState.projected=false;const result={terminal,payloadServiceSeconds:annual.reduce((sum,y)=>sum+y.payloadServiceSeconds,0),activeComputeSeconds:annual.reduce((sum,y)=>sum+y.activeComputeSeconds,0),days:totalDays,thermal,thermalQualifiedUntilS:thermal.firstViolation?.time??thermal.coveredSeconds,physicalLifetimeSeconds:Math.min(firstCrossing?.time??Infinity,thermal.coveredSeconds),annual,energyKWh,attitudeModeSeconds,eventTotals,...eventTotals,burnCount:(eventTotals.trimCount||0)+(eventTotals.reboostCount||0)+(eventTotals.disposalCount||0),desatCount:eventTotals.desatCount||0,minSocPct:minSoc,minSocTime,maxJunctionK:maxTemp,maxJunctionTime,peakQueueGB,firstCrossing,finalState,dayStats};return {seeds,dayStats,result};
}
if(typeof WorkerGlobalScope!=='undefined'&&self instanceof WorkerGlobalScope)self.onmessage=({data})=>{try{self.postMessage(chronologicalAudit(data,progress=>self.postMessage({progress})));}catch(e){self.postMessage({error:e.message});}};
