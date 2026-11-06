import assert from 'node:assert/strict';
import {defaults,sizeDesign,sizingEnvelope} from './dist/design.js';
import {deriveEnergySystem,energyRuntime,energySolarDelivery,energyTemperatureLadder,ammoniaVaporPressurePa,renderEnergySingleLine,renderThermalPath} from './dist/energy-system.js';
import {dispatchEnergy} from './dist/energy-dispatch.js';
import {stepThermalNetwork} from './dist/thermal-network.js';
import {createSimulation} from './dist/model.js';
import {buildEquipmentList} from './dist/equipment-list.js';
import {assessResourceDomains} from './dist/pdr-resources.js';
import {surfaces} from './dist/physics.js';
import {servedPowerLoads} from './dist/workspaces.js';

// Focused PDR regressions: fixed installed hardware, actual interface limits,
// electrical/thermal conservation, cold control and exported accounting.
const passed=[];
const test=(name,fn)=>{fn();passed.push(name);};
const near=(a,b,tol=1e-8)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const h=sizeDesign(defaults),a=h.energySystem,e=a.electrical,t=a.thermal,c=a.coldControl;
const endpointService=e.peakServiceKW-t.pumpNominalKW-c.totalHeaterKW-c.controlKW;
const full={loadKW:e.installedElectronicsKW+endpointService,itKW:e.installedElectronicsKW,batteryK:260,loopK:260,radiatorK:200};

test('Mission and workload changes do not resize installed energy hardware',()=>{
  const changed=deriveEnergySystem({...h,input:{...h.input,altitudeKm:850,ecc:.05,inclinationDeg:98,missionYears:20,duty:.1,aiPurpose:'pretrain'},itKw:10000,idleKw:5000});
  assert.deepEqual(changed,a);
  const mission=sizeDesign({...defaults,altitudeKm:850,missionYears:20,duty:.1});
  assert.deepEqual(mission.energySystem,a);
});

test('Selected masses enter the shared MEL exactly once',()=>{
  const mass=id=>h.massLedger.find(r=>r.id===id).kg;
  near(mass('coolant'),a.masses.loopKg+a.masses.coldControlKg);
  near(mass('cables'),a.masses.harnessKg);
  near(mass('switch'),h.serviceArchitecture.fabric.massKg+a.masses.electricalKg+12);
  near(a.masses.electricalKg,a.masses.pcduKg+a.masses.mpptKg+a.masses.payloadConvertersKg+a.masses.batteryConvertersKg+a.masses.serviceConvertersKg);
  assert.ok(a.masses.pcduKg>a.masses.busbarKg&&a.masses.busbarKg>0);
});

test('Installed peak ratings include all heaters and downstream wire losses',()=>{
  const r=energyRuntime(h,full);
  near(r.busLoadKW,e.peakBusDemandKW);
  near(r.payloadBranchOutputKW,e.peakPayloadBranchKW);
  near(r.serviceBranchOutputKW,e.peakServiceBranchKW);
  near(r.conversionLossKW,e.peakConversionLossKW);
  near(r.harnessLossKW,e.peakHarnessLossKW);
  near(e.peakBusDemandKW,e.peakEndpointKW+e.peakConversionLossKW+e.peakHarnessLossKW);
  assert.ok(e.payload.capacityKW>=r.payloadBranchOutputKW&&e.service.capacityKW>=r.serviceBranchOutputKW);
  assert.ok(e.distribution.busbarRatingA>=e.distribution.busbarRequiredA);
});

test('Source conversion conserves power and curtails at fixed channel limits',()=>{
  for(const input of [0,1,e.bolArrayKW,e.mppt.inputCapacityKW*10]){
    const s=energySolarDelivery(h,input);
    near(s.inputKW,s.busKW+s.arrayHarnessLossKW+s.mpptLossKW+s.curtailedKW);
    assert.ok(s.inputAcceptedKW<=e.mppt.inputCapacityKW&&s.busKW>=0&&s.lossKW>=0);
  }
  assert.ok(energySolarDelivery(h,e.mppt.inputCapacityKW*10).curtailedKW>0);
});

test('Service admission scales actual auxiliary loads and never credits a partially powered pump',()=>{
  const on=energyRuntime(h,full),half=energyRuntime(h,{...full,serviceFraction:.5}),off=energyRuntime(h,{...full,powered:false});
  for(const key of ['pumpKW','heaterKW','batteryHeaterKW','loopHeaterKW','radiatorHeaterKW','controlKW','endpointServiceKW'])near(half[key],on[key]/2);
  near(half.payloadDemandKW,on.payloadDemandKW);
  near(half.busLoadKW,half.payloadDemandKW+half.serviceDemandKW+half.conversionLossKW+half.harnessLossKW);
  assert.equal(half.coolantFlowKgS,0);assert.equal(half.loopToRadiatorConductanceKWK,0);assert.equal(half.pumpFullyServed,false);
  for(const key of ['busLoadKW','pumpKW','heaterKW','controlKW','conversionLossKW','harnessLossKW','coolantFlowKgS'])assert.equal(off[key],0);
});

test('Cold thermostats and radiator mixing have finite physical authority',()=>{
  const cold=energyRuntime(h,{loadKW:1,loopK:260,batteryK:260,radiatorK:200}),warm=energyRuntime(h,{loadKW:1,loopK:300,batteryK:294,radiatorK:300});
  near(cold.heaterKW,c.totalHeaterKW);near(warm.heaterKW,0);
  near(cold.loopToRadiatorConductanceKWK,0);near(warm.loopToRadiatorConductanceKWK,t.nominalConductanceKWK);
  assert.equal(cold.bypassFraction,1);assert.equal(warm.bypassFraction,0);
  near(h.radiatorM2,defaults.radiatorM2);
});

test('Exposed radiator area radiates before fluid admission and preserves deployed flux accounting',()=>{
  const g={velocityECI:[0,7600,0],positionECI:[6928.137,0,0],sunECI:[1,0,0],radial:[1,0,0],eclipse:false,altitudeKm:550,windowAgeYears:0,sunRadial:1,carrierAttached:false};
  const guidance={bodyXECI:[1,0,0],bodyUpECI:[0,1,0],bodyZECI:[0,0,1],pvNormalECI:[1,0,0],upperRadiatorNormalECI:[1,0,0],lowerRadiatorNormalECI:[0,1,0],wingPitchDeg:0,upperRadiatorPitchDeg:0,lowerRadiatorPitchDeg:0,upperRadiatorRollDeg:0,lowerRadiatorRollDeg:0};
  let prior=0;
  for(const progress of [0,.54,.64,.69,.77,.87,.92,1]){
    const f=surfaces(h,g,progress,false,0,guidance);
    assert.ok(f.radiatorExposedM2>=prior&&f.radiatorExposedM2<=h.radiatorM2);prior=f.radiatorExposedM2;
    near(f.absorbedKW,f.radiatorDirectSolarKW+f.radiatorAlbedoKW+f.radiatorEarthIRKW);
    near(f.absorbedKW,f.upperAbsorbedKW+f.lowerAbsorbedKW);
    assert.ok(f.upperExposureFraction>=.25&&f.lowerExposureFraction>=.25);
  }
  const unfolded=surfaces(h,g,.64,false,0,guidance);
  assert.equal(unfolded.radiatorCoupledM2,0);assert.ok(unfolded.radiatorExposedM2>0&&unfolded.emissionCoeff>0&&unfolded.absorbedKW>0);
  const full=surfaces(h,g,1,false,0,guidance);
  near(full.radiatorExposedM2,h.radiatorM2);near(full.radiatorCoupledM2,h.radiatorM2);
  near(full.emissionCoeff,h.radiatorM2*2*h.input.emissivity*5.670374419e-8/1000);
  near(full.radiatorDirectSolarKW,h.radiatorM2*h.input.absorptivity*1.361*.5);
  const shrouded=surfaces(h,{...g,carrierAttached:true},.64,false,0,guidance);
  for(const key of ['radiatorExposedM2','upperExposureFraction','lowerExposureFraction','absorbedKW','emissionCoeff'])assert.equal(shrouded[key],0);
});

test('Dispatcher respects payload, service and primary limits without growing hardware',()=>{
  const before=JSON.stringify(a),source=energySolarDelivery(h,1e6);
  const x=dispatchEnergy(h,{solarKW:source.busKW,energyKWh:h.batteryKWh,endpointServiceKW:1,wantedITKW:1000});
  assert.ok(x.itKW>0&&x.itKW<1000&&x.p.unmet>0);
  assert.ok(x.runtime.payloadBranchOutputKW<=x.payloadCapacityKW+1e-7);
  assert.ok(x.runtime.serviceBranchOutputKW<=x.serviceCapacityKW+1e-7);
  assert.ok(x.runtime.busLoadKW<=x.mainCapacityKW+1e-7);
  assert.equal(JSON.stringify(a),before);
  near(source.busKW+x.p.discharge,x.servedLoadKW+x.p.charge+x.p.curtailed);
});

test('Low supply prioritizes flight service, records unmet demand and removes the held flow claim',()=>{
  const x=dispatchEnergy(h,{solarKW:.6,energyKWh:h.batteryKWh*h.input.socMin,endpointServiceKW:2,wantedITKW:10,loopK:300});
  assert.equal(x.itKW,0);assert.ok(x.serviceFraction>0&&x.serviceFraction<1);
  assert.equal(x.runtime.coolantFlowKgS,0);assert.equal(x.runtime.radiatorCouplingFraction,0);
  assert.ok(x.p.unmet>0);near(x.servedLoadKW,.6,1e-7);
});

test('Battery transfer uses the installed converter cap and pack efficiency once',()=>{
  const energyKWh=h.batteryKWh*.8,dtS=60,x=dispatchEnergy(h,{solarKW:0,energyKWh,endpointServiceKW:1,wantedITKW:20,dtS});
  assert.ok(x.p.discharge<=e.battery.dischargeBusLimitKW+1e-9);
  near(x.p.energy,energyKWh-x.p.discharge/h.input.dischargeEff*dtS/3600);
  near(x.p.discharge,x.servedLoadKW);
});

test('Pump operating point, fluid inventory and heat capacity use consistent SI units',()=>{
  const volumeFlow=t.nominalFlowKgS/t.fluid.densityKgM3;
  near(t.pumpNominalKW,.020+t.nominal.totalPa*volumeFlow/(t.pump.efficiency*1000));
  near(t.pump.shutoffPa*(t.pump.speedFraction**2-(volumeFlow/t.pump.freeFlowM3S)**2),t.nominal.totalPa);
  near(t.requiredFlowKgS*t.fluid.heatCapacityJkgK*t.designDeltaK/1000,t.designHeatKW);
  near(t.fluidKg,t.loopFluidKg+t.radiatorFluidKg);
  assert.ok(t.loopHardwareCapacityKJK>=t.loopFluidKg*t.fluid.heatCapacityJkgK/1000);
  assert.ok(t.radiatorCapacityKJK>=t.radiatorFluidKg*t.fluid.heatCapacityJkgK/1000);
  assert.ok(Math.abs(t.couplingResidualKW)<1e-5);
});

test('Temperature ladder uses actual flow and flags unsupported phase/property states',()=>{
  const p=energyTemperatureLadder(h,{itKW:20,heatKW:25,loopK:300,radiatorK:295});
  assert.ok(p.junctionK>p.coldPlateK&&p.coldPlateK>p.coolantReturnK&&p.coolantReturnK>p.coolantSupplyK);
  near(p.coolantReturnK-p.coolantSupplyK,25000/(t.nominalFlowKgS*t.fluid.heatCapacityJkgK));
  const noFlow=energyTemperatureLadder(h,{itKW:20,heatKW:25,loopK:300,flowKgS:0});
  assert.equal(noFlow.transportValid,false);assert.ok(Number.isFinite(noFlow.junctionK));
  assert.equal(energyTemperatureLadder(h,{loopK:335}).propertyInRange,false);
  assert.ok(energyTemperatureLadder(h,{loopK:300,radiatorK:190}).freezeSeparationK<0);
  assert.ok(ammoniaVaporPressurePa(300)>1e6&&ammoniaVaporPressurePa(300)<1.1e6);
  assert.ok(ammoniaVaporPressurePa(335)>t.fluid.inletPressurePa);
  assert.equal(ammoniaVaporPressurePa(400),null);
});

test('Extreme installed loads stop at selected family limits and expose shortfalls',()=>{
  const huge=deriveEnergySystem({...h,installedElectronicsKw:1000,solarM2:100000});
  assert.equal(huge.electrical.mppt.perWing,huge.electrical.family.maxMpptPerWing);
  assert.equal(huge.electrical.payload.modules,huge.electrical.family.maxLoadModules);
  assert.ok(huge.thermal.layout.branchBoreM<=huge.electrical.family.maxBranchBoreM);
  assert.ok(huge.thermal.accumulator.installedL<=huge.electrical.family.maxAccumulatorL);
  assert.equal(huge.checks.find(x=>x.id==='energy-family').status,'shortfall');
  assert.equal(huge.checks.find(x=>x.id==='energy-payload').status,'shortfall');
  assert.equal(huge.applicability,'outside_design_envelope');
  const high=deriveEnergySystem({...h,input:{...h.input,powerArchitecture:'highPower400'}});
  assert.equal(high.electrical.family.primaryV,400);assert.notDeepEqual(high.masses,a.masses);
});

test('Three-node thermal exchange conserves energy and applies pack heaters only to the pack',()=>{
  const input={dtS:60,loopK:300,radiatorK:280,batteryK:290,loopCapacityKJK:500,radiatorCapacityKJK:250,batteryCapacityKJK:200,loopToRadiatorKWK:2,batteryToLoopKWK:.02,loopHeatKW:0,radiatorHeatKW:0,batteryHeatKW:0};
  const closed=stepThermalNetwork(input);
  near(closed.storedKW,0);near(closed.residualKW,0);
  assert.ok(closed.loopK<300&&closed.radiatorK>280&&closed.batteryK>290);
  const heated=stepThermalNetwork({...input,loopToRadiatorKWK:0,batteryToLoopKWK:0,batteryHeatKW:.25});
  near(heated.loopK,300);near(heated.radiatorK,280);near(heated.batteryK,290+.25*60/200);near(heated.storedKW,.25);
  const radiating=stepThermalNetwork({...input,loopHeatKW:20,radiatorHeatKW:3,batteryHeatKW:.25,enclosureLeakKW:.1,emissionCoeff:7e-10});
  near(radiating.residualKW,0);near(radiating.storedKW,23.15-radiating.grossEmissionKW);
});

test('PDR reports share the sizing heat boundary and keep verification evidence separate',()=>{
  const envelope=sizingEnvelope(h),reports=assessResourceDomains({h,envelope}),point=energyTemperatureLadder(h,{itKW:h.itKw,heatKW:envelope.energyInterfaces.rejectedKw,loopK:envelope.equilibriumK+envelope.energyInterfaces.loopRiseK,radiatorK:envelope.equilibriumK});
  near(reports.thermal.checks.find(x=>x.id==='thermal-ammonia-liquid').actual,point.liquidPressureMarginPa/1000);
  assert.equal(reports.thermal.checks.find(x=>x.id==='thermal-limits-evidence').status,'unassessed');
  assert.equal(reports.mechanical.checks.find(x=>x.id==='mechanical-strength').status,'unassessed');
  assert.equal(reports.environment.assuranceArchitecture.doseKradsSi,null);
  assert.equal(reports.environment.checks.find(x=>x.id==='environment-radiation').status,'unassessed');
  assert.equal(reports.power.supplementalGraphics.length,1);assert.equal(reports.thermal.supplementalGraphics.length,1);assert.equal(reports.mechanical.supplementalGraphics.length,2);
});

test('Operational model and MEL reconcile served power, solar loss and thermal storage',()=>{
  const hardware=sizeDesign({...defaults,missionYears:.003}),sim=createSimulation(hardware);
  for(const time of [0,1700,3000,6000]){
    const s=sim.at(time),mel=buildEquipmentList(hardware,s);
    near(mel.rows.reduce((total,row)=>total+(row.instantPowerW||0),0)/1000,s.servedLoadKW);
    near(s.solarKW+s.dischargeKW,s.servedLoadKW+s.chargeKW+s.curtailedKW);
    near(s.solarConversionLossKW,(s.solarKW-s.curtailedKW)*(1/hardware.energySystem.electrical.mppt.efficiency-1));
    assert.ok(Math.abs(s.thermalResidualKW)<1e-6);
    for(const key of ['loopK','radiatorK','batteryK','coolantSupplyK','coolantReturnK'])assert.ok(Number.isFinite(s[key]));
    assert.ok(s.pumpKW>=0&&s.heaterKW>=0&&s.epsConversionLossKW>=0&&s.harnessLossKW>=0);
  }
});

test('Power presentation reconciles actual cold, fully served and curtailed-service snapshots',()=>{
  const sim=createSimulation(sizeDesign({...defaults,dischargeC:.01,initialBatteryK:260,missionYears:.003}));
  let partial=false,heating=false,solarLoss=false,packLoss=false;
  for(const time of [0,1700,3000,6000]){
    const s=sim.at(time),rows=servedPowerLoads(s);
    near(rows.reduce((sum,r)=>sum+r.kw,0),s.servedLoadKW);
    near(s.loadKW,s.servedLoadKW+s.unmetKW);
    assert.ok(rows.every(r=>Number.isFinite(r.kw)&&r.kw>=0));
    assert.ok(!rows.some(r=>['solarConversionLossKW','solarHarnessLossKW','packLossKW'].includes(r.key)));
    partial ||= s.powerServiceFraction>0&&s.powerServiceFraction<1;
    heating ||= s.heaterKW>0;
    solarLoss ||= s.solarConversionLossKW>0;
    packLoss ||= s.packLossKW>0;
  }
  assert.ok(partial&&heating&&solarLoss&&packLoss);
});

test('Both standalone SVGs retain readable interface values and accessible descriptions',()=>{
  for(const svg of [renderEnergySingleLine(h),renderThermalPath(h)]){
    assert.match(svg,/<svg[^>]+role="img"/);assert.match(svg,/<title /);assert.match(svg,/<desc /);
    assert.doesNotMatch(svg,/NaN|Infinity|undefined/);
  }
});

console.log(`${passed.length} energy design checks passed.`);
for(const name of passed)console.log(`  ✓ ${name}`);
