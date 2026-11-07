import {renderAttitudeEngineering} from './attitude-engineering.js';
import {referenceCenters,referenceCenterOrder,defaultReferenceCenterId,getReferenceCenter} from './reference-centers.js';
import {buildReferenceDesign,assessReferenceDesign,referenceAssociation} from './reference-configurations.js';
import {renderReferenceCenters,activeReferenceStrip} from './reference-centers-ui.js';
import {installWorkspaceLayout} from './workspace-layout.js';
import {installCaptureTools} from './capture-ui.js';
import {flightButtons} from './flight-transport.js';
import {updateCommRehearsal} from './comm-rehearsal.js';
import {updateCommTestConsole} from './comm-test-console.js';
import {terminalMonitor,terminalWindow,signalGuide} from './terminal-console.js';
import {masterTimeline} from './master-timeline.js';
import {workspaceHistory} from './workspace-history.js';
import {renderMasterTimeline,bindMasterTimeline} from './timeline-view.js';
import {orbitVectorReadings,orbitVectorsAvailable} from './orbit-vectors.js';
import {flightLoops,flightSoftware,renderFlightConsole} from './flight-software.js';
import {designTeaching} from './design-teaching.js';
import {flightTeaching} from './flight-teaching.js';
import {tradeTeaching} from './trade-teaching.js';
import {paintFieldGuide,referenceLesson} from './field-guide.js';
import {comparisonEvents,chooseComparison,compareMoments,eventOptions,eventMomentsMarkup} from './event-explorer.js';
import {orbitalLightingAvailable,cameraExposure,normalizeLightingMode,effectiveLightingMode} from './orbit-lighting.js';
import {normalizeSpacecraftFocus,spacecraftFocusAvailable} from './spacecraft-framing.js';
import {hasLoadingDirector,loadingEnd,loadingPlayer,refreshLoadingPlayer} from './payload-loading.js';
import {INTEGRATION_TIMES,integrationState} from './integration-sequence.js';
import {integrationProfile} from './integration-profiles.js';
import {processingFacility} from './processing-facilities.js';
import {GROUND_OPERATIONS,groundOperation,groundOperationForDomain,groundProcessingEnabled,groundProcessingState} from './ground-processing.js';
import {renderGroundProcessing,refreshGroundProcessing} from './ground-processing-ui.js';
import {bayLesson} from './bay-lessons.js';
import {createChoiceCues} from './choice-cues.js';
import {entryRoute,entryClock,entryPreparationClock,windowStartFor,tabCheckpoint} from './workspace-route.js';
const choiceCues=createChoiceCues();
let loadingPlayback=false,playDirection=1;
let processingPlaying=false,processingFrame=null,processingStamp=null,captureHeld=false;
const replayMotion=()=>playing?playDirection:0;
import {bayCameraControls,bayGuide,bayEvidence,bayDisplayControls,facilityNotes} from './bay-view.js';
import {launchGuide,launchSegment,launchSequence,refreshLaunchGuide,showLaunchDirector,siteApproach} from './launch-director.js';
import {launchSitesFor,launchSiteFor} from './launch-sites.js';
import {launchUmbilicalDesign} from './launch-umbilicals.js';
import {renderPadSystems,refreshPadSystems} from './pad-systems-ui.js';
import {activePointing,attitudeStrip,showAttitudeHistory,responseWindow,orbitResponse,refreshResponse,pointingApproach} from './flight-attitude-view.js';
import {DEPLOY_START_S,DEPLOY_END_S as DEFAULT_DEPLOY_END_S,DEPLOY_DURATION_S as DEFAULT_DEPLOY_DURATION_S,commissioningClock,deploymentMET} from './commissioning-clock.js';
let DEPLOY_END_S=DEFAULT_DEPLOY_END_S,DEPLOY_DURATION_S=DEFAULT_DEPLOY_DURATION_S;
import {commissioningGuide,commissioningTimeline,refreshCommissioning,nextDeploymentTime,deploymentReferences} from './deployment-view.js';
import {defaults,controls,presets,applyPreset,applyAIPurpose,missionStarter,missionStarterContextKeys,sizeDesign,inverseSolve,solveModes,enumeratePresets,estimateLife,sizingLabel,sizingMargin,meetsSizingRequirement,checks,sources,assumptions,validateDesign,ageProperties,YEAR} from './design.js';
import {renderGyroBenchmark,renderAvionics,gyroCandidateDesign} from './flight-electronics.js';
import {renderMechanical,bindMechanical,updateMechanical} from './mechanical-design.js';
import {domainCoverage} from './domain-coverage.js';
import {renderArchitecture} from './architecture-view.js';
import {renderEquipmentList,bindEquipmentList} from './equipment-list.js';
import {renderMaterialLibrary,bindMaterialLibrary,focusMaterial} from './material-library-ui.js';
import {renderMissionBaseline,bindMissionBaseline} from './mission-baseline.js';
import {missionBaseline} from './mission-policy.js';
import {designIdentity,inputRole,isPolicyInput,groupDesignInputs,roleLabels} from './design-contract.js';
import {assessPdrDomains,renderPdrDomain} from './pdr-assessment.js';
import {createSimulation,modelNotes} from './model.js';
import {displaySetting} from './design-impact.js';
import {evaluateDesignChange} from './design-review-task.js';
import {createWorkFeedback,yieldToPaint} from './work-feedback.js';
import {helpButton,helpForElement,shortHint,helpBody,sourceGuideIndex} from './input-help-ui.js';
import {fieldGuidance} from './input-guidance.js';
import {aiPurposes} from './ai-purpose.js';
import {renderAIPurpose,refreshEarthOutcome} from './ai-purpose-ui.js';
import {evaluateService,evaluateServiceAsync} from './ai-service.js';
import {conopsPurpose,studyHorizon,studyMenu,serviceSummary,sameMachineReport,compareRoutesReport,transferDesk} from './purpose-studies.js';
import {renderLaunchFleet} from './launch-fleet-ui.js';
import {recommendedDomainCamera} from './domain-scene.js';
import {icon} from './icons.js';
import {vehicleDrawings} from './drawings.js';
import {pages,workspaceFor,colors,overlayNames,componentMap,quickMap,powerLoadAllocations,servedPowerLoads} from './workspaces.js';
import {encodeScenario,decodeScenario,scenarioBlob,telemetryBlob,timelineFile,makePacket,packetIdentity,normalizeCommWorksheet,restoreFile,zipLibrary} from './exports.js';
import {aiDeploymentAudit} from './ai-deployment-audit.js';
import {deploymentAudit} from './deployment-audit.js';
import {surfaceAudit} from './surface-audit.js';
import {chapters} from './flight-chapters.js';
import {presetList,designName,presetShelf,missionPreset,parsePreset,addToShelf,readShelf,writeShelf,presetFileName} from './mission-presets.js';
import {domains,canonicalDomainId,purposeDomainFields,purposeTradeKeys,purposeStageDescription,domainReadout,renderDomainReadout,renderDomainTrade} from './domain-analysis.js';
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
const defaultView={phase:'A',commBench:'sband',commWorksheet:null,rfFilter:null,rfPage:0,timelineRow:null,timelineSegment:'all',timelineAll:false,timelineFollow:false,domain:'conops',teachEvent:'',teachFolded:false,lighting:'auto',spacecraftFocus:'core',exposureEV:0,orbitVectors:true,deploymentLens:'vehicle',launchLens:'wide',padConnection:null,bayLens:'overview',processingOperation:'environment',processingProgress:0,bayIsolate:true,bayLabels:true,bayBasis:false,bayClock:false,referencePreview:defaultReferenceCenterId,referenceMissionCase:'source',referenceCompared:[],referenceCenterId:defaultReferenceCenterId,referenceCenterModified:false,purposePreview:null,studyDays:0,tradeKey:null,tradeBase:null,presetName:null,detail:false,thermalNode:'junction',thermalScope:'window',thermalPadding:0,thermalScale:'working',thermalAuto:true,pointingAuto:true,flightLoop:'surfaces',thermalTargets:{},cameraStates:null,camera:'spacecraft',t:7800,preset:'reference:'+defaultReferenceCenterId,starterPurpose:'text',starterContext:null,modified:false,chapter:'integration',instruments:false,start:0,scope:'day',mode:'size',solve:'installed',speed:30,event:null,overlays:[],inspect:null};
let view={...defaultView},input=buildReferenceDesign(defaultReferenceCenterId),hardware,sim,result,snap,samples=[],daySamples=[],events=[],day={},life,plotStart=0,plotEnd=DAY,scene=null,playing=false,lastTick=0,toastId,daysig='',eventFilter='all',modal=null,pickedRow='',initialShared=false;
let orderJob=null,packetOrderAbort=null,lastOrder=null,landingReplay=null;const serviceCache=new WeakMap();
let help,referencePage=null,loadedPresets=[],tradeCache=null,tradeBusy=false,flightSyncError='',pendingFlightSeek=null;
try{loadedPresets=readShelf(window.localStorage)}catch(err){toast('The saved mission shelf is unavailable: '+err.message)}

const controlByKey=Object.fromEntries(controls.map(c=>[c.key,c]));
const solverKeys={workload:['trayCount','solarM2','radiatorM2','batteryKWh','storageTB','propellantKg'],launch:['trayCount'],lifetime:['missionYears'],solar:['solarM2'],radiator:['radiatorM2'],battery:['batteryKWh'],propellant:['propellantKg'],supply:['yearsSupply'],storage:['storageTB'],link:['requiredLineMbps'],throughput:[]};
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('on');clearTimeout(toastId);toastId=setTimeout(()=>$('toast').classList.remove('on'),3400)}
const workFeedback=createWorkFeedback();let foregroundWork=null,closeoutVisit=0;
const reviewSteps=['Check design and margins','Replay matched mission window','Prepare change review'];
function reviewWorkSpec(label='Proposed design'){
 return {kind:'review',title:'Evaluating design change',detail:label,steps:reviewSteps,cancelable:true,ready:'Change review ready'};
}
function closeoutWorkSpec(){
 return {title:'Opening Phase F',detail:'Preparing the carried spacecraft state and retirement maneuver.',steps:['Prepare mission-age state','Resolve disposal trajectory','Load decommissioning view'],manualStages:true,cancelable:true,ready:'Decommissioning view ready'};
}
async function runWork(spec,operation,source=null,reuse=null){
 if(reuse)return operation(reuse);
 if(foregroundWork)return;
 const controller=new AbortController(),job={controller,signal:controller.signal,spec,ui:null};
 let settled;job.done=new Promise(resolve=>{settled=resolve});
 job.ui=workFeedback.begin({title:spec.title,detail:spec.detail,steps:spec.steps||['Prepare calculation','Evaluate current case','Update workspace'],source,blocking:true,expandImmediately:spec.expandImmediately??(spec.kind!=='review'),cancel:spec.cancelable?()=>controller.abort():null});
 foregroundWork=job;
 try{
  await yieldToPaint();if(job.signal.aborted)throw new DOMException('Calculation cancelled','AbortError');
  if(spec.kind!=='review'&&!spec.manualStages){job.ui.stage(1,spec.detail);await yieldToPaint()}
  const value=await operation(job);
  if(!job.signal.aborted)job.ui.finish(spec.ready||'Workspace ready');
  return value;
 }catch(err){
  restoreWorkControls();
  if(err.name==='AbortError'){job.ui.finish('Calculation cancelled');return}
  job.ui.fail(err.message||'The calculation could not finish. Please try again.');console.error(err);
 }finally{
  try{
   if(foregroundWork===job)foregroundWork=null;
   syncNavigation();lastTick=performance.now();scheduleClock();
  }finally{settled()}
 }
}
function restoreWorkControls(){
 document.querySelectorAll('[data-param]').forEach(el=>{const v=input[el.dataset.param];if(v!==undefined)el.value=String(v);if(el.type==='range')el.style.setProperty('--pct',100*(Number(v)-Number(el.min))/(Number(el.max)-Number(el.min))+'%')});
 for(const id of ['solve','quicksolve','phase-solve']){const el=$(id);if(el)el.value=view.solve}
 if($('guidelauncher'))$('guidelauncher').value=input.launcher;
}
function clickWorkSpec(el){
 const d=el.dataset,a=d.action;
 if(d.openReference||d.restoreReference)return reviewWorkSpec('Preparing the complete reference configuration and its engineering assessment.');
 if(d.padOpen!=null||d.padInspect!=null)return {title:'Opening launch-site services',detail:'Preparing the selected pad, vehicle interfaces and umbilical drawing.'};
 if(d.padSeek!=null)return {title:'Updating the disconnect sequence',detail:'Aligning the umbilicals, pad systems and vehicle with the mission clock.'};
 if(d.padPlay!=null&&view.phase!=='D')return {title:'Preparing launch playback',detail:'Opening the selected vehicle and its ground-service connections.'};
 if(d.processingOperation)return {title:'Opening '+groundOperation(d.processingOperation,view.commBench).title,detail:'Preparing the facility, ground equipment and processing rehearsal.'};
 if(d.useLauncher){const name=presets.launcher[d.useLauncher]?.label||'launcher';return {...reviewWorkSpec(name+' · fit, mass, orbit and mission response'),title:'Evaluating '+name,expandImmediately:true}}
 if(d.preset||d.usePurpose||d.provisionPurpose||d.gyroCase!==undefined||d.studyTrays!=null||d.matchLaunch!=null||d.disposalMethod||d.design||d.adoptRating)return reviewWorkSpec('Checking the proposed configuration and its coupled requirements.');
 if(a==='resetpreset')return reviewWorkSpec('Restoring the selected starting configuration.');
 if(a==='applyimpact')return {title:'Applying design change',detail:'Rebuilding the spacecraft, replaying the mission window and refreshing the coupled results.',steps:['Accept reviewed configuration','Recalculate spacecraft and flight','Update diagrams and budgets'],ready:'Design updated'};
 if(a==='bundle')return {title:'Preparing the complete site',detail:'Collecting the application, models, drawings and local dependencies.',steps:['Collect site files','Download dependencies','Compress archive'],ready:'Site archive ready'};
 const names={designs:'Design reference data centers',mission:'Design rules & margins',architecture:'Spacecraft architecture',equipment:'Master Equipment List',timeline:'Master timeline',materials:'Materials & finishes',sources:'Model and sources',checks:'Numerical checks'};
 const destination=d.domain||d.page||d.pdrOpenDomain||(d.clockTimeline!=null?'timeline':null);
 if(destination){const name=names[destination]||domains[destination]?.label||pages[destination]?.[0]||'workspace';return {title:'Opening '+name,detail:'Preparing the current design, engineering assessments and graphics.'}}
 if(d.phase==='F'||d.chapter==='deorbit')return closeoutWorkSpec();
 if(d.phase)return {title:'Opening Phase '+d.phase,detail:'Preparing the spacecraft state, mission window and domain results.'};
 if(d.previewPurpose||d.openPurpose||d.studyPurpose)return {title:'Preparing mission comparison',detail:'Evaluating compute, storage, power, heat rejection and Earth service for this purpose.'};
 if(d.scope||d.chapter||d.launchTime!=null||d.attitudeTime!=null||d.attitudeFlight!=null||d.nextMasterCall||d.disposalTime||d.thermalInstant||d.deployAt!==undefined||d.deployStep!==undefined||d.compareMoment!=null||d.event||d.chart||el.classList.contains('tracks'))return {title:'Evaluating mission time',detail:'Updating the spacecraft state and coupled power, thermal, data and orbital results.'};
 const tasks={
  'mission-policy':['Opening design rules and margins','Preparing the controlled design rules, margins and evidence.'],
  'compare':['Comparing equipment options','Evaluating each candidate against the same mission and sizing assumptions.'],
  'fairingcompare':['Comparing launch envelopes','Checking the folded spacecraft against the available fairings and interfaces.'],
  'findnext':['Finding the next mission event','Searching up to 30 mission days for the requested event.'],
  'csv':['Preparing mission telemetry','Evaluating the selected window and arranging the export data.'],
  'tempbands':['Evaluating thermal limits','Comparing component temperatures and operating states across the selected window.'],
  'pinbaseline':['Preparing matched trade study','Pinning the installed design and evaluating the common mission window.']
 };
 if(tasks[a])return {title:tasks[a][0],detail:tasks[a][1]};
 if(['prev','next','setwindow','gotime','bol','eol','midlife','flightrestart','jumpstart'].includes(a))return {title:'Evaluating mission window',detail:'Integrating the selected interval and updating its engineering results.'};
 if(['instruments','coreview','showcomponent','viewevent','launchseq','presetshelf','newpreset','cancelimpact'].includes(a)||d.mode||d.presetUnload||d.inspect||d.followLesson!=null||d.watchLiftoff!=null||d.inspectBay||d.launchAlignReview!=null||d.bayAnalysis!=null)return {title:'Preparing workspace',detail:'Updating the selected design view and its engineering graphics.'};
 return null;
}
function liveDate(t){return new Date(Date.parse(input.epoch)+t*1000).toISOString().slice(0,19).replace('T',' ')+' UTC'}
function starterContext(d){return Object.fromEntries(missionStarterContextKeys.map(k=>[k,d[k]]))}
const referenceIds=['designs','mission','architecture','equipment','timeline','materials','sources','checks'];
const timelineSegment=value=>['ground','countdown','ascent','insertion','commissioning','operations'].includes(value)?value:'all';
const commBenchId=value=>['sband','ka','optical'].includes(value)?value:'sband';
const timelineRowId=value=>typeof value==='string'&&value.length<=140?value:null;
function loadScenario(obj){
 if(obj?.schema!=='odc-scenario/1'||!obj.design||typeof obj.design!=='object')throw Error('Choose an Orbital Data Center scenario JSON or PDR package.');
 const h=sizeDesign(obj.design);if(h.errors.length)throw Error(h.errors[0]);
 const v=obj.view||{},domain=[v.domain,v.page,v.subsystem].map(canonicalDomainId).find(k=>Object.hasOwn(domains,k))||'conops';
 input={...h.input};view={...defaultView,domain,phase:phaseFromView(v,h),preset:typeof v.preset==='string'?v.preset:'custom',presetName:typeof v.presetName==='string'?v.presetName.slice(0,64):null,modified:!!v.modified,referenceCenterId:h.input.referenceCenterId||null,referencePreview:getReferenceCenter(v.referencePreview)?.id||h.input.referenceCenterId||defaultReferenceCenterId,referenceMissionCase:v.referenceMissionCase==='common'?'common':'source',referenceCompared:Array.isArray(v.referenceCompared)?v.referenceCompared.filter(id=>getReferenceCenter(id)):[],
  commBench:commBenchId(v.commBench),commWorksheet:v.commWorksheet?.designRevision&&Array.isArray(v.commWorksheet.tests)?{designRevision:String(v.commWorksheet.designRevision).slice(0,8),tests:normalizeCommWorksheet(v.commWorksheet.tests.slice(0,3)),rehearsal:Number.isFinite(v.commWorksheet.rehearsal?.goalGB)&&v.commWorksheet.rehearsal.goalGB>0?{goalGB:v.commWorksheet.rehearsal.goalGB,ran:v.commWorksheet.rehearsal.ran===true}:null}:null,
  rfFilter:['S-band','Ka','Optical'].includes(v.rfFilter)?v.rfFilter:null,rfPage:Math.max(0,Math.floor(Number(v.rfPage)||0)),
  timelineRow:timelineRowId(v.timelineRow),timelineSegment:timelineSegment(v.timelineSegment),timelineAll:v.timelineAll===true,timelineFollow:v.timelineFollow===true,
  starterPurpose:Object.hasOwn(aiPurposes,v.starterPurpose)?v.starterPurpose:h.input.aiPurpose,starterContext:v.preset==='starter'?starterContext(missionStarter(h.input.aiPurpose,v.starterContext??h.input)):null,
  processingOperation:groundOperation(v.processingOperation).id,processingProgress:clamp(Number(v.processingProgress)||0,0,1),
  bayLens:['equipment','interface','payload','endOn','sideOn'].includes(v.bayLens)?v.bayLens:'overview',bayIsolate:v.bayIsolate!==false,bayLabels:v.bayLabels!==false,teachEvent:typeof v.teachEvent==='string'?v.teachEvent:'',teachFolded:!!v.teachFolded,bayBasis:!!v.bayBasis,bayClock:!!v.bayClock,lighting:normalizeLightingMode(v.lighting),spacecraftFocus:normalizeSpacecraftFocus(v.spacecraftFocus),exposureEV:cameraExposure(v.exposureEV),orbitVectors:v.orbitVectors!==false,
  launchLens:['base','pad','site','surroundings','services','ship','fairing','engines'].includes(v.launchLens)?v.launchLens:'wide',padConnection:typeof v.padConnection==='string'?v.padConnection.slice(0,96):null,deploymentLens:['vehicle','wing','hinge'].includes(v.deploymentLens)?v.deploymentLens:'vehicle',purposePreview:Object.hasOwn(aiPurposes,v.purposePreview)?v.purposePreview:null,studyDays:[1,7,30,60,90].includes(v.studyDays)?v.studyDays:0,detail:!!v.detail,instruments:!!v.instruments,thermalNode:thermalNodes.some(n=>n.id===v.thermalNode)?v.thermalNode:'junction',thermalScope:v.thermalScope==='mission'?'mission':'window',thermalScale:v.thermalScale==='full'?'full':'working',thermalAuto:v.thermalAuto!==false,pointingAuto:v.pointingAuto!==false,flightLoop:Object.hasOwn(flightLoops,v.flightLoop)?v.flightLoop:'surfaces',thermalPadding:clamp(Number(v.thermalPadding)||0,0,100),thermalTargets:sanitizeTargets(v.thermalTargets),
  t:Number.isFinite(v.t)?Math.max(-3600,v.t):defaultView.t,start:Number.isFinite(v.start)?Math.max(0,v.start):0,scope:['day','now','mission'].includes(v.scope)?v.scope:'day',solve:'installed',lastSizingMethod:Object.hasOwn(solveModes,v.lastSizingMethod)?v.lastSizingMethod:Object.hasOwn(solveModes,v.solve)&&v.solve!=='installed'?v.solve:null,chapter:chapters.some(c=>c.id===v.chapter)?v.chapter:'operations',camera:Object.hasOwn(cv,v.camera)?v.camera:'spacecraft',cameraStates:v.cameraStates||null,
  overlays:Array.isArray(v.overlays)?v.overlays.filter(x=>Object.hasOwn(overlayNames,x)):[],speed:[1,10,30,120,600].includes(v.speed)?v.speed:30,event:v.event&&typeof v.event.label==='string'&&Number.isFinite(v.event.start)&&Number.isFinite(v.event.end)?v.event:null,inspect:typeof v.inspect==='string'?v.inspect:null,
  chronological:!!v.chronological,tradeKey:Object.hasOwn(controlByKey,v.tradeKey)?v.tradeKey:null};
 if(v.tradeBase&&typeof v.tradeBase==='object'){const b=sizeDesign(v.tradeBase);if(!b.errors.length)view.tradeBase=b.input}
 referencePage=referenceIds.includes(v.reference)?v.reference:null;playing=false;
}
function integrating(){return !referencePage&&view.phase==='D'&&snap?.flightPhase==='integration'}
function showingPadSystems(){return !referencePage&&((view.phase==='D'&&!integrating()&&!commissioning()&&showLaunchDirector(view))||view.domain==='launcher'&&['B','C'].includes(view.phase))}
function padSystemsView(){return {...view,padPlaying:playing,playing}}
function syncPadConnection(){
 const design=launchUmbilicalDesign(hardware);
 if(!design.connections.some(c=>c.id===view.padConnection))view.padConnection=design.connections.find(c=>c.category==='payload'&&design.groups.find(g=>g.id===c.groupId)?.release.event!=='payload-release')?.id||design.connections[0]?.id||null;
 scene?.setPadConnection?.(view.padConnection);
}
function renderLaunchPad(){
 const host=$('pad-systems');if(!host)return;
 host.hidden=!showingPadSystems();
 if(host.hidden)return;
 syncPadConnection();host.innerHTML=renderPadSystems(hardware,snap,padSystemsView());
 refreshPadSystems(host,hardware,snap,padSystemsView());
}
function refreshLaunchPad(){const host=$('pad-systems');if(host&&!host.hidden)refreshPadSystems(host,hardware,snap,padSystemsView())}
function openLaunchPad(connectionId=null,lens='site'){
 pauseProcessing(false);playing=false;loadingPlayback=false;referencePage=null;
 view.domain='launcher';view.phase='D';view.camera='launch';view.launchLens=lens;view.speed=1;view.detail=false;view.timelineFollow=false;
 if(connectionId)view.padConnection=connectionId;
 syncPadConnection();
 setTime(view.t>=-600&&view.t<35?view.t:-20);
 window.scrollTo({top:0,behavior:'instant'});
}
function processingView(){return {...view,processingPlaying}}
function processingMatchesStation(){const domain=groundOperation(view.processingOperation,view.commBench).domain;return domain===view.domain||(domain==='launcher'&&view.domain==='launch')}
function syncProcessingState(){
 const enabled=integrating()&&groundProcessingEnabled(snap);
 const state=groundProcessingState(hardware,view.processingOperation,view.processingProgress,view.commBench);
 if(state.id==='rf')state.commBench=commBenchId(view.commBench);
 scene?.setProcessingState?.(integrating()&&processingMatchesStation()?{...state,playing:processingPlaying&&enabled,enabled}:null);
}
function refreshProcessing(){
 syncProcessingState();
 const host=$('ground-processing');
 if(host&&!host.hidden)refreshGroundProcessing(host,hardware,snap,processingView());
 const player=$('bay-processing-player');
 if(player&&!player.hidden){
  const enabled=groundProcessingEnabled(snap),play=player.querySelector('[data-processing-play]'),seek=player.querySelector('[data-processing-seek]');
  if(play){play.disabled=!enabled;play.setAttribute('aria-pressed',String(processingPlaying));play.textContent=processingPlaying?'Pause rehearsal':'Play 3D rehearsal'}
  if(seek){seek.disabled=!enabled;if(document.activeElement!==seek)seek.value=String(view.processingProgress*100)}
  const status=player.querySelector('[data-processing-caption]');if(status)status.textContent=enabled?groundProcessingState(hardware,view.processingOperation,view.processingProgress,view.commBench).stage.title:'Ground services disconnected · return to checkout';
 }
}
function pauseProcessing(refresh=true){
 processingPlaying=false;processingStamp=null;
 if(processingFrame!==null){cancelAnimationFrame(processingFrame);processingFrame=null}
 if(refresh&&hardware)refreshProcessing();
}
function renderProcessing(){
 const host=$('ground-processing');if(!host)return;
 host.hidden=!integrating();
 if(host.hidden){pauseProcessing(false);renderProcessingPlayer();syncProcessingState();return}
 const id=groundOperationForDomain(view.domain==='launch'?'launcher':view.domain,view.commBench);
 if(view.processingOperation!==id){pauseProcessing(false);view.processingOperation=id;view.processingProgress=0}
 if(!groundProcessingEnabled(snap))pauseProcessing(false);
 host.innerHTML=renderGroundProcessing(hardware,snap,processingView());
 renderProcessingPlayer();
 refreshProcessing();
}
function renderProcessingPlayer(){
 const player=$('bay-processing-player');if(!player)return;
 player.hidden=!integrating()||!processingMatchesStation();
 if(player.hidden)return;
 const operation=groundOperation(view.processingOperation,view.commBench);
 player.innerHTML=`<div class="bay-processing-player"><div><b>${esc(operation.title)}</b><small data-processing-caption></small></div><button type="button" class="btn" data-processing-play aria-pressed="false">Play 3D rehearsal</button><label><span class="sr-only">3D rehearsal progress</span><input type="range" data-processing-seek min="0" max="100" step=".5" value="${view.processingProgress*100}" aria-label="3D rehearsal progress"></label><button type="button" class="textbutton" data-processing-panel>Activities ↓</button></div>`;
}
function selectProcessingOperation(id){
 if(!integrating()||!GROUND_OPERATIONS.some(o=>o.id===id))return;
 pauseProcessing(false);playing=false;loadingPlayback=false;
 const operation=groundOperation(id,view.commBench);
 view.domain=operation.domain;view.processingOperation=id;view.processingProgress=0;
 if(operation.commBench)view.commBench=operation.commBench;
 view.camera='launch';view.bayLens=id==='propellant'?'overview':'equipment';view.inspect=null;
 view.t=-3600;view.chapter='integration';view.detail=false;view.timelineFollow=false;
 draw();checkpoint.save();
 $('ground-processing')?.querySelector('[data-processing-operation="'+id+'"]')?.focus({preventScroll:true});
}
function toggleProcessing(){
 if(!integrating()||!groundProcessingEnabled(snap))return;
 if(!processingMatchesStation())selectProcessingOperation(view.processingOperation);
 if(view.camera!=='launch')chooseCamera('launch');
 if(processingPlaying){pauseProcessing();checkpoint.save();return}
 playing=false;loadingPlayback=false;scene?.setSignalPlayback?.(0);
 if(view.processingProgress>=1)view.processingProgress=0;
 processingPlaying=true;processingStamp=null;refreshProcessing();
 processingFrame=requestAnimationFrame(tickProcessing);
}
function tickProcessing(ms){
 processingFrame=null;
 if(!processingPlaying)return;
 if(!integrating()||!groundProcessingEnabled(snap)||document.visibilityState==='hidden'){pauseProcessing();checkpoint.save();return}
 if(foregroundWork||captureHeld){processingStamp=null;processingFrame=requestAnimationFrame(tickProcessing);return}
 // A 24-second illustrative rehearsal; it is not the duration of the real operation.
 if(processingStamp!==null)view.processingProgress=clamp(view.processingProgress+Math.min(1000,ms-processingStamp)/24000,0,1);
 processingStamp=ms;
 if(view.processingProgress>=1)processingPlaying=false;
 refreshProcessing();
 if(processingPlaying)processingFrame=requestAnimationFrame(tickProcessing);
 else{processingStamp=null;checkpoint.save()}
}
function syncBayView(){
 scene?.setCommBench?.(view.commBench);
 scene?.setBayView?.(view.bayLens,view.bayLabels);
 scene?.setBayIsolation?.(view.bayIsolate);
 syncProcessingState();
}
function selectBayLens(key){
 if(!integrating()||!['overview','equipment','interface','payload','endOn','sideOn'].includes(key))return;
 view.bayLens=key;view.camera='launch';draw();$('cameras').querySelector('[data-bay-lens="'+key+'"]')?.focus({preventScroll:true});
}
function commissioning(){return !referencePage&&view.phase==='E'&&view.chapter==='commissioning'}
function scenario(){return {schema:'odc-scenario/1',modelVersion:'22.0',missionBaseline:{id:missionBaseline.id,revision:missionBaseline.revision},designIdentity:hardware?designIdentity(hardware):null,designReference:input.referenceCenterId?{id:input.referenceCenterId,revision:input.referenceCenterRevision,name:getReferenceCenter(input.referenceCenterId)?.name,realization:'Workbench study adaptation'}:null,design:input,view:{...view,reference:referencePage,cameraStates:scene?.getCameraState?.()||view.cameraStates,t:Math.round(view.t*1000)/1000}}}
const checkpoint=tabCheckpoint(window,location,scenario);
try{
 const restored=checkpoint.read()||(location.hash.startsWith('#design=')?decodeScenario(location.hash.slice(8)):null);
 if(restored){loadScenario(restored);initialShared=true}
}catch(e){toast(e.message)}
if(!initialShared){
 const q=new URLSearchParams(location.search);
 Object.assign(view,entryRoute(q));
 view.commBench=commBenchId(q.get('bench'));
 if(q.get('reference')==='timeline'){view.timelineRow=timelineRowId(q.get('row'));view.timelineSegment=timelineSegment(q.get('segment'));view.timelineAll=q.get('events')==='all'}
 if(Object.hasOwn(flightLoops,q.get('loop')))view.flightLoop=q.get('loop');
 if(['auto','realistic','studio'].includes(q.get('lighting')))view.lighting=q.get('lighting');
 if(['core','entire'].includes(q.get('focus')))view.spacecraftFocus=q.get('focus');
 view.exposureEV=cameraExposure(q.get('exposure'));
 if(q.get('vectors')==='off')view.orbitVectors=false;
 const chapter=chapters.find(item=>item.id===view.chapter&&q.get('chapter')===item.id);
 const center=getReferenceCenter(q.get('center'));if(center){input=buildReferenceDesign(center.id);view.preset='reference:'+center.id;view.referenceCenterId=center.id;view.referencePreview=center.id}
 const p=presetList.find(x=>x.id===q.get('preset'));if(p){input={...p.design};view.preset=p.id;view.referenceCenterId=null}
 const goal=q.get('purpose');
 if(Object.hasOwn(aiPurposes,goal)){
  const useStarter=q.get('build')==='suggested'||(!p&&q.get('build')!=='current');
  input=applyAIPurpose(input,goal,useStarter);if(useStarter){view.preset='starter';view.starterPurpose=goal}else view.modified=true;
 }
 const studyLink=q.get('link');
 if(['s','ka','optical','auto'].includes(studyLink)&&studyLink!==input.link){input={...input,link:studyLink};view.modified=true}
 const requestedLV=q.get('launcher');
 if(Object.hasOwn(presets.launcher,requestedLV)){
  input=applyPreset(input,'launcher',requestedLV);input.launchSite=launchSiteFor(requestedLV,q.get('site')).id;
  view.modified=true;
 }
 // Fresh studies adopt the selected pad and epoch once. Imported scenarios and legacy presets own their orbital elements.
 if(!p&&!input.referenceCenterId)input={...input,...siteApproach(input).angles};
 if(view.phase==='D'){view.speed=['ascent','pad','insertion'].includes(view.chapter)?1:30;view.launchLens=['base','pad','site','surroundings','services','ship','fairing','engines'].includes(q.get('lens'))?q.get('lens'):'wide';
  if(q.get('umbilical')&&launchUmbilicalDesign(input)?.connections.some(c=>c.id===q.get('umbilical')))view.padConnection=q.get('umbilical');
 }
 if(['equipment','interface','payload','endOn','sideOn'].includes(q.get('bay')))view.bayLens=q.get('bay');
 const preview=q.get('preview');if(Object.hasOwn(aiPurposes,preview))view.purposePreview=preview;
 const method=q.get('disposal');if(['graveyard','reentry'].includes(method)){input.disposalMethod=method;view.modified=view.modified||method!==defaults.disposalMethod}
 if(view.preset==='starter')view.starterContext=starterContext(input);
 view.camera=Object.hasOwn(cv,q.get('camera'))?q.get('camera'):view.chapter==='commissioning'?'spacecraft':chapter&&view.domain==='conops'?chapter.camera:view.phase==='D'&&view.chapter==='integration'?'launch':recommendedCamera(view.phase,view.domain);
}
function recalc(resolved=null,sample=true){
 pauseProcessing(false);
 landingReplay?.controller.abort();landingReplay=null;
 packetOrderAbort?.abort();orderJob?.abort();lastOrder=null;
 auditAbort?.abort();flightSyncError='';pendingFlightSeek=null;tradeCache=null;view.chronological=false;
 result=resolved||inverseSolve(input,view.solve);hardware=result.hardware;({endS:DEPLOY_END_S,durationS:DEPLOY_DURATION_S}=commissioningClock(hardware));input={...hardware.input};if(result.mode!=='installed')view.lastSizingMethod=result.mode;view.solve='installed';view.aiPurpose=hardware.input.aiPurpose;view.referenceCenterId=hardware.input.referenceCenterId||null;view.referenceCenterModified=referenceAssociation(hardware)?.modified||false;sim=createSimulation(hardware);life=estimateLife(hardware);
 view.t=clamp(view.t,-3600,sim.duration);view.start=clamp(view.start,0,Math.max(0,sim.duration-DAY));
 if(view.commWorksheet&&view.commWorksheet.designRevision!==packetIdentity(scenario(),sim.duration).revision)view.commWorksheet=null;
 daysig='';day={};daySamples=[];samples=[];events=[];refreshPacketBadge();if(sample){refreshSamples();snap=sim.at(view.t)}
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
const mobileNavigation=window.matchMedia('(max-width:720px)');
function syncNavigation(){
 const button=document.querySelector('.navopen'),rail=$('rail');
 const expanded=mobileNavigation.matches?document.body.classList.contains('navshow'):!document.body.classList.contains('navcollapsed');
 if(!expanded&&rail.contains(document.activeElement))button.focus({preventScroll:true});
 rail.inert=!expanded;rail.setAttribute('aria-hidden',String(!expanded));
 button.setAttribute('aria-expanded',String(expanded));
 button.setAttribute('aria-label',expanded?'Hide navigation':'Show navigation');
 button.title=expanded?'Hide navigation':'Show navigation';
 button.innerHTML=icon(mobileNavigation.matches?'menu':'panel-left',18);
}
function closeMobileNavigation(){document.body.classList.remove('navshow');syncNavigation()}
function toggleNavigation(){
 document.body.classList.toggle(mobileNavigation.matches?'navshow':'navcollapsed');syncNavigation();
 if(mobileNavigation.matches&&document.body.classList.contains('navshow'))$('nav').querySelector('.selected,button')?.focus({preventScroll:true});
}
mobileNavigation.addEventListener('change',closeMobileNavigation);
let navHTML='',phaseHTML='';
function assignNav(el,html){
 const active=document.activeElement,button=active&&el.contains(active)?active.closest('button'):null;
 el.innerHTML=html;
 if(button){
  const name=['data-domain','data-phase','data-page'].find(k=>button.hasAttribute(k));
  if(name)el.querySelector('['+name+'="'+CSS.escape(button.getAttribute(name))+'"]')?.focus({preventScroll:true});
 }
}
function setNav(){const html=domainNav(view,referencePage);if(html!==navHTML){assignNav($('nav'),html);navHTML=html}$('home').onclick=e=>{e.preventDefault();return runWork({title:'Opening design references',detail:'Preparing the orbital data center catalog and comparison.'},()=>goPage('designs'),e.currentTarget)}}
function goPage(k){
 if(k===(referencePage||view.domain)){closeMobileNavigation();return}
 pauseProcessing(false);
 view.timelineFollow=false;
 if(referenceIds.includes(k)){referencePage=k;playing=false}
 else{const id=canonicalDomainId(k==='overview'?'conops':k);if(!Object.hasOwn(domains,id))return;referencePage=null;view.domain=id;view.detail=false;view.inspect=null;view.tradeKey=null;
  if(['C','D','E'].includes(view.phase))view.camera=integrating()?'launch':recommendedCamera(view.phase,id);}
 closeMobileNavigation();draw();window.scrollTo({top:0,behavior:'instant'});
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

const policyLockedInputs=new Set(['structureMargin','reserveFraction','radialPaddingM','axialPaddingM']);
function lock(key){return policyLockedInputs.has(key)||(solverKeys[view.solve]||[]).includes(key)||(!isEditable(view.phase)||key==='disposalMethod'&&view.phase!=='A')}
function inputRow(key,quick=false,scope=null){const c=controlByKey[key];if(!c)return '';const options=key==='launchSite'?Object.fromEntries(launchSitesFor(hardware.input.launcher).map(s=>[s.id,s.range+' · '+s.name])):c.options;const val=hardware.input[key],id=(scope?scope+'-':quick?'quick-':'param-')+key,disabled=lock(key)?' disabled':'',label=quick?({altitudeKm:'Orbital altitude',batteryKWh:'Battery capacity',solarM2:'Solar array area',trayCount:'Compute trays'}[key]||c.label):c.label;
 const hint=view.phase==='A'?helpButton(key,label):'';
 if(policyLockedInputs.has(key)){const labels={structureMargin:'Dry growth assumption',reserveFraction:'Propellant reserve assumption',radialPaddingM:'Lateral keep-in allowance',axialPaddingM:'Axial keep-in allowance'},basis={structureMargin:'Item mass-growth basis unassessed.',reserveFraction:'3σ uncertainty basis unassessed.',radialPaddingM:'Project interface allowance; coupled-load evidence open.',axialPaddingM:'Project interface allowance; coupled-load evidence open.'};return '<div class="'+(quick?'qrow':'fieldbox')+'" data-policy-assumption="'+key+'"><div class="fieldhead"><div class="field-caption"><label for="'+id+'">'+labels[key]+'</label>'+hint+'</div><output id="'+id+'" class="val">'+fmt(c.unit==='fraction'?val*100:val,4)+(c.unit==='fraction'?'%':' '+esc(c.unit||''))+'</output></div><p class="model-footnote">'+basis[key]+'</p><button type="button" class="textbutton" data-action="mission-policy">Mission policy ↗</button></div>'; }
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
function powerHistory(){const loads=samples.map(servedPowerLoads),n=samples.length,scale=Math.max(1,...samples.map(s=>Math.max(s.loadKW||0,s.solarKW||0,s.servedLoadKW||0))),y=v=>114-110*v/scale,x=i=>500*i/Math.max(1,n-1),base=new Array(n).fill(0);let body='';
 for(let j=0;j<powerLoadAllocations.length;j++){const next=base.map((v,i)=>v+loads[i][j].kw);body+='<polygon points="'+next.map((v,i)=>x(i).toFixed(1)+','+y(v).toFixed(1)).concat(base.map((v,i)=>x(i).toFixed(1)+','+y(v).toFixed(1)).reverse()).join(' ')+'" fill="'+powerLoadAllocations[j].color+'"/>';next.forEach((v,i)=>base[i]=v)}
 const path=key=>samples.map((s,i)=>(i?'L':'M')+x(i).toFixed(1)+','+y(s[key]||0).toFixed(1)).join(' ');return '<div class="panelpad"><h3>Solar supply and served bus loads</h3><div class="smalltitle">Served stack · requested demand dashed · 0–'+fmt(scale,1)+' kW</div><svg data-chart="true" aria-label="Served bus load allocations, requested demand and solar supply at the bus" viewBox="0 0 500 120" style="width:100%;height:120px" preserveAspectRatio="none">'+body+'<path d="'+path('loadKW')+'" fill="none" stroke="#e1ded4" stroke-dasharray="4 3" stroke-width="1.2" vector-effect="non-scaling-stroke"/><path d="'+path('solarKW')+'" fill="none" stroke="#ffc76f" stroke-width="1.7" vector-effect="non-scaling-stroke"/></svg><div class="legend"><span><i style="--c:#ffc76f"></i>Solar at bus</span><span><i style="--c:#e1ded4"></i>Requested (dashed)</span>'+powerLoadAllocations.map(r=>'<span><i style="--c:'+r.color+'"></i>'+r.label+'</span>').join('')+'</div><p class="model-footnote">Unserved demand is the gap between requested demand and the served stack. Solar-source and battery-transfer losses are accounted for separately.</p></div>';
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
 if(view.domain==='power')add='<div class="panelpad"><h3>Served bus load breakdown</h3><div class="smalltitle">Requested '+fmt(snap.loadKW,3)+' kW · Served '+fmt(snap.servedLoadKW,3)+' kW · Unserved '+fmt(snap.unmetKW,3)+' kW</div>'+servedPowerLoads(snap).map(r=>'<div class="loadrow"><span>'+r.label+'</span><div><b style="width:'+clamp(100*r.kw/Math.max(.01,snap.servedLoadKW),0,100)+'%;background:'+r.color+'"></b></div><strong>'+fmt(r.kw,3)+' kW</strong></div>').join('')+'</div>';
 if(view.domain==='thermal')add='<div class="panelpad shellbudget"><h3>Equipment enclosure</h3><p>Six closed structural faces carry '+fmt(hardware.enclosure.coveredAreaM2,2)+' m² of insulation. Coolant crosses the bulkheads through fitted penetrations. The chip-to-radiator path carries the compute load while the wall model accounts for heat that escapes or enters through the blanket and fittings.</p><div class="chips"><button class="chip" data-inspect="enclosure">Inspect the walls</button><button class="chip" data-action="coreview">Open the cutaway</button></div></div><div class="heatflow">'+[['junctionK','Junction'],['coldPlateK','Cold plate'],['coolantK','Coolant'],['radiatorK','Radiator']].map(([k,l])=>'<span>'+l+'<b>'+fmt(snap[k],1)+' K</b></span>').join('<i>→</i>')+'</div>';
 if(view.domain==='launch')add='<div class="panelpad"><button class="btn" data-action="fairingcompare">'+icon('ruler',14)+' Compare launcher envelopes</button></div>'+vehicleDrawings(hardware)+'<div class="panelpad"><div class="callout"><b>'+esc(hardware.launcherLabel)+'</b> · '+(hardware.fit?'Fits the assumed stowed envelope':'Stowed geometry exceeds the assumed envelope')+'. Mass-only lower bound '+Math.ceil(hardware.launchKg/Math.min(hardware.input.launchAllowanceKg,hardware.input.referenceKg))+' launch(es). '+(hardware.launchScreenFeasible?'One vehicle and its adapter make up the manifest.':'A multi-launch assembly manifest has not been modeled.')+'</div><button class="chip gap" data-action="launchseq">'+icon('play',12)+' View insertion sequence</button></div>';
 if(view.domain==='comm')add='<div class="panelpad"><div class="smalltitle">Installed terminals</div><div class="chips gap"><span class="tag">S-BAND / tracking, telemetry and command</span><span class="tag">26 GHz / KA DOWNLINK</span><span class="tag">1,550 nm / OPTICAL</span></div><p>Downlink carries queued payload. S-band provides the command uplink. Optical contacts assume clear sky.</p></div>';
 return '<section class="panel lowerpan">'+head('Engineering readouts','list-checks','<span class="metacode">'+time(view.t)+'</span>')+add+'<div class="twocol">'+[entry.rows.slice(0,Math.ceil(entry.rows.length/2)),entry.rows.slice(Math.ceil(entry.rows.length/2))].map(a=>rowTable(['Quantity','Value'],a.map(read).join(''))).join('')+'</div></section>'
}
function eventTable(list,limit){const pick=typeof limit==='number'?list.slice(0,limit):list;return pick.length?rowTable(['Episode','Start · MET','Duration',''],pick.map(e=>tr(['<span class="dotlabel"><i class="legenddot" style="--c:'+eventColor(e.type)+'"></i>'+esc(e.label)+'</span>',time(e.start),fmt(e.end-e.start,1)+' s','<button class="iconbtn" aria-label="Inspect '+esc(e.label)+'">'+icon('chevron-right',14)+'</button>'],'data-event="'+esc(e.id)+'"')).join('')):'<div class="panelpad muted">No matching events in this window. <button class="textbutton" data-action="findnext">Find the next event</button></div>'}
function lower(){const selected=view.event;let evlist=events.filter(e=>e.end>view.t),ev=evlist.length?evlist:events;const btn='<button class="textbutton" data-action="events">All events '+icon('chevron-right',12)+'</button>';let s='';if(view.scope==='mission')s+='<section class="panel lowerpan">'+head(sim.audit?'Chronological mission integration':'Representative-day preview','activity','<button class="textbutton" data-action="audit">'+(sim.audit?'Mission totals':'Resolve every mission day')+' '+icon('chevron-right',12)+'</button>')+'<div class="panelpad muted">'+(sim.audit?'Mission plots retain interval minima for SOC, maxima for junction temperature and peak recorder backlog.': 'The fast preview samples seasonal operating days. The chronological sweep evaluates each day and preserves its extrema and event totals.')+'</div></section>';
 if(selected)s+='<section class="panel lowerpan">'+head(esc(selected.label),'circle-dot','<button class="textbutton" data-action="eventdetail">Event inspector '+icon('chevron-right',12)+'</button>')+'<div class="panelpad"><span class="mono">'+time(selected.start)+' → '+time(selected.end)+'</span><span class="muted"> &nbsp;·&nbsp; '+fmt(selected.end-selected.start,1)+' seconds</span> <button class="chip" data-action="jumpstart">Jump to start</button> <button class="chip" data-action="viewevent">View in 3D</button></div></section>';
 if(workspaceFor(view.domain,hardware))s+=ledger();
 if(view.domain==='overview')s+='<div class="columns lowerpan"><section class="panel">'+head('Mission events','list-filter',btn)+eventTable(ev,4)+'</section><section class="panel">'+head('Service summary','activity','<span class="metacode">24 H</span>')+rowTable(['Measure','Value'],[['Onboard text generation',fmt(day.textGeneratedGB*1e9/hardware.input.bytesPerToken/86400,1)+' tok/s'],['Delivered text · daily mean',fmt(day.tokensDelivered/86400,1)+' tok/s'],['Delivered payload',fmt(day.deliveredGB)+' GB'],['Free persistent storage',fmt(snap.freeTB)+' TB'],['Minimum battery charge',fmt(day.minSocPct,1)+'%'],['Hottest junction',fmt(day.maxJunctionK,1)+' K'],['Launch mass headroom',fmt(hardware.massMarginKg)+' kg'],[(sim.audit?'Chronological modeled service span':'Sizing-envelope life estimate'),(life.lowerBound?'≥ ':'')+fmt(life.years,2)+' yr'],['Limiting design balance',esc(sizingLabel(life.binding))]].map(r=>tr(r)).join(''))+'</section></div>';
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
 if(referencePage==='designs')return renderReferenceCenters({hardware,activeId:input.referenceCenterId,selectedId:view.referencePreview,comparedIds:view.referenceCompared,missionCase:view.referenceMissionCase,modified:view.referenceCenterModified||view.modified});
 if(referencePage==='mission')return renderMissionBaseline(hardware,snap,pdrContext());
 if(referencePage==='timeline')return renderMasterTimeline(masterTimeline(sim),hardware,view);
 if(referencePage==='architecture')return renderArchitecture(hardware,snap);
 if(referencePage==='equipment')return renderEquipmentList(hardware,snap);
 if(referencePage==='materials')return renderMaterialLibrary(hardware);
 if(referencePage==='checks'){const list=[...checks(),...scenarioTests()],passed=list.filter(x=>x.pass).length;return '<section class="panel">'+head('Surface geometry audit','scan-line','<span class="tag">'+surfaceAudit.launcherVariants+' LAUNCHERS</span>')+'<div class="panelpad"><p>Triangle winding and vertex normals were compared in '+fmt(surfaceAudit.geometries)+' geometry buffers across the spacecraft and launch fleet. Rays cast from both sides check the reusable hatch, heat-shield liner, fixed nose and conventional fairing halves in closed and open configurations. The spacecraft walls and reflector also passed closed-volume and paired-edge checks.</p></div>'+rowTable(['Geometry check','Measured'],[['Triangles with checked orientation',fmt(surfaceAudit.checkedTriangles)],['Zero-area triangles',fmt(surfaceAudit.zeroAreaPoleTriangles)],['Closed wall panels',fmt(surfaceAudit.shellSides)],['Occupied wall penetrations',fmt(surfaceAudit.occupiedPorts)]].map(x=>tr(x)).join(''))+'</section>'+deploymentEvidence()+'<section class="panel lowerpan">'+head('Numerical verification','list-checks','<span class="tag '+(passed===list.length?'':'warn')+'">'+passed+' / '+list.length+' PASS</span>')+rowTable(['Group','Reference calculation','Expected','Computed','Unit','Result'],list.map(c=>tr([c.group,esc(c.name),fmt(c.expected,5),fmt(c.actual,5),esc(c.unit),'<span class="'+(c.pass?'checkpass':'checkfail')+'">'+(c.pass?'Pass':'Review')+'</span>'])).join(''))+'</section>'}
 const d=hardware.input;const ledgerExamples=[['Solar generation','1.361 × '+fmt(d.solarM2)+' m² × '+fmt(d.pvEfficiency,3)+' × '+fmt(d.solarDelivery,3)+' × incidence × sunlight × retention × deployment',fmt(snap.solarKW)+' kW'],['Data generation',fmt(snap.tokensPerSec)+' tok/s × '+fmt(d.bytesPerToken)+' B/tok × 8',fmt(snap.tokensPerSec*d.bytesPerToken*8/1e6,5)+' Mbit/s text'],['Dry + consumables + adapter',fmt(hardware.dryKg)+' + '+fmt(hardware.propellantKg)+' + '+fmt(hardware.pressurantKg)+' + '+fmt(d.adapterKg)+' kg',fmt(hardware.launchKg)+' kg'],['Drag force','½ × '+fmt(snap.densityKgM3,4)+' kg/m³ × '+fmt(snap.relativeSpeedMs)+'² × '+fmt(d.cd)+' × '+fmt(snap.ramAreaM2)+' m²',fmt(snap.dragN,6)+' N']];
 return pointingApproach(hardware)+deploymentReferences()+domainCoverage()+sourceNote()+sourceGuideIndex()+'<section class="panel">'+head('Live calculation sheet','activity','<span class="metacode">'+time(view.t)+'</span>')+rowTable(['Balance','Substitution','Result'],ledgerExamples.map(r=>tr(r.map(esc))).join(''))+'</section><section class="panel lowerpan">'+head('Model boundaries and equations','book-open')+'<div class="panelpad">'+assumptions.map(a=>'<details><summary>'+esc(a.name)+'</summary><p class="eq">'+esc(a.equation)+'</p><p>'+esc(a.note)+'</p></details>').join('')+'<h3 class="gap">Numerical method</h3>'+modelNotes.map(n=>'<p>'+esc(n)+'</p>').join('')+'</div></section><section class="panel lowerpan">'+head('Reference library','book-open','<span class="metacode">04 NOV 2026</span>')+'<div class="panelpad sourcegrid">'+sources.map(s=>'<a class="sourcecard" data-tip="Open the cited engineering reference in a new tab." href="'+esc(s.url)+'" target="_blank" rel="noopener">'+icon('square-arrow-out-up-right',14)+'<span><strong>'+esc(s.name)+'</strong><small>'+esc(s.note)+'</small></span></a>').join('')+'</div></section>';
}
function renderDiscipline(live=false){
 const host=$('discipline-host'),id=view.domain,p=view.phase;
 host.hidden=!!referencePage||integrating()&&!view.detail&&id!=='software'||!['attitude','avionics','mechanical','software'].includes(id);
 if(host.hidden)return;
 const anchor=$(p==='A'?'domain-readout':p==='B'?'kpis':p==='F'?'disposal-plot':id==='software'&&['D','E'].includes(p)?'event-explorer':'trade-input');
 if(anchor.previousElementSibling!==host)anchor.parentNode?.insertBefore(host,anchor);
 const engineeringBasisOpen=host.querySelector('.ae-basis')?.open,softwareBasisOpen=host.querySelector('.fs-basis')?.open;
 if(id==='software'){
  const readback=host.querySelector('[data-flight-readback]');
  if(live&&readback)readback.innerHTML=renderFlightConsole(hardware,snap,p,view.flightLoop);
  else host.innerHTML=flightSoftware(hardware,snap,p,view.flightLoop);
 }else if(id==='mechanical'){
  const route=p==='F'?sim.disposal():null;
  const ctx=route?{route,entrySpeedMs:route.feasible&&Number.isFinite(route.entry)?sim.at(route.entry).relativeSpeedMs:null}:null;
  if(live){updateMechanical(host,hardware,snap,p,ctx);return}
  host.innerHTML=renderMechanical(hardware,snap,p,ctx);bindMechanical(host,hardware,snap,p,ctx);
 }else if(!live||!host.matches(':focus-within, :hover')){
  host.innerHTML=id==='attitude'?renderAttitudeEngineering(hardware,snap,p)+renderGyroBenchmark(hardware,snap,day,p):renderAvionics(hardware,snap,p);
 }
 if(engineeringBasisOpen)host.querySelector('.ae-basis')?.setAttribute('open','');
 if(softwareBasisOpen)host.querySelector('.fs-basis')?.setAttribute('open','');
}
let attitudeChart=null;
function updatePointingPanels(){
 const strip=$('attitude-strip'),chart=$('attitude-history');
 const active=!referencePage&&activePointing(view,snap);
 strip.hidden=!active||view.camera==='launch'&&snap.flightPhase==='operations';
 chart.hidden=!active||!showAttitudeHistory(view,snap);
 if(!strip.hidden)strip.innerHTML=attitudeStrip({...view,cameraTracking:scene?.getCameraTracking?.()},snap,hardware);
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
  scene=createScene(host,{onPick:inspect,onThermalScale:id=>{view.thermalScale=id},onHover:(id,x,y,row)=>help.component(id,x,y,row),onCameraModeChange:updatePointingPanels});
  scene.setDomain(commissioning()&&view.domain!=='software'?'conops':view.domain,view.phase);
  scene.setControlLoop?.(view.flightLoop);
  scene.setDeploymentLens(view.deploymentLens);
  scene.setLaunchLens(view.launchLens);
  scene.setPadConnection?.(view.padConnection);
  scene.setChapter(view.chapter);
  syncBayView();
  if(view.phase==='F')scene.setDisposalPlan(sim.disposal());
  scene.setView(view.camera);
  scene.setThermalScale(view.thermalScale);
  scene.setLightingMode(view.lighting);
  scene.setSpacecraftFocus(view.spacecraftFocus);
  scene.setExposureEV(view.exposureEV);
  scene.setOrbitVectors(view.orbitVectors);
  if(view.cameraStates)scene.setCameraState(view.cameraStates);
  scene.setSignalPlayback?.(replayMotion());scene.update(hardware,snap);
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
 if(referencePage==='timeline'||referencePage==='designs'){
  const panel=$('subsystem');if(panel.nextElementSibling!==note)panel.parentNode?.insertBefore(note,panel.nextSibling);
  document.body.dataset.fieldRail='false';note.open=!view.teachFolded;return;
 }
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
let rfLogCache=null,rfHardware=null,rfLastMonitor='';
function refreshCommBench(){
 const visible=!referencePage&&view.phase==='D'&&view.domain==='comm';
 const chapter=visible&&integrating()&&integrationState(view.t).seat>0?'closeout':view.chapter;
 updateCommTestConsole($('comm-test-console'),visible?hardware:null,chapter,selectCommBench,view.commBench,openCommLab,view.commWorksheet?.tests,saveCommTests);
 updateCommRehearsal($('comm-rehearsal'),sim,visible&&chapter==='integration',view.commWorksheet?.rehearsal,saveCommRehearsal);
}
function selectCommBench(id){
 view.commBench=commBenchId(id);
 if(integrating())renderProcessing();
 syncBayView();
 if(integrating()){renderObservation();$('storyextras').innerHTML=bayEvidence(hardware,snap,view)+facilityNotes(hardware)+bayTimeControls()}
 checkpoint.save();
}
function saveCommTests(tests){saveCommWorksheet({tests})}
function saveCommRehearsal(rehearsal){saveCommWorksheet({rehearsal})}
function saveCommWorksheet(change){
 view.commWorksheet={tests:[],...view.commWorksheet,...change,designRevision:packetIdentity(scenario(),sim.duration).revision};
 checkpoint.save();refreshPacketBadge();
}
function openCommLab(){
 view.domain='comm';view.bayLens='equipment';jumpGuide('integration');
 $('comm-test-console').scrollIntoView({block:'start'});
}
function refreshRadio(){
 const visible=!referencePage&&['C','D','E'].includes(view.phase)&&['comm','data'].includes(view.domain)&&!snap.carrierAttached&&!snap.referenceBody&&!snap.orbitLost;
 const monitor=$('rf-monitor'),log=$('rf-log');monitor.hidden=!visible;log.hidden=!visible;
 if(!visible)return;
 const details=terminalMonitor(snap);
 if(details!==rfLastMonitor){$('rf-mon-grid').innerHTML=details;rfLastMonitor=details}
 $('rf-play').textContent=playing&&playDirection>0?'Pause':'Watch at 1×';$('rf-play').hidden=!playing&&!snap.terminalActivity?.length;
 $('rf-peer').textContent=snap.station?snap.station+' in view':'Between direct contacts';
 if(rfHardware!==hardware){$('rf-pattern-key').innerHTML=signalGuide(hardware);rfHardware=hardware}
 const start=view.start,end=Math.min(start+DAY,sim.duration);
 const filter=view.rfFilter||({ka:'Ka',optical:'Optical',s:'S-band'}[hardware.input.link])||'S-band';
 if(rfLogCache?.model===sim&&rfLogCache.audit===sim.audit&&rfLogCache.start===start&&rfLogCache.filter===filter&&rfLogCache.page===view.rfPage)return;
 const runs=sim.terminalRuns(start,end-start);
 log.innerHTML=terminalWindow(hardware,runs,start,end,filter,view.rfPage);
 rfLogCache={model:sim,audit:sim.audit,start,filter,page:view.rfPage};
}
function refreshEventExplorer(){
 const visible=!referencePage&&view.phase==='E'&&!commissioning();
 const panel=$('event-explorer');panel.hidden=!visible;
 if(!visible){eventStudy=null;return}
 if(eventStudy?.model!==sim||eventStudy.events!==events||eventStudy.audit!==sim.audit){
  const available=comparisonEvents(events,view.start,Math.min(view.start+DAY,sim.ignition),hardware);
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
const navigation=workspaceHistory(()=>({...view,reference:referencePage}),async(place,restore={})=>{
 place={...place,domain:canonicalDomainId(place.domain)};
 if(!Object.hasOwn(phases,place.phase)||!Object.hasOwn(domains,place.domain))return false;
 closeoutVisit++;
 const pending=foregroundWork;if(pending){pending.controller.abort();await pending.done}
 const current=()=>!restore.signal?.aborted&&restore.isCurrent?.()!==false;
 if(!current())return false;
 const apply=()=>{
  if(!current())return false;
  if(modal)close();playing=false;loadingPlayback=false;pendingFlightSeek=null;
  const {reference,...rest}=place;Object.assign(view,rest);referencePage=referenceIds.includes(reference)?reference:null;
  view.mode=isEditable(view.phase)?'size':'fly';
  view.start=clamp(view.start,0,Math.max(0,sim.duration-DAY));view.t=clamp(view.t,-3600,sim.duration);
  refreshSamples(true);draw();
  if(!referencePage&&view.phase==='E')prepareFlight();else if(!referencePage&&view.phase==='F')prepareCloseout();
  return true;
 };
 if(place.phase!=='F')return apply();
 const restored=await runWork(closeoutWorkSpec(),async job=>{
  const abort=()=>job.controller.abort();restore.signal?.addEventListener('abort',abort,{once:true});
  try{if(!current())abort();return await openPreparedCloseout(apply,{job,start:clamp(place.start,0,Math.max(0,sim.duration-DAY)),instant:clamp(place.t,sim.ignition,sim.duration),scope:place.scope})}
  finally{restore.signal?.removeEventListener('abort',abort)}
 });
 return restored===true;
},()=>'design='+encodeScenario(scenario()),()=>checkpoint.save());
function draw(){
 navigation.sync();
 refreshPacketBadge();
 scheduleClock();
 checkpoint.schedule([view.phase,referencePage||view.domain,view.chapter,view.camera].join('/'));
 snap=sim.at(view.t);const p=view.phase,id=view.domain,ref=referencePage,def=phases[p],d=domains[id],a=!ref&&p==='A',b=!ref&&p==='B',c=!ref&&p==='C',flight=!ref&&['D','E','F'].includes(p),visual=c||flight;
 if(!visual){updatePointingPanels();$('orbit-lighting').hidden=true;$('flight-vectors').hidden=true}
 const bay=integrating();document.body.dataset.bay=String(bay);renderProcessing();renderLaunchPad();scene?.setSignalPlayback?.(visual?replayMotion():0);refreshRadio();
 refreshCommBench();
 positionGuide();refreshLesson();refreshEventExplorer();
 const loader=$('loading-player');loader.hidden=!(bay&&hasLoadingDirector(id));
 loader.innerHTML=loader.hidden?'':loadingPlayer(hardware,snap,replayMotion());
 $('viewer-heading').textContent=bay?'Integration facility':'Flight view';
 $('bay-display').hidden=!bay;
 setNav();const bar=lifecycleNav(p);if(bar!==phaseHTML){assignNav($('lifecycle'),bar);phaseHTML=bar}document.body.classList.toggle('storypage',visual);document.body.classList.toggle('subsystems-page',b);document.body.dataset.phase=p;
 $('crumb').textContent=ref?pages[ref][0]:'Phase '+p+' / '+d.label;$('title').textContent=ref?pages[ref][0]:d.label;$('subtitle').textContent=ref?pages[ref][2]:purposeStageDescription(id,p,hardware);$('pagecode').textContent=ref?'ENGINEERING REFERENCE':'PHASE '+p+'  /  '+def.label.toUpperCase();
 $('clockstatus').textContent=flight?(playing?'Flight clock running':'Flight clock paused'):designName(view);
 $('reference-context').innerHTML=activeReferenceStrip({hardware,referenceId:input.referenceCenterId,modified:view.referenceCenterModified||view.modified,name:designName(view,hardware)});
 $('pdr-domain-host').hidden=!!ref;$('presetshelf').hidden=true;$('phase-content').hidden=!a;$('system-choice').hidden=!b;$('diagram-host').hidden=!b;$('engineering-toggle').hidden=!b;
 $('primary').hidden=!visual;$('viewer').hidden=!visual;$('guidepanel').hidden=!visual;$('missionpath').hidden=!flight;$('storyextras').hidden=!flight;
 const detailed=b||(!ref&&view.detail&&p!=='A');
 if(bay&&!view.detail){for(const k of ['purpose-host','purpose-brief','purpose-studies']){const host=$(k);host.hidden=true;host.innerHTML=''}renderDiscipline()}
 else{renderPurposePanels();renderDiscipline();}
 const fleet=$('fleet-host');fleet.hidden=!!ref||id!=='launcher'||bay&&!view.detail;
 if(!fleet.hidden){const anchor=$(a?'phase-content':b?'diagram-host':'trade-input');if(anchor.previousElementSibling!==fleet)anchor.parentNode?.insertBefore(fleet,anchor);fleet.innerHTML=renderLaunchFleet(hardware,p)}
 $('study').hidden=true;$('kpis').hidden=true;$('timeline').hidden=!detailed;$('lower').hidden=!detailed;
 $('phase-extras').hidden=!!ref;$('phase-extras').innerHTML='';$('subsystem').innerHTML='';$('trade-input').hidden=!c;$('trade-output').hidden=!c;
 $('disposal-plot').hidden=!!ref||p!=='F';$('domain-readout').hidden=!!ref||p==='B';
 if(ref){$('pagecode').textContent=['designs','architecture','equipment','timeline'].includes(ref)?'DATA CENTER DESIGNS'+(input.referenceCenterId?' / '+getReferenceCenter(input.referenceCenterId).shortName.toUpperCase():''):'ENGINEERING REFERENCE';const panel=$('subsystem');panel.innerHTML=references();if(ref==='equipment')bindEquipmentList(panel,hardware,snap);if(ref==='materials')bindMaterialLibrary(panel,hardware);if(ref==='mission')bindMissionBaseline(panel,hardware,snap,pdrContext());
  if(ref==='timeline')bindMasterTimeline(panel,masterTimeline(sim),hardware,view,{
   onOpen:event=>runWork({title:'Opening mission event',detail:'Evaluating the spacecraft state and engineering results at the selected event.'},()=>openTimelineEvent(event)),onCommLab:()=>runWork({title:'Opening communications laboratory',detail:'Preparing the current spacecraft, mission window and communications assessment.'},openCommLab),onExport:exportMasterTimeline,fileFor:masterDownload,onView:patch=>{Object.assign(view,patch);checkpoint.save();}
  });
  choiceCues.update('reference/'+ref,document);return}
 if(a){$('presetshelf').innerHTML='';$('phase-content').innerHTML=phaseA(hardware,view,result,k=>inputRow(k,false,'concept'));$('phase-extras').innerHTML=phaseHandoff('B',id)+sourceNote()}
 if(b){$('system-choice').innerHTML=designSection()+(id==='attitude'?pointingApproach(hardware,true):'');renderDiagram();$('engineering-toggle').innerHTML=diagramTools();$('phase-extras').innerHTML=phaseHandoff('C',id)}
 if(visual){
  ensureScene();
  if(bay){const facility=processingFacility(hardware);$('title').textContent=facility.shortName+' · spacecraft processing';$('subtitle').textContent=facility.location+' · '+(hasLoadingDirector(id)?'Follow the spacecraft from processing to the selected launcher.':'Explore the facility, portable ground equipment and spacecraft service interfaces.'); $('pagecode').textContent='Phase D  /  Launch preparation';$('clockstatus').textContent='Processing plan · PDR';}
  if(bay&&id==='comm'){$('title').textContent='Communications verification';$('subtitle').textContent='Run a ground test, then locate its fixture on the spacecraft. '+integrationProfile(hardware.input.launcher,hardware.input.launchSite).facility+'.'}
  if(commissioning()){$('title').textContent='Spacecraft deployment';$('subtitle').textContent='Follow each restraint, roll and hinge from separation to Sun acquisition.'}
  scene?.setDomain?.(commissioning()&&id!=='software'?'conops':id,p);scene?.setControlLoop?.(view.flightLoop);scene?.setDeploymentLens?.(view.deploymentLens);scene?.setLaunchLens?.(view.launchLens);scene?.setPadConnection?.(view.padConnection);scene?.setChapter?.(view.chapter);syncBayView();chooseCamera(view.camera);scene?.update(hardware,snap);scene?.setOverlays(effectiveLayers());scene?.highlight(view.inspect||'');syncThermalToggle();viewerInfo();renderObservation();
  if(c){renderTrade(true);$('phase-extras').innerHTML=missionTotals(currentContext(),view,time)+phaseHandoff('D',id)}
  if(flight){$('missionpath').innerHTML=flightChapters(view);refreshFlightCalls();$('storyextras').innerHTML=commissioning()?commissioningTimeline(hardware,snap):bay?bayEvidence(hardware,snap,view)+facilityNotes(hardware)+bayTimeControls():(showLaunchDirector(view)?activeLaunchSequence():'')+flightPlayer();if(commissioning())refreshCommissioning(document,hardware,snap);if(p==='F'){renderDisposal();$('phase-extras').innerHTML='<button class="btn export gap" data-action="pdr">Prepare quantitative PDR</button>'}else $('phase-extras').innerHTML=phaseHandoff(p==='D'?'E':'F',id)}
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
 renderPdrWorkspace();
 choiceCues.update(p+'/'+id,document);
}
function pdrContext(){
 const cached=serviceCache.get(sim),service=cached?.start===view.start&&cached.audit===sim.audit?cached.value:null;
 const thermalSummary=windowThermalCache?.sim===sim&&windowThermalCache.start===view.start&&windowThermalCache.chronological===!!sim.audit?windowThermalCache.summary:null;
 return {h:hardware,s:snap,day,sim,envelope:result.envelope,view,service,thermalSummary};
}
function renderPdrWorkspace(){
 const host=$('pdr-domain-host');if(!host)return;host.hidden=!!referencePage;if(referencePage)return;
 const record=assessPdrDomains({...pdrContext(),domainIds:[view.domain]}),report=record.domains[0],body=renderPdrDomain(report,record);
 const openSections=[...host.querySelectorAll('details[open]')].map(el=>el.querySelector('summary')?.textContent);
 host.innerHTML=view.phase==='B'?body:'<details class="pdr-review-index"><summary>Preliminary design assessment · '+report.counts.shortfall+' shortfalls · '+report.counts.unassessed+' unassessed checks</summary>'+body+'</details>';
 for(const el of host.querySelectorAll('details'))if(openSections.includes(el.querySelector('summary')?.textContent))el.open=true;
 const anchor=$(view.phase==='B'?'diagram-host':view.phase==='A'?'domain-readout':'trade-input');if(anchor.previousElementSibling!==host)anchor.parentNode?.insertBefore(host,anchor);
}
function serviceFor(model,start){
 const begin=clamp(start,0,model.duration),end=Math.min(begin+DAY,model.duration);
 if(end<=begin)return null;
 const cached=serviceCache.get(model);
 if(cached&&cached.start===begin&&cached.audit===model.audit)return cached.value;
 const value=evaluateService(model,begin,end-begin);
 serviceCache.set(model,{start:begin,audit:model.audit,value});return value;
}
function catalogueService(){
 const model=sim,start=view.start,cached=serviceCache.get(model);
 if(cached?.start===start&&cached.audit===model.audit)return cached.value;
 if(landingReplay?.model===model&&landingReplay.start===start&&landingReplay.audit===model.audit)return null;
 landingReplay?.controller.abort();
 const controller=new AbortController(),replay={controller,model,start,audit:model.audit,failed:false};
 landingReplay=replay;
 const span=Math.min(DAY,model.duration-start);
 if(span<=0)return null;
 const firstDay=start===0&&!model.audit;
 let acceptedWindow;
 if(!firstDay){
  const initial=model.at(start);
  acceptedWindow={segments:model.serviceTimeline(start,span),initial:{aiCorpusStagedGB:initial.aiCorpusStagedGB,aiInputBufferGB:initial.aiInputBufferGB},
   provenance:model.audit||start+span<=60*DAY?'Chronological spacecraft intervals in the selected window.':'Service intervals start from a representative mission-age checkpoint.'};
 }
 evaluateServiceAsync(model.hardware.input,start,span,{signal:controller.signal,firstDay,acceptedWindow}).then(value=>{
  if(controller.signal.aborted||sim!==model||replay.audit!==model.audit)return;
  serviceCache.set(model,{start,audit:model.audit,value});
 }).catch(err=>{if(err.name!=='AbortError')replay.failed=true}).finally(()=>{
  if(landingReplay!==replay||controller.signal.aborted||sim!==model||replay.audit!==model.audit||view.start!==start||view.phase!=='A'||referencePage||!['compute','conops'].includes(view.domain))return;
  refreshEarthOutcome($('purpose-host'),hardware,serviceCache.get(model)?.value,snap,replay.failed);updateReadout();renderPdrWorkspace();
 });
 return null;
}
function updateReadout(){
 const catalogue=view.phase==='A'&&['compute','conops'].includes(view.domain);
 const ctx=currentContext(!catalogue);
 if(catalogue)ctx.service=catalogueService();
 $('domain-readout').innerHTML=renderDomainReadout(view.domain,view.phase,ctx);
}
function renderPurposePanels(){
 const id=view.domain,p=view.phase,ref=referencePage,host=$('purpose-host'),brief=$('purpose-brief'),studies=$('purpose-studies');
 const choosingInConops=false;
 host.hidden=!!ref||id!=='compute';brief.hidden=!!ref||id!=='conops';studies.hidden=!!ref||id!=='compute'||!isEditable(p);
 if(!brief.hidden){const anchor=$(p==='A'?'presetshelf':p==='B'?'diagram-host':'trade-input');if(anchor.previousElementSibling!==brief)anchor.parentNode?.insertBefore(brief,anchor);brief.innerHTML=conopsPurpose(hardware,p)}
 if(!host.hidden){
  const anchor=$(p==='A'?'phase-content':p==='B'?'diagram-host':'trade-input');if(anchor.previousElementSibling!==host)anchor.parentNode?.insertBefore(host,anchor);
  const selectedId=isEditable(p)?view.purposePreview:null;
  host.innerHTML=renderAIPurpose(hardware,p,{context:choosingInConops?'conops':'purpose',selectedId:selectedId||input.aiPurpose,snapshot:snap,state:snap,day,windowStart:view.start,sim,envelope:result.envelope,service:p==='A'?catalogueService():serviceFor(sim,view.start),failed:landingReplay?.failed});
  if(!studies.hidden){
   const toolsAnchor=$(p==='B'?'kpis':p==='A'?'phase-content':'trade-input');
   if(toolsAnchor.previousElementSibling!==studies)toolsAnchor.parentNode?.insertBefore(studies,toolsAnchor);
   studies.innerHTML=studyMenu(hardware.input,selectedId,view.studyDays);
  }
 }
}
async function activateStudy(next,resolved,{preset='custom',presetName=null,thermalTargets={},thermalScope='window',thermalPadding=0,sizingProvenance=null}={}){
 const prepared=resolved||inverseSolve(next,'installed'),candidate=createSimulation(prepared.hardware),owner=sim,job=foregroundWork;
 const instant=3438,start=0;
 if(job){job.ui.setCancelable(()=>job.controller.abort());job.ui.stage(1,'Preparing the selected design and its first operating window.');await yieldToPaint()}
 await candidate.prepareWindow({start,instant,scope:'day',signal:job?.signal,onProgress:progress=>{job?.ui.stage(1,progress.detail);if(Number.isFinite(progress.completed)&&Number.isFinite(progress.total))job?.ui.progress(progress.completed,progress.total,progress.detail)}});
 if(job?.signal.aborted||owner!==sim)throw new DOMException('Reference opening cancelled','AbortError');
 if(job){job.ui.stage(2,'Updating the spacecraft, equipment list, timeline and engineering views.');await yieldToPaint();if(job.signal.aborted)throw new DOMException('Reference opening cancelled','AbortError');job.ui.setCancelable(null)}
 if(modal)close();referencePage=null;playing=false;closeoutVisit++;
 view={...defaultView,phase:'E',domain:'conops',chapter:'operations',camera:'spacecraft',mode:'fly',solve:'installed',lastSizingMethod:Object.hasOwn(solveModes,sizingProvenance)?sizingProvenance:null,t:instant,start,scope:'day',preset,presetName,starterPurpose:next.aiPurpose||defaultView.starterPurpose,starterContext:preset==='starter'?starterContext(next):null,referenceCenterId:next.referenceCenterId||null,referencePreview:next.referenceCenterId||view.referencePreview,referenceCompared:view.referenceCompared||[],modified:false,thermalTargets:{...thermalTargets},thermalScope:thermalScope||'window',thermalPadding:thermalPadding||0,lighting:view.lighting,spacecraftFocus:view.spacecraftFocus,exposureEV:view.exposureEV};
 input={...next};recalc(prepared,false);refreshSamples();snap=sim.at(view.t);draw();prepareFlight();window.scrollTo({top:0,behavior:'instant'});
}
function openReferenceStudy(id,restore=false){
 const center=getReferenceCenter(id);if(!center)return;const next=buildReferenceDesign(id,{missionCase:view.referenceMissionCase||'source'});
 return reviewProposal(next,{mode:'installed',label:(restore?'Restore ':'Open ')+center.shortName+' study',force:true,wholeDesign:true,referenceCenter:center,commit:resolved=>activateStudy(next,resolved,{preset:'reference:'+id})});
}
function markStarter(id,next){
 view.preset='starter';view.presetName=null;view.starterPurpose=id;view.starterContext=starterContext(next);view.modified=false;
 view.thermalTargets={};view.thermalPadding=0;view.thermalScope='window';view.tradeKey=null;view.tradeBase=null;
}
function usePurpose(id,withBuild,context=hardware.input){
 if(!isEditable(view.phase)||!Object.hasOwn(aiPurposes,id))return;
 withBuild=false;const next=applyAIPurpose(hardware.input,id,false);
 return reviewProposal(next,{mode:'installed',label:aiPurposes[id].label+' · '+(withBuild?'mission and starting spacecraft':'current spacecraft'),force:true,family:'aiPurpose',starter:withBuild,commit:resolved=>{
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
async function compareEarthRoutes(){
 if(!isEditable(view.phase))return;
 const model=sim,h=hardware,start=view.start,span=Math.min(DAY,model.duration-start);
 if(span<=0){toast('Choose a window before mission closeout.');return}
 orderJob?.abort();const controller=new AbortController();orderJob=controller;
 open('Compare Earth routes','<p role="status">Following the same customer order through direct contacts and an assumed relay…</p><button class="btn" data-action="ai-cancel-order">Cancel</button>','ai-working');
 try{
  const options=start===0?{firstDay:true}:orderSeed(model,start);
  const [direct,relay]=await Promise.all(['direct','relay'].map(serviceRoute=>evaluateServiceAsync({...h.input,serviceRoute},start,span,{...options,signal:controller.signal})));
  if(!controller.signal.aborted&&sim===model&&modal==='ai-working'&&orderJob===controller)open('Direct contacts and relay',compareRoutesReport(h,direct,relay),'ai-route-results');
 }catch(err){if(err.name!=='AbortError'&&sim===model&&modal==='ai-working')open('Route comparison stopped','<p>'+esc(err.message)+'</p><button class="btn" data-action="ai-routes">Try again</button>','ai-error')}
 finally{controller.abort();if(orderJob===controller)orderJob=null}
}
async function runOrder(){
 if(!isEditable(view.phase)||view.domain!=='compute')return;
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
function syncVectorKey(){
 const strip=$('flight-vectors');
 strip.hidden=!!referencePage||!['C','D','E','F'].includes(view.phase)||!orbitVectorsAvailable(view.camera,snap);
 scene?.setOrbitVectors(view.orbitVectors);
 if(strip.hidden)return;
 $('flight-vector-toggle').setAttribute('aria-pressed',String(view.orbitVectors));
 $('flight-vector-key').hidden=!view.orbitVectors;
 if(!view.orbitVectors)return;
 const readings=orbitVectorReadings(snap);
 for(const id of ['velocity','sun','station']){
  const el=$('vector-'+id),r=readings.find(item=>item.id===id);
  el.hidden=!r;
  if(!r)continue;
  const label=el.querySelector('b'),value=el.querySelector('span');
  if(label.textContent!==r.label)label.textContent=r.label;
  if(value.textContent!==r.value)value.textContent=r.value;
  const path=el.querySelector('path');
  if(path.getAttribute('stroke')!==r.color)path.setAttribute('stroke',r.color);
 }
}
function syncLighting(){
 syncVectorKey();
 const visual=!referencePage&&['C','D','E','F'].includes(view.phase);
 const available=visual&&orbitalLightingAvailable(view.camera,snap);
 const canFocus=visual&&spacecraftFocusAvailable(view.camera,view.chapter,view.deploymentLens);
 const g=$('pointing-toggle');
 g.hidden=!available||view.camera==='core';g.setAttribute('aria-pressed',String(effectiveLayers().includes('pointing')));
 $('orbit-lighting').hidden=!available&&!canFocus;
 $('spacecraft-focus').hidden=!canFocus;$('lighting-control').hidden=!available;$('exposure-control').hidden=!available;$('light-environment').hidden=!available;
 scene?.setSpacecraftFocus(view.spacecraftFocus);
 $('focus-core').setAttribute('aria-pressed',String(view.spacecraftFocus==='core'));
 $('focus-entire').setAttribute('aria-pressed',String(view.spacecraftFocus==='entire'));
 if(!available)return;
 const effective=effectiveLightingMode(view.lighting,snap),studio=effective==='studio';
 scene?.setLightingMode(view.lighting);
 scene?.setExposureEV(view.exposureEV);
 const exposure=$('camera-exposure');if(exposure.value!==String(view.exposureEV))exposure.value=String(view.exposureEV);
 for(const mode of ['auto','realistic','studio'])$('lighting-'+mode).setAttribute('aria-pressed',String(view.lighting===mode));
 const label=(view.lighting==='auto'?'Auto → ':'')+(studio?'Studio':'Realistic')+' · '+(snap.eclipse?'Eclipse':'Sunlit')+(studio&&view.camera==='orbit'?' · Locator lit':'');
 const status=$('light-environment');
 if(status.textContent!==label){status.textContent=label;status.dataset.shadow=String(!!snap.eclipse);status.dataset.effectiveLighting=effective;}
}

function activeLaunchSequence(){
 return launchSequence(hardware,snap,launchSegment(view.t)==='pad'?null:masterTimeline(sim));
}
function refreshLaunchStops(){
 if(!showLaunchDirector(view))return;
 const sequence=$('storyextras').querySelector('[data-launch-sequence]');
 if(!sequence)return;
 if(sequence.dataset.launchSequence!==launchSegment(view.t)){sequence.outerHTML=activeLaunchSequence();renderObservation();return}
 const buttons=sequence.querySelectorAll('[data-choice-group="launch-stops"] [data-launch-time]');
 const current=Array.from(buttons).filter(b=>view.t>=Number(b.dataset.launchTime)).at(-1);
 for(const b of buttons)b.setAttribute('aria-current',b===current?'step':'false');
}
function flightCallAt(model,t,selected){
 if(selected&&Math.abs((selected.seek??selected.start)-t)<.01)return selected;
 return model.rows.filter(r=>r.seek!==null&&r.start>=-3600&&r.start<=t).at(-1);
}
function refreshFlightCalls(){
 if(!view.timelineFollow||referencePage||!['D','E'].includes(view.phase))return;
 const bar=$('timeline-flight-calls');if(!bar)return;
 const model=masterTimeline(sim),t=view.t,selected=model.rows.find(r=>r.id===view.timelineRow);
 bar.hidden=t< -3600||t>model.end;
 if(bar.hidden)return;
 const major=model.rows.filter(r=>r.major&&r.seek!==null&&r.start>=-3600);
 const exact=selected&&Math.abs((selected.seek??selected.start)-t)<.01?selected:null;
 const now=flightCallAt(model,t,selected);
 // Several launch calls can share one timestamp (cutoff, separation or handover).
 const current=exact?major.indexOf(exact):-1;
 const next=current>=0?major[current+1]:major.find(r=>r.start>t);
 const exactStart=now&&Math.abs((now.seek??now.start)-t)<.01;
 const key=(now?.id||'')+'/'+(next?.id||'')+'/'+exactStart;if(bar.dataset.calls===key)return;bar.dataset.calls=key;
 bar.innerHTML='<div><small>'+esc(model.launchHold?'CONDITIONAL FLIGHT STUDY':exactStart?'AT THE FLIGHT CLOCK':'MOST RECENT CALLOUT')+'</small><strong>'+esc(now?.title||'Awaiting first call')+'</strong></div>'+
  (next?'<button class="textbutton" data-next-master-call="'+esc(next.id)+'">Next call · '+esc(next.title)+' →</button>':'<span>End of this timeline</span>');
}
function viewerInfo(){if(!referencePage&&view.phase==='D'&&view.domain==='comm')refreshCommBench();scene?.setSignalPlayback?.(replayMotion());refreshRadio();refreshFlightCalls();syncLighting();updatePointingPanels();const ribbon=$('eventribbon');if(ribbon)ribbon.hidden=true;const early=view.t<DEPLOY_END_S;$('imagestate').textContent=early?time(view.t)+'  /  '+(view.t<0?'PREFLIGHT':view.t>=0&&view.t<35?Math.round(Math.max(0,snap.altitudeKm)*1000)+' M':Math.round(snap.altitudeKm)+' KM'):'ORB '+String(snap.orbitNumber).padStart(3,'0')+'  /  '+fmt(snap.altitudeKm,0)+' KM';$('craftid').textContent=designName(view);$('craftphase').textContent=view.camera==='core'?'CUTAWAY · ENCLOSURE OPEN FOR INSPECTION':early?({integration:'PAYLOAD INTEGRATION',pad:'LAUNCH PAD',ascent:'ASCENT',insertion:'ORBITAL INSERTION',commissioning:'DEPLOYMENT'})[snap.flightPhase]||'COMMISSIONING':snap.flightPhase==='entry'?'ENTRY INTERFACE':snap.burn?'CHEMICAL BURN':snap.station?'CONTACT · '+snap.station.toUpperCase():snap.eclipse?'EARTH SHADOW':'SUNLIT ORBIT'}
function openFieldGuide(key,option){
 const r=fieldGuidance(key,hardware.input,{option:option||hardware.input[key]});if(!r)return;
 $('guide-name').textContent=r.title;$('guide-body').innerHTML=helpBody(key,hardware.input,option);help?.hide();if(!$('guide-dialog').open)$('guide-dialog').showModal();
}
function open(title,html,key){playing=false;modal=key;$('dialogtitle').textContent=title;$('dialogbody').innerHTML=html;if(!$('dialog').open)$('dialog').showModal()}
function close(){modal=null;$('dialog').close()}
const tile=(action,label,desc,ic)=>'<button class="actiontile" data-action="'+action+'">'+icon(ic,21)+'<span><strong>'+label+'</strong><small>'+desc+'</small></span><span class="end">'+icon('chevron-right',14)+'</span></button>';
function params(){if(!isEditable(view.phase))return;const groupMap=[...new Set(controls.map(c=>c.group))].filter(g=>g!=='Thermal limits'),opts=Object.entries(solveModes).map(([k,l])=>'<option value="'+k+'" '+(k===view.solve?'selected':'')+'>'+esc(l)+'</option>').join('');
 const saved=Array.from($('dialogbody').querySelectorAll('details[open]')).map(x=>x.dataset.group);
 open('Inputs & sizing proposals','<p>Mission edits evaluate the installed spacecraft. A sizing proposal changes hardware only when you apply it; later edits keep that installation fixed.</p><div class="fieldgrid"><div class="fieldbox"><div class="field-caption"><label for="solve">Sizing action</label>'+helpButton('solve','a sizing method',view.solve)+'</div><select id="solve" '+(view.mode==='fly'?'disabled':'')+'>'+opts+'</select></div><div class="fieldbox"><div class="field-caption"><label for="epoch">Scenario epoch · UTC</label>'+helpButton('epoch','the mission epoch')+'</div><input type="datetime-local" id="epoch" class="forminput" step="1" value="'+esc(input.epoch.slice(0,19))+'" '+(view.mode==='fly'?'disabled':'')+'></div></div><div class="solvenote gap" id="solvenote">'+solveNote()+'</div><div class="gap">'+groupMap.map(g=>'<details data-group="'+esc(g)+'" '+(saved.includes(g)||(!saved.length&&g==='Technology')?'open':'')+'><summary>'+esc(g)+'</summary><div class="fieldgrid">'+controls.filter(c=>c.group===g).map(c=>inputRow(c.key)).join('')+'</div></details>').join('')+'</div><div class="dialogrow gap"><button class="btn" data-action="compare">Compare technology presets</button><button class="btn" data-action="tempbands">Thermal limits</button><button class="btn export" data-action="close">Done</button></div>','params');
}
function solveNote(){if(view.solve==='installed')return 'Installed spacecraft · '+fmt(hardware.itKw,1)+' kW requested active IT · '+fmt(hardware.launchKg)+' kg launch stack · limiting sizing balance: '+esc(sizingLabel(result.binding))+'.';return (result.feasible?'Solved':'Constraint reached')+' · '+(result.lowerBound?'≥ ':'')+fmt(result.achieved,3)+' '+esc(result.unit)+' · '+esc(sizingLabel(result.binding))+'. Sizing uses the analytic operating envelope. Inspect telemetry for time-resolved performance.'}
let compareCategory='battery';
function compare(key=compareCategory){if(!isEditable(view.phase)||!Object.hasOwn(presets,key))return;compareCategory=key;const rows=enumeratePresets(input,key);open('Technology comparison','<p>Each candidate uses the current mission allowance and the same sizing assumptions.</p><select id="category" aria-label="Technology category">'+Object.keys(presets).map(k=>'<option '+(k===key?'selected':'')+'>'+k+'</option>').join('')+'</select><div class="gap">'+rowTable(['Preset','Balance','Mass margin','Binding margin',''],rows.map(r=>tr([esc(r.label),esc(sizingLabel(r.binding)),fmt(r.marginKg)+' kg',esc(r.marginDisplay),view.mode==='size'?'<button class="chip" data-preset="'+esc(key)+'" data-id="'+esc(r.id)+'">Use</button>':'Fixed'])).join(''))+'</div>','compare')}
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
 if(awaitFlightWindow(t))return;
 const lo=view.phase==='D'?-3600:view.phase==='F'?sim.ignition:view.phase==='E'?DEPLOY_START_S:-3600;
 const hi=view.phase==='D'?DEPLOY_START_S:view.phase==='E'?sim.ignition:view.phase==='F'?(sim.disposal()?.end??sim.duration):sim.duration;
 view.t=clamp(t,lo,hi);view.start=dayStart(view.t);refreshSamples();snap=sim.at(view.t);syncChapterToTime();scene?.update(hardware,snap);viewerInfo();renderObservation();refreshLaunchStops();refreshLesson();refreshEventExplorer();renderDiscipline(true);renderPdrWorkspace();if($('live-met'))$('live-met').textContent=time(view.t);if(view.phase==='F')renderDisposal();
}
function openTimelineEvent(row){
 if(!row||row.seek===null)return;
 const t=row.seek??row.start;
 if(!Number.isFinite(t)||t< -3600||t>sim.duration)return;
 referencePage=null;view.timelineRow=row.id;view.timelineFollow=true;
 view.phase=row.phase;view.domain=row.domain;view.chapter=row.chapter;view.camera=row.camera;
 view.mode='fly';view.event=null;view.detail=false;view.inspect=null;
 view.deploymentLens='vehicle';view.launchLens='wide';view.bayLens=row.segment==='ground'?'payload':'overview';
 if(row.segment==='countdown'||row.segment==='ascent'||row.segment==='insertion')view.speed=1;
 view.t=t;view.start=dayStart(t);playing=false;loadingPlayback=false;
 refreshSamples();snap=sim.at(t);draw();checkpoint.save();window.scrollTo({top:0,behavior:'instant'});
}
let downloadModel;
function masterDownload(format){
 if(format!=='csv'&&format!=='json')return null;
 const m=masterTimeline(sim),key='master-timeline-'+format;
 if(downloadModel!==m){downloadModel=m;for(const f of ['csv','json']){
  retainFile('master-timeline-'+f,timelineFile(m,hardware,f),'ODC-01-master-timeline.'+f,m.rows.length+' events · '+designName(view));
 }}
 return preparedFile(key);
}
function exportMasterTimeline(format){
 const f=masterDownload(format);if(!f)return;
 open('Download master timeline',readyCard(f.key,'Download '+format.toUpperCase())+'<p>The complete sequence includes timing, responsibility, launch conditions and the basis for each event.</p>','timeline-download');
}
function awaitFlightWindow(t,start=view.start){
 if(view.phase!=='E'||sim.audit||t<60*DAY){pendingFlightSeek=null;return false}
 playing=false;pendingFlightSeek={t,start:windowStartFor(t,start,sim.duration)};
 prepareFlight();return true;
}
function setTime(t,clear=true,start=view.start){
 pauseProcessing(false);
 loadingPlayback=false;playing=false;if(!Number.isFinite(t))return;
 if(view.phase==='D')t=clamp(t,-3600,DEPLOY_START_S);
 if(view.phase==='E')t=clamp(t,DEPLOY_START_S,sim.ignition);
 if(view.phase==='F')t=clamp(t,sim.ignition,sim.disposal()?.end??sim.duration);
 if(awaitFlightWindow(t,start)){toast('Resolving the selected flight time chronologically.');return}
 view.t=clamp(t,-3600,sim.duration);if(clear)view.event=null;
 view.start=windowStartFor(view.t,start,sim.duration);refreshSamples();syncChapterToTime();draw()
}
function setWindow(t){
 const start=clamp(t,0,Math.max(0,sim.duration-DAY));
 setTime(start+7800,true,start);
}
let pendingImpact=null;
function reopenEditor(origin){
 if(origin==='params')params();else if(origin==='editfield')fieldEditor(editKey);else if(origin==='phasecontrols')phaseControls();else if(origin==='fairings')fairingDialog();else if(origin==='limits')limitDialog();else if(origin==='compare')compare();else if(origin==='preset-shelf')shelfDialog();
}
async function reviewProposal(next,{mode=view.solve,label,commit,force=false,drag=false,origin=modal,family=null,starter=false,wholeDesign=false,referenceCenter=null}){
 if((!wholeDesign&&!isEditable(view.phase))||modal==='impact')return;
 const base=input,phase=view.phase,solve=view.solve,current=result,start=wholeDesign?0:view.start,currentDay=wholeDesign?null:day,owner=sim,currentDayStart=!wholeDesign&&daysig?start:null;
 return runWork(reviewWorkSpec(label),async job=>{
 const {assessment,preview}=await evaluateDesignChange({before:base,after:next,mode:solve,nextMode:mode,current,family,start,currentDay,currentDayStart,includePreview:!drag},{signal:job.signal,onProgress:p=>job.ui.stage(p.index,p.detail)});
 if(job.signal.aborted||input!==base||view.phase!==phase||sim!==owner)return;
 // A changed mission duration can shift the matched window. Preserve the
 // existing chronological audit's seed history for that uncommon comparison.
 if(!wholeDesign&&preview&&owner.audit&&preview.start!==currentDayStart){
  job.ui.stage(2,'Reconciling the current chronological mission results with the review window.');await yieldToPaint();
  if(job.signal.aborted)return;preview.current=owner.daySummary(preview.start);
 }
 const {changes,domains,deltas,margins,newFailures,errors}=assessment;
 if(!changes.length&&mode===solve&&!force&&!errors.length||!errors.length&&!force&&!assessment.review){
  job.ui.setCancelable(null);job.ui.stage(2,'Updating the installed design and its mission results.');await yieldToPaint();if(job.signal.aborted||input!==base||view.phase!==phase||sim!==owner)return;return commit(assessment.proposed);
 }
 if(drag)return;
 job.ui.setCancelable(null);job.ui.stage(2,'Preparing the coupled results, retained assumptions and review decision.');await yieldToPaint();
 if(job.signal.aborted||input!==base||view.phase!==phase||sim!==owner)return;
 const val=(k,v)=>esc(fmt(displaySetting(k,v),5)),violations=margins.filter(r=>!meetsSizingRequirement(r.after,r.key)),known=sim.audit?'Applying this change clears the existing chronological mission results. Run the sweep again to evaluate the revised mission.':'Applying this change recalculates the design and flight preview. Run a chronological sweep for revised mission extrema and totals.';
 const conflict=changes.filter(x=>x.overwritesOverride),ins=changes.map(x=>tr([esc(x.label)+(x.overwritesOverride?'<small class="impact-dim">Edited preset value</small>':''),val(x.key,x.before),val(x.key,x.after),esc(x.unit)])).join('');
 let flight='';
 if(preview){
  const {start,current:da,proposed:db}=preview;
  const rows=[['Ground contacts','', 'contactCount'],['Delivered data','GB','deliveredGB'],['Minimum battery SOC','%','minSocPct'],['Maximum junction temperature','K','maxJunctionK']];
  flight='<h3 class="gap">Same 24-hour window</h3><small>'+esc(time(start))+' · '+(start>=60*DAY?'representative-day preview':'chronological samples')+'</small>'+rowTable(['Response','Current','Proposed','Unit'],rows.filter(x=>Number.isFinite(da[x[2]])&&Number.isFinite(db[x[2]])).map(([name,u,k])=>tr([name,fmt(da[k],3),fmt(db[k],3),u])).join(''));
 }
 const heading='<div class="impact-banner '+(errors.length||violations.length?'warn':'')+'"><b>'+esc(label)+'</b><p>'+esc(errors.length?errors.join(' '):newFailures.length?'Newly exceeded sizing limits: '+newFailures.map(r=>r.label).join(', ')+'.':violations.length?'Some proposed margins are below their sizing requirements.':'The proposed design meets the listed sizing checks.')+'</p></div>';
 const info=domains.length?'<div class="impacted-domains">'+domains.map(name=>'<span class="tag">'+esc(name)+'</span>').join('')+'</div>':'';
 const launcher=changes.some(x=>x.key==='launcher')&&assessment.proposed?.hardware,benchmark=launcher?launcher.input.referenceKg:null;
 const launchNote=launcher?'<div class="impact-banner '+(launcher.input.launchAllowanceKg>benchmark?'warn':'')+'"><b>Payload capacity at the reference orbit</b><p>Mission allowance '+fmt(launcher.input.launchAllowanceKg)+' kg · vehicle reference '+fmt(benchmark)+' kg. '+(launcher.input.launchAllowanceKg>benchmark?'The proposed allowance exceeds this vehicle’s published or concept benchmark. Review the mission-specific performance allocation.':'The provider or concept benchmark and the editable mission allowance refer to distinct assumptions. Confirm performance for the selected orbit and recovery mode.')+'</p></div>':'';
 const retained=assessment.retained||[],carry=retained.length?'<h3 class="gap">Retained assumptions to verify</h3>'+rowTable(['Field','Proposed design','Why it needs review'],retained.map(x=>tr([esc(x.label),val(x.key,x.value)+' '+esc(x.unit),esc(x.note)])).join('')):'';
 const purposeNote=family==='aiPurpose'&&assessment.proposed?'<div class="impact-banner"><b>'+esc(assessment.proposed.hardware.ai.label)+'</b><p>'+esc(aiPurposes[next.aiPurpose].description)+'</p><p>Operating estimate '+fmt(assessment.proposed.hardware.ai.activeUnitsPerSec,4)+' '+esc(assessment.proposed.hardware.ai.unit)+'/s · accelerator-memory margin '+plus(assessment.proposed.hardware.ai.memoryMarginGB)+' GB.</p></div>':'';
 const referenceNote=referenceCenter?'<div class="impact-banner"><b>Reference-based study · '+esc(referenceCenter.shortName)+'</b><p>This opens the complete configured study: spacecraft, workload, orbit, launch vehicle and disposal plan. Published specifications remain available in Design references. Support equipment and missing interfaces use the declared workbench assumptions.</p><p>The following margins describe this modeled realization; they do not establish qualification of the published concept.</p></div>':'';
 const startingNote=starter?'<p>This starting design sets the workload, spacecraft hardware, launcher and operating assumptions for '+esc(aiPurposes[next.aiPurpose].label)+'. It carries over your orbit, mission duration and disposal settings. The review below lists the proposed changes.</p>':'';
 const fieldTable=changes.length?rowTable(['Field','Current','Proposed','Unit'],ins):'';
 const inputs=(starter||wholeDesign)&&changes.length?'<details class="gap"><summary>Review all '+changes.length+' input changes</summary>'+fieldTable+'</details>':fieldTable?'<h3>Input changes</h3>'+fieldTable:'';
 const body=heading+referenceNote+startingNote+info+launchNote+purposeNote+(conflict.length?'<p><b>Edited preset values will be replaced.</b> '+esc(conflict.map(x=>x.label).join(', '))+'.</p>':'')+
 (mode!==view.solve?'<p>Sizing method changes from <b>'+esc(solveModes[view.solve])+'</b> to <b>'+esc(solveModes[mode])+'</b>.</p>':'')+
 inputs+carry+
 (deltas.length?'<h3 class="gap">Coupled design results</h3>'+rowTable(['Quantity','Current','Proposed','Unit'],deltas.map(x=>tr([esc(x.label),fmt(x.before,4),fmt(x.after,4),esc(x.unit)])).join('')):'')+
 (violations.length?'<h3 class="gap">Margins requiring attention</h3>'+rowTable(['Sizing check','Current margin','Proposed margin'],violations.map(x=>tr([esc(x.label),sizingMargin(x.key,x.before,result.envelope),sizingMargin(x.key,x.after,assessment.proposed.envelope)])).join('')):'')+flight+
 '<p class="muted gap">'+esc(known)+'</p><div class="dialogrow gap impact-actions"><button class="btn" data-action="cancelimpact">Keep current design</button>'+(errors.length?'':'<button class="btn export" data-action="applyimpact">'+(referenceCenter?'Open reference study':wholeDesign?'Open saved design':starter?'Use this mission and spacecraft':'Apply design change')+'</button>')+'</div>';
 pendingImpact={base,phase,origin,wholeDesign,commit:()=>commit(assessment.proposed),valid:!errors.length};open('Review design change',body,'impact');
 },null,foregroundWork);
}
async function settleImpact(apply){
 const change=pendingImpact;if(!change)return;
 return runWork({title:apply?'Applying design change':'Keeping current design',detail:apply?'Recalculating the spacecraft and its mission preview.':'Returning to the installed configuration.',steps:['Resolve review decision','Update spacecraft and mission','Refresh workspace'],ready:apply?'Design updated':'Current design retained'},async job=>{
  pendingImpact=null;job.ui.setCancelable(null);close();
  const accepted=apply&&change.valid&&change.base===input&&view.phase===change.phase;
  job.ui.stage(1,accepted?'Rebuilding the spacecraft and replaying the mission window.':'Restoring the current design view.');await yieldToPaint();
  if(accepted)await change.commit();else draw();
  job.ui.stage(2,'Refreshing diagrams, controls and engineering results.');await yieldToPaint();
  if(!accepted||(!change.wholeDesign&&change.origin!=='preset-shelf'))reopenEditor(change.origin);
 },null,foregroundWork);
}
function changeParam(key,val,deep=false,opts={}){
 if(lock(key))return;if(key==='aiPurpose')return usePurpose(val,false);
 const next=presets[key]?applyPreset(input,key,val):{...input,[key]:val};
 // A launcher trade preserves the accepted orbit. Site/trajectory incompatibility remains a visible check.
 if(val===input[key]&&!presets[key]&&!opts.after){if(deep){draw();reopenEditor(modal)}return}
 const label=(controlByKey[key]?.label||key)+' → '+displaySetting(key,val)+(['launcher','launchSite'].includes(key)?' · preserve mission orbit':'');
 return reviewProposal(next,{label,drag:!deep,family:key,force:!!opts.force||!!presets[key]&&Object.keys(next).some(k=>next[k]!==input[k]),commit:resolved=>{
  input=next;playing=false;view.modified=true;view.event=null;if(opts.after)opts.after();recalc(resolved);
  if(deep){draw();reopenEditor(modal);return}
  if(view.phase==='A'||view.phase==='B')refreshLesson();
  if(view.phase==='A'){$('phase-output').innerHTML=designOutput(hardware,view,result);if(view.domain==='launcher')$('fleet-host').innerHTML=renderLaunchFleet(hardware,view.phase)}
  if(view.phase==='C'){scene?.update(hardware,snap);viewerInfo();renderObservation();renderTrade(false);$('phase-extras').innerHTML=missionTotals(currentContext(),view,time)+phaseHandoff('D',view.domain)}
  if(view.phase==='B'){$('system-choice').innerHTML=designSection();renderDiagram();kpis();drawStudy();lower();timeline()}
  if(!$('domain-readout').hidden)updateReadout();
  if(view.domain==='compute'||view.domain==='conops')renderPurposePanels();renderDiscipline();renderPdrWorkspace();
  document.querySelectorAll('[data-param]').forEach(e=>{const v=hardware.input[e.dataset.param];if(document.activeElement!==e&&typeof v==='number')e.value=+v.toFixed(5);if(e.type==='range')e.style.setProperty('--pct',(100*(v-e.min)/(e.max-e.min))+'%')});if($('solvenote'))$('solvenote').innerHTML=solveNote();
 }});
}
let auditJob=null,auditOwner=null,auditAbort=null,auditStatus='',packetJob=null,packetMessage='',packetInfo=null;
function audit(){
 if(sim.audit)return Promise.resolve(sim.audit);
 if(auditJob&&auditOwner===sim)return auditJob;
 const target=sim,controller=new AbortController();auditAbort=controller;auditOwner=target;auditStatus='Starting chronological sweep…';
 const job=target.runAudit(progress=>{if(auditOwner!==target)return;auditStatus=progress.detail||progress.preparing||'Integrating mission day '+fmt(progress.days,0)+' of '+fmt(progress.totalDays,0);if($('auditprogress'))$('auditprogress').textContent=auditStatus;$('clockstatus').textContent=auditStatus;if($('flight-verification')&&['E','F'].includes(view.phase))$('flight-verification').textContent=(view.phase==='F'?'Preview · ':'')+auditStatus},{signal:controller.signal}).then(async a=>{
  if(sim===target){
   life=estimateLife(hardware,30,a);view.chronological=true;windowThermalCache=null;daysig='';
   while(sim===target&&view.phase==='F'){
    const selection={start:view.start,instant:view.t,scope:view.scope};
    await target.prepareDisposal({...selection,signal:controller.signal});
    if(selection.start===view.start&&selection.instant===view.t&&selection.scope===view.scope)break;
   }
   if(sim===target){refreshSamples();draw()}
  }return a
 }).finally(()=>{if(auditJob===job){auditJob=null;auditAbort=null;auditOwner=null;auditStatus=''}});auditJob=job;return job;
}
function packetIsCurrent(){
 if(!packetInfo||packetInfo.window_start_met_s!==view.start||packetInfo.instant_met_s!==Math.round(view.t*1000)/1000||packetInfo.phase!==view.phase)return false;
 const id=packetIdentity(scenario(),sim.duration);
 return id.revision===packetInfo.revision&&id.window_end_met_s===packetInfo.window_end_met_s&&id.order_study_days===packetInfo.order_study_days&&id.communications_tests===packetInfo.communications_tests;
}
function refreshPacketBadge(){
 if(!packetInfo)return;
 const badge=$('export-state');badge.hidden=false;badge.textContent=packetIsCurrent()?'Ready':'Previous PDR';
}
function readyCard(key,title){
 const f=preparedFile(key);if(!f)return '';
 const prior=key==='pdr'&&!packetIsCurrent();
 if(prior)title='Download previous PDR';
 return `<div class="ready-card"><div><span class="guideflag">${prior?'PREVIOUS SNAPSHOT · OUT OF DATE':'FILE READY'}</span><strong>${esc(f.name)}</strong><small>${esc(f.detail)}</small></div><div class="ready-actions">${fileLink(key,title)}${typeof window.showSaveFilePicker==='function'?`<button class="btn" data-save-file="${key}">Save as…</button>`:''}</div></div>`;
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
 open('Export & import',(preparedFile('pdr')?readyCard('pdr','Download PDR ZIP'):'')+(packetJob?'<div class="callout" id="auditprogress">'+esc(packetMessage||auditStatus||'Preparing the quantitative PDR…')+'</div>':tile('pdr',preparedFile('pdr')?'Prepare PDR for current design and window':'Prepare quantitative PDR','Integrate every mission day, assemble the engineering review, then save the finished ZIP.','package'))+'<div class="direct-exports">'+fileLink('json','Download design JSON')+fileLink('csv','Download telemetry CSV')+'</div>'+(isEditable(view.phase)?tile('import','Import a design','Load a scenario JSON or quantitative PDR ZIP.','upload'):'')+tile('bundle','Prepare static site ZIP','Bundle the complete application and local assets for self-hosting.','folder-down')+(preparedFile('bundle')?readyCard('bundle','Download static site ZIP'):'')+'<div class="model-footnote">Exports are assembled locally from the selected design.</div>','export');
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
   packetInfo=packetIdentity(chosen,target.duration);
   const revision=packetInfo.revision,windowLabel=time(start)+' to '+time(start+span);
   retainFile('pdr',blob,'ODC-01-PDR-'+revision+'-window-'+Math.round(start)+'-at-'+Math.round(chosen.view.t)+'.zip',designLabel+' · revision '+revision+' · window '+windowLabel+' · snapshot '+time(chosen.view.t));
   refreshPacketBadge();
   if(modal==='audit'||modal==='export')readyDialog('pdr','Download PDR ZIP');else toast('PDR ready. Open Export to download it.');
  }catch(err){if(exporting){if(modal==='audit'||modal==='export')showExportError(err);else toast('PDR preparation stopped: '+err.message)}else if(modal==='audit'){if(err.name==='AbortError')close();else open('Sweep stopped','<p>'+esc(err.message)+'</p>','auditerror')}}
 }
 if(!exporting)return prepare();
 packetJob=prepare().finally(()=>{packetJob=null;packetMessage='';packetOrderAbort=null});return packetJob;
}


function auditResult(a){open('Chronological mission results','<p>Computed from consecutive integration steps over '+fmt(a.days,0)+' mission days.</p>'+rowTable(['Result','Value'],[['Minimum battery charge',fmt(a.minSocPct)+'% at '+time(a.minSocTime)],['Maximum junction temperature',fmt(a.maxJunctionK)+' K at '+time(a.maxJunctionTime)],['Peak recorder queue',fmt(a.peakQueueGB)+' GB'],['Earth eclipses',fmt(a.eclipseCount||0)],['Ground passes',fmt(a.contactCount||0)],['Chemical burns',fmt(a.burnCount||0)],['Magnetic unloads',fmt(a.desatCount||0)],['Thermal coverage until first excursion',time(a.thermalQualifiedUntilS)],['First recorded mission limit / outcome',a.firstCrossing?esc(a.firstCrossing.limit)+' at '+time(a.firstCrossing.time):'No crossing within the analyzed period']].map(r=>tr(r)).join(''))+'<button class="btn export gap" data-action="pdr">'+icon('download',14)+' Download PDR package</button>','auditresults')}
function windowDialog(){open('Mission clock','<p>Select the start of any consecutive 86,400-second window or jump to an exact mission instant. Times use UTC.</p><div class="fieldgrid"><label class="fieldbox">Window start · UTC<input id="windowdate" class="forminput" type="datetime-local" step="1" value="'+liveDate(view.start).slice(0,19).replace(' ','T')+'"></label><label class="fieldbox">Cursor · seconds from launch<input id="cursortime" class="forminput" type="number" min="0" max="'+sim.duration+'" step="0.01" value="'+Number(view.t.toFixed(2))+'"></label></div><div class="chips gap"><button class="chip" data-action="bol">Beginning of life</button><button class="chip" data-action="midlife">Mid-mission day</button><button class="chip" data-action="eol">Final full day</button></div><div class="dialogrow gap"><button class="btn" data-action="gotime">Go to cursor</button><button class="btn export" data-action="setwindow">Apply window</button></div><div class="gap callout">'+(sim.audit?'Chronological mission integration complete.':'Fast mission preview uses representative days after day three. Run the chronological sweep to evaluate every day and retain extrema and event totals.')+'</div><button class="btn gap" data-action="audit">'+icon('activity',14)+(sim.audit?'See sweep results':'Run chronological sweep')+'</button>','window')}
function syncExpandedViewport(){
 const expanded=!!document.fullscreenElement||$('viewer').classList.contains('fallbackfull');
 const button=document.querySelector('[data-action="full"]');
 if(button){button.setAttribute('aria-label',expanded?'Exit expanded view':'Expand viewport');button.setAttribute('aria-pressed',String(expanded));button.title=expanded?'Exit expanded view · Escape':'Expand viewport';}
}
document.addEventListener('fullscreenchange',syncExpandedViewport);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('viewer').classList.contains('fallbackfull')){$('viewer').classList.remove('fallbackfull');syncExpandedViewport();}});
async function actions(a,el){switch(a){
 case 'ai-run-order':await runOrder();break;
 case 'ai-routes':await compareEarthRoutes();break;
 case 'ai-retry-day':landingReplay?.controller.abort();landingReplay=null;renderPurposePanels();updateReadout();break;
 case 'ai-cancel-order':orderJob?.abort();close();break;
 case 'ai-order-json':if(lastOrder?.model===sim){retainFile('ai-order',new Blob([JSON.stringify(lastOrder.value,null,2)],{type:'application/json'}),'ODC-Earth-order.json',aiPurposes[input.aiPurpose].label);readyDialog('ai-order','Download order study')}break;
 case 'ai-transfer':if(isEditable(view.phase))open('Model return budget',transferDesk(hardware),'ai-transfer');break;
 case 'cancelimpact':await settleImpact(false);break;case 'applyimpact':await settleImpact(true);break;
 case 'missionpatch':open('Orbital Data Center mission patch','<div class="patch-identity"><img src="./mission-patch.svg" width="255" height="255" alt="Four blue solar wings frame a gold compute core above Earth. A downlink reaches the surface."><p>Four solar wings surround the compute core. The gold downlink meets a circuit trace on Earth, where the customer receives the result.</p><div class="patch-downloads"><a class="btn" download href="./mission-patch.svg">Download vector patch</a><a class="btn" download href="./orbital-data-center-identity.zip">Download identity kit</a></div><p>The kit includes the full insignia, small icons and both splash screen orientations.</p></div>','missionpatch');break;
 case 'flightvectors':view.orbitVectors=!view.orbitVectors;syncVectorKey();checkpoint.save();break;
 case 'pointinglayer':togglePointing();break;
 case 'thermallayer':toggleThermal();break;
 case 'resetpreset':if(loadedPresets.some(p=>p.id===view.preset))return selectPoint(view.preset,true);if(input.referenceCenterId)return openReferenceStudy(input.referenceCenterId,true);if(view.preset==='starter'){const next=missionStarter(view.starterPurpose,view.starterContext||input);return reviewProposal(next,{mode:'installed',label:'Restore legacy starting spacecraft',force:true,wholeDesign:true,commit:resolved=>activateStudy(next,resolved,{preset:'starter'})})}await selectPoint(view.preset,true);break;
 case 'guideclose':$('guide-dialog').close();break;
 case 'mission-policy':{if(modal)close();goPage('mission');const tab=document.querySelector('[data-mb-tab="margins"]');tab?.click();tab?.focus({preventScroll:true});break}
 case 'tempbands':limitDialog();break;
 case 'thermal-audit':await thermalAudit();break;
 case 'phasecontrols':if(isEditable(view.phase))phaseControls();break;

 case 'diagramplay':toggleFlight(1);break;
 case 'domainfields':case 'hardware':if(isEditable(view.phase)){view.mode='size';a==='hardware'?params():phaseControls()}break;
 case 'instruments':view.detail=!view.detail;draw();break;
 case 'pinbaseline':view.tradeBase={...input};tradeCache=null;renderTrade(true);toast('Current design pinned for trade studies.');break;
 case 'missioncalc':await fullAudit();break;case 'comparemissions':await compareMissions();break;
 case 'retryflight':if(view.phase==='F'){if(sim.audit)return openPreparedCloseout(()=>{flightSyncError='';refreshSamples();draw()},{start:view.start,instant:view.t});prepareCloseout()}else prepareFlight();break;case 'flightplay':case 'flightreverse':toggleFlight(a==='flightreverse'?-1:1);break;
 case 'flightrestart':{const phase=view.phase,type={contact:'contact',reboost:'reboost',desat:'desat',operations:'burst'}[view.chapter];const current=events.find(e=>e.type===type&&view.t>=e.start&&view.t<=e.end);const t=phase==='F'?sim.ignition:current?.start??sim.story(view.chapter)?.start;setTime(t??DEPLOY_END_S);startFlight();break}
 case 'newpreset':if(modal)close();goPage('designs');break;case 'loadpreset':$('presetin').click();break;case 'savepreset':savePresetDialog();break;case 'commitpreset':storePreset();break;case 'managepresets':shelfDialog();break;
 case 'fairingcompare':fairingDialog();break;
 case 'presetshelf':goPage('designs');break;
 case 'coreview':if(modal)close();if(!['C','E','F'].includes(view.phase))switchPhase('C');chooseCamera('core');viewerInfo();break;
 case 'nav':toggleNavigation();break;
 case 'share':{playing=false;const url=new URL(location.href);url.hash='design='+encodeScenario(scenario());open('Share this design','<p>This link restores the installed hardware, solver, mission instant, selected view, and event. Recipients need access to this hosted site.</p><textarea class="fullwide" rows="4" id="shareurl" readonly aria-label="Shareable scenario URL">'+esc(url.href)+'</textarea><div class="dialogrow gap"><button class="btn" data-action="json">Download JSON</button><button class="btn export" data-action="copy">'+icon('clipboard-copy',14)+' Copy link</button></div>','share');break}
 case 'copy':try{await navigator.clipboard.writeText($('shareurl').value);toast('Design link copied.')}catch{$('shareurl').select();if(document.execCommand('copy'))toast('Design link copied.');else toast('Link selected. Use your browser’s copy command.')}break;
 case 'export':playing=false;exportMenu();break;case 'json':retainFile('json',scenarioBlob(scenario()),'ODC-01-scenario.json',designName(view));readyDialog('json','Download design JSON');break;case 'csv':refreshSamples(true);retainFile('csv',telemetryBlob(samples),'ODC-01-telemetry.csv',designName(view));readyDialog('csv','Download CSV');break;case 'import':if(isEditable(view.phase))$('filein').click();break;
 case 'bundle':{
  const job=foregroundWork,Zip=await zipLibrary(),zip=new Zip(),index=await fetch('./assets.json').then(r=>{if(!r.ok)throw Error('The site asset index is unavailable.');return r.json()}),files=[...index,'assets.json'];let loaded=0;
  job?.ui.stage(1,'Downloading the application and its local dependencies.');
  // Bounded parallel requests keep packaging responsive without flooding the connection.
  let cursor=0;await Promise.all(Array.from({length:Math.min(6,files.length)},async()=>{while(cursor<files.length){const name=files[cursor++],r=await fetch('./'+name);if(!r.ok)throw Error('Static asset unavailable: '+name);zip.file(name,await r.arrayBuffer());job?.ui.progress(++loaded,files.length,'Collected '+loaded+' of '+files.length+' site files.')}}));
  zip.file('README.txt','Serve this directory over HTTP or HTTPS with index.html at the root. All dependencies are included. No build, API keys or server-side processing are required. ES module scripts need an HTTP origin.');
  job?.ui.stage(2,'Compressing the complete application for download.');await yieldToPaint();
  const blob=await zip.generateAsync({type:'blob',mimeType:'application/zip',compression:'DEFLATE'},p=>job?.ui.progress(Math.round(p.percent),100,'Compressing archive · '+Math.round(p.percent)+'%.'));
  retainFile('bundle',blob,'orbital-data-center-static.zip','Static HTTP / HTTPS deployment');readyDialog('bundle','Download static site ZIP');break
 }
 case 'pdr':await fullAudit(true);break;case 'audit':if(sim.audit)auditResult(sim.audit);else await fullAudit();break;case 'cancelaudit':packetOrderAbort?.abort();auditAbort?.abort();close();break;
 case 'close':if(modal==='ai-working')orderJob?.abort();if(modal==='impact')await settleImpact(false);else close();break;case 'params':playing=false;params();break;case 'compare':compare();break;case 'events':playing=false;eventFilter=view.domain==='comm'?'contact':'all';eventList();break;case 'eventdetail':eventDetail();break;
 case 'findnext':{const type=eventFilter==='all'?(view.domain==='comm'?'contact':'all'):eventFilter;let found=null;for(let i=1;i<=30&&!found;i++){const t=view.start+i*DAY;if(t>=sim.duration)break;found=sim.events(t,Math.min(DAY,sim.duration-t)).find(e=>type==='all'||e.type===type)}if(found){selectEvent(found);break}toast('No matching event in the next 30 days within this mission.');break}
 case 'layers':open('Visualization layers','<p>Toggle vectors and dimensions in the vehicle view. Arrows encode direction; displayed beam widths are enlarged for visibility.</p><div class="chips">'+Object.entries(overlayNames).map(([k,l])=>'<button class="chip '+(effectiveLayers().includes(k)?'selected':'')+'" aria-pressed="'+effectiveLayers().includes(k)+'" data-layer="'+k+'">'+l+'</button>').join('')+'</div><div class="gap"><button class="btn" data-action="resetcam">'+icon('rotate-ccw',14)+' Reset camera</button></div>','layers');break;
 case 'resetcam':scene?.resetCamera();close();break;
 case 'full':{
  const viewer=$('viewer');
  if(document.fullscreenElement)await document.exitFullscreen();
  else if(viewer.classList.contains('fallbackfull'))viewer.classList.remove('fallbackfull');
  else{try{if(!viewer.requestFullscreen)throw Error('Fullscreen unavailable');await viewer.requestFullscreen();}catch{viewer.classList.add('fallbackfull');}}
  syncExpandedViewport();break;
 }
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
async function dispatchClick(e,el){try{
 if(el.dataset.previewReference){const id=el.dataset.previewReference;if(getReferenceCenter(id)){view.referencePreview=id;draw();document.querySelector('[data-preview-reference="'+CSS.escape(id)+'"]')?.focus({preventScroll:true});$('reference-detail')?.scrollIntoView({block:'start',behavior:'smooth'})}return}
 if(el.dataset.referenceMissionCase){view.referenceMissionCase=el.dataset.referenceMissionCase==='common'?'common':'source';draw();return}
 if(el.dataset.openReferenceCase)view.referenceMissionCase=el.dataset.openReferenceCase==='common'?'common':'source';
 if(el.dataset.compareReference){const id=el.dataset.compareReference;if(id==='all'){view.referenceCompared=[];draw();$('reference-comparison')?.scrollIntoView({block:'start',behavior:'smooth'});return}if(getReferenceCenter(id)){const selected=new Set(view.referenceCompared?.length?view.referenceCompared:referenceCenterOrder);if(selected.has(id)&&selected.size===1){toast('Keep at least one reference in the comparison.');return}selected.has(id)?selected.delete(id):selected.add(id);view.referenceCompared=[...selected];draw();document.querySelector('[data-compare-reference="'+CSS.escape(id)+'"]')?.focus({preventScroll:true})}return}
 if(el.dataset.openReference||el.dataset.restoreReference)return openReferenceStudy(el.dataset.openReference||el.dataset.restoreReference,!!el.dataset.restoreReference);
 if(el.dataset.referenceComparison!==undefined){goPage('designs');$('reference-comparison')?.scrollIntoView({block:'start',behavior:'smooth'});return}
 if(el.dataset.explainView!=null){
  const note=$('field-note');note.open=true;view.teachFolded=false;
  $('field-summary').focus({preventScroll:true});note.scrollIntoView({block:'start'});return;
 }
 if(el.dataset.followLesson!=null){
  const action=activeLesson?.action;if(!action)return;
  if(action.field&&controlByKey[action.field]){if(lock(action.field))openFieldGuide(action.field);else fieldEditor(action.field);return}
  if(action.domain&&Object.hasOwn(domains,action.domain))goPage(action.domain);
  if(action.chapter)return jumpGuide(action.chapter);
  else if(action.phase&&Object.hasOwn(phases,action.phase))return switchPhase(action.phase);
  return;
 }
 if(el.dataset.cvLocate!==undefined&&integrating()){selectBayLens('interface');$('viewer').scrollIntoView({block:'start'});return}
 if(el.dataset.rfPlay!==undefined){if(playing&&playDirection>0){playing=false;draw()}else{view.speed=1;startFlight()}return}
 if(el.dataset.rfFind!==undefined){$('rf-log').scrollIntoView({block:'center'});$('rf-log').querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});return}
 if(el.dataset.rfSelect||el.dataset.rfPage!==undefined){
  if(el.dataset.rfSelect){view.rfFilter=el.dataset.rfSelect;view.rfPage=0}
  else view.rfPage=Math.max(0,Math.floor(Number(el.dataset.rfPage)||0));
  refreshRadio();checkpoint.save();
  const selector=el.dataset.rfSelect?'[data-rf-select="'+view.rfFilter+'"]':'.rf-log-footer button:not([disabled])';
  $('rf-log').querySelector(selector)?.focus({preventScroll:true});return;
 }
 if(el.dataset.rfReplay!==undefined){
  const t=Number(el.dataset.rfReplay);if(!Number.isFinite(t))return;
  referencePage=null;view.phase=t<DEPLOY_START_S?'D':'E';view.domain='comm';view.camera='spacecraft';view.timelineFollow=false;view.mode='fly';view.speed=1;
  setTime(t);$('viewer').scrollIntoView({block:'start'});return;
 }
 if(el.dataset.rfPolicy!==undefined){goPage('comm');switchPhase('A');fieldEditor('link');return}
 if(el.dataset.compareMoment!=null&&eventStudy?.selected){
  const index=Number(el.dataset.compareMoment);if(!Number.isInteger(index)||index<0||index>2)return;
  view.teachEvent=eventStudy.selected.id;view.event={...eventStudy.selected};setTime(eventStudy.comparison.times[index],false);return;
 }
 if(el.dataset.guideKey){openFieldGuide(el.dataset.guideKey,el.dataset.guideOption);return}
 if(el.dataset.editInput){fieldEditor(el.dataset.editInput);return}
 if(el.dataset.clockTimeline!=null){
  const m=masterTimeline(sim),chosen=m.rows.find(r=>r.id===view.timelineRow);
  const row=flightCallAt(m,view.t,view.timelineFollow?chosen:null);
  if(row){view.timelineSegment='all';view.timelineRow=row.id;view.timelineAll=!row.major;}
  goPage('timeline');return;
 }
 if(el.dataset.nextMasterCall){
  const row=masterTimeline(sim).rows.find(r=>r.id===el.dataset.nextMasterCall);if(row)openTimelineEvent(row);return;
 }
 if(el.dataset.openPurpose){if(modal)close();view.purposePreview=isEditable(view.phase)&&Object.hasOwn(aiPurposes,el.dataset.openPurpose)?el.dataset.openPurpose:null;goPage('compute');return}
 if(el.dataset.previewPurpose){if(isEditable(view.phase)&&Object.hasOwn(aiPurposes,el.dataset.previewPurpose)){view.purposePreview=el.dataset.previewPurpose;renderPurposePanels();$('purpose-host').querySelector('[data-preview-purpose="'+view.purposePreview+'"]')?.focus({preventScroll:true})}return}
 if(el.dataset.usePurpose){await usePurpose(el.dataset.usePurpose,false);return}
 if(el.dataset.provisionPurpose){await usePurpose(el.dataset.provisionPurpose,true);return}
 if(el.dataset.studyPurpose){comparePurposes(el.dataset.studyPurpose);return}
 if(el.dataset.artifactCase){if(isEditable(view.phase))open('Model return budget',transferDesk(hardware,el.dataset.artifactCase==='trillion'),'ai-transfer');return}
 if(el.dataset.flightLoop&&Object.hasOwn(flightLoops,el.dataset.flightLoop)){
  view.flightLoop=el.dataset.flightLoop;scene?.setControlLoop?.(view.flightLoop);scene?.update(hardware,snap);const host=$('discipline-host');
  host.querySelectorAll('[data-flight-loop]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.flightLoop===view.flightLoop)));
  renderDiscipline(true);checkpoint.save();return;
 }
 if(el.dataset.inspectBay){view.domain='prop';switchPhase('C');return}
 if(el.dataset.gyroCase!==undefined&&isEditable(view.phase)){
  const next=gyroCandidateDesign(input,el.dataset.gyroCase,hardware);if(next)await reviewProposal(next,{label:'Change control moment gyroscope package',force:true,commit:resolved=>{input=next;view.modified=true;view.event=null;playing=false;recalc(resolved);draw()}});return;
 }
 if(el.dataset.studyTrays!=null&&isEditable(view.phase)){
  const count=hardware.rackLayout.capacity;
  if(count>input.trayCount&&count<=controlByKey.trayCount.max){
   const next={...input,trayCount:count};
   await reviewProposal(next,{mode:'installed',label:'Study '+count+' installed trays',force:true,commit:resolved=>{input=next;view.solve='installed';view.modified=true;view.event=null;playing=false;recalc(resolved);draw()}});
  }
  return;
 }
 if(el.dataset.inspectMounts!=null){view.domain='mechanical';view.bayLens='endOn';jumpGuide('integration');window.scrollTo({top:0,behavior:'instant'});return}
 if(el.dataset.watchLoading!=null){referencePage=null;view.domain='launcher';view.bayLens='overview';jumpGuide('integration');window.scrollTo({top:0,behavior:'instant'});return}
 if(el.dataset.padOpen!=null){openLaunchPad();return}
 if(el.dataset.padPanel!=null){$('pad-systems')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return}
 if(el.dataset.padConnection){
  const id=el.dataset.padConnection;if(!launchUmbilicalDesign(hardware).connections.some(c=>c.id===id))return;
  view.padConnection=id;scene?.setPadConnection?.(id);scene?.update(hardware,snap);refreshLaunchPad();checkpoint.save();return;
 }
 if(el.dataset.padInspect!=null){
  const id=el.dataset.padInspect||view.padConnection;if(id&&!launchUmbilicalDesign(hardware).connections.some(c=>c.id===id))return;
  openLaunchPad(id,'services');return;
 }
 if(el.dataset.padSeek!=null){
  const t=Number(el.dataset.padSeek);if(!Number.isFinite(t)||t< -600||t>DEPLOY_START_S)return;
  if(view.phase!=='D'||referencePage)openLaunchPad(view.padConnection,'services');
  view.camera='launch';setTime(t);return;
 }
 if(el.dataset.padPlay!=null){
  if(view.phase!=='D'||referencePage)openLaunchPad(view.padConnection,'services');
  if(playing){playing=false;draw();return}
  if(view.t< -600||view.t>=35)setTime(-20);
  view.speed=1;view.camera='launch';startFlight();return;
 }
 if(el.dataset.processingOperation){selectProcessingOperation(el.dataset.processingOperation);return}
 if(el.dataset.processingPanel!=null){$('ground-processing').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return}
 if(el.dataset.processingPlay!=null){toggleProcessing();return}
 if(el.dataset.processingReset!=null){pauseProcessing(false);view.processingProgress=0;refreshProcessing();checkpoint.save();return}
 if(integrating()&&el.dataset.loadingAt!=null){const t=Number(el.dataset.loadingAt);if(INTEGRATION_TIMES.includes(t)&&t<=loadingEnd(hardware)){view.camera='launch';if(view.bayLens!=='payload')view.bayLens='overview';setTime(t)}return}
 if(integrating()&&el.dataset.loadingPlay!=null){
  const direction=el.dataset.loadingPlay==='reverse'?-1:1,end=loadingEnd(hardware);
  if(playing&&playDirection===direction){playing=false;draw();return}
  if(direction>0&&(view.t>=end||view.t===INTEGRATION_TIMES[0])){
   setTime(end===INTEGRATION_TIMES[1]?INTEGRATION_TIMES[0]:INTEGRATION_TIMES[1]);view.speed=120;
  }else if(direction<0&&view.t>end)setTime(end);
  if(view.bayLens!=='payload')view.bayLens='overview';view.camera='launch';loadingPlayback=true;startFlight(direction);return;
 }
 if(el.dataset.spacecraftFocus&&['core','entire'].includes(el.dataset.spacecraftFocus)&&!$('spacecraft-focus').hidden){
  view.spacecraftFocus=el.dataset.spacecraftFocus;syncLighting();checkpoint.save();return;
 }
 if(el.dataset.lighting&&['auto','realistic','studio'].includes(el.dataset.lighting)&&!$('orbit-lighting').hidden){
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
 if(el.dataset.pdrOpenDomain){referencePage=null;view.phase='B';view.domain=el.dataset.pdrOpenDomain;draw();window.scrollTo({top:0,behavior:'instant'});return}
 if(el.dataset.domain){goPage(el.dataset.domain);return}
 if(el.dataset.disposalMethod){if(view.phase==='A')await changeParam('disposalMethod',el.dataset.disposalMethod,true);return}
 if(el.dataset.presetDownload){const p=loadedPresets.find(x=>x.id===el.dataset.presetDownload);if(p)presetDownload(p);return}
 if(el.dataset.presetUnload){const id=el.dataset.presetUnload;commitShelf(loadedPresets.filter(p=>p.id!==id));if(view.preset===id){view.preset='custom';view.modified=true}draw();shelfDialog();return}
 if(el.dataset.useLauncher){await useLauncher(el.dataset.useLauncher);return}
 if(el.dataset.saveFile){try{await saveWithPicker(el.dataset.saveFile);toast('File saved.')}catch(err){if(err.name!=='AbortError')toast(err.message)}return}
 if(el.dataset.thermalInstant){const t=Number(el.dataset.thermalInstant);if(Number.isFinite(t)){if(modal)close();view.phase='C';view.event=null;view.t=clamp(t,-3600,sim.duration);view.chapter='operations';view.start=dayStart(view.t);view.camera=['radiator','enclosure'].includes(view.thermalNode)?'spacecraft':'core';view.overlays=[...new Set([...view.overlays,'thermal'])];refreshSamples();draw()}return}
 if(el.dataset.adoptRating){if(!isEditable(view.phase))return;const key=el.dataset.adoptRating,field=boundFields.find(b=>b.key===key),summary=view.thermalScope==='mission'?sim.audit?.thermal:activeThermalWindow();const derived=requirementResults(view,summary,hardware.input).find(r=>r.key===field?.key);if(derived?.status==='derived'){await updateRating(key,derived.valueK,()=>{const next={...view.thermalTargets};delete next[key];view.thermalTargets=next})}return}
 if(el.dataset.phase)return switchPhase(el.dataset.phase);
 if(el.dataset.launchSurroundings!=null){openLaunchPad(null,'surroundings');return}
 if(el.dataset.watchLiftoff!=null){referencePage=null;view.domain='launcher';view.phase='D';view.camera='launch';view.launchLens='wide';view.speed=1;setTime(-8);window.scrollTo({top:0,behavior:'instant'});return}
 if(el.dataset.page==='launch-design'){view.domain='launcher';switchPhase('A');return}
 if(el.dataset.launchAlignReview!=null){view.domain='launcher';switchPhase('C');return}
 if(el.dataset.matchLaunch!=null&&isEditable(view.phase)){
  const next={...input,...siteApproach(hardware.input).angles};await reviewProposal(next,{label:'Align the insertion orbit with this site and launch epoch',force:true,commit:resolved=>{input=next;view.modified=true;playing=false;view.event=null;recalc(resolved);draw()}});return
 }
 if(el.dataset.launchTime!=null&&view.phase==='D'){const t=Number(el.dataset.launchTime);if(Number.isFinite(t)){view.speed=1;view.camera='launch';setTime(t)}return}
 if(el.dataset.launchLens&&view.phase==='D'){view.launchLens=['base','pad','site','surroundings','services','ship','fairing','engines'].includes(el.dataset.launchLens)?el.dataset.launchLens:'wide';view.camera='launch';draw();return}
 if(el.dataset.attitudeFlight!=null){view.domain='attitude';jumpGuide('operations');return}
 if(el.dataset.attitudeTime!=null){setTime(Number(el.dataset.attitudeTime));return}
 if(el.dataset.disposalTime){playing=false;setTime(Number(el.dataset.disposalTime));view.phase='F';view.chapter='deorbit';draw();return}
 if(el.dataset.design){await selectPoint(el.dataset.design);return}
 if(el.dataset.deploymentLens){
  view.deploymentLens=el.dataset.deploymentLens;chooseCamera('spacecraft');scene?.setDeploymentLens?.(view.deploymentLens);renderObservation();return;
 }
 if(el.dataset.deployAt!==undefined||el.dataset.deployStep!==undefined){
  const t=el.dataset.deployAt!==undefined?deploymentMET(Number(el.dataset.deployAt),hardware):nextDeploymentTime(snap.deployment,Number(el.dataset.deployStep),hardware);
  setTime(t);return;
 }
 if(el.dataset.chapter)return jumpGuide(el.dataset.chapter);
 if(el.dataset.action){await actions(el.dataset.action,el);return}
 if(el.dataset.page){goPage(el.dataset.page);if(el.dataset.page==='materials'&&el.dataset.materialId)focusMaterial($('subsystem'),el.dataset.materialId);return}
 if(el.dataset.camera){chooseCamera(el.dataset.camera);scene?.update(hardware,snap);viewerInfo();checkpoint.save();return}
 if(el.dataset.mode){if(el.dataset.mode==='fly'&&view.mode==='size'&&view.solve!=='installed'){input={...hardware.input};view.solve='installed';recalc()}view.mode=el.dataset.mode;draw();return}
 if(el.dataset.scope){view.scope=el.dataset.scope;refreshSamples();draw();return}
 if(el.dataset.layer){const k=el.dataset.layer;if(k==='thermal'||k==='pointing'){if(k==='thermal')toggleThermal();else togglePointing();el.setAttribute('aria-pressed',String(effectiveLayers().includes(k)));el.classList.toggle('selected',effectiveLayers().includes(k));return}view.overlays=view.overlays.includes(k)?view.overlays.filter(v=>v!==k):[...view.overlays,k];el.classList.toggle('selected');el.setAttribute('aria-pressed',String(view.overlays.includes(k)));scene?.setOverlays(effectiveLayers());syncThermalToggle();return}
 if(el.dataset.preset){await changeParam(el.dataset.preset,el.dataset.id,true);return}
 const target=e.target.closest('[data-event],[data-inspect]');if(target?.dataset.event){selectEvent(events.find(v=>v.id===target.dataset.event));return}if(target?.dataset.inspect){inspect(target.dataset.inspect);return}
 if(el.classList.contains('tracks')||el.dataset.chart){const box=el.getBoundingClientRect(),t=plotStart+clamp((e.clientX-box.left)/box.width,0,1)*(plotEnd-plotStart);
 const ei=e.target.closest('[data-ei]');if(el.classList.contains('tracks')&&!ei&&view.scope!=='mission'){const lane=(e.clientY-box.top)/box.height*45,match=activeEvents().find(v=>t>=v.start&&t<=v.end&&(lane>20?v.type==='contact':v.type==='eclipse'));if(match){selectEvent(match,false);return}}
 if(ei){selectEvent(activeEvents()[Number(ei.dataset.ei)],false);return}playing=false;setTime(t);return}
 }catch(err){if(foregroundWork)throw err;toast(err.message||'The requested operation could not be completed.');console.error(err)}}
document.addEventListener('click',async e=>{
 const el=e.target.closest('button,[data-chart],[data-event],[data-inspect],.tracks');if(!el||el.closest('#work-status'))return;
 if(foregroundWork)return;
 const spec=clickWorkSpec(el);
 if(spec)return runWork(spec,()=>dispatchClick(e,el),el);
 return dispatchClick(e,el);
});
document.addEventListener('input',e=>{if(foregroundWork)return;const el=e.target;
 if(el.dataset.processingSeek!=null&&integrating()&&groundProcessingEnabled(snap)){
  const progress=clamp(el.valueAsNumber/100,0,1),switchStation=!processingMatchesStation();
  if(switchStation)selectProcessingOperation(view.processingOperation);
  pauseProcessing(false);view.processingProgress=progress;refreshProcessing();
  if(switchStation)$('ground-processing')?.querySelector('[data-processing-seek]')?.focus({preventScroll:true});
  return;
 }
 if(el.id==='loading-cursor'&&integrating()){
  pauseProcessing(false);
  playing=false;loadingPlayback=false;view.t=clamp(el.valueAsNumber,INTEGRATION_TIMES[0],loadingEnd(hardware));
  snap=sim.at(view.t);refreshProcessing();scene?.update(hardware,snap);viewerInfo();refreshLoadingPlayer(document,hardware,snap,false);return;
 }
 if(el.id==='deploy-cursor'){
  playing=false;view.t=clamp(DEPLOY_START_S+el.valueAsNumber,DEPLOY_START_S,DEPLOY_END_S);snap=sim.at(view.t);
  scene?.update(hardware,snap);viewerInfo();refreshLesson();refreshCommissioning(document,hardware,snap);
  renderObservation();return;
 }if(el.id==='field-filter'){const v=el.value.toLowerCase().trim();document.querySelectorAll('[data-query]').forEach(b=>b.hidden=!b.dataset.query.includes(v));return}if(el.id==='ad-seek'){playing=false;seekFlightCursor(el.valueAsNumber);return}if(el.id==='flight-cursor'){playing=false;const [a,b]=flightRange(),t=a+(b-a)*el.valueAsNumber/10000;seekFlightCursor(t);return}if(el.matches('input[type=range][data-param]')){const v=el.valueAsNumber;el.style.setProperty('--pct',100*(v-el.min)/(el.max-el.min)+'%');const number=el.closest('.fieldbox,.qrow')?.querySelector('input[type=number]');if(number){number.value=String(v);number.style.width=Math.max(24,String(v).length*7+7)+'px'}}});
async function dispatchChange(e){const el=e.target;try{
 if(el.dataset.processingSeek!=null){checkpoint.save();return}
 if(el.id==='event-choice'){
  const event=eventStudy?.available.find(e=>e.id===el.value);if(event)selectEvent(event,false);return;
 }
 if(el.id==='camera-exposure'&&!$('orbit-lighting').hidden){view.exposureEV=cameraExposure(el.value);syncLighting();checkpoint.save();return}
 if(el.dataset.param){if(!isEditable(view.phase))return;const val=el.tagName==='SELECT'?el.value:el.valueAsNumber;if(typeof val==='number'&&!Number.isFinite(val))return;await changeParam(el.dataset.param,val,true);return}
 if(el.id==='loading-cursor'||el.id==='ad-seek'){setTime(el.valueAsNumber);return}
 if(el.id==='flight-cursor'){const [start,end]=flightRange();setTime(start+(end-start)*el.valueAsNumber/10000);return}
 if(el.id==='diagram-thermal-scale'){view.thermalScale=el.value==='full'?'full':'working';scene?.setThermalScale?.(view.thermalScale);renderDiagram();return}
 if(el.dataset.rating){await updateRating(el.dataset.rating,el.valueAsNumber);return}
 if(el.dataset.boundRole){if(!isEditable(view.phase))return;view.modified=true;view.thermalTargets={...view.thermalTargets};if(el.value==='derive')view.thermalTargets[el.dataset.boundRole]='derive';else delete view.thermalTargets[el.dataset.boundRole];limitDialog();return}
 if(el.id==='thermal-node'){view.thermalNode=el.value;limitDialog();return}
 if(el.id==='thermal-scope'){if(!isEditable(view.phase))return;view.modified=true;view.thermalScope=el.value;limitDialog();return}
 if(el.id==='ai-study-days'){if(isEditable(view.phase)&&[0,1,7,30,60,90].includes(+el.value))view.studyDays=+el.value;return}
 if(el.id==='trade-key'){view.tradeKey=el.value;renderTrade(true);return}
 if(el.id==='flight-rate'){view.speed=Number(el.value);return}
 if(el.id==='guidelauncher'){await useLauncher(el.value);return}
 if(el.id==='solve'||el.id==='quicksolve'||el.id==='phase-solve'){if(!isEditable(view.phase)||!Object.hasOwn(solveModes,el.value))return;const mode=el.value;await reviewProposal(input,{mode,label:'Sizing method · '+solveModes[mode],commit:resolved=>{view.modified=true;view.solve=mode;view.event=null;recalc(resolved);draw()}})}
 if(el.id==='epoch'){await changeParam('epoch',new Date(el.value+'Z').toISOString(),true)}
 if(el.id==='speed')view.speed=Number(el.value);if(el.id==='eventfilter'){eventFilter=el.value;eventList()}if(el.id==='category')compare(el.value);
 }catch(err){if(foregroundWork)throw err;toast(err.message)}}
document.addEventListener('change',async e=>{
 if(foregroundWork)return;const el=e.target;
 const review=el.dataset.param||el.dataset.rating||['solve','quicksolve','phase-solve','guidelauncher','epoch'].includes(el.id);
 const costly=review||el.dataset.boundRole||['trade-key','category','thermal-node','thermal-scope','loading-cursor','ad-seek','flight-cursor'].includes(el.id);
 if(!costly)return dispatchChange(e);
 const spec=review?reviewWorkSpec('Checking the selected requirement or hardware input.'):{title:'Updating engineering results',detail:'Preparing the selected comparison, mission interval and design assessment.'};
 return runWork(spec,()=>dispatchChange(e),el);
});
$('filein').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f||!isEditable(view.phase))return;return runWork({...reviewWorkSpec('Reading '+f.name+' and checking the saved configuration.'),title:'Importing mission design'},async job=>{
 const o=await restoreFile(f);if(o?.schema!=='odc-scenario/1'||!o.design)throw Error('Choose a saved scenario or PDR package.');
 if(job.signal.aborted)throw new DOMException('Calculation cancelled','AbortError');
 const next=sizeDesign(o.design).input,mode='installed';
 await reviewProposal(next,{mode,label:'Import scenario · '+f.name,force:true,commit:()=>{loadScenario(o);recalc();scene?.setThermalScale?.(view.thermalScale);if(view.cameraStates)scene?.setCameraState?.(view.cameraStates);if(modal)close();draw();if(view.phase==='E')prepareFlight();else if(view.phase==='F')prepareCloseout();toast('Design imported.')}});
 })};
$('dialog').addEventListener('cancel',e=>{if(modal==='impact'){e.preventDefault();settleImpact(false)}else if(modal==='ai-working')orderJob?.abort()});
document.addEventListener('toggle',e=>{if(e.target.id==='field-note')view.teachFolded=!e.target.open;if(e.target.matches?.('.bay-basis'))view.bayBasis=e.target.open;if(e.target.matches?.('.bay-time'))view.bayClock=e.target.open},true);
document.addEventListener('keydown',e=>{if(e.target.classList.contains('tracks')&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();return runWork({title:'Evaluating mission time',detail:'Updating the selected spacecraft state and its engineering results.'},()=>{playing=false;setTime(view.t+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?60:1))},e.target)}});
$('scrim').onclick=closeMobileNavigation;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mobileNavigation.matches&&document.body.classList.contains('navshow')&&!$('dialog').open&&!document.fullscreenElement&&!document.body.dataset.workspaceResizing){e.preventDefault();closeMobileNavigation()}});
$('dialog').addEventListener('close',()=>{if(!$('dialog').open)modal=null});$('dialog').onclick=e=>{if(e.target===$('dialog')&&e.clientX<$('dialog').getBoundingClientRect().left){if(modal==='impact')settleImpact(false);else close()}};
const dayStart=t=>windowStartFor(t,view.start,sim.duration);
function syncChapterToTime(s=sim.at(view.t)){view.chapter=view.phase==='F'||(s.disposalStatus&&s.disposalStatus!=='scheduled'&&view.t>=sim.ignition)?'deorbit':view.t< -600?'integration':view.t<0?'pad':view.t<540?'ascent':(view.t<DEPLOY_START_S||view.phase==='D'&&view.t===DEPLOY_START_S)?'insertion':(view.t<DEPLOY_END_S||view.chapter==='commissioning'&&view.t===DEPLOY_END_S)?'commissioning':s.burnKind==='reboost'?'reboost':s.desat?'desat':s.station?'contact':'operations'}
function jumpGuide(id,run=false,prepared=false){
 if(id==='deorbit'&&!prepared)return openPreparedCloseout(()=>jumpGuide(id,run,true));
 view.timelineFollow=false;
 loadingPlayback=false;
 const c=chapters.find(x=>x.id===id);if(!c)return;
 playing=false;referencePage=null;const e=sim.story(id);
 if(!e||e.status==='unavailable'){toast(e?.reason||'No matching modeled event.');draw();return}
 view.phase=chapterPhase(id);view.chapter=id;view.event=null;if(id==='pad'||id==='ascent'||id==='insertion')view.speed=1;view.t=id==='pad'?-8:clamp(e.start??e.instant,-3600,sim.duration);view.camera=c.camera;view.start=dayStart(view.t);refreshSamples();snap=sim.at(view.t);draw();if(view.phase==='E')prepareFlight();else if(view.phase==='F')prepareCloseout();if(run)startFlight();if(id==='commissioning')window.scrollTo({top:0,behavior:'instant'})
}
function fairingDialog(){
 const rows=Object.entries(presets.launcher).map(([k,v])=>{const h=sizeDesign(applyPreset(hardware.input,'launcher',k)),f=h.fairing;return '<tr><td><strong>'+esc(v.label)+'</strong><small>'+esc(f.basis)+'</small></td><td>'+fmt(f.outerDiameterM,2)+' m</td><td>'+fmt(f.maxDiameterM,2)+' × '+fmt(f.heightM,2)+' m</td><td>'+plus(f.radialClearanceM)+' m</td><td>'+plus(f.axialClearanceM)+' m</td><td>'+(isEditable(view.phase)?'<button class="chip" data-use-launcher="'+k+'">Select</button>':k===hardware.input.launcher?'Selected launcher':'Comparison')+'</td></tr>'});
 const f=hardware.fairing;open('Payload fairing comparison','<p>The same folded vehicle is tested against each tapered profile. Margins include the configured payload motion allowances.</p>'+rowTable(['Launch option','Nominal Ø','Usable Ø × height','Radial margin','Axial margin',''],rows.join(''))+'<div class="guide-source"><strong>'+esc(hardware.launcherLabel)+'</strong><p>'+esc(f.note)+'</p><a href="'+esc(f.sourceUrl)+'" target="_blank" rel="noopener">Read the source '+icon('arrow-up-right',12)+'</a></div>'+vehicleDrawings(hardware),'fairings');
}
function useLauncher(key){if(isEditable(view.phase)&&presets.launcher[key]&&key!==input.launcher)return changeParam('launcher',key,true)}
function pointTip(el,e){
 const r=el.getBoundingClientRect(),i=Number.isFinite(e.clientX)?Math.round(clamp((e.clientX-r.left)/r.width,0,1)*(samples.length-1)):Math.floor(samples.length/2),s=samples[i];if(!s)return '';
 const card=el.closest('[data-metric]'),k=el.dataset.chart,l=card?.dataset.label||'Bus demand',unit=card?.dataset.unit||'kW';
 return time(s.t)+' · '+l+' '+fmt(k==='true'?s.loadKW:value(k,s),3)+' '+unit+'. Click to set the shared mission cursor.';
}


let editKey='',windowThermalCache=null;const diagramParts={};
function switchPhase(id,prepared=false){
 if(!Object.hasOwn(phases,id)||!referencePage&&id===view.phase)return;
 if(id==='F'&&!prepared)return openPreparedCloseout(()=>switchPhase(id,true));
 loadingPlayback=false;const fromLaunch=view.phase==='D'&&id==='E';
 if(modal)close();referencePage=null;view.timelineFollow=false;playing=false;pendingFlightSeek=null;flightSyncError='';view.phase=id;view.event=null;view.inspect=null;view.detail=false;view.mode=isEditable(id)?'size':'fly';closeMobileNavigation();
 if(id==='C'&&!view.tradeBase)view.tradeBase={...input};
 const phaseCase={D:'integration',E:fromLaunch?'commissioning':'operations',F:'deorbit'},stage=phaseCase[id];
 if(stage){const e=sim.story(stage);view.chapter=stage;view.t=(fromLaunch||id==='D'||id==='F'?e.start:e.instant)??e.instant??view.t}
 else if(view.t<DEPLOY_END_S||view.t>=sim.ignition){view.chapter='operations';view.t=sim.story('operations').instant||1250}
 view.camera=fromLaunch?'spacecraft':id==='D'?'launch':recommendedCamera(id,view.domain);
 view.start=dayStart(view.t);refreshSamples();if(id==='E')playDirection=1;if(id==='E')playing=!fromLaunch&&!matchMedia('(prefers-reduced-motion: reduce)').matches;lastTick=performance.now();draw();if(id==='E')prepareFlight();else if(id==='F')prepareCloseout();window.scrollTo({top:0,behavior:'instant'});
}
function syncThermalToggle(){const b=$('thermal-toggle'),on=effectiveLayers().includes('thermal');b?.setAttribute('aria-pressed',String(on));if(b)b.disabled=view.camera==='orbit'}

function activeThermalWindow(){
 if(windowThermalCache?.sim===sim&&windowThermalCache.start===view.start&&windowThermalCache.chronological===!!sim.audit)return windowThermalCache.summary;
 const summary=sim.thermalWindow(view.start,Math.min(DAY,sim.duration-view.start));windowThermalCache={sim,start:view.start,chronological:!!sim.audit,summary};return summary;
}
function limitDialog(){if(!isEditable(view.phase)){
 open('Thermal model range checks','<p>Modeled temperatures against carried operating and survival ratings at '+time(view.t)+'. Component capability and GEVS verification remain unassessed.</p>'+rowTable(['Component','Activity','Temperature','Carried rating','Model result'],snap.thermalQualification.map(q=>tr([esc(q.label),esc(q.activity),fmt(q.temperatureK,2)+' K',fmt(q.minK,1)+'–'+fmt(q.maxK,1)+' K',esc(q.status==='pass'?'In modeled range':q.status)])).join(''))+'<button type="button" class="textbutton gap" data-action="mission-policy">Mission policy ↗</button>','flight-limits');return}
 const summary=view.thermalScope==='mission'?sim.audit?.thermal:activeThermalWindow();open('Thermal limits & requirements',thermalInspector(view,hardware,snap,summary,time(view.t)),'limits')}
async function thermalAudit(){
 const target=sim;open('Checking modeled temperatures','<p>The chronological sweep compares each modeled temperature with the carried rating for its activity. This is analysis against study assumptions; hardware qualification and GEVS verification remain open.</p><div class="callout" id="auditprogress">Starting chronological analysis…</div><button class="btn gap" data-action="cancelaudit">Cancel sweep</button>','thermal-audit');
 try{await audit();if(sim===target&&modal==='thermal-audit')limitDialog();else toast('Chronological thermal results ready.')}catch(e){if(e.name!=='AbortError')open('Thermal analysis stopped','<p>'+esc(e.message)+'</p>','auditerror')}
}
function updateRating(key,v,after){if(!isEditable(view.phase)||!boundFields.some(b=>b.key===key)||!Number.isFinite(v))return;return changeParam(key,v,true,{force:true,after})}
function fieldEditor(key){if(!isEditable(view.phase))return;
 const c=controlByKey[key];if(!c)return;editKey=key;view.mode='size';
 const bound=boundFields.find(b=>b.key===key);if(bound){view.thermalNode=bound.id;limitDialog();return}
 open(c.label,'<p>'+esc(explainMetric('@'+key,c.label,c.unit))+'</p>'+inputRow(key)+'<div class="dialogrow gap"><button class="btn" data-action="params">All assumptions</button><button class="btn export" data-action="close">Done</button></div>','editfield');
}
function phaseControls(){
 if(!isEditable(view.phase))return;
 const keys=purposeDomainFields(view.domain,hardware.input).filter(k=>controlByKey[k]&&(k!=='disposalMethod'||view.phase==='A')),groups=groupDesignInputs(keys);
 const extra=view.domain==='orbit'?'<label class="fieldbox">Epoch · UTC <input type="datetime-local" id="epoch" class="forminput" step="1" value="'+esc(input.epoch.slice(0,19))+'"></label>':'';
 open(domains[view.domain].label+' configuration','<p>Mission changes evaluate the installed spacecraft. Hardware changes create a revised design.</p>'+Object.entries(groups).filter(([,rows])=>rows.length).map(([role,rows])=>'<section class="pdr-input-group"><h3>'+roleLabels[role]+'</h3><div class="fieldgrid">'+(role==='mission'?extra:'')+rows.map(k=>inputRow(k)).join('')+'</div></section>').join('')+'<div class="dialogrow gap"><button class="btn" data-action="params">All inputs & sizing proposals</button><button class="btn export" data-action="close">Done</button></div>','phasecontrols');
}
function renderDiagram(){const ctx={hardware,state:snap,day,events,service:['compute','conops'].includes(view.domain)?serviceFor(sim,view.start):null,selected:diagramParts[view.domain],thermalScale:view.thermalScale,qualificationWindow:view.domain==='thermal'?activeThermalWindow():undefined};updateSubsystemDiagram($('diagram-host'),view.domain,ctx)}
function sectionHeader(index,title,description,actions=''){return '<header class="phase-b-heading '+(index==='02'?'analysis-heading':'')+'"><span class="section-number">'+index+'</span><div><h2>'+title+'</h2>'+(description?'<p>'+esc(description)+'</p>':'')+'</div>'+actions+'</header>'}
function designSection(){const fields=purposeDomainFields(view.domain,hardware.input).filter(k=>controlByKey[k]&&k!=='disposalMethod'),ordered=[...new Set([...(quickMap[view.domain]||[]).filter(k=>fields.includes(k)),...fields])],groups=groupDesignInputs(ordered),preferred=[...groups.hardware.slice(0,2),...groups.mission.slice(0,2)],params=[...new Set([...preferred,...groups.hardware,...groups.mission])].slice(0,4);
 return sectionHeader('01','Preliminary design','','<div class="chips"><button class="btn" data-action="domainfields">Configure domain</button>'+(view.domain==='thermal'?'<button class="btn" data-action="tempbands">Component limits</button>':'')+'</div>')+'<div class="base-assumptions">'+params.map(k=>{const c=controlByKey[k],v=displaySetting(k,hardware.input[k]);return '<button class="chip" data-edit-input="'+esc(k)+'"><small>'+esc(roleLabels[inputRole(k)]+' · '+c.label)+'</small><b>'+esc(fmt(v))+' '+esc(c.unit||'')+'</b></button>'}).join('')+'</div>';
}
function diagramTools(){return sectionHeader('02','Analysis','Read the response of this design at the mission clock. Select a time or event to follow its effects.')+`<div class="diagram-toolbar"><div>${flightButtons(replayMotion(),'Run clock')}<button class="textbutton" data-action="window" id="diagram-clock">${esc(time(view.t))} ${icon('clock-3',13)}</button><button class="textbutton" data-action="events">Select event</button></div></div>`}
function updateDiagramClock(){if($('diagram-clock'))$('diagram-clock').textContent=time(view.t)}


function recommendedCamera(phase,domain){return recommendedDomainCamera(phase,domain)}
function effectiveLayers(){
 const layers=new Set(view.overlays);
 if(view.domain==='thermal'&&['C','D','E'].includes(view.phase)&&view.thermalAuto!==false)layers.add('thermal');
 if(['software','attitude','thermal'].includes(view.domain)&&view.pointingAuto!==false)layers.add('pointing');
 return [...layers];
}
function togglePointing(){
 const enabled=effectiveLayers().includes('pointing');
 view.overlays=view.overlays.filter(k=>k!=='pointing');view.pointingAuto=!enabled;
 if(!enabled&&!['software','attitude','thermal'].includes(view.domain))view.overlays.push('pointing');
 scene?.setOverlays(effectiveLayers());syncLighting();checkpoint.save();
}
function toggleThermal(){const was=effectiveLayers().includes('thermal');view.overlays=view.overlays.filter(k=>k!=='thermal');view.thermalAuto=!was;if(!was&&view.domain!=='thermal')view.overlays.push('thermal');scene?.setOverlays(effectiveLayers());syncThermalToggle()}
function currentContext(includeService=true){return {hardware,state:snap,sim,service:includeService&&view.phase!=='D'&&['compute','conops'].includes(view.domain)?serviceFor(sim,view.start):null,audit:sim.audit,day,events,samples:daySamples,windowStart:view.start,windowEnd:Math.min(sim.duration,view.start+DAY)}}
function bayTimeControls(){
 const rates=[1,10,30,120,600].map(rate=>`<option value="${rate}" ${view.speed===rate?'selected':''}>${rate}×</option>`).join('');
 return `<details class="bay-time panel" ${view.bayClock||view.detail?'open':''}><summary>Mission clock and engineering instruments</summary><div class="bay-playback">${flightButtons(replayMotion(),'Play launch preparation')}<label>Playback speed <select id="flight-rate">${rates}</select></label></div>${flightPlayer()}</details>`;
}
function renderObservation(){$('guidepanel').innerHTML=integrating()?bayGuide(hardware,snap,view):commissioning()?commissioningGuide(hardware,snap,view,replayMotion()):showLaunchDirector(view)?launchGuide(hardware,snap,view,replayMotion()):observationCard({...view,isPlaying:replayMotion()},currentContext(!lessonInRail()),time(view.t),lessonInRail());if(showLaunchDirector(view)&&!integrating())refreshLaunchGuide(document,hardware.input,snap)}
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
 const base=both?live:{hardware:b.base,service:['compute','conops'].includes(view.domain)?serviceFor(b.model,start):null,state:b.model.at(view.t),day:tradeCache.baseDay,events:[],sim:b.model,audit:b.model.audit,samples:tradeCache.baseSamples,windowStart:start,windowEnd:end};
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
 const item=loadedPresets.find(x=>x.id===id)||(reset&&presetList.find(x=>x.id===id));if(!item)return;
 return reviewProposal(item.design,{mode:'installed',label:(reset?'Restore ':'Open ')+item.name,force:true,wholeDesign:true,commit:resolved=>activateStudy(item.design,resolved,{preset:item.id,presetName:item.name,thermalTargets:item.thermalTargets,thermalScope:item.thermalScope,thermalPadding:item.thermalPadding,sizingProvenance:item.solver})});
}
function commitShelf(next){
 try{writeShelf(window.localStorage,next);loadedPresets=next;return true}
 catch{loadedPresets=next;return false}
}
function savePresetDialog(){
 const current=loadedPresets.find(p=>p.id===view.preset),name=(current?.name||designName({...view,modified:false},hardware))+' variant';
 open('Save design as',`<p>Save the customer mission, hardware, sizing choices and thermal requirements together. You can reopen the design here or download a portable copy.</p><div class="fieldgrid"><label class="fieldbox">Design name<input id="preset-name" class="forminput" maxlength="64" value="${esc(name.slice(0,64))}"></label><label class="fieldbox">Description<input id="preset-description" class="forminput" maxlength="320" placeholder="Mission purpose or design changes"></label></div><div class="callout gap">${esc(designName(view))} · ${fmt(hardware.itKw)} kW IT · ${input.disposalMethod==='graveyard'?'Graveyard orbit':'Targeted reentry'}</div><button class="btn export gap" data-action="commitpreset">Save copy and prepare JSON</button>`,'save-preset');
}
function storePreset(){
 const item=missionPreset({name:$('preset-name').value,description:$('preset-description').value,design:input,solver:view.solve,thermalTargets:view.thermalTargets,thermalPadding:view.thermalPadding,thermalScope:view.thermalScope}),added=addToShelf(loadedPresets,item);
 const persisted=commitShelf(added.shelf);view.preset=added.record.id;view.presetName=added.record.name;view.modified=false;draw();presetDownload(added.record,persisted?'Saved to your designs.':'Loaded for this session. Browser storage is unavailable. Download the JSON to keep this design.');
}
function presetDownload(p,detail='Saved mission design'){
 retainFile('preset',new Blob([JSON.stringify(p,null,2)],{type:'application/json'}),presetFileName(p.name),detail);readyDialog('preset','Download design file');
}
function shelfDialog(){
 const rows=loadedPresets.map(p=>{
  const current=p.id===view.preset&&!view.modified;
  return '<div class="manage-row"><div><strong>'+esc(p.name)+'</strong><small>'+esc(aiPurposes[p.design.aiPurpose||'text'].label)+(p.description?' · '+esc(p.description):'')+'</small></div><button class="chip" data-design="'+esc(p.id)+'" '+(current?'disabled':'')+'>'+(current?'Open now':'Open design')+'</button><button class="chip" data-preset-download="'+esc(p.id)+'">Download JSON</button><button class="chip" data-preset-unload="'+esc(p.id)+'">Unload</button></div>';
 }).join('');
 open('Saved designs',(rows||'<p>Your named designs will appear here. Save the current mission or import a design file to get started.</p>')+'<div class="dialogrow gap"><button class="btn" data-action="loadpreset">Import design file</button><button class="btn" data-action="savepreset">Save current design as…</button></div>','preset-shelf');
}
$('presetin').onchange=async e=>{
 const files=Array.from(e.target.files||[]);e.target.value='';if(!files.length)return;
 return runWork({...reviewWorkSpec('Reading saved designs and checking the selected configuration.'),title:'Importing saved design'},async job=>{let current=loadedPresets,last;for(const f of files){if(f.size>750000)throw Error('Choose a preset JSON under 750 kB.');const added=addToShelf(current,parsePreset(await f.text()));current=added.shelf;last=added.record;if(job.signal.aborted)throw new DOMException('Calculation cancelled','AbortError')}
  await reviewProposal(last.design,{mode:'installed',label:'Import design · '+last.name,force:true,wholeDesign:true,commit:async resolved=>{const persisted=commitShelf(current);await activateStudy(last.design,resolved,{preset:last.id,presetName:last.name,thermalTargets:last.thermalTargets,thermalScope:last.thermalScope,thermalPadding:last.thermalPadding,sizingProvenance:last.solver});toast(persisted?'Saved designs imported.':'Loaded in this session. Browser storage is unavailable.')}});
 });
};
function flightRange(){
 if(view.phase==='D')return [-3600,DEPLOY_START_S];if(view.phase==='F'){const p=sim.disposal();return [p?.start??sim.ignition,p?.end??sim.duration]}
 return [Math.max(DEPLOY_START_S,view.start),Math.min(view.start+DAY,sim.ignition)];
}
function flightPlayer(){
 const [start,end]=flightRange(),pc=clamp((view.t-start)/(end-start||1),0,1),status=view.phase==='E'?(sim.audit?'Chronological mission complete':flightSyncError?'Mission integration interrupted':auditStatus||'Chronological flight · resolving mission'):view.phase==='F'?(flightSyncError?'Chronological disposal integration interrupted':sim.audit?'Chronological disposal solution':'Preview · '+(auditStatus||'resolving preceding mission')):'Mission elapsed time';
 return `<section class="flightdeck"><div class="flight-clock"><span class="guideflag">${view.phase==='E'?'FLIGHT DIRECTOR':'MISSION CLOCK'}</span><b id="live-met">${time(view.t)}</b><span id="flight-verification">${esc(status)}</span></div><input aria-label="Scrub modeled flight time" id="flight-cursor" type="range" min="0" max="10000" step="1" value="${Math.round(pc*10000)}" style="--pct:${pc*100}%"><div class="flight-deck-tools"><button class="chip" data-action="window">Time window</button><button class="chip" data-action="events">Event ledger</button><button class="chip" data-action="instruments">${view.detail?'Hide':'Show'} instruments</button>${flightSyncError?'<button class="chip" data-action="retryflight">Retry integration</button>':''}</div></section>`;
}
function prepareFlight(){
 if(view.phase!=='E'||sim.audit||commissioning()&&!pendingFlightSeek)return;
 // The core integrates the initial 60 days sequentially. Late seeks wait for verified daily seeds.
 if(snap.projected||view.t>=60*DAY){
  pendingFlightSeek??={t:view.t,start:view.start};view.t=sim.story('operations').instant||3438;view.start=dayStart(view.t);refreshSamples();snap=sim.at(view.t);draw();
 }
 const owner=sim;flightSyncError='';
 audit().then(()=>{if(sim!==owner||view.phase!=='E')return;if(pendingFlightSeek){const {t,start}=pendingFlightSeek;pendingFlightSeek=null;setTime(t,true,start)}else draw()}).catch(err=>{if(sim!==owner||view.phase!=='E'||err.name==='AbortError')return;flightSyncError=err.message;playing=false;draw();toast(err.message)});
}
async function openPreparedCloseout(commit,{job=foregroundWork,start,instant=sim.ignition,scope=view.scope}={}){
 if(!job)return runWork(closeoutWorkSpec(),owner=>openPreparedCloseout(commit,{job:owner,start,instant,scope}));
 const owner=sim,visit=closeoutVisit,windowStart=start??windowStartFor(owner.ignition,view.start,owner.duration);
 const check=()=>{if(job.signal.aborted||owner!==sim||visit!==closeoutVisit)throw new DOMException('Decommissioning preparation cancelled','AbortError')};
 job.ui.setCancelable(()=>job.controller.abort());
 const prepared=await owner.prepareDisposal({start:windowStart,instant,scope,signal:job.signal,onProgress:progress=>{
  if(owner!==sim||job.signal.aborted)return;
  const stage=progress.stage==='disposal'?1:progress.stage==='window'?2:0;
  job.ui.stage(stage,progress.detail);
  if(Number.isFinite(progress.completed)&&Number.isFinite(progress.total))job.ui.progress(progress.completed,progress.total,progress.detail);
 }});
 check();job.ui.stage(2,'Updating the mission clock, engineering results and decommissioning graphics.');
 await yieldToPaint();check();
 // An existing chronological sweep may finish while the preview worker runs.
 // Use the new accepted history before committing this view if that happens.
 if(prepared.chronological!==!!owner.audit)return openPreparedCloseout(commit,{job,start:windowStart,instant,scope});
 job.ui.setCancelable(null);
 return commit();
}
function prepareCloseout(){
 if(view.phase!=='F'||sim.audit)return;const owner=sim,preview=sim.disposal();flightSyncError='';
 return audit().then(async()=>{
  if(owner!==sim||view.phase!=='F')return;
  const prior=view.t,now=sim.disposal(),fraction=clamp((prior-preview.start)/Math.max(1,preview.end-preview.start),0,1);
  const instant=now.start+(now.end-now.start)*fraction,start=windowStartFor(instant,view.start,owner.duration);
  await owner.prepareDisposal({start,instant,scope:view.scope});
  if(owner!==sim||view.phase!=='F'||view.t!==prior)return;
  view.t=instant;view.start=start;refreshSamples();draw();
 }).catch(err=>{if(err.name!=='AbortError'&&owner===sim&&view.phase==='F'){flightSyncError=err.message;playing=false;draw();toast(err.message)}})
}
function toggleFlight(direction){
 if(playing&&direction===playDirection){playing=false;draw();return}
 loadingPlayback=false;startFlight(direction)
}
function playbackBounds(){
 if(loadingPlayback)return [INTEGRATION_TIMES[0],loadingEnd(hardware)];
 if(view.phase==='D')return [INTEGRATION_TIMES[0],DEPLOY_START_S];
 if(commissioning())return [DEPLOY_START_S,DEPLOY_END_S];
 if(view.phase==='E')return [DEPLOY_START_S,sim.ignition];
 if(view.phase==='F')return [sim.ignition,sim.disposal()?.end??sim.duration];
 return [Math.min(0,view.t),sim.duration];
}
function startFlight(direction=1){
 pauseProcessing(false);
 const p=view.phase;if(!['B','C','D','E','F'].includes(p))return;
 if(direction>0&&p==='D'&&view.t>=539.999&&view.t<540&&siteApproach(hardware.input).gapKm>.02){setTime(540);toast('Opened the independently specified operating orbit.')}
 if(p==='E'&&flightSyncError&&!commissioning()){prepareFlight();return}
 if(p==='F'&&sim.disposal()?.feasible===false){toast(sim.disposal().reason);return}
 const [start,end]=playbackBounds();
 if(direction<0&&view.t<=start){playing=false;draw();toast('At the start of this recording. Select a later instant to play in reverse.');return}
 if(direction>0&&view.t>=end)setTime(start);
 playDirection=direction;playing=true;lastTick=performance.now();draw();if(p==='E')prepareFlight()
}
let lastInstrumentPaint=0,lastAnalysisPaint=0;
function advanceFlight(ms){
 const p=view.phase,[start,end]=playbackBounds();
 const elapsed=clamp((ms-lastTick)/1000,0,2);
 const t=clamp(view.t+playDirection*elapsed*view.speed,start,end);lastTick=ms;
 if(p==='E'&&!sim.audit&&t>=60*DAY){awaitFlightWindow(t);draw();return}
 if(p==='D'&&view.t<539.999&&t>=539.999&&siteApproach(hardware.input).gapKm>.02){
  playing=false;setTime(539.999);toast('Site ascent complete. Review the insertion mismatch or continue with the requested orbit.');return
 }
 const wasDay=view.start;view.t=t;view.start=dayStart(t);refreshSamples();snap=sim.at(t);if(integrating())refreshProcessing();if(t===(playDirection>0?end:start)){playing=false;loadingPlayback=false}
 if(p==='D'||p==='E'){const oldChapter=view.chapter;syncChapterToTime(snap);if(p==='D'&&t>=900)view.chapter='insertion';
  if(view.chapter!==oldChapter){if(p==='D'){draw();return}if(view.chapter==='commissioning'||oldChapter==='commissioning'){draw();return}scene?.setChapter?.(view.chapter);$('missionpath').innerHTML=flightChapters(view)}}
 if(wasDay!==view.start||!playing){draw();return}
 const analysisDue=ms-lastAnalysisPaint>=1000;
 if(analysisDue){if((p==='B'||$('pdr-domain-host').querySelector('details[open]'))&&!$('pdr-domain-host').matches(':hover'))renderPdrWorkspace();refreshPacketBadge();lastAnalysisPaint=ms;refreshLesson();refreshEventExplorer();if(!integrating()||view.detail||view.domain==='software')renderDiscipline(true);refreshLaunchStops()}
 if(p==='B'){renderDiagram();updateDiagramClock()}else{
  scene?.setSignalPlayback?.(replayMotion());scene?.update(hardware,snap);
  if(ms-lastInstrumentPaint<180&&!analysisDue)return;
  lastInstrumentPaint=ms;
  const active=document.activeElement,key=active?.id==='flight-rate'||active?.closest?.('.flight-transport')||$('guidepanel').matches?.(':hover');
  viewerInfo();refreshLaunchPad();if(integrating()&&hasLoadingDirector(view.domain))refreshLoadingPlayer(document,hardware,snap,replayMotion());if(commissioning())refreshCommissioning(document,hardware,snap);else if(!integrating()){if(showLaunchDirector(view))refreshLaunchGuide(document,hardware.input,snap);else if(!key)renderObservation();}
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
 if(!playing||referencePage){scene?.setSignalPlayback?.(false);return}
 if(foregroundWork||captureHeld){lastTick=ms;scheduleClock();return}
 if(ms-lastTick>=(view.phase==='B'?180:40))advanceFlight(ms);
 scheduleClock();
}


bindSubsystemDiagram($('diagram-host'),{onEdit:fieldEditor,onInspect:id=>runWork({title:'Inspecting spacecraft hardware',detail:'Preparing the selected component and its engineering data.'},()=>inspect(id)),onEvent:id=>runWork({title:'Evaluating mission event',detail:'Updating the spacecraft state and coupled engineering results.'},()=>{const e=events.find(v=>v.id===id);if(e)selectEvent(e)}),onSelect:(key,page)=>{diagramParts[page]=key;if(page==='thermal'&&thermalNodes.some(n=>n.id===key))view.thermalNode=key}});
window.addEventListener('pagehide',e=>{if(hardware)checkpoint.save();if(!e.persisted)releaseFiles()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&hardware){pauseProcessing();checkpoint.save()}});
hydrateIcons();syncNavigation();
help=installHelp({fieldTip:el=>view.phase==='A'||el.dataset.guideKey?shortHint(helpForElement(el,hardware?.input||input)):'',chartTip:pointTip,eventTip:i=>{const e=activeEvents()[i];return e?e.label+' · '+time(e.start)+' to '+time(e.end)+'. Click to inspect this episode.':''}});
recalc(null,false);
view.mode=isEditable(view.phase)?'size':'fly';
function openInitialWorkspace(){
 const q=new URLSearchParams(location.search);
 if(!initialShared){
  view.t=entryClock(view,q,sim);view.start=dayStart(view.t);
  if(referenceIds.includes(q.get('reference')))referencePage=q.get('reference');
 }
 refreshSamples();snap=sim.at(view.t);
 if(!initialShared&&q.has('met')&&view.phase==='D')syncChapterToTime(snap);
 playing=!referencePage&&!initialShared&&!commissioning()&&view.phase==='E'&&q.get('play')!=='0'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 lastTick=performance.now();draw();if(!referencePage&&view.phase==='E')prepareFlight();else if(!referencePage&&view.phase==='F')prepareCloseout();
}
if(view.phase==='F'){
 const met=new URLSearchParams(location.search).get('met'),requested=initialShared?view.t:met?.trim()&&Number.isFinite(Number(met))?Number(met):sim.ignition;
 const instant=clamp(requested,sim.ignition,sim.duration),start=initialShared?view.start:windowStartFor(instant,view.start,sim.duration);
 let opened=false;const visit=closeoutVisit;
 await runWork(closeoutWorkSpec(),job=>openPreparedCloseout(()=>{openInitialWorkspace();opened=true},{job,start,instant}));
 if(!opened&&visit===closeoutVisit){
  // A cancelled or failed initial deep link still leaves a usable workspace.
  referencePage=null;view.phase='E';view.chapter='operations';view.camera='spacecraft';view.scope='day';view.t=sim.story('operations').instant||3438;view.start=0;view.start=dayStart(view.t);
  refreshSamples();snap=sim.at(view.t);navigation.replaceCurrent();draw();prepareFlight();
 }
}else{
 const q=new URLSearchParams(location.search);
 if(!initialShared){view.t=entryPreparationClock(view,q,sim);view.start=dayStart(view.t);if(referenceIds.includes(q.get('reference')))referencePage=q.get('reference')}
 if(view.phase==='D'&&view.t< -600&&!view.detail&&!referencePage)openInitialWorkspace();
 else{
  let opened=false;const owner=sim,visit=closeoutVisit;
  await runWork({title:'Opening '+(getReferenceCenter(input.referenceCenterId)?.shortName||'saved design'),detail:'Preparing the selected spacecraft and operating window.',steps:['Load study configuration','Prepare operating window','Open workspace'],manualStages:true,cancelable:true,ready:'Study ready'},async job=>{
   job.ui.stage(1,'Preparing the selected mission window.');
   await sim.prepareWindow({start:view.start,instant:Math.max(0,view.t),scope:view.scope,signal:job.signal,onProgress:p=>{job.ui.stage(1,p.detail);if(Number.isFinite(p.completed)&&Number.isFinite(p.total))job.ui.progress(p.completed,p.total,p.detail)}});
   if(job.signal.aborted||sim!==owner||closeoutVisit!==visit)return;
   job.ui.setCancelable(null);job.ui.stage(2,'Opening the study and its engineering views.');await yieldToPaint();
   if(job.signal.aborted||sim!==owner||closeoutVisit!==visit)return;
   openInitialWorkspace();opened=true;
  });
  if(!opened&&sim===owner&&closeoutVisit===visit){
   // Cancellation keeps the exact installed inputs and opens the inexpensive
   // reference catalog. Reopening a study can retry its mission preparation.
   referencePage='designs';view.phase='A';view.mode='size';view.t=0;view.start=0;view.scope='day';snap=sim.at(0);navigation.replaceCurrent();draw();
  }
 }
}

installWorkspaceLayout({onMessage:toast});
installCaptureTools({getScene:()=>scene,context:()=>({workspace:referencePage||view.domain,domain:view.domain,label:domains[view.domain].label,phase:view.phase}),holdClock:()=>{captureHeld=true;return()=>{captureHeld=false;lastTick=performance.now();processingStamp=null}},onMessage:toast});

if(!initialShared&&view.phase==='A'){const field=new URLSearchParams(location.search).get('field');if(Object.hasOwn(controlByKey,field))openFieldGuide(field)}
