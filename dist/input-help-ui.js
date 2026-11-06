import {fieldGuidance,guidanceSources} from './input-guidance.js';
import {controls} from './design.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const refLink=s=>'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+(s.locator?' · '+esc(s.locator):'')+' ↗</a>';
export const helpButton=(key,label,option='')=>'<button type="button" class="guide-hint" aria-haspopup="dialog" aria-controls="guide-dialog" data-guide-key="'+esc(key)+'" data-guide-option="'+esc(option)+'" aria-label="How to choose '+esc(label)+'">?</button>';
export function helpForElement(el,design){
 if(el.tagName==='LABEL'&&el.htmlFor){
  const input=document.getElementById(el.htmlFor);if(input)return helpForElement(input,design);
 }
 const d=el.dataset||{},id=el.id||'';
 let key=d.guideKey||d.param||d.rating,option=d.guideOption||null;
 if(!key&&d.boundRole){key='thermalRole';option=el.value}
 if(!key&&d.adoptRating){key='adoptRating'}
 if(!key&&d.preset){key=d.preset;option=d.id}
 if(!key&&['phase-solve','solve','quicksolve'].includes(id)){key='solve';option=el.value}
 if(!key&&d.disposalMethod){key='disposalMethod';option=d.disposalMethod}
 if(!key&&d.useLauncher){key='launcher';option=d.useLauncher}
 if(!key&&d.design)key='loadPreset'
 if(!key)key=({epoch:'epoch',category:'technologyCompare','thermal-pad':'thermalPadding','thermal-scope':'thermalScope','thermal-node':'thermalNode','preset-name':'presetName','preset-description':'presetDescription'})[id]||({newpreset:'newPreset',savepreset:'savePreset',loadpreset:'loadPreset',resetpreset:'missionPreset',commitpreset:'savePreset',managepresets:'managePresets'})[d.action];
 if(!key)return null;
 if(!option&&el.tagName==='SELECT')option=el.value;
 return fieldGuidance(key,design,{option:option||design[key],key:d.boundRole});

}
export function shortHint(row){return row?[row.advice,row.example?String(row.example):'',row.sources.slice(0,2).map(s=>s.title+(s.locator?' · '+s.locator:'')).join(' / ')].filter(Boolean).join(' '):''}
export function helpBody(key,design,option){
 const r=fieldGuidance(key,design,{option:option||design[key]});if(!r)return '';
 const bounds=r.bounds?'<div class="field-range"><b>'+(r.bounds.readOnly?'Import compatibility range':'Editable range')+'</b> '+esc(r.bounds.min)+'–'+esc(r.bounds.max)+' '+esc(r.bounds.unit||'')+'<small>'+esc(r.bounds.note)+'</small></div>':'';
 const options=r.options?.length?'<details class="guide-options"><summary>Compare the choices ('+r.options.length+')</summary>'+r.options.map(o=>'<section><h4>'+esc(o.label)+'</h4><p>'+esc(o.advice)+'</p>'+(o.example?'<p>'+esc(o.example)+'</p>':'')+'<small>'+esc(o.basis||'')+'</small><div>'+o.sources.map(refLink).join(' · ')+'</div></section>').join('')+'</details>':'';
 return '<p class="field-advice">'+esc(r.advice)+'</p>'+(r.example?'<p class="field-example">'+esc(r.example)+'</p>':'')+'<div class="guide-basis"><strong>Basis for this choice</strong><p>'+esc(r.basis)+'</p></div>'+bounds+options+'<h3 class="gap">Sources</h3><ul class="field-refs">'+r.sources.map(s=>'<li>'+refLink(s)+'</li>').join('')+'</ul>';
}
export function sourceGuideIndex(){
 return '<section class="panel lowerpan field-index"><div class="panelhead"><h2>Assumption guide</h2><span class="guideflag">'+controls.length+' DESIGN FIELDS</span></div><div class="panelpad"><p>Choose an input for selection guidance, example assumptions and references.</p><label>Find a field <input id="field-filter" type="search" class="forminput" placeholder="Search field names or disciplines"></label><div class="field-index-list">'+controls.map(c=>'<button class="chip" data-guide-key="'+esc(c.key)+'" data-query="'+esc((c.label+' '+c.group).toLowerCase())+'">'+esc(c.label)+'</button>').join('')+'</div><details><summary>Guidance bibliography · '+guidanceSources.length+' references</summary><ul class="field-refs">'+guidanceSources.map(s=>'<li>'+refLink(s)+'</li>').join('')+'</ul></details></div></section>';
}
