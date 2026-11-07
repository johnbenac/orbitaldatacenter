import {launchSiteFor} from './launch-sites.js';
import {launchUmbilicalDesign,launchUmbilicalState,UMBILICAL_MEDIA} from './launch-umbilicals.js';

const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const clock=t=>(t<0?'T−':'T+')+String(Math.floor(Math.abs(t)/60)).padStart(2,'0')+':'+String(Math.floor(Math.abs(t)%60)).padStart(2,'0');
const statusLabel=s=>({documented:'Documented basis',proposed:'Proposed',study:'Study allocation',unknown:'Unresolved',open:'Interface open'}[s]||s);
const stateLabel=s=>s==='connected'?'Physically attached':s==='releasing'?'Withdrawing':'Clear';
const mediumLabel=c=>UMBILICAL_MEDIA[c.medium]?.label||c.medium;
const links=(record,ids)=>ids.map(id=>record.sources.find(s=>s.id===id)).filter(Boolean).map(s=>'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer" title="'+esc(s.section)+'">'+esc(s.title)+' ↗</a>').join('');
const chosen=(design,id)=>design.connections.find(c=>c.id===id)||design.connections.find(c=>c.id==='payload-power')||design.connections[0];
function context(h,s,view){
 const design=launchUmbilicalDesign(h),preview=view.phase!=='D',t=preview?-20:Number.isFinite(s?.t)?s.t:-20;
 if(!design)return null;
 const selected=chosen(design,view.padConnection),group=design.groups.find(g=>g.id===selected.groupId),state=launchUmbilicalState(design,t);
 return {design,selected,group,state,preview,playing:!preview&&!!(view.padPlaying??view.playing),site:launchSiteFor(design.launcherId,design.siteId)};
}

const icon={
 lightning:'<path d="M7 27V9l3-5 3 5v18M24 27V9l3-5 3 5v18M10 7h17M10 19l-7 8m24-8 7 8M18 2l-3 10h6l-3 10"/>',
 water:'<path d="M8 27V13h18v14M8 16h18M17 13V5M11 5h12M11 5V2h12v3M6 27h22M26 22h5v5"/><path d="M34 20c-4 5-4 6 0 6s4-1 0-6Z"/>',
 exhaust:'<path d="M4 11h10v7h10v-7h10M5 28h8l6-7 6 7h8M19 2v16M15 12l4 6 4-6"/>',
 support:'<path d="M7 28V3h8v25M7 7h8m-8 6h8m-8 6h8m-8 6h8M15 11h17m-17 2 17 6M31 9v14M27 28h9"/>',
 commodities:'<rect x="2" y="10" width="8" height="18" rx="3"/><rect x="14" y="3" width="9" height="25" rx="4"/><rect x="27" y="10" width="8" height="18" rx="3"/><path d="M6 7v3m12-9v2m13 4v3M6 28v3h25v-3"/>'
};
function infrastructure(site){
 const labels={lightning:'Lightning protection',water:'Water suppression',exhaust:'Exhaust routing',support:'Vehicle support',commodities:'Commodity services'};
 return '<div class="ps-infrastructure">'+Object.entries(labels).map(([id,label])=>{const f=site.infrastructure?.[id];if(!f)return '';
  return '<article class="ps-feature" data-ps-feature="'+id+'"><svg viewBox="0 0 38 34" aria-hidden="true">'+icon[id]+'</svg><div><small>'+label+'</small><h3>'+esc(f.label)+'</h3><span class="ps-basis" data-basis="'+esc(f.status)+'">'+esc(statusLabel(f.status))+'</span><details><summary>Basis &amp; sources</summary><p>'+esc(f.basis)+'</p>'+links(site,f.sourceIds||[])+'</details></div></article>';
 }).join('')+'</div>';
}
function short(value,max=25){const words=String(value).split(/\s+/),lines=[];let line='';for(const word of words){if(line.length+word.length+1>max&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines.slice(0,3);}
const text=(x,y,value,cls='')=>'<text x="'+x+'" y="'+y+'" class="ps-svg-text '+cls+'">'+short(value).map((t,i)=>'<tspan x="'+x+'" dy="'+(i?15:0)+'">'+esc(t)+'</tspan>').join('')+'</text>';
function supplySymbol(x,fluid,flight){
 if(flight)return '<g class="ps-object"><path d="M'+(x-48)+' 90h96v68h-96zM'+(x-35)+' 90v68m70-68v68M'+(x-50)+' 161h100v12h-100zM'+(x-26)+' 106h52v35h-52z"/><path d="M'+(x-18)+' 116h36m-36 11h36"/></g>';
 if(fluid)return '<g class="ps-object"><rect x="'+(x-32)+'" y="73" width="64" height="105" rx="26"/><path d="M'+(x-8)+' 73V62h16v11M'+(x-15)+' 178v10m30-10v10M'+(x-23)+' 92h46M'+(x+32)+' 128h17"/></g>';
 return '<g class="ps-object"><rect x="'+(x-48)+'" y="78" width="96" height="103" rx="5"/><rect x="'+(x-34)+'" y="93" width="68" height="29" rx="2"/><path d="M'+(x-26)+' 111h14l5-9 8 16 6-8h19M'+(x-31)+' 140h43m-43 16h43M'+(x-29)+' 181v8m58-8v8"/><circle cx="'+(x+28)+'" cy="142" r="3"/><circle cx="'+(x+28)+'" cy="157" r="3"/></g>';
}
function receiverSymbol(fluid,flight,air){
 if(air)return '<g class="ps-object"><path d="M531 181v-74q0-40 42-65 42 25 42 65v74zM531 111h84M546 181v-63m54 63v-63M549 137h48v32h-48z"/><path class="ps-air-arrows" d="M546 103h54m-41-10 12 10-12 10m17-20 12 10-12 10"/></g>';
 if(fluid)return '<g class="ps-object"><rect x="532" y="67" width="84" height="115" rx="34"/><path d="M548 85h53M566 67V55h17v12M566 182v11h17v-11"/></g>';
 return '<g class="ps-object"><path d="M524 89h101v80H524zM524 89l16-13h101l-16 13m0 80 16-13V76M540 105h68v47h-68zM534 170v13h80v-13"/><path d="M551 116h10m-10 10h42m-42 10h42"/>'+(flight?'<path d="M537 183v8m75-8v8"/>':'')+'</g>';
}
function serviceDiagram(ctx){
 const {selected:c,group:g,state}=ctx,cs=state.connections.find(s=>s.id===c.id),fluid=UMBILICAL_MEDIA[c.medium].fluid,flight=g.release.event==='payload-release',air=c.medium==='conditioned-air';
 const f=cs.releaseFraction,shift=-28*f,drop=15*f;
 const sourceText=flight?'Carrier retained hardware':c.source,destination=air?'Payload compartment':c.destination;
 return '<svg class="ps-diagram" viewBox="0 0 720 290" role="img" aria-label="'+esc(c.name+'. '+c.chain.join(' to ')+'. '+stateLabel(cs.state)+'. Schematic, not fabrication geometry.')+'" style="--ps-wire:'+c.color+'">'+
 '<rect class="ps-zone" x="18" y="40" width="428" height="165" rx="9"/><rect class="ps-zone ps-flight-zone" x="475" y="40" width="226" height="165" rx="9"/>'+text(231,24,flight?'RETAINED CARRIER SIDE':'GROUND SIDE','ps-svg-kicker')+text(588,24,flight?'SPACECRAFT SIDE':'FLIGHT SIDE','ps-svg-kicker')+
 supplySymbol(104,fluid&&!air,flight)+receiverSymbol(fluid&&!air,flight,air)+
 '<path class="ps-wire-base" d="M'+(fluid&&!air?153:152)+' 128H315M365 128H'+(air?531:fluid?532:524)+'"/>'+
 '<path class="ps-wire-trace" data-ps-trace d="M153 128H313M367 128H'+(air?530:fluid?532:524)+'"/>'+
 '<g class="ps-fixed-connector"><rect x="350" y="111" width="19" height="34" rx="3"/><path d="M350 118h-9m9 10h-9m9 10h-9"/></g>'+
 '<g class="ps-moving-connector" data-ps-moving transform="translate('+shift+' '+drop+')"><rect x="313" y="111" width="24" height="34" rx="3"/><path d="M337 118h9m-9 10h9m-9 10h9"/></g>'+
 '<path class="ps-leader" d="M339 102V76h-4"/>'+text(339,64,flight?'Separation connector':'Ground disconnect','ps-svg-annotation')+
 '<path class="ps-boundary" d="M460 47v151"/>'+
 text(104,223,sourceText)+text(577,223,destination)+
 (fluid?'<path class="ps-open-route" d="M573 182v12h-60"/>'+text(362,267,air?'Compartment vent path allocated by provider':'Vent / drain route: provider allocation','ps-svg-muted'):text(231,185,flight?'Ground source does not follow the vehicle':'Protected ground service allocation','ps-svg-muted'))+
 '<g data-ps-gap style="opacity:'+(cs.connected?0:1)+'"><path d="m324 153 10 10m0-10-10 10"/></g></svg>';
}
function connectionButtons(design,selected){
 const categories=[['Propellant circuits',c=>UMBILICAL_MEDIA[c.medium].fluid&&c.category==='stage'],['Vehicle electrical',c=>c.category==='stage'&&!UMBILICAL_MEDIA[c.medium].fluid],['Spacecraft ground services',c=>c.category==='payload'&&c.groupId!=='payload-flight'],['Spacecraft flight interface',c=>c.groupId==='payload-flight']];
 return '<div class="ps-circuit-groups">'+categories.map(([title,include])=>'<section><h4>'+title+'</h4><div class="ps-circuit-list">'+design.connections.filter(include).map(c=>'<button type="button" data-pad-connection="'+esc(c.id)+'" aria-pressed="'+(c.id===selected.id)+'" style="--ps-circuit:'+c.color+'"><i aria-hidden="true"></i><span>'+esc(c.name)+'</span><small data-ps-connection-state="'+esc(c.id)+'"></small></button>').join('')+'</div></section>').join('')+'</div>';
}
function detail(ctx){
 const {selected:c,group:g,design}=ctx,flight=g.release.event==='payload-release';
 return '<div class="ps-detail-head"><span class="ps-over">Selected service circuit</span><h3>'+esc(c.name)+'</h3><span class="ps-basis" data-basis="'+esc(c.status)+'">'+esc(statusLabel(c.status))+'</span></div><p class="ps-purpose">'+esc(c.purpose)+'</p><dl class="ps-properties"><div><dt>Service medium</dt><dd>'+esc(mediumLabel(c))+'</dd></div><div><dt>Assembly</dt><dd>'+esc(g.name)+'</dd></div><div><dt>Physical state</dt><dd data-ps-selected-state></dd></div><div><dt>Release boundary</dt><dd>'+esc(flight?'Spacecraft separation · '+clock(g.release.met):g.release.met===0?'Liftoff · T0':clock(g.release.met))+'</dd></div></dl><div class="ps-chain" aria-label="'+esc(c.name)+' service chain">'+c.chain.map((label,i)=>'<span><b>'+String(i+1).padStart(2,'0')+'</b>'+esc(label)+'</span>').join('')+'</div><p class="ps-service-state" data-ps-service-state></p>'+
 (c.constraint?'<p class="ps-constraint">'+esc(c.constraint)+'</p>':'')+(c.returnPath?'<details class="ps-return"><summary>Vent / return boundary</summary><p>'+esc(c.returnPath)+'</p></details>':'')+
 '<button type="button" class="ps-inspect" data-pad-inspect="'+esc(c.id)+'">Inspect this interface in 3D ↗</button><details class="ps-evidence"><summary>Design basis &amp; open allocation</summary><p>'+esc(c.basis)+'</p><p>'+esc(g.release.basis)+'</p>'+links(design,[...new Set(c.sourceIds.concat(g.sourceIds))])+'</details>';
}
function planning(design){
 return '<details class="ps-plan"><summary><span>Interface verification plan</span><small>'+design.requirements.length+' evidence packages · all open</small></summary><p>'+esc(design.scope)+'</p><div class="ps-table-wrap"><table><thead><tr><th>Required evidence</th><th>Method and ownership</th><th>Closeout record</th><th>State</th></tr></thead><tbody>'+design.requirements.map(r=>'<tr><th scope="row">'+esc(r.subject)+'<small>'+esc(r.id)+'</small></th><td>'+esc(r.method)+'<small>'+esc(r.owner)+'</small></td><td>'+esc(r.evidence)+'</td><td><span class="ps-open">Open</span></td></tr>').join('')+'</tbody></table></div><h4>Open design allocations</h4><ul>'+design.openItems.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>'+(design.options.length?'<h4>Provider options · not selected</h4><ul>'+design.options.map(o=>'<li><b>'+esc(o.name)+'.</b> '+esc(o.basis)+'</li>').join('')+'</ul>':'')+'</details>';
}
function stateStrip(ctx){const {design,state,preview}=ctx,ground=design.groups.filter(g=>g.release.event!=='payload-release').length;return '<dl class="ps-state-strip"><div><dt data-ps-clock-label>'+esc(preview?'Prelaunch design preview':'Mission elapsed time')+'</dt><dd data-ps-clock>'+clock(state.t)+'</dd></div><div><dt>Ground assemblies attached</dt><dd data-ps-ground-count>'+state.groundConnectedCount+' / '+ground+'</dd></div><div><dt>Spacecraft flight connector</dt><dd data-ps-flight-state>'+esc(state.flightConnectedCount?'Attached':'Released')+'</dd></div><div><dt>Mission interface acceptance</dt><dd class="ps-state-open">Open at PDR</dd></div></dl>';}
export function renderPadSystems(h,s,view={}){
 const ctx=context(h,s,view);if(!ctx)return '';
 const {design,selected,site}=ctx;
 const html='<section class="ps-shell" data-ps-design="'+esc(design.id)+'" data-ps-selected="'+esc(selected.id)+'" data-playing="'+ctx.playing+'"><header class="ps-header"><div><span class="ps-over">'+esc(design.launcherName)+' · '+esc(site.name)+'</span><h2>Pad services &amp; umbilicals</h2></div><span class="ps-pdr">PDR architecture · Rev '+esc(design.revision)+'</span></header><p class="ps-intro">'+esc(design.summary)+'</p>'+infrastructure(site)+stateStrip(ctx)+
 '<div class="ps-workbench"><div class="ps-main"><div class="ps-diagram-head"><h3 data-ps-diagram-title>'+esc(selected.name)+'</h3><span>Service boundary schematic</span></div><div data-ps-diagram>'+serviceDiagram(ctx)+'</div><p class="ps-figure-note">Connection state is physical attachment, not a live reading of power or flow. Locations and withdrawal motion are illustrative; provider limits and clearance evidence remain open.</p>'+connectionButtons(design,selected)+'</div><aside class="ps-inspector" data-ps-detail>'+detail(ctx)+'</aside></div>'+
 '<div class="ps-transport"><button type="button" class="ps-play" data-pad-play aria-pressed="'+ctx.playing+'">'+(ctx.playing?'Pause sequence':'Play pad sequence')+'</button><div class="ps-milestones" role="group" aria-label="Inspect launch interface events"><button type="button" data-pad-seek="-20">On pad <small>T−00:20</small></button><button type="button" data-pad-seek="0.8">T0 disconnect <small>Liftoff</small></button><button type="button" data-pad-seek="5">Pad clear <small>T+00:05</small></button><button type="button" data-pad-seek="'+(design.groups.find(g=>g.release.event==='payload-release').release.met+2)+'">Payload release <small>'+clock(design.groups.find(g=>g.release.event==='payload-release').release.met)+'</small></button></div><span class="ps-timing-note">One mission clock<br>Illustrative event timing</span></div>'+planning(design)+
 '<footer class="ps-footer"><span>'+esc(site.range)+' · '+esc(site.statusLabel)+'</span><details><summary>Reference documents</summary><div>'+links(design,design.sources.map(s=>s.id))+'</div></details></footer></section>';
 return html;
}

// Change only the selected inspection panel when the choice changes; normal
// playback updates text and SVG attributes in place, preserving focused controls.
export function refreshPadSystems(host,h,s,view={}){
 if(!host)return;
 const ctx=context(h,s,view);if(!ctx)return;
 const shell=host.matches?.('.ps-shell')?host:host.querySelector?.('.ps-shell');
 if(!shell||shell.dataset?.psDesign!==ctx.design.id){host.innerHTML=renderPadSystems(h,s,view);return;}
 const {selected,group,design,state,preview,playing}=ctx;
 const set=(selector,value)=>{const node=shell.querySelector(selector);if(node&&node.textContent!==String(value))node.textContent=String(value);};
 if(shell.dataset.psSelected!==selected.id){
  shell.dataset.psSelected=selected.id;
  const panel=shell.querySelector('[data-ps-detail]'),drawing=shell.querySelector('[data-ps-diagram]');
  if(panel)panel.innerHTML=detail(ctx);if(drawing)drawing.innerHTML=serviceDiagram(ctx);
  set('[data-ps-diagram-title]',selected.name);
  for(const b of shell.querySelectorAll('[data-pad-connection]'))b.setAttribute('aria-pressed',String(b.dataset.padConnection===selected.id));
 }
 shell.dataset.playing=String(playing);
 set('[data-ps-clock-label]',preview?'Prelaunch design preview':'Mission elapsed time');set('[data-ps-clock]',clock(state.t));
 set('[data-ps-ground-count]',state.groundConnectedCount+' / '+design.groups.filter(g=>g.release.event!=='payload-release').length);
 set('[data-ps-flight-state]',state.flightConnectedCount?'Attached':'Released');
 const byId=Object.fromEntries(state.connections.map(c=>[c.id,c])),cs=byId[selected.id];
 set('[data-ps-selected-state]',stateLabel(cs.state));
 const servicePlan=selected.medium==='conditioned-air'?'environmental-control':UMBILICAL_MEDIA[selected.medium].fluid?'fluid-isolation':selected.medium==='power'?'power-handover':'interface-control';
 set('[data-ps-service-state]',cs.serviceState==='Service availability follows the approved countdown'?(group.release.event==='payload-release'?'The carrier and spacecraft halves remain physically connected until release.':'Ground service availability follows the approved countdown and '+servicePlan+' plan.'):cs.serviceState+'. The retained flight harness is not a continuing ground connection.');
 for(const n of shell.querySelectorAll('[data-ps-connection-state]')){const st=byId[n.dataset.psConnectionState];if(st){n.textContent=st.state==='connected'?'Attached':st.state==='releasing'?'Releasing':'Clear';n.dataset.state=st.state;}}
 const moving=shell.querySelector('[data-ps-moving]');moving?.setAttribute('transform','translate('+(-28*cs.releaseFraction).toFixed(2)+' '+(15*cs.releaseFraction).toFixed(2)+')');
 const gap=shell.querySelector('[data-ps-gap]');if(gap)gap.style.opacity=cs.connected?'0':'1';
 const trace=shell.querySelector('[data-ps-trace]');if(trace)trace.style.opacity=cs.connected?'1':'.15';
 const play=shell.querySelector('[data-pad-play]');if(play){play.setAttribute('aria-pressed',String(playing));play.textContent=playing?'Pause sequence':state.t>=5?'Replay pad sequence':'Play pad sequence';}
}
