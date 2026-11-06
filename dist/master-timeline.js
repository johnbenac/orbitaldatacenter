// One bounded, chronological record per spacecraft design and accepted audit revision.
import {DAY} from './orbit.js';
import {INSERTION_MET} from './launch-effects-state.js';
import {attitudeModes} from './attitude-guidance.js';
import {DEPLOYMENT_STAGES,deploymentGuides} from './deployment.js';
import {DEPLOY_START_S,DEPLOY_END_S,deploymentMET} from './commissioning-clock.js';
import {masterLaunchEvents,launchHold} from './master-launch-events.js';

const cache=new WeakMap();
const format=(v,d=2)=>v.toLocaleString('en-US',{maximumFractionDigits:d});
const bytes=gb=>gb>=1?format(gb)+' GB':gb>=.001?format(gb*1000)+' MB':gb>0?format(gb*1e6)+' kB':'0 bytes';
const phaseAt=t=>t<DEPLOY_START_S?'D':'E';
const stageAt=t=>t<DEPLOY_START_S?'insertion':t<DEPLOY_END_S?'commissioning':'operations';
function row(id,start,title,owner,description,domain,extra={}){
 const segment=stageAt(start);
 return {id,start,title,owner,description,segment,basis:'Integrated flight log',major:false,
  phase:phaseAt(start),chapter:segment,domain,camera:'spacecraft',...extra};
}

function initialWindow(sim){
 const horizon=Math.min(sim.ignition,sim.duration,DEPLOY_END_S+DAY);
 let until=Math.min(horizon,DAY);
 let events=sim.events(0,until);
 const complete=e=>e.type==='contact'&&e.start>=DEPLOY_END_S&&e.end<until;
 let pass=events.find(complete);
 if(!pass&&until<horizon){
  until=horizon;events=sim.events(0,until);pass=events.find(complete);
 }
 // A contact reported by a day record may be truncated at the record boundary.
 // Only declare closure when the full selected-station interval fits in the study.
 let end=pass?.end??horizon;
 let endReason=pass?'The record closes at the end of the first complete station window starting after deployment, over '+pass.station+'.':
  horizon<DEPLOY_END_S+DAY?'The retirement or mission boundary arrived before a complete post-deployment station window.':
   'No complete post-deployment station window closed in the first 24 hours of operations.';
 let trace=end>INSERTION_MET?sim.serviceTimeline(INSERTION_MET,end-INSERTION_MET,{flightRecord:true}):[];
 const lost=trace.find(s=>s.orbitLost);
 if(lost){end=lost.start;trace=trace.filter(s=>s.end<=end);endReason='The modeled orbit reached its lower altitude limit before the checkout record could close.';pass=null;}
 return {events:events.filter(e=>e.start<end&&e.end>INSERTION_MET),trace,end,endReason,pass,lost:!!lost};
}

function deployRows(limit){
 const rows=[];
 for(const [i,s] of DEPLOYMENT_STAGES.entries()){
  const start=deploymentMET(s.at);if(start>limit)break;
  const next=DEPLOYMENT_STAGES[i+1];
  const solar=['hold','release','rollout','tension','tracking'].includes(s.id);
  rows.push(row('deploy-'+s.id,start,s.title,solar?'Electrical power & mechanisms':'Thermal control & mechanisms',deploymentGuides[s.id],solar?'power':'thermal',{
   segment:'commissioning',chapter:'commissioning',basis:'Modeled deployment sequence',
   major:['hold','rollout','upper-root','lower-root','deployed'].includes(s.id),
   ...(next?{end:Math.min(limit,deploymentMET(next.at))}:{})
  }));
 }
 return rows;
}

function appendModes(rows,trace){
 let active;
 for(const s of trace){
  if(active&&s.attitudeMode===active.mode){active.end=s.end;continue;}
  const mode=s.attitudeMode,definition=attitudeModes[mode];if(!definition)continue;
  const record=row('mode-'+mode+'-'+s.start,s.start,definition[0],'Flight software',definition[1],'software',{end:s.end,basis:'Mode executive',mode,seek:(s.start+s.end)/2});
  rows.push(record);active=record;
 }
}

// Time-clipped model step volumes shared by the timeline and the review packet.
export function stationTransfers(trace,station,start,end){
 const amounts={direct_payload_gb:0,relay_payload_gb:0,received_commands_gb:0};
 for(const step of trace){
  if(step.station!==station||step.end<=start||step.start>=end)continue;
  const share=(Math.min(end,step.end)-Math.max(start,step.start))/(step.end-step.start);
  amounts.direct_payload_gb+=step.directDeliveredGB*share;
  amounts.relay_payload_gb+=step.relayDeliveredGB*share;
  amounts.received_commands_gb+=step.commandReceivedGB*share;
 }
 return amounts;
}
function appendPass(rows,e,trace,limit){
 const station=e.station,close=Math.min(e.end,limit);
 const contact=trace.filter(s=>s.station===station&&s.start<close&&s.end>e.start);
 const chapter=stageAt(e.start)==='operations'?'contact':stageAt(e.start);
 const suffix='-'+e.id,owner='Ground network';
 rows.push(row('aos'+suffix,e.start,station+' enters the contact schedule',owner,
  'The ground network selects '+station+' above the configured elevation mask. The terminal can now attempt acquisition.',
  'comm',{end:close,chapter,major:true,station,basis:'Modeled station geometry'}));
 const command=contact.find(s=>s.commandReceivedGB>0);
 if(command)rows.push(row('uplink'+suffix,command.start,'Spacecraft receives ground commands','Command & Data Handling',
  'The powered S-band receiver begins taking queued command traffic from '+station+'.','avionics',
  {seek:(command.start+command.end)/2,chapter:stageAt(command.start)==='operations'?'contact':stageAt(command.start),basis:'Integrated command channel'}));
 const lock=contact.find(s=>s.directPayloadLock),transfer=contact.find(s=>s.directDeliveredGB>0);
 if(lock)rows.push(row('lock'+suffix,lock.start,transfer===lock?'Terminal acquires '+station+' and begins transfer':'Direct payload terminal acquires '+station,'Communications',
  'The direct terminal has satisfied its acquisition, pointing and power gates.'+(transfer===lock?' Buffered data begins moving to the station in the same integration interval.':''),'comm',
  {chapter:'contact',seek:(lock.start+lock.end)/2,basis:'Integrated terminal state'}));
 if(transfer&&transfer!==lock)rows.push(row('transfer'+suffix,transfer.start,'Direct payload transfer begins','Data & Delivery',
  'The recorder begins returning payload data to '+station+'.','data',{chapter:'contact',seek:(transfer.start+transfer.end)/2,basis:'Integrated station ledger'}));
 const transfers=stationTransfers(contact,station,e.start,close),delivered=transfers.direct_payload_gb,uploaded=transfers.received_commands_gb;
 if(e.end<=limit){
  rows.push(row('los'+suffix,e.end,station+' contact window closes',owner,
   'During this station window the spacecraft received '+bytes(uploaded)+' of command traffic and delivered '+bytes(delivered)+' of payload over the direct link.',
   'comm',{chapter:stageAt(e.end)==='operations'?'contact':stageAt(e.end),station,major:true,basis:'Integrated station ledger',measurements:transfers}));
 }
}

function operationalRows(sim,window){
 const {events,trace,end}=window,rows=deployRows(end);
 appendModes(rows,trace);
 for(const e of events){
  const close=Math.min(end,e.end);
  if(e.type==='contact'){appendPass(rows,e,trace,end);continue;}
  if(e.type==='eclipse'){
   const early=e.start<=INSERTION_MET+.025;
   rows.push(row('shadow-'+e.id,e.start,early?'Insertion in Earth’s shadow':'Eclipse entry','Electrical power',
    'Earth blocks direct solar generation. The battery and bus model carry the loads through this interval.','power',{end:close,basis:'Modeled eclipse geometry'}));
   if(e.end<=end)rows.push(row('sunlight-'+e.id,e.end,'Spacecraft returns to sunlight','Electrical power',
    'The arrays see direct sunlight again. Charging depends on array exposure and the bus load.','power',{basis:'Modeled eclipse geometry'}));
  }else if(e.type==='trim'||e.type==='reboost'){
   const trim=e.type==='trim',title=trim?'Insertion-trim':'Orbit-maintenance',chapter=trim?'operations':'reboost';
   rows.push(row('ignition-'+e.id,e.start,title+' ignition','Propulsion',
    'The modeled twin engines fire after the ignition permissives clear. Follow tank inventory and orbit during the finite burn.','prop',
    {end:close,major:true,chapter}));
   if(e.end<=end){
    const a=sim.at(e.start),b=sim.at(e.end),spent=Math.max(0,a.propellantKg-b.propellantKg);
    rows.push(row('cutoff-'+e.id,e.end,title+' cutoff','Propulsion',
     'The burn expended '+format(spent,3)+' kg of propellant.'+(trim?' Cumulative trim delivered is '+format(b.trimPaidDv,3)+' m/s.':''),
     'prop',{chapter:'operations',measurements:{propellant_used_kg:spent,...(trim?{trim_delta_v_m_s:b.trimPaidDv-a.trimPaidDv}:{})}}));
   }
  }else if(e.type==='desat'){
   rows.push(row(e.id,e.start,'Magnetic momentum unloading','Attitude control',
    'The torquers exchange angular momentum with the local magnetic field. The body controller maintains its reference.','attitude',{end:close,chapter:'desat'}));
  }else if(e.type==='burst'){
   rows.push(row(e.id,e.start,'Scheduled compute window opens','Compute payload',
    'The duty schedule permits a compute burst. Execution also requires staged input, resident model state and electrical power.','compute',{end:close}));
  }
 }
 const firstWork=trace.find(s=>s.aiUnitRate>0);
 if(firstWork)rows.push(row('first-useful-work',firstWork.start,'First useful compute begins','Compute payload',
  'The installed payload begins processing staged work under the selected AI mission profile.','compute',{major:true,basis:'Integrated compute ledger'}));
 if(end>=DEPLOY_END_S&&!events.some(e=>e.type==='trim')){
  const s=sim.at(Math.min(end,DEPLOY_END_S+.01)),requested=sim.hardware.input.trimDv>0;
  rows.push(row('trim-check',DEPLOY_END_S,requested?'Insertion trim held':'Trim check complete','Propulsion',
   requested?s.burnHold||'The design requested trim, but the flight log records no ignition in this window.':'The mission requests zero insertion-trim delta-v.','prop',{major:true,basis:'Modeled ignition gate',...(requested?{status:'held'}:{})}));
 }
 rows.push(row('early-record-close',end,window.lost?'Orbital record ends':window.pass?'Early-operations record complete':'Early-operations review boundary',
  'Mission operations',window.endReason,'conops',{major:true,basis:'Study boundary'}));
 return rows;
}

export function masterTimeline(sim){
 const previous=cache.get(sim);
 if(previous&&previous.audit===sim.audit)return previous.timeline;
 const h=sim.hardware,window=initialWindow(sim);
 const hold=launchHold(h);
 const orbitalRows=operationalRows(sim,window);
 if(hold)for(const r of orbitalRows)r.status='conditional';
 const launchRows=masterLaunchEvents(h).filter(r=>r.start<=window.end).map(r=>{
  if(r.end>window.end)return {...r,end:window.end,seek:r.seek==null?r.seek:Math.min(r.seek,window.end),description:r.description+' The review boundary interrupts this sequence.'};
  return r;
 });
 const rows=[...launchRows,...orbitalRows].sort((a,b)=>a.start-b.start);
 const sources=[...new Map(rows.filter(r=>r.sourceUrl).map(r=>[r.sourceUrl,{title:r.sourceTitle,url:r.sourceUrl}])).values()];
 const timeline={rows,start:rows[0].start,end:window.end,endReason:window.endReason,sources,launchHold:hold};
 cache.set(sim,{audit:sim.audit,timeline});return timeline;
}
