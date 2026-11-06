import {inverseSolve} from './design.js';
import {impactOfChange} from './design-impact.js';
import {createSimulation} from './model.js';

const DAY=86400;
const flightChanges=new Set(['network','link','attitude','solarDriver','battery','pv','coating','workload','engine','launcher']);
const cancelled=()=>new DOMException('Design review cancelled','AbortError');
const checkActive=signal=>{if(signal?.aborted)throw cancelled()};

// The worker and the local fallback share this calculation. Progress describes
// actual stages; it does not imply a percentage or change any engineering model.
export async function runDesignChangeTask(request,{signal,onProgress=()=>{},pause,initialDetail}={}){
 const {before,after,mode='installed',nextMode=mode,current,family=null,start:requestedStart=0,currentDay,currentDayStart,includePreview=true}=request;
 async function stage(index,detail){
  checkActive(signal);onProgress({index,detail});
  if(pause)await pause();
  checkActive(signal);
 }
 await stage(0,initialDetail||'Checking design changes, coupled sizing and engineering margins.');
 const baseline=current===undefined?inverseSolve(before,mode):current;
 const assessment=impactOfChange(before,after,mode,nextMode,baseline,family);
 let preview=null;
 if(includePreview&&!assessment.errors.length&&assessment.changes.some(change=>flightChanges.has(change.key))){
  await stage(1,'Simulating the same 24-hour flight window for the current and proposed designs.');
  const currentSim=createSimulation(baseline.hardware),proposedSim=createSimulation(assessment.proposed.hardware);
  const start=Math.max(0,Math.min(requestedStart,Math.min(currentSim.duration,proposedSim.duration)-DAY));
  const currentSummary=currentDay!=null&&currentDayStart===start?currentDay:currentSim.daySummary(start);
  // Give the local fallback a second chance to paint and accept cancellation
  // between the two integrations. Worker computation remains uninterrupted.
  if(pause)await pause();
  checkActive(signal);
  preview={start,current:currentSummary,proposed:proposedSim.daySummary(start)};
 }
 await stage(2,'Preparing the design comparison and margins for review.');
 return {assessment,preview};
}

function yieldForPaint(signal){
 return new Promise((resolve,reject)=>{
  let frame=null,timer=null,watchdog=null,finished=false;
  const cleanup=()=>{
   if(frame!==null)globalThis.cancelAnimationFrame?.(frame);
   clearTimeout(timer);clearTimeout(watchdog);signal?.removeEventListener('abort',abort);
  };
  function finish(){if(finished)return;finished=true;cleanup();resolve()}
  function abort(){if(finished)return;finished=true;cleanup();reject(cancelled())}
  if(signal?.aborted){abort();return}
  signal?.addEventListener('abort',abort,{once:true});
  if(typeof requestAnimationFrame==='function'&&globalThis.document?.visibilityState!=='hidden'){
   // A task after the animation frame lets the newly drawn work surface paint.
   frame=requestAnimationFrame(()=>{frame=null;timer=setTimeout(finish,0)});
   // Backgrounded tabs may suspend frames after the visibility check.
   watchdog=setTimeout(finish,100);
  }else timer=setTimeout(finish,0);
 });
}

/** Evaluate an immutable proposal without blocking the browser's UI thread. */
export function evaluateDesignChange(request,{signal,onProgress=()=>{}}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(cancelled());return}
  let snapshot;
  try{snapshot=structuredClone(request)}catch(error){reject(error);return}
  let worker=null,started=false,fallback=false,settled=false;
  const closeWorker=()=>{
   if(!worker)return;
   worker.onmessage=worker.onerror=worker.onmessageerror=null;
   worker.terminate();worker=null;
  };
  function finish(error,value){
   if(settled)return;
   settled=true;closeWorker();signal?.removeEventListener('abort',abort);
   if(error)reject(error);else resolve(value);
  }
  function abort(){finish(cancelled())}
  const progress=value=>{if(!settled){checkActive(signal);onProgress(value)}};
  function localFallback(){
   if(settled||fallback)return;
   fallback=true;closeWorker();
   runDesignChangeTask(snapshot,{signal,onProgress:progress,pause:()=>yieldForPaint(signal),initialDetail:'Background analysis is unavailable. Checking the design and sizing margins on this device.'})
    .then(value=>finish(null,value),error=>finish(error));
  }
  signal?.addEventListener('abort',abort,{once:true});
  if(typeof Worker!=='function'){localFallback();return}
  try{worker=new Worker(new URL('./design-review-worker.js',import.meta.url),{type:'module'})}
  catch{localFallback();return}
  worker.onmessage=({data})=>{
   if(settled||fallback)return;
   try{
    if(data.ready){
     if(!started){started=true;worker.postMessage(snapshot)}
     return;
    }
    if(data.progress){progress(data.progress);return}
    if(data.error){
     const error=new Error(typeof data.error==='string'?data.error:data.error.message||'Design review failed');
     if(data.error.name)error.name=data.error.name;
     finish(error);return;
    }
    if(Object.hasOwn(data,'result'))finish(null,data.result);
   }catch(error){finish(error)}
  };
  worker.onerror=event=>{
   if(settled||fallback)return;
   event.preventDefault?.();
   // Only module startup failures may fall back. Once the worker has accepted
   // a request, a model/runtime failure is surfaced without retrying it.
   if(!started)localFallback();
   else finish(new Error(event.message||'Design review worker failed'));
  };
  worker.onmessageerror=()=>finish(new Error('The design review result could not be read.'));
 });
}
