// Input readiness is deliberately independent of performance and verification.
// A default calculation must be executable even when it predicts a shortfall;
// a complete calculation never supplies a missing supplier rating or test record.
import {validateThermalModel} from './thermal-analysis.js';

export const engineeringReadinessSchema='odc-engineering-readiness/1';
export const thermalPredictionCharacterBudget=3_500_000;
export const thermalNumericalPlanKinds=Object.freeze(['thermal-analysis','tvac-cycling','thermal-balance','atmospheric-cycling']);
export const thermalSettingPlanKinds=Object.freeze({'thermal-vacuum':'tvac-cycling','thermal-cycle':'atmospheric-cycling'});
const finite=Number.isFinite;
const own=(o,k)=>o!=null&&Object.hasOwn(o,k);
const issue=(context,code,path,message)=>({...context,severity:'error',code,path,message});
export const engineeringPathValue=(object,path)=>(Array.isArray(path)?path:String(path).split('.')).reduce((value,key)=>value?.[key],object);

/** Reusable contract for inputs to a declared numerical capability. */
export function validateEngineeringFields(object,fields,context={}){
 const issues=[];
 for(const field of fields){
  if(field.applicable===false)continue;
  const path=Array.isArray(field.path)?field.path.join('.'):field.path,value=engineeringPathValue(object,field.path),name=field.label||path;
  if(value==null){if(!field.optional)issues.push(issue(context,'required-input',path,name+' needs an allocated default.'));continue;}
  const type=field.type||'number';let invalid=null;
  if(type==='number'){
   if(typeof value!=='number'||!finite(value))invalid='must be a finite number';
   else if(field.integer&&!Number.isInteger(value))invalid='must be an integer';
   else if(finite(field.min)&&value<field.min)invalid='must be at least '+field.min;
   else if(finite(field.max)&&value>field.max)invalid='must be at most '+field.max;
   else if(finite(field.exclusiveMin)&&value<=field.exclusiveMin)invalid='must be greater than '+field.exclusiveMin;
  }else if(type==='boolean'&&typeof value!=='boolean')invalid='must be true or false';
  else if(type==='string'&&(typeof value!=='string'||!value.trim()))invalid='must be a nonempty string';
  else if(type==='date'&&(typeof value!=='string'||!finite(Date.parse(value))))invalid='must identify a valid date';
  else if(type==='array'&&(!Array.isArray(value)||value.length<(field.minLength??0)))invalid='must be an array with at least '+(field.minLength??0)+' entries';
  else if(type==='object'&&(typeof value!=='object'||Array.isArray(value)))invalid='must be an allocated object';
  if(!invalid&&field.values&&!field.values.includes(value))invalid='must be one of '+field.values.join(', ');
  if(invalid)issues.push(issue(context,'invalid-input',path,name+' '+invalid+'.'));
 }
 return issues;
}

export function findNonfiniteEngineeringValues(object,context={},prefix=''){
 const issues=[];
 function walk(value,path){
  if(typeof value==='number'&&!finite(value))issues.push(issue(context,'nonfinite-result',path,'A numerical result is not finite.'));
  else if(value&&typeof value==='object')for(const [key,child]of Object.entries(value))walk(child,path?path+'.'+key:key);
 }
 walk(object,prefix);return issues;
}

function editableInputIssues(fields,context,prefix){
 const issues=[],seen=new Set();
 for(const [index,field]of (fields||[]).entries()){
  const path=prefix+'.'+(field.id||index);
  if(!field.id||seen.has(field.id))issues.push(issue(context,'input-identity',path,'Editable input identifiers must be present and unique.'));
  seen.add(field.id);
  issues.push(...validateEngineeringFields({value:field.value},[{path:'value',label:field.label||field.id,type:field.type==='boolean'||typeof field.value==='boolean'?'boolean':'number',min:field.min,max:field.max}],context).map(i=>({...i,path})));
  if(typeof field.basis!=='string'||!field.basis.trim())issues.push(issue(context,'allocation-basis',path+'.basis','A default engineering input needs its allocation basis.'));
 }
 return issues;
}

/** Validate the exact offered item/plan/model/case before a Run button is enabled. */
export function inspectThermalScenario({referenceId,item,plan,model,caseDefinition,offeredSetting=null,sources={}}={}){
 const context={domain:'thermal',referenceId,itemId:item?.id||null,planId:plan?.id||null,setting:offeredSetting||plan?.setting||null};
 const issues=[];
 if(!item)issues.push(issue(context,'missing-item','program.items','The selected part has no thermal-program record.'));
 if(item?.category==='flight'&&item.studyAllocation?.profileId==='general-item-interface')issues.push(issue(context,'unreviewed-profile','item.studyAllocation.profileId','A new flight item needs a reviewed part-family allocation instead of the exploratory interface fallback.'));
 if(!plan){issues.push(issue(context,'missing-plan','program.plans','The offered setting has no matching numerical thermal plan.'));return issues;}
 if(offeredSetting&&thermalSettingPlanKinds[offeredSetting]!==plan.kind)issues.push(issue(context,'setting-plan-mismatch','plan.kind','The scene setting must select its matching thermal procedure.'));
 if(!thermalNumericalPlanKinds.includes(plan.kind))issues.push(issue(context,'non-numerical-plan','plan.kind','This plan is not a declared numerical thermal capability.'));
 if(!model){issues.push(issue(context,'missing-model','model','The selected thermal plan has no analysis model.'));return issues;}
 if(!model.available)for(const [index,message]of (model.missingInputs?.length?model.missingInputs:['The model is not allocated.']).entries())issues.push(issue(context,'model-input','model.missingInputs.'+index,message));
 for(const [index,message]of validateThermalModel(model).entries())issues.push(issue(context,'invalid-model','model.validation.'+index,message));
 for(const kind of ['conductors','radiation'])for(const [index,edge]of (model[kind]||[]).entries())if(edge.activeIn!=null&&(!Array.isArray(edge.activeIn)||!edge.activeIn.length||edge.activeIn.some(scope=>!['orbit','test'].includes(scope))))issues.push(issue(context,'invalid-exposure-scope','model.'+kind+'.'+index+'.activeIn','Thermal paths may be restricted to orbit and/or test. An unknown scope would silently disable the heat path.'));
 issues.push(...editableInputIssues(model.editableFields,context,'model.inputs'));
 if(!caseDefinition){issues.push(issue(context,'missing-case','case','The selected plan has no executable case.'));return issues;}
 const c=caseDefinition;
 if(!c.available)for(const [index,message]of (c.missingInputs?.length?c.missingInputs:['The case is not allocated.']).entries())issues.push(issue(context,'case-input','case.missingInputs.'+index,message));
 issues.push(...editableInputIssues(c.editableFields,context,'case.inputs'));
 issues.push(...validateEngineeringFields(c,[{path:'dtS',exclusiveMin:0},{path:'sampleEveryS',exclusiveMin:0},{path:'steps',type:'array',minLength:1}],context).map(i=>({...i,path:'case.'+i.path})));
 if(c.kind!=='atmospheric-cycling'&&c.kind!=='installed-environment'&&c.convectionEnabled)issues.push(issue(context,'vacuum-convection','case.convectionEnabled','A vacuum or orbital case cannot include atmospheric convection.'));
 if(c.modelId!==model.id)issues.push(issue(context,'stale-model','case.modelId','The case must refer to the model being checked.'));
 if(c.configurationId!==model.configurationId||item&&item.configurationId!==model.configurationId)issues.push(issue(context,'stale-configuration','case.configurationId','The item, model and case must use the same configuration.'));
 const nodes=new Set((model.nodes||[]).map(n=>n.id)),boundaries=new Set((model.boundaries||[]).map(b=>b.id)),stageIds=new Set();
 const conditions=(stage,path)=>{
  for(const [key,ids]of [['boundariesK',boundaries],['initialBoundariesK',boundaries],['sensorTargetsK',nodes],['initialTemperaturesK',nodes]])for(const [id,value]of Object.entries(stage[key]||{})){
   if(!ids.has(id))issues.push(issue(context,'missing-endpoint',path+'.'+key+'.'+id,'The named thermal node or boundary does not exist.'));
   if(!finite(value)||value<=0)issues.push(issue(context,'invalid-temperature',path+'.'+key+'.'+id,'A temperature allocation must be positive, finite kelvin.'));
  }
  for(const key of ['loadsW','externalFluxW'])for(const [id,value]of Object.entries(stage[key]||{})){
   if(!nodes.has(id))issues.push(issue(context,'missing-endpoint',path+'.'+key+'.'+id,'The receiving thermal node does not exist.'));
   if(!finite(value)||value<0)issues.push(issue(context,'invalid-heat-input',path+'.'+key+'.'+id,'Heat input must be finite, nonnegative watts.'));
  }
  if(own(stage,'loadFraction')&&(!finite(stage.loadFraction)||stage.loadFraction<0))issues.push(issue(context,'invalid-load-fraction',path+'.loadFraction','Load fraction must be finite and nonnegative.'));
 };
 conditions(c,'case');
 for(const [index,stage]of (c.steps||[]).entries()){
  const path='case.steps.'+index;conditions(stage,path);
  if(!stage.id||stageIds.has(stage.id))issues.push(issue(context,'stage-identity',path+'.id','Stage identifiers must be present and unique.'));stageIds.add(stage.id);
  if(!['hold','ramp','timeline'].includes(stage.type))issues.push(issue(context,'unknown-stage',path+'.type','The solver does not support this stage type.'));
  const durationField=stage.type==='hold'?'maxDurationS':'durationS';
  issues.push(...validateEngineeringFields(stage,[{path:durationField,exclusiveMin:0}],context).map(i=>({...i,path:path+'.'+i.path})));
  if(stage.type==='hold')issues.push(...validateEngineeringFields(stage,[{path:'dwellS',min:0},{path:'stabilityWindowS',exclusiveMin:0},{path:'stabilityKPerHour',exclusiveMin:0},{path:'toleranceK',exclusiveMin:0}],context).map(i=>({...i,path:path+'.'+i.path})));
  if(stage.sensorTargetsK)for(const id of c.monitorNodeIds||[])if(!own(stage.sensorTargetsK,id))issues.push(issue(context,'missing-article-target',path+'.sensorTargetsK.'+id,'Every monitored article needs its own target for this plateau.'));
 }
 let previous=-Infinity;
 for(const [index,point]of (c.timeline||[]).entries()){
  const path='case.timeline.'+index;conditions(point,path);
  if(!finite(point.timeS)||point.timeS<0||point.timeS<previous)issues.push(issue(context,'invalid-timeline',path+'.timeS','Environmental sample times must be finite, nonnegative and ordered.'));previous=point.timeS;
 }
 for(const id of c.monitorNodeIds||[])if(!nodes.has(id))issues.push(issue(context,'missing-monitor','case.monitorNodeIds.'+id,'The monitored article node does not exist.'));
 for(const [label,record]of [['item',item],['plan',plan],['model',model],['case',c]]){
  if(!record)continue;
  if(!record.sourceIds?.length)issues.push(issue(context,'missing-provenance',label+'.sourceIds','The calculation needs a traceable engineering basis.'));
  for(const id of record.sourceIds||[])if(!sources[id])issues.push(issue(context,'unknown-source',label+'.sourceIds.'+id,'The source identifier does not resolve in this configuration.'));
 }
 return issues;
}

/** Check execution health without interpreting a predicted shortfall as a bug. */
export function inspectThermalPrediction(run,context={}){
 const issues=[],c={domain:'thermal',...context};
 if(!run)return [issue(c,'missing-prediction','run','No thermal prediction was returned.')];
 try{if(JSON.stringify(run).length>thermalPredictionCharacterBudget)issues.push(issue(c,'artifact-size','run.artifact','The default prediction exceeds its 3,500,000-character retention budget. Increase recorded sample spacing while preserving integration, event and extrema resolution.'));}
 catch(error){issues.push(issue(c,'artifact-serialization','run.artifact','The default prediction cannot be serialized for retention: '+error.message));}
 issues.push(...validateEngineeringFields(run,[{path:'durationS',exclusiveMin:0},{path:'frames',type:'array',minLength:2},{path:'summary.numerics.steps',exclusiveMin:0},{path:'summary.numerics.maxResidualW',min:0},{path:'summary.numerics.totalAppliedJ'},{path:'summary.numerics.totalRejectedJ'},{path:'summary.numerics.totalStoredJ'}],c));
 const numerics=run.summary?.numerics||{},energies=[numerics.totalAppliedJ,numerics.totalRejectedJ,numerics.totalStoredJ];
 if(energies.every(finite)){
  const residual=Math.abs(energies[0]-energies[1]-energies[2]),tolerance=Math.max(1,1e-8*Math.max(...energies.map(Math.abs)));
  if(residual>tolerance)issues.push(issue(c,'energy-conservation','run.summary.numerics','The predicted energy ledger does not close: '+residual.toPrecision(5)+' J residual exceeds '+tolerance.toPrecision(5)+' J.'));
 }
 issues.push(...validateEngineeringFields(numerics.convergence||{},[{path:'refinedStepS',exclusiveMin:0},{path:'maxTemperatureDeltaK',min:0},{path:'durationDeltaS',min:0},{path:'toleranceK',exclusiveMin:0},{path:'responseMaxTemperatureDeltaK',min:0},{path:'responseComparedSamples',exclusiveMin:0},{path:'maxStageDurationDeltaS',min:0},{path:'maxStageEndDeltaS',min:0}],c).map(i=>({...i,path:'run.summary.numerics.convergence.'+i.path})));
 issues.push(...findNonfiniteEngineeringValues(numerics.convergence,c,'run.summary.numerics.convergence'));
 const ids=(run.nodes||[]).map(n=>n.id);let previous=-Infinity;
 for(const [index,frame]of (run.frames||[]).entries()){
  if(!finite(frame.timeS)||frame.timeS<previous)issues.push(issue(c,'invalid-result-time','run.frames.'+index+'.timeS','Result times must be finite and ordered.'));previous=frame.timeS;
  for(const id of ids)if(!finite(frame.temperaturesK?.[id])||frame.temperaturesK[id]<=0)issues.push(issue(c,'invalid-result-temperature','run.frames.'+index+'.temperaturesK.'+id,'Every modeled node must retain a positive finite result temperature.'));
 }
 if(run.provenance?.measuredData!==false||run.provenance?.kind!=='numerical-prediction'||['verified','accepted','qualified'].includes(run.verificationStatus)||run.status!=='predicted')issues.push(issue(c,'prediction-provenance','run.verificationStatus','A numerical prediction must not claim measured or accepted hardware evidence.'));
 return issues;
}
