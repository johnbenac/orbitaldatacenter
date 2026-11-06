import {helpButton} from './input-help-ui.js';
import {icon} from './icons.js';
import {designName} from './mission-presets.js';
import {domains,domainReadout,purposeDomainFields} from './domain-analysis.js';
import {solveModes} from './design.js';
import {designOutput,phases} from './lifecycle.js';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const number=(v,d=2)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
export const domainIds=Object.keys(domains);
export const isEditable=p=>['A','B','C'].includes(p);
export function domainNav(v,ref=null){
 const baseline=[['architecture','Spacecraft architecture','box','Inspect the fixed spacecraft layout, internal tank frame and geometric checks.'],['equipment','Master equipment list','list-checks','Explore the installed hardware, mass, heritage and manufacturer references.'],['timeline','Master timeline','clock-3','Inspect ground processing, the countdown, ascent, insertion, deployment and the first complete operating pass.']];
 const links=baseline.map(([id,label,ic,tip])=>`<button class="navitem ${ref===id?'selected':''}" data-page="${id}" data-tip="${tip}" aria-label="${label}" aria-current="${ref===id?'page':'false'}">${icon(ic,16)}<span>${label}</span></button>`).join('');
 return '<div class="navgroup vehicle-baseline"><div class="navlabel">SPACECRAFT BASELINE</div>'+links+'</div><div class="navgroup"><div class="navlabel">MISSION DOMAINS</div>'+domainIds.map((id,i)=>{
 const d=domains[id],current=!ref&&v.domain===id;return `<button class="navitem ${current?'selected':''}" data-domain="${id}" data-tip="${esc(d.summary)} Open the ${esc(d.label)} view within Phase ${v.phase}." aria-current="${current?'page':'false'}">${icon(d.icon,16)}<span>${esc(d.label)}</span><i class="domain-index">${String(i+1).padStart(2,'0')}</i></button>`;
 }).join('')+'</div><div class="navgroup"><div class="navlabel">REFERENCE</div>'+[['sources','Model & sources','book-open'],['checks','Numerical checks','list-checks']].map(([id,label,ic])=>`<button class="navitem ${ref===id?'selected':''}" data-page="${id}">${icon(ic,16)}<span>${label}</span></button>`).join('')+'</div>';
}
function disposalPicker(d,row,domain){
 const isReturn=d.disposalMethod!=='graveyard',keys=isReturn?['targetLatDeg','targetLonDeg','targetToleranceKm']:['graveyardAltitudeKm'];
 return `<section class="disposal-definition"><div class="bankheading"><span class="guideflag">END OF MISSION</span><span class="bankcaption">Disposal strategy</span>${helpButton('disposalMethod','a disposal method',d.disposalMethod)}</div><div class="strategy-picks">${[['reentry','Targeted reentry','globe'],['graveyard','Graveyard orbit','orbit']].map(([method,name,ic])=>`<button class="chip ${d.disposalMethod===method?'selected':''}" aria-pressed="${d.disposalMethod===method}" data-disposal-method="${method}">${icon(ic,13)} ${name}</button>`).join('')}</div><details ${['conops','prop','orbit'].includes(domain)?'open':''}><summary>${isReturn?'Ground target and tolerance':'Retirement orbit altitude'}</summary><div class="definition-fields">${keys.map(row).join('')}</div></details></section>`;
}
export function phaseA(h,v,r,row){
 let keys=purposeDomainFields(v.domain,h.input).filter(k=>!['aiPurpose','disposalMethod','targetLatDeg','targetLonDeg','targetToleranceKm','graveyardAltitudeKm'].includes(k));
 if(v.domain==='avionics')keys=['commandKbps','hkPeriodS'];
 if(v.domain==='conops'){const driver={launch:'launchAllowanceKg',lifetime:'propellantKg',installed:'trayCount'}[v.solve];if(driver)keys=[...new Set([driver,...keys])];if(v.solve==='lifetime')keys=keys.filter(k=>k!=='missionYears')}
 const initial=v.domain==='orbit'?8:6,more=keys.slice(initial);
 return `<div class="phase-input-layout"><section class="panel"><div class="panelhead"><h2>${icon(domains[v.domain].icon,16)} ${esc(domains[v.domain].label)} inputs</h2><button class="textbutton" data-action="hardware">All assumptions ${icon('chevron-right',12)}</button></div><div class="panelpad"><div class="sizing-line"><label for="phase-solve">Design from</label>${helpButton('solve','a sizing method',v.solve)}<select id="phase-solve" aria-label="Sizing method">${[...new Set(['installed','workload','launch','lifetime',v.solve])].map(k=>`<option value="${esc(k)}" ${v.solve===k?'selected':''}>${esc(solveModes[k])}</option>`).join('')}</select></div><div class="definition-fields">${keys.slice(0,initial).map(row).join('')}</div>${more.length?`<details><summary>More ${esc(domains[v.domain].label.toLowerCase())} inputs</summary><div class="definition-fields">${more.map(row).join('')}</div></details>`:''}${v.domain==='conops'?disposalPicker(h.input,row,v.domain):''}</div></section><section class="panel concept-panel" id="phase-output">${designOutput(h,v,r)}</section></div>`;
}
export function observationCard(v,ctx,clock,brief=false){
 const {hardware:h,state:s}=ctx,p=v.phase,id=v.domain,m=brief?{}:domainReadout(id,p,ctx),stage=s.flightPhase||v.chapter;
 const rows=(m.rows||[]).slice(0,3);const cells=rows.map(r=>`<div title="${esc(r.note||r.label)}"><small>${esc(r.label)}</small><strong>${esc(typeof r.value==='number'?number(r.value,3):r.value??'—')} <em>${esc(r.unit||'')}</em></strong></div>`).join('');
 const controls=p==='C'?`<button class="btn" data-action="domainfields">${icon('sliders-horizontal',14)} Change ${id==='orbit'?'orbital elements':'design inputs'}</button><button class="btn" data-action="window">${icon('clock-3',13)} Analysis instant</button><button class="btn" data-action="flightplay">${icon(v.isPlaying?'pause':'play',13)} ${v.isPlaying?'Pause':'Play analysis'}</button>` : `<div class="flight-transport"><button class="btn guideplay" data-action="flightplay">${icon(v.isPlaying?'pause':'play',13)} ${v.isPlaying?'Pause':'Play'} ${p==='F'?'disposal':'flight'}</button><select id="flight-rate" aria-label="Simulation time scale">${[1,10,30,120,600].map(k=>`<option value="${k}" ${v.speed===k?'selected':''}>${k}×</option>`).join('')}</select><button class="iconbtn" data-action="flightrestart" aria-label="Replay the current segment">${icon('rotate-ccw',14)}</button></div>`;
 return `<aside class="chaptercard matrix-card"><div class="chapterkicker"><span class="guideflag">${p==='C'?'INTEGRATED ANALYSIS':p==='E'?'FLIGHT SIMULATION':p==='D'?'LAUNCH OPERATIONS':'MISSION CLOSEOUT'}</span><span>${esc(clock)}</span></div>${brief?'':`<h2>${esc(m.title||domains[id].label)}</h2><p>${esc(m.description||domains[id].summary)}</p><div class="domain-key-readings">${cells}</div>`}<div class="column-actions">${controls}${id==='thermal'?'<button class="readmore" data-action="tempbands">Temperature bands ↗</button>':''}</div><small class="matrix-context">${esc(designName(v))} · ${esc(p==='C'?'integrated vehicle':stage)}</small></aside>`;
}
export function analysisControls(v,keys,c,row){
 return `<section class="panel trade-controls"><header class="panelhead"><h2>${icon('sliders-horizontal',16)} Change one input</h2><button class="textbutton" data-action="pinbaseline">Pin current baseline</button></header><div class="panelpad"><div class="trade-editor"><label>Trade variable<select id="trade-key">${keys.map(k=>`<option value="${k}" ${v.tradeKey===k?'selected':''}>${esc(c[k]?.label||k)}</option>`).join('')}</select></label><div class="trade-field">${row(v.tradeKey)}</div></div><p class="model-footnote">The baseline curve restores this input to its pinned value. Both cases use the other current design assumptions, the same clock and the same analysis window.</p></div></section>`;
}
export function phaseHandoff(id,domain,copy=''){
 return `<div class="phase-handoff"><span>${esc(copy||('Continue with '+domains[domain].label.toLowerCase()+' in the next lifecycle phase.'))}</span><button class="btn" data-phase="${id}">Phase ${id} · ${esc(phases[id].label)} ${icon('chevron-right',13)}</button></div>`;
}
export function missionTotals(ctx,v,clock){
 const a=ctx.audit,h=ctx.hardware;
 if(!a)return `<section class="panel mission-results"><div class="panelhead"><h2>Mission-level analysis</h2><span class="guideflag">WHOLE MISSION</span></div><div class="panelpad"><p>Integrate the installed vehicle through ${number(h.input.missionYears,3)} years, including eclipse seasons, thermal and power limits, ground contacts and the selected disposal route.</p><button class="btn export" data-action="missioncalc">Run mission analysis ${icon('activity',13)}</button></div></section>`;
 const end=a.finalState,rows=[['Mission endpoint',clock(end.t)],['First physical limit',a.firstCrossing?String(a.firstCrossing.limit||a.firstCrossing.label)+' at '+clock(a.firstCrossing.time):'No crossing observed'],['Minimum charge',number(a.minSocPct,2)+'%'],['Peak chip temperature',number(a.maxJunctionK,2)+' K'],['Ground passes',number(a.contactCount||0,0)],['Data received',number(end.deliveredGB/1000,2)+' TB'],['Propellant remaining',number(end.propellantKg,2)+' kg'],['Integrated days',number(a.days,0)]];
 return `<section class="panel mission-results"><div class="panelhead"><h2>Mission-level analysis</h2><span class="guideflag">CHRONOLOGICAL</span></div><div class="mission-tiles">${rows.map(([l,x])=>`<div><small>${esc(l)}</small><strong>${esc(x)}</strong></div>`).join('')}</div></section>`;
}

