import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createSimulation} from './dist/model.js';
import {chapters} from './dist/flight-chapters.js';
import {chapterPhase,flightChapters} from './dist/lifecycle.js';
import {domainIds,domainNav,observationCard} from './dist/matrix-ui.js';
import {domains} from './dist/domain-analysis.js';
import {addToShelf,missionPreset,parsePreset,presetList,presetShelf,readShelf,writeShelf} from './dist/mission-presets.js';
import {encodeScenario,decodeScenario} from './dist/exports.js';

const reference=presetList.find(p=>p.id==='reference');
const sim=createSimulation(reference.h);
assert.deepEqual(presetList.map(p=>p.h.trays),[4,12,12,26,981]);
assert.ok(presetList.find(p=>p.id==='optical').h.initialQueueGB>reference.h.initialQueueGB);
assert.ok(presetList.slice(0,4).every(p=>p.h.fit&&p.h.massMarginKg>=0));
assert.ok(!presetList.at(-1).h.fit&&presetList.at(-1).h.massMarginKg<0);

const custom=missionPreset({id:'user-test-fixture',name:'Night-shift node',description:'Short duty cycle',design:{...reference.design,duty:.2},solver:'workload',thermalTargets:{batteryOpMinK:'derive'}});
const loaded=parsePreset(JSON.stringify(custom));
assert.deepEqual(loaded,custom);
const first=addToShelf([],loaded),same=addToShelf(first.shelf,loaded);
assert.equal(same.shelf,first.shelf);
const changed=addToShelf(first.shelf,{...loaded,description:'Other configuration'});
assert.equal(changed.shelf.length,2);assert.notEqual(changed.record.id,loaded.id);
const records=new Map(),storage={getItem:k=>records.get(k),setItem:(k,v)=>records.set(k,v)};
writeShelf(storage,changed.shelf);assert.deepEqual(readShelf(storage),changed.shelf);
assert.throws(()=>parsePreset(JSON.stringify({schema:'odc-scenario/1'})),/mission preset JSON/);
assert.throws(()=>missionPreset({...custom,name:''}),/name/);
const shelf=presetShelf({preset:loaded.id,presetName:loaded.name},[loaded]);
assert.match(shelf,/aria-label="Mission presets"/);assert.ok(shelf.includes('data-design="'+loaded.id+'" aria-pressed="true"'));
for(const p of presetList)assert.ok(shelf.includes('data-design="'+p.id+'"'));

assert.deepEqual(domainIds,Object.keys(domains));
for(const phase of 'ABCDEF')for(const domain of domainIds){
 const nav=domainNav({phase,domain});
 assert.equal((nav.match(/data-domain=/g)||[]).length,12);
 assert.equal((nav.match(/aria-current="page"/g)||[]).length,1);
 const selected=nav.match(/<button[^>]*aria-current="page"[^>]*>/)[0];
 assert.ok(selected.includes('data-domain="'+domain+'"'),phase+' '+domain);
}
const modelChapters=sim.story();
assert.deepEqual(modelChapters.map(c=>c.id),chapters.map(c=>c.id));
let previous=-Infinity;
for(const c of chapters){
 const e=sim.story(c.id);assert.equal(e.status,'available');assert.ok(e.start>=previous);previous=e.end;
 assert.ok(e.start<=e.instant&&e.instant<=e.end);
 const phase=chapterPhase(c.id),view={phase,domain:c.page,preset:'reference',chapter:c.id,t:e.instant,camera:c.camera,event:e};
 const flightNav=flightChapters(view);
 assert.ok(flightNav.includes('data-chapter="'+c.id+'" aria-current="step"'));
 const siblings=chapters.filter(ch=>chapterPhase(ch.id)===phase);
 assert.equal((flightNav.match(/data-chapter=/g)||[]).length,siblings.length);
 const ctx={hardware:reference.h,state:sim.at(e.instant),sim,events:[],day:{}};
 const panel=observationCard(view,ctx,'MET');
 assert.match(panel,/data-action="flightplay"/);assert.doesNotMatch(panel,/NaN|undefined|Infinity/);
 const scenario={schema:'odc-scenario/1',modelVersion:'4.0',design:reference.design,view};
 assert.deepEqual(decodeScenario(encodeScenario(scenario)),scenario);
}
const assets=JSON.parse(readFileSync(new URL('./dist/assets.json',import.meta.url),'utf8'));
assert.equal(new Set(assets).size,assets.length);
for(const file of assets)assert.ok(statSync(new URL('./dist/'+file,import.meta.url)).isFile(),file);
for(const file of ['app.js','matrix-ui.js','matrix.css','mission-presets.js','flight-chapters.js','domain-analysis.js','domain-analysis.css','deployment.js','entry.js','disposal-views.js'])assert.ok(assets.includes(file),file);
console.log('Five launch studies, portable preset persistence and conflict handling, twelve-domain navigation across six phases, ordered flight chapters, URL replay and packaged assets passed.');
