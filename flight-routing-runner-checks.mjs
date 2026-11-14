import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import * as T from './dist/vendor/three.module.js';
import {connectionTube,connectionAnchor} from './dist/connection-geometry.js';
import {routeFromTube,obstacleFromMesh} from './dist/routing-audit.js';
import {routingCraftConfigurations} from './dist/routing-configurations.js';
import {auditInstalledFlightConfiguration,flightRoutingStaticPoses,parseFlightRoutingArguments} from './flight-routing-checks.mjs';
import {flightRoutingMotionPhaseIds} from './dist/flight-routing-motion.js';

const groups=[],requiredIds=routingCraftConfigurations().map(([id])=>id),caseId=requiredIds[0],quiet=()=>{},started=Date.now();
const counts={invalidSelectors:0,realStaticPoses:0,realGeometryNegatives:0,selectedDispatcherPhases:0,blockedMotionSelections:0,requiredConfigurations:requiredIds.length};
async function check(name,run){await run();groups.push(name);}

// Tiny actual tube buffers and physical solids exercise the real joined
// registry and collision auditor. Each service supplies an unrelated solid,
// so filtering either service out would hide a cross-service collision.
function fixture({id='fixture',collision=null}={}){
 const root=new T.Group(),material=new T.MeshBasicMaterial(),poses=[];
 const wire=connectionTube(root,{radius:.01,material}),fluid=connectionTube(root,{radius:.01,material}),fluidY=collision==='interline'?.005:1;
 wire.mesh.userData.electricalHarnessId='fixture-wire';fluid.mesh.userData.fluidConnectionId='fixture-fluid';
 wire.update([[-1,0,0],[1,0,0]]);fluid.update([[-1,fluidY,0],[1,fluidY,0]]);
 const from=connectionAnchor(root,[-1,0,0],[1,0,0]),to=connectionAnchor(root,[1,0,0],[-1,0,0]);
 const electricalSolid=new T.Mesh(new T.BoxGeometry(.1,.1,.1),material),fluidSolid=new T.Mesh(new T.BoxGeometry(.1,.1,.1),material);root.add(electricalSolid,fluidSolid);
 electricalSolid.position.y=collision==='electrical-solid'?1:3;fluidSolid.position.y=collision==='fluid-solid'?0:4;
 const craft={id,root,poses,pose:null,snapshots:0,positionPanels(deployment){this.pose=deployment;poses.push(deployment);},electrical:{architecture:{harnesses:[{id:'fixture-wire',quantity:1,connectorTypeId:'signal',fromPortId:'from',toPortId:'to'}]},ports:new Map([['from',{exits:[from]}],['to',{exits:[to]}]]),routing:{lines:[{id:'fixture-wire/0',tube:wire,from,to}],snapshot(){craft.snapshots++;return {routes:[routeFromTube(wire,{id:'fixture-wire/0',from:{position:from.position.toArray()},to:{position:to.position.toArray()}})],obstacles:[obstacleFromMesh(electricalSolid,{id:'electrical-solid'})]};}}},fluidRoutingSnapshot(){return {routes:[routeFromTube(fluid,{id:'fixture-fluid'})],sections:[],obstacles:[obstacleFromMesh(fluidSolid,{id:'fluid-solid'})],sectionValidation:{ok:true,issues:[],issueCount:0},inventory:{registeredTubeMeshes:1,drawnTubeMeshes:1}};},dispose(){root.traverse(o=>o.geometry?.dispose());material.dispose();}};
 return craft;
}

// Test-only module copies replace construction and expensive certifier bodies.
// The parser, runner, dispatcher, snapshot, and auditor stay unchanged. There
// are no dependency overrides or proof-acceptance hooks in production code.
const state={};
function reset(){for(const f of state.fixtures||[])f.dispose();Object.assign(state,{catalog:[...requiredIds],sized:[],constructed:[],fixtures:[],calls:[],staticFailureCase:null,motionFailureCase:null,motionFailurePhase:null,throwCase:null});}
reset();
globalThis.__flightRoutingRunnerContract={
 routingCraftConfigurations:()=>state.catalog.map(id=>[id,{id}]),
 sizeDesign(input){state.sized.push(input.id);return input;},
 makeCraft(h){state.constructed.push(h.id);if(h.id===state.throwCase)throw new Error('fixture construction failure');const f=fixture({id:h.id,collision:h.id===state.staticFailureCase?'fluid-solid':null});state.fixtures.push(f);return f;},
 certify(phase,factory){state.calls.push({id:factory.id,phase,pose:factory.pose});if(phase==='deployment')factory.positionPanels(1);else assert.equal(factory.pose,1,'selected operating phases start fully deployed');const ok=!(factory.id===state.motionFailureCase&&phase===state.motionFailurePhase);return {ok,issues:ok?[]:[{code:'fixture-motion-failure'}]};}
};
const dataURL=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const stubURL=dataURL(`const h=globalThis.__flightRoutingRunnerContract;
export const routingCraftConfigurations=(...args)=>h.routingCraftConfigurations(...args),sizeDesign=(...args)=>h.sizeDesign(...args),makeCraft=(...args)=>h.makeCraft(...args);
export const certifySolarTracking=(...args)=>h.certify('solar-tracking',...args),certifyConnectorMating=(...args)=>h.certify('connector-mating',...args),certifyRadiatorPointing=async(...args)=>h.certify('radiator-pointing',...args);`);
function imports(source,url,replacements){return source.replace(/from '(\.[^']+)'/g,(_,specifier)=>'from '+JSON.stringify(replacements[specifier]||new URL(specifier,url).href));}
const motionURL=new URL('./dist/flight-routing-motion.js',import.meta.url),runnerURL=new URL('./flight-routing-checks.mjs',import.meta.url);
const [motionSource,runnerSource]=await Promise.all([readFile(motionURL,'utf8'),readFile(runnerURL,'utf8')]);
let motionHarness=motionSource;
for(const [name,phase] of [['certifyFlightDeployment','deployment'],['certifyOperationalRoutingEnvelopes','terminal-pointing-and-cmg-motion']]){
 const body=new RegExp('export function '+name+'\\([^\\n]*\\)\\{[\\s\\S]*?^\\}','m');assert.match(motionHarness,body);
 motionHarness=motionHarness.replace(body,`export function ${name}(...args){return globalThis.__flightRoutingRunnerContract.certify('${phase}',...args);}`);
}
assert(motionHarness.includes(motionSource.slice(motionSource.indexOf('export const flightRoutingMotionPhaseIds'))),'the production dispatcher must remain unchanged in the harness');
const motionModuleURL=dataURL(imports(motionHarness,motionURL,{'./flight-solar-routing-motion.js':stubURL,'./flight-connector-routing-motion.js':stubURL,'./flight-radiator-routing-motion.js':stubURL}));
const motion=await import(motionModuleURL),runner=await import(dataURL(imports(runnerSource,runnerURL,{'./dist/design.js':stubURL,'./dist/craft.js':stubURL,'./dist/routing-configurations.js':stubURL,'./dist/flight-routing-motion.js':motionModuleURL})));

try{
 await check('strict finite selector parsing and exact case/phase names',()=>{
  assert.deepEqual(flightRoutingStaticPoses,[0,.25,.5,.75,1]);
  assert.deepEqual(flightRoutingMotionPhaseIds,['deployment','terminal-pointing-and-cmg-motion','solar-tracking','connector-mating','radiator-pointing']);
  assert.deepEqual(parseFlightRoutingArguments([],requiredIds),{caseId:null,phase:null,pose:null,intervalId:null,activityId:null,output:null,resume:null,prerequisites:null});
  for(const [raw,pose] of [['0',0],['.25',.25],['.5',.5],['.75',.75],['1',1],['0.00',0],['0.250',.25],['5e-1',.5],['.7500',.75],['1.0',1]])assert.deepEqual(parseFlightRoutingArguments(['--case',caseId,'--phase','static','--pose',raw],requiredIds),{caseId,phase:'static',pose,intervalId:null,activityId:null,output:null,resume:null,prerequisites:null});
  for(const phase of flightRoutingMotionPhaseIds)assert.equal(parseFlightRoutingArguments(['--case',caseId,'--phase',phase],requiredIds).phase,phase);
 });
 await check('invalid, duplicate, unknown, and missing selectors fail before construction',async()=>{
  reset();const invalid=[['unexpected'],['--unknown','x'],['--case='+caseId],['--case'],['--phase'],['--pose'],['--output'],['--case',''],['--case','--phase'],['--output','--case',caseId],['--case',caseId+'-unknown'],['--case',' '+caseId],['--phase','deployment'],['--phase','static','--pose','0'],['--pose','.5'],['--case',caseId,'--pose','.5'],['--case',caseId,'--phase','static'],['--case',caseId,'--phase','unknown'],['--case',caseId,'--phase','Deployment'],['--case',caseId,'--phase','deployment','--pose','0'],['--case',caseId,'--prerequisites','{"ok":true}']];
  for(const flag of ['--case','--phase','--pose','--output'])invalid.push(['--case',caseId,'--phase','static','--pose','0','--output','/unused',flag,'0']);
  for(const raw of ['NaN','Infinity','-Infinity','1e309','.1','-.25','1.25','.5junk','0,1','','   '])invalid.push(['--case',caseId,'--phase','static','--pose',raw]);
  for(const args of invalid){await assert.rejects(()=>runner.runFlightRoutingChecks(args,{onProgress:quiet}),Error,JSON.stringify(args));counts.invalidSelectors++;}
  assert.equal(state.sized.length,0);assert.equal(state.constructed.length,0);assert.equal(state.calls.length,0);
 });
 await check('each selected static pose uses one real full-scene audit',async()=>{
  for(const pose of flightRoutingStaticPoses){const f=fixture();try{const result=await auditInstalledFlightConfiguration('fixture',{}, {factory:f,hardware:{},phase:'static',pose,onProgress:quiet});assert.deepEqual(f.poses,[pose]);assert.equal(f.snapshots,1);assert.equal(result.poses.length,1);assert.equal(result.poses[0].counts.routes,2);assert.equal(result.poses[0].counts.obstacles,2);assert.equal(result.executionComplete,true);assert.equal(result.selectedScopePassed,true,JSON.stringify(result.poses[0].issues));assert.equal(result.coverageComplete,false);assert.equal(result.ok,false);assert.deepEqual(result.motion.domains,[]);counts.realStaticPoses++;}finally{f.dispose();}}
 });
 await check('real static diagnostics retain cross-service solids, interline collisions, and inventory failures',async()=>{
  for(const collision of ['fluid-solid','electrical-solid','interline','inventory']){const f=fixture({collision});if(collision==='inventory')f.electrical.routing.lines=[];try{const result=await auditInstalledFlightConfiguration('fixture',{}, {factory:f,hardware:{},phase:'static',pose:.5,onProgress:quiet}),issues=result.poses[0].issues;assert.equal(result.executionComplete,true);assert.equal(result.selectedScopePassed,false);assert.equal(result.ok,false);assert.deepEqual(f.poses,[.5]);assert.equal(f.snapshots,1);if(collision==='interline')assert(issues.some(i=>i.code==='line-collision'));else if(collision==='inventory')assert(issues.some(i=>i.code==='missing-electrical-route'));else assert(issues.some(i=>i.code==='solid-collision'&&i.obstacleId===collision&&i.routeId===(collision==='fluid-solid'?'fixture-wire/0':'fixture-fluid')),JSON.stringify(issues));counts.realGeometryNegatives++;}finally{f.dispose();}}
 });
 await check('CLI static selection persists explicit diagnostic status and never publishes',async()=>{
  reset();const directory=await mkdtemp(path.join(os.tmpdir(),'flight-runner-contract-'));try{const output=path.join(directory,'report.json'),report=await runner.runFlightRoutingChecks(['--case',caseId,'--phase','static','--pose','.25','--output',output],{onProgress:quiet});assert.equal(report.executionComplete,true);assert.equal(report.selectedScopePassed,true);assert.equal(report.coverageComplete,false);assert.equal(report.completeMatrix,false);assert.equal(report.ok,false);assert.deepEqual(state.constructed,[caseId]);assert.deepEqual(state.fixtures[0].poses,[.25]);assert.equal(state.fixtures[0].snapshots,1);assert.equal(state.calls.length,0);assert.deepEqual(JSON.parse(await readFile(output,'utf8')),JSON.parse(JSON.stringify(report)));}finally{await rm(directory,{recursive:true,force:true});}
 });
 await check('all selected motion phases require prerequisites without any construction or fanout',async()=>{
  reset();for(const phase of flightRoutingMotionPhaseIds){const report=await runner.runFlightRoutingChecks(['--case',caseId,'--phase',phase],{onProgress:quiet}),result=report.configurations[0];for(const key of ['ok','executionComplete','selectedScopePassed','coverageComplete','completeMatrix'])assert.equal(report[key],false,key);assert.deepEqual(result.poses,[]);assert.deepEqual(result.motion.domains,[]);assert.deepEqual(result.motion.selectedDomainIds,[phase]);assert(result.motion.issues.some(i=>i.code==='motion-prerequisites-required'));counts.blockedMotionSelections++;}
  const forged=await runner.auditInstalledFlightConfiguration(caseId,{}, {phase:'deployment',inventoryPassed:true,staticPassed:true,prerequisites:{ok:true,sourceUnchanged:true},onProgress:quiet});assert.equal(forged.executionComplete,false);assert.equal(forged.ok,false);assert.equal(state.sized.length,0);assert.equal(state.constructed.length,0);assert.equal(state.calls.length,0);
 });
 await check('real dispatcher selects exactly one existing certifier and restores its deployed precondition',async()=>{
  for(const phase of flightRoutingMotionPhaseIds){reset();const f={id:caseId,pose:.25,poses:[],positionPanels(p){this.pose=p;this.poses.push(p);}},report=await motion.certifyFlightRoutingMotion(f,{}, {phase,onProgress:quiet});assert.deepEqual(report.domains.map(d=>d.id),[phase]);assert.deepEqual(state.calls.map(c=>c.phase),[phase]);assert.deepEqual(f.poses,[1]);assert.equal(report.ok,true);if(phase!=='deployment')assert.equal(state.calls[0].pose,1);counts.selectedDispatcherPhases++;}
 });
 await check('dispatcher rejects unknown selectors before mutating geometry or calling a certifier',async()=>{
  reset();const f={positionPanels(){assert.fail('invalid phase mutated geometry');}};for(const phase of ['','static','Deployment','unknown',0,false,['deployment']])await assert.rejects(()=>motion.certifyFlightRoutingMotion(f,{}, {phase}),/Unknown flight routing motion phase/);assert.equal(state.calls.length,0);
 });
 await check('default dispatcher preserves all five phases and order even after a failed domain',async()=>{
  reset();state.motionFailureCase=caseId;state.motionFailurePhase='deployment';const f={id:caseId,pose:0,positionPanels(p){this.pose=p;}},report=await motion.certifyFlightRoutingMotion(f,{}, {onProgress:quiet});assert.deepEqual(state.calls.map(c=>c.phase),flightRoutingMotionPhaseIds);assert.deepEqual(report.domains.map(d=>d.id),flightRoutingMotionPhaseIds);assert.equal(report.ok,false);assert.equal(report.domains[0].ok,false);
 });
 await check('unfiltered success covers the actual required catalog with all poses and phases',async()=>{
  reset();const report=await runner.runFlightRoutingChecks([],{onProgress:quiet});for(const key of ['ok','executionComplete','selectedScopePassed','coverageComplete','completeMatrix','casesOK'])assert.equal(report[key],true,key);assert.deepEqual(report.requiredConfigurationIds,requiredIds);assert.deepEqual(report.selectedConfigurationIds,requiredIds);assert.deepEqual(state.constructed,requiredIds);assert.deepEqual(state.sized,requiredIds);for(const c of report.configurations){assert.deepEqual(c.poses.map(p=>p.deployment),flightRoutingStaticPoses);assert.deepEqual(c.motion.domains.map(d=>d.id),flightRoutingMotionPhaseIds);assert.deepEqual(state.calls.filter(call=>call.id===c.id).map(call=>call.phase),flightRoutingMotionPhaseIds);}assert.equal(state.calls.length,requiredIds.length*5);assert.equal(state.fixtures.reduce((n,f)=>n+f.snapshots,0),requiredIds.length*5);
 });
 await check('legacy case selection retains full work and cannot publish even a singleton catalog',async()=>{
  for(const singleton of [false,true]){reset();if(singleton)state.catalog=[caseId];const report=await runner.runFlightRoutingChecks(['--case',caseId],{onProgress:quiet});assert.equal(report.executionComplete,true);assert.equal(report.selectedScopePassed,true);assert.equal(report.casesOK,true);assert.equal(report.completeMatrix,false);assert.equal(report.coverageComplete,false);assert.equal(report.ok,false);assert.deepEqual(report.configurations[0].poses.map(p=>p.deployment),flightRoutingStaticPoses);assert.deepEqual(state.calls.map(c=>c.phase),flightRoutingMotionPhaseIds);assert.deepEqual(state.constructed,[caseId]);}
  reset();state.catalog=[caseId];const report=await runner.runFlightRoutingChecks(['--case',caseId,'--phase','static','--pose','1'],{onProgress:quiet});assert.equal(report.selectedScopePassed,true);assert.equal(report.ok,false);assert.equal(report.completeMatrix,false);assert.equal(report.coverageComplete,false);
 });
 await check('failed static geometry blocks default motion without skipping other required cases',async()=>{
  reset();state.staticFailureCase=caseId;const report=await runner.runFlightRoutingChecks([],{onProgress:quiet}),failed=report.configurations.find(c=>c.id===caseId);assert.equal(report.ok,false);assert.equal(report.completeMatrix,true);assert.equal(report.executionComplete,false);assert.equal(report.coverageComplete,false);assert.equal(report.selectedScopePassed,false);assert.equal(report.casesOK,false);assert.deepEqual(state.constructed,requiredIds);assert.equal(failed.poses.length,5);assert(failed.poses.every(p=>!p.ok));assert.deepEqual(failed.motion.domains,[]);assert(failed.motion.issues.some(i=>i.code==='motion-prerequisite-failed'));assert.equal(state.calls.filter(c=>c.id===caseId).length,0);assert.equal(state.calls.length,(requiredIds.length-1)*5);assert(report.configurations.filter(c=>c.id!==caseId).every(c=>c.ok));
 });
 await check('full matrix motion failure retains completed coverage and blocks publication',async()=>{
  reset();state.motionFailureCase=caseId;state.motionFailurePhase='solar-tracking';const report=await runner.runFlightRoutingChecks([],{onProgress:quiet});assert.equal(report.executionComplete,true);assert.equal(report.completeMatrix,true);assert.equal(report.coverageComplete,true);assert.equal(report.casesOK,false);assert.equal(report.selectedScopePassed,false);assert.equal(report.ok,false);assert.equal(state.calls.length,requiredIds.length*5);assert.deepEqual(report.configurations[0].motion.domains.map(d=>d.id),flightRoutingMotionPhaseIds);
 });
 await check('a construction exception remains incomplete and other catalog rows still execute',async()=>{
  reset();state.throwCase=caseId;const errors=[],original=console.error;let report;try{console.error=message=>errors.push(message);report=await runner.runFlightRoutingChecks([],{onProgress:quiet});}finally{console.error=original;}assert.equal(report.ok,false);assert.equal(report.completeMatrix,true);assert.equal(report.executionComplete,false);assert.equal(report.coverageComplete,false);assert.match(report.configurations[0].error,/fixture construction failure/);assert.equal(errors.length,1);assert.equal(report.configurations.length,requiredIds.length);assert(report.configurations.slice(1).every(c=>c.ok));
 });
 await check('real CLI rejects invalid selectors and blocks selected motion within a finite timeout',()=>{
  for(const args of [['--case',caseId,'--phase','static','--pose','.5junk'],['--case',caseId,'--phase','deployment']]){const result=spawnSync(process.execPath,[runnerURL.pathname,...args],{encoding:'utf8',timeout:10000,maxBuffer:1024*1024});assert.equal(result.error,undefined);assert.equal(result.signal,null);assert.equal(result.status,1);if(args.includes('static'))assert.match(result.stderr,/--pose requires --phase static/);else {assert.match(result.stdout,/executionComplete/);assert.match(result.stdout,/motion-prerequisites-required/);assert.doesNotMatch(result.stdout,/deployment [0-9]:/);}}
 });
 console.log(JSON.stringify({ok:true,groups:groups.length,...counts,durationS:(Date.now()-started)/1000,scope:'Finite runner/dispatcher contract tests with stubbed expensive certifiers and real tiny full-scene static geometry; no shipped geometry matrix certification.'}));
 console.log('Flight routing runner: '+groups.join('; ')+'.');
}finally{reset();delete globalThis.__flightRoutingRunnerContract;}
