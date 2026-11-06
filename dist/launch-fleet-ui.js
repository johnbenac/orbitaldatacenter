import {cargoClearanceSummary} from './starship-evidence.js';
import {renderInterface} from './interface-view.js';
import {spacexSilhouette} from './launch-recognition.js';
import {siteRecord} from './launch-director.js';
import {launchFleet,fleetReviewed} from './launch-fleet.js';
import {fairings,fairingFit,packedSections} from './fairings.js';
const e=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const num=(v,dec=1)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:dec}):'—';
const link=(url,title)=>`<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(title)} ↗</a>`;
const ids=Object.keys(launchFleet),cache=new WeakMap();
export function launcherFits(h){
 if(cache.has(h))return cache.get(h);
 const rows=ids.map(id=>{
  const selected=h.input.launcher===id,ref=fairings[id],v=launchFleet[id],maxD=2*Math.max(...ref.profile.map(p=>p[1]));
  const d=selected?h.input:{...h.input,launcher:id,fairingM:maxD,fairingLengthM:ref.profile.at(-1)[0]};
  const stack=selected?h.fairing.stack:packedSections({...h,kaDishM:d.kaDishM,launcher:id});
  const f=selected?h.fairing:fairingFit(d,stack);
  return {id,vehicle:v,fairing:f,screenMarginKg:Math.min(v.referenceKg,d.launchAllowanceKg)-h.launchKg,referenceMarginKg:v.referenceKg-h.launchKg,missionMarginKg:d.launchAllowanceKg-h.launchKg,allowanceDeltaKg:v.referenceKg-d.launchAllowanceKg,selected};
 });
 cache.set(h,rows);return rows;
}
// Geometry of the vehicle is a recognition diagram. Each strap-on count is
// listed explicitly; side views show the visible left and right boosters.
export function launcherSilhouette(id){
 const specific=spacexSilhouette(id);if(specific)return specific;
 const v=launchFleet[id],wide=(v.diameterM/v.heightM)*131,head=Math.max(wide*.95,wide*fairings[id].outerDiameterM/v.diameterM),upper=v.stages===1?0:26,base=143,cap=16,split=cap+26+upper;
 const flight=id==='starship',cfg=v.boosters,side=cfg===2?wide*.90:wide*.54,top=cfg===2?split-4:base-(id==='longMarch5B'?85:56);
 const nozzle=(x,y,w)=>`<path d="M${x-w*.27} ${y}h${w*.54}l${w*.16} 3h-${w*.86}z" fill="#83919c"/>`;
 const barrel=(x,y,w)=>`<path d="M${x-w/2} ${base-2}V${y+5}l${w/2} -6 ${w/2} 6V${base-2}z" fill="#b6c1c8" stroke="#677a87" stroke-width=".7"/><path d="M${x-w/2} ${y+12}h${w}M${x-w/2} ${base-10}h${w}" stroke="#5e7481" stroke-width="1.2"/>${nozzle(x,base-2,w)}`;
 let boosters='';if(cfg)for(const s of [-1,1])boosters+=barrel(s*(side+wide)*.48,top,side);
 const body=`<path d="M${-wide/2} ${base-3}V${cap+26}L${-head/2} ${cap+23}v-10Q${-head/2} ${cap+6} 0 ${cap}Q${head/2} ${cap+6} ${head/2} ${cap+13}v10L${wide/2} ${cap+26}V${base-3}z" fill="${flight?'#93a4ad':'#e1e7e9'}" stroke="#687f8b" stroke-width=".8"/><path d="M0 ${cap+2}V${cap+23}M${-head/2} ${cap+23}h${head}" stroke="#91a3ae" stroke-width=".65"/><path d="M${-wide/2} ${split}h${wide}" stroke="#344d60" stroke-width="${v.stages===1?.8:3.5}"/><path d="M${-wide/2+1} ${base-13}h${wide-2}" stroke="${id.startsWith('longMarch')?'#ba756d':'#5c8496'}" stroke-width="2.4"/>${nozzle(0,base-3,wide)}`;
 const fins=flight?`<path d="M-${wide/2} 37l-4 11h4m${wide} -11l4 11h-4M-${wide/2} 58l-5 10h5m${wide} -10l5 10h-5" fill="#9daeb5"/>`:'';
 return `<g transform="translate(33,0)">${boosters}${body}${fins}</g>`;
}
const dossierText={
 A:'Compare published payload references, recovery configurations and the assumed mission allowance.',
 B:'Inspect the stages that carry the spacecraft and the source of its payload envelope.',
 C:'Compare the same stowed spacecraft across the fleet at the current design point.',
 D:'The carrier supplies ascent and injection. The folded spacecraft and adapter count against the launch allowance.',
 E:'The launch manifest stays fixed after release. Orbit maintenance is charged to the spacecraft propulsion ledger.',
 F:'The original launch stack provides the delivery baseline for closeout. The spacecraft pays for its disposal maneuver.'
};
export function renderLaunchFleet(h,phase='A'){
 const rows=launcherFits(h),active=rows.find(r=>r.selected);
 if(!active)return '<section class="panel"><div class="panelpad">Choose a supported launch vehicle to view its catalogue record.</div></section>';
 const {vehicle:v,fairing:f}=active,editable=['A','B','C'].includes(phase);
 const catalogue=rows.map(r=>{
  const v=r.vehicle,body=`<svg viewBox="0 0 66 151" aria-hidden="true">${launcherSilhouette(r.id)}</svg><span class="fleet-card-copy"><small>${e(v.provider)}</small><strong>${e(v.name)}</strong><span>${num(v.referenceKg/1000,1)} t LEO reference</span><em>${e(v.status)}</em><span>${r.screenMarginKg<0?'Mass screen exceeded':'Mass screen passed'} · ${num(r.screenMarginKg,0)} kg</span><span>${r.fairing.fit?'Envelope fits':r.fairing.cargoAccess?.fits===false?'Cargo path held':'Envelope exceeded'} · ${num(r.fairing.radialClearanceM,2)} m lateral</span></span>`;
  return editable?`<button class="fleet-card ${r.selected?'selected':''}" type="button" data-use-launcher="${r.id}" aria-pressed="${r.selected}">${body}</button>`:`<div class="fleet-card ${r.selected?'selected':''}">${body}</div>`;
 }).join('');
 const dimension=v.dimensionNote?'<p>'+e(v.dimensionNote)+'</p>':'';
 const sourceLinks=[link(v.sourceUrl,v.sourceTitle),v.orbitSourceUrl?link(v.orbitSourceUrl,v.orbitSourceTitle):'',v.evidenceUrl?link(v.evidenceUrl,v.evidenceTitle):'',link(f.sourceUrl,f.source)].filter(Boolean).join(' · ');
 const discrepancy=active.allowanceDeltaKg<0?`<p class="fleet-flag">The entered allowance exceeds this LEO benchmark by ${num(-active.allowanceDeltaKg,0)} kg. The provider would need to confirm performance for this orbit.</p>`:'';
 return `<section class="panel launch-fleet"><header class="panelhead"><h2>Launch vehicle catalogue</h2><span class="guideflag">${editable?'CONFIGURATION TRADE':'FLIGHT RECORD'}</span></header><div class="panelpad"><p>${dossierText[phase]||dossierText.A}</p><div class="fleet-dossier"><svg viewBox="0 0 66 151" role="img" aria-label="${e(v.name)} architecture">${launcherSilhouette(active.id)}</svg><div><span class="guideflag">${e(v.provider)} · ${e(v.status)}</span><h3>${e(v.name)}</h3><p>${e(v.architecture)}</p><p>${e(v.description)}</p></div></div>${phase==='B'?renderInterface(h):''}${siteRecord(h.input,editable)}<dl class="fleet-stats">${[['LEO reference',num(v.referenceKg,0)+' kg'],['Reference orbit',v.referenceOrbit],['Vehicle height',num(v.heightM,1)+' m'+(active.id==='longMarch9'?' · study assumption':active.id==='glenn9'?' · approximate':'')],['Core diameter / strap-ons',num(v.diameterM,2)+' m / '+v.boosters],['Reference headroom',num(active.referenceMarginKg,0)+' kg'],['Governing mass headroom',num(active.screenMarginKg,0)+' kg'],['Mission allowance',num(h.input.launchAllowanceKg,0)+' kg'],['Stack against allowance',num(h.launchKg,0)+' kg · '+num(h.massMarginKg,0)+' kg margin'],['Fairing basis',f.override?'Mission-scaled '+f.basis.toLowerCase():f.basis],['Keep-in dimensions',num(f.maxDiameterM,2)+' m Ø × '+num(f.heightM,2)+' m']].map(([key,value])=>`<div><dt>${e(key)}</dt><dd>${e(value)}</dd></div>`).join('')}</dl>${discrepancy}${dimension}${cargoClearanceSummary(f)}<p class="model-footnote">${e(f.note)}</p><p class="fleet-sources">${sourceLinks}</p><details class="fleet-options" ${editable?'open':''}><summary>${editable?'Compare configurations':'Review catalogue references'} · ${rows.length}</summary><p class="model-footnote">Silhouettes are normalized to drawing height. Fit calculations use the current spacecraft, adapter and motion allowances. The selected vehicle uses any mission-specific envelope edits. Alternative vehicles use their reference profiles.</p><div class="fleet-grid">${catalogue}</div></details><small class="fleet-date">Reference review · ${fleetReviewed}</small></div></section>`;
}
