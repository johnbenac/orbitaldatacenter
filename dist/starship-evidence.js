// Native SVG keeps the distinction visible without third-party images or tracking.
import {integrationProfile} from './integration-profiles.js';

export function starshipEvidence(){
 const [guide,photos,flight]=integrationProfile('starship').sources;
 const link=(url,title)=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${title} ↗</a>`;
 return `<section class="starship-evidence" aria-label="Evidence for the Starship cargo concept">
 <h3>Two very different ways out</h3>
 <p>A thin satellite can slide sideways through a slot. A folded data center needs room for its whole body and a clear path away from the ship.</p>
 <svg viewBox="0 0 480 157" width="100%" role="img" aria-label="Two forward-bay cross sections. A flat satellite exits a narrow side slot on the left. At right, a hinged door clears a bulky payload as its support tilts out.">
 <rect x="1" y="1" width="232" height="155" rx="8" fill="#19262f" stroke="#485a63"/>
 <rect x="247" y="1" width="232" height="155" rx="8" fill="#232830" stroke="#615b4f"/>
 <g font-family="system-ui,sans-serif" font-size="13" font-weight="600">
 <text x="13" y="22" fill="#c1e4db">Observed · Starlink dispenser</text>
 <text x="259" y="22" fill="#efd1a0">Proposed · large cargo door</text></g>
 <g fill="none" stroke-linecap="round" stroke-linejoin="round">
 <path d="M41 144V91Q44 58 76 34Q108 56 114 91V103M114 111V144" stroke="#acbcc3" stroke-width="3"/>
 <path d="M41 138Q77 122 114 138M287 138Q322 122 360 138" stroke="#657782" stroke-width="2"/>
 <path d="M52 115V75M100 115V75" stroke="#708b90" stroke-width="3"/>
 <path d="M57 81H95M57 89H95M57 97H95M74 106H136" stroke="#9fdbcc" stroke-width="4"/>
 <path d="M148 106h31m-7-5 7 5-7 5" stroke="#a9dccf" stroke-width="2"/>
 <path d="M287 144V91Q292 55 321 34M360 133v11" stroke="#acbcc3" stroke-width="3"/>
 <path d="M321 34Q362 36 395 58L415 77" stroke="#deb780" stroke-width="3"/>
 <circle cx="322" cy="35" r="3" fill="#e7cba3" stroke="#e7cba3"/>
 <g transform="rotate(33 317 122)">
 <path d="M302 121H343" stroke="#dab986" stroke-width="5"/>
 <path d="M308 118V83l5-6h18l6 6v35z" fill="#55717a" stroke="#c1d8d8" stroke-width="2"/>
 <path d="M312 91h21m-21 7h21m-21 7h21" stroke="#9fb5b8" stroke-width="1.5"/>
 </g><circle cx="317" cy="122" r="3" fill="#e3c28f" stroke="#e3c28f"/>
 <path d="m363 90 24-22m-8 1 8-1-1 8" stroke="#e2c08a" stroke-width="2"/>
 </g></svg>
 <p><strong>Photographed and flown.</strong> Ringwatchers’ December 2024 analysis of Ship 33 identifies a sliding door, internal dispenser frame and lifting hardware. SpaceX later reported deploying 20 Starlink V3 satellites on Flight 13 in July 2026. ${link(photos.url,'Annotated Ship 33 photographs')} · ${link(flight.url,'SpaceX flight report')}</p>
 <p><strong>SpaceX’s large-payload concept.</strong> The March 2020 guide shows a door staying with the ship and an adapter tipping the payload outward for release. On the ground, the concept moves an enclosed stack upright from a cleanroom to the pad for a lift onto the ship. ${link(guide.url+'#page=3','Deployment sequence, Fig. 3')} · ${link(guide.url+'#page=5','Ground integration')}</p>
 <p><strong>This workbench.</strong> We chose a dedicated cargo cradle, handling fixtures and an indoor lift so you can follow the load from crane to ship. Their dimensions and the ground sequence are our engineering assumptions for this spacecraft.</p>
 </section>`;
}
