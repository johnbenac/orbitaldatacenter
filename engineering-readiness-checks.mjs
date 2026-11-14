import assert from 'node:assert/strict';
import {defaults,sizeDesign,normalizeDesign} from './dist/design.js';
import {buildPartsCatalog} from './dist/parts-catalog.js';
import {buildThermalProgram} from './dist/thermal-program.js';
import {buildThermalAnalysisModel,buildThermalCase} from './dist/thermal-analysis-model.js';
import {runThermalAnalysis} from './dist/thermal-analysis.js';
import {validateEngineeringFields,inspectThermalScenario,inspectThermalPrediction,thermalPredictionCharacterBudget} from './dist/engineering-readiness.js';
import {readinessReferenceIds,readinessDesign,inspectDesignInputs,inspectSubsystemReadiness,listThermalReadinessScenarios} from './scripts/engineering-readiness-audit.mjs';

const completed=[],test=(name,fn)=>{fn();completed.push(name);},copy=structuredClone;
const h=sizeDesign(defaults),catalog=buildPartsCatalog(h),program=buildThermalProgram(h,catalog);
const item=program.items.find(i=>i.id==='flight:02.02'),plan=program.plans.find(p=>p.itemId===item.id&&p.kind==='tvac-cycling');
const model=buildThermalAnalysisModel(h,{catalog,record:catalog.byId[item.id],item,config:program.config});
const caseDefinition=buildThermalCase(model,plan),base={referenceId:'custom-study',item,plan,model,caseDefinition,offeredSetting:'thermal-vacuum',sources:program.sources};

test('Required numerical inputs reject null, absent, nonfinite and coerced values, while zero and false remain allocated',()=>{
 const fields=[{path:'loadW',min:0},{path:'heaterEnabled',type:'boolean'},{path:'reference',type:'string'}];
 assert.deepEqual(validateEngineeringFields({loadW:0,heaterEnabled:false,reference:'Study allocation'},fields),[]);
 for(const value of [undefined,null,NaN,Infinity,-Infinity,'0',''])assert.ok(validateEngineeringFields({loadW:value,heaterEnabled:false,reference:'Study'},fields).some(i=>i.path==='loadW'));
 assert.ok(validateEngineeringFields({loadW:-1,heaterEnabled:false,reference:'Study'},fields).length);
 assert.ok(validateEngineeringFields({value:1.5},[{path:'value',integer:true}]).length);
 assert.ok(validateEngineeringFields({value:'wrong'},[{path:'value',type:'string',values:['allowed']}]).length);
});

test('Raw default omissions are detected before design normalization can hide them',()=>{
 const design={...defaults};delete design.fabricGbps;
 assert.equal(normalizeDesign(design).fabricGbps,defaults.fabricGbps);
 const issues=inspectDesignInputs(design,'regression-reference').issues;
 assert.ok(issues.some(i=>i.path==='fabricGbps'&&i.code==='required-input'&&i.referenceId==='regression-reference'));
 const invalid={...defaults,batteryKWh:NaN};assert.ok(inspectDesignInputs(invalid,'regression-reference').issues.some(i=>i.path==='batteryKWh'));
});

test('Every shipped reference has complete inputs for its actual nonthermal numerical capabilities',()=>{
 for(const id of readinessReferenceIds){const design=readinessDesign(id);assert.deepEqual(inspectDesignInputs(design,id).issues,[],id);const checked=inspectSubsystemReadiness(sizeDesign(design),id);assert.deepEqual(checked.issues,[],id);assert.equal(checked.counts.pdrDomains,16);}
});

test('Power and compute allocation regressions produce actionable subsystem paths',()=>{
 const power=copy(h);power.energySystem.electrical.payload.capacityKW=null;
 assert.ok(inspectSubsystemReadiness(power,'fault-power').issues.some(i=>i.domain==='power'&&i.path==='energySystem.electrical.payload.capacityKW'&&i.code==='required-input'));
 const compute=copy(h);delete compute.serviceArchitecture.fabric.effectivePerWorkerGbps;
 assert.ok(inspectSubsystemReadiness(compute,'fault-compute').issues.some(i=>i.domain==='compute'&&i.path==='serviceArchitecture.fabric.effectivePerWorkerGbps'));
});

test('Rotary coolant bore, mass and hydraulic loss are required configuration inputs',()=>{
 for(const field of ['minimumFlowDiameterM','allocatedMassPerAxisKg','allocatedMinorLossCoefficientPerAxis','externalFeederMetalKg','nominalPressureDropPa']){
  const missing=copy(h);delete missing.energySystem.thermal.rotaryFluidAccounting[field];assert.ok(inspectSubsystemReadiness(missing,'fault-rotary').issues.some(i=>i.path==='energySystem.thermal.rotaryFluidAccounting.'+field&&i.code==='required-input'),field);
 }
 const zero=copy(h);zero.energySystem.thermal.rotaryFluidAccounting.nominalPressureDropPa=0;assert.ok(inspectSubsystemReadiness(zero,'fault-rotary-zero').issues.some(i=>i.code==='rotary-fluid-accounting'));
 const wrong=copy(h);wrong.energySystem.thermal.rotaryFluidAccounting.axisCount--;assert.ok(inspectSubsystemReadiness(wrong,'fault-rotary-count').issues.some(i=>i.code==='rotary-fluid-configuration'));
 const mass=copy(h);mass.energySystem.thermal.rotaryFluidAccounting.hardwareMassKg+=1;assert.ok(inspectSubsystemReadiness(mass,'fault-rotary-mass').issues.some(i=>i.code==='rotary-fluid-mass-ledger'));
});

test('A scene-offered thermal setting cannot lose its matching plan',()=>{
 const incomplete={...program,plans:program.plans.filter(p=>p.id!==plan.id)},listing=listThermalReadinessScenarios(h,catalog,incomplete);
 assert.ok(listing.issues.some(i=>i.itemId===item.id&&i.setting==='thermal-vacuum'&&i.code==='missing-plan'));
 assert.equal(inspectThermalScenario(base).length,0);
 const wrong={...base,plan:{...plan,kind:'atmospheric-cycling'}};
 assert.ok(inspectThermalScenario(wrong).some(i=>i.code==='setting-plan-mismatch'));
 const noActivities={...program,plans:program.plans.filter(p=>p.itemId!==item.id||p.kind==='interface-review')};
 assert.ok(listThermalReadinessScenarios(h,catalog,noActivities).issues.some(i=>i.itemId===item.id&&i.code==='missing-numerical-plan'));
 const noRecord={...program,items:program.items.filter(i=>i.id!==item.id)};
 assert.ok(listThermalReadinessScenarios(h,catalog,noRecord).issues.some(i=>i.itemId===item.id&&i.code==='missing-item'));
});

test('Thermal readiness fails missing article targets and editable model properties',()=>{
 const missing=copy(base);missing.caseDefinition.available=false;missing.caseDefinition.missingInputs=['Allocate cold and hot article targets for this item.'];
 missing.caseDefinition.editableFields.find(f=>f.id==='hotK').value=null;
 assert.ok(inspectThermalScenario(missing).some(i=>i.path==='case.inputs.hotK'&&i.code==='required-input'));
 const property=copy(base);property.model.editableFields.find(f=>f.id==='specificHeatJPerKgK').value=NaN;
 assert.ok(inspectThermalScenario(property).some(i=>i.path==='model.inputs.specificHeatJPerKgK'&&i.code==='invalid-input'));
});

test('Thermal topology, stages and explicit sensor targets are independently checked',()=>{
 const badCapacity=copy(base);badCapacity.model.nodes[0].capacityJPerK=0;
 assert.ok(inspectThermalScenario(badCapacity).some(i=>i.code==='invalid-model'&&i.message.includes('heat capacity')));
 const badLink=copy(base);badLink.model.conductors[0].to='nonexistent-node';
 assert.ok(inspectThermalScenario(badLink).some(i=>i.code==='invalid-model'&&i.message.includes('receiving node')));
 const badScope=copy(base);badScope.model.radiation[0].activeIn=['orbital'];
 assert.ok(inspectThermalScenario(badScope).some(i=>i.code==='invalid-exposure-scope'&&i.path==='model.radiation.0.activeIn'),'An unknown exposure name must not silently remove a physical heat path.');
 const badTarget=copy(base),hold=badTarget.caseDefinition.steps.find(s=>s.sensorTargetsK);hold.sensorTargetsK[badTarget.caseDefinition.monitorNodeIds[0]]=0;
 assert.ok(inspectThermalScenario(badTarget).some(i=>i.code==='invalid-temperature'&&i.path.includes('sensorTargetsK')));
 const missingTarget=copy(base),plateau=missingTarget.caseDefinition.steps.find(s=>s.sensorTargetsK);delete plateau.sensorTargetsK[missingTarget.caseDefinition.monitorNodeIds[0]];
 assert.ok(inspectThermalScenario(missingTarget).some(i=>i.code==='missing-article-target'));
 const brokenDuration=copy(base);brokenDuration.caseDefinition.steps[0].durationS=NaN;
 assert.ok(inspectThermalScenario(brokenDuration).some(i=>i.path==='case.steps.0.durationS'));
});

test('Missing allocation basis, broken sources and stale model identities are release blockers',()=>{
 const noBasis=copy(base);noBasis.model.editableFields[0].basis='';
 assert.ok(inspectThermalScenario(noBasis).some(i=>i.code==='allocation-basis'));
 const unknown=copy(base);unknown.plan.sourceIds.push('not-a-real-source');
 assert.ok(inspectThermalScenario(unknown).some(i=>i.code==='unknown-source'));
 const stale=copy(base);stale.caseDefinition.modelId='another-model';
 assert.ok(inspectThermalScenario(stale).some(i=>i.code==='stale-model'));
 const air=copy(base);air.caseDefinition.convectionEnabled=true;
 assert.ok(inspectThermalScenario(air).some(i=>i.code==='vacuum-convection'));
 const newItem=copy(base);newItem.item.studyAllocation={...newItem.item.studyAllocation,profileId:'general-item-interface'};
 assert.ok(inspectThermalScenario(newItem).some(i=>i.code==='unreviewed-profile'));
});

test('Building a different material or subsystem cannot change an existing model allocation or identity',()=>{
 const options={catalog,record:catalog.byId[item.id],item,config:program.config},before=copy(buildThermalAnalysisModel(h,options));
 for(const id of ['flight:06.07','flight:03.03.01','flight:05.03.01']){
  const selected=program.items.find(i=>i.id===id);assert.ok(selected,'The construction-order probe part exists: '+id);
  buildThermalAnalysisModel(h,{catalog,record:catalog.byId[id],item:selected,config:program.config});
 }
 const after=buildThermalAnalysisModel(h,options);
 assert.equal(after.fingerprint,before.fingerprint);assert.deepEqual(after.sourceIds,before.sourceIds);
});

test('Unreviewed hardware evidence and numerical shortfalls remain separate from run readiness',()=>{
 assert.equal(item.capabilityRatings.length,0);assert.equal(plan.approvalStatus,'not-approved');
 assert.ok(program.requirements.filter(r=>r.itemId===item.id).every(r=>r.verificationStatus==='open'));
 assert.deepEqual(inspectThermalScenario(base),[]);
 const short=buildThermalCase(model,plan,{cycles:1,dwellS:0,stabilityWindowS:40,maxPlateauS:120});
 const run=runThermalAnalysis(model,short);
 assert.deepEqual(inspectThermalPrediction(run,{referenceId:'custom-study',itemId:item.id,planId:plan.id}),[]);
 const unmet=copy(run);unmet.summary.allPlateausCompleted=false;unmet.summary.nodes[0].assessment='outside-carried-envelope';
 assert.deepEqual(inspectThermalPrediction(unmet),[],'An honest predicted shortfall is still a healthy execution.');
 const fakeEvidence=copy(run);fakeEvidence.verificationStatus='verified';
 assert.ok(inspectThermalPrediction(fakeEvidence).some(i=>i.code==='prediction-provenance'));
 const invalid=copy(run);invalid.frames.at(-1).temperaturesK[run.nodes[0].id]=NaN;
 assert.ok(inspectThermalPrediction(invalid).some(i=>i.code==='invalid-result-temperature'));
 const badLedger=copy(run);badLedger.summary.numerics.totalAppliedJ+=Math.max(1000,Math.abs(run.summary.numerics.totalAppliedJ)*1e-5);
 assert.ok(inspectThermalPrediction(badLedger).some(i=>i.code==='energy-conservation'),'Finite values still need a conserved energy ledger.');
 const badConvergence=copy(run);badConvergence.summary.numerics.convergence.maxTemperatureDeltaK=null;
 assert.ok(inspectThermalPrediction(badConvergence).some(i=>i.path==='run.summary.numerics.convergence.maxTemperatureDeltaK'),'A default prediction must retain an actual refinement comparison.');
 const oversized={...run,extraDescription:'x'.repeat(thermalPredictionCharacterBudget)};
 assert.ok(inspectThermalPrediction(oversized).some(i=>i.code==='artifact-size'),'A valid prediction still needs room to save its run and provenance.');
});

console.log('Engineering readiness contracts: '+completed.length+' groups passed.');
for(const name of completed)console.log('  '+name);
