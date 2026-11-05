// Ground handling is displayed in two adjacent work zones. Dimensions of the
// facility, slings and transfer hardware are visualization assumptions in metres.
import * as T from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const u01=x=>Math.max(0,Math.min(1,x));
const interval=(t,a,b)=>{const q=u01((t-a)/(b-a));return q*q*(3-2*q)};
const tau=2*Math.PI;
export function integrationLayout(h,record,stage2,capH){
 const radius=h.fairing.outerDiameterM/2,space=Math.max(2.8*radius,h.stowedDiameterM+2.8,7),ringX=-space;
 const star=record.family==='starship',horizontal=record.kind==='horizontal',receiverX=space*(horizontal?1.85:1.75);
 const floor=-Math.max(.82,Math.min(1.45,radius*.38)),portY=horizontal?floor+radius+2:floor+stage2+3.7;
 const height=Math.max(portY+capH+7,h.stowedLengthM+capH+5,22);
 return {record,star,wholeCap:star||record.family==='ariane',horizontal,ringX,receiverX,floor,portY,capH,radius,space,height,stage2,
  craneY:height+2,roomHalfX:Math.max(space*2.7,receiverX+(horizontal?stage2+5:radius*2)),
  roomHalfZ:Math.max(space*1.82,14)};
}

export function bayHandlingPose(h,g,state){
 const {space,ringX,receiverX,portY,radius:r,star,horizontal}=g;
 const {seat}=state,close=h.fairing.fit?state.close:0,lift=h.fairing.fit?state.lift:0,
  transfer=h.fairing.fit?state.transfer:0,mate=h.fairing.fit?state.mate:0;
 const angle=horizontal?Math.PI/2*interval(lift,.35,1):0,clearY=horizontal?portY:portY+Math.max(r,2);
 const assembly=V(ringX+(receiverX-ringX)*transfer-(horizontal?3*(1-mate)*transfer:0),
  clearY*(horizontal?interval(lift,0,.35):lift)-(horizontal?0:(clearY-portY)*mate),0);
 const road=!star&&!horizontal,haulY=1.10,holdX=receiverX-space;
 if(road){
  // The encapsulated upright composite travels near the floor. Only the
  // receiving crane raises it clear of the launcher for final placement.
  assembly.set(ringX+(holdX-ringX)*transfer+space*interval(mate,.48,.78),
    haulY*lift+(clearY-haulY)*interval(mate,0,.45)-(clearY-portY)*interval(mate,.8,1),0);
 }
 const article=seat<1?V(ringX*interval(seat,.22,.75),1.8*(interval(seat,0,.24)-interval(seat,.77,1)),0):assembly.clone();
 // An integrated Starship payload section has a retained outer nose. Lift it
 // above the stowed article before translating and lowering around the payload.
 const capClear=h.stowedLengthM+1.5;
 const shell=g.wholeCap&&close<1?V(ringX,capClear*(interval(close,0,.3)-interval(close,.72,1)),
  -space*(1-interval(close,.33,.68))):assembly.clone();
 return {article,assembly,shell,angle,close,lift,transfer,mate,opening:g.wholeCap?0:1-close};
}
export function buildIntegrationRig(ctx){
 const {facility,layout:g,h,box,tube,cylinder,steel,rib,dark,black,mat}=ctx;
 const {star,horizontal,radius:r,space,receiverX:x,ringX,portY,craneY,floor}=g;
 const mark=mat('#d7a44f'),beam=mat('#476a78',.32),slate=mat('#324852'),warning=mat('#e2bd6a');
 const attach=name=>{const o=new T.Group();o.name=name;facility.add(o);return o};
 const ground=attach(g.record.facility),rig=attach('Traveling bridge and lifting rig');
 const east=horizontal?g.roomHalfX-1:x+r*2.3,west=ringX-r*2.5,near=r+3,far=-space-r*1.4;
 for(const xx of [west,east]){
  for(const z of [far,near]){
   box(ground,xx,(craneY+floor)/2,z,.44,craneY-floor,.48,beam);
   box(ground,xx,floor+.09,z,.85,.18,.85,steel);
  }
  box(ground,xx,craneY,(near+far)/2,.44,.54,near-far,slate);
 }
 const bridge=new T.Group();rig.add(bridge);
 for(const dz of [-.30,.30])box(bridge,(east+west)/2,craneY+.31,dz,east-west,.47,.28,mark);
 const traveler=new T.Group();bridge.add(traveler);
 box(traveler,0,craneY+.47,0,1.55,.70,1.35,beam);
 const yoke=new T.Group();rig.add(yoke);
 const beamHead=box(yoke,0,0,0,1,.14,.17,warning);
 const fixture=attach('Removable payload lifting frame'),bus=h.fairing.stack.find(q=>q.part==='Insulated bus');
 const busY=bus.z0M+h.bodyLengthM-.15,outer=Math.max(h.stowedDiameterM*.52,h.bodyHeightM*.59);
 for(const side of [-1,1]){
  const innerZ=side*h.bodyHeightM*.51,outZ=side*outer;
  for(const k of [-1,1]){
   const x=k*h.bodyWidthM*.36;
   box(fixture,x,busY,innerZ,.18,.19,.09,warning);
   tube(fixture,V(x,busY,innerZ),V(x,busY,outZ),.052,beam);
   tube(fixture,V(x,busY,outZ),V(0,h.stowedLengthM,outZ),.045,beam);
  }
 }

 const ropes=[];
 for(let i=0;i<4;i++){const line=cylinder(rig,0,0,0,.025,.025,1,i<2?black:steel,'pad',8);ropes.push(line)}
 function cable(o,a,b){const d=b.clone().sub(a);o.position.copy(a).lerp(b,.5);o.scale.y=Math.max(.001,d.length());o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize())}
 // Floor rails under the transfer equipment or ring stand outside the bells.
 const rack=attach(horizontal?'Horizontal upper-stage cradle':star?'Starship transport stand':'Vertical launch interface');
 if(horizontal){
  for(const z of [-r*.7,r*.7])box(rack,x+g.stage2*.48,floor+.06,z,g.stage2+4,.12,.16,steel);
  for(const j of [.26,.76]){
   const xx=x+j*g.stage2;
   for(const sign of [-1,1]){
    const zz=sign*r*.67,top=portY-r*.74;
    box(rack,xx,(floor+top)/2,zz,.42,top-floor,.35,beam);
    tube(rack,V(xx,floor+.1,sign*.15),V(xx,top,zz),.09,steel);
    box(rack,xx,top-.08,zz,.82,.16,.45,dark);
   }
  }
  // Upending strongback rolls from the cleanroom interface to the stage.
 }else{
  const skirtY=portY-g.stage2;
  for(let j=0;j<8;j++){
   const a=j*tau/8,b=a+tau/8,rr=star?4.45:r*.97;
   const foot=V(x+(rr+.55)*Math.cos(a),floor+.08,(rr+.55)*Math.sin(a));
   const pad=V(x+rr*Math.cos(a),skirtY-.12,rr*Math.sin(a));
   tube(rack,foot,pad,.13,beam);
   tube(rack,foot,V(x+rr*Math.cos(b),skirtY-.12,rr*Math.sin(b)),.065,steel);
   box(rack,pad.x,skirtY-.08,pad.z,.36,.16,.38,dark);
   box(rack,foot.x,floor+.05,foot.z,.55,.10,.55,steel);
  }
  const iz=-r-2.7,levels=g.record.kind==='mobile-tower'?4:star?3:2,sideX=x+r+1.45;
  const top=portY+3;
  for(const sx of [-1,1])for(const sz of [-1,1])box(rack,sideX+sx*1.15,(floor+top)/2,iz+sz*1.45,.19,top-floor,.19,beam);
  for(let j=1;j<=levels;j++){
   const y=floor+(top-floor)*j/(levels+1);
   box(rack,sideX,y,iz,3,.20,3.7,steel);
   for(const zz of [-1.6,1.6]){
    box(rack,sideX,y+1,iz+zz,3,.065,.065,mark);
    for(const xx of [-1.4,0,1.4])box(rack,sideX+xx,y+.5,iz+zz,.055,1,.055,mark);
   }
  }
  if(['mobile-tower','upper-composite'].includes(g.record.kind)){
   // Mobile service gantry on two parallel travel rails; its lifting opening
   // remains clear for the upright upper composite.
   const railWidth=r+3.4;
   for(const k of [-1,1]){
    box(rack,x+k*railWidth,floor+.08,0,.22,.16,space*2.4,steel);
    for(const z of [-4.3,4.3]){
     const legX=x+k*railWidth;
     box(rack,legX,(floor+g.craneY)/2,z,.36,g.craneY-floor,.36,beam);
     const bogie=cylinder(rack,legX,floor+.28,z,.24,.24,.20,dark,'pad',12);bogie.rotation.z=Math.PI/2;
    }
   }
   for(const z of [-4.3,4.3])box(rack,x,g.craneY-.48,z,2*railWidth,.48,.31,beam);
  }
  if(g.record.family==='glenn'){
   // Separate work decks flank the pad crane's vertical receiving interface.
   for(const side of [-1,1]){const xx=x+side*(r+1.7);
    box(rack,xx,portY-1.2,0,2.2,.3,2*r+1,steel);
    for(const zz of [-r,r])box(rack,xx,(portY-1.4+floor)/2,zz,.19,portY-1.4-floor,.19,beam);
   }
  }
  const upper=portY-.24;
  box(rack,sideX,upper,iz+2.15,2,.21,3,steel);
 }
 const receiverAnchor=new T.Object3D();receiverAnchor.position.set(x,horizontal?portY:portY-g.stage2*.46,0);facility.add(receiverAnchor);
 const moving=attach('Encapsulated payload transfer support');
 if(horizontal){
  // Low transport saddle carries the horizontal assembly forward once upended.
  for(const j of [.18,.65])for(const side of [-1,1]){
   const xx=-g.capH*j,zz=side*r*.62,H=portY-r*.82-floor;
   box(moving,xx,floor+H*.5,zz,.36,H,.29,beam);
   cylinder(moving,xx,floor+.16,zz,.16,.16,.12,black,'pad',12).rotation.x=Math.PI/2;
   box(moving,xx,portY-r*.82-.08,zz,.9,.16,.4,dark);
  }
 }
 if(!horizontal&&!star){
  const topY=1.10;box(moving,0,topY-.1,0,1.82*r,.20,1.82*r,beam);
  for(const k of [-1,1])for(const j of [-1,1]){
   const xx=k*r*.66,zz=j*r*.76;
   box(moving,xx,(topY+floor)/2,zz,.19,topY-floor-.18,.22,steel);
   const wheel=cylinder(moving,xx,floor+.20,zz,.20,.20,.26,dark,'pad',14);wheel.rotation.z=Math.PI/2;
  }
 }
 const holding=attach('Forward module support shoes');
 if(g.wholeCap)for(let j=0;j<4;j++){
  const a=.4+j*Math.PI/2,px=ringX+r*Math.cos(a),pz=-space+r*Math.sin(a);
  cylinder(holding,px,floor*.5,pz,.18,.22,-floor,dark).name='Forward module storage shoe';
 }
 const handlingAnchor=new T.Object3D();rig.add(handlingAnchor);
 function update(s,p){
  const capped=s.close>0&&h.fairing.fit,pickCap=g.wholeCap&&capped&&s.close<1;
  const active=!(horizontal&&p.lift>.999)&&p.mate<1;
  moving.visible=horizontal?p.lift>=.999:!star&&p.lift>=.999;
  moving.position.x=horizontal?p.assembly.x:ringX+(x-space-ringX)*p.transfer;
  let root=p.article,top=h.stowedLengthM,arm=outer,rot=0;
  if(pickCap||capped&&s.close===1){
   root=pickCap?p.shell:p.assembly;top=g.capH*.76;arm=r*.74;rot=p.angle;
  }
  const attachHeight=top,headH=pickCap||capped&&s.close===1?g.capH+1.45:top+1.1;
  const a=V(0,0,1),tip=V(0,headH,0).applyAxisAngle(a,rot).add(root);
  const support=[-1,1].map(k=>V(0,attachHeight,k*arm).applyAxisAngle(a,rot).add(root));
  bridge.position.z=tip.z;traveler.position.x=tip.x; yoke.position.copy(tip);yoke.rotation.y=Math.PI/2;beamHead.scale.x=arm*2.2;
  fixture.visible=s.seat>0&&s.seat<1;fixture.position.copy(p.article);
  const onCarrier=!horizontal&&!star&&p.lift>=1&&p.mate===0;
  const hanging=active&&!onCarrier&&(s.seat>0&&s.seat<1||pickCap||s.lift>0);
  yoke.visible=hanging;for(const rope of ropes)rope.visible=hanging;
  for(let i=0;i<2;i++){const sign=i?1:-1,Q=tip.clone().add(V(0,0,sign*arm));
   cable(ropes[i],V(tip.x,craneY+.29,tip.z+sign*.29),Q);cable(ropes[i+2],Q,support[i]);}
  handlingAnchor.position.copy(tip);
 }
 return {receiverAnchor,handlingAnchor,update};
}
