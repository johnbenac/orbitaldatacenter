import {icon} from './icons.js';
import {helpButton} from './input-help-ui.js';
import {designName} from './mission-presets.js';
import {chapters} from './flight-chapters.js';
import {pages,cfg} from './workspaces.js';

const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const n=(x,d=1)=>Number.isFinite(x)?x.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
export const phases={
 A:{label:'Mission inputs',title:'Define the mission',sub:'Choose the workload, orbit and design constraints that size the spacecraft.',native:'Concept and technology development'},
 B:{label:'Subsystem design',title:'Design the subsystems',sub:'Trace the components and flows inside each spacecraft subsystem.',native:'Preliminary design and technology completion'},
 C:{label:'Integrated vehicle',title:'Analyze the integrated vehicle',sub:'Test design changes across the integrated vehicle, its environments and mission performance.',native:'Final design and fabrication'},
 D:{label:'Launch & insertion',title:'Launch and insertion',sub:'Check the stowed vehicle, move to the pad, and follow the stack into orbit.',native:'System assembly, integration and test, launch'},
 E:{label:'Operations',title:'Operate the spacecraft',sub:'Commission the vehicle and follow compute, downlink and station-keeping through a shared mission clock.',native:'Operations and sustainment'},
 F:{label:'Decommissioning',title:'Decommission the spacecraft',sub:'Review the selected disposal trajectory, expended propellant and achieved endpoint.',native:'Closeout'}
};
export const chapterPhase=id=>['integration','pad','ascent','insertion'].includes(id)?'D':id==='deorbit'?'F':'E';
export function phaseFromView(v){
 if(Object.hasOwn(phases,v.phase))return v.phase;
 if(v.page&&Object.hasOwn(cfg,v.page))return 'B';
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
 return `<div class="concept-top"><span class="guideflag">CURRENT DESIGN</span><strong>${esc(designName(v))}</strong></div>${footprint(h)}<div class="concept-readings">${[['Compute',n(h.itKw,1),'kW IT','conceptCompute'],['Launch stack',n(h.launchKg/1000,2),'t','conceptMass'],['Array area',n(h.solarM2,0),'m²','conceptSolar'],h.ai&&h.input.aiPurpose!=='text'?['Active '+h.ai.unit+' capacity',n(h.ai.activeUnitsPerSec,3),h.ai.unit+'/s','aiPurpose']:['Decode capacity',n(h.tokensPerSec,0),'tok/s','conceptDecode']].map(([l,x,u,key])=>`<div><small>${l} ${helpButton(key,l)}</small><strong>${x} <em>${u}</em></strong></div>`).join('')}</div><p class="concept-fit">${icon(h.launchScreenFeasible?'check':'ruler',14)} ${h.launchScreenFeasible?'Within the selected single-launch envelope':'Exceeds a selected single-launch constraint'} · ${esc(h.launcherLabel)}</p>${v.solve==='installed'?'':`<p class="concept-fit">${esc(result.binding)} · ${n(result.achieved,2)} ${esc(result.unit)}</p>`}`;
}
export function flightChapters(v){
 const current=v.phase||chapterPhase(v.chapter),list=chapters.filter(c=>chapterPhase(c.id)===current);
 return `<nav class="flightpath" aria-label="Chapters in this lifecycle phase"><div class="pathlabel"><span class="guideflag">${current==='D'?'LAUNCH SEQUENCE':current==='E'?'OPERATING MODES':'CLOSEOUT SEQUENCE'}</span></div><div class="pathscroll"><div class="pathsteps">${list.map((c,i)=>`<button class="pathstep ${c.id===v.chapter?'active':''}" data-chapter="${c.id}" aria-current="${c.id===v.chapter?'step':'false'}" data-tip="${esc(c.intent)}"><i>${String(i+1).padStart(2,'0')}</i><span>${esc(c.short)}</span></button>`).join('')}</div></div></nav>`;
}
