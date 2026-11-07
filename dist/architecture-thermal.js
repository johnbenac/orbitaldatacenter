// Architecture-specific transport allocations. A topology is supported by a
// public concept; the conductance, capacity and packaging below are explicit
// project study allocations, never a claim of flight qualification.
import {architectureFamily} from './architecture-families.js';

const number=(v,f=0)=>Number.isFinite(v)?v:f;
const positive=(v,f=0)=>Math.max(0,number(v,f));
const clip=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export const architectureThermalControls=[
 {key:'passiveTransportKWK',label:'Local spreader and heat-pipe conductance',group:'Thermal architecture allocations',unit:'kW/K',min:.01,max:100,step:.05,value:1.2},
 {key:'passiveTransportCapacityKW',label:'Local heat-pipe transport capacity',group:'Thermal architecture allocations',unit:'kW',min:.1,max:2000,step:.5,value:12},
 {key:'passiveBusConductanceKWK',label:'Bus-to-radiator passive conductance',group:'Thermal architecture allocations',unit:'kW/K',min:.001,max:20,step:.01,value:.2},
 {key:'heatPumpCOP',label:'Heat-pump cooling COP allocation',group:'Thermal architecture allocations',unit:'kW cold / kW electric',min:.1,max:20,step:.1,value:4},
 {key:'heatPumpColdK',label:'Heat-pump cold-side control temperature',group:'Thermal architecture allocations',unit:'K',min:200,max:500,step:.1,value:373.15},
 {key:'heatPumpHotK',label:'Heat-pump hot-side design temperature',group:'Thermal architecture allocations',unit:'K',min:250,max:700,step:.1,value:423.15},
 {key:'heatPumpColdCapacityKW',label:'Installed heat-pump cold-side capacity',group:'Thermal architecture allocations',unit:'kW cold',min:.1,max:20000,step:1,value:200},
 {key:'heatPumpMassKg',label:'Heat-pump assembly mass allocation',group:'Thermal architecture allocations',unit:'kg',min:1,max:20000,step:1,value:625}
];

export function thermalKind(h){
 const topology=architectureFamily(h).thermalTopology;
 return topology==='passive-local'||topology==='local-passive'?'passive-local':topology==='heat-lift'||topology==='active-heatlift'?'heat-lift':topology==='redundant-pumped'?'redundant-pumped':'pumped';
}

// Non-fluid paths intentionally carry no ammonia pressure or property claim.
// Numeric temperature aliases keep historical plots/export columns usable;
// their physical meaning is carried in nodeLabels and fluid.applicable.
const noFluid=(name)=>({id:'unselected',name,applicable:false,referenceK:300,densityKgM3:null,heatCapacityJkgK:null,viscosityPaS:null,conductivityWmK:null,propertyMinK:null,propertyMaxK:null,inletPressurePa:null,designPressurePa:null,freezeK:null,materials:'Working fluid, pressure containment, seals and material compatibility are unresolved.',propertyBasis:'No hydraulic fluid correlation is asserted for this architecture.'});
function base(h,heatKW,kind){
 const d=h.input||{},radArea=positive(h.radiatorM2,d.radiatorM2),radMass=radArea*positive(d.radKgM2,3.6);
 return {kind,architectureFamily:architectureFamily(h).id,designHeatKW:positive(heatKW),loopCount:0,branches:0,pumpsInstalled:0,pumpsOperating:0,pumpNominalKW:0,heatPumpDesignKW:0,designDeltaK:0,requiredFlowKgS:0,nominalFlowKgS:0,maximumFlowKgS:0,fluidKg:0,radiatorFluidKg:0,loopFluidKg:0,lineMetalKg:0,fluid:noFluid('No remote pumped-fluid circuit'),pump:{id:'none',unitKg:0,efficiency:null,operatingHeadPa:0},layout:{radiatorSectionsPerBank:0,additionalCrossings:0,branchBoreM:0,radiatorTubeBoreM:0,branches:0},atRequired:{branch:{velocityMS:0}},nominal:{totalPa:0},accumulator:{count:0,unitL:0,installedL:0,requiredL:0,basis:'No remote liquid-loop accumulator is installed.'},radiatorCapacityKJK:radMass*.90,loopHardwareCapacityKJK:0,payloadHardwareCapacityKJK:0,coldPlateResistanceKPerKWPerTray:.70,junctionToColdPlateKPerKWPerTray:positive(d.thermalResistanceKPerKw,4),limits:{velocityMS:null,pressurePa:null},evidenceStatus:'open',qualificationStatus:'unassessed'};
}

export function passiveThermalDesign(h,heatKW){
 const d=h.input||{},t=base(h,heatKW,'passive-local');
 const conductanceKWK=positive(d.passiveTransportKWK,1.2),capacityKW=positive(d.passiveTransportCapacityKW,12),busConductanceKWK=positive(d.passiveBusConductanceKWK,.2);
 const heatPipeCount=Math.max(1,Math.ceil(capacityKW)),spreaderKg=1*.002*2700,heatPipeKg=heatPipeCount*.35,busStrapKg=2,mountKg=1.4;
 return {...t,topology:'Radiator-mounted compute → local spreader and heat pipes → one two-sided platform; separate bus thermal straps',redundancy:'No redundant remote liquid loops are claimed. Heat-pipe layout, failed-pipe capacity and freeze/thaw behavior remain open.',nominalConductanceKWK:conductanceKWK,hydraulicHeatCapacityKW:capacityKW,transportCapacityKW:capacityKW,loopHardwareKg:spreaderKg+heatPipeKg+busStrapKg+mountKg,loopHardwareCapacityKJK:busStrapKg*.9,payloadHardwareCapacityKJK:(spreaderKg+heatPipeKg+mountKg)*.9,passive:{conductanceKWK,capacityKW,busConductanceKWK,heatPipeCount,spreaderKg,heatPipeKg,busStrapKg,mountKg,spreaderAreaM2:1,spreaderThicknessM:.002,busRouteEvidence:'Additional project accommodation: a finite bus thermal-strap path to the platform. The source describes electrical harnessing across its deployment hinges; the strap route, hinge accommodation and interface verification are not established by that source.',basis:'The published 1 m square spreader/local heat-pipe topology is retained. 2 mm aluminum, 0.35 kg per 1 kW heat-pipe allocation, 1.4 kg mounts, 2 kg bus straps, conductances and capacity are project estimates; no vendor-rated pipe or wick/fluid selection is implied.'},nodeLabels:{loop:'Bus thermal store',coolant:'Local spreader / transport',coldPlate:'Radiator-mounted cold plate'},connectivity:{payload:['compute','local-spreader','heat-pipes','radiator-platform'],bus:['bus','thermal-straps','radiator-platform'],electricalCrossings:['deployment-hinge-harness'],fluidCrossings:[],thermalCrossings:[{id:'allocated-bus-strap-to-platform',status:'unassessed',basis:'Additional project thermal accommodation; not part of the source electrical-only hinge description.'}],independentLoops:[]},metalBasis:'Local spreader, heat pipes, bus straps and their attachments are in this transport allocation. Cold-plate metal stays inside tray mass; radiator panel metal stays inside radiator mass.'};
}

export function heatliftThermalDesign(h,heatKW){
 const d=h.input||{},t=base(h,heatKW,'heat-lift'),cop=positive(d.heatPumpCOP,4),coldK=number(d.heatPumpColdK,373.15),hotK=number(d.heatPumpHotK,423.15),capacityKW=positive(d.heatPumpColdCapacityKW,200),massKg=positive(d.heatPumpMassKg,625);
 const liftK=hotK-coldK,carnotCOP=coldK>0&&liftK>0?coldK/liftK:null,valid=cop>0&&capacityKW>0&&coldK>0&&liftK>0&&cop<(carnotCOP??0);
 const requiredColdKW=positive(heatKW)/(1+1/Math.max(.001,cop));
 return {...t,topology:'Cold equipment store → electrically driven heat pump → hotter radiator store',redundancy:'One analytical heat-pump assembly; redundant circuits and degraded-mode capacity are not established.',fluid:noFluid('Heat-pump refrigerant and secondary-loop fluid: unselected'),designDeltaK:liftK,nominalConductanceKWK:0,hydraulicHeatCapacityKW:capacityKW,transportCapacityKW:capacityKW,heatPumpDesignKW:capacityKW/Math.max(.001,cop),loopHardwareKg:massKg,loopHardwareCapacityKJK:massKg*.5,heatPump:{cop,coldK,hotK,liftK,carnotCOP,valid,coldCapacityKW:capacityKW,maxInputKW:capacityKW/Math.max(.001,cop),requiredColdKW,requiredInputKW:requiredColdKW/Math.max(.001,cop),maxHotRejectionKW:capacityKW*(1+1/Math.max(.001,cop)),massKg,controlBandK:5,basis:'Cooling COP, cold/hot temperatures, capacity and mass are analytical hardware allocations. The 625 kg default is 2.5 kg per total electrical kW × 250 kW from the self-powered benchmark. It includes the compressor, motor drive and thermal interfaces; it does not select a qualified refrigerant, pressure vessel or high-temperature electronics package.',materialStatus:'unassessed',materialBasis:'The 423.15 K hot-side study is not an extension of the ammonia correlation or its 260–315 K applicability. Refrigerant, oil, seals, containment pressure, electronics temperatures and startup performance need a separate material/component basis.'},nodeLabels:{loop:'Cold equipment store',coolant:'Cold-side transport interface',coldPlate:'Payload cold plate'},connectivity:{cold:['compute-and-bus','cold-transport-interface','heat-pump-evaporator'],hot:['heat-pump-condenser','hot-radiator'],power:['main-bus','motor-drive','heat-pump'],fluidCrossings:[],independentLoops:[]},metalBasis:'The analytical heat-pump mass allocation includes its motor drive and internal thermal interfaces. No ammonia inventory, remote-loop accumulator or independently selected pump is added.'};
}

export function heatPumpPerformance(t,{coldHeatKW=0,coldK,hotK,powered=true,enabled=true,serviceFraction=1}={}){
 const hp=t.heatPump;
 if(!hp)return {heatPumpInputKW:0,heatPumpColdRemovalKW:0,heatPumpHotRejectionKW:0,heatPumpRequestedColdKW:0,heatPumpOperating:false,heatPumpThermodynamicValid:true};
 const actualCold=number(coldK,hp.coldK),actualHot=number(hotK,hp.hotK),lift=actualHot-actualCold,actualCarnot=lift>0&&actualCold>0?actualCold/lift:Infinity;
 const thermodynamicValid=hp.valid&&actualCold>0&&hp.cop<actualCarnot;
 // No temperature feedback is supplied for a sizing calculation. Operational
 // feedback adds a bounded proportional correction and a 5 K startup band.
 const control=Number.isFinite(coldK)?clip((coldK-(hp.coldK-hp.controlBandK))/hp.controlBandK,0,1):1;
 const correction=Number.isFinite(coldK)?hp.coldCapacityKW*Math.max(0,coldK-hp.coldK)/hp.controlBandK:0;
 const requested=positive(coldHeatKW)+correction;
 const q=powered&&enabled&&thermodynamicValid?Math.min(hp.coldCapacityKW,requested)*control*clip(serviceFraction,0,1):0,w=q/Math.max(.001,hp.cop);
 return {heatPumpInputKW:w,heatPumpColdRemovalKW:q,heatPumpHotRejectionKW:q+w,heatPumpRequestedColdKW:requested,heatPumpOperating:q>1e-9,heatPumpThermodynamicValid:thermodynamicValid,heatPumpCarnotCOP:Number.isFinite(actualCarnot)?actualCarnot:null,heatPumpCOP:hp.cop};
}

export function nonFluidTemperatureLadder(h,t,{itKW=0,heatKW,loopK=294,radiatorK=294,payloadColdK,heatPumpInputKW,pumpEnabled=true}={}){
 const trays=Math.max(1,h.trays||h.input?.trayCount||1),it=positive(itKW),heat=positive(heatKW,it),contact=it/trays*t.coldPlateResistanceKPerKWPerTray,junctionRise=it/trays*t.junctionToColdPlateKPerKWPerTray;
 const passive=t.kind==='passive-local',transportK=passive?number(payloadColdK,radiatorK+it/Math.max(.001,t.passive.conductanceKWK)):loopK;
 // A steady sizing point can infer compressor work from COP. A transient must
 // subtract actual served work instead: the controller can be off, saturated,
 // or removing stored heat, so cold input is not inferred from a steady cycle.
 const coldPlateK=transportK+contact,junctionK=coldPlateK+junctionRise,required=passive?it:Number.isFinite(heatPumpInputKW)?Math.max(0,heat-heatPumpInputKW):heat/(1+1/Math.max(.001,t.heatPump.cop));
 const thermodynamicValid=passive||t.heatPump.valid&&loopK>0&&(radiatorK<=loopK||t.heatPump.cop<loopK/(radiatorK-loopK));
 const valid=required<=t.transportCapacityKW+1e-9&&(passive||thermodynamicValid&&pumpEnabled);
 return {radiatorK,loopK,payloadColdK:transportK,coolantSupplyK:transportK,coolantReturnK:transportK,coolantK:transportK,coldPlateK,junctionK,fluidRiseK:0,transportRiseK:junctionK-radiatorK,junctionRiseK:junctionRise,coldPlateRiseK:contact,transportValid:valid,transportCapacityKW:t.transportCapacityKW,transportRequiredKW:required,transportMarginKW:t.transportCapacityKW-required,heatPumpThermodynamicValid:thermodynamicValid,vaporPressurePa:null,liquidPressureMarginPa:null,freezeSeparationK:null,propertyInRange:null,fluidApplicable:false,qualificationStatus:'unassessed',nodeLabels:t.nodeLabels};
}
