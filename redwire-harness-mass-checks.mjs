import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {sizeDesign,defaults,sizingEnvelope} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {buildElectricalArchitecture,reconcileInstalledElectricalRouting,connectorSelections} from './dist/electrical-architecture.js';
import {componentMassProperties,componentCentroid} from './dist/component-stations.js';
import {componentInertia} from './dist/attitude-inertia.js';
import {attitudeLimits} from './dist/attitude-guidance.js';
import {propulsionReview} from './dist/spacecraft-architecture.js';
import {createSimulation} from './dist/model.js';
import {launchStructure} from './dist/launch-structure.js';
import {launcherFits} from './dist/launch-fleet-ui.js';
import {buildElectricalProgram} from './dist/electrical-program.js';
import {domainReadout} from './dist/domain-analysis.js';
import {encodeScenario,decodeScenario} from './dist/exports.js';
import {installedHarnessRoutingRevision} from './dist/installed-harness-mass.js';
import {sha256} from './dist/sha256.js';

const near=(actual,expected,label,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${label}: ${actual} vs ${expected}`);
const total=rows=>rows.reduce((n,x)=>n+x,0);
const h=sizeDesign(buildReferenceDesign('redwire-8kw')),g=buildElectricalArchitecture(h);
for(const value of ['', 'abc', 'Orbital ☀️ Δ radius', 'a'.repeat(56), JSON.stringify({input:h.input,boxes:g.boxes,ports:g.ports,hardware:g.installationHardware})])assert.equal(sha256(value),createHash('sha256').update(value).digest('hex'),'Portable SHA-256 matches the native hash for UTF-8 and full-layout-size input');
assert.equal(h.installedHarnessAccounting.status,'installed-route-mass-adopted');
assert.equal(g.harnessMassRecords.length,54);
const cuts=g.harnessMassRecords.flatMap(r=>r.routeCuts);
assert.equal(cuts.length,62);assert.equal(new Set(cuts.map(r=>r.id)).size,62);
near(g.massAccounting['07.05'].allocatedKg,105.77345353183198,'Native reference harness mass');
near(g.massAccounting['01.04'].allocatedKg,1.1696033538958064,'Native reference fabric cable mass');
near(g.totalCableLengthM,219.853292276276,'All individual physical cuts');

// Independent material sum: every positive/return single-pole route carries
// one copper conductor; a paired power cable carries two. Every assembly has
// its own two endpoint mating sets, never one set per duplicate register view.
let copperAndJacketKg=0,otherCableKg=0,terminationsKg=0;
for(const a of g.harnesses){
 const singlePole=a.connectorTypeId.startsWith('hv-single');
 const length=total(a.installedRoutes.map(r=>r.lengthM+a.terminationAllowanceM));
 if(a.kind==='power')copperAndJacketKg+=length*(singlePole?1:2)*a.wire.areaMM2*1e-6*8960*1.4;
 else otherCableKg+=length*(a.kind==='data'?(connectorSelections[a.connectorTypeId].cableMassKgPerM??.020):{control:.045,rf:.0491}[a.kind]);
 terminationsKg+=a.quantity*a.totalMatedInterfacesPerAssembly*connectorSelections[a.connectorTypeId].estimatedPairKg;
}
near(total(g.harnessMassRecords.map(r=>r.cableMassKg)),copperAndJacketKg+otherCableKg,'Cable material takeoff');
near(total(g.harnessMassRecords.map(r=>r.connectorMassKg)),terminationsKg,'Terminations counted once');
near(total(g.connectorDetails.map(r=>r.allocatedMassKg)),terminationsKg,'Connector sibling breakdown');
for(const [parent,m] of Object.entries(g.massAccounting)){
 const ids=new Set(g.harnesses.filter(a=>a.parentWbs===parent).map(a=>a.id));
 near(total(g.harnessMassRecords.filter(r=>ids.has(r.harnessId)).map(r=>r.totalMassKg)),m.allocatedKg,'Parent '+parent);
 near(m.estimatedRequiredKg,m.allocatedKg,'Unscaled parent '+parent);
}
const basic=total(h.massLedger.filter(r=>r.group==='Hardware').map(r=>r.kg));
near(h.dryKg,basic*(1+h.input.structureMargin),'Dry growth on updated hardware');
near(h.wetKg,h.dryKg+h.propellantKg+h.pressurantKg,'Wet mass');
near(h.launchKg,total(h.massLedger.map(r=>r.kg)),'Whole ledger without duplicate children');
near(componentMassProperties(h).massKg,h.wetKg,'Physical mass model matches ledger');
near(h.massMarginKg,h.input.launchAllowanceKg-h.launchKg,'Launch allowance margin');
near(h.launchReferenceMarginKg,h.input.referenceKg-h.launchKg,'Launcher reference margin');

// A real change in an individual solar polarity cut must alter material mass
// even when another route remains the maximum cut in that harness group.
const solar=g.harnesses.find(a=>a.id==='P-SA-1'),shortest=solar.installedRoutes.slice().sort((a,b)=>a.lengthM-b.lengthM)[0];
const difference=.01,expectedCableIncrease=difference*solar.wire.areaMM2*1e-6*8960*1.4;
assert.ok(shortest.lengthM+difference<Math.max(...solar.installedRoutes.map(r=>r.lengthM)));
const trimReadout=()=>domainReadout('prop','C',{hardware:h,state:{}}).rows.find(r=>r.key==='trimBudget').value;
const before={dry:h.dryKg,wet:h.wetKg,launch:h.launchKg,revision:h.electricalMassRevision,mass:componentMassProperties(h),cm:componentCentroid(h,h.propellantKg),inertia:componentInertia(h),limits:attitudeLimits(h),propulsion:propulsionReview(h),structure:launchStructure(h),fleet:launcherFits(h),program:buildElectricalProgram(h),trimBudget:trimReadout()};
const originalSimulation=createSimulation(h);
const originalInputSimulation=createSimulation(h.input);
assert.equal(createSimulation(h),originalSimulation,'Unchanged hardware reuses its simulation');
const changed=h.input.installedHarnessTakeoff.records.map(r=>({...r,lengthM:r.lengthM+(r.id===shortest.id?difference:0)}));
reconcileInstalledElectricalRouting(g,changed,{source:{kind:'regression-only-single-polarity-perturbation'}});
near(h.dryKg-before.dry,expectedCableIncrease*(1+h.input.structureMargin),'One shorter polarity changes carried dry mass');
near(h.wetKg-before.wet,h.dryKg-before.dry,'Wet delta');near(h.launchKg-before.launch,h.dryKg-before.dry,'Launch delta');
assert.ok(h.electricalMassRevision>before.revision);
near(componentMassProperties(h).massKg,h.wetKg,'Mass cache refreshed');
assert.notDeepEqual(componentCentroid(h,h.propellantKg),before.cm,'Centroid cache refreshed');
assert.notDeepEqual(componentInertia(h).tensorKgM2,before.inertia.tensorKgM2,'Inertia cache refreshed');
assert.notEqual(attitudeLimits(h),before.limits,'Attitude limits refreshed');
assert.notDeepEqual(propulsionReview(h).cm,before.propulsion.cm,'Propulsion uses updated shared centroid');
const structure=launchStructure(h),fleet=launcherFits(h),program=buildElectricalProgram(h);
near(structure.stowedScMassKg,h.wetKg,'Launch loads use the adopted wet mass');
near(structure.interfaceForceN[0],-h.wetKg*structure.accelerationG[0]*structure.gravityMS2,'Launch interface force follows mass');
assert.notEqual(structure,before.structure,'Launch structure cache refreshed');
assert.equal(launchStructure(h),structure,'Unchanged launch structure remains cached');
near(fleet.find(r=>r.selected).screenMarginKg,h.launchScreenMarginKg,'Launcher headroom follows adopted launch mass');
assert.notEqual(fleet,before.fleet,'Launcher fleet cache refreshed');
assert.equal(launcherFits(h),fleet,'Unchanged fleet screen remains cached');
const parentMassCheck=p=>p.checks.find(r=>r.id==='mass:07.05').actual;
near(parentMassCheck(program),g.massAccounting['07.05'].estimatedRequiredKg,'Electrical program checks use the new material sum');
assert.ok(parentMassCheck(program)>parentMassCheck(before.program),'Electrical check snapshot changed with the takeoff');
assert.equal(buildElectricalProgram(h),program,'Unchanged electrical program remains cached');
near(trimReadout(),sizingEnvelope(h).trimKg,'Domain readout uses the current mass-dependent sizing envelope');
assert.ok(trimReadout()>before.trimBudget,'Domain trim requirement changes with carried mass');
const updatedSimulation=createSimulation(h);
assert.notEqual(updatedSimulation,originalSimulation,'Changed harness mass replaces cached simulation and its captured mass-dependent parameters');
assert.equal(updatedSimulation.electricalMassRevision,h.electricalMassRevision);
assert.equal(createSimulation(h),updatedSimulation,'Refreshed simulation is stable');
const updatedInputSimulation=createSimulation(h.input);
assert.notEqual(updatedInputSimulation,originalInputSimulation,'Replaced embedded takeoff refreshes simulations constructed from the same input object');
near(updatedInputSimulation.hardware.launchKg,h.launchKg,'Input-based simulation retains the new mass');
const revision=h.electricalMassRevision;
reconcileInstalledElectricalRouting(g,changed,{source:{kind:'regression-only-single-polarity-perturbation'}});
assert.equal(h.electricalMassRevision,revision,'Identical takeoff does not trigger refresh loops');
near(h.launchKg-before.launch,expectedCableIncrease*(1+h.input.structureMargin),'Idempotent adoption');

// Worker/export round trips retain actual cuts; changed designs reject them
// and carry a fresh unscaled model estimate until new routes are constructed.
const roundtrip=sizeDesign(JSON.parse(JSON.stringify(h.input)));
near(roundtrip.launchKg,h.launchKg,'Serialized design retains installed mass');
assert.equal(roundtrip.installedHarnessAccounting.status,'installed-route-mass-adopted');
const share=encodeScenario({design:h.input}),shared=sizeDesign(decodeScenario(share).design);
assert.ok(share.length<=200000,'Exact route takeoff remains within the existing scenario size limit');
near(shared.launchKg,h.launchKg,'Share encoder/decoder retains current installed mass');
assert.equal(shared.installedHarnessAccounting.status,'installed-route-mass-adopted');
assert.equal(shared.input.installedHarnessTakeoff.routingRevision,installedHarnessRoutingRevision);
const variant=sizeDesign({...h.input,solarM2:h.input.solarM2+1}),vg=buildElectricalArchitecture(variant);
assert.equal(variant.installedHarnessAccounting.status,'model-estimate-adopted');
assert.equal(variant.input.installedHarnessTakeoff,undefined,'Stale input takeoff invalidated');
near(vg.massAccounting['07.05'].allocatedKg,vg.massAccounting['07.05'].estimatedRequiredKg,'Variant is never scaled to old allowance');
assert.ok(vg.massAccounting['07.05'].allocatedKg>vg.massAccounting['07.05'].originalAllocatedKg);
const legacy=sizeDesign(defaults);assert.equal(legacy.installedHarnessAccounting,undefined,'Other concepts unchanged');
console.log('Redwire harness mass: exact 62-cut / 54-assembly material sum, parent/vehicle/growth closure, changed-cut propagation, mass/centroid/inertia/attitude/simulation/launch/fleet/electrical/domain cache refresh, idempotence and serialized takeoff all passed. Share scenario: '+share.length+' / 200000 characters.');
