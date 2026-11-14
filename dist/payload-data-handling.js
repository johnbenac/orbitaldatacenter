import {purposeInfo,purposeId} from './purpose-display.js';
import {selectedTerminal} from './physics.js';

const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const f=(v,d=3)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
const n=v=>Number.isFinite(v)?v:0;
const measured=v=>Number.isFinite(v)?v:null;
const link=(id,label)=>'<button type="button" class="ed-link" data-electrical-open-part="'+esc(id)+'">'+esc(label)+' ↗</button>';
const phaseNotes={
 A:['Allocate the data products','Define customer input, model image, execution state, restart checkpoint and returned product separately. Size buffers, drive bandwidth and contact capacity against the selected service deadline.'],
 B:['Design the payload data path','Allocate host and accelerator interfaces, switch ports, recorder I/O and terminal handoff. Link each electrical interface to its harness record and each byte budget to the workload.'],
 C:['Check integrated data custody','Check the installed architecture with the same workload, storage, electrical power and communications model. Input staging, local reads, recorder writes and downlink share finite resources.'],
 D:['Verify before admitting customer work','Identify the loaded model and input inventory. Plan a known-pattern transfer, storage readback, integrity comparison and an interrupted-file restart test across the flight-like interfaces.'],
 E:['Follow the active workload','The counters below come from the shared mission clock. The selected service produces its own customer product; supplemental traffic occupies the same finite output recorder and link.'],
 F:['Reconcile the final products','Account for returned products, data still onboard, dropped data and unfinished checkpoint writes. Delivery bytes alone do not establish a successful customer service or a usable trained model.']
};

export function payloadDataStage(phase,h){
 const p=purposeInfo(h),q=h.ai||{},base=phaseNotes[phase]||phaseNotes.B;
 return {title:base[0],description:base[1]+' Selected workload: '+p.name+'. '+(q.training?'The corpus is retained and reread; a local restart checkpoint and the final returned model artifact have different scopes.':'Input is consumed by admitted work; the output product is '+p.output.toLowerCase()+'.')};
}

export function payloadDataState(h,s={}){
 const q=h.ai||{},profile=purposeInfo(h),training=!!q.training;
 const input={preloadedGB:measured(q.preloadedGB),receivedGB:measured(s.aiInputUploadedGB),consumedGB:measured(s.aiInputConsumedGB),bufferGB:measured(s.aiInputBufferGB)};
 const output={generatedGB:measured(s.aiProductGeneratedGB),receivedGB:measured(s.aiProductDeliveredGB),queuedGB:measured(s.aiProductQueueGB),droppedGB:measured(s.aiProductDroppedGB)};
 const shared={initialGB:measured(h.initialQueueGB),generatedGB:measured(s.generatedGB),receivedGB:measured(s.deliveredGB),queuedGB:measured(s.queueGB),droppedGB:measured(s.droppedGB)};
 const scale=Math.max(1,n(input.preloadedGB)+n(input.receivedGB),n(shared.initialGB)+n(shared.generatedGB),n(output.generatedGB)),toleranceGB=Math.max(1e-7,scale*1e-8),issues=[];
 const complete=Object.values(input).concat(Object.values(output),Object.values(shared)).every(Number.isFinite);
 const residual=(record,calculate)=>Object.values(record).every(Number.isFinite)?calculate():null;
 input.residualGB=residual(input,()=>input.preloadedGB+input.receivedGB-input.consumedGB-input.bufferGB);
 output.residualGB=residual(output,()=>output.generatedGB-output.receivedGB-output.queuedGB-output.droppedGB);
 shared.residualGB=residual(shared,()=>shared.initialGB+shared.generatedGB-shared.receivedGB-shared.queuedGB-shared.droppedGB);
 const other={initialGB:shared.initialGB};
 for(const key of ['generatedGB','receivedGB','queuedGB','droppedGB'])other[key]=Number.isFinite(shared[key])&&Number.isFinite(output[key])?shared[key]-output[key]:null;
 other.residualGB=residual(other,()=>other.initialGB+other.generatedGB-other.receivedGB-other.queuedGB-other.droppedGB);
 if(!complete)issues.push('A required input, customer-product or shared-recorder counter is missing or nonfinite.');
 for(const [name,record] of [['Input',input],['Customer product',output],['Shared recorder',shared],['Supplemental traffic',other]]){
  if(Object.entries(record).some(([key,value])=>key!=='residualGB'&&Number.isFinite(value)&&value<-toleranceGB))issues.push(name+' contains a negative inventory or cumulative counter.');
  if(Number.isFinite(record.residualGB)&&Math.abs(record.residualGB)>toleranceGB)issues.push(name+' conservation residual exceeds the numerical tolerance.');
 }
 if(['generatedGB','receivedGB','queuedGB','droppedGB'].some(key=>Number.isFinite(output[key])&&Number.isFinite(shared[key])&&output[key]>shared[key]+toleranceGB))issues.push('A customer-product subtotal exceeds its shared-recorder total.');
 if(training&&input.consumedGB>toleranceGB)issues.push('The retained training corpus has been marked as consumed.');
 const rates={inputMbps:measured(s.aiInputMbps),inputReadMbps:measured(s.aiInputReadMbps),productMbps:measured(s.aiProductGeneratedMbps),checkpointMbps:measured(s.aiCheckpointWriteMbps),outputMbps:measured(s.aiOutputMbps)};
 return {purpose:purposeId(h),profile,training,input,output,shared,other,toleranceGB,complete,issues,balanced:complete&&!issues.length,
  checkpoint:{sizeGB:measured(q.restartGB),pendingGB:measured(s.aiCheckpointPendingGB),writtenGB:measured(s.aiCheckpointWriteGB),commits:measured(s.aiCheckpointCommits),completeWork:measured(s.aiCheckpointCompleteUnits)},
  fabric:h.serviceArchitecture?.fabric,route:h.serviceArchitecture?.route,serviceLink:payloadServiceLink(h,s),rates,
  inputActive:n(rates.inputMbps)>0,inputReadActive:n(rates.inputReadMbps)>0,working:n(s.aiUnitRate)>0,productActive:n(rates.productMbps)>0,checkpointActive:n(rates.checkpointMbps)>0,outputActive:n(rates.outputMbps)>0};
}

export function payloadServiceLink(h,s={}){
 const installation=h.serviceArchitecture?.terminal||{},relay=s.aiRelayOn===true||s.aiActiveRoute==='relay'||(h.input?.serviceRoute==='relay'&&s.aiActiveRoute!=='direct');
 const terminal=relay?'Optical':s.selectedPayloadTerminal||selectedTerminal(h.input||{},n(s.queueGB)),optical=terminal==='Optical',ka=terminal==='Ka'||terminal==='Ka-band';
 const installed=optical?n(installation.payloadOpticalTerminals)>0:ka?installation.kaInstalled===true:installation.sBandInstalled===true;
 return {terminal,relay,installed,partId:installed?(optical?'flight:05.03':ka?'flight:05.02':'flight:05.01'):null,label:relay?'Optical relay interface':'Payload service interface',subtitle:(ka?'Ka':terminal)+' · '+(installed?(s.aiActiveRoute||h.input?.serviceRoute||'direct'):'not installed')};
}

function diagram(h,s,p){
 const box=(x,y,id,title,subtitle)=>'<g class="pd-node" '+(id?'data-electrical-open-part="'+esc(id)+'" role="button" tabindex="0" aria-label="Open '+esc(title)+' in Parts navigator"':'role="group" aria-label="'+esc(title)+'"')+'><rect x="'+x+'" y="'+y+'" width="184" height="72" rx="8"/><text x="'+(x+92)+'" y="'+(y+28)+'">'+esc(title)+'</text><text class="pd-sub" x="'+(x+92)+'" y="'+(y+50)+'">'+esc(subtitle)+'</text></g>';
 const flow=(id,path,kind,active)=>'<path data-payload-flow="'+id+'" d="'+path+'" class="pd-flow '+kind+(active?' is-active':'')+'"/>';
 return '<svg class="pd-diagram" viewBox="0 0 760 330" role="group" aria-label="Customer input crosses the communications interface into staging. Local input reads pass through the host fabric to workers. Generated products enter the recorder before transmission to Earth; restart checkpoints remain a separate local record.">'+
 '<text class="pd-zone" x="28" y="25">CUSTOMER INPUT</text><text class="pd-zone" x="286" y="25">ONBOARD EXECUTION</text><text class="pd-zone" x="548" y="25">PRODUCT CUSTODY</text>'+
 flow('incoming','M120 34V56','input',p.inputActive)+flow('input-read','M212 92H286','input',p.inputReadActive)+flow('execution','M470 92H548','payload',p.working)+flow('product','M640 128V217','payload',p.productActive)+flow('recorder-return','M548 253H470','return',p.outputActive)+flow('earth-receipt','M286 253H212','return',p.outputActive)+
 box(28,56,'flight:01.03','Input staging',f(p.input.bufferGB)+' GB available')+
 box(286,56,'flight:01.04','Host + payload fabric',f(h.serviceArchitecture?.fabric?.effectivePerWorkerGbps,1)+' Gbit/s per worker')+
 box(548,56,'flight:01.01',p.training?'Training workers':'Inference workers',f(s.aiUnitRate,2)+' '+(h.ai?.unit||'work units')+'/s')+
 box(548,217,'flight:01.03','Product recorder',f(p.output.queuedGB)+' GB awaiting return')+
 box(286,217,p.serviceLink.partId,p.serviceLink.label,p.serviceLink.subtitle)+
 '<g class="pd-earth"><rect x="28" y="217" width="184" height="72" rx="8"/><text x="120" y="245">Earth receipt</text><text class="pd-sub" x="120" y="267">'+f(p.output.receivedGB)+' GB received</text></g>'+
 '<text class="pd-caption" x="380" y="174">'+esc(p.training?'Local restart checkpoints share drive writes; they are not each a downlink product.':'Model weights and execution state remain distinct from customer input and returned products.')+'</text>'+
 '<text class="pd-caption" x="380" y="317">Functional data path · physical connectors and routes are in Command & Data Handling</text></svg>';
}

export function renderPayloadDataWorkspace(h,s={},phase='B'){
 const p=payloadDataState(h,s),stage=payloadDataStage(phase,h),q=h.ai||{};
 const row=(name,scope,value)=>'<tr><th scope="row">'+esc(name)+'</th><td>'+esc(scope)+'</td><td>'+esc(value)+'</td></tr>';
 const dataRows=[
  ['Customer input',p.profile.input,(p.training?f(p.input.bufferGB)+' GB retained corpus':f(p.input.bufferGB)+' GB waiting for execution')+' · '+f(p.rates.inputMbps)+' Mbit/s received'],
  ['Local input reads',p.training?'Retained corpus reads; inventory is preserved':'Inputs read by admitted work',f(p.rates.inputReadMbps)+' Mbit/s'],
  ['Resident execution state',p.training?'Model, gradients, optimizer and runtime state':'Model weights, context / KV cache and runtime state',f(q.modelMemoryGB)+' GB allocation'],
  ...(p.training?[['Local restart checkpoint','Committed recovery state; separate from the final deliverable',f(p.checkpoint.sizeGB)+' GB per save · '+f(p.checkpoint.commits,0)+' committed'],['Checkpoint write in progress','Incomplete write cannot replace the last committed state',f(p.checkpoint.pendingGB)+' GB remaining · '+f(p.rates.checkpointMbps)+' Mbit/s local writes']]:[]),
  ['Returned customer product',p.profile.product,f(p.output.generatedGB)+' GB generated · '+f(p.output.receivedGB)+' GB received · '+f(p.rates.productMbps)+' Mbit/s generated now'],
  ['Supplemental transfer traffic','Explicit bulk traffic / initial files outside the customer product',f(p.other.queuedGB)+' GB queued'],
  ['Spacecraft housekeeping','Separate C&DH recorder and protected command/telemetry service',f(s.hkStoredMB)+' MB locally retained']
 ];
 return '<section class="panel lowerpan pd-workspace" data-payload-data-workspace aria-label="Payload data handling architecture"><header class="panelhead"><h2>Payload Data Handling</h2><span class="arch-stamp">'+esc(p.profile.name)+'</span></header><div class="arch-pad"><p class="ed-eyebrow">PHASE '+esc(phase)+' · '+esc(stage.title)+'</p><p>'+esc(stage.description)+'</p><p class="ed-scope">This is the project’s payload-data partition. Command &amp; Data Handling owns spacecraft control, timing and electrical interfaces; Payload Operations owns workload execution and service acceptance; Communications owns link performance.</p>'+diagram(h,s,p)+
 '<div class="ed-legend"><span><i style="--flow:#aab8f4"></i>Customer inputs</span><span><i style="--flow:#76d9da"></i>Execution / products</span><span><i style="--flow:#7ed3a4"></i>Earth return</span><small>Motion follows modeled byte movement and active execution. Available link capacity alone does not animate a transfer.</small></div></div>'+
 '<div class="ed-table-scroll" tabindex="0"><table class="ed-table"><caption>Data products for the selected workload and design reference</caption><thead><tr><th>Record</th><th>Boundary</th><th>Current allocation / state</th></tr></thead><tbody>'+dataRows.map(x=>row(...x)).join('')+'</tbody></table></div>'+
 '<div class="arch-pad"><details class="ed-details"><summary>Input, product and recorder conservation</summary><p>Input: preload + received − consumed − staged = '+f(p.input.residualGB,9)+' GB. '+(p.training?'Training rereads its retained corpus; local reads do not consume the inventory.':'Consumed bytes represent inputs used by admitted work.')+'</p><p>Customer product: generated − received on Earth − queued − dropped = '+f(p.output.residualGB,9)+' GB.</p><p>Shared output recorder: initial files + all generated − all received − all queued − all dropped = '+f(p.shared.residualGB,9)+' GB.</p><p>Supplemental traffic: initial files + noncustomer generated − noncustomer received − noncustomer queued − noncustomer dropped = '+f(p.other.residualGB,9)+' GB.</p><p class="'+(p.balanced?'ed-pass':'ed-fail')+'">'+(p.balanced?'The inventories, subtotals and shared recorder balance within the numerical tolerance.':p.complete?'The ledger does not close; inspect the recorded state.':'Ledger closure is unavailable because required counters are missing.')+'</p>'+(p.issues.length?'<ul>'+p.issues.map(issue=>'<li>'+esc(issue)+'</li>').join('')+'</ul>':'')+'<p>Customer products are a subset of the common output recorder. The shared queue and delivered-byte total must not be added to the customer subtotal. Local checkpoint traffic uses drive bandwidth and write endurance without automatically becoming downlink traffic.</p></details><p>Live text and voice also need acceptable latency and continuity. Batch jobs need deadline-qualified return; agent tasks include tool exchanges; training needs a completed, valid artifact. Those service outcomes remain in Payload Operations.</p><div class="ed-actions">'+link('flight:01.04','Payload fabric')+link('flight:01.03','Recorder')+'<button type="button" class="ed-link" data-domain="avionics">Electrical block diagram ↗</button><button type="button" class="ed-link" data-domain="compute">Payload Operations ↗</button></div><p class="ed-source-line"><a href="https://www.nasa.gov/smallsat-institute/sst-soa/small-spacecraft-avionics/" target="_blank" rel="noopener">NASA avionics and data-handling scope ↗</a> · <a href="https://docs.pytorch.org/docs/stable/distributed.checkpoint.html" target="_blank" rel="noopener">PyTorch model and optimizer checkpoint scope ↗</a></p></div></section>';
}
