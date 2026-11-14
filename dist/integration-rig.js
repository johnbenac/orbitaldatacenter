// Ground handling is displayed in two adjacent work zones. Dimensions of the
// facility, slings and transfer hardware are visualization assumptions in metres.
import * as T from './vendor/three.module.js';
import {cargoBay,starshipCargoFit} from './starship-cargo.js';
import {connectionAnchor} from './connection-geometry.js';
import {objectMatrixInFrame} from './routing-audit.js';
import {hoistRoutingSnapshot} from './bay-hoist-routing.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const u01=x=>Math.max(0,Math.min(1,x));
const interval=(t,a,b)=>{const q=u01((t-a)/(b-a));return q*q*(3-2*q)};
const tau=2*Math.PI;
export function integrationLayout(h,record,stage2,capH){
 const radius=h.fairing.outerDiameterM/2,space=Math.max(2.8*radius,h.stowedDiameterM+2.8,7),ringX=-space;
 const star=record.family==='starship',horizontal=record.kind==='horizontal',receiverX=space*(horizontal?1.85:1.75);
 const floor=-Math.max(.82,Math.min(1.45,radius*.38)),portY=horizontal?floor+radius+2:floor+stage2+3.7;
 const height=Math.max(portY+capH+7,h.stowedLengthM+capH+5,22);
 return {record,star,wholeCap:record.family==='ariane',horizontal,ringX,receiverX,floor,portY,capH,radius,space,height,stage2,
  craneY:height+2,roomHalfX:Math.max(space*2.7,receiverX+(horizontal?stage2+5:radius*2)),
  roomHalfZ:Math.max(space*1.82,14)};
}

export function bayHandlingPose(h,g,state){
 const {space,ringX,receiverX,portY,radius:r,star,horizontal}=g;
 if(star){
  const allowed=h.payloadInterface.passes&&h.fairing.fit&&(h.fairing.cargoAccess??starshipCargoFit(h.fairing.stack,h.input)).fits;
  const {seat,close,lift,transfer,mate}=allowed?state:{seat:0,close:0,lift:0,transfer:0,mate:0};
  const opening=seat*(1-mate),carriageM=cargoBay.strokeM*close*(1-transfer);
  const shell=V(receiverX,portY,0),assembly=V(receiverX-carriageM,portY+cargoBay.deckM,0);
  // Lift at the checkout stand and cross the aisle above the outboard berth.
  // Lower onto the exposed fitting. No sling or bridge goes inside the hatch.
  const hoisted=portY+cargoBay.deckM+1.1;
  const article=lift>=1?assembly.clone():V((receiverX-cargoBay.strokeM)*interval(close,.48,1),
   hoisted*interval(close,0,.48)-1.1*lift,0);
  return {article,assembly,shell,angle:0,seat,close,lift,transfer,mate,opening,carriageM};
 }
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
 const annotations=[],note=(id,title,detail,anchor,priority=65,lens=null)=>annotations.push({id,title,detail,anchor,kind:'facility',priority,lens});
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
 const bridge=new T.Group();bridge.name='Traveling crane bridge';rig.add(bridge);
 // The hoist hangs between the bridge rails. The former 0.60 m spacing put
 // both paid-out ropes through a girder, as well as burying the hoist case.
 // A 1.72 m clear opening accommodates the actual 1.35 m case and outlets.
 for(const dz of [-1,1]){const girder=box(bridge,(east+west)/2,craneY+.31,dz,east-west,.47,.28,mark);girder.name='Bridge crane girder';if(dz>0)note('bridge-crane','Bridge crane','Facility lifting system',girder,71);}
 const traveler=new T.Group();bridge.add(traveler);
 traveler.userData.bayRoutingMotion={owner:'bay:trolley',type:'rigid'};
 for(const xx of [-.60,.60]){const carrier=box(traveler,xx,craneY+.64,0,.16,.18,2.3,steel);carrier.name='Hoist trolley rail crossmember';}
 const trolley=box(traveler,0,craneY+.67,0,1.55,1.10,1.35,beam);trolley.name='Crane traveling hoist';note('crane-hoist','Traveling hoist','Follows the handling load',trolley,77);
 const yoke=new T.Group();rig.add(yoke);
 yoke.userData.bayRoutingMotion={owner:'bay:yoke',type:'rigid'};
 const beamHead=box(yoke,0,0,0,1,.14,.17,warning);
 beamHead.name='Load-spreading lifting yoke';note('lifting-yoke','Lifting yoke','Ground lifting fixture',beamHead,117,'payload');
 const fixture=attach('Removable payload lifting frame'),bus=h.fairing.stack.find(q=>q.part==='Insulated bus');
 fixture.userData.bayRoutingMotion={owner:'bay:article',type:'rigid'};
 const busY=bus.z0M+h.bodyLengthM-.15,outer=Math.max(h.stowedDiameterM*.52,h.bodyHeightM*.59);
 for(const side of [-1,1]){
  const innerZ=side*h.bodyHeightM*.51,outZ=side*outer;
  for(const k of [-1,1]){
   const x=k*h.bodyWidthM*.36;
   box(fixture,x,busY,innerZ,.18,.19,.09,warning);
   tube(fixture,V(x,busY,innerZ),V(x,busY,outZ),.052,beam);
   tube(fixture,V(x,busY,outZ),V(0,h.stowedLengthM,outZ),.045,beam);
  }
  for(const xx of [-.055,.055])box(fixture,xx,h.stowedLengthM+.05,outZ,.020,.10,.035,steel).name='Payload lifting-eye clevis cheek';
 }
 const collar=attach('Removable external fairing lifting collar'),collarHeight=.18;
 collar.userData.bayRoutingMotion={owner:'bay:assembly',type:'rigid'};
 const fairingProfile=h.fairing.profile,profileMaximum=Math.max(...fairingProfile.map(p=>p[1]));let collarRadius=r;
 for(let i=1;i<fairingProfile.length;i++)if(collarHeight<=fairingProfile[i][0]){const [y0,r0]=fairingProfile[i-1],[y1,r1]=fairingProfile[i];collarRadius=r/profileMaximum*(r0+(r1-r0)*(collarHeight-y0)/(y1-y0));break;}
 const collarRing=new T.Mesh(new T.TorusGeometry(collarRadius+.035,.035,8,80),steel);collarRing.rotation.x=Math.PI/2;collarRing.position.y=collarHeight;collarRing.name='External fairing lifting collar';collar.add(collarRing);
 for(const sign of [-1,1])for(const xx of [-.055,.055]){
  tube(collar,V(xx,collarHeight,sign*Math.sqrt(Math.max(0,(collarRadius+.035)**2-xx*xx))),V(xx,collarHeight,sign*(r+.12)),.018,steel).name='Fairing lifting-eye outrigger';
  box(collar,xx,collarHeight+.05,sign*(r+.12),.020,.10,.035,steel).name='Fairing lifting-eye clevis cheek';
 }

 const ropes=[],ropeRecords=[],reels=[],loadEyes=[],ropeRadiusM=.025,reelRadiusM=.45,minimumBendRadiusM=.40,installedLengthM=craneY-floor+Math.abs(x-ringX)+2*r+5;
 const eye=(parent,name)=>{const anchor=connectionAnchor(parent,[0,0,0],[0,1,0],name),ring=new T.Mesh(new T.TorusGeometry(.055,.015,8,16),steel);ring.name=name+' swivel eye';ring.userData.part='pad';anchor.add(ring);return anchor;};
 for(let i=0;i<2;i++){
  const reel=new T.Group();reel.name='Hoist paid-out rope drum '+(i+1);traveler.add(reel);reel.position.set((i?1:-1)*.32,craneY+.67,0);const drum=cylinder(reel,0,0,0,reelRadiusM,reelRadiusM,.36,steel,'pad',24);drum.rotation.z=Math.PI/2;reels.push(reel);
  loadEyes.push(eye(rig,'Removable load lifting eye '+(i+1)));
 }
 for(let i=0;i<4;i++){
  const upper=i<2,index=i%2,line=cylinder(rig,0,0,0,ropeRadiusM,ropeRadiusM,1,upper?black:steel,'pad',8),from=eye(upper?traveler:yoke,(upper?'Hoist outlet ':'Yoke lower eye ')+(index+1)),to=upper?eye(yoke,'Yoke upper eye '+(index+1)):loadEyes[index],record={id:'bay:hoist:'+(upper?'winch-':'payload-sling-')+index,kind:upper?'winch-payout':'fixed-sling',mesh:line,from,to,radiusM:ropeRadiusM,minimumBendRadiusM,reel:upper?reels[index]:null,reelRadiusM,installedLengthM,cutLengthM:star?.89:.84};
  line.name=upper?'Paid-out hoist rope '+(index+1):'Fixed-cut load sling '+(index+1);line.userData.routingLine=true;line.userData.hoistConnection=record;ropes.push(line);ropeRecords.push(record);
  from.userData.bayRoutingMotion={owner:'bay:rope-eye:'+i+':from',type:'hoist-eye',lineIndex:i,end:'from'};
  to.userData.bayRoutingMotion={owner:'bay:rope-eye:'+i+':to',type:'hoist-eye',lineIndex:i,end:'to'};
 }
 const placeAnchor=(anchor,point,normal)=>{const matrix=objectMatrixInFrame(rig,anchor.parent);anchor.position.copy(point).applyMatrix4(matrix);anchor.quaternion.setFromUnitVectors(V(0,0,1),normal.clone().transformDirection(matrix));};
 function cable(index,a,b,{active,loadKind='payload',cutLengthM=null,loadOwner='bay:article'}={}){
  const o=ropes[index],record=ropeRecords[index],d=b.clone().sub(a),length=d.length();o.position.copy(a).lerp(b,.5);o.scale.y=Math.max(.001,length);o.quaternion.setFromUnitVectors(V(0,1,0),d.clone().normalize());o.visible=o.userData.routingPresent=!!active;
  placeAnchor(record.from,a,d);placeAnchor(record.to,b,d.clone().negate());record.from.visible=record.from.userData.routingPresent=!!active;record.to.visible=record.to.userData.routingPresent=!!active;
  record.motion={type:record.kind==='winch-payout'?'hoist-payout':'rigid',owner:record.kind==='winch-payout'?'bay:winch:'+index:loadOwner,lineIndex:index};
  for(const anchor of [record.from,record.to])Object.assign(anchor.userData.bayRoutingMotion,{routeId:record.id,loadOwner});
  if(record.kind==='winch-payout')record.reel.rotation.x=length/reelRadiusM;else{record.id='bay:hoist:'+loadKind+'-sling-'+(index-2);record.cutLengthM=cutLengthM;for(const anchor of [record.from,record.to])anchor.userData.bayRoutingMotion.routeId=record.id;}
 }
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
    const pad=box(rack,xx,top-.08,zz,.82,.16,.45,dark);pad.name='Upper-stage cradle contact pad';if(j===.26&&sign===1)note('receiving-cradle','Upper-stage cradle','Horizontal integration support',pad,83);
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
   const deck=box(rack,sideX,y,iz,3,.20,3.7,steel);deck.name='Receiving service platform';if(j===1)note('service-platform','Receiving work platform','Facility access equipment',deck,70);
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
 if(star){
  // At one g the outboard pallet lands on a ground-supported dock. The
  // long guide beams align it; the high-bay truss takes the hoist handoff.
  const dock=attach('Ground support · carriage load bridge'),outerX=x-cargoBay.strokeM,innerX=x-r-.65;
  const top=portY+cargoBay.deckM-.15,w=1.18,levels=Math.ceil((top-floor)/4.5);
  for(const xx of [outerX-.75,innerX])for(const zz of [-w,w]){
   box(dock,xx,(top+floor)/2-.12,zz,.24,top-floor-.24,.24,beam);
   box(dock,xx,floor+.06,zz,.64,.12,.64,steel);
  }
  for(const sign of [-1,1]){
   const lo=outerX-.75,z=sign*w;
   box(dock,(lo+innerX)/2,top-.16,z,innerX-lo+.3,.21,.15,steel);
   for(const xx of [outerX-.68,outerX+.68,innerX-.12]){
    const roller=cylinder(dock,xx,top-.075,z,.075,.075,.13,warning,'pad',16);roller.rotation.x=Math.PI/2;roller.name='Ground load bridge roller';if(sign===1&&xx===outerX+.68)note('cargo-load-bridge','Cargo load bridge','Ground-supported carriage berth',roller,88);
   }
   for(let k=0;k<levels;k++){
    const y0=floor+(top-.25-floor)*k/levels,y1=floor+(top-.25-floor)*(k+1)/levels;
    tube(dock,V(k%2?lo:innerX,y0,z),V(k%2?innerX:lo,y1,z),.087,steel);
    tube(dock,V(lo,y1,z),V(innerX,y1,z),.078,beam);
    tube(dock,V(k%2?lo:innerX,y1,-w),V(k%2?lo:innerX,y1,w),.075,steel);
   }
  }
 }
 const receiverAnchor=new T.Object3D();receiverAnchor.position.set(x,horizontal?portY:portY-g.stage2*.46,0);facility.add(receiverAnchor);
 const moving=attach('Encapsulated payload transfer support');
 moving.userData.bayRoutingMotion={owner:'bay:transporter',type:'rigid'};
 if(horizontal){
  // Low transport saddle carries the horizontal assembly forward once upended.
  for(const j of [.18,.65])for(const side of [-1,1]){
   const xx=-g.capH*j,zz=side*r*.62,H=portY-r*.82-floor;
   box(moving,xx,floor+H*.5,zz,.36,H,.29,beam);
   cylinder(moving,xx,floor+.16,zz,.16,.16,.12,black,'pad',12).rotation.x=Math.PI/2;
   const saddle=box(moving,xx,portY-r*.82-.08,zz,.9,.16,.4,dark);saddle.name='Transport support saddle';if(j===.18&&side===1)note('transfer-support','Transfer support','Moves with encapsulated payload',saddle,95);
  }
 }
 if(!horizontal&&!star){
  const topY=1.10,deck=box(moving,0,topY-.1,0,1.82*r,.20,1.82*r,beam);deck.name='Payload transporter deck';note('transfer-support','Payload transporter','Ground transfer support',deck,95);
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
  const capped=!star&&s.close>0&&h.fairing.fit,pickCap=g.wholeCap&&capped&&s.close<1;
  const active=!(horizontal&&p.lift>.999)&&p.mate<1;
  if(star){
   const attached=p.seat>=1&&p.lift<1;
   const cx=p.lift>=1?x-cargoBay.strokeM:p.article.x;
   const pick=V(cx,p.article.y+h.stowedLengthM,0),top=pick.y+1.15;
   moving.visible=moving.userData.routingPresent=false;collar.visible=collar.userData.routingPresent=false;fixture.visible=fixture.userData.routingPresent=attached;fixture.position.copy(p.article);
   bridge.position.z=0;traveler.position.x=cx;yoke.visible=yoke.userData.routingPresent=attached;yoke.position.set(cx,top,0);yoke.rotation.y=Math.PI/2;beamHead.scale.x=outer*2.2;
   for(let i=0;i<2;i++){
    const zz=(i?1:-1)*outer,q=V(cx,top,zz);
    cable(i,V(cx,craneY+.07,(i?1:-1)*.29),q.clone().add(V(0,.12,0)),{active:attached});cable(i+2,q.clone().add(V(0,-.16,0)),V(cx,pick.y+.10,zz),{active:attached,cutLengthM:.89});
   }
   handlingAnchor.position.copy(pick);return;
  }

  moving.visible=moving.userData.routingPresent=horizontal?p.lift>=.999:!star&&p.lift>=.999;
  moving.position.x=horizontal?p.assembly.x:ringX+(x-space-ringX)*p.transfer;
  let root=p.article,top=h.stowedLengthM,arm=outer,rot=0;
  if(pickCap||capped&&s.close===1){
   root=pickCap?p.shell:p.assembly;top=collarHeight;arm=r+.12;rot=p.angle;
  }
  const attachHeight=top,headH=pickCap||capped&&s.close===1?g.capH+1.45:top+1.1;
  const a=V(0,0,1),tip=V(0,headH,0).applyAxisAngle(a,rot).add(root);
  const support=[-1,1].map(k=>V(0,attachHeight,k*arm).applyAxisAngle(a,rot).add(root));
  bridge.position.z=tip.z;traveler.position.x=tip.x; yoke.position.copy(tip);yoke.rotation.y=Math.PI/2;beamHead.scale.x=arm*2.2;
  fixture.visible=fixture.userData.routingPresent=s.seat>0&&s.seat<1;fixture.position.copy(p.article);
  const onCarrier=!horizontal&&!star&&p.lift>=1&&p.mate===0;
  const hanging=active&&!onCarrier&&(s.seat>0&&s.seat<1||pickCap||s.lift>0);
  yoke.visible=yoke.userData.routingPresent=hanging;const loadAxis=V(0,1,0).applyAxisAngle(a,rot),loadKind=pickCap||capped&&s.close===1?'fairing':'payload';
  collar.visible=collar.userData.routingPresent=hanging&&loadKind==='fairing';collar.position.copy(root);collar.rotation.z=rot;collar.userData.bayRoutingMotion.owner=pickCap?'bay:cap':'bay:assembly';
  for(let i=0;i<2;i++){const sign=i?1:-1,Q=tip.clone().add(V(0,0,sign*arm));
   cable(i,V(tip.x,craneY+.07,tip.z+sign*.29),Q.clone().add(V(0,.12,0)),{active:hanging});cable(i+2,Q.clone().addScaledVector(loadAxis,-.16),support[i].clone().addScaledVector(loadAxis,.10),{active:hanging,loadKind,loadOwner:loadKind==='payload'?'bay:article':pickCap?'bay:cap':'bay:assembly',cutLengthM:headH-attachHeight-.26});}
  handlingAnchor.position.copy(tip);
 }
 return {receiverAnchor,handlingAnchor,rigAnnotations:()=>annotations,hoistRoutingSnapshot:options=>hoistRoutingSnapshot(ropeRecords,options),hoistRoutingRecords:ropeRecords,update};
}
