import assert from 'node:assert/strict';
import {sizeDesign,missionStarter} from './dist/design.js';
import {buildReferenceDesign,referenceConfigurationMetadata} from './dist/reference-configurations.js';
import {launchFleet} from './dist/launch-fleet.js';
import {buildEquipmentList,renderEquipmentList,bindEquipmentList} from './dist/equipment-list.js';
import {buildPartsCatalog,resolveScenePart} from './dist/parts-catalog.js';
import {releaseFiles} from './dist/file-delivery.js';

const seed=missionStarter('text');
const designs=[...Object.keys(referenceConfigurationMetadata).map(id=>buildReferenceDesign(id)),...Object.keys(launchFleet).map(launcher=>({...seed,launcher}))];
for(const input of designs){
 const h=sizeDesign(input),mel=buildEquipmentList(h),c=buildPartsCatalog(h),ids=new Set(c.records.map(r=>r.id));
 assert.equal(ids.size,c.records.length);
 assert.deepEqual(c.categories.map(r=>r.id),['flight','launch','ground','site']);
 assert.equal(c.records.filter(r=>r.massAccounting==='mel-allocation').length,mel.rows.length);
 for(const row of mel.rows){const r=c.byId['flight:'+row.wbs];assert(r);assert.equal(r.extendedMassKg,row.extendedMassKg);assert.equal(r.quantity,row.quantity);}
 for(const r of c.records){
  assert.equal(c.byId[r.id],r);assert(r.title&&r.cluster&&r.basis,r.id);assert(c.categories.some(x=>x.id===r.category));
  if(r.parentId)assert(ids.has(r.parentId),'Missing parent of '+r.id);
  for(const id of r.relatedIds)assert(ids.has(id),'Missing related part '+id);
  for(const source of r.sources)assert.equal(new URL(source.url,'https://odc.test/').protocol,'https:');
  if(r.category!=='flight'||r.massAccounting==='included-in-parent')assert.equal(r.extendedMassKg,undefined,'Non-additive row gained mass');
  for(const item of r.facts)assert(item.label&&item.value!==undefined,'Missing fact in '+r.id);
 }
 assert.deepEqual(c.flightTotals,mel.totals);
 assert.equal(!!c.byId['launch:upper'],launchFleet[input.launcher].stages>1);
 assert.equal(c.records.filter(r=>/^launch:booster-\d+$/.test(r.id)).length,launchFleet[input.launcher].boosters);
 for(const wbs of ['06.06','06.07','06.08'])assert(c.byId['flight:'+wbs].render.unavailable);
 const html=renderEquipmentList(h);
 for(const row of mel.rows)assert(html.includes('data-part-thumbnail="flight:'+row.wbs+'"'));
 assert(!html.includes('<canvas'));assert(html.includes('data-page="parts"'));
 for(const category of ['launch','ground','site'])assert(html.includes('data-parts-category="'+category+'"'));
}
const h=sizeDesign(seed),c=buildPartsCatalog(h),resolve=s=>resolveScenePart(c,s)?.id;
assert.equal(resolve({category:'flight',materialRole:'propellant-tank',rootKeys:['tankMap.fuel']}),'flight:06.03.01');
assert.equal(resolve({category:'flight',materialRole:'propellant-tank',rootKeys:['tankMap.oxidizer']}),'flight:06.04.01');
assert.equal(resolve({category:'flight',materialRole:'electronics-case',rootKeys:['avionics']}),'flight:08.01');
assert.equal(resolve({category:'flight',instrument:'activeTerminal',rootKeys:['dish']}),'flight:05.02');
assert.equal(resolve({category:'flight',instrument:'activeTerminal',rootKeys:['optic']}),'flight:05.03');
assert.equal(resolve({category:'launch',name:'Engine nozzle',rootKey:'parts.upper'}),'launch:upper-engines');
assert.equal(resolve({category:'launch',rootKey:'upper',rootKeys:['upper','stage']}),'launch:upper');
assert.equal(resolve({category:'launch',rootKeys:['shell','stage']}),'launch:fairing');
assert.equal(resolve({category:'ground',stationId:'power'}),'ground:power');
assert.equal(resolve({category:'ground',stationId:'rf-optical',name:'Enclosed optical test head'}),'ground:optical-test-head');
assert.equal(resolve({annotationId:'fairing-carrier--1'}),'ground:fairing-carrier');
assert.equal(resolve({category:'site',connectionId:'core-fuel'}),'site:connection-core-fuel');
assert.equal(resolve({category:'launch',connectionId:'payload-flight-data'}),'launch:connection-payload-flight-data');
assert.equal(resolve({annotationId:'instrument:solar-tip'}),'flight:02.01');
assert.equal(resolve({annotationId:'flight-fuel'}),'flight:06.03');
assert.equal(resolve({annotationId:'instrument:patch'}),'flight:05.01');
assert.equal(resolveScenePart(c,{id:'not-a-part'}),null);
// Every MEL lens, including nested material details, keeps stable part links.
class Control{value='';innerHTML='';dataset={};handlers={};addEventListener(type,fn){this.handlers[type]=fn}setAttribute(){}focus(){}}
const controls=new Map(),find=selector=>{if(!controls.has(selector))controls.set(selector,new Control());return controls.get(selector)};
const lenses=['mass','materials','power','dimensions','heritage','maturity'].map(lens=>Object.assign(new Control(),{dataset:{lens}}));
bindEquipmentList({dataset:{},matches:()=>true,querySelector:find,querySelectorAll:()=>lenses},h);
for(const lens of lenses){lens.handlers.click();const html=find('.mel-scroll').innerHTML;assert(html.includes('data-open-part="flight:01.01"'));assert(html.includes('data-part-thumbnail="flight:01.01"'));if(lens.dataset.lens==='materials')assert(html.includes('data-open-part="flight:01.01.01"'));}
releaseFiles();
console.log('Parts catalog: '+designs.length+' design/launcher combinations, all MEL allocations, non-additive boundaries, exact scene selectors and six MEL lenses verified.');
