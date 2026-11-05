import assert from 'node:assert/strict';
import {bayLesson,bayStationFor} from './dist/bay-lessons.js';
import {domains} from './dist/domain-analysis.js';
import {aiPurposes} from './dist/ai-purpose.js';
import {sizeDesign,missionStarter} from './dist/design.js';
const units=new Set(),missions=new Set();
for(const purpose of Object.keys(aiPurposes)){
 const h=sizeDesign(missionStarter(purpose));
 for(const domain of Object.keys(domains)){
  const l=bayLesson(domain,h);
  assert.equal(l.domain,domain);
  assert.equal(l.station,bayStationFor(domain));
  units.add(l.station);
  assert.ok(l.facts.length>=1&&l.facts.length<=3);
  for(const f of l.facts)assert.ok(Number.isFinite(f.value)&&f.unit&&f.basis.length>15,domain+' '+f.label);
  assert.ok(l.sources.every(s=>s.url.startsWith('https://')&&s.title.length>5));
  assert.ok(l.sources.length>0);
  for(const key of ['question','explanation','procedure','interpretation'])assert.ok(l[key].length>24,domain+' '+key);
  assert.doesNotMatch(JSON.stringify(l),/NaN|Infinity|undefined/);
  if(domain==='purpose')missions.add(l.procedure);
 }
}
assert.equal(units.size,15);
assert.equal(missions.size,6);
const basic=missionStarter('text'),h=sizeDesign(basic);
const fits=bayLesson('launch',h);
assert.equal(fits.facts[0].value,h.fairing.radialClearanceM*1000);
assert.equal(fits.facts[1].value,h.fairing.axialClearanceM*1000);
assert.equal(fits.status,'within');
const crowded=sizeDesign({...basic,fairingM:2.2});
assert.equal(bayLesson('launch',crowded).status,'exceeds');
assert.equal(bayLesson('mass',sizeDesign({...basic,launchAllowanceKg:500})).status,'exceeds');
assert.equal(bayLesson('launcher',sizeDesign({...basic,launchAllowanceKg:500})).status,'exceeds');
assert.equal(bayLesson('power',sizeDesign({...basic,batteryKWh:80})).facts[0].value,80);
const unfit=sizeDesign({...missionStarter('pretrain'),trayCount:1});
assert.equal(bayLesson('compute',unfit).status,'exceeds');
assert.equal(bayLesson('data',sizeDesign({...basic,storageTB:.1,inputSpoolGB:8000})).status,'exceeds');
const noBase=sizeDesign({...missionStarter('finetune'),artifactKind:'adapter',baseCompatible:'no'});
assert.equal(bayLesson('purpose',noBase).status,'exceeds');
console.log('Six customer purposes, all seventeen facility disciplines, signed fit/mass/memory/storage evidence and incompatible receiver checks passed.');
