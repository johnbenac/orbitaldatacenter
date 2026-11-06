import {DEPLOY_END_S} from './commissioning-clock.js';
import {deployedPlan} from './propulsion-drawing.js';
import {icon} from './icons.js';
import {sizingLabel} from './design.js';
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
 return chapterPhase(v.chapter|| (v.t<DEPLOY_END_S?'integration':'operations'));
}
export function lifecycleNav(phase){return Object.entries(phases).map(([id,p])=>`<button class="phase-tab ${phase===id?'current':''}" data-phase="${id}" aria-current="${phase===id?'step':'false'}" data-tip="${esc(p.sub)}"><i>${id}</i><span><small>PHASE ${id}</small><strong>${esc(p.label)}</strong></span></button>`).join('')}
export const lifecycleLink='<a href="https://www.nasa.gov/wp-content/uploads/2018/09/nasa_systems_engineering_handbook_0.pdf#page=27" target="_blank" rel="noopener">NASA Systems Engineering Handbook ↗</a>';
export function sourceNote(){return '<p class="phase-source">The mission targets PDR near the end of Phase B. The six workspace phases support design and previews of later integration, flight and closeout. Lifecycle acceptance is recorded in the Mission Baseline. '+lifecycleLink+'</p>'}
export function designOutput(h,v,result){
 return `<div class="concept-top"><span class="guideflag">CURRENT DESIGN</span><strong>${esc(designName(v))}</strong></div>${deployedPlan(h)}<div class="concept-readings">${[['Compute',n(h.itKw,1),'kW IT','conceptCompute'],['Launch stack',n(h.launchKg/1000,2),'t','conceptMass'],['Array area',n(h.solarM2,0),'m²','conceptSolar'],h.ai&&h.input.aiPurpose!=='text'?['Active '+h.ai.unit+' capacity',n(h.ai.activeUnitsPerSec,3),h.ai.unit+'/s','aiPurpose']:['Decode capacity',n(h.tokensPerSec,0),'tok/s','conceptDecode']].map(([l,x,u,key])=>`<div><small>${l} ${helpButton(key,l)}</small><strong>${x} <em>${u}</em></strong></div>`).join('')}</div><p class="concept-fit">${icon(h.launchScreenFeasible?'check':'ruler',14)} ${h.launchScreenFeasible?'Within the selected single-launch envelope':'Exceeds a selected single-launch constraint'} · ${esc(h.launcherLabel)}</p><button class="textbutton concept-deploy" data-chapter="commissioning">Preview spacecraft deployment →</button>${v.solve==='installed'?'':`<p class="concept-fit">${esc(sizingLabel(result.binding))} · ${n(result.achieved,2)} ${esc(result.unit)}</p>`}`;
}
export function flightChapters(v){
 const current=v.phase||chapterPhase(v.chapter),list=chapters.filter(c=>chapterPhase(c.id)===current);
 return `<nav class="flightpath" aria-label="Chapters in this lifecycle phase"><div class="pathlabel"><span class="guideflag">${current==='D'?'LAUNCH SEQUENCE':current==='E'?'OPERATING MODES':'CLOSEOUT SEQUENCE'}</span>${list.length>1?`<span class="choice-hint">${current==='D'?'Choose a step to visit':'Choose a mode to explore'}</span>`:''}${['D','E'].includes(current)?'<button class="textbutton master-sequence-link" data-clock-timeline data-tip="Open the mission-wide timeline and inspect an event at its modeled time.">Master timeline ↗</button>':''}</div><div class="pathscroll"><div class="pathsteps" data-choice-group="chapters">${list.map((c,i)=>`<button class="pathstep ${c.id===v.chapter?'active':''}" data-chapter="${c.id}" aria-current="${c.id===v.chapter?'step':'false'}" data-tip="${esc(c.intent)}"><i>${String(i+1).padStart(2,'0')}</i><span>${esc(c.short)}</span></button>`).join('')}</div></div>${v.timelineFollow&&['D','E'].includes(current)?'<div id="timeline-flight-calls" class="mt-flight-calls"></div>':''}</nav>`;
}
