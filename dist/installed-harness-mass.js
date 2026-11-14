import {redwireHarnessTakeoff} from './redwire-harness-takeoff.js';
import {deriveArchitectureTrade,architectureApplicability} from './architecture-trades.js';
import {adoptCableInstallationHardware,installWorkerOpticsPlacements} from './cable-installation-mass.js';
import {updateRedwireRadiatorExposure} from './radiator-surface-area.js';
import {sha256} from './sha256.js';

// Change this identity when the installed routing construction changes. The
// complete design, physical layout and interface key also have to match; a
// retained takeoff never supplies another design's cable lengths.
export const installedHarnessRoutingRevision='redwire-mounted-installation-87679e8e3f20';
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
 return 'sha256:'+sha256(canonical({routingRevision:installedHarnessRoutingRevision,input:harnessDesignInputs(h.input),geometry:{family:h.architectureFamilyId,body:[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM],wing:[h.wingWidthM,h.wingLengthM],radiator:[h.radiatorWidthM,h.radiatorLengthM,h.radiatorPanelsPerBank],rack:h.rackLayout.slots,tanks:h.propulsion.tanks,engines:h.propulsion.engines,boxes:graph.boxes.map(b=>({id:b.id,positionM:b.positionM,dimensionsM:b.dimensionsM,frame:b.frame,connectorPanels:b.connectorPanels})),installationHardware},interfaces:graph.harnesses.map(a=>({id:a.id,quantity:a.quantity,type:a.connectorTypeId,areaMM2:a.wire.areaMM2,diameterM:a.cableDiameterM,bendRadiusM:a.bendRadiusM,from:port(graph.portById[a.fromPortId]),to:port(graph.portById[a.toPortId])}))}));
}
function validTakeoff(value,key){
 return value?.routingRevision===installedHarnessRoutingRevision&&value.designKey===key&&Array.isArray(value.records)&&value.records.length>0&&value.records.every(r=>typeof r.id==='string'&&typeof r.harnessId==='string'&&Number.isFinite(r.lengthM)&&r.lengthM>0&&Number.isFinite(r.minimumBendRadiusM)&&r.minimumBendRadiusM>0);
}
export function retainedHarnessTakeoff(h,graph){
 const key=installedHarnessDesignKey(h,graph),embedded=h.input.installedHarnessTakeoff;
 for(const candidate of [embedded,takeoffs.get(key),redwireHarnessTakeoff])if(validTakeoff(candidate,key))return clone(candidate);
 // A changed design must never export a stale route takeoff as its own.
 if(embedded)delete h.input.installedHarnessTakeoff;
 return null;
}
export function rememberHarnessTakeoff(h,graph,records,source={kind:'native-installed-routing'}){
 const takeoff={routingRevision:installedHarnessRoutingRevision,designKey:installedHarnessDesignKey(h,graph),records:records.map(r=>({...r})),source:{...source}};
 if(!validTakeoff(takeoff,takeoff.designKey))throw new Error('Invalid installed harness takeoff');
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

export function adoptRedwireHarnessMass(h,graph,{installed=false,source=null,connectorSelections}){
 if(h.architectureFamilyId!=='redwire-platform')return false;
 const installationHardware=adoptCableInstallationHardware(h,graph);
 installWorkerOpticsPlacements(h,graph);
 updateRedwireRadiatorExposure(h,graph);
 const records=harnessMassRecords(graph,{installed,connectorSelections}),status=installed?'installed-route-mass-adopted':'model-estimate-adopted';
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
 const massSignature=canonical({status,parents:Object.entries(parents).map(([id,m])=>[id,m.allocatedKg]),cuts:records.map(r=>[r.id,r.totalMassKg,r.physicalCutLengthM]),installationHardware:installationHardware.parts.map(part=>({id:part.id,wbs:part.wbs,frame:part.frame,pieces:part.pieces})),workerOptics:fabric.workerOptics?.placements||[],radiatorEmissionAreaM2:h.radiatorEmissionAreaM2});
 h.installedHarnessAccounting={status,source:source||{kind:installed?'native-installed-routing':'preliminary-routing-model'},parents,totalMassKg:sum(records.map(r=>r.totalMassKg)),totalCableLengthM:graph.totalCableLengthM,powerLossW:graph.installedPowerLossW,installationHardwareKg:installationHardware.totalMassKg,massSignature};
 const changed=oldSignature!==massSignature;
 if(changed){h.electricalMassRevision=(h.electricalMassRevision||0)+1;if(h.architecture)h.architecture=deriveArchitectureTrade(h);if(h.applicability)h.applicability=architectureApplicability(h);}
 return changed;
}
