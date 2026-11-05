import {icon} from './icons.js';
import {domains} from './domain-analysis.js';
import {bayLesson} from './bay-lessons.js';

const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const numeric=(value,p)=>typeof value==='number'?value.toLocaleString('en-US',{maximumFractionDigits:p??1}):String(value??'—');
const lensNames={overview:'Work area',equipment:'Ground equipment',interface:'Test point'};
const lensTips={overview:'See the stowed spacecraft, its support stand and the selected ground station together.',equipment:'Move in for a closer look at the tools used by this team.',interface:'Follow the service connection or look at the point this instrument measures.'};
export function bayCameraControls(view,cameraButtons,cameraName){
 const chosen=view.camera==='launch';
 const lensButton=(key,label)=>`<button type="button" class="bay-camera" data-bay-lens="${key}" aria-pressed="${chosen&&key===view.bayLens}" data-tip="${lensTips[key]}">${icon(({overview:'box',equipment:'wrench',interface:'crosshair'})[key],14)}${label}</button>`;
 return `<div class="bay-lenses" data-choice-group="bay-views" role="group" aria-label="Integration bay viewpoints">${Object.entries(lensNames).map(([key,name])=>lensButton(key,name)).join('')}<button type="button" class="bay-recenter" data-bay-reset aria-label="Recenter the bay camera" data-tip="Restore the framing for this viewpoint after rotating, panning or zooming.">${icon('rotate-ccw',14)} Recenter</button></div>
 <details class="bay-alt-cameras"><summary>${chosen?'Other cameras':esc(cameraName)}</summary><div>${cameraButtons}</div></details>`;
}
export function bayGuide(h,s,v){
 const l=bayLesson(v.domain,h,s);
 return `<aside class="bay-guide"><header><span class="bay-emblem">${icon(domains[v.domain].icon,20)}</span><div><small>Inside the integration bay</small><b>${esc(domains[v.domain].label)}</b></div></header>
 <h2>${esc(l.question)}</h2><p class="bay-explainer">${esc(l.explanation)}</p>
 <div class="bay-crew"><span>${icon('wrench',14)} At this station</span><h3>${esc(l.stationName)}</h3><p>${esc(l.procedure)}</p></div>
 <button class="bay-to-pad" data-chapter="pad">${['launcher','launch'].includes(v.domain)?'See '+esc(h.launcherLabel)+' on the pad':'Follow the spacecraft to the pad'} ${icon('arrow-right',15)}</button></aside>`;
}
export function bayEvidence(h,s,v){
 const l=bayLesson(v.domain,h,s),facts=l.facts||[],ids=Object.keys(domains),idx=ids.indexOf(v.domain),next=ids[(idx+1)%ids.length];
 const read=f=>`<div class="bay-fact"><dt>${esc(f.label)}</dt><dd>${esc(numeric(f.value,f.precision))} <span>${esc(f.unit)}</span></dd></div>`;
 return `<section class="bay-evidence panel" aria-label="Design evaluation"><header><div><span class="bay-eyebrow">Design evaluation</span><h2>${esc(l.title)}</h2></div><button class="textbutton" data-bay-analysis data-tip="Open this subsystem in the integrated design analysis to compare design changes.">Analyze in Phase C ${icon('arrow-up-right',14)}</button></header>
 <dl class="bay-facts">${facts.map(read).join('')}</dl><p class="bay-meaning bay-${esc(l.status)}">${icon(l.status==='exceeds'?'triangle-alert':l.status==='within'?'check':'info',15)}<span>${esc(l.interpretation)}</span></p>
 <details class="bay-basis" ${v.bayBasis?'open':''}><summary>Measurement basis and flight references</summary><div>${facts.map(f=>`<p><b>${esc(f.label)}</b> · ${esc(f.basis)}</p>`).join('')}<p class="bay-citations">${l.sources.map(ref=>`<a href="${esc(ref.url)}" target="_blank" rel="noopener noreferrer">${esc(ref.title)} ↗</a>`).join(' ')}</p></div></details>
 </section><div class="bay-explore"><p>Choose a subsystem to visit another station on the integration floor.</p><button class="btn bay-station-menu" data-action="nav">${icon('menu',13)} Choose a station</button><button class="btn" data-domain="${next}">Next station · ${esc(domains[next].label)} ${icon('arrow-right',13)}</button></div>`;
}
export function bayDisplayControls(v){
 return `<div class="bay-display" aria-label="Bay display"><button data-bay-toggle="labels" aria-pressed="${v.bayLabels}" data-tip="Show or hide two labels attached to the selected equipment and test point.">${icon('tag',13)} Labels</button><button data-bay-toggle="isolate" aria-pressed="${v.bayIsolate}" data-tip="Highlight the selected subsystem and fade surrounding flight hardware. The building and ground equipment retain their materials.">${icon('scan-line',13)} Highlight</button></div>`;
}
