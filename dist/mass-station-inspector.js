// Station IDs join the mass-property table to each two-dimensional projection.
// Resolve pointer hits by distance so SVG paint order cannot hide installed parts.
export function bindStationInspector(root) {
 const make=(tag,name,text)=>{
  const el=document.createElement(tag);
  if(name)el.className=name;
  if(text)el.textContent=text;
  return el;
 };
 const panel=make('div','mech-inspector');
 panel.id='mech-inspection-popup';panel.hidden=true;
 root.append(panel);
 const title=make('strong','mech-inspector-title'),facts=make('span','mech-inspector-facts'),help=make('span','mech-inspector-help');
 const close=make('button','mech-inspector-close','×');
 close.type='button';close.setAttribute('aria-label','Close station list');
 const search=make('input','mech-inspector-filter');
 search.type='search';search.placeholder='Find a component or station';search.setAttribute('aria-label','Filter stations at this point');
 const options=make('div','mech-inspector-options');
 const back=make('button','mech-back-to-plot');back.type='button';
 let origin=null,backFocused=false;
 panel.append(close,title,facts,help,search,options);
 const targets=id=>{const el=root.ownerDocument.getElementById(id);return el&&root.contains(el)?el:null};
 const pointCache=new WeakMap(),roving=new Map();
 let current=null,hoverPoint=null,pinned=false,watch=null,observer=null,focusedBefore=null,tableScroll=0,arrival=null,arrivalTimer;
 function points(svg){
  if(!pointCache.has(svg))pointCache.set(svg,Array.from(svg.querySelectorAll('[data-mount]'),el=>({
   el,x:Number(el.dataset.x),y:Number(el.dataset.y),members:el.dataset.members.split(' ')
  })));
  return pointCache.get(svg);
 }
 function hit(svg,marker,event){
  const entries=points(svg),mat=svg.getScreenCTM();
  if(!entries.length||!mat)return null;
  let closest,minimum=Infinity;
  const reference=marker&&entries.find(p=>p.el===marker);
  const x=reference?reference.x*mat.a+mat.e:event.clientX,y=reference?reference.y*mat.d+mat.f:event.clientY;
  const distance=p=>Math.hypot(p.x*mat.a+mat.e-x,p.y*mat.d+mat.f-y);
  for(const p of entries){const d=distance(p);if(d<minimum){closest=p;minimum=d}}
  if(!reference&&minimum>(event.pointerType==='touch'?18:10)&&!event.target.closest('[data-mount]'))return null;
  closest=reference||closest;
  // Positions less than two screen pixels apart cannot reliably be picked
  // separately. Always offer every underlying station, including CM overlays.
  const near=[closest,...entries.filter(p=>p!==closest&&distance(p)<=minimum+1.75)];
  const ids=[...new Set(near.flatMap(p=>p.members))].filter(id=>targets(id));
  return ids.length?{svg,marker:closest.el,ids}:null;
 }
 function rectAt(selection){
  const m=selection.svg.getScreenCTM();
  if(!m)return null;
  return {x:m.e+m.a*Number(selection.marker.dataset.x),y:m.f+m.d*Number(selection.marker.dataset.y)};
 }
 function place(){
  if(!current||panel.hidden)return;
  const at=rectAt(current);
  if(!at||at.x<0||at.x>innerWidth||at.y<0||at.y>innerHeight){dismiss();return}
  const r=panel.getBoundingClientRect(),gap=12,limit=(v,max)=>Math.max(6,Math.min(v,max-6));
  const x=at.x+gap+r.width<innerWidth?at.x+gap:at.x-gap-r.width;
  const y=at.y+gap+r.height<innerHeight?at.y+gap:at.y-gap-r.height;
  panel.style.left=limit(x,innerWidth-r.width)+'px';
  panel.style.top=limit(y,innerHeight-r.height)+'px';
 }
 function dismiss(){
  current?.marker.classList.remove('is-inspected');
  current?.marker.removeAttribute('aria-expanded');
  current?.marker.removeAttribute('aria-describedby');
  current?.marker.removeAttribute('aria-controls');
  panel.hidden=true;current=null;hoverPoint=null;pinned=false;
  watch?.abort();watch=null;observer?.disconnect();observer=null;
 }
 function watchPanel(){
  if(watch)return;
  watch=new AbortController();const signal=watch.signal;
  document.addEventListener('pointerdown',e=>{
   if(!panel.contains(e.target)&&!e.target.closest?.('[data-mech-plane]'))dismiss();
  },{signal,capture:true});
  document.addEventListener('scroll',e=>{
   if(panel.contains(e.target)||e.target.matches?.('.mel-scroll'))return;
   if(pinned)place();else dismiss();
  },{signal,capture:true,passive:true});
  window.addEventListener('resize',()=>{if(pinned)place();else dismiss()},{signal});
  // The host can be hidden or reused when the visitor switches domains.
  observer=new MutationObserver(()=>{if(!root.isConnected||!root.getClientRects().length)dismiss()});
  observer.observe(root.parentElement,{childList:true,attributes:true,attributeFilter:['hidden']});
 }
 function label(id){return targets(id)?.dataset.mountLabel||''}
 function detail(id){
  const d=targets(id)?.dataset;
  return d?[d.wbs&&'WBS '+d.wbs,d.mountFacts].filter(Boolean).join(' · '):'';
 }
 function filterOptions(){
  const q=search.value.toLowerCase().trim();let visible=0;
  for(const b of options.querySelectorAll('button')){
   b.hidden=!!q&&!b.textContent.toLowerCase().includes(q);
   if(!b.hidden)visible++;
  }
  let empty=options.querySelector('.mech-inspector-empty');
  if(!visible&&!empty)options.append(make('small','mech-inspector-empty','No matching stations.'));
  else if(visible)empty?.remove();
 }
 function show(selection,pick=false){
  if(!selection){dismiss();return}
  current?.marker.classList.remove('is-inspected');
  current?.marker.removeAttribute('aria-expanded');
  current?.marker.removeAttribute('aria-describedby');
  current?.marker.removeAttribute('aria-controls');
  current=selection;pinned=pick;
  const {marker,ids}=selection,n=ids.length;
  marker.classList.add('is-inspected');
  if(pick){marker.setAttribute('aria-expanded','true');marker.setAttribute('aria-controls',panel.id)}
  else marker.setAttribute('aria-describedby',panel.id);
  panel.hidden=false;panel.classList.toggle('is-picker',pick);
  panel.setAttribute('role',pick?'dialog':'tooltip');
  close.hidden=!pick;search.hidden=!pick||n<8;options.hidden=!pick;
  title.textContent=n>1?n+' entries at this point':label(ids[0]);
  if(pick)facts.textContent='Choose the entry to locate in the mass report.';
  else if(n===1)facts.textContent=detail(ids[0]);
  else{
   const names=new Set(ids.map(id=>label(id).split(' · ')[0]));
   facts.textContent=Array.from(names).slice(0,3).join(' · ')+(names.size>3?' · …':'');
  }
  help.hidden=pick;
  help.textContent=n>1?'Select to choose the exact station or center.':'Select to locate this entry in the mass report.';
  if(pick){
   panel.setAttribute('aria-label',title.textContent);
   options.replaceChildren();search.value='';
   for(const id of ids){
    const b=make('button','mech-inspector-option');b.type='button';b.dataset.destination=id;
    b.append(make('strong','',label(id)),make('small','',detail(id)));options.append(b);
   }
  }else panel.removeAttribute('aria-label');
  watchPanel();place();
  if(pick&&!panel.hidden)(search.hidden?options.firstElementChild:search)?.focus({preventScroll:true});
 }
 function markerFor(plane,id){
  const svg=root.querySelector('[data-mech-plane="'+plane+'"]');
  return svg&&points(svg).find(p=>p.members.includes(id))?.el;
 }
 function attachBack(){
  if(!origin)return;
  const dest=targets(origin.id);
  if(!dest){origin=null;back.remove();return}
  (dest.matches('tr')?dest.cells[0]:dest).append(back);
 }
 back.addEventListener('click',()=>{
  const marker=origin&&markerFor(origin.plane,origin.id);if(!marker)return;
  back.remove();origin=null;
  marker.scrollIntoView({behavior:'instant',block:'center',inline:'nearest'});
  marker.focus({preventScroll:true});
 });
 function select(id,selection=current){
  const dest=targets(id);
  if(!dest||!selection)return dismiss();
  origin={plane:selection.svg.dataset.mechPlane,id};
  back.textContent='Back to '+['X–Z','Y–Z','X–Y'][Number(origin.plane)]+' plot';
  attachBack();dismiss();
  const details=dest.closest('details');if(details)details.open=true;
  clearTimeout(arrivalTimer);
  if(arrival)targets(arrival.id)?.classList.remove('mech-arrival');
  arrival={id,at:performance.now()};
  dest.style.removeProperty('animation-delay');
  dest.classList.remove('mech-arrival');void dest.getBoundingClientRect();
  dest.classList.add('mech-arrival');
  dest.focus({preventScroll:true});
  dest.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center',inline:'nearest'});
  arrivalTimer=setTimeout(()=>{const el=targets(id);el?.classList.remove('mech-arrival');el?.style.removeProperty('animation-delay');arrival=null},1900);
 }
 function activate(selection){
  if(!selection)return;
  if(selection.ids.length===1)select(selection.ids[0],selection);else show(selection,true);
 }
 function roam(marker){
  const svg=marker.closest('[data-mech-plane]');
  svg.querySelector('[data-mount][tabindex="0"]')?.setAttribute('tabindex','-1');
  marker.setAttribute('tabindex','0');roving.set(svg.dataset.mechPlane,marker.dataset.mount);
 }
 function returnToPlot(){
  const marker=current?.marker;dismiss();marker?.focus({preventScroll:true});dismiss();
 }
 root.addEventListener('pointermove',e=>{
  if(pinned||e.pointerType==='touch')return;
  const svg=e.target.closest('[data-mech-plane]');
  const s=svg&&hit(svg,null,e);
  if(!s){if(current)dismiss();return}
  hoverPoint={clientX:e.clientX,clientY:e.clientY,pointerType:e.pointerType};
  if(s.marker!==current?.marker||s.ids.join(' ')!==current.ids.join(' '))show(s);
 });
 root.addEventListener('pointerout',e=>{
  if(!pinned&&current&&e.target.closest('[data-mech-plane]')&&!current.svg.contains(e.relatedTarget))dismiss();
 });
 root.addEventListener('focusin',e=>{
  const marker=e.target.closest('[data-mount]');
  if(marker&&!pinned){hoverPoint=null;roam(marker);show(hit(marker.ownerSVGElement,marker))}
  else if(!panel.contains(e.target)&&current)dismiss();
 });
 root.addEventListener('focusout',e=>{
  if(current&&e.relatedTarget&&!panel.contains(e.relatedTarget)&&!e.relatedTarget.closest?.('[data-mount]'))dismiss();
 });
 root.addEventListener('click',e=>{
  const option=e.target.closest('[data-destination]');
  if(option&&panel.contains(option)){select(option.dataset.destination);return}
  if(e.target===close){returnToPlot();return}
  const svg=e.target.closest('[data-mech-plane]');
  if(!svg)return;
  const marker=!e.detail&&e.target.closest('[data-mount]');
  const s=hit(svg,marker,e);
  if(s){roam(s.marker);activate(s)}else dismiss();
 });
 root.addEventListener('keydown',e=>{
  if(current&&e.key==='Escape'){e.preventDefault();if(pinned)returnToPlot();else dismiss();return}
  const marker=e.target.closest('[data-mount]');if(!marker)return;
  const svg=marker.ownerSVGElement;
  if(e.key==='Enter'||e.key===' '){e.preventDefault();activate(hit(svg,marker));return}
  const direction={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[e.key];
  if(!direction&&e.key!=='Home'&&e.key!=='End')return;
  e.preventDefault();
  const entries=points(svg),i=entries.findIndex(p=>p.el===marker);
  const next=e.key==='Home'?0:e.key==='End'?entries.length-1:(i+direction+entries.length)%entries.length;
  entries[next].el.focus({preventScroll:true});
 });
 search.addEventListener('input',filterOptions);
 // The simulation may rebuild this report as it plays. Store semantic keys,
 // not detached graphics. Keep keyboard focus and an open chooser in place.
 function beforeRefresh(){
  const a=document.activeElement;backFocused=a===back;
  tableScroll=root.querySelector('[data-mech-report] .mel-scroll')?.scrollLeft||0;
  focusedBefore=a?.matches('[data-mount]')&&root.contains(a)?[a.ownerSVGElement.dataset.mechPlane,a.dataset.mount]:
   a?.matches('[data-mount-label]')&&root.contains(a)?[null,a.id]:null;
 }
 function afterRefresh(){
  attachBack();
  if(backFocused&&origin)back.focus({preventScroll:true});
  const table=root.querySelector('[data-mech-report] .mel-scroll');
  if(table&&tableScroll)table.scrollLeft=tableScroll;
  for(const [plane,id] of roving){const el=markerFor(plane,id);if(el)roam(el)}
  if(current){
   const marker=markerFor(current.svg.dataset.mechPlane,current.marker.dataset.mount);
   let s=marker&&hit(marker.ownerSVGElement,marker);
   if(hoverPoint&&!pinned){
    // A moving station can leave the pointer during deployment.
    const target=document.elementFromPoint(hoverPoint.clientX,hoverPoint.clientY);
    const svg=target?.closest('[data-mech-plane]');
    s=svg&&root.contains(svg)&&hit(svg,null,{...hoverPoint,target});
   }
   if(!s||(pinned&&s.ids.length===1)){
    const restore=pinned&&panel.contains(document.activeElement),plane=current.svg.dataset.mechPlane;
    dismiss();
    if(restore)(marker||root.querySelector('[data-mech-plane="'+plane+'"] [tabindex="0"]'))?.focus({preventScroll:true});
   }else if(pinned){
    if(s.ids.join(' ')!==current.ids.join(' ')){
     const active=document.activeElement,wasClose=active===close,destination=active.dataset?.destination;
     const query=search.value,scroll=options.scrollTop;
     show(s,true);
     if(!search.hidden){search.value=query;filterOptions()}
     if(wasClose)close.focus({preventScroll:true});
     else if(destination)options.querySelector('[data-destination="'+destination+'"]:not([hidden])')?.focus({preventScroll:true});
     options.scrollTop=scroll;
    }else{
     current=s;marker.classList.add('is-inspected');marker.setAttribute('aria-expanded','true');marker.setAttribute('aria-controls',panel.id);
     for(const b of options.querySelectorAll('button'))b.lastChild.textContent=detail(b.dataset.destination);
     place();
    }
   }else show(s);
  }
  if(arrival){
   const el=targets(arrival.id);
   if(el){el.style.animationDelay=-(performance.now()-arrival.at)+'ms';el.classList.add('mech-arrival')}
  }
  if(focusedBefore){
   const [plane,id]=focusedBefore;
   (plane===null?targets(id):markerFor(plane,id))?.focus({preventScroll:true});
   focusedBefore=null;
  }
 }
 return {beforeRefresh,afterRefresh};
}
