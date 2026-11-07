import {createArtworkCapture,captureDimensions} from './capture-artwork.js';
import {retainFile,fileSize} from './file-delivery.js';

// Capture the existing view and clock. No second simulation, editor, or screen-sharing permission.
const surfaces=[
 {id:'scene',label:'3D view',host:'#viewer',source:'#viewport',scene:true},
 {id:'schematic',label:'Subsystem schematic',host:'#diagram-host',source:'#diagram-host .sd-art'},
 {id:'processing',label:'Processing schematic',host:'#ground-processing',source:'#ground-processing .gp-diagram'},
 {id:'umbilical',label:'Umbilical schematic',host:'#pad-systems',source:'#pad-systems .ps-diagram'},
 {id:'test',label:'Test signal path',host:'#comm-test-console',source:'#comm-test-console .cv-rig'},
 {id:'response',label:'Power and thermal plots',host:'#attitude-history',source:'#attitude-history .ad-plots'},
 {id:'control',label:'Flight control graphics',host:'#discipline-host .fs-console',source:'#discipline-host [data-flight-readback]'}
];
const cameraIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h4l2-3h4l2 3h4v14H4Z"/><circle cx="12" cy="12" r="4"/></svg>';
const recordIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="12" height="14" rx="2"/><path d="m15 9 6-4v14l-6-4"/></svg>';
const stopIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
const imageEdge=3840,videoEdge=1920,fps=30,maxBytes=256*1024*1024,maxSeconds=600;
const abortError=()=>new DOMException('Capture cancelled.','AbortError');
const slug=v=>String(v||'mission').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);
const elapsed=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const visible=el=>!!(el?.isConnected&&!el.closest('[hidden]')&&el.getBoundingClientRect().width>1&&el.getBoundingClientRect().height>1);
const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const pause=(ms,signal)=>new Promise((resolve,reject)=>{
 if(signal?.aborted)return reject(abortError());
 const stop=()=>{clearTimeout(timer);reject(abortError())};
 const timer=setTimeout(()=>{signal?.removeEventListener('abort',stop);resolve()},ms);
 signal?.addEventListener('abort',stop,{once:true});
});
const pngBlob=canvas=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?.size?resolve(blob):reject(Error('The image could not be encoded. Please try again.')),'image/png'));

export function recordingType(Recorder=globalThis.MediaRecorder){
 if(!Recorder)return null;
 // The container/extension must follow the browser's encoder, rather than a renamed WebM.
 return ['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>Recorder.isTypeSupported(type))||'';
}

export function installCaptureTools({getScene=()=>null,context=()=>({}),holdClock=()=>()=>{},onMessage=()=>{}}={}){
 let active=null,syncTimer=0,destroyed=false;
 const bars=new Map(),results=new Map(),errors=new Map();
 const videoAvailable=!!globalThis.MediaRecorder&&typeof HTMLCanvasElement.prototype.captureStream==='function';
 const dock=document.createElement('div');dock.className='capture-live';dock.hidden=true;dock.dataset.captureUi='';dock.dataset.captureExclude='';
 dock.innerHTML='<span class="capture-dot" aria-hidden="true"></span><div><b data-live-title>Recording</b><span data-live-detail></span></div><button type="button" data-capture-command="stop">Stop &amp; download</button>';
 document.body.append(dock);

 function currentElement(def){return document.querySelector(def.source)}
 function route(){return String(context().workspace||'')}
 function filename(def,extension,info){return `ODC-${slug(info.domain||info.label)}-${def.id}-${new Date().toISOString().replace(/[:.]/g,'-')}.${extension}`}
 function makeBar(def){
  const bar=document.createElement('div');bar.className='capture-tools';bar.dataset.captureUi='';bar.dataset.captureExclude='';bar.dataset.captureFor=def.id;
  bar.setAttribute('role','group');bar.setAttribute('aria-label',`Capture ${def.label.toLowerCase()}`);
  bar.innerHTML='<span class="capture-label">'+(def.scene?'Capture view':'Capture graphic')+'</span><button type="button" data-capture-command="image" title="Download a PNG at up to 3840 pixels, using the current view and labels.">'+cameraIcon+'<span>Save image</span><small>4K</small></button><button type="button" data-capture-command="video" title="Record this view at up to 1920 pixels. Use the existing playback and camera controls. Up to 10 minutes per clip.">'+recordIcon+'<span>Record video</span></button><span class="capture-status" role="status" aria-live="polite"></span><a class="capture-file" hidden download></a><button type="button" class="capture-cancel" data-capture-command="cancel" hidden>Cancel</button>';
  return bar;
 }
 function message(job,text){if(active!==job)return;job.message=text;paint()}
 function paint(){
  for(const def of surfaces){
   const bar=bars.get(def.id);if(!bar?.isConnected)continue;
   const image=bar.querySelector('[data-capture-command="image"]'),video=bar.querySelector('[data-capture-command="video"]'),status=bar.querySelector('.capture-status'),link=bar.querySelector('a'),cancel=bar.querySelector('[data-capture-command="cancel"]');
   const owns=active?.def.id===def.id,recording=owns&&active.kind==='video',ready=!def.scene||!!getScene();
   image.disabled=!!active||!ready;
   video.disabled=!videoAvailable||!ready||!!active&&(!recording||active.phase==='finishing');
   const videoText=recording?(active.phase==='preparing'?'Cancel recording':'Stop & download'):'Record video';
   if(video.querySelector('span').textContent!==videoText){video.innerHTML=(recording?stopIcon:recordIcon)+'<span>'+videoText+'</span>'}
   video.classList.toggle('is-recording',recording);video.setAttribute('aria-pressed',String(recording));
   if(!videoAvailable)video.title='Video recording is unavailable in this browser. Image downloads are available.';
   const saved=results.get(def.id),text=owns?active.message:errors.get(def.id)||saved?.message||(!videoAvailable?'Video unavailable in this browser':'');
   if(status.textContent!==text)status.textContent=text;
   bar.classList.toggle('capture-busy',owns&&active.phase!=='recording');
   cancel.hidden=!(owns&&active.kind==='image');
   link.hidden=!saved||owns;
   if(saved){link.href=saved.file.url;link.download=saved.file.name;link.textContent='Download again';link.title=saved.file.name+' · '+fileSize(saved.file.blob)}
  }
  const recording=active?.kind==='video';dock.hidden=!recording;
  if(recording){
   dock.dataset.state=active.phase;
   dock.querySelector('[data-live-title]').textContent=active.phase==='preparing'?'Preparing video':active.phase==='finishing'?'Saving video':`Recording · ${elapsed((performance.now()-active.started)/1000)}`;
   dock.querySelector('[data-live-detail]').textContent=active.def.label;
   const stop=dock.querySelector('button');stop.disabled=active.phase==='finishing';stop.textContent=active.phase==='preparing'?'Cancel':'Stop & download';
  }
 }
 function sync(){
  if(destroyed)return;
  for(const def of surfaces){
   const host=document.querySelector(def.host),source=currentElement(def);
   let bar=bars.get(def.id);
   if(!host||!source){bar?.remove();continue}
   if(!bar){bar=makeBar(def);bars.set(def.id,bar)}
   if(!host.contains(bar)){
    if(def.scene)host.querySelector('.panelhead')?.after(bar);else host.prepend(bar);
   }
   bar.hidden=!visible(source);
  }
  if(active&&(active.route!==route()||!visible(currentElement(active.def)))){
   if(active.kind==='video')stopVideo('View changed');else active.controller.abort();
  }
  paint();
 }
 function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(sync,50)}
 const observer=new MutationObserver(records=>{
  if(records.some(r=>!r.target.closest?.('[data-capture-ui]')&&Array.from(r.addedNodes).concat(Array.from(r.removedNodes)).some(n=>n.nodeType===1&&!n.hasAttribute?.('data-capture-ui'))))scheduleSync();
 });
 observer.observe(document.querySelector('main')||document.body,{childList:true,subtree:true});

 function deliver(job,blob,extension,detail){
  const file=retainFile(`capture-${job.def.id}-${extension}`,blob,filename(job.def,extension,job.info),detail);
  results.set(job.def.id,{file,message:detail});
  const link=document.createElement('a');link.href=file.url;link.download=file.name;link.hidden=true;document.body.append(link);link.click();link.remove();
  onMessage(`${extension.toUpperCase()} ready. If the download did not start, use Download again.`);
 }
 function release(job){
  if(job.released)return;job.released=true;
  clearTimeout(job.timer);clearInterval(job.statusTimer);
  if(job.recorder){job.recorder.onstop=null;job.recorder.onerror=null;job.recorder.ondataavailable=null;if(job.recorder.state!=='inactive')job.recorder.stop()}
  job.recordingSession?.release();job.controller.abort();job.stream?.getTracks().forEach(track=>track.stop());job.art?.dispose();job.releaseDetail?.();job.releaseClock?.();
  if(job.raw){job.raw.width=1;job.raw.height=1}if(job.stage){job.stage.width=1;job.stage.height=1}
  if(job.output){job.output.width=1;job.output.height=1}
  job.chunks=[];
  if(active===job){active=null;sync()}
 }
 function fail(job,error){
  if(error?.name!=='AbortError'){
   const message=error?.message||'Capture could not finish. Please try again.';
   onMessage(message);errors.set(job.def.id,message);
   const bar=bars.get(job.def.id);if(bar)bar.querySelector('.capture-status').textContent=message;
  }
 }
 async function artwork(job,edge){
  if(job.controller.signal.aborted)throw abortError();
  const source=currentElement(job.def);if(!visible(source))throw Error('The capture view is no longer visible.');
  if(source!==job.element){job.art?.dispose();job.element=source;job.art=createArtworkCapture(source,{background:job.def.scene?'#080d16':'#17232b',sceneElement:job.def.scene?document.getElementById('scene'):undefined,signal:job.controller.signal})}
  const dimensions=captureDimensions(source,{maxEdge:edge,even:true});
  if(job.def.scene){
   const scene=getScene();if(!scene)throw Error('The 3D view is still preparing. Try again when it appears.');
   if(job.recordingSession){
    const frame=job.latestRaw;if(!frame)throw Error('Waiting for the first scene frame.');
    job.raw||=document.createElement('canvas');
    if(job.raw.width!==frame.width)job.raw.width=frame.width;if(job.raw.height!==frame.height)job.raw.height=frame.height;
    const copy=job.raw.getContext('2d');copy.clearRect(0,0,job.raw.width,job.raw.height);copy.drawImage(frame,0,0);
   }else job.raw=scene.captureFrame({...dimensions,canvas:job.raw});
   dimensions.width=job.raw.width;dimensions.height=job.raw.height;
  }
  job.stage=await job.art.render({...dimensions,canvas:job.stage,sceneCanvas:job.raw,signal:job.controller.signal});
  return job.stage;
 }
 async function saveImage(def){
  if(active)return;
  const job={def,kind:'image',phase:'preparing',message:'Preparing high-resolution image…',controller:new AbortController(),route:route(),info:{...context()}};
  errors.delete(def.id);active=job;paint();
  try{
   job.releaseClock=holdClock();await nextPaint();
   let detailNote='';
   if(def.scene){
    const scene=getScene();if(!scene)throw Error('The 3D view is still preparing. Try again when it appears.');
    const dimensions=captureDimensions(currentElement(def),{maxEdge:imageEdge,even:true});
    job.releaseDetail=scene.prepareCapture?.(dimensions);
    const deadline=performance.now()+20000;
    while(scene.captureStatus?.().loading&&performance.now()<deadline){
     message(job,'Loading full-resolution scene detail…');await pause(160,job.controller.signal);
    }
    const status=scene.captureStatus?.();
    if(status?.loading||status?.assetError)detailNote=' · current available imagery';
   }
   message(job,'Rendering PNG…');const canvas=await artwork(job,imageEdge);
   const blob=await pngBlob(canvas);if(job.controller.signal.aborted)throw abortError();
   deliver(job,blob,'png',`${canvas.width} × ${canvas.height} PNG${detailNote}`);
  }catch(error){fail(job,error)}finally{release(job)}
 }
 async function videoFrame(job){
  const frame=await artwork(job,videoEdge);
  if(job.controller.signal.aborted)throw abortError();
  const ctx=job.output.getContext('2d',{alpha:false}),scale=Math.min(job.output.width/frame.width,job.output.height/frame.height),w=frame.width*scale,h=frame.height*scale;
  ctx.fillStyle='#080d16';ctx.fillRect(0,0,job.output.width,job.output.height);
  ctx.drawImage(frame,(job.output.width-w)/2,(job.output.height-h)/2,w,h);
  job.track?.requestFrame?.();
 }
 async function recordingLoop(job){
  if(active!==job||job.phase!=='recording')return;
  const start=performance.now();
  try{await videoFrame(job)}catch(error){if(job.phase==='recording'){job.error=error;stopVideo('Recording interrupted')}return}
  if(job.phase!=='recording')return;
  if((performance.now()-job.started)/1000>=maxSeconds){stopVideo('10-minute clip complete');return}
  job.timer=setTimeout(()=>recordingLoop(job),Math.max(16,1000/fps-(performance.now()-start)));
 }
 async function startVideo(def){
  if(active||!videoAvailable)return;
  const job={def,kind:'video',phase:'preparing',message:'Preparing video…',controller:new AbortController(),route:route(),info:{...context()},chunks:[],bytes:0};
  errors.delete(def.id);active=job;paint();
  try{
   await nextPaint();
   const dimensions=captureDimensions(currentElement(def),{maxEdge:videoEdge,even:true});
   if(def.scene){
    const scene=getScene();if(!scene)throw Error('The 3D view is still preparing. Try again when it appears.');
    job.recordingSession=scene.beginRecording({...dimensions,onFrame:canvas=>{job.latestRaw=canvas},onError:error=>{job.error=error;if(job.phase==='recording')stopVideo('Recording interrupted');else job.controller.abort()}});
    dimensions.width=Math.max(2,Math.floor(job.recordingSession.width/2)*2);dimensions.height=Math.max(2,Math.floor(job.recordingSession.height/2)*2);
    const deadline=performance.now()+10000;
    while(!job.latestRaw){if(performance.now()>deadline)throw Error('The 3D view could not provide a video frame.');await pause(40,job.controller.signal)}
   }
   job.output=document.createElement('canvas');job.output.width=dimensions.width;job.output.height=dimensions.height;
   await videoFrame(job);
   job.stream=job.output.captureStream(0);job.track=job.stream.getVideoTracks()[0];
   if(typeof job.track?.requestFrame!=='function'){job.stream.getTracks().forEach(t=>t.stop());job.stream=job.output.captureStream(fps);job.track=job.stream.getVideoTracks()[0]}
   const mimeType=recordingType();
   job.recorder=new MediaRecorder(job.stream,{...(mimeType?{mimeType}:{}),videoBitsPerSecond:18000000});
   job.recorder.ondataavailable=e=>{if(e.data?.size){job.chunks.push(e.data);job.bytes+=e.data.size;if(job.bytes>=maxBytes&&job.phase==='recording')stopVideo('Clip size reached')}};
   job.recorder.onerror=e=>{job.error=e.error||Error('The browser stopped video encoding.');stopVideo('Recording interrupted')};
   job.recorder.onstop=()=>{
    try{
     const type=job.recorder.mimeType||mimeType||'video/webm',blob=new Blob(job.chunks,{type}),extension=type.startsWith('video/mp4')?'mp4':'webm';
     if(!blob.size)throw job.error||Error('The recording produced no frames. Please try a short recording again.');
     deliver(job,blob,extension,`${elapsed((performance.now()-job.started)/1000)} ${extension.toUpperCase()} · ${job.output.width} × ${job.output.height}${job.error?' · recording interrupted':''}`);
    }catch(error){fail(job,error)}finally{release(job)}
   };
   if(job.controller.signal.aborted)throw abortError();
   job.recorder.start(1000);job.started=performance.now();job.phase='recording';job.message='Recording · 00:00';job.track?.requestFrame?.();
   job.statusTimer=setInterval(()=>{if(job.phase==='recording'){job.message=`Recording · ${elapsed((performance.now()-job.started)/1000)}`;sync()}},500);
   paint();recordingLoop(job);
  }catch(error){fail(job,error);release(job)}
 }
 function stopVideo(reason=''){
  const job=active;if(!job||job.kind!=='video'||job.phase==='finishing')return;
  if(job.phase==='preparing'){job.controller.abort();return}
  job.phase='finishing';job.message='Finishing video download…';job.stopReason=reason;clearTimeout(job.timer);clearInterval(job.statusTimer);job.controller.abort();paint();
  if(job.recorder&&job.recorder.state!=='inactive')job.recorder.stop();
  else if(!job.recorder)release(job);
  // An encoder error may already have made it inactive; its final data and
  // stop event still own the chunks, so allow onstop to finish the download.
 }
 function click(event){
  const button=event.target.closest('[data-capture-command]');if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  const command=button.dataset.captureCommand;
  if(command==='cancel'){active?.controller.abort();return}
  if(command==='stop'){stopVideo();return}
  const def=surfaces.find(s=>s.id===button.closest('[data-capture-for]')?.dataset.captureFor);if(!def)return;
  if(command==='image')saveImage(def);else if(active?.def.id===def.id&&active.kind==='video')stopVideo();else startVideo(def);
 }
 function visibility(){if(document.visibilityState==='hidden'&&active?.kind==='video')stopVideo('Tab left foreground')}
 document.addEventListener('click',click,true);document.addEventListener('visibilitychange',visibility);window.addEventListener('resize',scheduleSync);
 sync();
 return {refresh:sync,stop:stopVideo,destroy(){destroyed=true;observer.disconnect();clearTimeout(syncTimer);document.removeEventListener('click',click,true);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',scheduleSync);if(active)release(active);for(const bar of bars.values())bar.remove();dock.remove()}};
}
