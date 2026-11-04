import assert from 'node:assert/strict';
import {controls,defaults,applyPreset,presets,solveModes} from './dist/design.js';
import {launchFleet} from './dist/launch-fleet.js';
import {thermalNodes} from './dist/thermal-limits.js';
import {fieldGuidance,guidanceSources} from './dist/input-guidance.js';

const known=new Map(guidanceSources.map(s=>[s.id,s]));
assert.equal(known.size,guidanceSources.length,'Duplicate source ID');
for(const ref of guidanceSources){
 const url=new URL(ref.url);assert.equal(url.protocol,'https:',ref.id);assert.ok(ref.title&&ref.locator&&ref.kind,ref.id);
 assert.ok(!url.searchParams.has('utm_source')&&!url.searchParams.has('trk'),ref.url);
}
const validate=(key,r)=>{
 assert.ok(r,key);assert.ok(r.title&&r.advice.length>=25&&r.basis&&r.sources.length,key);
 assert.equal(new Set(r.sources.map(s=>s.id)).size,r.sources.length,key);
 for(const ref of r.sources)assert.equal(known.get(ref.id),ref,key);
 assert.doesNotMatch(r.advice+' '+(r.example??''),/\b(?:NaN|Infinity|undefined)\b/,key);
};
for(const key of Object.keys(defaults))validate(key,fieldGuidance(key,defaults));
for(const control of controls){
 const guide=fieldGuidance(control.key,defaults);
 if(!control.options){
  assert.deepEqual([guide.bounds.min,guide.bounds.max,guide.bounds.step,guide.bounds.unit],[control.min,control.max,control.step,control.unit||'']);
  assert.ok(guide.example,control.key);assert.match(guide.bounds.note,/Workbench input range/);
 }else{
  assert.deepEqual(Object.keys(control.options).sort(),guide.options.map(o=>o.value).sort(),control.key);
  for(const value of Object.keys(control.options)){const selected=fieldGuidance(control.key,defaults,{option:value});validate(control.key,selected);assert.equal(selected.selectedOption,value);}
 }
}
for(const key of ['solve','epoch','kvKB','diskModuleKg','referenceKg','missionPreset','newPreset','presetName','presetDescription','savePreset','loadPreset','managePresets','thermalRole','thermalPadding','thermalScope','thermalNode','thermalScale','adoptRating','technologyCompare','independentTarget','launcherEnvelope','referenceOrbit','launcherMaturity'])validate(key,fieldGuidance(key));
assert.deepEqual(fieldGuidance('solve').options.map(o=>o.value).sort(),Object.keys(solveModes).sort());
assert.equal(fieldGuidance('savepreset').title,fieldGuidance('savePreset').title);
assert.deepEqual(fieldGuidance('thermalNode').options.map(o=>o.value),thermalNodes.map(n=>n.id));
for(const n of thermalNodes)for(const state of ['operating','survival'])for(const side of ['min','max']){
 const g=fieldGuidance(n.keys[state][side]);assert.ok(g.advice.includes(state));assert.ok(g.sources.some(s=>s.id==='gevst'));assert.match(g.basis,/component requirement/);
}
assert.equal(fieldGuidance('missionPreset',defaults,{option:'user-new-study'}).selectedOption,'custom');
assert.equal(fieldGuidance('bogus-key'),null);
for(const [id,f] of Object.entries(launchFleet)){
 const d=applyPreset(defaults,'launcher',id),g=fieldGuidance('launcher',d);
 assert.ok(g.example.includes(f.referenceKg.toLocaleString('en-US')));assert.ok(g.basis.includes(f.status));
 assert.ok(g.sources.some(x=>x.url===f.sourceUrl));
 const limits=fieldGuidance('fairingLengthM',d);assert.ok(limits.sources.some(x=>x.id==='profile-'+id));
}
const dgx=applyPreset(defaults,'compute','dgx'),refMass=fieldGuidance('trayKg',dgx),customMass=fieldGuidance('trayKg',{...dgx,trayKg:113});
assert.match(refMass.basis,/Matches the selected terrestrial product/);assert.doesNotMatch(customMass.basis,/Matches/);assert.match(customMass.example,/130\.45 kg/);
const lab=fieldGuidance('thermalRole',defaults,{option:'derive',key:'batteryOpMinK'});assert.ok(lab.advice.includes('Battery pack'));
assert.match(fieldGuidance('pvRetention').example,/fluence/);assert.match(fieldGuidance('alphaGrowth').example,/30 years/);
assert.ok(fieldGuidance('structureMargin').sources.some(s=>s.id==='margin'));
assert.match(known.get('smad').locator,/licensed library/);assert.ok(known.get('gold').locator.includes('1.08'));assert.ok(known.get('gevst').locator.includes('2.6.3.2'));
console.log(`${controls.length} design controls, ${Object.keys(defaults).length} persisted fields, ${Object.keys(presets.launcher).length} launcher choices, all preset/solver/thermal options and ${known.size} located references passed.`);
