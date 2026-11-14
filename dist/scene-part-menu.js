// The scene supplies identities from real object ancestry. This helper keeps
// Three objects out of navigation state and never infers geometry from a label.
const text=value=>typeof value==='string'?value:'';
const unique=values=>[...new Set(values.filter(Boolean))];
function objectRoots(source,prefix='',depth=0){
 const roots=[];
 for(const [key,value] of Object.entries(source||{})){
  const path=prefix+key;
  if(value?.isObject3D)roots.push({key:path,object:value});
  else if(Array.isArray(value))value.forEach((object,index)=>{if(object?.isObject3D)roots.push({key:path,object,index});});
  else if(value&&typeof value==='object'&&depth<2&&Object.getPrototypeOf(value)===Object.prototype)roots.push(...objectRoots(value,path+'.',depth+1));
 }
 return roots;
}
export function describeScenePart(object,{craft=null,launch=null,annotation=null}={}){
 const chain=[];for(let node=object;node;node=node.parent)chain.push(node);
 const data=chain.map(node=>node.userData||{}),materials=[].concat(object?.material||[]).map(m=>m?.userData||{});
 const first=key=>data.map(d=>text(d[key])).find(Boolean)||materials.map(d=>text(d[key])).find(Boolean)||'';
 const partIds=unique(data.map(d=>text(d.part))),materialRoles=unique([...data,...materials].map(d=>text(d.materialRole)));
 const names=unique(chain.map(node=>text(node.name))),rootKeys=[];let rootIndex=null;
 const roots=[...objectRoots(craft),...objectRoots(launch?.parts)];
 for(const node of chain)for(const entry of roots){
  if(entry.object===node){if(entry.index!==undefined)rootKeys.push(entry.key+'.'+entry.index);rootKeys.push(entry.key);if(rootIndex===null&&entry.index!==undefined)rootIndex=entry.index;}
 }
 let category=chain.includes(craft?.root)?'flight':chain.includes(launch?.parts.facility)?'ground':chain.includes(launch?.parts.tower)?'site':chain.includes(launch?.root)?'launch':'';
 let connectionId=first('connectionId'),umbilicalGroup=first('umbilicalGroup');
 for(const [id,entry] of launch?.umbilicals?.connectionMeshes||[]){
  if([entry.flight,entry.groundHead,entry.hose,...(entry.fixedMeshes||[])].some(node=>node&&chain.includes(node))){connectionId=id;umbilicalGroup=entry.groupId||umbilicalGroup;break;}
 }
 if(umbilicalGroup||connectionId)category='site';
 const physicalPartId=first('physicalPartId')||first('electricalItemId'),electricalItemIds=unique(data.flatMap(d=>Array.isArray(d.electricalItemIds)?d.electricalItemIds:[]));
 const item={id:physicalPartId||partIds[0]||'',physicalPartId,electricalItemId:physicalPartId,electricalItemIds,name:names[0]||'',names,partIds,materialRole:materialRoles[0]||'',materialRoles,
  materialId:first('materialId'),stationId:first('stationId'),bayRole:first('bayRole'),assembly:first('assembly'),
  umbilicalGroup,connectionId,category,rootKey:rootKeys[0]||'',rootKeys:unique(rootKeys)};
 if(rootIndex!==null)item.rootIndex=rootIndex;
 if(annotation){
  for(const key of ['title','detail','instrument','stationId','bayRole','kind','sourceUrl','connectionId'])if(text(annotation[key]))item[key]=annotation[key];
  if(text(annotation.part)){item.instrumentPart=annotation.part;if(!item.id)item.id=annotation.part;item.partIds=unique([...item.partIds,annotation.part]);}
  item.annotationId=text(annotation.id);
  if(annotation.groupId)item.umbilicalGroup=annotation.groupId;
  if(annotation.category)item.category=annotation.category;
 }
 return item;
}

export function placeScenePartMenu(point,bounds,width,height){
 const gutter=8,maxX=Math.max(gutter,bounds.width-width-gutter),maxY=Math.max(gutter,bounds.height-height-gutter);
 const x=Number.isFinite(point?.x)?point.x-bounds.left:gutter,y=Number.isFinite(point?.y)?point.y-bounds.top:gutter;
 return {left:Math.min(maxX,Math.max(gutter,x+width+gutter>bounds.width?x-width-6:x+8)),
  top:Math.min(maxY,Math.max(gutter,y+height+gutter>bounds.height?y-height-6:y+8))};
}

// A single two-action popup is reused across mesh and leader selections. It is
// outside the canvas, so rendering and exports never bake the menu into an image.
export function createScenePartMenu(container,{returnFocus=null}={}){
 let menu=null,buttons=[],owner=null,opened=false,disposed=false;
 const doc=container.ownerDocument||globalThis.document,win=doc?.defaultView||globalThis.window;
 function close({restoreFocus=false}={}){
  if(!opened)return;opened=false;menu.hidden=true;
  if(owner?.getAttribute?.('aria-haspopup')==='menu')owner.setAttribute('aria-expanded','false');
  if(restoreFocus){const target=owner?.isConnected===false?returnFocus:owner||returnFocus;target?.focus?.({preventScroll:true});}
  owner=null;
 }
 const inside=target=>!!menu?.contains?.(target);
 const outside=event=>{if(opened&&!inside(event.target))close();};
 const resize=()=>close();
 function mount(){
  if(menu)return;
  menu=doc.createElement('div');menu.className='scene-part-menu';menu.hidden=true;
  menu.setAttribute('role','menu');menu.setAttribute('aria-label','Part actions');
  for(const type of ['pointerdown','pointerup','click','dblclick','wheel'])menu.addEventListener(type,event=>event.stopPropagation());
  menu.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close({restoreFocus:true});return;}
   if(event.key==='Tab'){close({restoreFocus:true});return;}
   const at=Math.max(0,buttons.indexOf(doc.activeElement));let next;
   if(event.key==='ArrowDown')next=(at+1)%buttons.length;
   else if(event.key==='ArrowUp')next=(at-1+buttons.length)%buttons.length;
   else if(event.key==='Home')next=0;
   else if(event.key==='End')next=buttons.length-1;
   if(next===undefined)return;event.preventDefault();event.stopPropagation();
   buttons.forEach((button,i)=>button.tabIndex=i===next?0:-1);buttons[next]?.focus?.();
  });
  container.append(menu);
  doc?.addEventListener?.('pointerdown',outside,true);doc?.addEventListener?.('focusin',outside);
  win?.addEventListener?.('resize',resize);
 }
 function open({title='Selected part',description='',point,anchor=null,actions=[]}={}){
  if(disposed)return;
  const available=actions.filter(action=>typeof action.run==='function');if(!available.length)return;
  mount();close();owner=anchor||doc.activeElement||returnFocus;
  if(owner?.getAttribute?.('aria-haspopup')==='menu')owner.setAttribute('aria-expanded','true');
  menu.setAttribute('aria-label',title+' actions');
  menu.replaceChildren();buttons=[];
  const heading=doc.createElement('p');heading.className='scene-part-menu-title';heading.textContent=title;heading.setAttribute('role','presentation');menu.append(heading);
  if(description){const detail=doc.createElement('p');detail.className='scene-part-menu-detail';detail.textContent=description;detail.setAttribute('role','presentation');menu.append(detail);}
  for(const [i,action] of available.entries()){
   const button=doc.createElement('button');button.type='button';button.className='scene-part-menu-action';button.setAttribute('role','menuitem');button.tabIndex=i? -1:0;
   button.textContent=action.label;button.dataset.scenePartAction=action.id||String(i);
   button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();close();action.run();});
   buttons.push(button);menu.append(button);
  }
  const bounds=container.getBoundingClientRect();menu.style.maxHeight=Math.max(80,bounds.height-16)+'px';
  menu.style.width=Math.max(0,Math.min(292,bounds.width-16))+'px';menu.hidden=false;opened=true;
  const extent=menu.getBoundingClientRect(),position=placeScenePartMenu(point,bounds,extent.width,extent.height);
  menu.style.left=position.left+'px';menu.style.top=position.top+'px';buttons[0]?.focus?.({preventScroll:true});
 }
 return {open,close,contains:inside,get isOpen(){return opened;},destroy(){
  if(disposed)return;close();disposed=true;menu?.remove();menu=null;buttons=[];
  doc?.removeEventListener?.('pointerdown',outside,true);doc?.removeEventListener?.('focusin',outside);
  win?.removeEventListener?.('resize',resize);
 }};
}
