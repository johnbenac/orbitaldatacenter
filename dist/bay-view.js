import {icon} from './icons.js';
import {domains} from './domain-analysis.js';
import {bayLesson} from './bay-lessons.js';
import {integrationState} from './integration-sequence.js';
import {integrationProfile} from './integration-profiles.js';
import {processingFacility,FACILITY_REFERENCES} from './processing-facilities.js';
import {groundOperation} from './ground-processing.js';
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
 const l=bayLesson(v.domain,h,v.commBench),p=integrationProfile(h.input.launcher,h.input.launchSite),facility=processingFacility(h);
 const carrier=v.domain==='launcher',ship=p.kind==='ship-bay';
 const operation=groundOperation(v.processingOperation,v.commBench),rehearsal=operation.domain===v.domain&&!carrier;
 const disconnected=!['launcher','launch'].includes(v.domain)&&integrationState(s?.t).seat>0&&h.payloadInterface.passes;
 const questions={environment:'How does the spacecraft arrive ready for processing?',battery:'How is the flight battery prepared on the ground?',propellant:'How does propellant reach the spacecraft?',coolant:'How is the spacecraft cooled before launch?',rf:v.commBench==='ka'?'How is the high-rate data path checked on the ground?':'How do commands and telemetry cross the test interface?',optical:'How is the laser terminal aligned before flight?',metrology:'How are mass and mechanical datums verified?'};
 const question=disconnected?'What happens to ground equipment at pickup?':carrier?(ship?'How does a large spacecraft get inside Starship?':'How does the spacecraft meet its rocket?'):rehearsal?questions[operation.id]:l.question;
 const explanation=disconnected?'Service connections and test fixtures are removed before the crane moves the spacecraft. Follow the payload to the launcher or return to checkout to inspect the equipment.':carrier?p.handling:rehearsal?operation.purpose:l.explanation;
 const procedure=disconnected?'Portable ground equipment stays on the floor. The spacecraft carries its installed flight hardware forward in the released configuration.':carrier?p.mating:rehearsal?operation.stages[0].detail:l.procedure;
 return `<aside class="bay-guide"><header><span class="bay-emblem">${icon(domains[v.domain].icon,20)}</span><div><small>${esc(p.location)}</small><b>${esc(domains[v.domain].label)}</b></div></header>
 <p class="bay-facility-status">${esc(facility.shortName)} <span>${esc(facility.statusLabel)}</span></p>
 <h2>${esc(question)}</h2><p class="bay-explainer">${esc(explanation)}</p>
 <div class="bay-crew"><span>${icon('wrench',14)} ${esc(facility.visual.processingLabel)}</span><h3>${carrier?'Loading and mating':esc(rehearsal?operation.venue:l.stationName)}</h3><p>${esc(procedure)}</p></div>
 ${ship&&['launch','launcher'].includes(v.domain)?cargoClearanceSummary(h.fairing):''}
 ${carrier?`<p class="bay-study-note"><strong>Study tooling · ${esc(l.stationName)}</strong><br>${ship?'An intact Starship receives the spacecraft through a retained side hatch. The carriage, locks and launcher-side drilling are project assumptions.':'Two work areas are shown together. The receiving end of the rocket and its supports are at inspection height. Tooling and travel distances are illustrative.'}</p>`:''}
 ${!['launch','launcher'].includes(v.domain)&&s?.t> -3000?'<button class="textbutton" data-loading-at="-3600">Return to ground checkout</button>':''}
 <button class="bay-to-pad" data-chapter="pad">${['launcher','launch'].includes(v.domain)?'See '+esc(h.launcherLabel)+' on the pad':'Follow the spacecraft to the pad'} ${icon('arrow-right',15)}</button></aside>`;
}
export function facilityNotes(h){
 const p=integrationProfile(h.input.launcher,h.input.launchSite),f=processingFacility(h);
 const sourceLink=s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`;
 return `<details class="facility-record panel"><summary>Facility route, portable GSE and source documents</summary><header class="facility-record-heading"><div><small>Selected campaign · ${esc(f.statusLabel)}</small><h3>${esc(f.name)}</h3><p>${esc(f.location)}</p></div><span class="facility-open">Mission acceptance open</span></header>
 <p>${esc(f.evidenceStatus)}. ${esc(f.scope)}</p><ol class="facility-route">${f.roles.map((r,i)=>`<li><span>${i+1}</span><div><b>${esc(r.label)}</b><p>${esc(r.description)}</p></div></li>`).join('')}</ol>
 ${f.candidateFacilities.length?`<h3>Candidate spacecraft processing provider</h3>${f.candidateFacilities.map(c=>`<p><b>${esc(c.name)}</b> · ${esc(c.basis)}</p>`).join('')}`:''}
 <h3>Ground equipment travels; facility interfaces are agreed locally</h3><div class="facility-gse">${f.portableGSE.map(g=>`<article><h4>${esc(g.label)}</h4><p>${esc(g.description)}</p></article>`).join('')}</div>
 <h3>Capability and verification allocation</h3><div class="facility-capabilities">${f.capabilities.map(c=>`<article><b>${esc(c.label)}</b><span>${esc(c.status)}</span><p>${esc(c.basis)}</p></article>`).join('')}</div>
 <h3>Release items for this campaign</h3><ul>${f.requiredApprovals.map(a=>`<li><b>${esc(a.label)}</b> · ${esc(a.description)}</li>`).join('')}</ul>
 <h3>Processing references beyond this launcher</h3><div class="facility-reference-grid">${Object.values(FACILITY_REFERENCES).map(r=>`<article><h4>${esc(r.name)}</h4><small>${esc(r.role)}</small><p>${esc(r.summary)}</p>${r.sources.map(sourceLink).join(' ')}</article>`).join('')}</div>
 <h3>Handling sequence and interface basis</h3><p>${esc(p.handling)}</p><p>${esc(p.mating)}</p><p>${esc(p.provenance)}</p>
 <p>Separate work areas share this schematic view. The handling clock compresses transport and mating for inspection; the servicing rehearsal has its own progress control. Neither supplies an actual campaign duration.</p>
 ${p.kind==='ship-bay'?starshipEvidence():p.evidence.map(e=>`<h3>${esc(e.label)}</h3><p>${esc(e.text)} <a href="${esc(e.source.url)}" target="_blank" rel="noopener noreferrer">${esc(e.source.title)} ↗</a></p>`).join('')}
 <h3>Launcher attachment</h3><p>${esc(p.interface.basis)} <a href="${esc(p.interface.source.url)}" target="_blank" rel="noopener noreferrer">${esc(p.interface.source.title)} ↗</a></p>
 ${p.kind==='ship-bay'?p.evidence.filter(e=>e.label==='Site-specific basis').map(e=>`<p>${esc(e.text)} <a href="${esc(e.source.url)}" target="_blank" rel="noopener noreferrer">${esc(e.source.title)} ↗</a></p>`).join(''):''}
 <h3>Facility documents</h3><div class="facility-sources">${f.sources.map(s=>`<p>${sourceLink(s)}<small>${esc(s.section)}</small></p>`).join('')}</div><p>${f.limitations.map(esc).join(' ')}</p>
 <button class="btn" data-page="mission">Open Mission Baseline · ground processing plan</button></details>`;
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
 return `<div class="bay-display" aria-label="Bay display"><button data-bay-toggle="labels" aria-pressed="${v.bayLabels}" data-tip="Show object labels and leader lines for the spacecraft, ground equipment, service connections, handling fixtures and facility zones. Labels adapt to the camera and available space.">${icon('tag',13)} Labels</button><button data-bay-toggle="isolate" aria-pressed="${v.bayIsolate}" data-tip="Highlight the selected subsystem and fade surrounding flight hardware. The building and ground equipment retain their materials.">${icon('scan-line',13)} Highlight</button></div>`;
}
