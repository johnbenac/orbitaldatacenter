import * as T from './vendor/three.module.js';
import {buildElectricalArchitecture,connectorSelections,electricalKinds,routeElectricalHarness,electricalBoxMoves} from './electrical-architecture.js';
import {deploymentLayout,mechanismPose,leafAxes} from './deployment.js';
import {roleMaterial,tagMaterial,boxMaterialUV,cylinderMaterialUV,finalizeCraftMaterials} from './spacecraft-material-render.js';
import {connectionTube,connectionAnchor,anchorInFrame,normalInFrame} from './connection-geometry.js';
import {architectureFamily} from './architecture-families.js';
import {createInstalledElectricalRouting} from './installed-electrical-routing.js';
import {familyAppendageDimensions as appendageDimensions} from './family-appendage-dimensions.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Z=V(0,0,1),Y=V(0,1,0),clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
const parts={power:'power',control:'avionics',data:'fabric',rf:'communications'};
const list=x=>Array.isArray(x)?x:[x];
function group(parent,name,data={}){const g=new T.Group();g.name=name;g.userData={...data};parent.add(g);return g;}
function mesh(parent,geometry,material,name,data={}){const o=tagMaterial(new T.Mesh(geometry,material));o.name=name;Object.assign(o.userData,data);parent.add(o);return o;}
function cuboid(parent,dimensions,position,material,name,data={}){const o=mesh(parent,new T.BoxGeometry(...dimensions),material,name,data);o.position.set(...position);return boxMaterialUV(o,...dimensions);}
function cylinder(parent,radius,length,z,material,name,sides=12,endRadius=radius){const o=mesh(parent,new T.CylinderGeometry(endRadius,radius,length,sides),material,name);o.position.z=z;o.quaternion.setFromUnitVectors(Y,Z);return cylinderMaterialUV(o,radius,length);}
function ancestryData(o,key){for(let p=o;p;p=p.parent)if(p.userData?.[key]!=null)return p.userData[key];}
function ownMaterial(h,role,color){const m=roleMaterial(h,role).clone();m.userData={...m.userData,shared:false};if(color)m.color.set(color);return m;}

// Merge the overview by function and material. Individual sources remain
// available to the part navigator, but hundreds of ports are not hundreds of
// draw calls in the orbital scene. Buffers are reused on every moving pose.
function overviewBatch(parent,sources,name,data){
 const groups=new Map();for(const source of sources){const key=source.material.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(source);}
 const batches=[],inverse=new T.Matrix4(),matrix=new T.Matrix4(),normalMatrix=new T.Matrix3(),p=V(),n=V();
 for(const entries of groups.values()){
  let count=0,indexCount=0;for(const source of entries){count+=source.geometry.attributes.position.count;indexCount+=source.geometry.index?.count||source.geometry.attributes.position.count;}
  const positions=new Float32Array(count*3),normals=new Float32Array(count*3),uv=new Float32Array(count*2),indices=new (count>65535?Uint32Array:Uint16Array)(indexCount);let offset=0,io=0;
  const maps=entries.map(source=>{const entry={source,offset};const g=source.geometry;for(let i=0;i<(g.index?.count||g.attributes.position.count);i++)indices[io++]=offset+(g.index?g.index.getX(i):i);offset+=g.attributes.position.count;return entry;});
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setAttribute('normal',new T.BufferAttribute(normals,3));geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.setIndex(new T.BufferAttribute(indices,1));
  const o=mesh(parent,geo,entries[0].material,name,{...data,electricalOverview:true,hardwareDetailExclude:true});batches.push({mesh:o,maps});
 }
 function update(){
  parent.updateWorldMatrix(true,false);inverse.copy(parent.matrixWorld).invert();
  for(const {mesh:o,maps} of batches){const g=o.geometry;for(const {source,offset} of maps){source.updateWorldMatrix(true,false);matrix.multiplyMatrices(inverse,source.matrixWorld);normalMatrix.getNormalMatrix(matrix);const s=source.geometry.attributes;for(let i=0;i<s.position.count;i++){p.fromBufferAttribute(s.position,i).applyMatrix4(matrix);g.attributes.position.setXYZ(offset+i,p.x,p.y,p.z);if(s.normal)n.fromBufferAttribute(s.normal,i).applyNormalMatrix(normalMatrix);else n.set(0,1,0);g.attributes.normal.setXYZ(offset+i,n.x,n.y,n.z);g.attributes.uv.setXY(offset+i,s.uv?.getX(i)||0,s.uv?.getY(i)||0);}}g.attributes.position.needsUpdate=true;g.attributes.normal.needsUpdate=true;g.attributes.uv.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();}
 }
 update();return {meshes:batches.map(b=>b.mesh),update};
}

export function installElectricalHarnessScene(factory,h,{planFluidRoutes=true}={}){
 const architecture=buildElectricalArchitecture(h),family=architectureFamily(h),legacy=family.id==='protected-core'&&family.kaTerminalCount===1&&family.sPatchCount===2,root=factory.root,body=factory.internal||root;
 // Legacy internal accommodation has a non-unit Z scale. New allocations are
 // expressed in body metres, so they belong to a unit body frame, not to that
 // old drawing transform. Existing equipment gets a scale-neutral port frame.
 const equipment=group(root,'Electrical equipment in body metres',{part:'avionics'});factory.electricalEquipment=equipment;
 const harnesses=group(root,'Flight electrical interconnects',{part:'harness',electricalItemIds:['flight:07.05']}),raw=group(harnesses,'Individual build assemblies'),overview=group(harnesses,'Installed routed bundles'),activity=group(harnesses,'Interface activity',{engineeringGraphic:true,sceneFlow:true});
 const boxes=new Map(),ports=new Map(),routes=new Map(),connectors=new Map(),cards=new Map(),batches=[],staticSources=[],movingSources=[];
 const metal=roleMaterial(h,'electronics-case'),contact=roleMaterial(h,'rf-contact'),insulator=ownMaterial(h,'harness','#31383b'),caseMaterial=metal,colors=Object.fromEntries(Object.entries(electricalKinds).map(([key,value])=>[key,ownMaterial(h,'harness',value.color)]));
 const graphByBox=new Map(architecture.boxes.map(b=>[b.id,b])),actualBoxes=new Map(),portGeometry=new Map(),solarStators=[];
 function poseSolarStators(progress=1,attitude){const pose=mechanismPose(deploymentLayout(h),progress,0,{...attitude,wingPitchDeg:0});for(const s of solarStators){const w=pose.wings[s.instance],axes=w.axes||leafAxes({pitch:w.pitch});s.frame.position.set(...w.root);s.frame.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(V(...axes[0]),V(...axes[1]),V(...axes[2])));}}
 factory.harnesses=harnesses;factory.fabric=group(equipment,'Payload network fabric',{part:'fabric',electricalItemIds:['flight:01.04']});
 // The previous single cube served as both payload fabric and flight CDH.
 // Replace that alias with the three separately allocated equipment packages.
 if(factory.avionics){factory.avionics.removeFromParent();factory.avionics=null;}
 function physicalBox(spec){
  const data={part:spec.payloadTransferRole?'harness':spec.id==='pcdu'?'power':spec.id.startsWith('fabric-')?'fabric':spec.itemId==='flight:01.01'?'compute':spec.itemId==='flight:01.03'?'storage':'avionics',electricalItemIds:[spec.itemId],physicalPartId:spec.itemId,electricalBoxId:spec.id};
  const parent=spec.frame==='payload'?(factory.payloadRack||factory.rack||body):spec.id==='gnss-antenna'?root:spec.id.startsWith('fabric-')?factory.fabric:equipment,g=group(parent,spec.label,data);g.position.set(...spec.positionM);
  const materialSchedule=spec.payloadTransferRole?architecture.installationHardware.find(p=>p.electricalBoxId===spec.id&&p.renderedBy==='electrical-equipment'):null;
  let shell;
  if(materialSchedule){
   // Draw the same six thin walls that the material ledger counts. The
   // enclosure cavity remains real space for its mapped internal transfer.
   for(const piece of materialSchedule.materialPieces){const wall=cuboid(g,piece.dimensionsM,piece.positionM,caseMaterial,spec.label+' · '+piece.id,{...data,installationHardwareId:materialSchedule.id,materialPieceId:piece.id,explicitElectricalPorts:true});shell||=wall;}
  }else{
   shell=cuboid(g,spec.dimensionsM,[0,0,0],spec.id==='gnss-antenna'?roleMaterial(h,'rf-radome'):caseMaterial,spec.label+' enclosure',{...data,explicitElectricalPorts:true});
   for(const sign of [-1,1])cuboid(g,[spec.dimensionsM[0]*.93,.008,spec.dimensionsM[2]*.9],[0,sign*spec.dimensionsM[1]*.48,0],metal,'Enclosure lid seam',{...data,hardwareDetailExclude:true});
  }
  shell.userData.explicitElectricalPorts=true;
  if(spec.id==='avionics')factory.avionics=g;if(spec.id==='pcdu')factory.pcdu=g;
  return {root:g,frame:g,dimensions:spec.dimensionsM,localCenter:[0,0,0],shell};
 }
 function existingBox(spec){
  let host=null,dimensions=spec.dimensionsM,localCenter=[0,0,0];
  if(spec.hostKey==='payloadRack'){
   host=group(spec.frame==='payload'?(factory.payloadRack||body):equipment,spec.label+' electrical datum',{part:'compute',electricalItemIds:[spec.itemId]});host.position.set(...spec.positionM);
   dimensions=spec.dimensionsM;localCenter=[0,0,0];
  }else if(spec.hostKey==='recorder'){
   host=factory.recorder;root.updateWorldMatrix(true,true);host.position.copy(host.parent.worldToLocal(root.localToWorld(V(...spec.positionM))));host.updateWorldMatrix(true,true);dimensions=legacy?[h.bodyWidthM*.512,Math.min(h.bodyHeightM*.145,h.bodyHeightM*.66/factory.shownDrives)*(factory.shownDrives-.20),h.bodyLengthM*.132]:[Math.min(.55,h.bodyWidthM*.3),Math.min(.075,h.bodyHeightM*.30/factory.shownDrives)*(factory.shownDrives-.22),.25];
   const scale=host.getWorldScale(V()),frame=group(host,'Recorder connector datum in physical metres',{part:'storage',electricalItemIds:[spec.itemId]});frame.scale.set(1/scale.x,1/scale.y,1/scale.z);dimensions=dimensions.map((x,i)=>x*scale.getComponent(i));host=frame;
  }
  else if(spec.hostKey==='battery'){
   const candidates=[];body.traverse(o=>{if(o.isMesh&&o.userData.materialRole==='battery-case'&&o.geometry?.type==='BoxGeometry')candidates.push(o);});candidates.sort((a,b)=>(b.scale.x*b.scale.y*b.scale.z)-(a.scale.x*a.scale.y*a.scale.z));
   const point=V(...spec.positionM);host=candidates.sort((a,b)=>a.position.distanceToSquared(point)-b.position.distanceToSquared(point))[0];
   if(host){host.geometry.computeBoundingBox();const bb=host.geometry.boundingBox,worldScale=host.getWorldScale(V());dimensions=bb.getSize(V()).multiply(worldScale).toArray();localCenter=bb.getCenter(V()).multiply(worldScale).toArray();const frame=group(host.parent,spec.label+' connector datum',{part:'battery',electricalItemIds:[spec.itemId]});frame.position.copy(host.position);frame.quaternion.copy(host.quaternion);const parentScale=frame.getWorldScale(V());frame.scale.set(1/parentScale.x,1/parentScale.y,1/parentScale.z);host.userData.explicitElectricalPorts=true;host=frame;}
  }else if(spec.hostKey==='wings'){
   const wing=factory.wings[spec.instance],base=wing?.base||wing?.table;if(base){const stator=group(root,spec.label+' fixed rotary interface',{part:'solar',physicalPartId:spec.itemId,rotaryElectricalInterface:true,routingMotion:spec.deploymentMotion?{kind:'solar-stator',wingId:'solar-'+spec.instance}:{kind:'rigid',frameId:'body',attachment:'body'}});solarStators.push({frame:stator,instance:spec.instance});poseSolarStators();host=group(stator,spec.label+' junction enclosure',{part:'solar',electricalItemIds:[spec.itemId],collectorAccommodation:spec.collectorAccommodation||null});host.position.set(...spec.positionM);dimensions=[.14,.09,.14];cuboid(host,dimensions,[0,0,0],metal,'Solar source stator enclosure',{explicitElectricalPorts:true,part:'solar'});
    if(spec.statorInboardOffsetM){
     root.updateWorldMatrix(true,true);const station=root.worldToLocal(stator.localToWorld(V(0,.095,0))),side=Math.sign(station.x)||1,target=V(...spec.statorBodyPositionM),railX=side*(h.bodyWidthM/2-Math.max(.018,Math.min(h.bodyWidthM,h.bodyHeightM,h.bodyLengthM)*.024)-.045),path=[station,V(railX,station.y,station.z),V(railX,target.y,target.z),target];
     for(let j=1;j<path.length;j++){const a=path[j-1],b=path[j],length=a.distanceTo(b);if(length<1e-7)continue;const casing=mesh(root,new T.CylinderGeometry(.026,.026,length,24),metal,'Stationary insulated collector rail casing',{part:'solar',physicalPartId:spec.itemId,rigidElectricalBusbarHousing:true,fixedCollectorBoxId:spec.id,assemblyContactBasis:'Rigid insulated collector housing terminates inside its own junction enclosure; this does not exempt any routed cable from material collision checks.'});casing.position.copy(a).add(b).multiplyScalar(.5);casing.quaternion.setFromUnitVectors(Y,b.clone().sub(a).normalize());}
     factory.addRoutingFeedthrough({id:'solar-stator-shaft-'+spec.instance,axis:'x',sign:side,positionM:station.toArray(),radiusM:.036,part:'solar',straightM:.13});
    }
    const ring=mesh(stator,new T.TorusGeometry(.115,.012,8,24),metal,'Rotary electrical stator housing',{part:'solar',physicalPartId:spec.itemId});ring.rotation.y=Math.PI/2;
    const channels=2*h.energySystem.electrical.mppt.jointCircuitsPerWing;for(let k=0;k<channels;k++){const x=(k-(channels-1)/2)*appendageDimensions.solarContactAxialPitchM,circuit='P-SA-'+(spec.instance+1)+'/channel-'+(Math.floor(k/2)+1)+'/'+(k%2?'positive':'return'),track=mesh(base,new T.TorusGeometry(.089,appendageDimensions.solarContactTubeRadiusM,6,24),contact,'Rotary collector · '+circuit,{part:'solar',physicalPartId:spec.itemId,rotaryElectricalCircuitId:circuit});track.rotation.y=Math.PI/2;track.position.x=x;cuboid(stator,[.005,.014,.018],[x,.090,0],contact,'Stator contact · '+circuit,{part:'solar',physicalPartId:spec.itemId,rotaryElectricalCircuitId:circuit});}
    stator.userData.interfaceBasis=spec.scope;stator.userData.qualification='Project accommodation; supplier application and life evidence required';
   }
  }else if(spec.hostKey==='patches'){
   const patch=factory.patches[spec.instance];if(patch){const frame=group(patch.parent,spec.label+' RF feed datum',{part:'communications',electricalItemIds:[spec.itemId]});frame.position.copy(patch.position);frame.quaternion.copy(patch.quaternion);const g=patch.geometry;g.computeBoundingBox();dimensions=g.boundingBox.getSize(V()).multiply(patch.scale).toArray();host=frame;}
  }else if(['dish','optic'].includes(spec.hostKey)){
   // A stationary terminal-base junction leaves the pointing gimbal free.
   const terminal=factory.terminalMounts?.find(o=>o.name?.startsWith(spec.hostKey==='dish'?'ka-':'optical-'+spec.instance))||null;host=group(terminal||root,spec.label+' base interface',{part:'communications',electricalItemIds:[spec.itemId]});if(terminal)host.position.y=spec.baseInterfaceInsideBus?-.12:.055;else{host.position.set(...spec.positionM);host.quaternion.setFromUnitVectors(Y,V(...(spec.mountNormal||[0,1,0])));}dimensions=[.18,.10,.18];cuboid(host,dimensions,[0,0,0],metal,'Terminal interface enclosure',{explicitElectricalPorts:true,part:'communications'});
   if(spec.baseInterfaceInsideBus){const center=[...spec.positionM];center[1]=h.bodyHeightM/2;factory.addRoutingFeedthrough({id:spec.id+':stator-device-transfer',axis:'y',sign:1,positionM:center,radiusM:.032,part:'communications',straightM:.17});host.userData.interfaceBasis=spec.scope;}
  }
  if(!host)return physicalBox(spec);
  return {root:host,frame:host,dimensions,localCenter};
 }
 for(const spec of architecture.boxes){const actual=spec.geometry==='existing'?existingBox(spec):physicalBox(spec);boxes.set(spec.id,actual.root);actualBoxes.set(spec.id,actual);actual.root.userData.electricalBoxId=spec.id;if(spec.collectorAccommodation){actual.root.userData.collectorAccommodation=spec.collectorAccommodation;if(spec.deploymentMotion)actual.root.userData.carriedCollectorBoxId=spec.id;else{actual.root.userData.fixedCollectorBoxId=spec.id;actual.root.userData.installedBodyPositionM=[...spec.statorBodyPositionM];}}
  for(const panel of spec.connectorPanels||[]){const p=cuboid(actual.frame,panel.dimensionsM,panel.positionM,metal,spec.label+' · attached connector bank',{part:actual.root.userData.part||'harness',physicalPartId:panel.itemId||spec.itemId,electricalItemIds:[panel.itemId||spec.itemId,spec.itemId],electricalPanelId:panel.id,installationHardwareId:panel.installationHardwareId||null,explicitElectricalPorts:true,hardwareDetailExclude:true});p.userData.connectorPanel=panel;}
 }
 for(const card of architecture.cards){if(card.external)continue;const parent=boxes.get(card.parentBoxId),g=group(parent,card.label,{part:'avionics',physicalPartId:card.itemId,electricalItemIds:[card.itemId,card.parentId],electricalCardId:card.id});g.position.set(...card.positionM);const dims=card.dimensionsM;const board=cuboid(g,[dims[0],.002,dims[2]],[0,0,0],roleMaterial(h,'compute-board'),card.label,{part:'avionics',physicalPartId:card.itemId,electricalItemIds:[card.itemId]});board.userData.cardFunction=card.id;for(let i=0;i<3;i++)cuboid(g,[.035,.009,.035],[(i-1)*.055,.005,0],insulator,'Card package',{part:'avionics',hardwareDetailExclude:true});cuboid(g,[dims[0]*.72,.010,.012],[0,0,-dims[2]/2],contact,'Backplane card connector',{part:'avionics',hardwareDetailExclude:true});cards.set(card.itemId,g);}
 function makeConnector(port){
  const spec=graphByBox.get(port.boxId),actual=actualBoxes.get(port.boxId),type=connectorSelections[port.connectorTypeId],D=type.diameterM,L=type.lengthM;
  const point=port.packing?.panelId?[...port.positionM]:port.positionM.map((x,i)=>actual.localCenter[i]+x/(spec.dimensionsM[i]||1)*actual.dimensions[i]);
  const frame=connectionAnchor(actual.frame,point,port.normal,port.label+' panel datum');frame.userData={part:parts[port.kind]||'avionics',electricalPortId:port.id,physicalPartId:port.connectorItemId,electricalItemIds:[port.connectorItemId,port.itemId]};
  // The modeled receptacle engagement is 16 mm. A 45 mm service withdrawal
  // clears that engagement with working space; the backshell's full length is
  // not a required separation stroke. The cable service loop retains its cut.
  const detail=group(frame,type.label,{...frame.userData,electricalRaw:true}),female=group(detail,'Panel receptacle'),plug=group(detail,'Cable plug and strain relief'),exits=[],matingTravel=.045,single=port.connectorTypeId.startsWith('hv-single');
  const mates=[];for(let instance=0;instance<port.quantity;instance++)for(const polarity of single?[-1,1]:[0]){
   const f=group(female,polarity<0?'Return receptacle':polarity>0?'Positive receptacle':'Keyed receptacle'),p=group(plug,polarity<0?'Return plug':polarity>0?'Positive plug':'Keyed plug');
   // Instance offsets are authored in the equipment frame; transform them
   // into the connector frame before making every physical mating pair.
   const offset=V(...(port.instanceOffsetsM?.[instance]||[0,0,0])).applyQuaternion(frame.quaternion.clone().invert());f.position.copy(offset);p.position.copy(offset);f.position.y+=polarity*D*.62;p.position.y+=polarity*D*.62;
   const rectangular=port.connectorTypeId==='spacewire-a'||port.connectorTypeId.startsWith('mtp-optical')||port.connectorTypeId==='lc-sm-100g-lr4',faceWidth=D,faceHeight=rectangular?D*.45:D;
   cuboid(f,[D,faceHeight,.005],[0,0,.0025],metal,'Panel mounting flange',{hardwareDetailExclude:true});
   if(rectangular){cuboid(f,[faceWidth,faceHeight,.013],[0,0,.010],metal,'Keyed panel shell',{hardwareDetailExclude:true});cuboid(p,[faceWidth*.93,faceHeight*.91,L*.58],[0,0,.014+L*.29],metal,'Keyed cable shell',{hardwareDetailExclude:true});}
   else{cylinder(f,D*.5,.016,.011,metal,'Panel receptacle shell',port.connectorTypeId==='sma-rf'?6:12);cylinder(p,D*.47,L*.58,.018+L*.29,metal,single?'Single-pole shrouded cable plug':'Coupling shell',port.connectorTypeId==='sma-rf'?6:12);}
   const bootStart=.018+L*.58,bootLength=L*.34;cylinder(p,D*.28,bootLength,bootStart+bootLength/2,insulator,'Tapered strain relief',10,D*.16);cylinder(p,D*.31,.005,bootStart,colors[port.kind]||insulator,'Functional identifier band',12);
   const exit=connectionAnchor(p,[0,0,bootStart+bootLength],[0,0,1],port.label+' cable exit');exit.userData.polarity=polarity;exit.userData.circuitInstance=instance;exits.push(exit);mates.push({female:f,male:p,rectangular,polarity,instance});
  }
  detail.traverse(o=>{if(o.isMesh){o.userData.explicitElectricalPorts=true;o.userData.hardwareDetailExclude=true;o.userData.physicalPartId=port.connectorItemId;}});
  const result={port,type,frame,detail,female,plug,exits,mates,matingTravel,fullDetail:false};ports.set(port.id,result);connectors.set('C-'+port.id,result);portGeometry.set(port.id,result);return result;
 }
 for(const port of architecture.ports)makeConnector(port);
 for(const spec of architecture.harnesses){
  const g=group(raw,spec.label,{part:parts[spec.kind]||'harness',electricalRaw:true,electricalItemIds:[spec.itemId,'flight:'+spec.parentWbs],physicalPartId:spec.itemId,electricalHarnessId:spec.id}),from=ports.get(spec.fromPortId),to=ports.get(spec.toPortId),tubes=[];
  const polarities=spec.connectorTypeId.startsWith('hv-single')?2:1,count=spec.quantity*polarities;for(let i=0;i<count;i++){const tube=connectionTube(g,{radius:spec.cableDiameterM/2,material:colors[spec.kind],part:parts[spec.kind]||'harness',segments:384,radialSegments:6,bendRadiusM:spec.bendRadiusM,name:spec.label+' · circuit '+(Math.floor(i/polarities)+1)+(polarities>1?(i%2?' · positive':' · return'):'')});tube.mesh.userData.electricalHarnessId=spec.id;tube.mesh.userData.routingId=spec.id+'/'+i;tubes.push(tube);}
  const cue=group(activity,spec.id+' activity',{electricalHarnessId:spec.id,electricalItemIds:[spec.itemId],engineeringGraphic:true,sceneFlow:true});
  const markerMaterial=new T.MeshBasicMaterial({color:electricalKinds[spec.kind].color,transparent:true,opacity:.94,depthWrite:false});markerMaterial.userData.physicalMaterial=false;
  const markers=[];for(let j=0;j<(spec.kind==='control'?2:spec.kind==='data'?3:1);j++){const m=mesh(cue,new T.SphereGeometry(Math.max(.009,spec.cableDiameterM*.9),6,4),markerMaterial,'Illustrative '+electricalKinds[spec.kind].label+' activity',{engineeringGraphic:true,sceneFlow:true,electricalHarnessId:spec.id,electricalItemIds:[spec.itemId]});markers.push(m);}cue.visible=false;
  routes.set(spec.id,{spec,root:g,from,to,tubes,cue,markers,moving:electricalBoxMoves(graphByBox.get(spec.fromBoxId))||electricalBoxMoves(graphByBox.get(spec.toBoxId))});
 }
 let installedRouting=null;
 function updateRoutes(){
  if(installedRouting){installedRouting.update();return;}
  root.updateMatrixWorld(true);for(const r of routes.values())for(let i=0;i<r.tubes.length;i++){
   const a=r.from.exits[i],b=r.to.exits[i],from=anchorInFrame(a,r.root),to=anchorInFrame(b,r.root),fromNormal=normalInFrame(a,r.root),toNormal=normalInFrame(b,r.root),key=[...from.toArray(),...to.toArray(),...fromNormal.toArray(),...toNormal.toArray()].map(x=>x.toFixed(7)).join('/');if(r.tubes[i].poseKey===key)continue;r.tubes[i].poseKey=key;
   const points=routeElectricalHarness(from.toArray(),to.toArray(),{fromNormal:fromNormal.toArray(),toNormal:toNormal.toArray(),...r.spec.routing,bodyBoundsM:[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM]});r.tubes[i].update(points);
  }
 }
 installedRouting=createInstalledElectricalRouting({factory,h,architecture,routes,ports,cards,actualBoxes,raw,colors,metal,planFluidRoutes});updateRoutes();
 // Grouping by parent retains meaningful pick/menu targets without leaders.
 const sourceGroups=new Map();function register(source,key,moving){const id=key+'|'+moving;if(!sourceGroups.has(id))sourceGroups.set(id,{sources:[],moving,key});sourceGroups.get(id).sources.push(source);}
 for(const r of routes.values()){for(const tube of [...r.tubes,...(r.extraTubes||[])])register(tube.mesh,r.spec.kind+'|'+r.spec.parentWbs,r.moving);r.root.visible=false;}
 for(const c of ports.values()){const spec=graphByBox.get(c.port.boxId),moving=electricalBoxMoves(spec);c.detail.traverse(o=>{if(o.isMesh)register(o,c.port.kind+'|'+(c.port.kind==='data'?'01.04':'07.05'),moving);});c.detail.visible=false;}
 for(const bucket of sourceGroups.values()){const [kind,parentWbs]=bucket.key.split('|'),batch=overviewBatch(overview,bucket.sources,electricalKinds[kind].label+' routed harnesses and terminations',{part:parts[kind],physicalPartId:'flight:'+parentWbs,electricalItemIds:['flight:'+parentWbs],electricalKind:kind});batch.moving=bucket.moving;batches.push(batch);}
 function refresh(dynamicOnly=false){updateRoutes();for(const batch of batches)if(!dynamicOnly||batch.moving)batch.update();}
 const originalPosition=factory.positionPanels;let lastPose='';factory.positionPanels=(progress,attitude)=>{const key=[progress,attitude?.wingPitchDeg,attitude?.upperRadiatorPitchDeg,attitude?.lowerRadiatorPitchDeg,attitude?.upperRadiatorRollDeg,attitude?.lowerRadiatorRollDeg].join('/');originalPosition(progress,attitude);poseSolarStators(progress,attitude);if(key!==lastPose){lastPose=key;refresh(true);}};
 function detailConnector(c){
  if(c.fullDetail)return;c.fullDetail=true;const D=c.type.diameterM,L=c.type.lengthM;
  for(const mate of c.mates){
   const count=c.type.populated||1;for(let i=0;i<count;i++){const angle=i/count*Math.PI*2,r=count<3?D*.20:D*.26;const pin=cylinder(mate.male,Math.max(.00035,Math.min(.003,D*.04)),.009,.011,contact,'Contact '+(i+1),8);pin.position.x=count===1?0:count===2?(i?1:-1)*r:Math.cos(angle)*r;pin.position.y=count===1?0:count===2?0:Math.sin(angle)*r;if(c.port.connectorTypeId==='spacewire-a'){const n=i<2?i:i+1;pin.position.x=((n%5)-2)*D*.16;pin.position.y=(n<5?1:-1)*D*.105;}}
   for(const s of [-1,1]){const bolt=cylinder(mate.female,D*.045,.007,.009,metal,'Panel retention fastener',8);bolt.position.x=s*D*.42;bolt.position.y=(mate.rectangular?.15:.42)*D;}
   for(let i=0;i<6;i++)cylinder(mate.male,D*.475,.0012,.024+i*L*.06,metal,'Coupling grip ring',24);
  }
 }
 const groundLead=group(root,'Removable 3 m EGSE checkout lead',{part:'harness',physicalPartId:'ground:egse-cable',electricalItemIds:['ground:egse-cable'],groundEquipment:true}),groundPortRoots=[],groundTube=connectionTube(groundLead,{radius:.0025,material:colors.control,part:'harness',segments:48,radialSegments:8,bendRadiusM:.05,name:'3 m removable SpaceWire EGSE lead'});
 let groundPoints=[[-.32,0,-.45],[-.32,0,.85],[.32,0,.85],[.32,0,-.45]];for(let i=0;i<4;i++){groundTube.update(groundPoints);const scale=3/groundTube.route.lengthM;groundPoints=groundPoints.map(p=>p.map(x=>x*scale));}groundTube.update(groundPoints);groundLead.userData.cableLengthM=groundTube.route.lengthM;
 const groundSource=ports.get('C-EGSE:from')||[...ports.values()].find(c=>c.port.kind==='control');
 if(groundSource){detailConnector(groundSource);const exit=.018+.92*groundSource.type.lengthM;for(const point of [groundPoints[0],groundPoints.at(-1)]){const c=groundSource.detail.clone(true);c.position.copy(V(...point).add(V(0,0,-exit)));c.quaternion.identity();c.visible=true;c.traverse(o=>{o.userData={...o.userData,physicalPartId:'ground:egse-cable',electricalItemIds:['ground:egse-cable'],electricalPortId:null,groundEquipment:true};});groundLead.add(c);groundPortRoots.push(c);}}
 const groundMarker=mesh(groundLead,new T.SphereGeometry(.008,8,5),new T.MeshBasicMaterial({color:electricalKinds.control.color}),'EGSE continuity stimulus',{engineeringGraphic:true,sceneFlow:true,electricalItemIds:['ground:egse-cable']});groundMarker.material.userData.physicalMaterial=false;groundMarker.visible=false;groundLead.visible=false;
 const activityPriority=r=>['array','primary','egse'].includes(r.spec.groupId)?0:[r.spec.fromBoxId,r.spec.toBoxId].some(id=>id==='recorder'||id==='avionics'||id.startsWith('ka-')||id.startsWith('optical-'))?1:r.spec.kind==='data'&&!r.spec.toBoxId.startsWith('compute-')?2:3;
 const activityRoutes=[...routes.values()].sort((a,b)=>activityPriority(a)-activityPriority(b));
 let selectedItemId=null;
 function selectionFor(itemId){
  selectedItemId=itemId;groundLead.visible=itemId==='ground:egse-cable';for(const r of routes.values())r.root.visible=false;for(const c of ports.values())c.detail.visible=false;
  const selected=[];const connector=architecture.connectorDetails.find(c=>c.itemId===itemId),assembly=architecture.assemblies.find(a=>a.itemId===itemId);
  if(itemId==='ground:egse-cable')selected.push(groundLead);
  else if(connector){const c=ports.get(connector.exemplarPortId);detailConnector(c);c.detail.visible=true;selected.push(c.detail);}
  else if(assembly){const r=routes.get(assembly.exemplarHarnessId);r.root.visible=true;selected.push(r.root);for(const c of [r.from,r.to]){detailConnector(c);c.detail.visible=true;selected.push(c.detail);}}
  else if(cards.has(itemId))selected.push(cards.get(itemId));
  else for(const [id,g] of boxes)if(graphByBox.get(id).itemId===itemId){selected.push(g);for(const c of ports.values())if(c.port.boxId===id){c.detail.visible=true;selected.push(c.detail);}}
  return selected;
 }
 function matingTargets(itemId){
  const connector=architecture.connectorDetails.find(c=>c.itemId===itemId),assembly=architecture.assemblies.find(c=>c.itemId===itemId),portIds=connector?[connector.exemplarPortId]:assembly?[routes.get(assembly.exemplarHarnessId).spec.toPortId]:[...ports.values()].filter(c=>c.port.itemId===itemId).slice(0,1).map(c=>c.port.id);
  return portIds;
 }
 function mating(itemId,progress=1){
  const portIds=matingTargets(itemId),p=clamp(progress),e=p*p*(3-2*p),targets=new Set(portIds);let changed=false;
  for(const definition of architecture.cards){const card=cards.get(definition.itemId);if(card)card.position.z=definition.positionM[2]+(definition.itemId===itemId?Math.max(.06,definition.dimensionsM[2]*1.4)*(1-e):0);}
  for(const [i,g] of groundPortRoots.entries()){const female=g.getObjectByName('Panel receptacle');if(female)female.position.z=itemId==='ground:egse-cable'&&i===1?-.06*(1-e):0;}
  for(const c of ports.values()){const z=targets.has(c.port.id)?c.matingTravel*(1-e):0;if(Math.abs(z-c.plug.position.z)>1e-10){c.plug.position.z=z;changed=true;}}
  if(changed)refresh(false);return cards.has(itemId)||itemId==='ground:egse-cable'||portIds.length>0;
 }
 function matchingRoutes(itemId){const a=architecture.assemblies.find(a=>a.itemId===itemId);if(a)return [routes.get(a.exemplarHarnessId)];const c=architecture.connectorDetails.find(c=>c.itemId===itemId);if(c)return [...routes.values()].filter(r=>r.spec.fromPortId===c.exemplarPortId||r.spec.toPortId===c.exemplarPortId);return [...routes.values()].filter(r=>r.from.port.itemId===itemId||r.to.port.itemId===itemId||itemId==='flight:07.05'||itemId==='flight:01.04'&&r.spec.kind==='data');}
 function rateFor(r,s){
  const a=r.spec,served=Number(s.cdhServedKW||0)>0||Number(s.powerServiceFraction||0)>0;
  if(a.kind==='power'){if(a.groupId==='array')return Number(s.solarKW||0);if(a.groupId==='primary')return Math.abs(Number(s.chargeKW||0))+Math.abs(Number(s.dischargeKW||0));if(a.toBoxId.startsWith('compute-'))return Number(s.itKW||0);if(a.toBoxId.startsWith('fabric-'))return Number(s.aiFabricKW||0);return served?1:0;}
  if(a.kind==='control')return served?Math.max(0,Number(s.hkRateKbps||0)+Number(s.commandGoodputKbps||0)):0;
  if(a.kind==='rf'){if(a.id==='RF-GNSS')return served?1:0;return s.terminalActivity?.some(t=>t.terminal==='S-band'&&(t.services?.housekeeping>0||t.services?.command>0))?1:0;}
  if(a.kind==='data'){
   if(a.toBoxId==='recorder')return Math.max(0,Number(s.aiProductGeneratedMbps||0)+Number(s.aiCheckpointWriteMbps||0)+Number(s.aiInputMbps||0)+Number(s.aiInputReadMbps||0)+Number(s.aiOutputMbps||0));
   if(a.toBoxId.startsWith('optical-')||a.toBoxId.startsWith('ka-')){const terminal=a.toBoxId.startsWith('optical-')?'Optical':'Ka';return s.terminalActivity?.some(t=>t.terminal===terminal&&t.direction==='tx'&&t.services?.payload>0)?Number(s.aiOutputMbps||0):0;}
   return Math.max(0,Number(s.aiProductGeneratedMbps||0)+Number(s.aiCheckpointWriteMbps||0)+Number(s.aiInputReadMbps||0));
  }return 0;
 }
 function update(snapshot={},options={}){
  const {enabled=false,mode='operational',focus=null,itemId=selectedItemId,time=snapshot.t||0,reducedMotion=false}=options,selected=itemId?new Set(matchingRoutes(itemId)):null;
  groundMarker.visible=enabled&&itemId==='ground:egse-cable'&&mode==='checkout';if(groundMarker.visible)groundTube.pointAt(reducedMotion?.5:(Math.max(0,time)*.13)%1,groundMarker.position);
  let active=0;for(const r of activityRoutes){
   const relevant=selected?selected.has(r):focus==='avionics'?r.spec.kind==='control'||r.spec.fromBoxId==='avionics'||r.spec.toBoxId==='avionics':focus==='power'?r.spec.kind==='power':focus==='data'||focus==='purpose'||focus==='compute'?r.spec.kind==='data':false;
   const rate=mode==='checkout'?1:rateFor(r,snapshot);r.cue.visible=enabled&&relevant&&rate>0&&active<20;if(!r.cue.visible)continue;active++;
   const phase=reducedMotion?.5:(Math.max(0,time)*.13+(r.spec.id.length%7)*.11)%1,reverse=mode!=='checkout'&&(r.spec.groupId==='primary'?Number(snapshot.chargeKW||0)>Number(snapshot.dischargeKW||0):r.spec.kind==='data'&&r.spec.toBoxId==='recorder'?Number(snapshot.aiInputReadMbps||0)+Number(snapshot.aiOutputMbps||0)>Number(snapshot.aiProductGeneratedMbps||0)+Number(snapshot.aiCheckpointWriteMbps||0)+Number(snapshot.aiInputMbps||0):r.spec.kind==='data'&&r.spec.toBoxId.startsWith('compute-')?Number(snapshot.aiProductGeneratedMbps||0)+Number(snapshot.aiCheckpointWriteMbps||0)>Number(snapshot.aiInputReadMbps||0):false);
   for(const [i,m] of r.markers.entries()){const offset=r.spec.kind==='control'?i*.025:r.spec.kind==='data'?i*.035:0,t=(phase+offset)%1;r.tubes[0].pointAt(reverse?1-t:t,m.position);m.position.applyMatrix4(r.root.matrix).applyMatrix4(raw.matrix);}
  }return {mode,activeRoutes:active,meaning:mode==='checkout'?'Illustrative continuity and signal rehearsal; no acceptance evidence is generated.':'Activity follows the current modeled power and communications state; marker speed is illustrative.',reducedMotion};
 }
 function articlePorts(itemId){
  if(itemId==='ground:egse-cable')return groundPortRoots.map((c,i)=>({id:'EGSE-'+(i+1),kind:'control',position:c.getWorldPosition(V()),normal:V(0,0,-1),diameterM:groundSource.type.diameterM,typeId:groundSource.port.connectorTypeId}));
  if(cards.has(itemId)){const card=cards.get(itemId),definition=architecture.cards.find(c=>c.itemId===itemId);card.updateWorldMatrix(true,false);return [{id:definition.id+':backplane',kind:'control',position:card.localToWorld(V(0,0,-definition.dimensionsM[2]/2-.006)),normal:V(0,0,-1).applyQuaternion(card.getWorldQuaternion(new T.Quaternion())),diameterM:.012,typeId:'card-backplane'}];}
  const rootsForItem=matchingRoutes(itemId),ids=new Set(),isAssembly=architecture.assemblies.some(a=>a.itemId===itemId)||architecture.connectorDetails.some(c=>c.itemId===itemId);for(const r of rootsForItem)for(const c of [r.from,r.to])if(c.port.itemId===itemId||c.detail.visible)ids.add(c.port.id);if(!ids.size)for(const c of ports.values())if(c.port.itemId===itemId)ids.add(c.port.id);
  return [...ids].slice(0,6).map(id=>{const c=ports.get(id),anchor=isAssembly?c.frame:c.exits[0];return {id,kind:c.port.kind,position:anchor.getWorldPosition(V()),normal:normalInFrame(anchor,root).multiplyScalar(isAssembly?-1:1),diameterM:c.type.diameterM,typeId:c.port.connectorTypeId};});
 }
 function audit(){
  root.updateMatrixWorld(true);const results=[];for(const r of routes.values()){
   const sections=r.physicalSections||r.tubes.map((tube,i)=>({id:r.spec.id+'/'+i,tube,i,from:r.from.exits[i],to:r.to.exits[i]}));
   for(const section of sections){const {tube}=section,end=tube.endpoints,a=anchorInFrame(section.from,r.root),b=anchorInFrame(section.to,r.root);results.push({id:r.spec.id,physicalRouteId:section.id,physicalSection:section.section,polarity:section.i,fromGapM:end[0]?.distanceTo(a)??Infinity,toGapM:end[1]?.distanceTo(b)??Infinity,fromBoxId:r.spec.fromBoxId,toBoxId:r.spec.toBoxId,renderedLengthM:tube.route.lengthM,allocatedCutLengthM:r.spec.cutLengthM,minimumBendRadiusM:tube.route.minimumBendRadiusM,requiredBendRadiusM:r.spec.bendRadiusM,bendLimited:tube.route.bendLimited});}
  }return results;
 }
 function auditPorts(){
  root.updateMatrixWorld(true);return [...ports.values()].map(c=>{
   const spec=graphByBox.get(c.port.boxId),actual=actualBoxes.get(c.port.boxId),panel=(spec.connectorPanels||[]).find(p=>p.id===c.port.packing?.panelId),dimensions=panel?.dimensionsM||actual.dimensions,center=panel?.positionM||actual.localCenter,normal=c.port.normal,axis=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs))),sign=normal[axis],face=center[axis]+sign*dimensions[axis]/2;
   const surfaceErrorM=Math.abs(c.frame.position.getComponent(axis)-face),inverse=actual.frame.matrixWorld.clone().invert(),point=V(),min=V(Infinity,Infinity,Infinity),max=V(-Infinity,-Infinity,-Infinity);
   c.female.traverse(o=>{if(!o.isMesh)return;const pos=o.geometry.attributes.position;for(let i=0;i<pos.count;i++){point.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld).applyMatrix4(inverse);min.min(point);max.max(point);}});
   const tangents=[0,1,2].filter(i=>i!==axis),marginM=Math.min(...tangents.flatMap(i=>[min.getComponent(i)-(center[i]-dimensions[i]/2),center[i]+dimensions[i]/2-max.getComponent(i)]));
   return {id:c.port.id,boxId:c.port.boxId,panelId:panel?.id||null,surfaceErrorM,faceMarginM:marginM,faceBounds:{min:min.toArray(),max:max.toArray()},axis,normal,frameId:actual.frame.uuid};
  });
 }
 factory.electrical={architecture,boxes,ports,extraPorts:installedRouting.inline?.extraPorts||new Map(),matingConnectors:installedRouting.inline?.matingConnectors||[],harnesses:routes,connectors,cards,groundLead,update,mating,canMate:itemId=>cards.has(itemId)||itemId==='ground:egse-cable'||matingTargets(itemId).length>0,selectionFor,articlePorts,audit,auditPorts,refresh,kinds:electricalKinds,overview,activity,routing:installedRouting,activityFor:itemId=>itemId==='ground:egse-cable'?[groundMarker]:architecture.assemblies.some(a=>a.itemId===itemId)?matchingRoutes(itemId).flatMap(r=>r.markers):[]};
 finalizeCraftMaterials(harnesses);return factory;
}
