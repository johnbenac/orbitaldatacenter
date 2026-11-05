import {designTeaching} from './design-teaching.js';
import {flightTeaching} from './flight-teaching.js';
import {tradeTeaching} from './trade-teaching.js';
import {paintFieldGuide,referenceLesson} from './field-guide.js';
import {comparisonEvents,chooseComparison,compareMoments,eventOptions,eventMomentsMarkup} from './event-explorer.js';
import {orbitalLightingAvailable,cameraExposure} from './orbit-lighting.js';
import {hasLoadingDirector,loadingEnd,loadingPlayer,refreshLoadingPlayer} from './payload-loading.js';
import {INTEGRATION_TIMES} from './integration-sequence.js';
import {integrationProfile} from './integration-profiles.js';
import {bayLesson} from './bay-lessons.js';
import {createChoiceCues} from './choice-cues.js';
import {entryRoute,entryClock,tabCheckpoint} from './workspace-route.js';
const choiceCues=createChoiceCues();
let loadingPlayback=false;
import {bayCameraControls,bayGuide,bayEvidence,bayDisplayControls,facilityNotes} from './bay-view.js';
import {launchGuide,launchSequence,refreshLaunchGuide,showLaunchDirector,siteApproach} from './launch-director.js';
import {launchSitesFor,launchSiteFor} from './launch-sites.js';
import {activePointing,attitudeStrip,showAttitudeHistory,responseWindow,orbitResponse,refreshResponse,pointingApproach} from './flight-attitude-view.js';
import {DEPLOY_START_S,DEPLOY_END_S,DEPLOY_DURATION_S,deploymentMET} from './commissioning-clock.js';
import {commissioningGuide,commissioningTimeline,refreshCommissioning,nextDeploymentTime,deploymentReferences} from './deployment-view.js';
import {defaults,controls,presets,applyPreset,applyAIPurpose,missionStarter,missionStarterContextKeys,sizeDesign,inverseSolve,solveModes,enumeratePresets,estimateLife,checks,sources,assumptions,validateDesign,ageProperties,YEAR} from './design.js';
import {renderGyroBenchmark,renderAvionics,gyroCandidateDesign} from './flight-electronics.js';
import {renderMechanical,bindMechanical,updateMechanical} from './mechanical-design.js';
import {domainCoverage} from './domain-coverage.js';
import {renderArchitecture} from './architecture-view.js';
import {renderEquipmentList,bindEquipmentList} from './equipment-list.js';
import {createSimulation,modelNotes} from './model.js';
import {impactOfChange,displaySetting} from './design-impact.js';
import {helpButton,helpForElement,shortHint,helpBody,sourceGuideIndex} from './input-help-ui.js';
import {fieldGuidance} from './input-guidance.js';
import {aiPurposes} from './ai-purpose.js';
import {renderAIPurpose} from './ai-purpose-ui.js';
import {evaluateService,evaluateServiceAsync} from './ai-service.js';
import {conopsPurpose,studyHorizon,studyMenu,serviceSummary,sameMachineReport,transferDesk} from './purpose-studies.js';
import {renderLaunchFleet} from './launch-fleet-ui.js';
import {recommendedDomainCamera} from './domain-scene.js';
import {icon} from './icons.js';
import {vehicleDrawings} from './drawings.js';
import {pages,workspaceFor,colors,overlayNames,componentMap} from './workspaces.js';
import {encodeScenario,decodeScenario,scenarioBlob,telemetryBlob,makePacket,restoreFile,zipLibrary} from './exports.js';
import {aiDeploymentAudit} from './ai-deployment-audit.js';
import {deploymentAudit} from './deployment-audit.js';
import {surfaceAudit} from './surface-audit.js';
import {chapters} from './flight-chapters.js';
import {presetList,designName,presetShelf,missionPreset,parsePreset,addToShelf,readShelf,writeShelf,presetFileName} from './mission-presets.js';
import {domains,purposeDomainFields,purposeTradeKeys,purposeStageDescription,domainReadout,renderDomainReadout,renderDomainTrade} from './domain-analysis.js';
import {renderDisposalView} from './disposal-views.js';
import {domainIds,isEditable,domainNav,phaseA,observationCard,analysisControls,missionTotals,phaseHandoff} from './matrix-ui.js';
import {installHelp,explainMetric} from './tooltips.js';
import {phases,phaseFromView,chapterPhase,lifecycleNav,designOutput,flightChapters,sourceNote} from './lifecycle.js';
import {renderSubsystemDiagram,bindSubsystemDiagram,updateSubsystemDiagram} from './subsystem-diagrams.js';
import {thermalInspector,temperatureFacts,sanitizeTargets,boundFields,requirementResults} from './thermal-review.js';
import {thermalNodes} from './thermal-limits.js';
import {retainFile,preparedFile,fileLink,fileSize,saveWithPicker,releaseFiles} from './file-delivery.js';
const $=id=>document.getElementById(id), DAY=86400,clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const fmt=(x,n=2)=>Number.isFinite(x)?(x!==0&&Math.abs(x)<.001?x.toExponential(2):x.toLocaleString('en-US',{maximumFractionDigits:n})):(x==null?'—':String(x));
const compact=x=>Math.abs(x)>=1e6?(x/1e6).toFixed(2)+'M':Math.abs(x)>=1e5?(x/1000).toFixed(1)+'k':fmt(x,Math.abs(x)>=100?0:1);
const plus=(n)=>n>=0?'+'+fmt(n):fmt(n);
const clocks=t=>{const sec=Math.floor(Math.max(0,t)%DAY);return [Math.floor(sec/3600),Math.floor(sec/60)%60,sec%60].map(x=>String(x).padStart(2,'0')).join(':')};
const time=t=>t<0?'T−'+clocks(-t):'D'+String(Math.floor(t/DAY)+1).padStart(3,'0')+' '+clocks(t);
const cv={launch:['Launch configuration','rocket','04'],spacecraft:['Spacecraft','satellite','02'],orbit:['Earth Orbit','globe','01'],core:['Compute Core','cpu','03']};
const defaultView={phase:'A',domain:'conops',teachEvent:'',teachFolded:false,lighting:'realistic',exposureEV:0,deploymentLens:'vehicle',launchLens:'wide',bayLens:'overview',bayIsolate:true,bayLabels:true,bayBasis:false,bayClock:false,purposePreview:null,studyDays:0,tradeKey:null,tradeBase:null,presetName:null,detail:false,thermalNode:'junction',thermalScope:'window',thermalPadding:0,thermalScale:'working',thermalAuto:true,thermalTargets:{},cameraStates:null,camera:'spacecraft',t:7800,preset:'starter',starterPurpose:'text',starterContext:null,modified:false,chapter:'integration',instruments:false,start:0,scope:'day',mode:'size',solve:'installed',speed:30,event:null,overlays:[],inspect:null};
let view={...defaultView},input=missionStarter('text'),hardware,sim,result,snap,samples=[],daySamples=[],events=[],day={},life,plotStart=0,plotEnd=DAY,scene=null,playing=false,lastTick=0,toastId,rebuildId,daysig='',eventFilter='all',modal=null,pickedRow='',initialShared=false;
let orderJob=null,packetOrderAbort=null,lastOrder=null,landingReplay=null;const serviceCache=new WeakMap();
let initialChronology=false,help,referencePage=null,loadedPresets=[],tradeCache=null,tradeBusy=false,flightSyncError='',deferredFlightTime=null;
try{loadedPresets=readShelf(window.localStorage)}catch(err){toast('The saved mission shelf is unavailable: '+err.message)}

const controlByKey=Object.fromEntries(controls.map(c=>[c.key,c]));
const solverKeys={workload:['trayCount','solarM2','radiatorM2','batteryKWh','storageTB','propellantKg'],launch:['trayCount'],lifetime:['missionYears'],solar:['solarM2'],radiator:['radiatorM2'],battery:['batteryKWh'],propellant:['propellantKg'],supply:['yearsSupply'],storage:['storageTB'],link:['requiredLineMbps'],throughput:[]};
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('on');clearTimeout(toastId);toastId=setTimeout(()=>$('toast').classList.remove('on'),3400)}
function liveDate(t){return new Date(Date.parse(input.epoch)+t*1000).toISOString().slice(0,19).replace('T',' ')+' UTC'}
function starterContext(d){return Object.fromEntries(missionStarterContextKeys.map(k=>[k,d[k]]))}
const referenceIds=['architecture','equipment','sources','checks'];
function loadScenario(obj){
 if(obj?.schema!=='odc-scenario/1'||!obj.design||typeof obj.design!=='object')throw Error('Choose an Orbital Data Center scenario JSON or PDR package.');
 const h=sizeDesign(obj.design);if(h.errors.length)throw Error(h.errors[0]);
 const v=obj.view||{},domain=[v.domain,v.page,v.subsystem].find(k=>Object.hasOwn(domains,k))||'conops';
 input={...h.input};view={...defaultView,domain,phase:phaseFromView(v),preset:typeof v.preset==='string'?v.preset:'custom',presetName:typeof v.presetName==='string'?v.presetName.slice(0,64):null,modified:!!v.modified,
  starterPurpose:Object.hasOwn(aiPurposes,v.starterPurpose)?v.starterPurpose:h.input.aiPurpose,starterContext:v.preset==='starter'?starterContext(missionStarter(h.input.aiPurpose,v.starterContext??h.input)):null,
  bayLens:['equipment','interface','payload'].includes(v.bayLens)?v.bayLens:'overview',bayIsolate:v.bayIsolate!==false,bayLabels:v.bayLabels!==false,teachEvent:typeof v.teachEvent==='string'?v.teachEvent:'',teachFolded:!!v.teachFolded,bayBasis:!!v.bayBasis,bayClock:!!v.bayClock,lighting:v.lighting==='studio'?'studio':'realistic',exposureEV:cameraExposure(v.exposureEV),
  launchLens:['base','pad','ship'].includes(v.launchLens)?v.launchLens:'wide',deploymentLens:['vehicle','wing','hinge'].includes(v.deploymentLens)?v.deploymentLens:'vehicle',purposePreview:Object.hasOwn(aiPurposes,v.purposePreview)?v.purposePreview:null,studyDays:[1,7,30,60,90].includes(v.studyDays)?v.studyDays:0,detail:!!v.detail,instruments:!!v.instruments,thermalNode:thermalNodes.some(n=>n.id===v.thermalNode)?v.thermalNode:'junction',thermalScope:v.thermalScope==='mission'?'mission':'window',thermalScale:v.thermalScale==='full'?'full':'working',thermalAuto:v.thermalAuto!==false,thermalPadding:clamp(Number(v.thermalPadding)||0,0,100),thermalTargets:sanitizeTargets(v.thermalTargets),
  t:Number.isFinite(v.t)?Math.max(-3600,v.t):defaultView.t,start:Number.isFinite(v.start)?Math.max(0,v.start):0,scope:['day','now','mission'].includes(v.scope)?v.scope:'day',solve:Object.hasOwn(solveModes,v.solve)?v.solve:'installed',chapter:chapters.some(c=>c.id===v.chapter)?v.chapter:'operations',camera:Object.hasOwn(cv,v.camera)?v.camera:'spacecraft',cameraStates:v.cameraStates||null,
  overlays:Array.isArray(v.overlays)?v.overlays.filter(x=>Object.hasOwn(overlayNames,x)):[],speed:[1,10,30,120,600].includes(v.speed)?v.speed:30,event:v.event&&typeof v.event.label==='string'&&Number.isFinite(v.event.start)&&Number.isFinite(v.event.end)?v.event:null,inspect:typeof v.inspect==='string'?v.inspect:null,
  chronological:!!v.chronological,tradeKey:Object.hasOwn(controlByKey,v.tradeKey)?v.tradeKey:null};
 if(v.tradeBase&&typeof v.tradeBase==='object'){const b=sizeDesign(v.tradeBase);if(!b.errors.length)view.tradeBase=b.input}
 referencePage=referenceIds.includes(v.reference)?v.reference:null;playing=false;initialChronology=!!v.chronological;
}
function integrating(){return !referencePage&&view.phase==='D'&&snap?.flightPhase==='integration'}
function syncBayView(){
 scene?.setBayView?.(view.bayLens,view.bayLabels);
 scene?.setBayIsolation?.(view.bayIsolate);
}
function selectBayLens(key){
 if(!integrating()||!['overview','equipment','interface','payload'].includes(key))return;
 view.bayLens=key;view.camera='launch';draw();$('cameras').querySelector('[data-bay-lens="'+key+'"]')?.focus({preventScroll:true});
}
function commissioning(){return !referencePage&&view.phase==='E'&&view.chapter==='commissioning'}
function scenario(){return {schema:'odc-scenario/1',modelVersion:'14.0',design:input,view:{...view,reference:referencePage,cameraStates:scene?.getCameraState?.()||view.cameraStates,t:Math.round(view.t*1000)/1000}}}
const checkpoint=tabCheckpoint(window,location,scenario);
try{
 const restored=checkpoint.read()||(location.hash.startsWith('#design=')?decodeScenario(location.hash.slice(8)):null);
 if(restored){loadScenario(restored);initialShared=true}
}catch(e){toast(e.message)}
if(!initialShared){
 const q=new URLSearchParams(location.search);
 Object.assign(view,entryRoute(q));
 if(q.get('lighting')==='studio')view.lighting='studio';
 view.exposureEV=cameraExposure(q.get('exposure'));
 const chapter=chapters.find(item=>item.id===view.chapter&&q.get('chapter')===item.id);
 const p=presetList.find(x=>x.id===q.get('preset'));if(p){input={...p.design};view.preset=p.id}
 const goal=q.get('purpose');
 if(Object.hasOwn(aiPurposes,goal)){
  const useStarter=q.get('build')==='suggested'||(!p&&q.get('build')!=='current');
  input=applyAIPurpose(input,goal,useStarter);if(useStarter){view.preset='starter';view.starterPurpose=goal}else view.modified=true;
 }
 const requestedLV=q.get('launcher');
 if(Object.hasOwn(presets.launcher,requestedLV)){
  input=applyPreset(input,'launcher',requestedLV);input.launchSite=launchSiteFor(requestedLV,q.get('site')).id;
  if(view.phase==='D'&&!p)Object.assign(input,siteApproach(input).angles);
  view.modified=true;
 }
 if(!p&&!requestedLV&&(view.phase==='A'||view.phase==='D')&&!q.has('field'))input={...input,...siteApproach(input).angles};
 if(view.phase==='D'){view.speed=['ascent','pad'].includes(view.chapter)?1:30;view.launchLens=['base','pad','ship'].includes(q.get('lens'))?q.get('lens'):'wide';}
 if(['equipment','interface','payload'].includes(q.get('bay')))view.bayLens=q.get('bay');
 const preview=q.get('preview');if(Object.hasOwn(aiPurposes,preview))view.purposePreview=preview;
 const method=q.get('disposal');if(['graveyard','reentry'].includes(method)){input.disposalMethod=method;view.modified=view.modified||method!==defaults.disposalMethod}
 if(view.preset==='starter')view.starterContext=starterContext(input);
 view.camera=Object.hasOwn(cv,q.get('camera'))?q.get('camera'):view.chapter==='commissioning'?'spacecraft':chapter&&view.domain==='conops'?chapter.camera:view.phase==='D'&&view.chapter==='integration'?'launch':recommendedCamera(view.phase,view.domain);
}
function recalc(resolved=null,sample=true){
 landingReplay?.controller.abort();landingReplay=null;
 packetOrderAbort?.abort();orderJob?.abort();lastOrder=null;
 auditAbort?.abort();flightSyncError='';deferredFlightTime=null;tradeCache=null;view.chronological=false;
 result=resolved||inverseSolve(input,view.solve);hardware=result.hardware;view.aiPurpose=hardware.input.aiPurpose;sim=createSimulation(hardware);life=estimateLife(hardware);
 view.t=clamp(view.t,-3600,sim.duration);view.start=clamp(view.start,0,Math.max(0,sim.duration-DAY));
 daysig='';if(sample){refreshSamples();snap=sim.at(view.t)}
}
function refreshSamples(force=false){
 if(!force&&view.phase==='D'&&view.t< -600&&!view.detail&&!referencePage)return;
 const k=view.start+'|'+view.scope+'|'+(view.scope==='now'?Math.floor(view.t/1800):0);
 if(daysig===k)return;daysig=k;day=sim.daySummary(view.start);
 events=sim.events(view.start,Math.min(DAY,sim.duration-view.start));daySamples=sim.window(view.start,Math.min(DAY,sim.duration-view.start),145);
 if(view.scope==='mission'){samples=sim.mission(48);plotStart=0;plotEnd=sim.duration;
  const stats=sim.audit?.dayStats;if(stats)for(let i=0;i<samples.length;i++){const rows=stats.slice(Math.floor(i*stats.length/samples.length),Math.max(Math.floor(i*stats.length/samples.length)+1,Math.floor((i+1)*stats.length/samples.length)));if(rows.length){samples[i].minSocPct=Math.min(...rows.map(x=>x.minSocPct));samples[i].maxJunctionK=Math.max(...rows.map(x=>x.maxJunctionK));samples[i].peakQueueGB=Math.max(...rows.map(x=>x.peakQueueGB));samples[i].intervalContactSeconds=rows.reduce((a,b)=>a+b.contactSeconds,0);samples[i].intervalShadowSeconds=rows.reduce((a,b)=>a+b.shadowSeconds,0);}}}
 else if(view.scope==='now'){plotStart=clamp(Math.floor(view.t/1800)*1800-900,0,Math.max(0,sim.duration-3600));plotEnd=Math.min(sim.duration,plotStart+3600);samples=sim.window(plotStart,plotEnd-plotStart,91)}
 else{plotStart=view.start;plotEnd=Math.min(sim.duration,view.start+DAY);samples=daySamples}
}
function value(key,s=snap){return key[0]==='$'?hardware[key.slice(1)]:key[0]==='@'?hardware.input[key.slice(1)]:key[0]==='^'?day[key.slice(1)]:s?.[key]}
function hydrateIcons(root=document){root.querySelectorAll('[data-icon]').forEach(e=>{e.innerHTML=icon(e.dataset.icon,16)})}
function setNav(){$('nav').innerHTML=domainNav(view,referencePage);$('home').onclick=e=>{e.preventDefault();goPage('conops');switchPhase('A')}}
function goPage(k){clearTimeout(rebuildId);
 if(k===(referencePage||view.domain)){document.body.classList.remove('navshow');return}
 if(referenceIds.includes(k)){referencePage=k;playing=false}
 else{const id=k==='overview'?'conops':k;if(!Object.hasOwn(domains,id))return;referencePage=null;view.domain=id;view.detail=false;view.inspect=null;view.tradeKey=null;
  if(['C','D','E'].includes(view.phase))view.camera=integrating()?'launch':recommendedCamera(view.phase,id);}
 document.body.classList.remove('navshow');draw();window.scrollTo({top:0,behavior:'instant'});
}

function getPath(arr,w=100,h=30){if(!arr.length)return '';const lo=Math.min(...arr),hi=Math.max(...arr),span=hi-lo||1;return arr.map((v,i)=>(i?'L':'M')+(i*w/Math.max(1,arr.length-1)).toFixed(2)+' '+(h-2-(hi===lo?.5:(v-lo)/span)*(h-4)).toFixed(2)).join(' ')}
function kpis(){const overview=false,rows=workspaceFor(view.domain,hardware)?.metrics;if(!rows){$('kpis').hidden=true;return}$('kpis').hidden=false;
 const ico=overview?['cpu','sun','battery-charging','weight']:[pages[view.domain][1],'activity','gauge','clock-3'];const notes=overview?['Aggregate decode','Photovoltaic output','Of aged capacity','Current wet mass']:['Mission telemetry','Design readout','Mission telemetry','Design readout'];
 $('kpis').innerHTML=rows.map((row,i)=>{const [key,label,u]=row.split('|'),v=value(key),a=daySamples.map(s=>value(key,s)).filter(Number.isFinite);const path=getPath(a);const u2=key==='wetKg'&&overview?'t':u,r=key==='wetKg'&&overview?v/1000:v;return '<article tabindex="0" data-metric="'+esc(key)+'" data-label="'+esc(label)+'" data-unit="'+esc(u)+'" class="kpi" style="--accent:'+colors[i]+'"><div class="kpilabel"><span class="kpiicon">'+icon(ico[i],16)+'</span>'+label+'</div><div class="kpiread">'+esc(overview&&key==='wetKg'?fmt(r,2):compact(r))+' <small>'+esc(u2)+'</small></div><div class="kpinote">'+notes[i]+'</div>'+(path?'<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="'+path+'" fill="none" stroke="currentColor" stroke-width="1.45" vector-effect="non-scaling-stroke"/></svg>':'')+'</article>'}).join('');
}
function chooseCamera(k){
 if(!cv[k])return;view.camera=k;scene?.setView(k);syncThermalToggle();
 const bay=integrating(),local=bay&&k==='launch';
 if(bay)$('viewer-heading').textContent=local?'Integration facility':cv[k][0]+' · launch preparation';
 $('viewcode').textContent=local?'Integration bay':'VIEW '+cv[k][2];
 $('viewname').textContent=local?'':cv[k][0].toUpperCase();
 const buttons=['launch','orbit','spacecraft','core'].map(id=>'<button aria-pressed="'+(id===k)+'" class="camera '+(id===k?'selected':'')+'" data-camera="'+id+'">'+icon(cv[id][1],14)+(bay&&id==='launch'?'Integration bay':cv[id][0])+'</button>').join('');
 $('cameras').innerHTML=bay?bayCameraControls(view,buttons,cv[k][0]):buttons;
 const bar=$('bay-display');bar.hidden=!local;if(local)bar.innerHTML=bayDisplayControls(view);
}

function lock(key){return (solverKeys[view.solve]||[]).includes(key)||(!isEditable(view.phase)||key==='disposalMethod'&&view.phase!=='A')}
function inputRow(key,quick=false,scope=null){const c=controlByKey[key];if(!c)return '';const options=key==='launchSite'?Object.fromEntries(launchSitesFor(hardware.input.launcher).map(s=>[s.id,s.range+' · '+s.name])):c.options;const val=hardware.input[key],id=(scope?scope+'-':quick?'quick-':'param-')+key,disabled=lock(key)?' disabled':'',label=quick?({altitudeKm:'Orbital altitude',batteryKWh:'Battery capacity',solarM2:'Solar array area',trayCount:'Compute trays'}[key]||c.label):c.label;
 const hint=view.phase==='A'?helpButton(key,label):'';
 if(key==='aiPurpose')return '<div class="fieldbox"><div class="field-caption"><strong>Earth customer mission</strong>'+hint+'</div><button class="chip" data-open-purpose="'+esc(val)+'">'+esc(aiPurposes[val].label)+' ↗</button></div>';
 if(options)return '<div class="'+(quick?'qrow':'fieldbox')+'"><div class="field-caption"><label for="'+id+'">'+esc(label)+'</label>'+hint+'</div><select id="'+id+'" class="forminput fullwide" data-param="'+key+'"'+disabled+'>'+Object.entries(options).map(([v,l])=>'<option value="'+esc(v)+'" '+(val===v?'selected':'')+'>'+esc(l)+'</option>').join('')+'</select></div>';
 if(c.type==='date'||key==='epoch')return '';
 const fine=quick?({trayCount:64,altitudeKm:1200,solarM2:900,batteryKWh:250}[key]||c.max):c.max,max=Math.max(fine,val),pct=clamp((val-c.min)/(max-c.min)*100,0,100);
 return '<div class="'+(quick?'qrow':'fieldbox')+'"><div class="'+(quick?'qtop':'fieldhead')+'"><div class="field-caption"><label for="'+id+'">'+esc(label)+'</label>'+hint+'</div><span class="val"><input type="number" step="'+c.step+'" min="'+c.min+'" max="'+c.max+'" value="'+Number(val.toFixed(5))+'" data-param="'+key+'" aria-label="'+esc(label)+' numeric entry" style="width:'+Math.max(24,String(Number(val.toFixed(5))).length*7+7)+'px"'+disabled+'> '+esc(c.unit)+'</span></div><input id="'+id+'" type="range" data-param="'+key+'" min="'+c.min+'" max="'+max+'" step="'+c.step+'" value="'+val+'" style="--pct:'+pct+'%"'+disabled+'></div>';
}

const rowTable=(heads,body)=>'<div class="tablewrap"><table><thead><tr>'+heads.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table></div>';
const tr=(cells,attr='')=>'<tr '+attr+'>'+cells.map((v,i)=>'<td class="'+(i?'num':'')+'">'+v+'</td>').join('')+'</tr>';
const head=(label,ic,extra='')=>'<div class="panelhead"><h2><span class="headicon">'+icon(ic,16)+'</span>'+label+'</h2>'+extra+'</div>';
function drawChart(row,i){let [key,l,u]=row.split('|');if(view.scope==='mission'){const extremes={socPct:['minSocPct','Minimum SOC'],junctionK:['maxJunctionK','Hottest junction'],queueGB:['peakQueueGB','Peak queue']};if(extremes[key]){[key,l]=extremes[key]}}const vs=samples.map(s=>Number(value(key,s))||0),p=getPath(vs,400,90),low=Math.min(...vs),high=Math.max(...vs);return '<div class="chartbox" data-metric="'+esc(key)+'" data-label="'+esc(l)+'" data-unit="'+esc(u)+'" style="--c:'+colors[i%colors.length]+'"><div class="charttitle"><span>'+esc(l)+'</span><strong>'+fmt(['minSocPct','maxJunctionK','peakQueueGB'].includes(key)?(key==='minSocPct'?Math.min(...vs):Math.max(...vs)):value(key))+' '+esc(u)+'</strong></div><svg tabindex="0" data-chart="'+esc(key)+'" aria-label="'+esc(l+' chart in '+u)+'" viewBox="0 0 400 90" preserveAspectRatio="none"><path d="M0 1H400M0 45H400M0 89H400" fill="none" stroke="#303b48" stroke-dasharray="3 4"/><path d="'+p+' L400 90H0Z" fill="var(--c)" opacity=".055"/><path d="'+p+'" fill="none" stroke="var(--c)" stroke-width="1.45" vector-effect="non-scaling-stroke"/><line x1="'+clamp((view.t-plotStart)/(plotEnd-plotStart)*400,0,400)+'" x2="'+clamp((view.t-plotStart)/(plotEnd-plotStart)*400,0,400)+'" y1="0" y2="90" stroke="#dbd8cc" opacity=".7"/></svg><div class="chartscale"><span>'+fmt(low,3)+'–'+fmt(high,3)+' '+esc(u)+'</span><span>'+time(plotStart).slice(view.scope==='mission'?0:5,-3)+' → '+time(plotEnd).slice(view.scope==='mission'?0:5,-3)+'</span></div></div>'}
function powerHistory(){const keys=[['itKW','IT'],['storageKW','Storage'],['terminalKW','Terminal'],['pumpKW','Pumps'],['cmgKW','CMGs'],['jointKW','Joints'],['coilKW','Coils'],['auxKW','Auxiliary']],n=samples.length,scale=Math.max(1,...samples.map(s=>Math.max(s.loadKW,s.solarKW))),y=v=>114-110*v/scale,x=i=>500*i/(n-1),base=new Array(n).fill(0),pal=['#738bad','#b5a8de','#65c0ce','#6eaa88','#be91a2','#b59f78','#90a7b1','#a59688'];let body='';
 for(let j=0;j<keys.length;j++){const [k]=keys[j],next=base.map((v,i)=>v+(samples[i][k]||0));body+='<polygon points="'+next.map((v,i)=>x(i).toFixed(1)+','+y(v).toFixed(1)).concat(base.map((v,i)=>x(i).toFixed(1)+','+y(v).toFixed(1)).reverse()).join(' ')+'" fill="'+pal[j]+'"/>';next.forEach((v,i)=>base[i]=v)}
 const solar=samples.map((s,i)=>(i?'L':'M')+x(i).toFixed(1)+','+y(s.solarKW).toFixed(1)).join(' ');return '<div class="panelpad"><h3>Generation and bus loads</h3><div class="smalltitle">Stacked load · 0–'+fmt(scale,1)+' kW</div><svg data-chart="true" aria-label="Solar generation and itemized bus loads" viewBox="0 0 500 120" style="width:100%;height:120px" preserveAspectRatio="none">'+body+'<path d="'+solar+'" fill="none" stroke="#ffc76f" stroke-width="1.7" vector-effect="non-scaling-stroke"/></svg><div class="legend"><span><i style="--c:#ffc76f"></i>Solar generation</span>'+keys.map((r,i)=>'<span><i style="--c:'+pal[i]+'"></i>'+r[1]+'</span>').join('')+'</div></div>';
}
function drawStudy(){const p=view.domain,entry=workspaceFor(p,hardware),study=$('study');if(!entry){study.hidden=true;return}study.hidden=false;const scope={day:'24 HOURS',now:'LOCAL HOUR',mission:sim.audit?'CHRONOLOGICAL':'MISSION PREVIEW'}[view.scope];
 let charts='<div class="chartgrid">'+entry.charts.map(drawChart).join('')+'</div>';
 if(p==='power')charts=powerHistory()+charts;
 if(p==='mass')charts='<div class="panelpad"><button class="btn" data-domain="mechanical">'+icon('box',14)+' Inspect component centers of mass</button></div>'+charts;
 study.innerHTML=head(p==='mass'?'Mass through time':'Subsystem telemetry',pages[p][1],'<span class="metacode">'+scope+'</span>')+charts;
}
const eventColors={eclipse:'#596584',contact:'#75c9cc',burn:'#fbb875',reboost:'#ed9e64',trim:'#ed9e64',desat:'#b6a2db',burst:'#82ae9a',compute:'#82ae9a',deployment:'#d4a358',launch:'#edd4aa',separation:'#ac9fc3'};
function eventColor(type){return eventColors[type]||'#b3bdca'}
function activeEvents(){return view.scope==='day'?events:view.scope==='now'?sim.events(plotStart,plotEnd-plotStart):[]}
function timeline(){const ev=activeEvents(),span=plotEnd-plotStart,mission=view.scope==='mission';const pos=t=>clamp((t-plotStart)/span*1000,0,1000);let segs='<rect x="0" width="1000" y="4" height="16" fill="#ac8151" opacity=".85"/>';
 if(mission){segs='<path d="'+getPath(samples.map(s=>Number(s.minSocPct)||0),1000,37)+'" stroke="#7dc9bd" stroke-width="2" fill="none"/>'}
 else for(let i=0;i<ev.length;i++){const e=ev[i],y=e.type==='eclipse'?4:e.type==='contact'?25:e.type==='desat'?35:['burn','trim','reboost'].includes(e.type)?22:37,ht=e.type==='eclipse'?16:e.type==='contact'?7:4;segs+='<rect data-ei="'+i+'" x="'+pos(e.start)+'" y="'+y+'" width="'+Math.max(1.4,pos(e.end)-pos(e.start))+'" height="'+ht+'" fill="'+eventColor(e.type)+'"><title>'+esc(e.label)+' · '+time(e.start)+'</title></rect>'}
 let grid='';for(let i=0;i<=24;i++)grid+='<line x1="'+i*1000/24+'" x2="'+i*1000/24+'" y1="0" y2="45" stroke="#667684" opacity=".24" vector-effect="non-scaling-stroke"/>';
 const ticks=Array.from({length:7},(_,i)=>{const t=plotStart+span*i/6;return mission?fmt(t/YEAR,1)+' yr':view.scope==='day'&&i===6&&plotStart%DAY===0?'24:00':clocks(t).slice(0,5)});
 const tabs='<div class="tabbar">'+[['now','Now'],['day','24 hours'],['mission','Entire mission']].map(([k,l])=>'<button class="'+(view.scope===k?'selected':'')+'" data-scope="'+k+'">'+l+'</button>').join('')+'</div>';
 $('timeline').innerHTML='<section class="panel timeline">'+head('Mission timeline','activity',tabs)+'<div class="tlbody"><div class="legendrow"><div class="legend">'+(mission?'<span><i style="--c:var(--cyan)"></i>'+(sim.audit?'Daily minimum SOC · chronological':'Daily minimum SOC · representative-day preview')+'</span>':[['Sunlight','#c69865'],['Eclipse',eventColors.eclipse],['Ground contact',eventColors.contact],['Maneuver',eventColors.burn]].map(([l,c])=>'<span><i style="--c:'+c+'"></i>'+l+'</span>').join(''))+'</div><span class="elap" id="timecode">'+time(view.t)+'</span></div><div class="timelineplot"><div class="tracks" tabindex="0" role="slider" aria-label="Mission cursor" aria-valuemin="'+plotStart+'" aria-valuemax="'+plotEnd+'" aria-valuenow="'+Math.floor(view.t)+'"><svg viewBox="0 0 1000 45" preserveAspectRatio="none">'+segs+grid+'</svg><i class="cursor" style="left:'+clamp((view.t-plotStart)/span*100,0,100)+'%"></i></div><div class="tickrow">'+ticks.map(t=>'<span>'+t+'</span>').join('')+'</div></div></div><div class="tlfoot"><div class="playctrl"><button class="iconbtn playbtn" data-action="play" aria-label="'+(playing?'Pause':'Play')+'">'+icon(playing?'pause':'play',15)+'</button><select id="speed" class="smselect" aria-label="Playback speed">'+[1,10,30,120,600].map(v=>'<option value="'+v+'" '+(view.speed===v?'selected':'')+'>'+v+'×</option>').join('')+'</select></div><button class="textbutton" data-action="window" title="Set mission time or window">'+icon('clock-3',12)+' Window</button><div class="agebox"><button class="iconbtn" data-action="prev" aria-label="Previous day">'+icon('chevron-left',14)+'</button><span>Day '+(Math.floor(view.start/DAY)+1)+'</span><button class="iconbtn" data-action="next" aria-label="Next day">'+icon('chevron-right',14)+'</button></div></div></section>';
}
function ledger(){const entry=workspaceFor(view.domain,hardware);if(!entry)return '';
 if(view.domain==='mass')return '<section class="panel lowerpan">'+head('Launched mass ledger','chart-no-axes-column-increasing','<span class="metacode">CLICK TO INSPECT</span>')+rowTable(['Allocation','Classification','Mass · kg','Share'],hardware.massLedger.map((r,i)=>tr(['<i class="swatch" style="background:'+colors[i%colors.length]+'"></i>'+esc(r.label),esc(r.group),fmt(r.kg),fmt(100*r.kg/hardware.launchKg)+'%'],'data-inspect="'+r.id+'"')).join(''))+'</section>';
 const read=v=>{const [k,l,u]=v.split('|');return tr([esc(l),esc(fmt(value(k),4))+' '+esc(u)],'tabindex="0" data-metric="'+esc(k)+'" data-label="'+esc(l)+'" data-unit="'+esc(u)+'"')};let add='';
 if(view.domain==='power')add='<div class="panelpad"><h3>Bus load breakdown</h3>'+[['itKW','Compute'],['storageKW','Storage'],['terminalKW','Terminals'],['pumpKW','Pumps'],['cmgKW','CMGs'],['jointKW','Joints'],['coilKW','Magnetic coils'],['auxKW','Auxiliary loads']].map(([k,l],i)=>'<div class="loadrow"><span>'+l+'</span><div><b style="width:'+clamp(100*snap[k]/Math.max(.01,snap.loadKW),0,100)+'%;background:'+colors[i%6]+'"></b></div><strong>'+fmt(snap[k],3)+' kW</strong></div>').join('')+'</div>';
 if(view.domain==='thermal')add='<div class="panelpad shellbudget"><h3>Equipment enclosure</h3><p>Six closed structural faces carry '+fmt(hardware.enclosure.coveredAreaM2,2)+' m² of insulation. Coolant crosses the bulkheads through fitted penetrations. The chip-to-radiator path carries the compute load while the wall model accounts for heat that escapes or enters through the blanket and fittings.</p><div class="chips"><button class="chip" data-inspect="enclosure">Inspect the walls</button><button class="chip" data-action="coreview">Open the cutaway</button></div></div><div class="heatflow">'+[['junctionK','Junction'],['coldPlateK','Cold plate'],['coolantK','Coolant'],['radiatorK','Radiator']].map(([k,l])=>'<span>'+l+'<b>'+fmt(snap[k],1)+' K</b></span>').join('<i>→</i>')+'</div>';
 if(view.domain==='launch')add='<div class="panelpad"><button class="btn" data-action="fairingcompare">'+icon('ruler',14)+' Compare launcher envelopes</button></div>'+vehicleDrawings(hardware)+'<div class="panelpad"><div class="callout"><b>'+esc(hardware.launcherLabel)+'</b> · '+(hardware.fit?'Fits the assumed stowed envelope':'Stowed geometry exceeds the assumed envelope')+'. Mass-only lower bound '+Math.ceil(hardware.launchKg/Math.min(hardware.input.launchAllowanceKg,hardware.input.referenceKg))+' launch(es). '+(hardware.launchScreenFeasible?'One vehicle and its adapter make up the manifest.':'A multi-launch assembly manifest has not been modeled.')+'</div><button class="chip gap" data-action="launchseq">'+icon('play',12)+' View insertion sequence</button></div>';
 if(view.domain==='comm')add='<div class="panelpad"><div class="smalltitle">Installed terminals</div><div class="chips gap"><span class="tag">S-BAND / tracking, telemetry and command</span><span class="tag">26 GHz / KA DOWNLINK</span><span class="tag">1,550 nm / OPTICAL</span></div><p>Downlink carries queued payload. S-band provides the command uplink. Optical contacts assume clear sky.</p></div>';
 return '<section class="panel lowerpan">'+head('Engineering readouts','list-checks','<span class="metacode">'+time(view.t)+'</span>')+add+'<div class="twocol">'+[entry.rows.slice(0,Math.ceil(entry.rows.length/2)),entry.rows.slice(Math.ceil(entry.rows.length/2))].map(a=>rowTable(['Quantity','Value'],a.map(read).join(''))).join('')+'</div></section>'
}
function eventTable(list,limit){const pick=typeof limit==='number'?list.slice(0,limit):list;return pick.length?rowTable(['Episode','Start · MET','Duration',''],pick.map(e=>tr(['<span class="dotlabel"><i class="legenddot" style="--c:'+eventColor(e.type)+'"></i>'+esc(e.label)+'</span>',time(e.start),fmt(e.end-e.start,1)+' s','<button class="iconbtn" aria-label="Inspect '+esc(e.label)+'">'+icon('chevron-right',14)+'</button>'],'data-event="'+esc(e.id)+'"')).join('')):'<div class="panelpad muted">No matching events in this window. <button class="textbutton" data-action="findnext">Find the next event</button></div>'}
function lower(){const selected=view.event;let evlist=events.filter(e=>e.end>view.t),ev=evlist.length?evlist:events;const btn='<button class="textbutton" data-action="events">All events '+icon('chevron-right',12)+'</button>';let s='';if(view.scope==='mission')s+='<section class="panel lowerpan">'+head(sim.audit?'Chronological mission integration':'Representative-day preview','activity','<button class="textbutton" data-action="audit">'+(sim.audit?'Mission totals':'Resolve every mission day')+' '+icon('chevron-right',12)+'</button>')+'<div class="panelpad muted">'+(sim.audit?'Mission plots retain interval minima for SOC, maxima for junction temperature and peak recorder backlog.': 'The fast preview samples seasonal operating days. The chronological sweep evaluates each day and preserves its extrema and event totals.')+'</div></section>';
 if(selected)s+='<section class="panel lowerpan">'+head(esc(selected.label),'circle-dot','<button class="textbutton" data-action="eventdetail">Event inspector '+icon('chevron-right',12)+'</button>')+'<div class="panelpad"><span class="mono">'+time(selected.start)+' → '+time(selected.end)+'</span><span class="muted"> &nbsp;·&nbsp; '+fmt(selected.end-selected.start,1)+' seconds</span> <button class="chip" data-action="jumpstart">Jump to start</button> <button class="chip" data-action="viewevent">View in 3D</button></div></section>';
 if(workspaceFor(view.domain,hardware))s+=ledger();
 if(view.domain==='overview')s+='<div class="columns lowerpan"><section class="panel">'+head('Mission events','list-filter',btn)+eventTable(ev,4)+'</section><section class="panel">'+head('Service summary','activity','<span class="metacode">24 H</span>')+rowTable(['Measure','Value'],[['Onboard text generation',fmt(day.textGeneratedGB*1e9/hardware.input.bytesPerToken/86400,1)+' tok/s'],['Delivered text · daily mean',fmt(day.tokensDelivered/86400,1)+' tok/s'],['Delivered payload',fmt(day.deliveredGB)+' GB'],['Free persistent storage',fmt(snap.freeTB)+' TB'],['Minimum battery charge',fmt(day.minSocPct,1)+'%'],['Hottest junction',fmt(day.maxJunctionK,1)+' K'],['Launch mass headroom',fmt(hardware.massMarginKg)+' kg'],[(sim.audit?'Qualified service span':'Sizing-envelope life estimate'),(life.lowerBound?'≥ ':'')+fmt(life.years,2)+' yr'],['Limiting design balance',esc(life.binding)]].map(r=>tr(r)).join(''))+'</section></div>';
 else s+='<section class="panel lowerpan">'+head('Mission events','list-filter',btn)+eventTable(ev.filter(e=>view.domain!=='comm'||e.type==='contact'),5)+'</section>';
 $('lower').innerHTML=s;
}
let cachedTests=null;
function scenarioTests(){if(cachedTests)return cachedTests;const h=sizeDesign(defaults),m=createSimulation(h),ev=m.events(0,DAY),records=[];
 const record=(g,name,a,b,u,tol=1e-6)=>records.push({group:g,name,expected:a,actual:b,unit:u,tolerance:tol,pass:Math.abs(a-b)<=tol});
 for(const type of ['contact','trim']){const e=ev.find(x=>x.type===type);if(!e){record(9,type+' fixture available',1,0,'');continue}const t=(e.start+e.end)/2,obj={schema:'odc-scenario/1',design:defaults,view:{...defaultView,camera:'core',t,event:e}},copy=decodeScenario(encodeScenario(obj)),s=m.at(t),r=createSimulation(sizeDesign(copy.design)).at(copy.view.t);
 for(const [k,u] of [['propellantKg','kg'],['socPct','%'],['junctionK','K'],['queueGB','GB'],['deployment','fraction']])record(9,type+' share restore · '+k,s[k],r[k],u);
 record(9,type+' restored view & event',1,Number(copy.view.camera==='core'&&copy.view.event.id===e.id),'');}
 const a=m.at(1),b=m.at(500);record(6,'Spacecraft propellant through launcher ascent',a.propellantKg,b.propellantKg,'kg');
 const pass=ev.find(e=>e.type==='contact');if(pass){const a=m.at(pass.start),b=m.at(pass.end);record(4,'Contact byte balance (arrivals − deliveries − losses)',a.queueGB+b.generatedGB-a.generatedGB-(b.deliveredGB-a.deliveredGB)-(b.droppedGB-a.droppedGB),b.queueGB,'GB',.0001)}
 cachedTests=records;return records}
function deploymentEvidence(){
 const cells=(row,label)=>tr([esc(label),fmt(row.minSolarRadiatorGapM*1000,2),fmt(row.minHardwareGapM*1000,2),fmt(row.maxHingeGapM*1000,4),fmt(row.maxHoseEndErrorM*1000,4),fmt(row.maxLengthErrorM*1000,4),row.deployClear?'Clear':'Interference',row.fit?'Fits':'Exceeds fairing']);
 const headers=['Build','Solar to radiator · mm','To fixed hardware · mm','Hinge error · mm','Hose endpoint error · mm','Blanket length error · mm','Motion screen','Stowed envelope'];
 const legacy=deploymentAudit.rows.map(r=>cells(r,presetList.find(p=>p.id===r.id)?.name||r.id)),goals=aiDeploymentAudit.rows.map(r=>cells(r,aiPurposes[r.id].label));
 return '<section class="panel lowerpan">'+head('Deployment mechanism verification','ruler','<span class="tag">RIGID-BODY SWEEP</span>')+'<div class="panelpad"><p>Sampled '+fmt(deploymentAudit.posesPerPreset,0)+' positions per build. The checks follow the solar booms and blankets, the two radiator pivot chains and their coolant connections. Positive clearance means separation in this geometric model. Hinge and hose errors measure separation between endpoints that should remain connected.</p></div>'+rowTable(headers,[...goals,...legacy].join(''))+'<div class="panelpad"><button class="btn" data-chapter="commissioning">Inspect the deployment sequence →</button></div></section>';
}
function references(){
 if(referencePage==='architecture')return renderArchitecture(hardware,snap);
 if(referencePage==='equipment')return renderEquipmentList(hardware,snap);
 if(referencePage==='checks'){const list=[...checks(),...scenarioTests()],passed=list.filter(x=>x.pass).length;return '<section class="panel">'+head('Surface geometry audit','scan-line','<span class="tag">REFERENCE BUILD</span>')+'<div class="panelpad"><p>Triangle winding and vertex normals were compared in '+fmt(surfaceAudit.geometries)+' unique geometries across the spacecraft and launch assemblies. Each exterior wall and the reflector passed closed-volume and paired-edge checks.</p></div>'+rowTable(['Geometry check','Measured'],[['Triangles with checked orientation',fmt(surfaceAudit.checkedTriangles)],['Zero-area triangles',fmt(surfaceAudit.zeroAreaPoleTriangles)],['Closed wall panels',fmt(surfaceAudit.shellSides)],['Occupied wall penetrations',fmt(surfaceAudit.occupiedPorts)]].map(x=>tr(x)).join(''))+'</section>'+deploymentEvidence()+'<section class="panel lowerpan">'+head('Numerical verification','list-checks','<span class="tag '+(passed===list.length?'':'warn')+'">'+passed+' / '+list.length+' PASS</span>')+rowTable(['Group','Reference calculation','Expected','Computed','Unit','Result'],list.map(c=>tr([c.group,esc(c.name),fmt(c.expected,5),fmt(c.actual,5),esc(c.unit),'<span class="'+(c.pass?'checkpass':'checkfail')+'">'+(c.pass?'Pass':'Review')+'</span>'])).join(''))+'</section>'}
 const d=hardware.input;const ledgerExamples=[['Solar generation','1.361 × '+fmt(d.solarM2)+' m² × '+fmt(d.pvEfficiency,3)+' × '+fmt(d.solarDelivery,3)+' × incidence × sunlight × retention × deployment',fmt(snap.solarKW)+' kW'],['Data generation',fmt(snap.tokensPerSec)+' tok/s × '+fmt(d.bytesPerToken)+' B/tok × 8',fmt(snap.tokensPerSec*d.bytesPerToken*8/1e6,5)+' Mbit/s text'],['Dry + consumables + adapter',fmt(hardware.dryKg)+' + '+fmt(hardware.propellantKg)+' + '+fmt(hardware.pressurantKg)+' + '+fmt(d.adapterKg)+' kg',fmt(hardware.launchKg)+' kg'],['Drag force','½ × '+fmt(snap.densityKgM3,4)+' kg/m³ × '+fmt(snap.relativeSpeedMs)+'² × '+fmt(d.cd)+' × '+fmt(snap.ramAreaM2)+' m²',fmt(snap.dragN,6)+' N']];
 return pointingApproach(hardware)+deploymentReferences()+domainCoverage()+sourceNote()+sourceGuideIndex()+'<section class="panel">'+head('Live calculation sheet','activity','<span class="metacode">'+time(view.t)+'</span>')+rowTable(['Balance','Substitution','Result'],ledgerExamples.map(r=>tr(r.map(esc))).join(''))+'</section><section class="panel lowerpan">'+head('Model boundaries and equations','book-open')+'<div class="panelpad">'+assumptions.map(a=>'<details><summary>'+esc(a.name)+'</summary><p class="eq">'+esc(a.equation)+'</p><p>'+esc(a.note)+'</p></details>').join('')+'<h3 class="gap">Numerical method</h3>'+modelNotes.map(n=>'<p>'+esc(n)+'</p>').join('')+'</div></section><section class="panel lowerpan">'+head('Reference library','book-open','<span class="metacode">04 NOV 2026</span>')+'<div class="panelpad sourcegrid">'+sources.map(s=>'<a class="sourcecard" data-tip="Open the cited engineering reference in a new tab." href="'+esc(s.url)+'" target="_blank" rel="noopener">'+icon('square-arrow-out-up-right',14)+'<span><strong>'+esc(s.name)+'</strong><small>'+esc(s.note)+'</small></span></a>').join('')+'</div></section>';
}
function renderDiscipline(live=false){
 const host=$('discipline-host'),id=view.domain,p=view.phase;
 host.hidden=!!referencePage||integrating()&&!view.detail||!['attitude','avionics','mechanical'].includes(id);
 if(host.hidden)return;
 const anchor=$(p==='A'?'domain-readout':p==='B'?'engineering-toggle':p==='F'?'disposal-plot':'trade-input');
 if(anchor.previousElementSibling!==host)anchor.parentNode?.insertBefore(host,anchor);
 if(id==='mechanical'){
  const route=p==='F'?sim.disposal():null;
  const ctx=route?{route,entrySpeedMs:route.feasible&&Number.isFinite(route.entry)?sim.at(route.entry).relativeSpeedMs:null}:null;
  if(live){updateMechanical(host,hardware,snap,p,ctx);return}
  host.innerHTML=renderMechanical(hardware,snap,p,ctx);bindMechanical(host,hardware,snap,p,ctx);
 }else if(!live||!host.matches(':focus-within, :hover')){
  host.innerHTML=id==='attitude'?renderGyroBenchmark(hardware,snap,day,p):renderAvionics(hardware,snap,p);
 }
}
let attitudeChart=null;
function updatePointingPanels(){
 const strip=$('attitude-strip'),chart=$('attitude-history');
 const active=!referencePage&&activePointing(view,snap);
 strip.hidden=!active||view.camera==='launch'&&snap.flightPhase==='operations';
 chart.hidden=!active||!showAttitudeHistory(view,snap);
 if(!strip.hidden)strip.innerHTML=attitudeStrip(view,snap);
 if(chart.hidden)return;
 const {start,end}=responseWindow(sim,snap,view.phase);
 if(!(end>start)){chart.hidden=true;return}
 if(attitudeChart?.owner!==sim||attitudeChart.start!==start||attitudeChart.end!==end||attitudeChart.audit!==sim.audit){
  chart.innerHTML=orbitResponse(sim,start,end);attitudeChart={owner:sim,start,end,audit:sim.audit};
 }
 refreshResponse(chart,$('ad-seek'),snap,start,end);
}
let sceneLoad;
function ensureScene(){
 if(scene||sceneLoad)return;
 const status=$('scene-loading'),host=$('scene');
 status.textContent='Preparing the 3D view…';
 status.hidden=false;
 sceneLoad=import('./scene.js').then(({createScene})=>{
  if(referencePage||!['C','D','E','F'].includes(view.phase)){sceneLoad=null;status.hidden=true;return}
  scene=createScene(host,{onPick:inspect,onThermalScale:id=>{view.thermalScale=id},onHover:(id,x,y,row)=>help.component(id,x,y,row)});
  scene.setDomain(commissioning()?'conops':view.domain,view.phase);
  scene.setDeploymentLens(view.deploymentLens);
  scene.setLaunchLens(view.launchLens);
  scene.setChapter(view.chapter);
  syncBayView();
  if(view.phase==='F')scene.setDisposalPlan(sim.disposal());
  scene.setView(view.camera);
  scene.setThermalScale(view.thermalScale);
  scene.setLightingMode(view.lighting);
  scene.setExposureEV(view.exposureEV);
  if(view.cameraStates)scene.setCameraState(view.cameraStates);
  scene.update(hardware,snap);
  scene.setOverlays(effectiveLayers());
  scene.highlight(view.inspect||'');
  status.hidden=true;
 }).catch(error=>{
  console.error(error);
  scene?.destroy?.();scene=null;host.textContent='';
  status.textContent='The 3D view could not start.';
  const retry=document.createElement('button');retry.className='btn';retry.textContent='Retry 3D view';
  retry.addEventListener('click',()=>{sceneLoad=null;ensureScene()});status.append(retry);
 });
}
let activeLesson=null,eventStudy=null;
function lessonInRail(){
 return !referencePage&&['D','E','F'].includes(view.phase)&&!integrating()&&!commissioning()&&!showLaunchDirector(view);
}
function positionGuide(){
 const phase=view.phase,note=$('field-note'),rail=lessonInRail();
 document.body.dataset.fieldRail=String(rail);
 const anchor=$(referencePage?'subsystem':rail?'guidepanel':phase==='A'?'phase-content':phase==='B'?'discipline-host':phase==='C'?'trade-output':'event-explorer');
 if(anchor.previousElementSibling!==note)anchor.parentNode?.insertBefore(note,anchor);
 note.open=!view.teachFolded;
}
function showLesson(lesson){
 activeLesson=lesson;
 paintFieldGuide(document,lesson,view.phase,view.domain,referencePage);
}
function refreshLesson(){
 if(referencePage){showLesson(referenceLesson(referencePage));return}
 const phase=view.phase,id=view.domain;
 if(phase==='C')return; // The trade view supplies its already matched pair of simulations.
 if(phase==='A'||phase==='B')showLesson(designTeaching(phase,id,hardware,snap));
 else showLesson(flightTeaching(phase,id,hardware,snap,view,phase==='F'?sim.disposal():null));
}
function refreshEventExplorer(){
 const visible=!referencePage&&view.phase==='E'&&!commissioning();
 const panel=$('event-explorer');panel.hidden=!visible;
 if(!visible){eventStudy=null;return}
 if(eventStudy?.model!==sim||eventStudy.events!==events||eventStudy.audit!==sim.audit){
  const available=comparisonEvents(events,view.start,Math.min(view.start+DAY,sim.ignition));
  eventStudy={model:sim,events,audit:sim.audit,available,selected:null};
  $('event-choice').innerHTML=eventOptions(available,time);
  const coverage=$('event-coverage');
  const note=day.shadowSeconds===0?'This window has no modeled eclipse.':day.contactSeconds===0?'This window has no direct ground contact.':'';
  coverage.hidden=!note;coverage.textContent=note;
 }
 const e=chooseComparison(eventStudy.available,view.teachEvent,view.t,view.domain);
 $('event-choice-label').hidden=!e;$('event-moments').hidden=!e;$('event-finding').hidden=!e;
 if(!e){$('event-invitation').textContent='This window contains no complete post-commissioning pass or eclipse with a sample on both sides. Choose another mission window to compare an event.';return}
 if(eventStudy.selected!==e){
  eventStudy.selected=e;eventStudy.comparison=compareMoments(sim,e);
  $('event-choice').value=e.id;
  $('event-invitation').textContent=e.type==='eclipse'?'Choose an eclipse to pause at its midpoint. Before and After show the spacecraft one second outside each edge of the shadow.':'Choose a pass to pause at midpass. Select Before or After to inspect the terminal and recorder one second outside the contact interval.';
  $('event-finding').textContent=eventStudy.comparison.explanation;
  $('event-moments').innerHTML=eventMomentsMarkup(eventStudy.comparison,time);
 }
 document.querySelectorAll('[data-compare-moment]').forEach(b=>{
  const pressed=String(Math.abs(view.t-eventStudy.comparison.times[Number(b.dataset.compareMoment)])<.51);
  if(b.getAttribute('aria-pressed')!==pressed)b.setAttribute('aria-pressed',pressed);
 });
}
function draw(){
 scheduleClock();
 checkpoint.schedule([view.phase,referencePage||view.domain,view.chapter,view.camera].join('/'));
 snap=sim.at(view.t);const p=view.phase,id=view.domain,ref=referencePage,def=phases[p],d=domains[id],a=!ref&&p==='A',b=!ref&&p==='B',c=!ref&&p==='C',flight=!ref&&['D','E','F'].includes(p),visual=c||flight;
 if(!visual){updatePointingPanels();$('orbit-lighting').hidden=true}
 const bay=integrating();document.body.dataset.bay=String(bay);
 positionGuide();refreshLesson();refreshEventExplorer();
 const loader=$('loading-player');loader.hidden=!(bay&&hasLoadingDirector(id));
 loader.innerHTML=loader.hidden?'':loadingPlayer(hardware,snap,playing);
 $('viewer-heading').textContent=bay?'Integration facility':'Flight view';
 $('bay-display').hidden=!bay;
 setNav();$('lifecycle').innerHTML=lifecycleNav(p);document.body.classList.toggle('storypage',visual);document.body.classList.toggle('subsystems-page',b);document.body.dataset.phase=p;
 $('crumb').textContent=ref?pages[ref][0]:'Phase '+p+' / '+d.label;$('title').textContent=ref?pages[ref][0]:d.label;$('subtitle').textContent=ref?pages[ref][2]:purposeStageDescription(id,p,hardware);$('pagecode').textContent=ref?'ENGINEERING REFERENCE':'PHASE '+p+'  /  '+def.label.toUpperCase();
 $('clockstatus').textContent=flight?(playing?'Flight clock running':'Flight clock paused'):designName(view);
 $('presetshelf').hidden=!a;$('phase-content').hidden=!a;$('system-choice').hidden=!b;$('diagram-host').hidden=!b;$('engineering-toggle').hidden=!b;
 $('primary').hidden=!visual;$('viewer').hidden=!visual;$('guidepanel').hidden=!visual;$('missionpath').hidden=!flight;$('storyextras').hidden=!flight;
 const detailed=b||(!ref&&view.detail&&p!=='A');
 if(bay&&!view.detail){for(const k of ['purpose-host','purpose-brief','purpose-studies','discipline-host']){const host=$(k);host.hidden=true;host.innerHTML=''}}
 else{renderPurposePanels();renderDiscipline();}
 const fleet=$('fleet-host');fleet.hidden=!!ref||id!=='launcher'||bay&&!view.detail;
 if(!fleet.hidden){const anchor=$(a?'phase-content':b?'diagram-host':'trade-input');if(anchor.previousElementSibling!==fleet)anchor.parentNode?.insertBefore(fleet,anchor);fleet.innerHTML=renderLaunchFleet(hardware,p)}
 $('study').hidden=true;$('kpis').hidden=true;$('timeline').hidden=!detailed;$('lower').hidden=!detailed;
 $('phase-extras').hidden=!!ref;$('phase-extras').innerHTML='';$('subsystem').innerHTML='';$('trade-input').hidden=!c;$('trade-output').hidden=!c;
 $('disposal-plot').hidden=!!ref||p!=='F';$('domain-readout').hidden=!!ref||p==='B';
 if(ref){$('pagecode').textContent=['architecture','equipment'].includes(ref)?'SPACECRAFT BASELINE  /  ODC–01':'ENGINEERING REFERENCE';const panel=$('subsystem');panel.innerHTML=references();if(ref==='equipment')bindEquipmentList(panel,hardware,snap);choiceCues.update('reference/'+ref,document);return}
 if(a){$('presetshelf').innerHTML=presetShelf(view,loadedPresets,hardware);$('phase-content').innerHTML=phaseA(hardware,view,result,k=>inputRow(k,false,'concept'));$('phase-extras').innerHTML=phaseHandoff('B',id)+sourceNote()}
 if(b){$('system-choice').innerHTML=designSection()+(id==='attitude'?pointingApproach(hardware,true):'');renderDiagram();$('engineering-toggle').innerHTML=diagramTools();$('phase-extras').innerHTML=phaseHandoff('C',id)}
 if(visual){
  ensureScene();
  if(bay){const facility=integrationProfile(hardware.input.launcher,hardware.input.launchSite);$('title').textContent=facility.facility;$('subtitle').textContent=facility.location+' · '+(hasLoadingDirector(id)?'Follow the data center from its checkout stand to the flight vehicle.':'Select a subsystem to inspect the tools used before the payload leaves its stand.'); $('pagecode').textContent='Phase D  /  Launch preparation';$('clockstatus').textContent='Preparing for launch';}
  if(commissioning()){$('title').textContent='Spacecraft deployment';$('subtitle').textContent='Follow each restraint, roll and hinge from separation to Sun acquisition.'}
  scene?.setDomain?.(commissioning()?'conops':id,p);scene?.setDeploymentLens?.(view.deploymentLens);scene?.setLaunchLens?.(view.launchLens);scene?.setChapter?.(view.chapter);syncBayView();chooseCamera(view.camera);scene?.update(hardware,snap);scene?.setOverlays(effectiveLayers());scene?.highlight(view.inspect||'');syncThermalToggle();viewerInfo();renderObservation();
  if(c){renderTrade(true);$('phase-extras').innerHTML=missionTotals(currentContext(),view,time)+phaseHandoff('D',id)}
  if(flight){$('missionpath').innerHTML=flightChapters(view);$('storyextras').innerHTML=commissioning()?commissioningTimeline(hardware,snap):bay?bayEvidence(hardware,snap,view)+facilityNotes(hardware)+bayTimeControls():(showLaunchDirector(view)?launchSequence(hardware,snap):'')+flightPlayer();if(commissioning())refreshCommissioning(document,hardware,snap);if(p==='F'){renderDisposal();$('phase-extras').innerHTML='<button class="btn export gap" data-action="pdr">Prepare quantitative PDR</button>'}else $('phase-extras').innerHTML=phaseHandoff(p==='D'?'E':'F',id)}
 }
 if(bay&&!view.detail)$('domain-readout').hidden=true;
 if(!$('domain-readout').hidden)updateReadout();
 if(id==='prop'||id==='mass'){
  const related=id==='prop'?'architecture':'equipment',label=pages[related][0];
  const hold=id==='prop'&&snap.burnHold?'<p class="arch-hold"><strong>Chemical burn held.</strong> '+esc(snap.burnHold)+'</p>':'';
  $('phase-extras').insertAdjacentHTML('afterbegin','<div class="baseline-link">'+hold+'<button class="btn" data-page="'+related+'">'+icon(id==='prop'?'box':'list-checks',14)+esc(label)+'</button></div>');
 }
 if(bay)$('phase-extras').hidden=!view.detail;
 if(detailed){kpis();drawStudy();timeline();lower()}
 choiceCues.update(p+'/'+id,document);
}
function serviceFor(model,start){
 const begin=clamp(start,0,model.duration),end=Math.min(begin+DAY,model.duration);
 if(end<=begin)return null;
 const cached=serviceCache.get(model);
 if(cached&&cached.start===begin&&cached.audit===model.audit)return cached.value;
 const value=evaluateService(model,begin,end-begin);
 serviceCache.set(model,{start:begin,audit:model.audit,value});return value;
}
function updateReadout(){
 const target=$('domain-readout');
 const landing=view.phase==='A'&&view.domain==='conops'&&view.start===0&&!sim.audit;
 const model=sim,cached=serviceCache.get(model);
 const ctx=currentContext(!landing);
 if(landing){
  if(cached?.start===0&&!cached.audit)ctx.service=cached.value;
  else if(landingReplay?.value)ctx.service=landingReplay.value;
  else if(!landingReplay){
   const controller=new AbortController();
   const replay={controller,value:null,failed:false};landingReplay=replay;
   const span=Math.min(DAY,model.duration);
   evaluateServiceAsync(model.hardware.input,0,span,{signal:controller.signal,firstDay:true}).then(value=>{
    if(controller.signal.aborted||sim!==model||model.audit)return;
    replay.value=value;serviceCache.set(model,{start:0,audit:null,value});
    if(!referencePage&&view.phase==='A'&&view.domain==='conops'&&view.start===0)updateReadout();
   }).catch(err=>{
    if(err.name==='AbortError'||sim!==model)return;
    replay.failed=true;
    if(!referencePage&&view.phase==='A'&&view.domain==='conops'&&view.start===0)updateReadout();
   });
  }
 }
 const note=landingReplay?.failed?'Day-one replay unavailable. Open AI Data Center Purpose to evaluate the workload.':'Calculating customer service over the first day…';
 target.innerHTML=renderDomainReadout(view.domain,view.phase,ctx)+(landing&&!ctx.service?'<p class="model-footnote">'+note+'</p>':'');
}
function renderPurposePanels(){
 const id=view.domain,p=view.phase,ref=referencePage,host=$('purpose-host'),brief=$('purpose-brief'),studies=$('purpose-studies');
 const choosingInConops=p==='A'&&id==='conops';
 host.hidden=!!ref||(id!=='purpose'&&!choosingInConops);brief.hidden=!!ref||id!=='conops'||choosingInConops;studies.hidden=!!ref||id!=='purpose'||!isEditable(p);
 if(!brief.hidden){const anchor=$(p==='A'?'presetshelf':p==='B'?'diagram-host':'trade-input');if(anchor.previousElementSibling!==brief)anchor.parentNode?.insertBefore(brief,anchor);brief.innerHTML=conopsPurpose(hardware,p)}
 if(!host.hidden){
  const anchor=$(p==='A'?'phase-content':p==='B'?'diagram-host':'trade-input');if(anchor.previousElementSibling!==host)anchor.parentNode?.insertBefore(host,anchor);
  const selectedId=isEditable(p)?view.purposePreview:null;
  host.innerHTML=renderAIPurpose(hardware,p,{context:choosingInConops?'conops':'purpose',selectedId:selectedId||input.aiPurpose,snapshot:snap,state:snap,day,windowStart:view.start,sim,service:choosingInConops?null:serviceFor(sim,view.start)});
  if(!studies.hidden){
   const toolsAnchor=$(p==='B'?'kpis':p==='A'?'phase-content':'trade-input');
   if(toolsAnchor.previousElementSibling!==studies)toolsAnchor.parentNode?.insertBefore(studies,toolsAnchor);
   studies.innerHTML=studyMenu(hardware.input,selectedId,view.studyDays);
  }
 }
}
function markStarter(id,next){
 view.preset='starter';view.presetName=null;view.starterPurpose=id;view.starterContext=starterContext(next);view.modified=false;
 view.thermalTargets={};view.thermalPadding=0;view.thermalScope='window';view.tradeKey=null;view.tradeBase=null;
}
function usePurpose(id,withBuild,context=hardware.input){
 if(!isEditable(view.phase)||!Object.hasOwn(aiPurposes,id))return;
 const next=withBuild?missionStarter(id,context):applyAIPurpose(hardware.input,id,false);
 reviewProposal(next,{mode:'installed',label:aiPurposes[id].label+' · '+(withBuild?'mission and starting spacecraft':'current spacecraft'),force:true,family:'aiPurpose',starter:withBuild,commit:resolved=>{
  input=next;view.solve='installed';if(withBuild)markStarter(id,next);else view.modified=true;
  view.event=null;view.purposePreview=id;playing=false;recalc(resolved);draw()
 }});
}
function orderSeed(model,start){return {initialSeed:model.serviceSeed?.(start),seedProvenance:model.audit||start<60*DAY?'Chronological spacecraft state at order admission':'Representative-day initial inventory at order admission'}}
function comparePurposes(id){
 if(!isEditable(view.phase)||!Object.hasOwn(aiPurposes,id))return;
 const h2=sizeDesign(applyAIPurpose(hardware.input,id,false)),s2=createSimulation(h2);
 open('Compare purposes on the installed machine',sameMachineReport(hardware,serviceFor(sim,view.start),h2,serviceFor(s2,view.start)),'ai-compare');
}
async function runOrder(){
 if(!isEditable(view.phase)||view.domain!=='purpose')return;
 const model=sim,start=view.start,span=Math.min(studyHorizon(hardware.input,view.studyDays)*DAY,model.duration-start);
 if(span<=0){toast('Select a window before mission closeout.');return}
 const show=r=>open('Earth order evaluation','<p>'+esc(aiPurposes[input.aiPurpose].label)+' · '+time(start)+' to '+time(start+span)+'</p>'+serviceSummary(r)+'<div class="dialogrow gap"><button class="btn" data-action="ai-order-json">Download study JSON</button></div>','ai-order');
 if(lastOrder?.model===model&&lastOrder.start===start&&lastOrder.span===span){show(lastOrder.value);return}
 orderJob?.abort();const controller=new AbortController();orderJob=controller;
 open('Evaluate the Earth order','<p>Evaluating the selected workload and transfer opportunities over '+fmt(span/DAY,2)+' days.</p><div id="order-progress" role="status" class="callout">Starting client-side study…</div><button class="btn gap" data-action="ai-cancel-order">Cancel</button>','ai-working');
 try{
  const value=await evaluateServiceAsync(hardware.input,start,span,{...orderSeed(model,start),signal:controller.signal,onProgress:p=>{if(modal==='ai-working'&&$('order-progress'))$('order-progress').textContent=typeof p==='string'?p:Number.isFinite(p.days)&&Number.isFinite(p.totalDays)?'Mission day '+fmt(p.days,0)+' of '+fmt(p.totalDays,0)+' · resolving compute and Earth access.':'Evaluating Earth service…'}});
  if(controller.signal.aborted||sim!==model)return;
  lastOrder={model,start,span,value};if(modal==='ai-working')show(value);else toast('Earth order evaluation ready.');
 }catch(err){if(err.name!=='AbortError'&&sim===model)open('Order evaluation stopped','<p>'+esc(err.message)+'</p>','ai-error')}
 finally{if(orderJob===controller)orderJob=null}
}
function syncLighting(){
 const available=!referencePage&&['C','D','E','F'].includes(view.phase)&&orbitalLightingAvailable(view.camera,snap);
 const group=$('orbit-lighting');group.hidden=!available;
 if(!available)return;
 const studio=view.lighting==='studio';
 scene?.setLightingMode(view.lighting);
 scene?.setExposureEV(view.exposureEV);
 const exposure=$('camera-exposure');if(exposure.value!==String(view.exposureEV))exposure.value=String(view.exposureEV);
 $('lighting-studio').setAttribute('aria-pressed',String(studio));
 $('lighting-realistic').setAttribute('aria-pressed',String(!studio));
 const label=(snap.eclipse?'In Earth’s shadow':'In sunlight')+(studio?(view.camera==='orbit'?' · Locator lit':' · Floodlights on'):'');
 const status=$('light-environment');
 if(status.textContent!==label){status.textContent=label;status.dataset.shadow=String(!!snap.eclipse)}
}
function viewerInfo(){syncLighting();updatePointingPanels();const ribbon=$('eventribbon');if(ribbon)ribbon.hidden=true;const early=view.t<DEPLOY_END_S;$('imagestate').textContent=early?time(view.t)+'  /  '+(view.t<0?'PREFLIGHT':view.t>=0&&view.t<35?Math.round(Math.max(0,snap.altitudeKm)*1000)+' M':Math.round(snap.altitudeKm)+' KM'):'ORB '+String(snap.orbitNumber).padStart(3,'0')+'  /  '+fmt(snap.altitudeKm,0)+' KM';$('craftid').textContent=designName(view);$('craftphase').textContent=view.camera==='core'?'CUTAWAY · ENCLOSURE OPEN FOR INSPECTION':early?({integration:'PAYLOAD INTEGRATION',pad:'LAUNCH PAD',ascent:'ASCENT',insertion:'ORBITAL INSERTION',commissioning:'DEPLOYMENT'})[snap.flightPhase]||'COMMISSIONING':snap.flightPhase==='entry'?'ENTRY INTERFACE':snap.burn?'CHEMICAL BURN':snap.station?'CONTACT · '+snap.station.toUpperCase():snap.eclipse?'EARTH SHADOW':'SUNLIT ORBIT'}
function openFieldGuide(key,option){
 const r=fieldGuidance(key,hardware.input,{option:option||hardware.input[key]});if(!r)return;
 $('guide-name').textContent=r.title;$('guide-body').innerHTML=helpBody(key,hardware.input,option);help?.hide();if(!$('guide-dialog').open)$('guide-dialog').showModal();
}
function open(title,html,key){playing=false;modal=key;$('dialogtitle').textContent=title;$('dialogbody').innerHTML=html;if(!$('dialog').open)$('dialog').showModal()}
function close(){modal=null;$('dialog').close()}
const tile=(action,label,desc,ic)=>'<button class="actiontile" data-action="'+action+'">'+icon(ic,21)+'<span><strong>'+label+'</strong><small>'+desc+'</small></span><span class="end">'+icon('chevron-right',14)+'</span></button>';
function params(){if(!isEditable(view.phase))return;const groupMap=[...new Set(controls.map(c=>c.group))].filter(g=>g!=='Thermal limits'),opts=Object.entries(solveModes).map(([k,l])=>'<option value="'+k+'" '+(k===view.solve?'selected':'')+'>'+esc(l)+'</option>').join('');
 const saved=Array.from($('dialogbody').querySelectorAll('details[open]')).map(x=>x.dataset.group);
 open('Parameters & solver','<p>Choose the balance to solve. Installed quantities remain fixed in flight mode.</p><div class="fieldgrid"><div class="fieldbox"><div class="field-caption"><label for="solve">Solve for</label>'+helpButton('solve','a sizing method',view.solve)+'</div><select id="solve" '+(view.mode==='fly'?'disabled':'')+'>'+opts+'</select></div><div class="fieldbox"><div class="field-caption"><label for="epoch">Scenario epoch · UTC</label>'+helpButton('epoch','the mission epoch')+'</div><input type="datetime-local" id="epoch" class="forminput" step="1" value="'+esc(input.epoch.slice(0,19))+'" '+(view.mode==='fly'?'disabled':'')+'></div></div><div class="solvenote gap" id="solvenote">'+solveNote()+'</div><div class="gap">'+groupMap.map(g=>'<details data-group="'+esc(g)+'" '+(saved.includes(g)||(!saved.length&&g==='Technology')?'open':'')+'><summary>'+esc(g)+'</summary><div class="fieldgrid">'+controls.filter(c=>c.group===g).map(c=>inputRow(c.key)).join('')+'</div></details>').join('')+'</div><div class="dialogrow gap"><button class="btn" data-action="compare">Compare technology presets</button><button class="btn" data-action="tempbands">Thermal limits</button><button class="btn export" data-action="close">Done</button></div>','params');
}
function solveNote(){if(view.solve==='installed')return 'Installed '+fmt(hardware.itKw,1)+' kW IT · '+fmt(hardware.launchKg)+' kg launch stack · limiting sizing balance: '+esc(result.binding)+'.';return (result.feasible?'Solved':'Constraint reached')+' · '+(result.lowerBound?'≥ ':'')+fmt(result.achieved,3)+' '+esc(result.unit)+' · '+esc(result.binding)+'. Sizing uses the analytic operating envelope. Inspect telemetry for time-resolved performance.'}
let compareCategory='battery';
function compare(key=compareCategory){if(!isEditable(view.phase)||!Object.hasOwn(presets,key))return;compareCategory=key;const rows=enumeratePresets(input,key);open('Technology comparison','<p>Each candidate uses the current mission allowance and the same sizing assumptions.</p><select id="category" aria-label="Technology category">'+Object.keys(presets).map(k=>'<option '+(k===key?'selected':'')+'>'+k+'</option>').join('')+'</select><div class="gap">'+rowTable(['Preset','Balance','Mass margin','Binding margin',''],rows.map(r=>tr([esc(r.label),esc(r.binding),fmt(r.marginKg)+' kg',fmt(r.marginPercent)+'%',view.mode==='size'?'<button class="chip" data-preset="'+esc(key)+'" data-id="'+esc(r.id)+'">Use</button>':'Fixed'])).join(''))+'</div>','compare')}
function eventList(){refreshSamples(true);const types=[['all','All episodes'],['contact','Ground passes'],['eclipse','Eclipses'],['reboost','Reboosts'],['desat','CMG unloads'],['burst','Compute bursts'],['launch','Launch']];const list=events.filter(e=>eventFilter==='all'||eventFilter===e.type);open('Event browser','<div class="dialogrow"><span class="mono">'+time(view.start)+' · 24 h</span><select id="eventfilter" aria-label="Filter event type">'+types.map(([v,n])=>'<option value="'+v+'" '+(v===eventFilter?'selected':'')+'>'+n+'</option>').join('')+'</select></div><div class="eventlist gap">'+eventTable(list)+'</div>','events')}
function selectEvent(e,show=true){if(!e)return;playing=false;if(e.type==='eclipse'||e.type==='contact')view.teachEvent=e.id;view.event={...e};setTime((e.start+e.end)/2,false);if(show)eventDetail()}
function eventDetail(){const e=view.event;if(!e)return eventList();const ts=[Math.max(0,e.start-1),(e.start+e.end)/2,Math.min(sim.duration,e.end+1)],states=ts.map(t=>sim.at(t));const rows=['socPct|Battery charge|%','terminalKW|Terminal power|kW','cmgKW|CMG draw|kW','momentumNms|Stored momentum|N·m·s','queueGB|Queue|GB','deliveredGB|Cumulative downlink|GB','propellantKg|Propellant|kg','junctionK|Chip junction|K','altitudeKm|Altitude|km'];open(e.label,'<p>'+time(e.start)+' → '+time(e.end)+' · '+fmt(e.end-e.start,2)+' s</p>'+rowTable(['Telemetry','Before','During','After'],rows.map(r=>{const [k,l,u]=r.split('|');return tr([l+' · '+u,...states.map(s=>fmt(s[k],4))])}).join(''))+'<div class="dialogrow gap"><button class="btn" data-action="jumpstart">'+icon('skip-back',14)+' Jump to start</button><button class="btn export" data-action="viewevent">'+icon('box',14)+' View in 3D</button></div>','event')}
function inspect(id,thermalRow=null){if(help?.lens)return;
 if(integrating()&&id.startsWith('bay:')){selectBayLens(id.slice(4));return}view.inspect=componentMap[id]||id;const labels={solar:'Solar array',radiator:'Radiator banks',compute:'Compute trays',storage:'Persistent storage',battery:'Battery packs',propellant:'Propellant tanks',propulsion:'Chemical engines',cmg:'CMG cluster',communications:'Communications terminals',structure:'Vehicle structure'};const key=view.inspect;scene?.highlight(key);const physical={solar:[['Planform',hardware.solarM2,'m²'],['One wing length',hardware.wingLengthM,'m'],['Current output',snap.solarKW,'kW'],['Sun incidence cosine',snap.solarIncidenceCos,'']],radiator:[['Planform',hardware.radiatorM2,'m²'],['Emitting faces',4,''],['Net rejection',snap.netRejectionKW,'kW'],['Surface temperature',snap.radiatorK,'K']],compute:[['Installed trays',hardware.trays,''],['Active draw',snap.itKW,'kW'],['Decode',snap.tokensPerSec,'tok/s']],storage:[['Installed recorder',hardware.storageTB,'TB'],['Available storage',snap.freeTB,'TB'],['Downlink queue',snap.queueGB,'GB']],battery:[['Installed pack',hardware.batteryKWh,'kWh'],['Stored energy',snap.batteryKWh,'kWh'],['State of charge',snap.socPct,'%']],propellant:[['Fuel',snap.fuelKg,'kg'],['Oxidizer',snap.oxidizerKg,'kg'],['Filled volume',snap.tankFillPct,'%']],propulsion:[['Delivered Isp',input.isp,'s'],['Total thrust',input.thrustN,'N'],['Cumulative impulse',snap.burnImpulseNs,'N·s']],cmg:[['Gyroscopes',4,''],['Stored momentum',snap.momentumNms,'N·m·s'],['Electrical draw',snap.cmgKW,'kW']],communications:[['Dish aperture',input.kaDishM,'m'],['Pointing error',snap.pointingErrorDeg,'°'],['Terminal draw',snap.terminalKW,'kW'],['Slant range',snap.rangeKm,'km']],structure:[['Bus length',hardware.bodyLengthM,'m'],['Bus width',hardware.bodyWidthM,'m'],['Bus height',hardware.bodyHeightM,'m']]};
 Object.assign(labels,{avionics:'Avionics and data switch',torquer:'Magnetic torquer rods',booster:'Launch vehicle boosters',enclosure:'Equipment enclosure',fairing:'Payload fairing',launcher:'Launch vehicle',payload:'Stowed spacecraft',adapter:'Payload adapter',pad:'Launch pad',coolant:'Thermal loop',walls:'Equipment enclosure'});
 const h=hardware,f=h.fairing,e=h.enclosure;
 Object.assign(physical,{avionics:[['Network switch draw',h.switchKw,'kW'],['Payload queue',snap.queueGB,'GB']],torquer:[['Available unloading torque',snap.unloadTorqueNm,'N·m'],['Coil power',snap.coilKW,'kW']],booster:[['Mission payload allowance',h.input.launchAllowanceKg,'kg'],['Payload launch mass',h.launchKg,'kg']]});
 const wallReadings=[['Enclosure faces',e.walls.length,''],['Insulated wall area',e.coveredAreaM2,'m²'],['Outer blanket temperature',snap.enclosureOuterK,'K'],['Net heat flow outward',snap.enclosureLeakKW,'kW'],['Skin mass',e.skinKg,'kg'],['Blanket mass',e.blanketKg,'kg']];
 Object.assign(physical,{structure:[...physical.structure,...wallReadings],enclosure:wallReadings,walls:wallReadings,fairing:[['Maximum usable diameter',f.maxDiameterM,'m'],['Profile height',f.heightM,'m'],['Minimum radial clearance',f.radialClearanceM,'m'],['Axial clearance',f.axialClearanceM,'m']],payload:[['Stowed length',h.stowedLengthM,'m'],['Circumscribed diameter',h.stowedDiameterM,'m'],['Stack mass',h.launchKg,'kg']],adapter:[['Adapter mass',h.input.adapterKg,'kg'],['Stack length',h.stowedLengthM,'m']],launcher:[['Published LEO reference',h.input.referenceKg,'kg'],['Mission-specific allowance',h.input.launchAllowanceKg,'kg'],['Launch stack',h.launchKg,'kg']],pad:[['Mission elapsed time',view.t,'s'],['Loaded spacecraft propellant',h.propellantKg,'kg'],['Vehicle stack',h.launchKg,'kg']],coolant:[['Cold plate',snap.coldPlateK,'K'],['Coolant',snap.coolantK,'K'],['Flow',snap.coolantKgPerSec,'kg/s']]});
 if(thermalRow?.id)view.thermalNode=thermalRow.id;
 open(labels[key]||'Component inspection',(thermalRow?temperatureFacts(thermalRow)+'<button class="chip" data-action="tempbands">Inspect limits and excursions</button>':'')+'<p>Vehicle hardware at '+time(view.t)+'.</p>'+rowTable(['Quantity','Current value'],(physical[key]||[]).map(([l,v,u])=>tr([l,fmt(v,4)+' '+u])).join(''))+'<button class="btn gap" data-action="showcomponent">'+icon('focus',15)+' Inspect in vehicle</button>','inspect')}
function seekFlightCursor(t){
 if(view.phase==='E'&&!sim.audit&&t>=60*DAY){deferredFlightTime=t;prepareFlight();toast('The selected time will open when its chronological checkpoint is ready.');return}
 const lo=view.phase==='D'?-3600:view.phase==='F'?sim.ignition:view.phase==='E'?DEPLOY_START_S:-3600;
 const hi=view.phase==='D'?DEPLOY_START_S:view.phase==='E'?sim.ignition:view.phase==='F'?(sim.disposal()?.end??sim.duration):sim.duration;
 view.t=clamp(t,lo,hi);view.start=dayStart(view.t);refreshSamples();snap=sim.at(view.t);syncChapterToTime();scene?.update(hardware,snap);viewerInfo();renderObservation();refreshLesson();refreshEventExplorer();renderDiscipline(true);if($('live-met'))$('live-met').textContent=time(view.t);if(view.phase==='F')renderDisposal();
}
function setTime(t,clear=true){loadingPlayback=false;playing=false;if(!Number.isFinite(t))return;if(view.phase==='E'&&!sim.audit&&t>=60*DAY){deferredFlightTime=t;prepareFlight();toast('Resolving the selected flight time chronologically.');return}
 if(view.phase==='D')t=clamp(t,-3600,DEPLOY_START_S);if(view.phase==='E')t=clamp(t,DEPLOY_START_S,sim.ignition);if(view.phase==='F')t=clamp(t,sim.ignition,sim.disposal()?.end??sim.duration);view.t=clamp(t,-3600,sim.duration);if(clear)view.event=null;syncChapterToTime();if(view.t<view.start||view.t>=view.start+DAY)view.start=clamp(Math.floor(view.t/DAY)*DAY,0,Math.max(0,sim.duration-DAY));refreshSamples();draw()}
function setWindow(t){
 playing=false;const start=clamp(t,0,Math.max(0,sim.duration-DAY));
 if(view.phase==='E'&&!sim.audit&&start+7800>=60*DAY){deferredFlightTime=Math.min(sim.ignition,start+7800);prepareFlight();toast('Resolving the selected flight window chronologically.');return}
 view.start=start;setTime(start+7800);
}
let pendingImpact=null;
function reopenEditor(origin){
 if(origin==='params')params();else if(origin==='editfield')fieldEditor(editKey);else if(origin==='phasecontrols')phaseControls();else if(origin==='fairings')fairingDialog();else if(origin==='limits')limitDialog();else if(origin==='compare')compare();else if(origin==='preset-shelf')shelfDialog();
}
function reviewProposal(next,{mode=view.solve,label,commit,force=false,drag=false,origin=modal,family=null,starter=false}){
 if(!isEditable(view.phase)||modal==='impact')return;
 const assessment=impactOfChange(input,next,view.solve,mode,result,family),{changes,domains,deltas,margins,newFailures,errors}=assessment;
 if(!changes.length&&mode===view.solve&&!force&&!errors.length){commit(assessment.proposed);return}
 if(!errors.length&&!force&&!assessment.review){commit(assessment.proposed);return}
 if(drag)return;
 const val=(k,v)=>esc(fmt(displaySetting(k,v),5)),violations=margins.filter(r=>r.after<1-1e-7),known=sim.audit?'Applying this change clears the existing chronological mission results. Run the sweep again to qualify the revised design.':'Applying this change recalculates the design and flight preview. Run a chronological sweep for revised mission extrema and totals.';
 const rate=p=>Number.isFinite(p)?fmt(100*(p-1),2)+'%':'—';
 const conflict=changes.filter(x=>x.overwritesOverride),ins=changes.map(x=>tr([esc(x.label)+(x.overwritesOverride?'<small class="impact-dim">Edited preset value</small>':''),val(x.key,x.before),val(x.key,x.after),esc(x.unit)])).join('');
 let flight='';
 if(!errors.length&&changes.some(x=>['network','link','attitude','solarDriver','battery','pv','coating','workload','engine','launcher'].includes(x.key))){
  const proposedSim=createSimulation(assessment.proposed.hardware),start=Math.max(0,Math.min(view.start,Math.min(sim.duration,proposedSim.duration)-DAY)),da=sim.daySummary(start),db=proposedSim.daySummary(start);
  const rows=[['Ground contacts','', 'contactCount'],['Delivered data','GB','deliveredGB'],['Minimum battery SOC','%','minSocPct'],['Maximum junction temperature','K','maxJunctionK']];
  flight='<h3 class="gap">Same 24-hour window</h3><small>'+esc(time(start))+' · '+(start>=60*DAY?'representative-day preview':'chronological samples')+'</small>'+rowTable(['Response','Current','Proposed','Unit'],rows.filter(x=>Number.isFinite(da[x[2]])&&Number.isFinite(db[x[2]])).map(([name,u,k])=>tr([name,fmt(da[k],3),fmt(db[k],3),u])).join(''));
 }
 const heading='<div class="impact-banner '+(errors.length||violations.length?'warn':'')+'"><b>'+esc(label)+'</b><p>'+esc(errors.length?errors.join(' '):newFailures.length?'Newly exceeded sizing limits: '+newFailures.map(r=>r.label).join(', ')+'.':violations.length?'Some proposed margins are below their sizing requirements.':'The proposed design meets the listed sizing checks.')+'</p></div>';
 const info=domains.length?'<div class="impacted-domains">'+domains.map(name=>'<span class="tag">'+esc(name)+'</span>').join('')+'</div>':'';
 const launcher=changes.some(x=>x.key==='launcher')&&assessment.proposed?.hardware,benchmark=launcher?launcher.input.referenceKg:null;
 const launchNote=launcher?'<div class="impact-banner '+(launcher.input.launchAllowanceKg>benchmark?'warn':'')+'"><b>Payload capacity at the reference orbit</b><p>Mission allowance '+fmt(launcher.input.launchAllowanceKg)+' kg · vehicle reference '+fmt(benchmark)+' kg. '+(launcher.input.launchAllowanceKg>benchmark?'The proposed allowance exceeds this vehicle’s published or concept benchmark. Review the mission-specific performance allocation.':'The provider or concept benchmark and the editable mission allowance refer to distinct assumptions. Confirm performance for the selected orbit and recovery mode.')+'</p></div>':'';
 const retained=assessment.retained||[],carry=retained.length?'<h3 class="gap">Retained assumptions to verify</h3>'+rowTable(['Field','Proposed design','Why it needs review'],retained.map(x=>tr([esc(x.label),val(x.key,x.value)+' '+esc(x.unit),esc(x.note)])).join('')):'';
 const purposeNote=family==='aiPurpose'&&assessment.proposed?'<div class="impact-banner"><b>'+esc(assessment.proposed.hardware.ai.label)+'</b><p>'+esc(aiPurposes[next.aiPurpose].description)+'</p><p>Operating estimate '+fmt(assessment.proposed.hardware.ai.activeUnitsPerSec,4)+' '+esc(assessment.proposed.hardware.ai.unit)+'/s · accelerator-memory margin '+plus(assessment.proposed.hardware.ai.memoryMarginGB)+' GB.</p></div>':'';
 const startingNote=starter?'<p>This starting design sets the workload, spacecraft hardware, launcher and operating assumptions for '+esc(aiPurposes[next.aiPurpose].label)+'. It carries over your orbit, mission duration and disposal settings. The review below lists the proposed changes.</p>':'';
 const fieldTable=changes.length?rowTable(['Field','Current','Proposed','Unit'],ins):'';
 const inputs=starter&&changes.length?'<details class="gap"><summary>Review all '+changes.length+' input changes</summary>'+fieldTable+'</details>':fieldTable?'<h3>Input changes</h3>'+fieldTable:'';
 const body=heading+startingNote+info+launchNote+purposeNote+(conflict.length?'<p><b>Edited preset values will be replaced.</b> '+esc(conflict.map(x=>x.label).join(', '))+'.</p>':'')+
 (mode!==view.solve?'<p>Sizing method changes from <b>'+esc(solveModes[view.solve])+'</b> to <b>'+esc(solveModes[mode])+'</b>.</p>':'')+
 inputs+carry+
 (deltas.length?'<h3 class="gap">Coupled design results</h3>'+rowTable(['Quantity','Current','Proposed','Unit'],deltas.map(x=>tr([esc(x.label),fmt(x.before,4),fmt(x.after,4),esc(x.unit)])).join('')):'')+
 (violations.length?'<h3 class="gap">Margins requiring attention</h3>'+rowTable(['Sizing check','Current margin','Proposed margin'],violations.map(x=>tr([esc(x.label),rate(x.before),rate(x.after)])).join('')):'')+flight+
 '<p class="muted gap">'+esc(known)+'</p><div class="dialogrow gap impact-actions"><button class="btn" data-action="cancelimpact">Keep current design</button>'+(errors.length?'':'<button class="btn export" data-action="applyimpact">'+(starter?'Use this mission and spacecraft':'Apply design change')+'</button>')+'</div>';
 pendingImpact={base:input,phase:view.phase,origin,commit:()=>commit(assessment.proposed),valid:!errors.length};open('Review design change',body,'impact');
}
function settleImpact(apply){
 const change=pendingImpact;if(!change)return;
 pendingImpact=null;close();
 const accepted=apply&&change.valid&&change.base===input&&view.phase===change.phase;
 if(accepted)change.commit();else draw();
 if(!accepted||change.origin!=='preset-shelf')reopenEditor(change.origin);
}
function changeParam(key,val,deep=false,opts={}){
 if(lock(key))return;if(key==='aiPurpose'){usePurpose(val,false);return}
 const next=presets[key]?applyPreset(input,key,val):{...input,[key]:val};
 if(['launcher','launchSite'].includes(key)&&val!==input[key])Object.assign(next,siteApproach(next).angles);
 if(val===input[key]&&!presets[key]&&!opts.after){if(deep){draw();reopenEditor(modal)}return}
 const label=(controlByKey[key]?.label||key)+' → '+displaySetting(key,val)+(['launcher','launchSite'].includes(key)?' · match insertion geometry to the launch site':'');
 reviewProposal(next,{label,drag:!deep,family:key,force:!!opts.force||!!presets[key]&&Object.keys(next).some(k=>next[k]!==input[k]),commit:resolved=>{
  input=next;playing=false;view.modified=true;view.event=null;if(opts.after)opts.after();recalc(resolved);
  if(deep){draw();reopenEditor(modal);return}
  if(view.phase==='A'||view.phase==='B')refreshLesson();
  if(view.phase==='A'){$('phase-output').innerHTML=designOutput(hardware,view,result);if(view.domain==='launcher')$('fleet-host').innerHTML=renderLaunchFleet(hardware,view.phase)}
  if(view.phase==='C'){scene?.update(hardware,snap);viewerInfo();renderObservation();renderTrade(false);$('phase-extras').innerHTML=missionTotals(currentContext(),view,time)+phaseHandoff('D',view.domain)}
  if(view.phase==='B'){$('system-choice').innerHTML=designSection();renderDiagram();kpis();drawStudy();lower();timeline()}
  if(!$('domain-readout').hidden)updateReadout();
  if(view.domain==='purpose'||view.domain==='conops')renderPurposePanels();renderDiscipline();
  document.querySelectorAll('[data-param]').forEach(e=>{const v=hardware.input[e.dataset.param];if(document.activeElement!==e&&typeof v==='number')e.value=+v.toFixed(5);if(e.type==='range')e.style.setProperty('--pct',(100*(v-e.min)/(e.max-e.min))+'%')});if($('solvenote'))$('solvenote').innerHTML=solveNote();
 }});
}
let auditJob=null,auditOwner=null,auditAbort=null,auditStatus='',packetJob=null,packetMessage='';
function audit(){
 if(sim.audit)return Promise.resolve(sim.audit);
 if(auditJob&&auditOwner===sim)return auditJob;
 const target=sim,controller=new AbortController();auditAbort=controller;auditOwner=target;auditStatus='Starting chronological sweep…';
 const job=target.runAudit(({days,totalDays})=>{if(auditOwner!==target)return;auditStatus='Integrating mission day '+fmt(days,0)+' of '+fmt(totalDays,0);if($('auditprogress'))$('auditprogress').textContent=auditStatus;$('clockstatus').textContent=auditStatus},{signal:controller.signal}).then(a=>{
  if(sim===target){life=estimateLife(hardware,30,a);view.chronological=true;windowThermalCache=null;daysig='';refreshSamples();draw()}return a
 }).finally(()=>{if(auditJob===job){auditJob=null;auditAbort=null;auditOwner=null;auditStatus=''}});auditJob=job;return job;
}
function readyCard(key,title){
 const f=preparedFile(key);if(!f)return '';
 return `<div class="ready-card"><div><span class="guideflag">FILE READY</span><strong>${esc(f.name)}</strong><small>${esc(f.detail)}</small></div><div class="ready-actions">${fileLink(key,title)}${typeof window.showSaveFilePicker==='function'?`<button class="btn" data-save-file="${key}">Save as…</button>`:''}</div></div>`;
}
function readyDialog(key,title){
 open('Your file is ready',readyCard(key,title)+'<p>The file stays available in Export for this session. Use the download link to save it.</p>','ready');
}
function showExportError(err){
 const reason=err.name==='AbortError'?'The sweep was cancelled.':err.message||'Package generation stopped.';
 open('PDR preparation stopped','<p>'+esc(reason)+'</p><button class="btn export" data-action="pdr">Prepare PDR again</button>','exporterror');
}
function exportMenu(){
 refreshSamples(true);
 retainFile('json',scenarioBlob(scenario()),'ODC-01-scenario.json',designName(view));retainFile('csv',telemetryBlob(samples),'ODC-01-telemetry.csv',time(plotStart)+' to '+time(plotEnd));
 open('Export & import',(preparedFile('pdr')?readyCard('pdr','Download PDR ZIP'):'')+(packetJob?'<div class="callout" id="auditprogress">'+esc(packetMessage||auditStatus||'Preparing the quantitative PDR…')+'</div>':tile('pdr',preparedFile('pdr')?'Prepare a new PDR':'Prepare quantitative PDR','Integrate every mission day, assemble the engineering review, then save the finished ZIP.','package'))+'<div class="direct-exports">'+fileLink('json','Download design JSON')+fileLink('csv','Download telemetry CSV')+'</div>'+(isEditable(view.phase)?tile('import','Import a design','Load a scenario JSON or quantitative PDR ZIP.','upload'):'')+tile('bundle','Prepare static site ZIP','Bundle the complete application and local assets for self-hosting.','folder-down')+(preparedFile('bundle')?readyCard('bundle','Download static site ZIP'):'')+'<div class="model-footnote">Exports are assembled locally from the selected design.</div>','export');
}
async function fullAudit(exporting=false){
 playing=false;open(exporting?'Preparing quantitative PDR':'Chronological mission sweep','<p>Battery energy, temperatures, stored momentum, data and propellant carry across each simulated day.</p><div class="callout" id="auditprogress">'+esc(packetMessage||auditStatus||'Starting local calculation…')+'</div><div class="dialogrow gap"><span class="muted">You can close this panel and return to Export.</span><button class="btn" data-action="cancelaudit">Cancel sweep</button></div>','audit');
 if(exporting&&packetJob)return packetJob;
 const target=sim,chosen=scenario(),h=hardware,sol=result,designLabel=designName(view);
 async function prepare(){
  try{
   const a=await audit();
   if(!exporting){if(modal==='audit')auditResult(a);else toast('Chronological mission sweep complete.');return}
   const start=chosen.view.start,span=Math.min(DAY,target.duration-start);chosen.view.chronological=true;
   const horizon=Math.min(studyHorizon(h.input,chosen.view.studyDays)*DAY,target.duration-start);
   let orderStudy=null;
   if(h.ai.training||h.input.aiPurpose==='agents'){
    if(horizon<=DAY)orderStudy=evaluateService(target,start,horizon);
    else{
     packetOrderAbort=new AbortController();
     packetMessage='Evaluating Earth order through the selected study horizon…';if($('auditprogress'))$('auditprogress').textContent=packetMessage;
     orderStudy=await evaluateServiceAsync(h.input,start,horizon,{...orderSeed(target,start),signal:packetOrderAbort.signal,onProgress:p=>{packetMessage='Earth order · day '+fmt(p.days,0)+' of '+fmt(p.totalDays,0);if($('auditprogress'))$('auditprogress').textContent=packetMessage}});
    }
   }else if(lastOrder?.model===target&&lastOrder.start===start)orderStudy=lastOrder.value;
   packetMessage='Assembling engineering ledgers…';if($('auditprogress'))$('auditprogress').textContent=packetMessage;
   await new Promise(r=>setTimeout(r,0));
   const blob=await makePacket({scenario:chosen,hardware:h,sim:target,result:sol,orderStudy,snap:target.at(chosen.view.t),day:target.daySummary(start),events:target.events(start,span),extraChecks:scenarioTests(),audit:a,onProgress:percent=>{const msg='Packaging ZIP · '+Math.floor(percent)+'%';if(msg!==packetMessage){packetMessage=msg;if($('auditprogress'))$('auditprogress').textContent=msg}}});
   retainFile('pdr',blob,'ODC-01-quantitative-PDR.zip',designLabel+' · '+time(chosen.view.t)+' · '+a.days+' integrated day bins');
   $('export-state').textContent='Ready';$('export-state').hidden=false;
   if(modal==='audit'||modal==='export')readyDialog('pdr','Download PDR ZIP');else toast('PDR ready. Open Export to download it.');
  }catch(err){if(exporting){if(modal==='audit'||modal==='export')showExportError(err);else toast('PDR preparation stopped: '+err.message)}else if(modal==='audit'){if(err.name==='AbortError')close();else open('Sweep stopped','<p>'+esc(err.message)+'</p>','auditerror')}}
 }
 if(!exporting)return prepare();
 packetJob=prepare().finally(()=>{packetJob=null;packetMessage='';packetOrderAbort=null});return packetJob;
}


function auditResult(a){open('Chronological mission results','<p>Computed from consecutive integration steps over '+fmt(a.days,0)+' mission days.</p>'+rowTable(['Result','Value'],[['Minimum battery charge',fmt(a.minSocPct)+'% at '+time(a.minSocTime)],['Maximum junction temperature',fmt(a.maxJunctionK)+' K at '+time(a.maxJunctionTime)],['Peak recorder queue',fmt(a.peakQueueGB)+' GB'],['Earth eclipses',fmt(a.eclipseCount||0)],['Ground passes',fmt(a.contactCount||0)],['Chemical burns',fmt(a.burnCount||0)],['Magnetic unloads',fmt(a.desatCount||0)],['Thermal coverage until first excursion',time(a.thermalQualifiedUntilS)],['First in-flight limit',a.firstCrossing?esc(a.firstCrossing.limit)+' at '+time(a.firstCrossing.time):'No crossing within the analyzed period']].map(r=>tr(r)).join(''))+'<button class="btn export gap" data-action="pdr">'+icon('download',14)+' Download PDR package</button>','auditresults')}
function windowDialog(){open('Mission clock','<p>Select the start of any consecutive 86,400-second window or jump to an exact mission instant. Times use UTC.</p><div class="fieldgrid"><label class="fieldbox">Window start · UTC<input id="windowdate" class="forminput" type="datetime-local" step="1" value="'+liveDate(view.start).slice(0,19).replace(' ','T')+'"></label><label class="fieldbox">Cursor · seconds from launch<input id="cursortime" class="forminput" type="number" min="0" max="'+sim.duration+'" step="0.01" value="'+Number(view.t.toFixed(2))+'"></label></div><div class="chips gap"><button class="chip" data-action="bol">Beginning of life</button><button class="chip" data-action="midlife">Mid-mission day</button><button class="chip" data-action="eol">Final full day</button></div><div class="dialogrow gap"><button class="btn" data-action="gotime">Go to cursor</button><button class="btn export" data-action="setwindow">Apply window</button></div><div class="gap callout">'+(sim.audit?'Chronological mission integration complete.':'Fast mission preview uses representative days after day three. Run the chronological sweep to evaluate every day and retain extrema and event totals.')+'</div><button class="btn gap" data-action="audit">'+icon('activity',14)+(sim.audit?'See sweep results':'Run chronological sweep')+'</button>','window')}
async function actions(a,el){switch(a){
 case 'ai-run-order':await runOrder();break;
 case 'ai-cancel-order':orderJob?.abort();close();break;
 case 'ai-order-json':if(lastOrder?.model===sim){retainFile('ai-order',new Blob([JSON.stringify(lastOrder.value,null,2)],{type:'application/json'}),'ODC-Earth-order.json',aiPurposes[input.aiPurpose].label);readyDialog('ai-order','Download order study')}break;
 case 'ai-transfer':if(isEditable(view.phase))open('Model return budget',transferDesk(hardware),'ai-transfer');break;
 case 'cancelimpact':settleImpact(false);break;case 'applyimpact':settleImpact(true);break;
 case 'thermallayer':toggleThermal();break;
 case 'resetpreset':if(view.preset==='starter')usePurpose(view.starterPurpose,true,view.starterContext||input);else selectPoint(view.preset,true);break;
 case 'guideclose':$('guide-dialog').close();break;
 case 'tempbands':limitDialog();break;
 case 'thermal-audit':await thermalAudit();break;
 case 'phasecontrols':if(isEditable(view.phase))phaseControls();break;

 case 'diagramplay':if(playing){playing=false;draw()}else startFlight();break;
 case 'domainfields':case 'hardware':if(isEditable(view.phase)){view.mode='size';a==='hardware'?params():phaseControls()}break;
 case 'instruments':view.detail=!view.detail;draw();break;
 case 'pinbaseline':view.tradeBase={...input};tradeCache=null;renderTrade(true);toast('Current design pinned for trade studies.');break;
 case 'missioncalc':await fullAudit();break;case 'comparemissions':await compareMissions();break;
 case 'retryflight':prepareFlight();break;case 'flightplay':if(playing){playing=false;draw()}else startFlight();break;
 case 'flightrestart':{const phase=view.phase,type={contact:'contact',reboost:'reboost',desat:'desat',operations:'burst'}[view.chapter];const current=events.find(e=>e.type===type&&view.t>=e.start&&view.t<=e.end);const t=phase==='F'?sim.ignition:current?.start??sim.story(view.chapter)?.start;setTime(t??DEPLOY_END_S);startFlight();break}
 case 'newpreset':if(view.phase==='A'){if(modal)close();view.purposePreview=input.aiPurpose;goPage('conops');$('purpose-host').querySelector('[data-preview-purpose="'+view.purposePreview+'"]')?.focus({preventScroll:true})}break;case 'loadpreset':if(view.phase==='A')$('presetin').click();break;case 'savepreset':savePresetDialog();break;case 'commitpreset':storePreset();break;case 'managepresets':if(view.phase==='A')shelfDialog();break;
 case 'fairingcompare':fairingDialog();break;
 case 'presetshelf':switchPhase('A');goPage('conops');break;
 case 'coreview':if(modal)close();if(!['C','E','F'].includes(view.phase))switchPhase('C');chooseCamera('core');viewerInfo();break;
 case 'nav':document.body.classList.toggle('navshow');break;
 case 'share':{playing=false;const url=new URL(location.href);url.hash='design='+encodeScenario(scenario());open('Share this design','<p>This link restores the installed hardware, solver, mission instant, selected view, and event. Recipients need access to this hosted site.</p><textarea class="fullwide" rows="4" id="shareurl" readonly aria-label="Shareable scenario URL">'+esc(url.href)+'</textarea><div class="dialogrow gap"><button class="btn" data-action="json">Download JSON</button><button class="btn export" data-action="copy">'+icon('clipboard-copy',14)+' Copy link</button></div>','share');break}
 case 'copy':try{await navigator.clipboard.writeText($('shareurl').value);toast('Design link copied.')}catch{$('shareurl').select();if(document.execCommand('copy'))toast('Design link copied.');else toast('Link selected. Use your browser’s copy command.')}break;
 case 'export':playing=false;exportMenu();break;case 'json':retainFile('json',scenarioBlob(scenario()),'ODC-01-scenario.json',designName(view));readyDialog('json','Download design JSON');break;case 'csv':refreshSamples(true);retainFile('csv',telemetryBlob(samples),'ODC-01-telemetry.csv',designName(view));readyDialog('csv','Download CSV');break;case 'import':if(isEditable(view.phase))$('filein').click();break;
 case 'bundle':{const Zip=await zipLibrary(),zip=new Zip(),index=await fetch('./assets.json').then(r=>r.json());for(const name of [...index,'assets.json']){const r=await fetch('./'+name);if(!r.ok)throw Error('Static asset unavailable: '+name);zip.file(name,await r.arrayBuffer())}zip.file('README.txt','Serve this directory over HTTP or HTTPS with index.html at the root. All dependencies are included. No build, API keys or server-side processing are required. ES module scripts need an HTTP origin.');const blob=await zip.generateAsync({type:'blob',mimeType:'application/zip',compression:'DEFLATE'});retainFile('bundle',blob,'orbital-data-center-static.zip','Static HTTP / HTTPS deployment');readyDialog('bundle','Download static site ZIP');break}
 case 'pdr':await fullAudit(true);break;case 'audit':if(sim.audit)auditResult(sim.audit);else await fullAudit();break;case 'cancelaudit':packetOrderAbort?.abort();auditAbort?.abort();close();break;
 case 'close':if(modal==='ai-working')orderJob?.abort();if(modal==='impact')settleImpact(false);else close();break;case 'params':playing=false;params();break;case 'compare':compare();break;case 'events':playing=false;eventFilter=view.domain==='comm'?'contact':'all';eventList();break;case 'eventdetail':eventDetail();break;
 case 'findnext':{const type=eventFilter==='all'?(view.domain==='comm'?'contact':'all'):eventFilter;let found=null;for(let i=1;i<=30&&!found;i++){const t=view.start+i*DAY;if(t>=sim.duration)break;found=sim.events(t,Math.min(DAY,sim.duration-t)).find(e=>type==='all'||e.type===type)}if(found){selectEvent(found);break}toast('No matching event in the next 30 days within this mission.');break}
 case 'layers':open('Visualization layers','<p>Toggle vectors and dimensions in the vehicle view. Arrows encode direction; displayed beam widths are enlarged for visibility.</p><div class="chips">'+Object.entries(overlayNames).map(([k,l])=>'<button class="chip '+(effectiveLayers().includes(k)?'selected':'')+'" aria-pressed="'+effectiveLayers().includes(k)+'" data-layer="'+k+'">'+l+'</button>').join('')+'</div><div class="gap"><button class="btn" data-action="resetcam">'+icon('rotate-ccw',14)+' Reset camera</button></div>','layers');break;
 case 'resetcam':scene?.resetCamera();close();break;
 case 'full':if(document.fullscreenElement)await document.exitFullscreen();else if($('viewer').requestFullscreen)await $('viewer').requestFullscreen();else{$('viewer').classList.toggle('fallbackfull')}break;
 case 'showcomponent':if(modal)close();if(isEditable(view.phase))view.phase='C';view.camera=['fairing','payload','adapter','launcher','pad'].includes(view.inspect)?'launch':['storage','battery','compute','propellant','cmg'].includes(view.inspect)?'core':'spacecraft';draw();$('viewer').scrollIntoView({block:'center'});break;
 case 'viewevent':if(modal)close();view.camera=['burst'].includes(view.event?.type)?'core':view.event?.type==='eclipse'?'orbit':'spacecraft';view.phase=chapterPhase(view.chapter);draw();$('viewer').scrollIntoView({block:'center'});break;
 case 'jumpstart':if(modal)close();if(view.event)setTime(view.event.start,false);break;
 case 'play':if(playing){playing=false;draw()}else startFlight();break;
 case 'prev':setWindow(view.start-DAY);break;case 'next':setWindow(view.start+DAY);break;
 case 'launchseq':jumpGuide('integration');window.scrollTo({top:0,behavior:'smooth'});break;
 case 'window':windowDialog();break;
 case 'setwindow':{const t=(Date.parse($('windowdate').value+'Z')-Date.parse(input.epoch))/1000;if(Number.isFinite(t)){close();setWindow(t)}break}
 case 'gotime':{const t=$('cursortime').valueAsNumber;if(Number.isFinite(t)){close();setTime(t)}break}
 case 'bol':case 'eol':case 'midlife':close();setWindow(a==='bol'?0:a==='eol'?sim.duration-DAY:(sim.duration-DAY)/2);break;
}}
document.addEventListener('click',async e=>{const el=e.target.closest('button,[data-chart],[data-event],[data-inspect],.tracks');if(!el)return;try{
 if(el.dataset.explainView!=null){
  const note=$('field-note');note.open=true;view.teachFolded=false;
  $('field-summary').focus({preventScroll:true});note.scrollIntoView({block:'start'});return;
 }
 if(el.dataset.followLesson!=null){
  const action=activeLesson?.action;if(!action)return;
  if(action.field&&controlByKey[action.field]){if(lock(action.field))openFieldGuide(action.field);else fieldEditor(action.field);return}
  if(action.domain&&Object.hasOwn(domains,action.domain))goPage(action.domain);
  if(action.chapter)jumpGuide(action.chapter);
  else if(action.phase&&Object.hasOwn(phases,action.phase))switchPhase(action.phase);
  return;
 }
 if(el.dataset.compareMoment!=null&&eventStudy?.selected){
  const index=Number(el.dataset.compareMoment);if(!Number.isInteger(index)||index<0||index>2)return;
  view.teachEvent=eventStudy.selected.id;view.event={...eventStudy.selected};setTime(eventStudy.comparison.times[index],false);return;
 }
 if(el.dataset.guideKey){openFieldGuide(el.dataset.guideKey,el.dataset.guideOption);return}
 if(el.dataset.editInput){fieldEditor(el.dataset.editInput);return}
 if(el.dataset.openPurpose){if(modal)close();view.purposePreview=isEditable(view.phase)&&Object.hasOwn(aiPurposes,el.dataset.openPurpose)?el.dataset.openPurpose:null;goPage('purpose');return}
 if(el.dataset.previewPurpose){if(isEditable(view.phase)&&Object.hasOwn(aiPurposes,el.dataset.previewPurpose)){view.purposePreview=el.dataset.previewPurpose;renderPurposePanels();$('purpose-host').querySelector('[data-preview-purpose="'+view.purposePreview+'"]')?.focus({preventScroll:true})}return}
 if(el.dataset.usePurpose){usePurpose(el.dataset.usePurpose,false);return}
 if(el.dataset.provisionPurpose){usePurpose(el.dataset.provisionPurpose,true);return}
 if(el.dataset.studyPurpose){comparePurposes(el.dataset.studyPurpose);return}
 if(el.dataset.artifactCase){if(isEditable(view.phase))open('Model return budget',transferDesk(hardware,el.dataset.artifactCase==='trillion'),'ai-transfer');return}
 if(el.dataset.inspectBay){view.domain='prop';switchPhase('C');return}
 if(el.dataset.gyroCase!==undefined&&isEditable(view.phase)){
  const next=gyroCandidateDesign(input,el.dataset.gyroCase,hardware);if(next)reviewProposal(next,{label:'Change control moment gyroscope package',force:true,commit:resolved=>{input=next;view.modified=true;view.event=null;playing=false;recalc(resolved);draw()}});return;
 }
 if(el.dataset.watchLoading!=null){referencePage=null;view.domain='launcher';view.bayLens='overview';jumpGuide('integration');window.scrollTo({top:0,behavior:'instant'});return}
 if(integrating()&&el.dataset.loadingAt!=null){const t=Number(el.dataset.loadingAt);if(INTEGRATION_TIMES.includes(t)&&t<=loadingEnd(hardware)){view.camera='launch';if(view.bayLens!=='payload')view.bayLens='overview';setTime(t)}return}
 if(integrating()&&el.dataset.loadingPlay!=null){
  if(playing){playing=false;loadingPlayback=false;draw();return}
  const end=loadingEnd(hardware);
  if(view.t>=end||view.t<INTEGRATION_TIMES[1])setTime(end===INTEGRATION_TIMES[1]?INTEGRATION_TIMES[0]:INTEGRATION_TIMES[1]);
  if(view.bayLens!=='payload')view.bayLens='overview';view.camera='launch';view.speed=120;loadingPlayback=true;startFlight();return;
 }
 if(el.dataset.lighting&&['realistic','studio'].includes(el.dataset.lighting)&&!$('orbit-lighting').hidden){
  view.lighting=el.dataset.lighting;syncLighting();checkpoint.save();return;
 }
 if(el.dataset.bayLens){selectBayLens(el.dataset.bayLens);return}
 if(el.dataset.bayToggle&&integrating()){
  if(el.dataset.bayToggle==='labels')view.bayLabels=!view.bayLabels;
  if(el.dataset.bayToggle==='isolate')view.bayIsolate=!view.bayIsolate;
  syncBayView();chooseCamera(view.camera);$('bay-display').querySelector('[data-bay-toggle="'+el.dataset.bayToggle+'"]')?.focus({preventScroll:true});return;
 }
 if(el.dataset.bayReset!=null&&integrating()){scene?.resetCamera();return}
 if(el.dataset.bayAnalysis!=null&&integrating()){switchPhase('C');return}
 if(el.dataset.domain){goPage(el.dataset.domain);return}
 if(el.dataset.disposalMethod){if(view.phase==='A')changeParam('disposalMethod',el.dataset.disposalMethod,true);return}
 if(el.dataset.presetDownload){const p=loadedPresets.find(x=>x.id===el.dataset.presetDownload);if(p)presetDownload(p);return}
 if(el.dataset.presetUnload){if(view.phase!=='A')return;const id=el.dataset.presetUnload;commitShelf(loadedPresets.filter(p=>p.id!==id));if(view.preset===id){view.preset='custom';view.modified=true}draw();shelfDialog();return}
 if(el.dataset.useLauncher){useLauncher(el.dataset.useLauncher);return}
 if(el.dataset.saveFile){try{await saveWithPicker(el.dataset.saveFile);toast('File saved.')}catch(err){if(err.name!=='AbortError')toast(err.message)}return}
 if(el.dataset.thermalInstant){const t=Number(el.dataset.thermalInstant);if(Number.isFinite(t)){if(modal)close();view.phase='C';view.event=null;view.t=clamp(t,-3600,sim.duration);view.chapter='operations';view.start=dayStart(view.t);view.camera=['radiator','enclosure'].includes(view.thermalNode)?'spacecraft':'core';view.overlays=[...new Set([...view.overlays,'thermal'])];refreshSamples();draw()}return}
 if(el.dataset.adoptRating){if(!isEditable(view.phase))return;const key=el.dataset.adoptRating,field=boundFields.find(b=>b.key===key),summary=view.thermalScope==='mission'?sim.audit?.thermal:activeThermalWindow();const derived=requirementResults(view,summary,hardware.input).find(r=>r.key===field?.key);if(derived?.status==='derived'){updateRating(key,derived.valueK,()=>{const next={...view.thermalTargets};delete next[key];view.thermalTargets=next})}return}
 if(el.dataset.phase){switchPhase(el.dataset.phase);return}
 if(el.dataset.watchLiftoff!=null){referencePage=null;view.domain='launcher';view.phase='D';view.camera='launch';view.launchLens='wide';view.speed=1;setTime(-8);window.scrollTo({top:0,behavior:'instant'});return}
 if(el.dataset.page==='launch-design'){view.domain='launcher';switchPhase('A');return}
 if(el.dataset.launchAlignReview!=null){view.domain='launcher';switchPhase('C');return}
 if(el.dataset.matchLaunch!=null&&isEditable(view.phase)){
  const next={...input,...siteApproach(hardware.input).angles};reviewProposal(next,{label:'Align the insertion orbit with this site and launch epoch',force:true,commit:resolved=>{input=next;view.modified=true;playing=false;view.event=null;recalc(resolved);draw()}});return
 }
 if(el.dataset.launchTime!=null&&view.phase==='D'){const t=Number(el.dataset.launchTime);if(Number.isFinite(t)){view.speed=1;view.camera='launch';setTime(t)}return}
 if(el.dataset.launchLens&&view.phase==='D'){view.launchLens=['base','pad','ship'].includes(el.dataset.launchLens)?el.dataset.launchLens:'wide';view.camera='launch';draw();return}
 if(el.dataset.attitudeFlight!=null){view.domain='attitude';jumpGuide('operations');return}
 if(el.dataset.attitudeTime!=null){setTime(Number(el.dataset.attitudeTime));return}
 if(el.dataset.disposalTime){playing=false;setTime(Number(el.dataset.disposalTime));view.phase='F';view.chapter='deorbit';draw();return}
 if(el.dataset.design){selectPoint(el.dataset.design);return}
 if(el.dataset.deploymentLens){
  view.deploymentLens=el.dataset.deploymentLens;chooseCamera('spacecraft');scene?.setDeploymentLens?.(view.deploymentLens);renderObservation();return;
 }
 if(el.dataset.deployAt!==undefined||el.dataset.deployStep!==undefined){
  const t=el.dataset.deployAt!==undefined?deploymentMET(Number(el.dataset.deployAt)):nextDeploymentTime(snap.deployment,Number(el.dataset.deployStep));
  setTime(t);return;
 }
 if(el.dataset.chapter){jumpGuide(el.dataset.chapter);return}
 if(el.dataset.action){await actions(el.dataset.action,el);return}
 if(el.dataset.page){goPage(el.dataset.page);return}
 if(el.dataset.camera){chooseCamera(el.dataset.camera);scene?.update(hardware,snap);viewerInfo();checkpoint.save();return}
 if(el.dataset.mode){if(el.dataset.mode==='fly'&&view.mode==='size'&&view.solve!=='installed'){input={...hardware.input};view.solve='installed';recalc()}view.mode=el.dataset.mode;draw();return}
 if(el.dataset.scope){view.scope=el.dataset.scope;refreshSamples();draw();return}
 if(el.dataset.layer){const k=el.dataset.layer;if(k==='thermal'){toggleThermal();el.setAttribute('aria-pressed',String(effectiveLayers().includes(k)));el.classList.toggle('selected',effectiveLayers().includes(k));return}view.overlays=view.overlays.includes(k)?view.overlays.filter(v=>v!==k):[...view.overlays,k];el.classList.toggle('selected');el.setAttribute('aria-pressed',String(view.overlays.includes(k)));scene?.setOverlays(effectiveLayers());syncThermalToggle();return}
 if(el.dataset.preset){changeParam(el.dataset.preset,el.dataset.id,true);return}
 const target=e.target.closest('[data-event],[data-inspect]');if(target?.dataset.event){selectEvent(events.find(v=>v.id===target.dataset.event));return}if(target?.dataset.inspect){inspect(target.dataset.inspect);return}
 if(el.classList.contains('tracks')||el.dataset.chart){const box=el.getBoundingClientRect(),t=plotStart+clamp((e.clientX-box.left)/box.width,0,1)*(plotEnd-plotStart);
 const ei=e.target.closest('[data-ei]');if(el.classList.contains('tracks')&&!ei&&view.scope!=='mission'){const lane=(e.clientY-box.top)/box.height*45,match=activeEvents().find(v=>t>=v.start&&t<=v.end&&(lane>20?v.type==='contact':v.type==='eclipse'));if(match){selectEvent(match,false);return}}
 if(ei){selectEvent(activeEvents()[Number(ei.dataset.ei)],false);return}playing=false;setTime(t);return}
 }catch(err){toast(err.message||'The requested operation could not be completed.');console.error(err)}});
document.addEventListener('input',e=>{const el=e.target;
 if(el.id==='loading-cursor'&&integrating()){
  playing=false;loadingPlayback=false;view.t=clamp(el.valueAsNumber,INTEGRATION_TIMES[0],loadingEnd(hardware));
  snap=sim.at(view.t);scene?.update(hardware,snap);viewerInfo();refreshLoadingPlayer(document,hardware,snap,false);return;
 }
 if(el.id==='deploy-cursor'){
  playing=false;view.t=clamp(DEPLOY_START_S+el.valueAsNumber,DEPLOY_START_S,DEPLOY_END_S);snap=sim.at(view.t);
  scene?.update(hardware,snap);viewerInfo();refreshLesson();refreshCommissioning(document,hardware,snap);
  const button=$('dep-play');if(button)button.textContent=view.t>=DEPLOY_END_S?'Replay':'Play deployment';return;
 }if(el.id==='field-filter'){const v=el.value.toLowerCase().trim();document.querySelectorAll('[data-query]').forEach(b=>b.hidden=!b.dataset.query.includes(v));return}if(el.id==='ad-seek'){playing=false;seekFlightCursor(el.valueAsNumber);return}if(el.id==='flight-cursor'){playing=false;const [a,b]=flightRange(),t=a+(b-a)*el.valueAsNumber/10000;seekFlightCursor(t);return}if(el.matches('input[type=range][data-param]')){clearTimeout(rebuildId);const v=el.valueAsNumber,key=el.dataset.param;el.style.setProperty('--pct',100*(v-el.min)/(el.max-el.min)+'%');rebuildId=setTimeout(()=>changeParam(key,v),45)}});
document.addEventListener('change',e=>{const el=e.target;try{
 if(el.id==='event-choice'){
  const event=eventStudy?.available.find(e=>e.id===el.value);if(event)selectEvent(event,false);return;
 }
 if(el.id==='camera-exposure'&&!$('orbit-lighting').hidden){view.exposureEV=cameraExposure(el.value);syncLighting();checkpoint.save();return}
 if(el.dataset.param){if(!isEditable(view.phase))return;clearTimeout(rebuildId);const val=el.tagName==='SELECT'?el.value:el.valueAsNumber;if(typeof val==='number'&&!Number.isFinite(val))return;changeParam(el.dataset.param,val,true);return}
 if(el.id==='loading-cursor'||el.id==='ad-seek'){setTime(el.valueAsNumber);return}
 if(el.id==='flight-cursor'){const [start,end]=flightRange();setTime(start+(end-start)*el.valueAsNumber/10000);return}
 if(el.id==='diagram-thermal-scale'){view.thermalScale=el.value==='full'?'full':'working';scene?.setThermalScale?.(view.thermalScale);renderDiagram();return}
 if(el.dataset.rating){updateRating(el.dataset.rating,el.valueAsNumber);return}
 if(el.dataset.boundRole){if(!isEditable(view.phase))return;view.modified=true;view.thermalTargets={...view.thermalTargets};if(el.value==='derive')view.thermalTargets[el.dataset.boundRole]='derive';else delete view.thermalTargets[el.dataset.boundRole];limitDialog();return}
 if(el.id==='thermal-node'){view.thermalNode=el.value;limitDialog();return}
 if(el.id==='thermal-scope'){if(!isEditable(view.phase))return;view.modified=true;view.thermalScope=el.value;limitDialog();return}
 if(el.id==='thermal-pad'){if(!isEditable(view.phase))return;view.modified=true;view.thermalPadding=clamp(el.valueAsNumber||0,0,100);limitDialog();return}
 if(el.id==='ai-study-days'){if(isEditable(view.phase)&&[0,1,7,30,60,90].includes(+el.value))view.studyDays=+el.value;return}
 if(el.id==='trade-key'){view.tradeKey=el.value;renderTrade(true);return}
 if(el.id==='flight-rate'){view.speed=Number(el.value);return}
 if(el.id==='guidelauncher'){useLauncher(el.value);return}
 if(el.id==='solve'||el.id==='quicksolve'||el.id==='phase-solve'){if(!isEditable(view.phase)||!Object.hasOwn(solveModes,el.value))return;const mode=el.value;reviewProposal(input,{mode,label:'Sizing method · '+solveModes[mode],commit:resolved=>{view.modified=true;view.solve=mode;view.event=null;recalc(resolved);draw()}})}
 if(el.id==='epoch'){changeParam('epoch',new Date(el.value+'Z').toISOString(),true)}
 if(el.id==='speed')view.speed=Number(el.value);if(el.id==='eventfilter'){eventFilter=el.value;eventList()}if(el.id==='category')compare(el.value);
 }catch(err){toast(err.message)}});
$('filein').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f||!isEditable(view.phase))return;try{
 const o=await restoreFile(f);if(o?.schema!=='odc-scenario/1'||!o.design)throw Error('Choose a saved scenario or PDR package.');
 const next=sizeDesign(o.design).input,mode=Object.hasOwn(solveModes,o.view?.solve)?o.view.solve:'installed';
 reviewProposal(next,{mode,label:'Import scenario · '+f.name,force:true,commit:()=>{loadScenario(o);recalc();scene?.setThermalScale?.(view.thermalScale);if(view.cameraStates)scene?.setCameraState?.(view.cameraStates);if(modal)close();draw();if(view.phase==='E')prepareFlight();else if(view.phase==='F')prepareCloseout();else if(initialChronology)fullAudit();toast('Design imported.')}});
 }catch(err){toast(err.message)}};
$('dialog').addEventListener('cancel',e=>{if(modal==='impact'){e.preventDefault();settleImpact(false)}else if(modal==='ai-working')orderJob?.abort()});
document.addEventListener('toggle',e=>{if(e.target.id==='field-note')view.teachFolded=!e.target.open;if(e.target.matches?.('.bay-basis'))view.bayBasis=e.target.open;if(e.target.matches?.('.bay-time'))view.bayClock=e.target.open},true);
document.addEventListener('keydown',e=>{if(e.target.classList.contains('tracks')&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();playing=false;setTime(view.t+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?60:1))}});
$('scrim').onclick=()=>document.body.classList.remove('navshow');$('dialog').addEventListener('close',()=>{if(!$('dialog').open)modal=null});$('dialog').onclick=e=>{if(e.target===$('dialog')&&e.clientX<$('dialog').getBoundingClientRect().left){if(modal==='impact')settleImpact(false);else close()}};
const dayStart=t=>clamp(Math.floor(t/DAY)*DAY,0,Math.max(0,sim.duration-DAY));
function syncChapterToTime(s=sim.at(view.t)){view.chapter=view.phase==='F'||(s.disposalStatus&&s.disposalStatus!=='scheduled'&&view.t>=sim.ignition)?'deorbit':view.t< -600?'integration':view.t<0?'pad':view.t<540?'ascent':(view.t<DEPLOY_START_S||view.phase==='D'&&view.t===DEPLOY_START_S)?'insertion':(view.t<DEPLOY_END_S||view.chapter==='commissioning'&&view.t===DEPLOY_END_S)?'commissioning':s.burnKind==='reboost'?'reboost':s.desat?'desat':s.station?'contact':'operations'}
function jumpGuide(id,run=false){
 loadingPlayback=false;
 const c=chapters.find(x=>x.id===id);if(!c)return;
 playing=false;referencePage=null;const e=sim.story(id);
 if(!e||e.status==='unavailable'){toast(e?.reason||'No matching modeled event.');draw();return}
 view.phase=chapterPhase(id);view.chapter=id;view.event=null;if(id==='pad'||id==='ascent')view.speed=1;view.t=id==='pad'?-8:clamp(e.start??e.instant,-3600,sim.duration);view.camera=c.camera;view.start=dayStart(view.t);refreshSamples();snap=sim.at(view.t);draw();if(view.phase==='E')prepareFlight();else if(view.phase==='F')prepareCloseout();if(run)startFlight();if(id==='commissioning')window.scrollTo({top:0,behavior:'instant'})
}
function fairingDialog(){
 const rows=Object.entries(presets.launcher).map(([k,v])=>{const h=sizeDesign(applyPreset(hardware.input,'launcher',k)),f=h.fairing;return '<tr><td><strong>'+esc(v.label)+'</strong><small>'+esc(f.basis)+'</small></td><td>'+fmt(f.outerDiameterM,2)+' m</td><td>'+fmt(f.maxDiameterM,2)+' × '+fmt(f.heightM,2)+' m</td><td>'+plus(f.radialClearanceM)+' m</td><td>'+plus(f.axialClearanceM)+' m</td><td>'+(isEditable(view.phase)?'<button class="chip" data-use-launcher="'+k+'">Select</button>':k===hardware.input.launcher?'Selected launcher':'Comparison')+'</td></tr>'});
 const f=hardware.fairing;open('Payload fairing comparison','<p>The same folded vehicle is tested against each tapered profile. Margins include the configured payload motion allowances.</p>'+rowTable(['Launch option','Nominal Ø','Usable Ø × height','Radial margin','Axial margin',''],rows.join(''))+'<div class="guide-source"><strong>'+esc(hardware.launcherLabel)+'</strong><p>'+esc(f.note)+'</p><a href="'+esc(f.sourceUrl)+'" target="_blank" rel="noopener">Read the source '+icon('arrow-up-right',12)+'</a></div>'+vehicleDrawings(hardware),'fairings');
}
function useLauncher(key){if(isEditable(view.phase)&&presets.launcher[key]&&key!==input.launcher)changeParam('launcher',key,true)}
function pointTip(el,e){
 const r=el.getBoundingClientRect(),i=Number.isFinite(e.clientX)?Math.round(clamp((e.clientX-r.left)/r.width,0,1)*(samples.length-1)):Math.floor(samples.length/2),s=samples[i];if(!s)return '';
 const card=el.closest('[data-metric]'),k=el.dataset.chart,l=card?.dataset.label||'Bus demand',unit=card?.dataset.unit||'kW';
 return time(s.t)+' · '+l+' '+fmt(k==='true'?s.loadKW:value(k,s),3)+' '+unit+'. Click to set the shared mission cursor.';
}


let editKey='',windowThermalCache=null;const diagramParts={};
function switchPhase(id){
 if(!Object.hasOwn(phases,id)||!referencePage&&id===view.phase)return;
 loadingPlayback=false;const fromLaunch=view.phase==='D'&&id==='E';
 if(modal)close();referencePage=null;playing=false;deferredFlightTime=null;flightSyncError='';view.phase=id;view.event=null;view.inspect=null;view.detail=false;view.mode=isEditable(id)?'size':'fly';document.body.classList.remove('navshow');
 if(id==='C'&&!view.tradeBase)view.tradeBase={...input};
 const phaseCase={D:'integration',E:fromLaunch?'commissioning':'operations',F:'deorbit'},stage=phaseCase[id];
 if(stage){const e=sim.story(stage);view.chapter=stage;view.t=(fromLaunch||id==='D'||id==='F'?e.start:e.instant)??e.instant??view.t}
 else if(view.t<DEPLOY_END_S||view.t>=sim.ignition){view.chapter='operations';view.t=sim.story('operations').instant||1250}
 view.camera=fromLaunch?'spacecraft':id==='D'?'launch':recommendedCamera(id,view.domain);
 view.start=dayStart(view.t);refreshSamples();if(id==='E')playing=!fromLaunch&&!matchMedia('(prefers-reduced-motion: reduce)').matches;lastTick=performance.now();draw();if(id==='E')prepareFlight();else if(id==='F')prepareCloseout();window.scrollTo({top:0,behavior:'instant'});
}
function syncThermalToggle(){const b=$('thermal-toggle'),on=effectiveLayers().includes('thermal');b?.setAttribute('aria-pressed',String(on));if(b)b.disabled=view.camera==='orbit'}

function activeThermalWindow(){
 if(windowThermalCache?.sim===sim&&windowThermalCache.start===view.start&&windowThermalCache.chronological===!!sim.audit)return windowThermalCache.summary;
 const summary=sim.thermalWindow(view.start,Math.min(DAY,sim.duration-view.start));windowThermalCache={sim,start:view.start,chronological:!!sim.audit,summary};return summary;
}
function limitDialog(){if(!isEditable(view.phase)){
 open('Thermal flight status','<p>Operating and survival qualification at '+time(view.t)+'.</p>'+rowTable(['Component','Activity','Temperature','Applicable range','Result'],snap.thermalQualification.map(q=>tr([esc(q.label),esc(q.activity),fmt(q.temperatureK,2)+' K',fmt(q.minK,1)+'–'+fmt(q.maxK,1)+' K',esc(q.status)])).join('')),'flight-limits');return}
 const summary=view.thermalScope==='mission'?sim.audit?.thermal:activeThermalWindow();open('Thermal limits & requirements',thermalInspector(view,hardware,snap,summary,time(view.t)),'limits')}
async function thermalAudit(){
 const target=sim;open('Qualifying the thermal design','<p>The worker checks each component against the band for its actual activity throughout the mission.</p><div class="callout" id="auditprogress">Starting chronological analysis…</div><button class="btn gap" data-action="cancelaudit">Cancel sweep</button>','thermal-audit');
 try{await audit();if(sim===target&&modal==='thermal-audit')limitDialog();else toast('Chronological thermal results ready.')}catch(e){if(e.name!=='AbortError')open('Thermal analysis stopped','<p>'+esc(e.message)+'</p>','auditerror')}
}
function updateRating(key,v,after){if(!isEditable(view.phase)||!boundFields.some(b=>b.key===key)||!Number.isFinite(v))return;changeParam(key,v,true,{force:true,after})}
function fieldEditor(key){if(!isEditable(view.phase))return;
 const c=controlByKey[key];if(!c)return;editKey=key;view.mode='size';
 const bound=boundFields.find(b=>b.key===key);if(bound){view.thermalNode=bound.id;limitDialog();return}
 open(c.label,'<p>'+esc(explainMetric('@'+key,c.label,c.unit))+'</p>'+inputRow(key)+'<div class="dialogrow gap"><button class="btn" data-action="params">All assumptions</button><button class="btn export" data-action="close">Done</button></div>','editfield');
}
function phaseControls(){
 if(!isEditable(view.phase))return;
 const keys=purposeDomainFields(view.domain,hardware.input).filter(k=>controlByKey[k]&&(k!=='disposalMethod'||view.phase==='A'));
 const extra=view.domain==='orbit'?'<label class="fieldbox">Epoch · UTC <input type="datetime-local" id="epoch" class="forminput" step="1" value="'+esc(input.epoch.slice(0,19))+'"></label>':'';
 open(domains[view.domain].label+' design inputs','<p>Changes propagate through the integrated design and subsequent flight phases.</p><div class="fieldgrid">'+extra+keys.map(k=>inputRow(k)).join('')+'</div><div class="dialogrow gap"><button class="btn" data-action="params">All parameters & solver</button><button class="btn export" data-action="close">Done</button></div>','phasecontrols');
}
function renderDiagram(){const ctx={hardware,state:snap,day,events,service:['purpose','conops'].includes(view.domain)?serviceFor(sim,view.start):null,selected:diagramParts[view.domain],thermalScale:view.thermalScale,qualificationWindow:view.domain==='thermal'?activeThermalWindow():undefined};updateSubsystemDiagram($('diagram-host'),view.domain,ctx)}
function sectionHeader(index,title,description,actions=''){return '<header class="phase-b-heading '+(index==='02'?'analysis-heading':'')+'"><span class="section-number">'+index+'</span><div><h2>'+title+'</h2><p>'+esc(description)+'</p></div>'+actions+'</header>'}
function designSection(){const d=domains[view.domain],params=purposeDomainFields(view.domain,hardware.input).filter(k=>controlByKey[k]&&k!=='disposalMethod').slice(0,4);
 return sectionHeader('01','Design',purposeStageDescription(view.domain,'B',hardware),'<div class="chips"><button class="btn" data-action="domainfields">Edit design inputs</button>'+(view.domain==='thermal'?'<button class="btn" data-action="tempbands">Thermal limits</button>':'')+'</div>')+'<div class="base-assumptions">'+params.map(k=>{const c=controlByKey[k],v=displaySetting(k,hardware.input[k]);return '<button class="chip" data-edit-input="'+esc(k)+'"><small>'+esc(c.label)+'</small><b>'+esc(fmt(v))+' '+esc(c.unit||'')+'</b></button>'}).join('')+'</div>';
}
function diagramTools(){return sectionHeader('02','Analysis','Read the response of this design at the mission clock. Select a time or event to follow its effects.')+`<div class="diagram-toolbar"><div><button class="btn" data-action="diagramplay">${icon(playing?'pause':'play',13)} ${playing?'Pause':'Run clock'}</button><button class="textbutton" data-action="window" id="diagram-clock">${esc(time(view.t))} ${icon('clock-3',13)}</button><button class="textbutton" data-action="events">Select event</button></div></div>`}
function updateDiagramClock(){if($('diagram-clock'))$('diagram-clock').textContent=time(view.t)}


function recommendedCamera(phase,domain){return recommendedDomainCamera(phase,domain)}
function effectiveLayers(){const automatic=view.domain==='thermal'&&['C','D','E'].includes(view.phase)&&view.thermalAuto!==false;return automatic?[...new Set([...view.overlays,'thermal'])]:view.overlays}
function toggleThermal(){const was=effectiveLayers().includes('thermal');view.overlays=view.overlays.filter(k=>k!=='thermal');view.thermalAuto=!was;if(!was&&view.domain!=='thermal')view.overlays.push('thermal');scene?.setOverlays(effectiveLayers());syncThermalToggle()}
function currentContext(includeService=true){return {hardware,state:snap,sim,service:includeService&&view.phase!=='D'&&['purpose','conops'].includes(view.domain)?serviceFor(sim,view.start):null,audit:sim.audit,day,events,samples:daySamples,windowStart:view.start,windowEnd:Math.min(sim.duration,view.start+DAY)}}
function bayTimeControls(){
 const rates=[1,10,30,120,600].map(rate=>`<option value="${rate}" ${view.speed===rate?'selected':''}>${rate}×</option>`).join('');
 return `<details class="bay-time panel" ${view.bayClock||view.detail?'open':''}><summary>Mission clock and engineering instruments</summary><div class="bay-playback"><button class="btn" data-action="flightplay">${icon(playing?'pause':'play',13)} ${playing?'Pause':'Play launch preparation'}</button><label>Playback speed <select id="flight-rate">${rates}</select></label></div>${flightPlayer()}</details>`;
}
function renderObservation(){$('guidepanel').innerHTML=integrating()?bayGuide(hardware,snap,view):commissioning()?commissioningGuide(hardware,snap,view,playing):showLaunchDirector(view)?launchGuide(hardware,snap,view,playing):observationCard({...view,isPlaying:playing},currentContext(!lessonInRail()),time(view.t),lessonInRail())}
function renderDisposal(){
 const p=sim.disposal(),host=$('disposal-plot'),expanded=host.querySelector('details[open]')!=null;
 scene?.setDisposalPlan?.(p);host.innerHTML=renderDisposalView(hardware,snap,p);if(expanded){const d=host.querySelector('details');if(d)d.open=true}
}
function comparison(){
 const keys=purposeTradeKeys(view.domain,hardware.input).filter(k=>controlByKey[k]&&!lock(k)&&k!=='disposalMethod');if(!keys.length)keys.push('altitudeKm');
 if(!keys.includes(view.tradeKey))view.tradeKey=keys[0];if(!view.tradeBase)view.tradeBase={...input};
 const k=view.tradeKey,pin=view.tradeBase;
 if(!tradeCache||tradeCache.current!==sim||tradeCache.pin!==pin||tradeCache.key!==k){
  let baseInput=input;if(input[k]!==pin[k]){
   baseInput={...input,[k]:pin[k]};if(presets[k])for(const field of Object.keys(presets[k][pin[k]]||{})){if(field!=='label'&&Object.hasOwn(pin,field))baseInput[field]=pin[field]}
  }
  const base=baseInput===input?hardware:inverseSolve(baseInput,view.solve).hardware;
  tradeCache={current:sim,key:k,pin,base,model:base===hardware?sim:createSimulation(base),start:null};
 }
 return {keys,...tradeCache};
}
function renderTrade(editors=true){
 const b=comparison();if(editors)$('trade-input').innerHTML=analysisControls(view,b.keys,controlByKey,k=>inputRow(k,false,'trade'));
 const start=view.start,end=Math.min(start+DAY,b.model.duration,sim.duration);
 if(end<=start||view.t>b.model.duration){showLesson({question:'Can these designs be compared at this time?',explanation:'The pinned mission has ended by this instant. Pick a time covered by both designs to compare them on the same clock.',evidence:[]});$('trade-output').innerHTML='<div class="callout">The pinned design ends before the selected instant. Choose an earlier analysis window to compare both cases.</div>';return}
 const live=currentContext(),both=b.model===sim;if(!both&&(tradeCache.start!==start||tradeCache.end!==end||tradeCache.audited!==!!b.model.audit)){
  tradeCache.baseDay=b.model.daySummary(start);tradeCache.baseSamples=b.model.window(start,end-start,145);tradeCache.start=start;tradeCache.end=end;tradeCache.audited=!!b.model.audit;
 }
 const base=both?live:{hardware:b.base,service:['purpose','conops'].includes(view.domain)?serviceFor(b.model,start):null,state:b.model.at(view.t),day:tradeCache.baseDay,events:[],sim:b.model,audit:b.model.audit,samples:tradeCache.baseSamples,windowStart:start,windowEnd:end};
 const off=live.samples.at(-1)?.t>end+.01;if(off)live.samples=sim.window(start,end-start,145);
 const control=controlByKey[b.key],interpretation=tradeTeaching(view.domain,base,live,{key:b.key,label:control.label,same:both});
 if(interpretation)interpretation.action={label:'Explore '+control.label.toLowerCase(),field:b.key};
 showLesson(interpretation);
 $('trade-output').innerHTML=`<div class="trade-caption"><b>${esc(controlByKey[b.key].label)}</b><span>Pinned ${esc(fmt(view.tradeBase[b.key]))} → current ${esc(fmt(input[b.key]))} ${esc(controlByKey[b.key].unit||'')}</span></div>`+renderDomainTrade(view.domain,base,live)+'<div class="trade-footer"><button class="btn" data-action="comparemissions">'+icon('activity',13)+' Compare both full missions</button><span id="trade-status">'+(both?'Both cases currently share one design.':b.model.audit&&sim.audit?'Both missions integrated chronologically.':'Day curves use matched mission times.')+'</span></div>';
}
async function compareMissions(){
 if(tradeBusy||view.phase!=='C')return;const b=comparison(),current=sim;tradeBusy=true;open('Mission trade study','<p>Integrating the current design and the one-input baseline across their mission horizons.</p><div id="auditprogress" class="callout">Integrating current design…</div>','compare-missions');
 try{
  await audit();if(b.model!==current){await b.model.runAudit(({days,totalDays})=>{if($('auditprogress'))$('auditprogress').textContent='Baseline · day '+fmt(days,0)+' of '+fmt(totalDays,0)})}
  if(sim===current){if(modal==='compare-missions')close();draw();toast('Chronological mission comparison ready.')}
 }catch(err){if(err.name!=='AbortError')open('Mission comparison stopped','<p>'+esc(err.message)+'</p>','error')}
 finally{tradeBusy=false}
}
function selectPoint(id,reset=false){
 if(view.phase!=='A')return;
 const item=loadedPresets.find(x=>x.id===id)||(reset&&presetList.find(x=>x.id===id));if(!item)return;
 reviewProposal(item.design,{mode:item.solver||'installed',label:(reset?'Restore ':'Open ')+item.name,force:reset||view.modified,commit:()=>{if(modal==='preset-shelf')close();activateRecord(item)}});
}
function activateRecord(item){
 view={...defaultView,phase:'A',domain:view.domain,preset:item.id,presetName:item.name,solve:item.solver||'installed',thermalTargets:{...item.thermalTargets},thermalScope:item.thermalScope||'window',thermalPadding:item.thermalPadding||0};
 input={...item.design};recalc();draw();
}
function commitShelf(next){
 try{writeShelf(window.localStorage,next);loadedPresets=next;return true}
 catch{loadedPresets=next;return false}
}
function savePresetDialog(){
 if(view.phase!=='A')return;const current=loadedPresets.find(p=>p.id===view.preset),name=(current?.name||designName({...view,modified:false},hardware))+' variant';
 open('Save design as',`<p>Save the customer mission, hardware, sizing choices and thermal requirements together. You can reopen the design here or download a portable copy.</p><div class="fieldgrid"><label class="fieldbox">Design name<input id="preset-name" class="forminput" maxlength="64" value="${esc(name.slice(0,64))}"></label><label class="fieldbox">Description<input id="preset-description" class="forminput" maxlength="320" placeholder="Mission purpose or design changes"></label></div><div class="callout gap">${esc(designName(view))} · ${fmt(hardware.itKw)} kW IT · ${input.disposalMethod==='graveyard'?'Graveyard orbit':'Targeted reentry'}</div><button class="btn export gap" data-action="commitpreset">Save copy and prepare JSON</button>`,'save-preset');
}
function storePreset(){
 if(view.phase!=='A')return;const item=missionPreset({name:$('preset-name').value,description:$('preset-description').value,design:input,solver:view.solve,thermalTargets:view.thermalTargets,thermalPadding:view.thermalPadding,thermalScope:view.thermalScope}),added=addToShelf(loadedPresets,item);
 const persisted=commitShelf(added.shelf);activateRecord(added.record);presetDownload(added.record,persisted?'Saved to your designs.':'Loaded for this session. Browser storage is unavailable. Download the JSON to keep this design.');
}
function presetDownload(p,detail='Saved mission design'){
 retainFile('preset',new Blob([JSON.stringify(p,null,2)],{type:'application/json'}),presetFileName(p.name),detail);readyDialog('preset','Download design file');
}
function shelfDialog(){
 if(view.phase!=='A')return;
 const rows=loadedPresets.map(p=>{
  const current=p.id===view.preset&&!view.modified;
  return '<div class="manage-row"><div><strong>'+esc(p.name)+'</strong><small>'+esc(aiPurposes[p.design.aiPurpose||'text'].label)+(p.description?' · '+esc(p.description):'')+'</small></div><button class="chip" data-design="'+esc(p.id)+'" '+(current?'disabled':'')+'>'+(current?'Open now':'Open design')+'</button><button class="chip" data-preset-download="'+esc(p.id)+'">Download JSON</button><button class="chip" data-preset-unload="'+esc(p.id)+'">Unload</button></div>';
 }).join('');
 open('Saved designs',(rows||'<p>Your named designs will appear here. Save the current mission or import a design file to get started.</p>')+'<div class="dialogrow gap"><button class="btn" data-action="loadpreset">Import design file</button><button class="btn" data-action="savepreset">Save current design as…</button></div>','preset-shelf');
}
$('presetin').onchange=async e=>{
 const files=Array.from(e.target.files||[]);e.target.value='';if(view.phase!=='A'||!files.length)return;
 try{let current=loadedPresets,last;for(const f of files){if(f.size>750000)throw Error('Choose a preset JSON under 750 kB.');const added=addToShelf(current,parsePreset(await f.text()));current=added.shelf;last=added.record}
  reviewProposal(last.design,{mode:last.solver,label:'Import design · '+last.name,force:view.modified,commit:()=>{const persisted=commitShelf(current);if(modal)close();activateRecord(last);toast(persisted?'Saved designs imported.':'Loaded in this session. Browser storage is unavailable.')}});
 }catch(err){toast(err.message)}
};
function flightRange(){
 if(view.phase==='D')return [-3600,DEPLOY_START_S];if(view.phase==='F'){const p=sim.disposal();return [p?.start??sim.ignition,p?.end??sim.duration]}
 return [Math.max(DEPLOY_START_S,view.start),Math.min(view.start+DAY,sim.ignition)];
}
function flightPlayer(){
 const [start,end]=flightRange(),pc=clamp((view.t-start)/(end-start||1),0,1),status=view.phase==='E'?(sim.audit?'Chronological mission complete':flightSyncError?'Mission integration interrupted':auditStatus||'Chronological flight · resolving mission'):view.phase==='F'?(sim.audit?'Chronological disposal solution':'Preview · resolving preceding mission'):'Mission elapsed time';
 return `<section class="flightdeck"><div class="flight-clock"><span class="guideflag">${view.phase==='E'?'FLIGHT DIRECTOR':'MISSION CLOCK'}</span><b id="live-met">${time(view.t)}</b><span id="flight-verification">${esc(status)}</span></div><input aria-label="Scrub modeled flight time" id="flight-cursor" type="range" min="0" max="10000" step="1" value="${Math.round(pc*10000)}" style="--pct:${pc*100}%"><div class="flight-deck-tools"><button class="chip" data-action="window">Time window</button><button class="chip" data-action="events">Event ledger</button><button class="chip" data-action="instruments">${view.detail?'Hide':'Show'} instruments</button>${flightSyncError?'<button class="chip" data-action="retryflight">Retry integration</button>':''}</div></section>`;
}
function prepareFlight(){
 if(commissioning())return;
 if(view.phase!=='E'||sim.audit)return;
 // The core integrates the initial 60 days sequentially. Late seeks wait for verified daily seeds.
 if(snap.projected||view.t>=60*DAY){
  deferredFlightTime=view.t;view.t=sim.story('operations').instant||3438;view.start=dayStart(view.t);refreshSamples();snap=sim.at(view.t);draw();
 }
 const owner=sim;flightSyncError='';
 audit().then(()=>{if(sim!==owner||view.phase!=='E')return;if(deferredFlightTime!==null){const t=deferredFlightTime;deferredFlightTime=null;setTime(t)}draw()}).catch(err=>{if(sim!==owner||view.phase!=='E'||err.name==='AbortError')return;flightSyncError=err.message;playing=false;draw();toast(err.message)});
}
function prepareCloseout(){
 if(view.phase!=='F'||sim.audit)return;const owner=sim,preview=sim.disposal();
 audit().then(()=>{if(owner!==sim||view.phase!=='F')return;const now=sim.disposal(),fraction=clamp((view.t-preview.start)/Math.max(1,preview.end-preview.start),0,1);view.t=now.start+(now.end-now.start)*fraction;view.start=dayStart(view.t);refreshSamples();draw()}).catch(err=>{if(err.name!=='AbortError'&&view.phase==='F')toast(err.message)})
}
function startFlight(){
 const p=view.phase;if(!['B','C','D','E','F'].includes(p))return;
 if(p==='D'&&view.t>=539.999&&view.t<540&&siteApproach(hardware.input).gapKm>.02){setTime(540);toast('Opened the independently specified operating orbit.')}
 if(commissioning()&&view.t>=DEPLOY_END_S)setTime(DEPLOY_START_S);
 if(p==='E'&&flightSyncError&&!commissioning()){prepareFlight();return}
 if(p==='F'&&sim.disposal()?.feasible===false){toast(sim.disposal().reason);return}
 let limit=p==='D'?900:p==='F'?sim.disposal()?.end:p==='E'?sim.ignition:sim.duration;
 if(Number.isFinite(limit)&&view.t>=limit)setTime(p==='D'?-3600:p==='F'?sim.ignition:DEPLOY_END_S);
 playing=true;lastTick=performance.now();draw();if(p==='E')prepareFlight()
}
let lastInstrumentPaint=0,lastAnalysisPaint=0;
function advanceFlight(ms){
 const p=view.phase,end=loadingPlayback&&integrating()?loadingEnd(hardware):p==='D'?DEPLOY_START_S:commissioning()?DEPLOY_END_S:p==='E'?sim.ignition:p==='F'?(sim.disposal()?.end??sim.duration):sim.duration;
 let t=Math.min(end,view.t+Math.min(2,(ms-lastTick)/1000)*view.speed);lastTick=ms;
 if(p==='E'&&!sim.audit&&t>=60*DAY){deferredFlightTime=t;playing=false;draw();prepareFlight();return}
 if(p==='D'&&view.t<539.999&&t>=539.999&&siteApproach(hardware.input).gapKm>.02){
  playing=false;setTime(539.999);toast('Site ascent complete. Review the insertion mismatch or continue with the requested orbit.');return
 }
 const wasDay=view.start;view.t=t;view.start=dayStart(t);refreshSamples();snap=sim.at(t);if(t>=end){playing=false;loadingPlayback=false}
 if(p==='D'||p==='E'){const oldChapter=view.chapter;syncChapterToTime(snap);if(p==='D'&&t>=900)view.chapter='insertion';
  if(view.chapter!==oldChapter){if(p==='D'){draw();return}if(view.chapter==='commissioning'||oldChapter==='commissioning'){draw();return}scene?.setChapter?.(view.chapter);$('missionpath').innerHTML=flightChapters(view)}}
 if(wasDay!==view.start||!playing){draw();return}
 const analysisDue=ms-lastAnalysisPaint>=1000;
 if(analysisDue){lastAnalysisPaint=ms;refreshLesson();refreshEventExplorer();if(!integrating()||view.detail)renderDiscipline(true);if(showLaunchDirector(view))document.querySelectorAll('[data-launch-time]').forEach(b=>{const t=Number(b.dataset.launchTime),next=b.nextElementSibling;b.setAttribute('aria-current',view.t>=t&&(!next||view.t<Number(next.dataset.launchTime))?'step':'false')})}
 if(p==='B'){renderDiagram();updateDiagramClock()}else{
  scene?.update(hardware,snap);
  if(ms-lastInstrumentPaint<180&&!analysisDue)return;
  lastInstrumentPaint=ms;
  const active=document.activeElement,key=active?.id==='flight-rate'||active?.closest?.('.flight-transport')||$('guidepanel').matches?.(':hover');
  viewerInfo();if(integrating()&&hasLoadingDirector(view.domain))refreshLoadingPlayer(document,hardware,snap,playing);if(commissioning())refreshCommissioning(document,hardware,snap);else if(!integrating()){if(showLaunchDirector(view))refreshLaunchGuide(document,hardware.input,snap);else if(!key)renderObservation();}
  if($('live-met'))$('live-met').textContent=time(t);const slider=$('flight-cursor');if(slider&&document.activeElement!==slider){const [start,finish]=flightRange();slider.value=10000*clamp((t-start)/(finish-start||1),0,1);slider.style.setProperty('--pct',slider.value/100+'%')}
  if(p==='C'&&analysisDue)renderTrade(false);
  if(p==='F'&&analysisDue)renderDisposal();
  if(analysisDue&&!$('domain-readout').hidden&&!$('domain-readout').matches?.(':hover'))updateReadout()
 }
 if(view.detail||p==='B'){drawStudy();lower();kpis();if($('timecode'))$('timecode').textContent=time(t);const c=document.querySelector('.cursor');if(c)c.style.left=clamp(100*(t-plotStart)/(plotEnd-plotStart),0,100)+'%'}
}
let clockFrame=null;
function scheduleClock(){
 if(playing&&!referencePage&&clockFrame===null)clockFrame=requestAnimationFrame(tick);
}
function tick(ms){
 clockFrame=null;
 if(!playing||referencePage)return;
 if(ms-lastTick>=(view.phase==='B'?180:40))advanceFlight(ms);
 scheduleClock();
}


bindSubsystemDiagram($('diagram-host'),{onEdit:fieldEditor,onInspect:inspect,onEvent:id=>{const e=events.find(v=>v.id===id);if(e)selectEvent(e)},onSelect:(key,page)=>{diagramParts[page]=key;if(page==='thermal'&&thermalNodes.some(n=>n.id===key))view.thermalNode=key}});
window.addEventListener('pagehide',e=>{if(hardware)checkpoint.save();if(!e.persisted)releaseFiles()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&hardware)checkpoint.save()});
hydrateIcons();document.querySelector('.navopen').innerHTML=icon('menu',18);
help=installHelp({fieldTip:el=>view.phase==='A'||el.dataset.guideKey?shortHint(helpForElement(el,hardware?.input||input)):'',chartTip:pointTip,eventTip:i=>{const e=activeEvents()[i];return e?e.label+' · '+time(e.start)+' to '+time(e.end)+'. Click to inspect this episode.':''}});
recalc(null,initialShared);if(!initialShared){
 const q=new URLSearchParams(location.search);
 view.t=entryClock(view,q,sim);
 view.start=dayStart(view.t);refreshSamples();snap=sim.at(view.t);
 if(q.has('met')&&view.phase==='D')syncChapterToTime(snap);
 if(referenceIds.includes(q.get('reference')))referencePage=q.get('reference');
}
playing=!referencePage&&!initialShared&&!commissioning()&&view.phase==='E'&&new URLSearchParams(location.search).get('play')!=='0'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;lastTick=performance.now();draw();if(!referencePage&&view.phase==='E')prepareFlight();else if(!referencePage&&view.phase==='F')prepareCloseout();else if(initialShared&&initialChronology)fullAudit();

if(!initialShared&&view.phase==='A'){const field=new URLSearchParams(location.search).get('field');if(Object.hasOwn(controlByKey,field))openFieldGuide(field)}
