// H05 only: the June pump-controller pocket, its 13 actual meshes, complete
// plug strokes and finite-radius tangent leads. The diagnostic construction
// boundary precedes electrical route planning; it is not a routing certificate.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as T from './dist/vendor/three.module.js';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {buildElectricalArchitecture} from './dist/electrical-architecture.js';
import {componentMassProperties} from './dist/component-stations.js';
import {makeCraft} from './dist/craft.js';
import {electricalRoutingDiagnostics,physicalFlightMeshes} from './dist/installed-electrical-routing.js';
import {inspectInstalledEquipmentHardware} from './dist/fixed-collector-accommodation.js';
import {obstacleFromMesh} from './dist/routing-audit.js';

const started=Date.now(),configurationId='orbital-1-202606',boxId='thermal-drive';
const outputArg=process.argv.indexOf('--output'),output=outputArg<0?null:process.argv[outputArg+1];
assert(outputArg<0||output,'--output requires a file path');
const digest=value=>createHash('sha256').update(value).digest('hex');
const sourcePath=path=>fileURLToPath(new URL(path,import.meta.url));
const source=path=>readFileSync(sourcePath(path),'utf8');
const layoutSource=source('./dist/fabric-equipment-layout.js'),architectureSource=source('./dist/electrical-architecture.js');
const oldCall="accommodateRackServiceControls(boxes,h,{thermal:family.id!=='orbital-rack'});";
const newCall="accommodateRackServiceControls(boxes,h,{thermal:family.id!=='orbital-rack'||h.input.referenceCenterId==='orbital-1-202606'});";
const oldGate="if(h.rackLayout.installed<64||h.payloadLocation==='radiator')return [];";
const newGate="const junePump=thermal&&h.input?.referenceCenterId==='orbital-1-202606'&&h.input?.architectureFamily==='orbital-rack';\n if((h.rackLayout.installed<64&&!junePump)||h.payloadLocation==='radiator')return [];";
const oldFilter="boxes.filter(b=>b.id==='deployment-control'||thermal&&b.id==='thermal-drive')";
const newFilter="boxes.filter(b=>h.rackLayout.installed>=64&&b.id==='deployment-control'||thermal&&b.id==='thermal-drive')";
const replaceOne=(text,before,after)=>{assert.equal(text.split(before).length,2,'Expected one exact source boundary: '+before);return text.replace(before,after);};
function moduleURL(path,text,replacements={}){
 const base=new URL(path,import.meta.url);
 text=text.replace(/(from\s*['"])(\.[^'"]+)(['"])/g,(_,a,s,b)=>a+(replacements[s]||new URL(s,base).href)+b);
 return 'data:text/javascript;base64,'+Buffer.from(text).toString('base64');
}
async function transformedCraft(layoutText,architectureText){
 const layoutURL=moduleURL('./dist/fabric-equipment-layout.js',layoutText);
 const architectureURL=moduleURL('./dist/electrical-architecture.js',architectureText,{'./fabric-equipment-layout.js':layoutURL});
 const sceneURL=moduleURL('./dist/electrical-harness-scene.js',source('./dist/electrical-harness-scene.js'),{'./electrical-architecture.js':architectureURL});
 const craftURL=moduleURL('./dist/craft.js',source('./dist/craft.js'),{'./electrical-harness-scene.js':sceneURL});
 return {makeCraft:(await import(craftURL)).makeCraft,buildElectricalArchitecture:(await import(architectureURL)).buildElectricalArchitecture};
}
const input=buildReferenceDesign(configurationId),productionGraph=buildElectricalArchitecture(sizeDesign(input));
const productionEnabled=!!productionGraph.boxById[boxId].routingAccommodation;
let baselineFactory=makeCraft,candidateFactory=makeCraft,baselineArchitecture=buildElectricalArchitecture,candidateArchitecture=buildElectricalArchitecture;
if(productionEnabled){
 const baseline=await transformedCraft(layoutSource,replaceOne(architectureSource,newCall,oldCall));
 baselineFactory=baseline.makeCraft;baselineArchitecture=baseline.buildElectricalArchitecture;
}else{
 const candidateLayout=replaceOne(replaceOne(layoutSource,oldGate,newGate),oldFilter,newFilter);
 const candidate=await transformedCraft(candidateLayout,replaceOne(architectureSource,oldCall,newCall));
 candidateFactory=candidate.makeCraft;candidateArchitecture=candidate.buildElectricalArchitecture;
}
const painter=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});
globalThis.document={createElement:()=>({getContext:()=>painter})};
const descendant=(node,parent)=>{for(let p=node;p;p=p.parent)if(p===parent)return true;return false;};
function owner(node,key){for(let p=node;p;p=p.parent)if(p.userData?.[key]!=null)return p.userData[key];return null;}
function pathOf(node,root){const path=[];for(let p=node;p&&p!==root;p=p.parent){const index=p.parent?.children.indexOf(p)??0;path.push(index+':'+(p.name||p.type));}return 'body/'+path.reverse().join('/');}
function geometryDigest(mesh){const hash=createHash('sha256'),p=mesh.geometry.attributes.position;hash.update(Buffer.from(p.array.buffer,p.array.byteOffset,p.array.byteLength));if(mesh.geometry.index){const a=mesh.geometry.index.array;hash.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}return hash.digest('hex');}
function meshRecord(mesh,root){return {path:pathOf(mesh,root),uuid:mesh.uuid,name:mesh.name,owner:owner(mesh,'electricalBoxId'),portId:owner(mesh,'electricalPortId'),part:owner(mesh,'part'),materialRole:mesh.userData.materialRole||null,geometryType:mesh.geometry.type,geometryDigest:geometryDigest(mesh),bodyMatrix:[...root.matrixWorld.clone().invert().multiply(mesh.matrixWorld).elements]};}
function inventory(graph){return {boxes:graph.boxes.map(b=>({id:b.id,itemId:b.itemId,positionM:[...b.positionM],dimensionsM:[...b.dimensionsM],connectorPanels:b.connectorPanels})),ports:graph.ports.map(p=>({id:p.id,boxId:p.boxId,face:p.face,positionM:p.positionM,normal:p.normal,connectorTypeId:p.connectorTypeId,quantity:p.quantity})),harnesses:graph.harnesses.map(h=>({id:h.id,fromPortId:h.fromPortId,toPortId:h.toPortId,quantity:h.quantity,connectorPairsPerAssembly:h.connectorPairsPerAssembly,connectorTypeId:h.connectorTypeId,cableDiameterM:h.cableDiameterM,bendRadiusM:h.bendRadiusM})),counts:{boxes:graph.boxes.length,ports:graph.ports.length,harnesses:graph.harnesses.length,physicalCircuits:graph.harnesses.reduce((n,h)=>n+h.quantity*h.connectorPairsPerAssembly,0)}};}
function mass(h,graph){return {ledger:structuredClone(h.massLedger),components:componentMassProperties(h).rows.map(r=>({wbs:r.wbs,id:r.id,massKg:r.massKg,predictedKg:r.predictedKg,stationsM:r.stationsM,stationShares:r.stationShares,centroidM:r.centroidM})),harnessAllocations:Object.entries(graph.massAccounting).map(([id,a])=>({id,allocatedKg:a.allocatedKg,basis:a.basis}))};}
function capture(factoryBuilder,label){
 const h=sizeDesign(input),stop=new Error('H05 planning boundary'),time=Date.now();let context;
 electricalRoutingDiagnostics.onPlanningContext=value=>{context=value;throw stop;};
 try{factoryBuilder(h,{planFluidRoutes:false});}catch(error){if(error!==stop)throw error;}finally{electricalRoutingDiagnostics.onPlanningContext=null;}
 assert(context,'The actual production electrical scene must expose its planning boundary');
 const {factory,architecture,lines,allObstacles,terminalVolumes,world,normal,actualBoxes}=context,root=factory.root;
 root.updateMatrixWorld(true);
 const ordinaryMeshes=physicalFlightMeshes(root),fluidMeshes=[...new Set(factory.fluidConnections.map(c=>c.tube.mesh))];
 // The production solid registry excludes dynamic tubes. Preserve every
 // current fluid tube as actual material for this mechanical pocket check.
 const physicalMeshes=[...new Set([...ordinaryMeshes,...fluidMeshes])],ordinaryIds=new Set(ordinaryMeshes.map(m=>m.uuid));
 const fluidObstacles=fluidMeshes.filter(m=>!ordinaryIds.has(m.uuid)).map(m=>obstacleFromMesh(m,{frame:root}));
 const ownLines=lines.filter(line=>line.r.spec.toBoxId===boxId||line.r.spec.fromBoxId===boxId),ownedLineIds=new Set(ownLines.map(line=>line.id));
 // Own terminal space necessarily contains its own plug. All foreign
 // terminal reservations remain obstacles for the enclosure and strokes;
 // the inspector also checks each own lead against the other own terminal.
 const foreignTerminalVolumes=terminalVolumes.filter(o=>!ownedLineIds.has(o.lineId));
 const obstacles=[...allObstacles,...fluidObstacles,...foreignTerminalVolumes];
 const spec=architecture.boxById[boxId],host=actualBoxes.get(boxId).root,ownedMeshes=physicalMeshes.filter(m=>descendant(m,host));
 const scopedArchitecture={...architecture,boxes:[{...spec,routingAccommodation:spec.routingAccommodation||{kind:'original-controller-regression',positionM:[...spec.positionM],basis:'Original production placement, retained verbatim as the H05 failure regression.'}}]};
 const inspection=inspectInstalledEquipmentHardware({root,architecture:scopedArchitecture,actualBoxes,physicalMeshes,lines,obstacles,terminalVolumes,world,normal},{hardwareClearanceM:0,cableClearanceM:.002,maxIssues:250});
 const interfaces=ownLines.map(line=>{
  const end=line.r.spec.toBoxId===boxId?'to':'from',port=line.r[end],a=world(line[end]),n=normal(line[end]),sweepId=line.id+':'+line.r.spec[end+'PortId']+':backshell-service-sweep',sweep=terminalVolumes.find(o=>o.id===sweepId);
  assert(sweep,'Missing complete withdrawal sweep: '+sweepId);assert.equal(port.matingTravel,.045);
  return {lineId:line.id,harnessId:line.r.spec.id,quantity:line.r.spec.quantity,connectorPairsPerAssembly:line.r.spec.connectorPairsPerAssembly,portId:line.r.spec[end+'PortId'],connectorId:'C-'+line.r.spec[end+'PortId'],matingTravelM:port.matingTravel,sweep,cableExitM:a,normal:n,cableRadiusM:line.radiusM,bendRadiusM:line.bendRadiusM,tangentLengthM:2.4*line.bendRadiusM+.015,tangentEndM:a.map((v,k)=>v+n[k]*(2.4*line.bendRadiusM+.015)),cableClearanceM:.002};
 });
 const obstacleRecords=obstacles.map(o=>({id:o.id,type:o.type,sourceMesh:o.sourceMesh||null,lineId:o.lineId||null,bounds:o.bounds||{min:o.min,max:o.max},operationalEnvelope:!!o.operationalEnvelope}));
 const result={label,elapsedMs:Date.now()-time,placement:{id:boxId,itemId:spec.itemId,wbs:spec.wbs,positionM:[...spec.positionM],dimensionsM:[...spec.dimensionsM],routingAccommodation:spec.routingAccommodation?{...spec.routingAccommodation,installedHardware:undefined}:null},inventory:inventory(architecture),mass:mass(h,architecture),ownedMeshes:ownedMeshes.map(m=>meshRecord(m,root)),physicalMeshes:physicalMeshes.map(m=>meshRecord(m,root)),interfaces,inspection,reservations:{obstacles:obstacleRecords,terminalVolumes},sceneBoundary:{physicalFlightMeshes:ordinaryMeshes.length,currentFluidTubeMeshes:fluidMeshes.length,totalRetainedPhysicalMeshes:physicalMeshes.length,physicalElectricalCircuits:lines.length,electricalRoutesPlanned:0,fluidRoutesPlanned:0,currentFluidConnections:factory.fluidConnections.length,currentFluidRoutes:context.planned.map(r=>({id:r.id,sectionIds:r.sectionIds,radiusM:r.radiusM,points:r.points})),allProductionObstacles:allObstacles.length,foreignTerminalReservations:foreignTerminalVolumes.length,allTerminalReservations:terminalVolumes.length,omittedInstalledElectricalRoutes:lines.map(line=>line.id),boundary:'Actual complete installed hardware and current fluid tubes, with all current operating, solar, card and terminal reservations. Captured before electrical route planning or fluid replanning. This check does not certify final routed electrical/fluid circuits or continuous vehicle motion.'}};
 console.log(JSON.stringify({phase:label,elapsedMs:result.elapsedMs,meshCount:ownedMeshes.length,allPhysicalMeshes:physicalMeshes.length,issues:inspection.issueCount,positionM:spec.positionM,issueCodes:[...new Set(inspection.issues.map(i=>i.code))]}));
 return result;
}

const report={schema:'orbital-data-center/H05-pump-controller/1',configurationId,sourceCommit:process.env.H05_SOURCE_COMMIT||null,sourceDigests:{layout:digest(layoutSource),architecture:digest(architectureSource),inspector:digest(source('./dist/fixed-collector-accommodation.js'))},runtimeCapSeconds:180,productionEnabled,candidateConstruction:productionEnabled?'Final production scene':'In-memory exact June-only activation of the existing rear-facing pocket; production remains disabled',baseline:null,candidate:null,regression:null,status:'running'};
const save=()=>{if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');};
try{
 report.baseline=capture(baselineFactory,'original-production-position');save();
 report.candidate=capture(candidateFactory,'documented-rear-facing-pocket');save();
 const a=report.baseline,b=report.candidate;
 assert.deepEqual(a.inventory.counts,{boxes:46,ports:164,harnesses:82,physicalCircuits:104});
 assert.deepEqual(b.inventory.counts,a.inventory.counts);
 assert.equal(a.ownedMeshes.length,13);assert.equal(b.ownedMeshes.length,13);
 const identities=rows=>rows.map(m=>({name:m.name,owner:m.owner,portId:m.portId,geometryDigest:m.geometryDigest}));
 assert.deepEqual(identities(b.ownedMeshes),identities(a.ownedMeshes),'All 13 actual materials and their geometry remain present');
 assert.deepEqual(b.inventory.boxes.filter(x=>x.id!==boxId),a.inventory.boxes.filter(x=>x.id!==boxId),'Every other equipment box remains unchanged');
 assert.deepEqual(b.inventory.ports.filter(x=>x.boxId!==boxId),a.inventory.ports.filter(x=>x.boxId!==boxId),'No unrelated port is changed');
 assert.deepEqual(b.inventory.harnesses,a.inventory.harnesses,'All physical circuit quantities, connector selections and cable sections remain unchanged');
 assert.deepEqual(b.mass,a.mass,'All existing subsystem allocations and mass stations remain unchanged');
 assert.deepEqual(b.placement.dimensionsM,[.24,.18,.20]);
 assert.deepEqual(b.placement.positionM.slice(1),a.placement.positionM.slice(1),'Only the enclosure X datum moves');
 const h=sizeDesign(input),dimensions=[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM],wallM=Math.max(.018,Math.min(...dimensions)*.024),targetX=Math.sign(a.placement.positionM[0])*(dimensions[0]/2-wallM-.0002-.24/2-.012);
 assert(Math.abs(b.placement.positionM[0]-targetX)<1e-12,'The documented wall-relative X datum is used');
 assert.deepEqual(b.interfaces.map(x=>x.lineId).sort(),['C-THERMAL/0','P-THERMAL/0']);
 assert(b.interfaces.every(x=>x.quantity===1&&x.connectorPairsPerAssembly===1&&x.matingTravelM===.045));
 const selectorGuards=[];
 for(const [id,options]of [['orbital-1-202609',{}],[configurationId,{revision:'odc-study-2026-11-r1'}]]){
  const guardInput=buildReferenceDesign(id,options),before=inventory(baselineArchitecture(sizeDesign(guardInput))),after=inventory(candidateArchitecture(sizeDesign(guardInput)));
  assert.deepEqual(after,before,'The June-only activation must preserve this unrelated reference recipe: '+id+'/'+guardInput.referenceCenterRevision);
  selectorGuards.push({id,revision:guardInput.referenceCenterRevision,architectureFamily:guardInput.architectureFamily,unchanged:true});
 }
 assert(!a.inspection.ok&&a.inspection.issues.some(i=>i.code==='equipment-hardware-interference'),'The original production placement must expose actual owned material interference');
 const obstructionIds=[...new Set(b.inspection.issues.map(i=>i.obstacleId||i.sweepId).filter(Boolean))];
 report.regression={ok:true,originalPlacementDefectDetected:true,preservedMeshCount:13,preservedPhysicalCircuits:104,unchangedOtherEquipment:true,unchangedMassAllocationsAndStations:true,selectorGuards,expectedX:targetX,unchangedYZ:a.placement.positionM.slice(1),candidateMechanicalAcceptance:b.inspection.ok};
 report.status=b.inspection.ok?(productionEnabled?'mechanical-pocket-accepted':'candidate-mechanical-pass-production-disabled'):'blocked';
 report.blocker=b.inspection.ok?null:{name:'June pump-controller route and service-envelope accommodation',ownedAssembly:boxId,retainedObstructionIds:obstructionIds,reason:'The proposed pocket fails against retained material or reservations. Resolve the named route/service envelope before enabling this placement; no participant or reservation has been pruned.'};
 report.elapsedMs=Date.now()-started;save();
 console.log(JSON.stringify({status:report.status,regression:report.regression,candidateIssueCount:b.inspection.issueCount,blocker:report.blocker,elapsedMs:report.elapsedMs,output}));
 if(!b.inspection.ok||!productionEnabled)process.exitCode=1;
}catch(error){report.status='error';report.error={name:error.name,message:error.message,stack:error.stack};report.elapsedMs=Date.now()-started;save();console.error(error.stack);process.exitCode=1;}
