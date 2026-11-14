// Redwire's installed harness mass must be counted once and visible per assembly.
import assert from 'node:assert/strict';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {buildElectricalArchitecture} from './dist/electrical-architecture.js';
import {buildEquipmentList,renderEquipmentList,bindEquipmentList,filterEquipmentRows,harnessMassCsv} from './dist/equipment-list.js';
import {releaseFiles} from './dist/file-delivery.js';

const h=sizeDesign(buildReferenceDesign('redwire-8kw')),graph=buildElectricalArchitecture(h),list=buildEquipmentList(h);
const near=(actual,expected,label)=>assert(Math.abs(actual-expected)<1e-8*Math.max(1,Math.abs(expected)),label+': '+actual+' != '+expected);
const sum=(rows,key)=>rows.reduce((total,row)=>total+row[key],0);
assert.equal(list.harnessEntries.length,54,'Every complete harness assembly needs its own MEL entry');
assert.equal(new Set(list.harnessEntries.map(row=>row.id)).size,54,'Harness entry identities must be unique');
assert.equal(list.harnessEntries.reduce((total,row)=>total+row.routeIds.length,0),62,'Both solar polarities remain physical cuts within their complete assembly');
assert.equal(new Set(list.harnessEntries.flatMap(row=>row.routeIds)).size,62,'No physical cable cut is charged twice');
for(const row of list.harnessEntries){
 const source=graph.harnessMassRecords.find(record=>record.id===row.id);
 assert(source,'Each MEL entry must retain its route-derived source');
 near(row.cableMassKg,source.cableMassKg,row.id+' cable');
 near(row.connectorMassKg,source.connectorMassKg,row.id+' terminations');
 near(row.totalMassKg,row.cableMassKg+row.connectorMassKg,row.id+' complete mass');
 assert.equal(row.massAccounting,'included-in-parent');
 assert.equal(row.quantity,1);
 assert.deepEqual(row.routeCuts,source.routeCuts);
 assert(row.fromEquipment&&row.toEquipment&&row.fromPortId&&row.toPortId);
}
for(const parent of ['07.05','01.04']){
 const entries=list.harnessEntries.filter(row=>row.parentWbs===parent),account=graph.massAccounting[parent],equipment=list.rows.find(row=>row.wbs===parent);
 assert.equal(account.accountingStatus,'installed-route-mass-adopted');
 near(sum(entries,'totalMassKg'),account.allocatedKg,parent+' adopted parent mass');
 near(account.allocatedKg,account.estimatedRequiredKg,parent+' estimate adoption');
 near(sum(equipment.assemblyDetails,'extendedMassKg'),sum(entries,'totalMassKg'),parent+' alternate family/connector breakdown');
 assert.equal(equipment.harnessEntries.length,entries.length);
}
near(sum(list.harnessEntries.filter(row=>row.parentWbs==='07.05'),'totalMassKg'),h.massLedger.find(row=>row.id==='cables').kg,'Flight harness ledger');
near(sum(list.harnessEntries.filter(row=>row.parentWbs==='01.04'),'totalMassKg'),h.serviceArchitecture.fabric.cableMassKg,'Payload fabric cable mass');
near(list.totals.dryKg,h.dryKg,'Dry spacecraft total');
near(list.totals.wetKg,h.wetKg,'Wet spacecraft total');
near(list.totals.launchKg,h.launchKg,'Launch total');
near(list.totals.closureKg,0,'Parent ledger closure');
const html=renderEquipmentList(h);
for(const row of list.harnessEntries)assert(html.includes('data-harness-id="'+row.id+'"'),'Mass register exposes '+row.id);
assert.equal((html.match(/data-harness-id=/g)||[]).length,54,'Default mass view contains each individual entry once');
assert.match(html,/Harness mass CSV/);
const csv=harnessMassCsv(list.harnessEntries);
assert.equal(csv.trimEnd().split('\r\n').length,55,'Mass CSV has one header and one row per complete harness');
for(const row of list.harnessEntries)assert(csv.includes('"'+row.id+'"'));

class Control{value='';innerHTML='';dataset={};attrs={};handlers={};addEventListener(event,handler){this.handlers[event]=handler}setAttribute(key,value){this.attrs[key]=value}focus(){}}
const selectors=['[data-mel-search]','[data-mel-sub]','[data-mel-evidence]','[data-mel-clear]','[data-file="csv"]','[data-file="json"]','[data-file="harness-mass"]','[data-mel-status]','.mel-scroll'];
const controls=Object.fromEntries(selectors.map(key=>[key,new Control()])),lenses=['mass','electrical'].map(lens=>Object.assign(new Control(),{dataset:{lens}}));
const root={dataset:{},matches:selector=>selector==='[data-mel]',querySelector:selector=>controls[selector],querySelectorAll:()=>lenses};
bindEquipmentList(root,h);lenses[1].handlers.click();
assert.equal((controls['.mel-scroll'].innerHTML.match(/data-harness-id=/g)||[]).length,54,'Harness lens exposes the full assembly inventory');
const worker=list.harnessEntries.find(row=>row.harnessId==='D-WORKER-1');
assert.deepEqual(filterEquipmentRows(list.rows,{query:worker.id}).map(row=>row.wbs),['01.04'],'Harness identity finds its owning equipment');
controls['[data-mel-search]'].value=worker.id;controls['[data-mel-search]'].handlers.input();
assert.equal((controls['.mel-scroll'].innerHTML.match(/data-harness-id=/g)||[]).length,1,'Harness search narrows the individual register');
const exported=await(await fetch(controls['[data-file="json"]'].href)).json(),download=await(await fetch(controls['[data-file="harness-mass"]'].href)).text();
assert.equal(exported.harnessEntries.length,54);assert.equal(download,csv);releaseFiles();
console.log('PASS Redwire MEL: 54 individual assemblies / 62 unique cable cuts, exact cable + termination masses, adopted parents and vehicle totals without double counting, searchable rows, JSON and individual mass CSV.');
