import {referenceIllustrationOrder,getReferenceIllustration} from './reference-illustrations.js';

// Artwork is optional. This module never owns, delays, or estimates boot work.
export function startStartupIllustrations(panel=document.getElementById('startup')) {
 const slides=referenceIllustrationOrder.map(getReferenceIllustration).filter(art=>art?.src);
 const carousel=panel?.querySelector('#startup-carousel');
 if(!carousel||!slides.length)return {destroy(){}};
 const visual=panel.querySelector('#startup-visual');
 const name=panel.querySelector('#startup-illustration-name');
 const caption=panel.querySelector('#startup-illustration-caption');
 const controls=panel.querySelector('#startup-controls');
 const previous=panel.querySelector('#startup-previous');
 const next=panel.querySelector('#startup-next');
 const play=panel.querySelector('#startup-play');
 const count=panel.querySelector('#startup-count');
 const announcement=panel.querySelector('#startup-announcement');
 const motion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
 const requested=new URLSearchParams(location.search).get('center');
 const selected=slides.findIndex(art=>art.id===requested);
 let index=selected<0?Math.floor(Math.random()*slides.length):selected;
 let displayed=-1,request=0,timer=null,pendingImage=null,destroyed=false,hovered=false;
 let playing=!motion?.matches;
 const failed=new Set(),listeners=[];
 const listen=(target,type,fn)=>{target?.addEventListener?.(type,fn);listeners.push(()=>target?.removeEventListener?.(type,fn));};
 const clear=()=>{clearTimeout(timer);timer=null;};
 const updatePlay=()=>{
  play.dataset.playing=String(playing);
  play.setAttribute('aria-label',playing?'Pause illustrations':'Play illustrations');
  play.title=playing?'Pause illustrations':'Play illustrations';
 };
 const schedule=()=>{
  clear();
  if(!destroyed&&playing&&!hovered&&!document.hidden&&!panel.hidden&&!pendingImage&&slides.length-failed.size>1)
   timer=setTimeout(()=>show(index+1),8000);
 };
 const pause=()=>{playing=false;updatePlay();clear();};
 const show=(target,announce=false)=>{
  if(destroyed)return;
  clear();
  index=((target%slides.length)+slides.length)%slides.length;
  if(failed.size>=slides.length)return;
  while(failed.has(index))index=(index+1)%slides.length;
  const nextIndex=index,art=slides[index],ticket=++request;
  if(pendingImage){pendingImage.onload=null;pendingImage.onerror=null;}
  const image=new Image(art.width,art.height);
  pendingImage=image;
  image.className='startup-illustration';
  image.alt=art.alt;
  image.decoding='async';
  image.fetchPriority=displayed<0?'high':'low';
  image.sizes='(max-width: 980px) calc(100vw - 40px), (max-width: 1560px) calc(100vw - 490px), 1050px';
  image.onload=()=>{
   if(destroyed||ticket!==request)return;
   pendingImage=null;displayed=nextIndex;
   visual.replaceChildren(image);
   carousel.dataset.illustrated='true';
   name.textContent=art.name;
   caption.textContent=art.caption;
   count.textContent=String(nextIndex+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');
   count.setAttribute('aria-label','Illustration '+(nextIndex+1)+' of '+slides.length);
   if(announce)announcement.textContent=art.name+', illustration '+(nextIndex+1)+' of '+slides.length+'.';
   schedule();
  };
  image.onerror=()=>{
   if(destroyed||ticket!==request)return;
   pendingImage=null;failed.add(nextIndex);
   if(failed.size===slides.length){controls.hidden=true;return;}
   if(displayed<0)show(nextIndex+1,announce);else schedule();
  };
  image.srcset=art.srcset||'';
  image.src=art.src;
 };
 const step=direction=>{pause();show(index+direction,true);};
 const toggle=()=>{playing=!playing;updatePlay();schedule();};
 listen(previous,'click',()=>step(-1));
 listen(next,'click',()=>step(1));
 listen(play,'click',toggle);
 listen(carousel,'mouseenter',()=>{hovered=true;clear();});
 listen(carousel,'mouseleave',()=>{hovered=false;schedule();});
 listen(carousel,'focusin',event=>{if(event.target!==play)pause();});
 listen(carousel,'keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.key==='ArrowLeft'){event.preventDefault();step(-1);}
  else if(event.key==='ArrowRight'){event.preventDefault();step(1);}
  else if(event.key==='Home'){event.preventDefault();pause();show(0,true);}
  else if(event.key==='End'){event.preventDefault();pause();show(slides.length-1,true);}
  else if(event.key===' '&&event.target===carousel){event.preventDefault();toggle();}
 });
 listen(document,'visibilitychange',schedule);
 listen(motion,'change',()=>{if(motion.matches)pause();});
 controls.hidden=slides.length<2;updatePlay();show(index);

 // Reserve room for the actual floating work status, including its collapsed state.
 let feedback=null,feedbackResize=null,feedbackChanges=null;
 const reserve=()=>{
  const height=feedback&&!feedback.hidden?feedback.getBoundingClientRect().height:0;
  panel.style.setProperty('--startup-feedback-height',height>0?Math.ceil(height+24)+'px':'0px');
 };
 const bindFeedback=()=>{
  const found=document.getElementById('work-status');
  if(found===feedback)return;
  feedbackResize?.disconnect();feedbackChanges?.disconnect();feedback=found;
  if(found){
   if(typeof ResizeObserver==='function'){feedbackResize=new ResizeObserver(reserve);feedbackResize.observe(found);}
   feedbackChanges=new MutationObserver(reserve);
   feedbackChanges.observe(found,{attributes:true,attributeFilter:['hidden','data-expanded','data-state']});
  }
  reserve();
 };
 const additions=new MutationObserver(bindFeedback);
 additions.observe(document.body,{childList:true});
 listen(window,'resize',reserve);bindFeedback();
 return {destroy(){
  if(destroyed)return;
  destroyed=true;request++;clear();
  if(pendingImage){pendingImage.onload=null;pendingImage.onerror=null;pendingImage=null;}
  listeners.forEach(remove=>remove());
  additions.disconnect();feedbackResize?.disconnect();feedbackChanges?.disconnect();
  panel.style.removeProperty('--startup-feedback-height');
 }};
}
