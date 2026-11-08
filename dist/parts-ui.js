import {icon} from './icons.js';
import {resolveScenePart} from './parts-catalog.js';

const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const categories=['flight','launch','ground','site'];
const get=(catalog,id)=>catalog.byId instanceof Map?catalog.byId.get(id):catalog.byId?.[id];
const number=v=>typeof v==='number'?(Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:4}):'—'):String(v??'—');
const button=(label,attr,active=false)=>'<button type="button" '+attr+' aria-pressed="'+active+'">'+label+'</button>';
function hrefFor(id){const u=new URL(location.href);u.searchParams.set('reference','parts');u.searchParams.set('part',id);return u.pathname+u.search+u.hash;}
function partLink(record,label=record.title,cls=''){return '<a class="'+cls+'" href="'+esc(hrefFor(record.id))+'" data-part-select="'+esc(record.id)+'">'+esc(label)+'</a>';}
function detailsMarkup(record,catalog){
 const facts=(record.facts||[]).filter(f=>f.value!==null&&f.value!==undefined);
 const related=[...new Set([record.parentId,...(record.relatedIds||[])].filter(Boolean))].map(id=>get(catalog,id)).filter(r=>r&&r.id!==record.id);
 const children=catalog.records.filter(r=>r.parentId===record.id);
 const relations=[...new Map([...children,...related].map(r=>[r.id,r])).values()];
 const materials=(record.materials||[]).map(m=>typeof m==='string'?{id:m,name:m}:m);
 return '<div class="parts-info-grid"><section class="parts-info"><h3>About this part</h3><p>'+esc(record.description||record.basis||'A component of the active configured study.')+'</p>'+
  (record.basis?'<div class="parts-basis"><h4>Model and evidence</h4><p>'+esc(record.basis)+'</p></div>':'')+
  (record.wbs?'<button type="button" class="parts-text-link" data-part-mel="'+esc(record.wbs)+'">Find WBS '+esc(record.wbs)+' in the equipment list '+icon('arrow-up-right',13)+'</button>':'')+
  '</section><section class="parts-info"><h3>Configured quantities</h3>'+(facts.length?'<dl class="parts-facts">'+facts.map(f=>'<div><dt>'+esc(f.label)+'</dt><dd>'+esc(number(f.value))+(f.unit?' <small>'+esc(f.unit)+'</small>':'')+'</dd></div>').join(''):'<p class="parts-muted">This component has a visual model; a separate equipment rating has not been allocated.</p>')+'</section></div>'+
  (materials.length?'<section class="parts-info parts-materials"><h3>Materials and finishes</h3><div>'+materials.map(m=>'<button type="button" class="parts-related-link" data-page="materials" data-material-id="'+esc(m.id)+'">'+icon('layers-3',14)+' '+esc(m.name||m.id)+' ↗</button>').join('')+'</div></section>':'')+
  '<section class="parts-info parts-relations"><header><h3>Connected parts</h3><span>'+relations.length+' relationships</span></header>'+(relations.length?'<div class="parts-related-grid">'+relations.map(r=>partLink(r,r.title,'parts-related-link')).join(''):'<p class="parts-muted">Explore the other components in this equipment group using the navigator.</p>')+'</section>'+
  '<section class="parts-info parts-sources"><h3>References and provenance</h3>'+((record.sources||[]).length?'<ul>'+record.sources.filter(s=>/^https?:\/\//.test(s.url||'')).map(s=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.label||s.title||s.url)+' ↗</a></li>').join('')+'</ul>':'<p class="parts-muted">Workbench geometry and allocations for the current configured design.</p>')+'</section>';
}

export function mountPartsNavigator(host,{catalog,hardware,state,view={},onNavigate=()=>{},onState=()=>{},onMEL=()=>{},onCopy=()=>{},onReady=()=>{}}={}){
 let alive=true,viewer=null,loadError=null,ticket=0,viewerState={},chosenAnimation='',pending=null;
 let category=categories.includes(view.partsCategory)?view.partsCategory:'flight',query=view.partsQuery||'';
 const requested=view.partId,first=catalog.records.find(r=>r.category===category);
 let selected=get(catalog,requested)||first||catalog.records[0];
 if(selected)category=selected.category;
 const optionState={mode:'materials',detailMode:'high',context:false,projection:'perspective',axes:false,lighting:'studio',exposureEV:0,...view.partView};
 host.innerHTML='<section class="parts-workspace" aria-label="Parts navigator"><div class="parts-categories" role="group" aria-label="Equipment families">'+catalog.categories.map(c=>'<button type="button" data-parts-filter="'+c.id+'" aria-pressed="'+(category===c.id)+'">'+icon({flight:'satellite',launch:'rocket',ground:'wrench',site:'map-pin'}[c.id]||'box',17)+'<span>'+esc(c.label)+'</span><b>'+catalog.records.filter(r=>r.category===c.id).length+'</b></button>').join('')+'</div>'+
  '<div class="parts-layout"><aside class="parts-browser"><label class="parts-search">Find a part<input type="search" data-parts-query placeholder="Name, WBS or component…" value="'+esc(query)+'" autocomplete="off"></label><div class="parts-browser-meta"><span data-parts-count role="status"></span><button type="button" data-parts-clear hidden>Clear</button></div><nav class="parts-tree" aria-label="Parts in the selected equipment family"></nav></aside>'+
  '<article class="parts-article"><header class="parts-part-heading"><div><div class="parts-breadcrumb" data-part-breadcrumb></div><h2 id="part-title" tabindex="-1"></h2><p data-part-subtitle></p></div><div class="parts-page-actions"><button type="button" data-part-copy title="Copy a link to this part in the current design">'+icon('share-2',14)+' Copy part link</button><button type="button" data-part-mel-list>'+icon('list-checks',14)+' Equipment list</button></div></header>'+
  '<p class="parts-route-note" data-part-route-note hidden></p>'+
  '<section class="panel parts-viewer-panel" id="part-viewer-panel" aria-label="Focused component viewer"><div class="panelhead"><h3>'+icon('box',15)+' Part view</h3><span class="parts-model-badge" data-part-detail-status role="status" aria-live="polite">Detailed workbench geometry</span></div>'+
  '<div class="parts-render-tools"><div class="parts-choice" role="group" aria-label="Part rendering">'+button('Materials','data-part-mode="materials"',true)+button('Solid','data-part-mode="solid"')+button('Wireframe','data-part-mode="wireframe"')+'</div><label class="parts-detail-choice" title="High prioritizes the selected part. Auto adapts detail as you zoom. Low uses the original geometry. All modes stay within a device-appropriate resource budget.">Detail<select data-part-detail aria-label="Part geometry detail"><option value="high">High</option><option value="auto">Auto</option><option value="low">Low</option></select></label><label class="parts-check"><input type="checkbox" data-part-context> Surrounding assembly</label><details class="parts-view-options"><summary>View options</summary><div><label>Projection<select data-part-projection><option value="perspective">Perspective</option><option value="orthographic">Orthographic</option></select></label><label>Lighting<select data-part-lighting><option value="studio">Studio</option><option value="realistic">Realistic</option><option value="auto">Auto</option></select></label><label>Exposure<select data-part-exposure>'+[-2,-1,0,1,2].map(ev=>'<option value="'+ev+'">'+(ev>0?'+':'')+ev+' EV</option>').join('')+'</select></label><label class="parts-check"><input type="checkbox" data-part-axes> Coordinate axes</label><label class="parts-check"><input type="checkbox" data-part-rotate> Turntable</label></div></details></div>'+
  '<div class="parts-viewport" id="part-viewport"><div id="part-scene" class="parts-scene"></div><div class="parts-view-message" data-part-status role="status">Preparing the part view…</div><div class="viewcaption parts-viewcaption"><div data-part-view-title></div><small>PART STUDY · CURRENT CONFIGURATION</small></div></div>'+
  '<div class="parts-camera-bar"><div class="parts-choice" role="group" aria-label="Part camera presets">'+['iso','front','side','top'].map((v,i)=>button(['Isometric','Front','Side','Top'][i],'data-part-camera="'+v+'"',i===0)).join('')+'</div><button type="button" data-part-fit>'+icon('focus',14)+' Fit part</button><span>Drag to rotate · Scroll to zoom · Shift-drag to pan</span></div>'+
  '<div class="parts-animation" data-part-animation-bar hidden><label>Animation<select data-part-animation></select></label><button type="button" data-part-play aria-pressed="false">'+icon('play',14)+' Play</button><label class="parts-progress-label"><span>Position</span><input type="range" data-part-progress min="0" max="100" step="0.1" value="0" aria-label="Animation position"></label><output data-part-progress-value>0%</output></div></section>'+
  '<div data-part-information></div></article></div></section>';
 const find=selector=>host.querySelector(selector),tree=find('.parts-tree'),search=find('[data-parts-query]'),status=find('[data-part-status]');
 const showMessage=(text,error=false)=>{status.textContent=text;status.hidden=!text;status.classList.toggle('parts-view-error',error);};
 function filtered(){const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);return catalog.records.filter(r=>r.category===category&&words.every(w=>[r.title,r.wbs,r.cluster,r.description,r.id].join(' ').toLowerCase().includes(w)));}
 function drawTree(){
  const records=filtered(),clusters=[...new Set(records.map(r=>r.cluster||'Components'))];
  tree.innerHTML=clusters.map(cluster=>'<details class="parts-cluster" open><summary>'+esc(cluster)+'<span>'+records.filter(r=>(r.cluster||'Components')===cluster).length+'</span></summary><ul>'+records.filter(r=>(r.cluster||'Components')===cluster).map(r=>'<li class="'+(r.parentId&&get(catalog,r.parentId)?'parts-child':'')+'">'+partLink(r,(r.wbs?r.wbs+' · ':'')+r.title,'parts-tree-link')+'</li>').join('')+'</ul></details>').join('')||'<p class="parts-empty">No parts match this search.</p>';
  tree.querySelectorAll('[data-part-select]').forEach(link=>{if(link.dataset.partSelect===selected?.id)link.setAttribute('aria-current','page');});
  find('[data-parts-count]').textContent=records.length+' parts';
  find('[data-parts-clear]').hidden=!query;
  host.querySelectorAll('[data-parts-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.partsFilter===category)));
 }
 function syncControls(next={}){
  viewerState={...viewerState,...next};
  host.querySelectorAll('[data-part-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.partMode===(viewerState.mode||optionState.mode))));
  find('[data-part-context]').checked=viewerState.context??optionState.context;
  find('[data-part-detail]').value=viewerState.detailMode||optionState.detailMode;
  const detail=viewerState.detailStats,badge=find('[data-part-detail-status]');
  badge.textContent=detail?.pending?'Refining part…':viewerState.detailMode==='low'?'Standard geometry':detail?.activeHigh?'High detail':detail?.activeMedium?'Detailed geometry':'Current workbench geometry';
  badge.dataset.detailTriangles=String(detail?.triangles||0);badge.dataset.detailDrawCalls=String(detail?.drawCalls||0);
  find('[data-part-projection]').value=viewerState.projection||optionState.projection;
  find('[data-part-lighting]').value=viewerState.lighting||optionState.lighting;
  find('[data-part-exposure]').value=String(viewerState.exposureEV??optionState.exposureEV);
  find('[data-part-axes]').checked=viewerState.axes??optionState.axes;
  find('[data-part-rotate]').checked=!!viewerState.autoRotate;
  const animations=viewerState.animations||[],bar=find('[data-part-animation-bar]'),select=find('[data-part-animation]');
  bar.hidden=!animations.length;
  const signature=animations.map(a=>a.id).join('/');
  if(select.dataset.signature!==signature){select.dataset.signature=signature;select.innerHTML=animations.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.label)+'</option>').join('');chosenAnimation=animations[0]?.id||'';}
  if(!animations.some(a=>a.id===chosenAnimation))chosenAnimation=animations[0]?.id||'';
  if(viewerState.animationId&&animations.some(a=>a.id===viewerState.animationId))chosenAnimation=viewerState.animationId;
  if(chosenAnimation)select.value=chosenAnimation;
  const playing=!!viewerState.playing;
  find('[data-part-play]').innerHTML=icon(playing?'pause':'play',14)+' '+(playing?'Pause':'Play');
  find('[data-part-play]').setAttribute('aria-pressed',String(playing));
  const progress=Math.max(0,Math.min(100,100*(viewerState.progress||0)));
  if(document.activeElement!==find('[data-part-progress]'))find('[data-part-progress]').value=String(progress);
  find('[data-part-progress-value]').textContent=Math.round(progress)+'%';
  status.classList.toggle('parts-context-note',!!viewerState.available&&!!viewerState.contextOnly);
  if(viewerState.available===false||viewerState.contextOnly)showMessage(viewerState.geometryStatus||'No separate geometry is represented for this allocation.');
  else if(viewerState.available)showMessage('');
 }
 function saveOptions(){Object.assign(optionState,{mode:viewerState.mode||optionState.mode,detailMode:viewerState.detailMode||optionState.detailMode,context:!!viewerState.context,projection:viewerState.projection||optionState.projection,axes:!!viewerState.axes,lighting:viewerState.lighting||optionState.lighting,exposureEV:viewerState.exposureEV??optionState.exposureEV});onState({partView:{...optionState}});}
 function paintDetails(){
  if(!selected)return;
  const c=catalog.categories.find(x=>x.id===selected.category);
  find('[data-part-breadcrumb]').textContent=[c?.label,selected.cluster,selected.wbs?'WBS '+selected.wbs:null].filter(Boolean).join(' / ');
  find('#part-title').textContent=selected.title;
  find('[data-part-subtitle]').textContent=[selected.quantity!=null?'Quantity: '+number(selected.quantity)+(selected.quantityUnit?' '+selected.quantityUnit:''):null,selected.subtitle].filter(Boolean).join(' · ');
  find('[data-part-view-title]').textContent=selected.title;
  find('[data-part-information]').innerHTML=detailsMarkup(selected,catalog);
 }
 async function loadSelected(){
  const mine=++ticket;showMessage('Preparing '+selected.title.toLowerCase()+'…');
  status.classList.remove('parts-context-note');host.querySelectorAll('[data-part-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.partCamera==='iso')));
  viewerState={};chosenAnimation='';find('[data-part-animation-bar]').hidden=true;
  try{
   const module=await (pending||(pending=import('./part-viewer.js')));
   if(!alive||mine!==ticket)return;
   if(!viewer)viewer=module.createPartViewer(find('#part-scene'),{onStatus:next=>{if(alive)syncControls(next)},onChange:next=>{if(alive)syncControls(next)},onSelect:selection=>{
    const match=resolveScenePart(catalog,selection);
    if(match&&match.id!==selected.id)selectPart(match.id);
   }});
   viewer.setDetail(optionState.detailMode);viewer.setPart(selected,hardware,state,{...optionState});
   viewer.setMode(optionState.mode);viewer.setContext(optionState.context);viewer.setProjection(optionState.projection);viewer.setAxes(optionState.axes);viewer.setLighting(optionState.lighting);viewer.setExposure(optionState.exposureEV);
   syncControls(viewer.getState());onReady(viewer);
  }catch(error){if(!alive||mine!==ticket)return;loadError=error;showMessage('The 3D view could not start. '+(error.message||''),true);onReady(null);}
 }
 function selectPart(id,{initial=false}={}){
  const record=get(catalog,id);if(!record)return false;
  selected=record;category=record.category;
  if(!initial&&query&&!filtered().some(r=>r.id===id)){search.value=query='';onState({partsQuery:''});}
  chosenAnimation='';
  if(!initial){onNavigate(record.id,record,{initial});find('[data-part-route-note]').hidden=true;}
  paintDetails();drawTree();loadSelected();
  if(initial)onNavigate(record.id,record,{initial});
  if(!initial){find('#part-title').focus({preventScroll:true});find('.parts-part-heading').scrollIntoView({block:'start',behavior:'instant'});}
  return true;
 }
 const click=event=>{
  const link=event.target.closest('[data-part-select]');
  if(link){if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();event.stopPropagation();selectPart(link.dataset.partSelect);return;}
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.page)return;
  if(b.dataset.partsFilter){event.stopPropagation();category=b.dataset.partsFilter;query='';search.value='';onState({partsCategory:category,partsQuery:''});const first=catalog.records.find(r=>r.category===category);if(first)selectPart(first.id);else drawTree();return;}
  if(b.hasAttribute('data-parts-clear')){event.stopPropagation();search.value=query='';drawTree();onState({partsQuery:''});search.focus();return;}
  if(b.hasAttribute('data-part-copy')){event.stopPropagation();onCopy(selected);return;}
  if(b.hasAttribute('data-part-mel')||b.hasAttribute('data-part-mel-list')){event.stopPropagation();onMEL(b.dataset.partMel||selected?.wbs||null,selected);return;}
  if(!viewer)return;
  if(b.dataset.partMode){event.stopPropagation();viewer.setMode(b.dataset.partMode);syncControls(viewer.getState());saveOptions();}
  if(b.dataset.partCamera){event.stopPropagation();viewer.setView(b.dataset.partCamera);host.querySelectorAll('[data-part-camera]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}
  if(b.hasAttribute('data-part-fit')){event.stopPropagation();viewer.fit();}
  if(b.hasAttribute('data-part-play')){event.stopPropagation();viewer.setAnimation(viewerState.playing?false:chosenAnimation);syncControls(viewer.getState());}
 };
 const input=event=>{
  const el=event.target;
  if(el===search){query=search.value;drawTree();onState({partsQuery:query});return;}
  if(el.hasAttribute('data-part-progress')&&viewer){viewer.setAnimation(false);viewer.setProgress(Number(el.value)/100);syncControls(viewer.getState());}
 };
 const change=event=>{
  const el=event.target;if(!viewer)return;
  if(el.hasAttribute('data-part-detail'))viewer.setDetail(el.value);
  else if(el.hasAttribute('data-part-context'))viewer.setContext(el.checked);
  else if(el.hasAttribute('data-part-projection'))viewer.setProjection(el.value);
  else if(el.hasAttribute('data-part-lighting'))viewer.setLighting(el.value);
  else if(el.hasAttribute('data-part-exposure'))viewer.setExposure(Number(el.value));
  else if(el.hasAttribute('data-part-axes'))viewer.setAxes(el.checked);
  else if(el.hasAttribute('data-part-rotate'))viewer.setAutoRotate(el.checked);
  else if(el.hasAttribute('data-part-animation')){chosenAnimation=el.value;viewer.setAnimation(false);viewer.setProgress(0);viewer.setAnimation(chosenAnimation);}
  else return;
  syncControls(viewer.getState());saveOptions();
 };
 host.addEventListener('click',click);host.addEventListener('input',input);host.addEventListener('change',change);
 if(requested&&!get(catalog,requested)){find('[data-part-route-note]').hidden=false;find('[data-part-route-note]').textContent='That part is not present in this configuration. Choose a part from the current equipment below.';}
 if(selected)selectPart(selected.id,{initial:true});else showMessage('No parts are available in this configuration.');
 return {selectPart,getViewer:()=>viewer,getSelected:()=>selected,destroy(){alive=false;ticket++;host.removeEventListener('click',click);host.removeEventListener('input',input);host.removeEventListener('change',change);viewer?.destroy();viewer=null;}};
}

export function mountEquipmentThumbnails(host,catalog,hardware,state){
 let alive=true,worker=null,module=null;
 const hydrate=()=>{worker?.destroy();worker=null;if(alive&&module&&host.isConnected)worker=module.hydratePartThumbnails(host,catalog,hardware,state);};
 import('./part-viewer.js').then(value=>{module=value;hydrate();}).catch(error=>{if(alive)console.warn('Equipment thumbnails unavailable',error);});
 host.addEventListener('parts-thumbnails-change',hydrate);
 return {destroy(){alive=false;worker?.destroy();host.removeEventListener('parts-thumbnails-change',hydrate);}};
}
