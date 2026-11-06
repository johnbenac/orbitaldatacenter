import {purposeDisplay} from './purpose-display.js';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=(x,d=3)=>Number.isFinite(x)?x.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
const product={
 text:'A streamed answer to a prompt.',voice:'A spoken reply during a two-way conversation.',
 batch:'A finished batch of accepted items.',agents:'A checked proof, tested patch or reproducible finding.',
 finetune:'An evaluated model adaptation.',pretrain:'Validated weights or a restartable checkpoint.'
};
const display=(v,u='')=>v==null?'—':u==='s'&&Number.isFinite(v)?elapsedDuration(v):typeof v==='number'?n(v)+(u?' '+esc(u):''):esc(v)+(u?' '+esc(u):'');
export function conopsPurpose(h,phase){
 const selected=h.input.aiPurpose,selectable='ABC'.includes(phase);
 return '<section class="conops-purpose"><div class="purpose-heading"><div><span class="guideflag">PRIMARY EARTH CUSTOMER MISSION</span><h2>'+esc(purposeDisplay[selected].name)+'</h2><p>'+esc(product[selected])+'</p></div><button class="btn" data-open-purpose="'+esc(selected)+'">'+(selectable?'Review mission purpose':'Inspect mission purpose')+' ↗</button></div></section>';
}
export function studyHorizon(d,days=0){
 if([1,7,30,60,90].includes(days))return days;
 return Math.max(1,Math.min(90,['finetune','pretrain'].includes(d.aiPurpose)?Math.ceil(d.trainingBudgetDays):d.aiPurpose==='agents'?7:1));
}
function researchReference(d){
 if(d.aiPurpose==='agents')return '<details class="purpose-citation"><summary>Terrestrial research reference</summary><p>OpenAI reports about 10,000 concurrent agents in the successful Navier–Stokes group, 88 hours to the result and another 17 hours for Lean formalization and verification. The broader Navier–Stokes effort generated roughly 130 billion output tokens and 2.7 million messages. The completed proof and verification record are the customer product in this example. <a href="https://openai.com/index/navier-stokes-solution/" target="_blank" rel="noopener">Methods and results ↗</a></p></details>';
 if(d.aiPurpose==='pretrain')return '<details class="purpose-citation"><summary>Terrestrial training reference</summary><p>A Megatron-LM study measured 502 sustained PFLOP/s for trillion-parameter training iterations across 3,072 GPUs. The orbital estimate uses the installed accelerators, synchronization losses and available power. <a href="https://arxiv.org/abs/2104.04473" target="_blank" rel="noopener">Training study ↗</a></p></details>';
 return '';
}
export function studyMenu(d,selected,days){
 const alt=selected&&selected!==d.aiPurpose?selected:d.aiPurpose==='agents'?'text':'agents';
 const selector='<label>Study horizon <select id="ai-study-days"><option value="0" '+(!days?'selected':'')+'>Purpose default · '+studyHorizon(d)+' day'+(studyHorizon(d)===1?'':'s')+'</option>'+[1,7,30,60,90].map(x=>'<option value="'+x+'" '+(days===x?'selected':'')+'>'+x+' day'+(x===1?'':'s')+'</option>').join('')+'</select></label>';
 return '<section class="purpose-study-panel"><header><span class="guideflag">MISSION STUDIES</span><h3>What can this design deliver?</h3></header><div class="purpose-study-grid"><div><h4>Same machine, different order</h4><p>Compare '+esc(purposeDisplay[d.aiPurpose].name)+' with '+esc(purposeDisplay[alt].name)+' from the same clock, using the installed accelerators and Earth route.</p><button class="btn" data-study-purpose="'+esc(alt)+'">Compare on this hardware</button></div><div><h4>Follow an Earth order</h4><p>Start at the selected window and follow the work through Earth receipt. The available mission lifetime bounds the horizon.</p><div class="study-controls">'+selector+'<button class="btn" data-action="ai-run-order">Evaluate order</button></div></div>'+(['finetune','pretrain'].includes(d.aiPurpose)?'<div><h4>Return a model to Earth</h4><p>Compare weights, adapters and restart packages at three sustained payload rates.</p><button class="btn" data-action="ai-transfer">Open transfer budget</button></div>':'')+'</div>'+researchReference(d)+'</section>';
}
export function serviceSummary(r){
 const stats=r.metrics||[],primary=r.primaryKey||stats[0]?.key;
 const chosen=[primary,'successFraction',(['finetune','pretrain'].includes(r.purpose)?'receiptTime':'offered'),'energyPerUseful'];
 const head=chosen.map(k=>stats.find(m=>m.key===k)).filter(Boolean);
 const rest=stats.filter(m=>!head.includes(m));
 const facts=rows=>'<div class="service-facts">'+rows.map(m=>'<div><small>'+esc(m.label)+'</small><b>'+display(m.value,m.unit)+'</b>'+(m.note?'<span>'+esc(m.note)+'</span>':'')+'</div>').join('')+'</div>';
 const status=({met:'Objective met',partial:'Partially met',unmet:'Objective missed',uncalibrated:'Validation evidence needed',incompatible:'Incompatible Earth artifact','no-offers':'No offered work'})[r.status]||r.status;
 return '<p class="study-result"><b>'+esc(status)+'</b> · '+n(r.window.span/86400,2)+' days evaluated</p>'+facts(head)+'<details class="study-details"><summary>Timing, resources and assumptions</summary>'+facts(rest)+(r.notes||[]).map(t=>'<p class="model-footnote">'+esc(t)+'</p>').join('')+'</details>';
}
export function sameMachineReport(h,a,h2,b){
 const machine=x=>[x.trays+' trays',n(x.ai?.installedMemoryGB)+' GB accelerator memory',n(x.storageTB)+' TB raw storage',n(x.launchKg)+' kg launch stack'].join(' · ');
 return '<p>Both orders use the same installed resources, operating orbit and analysis window. Each service is evaluated against its own customer acceptance conditions.</p><div class="pair-studies">'+[[h,a],[h2,b]].map(([x,r])=>'<section><span class="guideflag">EARTH SERVICE STUDY</span><h3>'+esc(purposeDisplay[x.input.aiPurpose].name)+'</h3><p>'+esc(machine(x))+'</p>'+serviceSummary(r)+'</section>').join('')+'</div>';
}
export function artifactRows(paramsB,adapterFraction=.001,restartBytesPerParam=14){
 const total=paramsB*1e9;
 return [['BF16 weights',2],['Packed 4-bit weights',.5],['BF16 adapter',2*adapterFraction],['Full-state restart example',restartBytesPerParam]].map(([label,bpp])=>{
  const bytes=total*bpp;
  return {label,bytes,secondsAt100Mbps:bytes*8/1e8,secondsAt1Gbps:bytes*8/1e9,secondsAt10Gbps:bytes*8/1e10};
 });
}
export function elapsedDuration(seconds){
 if(!Number.isFinite(seconds))return '—';
 if(seconds<60)return n(seconds,2)+' s';
 const m=Math.round(seconds/60);if(m<60)return Math.floor(Math.round(seconds)/60)+' min '+Math.round(seconds)%60+' s';
 if(m<1440)return Math.floor(m/60)+' h '+m%60+' min';
 return Math.floor(m/1440)+' d '+n((m%1440)/60,1)+' h';
}
const volume=b=>b>=1e12?n(b/1e12)+' TB':b>=1e9?n(b/1e9)+' GB':n(b/1e6)+' MB';
export function transferDesk(h,reference=false){
 const count=reference?1000:h.ai.modelParamsB,fraction=reference?.001:h.input.trainableFraction,restart=reference?14:h.input.checkpointBytesPerParam;
 const rows=artifactRows(count,fraction,restart),weights=rows[0].bytes,actual=h.ai.artifactGB,allowance=h.input.artifactReturnHours;
 const selected=reference?'':'<div class="callout gap"><b>Selected Earth artifact</b> · '+esc(h.input.artifactKind)+' · '+volume(actual*1e9)+' · '+n(allowance)+' h from release. The return window requires '+n(actual*8000/(allowance*3600),2)+' Mbit/s time-averaged payload goodput.</div>';
 return '<p>Active link time after the finished artifact is available. All three columns use sustained end-to-end payload goodput and decimal units.</p><div class="chips gap"><button class="chip '+(!reference?'selected':'')+'" data-artifact-case="current">Installed model · '+n(h.ai.modelParamsB)+'B parameters</button><button class="chip '+(reference?'selected':'')+'" data-artifact-case="trillion">1T-parameter reference</button></div><div class="tablewrap gap"><table><thead><tr><th>Artifact</th><th>Size</th><th>100 Mbit/s</th><th>1 Gbit/s</th><th>10 Gbit/s</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+r.label+'</td><td>'+volume(r.bytes)+'</td>'+[r.secondsAt100Mbps,r.secondsAt1Gbps,r.secondsAt10Gbps].map(s=>'<td>'+elapsedDuration(s)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+selected+'<p class="gap">At a return allowance of 1% of training time, BF16 weights require <b>'+n(weights*8/(.01*30*86400)/1e6,1)+' Mbit/s</b> averaged across 7 h 12 min after a 30-day run, or <b>'+n(weights*8/(.01*60*86400)/1e6,1)+' Mbit/s</b> across 14 h 24 min after a 60-day run. At 10% contact availability the active rate rises tenfold, provided the contacts occur before the cutoff.</p><p class="model-footnote">This arithmetic uses all parameters, including inactive experts. The adapter example uses '+n(fraction*100,3)+'% of parameters at BF16 and a compatible Earth base. The full-state restart example uses '+n(restart,2)+' bytes per parameter. At 14 bytes this corresponds to BF16 weights, an FP32 master copy and two FP32 moments. Format metadata, packaging and verification add overhead. A corpus of one trillion uint32 token IDs takes 4 TB of uplink or onboard staging.</p>';
}

const routeLabel={direct:'Direct ground contacts',relay:'Assumed relay',hybrid:'Relay with direct fallback'};
export function earthOutcome(h,r,failed=false){
 const d=h.input,id=d.aiPurpose;
 if(!r?.window)return failed?'<p>The service calculation could not finish. <button class="textbutton" data-action="ai-retry-day">Retry the selected window</button></p>':'<p>Calculating Earth receipt for the selected window…</p>';
 const m=Object.fromEntries(r.metrics.map(k=>[k.key,k.value]));
 const start=new Date(Date.parse(d.epoch)+r.window.start*1000).toISOString().slice(0,16).replace('T',' ');
 const end=new Date(Date.parse(d.epoch)+r.window.end*1000).toISOString().slice(0,16).replace('T',' ');
 const stamp='<p class="ap-interval">'+esc(routeLabel[r.network.route])+' · '+start+' – '+end+' UTC</p>';
 if(h.ai.training){
  const status=r.artifact?.physicalReceipt?(r.artifact.validationEvidence==='unassessed'?'Artifact received · validation pending':r.onTime?'Validated artifact received on time':'Artifact received · acceptance conditions missed'):
   r.status==='incompatible'?'Incompatible return artifact':r.artifact?.physicalFit===false?'Training order exceeds installed capacity':r.artifact?.orderDeadlineMET>r.window.end?'Order still open at window end':'Artifact delivery deadline missed';
  return '<p class="ap-delivered"><b>'+status+'</b></p><p>'+n(m.trainingTokens,5)+' billion training tokens processed · '+n(m.artifactReturned,3)+' of '+n(m.artifactSize,3)+' GB received on Earth.</p>'+stamp;
 }
 const units={text:'text turns',voice:'voice turns',batch:'batch items',agents:'research tasks'}[id];
 const pretty=v=>n(v,v>0&&v<1?3:v<100?2:0);
 const headline=r.offers?'<b>'+pretty(r.onTime)+'</b> of '+n(r.offers,0)+' '+units+' expected to qualify ('+n(100*r.successFraction,2)+'%)':'No offers arrived during this window.';
 const latency=id==='voice'?m.firstAudibleP95:id==='text'?m.ttftP95:m.completionP95;
 const target=id==='voice'?d.voiceFirstAudioTargetS:id==='text'?d.ttftTargetS:d.serviceDeadlineS;
 const label=id==='voice'?'first audible reply':id==='text'?'first visible token':'completed result';
 const delay=Number.isFinite(latency)?'Earth '+label+', p95 <strong>'+elapsedDuration(latency)+'</strong> · target '+elapsedDuration(target)+'.':'No measured Earth '+label+' in this window.';
 const installed=id==='text'?'Onboard decode '+n(h.tokensPerSec,0)+' tok/s · required '+n(d.requiredTps,0)+' tok/s. ':'';
 return '<p class="ap-delivered">'+headline+'</p><p>'+installed+delay+'</p>'+stamp;
}
export function compareRoutesReport(h,direct,relay){
 const d=h.input;
 return '<p>Two customer orders start at the same mission instant with the same spacecraft, inventory, demand and acceptance criteria. Each order uses its own path to Earth.</p><div class="pair-studies">'+[direct,relay].map(r=>'<section><span class="guideflag">'+esc(routeLabel[r.network.route])+'</span>'+earthOutcome(h,r)+'</section>').join('')+'</div><h3 class="gap">Connection assumptions</h3><p>Direct service uses the selected '+esc(d.network)+' ground network, its modeled passes and onboard terminals. The relay case assumes '+n(d.relayUpMbps)+' Mbit/s up and '+n(d.relayDownMbps)+' Mbit/s down, '+n(d.relayRttMs)+' ms round-trip delay, '+n(100*d.relayAvailability)+'% scheduled coverage and '+n(d.relayHandoverS)+' s handovers every '+n(d.relayCycleS)+' s. These relay inputs represent a hypothetical service agreement.</p><p>'+relay.sources.filter(s=>s.id==='laser'||s.id==='filing').map(s=>'<a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.title)+' ↗</a>').join(' · ')+'</p><button type="button" class="btn" data-edit-input="serviceRoute">Review Earth route setting →</button>';
}
