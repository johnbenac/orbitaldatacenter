// Actual ZIP round trip using the bounded scenario from geometry-checks.mjs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {posix} from 'node:path';
import {runInNewContext} from 'node:vm';
import {performance} from 'node:perf_hooks';
import {defaults,sizeDesign,inverseSolve} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {chronologicalAudit} from './dist/mission-worker.js';
import {makePacket,restoreFile,packetIdentity} from './dist/exports.js';
import {designIdentity} from './dist/design-contract.js';
import {pdrDomainOrder} from './dist/pdr-assessment.js';
import {goldRules,reservedRules} from './dist/mission-gold-rules.js';
import {deploymentInterfaces} from './dist/architecture-trades.js';

const started=performance.now(),plain=v=>JSON.parse(JSON.stringify(v));
const study={...defaults,missionYears:.003,serviceRoute:'relay',relayDownMbps:100,initialQueueGB:10000};
const hardware=sizeDesign(study),sim=createSimulation(hardware);
assert.equal(hardware.input.missionYears,.003);
assert.ok(sim.duration<2*86400,'Never run the long default mission in this export test');
console.log('PDR export: bounded mission',sim.duration,'seconds');
const audit=chronologicalAudit(hardware).result;

const module={exports:{}};
function require(name){throw Error('Unexpected bundled JSZip dependency '+name);}
runInNewContext(readFileSync(new URL('./dist/vendor/jszip.min.js',import.meta.url),'utf8'),{module,exports:module.exports,require,Buffer,Promise,setImmediate,clearImmediate,setTimeout,clearTimeout,ArrayBuffer,Uint8Array,Blob,TextEncoder,TextDecoder});
globalThis.JSZip=module.exports;
const event=sim.story('contact'),t=event.instant,view={page:'overview',chapter:'contact',domain:'orbit',phase:'B',camera:'spacecraft',preset:'reference',t,start:0,event};
const scenario={schema:'odc-scenario/1',modelVersion:'21.0',design:study,view};
const packet=await makePacket({scenario,hardware,sim,result:inverseSolve(study),snap:sim.at(t),day:sim.daySummary(0),events:sim.events(0,86400),audit});
const bytes=new Uint8Array(await packet.arrayBuffer());
const zip=await JSZip.loadAsync(bytes),files=Object.keys(zip.files).filter(path=>!zip.files[path].dir);
const text=async path=>{assert.ok(zip.file(path),'Missing archive file: '+path);return zip.file(path).async('text');};
const json=async path=>JSON.parse(await text(path));

// Exercise the application's ZIP-import branch with a named byte container.
bytes.name='ODC-short-PDR.zip';bytes.size=bytes.length;
const restored=await restoreFile(bytes);
assert.deepEqual(restored,plain(scenario));
const rebuilt=sizeDesign(restored.design);
assert.deepEqual(rebuilt.input,hardware.input,'ZIP import must recover every normalized design input');

const baseline=await json('mission-baseline/mission-baseline.json');
const record=await json('domains/assessments.json');
const identity=await json('design/configuration-contract.json');
const revision=await json('review-revision.json');
assert.equal(baseline.baseline.id,'ODC-MB-001');assert.equal(baseline.baseline.revision,'B');
assert.deepEqual(baseline.configuration.designInputs,plain(hardware.input));
assert.deepEqual(record.configuration,plain(hardware.input));
assert.deepEqual(record,baseline.domainAssessments);
assert.deepEqual(identity,record.identity);assert.deepEqual(identity,plain(designIdentity(rebuilt)));
assert.deepEqual({...identity.installed.inputs,...identity.mission,...identity.analysisBasis,...identity.controlledAllowances},plain(hardware.input),'Configuration contract must reconstruct all input groups exactly');
const groupedKeys=[...Object.keys(identity.installed.inputs),...Object.keys(identity.mission),...Object.keys(identity.analysisBasis),...Object.keys(identity.controlledAllowances)];
assert.equal(new Set(groupedKeys).size,groupedKeys.length,'No input can appear in two configuration groups');
assert.equal(revision.revision,packetIdentity(scenario,sim.duration).revision);
assert.equal(revision.mission_baseline_id,baseline.baseline.id);assert.equal(revision.mission_baseline_revision,baseline.baseline.revision);
assert.equal(record.scope.instantSeconds,t);assert.equal(record.scope.windowStartSeconds,0);assert.equal(record.scope.missionYears,.003);

assert.deepEqual(record.domains.map(r=>r.id),pdrDomainOrder);assert.equal(record.domains.length,17);
const domainJson=files.filter(path=>/^domains\/[^/]+\/design-assessment\.json$/.test(path));
const graphics=files.filter(path=>/^domains\/[^/]+\/design-graphic\.svg$/.test(path));
assert.equal(domainJson.length,17);assert.equal(graphics.length,17);
let checks=0;
for(const report of record.domains){
 assert.deepEqual(await json(`domains/${report.id}/design-assessment.json`),report);
 const graphic=await text(`domains/${report.id}/design-graphic.svg`);
 assert.equal(graphic,report.graphic);assert.match(graphic,/<svg\b/);assert.match(graphic,/viewBox=/);
 assert.doesNotMatch(graphic,/NaN|Infinity|undefined/);
 assert.equal(report.vehicleId,identity.vehicleId);assert.equal(report.missionId,identity.missionId);
 assert.match(report.reviewStatus,/^Open/);
 assert.ok(report.reviewActions.every(action=>action.status==='open'&&action.closureEvidence===null));
 for(const supplemental of report.supplementalGraphics||[]){const svg=await text(`domains/${report.id}/${supplemental.id}.svg`);assert.equal(svg,supplemental.svg);assert.doesNotMatch(svg,/NaN|Infinity|undefined/);}
 assert.ok(['inside','outside','unassessed'].includes(report.applicability.status));
 assert.equal(report.evidenceStatus,'open');
 checks+=report.checks.length;
}

function csvRows(source){
 const rows=[];let cells=[],cell='',quoted=false;
 for(let i=0;i<source.length;i++){
  const c=source[i];
  if(c==='"'){if(quoted&&source[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){cells.push(cell);cell='';}
  else if((c==='\r'||c==='\n')&&!quoted){if(c==='\r'&&source[i+1]==='\n')i++;cells.push(cell);rows.push(cells);cells=[];cell='';}
  else cell+=c;
 }
 if(cell||cells.length){cells.push(cell);rows.push(cells);}
 assert.equal(quoted,false,'CSV quote must be closed');
 const keys=rows.shift();return rows.map(row=>{assert.equal(row.length,keys.length);return Object.fromEntries(keys.map((key,i)=>[key,row[i]]));});
}
const exportedChecks=csvRows(await text('domains/requirements-and-evidence.csv'));
assert.equal(exportedChecks.length,checks);
assert.equal(new Set(exportedChecks.map(c=>c.id)).size,checks);
for(const report of record.domains)for(const check of report.checks){
 const row=exportedChecks.find(c=>c.id===check.id);assert.ok(row);
 assert.equal(row.status,check.status);assert.equal(row.vehicleId,identity.vehicleId);assert.equal(row.missionId,identity.missionId);
 assert.deepEqual(JSON.parse(row.ruleIds),check.ruleIds);
}

const program=await json('mission-baseline/architecture-program.json');
assert.deepEqual(program,baseline.architectureProgram);assert.equal(program.graphics.length,7);assert.equal(program.gaps.length,12);assert.equal(program.workProducts.length,6);
assert.deepEqual(program.deploymentInterfaces,plain(deploymentInterfaces),'Architecture export must preserve every commissioning stage, authority, gate and evidence product');
for(const graphic of program.graphics)assert.equal(await text(`interfaces/${graphic.id}.svg`),graphic.svg);
assert.deepEqual(await json('design/energy-system.json'),plain(hardware.energySystem));
assert.deepEqual(await json('design/service-architecture.json'),plain(hardware.serviceArchitecture));
assert.deepEqual(await json('design/architecture-trade.json'),plain(hardware.architecture));
assert.deepEqual(await json('design/applicability.json'),plain(hardware.applicability));
const mel=await json('design/master-equipment-list.json');assert.ok(Math.abs(mel.totals.closureKg)<1e-8);
assert.equal(mel.rows.find(r=>r.wbs==='02.03').interfaceDefinition.family.primaryV,hardware.energySystem.electrical.family.primaryV);
assert.match(await text('mission-baseline/architecture-program.html'),/Architecture and engineering interfaces/);
const illumination=await json('operations/seasonal-illumination.json');assert.equal(illumination.samples.length,50);assert.equal(illumination.continuousSunClaim,false);

const html=await text('domains/preliminary-designs.html');
for(const id of pdrDomainOrder)assert.ok(html.includes(`data-pdr-domain="${id}"`));
const embedded=html.match(/<script type="application\/json" id="pdr-domain-record">([\s\S]*?)<\/script>/);
assert.ok(embedded);assert.deepEqual(JSON.parse(embedded[1]),record);
const main=await text('PDR.html');
assert.ok(main.includes('href="domains/preliminary-designs.html"'));
assert.ok(main.includes('href="mission-baseline/mission-baseline.html"'));
assert.match(main,/does not record flight qualification or independent PDR acceptance/);
assert.match(record.reviewStatus,/^Open/);assert.match(baseline.reviewStatus,/^Open/);
const qualification=await json('thermal/qualification.json');
assert.equal(qualification.assessmentStatus,'unassessed');assert.match(qualification.assessmentType,/not qualification evidence/);
assert.deepEqual(qualification.missionBaseline,{id:baseline.baseline.id,revision:baseline.baseline.revision});

// Every relative HTML/SVG resource reference must resolve inside the archive.
const missing=[],checkedLinks=[];
for(const path of files.filter(path=>/\.(?:html|svg)$/.test(path))){
 const content=await text(path);
 for(const match of content.matchAll(/\b(?:href|src|xlink:href)\s*=\s*(["'])(.*?)\1/g)){
  const url=match[2].replaceAll('&amp;','&');
  if(!url||/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url))continue;
  const relative=url.split(/[?#]/)[0];if(!relative)continue;
  const target=posix.normalize(posix.join(posix.dirname(path),decodeURIComponent(relative)));
  checkedLinks.push({path,url,target});if(!zip.file(target))missing.push({path,url,target});
 }
}
assert.deepEqual(missing,[],'All local HTML and graphic assets must be packaged');

assert.equal(baseline.goldRules.rules.length,77);assert.equal(baseline.goldRules.reserved.length,59);
assert.deepEqual(baseline.goldRules.rules,plain(goldRules));assert.deepEqual(baseline.goldRules.reserved,plain(reservedRules));
assert.equal(csvRows(await text('mission-baseline/goddard-rule-dispositions.csv')).length,77);
assert.deepEqual(await json('mission-baseline/margin-policy.json'),baseline.marginPolicy);
assert.deepEqual(await json('mission-baseline/pdr-evidence.json'),baseline.pdrEvidence);
assert.deepEqual(await json('mission-baseline/equipment-maturity.json'),baseline.currentAssessment.maturity);

console.log(JSON.stringify({status:'PASS',seconds:+((performance.now()-started)/1000).toFixed(2),missionSeconds:sim.duration,archiveBytes:packet.size,files:files.length,domains:record.domains.length,graphics:graphics.length,checks,configurationInputs:Object.keys(record.configuration).length,vehicleId:identity.vehicleId,missionId:identity.missionId,localLinksChecked:checkedLinks.length,missingAssets:missing.length,roundTrip:'exact',thermalAssessmentStatus:qualification.assessmentStatus,pdrAcceptance:'open'},null,2));
