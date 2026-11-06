import assert from 'node:assert/strict';
import {defaults,sizeDesign,sizingEnvelope} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {thermalNodes,newThermalSummary,qualifyNow} from './dist/thermal-limits.js';
import {assessResourceDomains} from './dist/pdr-resources.js';

// Bounded PDR checks: mathematical resource boundaries, missing-evidence
// behavior, both thermal extremes, geometry, and one short mission model.
const checks=[];
const pass=(name,fn)=>{fn();checks.push(name);};
const near=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`);
const item=(reports,id)=>Object.values(reports).flatMap(report=>report.checks).find(row=>row.id===id);
const states=new Set(['meets','shortfall','unassessed','not_applicable']);
const h=sizeDesign(defaults),envelope=sizingEnvelope(h);
const assess=(hardware=h,extra={})=>assessResourceDomains({h:hardware,envelope:sizingEnvelope(hardware),...extra});
const baseline=assess(h);
const generousH=sizeDesign({...defaults,solarM2:600,batteryKWh:120,launchAllowanceKg:100000,fairingM:12,fairingLengthM:40});
const stressedH=sizeDesign({...defaults,solarM2:5,batteryKWh:1,launchAllowanceKg:100,fairingM:1,fairingLengthM:1});
const generous=assess(generousH),stressed=assess(stressedH);

pass('All five reports provide complete schema, finite comparisons and accessible dynamic SVGs',()=>{
  for(const reports of [baseline,generous,stressed]){
    assert.deepEqual(Object.keys(reports),['environment','power','thermal','mass','mechanical']);
    for(const [id,report] of Object.entries(reports)){
      assert.equal(report.id,id);
      for(const field of ['title','designSummary','graphic'])assert.equal(typeof report[field],'string');
      for(const field of ['design','checks','interfaces','pdrNow','later','limitations'])assert.ok(Array.isArray(report[field]));
      assert.match(report.graphic,/<svg[^>]+role="img"/);
      assert.match(report.graphic,/<title /);
      assert.match(report.graphic,/<desc /);
      assert.doesNotMatch(report.graphic,/NaN|Infinity|undefined/);
      const seen=new Set();
      for(const row of report.checks){
        assert.ok(!seen.has(row.id));seen.add(row.id);
        assert.ok(states.has(row.status));
        for(const key of ['actual','required'])assert.ok(row[key]===null||Number.isFinite(row[key]));
        for(const key of ['label','unit','operator','basis','evidence'])assert.equal(typeof row[key],'string');
        assert.ok(Array.isArray(row.ruleIds));
      }
    }
  }
  for(const id of ['mass','power','mechanical','environment'])assert.notEqual(generous[id].graphic,stressed[id].graphic);
});

pass('Dry mass uses basic hardware denominator and keeps item MGA evidence open',()=>{
  const basic=h.massLedger.filter(row=>row.group==='Hardware').reduce((total,row)=>total+row.kg,0);
  const allowable=h.input.launchAllowanceKg-h.propellantKg-h.pressurantKg-h.input.adapterKg;
  near(item(baseline,'mass-pdr-screen').actual,100*(allowable-h.dryKg)/basic);
  assert.equal(item(baseline,'mass-mga-coverage').status,'unassessed');
  assert.equal(item(baseline,'mass-pdr-evidence').status,'unassessed');
  assert.equal(baseline.mass.design.find(row=>row.label==='Approved item MGA').value,null);
  assert.equal(item(stressed,'mass-pdr-screen').status,'shortfall');
  assert.equal(item(generous,'mass-pdr-screen').status,'meets');
  assert.equal(item(generous,'mass-pdr-evidence').status,'unassessed');
  for(const fraction of [.10-1e-8,.10+1e-8]){
    const e={...envelope,pdr:{...envelope.pdr,mass:{...envelope.pdr.mass,allowableDryKg:h.dryKg+basic*fraction}}};
    assert.equal(item(assess(h,{envelope:e}),'mass-pdr-screen').status,fraction>.10?'meets':'shortfall');
  }
});

pass('Power uses capacity denominator, strict >15%, and separate energy and recharge bounds',()=>{
  const source=envelope.pdr.power;
  near(item(baseline,'power-eol-margin').actual,100*(source.eolPowerAvailableKW-source.eolPowerBudgetKW)/source.eolPowerAvailableKW);
  for(const budget of [85,84.999]){
    const e={...envelope,pdr:{...envelope.pdr,power:{...source,eolPowerAvailableKW:100,eolPowerBudgetKW:budget}}};
    assert.equal(item(assess(h,{envelope:e}),'power-eol-margin').status,budget===85?'shortfall':'meets');
  }
  for(const id of ['power-eol-margin','power-eclipse-energy','power-peak-delivery','power-recharge']){
    assert.equal(item(stressed,id).status,'shortfall');
    assert.equal(item(generous,id).status,'meets');
  }
  const usable=h.batteryKWh*defaults.batteryRetention**defaults.missionYears*(defaults.socMax-Math.max(defaults.socMin,defaults.targetSOC))*defaults.dischargeEff;
  near(item(baseline,'power-eclipse-energy').actual,usable);
  near(item(baseline,'power-eclipse-energy').required,envelope.peakBus*envelope.shadowHours);
  near(item(baseline,'power-recharge').required,envelope.peakBus*envelope.shadowHours/(defaults.dischargeEff*defaults.chargeEff*envelope.period*envelope.sunFraction/3600));
  assert.equal(item(baseline,'power-mode-evidence').status,'unassessed');
  assert.equal(item(baseline,'power-day-unserved').status,'unassessed');
  const poorDay=assess(h,{day:{energyKWh:{unserved:.001},minSocPct:defaults.targetSOC*100-.1}});
  assert.equal(item(poorDay,'power-day-unserved').status,'shortfall');
  assert.equal(item(poorDay,'power-day-soc').status,'shortfall');
});

function thermalSnapshot(changes={}){
  const s={t:1800,carrierAttached:false,...Object.fromEntries(thermalNodes.map(node=>[node.tempKey,(h.input[node.keys.operating.min]+h.input[node.keys.operating.max])/2])),thermalActivityMask:63,...changes};
  s.thermalQualification=qualifyNow(s,h.input);return s;
}
const hotCold=thermalSnapshot({junctionK:defaults.junctionLimitK+2,batteryK:defaults.batteryOpMinK-3});
pass('Hot and cold thermal failures are independent and never qualify derived study limits',()=>{
  const good=assess(h,{s:thermalSnapshot()}),bad=assess(h,{s:hotCold,view:{thermalTargets:{junctionLimitK:'derive'},thermalPadding:7}});
  for(const node of thermalNodes)for(const side of ['cold','hot'])assert.equal(item(good,'thermal-'+node.id+'-'+side).status,'meets');
  near(item(bad,'thermal-junction-hot').actual,-2);
  near(item(bad,'thermal-battery-cold').actual,-3);
  assert.equal(item(bad,'thermal-junction-hot').status,'shortfall');
  assert.equal(item(bad,'thermal-battery-cold').status,'shortfall');
  assert.equal(item(bad,'thermal-junction-cold').status,'meets');
  assert.equal(item(bad,'thermal-battery-hot').status,'meets');
  assert.equal(item(bad,'thermal-limits-evidence').status,'unassessed');
  assert.match(item(bad,'thermal-junction-hot').evidence,/bound is selected for study derivation/);
  assert.notEqual(good.thermal.graphic,bad.thermal.graphic);
  for(const row of baseline.thermal.checks.filter(row=>/^thermal-.+-(hot|cold)$/.test(row.id)))assert.equal(row.status,'unassessed');
});

pass('Thermal extrema retain operating/survival boundaries and prefer chronological coverage',()=>{
  const summary=newThermalSummary(defaults,0,100,'Controlled test extrema');
  summary.rows.find(row=>row.id==='battery'&&row.state==='operating').durationS=50;
  Object.assign(summary.rows.find(row=>row.id==='battery'&&row.state==='operating'),{minK:280,maxK:320});
  Object.assign(summary.rows.find(row=>row.id==='battery'&&row.state==='survival'),{durationS:50,minK:241,maxK:300});
  const report=assess(h,{s:thermalSnapshot(),sim:{audit:{thermal:summary}}});
  near(item(report,'thermal-battery-cold').actual,-2);
  near(item(report,'thermal-battery-hot').actual,-2);
  assert.equal(item(report,'thermal-junction-hot').status,'unassessed');
});

pass('Environment distinguishes supported table coverage from unassessed extrapolation and RHA',()=>{
  assert.equal(item(baseline,'environment-density-coverage').status,'meets');
  const beyond=assess(sizeDesign({...defaults,altitudeKm:1000}));
  assert.equal(item(beyond,'environment-density-coverage').status,'unassessed');
  assert.ok(item(beyond,'environment-density-coverage').actual<0);
  assert.equal(item(baseline,'environment-radiation').status,'unassessed');
  assert.equal(item(baseline,'environment-envelope').status,'unassessed');
  const historical=assess(sizeDesign({...defaults,solarDriver:'observed'}));
  assert.equal(item(historical,'environment-driver-order').status,'not_applicable');
});

pass('Mechanical fit changes with geometry while structural and mechanism evidence remain open',()=>{
  for(const id of ['mechanical-radial','mechanical-axial']){
    assert.equal(item(generous,id).status,'meets');
    assert.equal(item(stressed,id).status,'shortfall');
  }
  for(const reports of [generous,stressed])for(const id of ['mechanical-strength','mechanical-torque','mechanical-modal'])assert.equal(item(reports,id).status,'unassessed');
});

pass('Ended spacecraft snapshots cannot report current electrical or external thermal accounting',()=>{
  const ended=assess(h,{s:{...hotCold,t:2000,spacecraftModelEndedAt:1800,solarKW:1,servedLoadKW:1,chargeKW:0,dischargeKW:0,curtailedKW:0}});
  assert.equal(item(ended,'power-bus-balance').status,'not_applicable');
  assert.equal(item(ended,'environment-flux-accounting').status,'not_applicable');
  assert.equal(item(ended,'thermal-junction-hot').status,'unassessed');
});

pass('Live first-day model closes electrical and radiator accounts without concealing cold limits',()=>{
  const hardware=sizeDesign({...defaults,missionYears:.003});
  const sim=createSimulation(hardware),s=sim.at(1800),day=sim.daySummary(0),thermalSummary=sim.thermalWindow(0,Math.min(86400,sim.duration));
  const reports=assess(hardware,{s,day,sim,thermalSummary,view:{start:0}});
  assert.equal(item(reports,'power-bus-balance').status,'meets');
  assert.equal(item(reports,'environment-flux-accounting').status,'meets');
  const batteryNode=thermalNodes.find(node=>node.id==='battery');
  const coldMargin=Math.min(...thermalSummary.rows.filter(row=>row.id==='battery'&&row.durationS>0).map(row=>row.minK-hardware.input[batteryNode.keys[row.state].min]));
  near(item(reports,'thermal-battery-cold').actual,coldMargin);
  assert.equal(item(reports,'thermal-battery-cold').status,coldMargin>=0?'meets':'shortfall');
  assert.equal(item(reports,'thermal-limits-evidence').status,'unassessed');
  assert.ok(Number.isFinite(item(reports,'power-day-unserved').actual));
  for(const report of Object.values(reports))assert.doesNotMatch(report.graphic,/NaN|Infinity|undefined/);
});

console.log(JSON.stringify({status:'passed',count:checks.length,fixtures:{baseline:'design.defaults (5-year analysis); not the launch-aligned mission starter',live:'design.defaults with missionYears = 0.003; first modeled day',generous:'defaults with 600 m² solar, 120 kWh battery, 100,000 kg allocation, 12 × 40 m fairing',stressed:'defaults with 5 m² solar, 1 kWh battery, 100 kg allocation, 1 × 1 m fairing'},findings:{defaultRadialClearanceMm:item(baseline,'mechanical-radial').actual,thermalColdCoverageFixture:'defaults with missionYears = 0.003; observed cold margin is checked against the actual component/state limits'},checks},null,2));
