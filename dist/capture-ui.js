import {createArtworkCapture,captureDimensions} from './capture-artwork.js';
import {retainFile,fileSize} from './file-delivery.js';

// Preview and export share the displayed scene, its clock, and one compositor.
const surfaces=[
 {id:'scene',label:'3D view',host:'#viewer',source:'#viewport',scene:true},
 {id:'part',label:'Part view',host:'#part-viewer-panel',source:'#part-viewport',sceneElement:'#part-scene',scene:true},
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
const imageEdge=3840,videoEdge=1920,previewEdge=960,fps=30,maxBytes=256*1024*1024,maxSeconds=600;
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
const appearance=settings=>({leaders:settings.leaders,readouts:settings.readouts,axes:settings.axes,watermark:settings.watermark});
const sceneAppearance=settings=>({lighting:settings.lighting,exposureEV:settings.exposureEV,leaders:settings.leaders,vectors:settings.vectors,signals:settings.signals,guides:settings.guides,thermal:settings.thermal});

export function recordingType(Recorder=globalThis.MediaRecorder){
 if(!Recorder)return null;
 // Use the browser's real container and extension, including WebM on Firefox.
 return ['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>Recorder.isTypeSupported(type))||'';
}

export function installCaptureTools({getScene=()=>null,context=()=>({}),holdClock=()=>()=>{},onMessage=()=>{}}={}){
 let active=null,dialogJob=null,syncTimer=0,destroyed=false;
 const bars=new Map(),results=new Map(),errors=new Map();
 const videoAvailable=!!globalThis.MediaRecorder&&typeof HTMLCanvasElement.prototype.captureStream==='function';
 const dock=document.createElement('div');dock.className='capture-live';dock.hidden=true;dock.dataset.captureUi='';dock.dataset.captureExclude='';
 dock.innerHTML='<span class="capture-dot" aria-hidden="true"></span><div><b data-live-title>Recording</b><span data-live-detail></span></div><button type="button" data-capture-command="stop">Stop &amp; download</button>';
 const dialog=document.createElement('dialog');dialog.className='capture-dialog';dialog.dataset.captureUi='';dialog.dataset.captureExclude='';
 dialog.setAttribute('aria-labelledby','capture-dialog-title');dialog.setAttribute('aria-describedby','capture-dialog-summary');
 dialog.innerHTML=`<form class="capture-form">
  <header class="capture-dialog-head"><div><p class="capture-eyebrow" data-capture-surface></p><h2 id="capture-dialog-title" tabindex="-1"></h2><p id="capture-dialog-summary"></p></div><button type="button" class="capture-close" data-capture-command="cancel" aria-label="Close capture options" title="Cancel and return to the view"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
  <div class="capture-dialog-body">
   <section class="capture-preview-panel" aria-label="Capture preview">
    <div class="capture-preview-meta"><b>Preview</b><span data-preview-size></span></div>
    <div class="capture-preview-frame" aria-busy="true"><canvas data-preview-canvas role="img" aria-label="Preview with the selected capture settings" hidden></canvas><span class="capture-preview-empty">Preparing preview…</span></div>
    <p class="capture-preview-note" data-preview-note></p>
    <div class="capture-prior" hidden><div><b>Previous file</b><span data-previous-detail></span></div><a data-previous-file download>Download previous file unchanged</a></div>
   </section>
   <fieldset class="capture-settings"><legend>Export settings</legend>
    <label class="capture-field"><span>Resolution</span><select name="edge" data-capture-option title="Set the longest edge. The current view's proportions are preserved."></select><small data-output-size></small></label>
    <label class="capture-toggle capture-watermark" title="Include the Orbital Data Center name and website address"><input type="checkbox" name="watermark" data-capture-option checked><span><b>Watermark</b><small>Site name and address</small></span></label>
    <div class="capture-setting-group" data-lighting-settings hidden><h3>Lighting</h3>
     <label class="capture-field"><span>Light source</span><select name="lighting" data-capture-option title="Choose lighting for this capture"><option value="auto">Automatic</option><option value="realistic">Realistic</option><option value="studio">Studio</option></select></label>
     <label class="capture-field capture-exposure"><span>Exposure <output data-exposure-value>0 EV</output></span><input type="range" name="exposureEV" min="-2" max="2" step="0.25" value="0" data-capture-option title="Adjust capture brightness from −2 to +2 exposure stops"></label>
    </div>
    <div class="capture-setting-group capture-layers" data-layer-settings hidden><h3>Scene layers</h3>
     <label class="capture-toggle" data-option-row="leaders" title="Include component labels and their leader lines"><input type="checkbox" name="leaders" data-capture-option><span>Labels and leaders</span></label>
     <label class="capture-toggle" data-option-row="readouts" title="Include the current view title, mission readouts, and captions"><input type="checkbox" name="readouts" data-capture-option><span>View readouts</span></label>
     <label class="capture-toggle" data-option-row="axes" title="Include the coordinate axes in the corner of the view"><input type="checkbox" name="axes" data-capture-option><span>Coordinate axes</span></label>
     <label class="capture-toggle" data-option-row="vectors" title="Include the orbital velocity, Sun, and station direction arrows"><input type="checkbox" name="vectors" data-capture-option><span>Navigation vectors</span></label>
     <label class="capture-toggle" data-option-row="signals" title="Include the radio and laser signals already shown in this view"><input type="checkbox" name="signals" data-capture-option><span>Radio / laser signals</span></label>
     <label class="capture-toggle" data-option-row="guides" title="Include the guides already shown in this view"><input type="checkbox" name="guides" data-capture-option><span>Engineering guides<small>Include the guides already shown.</small></span></label>
     <label class="capture-toggle" data-option-row="thermal" title="Show the spacecraft's thermal colors"><input type="checkbox" name="thermal" data-capture-option><span>Thermal colors</span></label>
    </div>
   </fieldset>
  </div>
  <footer class="capture-dialog-foot"><div class="capture-dialog-status"><p data-preview-status role="status" aria-live="polite"></p><button type="button" data-capture-command="retry" hidden>Retry preview</button></div><div class="capture-dialog-actions"><button type="button" data-capture-command="cancel">Cancel</button><button type="submit" class="capture-primary" data-capture-primary disabled>Save PNG</button></div></footer>
 </form>`;
 document.body.append(dock,dialog);
 const form=dialog.querySelector('form'),settingsFieldset=dialog.querySelector('.capture-settings'),previewCanvas=dialog.querySelector('[data-preview-canvas]'),previewFrame=dialog.querySelector('.capture-preview-frame'),previewStatus=dialog.querySelector('[data-preview-status]'),primary=dialog.querySelector('[data-capture-primary]');
 const field=name=>form.elements.namedItem(name);

 function currentElement(def){return document.querySelector(def.source)}
 function route(){return String(context().workspace||'')}
 function filename(def,extension,info){return `ODC-${slug(info.domain||info.label)}-${def.id}-${new Date().toISOString().replace(/[:.]/g,'-')}.${extension}`}
 function assertActive(job,signal){
  if(destroyed||job.released||active!==job||job.controller.signal.aborted||signal?.aborted)throw abortError();
  if(scopeChanged(job)){if(job.phase==='recording')stopVideo('View changed');throw abortError();}
 }
 function makeBar(def){
  const bar=document.createElement('div');bar.className='capture-tools';bar.dataset.captureUi='';bar.dataset.captureExclude='';bar.dataset.captureFor=def.id;
  bar.setAttribute('role','group');bar.setAttribute('aria-label',`Capture ${def.label.toLowerCase()}`);
  bar.innerHTML='<span class="capture-label">'+(def.scene?'Capture view':'Capture graphic')+'</span><button type="button" data-capture-command="image" title="Preview and configure a PNG image before saving.">'+cameraIcon+'<span>Save image</span><small>4K</small></button><button type="button" data-capture-command="video" title="Preview and configure a video before recording. Up to 10 minutes per clip.">'+recordIcon+'<span>Record video</span></button><span class="capture-status" role="status" aria-live="polite"></span><button type="button" class="capture-file" data-capture-command="again" hidden>Save another…</button>';
  return bar;
 }
 function message(job,text){if(active!==job)return;job.message=text;paint();paintDialog(job)}
 function paint(){
  for(const def of surfaces){
   const bar=bars.get(def.id);if(!bar?.isConnected)continue;
   const image=bar.querySelector('[data-capture-command="image"]'),video=bar.querySelector('[data-capture-command="video"]'),status=bar.querySelector('.capture-status'),again=bar.querySelector('.capture-file');
   const owns=active?.def.id===def.id,recording=owns&&active.kind==='video'&&['recording','finishing'].includes(active.phase),scene=getScene(def),ready=!def.scene||!!scene&&(def.id!=='part'||scene.getState?.().available===true);
   image.disabled=!!active||!ready;
   video.disabled=!videoAvailable||!ready||!!active&&(!recording||active.phase==='finishing');
   const videoText=recording?'Stop & download':'Record video';
   if(video.querySelector('span').textContent!==videoText)video.innerHTML=(recording?stopIcon:recordIcon)+'<span>'+videoText+'</span>';
   video.classList.toggle('is-recording',recording);video.setAttribute('aria-pressed',String(recording));
   if(!videoAvailable)video.title='Video recording is unavailable in this browser. Image downloads are available.';
   const saved=results.get(def.id),text=owns?active.message:errors.get(def.id)||saved?.message||(!videoAvailable?'Video unavailable in this browser':'');
   if(status.textContent!==text)status.textContent=text;
   bar.classList.toggle('capture-busy',owns&&active.phase==='preparing');
   again.hidden=!saved;again.disabled=!!active||!ready;
   if(saved)again.title='Open capture options for another '+(saved.kind==='video'?'video':'image')+'. The previous file is also available there.';
  }
  const recording=active?.kind==='video'&&['recording','finishing'].includes(active.phase);dock.hidden=!recording;
  if(recording){
   dock.dataset.state=active.phase;
   dock.querySelector('[data-live-title]').textContent=active.phase==='finishing'?'Saving video':`Recording · ${elapsed((performance.now()-active.started)/1000)}`;
   dock.querySelector('[data-live-detail]').textContent=active.def.label;dock.querySelector('button').disabled=active.phase==='finishing';
  }
 }
 function paintDialog(job){
  if(dialogJob!==job||!dialog.open)return;
  const setup=job.phase==='setup',ready=setup&&job.previewReady>0&&job.previewReady===job.previewRevision;
  settingsFieldset.disabled=!setup;primary.disabled=!ready;
  primary.textContent=setup?(job.kind==='image'?'Save PNG':'Start recording'):(job.kind==='image'?'Saving image…':'Preparing video…');
  previewFrame.setAttribute('aria-busy',String(!ready));dialog.classList.toggle('capture-preview-pending',setup&&!ready&&!job.previewError);dialog.classList.toggle('capture-preview-error',!!job.previewError);
  previewStatus.textContent=setup?(job.previewError||(!ready?'Updating preview…':job.kind==='image'?'Ready to save.':'Ready to record. Playback resumes when recording starts.')):job.message;
  dialog.querySelector('[data-capture-command="retry"]').hidden=!setup||!job.previewError;
 }
 function scopeChanged(job){return job.route!==route()||!visible(currentElement(job.def))||job.def.scene&&job.scene!==getScene(job.def)}
 function sceneRevision(job){const value=job.scene?.captureStatus?.().revision;return Number.isFinite(value)?value:null}
 function refreshReadyPreview(job){
  if(active!==job||job.released||job.phase!=='setup'||!job.previewReady)return false;
  const revision=sceneRevision(job);
  if(revision===null||revision===job.previewSceneRevision)return false;
  queuePreview(job);return true;
 }
 function checkScope(){
  const job=active;if(!job||!scopeChanged(job))return;
  if(job.kind==='video'&&job.phase==='recording')stopVideo('View changed');else if(job.phase!=='finishing')cancelCapture(job);
 }
 function sync(){
  if(destroyed)return;
  for(const def of surfaces){
   const host=document.querySelector(def.host),source=currentElement(def);let bar=bars.get(def.id);
   if(!host||!source){bar?.remove();continue}
   if(!bar){bar=makeBar(def);bars.set(def.id,bar)}
   if(!host.contains(bar)){if(def.scene)host.querySelector('.panelhead')?.after(bar);else host.prepend(bar)}
   bar.hidden=!visible(source);
  }
  checkScope();paint();
 }
 function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(sync,50)}
 const observer=new MutationObserver(records=>{
  if(records.some(r=>!r.target.closest?.('[data-capture-ui]')&&(r.type==='attributes'||Array.from(r.addedNodes).concat(Array.from(r.removedNodes)).some(n=>n.nodeType===1&&!n.hasAttribute?.('data-capture-ui')))))scheduleSync();
 });
 document.addEventListener('parts-view-ready',scheduleSync);
 observer.observe(document.querySelector('main')||document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});

 function unlockClock(job){const unlock=job.releaseClock;job.releaseClock=null;unlock?.()}
 function closeDialog(job){
  if(dialogJob!==job)return;dialogJob=null;if(dialog.open)dialog.close();
  previewCanvas.hidden=true;previewCanvas.width=1;previewCanvas.height=1;if(destroyed)return;
  const fallback=bars.get(job.def.id)?.querySelector(`[data-capture-command="${job.kind}"]`),target=visible(job.invoker)&&!job.invoker.disabled?job.invoker:fallback;
  if(visible(target)&&!target.disabled)target.focus({preventScroll:true});
 }
 function disposeArtwork(state){state.art?.dispose();for(const name of ['raw','stage'])if(state[name]){state[name].width=1;state[name].height=1}}
 function release(job){
  if(job.released)return;job.released=true;clearTimeout(job.timer);clearInterval(job.statusTimer);clearInterval(job.scopeTimer);
  job.releaseSceneChange?.();job.previewController?.abort();job.controller.abort();
  if(job.recorder){job.recorder.onstop=null;job.recorder.onerror=null;job.recorder.ondataavailable=null;if(job.recorder.state!=='inactive')job.recorder.stop()}
  job.recordingSession?.release();job.stream?.getTracks().forEach(track=>track.stop());
  disposeArtwork(job.previewState);disposeArtwork(job.renderState);job.releaseDetail?.();job.appearanceSession?.release();unlockClock(job);
  if(job.output){job.output.width=1;job.output.height=1}job.chunks=[];
  if(active===job){active=null;sync()}closeDialog(job);
 }
 function cancelCapture(job=active){if(job)release(job)}
 function fail(job,error){
  if(job.released||destroyed||error?.name==='AbortError')return;
  const text=error?.message||'Capture could not finish. Please try again.';onMessage(text);errors.set(job.def.id,text);
 }
 function deliver(job,blob,extension,detail){
  if(job.released||destroyed)return;
  const file=retainFile(`capture-${job.def.id}-${extension}`,blob,filename(job.def,extension,job.info),detail);results.set(job.def.id,{file,message:detail,kind:job.kind,extension});
  const link=document.createElement('a');link.href=file.url;link.download=file.name;link.hidden=true;document.body.append(link);link.click();link.remove();
  onMessage(`${extension.toUpperCase()} ready. Save another… also contains a link to this file if you need it.`);
 }
 async function artwork(job,edge,{state=job.renderState,settings=job.settings,signal=job.controller.signal,preview=false}={}){
  assertActive(job,signal);const source=currentElement(job.def);if(!visible(source))throw Error('The capture view is no longer visible.');
  if(source!==state.element){state.art?.dispose();state.element=source;state.art=createArtworkCapture(source,{background:job.def.scene?'#080d16':'#17232b',sceneElement:job.def.scene?document.querySelector(job.def.sceneElement||'#scene'):undefined,signal:job.controller.signal})}
  const dimensions=captureDimensions(source,{maxEdge:edge,even:true});
  if(job.def.scene){
   if(job.recordingSession&&!preview){
    const frame=job.latestRaw;if(!frame)throw Error('Waiting for the first scene frame.');state.raw||=document.createElement('canvas');
    if(state.raw.width!==frame.width)state.raw.width=frame.width;if(state.raw.height!==frame.height)state.raw.height=frame.height;
    const copy=state.raw.getContext('2d');copy.clearRect(0,0,state.raw.width,state.raw.height);copy.drawImage(frame,0,0);
   }else state.raw=job.scene.captureFrame({...dimensions,canvas:state.raw});
   dimensions.width=state.raw.width;dimensions.height=state.raw.height;
   // The synchronous raw copy and restoration paint are complete. A later
   // scene request must not leave this async composition marked as current.
   if(preview)state.sceneRevision=sceneRevision(job);
  }
  state.stage=await state.art.render({...dimensions,canvas:state.stage,sceneCanvas:state.raw,signal,appearance:appearance(settings)});assertActive(job,signal);
  return state.stage;
 }
 function updateOutputSize(job){
  try{
   const requested=captureDimensions(currentElement(job.def),{maxEdge:job.settings.edge,even:true}),size=job.scene?.captureDimensions?.({...requested,video:job.kind==='video'})||requested;
   const width=job.kind==='video'?Math.max(2,Math.floor(size.width/2)*2):size.width,height=job.kind==='video'?Math.max(2,Math.floor(size.height/2)*2):size.height;
   dialog.querySelector('[data-output-size]').textContent=`${width} × ${height} px · original proportions`;
  }catch{}
  const ev=job.settings.exposureEV;dialog.querySelector('[data-exposure-value]').textContent=`${ev>0?'+':''}${Number(ev.toFixed(2))} EV`;field('exposureEV').style.setProperty('--pct',`${(ev+2)*25}%`);
 }
 async function renderPreviews(job){
  while(active===job&&!job.released&&job.phase==='setup'&&job.previewAttempted<job.previewRevision){
   const revision=job.previewRevision,settings={...job.settings},controller=new AbortController();job.previewController=controller;
   try{
    job.appearanceSession?.update(sceneAppearance(settings));await nextPaint();assertActive(job,controller.signal);
    if(revision!==job.previewRevision)continue;
    const frame=await artwork(job,previewEdge,{state:job.previewState,settings,signal:controller.signal,preview:true});
    if(revision===job.previewRevision&&dialogJob===job&&job.phase==='setup'){
     const captured=job.previewState.sceneRevision,current=sceneRevision(job);
     if(current!==null&&captured!==current){job.previewRevision++;job.previewReady=0;continue;}
     previewCanvas.width=frame.width;previewCanvas.height=frame.height;previewCanvas.getContext('2d').drawImage(frame,0,0);previewCanvas.hidden=false;dialog.querySelector('.capture-preview-empty').hidden=true;
     dialog.querySelector('[data-preview-size]').textContent=`${frame.width} × ${frame.height} px preview`;job.previewSceneRevision=current;job.previewReady=revision;job.previewError='';
    }
   }catch(error){
    if(active===job&&!job.released&&revision===job.previewRevision&&error?.name!=='AbortError'){
     job.previewError=error?.message||'The preview could not be prepared. Please try again.';dialog.querySelector('.capture-preview-empty').textContent='Preview unavailable';
    }
   }finally{job.previewAttempted=revision;if(job.previewController===controller)job.previewController=null;paintDialog(job)}
  }
 }
 function startPreviews(job){
  if(job.previewRun)return;
  job.previewRun=Promise.resolve().then(()=>renderPreviews(job)).finally(()=>{job.previewRun=null;if(active===job&&!job.released&&job.phase==='setup'&&job.previewAttempted<job.previewRevision)startPreviews(job)});
 }
 function queuePreview(job){
  if(active!==job||job.phase!=='setup'||job.released)return;
  // Finish both compositor raster slots before reusing their cached images.
  // Revision checks discard superseded previews; closing still aborts the job.
  job.previewRevision++;job.previewReady=0;job.previewError='';updateOutputSize(job);paintDialog(job);startPreviews(job);
 }
 function configureDialog(job,defaults){
  const source=currentElement(job.def),video=job.kind==='video';dialog.querySelector('[data-capture-surface]').textContent=job.def.label;
  dialog.querySelector('#capture-dialog-title').textContent=video?'Record video':'Save image';dialog.querySelector('#capture-dialog-summary').textContent=video?'Set the opening frame and appearance before recording.':'Adjust the preview, then save your image.';
  const type=video?recordingType():null,format=type?.startsWith('video/mp4')?'MP4':type?.startsWith('video/webm')?'WebM':'MP4 or WebM';
  dialog.querySelector('[data-preview-note]').textContent=video?`Opening frame held still during setup. ${format} · up to 30 fps · 10-minute maximum.`:'Playback is held still while you prepare and save this PNG.';
  field('edge').innerHTML=(video?[1280,1920]:[1920,2560,3840]).map(edge=>`<option value="${edge}">${edge.toLocaleString('en-US')} px long edge${edge===3840?' · 4K':''}</option>`).join('');
  for(const [name,value] of Object.entries(job.settings)){const control=field(name);if(!control)continue;if(control.type==='checkbox')control.checked=value;else control.value=String(value)}
  dialog.querySelector('[data-lighting-settings]').hidden=!job.def.scene||!defaults.lightingAvailable;
  const available={leaders:!!job.def.scene&&defaults.leadersAvailable!==false,readouts:!!job.def.scene&&!!source.querySelector('.scene-readouts,.viewtag,.imagestate,.viewcaption,.launch-location-badge'),axes:!!job.def.scene&&!!source.querySelector('.coordinate-triad'),vectors:!!defaults.vectorsAvailable,signals:!!defaults.signalsAvailable,guides:!!defaults.guidesAvailable,thermal:!!defaults.thermalAvailable};
  dialog.querySelector('[data-layer-settings]').hidden=!job.def.scene;
  for(const [name,show] of Object.entries(available))dialog.querySelector(`[data-option-row="${name}"]`).hidden=!show;
  const previous=results.get(job.def.id),prior=dialog.querySelector('.capture-prior');prior.hidden=!previous;
  if(previous){const link=prior.querySelector('a');link.href=previous.file.url;link.download=previous.file.name;link.title=previous.file.name;prior.querySelector('[data-previous-detail]').textContent=`${previous.message} · ${fileSize(previous.file.blob)}`;}
  previewCanvas.hidden=true;previewFrame.setAttribute('aria-busy','true');dialog.querySelector('[data-preview-size]').textContent='';
  const empty=dialog.querySelector('.capture-preview-empty');empty.hidden=false;empty.textContent='Preparing preview…';dialog.classList.remove('capture-preview-error');settingsFieldset.disabled=false;primary.disabled=true;updateOutputSize(job);
 }
 function openCapture(def,kind,invoker){
  if(active||destroyed||kind==='video'&&!videoAvailable)return;
  const job={def,kind,phase:'setup',message:'Configuring capture…',controller:new AbortController(),route:route(),info:{...context()},scene:def.scene?getScene(def):null,invoker:invoker||document.activeElement,previewState:{},renderState:{},previewRevision:0,previewAttempted:0,previewReady:0,previewError:'',chunks:[],bytes:0};
  active=job;errors.delete(def.id);
  try{
   if(def.scene&&!job.scene)throw Error('The 3D view is still preparing. Try again when it appears.');const defaults=job.scene?.captureSettings?.()||{};
   job.settings={edge:kind==='image'?imageEdge:videoEdge,watermark:true,leaders:defaults.leaders!==false,readouts:true,axes:true,lighting:['auto','realistic','studio'].includes(defaults.lighting)?defaults.lighting:'auto',exposureEV:Math.max(-2,Math.min(2,Number(defaults.exposureEV)||0)),vectors:defaults.vectors!==false,signals:defaults.signals!==false,guides:defaults.guides!==false,thermal:defaults.thermal===true};
   job.releaseClock=holdClock(def);configureDialog(job,defaults);dialogJob=job;dialog.showModal();dialog.querySelector('h2').focus({preventScroll:true});
   job.appearanceSession=job.scene?.beginCaptureAppearance?.(sceneAppearance(job.settings));
   job.releaseSceneChange=job.appearanceSession?.onChange?.(()=>refreshReadyPreview(job));
   job.scopeTimer=setInterval(checkScope,300);paint();queuePreview(job);
  }catch(error){fail(job,error);release(job)}
 }
 async function saveImage(job){
  try{
   assertActive(job);job.appearanceSession?.update(sceneAppearance(job.settings));await nextPaint();assertActive(job);let detailNote='';
   if(job.def.scene){
    const dimensions=captureDimensions(currentElement(job.def),{maxEdge:job.settings.edge,even:true});job.releaseDetail=job.scene.prepareCapture?.(dimensions);const deadline=performance.now()+20000;
    while(job.scene.captureStatus?.().loading&&performance.now()<deadline){message(job,'Loading full-resolution scene detail…');await pause(160,job.controller.signal)}
    const status=job.scene.captureStatus?.();if(status?.loading||status?.assetError)detailNote=' · current available imagery';
   }
   message(job,'Rendering PNG…');const canvas=await artwork(job,job.settings.edge);assertActive(job);const blob=await pngBlob(canvas);assertActive(job);deliver(job,blob,'png',`${canvas.width} × ${canvas.height} PNG${detailNote}`);
  }catch(error){fail(job,error)}finally{release(job)}
 }
 async function videoFrame(job){
  const frame=await artwork(job,job.settings.edge);assertActive(job);
  const ctx=job.output.getContext('2d',{alpha:false}),scale=Math.min(job.output.width/frame.width,job.output.height/frame.height),w=frame.width*scale,h=frame.height*scale;
  ctx.fillStyle='#080d16';ctx.fillRect(0,0,job.output.width,job.output.height);ctx.drawImage(frame,(job.output.width-w)/2,(job.output.height-h)/2,w,h);job.track?.requestFrame?.();
 }
 async function recordingLoop(job){
  if(active!==job||job.phase!=='recording')return;const start=performance.now();
  try{await videoFrame(job)}catch(error){if(active===job&&job.phase==='recording'){job.error=error;stopVideo('Recording interrupted')}return}
  if(job.phase!=='recording'||job.released)return;if((performance.now()-job.started)/1000>=maxSeconds){stopVideo('10-minute clip complete');return}
  job.timer=setTimeout(()=>recordingLoop(job),Math.max(16,1000/fps-(performance.now()-start)));
 }
 async function startVideo(job){
  try{
   assertActive(job);job.appearanceSession?.update(sceneAppearance(job.settings));await nextPaint();assertActive(job);
   const dimensions=captureDimensions(currentElement(job.def),{maxEdge:job.settings.edge,even:true});
   if(job.def.scene){
    job.recordingSession=job.scene.beginRecording({...dimensions,onFrame:canvas=>{job.latestRaw=canvas},onError:error=>{job.error=error;if(job.phase==='recording')stopVideo('Recording interrupted');else job.controller.abort()}});
    dimensions.width=Math.max(2,Math.floor(job.recordingSession.width/2)*2);dimensions.height=Math.max(2,Math.floor(job.recordingSession.height/2)*2);
    const deadline=performance.now()+10000;while(!job.latestRaw){if(performance.now()>deadline)throw Error('The 3D view could not provide a video frame.');await pause(40,job.controller.signal)}
   }
   job.output=document.createElement('canvas');job.output.width=dimensions.width;job.output.height=dimensions.height;await videoFrame(job);assertActive(job);
   job.stream=job.output.captureStream(0);job.track=job.stream.getVideoTracks()[0];
   if(typeof job.track?.requestFrame!=='function'){job.stream.getTracks().forEach(t=>t.stop());job.stream=job.output.captureStream(fps);job.track=job.stream.getVideoTracks()[0]}
   const mimeType=recordingType();job.recorder=new MediaRecorder(job.stream,{...(mimeType?{mimeType}:{}),videoBitsPerSecond:18000000});
   job.recorder.ondataavailable=e=>{if(!job.released&&e.data?.size){job.chunks.push(e.data);job.bytes+=e.data.size;if(job.bytes>=maxBytes&&job.phase==='recording')stopVideo('Clip size reached')}};
   job.recorder.onerror=e=>{job.error=e.error||Error('The browser stopped video encoding.');stopVideo('Recording interrupted')};
   job.recorder.onstop=()=>{
    if(job.released)return;
    try{
     const type=job.recorder.mimeType||mimeType||'video/webm',blob=new Blob(job.chunks,{type}),extension=type.startsWith('video/mp4')?'mp4':'webm';
     if(!blob.size)throw job.error||Error('The recording produced no frames. Please try a short recording again.');
     deliver(job,blob,extension,`${elapsed((performance.now()-job.started)/1000)} ${extension.toUpperCase()} · ${job.output.width} × ${job.output.height}${job.error?' · recording interrupted':''}`);
    }catch(error){fail(job,error)}finally{release(job)}
   };
   assertActive(job);job.recorder.start(1000);job.started=performance.now();job.phase='recording';job.message='Recording · 00:00';job.track?.requestFrame?.();
   unlockClock(job);paint();closeDialog(job);disposeArtwork(job.previewState);
   job.statusTimer=setInterval(()=>{if(job.phase==='recording'){job.message=`Recording · ${elapsed((performance.now()-job.started)/1000)}`;sync()}},500);recordingLoop(job);
  }catch(error){fail(job,job.error||error);release(job)}
 }
 function stopVideo(reason=''){
  const job=active;if(!job||job.kind!=='video'||job.phase==='finishing')return;
  if(job.phase!=='recording'){cancelCapture(job);return}
  job.phase='finishing';job.message='Finishing video download…';job.stopReason=reason;clearTimeout(job.timer);clearInterval(job.statusTimer);job.controller.abort();paint();
  if(job.recorder&&job.recorder.state!=='inactive')job.recorder.stop();else if(!job.recorder)release(job);
 }
 function submit(event){
  event.preventDefault();event.stopPropagation();const job=dialogJob;
  if(!job||active!==job||job.phase!=='setup'||job.previewReady!==job.previewRevision||!job.previewReady)return;
  if(scopeChanged(job)){cancelCapture(job);return}
  if(refreshReadyPreview(job))return;
  job.phase='preparing';message(job,job.kind==='image'?'Preparing high-resolution image…':'Preparing video…');if(job.kind==='image')saveImage(job);else startVideo(job);
 }
 function input(event){
  const control=event.target.closest('[data-capture-option]'),job=dialogJob;if(!control||!job||job.phase!=='setup')return;
  event.stopPropagation();const name=control.name,value=control.type==='checkbox'?control.checked:control.type==='range'||name==='edge'?Number(control.value):control.value;
  if(job.settings[name]===value)return;job.settings[name]=value;queuePreview(job);
 }
 function click(event){
  const button=event.target.closest('[data-capture-command]');if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();if(button.disabled)return;const command=button.dataset.captureCommand;
  if(command==='cancel'){cancelCapture();return}if(command==='retry'){if(dialogJob)queuePreview(dialogJob);return}if(command==='stop'){stopVideo();return}
  const def=surfaces.find(s=>s.id===button.closest('[data-capture-for]')?.dataset.captureFor);if(!def)return;
  if(command==='video'&&active?.def.id===def.id&&active.kind==='video'){stopVideo();return}
  openCapture(def,command==='again'?(results.get(def.id)?.kind||'image'):command,button);
 }
 function resize(){scheduleSync();if(dialogJob?.phase==='setup')queuePreview(dialogJob)}
 function visibility(){if(document.visibilityState==='hidden'&&active?.kind==='video'&&active.phase!=='setup')stopVideo('Tab left foreground')}
 function escape(event){if(event.key==='Escape')event.stopPropagation()}
 const stopPropagation=event=>event.stopPropagation();
 form.addEventListener('submit',submit);dialog.addEventListener('input',input);dialog.addEventListener('change',input);dialog.addEventListener('click',stopPropagation);dialog.addEventListener('keydown',escape);
 dialog.addEventListener('cancel',event=>{event.preventDefault();event.stopPropagation();cancelCapture(dialogJob)});dialog.addEventListener('close',()=>{if(!dialog.open&&dialogJob)cancelCapture(dialogJob)});
 document.addEventListener('click',click,true);document.addEventListener('visibilitychange',visibility);window.addEventListener('resize',resize);sync();
 return {refresh:sync,stop:stopVideo,destroy(){destroyed=true;observer.disconnect();clearTimeout(syncTimer);document.removeEventListener('click',click,true);document.removeEventListener('parts-view-ready',scheduleSync);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',resize);if(active)release(active);for(const bar of bars.values())bar.remove();dock.remove();dialog.remove()}};
}
