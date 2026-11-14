import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const root=process.argv[2]||process.cwd(),moduleAt=name=>import(pathToFileURL(root+'/dist/'+name));
const [{mountThermalEngineering},{sizeDesign,missionStarter},{buildPartsCatalog},{runThermalAnalysis,thermalRunFrame},{buildThermalProgram,thermalProgramForItem}]=await Promise.all([moduleAt('thermal-engineering-ui.js'),moduleAt('design.js'),moduleAt('parts-catalog.js'),moduleAt('thermal-analysis.js'),moduleAt('thermal-program.js')]);
const {buildThermalAnalysisModel,buildThermalCase}=await moduleAt('thermal-analysis-model.js');

// A deliberately small event/host adapter exercises controller state without
// parsing HTML or substituting a browser implementation for the real solver.
const callbacks=new Map(),storage=new Map();let nextFrame=0,clock=1000;
globalThis.document={activeElement:null};
globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
globalThis.requestAnimationFrame=fn=>{const id=++nextFrame;callbacks.set(id,fn);return id;};
globalThis.cancelAnimationFrame=id=>callbacks.delete(id);
delete globalThis.Worker;
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const advance=async(dt=20)=>{clock+=dt;const pending=[...callbacks.values()];callbacks.clear();pending.forEach(fn=>fn(clock));await settle();};
const field=(id,value)=>({dataset:{teField:id},type:'number',value:String(value),checkValidity:()=>true,reportValidity(){},closest:()=>null});
function host(){
 const events=new Map(),groups=new Map();
 return {innerHTML:'',events,groups,contains:()=>true,addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:(name,fn)=>{if(events.get(name)===fn)events.delete(name);},querySelector:()=>null,querySelectorAll:selector=>groups.get(selector)||[],
  fields(group,values){groups.set('[data-te-group="'+group+'"]',Object.entries(values).map(([id,value])=>field(id,value)));},
  click(action,extra={}){const target={dataset:{teAction:action,...extra},closest(){return this;},disabled:false};events.get('click')?.({target});},
  tab(value){const target={dataset:{teTab:value},closest(){return this;},disabled:false};events.get('click')?.({target});},
  plan(value){events.get('change')?.({target:{value,matches:selector=>selector==='[data-te-plan-select]'}});},
  cursor(value){events.get('input')?.({target:{value:String(value),matches:selector=>selector==='[data-te-cursor]'}});}
 };
}
const h=sizeDesign(missionStarter('text')),catalog=buildPartsCatalog(h),battery=catalog.byId['flight:02.02'],events=[],opened=[],view=host();
const alternatePlan=thermalProgramForItem(buildThermalProgram(h,catalog,{phase:'D'}),battery.id).plans.find(p=>p.kind==='thermal-analysis');assert(alternatePlan);
view.fields('case',{cycles:1,rampKPerMin:30,maxPlateauS:60,stabilityWindowS:20,dwellS:0,dtS:20,sampleEveryS:20,coldK:280,hotK:310});
const controller=mountThermalEngineering(view,{hardware:h,catalog,record:battery,phase:'D',compact:true,onRun:(run,meta)=>events.push({type:'run',run,meta}),onFrame:(frame,run,progress)=>events.push({type:'frame',frame,run,progress}),onOpenPart:id=>opened.push(id)});
const checks=[];
const record=name=>checks.push(name);
try{
 assert.equal(controller.getState().itemId,battery.id);assert(view.innerHTML.includes('Thermal engineering'));
 view.click('run');await advance();let first=controller.getState().run;
 assert(first?.frames.length>1,'real solver calculation completes through the controller');assert.equal(controller.getState().stale,false);
 const published=events.find(e=>e.type==='run'&&e.run);assert(published);assert.equal(published.run.id,first.id);assert.equal(published.meta.setting,'thermal-vacuum');
 const snapshot=JSON.stringify(first);view.cursor(500);let current=controller.getState(),last=events.filter(e=>e.type==='frame').at(-1);assert.equal(last.run.id,first.id);assert.equal(last.progress,.5);assert.deepEqual(last.frame.temperaturesK,thermalRunFrame(first,.5).temperaturesK);assert.equal(JSON.stringify(first),snapshot);record('real solver run and immutable frame contract');

 view.click('play');await advance(1000);await advance(1000);assert(controller.getState().playing);const heldProgress=controller.getState().progress,releaseA=controller.holdPlayback(),releaseB=controller.holdPlayback(),beforeHold=events.length;
 await advance(5000);assert.equal(controller.getState().progress,heldProgress);assert.equal(events.length,beforeHold);releaseA();releaseA();assert.equal(events.length,beforeHold);assert.equal(controller.getState().playing,false);releaseB();assert.equal(controller.getState().playing,true);assert.equal(controller.getState().progress,heldProgress);record('nested capture holds suppress frames and resume prior playback');
 view.click('play');assert.equal(controller.getState().playing,false);const releasePaused=controller.holdPlayback();releasePaused();assert.equal(controller.getState().playing,false);record('previously paused playback remains paused after capture');

 const releaseStale=controller.holdPlayback(),beforeStale=events.length;view.plan(alternatePlan.id);assert.equal(controller.getState().planId,alternatePlan.id);assert(controller.getState().stale);assert.equal(events.length,beforeStale,'held input invalidation is queued');releaseStale();const cleared=events.slice(beforeStale);assert(cleared.some(e=>e.type==='run'&&e.run===null));assert(!cleared.some(e=>e.type==='frame'),'stale temperatures never repaint the selected part');record('plan changes queue null-run invalidation without stale frames');
 controller.selectCaseForSetting('thermal-vacuum');view.click('open-run',{teRun:first.id});assert.equal(controller.getState().stale,false);assert.equal(controller.getState().run.id,first.id);record('recorded run reopens only against matching model and case');

 view.click('choose-item',{teItem:'flight:01.01'});assert.deepEqual(opened,['flight:01.01']);assert.equal(controller.getState().itemId,battery.id,'compact routing leaves mutation to the parts navigator');record('compact part navigation keeps the viewer and analysis selection aligned');

 const workers=[];
 class FakeWorker{
  constructor(){this.terminated=false;workers.push(this);}
  postMessage(data){this.data=data;}
  terminate(){this.terminated=true;}
  finish(run){this.onmessage?.({data:{ok:true,run:run||runThermalAnalysis(this.data.model,this.data.caseDefinition,this.data.options)}});}
 }
 globalThis.Worker=FakeWorker;
 view.click('run');await advance();const heldWorker=workers.at(-1);assert(heldWorker?.data);
 const releaseResultA=controller.holdPlayback(),releaseResultB=controller.holdPlayback(),beforeResult=events.length;heldWorker.finish();await settle();const heldRun=controller.getState().run;assert(heldRun);assert.equal(events.length,beforeResult,'worker completion cannot change a captured frame');releaseResultA();assert.equal(events.length,beforeResult);releaseResultB();const flushed=events.slice(beforeResult);assert.equal(flushed[0].type,'run');assert.equal(flushed[0].run.id,heldRun.id);assert(flushed.some(e=>e.type==='frame'&&e.run.id===heldRun.id));record('worker result is published before its frame after final capture release');

 view.click('run');await advance();const oldWorker=workers.at(-1);view.plan(alternatePlan.id);view.click('run');await advance();const newWorker=workers.at(-1);assert.notEqual(oldWorker,newWorker);assert(oldWorker.terminated);oldWorker.finish(first);await settle();assert(!newWorker.terminated,'an old completion cannot terminate the newer worker');newWorker.finish();await settle();assert.equal(controller.getState().run.caseKind,'orbital-transient');assert.equal(controller.getState().stale,false);record('late canceled results cannot overwrite or terminate newer calculations');

 const count=workers.length;view.click('run');controller.destroy();const eventsAtDestroy=events.length;await advance();assert.equal(workers.length,count,'destroy before the first frame prevents worker creation');assert.equal(events.length,eventsAtDestroy);assert.equal(view.events.size,0);assert.equal(view.innerHTML,'');record('destroy cancels startup and removes all event subscriptions');

 delete globalThis.Worker;
 const fabric=catalog.byId['flight:01.04'],program=buildThermalProgram(h,catalog,{phase:'D'}),selected=thermalProgramForItem(program,fabric.id),fabricPlan=selected.plans.find(p=>p.kind==='tvac-cycling');
 const fabricModel=buildThermalAnalysisModel(h,{record:fabric,catalog,item:selected.item,config:program.config}),planned=buildThermalCase(fabricModel,fabricPlan),fabricView=host();
 const populate=(definition,changes={})=>{fabricView.tab('test');fabricView.fields('case',{...Object.fromEntries(definition.editableFields.map(f=>[f.id,f.value])),...changes});};
 const fabricController=mountThermalEngineering(fabricView,{hardware:h,catalog,record:fabric,phase:'D',compact:true});
 try{
  populate(planned);fabricView.click('run');await advance();const defaultRun=fabricController.getState().run;assert(defaultRun);
  for(const side of ['cold','hot'])assert.equal(defaultRun.caseDefinition.boundaryAllocation[side].status,'derived-steady-balance','Run must preserve the calculated default and its provenance');
  assert.equal(defaultRun.caseDefinition.parameters.hotK,planned.parameters.hotK);assert(fabricView.innerHTML.includes('Modeled article:'));assert(fabricView.innerHTML.includes(fabricModel.scope));
  populate(defaultRun.caseDefinition,{hotLoadFraction:.5});fabricView.click('run');await advance();const adjusted=fabricController.getState().run;
  assert.equal(adjusted.caseDefinition.boundaryAllocation.hot.status,'derived-steady-balance');assert(adjusted.caseDefinition.parameters.hotK>defaultRun.caseDefinition.parameters.hotK,'less article heat requires a warmer default chamber command');
  assert.equal(adjusted.caseDefinition.boundaryAllocation.hot.heatW,.5*defaultRun.caseDefinition.boundaryAllocation.hot.heatW);record('unchanged displayed defaults retain provenance and respond to an edited heat load');
  populate(adjusted.caseDefinition,{hotK:310});fabricView.click('run');await advance();const explicit=fabricController.getState().run;
  assert.equal(explicit.caseDefinition.parameters.hotK,310);assert.equal(explicit.caseDefinition.boundaryAllocation.hot.status,'explicit-boundary-command');
  populate(explicit.caseDefinition,{hotLoadFraction:.3});fabricView.click('run');await advance();assert.equal(fabricController.getState().run.caseDefinition.parameters.hotK,310,'a deliberately edited command remains fixed');
  populate(fabricController.getState().run.caseDefinition,{hotK:''});fabricView.click('apply-case');assert(fabricView.innerHTML.includes('Inputs still required'));assert(/data-te-action="run"[^>]*disabled/.test(fabricView.innerHTML));assert(/data-te-field="hotK" value=""/.test(fabricView.innerHTML),'a deliberately cleared field must stay visibly blank');
  fabricView.fields('case',{hotK:planned.parameters.hotK});fabricView.click('apply-case');assert(!fabricView.innerHTML.includes('Inputs still required'),'entering the original default also recovers a deliberately cleared field');
  fabricView.click('reset-case');assert(!fabricView.innerHTML.includes('Inputs still required'));assert(fabricView.innerHTML.includes('initial chamber commands account for'));record('explicit chamber edits persist, blank inputs stay visible, and editing or restore recovers the case');
 }finally{fabricController.destroy();}
 console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{controller.destroy();callbacks.clear();delete globalThis.Worker;}
