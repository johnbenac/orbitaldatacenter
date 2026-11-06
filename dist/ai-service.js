import {acceptsArtifact} from './ai-purpose.js';
import {DEPLOY_END_S} from './commissioning-clock.js';
// Customer work is admitted at Earth, then replayed against the selected vehicle's
// acquisition-, power- and activity-limited service opportunities. Resources are
// reserved in chronological FCFS order. One clock covers ingress, work and egress.
import {serviceDefaults,relayGate,relayBoundaries} from './ai-service-inputs.js';
import {serviceArchitecture,allocatedRelayRates} from './service-architecture.js';
export {serviceControls,serviceDefaults} from './ai-service-inputs.js';
const DAY=86400,MAX_DAYS=90,INF=Infinity;
const num=x=>Number.isFinite(x)?x:null;
const ratio=(x,y)=>y>0?x/y:null;
const metric=(key,label,value,unit,note='')=>({key,label,value:num(value)??(typeof value==='string'?value:null),unit,note});
export const serviceSources=[
 ['mlperf-inference','MLCommons · MLPerf Inference v5','https://mlcommons.org/2025/04/llm-inference-v5/','Interactive inference time-to-first-token and time-per-output-token metrics.'],
 ['mlperf-training','MLCommons · MLPerf Training','https://mlcommons.org/benchmarks/training/','Time to a specified quality target for a defined task and dataset.'],
 ['opus','IETF RFC 6716 · Opus','https://www.rfc-editor.org/rfc/rfc6716.html','§2.1 and §2.1.4. Encoded bitrates and packet durations; conversational latency also includes endpointing, inference and playout.'],
 ['agent-study','OpenAI · Navier–Stokes report','https://openai.com/index/navier-stokes-solution/','8 September 2026. Earth-based example: about 88 h to resolution and a further 17 h to Lean verification. The Navier–Stokes effort used approximately 130 billion output tokens and 2.7 million messages across agents.'],
 ['claude-study','Anthropic · long-running scientific computing','https://www.anthropic.com/research/long-running-claude','Research workloads can include external tools, tests and human intervention.'],
 ['peft','Hugging Face · PEFT checkpoint format','https://huggingface.co/docs/peft/developer_guides/checkpoint','Adapter weights, configuration and a compatible base model are required to reconstruct a PEFT model.'],
 ['optimizer','NVIDIA Megatron Core · distributed optimizer','https://docs.nvidia.com/megatron-core/developer-guide/latest/user-guide/features/dist_optimizer.html','Parameter, gradient, optimizer and sharded state depend on precision and implementation.'],
 ['parallel','Narayanan et al. · Megatron-LM','https://arxiv.org/abs/2104.04473','Training throughput depends on tensor, pipeline and data parallelism, placement and communication.'],
 ['suncatcher','Google Research · Project Suncatcher system study','https://research.google/blog/exploring-a-space-based-scalable-ai-infrastructure-system-design/','Space-based machine learning infrastructure system study; cluster performance requires system-level evidence.'],
 ['laser','Starlink · technology','https://starlink.com/technology','The 25 Gbit/s mini-laser design reference is an intersatellite hardware figure. A customer goodput/availability contract is separate.'],
 ['filing','FCC Space Bureau · DA 26-113','https://docs.fcc.gov/public/attachments/DA-26-113A1.pdf','Public notice accepting the orbital-data-center application for filing and seeking comment. It supplies no commercial relay reservation.']
].map(([id,title,url,locator])=>({id,title,url,locator,kind:'Earth-service reference'}));

class Heap {
 constructor(){this.a=[];this.i=0}
 add(t,fn){if(!Number.isFinite(t))return;const a=this.a,x={t,fn,i:this.i++};let n=a.length;a.push(x);while(n){const p=(n-1)>>1;if(!earlier(x,a[p]))break;a[n]=a[p];n=p}a[n]=x}
 pop(){const a=this.a,first=a[0],last=a.pop();if(!a.length)return first;let n=0;while(2*n+1<a.length){let k=2*n+1;if(k+1<a.length&&earlier(a[k+1],a[k]))k++;if(!earlier(a[k],last))break;a[n]=a[k];n=k}a[n]=last;return first}
}
const earlier=(a,b)=>a.t<b.t||a.t===b.t&&a.i<b.i;
function indexGE(values,v){let lo=0,hi=values.length;while(lo<hi){const m=(lo+hi)>>>1;if(values[m]<v)lo=m+1;else hi=m}return lo}
class Calendar{
 constructor(rows,rate){
  this.rows=[];this.ends=[];this.prefix=[];let cum=0;
  for(const r of rows){const speed=rate(r);if(!(speed>0&&Number.isFinite(speed))||r.end<=r.start)continue;this.rows.push({start:r.start,end:r.end,speed,r});this.ends.push(r.end);cum+=(r.end-r.start)*speed;this.prefix.push(cum)}
  this.total=cum;this.free=-INF;
 }
 integral(t){const i=indexGE(this.ends,t),b=this.rows[i],base=this.prefix[i-1]||0;return b?base+Math.max(0,t-b.start)*b.speed:this.total}
 finish(t,units){if(units<=0)return t;const target=this.integral(t)+units;if(target>this.total+1e-10||!Number.isFinite(t))return INF;const i=indexGE(this.prefix,Math.min(this.total,target)),b=this.rows[i];return b?Math.max(t,b.start+(target-(this.prefix[i-1]||0))/b.speed):INF}
 reserve(t,units,delay=false){const start=Math.max(t,this.free),end=this.finish(start,units);if(units>0)this.free=end;if(!Number.isFinite(end))return INF;const row=this.rows[indexGE(this.ends,end-1e-8)]?.r;return end+(delay&&row?row.oneWay:0)}
}
function percentile(entries,p){
 const list=entries.filter(([v,w])=>Number.isFinite(v)&&w>0).sort((a,b)=>a[0]-b[0]);if(!list.length)return null;
 const threshold=Math.max(1,Math.ceil(list.reduce((s,[,w])=>s+w,0)*p));let n=0;for(const [v,w] of list){n+=w;if(n>=threshold)return v}return null;
}
function rates(d,h,raw){
 const rows=[],network={directSeconds:0,directServiceSeconds:0,relaySeconds:0,route:d.serviceRoute,upGB:0,downGB:0,stations:[],maxOutageS:0};
 const architecture=h.serviceArchitecture||serviceArchitecture(h),terminal=architecture.terminal,relayRates=allocatedRelayRates(h);
 const efficiency=Math.max(0,Math.min(1,d.codingEff)),directUpCap=architecture.route.directCustomerUplinkCapMbps;
 let outage=0,busKWh=0,itKWh=0;const stations=new Set();
 for(const seg of raw){
  const dt=seg.end-seg.start;if(!(dt>0))continue;
  if(seg.station){network.directSeconds+=dt;stations.add(seg.station)}
  const cuts=d.serviceRoute!=='direct'?[seg.start,...relayBoundaries(seg.start,seg.end,d),seg.end]:[seg.start,seg.end];
  for(let i=1;i<cuts.length;i++){
   const start=cuts[i-1],end=cuts[i],n=end-start,relay=d.serviceRoute!=='direct'&&relayGate((start+end)/2,d);
   const commissioned=seg.commissioned??seg.serviceAvailable??(start>=DEPLOY_END_S);
   const ref=seg.routePoweredFraction??seg.poweredSupport??1,routePowered=commissioned&&Number.isFinite(ref)&&ref>=1-1e-6;
   const selectedRelay=relay&&(seg.relayOn??true),useRelay=selectedRelay&&routePowered,allowDirect=routePowered&&(d.serviceRoute==='direct'||d.serviceRoute==='hybrid'&&!selectedRelay);
   // Supplied intervals can reduce installed capacity, never enlarge it. A
   // fractional electrical allocation cannot maintain the terminal's carrier.
   const directTerminal=String(seg.payloadTerminal||seg.groundLink||d.link||'auto').toLowerCase();
   const directLine=/optic|laser|auto/.test(directTerminal)?terminal.directOpticalLineMbps:/s-band|sband|^s$/.test(directTerminal)?terminal.directSLineMbps:terminal.directKaLineMbps;
   const directDownCap=Math.min(directLine*efficiency,Number.isFinite(d.linkCapMbps)?Math.max(0,d.linkCapMbps):Infinity);
   const upLimit=useRelay?relayRates.upMbps:allowDirect?Math.min(Math.max(0,seg.upMbps||0),directUpCap):0;
   const downLimit=useRelay?relayRates.downMbps:allowDirect?Math.min(Math.max(0,seg.downMbps||0),directDownCap):0;
   const up=Math.min(upLimit,Number.isFinite(seg.routeUpMbps)?Math.max(0,seg.routeUpMbps):upLimit);
   const down=Math.min(downLimit,Number.isFinite(seg.routeDownMbps)?Math.max(0,seg.routeDownMbps):downLimit);
   const oneWay=d.groundEdgeMs/1000+(useRelay?d.relayRttMs/2000:(seg.rangeKm||0)/299792.458);
   rows.push({...seg,start,end,up:Math.max(0,up)*1e6/8,down:Math.max(0,down)*1e6/8,oneWay,active:Number.isFinite(seg.capacityUnitsPerSec)&&h.ai.activeUnitsPerSec>0?Math.max(0,Math.min(1,seg.capacityUnitsPerSec/h.ai.activeUnitsPerSec)):Math.max(0,seg.activeFraction||0),compute:Math.max(0,seg.aiUnitRate||0)});
   if(useRelay&&(up>0||down>0))network.relaySeconds+=n;
   if(allowDirect&&up>0&&down>0)network.directServiceSeconds+=n;
   if(up>0&&down>0)outage=0;else{outage+=n;network.maxOutageS=Math.max(network.maxOutageS,outage)}
   network.upGB+=Math.max(0,up)*n/8000;network.downGB+=Math.max(0,down)*n/8000;
  }
  busKWh+=dt*(seg.servedLoadKW??seg.loadKW??0)/3600;itKWh+=dt*(seg.itKW||0)/3600;
 }
 network.stations=[...stations];return {rows,network,busKWh,itKWh}
}
export function artifactBudget(design){
 const d={...serviceDefaults,...design},pre=d.aiPurpose==='pretrain',params=(pre?d.pretrainParamsB:d.paramsB)*1e9;
 const kind=d.artifactKind,bits=d.artifactBits??16,fraction=d.trainableFraction??.001;
 const fullGB=params*bits/8e9,adapterGB=params*fraction*2/1e9,restartGB=params*d.checkpointBytesPerParam/1e9;
 const corpusGB=(pre?(d.trainingTokensB||0):(d.fineTuneTokensM||0)/1000)*d.corpusTokenBytes;
 return {kind,parameters:params,precisionBits:bits,fullGB,adapterGB,restartGB,bf16GB:params*2/1e9,fourBitGB:params*.5/1e9,bytesGB:kind==='adapter'?adapterGB:kind==='restart'?restartGB:fullGB,corpusGB,requiredCorpusGB:d.datasetGB>0?d.datasetGB:corpusGB,compatible:acceptsArtifact(d)};
}

function inference(d,h,a,rows,start,end){
 const up=new Calendar(rows,r=>Math.min(r.up,Math.max(0,h.diskWriteGBs)*1e9)),down=new Calendar(rows,r=>Math.min(r.down,Math.max(0,h.diskReadGBs)*1e9));
 const active=new Calendar(rows,r=>r.active),cores=new Calendar(rows,r=>r.active*d.hostCores),disk=new Calendar(rows,r=>r.active*h.diskReadGBs*1e9);
 const purpose=d.aiPurpose,voice=purpose==='voice',text=purpose==='text',agent=purpose==='agents',batch=purpose==='batch';
 const slots=Math.max(1,Math.floor(Math.min(d.serviceConcurrency,h.sessions||1))),steps=agent?Math.max(1,Math.round(d.agentSerialSteps)):1;
 const fanout=agent?Math.max(1,Math.round(d.agentFanout??1)):1;
 const workers=agent?Math.max(1,Math.min(fanout,Math.floor((a.agentWorkerSlots??h.sessions)/slots))):1;
 const waves=Math.ceil(fanout/workers),peerBytes=a.internalBytesPerTask??fanout*steps*(d.agentMessageKB??0)*1000;
 const fabricRate=a.fabricSecondsPerTask>0?peerBytes/a.fabricSecondsPerTask:(h.serviceArchitecture||serviceArchitecture(h)).fabric.effectivePerWorkerGbps*1e9/8;
 const fabric=new Calendar(rows,r=>r.active*fabricRate);
 const burstRate=agent?(a.modelOnlyUnitsPerSec??(h.tokensPerSec*a.fabricEfficiency/(d.outputTokens*steps*fanout))):a.activeUnitsPerSec;
 const modelCritical=agent?(a.serialModelSeconds??INF)*waves/Math.max(1,a.agentWaves??1):batch?0:(h.ttfSeconds+d.outputTokens/Math.max(1e-30,h.perUserTps))*(voice?1.35:1);
 const unitSec=Math.max(slots/Math.max(1e-30,burstRate),modelCritical);
 const promptShare=Math.min(.95,Math.max(.001,h.ttfSeconds/Math.max(unitSec,1e-12)));
 const packets=voice?Math.max(1,Math.ceil(d.voiceTurnSeconds*1000/d.audioChunkMs)):text?Math.max(1,Math.round(d.outputTokens)):1;
 const offerSpacing=3600/d.serviceOffersPerHour;
 const offers=Math.max(0,Math.ceil((end-start)/offerSpacing-1e-10)),maxGroups=agent?Math.max(160,Math.min(100000,Math.floor(350000/(2+steps+d.toolsPerTask*4)))):100000,streamCheckpoints=Math.max(4,Math.min(64,Math.floor(380000/Math.max(1,Math.min(offers,maxGroups)))));
 const groupSize=Math.max(1,Math.ceil(offers/maxGroups)),groups=[],heap=new Heap(),waiting=[];
 let peerBytesSent=0,waitHead=0,running=0,bufferUsed=0,inputUsed=0,peakBufferGB=0,blockedByBuffer=0,localToolsFinished=0,remoteToolsFinished=0,humanReviewsFinished=0;
 const outCapacity=Math.max(0,(h.usableTB*1000-a.requiredStorageGB)*1e9),inputCap=Math.max(0,a.inputCapacityGB*1e9);
 const admit=(t,fn)=>{if(t<=end)heap.add(t,fn)};
 const slower=(n,count)=>Math.min(n,Math.max(1,count));
 function claim(t,bytes,j){if(bytes>outCapacity-bufferUsed+1e-6){j.full=true;blockedByBuffer+=j.count;return false}
  bufferUsed+=bytes;peakBufferGB=Math.max(peakBufferGB,bufferUsed/1e9);return true}
 function upload(t,n){return up.reserve(t,n,true)}
 function download(t,n){return down.reserve(t,n,true)}
 function unlockLane(t,j){running-=j.lanes;dispatch(t)}
 function finishJob(j,t){j.finish=t}
 function dispatch(t){
  while(waitHead<waiting.length&&running<slots){
   const j=waiting[waitHead++];inputUsed-=j.count*a.inputBytesPerUnit;j.lanes=slower(slots-running,j.count);running+=j.lanes;
   const workScale=j.count/j.lanes;
   if(!a.fit||!(burstRate>0))continue;
   if(agent){agentStep(j,t,0,workScale);continue}
   const workStart=t,prefill=active.finish(t,unitSec*workScale*(batch?0:promptShare));
   const allReady=active.finish(workStart,unitSec*workScale);
   if(!Number.isFinite(prefill))continue;
   admit(allReady,()=>unlockLane(allReady,j));
   const chunks=Math.min(packets,streamCheckpoints),one=packets===1?1:1/packets;
   let previousFraction=0;
   for(let k=1;k<=chunks;k++){
    const f=chunks===1?1:k===1?one:one+(1-one)*(k-1)/(chunks-1),prev=previousFraction;previousFraction=f;
    const ready=batch?allReady:active.finish(prefill,(1-promptShare)*unitSec*workScale*f);
    const n=(f-prev)*j.outputBytes;
    admit(ready,()=>{
     if(j.full||!claim(ready,n,j))return;
     const received=download(ready,n);
     if(received<=end)admit(received,()=>{bufferUsed=Math.max(0,bufferUsed-n)});
     if(k===1){j.first=received+(voice?d.voicePlaybackBufferMs/1000:0);j.maxGap=0;
      if(voice&&Number.isFinite(j.first)){
       const attempt=j.first+Math.min(1,d.voiceTurnSeconds/2);
       admit(attempt,()=>{
        // Counterfactual cancellation probe. The ordinary reply remains in the throughput cohort.
        const there=up.reserve(attempt,d.voiceAudioKbps*d.audioChunkMs/8*j.count,true);
        admit(there,()=>{const back=down.reserve(there,64*j.count,true);j.interrupt=back+d.voicePlaybackBufferMs/1000-attempt});
       });
      }
     }else if(Number.isFinite(received)&&Number.isFinite(j.last)){
      // Mean inter-token/packet cadence inside a chunk; the physical outage is never amortized away.
      const represented=Math.max(1,(f-prev)*packets),elapsed=received-j.last;
      j.maxGap=Math.max(j.maxGap,elapsed/represented,gapBetween(j.last,received));
     }
     if(voice&&Number.isFinite(received)){
      const media=(f-prev)*d.voiceTurnSeconds,arrival=k===1?j.first:received;
      const stall=k===1?0:Math.max(0,arrival-j.playoutEnd);
      j.maxStall=Math.max(j.maxStall||0,stall);j.playoutEnd=Math.max(j.playoutEnd||0,arrival)+media;
     }
     j.last=received;
     if(k===chunks&&Number.isFinite(received))finishJob(j,voice?j.playoutEnd:received);
    });
   }
  }
 }
 const outages=[];
 for(const r of rows)if(r.down<=0){const last=outages.at(-1);if(last&&Math.abs(last.end-r.start)<1e-5)last.end=r.end;else outages.push({start:r.start,end:r.end})}
 const ends=outages.map(o=>o.end);
 function gapBetween(t0,t1){let max=0;for(let i=indexGE(ends,t0);i<outages.length&&outages[i].start<t1;i++)max=Math.max(max,Math.min(outages[i].end,t1)-Math.max(outages[i].start,t0));return max}
 function agentStep(j,t,index,workScale){
  const modelEnd=active.finish(t,unitSec*workScale/steps);
  admit(modelEnd,()=>{
   const from=Math.floor(index*d.toolsPerTask/steps),to=Math.floor((index+1)*d.toolsPerTask/steps);
   function tool(t,k){
    if(k>=to){
     if(index+1<steps){agentStep(j,t,index+1,workScale);return}
     function release(at){unlockLane(at,j);const bytes=a.outputBytesPerUnit*j.count;if(claim(at,bytes,j)){const recv=download(at,bytes);j.finish=recv;admit(recv,()=>{bufferUsed=Math.max(0,bufferUsed-bytes)})}}
     if(d.humanSteeringS>0){const ask=download(t,a.outputBytesPerUnit*j.count);admit(ask+d.humanSteeringS,()=>{const answer=upload(ask+d.humanSteeringS,a.inputBytesPerUnit*j.count);admit(answer,()=>{humanReviewsFinished+=j.count;release(answer)})})}else release(t);
     return;
    }
    const remote=Math.floor((k+1)*fanout*d.earthToolFraction+1e-9)-Math.floor(k*fanout*d.earthToolFraction+1e-9),local=fanout-remote;
    let pending=(remote>0?1:0)+(local>0?1:0);const join=at=>{if(--pending===0)tool(at,k+1)};
    if(remote){
     const toEarth=download(t,Math.max(1,d.toolIOMB*5e5)*j.count*remote);
     const executed=toEarth+d.toolRttS*Math.ceil(remote/workers);admit(executed,()=>{const back=upload(executed,Math.max(1,d.toolIOMB*5e5)*j.count*remote);admit(back,()=>{remoteToolsFinished+=j.count*remote;join(back)})});
    }
    if(local){
     const cpu=Math.max(cores.reserve(t,d.toolCpuSeconds*j.count*local),active.finish(t,d.toolCpuSeconds*Math.ceil(local/Math.min(workers,d.hostCores))));
     admit(cpu,()=>{const io=disk.reserve(cpu,d.toolIOMB*1e6*j.count*local);admit(io,()=>{localToolsFinished+=j.count*local;join(io)})});
    }
   }
   if(peerBytes>0){
    const bytes=peerBytes*j.count/steps,exchanged=fabric.reserve(modelEnd,bytes);
    admit(exchanged,()=>{peerBytesSent+=bytes;tool(exchanged,from)});
   }else tool(modelEnd,from);
  });
 }
 for(let i=0;i<offers;i+=groupSize){
  const count=Math.min(groupSize,offers-i),arrive=start+i*offerSpacing,scheduled=arrive+(count-1)*offerSpacing;
  const byteFactor=batch?1+(count%2?(i%2?1:-1)*d.batchResultSwing/count:0):1;
  const j={count,outputBytes:a.outputBytesPerUnit*count*byteFactor,arrive,deadline:arrive+d.serviceDeadlineS,first:INF,finish:INF,maxGap:INF,interrupt:INF};groups.push(j);
  admit(scheduled,()=>{if(a.inputBytesPerUnit>inputCap||!a.fit)return;
   const launch=scheduled+(voice?(d.vadEndpointMs+d.audioChunkMs)/1000:0);
   const received=upload(launch,a.inputBytesPerUnit*count);
   admit(received,()=>{const bytes=count*a.inputBytesPerUnit;if(inputUsed+bytes>inputCap){blockedByBuffer+=count;return}inputUsed+=bytes;waiting.push(j);dispatch(received)});
  });
 }
 while(heap.a.length){const e=heap.pop();if(e.t>end)break;e.fn()}
 let complete=0,deadline=0,sla=0,expired=0,firstCount=0;
 const times=[],firsts=[],gaps=[],interrupts=[],cadences=[];
 for(const j of groups){
  const delivered=j.finish<=end&&!j.full,first=j.first-j.arrive;
  if(j.first<=end){firsts.push([first,j.count]);firstCount+=j.count}
  if(delivered){
   complete+=j.count;times.push([j.finish-j.arrive,j.count]);if(j.finish<=j.deadline)deadline+=j.count;
   if(text||voice)gaps.push([j.maxGap,j.count]);
   const streamRate=d.outputTokens>1&&j.finish>j.first?(d.outputTokens-1)/(j.finish-j.first):INF;
   if(text&&Number.isFinite(streamRate))cadences.push([streamRate,j.count]);
   if(j.finish<=j.deadline&&(!text||first<=d.ttftTargetS&&j.maxGap<=d.streamGapTargetS&&streamRate>=d.targetStreamTps)&&(!voice||first<=d.voiceFirstAudioTargetS&&j.maxStall<=d.voicePlaybackBufferMs/1000&&j.interrupt<=d.voiceInterruptionTargetS))sla+=j.count;
  }else if(j.deadline<=end)expired+=j.count;
  if(voice&&Number.isFinite(j.interrupt))interrupts.push([j.interrupt,j.count]);
 }
 const q=agent?d.agentVerifyFraction:batch?d.batchQualityFraction:d.liveQualityFraction,qualified=complete*q,onTime=sla*q;
 const latency={p50:percentile(times,.5),p95:percentile(times,.95),p99:percentile(times,.99),p95First:percentile(firsts,.95),p95MaxGap:percentile(gaps,.95),p95Interrupt:percentile(interrupts,.95),p05StreamTps:percentile(cadences,.05),firstCount};
 const key=text?'slaTurns':voice?'audibleTurns':batch?'qualifiedItems':'verifiedTasks',label=text?'Expected accepted turns meeting Earth text SLA':voice?'Expected intelligible turns meeting audio SLA':batch?'Expected accepted items by deadline':'Expected verified tasks by deadline';
 const metrics=[metric(key,label,onTime,a.unit,'All offers are included; unfinished, late or failed work earns zero.'),metric('offered','Offered on Earth',offers,a.unit),metric('received','Complete results received',complete,a.unit),metric('unfinished','Not returned at horizon',offers-complete,a.unit),metric('expired','Overdue without result',expired,a.unit),metric('late','Returned after deadline',complete-deadline,a.unit)];
 if(text||voice)metrics.push(metric(text?'ttftP95':'firstAudibleP95',text?'Earth TTFT · p95':'Speech end to first audible reply · p95',latency.p95First,'s','Among offers receiving a first response.'),metric('gapP95',voice?'Worst audio gap per reply · p95':'Worst streaming gap per turn · p95',latency.p95MaxGap,'s'));
 if(text)metrics.push(metric('streamRateP05','Received sustained text per stream · p05',latency.p05StreamTps,'tok/s','From first to last token among completed multi-token responses.'));
 if(text||voice)metrics.push(metric('qualityFraction','Assumed useful response acceptance',100*q,'%','Supply a task-matched evaluation or intelligibility measurement. Success is an expectation across all offered turns, not a certified QoE.'));
 if(voice)metrics.push(metric('voiceStallP95','Worst playout stall per completed turn · p95',percentile(groups.filter(j=>j.finish<=end&&!j.full).map(j=>[j.maxStall||0,j.count]),.95),'s'),metric('interruptP95','Interruption to audible silence · p95',latency.p95Interrupt,'s','Counterfactual barge-in probes; full response is retained to measure normal service.'));
 if(agent||batch)metrics.push(metric('completionP95','End-to-end completion · p95',latency.p95,'s','Among fully received results.'),metric('qualityFraction','Assumed acceptance calibration',q*100,'%','Expected credit uses the entered verifier/quality fraction.'));
 if(agent)metrics.push(metric('agentWorkers','Provisioned worker slots per assignment',workers,'model streams','Equal-share allocation across admitted campaigns; independent of offered agent fan-out.'),metric('agentWaves','Successive model waves per search stage',waves,'waves'),metric('searchTokensPerTask','Internal decoded tokens per assignment',fanout*steps*d.outputTokens,'tok','Includes all search branches before a single final result is eligible for delivery.'),metric('peerTrafficPerTask','Peer messaging per assignment',peerBytes/1e6,'MB'),metric('internalPeerTraffic','Completed peer exchanges in window',peerBytesSent/1e9,'GB'),metric('agentCriticalS','Minimum active model and peer time per assignment',unitSec+(a.fabricSecondsPerTask??0),'s','Before tool blocking, human review, Earth transfer and operational outages.'),metric('localTools','Completed onboard tool calls',localToolsFinished,'calls'),metric('earthTools','Completed Earth tool round trips',remoteToolsFinished,'calls'),metric('toolCpu','Onboard CPU work for completed tools',localToolsFinished*d.toolCpuSeconds,'core·s'),metric('humanReviews','Completed human-steering exchanges',humanReviewsFinished,'reviews'));
 if(batch)metrics.push(metric('smallResult','Small result size',d.batchResultMB*(1-d.batchResultSwing),'MB'),metric('largeResult','Large result size',d.batchResultMB*(1+d.batchResultSwing),'MB','Deterministic alternating result sizes preserve the configured mean.'));
 return {offers,completed:complete,qualified,onTime,expired,primaryKey:key,latency,metrics,peakBufferGB,blockedByBuffer,groupSize,staging:{inputBytesPerUnit:a.inputBytesPerUnit,outputBytesPerUnit:a.outputBytesPerUnit},notes:[groupSize>1?'All offers are counted in '+groupSize+'-offer cohorts. Each cohort is released at its last arrival and checked against its earliest deadline; request timing is a planning approximation.':'Every deterministic Earth arrival is represented.',text||voice?'Streams use up to '+streamCheckpoints+' checkpoints per response. Gaps include contiguous link outages and mean token or packet spacing within each checkpoint.':'Local tool and link queues follow first-come order.']};
}

function training(d,h,a,rows,start,end,initial){
 const up=new Calendar(rows,r=>Math.min(r.up,h.diskWriteGBs*1e9)),down=new Calendar(rows,r=>Math.min(r.down,h.diskReadGBs*1e9));
 const processing=new Calendar(rows,r=>Math.max(0,Number.isFinite(r.capacityUnitsPerSec)?r.capacityUnitsPerSec:r.active*a.activeTrainingTps));
 const wanted=a.trainingGoalTokens,art=artifactBudget(d),goal=d.aiPurpose==='pretrain'?'Pretraining order':'Fine-tuning order';
 Object.assign(art,{bytesGB:a.artifactGB,requiredCorpusGB:a.corpusGB,kind:d.artifactKind,compatible:a.artifactValid&&(d.artifactKind==='full'||(d.aiPurpose==='pretrain'?d.artifactKind==='restart':d.baseCompatible==='yes'))});
 // Start a new, independent customer run. Only identified staged corpus bytes carry over;
 // unrelated inference prompts or a previously trained artifact cannot earn credit.
 const staged=Math.min(a.corpusGB,Math.max(0,initial?.aiCorpusStagedGB??initial?.aiInputBufferGB??a.preloadedGB??0));
 const required=Math.max(0,a.corpusGB-staged),arrival=up.reserve(start,required*1e9,true);
 const begin=required>0?arrival:start,ready=a.fit?processing.finish(begin,wanted):INF;
 const writeS=h.diskWriteGBs>0?a.artifactGB/h.diskWriteGBs:INF,release=ready+writeS;
 const receipt=art.compatible?down.reserve(release,a.artifactGB*1e9,true):INF;
 const consumed=Number.isFinite(begin)?Math.min(wanted,Math.max(0,processing.integral(end)-processing.integral(begin))):0;
 const physicallyReturned=Number.isFinite(receipt)&&receipt<=end,calibrated=d.trainingCalibration==='measured',passes=calibrated&&d.validationObserved>=d.validationTarget;
 const deadlineS=d.trainingBudgetDays*DAY,returnDeadlineS=(d.artifactReturnHours??24)*3600,returnDelay=physicallyReturned?receipt-release:INF;
 const withinOrder=physicallyReturned&&receipt-start<=deadlineS,withinReturn=physicallyReturned&&returnDelay<=returnDeadlineS;
 const qual=physicallyReturned&&passes,success=qual&&withinOrder&&withinReturn,requiredMeanMbps=a.artifactGB*8000/returnDeadlineS;
 let receivedBytes=0;
 if(Number.isFinite(release)&&release<end&&art.compatible)for(const slot of down.rows){
  const from=Math.max(slot.start,release),until=Math.min(slot.end,end-slot.r.oneWay);
  if(until>from)receivedBytes+=(until-from)*slot.speed;
 }
 const partial=Math.min(a.artifactGB,receivedBytes/1e9);
 const metrics=[
  metric('deliveredRun',goal+' accepted on Earth',!withinOrder||!withinReturn?0:calibrated?Number(success):null,'run','Requires a compatible artifact, matched validation and receipt within the training-order budget.'),
  metric('corpusStaged','Corpus available at order start',staged,'GB'),metric('missingCorpus','Corpus to upload',required,'GB'),
  metric('trainingTokens','Tokens processed in window',consumed/1e9,'billion tok'),metric('targetTokenBudget','Specified training budget',wanted/1e9,'billion tok'),
  metric('memoryMargin','Training memory headroom',a.memoryMarginGB,'GB'),metric('storageMargin','Staging and artifact space margin',a.storageMarginGB,'GB'),
  metric('artifactSize','Requested export size',a.artifactGB,'GB'),metric('artifactReturned','Artifact bytes received on Earth',partial,'GB'),
  metric('artifactRelease','Artifact released after training and local write',Number.isFinite(release)&&release<=end?release-start:null,'s from offer'),
  metric('receiptTime','Complete Earth receipt',physicallyReturned?receipt-start:null,'s from offer'),
  metric('orderDeadline','End-to-end order deadline',deadlineS/DAY,'days from offer'),
  metric('artifactReturnDelay','Actual release-to-Earth return',num(returnDelay/3600),'h'),
  metric('artifactReturnTarget','Post-release return deadline',returnDeadlineS/3600,'h after release'),
  metric('artifactGoodputRequired','Average return goodput required',requiredMeanMbps,'Mbit/s','Entire artifact divided by the post-release budget; intermittent contact requires higher in-contact goodput.'),
  metric('timeToQuality','Time to calibrated target',passes&&ready<=end?ready-start:null,'s','Matched validation must be entered for this token budget and configuration.'),
  metric('qualityGain','Observed gain over base',calibrated?d.validationObserved-d.validationBaseline:null,'score'),
  metric('uniqueCorpus','Corpus for one unique pass over token budget',wanted*d.corpusTokenBytes/1e9,'GB','Compare with the staged dataset; repeated epochs may reuse the same examples.'),
  metric('checkpoint','Restart package for selected trainable state',a.restartGB,'GB','Includes assumed optimizer/training state; weight-only exports have a different size.')
 ];
 const reason=!a.fit?'Installed memory or recorder capacity does not fit this order.':!art.compatible?'Requested package is incompatible with the Earth base or training deliverable. Adapter-only fine-tune restart state also requires the frozen base.':!physicallyReturned?'The requested package did not reach Earth inside the evaluated window.':!calibrated?'Quality remains unassessed until a comparable run is supplied.':!passes?'The supplied validation score misses the target.':success?'Validated package received by deadline.':(!withinReturn?'Artifact missed the separate post-release return deadline.':'Validated package arrived after the end-to-end training deadline.');
 return {offers:1,completed:Number(physicallyReturned),qualified:!physicallyReturned?0:calibrated?Number(qual):null,onTime:!withinOrder||!withinReturn?0:calibrated?Number(success):null,expired:Number(!physicallyReturned&&start+deadlineS<=end),primaryKey:'deliveredRun',status:!a.fit?'unmet':!art.compatible?'incompatible':!physicallyReturned?'unmet':!calibrated?'uncalibrated':success?'met':'unmet',latency:{p50:physicallyReturned?receipt-start:null,p95:physicallyReturned?receipt-start:null,p99:physicallyReturned?receipt-start:null},artifact:{...art,orderDeadlineMET:start+deadlineS,returnDeadlineS,returnDeadlineMET:Number.isFinite(release)?release+returnDeadlineS:null,returnDelayS:num(returnDelay),withinOrder,withinReturn,requiredMeanMbps,releaseMET:num(release),earthReceiptMET:physicallyReturned?receipt:null,receivedGB:partial,physicalFit:a.fit,physicalReceipt:physicallyReturned,validationEvidence:calibrated?'declared matched calibration':'unassessed',validationPassed:calibrated?passes:null},staging:{availableGB:staged,requiredGB:a.corpusGB,uploadGB:required,stagedMET:num(begin)},metrics,notes:[reason,'Validation is a user-entered calibration at the specified training-token budget. This estimator does not infer accuracy from FLOPs or partial progress.']};
}

export function assessServiceSegments(h,segments,{start=segments[0]?.start??0,end=segments.at(-1)?.end??start,initial=null,provenance='Model service intervals'}={}){
 const d={...serviceDefaults,...h.input},a=h.ai;if(!a)throw Error('Service evaluation requires a purpose-sized hardware configuration.');
 const {rows,network,busKWh,itKWh}=rates(d,h,segments);
 const tailGap=Math.max(0,end-(rows.at(-1)?.end??start));if(tailGap){let trailing=tailGap;for(let i=rows.length-1;i>=0&&!(rows[i].up>0&&rows[i].down>0);i--)trailing+=rows[i].end-rows[i].start;network.maxOutageS=Math.max(network.maxOutageS,trailing)}
 const r=a.training?training(d,h,a,rows,start,end,initial):inference(d,h,a,rows,start,end);
 const span=end-start,success=r.onTime;
 const accountingEnd=a.training&&Number.isFinite(r.artifact?.earthReceiptMET)?r.artifact.earthReceiptMET:end;
 const orderBusKWh=a.training?rows.reduce((n,row)=>n+Math.max(0,Math.min(row.end,accountingEnd)-row.start)*(row.servedLoadKW??row.loadKW??0)/3600,0):busKWh;
 const perResultKWh=Number.isFinite(success)&&success>0?orderBusKWh/success:null,earthUseful=d.earthUsefulPerHour*d.earthQualityFraction*d.earthDeadlineFraction;
 const earthPerResultKWh=earthUseful>0?d.earthITKw*d.earthPUE/earthUseful:null,earthKWh=Number.isFinite(success)&&Number.isFinite(earthPerResultKWh)?success*earthPerResultKWh:null;
 const economic={earthUSDPerUseful:earthPerResultKWh==null?null:d.earthEnergyPrice*earthPerResultKWh,spaceUSDPerUseful:perResultKWh==null||d.spaceEnergyPrice<=0?null:d.spaceEnergyPrice*perResultKWh};
 const sources=[...(a.training?['mlperf-training','optimizer','parallel','peft']:d.aiPurpose==='voice'?['opus','mlperf-inference']:d.aiPurpose==='agents'?['agent-study','claude-study','mlperf-inference']:['mlperf-inference']),...(d.serviceRoute!=='direct'?['laser','filing']:[])];
 const metrics=[...r.metrics,metric('successFraction','Useful result share of all offered',Number.isFinite(success)&&r.offers?100*success/r.offers:null,'%'),metric('maxOutage','Longest interval without duplex access',network.maxOutageS,'s'),metric('energyPerUseful','Spacecraft bus energy per accepted on-time result',perResultKWh,'kWh/result',a.training?'Entire served bus from order start through Earth receipt, including wait and return.':'Entire served bus over the evaluation window, including idle time, late work and unsuccessful searches.'),metric('earthPerUseful','Earth facility energy per equivalent useful result',earthPerResultKWh,'kWh/result','User-supplied comparable workload rate, quality, deadline acceptance, IT power and PUE.'),metric('earthElectricityCost','Earth electricity per useful result',economic.earthUSDPerUseful,'USD/result','Electricity-only comparison; capital, launch, relay contracts and amortization are outside this boundary.')];
 if(economic.spaceUSDPerUseful!==null)metrics.push(metric('flightElectricityCost','Assigned flight energy cost per useful result',economic.spaceUSDPerUseful,'USD/result'));
 return {...r,purpose:d.aiPurpose,window:{start,end,span},status:r.status??(!r.offers?'no-offers':r.onTime>=r.offers?'met':r.onTime>0?'partial':'unmet'),completionFraction:ratio(r.completed,r.offers),successFraction:Number.isFinite(success)?ratio(success,r.offers):null,metrics,energy:{busKWh,itKWh,orderBusKWh,accountingEnd,perResultKWh,earthKWh,earthPerResultKWh},economic,network,sources:sources.map(id=>serviceSources.find(s=>s.id===id)),notes:[...r.notes,provenance,'Earth-origin orders are counterfactual customers of the installed vehicle. They use the selected route and available compute slots instead of being added on top of the flight ledger. Input staging, model fit and output delivery are evaluated independently.',...(d.serviceRoute!=='direct'?['Relay availability, directions, latency and handover use the entered hypothetical contract. Intersatellite hardware rates do not establish access to a data-center customer.']:[])]};
}
const cache=new WeakMap();
function windowFor(sim,start,span){
 if(!Number.isFinite(start)||!Number.isFinite(span)||span<=0||span>MAX_DAYS*DAY+.001)throw new Error('Select a positive Earth-service interval up to 90 days.');
 start=Math.max(0,Math.min(sim.duration,start));return {start,end:Math.min(sim.duration,start+span)};
}
export function evaluateService(sim,start=0,span=DAY){
 const w=windowFor(sim,start,span),key=w.start+'/'+w.end+'/'+Boolean(sim.audit);let m=cache.get(sim);
 if(!m){m=new Map();cache.set(sim,m)}if(m.has(key))return m.get(key);
 let segments=[];
 if(w.end>w.start&&w.end-w.start<=DAY)segments=sim.serviceTimeline(w.start,w.end-w.start);
 else if(w.end>w.start){
  let seed=sim.serviceSeed(w.start);
  for(let t=w.start;t<w.end;t+=DAY){const part=sim.serviceDay(seed,Math.min(DAY,w.end-t));seed=part.end;segments.push(...part.segments)}
 }
 const r=assessServiceSegments(sim.hardware,segments,{...w,initial:sim.at(w.start),provenance:sim.audit||w.end<=3*DAY?'Chronological flight-state capacity intervals.':'Locally integrated service windows at the selected mission age; cached representative-day seeds may affect long-horizon initial stocks.'});
 if(m.size>=6)m.delete(m.keys().next().value);m.set(key,r);return r;
}
export const evaluateServiceWindow=evaluateService;
export function evaluateServiceAsync(design,start=0,span=DAY,{signal,onProgress=()=>{},initialSeed,seedProvenance,firstDay=false,acceptedWindow}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException('Service study cancelled','AbortError'));return}
  const worker=new Worker(new URL('./ai-service-worker.js',import.meta.url),{type:'module'});
  const close=()=>{worker.terminate();signal?.removeEventListener('abort',cancel)};
  function cancel(){close();reject(new DOMException('Service study cancelled','AbortError'))}
  signal?.addEventListener('abort',cancel,{once:true});
  worker.onmessage=({data})=>{if(data.progress){onProgress(data.progress);return}close();if(data.error)reject(new Error(data.error));else resolve(data.result)};
  worker.onerror=e=>{close();reject(new Error(e.message||'Service worker failed'))};
  worker.postMessage({design:design.input||design,start,span,initialSeed,seedProvenance,firstDay,acceptedWindow});
 });
}
