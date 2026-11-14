import {partVerification,verificationSettings,verificationSources} from './part-verification.js';

const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const list=value=>value==null?[]:Array.isArray(value)?value:[value];
const id=value=>String(value??'item').replace(/[^a-z0-9_-]/gi,'-');
const get=(catalog,key)=>catalog.byId instanceof Map?catalog.byId.get(key):catalog.byId?.[key];
const text=value=>typeof value==='object'&&value!==null?value.text||value.description||value.label||'':String(value??'');
const fmt=value=>typeof value==='number'?(Number.isFinite(value)?value.toLocaleString('en-US',{maximumSignificantDigits:5}):'Unallocated'):value==null||value===''?'Unallocated':String(value);
const methods={
 test:{name:'Test',letter:'T',color:'#a9cfff',description:'Apply controlled conditions and measure the item’s response against an approved criterion.'},
 analysis:{name:'Analysis',letter:'A',color:'#c7b6ef',description:'Use calculations, models or technical reasoning with stated inputs, assumptions and limits.'},
 inspection:{name:'Inspection',letter:'I',color:'#ebc88c',description:'Examine the item, drawing or record and compare observable attributes with the requirement.'},
 demonstration:{name:'Demonstration',letter:'D',color:'#9edbc9',description:'Show an intended function or sequence through observed operation, such as deployment or mating.'}
};
const articleLabels={flight:'Flight / acceptance article',qualification:'Qualification article',engineering:'Engineering article',provider:'Provider-controlled article',installed:'Installed configuration'};
const animationLabels={deployment:'Illustrate deployment',cmg:'Illustrate gyro motion',terminals:'Illustrate pointing',integration:'Illustrate integration',fairing:'Illustrate fairing motion',service:'Illustrate service release',processing:'Illustrate the service sequence',mate:'Illustrate mating',fixture:'Illustrate the setup'};
const methodList=activity=>list(activity.methods).filter(m=>methods[m]);
const badge=method=>'<span class="pv-method-badge" data-method="'+method+'"><b aria-hidden="true">'+methods[method].letter+'</b>'+methods[method].name+'</span>';
const badges=activity=>'<span class="pv-method-badges">'+methodList(activity).map(badge).join('')+'</span>';
const external=(url,label)=>{try{if(new URL(url).protocol==='https:')return '<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' <span aria-hidden="true">↗</span></a>';}catch{}return esc(label);};
const bullets=(items,cls='')=>'<ul class="'+cls+'">'+list(items).filter(x=>text(x)).map(x=>'<li>'+esc(text(x))+'</li>').join('')+'</ul>';
const section=(title,body,cls='')=>'<section class="pv-section '+cls+'"><h4>'+esc(title)+'</h4>'+body+'</section>';
const valueLabel=row=>fmt(row.value)+(row.unit?' '+row.unit:'');

function wrap(value,max=29,limit=3){
 const words=String(value??'').trim().split(/\s+/),lines=[];let line='';
 for(const word of words){if(line&&(line+' '+word).length>max){lines.push(line);line=word;}else line+=(line?' ':'')+word;}
 if(line)lines.push(line);if(lines.length>limit){lines.length=limit;lines[limit-1]=lines[limit-1].replace(/[.,;:]$/,'')+'…';}return lines;
}
function svgText(value,x,y,{width=28,lines=2,cls='',anchor='start',dy=17}={}){
 return '<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'"'+(cls?' class="'+cls+'"':'')+'>'+wrap(value,width,lines).map((line,i)=>'<tspan x="'+x+'" dy="'+(i?dy:0)+'">'+esc(line)+'</tspan>').join('')+'</text>';
}
function svgOpen(key,title,description,width,height){return '<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-labelledby="'+key+'-title '+key+'-desc"><title id="'+key+'-title">'+esc(title)+'</title><desc id="'+key+'-desc">'+esc(description)+'</desc>';}
function arrow(x1,y1,x2,y2,color='#597680',dash=false){
 const a=Math.atan2(y2-y1,x2-x1),s=6,ax=x2-s*Math.cos(a-.5),ay=y2-s*Math.sin(a-.5),bx=x2-s*Math.cos(a+.5),by=y2-s*Math.sin(a+.5);
 return '<path d="M'+x1+' '+y1+' L'+x2+' '+y2+'" fill="none" stroke="'+color+'" stroke-width="1.6"'+(dash?' stroke-dasharray="4 5"':'')+'/><path d="M'+ax+' '+ay+' L'+x2+' '+y2+' L'+bx+' '+by+'" fill="none" stroke="'+color+'" stroke-width="1.6"/>';
}
function vDiagram(record,catalog,plan,key,partLink){
 const parent=get(catalog,plan.integration?.parentId||record.parentId),children=catalog.records.filter(r=>r.parentId===record.id);
 const whole={flight:'Spacecraft',launch:'Launch system',ground:'Ground support system',site:'Launch-site system'}[record.category]||'Integrated system';
 const next=parent?.title||plan.integration?.title||'Next integration level';
 const left=[{x:12,y:46,label:'Define the system',detail:whole},{x:94,y:138,label:'Allocate requirements',detail:record.cluster||plan.level},{x:176,y:230,label:'Design this item',detail:record.title,selected:true}];
 const right=[{x:548,y:46,label:'Verify the system',detail:whole},{x:466,y:138,label:'Integrate & verify',detail:next},{x:384,y:230,label:'Verify this item',detail:plan.level||'Selected product',selected:true}];
 let svg=svgOpen(key,'This item in the systems-engineering V','Requirements are decomposed from the system to this item. The configured item is built or procured, verified against its requirements, then integrated and verified at the next level. This loop is repeated at every product level. Selected item: '+record.title+'. Next level: '+next+'.',740,388);
 svg+='<text class="pv-v-arm-label" x="12" y="21">DESIGN & DECOMPOSE</text><text class="pv-v-arm-label pv-v-right-label" x="728" y="21" text-anchor="end">VERIFY & INTEGRATE</text>';
 svg+='<path d="M102 116 L184 208 L266 300 L370 339 L474 300 L556 208 L638 116" class="pv-v-path"/>';
 svg+=arrow(102,117,184,135,'#b99c6c')+arrow(184,209,266,227,'#b99c6c')+arrow(266,301,340,325,'#b99c6c');
 svg+=arrow(400,325,474,303,'#85bfb1')+arrow(474,227,556,211,'#85bfb1')+arrow(556,135,638,119,'#85bfb1');
 svg+='<path d="M202 79 H538 M284 171 H456" class="pv-v-trace"/><text x="370" y="74" text-anchor="middle" class="pv-v-trace-label">trace requirements to evidence</text>';
 const node=(n,side)=>'<g class="pv-v-node '+(n.selected?'pv-v-selected ':'')+'pv-v-'+side+'"><rect x="'+n.x+'" y="'+n.y+'" width="180" height="70" rx="7"/>'+svgText(n.label,n.x+13,n.y+22,{width:23,lines:1,cls:'pv-v-node-label'})+svgText(n.detail,n.x+13,n.y+43,{width:25,lines:2,cls:'pv-v-node-detail',dy:15})+'</g>';
 svg+=left.map(n=>node(n,'design')).join('')+right.map(n=>node(n,'verify')).join('');
 svg+='<g class="pv-v-build"><rect x="258" y="321" width="224" height="51" rx="8"/><text x="370" y="342" text-anchor="middle">Build / procure this product</text><text x="370" y="360" text-anchor="middle" class="pv-v-build-detail">controlled configuration</text></g></svg>';
 const relation=parent?partLink(parent,parent.title,'pv-part-link'):'<span>'+esc(next)+'</span>';
 return '<figure class="pv-v-figure"><div class="pv-v-scroll" tabindex="0" role="region" aria-label="Product verification V diagram">'+svg+'</div><figcaption>The V repeats at every product level. This page follows <strong>'+esc(plan.level||'this item')+'</strong> verification into its next integration boundary.</figcaption><div class="pv-product-links"><span><small>THIS ITEM</small><strong>'+esc(record.title)+'</strong></span><span aria-hidden="true" class="pv-link-arrow">→</span><span><small>NEXT LEVEL</small>'+relation+'</span>'+(children.length?'<span class="pv-child-count">'+children.length+' linked component'+(children.length===1?'':'s')+'</span>':'')+'</div></figure>';
}

function methodOverview(activities,key){
 const counts=Object.fromEntries(Object.keys(methods).map(m=>[m,activities.filter(a=>methodList(a).includes(m)).length])),max=Math.max(1,...Object.values(counts));
 return '<section class="pv-method-overview" aria-labelledby="'+key+'"><div class="pv-subheading"><h4 id="'+key+'">Four ways to establish compliance</h4><span>Methods may be combined</span></div><div class="pv-method-cards">'+Object.entries(methods).map(([m,d])=>'<div class="pv-method-card" data-method="'+m+'"><div><span class="pv-method-letter" aria-hidden="true">'+d.letter+'</span><h5>'+d.name+'</h5><span class="pv-method-count">'+counts[m]+' activit'+(counts[m]===1?'y':'ies')+'</span></div><p>'+d.description+'</p><div class="pv-method-meter" aria-hidden="true"><span style="width:'+Math.round(100*counts[m]/max)+'%"></span></div></div>').join('')+'</div><p class="pv-quiet">The bars count planned activities using each method. One activity can contribute to more than one method; they do not indicate verification completion.</p></section>';
}

function matrix(activities,chosen,key){
 return '<section class="pv-plan-matrix" aria-labelledby="'+key+'"><div class="pv-subheading"><h4 id="'+key+'">Verification plan</h4><span>Choose an activity to explore its setup</span></div><div class="pv-table-scroll" tabindex="0" role="region" aria-label="Verification activity matrix"><table><caption class="pv-sr">Planned verification activities, allocated requirements, methods and settings</caption><thead><tr><th scope="col">Activity</th><th scope="col">Requirement / objective</th><th scope="col">Method</th><th scope="col">Setting</th></tr></thead><tbody>'+activities.map((a,i)=>'<tr data-selected="'+(a.id===chosen.id)+'"><th scope="row"><button type="button" data-verification-activity="'+esc(a.id)+'" aria-pressed="'+(a.id===chosen.id)+'"><span class="pv-activity-number">'+String(i+1).padStart(2,'0')+'</span><span>'+esc(a.title)+'</span><span class="pv-row-arrow" aria-hidden="true">↗</span></button></th><td>'+esc(a.requirement||a.objective)+'</td><td>'+badges(a)+'</td><td>'+esc(verificationSettings[a.setting]?.label||a.setting||'Engineering review')+'</td></tr>').join('')+'</tbody></table></div></section>';
}

const chartNotes={
 'thermal-cycle':{label:'Environmental sequence',a:'CONTROL THE ENVIRONMENT',b:'OBSERVE THE ARTICLE',caption:'The commanded chamber condition and the measured article response are different records. Targets, ramps, dwell times and operating states belong in the approved procedure.'},
 vibration:{label:'Dynamic-test evidence path',a:'DEFINED EXCITATION',b:'MEASURED RESPONSE',caption:'The specified input, fixture behavior and article response must be distinguished. This diagram contains no vibration spectrum or test level.'},
 load:{label:'Load path and evidence',a:'PRESCRIBED LOAD',b:'REACTION & RESPONSE',caption:'The fixture establishes the load path. Applied load and measured deformation or strain need a defined relationship to the structural requirement.'},
 signal:{label:'Functional-test evidence path',a:'KNOWN STIMULUS',b:'OBSERVED OUTPUT',caption:'A controlled stimulus passes through the intended interface. Capture the response and compare it with the agreed requirement.'},
 inspection:{label:'Inspection evidence path',a:'CONTROLLED REFERENCE',b:'OBSERVED ATTRIBUTE',caption:'Compare the as-built item and its records with the applicable drawing, material, cleanliness or workmanship criterion.'},
 sequence:{label:'Planned verification sequence',a:'ESTABLISH THE BASELINE',b:'RETAIN THE EVIDENCE',caption:'This is an illustration of the proposed sequence. Its steps and controls are finalized with the item’s verification procedure.'}
};
function activityDiagram(activity,record,key){
 const chart=activity.chart||{kind:methodList(activity).includes('inspection')?'inspection':'sequence'},kind=chartNotes[chart.kind]?chart.kind:'sequence',note=chartNotes[kind];
 const steps=list(chart.steps).map(s=>typeof s==='string'?{label:s,description:''}:s).filter(s=>s?.label);
 const sourceLabels={vibration:['Exciter','Control sensor'],load:['Actuator','Load cell'],signal:['Stimulus','Known input'],inspection:['Drawing','Criterion'],'thermal-cycle':['Chamber','Commanded state'],sequence:['Preparation','Configuration']};
 const outputLabels={vibration:['Article response','Acceleration / function'],load:['Article response','Displacement / strain'],signal:['Output capture','Interface / performance'],inspection:['Inspection record','Attribute / disposition'],'thermal-cycle':['Article response','Temperature / function'],sequence:['Evidence review','Results / disposition']};
 const left=sourceLabels[kind],right=outputLabels[kind];
 let svg=svgOpen(key,note.label,'Planning diagram for '+activity.title+'. '+note.caption,680,216);
 svg+='<text class="pv-diagram-kicker" x="22" y="24">'+note.a+'</text><text class="pv-diagram-kicker" x="658" y="24" text-anchor="end">'+note.b+'</text>';
 svg+='<g class="pv-diagram-source"><rect x="20" y="49" width="172" height="94" rx="9"/>'+svgText(left[0],106,77,{anchor:'middle',cls:'pv-diagram-title',lines:1})+svgText(left[1],106,102,{anchor:'middle',cls:'pv-diagram-small',lines:2,width:23})+'</g>';
 svg+='<g class="pv-diagram-item"><rect x="254" y="46" width="172" height="100" rx="10"/>'+svgText('Verification article',340,72,{anchor:'middle',cls:'pv-diagram-title',lines:1})+svgText(chart.articleLabel||articleLabels[activity.article]||'Defined configuration',340,98,{anchor:'middle',cls:'pv-diagram-small',lines:2,width:23})+'</g>';
 svg+='<g class="pv-diagram-output"><rect x="488" y="49" width="172" height="94" rx="9"/>'+svgText(right[0],574,77,{anchor:'middle',cls:'pv-diagram-title',lines:1})+svgText(right[1],574,102,{anchor:'middle',cls:'pv-diagram-small',lines:2,width:23})+'</g>';
 svg+=arrow(195,94,247,94,'#a1c8df')+arrow(429,94,481,94,'#9dd8ce');
 if(kind==='load'){svg+='<path d="M271 150 H409 M283 150 l-7 9 m28 -9 l-7 9 m28 -9 l-7 9 m28 -9 l-7 9 m28 -9 l-7 9 m28 -9 l-7 9" stroke="#6e8c98" fill="none"/>';}
 if(kind==='vibration'){svg+='<g class="pv-axis-tags"><rect x="280" y="154" width="32" height="23" rx="3"/><rect x="324" y="154" width="32" height="23" rx="3"/><rect x="368" y="154" width="32" height="23" rx="3"/><text x="296" y="170" text-anchor="middle">X</text><text x="340" y="170" text-anchor="middle">Y</text><text x="384" y="170" text-anchor="middle">Z</text></g>';}
 if(kind==='thermal-cycle'){svg+='<g class="pv-thermal-tags"><path d="M285 157 H334 M346 157 H395" stroke-width="4" stroke-linecap="round"/><text x="308" y="179" text-anchor="middle">cold target</text><text x="372" y="179" text-anchor="middle">hot target</text></g>';}
 svg+='<path d="M573 149 V191 H106 V150" class="pv-diagram-feedback"/>'+svgText('Compare with the requirement · record the configuration and result',340,209,{anchor:'middle',width:80,lines:1,cls:'pv-diagram-foot'})+'</svg>';
 return '<figure class="pv-activity-diagram"><div class="pv-chart-heading"><span>'+esc(note.label)+'</span><span class="pv-chart-label">Planning diagram</span></div><div class="pv-svg-scroll" tabindex="0" role="region" aria-label="'+esc(note.label)+'">'+svg+'</div><figcaption>'+esc(chart.caption||note.caption)+'</figcaption>'+(steps.length?'<ol class="pv-test-steps">'+steps.map((s,i)=>'<li><span>'+String(i+1).padStart(2,'0')+'</span><div><strong>'+esc(s.label)+'</strong>'+(s.description?'<p>'+esc(s.description)+'</p>':'')+'</div></li>').join('')+'</ol>':'')+'</figure>';
}

function sourceLinks(ids){return '<div class="pv-inline-sources">'+[...new Set(list(ids))].map(k=>verificationSources[k]).filter(Boolean).map(s=>external(s.url,[s.organization,s.section].filter(Boolean).join(' · ')||s.title)).join('')+'</div>';}
function selectedActivity(activity,activities,record,key){
 const index=activities.findIndex(a=>a.id===activity.id)+1,setting=verificationSettings[activity.setting],thermal=['thermal-vacuum','thermal-cycle'].includes(activity.setting);
 return '<section class="pv-activity-focus" id="'+key+'" tabindex="-1" aria-labelledby="'+key+'-heading"><header><div><div class="pv-eyebrow">Activity '+String(index).padStart(2,'0')+' / '+String(activities.length).padStart(2,'0')+'</div><h4 id="'+key+'-heading">'+esc(activity.title)+'</h4>'+badges(activity)+'</div><span class="pv-status">Planned</span></header><div class="pv-requirement"><span>Requirement / objective</span><p>'+esc(activity.requirement||activity.objective)+'</p></div>'+
  (activity.objective&&activity.objective!==activity.requirement?'<p class="pv-activity-objective">'+esc(activity.objective)+'</p>':'')+
  '<div class="pv-setting-callout"><div><span class="pv-eyebrow">Verification setting</span><strong>'+esc(setting?.label||activity.setting||'Engineering review')+'</strong>'+(setting?.description?'<p>'+esc(setting.description)+'</p>':'')+'</div><div class="pv-setting-actions">'+(thermal?'<button type="button" data-part-thermal-jump data-thermal-setting="'+esc(activity.setting)+'">Open thermal requirements &amp; analysis <span aria-hidden="true">↑</span></button>':'')+(setting?'<button type="button" data-part-setting="'+esc(activity.setting)+'">Show setting in 3D <span aria-hidden="true">↑</span></button>':'')+(activity.animation&&!thermal?'<button type="button" data-verification-animation="'+esc(activity.animation)+'" data-verification-setting="'+esc(activity.setting||'')+'">'+esc(animationLabels[activity.animation]||'Illustrate the sequence')+' <span aria-hidden="true">▷</span></button>':'')+'</div></div>'+
  activityDiagram(activity,record,key+'-diagram')+
  (activity.approach?section('Approach','<p>'+esc(activity.approach)+'</p>','pv-approach'):'')+
  '<div class="pv-focus-grid">'+section('Article and conditions','<dl class="pv-conditions"><div><dt>Article / boundary</dt><dd>'+esc(articleLabels[activity.article]||activity.article||'To be assigned')+'</dd></div><div><dt>Conditions</dt><dd>'+esc(text(activity.conditions)||'Define the conditions in the controlled verification procedure.')+'</dd></div></dl>'+(list(activity.prerequisites).length?'<h5>Before starting</h5>'+bullets(activity.prerequisites):''))+
  section('Measurements and observations',list(activity.measurements).length?bullets(activity.measurements):'<p>Define the observable quantities and their required accuracy in the verification procedure.</p>')+'</div>'+
  '<div class="pv-closure-grid">'+section('Criterion for closure','<p>'+esc(text(activity.criteria)||'The applicable requirement and acceptance criterion must be allocated before formal verification.')+'</p>','pv-criterion')+section('Evidence to retain',bullets(activity.evidence),'pv-evidence')+'</div>'+sourceLinks(activity.sources)+'</section>';
}

function comparisonChart(rows,key){
 const min=Math.min(0,...rows.map(r=>r.value)),max=Math.max(0,...rows.map(r=>r.value)),span=max-min||1,w=680,left=220,right=590,plot=right-left,height=rows.length*54+66;
 const sx=value=>left+(value-min)/span*plot,zero=sx(0),unit=rows[0].unit||'';
 let svg=svgOpen(key,'Configured values in '+(unit||'the same units'),'Current study values, not measurements: '+rows.map(r=>r.label+' '+valueLabel(r)).join('; '),w,height);
 for(const v of [min,min+span/2,max]){const x=sx(v);svg+='<path d="M'+x+' 18 V'+(height-38)+'" class="pv-chart-grid"/>'+svgText(fmt(v),x,height-15,{anchor:'middle',lines:1,cls:'pv-chart-axis',width:18});}
 rows.forEach((r,i)=>{const y=20+i*54,x=sx(r.value);svg+=svgText(r.label,12,y+17,{width:28,lines:2,cls:'pv-chart-row-label',dy:16})+'<rect x="'+Math.min(zero,x)+'" y="'+y+'" width="'+Math.abs(x-zero)+'" height="25" rx="3" class="pv-value-bar"/>'+svgText(fmt(r.value),right+14,y+18,{lines:1,cls:'pv-chart-value',width:13});});
 svg+='</svg>';return '<figure class="pv-analysis-chart"><div class="pv-chart-heading"><span>Current configured values</span><span class="pv-chart-label">'+esc(unit||'dimensionless')+'</span></div><div class="pv-svg-scroll" tabindex="0" role="region" aria-label="Current configured values">'+svg+'</div></figure>';
}
function calculationDiagram(analysis,key){
 const inputs=list(analysis.inputs).slice(0,3),outputs=list(analysis.outputs),count=Math.max(1,inputs.length),h=Math.max(184,count*70+26),out=outputs[0];
 let svg=svgOpen(key,'Analysis inputs and outcome',analysis.title+'. Inputs: '+inputs.map(r=>r.label+': '+valueLabel(r)).join('; ')+'. '+(out?'Outcome: '+out.label+': '+valueLabel(out):'The verification result has not been established.'),680,h);
 if(!inputs.length)inputs.push({label:'Controlled item definition',value:'Requirements & configuration'});
 inputs.forEach((r,i)=>{const y=14+i*70;svg+='<g class="pv-calc-input"><rect x="12" y="'+y+'" width="250" height="58" rx="6"/>'+svgText(r.label,26,y+21,{width:32,lines:1,cls:'pv-calc-label'})+svgText(valueLabel(r),26,y+43,{width:30,lines:1,cls:'pv-calc-value'})+'</g>'+arrow(265,y+29,332,h/2,'#73899f');});
 svg+='<circle cx="352" cy="'+h/2+'" r="19" class="pv-calc-node"/><text x="352" y="'+(h/2+5)+'" text-anchor="middle" class="pv-calc-node-label">A</text>'+arrow(375,h/2,410,h/2,'#b7a7db');
 svg+='<g class="pv-calc-output"><rect x="416" y="'+(h/2-48)+'" width="250" height="96" rx="8"/>'+svgText(out?.label||'Analysis outcome',430,h/2-21,{width:29,lines:1,cls:'pv-calc-label'})+svgText(out?valueLabel(out):'Planned',430,h/2+5,{width:25,lines:2,cls:'pv-calc-value',dy:20})+'</g></svg>';
 return '<figure class="pv-analysis-chart"><div class="pv-chart-heading"><span>Inputs → analysis → outcome</span><span class="pv-chart-label">'+(analysis.status==='study'?'Current study':'Planned analysis')+'</span></div><div class="pv-svg-scroll" tabindex="0" role="region" aria-label="Analysis inputs and outcome">'+svg+'</div></figure>';
}
function analysisValues(title,rows){return '<section class="pv-analysis-values"><h6>'+title+'</h6><dl>'+list(rows).map(r=>'<div><dt>'+esc(r.label)+'</dt><dd><strong>'+esc(fmt(r.value))+'</strong>'+(r.unit?' <span>'+esc(r.unit)+'</span>':'')+(r.basis?'<small>'+esc(r.basis)+'</small>':'')+'</dd></div>').join('')+'</dl></section>';}
export function analysisComparisonRows(analysis){
 const numeric=row=>typeof row?.value==='number'&&Number.isFinite(row.value),outputs=list(analysis.outputs),primary=outputs.find(numeric);
 if(!primary)return [];
 const unit=primary.unit||'',rowKey=row=>JSON.stringify([row.label,row.value,row.unit||'']);
 const rows=[...new Map([...list(analysis.inputs),...outputs].filter(row=>numeric(row)&&(row.unit||'')===unit).map(row=>[rowKey(row),row])).values()];
 if(rows.length<2||!rows.some(row=>row.value!==0))return [];
 const shown=rows.slice(0,6);
 if(!shown.some(row=>rowKey(row)===rowKey(primary)))shown[shown.length-1]=primary;
 return shown;
}
function analysesMarkup(analyses,key){
 if(!analyses.length)return '';
 return '<section class="pv-analyses" aria-labelledby="'+key+'-heading"><div class="pv-subheading"><h4 id="'+key+'-heading">Analysis before and alongside testing</h4><span>Model inputs and evidence limits</span></div><div class="pv-analysis-list">'+analyses.map((a,index)=>{
  const comparable=analysisComparisonRows(a),chart=comparable.length?comparisonChart(comparable,key+'-'+index):calculationDiagram(a,key+'-'+index);
  return '<article class="pv-analysis-card"><header><div><span class="pv-eyebrow">'+esc(a.kind||'Engineering analysis')+'</span><h5>'+esc(a.title)+'</h5></div><span class="pv-status '+(a.status==='study'?'pv-study':'')+'">'+(a.status==='study'?'Current study':'Planned')+'</span></header><p>'+esc(a.description)+'</p>'+chart+(a.equation?'<div class="pv-equation"><span>Relationship</span><code>'+esc(a.equation)+'</code></div>':'')+'<div class="pv-analysis-data">'+analysisValues('Inputs',a.inputs)+analysisValues('Outputs / planned result',a.outputs)+'</div>'+(list(a.limits).length?'<div class="pv-analysis-limits"><h6>Scope of this analysis</h6>'+bullets(a.limits)+'</div>':'')+sourceLinks(a.sources)+'</article>';
 }).join('')+'</div></section>';
}
function handoffMarkup(plan,catalog,partLink){
 const h=plan.integration||{},parent=get(catalog,h.parentId);
 return '<section class="pv-handoff"><header><div class="pv-eyebrow">Next integration level</div><h4>'+esc(h.title||'Evidence for integration and acceptance')+'</h4>'+(parent?'<p>Integrates into '+partLink(parent,parent.title,'pv-part-link')+'.</p>':'')+'</header><div class="pv-handoff-grid">'+section('Entry conditions',bullets(h.prerequisites))+section('Integration sequence','<ol>'+list(h.steps).filter(x=>text(x)).map(x=>'<li>'+esc(text(x))+'</li>').join('')+'</ol>')+section('Handoff evidence',bullets(h.evidence))+'</div><div class="pv-acceptance-gate"><span class="pv-gate-icon" aria-hidden="true">◇</span><div><strong>Acceptance is an evidence review.</strong><p>Results, configuration records and open-item dispositions support the decision to integrate. A selected scene or completed animation does not record that decision.</p></div></div></section>';
}
function referencesMarkup(plan,activities,analyses){
 const ids=[...new Set([...list(plan.sources),...activities.flatMap(a=>list(a.sources)),...analyses.flatMap(a=>list(a.sources))])],refs=ids.map(k=>verificationSources[k]).filter(Boolean);
 if(!refs.length)return '';
 return '<details class="pv-references"><summary>Verification references <span>'+refs.length+' documents / sections</span></summary><ol>'+refs.map(s=>'<li><div class="pv-eyebrow">'+esc(s.organization)+'</div><h5>'+external(s.url,s.title)+'</h5>'+(s.section?'<div class="pv-source-section">'+esc(s.section)+'</div>':'')+(s.description?'<p>'+esc(s.description)+'</p>':'')+'</li>').join('')+'</ol></details>';
}

export function renderPartVerification(record,catalog,hardware,{activityId,partLink}={}){
 const plan=partVerification(record,catalog,hardware);if(!plan)return '';
 const activities=list(plan.activities),analyses=list(plan.analyses),chosen=activities.find(a=>a.id===activityId)||activities[0],key='pv-'+id(record.id),link=partLink||((r,label=r.title)=>'<span>'+esc(label)+'</span>');
 if(!chosen)return '';
 const methodCount=new Set(activities.flatMap(methodList)).size;
 return '<section class="part-verification" data-verification-profile="'+esc(plan.profile)+'" data-verification-active="'+esc(chosen.id)+'" aria-labelledby="'+key+'-heading"><header class="pv-header"><div><div class="pv-eyebrow">PDR verification plan</div><h3 id="'+key+'-heading">Verification & integration</h3><p>'+esc(plan.summary||plan.title)+'</p></div><span class="pv-status">Evidence open</span><div class="pv-plan-stats"><span><strong>'+activities.length+'</strong> planned activities</span><span><strong>'+methodCount+'</strong> verification methods</span><span><strong>'+list(plan.settings).filter(s=>!['studio','installed','review'].includes(s)).length+'</strong> applicable settings</span></div></header>'+
  vDiagram(record,catalog,plan,key+'-v',link)+(plan.scope?'<p class="pv-plan-scope">'+esc(plan.scope)+'</p>':'')+methodOverview(activities,key+'-methods')+matrix(activities,chosen,key+'-matrix')+selectedActivity(chosen,activities,record,key+'-activity')+analysesMarkup(analyses,key+'-analysis')+handoffMarkup(plan,catalog,link)+referencesMarkup(plan,activities,analyses)+'</section>';
}
