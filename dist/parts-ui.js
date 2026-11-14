import {icon} from './icons.js';
import {resolveScenePart} from './parts-catalog.js';
import {renderPartElectrical,bindElectricalWorkspace} from './electrical-engineering-ui.js';
import {facilityAssetsForSetting,getFacilityAsset,facilitySources} from './test-facilities.js';
import {facilityDimensionsText} from './facilities-ui.js';

const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const categories=['flight','launch','ground','site'];
const get=(catalog,id)=>catalog.byId instanceof Map?catalog.byId.get(id):catalog.byId?.[id];
const number=v=>typeof v==='number'?(Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:4}):'—'):String(v??'—');
const button=(label,attr,active=false)=>'<button type="button" '+attr+' aria-pressed="'+active+'">'+label+'</button>';
function hrefFor(id){const u=new URL(location.href);u.searchParams.set('reference','parts');u.searchParams.set('part',id);if(u.hash.startsWith('#part-learn-'))u.hash='';return u.pathname+u.search+u.hash;}
function partLink(record,label=record.title,cls=''){return '<a class="'+cls+'" href="'+esc(hrefFor(record.id))+'" data-part-select="'+esc(record.id)+'">'+esc(label)+'</a>';}
export function changePartAnimation(viewer,id){
 // Commit the requested animation before any synchronous onChange callback.
 // Pausing/scrubbing first can let control synchronization restore the old ID.
 viewer?.setAnimation(id);
}
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

export function mountPartsNavigator(host,{catalog,hardware,state,simulation,view={},onNavigate=()=>{},onState=()=>{},onMEL=()=>{},onCopy=()=>{},onFacility=()=>{},onReady=()=>{}}={}){
 let alive=true,viewer=null,loadError=null,ticket=0,viewerState={},chosenAnimation='',pending=null,learningModule=null,verificationModule=null,verificationUI=null,verificationPlan=null,thermalPending=null,thermalWorkspace=null,electricalCleanup=null;
 const learningSearch=new Map(),thermalSettings=new Set();
 let category=categories.includes(view.partsCategory)?view.partsCategory:'flight',query=view.partsQuery||'';
 const requested=view.partId,first=catalog.records.find(r=>r.category===category);
 let selected=get(catalog,requested)||first||catalog.records[0];
 if(selected)category=selected.category;
 const optionState={mode:'materials',detailMode:'high',context:false,setting:view.partView?.context?'installed':'review',scaleMode:'auto',verificationActivity:'',projection:'perspective',axes:false,lighting:'studio',exposureEV:0,thermalScale:'full',...view.partView};
 host.innerHTML='<section class="parts-workspace" aria-label="Parts navigator"><div class="parts-categories" role="group" aria-label="Equipment families">'+catalog.categories.map(c=>'<button type="button" data-parts-filter="'+c.id+'" aria-pressed="'+(category===c.id)+'">'+icon({flight:'satellite',launch:'rocket',ground:'wrench',site:'map-pin'}[c.id]||'box',17)+'<span>'+esc(c.label)+'</span><b>'+catalog.records.filter(r=>r.category===c.id).length+'</b></button>').join('')+'</div>'+
  '<div class="parts-layout"><aside class="parts-browser"><label class="parts-search">Find a part<input type="search" data-parts-query placeholder="Part, function, maker or WBS…" value="'+esc(query)+'" autocomplete="off"></label><div class="parts-browser-meta"><span data-parts-count role="status"></span><button type="button" data-parts-clear hidden>Clear</button></div><nav class="parts-tree" aria-label="Parts in the selected equipment family"></nav></aside>'+
  '<article class="parts-article"><header class="parts-part-heading"><div><div class="parts-breadcrumb" data-part-breadcrumb></div><h2 id="part-title" tabindex="-1"></h2><p data-part-subtitle></p></div><div class="parts-page-actions"><button type="button" data-part-electrical-jump>Electrical interfaces</button><button type="button" data-part-thermal-jump>'+icon('thermometer-sun',14)+' Thermal engineering</button><button type="button" data-part-verification-jump>'+icon('list-checks',14)+' Verification plan</button><button type="button" data-part-section="overview">'+icon('book-open',14)+' Read guide</button><button type="button" data-part-copy title="Copy a link to this part in the current design">'+icon('share-2',14)+' Copy part link</button><button type="button" data-part-mel-list>'+icon('list-checks',14)+' Equipment list</button></div></header>'+
  '<p class="parts-route-note" data-part-route-note hidden></p>'+
  '<section class="panel parts-viewer-panel" id="part-viewer-panel" aria-label="Focused component viewer"><div class="panelhead"><h3>'+icon('box',15)+' Part view</h3><span class="parts-model-badge" data-part-detail-status role="status" aria-live="polite">Detailed workbench geometry</span></div>'+
  '<div class="parts-render-tools"><div class="parts-choice" role="group" aria-label="Part rendering">'+button('Materials','data-part-mode="materials"',true)+button('Solid','data-part-mode="solid"')+button('Wireframe','data-part-mode="wireframe"')+button('Temperature','data-part-mode="thermal" disabled title="Run a case in Thermal engineering below to display its predicted temperatures."')+'</div><label class="parts-detail-choice" title="High prioritizes the selected part. Auto adapts detail as you zoom. Low uses the original geometry. All modes stay within a device-appropriate resource budget.">Detail<select data-part-detail aria-label="Part geometry detail"><option value="high">High</option><option value="auto">Auto</option><option value="low">Low</option></select></label><details class="parts-view-options"><summary>View options</summary><div><label>Projection<select data-part-projection aria-label="Part projection"><option value="perspective">Perspective</option><option value="orthographic">Orthographic</option></select></label><label>Lighting<select data-part-lighting aria-label="Part lighting"><option value="studio">Studio</option><option value="realistic">Realistic</option><option value="auto">Auto</option></select></label><label>Exposure<select data-part-exposure aria-label="Part exposure">'+[-2,-1,0,1,2].map(ev=>'<option value="'+ev+'">'+(ev>0?'+':'')+ev+' EV</option>').join('')+'</select></label><label data-part-thermal-scale-control hidden>Temperature scale<select data-part-thermal-scale aria-label="Part temperature color range"><option value="full">180–380 K · full</option><option value="working">245–305 K · working</option></select></label><label class="parts-check"><input type="checkbox" data-part-axes> Coordinate axes</label><label class="parts-check"><input type="checkbox" data-part-rotate> Turntable</label></div></details></div>'+
  '<div class="parts-setting-tools"><span class="parts-tool-label">Setting</span><div class="parts-choice" role="group" aria-label="Part setting" data-part-settings></div><label class="parts-test-select">Verification setting<select data-part-test-setting aria-label="Verification setting"><option value="">Choose a setting…</option></select></label><label class="parts-scale-select">For scale<select data-part-scale aria-label="Scale reference"><option value="auto">Automatic</option><option value="none">None</option><option value="banana">Banana · 18 cm</option><option value="ruler">Ruler · 30 cm</option><option value="person">Person · 1.75 m</option><option value="container">Container · 12.19 m</option></select></label></div>'+
  '<div class="part-facility-picker" data-part-facility-picker hidden><div class="part-facility-select-row"><label>Documented test facility & system<select data-part-facility aria-label="Test facility and system"></select></label><button type="button" data-part-facility-open>Facility, capabilities & map ↗</button></div><div class="part-facility-fit" data-part-facility-fit role="status"></div></div>'+
  '<div class="parts-viewport" id="part-viewport"><div id="part-scene" class="parts-scene"></div><div class="parts-view-message" data-part-status role="status">Preparing the part view…</div><div class="viewcaption parts-viewcaption"><div data-part-view-title></div><small>PART STUDY · CURRENT CONFIGURATION</small></div></div>'+
  '<div class="parts-camera-bar"><div class="parts-choice" role="group" aria-label="Part camera presets">'+['iso','front','side','top'].map((v,i)=>button(['Isometric','Front','Side','Top'][i],'data-part-camera="'+v+'"',i===0)).join('')+'</div><button type="button" data-part-fit>'+icon('focus',14)+' Fit part</button><span>Drag to rotate · Scroll to zoom · Shift-drag to pan</span></div>'+
  '<div class="parts-animation" data-part-animation-bar hidden><label>Animation<select data-part-animation aria-label="Part animation"></select></label><button type="button" data-part-play aria-pressed="false">'+icon('play',14)+' Play</button><label class="parts-progress-label"><span>Position</span><input type="range" data-part-progress min="0" max="100" step="0.1" value="0" aria-label="Animation position"></label><output data-part-progress-value>0%</output></div><div class="parts-setting-caption" data-part-setting-caption role="status"></div></section>'+
  '<div data-part-electrical tabindex="-1" aria-label="Electrical engineering for this item"></div><div data-part-thermal tabindex="-1" aria-label="Thermal engineering for this item"></div><div data-part-verification tabindex="-1"></div><div data-part-information></div></article></div></section>';
 const find=selector=>host.querySelector(selector),tree=find('.parts-tree'),search=find('[data-parts-query]'),status=find('[data-part-status]');
 const showMessage=(text,error=false)=>{status.textContent=text;status.hidden=!text;status.classList.toggle('parts-view-error',error);};
 function filtered(){const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);return catalog.records.filter(r=>r.category===category&&words.every(w=>[r.title,r.wbs,r.cluster,r.description,r.id,learningSearch.get(r.id)||''].join(' ').toLowerCase().includes(w)));}
 function drawTree(){
  const records=filtered(),clusters=[...new Set(records.map(r=>r.cluster||'Components'))];
  tree.innerHTML=clusters.map(cluster=>'<details class="parts-cluster" open><summary>'+esc(cluster)+'<span>'+records.filter(r=>(r.cluster||'Components')===cluster).length+'</span></summary><ul>'+records.filter(r=>(r.cluster||'Components')===cluster).map(r=>'<li class="'+(r.parentId&&get(catalog,r.parentId)?'parts-child':'')+'">'+partLink(r,(r.wbs?r.wbs+' · ':'')+r.title,'parts-tree-link')+'</li>').join('')+'</ul></details>').join('')||'<p class="parts-empty">No parts match this search.</p>';
  tree.querySelectorAll('[data-part-select]').forEach(link=>{if(link.dataset.partSelect===selected?.id)link.setAttribute('aria-current','page');});
  find('[data-parts-count]').textContent=records.length+' parts';
  find('[data-parts-clear]').hidden=!query;
  host.querySelectorAll('[data-parts-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.partsFilter===category)));
 }
 function syncFacility(setting){
  const picker=find('[data-part-facility-picker]'),select=find('[data-part-facility]'),detail=find('[data-part-facility-fit]'),candidates=facilityAssetsForSetting(setting);
  const chosen=getFacilityAsset(viewerState.facility?.assetId||viewerState.facilityAssetId),fit=viewerState.facility?.fit;
  picker.hidden=!candidates.length||!chosen||chosen.kind!==setting;if(picker.hidden)return;
  const signature=candidates.map(a=>a.id).join('|');
  if(select.dataset.catalog!==signature){select.dataset.catalog=signature;const groups=[...new Set(candidates.map(a=>a.facilityId))];select.innerHTML=groups.map(id=>{const list=candidates.filter(a=>a.facilityId===id);return '<optgroup label="'+esc(list[0].facilityName+' · '+list[0].facility.country)+'">'+list.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+' · '+esc(facilityDimensionsText(a))+'</option>').join('')+'</optgroup>';}).join('');}
  select.value=chosen.id;
  const current=chosen.id+'/'+(fit?.status||'unassessed')+'/'+JSON.stringify(fit?.sizeM||[])+'/'+fit?.massKg;
  if(detail.dataset.signature===current)return;detail.dataset.signature=current;detail.dataset.fit=fit?.status||'unassessed';
  const citations=facilitySources(chosen.facility,chosen.geometry.sourceIds).map(source=>'<a href="'+esc(source.url)+'" target="_blank" rel="noopener noreferrer">'+esc(source.title)+' ↗</a>').join(' · ');
  detail.innerHTML='<strong>'+esc(fit?.label||'Usable-envelope fit is not established')+'</strong><div>'+esc(chosen.facilityName)+' · '+esc(facilityDimensionsText(chosen))+' · fixed facility dimensions.</div><details><summary>Fit screen & dimension evidence</summary><ul>'+(fit?.checks||[]).map(c=>'<li>'+esc(c.label)+': '+esc(c.status.replaceAll('-',' '))+(c.unit?' ('+esc(c.unit)+')':'')+'</li>').join('')+(fit?.notes||[]).map(note=>'<li>'+esc(note)+'</li>').join('')+'</ul><p data-part-facility-evidence>'+citations+'</p><p>'+esc(chosen.geometry.notes)+'</p>'+(['thermal-vacuum','thermal-cycle'].includes(setting)?'<p>The thermal prediction keeps its allocated article targets and boundary conditions. This equipment comparison does not change the thermal model or establish campaign reachability.</p>':'')+'</details>';
 }
 function syncControls(next={}){
  viewerState={...viewerState,...next};
  host.querySelectorAll('[data-part-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.partMode===(viewerState.mode||optionState.mode))));
  const thermalButton=find('[data-part-mode="thermal"]');thermalButton.disabled=viewerState.available!==true||!viewerState.thermal?.available;
  thermalButton.title=thermalButton.disabled?'Run a case in Thermal engineering below to display predicted temperatures on modeled geometry.':'Display the active run. Colors show solved lumped nodes; gray geometry is not resolved.';
  find('[data-part-thermal-scale-control]').hidden=!viewerState.thermal?.available;find('[data-part-thermal-scale]').value=viewerState.thermalScale||optionState.thermalScale;
  const setting=viewerState.setting||optionState.setting;
  syncFacility(setting);
  find('[data-part-settings]').querySelectorAll('[data-part-setting]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.partSetting===setting)));
  find('[data-part-test-setting]').value=['studio','installed','review'].includes(setting)?'':setting;
  find('[data-part-scale]').value=viewerState.scaleMode||optionState.scaleMode;
  find('[data-part-scale]').disabled=['studio','installed'].includes(setting);
  const refs=viewerState.scaleReferences||[],dims=viewerState.modeledSizeM||[];
  find('[data-part-setting-caption]').innerHTML=verificationModule?'<strong>'+esc(verificationModule.verificationSettings[setting]?.label||setting)+'</strong><span>'+esc(verificationModule.verificationSettings[setting]?.description||'')+'</span>'+(viewerState.available&&dims.length?'<small>Modeled group: '+dims.map(n=>number(Number(n.toPrecision(3)))).join(' × ')+' m'+(refs.length?' · Scale: '+refs.map(r=>esc(r.name)).join('; '):'')+'</small>':''):'';
  find('[data-part-detail]').value=viewerState.detailMode||optionState.detailMode;
  const electricalRehearsal=find('[data-electrical-rehearse]');if(electricalRehearsal){electricalRehearsal.disabled=viewerState.available!==true||!viewerState.animations?.some(a=>a.id==='electrical');electricalRehearsal.title=electricalRehearsal.disabled?'Select a harness or connected assembly with an electrical rehearsal.':'Rehearse continuity and signal paths on the modeled interface.';}
  const detail=viewerState.detailStats,badge=find('[data-part-detail-status]');
  badge.textContent=detail?.pending?'Refining part…':viewerState.detailMode==='low'?'Standard geometry':detail?.activeHigh?'High detail':detail?.activeMedium?'Detailed geometry':'Current workbench geometry';
  badge.dataset.detailTriangles=String(detail?.triangles||0);badge.dataset.detailDrawCalls=String(detail?.drawCalls||0);
  find('[data-part-projection]').value=viewerState.projection||optionState.projection;
  find('[data-part-lighting]').value=viewerState.lighting||optionState.lighting;
  find('[data-part-exposure]').value=String(viewerState.exposureEV??optionState.exposureEV);
  find('[data-part-axes]').checked=viewerState.axes??optionState.axes;
  find('[data-part-rotate]').checked=!!viewerState.autoRotate;
  const animations=viewerState.animations||[],bar=find('[data-part-animation-bar]'),select=find('[data-part-animation]');
  bar.hidden=viewerState.available===false||!animations.length;
  host.querySelectorAll('[data-verification-animation]').forEach(b=>{const id=b.dataset.verificationAnimation,ready=viewerState.available===true&&(id==='mate'?!viewerState.contextOnly:id==='fixture'?['vibration','load-frame','deployment'].includes(b.dataset.verificationSetting):animations.some(a=>a.id===id));b.disabled=!ready;if(!ready)b.title=!viewerState.available||viewerState.contextOnly?viewerState.geometryStatus||'This allocation has no independent geometry.':'This allocation has no independent animation in the current model.';else b.removeAttribute('title');});
  host.querySelectorAll('[data-part-verification] [data-part-setting]').forEach(b=>{b.disabled=viewerState.available===false;});
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
 function saveOptions(){Object.assign(optionState,{facilityAssetId:viewerState.facility?.assetId||viewerState.facilityAssetId||optionState.facilityAssetId||null,mode:viewerState.mode||optionState.mode,detailMode:viewerState.detailMode||optionState.detailMode,context:!!viewerState.context,setting:viewerState.setting||optionState.setting,scaleMode:viewerState.scaleMode||optionState.scaleMode,projection:viewerState.projection||optionState.projection,axes:!!viewerState.axes,lighting:viewerState.lighting||optionState.lighting,exposureEV:viewerState.exposureEV??optionState.exposureEV,thermalScale:viewerState.thermalScale||optionState.thermalScale});onState({partView:{...optionState}});}
 function paintVerification(){
  if(!selected||!verificationModule||!verificationUI)return;
  verificationPlan=verificationModule.partVerification(selected,catalog,hardware);
  if(thermalSettings.size)verificationPlan={...verificationPlan,settings:[...new Set([...verificationPlan.settings,...thermalSettings])]};
  const choices=verificationPlan.settings||['studio','installed','review'];
  if(!choices.includes(optionState.setting))optionState.setting=verificationPlan.defaultSetting||'review';
  if(!verificationPlan.activities.some(a=>a.id===optionState.verificationActivity))optionState.verificationActivity=verificationPlan.activities[0]?.id||'';
  find('[data-part-settings]').innerHTML=choices.filter(id=>['studio','installed','review'].includes(id)).map(id=>button(esc(verificationModule.verificationSettings[id]?.label||id),'data-part-setting="'+esc(id)+'"',id===optionState.setting)).join('');
  const testChoices=choices.filter(id=>!['studio','installed','review'].includes(id));
  find('[data-part-test-setting]').innerHTML='<option value="">Choose a setting…</option>'+testChoices.map(id=>'<option value="'+esc(id)+'">'+esc(verificationModule.verificationSettings[id]?.label||id)+'</option>').join('');
  find('[data-part-test-setting]').disabled=!testChoices.length;
  find('[data-part-verification]').innerHTML=verificationUI.renderPartVerification(selected,catalog,hardware,{activityId:optionState.verificationActivity,partLink});
 }
 function paintDetails(){
  if(!selected)return;
  const c=catalog.categories.find(x=>x.id===selected.category);
  find('[data-part-breadcrumb]').textContent=[c?.label,selected.cluster,selected.wbs?'WBS '+selected.wbs:null].filter(Boolean).join(' / ');
  find('#part-title').textContent=selected.title;
  find('[data-part-subtitle]').textContent=[selected.quantity!=null?'Quantity: '+number(selected.quantity)+(selected.quantityUnit?' '+selected.quantityUnit:''):null,selected.subtitle].filter(Boolean).join(' · ');
  find('[data-part-view-title]').textContent=selected.title;
  find('[data-part-information]').innerHTML=learningModule?.renderPartLearning(selected,catalog,hardware,{partLink})||detailsMarkup(selected,catalog);
  electricalCleanup?.();const electrical=find('[data-part-electrical]');electrical.innerHTML=renderPartElectrical(hardware,selected);electrical.hidden=!electrical.innerHTML;find('[data-part-electrical-jump]').hidden=electrical.hidden;
  electricalCleanup=bindElectricalWorkspace(electrical,{hardware,onOpenPart:id=>selectPart(id),onRehearse:()=>{if(!viewer)return;if(verificationPlan?.settings.includes('electrical-bench'))viewer.setSetting('electrical-bench');viewer.setAnimation('electrical');syncControls(viewer.getState());saveOptions();find('#part-viewer-panel').scrollIntoView({block:'start',behavior:'instant'});}});
  paintVerification();
 }
 function loadThermalWorkspace(mine){
  const target=find('[data-part-thermal]');target.innerHTML='<p class="parts-muted">Preparing thermal requirements and analysis…</p>';
  (thermalPending||(thermalPending=import('./thermal-engineering-ui.js'))).then(module=>{
   if(!alive||mine!==ticket)return;
   thermalWorkspace?.destroy();
   thermalWorkspace=module.mountThermalEngineering(target,{hardware,catalog,record:selected,phase:view.phase||'A',simulation,compact:true,
    onRun:(run,{setting}={})=>{if(!alive||mine!==ticket||!viewer)return;setting=setting||(run?.caseKind==='orbital-transient'?'installed':null);if(run&&['thermal-vacuum','thermal-cycle'].includes(setting)&&!verificationPlan?.settings.includes(setting)){thermalSettings.add(setting);paintVerification();}if(setting&&verificationPlan?.settings.includes(setting))viewer.setSetting(setting);viewer.setThermalRun(run);if(run)viewer.setMode('thermal');syncControls(viewer.getState());saveOptions();},
    onFrame:(frame,run,progress)=>{if(alive&&mine===ticket&&viewer)viewer.setThermalFrame(frame,{run,progress});},
    onOpenPart:id=>{if(alive&&mine===ticket)selectPart(typeof id==='string'?id:id?.id);}
   });
   selectThermalSetting(viewer?.getState().setting);
  }).catch(error=>{thermalPending=null;if(alive&&mine===ticket){target.innerHTML='<p class="parts-route-note">The thermal workspace could not open. '+esc(error.message||'Reload the workspace to retry.')+'</p>';}});
 }
 function selectThermalSetting(setting){if(['thermal-vacuum','thermal-cycle'].includes(setting))thermalWorkspace?.selectCaseForSetting?.(setting);}
 async function loadSelected(){
  const mine=++ticket;showMessage('Preparing '+selected.title.toLowerCase()+'…');
  thermalWorkspace?.destroy();thermalWorkspace=null;viewer?.setThermalRun(null);
  status.classList.remove('parts-context-note');host.querySelectorAll('[data-part-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.partCamera==='iso')));
  viewerState={};chosenAnimation='';find('[data-part-animation-bar]').hidden=true;
  try{
   const [module,data,ui]=await (pending||(pending=Promise.all([import('./part-viewer.js'),import('./part-verification.js'),import('./part-verification-ui.js')])));
   if(!alive||mine!==ticket)return;
   verificationModule=data;verificationUI=ui;paintVerification();
   if(!viewer)viewer=module.createPartViewer(find('#part-scene'),{onStatus:next=>{if(alive)syncControls(next)},onChange:next=>{if(alive)syncControls(next)},onHoldPlayback:()=>thermalWorkspace?.holdPlayback?.()||(()=>{}),onSelect:selection=>{
    const match=resolveScenePart(catalog,selection);
    if(match&&match.id!==selected.id)selectPart(match.id);
   }});
   viewer.setDetail(optionState.detailMode);viewer.setPart(selected,hardware,state,{...optionState,parentRecord:get(catalog,selected.parentId)});
   viewer.setMode(optionState.mode);viewer.setProjection(optionState.projection);viewer.setAxes(optionState.axes);viewer.setLighting(optionState.lighting);viewer.setExposure(optionState.exposureEV);viewer.setThermalScale(optionState.thermalScale);
   syncControls(viewer.getState());onReady(viewer);loadThermalWorkspace(mine);
  }catch(error){if(!alive||mine!==ticket)return;loadError=error;showMessage('The 3D view could not start. '+(error.message||''),true);onReady(null);loadThermalWorkspace(mine);}
 }
 function selectPart(id,{initial=false}={}){
  const record=get(catalog,id);if(!record)return false;
  selected=record;category=record.category;thermalSettings.clear();
  if(!initial&&query&&!filtered().some(r=>r.id===id)){search.value=query='';onState({partsQuery:''});}
  chosenAnimation='';
  if(!initial){onNavigate(record.id,record,{initial});find('[data-part-route-note]').hidden=true;}
  paintDetails();drawTree();loadSelected();
  if(initial)onNavigate(record.id,record,{initial});
  if(!initial){find('#part-title').focus({preventScroll:true});find('.parts-part-heading').scrollIntoView({block:'start',behavior:'instant'});}
  return true;
 }
 const click=event=>{
  const sectionLink=event.target.closest('[data-part-section]');
  if(sectionLink){if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();event.stopPropagation();const target=find('#part-learn-'+String(sectionLink.dataset.partSection).replace(/[^a-z0-9_-]/gi,'-'));if(target){target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});}return;}
  const link=event.target.closest('[data-part-select]');
  if(link){if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();event.stopPropagation();selectPart(link.dataset.partSelect);return;}
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.page)return;
  if(b.dataset.partsFilter){event.stopPropagation();category=b.dataset.partsFilter;query='';search.value='';onState({partsCategory:category,partsQuery:''});const first=catalog.records.find(r=>r.category===category);if(first)selectPart(first.id);else drawTree();return;}
  if(b.hasAttribute('data-parts-clear')){event.stopPropagation();search.value=query='';drawTree();onState({partsQuery:''});search.focus();return;}
  if(b.hasAttribute('data-part-facility-open')){event.stopPropagation();const a=getFacilityAsset(viewerState.facility?.assetId||viewerState.facilityAssetId);if(a)onFacility(a.facilityId,a.id);return;}
  if(b.hasAttribute('data-part-copy')){event.stopPropagation();onCopy(selected);return;}
  if(b.hasAttribute('data-part-electrical-jump')){event.stopPropagation();find('[data-part-electrical]').focus({preventScroll:true});find('[data-part-electrical]').scrollIntoView({block:'start',behavior:'instant'});return;}
  if(b.hasAttribute('data-part-thermal-jump')){event.stopPropagation();if(b.dataset.thermalSetting)selectThermalSetting(b.dataset.thermalSetting);find('[data-part-thermal]').focus({preventScroll:true});find('[data-part-thermal]').scrollIntoView({block:'start',behavior:'instant'});return;}
  if(b.hasAttribute('data-part-verification-jump')){event.stopPropagation();find('[data-part-verification]').focus({preventScroll:true});find('[data-part-verification]').scrollIntoView({block:'start',behavior:'instant'});return;}
  if(b.hasAttribute('data-part-mel')||b.hasAttribute('data-part-mel-list')){event.stopPropagation();onMEL(b.dataset.partMel||selected?.wbs||null,selected);return;}
  if(!viewer)return;
  if(b.dataset.verificationActivity){event.stopPropagation();const activity=verificationPlan?.activities.find(a=>a.id===b.dataset.verificationActivity);if(!activity)return;optionState.verificationActivity=activity.id;optionState.setting=activity.setting;viewer.setSetting(activity.setting);selectThermalSetting(activity.setting);paintVerification();syncControls(viewer.getState());saveOptions();find('.pv-activity-focus')?.focus({preventScroll:true});find('.pv-activity-focus')?.scrollIntoView({block:'start',behavior:'instant'});return;}
  if(b.dataset.partSetting){event.stopPropagation();if(!verificationPlan?.settings.includes(b.dataset.partSetting))return;viewer.setSetting(b.dataset.partSetting);selectThermalSetting(b.dataset.partSetting);syncControls(viewer.getState());saveOptions();if(b.closest('[data-part-verification]'))find('#part-viewer-panel').scrollIntoView({block:'start',behavior:'instant'});return;}
  if(b.dataset.verificationAnimation){event.stopPropagation();const id=b.dataset.verificationAnimation,setting=b.dataset.verificationSetting;if(id==='mate')viewer.setSetting('fit-check');else if(setting&&verificationPlan?.settings.includes(setting))viewer.setSetting(setting);viewer.setAnimation(id);syncControls(viewer.getState());saveOptions();find('#part-viewer-panel').scrollIntoView({block:'start',behavior:'instant'});return;}
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
  if(el.hasAttribute('data-part-facility')){optionState.facilityAssetId=el.value;viewer.setFacility?.(el.value);}
  else if(el.hasAttribute('data-part-detail'))viewer.setDetail(el.value);
  else if(el.hasAttribute('data-part-test-setting')){if(!el.value)return;viewer.setSetting(el.value);selectThermalSetting(el.value);}
  else if(el.hasAttribute('data-part-scale'))viewer.setScale(el.value);
  else if(el.hasAttribute('data-part-projection'))viewer.setProjection(el.value);
  else if(el.hasAttribute('data-part-lighting'))viewer.setLighting(el.value);
  else if(el.hasAttribute('data-part-exposure'))viewer.setExposure(Number(el.value));
  else if(el.hasAttribute('data-part-thermal-scale'))viewer.setThermalScale(el.value);
  else if(el.hasAttribute('data-part-axes'))viewer.setAxes(el.checked);
  else if(el.hasAttribute('data-part-rotate'))viewer.setAutoRotate(el.checked);
  else if(el.hasAttribute('data-part-animation'))changePartAnimation(viewer,el.value);
  else return;
  syncControls(viewer.getState());saveOptions();
 };
 host.addEventListener('click',click);host.addEventListener('input',input);host.addEventListener('change',change);
 import('./parts-learning.js').then(module=>{if(!alive)return;learningModule=module;for(const record of catalog.records)learningSearch.set(record.id,module.partKnowledgeSearchText(record,catalog,hardware).toLowerCase());paintDetails();if(query)drawTree();}).catch(error=>{if(alive)console.warn('Part learning articles unavailable',error)});
 if(requested&&!get(catalog,requested)){find('[data-part-route-note]').hidden=false;find('[data-part-route-note]').textContent='That part is not present in this configuration. Choose a part from the current equipment below.';}
 if(selected)selectPart(selected.id,{initial:true});else showMessage('No parts are available in this configuration.');
 return {selectPart,getViewer:()=>viewer,getSelected:()=>selected,getThermalWorkspace:()=>thermalWorkspace,destroy(){alive=false;ticket++;host.removeEventListener('click',click);host.removeEventListener('input',input);host.removeEventListener('change',change);electricalCleanup?.();thermalWorkspace?.destroy();thermalWorkspace=null;viewer?.destroy();viewer=null;}};
}

export function mountEquipmentThumbnails(host,catalog,hardware,state){
 let alive=true,worker=null,module=null;
 const hydrate=()=>{worker?.destroy();worker=null;if(alive&&module&&host.isConnected)worker=module.hydratePartThumbnails(host,catalog,hardware,state);};
 import('./part-viewer.js').then(value=>{module=value;hydrate();}).catch(error=>{if(alive)console.warn('Equipment thumbnails unavailable',error);});
 host.addEventListener('parts-thumbnails-change',hydrate);
 return {destroy(){alive=false;worker?.destroy();host.removeEventListener('parts-thumbnails-change',hydrate);}};
}
