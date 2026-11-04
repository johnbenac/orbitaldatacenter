import {icon} from './icons.js';
import {designName,chapters} from './mission-guide.js';
import {solveModes} from './design.js';
import {pages,cfg} from './workspaces.js';

const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const n=(x,d=1)=>Number.isFinite(x)?x.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
export const phases={
 A:{label:'Mission inputs',title:'Define the mission',sub:'Choose the workload, orbit and design constraints that size the spacecraft.',native:'Concept and technology development'},
 B:{label:'Subsystem design',title:'Design the subsystems',sub:'Trace the components and flows inside each spacecraft subsystem.',native:'Preliminary design and technology completion'},
 C:{label:'Integrated vehicle',title:'Inspect the integrated vehicle',sub:'Explore the assembled spacecraft, inspect its thermal map and check how the subsystems fit together.',native:'Final design and fabrication'},
 D:{label:'Launch & insertion',title:'Launch and insertion',sub:'Check the stowed vehicle, move to the pad, and follow the stack into orbit.',native:'System assembly, integration and test, launch'},
 E:{label:'Operations',title:'Operate the spacecraft',sub:'Commission the vehicle and follow compute, downlink and station-keeping through a shared mission clock.',native:'Operations and sustainment'},
 F:{label:'Decommissioning',title:'Decommission the spacecraft',sub:'Inspect the reserved propellant, retrograde burn, coast and descending atmospheric interface.',native:'Closeout'}
};
export const chapterPhase=id=>['integration','pad','ascent','insertion'].includes(id)?'D':id==='deorbit'?'F':'E';
export function phaseFromView(v){
 if(v.page&&Object.hasOwn(cfg,v.page))return 'B';
 if(Object.hasOwn(phases,v.phase))return v.phase;
 return chapterPhase(v.chapter|| (v.t<1200?'integration':'operations'));
}
export function lifecycleNav(phase){return Object.entries(phases).map(([id,p])=>`<button class="phase-tab ${phase===id?'current':''}" data-phase="${id}" aria-current="${phase===id?'step':'false'}" data-tip="${esc(p.sub)}"><i>${id}</i><span><small>PHASE ${id}</small><strong>${esc(p.label)}</strong></span></button>`).join('')}
export const lifecycleLink='<a href="https://www.nasa.gov/wp-content/uploads/2018/09/nasa_systems_engineering_handbook_0.pdf#page=27" target="_blank" rel="noopener">NASA Systems Engineering Handbook ↗</a>';
export function sourceNote(){return '<p class="phase-source">The workbench follows NASA’s six project phases. Phase C provides the integrated design review. Phase D covers physical integration, testing and launch. '+lifecycleLink+'</p>'}
function footprint(h){
 const b=h.bodyLengthM,w=h.bodyWidthM,sw=h.wingWidthM,sl=h.wingLengthM,rw=h.radiatorWidthM,rl=h.radiatorLengthM;
 const scale=Math.min(245/(2*sl+w+1),110/(b+2*rl+2)),cx=162,cy=76;
 const rect=(x,y,a,c,fill,stroke)=>`<rect x="${cx+scale*x}" y="${cy+scale*y}" width="${scale*a}" height="${scale*c}" fill="${fill}" stroke="${stroke}" stroke-width=".8"/>`;
 let parts='';
 for(const side of [-1,1])for(const station of [-1,1]){
  const x=side<0?-w/2-sl-.2:w/2+.2,y=(sw+.35)*station/2-sw/2;
  parts+=rect(x,y,sl,sw,'url(#concept-cells)','#8cb7cd');
  for(let k=1;k<3;k++)parts+=rect(x+k*sl/3,y,.025,sw,'#c8d9c8','#afc0b7');
 }
 for(const dir of [-1,1])parts+=rect(-rw/2,dir<0?-b/2-rl-.3:b/2+.3,rw,rl,'url(#concept-rad)','#aebbbd');
 parts+=rect(-w/2,-b/2,w,b,'#ccb68c','#f4d0a4');
 return `<svg class="concept-drawing" viewBox="0 0 324 157" role="img" aria-label="Plan view of the selected spacecraft with four solar wings and two radiator banks"><defs><pattern id="concept-grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="#334a54" stroke-width=".5"/></pattern><pattern id="concept-cells" width="4" height="5" patternUnits="userSpaceOnUse"><rect width="4" height="5" fill="#354d6c"/><path d="M4 0H0V5" stroke="#7c9eb1" stroke-width=".5" fill="none"/></pattern><pattern id="concept-rad" width="4" height="8" patternUnits="userSpaceOnUse"><rect width="4" height="8" fill="#8299a0"/><path d="M1 0V8" stroke="#b1bbbc" stroke-width="1"/></pattern></defs><rect width="324" height="157" fill="#131d24"/><rect width="324" height="157" fill="url(#concept-grid)"/><path d="M18 76H306M162 6V149" stroke="#69818b" stroke-width=".6" stroke-dasharray="3 5"/>${parts}<text x="11" y="16" fill="#99b1bb" font-family="monospace" font-size="7.5" letter-spacing="1.2">DEPLOYED PLANFORM</text></svg>`;
}
export function designOutput(h,v,result){
 return `<div class="concept-top"><span class="guideflag">CURRENT DESIGN</span><strong>${esc(designName(v))}</strong></div>${footprint(h)}<div class="concept-readings">${[['Compute',n(h.itKw,1),'kW IT'],['Launch stack',n(h.launchKg/1000,2),'t'],['Array area',n(h.solarM2,0),'m²'],['Decode capacity',n(h.tokensPerSec,0),'tok/s']].map(([l,x,u])=>`<div><small>${l}</small><strong>${x} <em>${u}</em></strong></div>`).join('')}</div><p class="concept-fit">${icon(h.fit&&h.massMarginKg>=0?'check':'ruler',14)} ${h.fit&&h.massMarginKg>=0?'Within the selected single-launch envelope':'Exceeds a selected single-launch constraint'} · ${esc(h.launcherLabel)}</p>${v.solve==='installed'?'':`<p class="concept-fit">${esc(result.binding)} · ${n(result.achieved,2)} ${esc(result.unit)}</p>`}`;
}
export function inputPhase(h,v,r,inputRow){
 const keys=v.solve==='workload'?['requiredTps','workload','duty','missionYears','altitudeKm','launcher']:v.solve==='launch'?['launchAllowanceKg','launcher','missionYears','workload','altitudeKm','duty']:v.solve==='lifetime'?['propellantKg','solarM2','batteryKWh','duty','altitudeKm','trayCount']:['trayCount','workload','missionYears','altitudeKm','duty','launcher'];
 return `<div class="phase-input-layout"><section class="panel"><div class="panelhead"><h2>${icon('sliders-horizontal',16)} Mission definition</h2><button class="textbutton" data-action="hardware">All assumptions ${icon('chevron-right',12)}</button></div><div class="panelpad"><label class="sizing-line">Design from<select id="phase-solve" aria-label="Sizing method">${['installed','workload','launch','lifetime',...(!['installed','workload','launch','lifetime'].includes(v.solve)?[v.solve]:[])].map(k=>`<option value="${k}" ${v.solve===k?'selected':''}>${esc(({installed:'Installed hardware',workload:'Required workload',launch:'One launch allowance',lifetime:'Hardware endurance'})[k]||solveModes[k])}</option>`).join('')}</select></label><div class="definition-fields">${keys.map(k=>inputRow(k)).join('')}</div></div></section><section class="panel concept-panel" id="phase-output">${designOutput(h,v,r)}</section></div><div class="phase-handoff"><span>Use this design to size and inspect each subsystem.</span><button class="btn export" data-phase="B">Subsystem design ${icon('chevron-right',15)}</button></div>`;
}
export function assemblyCard(h,v,s){
 const rows=s.thermalQualification||[],valid=rows.filter(r=>r.status!=='unassessed'),bad=valid.filter(r=>r.status!=='pass'),worst=valid.reduce((a,b)=>!a||b.marginK<a.marginK?b:a,null);
 return `<aside class="chaptercard"><div class="chapterkicker"><span class="guideflag">INTEGRATED DESIGN</span><span>PHASE C</span></div><h2>${esc(designName(v))}</h2><p>Four solar wings supply the enclosed processor trays. Two radiator banks reject heat from the coolant loop. Inspect a surface or open the compute core to see the internal temperatures.</p><div class="chaptermetrics"><div><small>Installed compute</small><strong>${n(h.itKw)} <em>kW</em></strong></div><div><small>Dry mass</small><strong>${n(h.dryKg/1000,2)} <em>t</em></strong></div></div><div class="thermal-verdict ${bad.length?'outside':'within'}"><strong>${valid.length?bad.length?bad.length+' outside active limits':'Within active thermal limits':'Thermal state unassessed'}</strong><small>${worst?esc(worst.label)+' · '+esc(worst.state)+' · '+n(worst.marginK,1)+' K margin':''}</small></div><div class="column-actions"><button class="btn" data-camera="${v.camera==='core'?'spacecraft':'core'}">${icon('box',14)} ${v.camera==='core'?'See exterior':'Open compute core'}</button><button class="btn" data-action="tempbands">${icon('thermometer-sun',14)} Temperature requirements</button><button class="btn export" data-phase="D">Launch configuration ${icon('chevron-right',15)}</button></div></aside>`;
}
export function systemSelect(page,thermalScale="working"){
 return `<div class="system-switch"><label>Subsystem <select id="subsystem-choice" aria-label="Choose subsystem design">${Object.keys(cfg).map(k=>`<option value="${k}" ${k===page?'selected':''}>${esc(pages[k][0])}</option>`).join('')}</select></label>${page==='thermal'?'<label class="map-range">Map scale <select id="diagram-thermal-scale"><option value="working" '+(thermalScale==='working'?'selected':'')+'>245–305 K</option><option value="full" '+(thermalScale==='full'?'selected':'')+'>180–380 K</option></select></label>':''}<button class="btn" data-action="phasecontrols">${icon('sliders-horizontal',14)} Edit design</button><button class="btn" data-action="tempbands">${icon('thermometer-sun',14)} Thermal limits</button></div>`;
}
export function flightChapters(v){
 const current=chapterPhase(v.chapter),list=chapters.filter(c=>chapterPhase(c.id)===current);
 return `<nav class="flightpath" aria-label="Chapters in this lifecycle phase"><div class="pathlabel"><span class="guideflag">${current==='D'?'LAUNCH SEQUENCE':current==='E'?'OPERATING MODES':'CLOSEOUT SEQUENCE'}</span></div><div class="pathscroll"><div class="pathsteps">${list.map((c,i)=>`<button class="pathstep ${c.id===v.chapter?'active':''}" data-chapter="${c.id}" aria-current="${c.id===v.chapter?'step':'false'}" data-tip="${esc(c.intent)}"><i>${String(i+1).padStart(2,'0')}</i><span>${esc(c.short)}</span></button>`).join('')}</div></div></nav>`;
}
export function closeout(sim,s){const d=sim.disposal();if(!d)return '';
 return `<section class="panel phase-closeout"><div><span class="guideflag">DISPOSAL LEDGER</span><h3>${d.feasible?'Retrograde burn and entry':'Disposal feasibility'}</h3><p>${esc(d.reason||'Inspect the final maneuver and the atmospheric interface.')}</p></div><div class="closeout-points">${[['Ignition',d.start],['Cutoff',d.cutoff],['Entry interface',d.entry]].filter(x=>Number.isFinite(x[1])).map(([l,t])=>`<button class="chip" data-disposal-time="${t}" data-tip="Jump to ${l.toLowerCase()} and inspect the state of the spacecraft.">${l}</button>`).join('')}</div><button class="btn export" data-action="pdr">Prepare quantitative PDR ${icon('download',14)}</button></section>`;
}

