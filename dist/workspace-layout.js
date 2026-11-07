// Panel sizes belong to this browser, not to the spacecraft design or mission clock.
const storageKey='odc-workspace-layout-v1';
const installed=new WeakMap();
const limits={viewHeight:[220,1600],diagramHeight:[180,1200],railWidth:[176,360],guideFraction:[.12,.65]};
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export function normalizeWorkspaceLayout(value){
 const result={};
 if(!value||typeof value!=='object'||Array.isArray(value))return result;
 for(const [key,[min,max]] of Object.entries(limits)){
  if(typeof value[key]!=='number'||!Number.isFinite(value[key]))continue;
  result[key]=clamp(key==='guideFraction'?value[key]:Math.round(value[key]),min,max);
 }
 return result;
}

export function installWorkspaceLayout({document:doc=globalThis.document,window:win=globalThis.window,onMessage}={}){
 if(installed.has(doc))return installed.get(doc);
 const body=doc.body,primary=doc.getElementById('primary'),viewer=doc.getElementById('viewer');
 const viewport=doc.getElementById('viewport'),rail=doc.getElementById('rail'),diagramHost=doc.getElementById('diagram-host');
 if(!body||!primary||!viewer||!viewport)return {refresh(){},reset(){},destroy(){}};
 let layout={};
 try{layout=normalizeWorkspaceLayout(JSON.parse(win.localStorage.getItem(storageKey)))}catch{}
 const removers=[],handles=new Set(),configs=new WeakMap(),figures=new WeakSet();
 let frame=0,drag=null,alive=true;
 const listen=(target,type,callback,options)=>{target.addEventListener(type,callback,options);removers.push(()=>target.removeEventListener(type,callback,options))};
 const status=doc.createElement('div');status.className='sr';status.setAttribute('role','status');status.setAttribute('aria-live','polite');body.append(status);
 body.dataset.workspaceLayout='ready';
 const px=(element,name,value)=>{const next=Math.round(value)+'px';if(element.style.getPropertyValue(name)!==next)element.style.setProperty(name,next)};
 const horizontal=()=>win.matchMedia('(min-width:721px)').matches;
 const desktopRail=()=>win.matchMedia('(min-width:971px)').matches;
 const splitSpace=()=>{
  const style=win.getComputedStyle(primary),gap=parseFloat(style.columnGap)||0;
  return Math.max(0,primary.clientWidth-gap);
 };
 const guideBounds=space=>{
  const min=Math.min(Math.max(220,space*limits.guideFraction[0]),space*.5);
  return [min,Math.max(min,Math.min(space*limits.guideFraction[1],space-280))];
 };
 function save(){
  try{if(Object.keys(layout).length)win.localStorage.setItem(storageKey,JSON.stringify(layout));else win.localStorage.removeItem(storageKey)}catch{}
 }
 function announce(message){status.textContent=message;onMessage?.(message)}
 function setSize(key,value,commit=false){
  if(value===null)delete layout[key];else layout={...layout,...normalizeWorkspaceLayout({[key]:value})};
  apply();if(commit)save();
 }
 function makeHandle(className,label,config){
  const handle=doc.createElement('div');handle.className='workspace-resizer '+className;
  handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-label',label);
  handle.setAttribute('aria-orientation',config.axis==='y'?'horizontal':'vertical');
  handle.setAttribute('aria-controls',config.controls);
  handle.title=label+'. Drag or use arrow keys. Shift + arrow resizes faster. Double-click or Home restores the default.';
  handle.innerHTML='<span class="workspace-grip" aria-hidden="true"></span>';
  handles.add(handle);configs.set(handle,{...config,label});return handle;
 }
 function makeBar(label,config){
  const bar=doc.createElement('div');bar.className='workspace-resize-bar';
  const handle=makeHandle('workspace-height-resizer',label,config);
  const hint=doc.createElement('span');hint.className='workspace-resize-hint';hint.textContent='Drag to resize';hint.setAttribute('aria-hidden','true');handle.append(hint);
  const reset=doc.createElement('button');reset.type='button';reset.className='workspace-layout-reset';reset.textContent='Reset layout';reset.title='Restore default panel sizes';
  bar.append(handle,reset);return bar;
 }
 function heightConfig(key,element,controls){return {
  axis:'y',controls,key,read:()=>element.getBoundingClientRect().height,
  bounds:()=>limits[key],write:value=>setSize(key,value),restore:()=>setSize(key,null)
 }}
 const heightBar=makeBar('Resize 3D view height',heightConfig('viewHeight',viewport,'viewport'));
 viewport.after(heightBar);
 const splitHandle=makeHandle('workspace-column-resizer','Resize visualization width',{
  axis:'x',controls:'viewer guide-column',key:'guideFraction',read:()=>viewer.getBoundingClientRect().width,
  bounds:()=>{const space=splitSpace(),[min,max]=guideBounds(space);return [space-max,space-min]},
  write:value=>{const space=splitSpace();if(space>0)setSize('guideFraction',(space-value)/space)},restore:()=>setSize('guideFraction',null)
 });
 primary.append(splitHandle);
 let railHandle=null;
 if(rail){
  railHandle=makeHandle('workspace-rail-resizer','Resize navigation width',{
   axis:'x',controls:'rail',key:'railWidth',read:()=>rail.getBoundingClientRect().width,
   bounds:()=>limits.railWidth,write:value=>setSize('railWidth',value),restore:()=>setSize('railWidth',null)
  });rail.append(railHandle);
 }
 function refreshDiagrams(){
  if(!diagramHost)return;
  for(const handle of handles)if(!handle.isConnected)handles.delete(handle);
  for(const figure of diagramHost.querySelectorAll('.sd-sheet > .sd-figure')){
   if(figures.has(figure))continue;figures.add(figure);
   const id=figure.closest('[data-sd-sheet]')?.dataset.sdSheet||'system';
   figure.id='workspace-schematic-'+id;
   figure.after(makeBar('Resize schematic height',heightConfig('diagramHeight',figure,figure.id)));
  }
 }
 function setPresence(element,key,value){
  if(value===undefined)delete element.dataset[key];else element.dataset[key]='true';
 }
 function apply(){
  if(!alive)return;
  setPresence(viewer,'layoutHeight',layout.viewHeight);
  if(layout.viewHeight!==undefined)px(viewer,'--workspace-view-height',layout.viewHeight);else viewer.style.removeProperty('--workspace-view-height');
  setPresence(primary,'layoutSplit',layout.guideFraction);
  if(layout.guideFraction!==undefined&&horizontal()){
   const space=splitSpace();
   if(space>0){const [min,max]=guideBounds(space);px(primary,'--workspace-guide-width',clamp(space*layout.guideFraction,min,max))}
  }else primary.style.removeProperty('--workspace-guide-width');
  setPresence(body,'layoutRail',layout.railWidth);
  if(layout.railWidth!==undefined)px(body,'--workspace-rail-width',layout.railWidth);else body.style.removeProperty('--workspace-rail-width');
  if(diagramHost){
   setPresence(diagramHost,'layoutDiagram',layout.diagramHeight);
   if(layout.diagramHeight!==undefined)px(diagramHost,'--workspace-diagram-height',layout.diagramHeight);else diagramHost.style.removeProperty('--workspace-diagram-height');
  }
  sync();
 }
 function sync(){
  if(!alive)return;
  const box=primary.getBoundingClientRect(),viewBox=viewer.getBoundingClientRect();
  splitHandle.hidden=!horizontal()||primary.hidden||viewer.hidden||box.width===0;
  if(!splitHandle.hidden){
   const gap=parseFloat(win.getComputedStyle(primary).columnGap)||0;
   splitHandle.style.left=(viewBox.right-box.left+gap/2)+'px';
  }
  if(railHandle)railHandle.hidden=!desktopRail();
  for(const handle of handles){
   if(!handle.isConnected)continue;
   const config=configs.get(handle),[min,max]=config.bounds(),value=Math.round(config.read());
   handle.setAttribute('aria-valuemin',String(Math.round(min)));handle.setAttribute('aria-valuemax',String(Math.round(max)));
   handle.setAttribute('aria-valuenow',String(clamp(value,Math.round(min),Math.round(max))));
   handle.setAttribute('aria-valuetext',value+' pixels');
  }
  for(const button of doc.querySelectorAll('.workspace-layout-reset'))button.disabled=!Object.keys(layout).length;
 }
 function schedule(){if(!frame&&alive)frame=win.requestAnimationFrame(()=>{frame=0;refreshDiagrams();apply()})}
 function finish(commit){
  if(!drag)return;
  const finished=drag;drag=null;delete body.dataset.workspaceResizing;
  try{if(finished.handle.hasPointerCapture(finished.id))finished.handle.releasePointerCapture(finished.id)}catch{}
  if(!commit){layout=finished.before;apply();return}
  save();status.textContent=finished.config.label+': '+Math.round(finished.config.read())+' pixels. Layout saved.';
 }
 function reset(){
  finish(false);layout={};save();apply();announce('Default panel sizes restored.');
 }
 function handleFrom(event){const handle=event.target.closest?.('.workspace-resizer');return handle&&configs.has(handle)?handle:null}
 listen(doc,'pointerdown',event=>{
  const handle=handleFrom(event);if(!handle||event.button!==0||event.isPrimary===false)return;
  event.preventDefault();event.stopPropagation();finish(true);handle.focus({preventScroll:true});
  const config=configs.get(handle);drag={handle,config,id:event.pointerId,start:config.axis==='y'?event.clientY:event.clientX,value:config.read(),before:{...layout}};
  body.dataset.workspaceResizing=config.axis;
  try{handle.setPointerCapture(event.pointerId)}catch{}
 });
 listen(doc,'pointermove',event=>{
  if(!drag||event.pointerId!==drag.id)return;
  event.preventDefault();event.stopPropagation();
  const coordinate=drag.config.axis==='y'?event.clientY:event.clientX,[min,max]=drag.config.bounds();
  drag.config.write(clamp(drag.value+coordinate-drag.start,min,max));
 },{passive:false});
 listen(doc,'pointerup',event=>{if(drag&&event.pointerId===drag.id){event.preventDefault();event.stopPropagation();finish(true)}});
 listen(doc,'pointercancel',event=>{if(drag&&event.pointerId===drag.id)finish(false)});
 listen(doc,'lostpointercapture',event=>{if(drag&&event.pointerId===drag.id)finish(true)});
 listen(win,'blur',()=>finish(false));
 listen(doc,'dblclick',event=>{
  const handle=handleFrom(event);if(!handle)return;
  event.preventDefault();event.stopPropagation();configs.get(handle).restore();save();status.textContent=configs.get(handle).label+': default restored.';
 });
 listen(doc,'keydown',event=>{
  if(drag&&event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(false);return}
  const handle=handleFrom(event);if(!handle)return;
  const config=configs.get(handle),keys=config.axis==='y'?['ArrowUp','ArrowDown']:['ArrowLeft','ArrowRight'];
  if(event.key!=='Home'&&!keys.includes(event.key))return;
  event.preventDefault();event.stopPropagation();
  if(event.key==='Home')config.restore();else{
   const [min,max]=config.bounds(),step=event.shiftKey?50:10,direction=event.key===keys[0]?-1:1;
   config.write(clamp(config.read()+direction*step,min,max));
  }
  save();status.textContent=config.label+': '+Math.round(config.read())+' pixels.';
 });
 listen(doc,'click',event=>{
  if(event.target.closest?.('.workspace-layout-reset')){event.preventDefault();event.stopPropagation();reset()}
 });
 listen(win,'resize',schedule);
 listen(doc,'fullscreenchange',schedule);
 const resizeObserver=new win.ResizeObserver(schedule);resizeObserver.observe(primary);resizeObserver.observe(viewer);if(rail)resizeObserver.observe(rail);
 const diagramObserver=diagramHost?new win.MutationObserver(schedule):null;
 diagramObserver?.observe(diagramHost,{childList:true,subtree:true});
 refreshDiagrams();apply();
 const api={refresh:schedule,reset,destroy(){
  finish(false);alive=false;if(frame)win.cancelAnimationFrame(frame);
  resizeObserver.disconnect();diagramObserver?.disconnect();for(const remove of removers)remove();
  heightBar.remove();splitHandle.remove();railHandle?.remove();status.remove();
  diagramHost?.querySelectorAll('.workspace-resize-bar').forEach(bar=>bar.remove());
  delete body.dataset.workspaceLayout;delete body.dataset.layoutRail;body.style.removeProperty('--workspace-rail-width');
  delete viewer.dataset.layoutHeight;viewer.style.removeProperty('--workspace-view-height');
  delete primary.dataset.layoutSplit;primary.style.removeProperty('--workspace-guide-width');
  if(diagramHost){delete diagramHost.dataset.layoutDiagram;diagramHost.style.removeProperty('--workspace-diagram-height')}
  installed.delete(doc);
 }};
 installed.set(doc,api);return api;
}
