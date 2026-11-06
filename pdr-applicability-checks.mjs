import assert from 'node:assert/strict';
import {defaults,sizeDesign} from './dist/design.js';
import {assessPdrDomains,domainApplicability,pdrDomainOrder,pdrApplicabilityMap,renderPdrDomain,renderPdrRegister,pdrAssessmentHtml} from './dist/pdr-assessment.js';

const h=sizeDesign({...defaults,missionYears:.003}),before=JSON.stringify(h),record=assessPdrDomains({h});
const plain=value=>JSON.parse(JSON.stringify(value)),get=(r,id)=>r.domains.find(d=>d.id===id);
assert.deepEqual(record.domains.map(d=>d.id),pdrDomainOrder);
assert.deepEqual(Object.keys(pdrApplicabilityMap),pdrDomainOrder);
for(const report of record.domains){
 assert.ok(['meets','shortfall','unassessed'].includes(report.numericalStatus));
 assert.ok(['inside','outside','unassessed'].includes(report.applicability.status));
 assert.equal(report.evidenceStatus,'open');assert.equal(report.evidence.independentAcceptance,'unrecorded');
 assert.equal(report.applicability.domain,report.id);
 assert.ok(report.applicability.checks.length>0);
 assert.equal(new Set(report.applicability.checks.map(c=>c.id)).size,report.applicability.checks.length);
 const rendered=renderPdrDomain(report,record);
 for(const axis of ['numerical','applicability','evidence'])assert.ok(rendered.includes(`data-pdr-status-axis="${axis}"`));
 assert.ok(rendered.includes(report.graphic),'The original engineering graphic must remain');
 for(const extra of report.supplementalGraphics){assert.ok(rendered.includes(`data-pdr-supplemental="${extra.id}"`));assert.ok(rendered.includes(extra.svg));}
 assert.doesNotMatch(rendered,/NaN|undefined/);
}

// Raising the orbit invalidates the annual drag source case, not a compute
// package whose installed hardware and fabric have not changed.
const high=sizeDesign({...h.input,altitudeKm:1500}),highRecord=assessPdrDomains({h:high,domainIds:['orbit','prop','compute','data','power']});
assert.equal(get(highRecord,'orbit').applicability.status,'outside');
assert.equal(get(highRecord,'prop').applicability.status,'outside');
for(const id of ['compute','data','power']){
 assert.deepEqual(get(highRecord,id).applicability,get(record,id).applicability);
 assert.ok(get(highRecord,id).applicability.checks.every(c=>!c.id.startsWith('drag-')));
}
const long=sizeDesign({...h.input,missionYears:20});
assert.equal(domainApplicability(long,'compute').checks.find(c=>c.id==='mission-life').status,'outside');

// Numerical insufficiency and model/interface applicability are independent.
// A smaller launch allocation creates a real mass shortfall within the same
// geometric model; the evidence gate is open regardless of either result.
const tight=sizeDesign({...h.input,launchAllowanceKg:100}),tightRecord=assessPdrDomains({h:tight,domainIds:['launcher']});
assert.equal(tightRecord.domains[0].numericalStatus,'shortfall');
assert.equal(tightRecord.domains[0].applicability.status,'inside');
assert.equal(tightRecord.domains[0].evidenceStatus,'open');

// Each interface is routed only to the domains that use it. Missing records
// are unknown; no fallback zero turns an absent rating into a passing scope.
const missingEnergy={...h,energySystem:null};
assert.equal(domainApplicability(missingEnergy,'power').status,'unassessed');
assert.deepEqual(domainApplicability(missingEnergy,'orbit'),domainApplicability(h,'orbit'));
const weakEnergy={...h,energySystem:{...h.energySystem,checks:h.energySystem.checks.map(c=>c.id==='energy-harness'?{...c,status:'shortfall',actual:1}:c)}};
assert.equal(domainApplicability(weakEnergy,'power').checks.find(c=>c.id==='energy-harness').status,'outside');
assert.deepEqual(domainApplicability(weakEnergy,'compute'),domainApplicability(h,'compute'));
const weakFabric={...h,serviceArchitecture:{...h.serviceArchitecture,fabric:{...h.serviceArchitecture.fabric,limits:h.serviceArchitecture.fabric.limits.map(c=>c.id==='fabric-port'?{...c,within:false}:c)}}};
assert.equal(domainApplicability(weakFabric,'compute').status,'outside');
assert.deepEqual(domainApplicability(weakFabric,'power'),domainApplicability(h,'power'));

const relay=sizeDesign({...h.input,serviceRoute:'relay',relayUpMbps:2000,relayDownMbps:3000});
const route=domainApplicability(relay,'comm');
assert.equal(route.status,'outside');assert.equal(route.checks.find(c=>c.id==='relay-up-interface').status,'outside');
assert.equal(route.checks.find(c=>c.id==='relay-down-interface').status,'outside');
assert.equal(route.checks.find(c=>c.id==='relay-geometry-model').status,'unassessed');
assert.deepEqual(domainApplicability(relay,'compute'),domainApplicability(h,'compute'));
const optical=sizeDesign({...h.input,serviceRoute:'direct',link:'optical'});
assert.equal(domainApplicability(optical,'comm').checks.find(c=>c.id==='optical-weather-model').status,'unassessed');

// Live and offline renderers retain the same three status axes, additional
// diagrams and complete machine-readable assessment record.
const register=renderPdrRegister(record),html=pdrAssessmentHtml(record);
assert.match(register,/Numerical capability/);assert.match(register,/Study \/ interface applicability/);assert.match(register,/Evidence and acceptance/);
assert.match(html,/href="#pdr-domain-compute"/);
const supplementalCount=record.domains.reduce((n,d)=>n+d.supplementalGraphics.length,0);
assert.ok(supplementalCount>=8);assert.equal((html.match(/data-pdr-supplemental="/g)||[]).length,supplementalCount);
for(const report of record.domains)assert.ok(html.includes(`data-pdr-domain="${report.id}"`));
const embedded=html.match(/<script type="application\/json" id="pdr-domain-record">([\s\S]*?)<\/script>/);
assert.ok(embedded);assert.deepEqual(JSON.parse(embedded[1]),plain(record));
const one=assessPdrDomains({h,domainIds:['orbit']});assert.deepEqual(one.domains[0],get(record,'orbit'));
assert.equal(JSON.stringify(h),before);
console.log('PDR applicability checks passed: 17 separate numerical/scope/evidence records; domain-specific drag and interface mapping; missing-data handling; numerical shortfall within study scope; relay and weather model limits; all supplemental SVGs and offline JSON; no mutation.');
