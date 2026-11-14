import * as T from './vendor/three.module.js';
import {connectionTube} from './connection-geometry.js';
import {perforatedPanelGeometry} from './connection-installation-geometry.js';
import {inlineCollectorMaterial,inlineCollectorR1} from './inline-collector-conduction.js';

// Reusable H12-R1 proposal. No production module imports this constructor.
// All replacements, movements and intended material joins are returned. The
// caller retains the old buffers before installation and audits actual meshes.
const V=p=>new T.Vector3(...p);
export function collectorAnnulusGeometry(inner,outer,length,axis='z',segments=128){
 const positions=[],indices=[],map=(u,v,w)=>axis==='x'?[w,u,v]:axis==='y'?[u,w,v]:[u,v,w];
 for(const w of[-length/2,length/2])for(const r of[inner,outer])for(let j=0;j<segments;j++){const a=j/segments*Math.PI*2;positions.push(...map(r*Math.cos(a),r*Math.sin(a),w));}
 const N=segments;for(let j=0;j<N;j++){const q=(j+1)%N;for(const [a,b,c,d]of[[j,q,N+j,N+q],[2*N+j,3*N+j,2*N+q,3*N+q],[j,2*N+j,q,2*N+q],[N+j,N+q,3*N+j,3*N+q]])indices.push(a,b,c,c,b,d);}
 if(axis==='y')for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function prismYZ(points,width){
 points=points.filter((p,i)=>!i||Math.hypot(...p.map((x,k)=>x-points[i-1][k]))>1e-10).map(p=>[...p]);if(points.length>1&&Math.hypot(...points[0].map((x,k)=>x-points.at(-1)[k]))<1e-10)points.pop();const signedArea=points.reduce((n,p,i)=>n+p[0]*points[(i+1)%points.length][1]-p[1]*points[(i+1)%points.length][0],0);if(signedArea<0)points.reverse();
 const shape=points.map(p=>new T.Vector2(...p)),faces=T.ShapeUtils.triangulateShape(shape,[]),positions=[],indices=[],N=points.length;
 for(const x of[-width/2,width/2])for(const p of points)positions.push(x,...p);
 for(const t of faces)indices.push(t[0],t[2],t[1],N+t[0],N+t[1],N+t[2]);
 for(let j=0;j<N;j++){const k=(j+1)%N;indices.push(j,k,N+j,N+j,k,N+k);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function clipProfile(points,axis,value,keepGreater){
 const out=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],sa=(a[axis]-value)*(keepGreater?1:-1),sb=(b[axis]-value)*(keepGreater?1:-1);if(sa>=-1e-12)out.push([...a]);if((sa>1e-12&&sb< -1e-12)||(sa< -1e-12&&sb>1e-12)){const t=(value-a[axis])/(b[axis]-a[axis]);out.push(a.map((x,k)=>x+(b[k]-x)*t));}}return out.filter((p,i)=>!i||Math.hypot(...p.map((x,k)=>x-out[i-1][k]))>1e-10);
}
function profileWithHole(outer,inner,length,axis='y'){
 const shape=new T.Shape();outer.forEach((p,i)=>i?shape.lineTo(...p):shape.moveTo(...p));shape.closePath();const hole=new T.Path();[...inner].reverse().forEach((p,i)=>i?hole.lineTo(...p):hole.moveTo(...p));hole.closePath();shape.holes.push(hole);const g=new T.ExtrudeGeometry(shape,{depth:length,bevelEnabled:false,curveSegments:1});g.translate(0,0,-length/2);const a=g.attributes.position;for(let i=0;i<a.count;i++){const u=a.getX(i),v=a.getY(i),w=a.getZ(i);a.setXYZ(i,...(axis==='y'?[u,w,v]:axis==='x'?[w,u,v]:[u,v,w]));}if(axis==='y'){const indices=[];for(let i=0;i<a.count;i+=3)indices.push(i,i+2,i+1);g.setIndex(indices);}g.computeVertexNormals();return g;
}
function annularJacket(inner,outer,startTrim=0,endTrim=0){
 const a=inner.mesh.geometry.attributes.position,b=outer.mesh.geometry.attributes.position,n=outer.mesh.userData.connectionSegments,R=outer.mesh.userData.connectionRadialSegments,S=R+1,centres=[],distance=[0];
 for(let i=0;i<=n;i++){const c=[0,0,0];for(let j=0;j<R;j++)for(let k=0;k<3;k++)c[k]+=a.array[(i*S+j)*3+k]/R;centres.push(c);if(i)distance.push(distance.at(-1)+Math.hypot(...c.map((x,k)=>x-centres[i-1][k])));}
 const low=startTrim,high=distance.at(-1)-endTrim,stations=[low,...distance.filter(x=>x>low+1e-10&&x<high-1e-10),high],rows=[];
 for(const d of stations){let i=1;while(i<n&&distance[i]<d)i++;const t=(d-distance[i-1])/(distance[i]-distance[i-1]);rows.push({i:i-1,t});}
 const count=rows.length,N=count*S,p=new Float32Array(N*6),ix=[];
 for(const [row,{i,t}]of rows.entries())for(let j=0;j<S;j++)for(let k=0;k<3;k++){const u=(i*S+j)*3+k,v=u+S*3;p[(row*S+j)*3+k]=b.array[u]+(b.array[v]-b.array[u])*t;p[N*3+(row*S+j)*3+k]=a.array[u]+(a.array[v]-a.array[u])*t;}
 for(let i=0;i<count-1;i++)for(let j=0;j<R;j++){const k=i*S+j,l=k+S;ix.push(k,k+1,l,l,k+1,l+1,N+k,N+l,N+k+1,N+l,N+l+1,N+k+1);}
 for(const end of[0,count-1])for(let j=0;j<R;j++){const k=end*S+j,l=k+1;if(end)ix.push(k,l,N+k,N+k,l,N+l);else ix.push(k,N+k,l,N+k,N+l,l);}

 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return g;
}
export function constructInlineCollectorR1({root,stator,rotor,sourceBox,sourcePort,allocation,nativeTracks,nativeBrushes,nativeHousing,rotorSupport,stationarySupport}){
 if(allocation.records.length!==32||allocation.placement.candidateId!=='r1'||sourcePort.mates.length!==32)throw Error('R1 requires the exact owned 32-conductor bank');
 if(!rotorSupport?.isMesh||!stationarySupport?.isMesh)throw Error('R1 requires actual distinct stationary and rotating support material');
 if(!root||sourceBox.userData.collectorPlacementState==='r1-installed')throw Error('R1 construction rejects missing native root or repeat source placement');
 const near=(a,b)=>a?.length===3&&a.every((x,k)=>Number.isFinite(x)&&Math.abs(x-b[k])<1e-9),native=inlineCollectorR1.nativeSourcePositionM,installedExpected=native.map((x,k)=>x+inlineCollectorR1.sourceOutletOffsetM[k]);
 if(!near(sourceBox.position.toArray(),native)||!near(allocation.placement.sourceNativePositionM,native)||!near(allocation.placement.sourceInstalledPositionM,installedExpected))throw Error('R1 constructor requires the declared native-to-installed source placement exactly once');
 if(nativeTracks.length!==32||nativeBrushes.length!==32||nativeTracks.some(m=>m.parent!==rotor)||nativeBrushes.some(m=>m.parent!==stator)||nativeHousing.parent!==stator)throw Error('R1 requires all original owned contact hardware before any replacement');
 const sourceMaterialBefore=[];sourceBox.traverse(n=>{if(n.isMesh)sourceMaterialBefore.push(n);});
 const owner=(node,key)=>{for(let p=node;p;p=p.parent)if(p.userData?.[key]!=null)return p.userData[key];return null;};
 const stablePath=node=>{const parts=[];for(let p=node;p&&p!==root;p=p.parent)parts.push((p.parent?.children.indexOf(p)??0)+':'+(p.name||p.type));return 'body/'+parts.reverse().join('/');};
 const oldMetadata=new Map([...nativeTracks,...nativeBrushes,nativeHousing,...sourceMaterialBefore].map(m=>[m,{id:m.uuid,path:stablePath(m),parentId:m.parent?.uuid,parentName:m.parent?.name,part:owner(m,'part'),physicalPartId:owner(m,'physicalPartId'),boxId:owner(m,'electricalBoxId'),portId:owner(m,'electricalPortId'),rotaryElectricalCircuitId:owner(m,'rotaryElectricalCircuitId'),routingMotion:owner(m,'routingMotion')} ]));
 const oldSourceCircuit=new Map();for(const record of allocation.records){const mate=sourcePort.mates.find(m=>m.instance===record.instance&&m.polarity===record.polarity);if(!mate)throw Error('Missing original mating pair before R1 mutation');for(const parent of[mate.female,mate.male])parent.traverse(m=>{if(m.isMesh)oldSourceCircuit.set(m,record);});}
 const d=inlineCollectorMaterial,p=inlineCollectorR1,meshes=[],joins=[],replacements=[],movements=[],tubes=[],contacts=[],supports=[],oldMeshes=[];
 const materials={copper:new T.MeshBasicMaterial({color:0xb87333}),dielectric:new T.MeshBasicMaterial({color:0x50636b}),metal:new T.MeshBasicMaterial({color:0x879399}),jacket:new T.MeshBasicMaterial({color:0x26343c})};
 const groups={stationary:new T.Group(),rotating:new T.Group()};groups.stationary.name=allocation.componentId+' stationary proposal';groups.rotating.name=allocation.componentId+' rotating proposal';stator.add(groups.stationary);rotor.add(groups.rotating);
 for(const [key,g]of Object.entries(groups))g.userData={part:'solar',collectorComponentId:allocation.componentId,collectorFrame:key};
 const add=(parent,id,geometry,position,kind,circuitId=null)=>{const m=new T.Mesh(geometry,materials[kind]||materials.dielectric);m.name=id;m.position.set(...position);m.userData={part:'solar',physicalMaterial:true,collectorPhysicalId:id,collectorComponentId:allocation.componentId,collectorMaterialKind:kind,sourceCircuitId:circuitId};parent.add(m);meshes.push(m);return m;};
 const box=(parent,id,lo,hi,kind='dielectric')=>add(parent,id,new T.BoxGeometry(...hi.map((v,k)=>v-lo[k])),lo.map((v,k)=>(v+hi[k])/2),kind);
 const replace=(old,reason)=>{if(!old?.isMesh)throw Error('Missing declared replacement: '+reason);oldMeshes.push(old);replacements.push({old,originalIdentity:oldMetadata.get(old),reason,newIds:[]});old.removeFromParent();};
 const join=(id,a,b,kind,detail={})=>{const r={id,a,b,kind,...detail};joins.push(r);return r;};
 for(const old of nativeTracks)replace(old,'Owned rotary contact repack on unchanged local-X axis');
 for(const old of nativeBrushes)replace(old,'Owned negative-Y brush with finite curved sliding face and full copper terminal face');
 replace(nativeHousing,'Replace unattached solid torus representation by an explicitly supported stationary rail assembly');
 const oldPosition=sourceBox.position.toArray();sourceBox.position.fromArray(allocation.placement.sourceInstalledPositionM);sourceBox.userData.collectorPlacementState='r1-installed';sourceBox.userData.collectorPlacementCandidate='r1';movements.push({id:'solar-root-1:source-assembly',object:sourceBox,from:oldPosition,to:sourceBox.position.toArray(),offset:[...p.sourceOutletOffsetM],reason:'Declared R1 late fanout outlet displacement'});
 const sourceOld=sourceMaterialBefore;
 for(const old of sourceOld)replace(old,'Owned source solid replaced by real shell, passage or existing contact-stage material');
 const rotorRail=box(groups.rotating,'collector/rotor-carrier',[.04,-.075,-.012],[.80,-.05,.012]);supports.push(rotorRail);join('rotor-carrier/native-base',rotorRail,rotorSupport,'planar-attachment',{frame:'rotating',requiredAreaM2:.0005});
 const foot=box(groups.stationary,'collector/stationary-foot',[-.511570059877627,-.130,.350],[-.497570059877627,-.0875,.370]);supports.push(foot);join('stationary-foot/native-leaf-rib',foot,stationarySupport,'planar-attachment',{frame:'stationary',requiredAreaM2:.0002});
 const crossbeam=box(groups.stationary,'collector/stationary-crossbeam',[-.511570059877627,-.140,.350],[.835,-.130,.370]);supports.push(crossbeam);join('stationary-foot/crossbeam',foot,crossbeam,'planar-attachment',{requiredAreaM2:.0002});
 const returnLeg=box(groups.stationary,'collector/stationary-return-leg',[.810,-.140,.025],[.835,-.120,.350]);supports.push(returnLeg);join('crossbeam/return-leg',crossbeam,returnLeg,'planar-attachment',{requiredAreaM2:.0002});
 const railStep=box(groups.stationary,'collector/stationary-rail-step',[.810,-.120,.016],[.835,-.098,.034]);supports.push(railStep);join('return-leg/rail-step',returnLeg,railStep,'planar-attachment',{requiredAreaM2:.0002});
 const stationaryRail=box(groups.stationary,'collector/stationary-brush-rail',[.325,-.110,.016],[.810,-.098,.034]);supports.push(stationaryRail);join('rail-step/brush-rail',railStep,stationaryRail,'planar-attachment',{requiredAreaM2:.00015});
 const clampStep=box(groups.stationary,'collector/clamp-step',[.810,-.140,.013],[.835,-.120,.025]);supports.push(clampStep);join('clamp-step/return-leg',clampStep,returnLeg,'planar-attachment',{requiredAreaM2:.0003});
 join('clamp-step/rail-step',clampStep,railStep,'planar-attachment',{requiredAreaM2:.0002});
 const clampBridge=box(groups.stationary,'collector/clamp-bridge',[.800,-.176,.013],[.835,-.140,.019]);supports.push(clampBridge);join('clamp-bridge/clamp-step',clampBridge,clampStep,'planar-attachment',{requiredAreaM2:.0001});
 const clampRail=box(groups.stationary,'collector/clamp-rail',[.325,-.176,.013],[.800,-.164,.019]);supports.push(clampRail);join('clamp-bridge/clamp-rail',clampBridge,clampRail,'planar-attachment',{requiredAreaM2:.00006});
 const installed=allocation.placement.sourceInstalledPositionM;
 const outletFoot=box(groups.stationary,'collector/outlet-foot',[-.511570059877627,-.130,1.770],[-.497570059877627,-.0875,1.790]);supports.push(outletFoot);join('outlet-foot/native-leaf-rib',outletFoot,stationarySupport,'planar-attachment',{frame:'stationary',requiredAreaM2:.0002});
 const outletCrossbeam=box(groups.stationary,'collector/outlet-crossbeam',[-.511570059877627,-.140,1.770],[-.4185,-.130,1.790]);supports.push(outletCrossbeam);join('outlet-foot/crossbeam',outletFoot,outletCrossbeam,'planar-attachment',{requiredAreaM2:.0002});
 const outletArm=box(groups.stationary,'collector/outlet-panel-foot',[-.4305,-.140,1.790],[-.4185,-.120,installed[2]+.070]);supports.push(outletArm);join('outlet-panel-foot/crossbeam',outletArm,outletCrossbeam,'planar-attachment',{requiredAreaM2:.0001});
 const wall=.003,bodyWalls=[];
 for(const sx of[-1,1])bodyWalls.push(add(sourceBox,'collector/enclosure/side-'+sx,new T.BoxGeometry(wall,.09,.14),[sx*(.07-wall/2),0,0],'metal'));
 for(const sy of[-1,1]){
  const wallHoles=allocation.records.filter(r=>Math.abs(r.point[1]-installed[1]-sy*.045)<r.outerRadiusM+.0025).map(r=>({u:r.point[0]-installed[0],v:0,widthM:2*(r.outerRadiusM+.0025),heightM:.15}));
  const geometry=perforatedPanelGeometry(.14-2*wall,.14,wall,wallHoles);geometry.rotateX(Math.PI/2);bodyWalls.push(add(sourceBox,'collector/enclosure/top-bottom-'+sy,geometry,[0,sy*(.045-wall/2),0],'metal'));
 }

 const bodyHoles=allocation.records.filter(r=>Math.abs(r.point[1]-installed[1])<.045).map(r=>({id:r.id,u:r.point[0]-installed[0],v:r.point[1]-installed[1],radiusM:r.outerRadiusM+.0025}));
 for(const sz of[-1,1])bodyWalls.push(add(sourceBox,'collector/enclosure/front-back-'+sz,perforatedPanelGeometry(.14-2*wall,.09-2*wall,wall,bodyHoles),[0,0,sz*(.07-wall/2)],'metal'));

 for(let i=0;i<bodyWalls.length;i++)for(let j=i+1;j<bodyWalls.length;j++)join('enclosure-shell/'+i+'/'+j,bodyWalls[i],bodyWalls[j],'optional-shell-seam',{minimumAreaM2:0});
 const panelWidth=.14,panelHeight=.86864,panelThickness=.035,panelCenter=[0,0,.0875];
 const holes=allocation.records.map(r=>({id:r.id,u:r.point[0]-installed[0],v:r.point[1]-installed[1],radiusM:r.outerRadiusM+.0025}));
 const panel=add(sourceBox,'collector/source-panel',perforatedPanelGeometry(panelWidth,panelHeight,panelThickness,holes),panelCenter,'metal');
 join('outlet-panel-foot/panel',outletArm,panel,'planar-attachment',{requiredAreaM2:.0002});
 for(const m of bodyWalls)join('enclosure/panel/'+m.name,m,panel,'optional-shell-seam',{minimumAreaM2:0});
 const halfAngle=p.brushHalfSteps/p.trackAngularSegments*Math.PI*2,zEdge=p.trackOuterRadiusM*Math.sin(halfAngle),brushProfile=[[p.brushTerminalYM,-zEdge],[p.brushTerminalYM,zEdge]];
 for(let j=-p.brushHalfSteps;j<=p.brushHalfSteps;j++){const a=Math.PI+j/p.trackAngularSegments*Math.PI*2;brushProfile.push([p.trackOuterRadiusM*Math.cos(a),p.trackOuterRadiusM*Math.sin(a)]);}
 for(const record of allocation.records){
  const cid=record.sourceCircuitId,id=record.id,mate=sourcePort.mates.find(m=>m.instance===record.instance&&m.polarity===record.polarity);if(!mate)throw Error('Missing source mate '+cid);
  const track=add(groups.rotating,id+'/track',collectorAnnulusGeometry(p.trackInnerRadiusM,p.trackOuterRadiusM,p.brushWidthM,'x',p.trackAngularSegments),[record.trackX,0,0],'copper',cid);
  const diskProfile=clipProfile(Array.from({length:p.trackAngularSegments},(_,j)=>{const a=j/p.trackAngularSegments*Math.PI*2;return [p.trackInnerRadiusM*Math.cos(a),p.trackInnerRadiusM*Math.sin(a)];}),0,-.05,true);
  const disk=add(groups.rotating,id+'/rotor-disk',prismYZ(diskProfile,.003),[record.trackX,0,0],'dielectric',cid);supports.push(disk);
  join(id+'/track-disk',track,disk,'conforming-dielectric-contact',{requiredAreaM2:.0005});join(id+'/disk-carrier',disk,rotorRail,'planar-attachment',{requiredAreaM2:.00006});
  const brush=add(groups.stationary,id+'/brush',prismYZ(brushProfile,p.brushWidthM),[record.trackX,0,0],'copper',cid);
  join(id+'/rotary-sliding-contact',track,brush,'conductive-sliding-contact',{sourceCircuitId:cid,requiredAreaM2:.00012});
  const brushPad=box(groups.stationary,id+'/brush-pad',[record.trackX-.0045,-.103,zEdge],[record.trackX+.0045,-.095,.016]);supports.push(brushPad);
  join(id+'/brush-pad-contact',brushPad,brush,'planar-dielectric-contact',{requiredAreaM2:.00005});join(id+'/brush-pad-rail',brushPad,stationaryRail,'planar-attachment',{requiredAreaM2:.00004});
  const copper=connectionTube(groups.stationary,{radius:record.copperRadiusM,material:materials.copper,part:'solar',segments:512,radialSegments:16,bendRadiusM:d.formedBendRadiusM,name:id+'/copper'});copper.update(record.points,{sampled:true,minimumBendRadiusM:record.minimumBendRadiusM});copper.mesh.userData.collectorPhysicalId=id+'/copper';copper.mesh.userData.collectorMaterialKind='copper';copper.mesh.userData.sourceCircuitId=cid;meshes.push(copper.mesh);
  const inner=connectionTube(groups.stationary,{radius:record.copperRadiusM,material:materials.jacket,segments:512,radialSegments:16,name:id+'/jacket-inner-boundary'}),outer=connectionTube(groups.stationary,{radius:record.outerRadiusM,material:materials.jacket,segments:512,radialSegments:16,name:id+'/jacket-outer-boundary'});
  for(const t of[inner,outer]){t.update(record.points,{sampled:true,minimumBendRadiusM:record.minimumBendRadiusM});t.mesh.userData.physicalMaterial=false;t.mesh.visible=false;}
  const jacket=add(groups.stationary,id+'/jacket',annularJacket(inner,outer,p.bareBrushLengthM,p.bareTerminalLengthM),[0,0,0],'jacket',cid);
  join(id+'/copper-brush',copper.mesh,brush,'conductive-cap-contact',{sourceCircuitId:cid,requiredAreaM2:record.sectionAreaMM2*1e-6*.97});
  join(id+'/copper-jacket',copper.mesh,jacket,'conforming-insulation-wall',{sourceCircuitId:cid,requiredAreaM2:.001});
  const circle=radius=>Array.from({length:16},(_,j)=>{const a=j/16*Math.PI*2;return [radius*Math.cos(a),radius*Math.sin(a)];});
  const clampOuter=clipProfile(circle(.00595),1,.0057,false),withStem=[];
  for(let i=0;i<clampOuter.length;i++){const a=clampOuter[i],b=clampOuter[(i+1)%clampOuter.length];withStem.push(a);if(Math.abs(a[1]-.0057)<1e-10&&Math.abs(b[1]-.0057)<1e-10&&a[0]>b[0])withStem.push([.001,.0057],[.001,.013],[-.001,.013],[-.001,.0057]);}
  const clamp=add(groups.stationary,id+'/jacket-clamp',profileWithHole(withStem,circle(record.outerRadiusM),.020,'y'),[record.trackX,-.170,0],'dielectric',cid);supports.push(clamp);
  join(id+'/jacket-clamp-fit',jacket,clamp,'conforming-jacket-clamp',{sourceCircuitId:cid,requiredAreaM2:.0004});
  join(id+'/clamp-stem-rail',clamp,clampRail,'planar-attachment',{requiredAreaM2:.000019});
  const D=sourcePort.type.diameterM,L=sourcePort.type.lengthM,bore=record.outerRadiusM+.0025;
  const flange=add(mate.female,id+'/receptacle-flange',perforatedPanelGeometry(D,D,.005,[{u:0,v:0,radiusM:bore}]),[0,0,.0025],'metal',cid);
  const femaleBore=D*.47+.0004,femaleShell=add(mate.female,id+'/receptacle-shell',collectorAnnulusGeometry(femaleBore,D/2,.014,'z',32),[0,0,.012],'metal',cid);
  const maleShell=add(mate.male,id+'/plug-shell',collectorAnnulusGeometry(bore,D*.47,L*.58,'z',32),[0,0,.018+L*.29],'metal',cid);
  const bootStart=.018+L*.58,bootLength=L*.34,boot=add(mate.male,id+'/strain-relief-shell',collectorAnnulusGeometry(bore,D*.28,bootLength,'z',32),[0,0,bootStart+bootLength/2],'dielectric',cid);
  const band=add(mate.male,id+'/identifier-band',collectorAnnulusGeometry(D*.28,D*.31,.005,'z',32),[0,0,bootStart+.0025],'dielectric',cid);
  const femaleContact=add(mate.female,id+'/rear-terminal',collectorAnnulusGeometry(0,record.copperRadiusM+.0001,.028,'z',32),[0,0,.004],'copper',cid);
  const maleContact=add(mate.male,id+'/plug-contact',collectorAnnulusGeometry(0,record.copperRadiusM+.0001,.020,'z',32),[0,0,.028],'copper',cid);
  contacts.push({id,sourceCircuitId:cid,track,brush,rearTerminal:femaleContact,plugContact:maleContact,mate});
  join(id+'/copper-terminal',copper.mesh,femaleContact,'conductive-cap-contact',{sourceCircuitId:cid,requiredAreaM2:record.sectionAreaMM2*1e-6*.97});
  join(id+'/existing-mating-contact',femaleContact,maleContact,'conductive-cap-contact',{sourceCircuitId:cid,requiredAreaM2:record.sectionAreaMM2*1e-6*.97});
  join(id+'/flange-panel',flange,panel,'planar-attachment',{requiredAreaM2:.001});join(id+'/flange-shell',flange,femaleShell,'planar-attachment',{requiredAreaM2:.0001});
  join(id+'/mated-shells',femaleShell,maleShell,'existing-mated-shell-clearance',{minimumGapM:.0002,maximumGapM:.0006});join(id+'/plug-boot',maleShell,boot,'planar-attachment',{requiredAreaM2:.0001});join(id+'/boot-band',boot,band,'conforming-dielectric-contact',{requiredAreaM2:.0001});
  // An isolated terminal needs a real dielectric support. Its two concentric
  // faces intentionally seat on terminal and receptacle shell material.
  const terminalSupport=add(mate.female,id+'/terminal-insulator',collectorAnnulusGeometry(record.copperRadiusM+.0001,femaleBore,.008,'z',32),[0,0,.009],'dielectric',cid);supports.push(terminalSupport);
  join(id+'/terminal-insulator-inner',terminalSupport,femaleContact,'conforming-dielectric-contact',{requiredAreaM2:.00015});join(id+'/terminal-insulator-outer',terminalSupport,femaleShell,'conforming-dielectric-contact',{requiredAreaM2:.00015});join(id+'/terminal-insulator/flange',terminalSupport,flange,'planar-attachment',{requiredAreaM2:.0002});
  const plugSupport=add(mate.male,id+'/plug-insulator',collectorAnnulusGeometry(record.copperRadiusM+.0001,bore,.008,'z',32),[0,0,.028],'dielectric',cid);supports.push(plugSupport);join(id+'/plug-insulator-inner',plugSupport,maleContact,'conforming-dielectric-contact',{requiredAreaM2:.00015});join(id+'/plug-insulator-outer',plugSupport,maleShell,'conforming-dielectric-contact',{requiredAreaM2:.00015});
  tubes.push({record,copper,inner,outer,jacket});
 }
 const newById=new Map(meshes.map(m=>[m.userData.collectorPhysicalId,m])),sourceRoleNames={'Panel mounting flange':'receptacle-flange','Panel receptacle shell':'receptacle-shell','Single-pole shrouded cable plug':'plug-shell','Tapered strain relief':'strain-relief-shell','Functional identifier band':'identifier-band'};
 for(const r of replacements){
  if(nativeTracks.includes(r.old)||nativeBrushes.includes(r.old)){const record=allocation.records.find(q=>r.originalIdentity.rotaryElectricalCircuitId==='P-SA-1/channel-'+(q.instance+1)+'/'+(q.polarity>0?'positive':'return'));if(!record)throw Error('Unresolved native circuit replacement');r.newIds=[record.id+(nativeTracks.includes(r.old)?'/track':'/brush')];}
  else if(r.old===nativeHousing){r.newIds=supports.filter(m=>m.parent===groups.stationary&&!m.userData.sourceCircuitId).map(m=>m.userData.collectorPhysicalId);r.replacementAssembly='Supported stationary carrier replacing original housing representation';}
  else if(r.old.name==='Solar source stator enclosure')r.newIds=bodyWalls.map(m=>m.userData.collectorPhysicalId);
  else if(r.old.name.includes('attached connector bank'))r.newIds=[panel.userData.collectorPhysicalId];
  else{const record=oldSourceCircuit.get(r.old),role=sourceRoleNames[r.old.name];if(!record||!role)throw Error('Unresolved original source primitive: '+r.old.name);r.newIds=[record.id+'/'+role];}
  if(!r.newIds.length||r.newIds.some(id=>!newById.has(id)))throw Error('Missing exact replacement material');
 }
 const mapped=new Set(replacements.flatMap(r=>r.newIds)),additions=meshes.filter(m=>!mapped.has(m.userData.collectorPhysicalId)).map(m=>({id:m.userData.collectorPhysicalId,kind:m.userData.collectorMaterialKind,sourceCircuitId:m.userData.sourceCircuitId,reason:m.name.endsWith('/rear-terminal')||m.name.endsWith('/plug-contact')?'Previously absent modeled material at the existing source mating stage; no added electrical stage':'Additive conductor, insulation or individually joined support material'}));

 return {id:allocation.componentId,candidateId:'r1',allocation,groups,meshes,contacts,tubes,supports,joins,replacements,additions,movements,oldMeshes,panel,rotorRail,stationaryFoot:foot,nativeAnchors:{rotorSupport,stationarySupport},endpointBoundary:'Existing source plug contact. The plug-contact-to-external-cable tail and full external cable closure are outside H12.',externalExitOffsetsPreserved:true,additionalMatedContacts:0,additionalSlidingContacts:0,productionHookup:false};
}
