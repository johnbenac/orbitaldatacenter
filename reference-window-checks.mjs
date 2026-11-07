// Opening a full reference must warm only its first day, without replaying
// disposal or blocking the UI. The prepared values must equal the live model.
import assert from 'node:assert/strict';
import {Worker as ThreadWorker} from 'node:worker_threads';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {createSimulation} from './dist/model.js';

class BrowserWorker{
 static instances=[];
 constructor(url,options){
  assert.equal(options.type,'module');BrowserWorker.instances.push(this);
  this.thread=new ThreadWorker(`
   const {parentPort,workerData}=require('node:worker_threads');
   globalThis.self={onmessage:null,postMessage:data=>parentPort.postMessage(data)};
   parentPort.on('message',data=>self.onmessage?.({data}));
   import(workerData.url).catch(error=>setImmediate(()=>{throw error}));
  `,{eval:true,workerData:{url:url.href}});
  this.thread.on('message',data=>{if(data.result)this.result=data.result;this.onmessage?.({data})});
  this.thread.on('error',error=>this.onerror?.({message:error.message,preventDefault(){}}));
 }
 postMessage(data){this.request=data;this.thread.postMessage(data)}
 terminate(){this.terminated=true;return this.thread.terminate()}
}
const original=globalThis.Worker;
try{
 const recipe=buildReferenceDesign('redwire-8kw'),h=sizeDesign(recipe),sim=createSimulation(h);
 globalThis.Worker=BrowserWorker;
 let ticks=0;const ticker=setInterval(()=>ticks++,10),stages=[];
 try{await sim.prepareWindow({start:0,instant:3438,scope:'day',onProgress:p=>stages.push(p)})}finally{clearInterval(ticker)}
 const worker=BrowserWorker.instances.at(-1);
 assert.equal(worker.request.closeout,false);assert.ok(worker.terminated);assert.ok(ticks>0,'The UI timer can advance while a reference warms.');
 assert.ok(worker.result.maps.mainDays.every(([day])=>day<=1),'Opening the first window must not replay mission-end history.');
 assert.ok(!stages.some(p=>p.detail?.startsWith('Integrating mission history')),'The first-day window must record its day once, without a redundant history pass or misleading day1of60 progress.');
 assert.ok(stages.some(p=>p.detail==='Mission window prepared.'));
 const baseline=createSimulation(sizeDesign(recipe));
 assert.deepEqual(sim.daySummary(0),baseline.daySummary(0));
 assert.deepEqual(sim.window(0,86400,145),baseline.window(0,86400,145));
 assert.deepEqual(sim.serviceTimeline(0,86400),baseline.serviceTimeline(0,86400));
 assert.deepEqual(sim.at(3438),baseline.at(3438));
 const before=BrowserWorker.instances.length;
 await sim.prepareWindow({start:0,instant:3438,scope:'day'});
 assert.equal(BrowserWorker.instances.length,before,'The prepared day is reusable.');
 const short=createSimulation(sizeDesign({...recipe,missionYears:.001,yearsSupply:.001}));
 await short.prepareDisposal({scope:'day'});
 assert.equal(BrowserWorker.instances.at(-1).request.closeout,true,'Phase F still requests the full closeout path.');
 assert.equal(short.story('deorbit').id,'deorbit');
 const controller=new AbortController();controller.abort();
 await assert.rejects(sim.prepareWindow({start:86400,signal:controller.signal}),{name:'AbortError'});
 console.log('Reference opening: responsive worker, first-day-only preparation, exact numerical parity, cache reuse, cancellation and retained Phase F preparation passed.');
}finally{globalThis.Worker=original}
