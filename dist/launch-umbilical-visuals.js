// Ground service chains and flight separation leads share the interface record
// and the mission clock. All meshes are allocated once; seeking only changes
// cached transforms. Recognition geometry is not a provider connector drawing.
import * as T from './vendor/three.module.js';
import {launchUmbilicalState} from './launch-umbilicals.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Y=V(0,1,0);
const clamp=x=>Math.max(0,Math.min(1,x));
const COLORS={lox:'#88cce4',methane:'#dfbc82',hydrogen:'#bcafe5',rp1:'#c99a6a',power:'#e7c16c',data:'#91cabc','conditioned-air':'#a9d2db',nitrogen:'#b3c3c6',helium:'#a9c89f',grounding:'#b9c79c','unknown-fuel':'#a0a5a4','unknown-oxidizer':'#9baeb1'};
const mediumColor=id=>COLORS[id]||'#b3bdc0';
const isGas=id=>['nitrogen','helium','conditioned-air'].includes(id);
const isWire=id=>['power','data','grounding'].includes(id);

export function buildLaunchUmbilicals({design,site,tower,parts,geometry,serviceFrame,serviceSources=new Map()}){
 const {lower,upper,boosters,payload,shell,fitting}=parts;
 const {baseY,heightM:H,lowerLengthM:L,upperLengthM:U,fairingRadiusM:R,fairingHeightM:F,baseRadiusM:r,payloadWidthM,payloadHeightM,payloadSeatM,flightRingRadiusM=.60}=geometry;
 const root=new T.Group();root.name='Ground umbilical network';root.userData.part='pad';tower.add(root);
 const annotations=[],groups=[],connectionMeshes=new Map(),connectionAnchors=new Map(),contexts=new Map(),flightRoots=[];
 const steel=new T.MeshStandardMaterial({color:'#788d92',metalness:.54,roughness:.49});
 const pale=new T.MeshStandardMaterial({color:'#c4cdcb',metalness:.42,roughness:.56});
 const dark=new T.MeshStandardMaterial({color:'#3d5058',metalness:.35,roughness:.64});
 const support=new T.MeshStandardMaterial({color:'#657a80',metalness:.34,roughness:.6});
 const boxGeom=new T.BoxGeometry(1,1,1),tubeGeom=new T.CylinderGeometry(1,1,1,8),portGeom=new T.CylinderGeometry(1,1,1,16),ballGeom=new T.SphereGeometry(1,8,6);
 const tempA=V(),tempB=V(),tempD=V(),tempM=V();let selectedId=null,lastState=null;
 const group=(p,name,part='pad')=>{const o=new T.Group();o.name=name;o.userData.part=part;p.add(o);return o;};
 const mesh=(p,geo,mat,name)=>{const o=new T.Mesh(geo,mat);o.name=name;o.userData.part=p.userData.part||'pad';p.add(o);return o;};
 const box=(p,pos,size,mat,name)=>{const o=mesh(p,boxGeom,mat,name);o.position.copy(pos);o.scale.copy(size);return o;};
 const rod=(p,a,b,rad,mat,name)=>{const o=mesh(p,tubeGeom,mat,name);setRod(o,a,b,rad);return o;};
 function setRod(o,a,b,rad){tempD.copy(b).sub(a);const length=tempD.length();o.visible=length>1e-7;if(!o.visible)return;o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(Y,tempD.multiplyScalar(1/length));o.scale.set(rad,length,rad);}
 function staticPipe(p,points,rad,mat,name){return points.slice(1).map((b,i)=>rod(p,points[i],b,rad,mat,name));}
 function targetFor(spec){
  const {target,boosterIndex=0,heightFraction=.1,azimuthDeg=225}=spec.visual||{};
  const angle=azimuthDeg*Math.PI/180,unit=V(Math.sin(angle),0,Math.cos(angle));
  if(target==='booster'){
   const part=boosters[boosterIndex];if(!part)return null;
   const radius=part.userData.radiusM,hh=part.userData.lengthM;
   return {part,point:unit.clone().multiplyScalar(radius*1.014).add(V(0,heightFraction*hh,0)),normal:unit,radius,center:V(part.position.x,baseY+heightFraction*hh,part.position.z)};
  }
  if(target==='upper'){
   if(!U)return null;const radius=r+(R-r)*heightFraction;
   return {part:upper,point:unit.clone().multiplyScalar(radius*1.008).add(V(0,-U+heightFraction*U,0)),normal:unit,radius,center:V(0,-U+heightFraction*U,0)};
  }
  if(target==='payload'){
   const internal=spec.release.event==='payload-release'||spec.release.mode==='flight-separation';
   const radius=internal?flightRingRadiusM*.90:R;
   const yy=internal?payloadSeatM+.03:Math.max(.2,Math.min(F*.65,heightFraction*F));
   return {part:internal?payload:shell,point:unit.clone().multiplyScalar(radius).add(V(0,yy,0)),normal:internal?V(0,-1,0):unit,viewDirection:unit.clone().add(V(0,.20,0)).normalize(),radius,center:V(0,yy,0),internal};
  }
  return {part:lower,point:unit.clone().multiplyScalar(r*1.013).add(V(0,baseY+heightFraction*L,0)),normal:unit,radius:r,center:V(0,baseY+heightFraction*L,0)};
 }
 function connector(parent,point,normal,rad,name){
  const g=group(parent,name,parent===root?'pad':'launcher');g.position.copy(point);g.quaternion.setFromUnitVectors(Y,normal);
  const boss=mesh(g,portGeom,dark,'Flight receptacle');boss.scale.set(rad*1.5,.11,rad*1.5);
  const face=mesh(g,portGeom,pale,'Connector face');face.scale.set(rad,.035,rad);face.position.y=.065;
  return g;
 }
 function sourcePoint(medium,index){
  const aliases={methane:['methane','lng','lch4'],hydrogen:['hydrogen','lh2'],lox:['lox','oxygen'],rp1:['rp1','kerosene']};
  for(const key of aliases[medium]||[medium])if(serviceSources.has(key))return serviceSources.get(key).clone();
  return V(serviceFrame.mastX-.7-index*.16,serviceFrame.grade+.9,serviceFrame.mastZ-1.5);
 }
 function material(medium){return new T.MeshStandardMaterial({color:mediumColor(medium),metalness:.3,roughness:.53,emissive:mediumColor(medium),emissiveIntensity:0});}
 function annotation(spec,anchor,priority=100){const entry={id:'umbilical-'+spec.id,title:spec.name,detail:spec.status+' · connected',anchor,kind:'ground',priority,groupId:spec.id};annotations.push(entry);return entry;}
 const specs=design.groups||[];
 for(const spec of specs){
  const target=targetFor(spec);if(!target)continue;
  const cons=design.connections.filter(c=>c.groupId===spec.id);if(!cons.length)continue;
  const internal=target.internal||spec.release.mode==='flight-separation';
  const assembly=group(internal?fitting:root,spec.name,internal?'adapter':'pad');assembly.userData.umbilicalGroup=spec.id;
  const portRoot=group(target.part,spec.name+' · vehicle interfaces','launcher');flightRoots.push(portRoot);
  const normal=target.normal,tangent=Math.abs(normal.y)>.9?V(1,0,0):V(normal.z,0,-normal.x),rad=internal?.035:Math.max(.055,Math.min(.14,r*.034));
  const panelWidth=Math.max(rad*4,cons.length*rad*3),panelHeight=Math.max(rad*3.4,internal?.20:.38);
  const panel=box(portRoot,target.point,V(panelWidth,panelHeight,.12),pale,'Vehicle service plate');
  panel.quaternion.setFromUnitVectors(V(0,0,1),normal);
  const headPoint=target.center.clone().addScaledVector(normal,target.radius+.18),retractPoint=headPoint.clone();
  const head=group(assembly,'Ground quick-disconnect head',internal?'adapter':'pad');head.position.copy(headPoint);
  if(internal){head.position.copy(target.point).addScaledVector(normal,.13);head.position.y=payloadSeatM-.12;}
  const headBox=box(head,V(),V(panelWidth+.12,panelHeight+.13,.26),dark,internal?'Carrier connector half':'Ground connector plate');headBox.quaternion.setFromUnitVectors(V(0,0,1),normal);
  const motion=group(assembly,'Service retraction mechanism',internal?'adapter':'pad');
  const base=V(serviceFrame.mastX,Math.min(serviceFrame.mastTopY-.3,Math.max(serviceFrame.grade+1.1,headPoint.y)),serviceFrame.mastZ);
  const low=headPoint.y<baseY+L*.16;let armPivot=null;
  // Aft services use local pedestals. Higher interfaces are carried from the
  // selected pad's mast or transporter spine; none are suspended in space.
  if(low&&!internal){
   base.copy(headPoint).addScaledVector(normal,Math.max(1.9,r*.76));base.y=serviceFrame.grade+1.0;
   const hh=Math.max(1,headPoint.y-base.y);box(motion,V(base.x,base.y+hh*.5,base.z),V(Math.max(.5,r*.14),hh,Math.max(.5,r*.14)),support,'Aft umbilical pedestal');
   base.y=headPoint.y;box(motion,base,V(1.0,.22,.75),steel,'Aft service hinge');
  }else if(!internal){
   armPivot=group(motion,'Retractable umbilical arm hinge');armPivot.position.copy(base);
   const a=V(),b=headPoint.clone().addScaledVector(normal,.7).sub(base),mid=a.clone().lerp(b,.5);
   const width=Math.max(.36,r*.15),length=a.distanceTo(b);
   const arm=box(armPivot,mid,V(length,width,width*1.4),support,'Umbilical support arm');arm.quaternion.setFromUnitVectors(V(1,0,0),b.clone().sub(a).normalize());
   rod(armPivot,a.clone().add(V(0,-Math.min(1.5,length*.12),0)),b,width*.16,steel,'Arm diagonal');
  }
  if(!internal&&!low&&serviceFrame.movingSpine){
   // Upper/payload feeds ride with the transporter spine. Tail pedestals stay
   // fixed to the pad, and the line below each vertical run is a flexible GSE
   // boundary. This keeps arm supports and feed pipes together during tipback.
   root.remove(assembly);serviceFrame.movingSpine.add(assembly);assembly.position.copy(serviceFrame.movingSpine.position).negate();
  }
  const fixedRoot=group(assembly,'Fixed service routing',internal?'adapter':'pad'),tails=[];
  const couplingSpan=Math.max(.9,r*.44),clearance=Math.max(1.2,r*.67);
  const entry=annotation(spec,head,internal?93:104);entry.connectionId=cons[0]?.id;
  const armVector=headPoint.clone().sub(base),pivotDirection=Math.sign(V(armVector.z,0,-armVector.x).dot(normal))||1;
  const item={spec,target,assembly,portRoot,head,motion,armPivot,base,headPoint,normal,clearance,entry,tails,internal,retractPoint,pivotDirection,connections:cons};groups.push(item);
  for(const [i,c] of cons.entries()){
   const offset=(i-(cons.length-1)/2)*rad*3,medium=c.medium,wire=isWire(medium),rr=wire?rad*.38:medium==='conditioned-air'?rad*1.16:rad*.64;
   const color=material(medium),padPoint=target.point.clone().addScaledVector(tangent,offset),flight=connector(portRoot,padPoint,normal,rr,c.name+' · flight side');
   // Separate colored media remain separate tubes and couplings. These ports
   // symbolize the interface allocation, not a released pin or hose count.
   const local=V().addScaledVector(tangent,offset),groundHead=group(head,c.name+' · ground side',internal?'adapter':'pad');groundHead.position.copy(local);
   const coupling=mesh(groundHead,portGeom,color,'Breakaway coupling');coupling.quaternion.setFromUnitVectors(Y,normal);coupling.scale.set(rr*1.16,.22,rr*1.16);
   const fixedEnd=internal?target.point.clone().addScaledVector(normal,.18).add(V(0,-.45,0)):base.clone().addScaledVector(tangent,offset).add(V(0,.18,0));
   let points;
   if(internal){
    points=[V(normal.x*.5,payloadSeatM-.48,normal.z*.5),fixedEnd];
   }else{
    const source=sourcePoint(medium,i),baseLow=V(fixedEnd.x,serviceFrame.grade+.9+i*.035,fixedEnd.z),sourceTurn=V(source.x,baseLow.y,baseLow.z);
    points=[source,sourceTurn,baseLow,fixedEnd];
   }
   const fixedMeshes=staticPipe(fixedRoot,points,rr,color,c.name+' · fixed feed');
   const hose=group(assembly,c.name+' · retained flexible lead',internal?'adapter':'pad'),segments=[];
   for(let j=0;j<6;j++)segments.push(mesh(hose,tubeGeom,color,c.name+' · flexible segment'));
   const beads=[];
   for(let j=0;j<2;j++){const bead=mesh(hose,ballGeom,color,c.name+' · selected route marker');bead.scale.setScalar(rr*1.42);bead.userData.serviceCue='Route highlight, not active fluid or electrical transfer';beads.push(bead);}
   const tail={connection:c,offset,rr,color,flight,groundHead,hose,segments,beads,fixedEnd,points:Array.from({length:7},()=>V()),materials:[color]};tails.push(tail);
   connectionMeshes.set(c.id,{groupId:spec.id,flight,groundHead,fixedMeshes,hose,segments,material:color,head,assembly});connectionAnchors.set(c.id,internal?flight:groundHead);
   contexts.set(c.id,{anchor:internal?flight:groundHead,halfM:internal?Math.max(1.2,panelWidth*2):Math.max(4.4,r*2.45,base.distanceTo(headPoint)*.55),groupId:spec.id,internal,direction:target.viewDirection||normal.clone().add(V(0,.20,0)).normalize()});
  }
 }
 const stateCache={t:null,value:null};
 function update(t,{pad=true,ascent=false,integration=false,reference=false,vehicleStudy=false,cargoHeld=false}={}){
  const modelTime=vehicleStudy?-45:t;
  if(stateCache.t!==modelTime){stateCache.t=modelTime;stateCache.value=launchUmbilicalState(design,modelTime);}lastState=stateCache.value;
  const byGroup=new Map(lastState.groups.map(s=>[s.id,s])),byConnection=new Map(lastState.connections.map(s=>[s.id,s]));
  root.visible=pad||ascent;
  for(const g of groups){
   const state=byGroup.get(g.spec.id),f=state?.releaseFraction??0,connected=state?.connected??false;
   const visible=!integration&&(!reference||vehicleStudy)&&(!cargoHeld||!g.internal);
   g.assembly.visible=visible&&(g.internal||pad||ascent);g.portRoot.visible=visible;
   if(!visible)continue;
   const retreat=g.spec.release.mode==='drop-away'?V(0,-g.clearance,0):g.normal.clone().multiplyScalar(g.clearance);
   g.retractPoint.copy(g.headPoint).addScaledVector(retreat,f);
   if(g.armPivot){
    const angle=g.spec.release.mode==='pivot-away'?g.pivotDirection*1.10*f:0;g.armPivot.rotation.y=angle;
    if(angle)g.retractPoint.copy(g.headPoint).sub(g.base).applyAxisAngle(Y,angle).add(g.base);
   }
   if(g.internal){g.retractPoint.copy(g.target.point).addScaledVector(g.normal,.13+f*.24);g.retractPoint.y=payloadSeatM-.12-f*.22;}
   g.head.position.copy(g.retractPoint);
   // At breakaway the head immediately belongs to the ground. It is not
   // evaluated from a moving rocket endpoint, so no line can follow liftoff.
   g.entry.detail=state?.state==='clear'?'Disconnected · ground hardware retained':state?.state==='releasing'?'Breakaway · retracting clear':g.internal?'Carrier-to-spacecraft interface':g.spec.status+' · connected';
   for(const tail of g.tails){
    const cs=byConnection.get(tail.connection.id),attached=cs?.connected??connected;
    const tangent=Math.abs(g.normal.y)>.9?V(1,0,0):V(g.normal.z,0,-g.normal.x),end=g.retractPoint.clone().addScaledVector(tangent,tail.offset);
    const start=tail.fixedEnd,sag=(isWire(tail.connection.medium)?1.18:.55)*Math.min(1.5,start.distanceTo(end)*.13);
    for(let j=0;j<tail.points.length;j++){
     const q=j/(tail.points.length-1),p=tail.points[j];p.copy(start).lerp(end,q);p.y-=4*q*(1-q)*sag;
    }
    for(let j=0;j<tail.segments.length;j++)setRod(tail.segments[j],tail.points[j],tail.points[j+1],tail.rr);
    for(let j=0;j<tail.beads.length;j++){
     const bead=tail.beads[j];bead.visible=tail.connection.id===selectedId;
     // Fixed markers identify the selected route. Physical attachment does
     // not mean a propellant valve is open or payload power is energized.
     const f=(j+1)/3,index=f*(tail.points.length-1),a=Math.floor(index);bead.position.copy(tail.points[a]).lerp(tail.points[Math.min(a+1,tail.points.length-1)],index-a);
    }
   }
  }
  return lastState;
 }
 function setSelectedConnection(id){
  selectedId=connectionMeshes.has(id)?id:null;
  for(const [key,m] of connectionMeshes){m.material.emissiveIntensity=key===selectedId?.55:0;}
  for(const g of groups){const chosen=g.connections.find(c=>c.id===selectedId);g.entry.priority=chosen?180:g.internal?93:104;g.entry.connectionId=chosen?.id||g.connections[0]?.id;for(const tail of g.tails)for(const bead of tail.beads)bead.visible=tail.connection.id===selectedId;}
 }
 function getConnectionAnchor(id){
  if(connectionAnchors.has(id))return connectionAnchors.get(id);
  const g=groups.find(g=>!g.internal&&g.target.part===shell)||groups.find(g=>g.spec.visual.target==='upper')||groups.find(g=>!g.internal)||groups[0];return g?.head||null;
 }
 function getConnectionContext(id){
  if(contexts.has(id))return contexts.get(id);
  const anchor=getConnectionAnchor(id),g=groups.find(g=>g.head===anchor);
  return {anchor,halfM:Math.max(5.4,r*3.8),groupId:g?.spec.id||null,internal:!!g?.internal,direction:g?.normal.clone().add(V(0,.20,0)).normalize()||V(-.70,.14,-.70).normalize()};
 }
 update(-45,{pad:true});
 return {root,design,groups,annotations,connectionMeshes,connectionAnchors,flightRoots,update,setSelectedConnection,getConnectionAnchor,getConnectionContext,get state(){return lastState;},get selectedConnection(){return selectedId;}};
}
