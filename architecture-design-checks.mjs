import assert from 'node:assert/strict';
import {defaults,sizeDesign,sizingEnvelope,G0} from './dist/design.js';
import {disposalRequirement} from './dist/trajectory.js';
import {assessFlightDomains} from './dist/pdr-flight.js';
import {architectureReference,architectureApplicability,deriveArchitectureTrade,mechanicalAllocation,structuralBounds,navigationAllocation,radiationAndLife,propulsionUncertaintyBound,architectureTradeGraphic,structuralBoundsGraphic,propulsionUncertaintyGraphic,renderArchitectureTrade} from './dist/architecture-trades.js';

const near=(a,b,tolerance=1e-10)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const h=sizeDesign(defaults),before=JSON.stringify(h),trade=deriveArchitectureTrade(h),bounds=structuralBounds(h),rad=radiationAndLife(h),life=navigationAllocation(h);
assert.equal(architectureReference.architecture,'ODC-01 Rev I');
assert.equal(trade.available,true);assert.equal(trade.selected,'central-core');assert.equal(trade.alternatives.length,3);
const [selected,compact,local]=trade.alternatives;

// The selected trade is the installed ledger, including growth and consumables.
// Alternatives preserve useful load and emitting area; only declared hardware
// deltas enter the projected mass. No lower mass is automatically a flight design.
near(selected.launchKg,h.launchKg);near(selected.predictedDryKg,h.dryKg);
near(selected.packageHeightM,h.stowedLengthM);near(selected.packageDiameterM,h.stowedDiameterM);
const commonFixed=h.launchKg-h.dryKg;
for(const candidate of trade.alternatives){
  near(candidate.nominalEmittingFaceM2,2*h.radiatorM2);
  near(candidate.launchKg-candidate.predictedDryKg,commonFixed);
  near(candidate.basicDryKg-selected.basicDryKg,candidate.massDeltaKg);
  near(candidate.predictedDryKg,candidate.basicDryKg*(1+trade.commonBasis.appliedGrowthFraction));
  assert.ok(candidate.packageHeightM>0&&candidate.packageDiameterM>0&&candidate.launchKg>0);
}
assert.ok(compact.bodyLengthM<=selected.bodyLengthM);
assert.ok(compact.backboneLengthM>=compact.bodyLengthM);
assert.ok(local.radiatorPlanformM2>selected.radiatorPlanformM2,'Compute masking must carry additional radiator area');
assert.ok(local.tileCount*4>=h.trays);assert.ok(local.tileSideM<=3.25);
assert.match(local.evidence,/not its point design/);assert.match(compact.evidence,/no change to the active 3D/);

// Mission-only changes evaluate the same installed vehicle and trade candidates.
for(const patch of [{altitudeKm:850},{missionYears:20}]){
  const edited=sizeDesign({...defaults,...patch}),changed=deriveArchitectureTrade(edited);
  for(const key of ['bodyLengthM','bodyWidthM','bodyHeightM','wetKg','launchKg','solarM2','radiatorM2','batteryKWh'])near(edited[key],h[key]);
  for(let i=0;i<trade.alternatives.length;i++)for(const key of ['bodyLengthM','packageHeightM','packageDiameterM','launchKg'])near(changed.alternatives[i][key],trade.alternatives[i][key]);
}
assert.ok(architectureApplicability(sizeDesign({...defaults,missionYears:20})).exceeded.includes('mission-life'));
assert.ok(architectureApplicability(sizeDesign({...defaults,altitudeKm:1500})).exceeded.includes('drag-apogee'));
assert.ok(architectureApplicability(sizeDesign({...defaults,ecc:.02})).exceeded.includes('drag-eccentricity'));
const outside=architectureApplicability({...h,wingLengthM:19,trays:17});
assert.ok(outside.exceeded.includes('wing-span')&&outside.exceeded.includes('trays'));
assert.equal(architectureApplicability({}).status,'unassessed');
assert.equal(deriveArchitectureTrade({...h,input:{...h.input,skinKgM2:NaN}}).available,false);
assert.equal(structuralBounds({...h,massLedger:[]}).available,false);

// Independent dynamic relations: the uniform-beam frequency scales as L^-3/2
// at fixed total mass; the root drive accelerates a full bank about one end.
assert.equal(bounds.available,true);
const longerWing=structuralBounds({...h,wingLengthM:2*h.wingLengthM});
near(longerWing.modeBounds[0].nominalHz,bounds.modeBounds[0].nominalHz/(2**1.5));
const bankKg=h.massLedger.find(r=>r.id==='radiator').kg/2,root=bounds.mechanisms.find(m=>m.id==='radiatorCant');
const rootInertia=bankKg*h.radiatorLengthM**2/3;
near(root.inertiaKgM2,rootInertia);
near(root.factoredNm,3*6+1.5*2+1.25*rootInertia*(.4*Math.PI/180)/5);
near(root.margin,50/root.factoredNm-1);
near(bounds.bodyBandwidthHz,.06/(2*Math.PI));
near(bounds.pointing.allocatedBody3SigmaArcsec,Math.hypot(15,20,60,30));
near(bounds.longerons.areaM2,1.8/2700);
near(bounds.longerons.requiredYieldPa,1.25*bounds.longerons.maxCompressionN/bounds.longerons.areaM2);
near(bounds.longerons.requiredUltimatePa,1.4*bounds.longerons.maxCompressionN/bounds.longerons.areaM2);
near(bounds.longerons.eulerN,Math.PI**2*69e9*bounds.longerons.secondMomentM4/bounds.longerons.unsupportedSpanM**2);
near(bounds.longerons.stabilityMargin,bounds.longerons.eulerN/(1.4*bounds.longerons.maxCompressionN)-1);
assert.equal(mechanicalAllocation.factors.variable,3);assert.equal(mechanicalAllocation.factors.fixed,1.5);assert.equal(mechanicalAllocation.factors.acceleration,1.25);

// Mass shielding is reported as a material path allocation, never as a dose or
// SEE probability. Life-test criticality and ground cycling remain explicit.
near(rad.shieldArealGCm2,h.input.shieldKgM2*.1);near(rad.aluminiumEquivalentMm,h.input.shieldKgM2/2.7);
assert.equal(rad.doseKradsSi,null);assert.equal(rad.seeRatePerYear,null);assert.equal(rad.evidenceStatus,'unassessed');
near(life.plannedTwoLifeCycles,2*(life.trackingEquivalentCycles+life.groundTrackingCycles));
near(life.safetyCriticalTestCycles,4*(life.trackingEquivalentCycles+life.groundTrackingCycles));
assert.match(life.cycleBasis,/hazard classification/);assert.match(life.equipmentBoundary,/existing 12 kg/);

// Compute the deterministic sensitivity independently from the nominal ledger.
// Insertion and disposal are each allocated once. The operational reserve is
// available to this bound and is not multiplied a second time.
const d=h.input,env=sizingEnvelope(h),ve=G0*d.isp;
const protectedDv=Math.max(d.disposalDv,disposalRequirement(d));
const trim=h.wetKg*(-Math.expm1(-d.trimDv/ve));
const maneuver=(h.wetKg-trim)*(-Math.expm1(-d.maneuverDv/ve));
const disposal=(h.wetKg-trim-maneuver)*(-Math.expm1(-protectedDv/ve));
const drag=env.propAnnual*d.missionYears,nominal=trim+maneuver+disposal+drag;
const inputs={trim,maneuver,protectedDv,drag,nominal},uncertainty=propulsionUncertaintyBound(h,inputs);
const totalNominalDv=ve*Math.log(h.wetKg/(h.wetKg-nominal));
const dragDv=Math.max(0,totalNominalDv-d.trimDv-d.maneuverDv-protectedDv);
const allocatedDv=(Math.max(d.trimDv,5)+d.maneuverDv+protectedDv)*1.02+2*dragDv+.1;
const boundedUse=h.wetKg*(-Math.expm1(-allocatedDv/(G0*d.isp*.98)));
near(uncertainty.highDv,allocatedDv);near(uncertainty.consumedHighKg,boundedUse);
near(uncertainty.requiredLoadedKg,boundedUse+h.propellantKg*(d.residualFraction+.01));
near(uncertainty.headroomKg,h.propellantKg-uncertainty.requiredLoadedKg);
assert.equal(propulsionUncertaintyBound(h,{...inputs,drag:null}).status,'unassessed');
const reports=assessFlightDomains({h});
assert.equal(reports.prop.checks.find(c=>c.id==='prop-three-sigma').status,'unassessed');
for(const id of ['attitude-gain','attitude-phase','attitude-flexible','attitude-knowledge'])assert.equal(reports.attitude.checks.find(c=>c.id===id).status,'unassessed');
assert.equal(reports.launch.checks.find(c=>c.id==='launch-loads').status,'unassessed');
assert.equal(reports.launcher.checks.find(c=>c.id==='launcher-performance').status,'unassessed');
const unsupported=assessFlightDomains({h:sizeDesign({...defaults,altitudeKm:1500}),domainIds:['prop']});
assert.equal(unsupported.prop.propulsionUncertainty.available,false);

for(const graphic of [architectureTradeGraphic(h),architectureTradeGraphic(trade),structuralBoundsGraphic(h),structuralBoundsGraphic(bounds),propulsionUncertaintyGraphic(uncertainty),architectureTradeGraphic({}),structuralBoundsGraphic({})]){
 assert.match(graphic,/<svg[^>]+viewBox=/);assert.match(graphic,/<title>/);assert.match(graphic,/<desc>/);assert.doesNotMatch(graphic,/NaN|Infinity|undefined/);
}
for(const id of ['prop','attitude'])assert.ok(reports[id].supplementalGraphics.length>0);
const html=renderArchitectureTrade(h);assert.match(html,/AD-01/);assert.match(html,/Hardware and model applicability/);assert.doesNotMatch(html,/NaN|Infinity|undefined/);
assert.equal(JSON.stringify(h),before,'Review functions must not resize or mutate installed hardware');
console.log('Architecture design checks passed: matched mass and area boundary; fixed hardware under mission changes; unsupported-case status; beam and mechanism relations; static load-path factors; no invented dose/SEE; criticality-aware life counts; independent uncertainty inventory; preserved evidence gates; SVG contracts; no mutation.');
