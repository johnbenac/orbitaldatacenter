import {defaults,controls,presets,sizeDesign,validateDesign,sizingEnvelope,applyPreset} from '../dist/design.js';
import {domains} from '../dist/domain-analysis.js';
import {referenceCenterOrder} from '../dist/reference-centers.js';
import {buildReferenceDesign} from '../dist/reference-configurations.js';
import {launchFleet} from '../dist/launch-fleet.js';
import {buildEquipmentList} from '../dist/equipment-list.js';
import {buildPartsCatalog} from '../dist/parts-catalog.js';
import {partVerification} from '../dist/part-verification.js';
import {buildElectricalProgram,validateElectricalProgram,runElectricalCheck} from '../dist/electrical-program.js';
import {buildThermalProgram} from '../dist/thermal-program.js';
import {buildThermalAnalysisModel,buildThermalCase} from '../dist/thermal-analysis-model.js';
import {runThermalAnalysis} from '../dist/thermal-analysis.js';
import {geometry} from '../dist/orbit.js';
import {launchPath} from '../dist/launch-path.js';
import {energyRuntime} from '../dist/energy-system.js';
import {architectureFamily} from '../dist/architecture-families.js';
import {designRotaryFluidAllocation} from '../dist/fluid-interface-allocation.js';
import {commTestCases,runCommVerification} from '../dist/comm-verification.js';
import {assessPdrDomains,pdrDomainOrder} from '../dist/pdr-assessment.js';
import {engineeringReadinessSchema,thermalNumericalPlanKinds,thermalSettingPlanKinds,validateEngineeringFields,findNonfiniteEngineeringValues,inspectThermalScenario,inspectThermalPrediction} from '../dist/engineering-readiness.js';

const finite=Number.isFinite;
const problem=(context,code,path,message)=>({...context,severity:'error',code,path,message});
const numbers=(paths,range={min:0})=>paths.split(' ').filter(Boolean).map(path=>({path,...range}));
const positive=paths=>numbers(paths,{exclusiveMin:0});
const text=paths=>paths.split(' ').filter(Boolean).map(path=>({path,type:'string'}));

// These are preconditions of capabilities already presented by the application.
// They are not lists of unknown supplier ratings or as-built observations.
export const subsystemReadinessContracts=Object.freeze([
 {domain:'compute',fields:[...positive('trays chips memoryGB serviceArchitecture.compute.installedHostCores serviceArchitecture.compute.hostRamGB'),...numbers('itKw idleKw serviceArchitecture.fabric.massKg serviceArchitecture.fabric.activeKW serviceArchitecture.fabric.effectivePerWorkerGbps serviceArchitecture.fabric.oneWayBisectionGbps'),...text('serviceArchitecture.compute.trayId serviceArchitecture.fabric.topology serviceArchitecture.fabric.massPowerBasis')]},
 {domain:'data',fields:[...positive('storageTB usableTB'),...numbers('initialQueueGB diskReadGBs diskWriteGBs ai.requiredStorageGB ai.inputBytesPerUnit ai.outputBytesPerUnit serviceArchitecture.fabric.storageLinkGBs serviceArchitecture.fabric.sharedStorageDuplexGBs')]},
 {domain:'comm',fields:[...text('serviceArchitecture.terminal.installedPackage serviceArchitecture.route.id'),...numbers('serviceArchitecture.terminal.installedPeakKW serviceArchitecture.terminal.opticalModemLineMbps serviceArchitecture.terminal.directUpLineMbps serviceArchitecture.terminal.directSLineMbps serviceArchitecture.terminal.directKaLineMbps serviceArchitecture.terminal.directOpticalLineMbps serviceArchitecture.route.effectiveUpMbps serviceArchitecture.route.effectiveDownMbps'),{path:'serviceArchitecture.terminal.kaInstalled',type:'boolean'},{path:'serviceArchitecture.terminal.sBandInstalled',type:'boolean'}]},
 {domain:'power',fields:[...positive('energySystem.electrical.distribution.nominalBusV'),...numbers('solarM2 batteryKWh energySystem.electrical.mppt.inputCapacityKW energySystem.electrical.payload.capacityKW energySystem.electrical.service.capacityKW energySystem.electrical.battery.chargeBusLimitKW energySystem.electrical.battery.dischargeBusLimitKW energySystem.electrical.distribution.capacityKW energySystem.electrical.peakEndpointKW energySystem.electrical.peakBusDemandKW energySystem.coldControl.totalHeaterKW'),{path:'energySystem.sources',type:'array',minLength:1}]},
 {domain:'thermal',fields:[...positive('radiatorM2 energySystem.thermal.loopHardwareCapacityKJK energySystem.thermal.radiatorCapacityKJK enclosure.coupledCapacityKJK'),...numbers('energySystem.thermal.transportCapacityKW energySystem.thermal.pumpNominalKW energySystem.coldControl.batteryHeaterKW energySystem.coldControl.loopHeaterKW energySystem.coldControl.radiatorHeaterKW'),...text('energySystem.thermal.kind')]},
 {domain:'thermal',fields:[...numbers('energySystem.thermal.rotaryFluidAccounting.channelCount energySystem.thermal.rotaryFluidAccounting.axisCount energySystem.thermal.rotaryFluidAccounting.allocatedMassKg energySystem.thermal.rotaryFluidAccounting.externalFeederMetalKg energySystem.thermal.rotaryFluidAccounting.externalFeederLengthM energySystem.thermal.rotaryFluidAccounting.hardwareMassKg energySystem.thermal.rotaryFluidAccounting.internalFluidVolumeM3 energySystem.thermal.rotaryFluidAccounting.seriesMinorLossCoefficientPerBank'),...positive('energySystem.thermal.rotaryFluidAccounting.minimumFlowDiameterM energySystem.thermal.rotaryFluidAccounting.allocatedMassPerAxisKg energySystem.thermal.rotaryFluidAccounting.allocatedMinorLossCoefficientPerAxis'),...text('energySystem.thermal.rotaryFluidAccounting.basis energySystem.thermal.rotaryFluidAccounting.accountingStatus energySystem.thermal.rotaryFluidAccounting.qualificationStatus energySystem.thermal.rotaryFluidAccounting.pressureDropStatus')]},
 {domain:'attitude',fields:[...positive('cmg.count cmg.plannedMomentumNms cmg.plannedTorqueNm'),...numbers('cmg.idleW cmg.maneuverW cmg.totalKg'),{path:'cmg.mechanismDimsM',type:'array',minLength:3},...text('cmg.referenceUrl')]},
 {domain:'prop',fields:[...numbers('propellantKg pressurantKg propulsion.fuelKg propulsion.oxidizerKg propulsion.tankVolumeL'),...positive('propulsion.feedPa propulsion.bottlePa propulsion.temperatureK'),{path:'propulsion.tanks',type:'array',minLength:1}]},
 {domain:'mass',fields:[...positive('dryKg wetKg launchKg'),{path:'massLedger',type:'array',minLength:1}]},
 {domain:'launch',fields:[...positive('fairing.maxDiameterM fairing.heightM'),...numbers('fairing.radialClearanceM fairing.axialClearanceM',{}),...text('fairing.basis fairing.sourceUrl payloadInterface.basis')]},
 {domain:'launcher',fields:[...positive('stowedDiameterM stowedLengthM'),...text('launcherLabel')]},
 {domain:'mechanical',fields:[...positive('bodyWidthM bodyHeightM bodyLengthM wingWidthM wingLengthM radiatorWidthM radiatorLengthM'),{path:'physicalArchitecture.parts',type:'array',minLength:1},...text('physicalArchitecture.revision physicalArchitecture.familyId')]},
 {domain:'avionics',fields:[...positive('cdh.suiteMassKg cdh.operatingW cdh.packetBytes'),...numbers('serviceArchitecture.autonomy.commandHoldRequirementH serviceArchitecture.autonomy.engineeringHistoryRequirementH'),...text('cdh.referenceUrl serviceArchitecture.autonomy.flightBoundary')]},
 {domain:'software',fields:[...text('serviceArchitecture.autonomy.simulationScope'),...positive('input.hkPeriodS'),...numbers('input.commandKbps input.hkRecorderMB input.uplinkBufferMB')]}
]);

export const readinessReferenceIds=Object.freeze(['custom-study',...referenceCenterOrder]);
export const readinessCatalogVariantIds=Object.freeze([...Object.keys(launchFleet).filter(id=>id!==defaults.launcher).map(id=>'launcher:'+id),...Object.keys(presets.engine).filter(id=>id!==defaults.engine).map(id=>'engine:'+id)]);
export const readinessConfigurationIds=Object.freeze([...readinessReferenceIds,...readinessCatalogVariantIds]);
export function readinessDesign(id){
 if(id==='custom-study')return {...defaults};
 if(id.startsWith('launcher:')&&launchFleet[id.slice(9)])return applyPreset(defaults,'launcher',id.slice(9));
 if(id.startsWith('engine:')&&presets.engine[id.slice(7)])return applyPreset(defaults,'engine',id.slice(7));
 if(readinessReferenceIds.includes(id))return buildReferenceDesign(id);
 throw new RangeError('Unknown readiness configuration: '+id);
}

export function inspectDesignInputs(design,referenceId){
 const issues=[];
 const fields=controls.map(c=>({path:c.key,label:c.label,...(c.options?{type:'string',values:Object.keys(c.options)}:{type:'number',min:c.min,max:c.max})}));
 issues.push(...validateEngineeringFields(design,fields,{referenceId,domain:'design'}));
 issues.push(...validateEngineeringFields(design,[{path:'epoch',type:'date'}],{referenceId,domain:'orbit'}));
 // The control's own initial value is also checked: normalization can otherwise
 // make a missing newly-added value look like a complete saved configuration.
 for(const control of controls){
  const field=fields.find(f=>f.path===control.key);
  issues.push(...validateEngineeringFields({[control.key]:control.value},[field],{referenceId,domain:'defaults'}));
 }
 for(const [domain,definition]of Object.entries(domains)){
  for(const key of definition.inputs)if(!fields.some(f=>f.path===key))issues.push(problem({referenceId,domain},'undeclared-input','design.'+key,'The numerical view uses a control that has no input declaration.'));
  issues.push(...validateEngineeringFields(design,definition.inputs.map(key=>fields.find(f=>f.path===key)).filter(Boolean),{referenceId,domain}).map(i=>({...i,path:'design.'+i.path})));
 }
 if(!issues.length)for(const message of validateDesign(design))issues.push(problem({referenceId,domain:'design'},'invalid-design','design',message));
 return {issues,requiredInputCount:fields.length+1,domains:Object.keys(domains)};
}

export function inspectSubsystemReadiness(h,referenceId){
 const issues=[],counts={derivedInputs:0,pdrDomains:0,pdrComparisons:0,communicationBenches:0,communicationNotInstalled:0,electricalRequirements:0,electricalPlans:0,electricalChecks:0,electricalHarnesses:0};
 const observations={unassessedPdrComparisons:0,predictedShortfalls:0,unreviewedDomains:0,electricalPredictedShortfalls:0,unverifiedElectricalRequirements:0};
 for(const contract of subsystemReadinessContracts){
  issues.push(...validateEngineeringFields(h,contract.fields,{referenceId,domain:contract.domain}));counts.derivedInputs+=contract.fields.length;
 }
 const rotary=h.energySystem?.thermal?.rotaryFluidAccounting;
 if(rotary){const expected=designRotaryFluidAllocation(architectureFamily(h),{panelCount:h.radiatorPanelsPerBank});for(const key of['channelCount','axisCount','allocatedMassKg','externalFeederLengthM','externalFeederMetalKg','seriesMinorLossCoefficientPerBank'])if(Math.abs(rotary[key]-expected[key])>1e-8)issues.push(problem({referenceId,domain:'thermal'},'rotary-fluid-configuration','energySystem.thermal.rotaryFluidAccounting.'+key,'The interface allocation must match the installed family, bank count and leaf count.'));}
 if(rotary&&h.energySystem.thermal.kind!=='heat-lift'&&h.energySystem.thermal.kind!=='passive-local'){
  issues.push(...validateEngineeringFields(rotary,[...numbers('nominalPressureDropPa requiredPressureDropPa fluidInventoryKg')],{referenceId,domain:'thermal'}).map(i=>({...i,path:'energySystem.thermal.rotaryFluidAccounting.'+i.path})));
  if(rotary.channelCount>0&&(!(rotary.nominalPressureDropPa>0)||!(rotary.allocatedMassKg>0)))issues.push(problem({referenceId,domain:'thermal'},'rotary-fluid-accounting','energySystem.thermal.rotaryFluidAccounting','Installed rotary channels must retain nonzero pressure-loss and mass allocations.'));
 }
 if(rotary&&Math.abs(rotary.hardwareMassKg-rotary.allocatedMassKg-rotary.externalFeederMetalKg)>1e-8)issues.push(problem({referenceId,domain:'thermal'},'rotary-fluid-mass-ledger','energySystem.thermal.rotaryFluidAccounting.hardwareMassKg','Rotary axis mass and external feeder metal must close exactly once in the fluid hardware subtotal.'));
 for(const [index,row]of (h.massLedger||[]).entries())issues.push(...validateEngineeringFields(row,[{path:'id',type:'string'},{path:'kg',min:0}],{referenceId,domain:'mass'}).map(i=>({...i,path:'massLedger.'+index+'.'+i.path})));
 try{
  const mel=buildEquipmentList(h);
  for(const row of mel.rows)issues.push(...validateEngineeringFields(row,[{path:'wbs',type:'string'},{path:'extendedMassKg',min:0},{path:'quantity',min:0}],{referenceId,domain:'mass',itemId:'flight:'+row.wbs}).map(i=>({...i,path:'equipmentList.'+row.wbs+'.'+i.path})));
 }catch(error){issues.push(problem({referenceId,domain:'mass'},'calculator-exception','equipmentList',error.message));}
 const run=(domain,path,fn,fields=[])=>{
  try{const result=fn();issues.push(...findNonfiniteEngineeringValues(result,{referenceId,domain},path));issues.push(...validateEngineeringFields(result,fields,{referenceId,domain}).map(i=>({...i,path:path+'.'+i.path})));return result;}
  catch(error){issues.push(problem({referenceId,domain},'calculator-exception',path,error.message));return null;}
 };
 try{
  const electrical=buildElectricalProgram(h),context={referenceId,domain:'avionics'};
  for(const error of validateElectricalProgram(electrical))issues.push(problem(context,'electrical-input',error.path,error.message));
  counts.electricalRequirements=electrical.requirements.length;counts.electricalPlans=electrical.plans.length;counts.electricalHarnesses=electrical.graph.harnesses.length;
  observations.unverifiedElectricalRequirements=electrical.requirements.filter(r=>r.verificationStatus==='open').length;
  const prediction=runElectricalCheck(electrical);
  if(!prediction.ready)for(const error of prediction.inputErrors)issues.push(problem(context,'electrical-run-input',error.path,error.message));
  issues.push(...findNonfiniteEngineeringValues(prediction,context,'electricalPrediction'));
  if(prediction.evidenceStatus!=='predicted'||prediction.verificationStatus!=='open')issues.push(problem(context,'electrical-evidence-provenance','electricalPrediction','A numerical interface prediction must retain open physical verification.'));
  counts.electricalChecks=prediction.checks.length;observations.electricalPredictedShortfalls=prediction.checks.filter(c=>c.within===false).length;
 }catch(error){issues.push(problem({referenceId,domain:'avionics'},'calculator-exception','electricalProgram',error.message));}
 const g=run('orbit','geometry',()=>geometry(h.input,86400),[...positive('periodSec relativeSpeedMs'),...numbers('altitudeKm perigeeKm apogeeKm betaDeg',{}),{path:'positionECI',type:'array',minLength:3},{path:'velocityECI',type:'array',minLength:3}]);
 if(g)for(const key of ['positionECI','velocityECI','sunECI','radial','along','normal'])issues.push(...validateEngineeringFields(g,[0,1,2].map(i=>({path:key+'.'+i})),{referenceId,domain:'orbit'}));
 run('launch','launchPath',()=>launchPath(h.input),[...numbers('gapKm headingDeg planeErrorDeg',{}),...text('site.id launcher')]);
 run('power','energyRuntime',()=>energyRuntime(h,{loadKW:h.itKw,itKW:h.itKw}),numbers('busLoadKW conversionLossKW harnessLossKW payloadBranchOutputKW serviceBranchOutputKW heaterKW'));
 const envelope=run('conops','sizingEnvelope',()=>{
  const result=sizingEnvelope(h);
  // Infinite supply life or an unconstrained ratio is a legitimate display
  // state; only actual required sizing quantities must be finite.
  return Object.fromEntries(['solarNeeded','batteryNeeded','radiatorNeeded','meanBus','peakBus','storageNeeded','goodputNeeded'].map(k=>[k,result[k]]));
 },numbers('solarNeeded batteryNeeded radiatorNeeded meanBus peakBus storageNeeded goodputNeeded'));
 const pdr=run('pdr','pdrAssessment',()=>assessPdrDomains({h}));
 if(pdr){
  for(const id of pdrDomainOrder)if(!pdr.domains.some(d=>d.id===id))issues.push(problem({referenceId,domain:id},'missing-domain','pdrAssessment.domains','The numerical domain has no assessment.'));
  for(const report of pdr.domains){
   counts.pdrDomains++;counts.pdrComparisons+=report.checks.length;
   observations.unreviewedDomains+=report.evidenceStatus==='open'?1:0;
   for(const check of report.checks){
    if(check.status==='unassessed')observations.unassessedPdrComparisons++;
    if(check.status==='shortfall')observations.predictedShortfalls++;
    if(['meets','shortfall'].includes(check.status))issues.push(...validateEngineeringFields(check,[{path:'actual'},{path:'required'}],{referenceId,domain:report.id,caseId:check.id}).map(i=>({...i,path:'pdrAssessment.'+report.id+'.'+check.id+'.'+i.path})));
   }
  }
 }
 for(const bench of commTestCases){
  const ctx={referenceId,domain:'comm',caseId:bench.id};
  issues.push(...validateEngineeringFields(bench,[{path:'control.initial',min:bench.control.min,max:bench.control.max},{path:'control.min'},{path:'control.max'},{path:'control.step',exclusiveMin:0},{path:'source.url',type:'string'},{path:'basis',type:'string'}],ctx));
  const result=run('comm','communication.'+bench.id,()=>runCommVerification(h,bench.id));
  if(!result)continue;
  if(!result.applicable){counts.communicationNotInstalled++;if(result.evidence?.outcome!=='not_applicable'||result.trace!==null)issues.push(problem(ctx,'absent-hardware-result','communication.'+bench.id,'Absent hardware must not create a passing numerical test.'));continue;}
  counts.communicationBenches++;
  issues.push(...validateEngineeringFields(result,[{path:'setting'},{path:'trace.current.x'},{path:'trace.current.y'},{path:'trace.samples',type:'array',minLength:2}],ctx));
  // A blocked observation may legitimately be null after a simulated link
  // fails. The input, requirement threshold and numeric sweep must still exist.
  for(const row of result.evidence?.requirements||[])issues.push(...validateEngineeringFields(row,[{path:'limit'},{path:'id',type:'string'}],ctx).map(i=>({...i,path:'communication.'+bench.id+'.requirements.'+row.id+'.'+i.path})));
 }
 return {issues,counts,observations};
}

export function listThermalReadinessScenarios(h,catalog,program,referenceId=program.config.referenceId){
 const scenarios=[],issues=[],byPlan=new Map();
 for(const record of catalog.records)if(!program.items.some(item=>item.id===record.id))issues.push(problem({domain:'thermal',referenceId,itemId:record.id},'missing-item','program.items','Every catalog part exposed by the thermal workspace needs a thermal-program record.'));
 for(const item of program.items)if(!program.plans.some(plan=>plan.itemId===item.id&&thermalNumericalPlanKinds.includes(plan.kind)))issues.push(problem({domain:'thermal',referenceId,itemId:item.id},'missing-numerical-plan','program.plans','Every item in the numerical thermal workspace needs an executable analysis or test plan.'));
 for(const plan of program.plans){
  if(plan.kind==='interface-review')continue;
  const item=program.items.find(i=>i.id===plan.itemId),record=catalog.byId?.[item?.recordId||item?.id]||null;
  if(!thermalNumericalPlanKinds.includes(plan.kind)){issues.push(problem({domain:'thermal',referenceId,itemId:plan.itemId,planId:plan.id},'unregistered-capability','plan.kind','Register the required-input contract for the new numerical plan kind.'));continue;}
  const scenario={item,record,plan,offeredSettings:[]};scenarios.push(scenario);byPlan.set(plan.id,scenario);
 }
 let offered=0;
 for(const record of catalog.records){
  const verification=partVerification(record,catalog,h);
  for(const setting of verification.settings.filter(id=>Object.hasOwn(thermalSettingPlanKinds,id))){
   offered++;const plan=program.plans.find(p=>p.itemId===record.id&&p.kind===thermalSettingPlanKinds[setting]);
   if(!plan)issues.push(...inspectThermalScenario({referenceId,item:program.items.find(i=>i.id===record.id),offeredSetting:setting,sources:program.sources}));
   else byPlan.get(plan.id)?.offeredSettings.push(setting);
  }
 }
 return {scenarios,issues,offered};
}

export async function auditEngineeringReadiness({referenceIds=readinessConfigurationIds,solves='none',onProgress=()=>{},yieldBetweenReferences=true}={}){
 if(!['none','offered','all'].includes(solves))throw new RangeError('solves must be none, offered or all.');
 if(referenceIds.some(id=>!readinessConfigurationIds.includes(id)))throw new RangeError('Unknown reference or catalog-variant selection.');
 const started=Date.now(),report={schema:engineeringReadinessSchema,generatedAt:new Date().toISOString(),passed:false,scope:{referenceIds:[...referenceIds],solves,thermal:'All numerical thermal plans plus exact parts-navigator setting-to-plan coverage',otherSubsystems:'Declared design inputs, required derived allocations, default numerical calculators and communications benches; physical evidence is independent'},counts:{references:0,parts:0,thermalPlans:0,thermalReady:0,offeredThermalSettings:0,thermalPredictions:0,requiredDesignInputs:0,derivedInputs:0,pdrDomains:0,pdrComparisons:0,communicationBenches:0,communicationNotInstalled:0,electricalRequirements:0,electricalPlans:0,electricalChecks:0,electricalHarnesses:0},observations:{unverifiedThermalRequirements:0,unapprovedThermalPlans:0,unassessedPdrComparisons:0,predictedShortfalls:0,unreviewedDomains:0,predictionsWithUnmetPlateaus:0,predictionsNeedingRefinement:0,electricalPredictedShortfalls:0,unverifiedElectricalRequirements:0},references:[],issues:[]};
 for(const referenceId of referenceIds){
  onProgress({referenceId,stage:'inputs'});
  const design=readinessDesign(referenceId),input=inspectDesignInputs(design,referenceId);report.issues.push(...input.issues);report.counts.requiredDesignInputs+=input.requiredInputCount;
  if(input.issues.length){report.references.push({referenceId,ready:false,inputIssues:input.issues.length});continue;}
  let h,catalog,program;try{h=sizeDesign(design);catalog=buildPartsCatalog(h);program=buildThermalProgram(h,catalog);}catch(error){report.issues.push(problem({referenceId,domain:'configuration'},'configuration-exception','configuration',error.message));continue;}
  report.counts.references++;report.counts.parts+=catalog.records.length;
  const other=inspectSubsystemReadiness(h,referenceId);report.issues.push(...other.issues);
  for(const [key,value]of Object.entries(other.counts))report.counts[key]+=value;
  for(const [key,value]of Object.entries(other.observations))report.observations[key]+=value;
  report.observations.unverifiedThermalRequirements+=program.requirements.filter(r=>r.verificationStatus==='open').length;
  report.observations.unapprovedThermalPlans+=program.plans.filter(p=>p.approvalStatus==='not-approved').length;
  const listing=listThermalReadinessScenarios(h,catalog,program,referenceId);report.issues.push(...listing.issues);report.counts.offeredThermalSettings+=listing.offered;
  const modelCache=new Map(),reference={referenceId,configurationId:program.config.id,parts:catalog.records.length,offeredThermalSettings:listing.offered,thermalPlans:listing.scenarios.length,readyThermalPlans:0,predictions:0,scenarios:[]};
  let index=0;
  for(const scenario of listing.scenarios){
   const {item,record,plan,offeredSettings}=scenario,context={referenceId,domain:'thermal',itemId:item?.id||plan.itemId,planId:plan.id};
   const summary={itemId:context.itemId,planId:plan.id,kind:plan.kind,offeredSettings,ready:false};report.counts.thermalPlans++;
   try{
    let model=modelCache.get(item?.id);if(!model){model=buildThermalAnalysisModel(h,{record,catalog,item,config:program.config});modelCache.set(item?.id,model);}
    const caseDefinition=buildThermalCase(model,plan),issues=inspectThermalScenario({referenceId,item,plan,model,caseDefinition,offeredSetting:offeredSettings[0]||null,sources:program.sources});
    report.issues.push(...issues);summary.ready=issues.length===0;
    if(summary.ready){report.counts.thermalReady++;reference.readyThermalPlans++;}
    else summary.issueCount=issues.length;
    const shouldSolve=solves==='all'||solves==='offered'&&(offeredSettings.length>0||item.id==='thermal:spacecraft'&&plan.kind==='thermal-balance');
    if(shouldSolve&&summary.ready){
     onProgress({referenceId,stage:'prediction',itemId:item.id,kind:plan.kind,index:++index});
     // Run the shipped schedule and timestep without shortening the test or
     // changing targets. Convergence is calculated by the production solver.
     const run=runThermalAnalysis(model,caseDefinition);report.counts.thermalPredictions++;reference.predictions++;
     const predictionIssues=inspectThermalPrediction(run,context);report.issues.push(...predictionIssues);
     const n=run.summary.numerics;
     summary.prediction={completed:predictionIssues.length===0,durationS:run.durationS,frames:run.frames.length,artifactCharacters:JSON.stringify(run).length,allPlateausCompleted:run.summary.allPlateausCompleted,convergence:n.convergence?.status,responseConvergence:n.convergence?.responseStatus,responseDeltaK:n.convergence?.responseMaxTemperatureDeltaK,globalTimeDeltaK:n.convergence?.maxTemperatureDeltaK,scheduleStatus:n.convergence?.scheduleStatus,maxResidualW:n.maxResidualW,energyResidualJ:Math.abs(n.totalAppliedJ-n.totalRejectedJ-n.totalStoredJ),energyToleranceJ:Math.max(1,1e-8*Math.max(Math.abs(n.totalAppliedJ),Math.abs(n.totalRejectedJ),Math.abs(n.totalStoredJ)))};
     if(!run.summary.allPlateausCompleted)report.observations.predictionsWithUnmetPlateaus++;
     if(run.summary.numerics.convergence?.status!=='within-study-tolerance')report.observations.predictionsNeedingRefinement++;
    }
   }catch(error){report.issues.push(problem(context,'thermal-exception','scenario',error.message));summary.ready=false;summary.exception=error.message;}
   reference.scenarios.push(summary);
  }
  reference.ready=!report.issues.some(i=>i.referenceId===referenceId);report.references.push(reference);
  onProgress({referenceId,stage:'complete',ready:reference.ready,thermalPlans:reference.thermalPlans,readyThermalPlans:reference.readyThermalPlans,predictions:reference.predictions});
  if(yieldBetweenReferences)await new Promise(resolve=>setTimeout(resolve,0));
 }
 report.elapsedS=(Date.now()-started)/1000;report.passed=report.issues.length===0&&report.counts.references===referenceIds.length;return report;
}
