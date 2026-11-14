import {auditRoutes} from './routing-audit.js';

// One registry for electrical/fluid interference. An aperture remains attached
// to its exact physical solid and its explicitly named circuit after merging.
export function mergeRoutingObstacles(groups){
 const solids=new Map();
 for(const obstacle of groups.flat()){
  const key=obstacle.sourceMesh||obstacle.id,existing=solids.get(key);
  if(!existing){solids.set(key,{...obstacle,apertures:[...(obstacle.apertures||[])]});continue;}
  const apertures=new Map([...(existing.apertures||[]),...(obstacle.apertures||[])].map(a=>[a.id+'|'+[...(a.routeIds||[])].sort().join(','),a]));
  existing.apertures=[...apertures.values()];if(!existing.motionModel&&obstacle.motionModel)existing.motionModel=obstacle.motionModel;
 }
 return [...solids.values()];
}

// A joined installation must retain the service registry's failures as well
// as its geometry. Otherwise a live spacecraft view could display a green
// result after silently dropping a failed carrier cut-length or inventory
// check. The same composition is used by the viewport and joined-scene CI.
export function mergeServiceRoutingSnapshot(base,service,{scope='Service circuit',inventoryKey='service'}={}){
 const issues=[...(service?.additionalIssues||[])],routes=service?.routes||[],obstacles=service?.obstacles||[],inventory=service?.inventory;
 const fail=(code,detail={})=>issues.push({code,scope:inventoryKey,...detail});
 if(!service||!Array.isArray(service.routes)||!Array.isArray(service.obstacles))fail('missing-service-routing-snapshot');
 for(const failure of service?.planningFailures||[])fail('unresolved-service-routing-plan',{routeId:failure.id??failure.routeId,planningIssue:failure});
 const checkInventory=(expected,actual,kind)=>{
  if(!Array.isArray(expected)){fail('missing-service-'+kind+'-inventory');return [];}
  const wanted=new Set(expected),present=new Set(actual);
  if(wanted.size!==expected.length||expected.some(id=>typeof id!=='string'||!id))fail('invalid-service-'+kind+'-inventory');
  for(const id of wanted)if(!present.has(id))fail('missing-service-'+kind,{[kind==='route'?'routeId':'obstacleId']:id});
  for(const id of present)if(!wanted.has(id))fail('unregistered-service-'+kind,{[kind==='route'?'routeId':'obstacleId']:id});
  return expected;
 };
 const expectedRouteIds=checkInventory(service?.expectedRouteIds,routes.map(r=>r.id),'route'),expectedObstacleIds=checkInventory(service?.expectedObstacleIds,obstacles.map(o=>o.id),'obstacle');
 if(!inventory||!['registeredTubeMeshes','drawnTubeMeshes'].every(k=>Number.isInteger(inventory[k])&&inventory[k]>=0)||!Array.isArray(inventory.unregisteredTubeMeshes)||!Array.isArray(inventory.missingTubeMeshes))fail('missing-service-mesh-inventory');
 else {
  for(const meshId of inventory.unregisteredTubeMeshes)fail('unregistered-service-tube',{meshId});
  for(const meshId of inventory.missingTubeMeshes)fail('missing-service-tube',{meshId});
  if(inventory.registeredTubeMeshes!==inventory.drawnTubeMeshes)fail('service-tube-inventory-count-mismatch',{registered:inventory.registeredTubeMeshes,drawn:inventory.drawnTubeMeshes});
 }
 const baseIssues=base.additionalIssues||[],declared=service?.additionalIssueCount;if(declared!==undefined&&(!Number.isInteger(declared)||declared<0))fail('invalid-service-issue-count');
 const serviceCount=Math.max(service?.additionalIssues?.length||0,Number.isInteger(declared)&&declared>=0?declared:0),baseCount=Math.max(baseIssues.length,base.additionalIssueCount||0);
 return {...base,routes:[...base.routes,...routes.map(r=>({...r,scope}))],obstacles:mergeRoutingObstacles([base.obstacles,obstacles]),additionalIssues:[...baseIssues,...issues],additionalIssueCount:baseCount+serviceCount+issues.length-(service?.additionalIssues?.length||0),inventory:{...base.inventory,[inventoryKey]:inventory},expectedRouteIds:[...(base.expectedRouteIds||base.routes.map(r=>r.id)),...expectedRouteIds],expectedObstacleIds:[...new Set([...(base.expectedObstacleIds||base.obstacles.map(o=>o.id)),...expectedObstacleIds])],obstacleLabels:{...base.obstacleLabels,...service?.obstacleLabels}};
}

const inherited=(o,key)=>{for(let p=o;p;p=p.parent)if(p.userData?.[key])return true;return false;};
export function electricalRoutingInventory(factory){
 const electrical=factory.electrical,issues=[],expectedRouteIds=[],expectedEndpoints=new Map(),registered=new Map(),root=factory.root;
 if(!electrical?.architecture||!electrical?.routing)return {ok:false,issues:[{code:'missing-electrical-routing-registry'}],expectedRouteIds,registeredRoutes:0,renderedMeshes:0};
 issues.push(...(electrical.routing.accommodationIssues||[]));
 for(const spec of electrical.architecture.harnesses){
  const quantity=spec.quantity*(spec.connectorTypeId.startsWith('hv-single')?2:1);
  if(!Number.isInteger(quantity)||quantity<1){issues.push({code:'invalid-electrical-circuit-quantity',routeId:spec.id,quantity});continue;}
  if(spec.physicalRouteSections){const ids=spec.physicalRouteSections.map(s=>s.id);if(ids.length!==quantity*2||new Set(ids).size!==ids.length)issues.push({code:'invalid-physical-section-quantity',routeId:spec.id,quantity:ids.length});expectedRouteIds.push(...ids);for(const section of spec.physicalRouteSections)expectedEndpoints.set(section.id,section);}
  else for(let i=0;i<quantity;i++){const id=spec.id+'/'+i;expectedRouteIds.push(id);expectedEndpoints.set(id,{fromPortId:spec.fromPortId,toPortId:spec.toPortId,fromInstance:i,toInstance:i});}
 }
 const belongs=o=>{for(let p=o;p;p=p.parent)if(p===root)return true;return false;};
 for(const line of electrical.routing.lines){
  if(registered.has(line.id))issues.push({code:'duplicate-electrical-route',routeId:line.id});registered.set(line.id,line);
  if(!line.tube?.mesh||!belongs(line.tube.mesh))issues.push({code:'missing-rendered-electrical-line',routeId:line.id});
  for(const end of ['from','to'])if(!line[end]||!belongs(line[end]))issues.push({code:'missing-electrical-connector',routeId:line.id,end});
  const declaration=expectedEndpoints.get(line.id);if(declaration)for(const end of ['from','to']){const portId=declaration[end+'PortId'],port=electrical.ports.get(portId)||electrical.extraPorts?.get(portId),anchor=port?.exits?.[declaration[end+'Instance']];if(!anchor||line[end]!==anchor)issues.push({code:'wrong-electrical-connector',routeId:line.id,end,expectedPortId:portId,expectedPhysicalInstance:declaration[end+'Instance']});}
  for(const issue of line.planningIssues||[])issues.push({code:'unresolved-routing-plan',routeId:line.id,planningIssue:issue});
  for(const issue of line.servicePlanningIssues||[])issues.push({code:'unresolved-service-loop',routeId:line.id,planningIssue:issue});
 }
 const expected=new Set(expectedRouteIds),meshes=new Set([...registered.values()].map(l=>l.tube?.mesh?.uuid));
 for(const id of expected)if(!registered.has(id))issues.push({code:'missing-electrical-route',routeId:id});
 for(const id of registered.keys())if(!expected.has(id))issues.push({code:'unexpected-electrical-route',routeId:id});
 root.traverse(o=>{if(!o.isMesh||!o.userData.dynamicConnection||inherited(o,'electricalOverview')||inherited(o,'engineeringGraphic')||inherited(o,'groundEquipment'))return;
  if(o.userData.electricalHarnessId&&!meshes.has(o.uuid))issues.push({code:'unregistered-rendered-electrical-line',routeId:o.userData.routingId,meshId:o.uuid});
  if(!o.userData.electricalHarnessId&&!o.userData.fluidConnectionId&&!o.userData.groundConnection)issues.push({code:'unclassified-rendered-connection',meshId:o.uuid,name:o.name});
 });
 return {ok:issues.length===0,issues,expectedRouteIds,registeredRoutes:registered.size,renderedMeshes:meshes.size};
}

export function flightRoutingSnapshot(factory,{frame=null}={}){
 factory.root.updateWorldMatrix(true,true);
 const electrical=factory.electrical?.routing?.snapshot?.({frame})||{routes:[],obstacles:[]},fluid=factory.fluidRoutingSnapshot?.({frame})||{routes:[],sections:[],obstacles:[],sectionValidation:{ok:false,issues:[{code:'missing-fluid-routing-registry'}],issueCount:1}},inventory=electricalRoutingInventory(factory),operational=factory.electrical?.routing?.operationalEnvelopes;
 inventory.issues.push(...(operational?.issues||[]));inventory.ok=inventory.issues.length===0;
 const routes=[...electrical.routes.map(r=>({...r,scope:'Electrical harness'})),...fluid.routes.map(r=>({...r,scope:'Fluid circuit'}))],obstacles=mergeRoutingObstacles([electrical.obstacles,fluid.obstacles]),additionalIssues=[...inventory.issues,...(fluid.sectionValidation?.issues||[])],obstacleLabels={};
 factory.root.traverse(o=>{if(o.isMesh)obstacleLabels[o.uuid]=o.name||o.userData.routingWallId||o.userData.part||'Physical mesh';});
 return {routes,sections:fluid.sections,obstacles,expectedRouteIds:[...inventory.expectedRouteIds,...fluid.routes.map(r=>r.id)],expectedObstacleIds:obstacles.map(o=>o.id),additionalIssues,additionalIssueCount:inventory.issues.length+(fluid.sectionValidation?.issueCount||0),obstacleLabels,inventory:{electrical:inventory,fluid:fluid.inventory},context:{source:'Actual installed tube buffers, connector anchors and physical solids',installedFluidLengthAccounting:fluid.installedLengthAccounting||null},coverage:{currentPose:true,continuousSweep:'Requires an interval certificate'}};
}

export function auditFlightRoutingSnapshot(snapshot,options={}){
 const collision=auditRoutes(snapshot.routes,snapshot.obstacles,{expectedRouteIds:snapshot.expectedRouteIds||[...(snapshot.inventory?.electrical?.expectedRouteIds||[]),...snapshot.routes.filter(r=>r.scope==='Fluid circuit').map(r=>r.id)],...(snapshot.expectedObstacleIds?{expectedObstacleIds:snapshot.expectedObstacleIds}:{}),...options}),additional=snapshot.additionalIssues||[];
 return {...collision,ok:collision.ok&&!snapshot.additionalIssueCount,issues:[...additional,...collision.issues],issueCount:collision.issueCount+(snapshot.additionalIssueCount||0),truncated:collision.truncated||(snapshot.additionalIssueCount||0)>additional.length,inventory:snapshot.inventory};
}
