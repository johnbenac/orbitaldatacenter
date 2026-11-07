import {spacecraftInterface as face,interfaceHoles} from './payload-interface.js';
import {integrationProfile} from './integration-profiles.js';
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const n=(value,precision=0)=>value.toLocaleString('en-US',{maximumFractionDigits:precision});
const mm=(m,p=0)=>n(m*1000,p)+' mm';
const anchor=ref=>`<a href="${esc(ref.url)}" target="_blank" rel="noopener noreferrer">${esc(ref.title)} ↗</a>`;
const metric=(name,value)=>`<div><dt>${name}</dt><dd>${value}</dd></div>`;

export function interfaceDrawing(h,flightOnly=false){
 if(h.payloadInterface.attachmentShape==='rectangular-lugs')return allocatedInterfaceDrawing(h,flightOnly);
 const native=integrationProfile(h.input.launcher,h.input.launchSite).interface;
 const scale=65/(face.outerM/2);
 const holeMarks=interfaceHoles().map(([x,y],i)=>`<circle cx="${(x*scale).toFixed(2)}" cy="${(-y*scale).toFixed(2)}" r="1.15" fill="${i===0?'#ffe59c':'#20302d'}"/>`).join('');
 const extent=Math.max(.8,...h.propulsion.engines.map(e=>Math.hypot(e.x,e.y)+e.exitRadiusM));
 const drawingScale=Math.min(1,.8/extent);
 const bells=h.propulsion.engines.map(e=>`<circle cx="${e.x*scale}" cy="${-e.y*scale}" r="${e.exitRadiusM*scale}" fill="#384a54" stroke="#b3c5c8"/>`).join('');
 const ring=`<g transform="translate(88 88) scale(${drawingScale})"><circle cx="0" cy="0" r="65" fill="#b7c6af"/><circle cx="0" cy="0" r="${face.boreM*scale/2}" fill="#14232a"/><circle cx="0" cy="0" r="${face.pcdM*scale/2}" fill="none" stroke="#647874" stroke-dasharray="3 3"/>${holeMarks}${bells}<path d="M-7 0h14m-7 -7v14" stroke="#c8d8d1"/></g>`;
 const w=flightOnly?375:598;
 let info=`<text x="175" y="43" font-size="13" fill="#c0ded4">Aft deck · body coordinates</text><text x="175" y="69">Ø${n(1000*face.pcdM)} mm bolt circle</text><text x="175" y="92">${face.holes} holes · 10° apart</text><text x="175" y="115">Ø${n(1000*face.boreM)} mm clear bore</text><text x="175" y="140" fill="#b6c7c8" font-size="11">Gray circles show both bell exits.</text><text x="88" y="176" text-anchor="middle" fill="#b6c7c8" font-size="11">+X right · +Y up</text>`;
 if(!flightOnly){
  const a=h.fairing.stack[0],k=h.payloadInterface,radBase=native.diameterMm/2000;
  const s=Math.min(82/(a.radiusM||1),95/k.upperFaceStationM),r=radBase*s,R=face.pcdM/2*s,top=143-k.upperFaceStationM*s,base=143;
  info+=`<g transform="translate(481 0)"><text y="22" text-anchor="middle" fill="#c0ded4" font-size="12">Adapter side view</text><path d="M${-R-5} ${top}h${2*R+10}" stroke="#b7c6af" stroke-width="6"/><path d="M${-R} ${top+4}L${-r} ${base}m${2*r} 0L${R} ${top+4}" stroke="#9ab6be" fill="none" stroke-width="4"/><path d="M${-R-6} ${top+9}h${2*R+12}" stroke="#f1b971" stroke-width="2" stroke-dasharray="3 2"/><path d="M${-r-5} ${base}h${2*r+10}" stroke="#89a6bc" stroke-width="6"/><text y="172" text-anchor="middle" font-size="12">Ø${n(native.diameterMm,3)} mm at launcher</text></g>`;
 }
 return `<svg class="iface-diagram" viewBox="0 0 ${w} 190" role="img" aria-label="Spacecraft mounting pattern and ${flightOnly?'engine bell projections':'launcher adapter section'}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="190" fill="#14232a" rx="8"/><g font-family="system-ui,sans-serif" font-size="13" fill="#e1ebe7">${ring}${info}</g></svg>`;
}

export function launcherFaceDrawing(h){
 const m=integrationProfile(h.input.launcher,h.input.launchSite).interface;
 const count=m.bolts||0,r=41;
 const points=Array.from({length:count},(_,i)=>{
  const a=2*Math.PI*i/count;
  return `<circle cx="${(53+r*Math.cos(a)).toFixed(2)}" cy="${(53-r*Math.sin(a)).toFixed(2)}" r="0.78" fill="#d6e9eb"/>`;
 }).join('');
 return `<svg class="iface-native" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 106" role="img" aria-label="${esc(m.name)}, ${count?count+' modeled fastener stations':'nominal interface circle'}"><rect width="270" height="106" rx="7" fill="#14232a"/><circle cx="53" cy="53" r="41" fill="none" stroke="#608895" stroke-width="${count?7:2}" ${count?'':'stroke-dasharray="4 3"'}/>${points}<g font-family="system-ui,sans-serif" fill="#d9e9e6"><text x="109" y="41" font-size="13">Ø${n(m.diameterMm,3)} mm</text><text x="109" y="62" font-size="12">${count?count+' fastener stations':'Nominal interface circle'}</text><text x="109" y="83" font-size="10" fill="#b0c3c4">${count?'Clocking shown schematically':'Drilling pattern unspecified'}</text></g></svg>`;
}

export function renderInterface(h,flightOnly=false){
 if(h.payloadInterface.attachmentShape==='rectangular-lugs')return renderAllocatedInterface(h,flightOnly);
 const datum=integrationProfile(h.input.launcher,h.input.launchSite).interface,m=h.payloadInterface;
 const edge=(m)=>m<0?`${mm(-m,1)} overlap`:`${mm(m,1)} clearance`;
 const facts=metric('Pitch circle',mm(face.pcdM))+metric('Holes',`${face.holes} × Ø${mm(face.holeM)}`)+metric('Fastener',face.fastener+' nominal')+metric('Ring OD / thickness',`${n(face.outerM*1000)} / ${mm(face.thicknessM)}`);
 const flags=[];
 if(m.boreClearanceM<0)flags.push('the two engine bells cannot pass through the specified central bore');
 if(m.deckClearanceM<0)flags.push('the outer flange extends beyond the narrow side of the thrust deck');
 if(m.bellTipClearanceM<0)flags.push('a nozzle reaches below the open stand-off');
 const fit=flags.length?'Fit conflict · '+flags.join(' and ')+'.':'The flange fits on the thrust deck, and both engine bells clear the bore during straight-line mating.';
 const lower=flightOnly?'':`<div class="iface-lower"><h4>${esc(h.launcherLabel)} side</h4>${launcherFaceDrawing(h)}<p><strong>${esc(datum.name)}</strong> · ${esc(datum.diameterMeaning)} Ø${n(datum.diameterMm,3)} mm${datum.bolts!=null?' · '+n(datum.bolts)+' positions':''}.</p><p>${esc(datum.basis)}</p><small>${datum.status==='published'?'Published reference':'Study assumption'} · ${anchor(datum.source)}</small></div>`;
 return `<section class="panel iface-panel"><div class="panelhead"><h2>${flightOnly?'Spacecraft launch interface':'How the spacecraft attaches'}</h2><span class="arch-stamp">${face.id}</span></div><div class="arch-pad"><p>${flightOnly?'Every ODC spacecraft presents the same circular mounting pattern on its aft thrust deck.':'The mission adapter connects two faces. The upper face matches ODC’s fixed bolt circle. The lower face matches the selected launcher. The dashed amber line marks the release joint.'}</p>${interfaceDrawing(h,flightOnly)}
 <div class="iface-columns"><div><h4>Spacecraft side</h4><dl class="iface-facts">${facts}</dl><p>The hole centers lie on the pitch circle. Hole 1 points along +X and the remaining holes advance toward +Y. The mounting face is 18 mm aft of the thrust bulkhead, normal to body Z.</p><small>Project-defined pattern and clocking</small></div>${lower}</div>
 <p class="iface-fit ${m.passes?'':'iface-negative'}"><strong>${fit}</strong><br>Radial bell fit · ${edge(m.boreClearanceM)}. Axial space below the bells · ${edge(m.bellTipClearanceM)}.</p>
 <details><summary>Load path, separation and dimensional basis</summary><p>The bolts carry launch loads from the thrust deck into the upper fitting. A clamp below that joint opens for separation. The passive ring flies with the spacecraft. The active clamp, stand-off and lower adapter stay with the launcher.</p><p>ODC specifies the hole pattern, ring dimensions, open stand-off and transition geometry for this study. The cited flight example documents the bolted upper ring and release principle. Bolt preload, strength, release shock and provider acceptance require a mission interface agreement.</p><p>${anchor(face.reference)}</p></details>
 ${flightOnly?'':'<button class="btn iface-watch" data-watch-loading>Watch payload loading →</button>'}
 </div></section>`;
}

function allocatedInterfaceDrawing(h,flightOnly){
 const m=h.payloadInterface,w=flightOnly?420:650,k=128/Math.max(h.bodyWidthM,h.bodyHeightM),X=x=>100+x*k,Y=y=>94-y*k;
 const pads=m.lugPositionsBodyM.map((p,i)=>`<rect x="${X(p[0])-m.lugSizeM*k/2}" y="${Y(p[1])-m.lugSizeM*k/2}" width="${m.lugSizeM*k}" height="${m.lugSizeM*k}" fill="#f1ba72"/><text x="${X(p[0])}" y="${Y(p[1])-10}" text-anchor="middle" font-size="10">${i+1}</text>`).join('');
 const bells=h.propulsion.engines.map(e=>`<circle cx="${X(e.x)}" cy="${Y(e.y)}" r="${e.exitRadiusM*k}" fill="#344b58" stroke="#aac2cb"/>`).join('');
 const bus=`<rect x="${X(-h.bodyWidthM/2)}" y="${Y(h.bodyHeightM/2)}" width="${h.bodyWidthM*k}" height="${h.bodyHeightM*k}" fill="#1d343b" stroke="#83cbbd"/>`;
 let side='';
 if(!flightOnly){const lower=integrationProfile(h.input.launcher,h.input.launchSite).interface.diameterMm/2000,sk=Math.min(70/Math.max(lower,.4*h.bodyWidthM),90/Math.max(.1,m.upperFaceStationM)),top=145-m.upperFaceStationM*sk,upper=.4*h.bodyWidthM*sk,base=lower*sk;
  side=`<g transform="translate(548 0)"><text x="0" y="22" text-anchor="middle" font-size="12">Open adapter cradle</text><path d="M${-upper} ${top}L${-base} 145M${upper} ${top}L${base} 145" fill="none" stroke="#91abb9" stroke-width="5"/><path d="M${-base-5} 145H${base+5}" stroke="#8cb9d2" stroke-width="6"/><path d="M${-upper-7} ${top}h14M${upper-7} ${top}h14" stroke="#f1ba72" stroke-width="7"/><path d="M${-base-4} 136H${base+4}" stroke="#f1ba72" stroke-dasharray="4 3"/><text x="0" y="180" text-anchor="middle" font-size="11">Provider lower attachment</text></g>`;
 }
 return `<svg class="iface-diagram" viewBox="0 0 ${w} 200" role="img" aria-label="Four allocated spacecraft attachment pads and open launch cradle"><rect width="${w}" height="200" rx="8" fill="#14232a"/><g font-family="system-ui,sans-serif" fill="#dce9e6">${bus}${pads}${bells}<text x="100" y="184" text-anchor="middle" font-size="11">+X right · +Y up</text><text x="198" y="54" font-size="13">Four allocated corner attachments</text><text x="198" y="81" font-size="12">${n(.8*h.bodyWidthM,2)} × ${n(.8*h.bodyHeightM,2)} m centers</text><text x="198" y="108" font-size="12">Open space for the engine bells</text><text x="198" y="137" font-size="11" fill="#b1c4c6">Fasteners and release design remain open.</text>${side}</g></svg>`;
}

function renderAllocatedInterface(h,flightOnly){
 const m=h.payloadInterface,datum=integrationProfile(h.input.launcher,h.input.launchSite).interface;
 const lower=flightOnly?'':`<div class="iface-lower"><h4>${esc(h.launcherLabel)} side</h4>${launcherFaceDrawing(h)}<p><strong>${esc(datum.name)}</strong> · ${esc(datum.diameterMeaning)} Ø${n(datum.diameterMm,3)} mm.</p><small>${esc(datum.basis)} · ${anchor(datum.source)}</small></div>`;
 const facts=metric('Upper interface',m.kind.replaceAll('-',' '))+metric('Attachment centers',`${n(.8*h.bodyWidthM,2)} × ${n(.8*h.bodyHeightM,2)} m`)+metric('Allocated pad size',mm(m.lugSizeM))+metric('Fastener / separation ICD','Open');
 return `<section class="panel iface-panel"><div class="panelhead"><h2>${flightOnly?'Spacecraft launch interface':'How this architecture attaches'}</h2><span class="arch-stamp">ALLOCATED CRADLE</span></div><div class="arch-pad"><p>The ${esc(m.kind.replaceAll('-',' '))} uses four corner load-transfer attachments on its aft structure. The open adapter carries those loads to the selected launch vehicle’s lower attachment.</p>${allocatedInterfaceDrawing(h,flightOnly)}<div class="iface-columns"><div><h4>Spacecraft side</h4><dl class="iface-facts">${facts}</dl><small>${esc(m.id)} · ${esc(m.basis)}</small></div>${lower}</div><p class="iface-fit ${m.passes?'':'iface-negative'}"><strong>${m.passes?'Allocated attachment geometry clears the modeled engine bells.':'Attachment geometry has a clearance shortfall.'}</strong><br>Minimum bell-to-pad clearance · ${mm(m.boreClearanceM,1)}. Pad-to-deck edge · ${mm(m.deckClearanceM,1)}. Axial space below bells · ${mm(m.bellTipClearanceM,1)}.</p><details><summary>Load path and interface evidence</summary><p>Four allocated upper attachments transfer the stowed spacecraft loads through the open cradle into the provider-side interface. Separation hardware, preload, stiffness, release shock, service disconnects and the provider’s accepted load cases require a mission interface agreement. The geometric screen does not establish compatibility or qualification.</p><p>Cradle mass remains within the declared launch-adapter allocation. No supplier fastener pattern or dispenser arrangement has been assumed to be published.</p></details>${flightOnly?'':'<button class="btn iface-watch" data-watch-loading>Watch payload loading →</button>'}</div></section>`;
}
