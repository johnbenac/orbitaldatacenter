import {terminalPattern} from './terminal-activity.js';
// Both the live monitor and the window log use spacecraft-side directions.
const terminals=[
 ['S-band','S-band patches','s'],['Ka','Ka reflector','ka'],['Optical','Optical terminal','optical']
];
const services={command:'commands',telemetry:'housekeeping telemetry',input:'customer inputs',payload:'payload data'};
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const number=(v,precision=2)=>v.toLocaleString('en-US',{maximumFractionDigits:precision});
const rate=v=>v>=1000?number(v/1000)+' Gbit/s':v>=1?number(v)+' Mbit/s':v>=.001?number(v*1000)+' kbit/s':number(v*1e6)+' bit/s';
const volume=v=>v>=1?number(v)+' GB':v>=.001?number(v*1e3)+' MB':v>=.000001?number(v*1e6)+' kB':number(v*1e9,0)+' B';
const duration=v=>v>=3600?number(v/3600,1)+' h':v>=120?number(v/60,1)+' min':number(v,1)+' s';
const trafficNames=f=>Object.entries(f.services).filter(([,gb])=>gb>0).map(([key])=>services[key]||key).join(' + ');
const utc=(epoch,t)=>new Date(Date.parse(epoch)+t*1000).toISOString().slice(0,19).replace('T',' ');
const perPage=5;

export function terminalMonitor(s){
 const flows=s.terminalActivity||[];
 return terminals.map(([name,label,color])=>{
  const active=flows.filter(f=>f.terminal===name&&f.mbps>0);
  let standby='Idle';
  if(!active.length&&s.station&&s.groundLink===name){
   if(name==='S-band')standby='Station in view';
   else standby=s.directPayloadLock?'Locked · no payload moving':s.terminalState==='parked'?'Parked':'Awaiting transfer';
  }
  const readout=active.map(f=>{
   const inbound=f.direction==='rx',direction=inbound?'Receiving':'Sending',peer=f.route==='relay'?'assumed relay':f.peer;
   return `<span class="rf-flow" data-tip="${esc(direction+' '+trafficNames(f)+(inbound?' from ':' to ')+peer+'.')}"><b>${inbound?'↓ Receive':'↑ Send'}</b> ${esc(rate(f.mbps))}<small>${inbound?'From':'To'} ${esc(peer)} · ${esc(trafficNames(f))}</small></span>`;
  }).join('');
  return `<div class="rf-terminal rf-${color}" data-active="${!!active.length}"><strong>${label}</strong>${readout||'<span class="rf-standby">'+standby+'</span>'}</div>`;
 }).join('');
}

function activityBars(rows,start,end){
 const lane=direction=>{
  const spans=[];
  for(const r of rows){
   if(r.direction!==direction)continue;
   const x=Math.max(0,Math.floor(600*(r.start-start)/(end-start))),last=spans.at(-1);
   const right=Math.min(600,Math.max(x+1,Math.ceil(600*(r.end-start)/(end-start))));
   if(last&&x<=last[1])last[1]=Math.max(last[1],right);else spans.push([x,right]);
  }
  return spans.map(([l,r])=>'M'+l+' 4H'+r).join(' ');
 };
 return ['tx','rx'].map(direction=>`<div class="rf-band"><span>${direction==='tx'?'↑ Send':'↓ Receive'}</span><svg role="img" aria-label="${direction==='tx'?'Transmitting':'Receiving'} intervals in this window" viewBox="0 0 600 8" preserveAspectRatio="none"><path d="${lane(direction)}"/></svg></div>`).join('');
}
export function terminalWindow(h,runs,start,end,chosen,page=0){
 const [name,label,color]=terminals.find(([key])=>key===chosen)||terminals[0],items=runs.filter(r=>r.terminal===name),pages=Math.max(1,Math.ceil(items.length/perPage));
 const current=Math.min(Math.max(0,page),pages-1),first=current*perPage,epoch=h.input.epoch;
 const startUTC=utc(epoch,start),endUTC=utc(epoch,end);
 const buttons=terminals.map(([key,title,shade])=>`<button type="button" data-rf-select="${key}" aria-pressed="${name===key}" class="rf-${shade}" data-tip="Show ${title} transfers in the selected mission window.">${title}</button>`).join('');
 const total=direction=>volume(items.reduce((n,r)=>n+(r.direction===direction?r.gb:0),0));
 const rows=items.slice(first,first+perPage).map(r=>{
  const receive=r.direction==='rx',peer=r.route==='relay'?'Assumed relay':r.peer;
  const desc=(receive?'Receive from ':'Send to ')+peer,seek=r.seek??(r.start+r.end)/2;
  return `<li><div class="rf-when"><time>${utc(epoch,r.start).slice(11)}</time><small>${duration(r.seconds)}</small></div><div class="rf-who"><b>${receive?'↓':'↑'} ${esc(desc)}</b><small>${esc(trafficNames(r))}</small></div><div class="rf-bytes"><b>${volume(r.gb)}</b><small>${rate(r.mbps)} mean</small></div><button type="button" class="btn rf-watch" data-rf-replay="${seek}" aria-label="${esc('Inspect '+label+' · '+desc+' at '+utc(epoch,r.start)+' UTC')}" data-tip="Pause the flight at a recorded active instant and inspect the signal at the spacecraft.">Inspect <span aria-hidden="true">↗</span></button></li>`;
 }).join('');
 return `<div class="rf-log-head"><div><small class="rf-over">Communications · transfer log</small><h2>When did each terminal carry data?</h2></div><button class="btn" type="button" data-action="window">Choose window</button></div>
 <div class="rf-log-filters" role="group" aria-label="Filter transfer records by terminal">${buttons}</div>
 <div class="rf-log-body rf-${color}"><p class="rf-summary"><strong>${label}</strong> · ${total('tx')} sent · ${total('rx')} received</p>${activityBars(items,start,end)}
 <div class="rf-time-axis"><time>${startUTC} UTC</time><time>${endUTC} UTC</time></div>
 ${rows?`<ul class="rf-records" aria-label="${label} transfer intervals">${rows}</ul><footer class="rf-log-footer"><small>${first+1}–${Math.min(items.length,first+perPage)} of ${items.length} intervals</small><div><button class="btn" data-rf-page="${current-1}" ${current===0?'disabled':''}>Earlier</button><button class="btn" data-rf-page="${current+1}" ${current+1>=pages?'disabled':''}>Later</button></div></footer>`:`<p class="rf-empty">No ${label.toLowerCase()} transfers in this window. Try another window or <button class="textbutton" data-rf-policy>inspect the payload terminal policy in Phase A</button>.</p>`}</div>`;
}

export function signalGuide(h){
 const d=h.input,fullDeg=terminalPattern(d,'Ka').fullWidthRad*180/Math.PI,halfUrad=terminalPattern(d,'Optical').fullWidthRad*5e5,patchWidth=Math.round(terminalPattern(d,'S-band').fullWidthRad*180/Math.PI);
 return `<dl><dt class="rf-s">S-band · broad coverage</dt><dd>The station-facing patch covers the forward sky. Its strongest response is straight out from the face. The study uses a ${patchWidth}° full half-power width. Incoming marks approach the patch and outgoing marks expand away from it. <a href="https://anywaves.com/products/s-band-ttc-antenna/" target="_blank" rel="noopener">Duplex patch reference ↗</a></dd>
 <dt class="rf-ka">Ka-band · directional radio</dt><dd>The ${number(d.kaDishM)} m dish forms a narrow beam at 26 GHz. Its modeled half-power width is ${number(fullDeg,3)}° across. A larger dish narrows the angle, while the beam footprint grows with distance. <a href="https://ipnpr.jpl.nasa.gov/progress_report/42-158/158D.pdf" target="_blank" rel="noopener">NASA/JPL reflector patterns ↗</a></dd>
 <dt class="rf-optical">Optical · fine-pointed laser</dt><dd>The ${number(d.opticalApertureM*100)} cm aperture sends 1,550 nm infrared light. The modeled diffraction half-angle is ${number(halfUrad,1)} µrad. Dashes represent groups of data bits. <a href="https://www.nasa.gov/smallsat-institute/sst-soa/soa-communications/" target="_blank" rel="noopener">NASA optical communications ↗</a></dd></dl>
 <p>Colors, stroke widths and pulse speed make the traffic visible. The Earth view connects a direct transfer to its modeled station. At the optical aperture a local indicator shows relay activity. The study assumes a relay service without specifying the relay’s position.</p>`;
}
