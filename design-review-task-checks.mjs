import assert from 'node:assert/strict';
import {Worker as ThreadWorker} from 'node:worker_threads';
import {missionStarter,applyPreset,inverseSolve} from './dist/design.js';
import {siteApproach} from './dist/launch-director.js';
import {impactOfChange} from './dist/design-impact.js';
import {createSimulation} from './dist/model.js';
import {evaluateDesignChange} from './dist/design-review-task.js';

const DAY=86400;
const before=missionStarter('text',{missionYears:.003,yearsSupply:.003});
const after=applyPreset(before,'launcher','starship');
Object.assign(after,siteApproach(after).angles);
const current=inverseSolve(before,'installed');
const request={before,after,mode:'installed',nextMode:'installed',current,family:'launcher',start:2*DAY};
const assessment=impactOfChange(before,after,'installed','installed',current,'launcher');
const currentSim=createSimulation(current.hardware),proposedSim=createSimulation(assessment.proposed.hardware);
const start=Math.max(0,Math.min(request.start,Math.min(currentSim.duration,proposedSim.duration)-DAY));
const expected={assessment,preview:{start,current:currentSim.daySummary(start),proposed:proposedSim.daySummary(start)}};
assert.ok(start>0&&start<DAY,'The short mission exercises the upper window bound.');
const lightRequest={...request,includePreview:false};

function trackedAbort(){
 const controller=new AbortController(),listeners=new Set();
 return {abort:()=>controller.abort(),listeners,signal:{
  get aborted(){return controller.signal.aborted},
  addEventListener(type,fn,options){listeners.add(fn);controller.signal.addEventListener(type,fn,options)},
  removeEventListener(type,fn){listeners.delete(fn);controller.signal.removeEventListener(type,fn)}
 }};
}
class MockWorker{
 static instances=[];
 constructor(url,options){this.url=url;this.options=options;this.terminated=0;MockWorker.instances.push(this)}
 postMessage(data){this.request=data}
 terminate(){this.terminated++}
 emit(data){this.onmessage?.({data})}
 fail(message){this.onerror?.({message,preventDefault(){}})}
}
class BrowserWorker{
 static instances=[];
 constructor(url,options){
  assert.equal(options.type,'module');this.terminated=0;BrowserWorker.instances.push(this);
  this.thread=new ThreadWorker(`
   const {parentPort,workerData}=require('node:worker_threads');
   globalThis.self={onmessage:null,postMessage:data=>parentPort.postMessage(data)};
   parentPort.on('message',data=>self.onmessage?.({data}));
   import(workerData.url).catch(error=>setImmediate(()=>{throw error}));
  `,{eval:true,workerData:{url:url.href}});
  this.thread.on('message',data=>this.onmessage?.({data}));
  this.thread.on('error',error=>this.onerror?.({message:error.message,preventDefault(){}}));
  this.thread.on('messageerror',()=>this.onmessageerror?.());
 }
 postMessage(data){this.thread.postMessage(data)}
 terminate(){this.terminated++;return this.thread.terminate()}
}
const original={Worker:globalThis.Worker,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
try{
 // The fallback yields before computation and between real stages. A tagged
 // cached day proves reuse while retaining all numerical summary fields.
 globalThis.Worker=undefined;
 let frames=0;
 globalThis.requestAnimationFrame=fn=>setTimeout(()=>{frames++;fn(0)},0);
 globalThis.cancelAnimationFrame=clearTimeout;
 const cached={...expected.preview.current,cachedDayMarker:true},fallbackStages=[],fallbackAbort=trackedAbort();
 const fallback=await evaluateDesignChange({...request,currentDay:cached,currentDayStart:start},{signal:fallbackAbort.signal,onProgress:stage=>fallbackStages.push(stage)});
 assert.deepEqual(fallback,{assessment,preview:{...expected.preview,current:cached}});
 assert.deepEqual(fallbackStages.map(stage=>stage.index),[0,1,2]);
 assert.match(fallbackStages[0].detail,/Background analysis is unavailable/);
 assert.ok(frames>=3);assert.equal(fallbackAbort.listeners.size,0);
 const excludedAfter={...before,altitudeKm:before.altitudeKm+1};
 const excluded=await evaluateDesignChange({...request,after:excludedAfter,family:null});
 assert.equal(excluded.preview,null);
 assert.deepEqual(excluded.assessment,impactOfChange(before,excludedAfter,'installed','installed',current,null));
 const invalidAfter={...after,missionYears:0};
 const invalid=await evaluateDesignChange({...request,after:invalidAfter});
 assert.equal(invalid.preview,null);assert.deepEqual(invalid.assessment,impactOfChange(before,invalidAfter,'installed','installed',current,'launcher'));
 console.log('Fallback: exact sizing and matched-day numerics, cached-day reuse, preview guards and paint yields passed.');

 // Exercise the real browser worker module in a Node worker with a tiny
 // browser messaging bridge. A mismatched cached window must be recomputed.
 globalThis.Worker=BrowserWorker;
 const workerStages=[],workerAbort=trackedAbort();
 const result=await evaluateDesignChange({...request,currentDay:{contactCount:-999},currentDayStart:start+1},{signal:workerAbort.signal,onProgress:stage=>workerStages.push(stage)});
 assert.deepEqual(result,expected);
 assert.deepEqual(workerStages.map(stage=>stage.index),[0,1,2]);
 assert.equal(workerAbort.listeners.size,0);assert.equal(BrowserWorker.instances.at(-1).terminated,1);
 console.log('Worker: full Starship review matches the synchronous reference, including bounded 24-hour flight summaries.');

 globalThis.Worker=MockWorker;
 const pre=trackedAbort();pre.abort();const count=MockWorker.instances.length;
 await assert.rejects(evaluateDesignChange(lightRequest,{signal:pre.signal}),{name:'AbortError'});
 assert.equal(MockWorker.instances.length,count);assert.equal(pre.listeners.size,0);
 for(const ready of [false,true]){
  const abort=trackedAbort(),stages=[];
  const pending=evaluateDesignChange(lightRequest,{signal:abort.signal,onProgress:p=>stages.push(p)});
  const worker=MockWorker.instances.at(-1),late=worker.onmessage;
  if(ready)worker.emit({ready:true});
  abort.abort();await assert.rejects(pending,{name:'AbortError'});
  late({data:{progress:{index:2,detail:'stale'}}});late({data:{result:expected}});
  assert.equal(stages.length,0);assert.equal(worker.terminated,1);assert.equal(worker.onmessage,null);assert.equal(abort.listeners.size,0);
 }
 const successAbort=trackedAbort(),source={...lightRequest,after:{...after}},success=evaluateDesignChange(source,{signal:successAbort.signal});
 const successWorker=MockWorker.instances.at(-1);source.after.launcher='falconHeavy';
 successWorker.emit({ready:true});assert.equal(successWorker.request.after.launcher,'starship');
 successWorker.emit({result:{assessment,preview:null}});
 assert.deepEqual(await success,{assessment,preview:null});
 assert.equal(successWorker.terminated,1);assert.equal(successAbort.listeners.size,0);
 for(const runtime of [false,true]){
  const abort=trackedAbort(),stages=[],pending=evaluateDesignChange(lightRequest,{signal:abort.signal,onProgress:p=>stages.push(p)}),worker=MockWorker.instances.at(-1);
  worker.emit({ready:true});
  if(runtime)worker.fail('Model runtime failed');else worker.emit({error:{name:'RangeError',message:'Model range failed'}});
  await assert.rejects(pending,runtime?/Model runtime failed/:{name:'RangeError',message:'Model range failed'});
  assert.equal(stages.length,0,'Calculation failures must not silently retry locally.');
  assert.equal(worker.terminated,1);assert.equal(abort.listeners.size,0);
 }
 const startupAbort=trackedAbort(),startupStages=[],startup=evaluateDesignChange(lightRequest,{signal:startupAbort.signal,onProgress:p=>startupStages.push(p)}),startupWorker=MockWorker.instances.at(-1);
 startupWorker.fail('Module could not load');
 assert.deepEqual(await startup,{assessment,preview:null});
 assert.match(startupStages[0].detail,/Background analysis is unavailable/);
 assert.deepEqual(startupStages.map(stage=>stage.index),[0,2]);
 assert.equal(startupWorker.terminated,1);assert.equal(startupAbort.listeners.size,0);
 globalThis.Worker=class{constructor(){throw new DOMException('Worker unavailable','SecurityError')}};
 assert.deepEqual(await evaluateDesignChange(lightRequest),{assessment,preview:null});
 console.log('Lifecycle: immutable requests, pre-start/in-flight cancellation, stale-message rejection, cleanup, startup fallback and surfaced model failures passed.');
}finally{
 for(const [key,value]of Object.entries(original)){if(value===undefined)delete globalThis[key];else globalThis[key]=value}
}
