import assert from 'node:assert/strict';
import {runThermalAnalysis,thermalRunFrame,validateThermalModel,correlateThermalMeasurements} from './dist/thermal-analysis.js';
import {buildThermalAnalysisModel,buildThermalCase} from './dist/thermal-analysis-model.js';
import {buildThermalProgram,thermalProgramForItem} from './dist/thermal-program.js';
import {defaults,sizeDesign} from './dist/design.js';
import {buildPartsCatalog} from './dist/parts-catalog.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {referenceCenterOrder} from './dist/reference-centers.js';

const close=(actual,expected,tol=1e-7)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=tol,`${actual} versus ${expected}, tolerance ${tol}`);
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const base=(nodes,extra={})=>({id:'test-model',revision:'test-r1',configurationId:'test-config',configurationFingerprint:'test-fingerprint',available:true,nodes:nodes.map(n=>({label:n.id,loadW:0,...n})),boundaries:[],conductors:[],radiation:[],convection:[],heaters:[],heatPumps:[],...extra});
const sequence=(seconds=600,extra={})=>({id:'test-case',kind:'tvac-cycling',dtS:1,sampleEveryS:10,steps:[{id:'timeline',label:'Controlled exposure',type:'timeline',durationS:seconds}],...extra});
const solve=(m,c,o={})=>runThermalAnalysis(m,c,{verifyConvergence:false,...o});

test('An isolated applied load stores exactly the supplied energy',()=>{
 const m=base([{id:'article',capacityJPerK:2000,initialK:300,loadW:10}]),r=solve(m,sequence(1000));
 close(r.frames.at(-1).temperaturesK.article,305,1e-8);close(r.summary.numerics.totalStoredJ,10000,1e-6);close(r.summary.numerics.integratedResidualJ,0,1e-6);
});
test('Internal conduction conserves energy and approaches the weighted equilibrium',()=>{
 const m=base([{id:'a',capacityJPerK:1000,initialK:400},{id:'b',capacityJPerK:2000,initialK:250}],{conductors:[{id:'contact',from:'a',to:'b',conductanceWPerK:10}]}),r=solve(m,sequence(1000)),f=r.frames.at(-1);
 close(1000*f.temperaturesK.a+2000*f.temperaturesK.b,900000,1e-5);close(f.temperaturesK.a,300,.001);close(f.temperaturesK.b,300,.001);close(r.summary.numerics.maxResidualW,0,1e-6);
});
test('A conductive step agrees with the analytic first-order transient and refines',()=>{
 const m=base([{id:'a',capacityJPerK:1000,initialK:400}],{boundaries:[{id:'fixture',temperatureK:300}],conductors:[{id:'c',from:'a',boundaryId:'fixture',conductanceWPerK:10}]}),coarse=solve(m,sequence(200,{dtS:10})),fine=solve(m,sequence(200,{dtS:.5})),analytic=300+100*Math.exp(-2);
 assert.ok(Math.abs(fine.frames.at(-1).temperaturesK.a-analytic)<Math.abs(coarse.frames.at(-1).temperaturesK.a-analytic));close(fine.frames.at(-1).temperaturesK.a,analytic,.07);
 const verified=runThermalAnalysis(m,sequence(200,{dtS:1}));assert.equal(verified.summary.numerics.convergence.refinedStepS,.5);assert.ok(verified.summary.numerics.convergence.maxTemperatureDeltaK>0);
});
test('Nonlinear radiation reaches the Stefan–Boltzmann equilibrium and can heat an article',()=>{
 const sigma=5.670374419e-8,m=base([{id:'a',capacityJPerK:100,initialK:300,loadW:50}],{boundaries:[{id:'shroud',temperatureK:250}],radiation:[{id:'r',from:'a',boundaryId:'shroud',areaM2:1,emissivity:.8}]}),r=solve(m,sequence(4000,{dtS:5})),eq=(250**4+50/(sigma*.8))**.25;
 close(r.frames.at(-1).temperaturesK.a,eq,1e-5);close(r.summary.numerics.maxResidualW,0,1e-6);
 const warm=solve({...m,nodes:[{id:'a',capacityJPerK:100,initialK:200,loadW:0}]},sequence(20));assert.ok(warm.frames.at(-1).temperaturesK.a>200);
});
test('Radiating-node exchange and limited heat transport remain conservative',()=>{
 const m=base([{id:'a',capacityJPerK:1000,initialK:400},{id:'b',capacityJPerK:1000,initialK:300}],{conductors:[{id:'pipe',from:'a',to:'b',conductanceWPerK:10,capacityW:10}],radiation:[{id:'mutual',from:'a',to:'b',areaM2:.1,emissivity:.5}]}),r=solve(m,sequence(100)),f=r.frames.at(-1);
 close(f.temperaturesK.a+f.temperaturesK.b,700,1e-6);assert.equal(f.links.find(l=>l.id==='pipe').saturated,true);close(f.links.find(l=>l.id==='pipe').heatW,10);close(r.summary.numerics.maxResidualW,0,1e-6);
});
test('Vacuum excludes air convection while an atmospheric case applies it',()=>{
 const m=base([{id:'a',capacityJPerK:1000,initialK:300}],{boundaries:[{id:'air',temperatureK:350}],convection:[{id:'air',from:'a',boundaryId:'air',areaM2:1,coefficientWPerM2K:10}]}),vac=solve(m,sequence(100)),air=solve(m,sequence(100,{kind:'atmospheric-cycling',convectionEnabled:true}));
 close(vac.frames.at(-1).temperaturesK.a,300);assert.ok(air.frames.at(-1).temperaturesK.a>330);assert.throws(()=>solve(m,sequence(10,{convectionEnabled:true})),/convection/);
});
test('Finite thermostatic heater power is retained in the energy ledger',()=>{
 const m=base([{id:'a',capacityJPerK:1000,initialK:280}],{heaters:[{id:'h',nodeId:'a',maxW:100,onK:283,offK:287}]}),r=solve(m,sequence(200));
 assert.ok(r.frames.at(-1).temperaturesK.a>=287&&r.frames.at(-1).temperaturesK.a<287.11);close(r.summary.numerics.totalStoredJ,r.summary.heaterEnergyJ.a,1e-6);
 assert.ok(r.frames.some(f=>f.heaterW===100));assert.ok(r.frames.at(-1).heaterW===0);
});
test('Heat-pump hot rejection equals cold removal plus work and rejects impossible COP',()=>{
 const m=base([{id:'cold',capacityJPerK:1000,initialK:300},{id:'hot',capacityJPerK:1000,initialK:400}],{heatPumps:[{id:'hp',from:'cold',to:'hot',cop:2,coldCapacityW:10,setpointK:295,bandK:5}]}),r=solve(m,sequence(100)),f=r.frames.at(-1),hp=f.heatPumps[0];
 close(hp.hotRejectionW,hp.coldRemovalW+hp.inputW);close(r.summary.numerics.totalStoredJ,r.summary.heatPumpEnergyJ.hp,1e-6);
 const invalid=solve({...m,heatPumps:[{...m.heatPumps[0],cop:4}]},sequence(10));assert.equal(invalid.frames.at(-1).heatPumps[0].coldRemovalW,0);assert.ok(invalid.summary.warnings.some(w=>w.includes('Carnot')));
});
test('Dwell depends on article stabilization and target, never shroud arrival',()=>{
 const m=base([{id:'a',capacityJPerK:1e6,initialK:300}],{boundaries:[{id:'shroud',temperatureK:330}],conductors:[{id:'c',from:'a',boundaryId:'shroud',conductanceWPerK:1}]}),c=sequence(100,{monitorNodeIds:['a'],steps:[{id:'hold',label:'Article hold',type:'hold',maxDurationS:1200,boundariesK:{shroud:330},sensorTargetsK:{a:330},dwellS:60,stabilityWindowS:60,stabilityKPerHour:1,toleranceK:1}]}),r=solve(m,c);
 assert.equal(r.summary.stages[0].completed,false);assert.equal(r.summary.stages[0].dwellAccumulatedS,0);
 const stable=solve({...m,nodes:[{id:'a',capacityJPerK:100,initialK:330}],conductors:[]},c);assert.equal(stable.summary.stages[0].endS,120);assert.equal(stable.summary.stages[0].stabilizedAtS,60);
});
test('Invalid models, unknown boundaries and non-finite loads are rejected',()=>{
 assert.ok(validateThermalModel(base([{id:'a',capacityJPerK:0,initialK:300}])).length);
 const m=base([{id:'a',capacityJPerK:100,initialK:300}]);assert.throws(()=>solve(m,sequence(10,{steps:[{id:'x',type:'ramp',durationS:10,boundariesK:{missing:300}}]})),/invalid boundary/);
 assert.throws(()=>solve(m,sequence(10,{steps:[{id:'x',type:'timeline',durationS:10,loadsW:{a:Infinity}}]})),/invalid loadsW/);
});
test('Interpolation and measured-data comparison retain run identity and separate verification',()=>{
 const r=solve(base([{id:'a',capacityJPerK:100,initialK:300,loadW:10}]),sequence(100)),f=thermalRunFrame(r,.25);close(f.timeS,25);close(f.temperaturesK.a,302.5,1e-8);assert.equal(f.interpolated,true);
 const comparison=correlateThermalMeasurements(r,[{timeS:25,nodeId:'a',temperatureK:301.5},{timeS:50,nodeId:'a',temperatureK:306},{timeS:500,nodeId:'a',temperatureK:300}]);close(comparison.nodes[0].biasK,0,1e-8);close(comparison.nodes[0].rmseK,1,1e-8);assert.equal(comparison.rejected.length,1);assert.equal(comparison.verificationStatus,'unverified');assert.equal(r.provenance.measuredData,false);
});

const h=sizeDesign(defaults),catalog=buildPartsCatalog(h),program=buildThermalProgram(h,catalog);
test('Item selection retains configuration identity and mass without borrowing child capability',()=>{
 const info=thermalProgramForItem(program,'flight:02.02'),record=catalog.records.find(r=>r.id===info.item.id),m=buildThermalAnalysisModel(h,{record,catalog,item:info.item,config:program.config});
 assert.equal(m.configurationId,program.config.id);assert.equal(m.articleNodeId,'article');close(m.nodes[0].capacityJPerK,info.item.massKg*h.input.packHeatKJkgK*1000);assert.equal(m.nodes[0].limits.operating.minK,273);
 const child=catalog.records.find(r=>r.id==='flight:02.02.01'),ci=thermalProgramForItem(program,child.id),unknown=buildThermalAnalysisModel(h,{record:child,catalog,item:ci.item,config:program.config});assert.equal(unknown.available,true);assert.equal(unknown.propertyAllocation.articleKind,'isolated-detail');assert(unknown.nodes[0].massKg<m.nodes[0].massKg);assert.equal(unknown.heaters.length,0,'a housing does not inherit its parent battery heater');
 const allocated=buildThermalAnalysisModel(h,{record:child,catalog,item:ci.item,config:program.config,overrides:{massKg:1,specificHeatJPerKgK:900,areaM2:.1,loadW:0,conductanceWPerK:1,emissivity:.8,absorptivity:.2}});assert.equal(allocated.available,true);assert.equal(allocated.nodes[0].limits.operating.minK,ci.item.thermal.operating.minK);assert.equal(allocated.nodes[0].massKg,1);
 const testCase=buildThermalCase(m,info.plans.find(p=>p.kind==='tvac-cycling'),{approach:'acceptance',cycles:1});assert.equal(testCase.approach,'acceptance');assert.equal(testCase.convectionEnabled,false);assert.ok(testCase.steps.some(s=>s.sensorTargetsK?.article===318));
 assert.equal(buildThermalCase(m,{kind:'tvac-cycling'},{cycles:0}).available,false);
});
test('Provider hardware uses explicit input allocations and has no inherited flight rating',()=>{
 const record=catalog.records.find(r=>r.id==='launch:vehicle'),item=thermalProgramForItem(program,record.id).item,m=buildThermalAnalysisModel(h,{record,catalog,item,config:program.config});assert.equal(m.available,true);assert.equal(m.propertyAllocation.articleKind,'representative-interface');assert.equal(m.nodes.length,2);
 const allocated=buildThermalAnalysisModel(h,{record,catalog,item,config:program.config,overrides:{massKg:100,specificHeatJPerKgK:500,areaM2:10,loadW:100,conductanceWPerK:5,emissivity:.7,absorptivity:.3}});assert.equal(allocated.available,true);assert.equal(allocated.nodes[0].limits.operating.minK,item.thermal.operating.minK);
 const mission=buildThermalCase(allocated,{kind:'thermal-analysis'});assert.equal(mission.available,true);assert.equal(mission.kind,'installed-environment');assert.equal(mission.convectionEnabled,true);assert.equal(mission.timeline.length,0);assert(!mission.steps.some(s=>s.externalFluxW));
 const chamber=buildThermalCase(allocated,{kind:'atmospheric-cycling'},{coldK:280,hotK:320,cycles:1});assert.equal(chamber.available,true);assert.equal(chamber.convectionEnabled,true);
});
test('Edited node-owner requirements reach the coupled vehicle assessment',()=>{
 const updated=buildThermalProgram(h,catalog,{overrides:{items:{'flight:02.02':{operatingMaxK:310}}}}),item=thermalProgramForItem(updated,'thermal:spacecraft').item,m=buildThermalAnalysisModel(h,{catalog,item,config:updated.config});assert.equal(m.nodes.find(n=>n.id==='battery').limits.operating.maxK,310);assert.equal(m.configurationId,updated.config.id);assert.notEqual(m.configurationId,program.config.id);
});
test('All six reference configurations produce distinct, conservative thermal cases',()=>{
 const fingerprints=new Set(),kinds=new Set();
 for(const id of referenceCenterOrder){
  const hardware=sizeDesign(buildReferenceDesign(id)),parts=buildPartsCatalog(hardware),p=buildThermalProgram(hardware,parts),m=buildThermalAnalysisModel(hardware,{catalog:parts,item:thermalProgramForItem(p,'thermal:spacecraft').item,config:p.config});assert.equal(m.available,true,id);assert.equal(validateThermalModel(m).length,0,id);fingerprints.add(m.fingerprint);kinds.add(m.thermalTopology);
  if(m.thermalTopology==='passive-local'){assert.ok(m.nodes.some(n=>n.id==='bus'));assert.ok(m.conductors.some(c=>c.id==='local-heat-pipes'));assert.equal(m.heatPumps.length,0);}
  if(m.thermalTopology==='heat-lift')assert.equal(m.heatPumps.length,1);
  if(m.thermalTopology==='redundant-pumped')assert.ok(m.nodes.some(n=>n.id==='coolant-2'));
  const c=buildThermalCase(m,{kind:'thermal-analysis'},{orbits:.1,dtS:10}),r=solve(m,c);assert.equal(c.available,true,id);assert.ok(r.frames.length>1,id);assert.ok(r.summary.numerics.maxResidualW<.001,id);assert.ok(r.frames.every(f=>Object.values(f.temperaturesK).every(Number.isFinite)),id);assert.equal(r.configurationId,p.config.id);assert.equal(r.verificationStatus,'unverified');
 }
 assert.equal(fingerprints.size,6);assert.equal(kinds.size,4);
});
test('Mission eclipse events and thermal-balance cases retain real boundaries',()=>{
 const m=buildThermalAnalysisModel(h,{catalog,config:program.config}),c=buildThermalCase(m,{kind:'thermal-analysis'},{orbits:2,dtS:20});assert.ok(c.eventTimesS.length>0);assert.ok(c.timeline.some(s=>s.environment.eclipse));assert.ok(c.timeline.some(s=>!s.environment.eclipse));assert.ok(c.timeline.filter(s=>s.environment.eclipse).every(s=>s.environment.radiatorDirectSolarW===0));
 const balance=buildThermalCase(m,{kind:'thermal-balance'},{orbits:1,maxPlateauS:600,dwellS:60,stabilityWindowS:60});assert.equal(balance.available,true);assert.deepEqual(balance.steps.filter(s=>s.type==='hold').map(s=>s.id),['balance-hot','balance-cold','balance-survival']);assert.equal(balance.steps.find(s=>s.id==='balance-survival').loadFraction,0);assert.equal(balance.steps[0].boundariesK.fixture,294);assert.ok(balance.steps.find(s=>s.id==='balance-hot').externalFluxW.radiator>=0);assert.equal(balance.steps.find(s=>s.id==='balance-hot').sensorTargetsK,undefined);
 const r=solve(m,balance);assert.ok(r.summary.numerics.maxResidualW<.001);assert.equal(r.caseKind,'thermal-balance');
});
test('A local orbital case exposes its prescribed mounting boundary separately from article response',()=>{
 const info=thermalProgramForItem(program,'flight:02.02'),record=catalog.records.find(r=>r.id===info.item.id),m=buildThermalAnalysisModel(h,{record,catalog,item:info.item,config:program.config}),c=buildThermalCase(m,{kind:'thermal-analysis'},{ambientK:307,orbits:.1,dtS:10});
 assert.equal(c.editableFields.find(f=>f.id==='ambientK').label,'Installed mounting boundary');assert.ok(c.assumptions.some(a=>a.includes('does not solve the surrounding parent assembly temperatures')));assert.ok(c.timeline.every(f=>f.boundariesK.fixture===307));
 const r=solve(m,c);assert.equal(r.frames.at(-1).boundariesK.fixture,307);assert.notEqual(r.frames.at(-1).temperaturesK.interface,r.frames[0].temperaturesK.interface);assert.notEqual(r.frames.at(-1).temperaturesK.interface,307);
});
test('Large-capacity recovery converges at floating-point precision and keeps recording separate',()=>{
 const hardware=sizeDesign(buildReferenceDesign('orbital-1-202609')),parts=buildPartsCatalog(hardware),p=buildThermalProgram(hardware,parts),info=thermalProgramForItem(p,'thermal:spacecraft'),m=buildThermalAnalysisModel(hardware,{catalog:parts,item:info.item,config:p.config}),c=buildThermalCase(m,info.plans.find(p=>p.kind==='tvac-cycling')),r=runThermalAnalysis(m,c);
 assert.equal(r.summary.numerics.nominalStepS,20);assert.equal(r.summary.numerics.recordedSampleEveryS,c.sampleEveryS);assert(c.sampleEveryS>=180&&c.sampleEveryS<=3600);assert.ok(r.summary.numerics.maxResidualW<.001);assert.ok(Number.isFinite(r.summary.numerics.convergence.maxTemperatureDeltaK));assert.equal(r.summary.numerics.convergence.status,r.summary.numerics.convergence.maxTemperatureDeltaK<=.25?'within-study-tolerance':'refinement-needed');assert.ok(JSON.stringify(r).length<3_500_000);assert.ok(r.summary.numerics.steps>r.frames.length*5);
});
test('Fabric article targets and derived commands retain their distinct physical roles',()=>{
 const selected=thermalProgramForItem(program,'flight:01.04'),model=buildThermalAnalysisModel(h,{record:catalog.byId[selected.item.id],catalog,item:selected.item,config:program.config}),plan=selected.plans.find(p=>p.kind==='tvac-cycling'),c=buildThermalCase(model,plan);
 assert.equal(c.available,true);close(c.articleTargets.cold.article,273.15);close(c.articleTargets.hot.article,308.15);assert(c.parameters.hotK<c.articleTargets.hot.article);assert.equal(c.boundaryAllocation.hot.status,'derived-steady-balance');
 const edited=buildThermalCase(model,plan,{hotK:300});assert.equal(edited.boundaryAllocation.hot.status,'explicit-boundary-command');close(edited.articleTargets.hot.article,308.15);
 assert.equal(buildThermalCase(model,plan,{hotK:null}).available,false);assert.equal(buildThermalCase(model,plan).available,true);
 const isolated=buildThermalAnalysisModel(h,{record:catalog.byId[selected.item.id],catalog,item:selected.item,config:program.config,overrides:{conductanceWPerK:0,fixtureConductanceWPerK:0,areaM2:0,loadW:0}}),uncontrolled=buildThermalCase(isolated,plan);
 assert.equal(uncontrolled.boundaryAllocation.hot.status,'uncontrolled-article');assert(!Object.hasOwn(uncontrolled.boundaryAllocation.hot,'commandK'));
 const heated=structuredClone(model);heated.heaters=[{id:'h',nodeId:'article',maxW:10,onK:307,offK:310}];const deadband=buildThermalCase(heated,plan);assert(deadband.boundaryAllocation.hot.heaterAssumption.startsWith('Target lies'));assert.equal(deadband.boundaryAllocation.hot.heaterW,0);
});
test('Local scope controls exposure, contained-gas capacity and installed atmosphere',()=>{
 const local=id=>{const s=thermalProgramForItem(program,id);return buildThermalAnalysisModel(h,{record:catalog.byId[id],catalog,item:s.item,config:program.config});};
 const battery=local('flight:02.02'),orbit=buildThermalCase(battery,{kind:'thermal-analysis'},{orbits:.1});assert(battery.radiation.some(e=>e.boundaryId==='fixture'&&e.activeIn?.includes('orbit')));assert(orbit.timeline.every(s=>s.externalFluxW.article===0));assert(!orbit.editableFields.some(f=>f.id==='earthViewFactor'||f.id==='solarIncidenceCos'));
 const helium=local('flight:06.08');close(helium.nodes[0].specificHeatJPerKgK,3116);close(helium.nodes[0].areaM2,0);assert.equal(helium.propertyAllocation.articleKind,'contained-inventory');
 for(const id of ['flight:05.03.03','flight:07.05.01']){const specimen=local(id);assert.equal(specimen.propertyAllocation.articleKind,'representative-coupon','coatings and insulation cannot inherit complete housing/cable mass');assert(specimen.nodes[0].massKg<.01);close(specimen.nodes[0].areaM2,.02);}
 const provider=local('launch:vehicle'),installed=buildThermalCase(provider,{kind:'thermal-analysis',parameters:{pressurePa:.001}});assert.equal(installed.kind,'installed-environment');assert.equal(installed.pressurePa,101325);assert(installed.convectionEnabled);
 const missing=structuredClone(provider);missing.nodes.find(n=>n.id==='article').limits.operating={minK:null,maxK:null};assert.equal(buildThermalCase(missing,{kind:'thermal-analysis'}).available,false);
});
test('Subsystems 04 through 09 use their own allocated child articles',()=>{
 for(const code of ['04','05','06','07','08','09']){const s=thermalProgramForItem(program,'thermal:subsystem:'+code),m=buildThermalAnalysisModel(h,{catalog,item:s.item,config:program.config});assert(m.available);assert(m.targetNodeIds.length>0);assert(m.targetNodeIds.every(id=>id.startsWith('flight:'+code+'.')));assert.equal(m.nodes.length,m.targetNodeIds.length*2);assert.equal(validateThermalModel(m).length,0);for(const n of m.nodes.filter(n=>m.targetNodeIds.includes(n.id)))assert(Number.isFinite(n.limits.operating.minK)&&Number.isFinite(n.limits.operating.maxK));}
});
console.log(`${checks} thermal analysis checks passed.`);
