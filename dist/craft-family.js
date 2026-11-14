import * as T from './vendor/three.module.js';
import {architectureFamily,architectureTerminalStations} from './architecture-families.js';
import {deploymentLayout,mechanismPose,leafPose,leafAxes,terminalLayout} from './deployment.js';
import {thermalMesh} from './thermal-view.js';
import {clusterState} from './attitude-dynamics.js';
import {tagMaterial,engineeringGraphic,planeMaterialUV,cylinderMaterialUV,sphereMaterialUV,finalizeCraftMaterials} from './spacecraft-material-render.js';
import {connectionTube,connectionAnchor,anchorInFrame,normalInFrame} from './connection-geometry.js';
import {inlineArmServiceAllocation} from './inline-arm-routing.js';
import {familyAppendageDimensions as appendageDimensions} from './family-appendage-dimensions.js';
import {installRadiatorFluidTransfer} from './radiator-fluid-transfer.js';
import {declareRotaryFluidChannel,fluidInterfaceAllocationReport} from './fluid-interface-allocation.js';
import {createRoutingWall,addRoutingWallLayer,routingFeedthroughFactory,perforatedPanelGeometry,constantLengthHingeRoute,registerRoutingBox,planStaticFluidConnections,joinedFluidRoutes,fluidPhysicalMeshes,installColdPlateCollection,flightFluidSnapshot,auditFlightFluidSnapshot,bindFluidJunctions,hollowFluidFitting,locateFluidFeedthrough,routingMotionFor} from './flight-fluid-routing.js';
const trayGeometry=new T.BoxGeometry(1,1,1);trayGeometry.userData.shared=true;

// Geometry is read from the same descriptors and poses as the flight analysis.
// Decorative fasteners and seams never contribute area, mass or clearance.
export function makeFamilyCraft(h,kit){
 const {v,solid,box,cyl,ell,pipe,face,join,strokes,labelPlate,materials}=kit;
 const {role,lit,fluidFuel,fluidOxidizer}=materials;
 const frameMat=role('primary-frame'),wallMat=role('enclosure-face-sheet'),coreMat=role('sandwich-core'),mechanismMat=role('deployment-hardware'),blanketMat=role('mli-outer'),whiteBlanketMat=role('mli-white-outer'),solarMat=role('solar-active'),solarBackMat=role('solar-backing'),boomMat=role('solar-boom'),radiatorMat=role('radiator-finish'),radiatorCoreMat=role('radiator-core'),radiatorSheetMat=role('radiator-face-sheet'),tubeMat=role('coolant-tube'),passageMat=role('radiator-passage'),passivePipeMat=role('passive-heat-pipe'),feedMat=role('propellant-feed'),tankMat=role('propellant-tank'),bottleMat=role('pressurant-tank'),electronicsMat=role('electronics-case'),batteryMat=role('battery-case'),trayMat=role('compute-chassis'),boardMat=role('compute-board'),coldMat=role('cold-plate'),gyroMat=role('attitude-hardware'),rodMat=role('magnetic-rod'),harnessMat=role('harness'),reflectorMat=role('rf-reflector'),contactMat=role('rf-contact'),patchMat=role('rf-radome'),opticalHousingMat=role('optical-housing'),opticalGlassMat=role('optical-aperture'),baffleMat=role('sensor-baffle'),nozzleMat=role('nozzle');
 const f=architectureFamily(h),g=deploymentLayout(h),d=h.input,w=h.bodyWidthM,b=h.bodyHeightM,l=h.bodyLengthM,beam=Math.max(.025,Math.min(w,b,l)*.024);
 const inlineServices=f.id==='starcloud-inline'?inlineArmServiceAllocation(h):null,inboardFluid=f.radiatorTracking==='root-cant';
 const root=new T.Group(),skin=new T.Group(),internal=new T.Group(),enclosure=new T.Group(),appendages=new T.Group();root.add(skin,internal,enclosure,appendages);root.name=f.label;root.userData.routingMotion={kind:'rigid',frameId:'body',attachment:'body'};root.userData.fluidComponentChannels=[];root.userData.fluidInterfaceAccounting=h.energySystem.thermal.rotaryFluidAccounting;root.userData.fluidThermalModel=h.energySystem.thermal;
 const service=join(root,0,0,0,'propellant'),gyroPack=join(root,0,0,0,'cmg');service.visible=false;gyroPack.visible=false;
 const routingWalls=[],routingFeedthroughs=[],walls=[],panels=[],wings=[],rads=[],cells=[],engines=[],plumes=[],leds=[],cmgs=[],torquers=[],tankMap={},mechanismAudit={wings:[],banks:[]};
 const poseMatrix=new T.Matrix4(),Y=v(0,1,0),identity=[[1,0,0],[0,1,0],[0,0,1]];
 function orient(o,axes){o.quaternion.setFromRotationMatrix(poseMatrix.makeBasis(v(...axes[0]),v(...axes[1]),v(...axes[2])));}
 function at(o,point){o.position.set(...point);}
 function link(o,a,bb){const delta=v(...bb).sub(v(...a));o.position.copy(v(...a)).add(v(...bb)).multiplyScalar(.5);o.scale.y=delta.length();o.visible=o.scale.y>1e-8;o.userData.routingZeroExtent=!o.visible;if(o.visible)o.quaternion.setFromUnitVectors(Y,delta.normalize());cylinderMaterialUV(o,o.scale.x,o.scale.y);}
 function dynamicLine(parent,r,mat,id){return cyl(parent,0,0,0,r,r,1,mat,id,10);}
 function marker(parent,point=[0,0,0]){const p=new T.Object3D();at(p,point);parent.add(p);return p;}
 const plus=(a,bb,k=1)=>a.map((x,i)=>x+k*bb[i]);
 const shellT=Math.max(.018,Math.min(w,b,l)*.024);
 // Six sandwich walls retain their analytical thickness. Face sheets and
 // blankets are visual layers within the existing allocation; only cut edges
 // expose honeycomb. Their materials are never painted across an intact wall.
 for(const axis of [0,1,2])for(const sign of [-1,1]){
  const dims=[w,b,l],pos=[0,0,0],parent=sign>0?skin:enclosure;pos[axis]=sign*(dims[axis]-shellT)/2;dims[axis]=shellT;
  const descriptor=createRoutingWall(parent,{id:(f.payloadLocation==='radiator'?'Service-only':'Equipment')+' bay '+['X','Y','Z'][axis]+(sign>0?'+':'−')+' sandwich wall',axis,sign,positionM:pos,dimensionsM:dims,material:coreMat}),wall=thermalMesh(descriptor.mesh,'enclosure');routingWalls.push(descriptor);walls.push(wall);
  for(const faceSign of [-1,1]){
   const outer=faceSign===sign,mat=outer?(axis===2?(sign>0?whiteBlanketMat:wallMat):blanketMat):wallMat;
   const surface=thermalMesh(tagMaterial(new T.Mesh(perforatedPanelGeometry(descriptor.widthM,descriptor.heightM,0),mat)),'enclosure');surface.position.copy(wall.position);surface.position.setComponent(axis,surface.position.getComponent(axis)+faceSign*(shellT/2+.0002));surface.quaternion.copy(wall.quaternion);surface.userData.part='structure';parent.add(surface);addRoutingWallLayer(descriptor,surface);
   surface.name=outer?(mat===wallMat?'Exposed aluminum face sheet':mat===whiteBlanketMat?'Allocated white blanket cover':'Allocated aluminized-polyimide blanket'):'Inner aluminum face sheet';
  }
 }
 const addRoutingFeedthrough=routingFeedthroughFactory({root,walls:routingWalls,dimensionsM:[w,b,l],material:wallMat,registry:routingFeedthroughs});
 // Continuous corner rails and transverse frames carry the same envelope used
 // by the enclosure calculation. Flat families retain their flat section.
 for(const x of [-1,1])for(const y of [-1,1])box(root,x*w*.5,y*b*.5,0,beam,beam,l+beam,frameMat,'structure');
 const frameZ=[-l/2,l/2,...new Set(g.mounts.flatMap(m=>m.supports.map(s=>Math.max(-l/2,Math.min(l/2,s.foot[2])))))];
 for(const z of frameZ){for(const x of [-1,1])box(root,x*w/2,0,z,beam,b,beam,frameMat,'structure');for(const y of [-1,1])box(root,0,y*b/2,z,w,beam,beam,frameMat,'structure');}
 const bodyLabel=labelPlate(skin,0,b/2+.006,l*.18,Math.min(w*.70,2.4),Math.min(l*.16,.36),f.id==='redwire-platform'?'SERVICE BUS':f.id==='starcloud-inline'?'INLINE NODE':f.id==='starmind-cross'?'AI1 STUDY':f.id==='heatlift-study'?'HEAT LIFT':'ORBITAL STUDY');
 bodyLabel.name='Engineering realization label';
 // Allocated discrete cradle interfaces replace the legacy circular flange.
 if((h.payloadInterface?.attachmentShape||f.launchInterface==='aft-circular'&&'circular-ring')==='circular-ring'){
  const diameter=h.payloadInterface.ringDiameterM||1.4,ring=new T.Mesh(new T.TorusGeometry(diameter/2-.035,.035,12,64),role('launch-interface'));ring.position.z=h.payloadInterface.deckZ??(-l/2-.02);ring.userData.part='structure';root.add(ring);
 }else for(const point of h.payloadInterface?.lugPositionsBodyM||[-1,1].flatMap(x=>[-1,1].map(y=>[x*w*.4,y*b*.4,-l/2]))){
  const size=h.payloadInterface?.lugSizeM||Math.max(.10,Math.min(.18,beam*3)),thickness=h.payloadInterface?.thicknessM||.04;
  const lug=box(root,point[0],point[1],point[2]-thickness/2,size,size,thickness,role('launch-interface'),'structure');lug.name='Allocated '+f.launchInterface+' hardpoint';
  const pin=cyl(root,point[0],point[1],point[2]-thickness/2,.02,.02,thickness+.025,mechanismMat,'structure',24);pin.rotation.x=Math.PI/2;
 }
 const supportBars=[];
 for(const m of g.mounts)for(const s of m.supports){
  const bar=dynamicLine(root,beam*.28,mechanismMat,'structure');link(bar,s.foot,s.seat);bar.name=s.role==='restraint'?'Allocated telescoping launch restraint':'Appendage root support';const releaseEnd=m.releaseAt??(m.kind==='radiator'?(m.end<0?.46:.69):.04),releaseStart=Math.max(0,releaseEnd-.025),lengthM=v(...s.foot).distanceTo(v(...s.seat)),retractedLengthM=Math.min(.04,lengthM);
  if(s.role==='restraint')bar.userData.routingMotion={kind:'release-restraint',frameId:bar.uuid,attachment:'body',startProgress:releaseStart,endProgress:releaseEnd,strokeM:lengthM-retractedLengthM};
  supportBars.push({bar,role:s.role,foot:s.foot,seat:s.seat,releaseStart,releaseEnd,lengthM,retractedLengthM});
  ell(root,...s.foot,beam*.8,beam*.8,beam*.8,mechanismMat,'structure');
 }
 // Real photovoltaic area is represented once per installed blanket. Cell
 // texture pitch stays approximately constant as a blanket pays out.
 for(const desc of g.descriptors.filter(s=>s.type==='pv')){
  const surface=join(appendages,0,0,0,'solar'),front=face(surface,0,.005,0,1,desc.depth,solarMat,'solar');front.name='Active photovoltaic blanket';
  const back=face(surface,0,-.005,0,1,desc.depth,solarBackMat,'solar');back.rotation.x=Math.PI/2;
  const edges=[-1,1].map(()=>dynamicLine(appendages,.020,boomMat,'solar'));
  const roll=cyl(appendages,0,0,0,1,1,1,solarBackMat,'solar',36),discs=[-1,1].map(()=>cyl(appendages,0,0,0,1,1,.025,mechanismMat,'solar',30));
  const tip=join(appendages,0,0,0,'solar'),tipBar=box(tip,0,0,0,.055,.055,desc.depth+.13,mechanismMat,'solar'),rootPin=marker(appendages),tipPin=marker(appendages),base=join(appendages,0,0,0,'solar');
  box(base,0,0,0,2*appendageDimensions.solarRootAxialHalfM,.10,desc.depth+.16,mechanismMat,'solar');
  const marks=strokes(surface,[[[-.5,.008,-desc.depth/2],[.5,.008,-desc.depth/2]],[[-.5,.008,desc.depth/2],[.5,.008,desc.depth/2]]],0x9b9b7d,'solar');
  for(const o of [surface,roll,...discs,...edges,tip,base])o.userData.routingMotion={kind:'solar',frameId:desc.wingId||('solar:'+desc.side+'/'+desc.end),wingId:desc.wingId,side:desc.side,end:desc.end};
  wings.push({descriptor:desc,side:desc.side,end:desc.end,surface,front,back,booms:edges,roll,discs,tip,tipBar,rootPin,tipPin,base,marks});
  panels.push({surface,descriptor:desc});mechanismAudit.wings.push({root:rootPin,tip:tipPin,mandrel:roll,blanket:front,booms:edges,side:desc.side,end:desc.end});
 }
 const radiatorMeshes=new Map(),radiatorPorts=new Map(),jointLinks=[],fluidConnections=[],thermalPumps=[];
 let payloadPlatformAnchor=null,payloadRack=null;
 for(const desc of g.descriptors.filter(s=>s.type==='rad')){
  const p=join(appendages,0,0,0,'radiator');p.userData.routingMotion={kind:'rigid',frameId:p.uuid,attachment:'radiator-leaf',bankEnd:desc.end,leafIndex:desc.j};p.name=f.payloadLocation==='radiator'?'Local compute / radiator platform':`Radiator ${desc.bankId||desc.end} leaf ${desc.j+1}`;
  const relief=f.id==='redwire-platform'&&desc.j===0?h.payloadPlatform?.rootRelief:null;
  // The hinge housing passes through a real root-edge relief. Its removed
  // area is already excluded by the shared thermal and radiator mass model.
  const wingWidth=relief?(desc.width-relief.widthM)/2:0,panelsHere=relief?[{x:0,z:relief.depthM/2,width:desc.width,depth:desc.depth-relief.depthM},...[-1,1].map(side=>({x:side*(relief.widthM/2+wingWidth/2),z:-desc.depth/2+relief.depthM/2,width:wingWidth,depth:relief.depthM}))]:[{x:0,z:0,width:desc.width,depth:desc.depth}];
  p.userData.rootRelief=relief||null;
  for(const panel of panelsHere){
   box(p,panel.x,0,panel.z,panel.width,desc.thickness,panel.depth,radiatorCoreMat,'radiator');
   for(const side of[-1,1]){const coating=thermalMesh(face(p,panel.x,side*(desc.thickness/2+.001),panel.z,panel.width,panel.depth,radiatorMat,'radiator'),'radiator');if(side<0)coating.rotation.x=Math.PI/2;}
  }
  for(const x of [-1,1])box(p,x*desc.width/2,0,0,.028,desc.thickness+appendageDimensions.radiatorFrameThicknessAdditionM,desc.depth,radiatorSheetMat,'radiator');
  for(const z of [-1,1]){
   const caps=relief&&z<0?[-1,1].map(side=>({x:side*(relief.widthM/2+(wingWidth+.0125)/2),width:wingWidth+.0125})):[{x:0,width:desc.width+.025}];
   for(const cap of caps)box(p,cap.x,0,z*desc.depth/2,cap.width,desc.thickness+appendageDimensions.radiatorFrameThicknessAdditionM,2*appendageDimensions.radiatorTipCapHalfM,radiatorSheetMat,'radiator');
  }
  // Tubes are local to the rigid leaf; only their cross-hinge segments flex.
  if(f.thermalTopology!=='passive-local'){
   const ports={};for(const side of [-1,1]){
    // Edge headers sit outside the panel and its folded neighbour, with
    // finite clearance even when the stack face-to-face gap is only 20 mm.
    // Asymmetric hinge stations keep the two ends distinct when folded flat.
    const x=side*(inboardFluid?desc.width*.18:desc.width/2+(inlineServices?.fluidPortOffsetM??.26)),y=inboardFluid?Math.sign(desc.normalOffset||desc.end)*.070:0,spine=side*(inboardFluid?desc.width*.18-.16:desc.width/2+(inlineServices?.fluidSpineOffsetM??.10)),z0=-desc.depth/2+(inlineServices?.fluidInletSetbackM??.30),z1=desc.depth/2-(inlineServices?.fluidOutletSetbackM??.54);
    for(const [end,z] of [[-1,z0],[1,z1]]){const port=connectionAnchor(p,[x,y,z],[side,0,0],`Coolant ${side<0?'return':'supply'} ${end<0?'inlet':'outlet'}`);ports[side+'/'+end]=port;hollowFluidFitting(port,{material:tubeMat,name:'Open radiator header fitting'});}
    const headerStart=connectionAnchor(p,[x,y,z0],[-side,0,0],'Surface header inlet'),headerEnd=connectionAnchor(p,[x,y,z1],[-side,0,0],'Surface header outlet');headerStart.userData.routingJunctionId=ports[side+'/-1'].uuid;headerEnd.userData.routingJunctionId=ports[side+'/1'].uuid;
    fluidLink(headerStart,headerEnd,{name:`${desc.bankId||desc.end} leaf ${desc.j+1} ${side<0?'return':'supply'} rigid surface header`,parent:p,circuitId:'thermal-'+desc.end,radius:.018,bendRadiusM:.108,via:(a,bb)=>[v(spine,y,a.z),v(spine,y,bb.z)]});
    if(inboardFluid)for(const t of [.30,.70]){const z=z0+(z1-z0)*t,clamp=connectionAnchor(p,[spine,y,z],[0,0,1],'Inboard reverse-face header saddle');hollowFluidFitting(clamp,{outerRadiusM:.026,boreRadiusM:.021,lengthM:.022,material:tubeMat,name:'Open coolant saddle'});box(p,spine,Math.sign(y)*(desc.thickness/2+.0045),z,.022,.009,.026,mechanismMat,'radiator').name='Radiator header saddle support';}
   }radiatorPorts.set(desc,ports);
  }
  if(f.payloadLocation==='radiator'){
   const spread=h.payloadPlatform||h.architectureDefinition?.payloadPlatform||{spreaderWidthM:1,spreaderDepthM:1};
   thermalMesh(box(p,0,desc.thickness/2+.025,0,spread.spreaderWidthM,.05,spread.spreaderDepthM,coldMat,'compute'),'coldPlate').name='Local 1 m thermal spreader';
   // Radial embedded heat-pipe paths are shown on the panel's reverse face.
   for(let i=0;i<16;i++){
    const angle=i*Math.PI/8,x=Math.cos(angle),z=Math.sin(angle),outerScale=Math.min(desc.width*.46/Math.max(.001,Math.abs(x)),desc.depth*.46/Math.max(.001,Math.abs(z))),scale=relief&&z<0&&Math.abs(x*outerScale)<relief.widthM/2+.015?Math.min(outerScale,(desc.depth/2-relief.depthM-.015)/(-z)):outerScale,y=-desc.thickness/2-.020,a=v(.42*x,y,.42*z),b=v(x*scale,y,z*scale),direction=b.clone().sub(a).normalize(),from=connectionAnchor(p,a.toArray(),direction.toArray(),'Sealed heat-pipe evaporator end'),to=connectionAnchor(p,b.toArray(),direction.clone().negate().toArray(),'Sealed heat-pipe condenser end');
    fluidLink(from,to,{parent:p,radius:.012,bendRadiusM:0,name:'Sealed passive heat pipe '+(i+1),fluidKind:'sealed-heat-pipe',tubeMaterial:passivePipeMat,via:()=>[]});
    for(const t of [.25,.75]){const q=a.clone().lerp(b,t),clamp=connectionAnchor(p,q.toArray(),direction.toArray(),'Heat-pipe saddle');hollowFluidFitting(clamp,{outerRadiusM:.018,boreRadiusM:.013,lengthM:.020,material:passivePipeMat,name:'Open heat-pipe saddle'});box(p,q.x,-desc.thickness/2-.001,q.z,.020,.002,.020,passivePipeMat,'radiator').name='Heat-pipe thermal saddle pad';}
   }
   payloadRack=join(p,0,.06,0,'compute');payloadPlatformAnchor=marker(p,[0,.14,0]);
  }
  radiatorMeshes.set(desc,p);panels.push({surface:p,descriptor:desc});
 }
 const initial=mechanismPose(g,0,d.solarTiltDeg||0);
 for(const bank of initial.banks){
  const rootPin=marker(appendages,bank.root),rootSocket=marker(appendages,bank.root),elbowPin=marker(appendages,bank.elbow),elbowSocket=marker(appendages,bank.elbow),tip=marker(appendages,bank.tip),foldJoints=[];
  const frames=g.descriptors.filter(s=>s.type==='rad'&&s.end===bank.end).map(s=>radiatorMeshes.get(s));
  for(let j=1;j<frames.length;j++){const pin=marker(appendages),socket=marker(appendages),bar=dynamicLine(appendages,.026,mechanismMat,'radiator');bar.userData.routingMotion={kind:'rigid',frameId:frames[j-1].uuid,attachment:'radiator-leaf',bankEnd:bank.end,leafIndex:j-1};foldJoints.push({pin,socket});jointLinks.push({end:bank.end,j,pin,socket,bar});}
  rads.push({end:bank.end,rootPin,rootSocket,elbowPin,elbowSocket,tip,frames,pitchFrame:frames[0],bank:frames[0],knuckle:frames[1]||frames[0],clips:[]});
  mechanismAudit.banks.push({end:bank.end,rootPin,rootSocket,elbowPin,elbowSocket,foldJoints,tip,hoses:[]});
 }
 // Payload trays use the resolved accommodation. For Redwire they are children
 // of the moving radiator, rather than a second computer hidden in the bus.
 const cabinet=h.rackLayout,slots=cabinet.slots,dimensions=cabinet.slotDimensionsM,rack=payloadRack||join(internal,0,0,0,'compute');
 const trayRows=slots;
 const [tw,th,td]=dimensions;
 function trayBatch(selected,offset,dims,material){
  const position=[],normal=[],uv=[],indices=[],source=trayGeometry.attributes.position,normals=trayGeometry.attributes.normal,baseUV=trayGeometry.attributes.uv;
  const [u,v]=material.userData.textureTileM||[1,1],sizes=[[dims[2],dims[1]],[dims[2],dims[1]],[dims[0],dims[2]],[dims[0],dims[2]],[dims[0],dims[1]],[dims[0],dims[1]]];
  for(const s of selected){const start=position.length/3;for(const i of trayGeometry.index.array)indices.push(start+i);for(let i=0;i<source.count;i++){position.push(s.x+offset[0]+source.getX(i)*dims[0],s.y+offset[1]+source.getY(i)*dims[1],s.z+offset[2]+source.getZ(i)*dims[2]);normal.push(normals.getX(i),normals.getY(i),normals.getZ(i));const size=sizes[Math.floor(i/4)];uv.push(baseUV.getX(i)*size[0]/u,baseUV.getY(i)*size[1]/v);}}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normal,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const mesh=tagMaterial(new T.Mesh(geometry,material));mesh.userData.part='compute';rack.add(mesh);return mesh;
 }
 trayBatch(slots,[0,-th*.12,0],[tw,th*.64,td],trayMat).userData.installedTrayRow=true;
 thermalMesh(trayBatch(slots,[0,th*.24,0],[tw*.94,th*.10,td*.92],coldMat),'coldPlate');
 thermalMesh(trayBatch(slots,[0,th*.36,0],[tw*.72,th*.18,td*.70],boardMat),'junction').userData.dataSource=true;
 for(let n=0;n<8;n++){const selected=slots.filter((_,i)=>i%8===n);if(selected.length)leds.push(trayBatch(selected,[tw*.40,th*.20,-td*.46],[Math.min(.025,tw*.06),th*.15,.015],lit));}
 if(!payloadRack){
  const railX=Math.max(...slots.map(s=>Math.abs(s.x)))+dimensions[0]/2,railY=Math.max(...slots.map(s=>Math.abs(s.y)))+dimensions[1]/2,lo=Math.min(...slots.map(s=>s.z))-dimensions[2]/2,hi=Math.max(...slots.map(s=>s.z))+dimensions[2]/2;
  for(const x of [-1,1])for(const y of [-1,1])box(rack,x*railX,y*railY,(lo+hi)/2,.035,.035,hi-lo,frameMat,'structure');
 }
 const p=h.propulsion,station=(key,fallback)=>Array.isArray(p.stations?.[key]?.[0])?p.stations[key][0]:p.stations?.[key]||fallback;
 const shelf=box(root,0,0,p.forwardDeckZ,w*.94,b*.94,.017,frameMat,'structure');const shelfRouting=registerRoutingBox(shelf,'z',1,'equipment-bulkhead');shelfRouting.internal=true;routingWalls.push(shelfRouting);
 for(const point of p.stations['02.02']||[]){thermalMesh(box(internal,...point,w*.185,b*.30,Math.max(.15,l*.06),batteryMat,'battery'),'battery');box(internal,point[0],point[1]+b*.16,point[2],w*.18,.025,Math.max(.15,l*.06),batteryMat,'battery');}
 const recorder=join(internal,...station('storage',[w*.1,0,-l*.2]),'storage'),avionics=join(internal,...station('switch',[-w*.3,0,0]),'avionics');
 const driveCount=Math.max(1,Math.ceil(h.storageTB/d.diskModuleTB)),shownDrives=Math.min(12,driveCount),driveH=Math.min(.075,b*.30/shownDrives);
 for(let i=0;i<shownDrives;i++){box(recorder,0,(i-(shownDrives-1)/2)*driveH,0,Math.min(.55,w*.3),driveH*.78,.25,electronicsMat,'storage');box(recorder,0,(i-(shownDrives-1)/2)*driveH,-.13,Math.min(.55,w*.3),driveH*.65,.018,electronicsMat,'storage');}
 box(avionics,0,0,0,Math.min(.5,w*.2),Math.min(.4,b*.22),Math.min(.5,l*.16),electronicsMat,'avionics');
 for(const j of [-1,0,1])box(avionics,0,j*.065,-Math.min(.26,l*.085),Math.min(.45,w*.18),.032,.025,frameMat,'avionics');
 // Thermal equipment follows topology, with distinct loop stations or a hot /
 // cold heat-lift package. No pump package is drawn on the passive payload path.
 if(f.thermalTopology!=='passive-local'){
  const loops=f.thermalTopology==='redundant-pumped'?2:1;
  for(let i=0;i<loops;i++){
   // The heat-lift battery bank occupies the forward service bay. Place its
   // existing pump beside the rack end, so the real supply manifold and its
   // upward pipe departure clear every rear-facing battery plug and stroke.
   // The rack and pump are laterally separated; no coolant fitting is moved
   // independently of its physical pump/manifold assembly.
   const rackForwardZM=Math.max(...slots.map(s=>s.z))+td/2,pumpForwardOffsetM=f.thermalTopology==='heat-lift'?.10:.48;
   const pump=join(internal,(loops>1?(i?1:-1):-1)*w*.40,-b*.26,rackForwardZM+pumpForwardOffsetM,'radiator');pump.name=loops>1?'Isolatable thermal loop '+(i+1):'Allocated coolant pump station';
   pump.userData.routingAccommodation={rackForwardZM,pumpForwardOffsetM,basis:f.thermalTopology==='heat-lift'?'Pump and both distribution manifolds occupy the existing side aisle beside the rack end, aft of the complete battery connector withdrawal and approach allocation. Actual hardware, all attached pipe routes and as-routed lengths remain in the common installation audit.':'Allocated forward service-bay pump station.'};
   box(pump,0,0,0,.32,.15,.38,tubeMat,'radiator');for(const z of [-1,1])cyl(pump,0,.09,z*.10,.052,.052,.17,tubeMat,'radiator',24);
   thermalPumps.push({root:pump,positionM:pump.position.toArray(),supply:connectionAnchor(pump,[0,.175,.10],[0,1,0],'Pump supply fitting'),return:connectionAnchor(pump,[0,.175,-.10],[0,1,0],'Pump return fitting')});
  }
  if(f.thermalTopology==='heat-lift'){
   const lift=join(internal,w*.24,0,l*.16,'radiator');lift.name='Analytical heat-lift package · allocated geometry';
   box(lift,0,0,0,.55,.40,.60,role('heat-pump-case'),'radiator');box(lift,-.30,0,0,.05,.36,.56,role('heat-pump-case'),'radiator');box(lift,.30,0,0,.05,.36,.56,role('heat-pump-case'),'radiator');
  }
 }
 const coolantCollection=f.thermalTopology==='passive-local'?null:installColdPlateCollection({h,root,rack,pumps:thermalPumps,link:fluidLink,kit:{box,cyl,join,v,material:tubeMat}});
 // Retained allocated propulsion is identical in capability, while placement
 // and tank accommodation come from the family's resolved body geometry.
 for(const t of p.tanks){
  const group=join(service,t.x,t.y,t.z,'propellant'),liquid=t.id!=='helium',r=t.radiusM,shell=ell(group,0,0,0,r,r,r,liquid?tankMat:bottleMat,'propellant');tankMap[t.id]=group;
  if(liquid){const section=new T.Mesh(new T.SphereGeometry(r,36,20,Math.PI*1.5,Math.PI),tankMat);group.add(section);section.visible=false;section.userData.part='propellant';section.userData.routingNonPhysical=true;const fluid=ell(group,0,0,0,r,r,r,t.id==='fuel'?fluidFuel:fluidOxidizer,'propellant');fluid.visible=false;cells.push({id:t.id,fluid,tank:shell,section,volumeL:t.volumeL,fluidRadiusM:Math.cbrt(.001*t.volumeL*3/(4*Math.PI))});}
  for(const z of [-.38,.38]){const ring=new T.Mesh(new T.TorusGeometry(r*Math.sqrt(1-z*z),Math.min(.014,r*.024),10,40),frameMat);ring.position.z=z*r;group.add(ring);}
  box(group,0,0,-r*.88,r*1.3,r*.68,.04,frameMat,'propellant');
 }
 const regulator=box(service,...station('06.02',[0,0,-l*.35]),.14,.12,.18,feedMat,'propulsion');regulator.name='Allocated pressure regulator';
 for(const e of p.engines){
  const engine=join(root,e.x,e.y,e.z,'propulsion'),r=e.exitRadiusM,len=e.throatZ-e.z;engine.rotation.x=Math.PI/2;engines.push(engine);
  const profile=[[r,0],[r*.98,0],[r*.60,len*.48],[r*.24,len],[r*.28,len],[r*.65,len*.48],[r,0]].reverse().map(([x,y])=>new T.Vector2(x,y));
  const nozzle=new T.Mesh(new T.LatheGeometry(profile,40),nozzleMat);nozzle.userData.part='propulsion';engine.add(nozzle);cyl(engine,0,len+(shellT+.062)/2,0,r*.34,r*.28,shellT+.082,feedMat,'propulsion',24);
  addRoutingFeedthrough({id:'injector-deck-'+engines.length,axis:'z',sign:-1,positionM:[e.x,e.y,-l/2],radiusM:r*.40+.012,part:'propulsion',straightM:.04});
  const flare=Math.min(w*.8,r*9),plume=cyl(engine,0,-flare/2,0,r,r+flare*Math.tan(p.plumeHalfAngleDeg*Math.PI/180),flare,new T.MeshBasicMaterial({color:0x82cfff,transparent:true,opacity:.26,side:T.FrontSide,depthWrite:false}),'propulsion',30,true);engineeringGraphic(plume,'Illustrative exhaust plume');plume.visible=false;plumes.push(plume);
 }
 // Every fluid centreline terminates in a fitting on a physical article.
 // A hose may flex across a deployment hinge; its local port remains fixed to
 // that rigid leaf, tank or injector instead of a guessed world coordinate.
 function fluidLink(a,bb,{part='radiator',radius=.018,name='Coolant interconnect',parent=appendages,via=null,bendRadiusM=part==='propulsion'?Math.max(.03,radius*4):Math.max(.07,radius*6),restLengthM=null,flexOutward=null,circuitId=null,tubeMaterial=null,fluidKind=null,motionModel=null}={}){
  const tube=connectionTube(parent,{radius,material:tubeMaterial||(part==='radiator'?tubeMat:feedMat),part,name,bendRadiusM,segments:80,radialSegments:8});
  tube.mesh.userData.fluidConnectionId=name;tube.mesh.userData.routingLine=true;
  if(part==='radiator')thermalMesh(tube.mesh,'coolant');fluidConnections.push({id:name,a,b:bb,tube,parent,via,part,name,radiusM:radius,bendRadiusM,restLengthM,flexOutward,circuitId,fluidKind,motionModel});return tube;
 }
 for(const [pumpIndex,pump] of thermalPumps.entries()){
  const count=initial.banks.filter((_,i)=>i%thermalPumps.length===pumpIndex).length;pump.branches={};for(const side of [-1,1]){
   box(pump.root,0,.20,side*.10,.12*count,.05,.08,tubeMat,'radiator').name='Supported coolant distribution manifold';
   for(let branch=0;branch<count;branch++){const x=(branch-(count-1)/2)*.12,port=connectionAnchor(pump.root,[x,.225,side*.10],[0,1,0],'Coolant distribution '+side+'/'+branch);port.userData.routingOwnerId=pump.root.uuid;pump.branches[side+'/'+branch]=port;}
  }
 }
 for(const [bankIndex,bank] of initial.banks.entries())if(f.thermalTopology!=='passive-local'){
  const descriptors=g.descriptors.filter(s=>s.type==='rad'&&s.end===bank.end).sort((a,bb)=>a.j-bb.j),pump=thermalPumps[bankIndex%thermalPumps.length],firstDesc=descriptors[0],firstFrame=radiatorMeshes.get(firstDesc),bankSpec=g.banks?.find(b=>b.end===bank.end),inline=bankSpec?.kind==='inline',multiAxis=inline||f.radiatorTracking==='root-cant',rootAxes=bank.panelAxes?.[0]||leafAxes({pitch:bank.rootPitch,roll:bank.roll}),hingeLocalZ=-(g.custom?firstDesc.depth:g.r)/2,hingeNormalOffset=g.custom?(firstDesc.normalOffset||0):bank.end*g.hingeStand,fixedFeedZSign=bankSpec?.kind==='rack'?bankSpec.side:1;
  for(const side of [-1,1]){
   const transverse=rootAxes[0],jointDistance=Math.max(firstDesc.width/2+.45,w/2+.45),jointCenter=multiAxis?[...bank.root]:bank.root.map((x,i)=>x+transverse[i]*side*jointDistance),axis=inboardFluid?1:0,sign=inboardFluid?Math.sign(bank.root[1]):inline?(Math.sign(jointCenter[0])||1):side,normal=inboardFluid?[0,sign,0]:[sign,0,0],first=radiatorPorts.get(firstDesc)[side+'/-1'],source=pump.branches[side+'/'+Math.floor(bankIndex/thermalPumps.length)],station=inboardFluid?[side*.20,sign*b/2,Math.max(-l*.40,Math.min(l*.40,bank.root[2]-fixedFeedZSign*1.10))]:[sign*w/2,inline?-(.34+side*.06):Math.max(-b*.36,Math.min(b*.36,jointCenter[1])),inline?Math.max(-l*.40,Math.min(l*.40,bank.root[2]-.30)):Math.max(-l*.36,Math.min(l*.36,jointCenter[2]))],pipeLabel=`Loop ${bankIndex+1} ${side>0?'supply':'return'}`,circuitId='thermal-'+bank.end;
   const swivel=join(appendages,...jointCenter,'radiator');swivel.name=pipeLabel+(multiAxis?' allocated two-axis coolant swivel':' allocated hinge-axis rotary coolant union');const union=ell(swivel,0,0,0,.115,.115,.115,mechanismMat,'radiator');union.userData.routingInterface=true;union.userData.qualification='Project accommodation; pressure, leakage, torque and life qualification remain open.';
   if(!multiAxis){const support=dynamicLine(appendages,.026,mechanismMat,'radiator');link(support,bank.root,jointCenter);support.name='Extended coolant hinge bearing support';}
   if(Math.abs(station[2]-p.forwardDeckZ)<.20)station[2]=p.forwardDeckZ+.24;
   const locatedStation=locateFluidFeedthrough(root,{axis,sign,positionM:station,dimensionsM:[w,b,l],ignoreRoot:appendages});station.splice(0,3,...locatedStation);const port=addRoutingFeedthrough({id:`coolant-${bankIndex+1}-${side>0?'supply':'return'}`,axis,sign,positionM:station,radiusM:.034,part:'radiator',straightM:inline?.02:.06}),sourceZ=source.getWorldPosition(v(0,0,0)).z;
   if(sourceZ>p.forwardDeckZ&&port.inner.position.z<p.forwardDeckZ){
    const bulk=addRoutingFeedthrough({id:pipeLabel+' equipment bulkhead',axis:'z',sign:-1,panelId:'equipment-bulkhead',positionM:[side*.15,-b*.32,p.forwardDeckZ],radiusM:.034,part:'radiator',straightM:.06});
    fluidLink(source,bulk.inner,{name:pipeLabel+' forward supported internal pipe',circuitId,parent:root,via:(a,bb)=>{const z=a.z+.36,y=bb.y;return [a.clone().add(v(0,.26,0)),v(a.x,a.y+.26,z),v(a.x,y,z),v(bb.x,y,z),v(bb.x,y,bb.z+.30)];}});
    fluidLink(bulk.boreIn,bulk.boreOut,{name:pipeLabel+' equipment bulkhead passage',circuitId,parent:root,bendRadiusM:0,via:()=>[]});
    fluidLink(bulk.outer,port.inner,{name:pipeLabel+' aft supported internal pipe',circuitId,parent:root,via:(a,bb)=>{const x=bb.x-sign*.26;return [v(a.x,a.y,bb.z),v(x,a.y,bb.z),v(x,bb.y,bb.z)];}});
   }else fluidLink(source,port.inner,{name:pipeLabel+' supported internal pipe',circuitId,parent:root,via:(a,bb)=>{const pa=a.clone().add(v(0,.26,0)),pb=bb.clone().addScaledVector(v(...normal),-.26);return [pa,v(pa.x,pa.y,pb.z),v(pb.x,pa.y,pb.z),pb];}});
   fluidLink(port.boreIn,port.boreOut,{name:pipeLabel+' bulkhead passage',circuitId,parent:root,bendRadiusM:0,via:()=>[]});
   const inletPoint=inline?[bank.root[0]-sign*.11,-(.34+side*.06),bank.root[2]-.30]:multiAxis?[bank.root[0]+side*.20,bank.root[1],bank.root[2]+fixedFeedZSign*(bankSpec?.kind==='rack'?.20:-1.10)]:[jointCenter[0],jointCenter[1]-Math.sign(jointCenter[1])*.13,jointCenter[2]],inletNormal=inline?[-sign,0,0]:multiAxis?[0,-Math.sign(bank.root[1]),0]:[0,-Math.sign(jointCenter[1]),0],inlet=connectionAnchor(appendages,inletPoint,inletNormal,pipeLabel+' fixed union inlet');inlet.userData.routingOwnerId=swivel.uuid;hollowFluidFitting(inlet,{lengthM:.04,material:tubeMat,name:'Open rotary union inlet fitting'});inlet.userData.routingOwnerIds=[swivel.uuid,inlet.uuid];
   if(multiAxis){const neck=dynamicLine(swivel,.025,mechanismMat,'radiator');link(neck,[0,0,0],inletPoint.map((x,i)=>x-bank.root[i]-inletNormal[i]*.04));neck.name='Fixed two-axis union inlet neck';}
   fluidLink(port.outer,inlet,{name:pipeLabel+' fixed union feed',circuitId,parent:root,bendRadiusM:.108,via:(a,bb)=>{if(inline)return [a.clone().add(v(sign*.15,0,0)),bb.clone().add(v(-sign*.15,0,0))];if(multiAxis){const y=(a.y+bb.y)/2;return [v(a.x,y,a.z),v(bb.x,y,bb.z)];}return [a.clone().add(v(sign*.18,0,0)),v(bb.x,a.y,bb.z)];}});
   const rotor=join(firstFrame,0,0,0,'radiator'),local=multiAxis?[side*.17,inline?appendageDimensions.inlineRootFluidOutletYM:Math.sign(bank.root[1])*.34,hingeLocalZ-(inline?.08:.40)]:[side*(jointDistance+.15),-hingeNormalOffset,hingeLocalZ];
   if(multiAxis){box(rotor,side*.08,local[1],local[2]+.025,.18,2*appendageDimensions.inlineRootFluidManifoldHalfYM,.08,mechanismMat,'radiator').name='Moving two-axis coolant outlet manifold';const neck=dynamicLine(rotor,.030,mechanismMat,'radiator');link(neck,[0,-hingeNormalOffset,hingeLocalZ],[side*.08,local[1],local[2]+.025]);neck.name='Moving two-axis union outlet neck';}
   else{const bearing=connectionAnchor(rotor,local,[side,0,0],'Rotary outlet bearing');hollowFluidFitting(bearing,{outerRadiusM:.060,boreRadiusM:.025,lengthM:.15,material:mechanismMat,name:'Open rotating coolant bearing'});}
   const outlet=connectionAnchor(rotor,local,[side,0,0],pipeLabel+' moving union outlet');hollowFluidFitting(outlet,{lengthM:.030,material:tubeMat,name:'Open rotating union outlet fitting'});outlet.userData.routingOwnerId=rotor.uuid;declareRotaryFluidChannel(root,{componentId:swivel.uuid,name:pipeLabel+' root transfer',portIds:[inlet.uuid,outlet.uuid],axes:multiAxis?2:1,bankEnd:bank.end,hingeIndex:0,basis:multiAxis?'Allocated two-axis internal rotary fluid passage; both external conduits terminate on their own fixed and rotating physical fittings.':'Allocated coaxial rotary fluid passage.'});
   fluidLink(outlet,first,{name:pipeLabel+' articulated union outlet',circuitId,parent:firstFrame,via:(a,bb)=>{const x=side*(Math.max(Math.abs(a.x),Math.abs(bb.x))+.40);return inboardFluid?[v(x,a.y,a.z),v(x,a.y,Math.min(a.z,bb.z)-.45),v(x,bb.y,Math.min(a.z,bb.z)-.45),v(x,bb.y,bb.z)]:[v(x,a.y,a.z),v(x,bb.y,bb.z)];}});
   for(let i=1;i<descriptors.length;i++){
    const previous=descriptors[i-1],current=descriptors[i],a=radiatorPorts.get(previous)[side+'/1'],bb=radiatorPorts.get(current)[side+'/-1'];
    if(inboardFluid){
     const previousFrame=radiatorMeshes.get(previous),currentFrame=radiatorMeshes.get(current),transfer=installRadiatorFluidTransfer({root,layout:g,previous,current,previousFrame,currentFrame,side,name:pipeLabel+` leaf ${i} rotary transfer`,kit:{join,cyl,v,material:mechanismMat,tubeMaterial:tubeMat}});
     fluidLink(a,transfer.fixed,{name:pipeLabel+` leaf ${i} fixed rotary feeder`,circuitId,parent:previousFrame,via:(a,b)=>{const x=side*(Math.max(Math.abs(a.x),Math.abs(b.x))+.38);return[v(x,a.y,a.z),v(x,b.y,b.z)];}});
     fluidLink(transfer.moving,bb,{name:pipeLabel+` leaf ${i} rotating rotary feeder`,circuitId,parent:currentFrame,via:(a,b)=>{const x=side*(Math.max(Math.abs(a.x),Math.abs(b.x))+.50);return[v(x,a.y,a.z),v(x,b.y,b.z)];}});
    }else{
     const outward=()=>normalInFrame(a,appendages),restLengthM=2*(firstDesc.width*.20+.36)+.84+(inline?1.2:0);
     fluidLink(a,bb,{name:pipeLabel+` leaf ${i} hinge hose`,circuitId,restLengthM,flexOutward:outward,motionModel:{kind:'constant-length-u',physicalLengthBasis:'perpendicular-two-quarter-fillets',arcSteps:8,frameId:null,fromFrameId:routingMotionFor(a).frameId,toFrameId:routingMotionFor(bb).frameId,bankEnd:bank.end,leafIndex:i,minimumChordM:.27,maximumChordM:inline?inlineServices.fluidInletSetbackM+inlineServices.fluidOutletSetbackM+.22:.94,axisAttachment:'radiator-transverse'}});
    }
   }
  }
  const lastDesc=descriptors.at(-1),last=radiatorPorts.get(lastDesc);fluidLink(last['1/1'],last['-1/1'],{name:`Loop ${bankIndex+1} radiator return manifold`,circuitId:'thermal-'+bank.end,parent:radiatorMeshes.get(lastDesc),via:(a,bb)=>{const z=lastDesc.depth/2+.25;return [a.clone().add(v(.26,0,0)),v(a.x+.26,a.y,z),v(bb.x-.26,bb.y,z),bb.clone().add(v(-.26,0,0))];}});
 }
 const fluidFitting=(parent,point,normal,name,radius=.022)=>{const port=connectionAnchor(parent,point,normal,name);hollowFluidFitting(port,{outerRadiusM:radius,boreRadiusM:radius*.90,lengthM:.024,material:feedMat,part:'propulsion',name:name+' open fitting'});port.userData.routingOwnerId=parent.uuid;return port;};
 const regulatorIn=fluidFitting(service,[regulator.position.x,regulator.position.y-.06,regulator.position.z],[0,-1,0],'Regulator inlet');
 regulatorIn.userData.routingOwnerIds=[regulator.uuid,regulatorIn.uuid];
 const pressurant=p.tanks.find(t=>t.id==='helium'),aftRail=-l/2+shellT+.028;
 if(pressurant)fluidLink(fluidFitting(tankMap.helium,[0,0,-pressurant.radiusM],[0,0,-1],'Pressurant outlet',.014),regulatorIn,{part:'propulsion',radius:.008,parent:service,name:'Pressurant regulator line',via:(a,bb)=>{const y=-b*.36;return [v(a.x,a.y,aftRail),v(a.x,y,aftRail),v(bb.x,y,aftRail),v(bb.x,y,bb.z)];}});
 for(const [tankIndex,tank] of p.tanks.filter(t=>t.id!=='helium').entries()){
  const side=tankIndex?1:-1,frame=tankMap[tank.id],outlet=fluidFitting(frame,[0,-tank.radiusM,0],[0,-1,0],tank.id+' outlet',.018),press=fluidFitting(frame,[0,tank.radiusM,0],[0,1,0],tank.id+' pressurization inlet',.014),regulatorOut=fluidFitting(service,[regulator.position.x+side*.07,regulator.position.y,regulator.position.z],[side,0,0],tank.id+' regulated outlet',.014);
  regulatorOut.userData.routingOwnerIds=[regulator.uuid,regulatorOut.uuid];
  fluidLink(regulatorOut,press,{part:'propulsion',radius:.008,parent:service,name:tank.id+' regulated pressurization',via:(a,bb)=>{const x=side*w*.40,y=bb.y+.18;return [v(x,a.y,a.z),v(x,y,a.z),v(x,y,bb.z),v(bb.x,y,bb.z)];}});
  const manifold=join(service,side*w*.30,-b*.39,-l/2+.32,'propulsion');box(manifold,0,0,0,.13,.08,.09,feedMat,'propulsion');const inlet=fluidFitting(manifold,[0,.04,0],[0,1,0],tank.id+' manifold inlet',.018);
  fluidLink(outlet,inlet,{part:'propulsion',radius:.012,parent:service,name:tank.id+' feed trunk',via:(a,bb)=>{const y=Math.min(a.y-.12,bb.y+.12);return [v(a.x,y,a.z),v(bb.x,y,a.z),v(bb.x,y,bb.z)];}});
  p.engines.forEach((e,i)=>{const branch=fluidFitting(manifold,[(i-(p.engines.length-1)/2)*.038,0,-.045],[0,0,-1],tank.id+' manifold branch '+(i+1),.016),engine=engines[i],len=e.throatZ-e.z,r=e.exitRadiusM,injector=fluidFitting(engine,[side*r*.14,len+shellT+.060,Math.sqrt((r*.34)**2-(r*.14)**2)],[side*.14,0,Math.sqrt(.34**2-.14**2)],tank.id+' injector fitting',.012);
   fluidLink(branch,injector,{part:'propulsion',radius:.010,parent:service,bendRadiusM:.035,name:tank.id+' injector feed '+(i+1),via:(a,bb)=>{const z=aftRail+(tankIndex?0:.022),y=-b*.30+.12+i*.055;return [v(a.x,a.y,z),v(a.x,y,z),v(bb.x,y,z),v(bb.x,bb.y,z)];}});
  });
 }
 function updateFluidConnections(){
  root.updateMatrixWorld(true);
  for(const c of fluidConnections){const a=anchorInFrame(c.a,c.parent),bb=anchorInFrame(c.b,c.parent),r=c.bendRadiusM;
   if(c.restLengthM){c.tube.update(constantLengthHingeRoute(a,bb,{outward:c.flexOutward(),restLengthM:c.restLengthM,bendRadiusM:r}));}
   else if(c.staticSampledPoints)c.tube.update(c.staticSampledPoints,{sampled:true,minimumBendRadiusM:c.staticBendRadiusM});else if(c.staticPlan)c.tube.update(c.staticPlan);else{const via=c.via?c.via(a,bb):[a.clone().addScaledVector(normalInFrame(c.a,c.parent),r*2.2),bb.clone().addScaledVector(normalInFrame(c.b,c.parent),r*2.2)];c.tube.update([a,...via,bb]);}
  }
 }
 const gyroAxes=clusterState([0,0,0,0],1),gd=p.installDims['04.01'];
 for(const [i,point] of p.stations['04.01'].entries()){
  const mount=join(gyroPack,...point,'cmg'),x=v(...gyroAxes.rotorAxes[i]),z=v(...gyroAxes.gimbalAxes[i]),y=z.clone().cross(x).normalize(),frame=join(mount,0,0,0,'cmg');frame.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
  const gimbal=join(frame,0,0,0,'cmg'),spin=join(gimbal,0,0,0,'cmg'),r=.46*Math.min(gd[0],gd[1]),rotor=cyl(spin,0,0,0,r*.73,r*.73,gd[2]*.45,gyroMat,'cmg',24);rotor.rotation.z=-Math.PI/2;
  const ring=new T.Mesh(new T.TorusGeometry(r,r*.075,10,40),gyroMat);ring.rotation.y=Math.PI/2;gimbal.add(ring);box(mount,0,-gd[1]*.43,0,gd[0]*.89,gd[1]*.08,gd[2]*.96,gyroMat,'cmg');cmgs.push({g:mount,gimbal,spin,rotor,index:i});
 }
 for(let axis=0;axis<3;axis++){const bar=join(internal,-w*.32,b*(axis===2?.40:.25),l*(axis-1)*.14,'torquer'),len=Math.min(w*.28,l*.25);cyl(bar,0,0,0,.025,.025,len,rodMat,'torquer',20);if(axis===0)bar.rotation.z=Math.PI/2;if(axis===2)bar.rotation.x=Math.PI/2;torquers.push(bar);}

 const terminal=terminalLayout(w,b,d.kaDishM,d.opticalApertureM),terminalDefs=architectureTerminalStations(h),heads=[],patches=[],apertures={patches:[],optical:[]};
 let dish,optic;
 for(const spec of terminalDefs){
  const mount=join(root,...spec.positionM,'communications');mount.name=spec.id+' · '+spec.evidence;mount.quaternion.setFromUnitVectors(Y,v(...spec.normalBody));
  if(spec.kind==='s'){
   const patch=box(mount,0,.012,0,.17,.024,.17,patchMat,'communications');patches.push(patch);apertures.patches.push(marker(mount,[0,.026,0]));continue;
  }
  const optical=spec.kind==='optical',scale=optical?d.opticalApertureM:d.kaDishM,height=optical?terminal.opticalHeight:terminal.kaHeight,supportMat=optical?role('optical-support'):reflectorMat,turntable=join(mount,0,0,0,'communications'),head=join(turntable,0,height,0,'communications');
  cyl(mount,0,.025,0,scale*.20,scale*.24,.05,supportMat,'communications',24);
  for(const side of [-1,1])pipe(turntable,v(side*scale*.18,.03,0),v(side*scale*(optical?.85:.55),height,0),Math.max(.007,scale*.025),supportMat,'communications');
  let aperture;
  if(optical){const barrel=join(head,0,-terminal.opticalPin,0,'communications');cyl(barrel,0,scale*.45,0,scale*.68,scale*.80,scale,opticalHousingMat,'communications',32);cyl(barrel,0,scale*.98,0,scale*.63,scale*.63,scale*.08,baffleMat,'communications',32);cyl(barrel,0,scale*1.01,0,scale*.46,scale*.46,scale*.04,opticalGlassMat,'communications',32);aperture=marker(barrel,[0,scale*1.035,0]);apertures.optical.push(aperture);if(!optic){optic=head;apertures.Optical=aperture;}}
  else{
   const reflector=join(head,0,-terminal.kaPin,0,'communications'),profile=[];for(let i=0;i<=16;i++){const r=scale*.5*i/16;profile.push(new T.Vector2(r,(r/scale)**2*scale*.65));}for(let i=16;i>=0;i--){const r=scale*.5*i/16;profile.push(new T.Vector2(r,(r/scale)**2*scale*.65-.008));}
   const mesh=new T.Mesh(new T.LatheGeometry(profile,48),reflectorMat);mesh.userData.part='communications';reflector.add(mesh);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;pipe(reflector,v(scale*.44*Math.cos(a),scale*.12,scale*.44*Math.sin(a)),v(0,scale*.37,0),Math.max(.006,scale*.013),reflectorMat,'communications');}cyl(reflector,0,scale*.37,0,scale*.035,scale*.063,scale*.10,contactMat,'communications',24);aperture=marker(reflector,[0,scale*.162,0]);dish=head;apertures.Ka=aperture;
  }
  heads.push({spec,mount,turntable,head});
 }
 function pointTerminals(ka,opt){
  for(const a of heads){
   // Only the primary optical head has a commanded service/attitude state.
   // A second installed head remains parked until independently scheduled.
   if(a.spec.kind==='optical'&&a.spec.id!=='optical-0'){a.turntable.rotation.y=0;a.head.rotation.x=0;continue;}
   const target=(a.spec.kind==='optical'?opt:ka).clone().applyQuaternion(a.mount.quaternion.clone().invert());if(target.x*target.x+target.z*target.z>1e-12)a.turntable.rotation.y=Math.atan2(target.x,target.z);a.head.rotation.x=Math.atan2(Math.hypot(target.x,target.z),target.y);
  }
 }
 let lastKey='';
 function positionPanels(progress,attitude){
  const key=[progress,attitude?.wingPitchDeg,attitude?.upperRadiatorPitchDeg,attitude?.lowerRadiatorPitchDeg,attitude?.upperRadiatorRollDeg,attitude?.lowerRadiatorRollDeg].join('/');if(key===lastKey)return;lastKey=key;
  const motion=mechanismPose(g,progress,d.solarTiltDeg,attitude);
  for(const wing of wings){
   const m=motion.wings.find(q=>q.side===wing.side&&q.end===wing.end),pos=leafPose(g,wing.descriptor,progress,d.solarTiltDeg,attitude),axes=leafAxes(pos),normal=axes[1],depth=axes[2];wing.currentSpan=m.span;
   wing.surface.position.set(pos.x,pos.y,pos.z);orient(wing.surface,axes);wing.surface.scale.x=Math.max(m.span,1e-8);wing.surface.visible=m.span>1e-7;at(wing.rootPin,m.root);at(wing.tipPin,m.tip);at(wing.tip,m.tip);orient(wing.tip,axes);at(wing.base,m.root);orient(wing.base,axes);
   planeMaterialUV(wing.front,m.span,wing.descriptor.depth);planeMaterialUV(wing.back,m.span,wing.descriptor.depth);
   const rollCenter=plus(m.tip,normal,m.rollRadius);at(wing.roll,rollCenter);wing.roll.quaternion.setFromUnitVectors(Y,v(...depth));wing.roll.scale.set(m.rollRadius,wing.descriptor.depth+.05,m.rollRadius);
   wing.discs.forEach((o,j)=>{at(o,plus(rollCenter,depth,(j?1:-1)*(wing.descriptor.depth/2+.035)));o.quaternion.copy(wing.roll.quaternion);o.scale.set(m.rollRadius+appendageDimensions.solarReelDiscRadialOverhangM,.025,m.rollRadius+appendageDimensions.solarReelDiscRadialOverhangM);});
   wing.booms.forEach((o,j)=>{const offset=(j?1:-1)*(wing.descriptor.depth/2+.03);link(o,plus(m.root,depth,offset),plus(m.tip,depth,offset));});
  }
  for(const [desc,mesh] of radiatorMeshes){const p=leafPose(g,desc,progress,d.solarTiltDeg,attitude);mesh.position.set(p.x,p.y,p.z);orient(mesh,leafAxes(p));}
  for(const bank of rads){const p=motion.banks.find(q=>q.end===bank.end);for(const [name,point] of [['rootPin',p.root],['rootSocket',p.root],['elbowPin',p.elbow],['elbowSocket',p.elbow],['tip',p.tip]])at(bank[name],point);}
  for(const j of jointLinks){const b=motion.banks.find(q=>q.end===j.end),previous=b.panelRoots[j.j-1],desc=g.descriptors.find(s=>s.type==='rad'&&s.end===j.end&&s.j===j.j-1),end=plus(previous,(b.panelAxes?.[j.j-1]||leafAxes({pitch:b.panelPitches[j.j-1],roll:b.roll}))[2],desc.depth);at(j.pin,end);at(j.socket,b.panelRoots[j.j]);link(j.bar,end,b.panelRoots[j.j]);}
  updateFluidConnections();
  for(const support of supportBars)if(support.role==='restraint'){const q=Math.max(0,Math.min(1,(progress-support.releaseStart)/(support.releaseEnd-support.releaseStart))),fraction=support.lengthM?1-q*(1-support.retractedLengthM/support.lengthM):0;link(support.bar,support.foot,support.foot.map((x,i)=>x+(support.seat[i]-x)*fraction));}
 }
 positionPanels(1);
 let fluidRoutingPlans=kit.planFluidRoutes===false?[]:planStaticFluidConnections(root,fluidConnections);updateFluidConnections();
 function replanFluidConnections(options={}){fluidRoutingPlans=planStaticFluidConnections(root,fluidConnections,options);updateFluidConnections();return fluidRoutingPlans;}
 function fluidRoutingSnapshot(options={}){return {...flightFluidSnapshot(root,fluidConnections,options),interfaceAllocation:fluidInterfaceAllocationReport(root)};}function auditFluidRouting(options={}){return auditFlightFluidSnapshot(fluidRoutingSnapshot(),options);}
 function setCoreView(core){
  if(f.payloadLocation!=='radiator')return;
  for(const wing of wings){wing.surface.visible=!core&&wing.currentSpan>1e-7;for(const part of [wing.roll,wing.tip,wing.base,...wing.discs])part.visible=!core;for(const boom of wing.booms)boom.visible=!core&&wing.currentSpan>1e-7;}
 }
 const points=g.descriptors.flatMap(s=>{const p=leafPose(g,s,1,d.solarTiltDeg||0),a=leafAxes(p);return [-.5,.5].flatMap(x=>[-.5,.5].map(z=>[p.x,p.y,p.z].map((v,i)=>v+a[0][i]*x*s.width+a[2][i]*z*s.depth)));});
 const ext=[0,1,2].map(i=>Math.max(...points.map(p=>p[i]))-Math.min(...points.map(p=>p[i])));
 finalizeCraftMaterials(root);
 return {root,internal,skin,enclosure,service,shelf,tankMap,engines,regulator,walls,routingWalls,routingFeedthroughs,addRoutingFeedthrough,radiatorMeshes,wings,panels,mechanismAudit,appendages,recorder,avionics,torquers,driveCount,shownDrives,trayRows,positionPanels,setCoreView,rads,cmgs,cells,leds,dish,optic,opticalTerminals:heads.filter(a=>a.spec.kind==='optical').map(a=>a.head),terminalMounts:heads.map(a=>a.mount),terminalGimbals:heads,pointTerminals,patches,apertures,plumes,gyroPack,payloadPlatformAnchor,payloadRack,rack,thermalPumps,coolantCollection,fluidConnections,get fluidRoutingPlans(){return fluidRoutingPlans;},replanFluidConnections,fluidRoutingSnapshot,auditFluidRouting,bw:w,bh:b,bl:l,wingspan:Math.max(w,ext[0]),spanZ:Math.max(l,ext[1],ext[2]),physicalArchitecture:h.physicalArchitecture};
}
