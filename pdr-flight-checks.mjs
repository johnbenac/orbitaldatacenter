import assert from 'node:assert/strict';
import {defaults,sizeDesign,sizingEnvelope,applyPreset,G0} from './dist/design.js';
import {disposalRequirement} from './dist/trajectory.js';
import {assessFlightDomains} from './dist/pdr-flight.js';

const near=(a,b,relative=1e-10)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=relative*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const ids=['orbit','prop','attitude','launch','launcher'];
const get=(reports,domain,id)=>{const c=reports[domain].checks.find(c=>c.id===id);assert.ok(c,id);return c;};
const designValue=(reports,domain,label)=>reports[domain].design.find(r=>r.label===label)?.value;
const noSimulation={at(){throw Error('PDR assessment must not advance the simulation');},disposal(){throw Error('PDR assessment must not calculate a terminal replay');},mission(){throw Error('PDR assessment must not run a mission');}};
const assess=(h,extra={})=>assessFlightDomains({h,sim:noSimulation,...extra});
const statuses=new Set(['meets','shortfall','unassessed','not_applicable']);
function contract(reports){
 assert.deepEqual(Object.keys(reports),ids);
 for(const id of ids){
  const r=reports[id];assert.equal(r.id,id);assert.ok(r.title&&r.designSummary);
  for(const key of ['design','checks','interfaces','pdrNow','later','limitations'])assert.ok(Array.isArray(r[key]),`${id}.${key}`);
  assert.ok(r.checks.length>0);assert.equal(new Set(r.checks.map(c=>c.id)).size,r.checks.length);
  for(const c of r.checks){
   assert.ok(statuses.has(c.status),`${id}.${c.id}: ${c.status}`);
   for(const key of ['actual','required'])assert.ok(c[key]===null||Number.isFinite(c[key]),`${id}.${c.id}.${key}`);
   assert.ok(c.basis&&c.evidence);assert.ok(Array.isArray(c.ruleIds));
  }
  assert.match(r.graphic,/<svg[^>]+viewBox=/);assert.ok(r.graphic.includes(`data-pdr-flight-graphic="${id}"`));
  assert.match(r.graphic,/<title>/);assert.match(r.graphic,/<desc>/);
  assert.doesNotMatch(r.graphic,/NaN|Infinity|undefined/);
 }
}

const inputs={...defaults,missionYears:.003,yearsSupply:.003};
const h=sizeDesign(inputs),before=JSON.stringify(h),envelope=sizingEnvelope(h),base=assess(h,{envelope});
contract(base);assert.equal(JSON.stringify(h),before,'Assessing a design must not alter installed hardware or inputs');
assert.equal(base.orbit.title,'Flight Dynamics');
assert.equal(get(base,'orbit','orbit-drag-domain').status,'meets');
assert.ok(base.orbit.graphic.includes('>900 km</text>'));
assert.ok(!base.orbit.graphic.includes('>1,000 km</text>'),'Adjacent axis labels must not overlap');

// Independent inventory calculation: loaded-mass rocket equation and a separate
// annual impulse-derived maintenance mass. No percentage is substituted for 3σ.
const d=h.input,ve=G0*d.isp;
const trim=h.wetKg*(1-Math.exp(-d.trimDv/ve));
const other=(h.wetKg-trim)*(1-Math.exp(-(d.maneuverDv+Math.max(d.disposalDv,disposalRequirement(d)))/ve));
const consumption=trim+other+envelope.propAnnual*d.missionYears;
near(get(base,'prop','prop-mission-stock').actual,h.propellantKg*(1-d.reserveFraction-d.residualFraction));
near(get(base,'prop','prop-mission-stock').required,consumption);
near(designValue(base,'prop','Nominal required load'),consumption/(1-d.reserveFraction-d.residualFraction));
assert.equal(get(base,'prop','prop-three-sigma').status,'unassessed');

// Mission edits change demand while retaining the installed architecture.
const longH=sizeDesign({...inputs,missionYears:20}),long=assess(longH);
const highH=sizeDesign({...inputs,altitudeKm:850}),high=assess(highH);
for(const otherH of [longH,highH]){
 for(const key of ['dryKg','wetKg','launchKg','propellantKg','solarM2','radiatorM2','bodyLengthM','bodyWidthM','bodyHeightM'])near(otherH[key],h[key]);
 assert.deepEqual(otherH.propulsion.tanks,h.propulsion.tanks);assert.deepEqual(otherH.propulsion.engines,h.propulsion.engines);assert.deepEqual(otherH.cmg,h.cmg);
}
assert.ok(get(long,'prop','prop-mission-stock').required>get(base,'prop','prop-mission-stock').required);
assert.equal(get(long,'prop','prop-mission-stock').status,'shortfall');
assert.equal(get(long,'orbit','orbit-maintenance-allocation').status,'shortfall');
assert.ok(designValue(high,'prop','Requested-duration maintenance')<designValue(base,'prop','Requested-duration maintenance'));
near(designValue(high,'prop','Usable equivalent Δv'),designValue(base,'prop','Usable equivalent Δv'));
assert.notEqual(long.prop.graphic,base.prop.graphic);assert.notEqual(high.orbit.graphic,base.orbit.graphic);

// An extrapolated atmosphere or eccentric averaging is not a passing budget.
for(const patch of [{altitudeKm:1500},{ecc:.02}]){
 const r=assess(sizeDesign({...inputs,...patch}));contract(r);
 assert.equal(get(r,'orbit','orbit-drag-domain').status,'unassessed');
 assert.equal(designValue(r,'prop','Requested-duration maintenance'),null);
 assert.notEqual(get(r,'prop','prop-mission-stock').status,'meets');
}
const intersects=assess(sizeDesign({...inputs,altitudeKm:180,ecc:.25}));
contract(intersects);assert.equal(get(intersects,'orbit','orbit-perigee').status,'shortfall');

const empty=assess(sizeDesign({...inputs,propellantKg:1}));contract(empty);
assert.equal(get(empty,'prop','prop-mission-stock').status,'shortfall');
assert.equal(get(empty,'prop','prop-three-sigma').status,'unassessed');

// Missing demand is unknown; a good sampled interval cannot close stability.
assert.equal(get(base,'attitude','attitude-torque').status,'unassessed');
assert.equal(get(base,'attitude','attitude-momentum').status,'unassessed');
const smallDemand={attitudeDynamics:{requestedTorqueNm:[.1,0,0],cmgMomentumBodyNms:[10,0,0]},momentumNms:10};
const good=assess(h,{s:smallDemand});
assert.equal(get(good,'attitude','attitude-torque').status,'meets');
assert.equal(get(good,'attitude','attitude-momentum').status,'meets');
const demand=assess(h,{s:{attitudeDynamics:{requestedTorqueNm:[100,0,0],cmgMomentumBodyNms:[1000,0,0]},momentumNms:1000}});
assert.equal(get(demand,'attitude','attitude-torque').status,'shortfall');
assert.equal(get(demand,'attitude','attitude-momentum').status,'shortfall');
for(const r of [good,demand])for(const id of ['attitude-gain','attitude-phase','attitude-flexible','attitude-knowledge'])assert.equal(get(r,'attitude',id).status,'unassessed');
const unknownTorque=assess({...h,input:{...h.input,cmgTorqueNm:NaN}},{s:smallDemand});
assert.equal(get(unknownTorque,'attitude','attitude-torque').status,'unassessed');
assert.equal(get(unknownTorque,'attitude','attitude-torque').actual,null);
assert.equal(get(good,'attitude','attitude-gain').required,6);
assert.equal(get(good,'attitude','attitude-phase').required,30);
assert.equal(get(good,'attitude','attitude-flexible').required,-12);

// A declared allocation and a geometric fit never certify a launch service.
const under=sizeDesign({...inputs,launchAllowanceKg:100}),underReport=assess(under);
assert.equal(get(underReport,'launcher','launcher-allocation').status,'shortfall');
const accommodated=assess(sizeDesign(applyPreset(inputs,'launcher','glenn')));
assert.equal(get(accommodated,'launcher','launcher-radial').status,'meets');
assert.equal(get(accommodated,'launcher','launcher-performance').status,'unassessed');
assert.equal(get(accommodated,'launch','launch-loads').status,'unassessed');
assert.equal(get(accommodated,'launch','launch-injection').status,'unassessed');
assert.equal(get(accommodated,'launcher','launcher-cargo').status,'not_applicable');

// Reject absent/nonfinite inputs without silently printing zero or granting closure.
contract(assessFlightDomains());
for(const inputPatch of [{altitudeKm:NaN},{ecc:NaN},{isp:0},{reserveFraction:.8,residualFraction:.3}]){
 const invalid={...h,input:{...h.input,...inputPatch}},r=assess(invalid);contract(r);
 assert.equal(get(r,'prop','prop-three-sigma').status,'unassessed');
 assert.notEqual(get(r,'prop','prop-mission-stock').status,'meets');
}
console.log('PDR flight checks passed: five report contracts and SVGs; independent nominal propellant ledger; fixed hardware under duration/orbit edits; low fuel and allocation shortfalls; unsupported orbit cases; actuator demand and open stability; launch evidence boundaries; invalid inputs; no mission replay.');
