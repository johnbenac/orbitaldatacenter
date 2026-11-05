import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {defaults,applyPreset,sizeDesign,sizingEnvelope,inverseSolve} from './dist/design.js';
import {fairings,radiusAt,fairingFit} from './dist/fairings.js';
import {enclosureHeat,solveOuter} from './dist/enclosure.js';
import {createSimulation} from './dist/model.js';
import {chronologicalAudit} from './dist/mission-worker.js';
import {makePacket} from './dist/exports.js';
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<=tol,`${a} vs ${b}`);
const h=sizeDesign(defaults),e=h.enclosure;
for(const id of Object.keys(fairings)){
 const model=sizeDesign(applyPreset(defaults,'launcher',id)),f=model.fairing;
 assert.equal(f.override,false);assert.ok(f.maxDiameterM<f.outerDiameterM);assert.equal(f.fit,f.radialClearanceM>=0&&f.axialClearanceM>=0);
 for(const [z,r] of f.profile)near(radiusAt(f.profile,z),r);
 const custom=sizeDesign({...model.input,fairingLengthM:f.heightM*.4});assert.ok(custom.fairing.override&&!custom.fit);
}
assert.ok(h.fairing.fit);assert.ok(!sizeDesign(applyPreset(defaults,'launcher','falconHeavy')).fairing.fit);
const smallR=fairingFit({...defaults,radialPaddingM:0},[{part:'Test',z0M:3,z1M:4,lengthM:1,radiusM:2.39}]);
assert.ok(smallR.fit);assert.ok(!fairingFit(defaults,smallR.stack).fit);
assert.equal(new Set(e.walls.map(w=>w.axis+w.sign)).size,6);
near(e.coveredAreaM2+e.penetrationM2,2*(h.bodyHeightM*h.bodyWidthM+h.bodyLengthM*(h.bodyWidthM+h.bodyHeightM)));
for(const [id,key] of [['shield','shieldKg'],['skin','skinKg'],['blanket','blanketKg'],['structure','frameKg']])near(h.massLedger.find(r=>r.id===id).kg,e[key]);
assert.ok(solveOuter(e,300,0,0).outwardKW>0);
assert.ok(solveOuter(e,200,1361,230).outwardKW<0);
near(enclosureHeat(e,250,250).outwardKW,0);
for(const [interior,sw,ir] of [[300,0,0],[325,400,238],[200,1361,0],[390,1000,150]]){
 const {outerK,outwardKW}=solveOuter(e,interior,sw,ir);
 const net=e.coveredAreaM2*(e.exteriorEmissivity*5.670374419e-8*(outerK**4-3**4)-sw*e.exteriorAbsorptivity-ir*e.exteriorEmissivity);
 near(net,outwardKW*1000,1e-6);
}
const envelope=sizingEnvelope(h);assert.ok(envelope.disposalBudgetDv>defaults.disposalDv);
const study={...defaults,missionYears:.003},hw=sizeDesign(study),sim=createSimulation(hw),audit=chronologicalAudit(hw).result;
const story=sim.story();assert.ok(story.some(c=>c.id==='integration'&&c.instant<0));assert.ok(story.some(c=>c.id==='deorbit'));
assert.ok(Number.isFinite(sim.at(3000).enclosureLeakKW));assert.ok(Number.isFinite(audit.energyKWh.enclosureOutward));
const module={exports:{}},context={module,exports:module.exports,require,Buffer,Promise,setImmediate,clearImmediate,setTimeout,clearTimeout,ArrayBuffer,Uint8Array,Blob,TextEncoder,TextDecoder};
function require(name){throw new Error('Unexpected dependency '+name)}
runInNewContext(readFileSync(new URL('./dist/vendor/jszip.min.js',import.meta.url),'utf8'),context);
globalThis.JSZip=module.exports;
let exported;
globalThis.document={createElement:()=>({click(){},remove(){}}),body:{append(){}}};
globalThis.URL.createObjectURL=blob=>{exported=blob;return 'blob:geometry-checks';};
const originalTimer=globalThis.setTimeout;
globalThis.setTimeout=(handler,ms,...args)=>{const t=originalTimer(handler,ms,...args);if(ms===30000)t.unref();return t};
const t=sim.story('contact').instant,view={page:'overview',chapter:'contact',camera:'spacecraft',preset:'reference',t,start:0,event:sim.story('contact')};
exported=await makePacket({scenario:{schema:'odc-scenario/1',modelVersion:'2',design:study,view},hardware:hw,sim,result:inverseSolve(study),snap:sim.at(t),day:sim.daySummary(0),events:sim.events(0,86400),audit});
const zip=await JSZip.loadAsync(await exported.arrayBuffer());
for(const file of ['mechanical/installed-stations.csv','mechanical/component-resources.csv','mechanical/launch-mass-properties.json','mechanical/terminal-disposition.json','attitude/gyro-benchmark.json','design/master-equipment-list.csv','design/mass-rollup.json','propulsion/geometric-screens.csv','propulsion/depletion-mass-properties.csv','propulsion/tank-installation.csv','propulsion/engine-stations.csv','design/launch-vehicle.json','design/fairing-fit.csv','design/fairing-stations.csv','design/stowed-stack.csv','design/enclosure-walls.csv','operations/chapter-samples.csv','operations/selected-story.json','operations/disposal.json','PDR.html'])assert.ok(zip.file(file),file);
const carrier=JSON.parse(await zip.file('design/launch-vehicle.json').async('text'));
assert.equal(carrier.selection,hw.input.launcher);assert.equal(carrier.reference.referenceKg,hw.input.referenceKg);
near(carrier.limitingMassScreenKg,hw.launchScreenMarginKg);assert.ok(carrier.reference.sourceUrl.startsWith('https://'));
const metadata=JSON.parse(await zip.file('operations/selected-story.json').async('text'));assert.equal(metadata.chapter,'contact');assert.equal(metadata.elapsedSeconds,t);
const report=await zip.file('PDR.html').async('text');assert.ok(report.includes('Global')||report.includes('Stowed payload clearance'));assert.ok(report.includes('Enclosure and heat transfer'));assert.ok(report.includes('Master equipment list'));near(JSON.parse(await zip.file('design/mass-rollup.json').async('text')).launchKg,hw.launchKg);
console.log('Ten fairing presets, taper and motion allowances, six wall masses, signed shell heat balance, flight thermal channel, disposal allocation and generated quantitative PDR ZIP passed.');
