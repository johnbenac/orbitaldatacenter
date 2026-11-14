// Actual-buffer fluid inventory and pose regression. Continuous motion is
// certified by the shared flight-routing checker, using the same snapshots;
// this file never labels a finite set of snapshots as continuous proof.
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {sizeDesign} from './dist/design.js';
import {routingCraftConfigurations} from './dist/routing-configurations.js';
import {architectureFamily} from './dist/architecture-families.js';
import {deploymentLayout,deploymentStages} from './dist/deployment.js';
import {makeCraft} from './dist/craft.js';
import {fluidRoutingInventory,fluidRouteRecord,planStaticFluidConnections,constantLengthHingeRoute} from './dist/flight-fluid-routing.js';
import {auditRoutes} from './dist/routing-audit.js';
import {fluidInterfaceAllocationReport} from './dist/fluid-interface-allocation.js';
import {installedFluidLengthAccounting} from './dist/fluid-route-length-accounting.js';
import {fluidFlexLengthEvidence} from './dist/fluid-flex-length.js';
import {connectionTube,connectionAnchor} from './dist/connection-geometry.js';
import {canvas} from './render-test-canvas.mjs';

export function flightFluidCases(){return routingCraftConfigurations().map(([id,input])=>({id,input}));}
export function checkFluidInterfaceIntegrityRegressions(){
 const root=new T.Group(),fixed=new T.Group(),moving=new T.Group();root.add(fixed,moving);const ports=[new T.Object3D(),new T.Object3D()];fixed.add(ports[0]);moving.add(ports[1]);
 const connections=ports.map((port,i)=>{const external=new T.Object3D(),mesh=new T.Mesh(new T.CylinderGeometry(.01,.01,.10));root.add(external,mesh);return {id:'fluid-interface-regression-'+i,a:external,b:port,tube:{mesh}};});
 const datum={fixedId:fixed.uuid,movingId:moving.uuid,axis:[1,0,0],positionToleranceM:2e-5,axisToleranceRad:1e-5};root.userData.fluidComponentChannels=[{componentId:fixed.uuid,name:'independent rotary interface regression',interfaceType:'rotary-coolant',hingeIndex:1,portIds:ports.map(p=>p.uuid),jointDatums:datum}];
 for(const angle of[0,.37,Math.PI/2,Math.PI]){moving.rotation.x=angle;assert.equal(fluidRoutingInventory(root,connections).ok,true,'A true coaxial transfer remains connected throughout its rotation');}
 moving.position.y=.001;assert(fluidRoutingInventory(root,connections).issues.some(i=>i.code==='fluid-rotary-datum-discontinuity'),'A displaced rotor must fail');moving.position.y=0;moving.rotation.set(0,.01,0);assert(fluidRoutingInventory(root,connections).issues.some(i=>i.code==='fluid-rotary-datum-discontinuity'),'A tilted rotary axis must fail');moving.rotation.set(0,0,0);
 datum.positionToleranceM=1;assert(fluidRoutingInventory(root,connections).issues.some(i=>i.code==='fluid-rotary-datum-declaration'),'Inflating the closure tolerance must fail');datum.positionToleranceM=2e-5;moving.position.y=NaN;assert(fluidRoutingInventory(root,connections).issues.some(i=>i.code==='fluid-rotary-datum-discontinuity'),'Non-finite actual datum geometry must fail');moving.position.y=0;
 assert(fluidRoutingInventory(root,connections.slice(0,1)).issues.some(i=>i.code==='unconnected-fluid-component-port'),'A missing exterior pipe must leave an unconnected real component port');delete root.userData.fluidComponentChannels[0].jointDatums;assert(fluidRoutingInventory(root,connections).issues.some(i=>i.code==='fluid-rotary-datum-declaration'),'Omitting the physical hinge datums must fail');root.userData.fluidComponentChannels[0].jointDatums=datum;
 const pipeRoot=new T.Group(),a=connectionAnchor(pipeRoot,[0,0,0],[1,0,0]),b=connectionAnchor(pipeRoot,[2,0,0],[-1,0,0]),tube=connectionTube(pipeRoot,{radius:.01,bendRadiusM:.1}),pipe={id:'length-ledger-pipe',name:'length-ledger-pipe',parent:pipeRoot,a,b,tube,part:'radiator',radiusM:.01,bendRadiusM:.1,staticPlan:[[0,0,0],[2,0,0]]},model={kind:'pumped',layout:{branches:1,headerLengthM:2,branchLineLengthM:2}};tube.update(pipe.staticPlan);const initial=installedFluidLengthAccounting([pipe],model);pipe.staticPlan=[[0,0,0],[.5,0,0],[.5,0,1],[1.5,0,1],[1.5,0,0],[2,0,0]];tube.update(pipe.staticPlan);const detour=installedFluidLengthAccounting([pipe],model);
 assert(detour.actualExternalCoolantLengthM>initial.actualExternalCoolantLengthM+1.7,'A physical reroute must change the actual-buffer length ledger');assert(Math.abs(detour.rows[0].developedLengthM-(4-8*.1+2*Math.PI*.1))<1e-9,'Developed length must include the exact four circular fillets');assert.deepEqual(detour.modeledLengthsM,initial.modeledLengthsM,'An exterior length sum must not silently replace a series/parallel model');assert.equal(detour.reconciliationClosed,false,'Allocated model lengths cannot claim as-routed closure');assert.equal(installedFluidLengthAccounting([pipe],null).status,'missing-thermal-model');
 const repairRoot=new T.Group(),repairA=connectionAnchor(repairRoot,[-1,0,0],[1,0,0]),repairB=connectionAnchor(repairRoot,[1,-1,0],[-1,0,0]),repairTube=connectionTube(repairRoot,{radius:.01,bendRadiusM:.1}),repair={id:'self-crossing-pipe-regression',name:'Self-crossing pipe regression',parent:repairRoot,a:repairA,b:repairB,tube:repairTube,part:'propulsion',radiusM:.01,bendRadiusM:.1,staticPlan:[[-1,0,0],[1,0,0],[1,1,0],[0,1,0],[0,-1,0],[1,-1,0]]};repairTube.update(repair.staticPlan);
 assert(auditRoutes([fluidRouteRecord(repair)],[],{maxIssues:1}).issues.some(i=>i.code==='self-collision'),'The repair fixture must begin with a genuine actual-buffer self-crossing');const repaired=planStaticFluidConnections(repairRoot,[repair],{maxAttempts:20});assert.equal(repaired[0].ok,true,'The planner must repair a self-crossing installed static pipe');assert.equal(auditRoutes([fluidRouteRecord(repair)],[],{maxIssues:1}).ok,true,'The retained-manual-path shortcut must not accept a self-crossing pipe');
 const flexRoot=new T.Group(),flexA=connectionAnchor(flexRoot,[0,0,0],[1,0,0]),flexB=connectionAnchor(flexRoot,[0,.3,0],[1,0,0]),flexTube=connectionTube(flexRoot,{radius:.014,bendRadiusM:.084}),flex={id:'physical-hose-cut-regression',name:'Physical hose cut regression',parent:flexRoot,a:flexA,b:flexB,tube:flexTube,part:'radiator',radiusM:.014,bendRadiusM:.084,restLengthM:.98,motionModel:{kind:'constant-length-u',physicalLengthBasis:'perpendicular-two-quarter-fillets',arcSteps:8,minimumChordM:.185,maximumChordM:.84}};
 const updateFlex=()=>flexTube.update(constantLengthHingeRoute(flexA.position,flexB.position,{outward:[1,0,0],restLengthM:flex.restLengthM,bendRadiusM:flex.bendRadiusM}));let physicalCut=null,flexLengthPoses=0;
 for(const chord of[.185,.3,.5,.84])for(const angle of[0,.37,Math.PI/2,Math.PI]){flexB.position.set(0,chord*Math.cos(angle),chord*Math.sin(angle));flexRoot.rotation.set(.12,-.31,.77);flexRoot.position.set(.25,-.3,.18);updateFlex();const evidence=fluidFlexLengthEvidence(flex);assert.equal(evidence.ok,true,JSON.stringify(evidence.issues));physicalCut??=evidence.physicalCutLengthM;assert(Math.abs(evidence.developedLengthM-physicalCut)<2e-7);assert(evidence.physicalCutLengthM>flex.restLengthM+.0004,'A physical circular cut must include the positive rendering chord deficit');assert.equal(auditRoutes([fluidRouteRecord(flex)],[],{maxIssues:1}).ok,true,'The proof must correspond to the actual rendered rings');flexLengthPoses++;}
 const ledger=installedFluidLengthAccounting([flex],model).rows[0];assert.equal(ledger.physicalCutLengthM,physicalCut);assert.equal(ledger.renderedTargetLengthM,.98);assert(Math.abs(ledger.developedLengthM-physicalCut)<2e-7);
 delete flex.motionModel.physicalLengthBasis;assert.equal(fluidFlexLengthEvidence(flex).ok,false,'An undeclared physical length basis must fail');flex.motionModel.physicalLengthBasis='perpendicular-two-quarter-fillets';
 flexB.position.x=.01;updateFlex();assert(fluidFlexLengthEvidence(flex).issues.some(i=>i.code==='fluid-flex-length-geometry'),'A skew U cannot use the perpendicular constant-deficit proof');flexB.position.x=0;updateFlex();
 flex.motionModel.minimumChordM=.1;assert(fluidFlexLengthEvidence(flex).issues.some(i=>i.code==='fluid-flex-length-tangent-budget'),'The full chord domain must retain the actual bend radius');flex.motionModel.minimumChordM=.185;
 flex.restLengthM+=.001;assert(fluidFlexLengthEvidence(flex).issues.some(i=>i.code==='fluid-flex-physical-length'),'Changing the declared physical cut without the actual pipe must fail');flex.restLengthM-=.001;
 flexTube.route.developedLengthM+=.0001;assert.equal(fluidRoutingInventory(flexRoot,[flex]).ok,false,'A 100 micrometre physical-length corruption must reach the canonical inventory gate');flexTube.route.developedLengthM-=.0001;
 return {ok:true,validCoaxialPoses:4,corruptionCases:6,lengthLedgerChecks:8,selfCrossingRepairChecks:1,flexLengthPoses,flexLengthCorruptionCases:5};
}
export function checkFlightFluidInventory(factory,h){
 const c=factory,connections=c.fluidConnections||[],family=architectureFamily(h),layout=deploymentLayout(h),base=fluidRoutingInventory(c.root,connections),issues=[...base.issues],pumped=family.thermalTopology!=='passive-local',liquids=h.propulsion.tanks.filter(t=>t.id!=='helium'),expectedPropellant=(h.propulsion.tanks.some(t=>t.id==='helium')?1:0)+liquids.length*(2+h.propulsion.engines.length),propellant=connections.filter(r=>r.part==='propulsion').length;
 const requireCount=(name,actual,expected)=>{if(actual!==expected)issues.push({code:'fluid-inventory-count',name,actual,expected});};
 requireCount('pressurant, pressure-regulated tank feeds and distinct injector feeds',propellant,expectedPropellant);
 if(pumped){
  requireCount('installed cold plates',c.coolantCollection?.coldPlateCount||0,h.rackLayout.slots.length);
  requireCount('cold-plate supply and return fittings',c.coolantCollection?.coldPlatePortCount||0,h.rackLayout.slots.length*2);
  requireCount('external cold-plate fitting leads',connections.filter(r=>/cold-plate fitting lead/.test(r.name)).length,h.rackLayout.slots.length*2);
  requireCount('allocated coolant pump stations',c.thermalPumps?.length||0,family.thermalTopology==='redundant-pumped'?2:1);
  for(const slot of h.rackLayout.slots)for(const side of [-1,1]){const port=c.coolantCollection?.platePorts?.get(slot.index)?.[side],uses=connections.filter(r=>r.a===port||r.b===port).length;if(!port||uses!==1)issues.push({code:'cold-plate-port-continuity',tray:slot.index+1,side,uses});}
  if(c.root.userData.fluidComponentChannels&&!c.radiatorMeshes){
   const leaves=layout.descriptors.filter(d=>d.type==='rad').length,banks=new Set(layout.descriptors.filter(d=>d.type==='rad').map(d=>d.end)).size;
   requireCount('protected rigid radiator headers',connections.filter(r=>/roll union outlet|leaf .*straight header/.test(r.name)).length,leaves*2);
   requireCount('protected pitch union inlets',connections.filter(r=>/pitch union inlet/.test(r.name)).length,banks*2);
   requireCount('protected tip return manifolds',connections.filter(r=>/closed return manifold/.test(r.name)).length,banks);
   requireCount('protected interleaf fixed-length hoses',connections.filter(r=>/Radiator hinge flexible/.test(r.name)).length,(leaves-banks)*2);
   requireCount('protected pitch rotary outlet necks',connections.filter(r=>/pitch rotary outlet neck/.test(r.name)).length,banks*2);
   requireCount('protected roll delivery necks',connections.filter(r=>/roll delivery neck/.test(r.name)).length,banks*2);
   requireCount('protected independent pitch and roll rotary channels',c.root.userData.fluidComponentChannels.filter(c=>c.interfaceType==='rotary-coolant').length,banks*4);
   const accounting=fluidInterfaceAllocationReport(c.root);if(!accounting.accountingMatches)issues.push({code:'fluid-interface-model-mismatch',actualChannels:accounting.channelCount,actualAxes:accounting.axisCount,model:accounting.modelAllocation,message:'Protected pitch/roll channel geometry must match the installed thermal/mass allocation.'});
   const connected=new Set(connections.flatMap(r=>[r.a.uuid,r.b.uuid]));for(const channel of c.root.userData.fluidComponentChannels)for(const portId of channel.portIds)if(!connected.has(portId))issues.push({code:'unconnected-fluid-component-port',componentId:channel.componentId,portId});
  }
  if(c.radiatorMeshes){
   const leaves=layout.descriptors.filter(d=>d.type==='rad').length,banks=new Set(layout.descriptors.filter(d=>d.type==='rad').map(d=>d.end)).size,tracked=family.radiatorTracking==='root-cant';
   requireCount('rigid radiator edge headers',connections.filter(r=>/rigid surface header/.test(r.name)).length,leaves*2);
   requireCount('radiator tip return manifolds',connections.filter(r=>/radiator return manifold/.test(r.name)).length,banks);
   requireCount('root rotary outlet feeds',connections.filter(r=>/articulated union outlet/.test(r.name)).length,banks*2);
   requireCount('interleaf constant-length hose sections',connections.filter(r=>r.restLengthM&&/hinge hose/.test(r.name)).length,tracked?0:(leaves-banks)*2);
   requireCount('interleaf fixed and rotating rotary feeder sections',connections.filter(r=>/rotary feeder/.test(r.name)).length,tracked?(leaves-banks)*4:0);
   const rotary=c.root.userData.fluidComponentChannels.filter(c=>c.interfaceType==='rotary-coolant');requireCount('individually declared rotary coolant channels',rotary.length,banks*2+(tracked?(leaves-banks)*2:0));
   if(tracked)for(const end of new Set(layout.descriptors.filter(d=>d.type==='rad').map(d=>d.end)))for(let hingeIndex=1;hingeIndex<layout.panelCount;hingeIndex++)requireCount('two physical coolant channels at bank '+end+' hinge '+hingeIndex,rotary.filter(channel=>channel.bankEnd===end&&channel.hingeIndex===hingeIndex&&channel.jointDatums).length,2);
   for(const channel of rotary)if(!(channel.minimumFlowDiameterM>0&&channel.allocatedMassKg>0&&channel.allocatedMinorLossCoefficient>0&&channel.qualificationStatus==='supplier-evidence-open'&&channel.requiredEvidence?.length))issues.push({code:'fluid-interface-allocation',componentId:channel.componentId,message:'Every allocated rotary channel requires a finite bore, nonzero mass/loss budgets and explicit open qualification evidence.'});
   const accounting=fluidInterfaceAllocationReport(c.root);if(!accounting.accountingMatches)issues.push({code:'fluid-interface-model-mismatch',actualChannels:accounting.channelCount,actualAxes:accounting.axisCount,model:accounting.modelAllocation,message:'Actual rotary channel geometry must match the installed thermal/mass allocation.'});
   if(tracked){const actual=connections.filter(r=>/rotary feeder/.test(r.name)).reduce((s,r)=>s+r.tube.route.lengthM,0),allocated=accounting.modelAllocation?.externalFeederLengthM,arcChordAllowance=connections.filter(r=>/rotary feeder/.test(r.name)).length*2*.108*(Math.PI/2-16*Math.sin(Math.PI/32));if(!Number.isFinite(allocated)||Math.abs(allocated-actual-arcChordAllowance)>1e-4)issues.push({code:'fluid-feeder-developed-length-ledger',actualChordLengthM:actual,allocatedDevelopedLengthM:allocated,expectedChordCorrectionM:arcChordAllowance});}
  }
 }else{
  requireCount('passive architecture pump stations',c.thermalPumps?.length||0,0);
  requireCount('sealed radial heat pipes',connections.filter(r=>r.fluidKind==='sealed-heat-pipe').length,16);
 }
 for(const c of connections){if(!Number.isFinite(c.radiusM)||c.radiusM<=0)issues.push({code:'fluid-radius-allocation',routeId:c.id});if(c.restLengthM&&(!(c.bendRadiusM>0)||!Number.isFinite(c.restLengthM)))issues.push({code:'flex-length-or-bend-allocation',routeId:c.id});}
 return {ok:issues.length===0,issues,installedLengthAccounting:installedFluidLengthAccounting(connections,h.energySystem.thermal),counts:{sections:connections.length,propellant,coldPlates:c.coolantCollection?.coldPlateCount||0,coldPlatePorts:c.coolantCollection?.coldPlatePortCount||0,flexSections:connections.filter(c=>c.restLengthM).length,sealedHeatPipes:connections.filter(c=>c.fluidKind==='sealed-heat-pipe').length},scope:'Declared installed articles and every actual rendered fluid section; supplier fluid and mechanism qualification remain separate.'};
}
export function auditFlightFluidAtPose(factory,{progress=1,attitude=null,maxIssues=60}={}){
 factory.positionPanels(progress,attitude);factory.electrical?.update?.();factory.root.updateWorldMatrix(true,true);return factory.auditFluidRouting({maxIssues});
}
export function fluidRegressionPoses(h){
 const times=deploymentStages(h).map(s=>s.at),poses=new Set([0,1]);for(let i=0;i<times.length;i++){poses.add(times[i]);if(i)poses.add((times[i-1]+times[i])/2);}return [...poses].sort((a,b)=>a-b);
}
async function main(){
 const args=process.argv.slice(2),get=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];},only=get('--reference'),output=get('--output'),fluidOnly=args.includes('--fluid-only');
 if(args.includes('--help')){console.log('node flight-fluid-routing-checks.mjs [--reference ID] [--fluid-only] [--output PATH]\nDefault includes installed electrical hardware. --fluid-only is a diagnostic scope. Shared flight-routing-checks provides continuous certification.');return;}
 const interfaceIntegrity=checkFluidInterfaceIntegrityRegressions();if(args.includes('--interface-only')){const report={...interfaceIntegrity,scope:'Focused rotary interface and installed-length ledger corruption regressions only',completeFluidConfigurationMatrix:false,continuousMotionCertified:false};if(output)writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report));return;}
 globalThis.document={createElement:()=>canvas()};const rows=[];let ok=true;const cases=flightFluidCases().filter(c=>!only||c.id===only);if(!cases.length)throw Error('Unknown reference '+only);
 for(const entry of cases){
  const start=Date.now(),h=sizeDesign(entry.input),c=makeCraft(h,{installElectrical:!fluidOnly}),inventory=checkFlightFluidInventory(c,h),poses=[];let passed=inventory.ok;
  for(const progress of fluidRegressionPoses(h)){const audit=auditFlightFluidAtPose(c,{progress,maxIssues:20});poses.push({progress,ok:audit.ok,issueCount:audit.issueCount,minimumClearanceM:audit.minimumClearanceM,issues:audit.issues});passed&&=audit.ok;}
  const row={id:entry.id,ok:passed,elapsedMs:Date.now()-start,inventory,poses};rows.push(row);ok&&=passed;console.log(JSON.stringify({id:entry.id,ok:passed,elapsedMs:row.elapsedMs,counts:inventory.counts,inventoryIssues:inventory.issues,failedPoses:poses.filter(p=>!p.ok).map(p=>({progress:p.progress,issueCount:p.issueCount,first:p.issues[0]}))}));
 }
 const report={ok,interfaceIntegrity,scope:fluidOnly?'Diagnostic fluid-only scene':'Actual flight-fluid buffers against all installed physical hardware; electrical/fluid mutual line collision is covered by shared combined gate',selectionMode:only?'single-reference':'all-shipped-references',expectedReferences:flightFluidCases().map(c=>c.id),testedReferences:rows.map(r=>r.id),completeFluidConfigurationMatrix:!only&&!fluidOnly,continuousMotionCertified:false,continuousMotionGate:'flight-routing-checks.mjs',rows};if(output)writeFileSync(output,JSON.stringify(report,null,2));if(!ok)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
