import {clusterState} from './attitude-dynamics.js';
import {spacecraftInterface} from './payload-interface.js';
import {flightInterfaceGeometry} from './payload-interface-mesh.js';
import * as T from './vendor/three.module.js';
import {deploymentLayout,mechanismPose,terminalLayout,terminalStations} from './deployment.js';
import {thermalMesh} from './thermal-view.js';
import {architectureFamily} from './architecture-families.js';
import {makeFamilyCraft} from './craft-family.js';
import {installElectricalHarnessScene} from './electrical-harness-scene.js';
import {routingFeedthroughFactory,perforatedPanelGeometry,registerRoutingBox,constantLengthHingeRoute,planStaticFluidConnections,joinedFluidRoutes,fluidPhysicalMeshes,installColdPlateCollection,flightFluidSnapshot,auditFlightFluidSnapshot,bindFluidJunctions,hollowFluidFitting,routingMotionFor} from './flight-fluid-routing.js';
import {protectedFluidAllocation as F,protectedUnionOutletControls} from './protected-fluid-allocation.js';
import {declareRotaryFluidChannel} from './fluid-interface-allocation.js';
import {connectionTube,connectionAnchor,anchorInFrame,normalInFrame} from './connection-geometry.js';
import {roleMaterial,tagMaterial,engineeringGraphic,boxMaterialUV,planeMaterialUV,cylinderMaterialUV,sphereMaterialUV,finalizeCraftMaterials} from './spacecraft-material-render.js';
const v=(x,y,z)=>new T.Vector3(x,y,z);
const solid=(c,m=.24,r=.49)=>new T.MeshStandardMaterial({color:c,metalness:m,roughness:r});
const lit=solid('#b3ffe7',0,.8);lit.emissive.setHex(0x42b594);lit.emissiveIntensity=.65;
const fluidFuel=solid('#bd824a',0,.7),fluidOxidizer=solid('#547db0',0,.7);
for(const [material,kind] of [[lit,'Activity indicator'],[fluidFuel,'Fuel inventory glyph'],[fluidOxidizer,'Oxidizer inventory glyph']])material.userData={shared:true,physicalMaterial:false,surfaceRepresentation:kind};
const boxG=new T.BoxGeometry(1,1,1);boxG.userData.shared=true;
const cylG=new Map();
function cylinderGeom(a,b,n,open){const key=[a,b,n,open].join('/');if(!cylG.has(key)){const g=new T.CylinderGeometry(a,b,1,n,1,open);g.userData.shared=true;cylG.set(key,g);}return cylG.get(key);}
// Pole fans in the stock lathe/cone keep a duplicated tip per UV seam.
// Discard their zero-area triangles while retaining the valid fan and its UVs.
function trimPoleTriangles(g){
 const p=g.attributes.position,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),out=[];
 for(let i=0;i<g.index.count;i+=3){const x=g.index.getX(i),y=g.index.getX(i+1),z=g.index.getX(i+2);a.fromBufferAttribute(p,x);b.fromBufferAttribute(p,y).sub(a);c.fromBufferAttribute(p,z).sub(a);
  if(b.cross(c).lengthSq()>1e-21)out.push(x,y,z);
 }
 g.setIndex(out);g.clearGroups();return g;
}
function obj(p,g,m,x,y,z,id){if(g.type==='LatheGeometry')g.normalizeNormals();const a=tagMaterial(new T.Mesh(g,m));a.position.set(x,y,z);if(id)a.userData.part=id;p.add(a);return a;}
function box(p,x,y,z,w,h,d,m,id){let a=obj(p,boxG,m,x,y,z,id);a.scale.set(w,h,d);return boxMaterialUV(a,w,h,d);}
function cyl(p,x,y,z,rTop,rBot,height,m,id,n=16,open=false){const radius=Math.max(rTop,rBot,.00001),geom=cylinderGeom(+(rTop/radius).toFixed(5),+(rBot/radius).toFixed(5),n,open);let a=obj(p,geom,m,x,y,z,id);a.scale.set(radius,height,radius);return cylinderMaterialUV(a,radius,height);}
const sphereG=new T.SphereGeometry(1,48,28);sphereG.userData.shared=true;
function ell(p,x,y,z,a,b,c,m,id){let o=obj(p,sphereG,m,x,y,z,id);o.scale.set(a,b,c);return sphereMaterialUV(o,Math.max(a,b,c));}
function pipe(p,a,b,r,m,id){const d=b.clone().sub(a),c=a.clone().add(b).multiplyScalar(.5);let o=cyl(p,c.x,c.y,c.z,r,r,d.length(),m,id,6);o.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());if(id==='radiator')thermalMesh(o,'coolant');if(['coolant-tube','radiator-passage','propellant-feed','passive-heat-pipe'].includes(m.userData?.materialRole)){o.userData.staticFluidLine={radiusM:r,points:[a.toArray(),b.toArray()],role:m.userData.materialRole};o.userData.routingLine=true;}return o;}
function strokes(p,segments,color,id,opacity=1){let points=[];for(const [a,b] of segments)points.push(...a,...b);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));const lines=new T.LineSegments(geo,new T.LineBasicMaterial({color,opacity,transparent:opacity<1}));if(id)lines.userData.part=id;p.add(lines);return lines;}
function canvas(w,h){let c=document.createElement('canvas');c.width=w;c.height=h;return[c,c.getContext('2d')];}
function tex(c){let t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;}
function face(p,x,y,z,w,d,m,id){const a=obj(p,new T.PlaneGeometry(w,d),m,x,y,z,id);a.rotation.x=-Math.PI/2;a.userData.texturePlane=true;return planeMaterialUV(a,w,d);}
function join(p,x,y,z,id){let g=new T.Group();g.position.set(x,y,z);g.userData.part=id;p.add(g);return g;}
function labelPlate(p,x,y,z,w,d,caption){const [c,g]=canvas(512,112);g.fillStyle='#e3e1d7';g.fillRect(0,0,512,112);g.fillStyle='#26343b';g.font='bold 60px monospace';g.fillText(caption,18,74);g.fillStyle='#bd6b21';g.fillRect(0,0,7,112);let m=solid('#fff');m.map=tex(c);m.userData.physicalMaterial=false;m.userData.surfaceRepresentation='Engineering realization label';return face(p,x,y,z,w,d,m,'structure');}
export function makeCraft(h,{installElectrical=true,planFluidRoutes=true}={}){
 const planInitialFluidRoutes=planFluidRoutes&&!installElectrical;
 const finish=factory=>{if(!installElectrical)return factory;const installed=installElectricalHarnessScene(factory,h,{planFluidRoutes});if(planFluidRoutes)installed.replanFluidConnections?.({otherRoutes:installed.electrical.routing.snapshot().routes,reservedObstacles:installed.electrical.routing.fluidPlanningReservations});return installed;};
 const role=id=>roleMaterial(h,id),materials={role,lit,fluidFuel,fluidOxidizer};
 const family=architectureFamily(h);if(family.id!=='protected-core'||family.kaTerminalCount!==1||family.sPatchCount!==2)return finish(makeFamilyCraft(h,{v,solid,box,cyl,ell,pipe,face,join,strokes,labelPlate,materials,planFluidRoutes:planInitialFluidRoutes}));
 const frameMat=role('primary-frame'),wallMat=role('enclosure-face-sheet'),mechanismMat=role('deployment-hardware'),blanketMat=role('mli-outer'),whiteBlanketMat=role('mli-white-outer'),solarMat=role('solar-active'),solarBackMat=role('solar-backing'),boomMat=role('solar-boom'),radiatorMat=role('radiator-finish'),radiatorCoreMat=role('radiator-core'),radiatorSheetMat=role('radiator-face-sheet'),tubeMat=role('coolant-tube'),passageMat=role('radiator-passage'),feedMat=role('propellant-feed'),tankMat=role('propellant-tank'),bottleMat=role('pressurant-tank'),electronicsMat=role('electronics-case'),batteryMat=role('battery-case'),trayMat=role('compute-chassis'),boardMat=role('compute-board'),coldMat=role('cold-plate'),gyroMat=role('attitude-hardware'),rodMat=role('magnetic-rod'),windingMat=role('electrical-winding'),harnessMat=role('harness'),reflectorMat=role('rf-reflector'),contactMat=role('rf-contact'),patchMat=role('rf-radome'),opticalHousingMat=role('optical-housing'),opticalGlassMat=role('optical-aperture'),baffleMat=role('sensor-baffle'),nozzleMat=role('nozzle');
 const root=new T.Group(),internal=new T.Group(),skin=new T.Group();root.add(skin,internal);let bw=h.bodyWidthM,bh=h.bodyHeightM,bl=h.bodyLengthM;const panelL=h.wingLengthM,panelW=h.wingWidthM,radL=h.radiatorLengthM,radW=h.radiatorWidthM;let wings=[],rads=[],panels=[],trayRows=[],cmgs=[],cells=[],leds=[],plumes=[],engines=[];const propulsion=h.propulsion;const gleam=[];const w=bw,hgt=bh,l=bl,beam=Math.min(.17,Math.min(w,hgt)*.052);const y0=hgt*.5,kin=deploymentLayout(h),appendages=new T.Group();root.add(appendages);
// Six dedicated, finite-thickness walls. Positive-axis covers lift away for the core section.
const enclosure=new T.Group(),walls=[],routingWalls=[],routingFeedthroughs=[],fluidConnections=[];root.add(enclosure);
const wallT=Math.min(w,hgt,l)*.024,flexLoops=[];
function wall(parent,axis,sign,width,height,depth,x,y,z){
 const spec=h.enclosure?.walls?.find(p=>p.axis===axis&&p.sign===sign);
 const apertures=spec?.portDiametersM??(axis==='x'?[.036,.036]:axis==='y'?[.036]:sign>0?[.052,.052]:[.052,.052,.065,.065]);
 const u=axis==='x'?depth:width,vv=axis==='y'?depth:height;
 const holes=apertures.map((diameter,i)=>{
  if(axis==='x')return {u:(i?1:-1)*u*.28,v:vv*.07,d:diameter};
  if(axis==='z'&&sign<0){const exit=propulsion.engines[i];return {u:-exit.x,v:exit.y,d:diameter,engine:true};}
  if(axis==='y')return i?{u:(i===1?-1:1)*kin.rw*.32,v:-sign*(kin.radRoot-.16),d:diameter,coolant:true}:{u:-.18*w,v:.30*vv,d:diameter};
  return {u:(i%2?1:-1)*.22*w,v:hgt*(i<2?-.20:.20),d:diameter};
 });
 const shape=new T.Shape().moveTo(-u/2,-vv/2).lineTo(u/2,-vv/2).lineTo(u/2,vv/2).lineTo(-u/2,vv/2).closePath();
 for(const [n,q] of holes.entries()){
  const cut=new T.Path(),count=40;
  for(let k=0;k<count;k++){
   const a=-(k+(n%2?.23:.47))*Math.PI*2/count,x=q.u+q.d*.5*Math.cos(a),y=q.v+q.d*.5*Math.sin(a);
   if(k)cut.lineTo(x,y);else cut.moveTo(x,y);
  }
  cut.closePath();shape.holes.push(cut);
 }
 const g=new T.ExtrudeGeometry(shape,{depth:wallT,bevelEnabled:false,curveSegments:18});g.translate(0,0,-wallT/2);
 const shell=obj(parent,g,wallMat,x,y,z,'structure');if(axis==='x')shell.rotation.y=sign*Math.PI/2;else if(axis==='y')shell.rotation.x=-sign*Math.PI/2;else if(sign<0)shell.rotation.y=Math.PI;
 shell.name=spec?.id||axis+(sign>0?'+':'−')+' thermal wall';shell.userData.wall={axis,sign,holes};shell.userData.routingSolid=true;walls.push(shell);routingWalls.push({id:shell.name,mesh:shell,axis:({x:0,y:1,z:2})[axis],sign,widthM:u,heightM:vv,thicknessM:wallT,holes:holes.map((q,i)=>({id:shell.name+'-'+i,u:q.u,v:q.v,radiusM:q.d/2})),layers:[]});
 // Metal gland sleeves fill the bores. Dielectric gaskets seat against the dry shell and carry the blankets around the cable or pipe.
 for(const q of holes){if(q.engine)continue;const a=join(shell,q.u,q.v,0,q.engine?'propulsion':q.coolant?'radiator':'structure'),r=q.d*.5;
  const bore={u:0,v:0,radiusM:r*.90},sleeve=obj(a,perforatedPanelGeometry(r*1.98,r*1.98,wallT+beam*1.12,[bore]),q.coolant||q.engine?feedMat:frameMat,0,0,0,q.engine?'propulsion':q.coolant?'radiator':'structure');sleeve.name='Open bulkhead gland sleeve';sleeve.userData.routingInterface=true;
  const gasket=new T.Mesh(new T.TorusGeometry(r*1.15,r*.25,10,36),role('feedthrough-seal'));gasket.position.z=wallT*.50+beam*.08;a.add(gasket);
  const flange=obj(a,perforatedPanelGeometry(r*3,r*3,beam*.14,[bore]),wallMat,0,0,wallT*.5+beam*.36,'structure');flange.name='Open bulkhead flange';flange.userData.routingInterface=true;
 }
 return shell;
}
for(const side of [-1,1]){
 const cover=side>0?skin:enclosure;
 wall(cover,'x',side,wallT,hgt-2*wallT,l-2*wallT,side*(w-wallT)/2,0,0);
 wall(cover,'y',side,w,wallT,l-2*wallT,0,side*(hgt-wallT)/2,0);
 wall(cover,'z',side,w,hgt,wallT,0,0,side*(l-wallT)/2);
}
const flightFlange=obj(root,flightInterfaceGeometry(T),role('launch-interface'),0,0,h.payloadInterface.deckZ,'structure');
flightFlange.name='ODC-LI-01 aft mounting ring';
// The structural ring at each bay stays in the section. Six insulated exterior surfaces close the envelope.
for(let side of [-1,1])for(let y of [-1,1])box(root,side*w*.488,y*y0,0,beam*.6,beam*.65,l*1.008,frameMat,'structure');
for(let side of [-1,1]){
 const cover=side>0?skin:enclosure,x=side*(w*.5+beam*.12),y=side*(y0+beam*.11),z=side*(l*.5+beam*.11);
 for(let k=0;k<4;k++){const cz=l*((k+.5)/4-.5);
  thermalMesh(box(cover,x,0,cz,beam*.18,hgt*.86,l*.232,k===1||k===3?blanketMat:whiteBlanketMat,'structure'),'enclosure');
  const panelMat=(k+side)%2?blanketMat:whiteBlanketMat,halfTile=l*.116;
  thermalMesh(box(cover,0,y,cz,w*.90,beam*.17,2*halfTile,panelMat,'structure'),'enclosure');
  for(let edge of [-1,1]){box(cover,x+side*beam*.12,edge*hgt*.392,cz,beam*.052,beam*.15,l*.208,mechanismMat,'structure');box(cover,edge*w*.416,y+side*beam*.116,cz,beam*.14,beam*.052,l*.210,mechanismMat,'structure');}
  for(let i=0;i<3;i++)box(cover,x+side*beam*.125,hgt*(.10-.11*i),cz+l*.04,beam*.058,beam*.12,l*.082,frameMat,'structure');
 }
 // End bulkhead insulation cartridges surround service feedthroughs and a latched equipment access door.
 if(side<0){
  // Keep the machined seating annulus and injector penetrations clear of the blankets.
  const free=spacecraftInterface.outerM/2+.012,outerY=hgt*.47,outerX=w*.46;
  for(const s of [-1,1]){
   if(outerY>free)thermalMesh(box(cover,0,s*(outerY+free)/2,z,2*outerX,outerY-free,beam*.18,whiteBlanketMat,'structure'),'enclosure');
   if(outerX>free)thermalMesh(box(cover,s*(outerX+free)/2,0,z,outerX-free,2*Math.min(free,outerY),beam*.18,whiteBlanketMat,'structure'),'enclosure');
  }
 }else{
  for(let edge of [-1,1])thermalMesh(box(cover,edge*w*.29,0,z,w*.39,hgt*.86,beam*.18,whiteBlanketMat,'structure'),'enclosure');

 }
}
// Blanket cartridges are physical outer layers and must receive the same
// openings as the structural wall behind them.
for(const parent of [skin,enclosure])for(const mesh of [...parent.children])if(mesh.isMesh&&mesh.geometry.type==='BoxGeometry'){
 const scale=mesh.scale.toArray(),position=mesh.position.toArray();for(let axis=0;axis<3;axis++)if(scale[axis]<Math.min(...scale.filter((_,i)=>i!==axis))*.4&&Math.abs(position[axis])>=[w,hgt,l][axis]/2){routingWalls.push(registerRoutingBox(mesh,axis,Math.sign(position[axis]),'Outer blanket '+routingWalls.length));break;}
}
for(let iz=0;iz<5;iz++){const z=(iz/4-.5)*l;for(let side of [-1,1])box(root,side*(w*.5+beam*.09),0,z,beam*.52,hgt+beam*.30,beam*.42,frameMat,'structure');box(root,0,-y0-beam*.07,z,w+beam*.42,beam*.43,beam*.38,frameMat,'structure');}
labelPlate(skin,0,y0+beam*.235,-l*.12,w*.59,l*.09,'ODC / 01');
// Full-depth transverse frames directly behind each mounting station connect to the corner longerons.
const stations=[...new Set(kin.mounts.flatMap(m=>m.supports.map(p=>p.foot[2])))];
for(const z of stations)for(const side of [-1,1]){
 box(root,side*(w/2-.034),0,z,.068,hgt,.094,frameMat,'structure').name='Transverse hardpoint frame';
 box(root,0,side*(hgt/2-.034),z,w,.068,.094,frameMat,'structure').name='Transverse hardpoint frame';
}
// Each wing is attached to a fixed tracking saddle. The web pays out over
// the mandrel while its two strain-energy slit-tube booms recover their shape.
const mechanismAudit={wings:[],banks:[]};

const yAxis=v(0,1,0),xAxis=v(1,0,0);
function pin(parent,x,y,z,r,len,mat,axis,id){
 const o=cyl(parent,x,y,z,r,r,len,mat,id,32);if(axis==='x')o.rotation.z=-Math.PI/2;if(axis==='z')o.rotation.x=Math.PI/2;return o;
}
function marker(parent,x,y,z){const o=new T.Object3D();o.position.set(x,y,z);parent.add(o);return o;}
function beamTo(o,a,b){const delta=b.clone().sub(a);o.position.copy(a).add(b).multiplyScalar(.5);o.scale.y=delta.length();o.visible=o.scale.y>.000001;if(o.visible)o.quaternion.setFromUnitVectors(yAxis,delta.normalize());cylinderMaterialUV(o,o.scale.x,o.scale.y);}
// The restraint plunger bridges a hardpoint doubler and a reinforced end fitting.
// It retracts toward the primary frame before the associated mechanism is released.
function faceSupport(parent,support,axis,hardware){
 const [x,y,z]=support.foot,[ex,ey,ez]=support.seat,solar=axis==='x',lock=support.role==='restraint';
 const sx=Math.sign(ex-x),sy=Math.sign(ey-y),length=Math.hypot(ex-x,ey-y),radius=lock?.044:.067;
 const base=join(parent,x,y,z,'structure');
 const plate=box(base,0,0,0,solar?.035:radius*3,solar?radius*3:.035,radius*3.5,mechanismMat,'structure');plate.name='Hardpoint load-spreading plate';
 const guide=pin(base,sx*.04,sy*.04,0,radius*1.18,.09,mechanismMat,axis,'structure');guide.name=lock?'Captive restraint housing':'Bearing pedestal';
 const slider=join(base,0,0,0,hardware);
 const rod=pin(slider,sx*length/2,sy*length/2,0,radius*(lock?.60:1),length,lock?mechanismMat:mechanismMat,axis,hardware);rod.name=lock?'Retracting launch lock':'Face-mounted bearing';
 rod.updateMatrix();const axisIndex=axis==='x'?0:1,position=rod.geometry.attributes.position;let extentM=0;for(let i=0;i<position.count;i++)extentM=Math.max(extentM,Math.abs(new T.Vector3().fromBufferAttribute(position,i).applyMatrix4(rod.matrix).getComponent(axisIndex)));
 slider.userData.retractAxis=axis;slider.userData.retractExtentM=extentM;
 return slider;
}
for(const d of kin.descriptors.filter(q=>q.type==='pv')){
 const start=appendages.children.length;
 const {side,end}=d,z=kin.center+end*kin.mountZ,rx=side*kin.rootX,id='solar';
 const base=join(appendages,rx,0,z,id),table=join(base,0,0,0,id);
 const points=kin.mounts.find(m=>m.kind==='solar'&&m.end===end&&m.side===side).supports;
 const saddles=points.map(p=>faceSupport(appendages,p,'x',id)).slice(1);
 pin(base,-side*.10,0,0,.105,.18,mechanismMat,'x',id);pin(base,0,0,0,.072,.18,mechanismMat,'x',id);
 box(table,0,0,0,.11,.08,panelW+.18,mechanismMat,id);
 const tip=join(table,0,0,0,id),reel=join(tip,0,0,0,id);
 const roll=pin(reel,0,0,0,1,panelW+.04,solarBackMat,'z',id);roll.name='Wound photovoltaic blanket';
 const discs=[];
 for(const j of [-1,1]){
  discs.push(pin(reel,0,0,j*(panelW*.5+.055),1,.035,mechanismMat,'z',id));
  pin(reel,0,0,j*(panelW*.5+.078),.075,.027,mechanismMat,'z',id);
 }
 const stripe=box(reel,0,0,0,.022,.012,panelW*.98,mechanismMat,id);
 const surface=join(table,0,0,0,id),front=face(surface,0,.003,0,1,panelW,solarMat,id),back=face(surface,0,-.003,0,1,panelW,solarBackMat,id);back.rotation.x=Math.PI/2;
 const booms=[],axles=[];
 for(const j of [-1,1]){
  const zc=j*(panelW*.5+.035);
  const boom=cyl(table,0,0,zc,.033,.033,1,boomMat,id,24);booms.push(boom);
  axles.push(cyl(tip,0,0,zc,.029,.029,1,mechanismMat,id,12));

 }
 wings.push({side,end,table,tip,reel,roll,front,back,discs,stripe,surface,booms,axles,saddles});
 for(const o of appendages.children.slice(start))o.userData.assembly='wing '+side+'/'+end;
 panels.push({surface,descriptor:d});mechanismAudit.wings.push({root:table,tip,mandrel:reel,blanket:front,booms,side,end});
}
// Two root-actuated accordion radiator banks. Every panel and hinge uses
// the same installed count, pitch and offset as the analytical leaf geometry.
const hoses=[],legacyRootFeeds=[],legacyRadiatorTips=[],legacyUnionLinks=[],legacyRigidPassages=[];
root.userData.routingMotion={kind:'rigid',frameId:'body',attachment:'body'};
for(const wing of wings){const motion={kind:'solar',frameId:'solar:'+wing.side+'/'+wing.end,side:wing.side,end:wing.end};for(const o of [wing.table,wing.tip,wing.reel,wing.roll,wing.front,wing.back,...wing.discs,wing.stripe,wing.surface,...wing.booms,...wing.axles])if(o)o.userData.routingMotion=motion;for(const saddle of wing.saddles)saddle.userData.routingMotion={kind:'release-restraint',frameId:saddle.uuid,attachment:'body',tracks:false,startProgress:.015,endProgress:.04,strokeM:.96*saddle.userData.retractExtentM};}
root.userData.fluidComponentChannels=[];root.userData.fluidInterfaceAccounting=h.energySystem.thermal.rotaryFluidAccounting;root.userData.fluidThermalModel=h.energySystem.thermal;
function fluidSocket(parent,position,ports,name,{straight=false,heightM=.08}={}){
 const block=join(parent,...position,'radiator');block.name=name;const size=.08,bore=.0225,half=[.04,heightM/2,.04];
 if(straight){const g=perforatedPanelGeometry(size,size,size,[{u:0,v:0,radiusM:bore}]);g.rotateY(Math.PI/2);obj(block,g,mechanismMat,0,0,0,'radiator').name=name+' bored body';}
 else{
  // Two intersecting machined channels, each leading to an actual connector
  // face. The surrounding block is assembled around the open passages.
  const edge=half.map(x=>[-x,-bore,bore,x]);for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<3;k++){
   const indices=[i,j,k],p=indices.map((n,d)=>(edge[d][n]+edge[d][n+1])/2),inside=ports.some(port=>{const axis=port.normal.findIndex(n=>n!==0),sign=port.normal[axis];return p.every((x,d)=>d===axis?x*sign>=-bore:Math.abs(x)<bore);});if(inside)continue;
   box(block,...p,...indices.map((n,d)=>edge[d][n+1]-edge[d][n]),mechanismMat,'radiator').name=name+' channel wall';
  }
 }
 const out={root:block};for(const spec of ports){const a=connectionAnchor(block,spec.normal.map((n,i)=>n*half[i]),spec.normal,name+' '+spec.id);a.userData.routingOwnerId=block.uuid;hollowFluidFitting(a,{outerRadiusM:.028,boreRadiusM:.0225,lengthM:.018,material:tubeMat,name:a.name+' open fitting'});out[spec.id]=a;}
 root.userData.fluidComponentChannels.push({componentId:block.uuid,name,portIds:ports.map(p=>out[p.id].uuid),basis:'Allocated machined fluid passage; fitting pressure/compatibility qualification remains open.'});return out;
}
function flexible(fromPort,toPort,side,mat,owner,bankEnd){
 const group=join(appendages,0,0,0,'radiator'),start=marker(group,0,0,0),end=marker(group,0,0,0),name='Radiator hinge flexible '+(side>0?'supply':'return')+' '+hoses.length;
 const tube=connectionTube(group,{radius:F.flexRadiusM,material:mat,part:'radiator',segments:96,radialSegments:8,bendRadiusM:F.flexBendM,name});tube.mesh.userData.fluidConnectionId=name;
 const h={id:name,name,fromPort,toPort,a:fromPort,b:toPort,start,end,side,tube,parent:group,group,restLength:F.flexLengthM,restLengthM:F.flexLengthM,radiusM:F.flexRadiusM,bendRadiusM:F.flexBendM,part:'radiator',circuitId:'legacy-thermal-'+bankEnd,motionModel:{kind:'constant-length-u',physicalLengthBasis:'perpendicular-two-quarter-fillets',arcSteps:8,fromFrameId:routingMotionFor(fromPort).frameId,toFrameId:routingMotionFor(toPort).frameId,bankEnd,minimumChordM:.185,maximumChordM:.84}};hoses.push(h);owner.push(h);fluidConnections.push(h);
}
for(const end of [-1,1]){
 const start=appendages.children.length;
 const sign=-end,id='radiator',ry=sign*kin.rootY,rz=kin.radRoot;
 const mount=join(appendages,0,ry,rz,id),pitchFrame=join(mount,0,0,0,id);pitchFrame.userData.routingMotion={kind:'rigid',frameId:pitchFrame.uuid,attachment:'radiator-pitch',bankEnd:end,leafIndex:0};
 const bank=join(pitchFrame,0,0,0,id),frames=[bank];
 for(let j=1;j<kin.panelCount;j++)frames.push(join(frames[j-1],0,j%2===0?4*end*kin.hingeStand:0,kin.r,id));
 const knuckle=frames[1];
 const ap=kin.rw*.32;
 const points=kin.mounts.find(m=>m.kind==='radiator'&&m.end===end).supports;
 const clips=[];
 for(const p of points){const element=faceSupport(appendages,p,'y',id);if(p.role==='restraint'){const startProgress=end<0?.42:.665;element.userData.routingMotion={kind:'release-restraint',frameId:element.uuid,attachment:'body',startProgress,endProgress:startProgress+.025,strokeM:.96*element.userData.retractExtentM};clips.push(element);}}
 for(const j of [-1,1]){
  pin(mount,j*ap,0,0,.074,.20,mechanismMat,'x',id);
  for(const frame of frames.slice(1))pin(frame,j*ap,0,0,.060,.16,mechanismMat,'x',id);
 }
 // The rotating pitch cradle transmits span-bearing reactions to both wall trunnions.
 const bridge=perforatedPanelGeometry(2*ap,.46,.092,[{u:0,v:0,radiusM:.195}]);
 obj(pitchFrame,bridge,mechanismMat,0,0,-.10,id).name='Root pitch crosshead with open rotary-union bore';
 for(const side of [-1,1])box(pitchFrame,side*ap,0,-.05,.08,.14,.15,mechanismMat,id).name='Root pitch crosshead bearing fork';
 const motor=pin(mount,ap+.12,0,0,.106,.13,mechanismMat,'x',id);
 motor.name='Radiator root pitch actuator';
 const union=pin(pitchFrame,0,0,F.statorCenterZM,F.unionRadiusM,F.statorLengthM,mechanismMat,'z',id);
 union.name='Two-channel coolant union stator';
 const rotor=pin(bank,0,0,F.rotorZM,F.unionRadiusM,.06,mechanismMat,'z',id);rotor.name='Two-channel coolant union rotor';
 const shaftShape=new T.Shape();shaftShape.absarc(0,0,.115,0,Math.PI*2,false);const shaftBore=new T.Path();shaftBore.absarc(0,0,.070,0,Math.PI*2,true);shaftShape.holes.push(shaftBore);const shaftGeometry=new T.ExtrudeGeometry(shaftShape,{depth:.02,bevelEnabled:false,steps:1,curveSegments:32});shaftGeometry.translate(0,0,-.01);
 obj(bank,shaftGeometry,mechanismMat,0,0,0,id).name='Hollow bank span-axis trim shaft';
 const unionPorts={};for(const side of [-1,1]){const off=-end*F.unionPortYM,stat=connectionAnchor(pitchFrame,[side*F.unionPortXM,off,F.statorPortZM],[0,-end,0],'Coolant union '+side+' stator port'),rot=connectionAnchor(bank,[side*F.rollDeliveryXM,0,F.rollDeliveryPortZM],[0,0,1],'Coolant union '+side+' rotor port');stat.userData.routingOwnerIds=[union.uuid,stat.uuid];rot.userData.routingOwnerIds=[rotor.uuid,rot.uuid];for(const a of [stat,rot])hollowFluidFitting(a,{outerRadiusM:.029,boreRadiusM:.0225,lengthM:.06,material:tubeMat,name:a.name+' open fitting'});unionPorts[side]={stat,rot};Object.assign(declareRotaryFluidChannel(root,{componentId:union.uuid,name:'Isolated rotary coolant channel '+end+'/'+side,portIds:[stat.uuid,rot.uuid],axes:1,bankEnd:end,hingeIndex:0,basis:'Allocated two-channel rotary fluid interface; internal stator/rotor seal channels, materials, pressure and cycle life remain unqualified.'}),{rotorId:rotor.uuid,axis:'z'});}
 const pitchTransfers={};for(const side of [-1,1]){
  const fixedX=side*(ap+F.pitchStatorOffsetM),movingX=side*(ap+F.pitchRotorOffsetM),stator=pin(mount,fixedX,0,0,F.pitchTransferRadiusM,.05,mechanismMat,'x',id),rotor=pin(pitchFrame,movingX,0,0,F.pitchTransferRadiusM,.05,mechanismMat,'x',id);
  stator.name='Pitch-axis coolant transfer stator '+end+'/'+side;rotor.name='Pitch-axis coolant transfer rotor '+end+'/'+side;
  pin(mount,side*(ap+(F.pitchStatorOffsetM+F.pitchRotorOffsetM)/2),0,0,.055,Math.abs(F.pitchStatorOffsetM-F.pitchRotorOffsetM)-.03,mechanismMat,'x',id).name='Coaxial pitch coolant transfer spindle';
  const inlet=connectionAnchor(mount,[fixedX,0,F.pitchTransferPortZM],[0,0,-1],stator.name+' inlet'),outlet=connectionAnchor(pitchFrame,[movingX,0,F.pitchTransferPortZM],[0,0,-1],rotor.name+' outlet');
  inlet.userData.routingOwnerIds=[stator.uuid,inlet.uuid];outlet.userData.routingOwnerIds=[rotor.uuid,outlet.uuid];for(const a of [inlet,outlet])hollowFluidFitting(a,{outerRadiusM:.029,boreRadiusM:.0225,lengthM:.06,material:tubeMat,name:a.name+' open fitting'});
  pitchTransfers[side]={inlet,outlet,stator,rotor};Object.assign(declareRotaryFluidChannel(root,{componentId:stator.uuid,name:'Pitch-axis rotary coolant channel '+end+'/'+side,portIds:[inlet.uuid,outlet.uuid],axes:1,bankEnd:end,hingeIndex:0,basis:'Allocated isolated coaxial pitch rotary fluid transfer; pressure, sealing, material compatibility and cycle life remain unqualified.'}),{rotorId:rotor.uuid,axis:'x'});
 }
 const owner=[],rootPin=marker(mount,0,0,0),rootSocket=marker(pitchFrame,0,0,0),elbowPin=marker(bank,0,0,kin.r),elbowSocket=marker(knuckle,0,0,0);
 const foldJoints=frames.slice(1).map((frame,k)=>({pin:marker(frames[k],0,(k+1)%2===0?4*end*kin.hingeStand:0,kin.r),socket:marker(frame,0,0,0)}));
 for(const [j,frame] of frames.entries()){
  const d=kin.descriptors.find(q=>q.type==='rad'&&q.end===end&&q.j===j),panelOff=end*kin.hingeStand,off=end*Math.max(kin.hingeStand,F.minimumHeaderOffsetM);frame.userData.routingMotion={kind:'rigid',frameId:frame.uuid,attachment:'radiator-leaf',bankEnd:end,leafIndex:j};
  const p=join(frame,0,panelOff,kin.r/2,id);box(p,0,0,0,d.width,d.thickness-.008,d.depth,radiatorCoreMat,id);
  for(const k of [-1,1]){
   const z=j===0?kin.r/2-.18:-kin.r/2+.18;
   pin(p,k*kin.rw*.20,0,z,.061,d.thickness-.001,mechanismMat,'y',id).name='Captive launch bolt bushing';
  }
  for(const side of [-1,1]){const skin=thermalMesh(face(p,0,side*(d.thickness*.5-.002),0,d.width,d.depth,radiatorMat,id),'radiator');if(side<0)skin.rotation.x=Math.PI/2;}
  const leafExits={};for(const k of [-1,1]){
   const xa=k*(kin.rw/2+F.headerMarginM),mat=tubeMat;
   const exit=fluidSocket(frame,[xa,off,kin.r-.40],[{id:'header',normal:[0,0,-1]},{id:'hinge',normal:[k,0,0]}],'Leaf '+end+'/'+j+' '+k+' outlet elbow');leafExits[k]=exit.hinge;
   let src,dst;
   if(j){src=frames[j-1].coolantExits[k];const entry=fluidSocket(frame,[xa,off,.16],[{id:'hinge',normal:[k,0,0]},{id:'header',normal:[0,0,1]}],'Leaf '+end+'/'+j+' '+k+' inlet elbow');dst=entry.hinge;legacyRigidPassages.push({a:entry.header,b:exit.header,parent:frame,bankEnd:end,name:'Radiator '+end+' leaf '+j+' '+k+' straight header'});}
   else{
    const transfer=pitchTransfers[k],moving=fluidSocket(pitchFrame,[k*(ap+F.pitchRotorOffsetM),0,F.pitchElbowZM],[{id:'inlet',normal:[0,0,1]},{id:'pipe',normal:[0,sign,0]}],'Root '+end+' '+k+' pitch transfer outlet elbow');
    legacyRootFeeds.push({bankEnd:end,side:k,sign,portPosition:[k*(w/2-.30),sign*hgt/2,rz-F.fixedFeedBackM],target:transfer.inlet});
    legacyRigidPassages.push({a:transfer.outlet,b:moving.inlet,parent:pitchFrame,bankEnd:end,name:'Radiator '+end+' '+k+' pitch rotary outlet neck'});
    const target=unionPorts[k].stat;
    legacyUnionLinks.push({a:moving.pipe,b:target,parent:pitchFrame,bankEnd:end,name:'Radiator '+end+' '+k+' pitch union inlet',via:(a,b)=>[v(a.x,sign*F.pitchPipeYM,a.z),v(b.x,sign*F.pitchPipeYM,b.z)]});
    const delivery=fluidSocket(bank,[k*F.rollDeliveryXM,0,F.rollDeliveryElbowZM],[{id:'inlet',normal:[0,0,-1]},{id:'pipe',normal:[k,0,0]}],'Root '+end+' '+k+' roll delivery elbow',{heightM:F.rollDeliveryElbowHeightM});
    legacyRigidPassages.push({a:unionPorts[k].rot,b:delivery.inlet,parent:bank,bankEnd:end,name:'Radiator '+end+' '+k+' roll delivery neck'});
    const header=exit.header;
    legacyUnionLinks.push({a:delivery.pipe,b:header,parent:bank,bankEnd:end,name:'Radiator '+end+' '+k+' roll union outlet',via:(a,b)=>protectedUnionOutletControls(a.toArray(),xa,off,k,sign).map(p=>v(...p))});
   }
   if(j)flexible(src,dst,k,mat,owner,end);
  }
  frame.coolantExits=leafExits;
  panels.push({surface:p,descriptor:d});
 }
 for(const o of appendages.children.slice(start))o.userData.assembly='bank '+end;
 rads.push({end,pitchFrame,bank,knuckle,frames,clips});
 mechanismAudit.banks.push({end,rootPin,rootSocket,elbowPin,elbowSocket,foldJoints,pitchTransfers,tip:marker(frames.at(-1),0,0,kin.r),hoses:owner});legacyRadiatorTips.push({frame:frames.at(-1),end,off:end*Math.max(kin.hingeStand,F.minimumHeaderOffsetM),exits:frames.at(-1).coolantExits});
}
// The two liquid vessels and high-pressure helium bottle sit within the dry bus.
const service=join(root,0,0,0,'propellant'),tankMap={},regulatorParts=[];service.visible=false;
service.name='Aft pressure-fed tank installation';
for(const t of propulsion.tanks){
 const liquid=t.id!=='helium',r=t.radiusM,g=join(service,t.x,t.y,t.z,'propellant');
 const shell=ell(g,0,0,0,r,r,r,liquid?tankMat:bottleMat,'propellant');
 shell.name=t.id+' pressure vessel';tankMap[t.id]=g;
 // Separate replaceable half-shell and an equivalent-volume inventory glyph for inspection.
 if(liquid){
  const section=obj(g,new T.SphereGeometry(r,40,24,Math.PI*1.5,Math.PI),tankMat,0,0,0,'propellant');section.visible=false;
  const fluid=ell(g,0,0,0,r,r,r,t.id==='fuel'?fluidFuel:fluidOxidizer,'propellant');fluid.visible=false;
  cells.push({id:t.id,fluid,tank:shell,section,volumeL:t.volumeL,fluidRadiusM:Math.cbrt(.001*t.volumeL*3/(4*Math.PI))});
 }
 for(const z of [-.34,.34]){const rad=r*Math.sqrt(1-z*z),ring=new T.Mesh(new T.TorusGeometry(rad,Math.min(r*.021,.014),10,44),frameMat);ring.position.z=z*r;g.add(ring);}
 const height=Math.max(.012,(t.z-r*.80)-(-l/2+wallT));
 for(const sign of [-1,1])box(g,sign*r*.48,0,-r*.80-height/2,Math.min(.038,r*.15),r*.40,height,frameMat,'propellant');
 box(g,0,0,-r*.83,r*1.35,r*.77,Math.min(r*.10,.036),frameMat,'propellant');
}
// Separate regulated gas and liquid rails on opposite bay walls. Each liquid
// circuit stays isolated all the way to the twin injector valve packages.
const deck=-l/2;
const regulator=box(service,...propulsion.stations['06.02'],.14,.12,.18,feedMat,'propulsion');regulator.name='Helium isolation and pressure regulator';regulatorParts.push(regulator);
// Reflector is a shallow paraboloid with crossed support rods and a feed horn.
const dishD=h.input.kaDishM,ap=h.input.opticalApertureM,terminal=terminalLayout(w,hgt,dishD,ap);
function pedestal(x,z,span,pinHeight,scale,supportMat){
 const mount=join(root,x,y0,z,'communications'),turntable=join(mount,0,beam*.32,0,'communications'),head=join(turntable,0,pinHeight-beam*.32,0,'communications');
 cyl(mount,0,beam*.21,0,scale*.17,scale*.20,beam*.45,supportMat,'communications');
 pin(turntable,0,0,0,scale*.19,beam*.22,supportMat,'y','communications');
 for(const side of [-1,1]){
  const out=side*span;
  pipe(turntable,v(side*scale*.105,beam*.10,0),v(out,beam*.38,0),scale*.026,supportMat,'communications');
  pipe(turntable,v(out,beam*.38,0),v(out,pinHeight-beam*.32,0),scale*.026,supportMat,'communications');
  pin(head,out-side*scale*.035,0,0,scale*.047,scale*.095,supportMat,'x','communications');
 }
 return {head,turntable,mount};
}
const stationsRF=terminalStations(w,l,h.input);
const kaGimbal=pedestal(...stationsRF.ka,terminal.kaFork,terminal.kaHeight,dishD,reflectorMat),dish=kaGimbal.head;
const reflectorHead=join(dish,0,-terminal.kaPin,0,'communications');
for(const side of [-1,1])pipe(dish,v(side*(terminal.kaFork-.027*dishD),0,0),v(side*dishD*.455,-terminal.kaPin+dishD*.13,0),dishD*.022,reflectorMat,'communications');
// The continuous finite-thickness shell runs from inner rim to axis and back along the outer skin.
const parab=[],dishT=Math.max(.007,dishD*.014),profile=(i,dy)=>{const r=dishD*.5*i/16;return new T.Vector2(r,(r/dishD)**2*dishD*.65+dy);};
for(let i=0;i<=16;i++)parab.push(profile(i,-dishT));for(let i=16;i>=0;i--)parab.push(profile(i,0));
const reflector=obj(reflectorHead,trimPoleTriangles(new T.LatheGeometry(parab,64)),reflectorMat,0,0,0,'communications');reflector.name='Closed reflector shell';const rim=new T.Mesh(new T.TorusGeometry(dishD*.499,Math.max(.014,dishD*.014),12,64),reflectorMat);rim.rotation.x=Math.PI/2;rim.position.y=dishD*.162;reflectorHead.add(rim);for(let j=0;j<3;j++){let a=j*2*Math.PI/3;pipe(reflectorHead,v(dishD*.44*Math.cos(a),dishD*.12,dishD*.44*Math.sin(a)),v(0,dishD*.37,0),dishD*.013,reflectorMat,'communications');}cyl(reflectorHead,0,dishD*.37,0,dishD*.035,dishD*.063,dishD*.10,contactMat,'communications');
const opticalGimbal=pedestal(...stationsRF.optical,terminal.opticalFork,terminal.opticalHeight,ap,role('optical-support')),optic=opticalGimbal.head,barrel=join(optic,0,-terminal.opticalPin,0,'communications');
 cyl(barrel,0,ap*.45,0,ap*.68,ap*.8,ap,opticalHousingMat,'communications');cyl(barrel,0,ap*.98,0,ap*.63,ap*.63,ap*.08,baffleMat,'communications');cyl(barrel,0,ap*1.01,0,ap*.46,ap*.46,ap*.05,opticalGlassMat,'communications');
 function pointTerminals(ka,opt){
  for(const [g,a] of [[kaGimbal,ka],[opticalGimbal,opt]]){
   if(a.x*a.x+a.z*a.z>1e-12)g.turntable.rotation.y=Math.atan2(a.x,a.z);
   g.head.rotation.x=Math.atan2(Math.hypot(a.x,a.z),a.y);
  }
 }
 const patches=[-1,1].map(side=>box(root,side*(w*.5+beam*.42),y0*.52,l*.3,beam*.35,hgt*.14,w*.21,patchMat,'communications'));
// Physical aperture centers. Local +Y is the radiating face normal.
 const mouth=(parent,x,y,rotationZ=0)=>{
  const o=new T.Object3D();o.position.set(x,y,0);o.rotation.z=rotationZ;parent.add(o);return o;
 };
 const apertures={Ka:mouth(reflectorHead,0,dishD*.162),Optical:mouth(barrel,0,ap*1.035),
  patches:patches.map((patch,i)=>mouth(patch,i?.5:-.5,0,(i?-1:1)*Math.PI/2))};
// The rack drawing uses the MEL's occupied slots in body metres. A batch
// per material avoids a separate draw call for every tray in the large builds.
const rack=join(internal,0,0,0,'compute'),cabinet=h.rackLayout;
rack.scale.z=l/propulsion.equipmentLengthM;rack.position.z=-propulsion.equipmentCenterZ*rack.scale.z;
const [tw,th,td]=cabinet.slotDimensionsM,slots=cabinet.slots;
function slotBoxes(parent,stations,offset,size,material,part){
 const pos=[],norm=[],uv=[],index=[],vtx=boxG.attributes.position,ns=boxG.attributes.normal,baseUV=boxG.attributes.uv;
 const [u,v]=material.userData.textureTileM||[1,1],sizes=[[size[2],size[1]],[size[2],size[1]],[size[0],size[2]],[size[0],size[2]],[size[0],size[1]],[size[0],size[1]]];
 for(const {x,y,z} of stations){
  const j=pos.length/3;for(const i of boxG.index.array)index.push(j+i);
  for(let i=0;i<vtx.count;i++){
   pos.push(x+offset[0]+vtx.getX(i)*size[0],y+offset[1]+vtx.getY(i)*size[1],z+offset[2]+vtx.getZ(i)*size[2]);
   norm.push(ns.getX(i),ns.getY(i),ns.getZ(i));
   const face=sizes[Math.floor(i/4)];uv.push(baseUV.getX(i)*face[0]/u,baseUV.getY(i)*face[1]/v);
  }
 }
 const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(pos,3));geom.setAttribute('normal',new T.Float32BufferAttribute(norm,3));geom.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geom.setIndex(index);
 return obj(parent,geom,material,0,0,0,part);
}
const shellBatch=slotBoxes(rack,slots,[0,-.16*th,0],[tw,.68*th,td],trayMat,'compute');shellBatch.userData.installedTrayRow=true;
thermalMesh(slotBoxes(rack,slots,[0,.22*th,0],[.94*tw,.09*th,.92*td],coldMat,'compute'),'coldPlate');
const chipBatch=thermalMesh(slotBoxes(rack,slots,[0,.36*th,0],[.72*tw,.18*th,.7*td],boardMat,'compute'),'junction');chipBatch.userData.dataSource=true;
for(let k=0;k<8;k++){const selected=slots.filter((_,i)=>i%8===k);if(selected.length)leds.push(slotBoxes(rack,selected,[.43*tw,.21*th,-.4*td],[.065*tw,.18*th,.1*td],lit,'compute'));}
trayRows=slots;
const railX=cabinet.columns*cabinet.pitchM[0]/2,railY=cabinet.rows*cabinet.pitchM[1]/2;
for(const side of [-1,1]){
 const x=side*railX,mid=(cabinet.rackZ0M+cabinet.rackZ1M)/2;
 for(const sign of [-1,1])box(rack,x,sign*railY,mid,.035,.035,cabinet.rackZ1M-cabinet.rackZ0M,electronicsMat,'structure');
 for(let i=0;i<=cabinet.bays;i++){const z=cabinet.rackZ0M+i*cabinet.pitchM[2];box(rack,x,0,z,.025,2*railY,.025,frameMat,'structure');}

}
for(let j=0;j<4;j++){const x=(j-1.5)*w*.20;thermalMesh(box(internal,x,-hgt*.06,l*.408,w*.185,hgt*.64,l*.13,batteryMat,'battery'),'battery');box(internal,x,hgt*.277,l*.408,w*.177,beam*.4,l*.128,batteryMat,'battery');thermalMesh(box(internal,x,hgt*.02,l*.48,w*.1,hgt*.40,beam*.2,batteryMat,'battery'),'battery');}// Model storage modules as removable drive sleds beside their independent data switch.
// Storage stations are body metres. The retained equipment drawing has a
// longitudinal scale/translation, so convert the installed centre before
// attaching its full-size sled assembly; never apply the body Z twice.
const storageStation=propulsion.stations.storage;
const recorder=join(internal,storageStation[0],storageStation[1],(storageStation[2]-propulsion.equipmentCenterZ)*l/propulsion.equipmentLengthM,'storage'),avionics=join(internal,-w*.313,hgt*.05,-l*.401,'avionics');
const driveCount=Math.max(1,Math.ceil(h.storageTB/h.input.diskModuleTB)),shownDrives=Math.min(12,driveCount),driveStep=Math.min(hgt*.145,hgt*.66/shownDrives),rackHeight=driveStep*shownDrives;
for(const side of [-1,1])box(recorder,side*w*.269,0,0,w*.017,rackHeight+beam*.55,l*.137,frameMat,'storage');
for(let j=0;j<shownDrives;j++){const y=(j+.5-shownDrives/2)*driveStep;
 box(recorder,0,y,0,w*.512,driveStep*.80,l*.132,electronicsMat,'storage');box(recorder,0,y,-l*.069,w*.515,driveStep*.85,beam*.13,electronicsMat,'storage');
 box(recorder,-w*.14,y,-l*.074,w*.123,driveStep*.29,beam*.12,electronicsMat,'storage');box(recorder,w*.205,y,-l*.074,beam*.30,driveStep*.27,beam*.12,electronicsMat,'storage');
 for(const k of [-1,0,1])box(recorder,k*w*.052,y,-l*.074,w*.022,driveStep*.29,beam*.10,electronicsMat,'storage');
}
box(avionics,0,0,0,w*.20,hgt*.37,l*.13,electronicsMat,'avionics');
for(let i=0;i<4;i++){const y=hgt*(.12-.080*i);box(avionics,0,y,-l*.066,w*.198,beam*.29,beam*.17,electronicsMat,'avionics');for(let j=0;j<3;j++)box(avionics,w*(j-1)*.056,y,-l*.070,w*.032,beam*.14,beam*.16,electronicsMat,'avionics');}
// Three body-axis magnetic bars implement the installed torquer cluster.
const torquers=[];
for(let axis=0;axis<3;axis++){const p=join(internal,-w*.34+(axis===0?w*.11:0),hgt*.29,-l*.19+axis*l*.075,'torquer');
 const len=Math.min(w*.31,l*.18),r=beam*.33,bar=cyl(p,0,0,0,r,r,len,rodMat,'torquer',24);for(let n=0;n<4;n++)cyl(p,0,len*(n-1.5)*.19,0,r*1.10,r*1.10,len*.13,windingMat,'torquer',24);
 if(axis===0)p.rotation.z=Math.PI/2;if(axis===2)p.rotation.x=Math.PI/2;torquers.push(p);
}
// Four physical mechanisms occupy a transverse forward face outside the rack allocation.
const gyroPack=join(root,0,0,0,'cmg');gyroPack.visible=false;
const dims=propulsion.installDims['04.01'],gyroAxes=clusterState([0,0,0,0],1);
for(const [i,station] of propulsion.stations['04.01'].entries()){
 const g=join(gyroPack,...station,'cmg'),r=.46*Math.min(dims[0],dims[1]);
 const x=new T.Vector3(...gyroAxes.rotorAxes[i]),z=new T.Vector3(...gyroAxes.gimbalAxes[i]),y=z.clone().cross(x).normalize();
 const mount=join(g,0,0,0,'cmg');
 mount.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
 const gimbal=join(mount,0,0,0,'cmg'),spin=join(gimbal,0,0,0,'cmg');
 const rotor=cyl(spin,0,0,0,r*.73,r*.73,dims[2]*.45,gyroMat,'cmg');rotor.rotation.z=-Math.PI/2;
 const ring=new T.Mesh(new T.TorusGeometry(r,r*.075,12,48),gyroMat);ring.rotation.y=Math.PI/2;gimbal.add(ring);
 box(g,0,-dims[1]*.43,0,dims[0]*.89,dims[1]*.08,dims[2]*.96,gyroMat,'cmg');
 cmgs.push({g,gimbal,spin,rotor,index:i});
}
for(const e of propulsion.engines){
 const engine=join(root,e.x,e.y,e.z,'propulsion'),r=e.exitRadiusM,ht=e.throatZ-e.z;engine.rotation.x=Math.PI/2;
 engine.name='Thrust-deck engine';engines.push(engine);
 const flange=cyl(engine,0,deck-e.z,0,r*.93,r*.93,Math.min(.025,ht*.12),feedMat,'propulsion',36);
 const chamber=cyl(engine,0,(deck-e.z+ht)/2,0,r*.48,r*.42,Math.max(.008,deck-e.z-ht),feedMat,'propulsion',36);chamber.name='Injector and combustion chamber';cyl(engine,0,ht+(wallT+.062)/2,0,r*.34,r*.28,wallT+.082,feedMat,'propulsion',24).name='Deck-spanning injector manifold';
 cyl(engine,0,ht*.99,0,r*.25,r*.25,ht*.14,nozzleMat,'propulsion',32);
 // Continuous two-sided bell section with inner wall winding facing the bore.
 const profile=[[r,0],[r*.978,0],[r*.61,ht*.46],[r*.305,ht*.83],[r*.24,ht],[r*.28,ht],[r*.34,ht*.83],[r*.65,ht*.46],[r,0]].map(([x,y])=>new T.Vector2(x,y));
 // Lathe normals point outward when following the outer face upward.
 const bell=obj(engine,new T.LatheGeometry(profile.reverse(),48),nozzleMat,0,0,0,'propulsion');bell.name='Engine nozzle';
 const lip=new T.Mesh(new T.TorusGeometry(r*.989,r*.018,8,48),feedMat);lip.rotation.x=Math.PI/2;engine.add(lip);
 const len=Math.min(w*1.05,r*9),end=r+len*Math.tan(propulsion.plumeHalfAngleDeg*Math.PI/180);
 const plume=cyl(engine,0,-len/2,0,r,end,len,new T.MeshBasicMaterial({color:0x82cfff,transparent:true,opacity:.26,side:T.FrontSide,depthWrite:false}),'propulsion',40,true);
 engineeringGraphic(plume,'Illustrative exhaust plume');plume.visible=false;plumes.push(plume);
}
internal.scale.z=propulsion.equipmentLengthM/l;internal.position.z=propulsion.equipmentCenterZ;
const shelf=box(root,0,0,propulsion.forwardDeckZ,w*.94,hgt*.94,.017,frameMat,'structure');shelf.name='Aft tank support bulkhead';const shelfRouting=registerRoutingBox(shelf,'z',1,'equipment-bulkhead');shelfRouting.internal=true;routingWalls.push(shelfRouting);
const addRoutingFeedthrough=routingFeedthroughFactory({root,walls:routingWalls,dimensionsM:[w,hgt,l],material:wallMat,registry:routingFeedthroughs});
function legacyFluidLink(a,bb,{part='propulsion',radius=.01,name,parent=service,via=null,bendRadiusM=Math.max(.03,radius*4),circuitId=null,planRouting=false}={}){
 const tube=connectionTube(parent,{radius,material:part==='radiator'?tubeMat:feedMat,part,name,bendRadiusM,segments:96,radialSegments:8});tube.mesh.userData.fluidConnectionId=name;fluidConnections.push({id:name,name,a,b:bb,tube,parent,via,part,radiusM:radius,bendRadiusM,circuitId,planRouting});return tube;
}
const fluidFitting=(parent,point,normal,name,radius=.018)=>{const port=connectionAnchor(parent,point,normal,name);hollowFluidFitting(port,{outerRadiusM:radius,boreRadiusM:radius*.90,lengthM:.024,material:feedMat,part:'propulsion',name:name+' open fitting'});port.userData.routingOwnerId=parent.uuid;return port;};
for(const [i,e] of propulsion.engines.entries())addRoutingFeedthrough({id:'injector-deck-'+i,axis:'z',sign:-1,positionM:[e.x,e.y,-l/2],radiusM:e.exitRadiusM*.40+.012,part:'propulsion',straightM:.04});
const regulatorIn=fluidFitting(service,[regulator.position.x,regulator.position.y-.06,regulator.position.z],[0,-1,0],'Regulator inlet'),pressurant=propulsion.tanks.find(t=>t.id==='helium'),aftRail=-l/2+wallT+.028;
regulatorIn.userData.routingOwnerIds=[regulator.uuid,regulatorIn.uuid];
if(pressurant)legacyFluidLink(fluidFitting(tankMap.helium,[0,0,-pressurant.radiusM],[0,0,-1],'Pressurant outlet',.014),regulatorIn,{radius:.008,name:'Pressurant regulator line',via:(a,bb)=>{const y=-hgt*.36;return [v(a.x,a.y,aftRail),v(a.x,y,aftRail),v(bb.x,y,aftRail),v(bb.x,y,bb.z)];}});
for(const [tankIndex,tank] of propulsion.tanks.filter(t=>t.id!=='helium').entries()){
 const side=tankIndex?1:-1,frame=tankMap[tank.id],outlet=fluidFitting(frame,[0,-tank.radiusM,0],[0,-1,0],tank.id+' outlet'),press=fluidFitting(frame,[0,tank.radiusM,0],[0,1,0],tank.id+' pressurization inlet',.014),regulatorOut=fluidFitting(service,[regulator.position.x+side*.04,regulator.position.y+.06,regulator.position.z],[0,1,0],tank.id+' regulated outlet',.014);
 regulatorOut.userData.routingOwnerIds=[regulator.uuid,regulatorOut.uuid];
 legacyFluidLink(regulatorOut,press,{radius:.008,name:tank.id+' regulated pressurization',via:(a,bb)=>{const x=side*w*.40,y=bb.y+.18,leadY=a.y+.16+(tankIndex?.06:0);return [v(a.x,leadY,a.z),v(x,leadY,a.z),v(x,y,a.z),v(x,y,bb.z),v(bb.x,y,bb.z)];}});
 const manifold=join(service,side*w*.30,-hgt*.39,-l/2+.32,'propulsion');box(manifold,0,0,0,.13,.08,.09,feedMat,'propulsion');const inlet=fluidFitting(manifold,[0,.04,0],[0,1,0],tank.id+' manifold inlet');
 legacyFluidLink(outlet,inlet,{radius:.012,name:tank.id+' feed trunk',via:(a,bb)=>{const y=Math.min(a.y-.14,bb.y+.14);return [v(a.x,y,a.z),v(bb.x,y,a.z),v(bb.x,y,bb.z)];}});
 propulsion.engines.forEach((e,i)=>{const branch=fluidFitting(manifold,[(i-(propulsion.engines.length-1)/2)*.038,0,-.045],[0,0,-1],tank.id+' manifold branch '+(i+1),.016),engine=engines[i],len=e.throatZ-e.z,r=e.exitRadiusM,injector=fluidFitting(engine,[side*r*.14,len+wallT+.060,Math.sqrt((r*.34)**2-(r*.14)**2)],[side*.14,0,Math.sqrt(.34**2-.14**2)],tank.id+' injector fitting',.012);
 legacyFluidLink(branch,injector,{radius:.010,bendRadiusM:.035,name:tank.id+' injector feed '+(i+1),via:(a,bb)=>{const z=aftRail+(tankIndex?0:.022),y=-hgt*.30+.12+i*.055;return [v(a.x,a.y,z),v(a.x,y,z),v(bb.x,y,z),v(bb.x,bb.y,z)];}});});
}
const coolantPump=join(root,-w*.40,-hgt*.26,Math.max(...h.rackLayout.slots.map(s=>s.z))+h.rackLayout.slotDimensionsM[2]/2+.48,'radiator');coolantPump.name='Allocated coolant pump and distribution station';box(coolantPump,0,0,0,.32,.15,.38,tubeMat,'radiator');for(const z of [-1,1])cyl(coolantPump,0,.09,z*.10,.052,.052,.17,tubeMat,'radiator',24);
for(const side of [-1,1])box(coolantPump,0,.20,side*.10,.24,.05,.08,tubeMat,'radiator').name='Coolant bank distribution manifold';
const thermalPumps=[{root:coolantPump,positionM:coolantPump.position.toArray()}],coolantCollection=installColdPlateCollection({h,root,rack,pumps:thermalPumps,link:legacyFluidLink,coldPlateTopFactor:.265,kit:{box,cyl,join,v,material:tubeMat}});
// Return headers use the outboard aisle beyond the longitudinal rack rail.
for(const part of coolantCollection.parts)if(/return (header|riser) tee/.test(part.name))part.position.x-=.04;
for(const feed of legacyRootFeeds){
 const label=(feed.bankEnd<0?'Upper':'Lower')+' radiator '+(feed.side>0?'supply':'return'),port=addRoutingFeedthrough({id:label+' bulkhead',axis:'y',sign:feed.sign,positionM:feed.portPosition,radiusM:.026,part:'radiator',straightM:.08}),pumpPort=connectionAnchor(coolantPump,[(feed.bankEnd<0?-1:1)*.065,.225,feed.side*.10],[0,1,0],label+' pump manifold');pumpPort.userData.routingOwnerId=coolantPump.uuid;
 legacyFluidLink(pumpPort,port.inner,{part:'radiator',radius:.018,bendRadiusM:.108,parent:root,circuitId:'legacy-thermal-'+feed.bankEnd,name:label+' supported internal pipe',via:(a,bb)=>{const lead=a.clone().add(v(0,.28,0)),end=bb.clone().add(v(0,-feed.sign*.28,0));return [lead,v(lead.x,lead.y,end.z),v(end.x,lead.y,end.z),end];}});
 legacyFluidLink(port.boreIn,port.boreOut,{part:'radiator',radius:.018,bendRadiusM:0,parent:root,circuitId:'legacy-thermal-'+feed.bankEnd,name:label+' bulkhead passage',via:()=>[]});
 // Rise and cross behind the entire rotating pitch-plumbing disk. The final
 // axial approach is outside the moving rotor's X lane. Routing a fixed lead
 // aft from a forward bulkhead port crossed the rotating feeder at 58° cant.
 legacyFluidLink(port.outer,feed.target,{part:'radiator',radius:.018,bendRadiusM:.108,parent:root,circuitId:'legacy-thermal-'+feed.bankEnd,name:label+' fixed union feed',via:(a,bb)=>[v(a.x,bb.y,a.z),v(bb.x,bb.y,a.z)]});
}
for(const c of legacyRigidPassages)legacyFluidLink(c.a,c.b,{part:'radiator',radius:.018,bendRadiusM:0,parent:c.parent,circuitId:'legacy-thermal-'+c.bankEnd,name:c.name,via:()=>[]});
for(const c of legacyUnionLinks)legacyFluidLink(c.a,c.b,{part:'radiator',radius:.018,bendRadiusM:.108,parent:c.parent,circuitId:'legacy-thermal-'+c.bankEnd,name:c.name,via:c.via,planRouting:false});
// The last-leaf return crosses its outer face on a 240 mm stand-off.
// A loop extending beyond the leaf tip swings through the fixed root-feed
// plane while the folded pack pitches; this raised crossbar stays on the
// outside of the pack and preserves all four circular bend allowances.
for(const tip of legacyRadiatorTips){const x=kin.rw/2+F.returnOuterMarginM,a=tip.exits[1],bb=tip.exits[-1],y=tip.off+tip.end*F.returnStandOffM,z=kin.r-F.returnTipInsetM;legacyFluidLink(a,bb,{part:'radiator',radius:.018,bendRadiusM:.108,parent:tip.frame,circuitId:'legacy-thermal-'+tip.end,name:'Radiator '+tip.end+' closed return manifold',via:(p,q)=>[v(x,p.y,p.z),v(x,y,p.z),v(x,y,z),v(-x,y,z),v(-x,y,q.z),v(-x,q.y,q.z)]});}
// Promote each retained rigid thermal passage to the shared actual-buffer
// registry. End turns occur inside the depicted elbow/union components.
const retainedFluidPipes=[];root.traverse(o=>{if(o.isMesh&&o.userData.staticFluidLine)retainedFluidPipes.push(o);});
for(const [index,old] of retainedFluidPipes.entries()){
 const spec=old.userData.staticFluidLine,parent=old.parent,p=v(...spec.points[0]),q=v(...spec.points[1]),direction=q.clone().sub(p).normalize(),a=connectionAnchor(parent,p.toArray(),direction.toArray(),'Rigid pipe inlet '+index),bb=connectionAnchor(parent,q.toArray(),direction.clone().negate().toArray(),'Rigid pipe outlet '+index),name='Retained '+spec.role+' '+index;
 let owner=parent;while(owner&&!owner.userData.assembly)owner=owner.parent;const tube=connectionTube(parent,{radius:spec.radiusM,material:old.material,part:old.userData.part||'radiator',bendRadiusM:0,segments:96,radialSegments:8,name});tube.mesh.userData.fluidConnectionId=name;fluidConnections.push({id:name,name,a,b:bb,tube,parent,via:()=>[],part:'radiator',radiusM:spec.radiusM,bendRadiusM:0,circuitId:owner?.userData.assembly?.startsWith('bank ')?'legacy-thermal-'+owner.userData.assembly.slice(5):'retained-rigid-passages'});old.removeFromParent();
}
function updateLegacyFluidConnections(){root.updateMatrixWorld(true);for(const c of fluidConnections)if(!c.fromPort){if(c.staticSampledPoints){c.tube.update(c.staticSampledPoints,{sampled:true,minimumBendRadiusM:c.staticBendRadiusM});continue;}const a=anchorInFrame(c.a,c.parent),b=anchorInFrame(c.b,c.parent),r=c.bendRadiusM;c.tube.update(c.staticPlan||[a,...(c.via?c.via(a,b):[a.clone().addScaledVector(normalInFrame(c.a,c.parent),r*2.2),b.clone().addScaledVector(normalInFrame(c.b,c.parent),r*2.2)]),b]);}}
function updateHose(h){
 const p=anchorInFrame(h.fromPort,h.parent),q=anchorInFrame(h.toPort,h.parent);h.start.position.copy(p);h.end.position.copy(q);
 h.tube.update(constantLengthHingeRoute(p,q,{outward:normalInFrame(h.fromPort,h.parent),restLengthM:h.restLengthM,bendRadiusM:h.bendRadiusM}));
}
let installedAt=null,wingPitch,upperPitch,lowerPitch,upperRoll,lowerRoll;
function positionPanels(progress,attitude){
 const wp=attitude?.wingPitchDeg,up=attitude?.upperRadiatorPitchDeg,lp=attitude?.lowerRadiatorPitchDeg;
 const ur=attitude?.upperRadiatorRollDeg,lr=attitude?.lowerRadiatorRollDeg;
 const deploymentChanged=progress!==installedAt,radiatorsChanged=deploymentChanged||up!==upperPitch||lp!==lowerPitch||ur!==upperRoll||lr!==lowerRoll;
 if(!deploymentChanged&&wp===wingPitch&&!radiatorsChanged)return;
 installedAt=progress;wingPitch=wp;upperPitch=up;lowerPitch=lp;upperRoll=ur;lowerRoll=lr;
 const k=mechanismPose(kin,progress,h.input.solarTiltDeg,attitude);
 wings.forEach((w,i)=>{
  const m=k.wings[i],side=w.side;w.table.rotation.x=m.pitch;if(!deploymentChanged)return;w.tip.position.x=side*m.span;
  w.reel.position.y=m.rollRadius;w.reel.rotation.z=m.rollAngle;
  w.roll.scale.set(m.rollRadius,panelW+.04,m.rollRadius);w.stripe.position.y=m.rollRadius;
  w.discs.forEach(o=>o.scale.set(m.rollRadius+.009,.035,m.rollRadius+.009));
  w.surface.position.x=side*m.span*.5;w.surface.scale.x=m.span;w.surface.visible=m.span>.000001;
  // Physical texture pitch stays fixed as the blanket unrolls.
  planeMaterialUV(w.front,m.span,panelW,side);planeMaterialUV(w.back,m.span,panelW,side);
  for(const [j,boom] of w.booms.entries()){const z=(j?1:-1)*(panelW*.5+.035);
   beamTo(boom,v(0,0,z),v(side*m.span,0,z));beamTo(w.axles[j],v(0,0,z),v(0,m.rollRadius,z));
   w.saddles[j].scale.x=1-.96*Math.min(1,Math.max(0,(progress-.015)/.025));
  }
 });
 if(!radiatorsChanged)return;
 rads.forEach((r,i)=>{const m=k.banks[i];r.pitchFrame.rotation.x=m.rootPitch;r.bank.rotation.z=m.roll;for(let j=1;j<r.frames.length;j++)r.frames[j].rotation.x=m.panelPitches[j]-m.panelPitches[j-1];
  for(const clip of r.clips)clip.scale.y=1-.96*Math.min(1,Math.max(0,(progress-(r.end<0?.42:.665))/.025));
 });
 appendages.updateWorldMatrix(true,true);hoses.forEach(updateHose);
}
positionPanels(1);updateLegacyFluidConnections();bindFluidJunctions(fluidConnections);let fluidRoutingPlans=planInitialFluidRoutes?planStaticFluidConnections(root,fluidConnections):[];updateLegacyFluidConnections();function replanFluidConnections(options={}){fluidRoutingPlans=planStaticFluidConnections(root,fluidConnections,options);updateLegacyFluidConnections();return fluidRoutingPlans;}function fluidRoutingSnapshot(options={}){const snapshot=flightFluidSnapshot(root,fluidConnections,options),connected=new Set(fluidConnections.flatMap(c=>[c.a.uuid,c.b.uuid])),issues=[];for(const channel of root.userData.fluidComponentChannels)for(const portId of channel.portIds)if(!connected.has(portId))issues.push({code:'unconnected-fluid-component-port',componentId:channel.componentId,portId,name:channel.name});snapshot.componentChannels=root.userData.fluidComponentChannels;snapshot.sectionValidation={...snapshot.sectionValidation,ok:snapshot.sectionValidation.ok&&!issues.length,issueCount:snapshot.sectionValidation.issueCount+issues.length,issues:[...snapshot.sectionValidation.issues,...issues]};return snapshot;}function auditFluidRouting(options={}){return auditFlightFluidSnapshot(fluidRoutingSnapshot(),options);}finalizeCraftMaterials(root);
return finish({root,internal,skin,enclosure,service,shelf,tankMap,engines,regulator:regulatorParts[0],walls,routingWalls,routingFeedthroughs,addRoutingFeedthrough,thermalPumps,coolantCollection,fluidConnections,get fluidRoutingPlans(){return fluidRoutingPlans;},replanFluidConnections,fluidRoutingSnapshot,auditFluidRouting,wings,panels,mechanismAudit,appendages,recorder,storageAccommodation:propulsion.storageAccommodation,avionics,rack,torquers,driveCount,shownDrives,trayRows,positionPanels,rads,cmgs,cells,leds,dish,optic,terminalGimbals:[kaGimbal,opticalGimbal],pointTerminals,patches,apertures,plumes,gyroPack,bw,bh,bl,wingspan:2*(panelL+kin.rootX),spanZ:kin.radRoot+kin.panelCount*kin.r*Math.SQRT1_2+Math.max(bl/2,-kin.center+kin.mountZ+panelW/2)});}
