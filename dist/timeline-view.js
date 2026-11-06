// This baseline reads the shared ledger. Selecting a callout changes the reader;
// the explicit flight button hands its recorded instant to the mission clock.
import {icon} from './icons.js';
import {launchFleet} from './launch-fleet.js';
import {launchSiteFor} from './launch-sites.js';

const segments=[
 ['ground','Ground processing','package'],['countdown','Countdown','timer'],
 ['ascent','Ascent','rocket'],['insertion','Insertion','orbit'],
 ['commissioning','Checkout','settings-2'],['operations','Early operations','satellite']
];
const names=Object.fromEntries(segments.map(([key,label])=>[key,label]));
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const sourceLink=(url,title)=>/^https?:\/\//i.test(url||'')?'<a href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(title||'Source')+' ↗</a>':'';
const pad=n=>String(n).padStart(2,'0');
const flightTime=row=>row.seek===null?null:(row.seek??row.start);
const finite=Number.isFinite;

export function timelineTime(seconds,precision){
 if(!finite(seconds))return '—';
 const sign=seconds<0?'T−':'T+';
 if(precision==='hour')return sign+Math.round(Math.abs(seconds)/3600)+' h';
 if(precision==='day')return sign+Math.round(Math.abs(seconds)/86400)+' d';
 const tenths=Math.round(Math.abs(seconds)*10),whole=Math.floor(tenths/10);
 return sign+pad(Math.floor(whole/3600))+':'+pad(Math.floor(whole/60)%60)+':'+pad(whole%60)+(tenths%10?'.'+(tenths%10):'');
}
function spanText(seconds){
 if(!finite(seconds)||seconds<=0)return '';
 if(seconds<1)return (Math.round(seconds*100)/100)+' s';
 const s=Math.round(seconds),h=Math.floor(s/3600),m=Math.floor(s/60)%60;
 return [h?h+' h':'',m?m+' min':'',s%60?s%60+' s':''].filter(Boolean).join(' ');
}
function utc(epoch,seconds,day){
 const ms=Date.parse(epoch)+1000*seconds;
 if(!Number.isFinite(ms))return 'Epoch unavailable';
 const stamp=new Date(ms).toISOString();
 return stamp.slice(0,10)+(day?' UTC':(' '+stamp.slice(11,19)+' UTC'));
}
export function visibleTimelineRows(model,view){
 return model.rows.filter(r=>(view.timelineAll||r.major)&&(!view.timelineSegment||view.timelineSegment==='all'||view.timelineSegment===r.segment));
}
function selectedRow(rows,view){
 return rows.find(r=>r.id===view.timelineRow)||rows.find(r=>r.start===0&&r.segment==='ascent')||rows[0];
}
export function timelineSelection(model,view){
 return selectedRow(visibleTimelineRows(model,view),view);
}
function contextStrip(h,model){
 const lv=launchFleet[h.input.launcher],pad=launchSiteFor(h.input.launcher,h.input.launchSite);
 return '<header class="mtl-header"><div><div class="mtl-eyebrow"><i></i>Mission sequence</div><h2>'+esc(lv?.name||h.launcherLabel||'Selected launch vehicle')+'</h2><p>'+icon('map-pin',13)+' '+esc([pad?.name,pad?.range].filter(Boolean).join(' · '))+'</p></div><div class="mtl-bounds"><div><small>CAMPAIGN BEGINS</small><b>'+timelineTime(model.start,model.rows[0]?.precision)+'</b></div><span class="mtl-bound-line" aria-hidden="true"></span><div><small>EARLY FLIGHT ENDS</small><b>'+timelineTime(model.end)+'</b></div></div></header>';
}
function segmentNav(model,view){
 const selected=view.timelineSegment||'all';
 return '<div class="mtl-strip-label"><strong>Mission segments</strong><button type="button" class="mtl-reset" data-mtl-segment="all" aria-pressed="'+(selected==='all')+'">Full sequence</button></div><div class="mtl-stages" role="group" aria-label="Filter timeline by mission segment">'+segments.map(([key,label,glyph],index)=>{
  const first=model.rows.find(r=>r.segment===key);
  return '<button type="button" data-mtl-segment="'+key+'" data-stage="'+key+'" aria-pressed="'+(selected===key)+'"'+(first?'':' disabled')+'><span class="mtl-stage-index">'+icon(glyph,16)+'<small>0'+(index+1)+'</small></span><b>'+label+'</b><small>'+esc(first?timelineTime(first.start,first.precision):'Outside window')+'</small></button>';
 }).join('')+'</div>';
}
function inspector(row,rows,h){
 if(!row)return '<aside class="mtl-inspector mtl-empty"><h3>No matching callout</h3><p>Choose All events to read the detailed entries in this segment.</p></aside>';
 const i=rows.indexOf(row),target=flightTime(row),day=row.precision==='day',duration=spanText(row.end-row.start);
 const step=(offset,arrow,hint)=>'<button type="button" class="mtl-step" aria-label="'+hint+'" title="'+hint+'" '+(rows[i+offset]?'data-mtl-select="'+esc(rows[i+offset].id)+'" data-mtl-step="'+offset+'"':'disabled')+'>'+icon(arrow,16)+'</button>';
 return '<aside class="mtl-inspector" data-stage="'+esc(row.segment)+'" aria-label="Selected timeline event"><div class="mtl-call-header"><span class="mtl-eyebrow">Selected callout</span><div>'+step(-1,'chevron-left','Previous visible callout')+step(1,'chevron-right','Next visible callout')+'</div></div>'+
  '<div class="mtl-time-large">'+timelineTime(row.start,row.precision)+'</div><div class="mtl-event-meta"><span>Phase '+esc(row.phase)+'</span><span>'+esc(names[row.segment])+'</span></div>'+
  '<h3>'+esc(row.title)+'</h3><p>'+esc(row.description)+'</p>'+
  '<dl class="mtl-facts"><div><dt>Lead</dt><dd>'+esc(row.owner||'Mission operations')+'</dd></div><div><dt>Timing basis</dt><dd>'+esc(row.basis)+'</dd></div>'+
  (row.status?'<div><dt>Event status</dt><dd>'+esc(row.status)+'</dd></div>':'')+
  (duration?'<div><dt>Interval end</dt><dd>'+timelineTime(row.end,row.precision)+'<small> · '+esc(duration)+'</small></dd></div>':'')+
  '<div><dt>'+(day?'Planning date':'Event time')+'</dt><dd>'+esc((row.precision==='hour'?'Approx. ':'')+utc(h.input.epoch,row.start,day))+'</dd></div></dl>'+
  (sourceLink(row.sourceUrl,row.sourceTitle)?'<div class="mtl-row-source">'+sourceLink(row.sourceUrl,row.sourceTitle)+'</div>':'')+
  (finite(target)?'<button type="button" class="mtl-open" data-mtl-jump="'+esc(row.id)+'" title="Pause the mission at '+timelineTime(target)+' and inspect this event.">'+icon('play',15)+' View in simulation '+icon('arrow-up-right',14)+'</button>':'<div class="mtl-plan-note">'+icon('book-open',15)+'<span>'+(
   row.status==='blocked'?'The current integration hold prevents this step.':
   day?'Planning entry · approximate campaign day':row.precision==='hour'?'Planning entry · approximate launch-day hour':'Outside the recorded flight sequence')+'</span></div>')+'</aside>';
}
function ledger(model,rows,selected,view){
 const all=!!view.timelineAll;
 let prev=null;
 const records=rows.map(r=>{
  const active=r.id===selected?.id,time=timelineTime(r.start,r.precision);
  const section=prev!==r.segment?(prev?'</tbody>':'')+'<tbody><tr class="mtl-group" data-stage="'+esc(r.segment)+'"><th scope="rowgroup" colspan="3">'+esc(names[r.segment])+' <span>Phase '+esc(r.phase)+'</span></th></tr>':'';
  prev=r.segment;
  return section+'<tr class="mtl-entry" data-mtl-row="'+esc(r.id)+'" data-stage="'+esc(r.segment)+'" data-active="'+active+'"><td class="mtl-tick">'+time+'</td><td><button type="button" data-mtl-select="'+esc(r.id)+'" aria-pressed="'+active+'"><i aria-hidden="true"></i><span>'+esc(r.title)+'</span></button></td><td class="mtl-owner">'+esc(r.owner)+'</td></tr>';
 }).join('');
 const choice=(k,label,on)=>'<button data-mtl-level="'+k+'" type="button" aria-pressed="'+on+'">'+label+'</button>';
 return '<section class="mtl-ledger" aria-label="Event ledger"><header><div><h3>Event sequence</h3><p>'+rows.length+' shown · '+model.rows.length+' total</p></div><div class="mtl-level" role="group" aria-label="Timeline detail">'+choice('key','Key callouts',!all)+choice('all','All events',all)+'</div></header>'+
  '<div class="mtl-scroll" tabindex="0" role="region" aria-label="Time-ordered event list"><table><thead><tr><th scope="col">Liftoff offset</th><th scope="col">Event</th><th class="mtl-owner" scope="col">Lead</th></tr></thead>'+records+(records?'</tbody>':'')+'</table>'+
  (rows.length?'':'<p class="mtl-nomatch">There are no '+(all?'events':'key callouts')+' in this segment.</p>')+'</div></section>';
}
const formatSources=[
 ['NASA · Artemis I countdown clocks','https://www.nasa.gov/missions/artemis/orion/artemis-i-launch-countdown-101/'],
 ['NASA · Europa Clipper launch milestones','https://science.nasa.gov/blogs/europa-clipper/2024/10/14/key-milestones-for-todays-europa-clipper-launch-2/'],
 ['Arianespace · VA265 launch campaign and flight sequence','https://www.arianespace.com/app/uploads/sites/4/2025/11/LAUNCH-KIT-VA265-EN_FINAL-.pdf']
];
function basisAndExports(){
 const links=formatSources.map(([title,url])=>sourceLink(url,title));
 return '<footer class="mtl-footer"><details class="mtl-basis"><summary>'+icon('book-open',15)+' How to read this timeline</summary><p>T− and T+ are continuous offsets from liftoff. A real countdown can pause its procedure clock during a hold. The workbench uses a continuous mission clock and the design epoch gives the UTC time of liftoff.</p><p>The opening campaign dates and early launch-control shifts are planning allowances. The animated integration sequence starts at T−01:00:00. Select a row for its time basis, then open its flight view where available.</p><h4>Published timeline examples</h4><p>NASA’s countdown brief distinguishes procedure time and liftoff time. The Europa Clipper event list and Arianespace launch kit show how teams move from a campaign chronology to a timed flight sequence.</p><div class="mtl-sources">'+links.join('')+'</div></details><div class="mtl-exports"><span>Export full timeline</span><a data-mtl-export="csv" download>'+icon('download',13)+' CSV</a><a data-mtl-export="json" download>'+icon('download',13)+' JSON</a></div></footer>';
}
function contents(model,h,view){
 const rows=visibleTimelineRows(model,view),selected=selectedRow(rows,view);
 const hold=model.launchHold;
 return contextStrip(h,model)+
  (hold?'<div class="mtl-hold" role="note">'+icon('circle-alert',18)+'<div><b>Launch compatibility hold</b><p>'+esc(typeof hold==='string'?hold:hold.reason||'The selected spacecraft and carrier do not clear all launch constraints.')+' Flight entries are conditional on resolving the hold.</p></div></div>':'')+
  segmentNav(model,view)+'<div class="mtl-workarea">'+inspector(selected,rows,h)+ledger(model,rows,selected,view)+'</div>'+
  '<div class="mtl-endnote">'+icon('circle-dot',15)+'<span><b>Timeline boundary</b> '+esc(model.endReason)+'</span></div>'+basisAndExports();
}
export function renderMasterTimeline(model,h,view={}){
 return '<section class="master-timeline" data-master-timeline aria-label="Master mission timeline">'+contents(model,h,view)+'</section>';
}

function revealRow(el,id){
 const scroller=el.querySelector('.mtl-scroll');
 const row=Array.from(el.querySelectorAll('[data-mtl-row]')).find(r=>r.dataset.mtlRow===id);
 if(!scroller||!row)return;
 const r=row.getBoundingClientRect(),box=scroller.getBoundingClientRect();
 const headingHeight=scroller.querySelector('thead')?.getBoundingClientRect().height||26;
 if(r.top<box.top+headingHeight||r.bottom>box.bottom)scroller.scrollTop+=r.top-box.top-headingHeight-(box.height-headingHeight)*.36;
}
export function bindMasterTimeline(host,model,h,view,{onOpen,onExport,onView,fileFor}={}){
 const el=host.matches?.('[data-master-timeline]')?host:host.querySelector('[data-master-timeline]');
 if(!el||el.dataset.bound)return;
 el.dataset.bound='true';
 const current={...view};
 function linkExports(){
  if(!fileFor)return;
  for(const anchor of el.querySelectorAll('[data-mtl-export]')){
   const file=fileFor(anchor.dataset.mtlExport);
   if(file?.url){anchor.href=file.url;anchor.download=file.name}
  }
 }
 linkExports();
 revealRow(el,timelineSelection(model,current)?.id);
 el.addEventListener('click',event=>{
  const b=event.target.closest?.('button,a[data-mtl-export],[data-mtl-row]');
  if(!b||!el.contains(b))return;
  const d=b.dataset;
  if(d.mtlExport){if(!b.hasAttribute('href')){event.preventDefault();onExport?.(d.mtlExport)}return}
  if(d.mtlJump){const r=model.rows.find(r=>r.id===d.mtlJump);if(r&&finite(flightTime(r)))onOpen?.(r);return}
  const patch={};
  if(d.mtlSegment!=null)patch.timelineSegment=d.mtlSegment;
  else if(d.mtlLevel!=null)patch.timelineAll=d.mtlLevel==='all';
  else if(d.mtlSelect||d.mtlRow)patch.timelineRow=d.mtlSelect||d.mtlRow;
  else return;
  Object.assign(current,patch);
  const selected=timelineSelection(model,current);
  current.timelineRow=patch.timelineRow=selected?.id??null;
  const previousScroll=el.querySelector('.mtl-scroll')?.scrollTop||0,basisOpen=el.querySelector('.mtl-basis')?.open;
  const keyboard=event.detail===0;
  el.innerHTML=contents(model,h,current);
  linkExports();
  el.querySelector('.mtl-basis').open=!!basisOpen;
  el.querySelector('.mtl-scroll').scrollTop=previousScroll;
  const control=d.mtlSegment!=null?'mtlSegment':d.mtlLevel!=null?'mtlLevel':d.mtlStep!=null?'mtlStep':'mtlSelect';
  const value=control==='mtlSelect'?current.timelineRow:d[control];
  if(keyboard)Array.from(el.querySelectorAll('button')).find(btn=>!btn.disabled&&btn.dataset[control]===value)?.focus({preventScroll:true});
  revealRow(el,selected?.id);
  onView?.(patch);
 });
}
