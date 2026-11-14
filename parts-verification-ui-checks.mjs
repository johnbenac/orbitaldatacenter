import assert from 'node:assert/strict';
import {sizeDesign,missionStarter} from './dist/design.js';
import {buildReferenceDesign,referenceConfigurationMetadata} from './dist/reference-configurations.js';
import {launchFleet} from './dist/launch-fleet.js';
import {buildPartsCatalog} from './dist/parts-catalog.js';
import {partVerification,verificationSettings} from './dist/part-verification.js';
import {renderPartVerification,analysisComparisonRows} from './dist/part-verification-ui.js';

const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const link=(r,label=r.title)=>'<a data-part-select="'+esc(r.id)+'" href="?part='+encodeURIComponent(r.id)+'">'+esc(label)+'</a>';
const seed=missionStarter('text'),inputs=[...Object.keys(referenceConfigurationMetadata).map(buildReferenceDesign),...Object.keys(launchFleet).map(launcher=>({...seed,launcher})),{...seed,engine:'aero'}];
let pages=0,activities=0,svgFigures=0;const distinct=new Set(),profiles=new Set(),categories=new Set();
for(const input of inputs){
 const h=sizeDesign(input),catalog=buildPartsCatalog(h),before=JSON.stringify({catalog,h});
 for(const record of catalog.records){
  const plan=partVerification(record,catalog,h),html=renderPartVerification(record,catalog,h,{partLink:link}),label=(input.referenceCenterId||input.launcher)+'/'+record.id;
  assert(html.includes('class="part-verification"'),label+' has a verification learning section');
  assert(!/<canvas|<iframe|<script|\son\w+=/.test(html),label+' learning section does not allocate extra renderers or inline handlers');
  assert(!/>undefined<|="undefined"|\[object Object\]|\bNaN\b|\bInfinity\b/.test(html),label+' does not expose malformed data');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,label+' has unique accessible graphic and heading IDs');
  for(const match of html.matchAll(/aria-labelledby="([^"]+)"/g))for(const target of match[1].split(/\s+/))assert(ids.includes(target),label+' resolves accessible label '+target);
  for(const match of html.matchAll(/data-part-setting="([^"]+)"/g))assert(verificationSettings[match[1]],label+' setting action resolves');
  const renderedActivities=[...html.matchAll(/data-verification-activity="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(renderedActivities,plan.activities.map(a=>a.id),label+' exposes every applicable activity exactly once');
  for(const match of html.matchAll(/data-part-select="([^"]+)"/g))assert(catalog.byId[match[1]],label+' resolves the next product boundary');
  assert(html.includes('Evidence open')&&html.includes('Planning diagram'),label+' distinguishes planned verification from measured evidence');
  assert(html.includes('Acceptance is an evidence review.'),label+' does not imply scene playback accepts hardware');
  const selected=plan.activities.at(-1),focused=renderPartVerification(record,catalog,h,{activityId:selected.id,partLink:link});
  assert(focused.includes('data-verification-active="'+esc(selected.id)+'"'),label+' requested activity becomes active');
  assert(focused.includes('data-verification-activity="'+esc(selected.id)+'" aria-pressed="true"'),label+' active activity is announced');
  for(const match of html.matchAll(/href="([^"]+)"/g))assert(match[1].startsWith('https://')||match[1].startsWith('?part='),label+' links only to controlled navigation or HTTPS references');
  pages++;activities+=plan.activities.length;svgFigures+=(html.match(/<svg /g)||[]).length;distinct.add(record.id);profiles.add(plan.profile);categories.add(record.category);
 }
 assert.equal(JSON.stringify({catalog,h}),before,'rendering a verification plan cannot change hardware, catalog quantities, or the engineering mass ledger');
}
const h=sizeDesign(seed),catalog=buildPartsCatalog(h),record=catalog.byId['flight:02.02.01'];
const unsafe={...record,title:'"><img src=x onerror=alert(1)> & "title"'};
const safe=renderPartVerification(unsafe,catalog,h,{partLink:link});
assert(safe.includes('&lt;img src=x onerror=alert(1)&gt;'),'product titles remain escaped in HTML and SVG');
assert(!safe.includes('<img src=x'),'product titles cannot inject markup');
assert.equal(renderPartVerification(record,catalog,h,{activityId:'missing'}).match(/data-verification-active="([^"]+)"/)[1],partVerification(record,catalog,h).activities[0].id,'unavailable saved activity falls back to a valid plan activity');
const batteryHardware=sizeDesign(buildReferenceDesign('redwire-8kw')),batteryCatalog=buildPartsCatalog(batteryHardware),battery=batteryCatalog.byId['flight:02.02'];
const energy=partVerification(battery,batteryCatalog,batteryHardware).analyses.find(a=>a.id==='battery-energy');
assert.deepEqual(analysisComparisonRows(energy).map(row=>[row.label,row.value,row.unit]),[['Nominal pack energy',12,'kWh'],['Nominal energy in SOC window',9.6,'kWh']],'battery chart compares nominal and usable energy instead of unrelated converter-power outputs');
const batteryHTML=renderPartVerification(battery,batteryCatalog,batteryHardware),energyCard=[...batteryHTML.matchAll(/<article class="pv-analysis-card">[\s\S]*?<\/article>/g)].map(match=>match[0]).find(card=>card.includes('<h5>Battery energy window</h5>'));
const energyFigure=energyCard.match(/<figure class="pv-analysis-chart">[\s\S]*?<\/figure>/)[0];
assert(energyFigure.includes('Nominal pack energy 12 kWh')&&energyFigure.includes('Nominal energy in SOC window 9.6 kWh'),'accessible chart description contains the primary input/result comparison');
assert(!energyFigure.includes('converter limit')&&!energyFigure.includes('>kW<'),'the energy chart does not mix power or fraction units');
const datum={label:'Nominal',value:12,unit:'kWh'},result={label:'Usable',value:9.6,unit:'kWh'};
assert.deepEqual(analysisComparisonRows({inputs:[datum,{...datum}],outputs:[result,{...result}]}),[datum,result],'identical chart rows appear only once');
assert.deepEqual(analysisComparisonRows({inputs:[],outputs:[result,{label:'Charge',value:12,unit:'kW'},{label:'Discharge',value:12,unit:'kW'}]}),[],'without a primary-result comparison, show the calculation diagram instead of changing the plotted unit');
assert.deepEqual(analysisComparisonRows({inputs:[datum],outputs:[{label:'Pending',value:'Not measured',unit:'kWh'}]}),[],'a pending result is not graphed as a numeric outcome');
const many=Array.from({length:8},(_,index)=>({label:'Input '+index,value:index+1,unit:'kWh'}));
assert(analysisComparisonRows({inputs:many,outputs:[result]}).includes(result),'the chart row limit cannot hide the primary numeric output');
console.log(JSON.stringify({configurations:inputs.length,pages,distinctPartIds:distinct.size,profiles:profiles.size,activities,svgFigures,categories:[...categories]},null,2));
console.log('Verification UI: catalog coverage, activity navigation, accessible SVG references, valid setting/parent links, safe text, and unchanged engineering data passed.');
