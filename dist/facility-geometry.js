import * as T from './vendor/three.module.js';
import {addGroundTube,routeAroundObstacles} from './ground-connection-routing.js';

/**
 * Metric reconstruction of a named, source-dimensioned facility system.
 *
 * createFacilityEquipment(asset, {software,cutaway,includeReference}) returns:
 * root, available, bounds (equipment only), fitBounds (including scale figure),
 * dimensionBounds, workingBounds, placement, getArticlePlacement(sizeM), labels,
 * references, stats, background, cameraDirection, contentOffset, animated,
 * update(progress), updateCamera(camera), setCutaway(value), dispose().
 *
 * No article dimension is accepted by the builder. All published dimensions are
 * copied from the catalog. Skin thickness, supports, instruments and positioning
 * are identified as schematic. A chamber shell never becomes a working envelope.
 */
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const finitePositive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const COLORS={shell:0xa9b6ba,edge:0xd1d9d9,inner:0x1f3540,frame:0x456979,dark:0x14232b,floor:0x14222c,grid:0x29414b,blue:0x4c7b98,cyan:0x6dc6cc,amber:0xe2b96c,cream:0xb8c6bf,copper:0xb78758,reference:0x91c0c4};
const fmt=n=>Number(n.toPrecision(5)).toLocaleString('en-US',{maximumFractionDigits:4});
const unit=value=>fmt(value)+' m';

export function facilityEquipmentDimensions(asset){
 const g=asset?.geometry,d=g?.dimensions||{};if(!g)return null;
 let result;
 if(g.type==='cylinder-horizontal')result=[d.diameterM,d.diameterM,d.lengthM];
 else if(g.type==='cylinder-vertical')result=[d.diameterM,d.heightM??d.lengthM,d.diameterM];
 else if(g.type==='shaker-round')result=[d.diameterM,0,d.diameterM];
 else if(g.type==='shaker-square')result=[d.widthM,0,d.depthM];
 else if(g.type==='box-room')result=[d.widthM,d.heightM,d.depthM];
 else if(g.type==='bench')result=[d.widthM,d.heightM??0,d.depthM];
 return result&&result.every((n,i)=>finitePositive(n)||(i===1&&n===0))?result:null;
}

export function createFacilityEquipment(asset,{software=false,cutaway=true,includeReference=true}={}){
 const root=new T.Group(),body=new T.Group(),motion=new T.Group();root.name=asset?.name||'Undimensioned facility system';body.name='Fixed facility equipment';motion.name='Fixed-size shaker table';root.add(body);body.add(motion);
 const dimensionSize=facilityEquipmentDimensions(asset),available=!!dimensionSize,g=asset?.geometry||{},d=g.dimensions||{},type=g.type;
 const geometries=new Set(),materials=new Set(),geometryCache=new Map(),materialCache=new Map(),walls=[],labels=[],references=[];
 const bounds=new T.Box3(),fitBounds=new T.Box3(),dimensionBounds=new T.Box3(),workingBounds=new T.Box3(),placement=V(),contentOffset=V();
 const servicePorts=[],routingObstacles=[];
 const state={disposed:false,cutaway:!!cutaway};let datumY=0,centreY=0,workingVolume=null;
 const volumeReference=g.dimensionRole==='working-envelope'||g.representation==='wireframe-volume';
 const notionalContextType=volumeReference?(asset.kind==='acoustic'?'direct-field-speaker-array':asset.kind==='thermal-vacuum'?'cylindrical-vacuum-housing':'environmental-room'):null;
 const representationNote=volumeReference?(asset.kind==='acoustic'?'Published test-item volume in cyan; speaker sizes, layout and supports are notional.':asset.kind==='thermal-vacuum'?'Published volume in cyan; chamber contour, shell, liner, supports and service equipment are notional.':'Published extents in cyan; chamber walls, service clearance and supports are notional.'):'Published equipment dimensions; wall thickness, supports and service equipment are schematic.';
 const segments=software?24:48;
 root.userData={facilityAssetId:asset?.id||null,facilityId:asset?.facilityId||null,geometryType:type||null,dimensionRole:g.dimensionRole||null,dimensionsM:dimensionSize?.slice()||null,publishedDimensions:{...d},scaleReconstruction:true,schematicDetails:true,verificationFixture:true,publishedReferenceIsVolume:volumeReference,notionalContext:volumeReference,notionalContextType,representationNote,envelopeOnly:false,wireframeOnly:false};
 function geometry(key,build){if(!geometryCache.has(key)){const value=build();geometryCache.set(key,value);geometries.add(value);}return geometryCache.get(key);}
 function material(key,options={}){const cache=key+JSON.stringify(options);if(materialCache.has(cache))return materialCache.get(cache);const value=new T.MeshStandardMaterial({color:COLORS[key]??key,roughness:.65,metalness:['shell','edge','copper'].includes(key)?.45:.08,...options});value.userData.verificationFixture=true;materials.add(value);materialCache.set(cache,value);return value;}
 function mesh(geo,mat,name,x=0,y=0,z=0,parent=body){const node=new T.Mesh(geo,mat);node.name=name;node.position.set(x,y,z);node.userData.verificationFixture=true;parent.add(node);return node;}
 function box(w,h,l,x,y,z,key,name,parent=body){const node=mesh(geometry('box',()=>new T.BoxGeometry(1,1,1)),material(key),name,x,y,z,parent);node.scale.set(w,h,l);return node;}
 function cylinder(radius,height,x,y,z,key,name,parent=body,{open=false,axis='y'}={}){const node=mesh(geometry('cylinder-'+open,()=>new T.CylinderGeometry(1,1,1,segments,1,open)),material(key,{side:T.DoubleSide}),name,x,y,z,parent);node.scale.set(radius,height,radius);if(axis==='z')node.rotation.x=Math.PI/2;return node;}
 function sphere(radius,x,y,z,key,name,parent=body){const node=mesh(geometry('sphere',()=>new T.SphereGeometry(1,software?10:16,8)),material(key),name,x,y,z,parent);node.scale.setScalar(radius);return node;}
 function line(points,key,name,parent=body){const geo=new T.BufferGeometry().setFromPoints(points);geometries.add(geo);let mat=materialCache.get('line-'+key);if(!mat){mat=new T.LineBasicMaterial({color:COLORS[key]??key,transparent:true,opacity:1,toneMapped:false});materialCache.set('line-'+key,mat);materials.add(mat);}const node=new T.LineSegments(geo,mat);node.name=name;parent.add(node);return node;}
 function loop(points,key,name,parent=body){const expanded=[];for(let i=0;i<points.length;i++)expanded.push(points[i],points[(i+1)%points.length]);return line(expanded,key,name,parent);}
 function circle(radius,y,z,axis,key,name,parent=body){const points=[];for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;points.push(axis==='z'?V(Math.sin(a)*radius,y+Math.cos(a)*radius,z):V(Math.sin(a)*radius,y,Math.cos(a)*radius+z));}return loop(points,key,name,parent);}
 function tube(a,b,r,key,name,parent=body){const direction=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5),node=cylinder(r,direction.length(),...mid.toArray(),key,name,parent);node.quaternion.setFromUnitVectors(V(0,1,0),direction.normalize());return node;}
 function sourceNode(node,role,dimensions,sourceIds=g.sourceIds){node.userData={...node.userData,sourcedDimension:true,dimensionRole:role,dimensionsM:dimensions.slice(),sourceIds:[...(sourceIds||[])],facilityAssetId:asset.id};return node;}
 function schematic(node){node.userData.schematic=true;return node;}
 function wall(node,axis='shell',sign=0){const original=node.material,copy=original.clone();copy.transparent=true;copy.side=T.DoubleSide;copy.userData={...original.userData,inspectionWall:true};materials.add(copy);node.material=copy;node.userData.inspectionWall=true;walls.push({node,axis,sign,material:copy});return node;}
 function label(text,position,type='fixture'){labels.push({text,position,type});}
 function outlineBox(size,center,key,name,role,sourceIds){const [w,h,l]=size,[x,y,z]=center.toArray(),corners=[];for(const xx of [-1,1])for(const yy of [-1,1])for(const zz of [-1,1])corners.push(V(x+xx*w/2,y+yy*h/2,z+zz*l/2));const points=[];for(let i=0;i<8;i++)for(let j=i+1;j<8;j++){let changes=0;for(const axis of ['x','y','z'])changes+=Number(corners[i][axis]!==corners[j][axis]);if(changes===1)points.push(corners[i],corners[j]);}return sourceNode(line(points,key,name),role,size,sourceIds);}
 function markDimensions(){
  const [w,h,l]=dimensionSize,margin=clamp(Math.max(w,h,l)*.06,.08,.65),yy=dimensionBounds.min.y;
  if(type.startsWith('cylinder')){label('Ø '+unit(d.diameterM)+' · '+(g.dimensionRole||'published dimension').replaceAll('-',' '),V(-w*.36,dimensionBounds.max.y+margin,-l*.30),'dimension');label(unit(h===w?l:h)+' '+(type==='cylinder-horizontal'?'long':'high'),V(w*.56,yy+h*.42,l*.46),'dimension');}
  else if(type.startsWith('shaker'))label(type==='shaker-round'?'Ø '+unit(d.diameterM)+' table':unit(w)+' × '+unit(l)+' table',V(-w*.4,datumY+.15,-l*.35),'dimension');
  else if(type==='bench'&&!finitePositive(d.heightM))label(unit(w)+' × '+unit(l)+' published work surface',V(-w*.40,datumY+margin,-l*.35),'dimension');
  else label(unit(w)+' × '+unit(h)+' × '+unit(l)+' · '+(g.dimensionRole||'published dimensions').replaceAll('-',' '),V(-w*.40,dimensionBounds.max.y+margin,-l*.35),'dimension');
 }
 function rack(x,z){const w=.55,h=1.65,l=.60;schematic(box(w,h,l,x,h/2,z,'frame','Schematic instrumentation rack'));box(w*.88,h*.86,.012,x,h*.52,z+l*.51,'dark','Schematic rack face');for(let i=0;i<4;i++){box(w*.72,.19,.02,x,.37+i*.30,z+l*.53,'shell','Schematic instrument panel');box(.18,.075,.01,x-.1,.37+i*.30,z+l*.55,'cyan','Schematic instrument display');}}
 function cylinderChamber(){
  const horizontal=type==='cylinder-horizontal',r=d.diameterM/2,length=horizontal?d.lengthM:d.heightM??d.lengthM,axis=horizontal?'z':'y';datumY=horizontal?clamp(r*.10,.20,.70):.18;centreY=horizontal?datumY+r:datumY+length/2;
  const thickness=clamp(r*.012,.012,.12),skin=wall(cylinder(r,length,0,centreY,0,'shell','Published chamber boundary',body,{open:true,axis}));sourceNode(skin,g.dimensionRole,dimensionSize);
  const inner=cylinder(Math.max(.001,r-thickness),length,0,centreY,0,'inner','Schematic inner wall',body,{open:true,axis});wall(inner);
  if(horizontal){
   for(const z of [-length/2,length/2]){circle(r,centreY,z,'z','edge','Chamber flange datum');circle(r+thickness,centreY,z,'z','shell','Schematic flange outer edge');}
   const back=wall(cylinder(r,thickness,0,centreY,-length/2-thickness/2,'shell','Rear vacuum bulkhead',body,{axis:'z'}),'z',-1);
   const door=new T.Group();door.name='Sealed vacuum-chamber door';body.add(door);wall(cylinder(r,thickness,0,centreY,length/2+thickness/2,'shell','Vacuum closure',door,{axis:'z'}),'z',1);
   for(const z of [-length*.30,length*.30]){schematic(box(r*1.25,datumY,r*.30,0,datumY/2,z,'frame','Schematic chamber saddle'));for(const sign of [-1,1])tube(V(sign*r*.50,.06,z),V(sign*r*.73,datumY+r*.34,z),clamp(r*.04,.025,.20),'frame','Schematic saddle brace');}
   dimensionBounds.set(V(-r,datumY,-length/2),V(r,datumY+2*r,length/2));
  }else{
   for(const y of [datumY,datumY+length])circle(r,y,0,'y','edge','Chamber flange datum');
   wall(cylinder(r,thickness,0,datumY+length+thickness/2,0,'shell','Vacuum-chamber upper closure'),'y',1);
   cylinder(r,thickness,0,datumY-thickness/2,0,'inner','Chamber base');schematic(cylinder(r*1.06,.16,0,.08,0,'frame','Schematic circular foundation'));
   for(let i=0;i<6;i++){const a=i*Math.PI/3;schematic(box(clamp(r*.06,.03,.18),.16,clamp(r*.06,.03,.18),Math.sin(a)*r*.84,.08,Math.cos(a)*r*.84,'edge','Schematic base foot'));}
   dimensionBounds.set(V(-r,datumY,-r),V(r,datumY+length,r));
  }
  const pumpX=-r-.45,pumpZ=horizontal?-length*.28:0;schematic(cylinder(.18,.55,pumpX,.275,pumpZ,'frame','Schematic vacuum pump'));tube(V(pumpX,.55,pumpZ),V(-r,datumY+.35,pumpZ),.035,'shell','Schematic pump line');
  workingVolume={shape:'cylinder',diameterM:r*2,lengthM:length,axis};placement.set(0,horizontal?centreY:datumY,0);
 }
 function room(){
  const [w,h,l]=dimensionSize,t=clamp(Math.max(w,h,l)*.006,.03,.18);datumY=.12;centreY=datumY+h/2;dimensionBounds.set(V(-w/2,datumY,-l/2),V(w/2,datumY+h,l/2));
  sourceNode(outlineBox(dimensionSize,V(0,centreY,0),'edge','Published enclosure boundary',g.dimensionRole),g.dimensionRole,dimensionSize);
  box(w,.12,l,0,.06,0,'frame','Schematic enclosure plinth');box(w,.02,l,0,datumY-.01,0,'cream','Enclosure floor');
  const rear=wall(box(w+2*t,h,t,0,centreY,-l/2-t/2,'shell',asset.kind==='rf-chamber'?'RF chamber back wall':'Enclosure back wall'),'z',-1);
  const left=wall(box(t,h,l,-w/2-t/2,centreY,0,'shell',asset.kind==='rf-chamber'?'RF chamber side wall':'Enclosure side wall'),'x',-1);
  wall(box(t,h,l,w/2+t/2,centreY,0,'shell','Enclosure side wall'),'x',1);
  wall(box(w+2*t,t,l,0,datumY+h+t/2,0,'shell','Enclosure ceiling'),'y',1);
  const door=new T.Group();door.name=asset.kind==='thermal-cycle'?'Closed temperature-chamber door':'Enclosure front closure';body.add(door);wall(box(w,h,t,0,centreY,l/2+t/2,'shell','Enclosure front wall',door),'z',1);
  if(asset.kind==='rf-chamber'){
   const depth=clamp(Math.min(w,h,l)*.025,.04,.35),geo=geometry('absorber',()=>new T.ConeGeometry(1,1,4));
   for(let row=0;row<4;row++)for(let col=0;col<6;col++){const node=mesh(geo,material((row+col)%2?'dark':'blue'),'Schematic RF absorber',-w*.45+(col+.5)*w*.9/6,datumY+(row+.5)*h/4,-l/2+depth/2);node.scale.set(Math.min(w/6,h/4)*.48,depth,Math.min(w/6,h/4)*.48);node.rotation.x=Math.PI/2;node.rotateY(Math.PI/4);node.userData.schematic=true;node.userData.enclosureDetailFor=rear.uuid;}
   for(let row=0;row<4;row++)for(let col=0;col<4;col++){const node=mesh(geo,material((row+col)%2?'blue':'dark'),'Schematic side-wall absorber',-w/2+depth/2,datumY+(row+.5)*h/4,-l*.45+(col+.5)*l*.9/4);node.scale.set(Math.min(l/4,h/4)*.48,depth,Math.min(l/4,h/4)*.48);node.rotation.z=-Math.PI/2;node.rotateY(Math.PI/4);node.userData.schematic=true;node.userData.enclosureDetailFor=left.uuid;}
  }else if(asset.kind==='acoustic'){
   for(const x of [-w*.30,w*.30]){const width=clamp(w*.12,.25,1.3),height=clamp(h*.13,.25,1),depth=.45,geo=geometry('horn',()=>new T.CylinderGeometry(1,.24,1,4,1,true)),node=mesh(geo,material('frame',{side:T.DoubleSide}),'Schematic acoustic horn',x,datumY+h*.73,-l/2-.05);node.scale.set(width*.65,depth,height*.65);node.rotation.x=Math.PI/2;node.rotateY(Math.PI/4);schematic(node);}
   for(let i=1;i<4;i++)line([V(-w/2,datumY+h*i/4,-l/2+.002),V(w/2,datumY+h*i/4,-l/2+.002)],'frame','Schematic acoustic wall joint');
  }else if(asset.kind==='thermal-cycle'){
   const fanR=clamp(Math.min(w,h)*.16,.08,.4),fan=schematic(cylinder(fanR,.03,0,datumY+h*.73,-l/2+.04,'dark','Schematic circulation fan',body,{axis:'z'}));circle(fanR,fan.position.y,fan.position.z+.02,'z','shell','Schematic fan grille');
  }
  placement.set(0,datumY,0);workingVolume={shape:'box',widthM:w,heightM:h,depthM:l};
 }
 function shaker(){
  const [w,,l]=dimensionSize,tableY=finitePositive(d.heightM)?d.heightM:.95,plate=.10,foundation=.14;datumY=tableY;centreY=tableY;
  if(type==='shaker-round'){const r=w/2;sourceNode(cylinder(r,plate,0,tableY-plate/2,0,'edge','Published round shaker table',motion),g.dimensionRole,[w,0,l]);circle(r,tableY+.001,0,'y','cyan','Published table perimeter',motion);}
  else{sourceNode(box(w,plate,l,0,tableY-plate/2,0,'edge','Published square shaker table',motion),g.dimensionRole,[w,0,l]);outlineBox([w,.001,l],V(0,tableY,0),'cyan','Published table perimeter',g.dimensionRole);}
  const bodyHeight=Math.max(.05,tableY-foundation-plate),r=clamp(Math.min(w,l)*.30,.13,1.2);schematic(cylinder(r,bodyHeight,0,foundation+bodyHeight/2,0,'frame','Schematic shaker exciter'));schematic(cylinder(r*.65,.10,0,tableY-.15,0,'shell','Schematic shaker armature'));
  const baseW=Math.max(w,r*2.5),baseL=Math.max(l,r*2.2);schematic(box(baseW,foundation,baseL,0,foundation/2,0,'dark','Schematic shaker reaction base'));
  const maxHoles=software?5:7,pts=[];for(let i=0;i<maxHoles;i++)for(let j=0;j<maxHoles;j++){const x=(i/(maxHoles-1)-.5)*w*.82,z=(j/(maxHoles-1)-.5)*l*.82;if(type==='shaker-round'&&Math.hypot(x,z)>w*.45)continue;pts.push(V(x,tableY+.001,z),V(x+.004,tableY+.001,z));}line(pts,'dark','Schematic mounting-hole layout',motion);
  dimensionBounds.set(V(-w/2,tableY,-l/2),V(w/2,tableY,l/2));placement.set(0,tableY,0);rack(-baseW/2-.75,-baseL*.18);
  label(finitePositive(d.heightM)?'Published table height':'Support height is schematic · 0.95 m',V(-w*.4,.16,l*.55),'assumption');label('Table interface · article envelope not implied',V(-w*.4,tableY+.36,l*.44),'assumption');
 }
 function bench(){
  const [w,,l]=dimensionSize,h=finitePositive(d.heightM)?d.heightM:.90,top=.06;sourceNode(box(w,top,l,0,h-top/2,0,'edge','Published work surface'),g.dimensionRole,dimensionSize);for(const x of [-1,1])for(const z of [-1,1])schematic(box(.045,h-top,.045,x*(w/2-.06),(h-top)/2,z*(l/2-.06),'frame','Schematic bench support'));
  datumY=h;centreY=h;placement.set(0,h,0);dimensionBounds.set(V(-w/2,finitePositive(d.heightM)?0:h,-l/2),V(w/2,h,l/2));if(!finitePositive(d.heightM))label('Support height is schematic · 0.90 m',V(-w*.4,.15,l*.5),'assumption');
 }
 function setupVolume(){
  const [w,h,l]=dimensionSize;datumY=0;centreY=h/2;dimensionBounds.set(V(-w/2,0,-l/2),V(w/2,h,l/2));if(g.dimensionRole==='working-envelope')workingBounds.copy(dimensionBounds);
  if(type.startsWith('cylinder')){const horizontal=type==='cylinder-horizontal',axis=horizontal?'z':'y',r=d.diameterM/2,length=horizontal?d.lengthM:d.heightM??d.lengthM;
   const group=new T.Group();group.name=g.dimensionRole==='working-envelope'?'Published test setup volume':'Published chamber extents';body.add(group);sourceNode(group,g.dimensionRole,dimensionSize);
   if(horizontal){for(const z of [-length/2,length/2])circle(r,centreY,z,'z','cyan','Published setup-volume ring',group);for(let i=0;i<4;i++){const a=i*Math.PI/2;line([V(Math.sin(a)*r,centreY+Math.cos(a)*r,-length/2),V(Math.sin(a)*r,centreY+Math.cos(a)*r,length/2)],'cyan','Published setup-volume extent',group);}}
   else{for(const y of [0,length])circle(r,y,0,'y','cyan','Published setup-volume ring',group);for(let i=0;i<4;i++){const a=i*Math.PI/2;line([V(Math.sin(a)*r,0,Math.cos(a)*r),V(Math.sin(a)*r,length,Math.cos(a)*r)],'cyan','Published setup-volume extent',group);}}
   workingVolume={shape:'cylinder',diameterM:d.diameterM,lengthM:length,axis};placement.set(0,horizontal?centreY:0,0);
  }else{outlineBox(dimensionSize,V(0,centreY,0),'cyan','Published test setup volume',g.dimensionRole);workingVolume={shape:'box',widthM:w,heightM:h,depthM:l};placement.set(0,0,0);}
  addNotionalContext();
  label(g.dimensionRole==='working-envelope'?'Published usable volume · cyan':'Published extents only · usable envelope unassessed',V(-w*.4,h+.25,l*.4),'assumption');
 }
 function addNotionalContext(){
  // The source volume remains the exact dimensional datum. Every surrounding
  // feature below is presentation context; none carries measured dimensions.
  const [w,h,l]=dimensionSize,context=new T.Group();context.name='Notional surrounding equipment';body.add(context);
  const gap=clamp(Math.max(w,h,l)*.045,.10,.80),thickness=clamp(Math.max(w,h,l)*.008,.025,.16);
  const contextBox=(ww,hh,ll,x,y,z,key,name)=>box(ww,hh,ll,x,y,z,key,'Notional '+name,context);
  const contextCylinder=(r,hh,x,y,z,key,name,options={})=>cylinder(r,hh,x,y,z,key,'Notional '+name,context,options);
  if(notionalContextType==='direct-field-speaker-array'){
   const radius=Math.max(w,l)/2+gap+.65,cabinetW=clamp(w*.16,.45,.90),cabinetD=.48,towerH=clamp(h*.96,1.8,7),tiers=Math.max(3,Math.min(6,Math.round(towerH/.95)));
   for(let i=0;i<6;i++){
    const angle=(i/6+.08)*Math.PI*2,tower=new T.Group();tower.name='Notional direct-field speaker tower';context.add(tower);tower.position.set(Math.cos(angle)*radius,0,Math.sin(angle)*radius);tower.lookAt(V(0,0,0));
    box(cabinetW,towerH,cabinetD,0,towerH/2+.12,0,'frame','Notional loudspeaker cabinet',tower);
    box(cabinetW*1.35,.12,cabinetD*1.6,0,.06,0,'dark','Notional speaker support',tower);
    for(let j=0;j<tiers;j++){
     const y=.12+(j+.5)*towerH/tiers,r=Math.min(cabinetW*.34,towerH/tiers*.34);
     cylinder(r,.035,0,y,cabinetD/2+.02,'dark','Notional loudspeaker cone',tower,{axis:'z'});
     circle(r*.82,y,cabinetD/2+.041,'z','edge','Notional speaker rim',tower);
    }
   }
   label('Speaker arrangement and supports are notional',V(-w*.4,h+.65,l*.48),'assumption');
  }else if(notionalContextType==='cylindrical-vacuum-housing'){
   const horizontal=type!=='cylinder-vertical',axis=horizontal?'z':'y',referenceRadius=horizontal?(type==='cylinder-horizontal'?w/2:Math.hypot(w,h)/2):w/2,referenceLength=horizontal?l:h;
   const radius=referenceRadius+gap,length=referenceLength+2*gap,cy=h/2;
   wall(contextCylinder(radius,length,0,cy,0,'shell','vacuum housing',{open:true,axis}));
   wall(contextCylinder(referenceRadius+gap*.25,referenceLength+gap*.40,0,cy,0,'inner','thermal liner',{open:true,axis}));
   if(horizontal){
    for(const z of [-length/2,length/2]){
     circle(radius,cy,z,'z','edge','Notional housing flange',context);
     wall(contextCylinder(radius,thickness,0,cy,z+Math.sign(z)*thickness/2,'shell','vacuum end closure',{axis:'z'}),'z',Math.sign(z));
    }
    const supportBottom=cy-radius-.28;
    for(const z of [-length*.28,length*.28]){
     contextBox(radius*1.35,.28,radius*.32,0,supportBottom+.14,z,'frame','chamber saddle');
     for(const sign of [-1,1])tube(V(sign*radius*.50,supportBottom+.14,z),V(sign*radius*.73,cy-radius*.66,z),clamp(radius*.035,.025,.18),'frame','Notional saddle brace',context);
    }
   }else{
    for(const y of [-gap,h+gap]){
     circle(radius,y,0,'y','edge','Notional housing flange',context);
     wall(contextCylinder(radius,thickness,0,y,0,'shell','vacuum closure'),'y',y<0?-1:1);
    }
    contextCylinder(radius*1.04,.20,0,-gap-.10,0,'frame','circular foundation');
   }
   const bottom=horizontal?cy-radius-.28:-gap-.20,pumpX=-radius-.45,pumpZ=horizontal?-length*.24:0;
   contextCylinder(.18,.55,pumpX,bottom+.275,pumpZ,'frame','vacuum pump');
   tube(V(pumpX,bottom+.55,pumpZ),V(-radius,cy-.35,pumpZ),.035,'shell','Notional pump line',context);
   label('Chamber housing and liner are notional',V(-radius,cy+radius+gap*.35,length*.30),'assumption');
  }else{
   const outerW=w+2*gap,outerH=h+2*gap,outerL=l+2*gap,cy=h/2;
   contextBox(outerW,.12,outerL,0,-gap-.06,0,'frame','chamber foundation');
   for(const sign of [-1,1]){
    wall(contextBox(thickness,outerH,outerL,sign*(outerW/2+thickness/2),cy,0,'shell','room side wall'),'x',sign);
    wall(contextBox(outerW,outerH,thickness,0,cy,sign*(outerL/2+thickness/2),'shell','room end wall'),'z',sign);
   }
   wall(contextBox(outerW,thickness,outerL,0,h+gap+thickness/2,0,'shell','room ceiling'),'y',1);
   contextBox(outerW,.04,outerL,0,-gap+.02,0,'cream','chamber floor');
   const fanR=clamp(Math.min(w,h)*.12,.08,.40);contextCylinder(fanR,.035,0,h*.70,-outerL/2+.025,'dark','circulation fan',{axis:'z'});
   label('Chamber walls and supports are notional',V(-outerW*.45,h+gap+.25,outerL*.40),'assumption');
  }
  context.traverse(node=>{node.userData={...node.userData,notional:true,schematic:true,sourcedDimension:false,dimensionRole:'notional-equipment',geometryBasis:'Fixed illustrative context around the catalog volume; dimensions are not measured facility dimensions.'};});
 }
 function addServiceFeedthroughs(){
  if(!['thermal-vacuum','thermal-cycle','rf-chamber'].includes(asset.kind))return;
  // A small, explicit notional feedthrough panel is cut into the rear closure
  // (horizontal chambers/rooms), or the top closure (vertical chambers).
  // The published chamber and usable-volume dimensions remain untouched.
  const vertical=type==='cylinder-vertical',normal=vertical?V(0,1,0):V(0,0,-1),closures=[];
  body.traverse(node=>{if(!node.isMesh)return;const n=node.name;if(vertical?(n==='Vacuum-chamber upper closure'||n==='Notional vacuum closure'&&node.position.y>centreY):(n==='Rear vacuum bulkhead'||n==='Enclosure back wall'||n==='Notional room end wall'&&node.position.z<0||n==='Notional vacuum end closure'&&node.position.z<0))closures.push(node);});
  if(!closures.length)return;
  root.updateMatrixWorld(true);
  const boundary=new T.Box3();for(const node of closures)boundary.union(new T.Box3().setFromObject(node));
  const [w,h,l]=dimensionSize,portR=clamp(Math.min(w,h||w,l)*.025,.012,.045),pitch=portR*3.4;
  const center=vertical?V(0,boundary.max.y,Math.min(w*.24,w*.5-portR*3)):V(0,centreY+(asset.kind==='thermal-cycle'?-1:1)*Math.min(h*.28,h*.5-portR*3),boundary.min.z);
  const roles=['power','data','fluid-supply','fluid-return'];
  const holes=[];
  for(let i=0;i<roles.length;i++){
   const surface=center.clone().add(V((i-1.5)*pitch,0,0)),inside=surface.clone().addScaledVector(normal,-Math.max(.10,boundary.getSize(V())[vertical?'y':'z']+.05)),outside=surface.clone().addScaledVector(normal,.10);
   holes.push({center:surface,radius:portR});
   const sleeve=cylinder(portR,.16,...surface.toArray(),'edge','Notional '+roles[i]+' sealed feedthrough');sleeve.quaternion.setFromUnitVectors(V(0,1,0),normal);sleeve.userData.routingFitting=true;
   // Hollow shell; the bore is visible and the route passes along its centre.
   sleeve.geometry=geometry('feedthrough-bore',()=>new T.CylinderGeometry(1,1,1,16,1,true));
   const id=asset.id+':'+roles[i];servicePorts.push({id,kind:roles[i],inside,outside,normal:normal.clone(),radiusM:portR,geometryBasis:'Notional sealed fitting location; facility-specific ICD required'});
  }
  const oldPump=[];body.traverse(node=>{if(node.isMesh&&['Schematic pump line','Notional pump line'].includes(node.name))oldPump.push(node);});
  for(const old of oldPump){
   old.updateWorldMatrix(true,false);const a=old.localToWorld(V(0,-.5,0)),b=old.localToWorld(V(0,.5,0)),pump=a.x<b.x?a:b,pumpPort=pump.clone().add(V(0,.065,0)),radiusM=.014,bend=.055;
   const surface=center.clone().add(V(-3.2*pitch,0,0)),outside=surface.clone().addScaledVector(normal,.20),inside=surface.clone().addScaledVector(normal,-.12);holes.push({center:surface,radius:.027});
   const shellBox=dimensionBounds.clone();if(volumeReference)shellBox.expandByScalar(clamp(Math.max(w,h,l)*.045,.10,.80)+.03);
   const points=[inside,surface.clone(),...routeAroundObstacles(outside,pumpPort,[shellBox],{clearanceM:.016,bendRadiusM:bend,startNormal:normal,endNormal:V(0,1,0)}).map(p=>p.clone())];
   addGroundTube(body,{id:asset.id+':vacuum',name:'Vacuum pump through dedicated chamber port',points,radiusM,bendRadiusM:bend,material:material('shell'),segments:96});
   const coupling=cylinder(.025,.07,...pumpPort.clone().add(V(0,-.035,0)).toArray(),'edge','Vacuum pump inlet fitting');coupling.geometry=geometry('feedthrough-bore',()=>new T.CylinderGeometry(1,1,1,16,1,true));coupling.userData.routingFitting=true;
   const sleeve=cylinder(.027,.24,...surface.toArray(),'edge','Notional vacuum wall feedthrough');sleeve.quaternion.setFromUnitVectors(V(0,1,0),normal);sleeve.geometry=geometry('feedthrough-bore',()=>new T.CylinderGeometry(1,1,1,16,1,true));sleeve.userData.routingFitting=true;
   old.removeFromParent();
  }
  for(const node of closures){
   node.updateWorldMatrix(true,false);const localHoles=holes.map(q=>({center:node.worldToLocal(q.center.clone()),radius:q.radius})),scale=node.getWorldScale(V());
   const circular=node.geometry.type==='CylinderGeometry',shape=new T.Shape();
   if(circular)shape.absarc(0,0,1,0,Math.PI*2,false);else{shape.moveTo(-.5,-.5);shape.lineTo(.5,-.5);shape.lineTo(.5,.5);shape.lineTo(-.5,.5);shape.closePath();}
   for(const hole of localHoles){const p=new T.Path(),yy=circular?-hole.center.z:hole.center.y,rx=hole.radius/Math.abs(scale.x),ry=hole.radius/Math.abs(circular?scale.z:scale.y);p.absellipse(hole.center.x,yy,rx,ry,0,Math.PI*2,true);shape.holes.push(p);}
   const cut=new T.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false,curveSegments:16,steps:1});cut.translate(0,0,-.5);if(circular)cut.rotateX(-Math.PI/2);geometries.add(cut);node.geometry=cut;node.userData.feedthroughHoles=holes.map(q=>({center:q.center.toArray(),radiusM:q.radius}));
  }
  // Each external circuit terminates on a visible rack connector, never at a
  // free point beyond the chamber. Four independent lanes retain their media.
  const rackW=.55,rackDepth=.60,rackCenter=vertical?V(w*.5+1.0,0,center.z):V(w*.5+.75,0,boundary.min.z-1.50);rack(rackCenter.x,rackCenter.z);
  for(const [i,port] of servicePorts.entries()){
   const rackPort=V(rackCenter.x+(i-1.5)*.09,.65+i*.16,rackCenter.z+rackDepth*.5+.04),stub=port.outside.clone().addScaledVector(port.normal,.16+i*.06),corridor=vertical?w*.5+.5:boundary.min.z-.40-i*.06;
   const topY=boundary.max.y+.55+(3-i)*.12,laneZ=port.outside.z+.50+i*.16,laneX=w*.5+.35+i*.12,frontZ=rackPort.z+.40+i*.12;
   const rearLane=boundary.min.z-.40-i*.12,rearFront=boundary.min.z-1.0,rearY=Math.max(center.y,1.3)+.30+(3-i)*.12;
   const points=vertical?[port.outside,V(port.outside.x,topY,port.outside.z),V(port.outside.x,topY,laneZ),V(laneX,topY,laneZ),V(laneX,rackPort.y,laneZ),V(laneX,rackPort.y,frontZ),V(rackPort.x,rackPort.y,frontZ),rackPort]:[port.outside,V(port.outside.x,port.outside.y,rearLane),V(port.outside.x,rearY,rearLane),V(laneX,rearY,rearLane),V(laneX,rackPort.y,rearLane),V(laneX,rackPort.y,rearFront),V(rackPort.x,rackPort.y,rearFront),rackPort];
   const radiusM=port.kind.startsWith('fluid')?.005:.003,bendRadiusM=radiusM*6;
   addGroundTube(body,{id:port.id+':external',name:port.kind+' · chamber to support rack',points,radiusM,bendRadiusM,fromNormal:port.normal,toNormal:V(0,0,1),material:material(port.kind==='power'?'amber':port.kind==='data'?'cyan':'copper'),segments:96});
   const connector=cylinder(.011,.035,...rackPort.toArray(),'edge','Support rack '+port.kind+' connector');connector.rotation.x=Math.PI/2;connector.geometry=geometry('feedthrough-bore',()=>new T.CylinderGeometry(1,1,1,16,1,true));connector.userData.routingFitting=true;port.rackPort=rackPort;
  }
  label('Sealed service feedthroughs · placement notional',center.clone().add(V(-w*.25,.20,0)),'assumption');
 }
 function publishedEnvelope(){
  const envelope=asset.envelope;if(!envelope)return;
  const envelopeSize=envelope.shape==='box'?[envelope.widthM,envelope.heightM,envelope.depthM]:envelope.axis==='y'?[envelope.diameterM,envelope.lengthM,envelope.diameterM]:[envelope.diameterM,envelope.diameterM,envelope.lengthM];
  if(g.dimensionRole==='working-envelope'&&envelopeSize.every((n,i)=>n===dimensionSize[i])){workingVolume={...envelope};label('Published usable envelope · cyan',workingBounds.max.clone().add(V(.08,.16,.08)),'dimension');return;}
  if(envelope.shape==='box'&&[envelope.widthM,envelope.heightM,envelope.depthM].every(finitePositive)){
   const size=[envelope.widthM,envelope.heightM,envelope.depthM],base=type==='cylinder-horizontal'?centreY-size[1]/2:datumY;
   workingBounds.set(V(-size[0]/2,base,-size[2]/2),V(size[0]/2,base+size[1],size[2]/2));sourceNode(outlineBox(size,workingBounds.getCenter(V()),'cyan','Published working envelope','working-envelope',envelope.sourceIds),'working-envelope',size,envelope.sourceIds);
   workingVolume={...envelope};
  }else if(envelope.shape==='cylinder'&&[envelope.diameterM,envelope.lengthM].every(finitePositive)){
   const r=envelope.diameterM/2,axis=envelope.axis==='y'?'y':'z',length=envelope.lengthM,cy=axis==='z'?(type==='cylinder-horizontal'?centreY:datumY+r):datumY+length/2;
   const size=axis==='y'?[r*2,length,r*2]:[r*2,r*2,length];workingBounds.setFromCenterAndSize(V(0,cy,0),V(...size));
   const group=new T.Group();group.name='Published working envelope';body.add(group);sourceNode(group,'working-envelope',size,envelope.sourceIds);
   if(axis==='z'){for(const z of [-length/2,length/2])circle(r,cy,z,'z','cyan','Thermal working-envelope ring',group);for(let i=0;i<4;i++){const a=i*Math.PI/2;line([V(Math.sin(a)*r,cy+Math.cos(a)*r,-length/2),V(Math.sin(a)*r,cy+Math.cos(a)*r,length/2)],'cyan','Working-envelope generator',group);}}
   else{for(const y of [datumY,datumY+length])circle(r,y,0,'y','cyan','Thermal working-envelope ring',group);for(let i=0;i<4;i++){const a=i*Math.PI/2;line([V(Math.sin(a)*r,datumY,Math.cos(a)*r),V(Math.sin(a)*r,datumY+length,Math.cos(a)*r)],'cyan','Working-envelope generator',group);}}
   workingVolume={...envelope};
  }
  if(!workingBounds.isEmpty())label('Published usable envelope · cyan',workingBounds.max.clone().add(V(.08,.16,.08)),'dimension');
 }
 function addReference(){
  const figure=new T.Group();figure.name='1.75 m scale figure';root.add(figure);const x=bounds.max.x+Math.max(.6,Math.min(1.5,bounds.getSize(V()).x*.10)),z=Math.max(0,bounds.min.z+.6);
  // The lowest foot is at zero and the head ends at exactly 1.75 m.
  box(.29,.49,.19,0,1.215,0,'reference','Scale figure torso',figure);sphere(.115,0,1.635,0,'reference','Scale figure head',figure);
  for(const sign of [-1,1]){tube(V(sign*.085,.985,0),V(sign*.10,.13,0),.048,'reference','Scale figure leg',figure);box(.11,.10,.23,sign*.10,.05,.055,'reference','Scale figure foot',figure);tube(V(sign*.17,1.42,0),V(sign*.255,.93,.025),.038,'reference','Scale figure arm',figure);}
  figure.position.set(x,Math.min(0,bounds.min.y),z);figure.updateMatrixWorld(true);const b=new T.Box3().setFromObject(figure);references.push({name:'Person · 1.75 m',type:'person',sizeM:1.75,bounds:b.clone(),description:'Fixed-height scale figure. Schematic human proportions.'});fitBounds.union(b);label('Person · 1.75 m',V(x,figure.position.y+1.91,z),'scale');
 }
 function addGrid(){
  const size=bounds.getSize(V()),groundY=Math.min(0,bounds.min.y),width=Math.max(3,size.x+2),depth=Math.max(3,size.z+2),step=10**Math.floor(Math.log10(Math.max(width,depth)/8)),pts=[];
  box(width,.025,depth,0,groundY-.035,0,'floor','Comparison ground plane',root);
  for(let x=-Math.floor(width/2/step)*step;x<=width/2;x+=step)pts.push(V(x,groundY-.021,-depth/2),V(x,groundY-.021,depth/2));for(let z=-Math.floor(depth/2/step)*step;z<=depth/2;z+=step)pts.push(V(-width/2,groundY-.021,z),V(width/2,groundY-.021,z));line(pts,'grid','Metre comparison grid',root);
 }
 if(available){
  if(g.dimensionRole==='working-envelope'||g.representation==='wireframe-volume')setupVolume();else if(type.startsWith('cylinder'))cylinderChamber();else if(type==='box-room')room();else if(type.startsWith('shaker'))shaker();else bench();
  publishedEnvelope();addServiceFeedthroughs();markDimensions();root.updateMatrixWorld(true);bounds.setFromObject(body);fitBounds.copy(bounds);if(includeReference)addReference();addGrid();
  label('Reconstruction from published dimensions · details schematic',V(bounds.min.x,bounds.max.y+Math.max(.3,bounds.getSize(V()).y*.045),bounds.min.z),'assumption');
 }else label('No public equipment dimensions recorded',V(0,.5,0),'assumption');
 function getArticlePlacement(sizeM){
  const size=Array.isArray(sizeM)?sizeM:sizeM?.toArray?.();if(!available||!size||size.length!==3||!size.every(finitePositive))return {position:placement.clone(),outside:false,reason:'Article dimensions unavailable'};
  const space=!workingBounds.isEmpty()?workingBounds:dimensionBounds,volume=workingVolume;let fits=true;
  if(volume?.shape==='cylinder'){const axis=volume.axis==='y'?1:2,other=[0,1,2].filter(i=>i!==axis);fits=size[axis]<=volume.lengthM+1e-8&&Math.hypot(size[other[0]],size[other[1]])<=volume.diameterM+1e-8;}
  else if(volume?.shape==='box')fits=size[0]<=volume.widthM+1e-8&&size[1]<=volume.heightM+1e-8&&size[2]<=volume.depthM+1e-8;
  else if(type.startsWith('shaker')||type==='bench')fits=size[0]<=dimensionSize[0]*1.6&&size[2]<=dimensionSize[2]*1.6&&size[1]<=Math.max(6,dimensionSize[0]*2);
  const position=placement.clone();if(fits&&volume?.shape==='cylinder'&&volume.axis!=='y')position.y=space.getCenter(V()).y-size[1]/2;else if(fits&&volume)position.y=space.min.y;
  if(!fits){position.set(bounds.max.x+Math.max(.5,Math.min(2,dimensionSize[0]*.10))+size[0]/2,0,0);return {position,outside:true,reason:asset.envelope?'Article displayed beside the published envelope at true scale.':'Article displayed beside the published equipment at true scale; usable capacity is unassessed.'};}
  return {position,outside:false,reason:asset.envelope?'Nominal comparison placement inside the published envelope.':'Nominal comparison placement; no usable article envelope is implied.'};
 }
 const eye=V(),eyeLocal=V(),direction=V();
 function updateCamera(camera){
  if(state.disposed||!available)return false;if(camera?.getWorldPosition){root.updateMatrixWorld(true);camera.getWorldPosition(eye);eyeLocal.copy(eye);root.worldToLocal(eyeLocal);if(camera.isOrthographicCamera){camera.getWorldDirection(direction);direction.transformDirection(root.matrixWorld.clone().invert());eyeLocal.copy(dimensionBounds.getCenter(V())).addScaledVector(direction,-1e6);}}else eyeLocal.set(1000,1000,1000);
  let changed=false,count=0;
  for(const item of walls){let open=state.cutaway;if(item.axis!=='shell'){const middle=dimensionBounds.getCenter(V())[item.axis];open&&=(eyeLocal[item.axis]-middle)*item.sign>0;}count+=Number(open);const opacity=open?.10:1;if(item.material.opacity!==opacity){changed=true;item.material.opacity=opacity;item.material.depthWrite=!open;item.material.userData.inspectionCutaway=open;}
   if(item.axis!=='shell')body.traverse(node=>{if(node.userData.enclosureDetailFor===item.node.uuid)node.visible=!open;});
  }
  root.userData.inspectionCutaways=count;return changed;
 }
 function setCutaway(value){state.cutaway=!!value;updateCamera();return state.cutaway;}
 function update(progress=0){if(state.disposed)return;const p=clamp(Number(progress)||0,0,1),offset=type?.startsWith('shaker')&&p>0&&p<1?Math.sin(p*Math.PI*12)*.003:0;motion.position.y=offset;contentOffset.set(0,offset,0);root.updateMatrixWorld(true);}
 function dispose(){if(state.disposed)return;state.disposed=true;root.removeFromParent();root.clear();body.clear();for(const value of geometries)value.dispose();for(const value of materials)value.dispose();geometries.clear();materials.clear();geometryCache.clear();materialCache.clear();}
 updateCamera();root.updateMatrixWorld(true);let objects=0,drawCalls=0,triangles=0;root.traverse(node=>{if(node.isMesh){objects++;drawCalls++;triangles+=(node.geometry.index?.count??node.geometry.attributes.position.count)/3;}else if(node.isLine){objects++;drawCalls++;}});
 root.traverse(node=>{if(node.userData.groundConnection)geometries.add(node.geometry);});
 const stats={objects,drawCalls,triangles:Math.round(triangles),materials:materials.size,geometryType:type||null,assetId:asset?.id||null,dimensionRole:g.dimensionRole||null,geometryScaleInvariant:true,notionalContext:volumeReference,notionalContextType,representationNote};
 return {root,available,bounds,fitBounds,dimensionBounds,workingBounds,placement,servicePorts,routingObstacles,getArticlePlacement,labels,references,stats,background:0x101b25,cameraDirection:V(1,.65,1).normalize(),contentOffset,animated:available&&type.startsWith('shaker'),update,updateCamera,setCutaway,dispose,size:dimensionSize?V(...dimensionSize):V()};
}
