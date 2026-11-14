// A history entry is a place in the workbench. The installed design stays shared.
const visitKey='odc-navigation';
const placeKeys=['facilityId','facilityAssetId','facilityView','facilityFilter','partId','partsCategory','partsQuery','partView','phase','domain','chapter','camera','start','t','scope','detail','instruments','event','inspect','tradeKey','referencePreview','referenceCompared','purposePreview','rfFilter','rfPage','commBench','timelineRow','timelineSegment','timelineAll','timelineFollow','teachEvent','teachFolded','bayLens','launchLens','deploymentLens','thermalNode','flightLoop'];
const filters=['data-mel-search','data-mel-sub','data-mel-evidence','data-mech-find','data-mech-sub','data-mech-pose'];
const scrollBoxes=['.fa-list','.parts-tree','#rail','#nav','.mtl-scroll','.mel-scroll','.mech-planes','.rc-table-scroll'];
function visible(selector){return Array.from(document.querySelectorAll(selector)).find(el=>el.getClientRects().length)}
function whereFocused(){
 const el=document.activeElement;
 if(!el||el===document.body)return null;
 if(el.id)return '#'+CSS.escape(el.id);
 for(const name of [...filters,'data-facility-select','data-facility-query','data-facility-filter','data-facility-asset','data-part-select','data-parts-query','data-parts-filter','data-mtl-select','data-mtl-row','data-mtl-jump','data-mtl-step','data-lens','data-domain','data-phase','data-page','data-mount','data-action']){
  if(!el.hasAttribute(name))continue;
  const plane=el.closest('[data-mech-plane]'),region=el.closest('#nav,#lifecycle');
  const prefix=plane?'[data-mech-plane="'+plane.dataset.mechPlane+'"] ':region?'#'+region.id+' ':'';
  return prefix+'['+name+'="'+CSS.escape(el.getAttribute(name))+'"]';
 }
 return null;
}
function presentation(){
 const controls={};
 for(const attr of filters){const el=visible('['+attr+']');if(el)controls[attr]=el.value}
 return {x:window.scrollX,y:window.scrollY,focus:whereFocused(),controls,lens:visible('[data-lens][aria-pressed="true"]')?.dataset.lens,
  opened:Array.from(document.querySelectorAll('[data-station][open]'),el=>el.dataset.station),
  boxes:scrollBoxes.flatMap(selector=>{const el=visible(selector);return el?[[selector,el.scrollLeft,el.scrollTop]]:[]})};
}
function restorePresentation(p){
 if(!p)return;
 for(const [attr,value] of Object.entries(p.controls||{})){
  if(!filters.includes(attr))continue;
  const el=visible('['+attr+']');
  if(el&&el.value!==value){el.value=value;el.dispatchEvent(new Event(el.tagName==='INPUT'?'input':'change'))}
 }
 if(p.lens){const el=visible('[data-lens="'+CSS.escape(p.lens)+'"]');if(el&&el.getAttribute('aria-pressed')!=='true')el.click()}
 for(const id of p.opened||[]){const d=document.querySelector('[data-station="'+CSS.escape(id)+'"]');if(d)d.open=true}
 for(const [selector,x,y] of p.boxes||[]){const el=scrollBoxes.includes(selector)&&visible(selector);if(el){el.scrollLeft=x;el.scrollTop=y}}
 const target=p.focus&&visible(p.focus);
 (target||visible('#nav [aria-current="page"]'))?.focus({preventScroll:true});
 window.scrollTo({left:p.x||0,top:p.y||0,behavior:'instant'});
}
export function workspaceHistory(readView,restoreView,sharedHash,afterRestore=()=>{}){
 const history=window.history;
 if(!history?.pushState)return {sync(){},replaceCurrent(){}};
 history.scrollRestoration='manual';
 const snapshot=()=>{
  const v=readView();return Object.fromEntries([...placeKeys,'reference'].map(k=>[k,v[k]]));
 };
 const key=v=>v.phase+'/'+(v.reference||v.domain)+(v.reference==='parts'?'/'+(v.partId||''):v.reference==='facilities'?'/'+(v.facilityId||'')+'/'+(v.facilityAssetId||''):'');
 const entryId=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 let currentId=history.state?.odcVisit||entryId(),disabled=false;
 const rewrite=(record,url)=>history.replaceState({...history.state,odcVisit:currentId,[visitKey]:record},'',url);
 let route,lastPlace,restoring=false,pendingRestore=null,installedCenter=readView().referenceCenterId||null;
 const placeURL=v=>{
  const url=new URL(location.href);
  for(const k of ['phase','domain','subsystem','reference','row','events','segment','chapter','camera','met','field','preview','bay','lens','play','center','part','family','facility','system','facilityView'])url.searchParams.delete(k);
  const center=readView().referenceCenterId;
  if(center){
   // Startup modifiers have already been consumed. They must not override a
   // newly selected reference when this navigation URL opens in a fresh tab.
   for(const k of ['preset','purpose','build','launcher','site','link','disposal'])url.searchParams.delete(k);
   url.searchParams.set('center',center);
  }
  url.searchParams.set('phase',v.phase);url.searchParams.set('domain',v.domain);
  if(v.reference)url.searchParams.set('reference',v.reference);
  if(v.reference==='parts'){if(v.partId)url.searchParams.set('part',v.partId);if(v.partsCategory)url.searchParams.set('family',v.partsCategory);}
  if(v.reference==='facilities'){if(v.facilityId)url.searchParams.set('facility',v.facilityId);if(v.facilityAssetId)url.searchParams.set('system',v.facilityAssetId);if(v.facilityView)url.searchParams.set('facilityView',v.facilityView);}
  if(['D','E','F'].includes(v.phase))url.searchParams.set('chapter',v.chapter);
  if(url.hash.startsWith('#design='))url.hash=sharedHash();
  return url;
 };
 // Capture button-initiated transitions before their handler updates the clock or phase.
 window.addEventListener('click',()=>{const v=snapshot();if(key(v)===route)lastPlace=v},{capture:true});
 function sync(){
  const v=snapshot(),next=key(v),center=readView().referenceCenterId||null;
  if(!route){route=next;lastPlace=v;installedCenter=center;if(!history.state?.[visitKey])rewrite({place:v},location.href);return}
  if(!restoring&&next!==route){
   const old={place:lastPlace,ui:presentation()};
   rewrite(old,location.href);
   const url=placeURL(v);
   currentId=entryId();history.pushState({odcVisit:currentId,[visitKey]:{place:v}},'',url);
  }else if(!restoring&&center!==installedCenter){
   rewrite({place:v,ui:presentation()},placeURL(v));
  }
  route=next;lastPlace=v;installedCenter=center;
 }
 // Browsers can traverse without a click inside the app. Save the outgoing page
 // in memory here as well, so Forward restores its final scroll and filters.
 const departed=new Map();
 function finishRestore(task,accepted){
  if(pendingRestore!==task)return;
  try{
   const v=snapshot();route=key(v);lastPlace=v;installedCenter=readView().referenceCenterId||null;
   if(accepted){
    // Navigation restores a place while keeping the active design. Keep the
    // reference in the URL aligned with that shared installed configuration.
    if(!disabled)rewrite({place:v,ui:task.record.ui},placeURL(v));
    restorePresentation(task.record.ui);
   }else if(!disabled){
    // The browser has already traversed. A cancelled calculation keeps the
    // visible workspace in that entry rather than pushing a replacement visit.
    try{rewrite({place:v,ui:presentation()},placeURL(v))}
    catch(e){if(e.name!=='SecurityError'&&e.name!=='DataCloneError')throw e;disabled=true}
   }
   // A tab checkpoint includes its URL. Save it after reconciliation, so a
   // reload retains edited inputs rather than rejecting a mismatched entry.
   afterRestore();
  }finally{if(pendingRestore===task){pendingRestore=null;restoring=false}}
 }
 window.addEventListener('popstate',e=>{
  let record=e.state?.[visitKey];
  const previousTask=pendingRestore;
  if(!record?.place){
   pendingRestore=null;restoring=false;previousTask?.controller.abort();return;
  }
  // While preparation is pending retain its saved record, not the still-visible
  // previous workspace. A later traversal can retry the same destination.
  if(previousTask)departed.set(currentId,previousTask.record);
  else departed.set(currentId,{place:snapshot(),ui:presentation()});
  currentId=e.state?.odcVisit||entryId();
  record=departed.get(currentId)||record;departed.delete(currentId);
  const task={record,controller:new AbortController()};pendingRestore=task;restoring=true;
  previousTask?.controller.abort();
  const context={signal:task.controller.signal,isCurrent:()=>pendingRestore===task&&!task.controller.signal.aborted};
  let result;
  try{result=restoreView(record.place,context)}catch(e){finishRestore(task,false);throw e}
  // Existing synchronous restorers retain their immediate presentation update.
  // Async restorers resolve after their guarded commit; false leaves the old view.
  if(result&&typeof result.then==='function'){
   Promise.resolve(result).then(value=>finishRestore(task,value!==false),error=>{
    finishRestore(task,false);
    if(error?.name!=='AbortError')console.error('Workspace history restore failed.',error);
   }).catch(error=>console.error('Workspace history presentation failed.',error));
  }else finishRestore(task,result!==false);
 });
 return {replaceCurrent(){
  if(disabled)return;
  const v=snapshot();
  try{rewrite({place:v,ui:presentation()},placeURL(v));route=key(v);lastPlace=v;installedCenter=readView().referenceCenterId||null}
  catch(e){if(e.name!=='SecurityError'&&e.name!=='DataCloneError')throw e;disabled=true}
 },sync(){
  if(disabled)return;
  try{sync()}catch(e){if(e.name!=='SecurityError'&&e.name!=='DataCloneError')throw e;disabled=true}
 }};
}
