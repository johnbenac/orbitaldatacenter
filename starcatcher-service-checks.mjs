// Bounded checks of physical service interfaces; no native route search runs.
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {canvas} from './render-test-canvas.mjs';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {makeCraft} from './dist/craft.js';
import {electricalRoutingDiagnostics} from './dist/installed-electrical-routing.js';
import {componentMassProperties,terminalMassElements} from './dist/component-stations.js';
import {componentInertia} from './dist/attitude-inertia.js';
import {heatliftTerminalTransfer,heatliftPackageAllocation} from './dist/heatlift-service-installation.js';
import {obstacleFromMesh,routeClearance,segmentObstacleClearance,auditRoutes} from './dist/routing-audit.js';

import {starcatcherServiceRouteHint} from './dist/starcatcher-service-routing.js';
import {roundedConnectionRoute} from './dist/connection-routes.js';

const tolerance=2e-6,V=(p=[0,0,0])=>new T.Vector3(...p),
 near=(a,b,label)=>assert(Math.abs(a-b)<tolerance,label+': '+a+' != '+b),
 pointNear=(a,b,label)=>assert(V(a).distanceTo(V(b))<tolerance,label);
function owns(mesh,owner){for(let p=mesh;p;p=p.parent)if(p===owner)return true;return false;}
function physical(mesh){return mesh.isMesh&&!mesh.userData.routingLine&&!mesh.userData.routingNonPhysical&&
 !mesh.userData.engineeringGraphic&&!mesh.userData.sceneFlow&&!mesh.userData.groundEquipment&&
 mesh.material?.userData?.physicalMaterial!==false;}
function materialBounds(mesh){mesh.geometry.computeBoundingBox();return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);}
function gap(a,b){return Math.hypot(...['x','y','z'].map(k=>Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])));}

export function auditStarcatcherServiceInterfaces(){
 const h=sizeDesign(buildReferenceDesign('star-catcher-self-powered')),stop=Symbol('physical-interfaces');let context;
 const previous=electricalRoutingDiagnostics.onPhysicalInterfaces;
 electricalRoutingDiagnostics.onPhysicalInterfaces=value=>{context=value;throw stop;};
 try{makeCraft(h,{planFluidRoutes:false});}catch(error){if(error!==stop)throw error;}
 finally{electricalRoutingDiagnostics.onPhysicalInterfaces=previous;}
 assert(context,'Actual interfaces must be captured before any expensive planning');
 const {factory,architecture,layout,lines,world,normal,banks,actualBoxes}=context,root=factory.root,
  roof=h.bodyHeightM/2,transfer=heatliftTerminalTransfer(h),allocation=heatliftPackageAllocation(h),
  inner=allocation.roofInnerM,terminalLines=lines.filter(line=>/^(P-SVC|C|D)-(ka|optical)-/.test(line.id));
 root.updateMatrixWorld(true);assert.equal(terminalLines.length,6);
 assert(![...banks.keys()].some(id=>/gnss|ka|optical/.test(id)),
  'Interior terminal interfaces must not generate exterior cable portals');
 let minimumTerminalRoofGapM=Infinity;
 for(const line of terminalLines){
  const point=world(line.to),n=normal(line.to);assert(point[1]+line.radiusM<inner,
   line.id+' must terminate wholly below the inner roof');
  pointNear(n,[-1,0,0],line.id+' fixed stator connector normal');
  minimumTerminalRoofGapM=Math.min(minimumTerminalRoofGapM,inner-point[1]-line.radiusM);
 }
 const passages=[];
 for(const spec of architecture.boxes.filter(box=>box.baseInterfaceInsideBus)){
  const host=actualBoxes.get(spec.id).root,mount=host.parent,
   port=factory.routingFeedthroughs.find(p=>p.id===spec.id+':stator-device-transfer');
  assert(port&&port.wallMeshes.length===3,'Every roof layer must contain the real transfer hole');
  pointNear(host.getWorldPosition(V()).toArray(),spec.positionM,'Physical stator and graph station');
  const point=mount.getWorldPosition(V()).toArray(),row=terminalMassElements(h).find(part=>
   part.id===(spec.hostKey==='dish'?'dish':'optic')+'-base');
  pointNear(row.centroidM,point,'Terminal fixed assembly uses its physical roof mount datum');
  const actual=[];mount.traverse(mesh=>{if(physical(mesh))actual.push(mesh);});
  const obstacles=[...new Set([...actual,...port.wallMeshes,...port.meshes])].map(mesh=>obstacleFromMesh(mesh));
  const a=[point[0],roof-.115,point[2]],b=[point[0],roof+.05,point[2]],
   route={id:spec.id+':enclosed-transfer',points:[a,b],radiusM:.011,clearanceM:.001};
  const clear=routeClearance(route,obstacles);assert(clear.ok,spec.id+' continuous hollow stator/roof/pedestal passage: '+JSON.stringify(clear));
  const blocked=new T.Mesh(new T.CylinderGeometry(.024,.024,.01,24),new T.MeshBasicMaterial());
  blocked.position.set(point[0],roof+.025,point[2]);root.add(blocked);root.updateMatrixWorld(true);
  assert(!routeClearance(route,[obstacleFromMesh(blocked)]).ok,'Former capped pedestal must block the transfer');
  blocked.removeFromParent();blocked.geometry.dispose();blocked.material.dispose();
  passages.push({id:spec.id,wallLayers:port.wallMeshes.length,boreRadiusM:transfer.boreRadiusM});
 }
 const before=terminalLines.map(line=>world(line.to));
 for(const direction of [[0,1,0],[1,1,0],[-1,.5,1],[0,.2,-1]]){
  factory.pointTerminals(V(direction),V(direction));root.updateMatrixWorld(true);
  terminalLines.forEach((line,i)=>pointNear(world(line.to),before[i],line.id+' stays fixed while the head points'));
 }
 const gnss=lines.find(line=>line.id==='RF-GNSS/0'),gnssPoint=world(gnss.from),
  gland=factory.routingFeedthroughs.find(p=>p.id==='gnss-under-roof-feed');
 assert(gland&&gland.wallMeshes.length===3);pointNear(normal(gnss.from),[0,-1,0],'Downward GNSS connector');
 assert(gnssPoint[1]<roof&&gnssPoint[1]>inner,'The GNSS cable exit starts inside its open roof sleeve');
 const gnssPassage={id:'gnss-bore',points:[[gnssPoint[0],roof+.009,gnssPoint[2]],
  [gnssPoint[0],inner-.08,gnssPoint[2]]],radiusM:.008,clearanceM:.002};
 assert(routeClearance(gnssPassage,[...gland.wallMeshes,...gland.meshes].map(mesh=>obstacleFromMesh(mesh))).ok,
  'The full GNSS connector approach passes through all actual wall layers');
 const lift=factory.heatLiftPackage;assert(lift&&lift.mounts===4);
 pointNear(lift.root.getWorldPosition(V()).toArray(),allocation.positionM,'Actual heat-pump station');
 pointNear(architecture.boxById['thermal-drive'].positionM,allocation.positionM,'Motor drive belongs to the actual package');
 assert.equal(actualBoxes.get('thermal-drive').root.parent,lift.root);
 const thermalLines=lines.filter(line=>/^([PC]-THERMAL)\//.test(line.id));assert.equal(thermalLines.length,7);
 for(const line of thermalLines){pointNear(normal(line.to),[0,0,-1],'Package connector face');
  assert(world(line.to)[2]>allocation.rackForwardM+.20,'Package plug and approach clear the occupied rack end');}
 const mass=componentMassProperties(h),row=mass.rows.find(row=>row.wbs==='03.02');
 pointNear(row.stationsM[0],allocation.positionM,'625 kg assembly shares the actual station');
 near(row.massKg*row.stationShares[0],625,'Retain the complete heat-pump mass exactly once');
 const inertia=componentInertia(h).contributions.find(row=>row.wbs==='03.02');
 assert(inertia.basis.includes('actual forward service-bay'),'Inertia must use the relocated actual envelope');
 const cold=root.userData.fluidComponentChannels.find(c=>c.interfaceType==='heat-exchanger-cold'),
  hot=root.userData.fluidComponentChannels.find(c=>c.interfaceType==='heat-exchanger-hot');
 assert.equal(cold.portIds.length,2);assert.equal(hot.portIds.length,4);
 assert(cold.portIds.every(id=>!hot.portIds.includes(id)),'Cold and hot fluids must have disjoint physical ports');
 const coldConnections=factory.fluidConnections.filter(c=>c.circuitId==='heatlift-cold');
 assert.equal(coldConnections.length,2);
 for(const connection of coldConnections){assert.equal(connection.fluidKind,'heatlift-cold-secondary');
  assert.equal(connection.planRouting,true,'Both new cold links must enter native planning and collision checks');
  assert(!connection.tube.route.bendLimited&&connection.tube.route.minimumBendRadiusM>=.108-tolerance);}
 const hotConnections=factory.fluidConnections.filter(c=>/^Loop [12] (supply|return) supported internal pipe$/.test(c.name));
 assert.equal(hotConnections.length,4);
 for(const connection of hotConnections){assert.equal(connection.fluidKind,'heatlift-hot-secondary');
  assert(hot.portIds.includes(connection.a.uuid),'Radiator pipes must start on the actual condenser');
  assert(!connection.tube.route.bendLimited&&connection.tube.route.minimumBendRadiusM>=.108-tolerance,
   connection.name+' must retain full108 mm bends');}
 // Read the installed ports, not a duplicate test fixture. The retained
 // proposal must stop matching after an interface, cable, family or service
 // withdrawal changes; a matching proposal still needs native admission.
 const serviceLines=lines.filter(line=>/^(P-SVC|C-|RF-|D-ka|D-optical|P-THERMAL)/.test(line.id));
 assert.equal(serviceLines.length,48,'The complete stationary service inventory is explicit');
 const serviceRoutes=serviceLines.map(line=>{
  const a=world(line.from),b=world(line.to),na=normal(line.from),nb=normal(line.to),
   invoke=(hh=h,ll=layout,entry=line,aa=a,bb=b,nna=na,nnb=nb,waypoints=[])=>
    starcatcherServiceRouteHint(hh,ll,entry,aa,bb,nna,nnb,waypoints),controls=invoke();
  assert(controls,line.id+' must have a proposal for its actual installed interfaces');
  const shape=roundedConnectionRoute(controls,line.bendRadiusM);
  assert(!shape.bendLimited&&shape.minimumBendRadiusM>=line.bendRadiusM-tolerance,
   line.id+' must preserve the specified cable bend radius');
  assert.equal(invoke({...h,architectureFamilyId:'protected-core'}),null);
  assert.equal(invoke({...h,input:{...h.input,referenceCenterId:'different-reference'}}),null);
  assert.equal(invoke(h,{...layout,familyId:'redwire-platform'}),null);
  assert.equal(invoke(h,layout,{...line,radiusM:line.radiusM+.0001}),null);
  assert.equal(invoke(h,layout,{...line,bendRadiusM:line.bendRadiusM+.0001}),null);
  assert.equal(invoke(h,layout,line,a.map((v,k)=>v+(k===0?.001:0))),null);
  assert.equal(invoke(h,layout,line,a,b,na.map((v,k)=>v+(k===1?.001:0))),null);
  assert.equal(invoke(h,layout,line,a,b,na,nb,[[0,0,0]]),null);
  const withdrawn={...line,r:{...line.r,from:{...line.r.from,
   plug:{position:{x:.001,y:0,z:0}}}}};
  assert.equal(invoke(h,layout,withdrawn),null,'Unseated service plugs require fresh routing');
  const copied=invoke();copied[0][0]+=.1;
  pointNear(invoke()[0],a,'Callers cannot mutate a retained service proposal');
  return {id:line.id,points:shape.points,radiusM:line.radiusM,clearanceM:.002,
   minimumBendRadiusM:shape.minimumBendRadiusM,minBendRadiusM:line.bendRadiusM,
   from:{position:a,normal:na},to:{position:b,normal:nb}};
 });
 const serviceScreen=auditRoutes(serviceRoutes,[],{maxIssues:5});
 assert(serviceScreen.ok,'Stationary service continuity, tangent, bend and mutual clearance: '+
  JSON.stringify(serviceScreen.issues));
 // The case and all external electrical terminations are checked against real
 // hardware at stow and deployment. Attached roof feet intentionally meet the
 // structure; pipe/cable route screening is done by the common native audit.
 const packageCase=new T.Box3().setFromCenterAndSize(V(allocation.positionM),V(allocation.dimensionsM)),
  nearHardware=[];let minimumCaseHardwareGapM=Infinity;
 for(const progress of [0,1]){factory.positionPanels(progress);root.updateMatrixWorld(true);
  root.traverse(mesh=>{if(!physical(mesh)||owns(mesh,lift.root)||mesh.userData.part==='structure'||mesh.userData.routingWallId||mesh.userData.routingPanelId)return;
   const bounds=materialBounds(mesh),distance=gap(packageCase,bounds);
   minimumCaseHardwareGapM=Math.min(minimumCaseHardwareGapM,distance);
   if(distance<.002)nearHardware.push({progress,name:mesh.name,part:mesh.userData.part,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}});
  });
 }
 assert.equal(nearHardware.length,0,'Heat-pump case must clear other real hardware: '+JSON.stringify(nearHardware.slice(0,8)));
 const roofWall=factory.routingWalls.find(w=>w.axis===1&&w.sign===1),roofObstacle=obstacleFromMesh(roofWall.mesh);
 let feet=0;lift.root.traverse(mesh=>{if(mesh.name!=='Heat-lift package roof foot')return;feet++;
  const bounds=materialBounds(mesh),center=bounds.getCenter(V());center.y=bounds.max.y;
  assert(segmentObstacleClearance(center.toArray(),center.toArray(),roofObstacle)<tolerance,
   'Every package roof foot must actually contact the structural roof');});assert.equal(feet,4);
 return {ok:true,boundary:'Actual interfaces and material before routing search',terminalCuts:6,
  terminalPointingPoses:4,stationaryHarnessCuts:serviceRoutes.length,
  stationaryServicePairCount:serviceScreen.counts.linePairs,minimumTerminalRoofGapM,roofPassages:passages,gnssRoofLayers:3,
  heatPump:{positionM:allocation.positionM,assemblyKg:625,roofFeet:feet,powerCuts:6,controlCuts:1,
   coldConnections:2,hotConnections:4,minimumCaseHardwareGapM},
  scope:'Selected stowed/deployed hardware poses and initial full-radius pipe shapes; complete conduit/support clearance belongs to the native installation audit.'};
}
if(process.argv[1]?.endsWith('starcatcher-service-checks.mjs')){
 globalThis.document={createElement:()=>canvas()};
 console.log(JSON.stringify(auditStarcatcherServiceInterfaces(),null,2));
}
