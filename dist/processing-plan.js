import {processingFacility,FACILITY_REFERENCES} from './processing-facilities.js';
import {GROUND_OPERATIONS,PROCESSING_CAMPAIGN,PROCESSING_VERIFICATION,processingSources,groundProcessingState} from './ground-processing.js';

const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const link=s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`;
const sourced=row=>({...row,reference:processingSources[row.source]});
const table=(heads,rows)=>`<div class="mb-table-scroll" tabindex="0" role="region" aria-label="Ground processing verification plan"><table><thead><tr>${heads.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((c,i)=>i?`<td>${c}</td>`:`<th scope="row">${c}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`;

export function groundProcessingPlan(h){
 const q=groundProcessingState(h,'propellant',0).quantities;
 const designTargets=Object.fromEntries(['batteryKWh','socMin','socMax','socTarget','fuelKg','oxidizerKg','propellantKg','pressurantKg','coolantKg','coolantName','launchKg','dryKg','primaryV'].map(key=>[key,q[key]]));
 return {
  schema:'odc-ground-processing-plan/1',revision:'A',reviewTarget:'PDR · preliminary campaign and verification planning',
  status:'Planned · evidence open',launcher:h.input.launcher,launchSite:h.input.launchSite,
  scope:'Establish preliminary environments, the verification approach, facility route, portable GSE, service interfaces and release evidence at PDR. Detailed procedures, final test specifications, campaign durations and facility acceptance are later controlled products.',
  facility:processingFacility(h),campaign:PROCESSING_CAMPAIGN.map(sourced),verification:PROCESSING_VERIFICATION.map(sourced),
  operations:GROUND_OPERATIONS.map(o=>({...o,reference:processingSources[o.source],evidenceStatus:'Planned · evidence open'})),
  designTargets,
  designTargetBasis:'Installed hardware values and configured launch targets. Rehearsal progress is illustrative and does not change flight mass, battery state, mission time or verification evidence.',
  comparisonFacilities:FACILITY_REFERENCES,
  rehearsalBasis:'Independent normalized visual sequence. Neither playback completion nor modeled link tests establish flight qualification or campaign release.'
 };
}

export function renderProcessingPlan(plan){
 const f=plan.facility,refs=[...f.sources,...Object.values(processingSources)].filter((s,i,a)=>a.findIndex(x=>x.url===s.url)===i);
 return `<section class="mb-section mb-processing"><span class="mb-kicker">Ground processing plan · ${esc(plan.revision)}</span><h2>From verified spacecraft to launcher handover</h2><p>${esc(plan.scope)}</p>
 <div class="mb-callout"><strong>${esc(f.name)}</strong><p>${esc(f.location)} · ${esc(f.statusLabel)}</p><p>${esc(f.evidenceStatus)}. Mission facility acceptance remains open.</p></div>
 <h3>Campaign sequence and work locations</h3><ol class="mb-processing-route">${plan.campaign.map(c=>`<li><b>${esc(c.title)}</b><small>${esc(c.place)}</small><p>${esc(c.detail)}</p></li>`).join('')}</ol>
 <h3>Selected launcher’s integration route</h3><div class="mb-approach">${f.roles.map(r=>`<article><h4>${esc(r.label)}</h4><p>${esc(r.description)}</p></article>`).join('')}</div><p>${esc(f.scope)}</p>
 <h3>Verification allocation</h3><p>GEVS supplies the environmental verification framework. The project tailors the plan to its mission and hardware, then records the approved requirements, methods and evidence. Factory qualification and acceptance work are distinguished from selected launch-site functional and compatibility checks.</p>
 ${table(['Subject / method','Work location','Required evidence / status'],plan.verification.map(v=>[`${esc(v.subject)}<small>${esc(v.method)}</small>`,esc(v.venue),`${esc(v.evidence)}<small>${esc(v.status)}</small>${link(v.reference)}<small>${esc(v.section)}</small>`]))}
 <h3>Portable ground support equipment</h3><p>The spacecraft’s GSE can move between campaigns. Each location still requires an agreed utility interface, equipment compatibility, calibration and operating release.</p>
 ${table(['Equipment','Campaign interface'],f.portableGSE.map(g=>[esc(g.label),esc(g.description)]))}
 <h3>Items to close with the facility and launcher</h3><div class="mb-evidence-grid">${f.requiredApprovals.map(g=>`<article class="mb-evidence"><h4>${esc(g.label)}</h4><p>${esc(g.description)}</p><span class="mb-badge" data-tone="review">Open</span></article>`).join('')}</div>
 <details class="mb-disclosure"><summary>Processing and facility references</summary>${refs.map(s=>`<p>${link(s)}<small>${esc(s.section||s.basis||'')}</small></p>`).join('')}</details>
 <p class="mb-evidence-state">${esc(plan.rehearsalBasis)}</p></section>`;
}

export function processingPlanHtml(plan){
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ODC · Ground processing plan</title><style>body{font:15px/1.55 system-ui;color:#18313c;max-width:1080px;margin:32px auto;padding:0 24px}h1,h2,h3,h4{line-height:1.25}h3{margin-top:28px}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #cddbdd;padding:10px}thead{background:#eaf2f3}small{display:block;color:#536773}a{color:#176775}.mb-callout{background:#eef4f3;padding:16px;border-left:4px solid #377d78}.mb-processing-route{padding-left:25px}.mb-processing-route li{padding:8px}.mb-evidence-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.mb-badge{border:1px solid #9a7850;padding:3px 7px;font-size:12px}.mb-evidence-state{border-top:1px solid #9fb9bd;padding-top:16px}@media print{tr,li,.mb-evidence{break-inside:avoid}h2,h3,h4{break-after:avoid}a{color:inherit}}@media(max-width:650px){.mb-table-scroll{overflow:auto}.mb-evidence-grid{grid-template-columns:1fr}}</style><h1>Orbital Data Center · Ground processing plan</h1><p>${esc(plan.reviewTarget)} · ${esc(plan.status)}</p>${renderProcessingPlan(plan).replaceAll('<details','<details open')}<script type="application/json" id="odc-ground-processing-plan">${JSON.stringify(plan).replaceAll('<','\\u003c')}</script></html>`;
}
