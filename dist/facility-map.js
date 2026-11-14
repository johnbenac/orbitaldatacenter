// Raster campus map: no WebGL, key or additional mapping library. Only tiles
// visible in the current viewport are requested, using normal browser caching.
// Imagery and attribution: https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function mercatorPixel(lat,lon,zoom){const scale=256*2**zoom,phi=clamp(lat,-85.05112878,85.05112878)*Math.PI/180;return {x:(lon+180)/360*scale,y:(1-Math.log(Math.tan(phi)+1/Math.cos(phi))/Math.PI)/2*scale};}
export function mountFacilityMap(host,facility,{tileUrl='https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'}={}){
 let alive=true,z=14,w=600,h=430,center=mercatorPixel(facility.location.lat,facility.location.lon,z),frame=0,drag=null;
 host.innerHTML='<div class="fa-raster-map" tabindex="0" role="region" aria-label="Campus aerial map. Drag to pan, use the zoom buttons, or use arrow keys."><div class="fa-raster-tiles" aria-hidden="true"></div><div class="fa-campus-marker"><i></i><strong></strong></div><div class="fa-map-controls"><button type="button" data-campus-zoom="in" aria-label="Zoom campus map in">+</button><button type="button" data-campus-zoom="out" aria-label="Zoom campus map out">−</button><button type="button" data-campus-zoom="home">Recenter</button></div><div class="fa-map-attribution"><a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer" target="_blank" rel="noopener noreferrer">Esri, Vantor, Earthstar Geographics & GIS User Community</a></div><p class="fa-tile-status" role="status">Loading campus map…</p></div>';
 const map=host.firstElementChild,plane=map.querySelector('.fa-raster-tiles'),marker=map.querySelector('.fa-campus-marker'),status=map.querySelector('.fa-tile-status'),tiles=new Map();marker.querySelector('strong').textContent=facility.shortName||facility.name;
 function request(){if(alive&&!frame)frame=requestAnimationFrame(paint);}
 function tileState(){if(!alive)return;const visible=[...tiles.values()],ready=visible.some(img=>img.complete&&img.naturalWidth>0);status.hidden=ready;if(!ready)status.textContent=visible.length&&visible.every(img=>img.complete)?'Map tiles are unavailable. The address and full-map link below remain available.':'Loading campus map…';}
 function paint(){
  frame=0;if(!alive||w<1||h<1)return;const left=center.x-w/2,top=center.y-h/2,n=2**z,needed=new Set();
  for(let xx=Math.floor(left/256);xx<=Math.floor((left+w)/256);xx++)for(let yy=Math.floor(top/256);yy<=Math.floor((top+h)/256);yy++){
   if(yy<0||yy>=n)continue;const x=(xx%n+n)%n,key=z+'/'+xx+'/'+yy;needed.add(key);let img=tiles.get(key);
   if(!img){img=document.createElement('img');img.alt='';img.draggable=false;img.referrerPolicy='strict-origin-when-cross-origin';img.onload=tileState;img.onerror=tileState;img.src=tileUrl.replace('{z}',z).replace('{x}',x).replace('{y}',yy);tiles.set(key,img);plane.append(img);}
   img.style.left=(xx*256-left)+'px';img.style.top=(yy*256-top)+'px';
  }
  for(const [key,img]of tiles)if(!needed.has(key)){img.onload=img.onerror=null;img.remove();tiles.delete(key);}
  const p=mercatorPixel(facility.location.lat,facility.location.lon,z),px=p.x-left,py=p.y-top;marker.style.left=px+'px';marker.style.top=py+'px';marker.hidden=px<0||px>w||py<0||py>h;tileState();
 }
 function zoom(next){next=clamp(next,3,18);const ratio=2**(next-z);center={x:center.x*ratio,y:center.y*ratio};z=next;request();}
 const down=e=>{if(e.button!==0||e.target.closest('button,a'))return;drag={x:e.clientX,y:e.clientY,id:e.pointerId};map.setPointerCapture(e.pointerId);map.focus({preventScroll:true});},move=e=>{if(!drag||e.pointerId!==drag.id)return;center.x-=e.clientX-drag.x;center.y=clamp(center.y-e.clientY+drag.y,0,256*2**z);drag.x=e.clientX;drag.y=e.clientY;request();},up=()=>{drag=null;};
 const click=e=>{const b=e.target.closest('[data-campus-zoom]');if(!b)return;e.stopPropagation();if(b.dataset.campusZoom==='home')center=mercatorPixel(facility.location.lat,facility.location.lon,z);else zoom(z+(b.dataset.campusZoom==='in'?1:-1));request();};
 const key=e=>{if(e.target!==map)return;let handled=true;switch(e.key){case'ArrowLeft':center.x-=100;break;case'ArrowRight':center.x+=100;break;case'ArrowUp':center.y-=100;break;case'ArrowDown':center.y+=100;break;case'+':case'=':zoom(z+1);break;case'-':zoom(z-1);break;case'Home':center=mercatorPixel(facility.location.lat,facility.location.lon,z);break;default:handled=false;}if(handled){e.preventDefault();request();}};
 const resize=()=>{const r=map.getBoundingClientRect();w=r.width;h=r.height;request();},observer=new ResizeObserver(resize);observer.observe(map);map.addEventListener('pointerdown',down);map.addEventListener('pointermove',move);map.addEventListener('pointerup',up);map.addEventListener('pointercancel',up);map.addEventListener('click',click);map.addEventListener('keydown',key);resize();
 return ()=>{alive=false;if(frame)cancelAnimationFrame(frame);observer.disconnect();map.removeEventListener('pointerdown',down);map.removeEventListener('pointermove',move);map.removeEventListener('pointerup',up);map.removeEventListener('pointercancel',up);map.removeEventListener('click',click);map.removeEventListener('keydown',key);for(const img of tiles.values()){img.onload=img.onerror=null;}tiles.clear();host.replaceChildren();};
}
