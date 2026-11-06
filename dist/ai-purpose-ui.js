import {aiPurposes} from './ai-purpose.js';
import {missionStarter,presets,sizeDesign,sizingEnvelope,sizingLabel,sizingMargin,meetsSizingRequirement} from './design.js';
import {elapsedDuration,earthOutcome} from './purpose-studies.js';
import {purposeDisplay,purposeId,purposeGlyph} from './purpose-display.js';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const measured=(v,d=2)=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:d}):typeof v==='string'?v:'—';
const value=(v,u,d=2)=>Number.isFinite(v)?measured(v,d)+(u?' '+u:''):typeof v==='string'?v:'—';
const metric=(label,v,unit='',digits=2)=>'<div class="ap-metric"><dt>'+esc(label)+'</dt><dd>'+esc(value(v,unit,digits))+'</dd></div>';
const datum=(label,text)=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(text)+'</dd></div>';
const nominal=new Map(),contextBuilds=new WeakMap();
function starter(id,h){
 let cache=nominal;
 if(h){if(!contextBuilds.has(h))contextBuilds.set(h,new Map());cache=contextBuilds.get(h);}
 if(!cache.has(id))cache.set(id,sizeDesign(missionStarter(id,h?.input)));
 return cache.get(id);
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
 let html='<section class="ap-service" data-purpose-assessment="'+esc(id)+'"><div class="ap-novel"><h4>Earth-service assessment</h4><strong>'+esc(status)+'</strong></div><p class="ap-window">Offer window · MET '+esc(duration(range.start))+' to '+esc(duration(range.end))+'</p><dl class="ap-stats">'+useful.map(r=>r.unit==='s'&&Number.isFinite(r.value)?datum(r.label,elapsedDuration(r.value)):metric(r.label,r.value,r.unit)).join('')+'</dl>';
 if(q.training&&notes.length)html+='<p class="ap-note">'+esc(notes[0])+'</p>';
 if(primary?.value==null&&q.training&&!notes.length)html+='<p class="ap-note">A completed training run needs the chosen validation evidence and an artifact received on Earth.</p>';
 if(notes.length||service.sources?.length)html+='<details><summary>Interpret this result and its references</summary><ul>'+notes.slice(0,5).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><p class="ap-sources">'+(service.sources||[]).filter(x=>typeof x?.url==='string'&&x.url.startsWith('https://')).map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.title)+' ↗</a>').join(' · ')+'</p></details>';
 return html+'</section>';
}
function cardHardware(id,h){
 const memory=h.ai.installedMemoryGB,second={text:value(h.solarM2,'m² solar'),voice:value(h.input.hostCores,'host cores'),batch:value(h.storageTB,'TB storage'),agents:value(h.input.fabricGbps,'Gbit/s fabric'),finetune:value(memory,'GB high-bandwidth memory'),pretrain:value(memory/1000,'TB high-bandwidth memory')};
 return value(h.chips,'accelerators',0)+' · '+second[id];
}
function missionCards(selected,active){
 return '<div class="ap-grid" role="group" aria-label="Choose a mission to preview">'+Object.entries(purposeDisplay).map(([id,p],index)=>{
  const chosen=id===selected;
  return '<button type="button" class="ap-card" data-preview-purpose="'+id+'" aria-pressed="'+chosen+'" style="--accent:'+p.accent+'"><span class="ap-cardhead">'+purposeGlyph(id)+'<small>0'+(index+1)+(id===active?' / ACTIVE PURPOSE':'')+'</small><span class="ap-indicator" aria-hidden="true"></span></span><strong>'+esc(p.name)+'</strong><em>'+esc(p.shortGoal)+'</em><span class="ap-hardware">'+esc(cardHardware(id,starter(id)))+'</span></button>';
 }).join('')+'</div>';
}
function workloadFact(id,h){
 const d=h.input,q=h.ai;
 switch(id){
  case 'text':return datum('Active decode estimate',value(h.tokensPerSec,'tok/s',0))+datum('Time to first token on Earth',value(d.ttftTargetS,'s')+' target');
  case 'voice':return datum('Active work estimate',value(q.activeUnitsPerSec,'turns/s'))+datum('First audible response',value(d.voiceFirstAudioTargetS,'s')+' target');
  case 'batch':return datum('Job input / return file',value(d.batchInputMB,'MB')+' / '+value(d.batchResultMB,'MB'))+datum('Earth receipt deadline',value(d.serviceDeadlineS/3600,'h')+' after offer');
  case 'agents':return datum('Workers per assignment stage',value(d.agentFanout,'agents')+' · '+value(q.agentWaves,'waves'))+datum('Task receipt deadline',value(d.serviceDeadlineS/3600,'h')+' after offer');
  default:return datum('Requested Earth artifact',value(q.artifactGB>=1000?q.artifactGB/1000:q.artifactGB,q.artifactGB>=1000?'TB':'GB',3)+' · '+({adapter:'adapter delta',full:'model weights',restart:'restart checkpoint'}[d.artifactKind]||d.artifactKind))+datum('Training time estimate',value(q.trainingDays,'days',3)+' / '+value(d.trainingBudgetDays,'days allowed'));
 }
}
function preview(h,id){
 const b=starter(id,h),p=purposeDisplay[id],q=b.ai,d=b.input,e=sizingEnvelope(b),f=b.fairing;
 const constraint=sizingLabel(e.binding),ratio=e.rates[e.binding],percent=Number.isFinite(ratio)?value(ratio*100,'%',1):'—';
 let fit=f.fit?'Stowed fairing fits':'Stowed fairing exceeded';
 if(!f.fit)fit+=' · '+[f.radialClearanceM<0?value(-f.radialClearanceM,'m radial'):'',f.axialClearanceM<0?value(-f.axialClearanceM,'m axial'):''].filter(Boolean).join(' / ');
 const service='<dl class="ap-dossier ap-facts">'+datum('Earth deliverable',p.product)+workloadFact(id,b)+'</dl>';
 const failed=Object.entries(e.rates).filter(([k,v])=>!meetsSizingRequirement(v,k));
 const challenge=failed.length?'<p class="ap-fit ap-short"><strong>Sizing challenge · '+failed.length+' unmet '+(failed.length===1?'requirement':'requirements')+'</strong><br>'+failed.map(([k])=>esc(sizingLabel(k))).join(' · ')+'</p>':'';
 const hardware=challenge+'<p class="ap-fit '+(e.feasible?'ap-ok':'ap-short')+'"><b>'+esc(constraint)+'</b> · '+esc(percent)+' of sizing requirement</p><p class="ap-fit '+(f.fit?'':'ap-short')+'">'+esc(fit)+'</p>';
 const details='<details><summary>Equipment and acceptance criteria</summary><dl class="ap-dossier">'+datum('Compute package',presets.compute[d.compute].label)+datum('Installed trays',value(b.trays,'trays')+' · '+value(q.installedMemoryGB,'GB high-bandwidth memory',0))+datum('Host and fabric',value(d.hostCores,'cores')+' · '+value(d.fabricGbps,'Gbit/s'))+datum('Storage / battery',value(b.storageTB,'TB')+' / '+value(b.batteryKWh,'kWh'))+datum('Solar / radiator area',value(b.solarM2,'m²')+' / '+value(b.radiatorM2,'m²'))+datum('Launched mass',value(b.launchKg,'kg',0))+datum('Launch mass headroom',value(b.launchScreenMarginKg,'kg',0))+datum('Memory headroom',value(q.memoryMarginGB,'GB'))+datum('Customer acceptance',criteria(id,d))+'</dl></details>';
 const keep='<details class="ap-alternate"><summary>Use this purpose with installed hardware</summary><p class="ap-note">Apply the customer purpose to the spacecraft currently in the workspace.</p><button type="button" class="btn" data-use-purpose="'+id+'" '+(purposeId(h)===id?'disabled':'')+'>'+esc(purposeId(h)===id?'Already the active purpose':'Review purpose change')+'</button></details>';
 return '<section class="ap-proposal" data-purpose-preview="'+id+'" style="--ap:'+p.accent+'"><div class="ap-novel"><small class="ap-kicker">Selected starting design</small>'+purposeGlyph(id)+'</div><h3>'+esc(p.name)+'</h3><p class="ap-goal">'+esc(p.goal)+'</p><p class="ap-buildline">'+esc(cardHardware(id,b))+'<span>'+esc(b.launcherLabel)+'</span></p>'+service+hardware+'<button type="button" class="btn ap-primary" data-provision-purpose="'+id+'">Review mission and spacecraft <span aria-hidden="true">→</span></button>'+details+keep+'</section>';
}
function committed(h,phase,snapshot,service,full=true){
 const id=purposeId(h),p=purposeDisplay[id],i=Math.max(0,'ABCDEF'.indexOf(phase));
 const hero='<div class="ap-summary"><div class="ap-art">'+purposeGlyph(id)+'</div><div><span class="ap-kicker">Active mission · '+esc(p.family)+'</span><h3>'+esc(p.name)+'</h3><p class="ap-goal">'+esc(p.goal)+'</p></div></div>';
 const chain='<div class="ap-trace"><span>'+esc(p.input)+'</span><i>→</i><span>'+esc(p.process)+'</span><i>→</i><span>'+esc(p.output)+'</span></div>';
 if(!full)return '<div class="ap-currentline"><span>Active mission · <b>'+esc(p.name)+'</b></span><button type="button" class="btn" data-open-purpose="'+id+'">Inspect service results ↗</button></div>';
 return hero+chain+'<p class="ap-guidance">'+esc(p.phases[i])+'</p><p class="ap-note">'+esc(criteria(id,h.input))+'</p>'+'<div data-active-appraisal>'+appraisal(h,id,service,snapshot)+'</div>';
}
function activeLimits(e){
 const entries=Object.entries(e.rates).filter(([k,r])=>r!==Infinity||k==='chemicalBurnClearance');
 const failed=entries.filter(([k,r])=>!meetsSizingRequirement(r,k));
 const summary=failed.length?'Sizing needs attention · '+failed.map(([k])=>sizingLabel(k)).join(', '):'Review installed sizing margins';
 return '<details class="ap-sizing"><summary>'+esc(summary)+'</summary><dl>'+entries.map(([k,r])=>datum(sizingLabel(k),sizingMargin(k,r,e))).join('')+'</dl><p class="ap-note">PDR mass and power require strictly positive headroom above their adopted thresholds. Other sizing bounds use their stated limits. Customer response times above include waiting for Earth access.</p></details>';
}
export function renderAIPurpose(h,phase='A',{snapshot,selectedId,service,envelope,failed=false,context='purpose'}={}){
 const active=purposeId(h),editable=['A','B','C'].includes(phase),id=editable&&Object.hasOwn(purposeDisplay,selectedId)?selectedId:active;
 let body;
 if(editable){
  const intro='<div class="ap-intro"><span class="ap-kicker">Mission catalogue · 06 starting designs</span><h3>Choose a customer mission</h3><p>Each purpose has a starting spacecraft. Preview its equipment, Earth deliverable and sizing limits before reviewing the design.</p></div>';
  const outcome=phase==='A'?'<section class="ap-earth-card" aria-label="Installed mission performance"><div class="ap-novel"><small class="ap-kicker">Installed mission · Earth service</small><strong>'+esc(purposeDisplay[active].name)+'</strong></div><div data-earth-outcome aria-live="polite">'+earthOutcome(h,service,failed)+'</div><button type="button" class="btn" data-action="ai-routes">Compare direct contacts and relay →</button>'+activeLimits(envelope||sizingEnvelope(h))+'</section>':'';
  body=outcome+intro+'<div class="ap-workbench">'+missionCards(id,active)+preview(h,id)+'</div>';
  if(context==='conops')body+=committed(h,phase,snapshot,service,false);
  else body+='<details class="ap-current"><summary>Active mission and measured service · '+esc(descriptor(active))+'</summary><div>'+committed(h,phase,snapshot,service)+'</div></details>';
 }else{
  body=committed(h,phase,snapshot,service)+'<dl class="ap-dossier">'+datum('Customer',purposeDisplay[active].customer)+datum('Earth deliverable',purposeDisplay[active].product)+datum('Flight state',snapshot?.flightPhase||'Flight record')+'</dl>';
 }
 return '<section class="panel ai-purpose" style="--ap:'+purposeDisplay[active].accent+'" data-ai-purpose="'+active+'"><header class="panelhead"><h2>AI Data Center Purpose</h2><span class="guideflag">'+(editable?'MISSION STARTERS':'FLIGHT RECORD')+'</span></header><div class="panelpad">'+body+'</div></section>';
}

// Update just the calculated fields when a background replay completes. Keep catalogue and keyboard focus intact.
export function refreshEarthOutcome(host,h,service,snapshot,failed=false){
 const region=host.querySelector('[data-earth-outcome]');
 if(region)region.innerHTML=earthOutcome(h,service,failed);
 const active=host.querySelector('[data-active-appraisal]');
 if(active&&service)active.innerHTML=appraisal(h,purposeId(h),service,snapshot);
}
