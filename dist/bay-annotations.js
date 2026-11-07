// Keep the expanded facility/pad annotation registry, with the original compact
// pins beside their projected objects. Labels never migrate into reading rails.
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
  // This is the old pin's local left/right choice, not a viewport-side lane.
  const right=p.x<width*.64,side=right?'right':'left';
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
 for(const e of entries){
  const card=document.createElement('button');card.type='button';card.className='bay-pin'+(e.side==='left'?' bay-pin-left':'');
  // A leader moves the current camera once. It never selects a persistent
  // inspection preset or changes the engineering service selection.
  card.dataset.sceneAnchor=e.id;card.setAttribute('aria-label','Center view on '+e.title.toLowerCase());
  if(e.pad)card.dataset.padCallout=e.id;
  card.dataset.annotationId=e.id;
  card.style.left=e.x+'px';card.style.top=e.y+'px';card.style.maxWidth=e.labelWidth+'px';
  card.title=e.title+(e.detail?' · '+e.detail:'')+' · Click to center view';
  const name=document.createElement('span');name.className='bay-pin-name';name.textContent=e.title;card.append(name);
  parent.append(card);
 }
}
