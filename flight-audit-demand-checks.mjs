// Exercise the real application scheduling functions. A prepared early window
// must remain idle until an operation actually needs the full mission history.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const app=readFileSync(new URL('./dist/app.js',import.meta.url),'utf8'),DAY=86400;
function excerpt(start,end){
 const a=app.indexOf(start),b=app.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'Application scheduling boundary exists: '+start);
 return app.slice(a,b);
}
const source=[
 excerpt('function audit(){','function packetIsCurrent('),
 excerpt('async function fullAudit(','function auditResult('),
 excerpt('function flightPlayer(){','async function openPreparedCloseout('),
 excerpt('function prepareCloseout(){','function toggleFlight('),
 excerpt('function awaitFlightWindow(','function setTime('),
 excerpt('function advanceFlight(','let clockFrame=')
].join('\n');
function fixture({phase='E',t=3438,projected=false,playing=false,commissioning=false}={}){
 const calls={audits:[],seeks:[],disposal:[],draws:0,results:[],errors:[]},nodes=new Map();
 const sim={audit:null,duration:1827*DAY,ignition:100*DAY,
  story:()=>({instant:3438}),at:()=>({projected:false}),
  disposal:()=>sim.audit?{start:110*DAY,end:111*DAY}:{start:100*DAY,end:101*DAY},
  prepareDisposal:async options=>{calls.disposal.push(options);},
  runAudit(onProgress,{signal}){
   return new Promise((resolve,reject)=>{
    const cancel=()=>reject(new DOMException('Cancelled','AbortError'));
    signal.addEventListener('abort',cancel,{once:true});
    calls.audits.push({onProgress,signal,finish(){signal.removeEventListener('abort',cancel);
     sim.audit={days:1827};resolve(sim.audit);}});
   });
  }
 };
 const context={DAY,sim,view:{phase,t,start:Math.floor(t/DAY)*DAY,scope:'day',speed:1},
  snap:{projected},playing,commissioning:()=>commissioning,
  pendingFlightSeek:null,flightSyncError:'',auditJob:null,auditOwner:null,auditAbort:null,
  auditStatus:'',packetJob:null,packetMessage:'',packetOrderAbort:null,windowThermalCache:null,
  daysig:'',life:null,hardware:{input:{},ai:{}},result:{},modal:null,
  lastTick:0,playDirection:1,AbortController,DOMException,
  dayStart:value=>Math.floor(value/DAY)*DAY,
  windowStartFor:(_t,start)=>start,
  clamp:(value,lo,hi)=>Math.max(lo,Math.min(hi,value)),
  refreshSamples(){},draw(){calls.draws++;},estimateLife:()=>({}),
  setTime(...args){calls.seeks.push(args);},toast:message=>calls.errors.push(message),
  $:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);},
  fmt:String,esc:String,time:String,icon:()=>'',flightRange:()=>[0,DAY],
  playbackBounds:()=>[0,sim.duration],scenario:()=>({view:{...context.view}}),
  designName:()=> 'Test reference',
  open(_title,_html,key){context.modal=key;},close(){context.modal=null;},
  auditResult:value=>calls.results.push(value),showExportError:error=>calls.errors.push(error.name)
 };
 runInNewContext(source,context);
 return {context,calls,finish:async()=>{
  const job=context.auditJob;assert(job);calls.audits.at(-1).finish();await job;
  // Consumers of the shared job may have their own asynchronous continuation.
  await Promise.resolve();await Promise.resolve();
 }};
}

for(const playing of [false,true])for(const t of [3438,DAY,60*DAY-1]){
 const {context:c,calls}=fixture({playing,t});
 c.prepareFlight();c.prepareFlight();
 assert.equal(calls.audits.length,0,'An early prepared window does not start a full mission worker');
 assert.equal(c.view.t,t);assert.equal(c.playing,playing);assert.equal(c.pendingFlightSeek,null);
 assert.match(c.flightPlayer(),/Selected flight window ready/);
 assert.doesNotMatch(c.flightPlayer(),/resolving mission|Chronological mission complete/);
}

for(const options of [{t:60*DAY},{t:80*DAY},{projected:true}]){
 const f=fixture(options),c=f.context,requested=c.view.t;
 c.prepareFlight();
 assert.equal(f.calls.audits.length,1,'Late or projected flight still requests chronological history');
 assert.equal(c.pendingFlightSeek.t,requested);assert.equal(c.view.t,3438);
 c.prepareFlight();assert.equal(f.calls.audits.length,1,'Repeated demand reuses the active audit');
 f.calls.audits[0].onProgress({days:1,totalDays:1827});
 assert.match(c.flightPlayer(),/Integrating mission day 1 of 1827/);
 await f.finish();
 assert.equal(c.pendingFlightSeek,null);
 assert(f.calls.seeks.some(([t,clear])=>t===requested&&clear===true),
  'The requested instant is applied only after chronological history is available');
}

{
 const f=fixture({playing:true}),c=f.context,target=61*DAY;
 assert.equal(c.awaitFlightWindow(target,61*DAY),true);
 assert.equal(c.playing,false);assert.equal(c.pendingFlightSeek.t,target);
 assert.equal(f.calls.audits.length,1);await f.finish();
 assert(f.calls.seeks.some(([t,,start])=>t===target&&start===61*DAY));
}
{
 const f=fixture(),c=f.context;
 c.pendingFlightSeek={t:2*DAY,start:2*DAY};c.prepareFlight();
 assert.equal(f.calls.audits.length,1,'An existing pending request is not suppressed');
 await f.finish();assert.equal(f.calls.seeks[0][0],2*DAY);
}
{
 const f=fixture({playing:true,t:60*DAY-.5}),c=f.context;
 c.advanceFlight(1000);
 assert.equal(c.playing,false);assert.equal(c.pendingFlightSeek.t,60*DAY+.5);
 assert.equal(f.calls.audits.length,1,'Playback retains the chronological 60-day boundary');
 assert.equal(c.view.t,60*DAY-.5,'Playback does not display an unverified late instant');
 await f.finish();
}

for(const options of [{phase:'D'},{commissioning:true}]){
 const {context:c,calls}=fixture(options);c.prepareFlight();assert.equal(calls.audits.length,0);
}
{
 const {context:c,calls}=fixture({t:80*DAY});c.sim.audit={days:1827};c.prepareFlight();
 assert.equal(calls.audits.length,0);assert.match(c.flightPlayer(),/Chronological mission complete/);
}
{
 const f=fixture({phase:'F',t:100.5*DAY}),c=f.context;
 c.prepareFlight();assert.equal(f.calls.audits.length,0);
 const closeout=c.prepareCloseout();assert.equal(f.calls.audits.length,1,
  'Phase F still requests the complete preceding history');
 await f.finish();await closeout;
 assert(f.calls.disposal.length>0);assert.equal(c.view.t,110.5*DAY,
  'Closeout reuses the completed history and preserves the selected burn fraction');
}
{
 const f=fixture(),c=f.context,request=c.fullAudit();
 assert.equal(f.calls.audits.length,1,'An explicit sweep still runs from an early paused window');
 await f.finish();await request;assert.equal(f.calls.results.length,1);
}
{
 const {context:c,calls}=fixture(),request=c.fullAudit(true);
 assert.equal(calls.audits.length,1,'A PDR still explicitly requests the complete sweep');
 c.auditAbort.abort();await request;
 assert(calls.audits[0].signal.aborted);assert(calls.errors.includes('AbortError'));
}
console.log('PASS flight audit demand: idle early windows, truthful status, shared late/projected '+
 'history, pending seeks, 60-day playback boundary, explicit sweep/PDR, cancellation and Phase F.');
