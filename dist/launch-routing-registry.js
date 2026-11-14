import {obstacleFromMesh} from './routing-audit.js';
import {groundConnectionRecords} from './ground-connection-routing.js';
import {mergeRoutingObstacles} from './flight-routing-registry.js';

const bayRegistries=new WeakMap();
const chainOf=node=>{const chain=[];for(let p=node;p;p=p.parent)chain.push(p);return chain;};
const descendant=(node,root)=>{for(let p=node;p;p=p.parent)if(p===root)return true;return false;};
const presentChain=chain=>chain.every(node=>node.userData.routingPresent!==false&&!node.userData.engineeringGraphic&&!node.userData.processingCue&&!node.userData.sceneFlow&&!node.userData.serviceCue&&!node.userData.routingNonPhysical&&(!node.userData.routingReferenceRepresentation||node.userData.routingPresent===true));
export const routingPhysicalPresence=node=>presentChain(chainOf(node));

// The same physical presence flags drive the renderer's mechanism state.
// Inspection/camera visibility never removes a wall or a parked real fitting.
export function launchServiceRoutingSnapshot(launch,{frame=null,scope='all',includePart=null}={}){
 if(!launch?.umbilicals?.routingSnapshot)throw new Error('Missing installed launch-service registry');
 return launch.umbilicals.routingSnapshot({frame,scope,includePart,activeOnly:true});
}

function joinedGroundIds(ids){
 const set=new Set(ids),result=[];
 for(const id of ids){if(id.endsWith(':external')&&set.has(id.slice(0,-9)+':internal'))continue;result.push(id.endsWith(':internal')&&set.has(id.slice(0,-9)+':external')?id.slice(0,-9):id);}
 return result;
}

// Persistent declared inventory catches a removed tube, missing registration
// or deleted room wall. A newly selected station can add its real hardware;
// inactive cached station alternatives retain an explicit presence state.
export function bayRoutingSnapshot(launch,{frame=null}={}){
 const facility=launch?.parts?.facility;if(!facility)throw new Error('Missing integration-bay physical root');
 let registry=bayRegistries.get(facility);if(!registry){registry=new Map();bayRegistries.set(facility,registry);}
 facility.updateWorldMatrix(true,true);
 facility.traverse(mesh=>{if(!mesh.isMesh||registry.has(mesh.uuid))return;registry.set(mesh.uuid,{mesh,chain:chainOf(mesh),ground:mesh.userData.groundConnection||null,hoist:mesh.userData.hoistConnection||null});});
 const issues=[],active=[...registry.values()].filter(record=>presentChain(record.chain)),present=active.filter(record=>descendant(record.mesh,facility)),ground=present.filter(record=>record.ground),hoist=present.filter(record=>record.hoist),registered=new Set([...ground,...hoist].map(r=>r.mesh));
 for(const record of active){if(!descendant(record.mesh,facility))issues.push({code:'missing-bay-physical-mesh',meshId:record.mesh.uuid});if(record.ground&&record.mesh.userData.groundConnection!==record.ground||record.hoist&&record.mesh.userData.hoistConnection!==record.hoist)issues.push({code:'missing-bay-line-registration',meshId:record.mesh.uuid});}
 const drawn=present.filter(r=>r.mesh.userData.dynamicConnection||r.mesh.userData.routingLine||r.mesh.userData.hoistConnection),unregistered=drawn.filter(r=>!registered.has(r.mesh)).map(r=>r.mesh.uuid),missing=active.filter(r=>(r.ground||r.hoist)&&!present.includes(r)).map(r=>r.mesh.uuid);
 for(const meshId of unregistered)issues.push({code:'unregistered-bay-line',meshId});
 const actualSet=new Set(ground.map(r=>r.mesh)),routes=groundConnectionRecords(facility,{frame,includeInvisible:true,includeNode:node=>actualSet.has(node)}).map(route=>({...route,motion:{type:'rigid',owner:'bay:fixed'}})),rig=launch.bay.hoistRoutingSnapshot?.({frame})||{routes:[],additionalIssues:[],expectedRouteIds:[]};
 routes.push(...rig.routes);issues.push(...rig.additionalIssues);
 if(hoist.length&&!launch.bay.hoistRoutingSnapshot)issues.push({code:'missing-bay-hoist-registry'});
 const motionOf=mesh=>{for(let p=mesh;p&&p!==facility.parent;p=p.parent)if(p.userData.bayRoutingMotion)return {...p.userData.bayRoutingMotion};return {type:'rigid',owner:'bay:fixed'};};
 const solids=present.filter(r=>!registered.has(r.mesh)&&!r.mesh.userData.dynamicConnection&&!r.mesh.userData.routingLine),obstacles=solids.map(({mesh})=>({...obstacleFromMesh(mesh,{id:'bay-solid:'+mesh.uuid,frame}),motion:motionOf(mesh),name:mesh.name})),expectedSolids=active.filter(r=>!r.ground&&!r.hoist&&!r.mesh.userData.dynamicConnection&&!r.mesh.userData.routingLine).map(r=>'bay-solid:'+r.mesh.uuid),labels=Object.fromEntries(solids.map(({mesh})=>['bay-solid:'+mesh.uuid,mesh.name||'Physical bay mesh']));
 // The carrier stage, shroud, attachment and separation hardware are in
 // the same scene. During bay work its not-yet-installed umbilicals carry
 // an explicit absent state; all physically present carrier solids remain.
 const carrier=launchServiceRoutingSnapshot(launch,{frame,scope:'flight'}),additionalIssues=[...(carrier.additionalIssues||[]),...issues],expectedRouteIds=[...joinedGroundIds(active.filter(r=>r.ground).map(r=>r.ground.id)),...rig.expectedRouteIds,...carrier.expectedRouteIds];
 return {routes:[...routes,...carrier.routes],obstacles:mergeRoutingObstacles([obstacles,carrier.obstacles]),expectedRouteIds,expectedObstacleIds:[...expectedSolids,...carrier.expectedObstacleIds],additionalIssues,additionalIssueCount:Math.max(carrier.additionalIssueCount||0,carrier.additionalIssues?.length||0)+issues.length,planningFailures:carrier.planningFailures||[],obstacleLabels:{...labels,...carrier.obstacleLabels},inventory:{registeredTubeMeshes:registered.size+carrier.inventory.registeredTubeMeshes,drawnTubeMeshes:drawn.length+carrier.inventory.drawnTubeMeshes,unregisteredTubeMeshes:[...unregistered,...carrier.inventory.unregisteredTubeMeshes],missingTubeMeshes:[...missing,...carrier.inventory.missingTubeMeshes],physicalBayMeshes:active.length,physicalCarrierMeshes:carrier.obstacles.length},context:{stationId:launch.bay.station.userData.stationId,source:'Actual selected station, hoist/slings, room walls, carrier solids and live spacecraft attachment frame'}};
}
