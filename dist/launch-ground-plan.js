import {launchSites,launchRanges,launchComplexes,launchSiteFor,launchSitesFor} from './launch-sites.js';
import {launchUmbilicalDesign} from './launch-umbilicals.js';
import {processingFacility} from './processing-facilities.js';
import {geographySummaryForSite} from './launch-geography.js';

const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const table=(heads,rows)=>`<div class="mb-table-scroll" tabindex="0" role="region" aria-label="Launch site and umbilical register"><table><thead><tr>${heads.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>i?`<td>${c}</td>`:`<th scope="row">${c}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const link=s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`;
const met=t=>Number.isFinite(t)?`${t<0?'T−':'T+'}${Math.abs(t).toLocaleString('en-US',{maximumFractionDigits:2})} s`:'Mission ICD open';
const eventName=event=>({'liftoff':'Liftoff','payload-release':'Spacecraft separation','prelaunch':'Before liftoff'}[event]||event);

// This is a controlled architecture record. It deliberately accepts no scene,
// playback or test result: illustrative movement cannot accept an interface.
export function launchGroundPlan(h){
 const d=h.input,site=launchSiteFor(d.launcher,d.launchSite),umbilicals=launchUmbilicalDesign(h),facility=processingFacility(h);
 const geography=geographySummaryForSite(site.id);
 const sources=[...site.sources,...umbilicals.sources,...facility.sources,...(geography?.sources||[])].filter((s,i,a)=>a.findIndex(x=>x.url===s.url)===i);
 return {
  schema:'odc-launch-ground-plan/1',id:`launch-ground-${d.launcher}-${site.id}`,revision:'A',reviewed:'2026-11-06',
  reviewTarget:'PDR · launch-site allocation and preliminary service architecture',status:'Preliminary · mission interfaces open',
  launcher:d.launcher,siteId:site.id,site,umbilicals,geographicContext:geography,
  processingRoute:{facilityId:facility.id,name:facility.name,location:facility.location,status:facility.status,missionApproval:facility.missionApproval,roles:facility.roles,portableGSE:facility.portableGSE},
  compatibleSites:launchSitesFor(d.launcher).map(s=>({id:s.id,complexId:s.complexId,name:s.name,range:s.range,status:s.status,statusLabel:s.statusLabel})),
  scope:'Identify the compatible launch mount, ground infrastructure, service paths, physical disconnect boundaries and interface-verification responsibilities. Geometry and animation support preliminary design review; provider-approved interface drawings, electrical allocations and operating procedures remain controlled follow-on work.',
  boundaries:[
   {id:'facility',title:'Spacecraft servicing before encapsulation',text:'Spacecraft fuel, oxidizer and coolant servicing belong to the selected processing campaign. Launcher propellant feeds at the pad terminate on launcher stages; they do not fill the spacecraft propulsion system.'},
   {id:'ground',title:'Ground-to-launcher disconnect',text:'Pad service heads and retained ground lines clear the ascending vehicle. Physical attachment, fluid isolation, electrical power and command availability are separate interface states.'},
   {id:'flight',title:'Carrier-to-spacecraft disconnect',text:'The retained carrier harness reaches the payload separation interface. Its physical release occurs at spacecraft separation, after the ground umbilical has disconnected. Available services in flight require the mission-specific ICD.'},
   {id:'gse',title:'Portable equipment and fixed infrastructure',text:'Spacecraft GSE may travel between processing facilities and pads. The mission still requires agreed utility connections, installation space, current limits, bonding, access and provider acceptance for each location.'}
  ],
  evidence:{siteAllocation:'open',missionICD:'open',facilityAcceptance:'open',verificationAcceptance:'open',flightReadiness:'open'},
  sources
 };
}

export function launchConnectionRows(plan){
 return plan.umbilicals.connections.map(c=>{
  const g=plan.umbilicals.groups.find(g=>g.id===c.groupId);
  return {connection_id:c.id,assembly_id:c.groupId,service:c.name,category:c.category,medium:c.medium,direction:c.direction,
   source:c.source,destination:c.destination,path:c.chain.join(' → '),purpose:c.purpose,return_path:c.returnPath,
   evidence_status:c.status,interface_status:c.interfaceStatus||'open',basis:c.basis,
   physical_release:eventName(g?.release.event),visual_release_met_s:g?.release.met,visual_motion_start_met_s:g?.release.motionStart,visual_motion_end_met_s:g?.release.motionEnd,
   release_mode:g?.release.mode,release_basis:g?.release.basis,
   references:c.sourceIds.map(id=>plan.umbilicals.sources.find(s=>s.id===id)).filter(Boolean).map(s=>`${s.title} · ${s.section||''} ${s.url}`).join(' | ')};
 });
}

export function launchSiteCatalog(){
 return {schema:'odc-launch-site-catalog/1',reviewed:'2026-11-06',ranges:Object.values(launchRanges),complexes:Object.values(launchComplexes),sites:Object.values(launchSites),geographicContexts:Object.values(launchSites).map(s=>({siteId:s.id,...geographySummaryForSite(s.id)})),
  processingRoutes:Object.values(launchSites).flatMap(site=>site.compatibleVehicles.map(launcher=>({launcher,launchSiteId:site.id,processingFacilityId:processingFacility(launcher,site.id).id}))),
  relationship:'A range contains launch complexes; a complex may contain separate launch mounts. Compatibility is allocated to the mount. Processing facilities and portable GSE are related entities, not alternate names for the launch pad.'};
}

export function launchServiceDiagram(plan){
 const u=plan.umbilicals,stage=u.connections.filter(c=>c.category==='stage'),payload=u.connections.filter(c=>c.category==='payload');
 return `<figure class="mb-interface-figures mb-launch-path"><figcaption>Two physical disconnect boundaries</figcaption><svg viewBox="0 0 900 238" role="img" aria-label="Ground payload services pass through a liftoff disconnect and carrier harness to the spacecraft separation interface. Launcher propellant services terminate on launcher stages.">
 <rect x="0" y="0" width="900" height="238" rx="10" fill="#14242e"/>
 <g fill="#1f3540" stroke="#75939c"><rect x="20" y="43" width="152" height="73" rx="5"/><rect x="365" y="43" width="172" height="73" rx="5"/><rect x="730" y="43" width="150" height="73" rx="5"/><rect x="365" y="156" width="172" height="58" rx="5"/></g>
 <g stroke="#91d5ca" fill="none" stroke-width="3"><path d="M172 79H247m22 0h96m172 0h61m22 0h110"/><path d="M172 79l-7 -4m7 4l-7 4M365 79l-7 -4m7 4l-7 4M730 79l-7 -4m7 4l-7 4"/></g>
 <g stroke="#e4b06e" fill="none" stroke-width="2.5"><path d="M253 62v34m10 -34v34M605 62v34m10 -34v34"/><path d="M95 116v69h270m0 0l-8 -5m8 5l-8 5"/></g>
 <g font-family="system-ui,sans-serif" text-anchor="middle"><g fill="#eaf3f2" font-size="15"><text x="96" y="69">Ground services</text><text x="451" y="69">Carrier harness</text><text x="805" y="69">Spacecraft</text><text x="451" y="179">Launcher stages</text></g><g fill="#bad0d4" font-size="11"><text x="96" y="92">Facility / pad EGSE</text><text x="451" y="92">Retained flight side</text><text x="805" y="92">Payload interface</text><text x="451" y="198">${stage.length} allocated service paths</text></g><g fill="#edc28c" font-size="11"><text x="258" y="33">Ground disconnect</text><text x="610" y="33">Flight disconnect</text><text x="258" y="136">Clear for liftoff</text><text x="610" y="136">At spacecraft separation</text></g><g fill="#a6bfc8" font-size="11"><text x="221" y="206">Stage services</text><text x="714" y="182">${payload.length} payload service paths in the register</text><text x="714" y="200">Physical connection does not imply power on</text></g></g></svg></figure>`;
}

export function renderLaunchGroundPlan(plan){
 const site=plan.site,u=plan.umbilicals;
 const features=Object.entries(site.infrastructure||{}).map(([id,f])=>[esc(f.label||id),`${esc(f.kind)}<small>${esc(f.status)}</small>`,esc(f.basis)]);
 const rows=launchConnectionRows(plan);
 return `<section class="mb-section mb-launch-ground"><span class="mb-kicker">Launch ground architecture · Rev ${esc(plan.revision)}</span><h2>${esc(site.range)} · ${esc(site.name)}</h2><p>${esc(plan.scope)}</p>
 <div class="mb-callout"><strong>${esc(u.launcherName)} → ${esc(site.name)}</strong><p>${esc(site.statusLabel)}</p><p>${esc(site.siteNote)}</p><button type="button" class="btn" data-pad-open>Explore this launch site in 3D →</button></div>
 <h3>Allocated site and processing route</h3><p><b>${esc(plan.processingRoute.name)}</b> · ${esc(plan.processingRoute.location)}. Mission facility acceptance is ${esc(plan.processingRoute.missionApproval)}.</p>
 <p>Compatible mounts: ${plan.compatibleSites.map(s=>esc(s.name)+' · '+esc(s.statusLabel)).join('; ')}.</p>
 <p class="mb-muted">${esc(site.pinBasis)}. A shared launch complex can contain different vehicle-specific mounts and service installations.</p>
 ${plan.geographicContext?`<details class="mb-disclosure"><summary>Geographic visualization basis · ${esc(plan.geographicContext.name)}</summary><p>${esc(plan.geographicContext.geometryBasis)}</p><p>Regional imagery: ${esc(plan.geographicContext.imagery.attribution)} · ${esc(plan.geographicContext.imagery.acquired)} · ${esc(plan.geographicContext.imagery.resolutionM)} m per bundled pixel.</p>${plan.geographicContext.detail?`<p>Local imagery: ${esc(plan.geographicContext.detail.image.attribution)} · ${esc(plan.geographicContext.detail.image.acquired)} · ${esc(plan.geographicContext.detail.image.resolutionM)} m per bundled pixel.</p>`:''}<p>Elevation: ${esc(plan.geographicContext.elevation?.attribution)}. No vertical exaggeration.</p><p>${plan.geographicContext.sources.map(link).join(' · ')}</p><button type="button" class="btn" data-launch-surroundings>Explore the surroundings →</button></details>`:''}
 ${launchServiceDiagram(plan)}
 <h3>Site infrastructure and evidence</h3>${table(['System','Architecture / evidence','Public basis and limits'],features)}
 <h3>Interface boundaries</h3><div class="mb-approach">${plan.boundaries.map(b=>`<article><h4>${esc(b.title)}</h4><p>${esc(b.text)}</p></article>`).join('')}</div>
 <h3>Umbilical assemblies and release</h3><p>${esc(u.summary)}</p>
 ${table(['Assembly','Service location','Physical release / model basis'],u.groups.map(g=>[`${esc(g.name)}<small>${esc(g.status)}</small>`,`${esc(g.architecture)}<small>${esc(g.basis)}</small>`,`${esc(eventName(g.release.event))}<small>${esc(g.release.mode)} · illustrated ${met(g.release.met)}</small><small>${esc(g.release.basis)}</small>`]))}
 <details class="mb-disclosure"><summary>Complete connection register · ${rows.length} service paths</summary>${table(['Service / medium','Path and purpose','Evidence / interface'],rows.map(r=>[`${esc(r.service)}<small>${esc(r.connection_id)} · ${esc(r.medium)}</small>`,`${esc(r.path)}<p>${esc(r.purpose)}</p>${r.return_path?`<small>${esc(r.return_path)}</small>`:''}`,`${esc(r.evidence_status)}<p>${esc(r.basis)}</p><small>Mission interface: ${esc(r.interface_status)}</small>`]))}</details>
 <h3>PDR verification and responsibility</h3>${table(['Subject / method','Required evidence','Owner / acceptance'],u.requirements.map(r=>[`${esc(r.subject)}<small>${esc(r.method)}</small>`,esc(r.evidence),`${esc(r.owner)}<small>${esc(r.status)}</small>`]))}
 <details class="mb-disclosure"><summary>Mission-specific items to close</summary><ul>${u.openItems.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
 <p class="mb-evidence-state">${esc(u.model.geometry)} ${esc(u.model.timing)} Animation does not complete interface verification or grant launch authorization.</p>
 <details class="mb-disclosure"><summary>Launch-site and umbilical references</summary>${plan.sources.map(s=>`<p>${link(s)}<small>${esc(s.section||s.basis||'')}</small></p>`).join('')}</details></section>`;
}

export function launchGroundPlanHtml(plan){
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ODC · Launch site and umbilical design</title><style>body{font:15px/1.55 system-ui;color:#18313c;max-width:1100px;margin:32px auto;padding:0 24px}h1,h2,h3,h4{line-height:1.25}h3{margin-top:28px}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #cddbdd;padding:10px;overflow-wrap:anywhere}th:first-child{width:22%}thead{background:#eaf2f3}small{display:block;color:#536773}a{color:#176775}.mb-callout{background:#eef4f3;padding:16px;border-left:4px solid #377d78}.mb-approach article{border-bottom:1px solid #d5dfe2;padding:10px 0}.mb-evidence-state{border-top:1px solid #9fb9bd;padding-top:16px}.mb-launch-path{margin:20px 0}.mb-launch-path svg{display:block;width:100%;height:auto}.mb-launch-path figcaption{font-weight:650;margin-bottom:8px}button{display:none}@media print{tr,figure{break-inside:avoid}h2,h3,h4{break-after:avoid}a{color:inherit}}@media(max-width:650px){.mb-table-scroll{overflow:auto}table{min-width:620px}}</style><h1>Orbital Data Center · Launch site and umbilical design</h1><p>${esc(plan.reviewTarget)} · ${esc(plan.status)}</p>${renderLaunchGroundPlan(plan).replaceAll('<details','<details open')}<script type="application/json" id="odc-launch-ground-plan">${JSON.stringify(plan).replaceAll('<','\\u003c')}</script></html>`;
}
