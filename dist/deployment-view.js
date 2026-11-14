import {flightButtons} from './flight-transport.js';
import {deploymentStages,deploymentGuide,deploymentSchedule,deploymentLayout,mechanismPose} from './deployment.js';
import {DEPLOY_START_S,commissioningClock,deploymentMET} from './commissioning-clock.js';
const format=(x,d=1)=>Number.isFinite(x)?x.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
const clock=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const major={hold:'Stowed',rollout:'Solar wings','upper-root':'First radiator','lower-root':'Second radiator',tracking:'Sun acquisition',deployed:'Locked'};
const redwireStops={platform:'Platform start','platform-mid':'Mid swing','platform-latch':'Platform latched',tension:'Blankets tensioned'};
function inspectionStops(h){
 const stages=deploymentStages(h);
 return h?.architectureFamilyId==='redwire-platform'?[...stages,{at:.21,id:'platform-mid',title:'Inspect the platform at mid swing'}].sort((a,b)=>a.at-b.at):stages;
}
const formatHours=t=>clock(Math.max(0,Math.round(t-DEPLOY_START_S)));
export function commissioningGuide(h,s,v,playing){
 const k=deploymentSchedule(s.deployment,h),redwire=h.architectureFamilyId==='redwire-platform';
 return `<aside class="dep-guide"><div class="dep-kicker">COMMISSIONING &nbsp;/&nbsp; MECHANISMS</div><h2 id="dep-title">${k.title}</h2><p id="dep-copy">${deploymentGuide(k.step,h)}</p><dl class="dep-gauges">
 <div><dt>Solar blanket paid out</dt><dd id="dep-length">${format(k.pv*h.wingLengthM)} / ${format(h.wingLengthM)} m</dd></div><div><dt>Solar generation</dt><dd id="dep-power">${format(s.solarKW)} kW${s.eclipse?' · eclipse':''}</dd></div><div><dt>Radiator heat rejection</dt><dd id="dep-heat">${format(s.netRejectionKW)} kW</dd></div><div><dt>Stored battery energy</dt><dd id="dep-energy">${format(s.batteryKWh)} kWh</dd></div></dl>
 <div id="dep-joint" class="dep-joint">${jointReading(h,s,k)}</div>
 ${redwire?'<p class="dep-note">Power and fiber cross the platform hinge through a mounted rotary transfer assembly. Separate fixed and moving harnesses follow supported raceways; side-entry computer connectors keep the cable runs close to the exposed platform.</p>':''}
 <div class="dep-lenses" data-choice-group="deployment-lenses" role="group" aria-label="Deployment camera detail">${[['vehicle','Whole vehicle'],['wing','Tip drum'],['hinge',redwire?'Platform hinge':'Radiator joint']].map(([id,label])=>`<button class="chip" data-deployment-lens="${id}" aria-pressed="${v.deploymentLens===id&&v.camera==='spacecraft'}">${label}</button>`).join('')}</div>
 <div class="dep-transport">${flightButtons(playing,s.deployment>=1?'Replay':'Play deployment',{primary:'btn export',id:'dep-play'})}<select aria-label="Deployment playback speed" id="flight-rate">${[1,10,30,120,600].map(n=>`<option value="${n}" ${v.speed===n?'selected':''}>${n}×</option>`).join('')}</select></div>
 ${!h.launchScreenFeasible?'<p class="dep-warning">Mechanism study. This build exceeds its selected launch mass or fairing envelope.</p>':''}<small>One mission clock · ${clock(commissioningClock(h).durationS)} modeled duration</small></aside>`;
}
function jointReading(h,s,k){
 const g=deploymentLayout(h),m=mechanismPose(g,s.deployment,h.input.solarTiltDeg);
 if(g.familyId==='redwire-platform'){
  const swing=Math.max(0,Math.min(90,90-Math.abs(m.banks[0].rootPitch)*180/Math.PI)),state=k.upperLocked?'Latched':swing<.01?'Stowed':swing>89.99?'At deployed stop':'Moving';
  return 'Platform swing '+format(swing,0)+'° / 90° · '+state+' · rotary power and fiber interface';
 }
 if(s.deployment<.46){const w=m.wings[0];return 'Tip drum Ø '+format(2*w.rollRadius,2)+' m · '+format(w.rolledLength)+' m still wound';}
 if(s.deployment<.92){const bank=m.banks[s.deployment<.69?0:1]||m.banks.at(-1),root=Math.abs(bank.rootPitch)*180/Math.PI,outer=180-Math.abs(bank.outerPitch-bank.rootPitch)*180/Math.PI;
  return (s.deployment<.69?'Upper':'Lower')+' bank · root '+format(root,0)+'° · '+(g.panelCount-1)+' fold joints '+format(outer,0)+'° · '+format(s.radiatorCoupledM2,1)+(h.payloadLocation==='radiator'?' m² on local heat transport':' m² on coolant');}
 return 'Wing tilt '+format(s.wingPitchDeg,1)+'° · '+format(s.radiatorCoupledM2,1)+(h.payloadLocation==='radiator'?' m² on local heat transport':' m² on coolant');
}
export function commissioningTimeline(h,s){
 const redwire=h.architectureFamilyId==='redwire-platform',m=inspectionStops(h).filter(o=>redwire||Object.hasOwn(major,o.id)||o.major);
 return `<section class="dep-timeline panel" aria-label="Deployment sequence"><header><div><span class="dep-kicker">FLIGHT SEQUENCE</span><h3>Appendage deployment</h3></div><output id="dep-clock">${formatHours(s.t)} / ${clock(commissioningClock(h).durationS)}</output></header>
 <input type="range" id="deploy-cursor" min="0" max="${commissioningClock(h).durationS}" step=".1" value="${s.deployment*commissioningClock(h).durationS}" style="--pct:${100*s.deployment}%" aria-label="Scrub deployment time" />
 <p class="choice-hint">Choose a milestone to inspect the hardware at that instant.</p>
 <div class="dep-keys" data-choice-group="deployment-stops" role="group" aria-label="Deployment milestones">${m.map((o,j)=>`<button data-deploy-at="${o.at}" data-tip="Seek to ${o.title.toLowerCase()}."><small>${clock(Math.round(o.at*commissioningClock(h).durationS))}</small><b>${(redwire?redwireStops[o.id]:null)||major[o.id]||o.title}</b></button>`).join('')}</div>
 <div class="dep-foot"><div><button class="chip" data-deploy-step="-1" aria-label="Previous deployment step">← Previous step</button> <button class="chip" data-deploy-step="1" aria-label="Next deployment step">Next step →</button></div><button class="textbutton" data-chapter="operations">Continue to operations →</button></div></section>${deploymentReferences(h)}`;
}
export function refreshCommissioning(host,h,s){
 const k=deploymentSchedule(s.deployment,h),find=id=>host.getElementById(id);
 const items={'dep-joint':jointReading(h,s,k),'dep-title':k.title,'dep-copy':deploymentGuide(k.step,h),'dep-clock':formatHours(s.t)+' / '+clock(commissioningClock(h).durationS),'dep-length':format(k.pv*h.wingLengthM)+' / '+format(h.wingLengthM)+' m','dep-power':format(s.solarKW)+' kW'+(s.eclipse?' · eclipse':''),'dep-heat':format(s.netRejectionKW)+' kW','dep-energy':format(s.batteryKWh)+' kWh'};
 for(const [id,v] of Object.entries(items)){const e=find(id);if(e&&e.textContent!==v)e.textContent=v}
 const slider=find('deploy-cursor');if(slider){slider.style.setProperty('--pct',s.deployment*100+'%');if(host.activeElement!==slider)slider.value=s.deployment*commissioningClock(h).durationS;}
 const buttons=Array.from(host.querySelectorAll('[data-deploy-at]'));const current=buttons.filter(b=>Number(b.dataset.deployAt)<=s.deployment+.000001).at(-1);
 for(const b of buttons)b.setAttribute('aria-current',b===current?'step':'false');
}
export function nextDeploymentTime(u,direction,h){
 const stops=inspectionStops(h),next=direction>0?stops.find(o=>o.at>u+.00001):stops.slice().reverse().find(o=>o.at<u-.00001);
 return deploymentMET(next?.at??(direction>0?1:0),h);
}
export function deploymentReferences(h=null){
 if(h?.physicalArchitecture&&h.architectureFamilyId!=='protected-core')return `<details class="dep-references panel"><summary>Architecture and deployment basis</summary><div><article><h3>${h.physicalArchitecture.label}</h3><p>${h.physicalArchitecture.evidence}</p><p>${h.physicalArchitecture.definition.allocations.join(' ')}</p><p>${h.physicalArchitecture.deployment.durationEvidence} The sequence has ${h.solarWingCount} solar wings and ${h.radiatorBankCount} radiator platform${h.radiatorBankCount===1?'':'s'}.</p></article>${h.architectureFamilyId==='redwire-platform'?'<article><h3>Mounted platform cabling</h3><p>The exposed computers use side-entry connectors beside panel-mounted raceways. Body harnesses terminate on the fixed half of a hinge-axis power and fiber transfer assembly; separate platform harnesses rotate with its moving half. The assembly, support hardware and individual harnesses contribute to the master equipment list and vehicle mass.</p><p>The rotary assembly is a custom preliminary allocation using documented hybrid electrical and optical rotary-joint capability as a design reference. Its electrical contact capacity and loss, optical path budget and hardware mass are included in this design. Flight adaptation, environmental qualification and service life remain engineering verification work.</p><a href="https://www.moog.com/products/fiber-optic-rotary-joints/hybrid-forj.html" target="_blank" rel="noopener">Moog · hybrid power and optical rotary joints ↗</a><a href="https://standards.nasa.gov/sites/default/files/standards/MSFC/B/0/MSFC-SPEC-494.pdf" target="_blank" rel="noopener">NASA MSFC · cable installation and support guidance ↗</a></article>':''}</div></details>`;
 const stages=deploymentStages(h),strokeSeconds=commissioningClock(h).durationS*((stages.find(o=>o.id==='tension')?.at??.42)-(stages.find(o=>o.id==='rollout')?.at??.04));
 const pace=h?' For this build the tip travels '+format(h.wingLengthM,1)+' m in '+format(strokeSeconds,0)+' s, averaging '+format(h.wingLengthM/strokeSeconds,3)+' m/s. NASA reported roughly 18 m in ten minutes on the June 25, 2021 ISS installation.':'';
 return `<details class="dep-references panel"><summary>Mechanism design and flight references</summary><div><article><h3>Roll-out solar blankets</h3><p>NASA’s ROSA experiment flew a flexible photovoltaic blanket and two coiled composite booms. Stored strain energy deployed the booms. This spacecraft carries ${h?.solarWingCount||4} allocated wing assemblies on separate roots.</p><a href="https://ntrs.nasa.gov/citations/20200002441" target="_blank" rel="noopener">NASA · ROSA hardware and structural analysis ↗</a><a href="https://www.youtube.com/watch?v=1Pm4MbIwRDw" target="_blank" rel="noopener">Watch the 2017 ROSA flight demonstration · NASA ↗</a><a href="https://www.nasa.gov/blogs/spacestation/2021/06/25/second-of-the-new-solar-arrays-successfully-deployed/" target="_blank" rel="noopener">NASA · ten-minute iROSA deployment in flight ↗</a></article>
 <article><h3>Hinged radiator banks</h3><p>Northrop Grumman documents a damped radiator hinge with fluid transport across its pivot. NASA’s ISS heat-rejection drawings show flexible interpanel hoses. Here, each bank uses ${h?.radiatorPanelsPerBank||2} rigid panels, a root hinge, ${(h?.radiatorPanelsPerBank||2)-1} fold joints and a separately admitted coolant branch. Panel pairs form parallel coolant sections; added hinges, manifolds and flexible crossings carry mass and pressure loss in the active design. After both banks latch, a separate span-axis drive on each bank turns its faces relative to the Sun and Earth.</p><a href="https://cdn.northropgrumman.com/-/media/Project/Northrop-Grumman/ngc/what-we-do/space/spacecraft-products/Modular-Deployable-Radiator-Factsheet.pdf" target="_blank" rel="noopener">Northrop Grumman · radiator hinge and hold-down ↗</a><a href="https://www.nasa.gov/wp-content/uploads/2021/02/473486main_iss_atcs_overview.pdf" target="_blank" rel="noopener">NASA · flight radiator panels and flexible hoses ↗</a></article></div><p class="dep-note">The sequence, hold times and latch confirmations are nominal study assumptions.${pace} This model checks geometric motion. Deployment torque margin, latch shock, boom buckling, hose fatigue and qualification at the selected size need separate analysis.</p></details>`;
}
