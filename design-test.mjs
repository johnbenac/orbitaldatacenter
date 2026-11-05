import assert from 'node:assert/strict';
import {defaults,sizeDesign,inverseSolve,checks,presets,applyPreset,estimateLife,validateDesign,enumeratePresets} from './dist/design.js';
import {DEPLOY_END_S} from './dist/commissioning-clock.js';
import {createSimulation} from './dist/model.js';
const reference=sizeDesign(applyPreset(defaults,'launcher','glenn'));for(const r of checks())assert.ok(r.pass,r.name);assert.deepEqual(reference.errors,[]);
for(const [key,items] of Object.entries(presets))for(const [id,entry] of Object.entries(items)){const d=applyPreset(defaults,key,id),h=sizeDesign(d);assert.equal(h.input[key],id);assert.ok(Number.isFinite(h.wetKg));assert.ok(Math.abs(h.massLedger.reduce((v,r)=>v+r.kg,0)-h.launchKg)<1e-7)}
for(const target of [10,10000,20000,100000]){const s=inverseSolve({...defaults,requiredTps:target},'workload');assert.ok(s.achieved>=target);assert.ok(s.hardware.trays%1===0)}
const small=inverseSolve({...defaults,launchAllowanceKg:2000},'launch'),large=inverseSolve({...defaults,launchAllowanceKg:12000},'launch');assert.ok(small.hardware.launchKg<=2000);assert.ok(large.hardware.launchKg<=12000);assert.ok(small.achieved<=large.achieved);assert.ok(!inverseSolve({...defaults,launchAllowanceKg:100},'launch').feasible);
assert.equal(estimateLife(sizeDesign({...defaults,solarM2:5})).years,0);assert.ok(estimateLife(reference).years>0);assert.ok(validateDesign({...defaults,ecc:.20}).some(x=>x.includes('intersects')));
for(const key of Object.keys(presets)) assert.equal(enumeratePresets(defaults,key).length,Object.keys(presets[key]).length);
const sim=createSimulation(reference),fresh=createSimulation(sizeDesign(JSON.parse(JSON.stringify(reference.input)))),events=sim.events(0,86400);
for(const type of ['contact','trim','reboost']){const event=events.find(e=>e.type===type);if(!event && type==='trim')continue;assert.ok(event, type);const t=(event.start+event.end)/2,a=sim.at(t),b=fresh.at(t);for(const key of ['batteryKWh','propellantKg','junctionK','queueGB','deployment','momentumNms'])assert.equal(a[key],b[key],`${type} roundtrip ${key}`)}
const early=events.find(e=>e.type==='contact'&&e.end<DEPLOY_END_S);if(early)assert.equal(sim.at(early.end).deliveredGB,sim.at(early.start).deliveredGB);
const event=events.find(e=>e.type==='contact'&&e.start>DEPLOY_END_S),before=sim.at(event.start),after=sim.at(event.end);assert.ok(after.deliveredGB>before.deliveredGB);assert.ok(Math.abs((after.queueGB-before.queueGB)+(after.deliveredGB-before.deliveredGB)-(after.generatedGB-before.generatedGB))<1e-5);
console.log(`${checks().length} scalar checks, all presets, workload trades, fleet options, initial infeasibility, mass and byte closure, deterministic pass and burn reconstruction: pass`);
