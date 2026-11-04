import assert from 'node:assert/strict';
import {launchFleet} from './dist/launch-fleet.js';
import {fairings} from './dist/fairings.js';
import {sizeDesign,defaults,applyPreset,normalizeDesign,inverseSolve,sizingEnvelope,estimateLife,presets} from './dist/design.js';
import {launcherFits,renderLaunchFleet} from './dist/launch-fleet-ui.js';
const h=sizeDesign(defaults),rows=launcherFits(h);
assert.deepEqual(Object.keys(presets.launcher),Object.keys(launchFleet));
assert.equal(rows.length,10);
for(const {id,vehicle:v,fairing:f} of rows){
 const input=applyPreset(defaults,'launcher',id),sized=sizeDesign(input);
 assert.equal(input.launchAllowanceKg,defaults.launchAllowanceKg);
 assert.ok(v.referenceKg>20000&&v.referenceOrbit&&v.recovery&&v.status&&v.stages>0&&v.heightM>0);
 assert.equal(sized.input.referenceKg,v.referenceKg);
 assert.equal(normalizeDesign({...input,referenceKg:1e12}).referenceKg,v.referenceKg);
 assert.equal(sized.launchReferenceMarginKg,v.referenceKg-sized.launchKg);
 assert.equal(sized.launchScreenMarginKg,Math.min(v.referenceKg,input.launchAllowanceKg)-sized.launchKg);
 assert.equal(sized.launchScreenFeasible,sized.launchScreenMarginKg>=0&&f.fit);
 assert.equal(fitNumber(f.radialClearanceM),fitNumber(sized.fairing.radialClearanceM));assert.equal(f.fit,sized.fit);
 assert.ok(f.outerDiameterM>f.maxDiameterM&&f.basis&&f.note&&f.sourceUrl.startsWith('https://'));
 assert.ok(v.sourceUrl.startsWith('https://'));assert.ok(!/SLS|Space Launch System/.test(v.name));assert.ok(Object.hasOwn(fairings,id));
 const text=renderLaunchFleet(sized,'B');assert.ok(text.includes(v.sourceUrl));assert.ok(text.includes(v.referenceOrbit.replaceAll('>','&gt;')));
}
function fitNumber(x){return +x.toFixed(8)}
for(const phase of 'ABCDEF'){
 const html=renderLaunchFleet(h,phase);
 assert.equal((html.match(/data-use-launcher=/g)||[]).length,['A','B','C'].includes(phase)?10:0);
 assert.ok(!/undefined|NaN|Infinity/.test(html));assert.ok(html.includes('Governing mass headroom'));
}
const overload=sizeDesign({...defaults,propellantKg:30000,launchAllowanceKg:100000,fairingM:12,fairingLengthM:40});
assert.ok(overload.fit&&overload.massMarginKg>0&&overload.launchReferenceMarginKg<0);
assert.ok(!overload.launchScreenFeasible);assert.ok(!sizingEnvelope(overload).feasible);assert.ok(sizingEnvelope(overload).rates.launcherReference<1);
assert.equal(estimateLife(overload,30,{thermal:{}}).binding,'Published launcher reference screen');
assert.equal(inverseSolve(overload.input,'installed').feasible,false);
const admissible=sizeDesign({...defaults,launchAllowanceKg:2200});
assert.ok(admissible.launchReferenceMarginKg>0&&admissible.massMarginKg<0&&!admissible.launchScreenFeasible);
assert.equal(launchFleet.terran.referenceKg,23500);assert.ok(launchFleet.terran.referenceOrbit.includes('200 km'));
assert.ok(launchFleet.glenn.referenceOrbit.includes('51.6°'));assert.equal(launchFleet.falconHeavy.referenceKg,63800);
assert.equal(launchFleet.longMarch5B.stages,1);assert.equal(launchFleet.longMarch9.status,'Design study · 2023 baseline');
console.log('Ten sourced launch configurations, independent benchmark and allowance screens, cross-fleet folded geometry, input canonicalization, all six catalogue phases and published reference cases passed.');
