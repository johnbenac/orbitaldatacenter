import assert from 'node:assert/strict';
import {sizeDesign,missionStarter} from './dist/design.js';
import {buildReferenceDesign,referenceConfigurationMetadata} from './dist/reference-configurations.js';
import {launchFleet} from './dist/launch-fleet.js';
import {buildPartsCatalog} from './dist/parts-catalog.js';
import {partKnowledge,partKnowledgeSearchText,partsKnowledgeSources} from './dist/parts-knowledge.js';
import {renderPartLearning} from './dist/parts-learning.js';
import {flightKnowledgeSources} from './dist/part-knowledge-flight.js';
import {materialKnowledgeSources} from './dist/part-knowledge-materials.js';
import {groundKnowledgeSources} from './dist/part-knowledge-ground.js';
import {launchKnowledgeSources} from './dist/part-knowledge-launch.js';

const sourceRegistries=[flightKnowledgeSources,materialKnowledgeSources,groundKnowledgeSources,launchKnowledgeSources];
assert.equal(Object.keys(partsKnowledgeSources).length,sourceRegistries.reduce((n,s)=>n+Object.keys(s).length,0),'source registry IDs are globally unique');
for(const [id,s] of Object.entries(partsKnowledgeSources)){
 assert(s.title&&s.organization&&s.description&&s.kind,id+' needs a useful annotated source');
 assert.equal(new URL(s.url).protocol,'https:',id);
 assert.equal(s.reviewed,'2026-11-07',id+' source review date');
}
const seed=missionStarter('text');
const inputs=[...Object.keys(referenceConfigurationMetadata).map(buildReferenceDesign),...Object.keys(launchFleet).map(launcher=>({...seed,launcher})),{...seed,engine:'aero'}];
let pages=0,words=0,minWords=Infinity;const distinctRecords=new Set(),topics=new Set(),usedSources=new Set(),byCategory={};
const reserved=new Set(['configuration','inspection','suppliers','alternatives','terms','materials','related','sources']);
for(const input of inputs){
 const h=sizeDesign(input),catalog=buildPartsCatalog(h),before=JSON.stringify(catalog),hardwareBefore=JSON.stringify(h);
 for(const record of catalog.records){
  const a=partKnowledge(record,catalog,h),label=(input.referenceCenterId||input.launcher)+'/'+record.id;
  assert(a,label+' has an article');assert(a.summary?.length>80,label+' has a real introduction');
  assert(a.sections.length>=2,label+' has substantive teaching sections');
  assert(a.wordCount>=240,label+' is only '+a.wordCount+' words');
  assert(a.suppliers?.length>=1,label+' explains makers or reference examples');
  assert(a.alternatives?.length>=2,label+' compares alternatives');
  assert(a.references.length>=2,label+' has primary sources');
  const ids=new Set();for(const section of a.sections){assert(!reserved.has(section.id),label+' uses a reserved section ID');assert(!ids.has(section.id),label+' duplicate section ID');ids.add(section.id);assert(section.title&&section.paragraphs.length,label+' section content');for(const p of section.paragraphs){assert(typeof p.text==='string'&&p.text.length>30,label+' paragraph content');for(const id of p.sources||[])assert(partsKnowledgeSources[id],label+' missing source '+id)}}
  for(const field of ['suppliers','alternatives'])for(const row of a[field])for(const id of row.sources||[])assert(partsKnowledgeSources[id],label+' missing source '+id);
  for(const id of a.sourceIds||[]){assert(partsKnowledgeSources[id],label+' missing source '+id);usedSources.add(id)}
  for(const id of a.relatedIds)assert(catalog.byId[id],label+' dangling related part');
  const html=renderPartLearning(record,catalog,h,{partLink:(r,label)=>'<a data-part-select="'+r.id+'" href="?part='+encodeURIComponent(r.id)+'">'+label+'</a>'});
  assert(!/<canvas|<iframe|<script/.test(html),label+' articles must not initialize extra viewers');
  assert(!/>undefined<|="undefined"|\[object Object\]/.test(html),label+' malformed content');
  const targets=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(targets.length,new Set(targets).size,label+' duplicate document IDs');
  for(const m of html.matchAll(/href="#([^"]+)"/g))assert(targets.includes(m[1]),label+' broken article anchor '+m[1]);
  for(const n of Object.values(a.referenceNumbers))assert(html.includes('id="part-learn-source-'+n+'"'),label+' missing reference target');
  const search=partKnowledgeSearchText(record,catalog,h);assert(search.includes(a.summary),label+' article text searchable');
  pages++;words+=a.wordCount;minWords=Math.min(minWords,a.wordCount);distinctRecords.add(record.id);topics.add(a.key);byCategory[record.category]=(byCategory[record.category]||0)+1;
 }
 assert.equal(JSON.stringify(catalog),before,'articles cannot modify the equipment catalog');assert.equal(JSON.stringify(h),hardwareBefore,'articles cannot modify engineering inputs or totals');
}
const h=sizeDesign(seed),catalog=buildPartsCatalog(h),battery=catalog.byId['flight:02.02.01'],article=partKnowledge(battery,catalog,h);
assert(/battery|cell|pack/i.test(article.summary));assert(/heat|thermal/i.test(partKnowledgeSearchText(battery,catalog,h)));assert(article.wordCount>300,'battery enclosure needs a useful article');
const malicious={...battery,description:'<img src=x onerror=alert(1)>'};const html=renderPartLearning(malicious,catalog,h);assert(html.includes('&lt;img src=x onerror=alert(1)&gt;'));assert(!html.includes('<img src=x'));
console.log(JSON.stringify({configurations:inputs.length,pages,distinctRecordIds:distinctRecords.size,editorialTopics:topics.size,sources:Object.keys(partsKnowledgeSources).length,usedSources:usedSources.size,minimumWords:minWords,meanWords:Math.round(words/pages),byCategory},null,2));
console.log('Parts learning: complete catalog coverage, specific articles, primary-source references, working section/citation targets, searchable prose, safe rendering, and unchanged engineering data.');
