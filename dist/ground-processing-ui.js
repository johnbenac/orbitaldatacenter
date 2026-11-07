import {GROUND_OPERATIONS,groundOperation,groundOperationForDomain,groundProcessingEnabled,groundProcessingState,PROCESSING_CAMPAIGN,PROCESSING_VERIFICATION,processingSources} from './ground-processing.js';
import {processingFacility} from './processing-facilities.js';

const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const number=(v,places=1)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:places}):'—';
const pct=v=>number(100*v,0)+'%';
const icons={
 environment:'<path d="M5 20V6h13v14M8 10h7m-7 4h7M22 7v13m-3-10h6m-6 5h6M3 23h24"/><circle cx="23" cy="4" r="1"/>',
 battery:'<rect x="3" y="7" width="23" height="16" rx="2"/><path d="M27 12h2v6h-2M15 9l-5 8h5l-1 4 6-8h-6z"/>',
 propellant:'<rect x="3" y="6" width="9" height="18" rx="4"/><rect x="18" y="6" width="9" height="18" rx="4"/><path d="M6 3h3v3m12-3h3v3M7 24v3h15v-3M12 14h6"/>',
 coolant:'<path d="M5 8h20v15H5zM10 8V4m10 4V4M10 23v4m10-4v4M9 12l4 7 4-7 4 7"/><path d="m2 12 3-4 3 4m14 7 3 4 3-4"/>',
 rf:'<path d="M7 25h16M15 25V14m-5 5 5-5 5 5M5 13a14 14 0 0 1 20 0M8 16a10 10 0 0 1 14 0M11 19a6 6 0 0 1 8 0"/>',
 optical:'<path d="M2 10h8v10H2zm8 5h13M24 7v16M20 15h8m-4-4v8"/><circle cx="24" cy="15" r="6"/>',
 metrology:'<path d="M3 24h24M15 4v20M5 11h20M7 11l-4 9h8zm16 0-4 9h8zM11 4h8"/>',
 closeout:'<rect x="5" y="5" width="20" height="23" rx="2"/><path d="M11 5V2h8v3M9 12h3m4 0h5M9 18h3m4 0h5M9 24h3m4 0h5"/>'
};
const tinyIcon=id=>'<svg viewBox="0 0 30 30" aria-hidden="true">'+icons[id]+'</svg>';
const sourceLink=(id,label)=>{const s=processingSources[id];return s?'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(label||s.title)+' ↗</a>':''};
const circuit=(path,key,color)=>'<g class="gp-circuit" data-gp-flow="'+key+'"'+(color?' style="--wire:'+color+'"':'')+'><path class="gp-wire-base" d="'+path+'"/><path class="gp-wire-motion" data-gp-motion d="'+path+'"/></g>';
const label=(x,y,text,cls='')=>'<text x="'+x+'" y="'+y+'" class="gp-svg-label '+cls+'">'+esc(text)+'</text>';
const leader=(path,x,y,text)=>'<path class="gp-leader" d="'+path+'"/>'+label(x,y,text);
const rack=(x,y,w=94,h=82)=>'<g class="gp-object"><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="5"/><rect x="'+(x+11)+'" y="'+(y+11)+'" width="'+(w-22)+'" height="23" rx="2"/><path d="M'+(x+15)+' '+(y+26)+'h13l4-8 6 12 5-6h'+Math.max(1,w-59)+'M'+(x+12)+' '+(y+48)+'h'+(w-38)+'m'+(38-w)+' 13h'+(w-38)+'"/><circle cx="'+(x+w-15)+'" cy="'+(y+49)+'" r="2"/><circle cx="'+(x+w-15)+'" cy="'+(y+62)+'" r="2"/><path d="M'+(x+12)+' '+(y+h)+'v8m'+(w-24)+'-8v8"/></g>';

function batteryDrawing(s){
 const q=s.quantities,fill=98*s.fill.battery;
 return '<defs><clipPath id="gp-battery-mask"><rect x="499" y="79" width="110" height="98" rx="7"/></clipPath></defs>'+rack(35,86,106,90)+
 '<g class="gp-object"><rect x="248" y="107" width="112" height="61" rx="5"/><path d="M266 126h17l7-8 7 15 6-8h36M268 151h12m8 0h12m8 0h12"/><rect x="248" y="24" width="112" height="47" rx="4"/><path d="M263 49h17l5-9 7 17 6-10h47"/></g>'+circuit('M141 137H248M360 137H499','power')+
 '<g class="gp-object"><rect x="495" y="75" width="118" height="106" rx="9"/><path d="M613 112h9v29h-9"/><rect class="gp-liquid" data-gp-fill="battery" x="499" y="'+(177-fill)+'" width="110" height="'+fill+'" clip-path="url(#gp-battery-mask)"/><path d="M520 75v106m23-106v106m23-106v106m23-106v106"/></g><path class="gp-sense" d="M554 75V47H360M304 71v36"/>'+label(88,207,'Ground power cart')+label(304,195,'Charge interface')+label(554,208,'Flight battery')+label(304,16,'Voltage / temperature monitor')+label(554,139,pct(q.socIllustrated),'gp-svg-value')+leader('M193 137v-32h-16',180,95,'Power')+leader('M426 47v28h-10',407,91,'Sense leads')+label(554,229,'Arrays remain stowed','gp-svg-muted');
}
function propellantDrawing(s){
 const fillTank=(id,x,f)=>'<clipPath id="gp-'+id+'-mask"><rect x="'+x+'" y="64" width="65" height="108" rx="27"/></clipPath><rect class="gp-liquid '+(id==='oxidizer'?'gp-oxidizer':'')+'" data-gp-fill="'+id+'" x="'+x+'" y="'+(172-108*f)+'" width="65" height="'+(108*f)+'" clip-path="url(#gp-'+id+'-mask)"/>';
 return '<rect class="gp-zone" x="413" y="30" width="226" height="169" rx="8"/>'+label(526,21,'SPACECRAFT PROPULSION MODULE','gp-svg-muted')+rack(32,50,100,63)+rack(32,149,100,63)+
 circuit('M132 82H284V96H450','fuel','#dfb274')+circuit('M132 180H327V150H567','oxidizer','#8bbfb7')+
 '<g class="gp-object"><rect x="450" y="64" width="65" height="108" rx="27"/><rect x="567" y="64" width="65" height="108" rx="27"/>'+fillTank('fuel',450,s.fill.fuel)+fillTank('oxidizer',567,s.fill.oxidizer)+'<path d="M475 64V48h15v16m102 0V48h15v16M475 172v15h15v-15m102 0v15h15v-15"/><path d="m276 88 8 8-8 8m16-16-8 8 8 8m27 38 8 8-8 8m16-16-8 8 8 8"/></g>'+label(81,39,'Fuel service cart')+label(81,237,'Oxidizer service cart')+label(482,125,'FUEL','gp-svg-value')+label(599,125,'OX','gp-svg-value')+leader('M284 81V45h-47',219,36,'Separate service ports')+leader('M327 164v43h-64',234,225,'Isolated circuits')+label(526,224,'No launch-vehicle fueling in this rehearsal','gp-svg-muted');
}
function coolantDrawing(){
 return rack(30,91,115,95)+'<rect class="gp-zone" x="412" y="47" width="227" height="157" rx="8"/>'+label(525,36,'SPACECRAFT FLUID LOOP','gp-svg-muted')+
 '<g class="gp-object"><rect x="243" y="91" width="85" height="91" rx="5"/><path d="M258 102v69m11-69v69m11-69v69m11-69v69m11-69v69m11-69v69"/><rect x="456" y="79" width="122" height="57" rx="4"/><path d="M470 88v39m14-39v39m14-39v39m14-39v39m14-39v39m14-39v39m14-39v39"/><circle cx="518" cy="173" r="13"/><path d="m513 165 12 8-12 8z"/></g>'+
 circuit('M145 111H243M243 161H175V161H145','coolant','#85b8cf')+circuit('M328 111H456M578 111h33v62H531M505 173H367V161H328','coolant','#9cc9b9')+label(87,217,'Thermal GSE')+label(286,214,'Heat exchanger')+label(517,69,'Cold plates')+label(520,228,'Pump / closed return loop')+leader('M359 111V72h15',348,61,'Flight coolant')+leader('M199 161v29h-3',196,207,'Secondary loop')+label(285,53,'Heat transfers; fluids stay separate','gp-svg-muted');
}
function rfDrawing(s){
 if(s.commBench==='ka')return rack(34,87,108,92)+rack(266,87,110,92)+rack(516,87,110,92)+'<rect class="gp-zone" x="239" y="64" width="164" height="139" rx="8"/>'+label(321,51,'CONDUCTED RF TEST PORT','gp-svg-muted')+circuit('M142 137H266M376 137H516','signal')+label(88,210,'Flight recorder')+label(321,228,'Ka transmitter / coupler')+label(571,210,'Ground receiver & decoder')+label(200,123,'Test frames')+label(446,123,'Downlink signal')+leader('M454 137v48h-8',445,202,'Approved attenuation')+label(570,57,'Decoded frames','gp-svg-muted');
 return rack(34,87,108,92)+rack(516,87,110,92)+'<rect class="gp-zone" x="245" y="64" width="151" height="139" rx="8"/>'+label(320,51,'CONTAINED RF PATH','gp-svg-muted')+'<g class="gp-object"><path d="M270 159v-46l13-20h74l13 20v46M270 113h100M282 159v-36h76v36M286 171h69"/><rect x="306" y="131" width="27" height="20" rx="3"/></g>'+circuit('M142 122H270M370 122H516','signal')+circuit('M516 153H370M270 153H142','signal')+label(88,210,'Ground command rack')+label(320,228,'Coupler / approved RF hat')+label(571,210,'Flight radio & computer')+label(199,110,'Command')+label(448,178,'Telemetry return')+leader('M397 81h55v-11',482,61,'No open-air transmission');
}
function opticalDrawing(s){
 const spot=22*(1-Math.min(1,Math.max(0,(s.progress-.25)/.5)));
 return '<rect class="gp-zone" x="188" y="47" width="455" height="157" rx="8"/>'+label(415,33,'ENCLOSED OPTICAL FIXTURE','gp-svg-muted')+'<g class="gp-object"><path d="M34 114h97v45H34zM56 159v22m53-22v22M23 181h120"/><ellipse cx="131" cy="136" rx="9" ry="23"/><path d="M287 112h117v48H287zm20 48-12 22m94-22 12 22M276 182h135"/><ellipse cx="287" cy="136" rx="11" ry="24"/><rect x="516" y="102" width="89" height="77" rx="5"/><circle cx="560" cy="140" r="26"/><path d="M530 140h60m-30-30v60"/></g>'+circuit('M140 136H276M404 136H528','signal')+'<circle class="gp-optical-spot" data-gp-spot cx="'+(560+spot)+'" cy="'+(140-spot*.4)+'" r="4"/>'+label(82,210,'Beacon simulator')+label(346,228,'Flight optical terminal')+label(560,228,'Bench detector')+label(211,119,'Beacon')+label(460,119,'Return spot')+leader('M626 62v-9h-1',578,76,'Shroud / interlocks');
}
function environmentDrawing(s){
 return '<rect class="gp-zone" x="272" y="39" width="366" height="164" rx="8"/>'+label(455,25,'CLEAN PROCESSING AREA','gp-svg-muted')+'<g class="gp-object"><rect x="30" y="94" width="141" height="87" rx="5"/><path d="m30 94 18-21h107l16 21M46 108h108M61 124h80m-80 13h48M55 181v10m89-10v10"/><rect x="397" y="69" width="117" height="123" rx="7"/><path d="M416 69v123m79-123v123M397 100h117m-117 62h117"/><rect x="565" y="113" width="50" height="67" rx="4"/><path d="M576 131h28m-28 12h28m-28 12h15M588 113V88h-14"/><rect x="306" y="159" width="52" height="26" rx="2"/><path d="M311 177h41"/></g><path class="gp-clean-boundary" d="M230 52v146"/><path class="gp-leader" d="M187 137h62m-9-6 9 6-9 6"/><path class="gp-scan" data-gp-scan d="M'+(292+326*s.progress)+' 51v140"/>'+label(99,219,'Transport enclosure')+label(230,36,'Clean boundary')+label(456,219,'Protected spacecraft')+label(591,198,'Particle monitor')+leader('M332 155V101h-23',320,86,'Witness surface')+label(460,244,'Receipt inspection and monitoring; no cleanliness score synthesized','gp-svg-muted');
}
function metrologyDrawing(s){
 return '<g class="gp-object"><path d="M74 123v81m-24 21 24-44 26 44M55 102h38v23H55z"/><rect x="262" y="61" width="211" height="116" rx="7"/><path d="M284 61v116m166-116v116M262 90h211m-211 57h211M242 178h251v17H242zM261 195v13h23v-13m167 0v13h23v-13"/><rect x="538" y="111" width="92" height="54" rx="4"/><path d="M550 128h68m-68 14h49"/></g><g class="gp-survey-lines"><path d="M94 113 262 61M94 113 262 177M94 113 473 61"/><path d="M262 45h211m-211-7v14m211-14v14M491 61v116m-7-116h14m-14 116h14"/></g><g data-gp-survey>'+[ [262,61],[262,177],[473,61],[473,177] ].map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="4"/>').join('')+'</g><path class="gp-sense" d="M474 204H519V140h19"/>'+label(76,244,'Survey instrument')+label(368,33,'Body datum & interface survey')+label(367,237,'Calibrated mass-properties fixture')+label(583,195,'Measurement record')+leader('M286 201v15h-47',215,230,'Load cells')+label(369,123,number(s.quantities.launchKg,0)+' kg','gp-svg-value')+label(367,143,'Installed launch mass · design value','gp-svg-muted');
}
function closeoutDrawing(s){
 return '<g class="gp-object"><rect x="280" y="53" width="132" height="140" rx="8"/><path d="M301 53v140m90-140v140M280 86h132m-132 74h132M300 193v15h92v-15"/><rect x="35" y="80" width="128" height="110" rx="5"/><path d="M54 100h91m-91 17h91m-91 17h91m-91 17h91m-91 17h57"/><rect x="511" y="79" width="128" height="111" rx="5"/><path d="M529 99h91m-91 18h91m-91 18h91m-91 18h67m-67 18h67"/></g><g class="gp-survey-lines"><path d="M163 135h117m132 0h99"/></g><g class="gp-closeout-markers">'+[[282,89],[412,110],[348,193],[346,53]].map(([x,y],i)=>'<circle data-gp-marker="'+i+'" cx="'+x+'" cy="'+y+'" r="6"/>').join('')+'</g>'+label(99,218,'Evidence & discrepancies')+label(346,235,'Controlled flight configuration')+label(575,218,'Joint provider handover')+label(346,25,'Every release remains open at PDR','gp-svg-muted');
}
const drawings={battery:batteryDrawing,propellant:propellantDrawing,coolant:coolantDrawing,rf:rfDrawing,optical:opticalDrawing,environment:environmentDrawing,metrology:metrologyDrawing,closeout:closeoutDrawing};
function diagram(s,op){return '<svg class="gp-diagram" viewBox="0 0 670 260" role="img" aria-label="'+esc(op.title+'. Conceptual ground-support interface schematic. '+op.purpose)+'">'+drawings[s.id](s)+'</svg>'}

function metrics(s){
 const q=s.quantities;
 const values={
  battery:[['Installed capacity',number(q.batteryKWh)+' kWh'],['Illustrated SOC',pct(q.socIllustrated)],['Configured launch target',pct(q.socTarget)],['Illustrated energy added',number(q.energyAddedKWh)+' kWh']],
  propellant:[['Fuel target',number(q.fuelKg)+' kg'],['Oxidizer target',number(q.oxidizerKg)+' kg'],['Illustrated loaded total',number(q.illustratedFuelKg+q.illustratedOxidizerKg)+' kg'],['Pressurant separate',number(q.pressurantKg)+' kg']],
  coolant:[['Installed fluid inventory',number(q.coolantKg)+' kg'],['Flight fluid',q.coolantName],['Heat rejection path','Isolated secondary loop']],
  rf:s.commBench==='ka'?[['Source','Flight test frames'],['Receiver','Conducted ground decoder'],['Observation','Frame integrity comparison']]:[['Outbound path','Command stimulus'],['Return path','Recorded telemetry'],['Emission mode','Conducted / contained']],
  optical:[['Stimulus','Enclosed beacon'],['Observation','Bench return spot'],['Evidence boundary','Static alignment only']],
  environment:[['Arrival record','Transport history'],['Contamination plan','Purge / covers / witnesses'],['Evidence state','Planned; unmeasured']],
  metrology:[['Installed launch mass',number(q.launchKg)+' kg'],['Predicted dry mass',number(q.dryKg)+' kg'],['Measurement uncertainty','To be allocated']],
  closeout:[['Verification package','Open'],['Configuration release','Open'],['Provider acceptance','Open']]
 }[s.id];
 return values.map(([title,value])=>'<div><dt>'+esc(title)+'</dt><dd>'+esc(value)+'</dd></div>').join('');
}
function context(h,op){
 const f=processingFacility(h),ids={environment:'clean-processing',battery:'battery-charging',propellant:'hazardous-fluid-servicing',coolant:'hazardous-fluid-servicing',rf:'rf-checkout',optical:'rf-checkout',metrology:'clean-processing',closeout:'encapsulation'};
 const c=f.capabilities?.find(c=>c.id===ids[op.id]);
 const status=op.id==='coolant'||op.id==='optical'||op.id==='metrology'?'Mission interface open':c?.status==='documented'?'Service documented · mission interface open':c?.status==='planned'?'Service planned · mission interface open':'Facility compatibility open';
 return '<div class="gp-venue"><span>'+esc(op.venue)+'</span><small>'+esc(f.shortName||f.name)+' · '+esc(status)+'</small></div>';
}
function campaign(){return '<ol class="gp-campaign" aria-label="Preliminary processing campaign">'+PROCESSING_CAMPAIGN.map((p,i)=>'<li><span>'+String(i+1).padStart(2,'0')+'</span><div><b>'+esc(p.title)+'</b><small>'+esc(p.place)+'</small></div></li>').join('')+'</ol>'}
function matrix(){return '<details class="gp-plan"><summary><span>PDR verification plan</span><small>6 evidence packages · all open</small></summary><p>GEVS calls for a verification plan and requirement-to-evidence matrix. The initial verification report supports PDR (§2.1.1.6); the prelaunch report and accepted results come later. Playback illustrates the work without creating test evidence.</p><div class="gp-table-wrap"><table><thead><tr><th scope="col">Evidence package</th><th scope="col">Method &amp; location</th><th scope="col">Required record</th><th scope="col">State</th></tr></thead><tbody>'+PROCESSING_VERIFICATION.map(v=>'<tr><th scope="row">'+esc(v.subject)+'<small>'+sourceLink(v.source,v.section)+(v.supportingSource?' · '+sourceLink(v.supportingSource,'Supporting reference'):'')+'</small></th><td>'+esc(v.method)+'<small>'+esc(v.venue)+'</small></td><td>'+esc(v.evidence)+'</td><td><span class="gp-open">Open</span></td></tr>').join('')+'</tbody></table></div><p>Environmental testing is planned at suitable factory or specialist facilities before shipment. Launch-site work preserves that evidence and performs the agreed receiving, functional, compatibility and configuration checks. Retest follows the approved plan and any discrepancy disposition.</p><div class="gp-plan-sources">'+sourceLink('gevs')+sourceLink('wallops')+sourceLink('wallopsTest')+sourceLink('astrotech')+'</div></details>'}
function viewState(h,s,view){
 const id=view.processingOperation||groundOperationForDomain(view.domain,view.commBench);
 return {...groundProcessingState(h,id,view.processingProgress||0,view.commBench),enabled:groundProcessingEnabled(s),playing:!!view.processingPlaying&&groundProcessingEnabled(s)};
}

export function renderGroundProcessing(h,s,view={}){
 const state=viewState(h,s,view),op=groundOperation(state.id,state.commBench),disabled=state.enabled?'':' disabled';
 return '<section class="gp-shell" data-gp-operation="'+op.id+'" data-gp-bench="'+(state.commBench||'')+'" style="--gp-accent:'+op.color+'"><header class="gp-header"><div><small class="gp-over">Phase D · integration facility</small><h2>Ground processing rehearsal</h2></div><span class="gp-plan-badge">PDR plan · evidence open</span></header><p class="gp-intro">Explore the equipment, interfaces and handoffs that prepare this spacecraft for launch.</p>'+campaign()+
 '<div class="gp-tabs" role="group" aria-label="Choose a processing rehearsal">'+GROUND_OPERATIONS.map(o=>'<button type="button" data-processing-operation="'+o.id+'" aria-pressed="'+(op.id===o.id)+'" style="--gp-tab:'+o.color+'">'+tinyIcon(o.id)+'<span>'+esc(o.shortTitle)+'</span></button>').join('')+'</div>'+
 '<div class="gp-main"><div class="gp-visual"><div class="gp-visual-title"><h3>'+esc(op.title)+'</h3><span>Interface schematic</span></div>'+context(h,op)+diagram(state,op)+'<dl class="gp-metrics" data-gp-metrics>'+metrics(state)+'</dl><p class="gp-figure-note">'+esc(op.id==='battery'?'Charge illustration starts at the configured SOC floor and approaches the launch target. This is stored energy, not a live battery reading.':op.id==='propellant'?'Illustrated inventories use the installed spacecraft design. Cart order is explanatory; the actual loading sequence and measured loads require approval.':op.id==='coolant'?'Conceptual thermal-GSE interface. Installed ammonia inventory comes from the design; facility and service-interface acceptance remain open.':'Schematic relationships and rehearsal motion are illustrative. Actual observations and approved acceptance limits belong in the verification record.')+'</p></div>'+
 '<div class="gp-stage-panel"><small class="gp-over">Rehearsal step <span data-gp-step-number>'+(state.stageIndex+1)+'</span> / '+op.stages.length+'</small><h4 data-gp-stage-title>'+esc(state.stage.title)+'</h4><p data-gp-stage-detail>'+esc(state.stage.detail)+'</p><ol class="gp-stages">'+op.stages.map((a,i)=>'<li data-gp-stage="'+i+'" data-active="'+(i===state.stageIndex)+'"><span>'+String(i+1).padStart(2,'0')+'</span><b>'+esc(a.title)+'</b></li>').join('')+'</ol><div class="gp-gate"><b>Planning gate</b><p>'+esc(op.gate)+'</p></div>'+(['rf','optical'].includes(op.id)?'<a class="gp-lab-link" href="#comm-test-console">Open detailed communications workbench ↓</a>':'')+'</div></div>'+
 '<div class="gp-playbar"><button type="button" class="gp-play" data-processing-play aria-pressed="'+state.playing+'"'+disabled+'><span aria-hidden="true">'+(state.playing?'Ⅱ':'▷')+'</span> '+(state.playing?'Pause rehearsal':state.progress>=1?'Replay rehearsal':'Play rehearsal')+'</button><button type="button" class="gp-reset" data-processing-reset'+disabled+'>Reset</button><label class="gp-seek"><span>Rehearsal progress</span><input type="range" min="0" max="100" step="0.5" value="'+(state.progress*100)+'" data-processing-seek aria-label="Rehearsal progress" aria-valuetext="'+pct(state.progress)+'; '+esc(state.stage.title)+'"'+disabled+'></label><output data-gp-progress>'+pct(state.progress)+'</output><span class="gp-clock-note">Normalized sequence · mission clock unchanged</span></div>'+
 '<div class="gp-context-message" data-gp-context '+(state.enabled?'hidden':'')+'><p>The spacecraft has left the checkout stand. Service connections are disconnected for handling.</p><button type="button" data-loading-at="-3600">Return to ground checkout ↗</button></div>'+matrix()+'<footer class="gp-source"><span>Operation basis · '+esc(op.section)+'</span>'+sourceLink(op.source)+'</footer></section>';
}

// Incremental updates retain keyboard focus, open details and the active slider.
// Paths are driven by the same progress used by the 3D scene, not a second timer.
export function refreshGroundProcessing(host,h,s,view={}){
 if(!host)return;
 const state=viewState(h,s,view),op=groundOperation(state.id,state.commBench);
 let shell=host.querySelector('.gp-shell');
 if(!shell||shell.dataset.gpOperation!==op.id||shell.dataset.gpBench!==(state.commBench||'')){
  host.innerHTML=renderGroundProcessing(h,s,view);shell=host.querySelector('.gp-shell');
  if(!shell||shell.dataset?.gpOperation!==op.id||shell.dataset?.gpBench!==(state.commBench||''))return;
 }
 const setText=(selector,value)=>{const el=host.querySelector(selector);if(el&&el.textContent!==value)el.textContent=value};
 setText('[data-gp-step-number]',String(state.stageIndex+1));setText('[data-gp-stage-title]',state.stage.title);setText('[data-gp-stage-detail]',state.stage.detail);setText('[data-gp-progress]',pct(state.progress));
 const stageKey=state.stageIndex+':'+state.enabled;
 if(shell.dataset.gpStage!==stageKey){host.querySelectorAll('[data-gp-stage]').forEach(el=>el.dataset.active=String(Number(el.dataset.gpStage)===state.stageIndex));shell.dataset.gpStage=stageKey}
 const play=host.querySelector('[data-processing-play]'),reset=host.querySelector('[data-processing-reset]'),seek=host.querySelector('[data-processing-seek]');
 if(play){const text=(state.playing?'Ⅱ Pause rehearsal':state.progress>=1?'▷ Replay rehearsal':'▷ Play rehearsal');if(play.textContent!==text)play.textContent=text;play.setAttribute('aria-pressed',String(state.playing));play.disabled=!state.enabled}
 if(reset)reset.disabled=!state.enabled;
 if(seek){if(Math.abs(Number(seek.value)/100-state.progress)>.001)seek.value=String(state.progress*100);seek.disabled=!state.enabled;seek.setAttribute('aria-valuetext',pct(state.progress)+'; '+state.stage.title)}
 const message=host.querySelector('[data-gp-context]');if(message)message.hidden=state.enabled;
 shell.dataset.gpPlaying=String(state.playing);shell.dataset.gpEnabled=String(state.enabled);
 host.querySelectorAll('[data-gp-flow]').forEach(el=>{const flow=state.enabled?(state.flow[el.dataset.gpFlow]||0):0;el.style.opacity=String(.22+.78*flow)});
 host.querySelectorAll('[data-gp-motion]').forEach(el=>el.setAttribute('stroke-dashoffset',String(-state.progress*480)));
 host.querySelectorAll('[data-gp-fill]').forEach(el=>{const key=el.dataset.gpFill,max=key==='battery'?98:108,base=key==='battery'?177:172,height=max*state.fill[key];el.setAttribute('height',height.toFixed(2));el.setAttribute('y',(base-height).toFixed(2))});
 const batteryValue=state.id==='battery'?host.querySelector('.gp-svg-value'):null;if(batteryValue)batteryValue.textContent=pct(state.quantities.socIllustrated);
 const spot=host.querySelector('[data-gp-spot]');if(spot){const d=22*(1-Math.min(1,Math.max(0,(state.progress-.25)/.5)));spot.setAttribute('cx',String(560+d));spot.setAttribute('cy',String(140-d*.4))}
 const scan=host.querySelector('[data-gp-scan]');if(scan)scan.setAttribute('d','M'+(292+326*state.progress)+' 51v140');
 host.querySelectorAll('[data-gp-marker]').forEach(el=>el.setAttribute('opacity',Number(el.dataset.gpMarker)===state.stageIndex?'1':'.25'));
 const metricKey=state.id+':'+Math.round(state.progress*200);
 if(shell.dataset.gpMetric!==metricKey){const holder=host.querySelector('[data-gp-metrics]');if(holder)holder.innerHTML=metrics(state);shell.dataset.gpMetric=metricKey}
}
