// A history entry is a place in the workbench. The installed design stays shared.
const visitKey='odc-navigation';
const placeKeys=['phase','domain','chapter','camera','start','t','scope','detail','instruments','event','inspect','tradeKey','purposePreview','timelineRow','timelineSegment','timelineAll','timelineFollow','teachEvent','teachFolded','bayLens','launchLens','deploymentLens','thermalNode','flightLoop'];
const filters=['data-mel-search','data-mel-sub','data-mel-evidence','data-mech-find','data-mech-sub','data-mech-pose'];
const scrollBoxes=['#rail','#nav','.mtl-scroll','.mel-scroll','.mech-planes'];
function visible(selector){return Array.from(document.querySelectorAll(selector)).find(el=>el.getClientRects().length)}
function whereFocused(){
 const el=document.activeElement;
 if(!el||el===document.body)return null;
 if(el.id)return '#'+CSS.escape(el.id);
 for(const name of [...filters,'data-mtl-select','data-mtl-row','data-mtl-jump','data-mtl-step','data-lens','data-domain','data-phase','data-page','data-mount','data-action']){
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
export function workspaceHistory(readView,restoreView,sharedHash){
 const history=window.history;
 if(!history?.pushState)return {sync(){}};
 history.scrollRestoration='manual';
 const snapshot=()=>{
  const v=readView();return Object.fromEntries([...placeKeys,'reference'].map(k=>[k,v[k]]));
 };
 const key=v=>v.phase+'/'+(v.reference||v.domain);
 const entryId=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 let currentId=history.state?.odcVisit||entryId(),disabled=false;
 const rewrite=(record,url)=>history.replaceState({...history.state,odcVisit:currentId,[visitKey]:record},'',url);
 let route,lastPlace,restoring=false;
 // Capture button-initiated transitions before their handler updates the clock or phase.
 window.addEventListener('click',()=>{const v=snapshot();if(key(v)===route)lastPlace=v},{capture:true});
 function sync(){
  const v=snapshot(),next=key(v);
  if(!route){route=next;lastPlace=v;if(!history.state?.[visitKey])rewrite({place:v},location.href);return}
  if(!restoring&&next!==route){
   const old={place:lastPlace,ui:presentation()};
   rewrite(old,location.href);
   const url=new URL(location.href);
   for(const k of ['phase','domain','subsystem','reference','row','events','segment','chapter','camera','met','field','preview','bay','lens','play'])url.searchParams.delete(k);
   url.searchParams.set('phase',v.phase);url.searchParams.set('domain',v.domain);
   if(v.reference)url.searchParams.set('reference',v.reference);
   if(['D','E','F'].includes(v.phase))url.searchParams.set('chapter',v.chapter);
   if(url.hash.startsWith('#design='))url.hash=sharedHash();
   currentId=entryId();history.pushState({odcVisit:currentId,[visitKey]:{place:v}},'',url);
  }
  route=next;lastPlace=v;
 }
 // Browsers can traverse without a click inside the app. Save the outgoing page
 // in memory here as well, so Forward restores its final scroll and filters.
 const departed=new Map();
 window.addEventListener('popstate',e=>{
  let record=e.state?.[visitKey];if(!record?.place)return;
  const previous=snapshot();
  departed.set(currentId,{place:previous,ui:presentation()});
  currentId=e.state?.odcVisit;
  record=departed.get(currentId)||record;departed.delete(currentId);
  restoring=true;try{restoreView(record.place);restorePresentation(record.ui)}finally{restoring=false}
 });
 return {sync(){
  if(disabled)return;
  try{sync()}catch(e){if(e.name!=='SecurityError'&&e.name!=='DataCloneError')throw e;disabled=true}
 }};
}
