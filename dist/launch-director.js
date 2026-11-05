import {launchSitesFor,launchSiteFor,launchPropulsionFor} from './launch-sites.js';
import {launchFleet} from './launch-fleet.js';
import {launchPath} from './launch-path.js';
import {launchEffectsAt} from './launch-effects-state.js';
import {icon} from './icons.js';
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const number=(v,n=1)=>Number.isFinite(v)?v.toFixed(n):'—';
const coord=(n,pos,neg)=>Math.abs(n).toFixed(2)+'° '+(n<0?neg:pos);
const clock=t=>(t<0?'T−':'T+')+String(Math.floor(Math.abs(t)/60)).padStart(2,'0')+':'+String(Math.floor(Math.abs(t)%60)).padStart(2,'0');
const fuels={methalox:'Liquid methane / oxygen',kerolox:'Kerosene / liquid oxygen',hydrolox:'Liquid hydrogen / oxygen',solid:'Composite solid motor',unknown:'Undetermined propellant'};
const fuelName=(id,key)=>id==='falconHeavy'&&key==='kerolox'?'RP-1 kerosene / oxygen':fuels[key];
const exhaust={'split-trench':'Two opposed flame trenches','duct-trench':'Ducted flame trench',diverter:'Flame diverter',concept:'Concept installation',plate:'Water-cooled plate'};
const names={starship:'Starship and Super Heavy',falconHeavy:'Falcon Heavy'};
const approachCache=new WeakMap();
export function siteApproach(d){if(!approachCache.has(d))approachCache.set(d,launchPath(d));return approachCache.get(d)}
export const showLaunchDirector=v=>v.phase==='D'&&['conops','launch','launcher','orbit'].includes(v.domain);
function formatGround(site){return site.id==='starbase-pad2'?'Bidirectional flame diverter':exhaust[site.exhaust]||site.exhaust.replaceAll('-',' ')}
function map(site){
 const label=coord(site.lat,'N','S')+' · '+coord(site.lon,'E','W');
 return `<div class="lp-map" role="img" aria-label="${esc(site.range)}, ${esc(label)}"><i style="left:${(site.lon+180)/3.6}%;top:${(90-site.lat)/1.8}%"></i><small>${label}</small></div>`;
}
const links=s=>s.sources.slice(0,4).map(a=>`<a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.title)} ↗</a>`).join(' ');
export function siteRecord(d,editable){
 const path=siteApproach(d),s=path.site,choices=launchSitesFor(d.launcher),props=launchPropulsionFor(d.launcher);
 const chooser=choices.length>1&&editable?`<label>Compatible launch facility<select class="forminput" data-param="launchSite" aria-label="Compatible launch facility">${choices.map(o=>`<option value="${o.id}" ${o.id===s.id?'selected':''}>${esc(o.name)} · ${esc(o.region)} · ${esc(o.statusLabel)}</option>`).join('')}</select></label>`:'';
 return `<article class="lp-record"><div>${map(s)}</div><div><span class="lp-kicker">LAUNCH SITE &nbsp; / &nbsp; ${esc(s.country)}</span><h3>${esc(s.range)} · ${esc(s.name)}</h3><span class="lp-status">${esc(s.statusLabel)}</span><p>${esc(s.siteNote)}</p>${chooser}<div class="lp-site-buttons"><button class="btn" data-watch-liftoff>View pad and liftoff →</button></div></div></article>
 <details class="lp-detail"><summary>Ground systems, ascent geometry and sources</summary><div><p>${esc(s.pinBasis)}. Core propulsion uses ${esc(fuelName(d.launcher,props.core))}.${props.booster?' The strap-ons use '+esc(fuelName(d.launcher,props.booster))+'.':''}</p>
 <p>At this epoch the illustrative direct ascent departs on an inertial heading of ${number(path.headingDeg)}° clockwise from north. The requested orbit is ${number(path.planeErrorDeg)}° from that plane, with ${number(path.gapKm,0)} km separation at the modeled handoff. ${path.latitudeLimited?'The requested inclination is outside the direct-launch latitude range. ':''}Range safety corridors, doglegs and provider-specific guidance require a mission trajectory.</p>${editable&&path.gapKm>.02?'<button class="chip" data-match-launch>Review site-derived insertion angles</button>':''}<p class="lp-sources">${links(s)}</p></div></details>`;
}
function pathMismatch(h,s,phase){
 const p=siteApproach(h.input);if(p.gapKm<.02||!['ascent','insertion'].includes(phase))return '';
 return `<small class="lp-mismatch">Independent orbit study · ${number(p.gapKm,0)} km from the site-derived handoff. <button class="textbutton" data-launch-align-review>Review in Phase C →</button></small>`;
}
export function launchGuide(h,s,v,playing){
 const d=h.input,pad=launchSiteFor(d.launcher,d.launchSite),fleet=launchFleet[d.launcher],prop=launchPropulsionFor(d.launcher),fx=launchEffectsAt(s.t,d.launcher,pad.id);
 const phase=s.flightPhase,live=phase==='pad'||phase==='ascent',insertion=phase==='insertion';
 const title=live?fx.label:insertion?'Payload separation':'Payload integration';
 const abstract=live?(s.t<0?'The countdown, engine start and water systems share the mission clock.':s.t<35?'Watch engine exhaust reach the diverter and water vapor billow from the pad as the vehicle climbs.':'Follow the stages through engine cutoff, separation and approach to the modeled insertion state.'):insertion?'Inspect the upper stage and the released spacecraft.':'Inspect the stowed spacecraft inside the vehicle’s payload envelope.';
 return `<aside class="lp-guide"><div class="lp-kicker">LAUNCH CONTROL &nbsp; / &nbsp; ${esc(pad.region)}</div><div class="lp-veh">${esc(names[d.launcher]||fleet.family)}</div><h2 id="lp-state">${esc(title||phase)}</h2><p>${esc(abstract)}</p><div class="lp-location"><b>${esc(pad.name)}</b><span>${esc(pad.range)}</span><small>${esc(pad.statusLabel)}</small></div>
 <dl><div><dt>Mission clock</dt><dd id="lp-clock">${clock(s.t)}</dd></div><div><dt>Core propellant</dt><dd>${fuelName(d.launcher,prop.core)}</dd></div>${prop.booster?`<div><dt>Boosters</dt><dd>${fuelName(d.launcher,prop.booster)}</dd></div>`:''}<div><dt>Exhaust routing</dt><dd>${esc(formatGround(pad))}</dd></div></dl>
 ${live&&s.t<100?`<div class="lp-lenses">${[['wide','Full stack'],...(s.t<35?[['pad','Pad works']]:[]),...(d.launcher==='starship'?[['ship','Ship & flaps']]:[]),...(['falconHeavy','starship'].includes(d.launcher)?[['base',d.launcher==='falconHeavy'?'Landing legs':'Super Heavy base']]:[])].map(([key,label])=>`<button class="chip" data-launch-lens="${key}" aria-pressed="${v.camera==='launch'&&v.launchLens===key}">${label}</button>`).join('')}</div>`:''}
 ${pathMismatch(h,s,phase)}
 <div class="flight-transport"><button class="btn export" data-action="flightplay">${icon(playing?'pause':'play',14)} ${playing?'Pause':s.t>=539.999&&s.t<540&&siteApproach(h.input).gapKm>.02?'Open requested orbit':'Play launch'}</button><select id="flight-rate" aria-label="Launch playback speed">${[1,10,30,120,600].map(n=>`<option value="${n}" ${n===v.speed?'selected':''}>${n}×</option>`).join('')}</select></div></aside>`;
}
export function launchSequence(h,s){
 const d=h.input,path=siteApproach(d),site=path.site;
 const fx=launchEffectsAt(0,d.launcher,site.id);
 const keys=[[-20,'Countdown'],[fx.engineStart,fx.waterStart===fx.engineStart&&site.water!=='none'?'Water & engine start':'Engine start'],...(site.water==='none'||fx.waterStart===fx.engineStart?[]:[[fx.waterStart,'Water system']]),[0,'Liftoff'],[6,'Exhaust flow'],[14,'Tower clearance'],[35,'Climb']].sort((a,b)=>a[0]-b[0]);
 const current=keys.filter(([t])=>s.t>=t).at(-1)?.[0];
 return `<section class="lp-sequence panel"><header><div><span class="lp-kicker">PAD CAMERA &nbsp; / &nbsp; ${esc(site.name)}</span><h3>Watch the first minute</h3></div><button class="textbutton" data-page="launch-design">Choose launch vehicle →</button></header>
 <div class="lp-stops">${keys.map(([t,label])=>`<button data-launch-time="${t}" aria-current="${current===t?'step':'false'}" data-tip="Pause at ${clock(t)}. Engine and pad effects follow the selected launch system."><small>${clock(t)}</small><b>${label}</b></button>`).join('')}</div>
 <details class="lp-detail"><summary>Site details and modeling assumptions</summary><div>${map(site)}<p>${esc(site.siteNote)}</p><p>Exhaust colors, deluge clouds and early climb are engineering illustrations. The workbench uses a nine-minute reference ascent. Published engine and staging cues are used where available.</p><p>${path.gapKm>.02?'The site-local ascent differs from the requested orbit by '+number(path.planeErrorDeg)+'° in plane and '+number(path.gapKm,0)+' km at handoff. The operating-orbit study begins at T+09:00. Use the site-derived angles in Phase C to join these states continuously.':'The site-local trajectory joins the selected insertion state at T+09:00.'}</p><p class="lp-sources">${links(site)}</p></div></details></section>`;
}

export function refreshLaunchGuide(host,d,s){
 const met=host.getElementById('lp-clock'),label=host.getElementById('lp-state');
 if(met)met.textContent=clock(s.t);
 if(label&&['pad','ascent'].includes(s.flightPhase))label.textContent=launchEffectsAt(s.t,d.launcher,d.launchSite).label;
}
