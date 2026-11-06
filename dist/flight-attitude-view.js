// Flight instruments only consume the physical snapshot. Camera and tab choices never command a joint.
import {attitudeModes,attitudeLimits,guidanceReferences} from './attitude-guidance.js';
import {DEPLOY_END_S} from './commissioning-clock.js';
import {R,MU,TAU} from './orbit.js';
const escape=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const num=(n,unit='',p=1)=>Number.isFinite(n)?n.toFixed(p)+unit:'—';
const historyDomains=new Set(['conops','orbit','attitude','software','comm','thermal','power','environment']);
export function activePointing(v,s){
 return ['C','D','E','F'].includes(v.phase)&&s.t>=540&&!s.orbitLost&&!s.referenceBody&&!(s.spacecraftModelEndedAt!=null&&s.t>=s.spacecraftModelEndedAt);
}
const frameName=v=>v.camera==='orbit'?'Earth-centered view':v.camera==='spacecraft'&&!(v.chapter==='commissioning'&&v.deploymentLens!=='vehicle')?'Local orbital frame':v.camera==='launch'?'Launch camera':'Body-following camera';
const gaugeIcons={
 solar:'<path d="M4 11h4m16 0h4M7 5l3 2m11 0 3-2"/><path d="M4 18h24v4H4zM9 18v4m5-4v4m5-4v4m5-4v4" class="pointer"/>',
 radiator:'<path d="M3 22h11l2-3"/><path d="M6 15h20v4H6zM10 15v4m4-4v4m4-4v4m4-4v4" class="pointer"/>',
 link:'<path d="M9 25h14m-7 0v-5"/><path d="M7 10q2 13 13 9L7 10zm7 4 6-7m-4 0h4v4" class="pointer"/>'
};
const gauge=(name,label,value,detail,angle,tip)=>`<div class="ad-gauge ad-${name}" data-tip="${escape(tip)}"><svg viewBox="0 0 32 32" aria-hidden="true" style="--joint:${Number.isFinite(angle)?angle:0}deg">${gaugeIcons[name]}</svg><div><small>${label}</small><b>${escape(value)}</b><span>${escape(detail)}</span></div></div>`;
export function attitudeStrip(v,s){
 const shadow=s.eclipse?'Earth shadow':'Sunlight',mode=s.attitudeModeLabel||'Attitude solution pending',window=s.station?String(s.station):'No visible station';
 const residual=Number.isFinite(s.terminalErrorDeg)?num(s.terminalErrorDeg,'°',2)+' off target':window;
 const drive=[s.groundLink,s.terminalState].filter(Boolean).join(' · ')||'Parked',station=s.station?' · '+s.station:'';
 const boresight=s.groundLink==='Optical'?s.opticalBoresightBody:s.dishBoresightBody;
 const wingAngle=num(s.wingPitchDeg,'°'),radiatorAngle=num(s.upperRadiatorRollDeg,'°')+' / '+num(s.lowerRadiatorRollDeg,'°');
 return `<div class="ad-title"><div><span class="ad-pip"></span><small>ATTITUDE MODE</small><strong>${escape(mode)}</strong></div><span class="ad-frame">${escape(frameName(v))} · ${shadow}</span></div>
 <p class="ad-objective">${escape(s.attitudeObjective)}</p><div class="ad-gauges">
 ${gauge('solar','Solar wings',wingAngle,num(s.solarKW,' kW')+' generated',s.wingPitchDeg,'Realized wing-root angle and electrical generation. Array incidence and shadow determine the sunlight reaching the blankets.')}
 ${gauge('radiator','Radiator banks',radiatorAngle,num(s.netRejectionKW,' kW')+' net rejection',s.upperRadiatorRollDeg,'Upper and lower trim encoders. Each bank rotates about its long axis. Net rejection subtracts absorbed sunlight, albedo and Earth infrared from thermal emission.')}
 ${gauge('link','Earth terminal',drive+station,residual,Number.isFinite(s.terminalErrorDeg)?Math.atan2(boresight?.[2]||0,boresight?.[1]||0)*180/Math.PI:0,'Terminal state and angular distance from the line to the visible station. Useful traffic requires an acquired link.')}
 </div>`;
}
const legends=[
 {key:'solarKW',name:'Solar generation',unit:'kW',color:'#efb66f'},
 {key:'netRejectionKW',name:'Net heat rejection',unit:'kW',color:'#6ccac4'},
 {key:'radiatorK',name:'Radiator temperature',unit:'K',color:'#d095b1'},
 {key:'socPct',name:'Battery charge',unit:'%',color:'#a4c8ef'}
];
const clock=t=>new Date(Math.floor(t)*1000).toISOString().slice(11,19);
export function showAttitudeHistory(v,s){return activePointing(v,s)&&['C','E'].includes(v.phase)&&v.chapter!=='commissioning'&&historyDomains.has(v.domain)}
export function responseWindow(sim,s,phase){
 // Anchor the plot to a fixed design-orbit interval so the same event stays under the cursor during playback.
 const period=TAU*Math.sqrt((R+sim.hardware.input.altitudeKm)**3/MU);
 const start=540+Math.floor((s.t-540)/period)*period,end=Math.min(start+period,sim.ignition,sim.duration);
 return {start:phase==='E'?Math.max(DEPLOY_END_S,start):start,end};
}
export function orbitResponse(sim,start,end){
 const samples=sim.window(start,end-start,81),events=sim.events(start,end-start);
 const x=t=>Math.min(1000,Math.max(0,(t-start)/(end-start)*1000));
 const masks=events.filter(e=>e.type==='eclipse').map(e=>`<rect x="${x(e.start)}" width="${Math.max(0,x(e.end)-x(e.start))}" height="34" fill="#7283bd" opacity=".20"/>`).join('');
 const contact=events.filter(e=>e.type==='contact').map(e=>`<rect x="${x(e.start)}" width="${Math.max(0,x(e.end)-x(e.start))}" y="31" height="3" fill="#b5a5e6"/>`).join('');
 const charts=legends.map(({key,name,color,unit})=>{
  const values=samples.map(r=>r[key]),lo=Math.min(...values),hi=Math.max(...values),range=hi-lo;
  const path=values.map((v,i)=>(i?'L':'M')+x(samples[i].t).toFixed(2)+' '+(Number.isFinite(v)&&range>1e-7?28-23*(v-lo)/range:16).toFixed(2)).join(' ');
  return `<div class="ad-trend" style="--signal:${color}"><div><i></i><span>${name}</span><b data-ad-now="${key}">—</b></div><svg viewBox="0 0 1000 34" preserveAspectRatio="none" aria-hidden="true">${masks}${contact}<path d="${path}"/><line class="ad-cross" y1="0" y2="34"/></svg><small>${num(lo,'',1)}–${num(hi,' '+unit,1)}</small></div>`;
 }).join('');
 return `<header><div><span class="ad-eyebrow">ORBITAL RESPONSE</span><h3>Power and heat through one orbit</h3></div><div class="ad-key"><span><i></i> Earth shadow</span><span><i></i> Ground contact</span></div></header>
 <div class="ad-plots">${charts}</div><label class="ad-seek"><span>Scrub this orbit</span><input id="ad-seek" type="range" min="${start}" max="${end}" step="any" aria-label="Scrub power and thermal response through this orbit"><span>+${num((end-start)/60,' min',0)}</span></label>
 <details class="ad-energy"><summary>What drives these readings?</summary><div class="ad-fluxes">${[['solarIncidenceCos','Incidence cosine × 100'],['radiatorDirectSolarKW','Absorbed sunlight'],['radiatorAlbedoKW','Absorbed reflected sunlight'],['radiatorEarthIRKW','Absorbed Earth infrared'],['grossEmissionKW','Emitted heat'],['trackingDriveKW','Tracking drive demand']].map(([key,label])=>`<div>${label}<b data-ad-flux="${key}">—</b></div>`).join('')}</div><p>Wing orientation sets the incident flux when sunlit. Radiator orientation changes the absorbed heat. Thermal mass carries heat forward, and the electrical balance charges or discharges the battery.</p></details>
 <div class="ad-jumps"><small>INSPECT THIS INTERVAL</small>${events.filter(e=>['eclipse','contact','reboost','desat'].includes(e.type)&&Math.min(end,e.end)>Math.max(start,e.start)).slice(0,6).map(e=>{const t=(Math.max(start,e.start)+Math.min(end,e.end))/2;return `<button class="chip" data-attitude-time="${t}" data-tip="Pause the mission clock inside this modeled event.">${escape(e.type==='contact'?e.station||'Ground pass':e.type==='eclipse'?'Eclipse':e.type==='desat'?'Momentum unload':'Reboost')} · ${clock(t)}</button>`}).join('')||'<span>No eclipse, contact or maneuver in this interval.</span>'}</div>`;
}
export function refreshResponse(host,input,s,start,end){
 const x=Math.max(0,Math.min(1000,1000*(s.t-start)/(end-start)));
 host.querySelectorAll('.ad-cross').forEach(line=>{line.setAttribute('x1',x);line.setAttribute('x2',x)});
 host.querySelectorAll('[data-ad-now]').forEach(l=>{const metric=legends.find(m=>m.key===l.dataset.adNow);l.textContent=num(s[metric.key],' '+metric.unit)});
 host.querySelectorAll('[data-ad-flux]').forEach(l=>{const k=l.dataset.adFlux;l.textContent=k==='solarIncidenceCos'?num(s[k]*100,'%',1):num(s[k],' kW',3)});
 if(input){input.value=s.t;input.style.setProperty('--pct',x/10+'%')}
}

export function pointingApproach(h,open=false){
 const l=attitudeLimits(h),nominal=attitudeModes[h.input.attitude]||attitudeModes.tracking;
 const card=(name,body)=>`<article><b>${name}</b><p>${body}</p></article>`;
 return `<details class="ad-logic panel" ${open?'open':''}><summary>Flight pointing modes and actuator design</summary>
 <p>The two engines deliver thrust along +Z. The +Y deck carries the directional terminals. The four solar wings extend along ±X. The flight computer selects a reference attitude at each mission instant, and the CMGs slew the bus toward it.</p>
 <div class="ad-phases">
 ${card('01 · Commissioning','The spacecraft holds +Z along its velocity while the solar blankets extend and each radiator unfolds. The rotary drives enter tracking after the deployment interlocks release.')}
 ${card('02 · Routine and eclipse',escape(nominal[1])+' In shadow the wing drives follow the predicted solar direction for sunlight return.')}
 ${card('03 · Ground pass','The CMGs turn the +Y deck toward Earth. The selected Ka or optical terminal aims along the spacecraft-to-station line. The terminal must acquire the link before customer data can leave.')}
 ${card('04 · Burn and unload','Before a planned chemical burn the CMGs align +Z and the radiator roots seek symmetric −45° and +45° parking angles to center their mass. Ignition checks the achieved alignment and torque. Between burns, magnetic rods can unload the CMGs against the local magnetic field while the spacecraft maintains its reference.')}
 </div><p>For this build the conservative worst-axis slew planning rate is ${num(l.bodyRateDegS,'°/s',3)}, based on inertia and installed control authority. Wing roots follow the Sun at up to ${num(l.wingRateDegS,'°/s')}. The upper and lower radiator roots cant out to ${num(l.upperBankCantDeg,'°')} and ${num(l.bankCantDeg,'°')} for clearance on this build. The upper bank also clears the moving communications terminals. Each bank then twists about its span at up to ${num(l.radiatorTrimRateDegS,'°/s')}. In sunlight it presents its edge to the Sun. In shadow it turns toward the warm Earth if the loop approaches its cold limit, and reduces Earth exposure when the loop needs cooling. Terminal steering is limited to a ${num(l.terminalConeDeg,'°',0)} half-cone about its deck normal. Realized slew rate depends on the rotation axis. The controller integrates body rotation with a full component-based inertia tensor and four rate-limited gimbals. Sensor feedback is ideal. Flexible-body modes, rotor imbalance and structural vibration require separate analysis.</p>
 <button class="btn ad-physics-link" data-attitude-flight>Inspect flight pointing →</button><p>ISS flight references for rotary interfaces and thermal pointing</p>${guidanceReferences.map(([name,url])=>`<a href="${escape(url)}" target="_blank" rel="noopener">${escape(name)} ↗</a>`).join(' &nbsp; ')}
 </details>`;
}
