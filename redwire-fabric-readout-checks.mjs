// The fabric views must retain adopted route-derived mass instead of rebuilding
// the older endpoint-length allowance during display or report generation.
import assert from 'node:assert/strict';
import {defaults,sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {buildElectricalArchitecture,reconcileInstalledElectricalRouting,connectorSelections} from './dist/electrical-architecture.js';
import {serviceArchitecture,renderComputeFabric,renderEarthServiceRoute} from './dist/service-architecture.js';
import {assessServiceDomains} from './dist/pdr-service.js';

const near=(actual,expected,label)=>assert(Math.abs(actual-expected)<1e-9,label+': '+actual+' != '+expected);
const formatted=(value,places)=>value.toLocaleString('en-US',{maximumFractionDigits:places});
function checkReadouts(h,status){
 const before={launch:h.launchKg,revision:h.electricalMassRevision,ledger:JSON.stringify(h.massLedger)};
 const fabric=h.serviceArchitecture.fabric,svg=renderComputeFabric(h);
 const reports=assessServiceDomains({h,domainIds:['compute','avionics']}),report=reports.compute;
 near(report.architecture.fabric.massKg,fabric.massKg,'PDR report fabric mass');
 near(report.architecture.fabric.cableMassKg,fabric.cableMassKg,'PDR report cable + termination share');
 assert(svg.includes(formatted(fabric.massKg,1)+' kg external fabric / cabling'));
 assert(report.design.find(row=>row.label==='Installed fabric').basis.includes(formatted(fabric.massKg,2)+' kg'));
 assert(report.design.find(row=>row.label==='Installed fabric').basis.includes('adopted cable/termination mass'));
 assert(!svg.includes('6 m endpoint cable allocation'));
 assert(svg.includes(status==='installed-route-mass-adopted'?'Installed cuts + terminations in vehicle mass':'Modeled lengths + terminations in vehicle mass'));
 const reach=report.checks.find(check=>check.id==='compute-fabric-routing');
 assert.equal(reach.label,'Core length within preliminary fabric reach screen');
 assert.equal(reach.actual,h.bodyLengthM);assert.equal(reach.required,h.serviceArchitecture.basis.maxCoreLengthM);
 assert.match(reach.basis,/MEL/);
 for(const check of reports.avionics.checks.filter(row=>row.id.startsWith('avionics-harness-mass-'))){
  near(check.actual,check.required,check.id+' adopted parent closure');
  assert.match(check.evidence,/included once in the MEL parent and vehicle ledger/);
 }
 assert.match(renderEarthServiceRoute(h),/<svg/);
 assert.deepEqual({launch:h.launchKg,revision:h.electricalMassRevision,ledger:JSON.stringify(h.massLedger)},before,'Readouts must not resize or mutate adopted hardware');
}

const h=sizeDesign(buildReferenceDesign('redwire-8kw')),g=buildElectricalArchitecture(h);
assert.equal(h.installedHarnessAccounting.status,'installed-route-mass-adopted');
assert(Math.abs(serviceArchitecture(h).fabric.massKg-h.serviceArchitecture.fabric.massKg)>.1,'Fixture must expose the stale allowance regression');
checkReadouts(h,'installed-route-mass-adopted');

// A new cut-length estimate must also appear in an already-sized hardware object.
// This synthetic perturbation is a readout regression fixture, not route evidence.
const harness=g.harnesses.find(a=>a.parentWbs==='01.04');
const routeId=g.harnessMassRecords.find(row=>row.harnessId===harness.id).routeIds[0];
const before=h.serviceArchitecture.fabric.massKg,extraLengthM=2;
const records=h.input.installedHarnessTakeoff.records.map(row=>({...row,lengthM:row.lengthM+(row.id===routeId?extraLengthM:0)}));
reconcileInstalledElectricalRouting(g,records,{source:{kind:'regression-only-fabric-cut-perturbation'}});
near(h.serviceArchitecture.fabric.massKg,before+extraLengthM*(connectorSelections[harness.connectorTypeId].cableMassKgPerM??.020),'New physical data-cable length');
checkReadouts(h,'installed-route-mass-adopted');

const variant=sizeDesign({...h.input,solarM2:h.input.solarM2+1});
assert.equal(variant.installedHarnessAccounting.status,'model-estimate-adopted');
checkReadouts(variant,'model-estimate-adopted');
const legacy=sizeDesign(defaults),legacySvg=renderComputeFabric(legacy);
assert(legacySvg.includes('6 m endpoint cable allocation'),'Other concepts retain their existing preliminary allowance');
const fallback={...legacy};delete fallback.serviceArchitecture;
assert.equal(renderComputeFabric(fallback),legacySvg,'Partially supplied hardware retains the fresh-derivation fallback');
console.log('PASS Redwire fabric readouts: adopted current mass in diagram/PDR report, refinement reflected, model/installed basis stated, reach predicate preserved, and other-concept fallback unchanged.');
