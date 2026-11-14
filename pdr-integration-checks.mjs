import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readStaticAssetIndex} from './asset-index-fixture.mjs';
import {defaults,missionStarter,sizeDesign,sizingEnvelope,inverseSolve,strictSizingMinimum,meetsSizingRequirement,estimateLife,sizingMargin} from './dist/design.js';
import {designIdentity,inputRole,isPolicyInput} from './dist/design-contract.js';
import {assessPdrDomains,pdrDomainOrder,pdrAssessmentHtml,renderPdrDomain} from './dist/pdr-assessment.js';
import {goldRules} from './dist/mission-gold-rules.js';
import {baselineRecord,baselineHtml} from './dist/mission-baseline.js';

const base=missionStarter('text'),h=sizeDesign(base),identity=designIdentity(h),e=sizingEnvelope(h);
const unchanged=['dryKg','wetKg','launchKg','bodyWidthM','bodyHeightM','bodyLengthM','solarM2','radiatorM2','batteryKWh','storageTB','propellantKg','tankVolumeL','trays','chips','memoryGB'];
for(const patch of [{altitudeKm:800},{altitudeKm:2000},{missionYears:15},{paramsB:300},{serviceOffersPerHour:99999},{duty:.4},{aiPurpose:'pretrain'}]){
  const changed=sizeDesign({...base,...patch}),other=designIdentity(changed);
  for(const key of unchanged)assert.equal(changed[key],h[key],key+' must remain installed under '+JSON.stringify(patch));
  assert.equal(other.vehicleId,identity.vehicleId,'Mission edit silently changed vehicle identity');
  assert.notEqual(other.missionId,identity.missionId,'Mission edit must be traceable');
}
const raised=sizeDesign({...base,altitudeKm:2000});
assert.notEqual(sizingEnvelope(raised).disposalBudgetDv,e.disposalBudgetDv,'Changed orbit must change the assessed mission demand');
assert.equal(raised.propellantKg,h.propellantKg,'Changed disposal demand must not refill the vehicle');
assert.notEqual(designIdentity(sizeDesign({...base,solarM2:500})).vehicleId,identity.vehicleId,'A physical area change must revise the vehicle identity');
console.log('PASS installed vehicle invariants across orbit, lifetime, workload and purpose changes');

const dryLimit=h.launchKg+.1*e.pdr.mass.basicDryKg;
const exact=sizingEnvelope(sizeDesign({...base,launchAllowanceKg:dryLimit}));
assert.ok(Math.abs(exact.pdr.mass.marginFraction-.1)<1e-12,'Computed equality may differ only by floating-point roundoff');
assert.equal(meetsSizingRequirement(exact.rates.massPdr,'massPdr'),false,'Exactly 10% is not >10%');
assert.equal(meetsSizingRequirement(sizingEnvelope(sizeDesign({...base,launchAllowanceKg:dryLimit+1})).rates.massPdr,'massPdr'),true);
assert.ok(Math.abs(e.solarNeeded-e.solarDemandM2/.85)<1e-10,'15% is measured against availability, not a demand markup');
assert.equal(strictSizingMinimum(100,.01),100.01);
for(const value of [5.01,8.02,8.03,8.11])assert.ok(strictSizingMinimum(value,.01)>value,'Decimal grid rounding must advance beyond '+value);
assert.equal(meetsSizingRequirement(1,'solar'),false,'Strict solar criterion cannot accept equality');
const sized=inverseSolve(base,'solar');
assert.ok(sized.envelope.pdr.power.marginFraction>.15,'Explicit solar proposal must retain the adopted power margin');
assert.equal(sized.envelope.pdr.mass.mgaComplete,false,'Sizing cannot approve missing growth evidence');
assert.match(sizingMargin('solar',e.rates.solar,e),/of available EOL power/);
assert.match(sizingMargin('massPdr',e.rates.massPdr,e),/of basic dry mass/);
const supported=inverseSolve({...defaults,missionYears:.003},'workload').hardware;
const tightAllocation=sizeDesign({...supported.input,launchAllowanceKg:supported.launchKg+1});
assert.equal(sizingEnvelope(tightAllocation).pdr.mass.numericalStatus,'shortfall');
assert.ok(estimateLife(supported).years>0);
assert.equal(estimateLife(tightAllocation).years,estimateLife(supported).years,'A failed PDR mass reserve must not erase nominal resource life');
console.log('PASS policy enforcement in actual mass/power sizing and strict boundary behavior');

const low=sizeDesign({...base,solarM2:5,batteryKWh:1,propellantKg:1,launchAllowanceKg:2000});
const records=[h,raised,low].map(q=>assessPdrDomains({h:q,envelope:sizingEnvelope(q),view:{phase:'B'}}));
const allowed=new Set(['meets','shortfall','unassessed','not_applicable']),ruleIds=new Set(goldRules.map(r=>r.id));
for(const [index,record] of records.entries()){
  assert.deepEqual(record.domains.map(r=>r.id),pdrDomainOrder);
  assert.equal(record.domains.length,17);
  assert.deepEqual(record.configuration,[h,raised,low][index].input,'Exported assessment must describe the exact installed scenario');
  assert.match(record.reviewStatus,/^Open/);
  for(const report of record.domains){
    assert.ok(report.designSummary&&report.design.length&&report.checks.length,report.id+' needs actual design and assessment content');
    assert.match(report.graphic,/<svg\b/,'Missing graphic for '+report.id);
    assert.ok(!report.graphic.includes('NaN'),'Invalid graphic value in '+report.id);
    assert.match(report.reviewStatus,/^Open/);
    assert.ok(report.owner&&report.reviewActions.every(a=>a.owner===report.owner&&a.gate==='PDR'&&a.status==='open'),'PDR actions need a responsible role and gate');
    for(const link of report.interfaces)assert.ok(pdrDomainOrder.includes(link.domain),'Unresolved domain interface '+link.domain);
    for(const check of report.checks){
      assert.ok(check.id&&check.label&&check.basis,report.id+' needs traceable check definitions');
      assert.ok(allowed.has(check.status));
      for(const rule of check.ruleIds)if(/^\d\.\d{2}$/.test(rule))assert.ok(ruleIds.has(rule),'Unknown active GOLD rule '+rule);
    }
    assert.ok(renderPdrDomain(report,record).includes('data-pdr-domain="'+report.id+'"'));
  }
}
assert.ok(records[2].domains.some(r=>r.counts.shortfall>0),'Known resource overload must appear as a shortfall');
assert.ok(records[0].domains.some(r=>r.counts.unassessed>0),'Numerical screens must not erase evidence gaps');
const selected=assessPdrDomains({h,domainIds:['orbit'],sim:{get audit(){return null},duration:86400,thermalWindow(){throw Error('An orbital workspace must not run an unrelated thermal window');}}});
assert.deepEqual(selected.domains.map(r=>r.id),['orbit']);
assert.deepEqual(selected.domains[0],records[0].domains.find(r=>r.id==='orbit'),'The selected workspace must retain the complete-domain calculation');
console.log('PASS all 17 instantiated domains, live graphics, known shortfalls and open evidence');

const html=pdrAssessmentHtml(records[0]),embedded=html.match(/<script type="application\/json" id="pdr-domain-record">([\s\S]*?)<\/script>/);
assert.ok(embedded);assert.deepEqual(JSON.parse(embedded[1]),JSON.parse(JSON.stringify(records[0])));
for(const id of pdrDomainOrder)assert.ok(html.includes('data-pdr-domain="'+id+'"'));
const baseline=baselineRecord(h);assert.deepEqual(baseline.domainAssessments.configuration,h.input);assert.ok(baselineHtml(baseline).includes('domainAssessments'));
const files=await readStaticAssetIndex();
for(const name of ['design-contract.js','pdr-assessment.js','pdr-assessment.css','pdr-flight.js','pdr-resources.js','pdr-service.js'])assert.ok(files.includes(name),name+' missing from the self-hosted bundle');
for(const key of ['structureMargin','reserveFraction','radialPaddingM','axialPaddingM'])assert.ok(isPolicyInput(key)&&inputRole(key)==='policy');
console.log('PASS complete domain exports, configuration provenance and runtime asset inventory');
console.log('PDR integration: four focused groups passed.');
