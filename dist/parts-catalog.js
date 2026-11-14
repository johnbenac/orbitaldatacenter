import {buildEquipmentList} from './equipment-list.js';
import {launchFleet} from './launch-fleet.js';
import {launchSiteFor} from './launch-sites.js';
import {launchInfrastructureSources} from './launch-site-infrastructure.js';
import {launchUmbilicalDesign} from './launch-umbilicals.js';
import {processingFacility} from './processing-facilities.js';
import {bayLesson} from './bay-lessons.js';
import {GROUND_OPERATIONS,processingSources} from './ground-processing.js';
import {architectureFamily} from './architecture-families.js';
import {buildElectricalArchitecture,connectorSelections} from './electrical-architecture.js';

// Navigation describes the active build. Only MEL allocations own flight mass;
// surfaces, handling equipment and provider hardware never create ledger rows.
const CATEGORIES=[
 {id:'flight',label:'Spacecraft',description:'Installed flight equipment, launch interface and material details.'},
 {id:'launch',label:'Launch vehicle',description:'Selected carrier, stages, fairing and separation hardware.'},
 {id:'ground',label:'Ground support',description:'Integration fixtures, handling equipment and checkout stations.'},
 {id:'site',label:'Launch site',description:'Selected launch position, civil works and service connections.'}
];
const num=n=>Number.isFinite(n)?Number(n.toPrecision(5)):n;
const fact=(label,value,unit)=>({label,value:typeof value==='number'?num(value):value,...(unit?{unit}:{})});
const sources=items=>[...new Map((items||[]).filter(x=>x?.url||x?.sourceUrl).map(x=>[x.url||x.sourceUrl,{label:x.label||x.title||x.sourceTitle||x.referenceModel||'Source',url:x.url||x.sourceUrl}])).values()];
const f=(...ids)=>ids.map(id=>'flight:'+id);
const unavailable=reason=>({family:'flight',unavailable:true,unavailableReason:reason});
const flightGeometry={
 '01.01':{roles:['compute-board','cold-plate']},'01.02':{roles:['compute-chassis']},'01.03':{roots:['recorder']},
 '01.04':{roots:['fabric']},
 '02.01':{roles:['solar-active','solar-backing','solar-boom']},'02.02':{roles:['battery-case']},
 '02.03':{roots:['pcdu']},
 '03.01':{roles:['radiator-finish','radiator-face-sheet','radiator-core','radiator-passage']},
 '03.02':{roles:['coolant-tube','passive-heat-pipe','heat-pump-case']},'03.03':{roles:['mli-outer','mli-white-outer']},
 '04.01':{roots:['gyroPack']},'04.02':{roots:['torquers']},
 '04.03':{electricalItemId:'flight:04.03'},
 '05.01':{roots:['patches']},'05.02':{roots:['dish.parent.parent']},'05.03':{roots:['opticalTerminals.parent.parent','optic.parent.parent']},
 '06.01':{roots:['engines']},'06.02':{roles:['propellant-feed']},'06.03':{roots:['tankMap.fuel']},
 '06.04':{roots:['tankMap.oxidizer']},'06.05':{roots:['tankMap.helium']},
 '07.01':{roles:['primary-frame','launch-interface']},'07.02':{roles:['enclosure-face-sheet','sandwich-core','feedthrough-seal']},
 '07.03':unavailable('Shielding is an allocated wall-area mass. The current model does not resolve a separate radiation-shield layer.'),
 '07.04':{roles:['deployment-hardware']},'07.05':{roots:['harnesses']},'08.01':{roots:['avionics']},
 '09.01':{family:'launch',roots:['parts.fitting','parts.liveMount']}
};
const neighbors={
 '01.01':f('01.02','03.02','03.01'),'01.02':f('01.01','01.04','07.01'),'01.03':f('01.04','08.01'),
 '01.04':f('01.01','01.03','05.03'),'02.01':f('02.03','02.02','07.04'),'02.02':f('02.01','02.03'),
 '02.03':f('02.01','02.02','07.05'),'03.01':f('03.02','01.01','07.04'),'03.02':f('01.01','03.01'),
 '03.03':f('07.02','03.01'),'04.01':f('04.02','04.03','08.01'),'04.02':f('04.01','04.03'),
 '04.03':f('04.01','08.01'),'05.01':f('08.01','07.05'),'05.02':f('01.04','04.03'),'05.03':f('01.04','04.03'),
 '06.01':f('06.02','06.03','06.04'),'06.02':f('06.01','06.03','06.04','06.05'),
 '06.03':f('06.06','06.02'),'06.04':f('06.07','06.02'),'06.05':f('06.08','06.02'),
 '06.06':f('06.03'),'06.07':f('06.04'),'06.08':f('06.05'),
 '07.01':f('07.02','01.02','09.01'),'07.02':f('07.01','03.03','07.03'),'07.03':f('07.02','01.01'),
 '07.04':f('02.01','03.01'),'07.05':f('02.03','08.01'),'08.01':f('01.04','04.03','05.01','07.05'),
 '09.01':['launch:vehicle','ground:adapter',...f('07.01')]
};
const INVENTORY=new Set(['06.06','06.07','06.08']);
const CONCEALED=new Set(['mli-inner','solar-coverglass']);
const STATIONS=[
 ['checkout','conops'],['compute','compute'],['data','data'],['power','power'],['thermal','thermal'],
 ['attitude','attitude'],['propulsion','prop'],['mass','mass'],['alignment','mechanical'],['fit','launch'],
 ['adapter','launcher'],['environment','environment'],['orbit','orbit'],['avionics','avionics'],
 ['rf','comm','sband'],['rf-ka','comm','ka'],['rf-optical','comm','optical']
];
const stationFlight={checkout:f('08.01'),compute:f('01.01','01.02'),data:f('01.03','01.04'),power:f('02.02','02.03'),thermal:f('03.02','03.01'),attitude:f('04.01','04.03'),propulsion:f('06.02','06.03','06.04'),mass:f('07.01','09.01'),alignment:f('07.01','09.01'),fit:f('09.01'),adapter:f('09.01'),environment:f('03.03','07.02'),orbit:f('08.01'),avionics:f('08.01'),rf:f('05.01'),'rf-ka':f('05.02'),'rf-optical':f('05.03')};

export function buildPartsCatalog(h,s=null){
 const mel=buildEquipmentList(h,s),records=[],byId=Object.create(null),d=h.input,fleet=launchFleet[d.launcher],site=launchSiteFor(d.launcher,d.launchSite),facility=processingFacility(h),family=architectureFamily(h),familyModel=family.id!=='protected-core'||family.kaTerminalCount!==1||family.sPatchCount!==2;
 const add=record=>{const r={description:'',facts:[],sources:[],basis:'',relatedIds:[],animations:[],...record};if(byId[r.id])throw new Error('Duplicate part '+r.id);r.sources=sources(r.sources);records.push(r);byId[r.id]=r;return r};
 for(const row of mel.rows){
  const geometry=INVENTORY.has(row.wbs)?unavailable('Loaded fluid inventory is a quantity inside its vessel, not a separately modeled solid part. Open the related pressure vessel to inspect its hardware.'):{family:'flight',...(flightGeometry[row.wbs]||unavailable('No separate geometry is modeled for this allocation.'))};
  const r=add({id:'flight:'+row.wbs,title:row.item,category:'flight',cluster:row.subsystem,wbs:row.wbs,quantity:row.quantity,quantityUnit:row.unit,description:row.massBasis,materials:row.materials,
   facts:[fact('Quantity',row.quantity,row.unit),fact('Allocation mass',row.extendedMassKg,'kg'),fact('Average unit mass',row.unitMassKg,'kg'),fact('Mass boundary',row.classification),fact('Operating power',row.operatingPowerW==null?'Unallocated':row.operatingPowerW,row.operatingPowerW==null?null:'W'),fact('Envelope',row.dimensionsM.map(num).join(' × '),'m'),fact('Dimension boundary',row.dimensionScope),fact('Reference article',row.manufacturer+' · '+row.referenceModel),fact('Evidence',row.evidence)],
   sources:[row,...row.otherSources,{title:row.powerSourceName,url:row.powerSourceUrl},{title:row.dimensionSourceName,url:row.dimensionSourceUrl}],
   basis:row.dimensionBasis+' '+row.heritage+' Rendered hardware follows the active study geometry; it is not supplier CAD.',
   referenceHardware:{manufacturer:row.manufacturer,referenceModel:row.referenceModel,sourceUrl:row.sourceUrl,evidence:row.evidence,heritage:row.heritage},
   relatedIds:[...(neighbors[row.wbs]||[]),...(row.assemblyDetails||[]).map(x=>x.itemId)],electricalDefinition:row.assemblyDetails?.length?{kind:'equipment',itemId:'flight:'+row.wbs}:undefined,render:geometry,massAccounting:'mel-allocation',extendedMassKg:row.extendedMassKg,
   animations:['02.01','03.01','07.04'].includes(row.wbs)?[{id:'deployment',label:'Deploy & stow'}]:row.wbs==='04.01'?[{id:'cmg',label:'Gyro motion'}]:['05.02','05.03'].includes(row.wbs)?[{id:'terminals',label:'Terminal pointing'}]:[]});
  if(row.instantPowerW!=null)r.facts.push(fact('Power at mission instant',row.instantPowerW,'W'));
  for(const detail of row.materialAssignments||[]){
   const hidden=CONCEALED.has(detail.role),scope=geometry.roots;
   const render=geometry.unavailable?{...geometry}:hidden?unavailable(detail.visibility):geometry.family==='launch'?{...geometry,contextOnly:true,contextLabel:'Adapter assembly shown for this finish assignment; the model has no separate material-layer mesh.'}:{family:geometry.family,roles:[detail.role],...(scope?{scopeRoots:scope}:{}),...(geometry.contextOnly?{contextOnly:true,contextLabel:geometry.contextLabel}:{}),fallbackPartIds:[]};
   if(detail.role==='electrical-busbar'||detail.role==='rf-contact'&&row.wbs==='05.01')Object.assign(render,unavailable('The internal conductor material is allocated, but its individual geometry is not resolved in the current electronics model.'));
   if(['radiator-face-sheet','sandwich-core','feedthrough-seal','electrical-winding'].includes(detail.role))Object.assign(render,{...(geometry.roles?{fallbackRoles:geometry.roles}:{fallbackRoots:geometry.roots}),contextLabel:'Parent assembly shown when this internal material layer has no separate mesh in the selected architecture.'});
   add({id:'flight:'+detail.id,title:detail.label,category:'flight',cluster:row.subsystem,parentId:r.id,wbs:detail.id,description:detail.coverage,
    facts:[fact('Material',detail.materialName||detail.materialId),fact('Composition',detail.materialComposition),fact('Finish',detail.materialFinish),fact('Visibility',detail.visibility),fact('Mass accounting','Included in WBS '+row.wbs+'; no additional mass')],
    sources:detail.selectionSourceUrls?.length?detail.selectionSourceUrls.map(url=>({url,label:'Material selection reference'})):r.sources,
    basis:detail.evidence?.basis||detail.massBasis,relatedIds:[r.id],render,animations:r.animations,massAccounting:'included-in-parent',materialId:detail.materialId,materials:[{id:detail.materialId,name:detail.materialName}]});
  }
 }
 const electrical=buildElectricalArchitecture(h);
 for(const r of records.filter(r=>r.massAccounting==='mel-allocation'&&!r.render?.unavailable&&(r.id==='flight:07.05'||electrical.boxes.some(b=>b.itemId===r.id)))){r.electricalDefinition={kind:'equipment',itemId:r.id};if(!r.animations.some(a=>a.id==='electrical'))r.animations=[...r.animations,{id:'electrical',label:'Continuity & signal rehearsal'}];}
 for(const detail of mel.assemblyDetails){
  const parent=byId[detail.parentId],definition=detail.electricalDefinition,hs=electrical.harnesses.filter(a=>definition.harnessIds?.includes(a.id)||definition.portIds?.includes(a.fromPortId)||definition.portIds?.includes(a.toPortId)),related=[detail.parentId,...hs.flatMap(a=>[electrical.boxById[a.fromBoxId].itemId,electrical.boxById[a.toBoxId].itemId,...electrical.connectorDetails.filter(c=>c.portIds.includes(a.fromPortId)||c.portIds.includes(a.toPortId)).map(c=>c.itemId)])].filter(id=>id!==detail.itemId);
  const thermal=detail.electricalThermalModel;
  const extra=detail.kind==='harness'?(()=>{const a=electrical.harnesses.find(a=>a.id===detail.exemplarHarnessId);return [fact('Example assembly',a.id),fact('Route / cut length',num(a.routeLengthM)+' / '+num(a.cutLengthM),'m'),fact('Wire or fiber',a.wire.construction),fact('Maximum circuit current',Math.max(...hs.map(a=>a.currentA)),'A'),fact('Selection voltage',Math.max(...hs.map(a=>a.voltageV)),'V'),fact('Endpoint definitions',hs.length),fact('Mated interfaces per assembly',a.totalMatedInterfacesPerAssembly)]})():detail.kind==='connector'?[fact('Mating family',detail.referenceModel),fact('Procurement unit','One cable plug + equipment receptacle'),fact('Supplier approval','Open; selected catalog family is not flight qualification')]:[fact('Operating power',detail.operatingPowerW,'W')];
  add({id:detail.itemId,title:detail.title,category:'flight',cluster:parent?.cluster||'Spacecraft avionics',parentId:detail.parentId,wbs:detail.wbs,quantity:detail.quantity,quantityUnit:detail.unit,description:detail.description,facts:[fact('Quantity',detail.quantity,detail.unit),fact('Included allocation mass',detail.extendedMassKg,'kg'),fact('Independent material estimate',detail.estimatedMassKg,'kg'),fact('Mass accounting','Included in '+detail.parentWbs+'; no additional spacecraft mass'),...extra,fact('Procurement','Build specification / supplier quote required')],sources:detail.sources,basis:detail.basis,relatedIds:[...new Set(related)],render:{family:'flight',electricalItemId:detail.itemId},animations:[{id:'electrical',label:'Continuity & signal rehearsal'}],massAccounting:'included-in-parent',extendedMassKg:detail.extendedMassKg,materialId:detail.materialId,materials:[{id:detail.materialId,name:detail.materialId==='electronics-board'?'Electronic circuit board':detail.materialId==='harness-polyimide'?'Copper / insulated cable':detail.materialId==='rf-dielectric'?'RF dielectric / antenna substrate':'Aluminum connector shell'}],electricalDefinition:definition,electricalThermalModel:thermal,procurement:detail.procurement,referenceHardware:{manufacturer:detail.manufacturer,referenceModel:detail.referenceModel,sourceUrl:detail.sourceUrl,evidence:'Supplier family / project allocation',heritage:detail.basis}});
 }
 const egseType=connectorSelections['spacewire-a'];
 add({id:'ground:egse-cable',title:'Removable electrical checkout cable',category:'ground',cluster:'Electrical ground support',parentId:'ground:avionics',description:'A 3 m Omnetics SpaceWire Type A bench lead connects the controlled ground checkout adapter to the spacecraft flight-side EGSE interface. Remove before flight; it is outside the spacecraft mass ledger.',facts:[fact('Nominal length',3,'m'),fact('Raw interface rate',100,'Mbit/s'),fact('Cable wiring','Type A, eight signal wires; position3 unpopulated'),fact('Scope','Removable ground equipment; no flight mass')],sources:egseType.sourceIds.map(id=>electrical.sources[id]),basis:egseType.procurement+' A 3 m physical lead is shown for the checkout setting. The released ground adapter, isolation, safe-to-mate procedure and supplier order are controlled integration artifacts.',relatedIds:['ground:avionics','ground:checkout','flight:07.05.16','flight:08.01'],render:{family:'flight',electricalItemId:'ground:egse-cable'},animations:[{id:'electrical',label:'Ground checkout flow'}],electricalDefinition:{kind:'ground-harness',itemId:'ground:egse-cable',flightInterfaceId:'flight:07.05.16'},electricalThermalModel:{kind:'ground-harness',massKg:3*.045+2*egseType.estimatedPairKg,specificHeatJPerKgK:600,areaM2:Math.PI*.005*3,loadW:0,emissivity:.8,absorptivity:.4,scope:'One removable 3 m ground checkout cable, not installed flight hardware',basis:'Explicit3 m cable with estimated0.045 kg/m jacket/conductor composite plus two mated interfaces;600 J/(kg·K) preliminary effective capacity. Ground fixture is outside the flight ledger.'}});
 const launchSources=sources([{title:fleet.sourceTitle,url:fleet.sourceUrl},{title:fleet.evidenceTitle,url:fleet.evidenceUrl}]);
 const launchBasis='Recognition geometry from the current '+fleet.name+' model. Dimensions and installation details are schematic unless identified in the cited provider reference. Launch-vehicle mass is outside the spacecraft MEL.';
 const launch=(id,title,render,extra={})=>add({id:'launch:'+id,title,category:'launch',cluster:fleet.name,parentId:id==='vehicle'?undefined:'launch:vehicle',description:fleet.architecture,sources:launchSources,basis:launchBasis,render:{family:'launch',...render},...extra});
 launch('vehicle',fleet.name,{roots:['parts.stage']},{facts:[fact('Provider',fleet.provider),fact('Configuration',fleet.status),fact('Reference height',fleet.heightM,'m'),fact('Core diameter',fleet.diameterM,'m'),fact('Stages',fleet.stages),fact('Side boosters',fleet.boosters)],relatedIds:['flight:09.01','site:launch-position','ground:facility'],basis:launchBasis+' '+(fleet.dimensionNote||'')});
 launch('core',fleet.family==='Starship'?'Super Heavy booster':'Core stage',{roots:['parts.lower']},{facts:[fact('Core engines',fleet.coreEngines==null?'Unspecified':fleet.coreEngines)],relatedIds:['launch:core-engines']});
 if(fleet.coreEngines!=null)launch('core-engines','Core engine installation',{names:[fleet.family==='Starship'?'Raptor 3':fleet.family==='Falcon Heavy'?'Merlin 1D':'Engine nozzle'],scopeRoots:['parts.lower']},{parentId:'launch:core',quantity:fleet.coreEngines,facts:[fact('Core engine count',fleet.coreEngines)],description:'The rendered engine bells and their installation on the selected core stage.'});
 if(fleet.stages>1){
  launch('upper',fleet.family==='Starship'?'Starship upper stage':'Upper stage',{roots:['parts.upper']},{relatedIds:['launch:upper-engines','flight:09.01']});
  if(fleet.upperEngines)launch('upper-engines','Upper-stage engine installation',{names:fleet.family==='Starship'?['Raptor 3','Raptor Vacuum']:fleet.family==='Falcon Heavy'?['Merlin Vacuum']:['Engine nozzle'],scopeRoots:['parts.upper']},{parentId:'launch:upper',quantity:fleet.upperEngines,facts:[fact('Upper-stage engines',fleet.upperEngines)],description:'The rendered upper-stage engine installation.'});
 }
 launch('fairing',fleet.family==='Starship'?'Integrated cargo bay':'Payload fairing',{roots:['parts.shell']},{description:fleet.family==='Starship'?'Retained cargo shell with the workbench’s large-payload hatch and carriage concept.':'Protective fairing around the stowed payload; the halves separate in the mission sequence.',facts:[fact('Modeled outer diameter',h.fairing.outerDiameterM,'m')],relatedIds:['flight:09.01','ground:fit'],animations:[{id:'fairing',label:fleet.family==='Starship'?'Cargo hatch sequence':'Open fairing'}]});
 for(let i=0;i<fleet.boosters;i++)launch('booster-'+(i+1),'Side booster '+(i+1),{roots:['parts.boosters.'+i]},{description:'Individual strap-on booster in the selected launcher configuration.',quantity:1});
 if(fleet.family==='Starship'){
  for(const [id,title,names] of [['cargo-door','Retained cargo door',['Retained cargo door']],['cargo-carriage','Retained cargo carriage',['Retained cargo carriage']],['cargo-tracks','Cargo guide tracks',['Fixed cargo tracks','Telescoping retained guide']],['grid-fins','Super Heavy grid fins',['V3 lowered grid fin']],['body-flaps','Starship body flaps',['Forward body flap','Aft body flap']]])launch(id,title,{names},{parentId:id.startsWith('cargo')?'launch:fairing':id==='grid-fins'?'launch:core':'launch:upper',description:id.startsWith('cargo')?'ODC large-cargo integration assumption, distinct from the flown satellite dispenser.':fleet.architecture});
 }else{
  // The half-shell meshes exist in the selected fairing, with no invented internals.
  launch('fairing-shells','Fairing half shells',{names:['Fairing half shell'],scopeRoots:['parts.shell']},{parentId:'launch:fairing',quantity:2,description:'Two modeled fairing shell halves, including the shell exterior.'});
 }
 if(fleet.family==='Falcon Heavy')for(const [id,title,name] of [['landing-legs','Folded landing legs','Falcon landing leg'],['grid-fins','Stowed grid fins','Stowed Falcon grid fin']])launch(id,title,{names:[name]},{description:'Recovery hardware shown on the three-core reference configuration; actual flight fit depends on the recovery plan.'});
 const groundBasis='Ground equipment is a schematic study fixture, not vendor CAD or a certified capacity. Its count and mass are separate from spacecraft equipment. '+facility.scope;
 const ground=(id,title,render,extra={})=>add({id:'ground:'+id,title,category:'ground',cluster:'Integration & handling',parentId:id==='facility'?undefined:'ground:facility',description:'Ground equipment in '+facility.shortName+'.',sources:facility.sources,basis:groundBasis,render:{family:'launch',stationDomain:'conops',...render},...extra});
 ground('facility',facility.name,{roots:['parts.facility']},{facts:[fact('Location',facility.location),fact('Status',facility.statusLabel),fact('Geometry','Schematic processing and integration areas')],description:facility.scope,relatedIds:['launch:vehicle','site:launch-position']});
 for(const [id,domain,bench] of STATIONS){
  const lesson=bayLesson(domain,h,bench||'sband'),operation=GROUND_OPERATIONS.find(op=>op.domain===domain&&(!op.commBench||op.commBench===(bench||'sband'))&&op.id!=='propellant');
  ground(id,lesson.stationName,{roots:['bay.station'],stationDomain:domain,stationId:id,commBench:bench||'sband'},{cluster:'Checkout stations',description:lesson.explanation,
   facts:[fact('Task',lesson.title),...(lesson.facts||[]).map(x=>fact('Flight target · '+x.label,x.value,x.unit)),fact('Processing facility',facility.shortName)],
   sources:[...lesson.sources,...facility.sources],basis:lesson.procedure+' '+groundBasis,relatedIds:stationFlight[id]||[],animations:operation&&!(operation.id==='coolant'&&h.energySystem.thermal.kind==='passive-local')?[{id:'processing',label:operation.shortTitle+' sequence',operation:operation.id}]:[]});
 }
 const load=GROUND_OPERATIONS.find(x=>x.id==='propellant');
 ground('propellant-loading','Dedicated propellant servicing cell',{roots:['bay.station'],stationDomain:'prop',stationId:'propellant-loading',processingId:'propellant'},{cluster:'Fluid servicing',description:load.purpose,sources:[processingSources[load.source],...facility.sources],basis:load.gate+' '+groundBasis,relatedIds:['ground:propulsion',...f('06.03','06.04','06.06','06.07')],animations:[{id:'processing',label:'Loading sequence',operation:'propellant'}]});
 const fixtures=[
 ['checkout-stand','Checkout stand',['Checkout bearing plate','Checkout hardpoint support','Pedestal load cell']],
 ['adapter-stand','Adapter stand',['Adapter bearing plate']],['bridge-crane','Bridge crane',['Traveling crane bridge']],
 ['crane-hoist','Traveling hoist',['Crane traveling hoist']],['lifting-yoke','Payload lifting yoke',['Load-spreading lifting yoke']],
 ['lifting-frame','Removable payload lifting frame',['Removable payload lifting frame']],
  ['receiving-cradle','Receiving stage support',['Horizontal upper-stage cradle','Starship transport stand','Vertical launch interface']],
 ['gse-storage','Ground equipment storage',['Portable electrical GSE storage','Cleanroom support cabinet','Portable test instrumentation','Ground service equipment storage']]
 ];
 if(fleet.family!=='Starship')fixtures.push(['fairing-carrier','Fairing half carriers',['Fairing half carrier']],['transfer-support','Payload transfer support',['Encapsulated payload transfer support']]);
 else fixtures.push(['cargo-load-bridge','Cargo load bridge',['Ground support · carriage load bridge']]);
 for(const [id,title,names] of fixtures){
  const lifting=['lifting-yoke','lifting-frame'].includes(id),starLifting=lifting&&fleet.family==='Starship',transfer=id==='transfer-support',noStand=id==='adapter-stand'&&fleet.family==='Starship';
  ground(id,title,{names,...(noStand?{unavailable:true,unavailableReason:'No separate adapter stand is modeled for the selected Starship integration layout.'}:{}),...(lifting||transfer?{integrationProgress:transfer?.9:starLifting?.48:.35}:{})},{description:noStand?'This Starship integration layout does not include a separate modeled ground adapter stand.':'Modeled '+title.toLowerCase()+' used for spacecraft preparation and carrier integration.',relatedIds:id.startsWith('adapter')?f('09.01'):id.startsWith('fairing')?['launch:fairing']:['ground:facility'],animations:['bridge-crane','crane-hoist','lifting-yoke','lifting-frame','transfer-support'].includes(id)?[{id:'integration',label:'Integration handling sequence',...(lifting?starLifting?{from:-2352,to:-1512}:{from:-2718,to:-2424}:transfer?{from:-1248,to:-660}:{})}]:[]});
 }
 for(const [id,parent,title,name] of [
  ['cooling-pump','thermal','Ground conditioning pump','Ground conditioning pump'],['cooling-reservoir','thermal','Isolated ground coolant reservoir','Isolated ground coolant reservoir'],['heat-exchanger','thermal','Ground plate heat exchanger','Plate heat exchanger'],
  ['power-converter','power','Ground power converter','Ground power converter'],['alignment-telescope','alignment','Alignment telescope head','Telescope pointing axis'],
  ['rf-test-hat','rf','Shielded S-band test hat','Shielded S-band test hat'],['ka-test-port','rf-ka','Ka conducted RF test port','Ka conducted RF test port'],['optical-test-head','rf-optical','Enclosed optical test head','Enclosed optical test head']
 ]){const p=byId['ground:'+parent];ground(id,title,{...p.render,roots:[],names:[name]},{parentId:p.id,cluster:p.cluster,description:'Rendered component of the '+p.title.toLowerCase()+'.',sources:p.sources,basis:p.basis,relatedIds:[p.id,...p.relatedIds]});}
 const siteBasis=site.geometryBasis+' Launch-site mass and service inventory are outside the spacecraft MEL.';
 const sitePart=(id,title,render,extra={})=>add({id:'site:'+id,title,category:'site',cluster:site.name,parentId:id==='launch-position'?undefined:'site:launch-position',description:site.siteNote,sources:site.sources,basis:siteBasis,render:{family:'launch',...render},...extra});
 sitePart('launch-position',site.name+' · '+site.range,{roots:['parts.tower']},{facts:[fact('Range',site.range),fact('Country',site.country),fact('Status',site.statusLabel),fact('Coordinates',num(site.lat)+'°, '+num(site.lon)+'°')],relatedIds:['launch:vehicle','ground:facility']});
 sitePart('launch-table','Launch table and restraints',{names:['Launcher bearing table']},{relatedIds:['site:restraints','launch:core'],description:'Bearing table with openings for the selected launcher’s exhaust paths.'});
 sitePart('restraints','Launch restraints',{names:['Launch restraint']},{parentId:'site:launch-table',description:'Modeled bearing seats and hydraulic release jaws at the vehicle hold-down interfaces.'});
 for(const [id,key,names] of [['exhaust-path','exhaust',['Launch table and exhaust works']],['pad-support','support',['Pad service tower','Transporter-erector tipback pivot','Falcon transporter-erector']],['water-supply','water',['Sound suppression water supply','Water cooling manifold','Water injection nozzle']],['lightning-protection','lightning',['Site lightning protection']],['commodity-services','commodities',['Representative commodity services']]]){
  const feature=site.infrastructure[key],known=feature?.visual?.render!==false&&feature?.status!=='unknown';
  sitePart(id,feature.label,known?{names}:{unavailable:true,unavailableReason:feature.basis},{description:feature.basis,basis:feature.basis+' '+siteBasis,sources:(feature.sourceIds||[]).map(key=>launchInfrastructureSources[key]).filter(Boolean),facts:[fact('Evidence',feature.status)],...(id==='exhaust-path'&&known?{render:{family:'launch',names,contextOnly:true,contextLabel:'Exhaust civil works shown together with the launch-table structure.'}}:{})});
 }
 sitePart('utility-distribution','Ground utility distribution',{names:['Ground utility distribution']},{description:'Symbolic ground-side distribution boundary for routed service circuits.'});
 const commodities=site.infrastructure.commodities;
 for(const species of commodities?.species||[])sitePart('commodity-'+species.id,species.label+' service',{names:[species.label]},{parentId:'site:commodity-services',description:commodities.inventoryBasis,basis:commodities.basis+' '+commodities.inventoryBasis,facts:[fact('Commodity',species.label),fact('State',species.state||'Unspecified'),fact('Inventory','No vessel capacity or physical tank count assigned')],sources:(commodities.sourceIds||[]).map(id=>launchInfrastructureSources[id]).filter(Boolean)});
 const umb=launchUmbilicalDesign(h),umbSources=Object.fromEntries(umb.sources.map(x=>[x.id,x]));
 for(const group of umb.groups){
  const flight=group.release.event==='payload-release',id=(flight?'launch:':'site:')+'umbilical-'+group.id;
  add({id,title:group.name,category:flight?'launch':'site',cluster:flight?'Payload separation':'Umbilicals & services',parentId:flight?'flight:09.01':'site:launch-position',description:group.basis,
   facts:[fact('Architecture',group.architecture),fact('Release event',group.release.event),fact('Interface status',group.status)],sources:group.sourceIds.map(id=>umbSources[id]),basis:group.geometryBasis+' '+group.release.basis+' '+umb.scope,relatedIds:flight?f('09.01','08.01'):['site:utility-distribution','launch:vehicle'],render:{family:'launch',umbilicalGroup:group.id},animations:[{id:'service',label:'Disconnect sequence',groupId:group.id,from:group.release.motionStart-1,to:group.release.motionEnd+1}]});
  for(const connection of umb.connections.filter(c=>c.groupId===group.id))add({id:(flight?'launch:':'site:')+'connection-'+connection.id,title:connection.name,category:flight?'launch':'site',cluster:flight?'Payload separation':'Umbilicals & services',parentId:id,description:connection.purpose,
   facts:[fact('Medium',connection.medium),fact('From',connection.source),fact('To',connection.destination),fact('Direction',connection.direction),fact('Interface status',connection.interfaceStatus)],sources:connection.sourceIds.map(id=>umbSources[id]),basis:connection.basis+' '+umb.scope,relatedIds:[id,...(flight?f('09.01','08.01'):['site:utility-distribution'])],render:{family:'launch',connectionId:connection.id},animations:byId[id].animations});
 }
 // Prune options absent from this selected architecture, then make links reciprocal.
 for(const r of records)r.relatedIds=[...new Set([...(r.parentId?[r.parentId]:[]),...r.relatedIds])].filter(id=>id!==r.id&&byId[id]);
 for(const r of records)for(const id of r.relatedIds)if(!byId[id].relatedIds.includes(r.id))byId[id].relatedIds.push(r.id);
 for(const id of ['ground:avionics','ground:checkout'])if(byId[id])byId[id].relatedIds=[...new Set([...(byId[id].relatedIds||[]),'ground:egse-cable','flight:07.05.16'])];
 return {schema:'orbital-data-center/parts/1',records,byId,categories:CATEGORIES.map(x=>({...x,count:records.filter(r=>r.category===x.id).length})),reference:mel.reference,massAccounting:'Only flight MEL allocation records own mass. Material details and ground, launch and site records are non-additive.',flightTotals:mel.totals};
}

const annotationParts={
 'checkout-stand':'ground:checkout-stand','adapter-stand':'ground:adapter-stand','bridge-crane':'ground:bridge-crane','crane-hoist':'ground:crane-hoist','lifting-yoke':'ground:lifting-yoke','receiving-cradle':'ground:receiving-cradle','service-platform':'ground:receiving-cradle','transfer-support':'ground:transfer-support','cargo-load-bridge':'ground:cargo-load-bridge','fairing-carrier-1':'ground:fairing-carrier','fairing-carrier--1':'ground:fairing-carrier','launch-table':'site:launch-table','exhaust-path':'site:exhaust-path','pad-support':'site:pad-support','transporter-erector':'site:pad-support','deluge-header':'site:water-supply','water-supply':'site:water-supply','water-distribution':'site:water-supply','utility-boundary':'site:utility-distribution','lightning-protection':'site:lightning-protection','lightning-catenary':'site:lightning-protection'
};
const broadFlight={compute:'01.01',storage:'01.03',battery:'02.02',solar:'02.01',solarRoot:'02.01',radiator:'03.01',radiatorRoot:'03.01',coolant:'03.02',cmg:'04.01',torquer:'04.02',optic:'05.03',dish:'05.02',patch:'05.01',propellant:'06.02',fuel:'06.03',oxidizer:'06.04',helium:'06.05',engine:'06.01',structure:'07.01',body:'07.01',orbitCraft:'07.01',avionics:'08.01',adapter:'09.01',payload:'07.01'};
export function resolveScenePart(catalog,selection={}){
 if(!catalog?.byId)return null;
 const get=id=>catalog.byId instanceof Map?catalog.byId.get(id):catalog.byId[id],records=catalog.records||[];
 for(const id of [selection.selectedPartId,selection.partId,selection.id])if(id&&get(id))return get(id);
 const wbs=[selection.wbs].flat().filter(Boolean);for(const id of wbs)if(get('flight:'+id))return get('flight:'+id);
 const connection=selection.connectionId,group=selection.umbilicalGroup||selection.groupId;
 if(connection){const r=records.find(x=>x.render?.connectionId===connection);if(r)return r;}
 if(group){const r=records.find(x=>x.render?.umbilicalGroup===group);if(r)return r;}
 const annotation=selection.annotationId||'',station=selection.stationId;
 if(annotationParts[annotation]&&get(annotationParts[annotation]))return get(annotationParts[annotation]);
 if(annotation.startsWith('commodity-')&&get('site:'+annotation))return get('site:'+annotation);
 if(annotation.startsWith('gse-storage-'))return get('ground:gse-storage')||null;
 if(annotation.startsWith('lightning-'))return get('site:lightning-protection')||null;
 if(annotation.startsWith('restraint-'))return get('flight:07.04')||null;
 if(annotation==='flight-article')return get('flight:07.01')||null;
 const names=[selection.name,selection.objectName,...selection.names||[]].filter(Boolean),roots=[selection.rootKey,...selection.rootKeys||[]].filter(Boolean),roles=[selection.materialRole,...selection.materialRoles||[]].filter(Boolean);
 const category=selection.category||selection.root;
 let candidates=records.filter(r=>!r.render?.unavailable&&(!category||r.category===category||(category==='launch'&&r.id.startsWith('flight:09.01'))));
 const rootMatches=(p,k)=>[p,p.replace(/(?:\.parent)+$/,'')].some(path=>path===k||path==='parts.'+k),matchesRoot=p=>roots.some(k=>rootMatches(p,k));
 // Exact selected object names win over its broad assembly ancestry.
 const named=candidates.filter(r=>r.render?.names?.some(n=>names.includes(n))&&(!r.render.scopeRoots?.length||!roots.length||r.render.scopeRoots.some(matchesRoot)));
 if(named.length){named.sort((a,b)=>Math.min(...a.render.names.map(n=>names.indexOf(n)).filter(n=>n>=0))-Math.min(...b.render.names.map(n=>names.indexOf(n)).filter(n=>n>=0)));return named[0];}
 if(station&&get('ground:'+station))return get('ground:'+station);
 const rootRank=r=>Math.min(...[...r.render?.roots||[],...r.render?.scopeRoots||[]].flatMap(p=>roots.map((k,i)=>rootMatches(p,k)?i:Infinity)));
 const rootedAll=candidates.filter(r=>[...r.render?.roots||[],...r.render?.scopeRoots||[]].some(matchesRoot)),bestRank=Math.min(...rootedAll.map(rootRank)),rooted=rootedAll.filter(r=>rootRank(r)===bestRank);
 const scoped=rooted.filter(r=>r.render?.roles?.some(role=>roles.includes(role)));
 if(scoped.length===1)return scoped[0];
 if(rooted.length){const direct=rooted.find(r=>r.massAccounting==='mel-allocation'&&!r.render.contextOnly)||rooted.find(r=>r.massAccounting==='mel-allocation')||rooted.find(r=>!r.render?.roles?.length);if(direct)return direct;}
 const roleMatches=candidates.filter(r=>r.render?.roles?.some(role=>roles.includes(role)));
 const uniqueDetails=roleMatches.filter(r=>r.massAccounting==='included-in-parent');
 if(uniqueDetails.length===1)return uniqueDetails[0];
 const alloc=roleMatches.filter(r=>r.massAccounting==='mel-allocation');if(alloc.length===1)return alloc[0];
 const anchorKey=selection.instrument||annotation.replace(/^(?:instrument:|flight-)/,''),key=broadFlight[anchorKey]||broadFlight[anchorKey.split('-')[0]];
 if(key)return get('flight:'+key)||null;
 const ids=[selection.id,selection.assembly,...selection.partIds||[]].filter(Boolean);
 if(category==='site'||ids.includes('pad')&&category!=='ground')return get('site:launch-position')||null;
 if(category==='ground')return get('ground:facility')||null;
 if(category==='launch'){
  if(ids.includes('fairing'))return get('launch:fairing')||null;
  if(ids.includes('adapter'))return get('flight:09.01')||null;
  return get('launch:vehicle')||null;
 }
 for(const id of ids){const key=broadFlight[id];if(key&&get('flight:'+key))return get('flight:'+key);}
 return null;
}
