// Local artwork capture. SVG stays vector until its final rasterization, and
// scene pixels are composited directly instead of PNG-encoding every video frame.
// Data URLs are intentional: blob-backed SVG with foreignObject can taint a canvas.
const SVG='http://www.w3.org/2000/svg',HTML='http://www.w3.org/1999/xhtml',XLINK='http://www.w3.org/1999/xlink';
const excluded='[data-capture-exclude],[data-layout-handle],[role="separator"],.gesture,#scene-loading,.earth-imagery-status,.orbit-rotation-ring,.launch-geography-credit .is-loading';
const layoutStyles=`display position z-index box-sizing width height min-width min-height max-width max-height aspect-ratio top right bottom left margin-top margin-right margin-bottom margin-left padding-top padding-right padding-bottom padding-left border-top-width border-right-width border-bottom-width border-left-width border-top-style border-right-style border-bottom-style border-left-style border-top-color border-right-color border-bottom-color border-left-color border-top-left-radius border-top-right-radius border-bottom-left-radius border-bottom-right-radius background-color background-image background-position background-size background-repeat background-origin background-clip opacity color font-family font-size font-weight font-style font-stretch font-variant font-feature-settings font-kerning line-height letter-spacing word-spacing white-space word-break overflow-wrap text-align text-indent text-transform text-decoration text-shadow text-overflow vertical-align direction writing-mode align-items align-content align-self justify-items justify-content justify-self gap row-gap column-gap flex flex-direction flex-wrap flex-grow flex-shrink flex-basis order grid-template-columns grid-template-rows grid-auto-flow grid-auto-columns grid-auto-rows grid-column-start grid-column-end grid-row-start grid-row-end overflow overflow-x overflow-y visibility clip clip-path transform transform-origin transform-box box-shadow filter isolation mix-blend-mode object-fit object-position list-style-type list-style-position`.split(' ');
const svgStyles=`fill fill-opacity fill-rule stroke stroke-width stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity vector-effect paint-order shape-rendering text-rendering dominant-baseline alignment-baseline text-anchor stop-color stop-opacity flood-color flood-opacity lighting-color color-interpolation color-interpolation-filters marker-start marker-mid marker-end d x y cx cy r rx ry`.split(' ');
const svgCommon=`display opacity visibility color font-family font-size font-weight font-style font-stretch font-variant font-feature-settings font-kerning letter-spacing word-spacing white-space text-transform text-decoration direction writing-mode transform transform-origin transform-box clip-path filter mix-blend-mode`.split(' ');
const xml=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const aborted=signal=>{if(signal?.aborted)throw new DOMException('Capture cancelled.','AbortError')};
const finite=value=>Number.isFinite(value)&&value>0;
export const CAPTURE_SOURCE_URL='https://orbital-data-center-lab.kda44d.chatgpt.site/';
export const CAPTURE_SOURCE_LABEL='Orbital Data Center';
const appearanceExclusions={
 leaders:'.scene-annotations,.bay-annotations,.bay-pin,.scene-focus-label',
 readouts:'.scene-readouts,.viewtag,.imagestate,.viewcaption,.launch-location-badge',
 axes:'.coordinate-triad'
};

// One compositor supplies the exact same signature in the preview, PNG and
// every video frame. It is independent of imagery's own source attribution.
export function drawCaptureWatermark(context,width,height){
 const scale=Math.max(.15,Math.min(width/1200,height/180)),pad=12*scale,margin=14*scale;
 const title=CAPTURE_SOURCE_LABEL.toUpperCase(),address=CAPTURE_SOURCE_URL.replace(/^https:\/\//,'').replace(/\/$/,'');
 context.save();
 try{
  context.setTransform(1,0,0,1,0,0);context.globalAlpha=1;context.globalCompositeOperation='source-over';
  context.textAlign='left';context.textBaseline='top';context.font=`600 ${12*scale}px system-ui, sans-serif`;
  const titleWidth=context.measureText(title).width;
  context.font=`400 ${11*scale}px system-ui, sans-serif`;
  const boxWidth=Math.max(titleWidth,context.measureText(address).width)+pad*2,boxHeight=46*scale;
  const x=width-margin-boxWidth,y=height-margin-boxHeight;
  context.fillStyle='rgba(9,18,27,.88)';context.fillRect(x,y,boxWidth,boxHeight);
  context.fillStyle='#eeb772';context.fillRect(x,y,2*scale,boxHeight);
  context.fillStyle='#f1f5f6';context.font=`600 ${12*scale}px system-ui, sans-serif`;context.fillText(title,x+pad,y+8*scale);
  context.fillStyle='#c5dae0';context.font=`400 ${11*scale}px system-ui, sans-serif`;context.fillText(address,x+pad,y+26*scale);
 }finally{context.restore();}
}

/** Preserve the displayed aspect ratio, optionally using even video dimensions. */
export function captureDimensions(element,{maxEdge=3840,even=false}={}){
 const rect=element?.getBoundingClientRect?.();
 if(!rect||!finite(rect.width)||!finite(rect.height))throw Error('Open the visualization before capturing it.');
 const edge=Math.min(8192,Math.max(2,Number(maxEdge)||3840)),scale=edge/Math.max(rect.width,rect.height),step=even?2:1;
 return {width:Math.max(step,Math.round(rect.width*scale/step)*step),height:Math.max(step,Math.round(rect.height*scale/step)*step),logicalWidth:rect.width,logicalHeight:rect.height};
}

function rasterSize(width,height){
 width=Math.round(Number(width));height=Math.round(Number(height));
 if(!finite(width)||!finite(height)||width>8192||height>8192||width*height>32e6)throw Error('The capture size is too large for this browser. Resize the view and try again.');
 return {width,height};
}
function imageURL(blob,signal){
 return new Promise((resolve,reject)=>{
  aborted(signal);const reader=new FileReader();
  const stop=()=>{reader.abort();reject(new DOMException('Capture cancelled.','AbortError'))};
  signal?.addEventListener('abort',stop,{once:true});
  const done=()=>signal?.removeEventListener('abort',stop);
  reader.onload=()=>{done();resolve(String(reader.result))};reader.onerror=()=>{done();reject(Error('An image could not be prepared for capture.'))};reader.onabort=done;reader.readAsDataURL(blob);
 });
}
function decodeContent(value,source){
 if(!value||value==='none'||value==='normal')return '';
 if(value.startsWith('attr('))return source.getAttribute(value.slice(5,-1).trim())||'';
 if(!/^["']/.test(value))return '';
 return value.slice(1,-1).replace(/\\([0-9a-f]{1,6})\s?|\\(.)/gi,(_,hex,char)=>hex?String.fromCodePoint(Math.min(0x10ffff,parseInt(hex,16))):char);
}
function removeBehavior(node){
 for(const attr of Array.from(node.attributes||[]))if(/^on/i.test(attr.name)||['autofocus','contenteditable','srcset','sizes','loading','tabindex'].includes(attr.name))node.removeAttribute(attr.name);
 if(node.namespaceURI===HTML&&node.localName==='a')node.removeAttribute('href');
}
function normalizeRoot(root,rect){
 // Freeze layout at the source size; the outer SVG provides output resolution.
 Object.assign(root.style,{position:'relative',inset:'auto',left:'auto',right:'auto',top:'auto',bottom:'auto',margin:'0',width:rect.width+'px',height:rect.height+'px',minWidth:'0',minHeight:'0',maxWidth:'none',maxHeight:'none',boxSizing:'border-box',transform:'none',overflow:'hidden'});
}
function svgDocument(root,rect,size){
 const markup=new XMLSerializer().serializeToString(root);
 return `<svg xmlns="${SVG}" xmlns:xlink="${XLINK}" width="${size.width}" height="${size.height}" viewBox="0 0 ${rect.width} ${rect.height}"><foreignObject x="0" y="0" width="${rect.width}" height="${rect.height}">${markup}</foreignObject></svg>`;
}
function sceneBackground(root,scene){
 const path=[];let child=scene;
 while(child&&child!==root){path.unshift(child);child=child.parentNode;}
 if(child!==root)throw Error('The scene has moved. Capture the current view again.');
 const result=root.cloneNode(false);let parent=result;
 for(const item of path){const next=item.cloneNode(false);parent.append(next);parent=next;}
 return result;
}
function clearBackdrop(root,scene){
 for(let node=scene;node;node=node===root?null:node.parentNode){
  if(node.style){node.style.background='transparent';node.style.boxShadow='none';node.style.borderColor='transparent';}
 }
}

/**
 * Capture one stable element without changing the live DOM.
 * render({width,height,canvas,sceneCanvas,signal,appearance}) resolves to the output canvas.
 * Supply sceneCanvas for #viewport: the backdrop, raw scene and labels are drawn
 * separately, preserving transparent render backgrounds and on-screen leaders.
 * Call dispose() when a PNG finishes, or after the final video frame.
 */
export function createArtworkCapture(element,{background='#10141a',exclude='',sceneElement=null,signal:outerSignal=null}={}){
 if(!element?.ownerDocument)throw Error('Choose a visualization to capture.');
 const doc=element.ownerDocument,win=doc.defaultView,controller=new AbortController(),resources=new Map(),rasterSlots=new Map(),pendingImages=new Set();
 const omit=[excluded,...[].concat(exclude||[]).filter(Boolean)].join(',');
 let disposed=false,cleanChecked=false;
 const check=signal=>{if(disposed)throw new DOMException('Capture closed.','AbortError');aborted(controller.signal);aborted(outerSignal);aborted(signal);};
 const abortOuter=()=>controller.abort();outerSignal?.addEventListener('abort',abortOuter,{once:true});

 function localFragment(value){
  if(value.startsWith('#'))return value;
  try{const u=new URL(value,doc.baseURI),page=new URL(doc.URL);if(u.hash&&u.origin===page.origin&&u.pathname===page.pathname)return u.hash;}catch{}
  return null;
 }
 async function embedResource(value){
  if(value.startsWith('data:'))return value;
  const u=new URL(value,doc.baseURI);
  if(u.protocol!=='blob:'&&u.origin!==new URL(doc.URL).origin)throw Error('This visualization includes an external image that cannot be saved locally.');
  if(!['http:','https:','blob:'].includes(u.protocol))throw Error('An image in this visualization cannot be captured.');
  const key=u.href;
  if(!resources.has(key))resources.set(key,(async()=>{
   const response=await fetch(key,{credentials:'same-origin',signal:controller.signal});
   if(!response.ok)throw Error('An image needed for this capture could not be loaded. Try again after the view finishes loading.');
   let blob=await response.blob();
   if(/\.svg(?:[?#]|$)/i.test(key)&&!blob.type.includes('svg'))blob=new Blob([blob],{type:'image/svg+xml'});
   return imageURL(blob,controller.signal);
  })());
  return resources.get(key);
 }
 async function embeddedCss(value){
  const matches=Array.from(value.matchAll(/url\(\s*(?:(["'])(.*?)\1|([^)]*))\s*\)/gi));
  let result=value;
  for(const match of matches){const original=(match[2]??match[3]??'').trim();if(!original)continue;const embedded=localFragment(original)||await embedResource(original);result=result.replace(match[0],`url("${embedded.replaceAll('"','%22')}")`);}
  return result;
 }
 function copyStyle(source,target,style,ctx){
  const svg=source.namespaceURI===SVG,properties=svg?[...(source.localName==='svg'?layoutStyles:svgCommon),...svgStyles]:layoutStyles;
  for(const name of properties){
   let value=style.getPropertyValue(name);if(!value)continue;
   // The SVG output viewport is larger than the page viewport. Keep strokes
   // declared non-scaling at the same visual weight relative to the scene.
   if(svg&&style.getPropertyValue('vector-effect')==='non-scaling-stroke'&&name==='stroke-width'&&/^[\d.]+px$/.test(value))value=parseFloat(value)*ctx.scale+'px';
   if(value.includes('url('))ctx.tasks.push(embeddedCss(value).then(v=>target.style.setProperty(name,v)));
   else target.style.setProperty(name,value);
  }
  target.style.setProperty('animation','none','important');target.style.setProperty('transition','none','important');target.style.setProperty('caret-color','transparent');target.style.setProperty('outline','none');
 }
 function pseudo(source,pseudoName,ctx){
  const style=win.getComputedStyle(source,pseudoName),content=decodeContent(style.content,source);
  if(!style.content||style.content==='none'||style.content==='normal'||style.display==='none')return null;
  const span=doc.createElementNS(HTML,'span');copyStyle(source,span,style,ctx);span.textContent=content;return span;
 }
 function cloneTree(source,ctx){
  if(source.nodeType===3)return source.cloneNode(false);
  if(source.nodeType!==1)return null;
  if(source!==element&&(source.matches(omit)||(ctx.omitAppearance&&source.matches(ctx.omitAppearance))||source.hidden||['script','style','link','iframe','object','embed','noscript','animate','animateMotion','animateTransform','set'].includes(source.localName)))return null;
  const style=win.getComputedStyle(source);
  if(style.display==='none'||style.contentVisibility==='hidden')return null;
  if(ctx.rawScene&&source.localName==='canvas'&&(!ctx.sceneHost||ctx.sceneHost.contains(source)))return null;
  let clone;
  if(source.localName==='canvas'){
   clone=doc.createElementNS(HTML,'img');
   try{clone.src=source.toDataURL('image/png');}catch{throw Error('This canvas cannot be captured because an image is not available locally.');}
  }else clone=source.cloneNode(false);
  ctx.nodes.set(source,clone);removeBehavior(clone);copyStyle(source,clone,style,ctx);
  // Keep the quantitative temperature key above the optional signature.
  // Only the exported clone moves; the working view retains its own layout.
  if(ctx.watermarkInset&&source.matches('[aria-label="Thermal overlay legend"]')){
   clone.style.top='auto';
   clone.style.bottom=Math.max(parseFloat(style.bottom)||0,ctx.watermarkInset)+'px';
  }
  if(source.namespaceURI===HTML){
   if(source.localName==='img'){
    const url=source.currentSrc||source.src;if(url)ctx.tasks.push(embedResource(url).then(value=>clone.setAttribute('src',value)));
   }else if(source.localName==='input'){
    clone.setAttribute('value',source.value);if(source.checked)clone.setAttribute('checked','');else clone.removeAttribute('checked');
   }else if(source.localName==='textarea')clone.textContent=source.value;
   if(source.localName!=='canvas'){const before=pseudo(source,'::before',ctx);if(before)clone.append(before);}
  }else if(source.namespaceURI===SVG&&['image','feImage'].includes(source.localName)){
   const href=source.getAttribute('href')||source.getAttributeNS(XLINK,'href');
   if(href&&!localFragment(href))ctx.tasks.push(embedResource(href).then(value=>{clone.setAttribute('href',value);if(clone.hasAttributeNS(XLINK,'href'))clone.setAttributeNS(XLINK,'xlink:href',value);}));
  }
  if(source.localName!=='canvas'&&source.localName!=='textarea')for(const child of Array.from(source.childNodes)){const next=cloneTree(child,ctx);if(next)clone.append(next);}
  if(source.namespaceURI===HTML&&source.localName!=='canvas'){const after=pseudo(source,'::after',ctx);if(after)clone.append(after);}
  return clone;
 }
 async function raster(markup,slot,signal){
  check(signal);const previous=rasterSlots.get(slot);if(previous?.markup===markup)return previous.image;
  const image=await new Promise((resolve,reject)=>{
   const img=new win.Image();pendingImages.add(img);let timer;
   const signals=[controller.signal,outerSignal,signal].filter(Boolean);
   const cleanup=()=>{clearTimeout(timer);img.onload=img.onerror=null;for(const s of signals)s.removeEventListener('abort',cancel);pendingImages.delete(img);};
   const cancel=()=>{cleanup();img.src='';reject(new DOMException('Capture cancelled.','AbortError'))};
   img.onload=()=>{cleanup();resolve(img)};
   img.onerror=()=>{cleanup();img.src='';reject(Error('The browser could not render this artwork for download.'))};
   for(const s of signals)s.addEventListener('abort',cancel,{once:true});
   timer=setTimeout(()=>{cleanup();img.src='';reject(Error('Rendering the artwork took too long. Try capturing a smaller view.'))},15000);
   img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(markup);
  });
  check(signal);if(previous)previous.image.src='';rasterSlots.set(slot,{markup,image});return image;
 }
 function fillCanvas(canvas,size){
  if(canvas.width!==size.width)canvas.width=size.width;if(canvas.height!==size.height)canvas.height=size.height;
  const context=canvas.getContext('2d');if(!context)throw Error('The browser could not prepare a capture canvas.');
  context.setTransform(1,0,0,1,0,0);context.globalAlpha=1;context.globalCompositeOperation='source-over';context.clearRect(0,0,size.width,size.height);
  if(background){context.fillStyle=background;context.fillRect(0,0,size.width,size.height);}
  context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';return context;
 }
 async function render({width,height,canvas=null,sceneCanvas=null,signal=null,appearance={}}={}){
  check(signal);
  if(!element.isConnected)throw Error('The visualization changed during capture. Start again on the new view.');
  const rect=element.getBoundingClientRect();if(!finite(rect.width)||!finite(rect.height))throw Error('Keep the captured visualization open until its download is ready.');
  const dims=width&&height?{width,height}:captureDimensions(element),size=rasterSize(dims.width,dims.height);
  canvas=canvas||doc.createElement('canvas');
  const sceneHost=sceneCanvas?(sceneElement||element.querySelector('#scene')||element.querySelector('canvas')?.parentElement):null;
  if(sceneCanvas&&(!sceneHost||(sceneHost!==element&&!element.contains(sceneHost))))throw Error('The 3D view is not ready for capture yet.');
  const sceneRect=sceneHost?.getBoundingClientRect();
  const omitAppearance=Object.entries(appearanceExclusions).filter(([key])=>appearance[key]===false).map(([,selector])=>selector).join(',');
  const scale=size.width/rect.width;
  const watermarkInset=appearance.watermark?60*Math.max(.15,Math.min(size.width/1200,size.height/180))/scale+8:0;
  const ctx={tasks:[],nodes:new Map(),scale,rawScene:!!sceneCanvas,sceneHost,omitAppearance,watermarkInset};
  // Snapshot styles and text synchronously, before awaiting assets or decoding.
  const clone=cloneTree(element,ctx);if(!clone)throw Error('Open the visualization before capturing it.');
  const isSvg=element.namespaceURI===SVG&&element.localName==='svg';
  if(isSvg){
   clone.setAttribute('xmlns',SVG);clone.setAttribute('width',String(size.width));clone.setAttribute('height',String(size.height));
   if(!clone.hasAttribute('viewBox'))clone.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);
   // Let the original preserveAspectRatio describe the engineering drawing.
   clone.style.width=size.width+'px';clone.style.height=size.height+'px';clone.style.margin='0';clone.style.maxWidth='none';clone.style.maxHeight='none';
  }else normalizeRoot(clone,rect);
  await Promise.all(ctx.tasks);check(signal);
  let backdrop,front;
  if(sceneCanvas){
   const sceneClone=ctx.nodes.get(sceneHost);if(!sceneClone)throw Error('The 3D view is not ready for capture yet.');
   const back=sceneBackground(clone,sceneClone);clearBackdrop(clone,sceneClone);
   [backdrop,front]=await Promise.all([raster(svgDocument(back,rect,size),'background',signal),raster(svgDocument(clone,rect,size),'foreground',signal)]);
  }else{
   const markup=isSvg?new XMLSerializer().serializeToString(clone):svgDocument(clone,rect,size);
   front=await raster(markup,'artwork',signal);
  }
  check(signal);const context=fillCanvas(canvas,size);
  if(backdrop)context.drawImage(backdrop,0,0,size.width,size.height);
  if(sceneCanvas){
   const sx=size.width/rect.width,sy=size.height/rect.height;
   context.drawImage(sceneCanvas,(sceneRect.left-rect.left)*sx,(sceneRect.top-rect.top)*sy,sceneRect.width*sx,sceneRect.height*sy);
  }
  context.drawImage(front,0,0,size.width,size.height);
  if(appearance.watermark)drawCaptureWatermark(context,size.width,size.height);
  if(!cleanChecked){
   try{context.getImageData(0,0,1,1);cleanChecked=true;}catch(error){canvas.width=size.width;throw Error('The browser blocked a non-local image in this capture. The view itself is unchanged.');}
  }
  return canvas;
 }
 function dispose(){
  if(disposed)return;disposed=true;controller.abort();outerSignal?.removeEventListener('abort',abortOuter);
  for(const item of rasterSlots.values())item.image.src='';for(const image of pendingImages)image.src='';rasterSlots.clear();resources.clear();pendingImages.clear();
 }
 return {render,dispose};
}

/** One-shot convenience for a standalone SVG schematic or plot. */
export async function snapshotSvg(svg,options={}){
 const capture=createArtworkCapture(svg,options);
 try{return await capture.render(options)}finally{capture.dispose()}
}
