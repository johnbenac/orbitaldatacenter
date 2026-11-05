import {createSimulation} from './model.js';
import {assessServiceSegments,evaluateService} from './ai-service.js';
const DAY=86400;
self.onmessage=({data})=>{
 try{
  const {design,start,span}=data,sim=createSimulation(design);
  if(!Number.isFinite(start)||!Number.isFinite(span)||span<=0||span>90*DAY+.001)throw Error('Service horizon must be positive and at most 90 days.');
  if(data.firstDay){self.postMessage({result:evaluateService(sim,0,span)});return}
  const begin=Math.max(0,Math.min(sim.duration,start)),end=Math.min(sim.duration,begin+span),totalDays=Math.ceil((end-begin)/DAY);
  const segments=[];let seed=data.initialSeed??sim.serviceSeed(begin),t=begin;
  if(!seed||Math.abs(seed.t-begin)>.001)throw Error('The supplied service inventory does not match the order start time.');
  const initial={aiInputBufferGB:seed.aiBuffer};
  while(t<end-1e-7){
   const size=Math.min(DAY,end-t);
   const day=sim.serviceDay(seed,size);seed=day.end;segments.push(...day.segments);
   t+=size;self.postMessage({progress:{days:Math.ceil((t-begin)/DAY),totalDays}});
  }
  const result=assessServiceSegments(sim.hardware,segments,{start:begin,end,initial,provenance:'Consecutive detailed days carry one initial vehicle inventory. Seed: '+(data.seedProvenance||(begin===0?'launch state':'selected mission-age checkpoint, possibly projected'))+'.'});
  self.postMessage({result});
 }catch(e){self.postMessage({error:e.message})}
};
