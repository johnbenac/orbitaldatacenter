import {flightKnowledge,flightKnowledgeSources} from './part-knowledge-flight.js';
import {materialKnowledge,materialKnowledgeSources} from './part-knowledge-materials.js';
import {groundKnowledge,groundKnowledgeSources} from './part-knowledge-ground.js';
import {launchKnowledge,launchKnowledgeSources} from './part-knowledge-launch.js';

export const partsKnowledgeReviewed='2026-11-07';
export const partsKnowledgeSources=Object.freeze({...flightKnowledgeSources,...materialKnowledgeSources,...groundKnowledgeSources,...launchKnowledgeSources});
const get=(catalog,id)=>catalog.byId instanceof Map?catalog.byId.get(id):catalog.byId?.[id];
const validURL=value=>{try{return new URL(value).protocol==='https:'}catch{return false}};
function sourceIds(article){
 const ids=[...(article.sourceIds||[])];
 for(const section of article.sections||[])for(const paragraph of section.paragraphs||[])ids.push(...paragraph.sources||[]);
 for(const field of ['suppliers','alternatives'])for(const row of article[field]||[])ids.push(...row.sources||[]);
 return [...new Set(ids)];
}
export function partKnowledge(record,catalog,hardware){
 const raw=materialKnowledge(record,catalog,hardware)||flightKnowledge(record,catalog,hardware)||groundKnowledge(record,catalog,hardware)||launchKnowledge(record,catalog,hardware);
 if(!raw)return null;
 const ids=sourceIds(raw),sources=ids.map(id=>({id,...partsKnowledgeSources[id]})).filter(s=>s.title&&validURL(s.url));
 const byURL=new Map(),references=[];
 for(const source of sources){const key=source.url.replace(/#.*$/,'');if(byURL.has(key)){source.number=byURL.get(key).number;}else{source.number=references.length+1;references.push(source);byURL.set(key,source)}}
 const referenceNumbers=Object.fromEntries(sources.map(s=>[s.id,s.number]));
 const relatedIds=[...new Set([record.parentId,...raw.relatedIds||[],...record.relatedIds||[],...catalog.records.filter(r=>r.parentId===record.id).map(r=>r.id)].filter(id=>id&&id!==record.id&&get(catalog,id)))];
 const words=[raw.summary,...(raw.sections||[]).flatMap(s=>(s.paragraphs||[]).map(p=>p.text||p)),...(raw.suppliers||[]).flatMap(s=>[s.offering,s.note]),...(raw.alternatives||[]).flatMap(s=>[s.description,s.tradeoff]),...(raw.inspection||[])].join(' ').trim().split(/\s+/).length;
 return {...raw,references,referenceNumbers,relatedIds,wordCount:words,readingMinutes:Math.max(2,Math.ceil(words/210)),reviewed:partsKnowledgeReviewed};
}

export function partKnowledgeSearchText(record,catalog,hardware){
 const article=partKnowledge(record,catalog,hardware);if(!article)return '';
 return [article.summary,...article.sections.flatMap(s=>[s.title,...s.paragraphs.map(p=>p.text||p)]),...(article.suppliers||[]).flatMap(s=>[s.name,s.offering]),...(article.alternatives||[]).map(s=>s.name),...(article.terms||[]).map(s=>s.term)].join(' ');
}
