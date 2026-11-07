// Shared by facility, pad and orbital hardware annotations. Keep the original
// compact facility pins beside their objects, never in viewport-side rails.
export const bayAnnotationColors=Object.freeze({flight:'#a6d5e7',ground:'#e2b277',facility:'#a0b9c5',process:'#8fd5bd'});

export function visibleBayObject(object){
 if(!object)return false;
 for(let node=object;node;node=node.parent)if(node.visible===false)return false;
 return true;
}

export function layoutBayAnnotations(points,width,height){
 if(width<220||height<150)return [];
 const compact=width<580,placed=[],seen=new Set(),labelHeight=25;
 const candidates=points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=5&&p.x<=width-5&&p.y>=48&&p.y<=height-48)
  .sort((a,b)=>(b.priority||0)-(a.priority||0)||String(a.id).localeCompare(String(b.id)));
 for(const p of candidates){
  if(seen.has(p.id))continue;
  // Closely spaced mechanism anchors can request opposite local sides. Keep
  // the facility's automatic choice otherwise, and flip only to fit the edge.
  const preferredRight=p.labelSide?p.labelSide==='right':p.x<width*.64;
  const right=preferredRight?width-p.x>=71:p.x<71,side=right?'right':'left';
  const available=Math.max(45,(right?width-p.x:p.x)-26);
  const labelWidth=Math.min(184,available,Math.max(45,String(p.title||'').length*6.3+16));
  const labelX=right?p.x+18:p.x-18-labelWidth,labelY=p.y-labelHeight/2;
  // Hide crowded pins instead of moving them away from their objects. Their
  // offsets remain fixed as the camera rotates, pans or zooms.
  if(labelX+labelWidth>width-125&&labelY<123)continue;
  if(placed.some(q=>labelX<q.labelX+q.labelWidth+4&&labelX+labelWidth+4>q.labelX&&labelY<q.labelY+q.labelHeight+3&&labelY+labelHeight+3>q.labelY))continue;
  placed.push({...p,side,labelX,labelY,labelWidth,labelHeight,
   leader:[[p.x,p.y],[right?labelX:labelX+labelWidth,p.y]],
   color:bayAnnotationColors[p.kind]||bayAnnotationColors.ground});
  seen.add(p.id);
  if(placed.length>=(compact?6:12))break;
 }
 return placed;
}

export function drawBayAnnotations(parent,entries){
 // Retain each button across scene redraws so native title tooltips and keyboard
 // focus survive live telemetry, camera updates and background rendering.
 const previous=new Map(Array.from(parent.children,card=>[card.dataset.annotationId,card]));
 for(const e of entries){
  let card=previous.get(e.id);previous.delete(e.id);
  if(!card){
   card=document.createElement('button');card.type='button';
   const name=document.createElement('span');name.className='bay-pin-name';card.append(name);
   parent.append(card);
  }
  card.className='bay-pin'+(e.side==='left'?' bay-pin-left':'');
  // A leader moves the current camera once. It never selects a persistent
  // inspection preset or changes the engineering service selection.
  card.dataset.sceneAnchor=e.id;card.setAttribute('aria-label','Center view on '+e.title.toLowerCase());
  if(e.pad)card.dataset.padCallout=e.id;else delete card.dataset.padCallout;
  if(e.instrument)card.dataset.sceneInstrument=e.instrument;else delete card.dataset.sceneInstrument;
  card.dataset.annotationId=e.id;
  card.style.left=e.x+'px';card.style.top=e.y+'px';card.style.maxWidth=e.labelWidth+'px';
  const description=[e.value,e.detail,'Click to center view'].filter(Boolean).join(' · ');
  const title=e.title+' · '+description;
  if(card.title!==title)card.title=title;
  card.setAttribute('aria-description',description);
  if(card.children[0].textContent!==e.title)card.children[0].textContent=e.title;
 }
 for(const card of previous.values())card.remove();
}
