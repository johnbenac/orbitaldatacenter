import {integrationProfile} from './integration-profiles.js';
import {cargoBay,starshipCargoFlight} from './starship-cargo.js';
import {launchClockFor} from './launch-effects-state.js';

const n=(v,p=2)=>Number(v.toFixed(p)).toLocaleString('en-US',{maximumFractionDigits:p});
const link=(url,title)=>'<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+title+' ↗</a>';
export function starshipEvidence(){
 const [guide,photos,flight]=integrationProfile('starship').sources;
 return `<section class="starship-evidence" aria-label="Evidence for the Starship cargo concept">
 <h3>How the reusable ship receives another payload</h3>
 <p><strong>Observed dispenser.</strong> Ship 33 photographs show a dispenser and a narrow sliding door. SpaceX reported deploying 20 flat Starlink V3 satellites on Flight 13. ${link(photos.url,'Ship 33 photographs')} · ${link(flight.url,'SpaceX flight report')}</p>
 <p><strong>Published large-cargo concept.</strong> SpaceX’s 2020 guide depicts a retained door, a payload and adapter that tip outward, then separation. Its 8 m dynamic envelope describes room inside the ship. The lateral opening for an ODC still needs its own dimensions. ${link(guide.url+'#page=3','SpaceX Users Guide, figures 3–4')}</p>
 <p><strong>ODC design choice.</strong> Load the upright article onto a carriage outside a leeward hatch, draw it into the intact ship, and lock it to the deck for ascent. In orbit the carriage presents the spacecraft outside the hull before separation. It retracts so the ship can close its hatch. The hatch, mechanism and timings are study assumptions. Kibo’s flight slide table provides a precedent for moving a supported load through an open hatch. ${link('https://humans-in-space.jaxa.jp/en/biz-lab/experiment/facility/ef/jssod/','JAXA slide-table sequence')}</p>
 <p>Door framing, launch locks, guide stiffness and thermal-protection continuity during reentry would require structural and aerothermal verification.</p></section>`;
}

// Looking aft along ship +Y: page right is leeward (−X), page down is +Z.
// Plan-view arcs share the 3D hatch axis, opening angle and carriage travel.
const sectionRadius=Math.hypot(cargoBay.hingeX,cargoBay.hingeZ);
const project=(x,z)=>[(84-12*x).toFixed(2),(75+12*z).toFixed(2)];
function arc(a,b){
 const points=Array.from({length:49},(_,i)=>{const t=a+(b-a)*i/48;return project(sectionRadius*Math.sin(t),sectionRadius*Math.cos(t)).join(' ')});
 return 'M'+points.join(' L');
}
const center=-Math.PI/2,half=cargoBay.angleRad,pivot=project(cargoBay.hingeX,cargoBay.hingeZ);
const back=arc(center+half,center+2*Math.PI-half),leaf=arc(center-half,center+half);
export function cargoSection(h){
 const f=h.fairing.cargoAccess;if(!f)return '';
 const hMax=Math.max(...h.fairing.stack.map(r=>r.heightM)),wMax=Math.max(...h.fairing.stack.map(r=>r.widthM));
 return `<figure class="ship-section" data-cargo-section data-lift-m="${f.liftStrokeM}"><figcaption><b>Cargo bay cross-section</b><small>Looking down the ship axis</small></figcaption>
 <svg viewBox="0 0 308 153" role="img" aria-label="Live transverse cargo section. The fixed windward hull stays on the left. The carriage extends to the right.">
 <defs><pattern id="ship-grid" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0V12" fill="none" stroke="#7896a0" stroke-opacity=".13" stroke-width=".8"/></pattern></defs>
 <rect x="1" y="1" width="306" height="151" rx="5" fill="#101d26"/><rect x="1" y="1" width="306" height="151" rx="5" fill="url(#ship-grid)"/>
 <path d="M83 75H292" stroke="#688a91" stroke-dasharray="3 4" fill="none"/>
 <path d="${back}" fill="none" stroke="#acbec1" stroke-width="4"/><path d="${arc(Math.PI*.29,Math.PI*.71)}" fill="none" stroke="#687884" stroke-width="7"/>
 <path data-ship-guide stroke="#dca96c" stroke-width="3"/><g data-ship-carriage><path d="M69 59H98M69 91H98M69 59v32" fill="none" stroke="#e6b77c" stroke-width="2"/></g>
 <g data-ship-load><rect x="${84-wMax*6}" y="${75-hMax*6}" width="${wMax*12}" height="${hMax*12}" fill="#467f86" fill-opacity=".88" stroke="#a5ddd7" rx="2"/><path d="M79 75h10m-5-5v10" stroke="#b7e9e4"/></g>
 <path data-ship-leaf d="${leaf}" fill="none" stroke="#efb569" stroke-width="3"/><circle cx="${pivot[0]}" cy="${pivot[1]}" r="3" fill="#ffe1b3"/>
 <g fill="#b6c6cf" font-family="system-ui" font-size="9.8"><text x="8" y="146">Fixed hull</text><text x="166" y="146">Leeward travel →</text></g></svg>
 <p data-ship-readout></p></figure>`;
}
export function refreshCargoSection(host,s){
 const panel=host.querySelector?.('[data-cargo-section]');if(!panel)return;
 const c=launchClockFor('starship'),p=starshipCargoFlight(s.t,c,!s.cargoAccessHeld,Number(panel.dataset.liftM)),angle=p.hatch*cargoBay.travelRad*180/Math.PI;
 const leaflet=panel.querySelector('[data-ship-leaf]');leaflet.setAttribute('transform','rotate('+(-angle).toFixed(2)+' '+pivot.join(' ')+')');
 panel.querySelector('[data-ship-guide]').setAttribute('d','M76 87H'+(84+12*p.carriageM).toFixed(2));
 panel.querySelector('[data-ship-carriage]').setAttribute('transform','translate('+(12*p.carriageM).toFixed(2)+' 0)');
 // A free payload can drift beyond the section. Let the SVG edge clip it at that scale.
 panel.querySelector('[data-ship-load]').setAttribute('transform','translate('+(12*p.payloadM).toFixed(2)+' 0)');
 panel.querySelector('[data-ship-readout]').textContent='Hatch '+n(angle,0)+'° · carriage '+n(p.carriageM)+' m · '+(p.clamped?'payload secured':s.t<c.eject?'guided lift '+n(p.liftM)+' m':'payload released');
}

export function cargoClearanceSummary(f){
 const a=f.cargoAccess;if(!a)return '';
 const rows=[['Hatch width',a.widthM,a.requiredWidthM,a.widthMarginM],['Hatch height',a.heightM,a.requiredHeightM,a.heightMarginM]];
 return `<div class="ship-fit"><strong>Side-loading clearance · ${a.fits?'path fits':'movement held'}</strong><table><thead><tr><th>Opening</th><th>Clear</th><th>Required</th><th>Spare</th></tr></thead><tbody>${rows.map(([label,w,r,m])=>'<tr><th>'+label+'</th><td>'+n(w)+' m</td><td>'+n(r)+' m</td><td>'+n(m)+' m</td></tr>').join('')}</tbody></table><p>The carriage travels ${n(a.strokeM)} m. At full extension the outboard clearance margin is ${n(a.depthMarginM)} m. Clearance to the fixed inner hull is ${n(a.hullMarginM)} m. Width spare is total across the opening. The screen includes the selected motion allowances.</p></div>`;
}
