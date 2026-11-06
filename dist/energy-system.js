// ODC preliminary energy interfaces. Hardware selection depends only on the
// installed vehicle. Mission conditions assess that hardware without resizing it.
// All module, material, loss and pump allocations below are controlled project
// design estimates. Reference heritage does not qualify the installed assembly.
export const energySystemRevision='ODC-ENERGY-001 Rev A';
export const energyControls=[{key:'powerArchitecture',label:'Electrical architecture',group:'Installed hardware',options:{reference120:'120 V MPPT · reference family',highPower400:'400 V MPPT · development family'},value:'reference120'}];
export const energySources=Object.freeze([
 {id:'crisa-ghps',title:'Airbus Crisa · GHPS 120 V power system',url:'https://www.crisa.airbus.com/sites/g/files/jlcbta176/files/2024-10/V3.%200278_24_18_GHPS%20Unit_Datasheet_4-.Airbus%20Crisa.pdf',basis:'120/28 V distribution, modular 3 kW conversion and a 30 kW unit example. ODC module mass, 48 V payload output, channel count and the 400 V development class are project allocations.'},
 {id:'crisa-mppt',title:'Airbus Crisa · PCDU architectures',url:'https://www.crisa.airbus.com/en/airbus-crisas-solutions/power-electronics/power-management-and-distribution-pcdus',basis:'DET and MPPT are distinct available architectures. ODC selects MPPT for variable illumination and independently tracked wings; no supplier contract or qualification is implied.'},
 {id:'iss-atcs',title:'NASA · ISS active thermal control overview',url:'https://www.nasa.gov/pdf/473486main_iss_atcs_overview.pdf',basis:'Ammonia circulation, cold plates, expansion accumulators, radiator bypass mixing and heaters provide an architecture precedent. ODC has a common pump station and two branches, not the ISS independent-loop redundancy.'},
 {id:'nist-ammonia',title:'NIST Chemistry WebBook · ammonia phase properties',url:'https://webbook.nist.gov/cgi/cbook.cgi?ID=C7664417&Mask=4',basis:'Fusion temperature 194.95 K and published Antoine vapor-pressure coefficients. Constant density, heat capacity and viscosity used for hydraulic sizing remain explicit project estimates requiring a temperature-dependent property correlation.'}
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
 const branchFlow=massFlowKgS/2;
 const header=pipeDrop(massFlowKgS,layout.headerBoreM,layout.headerLengthM,8);
 const branch=pipeDrop(branchFlow,layout.branchBoreM,layout.branchLineLengthM,12);
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
function thermalDesign(h,family,heatKW){
 const d=h.input||{},l=positive(h.bodyLengthM,5),w=positive(h.bodyWidthM,2),radLength=positive(h.radiatorLengthM,5),radWidth=positive(h.radiatorWidthM,2),radArea=positive(h.radiatorM2,d.radiatorM2||0),trays=Math.max(1,Math.ceil(h.trays||d.trayCount||1));
 const designDeltaK=8,requiredFlowKgS=heatKW*1000/(fluid.heatCapacityJkgK*designDeltaK);
 const desiredBore=Math.sqrt(4*(requiredFlowKgS/2)/(fluid.densityKgM3*1.5*Math.PI));
 const bores=[.010,.014,.018,.022,.028,.035,.042,.052,.065].filter(x=>x<=family.maxBranchBoreM);
 const branchBoreM=choose(desiredBore,bores),headerBoreM=choose(branchBoreM*Math.sqrt(2),[.014,.020,.026,.032,.040,.050,.062,.076,.092]);
 const layout={branchBoreM,headerBoreM,branchLineLengthM:2*(.55*l+.5*w+1.2),headerLengthM:l+2,radiatorTubeBoreM:.008,radiatorPathLengthM:2*radLength+.25,radiatorParallelPaths:Math.max(2,Math.floor(radWidth/.16)),coldPlatePathsPerBranch:Math.max(1,Math.ceil(trays*Math.max(1,Math.ceil(positive(d.trayKw,2)/2.5))/2)),minorLossBasis:'K=8 common headers; K=12 each branch including valves/flexible and rotary interfaces; K=4 each radiator U-path. Cold-plate allocation: 15 kPa at 0.08 kg/s per parallel passage.'};
 const atRequired=hydraulicPath(layout,requiredFlowKgS),availablePumps=pumpCatalogue.slice(0,family.maxPumpIndex+1);
 const pump=availablePumps.find(p=>requiredFlowKgS/fluid.densityKgM3<p.freeFlowM3S&&p.shutoffPa*(1-(requiredFlowKgS/fluid.densityKgM3/p.freeFlowM3S)**2)>=atRequired.totalPa)||availablePumps.at(-1);
 const maximumFlowKgS=solvePumpOperatingPoint(layout,pump),nominalFlowKgS=Math.min(requiredFlowKgS,maximumFlowKgS),nominal=hydraulicPath(layout,nominalFlowKgS),efficiency=.45;
 const speedFraction=Math.sqrt(nominal.totalPa/pump.shutoffPa+(nominalFlowKgS/fluid.densityKgM3/pump.freeFlowM3S)**2);
 const pumpNominalKW=.020+nominal.totalPa*nominalFlowKgS/(fluid.densityKgM3*efficiency*1000);
 const headerVolumeM3=area(headerBoreM)*layout.headerLengthM,branchVolumeM3=2*area(branchBoreM)*layout.branchLineLengthM;
 const radiatorVolumeM3=2*layout.radiatorParallelPaths*layout.radiatorPathLengthM*area(layout.radiatorTubeBoreM),coldPlateVolumeM3=trays*.00020,filledVolumeM3=headerVolumeM3+branchVolumeM3+radiatorVolumeM3+coldPlateVolumeM3;
 const requestedAccumulatorL=filledVolumeM3*1000*.12,accumulatorL=Math.min(family.maxAccumulatorL,choose(requestedAccumulatorL,[3,6,12,24,48]));
 const radiatorFluidKg=radiatorVolumeM3*fluid.densityKgM3,loopFluidKg=(headerVolumeM3+branchVolumeM3+coldPlateVolumeM3+accumulatorL/2000)*fluid.densityKgM3;
 const pipeWallM=.001,metalDensity=8000;
 const lineMetalKg=metalDensity*((area(headerBoreM+2*pipeWallM)-area(headerBoreM))*layout.headerLengthM+2*(area(branchBoreM+2*pipeWallM)-area(branchBoreM))*layout.branchLineLengthM);
 const fittingsKg=2*4+6*.8+2.0,accumulatorKg=2.0+accumulatorL*.45,pumpMassKg=2*pump.unitKg;
 const loopHardwareKg=lineMetalKg+fittingsKg+accumulatorKg+pumpMassKg+loopFluidKg+radiatorFluidKg;
 const re=nominal.radiator.reynolds,pr=fluid.heatCapacityJkgK*fluid.viscosityPaS/fluid.conductivityWmK;
 const nu=re<2300?3.66:.023*Math.max(re,2300)**.8*pr**.4;
 const fluidFilmKWK=nu*fluid.conductivityWmK/layout.radiatorTubeBoreM*(Math.PI*layout.radiatorTubeBoreM*layout.radiatorPathLengthM*layout.radiatorParallelPaths*2)/1000;
 const tubeBondKWK=Math.max(.02,radArea*.15),nominalConductanceKWK=1/(1/Math.max(.001,fluidFilmKWK)+1/tubeBondKWK);
 return {topology:'One common pump station; two isolatable parallel radiator branches',branches:2,pumpsInstalled:2,pumpsOperating:1,redundancy:'Duty/cold-standby pumps share the accumulator and headers. Two banks are not independent redundant loops.',fluid:{...fluid},designHeatKW:heatKW,designDeltaK,requiredFlowKgS,nominalFlowKgS,maximumFlowKgS,hydraulicHeatCapacityKW:maximumFlowKgS*fluid.heatCapacityJkgK*designDeltaK/1000,pumpNominalKW,pump:{...pump,efficiency,speedFraction,headAtRequiredPa:Math.max(0,pump.shutoffPa*(1-(requiredFlowKgS/fluid.densityKgM3/pump.freeFlowM3S)**2)),operatingHeadPa:nominal.totalPa,basis:'Project pump-envelope allocation, not a selected supplier curve. Variable speed matches the calculated system pressure loss; maximum speed defines capacity.'},layout,atRequired,nominal,accumulator:{installedL:accumulatorL,requiredL:requestedAccumulatorL,basis:'12% of line/panel/cold-plate volume is reserved for thermal expansion. Bellows volume, pressure cycle and gas preload require detailed verification.'},fluidKg:loopFluidKg+radiatorFluidKg,radiatorFluidKg,loopFluidKg,lineMetalKg,loopHardwareKg,loopHardwareCapacityKJK:loopFluidKg*fluid.heatCapacityJkgK/1000+lineMetalKg*.50+(fittingsKg+accumulatorKg+pumpMassKg)*.60,radiatorCapacityKJK:radArea*positive(d.radKgM2,3.6)*.90+radiatorFluidKg*fluid.heatCapacityJkgK/1000,nominalConductanceKWK,fluidFilmKWK,tubeBondKWK,coldPlateResistanceKPerKWPerTray:.70,junctionToColdPlateKPerKWPerTray:positive(d.thermalResistanceKPerKw,4),metalBasis:'1 mm stainless header/branch walls. Radiator tube metal is already inside the selected radiator areal mass; cold-plate metal is already inside tray mass. Only fluid inventory is added here.',limits:{velocityMS:2.5,pressurePa:fluid.designPressurePa,nominalCoolantMinK:260,nominalCoolantMaxK:315},evidenceStatus:'open'};
}

function electricalDesign(h,family,coldControl,thermal,installedElectronicsKW,nonPayloadKW,bolArrayKW){
 const d=h.input||{},trays=Math.max(1,Math.ceil(h.trays||d.trayCount||1)),l=positive(h.bodyLengthM,5),w=positive(h.bodyWidthM,2),b=positive(h.bodyHeightM,2),wingLength=positive(h.wingLengthM,8),batteryKWh=positive(h.batteryKWh,d.batteryKWh||0);
 const mpptRequiredPerWing=Math.max(1,Math.ceil(bolArrayKW/4/family.moduleKW)),mpptPerWing=Math.min(family.maxMpptPerWing,mpptRequiredPerWing),mpptCount=4*mpptPerWing,sourceCircuitA=family.moduleKW*1000/family.sourceMinV;
 const arrayHarness=wire(.60*wingLength+.50*l+w/2,sourceCircuitA,family.sourceMinV,mpptCount,35);
 const payloadFeedsPerTray=Math.min(16,Math.max(1,Math.ceil(installedElectronicsKW/trays/(48*50/1000))));
 const payloadHarness=wire(.25*l+.6,installedElectronicsKW*1000/(trays*payloadFeedsPerTray*48),48,trays*payloadFeedsPerTray,70);
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
 const loadInputsKW=peakPayloadBranchKW/.96+peakServiceBranchKW/.94;
 let feedCount=Math.min(family.maxFeeds,Math.max(1,Math.ceil(loadInputsKW/(family.primaryV*family.feedRatingA/1000)))),batteryModules=Math.min(family.maxLoadModules,Math.max(1,Math.ceil(loadInputsKW/family.moduleKW))),primaryHarness,quiescentKW,peakBusDemandKW;
 // Bounded discrete choices, including current lost to quiescent and harness
 // loads. No mission variable participates in these hardware selections.
 for(let i=0;i<8;i++){
  primaryHarness=wire(.60*l+1,family.feedRatingA,family.primaryV,feedCount,120);
  quiescentKW=.020+.001*(mpptCount+payloadModules+batteryModules+serviceModules);
  const primaryPowerKW=loadInputsKW+quiescentKW;
  peakBusDemandKW=primaryPowerKW+wireLossKW(primaryHarness,primaryPowerKW,family.primaryV);
  const nextFeeds=Math.min(family.maxFeeds,Math.max(feedCount,Math.ceil(peakBusDemandKW/(family.primaryV*family.feedRatingA/1000)))),nextBattery=Math.min(family.maxLoadModules,Math.max(batteryModules,Math.ceil(peakBusDemandKW/family.moduleKW)));
  if(nextFeeds===feedCount&&nextBattery===batteryModules)break;
  feedCount=nextFeeds;batteryModules=nextBattery;
 }
 const batteryCapacityKW=batteryModules*family.moduleKW;
 const peakConversionLossKW=loadInputsKW-peakPayloadBranchKW-peakServiceBranchKW+quiescentKW;
 const peakHarnessLossKW=(peakPayloadBranchKW-installedElectronicsKW)+(peakServiceBranchKW-peakServiceKW)+(peakBusDemandKW-loadInputsKW-quiescentKW);
 const busbarRequiredA=Math.max(mpptCount*family.moduleKW*.96,peakBusDemandKW,batteryCapacityKW)*1000/family.primaryV;
 const busbarRatingA=choose(busbarRequiredA,family.primaryV===120?[300,600,900,1200,1600]:[300,600,1200,1800,2400]),busbarLengthM=.50*w+.5,busbarAreaMM2=busbarRatingA/3;
 const busbarKg=2*busbarLengthM*busbarAreaMM2*1e-6*copperDensity*1.25;
 const electrical={family:{...family},controller:'MPPT per parallel source channel; regulated main bus',source:{seriesCells:family.seriesCells,cellMppAssumptionV:2.4,nominalMppV:family.sourceV,minMppV:family.sourceMinV,maxMppV:family.sourceMaxV,maxOpenCircuitV:family.openCircuitLimitV,strings:'Series cells per string; parallel strings grouped into independently protected MPPT channels on each of four wings.',stringEvidence:'Cell IV/temperature curves, string parallel count and cold open-circuit voltage require the selected flight cell and insulation design.'},installedElectronicsKW,bolArrayKW,mppt:{perWing:mpptPerWing,count:mpptCount,requiredPerWing:mpptRequiredPerWing,moduleInputKW:family.moduleKW,inputCapacityKW:mpptCount*family.moduleKW,efficiency:.96,jointCircuitsPerWing:mpptPerWing,jointCircuitRatingA:sourceCircuitA,nominalWingCurrentA:bolArrayKW*1000/(4*family.sourceV),maximumWingCurrentA:mpptPerWing*sourceCircuitA},payload:{voltageV:48,moduleOutputKW:family.moduleKW,modules:payloadModules,requiredModules:neededPayloadModules,capacityKW:payloadModules*family.moduleKW,efficiency:.96,feedsPerTray:payloadFeedsPerTray,feedRatingA:50},service:{voltageV:28,modules:serviceModules,requiredModules:neededServiceModules,capacityKW:serviceModules,efficiency:.94},battery:{modules:batteryModules,moduleKW:family.moduleKW,chargeBusLimitKW:Math.min(batteryCapacityKW,batteryKWh*positive(d.chargeC,1)),dischargeBusLimitKW:Math.min(batteryCapacityKW,batteryKWh*positive(d.dischargeC,2)),basis:'Installed bidirectional-converter rating caps the existing pack C-rate. Existing chargeEff/dischargeEff include the battery conversion path; no second battery efficiency is multiplied.'},distribution:{feeds:feedCount,feedRatingA:family.feedRatingA,capacityKW:feedCount*family.primaryV*family.feedRatingA/1000,nominalBusV:family.primaryV,voltageDropLimitFraction:.02,protection:'Each source and battery path has isolation/contactors. Payload feeds use current-limited switches; the flight 28 V rail is isolated from payload load shedding. Grounding, arcing/EMC and fault coordination require verification.'},harness:{array:arrayHarness,primary:primaryHarness,payload:payloadHarness,service:serviceHarness,allowableCurrentDensityAMM2:3,conductor:'Copper; 2.10e-8 ohm·m at the selected hot-wire estimate',massBasis:'Two conductors per feed, actual one-way routing length, 40% insulation/attachment addition and 0.35 kg termination allocation per feed; no duplicate array cell interconnect or compute-board wiring.'},quiescentKW,peakServiceKW,peakServiceBranchKW,peakPayloadBranchKW,peakEndpointKW:installedElectronicsKW+peakServiceKW,peakBusDemandKW,evidenceStatus:'open'};
 Object.assign(electrical,{peakConversionLossKW,peakHarnessLossKW});
 Object.assign(electrical.distribution,{busbarRatingA,busbarRequiredA,busbarCapacityKW:busbarRatingA*family.primaryV/1000,busbarAreaMM2,busbarLengthM,busbarBasis:'Two internal copper conductors at 3 A/mm² with 25% mounting/insulation mass. Rating covers source, discharge and load cases; charging and discharging are mutually exclusive. Protected load feeders and the separate battery branch retain their own limits.'});
 const signalHarnessKg=8+.04*2*(w*b+l*(w+b)),harnessKg=arrayHarness.massKg+primaryHarness.massKg+payloadHarness.massKg+serviceHarness.massKg+signalHarnessKg;
 const pcduKg=8+feedCount*1.4+busbarKg,mpptKg=mpptCount*(family.moduleKW===3?2.2:5.5),payloadConvertersKg=payloadModules*(family.moduleKW===3?2.4:6.0),batteryConvertersKg=batteryModules*(family.moduleKW===3?3.0:7.2),serviceConvertersKg=serviceModules*1.6;
 const masses={pcduKg,busbarKg,mpptKg,payloadConvertersKg,batteryConvertersKg,serviceConvertersKg,electricalKg:pcduKg+mpptKg+payloadConvertersKg+batteryConvertersKg+serviceConvertersKg,powerHarnessKg:harnessKg-signalHarnessKg,signalHarnessKg,harnessKg,loopKg:thermal.loopHardwareKg,coldControlKg:coldControl.massKg};
 return {electrical,masses};
}
export function deriveEnergySystem(h){
 const d=h.input||{},family=energyFamilies[d.powerArchitecture]||energyFamilies.reference120;
 const installedElectronicsKW=positive(h.installedElectronicsKw,positive(h.acceleratorKw,positive(d.trayCount,1)*positive(d.trayKw,2))),storageKW=positive(h.storageKw);
 const pvArea=positive(h.solarM2,d.solarM2||0),batteryKWh=positive(h.batteryKWh,d.batteryKWh||0),radArea=positive(h.radiatorM2,d.radiatorM2||0),l=positive(h.bodyLengthM,5);
 const batteryMassKg=batteryKWh*1000/positive(d.packWhKg,160),switchKW=positive(h.platformInterfaceKW,.09);
 const nonPayloadKW=.42+switchKW+storageKW+positive(h.cmg?.maneuverW,320)/1000+.12+.06+.299+.15;
 const batteryHeaterKW=Math.min(family.heaterCapKW,Math.max(.08,batteryMassKg*.001)),loopHeaterKW=Math.min(family.heaterCapKW,Math.max(.10,radArea*.005)),radiatorHeaterKW=Math.min(family.heaterCapKW,Math.max(.06,radArea*.002+l*.010));
 const coldControl={scheme:'Battery thermostatic heaters, loop bypass mixing and radiator freeze-protection heaters',batteryHeaterKW,loopHeaterKW,radiatorHeaterKW,totalHeaterKW:batteryHeaterKW+loopHeaterKW+radiatorHeaterKW,controlKW:.018,batteryFullBelowK:273,batteryOffAboveK:279,loopFullBelowK:263,loopOffAboveK:273,radiatorFullBelowK:210,radiatorOffAboveK:218,mixTargetK:285,mixBandK:8,massKg:2.4+1.2*(batteryHeaterKW+loopHeaterKW+radiatorHeaterKW),basis:'Project heater and mixing set points; six-kelvin battery modulation band approximates thermostatic/PWM control. Heater power is finite. Powered load is charged to EPS and deposited at the receiving thermal node.'};
 const bolArrayKW=pvArea*1361*positive(d.pvEfficiency,.30)*positive(d.solarDelivery,.86)/1000;
 let heatKW=(installedElectronicsKW+nonPayloadKW)/.94+Math.min(bolArrayKW,4*family.maxMpptPerWing*family.moduleKW)*.04,thermal,out,calculatedHotHeatKW=heatKW;
 const candidates=[];
 // Electrical loss and pump power are coupled. Eight bounded passes converge
 // the selected design point; a discrete-selection oscillation retains the
 // larger encountered heat requirement rather than creating extra hardware.
 for(let i=0;i<8;i++){
  thermal=thermalDesign(h,family,heatKW);
  out={schema:'odc-energy-system/1',revision:energySystemRevision,selectionBasis:'powerArchitecture is an installed-hardware choice. Module and pipe choices depend on installed capacity and geometry only. Counts stop at the selected family limits; excessive demand is reported.',...electricalDesign(h,family,coldControl,thermal,installedElectronicsKW,nonPayloadKW,bolArrayKW),thermal,coldControl};
  const installed={...h,energySystem:out},rt=energyRuntime(installed,{loadKW:installedElectronicsKW+nonPayloadKW,itKW:installedElectronicsKW,batteryK:294,loopK:305,radiatorK:300}),sun=energySolarDelivery(installed,bolArrayKW);
  calculatedHotHeatKW=rt.busLoadKW+sun.mpptLossKW;candidates.push(calculatedHotHeatKW);
  if(Math.abs(calculatedHotHeatKW-heatKW)<1e-7)break;
  heatKW=i===6?Math.max(...candidates):calculatedHotHeatKW;
 }
 thermal.calculatedHotHeatKW=calculatedHotHeatKW;thermal.couplingResidualKW=thermal.designHeatKW-calculatedHotHeatKW;
 out.sources=energySources;
 out.assumptions=[{id:'E-01',basis:'Project preliminary allocation',text:'Conversion modules, mass estimates, harness current density and pump curves are design estimates; supplier selection and temperature/life verification remain open.'},{id:'E-02',basis:'Selected flight-hardware interface',text:'120 V has public spacecraft precedent. The 400 V class requires dedicated insulation, plasma/arcing, EMC and equipment compatibility development.'},{id:'E-03',basis:'Installed load boundary',text:'Converter and primary ratings include downstream harness losses and simultaneous heater authority. The hydraulic hot case includes installed active equipment, pump and MPPT losses; thermostat heaters are off in that hot case.'},{id:'T-01',basis:'Thermal transport model',text:'Darcy–Weisbach / minor losses, parallel cold plates, radiator tubes, pump curve and a two-node fluid/radiator heat exchange replace an unrestricted kW scaling law.'},{id:'T-02',basis:'Constant-property calculation',text:fluid.propertyBasis}];
 out.checks=energyDesignChecks({...h,energySystem:out});
 out.applicability=out.checks.some(x=>x.status==='shortfall')?'outside_design_envelope':'within_preliminary_envelope';
 return out;
}

const selected=h=>h.energySystem||deriveEnergySystem(h);
export function energySolarDelivery(h,inputKW){
 const e=selected(h).electrical,input=positive(inputKW),accepted=Math.min(input,e.mppt.inputCapacityKW);
 const arrayHarnessLossKW=Math.min(accepted,wireLossKW(e.harness.array,accepted,e.family.sourceV)),atConverters=Math.max(0,accepted-arrayHarnessLossKW),mpptLossKW=atConverters*(1-e.mppt.efficiency);
 return {inputKW:input,inputAcceptedKW:accepted,busKW:atConverters-mpptLossKW,arrayHarnessLossKW,mpptLossKW,lossKW:arrayHarnessLossKW+mpptLossKW,curtailedKW:Math.max(0,input-accepted),capacityKW:e.mppt.inputCapacityKW};
}
export function energyRuntime(h,{loadKW=0,itKW=0,batteryK=294,loopK,coreK,radiatorK=294,pumpEnabled=true,powered=true,serviceFraction=1}={}){
 const a=selected(h),e=a.electrical,t=a.thermal,c=a.coldControl,loop=finite(loopK,finite(coreK,294));
 if(!powered)return {busLoadKW:0,conversionLossKW:0,harnessLossKW:0,pumpKW:0,batteryHeaterKW:0,loopHeaterKW:0,radiatorHeaterKW:0,heaterKW:0,controlKW:0,radiatorCouplingFraction:0,bypassFraction:1,loopToRadiatorConductanceKWK:0,coolantFlowKgS:0,primaryCurrentA:0,primaryDropFraction:0,primaryPowerKW:0,endpointServiceKW:0,payloadBranchOutputKW:0,serviceBranchOutputKW:0,payloadDemandKW:0,serviceDemandKW:0,serviceFraction:0,pumpFullyServed:false,payloadCapacityKW:e.payload.capacityKW,serviceCapacityKW:e.service.capacityKW,primaryCapacityKW:e.distribution.capacityKW};
 const served=clip(finite(serviceFraction,1),0,1),pumpFullyServed=pumpEnabled&&served>=1-1e-9;
 const pumpKW=(pumpEnabled?t.pumpNominalKW:0)*served;
 const batteryHeaterKW=c.batteryHeaterKW*clip((c.batteryOffAboveK-batteryK)/(c.batteryOffAboveK-c.batteryFullBelowK),0,1)*served;
 const loopHeaterKW=c.loopHeaterKW*clip((c.loopOffAboveK-loop)/(c.loopOffAboveK-c.loopFullBelowK),0,1)*served;
 const radiatorHeaterKW=c.radiatorHeaterKW*clip((c.radiatorOffAboveK-radiatorK)/(c.radiatorOffAboveK-c.radiatorFullBelowK),0,1)*served;
 const heaterKW=batteryHeaterKW+loopHeaterKW+radiatorHeaterKW,controlKW=c.controlKW*served;
 const payload=Math.min(positive(itKW),positive(loadKW)),endpointServiceKW=Math.max(0,positive(loadKW)-payload)*served,service=endpointServiceKW+pumpKW+heaterKW+controlKW;
 const payloadHarnessLoss=wireLossKW(e.harness.payload,payload,e.payload.voltageV),serviceHarnessLoss=wireLossKW(e.harness.service,service,e.service.voltageV);
 const payloadInput=(payload+payloadHarnessLoss)/e.payload.efficiency,serviceInput=(service+serviceHarnessLoss)/e.service.efficiency;
 const conversionLossKW=payloadInput-payload-payloadHarnessLoss+serviceInput-service-serviceHarnessLoss+e.quiescentKW;
 const primaryPower=payloadInput+serviceInput+e.quiescentKW,primaryHarnessLoss=wireLossKW(e.harness.primary,primaryPower,e.family.primaryV);
 const harnessLossKW=payloadHarnessLoss+serviceHarnessLoss+primaryHarnessLoss,busLoadKW=payload+service+conversionLossKW+harnessLossKW;
 // Mixing controls the thermal conductance. It never changes physical emitted
 // area, optical properties or environmental absorption of the radiator.
 const mixing=clip((loop-(c.mixTargetK-c.mixBandK/2))/c.mixBandK,0,1);
 const radiatorCouplingFraction=pumpFullyServed?mixing:0;
 return {busLoadKW,conversionLossKW,harnessLossKW,pumpKW,batteryHeaterKW,loopHeaterKW,radiatorHeaterKW,heaterKW,controlKW,serviceFraction:served,pumpFullyServed,endpointServiceKW,payloadBranchOutputKW:payload+payloadHarnessLoss,serviceBranchOutputKW:service+serviceHarnessLoss,primaryPowerKW:primaryPower,radiatorCouplingFraction,bypassFraction:1-radiatorCouplingFraction,loopToRadiatorConductanceKWK:t.nominalConductanceKWK*radiatorCouplingFraction,coolantFlowKgS:pumpFullyServed?t.nominalFlowKgS:0,primaryCurrentA:busLoadKW*1000/e.family.primaryV,primaryDropFraction:primaryPower*1000/(e.family.primaryV*e.harness.primary.count)*e.harness.primary.resistanceOhm/e.family.primaryV,payloadCapacityKW:e.payload.capacityKW,serviceCapacityKW:e.service.capacityKW,primaryCapacityKW:e.distribution.capacityKW,payloadDemandKW:payload,serviceDemandKW:service};
}
export function energyTemperatureLadder(h,{itKW=0,heatKW,loopK=294,radiatorK=294,pumpEnabled=true,flowKgS}={}){
 const a=selected(h),t=a.thermal,trays=Math.max(1,h.trays||h.input?.trayCount||1),flow=pumpEnabled?positive(flowKgS,t.nominalFlowKgS):0,heat=positive(heatKW,positive(itKW));
 const rise=flow>0?heat*1000/(flow*t.fluid.heatCapacityJkgK):0,contact=positive(itKW)/trays*t.coldPlateResistanceKPerKWPerTray,junctionRise=positive(itKW)/trays*t.junctionToColdPlateKPerKWPerTray;
 const coolantSupplyK=loopK-rise/2,coolantReturnK=loopK+rise/2,coldPlateK=coolantReturnK+contact,junctionK=coldPlateK+junctionRise;
 const saturationPa=ammoniaVaporPressurePa(coolantReturnK);
 return {radiatorK,loopK,coolantSupplyK,coolantReturnK,coolantK:coolantReturnK,coldPlateK,junctionK,fluidRiseK:rise,transportRiseK:junctionK-radiatorK,junctionRiseK:junctionRise,coldPlateRiseK:contact,transportValid:flow>0||heat===0,vaporPressurePa:saturationPa,liquidPressureMarginPa:saturationPa==null?null:t.fluid.inletPressurePa-saturationPa,freezeSeparationK:Math.min(coolantSupplyK,radiatorK)-t.fluid.freezeK,propertyInRange:Math.min(coolantSupplyK,coolantReturnK)>=t.fluid.propertyMinK&&Math.max(coolantSupplyK,coolantReturnK)<=t.fluid.propertyMaxK};
}
export function energyDesignChecks(h){
 const a=selected(h),e=a.electrical,t=a.thermal;
 const row=(id,label,actual,required,unit,operator,basis)=>({id,label,actual:Number.isFinite(actual)?actual:null,required:Number.isFinite(required)?required:null,unit,operator,status:!Number.isFinite(actual)||!Number.isFinite(required)?'unassessed':(operator==='≤'?actual<=required:actual>=required)?'meets':'shortfall',basis,evidence:'Project preliminary interface calculation; component qualification and acceptance remain open.'});
 return [
  row('energy-family','Installed electronics within selected voltage family',e.installedElectronicsKW,e.family.maxElectronicsKW,'kW','≤','Controlled applicability bound; selecting a different mission never changes the hardware family.'),
  row('energy-mppt','MPPT channels cover BOL array output',e.mppt.inputCapacityKW,e.bolArrayKW,'kW input','≥','Installed module and rotary-circuit limits cap bus delivery; excess array output is curtailed.'),
  row('energy-payload','48 V payload conversion capacity',e.payload.capacityKW,e.peakPayloadBranchKW,'kW output','≥','Installed module output ratings include downstream payload harness loss; no unbounded module count.'),
  row('energy-service','28 V service and cold-control capacity',e.service.capacityKW,e.peakServiceBranchKW,'kW output','≥','Simultaneous service, installed heaters and downstream service harness loss.'),
  row('energy-distribution','Primary distribution rating',e.distribution.capacityKW,e.peakBusDemandKW,'kW','≥','Parallel protected feeds at the selected primary voltage.'),
  row('energy-busbar','Internal main-bus current rating',e.distribution.busbarRatingA,e.distribution.busbarRequiredA,'A','≥',e.distribution.busbarBasis),
  row('energy-harness','Primary harness drop at allocated demand',e.peakBusDemandKW*1000/(e.family.primaryV*e.harness.primary.count)*e.harness.primary.resistanceOhm/e.family.primaryV,e.distribution.voltageDropLimitFraction,'fraction','≤','I·R using allocated hot-wire resistance; connector and transient verification remain open.'),
  row('thermal-flow','Pump/system operating point meets flow demand',t.maximumFlowKgS,t.requiredFlowKgS,'kg/s','≥','Pump curve intersected with common headers plus one parallel branch; Darcy and minor losses included.'),
  row('thermal-velocity','Branch flow velocity',t.atRequired.branch.velocityMS,t.limits.velocityMS,'m/s','≤','Selected erosion/noise/pressure-loss planning bound; not a universal NASA limit.'),
  row('thermal-pressure','Maximum pressure at nominal flow',t.fluid.inletPressurePa+t.nominal.totalPa,t.fluid.designPressurePa,'Pa','≤','Preliminary inlet pressure plus pump differential; relief, proof and burst verification remain open.'),
  row('thermal-expansion','Accumulator expansion volume',t.accumulator.installedL,t.accumulator.requiredL,'L','≥',t.accumulator.basis)
 ];
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
 b+=box(28,88,220,103,'Four tracked solar wings',[fmt(e.bolArrayKW,1)+' kW BOL input',fmt(e.family.sourceV,0)+' V nominal MPP',e.source.seriesCells+' cells/string · study voltage']);
 b+=box(290,88,220,103,'Protected MPPT channels',[e.mppt.count+' × '+fmt(e.mppt.moduleInputKW,0)+' kW input',e.mppt.perWing+' channels per rotary head',fmt(source.busKW,1)+' kW at main bus']);
 b+=box(560,88,212,103,'Main distribution',[e.family.primaryV+' V regulated',e.distribution.feeds+' load feeds × '+e.distribution.feedRatingA+' A',fmt(e.distribution.busbarRatingA,0)+' A internal busbar']);
 b+=path(id,'M248 136H287')+path(id,'M510 136H557');
 b+=box(28,238,220,100,'Battery power interface',[fmt(h.batteryKWh||h.input.batteryKWh,1)+' kWh installed',fmt(e.battery.chargeBusLimitKW,1)+' / '+fmt(e.battery.dischargeBusLimitKW,1)+' kW charge/discharge','Bidirectional · pack loss once']);
 b+=box(290,238,220,100,'Payload converters',[e.payload.modules+' × '+fmt(e.payload.moduleOutputKW,0)+' kW output','48 V at protected tray feeds',fmt(e.payload.capacityKW,1)+' kW payload capacity']);
 b+=box(560,238,212,100,'Flight and thermal service',[e.service.modules+' × 1 kW output','28 V isolated service rail','Avionics · valves · heaters']);
 b+=path(id,'M138 235V211H666V194','#d6c69a',true)+path(id,'M666 191V211H400V235')+path(id,'M666 211V235');
 b+=box(290,382,220,84,'Integrated compute trays',[h.trays+' trays · '+fmt(e.installedElectronicsKW,1)+' kW',e.payload.feedsPerTray+' protected feed(s) per tray']);
 b+=box(560,382,212,84,'Nominal survival controls',[fmt(a.coldControl.totalHeaterKW,2)+' kW heaters','Local thermostats + loop mixing']);
 b+=path(id,'M400 338V379')+path(id,'M666 338V379');
 b+=txt(28,385,'Physical allocations','label')+txt(28,411,fmt(a.masses.electricalKg,1)+' kg conversion / PCDU','small')+txt(28,433,fmt(a.masses.harnessKg,1)+' kg routed harness','small')+txt(28,455,fmt(e.harness.primary.areaMM2,1)+' mm² primary copper/feed','small');
 b+=txt(28,500,'Channel limits remain fixed when orbit, duty or service demand changes. Excess demand is reported.','small')+txt(28,522,'Project design allocations; supplier ratings, EMI, protection coordination and environment evidence remain open.','small');
 return canvas(id,'Selected electrical distribution architecture','A single-line diagram connects four solar wings through protected MPPT channels to a regulated main bus, a bidirectional battery interface, isolated payload converters and a separate service rail. Installed module and current limits are labeled.',b,542);
}
export function renderThermalPath(h,s=null){
 const a=selected(h),t=a.thermal,id='odc-thermal-path',rad=finite(s?.radiatorK,t.fluid.referenceK),loop=finite(s?.loopK,finite(s?.coolantK,rad+t.designHeatKW/Math.max(.001,t.nominalConductanceKWK))),it=h.input?.thermalMode==='applied'?positive(h.input.appliedHeatKw):finite(s?.itKW,a.electrical.installedElectronicsKW),flow=s?positive(s.coolantKgPerSec,positive(s.coolantFlowKgS)):t.nominalFlowKgS,ladder=energyTemperatureLadder(h,{itKW:it,heatKW:finite(s?.heatInputKW,t.designHeatKW),loopK:loop,radiatorK:rad,pumpEnabled:flow>0,flowKgS:flow});
 let b=txt(28,32,'Two radiator branches · selected liquid heat path','title')+txt(28,58,s?'Pressurized NH₃ · selected modeled instant · shared duty/standby pump station':'Pressurized NH₃ · 300 K panel reference case · shared duty/standby pump station','small');
 b+=box(28,90,220,94,'Compute / cold plates',[fmt(ladder.junctionK,1)+' K junction',fmt(ladder.coldPlateK,1)+' K cold plate']);
 b+=box(290,90,220,94,'Common loop / accumulator',[fmt(loop,1)+' K mean fluid',fmt(flow,3)+' kg/s · 2.0 MPa']);
 b+=box(560,90,212,94,'Duty / standby pumps',[t.pump.id+' · '+(flow>0?'1':'0')+' of 2 on',fmt(t.nominal.totalPa/1000,1)+' kPa at nominal flow']);
 b+=path(id,'M248 137H287','#e0b69a')+path(id,'M510 137H557','#e0b69a');
 b+=box(290,245,220,94,'Upper radiator branch',[fmt(h.radiatorM2/2,1)+' m² planform',fmt(t.layout.branchBoreM*1000,0)+' mm supply / return bore']);
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
