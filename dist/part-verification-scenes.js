import * as T from './vendor/three.module.js';
import {temperatureColor} from './thermal-colors.js';
import {connectionTube} from './connection-geometry.js';
import {addGroundTube,routeAroundObstacles,planGroundConnection,groundConnectionRecords} from './ground-connection-routing.js';
import {obstacleFromMesh} from './routing-audit.js';
import {electricalKinds} from './electrical-architecture.js';
import {createFacilityEquipment} from './facility-geometry.js';
import {chooseFacilityAsset,assessFacilityFit} from './test-facilities.js';

// Named environmental systems use immutable, publicly documented dimensions.
// Other supports are bounded schematic work fixtures; they never imply a rated
// facility, prescribed test level or measured response. All dimensions are metres.
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const TYPES=new Set(['studio','installed','review','vibration','thermal-vacuum','thermal-cycle','acoustic','rf-chamber','optical-bench','load-frame','mass-properties','pressure-bench','electrical-bench','clean-inspection','deployment','fit-check','propulsion-stand','site-commissioning']);
const NAMES={review:'Review bench',vibration:'Vibration fixture','thermal-vacuum':'Thermal-vacuum chamber','thermal-cycle':'Temperature chamber',acoustic:'Reverberant acoustic bay','rf-chamber':'RF anechoic chamber','optical-bench':'Optical bench','load-frame':'Structural load frame','mass-properties':'Mass-properties station','pressure-bench':'Pressure and leak-test bay','electrical-bench':'Electrical checkout bench','clean-inspection':'Clean inspection station',deployment:'Deployment rehearsal bay','fit-check':'Interface fit fixture','propulsion-stand':'Propulsion test stand','site-commissioning':'Site commissioning area',studio:'Isolated part',installed:'Installed assembly'};
const palette={floor:'#1b2932',line:'#364c58',metal:'#7d909b',bright:'#bac8cd',dark:'#18262f',blue:'#345b72',teal:'#3e7d7b',mat:'#285457',cream:'#c5c9ba',yellow:'#d6ad57',white:'#d9e4e5',black:'#101820',copper:'#b97a54',red:'#a65b53',glass:'#80bdcc'};
const FACILITY_SETTINGS=new Set(['vibration','thermal-vacuum','thermal-cycle','acoustic','rf-chamber']);
const labelsFor={banana:'Banana · 18 cm',person:'Person · 1.75 m',ruler:'Ruler · 30 cm',container:'Container · 12.192 m',gauge:'Gauge block · 10 mm',pallet:'Pallet · 1.20 m'};

function inputSize(value){
 const source=value?.isVector3?[value.x,value.y,value.z]:Array.isArray(value)?value:[1,1,1];
 return V(...[source[0],source[1],source[2]].map(n=>Number.isFinite(Number(n))&&Number(n)>0?clamp(Number(n),.00001,1e6):.001));
}
function niceStep(value){const power=10**Math.floor(Math.log10(Math.max(.001,value))),fraction=value/power;return power*(fraction<=1?1:fraction<=2?2:fraction<=5?5:10);}

export function createVerificationSetting({kind='review',size=[1,1,1],scaleMode='auto',software=false,articlePorts=[],facilityAsset=null,facilityFit=null}={}){
 kind=TYPES.has(kind)?kind:'review';scaleMode=['auto','none','banana','person','ruler','container'].includes(scaleMode)?scaleMode:'auto';
 const dimensions=inputSize(size),span=Math.max(dimensions.x,dimensions.y,dimensions.z),footprint=Math.max(dimensions.x,dimensions.z),small=span<1.25;
 const root=new T.Group();root.name=NAMES[kind];root.userData.verificationSetting=true;
 const selectedAsset=facilityAsset|| (FACILITY_SETTINGS.has(kind)?chooseFacilityAsset(kind,{sizeM:dimensions.toArray()}):null),selectedFit=selectedAsset?(facilityFit||assessFacilityFit(selectedAsset,{sizeM:dimensions.toArray()})):null;
 let facilityEquipment=null,facilityPlacement=null;
 const routingIssues=[];let cableSerial=0;
 const placement=V(),contentOffset=V(),fitBounds=new T.Box3(),labels=[],references=[],geometries=new Set(),materials=new Set(),primitiveCache=new Map(),materialCache=new Map(),updaters=[],inspectionWalls=[],thermalProbes=[];
 const segments=software?12:20,motion=new T.Group();root.add(motion);motion.name='Fixture motion group';
 let supportWidth=dimensions.x,supportDepth=dimensions.z,referenceY=0,referenceSide=1,referenceEdge=0,background=0x111d27,disposed=false;
 function material(key,options={}){const signature=key+JSON.stringify(options);if(materialCache.has(signature))return materialCache.get(signature);const {basic,...appearance}=options;const m=basic?new T.MeshBasicMaterial({color:palette[key]||key,...appearance}):new T.MeshStandardMaterial({color:palette[key]||key,roughness:.64,metalness:['metal','bright','copper'].includes(key)?.55:.05,...appearance});m.userData.verificationFixture=true;materials.add(m);materialCache.set(signature,m);return m;}
 function geometry(key,create){if(!primitiveCache.has(key)){const g=create();geometries.add(g);primitiveCache.set(key,g);}return primitiveCache.get(key);}
 function mesh(g,m,x=0,y=0,z=0,parent=root,name='Fixture'){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.name=name;o.userData.verificationFixture=true;o.castShadow=false;o.receiveShadow=false;parent.add(o);return o;}
 function box(w,h,d,x=0,y=0,z=0,key='metal',parent=root,name='Fixture'){const o=mesh(geometry('box',()=>new T.BoxGeometry(1,1,1)),material(key),x,y,z,parent,name);o.scale.set(Math.max(.00001,w),Math.max(.00001,h),Math.max(.00001,d));return o;}
 function cylinder(r,h,x=0,y=0,z=0,key='metal',parent=root,name='Cylinder',top=1){const o=mesh(geometry('cylinder-'+top,()=>new T.CylinderGeometry(top,1,1,segments,1)),material(key),x,y,z,parent,name);o.scale.set(r,h,r);return o;}
 function sphere(r,x,y,z,key='white',parent=root,name='Sphere'){const o=mesh(geometry('sphere',()=>new T.SphereGeometry(1,software?10:16,software?6:10)),material(key),x,y,z,parent,name);o.scale.setScalar(r);return o;}
 function between(a,b,r,key='metal',parent=root,name='Tube'){const direction=b.clone().sub(a),o=cylinder(r,direction.length(),...a.clone().add(b).multiplyScalar(.5).toArray(),key,parent,name);o.quaternion.setFromUnitVectors(V(0,1,0),direction.normalize());return o;}
 function line(points,key='line',parent=root,name='Marking',closed=false){const g=new T.BufferGeometry().setFromPoints(closed?[...points,points[0]]:points);geometries.add(g);const signature='line-'+key;let m=materialCache.get(signature);if(!m){m=new T.LineBasicMaterial({color:palette[key]||key,toneMapped:false});materialCache.set(signature,m);materials.add(m);}const o=new T.Line(g,m);o.name=name;parent.add(o);return o;}
 function segmentsLine(points,key='line',parent=root,name='Markings'){if(points.length<2)return null;const g=new T.BufferGeometry().setFromPoints(points);geometries.add(g);const signature='line-'+key;let m=materialCache.get(signature);if(!m){m=new T.LineBasicMaterial({color:palette[key]||key,toneMapped:false});materialCache.set(signature,m);materials.add(m);}const o=new T.LineSegments(g,m);o.name=name;parent.add(o);return o;}
 function ring(radius,tube,x,y,z,key='metal',parent=root,arc=Math.PI*2,rotation=0){const g=new T.TorusGeometry(radius,tube,software?5:7,software?28:48,arc);geometries.add(g);const o=mesh(g,material(key),x,y,z,parent,'Chamber flange');o.rotation.z=rotation;return o;}
 function wallSurface(wall,object){
  const source=object.material;let own=wall.materials.get(source);if(!own){own=source.clone();own.userData={...source.userData,inspectionWall:true};own.transparent=true;own.forceSinglePass=true;materials.add(own);wall.materials.set(source,own);}object.material=own;object.userData.inspectionWall=true;return object;
 }
 function inspectionWall(object,shape={kind:'box'}){const wall={object,shape,materials:new Map(),cutaway:false};wallSurface(wall,object);inspectionWalls.push(wall);return wall;}
 function arcShell(radius,length,cx,cy,cz,key='metal',start=Math.PI*.50,sweep=Math.PI*1.50,parent=root){
  const count=software?28:48,positions=[],normals=[];
  for(let i=0;i<=count;i++){const a=start+i/count*sweep,c=Math.cos(a),s=Math.sin(a);for(const z of [-length/2,length/2]){positions.push(cx+radius*c,cy+radius*s,cz+z);normals.push(c,s,0);}}
  const indices=[];for(let i=0;i<count;i++){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setIndex(indices);geometries.add(g);const object=mesh(g,material(key,{side:T.DoubleSide}),0,0,0,parent,'Cutaway chamber shell');inspectionWall(object,{kind:'arc',radius,length,cx,cy,cz,start,sweep});return object;
 }
 function include(min,max){fitBounds.union(new T.Box3(min,max));}
 function includeObject(object){root.updateMatrixWorld(true);fitBounds.union(new T.Box3().setFromObject(object));}
 function label(text,position,type='fixture'){labels.push({text,position,type});}
 function includePart(){include(V(placement.x-dimensions.x/2,placement.y,placement.z-dimensions.z/2),V(placement.x+dimensions.x/2,placement.y+dimensions.y,placement.z+dimensions.z/2));}
 function floor(w,d,y=0){
  const margin=Math.max(1,Math.max(w,d)*.35),ww=w+margin*2,dd=d+margin*2;
  const thickness=Math.max(.015,Math.min(.2,span*.025));box(ww,thickness,dd,0,y-thickness*.5,0,'floor',root,'Facility floor');
  const step=niceStep(Math.max(w,d)/7),pts=[];for(let x=-Math.floor(ww/(2*step))*step;x<=ww/2;x+=step)pts.push(V(x,y+.001,-dd/2),V(x,y+.001,dd/2));for(let z=-Math.floor(dd/(2*step))*step;z<=dd/2;z+=step)pts.push(V(-ww/2,y+.001,z),V(ww/2,y+.001,z));segmentsLine(pts,'line',root,'Metric floor grid');
  line([V(-w/2,y+.006,d/2),V(w/2,y+.006,d/2),V(w/2,y+.006,-d/2)],'yellow',root,'Fixture area boundary');
  return step;
 }
 function feet(w,d,y,r=.055,parent=root){for(const x of [-1,1])for(const z of [-1,1]){cylinder(r,.035,x*w/2,y+.0175,z*d/2,'black',parent,'Isolation foot');}}
 function bench({w=Math.max(1.35,dimensions.x+.45),d=Math.max(.75,dimensions.z+.35),y=.9,mat='mat',parent=root,legs=true}={}){
  w=Math.min(2.4,w);d=Math.min(1.2,d);
  const thick=.045,leg=.045;box(w,thick,d,0,y-thick/2,0,'bright',parent,'Worktop edge');box(w-.018,.009,d-.018,0,y+.0045,0,mat,parent,'Work surface');
  if(legs){for(const x of [-1,1])for(const z of [-1,1])box(leg,y-thick,leg,x*(w*.5-.07),(y-thick)*.5,z*(d*.5-.07),'metal',parent,'Bench extrusion');box(w-.12,.04,.04,0,.18,-d*.5+.07,'metal',parent,'Bench stretcher');feet(w-.14,d-.14,0,.04,parent);}
  supportWidth=w;supportDepth=d;referenceY=y+.01;return y+.01;
 }
 function stand({w=Math.max(.65,dimensions.x+.26),d=Math.max(.6,dimensions.z+.26),y=.5,mat='bright',parent=root}={}){
  w=Math.min(4,w);d=Math.min(3.5,d);
  const t=Math.max(.035,Math.min(.16,Math.max(w,d)*.025)),legs=Math.max(.06,Math.min(.3,Math.max(w,d)*.035));box(w,t,d,0,y-t*.5,0,mat,parent,'Fixture mounting plate');
  for(const x of [-1,1])for(const z of [-1,1])box(legs,y-t,legs,x*(w*.5-legs),(y-t)*.5,z*(d*.5-legs),'blue',parent,'Stand leg');
  feet(Math.max(.1,w-legs*2),Math.max(.1,d-legs*2),0,Math.min(.2,legs*.75),parent);supportWidth=w;supportDepth=d;referenceY=y;return y;
 }
 function bolts(w,d,y,parent=root,count=4){const radius=Math.max(.003,Math.min(.018,Math.min(w,d)*.015));for(let i=0;i<count;i++){const a=2*Math.PI*i/count+Math.PI/4;cylinder(radius,radius*.45,Math.cos(a)*w*.43,y+radius*.23,Math.sin(a)*d*.43,'dark',parent,'Mounting bolt');}}
 function rack(x,z,height=1.25,width=.47,parent=root){
  const depth=width*.82;box(width,height,depth,x,height/2,z,'blue',parent,'Instrument rack');box(width*.89,height*.88,.015,x,height*.52,z+depth/2+.005,'dark',parent,'Rack front');
  for(let i=0;i<3;i++){const y=height*(.28+i*.23);box(width*.77,height*.16,.03,x,y,z+depth*.53,'metal',parent,'Rack instrument');box(width*.34,height*.078,.006,x-width*.14,y,z+depth*.58,'black',parent,'Instrument display');line([V(x-width*.275,y,z+depth*.60),V(x-width*.22,y+height*.02,z+depth*.60),V(x-width*.16,y-height*.012,z+depth*.60),V(x-width*.10,y+height*.01,z+depth*.60)],'teal',parent,'Instrument trace symbol');for(const dx of [.16,.27]){const k=cylinder(width*.025,.009,x+width*dx,y,z+depth*.59,'dark',parent,'Instrument control');k.rotation.x=Math.PI/2;}}
  for(const dx of [-1,1])for(const dz of [-1,1])cylinder(.032,.035,x+dx*width*.37,.0175,z+dz*depth*.37,'black',parent,'Rack foot');return {x,z,width,height};
 }
 function cable(points,r=.006,key='dark',parent=root){const tube=addGroundTube(parent,{id:kind+':fixture-'+(++cableSerial),name:'Test harness',points,radiusM:r,bendRadiusM:r*6,material:material(key),segments:64});geometries.add(tube.mesh.geometry);return tube.mesh;}
 function pad(width,depth,y,parent=root){const t=clamp(span*.04,.0005,.012);width=Math.max(.005,Math.min(width,supportWidth-.01));depth=Math.max(.005,Math.min(depth,supportDepth-.01));box(width,t,depth,0,y+t*.5,0,'cream',parent,'Protective support pad');return y+t;}
 function platter(w,d,y,parent=root){box(w,.06,d,0,y-.03,0,'bright',parent,'Fixture platen');bolts(w,d,y,parent,8);return y;}
 function review(){
  placement.y=small?bench():stand({w:Math.max(.7,dimensions.x+.3),d:Math.max(.6,dimensions.z+.3),y:span>12?.65:.45});
  placement.y=pad(Math.max(.008,dimensions.x*1.05),Math.max(.008,dimensions.z*1.05),placement.y);
  const reach=Math.max(.002,Math.min(.45,span*.25));include(V(-dimensions.x/2-reach,Math.max(0,placement.y-Math.max(.002,span*.15)),-dimensions.z/2-reach),V(dimensions.x/2+reach,placement.y+dimensions.y+reach*.25,dimensions.z/2+reach));
  if(span>.8)include(V(-supportWidth/2,0,-supportDepth/2),V(supportWidth/2,placement.y,supportDepth/2));
  const x=-Math.max(dimensions.x*.5+.1,supportWidth*.38),z=supportDepth*.25;
  if(span>.08&&span<2){box(.12,.005,.18,x,referenceY+.003,z,'dark',root,'Traveler clipboard');box(.1,.001,.15,x,referenceY+.007,z+.003,'white',root,'Inspection traveler');}
  label(small?'Schematic review work surface':'Schematic support · no load rating',V(span<.1?-dimensions.x*.5-reach*.8:-supportWidth*.38,referenceY+Math.min(.03,span*.05),span<.1?-dimensions.z*.5-reach*.8:-supportDepth*.38));
 }

 // The open face of each rig faces the default camera (+X, +Y, +Z). A fixture
 // owns only its supports and instruments; the real part stays in the viewer.
 function footprintBounds(w,d,top,bottom=0){include(V(-w/2,bottom,-d/2),V(w/2,top,d/2));}
 function localScale(min=.12,max=.8){return clamp(span*.25,min,max);}
 function workSupport(mat='mat'){
  const y=small?bench({mat}):stand({w:Math.max(.7,dimensions.x+.35),d:Math.max(.65,dimensions.z+.35),y:.48,mat});
  placement.y=y;return y;
 }
 function instrument(x,y,z,width=.28,parent=root){
  const h=width*.42,d=width*.75;box(width,h,d,x,y+h/2,z,'cream',parent,'Bench instrument');box(width*.94,h*.8,.008,x,y+h*.52,z+d*.51,'metal',parent,'Instrument fascia');box(width*.48,h*.55,.008,x-width*.12,y+h*.54,z+d*.54,'black',parent,'Readout window');
  for(const dx of [.24,.36]){const knob=cylinder(width*.033,.014,x+width*dx,y+h*.53,z+d*.57,'dark',parent,'Instrument knob');knob.rotation.x=Math.PI/2;}
  return {width,height:h,depth:d};
 }
 function gauge(x,y,z,r=.07,parent=root){
  const caseMesh=cylinder(r,.032,x,y,z,'metal',parent,'Pressure gauge case');caseMesh.rotation.x=Math.PI/2;const face=cylinder(r*.87,.004,x,y,z+.018,'cream',parent,'Gauge face');face.rotation.x=Math.PI/2;
  const ticks=[];for(let i=0;i<9;i++){const a=Math.PI*.15+i/8*Math.PI*1.7;ticks.push(V(x+Math.cos(a)*r*.70,y+Math.sin(a)*r*.70,z+.022),V(x+Math.cos(a)*r*.56,y+Math.sin(a)*r*.56,z+.022));}segmentsLine(ticks,'dark',parent,'Illustrative dial graduations');line([V(x-r*.38,y+r*.28,z+.024),V(x,y,z+.024)],'red',parent,'Uncalibrated indicator');
 }
 function horn(x,y,z,w,h,length,key='cream',parent=root){
  const g=new T.BufferGeometry(),p=[],q=[];for(const zz of [0,-length])for(const xy of [[-1,-1],[1,-1],[1,1],[-1,1]])p.push(x+xy[0]*w*.5*(zz===0?1:.25),y+xy[1]*h*.5*(zz===0?1:.25),z+zz);for(let i=0;i<4;i++){const a=i,b=(i+1)%4;q.push(a,b,4+a,b,4+b,4+a);}g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(q);g.computeVertexNormals();geometries.add(g);mesh(g,material(key,{side:T.DoubleSide}),0,0,0,parent,'Horn aperture');box(w*.25,h*.25,.015,x,y,z-length,'dark',parent,'Horn throat');line([V(x-w*.5,y-h*.5,z),V(x+w*.5,y-h*.5,z),V(x+w*.5,y+h*.5,z),V(x-w*.5,y+h*.5,z)],'metal',parent,'Horn lip',true);
 }
 function panel(w,h,x,y,z,key='cream',parent=root){
  inspectionWall(box(w,h,.055,x,y,z,key,parent,'Facility wall panel'));for(const xx of [-1,1])box(.028,h,.075,x+xx*w*.48,y,z+.01,'metal',parent,'Panel edge frame');box(w,.03,.075,x,y+h*.48,z+.01,'metal',parent,'Panel upper frame');
 }
 function realFacility(){
  if(!selectedAsset?.geometry){
   review();label('No publicly dimensioned system selected',V(0,placement.y+dimensions.y+.15,0),'assumption');return;
  }
  facilityEquipment=createFacilityEquipment(selectedAsset,{software,cutaway:true,includeReference:false});
  root.name=selectedAsset.facilityName+' · '+selectedAsset.name;root.userData.facilityAssetId=selectedAsset.id;
  root.add(facilityEquipment.root);facilityPlacement=facilityEquipment.getArticlePlacement(dimensions.toArray());placement.copy(facilityPlacement.position);
  fitBounds.union(facilityEquipment.fitBounds);labels.push(...facilityEquipment.labels);
  const equipmentSize=facilityEquipment.bounds.getSize(V());supportWidth=equipmentSize.x;supportDepth=equipmentSize.z;referenceY=0;referenceEdge=Math.max(facilityEquipment.bounds.max.x,placement.x+dimensions.x*.5);
  if(facilityPlacement.outside)label('True-scale comparison · article outside system',placement.clone().add(V(-dimensions.x*.40,dimensions.y+.18,0)),'limit');
  label(selectedFit?.label||'Facility fit requires review',V(facilityEquipment.bounds.min.x,Math.max(.16,facilityEquipment.bounds.max.y+.5),facilityEquipment.bounds.max.z),'limit');
  if(facilityEquipment.animated){updaters.push(p=>{facilityEquipment.update(p);if(!facilityPlacement.outside)contentOffset.copy(facilityEquipment.contentOffset);});label('Illustrative 3 mm motion · not a test level',V(0,facilityEquipment.placement.y+.56,supportDepth*.35),'assumption');}
  if(!facilityPlacement.outside&&facilityEquipment.servicePorts.length){
   const articleBox=new T.Box3(placement.clone().add(V(-dimensions.x/2,0,-dimensions.z/2)),placement.clone().add(V(dimensions.x/2,dimensions.y,dimensions.z/2))),used=new Set();
   for(const feedthrough of facilityEquipment.servicePorts){
    const port=articlePorts.find(p=>!used.has(p.id)&&(feedthrough.kind.startsWith('fluid')?p.kind==='fluid':feedthrough.kind==='power'?p.kind==='power':p.kind!=='fluid'&&p.kind!=='power'));
    if(!port){const cap=between(feedthrough.inside,feedthrough.inside.clone().addScaledVector(feedthrough.normal,-.015),feedthrough.radiusM*.65,'dark',root,'Unused feedthrough protective cap');cap.userData.routingFitting=true;continue;}
    used.add(port.id);const start=(port.position?.clone?port.position.clone():V(...port.position)).add(placement),normal=port.normal?.clone?port.normal.clone():V(...(port.normal||[1,0,0])),radius=feedthrough.kind.startsWith('fluid')?.005:.003,bend=radius*6;
    try{
     const id=feedthrough.id+':internal',obstacles=[];root.updateMatrixWorld(true);root.traverse(node=>{if(node.isMesh&&!node.userData.groundConnection&&!node.userData.engineeringGraphic)obstacles.push(obstacleFromMesh(node,{id:node.name+':'+node.uuid}));});
     const aperture=new T.Box3().setFromPoints([start.clone().addScaledVector(normal,-.025),start.clone().addScaledVector(normal,.08)]).expandByScalar(radius+.003);
     obstacles.push({id:'article-body',type:'box',min:articleBox.min.toArray(),max:articleBox.max.toArray(),apertures:[{id:port.id,min:aperture.min.toArray(),max:aperture.max.toArray(),routeIds:[id]}]});
     const others=groundConnectionRecords(root).filter(r=>r.id!==feedthrough.id+':external'),points=planGroundConnection(start,feedthrough.outside,{id,radiusM:radius,bendRadiusM:bend,obstacles,otherRoutes:others,startNormal:normal,endNormal:feedthrough.normal.clone().negate(),bounds:facilityEquipment.dimensionBounds,lane:used.size});
     const tube=addGroundTube(root,{id:feedthrough.id+':internal',name:'Article '+feedthrough.kind+' through sealed chamber feedthrough',points,radiusM:radius,bendRadiusM:bend,fromNormal:normal,toNormal:feedthrough.normal.clone().negate(),material:material(feedthrough.kind==='power'?'yellow':feedthrough.kind==='data'?'teal':'copper'),segments:128});geometries.add(tube.mesh.geometry);tube.mesh.userData.articlePortId=port.id;tube.mesh.userData.feedthroughId=feedthrough.id;
     const relief=between(start,start.clone().addScaledVector(normal,radius*3),radius*1.6,'bright',root,'Article service connector strain relief');relief.geometry=geometry('open-connector',()=>new T.CylinderGeometry(1,1,1,segments,1,true));relief.userData.routingFitting=true;
    }catch(error){routingIssues.push({code:'NO_FEASIBLE_ARTICLE_ROUTE',port:port.id,message:error.message});label('Service route requires clearance review',start.clone().add(V(0,.1,0)),'limit');}
   }
   root.userData.articleServiceAllocation={connectedPortIds:[...used],unallocatedPortIds:articlePorts.filter(p=>!used.has(p.id)).map(p=>p.id),basis:'Selected checkout services; unused part connectors remain unallocated'};
  }
 }
 function opticalBench(){
  const w=Math.max(.85,dimensions.x+.55),d=Math.max(.65,dimensions.z+.65),y=small?bench({w,d,mat:'dark'}):stand({w,d,y:.55,mat:'dark'});placement.y=y+.025;referenceY=y;supportWidth=w;supportDepth=d;
  box(Math.max(.04,dimensions.x+Math.min(.10,span*.05)),.025,Math.max(.04,dimensions.z+Math.min(.10,span*.05)),0,y+.0125,0,'metal',root,'Kinematic mounting plate');
  const pts=[],pitch=Math.max(.025,niceStep(Math.max(w,d)/20));for(let ix=0;ix<15;ix++)for(let iz=0;iz<10;iz++){const x=-w*.46+ix*w*.92/14,z=-d*.44+iz*d*.88/9;if(Math.abs(x)<dimensions.x*.55&&Math.abs(z)<dimensions.z*.55)continue;pts.push(V(x,y+.011,z),V(x+Math.min(.004,pitch*.12),y+.011,z));}segmentsLine(pts,'metal',root,'Optical breadboard hole grid');
  const axisY=y+Math.max(.06,Math.min(.32,dimensions.y*.55)),z=dimensions.z*.5+.16,r=Math.max(.025,Math.min(.085,span*.12));
  for(const x of [-w*.35,w*.35]){between(V(x,y,z),V(x,axisY,z),.015,'bright');box(.10,.015,.09,x,y+.0075,z,'metal',root,'Optical post base');const optic=cylinder(r,.022,x,axisY,z,'blue',root,'Optic mount');optic.rotation.z=Math.PI/2;const glass=cylinder(r*.76,.023,x,axisY,z,'glass',root,'Collimator optical element');glass.rotation.z=Math.PI/2;}
  const barrel=cylinder(r*.65,Math.min(.2,w*.18),-w*.33,axisY,z,'dark',root,'Collimator barrel');barrel.rotation.z=Math.PI/2;
  line([V(-w*.25,axisY,z),V(w*.35,axisY,z)],'teal',root,'Illustrative optical alignment axis');
  include(V(-w*.5,span<.3?y-.09:0,-d*.5),V(w*.5,Math.max(y+dimensions.y+.10,axisY+r+.05),d*.5));
  label('Optical breadboard + kinematic mounts',V(-w*.23,y+.05,-d*.40));label('Illustrative alignment axis',V(w*.24,axisY+.05,z));
 }
 function loadFrame(){
  const margin=Math.max(.09,Math.min(1,span*.20)),w=Math.max(.32,dimensions.x+margin*2),d=Math.max(.30,dimensions.z+margin),post=Math.max(.022,Math.min(.25,w*.055)),base=span<.20?bench({w:1.1,d:.7,mat:'bright'})+.10:.18,amplitude=margin*.045,gap=clamp(span*.04,.01,.15),crossY=base+.025+dimensions.y+Math.max(post*1.25,margin*.65+post*.4)+gap+amplitude,h=Math.max(.32,crossY-base+post*2.25+amplitude+gap);
  box(w+post*3,.10,d+post*3,0,base-.05,0,'blue',root,'Load frame reaction bed');
  for(const sx of [-1,1]){cylinder(post,h,sx*w*.5,base+h*.5,-d*.18,'bright',root,'Load frame column');box(post*3,.045,d*.42,sx*w*.5,base-.075,-d*.18,'dark',root,'Column foundation');}
  const cross=new T.Group();root.add(cross);cross.position.y=crossY;cross.userData.routingMotion={kind:'sinusoidal-rigid-translation',axis:'y',centerM:crossY,amplitudeM:amplitude,cycles:1};box(w+post*3,post*2.5,d*.5,0,0,-d*.18,'blue',cross,'Moving crosshead');cylinder(post*1.35,margin*.65,0,-margin*.30,-d*.18,'metal',cross,'Loading actuator');cylinder(post*1.7,post*.8,0,-margin*.65,-d*.18,'copper',cross,'In-line load cell');
  box(w+post*3,post*2,d*.5,0,base+h,-d*.18,'blue',root,'Upper reaction beam');box(Math.max(.03,dimensions.x+Math.min(.10,margin*.3)),.025,Math.max(.03,dimensions.z+Math.min(.10,margin*.3)),0,base+.0125,0,'bright',root,'Item support platen');placement.y=base+.025;referenceY=base;referenceEdge=w*.65;supportWidth=w;supportDepth=d;
  if(span>.4){const ix=-w*.5-.32,rackH=Math.min(1.05,h),rackZ=-d*.1,source=V(ix,rackH*.40,rackZ+.32*.82/2+.045),target=V(-w*.34,base-.05,(d+post*3)/2+.045),laneZ=Math.max(source.z,target.z)+.18;rack(ix,rackZ,rackH,.32);between(source.clone().add(V(0,0,-.04)),source,.014,'bright',root,'Load rack signal connector');between(target.clone().add(V(0,0,-.04)),target,.014,'bright',root,'Reaction-bed sensor connector');cable([source,V(source.x,source.y,laneZ),V(target.x,source.y,laneZ),V(target.x,target.y,laneZ),target],.006);include(V(ix-.16,0,-d*.25),V(ix+.16,rackH,laneZ+.02));}
  footprintBounds(w+post*4,d+post*3,base+h+post,span<.2?base-.08:0);updaters.push(p=>{cross.position.y=crossY+Math.sin(p*Math.PI*2)*amplitude;});
  label('Reaction frame + crosshead',V(-w*.35,base+h+post,-d*.18));label('Load cell · schematic fixture',V(post*2,crossY-margin*.65,-d*.15));
 }
 function massProperties(){
  const w=Math.max(.16,dimensions.x+.16),d=Math.max(.14,dimensions.z+.14),y=small?bench({mat:'bright'}):.22;
  box(w+.04,.07,d+.04,0,y+.035,0,'blue',root,'Mass-properties base');const cellHeight=Math.max(.025,Math.min(.14,span*.06));
  for(const sx of [-1,1])for(const sz of [-1,1]){cylinder(Math.max(.012,Math.min(.09,w*.06)),cellHeight,sx*w*.35,y+.07+cellHeight*.5,sz*d*.35,'copper',root,'Support load cell');}
  placement.y=y+.07+cellHeight+.025;box(w,.025,d,0,placement.y-.0125,0,'bright',root,'Weighing platen');referenceY=placement.y;supportWidth=w;supportDepth=d;referenceEdge=w*.55;
  const r=Math.min(w,d)*.36,circle=[];for(let i=0;i<=36;i++)circle.push(V(Math.cos(i*Math.PI/18)*r,placement.y+.001,Math.sin(i*Math.PI/18)*r));line(circle,'teal',root,'Mass-properties platen center mark');segmentsLine([V(-w*.44,placement.y+.002,0),V(w*.44,placement.y+.002,0),V(0,placement.y+.002,-d*.44),V(0,placement.y+.002,d*.44)],'teal',root,'Platen axes');
  const ix=-w*.5-.13,iz=d*.28;instrument(ix,y,iz,.19);include(V(Math.min(-w*.52,ix-.10),span<.2?y-.05:0,-d*.55),V(w*.55,Math.max(placement.y+dimensions.y+.04,y+.12),d*.60));
  label('Weighing platen + load cells',V(-w*.29,placement.y+.025,-d*.40));
 }
 function pressureBench(){
  const y=workSupport('bright'),w=supportWidth,d=supportDepth,shieldH=Math.max(.35,Math.min(2.2,dimensions.y+.18));placement.y=pad(Math.max(.05,dimensions.x*1.03),Math.max(.05,dimensions.z*1.03),y);
  const manifoldX=-Math.max(dimensions.x*.5+.10,w*.28),manifoldY=y+Math.min(.22,shieldH*.5),manifoldZ=-d*.28;
  const shieldX=Math.min(-w*.5,manifoldX-.35);panel(w,shieldH,0,y+shieldH*.5,-d*.5,'blue');inspectionWall(box(.025,shieldH,d*.22,shieldX,y+shieldH*.5,-d*.37,'metal',root,'Protective side panel'));
  between(V(manifoldX-.09,manifoldY,manifoldZ),V(manifoldX+.09,manifoldY,manifoldZ),.013,'bright',root,'Pressure manifold');gauge(manifoldX,manifoldY+.08,manifoldZ,.055);
  for(const dx of [-.07,.07]){between(V(manifoldX+dx,manifoldY-.06,manifoldZ),V(manifoldX+dx,manifoldY+.02,manifoldZ),.012,'metal');box(.052,.008,.012,manifoldX+dx,manifoldY+.025,manifoldZ,'red',root,'Isolation valve handle');}
  const bottleX=shieldX-.13,bottleR=.08,bottleH=.65;const bottle=cylinder(bottleR,bottleH,bottleX,bottleH*.5,0,'teal',root,'Illustrative service-gas cylinder');sphere(bottleR,bottleX,bottleH,0,'teal');cylinder(.024,.08,bottleX,bottleH+.10,0,'metal',root,'Bottle valve');box(.22,.04,.24,bottleX,.02,0,'dark',root,'Bottle retaining base');
  const gasStart=V(bottleX,bottleH+.18,0),gasInlet=V(manifoldX-.12,manifoldY,manifoldZ),gasLane=manifoldX-.24,gasHigh=Math.max(gasStart.y+.15,manifoldY+.15);
  between(gasStart.clone().add(V(0,-.04,0)),gasStart,.014,'bright',root,'Gas bottle outlet fitting');between(gasInlet,gasInlet.clone().add(V(.03,0,0)),.013,'bright',root,'Manifold inlet fitting');
  cable([gasStart,V(bottleX,gasHigh,0),V(gasLane,gasHigh,0),V(gasLane,gasHigh,manifoldZ),V(gasLane,manifoldY,manifoldZ),gasInlet],.008,'dark');
  const fluidPort=articlePorts.find(p=>p.kind==='fluid');
  if(fluidPort){
   const end=fluidPort.position.clone().add(placement),normal=fluidPort.normal.clone(),lead=end.clone().addScaledVector(normal,.08),start=V(manifoldX+.12,manifoldY,manifoldZ),articleBox=new T.Box3(placement.clone().add(V(-dimensions.x/2,0,-dimensions.z/2)),placement.clone().add(V(dimensions.x/2,dimensions.y,dimensions.z/2))),aperture=new T.Box3().setFromPoints([end.clone().addScaledVector(normal,-.025),end.clone().addScaledVector(normal,.08)]).expandByScalar(.009),obstacles=[];
   root.updateMatrixWorld(true);root.traverse(node=>{if(node.isMesh&&!node.userData.groundConnection&&!node.userData.engineeringGraphic)obstacles.push(obstacleFromMesh(node,{id:node.name+':'+node.uuid}));});obstacles.push({id:'pressure-article-body',type:'box',min:articleBox.min.toArray(),max:articleBox.max.toArray(),apertures:[{id:fluidPort.id,min:aperture.min.toArray(),max:aperture.max.toArray(),routeIds:['pressure:article']}]});
   try{const points=planGroundConnection(start,end,{id:'pressure:article',radiusM:.006,bendRadiusM:.036,startNormal:V(1,0,0),endNormal:normal,obstacles,otherRoutes:groundConnectionRecords(root),bounds:new T.Box3().setFromObject(root).union(articleBox).expandByScalar(.3)}),tube=addGroundTube(root,{id:'pressure:article',name:'Connected pressure-test service hose',points,radiusM:.006,bendRadiusM:.036,fromNormal:V(1,0,0),toNormal:normal,material:material('copper')});geometries.add(tube.mesh.geometry);between(start.clone().add(V(-.03,0,0)),start,.013,'bright',root,'Manifold outlet fitting');between(end,lead.clone().lerp(end,.70),.011,'bright',root,'Pressure-test fitting');}catch(error){routingIssues.push({code:'NO_FEASIBLE_ARTICLE_ROUTE',port:fluidPort.id,message:error.message});label('Pressure service route requires clearance review',start.clone().add(V(0,.1,0)),'limit');}
  }
  else{const cap=cylinder(.018,.014,manifoldX+.095,manifoldY,manifoldZ,'bright',root,'Capped pressure-test outlet');cap.rotation.z=Math.PI/2;label('Capped manifold · article fitting not allocated',V(manifoldX,manifoldY+.24,manifoldZ));}
  referenceEdge=w*.5;include(V(bottleX-.12,span<.15?y-.10:0,-d*.55),V(w*.55,Math.max(y+shieldH,y+dimensions.y+.1),d*.55));
  label('Manifold + isolation valves',V(manifoldX,manifoldY+.17,manifoldZ));label('Protective test-bay screen',V(w*.28,y+shieldH,-d*.5));
 }
 function electricalBench(){
  const iw=span<.2?.20:.32,w=Math.max(small?1.35:.7,dimensions.x+iw*2+.24),d=Math.max(small?.75:.65,dimensions.z+.35),y=small?bench({w,d,mat:'mat'}):stand({w,d,y:.48,mat:'mat'});placement.y=pad(Math.max(.025,dimensions.x*1.04),Math.max(.025,dimensions.z*1.04),y);
  const ix=-Math.max(dimensions.x*.5+iw*.55+.035,w*.28),iz=-Math.max(d*.25,dimensions.z*.5+.15);instrument(ix,y,iz,iw);
  const panelW=Math.min(.28,w*.20),panelX=Math.max(dimensions.x*.5+panelW*.5+.035,w*.30),panelZ=-Math.max(d*.36,dimensions.z*.5+.12);box(panelW,.14,.035,panelX,y+.07,panelZ,'blue',root,'Breakout and test connector panel');
  const electricalPorts=articlePorts.filter(p=>p.kind!=='fluid'),selected=[];for(const port of electricalPorts)if(selected.length<3&&!selected.some(p=>p.kind===port.kind))selected.push(port);for(const port of electricalPorts)if(selected.length<3&&!selected.includes(port))selected.push(port);
  const connectorPoints=[];for(const [i,dx] of [-1,0,1].entries()){const connector=cylinder(.012,.012,panelX+dx*panelW*.26,y+.08,panelZ+.025,'bright',root,'Fixture connector');connector.rotation.x=Math.PI/2;connectorPoints.push(V(panelX+dx*panelW*.26,y+.08,panelZ+.031));if(!selected[i]){const cap=cylinder(.010,.008,panelX+dx*panelW*.26,y+.08,panelZ+.035,'dark',root,'Unused connector protective cap');cap.rotation.x=Math.PI/2;}}
  for(const [i,port] of selected.slice(0,3).entries()){
   const start=connectorPoints[i],end=(port.position?.clone?port.position.clone():V(...port.position)).add(placement),normal=port.normal?.clone?port.normal.clone():V(...(port.normal||[1,0,0])),kind=electricalKinds[port.kind]||electricalKinds.control,standOff=Math.max(.04,Math.min(.12,port.diameterM*2)),lead=end.clone().addScaledVector(normal,standOff),radius=Math.max(.0015,Math.min(.004,port.diameterM*.10));
   const articleBox=new T.Box3(placement.clone().add(V(-dimensions.x/2,0,-dimensions.z/2)),placement.clone().add(V(dimensions.x/2,dimensions.y,dimensions.z/2))),points=routeAroundObstacles(start,end,[articleBox],{clearanceM:radius+.008+i*.016,bendRadiusM:radius*6,startNormal:V(0,0,1),endNormal:normal,lane:i});
   const tube=addGroundTube(root,{id:'electrical:'+port.id,name:kind.label+' checkout lead · '+port.id,points,radiusM:radius,bendRadiusM:radius*6,fromNormal:V(0,0,1),toNormal:normal,material:material(kind.color),segments:96});geometries.add(tube.mesh.geometry);tube.mesh.userData.verificationFixture=true;tube.mesh.userData.articlePortId=port.id;
   // The diagnostic lead ends exactly on the part's known cable exit or card
   // backplane datum. Its collet shares that same axis and attachment point.
   const collet=between(end,lead.clone().lerp(end,.65),Math.max(radius*1.6,.003),'bright',root,'Checkout lead strain relief');collet.userData.articlePortId=port.id;
   const marker=sphere(Math.max(.004,radius*1.7),0,0,0,kind.color,root,'Illustrative checkout stimulus');marker.userData.engineeringGraphic=true;marker.visible=false;
   updaters.push(progress=>{marker.visible=progress>0&&progress<1;tube.pointAt(progress,marker.position);});
  }
  // Instruments connect to the rear of the breakout, with unused outputs
  // capped. An unmodeled article never gets a decorative loose-ended lead.
  const rear=V(panelX,y+.07,panelZ-.04),instrumentPort=V(ix+iw*.5+.025,y+iw*.16,iz);between(instrumentPort.clone().add(V(-.025,0,0)),instrumentPort,.009,'bright',root,'Instrument output connector');between(rear,rear.clone().add(V(0,0,.0225)),.009,'bright',root,'Breakout input connector');
  cable([instrumentPort,instrumentPort.clone().add(V(.06,0,0)),V(panelX,y+.022,panelZ-.10),rear],.004,'dark');
  const strapX=Math.max(w*.42,dimensions.x*.5+.05);ring(.027,.005,strapX,y+.012,d*.25,'dark',root);const ground=ring(.009,.004,strapX,y+.008,d*.33,'copper',root);ground.rotation.x=Math.PI/2;
  const h=Math.max(dimensions.y+.08,.18);include(V(Math.min(-dimensions.x*.5-.03,ix-iw*.55),span<.3?y-.09:0,Math.min(-d*.48,iz-iw*.45,panelZ-.15)),V(Math.max(dimensions.x*.5+.10,panelX+panelW*.55),y+h,d*.46));referenceEdge=dimensions.x*.5+.05;
  label('ESD work surface + breakout fixture',V(w*.20,y+.04,d*.40));label(selected.length?'Continuity / signal stimulus · illustrative':'Capped fixture · no allocated article connector',V(ix,y+iw*.48,iz));
 }
 function cleanInspection(){
  const y=workSupport('white'),w=supportWidth,d=supportDepth;placement.y=pad(Math.max(.025,dimensions.x*1.04),Math.max(.025,dimensions.z*1.04),y);
  const reach=Math.max(.02,Math.min(.5,span*.8)),baseX=-dimensions.x*.5-reach*.65,baseZ=-dimensions.z*.5-reach*.30,inspectY=y+dimensions.y+Math.max(.025,reach*.35),postTop=inspectY+reach*.20;
  const baseH=Math.min(.018,Math.max(.003,span*.08)),baseR=Math.max(.008,reach*.20);cylinder(baseR,baseH,baseX,y+baseH*.5,baseZ,'dark',root,'Inspection lamp base');between(V(baseX,y+baseH,baseZ),V(baseX,postTop,baseZ),Math.max(.002,reach*.025),'metal',root,'Inspection lamp post');between(V(baseX,postTop,baseZ),V(-dimensions.x*.23,inspectY,dimensions.z*.08),Math.max(.002,reach*.025),'metal',root,'Articulated inspection arm');
  const light=ring(Math.max(.008,reach*.20),Math.max(.002,reach*.04),-dimensions.x*.23,inspectY,dimensions.z*.08,'white');light.rotation.x=Math.PI/2;
  const lens=cylinder(Math.max(.006,reach*.14),.002,-dimensions.x*.23,inspectY+.001,dimensions.z*.08,'glass',root,'Inspection lens');lens.material=material('glass',{transparent:true,opacity:.24,depthWrite:false});
  const pts=[];const e=Math.max(.02,Math.min(.08,span*.10));for(const sx of [-1,1])for(const sz of [-1,1]){const xx=sx*(dimensions.x*.5+e),zz=sz*(dimensions.z*.5+e);pts.push(V(xx-sx*e*.5,y+.018,zz),V(xx,y+.018,zz),V(xx,y+.018,zz),V(xx,y+.018,zz-sz*e*.5));}segmentsLine(pts,'teal',root,'Inspection fiducials');
  include(V(baseX-baseR,span<.3?y-Math.max(.003,span*.15):0,Math.min(baseZ-baseR,-dimensions.z*.5-e)),V(dimensions.x*.5+e,postTop+Math.max(.002,reach*.04),dimensions.z*.5+e));
  label('Illuminated visual inspection',V(-dimensions.x*.23,inspectY+reach*.20,dimensions.z*.08));
 }
 function deployment(){
  const gap=Math.max(.25,Math.min(2,span*.15)),w=Math.max(1.2,dimensions.x+gap*2),d=Math.max(.9,dimensions.z+gap*2),y=.35,h=Math.max(1.8,dimensions.y+y+gap),post=Math.max(.055,Math.min(.28,w*.025));
  placement.y=stand({w:Math.max(.45,dimensions.x*.30),d:Math.max(.45,dimensions.z*.4),y,mat:'bright'});referenceY=y;
  // The overhead frame suggests gravity offload without attaching fictional
  // lifting points to the selected flight item.
  for(const sx of [-1,1]){box(post,h,post,sx*w*.5,h*.5,-d*.34,'blue',root,'Deployment gantry upright');box(post*4,.055,d*.60,sx*w*.5,.0275,-d*.25,'dark',root,'Gantry outrigger');}
  box(w+post*2,post*1.7,post*1.5,0,h,-d*.34,'blue',root,'Gravity-offload gantry beam');
  const trolley=new T.Group();root.add(trolley);trolley.position.set(-w*.20,h,-d*.34);box(post*3,post*.8,post*2,0,post*.4,0,'metal',trolley,'Offload trolley');
  const ropeZ=post*2,ropeBottom=-Math.max(.20,h-dimensions.y-y-gap*.4),ropeTop=-post*.95;box(post*1.3,post*.5,post*2,0,post*.2,post*1.2,'metal',trolley,'Outboard offload hoist support');
  between(V(0,ropeTop,ropeZ),V(0,ropeTop+post*.60,ropeZ),.012,'bright',trolley,'Offload rope exit guide');between(V(0,ropeBottom-.025,ropeZ),V(0,ropeBottom+.02,ropeZ),.010,'bright',trolley,'Offload hook ferrule');
  const rope=addGroundTube(trolley,{id:'deployment:parked-offload-rope',name:'Hoist rope to parked hook',points:[V(0,ropeTop,ropeZ),V(0,ropeBottom,ropeZ)],radiusM:.003,bendRadiusM:.018,material:material('cream'),segments:12});geometries.add(rope.mesh.geometry);const hook=ring(.025,.005,0,ropeBottom-.04,ropeZ,'metal',trolley,Math.PI*1.65);hook.name='Parked offload hook';
  trolley.userData.routingMotion={kind:'sinusoidal-rigid-translation',axis:'x',centerM:-w*.20,amplitudeM:w*.18,cycles:1};
  const envelope=[];const ex=dimensions.x*.5+gap*.45,ez=dimensions.z*.5+gap*.45;for(const sx of [-1,1])for(const sz of [-1,1]){envelope.push(V(sx*ex,y,sz*ez),V(sx*ex,y+dimensions.y,sz*ez));}segmentsLine(envelope,'teal',root,'Illustrative clearance envelope');line([V(-ex,y,ez),V(ex,y,ez),V(ex,y,-ez),V(-ex,y,-ez)],'teal',root,'Clearance footprint',true);
  footprintBounds(w+post*4,d,Math.max(h+post*2,y+dimensions.y));updaters.push(p=>{trolley.position.x=(-.2+.18*Math.sin(p*Math.PI*2))*w;});
  label('Gravity-offload rehearsal gantry',V(-w*.27,h+post*2,-d*.34));label('Clearance envelope · illustrative',V(ex,y+.05,ez));
 }
 function fitCheck(){
  // Actual mating hardware is supplied by the viewer as the surrounding
  // assembly. This scene contributes only a minimal cradle and alignment cues.
  const postR=Math.max(.002,Math.min(.025,span*.02)),w=Math.max(.06,dimensions.x*1.06,dimensions.x+postR*4+.02),d=Math.max(.06,dimensions.z*1.06),y=span<.40?bench({mat:'bright'}):stand({w,d,y:.32,mat:'bright'});
  const t=Math.max(.005,Math.min(.035,span*.04));box(w,t,d,0,y+t*.5,0,'cream',root,'Interface fit support');placement.y=y+t;referenceY=placement.y;supportWidth=w;supportDepth=d;
  const postH=Math.max(.015,Math.min(.18,dimensions.y*.2));for(const sx of [-1,1]){cylinder(postR,postH,sx*(dimensions.x*.5+postR+.006),placement.y+postH*.5,-d*.42,'copper',root,'Illustrative fixture datum pin');}
  line([V(-w*.60,placement.y+.002,0),V(-w*.56,placement.y+.002,0),V(w*.56,placement.y+.002,0),V(w*.60,placement.y+.002,0)],'teal',root,'Fixture alignment datum');
  include(V(-w*.6,span<.40?y-.06:0,-d*.55),V(w*.6,placement.y+dimensions.y+postH,d*.55));
  label('Interface support · actual parent shown',V(-w*.35,placement.y+.03,-d*.44));
 }
 function propulsionStand(){
  const clearance=Math.max(.22,Math.min(1.8,span*.20)),w=Math.max(.8,dimensions.x+clearance*2),d=Math.max(.9,dimensions.z+clearance*2),y=Math.max(.32,Math.min(1.2,dimensions.y*.2)),beam=Math.max(.045,Math.min(.30,w*.04));
  box(w*1.15,.16,d*1.35,0,.08,0,'cream',root,'Propulsion test foundation');
  for(const sx of [-1,1])for(const sz of [-1,1]){box(beam,y,beam,sx*w*.36,y*.5+.16,sz*d*.34,'blue',root,'Reaction stand column');}
  for(const sz of [-1,1])box(w*.8,beam,beam*1.3,0,y+.16,sz*d*.34,'metal',root,'Reaction stand beam');
  for(const sx of [-1,1])between(V(sx*w*.36,.20,-d*.34),V(sx*w*.36,y+.16,d*.34),beam*.30,'metal',root,'Reaction-frame diagonal');
  placement.y=y+.16+beam*.5;box(Math.max(.08,dimensions.x*.85),.04,Math.max(.08,dimensions.z*.85),0,placement.y-.02,0,'bright',root,'Propulsion mounting plate');referenceY=placement.y;supportWidth=w;supportDepth=d;
  const trenchW=w*.52,trenchZ=d*.56;box(trenchW,.012,d*.75,0,.168,trenchZ,'dark',root,'Reserved exhaust and service trench');line([V(-trenchW*.55,.18,trenchZ+d*.35),V(-trenchW*.55,.18,trenchZ-d*.40),V(trenchW*.55,.18,trenchZ-d*.40)],'yellow',root,'Test stand exclusion marking');
  const skidX=-w*.5-.45,skidZ=d*.25,serviceY=Math.max(.45,placement.y+.22),manifoldZ=-d*.53;
  box(.34,.34,.36,skidX,.27,skidZ,'blue',root,'Conditioned supply and recovery skid');
  box(.28,.12,.12,-w*.50,serviceY,manifoldZ,'metal',root,'Stand isolated service manifold');
  for(const [i,s] of [-1,1].entries()){
   const source=V(skidX+s*.09,.30,skidZ+.225),target=V(-w*.50+s*.075,serviceY,manifoldZ+.10),laneX=skidX-.24-i*.15,laneZ=source.z+.20+i*.15,high=serviceY+.30+i*.18;
   between(source.clone().add(V(0,0,-.045)),source,.021,'bright',root,'Stand service skid fitting');between(target.clone().add(V(0,0,-.04)),target,.021,'bright',root,'Stand manifold fitting');
   const tube=addGroundTube(root,{id:'propulsion-stand:'+ (i?'recovery':'supply'),name:i?'Conditioned recovery hose':'Conditioned supply hose',points:[source,V(source.x,source.y,laneZ),V(laneX,source.y,laneZ),V(laneX,high,laneZ),V(laneX,high,target.z+.20+i*.15),V(target.x,high,target.z+.20+i*.15),V(target.x,target.y,target.z+.20+i*.15),target],radiusM:.009,bendRadiusM:.054,material:material(i?'copper':'blue'),segments:128});geometries.add(tube.mesh.geometry);
   const cap=cylinder(.018,.014,target.x,serviceY,manifoldZ-.075,'dark',root,'Unallocated stand article outlet cap');cap.rotation.x=Math.PI/2;
  }
  label('Conditioned supply / recovery · article plumbing requires test ICD',V(skidX,.64,skidZ),'assumption');include(V(skidX-.55,0,manifoldZ-.15),V(-w*.35,serviceY+.60,d*.25+.65));
  footprintBounds(w*1.15,d*2.1,placement.y+dimensions.y+.10);label('Reaction frame + service interfaces',V(-w*.33,placement.y+.08,-d*.37));label('Reserved exhaust direction',V(0,.20,d*.83));
 }
 function siteCommissioning(){
  const padW=Math.max(2,dimensions.x*1.08+.5),padD=Math.max(2,dimensions.z*1.08+.5),slab=Math.max(.05,Math.min(.25,span*.02));box(padW,slab,padD,0,slab*.5,0,'cream',root,'Commissioning foundation');placement.y=slab;referenceY=slab;supportWidth=padW;supportDepth=padD;
  const surveyX=-padW*.5-Math.min(1.5,padW*.12),surveyZ=padD*.25,surveyH=1.55;for(let i=0;i<3;i++){const a=i*Math.PI*2/3;between(V(surveyX,.98,surveyZ),V(surveyX+Math.cos(a)*.34,.02,surveyZ+Math.sin(a)*.34),.018,'yellow',root,'Survey tripod leg');}box(.20,.18,.16,surveyX,surveyH,surveyZ,'yellow',root,'Survey instrument');const lens=cylinder(.038,.06,surveyX,surveyH,surveyZ+.11,'dark',root,'Survey telescope');lens.rotation.x=Math.PI/2;between(V(surveyX,.98,surveyZ),V(surveyX,1.48,surveyZ),.03,'metal');
  const roadZ=padD*.5+1.15,roadW=Math.max(3,padW);box(roadW,.025,1.7,0,.013,roadZ,'dark',root,'Service access lane');const marks=[];for(let i=0;i<7;i++){const x=-roadW*.45+i*roadW*.9/6;marks.push(V(x,.03,roadZ),V(x+roadW*.035,.03,roadZ));}segmentsLine(marks,'cream',root,'Service-lane centerline');
  box(.45,.9,.30,padW*.47,.45,-padD*.45,'blue',root,'Commissioning service cabinet');box(.35,.65,.008,padW*.47,.50,-padD*.45+.16,'metal',root,'Service cabinet access panel');
  include(V(surveyX-.40,0,-padD*.5),V(padW*.5,Math.max(placement.y+dimensions.y,1.65),padD*.5+.50));
  label('Survey datum + commissioned interfaces',V(surveyX,1.80,surveyZ));label('Civil foundation / access context',V(padW*.25,slab+.04,-padD*.46));
 }

 function addHuman(x,z){
  const g=new T.Group();g.name='1.75 m scale figure';root.add(g);
  const cover='cream',joint='metal';
  for(const s of [-1,1]){box(.105,.095,.24,s*.095,.0475,.025,'dark',g,'Boot');between(V(s*.095,.13,0),V(s*.09,.52,0),.061,cover,g,'Trouser lower leg');between(V(s*.09,.52,0),V(s*.09,.91,0),.08,cover,g,'Trouser upper leg');}
  const torso=sphere(1,0,1.145,0,cover,g,'Coverall torso');torso.scale.set(.215,.32,.13);box(.34,.065,.23,0,.935,0,joint,g,'Coverall belt');
  for(const s of [-1,1]){between(V(s*.18,1.37,0),V(s*.28,1.12,.015),.061,cover,g,'Sleeve');between(V(s*.28,1.12,.015),V(s*.28,.91,.05),.048,cover,g,'Forearm');const glove=sphere(.052,s*.28,.86,.05,'white',g,'Glove');glove.scale.y*=1.35;}
  cylinder(.052,.085,0,1.49,0,'white',g,'Collar');const head=sphere(1,0,1.62,0,'white',g,'Head and hood');head.scale.set(.10,.13,.105);const face=sphere(1,0,1.62,.093,'glass',g,'Face shield');face.scale.set(.073,.069,.02);
  line([V(0,1.42,.132),V(0,.97,.14)],'blue',g,'Coverall zip');g.position.set(x,0,z);return g;
 }
 function addBanana(x,y,z){
  const g=new T.Group();g.name='18 cm scale banana';root.add(g);const positions=[],normals=[],colors=[],indices=[],rings=software?12:20,sides=6;
  const colorA=new T.Color('#d6aa36'),colorB=new T.Color('#e8c751');
  for(let i=0;i<=rings;i++){const t=i/rings,xx=-.081+.162*t,yy=.025*Math.sin(t*Math.PI),rr=.012*Math.sin(Math.PI*t)**.58+.00065;for(let j=0;j<=sides;j++){const a=2*Math.PI*j/sides,c=Math.cos(a),s=Math.sin(a);positions.push(xx,yy+rr*c,rr*s);normals.push(-.4*Math.cos(t*Math.PI),c,s);const co=j%2?colorA:colorB;colors.push(co.r,co.g,co.b);}}
  for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,a+1,b,b,a+1,b+1);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();geometries.add(geo);mesh(geo,material('white',{vertexColors:true,roughness:.74}),0,.012,0,g,'Banana peel');between(V(-.081,.012,0),V(-.09,.007,0),.0025,'dark',g,'Banana tip');between(V(.081,.012,0),V(.09,.016,0),.0032,'copper',g,'Banana stem');
  // Keep the familiar comparison literal: the stems are part of the stated
  // length, so normalize only this reference geometry to exactly 0.18 m.
  g.updateMatrixWorld(true);const physical=new T.Box3().setFromObject(g);g.scale.x=.18/physical.getSize(V()).x;g.position.set(x,y-physical.min.y,z);return g;
 }
 function addRuler(x,y,z){
  const g=new T.Group();g.name='30 cm reference ruler';root.add(g);box(.3,.002,.026,0,.001,0,'bright',g,'Metric ruler');const pts=[];for(let i=0;i<=30;i++){const a=-.15+i*.01,l=i%5===0?.014:.007;pts.push(V(a,.0021,-.013),V(a,.0021,-.013+l));}segmentsLine(pts,'dark',g,'Centimeter and five-centimeter graduations');g.position.set(x,y,z);return g;
 }
 function addContainer(x,z){
  const g=new T.Group();g.name='12.192 m scale container';root.add(g);const w=12.192,h=2.591,d=2.438;box(w,h,d,0,h/2,0,'teal',g,'Forty-foot container');
  const stripe=software?14:22;for(let i=0;i<stripe;i++){const xx=-w/2+.25+i*(w-.5)/(stripe-1);box(.085,h-.20,.04,xx,h/2,d/2+.02,'blue',g,'Container corrugation');}
  for(const end of [-1,1]){box(.07,h,.07,end*(w/2-.035),h/2,d/2+.02,'bright',g,'Corner casting');box(w,.07,.07,0,end===1?h-.035:.035,d/2+.02,'bright',g,'Container rail');}
  g.position.set(x,0,z);return g;
 }
 function addGauge(x,y,z){const g=new T.Group();g.name='10 mm gauge block';root.add(g);box(.01,.01,.01,0,.005,0,'bright',g,'Ten millimeter reference block');line([V(-.005,.0101,-.005),V(.005,.0101,-.005),V(.005,.0101,.005)],'dark',g,'Gauge block edges');g.position.set(x,y,z);return g;}
 function addPallet(x,z){const g=new T.Group();g.name='1.20 m reference pallet';root.add(g);for(const zz of [-.4,0,.4])box(1.2,.09,.12,0,.045,zz,'copper',g,'Pallet bearer');for(let i=0;i<6;i++)box(.16,.035,1,i*.205-.5125,.1075,0,'cream',g,'Pallet deck board');g.position.set(x,0,z);return g;}
 function scaleReference(type,secondary=false){
  const metric={banana:.18,ruler:.3,person:1.75,container:12.192,gauge:.01,pallet:1.2},length=metric[type];
  const floorStanding=['person','container','pallet'].includes(type),edge=Math.max(dimensions.x*.5,referenceEdge,floorStanding?supportWidth*.5:0),gap=Math.max(type==='gauge'?.004:.035,Math.min(.65,Math.max(dimensions.x,dimensions.z)*.12));
  const width=type==='person'?.66:type==='pallet'?1.2:length;
  let x=referenceSide*(edge+gap+width*.5),z=Math.max(.02,dimensions.z*.23);
  if(secondary){x+=referenceSide*(type==='person'?.6:width*.7);z+=Math.max(.2,Math.min(2,dimensions.z*.15));}
  const y=floorStanding?0:referenceY;
  let object;if(type==='person')object=addHuman(x,z);else if(type==='banana')object=addBanana(x,y,z);else if(type==='ruler')object=addRuler(x,y,z);else if(type==='container')object=addContainer(x,z);else if(type==='pallet')object=addPallet(x,z);else object=addGauge(x,y,z);
  // A comparison prop outside a chamber has its own shelf, rather than
  // floating in mid-air or appearing inside the controlled test volume.
  if(y>.02&&Math.abs(x)+width*.5>supportWidth*.5&&type!=='person'){const shelfW=Math.max(.10,width*1.2),shelfD=Math.max(.08,type==='banana'?.09:.06);box(shelfW,.015,shelfD,x,y-.0075,z,'metal',root,'Scale-reference shelf');if(span>.2)box(.025,y,.025,x,y*.5,z,'dark',root,'Scale-reference shelf post');}
  object.updateMatrixWorld(true);const b=new T.Box3().setFromObject(object);fitBounds.union(b);const anchor=b.getCenter(V());anchor.y=b.max.y+Math.max(.007,Math.min(.22,span*.04));
  label(labelsFor[type],anchor,'scale');references.push({name:labelsFor[type],sizeM:length,type,description:type==='person'?'Fixed 1.75 m figure; height does not change with the part.':type==='container'?'Illustrative 40 ft container at its stated overall length.':'Illustrative reference object at the stated physical size.',bounds:b.clone()});return object;
 }

 const builders={review,vibration:realFacility,'thermal-vacuum':realFacility,'thermal-cycle':realFacility,acoustic:realFacility,'rf-chamber':realFacility,'optical-bench':opticalBench,'load-frame':loadFrame,'mass-properties':massProperties,'pressure-bench':pressureBench,'electrical-bench':electricalBench,'clean-inspection':cleanInspection,deployment,'fit-check':fitCheck,'propulsion-stand':propulsionStand,'site-commissioning':siteCommissioning};
 if(kind!=='studio'&&kind!=='installed'){
  if(!FACILITY_SETTINGS.has(kind)&&(dimensions.x>4||dimensions.z>3.5||dimensions.y>6)){review();label('Comparison support only · no facility capacity claimed',V(0,placement.y+dimensions.y+.15,0),'assumption');}else (builders[kind]||review)();includePart();
  if(scaleMode!=='none'){
   if(scaleMode==='auto'){
    if(span<.075)scaleReference('gauge');else if(span<.85)scaleReference('banana');else if(span<9)scaleReference('person');else{scaleReference('container');if(span<40)scaleReference('person',true);}
   }else scaleReference(scaleMode);
  }
  if(!facilityEquipment){const ext=fitBounds.getSize(V());floor(Math.max(1.8,ext.x*1.3,supportWidth),Math.max(1.4,ext.z*1.4,supportDepth));}
 }else{includePart();background=0x0c141d;}
 if(['thermal-vacuum','thermal-cycle'].includes(kind)){
  // These symbols locate lumped model outputs. They are never presented as
  // installed thermocouples or measured data, and have no independent motion.
  const probeRadius=clamp(span*.012,.003,.055),g=geometry('thermal-probe',()=>new T.SphereGeometry(1,8,6));
  const points=[
   ['article',V(placement.x+dimensions.x*.50,placement.y+dimensions.y*.70,placement.z+dimensions.z*.50),'Article node'],
   ['interface',V(placement.x-dimensions.x*.40,placement.y,placement.z+dimensions.z*.40),'Interface node'],
   ['boundary',V(facilityEquipment?0:placement.x,facilityEquipment?facilityEquipment.dimensionBounds.max.y+.1:placement.y+dimensions.y+Math.min(1,Math.max(.07,span*.12)),facilityEquipment?facilityEquipment.dimensionBounds.min.z:placement.z-Math.max(dimensions.z*.5,.1)),'Controlled boundary']
  ];
  for(const [key,position,title] of points){const m=new T.MeshBasicMaterial({color:0x788d99,toneMapped:false});materials.add(m);const o=mesh(g,m,...position.toArray(),root,'Predicted '+title.toLowerCase());o.userData.engineeringGraphic=true;o.scale.setScalar(probeRadius);o.visible=false;const note={text:title,position:position.clone().add(V(0,probeRadius*3,0)),type:'thermal',hidden:true};labels.push(note);thermalProbes.push({key,object:o,label:note});}
 }
 const hollowNames=new Set(['Fixture connector','Instrument output connector','Breakout input connector','Checkout lead strain relief','Pressure-test fitting','Article service connector strain relief','Gas bottle outlet fitting','Manifold inlet fitting','Manifold outlet fitting','Load rack signal connector','Reaction-bed sensor connector','Stand service skid fitting','Stand manifold fitting','Offload rope exit guide','Offload hook ferrule']);root.traverse(node=>{if(node.isMesh&&hollowNames.has(node.name)){node.geometry=geometry('open-connector',()=>new T.CylinderGeometry(1,1,1,segments,1,true));node.userData.routingFitting=true;}});
 root.updateMatrixWorld(true);if(facilityEquipment&&articlePorts.length)fitBounds.union(new T.Box3().setFromObject(root));
 let objects=0,triangles=0,drawCalls=0;root.traverse(o=>{if(o.isMesh){objects++;drawCalls++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position?.count??0)/3;}else if(o.isLine){objects++;drawCalls++;}});
 const stats={objects,drawCalls,triangles:Math.round(triangles),materials:materials.size+(facilityEquipment?.stats.materials||0),kind,scaleMode,facilityAssetId:selectedAsset?.id||null,geometryScaleInvariant:!!facilityEquipment};
 // Inspect through only the enclosure surfaces between the eye and the item.
 // Nine fixed envelope samples and analytic box/disk/arc intersections keep
 // this independent of hardware polygon count and preserve real cutaway gaps.
 const inspectionTargets=[placement.clone().add(V(0,dimensions.y*.5,0))];
 for(const x of [-.49,.49])for(const y of [.01,.99])for(const z of [-.49,.49])inspectionTargets.push(placement.clone().add(V(dimensions.x*x,dimensions.y*y,dimensions.z*z)));
 const eyeWorld=V(),eyeLocal=V(),sample=V(),viewForward=V(),inverse=new T.Matrix4(),worldTargets=inspectionTargets.map(()=>V()),parallelOrigins=inspectionTargets.map(()=>V());
 function obstructs(a,b,shape){
  const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
  if(shape.kind==='disk'){
   if(Math.abs(dy)<1e-12)return false;const t=-a.y/dy;
   return t>1e-6&&t<1-1e-6&&(a.x+dx*t)**2+(a.z+dz*t)**2<=1;
  }
  if(shape.kind==='arc'){
   const x=a.x-shape.cx,y=a.y-shape.cy,A=dx*dx+dy*dy,B=x*dx+y*dy,C=x*x+y*y-shape.radius*shape.radius,D=B*B-A*C;
   if(A<1e-18||D<0)return false;const q=Math.sqrt(D);
   for(const t of [(-B-q)/A,(-B+q)/A])if(t>1e-6&&t<1-1e-6&&Math.abs(a.z+dz*t-shape.cz)<=shape.length*.5){const angle=(Math.atan2(y+dy*t,x+dx*t)-shape.start+Math.PI*4)%(Math.PI*2);if(angle<=shape.sweep)return true;}return false;
  }
  let enter=0,leave=1;
  for(const axis of ['x','y','z']){const d=b[axis]-a[axis];if(Math.abs(d)<1e-12){if(a[axis]<-.5||a[axis]>.5)return false;continue;}let t0=(-.5-a[axis])/d,t1=(.5-a[axis])/d;if(t0>t1)[t0,t1]=[t1,t0];enter=Math.max(enter,t0);leave=Math.min(leave,t1);if(enter>leave)return false;}
  return leave>1e-6&&enter<1-1e-6;
 }
 function updateCamera(camera){
  if(disposed||!camera?.getWorldPosition)return false;const facilityChanged=facilityEquipment?.updateCamera(camera)||false;if(!inspectionWalls.length){root.userData.inspectionCutaways=facilityEquipment?.root.userData.inspectionCutaways||0;return facilityChanged;}
  root.updateMatrixWorld(true);camera.getWorldPosition(eyeWorld);if(!eyeWorld.toArray().every(Number.isFinite))return false;let changed=false,count=0;
  if(camera.isOrthographicCamera)camera.getWorldDirection(viewForward);
  for(let i=0;i<inspectionTargets.length;i++){const point=worldTargets[i].copy(inspectionTargets[i]).add(contentOffset).applyMatrix4(root.matrixWorld);if(camera.isOrthographicCamera){const depth=sample.copy(point).sub(eyeWorld).dot(viewForward);parallelOrigins[i].copy(point).addScaledVector(viewForward,-Math.max(0,depth));}}
  for(const wall of inspectionWalls){
   inverse.copy(wall.object.matrixWorld).invert();eyeLocal.copy(eyeWorld).applyMatrix4(inverse);
   const blocked=worldTargets.some((point,i)=>{if(camera.isOrthographicCamera)eyeLocal.copy(parallelOrigins[i]).applyMatrix4(inverse);return obstructs(eyeLocal,sample.copy(point).applyMatrix4(inverse),wall.shape);});
   count+=Number(blocked);if(blocked===wall.cutaway)continue;wall.cutaway=blocked;changed=true;
   for(const m of wall.materials.values()){m.opacity=blocked?.09:1;m.depthWrite=!blocked;m.userData.inspectionCutaway=blocked;}
  }
  root.userData.inspectionCutaways=count;return changed||facilityChanged;
 }
 function update(progress=0){const p=clamp(Number(progress)||0,0,1);contentOffset.set(0,0,0);for(const callback of updaters)callback(p);root.updateMatrixWorld(true);}
 function setThermalState(state){
  if(disposed)return;
  for(const probe of thermalProbes){
   const boundary=Number.isFinite(state?.airK)?state.airK:state?.shroudK;
   const value=probe.key==='article'?state?.articleK:probe.key==='interface'?(Number.isFinite(state?.interfaceK)?state.interfaceK:state?.fixtureK):boundary;
   const title=probe.key==='article'?'Article node':probe.key==='interface'?(Number.isFinite(state?.interfaceK)?'Interface node':'Fixture boundary'):Number.isFinite(state?.airK)?'Air boundary':'Shroud boundary';
   probe.object.visible=Number.isFinite(value)&&state?.guides!==false;probe.label.hidden=!probe.object.visible;
   if(probe.object.visible){probe.object.material.color.setHex(temperatureColor(value,state?.scale||'full'));probe.label.text=title+' · '+value.toFixed(1)+' K · simulated';}
  }
 }
 function dispose(){if(disposed)return;disposed=true;facilityEquipment?.dispose();root.removeFromParent();root.clear();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();geometries.clear();materials.clear();}
 return {root,placement,contentOffset,routingIssues,getRoutingSnapshot:()=>({routes:groundConnectionRecords(root),issues:routingIssues}),facility:selectedAsset?{assetId:selectedAsset.id,facilityId:selectedAsset.facilityId,name:selectedAsset.name,facilityName:selectedAsset.facilityName,fit:selectedFit,outside:!!facilityPlacement?.outside,placementNote:facilityPlacement?.reason||null}:null,fitBounds,background,labels,references,update,updateCamera,setThermalState,dispose,stats,size:dimensions.clone(),kind,animated:updaters.length>0&&kind!=='electrical-bench',cameraDirection:V(1,.65,1).normalize()};
}
