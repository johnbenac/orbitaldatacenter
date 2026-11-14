import assert from 'node:assert/strict';
import {sizeDesign} from './dist/design.js';
import {routingCraftConfigurations} from './dist/routing-configurations.js';
import {buildElectricalArchitecture,electricalCircuitExitPose,connectorSelections} from './dist/electrical-architecture.js';
import {componentMassProperties} from './dist/component-stations.js';
import {accommodateFabricRows} from './dist/fabric-equipment-layout.js';

const reports=[];let activeFabricBanks=0,physicalInterfaces=0;
for(const [id,input] of routingCraftConfigurations()){
 const h=sizeDesign(input),graph=buildElectricalArchitecture(h),fabric=graph.boxes.filter(b=>b.id.startsWith('fabric-')),mass=componentMassProperties(h).rows.find(r=>r.wbs==='01.04');
 assert.equal(mass.stationsM.length,fabric.length);
 for(let i=0;i<fabric.length;i++)assert.ok(Math.hypot(...fabric[i].positionM.map((v,k)=>v-mass.stationsM[i][k]))<1e-9,'Actual cassette centers and mass stations must agree: '+id+'/'+fabric[i].id);
 for(const box of fabric.filter(b=>b.routingAccommodation)){
  const allocation=box.routingAccommodation;assert.equal(allocation.ok,true,JSON.stringify(allocation.issues));activeFabricBanks++;
  for(const panel of box.connectorPanels){assert.ok(panel.dimensionsM[0]<=allocation.policy.panelWidthM+1e-8);assert.ok(panel.dimensionsM[1]<=allocation.policy.panelHeightM+1e-8);}
  for(const a of graph.harnesses.filter(a=>[a.fromBoxId,a.toBoxId].includes(box.id))){
   const end=a.fromBoxId===box.id?'from':'to',type=connectorSelections[a.connectorTypeId];
   for(let instance=0;instance<a.quantity;instance++)for(const polarity of a.connectorPairsPerAssembly===2?[-1,1]:[0]){
    const pose=electricalCircuitExitPose(h,graph,a[end+'PortId'],{instance,polarity}),lead=pose.cableExitM.map((v,k)=>v+pose.normal[k]*(2.4*a.bendRadiusM+.015)),stroke=pose.cableExitM.map((v,k)=>v+pose.normal[k]*.045);physicalInterfaces++;
    for(const point of [pose.positionM,pose.cableExitM,stroke,lead])for(let axis=0;axis<3;axis++)assert.ok(point[axis]>=allocation.bounds.min[axis]-1e-8&&point[axis]<=allocation.bounds.max[axis]+1e-8,'Complete interface leaves allocated fabric bay: '+id+'/'+a.id);
    // The finite-radius radial cross-section must fit its assigned panel.
    for(const axis of [0,1])assert.ok(pose.positionM[axis]-type.diameterM/2>=allocation.bounds.min[axis]-1e-8&&pose.positionM[axis]+type.diameterM/2<=allocation.bounds.max[axis]+1e-8);
   }
  }
 }
 for(const box of graph.boxes.filter(b=>b.routingAccommodation?.kind==='rack-side-service-pocket')){
  assert.ok(box.routingAccommodation.displacedSlotIndices.length>0);
  if(box.id==='thermal-drive')assert.ok(graph.ports.filter(p=>p.boxId===box.id).every(p=>p.face==='back'),'High-current side-pocket approaches follow the actual side aisle.');
 }
 reports.push({id,switches:fabric.length,separatedBays:fabric.filter(b=>b.routingAccommodation).length,sidePockets:graph.boxes.filter(b=>b.routingAccommodation?.kind==='rack-side-service-pocket').map(b=>b.id)});
}

const input=routingCraftConfigurations().find(([id])=>id==='starmind-ai1')[1],h=sizeDesign(input),boxes=buildElectricalArchitecture(h).boxes.filter(b=>b.id.startsWith('fabric-')).map(b=>({...b,positionM:[...b.positionM]})),tooShort=accommodateFabricRows(boxes,{...h,bodyHeightM:.6});
assert.equal(tooShort.ok,false,'An infeasible overhead bay remains a visible accommodation failure; the rack or wall cannot be omitted.');assert.ok(tooShort.boxes.some(b=>b.issues.length));
console.log(JSON.stringify({ok:true,configurations:reports.length,activeFabricBanks,physicalInterfaces,reports,scope:'Allocated complete packed interfaces and mass-station reconciliation. Actual rendered material/stroke/lead inspection remains mandatory on every factory.'}));
