// Preliminary engineering assessments for the Earth service and its flight interfaces.
// This module reads a configured design and supplied model results. It never resizes
// hardware, runs a simulation, or treats a payload estimate as a flight-software budget.
import {policyValues} from './mission-policy.js';
import {serviceArchitecture,renderComputeFabric,renderEarthServiceRoute} from './service-architecture.js';

const purposes=new Set(['text','voice','batch','agents','finetune','pretrain']);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const number=x=>finite(x)?x:null;
const nonnegative=x=>finite(x)&&x>=0;
const positive=x=>finite(x)&&x>0;
const sum=(...xs)=>xs.every(finite)?xs.reduce((a,b)=>a+b,0):null;
const multiply=(...xs)=>xs.every(finite)?xs.reduce((a,b)=>a*b,1):null;
const divide=(a,b)=>finite(a)&&positive(b)?a/b:null;
const pct=(a,b)=>multiply(100,divide(a,b));
const esc=x=>String(x??'Unassessed').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const fmt=(x,places=2)=>finite(x)?x.toLocaleString('en-US',{maximumFractionDigits:places}):'Unassessed';
const row=(label,value,unit,basis)=>({label,value:typeof value==='number'?number(value):value??null,unit:unit||'',basis});
const related=(domain,label)=>({domain:domain==='purpose'?'compute':domain,label});
function check(id,label,actual,required,unit,operator,basis,ruleIds,evidence,{valid=true,applicable=true}={}){
  actual=number(actual);required=number(required);
  let status='unassessed';
  if(applicable===false)status='not_applicable';
  else if(valid&&actual!==null&&required!==null){
    const meets=operator==='>='?actual>=required:operator==='<='?actual<=required:operator==='>'?actual>required:operator==='<'?actual<required:operator==='='?actual===required:false;
    status=meets?'meets':'shortfall';
  }
  return {id,label,status,actual,required,unit:unit||'',operator,basis,ruleIds,evidence};
}
const unknown=(id,label,required,unit,basis,ruleIds,evidence,operator='>=')=>check(id,label,null,required,unit,operator,basis,ruleIds,evidence);
const colors={ink:'#e8f0f3',muted:'#a5b8c5',line:'#415866',panel:'#172b36',teal:'#78cbb8',blue:'#83b8e0',gold:'#dfc483',red:'#eea38d'};
const text=(x,y,value,size=14,fill=colors.ink,anchor='start')=>`<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" text-anchor="${anchor}">${esc(value)}</text>`;
function wrapped(x,y,value,width=24,lines=2,size=13,fill=colors.ink){
  const words=String(value??'Unassessed').split(/\s+/),out=[''];
  for(const word of words){
    const i=out.length-1;
    if((out[i]+' '+word).trim().length>width&&out[i]&&out.length<lines)out.push(word);
    else out[i]+=(out[i]?' ':'')+word;
  }
  return out.slice(0,lines).map((line,i)=>text(x,y+i*(size+4),line.length>width+8?line.slice(0,width+5)+'…':line,size,fill)).join('');
}
function box(x,y,w,title,detail,color=colors.teal){
  return `<rect x="${x}" y="${y}" width="${w}" height="72" rx="9" fill="${colors.panel}" stroke="${color}"/>`+wrapped(x+12,y+23,title,Math.floor(w/7.5),1,14)+wrapped(x+12,y+46,detail,Math.floor(w/7),2,12,colors.muted);
}
function arrow(x1,y1,x2,y2,color=colors.teal){
  const angle=Math.atan2(y2-y1,x2-x1),a=7,backX=x2-a*Math.cos(angle),backY=y2-a*Math.sin(angle);
  return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${color}" stroke-width="2" fill="none"/><path d="M${backX+4*Math.sin(angle)} ${backY-4*Math.cos(angle)}L${x2} ${y2}L${backX-4*Math.sin(angle)} ${backY+4*Math.cos(angle)}" stroke="${color}" stroke-width="2" fill="none"/>`;
}
function bar(y,label,capacity,demand,unit,width=790,x=28){
  const known=nonnegative(capacity)&&nonnegative(demand),scale=known?Math.max(capacity,demand,1e-12):1;
  const capW=known?width*capacity/scale:width,useW=known?width*Math.min(capacity,demand)/scale:0,excessW=known?width*Math.max(0,demand-capacity)/scale:0;
  return text(x,y,label,13)+text(x+width,y,known?`${fmt(demand)} demand / ${fmt(capacity)} ${unit} available`:'Required basis not supplied',12,colors.muted,'end')+
    `<rect x="${x}" y="${y+12}" width="${Math.max(0,capW)}" height="15" rx="3" fill="${colors.panel}" stroke="${colors.line}"${known?'':' stroke-dasharray="5 4"'}/>`+
    (known?`<rect x="${x}" y="${y+12}" width="${useW}" height="15" rx="3" fill="${colors.teal}"/><rect x="${x+useW}" y="${y+12}" width="${excessW}" height="15" fill="${colors.red}"/>`:'');
}
function svg(id,title,height,body,description){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 ${height}" role="img" aria-labelledby="pdr-${id}-title pdr-${id}-desc" style="display:block;width:100%;height:auto;font-family:system-ui,sans-serif"><title id="pdr-${id}-title">${esc(title)}</title><desc id="pdr-${id}-desc">${esc(description)}</desc><rect width="850" height="${height}" rx="12" fill="#0e1d27"/>${text(28,32,title,17)}${body}</svg>`;
}
function serviceResult(ctx,d){
  const result=ctx.service;
  if(!result||result.purpose!==d.aiPurpose||!positive(result.window?.span)||!nonnegative(result.offers)||!nonnegative(result.completed)||result.completed>result.offers+1e-8)return null;
  return result;
}
function facts(ctx){
  const h=ctx.h||{},d=h.input||{},a=h.ai||{},s=ctx.s||{},day=ctx.day||{},e=ctx.envelope||{},service=serviceResult(ctx,d);
  const knownPurpose=purposes.has(d.aiPurpose),training=knownPurpose&&['finetune','pretrain'].includes(d.aiPurpose),live=['text','voice'].includes(d.aiPurpose);
  const payloadUnit=training?'training token':a.unit||'work unit';
  const requiredRate=positive(a.requiredRate)?a.requiredRate:null;
  const scheduledRate=nonnegative(a.activeUnitsPerSec)&&finite(d.duty)&&d.duty>=0&&d.duty<=1?a.activeUnitsPerSec*d.duty:null;
  // Inference state is per replica. Counting one copy against all installed memory
  // would falsely present the rest of an actively replicated payload as spare RAM.
  const copies=training?1:Number.isInteger(h.replicas)&&h.replicas>=0?Math.max(1,h.replicas):null;
  const memoryDemand=nonnegative(a.modelMemoryGB)?multiply(a.modelMemoryGB,copies):null;
  const usableGB=nonnegative(h.usableTB)&&nonnegative(h.storageTB)&&h.usableTB<=h.storageTB?h.usableTB*1000:null;
  const residentGB=nonnegative(a.residentWeights)?a.residentWeights:null;
  const nonOutputGB=[residentGB,a.reservedStorageGB,d.retainedGB].every(nonnegative)?sum(residentGB,a.reservedStorageGB,d.retainedGB):null;
  const outputCapacityGB=finite(usableGB)&&finite(nonOutputGB)?Math.max(0,usableGB-nonOutputGB):null;
  const storedDemand=finite(nonOutputGB)&&nonnegative(s.queueGB)?nonOutputGB+s.queueGB:null;
  const peakDemand=finite(nonOutputGB)&&nonnegative(day.peakQueueGB)&&nonnegative(a.requiredStorageGB)?Math.max(nonOutputGB+day.peakQueueGB,a.requiredStorageGB):null;
  const architecture=serviceArchitecture(h),route=architecture.route.label;
  const firstTarget=d.aiPurpose==='text'?number(d.ttftTargetS):d.aiPurpose==='voice'?number(d.voiceFirstAudioTargetS):training?multiply(d.trainingBudgetDays,86400):number(d.serviceDeadlineS);
  const meanOutputMbps=training&&nonnegative(a.artifactGB)&&positive(d.artifactReturnHours)?a.artifactGB*8000/(d.artifactReturnHours*3600):!training&&positive(requiredRate)&&nonnegative(a.outputBytesPerUnit)?requiredRate*a.outputBytesPerUnit*8/1e6:null;
  const bulkMeanMbps=nonnegative(d.bulkMbps)&&finite(d.duty)&&d.duty>=0&&d.duty<=1?d.bulkMbps*d.duty:null;
  const meanInputMbps=nonnegative(e.meanInputMbps)?e.meanInputMbps:training&&nonnegative(a.corpusGB)&&nonnegative(a.preloadedGB)&&positive(d.trainingBudgetDays)?Math.max(0,a.corpusGB-a.preloadedGB)*8000/(d.trainingBudgetDays*86400):!training&&positive(requiredRate)&&nonnegative(a.inputBytesPerUnit)?requiredRate*a.inputBytesPerUnit*8/1e6:null;
  const outputMeanGBs=divide(sum(meanOutputMbps,bulkMeanMbps),8000);
  const checkpointMeanGBs=training?nonnegative(a.restartGB)&&positive(a.checkpointIntervalS)?a.restartGB/a.checkpointIntervalS:null:knownPurpose?0:null;
  const localToolGBs=d.aiPurpose==='agents'?[requiredRate,a.agentToolCalls,d.toolIOMB,d.earthToolFraction].every(nonnegative)&&d.earthToolFraction<=1?requiredRate*a.agentToolCalls*(1-d.earthToolFraction)*d.toolIOMB*.001:null:knownPurpose?0:null;
  const inputReadGBs=training?positive(requiredRate)&&positive(d.corpusTokenBytes)?requiredRate*d.corpusTokenBytes*1e-9:null:d.aiPurpose==='batch'?positive(requiredRate)&&nonnegative(d.batchInputMB)?requiredRate*d.batchInputMB*.001:null:knownPurpose?0:null;
  const writeGBs=sum(divide(meanInputMbps,8000),outputMeanGBs,checkpointMeanGBs,localToolGBs);
  const readGBs=sum(outputMeanGBs,inputReadGBs,localToolGBs);
  const residual=[h.initialQueueGB,s.generatedGB,s.queueGB,s.deliveredGB,s.droppedGB].every(nonnegative)?h.initialQueueGB+s.generatedGB-s.queueGB-s.deliveredGB-s.droppedGB:null;
  return {h,d,a,s,day,e,service,knownPurpose,training,live,payloadUnit,requiredRate,scheduledRate,copies,memoryDemand,usableGB,residentGB,nonOutputGB,outputCapacityGB,storedDemand,peakDemand,route,firstTarget,meanOutputMbps,meanInputMbps,writeGBs,readGBs,residual,architecture};
}

function conops(f){
  const {h,d,a,s,day,service,route,payloadUnit,requiredRate,scheduledRate,firstTarget}=f;
  const checkBasis='Selected customer requirement and nominal mission schedule; preliminary analytical capacity, not demonstrated throughput.';
  const body=box(28,65,168,'Earth customer',service?`${fmt(service.offers,0)} offers in window`:'Offer window not evaluated')+arrow(196,101,232,101)+
    box(232,65,170,'Ground gateway',route,colors.blue)+arrow(402,101,440,101)+box(440,65,174,'Vehicle payload',`${fmt(s.aiUnitRate)} ${payloadUnit}/s`)+arrow(614,101,651,101)+
    box(651,65,170,'Earth receipt',service?`${fmt(service.completed,0)} complete results`:`${fmt(s.aiProductDeliveredGB)} GB cumulative`)+
    text(28,173,`${fmt(d.missionYears)} year mission · ${fmt(multiply(d.duty,100))}% scheduled compute duty`,13,colors.muted)+
    box(28,198,168,'Launch interface','Release and commissioning',colors.gold)+arrow(196,233,440,233,colors.gold)+box(440,198,174,'Flight platform','Power · thermal · control',colors.gold)+
    `<path d="M527 198V142" stroke="${colors.gold}" stroke-width="2" fill="none"/>`+text(651,219,'Retirement / disposal',13,colors.gold)+wrapped(651,242,d.disposalMethod||'Endpoint not selected',23,2,12,colors.muted)+
    text(28,304,'Flight command and housekeeping remain separate from customer traffic.',12,colors.muted);
  return {id:'conops',title:'Mission CONOPS',designSummary:`${a.label||'Earth AI service'} over ${route.toLowerCase()}; the same installed vehicle serves the selected lifetime, duty schedule and retirement plan.`,
    design:[row('Earth service',a.label,'','Selected mission purpose'),row('Mission duration',d.missionYears,'yr','Configured operating life; later closeout remains part of the mission'),row('Scheduled compute duty',multiply(d.duty,100),'%','Mission operating schedule'),row('Required mean work',requiredRate,payloadUnit+'/s','Offers or training-token budget divided by its required time'),row('Scheduled analytical capacity',scheduledRate,payloadUnit+'/s',checkBasis),row('Earth route',route,'','Selected direct / relay operating concept'),row('Results physically received',service?.completed,payloadUnit,'Supplied Earth-service replay; not cumulative onboard computation'),row('Customer product returned',day.aiProductDeliveredGB,'GB / window','Selected flight window; includes only received customer output')],
    checks:[check('conops-work-rate','Scheduled work capacity',scheduledRate,requiredRate,payloadUnit+'/s','>=',checkBasis,['1.08','5.11'],'Power, thermal, staging, contact and customer acceptance still govern delivered service.'),check('conops-outage','Worst modeled duplex wait vs response budget',service?.network?.maxOutageS,firstTarget,'s','<=','Worst arrival at a modeled duplex outage; additional compute and transmission delay are excluded.',['1.08','1.14'],'Requires a supplied service replay for the same configured design; a planned access fraction does not establish latency.',{valid:nonnegative(service?.network?.maxOutageS)&&positive(firstTarget)}),check('conops-overdue','Offered work overdue without a result',service?.expired,0,payloadUnit,'<=','Only offers whose deadline expires within the evaluated replay are overdue.',['1.08'],'Pending work with a future deadline is not counted as an overdue result.',{valid:positive(service?.offers)}),check('conops-product-loss','Customer output dropped in the flight window',day.aiProductDroppedGB,0,'GB','<=','Selected-window customer-output ledger, separate from background bulk traffic.',['1.08'],'Zero simulated loss is a window result, not qualification of all mission modes.',{valid:nonnegative(day.aiProductDroppedGB)})],
    interfaces:[related('compute','Customer acceptance, installed capacity and workload admission'),related('comm','Ground / relay access and flight command coverage'),related('orbit','Schedule, eclipse and disposal timeline')],
    pdrNow:['Baseline customer outcomes, lifecycle modes and the launch-to-disposal CONOPS with traceable requirements.','Demonstrate the selected workload using coupled power, thermal, data and access cases; assign closure owners to gaps.'],
    later:['Validate integrated flight / ground operation and customer receipt in representative end-to-end tests.','Rehearse commissioning, handover and disposal procedures before their operational releases.'],
    limitations:['The operating simulator covers nominal schedules and gradual degradation. Reliability and survival evidence remain separate review work.','A selected-day replay and allocated relay interface do not demonstrate lifetime availability or reserve sufficient disposal capability.'],
    graphic:svg('conops','Mission actors and deployed service path',326,body,'Customer requests pass through ground service and the vehicle to Earth receipt. Launch interfaces and the flight platform support the same vehicle; quantities reflect the supplied design and replay.')};
}

function purpose(f){
  const {d,a,service,training,knownPurpose,requiredRate,scheduledRate,payloadUnit}=f;
  const checks=[check('purpose-capacity','Offered work vs scheduled compute capacity',scheduledRate,requiredRate,payloadUnit+'/s','>=','Analytical processing capacity at the selected workload and duty, before end-to-end constraints.',['1.08','5.11'],'Catalog accelerator peaks are not measured application throughput.')];
  const design=[row('Service',a.label,'','Earth customer mission'),row('Input per work unit',a.inputBytesPerUnit,'B','Configured serialized input or corpus token'),row('Output per work unit',a.outputBytesPerUnit,'B','Training returns a separate artifact after completion'),row('Offered on Earth',service?.offers,training?'order':payloadUnit,'Supplied replay counts all offers'),row('Results returned on Earth',service?.completed,training?'order':payloadUnit,'Physical receipt within the evaluated window'),row('Expected accepted on-time results',service?.onTime,training?'order':payloadUnit,'Declared acceptance / validation assumptions; not a measured benchmark')];
  let body;
  if(training){
    const artifact=service?.artifact,deadline=multiply(d.trainingBudgetDays,86400),end=service?.window?.end,start=service?.window?.start;
    const expired=finite(end)&&finite(start)&&positive(deadline)&&end>=start+deadline;
    const orderKnown=artifact?.physicalReceipt===true||expired;
    const orderActual=orderKnown?Number(artifact?.physicalReceipt===true&&artifact.withinOrder===true):null;
    const delay=nonnegative(artifact?.returnDelayS)?artifact.returnDelayS:finite(artifact?.releaseMET)&&finite(end)&&end-artifact.releaseMET>artifact.returnDeadlineS?end-artifact.releaseMET:null;
    checks.push(check('purpose-artifact','Declared artifact compatibility',typeof a.deployableArtifact==='boolean'&&typeof a.artifactValid==='boolean'?Number(a.deployableArtifact&&a.artifactValid):null,1,'compatible package','=','Requested package and declared Earth base version.',['1.08'],'Compatibility declaration is checked separately from transfer and validation.'),check('purpose-order-deadline','Training order received within its budget',orderActual,1,'order','=','Full training, local artifact write and complete Earth receipt before the order deadline.',['1.08'],'An incomplete replay that stops before the order deadline remains unassessed.'),check('purpose-artifact-return','Post-release artifact return delay',delay,multiply(d.artifactReturnHours,3600),'s','<=','Return timing starts after the completed artifact is released, not at training start.',['1.08'],'An overdue unreceived artifact uses elapsed waiting time as a lower bound; otherwise missing receipt is unassessed.'),check('purpose-validation','Declared matched validation score',d.trainingCalibration==='measured'?d.validationObserved:null,d.validationTarget,'score','>=','User-declared validation at this token budget and configuration.',['5.11'],'No quality or accuracy is inferred from FLOPs, partial progress, or physical artifact receipt.',{valid:nonnegative(d.validationObserved)&&d.validationObserved<=1&&nonnegative(d.validationTarget)&&d.validationTarget<=1}));
    design.push(row('Training token target',a.trainingGoalTokens,'tokens','Configured order budget'),row('Artifact size',a.artifactGB,'GB','Selected weights, adapter or restart state'),row('Complete Earth receipt',artifact?.earthReceiptMET,'s MET','Supplied replay; absent until the whole compatible artifact arrives'));
    const processed=service?.metrics?.find(m=>m.key==='trainingTokens')?.value;
    body=bar(76,'Corpus staged',a.corpusGB,service?.staging?.availableGB,'GB')+bar(139,'Tokens processed in replay',divide(a.trainingGoalTokens,1e9),processed,'billion tokens')+bar(202,'Artifact received on Earth',a.artifactGB,artifact?.receivedGB,'GB')+text(28,266,'Artifact receipt and validation are independent gates.',13,colors.gold);
  }else{
    const latency=service?.latency;
    if(d.aiPurpose==='text')checks.push(check('purpose-ttft','Earth time to first token · p95',latency?.p95First,d.ttftTargetS,'s','<=','First-response distribution among offers that received a first response.',['1.08'],'Read with overdue and unfinished counts; survivor-only latency does not establish complete service.'),check('purpose-stream','Received text cadence · p05',latency?.p05StreamTps,d.targetStreamTps,'tokens/s','>=','Sustained cadence among completed multi-token responses.',['1.08'],'Includes transmission and contact gaps in the supplied service replay.'),check('purpose-stream-gap','Worst streaming gap per response · p95',latency?.p95MaxGap,d.streamGapTargetS,'s','<=','Supplied end-to-end streaming replay.',['1.08'],'Window approximation and finite stream checkpoints remain identified in the replay.'));
    else if(d.aiPurpose==='voice')checks.push(check('purpose-first-audio','Speech end to first audible reply · p95',latency?.p95First,d.voiceFirstAudioTargetS,'s','<=','Includes endpointing, modeled inference, transfer and playout buffer.',['1.08'],'Among first responses received; unfinished turns remain in the outcome count.'),check('purpose-interruption','Interruption to silence · p95',latency?.p95Interrupt,d.voiceInterruptionTargetS,'s','<=','Counterfactual interruption probes in the supplied voice replay.',['1.08'],'This is modeled responsiveness, not measured intelligibility.'),check('purpose-audio-stall','Worst completed-turn playout stall · p95',service?.metrics?.find(m=>m.key==='voiceStallP95')?.value,divide(d.voicePlaybackBufferMs,1000),'s','<=','Declared voice playout allowance and supplied replay.',['1.08'],'Contact outages and packet timing are part of the playback case.'));
    else if(['batch','agents'].includes(d.aiPurpose))checks.push(check('purpose-completion','Earth completion time · p95',latency?.p95,d.serviceDeadlineS,'s','<=','Among complete results received on Earth.',['1.08'],'Serial tools, input transfer and output delivery are included by the supplied replay; unfinished offers must also be assessed.'));
    checks.push(check('purpose-expired','Overdue offers without a complete result',service?.expired,0,payloadUnit,'<=','All offers with elapsed deadlines in the supplied replay.',['1.08'],'A partially received object or generated onboard result is not a complete Earth receipt.',{valid:positive(service?.offers)}),unknown('purpose-quality-evidence','Task-matched acceptance evidence',null,'','Configured acceptance fraction is an assumption until supported by a comparable evaluation.',['5.11'],'Expected accepted counts are shown without inventing an application benchmark.'));
    const offered=service?.offers;
    body=bar(76,'Earth offers',offered,offered,payloadUnit)+bar(139,'Complete Earth results',offered,service?.completed,payloadUnit)+bar(202,'Expected accepted and on time',offered,service?.onTime,payloadUnit)+text(28,267,'All offers remain in the denominator; compute completion is not Earth receipt.',12,colors.muted);
  }
  if(!knownPurpose)checks.forEach(c=>{c.status='unassessed';c.actual=null;});
  return {id:'purpose',title:'AI service purpose',designSummary:training?'The deliverable is a compatible, validated model package received on Earth by both the order and return deadlines.':'The deliverable is an Earth-received customer result that meets the selected latency, cadence and task-acceptance requirements.',design,checks,
    interfaces:[related('conops','Offer schedule, mission life and service route'),related('compute','Model fit, worker capacity and tools'),related('data','Corpus, staging, buffers and artifact custody'),related('comm','Duplex access and Earth receipt')],
    pdrNow:['Define useful work, all-offer accounting, response deadlines and a workload-specific acceptance basis.','Evaluate direct / relay contact cases with the same installed capacity and declared quality assumptions.'],
    later:['Calibrate performance and quality against representative hardware, data, task sizes and offered load.','Validate the complete customer-to-flight-to-Earth chain, including artifact compatibility when applicable.'],
    limitations:['No new service simulation is run by this assessment. Request timing stays unassessed until a current service replay is supplied.','Planning rates and user-entered quality fractions are not measured benchmarks; latency percentiles exclude offers with no corresponding response and must be read with overdue counts.'],
    graphic:svg('purpose',training?'Training order: corpus, computation and Earth artifact':'Offered work and Earth-received outcomes',291,body,'Bars compare supplied service results against the full offered count or required training quantity. Unknown results remain visibly unassessed.')};
}

function compute(f){
  const {h,d,a,s,day,memoryDemand,copies,training,payloadUnit,requiredRate,scheduledRate}=f;
  const {compute:unit,fabric,placement,autonomy}=f.architecture,hardwareKnown=positive(h.trays)&&positive(h.chips)&&positive(d.chipGB);
  const memoryBasis=training?'Global training state, optimizer state and configured activations across the installed accelerator memory.':`${fmt(copies,0)} model replica(s), each including weights, KV state and runtime allowance; at least one model must fit.`;
  const body=text(28,70,`${fmt(h.trays,0)} installed trays · ${fmt(h.chips,0)} accelerators · ${fmt(h.memoryGB)} GB total device memory`,14,colors.gold)+
    bar(115,training?'Global training memory allocation':'Complete replicated inference memory',h.memoryGB,memoryDemand,'GB')+bar(184,'Scheduled application work',scheduledRate,requiredRate,payloadUnit+'/s')+
    box(28,238,240,'Payload execution',`${fmt(s.aiUnitRate)} ${payloadUnit}/s at cursor`)+arrow(268,274,307,274)+box(307,238,244,'Power / thermal admission',`${fmt(s.aiQualifiedCapacityPerSec)} ${payloadUnit}/s limit`,colors.gold)+arrow(551,274,589,274)+box(589,238,232,'Flight computer','Separate control allocation',colors.blue)+
    text(28,336,'Workload changes the demand and admission; installed hardware stays fixed.',12,colors.muted);
  return {id:'compute',title:'Compute payload',designSummary:fmt(unit.trayCount,0)+' repeated trays connect through '+fmt(fabric.switchCount,0)+' explicitly allocated switch(es). Local shard placement, physical ports and useful work are assessed against the same installed payload.',
    design:[
      row('Repeatable compute assembly',fmt(unit.trayCount,0)+' trays / '+fmt(unit.acceleratorCount,0)+' accelerators','',unit.trayPowerBoundary),
      row('Embedded / allocated host cores',fmt(unit.embeddedHostCores,0)+' / '+fmt(unit.allocatedHostCores,0),'cores','Embedded CPUs remain inside tray mass and power; the service may allocate fewer than physically present.'),
      row('Additional host modules',unit.extraHostModules,'16-core modules',fmt(unit.extraHostMassKg,2)+' kg; '+fmt(unit.extraHostActiveKW,3)+' kW active outside the tray boundary.'),
      row('Total accelerator memory',h.memoryGB,'GB','All installed accelerator devices, decimal GB'),
      row('Complete resident memory demand',memoryDemand,'GB',memoryBasis),
      row('Local device assignment',placement.largestShardGB,'GB / device',placement.mapping||'A complete workload definition is required.'),
      row('Payload memory headroom',finite(h.memoryGB)&&finite(memoryDemand)?pct(h.memoryGB-memoryDemand,h.memoryGB):null,'%','(Total installed memory − all resident allocation) / total installed memory; no universal GOLD payload percentage'),
      row('Installed fabric',fmt(fabric.leafCount,0)+' leaf / '+fmt(fabric.spineCount,0)+' spine','switches',fmt(fabric.usedSwitchPorts,0)+' populated ports; '+fmt(fabric.massKg,2)+' kg external fabric, NIC, controller and cable allocation.'),
      row('Requested / effective worker bandwidth',fmt(fabric.requestedPerWorkerGbps,1)+' / '+fmt(fabric.effectivePerWorkerGbps,1),'Gbit/s','One inter-tray worker per tray. Explicit physical port and bisection limits feed the application estimate.'),
      row('External fabric idle / active power',fmt(fabric.idleKW,3)+' / '+fmt(fabric.activeKW,3),'kW','Outside embedded tray electronics; idle and active portions are counted once in the bus.'),
      row('Storage fabric ceiling',fabric.storageLinkGBs,'GB/s per direction','Drive throughput is bounded by its installed storage-controller links; full-duplex capacity does not prove media concurrency.'),
      row('Scheduled analytical work capacity',scheduledRate,payloadUnit+'/s','Application estimate × operating duty'),
      row('Offered mean work',requiredRate,payloadUnit+'/s','Configured customer load or token/time target'),
      row('Actual work completed',day.aiUnitsComputed,payloadUnit+' / window','Integrated flight-window computation, not accepted customer receipt'),
      row('Workload active IT demand',h.itKw,'kW','Complete tray draw, additional hosts and active fabric share'),
      row('Installation electronics sizing basis',h.installedElectronicsKw,'kW','Installed load allocation used by the energy-system design; qualification remains separate'),
      row('Admitted instantaneous capacity',s.aiQualifiedCapacityPerSec,payloadUnit+'/s','Current modeled power/thermal admission; not qualified hardware performance')],
    checks:[check('compute-memory','Complete workload memory fits',h.memoryGB,memoryDemand,'GB','>=',memoryBasis,['5.11'],'Total memory is the denominator; unused chips are not confused with unused memory inside active replicas.',{valid:nonnegative(h.memoryGB)&&nonnegative(memoryDemand)}),
      check('compute-local-memory','Largest assigned local shard fits one device',unit.memoryPerAcceleratorGB,placement.largestShardGB,'GB','>=','Contiguous inference replicas or even training shards mapped to installed devices.',['5.11'],'This planning assignment still requires application-partition and allocator/kernel-peak evidence.',{valid:hardwareKnown&&nonnegative(placement.largestShardGB)}),
      check('compute-device-placement','All assigned accelerator slots are installed',unit.acceleratorCount,placement.occupiedDevices,'devices','>=','Every replica or training shard has a physical device in this spacecraft.',['5.11'],'At least one whole model must fit; other spacecraft are not counted.',{valid:hardwareKnown&&positive(placement.occupiedDevices)}),
      check('compute-fabric-link','Requested usable worker rate fits selected port',fabric.portUsableGbps,fabric.requestedPerWorkerGbps,'Gbit/s','>=','Selected physical port × 0.80 payload/protocol allocation.',['5.11'],'The application model uses the lesser of requested and installed capacity; 0.80 is not a GOLD margin.',{valid:hardwareKnown&&positive(d.fabricGbps)}),
      check('compute-fabric-ports','Populated switch ports fit installed modules',fabric.availableSwitchPorts,fabric.usedSwitchPorts,'ports','>=','Compute, storage, gateway and both ends of each interswitch link are counted.',['5.11'],'The selected topology also requires each individual spine to fit its radix.',{valid:hardwareKnown}),
      check('compute-spine-radix','Maximum individual spine port demand',fabric.maxSpinePortDemand,fabric.switchPorts,'ports','<=','Leaf–spine connection count, without splitting a physical port between distinct cables.',['5.11'],'A single-stage fabric has no spine; its endpoint count is checked in the complete port budget.',{valid:hardwareKnown}),
      check('compute-fabric-routing','Core length within installed cable allocation',h.bodyLengthM,f.architecture.basis.maxCoreLengthM,'m','<=','Six-metre endpoint routing allocation to a central fabric plane.',['5.11'],'A longer core requires revised routing, mass, loss and signal-integrity evidence.',{valid:hardwareKnown&&positive(h.bodyLengthM)}),
      check('compute-offered-rate','Scheduled capacity covers offered work',scheduledRate,requiredRate,payloadUnit+'/s','>=','Analytical application capacity at configured duty and bounded installed fabric / storage interfaces.',['5.11'],'Contact, thermal throttling and staged inputs can reduce delivered output.'),
      unknown('compute-electrical-allocation','Documented payload electrical capability',h.itKw,'kW','The selected electrical sheet supplies preliminary interface allocations; the installation sizing proxy is not a qualified capability.',['1.06'],'Tray, additional-host and external-fabric loads are separate. Hardware rating, transient and temperature evidence remains open.'),
      check('compute-life-envelope','Mission duration within reference hardware-life allocation',d.missionYears,autonomy.referenceLifeYears,'yr','<=','Five-year preliminary design-reference life; arbitrary mission duration remains configurable.',['1.11'],'A numerical pass does not qualify parts or the complete tray. Longer missions need a revised life basis.',{valid:hardwareKnown&&positive(d.missionYears)}),
      unknown('compute-benchmark','Representative application calibration',null,'','An accelerator peak specification is not a task-matched application result.',['5.11'],'Provide benchmark configuration, precision, batch/context, host/fabric conditions and measurement uncertainty.'),
      unknown('compute-runtime-partition','Measured local memory and partition evidence',null,'','Verify the declared replica/shard mapping and local workspace peaks on the selected platform.',['5.11'],placement.runtimeEvidence)],
    interfaces:[related('purpose','Workload shape and required useful rate'),related('power','Active / idle draw and admission'),related('thermal','Cold-plate and junction operating limits'),related('data','Read/write, weights, staging and returned output'),related('software','Isolation from mission-critical flight resources')],
    pdrNow:['Baseline the repeatable tray, host, cold-plate, power and fabric interface sheet; reconcile each allocation to the MEL.','Confirm local shard placement, switch/port/cable counts, collective bandwidth and storage contention for representative tasks.','Retain application calibration, operating-envelope and environment-specific heritage evidence with the selected hardware.'],
    later:['Calibrate throughput, latency, peak memory, host I/O and electrical draw on representative hardware.','Close radiation, lifetime, thermal and flight/ground integration evidence for the installed configuration.'],
    limitations:['Application throughput is an analytical estimate. No GPU-utilization percentage is used as a flight-software margin.','The explicit balanced shard assignment is a preliminary placement; application support and measured local peaks remain required.','Switch, NIC, cable and extra-host mass/power are controlled project allocations. The reference hardware does not qualify the flight packaging.'],
    supplementalGraphics:[{id:'compute-fabric',title:'Repeatable tray, fabric and local memory assignment',svg:renderComputeFabric(h)}],
    architecture:{revision:f.architecture.revision,compute:unit,fabric,placement},
    graphic:svg('compute','Fixed hardware and workload-dependent demand',358,body,'Memory includes every configured inference replica or the global training state. Separate bars compare total memory and scheduled work capacity; the flight computer remains a different resource boundary.')};
}

function storageGraphic(f){
  const {h,d,a,s,residentGB,usableGB,outputCapacityGB,residual}=f,rawGB=nonnegative(h.storageTB)?h.storageTB*1000:null;
  const components=[['Overprovisioning',finite(rawGB)&&finite(usableGB)?rawGB-usableGB:null,colors.line],['Resident image',residentGB,colors.blue],['Input / scratch / checkpoint',a.reservedStorageGB,colors.gold],['Retained data',d.retainedGB,'#9c91c3'],['Output queue',s.queueGB,colors.teal]];
  const valid=positive(rawGB)&&components.every(([,value])=>nonnegative(value)),used=valid?components.reduce((v,[,x])=>v+x,0):null,scale=valid?Math.max(rawGB,used):1;
  let x=28,body=text(28,70,`Physical recorder: ${fmt(rawGB)} GB · usable after overprovisioning: ${fmt(usableGB)} GB`,14,colors.gold);
  if(valid){
    body+=`<rect x="28" y="89" width="790" height="28" fill="${colors.panel}" stroke="${colors.line}"/>`;
    for(const [,v,color] of components){const w=790*v/scale;body+=`<rect x="${x}" y="89" width="${w}" height="28" fill="${color}"/>`;x+=w;}
    if(used>rawGB)body+=text(818,137,`${fmt(used-rawGB)} GB beyond physical capacity`,12,colors.red,'end');
  }else body+=text(28,107,'Complete storage allocation is not supplied.',13,colors.muted);
  components.forEach(([name,v,color],i)=>{const col=i%2,line=Math.floor(i/2);body+=text(28+col*405,155+line*25,`${name}: ${fmt(v)} GB`,12,color);});
  body+=box(28,239,176,'Customer input',`${fmt(s.aiInputBufferGB)} GB staged`)+arrow(204,275,242,275)+box(242,239,176,'Payload work',`${fmt(s.aiUnitRate)} ${f.payloadUnit}/s`)+arrow(418,275,456,275)+box(456,239,176,'Output allocation',`${fmt(outputCapacityGB)} GB capacity`)+arrow(632,275,666,275)+box(666,239,156,'Earth return',`${fmt(s.aiProductDeliveredGB)} GB`)+
    text(28,341,`Byte-ledger residual: ${fmt(residual,8)} GB · overwritten / dropped data remain separate.`,12,colors.muted);
  return svg('data','Recorder allocation and byte custody',365,body,'The physical recorder bar counts overprovisioning, resident image, input and checkpoint allocations, retained files and current output exactly once. The flow separates customer input, processing, output storage and Earth receipt.');
}
function data(f){
  const {h,d,a,s,day,usableGB,peakDemand,storedDemand,outputCapacityGB,residual,writeGBs,readGBs}=f;
  const {fabric,autonomy}=f.architecture,checkpointRequired=f.training?multiply(2,a.restartGB):0;
  return {id:'data',title:'Data and storage budget',designSummary:'Use a complete storage boundary and conserved byte ledgers. Provision input, model state, checkpoints, retained files and output queues before claiming capacity for returned work.',
    design:[row('Raw installed media',multiply(h.storageTB,1000),'GB','Packaged device capacity'),row('Usable media',usableGB,'GB','Raw media after configured overprovisioning'),row('Planned workload allocation',a.requiredStorageGB,'GB','Resident image + staged input/scratch + two checkpoint slots + retained data + distinct export/output allocation when applicable'),row('Current reserved and queued demand',storedDemand,'GB','Non-output allocations plus the current complete output queue'),row('Peak window allocation',peakDemand,'GB','Greater of planned complete workload or non-output allocations plus observed peak output queue; artifact is not counted twice'),row('Available output queue',outputCapacityGB,'GB','Usable capacity minus non-output allocations'),row('Average required media writes',writeGBs,'GB/s','Offered input, output, checkpoints and local-tool I/O planning bound'),row('Average required media reads',readGBs,'GB/s','Returned output plus corpus / batch / local-tool reads'),row('Actual customer input received',day.aiInputUploadedGB,'GB / window','Flight customer-input ledger'),row('Actual customer output returned',day.aiProductDeliveredGB,'GB / window','Flight customer-output ledger'),row('Background output returned',day.bulkDeliveredGB,'GB / window','Independent background bulk ledger'),row('Byte conservation residual',residual,'GB','Initial output queue + generated − received − dropped − remaining queue'),
      row('Checkpoint A/B reserve',f.training?a.checkpointReserveGB:0,'GB','Retain the last committed checkpoint until its successor validates; the export/output spool is separately accounted.'),
      row('Installed storage-link ceiling',fabric.storagePerDirectionGBs,'GB/s each direction','Counted storage-controller links; drive-level and simultaneous I/O evidence remain separate.'),
      row('Data custody',autonomy.dataCustody,'','Selected flight/ground interface responsibility')],
    checks:[check('data-allocation','Complete planned storage fits',usableGB,a.requiredStorageGB,'GB','>=','Logical allocations use usable media after overprovisioning.',['1.06','5.11'],'A flight-software 50% RAM planning threshold is not imposed on payload storage.',{valid:nonnegative(usableGB)&&nonnegative(a.requiredStorageGB)}),check('data-peak','Peak window storage fits',usableGB,peakDemand,'GB','>=','Observed output peak plus non-output allocations, bounded by the full planned workload allocation.',['1.06','5.11'],'A clipped current occupancy display alone cannot establish fit.',{valid:nonnegative(usableGB)&&nonnegative(peakDemand)}),check('data-write','Average offered write load',h.diskWriteGBs,writeGBs,'GB/s','>=','Average offered traffic and checkpoint budget; local-tool I/O is conservatively bounded in each direction.',['5.11'],'This screen does not close simultaneous peak writes or device endurance.',{valid:nonnegative(h.diskWriteGBs)&&nonnegative(writeGBs)}),check('data-read','Average offered read load',h.diskReadGBs,readGBs,'GB/s','>=','Corpus/batch/local-tool reads and returned result bytes share the read capacity.',['5.11'],'Representative burst and read/write contention cases remain required.',{valid:nonnegative(h.diskReadGBs)&&nonnegative(readGBs)}),check('data-loss','All output bytes dropped in selected window',day.droppedGB,0,'GB','<=','Combined customer and background output ledger.',['1.08'],'No simulated drop in one window does not verify all contact gaps.',{valid:nonnegative(day.droppedGB)}),check('data-custody','Absolute output byte-ledger residual',finite(residual)?Math.abs(residual):null,1e-6,'GB','<=','Numerical reconciliation tolerance of 1 kB, not a resource reserve.',['1.08'],'All initial, generated, returned, discarded and remaining output bytes are included.'),
      check('data-checkpoint-commit','A/B checkpoint commit reserve',f.training?a.checkpointReserveGB:null,checkpointRequired,'GB','>=','Two checkpoint slots preserve the last complete version while its successor is written and validated.',['5.11'],'Output/export bytes retain a separate ledger; qualification of atomic commit and recovery remains open.',{valid:f.knownPurpose&&positive(checkpointRequired),applicable:f.knownPurpose?f.training:true}),
      check('data-storage-link-read','Average reads fit installed storage link',fabric.storagePerDirectionGBs,readGBs,'GB/s','>=','One allocated fabric port per group of at most eight storage modules; 80% usable protocol rate.',['5.11'],'The runtime media ceiling is the lesser of drive and controller-link throughput.',{valid:positive(h.trays)&&nonnegative(readGBs)}),
      check('data-storage-link-write','Average writes fit installed storage link',fabric.storagePerDirectionGBs,writeGBs,'GB/s','>=','Input, checkpoint and output writes share their installed storage-controller direction.',['5.11'],'Peak contention, internal media arbitration and durable-write timing require representative hardware tests.',{valid:positive(h.trays)&&nonnegative(writeGBs)})],
    interfaces:[related('compute','Workload, corpus, I/O, artifact and acceptance allocation'),related('comm','Input and return goodput over contact gaps'),related('avionics','Independent engineering log and flight commands')],
    pdrNow:['Reconcile input, memory images, A/B checkpoints, export staging and returned-byte custody with the complete media allocation.','Demonstrate peak queue, storage-link contention, atomic checkpoint commit and deadline cases; retain endurance and data-integrity evidence.'],
    later:['Verify data integrity, restart/recovery, concurrent media throughput and end-to-end delivery on representative flight/ground equipment.','Reconcile as-built capacity and mission-life write history against the selected media qualification.'],
    limitations:['Recorder and application-rate calculations use decimal GB. Firmware metadata, error correction and vendor reserve must be reconciled with the chosen usable-capacity definition.','Average I/O screens do not prove worst-case latency, peak concurrency, corruption tolerance or radiation-induced data integrity.'],graphic:storageGraphic(f)};
}

function communications(f){
  const {h,d,s,e,service,route,meanInputMbps,firstTarget}=f;
  const {terminal,route:allocation}=f.architecture,routeKnown=['direct','relay','hybrid'].includes(d.serviceRoute),hasS=terminal.sBandInstalled;
  const opticalSelected=d.link==='optical',relayOnly=d.serviceRoute==='relay';
  const rfLive=s.contact===true&&['Ka','S-band'].includes(s.groundLink)&&!relayOnly;
  const rfCursor=rfLive?number(s.linkMarginDb):null;
  const body=text(28,69,'Customer service channel',13,colors.teal)+box(28,84,200,'Ground / relay ingress',`${fmt(s.aiRouteUpMbps)} Mbit/s available`)+arrow(228,120,268,120)+box(268,84,234,'Payload input and result',s.aiActiveRoute||route)+arrow(502,120,544,120)+box(544,84,278,'Earth return',`${fmt(s.aiRouteDownMbps)} Mbit/s route capacity`)+
    text(28,188,hasS?'Independent flight command and housekeeping channel':'Independent RF command / housekeeping implementation open',13,hasS?colors.blue:colors.gold)+box(28,204,200,'Ground control',`${fmt(d.commandKbps)} kbit/s offered`,colors.blue)+(hasS?arrow(228,240,268,240,colors.blue):'')+box(268,204,234,hasS?'S-band command receiver':'RF hardware omitted',hasS?`${fmt(s.commandGoodputKbps)} kbit/s delivered`:'No replacement route modeled',hasS?colors.blue:colors.gold)+(hasS?arrow(502,240,544,240,colors.blue):'')+box(544,204,278,'Flight computer / health log',`${fmt(s.hkRateKbps)} kbit/s engineering data`,colors.blue)+
    text(28,308,`Direct physical line: ${fmt(s.lineMbps)} Mbit/s · delivered payload: ${fmt(s.goodputMbps)} Mbit/s`,13,colors.muted)+
    text(28,334,`Current RF reference margin: ${fmt(rfCursor)} dB · full EOL / receiver / BER budget: unassessed`,12,colors.gold);
  return {id:'comm',title:'Communications and access',designSummary:'Keep direct physical link margin, application goodput, route availability and the independent flight command path as different quantities.',
    design:[
      row('Customer route',route,'','Selected operating route; provider, compatibility and ground agreements remain open'),
      row('Installed communications package',terminal.installedPackageLabel,'',terminal.rfCommandBasis),
      row('Payload terminal interface',terminal.opticalModemLineMbps,'Mbit/s raw per optical direction',terminal.hardwareBasis),
      row('Relay requested / allocated uplink',allocation.usesRelay?fmt(allocation.requestedUpMbps,1)+' / '+fmt(allocation.effectiveUpMbps,1):'Not selected','Mbit/s','Terminal and gateway hardware caps precede service availability.'),
      row('Relay requested / allocated downlink',allocation.usesRelay?fmt(allocation.requestedDownMbps,1)+' / '+fmt(allocation.effectiveDownMbps,1):'Not selected','Mbit/s',`${terminal.payloadOpticalTerminals} installed optical terminal(s); the current model serves one payload route at a time without simultaneous-link credit.`),
      row('Relay acquisition / usable schedule',allocation.usesRelay?fmt(allocation.effectiveHandoverS,1)+' s / '+fmt(100*allocation.effectiveAvailability,1)+'%':'Not selected','','Acquisition is at least 35 s each cycle; the same boundaries feed runtime and service replay.'),
      row('Gateway processing / relay RTT',fmt(allocation.gatewayOneWayMs,1)+' / '+fmt(allocation.relayRoundTripMs,1),'ms','Gateway delay is per direction. Relay RTT is a mission service allocation; geometric proof remains open.'),
      row('Direct ground terminal',s.groundLink,'','Selected physical terminal at the cursor'),
      row('Direct station / range',s.station?String(s.station)+' / '+fmt(s.rangeKm)+' km':null,'','Supplied orbit and station geometry'),
      row('Direct line / delivered payload rate',fmt(s.lineMbps,2)+' / '+fmt(s.goodputMbps,2),'Mbit/s','Physical line estimate and accepted queue transfer are different quantities.'),
      row('Customer route uplink / downlink',fmt(s.aiRouteUpMbps,2)+' / '+fmt(s.aiRouteDownMbps,2),'Mbit/s','Accepted current path after command priority, acquisition and installed caps'),
      row('Mean input demand / capacity',fmt(meanInputMbps,2)+' / '+fmt(e.meanUpMbps,2),'Mbit/s','Offered inputs and the same bounded route used by the planning envelope'),
      row('Planned in-access downlink demand / capacity',fmt(e.goodputNeeded,2)+' / '+fmt(e.linkGoodput,2),'Mbit/s','Separate from receiver-specific EOL RF evidence'),
      row('RF reference-rate margin at cursor',rfCursor,'dB','Current active RF reference case; not a complete EOL budget'),
      row('Longest modeled duplex outage',service?.network?.maxOutageS,'s','Supplied route-specific service replay'),
      row('Direct optical environment',allocation.opticalDirect?'Clear-sky reference; weather credit unassigned':'RF direct route or no direct payload route','','Cloud-interruption and correlated site-diversity cases require a supplied environment/provider basis')],
    checks:[check('comm-mean-uplink','Mean customer input budget',e.meanUpMbps,meanInputMbps,'Mbit/s','>=','Planning availability and capacity, after its flight-command allocation.',['1.06','1.08'],'Confirm provider terms and compare with the actual route/contact replay.',{valid:nonnegative(e.meanUpMbps)&&nonnegative(meanInputMbps)}),check('comm-mean-downlink','Planning downlink goodput budget',e.linkGoodput,e.goodputNeeded,'Mbit/s','>=','Sizing-envelope application goodput; empirical rate ceilings do not establish RF margin.',['1.06','1.08'],'Maintain separate physical, access and end-to-end delivery evidence.',{valid:nonnegative(e.linkGoodput)&&nonnegative(e.goodputNeeded)}),check('comm-rf-cursor','Current direct RF reference-rate margin',rfCursor,policyValues.rfDtePdrDb,'dB','>','GOLD 1.06 DTE numerical screen applied only to an active modeled RF reference case.',['1.06'],'This is not the EOL budget: required rate, receiver G/T, losses, coding/BER and margins must be controlled.',{applicable:!(opticalSelected||relayOnly)}),unknown('comm-rf-eol','Complete EOL RF / BER budget',policyValues.rfDtePdrDb,'dB','GOLD 1.06 direct-to-Earth margin for the required service and mission conditions.',['1.06','1.14'],'No explicit EOL RF loss and receiver-specific requirement set is supplied; command uplink and telemetry remain required even with an optical customer route.','>'),check('comm-outage','Worst-arrival duplex wait',service?.network?.maxOutageS,firstTarget,'s','<=','Modeled route outage compared with the selected response or order budget.',['1.08'],'This wait alone omits compute, serialization and transfer; it is a necessary contact-case screen.',{valid:nonnegative(service?.network?.maxOutageS)&&positive(firstTarget)}),unknown('comm-provider','Ground / relay service commitment',null,'','The selected rate, timing, duplex and custody interface requires a named provider and compatibility evidence.',['1.08','1.14'],'No contracted capacity, waveform compatibility or relay ephemeris is assumed.'),
      check('comm-command-installation','Independent command / telemetry hardware installed',hasS?1:0,1,'installed path','>=','The current flight command and live-housekeeping implementation uses the optional S-band package.',['1.14'],'Omitting S-band removes that service; optical or Ka command implementation and qualification remain open.',{valid:typeof d.communicationsPackage==='string'}),
      check('comm-relay-uplink-allocation','Relay uplink fits installed customer interface',terminal.relayUpCapMbps,allocation.requestedUpMbps,'Mbit/s','>=',`${terminal.opticalModemLineMbps} Mbit/s optical line capability and ${terminal.relayUpCapMbps} Mbit/s customer cap, before the gateway and access schedule.`,['1.08','1.14'],'Runtime and sizing cap the service at the installed interface.',{valid:routeKnown,applicable:routeKnown?allocation.usesRelay:true}),
      check('comm-relay-downlink-allocation','Relay downlink fits installed customer interface',terminal.relayDownCapMbps,allocation.requestedDownMbps,'Mbit/s','>=',`${terminal.payloadOpticalTerminals} installed optical terminal(s); a service-rate change installs no extra transmitter.`,['1.08','1.14'],'Provider and end-to-end pointing verification remain open.',{valid:routeKnown,applicable:routeKnown?allocation.usesRelay:true}),
      check('comm-relay-acquisition','Requested handover includes acquisition allocation',allocation.configuredHandoverS,allocation.acquisitionS,'s','>=','The current one-active-route model requires 35 s acquisition in every planned relay window.',['1.08','1.14'],'A shorter input does not bypass acquisition; installed terminal count adds no provider-qualified make-before-break credit.',{valid:routeKnown,applicable:routeKnown?allocation.usesRelay:true}),
      check('comm-relay-window','Usable relay window after acquisition',allocation.effectiveAvailability,0,'fraction','>','Available window is max(0, cycle × availability − max(handover, acquisition)).',['1.08'],'A nonzero planned window is not measured service availability.',{valid:routeKnown,applicable:routeKnown?allocation.usesRelay:true}),
      check('comm-optical-weather','Direct-optical weather and site diversity evidence',null,null,'','','The clear-sky link equation is conditional on atmospheric access.',['1.08','1.14'],'Supply cloud-interruption cases, correlated site-weather evidence and simultaneously available alternative sites before assigning availability credit.',{valid:false,applicable:routeKnown?allocation.opticalDirect:true}),
      check('comm-relay-pointing','Relay optical compatibility and receiver track',null,null,'','','Provide the receiver ephemeris, acquisition beacon, duplex waveform and pointing envelope.',['1.08','1.14'],'Installed optical terminal count does not establish provider compatibility or simultaneous independent beams.',{valid:false,applicable:routeKnown?allocation.usesRelay:true})],
    interfaces:[related('data','Traffic, peak queue and delivery deadlines'),related('attitude','Pointing, steering and acquisition'),related('avionics','Priority command and housekeeping channels'),related('power','Terminal and tracking-drive allocations'),related('orbit','Range, ground access and occultation')],
    pdrNow:['Confirm the selected terminal/gateway interface sheet with a named provider, receiver geometry, compatible protocol and required rate / BER.','Evaluate the same acquisition, handover, queue and latency cases in sizing and runtime; add direct-optical weather and correlated site-diversity cases where applicable.'],
    later:['Verify physical link and ground compatibility with representative receivers and flight configurations.','Complete provider, licensing and flight/ground end-to-end evidence before service.'],
    limitations:['A zero link-margin field outside contact is not a measured shortfall or a passing budget; it is unassessed here. Optical photon-rate estimates are not evaluated against the RF dB criterion.','The terminal caps and periodic windows are selected project allocations. Receiver tracks, provider compatibility, direct-optical weather and service terms remain open.'],
    supplementalGraphics:[{id:'earth-service-route',title:'Terminal, gateway and independent command interfaces',svg:renderEarthServiceRoute(h,s)}],
    architecture:{revision:f.architecture.revision,terminal,route:allocation},
    graphic:svg('comm','Customer links and flight-critical C&T',360,body,'Customer upload and returned products use their configured route. '+(hasS?'Flight commands and engineering telemetry use the installed S-band path.':'The selected package omits S-band; independent command and live telemetry implementation remain unresolved.')+' Physical line rate and accepted goodput are separate.')};
}

function avionics(f){
  const {h,d,s,day}=f,cdh=h.cdh||{},autonomy=f.architecture.autonomy,hasS=f.architecture.terminal.sBandInstalled;
  const retention=positive(cdh.packetBytes)&&positive(d.hkPeriodS)&&nonnegative(d.hkRecorderMB)?Math.floor(d.hkRecorderMB*1e6/cdh.packetBytes)*d.hkPeriodS/3600:null;
  const commandHold=nonnegative(d.uplinkBufferMB)&&positive(d.commandKbps)?d.uplinkBufferMB*8000/d.commandKbps:null;
  const receivedLine=!hasS?0:s.contact===true&&nonnegative(s.uplinkMbps)&&finite(d.codingEff)&&d.codingEff>=0&&d.codingEff<=1?s.uplinkMbps*d.codingEff*1000:null;
  const live=!(s.referenceBody===true||finite(s.spacecraftModelEndedAt)&&finite(s.t)&&s.t>=s.spacecraftModelEndedAt);
  const actualW=multiply(s.cdhServedKW,1000),requiredW=multiply(s.cdhKW,1000);
  const commandLoss=nonnegative(day.commandDroppedMB)?day.commandDroppedMB:nonnegative(s.uplinkDroppedMB)?s.uplinkDroppedMB:null;
  const body=box(28,66,192,'Earth command queue',`${fmt(s.uplinkQueueMB)} / ${fmt(d.uplinkBufferMB)} MB`,colors.blue)+(hasS?arrow(220,102,264,102,colors.blue):'')+box(264,66,238,'Dedicated flight computer',`${fmt(actualW)} W supplied / ${fmt(requiredW)} W requested`,colors.blue)+arrow(502,102,546,102,colors.blue)+box(546,66,276,'Vehicle commands','CMGs · engines · mechanisms',colors.blue)+
    box(28,180,192,'Platform sensors',`${fmt(cdh.packetBytes,0)} B every ${fmt(d.hkPeriodS)} s`,colors.gold)+arrow(220,216,264,216,colors.gold)+box(264,180,238,'Circular engineering log',`${fmt(retention)} h stored-history capacity`,colors.gold)+(hasS?arrow(502,216,546,216,colors.gold):'')+box(546,180,276,hasS?'Live S-band telemetry':'RF telemetry not installed',hasS?`${fmt(multiply(s.hkDeliveredGB,1000))} MB received on Earth`:'Onboard logging remains available',colors.gold)+
    bar(294,'Local engineering-log occupancy',d.hkRecorderMB,s.hkStoredMB,'MB')+text(28,349,'Customer GPU and payload recorder allocations are outside this flight-computer boundary.',12,colors.muted);
  return {id:'avionics',title:'Avionics and engineering data',designSummary:'A dedicated command/data-handling allocation carries spacecraft commands and health records independently of customer GPUs and payload storage.',
    design:[row('Independent command / telemetry installation',hasS?'S-band pair and radio':'Not installed','',autonomy.flightBoundary),row('Flight avionics suite',cdh.suiteMassKg,'kg','Installed study allocation with the MEL reference'),row('Flight-computer operating allocation',cdh.operatingW,'W','Hardware study allocation; not inferred from customer compute utilization'),row('Flight-computer power supplied',actualW,'W','Accepted simulation snapshot'),row('Ground commands offered',d.commandKbps,'kbit/s','Independent command demand'),row('Command queue capacity',d.uplinkBufferMB,'MB','Earth-side queue'),row('Zero-contact command hold capacity',commandHold,'s','Buffer bytes / configured command offering; no ground-gap requirement is assumed'),row('Engineering sample size',cdh.packetBytes,'B','Aggregate modeled packet'),row('Housekeeping sample period',d.hkPeriodS,'s','Powered engineering samples'),row('Circular-log lookback',retention,'h','Whole-packet capacity × sample period'),row('Engineering log overwritten',s.hkOverwrittenMB,'MB','Local history turnover, separate from received live telemetry'),row('Live engineering telemetry received',multiply(s.hkDeliveredGB,1000),'MB','Complete transmitted packets on the flight-critical downlink')],
    checks:[check('avionics-power','Requested avionics power supplied',actualW,requiredW,'W','>=','Flight-computer branch at the selected accepted snapshot.',['1.14','2.25'],'A full mode and survival power budget still belongs in the power assessment.',{valid:nonnegative(actualW)&&positive(requiredW),applicable:live}),check('avionics-command-throughput','Current command-priority uplink capacity',receivedLine,d.commandKbps,'kbit/s','>=',hasS?'Installed S-band reference uplink after coding, before customer data is allocated.':'No independent command receiver is installed; modeled command capacity is zero.',['1.14'],'A no-contact cursor is unassessed; it does not substitute for the worst command-gap budget.',{valid:nonnegative(receivedLine)&&nonnegative(d.commandKbps)}),check('avionics-command-loss','Commands dropped',commandLoss,0,'MB','<=',nonnegative(day.commandDroppedMB)?'Selected-window command queue overflow.':'Cumulative command queue overflow in the supplied snapshot.',['1.14'],'Command bytes are not combined with customer upload.',{valid:nonnegative(commandLoss)}),check('avionics-log-capacity','Engineering-log occupancy',d.hkRecorderMB,s.hkStoredMB,'MB','>=','Dedicated circular recorder; overwrite and lookback are reported separately.',['2.27'],'Capacity alone does not establish sufficient historical coverage.',{valid:nonnegative(d.hkRecorderMB)&&nonnegative(s.hkStoredMB)}),unknown('avionics-command-gap','Command gap coverage requirement',null,'s',hasS?'Compare the installed S-band command gap with the ground queue hold time.':'S-band is omitted. Define and verify a replacement command implementation before claiming coverage.',['1.14'],'Customer relay duplex availability does not establish direct command coverage.'),check('avionics-history','Engineering-history lookback allocation',retention,autonomy.engineeringHistoryRequirementH,'h','>=','Selected project requirement: preserve at least 72 hours of complete engineering packets.',['2.27'],'Onboard retention is separate from Earth receipt; dump/retrieval and durable storage need implementation evidence.',{valid:positive(retention)}),
      check('avionics-command-hold','Command queue covers reference ground gap',divide(commandHold,3600),autonomy.commandHoldRequirementH,'h','>=','Selected 24-hour command-hold allocation for autonomous operation.',['1.14'],'Actual command access gaps and the autonomous command horizon must be reviewed together; payload relay coverage is not credited.',{valid:positive(commandHold),applicable:hasS}),
      unknown('avionics-recovery','Flight recovery and isolation verification',null,'','Selected watchdog, two-bank boot/update and payload isolation architecture.',['1.14','2.25'],'Representative-platform reset, retained state, power isolation and disposal authority require evidence.')],
    interfaces:[related('comm','Independent command / telemetry links'),related('software','Mode executive, sequencing and monitoring'),related('power','Flight-computer power priority'),related('data','Separate engineering and customer storage boundaries')],
    pdrNow:[hasS?'Reconcile the 24-hour command-hold and 72-hour engineering-history allocations with installed S-band gap cases and memory.':'Resolve the absent independent command/telemetry implementation before accepting ground access or command-gap coverage.','Baseline watchdog/restart, retained boot-image and payload-isolation interfaces; disposition critical single points and retain environmental evidence.'],
    later:['Verify command/telemetry integrity, reset visibility, chronology and flight/ground compatibility.','Qualify the installed avionics and verify data retention and operational recovery requirements.'],
    limitations:['Packet sizes, recorder capacity and suite power are configured study allocations, not qualification results.','Live housekeeping copies and circular onboard history have different delivery/retention meanings; local logging alone does not prove Earth receipt.'],
    graphic:svg('avionics','Flight command and engineering-history path',373,body,'The flight computer dispatches vehicle control and retains engineering history. '+(hasS?'Installed S-band supplies command and live telemetry access.':'No independent RF command or live telemetry access is installed; a replacement path remains unresolved.')+' Customer payload resources are outside this boundary.')};
}

function software(f){
  const {h,d,s}=f,policy=policyValues.flightSoftwarePdr,autonomy=f.architecture.autonomy;
  const allocations=[['cpu','CPU execution'],['deadline','Individual task deadline'],['nonWritableNvm','Non-writable nonvolatile memory'],['writableNvm','Writable nonvolatile memory'],['ram','Flight-computer RAM'],['dataInterfaces','Flight data interfaces']];
  const checks=allocations.map(([key,label])=>unknown('software-'+key,label+' planning headroom',multiply(policy?.[key],100),'%','GOLD 3.07 PDR analysis threshold; (available resource − estimated use) / available resource.',['3.07'],key==='deadline'?'Provide task execution / response-time estimates, periods, priority and deadline allocations on the selected flight platform.':key==='cpu'?'Provide flight-platform capacity, executive/OS and application execution estimates, interrupts and concurrent critical-mode loading; customer GPUs are a different resource.':'Provide the total installed flight resource, complete allocated use, operating mode and evidence maturity. These are review thresholds, not automatic waiver or acceptance limits.'));
  const mode=s.attitudeModeLabel||s.attitudeMode||'No accepted control state',burn=s.burnPermitState||'Unassessed',packet=h.cdh?.packetBytes;
  let body=box(28,70,202,'Navigation / sensors','Orbit, Sun, attitude feedback',colors.blue)+arrow(230,106,270,106,colors.blue)+box(270,70,260,'Mode executive',mode,colors.gold)+arrow(530,106,570,106,colors.gold)+box(570,70,252,'Vehicle control outputs',`Engine state: ${burn}`,colors.blue)+
    `<path d="M697 142V165H130V142" stroke="${colors.blue}" stroke-width="2" fill="none"/>`+text(426,188,'Accepted feedback and mechanism readback',12,colors.muted,'middle')+
    box(28,211,262,'Customer workload',`${fmt(s.aiUnitRate)} ${f.payloadUnit}/s`,colors.teal)+text(318,238,'Separate processor, memory and I/O allocation',13,colors.teal)+text(318,260,'Payload activity does not establish flight-software headroom.',12,colors.muted);
  allocations.forEach(([key,label],i)=>{const x=28+(i%2)*405,y=321+Math.floor(i/2)*33;body+=text(x,y,label,12)+text(x+370,y,`? / ${fmt(multiply(policy?.[key],100),0)}% free target`,12,colors.gold,'end');});
  return {id:'software',title:'Flight software',designSummary:'Trace nominal control commands through the dedicated flight platform and keep its complete resource budget separate from the customer application workload.',
    design:[row('Current mode executive',mode,'','Accepted nominal flight-state snapshot'),row('Winning mode rule',s.modeRuleId,'','Model executive priority result; not a software verification certificate'),row('Engine authorization',burn,'','Accepted maneuver executive state'),row('Body pointing residual',s.attitudeSlewErrorDeg,'deg','Nominal closed-loop model readback'),row('Terminal control state',s.terminalState,'','Pointing / acquisition executive'),row('Housekeeping packet',packet,'B','Dedicated flight engineering data'),row('Flight platform allocation',h.cdh?.operatingW,'W','Electrical allocation; not CPU capacity'),row('Customer work at cursor',s.aiUnitRate,f.payloadUnit+'/s','Payload channel, excluded from flight CPU/RAM margin'),
      row('Boot and update architecture','Watchdog + two retained image banks','',autonomy.bootUpdate),
      row('Payload isolation and recovery','Per-tray isolation + supervised restart','',autonomy.payloadRecovery),
      row('Customer data custody','Committed checkpoint / acknowledged result','',autonomy.dataCustody),
      row('Disposal authority','Flight executive','',autonomy.disposalAuthority)],checks,
    interfaces:[related('avionics','Flight processor, command and engineering-data allocation'),related('attitude','Guidance, control and actuator interfaces'),related('prop','Maneuver authorization and limits'),related('thermal','Tracking and thermal-control interfaces'),related('compute','Isolation and resource arbitration with customer applications')],
    pdrNow:['Implement the selected watchdog/restart, retained-image update/rollback, payload-isolation and data-custody responsibilities on the flight platform.','Provide preliminary CPU, task deadlines, memory and interface budgets for these functions, with complete denominators and critical-mode cases.','Disposition the selected single flight chain and active fabric plane; plan representative survival, reset/update and flight/ground verification.'],
    later:['Measure timing and complete resource use on the representative flight platform; reconcile analysis with results.','Complete independent software, interface and long-duration verification before flight release.'],
    limitations:['The simulator supplies nominal control behavior, not processor timing, software image sizes, RAM peaks or qualified flight-software performance.','GOLD 3.07 planning thresholds apply to the flight resource boundary. They are not blanket reserve requirements for customer GPU utilization or bulk storage.'],
    architecture:{revision:f.architecture.revision,autonomy},
    graphic:svg('software','Control signal chain and flight resource allocations',426,body,'Sensor and navigation information enters the mode executive, which issues vehicle commands and receives feedback. Customer processing is separated. Flight CPU, deadlines, memory and I/O budgets are explicitly unknown until evidence is supplied.')};
}

// Payload Operations owns both the installed processing resources and the
// acceptance of their Earth-delivered work. Keep check IDs stable for saved reports.
function payloadOperations(f){
 const installed=compute(f),acceptance=purpose(f);
 const unique=items=>[...new Set(items)];
 const interfaces=[...installed.interfaces,...acceptance.interfaces].filter(r=>r.domain!=='compute');
 return {...installed,id:'compute',title:'Payload Operations',
  designSummary:installed.designSummary+' '+acceptance.designSummary,
  design:[...installed.design,...acceptance.design],
  checks:[...installed.checks,...acceptance.checks],
  interfaces:interfaces.filter((r,i,all)=>all.findIndex(x=>x.domain===r.domain)===i),
  pdrNow:unique([...installed.pdrNow,...acceptance.pdrNow]),
  later:unique([...installed.later,...acceptance.later]),
  limitations:unique([...installed.limitations,...acceptance.limitations]),
  supplementalGraphics:[...(installed.supplementalGraphics||[]),{id:'payload-acceptance',title:'Customer acceptance and Earth receipt',svg:acceptance.graphic}]
 };
}
export function assessServiceDomains(ctx={}){
 const f=facts(ctx),requested=ctx.domainIds?.map(id=>id==='purpose'?'compute':id);
 const builders={conops,compute:payloadOperations,data,comm:communications,avionics,software};
 return Object.fromEntries(Object.entries(builders).filter(([id])=>!requested||requested.includes(id)).map(([id,build])=>[id,build(f)]));
}
