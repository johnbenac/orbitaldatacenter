import {spacecraftMaterials,spacecraftMaterialRecord,materialLibraryRevision,materialEvidenceLabels} from './spacecraft-materials.js';
import {materialSources} from './material-evidence.js';
import {architectureFamily} from './architecture-families.js';
import {retainFile,preparedFile} from './file-delivery.js';
import {buildTextureBank} from './material-texture-download.js';
import {icon} from './icons.js';

const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const number=v=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:3}):'Unspecified';
const status=s=>`<span class="ml-status" data-status="${esc(s)}">${esc(materialEvidenceLabels[s]||s)}</span>`;
const sourceLink=id=>{const s=materialSources[id];return s?`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.organization)} · ${esc(s.title)} ↗</a>`:''};
function stackDrawing(id,layers){
 return `<svg viewBox="0 0 330 115" role="img" aria-label="${esc(id)} material layers, schematic and not to scale">${layers.map(([label,color],i)=>{const y=16+i*24;return `<path d="M18 ${y+12} L131 ${y} L170 ${y+15} L57 ${y+27} Z" fill="${color}" stroke="#182d39" stroke-width="1.2"/><path d="M166 ${y+14}H190" fill="none" stroke="#819aa6"/><text x="198" y="${y+18}" fill="#d6e2e7" font-size="11">${esc(label)}</text>`}).join('')}</svg>`;
}
function stackCards(h){
 const coating=h.input.coating==='paint',pv=h.input.pv==='silicon';
 const cards=[
  ['Blanket is an assembly','mli-aluminized-polyimide',[['Outer cover','#b59b60'],['Reflective films','#9babb4'],['Protected wall','#516b7b']],'Amber polymer or white cloth covers a concealed reflective stack.'],
  ['Solar front and back',pv?'pv-silicon':'pv-multijunction',[['Coverglass','#769ab1'],[pv?'Silicon cells':'III–V cells','#253955'],['Flexible backing','#8c612f']],'Coverglass is represented within the cell face; the rear is a separate material.'],
  ['Radiator surface and structure',coating?'radiator-white-paint':'radiator-osr',[[coating?'White coating':'Glass OSR finish',coating?'#e5e5df':'#c4d3d8'],['Aluminum face sheet','#8296a0'],['Core allocation','#ad976a']],'The finish sits on a structural panel. Hidden layers remain included in the parent mass.'],
 ];
 return '<div class="ml-stacks">'+cards.map(([title,id,layers,note])=>`<a class="ml-stack" href="#material-${id}" data-material-jump="${id}"><h3>${esc(title)}</h3>${stackDrawing(title,layers)}<p>${esc(note)}</p><span>Inspect layers and evidence →</span></a>`).join('')+'</div>';
}
function materialCard(m,assignments){
 const usages=assignments.filter(x=>x.materialId===m.id),states=[...new Set(usages.map(x=>x.evidence.status))];
 const sources=[...new Set([...m.sourceIds,...usages.flatMap(u=>u.evidence.sourceIds)])];
 const searchable=[m.name,m.category,m.composition,m.finish,m.id,...usages.flatMap(u=>[u.parentWbs,u.label,u.evidence.basis])].join(' ').toLowerCase();
 const size=m.texture.tileSizeM?.map(number).join(' × '),resolution=m.texture.resolutionPx?.join(' × ');
 return `<details class="ml-card" id="material-${m.id}" data-material-card="${m.id}" data-used="${usages.length>0}" data-search="${esc(searchable)}" data-category="${esc(m.category)}"><summary><div class="ml-swatch"><img src="${esc(m.texture.previewUrl)}" alt="Illustrative ${esc(m.name.toLowerCase())} texture sample" loading="lazy" width="360" height="180"><span>${esc(m.category)}</span></div><div class="ml-card-title"><h3>${esc(m.name)}</h3><span class="ml-usage">${usages.length?usages.length+' MEL detail'+(usages.length===1?'':'s'):'Library alternative'}</span><p>${esc(m.finish)}</p><span class="ml-expand">Material, usage and sources ${icon('chevron-down',13)}</span></div></summary><div class="ml-card-body"><dl><div><dt>Composition</dt><dd>${esc(m.composition)}</dd></div><div><dt>Appearance</dt><dd>${esc(m.appearance)}</dd></div><div><dt>Texture</dt><dd><code>${esc(m.textureId)}</code><br>${esc(resolution)} px · ${esc(size)} m repeat allocation</dd></div></dl><p class="ml-limit">${esc(m.limitations)}</p><div class="ml-maplinks"><a href="${esc(m.texture.baseColorUrl)}" download>Color map ↓</a><a href="${esc(m.texture.normalUrl)}" download>Normal map ↓</a><a href="${esc(m.texture.roughnessUrl)}" download>Roughness map ↓</a></div>${usages.length?`<h4>Assigned in this spacecraft</h4><div class="ml-assignments">${usages.map(u=>`<article><div><b>WBS ${esc(u.parentWbs)} · ${esc(u.label)}</b>${status(u.evidence.status)}</div><p>${esc(u.evidence.basis)}</p><small>${esc(u.visibility)} · Included in parent mass</small></article>`).join('')}</div>`:'<p class="ml-unused">This material is available in the bank but is not assigned to the active spacecraft.</p>'}<details class="ml-sources"><summary>Material evidence · ${sources.length} sources</summary>${sources.map(id=>{const s=materialSources[id];return s?`<article>${sourceLink(id)}<p>${esc(s.claim)}</p><small>${esc(s.boundary)}</small></article>`:''}).join('')||'<p>Composition remains unresolved; the surface is a visual placeholder.</p>'}</details><button class="textbutton" data-page="equipment">Open the master equipment list →</button></div></details>`;
}
export function renderMaterialLibrary(h){
 const record=spacecraftMaterialRecord(h),assignments=record.assignments,used=new Set(assignments.map(x=>x.materialId)),all=Object.values(spacecraftMaterials);
 const counts=Object.fromEntries(Object.keys(materialEvidenceLabels).map(s=>[s,assignments.filter(x=>x.evidence.status===s).length]));
 const categories=[...new Set(all.map(x=>x.category))],f=architectureFamily(h),p=record.modelProperties;
 return `<section class="panel ml-library" aria-labelledby="material-library-title"><header class="panelhead"><h2 id="material-library-title">${icon('box',16)} Materials & finishes</h2><span class="metacode">PDR MATERIAL REGISTER</span></header><div class="panelpad"><div class="ml-intro"><div><span class="ml-kicker">${esc(f.label)}</span><h3>A material behind every visible surface.</h3><p>Inspect the spacecraft’s material allocations, the textures used to depict them, and the evidence behind each choice. Surface details are linked to the master equipment list.</p></div><div class="ml-counts"><b>${used.size}<small>assigned materials</small></b><b>${assignments.length}<small>surface & layer details</small></b><b>${all.length}<small>library materials</small></b></div></div><div class="ml-evidence-key">${Object.keys(counts).map(s=>`<span>${status(s)}<b>${counts[s]}</b></span>`).join('')}</div><p class="ml-context">A documented material applies only to the stated source and component. Generic material heritage supports a choice; it does not establish a provider’s specification. ${assignments.every(x=>x.evidence.status!=='documented')?'No source-specific material selection is established for this active configuration.':''}</p>${stackCards(h)}<div class="ml-downloads"><a class="btn" data-material-record download="spacecraft-material-register.json">Download material register</a><a class="btn" href="#" role="button" data-texture-bank download="spacecraft-texture-bank.zip">Download texture bank</a><button class="btn" data-page="equipment">Master equipment list →</button></div><p class="ml-context" data-texture-status role="status" hidden></p><form class="ml-filters" role="search"><label><span>Find a material or WBS</span><input type="search" data-material-search placeholder="Try MLI, titanium, radiator or 07.02" autocomplete="off"></label><label><span>Material family</span><select data-material-category><option value="">All families</option>${categories.map(c=>`<option>${esc(c)}</option>`).join('')}</select></label><label class="ml-check"><input type="checkbox" data-material-used checked> Assigned to this spacecraft</label></form><p class="ml-results" aria-live="polite" data-material-results>${used.size} materials shown</p><div class="ml-grid">${all.map(m=>materialCard(m,assignments)).join('')}</div><p class="ml-empty" data-material-empty hidden>No materials match these filters.</p><details class="ml-model-boundary"><summary>How the material register relates to the engineering model</summary><p>Every surface detail is included in its parent equipment allocation. Face sheets, coatings and blankets are not added a second time. The texture bank describes visible appearance; its color, roughness and normal maps do not replace thermal, electrical or structural properties.</p><div class="ml-properties"><span>Radiator finish<b>${esc(p.radiatorFinish==='paint'?'White coating':'Glass OSR')}</b></span><span>Solar absorptance α<b>${number(p.radiatorAbsorptivity)}</b></span><span>IR emittance ε<b>${number(p.radiatorEmissivity)}</b></span><span>Blanket effective ε<b>${number(p.blanketEffectiveEmissivity)}</b></span><span>Blanket outer α / ε<b>${number(p.blanketOuterAbsorptivity)} / ${number(p.blanketOuterEmissivity)}</b></span></div><p>These are the active study inputs. Separate white/amber blanket coverage, surface aging, AO protection, charging, contamination, outgassing and material compatibility need design verification. No material qualification is inferred from a realistic image.</p><p>Texture patterns, seams and cell pitches are illustrative allocations, shown at controlled physical repeat scales. View the source links for the evidence boundary. Revision: <code>${esc(materialLibraryRevision)}</code>.</p></details></div></section>`;
}
export function focusMaterial(host,id){
 const card=[...host.querySelectorAll('[data-material-card]')].find(el=>el.dataset.materialCard===id);if(!card)return;
 const query=host.querySelector('[data-material-search]'),category=host.querySelector('[data-material-category]'),used=host.querySelector('[data-material-used]');
 if(query)query.value='';if(category)category.value='';if(used)used.checked=false;
 host.querySelectorAll('[data-material-card]').forEach(el=>{el.hidden=false});
 const results=host.querySelector('[data-material-results]');if(results)results.textContent=Object.keys(spacecraftMaterials).length+' materials shown';
 const empty=host.querySelector('[data-material-empty]');if(empty)empty.hidden=true;
 card.open=true;card.scrollIntoView({block:'start',behavior:'smooth'});card.querySelector('summary')?.focus({preventScroll:true});
}
export function bindMaterialLibrary(host,h,focusId=null){
 host.querySelector('.ml-filters')?.addEventListener('submit',e=>e.preventDefault());
 const search=host.querySelector('[data-material-search]'),category=host.querySelector('[data-material-category]'),used=host.querySelector('[data-material-used]');
 const filter=()=>{const words=(search?.value||'').toLowerCase().trim().split(/\s+/).filter(Boolean);let shown=0;host.querySelectorAll('[data-material-card]').forEach(card=>{const visible=(!used?.checked||card.dataset.used==='true')&&(!category?.value||category.value===card.dataset.category)&&words.every(w=>card.dataset.search.includes(w));card.hidden=!visible;if(visible)shown++});host.querySelector('[data-material-results]').textContent=shown+' material'+(shown===1?'':'s')+' shown';host.querySelector('[data-material-empty]').hidden=shown>0;};
 search?.addEventListener('input',filter);category?.addEventListener('change',filter);used?.addEventListener('change',filter);filter();
 host.querySelectorAll('[data-material-jump]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();focusMaterial(host,a.dataset.materialJump)}));
 const record=host.querySelector('[data-material-record]');if(record){const f=retainFile('spacecraft-material-register',new Blob([JSON.stringify(spacecraftMaterialRecord(h),null,2)+'\n'],{type:'application/json'}),'spacecraft-material-register.json','Current spacecraft materials, surface assignments and primary evidence');record.href=f.url;record.download=f.name;}
 const bank=host.querySelector('[data-texture-bank]'),delivery=host.querySelector('[data-texture-status]');
 if(bank){
  const ready=preparedFile('spacecraft-texture-bank');if(ready)bank.href=ready.url;
  let busy=false;
  bank.addEventListener('click',async event=>{
   if(bank.getAttribute('href')?.startsWith('blob:'))return;
   event.preventDefault();if(busy)return;busy=true;bank.setAttribute('aria-busy','true');delivery.hidden=false;
   const update=({stage,done,total})=>{bank.textContent=stage==='zip'?'Packing texture bank…':'Preparing textures · '+done+'/'+total;delivery.textContent=stage==='zip'?'Packing the maps and material evidence for download.':'Preparing the original material maps for download.';};
   try{
    const blob=await buildTextureBank({onProgress:update}),file=retainFile('spacecraft-texture-bank',blob,'spacecraft-texture-bank.zip');
    bank.href=file.url;bank.textContent='Download texture bank';delivery.textContent='Texture bank ready · 96 maps, material definitions and primary sources.';
    if(bank.isConnected)bank.click();
   }catch(error){bank.textContent='Download texture bank';delivery.textContent='The texture bank could not be prepared. Please try the download again.';console.error('Texture bank preparation failed:',error);}
   finally{busy=false;bank.removeAttribute('aria-busy');}
  });
 }
 if(focusId)focusMaterial(host,focusId);
}
