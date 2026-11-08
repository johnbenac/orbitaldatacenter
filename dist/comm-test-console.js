import {commTestCases,runCommVerification,opticalOffsetAllowance} from './comm-verification.js';

const workbenches=new WeakMap();
const html=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const digits=v=>Number.isFinite(v)?Number(v.toFixed(3)).toLocaleString('en-US',{maximumFractionDigits:3}):String(v??'');
const testNames={sband:'S-band',ka:'Ka-band',optical:'Optical'};
const subtitles={sband:'Command & telemetry',ka:'Payload delivery',optical:'Pointing & acquisition'};

// The bay drawing shows the physical signal path. The numbered evidence
// list describes the procedure a team can carry out with that equipment.
const lineArt={
 rack:'<rect x="-24" y="-21" width="49" height="40" rx="3"/><rect x="-19" y="-16" width="39" height="14" rx="1"/><path d="M-16-8h6l3-5 4 8 4-5h12M-19 5H9m-28 7h28M-19 19v4m39-4v4"/><circle cx="17" cy="6" r="1.4"/><circle cx="17" cy="12" r="1.4"/>',
 patch:'<path d="m-25-11 34-9 18 10v22L-7 22l-18-11zm0 0 18 11 34-10M-7 0v22"/><path d="m1 3 18-5v10L1 13zM-20-6l8 5v11l-8-5zm-2 22-5 4m43-2 6 4"/><path d="m12-16-16 4 8 5 16-5z"/>',
 hood:'<path d="M-23 12v-20l8-11h27l10 11v20M-25 12h50M-18 12V-6h34v18m-29-26H7M-9 16v5h23m-35-9v5"/><rect x="-7" y="-4" width="13" height="11" rx="1"/>',
 recorder:'<rect x="-24" y="-19" width="48" height="37" rx="2"/><path d="M-20-13h40m-40 10h40m-40 10h40m-40 8h40"/><path d="M-15-9h16m-16 10H1m-16 10H1"/><circle cx="16" cy="-9" r="1"/><circle cx="16" cy="1" r="1"/><circle cx="16" cy="11" r="1"/>',
 radio:'<rect x="-22" y="-14" width="42" height="29" rx="2"/><path d="M-16-8v16m5-16v16m5-16v16m5-16v16m5-16v16M10-7h6m-6 6h6m-6 6h6M-25-5h3m-6 4h6M20-1h7v6h-7M-19 15v4m37-4v4"/>',
 optics:'<path d="M-24 16h51m-43 0 5-12m17 1 6 11M-16-8l24-9 13 8-2 13L-7 12-19 3z"/><ellipse cx="-13" cy="1" rx="6" ry="10" transform="rotate(-22 -13 1)"/><path d="m-1-7 12-4m-8 8 12-4m-8 8 10-3"/>',
 collimator:'<path d="M-24 16h49M-18 15v-8m23 8V5M-22-5l30-7 12 6v8L-10 9l-12-6zM-20-3l11 6 28-7"/><ellipse cx="17" cy="-3" rx="3" ry="6" transform="rotate(-16 17 -3)"/>',
 detector:'<rect x="-19" y="-17" width="38" height="30" rx="3"/><circle cy="-2" r="11"/><path d="M-8-2H8m-8-8v16m-8 7-6 6h28l-6-6"/><circle cy="-2" r="3"/>'
};
const rigs={
 sband:{icons:['rack','hood','patch'],names:['Ground command rack','RF hat / cable','Flight radio & computer'],paths:[['Command','right'],['Telemetry','left']]},
 ka:{icons:['recorder','radio','rack'],names:['Flight recorder','Ka transmitter / coupler','Ground decoder'],paths:[['Test frames','right'],['Received frames','right']]},
 optical:{icons:['collimator','optics','detector'],names:['Beacon simulator','Flight optical terminal','Bench detector'],paths:[['Beacon','right'],['Transmit spot','right']]}
};

function rigDrawing(id,running,r,step){
 const rig=rigs[id],xs=[62,246,430],split=id!=='sband';
 const paths=rig.paths.map(([label,direction],i)=>{
  const pair=split?i:0,across=!split;
  const a=xs[pair]+32,b=across?xs[2]-32:xs[pair+1]-32;
  const y=split?36:(i===0?27:49),right=direction==='right',tip=right?b:a,delta=right?-5:5;
  const segment=across?('M'+a+' '+y+'H'+(xs[1]-32)+'M'+(xs[1]+32)+' '+y+'H'+b):('M'+a+' '+y+'H'+b);
  // On the duplex bench the middle fixture interrupts the line. Label only
  // one of the two cable spans so the apparatus itself stays legible.
  const tx=across?(i===0?(a+xs[1]-32)/2:(xs[1]+32+b)/2):(a+b)/2;
  const check=id==='sband'?(i===0?1:3):id==='ka'?(i===0?1:2):(i===0?1:3);
  const status=r&&check<=step?r.stages[check].status:'pending';
  return '<g class="cv-wire '+(right?'out':'back')+'" data-wire-state="'+status+'"><path class="cv-wire-base" d="'+segment+'"/><path class="cv-wire-motion" d="'+segment+'"/><path class="cv-arrow" d="m'+(tip+delta)+' '+(y-3)+' '+(-delta)+' 3 '+delta+' 3"/><text x="'+tx+'" y="'+(i===1&&!split?y+12:y-8)+'">'+html(label)+'</text></g>';
 }).join('');
 const nodes=rig.icons.map((icon,i)=>'<g class="cv-station" transform="translate('+xs[i]+' 36)">'+lineArt[icon]+'</g><text class="cv-station-name" x="'+xs[i]+'" y="85">'+html(rig.names[i])+'</text>').join('');
 return '<svg class="cv-rig'+(running?' cv-energized':'')+'" viewBox="0 0 492 98" role="img" aria-label="'+html(testNames[id]+' ground test signal path. '+rig.names.join(', ')+'. '+rig.paths.map(p=>p[0]).join(' and ')+'.')+'">'+paths+nodes+'</svg>';
}

const decisionName=(s,id)=>s.records[id]?(s.records[id].applicable===false?'N/A':s.records[id].passed?'Pass':'Fail'):'Unrun';
function recordBar(s){
 const complete=Object.keys(s.records).length,pass=Object.values(s.records).filter(r=>r.passed).length;
 return '<span class="cv-record-count"><i aria-hidden="true"></i>'+complete+' of '+commTestCases.length+' run'+(complete?' · '+pass+' passed':'')+'</span>';
}
function selectors(s){
 return '<div class="cv-tabs" role="group" aria-label="Select a communications test">'+commTestCases.map(c=>{
  const selected=c.id===s.id,v=decisionName(s,c.id);
  return '<button type="button" data-cv-case="'+c.id+'" data-cv-band="'+c.id+'" aria-pressed="'+selected+'" aria-label="'+html(testNames[c.id]+' · '+subtitles[c.id]+' · '+v)+'"><svg viewBox="-30 -24 60 50" aria-hidden="true">'+lineArt[rigs[c.id].icons[c.id==='sband'?2:1]]+'</svg><span><b>'+testNames[c.id]+'</b><small>'+subtitles[c.id]+'</small></span><em class="cv-indicator '+v.toLowerCase()+'">'+(v==='Unrun'?'<i aria-hidden="true"></i>':v)+'</em></button>';
 }).join('')+'</div>';
}

function spot(offset,h){
 // The circle and offset use one angular scale. The transmit marker has a
 // minimum visible width; it indicates a centroid, not a laser beam waist.
 const limit=opticalOffsetAllowance(h),scale=Math.min(78/Math.max(offset,1),20/Math.max(limit??0,1)),dx=offset*scale;
 const ring=limit==null?'':'<circle class="cv-limit-ring" cx="89" cy="29" r="'+(limit*scale)+'"/>';
 const allowance=limit==null?'Installed residual exceeds the allocation':digits(Math.round(limit*10)/10)+' µrad allowable offset';
 return '<figure class="cv-spot"><svg viewBox="0 0 180 58" role="img" aria-label="Beacon at crosshair; transmit spot '+html(offset)+' microradians from center. '+html(allowance)+'."><path d="M7 29h165M89 3v52"/>'+ring+'<path class="cv-reference" d="M84 29h10m-5-5v10"/><circle class="cv-measured" cx="'+(89+dx)+'" cy="29" r="3.5"/></svg><figcaption><b>Transmit spot and allowable offset</b><span>'+html(digits(offset))+' µrad injected · '+html(allowance)+'</span></figcaption></figure>';
}
function plotted(trace,id){
 if(!trace||!trace.samples?.length)return '';
 let pts=trace.samples.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
 // Show the change in sign near the chosen condition, including the sweep
 // point just beyond it. The full requested setting range stays on the knob.
 const crossing=pts.find(p=>p.y<trace.limit),current=trace.current;
 if(crossing&&current){
  const far=1.3*Math.max(crossing.x,current.x),stop=pts.findIndex(p=>p.x>=far);
  if(stop>1)pts=pts.slice(0,stop+1);
 }
 if(pts.length<2)return '';
 const threshold=Number.isFinite(trace.limit)?trace.limit:null;
 const xmin=Math.min(...pts.map(p=>p.x)),xmax=Math.max(...pts.map(p=>p.x));
 let ymin=Math.min(...pts.map(p=>p.y),threshold??Infinity),ymax=Math.max(...pts.map(p=>p.y),threshold??-Infinity);
 const pad=Math.max((ymax-ymin)*.12,.01);ymin-=pad;ymax+=pad;
 const left=49,right=350,top=11,base=77,X=n=>left+(n-xmin)/Math.max(xmax-xmin,1e-9)*(right-left),Y=n=>base-(n-ymin)/(ymax-ymin)*(base-top);
 const ticks=[0,.5,1].map(f=>{const y=top+f*(base-top),v=ymax-f*(ymax-ymin);return '<path class="cv-rule" d="M'+left+' '+y+'H'+right+'"/><text x="'+(left-6)+'" y="'+(y+3)+'" text-anchor="end">'+html(digits(Math.round(v*10)/10))+'</text>'}).join('');
 const line=pts.map((p,i)=>(i?'L':'M')+X(p.x).toFixed(2)+' '+Y(p.y).toFixed(2)).join(' ');
 const target=threshold===null?'':'<path class="cv-cut" d="M'+left+' '+Y(threshold)+'H'+right+'"/>';
 const dot=trace.current?'<circle class="cv-trace-dot" cx="'+X(trace.current.x)+'" cy="'+Y(trace.current.y)+'" r="3.6"><title>Run setting '+html(digits(trace.current.x)+' '+trace.xUnit+', margin '+digits(trace.current.y)+' '+trace.yUnit)+'</title></circle>':'';
 return '<figure class="cv-plot"><figcaption><b>'+html(({sband:'Weaker radio margin',ka:'Receiver lock margin',optical:'Pointing-loss margin'}[id]||trace.yLabel)+' ('+trace.yUnit+')')+'</b>'+(threshold===null?'':'<small><i></i> Limit '+html(digits(threshold))+(trace.unit?' '+html(trace.unit):'')+'</small>')+'</figcaption><svg viewBox="0 0 362 102" role="img" aria-label="'+html(trace.yLabel+' against '+trace.xLabel+(threshold===null?'':', limit '+threshold)+'; numerical results listed alongside.')+'">'+ticks+target+'<path class="cv-trace" d="'+line+'"/>'+dot+'<text x="'+left+'" y="97">'+html(digits(xmin))+'</text><text x="'+((left+right)/2)+'" y="97" text-anchor="middle">'+html(trace.xLabel+' ('+trace.xUnit+')')+'</text><text x="'+right+'" y="97" text-anchor="end">'+html(digits(xmax))+'</text></svg></figure>';
}

function procedure(c,r,step){
 return '<ol class="cv-procedure" aria-label="Test procedure">'+c.stages.map((label,i)=>{
  const reviewed=r&&i<=step,item=reviewed?r.stages[i]:null,status=item?.status||'pending';
  return '<li data-stage="'+status+'"><span class="cv-step-no">'+(i+1)+'</span><div><b>'+html(item?.label||label)+'</b>'+(reviewed?'<small>'+html(item.detail)+'</small>':'')+'</div><em>'+({pass:'Pass',fail:'Fail',blocked:'Held',pending:'Planned',not_applicable:'N/A'}[status]||html(status))+'</em></li>';
 }).join('')+'</ol>';
}

const context={
 closeout:['Fixture removal','The checkout leads and optical shroud come off as mating begins. Return to the checkout stand to run another test.'],
 pad:['On the pad','The checkout fixtures are disconnected. The stack carries the flight radios into the countdown. Ground-test results travel with the launch handoff.'],
 ascent:['During ascent','The payload follows the launch vehicle through ascent. The flight team carries forward the communications checkout record.'],
 insertion:['At insertion','Separation makes the flight terminals available for commissioning. A later contact supplies the first opportunity to check the link with a real station in the simulation.']
};
function renderHandoff(host,s){
 const [where,desc]=context[s.chapter]||context.insertion;
 host.innerHTML='<div class="cv-handoff"><div><small class="cv-over">Phase D · communications handoff</small><h2>'+where+'</h2><p>'+desc+'</p><div class="cv-handoff-ledger">'+commTestCases.map(c=>'<span>'+testNames[c.id]+' <b>'+decisionName(s,c.id)+'</b></span>').join('')+'</div></div><button class="cv-secondary" type="button" data-cv-return>Open integration bench ↗</button></div>';
}

function render(host,s){
 if(s.chapter!=='integration'){renderHandoff(host,s);return}
 const c=commTestCases.find(t=>t.id===s.id),u=c.control,v=s.settings[c.id]??u.initial;
 const result=s.active?.result||s.records[c.id],running=!!s.active,step=running?s.active.step:result?c.stages.length:-1;
 host.innerHTML='<div class="cv-shell" data-cv-band="'+c.id+'"><header class="cv-header"><div><small class="cv-over">Phase D · integration facility</small><h2>Communications test bench</h2></div>'+recordBar(s)+'</header>'+selectors(s)+
 '<div class="cv-main"><div class="cv-illustration"><div class="cv-meta"><span>'+html(c.title)+'</span><small>Ground simulation</small></div><h3>'+html(c.question)+'</h3>'+rigDrawing(c.id,running,result,step)+(c.id==='optical'?spot(v,s.hardware):'')+'<p class="cv-setup">'+html(c.setup)+'</p><button type="button" class="cv-locate" data-cv-locate>Locate fixture in 3D ↗</button></div>'+
 '<div class="cv-control"><div class="cv-knob-title"><label for="cv-setting">'+html(u.label)+'</label><output for="cv-setting">'+html(digits(v)+' '+u.unit)+'</output></div><input id="cv-setting" type="range" min="'+u.min+'" max="'+u.max+'" step="'+u.step+'" value="'+v+'" aria-describedby="cv-help" aria-valuetext="'+html(v+' '+u.unit)+'"><p id="cv-help">'+html(u.help)+'</p><button class="cv-primary" type="button" '+(running?'data-cv-end':'data-cv-run')+'><span aria-hidden="true">'+(running?'»':'▷')+'</span> '+(running?'Show result now':result?'Run again':'Run test')+'</button><small class="cv-cue" data-cv-cue>'+html(running?'Stepping through the path…':result?(result.applicable===false?'Not applicable: flight equipment not installed.':result.passed?'Last run passed.':'Last run missed a criterion.'):'Ready to run')+'</small></div></div>'+
 '<div class="cv-plan"><div><h4>Acceptance criterion</h4><p>'+html(c.criterion)+'</p></div><div><h4>Test stimulus</h4><p>'+html(c.stimulus)+'</p></div></div>'+
 '<div class="cv-output" data-cv-output aria-live="polite" aria-atomic="false">'+evidence(c,result,step,running)+'</div>'+
 '<details class="cv-source"><summary>Test basis &amp; assumptions</summary><p>'+html(c.basis)+'</p><a href="'+html(c.source.url)+'" target="_blank" rel="noopener noreferrer">'+html(c.source.title)+' ↗</a><p>The acceptance limits are project assumptions. Flight teams record a baseline before environmental testing, repeat the relevant checks after vibration and thermal-vacuum exposure, and investigate changes before release. This bench supplies simulated evidence for the chosen condition.</p></details></div>';
}
function evidence(c,r,step,running){
 if(!r)return '<details class="cv-preview"><summary>View the four-step procedure</summary>'+procedure(c,null,-1)+'</details>';
 const finished=!running;
 return '<div class="cv-result"><div class="cv-result-head"><h4>'+(!finished?'Procedure in progress':'Test evidence')+'</h4><span class="cv-verdict '+(finished&&r.applicable!==false?(r.passed?'good':'bad'):'')+'">'+(!finished?'Step '+(step+1)+' / '+r.stages.length:r.applicable===false?'Not applicable':r.passed?'Criteria met':'Criteria missed')+'</span></div><p>'+html(finished?r.summary:r.stages[step]?.detail)+'</p></div>'+
 (finished?'<div class="cv-results-grid"><div>'+procedure(c,r,step)+'</div><div>'+plotted(r.trace,c.id)+'<dl class="cv-values">'+r.measurements.map(m=>'<div><dt>'+html(m.label)+'</dt><dd>'+html((typeof m.value==='number'?digits(m.value):m.value)+(m.unit?' '+m.unit:''))+'</dd></div>').join('')+'</dl></div></div>':procedure(c,r,step));
}
function stop(s){
 if(s.timer){clearTimeout(s.timer);s.timer=0}
 s.active=null;
}
function complete(host,s){
 if(!s.active)return;
 const r=s.active.result;s.records[r.id]=r;s.settings[r.id]=r.setting;stop(s);render(host,s);
 s.onChange?.(commTestWorksheet(host,s.hardware));
 host.querySelector('[data-cv-run]')?.focus({preventScroll:true});
}
function progress(host,s){
 if(s.captureHolds){s.timer=0;return}
 if(!s.active)return;
 if(s.active.step>=s.active.result.stages.length-1){complete(host,s);return}
 s.active.step++;
 const c=commTestCases.find(t=>t.id===s.id);
 host.querySelector('[data-cv-output]').innerHTML=evidence(c,s.active.result,s.active.step,true);
 host.querySelector('.cv-rig').outerHTML=rigDrawing(c.id,true,s.active.result,s.active.step);
 s.timer=setTimeout(()=>progress(host,s),640);
}
function bind(host){
 const s={hardware:null,chapter:null,id:'sband',records:{},settings:{},timer:0,active:null,attached:false};
 host.addEventListener('click',e=>{
  const el=e.target.closest('button');if(!el||!host.contains(el))return;
  if(el.hasAttribute('data-cv-return')){s.onReturn?.();return}
  if(s.chapter!=='integration'||!s.hardware)return;
  if(el.dataset.cvCase){stop(s);s.id=el.dataset.cvCase;s.onSelect?.(s.id);render(host,s);host.querySelector('[data-cv-case="'+s.id+'"]')?.focus({preventScroll:true});return}
  if(el.hasAttribute('data-cv-end')){complete(host,s);return}
  if(el.hasAttribute('data-cv-run')){
   const r=runCommVerification(s.hardware,s.id,s.settings[s.id]);
   stop(s);s.active={step:0,result:r};
   if(r.applicable===false){complete(host,s);return}
   if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){complete(host,s);return}
   render(host,s);host.querySelector('[data-cv-end]')?.focus({preventScroll:true});s.timer=setTimeout(()=>progress(host,s),640);
  }
 });
 host.addEventListener('input',e=>{
  if(e.target.id!=='cv-setting'||!s.hardware)return;
  const v=e.target.valueAsNumber;if(!Number.isFinite(v))return;
  const c=commTestCases.find(t=>t.id===s.id);
  stop(s);delete s.records[s.id];s.settings[s.id]=v;
  host.querySelector('output').textContent=digits(v)+' '+c.control.unit;e.target.setAttribute('aria-valuetext',v+' '+c.control.unit);
  host.querySelector('.cv-record-count').outerHTML=recordBar(s);host.querySelector('.cv-tabs').outerHTML=selectors(s);
  host.querySelector('[data-cv-output]').innerHTML=evidence(c,null,-1,false);
  host.querySelector('[data-cv-cue]').textContent='New condition · ready to run';
  host.querySelector('.cv-rig').outerHTML=rigDrawing(c.id,false,null,-1);
  if(c.id==='optical')host.querySelector('.cv-spot').outerHTML=spot(v,s.hardware);
  const b=host.querySelector('.cv-primary');b.removeAttribute('data-cv-end');b.setAttribute('data-cv-run','');b.innerHTML='<span aria-hidden="true">▷</span> Run test';
  s.onChange?.(commTestWorksheet(host,s.hardware));
 });
 workbenches.set(host,s);return s;
}
export function holdCommTestClock(host){
 const s=host&&workbenches.get(host);if(!s)return ()=>{};
 const active=s.active;s.captureHolds=(s.captureHolds||0)+1;
 clearTimeout(s.timer);s.timer=0;let released=false;
 return ()=>{
  if(released)return;released=true;s.captureHolds=Math.max(0,s.captureHolds-1);
  if(!s.captureHolds&&s.active&&s.active===active&&s.chapter==='integration'&&host.isConnected)s.timer=setTimeout(()=>progress(host,s),640);
 };
}
export function updateCommTestConsole(host,hardware,chapter='integration',onSelect=null,selectedId='sband',onReturn=null,restored=null,onChange=null){
 if(!host)return;
 const s=workbenches.get(host)||bind(host);
 s.onSelect=onSelect;s.onReturn=onReturn;s.onChange=onChange;
 if(!hardware){if(s.attached)stop(s);s.attached=false;host.hidden=true;return}
 const id=Object.hasOwn(testNames,selectedId)?selectedId:'sband',changed=s.hardware!==hardware;
 host.hidden=false;
 if(s.attached&&!changed&&s.chapter===chapter&&s.id===id)return;
 stop(s);
 if(changed){
  s.records={};s.settings={};s.hardware=hardware;
  if(Array.isArray(restored))for(const row of restored.slice(0,3)){
   const c=commTestCases.find(t=>t.id===row?.id);
   if(!c||!Number.isFinite(row.setting)||Object.hasOwn(s.settings,c.id))continue;
   const u=c.control,x=Math.min(u.max,Math.max(u.min,u.min+Math.round((row.setting-u.min)/u.step)*u.step));
   s.settings[c.id]=x;if(row.ran===true)s.records[c.id]=runCommVerification(hardware,c.id,x);
  }
 }
 s.chapter=chapter;s.id=id;s.attached=true;render(host,s);
}
function commTestWorksheet(host,hardware){
 const s=workbenches.get(host);if(!s||s.hardware!==hardware)return [];
 return commTestCases.filter(c=>Object.hasOwn(s.settings,c.id)).map(c=>({id:c.id,setting:s.settings[c.id],ran:!!s.records[c.id]}));
}
