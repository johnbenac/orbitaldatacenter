import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as T from './dist/vendor/three.module.js';
import {constantLengthHingeRoute} from './dist/connection-installation-geometry.js';
import {roundedConnectionRoute} from './dist/connection-routes.js';
import {connectionTube} from './dist/connection-geometry.js';
import {routeFromTube} from './dist/routing-audit.js';
import {launchConnectionLengthEvidence} from './dist/launch-umbilical-visuals.js';
import {routingSourceFingerprint,sameRoutingSourceFingerprint} from './scripts/routing-source-fingerprint.mjs';
import {validLaunchDomainProof,mergeLaunchRoutingReports,runLaunchRoutingChecks,launchRoutingStationaryModel} from './launch-routing-checks.mjs';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'routing-source-check-'));
try{
 fs.mkdirSync(path.join(root,'dist'));fs.mkdirSync(path.join(root,'.private'));
 fs.writeFileSync(path.join(root,'entry.mjs'),"import {value} from './dep.js'; export {value};\n");
 fs.writeFileSync(path.join(root,'dep.js'),'export const value=1;\n');fs.writeFileSync(path.join(root,'dist','catalog.json'),'{"length":1}');fs.writeFileSync(path.join(root,'.private','ignored.json'),'{"private":1}');
 const fingerprint=()=>routingSourceFingerprint({root,entries:['entry.mjs']}),before=fingerprint();assert.deepEqual(before.files.map(f=>f.path),['dep.js','dist/catalog.json','entry.mjs']);assert(sameRoutingSourceFingerprint(before,fingerprint()));
 fs.writeFileSync(path.join(root,'dep.js'),'export const value=2;\n');assert(!sameRoutingSourceFingerprint(before,fingerprint()));fs.writeFileSync(path.join(root,'dep.js'),'export const value=1;\n');assert(sameRoutingSourceFingerprint(before,fingerprint()));
 fs.writeFileSync(path.join(root,'dist','catalog.json'),'{"length":2}');assert(!sameRoutingSourceFingerprint(before,fingerprint()));fs.writeFileSync(path.join(root,'dist','catalog.json'),'{"length":1}');
 fs.writeFileSync(path.join(root,'.private','ignored.json'),'{"private":2}');assert(sameRoutingSourceFingerprint(before,fingerprint()));
 const forged=structuredClone(before);forged.files[0].sha256='changed';assert(!sameRoutingSourceFingerprint(before,forged));
}finally{fs.rmSync(root,{recursive:true,force:true});}

const domain={id:'withdrawal',kind:'ground',start:0,end:1},proof={...domain,ok:true,issueCount:0,issues:[],unresolvedIntervals:0,samples:5,certifiedIntervals:2,intervals:[{start:0,end:.4,clearanceLowerBoundM:.001},{start:.4,end:1,clearanceLowerBoundM:.002}]};
assert(validLaunchDomainProof(proof,domain));
for(const mutate of [p=>p.intervals[1].start=.5,p=>p.intervals[1].end=.9,p=>p.intervals[0].clearanceLowerBoundM=0,p=>p.intervals[0].clearanceLowerBoundM=NaN,p=>p.intervals[0].clearanceLowerBoundM='1',p=>p.unresolvedIntervals=1,p=>p.issueCount=1,p=>p.issues.push({code:'solid-collision'}),p=>p.samples=0,p=>p.certifiedIntervals=3,p=>p.kind='flight']){const invalid=structuredClone(proof);mutate(invalid);assert.equal(validLaunchDomainProof(invalid,domain),false);}
const stale=runLaunchRoutingChecks({resume:{schema:'orbital-launch-routing-partial/v1',sourceUnchanged:true,sourceFingerprint:{algorithm:'sha256',value:'old',files:[]},completedCases:[]}});assert.equal(stale.ok,false);assert(stale.issues.some(i=>i.code==='stale-launch-checkpoint'));
const source=routingSourceFingerprint({entries:['launch-routing-checks.mjs']}),incomplete=mergeLaunchRoutingReports([{schema:'orbital-launch-routing-audit/v1',sourceFingerprint:source,sourceUnchanged:true,coverage:{selectedComplete:true},issues:[],cases:[]}]);assert.equal(incomplete.ok,false);assert.equal(incomplete.issues.filter(i=>i.code==='missing-launch-case').length,15);
const duplicates=mergeLaunchRoutingReports([{schema:'orbital-launch-routing-audit/v1',sourceFingerprint:source,sourceUnchanged:true,coverage:{selectedComplete:true},issues:[],cases:[{launcher:'terran',site:'cape-lc16',ok:true},{launcher:'terran',site:'cape-lc16',ok:true}]}]);assert.equal(duplicates.ok,false);assert(duplicates.issues.some(i=>i.code==='duplicate-launch-case'));assert(duplicates.issues.some(i=>i.code==='invalid-launch-case-proof'));
const mixed=mergeLaunchRoutingReports([{schema:'orbital-launch-routing-audit/v1',sourceFingerprint:source,sourceUnchanged:false,coverage:{selectedComplete:true},issues:[],cases:[]}]);assert(mixed.issues.some(i=>i.code==='stale-launch-source'));
const geometry={heightM:100,fairingRadiusM:4,upperLengthM:30,lowerLengthM:60},clock={stageSeparation:170,boostbackCutoff:215,boosterSeparation:128,release:540,releaseClear:600},movingDomain={kind:'ground',start:0,end:4,clock},heldDomain={...movingDomain,start:4,end:10},moving=launchRoutingStationaryModel(movingDomain,geometry,clock,'starship'),held=launchRoutingStationaryModel(heldDomain,geometry,clock,'starship'),loop={kind:'route',record:{motion:{type:'launch-loop',owner:'ground',release:{motionStart:0,motionEnd:2},clearanceM:2,bendRadiusM:.1,minPerpendicularM:1,maxEndpointSeparationM:4}}};
assert.equal(held.stationaryMotionBound(5,6,loop),0);
assert(moving.stationaryMotionBound(3,4,loop)>0,'a locally held loop remains active when its full domain changed from the baseline');
assert.equal(held.stationaryMotionBound(5,6,{kind:'route',record:{motion:{type:'rigid',owner:'ground'}}}),0);
assert(held.stationaryMotionBound(5,6,{kind:'obstacle',record:{motion:{type:'rigid',owner:'lower'}}})>0,'rising hardware cannot reuse fixed pad pairs');
assert.equal(held.stationaryMotionBound(5,6,{kind:'obstacle',record:{motion:{type:'undeclared-joint',owner:'ground'}}}),Infinity);
assert.equal(held.stationaryMotionBound(5,6,{kind:'route',record:{motion:{type:'rigid',owner:'unknown'}}}),Infinity);
assert.equal(held.stationaryMotionBound(5,6,{kind:'route',record:{motion:{type:'launch-loop',owner:'ground'}}}),Infinity);

const parent=new T.Group(),material=new T.MeshBasicMaterial(),radius=.3192,restLengthM=11.852779841323308,fixedControls=[[-2,0,0],[0,0,0]],fixedTube=connectionTube(parent,{radius:.0532,material,bendRadiusM:radius,segments:192}),flexTube=connectionTube(parent,{radius:.0532,material,bendRadiusM:radius,segments:128});fixedTube.update(fixedControls);
const tail={connection:{id:'skew-launch-loop'},bendRadiusM:radius,restLengthM,routingPlan:{controlPoints:fixedControls},fixedDevelopedLengthM:2,fixedTube,flexTube};let maximumPhysicalErrorM=0,maximumChordDeficitM=0;
for(let i=0;i<=100;i++){
 const end=[-8+6*i/100,-1.6768,0];tail.flexControls=constantLengthHingeRoute([0,0,0],end,{outward:[1,0,0],restLengthM,bendRadiusM:radius,lengthMetric:'developed'});flexTube.update(tail.flexControls);
 const a=routeFromTube(fixedTube),b=routeFromTube(flexTube),evidence=launchConnectionLengthEvidence(tail,a,b);assert(evidence.ok,JSON.stringify(evidence.issues));maximumPhysicalErrorM=Math.max(maximumPhysicalErrorM,evidence.physicalErrorM);maximumChordDeficitM=Math.max(maximumChordDeficitM,evidence.chordDeficitM);
 const d=Math.hypot(...end),h=Math.hypot(end[1],end[2]),analyticLead=(restLengthM-d-Math.PI*radius+4*radius*d/h)/2;assert(Math.abs(tail.flexControls[1][0]-analyticLead)<=restLengthM/2**28+1e-10);
}
const a=routeFromTube(fixedTube),b=routeFromTube(flexTube),valid=launchConnectionLengthEvidence(tail,a,b);tail.restLengthM+=.0001;const stretched=launchConnectionLengthEvidence(tail,a,b);assert(stretched.issues.some(issue=>issue.code==='launch-physical-cut-length'));assert(.0001<valid.maximumChordDeficitM,'physical length drift below the display chord deficit must still fail');tail.restLengthM-=.0001;
const controls=tail.flexControls;tail.flexControls=[[0,0,0],[1,0,0],[1,1,0],[0,1,0]];assert(launchConnectionLengthEvidence(tail,a,b).issues.some(issue=>issue.code==='launch-length-recipe-mismatch'));tail.flexControls=controls;
const claimed=flexTube.route.developedLengthM;flexTube.route.developedLengthM=999;assert(launchConnectionLengthEvidence(tail,a,b).ok,'a mutable declared length is not used as measurement');flexTube.route.developedLengthM=claimed;
const moved=structuredClone(b);moved.points=moved.points.map(point=>point.map(value=>value*1.001));assert(launchConnectionLengthEvidence(tail,a,moved).issues.some(issue=>issue.code==='launch-rendered-cut-length'));
for(const h of [.185,.25,.5]){const defaultRoute=roundedConnectionRoute(constantLengthHingeRoute([0,0,0],[0,h,0],{outward:[1,0,0],restLengthM:.98,bendRadiusM:.084}),.084);assert(Math.abs(defaultRoute.lengthM-.98)<1e-8);assert(Math.abs(defaultRoute.developedLengthM-defaultRoute.lengthM-Math.PI*.084*(1-Math.sin(Math.PI/32)/(Math.PI/32)))<1e-10);}
assert.throws(()=>constantLengthHingeRoute([0,0,0],[0,1,0],{outward:[1,0,0],restLengthM:4,lengthMetric:'unknown'}));
console.log(JSON.stringify({ok:true,skewDevelopedLengthPoses:101,maximumPhysicalErrorM,maximumRenderedChordDeficitM:maximumChordDeficitM,physicalLengthDriftNegativeM:.0001}));
console.log('Launch runner: exact source invalidation, private-file exclusion, stale checkpoints, missing/duplicate cases, incomplete intervals, unresolved proofs, strict whole-domain stationary classification and independent physical/display length checks all passed.');
