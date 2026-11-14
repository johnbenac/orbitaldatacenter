import {buildThermalAnalysisModel,buildThermalCase} from './dist/thermal-analysis-model.js';
import assert from 'node:assert/strict';
import {defaults,sizeDesign} from './dist/design.js';
import {buildPartsCatalog} from './dist/parts-catalog.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {referenceCenterOrder} from './dist/reference-centers.js';
import {thermalNodes} from './dist/thermal-limits.js';
import {partVerification} from './dist/part-verification.js';
import {thermalStudyAllocation} from './dist/thermal-study-allocations.js';
import {buildThermalProgram,thermalProgramForItem,thermalConfigurationIdentity,thermalFingerprint,validateThermalOverrides,validateThermalMeasurementData,createThermalProgramStore,exportThermalProgram,normalizeThermalOverrides} from './dist/thermal-program.js';

const fixtures=[['custom-study',defaults],...referenceCenterOrder.map(id=>[id,buildReferenceDesign(id)])];
const programs=fixtures.map(([id,design])=>{const h=sizeDesign(design),catalog=buildPartsCatalog(h),program=buildThermalProgram(h,catalog);return {id,h,catalog,program};});
assert.equal(new Set(programs.map(x=>x.program.config.id)).size,fixtures.length,'Reference configurations must not share an identity.');
for(const {id,h,catalog,program:p} of programs){
 assert.equal(p.config.referenceId,id);
 assert.equal(p.config.id,thermalConfigurationIdentity(h,catalog).id);
 assert.equal(new Set(p.items.map(x=>x.id)).size,p.items.length);
 assert.equal(p.items.filter(x=>!x.synthetic).length,catalog.records.length,'Every actual catalog part receives a thermal record.');
 assert.equal(p.summary.verified,0);
 assert.equal(p.items.find(x=>x.id==='thermal:spacecraft').nodeId,null,'A spacecraft does not have one universal temperature boundary.');
 for(const item of p.items){
  if(item.parentId)assert.ok(p.items.some(x=>x.id===item.parentId),'Resolvable hierarchy: '+item.id);
  assert.equal(item.configurationId,p.config.id);
  assert.deepEqual(item.capabilityRatings,[],'Study allocations must not become supplier-qualified ratings.');
  if(!item.synthetic){
   assert.ok(item.studyAllocation?.basis&&item.studyAllocation?.measurementBoundary,'Every local allocation identifies its rationale and measured boundary: '+item.id);
   assert.equal(item.studyAllocation.capabilityClaim,false);
   assert.ok(Number.isFinite(item.limits.operatingMinK)&&Number.isFinite(item.limits.operatingMaxK),'A default article operating allocation is complete: '+item.id);
   assert.ok(Number.isFinite(item.limits.survivalMinK)&&Number.isFinite(item.limits.survivalMaxK),'A default article non-operating allocation is complete: '+item.id);
   for(const sid of item.studyAllocation.sourceIds)assert.ok(p.sources[sid],'Known allocation source: '+sid);
   const record=catalog.records.find(r=>r.id===item.id),settings=partVerification(record,catalog,h).settings;
   for(const [setting,kind] of [['thermal-vacuum','tvac-cycling'],['thermal-cycle','atmospheric-cycling']])if(settings.includes(setting)){
    const plan=p.plans.find(plan=>plan.itemId===item.id&&plan.kind===kind);
    assert.ok(plan,'An offered thermal setting has a numerical plan: '+item.id+' '+setting);
    assert.ok(Number.isFinite(plan.articleTargets.coldK)&&Number.isFinite(plan.articleTargets.hotK),'The article targets are allocated independently of chamber commands.');
   }
  }
  const view=thermalProgramForItem(p,item.id);
  assert.ok(view.requirements.length>=5&&view.plans.length>=2);
  for(const r of view.requirements){
   assert.equal(r.verificationStatus,'open');
   for(const parent of r.parentIds)assert.ok(p.requirements.some(x=>x.id===parent));
   for(const plan of r.verificationPlanIds)assert.ok(p.plans.some(x=>x.id===plan&&x.requirementIds.includes(r.id)));
   for(const source of r.sourceIds)assert.ok(p.sources[source],'Known requirement source: '+source);
  }
  for(const plan of view.plans){
   assert.equal(plan.approvalStatus,'not-approved');assert.equal(plan.verificationStatus,'open');
   for(const req of plan.requirementIds)assert.ok(view.requirements.some(x=>x.id===req&&x.verificationMethods.some(m=>plan.verificationMethods.includes(m))),'Plan links must support an applicable verification method.');
   for(const source of plan.sourceIds)assert.ok(p.sources[source],'Known plan source: '+source);
  }
 }
 for(const category of ['flight','launch','ground','site'])assert.ok(p.items.some(x=>x.category===category));
 const whole=thermalProgramForItem(p,'thermal:spacecraft');
 assert.equal(whole.requirements.find(r=>r.id.endsWith(':operating')).criterion.nodes.length,thermalNodes.length);
 assert.deepEqual(p.lifecycle.map(x=>x.phase),['A','B','C','D','E','F']);
 assert.ok(whole.requirements.some(r=>r.verificationMethods.includes('demonstration')));
 const launcher=thermalProgramForItem(p,'launch:vehicle');
 assert.equal(launcher.item.studyAllocation.profileId,'outdoor-support-interface');
 assert.match(launcher.item.measurementBoundary,/Representative external support/,'The provider study is a declared interface, not a whole-vehicle rating.');
 assert.equal(launcher.plans.find(p=>p.kind==='thermal-analysis').parameters.pressurePa,101325,'An installed atmospheric interface analysis must not retain the vacuum pressure default.');
 assert.ok(launcher.plans.every(x=>!['tvac-cycling','atmospheric-cycling'].includes(x.kind)),'Do not assign a flight-unit chamber exposure to a launch vehicle.');
}

const {h,catalog,program:base}=programs[0],battery=thermalProgramForItem(base,'flight:02.02'),tvac=battery.plans.find(x=>x.kind==='tvac-cycling');
const network=thermalProgramForItem(base,'flight:01.04'),networkPlan=network.plans.find(p=>p.kind==='tvac-cycling');
assert.deepEqual([network.item.limits.operatingMinK,network.item.limits.operatingMaxK],[273.15,308.15],'The exact forward-airflow network reference informs a 0–35 °C project article allocation.');
assert.deepEqual([networkPlan.articleTargets.coldK,networkPlan.articleTargets.hotK],[273.15,308.15]);
assert.equal(networkPlan.inputReadiness.status,'plan-inputs-complete');
assert.equal(networkPlan.physicalTestReadiness,'review-required');
assert.equal(network.item.studyAllocation.capabilityClaim,false);
assert.match(network.item.measurementBoundary,/body temperature/);
const smallCmg=thermalStudyAllocation({id:'flight:04.01',wbs:'04.01',category:'flight',referenceHardware:{referenceModel:'CMG 15-45S'}},h);
assert.equal(smallCmg.profileId,'cmg15-cluster');
assert.deepEqual([smallCmg.operating.minK,smallCmg.operating.maxK],[263.15,318.15],'A CMG15 mechanism reference must not silently use the different CMG75 operating envelope.');
const attitude=thermalProgramForItem(base,'thermal:subsystem:04');
assert.deepEqual(attitude.item.nodeIds,['flight:04.01','flight:04.02','flight:04.03']);
assert.ok(attitude.item.thermal.nodes.every(n=>n.ownerItemId===n.id&&Number.isFinite(n.operating.minK)),'A subsystem without legacy thermal stores receives distinct child article allocations.');
const revisedAttitude=buildThermalProgram(h,catalog,{overrides:{items:{'flight:04.01':{operatingMaxK:310}}}}),revisedAttitudePlan=thermalProgramForItem(revisedAttitude,'thermal:subsystem:04').plans.find(p=>p.kind==='tvac-cycling');
assert.equal(revisedAttitudePlan.articleTargets.nodes.find(n=>n.nodeId==='flight:04.01').hotK,310);
assert.notEqual(revisedAttitudePlan.revision,attitude.plans.find(p=>p.kind==='tvac-cycling').revision,'A per-node target edit revises the aggregate plan even without one scalar hot/cold target.');
assert.equal(tvac.parameters.hotK,h.input.batteryOpMaxK);
assert.equal(tvac.parameters.coldK,h.input.batteryOpMinK);
assert.equal(tvac.parameterMeta.testMarginK.status,'project-allocation');
assert.match(tvac.parameterMeta.testMarginK.basis,/zero additional test margin/);
assert.equal(tvac.approach,'engineering');
const detail=catalog.records.find(r=>r.parentId==='flight:02.02'),detailView=thermalProgramForItem(base,detail.id);
assert.equal(detailView.item.thermal.operating.minK,233.15,'A battery housing has an independent structural-article study allocation.');
assert.notEqual(detailView.item.thermal.operating.minK,battery.item.thermal.operating.minK,'A shell specimen is not silently assigned a cell/pack rating.');
assert.equal(detailView.item.thermal.nodes[0].criterionEligible,false);
assert.equal(detailView.plans.find(x=>x.kind==='atmospheric-cycling').parameters.hotK,353.15);
const noThermalProperties=buildThermalProgram({},catalog);
assert.equal(thermalProgramForItem(noThermalProperties,'thermal:spacecraft').requirements.find(x=>x.id.endsWith(':operating')).status,'unallocated');

const overrides={items:{'flight:02.02':{operatingMaxK:310,basis:'Review allocation, revision A',sourceUrl:'https://example.org/controlled-spec',owner:'Thermal team'}},plans:{[tvac.id]:{approach:'qualification',testMarginK:5,procedureRevision:'TV-01 A'}}};
const revised=buildThermalProgram(h,catalog,{overrides}),revisedBattery=thermalProgramForItem(revised,'flight:02.02'),revisedPlan=revisedBattery.plans.find(x=>x.kind==='tvac-cycling');
assert.equal(revisedBattery.item.thermal.nodes[0].operating.maxK,310);
const revisedWhole=thermalProgramForItem(revised,'thermal:spacecraft'),revisedPower=thermalProgramForItem(revised,'thermal:subsystem:02');
for(const view of [revisedWhole,revisedPower]){
 assert.equal(view.item.thermal.nodes.find(n=>n.id==='battery').operating.maxK,310,'Aggregate node allocation follows the edited direct owner.');
 const criterion=view.requirements.find(r=>r.id.endsWith(':operating')).criterion.nodes.find(n=>n.nodeId==='battery');
 assert.equal(criterion.maxK,310);assert.ok(criterion.sourceIds.some(id=>revised.sources[id]?.url==='https://example.org/controlled-spec'));
}
assert.equal(thermalProgramForItem(revised,detail.id).item.thermal.operating.maxK,detailView.item.thermal.operating.maxK,'Parent edits cannot silently replace the independently allocated detail envelope.');
assert.equal(thermalProgramForItem(revised,detail.id).item.thermal.proxy.operating.maxK,310,'Only contextual parent bands propagate into a material/detail.');
const splitOwnership=buildThermalProgram(h,catalog,{overrides:{items:{'flight:03.02':{operatingMaxK:320}}}});
const wholeThermal=thermalProgramForItem(splitOwnership,'thermal:spacecraft').item.thermal;
assert.equal(wholeThermal.nodes.find(n=>n.id==='coolant').operating.maxK,320);
assert.equal(wholeThermal.nodes.find(n=>n.id==='coldPlate').operating.maxK,h.input.coldPlateOpMaxK,'A secondary cold-plate interface must not overwrite the compute owner.');
assert.throws(()=>buildThermalProgram(h,catalog,{overrides:{items:{'thermal:spacecraft':{operatingMaxK:320}}}}),/separate temperature boundaries/);
assert.equal(revisedPlan.parameters.hotK,315);assert.equal(revisedPlan.parameters.coldK,268);
assert.equal(revisedPlan.approvalStatus,'not-approved');assert.notEqual(revised.config.id,base.config.id);
assert.equal(revised.config.scopeId,base.config.scopeId,'Allocation drafts remain available in their hardware scope.');
assert.equal(revisedBattery.requirements.find(x=>x.id.endsWith(':operating')).criterion.maxK,310);
assert.equal(revisedBattery.item.capabilityRatings.length,0);
assert.ok(revisedPlan.sourceIds.some(id=>revised.sources[id]?.url==='https://example.org/controlled-spec'));
for(const approach of ['qualification','protoflight','acceptance']){
 const p=buildThermalProgram(h,catalog,{overrides:{plans:{[tvac.id]:{approach}}}}).plans.find(x=>x.id===tvac.id);
 assert.equal(p.parameters.hotK,tvac.parameters.hotK,'An approach label alone must not invent test margins.');
 assert.equal(p.parameterMeta.testMarginK.status,'project-allocation');assert.equal(p.verificationStatus,'open');
}
const overexposure=buildThermalProgram(h,catalog,{overrides:{plans:{[tvac.id]:{testMarginK:20}}}}).plans.find(x=>x.id===tvac.id);
assert.ok(overexposure.openItems.some(s=>s.includes('exceeds a declared non-operating limit')));
assert.throws(()=>buildThermalProgram(h,catalog,{overrides:{items:{'flight:02.02':{operatingMaxK:260}}}}),/must not exceed/);
assert.throws(()=>buildThermalProgram(h,catalog,{overrides:{plans:{[tvac.id]:{hotK:270}}}}),/must not exceed/);
assert.ok(validateThermalOverrides({items:{x:{operatingMinK:280,operatingMaxK:270}}}).length);
assert.ok(validateThermalOverrides({items:{x:{unknown:null}}}).length);
assert.ok(validateThermalOverrides({items:{x:{sourceUrl:'javascript:alert(1)'}}}).length);
assert.ok(validateThermalOverrides({plans:{x:{cycles:1.2}}}).length);
assert.equal(thermalFingerprint({b:2,a:1}),thermalFingerprint({a:1,b:2}),'Object order must not stale a configuration.');
assert.equal(thermalConfigurationIdentity(h,{...catalog,records:[...catalog.records].reverse()}).id,base.config.id);
const otherHardware=sizeDesign({...h.input,radiatorM2:h.input.radiatorM2+1}),other=buildThermalProgram(otherHardware,buildPartsCatalog(otherHardware));
assert.notEqual(other.config.scopeId,base.config.scopeId);
assert.equal(other.plans.find(x=>x.id===tvac.id).parameters.hotK,tvac.parameters.hotK,'Changed heat rejection changes predictions, not allowable temperatures.');

const data={timeUnit:'s',temperatureUnit:'K',samples:[{timeS:0,temperatures:{battery:293.15}},{timeS:10,temperatures:{battery:294}}]};
assert.deepEqual(validateThermalMeasurementData(data),[]);
for(const invalid of [{...data,temperatureUnit:'C'},{...data,samples:[data.samples[0],data.samples[0]]},{...data,samples:[data.samples[0],null]},{...data,samples:[data.samples[0],{timeS:10,temperatures:{battery:NaN}}]}])assert.ok(validateThermalMeasurementData(invalid).length);
const storageValues=new Map();let rejectWrite=false;
const storage={getItem:k=>storageValues.get(k)||null,setItem:(k,v)=>{if(rejectWrite)throw Error('Quota exhausted');storageValues.set(k,v);}};
const store=createThermalProgramStore(storage),scope=base.config.scopeId;
assert.equal(store.status().persistent,true);
assert.equal(store.setDraft(scope,'program',overrides).ok,true);
assert.equal(store.setDraft(scope,'model:flight:02.02',{massKg:30}).ok,true);
assert.deepEqual(store.getDraft(scope),overrides);
assert.deepEqual(store.getDraft(scope,'model:flight:02.02'),{massKg:30});
assert.deepEqual(store.getDraft(other.config.scopeId),{});
assert.deepEqual(createThermalProgramStore(storage).getDraft(scope),overrides,'Drafts survive page/store reload.');

const run=store.saveRun(base,{id:'run-1',configurationId:base.config.id,itemId:battery.item.id,planId:tvac.id,status:'verified',verified:true,acceptanceStatus:'accepted',qualificationStatus:'qualified',frames:[]});
assert.equal(run.ok,true);assert.equal(run.record.status,'predicted');assert.equal(run.record.verificationStatus,'open');
assert.equal(run.record.acceptanceStatus,'not-established');assert.equal(run.record.qualificationStatus,'not-established');assert.equal(run.record.verified,undefined);
assert.equal(run.record.planSnapshot.revision,tvac.revision);assert.ok(run.record.requirementRevisions.length);
assert.deepEqual(run.record.planSnapshot.articleTargets,tvac.articleTargets,'Stored artifacts preserve article criteria separately from case chamber commands.');
assert.equal(store.saveRun(revised,{configurationId:base.config.id}).ok,false,'Never relabel a stale result to a new configuration.');
assert.equal(store.saveRun(base,{configurationFingerprint:'stale'}).ok,false);
assert.equal(store.saveRun(base,{itemId:'not-installed'}).ok,false);

const evidenceInput={kind:'measured-temperature-series',title:'Engineering article TV-01 temperatures',itemId:battery.item.id,requirementIds:[battery.requirements[0].id],planId:tvac.id,articleId:'EM-001',procedureRevision:'TV-01 A',recordedAt:'2026-11-08T12:00:00Z',measurementUncertaintyK:.5,data,status:'verified',verificationStatus:'verified',qualificationStatus:'qualified',verified:true};
const evidence=store.attachEvidence(base,evidenceInput);
assert.equal(evidence.ok,true);assert.equal(evidence.record.status,'pending-review');assert.equal(evidence.record.verificationStatus,'open');assert.equal(evidence.record.qualificationStatus,'not-established');assert.equal(evidence.record.verified,undefined);
assert.equal(evidence.record.requirementRevisions[0].revision,battery.requirements[0].revision);
assert.equal(store.attachEvidence(base,{...evidenceInput,configurationId:other.config.id}).ok,false);
assert.equal(store.attachEvidence(base,{...evidenceInput,itemId:detail.id}).ok,false);
assert.equal(store.attachEvidence(base,{...evidenceInput,measurementUncertaintyK:-.1}).ok,false);
assert.equal(store.attachEvidence(base,{...evidenceInput,sourceUrl:'file:///local/report'}).ok,false);
assert.equal(store.attachEvidence(base,{...evidenceInput,analysis:{rmseK:-1}}).ok,false);
const withoutIdentity=store.attachEvidence(base,{kind:'supplier-document',title:'Unreviewed product note',itemId:battery.item.id});
assert.equal(withoutIdentity.record.recordedAt,null,'Import date must not be invented as the measurement date.');
assert.ok(withoutIdentity.record.openItems.some(s=>s.includes('Article serial')));

const beforeQuota=[...storageValues.values()][0];rejectWrite=true;
assert.equal(store.setDraft(scope,'program',{items:{}}).ok,false);
assert.deepEqual(store.getDraft(scope),overrides,'Failed writes preserve the existing in-memory draft.');
assert.equal([...storageValues.values()][0],beforeQuota,'Failed writes preserve the existing persistent state.');
rejectWrite=false;
assert.equal(store.setDraft(scope,'oversize',{text:'x'.repeat(4_000_001)}).ok,false);
assert.equal([...storageValues.values()][0],beforeQuota);
assert.equal(store.listRuns(scope).length,1);
assert.equal(store.listRuns(scope,{configurationId:revised.config.id}).length,0);
const exported=JSON.parse(JSON.stringify(store.export(revised)));
assert.deepEqual(exported.traceability.staleRunIds,['run-1']);assert.ok(exported.traceability.staleEvidenceIds.includes(evidence.record.id));
assert.equal(exported.program.config.id,revised.config.id);assert.equal(exported.verificationStatus,'open');
assert.equal(exportThermalProgram(base).schema,base.schema);
let overwroteCorrupt=false;const corrupt=createThermalProgramStore({getItem:()=>'{broken',setItem:()=>{overwroteCorrupt=true;}});
assert.equal(corrupt.status().persistent,false);corrupt.setDraft(scope,'program',{});assert.equal(overwroteCorrupt,false);
console.log('Thermal program checks passed: seven configuration scopes; complete catalog hierarchy and traceability; explicit unknown ratings; allocation-derived targets; approach/margin separation; stale-run rejection; unreviewed evidence import; scoped persistence and atomic quota failures.');

// Restoring a draft must reproduce the original engineering identity, rather
// than inventing a new configuration from otherwise empty UI container maps.
const resetShapes=[{items:{}},{plans:{}},{items:{},plans:{}},{items:{'flight:02.02':{}}},{plans:{[tvac.id]:{}}},{items:{'flight:02.02':{}},plans:{[tvac.id]:{}}},{items:null,plans:undefined}];
const defaultResetModel=buildThermalAnalysisModel(h,{catalog,record:catalog.byId[battery.item.id],item:battery.item,config:base.config});
const defaultResetCase=buildThermalCase(defaultResetModel,tvac);
for(const emptyOverride of resetShapes){
 const before=JSON.stringify(emptyOverride),restored=buildThermalProgram(h,catalog,{overrides:emptyOverride});
 assert.deepEqual(normalizeThermalOverrides(emptyOverride),{});
 assert.equal(JSON.stringify(emptyOverride),before,'Normalization must not mutate the caller draft.');
 assert.deepEqual(restored,base,'An empty override map must restore the whole original program.');
 assert.equal(thermalConfigurationIdentity(h,catalog,emptyOverride).id,base.config.id);
 const restoredView=thermalProgramForItem(restored,battery.item.id),restoredPlan=restoredView.plans.find(p=>p.id===tvac.id);
 const restoredModel=buildThermalAnalysisModel(h,{catalog,record:catalog.byId[battery.item.id],item:restoredView.item,config:restored.config});
 const restoredCase=buildThermalCase(restoredModel,restoredPlan);
 assert.equal(restoredModel.id,defaultResetModel.id,'Reset must restore the current model identity.');
 assert.equal(restoredCase.id,defaultResetCase.id,'Reset must restore the current case identity.');
}
const explicitlyCleared={items:{'flight:02.02':{operatingMaxK:null}}};
assert.deepEqual(normalizeThermalOverrides(explicitlyCleared),explicitlyCleared,'Explicit null allocation is meaningful.');
assert.notEqual(buildThermalProgram(h,catalog,{overrides:explicitlyCleared}).config.id,base.config.id);
const explicitlyAdopted={items:{'flight:02.02':{operatingMaxK:battery.item.limits.operatingMaxK}}};
assert.notEqual(buildThermalProgram(h,catalog,{overrides:explicitlyAdopted}).config.id,base.config.id,'An explicit adopted value retains user-allocation provenance even if numerically equal.');
assert.throws(()=>buildThermalProgram(h,catalog,{overrides:{items:{'flight:02.02':null}}}),/allocation object/);
console.log('Thermal reset checks passed: empty maps/patches normalize without changing provenance; reset restores exact program, model and case identities.');
