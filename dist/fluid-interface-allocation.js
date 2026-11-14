// Explicit project budgets for installed rotary coolant hardware. These are
// engineering allocations, not measured supplier capabilities or qualification.
// Pressure loss still requires coolant density/viscosity and the actual flow
// split; the coefficient below must not be treated as an established rating.
export const rotaryFluidAllocation=Object.freeze({
 minimumFlowDiameterM:.028,
 allocatedMassPerAxisKg:8,
 internalPassageLengthPerAxisM:1,
 allocatedMinorLossCoefficientPerAxis:10,
 accountingStatus:'open-system-allocation',
 qualificationStatus:'supplier-evidence-open',
 basis:'Project accommodation budget: 28 mm minimum internal flow passage, 8 kg installed mass, 1 m developed internal passage and K=10 minor-loss budget per independent rotary axis. The mass covers the allocated drilled aluminium housing/neck envelope and reserve; it is not a measured supplier mass. Final pressure loss, pump margin and supplier mass require the selected article and coolant flow conditions.',
 requiredEvidence:['minimum internal bore including turns and seals','installed mass and inertia','pressure drop versus coolant flow and temperature','working and proof pressure','external and cross-channel leak rate','coolant/material compatibility','rotation torque','thermal-vacuum cycle and deployment/pointing life'],
});

export function designRotaryFluidAllocation(family,{panelCount=2,bankCount=family.radiatorBankCount}={}){
 const active=family.thermalTopology!=='passive-local',tracked=active&&family.radiatorTracking==='root-cant'&&family.id!=='protected-core',banks=active?bankCount:0,rootChannelsPerBank=family.id==='protected-core'?4:2,folds=tracked?Math.max(0,panelCount-1):0,channelsPerBank=rootChannelsPerBank+2*folds,axesPerBank=4+2*folds,channelCount=banks*channelsPerBank,axisCount=banks*axesPerBank;
 // Each fold has two fixed and two rotating finite-radius feeder sections.
 // These dimensions match radiator-fluid-transfer.js/craft-family.js:
 // fixed legs .38+.52, span .54+.05; rotor legs .50+.64, span .35.
 // Each of the four pipes contains two90-degree R=.108 circular fillets.
 const feederLengthPerFoldM=2*(.38+.52+.54+.05+.50+.64+.35-4*(2-Math.PI/2)*.108),feederLengthPerBankM=folds*feederLengthPerFoldM,feederLengthM=banks*feederLengthPerBankM,bore=rotaryFluidAllocation.minimumFlowDiameterM,outer=.036,externalFeederMetalKg=Math.PI*(outer*outer-bore*bore)/4*feederLengthM*8000,internalPassageLengthPerBankM=active?axesPerBank*rotaryFluidAllocation.internalPassageLengthPerAxisM:0,internalFluidVolumeM3=Math.PI*bore*bore/4*(banks*internalPassageLengthPerBankM+feederLengthM),allocatedMassKg=axisCount*rotaryFluidAllocation.allocatedMassPerAxisKg;
 return {bankCount:banks,panelCount,channelCount,axisCount,rootChannelsPerBank:active?rootChannelsPerBank:0,foldChannelsPerBank:2*folds,axesPerBank:active?axesPerBank:0,minimumFlowDiameterM:bore,allocatedMassPerAxisKg:rotaryFluidAllocation.allocatedMassPerAxisKg,allocatedMinorLossCoefficientPerAxis:rotaryFluidAllocation.allocatedMinorLossCoefficientPerAxis,allocatedMassKg,externalFeederLengthM:feederLengthM,externalFeederLengthPerBankM:feederLengthPerBankM,externalFeederOuterDiameterM:outer,externalFeederMetalKg,internalPassageLengthPerBankM,internalFluidVolumeM3,hardwareMassKg:allocatedMassKg+externalFeederMetalKg,seriesMinorLossCoefficientPerBank:active?axesPerBank*rotaryFluidAllocation.allocatedMinorLossCoefficientPerAxis:0,replacesInterleafHoses:tracked,removedLegacyExtraFoldFittingsKg:tracked?2*banks*Math.max(0,panelCount-2):0,removedLegacyExtraFoldMinorK:tracked?2*Math.max(0,panelCount-2):0,accountingStatus:'included-in-fluid-loop-budget',qualificationStatus:rotaryFluidAllocation.qualificationStatus,requiredEvidence:[...rotaryFluidAllocation.requiredEvidence],basis:rotaryFluidAllocation.basis+' Replaced extra-fold flexible fittings and their K=2 budget are removed; common manifolds/terminations and mechanical hinge mass remain in their original ledgers. New external feeder metal uses its actual36/28 mm outer/inner diameters and constructed circular developed length.'};
}

export function declareRotaryFluidChannel(root,{componentId,name,portIds,axes=1,bankEnd=null,hingeIndex=null,basis}={}){
 const channel={componentId,name,portIds,axisCount:axes,bankEnd,hingeIndex,interfaceType:'rotary-coolant',minimumFlowDiameterM:rotaryFluidAllocation.minimumFlowDiameterM,allocatedMassKg:rotaryFluidAllocation.allocatedMassPerAxisKg*axes,allocatedMinorLossCoefficient:rotaryFluidAllocation.allocatedMinorLossCoefficientPerAxis*axes,accountingStatus:rotaryFluidAllocation.accountingStatus,qualificationStatus:rotaryFluidAllocation.qualificationStatus,requiredEvidence:[...rotaryFluidAllocation.requiredEvidence],basis:basis+' '+rotaryFluidAllocation.basis};
 (root.userData.fluidComponentChannels??=[]).push(channel);return channel;
}

export function fluidInterfaceAllocationReport(root){
 const channels=(root.userData.fluidComponentChannels||[]).filter(c=>c.interfaceType==='rotary-coolant'),byBank={};
 for(const c of channels){const key=String(c.bankEnd);byBank[key]??={channelCount:0,axisCount:0,allocatedMassKg:0,allocatedSeriesMinorLossCoefficient:0};const row=byBank[key];row.channelCount++;row.axisCount+=c.axisCount;row.allocatedMassKg+=c.allocatedMassKg;row.allocatedSeriesMinorLossCoefficient+=c.allocatedMinorLossCoefficient;}
 const axisCount=channels.reduce((s,c)=>s+c.axisCount,0),allocatedMassKg=channels.reduce((s,c)=>s+c.allocatedMassKg,0),model=root.userData.fluidInterfaceAccounting,accountingMatches=!!model&&model.channelCount===channels.length&&model.axisCount===axisCount&&Math.abs(model.allocatedMassKg-allocatedMassKg)<1e-8;
 return {channelCount:channels.length,axisCount,allocatedMassKg,minimumFlowDiameterM:channels.length?rotaryFluidAllocation.minimumFlowDiameterM:null,byBank,accountingStatus:accountingMatches?'included-in-fluid-loop-budget':'unreconciled',accountingMatches,modelAllocation:model||null,qualificationStatus:rotaryFluidAllocation.qualificationStatus,qualificationClosed:false,requiredEvidence:[...rotaryFluidAllocation.requiredEvidence],basis:rotaryFluidAllocation.basis};
}
