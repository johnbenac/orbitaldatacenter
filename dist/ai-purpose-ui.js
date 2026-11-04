import {aiPurposes} from './ai-purpose.js';
import {applyAIPurpose,sizeDesign} from './design.js';
import {purposeDisplay,purposeId,purposeGlyph} from './purpose-display.js';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const measured=(v,d=2)=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:d}):typeof v==='string'?v:'—';
const value=(v,u,d=2)=>Number.isFinite(v)?measured(v,d)+(u?' '+u:''):typeof v==='string'?v:'—';
const metric=(label,v,unit='',digits=2)=>'<div class="ap-metric"><dt>'+esc(label)+'</dt><dd>'+esc(value(v,unit,digits))+'</dd></div>';
const datum=(label,text)=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(text)+'</dd></div>';
const cache=new WeakMap();
function proposal(h,id,provision){
 let map=cache.get(h);if(!map){map=new Map();cache.set(h,map);}const key=id+'/'+Boolean(provision);
 if(!map.has(key))map.set(key,id===purposeId(h)&&!provision?h:sizeDesign(applyAIPurpose(h.input,id,provision)));
 return map.get(key);
}
export const primaryServiceMetric={text:'slaTurns',voice:'audibleTurns',batch:'qualifiedItems',agents:'verifiedTasks',finetune:'deliveredRun',pretrain:'deliveredRun'};
const statuses={met:'Objective met',partial:'Partially met',unmet:'Objective missed',uncalibrated:'Calibration required',incompatible:'Incompatible artifact or base',unresolved:'Assessment unresolved',pending:'Deadline still open', 'no-offers':'No offers in interval'};
function duration(t){if(!Number.isFinite(t))return '—';const seconds=Math.round(t),sign=seconds<0?'−':'+';let x=Math.abs(seconds);return sign+Math.floor(x/86400)+'d '+Math.floor(x%86400/3600)+'h '+Math.floor(x%3600/60)+'m';}
function descriptor(id){return purposeDisplay[id]?.name||aiPurposes[id]?.label||id;}
const supporting={
 text:['offered','ttftP95','gapP95'],voice:['firstAudibleP95','gapP95','interruptP95'],batch:['offered','completionP95','qualityFraction'],agents:['agentWorkers','agentWaves','peerTrafficPerTask','agentCriticalS','energyPerUseful'],
 finetune:['trainingTokens','qualityGain','artifactReturned','artifactReturnDelay','artifactReturnTarget'],pretrain:['trainingTokens','timeToQuality','artifactReturned','artifactReturnDelay','artifactGoodputRequired']
};
function criteria(id,d){
 switch(id){
  case 'text':return 'First token ≤ '+value(d.ttftTargetS,'s')+' · streaming gap ≤ '+value(d.streamGapTargetS,'s')+' · sustained stream ≥ '+value(d.targetStreamTps,'tok/s')+' · complete answer ≤ '+value(d.serviceDeadlineS,'s');
  case 'voice':return 'First audio ≤ '+value(d.voiceFirstAudioTargetS,'s')+' · interruption to silence ≤ '+value(d.voiceInterruptionTargetS,'s')+' · encoded packet '+value(d.audioChunkMs,'ms');
  case 'batch':return 'Receipt ≤ '+value(d.serviceDeadlineS,'s')+' after offer · expected acceptance '+value(100*d.batchQualityFraction,'%');
  case 'agents':return value(d.agentFanout,'agents per stage')+' × '+value(d.agentSerialSteps,'serial stages per assignment')+' · '+value(d.agentMessageKB,'kB of peer traffic per agent per stage')+' · '+value(d.serviceConcurrency,'Earth service slots')+' · expected verifier acceptance '+value(100*d.agentVerifyFraction,'%');
  default:return value(d.trainingBudgetDays,'days from order to Earth receipt')+' · '+value(d.artifactReturnHours,'h to return the final artifact after release')+' · validation target '+value(d.validationTarget,'score',3)+' · '+(d.trainingCalibration==='measured'?'matched validation supplied':'validation evidence pending');
 }
}
function appraisal(h,id,service,snap){
 const q=h.ai||{};
 if(!service)return '<section class="ap-service"><div class="ap-novel"><h4>Installed capacity</h4></div><dl class="ap-stats">'+metric('Active work estimate',q.activeUnitsPerSec,q.unit?q.unit+'/s':'units/s')+metric('Model memory margin',q.memoryMarginGB,'GB')+metric('Product awaiting delivery',snap?.aiProductQueueGB,'GB')+'</dl><p class="ap-note">Earth delivery and deadline attainment require an evaluated service interval.</p></section>';
 const rows=service.metrics||[],primary=rows.find(r=>r.key===primaryServiceMetric[id]);
 const useful=[primary,...supporting[id].map(k=>rows.find(r=>r.key===k))].filter(Boolean);
 const notes=(service.notes||[]).filter(x=>typeof x==='string');
 const range=service.window||{},status=statuses[service.status]||service.status||'Awaiting evaluation';
 let html='<section class="ap-service" data-purpose-assessment="'+esc(id)+'"><div class="ap-novel"><h4>Earth-service assessment</h4><strong>'+esc(status)+'</strong></div><p class="ap-window">Offer window · MET '+esc(duration(range.start))+' to '+esc(duration(range.end))+'</p><dl class="ap-stats">'+useful.map(r=>metric(r.label,r.value,r.unit)).join('')+'</dl>';
 if(q.training&&notes.length)html+='<p class="ap-note">'+esc(notes[0])+'</p>';
 if(primary?.value==null&&q.training&&!notes.length)html+='<p class="ap-note">A completed training run needs the chosen validation evidence and an artifact received on Earth.</p>';
 if(notes.length||service.sources?.length)html+='<details><summary>Interpret this result and its references</summary><ul>'+notes.slice(0,5).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><p class="ap-sources">'+(service.sources||[]).filter(x=>typeof x?.url==='string'&&x.url.startsWith('https://')).map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.title)+' ↗</a>').join(' · ')+'</p></details>';
 return html+'</section>';
}
export function renderAIPurpose(h,phase='A',{snapshot,selectedId,service}={}){
 const active=purposeId(h),a=purposeDisplay[active]||purposeDisplay.text,editable=['A','B','C'].includes(phase);
 const id=editable&&Object.hasOwn(purposeDisplay,selectedId)?selectedId:active,p=purposeDisplay[id],i=Math.max(0,'ABCDEF'.indexOf(phase));
 const chain='<div class="ap-trace"><span>'+esc(a.input)+'</span><i>→</i><span>'+esc(a.process)+'</span><i>→</i><span>'+esc(a.output)+'</span></div>';
 const hero='<div class="ap-summary"><div class="ap-art">'+purposeGlyph(active)+'</div><div><span class="ap-kicker">Committed purpose · '+esc(a.family)+'</span><h3>'+esc(descriptor(active))+'</h3><p class="ap-goal">'+esc(a.goal)+'</p></div></div>';
 let body=hero+chain+'<p class="ap-note">'+esc(criteria(active,h.input))+'</p><p class="ap-guidance">'+esc(a.phases[i])+'</p>'+appraisal(h,active,service,snapshot);
 if(editable){
  const cards=Object.keys(purposeDisplay).map(k=>{const d=purposeDisplay[k];
   return '<button type="button" class="ap-card" data-preview-purpose="'+k+'" aria-pressed="'+(k===id)+'" style="--accent:'+d.accent+'">'+purposeGlyph(k)+'<span><small>'+esc(d.family)+(active===k?' · CURRENT':'')+'</small><strong>'+esc(descriptor(k))+'</strong><em>'+esc(d.shortGoal)+'</em></span></button>';}).join('');
  body+='<section><div class="ap-novel"><h4>Explore customer missions</h4><small class="ap-kicker">06 profiles</small></div><div class="ap-grid">'+cards+'</div></section>';
  const candidate=proposal(h,id,false),aic=candidate.ai||{},build=proposal(h,id,true),ab=build.ai||{},unit=aic.unit?aic.unit+'/s':'units/s';
  body+='<section class="ap-proposal" data-purpose-preview="'+id+'"><small class="ap-kicker">Profile preview · '+esc(p.family)+'</small><h4>'+esc(descriptor(id))+'</h4><p>'+esc(p.goal)+'</p><dl class="ap-dossier">'+datum('Customer',p.customer)+datum('Earth deliverable',p.product)+datum('Qualification conditions',criteria(id,candidate.input))+datum('Installed active capacity',value(aic.activeUnitsPerSec,unit))+datum('Required mean pace',value(aic.requiredRate,unit))+(id==='agents'?datum('Parallel work within one task',value(aic.agentWorkerSlots,'resident slots')+' · '+value(aic.agentWaves,'waves/stage'))+datum('Internal bytes per task',value(aic.internalBytesPerTask/1e6,'MB')):'')+datum('Memory headroom',value(aic.memoryMarginGB,'GB'))+'</dl><div class="ap-actions"><button type="button" class="btn" data-use-purpose="'+id+'" '+(active===id?'disabled':'')+'>'+esc(active===id?'Current mission purpose':'Use purpose on current spacecraft')+'</button></div>';
  body+='<details><summary>Suggested physical build · '+esc(descriptor(id))+' · '+esc(!build.fairing?.fit?'fairing exceeded':build.launchScreenMarginKg<0?'launch mass exceeded':'within launch screen')+'</summary><p class="ap-note">Review the workload and installed equipment proposed for this profile. Applying the build replaces the corresponding design inputs.</p><dl class="ap-dossier">'+datum('Compute hardware',build.trays+' trays · '+build.chips+' accelerators')+datum('Accelerator memory',value(ab.installedMemoryGB??build.memoryGB,'GB',0))+datum('Host / fabric',value(build.input.hostCores,'cores',0)+' / '+value(build.input.fabricGbps,'Gbit/s',0))+datum('Storage',value(build.storageTB,'TB'))+datum('Arrays / radiators',value(build.solarM2,'m²',0)+' / '+value(build.radiatorM2,'m²',0))+datum('Battery',value(build.batteryKWh,'kWh'))+datum('Launched stack',value(build.launchKg,'kg',0))+datum('Launch vehicle',build.launcherLabel||build.input.launcher)+datum('Governing launch headroom',value(build.launchScreenMarginKg,'kg',0))+datum('Fairing radial / axial margin',value(build.fairing?.radialClearanceM,'m',2)+' / '+value(build.fairing?.axialClearanceM,'m',2))+datum('Training or inference memory margin',value(ab.memoryMarginGB,'GB'))+'</dl><button type="button" class="btn" data-provision-purpose="'+id+'">Apply purpose and suggested build</button></details></section>';
 }else{
  body+='<dl class="ap-dossier">'+datum('Customer',a.customer)+datum('Deliverable',a.product)+datum('Workload state',snapshot?.flightPhase||'Flight record')+'</dl>';
 }
 return '<section class="panel ai-purpose" style="--ap:'+a.accent+'" data-ai-purpose="'+active+'"><header class="panelhead"><h2>AI Data Center Purpose</h2><span class="guideflag">'+(editable?'DESIGN STUDY':'FLIGHT RECORD')+'</span></header><div class="panelpad">'+body+'</div></section>';
}
