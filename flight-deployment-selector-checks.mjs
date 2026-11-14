import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import * as T from './dist/vendor/three.module.js';
import {connectionTube,connectionAnchor} from './dist/connection-geometry.js';
import {routeFromTube,obstacleFromMesh} from './dist/routing-audit.js';
import {createFlightDeploymentMotion} from './dist/flight-deployment-motion.js';
import {enumerateFlightDeploymentIntervals,hasCompleteFlightDeploymentCoverage,flightRoutingMotionPhaseIds} from './dist/flight-routing-motion.js';
import {parseFlightRoutingArguments} from './flight-routing-checks.mjs';
import {routingCraftConfigurations} from './dist/routing-configurations.js';

const started=Date.now(),groups=[],quiet=()=>{},caseId=routingCraftConfigurations()[0][0],chosenId='deployment:3:1';
const counts={invalidSelectors:0,unknownIntervals:0,coverageNegatives:0,realContinuousNegatives:0,requiredFixtureIntervals:11};
async function check(name,run){await run();groups.push(name);}
const descriptor=({id,name,start,end})=>({id,name,start,end});
// Literal independent expectations include PV, tracking, root and tip activity,
// a release-only interval, and a long inactive interval that stays unsplit.
const expected=[
 {id:'deployment:0:0',name:'hold',start:0,end:.125},
 {id:'deployment:1:0',name:'release',start:.125,end:.15625},
 {id:'deployment:2:0',name:'pv',start:.15625,end:.171875},
 {id:'deployment:2:1',name:'pv',start:.171875,end:.1875},
 {id:'deployment:3:0',name:'tracking',start:.1875,end:.203125},
 {id:chosenId,name:'tracking',start:.203125,end:.21875},
 {id:'deployment:4:0',name:'root',start:.21875,end:.234375},
 {id:'deployment:4:1',name:'root',start:.234375,end:.25},
 {id:'deployment:5:0',name:'tip',start:.25,end:.265625},
 {id:'deployment:5:1',name:'tip',start:.265625,end:.28125},
 {id:'deployment:6:0',name:'inactive',start:.28125,end:1}
];
const selectedExpected=expected[5],zero=()=>({pv:0,tracking:0,banks:new Map([[1,{root:0,tip:0,yaw:1}]])});
function fixtureMotion(){
 const intervals=[{name:'hold',start:0,end:.125},{name:'release',start:.125,end:.15625,releaseMetadata:'retained'},{name:'pv',start:.15625,end:.1875},{name:'tracking',start:.1875,end:.21875},{name:'root',start:.21875,end:.25},{name:'tip',start:.25,end:.28125},{name:'inactive',start:.28125,end:1}];
 return {intervals,parameters(a,b){const name=intervals.find(i=>i.start===a&&i.end===b)?.name,p=zero();if(name==='pv')p.pv=1;if(name==='tracking')p.tracking=1;if(name==='root')p.banks.get(1).root=1;if(name==='tip')p.banks.get(1).tip=1;return p;},bound(model,a,b){return {pointM:model.kind==='fixture-moving'?8*(b-a)/(selectedExpected.end-selectedExpected.start):model.kind==='fixture-unresolved'?100:0};},rigidGroup(model){return model.kind==='rigid'&&model.frameId==='body'?'body':null;},basis:'Tiny fixture motion bounds; no shipped spacecraft construction.'};
}

// Real electrical/fluid tube buffers, connector anchors and cross-service
// solids retain the full joined registry in every selected-interval sample.
function specimen({collision=null,unresolved=false}={}){
 const root=new T.Group(),material=new T.MeshBasicMaterial(),wire=connectionTube(root,{radius:.01,material}),fluid=connectionTube(root,{radius:.01,material}),model=unresolved?{kind:'fixture-unresolved',frameId:'moving'}:{kind:'rigid',frameId:'body'};
 wire.mesh.userData.electricalHarnessId='fixture-wire';fluid.mesh.userData.fluidConnectionId='fixture-fluid';wire.update([[-1,0,0],[1,0,0]]);fluid.update([[-1,1,0],[1,1,0]]);
 const from=connectionAnchor(root,[-1,0,0],[1,0,0]),to=connectionAnchor(root,[1,0,0],[-1,0,0]),electricalSolid=new T.Mesh(new T.BoxGeometry(.1,.1,.1),material),fluidSolid=new T.Mesh(new T.BoxGeometry(.1,.1,.1),material);root.add(electricalSolid,fluidSolid);electricalSolid.position.y=3;fluidSolid.position.y=collision==='baseline'?0:4;
 const solid=(mesh,id)=>({...obstacleFromMesh(mesh,{id}),motionModel:mesh===fluidSolid&&collision==='midpoint'?{kind:'fixture-moving',frameId:'moving-solid'}:model});
 const craft={id:caseId,root,pose:null,poses:[],snapshotPoses:[],positionPanels(progress){this.pose=progress;this.poses.push(progress);if(collision==='midpoint'){const {start,end}=selectedExpected,mid=(start+end)/2;fluidSolid.position.y=progress>=start&&progress<=end?4*((progress-mid)/((end-start)/2))**2:4;}},electrical:{architecture:{harnesses:[{id:'fixture-wire',quantity:1,connectorTypeId:'signal',fromPortId:'from',toPortId:'to'}]},ports:new Map([['from',{exits:[from]}],['to',{exits:[to]}]]),routing:{lines:[{id:'fixture-wire/0',tube:wire,from,to}],snapshot(){craft.snapshotPoses.push(craft.pose);return {routes:[routeFromTube(wire,{id:'fixture-wire/0',from:{position:from.position.toArray()},to:{position:to.position.toArray()},motionSpans:[{...model,startM:0,endM:2}]})],obstacles:[solid(electricalSolid,'electrical-solid')]};}}},fluidRoutingSnapshot(){return {routes:[routeFromTube(fluid,{id:'fixture-fluid',motionSpans:[{...model,startM:0,endM:2}]})],sections:[],obstacles:[solid(fluidSolid,'fluid-solid')],sectionValidation:{ok:true,issues:[],issueCount:0},inventory:{registeredTubeMeshes:1,drawnTubeMeshes:1}};},dispose(){root.traverse(o=>o.geometry?.dispose());material.dispose();}};
 state.fixtures.push(craft);return craft;
}

const state={};
function reset(){for(const f of state.fixtures||[])f.dispose();Object.assign(state,{fixtures:[],motion:fixtureMotion(),factory:null,motionCalls:[],halfspaceCalls:0,baselines:[],sweeps:[],otherCalls:[],sized:[],constructed:[],realAuditor:false,sweepResult:null,halfspaceIssues:[]});}
reset();
const proof=()=>({ok:true,issues:[],certifiedIntervals:1,unresolvedIntervals:0,unresolved:[]});
globalThis.__flightDeploymentSelectorContract={
 createMotion(factory){state.motionCalls.push(factory.id);state.factory=factory;return state.motion;},
 halfspaces(){state.halfspaceCalls++;return {issues:state.halfspaceIssues,byMeshId:new Map()};},
 baseline(snapshot,options,real){const result=real(snapshot,options);state.baselines.push({progress:state.factory.pose,snapshot,result});return result;},
 sweep(options,real){const record={start:options.start,end:options.end,certificate:options.stationaryCertificate,snapshots:[]};state.sweeps.push(record);const sample=progress=>{const snapshot=options.sample(progress);record.snapshots.push({progress,snapshot});return snapshot;};if(state.realAuditor)return real({...options,sample});for(const progress of [options.start,options.end,(options.start+options.end)/2])sample(progress);return {...proof(),samples:3,intervals:[{start:options.start,end:options.end}],...(state.sweepResult?.(options)||{})};},
 other(phase,factory){state.otherCalls.push(phase);assert.equal(factory.pose,1);return {ok:true,issues:[]};},
 routingCraftConfigurations:()=>[[caseId,{id:caseId}]],
 sizeDesign(input){state.sized.push(input.id);return input;},
 makeCraft(h){state.constructed.push(h.id);return specimen();}
};
const dataURL=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64'),motionURL=new URL('./dist/flight-routing-motion.js',import.meta.url),runnerURL=new URL('./flight-routing-checks.mjs',import.meta.url);
const [motionSource,runnerSource]=await Promise.all([readFile(motionURL,'utf8'),readFile(runnerURL,'utf8')]);
const stubURL=dataURL(`import {auditSweptRoutes as realSweep,createRoutingStationaryCertificate as realBaseline} from ${JSON.stringify(new URL('./dist/routing-audit.js',import.meta.url).href)};
export {createRoutingCollisionCache} from ${JSON.stringify(new URL('./dist/routing-audit.js',import.meta.url).href)};
const h=globalThis.__flightDeploymentSelectorContract;
export const createFlightDeploymentMotion=(...args)=>h.createMotion(...args),createSolarDeploymentHalfspaces=(...args)=>h.halfspaces(...args),createRoutingStationaryCertificate=(snapshot,options)=>h.baseline(snapshot,options,realBaseline),auditSweptRoutes=options=>h.sweep(options,realSweep);
export const certifySolarTracking=(...args)=>h.other('solar-tracking',...args),certifyConnectorMating=(...args)=>h.other('connector-mating',...args),certifyRadiatorPointing=async(...args)=>h.other('radiator-pointing',...args);
export const routingCraftConfigurations=(...args)=>h.routingCraftConfigurations(...args),sizeDesign=(...args)=>h.sizeDesign(...args),makeCraft=(...args)=>h.makeCraft(...args);`);
function imports(source,url,replacements){return source.replace(/from '(\.[^']+)'/g,(_,specifier)=>'from '+JSON.stringify(replacements[specifier]||new URL(specifier,url).href));}
const operationalBody=/export function certifyOperationalRoutingEnvelopes\([^\n]*\)\{[\s\S]*?^\}/m;assert.match(motionSource,operationalBody);
const motionHarness=motionSource.replace(operationalBody,"export function certifyOperationalRoutingEnvelopes(factory){return globalThis.__flightDeploymentSelectorContract.other('terminal-pointing-and-cmg-motion',factory);}");
assert(motionHarness.includes(motionSource.slice(motionSource.indexOf('export function enumerateFlightDeploymentIntervals'),motionSource.indexOf('export function certifyOperationalRoutingEnvelopes'))),'The production enumerator, coverage check and deployment certifier must remain unchanged');
assert(motionHarness.includes(motionSource.slice(motionSource.indexOf('export const flightRoutingMotionPhaseIds'))),'The production dispatcher must remain unchanged');
const motionModuleURL=dataURL(imports(motionHarness,motionURL,Object.fromEntries(['./routing-audit.js','./flight-deployment-motion.js','./flight-solar-deployment-halfspaces.js','./flight-solar-routing-motion.js','./flight-connector-routing-motion.js','./flight-radiator-routing-motion.js'].map(id=>[id,stubURL]))));
const motion=await import(motionModuleURL),runner=await import(dataURL(imports(runnerSource,runnerURL,{'./dist/design.js':stubURL,'./dist/craft.js':stubURL,'./dist/routing-configurations.js':stubURL,'./dist/flight-routing-motion.js':motionModuleURL})));
function assertManifest(result,manifest=expected){assert.deepEqual(result.requiredIntervalManifest,manifest);assert.equal(result.requiredIntervals,manifest.length);assert.deepEqual(result.completeDomain,[0,1]);}
function assertFullScene(snapshot){assert.deepEqual(snapshot.routes.map(r=>r.id),['fixture-wire/0','fixture-fluid']);assert.deepEqual(snapshot.obstacles.map(o=>o.id),['electrical-solid','fluid-solid']);assert.equal(snapshot.inventory.electrical.ok,true);assert.equal(snapshot.additionalIssueCount,0);}

try{
 await check('literal subdivision domains preserve every activity branch and exact original arithmetic',()=>{
  const input=fixtureMotion(),before=JSON.stringify(input.intervals),first=enumerateFlightDeploymentIntervals(input);assert.deepEqual(first.map(descriptor),expected);assert.deepEqual(enumerateFlightDeploymentIntervals(input),first);assert.equal(JSON.stringify(input.intervals),before);assert.equal(first[1].releaseMetadata,'retained');assert.equal(new Set(first.map(i=>i.id)).size,11);
  const narrow={intervals:[{name:'short-active',start:0,end:.015625},{name:'ceiling-boundary',start:.04,end:.1}],parameters:()=>({...zero(),pv:1})};
  assert.deepEqual(enumerateFlightDeploymentIntervals(narrow).map(descriptor),[{id:'deployment:0:0',name:'short-active',start:0,end:.015625},{id:'deployment:1:0',name:'ceiling-boundary',start:.04,end:.06},{id:'deployment:1:1',name:'ceiling-boundary',start:.06,end:.08},{id:'deployment:1:2',name:'ceiling-boundary',start:.08,end:.1}]);
 });
 await check('real motion metadata retains non-stage release boundaries independent of mesh UUIDs',()=>{
  const h={bodyWidthM:1,bodyHeightM:1,bodyLengthM:3,wingWidthM:1,wingLengthM:2,radiatorWidthM:1,radiatorLengthM:2,radiatorPanelsPerBank:2,input:{solarTiltDeg:0}},build=()=>{const root=new T.Group();for(let i=0;i<2;i++){const release=new T.Group();release.userData.routingMotion={kind:'release-restraint',frameId:release.uuid,startProgress:.02,endProgress:.03,strokeM:.01};root.add(release);}return createFlightDeploymentMotion({root},h);};
  const a=enumerateFlightDeploymentIntervals(build()).map(descriptor),b=enumerateFlightDeploymentIntervals(build()).map(descriptor);assert.deepEqual(a,b);assert.deepEqual(a.slice(0,4),[{id:'deployment:0:0',name:'hold',start:0,end:.015},{id:'deployment:1:0',name:'release',start:.015,end:.02},{id:'deployment:2:0',name:'release',start:.02,end:.03},{id:'deployment:3:0',name:'release',start:.03,end:.04}]);assert.equal(new Set(a.map(i=>i.id)).size,a.length);
 });
 await check('selection runs one existing continuous interval with progress-zero baseline and all solids',()=>{
  reset();const f=specimen(),result=motion.certifyFlightDeployment(f,{}, {intervalId:chosenId,onProgress:quiet});assertManifest(result);assert.deepEqual(result.selectedInterval,selectedExpected);assert.equal(result.intervalId,chosenId);assert.equal(result.executionComplete,true);assert.equal(result.selectedScopePassed,true);assert.equal(result.coverageComplete,false);assert.equal(result.ok,false);assert.deepEqual(result.intervals.map(descriptor),[selectedExpected]);assert.equal(state.sweeps.length,1);assert.equal(state.baselines.length,1);assert.equal(state.baselines[0].progress,0);assert.equal(state.sweeps[0].certificate,state.baselines[0].result.certificate);assert.deepEqual(f.snapshotPoses,[0,.203125,.21875,.2109375]);assert.deepEqual(f.poses,[0,.203125,.21875,.2109375,1]);for(const snapshot of [state.baselines[0].snapshot,...state.sweeps[0].snapshots.map(s=>s.snapshot)])assertFullScene(snapshot);
 });
 await check('unknown or malformed interval IDs fail before halfspaces, baseline or geometry sampling',()=>{
  for(const intervalId of ['deployment:99:0','deployment:3:1,deployment:4:0','',' ',0,false,['deployment:3:1']]){reset();const f=specimen(),result=motion.certifyFlightDeployment(f,{}, {intervalId,onProgress:quiet});assertManifest(result);assert.equal(result.intervalId,intervalId);assert.equal(result.selectedInterval,null);assert.equal(result.ok,false);assert.equal(result.executionComplete,false);assert.equal(result.coverageComplete,false);assert.equal(result.selectedScopePassed,false);assert.equal(result.issues[0].code,'unknown-deployment-interval');assert.deepEqual(result.intervals,[]);assert.deepEqual(f.poses,[]);assert.deepEqual(f.snapshotPoses,[]);assert.equal(state.halfspaceCalls,0);assert.equal(state.baselines.length,0);assert.equal(state.sweeps.length,0);counts.unknownIntervals++;}
 });
 await check('stationary-baseline failure keeps the full mandatory manifest and selected bounds',()=>{
  reset();const f=specimen({collision:'baseline'}),result=motion.certifyFlightDeployment(f,{}, {intervalId:chosenId,onProgress:quiet});assertManifest(result);assert.deepEqual(result.selectedInterval,selectedExpected);assert.equal(result.ok,false);assert.equal(result.selectedScopePassed,false);assert.equal(result.executionComplete,false);assert.equal(result.coverageComplete,false);assert(result.issues.some(i=>i.code==='solid-collision'));assert.equal(state.sweeps.length,0);assert.deepEqual(f.poses,[0,1]);
 });
 await check('failed or unresolved selected proofs remain failures and never continue to another interval',()=>{
  for(const failure of [{ok:false,issues:[{code:'fixture-failure'}],certifiedIntervals:0},{ok:false,issues:[{code:'unresolved-motion-clearance'}],certifiedIntervals:0,unresolvedIntervals:1},{ok:true,issues:[],unresolvedIntervals:1},{ok:true,issues:[],certifiedIntervals:0}]){reset();state.sweepResult=()=>failure;const result=motion.certifyFlightDeployment(specimen(),{}, {intervalId:chosenId,onProgress:quiet});assertManifest(result);assert.equal(result.executionComplete,true);assert.equal(result.selectedScopePassed,false);assert.equal(result.coverageComplete,false);assert.equal(result.ok,false);assert.equal(state.sweeps.length,1);assert.deepEqual(result.intervals.map(descriptor),[selectedExpected]);}
  reset();state.halfspaceIssues=[{code:'fixture-halfspace-failure'}];const result=motion.certifyFlightDeployment(specimen(),{}, {intervalId:chosenId,onProgress:quiet});assert.equal(result.selectedScopePassed,false);assert.equal(result.ok,false);assertManifest(result);
 });
 await check('complete coverage requires exact mandatory IDs and bounds with no missing, duplicate or unresolved proof',()=>{
  const passed=expected.map(i=>({...i,...proof()}));assert.equal(hasCompleteFlightDeploymentCoverage(expected,passed),true);assert.equal(hasCompleteFlightDeploymentCoverage(expected,[...passed].reverse()),true);
  const corrupt=[passed.slice(1),[...passed.slice(0,-1),passed[0]],[...passed,{...passed[0]}],passed.map((p,i)=>i===0?{...p,id:'unknown'}:p),passed.map((p,i)=>i===0?{...p,id:undefined}:p),passed.map((p,i)=>i===0?{...p,start:Number.EPSILON}:p),passed.map((p,i)=>i===0?{...p,end:p.end+Number.EPSILON}:p),passed.map((p,i)=>i===0?{...p,name:'other'}:p),passed.map((p,i)=>i===0?{...p,ok:false}:p),passed.map((p,i)=>i===0?{...p,unresolvedIntervals:1}:p),passed.map((p,i)=>i===0?{...p,unresolved:[{start:0,end:.125}]}:p),passed.map((p,i)=>i===0?{...p,unresolvedIntervals:undefined}:p),passed.map((p,i)=>i===0?{...p,certifiedIntervals:0}:p),passed.map((p,i)=>i===0?{...p,issues:[{code:'unresolved-motion-clearance'}]}:p)];
  for(const results of corrupt){assert.equal(hasCompleteFlightDeploymentCoverage(expected,results),false);counts.coverageNegatives++;}assert.equal(hasCompleteFlightDeploymentCoverage([],[]),false);assert.equal(hasCompleteFlightDeploymentCoverage([...expected.slice(0,-1),expected[0]],passed),false);counts.coverageNegatives+=2;
 });
 await check('unfiltered intervals keep original order, full domain, and early-failure behavior',()=>{
  reset();const result=motion.certifyFlightDeployment(specimen(),{}, {onProgress:quiet});assertManifest(result);assert.deepEqual(result.intervals.map(descriptor),expected);assert.equal(result.ok,true);assert.equal(result.executionComplete,true);assert.equal(result.selectedScopePassed,true);assert.equal(result.coverageComplete,true);assert.equal(result.intervalId,null);assert.equal(result.selectedInterval,null);assert.equal(state.sweeps.length,11);assert.equal(state.baselines.length,1);
  reset();state.sweepResult=()=>({ok:false,issues:[{code:'unresolved-motion-clearance'}],certifiedIntervals:0,unresolvedIntervals:1});const failed=motion.certifyFlightDeployment(specimen(),{}, {onProgress:quiet});assertManifest(failed);assert.equal(failed.ok,false);assert.equal(failed.coverageComplete,false);assert.equal(failed.executionComplete,false);assert.equal(state.sweeps.length,1);assert.deepEqual(failed.intervals.map(descriptor),[expected[0]]);
 });
 await check('a selected singleton domain is still diagnostic',()=>{
  for(const selected of [true,false]){reset();state.motion={...fixtureMotion(),intervals:[{name:'still',start:0,end:1}],parameters:zero};const result=motion.certifyFlightDeployment(specimen(),{}, {intervalId:selected?'deployment:0:0':null,onProgress:quiet});assertManifest(result,[{id:'deployment:0:0',name:'still',start:0,end:1}]);assert.equal(result.selectedScopePassed,true);assert.equal(result.executionComplete,true);assert.equal(result.ok,!selected);assert.equal(result.coverageComplete,!selected);assert.equal(state.sweeps.length,1);}
 });
 await check('tiny real continuous audits retain midpoint collisions and unresolved clearance as failures',()=>{
  for(const mode of ['clear','midpoint','unresolved']){reset();state.realAuditor=true;const f=specimen({collision:mode==='midpoint'?'midpoint':null,unresolved:mode==='unresolved'}),result=motion.certifyFlightDeployment(f,{}, {intervalId:chosenId,maxDepth:0,maxSamples:3,onProgress:quiet});assertManifest(result);assert.equal(state.baselines[0].result.ok,true);assert.equal(state.sweeps.length,1);assert.equal(result.executionComplete,true);assert.equal(result.ok,false);assert.equal(result.coverageComplete,false);assert.deepEqual(result.intervals.map(descriptor),[selectedExpected]);for(const sample of state.sweeps[0].snapshots)assertFullScene(sample.snapshot);if(mode==='clear')assert.equal(result.selectedScopePassed,true,JSON.stringify(result.issues));else {assert.equal(result.selectedScopePassed,false);if(mode==='midpoint')assert(result.issues.some(i=>i.code==='solid-collision'&&i.obstacleId==='fluid-solid'&&i.routeId==='fixture-wire/0'&&i.time===.2109375),JSON.stringify(result.issues));else {assert(result.issues.some(i=>i.code==='unresolved-motion-clearance'),JSON.stringify(result.issues));assert(result.intervals[0].unresolvedIntervals>0);}counts.realContinuousNegatives++;}}
 });
 await check('dispatcher passes the chosen interval only to deployment and exposes diagnostic success',async()=>{
  reset();const result=await motion.certifyFlightRoutingMotion(specimen(),{}, {phase:'deployment',intervalId:chosenId,onProgress:quiet});assert.deepEqual(result.domains.map(d=>d.id),['deployment']);assert.equal(result.domains[0].intervalId,chosenId);assert.deepEqual(result.domains[0].selectedInterval,selectedExpected);assert.equal(result.selectedScopePassed,true);assert.equal(result.ok,false);assert.equal(result.coverageComplete,false);assert.equal(result.executionComplete,true);assert.equal(state.sweeps.length,1);assert.deepEqual(state.otherCalls,[]);
  reset();const selectedPhase=await motion.certifyFlightRoutingMotion(specimen(),{}, {phase:'solar-tracking',onProgress:quiet});assert.equal(selectedPhase.ok,true);assert.equal(selectedPhase.selectedScopePassed,true);assert.equal(selectedPhase.coverageComplete,false);assert.deepEqual(state.otherCalls,['solar-tracking']);assert.equal(state.motionCalls.length,0);
  for(const phase of [null,...flightRoutingMotionPhaseIds.filter(id=>id!=='deployment')]){reset();const f=specimen();await assert.rejects(()=>motion.certifyFlightRoutingMotion(f,{}, {phase,intervalId:chosenId}),/explicit deployment phase/);assert.deepEqual(f.poses,[]);assert.equal(state.motionCalls.length,0);assert.deepEqual(state.otherCalls,[]);}
  for(const intervalId of ['',0,false,['deployment:0:0']]){reset();const f=specimen();await assert.rejects(()=>motion.certifyFlightRoutingMotion(f,{}, {phase:'deployment',intervalId}),/nonempty interval ID/);assert.deepEqual(f.poses,[]);assert.equal(state.motionCalls.length,0);}
 });
 await check('CLI parsing requires one interval value with explicit case and deployment phase',async()=>{
  assert.deepEqual(parseFlightRoutingArguments(['--case',caseId,'--phase','deployment','--interval',chosenId]),{caseId,phase:'deployment',pose:null,intervalId:chosenId,activityId:null,output:null,resume:null,prerequisites:null});assert.equal(parseFlightRoutingArguments(['--interval',chosenId,'--phase','deployment','--case',caseId]).intervalId,chosenId);
  const invalid=[['--interval'],['--interval',''],['--interval','   '],['--interval','--case',caseId],['--interval',chosenId],['--phase','deployment','--interval',chosenId],['--case',caseId,'--interval',chosenId],['--case',caseId,'--phase','static','--pose','.5','--interval',chosenId],['--case',caseId,'--phase','deployment','--interval',chosenId,'--interval',chosenId],['--case',caseId,'--phase','deployment','--interval',chosenId,'--pose','0'],['--case',caseId,'--phase','deployment','--interval='+chosenId]];
  for(const phase of flightRoutingMotionPhaseIds.filter(id=>id!=='deployment'))invalid.push(['--case',caseId,'--phase',phase,'--interval',chosenId]);
  reset();for(const args of invalid){await assert.rejects(()=>runner.runFlightRoutingChecks(args,{onProgress:quiet}),Error,JSON.stringify(args));counts.invalidSelectors++;}assert.deepEqual(state.sized,[]);assert.deepEqual(state.constructed,[]);assert.equal(state.motionCalls.length,0);
 });
 await check('CLI selected motion retains requested interval while prerequisites block all construction',async()=>{
  reset();for(const intervalId of [chosenId,'unknown-until-authoritative-scene']){const result=await runner.runFlightRoutingChecks(['--case',caseId,'--phase','deployment','--interval',intervalId],{onProgress:quiet});assert.equal(result.selection.intervalId,intervalId);const row=result.configurations[0];assert.equal(row.motion.intervalId,intervalId);assert.equal(row.motion.issues[0].code,'motion-prerequisites-required');assert.deepEqual(row.motion.domains,[]);assert.deepEqual(row.poses,[]);for(const key of ['ok','executionComplete','selectedScopePassed','coverageComplete'])assert.equal(result[key],false);}
  const forged=await runner.auditInstalledFlightConfiguration(caseId,{}, {phase:'deployment',intervalId:chosenId,inventoryPassed:true,staticPassed:true,prerequisites:{ok:true,sourceUnchanged:true},onProgress:quiet});assert.equal(forged.motion.intervalId,chosenId);assert.equal(forged.motion.issues[0].code,'motion-prerequisites-required');assert.deepEqual(state.sized,[]);assert.deepEqual(state.constructed,[]);assert.equal(state.motionCalls.length,0);assert.equal(state.halfspaceCalls,0);assert.equal(state.sweeps.length,0);
 });
 await check('five present motion phases cannot promote incomplete deployment interval coverage',async()=>{
  reset();state.sweepResult=options=>options.start===.28125?{ok:false,issues:[{code:'unresolved-motion-clearance'}],certifiedIntervals:0,unresolvedIntervals:1}:null;const result=await runner.runFlightRoutingChecks([],{onProgress:quiet}),row=result.configurations[0];assert.deepEqual(row.motion.domains.map(d=>d.id),flightRoutingMotionPhaseIds);assert.equal(row.motion.domains[0].intervals.length,11);assert.equal(row.motion.domains[0].coverageComplete,false);assert.equal(row.motion.coverageComplete,false);assert.equal(row.executionComplete,true);assert.equal(row.coverageComplete,false);assert.equal(row.ok,false);assert.equal(result.completeMatrix,true);assert.equal(result.executionComplete,true);assert.equal(result.coverageComplete,false);assert.equal(result.selectedScopePassed,false);assert.equal(result.ok,false);assert.equal(state.sweeps.length,11);assert.deepEqual(state.otherCalls,flightRoutingMotionPhaseIds.slice(1));
 });
 await check('real CLI rejects misplaced intervals and writes blocked selection with finite timeouts',async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'flight-deployment-selector-'));try{const output=path.join(directory,'report.json'),invalid=spawnSync(process.execPath,[runnerURL.pathname,'--case',caseId,'--interval',chosenId],{encoding:'utf8',timeout:10000,maxBuffer:1024*1024});assert.equal(invalid.error,undefined);assert.equal(invalid.status,1);assert.match(invalid.stderr,/--interval requires/);const blocked=spawnSync(process.execPath,[runnerURL.pathname,'--case',caseId,'--phase','deployment','--interval',chosenId,'--output',output],{encoding:'utf8',timeout:10000,maxBuffer:1024*1024});assert.equal(blocked.error,undefined);assert.equal(blocked.signal,null);assert.equal(blocked.status,1);assert.match(blocked.stdout,/motion-prerequisites-required/);assert.doesNotMatch(blocked.stdout,/Deployment tracking:/);const report=JSON.parse(await readFile(output,'utf8'));assert.equal(report.selection.intervalId,chosenId);assert.equal(report.configurations[0].motion.intervalId,chosenId);assert.equal(report.executionComplete,false);assert.equal(report.coverageComplete,false);assert.equal(report.ok,false);}finally{await rm(directory,{recursive:true,force:true});}
 });
 console.log(JSON.stringify({ok:true,groups:groups.length,...counts,durationS:(Date.now()-started)/1000,scope:'Bounded H02 interval identity/selection/coverage contract using actual tiny full-scene snapshots and real continuous-auditor negatives; no shipped geometry matrix or publication gate.'}));
 console.log('Flight deployment selector: '+groups.join('; ')+'.');
}finally{reset();delete globalThis.__flightDeploymentSelectorContract;}
