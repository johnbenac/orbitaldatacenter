import assert from 'node:assert/strict';
import {architectureFamily} from './dist/architecture-families.js';
import {defaults,sizeDesign} from './dist/design.js';
import {routingCraftConfigurations} from './dist/routing-configurations.js';
import {buildElectricalArchitecture,connectorSelections,electricalReadinessContract,validateElectricalArchitecture,resolveElectricalRoutes,electricalBoxLayout} from './dist/electrical-architecture.js';
import {buildElectricalProgram,electricalProgramForItem,runElectricalCheck,validateElectricalProgram} from './dist/electrical-program.js';
import {buildEquipmentList,renderEquipmentList,electricalAssemblyDetails} from './dist/equipment-list.js';
import {buildPartsCatalog} from './dist/parts-catalog.js';
import {buildThermalProgram} from './dist/thermal-program.js';
import {buildThermalAnalysisModel,buildThermalCase} from './dist/thermal-analysis-model.js';
import {thermalModelAllocation} from './dist/thermal-model-allocations.js';
import {inspectThermalScenario} from './dist/engineering-readiness.js';

let cases=0,interfaces=0,parts=0;const baseline=[];
for(const [id,input] of [['custom-study',defaults],...routingCraftConfigurations()]){
 const h=sizeDesign(input),g=buildElectricalArchitecture(h),p=buildElectricalProgram(h),mel=buildEquipmentList(h),catalog=buildPartsCatalog(h),thermal=buildThermalProgram(h,catalog);
 const stationsBefore=JSON.stringify(h.propulsion.stations);electricalBoxLayout(h);assert.equal(JSON.stringify(h.propulsion.stations),stationsBefore,'Rendering connector accommodations must not mutate numerical mass stations');
 assert.deepEqual(validateElectricalArchitecture(g),[],id+' graph completeness');
 assert.deepEqual(validateElectricalProgram(p),[],id+' program completeness');
 assert.equal(buildElectricalArchitecture(h),g,'Hardware identity reuses the pure configuration graph');
 assert(g.harnesses.length>20&&g.ports.length===2*g.harnesses.length);
 assert.equal(g.boxes.filter(b=>b.id.startsWith('ka-')).length,architectureFamily(h).kaTerminalCount,'Every installed Ka terminal has an electrical interface');
 assert.equal(g.boxes.filter(b=>b.id.startsWith('optical-')).length,architectureFamily(h).opticalTerminalCount,'Every installed optical terminal has an electrical interface');
 assert(g.harnesses.some(a=>a.id==='RF-GNSS'),'GNSS receiver has an explicit antenna feeder');
 assert.notDeepEqual(g.boxById.avionics.positionM,g.boxById.pcdu.positionM,'C&DH and PCDU are separate equipment');
 assert.notDeepEqual(g.boxById.avionics.positionM,g.boxById['fabric-1'].positionM,'Payload switch is separate from C&DH');
 for(const a of g.harnesses){
  assert(a.cutLengthM>=a.routeLengthM);
  assert.equal(a.routeBendLimited,false,id+' '+a.id+' cable bend');
  assert(a.pinout.every(n=>n.from&&n.to&&n.net));
  if(a.kind==='power'){
   const type=connectorSelections[a.connectorTypeId];assert(type.acceptedWireAWG.includes(a.wire.awg),'Buildable wire-to-contact termination');
   const rotary=architectureFamily(h).id==='starcloud-inline'&&a.groupId==='array',cableEnds=rotary?4:2,slidingResistanceOhm=a.additionalRotaryResistanceOhm||0;
   assert(Math.abs(a.resistanceOhm-a.wire.resistanceOhm-cableEnds*2*type.contactResistanceBudgetOhm-slidingResistanceOhm)<1e-10,'Every physical cable end and both polarities, plus declared rotary stages, enter circuit loss');
   assert(Math.abs(a.estimatedConnectorKg-cableEnds*a.connectorPairsPerAssembly*type.estimatedPairKg)<1e-10,'Every physical cable end counted in connector material estimate');
   if(rotary){assert.equal(a.physicalRouteSections.length,2*a.quantity*(a.connectorTypeId.startsWith('hv-single')?2:1),'Inline root divides every physical conductor into two cables');assert.equal(a.rootTransfer.rotaryStages,2);assert.equal(a.rootTransfer.projectContactResistanceBudgetOhm,.001);assert.equal(new Set(a.physicalRouteSections.map(s=>s.id)).size,a.physicalRouteSections.length);}
   if(a.voltageV>300)assert(a.connectorTypeId.startsWith('hv-single'),'Single-contact HV selection above300V');
   if(a.id.startsWith('P-SA'))assert.equal(a.operatingVoltageMinV,h.energySystem.electrical.family.sourceMinV,'Solar loss checks use operating voltage, not coldVoc');
  }
  if(a.kind==='control'){assert.equal(a.wire.awg,'26');assert.equal(a.wire.conductorCount,8);assert(a.pinout.some(n=>n.from==='3'&&n.net==='UNPOPULATED'));}
 }
 assert.equal(g.cards.reduce((n,c)=>n+c.massKg,0),12);assert.equal(g.cards.reduce((n,c)=>n+c.powerW,0),45);
 const flightChildren=electricalAssemblyDetails(h);
 for(const [wbs,m] of Object.entries(g.massAccounting)){const children=flightChildren.filter(c=>c.parentWbs===wbs);assert(Math.abs(children.reduce((n,c)=>n+c.extendedMassKg,0)-m.allocatedKg)<1e-8,'Child allocations close exactly to'+wbs);}
 assert(Math.abs(mel.totals.closureKg)<1e-8,'Detailed connectors do not duplicate spacecraft mass');
 const all=electricalProgramForItem(p,'flight:07.05');assert.equal(all.harnesses.length,g.harnesses.filter(a=>a.parentWbs==='07.05').length);
 const ground=electricalProgramForItem(p,'ground:egse-cable');assert.equal(ground.harnesses.length,1);assert.equal(ground.harnesses[0].cutLengthM,3);assert.equal(ground.harnesses[0].allocatedCableKg,0);assert(!g.harnesses.some(a=>a.itemId==='ground:egse-cable'));
 const result=runElectricalCheck(p);assert(result.ready);assert.equal(result.verificationStatus,'open');assert.equal(result.evidenceStatus,'predicted');assert(result.checks.length>g.harnesses.length);
 assert(result.checks.find(c=>c.id==='CDH:retention').limit===h.serviceArchitecture.autonomy.engineeringHistoryRequirementH*3600,'History criterion traces to the active autonomy requirement');
 for(const r of catalog.records.filter(r=>r.electricalThermalModel)){
  const allocation=thermalModelAllocation(r,h);assert.equal(allocation.coverage,'explicit',r.id);assert.notEqual(allocation.articleKind,'representative-coupon');
  const item=thermal.items.find(i=>i.id===r.id);assert(item,id+' '+r.id+' thermal item');
  for(const plan of thermal.plans.filter(plan=>plan.itemId===r.id&&['thermal-analysis','tvac-cycling','thermal-balance','atmospheric-cycling','installed-environment'].includes(plan.kind))){
   const model=buildThermalAnalysisModel(h,{catalog,record:r,item,config:thermal.config}),caseDefinition=buildThermalCase(model,plan);
   assert.deepEqual(inspectThermalScenario({referenceId:id,item,plan,model,caseDefinition,sources:thermal.sources}),[],id+' '+r.id+' '+plan.kind);
  }
  parts++;
 }
 const html=renderEquipmentList(h);assert(html.includes('data-lens="electrical"'));assert(html.includes('data-file="electrical"'));assert(html.includes('data-open-part="flight:07.05.10"'));
 baseline.push({id,h,g,p});cases++;interfaces+=g.totalConnectorInterfaces;
}

const {h,g,p}=baseline[0],copy=structuredClone;
assert(electricalReadinessContract.harness.some(f=>f.path==='operatingVoltageMinV'));
for(const value of [undefined,null,NaN,Infinity,'28']){
 const q=copy(p);q.graph.harnesses.find(a=>a.kind==='power').operatingVoltageMinV=value;
 const result=runElectricalCheck(q);assert.equal(result.ready,false,'Missing/corrupt minimum operating voltage blocks execution');assert(result.inputErrors.some(e=>e.path.includes('operatingVoltageMinV')));
}
{
 const q=copy(g),a=q.harnesses.find(a=>a.kind==='control');a.pinout.find(n=>n.from==='1').to='1';
 assert(validateElectricalArchitecture(q).some(e=>e.path.endsWith('.pinout')),'A straight-through old pin map cannot masquerade as TypeA crossover');
}
{
 const q=copy(g),a=q.harnesses.find(a=>a.kind==='data');a.wire.ferrulePolish=a.wire.ferrulePolish==='UPC'?'APC':'UPC';
 assert(validateElectricalArchitecture(q).some(e=>e.path.endsWith('ferrulePolish')),'MPO polish incompatibility is a build blocker');
}
{
 const q=copy(g),a=q.harnesses[0];delete q.portById[a.toPortId];
 assert(validateElectricalArchitecture(q).some(e=>e.message.includes('endpoint')||e.message.includes('Endpoint')||e.message.includes('endpoints')),'Missing physical endpoint is detected');
}
{
 const q=copy(g),a=q.harnesses.find(a=>a.kind==='power');a.wire.awg='30';a.wire.terminationCompatible=false;
 assert(validateElectricalArchitecture(q).some(e=>e.path.includes('wire.awg')),'Unsupported crimp wire cannot enter the build register');
}
{
 const q=copy(p),r=q.requirements.find(r=>r.id.endsWith(':SUPPLY'));delete r.criteria.minimumVoltageV;
 const result=runElectricalCheck(q);assert.equal(result.ready,false);assert(result.inputErrors.some(e=>e.path.endsWith('criteria.minimumVoltageV')),'Missing electrical requirement criterion is actionable');
}
{
 const q=copy(p);q.requirements[0].sourceIds.push('fabricated-source');assert(validateElectricalProgram(q).some(e=>e.message.includes('Unresolved source')));
 const source=copy(g);source.harnesses[0].sourceIds=[];assert(validateElectricalArchitecture(source).some(e=>e.path.includes('sourceIds')));
}
{
 const q=copy(p);q.graph.massAccounting['07.05'].estimatedRequiredKg=q.graph.massAccounting['07.05'].allocatedKg+100;
 const result=runElectricalCheck(q);assert.equal(result.ready,true,'Numerical readiness is separate from an actual budget shortfall');assert(result.checks.some(c=>c.id==='mass:07.05'&&!c.within));assert.equal(result.verificationStatus,'open');
}
for(const key of ['positionM','normal'])for(const value of [undefined,null,[0,NaN,0],[0,0],['0',0,0]]){const q=copy(p);q.graph.ports[0][key]=value;const result=runElectricalCheck(q);assert.equal(result.ready,false,'Corrupt connector '+key+' blocks cleanly');assert(result.inputErrors.some(e=>e.path.includes(key)));}
{const q=copy(p);q.graph.harnesses[0].connectorTypeId='invented-family';assert.equal(runElectricalCheck(q).ready,false);}
{const q=copy(p);q.graph.ports[0].instanceOffsetsM=[null];assert.equal(runElectricalCheck(q).ready,false);}
const routes=resolveElectricalRoutes(h,{graph:g});assert(routes.every(r=>r.pointsM.every(p=>p.every(Number.isFinite))));
console.log('Electrical model: '+cases+' complete design configurations, '+interfaces+' physical connector interfaces, '+parts+' explicitly allocated electrical thermal articles; required-input, pin-map, crimp, polarity, source, mass and evidence regressions passed.');
