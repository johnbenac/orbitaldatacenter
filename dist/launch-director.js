import {cargoSection,refreshCargoSection} from './starship-evidence.js';
import {flightButtons} from './flight-transport.js';
import {launchSitesFor,launchSiteFor,launchPropulsionFor} from './launch-sites.js';
import {launchFleet} from './launch-fleet.js';
import {geographyForSite} from './launch-geography.js';
import {launchPath} from './launch-path.js';
import {launchHold} from './master-launch-events.js';
import {DEPLOY_START_S} from './commissioning-clock.js';
import {launchEffectsAt,launchClockFor,INSERTION_MET,shipEngineViewAvailable} from './launch-effects-state.js';
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
 const geography=geographyForSite(site.id),tile=geography?.detail||geography;
 if(tile?.image){
  const [west,south,east,north]=tile.bounds,x=(site.lon-west)/(east-west)*100,y=(north-site.lat)/(north-south)*100;
  return `<div class="lp-map lp-local-map" style="aspect-ratio:${tile.image.width}/${tile.image.height}" role="img" aria-label="Aerial context for ${esc(site.range)}, ${esc(site.name)}"><img src="${esc(tile.image.url)}" width="${tile.image.width}" height="${tile.image.height}" alt="" loading="lazy" decoding="async"><i style="left:${x}%;top:${y}%"></i><small>${label}</small></div><small class="lp-map-credit">${esc(tile.image.acquired)} · <a href="${esc(tile.image.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(tile.image.attribution)} ↗</a></small>`;
 }
 return `<div class="lp-map" role="img" aria-label="${esc(site.range)}, ${esc(label)}"><i style="left:${(site.lon+180)/3.6}%;top:${(90-site.lat)/1.8}%"></i><small>${label}</small></div>`;
}
function geographyRecord(site){
 const g=geographyForSite(site.id);if(!g)return '';
 const detail=g.detail?.image||g.image,px=n=>Number.isFinite(n)?n.toFixed(n<2?1:0)+' m/px':'Recorded in data manifest';
 return `<details class="lp-detail lp-geography"><summary>Landscape imagery, terrain & attribution</summary><div><dl><dt>Geographic setting</dt><dd>${esc(g.name)}</dd><dt>Local imagery</dt><dd>${esc(detail.acquired)} · ${px(detail.resolutionM)} bundled pixels</dd>${detail.qualityNote?`<dt>Image detail</dt><dd>${esc(detail.qualityNote)}</dd>`:""}<dt>Regional imagery</dt><dd>${esc(g.image.acquired)} · ${px(g.image.resolutionM)} bundled pixels</dd><dt>Relief</dt><dd>${esc(g.elevation?.attribution||'Elevation source pending')}</dd></dl><p>The landscape follows georeferenced imagery and sampled terrain. Pad hardware, vegetation, water highlights and sky support the PDR visualization. Older imagery may show an earlier site layout; proposed pads remain study geometry.</p><p class="lp-sources">${g.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`).join(' ')}</p></div></details>`;
}
const links=s=>s.sources.slice(0,4).map(a=>`<a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.title)} ↗</a>`).join(' ');
export function siteRecord(d,editable){
 const path=siteApproach(d),s=path.site,choices=launchSitesFor(d.launcher),props=launchPropulsionFor(d.launcher);
 const chooser=choices.length>1&&editable?`<label>Compatible launch site<select class="forminput" data-param="launchSite" aria-label="Compatible launch site">${choices.map(o=>`<option value="${o.id}" ${o.id===s.id?'selected':''}>${esc(o.name)} · ${esc(o.region)} · ${esc(o.statusLabel)}</option>`).join('')}</select></label>`:'';
 return `<article class="lp-record"><div>${map(s)}</div><div><span class="lp-kicker">LAUNCH SITE &nbsp; / &nbsp; ${esc(s.country)}</span><h3>${esc(s.range)} · ${esc(s.name)}</h3><span class="lp-status">${esc(s.statusLabel)}</span><p>${esc(s.siteNote)}</p>${chooser}<div class="lp-site-buttons">${editable?'<button class="btn" data-watch-loading>View payload loading →</button>':''}<button class="btn" data-watch-liftoff>View pad and liftoff →</button><button class="btn" data-pad-open>Explore pad services →</button><button class="btn" data-launch-surroundings>Explore surroundings →</button></div></div></article>${geographyRecord(s)}
 <details class="lp-detail"><summary>Ground systems, ascent geometry and sources</summary><div><p>${esc(s.pinBasis)}. Core propulsion uses ${esc(fuelName(d.launcher,props.core))}.${props.booster?' The strap-ons use '+esc(fuelName(d.launcher,props.booster))+'.':''}</p>
 <p>At this epoch the illustrative direct ascent departs on an inertial heading of ${number(path.headingDeg)}° clockwise from north. The requested orbit is ${number(path.planeErrorDeg)}° from that plane, with ${number(path.gapKm,0)} km separation at the modeled handoff. ${path.latitudeLimited?'The requested inclination is outside the direct-launch latitude range. ':''}Range safety corridors, doglegs and provider-specific guidance require a mission trajectory.</p>${editable&&path.gapKm>.02?'<button class="chip" data-match-launch>Review site-derived insertion angles</button>':''}<p class="lp-sources">${links(s)}</p></div></details>`;
}
function pathMismatch(h,s,phase){
 const p=siteApproach(h.input);if(p.gapKm<.02||!['ascent','insertion'].includes(phase))return '';
 return `<small class="lp-mismatch">Independent orbit study · ${number(p.gapKm,0)} km from the site-derived handoff. <button class="textbutton" data-launch-align-review>Review in Phase C →</button></small>`;
}
export const launchSegment=t=>t<35?'pad':t<INSERTION_MET?'ascent':'insertion';
function lensAvailable(key,id,t){
 if(id==='starship'&&t>=INSERTION_MET)return key==='wide'||key==='ship';
 if(key==='engines')return shipEngineViewAvailable(id,t);
 if(key==='wide')return t<100||shipEngineViewAvailable(id,t);
 return t<(['pad','site','surroundings','services'].includes(key)?35:100);
}
function directorState(s,d){
 const t=s.t,c=launchClockFor(d.launcher),band=launchSegment(t);
 if(band==='pad')return [launchEffectsAt(t,d.launcher,d.launchSite).label,t<0?'The countdown, engine start and water systems share the mission clock.':'Watch the exhaust reach the diverter and the stack clear the tower.'];
 if(band==='ascent'){
  const coast=c.upperCutoff!==null&&t>=c.upperCutoff;
  if(d.launcher==='starship'){
   if(t>=c.stageSeparation&&t<c.boostbackStart)return ['Super Heavy begins its flip','Starship is accelerating away on six Raptors. Watch the booster turn back while the two stages still share the frame.'];
   if(t>=c.boostbackStart&&t<c.stageSeparation+14)return ['Boostback ignition','Super Heavy builds thrust as it pitches toward the return path. The view stays with Starship as the distance between the two vehicles grows.'];
   if(coast)return ['Coasting to insertion','Upper-stage cutoff ends the ascent burn. The ship coasts with all six bells dark.'];
   if(t>=c.upperIgnition)return [t<c.stageSeparation?'Hot staging':'Six Raptors firing','The three smaller center bells are sea-level Raptors. They continue to fire alongside the three larger vacuum bells during the ship’s nominal ascent burn.'];
  }
  return [coast?'Coasting to insertion':launchEffectsAt(t,d.launcher,d.launchSite).label,'The carrier controls pointing and carries the folded spacecraft to the insertion orbit.'];
 }
 if(d.launcher==='starship'){
  if(s.cargoAccessHeld)return ['Cargo movement held','The installed spacecraft or its adapter fails the clearance screen. The hatch and carriage stay secured. Phase C shows the limiting dimensions.'];
  if(t<c.hatchClear)return ['In orbit · cargo door opening','The leeward hatch swings away on its side hinge. The forward flaps and the nose stay attached to the fixed hull.'];
  if(t<c.release)return ['Carriage extending','The spacecraft rides sideways on its retained carriage. Its aft mounting ring stays secured until the whole stowed vehicle is outside.'];
  if(t<c.eject)return ['Clearing the adapter','The clamps open outboard. The spacecraft lifts along its mounting axis to clear the alignment fittings and engine bells before the lateral push.'];
  if(t<c.releaseClear)return ['Spacecraft drifting outward','The folded spacecraft drifts leeward. The empty adapter and guide carriage stay with the ship until the spacecraft clears their return path.'];
  if(t<c.carriageHome)return ['Carriage retracting','The empty strongback returns along its guides to the cargo deck. The open hatch leaves the entire return path clear.'];
  if(t<c.hatchLatched)return ['Hatch closing','With the carriage home, the retained leaf closes into its reinforced frame. The opposite tiled wall remains continuous.'];
  return ['Cargo hatch latched','Starship has recovered its carriage and closed the cargo bay. The separate spacecraft is ready for commissioning.'];
 }
 if(t<c.releaseClear)return ['Payload separating','The flight computer has pointing authority. The adapter stays with the carrier as the stowed spacecraft drifts clear.'];
 return ['Spacecraft clear of the carrier','The flight computer holds attitude. The wings and radiator banks stay folded until commissioning.'];
}
export function launchGuide(h,s,v,playing){
 const d=h.input,pad=launchSiteFor(d.launcher,d.launchSite),fleet=launchFleet[d.launcher],prop=launchPropulsionFor(d.launcher),fx=launchEffectsAt(s.t,d.launcher,pad.id);
 const phase=s.flightPhase,band=launchSegment(s.t),live=band==='pad'||band==='ascent',c=launchClockFor(d.launcher);
 const [title,description]=directorState(s,d),hold=launchHold(h);
 const fact=(name,value)=>`<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`;
 const readouts=band==='pad'?fact('Core propellant',fuelName(d.launcher,prop.core))+fact('Exhaust routing',formatGround(pad)):
  band==='ascent'?fact('Carrier',fleet.stages===1?'Direct-injection core':'Staged ascent')+fact('Target altitude',number(d.altitudeKm,0)+' km'):
  fact('Payload release',s.cargoAccessHeld?'Held':clock(c.eject??c.release))+fact('Commissioning starts',clock(DEPLOY_START_S));

 return `<aside class="lp-guide"><div class="lp-kicker">${band==='insertion'?'SPACECRAFT HANDOVER':'LAUNCH CONTROL'} &nbsp; / &nbsp; ${esc(pad.region)}</div><div class="lp-veh">${esc(names[d.launcher]||fleet.family)}</div><h2 id="lp-state">${esc(title||phase)}</h2><p id="lp-description">${esc(description)}</p><div class="lp-location"><b>${esc(pad.name)}</b><span>${esc(pad.range)}</span><small>${esc(pad.statusLabel)}</small></div>
 ${hold?'<small class="lp-mismatch"><b>Launch authorization held · conditional replay</b><br>'+esc(hold)+'</small>':''}
 <dl><div><dt>Mission clock</dt><dd id="lp-clock">${clock(s.t)}</dd></div>${readouts}</dl>
 ${band==='insertion'&&d.launcher==='starship'?cargoSection(h):''}
 ${live||d.launcher==='starship'&&band==='insertion'?`<div id="lp-lenses"${!lensAvailable('wide',d.launcher,s.t)?' hidden':''} class="lp-lenses" data-choice-group="launch-lenses" role="group" aria-label="Launch camera viewpoints">${[['wide',band==='insertion'?'Cargo mechanism':'Vehicle overview'],['fairing',d.launcher==='starship'?'Cargo door & patch':'Fairing & patch'],['site','Launch site'],['surroundings','Surroundings'],['services','Umbilicals'],['pad','Pad works'],...(d.launcher==='starship'?[['ship',band==='insertion'?'Whole ship':'Ship & flaps'],['engines','Ship engine bay']]:[]),...(['falconHeavy','starship'].includes(d.launcher)?[['base',d.launcher==='falconHeavy'?'Landing legs':'Super Heavy base']]:[])].map(([key,label])=>`<button class="chip" data-launch-lens="${key}"${!lensAvailable(key,d.launcher,s.t)?' hidden':''} aria-pressed="${v.camera==='launch'&&v.launchLens===key}">${label}</button>`).join('')}</div>`:''}
 ${band==='pad'?'<button type="button" class="textbutton" data-pad-panel>Site systems & umbilical register ↓</button>':''}${pathMismatch(h,s,phase)}
 <div class="flight-transport">${flightButtons(playing,s.t>=539.999&&s.t<540&&siteApproach(h.input).gapKm>.02?'Open requested orbit':band==='insertion'?'Play handover':'Play launch',{primary:'btn export'})}<select id="flight-rate" aria-label="Launch playback speed">${[1,10,30,120,600].map(n=>`<option value="${n}" ${n===v.speed?'selected':''}>${n}×</option>`).join('')}</select></div></aside>`;
}
export function launchSequence(h,s,timeline){
 const d=h.input,path=siteApproach(d),site=path.site,band=launchSegment(s.t);
 const fx=launchEffectsAt(0,d.launcher,site.id),c=launchClockFor(d.launcher);
 const pad=[[-20,'Countdown'],[fx.engineStart,fx.waterStart===fx.engineStart&&fx.waterEnabled?'Water & engine start':'Engine start'],...(!fx.waterEnabled||fx.waterStart===fx.engineStart?[]:[[fx.waterStart,'Water system']]),[0,'Liftoff'],[6,'Exhaust flow'],[14,'Tower clearance'],[35,'Climb']].sort((a,b)=>a[0]-b[0]);
 const ascent=[[35,'Climb'],...(timeline?.rows||[]).filter(r=>r.segment==='ascent'&&r.start>35&&r.id!=='launch-strap-cutoff').map(r=>[r.start,r.title]),[INSERTION_MET,'Orbital insertion']];
 const insertion=d.launcher==='starship'?(s.cargoAccessHeld?[[c.doorOpen,'Cargo access held']]:
  [[c.doorOpen,'Open side hatch'],[c.hatchClear,'Extend carriage'],[c.release,'Lift off fitting'],[c.eject,'Release sideways'],[c.releaseClear,'Retract carriage'],[c.carriageHome,'Close hatch'],[c.hatchLatched,'Hatch latched']]):
  [[INSERTION_MET,'Insertion & release'],[c.releaseClear,'Clear the carrier']];
 const primary=band==='insertion'?insertion:band==='ascent'?ascent:pad;
 const current=primary.filter(([t])=>s.t>=t).at(-1)?.[0];
 const controls=(keys,active)=>keys.map(([t,label])=>`<button data-launch-time="${t}" aria-current="${active&&current===t?'step':'false'}" data-tip="Pause the launch clock at ${clock(t)}."><small>${clock(t)}</small><b>${esc(label)}</b></button>`).join('');
 const next=band==='insertion'?(timeline?.rows||[]).filter(r=>r.id==='deploy-hold'||r.id.startsWith('ignition-trim-')||r.id==='trim-check'):[];
 const actions=next.map(r=>`<button data-next-master-call="${esc(r.id)}" data-tip="${esc(r.description)}"><small>${clock(r.start)} · PHASE E</small><b>${esc(r.id==='deploy-hold'?'Begin commissioning':r.title)} →</b></button>`).join('');
 const title=band==='insertion'?'From release to checkout':band==='ascent'?'Follow the ascent':'Watch the first minute';
 return `<section class="lp-sequence panel" data-launch-sequence="${band}"><header><div><span class="lp-kicker">${band==='pad'?'PAD CAMERA':band==='ascent'?'STAGING':'HANDOVER'} &nbsp; / &nbsp; ${esc(site.name)}</span><h3>${title}</h3></div><button class="textbutton" data-page="launch-design">Choose launch vehicle →</button></header>
 <p class="choice-hint">${band==='insertion'?'Pick a milestone or play the handover in either direction.':'Choose a moment to pause the launch there.'}</p>
 <div class="lp-stops" data-choice-group="launch-stops" role="group" aria-label="Launch milestones">${controls(primary,true)}${actions}</div>
 ${band==='pad'?'':'<details class="lp-detail"><summary>Replay countdown and liftoff</summary><div class="lp-stops">'+controls(pad,false)+'</div></details>'}
 <details class="lp-detail"><summary>Site details and modeling assumptions</summary><div>${map(site)}<p>${esc(site.siteNote)}</p><p>Exhaust colors, deluge clouds and early climb are engineering illustrations. The workbench uses a nine-minute reference ascent. Published engine and staging cues are used where available.</p><p>${path.gapKm>.02?'The site-local ascent differs from the requested orbit by '+number(path.planeErrorDeg)+'° in plane and '+number(path.gapKm,0)+' km at handoff. The operating-orbit study begins at T+09:00. Use the site-derived angles in Phase C to join these states continuously.':'The site-local trajectory joins the selected insertion state at T+09:00.'}</p>${d.launcher==='starship'?'<p>The engine sequence depicts a nominal V3 ascent. On Flight 13, all six ship engines ignited during hot staging and completed the ascent burn. <a href="https://www.spacex.com/launches/starship-flight-13" target="_blank" rel="noopener noreferrer">SpaceX Flight 13 report ↗</a></p>':''}<p class="lp-sources">${links(site)}</p></div></details></section>`;
}
export function refreshLaunchGuide(host,d,s){
 if(d.launcher==='starship'&&launchSegment(s.t)==='insertion')refreshCargoSection(host,s);
 const met=host.getElementById('lp-clock'),label=host.getElementById('lp-state');
 if(met)met.textContent=clock(s.t);
 if(label){
  const [title,copy]=directorState(s,d),description=host.getElementById('lp-description');
  if(label.textContent!==title)label.textContent=title;
  if(description&&description.textContent!==copy)description.textContent=copy;
  const lenses=host.getElementById('lp-lenses');
  if(lenses){
   lenses.hidden=!lensAvailable('wide',d.launcher,s.t);
   for(const b of lenses.querySelectorAll('[data-launch-lens]'))b.hidden=!lensAvailable(b.dataset.launchLens,d.launcher,s.t);
  }
 }
}
