// ODC preliminary energy interfaces. Hardware selection depends only on the
// installed vehicle. Mission conditions assess that hardware without resizing it.
// All module, material, loss and pump allocations below are controlled project
// design estimates. Reference heritage does not qualify the installed assembly.
import {architectureFamily} from './architecture-families.js';
import {installedCommunications} from './communications-packages.js';
import {architectureThermalControls,thermalKind,passiveThermalDesign,heatliftThermalDesign,heatPumpPerformance,nonFluidTemperatureLadder} from './architecture-thermal.js';
export const energySystemRevision='ODC-ENERGY-002 Rev B';
export const energyControls=[{key:'powerArchitecture',label:'Electrical architecture',group:'Installed hardware',options:{reference120:'120 V MPPT · reference family',highPower400:'400 V MPPT · development family'},value:'reference120'},...architectureThermalControls];
export const energySources=Object.freeze([
 {id:'crisa-ghps',title:'Airbus Crisa · GHPS 120 V power system',url:'https://www.crisa.airbus.com/sites/g/files/jlcbta176/files/2024-10/V3.%200278_24_18_GHPS%20Unit_Datasheet_4-.Airbus%20Crisa.pdf',basis:'120/28 V distribution, modular 3 kW conversion and a 30 kW unit example. ODC module mass, 48 V payload output, channel count and the 400 V development class are project allocations.'},
 {id:'crisa-mppt',title:'Airbus Crisa · PCDU architectures',url:'https://www.crisa.airbus.com/en/airbus-crisas-solutions/power-electronics/power-management-and-distribution-pcdus',basis:'DET and MPPT are distinct available architectures. ODC selects MPPT for variable illumination and independently tracked wings; no supplier contract or qualification is implied.'},
 {id:'iss-atcs',title:'NASA · ISS active thermal control overview',url:'https://www.nasa.gov/pdf/473486main_iss_atcs_overview.pdf',basis:'Ammonia circulation, cold plates, expansion accumulators, radiator bypass mixing and heaters provide an architecture precedent. The retained protected-core family has shared headers; independently contained loops and non-fluid paths are separate selected architectures.'},
 {id:'nist-ammonia',title:'NIST Chemistry WebBook · ammonia phase properties',url:'https://webbook.nist.gov/cgi/cbook.cgi?ID=C7664417&Mask=4',basis:'Fusion temperature 194.95 K and published Antoine vapor-pressure coefficients. Constant density, heat capacity and viscosity used for hydraulic sizing remain explicit project estimates requiring a temperature-dependent property correlation.'},
 {id:'redwire-local-thermal',title:'Redwire · May 2026 power and thermal point design',url:'https://rdw.com/wp-content/uploads/2026/05/RDW26-053-ODC-Power-Thermal-Study-White-Paper-R11-Digital.pdf',basis:'Local compute, spreader and heat-pipe radiator topology; numerical conductances, capacity and detailed pipe/mass realization remain project allocations.'},
 {id:'ai1-thermal-archive',title:'SpaceX AI1 · August 2026 archived thermal and solar specification',url:'https://web.archive.org/web/20260804210223/https://www.spacex.com/spacexai/starmind',basis:'Active fluid cooling, redundant pumping loops and integrated micrometeoroid protection. Current applicability and the published 160 m² area convention remain unresolved; contained-loop realization and fluid choices are allocations.'},
 {id:'heatlift-analytical',title:'Star Catcher · self-powered 250 kW analytical benchmark',url:'https://www.star-catcher.com/news/the-orbital-data-center-power-problem-and-how-to-solve-it',basis:'Analytical heat lift from about 100°C to 150°C, separate from beamed-power scenarios. COP, temperatures, machinery and materials remain explicit study allocations, not flight qualification.'}
]);
const positive=(x,fallback=0)=>Number.isFinite(x)?Math.max(0,x):fallback;
const finite=(x,fallback=0)=>Number.isFinite(x)?x:fallback;
const clip=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const area=D=>Math.PI*D*D/4;
const sum=xs=>xs.reduce((a,b)=>a+b,0);
const choose=(value,options)=>options.find(x=>x>=value)||options.at(-1);
const copperRho=2.10e-8,copperDensity=8960; // Selected 80 °C resistivity estimate; kg/m³.
const wireAreasMM2=[2.5,4,6,10,16,25,35,50,70,95,120];
export const energyFamilies=Object.freeze({
 reference120:{id:'reference120',name:'120 V reference family',primaryV:120,payloadV:48,serviceV:28,sourceV:240,sourceMinV:160,sourceMaxV:320,openCircuitLimitV:360,seriesCells:100,moduleKW:3,maxMpptPerWing:16,maxLoadModules:32,maxFeeds:8,feedRatingA:100,maxElectronicsKW:80,maxBranchBoreM:.035,maxPumpIndex:2,maxAccumulatorL:12,heaterCapKW:3},
 highPower400:{id:'highPower400',name:'400 V development family',primaryV:400,payloadV:48,serviceV:28,sourceV:600,sourceMinV:450,sourceMaxV:850,openCircuitLimitV:900,seriesCells:250,moduleKW:12,maxMpptPerWing:16,maxLoadModules:32,maxFeeds:12,feedRatingA:100,maxElectronicsKW:320,maxBranchBoreM:.065,maxPumpIndex:4,maxAccumulatorL:48,heaterCapKW:12}
});
const fluid=Object.freeze({id:'NH3-single-phase',name:'Anhydrous ammonia · pressurized liquid',referenceK:300,densityKgM3:600,heatCapacityJkgK:4750,viscosityPaS:.00014,conductivityWmK:.50,propertyMinK:260,propertyMaxK:315,inletPressurePa:2e6,designPressurePa:3.5e6,freezeK:194.95,materials:'Aluminum radiator/cold-plate passages and stainless-steel headers; copper-bearing wetted parts excluded from this selection.',propertyBasis:'Rounded constant-property engineering estimates at 300 K. Hydraulic results outside 260–315 K are extrapolation; pressure/temperature property and material/seal compatibility evidence remains open.'});
const pumpCatalogue=Object.freeze([
 {id:'P-09',freeFlowM3S:.0009,shutoffPa:300000,unitKg:4.5},
 {id:'P-24',freeFlowM3S:.0024,shutoffPa:350000,unitKg:8},
 {id:'P-45',freeFlowM3S:.0045,shutoffPa:450000,unitKg:14},
 {id:'P-90',freeFlowM3S:.009,shutoffPa:500000,unitKg:23},
 {id:'P-180',freeFlowM3S:.018,shutoffPa:600000,unitKg:40}
]);

// NIST Antoine expression: pressure in bar, temperature in kelvin. The source
// changes coefficients at 239.6 K; no value is invented outside its stated range.
export function ammoniaVaporPressurePa(k){
 if(!Number.isFinite(k)||k<164||k>371.5)return null;
 const [a,b,c]=k<239.6?[3.18757,506.713,-80.78]:[4.86886,1113.928,-10.409];
 return 1e5*10**(a-b/(k+c));
}
function wire(lengthM,currentA,voltageV,count,maxAreaMM2=120){
 const requiredMM2=Math.max(currentA/3,2*copperRho*lengthM*currentA/(.01*voltageV)*1e6);
 const areaMM2=Math.min(maxAreaMM2,choose(requiredMM2,wireAreasMM2)),a=areaMM2*1e-6;
 const resistanceOhm=2*copperRho*lengthM/a;
 return {count,lengthM,areaMM2,requiredMM2,currentRatingA:areaMM2*3,resistanceOhm,metalKg:count*2*lengthM*a*copperDensity,massKg:count*(2*lengthM*a*copperDensity*1.4+.35),ratedDropFraction:currentA*resistanceOhm/voltageV};
}
function wireLossKW(w,powerKW,voltageV){
 const amps=positive(powerKW)*1000/(Math.max(1,w.count)*voltageV);
 return w.count*amps*amps*w.resistanceOhm/1000;
}
function frictionFactor(re,diameterM){
 if(re<=0)return 0;
 if(re<2300)return 64/re;
 const turbulent=.25/Math.log10(.0000015/(3.7*diameterM)+5.74/re**.9)**2;
 return re>=4000?turbulent:(64/re)*(4000-re)/1700+turbulent*(re-2300)/1700;
}
function pipeDrop(massFlowKgS,diameterM,lengthM,minorK=0){
 const v=massFlowKgS/(fluid.densityKgM3*area(diameterM)),re=fluid.densityKgM3*v*diameterM/fluid.viscosityPaS,f=frictionFactor(re,diameterM);
 return {velocityMS:v,reynolds:re,frictionFactor:f,pressurePa:(f*lengthM/diameterM+minorK)*fluid.densityKgM3*v*v/2};
}
function hydraulicPath(layout,massFlowKgS){
 const branchFlow=massFlowKgS/(layout.branches||2);
 const header=pipeDrop(massFlowKgS,layout.headerBoreM,layout.headerLengthM,8);
 const branch=pipeDrop(branchFlow,layout.branchBoreM,layout.branchLineLengthM,layout.branchMinorK);
 const radiator=pipeDrop(branchFlow/layout.radiatorParallelPaths,layout.radiatorTubeBoreM,layout.radiatorPathLengthM,4);
 const coldPlatePa=15000*(branchFlow/layout.coldPlatePathsPerBranch/.08)**2;
 return {header,branch,radiator,coldPlatePa,totalPa:header.pressurePa+branch.pressurePa+radiator.pressurePa+coldPlatePa};
}
function solvePumpOperatingPoint(layout,pump){
 let lo=0,hi=pump.freeFlowM3S*fluid.densityKgM3;
 for(let i=0;i<40;i++){
  const m=(lo+hi)/2,pumpPa=pump.shutoffPa*(1-(m/fluid.densityKgM3/pump.freeFlowM3S)**2);
  if(pumpPa>hydraulicPath(layout,m).totalPa)lo=m;else hi=m;
 }
 return (lo+hi)/2;
}
function thermalDesign(h,family,heatKW,branchCount=architectureFamily(h).radiatorBankCount){
 const d=h.input||{},l=positive(h.bodyLengthM,5),w=positive(h.bodyWidthM,2),radLength=positive(h.radiatorLengthM,5),radWidth=positive(h.radiatorWidthM,2),radArea=positive(h.radiatorM2,d.radiatorM2||0),trays=Math.max(1,Math.ceil(h.trays||d.trayCount||1));
 const designDeltaK=8,requiredFlowKgS=heatKW*1000/(fluid.heatCapacityJkgK*designDeltaK);
 const desiredBore=Math.sqrt(4*(requiredFlowKgS/branchCount)/(fluid.densityKgM3*1.5*Math.PI));
 const bores=[.010,.014,.018,.022,.028,.035,.042,.052,.065].filter(x=>x<=family.maxBranchBoreM);
 const branchBoreM=choose(desiredBore,bores),headerBoreM=choose(branchBoreM*Math.sqrt(2),[.014,.020,.026,.032,.040,.050,.062,.076,.092]);
 // Every pair of radiator panels is a parallel U-path section. Additional
 // sections carry full-size supply/return manifolds and articulated crossings;
 // their metal, fluid inventory and pressure loss remain in the same ledger.
 const panelCount=d.radiatorPanelsPerBank||2,sections=Math.max(1,panelCount/2),extraFolds=panelCount-2,manifoldLengthM=2*radLength*(1-1/sections),extraFlexM=extraFolds*1.2;
 const layout={branches:branchCount,radiatorPanelsPerBank:panelCount,radiatorSectionsPerBank:sections,additionalCrossings:branchCount*extraFolds,manifoldLengthM,extraFlexM,branchMinorK:12+extraFolds*2,branchBoreM,headerBoreM,branchLineLengthM:2*(.55*l+.5*w+1.2)+manifoldLengthM+extraFlexM,headerLengthM:l+2,radiatorTubeBoreM:.008,radiatorPathLengthM:2*radLength/sections+.25,radiatorParallelPaths:Math.max(2,Math.floor(radWidth/.16))*sections,coldPlatePathsPerBranch:Math.max(1,Math.ceil(trays*Math.max(1,Math.ceil(positive(d.trayKw,2)/2.5))/branchCount)),minorLossBasis:'K=8 common headers; K=12 per branch plus K=2 for every additional fold beyond two panels. K=4 per parallel radiator U-path. Each extra fold adds 1.2 m supply/return flexible routing per bank. Cold plates: 15 kPa at 0.08 kg/s per passage.'};
 const atRequired=hydraulicPath(layout,requiredFlowKgS),availablePumps=pumpCatalogue.slice(0,family.maxPumpIndex+1);
 const pump=availablePumps.find(p=>requiredFlowKgS/fluid.densityKgM3<p.freeFlowM3S&&p.shutoffPa*(1-(requiredFlowKgS/fluid.densityKgM3/p.freeFlowM3S)**2)>=atRequired.totalPa)||availablePumps.at(-1);
 const maximumFlowKgS=solvePumpOperatingPoint(layout,pump),nominalFlowKgS=Math.min(requiredFlowKgS,maximumFlowKgS),nominal=hydraulicPath(layout,nominalFlowKgS),efficiency=.45;
 const speedFraction=Math.sqrt(nominal.totalPa/pump.shutoffPa+(nominalFlowKgS/fluid.densityKgM3/pump.freeFlowM3S)**2);
 const pumpNominalKW=.020+nominal.totalPa*nominalFlowKgS/(fluid.densityKgM3*efficiency*1000);
 const headerVolumeM3=area(headerBoreM)*layout.headerLengthM,branchVolumeM3=branchCount*area(branchBoreM)*layout.branchLineLengthM;
 const radiatorVolumeM3=branchCount*layout.radiatorParallelPaths*layout.radiatorPathLengthM*area(layout.radiatorTubeBoreM),coldPlateVolumeM3=trays*.00020,filledVolumeM3=headerVolumeM3+branchVolumeM3+radiatorVolumeM3+coldPlateVolumeM3;
 const requestedAccumulatorL=filledVolumeM3*1000*.12,accumulatorCount=sections,accumulatorUnitL=Math.min(family.maxAccumulatorL,choose(requestedAccumulatorL/accumulatorCount,[3,6,12,24,48])),accumulatorL=accumulatorCount*accumulatorUnitL;
 const radiatorFluidKg=radiatorVolumeM3*fluid.densityKgM3,loopFluidKg=(headerVolumeM3+branchVolumeM3+coldPlateVolumeM3+accumulatorL/2000)*fluid.densityKgM3;
 const pipeWallM=.001,metalDensity=8000;
 const lineMetalKg=metalDensity*((area(headerBoreM+2*pipeWallM)-area(headerBoreM))*layout.headerLengthM+branchCount*(area(branchBoreM+2*pipeWallM)-area(branchBoreM))*layout.branchLineLengthM);
 const fittingsKg=branchCount*4+6*.8+2.0+2*branchCount*extraFolds+branchCount*(accumulatorCount-1),accumulatorKg=2.0*accumulatorCount+accumulatorL*.45,pumpMassKg=2*pump.unitKg;
 const loopHardwareKg=lineMetalKg+fittingsKg+accumulatorKg+pumpMassKg+loopFluidKg+radiatorFluidKg;
 const re=nominal.radiator.reynolds,pr=fluid.heatCapacityJkgK*fluid.viscosityPaS/fluid.conductivityWmK;
 const nu=re<2300?3.66:.023*Math.max(re,2300)**.8*pr**.4;
 const fluidFilmKWK=nu*fluid.conductivityWmK/layout.radiatorTubeBoreM*(Math.PI*layout.radiatorTubeBoreM*layout.radiatorPathLengthM*layout.radiatorParallelPaths*branchCount)/1000;
 const tubeBondKWK=Math.max(.02,radArea*.15),nominalConductanceKWK=1/(1/Math.max(.001,fluidFilmKWK)+1/tubeBondKWK);
 return {kind:'pumped',architectureFamily:architectureFamily(h).id,loopCount:1,topology:'One common pump station; '+branchCount+' isolatable parallel radiator branch'+(branchCount===1?'':'es'),branches:branchCount,pumpsInstalled:2,pumpsOperating:1,heatPumpDesignKW:0,transportCapacityKW:maximumFlowKgS*fluid.heatCapacityJkgK*designDeltaK/1000,connectivity:{independentLoops:[{id:'loop-1',headers:['supply-1','return-1'],accumulatorId:'accumulator-1',pumpIds:['pump-1-duty','pump-1-standby'],radiatorIds:Array.from({length:branchCount},(_,i)=>'radiator-'+(i+1)),coldPlateFraction:1,isolatable:true}],sharedFluidHeaders:true},qualificationStatus:'unassessed',redundancy:'Duty/cold-standby pumps share the expansion accumulator bank and headers. Two radiator banks are not independent redundant loops.',fluid:{...fluid},designHeatKW:heatKW,designDeltaK,requiredFlowKgS,nominalFlowKgS,maximumFlowKgS,hydraulicHeatCapacityKW:maximumFlowKgS*fluid.heatCapacityJkgK*designDeltaK/1000,pumpNominalKW,pump:{...pump,efficiency,speedFraction,headAtRequiredPa:Math.max(0,pump.shutoffPa*(1-(requiredFlowKgS/fluid.densityKgM3/pump.freeFlowM3S)**2)),operatingHeadPa:nominal.totalPa,basis:'Project pump-envelope allocation, not a selected supplier curve. Variable speed matches the calculated system pressure loss; maximum speed defines capacity.'},layout,atRequired,nominal,accumulator:{count:accumulatorCount,unitL:accumulatorUnitL,unitCapacityLimitL:family.maxAccumulatorL,installedL:accumulatorL,requiredL:requestedAccumulatorL,basis:'12% of line/panel/cold-plate volume is reserved for thermal expansion. One bounded accumulator module per parallel panel-pair section; shell, fittings and half-volume fluid inventory enter the ledger. Bellows volume, pressure cycle and gas preload require detailed verification.'},fluidKg:loopFluidKg+radiatorFluidKg,radiatorFluidKg,loopFluidKg,lineMetalKg,loopHardwareKg,loopHardwareCapacityKJK:loopFluidKg*fluid.heatCapacityJkgK/1000+lineMetalKg*.50+(fittingsKg+accumulatorKg+pumpMassKg)*.60,radiatorCapacityKJK:radArea*positive(d.radKgM2,3.6)*.90+radiatorFluidKg*fluid.heatCapacityJkgK/1000,nominalConductanceKWK,fluidFilmKWK,tubeBondKWK,coldPlateResistanceKPerKWPerTray:.70,junctionToColdPlateKPerKWPerTray:positive(d.thermalResistanceKPerKw,4),metalBasis:'1 mm stainless header/branch walls. Radiator tube metal is already inside the selected radiator areal mass; cold-plate metal is already inside tray mass. Additional folds carry 2 kg of fluid fittings per crossing, manifold metal and fluid; their 4 kg mechanical joints are in the mechanism ledger. Radiator U-tube metal remains inside radiator areal mass.',limits:{velocityMS:2.5,pressurePa:fluid.designPressurePa,nominalCoolantMinK:260,nominalCoolantMaxK:315},evidenceStatus:'open'};
}

function independentThermalDesign(h,family,heatKW){
 const count=architectureFamily(h).radiatorBankCount,loops=Array.from({length:count},(_,i)=>{
  const one=thermalDesign({...h,trays:Math.max(1,Math.ceil((h.trays||h.input?.trayCount||1)/count)),radiatorM2:positive(h.radiatorM2,h.input?.radiatorM2)/count},family,heatKW/count,1);
  return {...one,id:'loop-'+(i+1),coldPlateFraction:1/count};
 });
 const one=loops[0],total=key=>sum(loops.map(t=>t[key]));
 const combined={...one,kind:'redundant-pumped',loopCount:count,loops,topology:count+' independent liquid loops, each with an isolated radiator and duty/standby pumps',branches:count,pumpsInstalled:2*count,pumpsOperating:count,designHeatKW:heatKW,redundancy:'Project realization of the published redundant-loop concept: separate headers, accumulator and duty/standby pump pair per loop. Each loop carries its allocated fraction of cold plates and heat; losing a loop loses that capacity. Full-load one-fault tolerance is not claimed.',connectivity:{sharedFluidHeaders:false,independentLoops:loops.map((t,i)=>({id:t.id,headers:['supply-'+(i+1),'return-'+(i+1)],accumulatorId:'accumulator-'+(i+1),pumpIds:['pump-'+(i+1)+'-duty','pump-'+(i+1)+'-standby'],radiatorIds:['radiator-'+(i+1)],coldPlateFraction:1/count,isolatable:true}))}};
 for(const key of ['requiredFlowKgS','nominalFlowKgS','maximumFlowKgS','hydraulicHeatCapacityKW','transportCapacityKW','pumpNominalKW','fluidKg','radiatorFluidKg','loopFluidKg','lineMetalKg','loopHardwareKg','loopHardwareCapacityKJK','radiatorCapacityKJK','nominalConductanceKWK','fluidFilmKWK','tubeBondKWK'])combined[key]=total(key);
 combined.accumulator={...one.accumulator,count:sum(loops.map(t=>t.accumulator.count)),installedL:sum(loops.map(t=>t.accumulator.installedL)),requiredL:sum(loops.map(t=>t.accumulator.requiredL)),basis:'Separately contained expansion modules per independent loop. No shared fluid accumulator or supply/return header is assumed.'};
 combined.layout={...one.layout,additionalCrossings:sum(loops.map(t=>t.layout.additionalCrossings)),independentLoopCount:count};
 return combined;
}

function electricalDesign(h,family,coldControl,thermal,installedElectronicsKW,nonPayloadKW,bolArrayKW){
 const d=h.input||{},trays=Math.max(1,Math.ceil(h.trays||d.trayCount||1)),l=positive(h.bodyLengthM,5),w=positive(h.bodyWidthM,2),b=positive(h.bodyHeightM,2),wingLength=positive(h.wingLengthM,8),batteryKWh=positive(h.batteryKWh,d.batteryKWh||0);
 const architecture=architectureFamily(h),wingCount=architecture.solarWingCount,silicon=d.pv==='silicon',cellMppAssumptionV=silicon?.55:2.4,cellVocAssumptionV=silicon?.67:2.7,seriesCells=Math.ceil(family.sourceV/cellMppAssumptionV),nominalMppV=seriesCells*cellMppAssumptionV;
 const mpptRequiredPerWing=Math.max(1,Math.ceil(bolArrayKW/wingCount/family.moduleKW)),mpptPerWing=Math.min(family.maxMpptPerWing,mpptRequiredPerWing),mpptCount=wingCount*mpptPerWing,sourceCircuitA=family.moduleKW*1000/family.sourceMinV;
 const arrayHarness=wire(.60*wingLength+.50*l+w/2,sourceCircuitA,family.sourceMinV,mpptCount,35);
 const payloadFeedsPerTray=Math.min(16,Math.max(1,Math.ceil(installedElectronicsKW/trays/(48*50/1000))));
 const payloadRouteM=architecture.payloadLocation==='radiator'?Math.max(.25*l+.6,.5*l+positive(h.radiatorLengthM,3.25)/2+1):.25*l+.6;
 const payloadHarness=wire(payloadRouteM,installedElectronicsKW*1000/(trays*payloadFeedsPerTray*48),48,trays*payloadFeedsPerTray,70);
 const peakPayloadBranchKW=installedElectronicsKW+wireLossKW(payloadHarness,installedElectronicsKW,48);
 const neededPayloadModules=Math.max(1,Math.ceil(peakPayloadBranchKW/family.moduleKW)),payloadModules=Math.min(family.maxLoadModules,neededPayloadModules);
 const peakServiceKW=nonPayloadKW+thermal.pumpNominalKW+coldControl.totalHeaterKW+coldControl.controlKW;
 let neededServiceModules=Math.max(1,Math.ceil(peakServiceKW)),serviceModules=Math.min(16,neededServiceModules),serviceHarness,peakServiceBranchKW;
 // Module output ratings include the power dissipated in downstream wiring.
 for(let i=0;i<4;i++){
  serviceHarness=wire(.30*l+.7,1000/28,28,serviceModules,50);
  peakServiceBranchKW=peakServiceKW+wireLossKW(serviceHarness,peakServiceKW,28);
  neededServiceModules=Math.max(1,Math.ceil(peakServiceBranchKW));
  const next=Math.min(16,Math.max(serviceModules,neededServiceModules));if(next===serviceModules)break;serviceModules=next;
 }
 const heatPumpDesignKW=positive(thermal.heatPumpDesignKW),heatPumpFeeds=heatPumpDesignKW>0?Math.max(1,Math.ceil(heatPumpDesignKW/(family.primaryV*50/1000))):0;
 const heatPumpHarness=heatPumpFeeds?wire(.5*l+1,heatPumpDesignKW*1000/(heatPumpFeeds*family.primaryV),family.primaryV,heatPumpFeeds,120):null;
 const heatPumpBranchKW=heatPumpDesignKW+(heatPumpHarness?wireLossKW(heatPumpHarness,heatPumpDesignKW,family.primaryV):0),heatPumpModules=heatPumpDesignKW>0?Math.min(family.maxLoadModules,Math.max(1,Math.ceil(heatPumpBranchKW/family.moduleKW))):0;
 const heatPumpDrive={modules:heatPumpModules,moduleOutputKW:family.moduleKW,capacityKW:heatPumpModules*family.moduleKW,efficiency:.96,voltageV:family.primaryV,peakEndpointKW:heatPumpDesignKW,peakBranchKW:heatPumpBranchKW,basis:'Protected primary-voltage motor-drive branch. Drive hardware is inside the heat-pump assembly mass allocation; routed supply harness and its loss remain in EPS. No 28 V high-power compressor is assumed.'};
 const loadInputsKW=peakPayloadBranchKW/.96+peakServiceBranchKW/.94+heatPumpBranchKW/heatPumpDrive.efficiency;
 let feedCount=Math.min(family.maxFeeds,Math.max(1,Math.ceil(loadInputsKW/(family.primaryV*family.feedRatingA/1000)))),batteryModules=Math.min(family.maxLoadModules,Math.max(1,Math.ceil(loadInputsKW/family.moduleKW))),primaryHarness,quiescentKW,peakBusDemandKW;
 // Bounded discrete choices, including current lost to quiescent and harness
 // loads. No mission variable participates in these hardware selections.
 for(let i=0;i<8;i++){
  primaryHarness=wire(.60*l+1,family.feedRatingA,family.primaryV,feedCount,120);
  quiescentKW=.020+.001*(mpptCount+payloadModules+batteryModules+serviceModules+heatPumpModules);
  const primaryPowerKW=loadInputsKW+quiescentKW;
  peakBusDemandKW=primaryPowerKW+wireLossKW(primaryHarness,primaryPowerKW,family.primaryV);
  const nextFeeds=Math.min(family.maxFeeds,Math.max(feedCount,Math.ceil(peakBusDemandKW/(family.primaryV*family.feedRatingA/1000)))),nextBattery=Math.min(family.maxLoadModules,Math.max(batteryModules,Math.ceil(peakBusDemandKW/family.moduleKW)));
  if(nextFeeds===feedCount&&nextBattery===batteryModules)break;
  feedCount=nextFeeds;batteryModules=nextBattery;
 }
 const batteryCapacityKW=batteryModules*family.moduleKW;
 const peakConversionLossKW=loadInputsKW-peakPayloadBranchKW-peakServiceBranchKW-heatPumpBranchKW+quiescentKW;
 const peakHarnessLossKW=(peakPayloadBranchKW-installedElectronicsKW)+(peakServiceBranchKW-peakServiceKW)+(heatPumpBranchKW-heatPumpDesignKW)+(peakBusDemandKW-loadInputsKW-quiescentKW);
 const busbarRequiredA=Math.max(mpptCount*family.moduleKW*.96,peakBusDemandKW,batteryCapacityKW)*1000/family.primaryV;
 const busbarRatingA=choose(busbarRequiredA,family.primaryV===120?[300,600,900,1200,1600]:[300,600,1200,1800,2400]),busbarLengthM=.50*w+.5,busbarAreaMM2=busbarRatingA/3;
 const busbarKg=2*busbarLengthM*busbarAreaMM2*1e-6*copperDensity*1.25;
 const electrical={family:{...family},controller:'MPPT per parallel source channel; regulated main bus',source:{technology:silicon?'silicon':'multijunction',solarWingCount:wingCount,seriesCells,cellMppAssumptionV,cellVocAssumptionV,referenceK:300,mppTemperatureCoefficientPerK:silicon?-.0035:-.002,vocTemperatureCoefficientPerK:silicon?-.0035:-.002,studyColdK:240,studyHotK:360,nominalMppV,minMppV:family.sourceMinV,maxMppV:family.sourceMaxV,maxOpenCircuitV:family.openCircuitLimitV,estimatedColdVocV:seriesCells*cellVocAssumptionV*(1+(silicon?-.0035:-.002)*(240-300)),estimatedHotMppV:nominalMppV*(1+(silicon?-.0035:-.002)*(360-300)),strings:'Series cells per string; parallel strings grouped into independently protected MPPT channels on each of '+wingCount+' wings.',stringEvidence:'Technology-specific cell MPP/Voc and temperature coefficients are project allocations at 300 K, with a 240–360 K electrical screen. Source generation remains area × efficiency × delivery. Selected flight-cell IV/temperature curves, parallel count, arcing and insulation evidence remain open.'},installedElectronicsKW,bolArrayKW,mppt:{perWing:mpptPerWing,count:mpptCount,requiredPerWing:mpptRequiredPerWing,moduleInputKW:family.moduleKW,inputCapacityKW:mpptCount*family.moduleKW,efficiency:.96,jointCircuitsPerWing:mpptPerWing,jointCircuitRatingA:sourceCircuitA,nominalWingCurrentA:bolArrayKW*1000/(wingCount*nominalMppV),maximumWingCurrentA:mpptPerWing*sourceCircuitA},payload:{voltageV:48,moduleOutputKW:family.moduleKW,modules:payloadModules,requiredModules:neededPayloadModules,capacityKW:payloadModules*family.moduleKW,efficiency:.96,feedsPerTray:payloadFeedsPerTray,feedRatingA:50},service:{voltageV:28,modules:serviceModules,requiredModules:neededServiceModules,capacityKW:serviceModules,efficiency:.94},battery:{modules:batteryModules,moduleKW:family.moduleKW,chargeBusLimitKW:Math.min(batteryCapacityKW,batteryKWh*positive(d.chargeC,1)),dischargeBusLimitKW:Math.min(batteryCapacityKW,batteryKWh*positive(d.dischargeC,2)),basis:'Installed bidirectional-converter rating caps the existing pack C-rate. Existing chargeEff/dischargeEff include the battery conversion path; no second battery efficiency is multiplied.'},distribution:{feeds:feedCount,feedRatingA:family.feedRatingA,capacityKW:feedCount*family.primaryV*family.feedRatingA/1000,nominalBusV:family.primaryV,voltageDropLimitFraction:.02,protection:'Each source and battery path has isolation/contactors. Payload feeds use current-limited switches; the flight 28 V rail is isolated from payload load shedding. Grounding, arcing/EMC and fault coordination require verification.'},heatPumpDrive,harness:{array:arrayHarness,primary:primaryHarness,payload:payloadHarness,service:serviceHarness,heatPump:heatPumpHarness,payloadRouteM,allowableCurrentDensityAMM2:3,conductor:'Copper; 2.10e-8 ohm·m at the selected hot-wire estimate',massBasis:'Two conductors per feed, actual one-way routing length, 40% insulation/attachment addition and 0.35 kg termination allocation per feed; no duplicate array cell interconnect or compute-board wiring.'},quiescentKW,peakServiceKW,peakServiceBranchKW,peakPayloadBranchKW,peakEndpointKW:installedElectronicsKW+peakServiceKW+heatPumpDesignKW,peakBusDemandKW,evidenceStatus:'open'};
 Object.assign(electrical,{peakConversionLossKW,peakHarnessLossKW});
 Object.assign(electrical.distribution,{busbarRatingA,busbarRequiredA,busbarCapacityKW:busbarRatingA*family.primaryV/1000,busbarAreaMM2,busbarLengthM,busbarBasis:'Two internal copper conductors at 3 A/mm² with 25% mounting/insulation mass. Rating covers source, discharge and load cases; charging and discharging are mutually exclusive. Protected load feeders and the separate battery branch retain their own limits.'});
 const signalHarnessKg=8+.04*2*(w*b+l*(w+b)),harnessKg=arrayHarness.massKg+primaryHarness.massKg+payloadHarness.massKg+serviceHarness.massKg+(heatPumpHarness?.massKg||0)+signalHarnessKg;
 const pcduKg=8+feedCount*1.4+busbarKg,mpptKg=mpptCount*(family.moduleKW===3?2.2:5.5),payloadConvertersKg=payloadModules*(family.moduleKW===3?2.4:6.0),batteryConvertersKg=batteryModules*(family.moduleKW===3?3.0:7.2),serviceConvertersKg=serviceModules*1.6;
 const masses={pcduKg,busbarKg,mpptKg,payloadConvertersKg,batteryConvertersKg,serviceConvertersKg,electricalKg:pcduKg+mpptKg+payloadConvertersKg+batteryConvertersKg+serviceConvertersKg,powerHarnessKg:harnessKg-signalHarnessKg,signalHarnessKg,harnessKg,loopKg:thermal.loopHardwareKg,coldControlKg:coldControl.massKg};
 return {electrical,masses};
}
export function deriveEnergySystem(h){
 const d=h.input||{},family=energyFamilies[d.powerArchitecture]||energyFamilies.reference120,kind=thermalKind(h),architecture=architectureFamily(h),fluidPath=kind==='pumped'||kind==='redundant-pumped';
 const installedElectronicsKW=positive(h.installedElectronicsKw,positive(h.acceleratorKw,positive(d.trayCount,1)*positive(d.trayKw,2))),storageKW=positive(h.storageKw);
 const pvArea=positive(h.solarM2,d.solarM2||0),batteryKWh=positive(h.batteryKWh,d.batteryKWh||0),radArea=positive(h.radiatorM2,d.radiatorM2||0),l=positive(h.bodyLengthM,5);
 const batteryMassKg=batteryKWh*1000/positive(d.packWhKg,160),switchKW=positive(h.platformInterfaceKW,.09);
 const nonPayloadKW=.42+switchKW+storageKW+positive(h.cmg?.maneuverW,320)/1000+.12+.06+installedCommunications(h).peakKW+.15;
 const batteryHeaterKW=Math.min(family.heaterCapKW,Math.max(.08,batteryMassKg*.001)),loopHeaterKW=fluidPath?Math.min(family.heaterCapKW,Math.max(.10,radArea*.005)):0,radiatorHeaterKW=fluidPath?Math.min(family.heaterCapKW,Math.max(.06,radArea*.002+l*.010)):0;
 const coldControl={scheme:'Battery thermostatic heaters, loop bypass mixing and radiator freeze-protection heaters',batteryHeaterKW,loopHeaterKW,radiatorHeaterKW,totalHeaterKW:batteryHeaterKW+loopHeaterKW+radiatorHeaterKW,controlKW:.018,batteryFullBelowK:273,batteryOffAboveK:279,loopFullBelowK:263,loopOffAboveK:273,radiatorFullBelowK:210,radiatorOffAboveK:218,mixTargetK:285,mixBandK:8,massKg:2.4+1.2*(batteryHeaterKW+loopHeaterKW+radiatorHeaterKW),basis:'Project heater and mixing set points; six-kelvin battery modulation band approximates thermostatic/PWM control. Heater power is finite. Powered load is charged to EPS and deposited at the receiving thermal node.'};
 const bolArrayKW=pvArea*1361*positive(d.pvEfficiency,.30)*positive(d.solarDelivery,.86)/1000;
 if(!fluidPath){coldControl.scheme=kind==='passive-local'?'Battery thermostatic heaters; passive payload and bus thermal paths':'Battery thermostatic heaters; heat-pump cold-side control';coldControl.basis+=' No ammonia freeze heaters or bypass mixer are installed in this family. Heat-pipe thaw or heat-pump startup hardware remains a verification allocation.';}
 let heatKW=(installedElectronicsKW+nonPayloadKW)/.94+Math.min(bolArrayKW,architecture.solarWingCount*family.maxMpptPerWing*family.moduleKW)*.04,thermal,out,calculatedHotHeatKW=heatKW;
 const candidates=[];
 // Electrical loss and pump power are coupled. Eight bounded passes converge
 // the selected design point; a discrete-selection oscillation retains the
 // larger encountered heat requirement rather than creating extra hardware.
 for(let i=0;i<8;i++){
  thermal=kind==='passive-local'?passiveThermalDesign(h,heatKW):kind==='heat-lift'?heatliftThermalDesign(h,heatKW):kind==='redundant-pumped'?independentThermalDesign(h,family,heatKW):thermalDesign(h,family,heatKW);
  out={schema:'odc-energy-system/2',revision:energySystemRevision,architectureFamily:architecture.id,selectionBasis:'Architecture and voltage family are installed-hardware choices. Module and transport choices depend on installed capacity and geometry only. Counts stop at the selected family limits; excessive demand is reported.',...electricalDesign(h,family,coldControl,thermal,installedElectronicsKW,nonPayloadKW,bolArrayKW),thermal,coldControl};
  const installed={...h,energySystem:out},sun=energySolarDelivery(installed,bolArrayKW),rt=energyRuntime(installed,{loadKW:installedElectronicsKW+nonPayloadKW,itKW:installedElectronicsKW,batteryK:294,loopK:kind==='heat-lift'?thermal.heatPump.coldK:305,radiatorK:kind==='heat-lift'?thermal.heatPump.hotK:300,sourceHeatKW:sun.mpptLossKW});
  calculatedHotHeatKW=rt.busLoadKW+sun.mpptLossKW;candidates.push(calculatedHotHeatKW);
  if(Math.abs(calculatedHotHeatKW-heatKW)<1e-7)break;
  heatKW=i===6?Math.max(...candidates):calculatedHotHeatKW;
 }
 thermal.calculatedHotHeatKW=calculatedHotHeatKW;thermal.couplingResidualKW=thermal.designHeatKW-calculatedHotHeatKW;
 out.sources=energySources;
 out.assumptions=[{id:'E-01',basis:'Project preliminary allocation',text:'Conversion modules, mass estimates, harness current density and pump curves are design estimates; supplier selection and temperature/life verification remain open.'},{id:'E-02',basis:'Selected flight-hardware interface',text:'120 V has public spacecraft precedent. The 400 V class requires dedicated insulation, plasma/arcing, EMC and equipment compatibility development.'},{id:'E-03',basis:'Installed load boundary',text:'Converter and primary ratings include downstream harness losses and simultaneous heater authority. The hydraulic hot case includes installed active equipment, pump and MPPT losses; thermostat heaters are off in that hot case.'},{id:'T-01',basis:'Thermal transport model',text:'Darcy–Weisbach / minor losses, parallel cold plates, radiator tubes, pump curve and a two-node fluid/radiator heat exchange replace an unrestricted kW scaling law.'},{id:'T-02',basis:'Constant-property calculation',text:fluid.propertyBasis}];
 if(!fluidPath)out.assumptions=out.assumptions.filter(row=>!row.id.startsWith('T-')).concat([{id:'T-01',basis:'Architecture-specific thermal path',text:thermal.passive?.basis||thermal.heatPump?.basis},{id:'T-02',basis:'Qualification remains open',text:thermal.heatPump?.materialBasis||'Local heat-pipe conductance, transport limit, startup, freeze/thaw and radiation compatibility require hardware evidence. No remote-fluid or accumulator heritage is inherited.'}]);
 if(kind==='passive-local')out.assumptions.push({id:'T-03',basis:'Additional project bus heat route',text:thermal.passive.busRouteEvidence});
 if(kind==='redundant-pumped')out.assumptions.push({id:'T-03',basis:'Independent-loop project realization',text:thermal.redundancy});
 out.checks=energyDesignChecks({...h,energySystem:out});
 out.applicability=out.checks.some(x=>x.status==='shortfall')?'outside_design_envelope':'within_preliminary_envelope';
 return out;
}

const selected=h=>h.energySystem||deriveEnergySystem(h);
export function energySolarDelivery(h,inputKW){
 const e=selected(h).electrical,input=positive(inputKW),accepted=Math.min(input,e.mppt.inputCapacityKW);
 const arrayHarnessLossKW=Math.min(accepted,wireLossKW(e.harness.array,accepted,e.source.nominalMppV)),atConverters=Math.max(0,accepted-arrayHarnessLossKW),mpptLossKW=atConverters*(1-e.mppt.efficiency);
 return {inputKW:input,inputAcceptedKW:accepted,busKW:atConverters-mpptLossKW,arrayHarnessLossKW,mpptLossKW,lossKW:arrayHarnessLossKW+mpptLossKW,curtailedKW:Math.max(0,input-accepted),capacityKW:e.mppt.inputCapacityKW};
}
export function energyRuntime(h,{loadKW=0,itKW=0,batteryK=294,loopK,coreK,radiatorK=294,payloadColdK,sourceHeatKW=0,appliedPayloadHeatKW,pumpEnabled=true,powered=true,serviceFraction=1}={}){
 const a=selected(h),e=a.electrical,t=a.thermal,c=a.coldControl,loop=finite(loopK,finite(coreK,294)),passive=t.kind==='passive-local',heatlift=t.kind==='heat-lift';
 if(!powered)return {busLoadKW:0,conversionLossKW:0,harnessLossKW:0,pumpKW:0,heatPumpInputKW:0,servedHeatPumpKW:0,heatPumpColdRemovalKW:0,heatPumpHotRejectionKW:0,heatPumpBranchOutputKW:0,heatPumpOperating:false,heatPumpThermodynamicValid:!heatlift||t.heatPump.valid,payloadHeatKW:0,hotSideHeatKW:0,batteryHeaterKW:0,loopHeaterKW:0,radiatorHeaterKW:0,heaterKW:0,controlKW:0,radiatorCouplingFraction:passive?1:0,bypassFraction:passive?0:1,loopToRadiatorConductanceKWK:passive?t.passive.busConductanceKWK:0,payloadToRadiatorConductanceKWK:passive?t.passive.conductanceKWK:0,payloadTransportCapacityKW:passive?t.passive.capacityKW:0,coolantFlowKgS:0,primaryCurrentA:0,primaryDropFraction:0,primaryPowerKW:0,endpointServiceKW:0,payloadBranchOutputKW:0,serviceBranchOutputKW:0,payloadDemandKW:0,serviceDemandKW:0,serviceFraction:0,pumpFullyServed:false,payloadCapacityKW:e.payload.capacityKW,serviceCapacityKW:e.service.capacityKW,primaryCapacityKW:e.distribution.capacityKW};
 const served=clip(finite(serviceFraction,1),0,1),pumpFullyServed=pumpEnabled&&served>=1-1e-9;
 const pumpKW=(pumpEnabled?t.pumpNominalKW:0)*served;
 const batteryHeaterKW=c.batteryHeaterKW*clip((c.batteryOffAboveK-batteryK)/(c.batteryOffAboveK-c.batteryFullBelowK),0,1)*served;
 const loopHeaterKW=c.loopHeaterKW*clip((c.loopOffAboveK-loop)/(c.loopOffAboveK-c.loopFullBelowK),0,1)*served;
 const radiatorHeaterKW=c.radiatorHeaterKW*clip((c.radiatorOffAboveK-radiatorK)/(c.radiatorOffAboveK-c.radiatorFullBelowK),0,1)*served;
 const heaterKW=batteryHeaterKW+loopHeaterKW+radiatorHeaterKW,controlKW=c.controlKW*served;
 const payload=Math.min(positive(itKW),positive(loadKW)),endpointServiceKW=Math.max(0,positive(loadKW)-payload)*served,service=endpointServiceKW+pumpKW+heaterKW+controlKW;
 const payloadHeatKW=Number.isFinite(appliedPayloadHeatKW)?positive(appliedPayloadHeatKW):payload;
 const evaluate=heatPumpInputKW=>{
  const payloadHarnessLoss=wireLossKW(e.harness.payload,payload,e.payload.voltageV),serviceHarnessLoss=wireLossKW(e.harness.service,service,e.service.voltageV),motorHarnessLoss=e.harness.heatPump?wireLossKW(e.harness.heatPump,heatPumpInputKW,e.family.primaryV):0;
  const payloadInput=(payload+payloadHarnessLoss)/e.payload.efficiency,serviceInput=(service+serviceHarnessLoss)/e.service.efficiency,heatPumpBranchOutputKW=heatPumpInputKW+motorHarnessLoss,motorInput=heatPumpBranchOutputKW/(e.heatPumpDrive?.efficiency||1);
  const conversionLossKW=payloadInput-payload-payloadHarnessLoss+serviceInput-service-serviceHarnessLoss+motorInput-heatPumpBranchOutputKW+e.quiescentKW;
  const primaryPower=payloadInput+serviceInput+motorInput+e.quiescentKW,primaryHarnessLoss=wireLossKW(e.harness.primary,primaryPower,e.family.primaryV);
  const harnessLossKW=payloadHarnessLoss+serviceHarnessLoss+motorHarnessLoss+primaryHarnessLoss,busLoadKW=payload+service+heatPumpInputKW+conversionLossKW+harnessLossKW;
  return {busLoadKW,conversionLossKW,harnessLossKW,heatPumpBranchOutputKW,primaryPowerKW:primaryPower,payloadBranchOutputKW:payload+payloadHarnessLoss,serviceBranchOutputKW:service+serviceHarnessLoss};
 };
 let hp=heatPumpPerformance(t),power=evaluate(0);
 if(heatlift){
  // All internal equipment heat enters the cold-side store. Compressor work
  // bypasses that store and joins the hot-side rejection. Recalculate the drive
  // losses so the electrical and thermal accounts use the same accepted work.
  for(let i=0;i<16;i++){
   const coldHeatKW=Number.isFinite(appliedPayloadHeatKW)?payloadHeatKW+loopHeaterKW+controlKW+positive(sourceHeatKW):Math.max(0,power.busLoadKW-hp.heatPumpInputKW-batteryHeaterKW-radiatorHeaterKW)+positive(sourceHeatKW);
   const next=heatPumpPerformance(t,{coldHeatKW,coldK:Number.isFinite(payloadColdK)?payloadColdK:loopK,hotK:radiatorK,powered,enabled:pumpEnabled,serviceFraction:served});
   const difference=Math.abs(next.heatPumpInputKW-hp.heatPumpInputKW);hp=next;power=evaluate(hp.heatPumpInputKW);if(difference<1e-10)break;
  }
 }
 // Mixing changes transport only; it never hides physical radiating area.
 const mixing=clip((loop-(c.mixTargetK-c.mixBandK/2))/c.mixBandK,0,1),radiatorCouplingFraction=passive?1:heatlift?(hp.heatPumpOperating?1:0):pumpFullyServed?mixing:0;
 const loopToRadiatorConductanceKWK=passive?t.passive.busConductanceKWK:heatlift?0:t.nominalConductanceKWK*radiatorCouplingFraction;
 return {...power,...hp,servedHeatPumpKW:hp.heatPumpInputKW,payloadHeatKW,hotSideHeatKW:heatlift?hp.heatPumpHotRejectionKW:Math.max(0,power.busLoadKW-batteryHeaterKW-radiatorHeaterKW)+positive(sourceHeatKW),pumpKW,batteryHeaterKW,loopHeaterKW,radiatorHeaterKW,heaterKW,controlKW,serviceFraction:served,pumpFullyServed,endpointServiceKW,radiatorCouplingFraction,bypassFraction:1-radiatorCouplingFraction,loopToRadiatorConductanceKWK,payloadToRadiatorConductanceKWK:passive?t.passive.conductanceKWK:0,payloadTransportCapacityKW:passive?t.passive.capacityKW:0,coolantFlowKgS:pumpFullyServed?t.nominalFlowKgS:0,primaryCurrentA:power.busLoadKW*1000/e.family.primaryV,primaryDropFraction:power.primaryPowerKW*1000/(e.family.primaryV*e.harness.primary.count)*e.harness.primary.resistanceOhm/e.family.primaryV,payloadCapacityKW:e.payload.capacityKW,serviceCapacityKW:e.service.capacityKW,primaryCapacityKW:e.distribution.capacityKW,payloadDemandKW:payload,serviceDemandKW:service};
}
export function energyTemperatureLadder(h,{itKW=0,heatKW,loopK=294,radiatorK=294,payloadColdK,heatPumpInputKW,pumpEnabled=true,flowKgS}={}){
 const a=selected(h),t=a.thermal,trays=Math.max(1,h.trays||h.input?.trayCount||1),flow=pumpEnabled?positive(flowKgS,t.nominalFlowKgS):0,heat=positive(heatKW,positive(itKW));
 if(t.kind==='passive-local'||t.kind==='heat-lift')return nonFluidTemperatureLadder(h,t,{itKW,heatKW:heat,loopK,radiatorK,payloadColdK,heatPumpInputKW,pumpEnabled});
 const rise=flow>0?heat*1000/(flow*t.fluid.heatCapacityJkgK):0,contact=positive(itKW)/trays*t.coldPlateResistanceKPerKWPerTray,junctionRise=positive(itKW)/trays*t.junctionToColdPlateKPerKWPerTray;
 const coolantSupplyK=loopK-rise/2,coolantReturnK=loopK+rise/2,coldPlateK=coolantReturnK+contact,junctionK=coldPlateK+junctionRise;
 const saturationPa=ammoniaVaporPressurePa(coolantReturnK);
 return {radiatorK,loopK,coolantSupplyK,coolantReturnK,coolantK:coolantReturnK,coldPlateK,junctionK,fluidRiseK:rise,transportRiseK:junctionK-radiatorK,junctionRiseK:junctionRise,coldPlateRiseK:contact,transportValid:flow>0||heat===0,transportCapacityKW:t.hydraulicHeatCapacityKW,transportRequiredKW:heat,transportMarginKW:t.hydraulicHeatCapacityKW-heat,fluidApplicable:true,vaporPressurePa:saturationPa,liquidPressureMarginPa:saturationPa==null?null:t.fluid.inletPressurePa-saturationPa,freezeSeparationK:Math.min(coolantSupplyK,radiatorK)-t.fluid.freezeK,propertyInRange:Math.min(coolantSupplyK,coolantReturnK)>=t.fluid.propertyMinK&&Math.max(coolantSupplyK,coolantReturnK)<=t.fluid.propertyMaxK};
}
export function thermalSizingPoint(h,{itKW=0,heatKW=0,heatPumpInputKW:servedCompressorKW,radiatorK=h.input?.radiatorDesignK||300}={}){
 const t=selected(h).thermal,it=positive(itKW),heat=positive(heatKW),passive=t.kind==='passive-local',lift=t.kind==='heat-lift';
 const loopRiseK=passive?Math.max(0,heat-it)/Math.max(.001,t.passive.busConductanceKWK):lift?t.heatPump.coldK-radiatorK:heat/Math.max(1e-9,t.nominalConductanceKWK),loopK=radiatorK+loopRiseK;
 const heatPumpInputKW=lift?(Number.isFinite(servedCompressorKW)?positive(servedCompressorKW):heat/(1+t.heatPump.cop)):0,heatPumpColdRemovalKW=lift?Math.max(0,heat-heatPumpInputKW):0;
 const point=energyTemperatureLadder(h,{itKW:it,heatKW:heat,loopK,radiatorK,payloadColdK:passive?radiatorK+it/Math.max(.001,t.passive.conductanceKWK):undefined,heatPumpInputKW,pumpEnabled:true});
 return {...point,loopRiseK,heatPumpInputKW,heatPumpColdRemovalKW,heatPumpHotRejectionKW:lift?heat:0,payloadHeatKW:it,hotSideHeatKW:heat,qualificationStatus:'unassessed',sizingBasis:passive?'Payload and bus use separate passive paths to the same radiator.':lift?'Cold-side target and allocated COP; electrical work is included in the supplied hot-side heat.':'Pumped mean-loop rise plus fluid/contact/junction drops.'};
}
const openPassiveBusRoute=t=>({id:'thermal-passive-bus-route',label:'Bus thermal-strap deployment accommodation',actual:null,required:null,unit:'',operator:'',status:'unassessed',basis:t.passive.busRouteEvidence,evidence:'Finite model conductance is not hardware interface verification.'});
export function energyDesignChecks(h){
 const a=selected(h),e=a.electrical,t=a.thermal;
 const row=(id,label,actual,required,unit,operator,basis)=>({id,label,actual:Number.isFinite(actual)?actual:null,required:Number.isFinite(required)?required:null,unit,operator,status:!Number.isFinite(actual)||!Number.isFinite(required)?'unassessed':(operator==='≤'?actual<=required:actual>=required)?'meets':'shortfall',basis,evidence:'Project preliminary interface calculation; component qualification and acceptance remain open.'});
 const checks=[
  row('energy-family','Installed electronics within selected voltage family',e.installedElectronicsKW,e.family.maxElectronicsKW,'kW','≤','Controlled applicability bound; selecting a different mission never changes the hardware family.'),
  row('energy-mppt','MPPT channels cover BOL array output',e.mppt.inputCapacityKW,e.bolArrayKW,'kW input','≥','Installed module and rotary-circuit limits cap bus delivery; excess array output is curtailed.'),
  row('energy-payload','48 V payload conversion capacity',e.payload.capacityKW,e.peakPayloadBranchKW,'kW output','≥','Installed module output ratings include downstream payload harness loss; no unbounded module count.'),
  row('energy-service','28 V service and cold-control capacity',e.service.capacityKW,e.peakServiceBranchKW,'kW output','≥','Simultaneous service, installed heaters and downstream service harness loss.'),
  row('energy-distribution','Primary distribution rating',e.distribution.capacityKW,e.peakBusDemandKW,'kW','≥','Parallel protected feeds at the selected primary voltage.'),
  row('energy-busbar','Internal main-bus current rating',e.distribution.busbarRatingA,e.distribution.busbarRequiredA,'A','≥',e.distribution.busbarBasis),
  row('energy-harness','Primary harness drop at allocated demand',e.peakBusDemandKW*1000/(e.family.primaryV*e.harness.primary.count)*e.harness.primary.resistanceOhm/e.family.primaryV,e.distribution.voltageDropLimitFraction,'fraction','≤','I·R using allocated hot-wire resistance; connector and transient verification remain open.'),
 ];
 checks.push(row('energy-cell-hot-mpp','Estimated hot string MPP within tracker range',e.source.estimatedHotMppV,e.source.minMppV,'V','≥',e.source.stringEvidence),row('energy-cell-cold-voc','Estimated cold string open-circuit voltage',e.source.estimatedColdVocV,e.source.maxOpenCircuitV,'V','≤',e.source.stringEvidence));
 if(t.kind==='passive-local')checks.push(row('thermal-passive-capacity','Local heat-pipe transport capacity',t.passive.capacityKW,e.installedElectronicsKW,'kW','≥',t.passive.basis),row('thermal-passive-conductance','Local thermal path conductance',t.passive.conductanceKWK,.001,'kW/K','≥','Allocated spreader/heat-pipe conductance. Actual temperature differences and transport saturation remain visible.'),{...row('thermal-passive-evidence','Heat-pipe startup and capacity evidence',null,null,'','≥','Selected wick/fluid, transport limit, orientation, startup and freeze/thaw verification remain open.'),status:'unassessed'},openPassiveBusRoute(t));
 else if(t.kind==='heat-lift'){
  const hp=t.heatPump;
  checks.push(row('energy-heatpump-drive','Primary-bus heat-pump drive capacity',e.heatPumpDrive.capacityKW,e.heatPumpDrive.peakBranchKW,'kW output','≥',e.heatPumpDrive.basis),row('thermal-heatpump-capacity','Heat-pump cold-side capacity',hp.coldCapacityKW,hp.requiredColdKW,'kW cold','≥','Capacity applies to the cold-side heat, including internal conversion dissipation. Compressor work joins the hot-side rejection.'),row('thermal-heatpump-lift','Positive hot-to-cold design lift',hp.liftK,.001,'K','≥','Hot and cold temperature inputs must define a refrigeration cycle.'),row('thermal-heatpump-carnot','Cooling COP below reversible ceiling',hp.cop,Number.isFinite(hp.carnotCOP)?hp.carnotCOP*(1-1e-9):null,'kW/kW','≤','Carnot cooling COP = Tcold / (Thot − Tcold). A pass is only a thermodynamic necessary condition, not demonstrated machine performance.'),{...row('thermal-heatpump-materials','Hot-side materials and working-fluid evidence',null,null,'','≥',hp.materialBasis),status:'unassessed'});
 }else checks.push(row('thermal-flow','Pump/system operating point meets flow demand',t.maximumFlowKgS,t.requiredFlowKgS,'kg/s','≥',t.kind==='redundant-pumped'?'Sum of independently contained loop operating points; each loop carries its allocated heat fraction.':'Pump curve intersected with common headers plus one parallel branch; Darcy and minor losses included.'),row('thermal-velocity','Branch flow velocity',t.atRequired.branch.velocityMS,t.limits.velocityMS,'m/s','≤','Selected erosion/noise/pressure-loss planning bound; not a universal NASA limit.'),row('thermal-pressure','Maximum pressure at nominal flow',t.fluid.inletPressurePa+t.nominal.totalPa,t.fluid.designPressurePa,'Pa','≤','Preliminary inlet pressure plus pump differential; relief, proof and burst verification remain open.'),row('thermal-expansion','Accumulator expansion volume',t.accumulator.installedL,t.accumulator.requiredL,'L','≥',t.accumulator.basis));
 return checks;
}

// Graphics are independent of the workbench DOM and reusable in offline PDRs.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=1)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
function canvas(id,title,description,body,height){
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 '+height+'" role="img" aria-labelledby="'+id+'-title '+id+'-desc" style="display:block;width:100%;min-width:640px;height:auto"><title id="'+id+'-title">'+esc(title)+'</title><desc id="'+id+'-desc">'+esc(description)+'</desc><defs><marker id="'+id+'-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#91bac9"/></marker></defs><style>.en-label{font:14px system-ui,sans-serif;fill:#dce8ed}.en-small{font:12px system-ui,sans-serif;fill:#aabec9}.en-title{font:600 18px system-ui,sans-serif;fill:#f0f4ed}.en-value{font:600 17px ui-monospace,monospace;fill:#f0f4ed}.en-path{fill:none;stroke:#91bac9;stroke-width:2}</style><rect width="800" height="'+height+'" rx="12" fill="#13212b"/>'+body+'</svg>';
}
const txt=(x,y,s,type='label',more='')=>'<text x="'+x+'" y="'+y+'" class="en-'+type+'" '+more+'>'+esc(s)+'</text>';
function box(x,y,w,height,title,lines,color='#486474'){
 return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+height+'" rx="7" fill="#233642" stroke="'+color+'"/>'+txt(x+12,y+23,title)+lines.map((s,i)=>txt(x+12,y+46+i*20,s,i===0?'value':'small')).join('');
}
const path=(id,d,color='#91bac9',two=false)=>'<path d="'+d+'" class="en-path" style="stroke:'+color+'" marker-end="url(#'+id+'-arrow)"'+(two?' marker-start="url(#'+id+'-arrow)"':'')+'/>';
export function renderEnergySingleLine(h,s=null){
 const a=selected(h),e=a.electrical,id='odc-energy-single-line',source=energySolarDelivery(h,e.bolArrayKW);
 let b=txt(28,32,e.family.name+' · electrical single-line','title')+txt(28,58,'MPPT → regulated primary bus → isolated 48 V payload and 28 V flight/service rails','small');
 b+=box(28,88,220,103,e.source.solarWingCount+' physical solar wings',[fmt(e.bolArrayKW,1)+' kW BOL input',fmt(e.source.nominalMppV,1)+' V nominal MPP',e.source.seriesCells+' cells/string · '+e.source.technology]);
 b+=box(290,88,220,103,'Protected MPPT channels',[e.mppt.count+' × '+fmt(e.mppt.moduleInputKW,0)+' kW input',e.mppt.perWing+' channels per rotary head',fmt(source.busKW,1)+' kW at main bus']);
 b+=box(560,88,212,103,'Main distribution',[e.family.primaryV+' V regulated',e.distribution.feeds+' load feeds × '+e.distribution.feedRatingA+' A',fmt(e.distribution.busbarRatingA,0)+' A internal busbar']);
 b+=path(id,'M248 136H287')+path(id,'M510 136H557');
 b+=box(28,238,220,100,'Battery power interface',[fmt(h.batteryKWh||h.input.batteryKWh,1)+' kWh installed',fmt(e.battery.chargeBusLimitKW,1)+' / '+fmt(e.battery.dischargeBusLimitKW,1)+' kW charge/discharge','Bidirectional · pack loss once']);
 b+=box(290,238,220,100,'Payload converters',[e.payload.modules+' × '+fmt(e.payload.moduleOutputKW,0)+' kW output','48 V at protected tray feeds',fmt(e.payload.capacityKW,1)+' kW payload capacity']);
 b+=box(560,238,212,100,'Flight and thermal service',[e.service.modules+' × 1 kW output','28 V isolated service rail','Avionics · valves · heaters']);
 b+=path(id,'M138 235V211H666V194','#d6c69a',true)+path(id,'M666 191V211H400V235')+path(id,'M666 211V235');
 b+=box(290,382,220,84,'Integrated compute trays',[h.trays+' trays · '+fmt(e.installedElectronicsKW,1)+' kW',e.payload.feedsPerTray+' protected feed(s) per tray']);
 b+=box(560,382,212,84,'Nominal survival controls',[fmt(a.coldControl.totalHeaterKW,2)+' kW heaters',a.thermal.kind==='pumped'||a.thermal.kind==='redundant-pumped'?'Local thermostats + loop mixing':'Battery cold control']);
 b+=path(id,'M400 338V379')+path(id,'M666 338V379');
 if(a.thermal.kind==='heat-lift'){
  b+=box(28,382,220,84,'Primary-bus heat-pump drive',[fmt(e.heatPumpDrive.capacityKW,1)+' kW drive output',fmt(a.thermal.heatPumpDesignKW,1)+' kW compressor rating']);
  b+=path(id,'M666 211H265V365H138V379','#d6c69a');
  b+=txt(28,505,fmt(a.masses.electricalKg,1)+' kg PCDU/conversion · '+fmt(a.masses.harnessKg,1)+' kg routed harness','small')+txt(28,527,'Motor-drive hardware mass belongs to the heat-pump assembly; source and drive losses are counted once.','small');
 }else b+=txt(28,385,'Physical allocations','label')+txt(28,411,fmt(a.masses.electricalKg,1)+' kg conversion / PCDU','small')+txt(28,433,fmt(a.masses.harnessKg,1)+' kg routed harness','small')+txt(28,455,fmt(e.harness.primary.areaMM2,1)+' mm² primary copper/feed','small');
 const foot=a.thermal.kind==='heat-lift'?566:500;
 b+=txt(28,foot,'Channel limits remain fixed when orbit, duty or service demand changes. Excess demand is reported.','small')+txt(28,foot+22,'Project allocations; cell IV curves, protection coordination and component qualification remain open.','small');
 return canvas(id,'Selected electrical distribution architecture','The selected number of solar wings feeds protected MPPT channels and a regulated main bus, a bidirectional battery interface, isolated payload converters and a separate service rail. A heat-lift architecture adds a protected primary-voltage compressor drive. Installed module and current limits are labeled.',b,foot+42);
}
function renderSpecialThermalPath(h,s,a){
 const t=a.thermal,id='odc-thermal-path',it=h.input?.thermalMode==='applied'?positive(h.input.appliedHeatKw):finite(s?.itKW,a.electrical.installedElectronicsKW),rad=finite(s?.radiatorK,h.input?.radiatorDesignK||300),point=s?energyTemperatureLadder(h,{itKW:it,heatKW:finite(s.heatInputKW,t.designHeatKW),loopK:finite(s.loopK,rad),radiatorK:rad,payloadColdK:s.payloadColdK,heatPumpInputKW:s.servedHeatPumpKW,pumpEnabled:t.kind==='passive-local'||!!s.heatPumpOperating}):thermalSizingPoint(h,{itKW:it,heatKW:t.designHeatKW,radiatorK:rad});
 let b='';
 if(t.kind==='passive-local'){
  b=txt(28,32,'Local compute / radiator platform','title')+txt(28,58,'Passive payload heat transport; a separate thermal-strap path rejects bus heat.','small');
  b+=box(28,98,220,104,'Compute on the platform',[fmt(it,2)+' kW dissipated',fmt(point.junctionK,1)+' K junction',fmt(point.coldPlateK,1)+' K cold plate']);
  b+=box(290,98,220,104,'Spreader and heat pipes',[fmt(t.passive.conductanceKWK,2)+' kW/K allocated',fmt(t.passive.capacityKW,1)+' kW transport bound',t.passive.heatPipeCount+' pipe allocations']);
  b+=box(560,98,212,104,'One two-sided radiator',[fmt(h.radiatorM2,2)+' m² planform',fmt(rad,1)+' K panel temperature','Payload follows panel motion']);
  b+=path(id,'M248 151H287','#e0b69a')+path(id,'M510 151H557','#e0b69a');
  b+=box(28,278,220,100,'Spacecraft bus and battery',[fmt(point.loopK,1)+' K bus store',fmt(a.coldControl.batteryHeaterKW,2)+' kW battery heaters','Payload heat is not in this store']);
  b+=box(290,278,220,100,'Separate bus thermal straps',[fmt(t.passive.busConductanceKWK,2)+' kW/K allocated','Shared receiving radiator','Bus heat path remains explicit']);
  b+=path(id,'M248 327H287','#d6c69a')+path(id,'M510 327H666V205','#d6c69a');
  b+=txt(28,423,'0 remote-loop pumps · 0 expansion accumulators · 0 radiator fluid crossings','label')+txt(28,452,fmt(t.loopHardwareKg,1)+' kg local transport; tray cold plates and radiator structure counted in their own rows.','small')+txt(28,478,'Conductance, capacity, pipe materials and startup/freeze behavior are study allocations requiring verification.','small')+txt(28,501,'Bus straps are an added project path; hinge routing and interface evidence remain open.','small');
  return canvas(id,'Passive local compute radiator architecture','Radiator-mounted compute passes heat through a local spreader and heat pipes. A separate bus thermal-strap path reaches the same radiator. There is no remote payload liquid loop or pump station. Both paths have explicit finite conductance and payload transport capacity. The bus strap is an additional project accommodation with hinge routing unresolved.',b,526);
 }
 if(t.kind==='heat-lift'){
  const hp=t.heatPump,q=finite(s?.heatPumpColdRemovalKW,point.heatPumpColdRemovalKW),w=finite(s?.servedHeatPumpKW,point.heatPumpInputKW),hot=q+w;
  b=txt(28,32,'Active heat lift · cold and hot sides','title')+txt(28,58,'Cooling COP is an explicit allocation. Compressor work reaches both electrical and thermal accounts.','small');
  b+=box(28,98,220,104,'Cold equipment store',[fmt(q,2)+(s?' kW removed':' kW demand'),fmt(point.loopK,1)+' K modeled cold side',fmt(hp.coldK,1)+' K control target']);
  b+=box(290,98,220,104,'Allocated heat pump',['COP '+fmt(hp.cop,2)+' cold/electric',fmt(w,2)+' kW compressor input',fmt(hp.coldCapacityKW,1)+' kW cold capacity']);
  b+=box(560,98,212,104,'Hot-side radiator',[fmt(hot,2)+(s?' kW rejected':' kW demand'),fmt(rad,1)+' K panel temperature',fmt(hp.hotK,1)+' K design target']);
  b+=path(id,'M248 151H287','#91bac9')+path(id,'M510 151H557','#e0b69a');
  b+=box(290,279,220,101,'Primary-bus motor drive',[fmt(a.electrical.heatPumpDrive.capacityKW,1)+' kW drive output','Drive and supply losses in EPS','Bounded by available bus power']);
  b+=path(id,'M400 277V205','#d6c69a');
  b+=txt(28,420,'Hot rejection = cold removal + electrical work: '+fmt(q,2)+' + '+fmt(w,2)+' = '+fmt(hot,2)+' kW','label');
  b+=txt(28,450,'Design Carnot cooling ceiling '+fmt(hp.carnotCOP,2)+' · '+(hp.valid?'necessary thermodynamic condition met':'thermodynamic allocation invalid'),'small');
  b+=txt(28,478,'Refrigerant, pressure, seals, materials, electronics temperatures and startup evidence remain open.','small')+txt(28,501,'No ammonia hydraulic correlation or qualified high-temperature hardware is inherited.','small');
  return canvas(id,'Active heat pump energy and temperature paths','Cold equipment heat is removed by a bounded heat pump. A separate primary-bus motor drive supplies compressor work. The hot radiator receives cold-side heat plus that work. Allocated COP and cold capacity, temperatures and unverified material conditions are shown.',b,526);
 }
 const loop=t.loops[0];
 b=txt(28,32,'Independent liquid cooling loops','title')+txt(28,58,'Published redundant-loop concept; the two half-duty circuits below are a project realization.','small');
 b+=box(250,88,300,85,'Payload cold-plate partitions',[fmt(t.designHeatKW,1)+' kW installed heat','Each loop serves its own allocated fraction']);
 for(let i=0;i<t.loops.length;i++){
  const x=28+i*402,one=t.loops[i],center=x+171;
  b+=box(x,229,342,104,'Loop '+(i+1)+' · contained fluid circuit',[fmt(one.designHeatKW,1)+' kW assigned heat',one.pump.id+' · 1 duty + 1 standby pump',one.accumulator.count+' expansion module(s) · isolated headers']);
  b+=box(x,394,342,85,'Radiator '+(i+1)+' · separate loop',[fmt(h.radiatorM2/t.loopCount,1)+' m² planform',fmt(one.nominalFlowKgS,3)+' kg/s · '+fmt(one.pumpNominalKW,3)+' kW pump']);
  b+=path(id,'M400 173V199H'+center+'V226','#e0b69a')+path(id,'M'+center+' 333V391','#e0b69a');
 }
 b+=txt(28,524,t.pumpsInstalled+' installed pumps / '+t.pumpsOperating+' operating · no common fluid header or accumulator','label')+txt(28,551,'Loss of one circuit loses its heat-removal allocation; full-load one-fault tolerance is not asserted.','small')+txt(28,574,'Ammonia and hydraulic envelopes are project choices. Fluid, isolation and hardware qualification remain open.','small');
 return canvas(id,'Independent redundant-loop realization','Two separately contained liquid circuits each have their own headers, expansion module, duty and standby pump, payload cold-plate partition and radiator. They share no fluid header. Losing one loop loses its allocated capacity; full-load fault tolerance is not claimed.',b,598);
}
export function renderThermalPath(h,s=null){
 const a=selected(h),t=a.thermal;if(t.kind&&t.kind!=='pumped')return renderSpecialThermalPath(h,s,a);
 const id='odc-thermal-path',rad=finite(s?.radiatorK,t.fluid.referenceK),loop=finite(s?.loopK,finite(s?.coolantK,rad+t.designHeatKW/Math.max(.001,t.nominalConductanceKWK))),it=h.input?.thermalMode==='applied'?positive(h.input.appliedHeatKw):finite(s?.itKW,a.electrical.installedElectronicsKW),flow=s?positive(s.coolantKgPerSec,positive(s.coolantFlowKgS)):t.nominalFlowKgS,ladder=energyTemperatureLadder(h,{itKW:it,heatKW:finite(s?.heatInputKW,t.designHeatKW),loopK:loop,radiatorK:rad,pumpEnabled:flow>0,flowKgS:flow});
 let b=txt(28,32,'Two radiator branches · selected liquid heat path','title')+txt(28,58,s?'Pressurized NH₃ · selected modeled instant · shared duty/standby pump station':'Pressurized NH₃ · 300 K panel reference case · shared duty/standby pump station','small');
 b+=box(28,90,220,94,'Compute / cold plates',[fmt(ladder.junctionK,1)+' K junction',fmt(ladder.coldPlateK,1)+' K cold plate']);
 b+=box(290,90,220,94,'Common loop / accumulator',[fmt(loop,1)+' K mean fluid',fmt(flow,3)+' kg/s · 2.0 MPa',t.accumulator.count+' × '+fmt(t.accumulator.unitL,0)+' L expansion']);
 b+=box(560,90,212,94,'Duty / standby pumps',[t.pump.id+' · '+(flow>0?'1':'0')+' of 2 on',fmt(t.nominal.totalPa/1000,1)+' kPa at nominal flow']);
 b+=path(id,'M248 137H287','#e0b69a')+path(id,'M510 137H557','#e0b69a');
 b+=box(290,245,220,94,'Upper radiator branch',[fmt(h.radiatorM2/2,1)+' m² planform',fmt(t.layout.branchBoreM*1000,0)+' mm supply / return bore',t.layout.radiatorSectionsPerBank+' parallel panel-pair sections']);
 b+=box(560,245,212,94,'Lower radiator branch',[fmt(h.radiatorM2/2,1)+' m² planform',fmt(t.layout.radiatorTubeBoreM*1000,0)+' mm parallel panel tubes']);
 b+=path(id,'M666 184V216H400V242','#e0b69a')+path(id,'M666 216V242','#e0b69a');
 b+=path(id,'M400 339V363H265V195H138V187')+path(id,'M666 339V363H400');
 b+=path(id,'M560 158H536V215H265V159H251','#d6c69a');
 b+=txt(292,208,'Three-way bypass / mixing','small')+txt(28,245,'Node separation','label')+txt(28,272,'Loop: internal equipment + fluid','small')+txt(28,294,'Radiator: metal + panel fluid','small')+txt(28,316,'Equal / opposite heat transfer','small');
 b+=box(28,410,220,102,'Cold-control authority',[fmt(a.coldControl.batteryHeaterKW,2)+' kW pack heaters',fmt(a.coldControl.loopHeaterKW,2)+' kW loop startup heaters',fmt(a.coldControl.radiatorHeaterKW,2)+' kW panel freeze heaters']);
 b+=box(290,410,220,102,'Hydraulic operating point',[fmt(t.requiredFlowKgS,3)+' kg/s required',fmt(t.maximumFlowKgS,3)+' kg/s at full-speed curve',fmt(t.pumpNominalKW,3)+' kW pump electrical']);
 b+=box(560,410,212,102,'Loop → radiator interface',[fmt(t.nominalConductanceKWK,2)+' kW/K',fmt(t.fluidKg,1)+' kg contained NH₃',fmt(t.loopHardwareKg,1)+' kg complete loop']);
 b+=txt(28,546,'Radiator bypass changes thermal coupling; physical radiation and environmental absorption stay on the panels.','small')+txt(28,568,'Common headers are shared dependencies. Fluid properties, pump curve, joints and material compatibility need verification.','small');
 return canvas(id,'Thermal transport, branch hydraulics and cold-control architecture','Compute cold plates feed a pressurized ammonia loop with an accumulator and one operating pump. Two radiator branches and a bypass path are shown separately. Battery, loop and radiator heater capacities are displayed with pressure loss, flow, thermal conductance and fluid inventory.',b,590);
}
