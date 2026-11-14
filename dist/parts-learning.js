import {partKnowledge} from './parts-knowledge.js';
export {partKnowledgeSearchText} from './parts-knowledge.js';
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const number=value=>typeof value==='number'?(Number.isFinite(value)?value.toLocaleString('en-US',{maximumFractionDigits:4}):'—'):String(value??'—');
const get=(catalog,id)=>catalog.byId instanceof Map?catalog.byId.get(id):catalog.byId?.[id];
const safeId=id=>String(id).replace(/[^a-z0-9_-]/gi,'-');
const sectionId=id=>'part-learn-'+safeId(id);
// The historic Starship guide URL currently returns 404. Curated launch
// articles link to the available manufacturer overview and identify the
// workbench-only cargo mechanisms separately.
const availableSupplement=s=>!/^https:\/\/www\.spacex\.com\/media\/starship_users_guide_v1\.pdf(?:#|$)/.test(s.url||'');
const external=(url,label,cls='')=>/^https:\/\//.test(url||'')?'<a class="'+cls+'" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' <span aria-hidden="true">↗</span></a>':esc(label);

export function renderPartLearning(record,catalog,hardware,{partLink}={}){
 const article=partKnowledge(record,catalog,hardware);if(!article)return '';
 const cite=ids=>[...new Set((ids||[]).map(id=>article.referenceNumbers[id]).filter(Boolean))].map(n=>'<a class="parts-citation" href="#'+sectionId('source-'+n)+'" data-part-section="source-'+n+'" aria-label="Reference '+n+'">['+n+']</a>').join('');
 const paragraph=p=>'<p>'+esc(p.text??p)+cite(p.sources)+'</p>';
 const section=(id,title,body,cls='')=>'<section class="parts-learning-section '+cls+'" id="'+sectionId(id)+'" tabindex="-1"><h3>'+esc(title)+'</h3>'+body+'</section>';
 const topics=(article.sections||[]).map((s,i)=>({id:s.id||'topic-'+i,title:s.title}));
 const outline=[...topics,{id:'configuration',title:'In this design'},...(article.suppliers?.length?[{id:'suppliers',title:'Makers & examples'}]:[]),...(article.alternatives?.length?[{id:'alternatives',title:'Alternatives'}]:[]),{id:'related',title:'Related parts'},{id:'sources',title:'Sources & further reading'}];
 const parent=get(catalog,record.parentId),facts=(record.facts||[]).filter(f=>f.value!=null),materials=(record.materials||[]).map(m=>typeof m==='string'?{id:m,name:m}:m);
 const inheritedReference=record.referenceHardware||parent?.referenceHardware;
 const link=partLink||((r,label=r.title)=>'<span>'+esc(label)+'</span>');
 const refs=article.references.map(s=>'<li id="'+sectionId('source-'+s.number)+'" tabindex="-1"><div class="parts-source-number">'+s.number+'</div><div><div class="parts-source-meta">'+esc([s.organization,s.kind].filter(Boolean).join(' · '))+'</div><h4>'+external(s.url,s.title)+'</h4><p>'+esc(s.description||'Read the primary reference for its technical detail and stated scope.')+'</p>'+(s.section?'<small class="parts-source-section">Read: '+esc(s.section)+'</small>':'')+'</div></li>').join('');
 const related=article.relatedIds.map(id=>get(catalog,id)).filter(Boolean);
 const supplemental=[...new Map([...(record.sources||[]),...(parent?.sources||[])].filter(s=>availableSupplement(s)&&/^https:\/\//.test(s.url||'')&&!article.references.some(r=>r.url.replace(/#.*$/,'')===s.url.replace(/#.*$/,''))).map(s=>[s.url,s])).values()];
 let html='<div class="parts-learning" data-part-knowledge="'+esc(article.key)+'"><header class="parts-learning-intro" id="part-learn-overview" tabindex="-1"><div class="parts-learning-meta"><span>Component guide</span><span>'+article.readingMinutes+' min read · '+article.references.length+' curated sources</span></div><p class="parts-learning-lede">'+esc(article.summary)+'</p></header>';
 html+='<nav class="parts-article-outline" aria-label="On this part page"><span>On this page</span>'+outline.map(s=>'<a href="#'+sectionId(s.id)+'" data-part-section="'+esc(s.id)+'">'+esc(s.title)+'</a>').join('')+'</nav>';
 html+='<div class="parts-reading">'+(article.sections||[]).map((s,i)=>section(s.id||'topic-'+i,s.title,(s.paragraphs||[]).map(paragraph).join(''))).join('');
 html+=section('configuration','In this design','<div class="parts-configuration-title">'+esc(catalog.reference?.name||hardware?.launcherLabel||'Current configured study')+'</div><p>'+esc(record.description)+'</p>'+(record.parentId&&parent?'<p class="parts-parent-line">Part of '+link(parent,parent.title,'parts-inline-part')+'.</p>':'')+
  (inheritedReference?'<div class="parts-reference-article"><strong>Equipment reference</strong><p>'+esc(inheritedReference.manufacturer)+' · '+external(inheritedReference.sourceUrl,inheritedReference.referenceModel)+'</p><p>'+esc(inheritedReference.heritage)+'</p></div>':'')+
  (facts.length?'<dl class="parts-facts parts-learning-facts">'+facts.map(f=>'<div><dt>'+esc(f.label)+'</dt><dd>'+esc(number(f.value))+(f.unit?' <small>'+esc(f.unit)+'</small>':'')+'</dd></div>').join(''):'')+
  '<details class="parts-evidence-detail"><summary>Model scope and evidence</summary><p>'+esc(record.basis)+'</p>'+(record.render?.unavailable?'<p>'+esc(record.render.unavailableReason)+'</p>':'')+'</details>'+
  (record.wbs?'<button type="button" class="parts-text-link" data-part-mel="'+esc(record.wbs)+'">Find WBS '+esc(record.wbs)+' in the equipment list ↗</button>':''),'parts-live-configuration');
 if(article.inspection?.length)html+=section('inspection','Explore the 3D model','<ul class="parts-inspection-list">'+article.inspection.map(text=>'<li>'+esc(text)+'</li>').join('')+'</ul>');
 if(article.suppliers?.length)html+=section('suppliers','Makers and reference hardware','<p class="parts-section-context">These real products and institutional references explain the technology and where to investigate it. See “In this design” for the current study’s configuration and evidence.</p><div class="parts-supplier-list">'+article.suppliers.map(s=>'<article><h4>'+esc(s.name)+'</h4><div class="parts-supplier-offering">'+esc(s.offering)+'</div><p>'+esc(s.note)+cite(s.sources)+'</p></article>').join('')+'</div>');
 if(article.alternatives?.length)html+=section('alternatives','Alternatives and tradeoffs','<div class="parts-alternatives"><table><caption class="parts-sr">Architecture alternatives for '+esc(record.title)+'</caption><thead><tr><th scope="col">Approach</th><th scope="col">When it helps</th><th scope="col">What changes</th></tr></thead><tbody>'+article.alternatives.map(a=>'<tr><th scope="row">'+esc(a.name)+'</th><td>'+esc(a.description)+'</td><td>'+esc(a.tradeoff)+cite(a.sources)+'</td></tr>').join('')+'</tbody></table></div>');
 if(article.terms?.length)html+=section('terms','Terms to know','<dl class="parts-glossary">'+article.terms.map(t=>'<div><dt>'+esc(t.term)+'</dt><dd>'+esc(t.definition)+'</dd></div>').join('')+'</dl>');
 if(materials.length)html+=section('materials','Materials and finishes','<div class="parts-material-links">'+materials.map(m=>'<button type="button" class="parts-related-link" data-page="materials" data-material-id="'+esc(m.id)+'">'+esc(m.name||m.id)+' ↗</button>').join('')+'</div>');
 html+=section('related','Keep exploring','<div class="parts-related-grid">'+related.map(r=>'<div class="parts-related-card"><span>'+esc(r.id===record.parentId?'Parent assembly':r.parentId===record.id?'Component detail':r.cluster)+'</span>'+link(r,r.title,'parts-related-link')+'</div>').join('')+'</div>');
 html+=section('sources','Sources and further reading','<p class="parts-section-context">Start with the explanations or product overviews, then use the technical documents for interfaces, test methods, and design detail. Sources reviewed '+esc(new Date(article.reviewed+'T12:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}))+'.</p><ol class="parts-reading-list">'+refs+'</ol>'+(supplemental.length?'<details class="parts-evidence-detail"><summary>Additional references from this design ('+supplemental.length+')</summary><ul class="parts-design-sources">'+supplemental.map(s=>'<li>'+external(s.url,s.label||s.title||s.url)+'</li>').join('')+'</ul></details>':''));
 return html+'</div></div>';
}
