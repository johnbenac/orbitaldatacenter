import assert from 'node:assert/strict';
import {defaults,sizeDesign} from './dist/design.js';
import {referenceCenterOrder} from './dist/reference-centers.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {buildPartsCatalog} from './dist/parts-catalog.js';
import {partVerification} from './dist/part-verification.js';
import {buildElectricalArchitecture} from './dist/electrical-architecture.js';
import {buildElectricalProgram,runElectricalCheck} from './dist/electrical-program.js';
import {renderElectricalWorkspace,renderPartElectrical,electricalResultMarkup} from './dist/electrical-engineering-ui.js';

let references=0,links=0,partPages=0;
for(const reference of ['custom-study',...referenceCenterOrder]){
 const h=sizeDesign(reference==='custom-study'?defaults:buildReferenceDesign(reference)),catalog=buildPartsCatalog(h),graph=buildElectricalArchitecture(h),program=buildElectricalProgram(h);
 const get=id=>catalog.byId instanceof Map?catalog.byId.get(id):catalog.byId[id];
 const html=renderElectricalWorkspace(h,{},'B');
 assert(!html.includes('[object Object]'),reference+': an engineering value rendered as an object');
 for(const [,id]of html.matchAll(/data-electrical-open-part="([^"]+)"/g)){assert(get(id),reference+': electrical diagram links to missing part '+id);links++;}
 for(const item of [...graph.assemblies,...graph.connectorDetails,...graph.cards,{itemId:'ground:egse-cable'}]){
  const record=get(item.itemId);assert(record,reference+': build item is missing from Parts navigator '+item.itemId);
  const content=renderPartElectrical(h,record);assert(content.includes('Electrical interfaces & capabilities'),item.itemId+': missing electrical boundary');
  assert(content.includes('Electrical requirements & verification'),item.itemId+': missing capability/verification content');
  const view=program.requirements.filter(r=>r.itemId===record.id);assert(view.length,item.itemId+': no allocated requirement');
  for(const requirement of view)assert(content.includes(requirement.id),item.itemId+': allocated requirement disappeared from its part page');
  const verification=partVerification(record,catalog,h);
  assert(verification.profile.startsWith('electrical-'),record.id+': electrical article fell back to generic material verification');
  assert(verification.activities.some(a=>a.id==='electrical-analysis'&&a.planId),record.id+': executable analysis plan missing');
  assert(verification.activities.some(a=>a.animation==='electrical'&&a.planId),record.id+': electrical checkout rehearsal missing');
  assert(verification.activities.some(a=>a.animation==='mate'),record.id+': mating demonstration missing');
  assert.equal(verification.settings.includes('thermal-vacuum'),record.category==='flight',record.id+': flight and ground thermal settings are conflated');
  assert(!content.includes('[object Object]'),item.itemId+': unreadable engineering criteria');partPages++;
 }
 const result=runElectricalCheck(program),markup=electricalResultMarkup(result);
 assert(!markup.includes('[object Object]'),reference+': check summary is unreadable');
 assert(markup.includes(result.evidenceId)&&markup.includes(result.configurationId),reference+': result lacks configuration/evidence identity');
 assert(markup.includes('Criterion: Single-contact interfaces above 300 V DC'),reference+': high-voltage selection rule is misleadingly shown as a maximum voltage');
 assert(!markup.includes('Criterion: </small>'),reference+': result contains an empty acceptance criterion');
 const blocked=runElectricalCheck(program,{overrides:{loadScale:NaN}}),blockedMarkup=electricalResultMarkup(blocked);
 assert.equal(blocked.ready,false);assert(blocked.inputErrors.length);assert(blockedMarkup.includes('ed-review'));assert(blockedMarkup.includes('load scale'));assert(!blockedMarkup.includes('checks are within'),reference+': blocked case falsely presents a passing analysis');
 references++;
}
console.log('PASS electrical UI: '+references+' configurations; '+partPages+' electrical part pages; '+links+' diagram/build links resolved; invalid cases show their actual input errors and retain evidence identity.');
