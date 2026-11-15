import {redwireHarnessTakeoff} from './redwire-harness-takeoff.js';
import {deriveArchitectureTrade,architectureApplicability} from './architecture-trades.js';
import {adoptCableInstallationHardware,installWorkerOpticsPlacements} from './cable-installation-mass.js';
import {updateRedwireRadiatorExposure} from './radiator-surface-area.js';
import {energyDesignChecks} from './energy-system.js';
import {sha256} from './sha256.js';

// Change this identity when the installed routing construction changes. The
// complete design, physical layout and interface key also have to match; a
// retained takeoff never supplies another design's cable lengths.
export const installedHarnessRoutingRevision='redwire-mounted-installation-87679e8e3f20';
export const starmindHarnessRoutingRevision='starmind-mounted-installation-r1';
export const supportsInstalledHarnessMass=h=>['redwire-platform','starmind-cross'].includes(h.architectureFamilyId);
export const installedHarnessRoutingRevisionFor=h=>h.architectureFamilyId==='starmind-cross'?starmindHarnessRoutingRevision:installedHarnessRoutingRevision;
const canonical=v=>v===null?'null':typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
const sum=rows=>rows.reduce((n,x)=>n+x,0);
const clone=value=>JSON.parse(JSON.stringify(value));
const takeoffs=new Map();
export const harnessDesignInputs=input=>Object.fromEntries(Object.entries(input||{}).filter(([key])=>key!=='installedHarnessTakeoff'));
export function installedHarnessDesignKey(h,graph){
 const port=p=>({id:p.id,boxId:p.boxId,positionM:p.positionM,normal:p.normal,instanceOffsetsM:p.instanceOffsetsM});
 const material=p=>({shape:p.shape||'box',positionM:p.positionM,dimensionsM:p.dimensionsM,axes:p.axes,axis:p.axis,outerRadiusM:p.outerRadiusM,innerRadiusM:p.innerRadiusM,lengthM:p.lengthM,angleRad:p.angleRad,startAngleRad:p.startAngleRad});
 const installationHardware=(graph.installationHardware||[]).map(part=>({id:part.id,frame:part.frame,positionM:part.positionM,dimensionsM:part.dimensionsM,axes:part.axes,materialPieces:part.materialPieces?.map(material)}));
 // Keep the complete canonical layout in the equality fingerprint while
 // avoiding a duplicate 125 kB geometry payload in every share URL/worker input.
 return 'sha256:'+sha256(canonical({routingRevision:installedHarnessRoutingRevisionFor(h),input:harnessDesignInputs(h.input),geometry:{family:h.architectureFamilyId,body:[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM],wing:[h.wingWidthM,h.wingLengthM],radiator:[h.radiatorWidthM,h.radiatorLengthM,h.radiatorPanelsPerBank],rack:h.rackLayout.slots,tanks:h.propulsion.tanks,engines:h.propulsion.engines,boxes:graph.boxes.map(b=>({id:b.id,positionM:b.positionM,dimensionsM:b.dimensionsM,frame:b.frame,connectorPanels:b.connectorPanels})),installationHardware,...(h.architectureFamilyId==='starmind-cross'?{mountedPayload:graph.starmindHarnessInstallation?.payloadRouting?.rows.map(row=>[row.id,row.controlPoints])}:{})},interfaces:graph.harnesses.map(a=>({id:a.id,quantity:a.quantity,type:a.connectorTypeId,areaMM2:a.wire.areaMM2,diameterM:a.cableDiameterM,bendRadiusM:a.bendRadiusM,from:port(graph.portById[a.fromPortId]),to:port(graph.portById[a.toPortId])}))}));
}
function validTakeoff(value,key,revision,graph){
 // A failed Starmind bend still has a measured length and carried material.
 // Keep its zero-radius evidence for the geometry checks; rejecting the entire
 // inventory here would crash the scene and discard otherwise complete cuts.
 // Retain the original Redwire takeoff acceptance contract unchanged.
 const starmind=revision===starmindHarnessRoutingRevision;
 const valid=value?.routingRevision===revision&&value.designKey===key&&Array.isArray(value.records)&&value.records.length>0&&value.records.every(r=>typeof r.id==='string'&&typeof r.harnessId==='string'&&Number.isFinite(r.lengthM)&&r.lengthM>0&&Number.isFinite(r.minimumBendRadiusM)&&(starmind?r.minimumBendRadiusM>=0:r.minimumBendRadiusM>0));
 if(!valid||revision!==starmindHarnessRoutingRevision)return valid;
 const expected=new Map(graph.harnesses.flatMap(a=>Array.from({length:a.quantity*(a.connectorTypeId.startsWith('hv-single')?2:1)},(_,i)=>[a.id+'/'+i,a.id])));
 return value.records.length===expected.size&&new Set(value.records.map(r=>r.id)).size===expected.size&&value.records.every(r=>expected.get(r.id)===r.harnessId);
}
export function retainedHarnessTakeoff(h,graph){
 const key=installedHarnessDesignKey(h,graph),revision=installedHarnessRoutingRevisionFor(h),embedded=h.input.installedHarnessTakeoff;
 for(const candidate of [embedded,takeoffs.get(key),redwireHarnessTakeoff])if(validTakeoff(candidate,key,revision,graph))return clone(candidate);
 // A changed design must never export a stale route takeoff as its own.
 if(embedded)delete h.input.installedHarnessTakeoff;
 return null;
}
export function rememberHarnessTakeoff(h,graph,records,source={kind:'native-installed-routing'}){
 const revision=installedHarnessRoutingRevisionFor(h),takeoff={routingRevision:revision,designKey:installedHarnessDesignKey(h,graph),records:records.map(r=>({...r})),source:{...source}};
 if(!validTakeoff(takeoff,takeoff.designKey,revision,graph))throw new Error('Invalid installed harness takeoff');
 takeoffs.set(takeoff.designKey,clone(takeoff));
 h.input.installedHarnessTakeoff=clone(takeoff);
 return takeoff;
}

// A complete electrical assembly can contain two separately routed polarity
// cables. Count each cut once, then add the assembly's endpoint terminations
// once. The previous longest-cut-times-quantity estimate remains suitable for
// a conservative voltage-drop screen, but is not a material takeoff.
export function harnessMassRecords(graph,{installed=false,connectorSelections}){
 const records=[];
 for(const a of graph.harnesses){
  const polarities=a.connectorTypeId.startsWith('hv-single')?2:1,type=connectorSelections[a.connectorTypeId];
  const actual=new Map((a.installedRoutes||[]).map(r=>[r.id,r]));
  if(installed&&actual.size!==a.quantity*polarities)throw new Error('Incomplete installed mass takeoff for '+a.id);
  for(let instance=0;instance<a.quantity;instance++){
   const routeCuts=Array.from({length:polarities},(_,p)=>{const id=a.id+'/'+(instance*polarities+p),route=actual.get(id);if(installed&&!route)throw new Error('Missing installed mass cut '+id);return {id,cutLengthM:installed?route.cutLengthM:a.cutLengthM};});
   const physicalCutLengthM=sum(routeCuts.map(r=>r.cutLengthM)),conductorLengthM=a.kind==='power'?physicalCutLengthM*(polarities===1?2:1):physicalCutLengthM;
   const cableMassKg=a.kind==='power'?conductorLengthM*a.wire.areaMM2*1e-6*8960*1.4:physicalCutLengthM*(a.kind==='data'?(type.cableMassKgPerM??.020):a.kind==='control'?.045:.0491);
   const connectorMassKg=a.estimatedConnectorKg,wireResistanceOhm=a.kind==='power'?conductorLengthM*2.10e-8/(a.wire.areaMM2*1e-6):0;
   const powerLossW=a.kind==='power'?a.currentA*a.currentA*(wireResistanceOhm+(a.matedContactCount??4)*type.contactResistanceBudgetOhm+(a.additionalRotaryResistanceOhm||0)):0;
   records.push({id:a.id+'#'+(instance+1),harnessId:a.id,instance,routeIds:routeCuts.map(r=>r.id),routeCuts,physicalCutLengthM,conductorLengthM,cableMassKg,connectorMassKg,totalMassKg:cableMassKg+connectorMassKg,powerLossW,basis:installed?'Individual installed circuit cuts plus termination allowance, selected conductor construction and endpoint mating-pair mass estimates.':'Current preliminary route model, selected conductor construction and endpoint mating-pair mass estimates; native route takeoff pending.'});
  }
 }
 return records;
}

function retainStarmindIntraArrayHarness(h,graph){
 if(h.architectureFamilyId!=='starmind-cross')return null;
 const e=h.energySystem.electrical,oneWayLeadM=.60*h.wingLengthM,areaMM2=e.harness.array.areaMM2;
 const basis='Retained preliminary intra-array source-lead allocation: two conductors per MPPT circuit, each 0.60 times the current blanket length, at the original EPS conductor area and hot-copper resistivity. Copper mass includes the existing 40% jacket/local binding factor. These embedded wing leads are not native-routed body cuts or cell interconnects; the external root connectors are counted separately, with no extra termination mass here.';
 const records=graph.harnesses.filter(a=>a.groupId==='array').flatMap(a=>Array.from({length:a.quantity},(_,instance)=>{
  const wingInstance=graph.boxById[a.fromBoxId].instance,id='A-SA-'+(wingInstance+1)+'-'+(instance+1),routeCuts=['positive','return'].map(polarity=>({id:id+'/'+polarity,cutLengthM:oneWayLeadM,allocationStatus:'model-estimated'}));
  const conductorLengthM=2*oneWayLeadM,cableMassKg=conductorLengthM*areaMM2*1e-6*8960*1.4,wireResistanceOhm=conductorLengthM*2.10e-8/(areaMM2*1e-6);
  return {id,harnessId:'A-SA-'+(wingInstance+1),instance,parentWbs:'02.01',groupWbs:'02.01.10',groupItemId:'flight:02.01',kind:'power',label:'Solar wing '+(wingInstance+1)+' embedded source-lead pair '+(instance+1),wingInstance,frame:'solar-wing',quantity:1,unit:'allocated harness',fromEquipment:'Solar wing '+(wingInstance+1)+' source strings',toEquipment:'Solar root '+(wingInstance+1)+' embedded collector interface',fromPortId:null,toPortId:null,connectorTypeId:null,connectorFamily:'Embedded leads; external root terminations counted separately',routeIds:routeCuts.map(cut=>cut.id),routeCuts,physicalCutLengthM:conductorLengthM,conductorLengthM,conductorAreaMM2:areaMM2,currentA:a.currentA,wireResistanceOhm,cableMassKg,connectorMassKg:0,totalMassKg:cableMassKg,powerLossW:a.currentA*a.currentA*wireResistanceOhm,basis,allocationStatus:'model-estimated-intra-array-lead',geometryStatus:'not-individually-routed',sourceUrls:['./energy-system.js','./installed-harness-mass.js']};
 }));
 const totalMassKg=sum(records.map(record=>record.totalMassKg));
 const allocation={parentWbs:'02.01',records,totalMassKg,totalConductorLengthM:sum(records.map(record=>record.conductorLengthM)),basis,placementBasis:'Uniformly distributed with the source blanket and its translating wound roll in the existing solar-wing mass, centroid and inertia model; individual embedded routing is not claimed.'};
 graph.allocatedHarnessMassRecords=records;h.intraArrayHarnessAllocation=allocation;
 h.energySystem.masses.intraArrayHarnessKg=totalMassKg;
 h.massLedger.find(row=>row.id==='array').kg=h.input.solarM2*h.input.pvKgM2+totalMassKg;
 return allocation;
}

function synchronizeStarmindHarnessEnergy(h,graph,records,intraArray,{installed,connectorSelections}){
 if(h.architectureFamilyId!=='starmind-cross')return null;
 const e=h.energySystem.electrical,groups=[];
 for(const id of ['array','payload']){
  const w=e.harness[id],hs=graph.harnesses.filter(a=>a.groupId===id),ids=new Set(hs.map(a=>a.id)),rows=records.filter(row=>ids.has(row.harnessId));
  const count=sum(hs.map(a=>a.quantity)),expectedCurrentA=id==='array'?e.mppt.jointCircuitRatingA:e.installedElectronicsKW*1000/(w.count*e.payload.voltageV);
  const matchesEndpoints=a=>id==='array'?a.fromBoxId.startsWith('solar-root-')&&a.toBoxId==='pcdu':a.fromBoxId==='pcdu'&&a.toBoxId.startsWith('compute-')&&a.voltageV===e.payload.voltageV;
  const valid=count===w.count&&rows.length===count&&count>0&&(id!=='array'||count===e.mppt.count)&&hs.every(a=>a.kind==='power'&&Math.abs(a.currentA-expectedCurrentA)<1e-9&&matchesEndpoints(a));
  const originalResistanceOhm=w.installedResistanceAccounting?.originalResistanceOhm??w.resistanceOhm;
  if(!valid){
   w.resistanceOhm=originalResistanceOhm;
   w.installedResistanceAccounting={mapped:false,originalResistanceOhm,basis:'Topology, circuit quantity or current allocation does not match this existing EPS runtime group; its original aggregate estimate is retained.'};
   groups.push({id,...w.installedResistanceAccounting});continue;
  }
  const wireResistanceOhm=sum(rows.map(row=>{const a=hs.find(a=>a.id===row.harnessId);return row.conductorLengthM*2.10e-8/(a.wire.areaMM2*1e-6);}))/count;
  const contactResistanceOhm=sum(rows.map(row=>{const a=hs.find(a=>a.id===row.harnessId);return (a.matedContactCount??4)*connectorSelections[a.connectorTypeId].contactResistanceBudgetOhm+(a.additionalRotaryResistanceOhm||0);}))/count;
  const retainedIntraArrayResistanceOhm=id==='array'?sum(intraArray.records.map(row=>row.wireResistanceOhm))/count:0;
  w.resistanceOhm=wireResistanceOhm+contactResistanceOhm+retainedIntraArrayResistanceOhm;
  w.installedResistanceAccounting={mapped:true,status:installed?'installed-cut-resistance-adopted':'model-cut-resistance-adopted',count,harnessIds:hs.map(a=>a.id),wireResistanceOhm,contactResistanceOhm,retainedIntraArrayResistanceOhm,originalResistanceOhm,basis:'Mean complete-loop resistance across the existing equal-current parallel circuits, including both physical conductors and each allocated contact once. '+(id==='array'?'The retained embedded-wing source-lead resistance is added once; the external cuts cover collector to PCDU.':'The cuts cover PCDU to each compute tray.')};
  groups.push({id,...w.installedResistanceAccounting});
 }
 // Refresh demand against the selected hardware using the same algebra as
 // electricalDesign. Counts, converter capacities, gauges and thermal transport
 // remain installed choices; a larger demand is a check, never an auto-resize.
 const peakKeys=['peakPayloadBranchKW','peakBusDemandKW','peakConversionLossKW','peakHarnessLossKW'];
 const originalDemand=e.harness.installedDemandAccounting?.originalDemand??{...Object.fromEntries(peakKeys.map(key=>[key,e[key]])),requiredPayloadModules:e.payload.requiredModules,busbarRequiredA:e.distribution.busbarRequiredA};
 const payloadMapped=groups.find(group=>group.id==='payload').mapped;
 if(payloadMapped){
  const loss=(w,kw,voltage)=>w.count*(kw*1000/(Math.max(1,w.count)*voltage))**2*w.resistanceOhm/1000;
  e.peakPayloadBranchKW=e.installedElectronicsKW+loss(e.harness.payload,e.installedElectronicsKW,e.payload.voltageV);
  const heatPumpBranchKW=e.heatPumpDrive?.peakBranchKW||0,heatPumpEndpointKW=e.heatPumpDrive?.peakEndpointKW||0;
  const loadInputsKW=e.peakPayloadBranchKW/e.payload.efficiency+e.peakServiceBranchKW/e.service.efficiency+heatPumpBranchKW/(e.heatPumpDrive?.efficiency||1),primaryPowerKW=loadInputsKW+e.quiescentKW;
  e.peakBusDemandKW=primaryPowerKW+loss(e.harness.primary,primaryPowerKW,e.family.primaryV);
  e.peakConversionLossKW=loadInputsKW-e.peakPayloadBranchKW-e.peakServiceBranchKW-heatPumpBranchKW+e.quiescentKW;
  e.peakHarnessLossKW=(e.peakPayloadBranchKW-e.installedElectronicsKW)+(e.peakServiceBranchKW-e.peakServiceKW)+(heatPumpBranchKW-heatPumpEndpointKW)+(e.peakBusDemandKW-loadInputsKW-e.quiescentKW);
  e.payload.requiredModules=Math.max(1,Math.ceil(e.peakPayloadBranchKW/e.payload.moduleOutputKW));
  e.distribution.busbarRequiredA=Math.max(e.mppt.count*e.mppt.moduleInputKW*e.mppt.efficiency,e.peakBusDemandKW,e.battery.modules*e.battery.moduleKW)*1000/e.family.primaryV;
 }else{
  for(const key of peakKeys)e[key]=originalDemand[key];
  e.payload.requiredModules=originalDemand.requiredPayloadModules;e.distribution.busbarRequiredA=originalDemand.busbarRequiredA;
 }
 const batteries=graph.harnesses.filter(a=>a.groupId==='primary'&&a.fromBoxId.startsWith('battery-')&&a.toBoxId==='pcdu'),batteryCount=new Set(batteries.map(a=>a.fromBoxId)).size;
 for(const a of batteries){
  a.currentA=e.peakBusDemandKW*1000/e.family.primaryV/batteryCount/a.quantity;
  for(const id of [a.fromPortId,a.toPortId])graph.portById[id].currentA=a.currentA;
  // The existing 3 A/mm² and 2% hot-wire drop screens use the conservative
  // longest selected cut, while material and aggregate I²R use every real cut.
  a.wire.requiredAreaMM2=Math.max(.205,a.currentA/3,2*2.10e-8*a.cutLengthM*a.currentA/Math.max(.001,a.operatingVoltageMinV*.02)*1e6);
  a.wire.supported=a.wire.areaMM2>=a.wire.requiredAreaMM2;a.voltageDropV=a.currentA*a.resistanceOhm;a.powerLossW=a.currentA*a.currentA*a.resistanceOhm;
  for(const row of records.filter(row=>row.harnessId===a.id)){const loopResistanceOhm=row.conductorLengthM*2.10e-8/(a.wire.areaMM2*1e-6)+(a.matedContactCount??4)*connectorSelections[a.connectorTypeId].contactResistanceBudgetOhm+(a.additionalRotaryResistanceOhm||0);row.powerLossW=a.currentA*a.currentA*loopResistanceOhm;}
 }
 const demandBasis='Peak payload and bus demand are recalculated from the adopted payload loop resistance with the existing service, primary and heat-pump estimates. Installed converter/feed counts, ratings and gauges remain fixed; required-module, busbar, voltage-drop and battery-circuit current checks expose any shortfall.';
 e.harness.installedDemandAccounting={payloadMapped,originalDemand,peakPayloadBranchKW:e.peakPayloadBranchKW,peakBusDemandKW:e.peakBusDemandKW,basis:demandBasis};
 h.energySystem.checks=energyDesignChecks(h);h.energySystem.applicability=h.energySystem.checks.some(check=>check.status==='shortfall')?'outside_design_envelope':'within_preliminary_envelope';
 const basis='Starmind runtime I²R uses the current array and payload conductor cuts with the existing equal-load parallel-feed assumption. Intra-array source leads remain the explicit model allocation in WBS 02.01. Primary distribution and mixed-voltage service/pump paths retain their existing EPS aggregate estimates: the detailed battery-to-PCDU circuits are not the distribution feeds, and no new service-current sharing is assumed. '+demandBasis+' This does not redesign thermal transport or qualify individual routes.';
 e.harness.runtimeLossBasis=basis;
 return {groups,demand:e.harness.installedDemandAccounting,basis};
}

export function adoptInstalledHarnessMass(h,graph,{installed=false,source=null,connectorSelections}){
 if(!supportsInstalledHarnessMass(h))return false;
 const installationHardware=adoptCableInstallationHardware(h,graph);
 installWorkerOpticsPlacements(h,graph);
 updateRedwireRadiatorExposure(h,graph);
 const records=harnessMassRecords(graph,{installed,connectorSelections}),status=installed?'installed-route-mass-adopted':'model-estimate-adopted';
 const intraArray=retainStarmindIntraArrayHarness(h,graph),energyAccounting=synchronizeStarmindHarnessEnergy(h,graph,records,intraArray,{installed,connectorSelections});
 const oldSignature=h.installedHarnessAccounting?.massSignature;
 for(const a of graph.harnesses){
  const rows=records.filter(r=>r.harnessId===a.id);
  a.estimatedCableKg=sum(rows.map(r=>r.cableMassKg))/a.quantity;
  a.allocatedCableKg=a.estimatedCableKg;a.allocatedConnectorKg=a.estimatedConnectorKg;
  a.installedMassRecords=rows;a.totalCableMassKg=sum(rows.map(r=>r.cableMassKg));a.totalConnectorMassKg=sum(rows.map(r=>r.connectorMassKg));a.totalMassKg=a.totalCableMassKg+a.totalConnectorMassKg;
 }
 for(const group of graph.assemblies){const rows=graph.harnesses.filter(a=>a.groupId===group.id);group.estimatedMassKg=sum(rows.map(a=>a.totalCableMassKg));group.allocatedMassKg=group.estimatedMassKg;}
 for(const group of graph.connectorDetails)group.allocatedMassKg=group.estimatedMassKg;
 const parents={};
 for(const [parent,m] of Object.entries(graph.massAccounting)){
  const hs=graph.harnesses.filter(a=>a.parentWbs===parent),cableKg=sum(hs.map(a=>a.totalCableMassKg)),connectorKg=sum(hs.map(a=>a.totalConnectorMassKg)),required=cableKg+connectorKg;
  Object.assign(m,{originalAllocatedKg:m.originalAllocatedKg??m.allocatedKg,allocatedKg:required,estimatedRequiredKg:required,allocationToEstimateRatio:1,marginKg:0,cableKg,connectorKg,accountingStatus:status,basis:(installed?'Individual installed route cuts':'Current preliminary routing model')+' and selected cable/termination estimates are adopted in the spacecraft parent mass. No scaled suballocation or duplicate connector mass.'});parents[parent]={...m};
 }
 const harnessKg=parents['07.05'].allocatedKg,fabricCableKg=parents['01.04'].allocatedKg,fabric=h.serviceArchitecture.fabric;
 // Preserve the switch/NIC/controller mass; replace only the cable+termination
 // share of the fabric parent. Each parent still owns its mass exactly once.
 const fabricHardwareKg=fabric.massKg-fabric.cableMassKg;
 fabric.cableMassKg=fabricCableKg;fabric.massKg=fabricHardwareKg+fabricCableKg;
 fabric.cableMassBasis=parents['01.04'].basis;
 h.serviceArchitecture.accounting.additionalHardwareKg=h.serviceArchitecture.compute.extraHostMassKg+fabric.massKg;
 const nonFabric=graph.harnesses.filter(a=>a.parentWbs==='07.05');
 h.energySystem.masses.harnessKg=harnessKg;
 h.energySystem.masses.powerHarnessKg=sum(nonFabric.filter(a=>a.kind==='power').map(a=>a.totalMassKg));
 h.energySystem.masses.signalHarnessKg=harnessKg-h.energySystem.masses.powerHarnessKg;
 h.energySystem.masses.harnessMassBasis=parents['07.05'].basis;
 h.massLedger.find(r=>r.id==='cables').kg=harnessKg;
 h.massLedger.find(r=>r.id==='switch').kg=fabric.massKg-(fabric.workerOptics?.massKg||0)+h.energySystem.masses.electricalKg+12;
 const opticsLedger=h.massLedger.find(r=>r.id==='optics');if(opticsLedger)opticsLedger.kg=fabric.workerOptics?.massKg||0;
 const basicDryKg=sum(h.massLedger.filter(r=>r.group==='Hardware').map(r=>r.kg));
 h.massLedger.find(r=>r.id==='margin').kg=basicDryKg*h.input.structureMargin;
 h.dryKg=basicDryKg*(1+h.input.structureMargin);h.wetKg=h.dryKg+h.pressurantKg+h.propellantKg;h.launchKg=h.wetKg+h.input.adapterKg;
 h.massMarginKg=h.input.launchAllowanceKg-h.launchKg;h.launchReferenceMarginKg=h.input.referenceKg-h.launchKg;h.launchScreenMarginKg=Math.min(h.input.launchAllowanceKg,h.input.referenceKg)-h.launchKg;
 h.launchScreenFeasible=h.fairing.fit&&h.payloadInterface.passes&&h.launchScreenMarginKg>=0;
 graph.harnessMassRecords=records;graph.totalCableLengthM=sum(records.map(r=>r.physicalCutLengthM));graph.installedPowerLossW=sum(records.map(r=>r.powerLossW));
 const massSignature=canonical({status,parents:Object.entries(parents).map(([id,m])=>[id,m.allocatedKg]),cuts:records.map(r=>[r.id,r.totalMassKg,r.physicalCutLengthM]),installationHardware:installationHardware.parts.map(part=>({id:part.id,wbs:part.wbs,frame:part.frame,pieces:part.pieces})),workerOptics:fabric.workerOptics?.placements||[],radiatorEmissionAreaM2:h.radiatorEmissionAreaM2,...(intraArray?{intraArrayHarnessKg:intraArray.totalMassKg,energyAccounting}:{})});
 h.installedHarnessAccounting={status,source:source||{kind:installed?'native-installed-routing':'preliminary-routing-model'},parents,totalMassKg:sum(records.map(r=>r.totalMassKg)),totalCableLengthM:graph.totalCableLengthM,powerLossW:graph.installedPowerLossW,installationHardwareKg:installationHardware.totalMassKg,massSignature};
 if(intraArray)Object.assign(h.installedHarnessAccounting,{externalHarnessMassKg:h.installedHarnessAccounting.totalMassKg,externalCableLengthM:graph.totalCableLengthM,externalPowerLossW:graph.installedPowerLossW,externalPhysicalCutCount:records.reduce((count,row)=>count+row.routeCuts.length,0),allocatedIntraArrayHarnessKg:intraArray.totalMassKg,allocatedIntraArrayConductorCount:intraArray.records.length*2,totalMassKg:h.installedHarnessAccounting.totalMassKg+intraArray.totalMassKg,totalCableLengthM:graph.totalCableLengthM+intraArray.totalConductorLengthM,powerLossW:graph.installedPowerLossW+sum(intraArray.records.map(record=>record.powerLossW)),energyAccounting});
 const changed=oldSignature!==massSignature;
 if(changed){h.electricalMassRevision=(h.electricalMassRevision||0)+1;if(h.architecture)h.architecture=deriveArchitectureTrade(h);if(h.applicability)h.applicability=architectureApplicability(h);}
 return changed;
}

// Retain the original family-specific entry point for existing callers.
export function adoptRedwireHarnessMass(h,graph,options){
 return h.architectureFamilyId==='redwire-platform'?adoptInstalledHarnessMass(h,graph,options):false;
}
