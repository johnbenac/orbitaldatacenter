// Adapters keep controlled requirements separate from reduced-order predictions.
import {thermalNodes,thermalNodeLabel} from './thermal-limits.js';
import {thermalConfigurationIdentity,thermalFingerprint} from './thermal-program.js';
import {buildEquipmentList} from './equipment-list.js';
import {geometry} from './orbit.js';
import {surfaces} from './physics.js';
import {energyRuntime} from './energy-system.js';
import {thermalModelAllocation,thermalModelAllocationRevision} from './thermal-model-allocations.js';

export const THERMAL_MODEL_REVISION='odc-thermal-analysis-model-3';
const finite=Number.isFinite,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),num=(v,fallback)=>finite(v)?v:fallback;
const clone=v=>JSON.parse(JSON.stringify(v)),sum=a=>a.reduce((n,v)=>n+v,0);
const sources=['th-workbench','th-nasa-guide','th-ecss-control'];
const field=(id,label,value,unit,min,max,step,basis)=>({id,label,value:finite(value)?value:null,unit,min,max,step,basis});
const allocation='Editable analysis allocation; not a measured or supplier-qualified property.';
const bands=(d,id)=>{const n=thermalNodes.find(n=>n.id===id);return n?{operating:{minK:d[n.keys.operating.min],maxK:d[n.keys.operating.max]},survival:{minK:d[n.keys.survival.min],maxK:d[n.keys.survival.max]},basis:'Active workbench '+thermalNodeLabel(d,id)+' allocations; no supplier rating is asserted.'}:{operating:{minK:null,maxK:null},survival:{minK:null,maxK:null},basis:'No independent temperature limits allocated.'};};
const wbsOf=r=>(r?.wbs||r?.id?.replace(/^flight:/,'')||'').split('.').slice(0,2).join('.');
const legacyFor=w=>({'01.01':'junction','02.02':'battery','03.01':'radiator','03.02':'coolant','03.03':'enclosure'}[w]||null);
const commonBoundaries=k=>[{id:'shroud',label:'Radiative shroud / space sink',temperatureK:k},{id:'fixture',label:'Controlled mounting boundary',temperatureK:k},{id:'air',label:'Chamber air (atmosphere only)',temperatureK:k}];
function limitsForItem(item,d,w){
 if(item?.thermal)return {operating:clone(item.thermal.operating),survival:clone(item.thermal.survival),basis:item.thermal.operating.basis};
 return legacyFor(w)?bands(d,legacyFor(w)):bands(d,null);
}
function checkedOverrides(overrides){
 const missing=[];
 for(const [key,v] of Object.entries(overrides))if(typeof v==='number'&&!finite(v))missing.push(key+' must be finite.');
 for(const k of ['massKg','specificHeatJPerKgK','capacityScale','conductanceScale','initialK','fixtureCapacityJPerK'])if(Object.hasOwn(overrides,k)&&(!finite(overrides[k])||overrides[k]<=0))missing.push(k+' must be positive.');
 for(const k of ['areaM2','loadW','conductanceWPerK','fixtureConductanceWPerK','powerScale','convectionWPerM2K'])if(Object.hasOwn(overrides,k)&&(!finite(overrides[k])||overrides[k]<0))missing.push(k+' must be nonnegative.');
 for(const k of ['emissivity','absorptivity'])if(Object.hasOwn(overrides,k)&&(!finite(overrides[k])||overrides[k]<0||overrides[k]>1))missing.push(k+' must be between zero and one.');
 return missing;
}
function finishModel(model){
 model.available=!model.missingInputs.length&&model.nodes.length>0;model.status=model.available?'allocated-reduced-model':'inputs-unallocated';model.unsupportedReasons=[...model.missingInputs];
 model.fingerprint=thermalFingerprint({...model,fingerprint:undefined,editableFields:undefined});model.id='THMODEL-'+model.fingerprint;
 return model;
}

export function buildThermalAnalysisModel(h,{record=null,catalog={},item=null,config=null,overrides={}}={}){
 const d=h.input||{},t=h.energySystem?.thermal,e=h.enclosure,configuration=config||thermalConfigurationIdentity(h,catalog),selected=item||record;
 const model={schema:'odc.thermal.model.v1',revision:THERMAL_MODEL_REVISION,configuration,configurationId:configuration.id,configurationFingerprint:configuration.fingerprint,itemId:selected?.id||'thermal:spacecraft',referenceId:configuration.referenceId,architectureFamily:d.architectureFamily||'protected-core',thermalTopology:t?.kind||'unallocated',nodes:[],conductors:[],radiation:[],convection:[],heatPumps:[],heaters:[],boundaries:commonBoundaries(num(overrides.initialK,d.initialCoreK||294)),missingInputs:checkedOverrides(overrides),assumptions:[],sourceIds:[...sources],editableFields:[],overrides:clone(overrides),scope:'',description:'',articleNodeId:null,targetNodeIds:[],environmentBasis:null};
 const scaleC=num(overrides.capacityScale,1),scaleG=num(overrides.conductanceScale,1),scaleP=num(overrides.powerScale,1),initialK=num(overrides.initialK,d.initialCoreK||294);
 const rows=buildEquipmentList(h).rows,byWbs=Object.fromEntries(rows.map(r=>[r.wbs,r]));
 const node=(id,label,capacityJPerK,loadW=0,extra={})=>{const n={id,label,capacityJPerK:capacityJPerK*scaleC,initialK,loadW:loadW*scaleP,role:'assembly',partIds:[],...extra};model.nodes.push(n);return n;};
 const conductor=(id,from,to,g,extra={})=>model.conductors.push({id,from,to,conductanceWPerK:g*scaleG,...extra});
 const radiation=(id,from,to,areaM2,emissivity,extra={})=>model.radiation.push({id,from,to,areaM2,emissivity,viewFactor:1,...extra});
 const c=h.energySystem?.coldControl||{};
 // Subsystems outside the common power/thermal network keep the immediate
 // child articles and their own sensor allocations, not unrelated vehicle nodes.
 if(/^thermal:subsystem:0[4-9]$/.test(selected?.id||'')){
  const parts=[];
  for(const allocation of selected.thermal?.nodes||[]){
   const child=catalog.byId?.[allocation.ownerItemId||allocation.id]||catalog.records?.find(r=>r.id===(allocation.ownerItemId||allocation.id));if(!child)continue;
   const childItem={...child,thermal:{operating:allocation.operating,survival:allocation.survival}},part=buildThermalAnalysisModel(h,{record:child,catalog,item:childItem,config:configuration,overrides});
   const map=id=>id==='article'?child.id:child.id+':'+id;
   model.missingInputs.push(...part.missingInputs.map(x=>child.id+': '+x));
   for(const n of part.nodes)model.nodes.push({...clone(n),id:map(n.id)});
   for(const key of ['conductors','radiation','convection','heaters','heatPumps'])for(const link of part[key]){const next={...clone(link),id:child.id+':'+link.id};for(const endpoint of ['from','to','nodeId'])if(next[endpoint])next[endpoint]=map(next[endpoint]);model[key].push(next);}
   model.targetNodeIds.push(child.id);model.sourceIds.push(...part.sourceIds);parts.push({id:child.id,basis:part.environmentBasis});
  }
  if(!parts.length)model.missingInputs.push('No immediate child thermal articles are allocated for this subsystem.');
  model.scope='Allocated child articles and individual mounting interfaces for '+(selected.label||selected.id);model.description='Each immediate MEL child retains its own heat capacity, dissipated load, contact path and temperature criterion. Common prescribed external boundaries do not force the child temperatures to agree.';
  model.environmentBasis={kind:'local-collection',category:'flight',design:clone(d),parts};model.sourceIds=[...new Set(model.sourceIds)];model.propertyAllocation={revision:thermalModelAllocationRevision,scope:model.scope,coverage:parts.length?'explicit':'unallocated'};
  model.assumptions.push('The child articles are coupled to prescribed mounting and radiative boundaries. Inter-child thermal contacts beyond those interfaces are unresolved; a common chamber schedule may not satisfy every child allocation simultaneously.');
  model.editableFields=[field('powerScale','Equipment dissipation multiplier',scaleP,'×',0,3,.05,allocation),field('capacityScale','Thermal capacity multiplier',scaleC,'×',.1,5,.05,allocation),field('conductanceScale','Contact multiplier',scaleG,'×',.01,5,.05,allocation),field('initialK','Initial article temperature',initialK,'K',3,1500,1,allocation)];return finishModel(model);
 }
 // Synthetic subsystem pages keep their actual coupled network and identify the
 // nodes under review. They never masquerade as a single isothermal component.
 if(!record&&!selected||selected?.synthetic||selected?.id==='thermal:spacecraft'||selected?.id?.startsWith('thermal:subsystem:')){
  model.scope=selected?.id?.startsWith('thermal:subsystem:')?'Coupled vehicle network, focused on '+(selected.label||selected.title):'Coupled vehicle network';
  model.description='Finite thermal stores for equipment, transport, radiator, battery and outer blanket; architecture-specific transport and temperature-dependent radiation. Spatial gradients inside a node are unresolved.';
  if(!t||!e){model.missingInputs.push('The selected spacecraft has no allocated energy-system or enclosure thermal model.');return finishModel(model);}
  const passive=t.kind==='passive-local',heatlift=t.kind==='heat-lift',fluid=!passive&&!heatlift,loopCount=fluid?Math.max(1,t.connectivity?.independentLoops?.length||t.loopCount||1):1;
  const trayCapacity=Math.max(1,h.trays)*15000,loopC=Math.max(1,t.loopHardwareCapacityKJK)*1000,bodyC=e.coupledCapacityKJK*1000;
  const endpointKW=Math.max(0,h.energySystem.electrical.peakServiceKW-t.pumpNominalKW-c.totalHeaterKW-c.controlKW),budget=energyRuntime(h,{loadKW:h.itKw+endpointKW,itKW:h.itKw,batteryK:294,loopK:294,radiatorK:d.radiatorDesignK||305});
  const busHeatW=Math.max(0,(budget.busLoadKW-h.itKw-budget.heatPumpInputKW-budget.batteryHeaterKW-budget.radiatorHeaterKW-budget.loopHeaterKW)*1000);
  node('junction',thermalNodeLabel(d,'junction')+' proxy',trayCapacity*.15,h.itKw*1000,{legacyNodeId:'junction',limits:bands(d,'junction'),partIds:['flight:01.01']});
  node('coldPlate',thermalNodeLabel(d,'coldPlate'),trayCapacity*.85,0,{legacyNodeId:'coldPlate',limits:bands(d,'coldPlate'),partIds:['flight:01.01']});
  const gJ=Math.max(1,h.trays)*1000/Math.max(.01,t.junctionToColdPlateKPerKWPerTray),gP=Math.max(1,h.trays)*1000/Math.max(.01,t.coldPlateResistanceKPerKWPerTray);
  conductor('junction-contact','junction','coldPlate',gJ);
  const innerIds=[];
  for(let j=0;j<loopCount;j++){
   const id=j?'coolant-'+(j+1):'coolant',capacity=passive?Math.max(1,t.payloadHardwareCapacityKJK)*1000:(loopC+bodyC)/loopCount;
   node(id,thermalNodeLabel(d,'coolant')+(loopCount>1?' · loop '+(j+1):''),capacity,passive?0:busHeatW/loopCount,{legacyNodeId:j?null:'coolant',limits:bands(d,'coolant'),partIds:['flight:03.02']});
   conductor('cold-plate-interface-'+(j+1),'coldPlate',id,gP/loopCount);innerIds.push(id);
  }
  let busId='coolant';
  if(passive){busId='bus';node(busId,'Bus structure and thermal straps',loopC+bodyC,busHeatW,{limits:bands(d,null)});}
  node('radiator',thermalNodeLabel(d,'radiator'),Math.max(1,t.radiatorCapacityKJK)*1000,0,{legacyNodeId:'radiator',limits:bands(d,'radiator'),partIds:['flight:03.01']});
  const packMass=byWbs['02.02']?.extendedMassKg||0;
  if(packMass>0)node('battery','Battery pack',packMass*d.packHeatKJkgK*1000,0,{legacyNodeId:'battery',initialK:num(overrides.initialK,d.initialBatteryK||initialK),limits:bands(d,'battery'),partIds:['flight:02.02']});
  // Only blanket thermal mass is assigned to the outer node; inner skin/frame
  // participation already belongs to the bus/loop store, avoiding double count.
  node('enclosure','Outer blanket',Math.max(1,e.blanketKg*900),0,{legacyNodeId:'enclosure',limits:bands(d,'enclosure'),partIds:['flight:03.03']});
  if(passive){conductor('local-heat-pipes','coolant','radiator',t.passive.conductanceKWK*1000,{capacityW:t.passive.capacityKW*1000});conductor('bus-thermal-straps','bus','radiator',t.passive.busConductanceKWK*1000);}
  else if(heatlift){const hp=t.heatPump;model.heatPumps.push({id:'heat-pump',from:'coolant',to:'radiator',cop:hp.cop,coldCapacityW:hp.coldCapacityKW*1000,setpointK:hp.coldK,bandK:hp.controlBandK});}
  else for(let j=0;j<loopCount;j++)conductor('radiator-circuit-'+(j+1),innerIds[j],'radiator',t.nominalConductanceKWK*1000/loopCount,{capacityW:t.transportCapacityKW*1000/loopCount,requiresPower:true});
  const bodyNodes=passive?[busId]:innerIds;
  for(const id of bodyNodes){
   if(packMass>0)conductor('battery-mount-'+id,'battery',id,packMass*d.packCouplingWKkg/bodyNodes.length);
   conductor('feedthroughs-'+id,id,'enclosure',e.penetrationConductanceWK/bodyNodes.length);
   radiation('blanket-effective-'+id,id,'enclosure',e.coveredAreaM2/bodyNodes.length,e.effectiveEmissivity);
  }
  const eps=num(overrides.emissivity,d.emissivity),alpha=num(overrides.absorptivity,d.absorptivity),radiatorEmissionAreaM2=num(h.radiatorEmissionAreaM2,2*h.radiatorM2);
  radiation('radiator-emission','radiator',null,radiatorEmissionAreaM2,eps,{boundaryId:'shroud'});
  radiation('blanket-exterior','enclosure',null,e.coveredAreaM2,e.exteriorEmissivity,{boundaryId:'shroud'});
  const fixtureG=num(overrides.fixtureConductanceWPerK,1);
  for(const id of bodyNodes)conductor('test-support-'+id,id,null,fixtureG/bodyNodes.length,{boundaryId:'fixture',activeIn:['test']});
  const hAir=num(overrides.convectionWPerM2K,5);
  model.convection.push({id:'air-blanket',from:'enclosure',boundaryId:'air',coefficientWPerM2K:hAir,areaM2:e.coveredAreaM2},{id:'air-radiator',from:'radiator',boundaryId:'air',coefficientWPerM2K:hAir,areaM2:radiatorEmissionAreaM2});
  if(packMass>0&&c.batteryHeaterKW>0)model.heaters.push({id:'battery-heater',nodeId:'battery',maxW:c.batteryHeaterKW*1000,onK:c.batteryFullBelowK,offK:c.batteryOffAboveK});
  if(c.loopHeaterKW>0)for(const id of innerIds)model.heaters.push({id:'loop-heater-'+id,nodeId:id,maxW:c.loopHeaterKW*1000/innerIds.length,onK:c.loopFullBelowK,offK:c.loopOffAboveK});
  if(c.radiatorHeaterKW>0)model.heaters.push({id:'radiator-heater',nodeId:'radiator',maxW:c.radiatorHeaterKW*1000,onK:c.radiatorFullBelowK,offK:c.radiatorOffAboveK});
  // Requirement-owned edits take precedence over the original design defaults.
  // Extra circuit stores share the declared coolant boundary, without inventing
  // independent supplier ratings for their constituent hardware.
  const allocatedBands=new Map((selected?.thermal?.nodes||[]).map(n=>[n.id,n]));
  for(const n of model.nodes){const owner=allocatedBands.get(n.legacyNodeId||n.id)||(n.id.startsWith('coolant-')?allocatedBands.get('coolant'):null);if(owner)n.limits={operating:clone(owner.operating),survival:clone(owner.survival),basis:owner.operating?.basis||'Configuration-owned project allocation.'};}
  model.targetNodeIds=(selected?.nodeIds?.length?selected.nodeIds:thermalNodes.map(n=>n.id)).filter(id=>model.nodes.some(n=>n.id===id));
  model.environmentBasis={kind:'mission-geometry',design:clone(d),hardware:clone(h),radiatorAreaM2:radiatorEmissionAreaM2,radiatorEmissivity:eps,radiatorAbsorptivity:alpha,enclosureAreaM2:e.coveredAreaM2,enclosureEmissivity:e.exteriorEmissivity,enclosureAbsorptivity:e.exteriorAbsorptivity,busNodeIds:bodyNodes,baseEmissivity:d.emissivity,baseAbsorptivity:d.absorptivity};
  model.assumptions.push('Capacities inherit the selected architecture: tray participation 15 kJ/K per tray, installed transport and radiator capacities, battery mass × selected pack specific heat, and inner enclosure participation. The tray store is split 15% junction proxy / 85% cold plate as an uncorrelated transient estimate, not die/package geometry.','Outer blanket capacity uses 900 J/(kg·K) as an editable equivalent material estimate. It is additional to the existing inner skin/frame capacity; other equipment local masses are not added again.','Nominal active electrical budget supplies equipment and conversion heat. Battery charge/discharge losses, heat-pump driver variation, power-limited dispatch, fluid phase change, deployment and local electronics gradients require a coupled detailed mission model; this analysis does not replace that simulator.','The selected temperature bands are design allocations. Calibration, contact characterization, sensor uncertainty and correlated model evidence remain open.','The chamber shroud is a large diffuse enclosure with unit modeled view factor. Test supports use '+fixtureG+' W/K total as an editable fixture allocation. Full deployment is assumed in environmental cases.','Air convection is enabled only for the explicit atmospheric case; the coefficient '+hAir+' W/(m²·K) is a scenario input, not a facility calibration.');
  if(fluid)model.assumptions.push('Transport uses the allocated '+loopCount+' finite-conductance circuit(s), with no fluid phase-change or fluid/property dependence. The detailed ammonia property range remains '+t.fluid.propertyMinK+'–'+t.fluid.propertyMaxK+' K. Rated conductance is a powered-case assumption; commanded transport-off removes that flow path. Residual metal conduction, bypass control and freeze/thaw require separate allocations.');
  if(loopCount>1)model.assumptions.push('Independent circuit stores and links share aggregate cold-plate and radiator temperatures. Hydraulic isolation is retained in connectivity; individual panel gradients and a failed-loop rerouting analysis are outside this reduction.');
  if(passive)model.assumptions.push(t.passive.basis);
  if(Number.isFinite(h.radiatorEmissionAreaM2))model.assumptions.push('Radiator area uses the remaining physical plate after the hinge relief and subtracts the union of opaque front-side equipment and installation footprints. Open gaps remain radiating area. This preliminary normal-projection mask does not resolve local temperatures or view factors between hardware and the plate; no equivalent radiator-finish emission credit is assigned to the obstructing hardware.');
  if(heatlift)model.assumptions.push(t.heatPump.basis+' Heat removed from the cold store plus electrical work enters the hot store; allocated COP is checked against the instantaneous Carnot bound.');
  model.editableFields=[field('powerScale','Equipment dissipation multiplier',scaleP,'×',0,3,.05,allocation),field('capacityScale','Thermal capacity multiplier',scaleC,'×',.1,5,.05,allocation),field('conductanceScale','Contact / transport multiplier',scaleG,'×',.01,5,.05,allocation),field('initialK','Initial article temperature',initialK,'K',3,1500,1,allocation),field('emissivity','Radiator IR emittance',eps,'fraction',.001,1,.01,allocation),field('absorptivity','Radiator solar absorptance',alpha,'fraction',0,1,.01,allocation),field('fixtureConductanceWPerK','Total chamber support conductance',fixtureG,'W/K',0,10000,.1,allocation),field('convectionWPerM2K','Atmospheric heat-transfer coefficient',hAir,'W/(m²·K)',0,500,.5,allocation)];
  return finishModel(model);
 }
 const r=record||selected,w=wbsOf(r),property=thermalModelAllocation(r,h,{parentRecord:catalog.byId?.[r.parentId]});
 model.propertyAllocation=property;model.sourceIds=[...new Set([...model.sourceIds,...property.sourceIds,...(item?.studyAllocation?.sourceIds||[])])];
 const v=property.values,massKg=num(overrides.massKg,v.massKg),cp=num(overrides.specificHeatJPerKgK,v.specificHeatJPerKgK),area=num(overrides.areaM2,v.areaM2),load=num(overrides.loadW,v.loadW),g=num(overrides.conductanceWPerK,v.conductanceWPerK),eps=num(overrides.emissivity,v.emissivity),alpha=num(overrides.absorptivity,v.absorptivity);
 for(const [name,value] of [['Article mass (kg)',massKg],['Specific heat (J/kg/K)',cp],['Exposed radiating area (m²)',area],['Dissipated load (W)',load],['Mounting-interface conductance (W/K)',g],['IR emittance',eps],['Solar absorptance',alpha]])if(!finite(value))model.missingInputs.push(name+' is unallocated for this item.');
 if(massKg!=null&&massKg<=0||cp!=null&&cp<=0)model.missingInputs.push('Mass and heat capacity must be positive.');
 model.scope=property.scope;model.articleNodeId='article';model.targetNodeIds=['article'];model.description='Two thermal stores: '+property.scope.toLowerCase()+' and an explicit finite-capacity mounting interface. Internal temperature gradients remain unresolved.';
 const fixtureC=num(overrides.fixtureCapacityJPerK,v.fixtureCapacityJPerK),fixtureG=num(overrides.fixtureConductanceWPerK,v.fixtureConductanceWPerK),hAir=num(overrides.convectionWPerM2K,v.convectionWPerM2K);
 for(const [key,value] of [['fixtureCapacityJPerK',fixtureC],['fixtureConductanceWPerK',fixtureG],['convectionWPerM2K',hAir]])if(!finite(value))model.missingInputs.push(key+' is unallocated for this item.');
 if(!model.missingInputs.length){
  node('article',r.title||r.label||r.id,massKg*cp,load,{role:'article',partIds:[r.id],limits:limitsForItem(item,d,w),massKg,specificHeatJPerKgK:cp,areaM2:area,emissivity:eps,absorptivity:alpha});
  node('interface','Test mounting interface',fixtureC,0,{role:'interface',limits:bands(d,null)});
  conductor('article-interface','article','interface',g);conductor('fixture-conditioning','interface',null,fixtureG,{boundaryId:'fixture'});
  radiation('article-shroud','article',null,area,eps,{boundaryId:'shroud',...(property.externalExposure?{}:{activeIn:['test']})});
  if(!property.externalExposure)radiation('article-surroundings','article',null,area,eps,{boundaryId:'fixture',activeIn:['orbit']});
  model.convection.push({id:'article-air',from:'article',boundaryId:'air',coefficientWPerM2K:hAir,areaM2:area});
  if(w==='02.02'&&property.articleKind==='mel-row'&&c.batteryHeaterKW>0)model.heaters.push({id:'article-heater',nodeId:'article',maxW:c.batteryHeaterKW*1000,onK:c.batteryFullBelowK,offK:c.batteryOffAboveK});
 }
 model.environmentBasis={kind:'local-surface',areaM2:area,emissivity:eps,absorptivity:alpha,category:r.category,externalExposure:property.externalExposure,design:clone(d)};
 model.assumptions.push(...property.assumptions,'The fixture has '+fixtureC+' J/K allocated capacity and '+fixtureG+' W/K conditioning conductance. These are temporary test/installed-interface properties, not additional flight mass.','The selected article and its test mounting interface have independent transient temperatures. A chamber boundary command is not an article temperature.');
 if(!property.externalExposure)model.assumptions.push('This internally mounted article sees a prescribed local surrounding temperature in installed orbital analysis. It is not directly exposed to a 3 K space sink or direct solar flux. The TVAC case explicitly exposes it to the chamber shroud.');
 const values=[['massKg','Article mass',massKg,'kg',.0001,1e7,.1],['specificHeatJPerKgK','Equivalent specific heat',cp,'J/(kg·K)',1,10000,10],['areaM2','Exposed radiating area',area,'m²',0,1e7,.01],['loadW','Article dissipation',load,'W',0,1e10,1],['conductanceWPerK','Article-to-fixture conductance',g,'W/K',0,1e8,.1],['emissivity','Article IR emittance',eps,'fraction',0,1,.01],['absorptivity','Article solar absorptance',alpha,'fraction',0,1,.01],['initialK','Initial article temperature',initialK,'K',3,1500,1],['fixtureCapacityJPerK','Mounting-interface heat capacity',fixtureC,'J/K',1,1e9,100],['fixtureConductanceWPerK','Fixture conditioning conductance',fixtureG,'W/K',0,1e8,.1],['convectionWPerM2K','Atmospheric heat-transfer coefficient',hAir,'W/(m²·K)',0,500,.5]];
 model.editableFields=values.map(([id,label,value,unit,min,max,step])=>({...field(id,label,value,unit,min,max,step,property.fieldMeta[id]?.basis||allocation),status:Object.hasOwn(overrides,id)?'user-override':property.fieldMeta[id]?.status||'engineering-estimate',sourceIds:property.fieldMeta[id]?.sourceIds||['th-workbench']}));
 return finishModel(model);
}

function environmentSample(model,p,missionTimeS){
 const b=model.environmentBasis||{},d=b.design||{},g=geometry(d,missionTimeS),solar=p.solarWm2,ir=p.earthIRWm2,albedo=p.albedo;
 if(b.kind==='mission-geometry'){
  const h=b.hardware,f=surfaces(h,g,1),rad=model.nodes.find(n=>n.id==='radiator'),outer=model.nodes.find(n=>n.id==='enclosure');
  const age=missionTimeS/(365.25*86400),retention=(d.emissivityRetention||1)**age,alpha=clamp(b.radiatorAbsorptivity+(d.alphaGrowth||0)*age,0,1),eps=b.radiatorEmissivity*retention;
  const direct=f.radiatorExposedM2*alpha*solar*(g.eclipse?0:1)*f.radiatorSunCos,alb=f.radiatorExposedM2*alpha*solar*albedo*Math.max(0,g.sunRadial)*f.earthView,earth=f.radiatorExposedM2*eps*ir*f.earthView;
  const area=b.enclosureAreaM2,earthFraction=f.enclosureIRWm2/237,albedoWm2=1361*.3*Math.max(0,g.sunRadial)*earthFraction,directWm2=Math.max(0,f.enclosureSolarWm2-albedoWm2),outerW=area*(b.enclosureAbsorptivity*(directWm2*solar/1361+albedoWm2*solar/1361*albedo/.3)+b.enclosureEmissivity*f.enclosureIRWm2*ir/237);
  const flux={};if(rad)flux.radiator=direct+alb+earth;if(outer)flux.enclosure=outerW;
  return {externalFluxW:flux,radiationFactors:{'radiator-emission':retention},environment:{missionTimeS,epochUTC:new Date(Date.parse(d.epoch)+missionTimeS*1000).toISOString(),eclipse:g.eclipse,solarWm2:g.eclipse?0:solar,earthIRWm2:ir,albedo,radiatorDirectSolarW:direct,radiatorAlbedoW:alb,radiatorEarthIRW:earth,earthViewFraction:f.earthView*.5,betaDeg:g.betaDeg,altitudeKm:g.altitudeKm,solarConversionLossW:f.solarConversionLossKW*1000}};
 }
 if(b.kind==='local-collection'){const externalFluxW={};for(const part of b.parts){const sample=environmentSample({environmentBasis:part.basis},p,missionTimeS);externalFluxW[part.id]=sample.externalFluxW.article||0;}return {externalFluxW,environment:{missionTimeS,eclipse:g.eclipse,solarWm2:solar*(g.eclipse?0:1),earthIRWm2:ir,albedo,betaDeg:g.betaDeg,altitudeKm:g.altitudeKm}};}
 const area=b.areaM2,view=b.externalExposure===false?0:p.earthViewFactor,cos=b.externalExposure===false?0:p.solarIncidenceCos,lit=g.eclipse?0:1,direct=area*b.absorptivity*solar*cos*lit,alb=area*b.absorptivity*solar*albedo*Math.max(0,g.sunRadial)*view,earth=area*b.emissivity*ir*view;
 return {externalFluxW:{article:direct+alb+earth},environment:{missionTimeS,eclipse:g.eclipse,solarWm2:solar*lit,earthIRWm2:ir,albedo,earthViewFraction:view,solarIncidenceCos:cos,absorbedSolarW:direct,absorbedAlbedoW:alb,absorbedEarthIRW:earth,betaDeg:g.betaDeg,altitudeKm:g.altitudeKm}};
}

// The provisional chamber command is solved from the article requirement and
// allocated heat paths. It never forces the transient article temperature.
function localChamberCommand(model,targetK,loadFraction,{atmosphere=false,heaterEnabled=true}={}){
 const article=model.nodes.find(n=>n.id===model.articleNodeId);
 if(!article||model.nodes.length!==2||!finite(targetK))return null;
 const mount=model.conductors.find(l=>l.from===article.id&&l.to==='interface'),condition=model.conductors.find(l=>l.from==='interface'&&l.boundaryId==='fixture');
 if(!mount||!condition)return null;
 const g1=mount.conductanceWPerK,g2=condition.conductanceWPerK,seriesG=g1+g2>0?g1*g2/(g1+g2):0;
 const epsArea=sum(model.radiation.filter(l=>l.from===article.id&&l.boundaryId==='shroud').map(l=>l.areaM2*l.emissivity*(l.viewFactor??1)));
 const airG=atmosphere?sum(model.convection.filter(l=>l.from===article.id).map(l=>l.coefficientWPerM2K*l.areaM2)):0;
 const heaterW=heaterEnabled?sum(model.heaters.filter(x=>x.nodeId===article.id&&targetK<=x.onK).map(x=>x.maxW)):0,heatW=article.loadW*loadFraction+heaterW;
 if(seriesG+airG===0&&epsArea===0)return {status:'uncontrolled-article',articleTargetK:targetK,heatW,basis:'No heat-transfer path connects the article to a commanded boundary. A chamber command cannot control this isolated article.'};
 const heaterDeadband=heaterEnabled&&model.heaters.some(x=>x.nodeId===article.id&&targetK>x.onK&&targetK<x.offK),heaterAssumption=heaterDeadband?'Target lies inside a heater hysteresis band: the provisional command assumes the heater is off. The actual transient retains its previous on/off state and may miss the target.':'Heater heat is allocated from the target side of the thermostat thresholds; the transient still resolves hysteresis.';
 const balance=boundaryK=>heatW+(seriesG+airG)*(boundaryK-targetK)+5.670374419e-8*epsArea*(boundaryK**4-targetK**4);
 if(balance(3)>0||balance(1500)<0)return {status:'unreachable-with-allocated-fixture',articleTargetK:targetK,heatW,heaterW,seriesConductanceWPerK:seriesG};
 let lo=3,hi=1500;for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(balance(mid)>0)hi=mid;else lo=mid;}
 return {status:'derived-steady-balance',commandK:(lo+hi)/2,articleTargetK:targetK,heatW,heaterW,heaterAssumption,seriesConductanceWPerK:seriesG,radiatingEmittanceAreaM2:epsArea,airConductanceWPerK:airG,basis:'Solve Q + Gseries(Tboundary − Tarticle) + εσA(Tboundary⁴ − Tarticle⁴) + hA(Tboundary − Tarticle) = 0. The transient solution and real fixture can differ; this is a planning command, not acceptance evidence.'};
}

export function buildThermalCase(model,plan={},overrides={}){
 const raw={...plan.parameters,...overrides},nonflight=model.environmentBasis?.category&&model.environmentBasis.category!=='flight',kind=plan.kind==='thermal-analysis'?(nonflight?'installed-environment':'orbital-transient'):plan.kind||'tvac-cycling',targetIds=model.targetNodeIds?.length?model.targetNodeIds:model.nodes.map(n=>n.id).filter(id=>id!=='interface'),targets=model.nodes.filter(n=>targetIds.includes(n.id));
 const p={ambientK:num(raw.ambientK,294),cycles:num(raw.cycles,2),rampKPerMin:num(raw.rampKPerMin,1),dwellS:num(raw.dwellS,1800),stabilityKPerHour:num(raw.stabilityKPerHour,1),stabilityWindowS:num(raw.stabilityWindowS,600),toleranceK:num(raw.toleranceK,2),maxPlateauS:num(raw.maxPlateauS,21600),pressurePa:num(raw.pressurePa,kind==='atmospheric-cycling'?101325:.001),hotLoadFraction:num(raw.hotLoadFraction,1),coldLoadFraction:num(raw.coldLoadFraction,.2),heaterEnabled:raw.heaterEnabled!==false,testMarginK:num(raw.testMarginK,0),dtS:num(raw.dtS,20),sampleEveryS:num(raw.sampleEveryS,180),solarWm2:num(raw.solarWm2,1361),earthIRWm2:num(raw.earthIRWm2,237),albedo:num(raw.albedo,.3),earthViewFactor:num(raw.earthViewFactor,.25),solarIncidenceCos:num(raw.solarIncidenceCos,.25),missionStartS:num(raw.missionStartS,86400),orbits:num(raw.orbits,2),spaceSinkK:num(raw.spaceSinkK,3),balanceShroudK:num(raw.balanceShroudK,90),balanceHotFluxScale:num(raw.balanceHotFluxScale,1),balanceColdFluxScale:num(raw.balanceColdFluxScale,1)};
 const c={schema:'odc.thermal.case.v1',id:'',revision:THERMAL_MODEL_REVISION,planId:plan.id||'engineering-scenario',planRevision:plan.revision||'uncontrolled-scenario',configurationId:model.configurationId,modelId:model.id,kind,label:plan.title||kind,approach:overrides.approach||plan.approach||'engineering',status:'draft',verificationStatus:'unverified',available:model.available,missingInputs:[],parameters:p,editableFields:[],steps:[],timeline:[],monitorNodeIds:targetIds,boundaries:clone(model.boundaries),initialBoundariesK:{shroud:p.ambientK,fixture:p.ambientK,air:p.ambientK},dtS:p.dtS,sampleEveryS:p.sampleEveryS,heaterEnabled:p.heaterEnabled,pressurePa:p.pressurePa,convectionEnabled:['atmospheric-cycling','installed-environment'].includes(kind),maxDurationS:2592000,stabilityWindowS:p.stabilityWindowS,stabilityKPerHour:p.stabilityKPerHour,toleranceK:p.toleranceK,dwellS:p.dwellS,assumptions:[],sourceIds:[...new Set([...(plan.sourceIds||[]),...model.sourceIds,...sources,'th-gevs-tvac'])]};
 if(model.environmentBasis?.externalExposure===false){p.earthViewFactor=num(raw.earthViewFactor,0);p.solarIncidenceCos=num(raw.solarIncidenceCos,0);}
 const addField=(id,label,unit,min,max,step,basis=allocation)=>c.editableFields.push(field(id,label,p[id],unit,min,max,step,basis));
 for(const [id,label,unit,min,max,step] of [['dtS','Integration step','s',.05,300,1],['sampleEveryS','Plot / artifact sample interval','s',1,3600,10],['ambientK','Initial / recovery boundary','K',3,1500,1],['dwellS','Dwell after article stabilization','s',0,86400,60],['stabilityKPerHour','Article stability window range / hour','K/h',.001,100,0.1],['stabilityWindowS','Article stability window','s',1,86400,60],['maxPlateauS','Maximum time per plateau','s',60,604800,600]])addField(id,label,unit,min,max,step);
 const invalid=(key,condition,message)=>{if(condition)c.missingInputs.push(message||'Invalid '+key+'.');};
 invalid('approach',!['engineering','qualification','protoflight','acceptance'].includes(c.approach));
 for(const [key,v] of Object.entries(raw))if(typeof v==='number'&&!finite(v))c.missingInputs.push(key+' must be finite.');
 for(const [key,v] of Object.entries(overrides))if(v===null)c.missingInputs.push(key+' was cleared. Enter its value or restore the planned scenario.');
 invalid('ambientK',p.ambientK<=0);invalid('dtS',p.dtS<.05||p.dtS>300);invalid('dwellS',p.dwellS<0);invalid('stabilityKPerHour',p.stabilityKPerHour<=0);invalid('stabilityWindowS',p.stabilityWindowS<=0);invalid('maxPlateauS',p.maxPlateauS<=0);invalid('load fraction',p.hotLoadFraction<0||p.coldLoadFraction<0);invalid('pressure',p.pressurePa<0);
 if(!model.available)c.missingInputs.push(...model.missingInputs);
 const hold=(id,label,boundariesK,extra={})=>c.steps.push({id,label,type:'hold',boundariesK,maxDurationS:p.maxPlateauS,dwellS:p.dwellS,stabilityWindowS:p.stabilityWindowS,stabilityKPerHour:p.stabilityKPerHour,toleranceK:p.toleranceK,...extra});
 let boundary=p.ambientK;
 const ramp=(id,label,k,extra={})=>{const durationS=Math.max(p.dtS,Math.abs(k-boundary)*60/Math.max(.001,p.rampKPerMin));c.steps.push({id,label,type:'ramp',durationS,boundariesK:{shroud:k,fixture:k,air:k},...extra});boundary=k;};
 if(kind==='tvac-cycling'||kind==='atmospheric-cycling'){
  const opLimits=targets.map(n=>n.limits?.operating||{}),coldValues=opLimits.map(l=>l.minK).filter(finite),hotValues=opLimits.map(l=>l.maxK).filter(finite);
  // A vehicle has several sensor allowables. Boundary extrema are a scenario
  // choice, while each article sensor retains its own criterion.
  p.coldK=num(raw.coldK,coldValues.length===targets.length&&targets.length?Math.min(...coldValues)-p.testMarginK:null);p.hotK=num(raw.hotK,hotValues.length===targets.length&&targets.length?Math.max(...hotValues)+p.testMarginK:null);
  c.articleTargets={cold:Object.fromEntries(targets.map(n=>[n.id,finite(n.limits?.operating?.minK)?n.limits.operating.minK-p.testMarginK:p.coldK])),hot:Object.fromEntries(targets.map(n=>[n.id,finite(n.limits?.operating?.maxK)?n.limits.operating.maxK+p.testMarginK:p.hotK]))};
  c.boundaryAllocation={};
  for(const side of ['cold','hot']){
   const key=side+'K',derived=['derived-target','derived-article-target'].includes(plan.parameterMeta?.[key]?.status);
   if(derived&&!Object.hasOwn(overrides,key)){
    const command=localChamberCommand(model,c.articleTargets[side][model.articleNodeId],p[side+'LoadFraction'],{atmosphere:c.convectionEnabled,heaterEnabled:p.heaterEnabled});
    if(command){c.boundaryAllocation[side]=command;if(finite(command.commandK))p[key]=command.commandK;}
   }else c.boundaryAllocation[side]={status:'explicit-boundary-command',commandK:p[key]};
  }
  if(finite(p.coldK)&&finite(p.hotK)&&p.hotK<=p.coldK&&Object.values(c.boundaryAllocation).some(x=>x.status==='derived-steady-balance')){
   p.coldK=num(raw.coldK,Math.min(...coldValues)-p.testMarginK);p.hotK=num(raw.hotK,Math.max(...hotValues)+p.testMarginK);c.boundaryAllocation.status='tailoring-required';c.assumptions.push('Independent hot/cold heat-balance commands reverse their order for this load/fixture. The original ordered boundary schedule is retained and missed article targets remain visible; tailor loads or conditioning.');
  }
  addField('coldK','Cold chamber boundary target','K',3,1500,1,'Provisional boundary target; article sensor targets remain separately listed.');addField('hotK','Hot chamber boundary target','K',3,1500,1,'Provisional boundary target; power and contact drops can prevent the article from reaching its target.');
  for(const [id,label,unit,min,max,step] of [['cycles','Repeated hot/cold cycles','count',1,20,1],['rampKPerMin','Boundary ramp rate','K/min',.001,30,.1],['toleranceK','Article target tolerance','K',.01,50,.1],['pressurePa','Planned chamber pressure','Pa',0,200000,.001],['hotLoadFraction','Hot functional load fraction','fraction',0,3,.05],['coldLoadFraction','Cold functional load fraction','fraction',0,3,.05],['testMarginK','Allocated additional test margin','K',0,100,1]])addField(id,label,unit,min,max,step);
  if(!finite(p.hotK)||!finite(p.coldK))c.missingInputs.push('Allocate cold and hot article targets for this item; parent temperature context is insufficient.');
  invalid('targets',finite(p.hotK)&&finite(p.coldK)&&(p.hotK<=p.coldK||p.coldK<=0),'The hot boundary must be above a positive cold boundary.');invalid('cycles',!Number.isInteger(p.cycles)||p.cycles<1||p.cycles>20);invalid('ramp',p.rampKPerMin<=0);invalid('tolerance',p.toleranceK<=0);invalid('test margin',p.testMarginK<0);
  const sensorTargets=side=>Object.fromEntries(targets.map(n=>{const allocated=n.limits?.operating?.[side==='hot'?'maxK':'minK'];return [n.id,finite(allocated)?allocated+(side==='hot'?p.testMarginK:-p.testMarginK):p[side+'K']];}));
  if(finite(p.hotK)&&finite(p.coldK))for(let i=1;i<=p.cycles;i++){
   ramp('cycle-'+i+'-cold-ramp','Cycle '+i+' · ramp to cold boundary',p.coldK,{loadFraction:p.coldLoadFraction});
   hold('cycle-'+i+'-cold','Cycle '+i+' · cold article dwell',{shroud:p.coldK,fixture:p.coldK,air:p.coldK},{loadFraction:p.coldLoadFraction,sensorTargetsK:sensorTargets('cold')});
   ramp('cycle-'+i+'-hot-ramp','Cycle '+i+' · ramp to hot boundary',p.hotK,{loadFraction:p.hotLoadFraction});
   hold('cycle-'+i+'-hot','Cycle '+i+' · hot article dwell',{shroud:p.hotK,fixture:p.hotK,air:p.hotK},{loadFraction:p.hotLoadFraction,sensorTargetsK:sensorTargets('hot')});
  }
  ramp('recovery-ramp','Return to ambient boundary',p.ambientK,{loadFraction:0,heaterEnabled:false});hold('recovery','Unpowered recovery trend',{shroud:p.ambientK,fixture:p.ambientK,air:p.ambientK},{loadFraction:0,heaterEnabled:false,mode:'survival'});
  c.assumptions.push('The shroud / fixture schedule is a boundary command, not an article temperature. A hold completes only after every monitored article node is within its target tolerance and stable over the full window, followed by continuous dwell. A missed target remains visible.','Stability uses peak-to-peak temperature range across the window, expressed per hour, so oscillations cannot cancel as endpoint drift. Boundary ramp rate, cycles and dwell are editable study scenarios; they do not establish a compliant GEVS qualification/acceptance procedure.','Functional load changes are represented by electrical heat. A completed numerical dwell does not demonstrate powered function, leakage, vacuum compatibility or post-test performance.','Pressure is an identified procedure condition, not a pumped-gas simulation. '+(kind==='tvac-cycling'?'This vacuum model assumes molecular-regime residual-gas heat transfer is negligible and includes no convection.':'The assigned air temperature and convection coefficient model an atmospheric chamber; they are not a vacuum boundary.'));
  if(targets.length>1)c.assumptions.push('Aggregate boundary extremes are drawn from the lowest/highest monitored allocations. Individual sensors retain their own targets; one common boundary may not achieve them simultaneously. Separate zoned conditioning or a tailored article sequence is then required.');
  if(Object.values(c.boundaryAllocation).some(x=>x?.status==='derived-steady-balance'))c.assumptions.push('Default local chamber commands are estimated from the allocated article limits, selected load and heater state, and the model’s conductive/radiative steady heat balance. They are independent inputs to the transient run; they do not force the time history or count dwell before stabilization. Override them for a specific facility or restore the planned scenario to recalculate them.');
  for(const boundary of Object.values(c.boundaryAllocation))if(boundary?.heaterAssumption?.startsWith('Target lies'))c.assumptions.push(boundary.heaterAssumption);
 }else if(kind==='installed-environment'){
  const cold=targets.map(n=>n.limits?.operating?.minK).filter(finite),hot=targets.map(n=>n.limits?.operating?.maxK).filter(finite);
  p.coldK=num(raw.coldK,cold.length===targets.length&&targets.length?Math.min(...cold):null);p.hotK=num(raw.hotK,hot.length===targets.length&&targets.length?Math.max(...hot):null);p.pressurePa=num(overrides.pressurePa,101325);c.pressurePa=p.pressurePa;
  addField('coldK','Cold installed ambient / mount','K',3,1500,1);addField('hotK','Hot installed ambient / mount','K',3,1500,1);addField('rampKPerMin','Boundary ramp rate','K/min',.001,30,.1);addField('hotLoadFraction','Hot operating load fraction','fraction',0,3,.05);addField('coldLoadFraction','Cold operating load fraction','fraction',0,3,.05);
  invalid('installed environment',!finite(p.coldK)||!finite(p.hotK)||p.coldK<=0||p.hotK<=p.coldK,'Allocate positive, ordered cold and hot installed-environment boundaries for this item.');invalid('ramp',p.rampKPerMin<=0);
  ramp('installed-cold-ramp','Installed environment · cold transition',p.coldK,{loadFraction:p.coldLoadFraction});hold('installed-cold','Cold installed response',{shroud:p.coldK,fixture:p.coldK,air:p.coldK},{loadFraction:p.coldLoadFraction});
  ramp('installed-hot-ramp','Installed environment · hot transition',p.hotK,{loadFraction:p.hotLoadFraction});hold('installed-hot','Hot installed response',{shroud:p.hotK,fixture:p.hotK,air:p.hotK},{loadFraction:p.hotLoadFraction});
  c.assumptions.push('This installed environmental analysis covers '+model.scope+'. Ambient and mounting temperatures are prescribed; article temperatures emerge from stored energy, dissipation and heat transfer. No orbital environment, whole-facility response or supplier acceptance is asserted.');
 }else if(kind==='orbital-transient'||kind==='thermal-balance'){
  if(model.environmentBasis?.category&&model.environmentBasis.category!=='flight')c.missingInputs.push('No flight-environment allocation exists for this provider or facility item. Use its atmospheric / interface case.');
  for(const [id,label,unit,min,max,step] of [['solarWm2','Solar irradiance','W/m²',0,3000,1],['earthIRWm2','Earth infrared irradiance','W/m²',0,1000,1],['albedo','Earth albedo','fraction',0,1,.01],['missionStartS','Mission elapsed time at case start','s',540,1e10,3600],['orbits','Sampled mission orbits','count',.1,20,.1],['spaceSinkK','Space background temperature','K',.1,100,1],['hotLoadFraction','Nominal operating load fraction','fraction',0,3,.05],['coldLoadFraction','Cold operating load fraction','fraction',0,3,.05]])addField(id,label,unit,min,max,step);
  if(model.environmentBasis?.kind==='local-surface'){
   if(model.environmentBasis.externalExposure!==false){addField('earthViewFactor','Article Earth view factor','fraction',0,1,.01);addField('solarIncidenceCos','Article solar projected-area fraction','fraction',0,1,.01);}
   if(kind==='orbital-transient'){
    Object.assign(c.editableFields.find(f=>f.id==='ambientK'),{label:'Installed mounting boundary',basis:'Prescribed controlled-interface temperature for this local analysis. It is an explicit allocation, not a solved temperature of the parent assembly.'});
    c.assumptions.push('The installed mounting boundary is held at '+p.ambientK+' K as an explicit controlled-interface allocation. The modeled mounting-interface store has its own transient temperature; this local case does not solve the surrounding parent assembly temperatures.');
   }
  }
  invalid('solar irradiance',p.solarWm2<0);invalid('Earth IR',p.earthIRWm2<0);invalid('albedo',p.albedo<0||p.albedo>1);invalid('Earth view',p.earthViewFactor<0||p.earthViewFactor>1);invalid('solar incidence',p.solarIncidenceCos<0||p.solarIncidenceCos>1);invalid('orbits',p.orbits<=0||p.orbits>20);invalid('mission start',p.missionStartS<540);invalid('space sink',p.spaceSinkK<=0);
  const design=model.environmentBasis?.design;
  if(!design?.epoch)c.missingInputs.push('An orbit epoch and orbital elements are required for mission environment sampling.');
  if(model.available&&design?.epoch&&!c.missingInputs.length){
   const period=geometry(design,p.missionStartS).periodSec,duration=period*p.orbits,spacing=Math.max(5,Math.min(30,p.dtS)),count=Math.ceil(duration/spacing),samples=[];
   c.eventTimesS=[];
   for(let j=0;j<=count;j++){
    const timeS=Math.min(duration,j*spacing),sample=environmentSample(model,p,p.missionStartS+timeS),previous=samples.at(-1);
    if(previous&&previous.environment.eclipse!==sample.environment.eclipse){let lo=previous.timeS,hi=timeS;for(let k=0;k<20;k++){const mid=(lo+hi)*.5;if(geometry(design,p.missionStartS+mid).eclipse===previous.environment.eclipse)lo=mid;else hi=mid;}const event=(lo+hi)*.5;
     for(const at of [Math.max(previous.timeS,event-.001),Math.min(timeS,event+.001)]){samples.push({timeS:at,...environmentSample(model,p,p.missionStartS+at)});c.eventTimesS.push(at);}
    }
    samples.push({timeS,...sample});
   }
   if(kind==='orbital-transient'){
    c.initialBoundariesK={shroud:p.spaceSinkK,fixture:p.ambientK,air:p.ambientK};
    c.timeline=samples.map(s=>({...s,boundariesK:{shroud:p.spaceSinkK,fixture:p.ambientK,air:p.ambientK},loadFraction:p.hotLoadFraction}));
    c.steps=[{id:'orbit-history',label:'Mission thermal history · '+p.orbits+' orbit(s)',type:'timeline',durationS:duration,mode:'operating',loadFraction:p.hotLoadFraction}];
    c.assumptions.push('Orbit epoch/elements, eclipse geometry, active reference surface orientation, Earth view and solar aging are sampled from the existing mission model with full deployment. Smooth environmental loads are interpolated at ≤30-second spacing; eclipse transitions are located by bisection and integration steps end at their boundaries.','This is a controlled-load thermal case: equipment and heater energy are supplied by an ideal available electrical boundary. It does not claim state-of-charge, load dispatch or power availability. Use the coupled orbital simulator for that mission-energy constraint.');
   }else{
    addField('balanceShroudK','Thermal-balance shroud temperature','K',3,400,1,'Cold chamber background; separate from article cycling targets.');addField('balanceHotFluxScale','Hot-case absorbed-flux multiplier','×',0,3,.05,allocation);addField('balanceColdFluxScale','Cold-case absorbed-flux multiplier','×',0,3,.05,allocation);
    invalid('balance shroud',p.balanceShroudK<=0);invalid('balance flux scale',p.balanceHotFluxScale<0||p.balanceColdFluxScale<0);
    const score=s=>sum(Object.values(s.externalFluxW)),hot=samples.reduce((a,b)=>score(a)>score(b)?a:b),cold=samples.reduce((a,b)=>score(a)<score(b)?a:b),k=p.balanceShroudK;
    c.initialBoundariesK={shroud:p.ambientK,fixture:p.ambientK,air:p.ambientK};
    ramp('balance-cooldown','Finite chamber cooldown',k,{loadFraction:0,heaterEnabled:false,boundariesK:{shroud:k,fixture:p.ambientK,air:p.ambientK}});
    const flux=(s,scale)=>Object.fromEntries(Object.entries(s.externalFluxW).map(([id,w])=>[id,w*scale]));
    hold('balance-hot','Hot mission-equivalent thermal balance',{shroud:k,fixture:p.ambientK,air:p.ambientK},{loadFraction:p.hotLoadFraction,externalFluxW:flux(hot,p.balanceHotFluxScale),radiationFactors:hot.radiationFactors,environment:hot.environment});
    hold('balance-cold','Cold mission-equivalent thermal balance',{shroud:k,fixture:p.ambientK,air:p.ambientK},{loadFraction:p.coldLoadFraction,externalFluxW:flux(cold,p.balanceColdFluxScale),radiationFactors:cold.radiationFactors,environment:cold.environment});
    hold('balance-survival','Cold survival balance · payload off',{shroud:k,fixture:p.ambientK,air:p.ambientK},{loadFraction:0,externalFluxW:flux(cold,p.balanceColdFluxScale),radiationFactors:cold.radiationFactors,mode:'survival',heaterEnabled:p.heaterEnabled,transportEnabled:false});
    ramp('balance-recovery','Return chamber to ambient',p.ambientK,{loadFraction:0,heaterEnabled:false});
    c.assumptions.push('Thermal balance uses separately controlled absorbed-flux loads from the highest/lowest total absorption within the sampled mission interval, with hot operating, cold operating and unpowered survival cases. These sample bounds are not seasonal mission extrema.','Absorbed solar, albedo and Earth IR are represented as idealized absorbed heater inputs in a cold diffuse chamber. The nonzero shroud background is included physically, so this is not an exact equivalence to a 3 K flight sink. IR fixture layout, spectral absorption, view factors and support leaks need a detailed facility model.','Balance completion is based on article stabilization and dwell, not attainment of TVAC cycling levels. Synthetic response is retained for later comparison with calibrated measured temperatures and power.');
   }
   c.environmentSummary={periodS:period,sampleSpacingS:spacing,missionStartS:p.missionStartS,missionEndS:p.missionStartS+duration,sampleCount:samples.length,eclipseSamples:samples.filter(s=>s.environment.eclipse).length};
  }
 }else c.missingInputs.push('This plan is an interface/evidence review. It has no executable thermal exposure until an analysis or test case is selected.');
 if(!Object.hasOwn(raw,'sampleEveryS')){
  const maxPlanned=sum(c.steps.map(s=>s.durationS||s.maxDurationS||0));p.sampleEveryS=Math.max(180,Math.min(3600,Math.ceil(maxPlanned/900/10)*10));c.sampleEveryS=p.sampleEveryS;
  Object.assign(c.editableFields.find(f=>f.id==='sampleEveryS'),{value:p.sampleEveryS,basis:'Default plot/artifact spacing budgets roughly 900 samples for the longest planned schedule; integration, extrema, dwell and energy checks retain the smaller solver step.'});
 }
 c.assumptions.push('Recorded plot spacing is '+p.sampleEveryS+' seconds; integration, temperature extrema, excursion duration and energy checks use the smaller solver step. The automatic half-step comparison uses every integration time.','Approach: '+c.approach+'. No default cycle count, temperature margin or dwell here confers qualification or acceptance. All outputs remain uncorrelated numerical predictions.','Controls and boundary observations are retained in the case/run artifact together with configuration, model and plan revisions.');
 c.available=c.missingInputs.length===0&&c.steps.length>0;c.fingerprint=thermalFingerprint({...c,id:undefined,editableFields:undefined});c.id='THCASE-'+c.fingerprint;return c;
}
