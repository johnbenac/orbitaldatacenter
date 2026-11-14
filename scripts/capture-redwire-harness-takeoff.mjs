// Bounded Redwire PDR capture. Rebuilds the actual craft, exercises selected
// deployment and plug states, and refreshes only the matching reference seed.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const repo=fileURLToPath(new URL('..',import.meta.url));
const rawPath=resolve(process.argv[2]||'/tmp/redwire-mounted-native.json');
const reportPath=resolve(repo,'docs/harnessing-work/redwire-pdr-mass-result.json');
const sourceFiles=[
 'dist/redwire-harness-installation.js','dist/installed-electrical-routing.js',
 'dist/electrical-architecture.js','dist/fabric-equipment-layout.js','dist/craft-family.js',
 'dist/electrical-harness-scene.js','dist/redwire-payload-transfer.js','dist/architecture-families.js',
 'dist/deployment.js','dist/energy-system.js','dist/service-architecture.js',
 'dist/radiator-surface-area.js','dist/cable-installation-mass.js','dist/design.js'
];
const hashes=()=>Object.fromEntries(sourceFiles.map(path=>[path,createHash('sha256').update(readFileSync(resolve(repo,path))).digest('hex')]));
const sourceHashes=hashes(),sourceHash=createHash('sha256').update(JSON.stringify(sourceHashes)).digest('hex');
const routingRevision='redwire-mounted-installation-'+sourceHash.slice(0,12);
const massModule=resolve(repo,'dist/installed-harness-mass.js');
writeFileSync(massModule,readFileSync(massModule,'utf8').replace(/export const installedHarnessRoutingRevision='[^']+';/,"export const installedHarnessRoutingRevision='"+routingRevision+"';"));
const mod=path=>import(pathToFileURL(resolve(repo,path)));
const [{canvas},{sizeDesign},{buildReferenceDesign},{makeCraft},registry,T,{electricalRoutingDiagnostics},{encodeScenario,decodeScenario}]=await Promise.all([
 'render-test-canvas.mjs','dist/design.js','dist/reference-configurations.js','dist/craft.js',
 'dist/flight-routing-registry.js','dist/vendor/three.module.js','dist/installed-electrical-routing.js','dist/exports.js'
].map(mod));
globalThis.document={createElement:()=>canvas()};
const started=Date.now(),log=message=>console.log(((Date.now()-started)/1000).toFixed(1)+'s '+message);
const finiteJSON=(_key,value)=>typeof value==='number'&&!Number.isFinite(value)?String(value):value;
const vector=point=>Array.isArray(point)?point:[point.x,point.y,point.z];
const length=points=>points.slice(1).reduce((total,point,index)=>total+Math.hypot(...vector(point).map((value,axis)=>value-vector(points[index])[axis])),0);
const sum=values=>values.reduce((total,value)=>total+value,0);
const massSnapshot=h=>({basicDryKg:sum(h.massLedger.filter(row=>row.group==='Hardware').map(row=>row.kg)),dryGrowthKg:h.massLedger.find(row=>row.id==='margin').kg,dryKg:h.dryKg,wetKg:h.wetKg,launchKg:h.launchKg,launchAllowanceMarginKg:h.massMarginKg,launcherReferenceMarginKg:h.launchReferenceMarginKg,status:h.installedHarnessAccounting.status,revision:h.electricalMassRevision});
electricalRoutingDiagnostics.onPlanningContext=context=>log('Planning '+context.lines.length+' electrical routes against '+context.allObstacles.length+' solids');
electricalRoutingDiagnostics.onRoute=({id,passed,issues})=>{if(!passed)log('Route finding '+id+' '+JSON.stringify(issues));};
electricalRoutingDiagnostics.onServiceRoute=({id,passed,issues})=>{if(!passed)log('Service finding '+id+' '+JSON.stringify(issues));};
const h=sizeDesign(buildReferenceDesign('redwire-8kw')),beforeNative=massSnapshot(h);
log('Constructing actual reference craft from '+beforeNative.status);
const craft=makeCraft(h),constructionSeconds=(Date.now()-started)/1000,graph=craft.electrical.architecture;
log('Constructed');
const carried=craft.electrical.routing.lines.filter(line=>line.rigidFrame);
assert.equal(carried.length,8,'All eight mounted platform branches must be present');
const report={schema:'redwire-mounted-pdr-native/1',createdAt:new Date().toISOString(),scope:'Redwire preliminary-design installation only. Actual tube buffers and physical solids at six selected deployment poses and four simultaneous mounted-plug corner states. No continuous-motion, fatigue, qualification or full publication-gate claim.',routingRevision,sourceHash,sourceHashes,constructionSeconds,poses:[],serviceStates:[]};
const raw={...report,takeoff:h.input.installedHarnessTakeoff,hardware:graph.installationHardware,lines:craft.electrical.routing.lines.map(line=>({id:line.id,harnessId:line.r.spec.id,rigidFrame:!!line.rigidFrame,movingFrame:!!line.movingFrame,restLengthM:line.restLengthM,minimumStaticBendM:line.minimumStaticBendM,planningIssues:line.planningIssues||[],servicePlanningIssues:line.servicePlanningIssues||[],localPoints:line.rigidPoints})),poses:[],serviceStates:[]};
function save(){mkdirSync(dirname(rawPath),{recursive:true});writeFileSync(rawPath,JSON.stringify(raw,finiteJSON,2)+'\n');}
function inspect(label,progress,service=null){
 const snapshot=registry.flightRoutingSnapshot(craft),audit=registry.auditFlightRoutingSnapshot(snapshot,{maxIssues:100});
 const routes=new Map(snapshot.routes.map(route=>[route.id,route]));
 const corridor=carried.map(line=>{
  const route=routes.get(line.id);assert(route,'Missing actual tube '+line.id);
  const inverse=line.rigidFrame.matrixWorld.clone().invert().multiply(craft.root.matrixWorld);
  const points=route.points.map(point=>new T.Vector3(...vector(point)).applyMatrix4(inverse).toArray());
  const min=[0,1,2].map(axis=>Math.min(...points.map(point=>point[axis]))-route.radiusM);
  const max=[0,1,2].map(axis=>Math.max(...points.map(point=>point[axis]))+route.radiusM);
  const y=line.r.spec.kind==='power'?[.080,.130]:[.099,.112];
  const bounds={min:[-h.radiatorWidthM/2,y[0],-h.radiatorLengthM/2],max:[h.radiatorWidthM/2,y[1],h.radiatorLengthM/2]};
  const within=min.every((value,axis)=>value>=bounds.min[axis]-2e-6)&&max.every((value,axis)=>value<=bounds.max[axis]+2e-6);
  return {id:line.id,kind:line.r.spec.kind,radiusM:route.radiusM,localFiniteRadiusBoundsM:{min,max},intendedBoundsM:bounds,withinIntendedCorridor:within,developedLengthM:length(route.points),restLengthM:line.restLengthM,lengthDeltaM:length(route.points)-line.restLengthM};
 });
 const result={label,progress,...(service?{plugWithdrawalM:service}:{}),routes:snapshot.routes.length,electricalRoutes:snapshot.inventory.electrical.registeredRoutes,solids:snapshot.obstacles.length,ok:audit.ok,issueCount:audit.issueCount,issues:audit.issues,minimumClearanceM:audit.minimumClearanceM,inventory:audit.inventory,mountedCorridor: {ok:corridor.every(route=>route.withinIntendedCorridor),maximumAbsoluteLengthDeltaM:Math.max(...corridor.map(route=>Math.abs(route.lengthDeltaM))),routes:corridor}};
 const detail={...result,routes:snapshot.routes.map(route=>({id:route.id,scope:route.scope,radiusM:route.radiusM,points:route.points.map(vector),restLengthM:route.restLengthM,minimumBendRadiusM:route.minimumBendRadiusM,minBendRadiusM:route.minBendRadiusM})),obstacleLabels:snapshot.obstacleLabels};
 if(service){report.serviceStates.push(result);raw.serviceStates.push(detail);}else{report.poses.push(result);raw.poses.push(detail);}
 save();log(label+': '+audit.issueCount+' native findings; mounted corridor '+result.mountedCorridor.ok+'; length delta '+result.mountedCorridor.maximumAbsoluteLengthDeltaM.toExponential(2)+' m');
}
for(const progress of [0,.06,.21,.285,.36,1]){craft.positionPanels(progress);inspect('deployment '+progress,progress);}
craft.positionPanels(1);
const originalPlugs=carried.map(line=>({line,from:line.r.from.plug.position.z,to:line.r.to.plug.position.z}));
for(const from of [0,.045])for(const to of [0,.045]){
 for(const {line} of originalPlugs){line.r.from.plug.position.z=from;line.r.to.plug.position.z=to;}
 craft.electrical.refresh(false);inspect('mounted service '+from+'/'+to,1,{from,to});
}
for(const {line,from,to} of originalPlugs){line.r.from.plug.position.z=from;line.r.to.plug.position.z=to;}
craft.electrical.refresh(false);
const material=h.cableInstallationHardware;
const physicalPanels=[];craft.root.traverse(object=>{if(object.userData?.rootRelief)physicalPanels.push({name:object.name,relief:object.userData.rootRelief,materialPanelPieces:object.children.filter(child=>child.isMesh&&child.geometry?.parameters?.width).map(child=>({name:child.name,geometry:child.geometry.parameters,positionM:child.position.toArray()}))});});
report.mass={beforeNative,adopted:massSnapshot(h),nativeRefinementKg:h.launchKg-beforeNative.launchKg,harnessAndTerminationKg:graph.massAccounting['07.05'].allocatedKg,fabricCableAndTerminationKg:graph.massAccounting['01.04'].allocatedKg,totalExternalHarnessKg:sum(graph.harnessMassRecords.map(row=>row.totalMassKg)),cableKg:sum(graph.harnessMassRecords.map(row=>row.cableMassKg)),terminationKg:sum(graph.harnessMassRecords.map(row=>row.connectorMassKg)),installationHardwareKg:material.totalMassKg,installationMaterialKg:material.materialMassKg,declaredFunctionalInternalKg:material.allocatedInternalMassKg,workerOpticsKg:h.serviceArchitecture.fabric.workerOptics.massKg,parents:graph.massAccounting,assemblyCount:graph.harnessMassRecords.length,physicalCutCount:sum(graph.harnessMassRecords.map(row=>row.routeCuts.length)),totalPhysicalCutLengthM:graph.totalCableLengthM,perInstancePowerLossW:graph.installedPowerLossW,individualHarnesses:graph.harnessMassRecords,installationHardware:material.parts.map(part=>({id:part.id,wbs:part.wbs,label:part.label,frame:part.frame,massKg:part.massKg,materialMassKg:part.materialMassKg,declaredInternalKg:part.allocatedInternalMassKg,containedCuts:part.pieces.filter(piece=>piece.materialTakeoff).map(piece=>({id:piece.id,massKg:piece.massKg,materialTakeoff:piece.materialTakeoff}))}))};
report.functional={rotaryTransfer:graph.rotaryTransferAccounting,workerOptics:{moduleCount:h.serviceArchitecture.fabric.workerOptics.moduleCount,powerW:h.serviceArchitecture.fabric.workerOptics.powerW,massKg:h.serviceArchitecture.fabric.workerOptics.massKg},radiator:h.radiatorSurfaceAccounting,physicalRelievedPanels:physicalPanels};
raw.input=h.input;raw.mass=report.mass;raw.functional=report.functional;save();
const scenario=encodeScenario({design:h.input}),restored=sizeDesign(decodeScenario(scenario).design);
report.persistence={scenarioCharacters:scenario.length,supportedMaximumCharacters:200000,restoredAccountingStatus:restored.installedHarnessAccounting.status,restoredLaunchKg:restored.launchKg,massDifferenceKg:restored.launchKg-h.launchKg};
assert.equal(restored.installedHarnessAccounting.status,'installed-route-mass-adopted');assert.ok(Math.abs(restored.launchKg-h.launchKg)<1e-8);
assert.deepEqual(hashes(),sourceHashes,'Geometry/policy source changed during native capture');
const takeoff={...h.input.installedHarnessTakeoff,source:{kind:'native-installed-routing',capture:'scripts/capture-redwire-harness-takeoff.mjs',createdAt:report.createdAt,sourceHash,result:'docs/harnessing-work/redwire-pdr-mass-result.json'}};
raw.takeoff=takeoff;raw.mass=report.mass;raw.functional=report.functional;raw.persistence=report.persistence;
report.elapsedSeconds=(Date.now()-started)/1000;report.passed=[...report.poses,...report.serviceStates].every(state=>state.ok&&state.mountedCorridor.ok&&state.mountedCorridor.maximumAbsoluteLengthDeltaM<=3e-5);
save();
if(existsSync(reportPath)&&!existsSync(resolve(repo,'docs/harnessing-work/redwire-pdr-mass-result-before-mounted-installation.json')))writeFileSync(resolve(repo,'docs/harnessing-work/redwire-pdr-mass-result-before-mounted-installation.json'),readFileSync(reportPath));
writeFileSync(reportPath,JSON.stringify(report,finiteJSON,2)+'\n');
assert.ok(report.passed,'Native pose, corridor or plug-state findings require review before retaining the takeoff');
writeFileSync(resolve(repo,'dist/redwire-harness-takeoff.js'),'// Exact native route takeoff for the matching Redwire reference design.\n// Geometry, interfaces, normalized inputs and routing revision must all match.\n// Regenerate with scripts/capture-redwire-harness-takeoff.mjs.\nexport const redwireHarnessTakeoff='+JSON.stringify(takeoff,null,2)+';\n');
log('PASS '+JSON.stringify({revision:routingRevision,assemblyCount:report.mass.assemblyCount,physicalCutCount:report.mass.physicalCutCount,externalHarnessKg:report.mass.totalExternalHarnessKg,installationHardwareKg:report.mass.installationHardwareKg,launchKg:h.launchKg,scenarioCharacters:scenario.length,rawPath}));
