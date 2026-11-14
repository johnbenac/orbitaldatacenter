// Shared preliminary allocation for the Redwire hinge-axis power/optical
// transfer. This is a custom spacecraft packaging requirement, not a claim
// that the cited marine/terrestrial references are flight-qualified parts.
export const redwirePayloadTransferPolicy=Object.freeze({
 id:'ODC-RW-ROTARY-001',revision:'2026-11-14-lr4',
 parallelPathsPerConductor:4,supplierPathCurrentA:20,allocatedPathCurrentA:15,
 supplierAggregateCurrentA:720,allocatedResistanceOhmPerPath:.004,
 internalLeadFixedLengthM:1.10,internalLeadRotatingLengthM:.80,
 internalLeadCopperAreaMM2:50,internalLeadInsulationAreaMM2:34,
 hotCopperResistivityOhmM:2.10e-8,copperDensityKgM3:8960,internalLeadInsulationDensityKgM3:1300,
 conductorsPerPowerCircuit:2,powerRingAxialPitchM:.015,
 maximumOpticalChannels:52,opticalChannelsPerWorker:2,
 opticalLineRateMbps:100000,opticalInterface:'100GBASE-LR4',
 opticalConnectorTypeId:'lc-sm-100g-lr4',opticalFiberType:'G.652 / OS2 single-mode',
 opticalWavelengthNm:1310,opticalLinkBudgetDb:6.3,
 rotaryInsertionLossDb:3,externalMatingPairLossDb:.35,
 fiberAttenuationDbPerKm:.4,agingContaminationAllocationDb:.5,
 workerOpticsPowerWPerModule:3.5,workerOpticsMassKgPerModule:.05,
 baselineOpticsCreditW:0,baselineOpticsCreditKg:0,
 statorBoxId:'payload-transfer-stator',rotorBoxId:'payload-transfer-rotor',
 statorDimensionsM:Object.freeze([.48,.18,.40]),rotorDimensionsM:Object.freeze([.48,.18,.56]),
 rotorPositionM:Object.freeze([0,.1056,-1.39]),
 coreLengthM:.80,coreRadiusM:.10,
 rootReliefWidthM:.92,rootReliefDepthM:.125,
 electricalBasis:'Four equally shared contact paths per supply and return conductor. Each path is allocated 15 A continuous from a source class 20 A maximum. 4 mΩ hot/end-of-life contact resistance per path is a project requirement. Each conductor also retains 1.10 m fixed and 0.80 m rotating internal copper leads of 50 mm² area; their hot resistance is added separately. Parallel-path current balance, temperature, isolation, life and vacuum qualification require supplier verification.',
 opticalBasis:'Four default logical worker links retain a 100 Gbit/s physical interface per link. Duplex single-mode LR4 permits a 6.3 dB complete channel budget. 3 dB rotary insertion loss, 0.35 dB per external mating pair, 0.4 dB/km fiber and 0.5 dB aging/contamination are explicit project allocations; supplier and environment evidence remain open.',
 opticsMassBasis:'50 g per LR4 module is a preliminary allocation for its optical/electronic core and case, excluding external optical mating hardware already counted in the harness terminations. It is not supplier measured mass. Existing switch/NIC allocations own their electronics and cages; no undocumented optical-module baseline is subtracted.',
 sourceUrls:Object.freeze([
  'https://www.moog.com/products/fiber-optic-rotary-joints/hybrid-forj.html',
  'https://www.moog.com/products/fluid-rotary-union/marine-fluid-rotary-unions/model-173.html',
  'https://networking-docs.nvidia.com/mma1l10crspec',
  'https://networking-docs.nvidia.com/mma1l10crspec/specifications',
  'https://www.tiafotc.org/ieee-802-3-ethernet-standards-update/singlemode-standards-update/100gbase-lr4/'
 ])
});

export function redwirePayloadTransferAllocation({trayCount=0,feedsPerTray=1,branchCurrentA=0,endpointPortGbps=100}={}){
 const p=redwirePayloadTransferPolicy,workers=Math.max(0,Math.ceil(trayCount)),feeds=Math.max(1,Math.ceil(feedsPerTray)),powerCircuits=workers*feeds,powerPasses=powerCircuits*p.conductorsPerPowerCircuit*p.parallelPathsPerConductor;
 const contactLoopResistanceOhm=p.conductorsPerPowerCircuit*p.allocatedResistanceOhmPerPath/p.parallelPathsPerConductor,internalLeadLengthM=p.internalLeadFixedLengthM+p.internalLeadRotatingLengthM,internalLeadLoopResistanceOhm=p.conductorsPerPowerCircuit*p.hotCopperResistivityOhmM*internalLeadLengthM/(p.internalLeadCopperAreaMM2*1e-6),loopResistanceOhm=contactLoopResistanceOhm+internalLeadLoopResistanceOhm,workerOpticsCount=workers*2;
 return {policyId:p.id,revision:p.revision,workerCount:workers,powerCircuitCount:powerCircuits,
  powerPasses,parallelPathsPerConductor:p.parallelPathsPerConductor,
  supplierPathCurrentA:p.supplierPathCurrentA,allocatedPathCurrentA:p.allocatedPathCurrentA,
  requiredCurrentPerBranchA:branchCurrentA,allocatedCurrentPerBranchA:p.parallelPathsPerConductor*p.allocatedPathCurrentA,
  sourceClassAggregateCurrentA:powerPasses*p.supplierPathCurrentA,supplierAggregateCurrentA:p.supplierAggregateCurrentA,
  projectAggregateCurrentA:powerPasses*p.allocatedPathCurrentA,
  contactLoopResistanceOhm,internalLeadLoopResistanceOhm,loopResistanceOhm,
  internalLeadFixedLengthM:p.internalLeadFixedLengthM,internalLeadRotatingLengthM:p.internalLeadRotatingLengthM,
  internalLeadCopperAreaMM2:p.internalLeadCopperAreaMM2,internalLeadInsulationAreaMM2:p.internalLeadInsulationAreaMM2,
  internalLeadConductorCount:powerCircuits*p.conductorsPerPowerCircuit,
  internalLeadCopperMassKg:powerCircuits*p.conductorsPerPowerCircuit*internalLeadLengthM*p.internalLeadCopperAreaMM2*1e-6*p.copperDensityKgM3,
  internalLeadInsulationMassKg:powerCircuits*p.conductorsPerPowerCircuit*internalLeadLengthM*p.internalLeadInsulationAreaMM2*1e-6*p.internalLeadInsulationDensityKgM3,
  contactLossW:powerCircuits*branchCurrentA**2*contactLoopResistanceOhm,
  internalLeadLossW:powerCircuits*branchCurrentA**2*internalLeadLoopResistanceOhm,
  rotaryLossW:powerCircuits*branchCurrentA**2*loopResistanceOhm,
  opticalChannels:workers*p.opticalChannelsPerWorker,maximumOpticalChannels:p.maximumOpticalChannels,
  opticalInterface:p.opticalInterface,physicalLineRateMbps:p.opticalLineRateMbps,allocatedLineRateMbps:endpointPortGbps*1000,
  workerOpticsCount,workerOpticsPowerW:workerOpticsCount*p.workerOpticsPowerWPerModule,
  workerOpticsMassKg:workerOpticsCount*p.workerOpticsMassKgPerModule,
  currentWithin:branchCurrentA<=p.parallelPathsPerConductor*p.allocatedPathCurrentA+1e-9,
  aggregateWithin:powerPasses*p.supplierPathCurrentA<=p.supplierAggregateCurrentA+1e-9,
  opticalChannelsWithin:workers*p.opticalChannelsPerWorker<=p.maximumOpticalChannels,
  lineRateWithin:endpointPortGbps*1000<=p.opticalLineRateMbps,
  basis:p.electricalBasis,opticalBasis:p.opticalBasis,sourceUrls:p.sourceUrls};
}

export function redwireOpticalLinkBudget({cutLengthM=0,matingPairs=4}={}){
 const p=redwirePayloadTransferPolicy,fiberLossDb=Math.max(0,cutLengthM)*p.fiberAttenuationDbPerKm/1000,matingLossDb=matingPairs*p.externalMatingPairLossDb;
 const totalLossDb=p.rotaryInsertionLossDb+matingLossDb+fiberLossDb+p.agingContaminationAllocationDb;
 return {cutLengthM,matingPairs,fiberLossDb,matingLossDb,rotaryInsertionLossDb:p.rotaryInsertionLossDb,
  agingContaminationAllocationDb:p.agingContaminationAllocationDb,totalLossDb,linkBudgetDb:p.opticalLinkBudgetDb,
  marginDb:p.opticalLinkBudgetDb-totalLossDb,within:totalLossDb<=p.opticalLinkBudgetDb,basis:p.opticalBasis};
}

export function redwirePayloadTransferLossKW(allocation,payloadKW,voltageV=48){
 if(!allocation||!(allocation.powerCircuitCount>0)||!(voltageV>0))return 0;
 const perCircuitA=Math.max(0,payloadKW)*1000/(allocation.powerCircuitCount*voltageV);
 return allocation.powerCircuitCount*perCircuitA**2*allocation.loopResistanceOhm/1000;
}
