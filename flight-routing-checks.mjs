import {pathToFileURL} from 'node:url';
import {canvas} from './render-test-canvas.mjs';
import {sizeDesign} from './dist/design.js';
import {routingCraftConfigurations} from './dist/routing-configurations.js';
import {makeCraft} from './dist/craft.js';
import {flightRoutingSnapshot,auditFlightRoutingSnapshot} from './dist/flight-routing-registry.js';
import {certifyFlightRoutingMotion,flightRoutingMotionPhaseIds} from './dist/flight-routing-motion.js';
import {flightRoutingSourceFingerprint,sameRoutingSourceFingerprint,flightRoutingReceiptScope,flightRoutingPrerequisiteIdentity,loadFlightStaticPrerequisites,readFlightReceipt,validateFlightReceipt,validateFlightReceiptOutput,writeFlightReceipt} from './scripts/flight-routing-receipts.mjs';

export const flightRoutingConfigurations=routingCraftConfigurations;
export const flightRoutingStaticPoses=Object.freeze([0,.25,.5,.75,1]);

function validateSelection({caseId,phase,pose,intervalId,activityId}){
 if(phase!==null&&phase!=='static'&&!flightRoutingMotionPhaseIds.includes(phase))throw new Error('Unknown flight routing phase: '+phase);
 if(phase!==null&&!caseId)throw new Error('--phase requires an explicit --case');
 if(pose!==null&&(phase!=='static'||!Number.isFinite(pose)||!flightRoutingStaticPoses.includes(pose)))throw new Error('--pose requires --phase static and one of 0, .25, .5, .75, 1');
 if(phase==='static'&&pose===null)throw new Error('--phase static requires exactly one --pose');
 if(intervalId!==null&&activityId!==null)throw new Error('--interval and --activity are mutually exclusive');
 if(intervalId!==null&&(phase!=='deployment'||!caseId||typeof intervalId!=='string'||!intervalId.trim()))throw new Error('--interval requires an explicit --case, --phase deployment, and a nonempty interval ID');
 if(activityId!==null&&(phase!=='connector-mating'||!caseId||typeof activityId!=='string'||!activityId.trim()))throw new Error('--activity requires an explicit --case, --phase connector-mating, and a nonempty activity ID');
}

export function parseFlightRoutingArguments(argv,configurationIds=flightRoutingConfigurations().map(([id])=>id)){
 const options={caseId:null,phase:null,pose:null,intervalId:null,activityId:null,output:null,resume:null,prerequisites:null},flags=new Map([['--case','caseId'],['--phase','phase'],['--pose','pose'],['--interval','intervalId'],['--activity','activityId'],['--output','output'],['--resume','resume'],['--prerequisites','prerequisites']]),seen=new Set();
 for(let i=0;i<argv.length;i++){
  const flag=argv[i],key=flags.get(flag);if(!key)throw new Error('Unknown flight routing argument: '+flag);if(seen.has(flag))throw new Error('Duplicate flight routing argument: '+flag);seen.add(flag);
  const value=argv[++i];if(typeof value!=='string'||!value.trim()||value.startsWith('--'))throw new Error('Missing value for '+flag);
  options[key]=key==='pose'?Number(value):key==='prerequisites'?value.split(','):value;
 }
 validateSelection(options);
 if(options.caseId!==null&&!configurationIds.includes(options.caseId))throw new Error('Unknown flight routing configuration: '+options.caseId);
 if(options.resume!==null&&(!options.caseId||!options.phase))throw new Error('--resume requires an exact --case and --phase unit');
 if(options.prerequisites!==null&&(!options.caseId||!options.phase||options.phase==='static'||options.prerequisites.length!==5||new Set(options.prerequisites).size!==5||options.prerequisites.some(file=>!file.trim())))throw new Error('--prerequisites requires selected motion and exactly five distinct comma-separated receipt files');
 if(options.resume!==null&&options.phase!=='static'&&options.prerequisites===null)throw new Error('Motion --resume requires the five --prerequisites files again');
 return options;
}

export async function auditInstalledFlightConfiguration(id,input,{factory=null,hardware=null,onProgress=console.log,phase=null,pose=null,intervalId=null,activityId=null,prerequisiteFiles=null}={}){
 validateSelection({caseId:id,phase,pose,intervalId,activityId});
 const scope=flightRoutingReceiptScope({caseId:id,phase,pose,intervalId,activityId},flightRoutingConfigurations().map(([caseId])=>caseId),flightRoutingStaticPoses,flightRoutingMotionPhaseIds),prerequisites=phase!==null&&phase!=='static'&&prerequisiteFiles!==null?loadFlightStaticPrerequisites(prerequisiteFiles,scope,flightRoutingSourceFingerprint()):null;
 return auditConfiguration(id,input,{factory,hardware,onProgress,phase,pose,intervalId,activityId},prerequisites);
}
async function auditConfiguration(id,input,{factory=null,hardware=null,onProgress,phase,pose,intervalId,activityId},prerequisites){
 // Only file-backed, current-source static proofs reach this private path.
 // The public API never accepts booleans or caller-supplied proof objects.
 if(phase!==null&&phase!=='static'&&prerequisites===null)return {id,ok:false,executionComplete:false,selectedScopePassed:false,coverageComplete:false,durationS:0,poses:[],motion:{ok:false,executionComplete:false,domains:[],selectedDomainIds:[phase],intervalId,activityId,issues:[{code:'motion-prerequisites-required',message:'Selected motion requires five current-source passing static receipt files, one for each required pose, supplied with --prerequisites. No geometry or motion phase was run.'}]}};
 const start=Date.now(),h=hardware||sizeDesign(input),craft=factory||makeCraft(h);
 if(phase!==null&&phase!=='static'){
  const motion=await certifyFlightRoutingMotion(craft,h,{onProgress,phase,intervalId,activityId}),executionComplete=motion.domains.length===1&&motion.domains[0].id===phase&&motion.executionComplete===true;
  return {id,ok:false,executionComplete,selectedScopePassed:executionComplete&&motion.selectedScopePassed===true,coverageComplete:false,durationS:(Date.now()-start)/1000,poses:[],motion};
 }
 const poses=[];for(const deployment of phase==='static'?[pose]:flightRoutingStaticPoses){craft.positionPanels(deployment);const snapshot=flightRoutingSnapshot(craft),audit=auditFlightRoutingSnapshot(snapshot,{maxIssues:150});poses.push({deployment,...audit});onProgress(id+' deployment '+deployment+': '+audit.issueCount+' findings');}
 const staticOK=poses.every(p=>p.ok);
 if(phase==='static')return {id,ok:false,executionComplete:true,selectedScopePassed:staticOK,coverageComplete:false,durationS:(Date.now()-start)/1000,poses,motion:{ok:false,skipped:true,reason:'not-selected',domains:[]}};
 const motion=staticOK?await certifyFlightRoutingMotion(craft,h,{onProgress}):{ok:false,domains:[],issues:[{code:'motion-prerequisite-failed',message:'The actual installed geometry failed a sampled pose. Continuous coverage remains required after that geometry is corrected.'}]};
 const domainsComplete=poses.length===flightRoutingStaticPoses.length&&motion.domains.length===flightRoutingMotionPhaseIds.length&&flightRoutingMotionPhaseIds.every(id=>motion.domains.filter(d=>d.id===id).length===1),executionComplete=domainsComplete&&motion.executionComplete!==false&&motion.domains.every(d=>d.executionComplete!==false),coverageComplete=domainsComplete&&motion.coverageComplete!==false&&motion.domains.every(d=>d.coverageComplete!==false),ok=coverageComplete&&staticOK&&motion.ok;
 return {id,ok,executionComplete,selectedScopePassed:ok,coverageComplete,durationS:(Date.now()-start)/1000,poses,motion};
}

export async function runFlightRoutingChecks(argv=[],{onProgress=console.log}={}){
 const required=flightRoutingConfigurations(),selection=parseFlightRoutingArguments(argv,required.map(([id])=>id)),configurations=required.filter(([id])=>selection.caseId===null||id===selection.caseId);
 if(!configurations.length)throw new Error('No required flight routing configurations');
 const sourceFingerprint=flightRoutingSourceFingerprint(),scope=flightRoutingReceiptScope(selection,required.map(([id])=>id),flightRoutingStaticPoses,flightRoutingMotionPhaseIds);
 validateFlightReceiptOutput(selection.output,sourceFingerprint);
 const prerequisites=selection.prerequisites===null?null:loadFlightStaticPrerequisites(selection.prerequisites,scope,sourceFingerprint),previous=selection.resume===null?null:validateFlightReceipt(readFlightReceipt(selection.resume),scope,sourceFingerprint,prerequisites||[]);
 globalThis.document={createElement:()=>canvas()};
 const report={schema:'orbital-flight-routing-v1',generatedAt:new Date().toISOString(),ok:false,executionComplete:false,selectedScopePassed:false,coverageComplete:false,completeMatrix:false,selection,requiredConfigurationIds:required.map(([id])=>id),selectedConfigurationIds:configurations.map(([id])=>id),configurations:[],receipt:{schema:'orbital-flight-routing-receipt/v1',status:'incomplete',scope,start:{at:new Date().toISOString(),sourceFingerprint},finish:null,sourceUnchanged:true,prerequisites:(prerequisites||[]).map(flightRoutingPrerequisiteIdentity)},scope:'Every shipped mission-purpose starter and reference study; actual mesh buffers and combined electrical/fluid geometry. Continuous coverage requires an analytic interval certificate. Explicit case, phase, pose, interval or activity selection is diagnostic and cannot establish publication coverage. executionComplete records completion of the selected work; selectedScopePassed records its outcome; coverageComplete requires all cases, static poses and motion phases, including every resolved mandatory deployment interval and connector activity, in an unfiltered run.'};
 const checkpoint=()=>{const current=flightRoutingSourceFingerprint();report.receipt.sourceUnchanged=report.receipt.sourceUnchanged&&sameRoutingSourceFingerprint(sourceFingerprint,current);writeFlightReceipt(selection.output,report);return current;};
 const progress=message=>{checkpoint();try{onProgress(message);}finally{checkpoint();}};
 checkpoint();
 if(previous){report.configurations=previous.configurations;report.receipt.resumedFrom=flightRoutingPrerequisiteIdentity(previous);progress('Resumed exact flight routing unit: '+selection.caseId+'/'+selection.phase);}
 else for(const [id,input] of configurations){try{report.configurations.push(await auditConfiguration(id,input,{onProgress:progress,phase:selection.phase,pose:selection.pose,intervalId:selection.intervalId,activityId:selection.activityId},prerequisites));}catch(error){report.configurations.push({id,ok:false,executionComplete:false,selectedScopePassed:false,coverageComplete:false,error:error.stack});console.error(id+': '+error.message);}checkpoint();}
 report.completeMatrix=selection.caseId===null&&report.configurations.length===required.length&&required.every(([id])=>report.configurations.filter(c=>c.id===id).length===1);
 report.executionComplete=report.configurations.length===configurations.length&&report.configurations.every(c=>c.executionComplete);
 const finishFingerprint=checkpoint();report.receipt.finish={at:new Date().toISOString(),sourceFingerprint:finishFingerprint};report.receipt.status=report.executionComplete?'complete':'incomplete';
 report.selectedScopePassed=report.receipt.sourceUnchanged&&report.executionComplete&&report.configurations.every(c=>c.selectedScopePassed);
 report.coverageComplete=report.receipt.sourceUnchanged&&report.completeMatrix&&report.configurations.every(c=>c.coverageComplete);
 report.casesOK=report.configurations.every(c=>c.ok);report.ok=report.coverageComplete&&report.casesOK;
 writeFlightReceipt(selection.output,report);
 return report;
}
async function main(){
 const report=await runFlightRoutingChecks(process.argv.slice(2));console.table(report.configurations.map(c=>({id:c.id,ok:c.ok,executionComplete:c.executionComplete,selectedScopePassed:c.selectedScopePassed,seconds:c.durationS,poseFindings:c.poses?.reduce((n,p)=>n+p.issueCount,0),motion:c.motion?.ok,error:c.error?.split('\n')[0]||c.motion?.issues?.[0]?.code})));if(!report.ok)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
