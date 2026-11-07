import assert from 'node:assert/strict';
import {defaults,sizeDesign,sizingEnvelope} from './dist/design.js';
import {architectureFamily} from './dist/architecture-families.js';
import {deriveEnergySystem,energyRuntime,energyTemperatureLadder,thermalSizingPoint,renderEnergySingleLine,renderThermalPath} from './dist/energy-system.js';
import {heatPumpPerformance} from './dist/architecture-thermal.js';
import {dispatchEnergy} from './dist/energy-dispatch.js';
import {stepThermalNetwork} from './dist/thermal-network.js';
import {buildEquipmentList} from './dist/equipment-list.js';
import {assessResourceDomains} from './dist/pdr-resources.js';
import {createSimulation} from './dist/model.js';
import {commissioningClock} from './dist/commissioning-clock.js';
import {servedPowerLoads} from './dist/workspaces.js';

const near=(a,b,tolerance=1e-7)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance,`${a} != ${b}`);
const passed=[];
const test=(name,fn)=>{fn();passed.push(name);console.log('PASS '+name);};
const base={...defaults,missionYears:.003};
const red=sizeDesign({...base,architectureFamily:'redwire-platform',trayCount:4,solarM2:80,radiatorM2:10.5625,radiatorPanelsPerBank:1});
const ai1=sizeDesign({...base,architectureFamily:'starmind-cross',powerArchitecture:'highPower400',solarM2:840,radiatorM2:160,trayCount:40});
const lift=sizeDesign({...base,architectureFamily:'heatlift-study',powerArchitecture:'highPower400',trayCount:80,solarM2:1100,radiatorM2:160,batteryKWh:120,heatPumpCOP:4,heatPumpColdK:373.15,heatPumpHotK:423.15,heatPumpColdCapacityKW:200,heatPumpMassKg:625,initialCoreK:373.15,radiatorDesignK:423.15});

test('Redwire has no remote fluid equipment and keeps two finite thermal paths',()=>{
 const t=red.energySystem.thermal;
 assert.equal(t.kind,'passive-local');
 for(const value of [t.pumpsInstalled,t.pumpNominalKW,t.fluidKg,t.accumulator.count,t.layout.additionalCrossings])assert.equal(value,0);
 assert.equal(t.connectivity.fluidCrossings.length,0);
 assert.ok(t.passive.conductanceKWK>0&&t.passive.busConductanceKWK>0&&t.passive.capacityKW>0);
 const mel=buildEquipmentList(red);
 assert.equal(mel.rows.find(r=>r.wbs==='02.01').quantity,2);
 assert.equal(mel.rows.find(r=>r.wbs==='03.01').quantity,1);
 assert.match(mel.rows.find(r=>r.wbs==='03.02').item,/heat pipes/);
 near(mel.totals.closureKg,0,1e-6);
 const off=energyRuntime(red,{powered:false});
 assert.ok(off.payloadToRadiatorConductanceKWK>0&&off.loopToRadiatorConductanceKWK>0);
 near(off.busLoadKW,0);
});

test('Local payload heat does not appear in the bus store; passive capacity saturates',()=>{
 const input={dtS:60,loopK:300,radiatorK:300,batteryK:300,loopCapacityKJK:500,radiatorCapacityKJK:100,batteryCapacityKJK:100,loopToRadiatorKWK:0,batteryToLoopKWK:0,loopHeatKW:0,radiatorHeatKW:0,batteryHeatKW:0,payloadK:350,payloadCapacityKJK:60,payloadHeatKW:8,payloadToRadiatorKWK:1.2,payloadTransportCapacityKW:2};
 const result=stepThermalNetwork(input);
 near(result.loopK,300);near(result.batteryK,300);
 near(result.payloadToRadiatorKW,2);assert.equal(result.payloadTransportSaturated,true);
 near(result.storedKW,8);near(result.residualKW,0);
 assert.ok(result.payloadK>input.payloadK&&result.radiatorK>input.radiatorK);
});

test('AI1 fluid loops have disjoint headers, accumulators and pumps',()=>{
 const t=ai1.energySystem.thermal;
 assert.equal(t.kind,'redundant-pumped');assert.equal(t.loopCount,2);
 assert.equal(t.pumpsInstalled,4);assert.equal(t.pumpsOperating,2);
 assert.equal(t.connectivity.sharedFluidHeaders,false);
 const all=t.connectivity.independentLoops.flatMap(l=>[...l.headers,l.accumulatorId,...l.pumpIds]);
 assert.equal(new Set(all).size,all.length);
 near(t.loopHardwareKg,t.loops.reduce((sum,l)=>sum+l.loopHardwareKg,0));
 near(t.fluidKg,t.loops.reduce((sum,l)=>sum+l.fluidKg,0));
 near(t.pumpNominalKW,t.loops.reduce((sum,l)=>sum+l.pumpNominalKW,0));
 assert.equal(buildEquipmentList(ai1).rows.find(r=>r.wbs==='03.02').quantity,2);
});

test('Cell strings follow semiconductor voltage assumptions and physical wing count',()=>{
 const multi=deriveEnergySystem({...ai1,input:{...ai1.input,pv:'multijunction'}}),si=deriveEnergySystem({...ai1,input:{...ai1.input,pv:'silicon'}});
 assert.equal(multi.electrical.source.cellMppAssumptionV,2.4);assert.equal(si.electrical.source.cellMppAssumptionV,.55);
 assert.ok(si.electrical.source.seriesCells>3*multi.electrical.source.seriesCells);
 for(const h of [red,ai1,lift]){
  const e=h.energySystem.electrical;
  assert.equal(e.source.solarWingCount,architectureFamily(h).solarWingCount);
  assert.equal(e.mppt.count,e.mppt.perWing*e.source.solarWingCount);
 }
});

test('Heat-pump work is drawn once from the primary bus and joins hot-side heat',()=>{
 const r=energyRuntime(lift,{loadKW:170,itKW:160,loopK:373.15,radiatorK:423.15});
 assert.ok(r.heatPumpInputKW>0);near(r.heatPumpColdRemovalKW,4*r.heatPumpInputKW);
 near(r.heatPumpHotRejectionKW,r.heatPumpColdRemovalKW+r.heatPumpInputKW);
 near(r.busLoadKW,r.payloadDemandKW+r.serviceDemandKW+r.heatPumpInputKW+r.conversionLossKW+r.harnessLossKW);
 assert.ok(lift.energySystem.electrical.heatPumpDrive.voltageV===400);
 assert.equal(lift.energySystem.thermal.fluid.applicable,false);
 assert.equal(lift.energySystem.thermal.fluid.inletPressurePa,null);
 const result=stepThermalNetwork({dtS:10,loopK:373.15,radiatorK:423.15,batteryK:300,loopCapacityKJK:1000,radiatorCapacityKJK:500,batteryCapacityKJK:100,loopToRadiatorKWK:0,batteryToLoopKWK:0,loopHeatKW:0,radiatorHeatKW:0,batteryHeatKW:0,heatPumpColdRemovalKW:10,heatPumpInputKW:2.5});
 near(result.loopK,373.05);near(result.radiatorK,423.4);
 near(result.storedKW,2.5);near(result.residualKW,0);
});

test('Impossible COP is rejected and finite compressor capacity remains fixed',()=>{
 const t=lift.energySystem.thermal;
 const invalid=deriveEnergySystem({...lift,input:{...lift.input,heatPumpCOP:10}});
 assert.equal(invalid.checks.find(r=>r.id==='thermal-heatpump-carnot').status,'shortfall');
 assert.equal(invalid.thermal.heatPump.valid,false);
 near(heatPumpPerformance(invalid.thermal,{coldHeatKW:100}).heatPumpInputKW,0);
 const capped=heatPumpPerformance(t,{coldHeatKW:10000,coldK:373.15,hotK:423.15});
 near(capped.heatPumpColdRemovalKW,200);near(capped.heatPumpInputKW,50);
 const before=JSON.stringify(lift.energySystem);
 const dispatch=dispatchEnergy(lift,{solarKW:80,energyKWh:lift.batteryKWh*lift.input.socMin,endpointServiceKW:1,wantedITKW:160,loopK:373.15,radiatorK:423.15});
 assert.ok(dispatch.itKW<160);assert.ok(dispatch.runtime.heatPumpInputKW>0);
 near(dispatch.servedLoadKW,80,1e-6);
 near(dispatch.runtime.heatPumpHotRejectionKW,dispatch.runtime.heatPumpColdRemovalKW+dispatch.runtime.heatPumpInputKW);
 assert.equal(JSON.stringify(lift.energySystem),before);
});

test('Curtailment, idle operation and diagnostic heat use the same cold-side boundary',()=>{
 const solarKW=300,lossFactor=1/lift.energySystem.electrical.mppt.efficiency-1;
 const args={solarKW,energyKWh:lift.batteryKWh*lift.input.socMax,endpointServiceKW:1,wantedITKW:20,loopK:373.15,radiatorK:423.15,sourceHeatKW:solarKW*lossFactor};
 const dispatch=dispatchEnergy(lift,args),r=dispatch.runtime;
 assert.ok(dispatch.p.curtailed>0);
 const harvestedHeat=(solarKW-dispatch.p.curtailed)*lossFactor;
 near(r.heatPumpColdRemovalKW,r.busLoadKW-r.heatPumpInputKW-r.batteryHeaterKW-r.radiatorHeaterKW+harvestedHeat,1e-7);
 const idle=energyRuntime(lift,{loadKW:1,itKW:0,loopK:373.15,radiatorK:423.15});
 assert.ok(idle.heatPumpInputKW>0);
 near(energyRuntime(lift,{loadKW:1,itKW:0,loopK:373.15,radiatorK:423.15,pumpEnabled:false}).heatPumpInputKW,0);
 const diagnostic=itKW=>energyRuntime(lift,{loadKW:itKW+1,itKW,appliedPayloadHeatKW:24,sourceHeatKW:3,loopK:373.15,radiatorK:423.15});
 const low=diagnostic(10),high=diagnostic(160);
 near(low.heatPumpColdRemovalKW,24+low.loopHeaterKW+low.controlKW+3);
 near(low.heatPumpInputKW,high.heatPumpInputKW);
 const point=energyTemperatureLadder(lift,{heatKW:220,heatPumpInputKW:0,loopK:373.15,radiatorK:423.15,pumpEnabled:true});
 near(point.transportRequiredKW,220);assert.equal(point.transportValid,false);
});

test('Heat-lift sizing feeds upstream losses back into electrical and thermal demands',()=>{
 const h=sizeDesign({...lift.input,trayCount:40}),e=sizingEnvelope(h),r=e.energyInterfaces.peak;
 assert.ok(r.sizingFeedbackResidualKW<1e-8);
 near(r.heatPumpColdRemovalKW,r.busLoadKW-r.heatPumpInputKW-r.batteryHeaterKW-r.radiatorHeaterKW+e.energyInterfaces.sourceConversionHeatKW+e.energyInterfaces.batteryHeatKW,1e-7);
 near(e.energyInterfaces.rejectedKw,r.busLoadKW+e.energyInterfaces.sourceConversionHeatKW+e.energyInterfaces.batteryHeatKW);
 near(e.energyInterfaces.heatTransport.transportRequiredKW,e.energyInterfaces.rejectedKw-r.heatPumpInputKW);
 const diagnostic=sizingEnvelope(sizeDesign({...h.input,thermalMode:'applied',appliedHeatKw:24}));
 const a=diagnostic.energyInterfaces.meanActive,i=diagnostic.energyInterfaces.meanIdle,p=diagnostic.energyInterfaces.peak;
 for(const point of [a,i])near(point.heatPumpColdRemovalKW,24+point.loopHeaterKW+point.controlKW+point.sizingSourceHeatKW,1e-7);
 near(diagnostic.energyInterfaces.rejectedKw,24+p.heaterKW+p.controlKW+p.heatPumpInputKW+diagnostic.energyInterfaces.sourceConversionHeatKW+diagnostic.energyInterfaces.batteryHeatKW);
 const impossible=sizingEnvelope(sizeDesign({...h.input,heatPumpCOP:10}));
 assert.equal(impossible.rates.coolantTransport,0);
});

test('PDR reports do not give passive or heat-lift designs ammonia phase passes',()=>{
 for(const h of [red,lift]){
  const envelope=sizingEnvelope(h),report=assessResourceDomains({h,envelope});
  assert.ok(!report.thermal.checks.some(r=>r.id==='thermal-ammonia-liquid'));
  assert.ok(!report.thermal.checks.some(r=>r.id==='thermal-ammonia-freeze'));
  const point=thermalSizingPoint(h,{itKW:h.itKw,heatKW:envelope.energyInterfaces.rejectedKw,radiatorK:h.input.radiatorDesignK});
  assert.equal(point.liquidPressureMarginPa,null);assert.equal(point.qualificationStatus,'unassessed');
  for(const svg of [renderEnergySingleLine(h),renderThermalPath(h)]){assert.match(svg,/<svg[^>]*role="img"/);assert.doesNotMatch(svg,/NaN|Infinity|undefined/);}
 }
 const report=assessResourceDomains({h:lift,envelope:sizingEnvelope(lift)});
 assert.equal(report.thermal.checks.find(r=>r.id==='thermal-heatpump-materials').status,'unassessed');
});

test('Family operation snapshots, MEL and served-load graphics conserve energy',()=>{
 for(const h of [red,lift]){
  const sim=createSimulation(h),s=sim.at(commissioningClock(h).endS+180),mel=buildEquipmentList(h,s);
  near(mel.rows.reduce((sum,row)=>sum+(row.instantPowerW||0),0)/1000,s.servedLoadKW,1e-6);
  near(servedPowerLoads(s).reduce((sum,row)=>sum+row.kw,0),s.servedLoadKW,1e-6);
  near(s.solarKW+s.dischargeKW,s.servedLoadKW+s.chargeKW+s.curtailedKW,1e-6);
  near(s.thermalResidualKW,0,1e-6);
  for(const key of ['junctionK','loopK','radiatorK','batteryK','payloadColdK'])assert.ok(Number.isFinite(s[key]));
  if(h===red){near(s.pumpKW,0);near(s.coolantKgPerSec,0);assert.equal(s.thermalTopology,'passive-local');}
  if(h===lift)near(s.heatPumpHotRejectionKW,s.heatPumpColdRemovalKW+s.servedHeatPumpKW);
 }
});

test('Window thermal peaks follow the payload or cold store independently of radiator temperature',()=>{
 for(const h of [red,lift]){
  const sim=createSimulation(h),audit=sim.auditStep(undefined,commissioningClock(h).endS+1800);
  const observed=Math.max(...audit.stats.thermal.rows.filter(row=>row.id==='junction'&&row.durationS>0).map(row=>row.maxK));
  near(audit.stats.maxJunctionK,observed,1e-6);
 }
});

console.log(`${passed.length} architecture energy checks passed.`);
