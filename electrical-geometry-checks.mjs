import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {canvas} from './render-test-canvas.mjs';
import {sizeDesign,missionStarter} from './dist/design.js';
import {buildReferenceDesign,referenceConfigurationMetadata} from './dist/reference-configurations.js';
import {electricalPortPose,electricalCircuitExitPose} from './dist/electrical-architecture.js';
import {createPartModel,partObjectDescriptor,visiblePartObject} from './dist/part-model.js';
import {buildPartsCatalog,resolveScenePart} from './dist/parts-catalog.js';
import {anchorInFrame} from './dist/connection-geometry.js';
import {createVerificationSetting} from './dist/part-verification-scenes.js';

globalThis.document={createElement:()=>canvas()};
const V=(...p)=>new T.Vector3(...p),tolerance=3e-5,rows=[];
const definitions=[['protected-core',missionStarter('text')],...Object.keys(referenceConfigurationMetadata).map(id=>[id,buildReferenceDesign(id)])];
for(const [id,input] of definitions){
 const h=sizeDesign(input),model=createPartModel(h,'flight'),c=model.factory,e=c.electrical,catalog=buildPartsCatalog(h);let maximumGapM=0,maximumModelDatumErrorM=0;
 assert.notEqual(c.pcdu,c.avionics);assert.notEqual(c.fabric,c.avionics,'payload fabric and CDH must be distinct physical equipment');
 for(const deployment of [0,.25,.5,.75,1]){
  const attitude={wingPitchDeg:deployment===.75?18:0,upperRadiatorPitchDeg:deployment===.75?24:0,lowerRadiatorPitchDeg:deployment===.75?-16:0};
  c.positionPanels(deployment,attitude);c.root.updateMatrixWorld(true);
  for(const a of e.audit()){
   maximumGapM=Math.max(maximumGapM,a.fromGapM,a.toGapM);assert(a.fromGapM<tolerance&&a.toGapM<tolerance,id+' actual tube buffers must close to both backshells: '+a.id);
   assert(!a.bendLimited,id+' centreline minimum bend: '+a.id);
   assert(a.renderedLengthM<=a.allocatedCutLengthM+tolerance,id+' declared cut length must accommodate this posed route: '+a.id);
  }
  for(const [portId,port] of e.ports){const expected=electricalPortPose(h,e.architecture,portId,{deployment,attitude}),actual=port.frame.getWorldPosition(V()),error=actual.distanceTo(V(...expected.positionM));maximumModelDatumErrorM=Math.max(maximumModelDatumErrorM,error);assert(error<tolerance,id+' procurement and physical flange datum: '+portId+' ('+error+' m)');
   assert.equal(port.exits.length,port.port.quantity*(port.port.connectorTypeId.startsWith('hv-single')?2:1),id+' all physical connector circuits exist: '+portId);
   for(const exit of port.exits){const circuit=electricalCircuitExitPose(h,e.architecture,portId,{deployment,attitude,instance:exit.userData.circuitInstance,polarity:exit.userData.polarity}),error=exit.getWorldPosition(V()).distanceTo(V(...circuit.cableExitM));maximumModelDatumErrorM=Math.max(maximumModelDatumErrorM,error);assert(error<tolerance,id+' physical circuit/polarity exit agrees with the allocated datum: '+portId+'/'+circuit.instance+'/'+circuit.polarity+' ('+error+' m)');}
  }
  for(const f of c.fluidConnections||[]){const ends=f.tube.endpoints;assert(ends[0].distanceTo(anchorInFrame(f.a,f.parent))<tolerance&&ends[1].distanceTo(anchorInFrame(f.b,f.parent))<tolerance,id+' fluid line must close to the real fitting: '+f.name);}
 }
 const portAudit=e.auditPorts();for(const p of portAudit){assert(p.surfaceErrorM<tolerance,id+' receptacle flush to actual box/panel: '+p.id);assert(p.faceMarginM>=-tolerance,id+' flange fully supported by actual box/panel: '+p.id);}
 for(let i=0;i<portAudit.length;i++)for(let j=i+1;j<portAudit.length;j++){
  const a=portAudit[i],b=portAudit[j];if(a.boxId!==b.boxId||a.axis!==b.axis||a.normal[a.axis]!==b.normal[b.axis])continue;
  const axes=[0,1,2].filter(k=>k!==a.axis),overlap=axes.every(k=>Math.min(a.faceBounds.max[k],b.faceBounds.max[k])-Math.max(a.faceBounds.min[k],b.faceBounds.min[k])>tolerance);
  assert(!overlap,id+' neighbouring connector flange collision: '+a.id+' / '+b.id);
 }
 const details=[...e.architecture.assemblies,...e.architecture.connectorDetails,...e.architecture.cards].map(a=>a.itemId).concat('ground:egse-cable');
 for(const itemId of details){const record=catalog.byId[itemId];assert(record,id+' catalog entry '+itemId);model.pose(record);const selected=model.select(record);assert(selected.available&&selected.meshes.some(visiblePartObject),id+' independent part geometry '+itemId);const source=selected.meshes.find(o=>visiblePartObject(o)&&partObjectDescriptor(o,model).physicalPartId===itemId);assert(source,id+' selected assembly contains its own physical part, alongside related connectors '+itemId);assert.equal(resolveScenePart(catalog,partObjectDescriptor(source,model))?.id,itemId,id+' physical geometry resolves back to the same MEL part '+itemId);}
 assert(Math.abs(e.groundLead.userData.cableLengthM-3)<1e-6,'removable EGSE cable has its declared 3 m centreline');
 assert.equal(e.groundLead.userData.groundEquipment,true);
 const harness=e.architecture.assemblies.find(a=>a.id==='control'),record=catalog.byId[harness.itemId];model.pose(record);model.select(record);
 const r=e.harnesses.get(harness.exemplarHarnessId),start=r.to.plug.getWorldPosition(V());assert(e.mating(record.id,0));c.root.updateMatrixWorld(true);const withdrawn=r.to.plug.getWorldPosition(V()),axis=new T.Vector3(0,0,1).applyQuaternion(r.to.frame.getWorldQuaternion(new T.Quaternion()));assert(withdrawn.clone().sub(start).cross(axis).length()<1e-8,'plug withdrawal follows its mating axis');assert(withdrawn.distanceTo(start)>.02);for(const a of e.audit())assert(a.toGapM<tolerance,'cable remains attached during mating');e.mating(record.id,1);
 e.update({storageKW:99},{enabled:true,focus:'power',itemId:null});for(const x of e.harnesses.values())if(x.spec.groupId==='primary')assert(!x.cue.visible,'disk power does not animate battery charge leads');
 e.update({chargeKW:2},{enabled:true,focus:'power',itemId:null});assert([...e.harnesses.values()].some(x=>x.spec.groupId==='primary'&&x.cue.visible),'battery charging animates the actual battery path');
 e.update({aiInputReadMbps:20},{enabled:true,focus:'data',itemId:null});assert([...e.harnesses.values()].some(x=>x.spec.toBoxId==='recorder'&&x.cue.visible),'local corpus reads animate the recorder path');assert([...e.harnesses.values()].filter(x=>x.spec.toBoxId.startsWith('optical-')).every(x=>!x.cue.visible),'local training reads do not imply Earth delivery');
 const activity=e.update({}, {enabled:true,mode:'checkout',itemId:record.id,time:1,reducedMotion:true}),marker=r.markers[0].position.clone();e.update({}, {enabled:true,mode:'checkout',itemId:record.id,time:9,reducedMotion:true});assert(marker.distanceTo(r.markers[0].position)<1e-12,'reduced motion freezes the stimulus');assert(activity.activeRoutes<=20,'activity has a bounded rendering budget');
 // This negative control corrupts the displayed mesh, not its declared port.
 // The connection audit must detect a visibly detached tube endpoint.
 const tube=r.tubes[0],buffer=tube.mesh.geometry.attributes.position,n=buffer.count-1,old=buffer.getX(n);buffer.setX(n,old+.01);assert(e.audit().find(a=>a.id===r.spec.id).toGapM>.009,'corrupted rendered endpoint must fail closure audit');buffer.setX(n,old);
 if(id==='redwire-8kw'){
  const boxRecord=catalog.byId['flight:08.01'];model.pose(boxRecord);model.select(boxRecord);const pts=e.articlePorts(boxRecord.id),bounds=new T.Box3().setFromObject(c.avionics),origin=bounds.getCenter(V());origin.y=bounds.min.y;const setting=createVerificationSetting({kind:'electrical-bench',size:bounds.getSize(V()),scaleMode:'none',articlePorts:pts.map(p=>({...p,position:p.position.clone().sub(origin)}))});
  let connected=0;setting.root.traverse(o=>{if(o.userData.articlePortId&&o.userData.dynamicConnection)connected++;});assert(connected>0,'checkout fixture must use allocated physical article ports');setting.update(.4);assert(setting.root.getObjectByName('Illustrative checkout stimulus')?.visible);setting.dispose();
 }
 rows.push({id,interfaces:e.ports.size,routes:e.harnesses.size,fluidLines:c.fluidConnections?.length||0,maximumGapM,maximumModelDatumErrorM,overviewDrawCalls:e.overview.children.length});model.dispose();
}
console.table(rows);console.log('Electrical and fluid geometry: actual-buffer endpoint closure, physical flange support, separated connectors, model/render datums, pose and mating travel, route lengths, MEL identity, real activity and reduced motion passed.');
