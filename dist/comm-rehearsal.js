import {masterTimeline} from './master-timeline.js';

const nasaPhase='https://www.nasa.gov/reference/3-7-project-phase-d-system-assembly-integration-and-test-launch/';
const nasaGround='https://www.nasa.gov/smallsat-institute/sst-soa/ground-data-systems-and-mission-operations/';
const validGoal=v=>Number.isFinite(v)&&v>0;
const utc=(origin,seconds)=>new Date(origin+seconds*1000).toISOString();
const text=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const fmt=v=>v.toLocaleString('en-US',{maximumSignificantDigits:4,notation:v>=1e8||v>0&&v<1e-4?'scientific':'standard'});
const bytes=gb=>gb>=1?fmt(gb)+' GB':gb>=.001?fmt(gb*1e3)+' MB':gb>=1e-6?fmt(gb*1e6)+' kB':fmt(gb*1e9)+' B';

export function rehearseFirstPass(sim,goalGB=1){
 if(!validGoal(goalGB))throw RangeError('The payload goal must be a finite, positive number of decimal GB.');
 const timeline=masterTimeline(sim),id=timeline.firstOperationsPassId;
 const record={schema:'odc-first-contact-rehearsal/1',method:'Simulated operational validation',goalGB,outcome:'no-pass',
  eligible:!timeline.launchHold,conditional:!!timeline.launchHold,launchHold:timeline.launchHold,reason:timeline.endReason,
  pass:null,criteria:{payloadMet:null,statusReturned:null},sources:[nasaPhase,nasaGround]};
 if(!id)return record;
 const first=timeline.rows.find(r=>r.id==='aos-'+id),last=timeline.rows.find(r=>r.id==='los-'+id);
 if(!first||!last?.measurements)throw Error('Incomplete contact ledger for '+id);
 const m=last.measurements,epoch=Date.parse(sim.hardware.input.epoch);
 const pass={station:first.station,startMET:first.start,endMET:last.start,startUTC:utc(epoch,first.start),endUTC:utc(epoch,last.start),
  directPayloadGB:m.direct_payload_gb,receivedCommandGB:m.received_commands_gb,returnedTelemetryGB:m.downlinked_telemetry_gb,relayPayloadGB:m.relay_payload_gb};
 const payloadMet=pass.directPayloadGB>=goalGB,statusReturned=pass.returnedTelemetryGB>0;
 const reason=!payloadMet&&!statusReturned?'The station received neither the requested payload volume nor a housekeeping status return.':
  !payloadMet?'The station received less payload than requested before contact ended.':
  !statusReturned?'The payload volume reached its goal, but the spacecraft returned no housekeeping telemetry.':
  'The station received the requested payload volume and a housekeeping status return before contact ended.';
 return {...record,pass,criteria:{payloadMet,statusReturned},outcome:payloadMet&&statusReturned?'met':'missed',reason};
}

const local=new WeakMap();
const date=v=>v.slice(0,19).replace('T',' ');
function evidenceHtml(r){
 const outcome=r.outcome==='no-pass'?'No complete direct pass':r.outcome==='met'?'Delivery goal met':'Goal missed';
 const banner='<p class="cr-verdict" data-outcome="'+r.outcome+'"><strong>'+(r.conditional?'Conditional projection · ':'')+outcome+'</strong> · '+text(r.reason)+'</p>';
 const hold=r.launchHold?'<p class="cr-caveat">'+text(r.launchHold)+'</p>':'';
 if(!r.pass)return banner+hold;
 const p=r.pass;
 return banner+hold+'<div class="cr-payload"><strong>'+bytes(p.directPayloadGB)+' delivered</strong><span>Goal '+fmt(r.goalGB)+' GB</span>'+
  '<progress max="'+r.goalGB+'" value="'+Math.min(p.directPayloadGB,r.goalGB)+'" aria-label="Direct payload delivered toward target"></progress></div>'+
  '<dl class="cr-ledger"><div><dt>Direct ground station</dt><dd>'+text(p.station)+'</dd></div>'+
  '<div><dt>Contact window · UTC</dt><dd>'+date(p.startUTC)+' – '+(p.endUTC.slice(0,10)===p.startUTC.slice(0,10)?p.endUTC.slice(11,19):date(p.endUTC))+'</dd></div>'+
  '<div><dt>Commands received aboard</dt><dd>'+bytes(p.receivedCommandGB)+'</dd></div>'+
  '<div><dt>Housekeeping returned</dt><dd>'+bytes(p.returnedTelemetryGB)+'</dd></div></dl>'+
  '<p class="cr-caveat">Only direct payload counts. The relay carried '+bytes(p.relayPayloadGB)+' during this contact. Verifying command execution or file identity would also require the matching command echo or a file checksum.</p>';
}
function redraw(s){
 const status=s.host.querySelector('[data-cr-result]');
 if(s.result)status.innerHTML=evidenceHtml(s.result);
 else status.textContent='Awaiting rehearsal. Enter a delivery goal, then run the first-pass check.';
}
function execute(s,notify){
 s.result=rehearseFirstPass(s.sim,s.goalGB);s.ran=true;redraw(s);
 if(notify)s.onChange?.({goalGB:s.goalGB,ran:true});
}
export function updateCommRehearsal(host,sim,visible,restored,onChange){
 host.hidden=!visible;if(!visible)return;
 const goalGB=validGoal(restored?.goalGB)?restored.goalGB:1,ran=restored?.ran===true;
 let s=local.get(host);
 if(!s||s.sim!==sim){
  host.innerHTML='<details class="cr-wrap"><summary>Mission rehearsal · Can the first pass meet the delivery goal?</summary>'+
   '<div class="cr-body"><p>Rehearse the first complete direct contact that starts after deployment and ends within the next 24 hours. By loss of signal, the station must receive the requested payload and some spacecraft housekeeping telemetry.</p>'+
   '<form class="cr-controls"><label>Payload goal <span>(decimal GB)</span><input type="number" required step="any" inputmode="decimal" value="1" data-cr-goal></label><button type="submit" class="btn">Run first-pass rehearsal</button></form>'+
   '<div data-cr-result role="status" aria-live="polite"></div><footer>Method <a href="'+nasaPhase+'" target="_blank" rel="noopener">NASA Phase D</a> · <a href="'+nasaGround+'" target="_blank" rel="noopener">Ground-system compatibility, §11.7</a></footer></div></details>';
  s={host,sim,onChange,goalGB,ran,result:null,audit:sim.audit};local.set(host,s);
  const details=host.querySelector('details'),form=host.querySelector('form'),field=host.querySelector('input');
  field.value=String(goalGB);
  field.addEventListener('input',()=>{
   const v=field.valueAsNumber;field.setCustomValidity(validGoal(v)?'':'Enter a positive number of GB.');
   if(validGoal(v))s.goalGB=v;
   s.ran=false;s.result=null;redraw(s);s.onChange?.({goalGB:s.goalGB,ran:false});
  });
  form.addEventListener('submit',e=>{e.preventDefault();if(form.reportValidity())execute(s,true)});
  details.addEventListener('toggle',()=>{if(details.open&&s.ran&&!s.result)execute(s,false)});
  redraw(s);
 }else{
  s.onChange=onChange;
  if(s.goalGB!==goalGB||s.ran!==ran||s.audit!==sim.audit){
   s.goalGB=goalGB;s.ran=ran;s.audit=sim.audit;s.result=null;
   const field=host.querySelector('input');field.value=String(goalGB);field.setCustomValidity('');
   if(s.ran&&host.querySelector('details').open)execute(s,false);else redraw(s);
  }
 }
}
