import {icon} from './icons.js';
import {domains} from './domain-analysis.js';
import {bayLesson} from './bay-lessons.js';
import {integrationState} from './integration-sequence.js';
import {integrationProfile} from './integration-profiles.js';
import {starshipEvidence,cargoClearanceSummary} from './starship-evidence.js';

const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const numeric=(value,p)=>typeof value==='number'?value.toLocaleString('en-US',{maximumFractionDigits:p??1}):String(value??'—');
const lensNames={overview:'Work area',payload:'Follow payload',equipment:'Ground equipment',interface:'Test point',endOn:'End-on',sideOn:'Side elevation'};
const lensTips={overview:'See the stowed spacecraft, its support stand and the selected ground station together.',payload:'Keep the camera on the folded data center throughout pickup, encapsulation, and final mating.',equipment:'Move in for a closer look at the tools used by this team.',interface:'Follow the service connection or look at the point this instrument measures.',endOn:'Look down the spacecraft launch axis to see where each pack occupies space beside a flat wall.',sideOn:'Look across the long primary frame and inspect the attachment stations along its length.'};
export function bayCameraControls(view,cameraButtons,cameraName){
 const chosen=view.camera==='launch';
 const lensButton=(key,label)=>`<button type="button" class="bay-camera" data-bay-lens="${key}" aria-pressed="${chosen&&key===view.bayLens}" data-tip="${lensTips[key]}">${icon(({overview:'box',payload:'focus',equipment:'wrench',interface:'crosshair',endOn:'crosshair',sideOn:'ruler'})[key],14)}${label}</button>`;
 return `<div class="bay-lenses" data-choice-group="bay-views" role="group" aria-label="Integration bay viewpoints">${Object.entries(lensNames).filter(([key])=>!['endOn','sideOn'].includes(key)||['mechanical','power','thermal','launch'].includes(view.domain)||key===view.bayLens).map(([key,name])=>lensButton(key,name)).join('')}<button type="button" class="bay-recenter" data-bay-reset aria-label="Recenter the bay camera" data-tip="Restore the framing for this viewpoint after rotating, panning or zooming.">${icon('rotate-ccw',14)} Recenter</button></div>
 <details class="bay-alt-cameras"><summary>${chosen?'Other cameras':esc(cameraName)}</summary><div>${cameraButtons}</div></details>`;
}
export function bayGuide(h,s,v){
 const l=bayLesson(v.domain,h,v.commBench),p=integrationProfile(h.input.launcher,h.input.launchSite);
 const carrier=v.domain==='launcher',ship=p.kind==='ship-bay';
 const disconnected=v.domain==='comm'&&integrationState(s?.t).seat>0&&h.payloadInterface.passes;
 const question=disconnected?'What happens to the test equipment at pickup?':carrier?(ship?'How does a large spacecraft get inside Starship?':'How does the spacecraft meet its rocket?'):l.question;
 const explanation=disconnected?'The ground crew disconnects the test interface before the crane moves the spacecraft. Follow the payload to the launcher or return to checkout to inspect the connection.':carrier?p.handling:l.explanation;
 const procedure=disconnected?'The rack stays on the integration floor. The spacecraft carries its own radios and optical terminal forward.':carrier?p.mating:l.procedure;
 return `<aside class="bay-guide"><header><span class="bay-emblem">${icon(domains[v.domain].icon,20)}</span><div><small>${esc(p.location)}</small><b>${esc(domains[v.domain].label)}</b></div></header>
 <h2>${esc(question)}</h2><p class="bay-explainer">${esc(explanation)}</p>
 <div class="bay-crew"><span>${icon('wrench',14)} ${esc(p.facility)}</span><h3>${carrier?'Loading and mating':esc(l.stationName)}</h3><p>${esc(procedure)}</p></div>
 ${ship&&['launch','launcher'].includes(v.domain)?cargoClearanceSummary(h.fairing):''}
 ${carrier?`<p class="bay-study-note"><strong>Study tooling · ${esc(l.stationName)}</strong><br>${ship?'An intact Starship receives the spacecraft through a retained side hatch. The carriage, locks and launcher-side drilling are project assumptions.':'Two work areas are shown together. The receiving end of the rocket and its supports are at inspection height. Tooling and travel distances are illustrative.'}</p>`:''}
 ${!['launch','launcher'].includes(v.domain)&&s?.t> -3000?'<button class="textbutton" data-loading-at="-3600">Return to ground checkout</button>':''}
 <button class="bay-to-pad" data-chapter="pad">${['launcher','launch'].includes(v.domain)?'See '+esc(h.launcherLabel)+' on the pad':'Follow the spacecraft to the pad'} ${icon('arrow-right',15)}</button></aside>`;
}
export function facilityNotes(h){
 const p=integrationProfile(h.input.launcher,h.input.launchSite);
 return `<details class="facility-record panel"><summary>Facility, handling sequence and sources</summary><h3>${esc(p.facility)}</h3><p>${esc(p.location)}. ${esc(p.handling)}</p><p>${esc(p.mating)}</p><p>${esc(p.provenance)}</p>
 <p>The work areas share one view. The mission clock compresses the handling sequence for inspection. Its timestamps are illustrative.</p>
 ${p.kind==='ship-bay'?starshipEvidence():p.evidence.map(e=>`<h3>${esc(e.label)}</h3><p>${esc(e.text)} <a href="${esc(e.source.url)}" target="_blank" rel="noopener noreferrer">${esc(e.source.title)} ↗</a></p>`).join('')}
 <h3>Launcher attachment</h3><p>${esc(p.interface.basis)} <a href="${esc(p.interface.source.url)}" target="_blank" rel="noopener noreferrer">${esc(p.interface.source.title)} ↗</a></p>
 ${p.kind==='ship-bay'?p.evidence.filter(e=>e.label==='Site-specific basis').map(e=>`<p>${esc(e.text)} <a href="${esc(e.source.url)}" target="_blank" rel="noopener noreferrer">${esc(e.source.title)} ↗</a></p>`).join(''):''}
 </details>`;
}
export function bayEvidence(h,s,v){
 const l=bayLesson(v.domain,h,v.commBench),facts=l.facts||[],ids=Object.keys(domains),idx=ids.indexOf(v.domain),next=ids[(idx+1)%ids.length];
 const read=f=>`<div class="bay-fact"><dt>${esc(f.label)}</dt><dd>${esc(numeric(f.value,f.precision))} <span>${esc(f.unit)}</span></dd></div>`;
 return `<section class="bay-evidence panel" aria-label="Design evaluation"><header><div><span class="bay-eyebrow">Design evaluation</span><h2>${esc(l.title)}</h2></div><button class="textbutton" data-bay-analysis data-tip="Open this subsystem in the integrated design analysis to compare design changes.">Analyze in Phase C ${icon('arrow-up-right',14)}</button></header>
 <dl class="bay-facts">${facts.map(read).join('')}</dl><p class="bay-meaning bay-${esc(l.status)}">${icon(l.status==='exceeds'?'triangle-alert':l.status==='within'?'check':'info',15)}<span>${esc(l.interpretation)}</span></p>
 <details class="bay-basis" ${v.bayBasis?'open':''}><summary>Measurement basis and flight references</summary><div>${facts.map(f=>`<p><b>${esc(f.label)}</b> · ${esc(f.basis)}</p>`).join('')}<p class="bay-citations">${l.sources.map(ref=>`<a href="${esc(ref.url)}" target="_blank" rel="noopener noreferrer">${esc(ref.title)} ↗</a>`).join(' ')}</p></div></details>
 </section><div class="bay-explore"><p>Choose a subsystem to visit another station on the integration floor.</p><button class="btn bay-station-menu" data-action="nav">${icon('menu',13)} Choose a station</button><button class="btn" data-domain="${next}">Next station · ${esc(domains[next].label)} ${icon('arrow-right',13)}</button></div>`;
}
export function bayDisplayControls(v){
 return `<div class="bay-display" aria-label="Bay display"><button data-bay-toggle="labels" aria-pressed="${v.bayLabels}" data-tip="Show or hide two labels attached to the selected equipment and test point.">${icon('tag',13)} Labels</button><button data-bay-toggle="isolate" aria-pressed="${v.bayIsolate}" data-tip="Highlight the selected subsystem and fade surrounding flight hardware. The building and ground equipment retain their materials.">${icon('scan-line',13)} Highlight</button></div>`;
}
