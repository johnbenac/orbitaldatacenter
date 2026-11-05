import {DEPLOYMENT_STAGES,deploymentSchedule,deploymentLayout,mechanismPose} from './deployment.js';
import {DEPLOY_START_S,DEPLOY_DURATION_S,deploymentMET} from './commissioning-clock.js';
import {icon} from './icons.js';
const format=(x,d=1)=>Number.isFinite(x)?x.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
const clock=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const guides={
 hold:'The release fittings carry launch loads. Each blanket is wound at its own wing root. Both radiator banks are folded at their installed pivots.',
 release:'The launch restraints release before any blanket pays out. The wing roots and radiator hinge brackets remain attached to the spacecraft.',
 rollout:'The two edge booms recover their tubular cross-section. They push the tip mandrel outward as the photovoltaic blanket unwinds between the booms.',
 tension:'The wing tips reach full extension and the blankets take tension. The root drives remain at their deployment angle.',
 'upper-root':'The first radiator swings outward as a folded pair. Follow its inboard hinge on the forward frame.',
 'upper-tip':'The outer panel opens around the knuckle at the end of the inner panel. The flexible feed and return lines follow the joint.',
 'upper-latch':'The first bank reaches its stop and latches. Its flow path can now be admitted to the coolant loop.',
 'upper-flow':'Coolant is admitted to the first bank. The other bank remains folded and isolated.',
 'lower-root':'The second bank swings away from the forward frame with its outer panel still folded.',
 'lower-tip':'The second outer panel opens around its own hinge. The first bank stays latched.',
 'lower-latch':'The second bank reaches its stop and latches. Its coolant branch is ready to open.',
 'lower-flow':'Both radiator banks are latched. The second branch joins the circulating loop.',
 tracking:'The four wing roots rotate the tensioned blankets toward the commanded operating tilt.',
 deployed:'The wings are tensioned and both radiator banks are latched. The spacecraft can proceed to its insertion-trim checks.'
};
const major={hold:'Stowed',rollout:'Solar wings','upper-root':'First radiator','lower-root':'Second radiator',tracking:'Sun acquisition',deployed:'Locked'};
const formatHours=t=>clock(Math.max(0,Math.round(t-DEPLOY_START_S)));
export function commissioningGuide(h,s,v,playing){
 const k=deploymentSchedule(s.deployment);
 return `<aside class="dep-guide"><div class="dep-kicker">COMMISSIONING &nbsp;/&nbsp; MECHANISMS</div><h2 id="dep-title">${k.title}</h2><p id="dep-copy">${guides[k.step]||''}</p><dl class="dep-gauges">
 <div><dt>Solar blanket paid out</dt><dd id="dep-length">${format(k.pv*h.wingLengthM)} / ${format(h.wingLengthM)} m</dd></div><div><dt>Solar generation</dt><dd id="dep-power">${format(s.solarKW)} kW${s.eclipse?' · eclipse':''}</dd></div><div><dt>Radiator heat rejection</dt><dd id="dep-heat">${format(s.netRejectionKW)} kW</dd></div><div><dt>Stored battery energy</dt><dd id="dep-energy">${format(s.batteryKWh)} kWh</dd></div></dl>
 <div id="dep-joint" class="dep-joint">${jointReading(h,s,k)}</div>
 <div class="dep-lenses" aria-label="Deployment camera detail">${[['vehicle','Whole vehicle'],['wing','Tip drum'],['hinge','Radiator joint']].map(([id,label])=>`<button class="chip" data-deployment-lens="${id}" aria-pressed="${v.deploymentLens===id&&v.camera==='spacecraft'}">${label}</button>`).join('')}</div>
 <div class="dep-transport"><button class="btn export" data-action="flightplay" id="dep-play">${icon(playing?'pause':'play',14)} ${playing?'Pause':s.deployment>=1?'Replay':'Play deployment'}</button><select aria-label="Deployment playback speed" id="flight-rate">${[1,10,30,120,600].map(n=>`<option value="${n}" ${v.speed===n?'selected':''}>${n}×</option>`).join('')}</select></div>
 ${!h.launchScreenFeasible?'<p class="dep-warning">Mechanism study. This build exceeds its selected launch mass or fairing envelope.</p>':''}<small>One mission clock · ${clock(DEPLOY_DURATION_S)} modeled duration</small></aside>`;
}
function jointReading(h,s,k){
 const g=deploymentLayout(h),m=mechanismPose(g,s.deployment,h.input.solarTiltDeg);
 if(s.deployment<.46){const w=m.wings[0];return 'Tip drum Ø '+format(2*w.rollRadius,2)+' m · '+format(w.rolledLength)+' m still wound';}
 if(s.deployment<.92){const bank=m.banks[s.deployment<.69?0:1],root=Math.abs(bank.rootPitch)*180/Math.PI,outer=180-Math.abs(bank.outerPitch-bank.rootPitch)*180/Math.PI;
  return (s.deployment<.69?'Upper':'Lower')+' bank · root '+format(root,0)+'° · outer hinge '+format(outer,0)+'° · '+format(s.radiatorCoupledM2,1)+' m² on coolant';}
 return 'Wing tilt '+format(h.input.solarTiltDeg*k.tracking,1)+'° · '+format(s.radiatorCoupledM2,1)+' m² on coolant';
}
export function commissioningTimeline(h,s){
 const m=DEPLOYMENT_STAGES.filter(o=>Object.hasOwn(major,o.id));
 return `<section class="dep-timeline panel" aria-label="Deployment sequence"><header><div><span class="dep-kicker">FLIGHT SEQUENCE</span><h3>Appendage deployment</h3></div><output id="dep-clock">${formatHours(s.t)} / ${clock(DEPLOY_DURATION_S)}</output></header>
 <input type="range" id="deploy-cursor" min="0" max="${DEPLOY_DURATION_S}" step=".1" value="${s.deployment*DEPLOY_DURATION_S}" style="--pct:${100*s.deployment}%" aria-label="Scrub deployment time" />
 <div class="dep-keys">${m.map((o,j)=>`<button data-deploy-at="${o.at}" data-tip="Seek to ${o.title.toLowerCase()}."><small>${clock(Math.round(o.at*DEPLOY_DURATION_S))}</small><b>${major[o.id]}</b></button>`).join('')}</div>
 <div class="dep-foot"><div><button class="chip" data-deploy-step="-1" aria-label="Previous deployment step">← Previous step</button> <button class="chip" data-deploy-step="1" aria-label="Next deployment step">Next step →</button></div><button class="textbutton" data-chapter="operations">Continue to operations →</button></div></section>${deploymentReferences(h)}`;
}
export function refreshCommissioning(host,h,s){
 const k=deploymentSchedule(s.deployment),find=id=>host.getElementById(id);
 const items={'dep-joint':jointReading(h,s,k),'dep-title':k.title,'dep-copy':guides[k.step]||'','dep-clock':formatHours(s.t)+' / '+clock(DEPLOY_DURATION_S),'dep-length':format(k.pv*h.wingLengthM)+' / '+format(h.wingLengthM)+' m','dep-power':format(s.solarKW)+' kW'+(s.eclipse?' · eclipse':''),'dep-heat':format(s.netRejectionKW)+' kW','dep-energy':format(s.batteryKWh)+' kWh'};
 for(const [id,v] of Object.entries(items)){const e=find(id);if(e&&e.textContent!==v)e.textContent=v}
 const slider=find('deploy-cursor');if(slider){slider.style.setProperty('--pct',s.deployment*100+'%');if(host.activeElement!==slider)slider.value=s.deployment*DEPLOY_DURATION_S;}
 const buttons=Array.from(host.querySelectorAll('[data-deploy-at]'));const current=buttons.filter(b=>Number(b.dataset.deployAt)<=s.deployment+.000001).at(-1);
 for(const b of buttons)b.setAttribute('aria-current',b===current?'step':'false');
}
export function nextDeploymentTime(u,direction){
 const next=direction>0?DEPLOYMENT_STAGES.find(o=>o.at>u+.00001):DEPLOYMENT_STAGES.slice().reverse().find(o=>o.at<u-.00001);
 return deploymentMET(next?.at??(direction>0?1:0));
}
export function deploymentReferences(h=null){
 const strokeSeconds=DEPLOY_DURATION_S*(DEPLOYMENT_STAGES.find(o=>o.id==='tension').at-DEPLOYMENT_STAGES.find(o=>o.id==='rollout').at);
 const pace=h?' For this build the tip travels '+format(h.wingLengthM,1)+' m in '+format(strokeSeconds,0)+' s, averaging '+format(h.wingLengthM/strokeSeconds,3)+' m/s. NASA reported roughly 18 m in ten minutes on the June 25, 2021 ISS installation.':'';
 return `<details class="dep-references panel"><summary>Mechanism design and flight references</summary><div><article><h3>Roll-out solar blankets</h3><p>NASA’s ROSA experiment flew a flexible photovoltaic blanket and two coiled composite booms. Stored strain energy deployed the booms. This spacecraft carries four such wing assemblies on separate roots.</p><a href="https://ntrs.nasa.gov/citations/20200002441" target="_blank" rel="noopener">NASA · ROSA hardware and structural analysis ↗</a><a href="https://www.youtube.com/watch?v=1Pm4MbIwRDw" target="_blank" rel="noopener">Watch the 2017 ROSA flight demonstration · NASA ↗</a><a href="https://www.nasa.gov/blogs/spacestation/2021/06/25/second-of-the-new-solar-arrays-successfully-deployed/" target="_blank" rel="noopener">NASA · ten-minute iROSA deployment in flight ↗</a></article>
 <article><h3>Hinged radiator banks</h3><p>Northrop Grumman documents a damped radiator hinge with fluid transport across its pivot. NASA’s ISS heat-rejection drawings show flexible interpanel hoses. Here, each bank uses two rigid panels, a root hinge, an outer hinge and a separately admitted coolant branch.</p><a href="https://cdn.northropgrumman.com/-/media/Project/Northrop-Grumman/ngc/what-we-do/space/spacecraft-products/Modular-Deployable-Radiator-Factsheet.pdf" target="_blank" rel="noopener">Northrop Grumman · radiator hinge and hold-down ↗</a><a href="https://www.nasa.gov/wp-content/uploads/2021/02/473486main_iss_atcs_overview.pdf" target="_blank" rel="noopener">NASA · flight radiator panels and flexible hoses ↗</a></article></div><p class="dep-note">The sequence, hold times and latch confirmations are nominal study assumptions.${pace} This model checks geometric motion. Deployment torque margin, latch shock, boom buckling, hose fatigue and qualification at the selected size need separate analysis.</p></details>`;
}
