import {DEPLOY_END_S} from './commissioning-clock.js';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const n=(x,d=1)=>Number.isFinite(x)?x.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
export function comparisonEvents(events,start,end){
 return events.filter(e=>(e.type==='contact'||e.type==='eclipse')&&e.start-1>=Math.max(start,DEPLOY_END_S)&&e.end+1<=end&&e.end>e.start);
}
export function chooseComparison(events,id,t,domain){
 if(!events.length)return null;
 const picked=events.find(e=>e.id===id);if(picked)return picked;
 const type=['comm','data','purpose','conops','avionics'].includes(domain)?'contact':'eclipse';
 const ofType=events.filter(e=>e.type===type),eligible=ofType.length?ofType:events;
 return eligible.find(e=>t>=e.start-1&&t<=e.end+1)||eligible.find(e=>e.start>=t)||eligible.at(-1);
}
export function compareMoments(model,event){
 const times=[event.start-1,(event.start+event.end)/2,event.end+1];
 const states=times.map(t=>model.at(t)),[before,,after]=states,pass=event.type==='contact';
 const delta=after.queueGB-before.queueGB,energy=before.batteryKWh-after.batteryKWh;
 const explanation=pass?
  `${n(after.deliveredGB-before.deliveredGB,2)} GB reached the ground between the two outside samples. The queue ${Math.abs(delta)<.005?'ended at the same size':delta>0?'grew by '+n(delta,2)+' GB':'shrank by '+n(-delta,2)+' GB'}. New data can enter storage while a transfer is under way.`:
  `Across these samples the pack ${Math.abs(energy)<.005?'finished with the same stored energy':energy>0?'supplied a net '+n(energy,2)+' kWh from storage':'gained a net '+n(-energy,2)+' kWh'}. The charge level records the accumulated energy balance across the shadow crossing.`;
 const rows=pass?[['Received data rate','goodputMbps','Mbit/s'],['Terminal power','terminalW','W'],['Queued data','queueGB','GB']]:
  [['Solar generation','solarKW','kW'],['Battery flow','batteryFlow','kW'],['Battery charge','socPct','%']];
 return {times,states,rows,explanation};
}
export function eventOptions(events,clock){
 return ['eclipse','contact'].map(type=>{
  const list=events.filter(e=>e.type===type);
  return list.length?`<optgroup label="${type==='contact'?'Ground-station passes':'Eclipses'}">${list.map(e=>`<option value="${esc(e.id)}">${esc(e.station||'Eclipse')} · ${esc(clock(e.start))} · ${n((e.end-e.start)/60)} min</option>`).join('')}</optgroup>`:'';
 }).join('');
}
export function eventMomentsMarkup(comparison,clock){
 const {states,times,rows}=comparison;
 function amount(s,key,unit){
  if(key==='batteryFlow'){
   if(s.chargeKW>.001)return n(s.chargeKW)+' <small>kW in</small>';
   if(s.dischargeKW>.001)return n(s.dischargeKW)+' <small>kW out</small>';
   return 'Idle';
  }
  return n(key==='terminalW'?s.terminalKW*1000:s[key],key==='terminalW'?0:1)+' <small>'+esc(unit)+'</small>';
 }
 return states.map((s,i)=>`<button type="button" class="moment" data-compare-moment="${i}" aria-pressed="false"><span class="moment-title">${['Before','During','After'][i]} <small>${esc(clock(times[i]))}</small></span>${rows.map(([label,key,unit])=>`<span class="moment-row"><span>${esc(label)}</span><strong>${amount(s,key,unit)}</strong></span>`).join('')}</button>`).join('');
}
