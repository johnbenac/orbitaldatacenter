import {buildBayEquipment} from './bay-equipment.js';
import {buildIntegrationRig} from './integration-rig.js';
import {processingFacility} from './processing-facilities.js';
import * as T from './vendor/three.module.js';
const v=(x,y,z)=>new T.Vector3(x,y,z);
function painted(w,h,draw){
 const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;
 return new T.MeshStandardMaterial({color:0xffffff,map:tex,roughness:.83,metalness:.10});
}
function rng(){let s=41956;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);}
function plateTexture(){return painted(1536,1024,(g,w,h)=>{
 const rand=rng(),fill=(c,x,y,dx,dy)=>{g.fillStyle=c;g.fillRect(x,y,dx,dy);};
 const grad=g.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#263338');grad.addColorStop(.4,'#4e5b5e');grad.addColorStop(.72,'#566062');grad.addColorStop(1,'#2f424b');g.fillStyle=grad;g.fillRect(0,0,w,h);
 for(let k=0;k<36000;k++){const q=rand();fill(q>.5?'rgba(208,219,215,.045)':'rgba(3,10,16,.048)',rand()*w,rand()*h,1+rand()*3,.7+rand()*2);}
 for(let k=0;k<16;k++){const x=k*104;fill('#344246',x,0,1.4,h);fill('rgba(151,165,159,.43)',x+1.8,0,.8,h);}
 for(let k=0;k<13;k++){const y=k*90;fill('#344246',0,y,w,1.4);fill('rgba(151,165,159,.43)',0,y+1.5,w,.75);}
 for(const side of [-1,1]){const y=h*.5+side*h*.173;fill('#172d35',w*.24,y-2,w*.52,4);fill('#c3ab66',w*.24,y-1,w*.52,1.8);}
 for(let k=0;k<40;k++){fill('#8b8870',w*.17+k*w*.016,h*.68,5,2);}
 for(let k=0;k<8;k++){const x=w*(.20+.08*k);fill('#233239',x,h*.724,41,6);for(let j=0;j<8;j++)fill('#68737a',x+j*5,h*.725,1.5,4);}
 g.save();g.translate(w*.49,h*.699);g.fillStyle='rgba(218,211,182,.58)';g.font='600 14px monospace';g.fillText('PAYLOAD HANDLING    /    01',0,0);g.restore();
});}
function wallTexture(name){return painted(1400,550,(g,w,h)=>{
 const rand=rng(),grad=g.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#12212a');grad.addColorStop(.38,'#364650');grad.addColorStop(1,'#1d2d33');g.fillStyle=grad;g.fillRect(0,0,w,h);
 for(let k=0;k<w;k+=9){g.fillStyle='rgba(169,181,178,.13)';g.fillRect(k,0,1,h);g.fillStyle='rgba(4,11,17,.30)';g.fillRect(k+4,0,2,h);}
 for(let k=0;k<10;k++){let x=k*146;g.fillStyle='#111b23';g.fillRect(x,0,6,h);g.fillStyle='#5c6d73';g.fillRect(x+6,0,2,h);}
 for(let k=0;k<20;k++){let x=k*75;const tint=180+rand()*40;g.fillStyle='#15242a';g.fillRect(x+5,28,62,60);g.fillStyle='rgb(116,143,'+Math.round(tint)+')';g.fillRect(x+8,31,56,53);g.fillStyle='rgba(39,60,73,.7)';g.fillRect(x+33,29,3,55);g.fillRect(x+6,55,59,3);}
 g.fillStyle='#18262e';g.fillRect(442,192,522,358);for(let i=0;i<38;i++){g.fillStyle=i%3===0?'#3c4c52':'#324249';g.fillRect(451,198+i*9,504,7);}
 g.fillStyle='#acbabb';g.font='600 24px monospace';g.fillText(name.toUpperCase(),105,137,1110);g.fillStyle='#c08b4d';g.fillRect(226,151,43,3);
 for(const x of [152,381,1102,1227]){g.fillStyle='#24363d';g.fillRect(x,392,48,158);g.fillStyle='#82908b';g.fillRect(x+3,398,42,143);g.fillStyle='#33474c';g.fillRect(x+9,412,30,36);g.fillStyle='#cfa666';g.fillRect(x-6,383,58,5);}
});}
export function fitOutBay(ctx){
 const {facility,tower,halves,unit:u,R,baseR,baseY,maxH,h,profile,box,tube,mesh,cylinder,mat,steel,rib,dark,gold,black}=ctx;
 const layout=ctx.layout,floor=layout.floor,wx=layout.roomHalfX,wz=layout.roomHalfZ,wallH=layout.craneY+2.2-floor,fixtures=[],iron=mat('#4c6067',.45),mark=mat('#cc9760'),graphite=mat('#29383f'),glow=new T.MeshBasicMaterial({color:0xe9dfc5}),cool=new T.MeshBasicMaterial({color:0xc3dce7});
 const facilityRecord=processingFacility(h),annotations=[],note=(id,title,detail,anchor,priority=65,lens=null)=>annotations.push({id,title,detail,anchor,kind:'facility',priority,lens});
 function plane(p,x,y,z,w,b,material,rotation=0){const m=mesh(p,new T.PlaneGeometry(w,b,rotation&&w>u*2?Math.min(128,Math.max(24,Math.ceil(w/u))):1,rotation&&b>u*2?Math.min(128,Math.max(20,Math.ceil(b/u))):1),material,x,y,z,'pad');m.rotation.x=rotation;return m;}
 const deck=plateTexture(),wall=wallTexture(facilityRecord.shortName+' · SCHEMATIC'),walls=[];
 const slab=plane(facility,0,floor,0,2*wx,2*wz,deck,-Math.PI/2);slab.name='High-bay floor';slab.userData.floorY=floor;
 function buildWall(x,z,width,yaw,name){
  const panel=new T.Group();panel.name=name;panel.position.set(x,0,z);panel.rotation.y=yaw;facility.add(panel);
  panel.userData.bayWall=true;walls.push(panel);
  const face=plane(panel,0,floor+wallH/2,0,width,wallH,wall);
  face.name='Opaque interior wall';
  for(let j=0;j<=5;j++){
   const span=width/5,xx=-width*.5+j*span;
   box(panel,xx,floor+wallH*.50,.06*u,u*.039,wallH,.064*u,graphite);
   if(j===5)continue;
   const center=xx+span*.5;
   box(panel,center,floor+wallH*.57,.071*u,span,.035*u,.054*u,iron);
   tube(panel,v(xx,floor+wallH*.68,.067*u),v(center,floor+wallH*.85,.067*u),u*.007,steel);
   tube(panel,v(center,floor+wallH*.85,.067*u),v(xx+span,floor+wallH*.68,.067*u),u*.007,steel);
   box(panel,center,floor+wallH*.64,.083*u,u*.29,u*.019,u*.044,cool);
   box(panel,center,floor+.55,.065*u,span,.075,.07,mark);
  }
 }
 buildWall(0,-wz,2*wx,0,'Rear wall');buildWall(0,wz,2*wx,Math.PI,'Front wall');
 buildWall(-wx,0,2*wz,Math.PI/2,'West wall');buildWall(wx,0,2*wz,-Math.PI/2,'East wall');
 const roof=new T.Group();roof.name='High-bay roof';facility.add(roof);
 const ceiling=plane(roof,0,floor+wallH,0,2*wx,2*wz,iron,Math.PI/2);ceiling.name='Ceiling liner';
 for(let j=-2;j<=2;j++){
  const z=j*wz*.40;box(roof,0,floor+wallH-u*.039,z,wx*2,u*.072,u*.038,graphite);
  for(const x of [-wx*.58,wx*.58])box(roof,x,floor+wallH-u*.082,z,u*.36,u*.019,u*.07,glow);
 }
 const rig=buildIntegrationRig(ctx);
 // The lower adapter face defines y=0. Every support uses the same floor
 // datum as the surrounding hall, regardless of vehicle height.
 const pedestalWidth=Math.max(R*.45,h.fairing.stack[0].radiusM*1.12),plateH=.10,footH=.035,cellH=.075;
 const shadowMat=painted(256,256,(g,w,h)=>{const d=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w*.49);d.addColorStop(0,'rgba(4,10,14,.88)');d.addColorStop(.33,'rgba(4,11,16,.71)');d.addColorStop(.72,'rgba(5,13,18,.30)');d.addColorStop(1,'rgba(5,13,18,0)');g.fillStyle=d;g.fillRect(0,0,w,h);});
 shadowMat.transparent=true;shadowMat.depthWrite=false;shadowMat.polygonOffset=true;shadowMat.polygonOffsetFactor=-1;
 function stand(p,cx,width,depth,top,cells){
  const bottom=floor+footH,deckBase=top-plateH,postTop=deckBase-(cells?cellH:0);
  plane(p,cx,floor+.004,0,width*2.75,depth*2.9,shadowMat,-Math.PI/2);
  const plate=box(p,cx,top-plateH/2,0,width*2,plateH,depth*2,iron);
  for(const side of [-1,1]){
   const x=cx+side*width*.85;
   for(const end of [-1,1]){
    const z=end*depth*.84;
    cylinder(p,x,floor+footH/2,z,.115,.13,footH,dark);
    box(p,x,(bottom+postTop)/2,z,.115,postTop-bottom,.115,graphite);
    if(cells){const puck=cylinder(p,x,postTop+cellH/2,z,.103,.103,cellH,mark);puck.name='Pedestal load cell';if(side===1&&end===1)note('stand-load-cells','Stand load cells','Four-point weighing support',puck,88,'interface');}
   }
   tube(p,v(x,bottom,-depth*.84),v(x,postTop,depth*.84),.036,steel);
   tube(p,v(cx-width*.85,bottom,side*depth*.84),v(cx+width*.85,postTop,side*depth*.84),.036,steel);
  }
  return plate;
 }
 const checkPlate=stand(facility,0,pedestalWidth,pedestalWidth*.74,0,true);checkPlate.name='Checkout bearing plate';note('checkout-stand','Checkout stand','Ground handling / service support',checkPlate,96,'interface');
 if(!layout.star){const adapterPlate=stand(facility,layout.ringX,pedestalWidth,pedestalWidth*.74,0,false);adapterPlate.name='Adapter bearing plate';note('adapter-stand','Adapter assembly stand','Separate flight-interface work area',adapterPlate,76);}
 // Removable checkout standoffs bypass the engine bells.
 const H=h.payloadInterface?.upperFaceStationM??h.fairing.stack.find(q=>q.part==='Insulated bus').z0M;
 for(const a of [.25,1.82,3.39,4.96]){const rr=.66;cylinder(facility,rr*Math.cos(a),H*.5,rr*Math.sin(a),.038,.055,H,steel).name='Checkout hardpoint support';}
 const front=.74*pedestalWidth;
 box(facility,0,floor*.45,front-.045,1.82*pedestalWidth,.115,.09,iron).name='Service crossbar';
 const rim=R*profile[0][1]/Math.max(...profile.map(station=>station[1]));
 if(halves.length&&!layout.wholeCap){
  // Each half translates with its own three-point carrier until encapsulation.
  // The shoes touch the lower circumferential ring and clear the central pedestal.
  for(const side of [-1,1]){
   const f=new T.Group();f.name='Fairing half carrier';f.userData.bayRoutingMotion={type:'rigid',owner:'bay:fairing-shoe:'+side,side};facility.add(f);fixtures.push({f,side});
   stand(f,side*.87*rim,.18*rim,.72*rim,-.12,false);
   for(const a of [.9,Math.PI/2,Math.PI-.9]){
    const shoe=box(f,side*Math.sin(a)*rim,-.06,Math.cos(a)*rim,.19,.12,.19,dark);
    shoe.name='Fairing rim shoe';if(a===Math.PI/2)note('fairing-carrier-'+side,'Fairing half carrier','Three-point ground support',shoe,75);
   }
  }
 }
 // Off-axis service cabinets and a grated platform at the hall wall give the floor physical scale.
 for(let j=0;j<4;j++){const x=(j*.16+.57)*u,z=-u*.67,casework=box(facility,x,floor+u*.086,z,u*.12,u*.17,u*.094,graphite);casework.name=['Portable electrical GSE storage','Cleanroom support cabinet','Portable test instrumentation','Ground service equipment storage'][j];box(facility,x,floor+u*.085,z+u*.052,u*.104,u*.142,u*.011,steel);box(facility,x,floor+u*.115,z+u*.064,u*.088,u*.024,u*.006,black);box(facility,x-.029*u,floor+u*.11,z+u*.068,u*.016,u*.007,u*.005,glow);if(j===0||j===3)note('gse-storage-'+j,j?'Ground support storage':'Portable electrical GSE','Travels between processing facilities',casework,61);}
 // Zone identity comes from the provider-specific route. These markings are
 // explanatory work areas; the building is not a surveyed facility model.
 const zoneColor=mat(facilityRecord.color||'#80b4b4');
 function zoneSign(x,z,title,subtitle,id){
  const p=new T.Group();p.name=title;facility.add(p);p.position.set(x,floor,z);
  box(p,0,.66,0,.035,1.32,.035,iron);box(p,0,.035,0,.55,.07,.48,graphite);
  const sign=painted(1024,256,(g,w,hh)=>{g.fillStyle='#19343e';g.fillRect(0,0,w,hh);g.fillStyle=facilityRecord.color||'#9bc8c7';g.fillRect(0,0,11,hh);g.fillStyle='#e0e9e7';g.font='600 62px sans-serif';g.fillText(title.toUpperCase(),34,96,w-68);g.font='34px monospace';g.fillStyle='#aec8ce';g.fillText(subtitle.toUpperCase(),34,178,w-68);});
  const face=plane(p,0,1.38,.026,2.4,.60,sign);face.name=title+' sign';note(id,title,subtitle,face,59);
 }
 zoneSign(-Math.max(R+1.45,3.4),Math.max(R+2.4,4.5),facilityRecord.visual.processingLabel,'Processing route · schematic','processing-zone');
 zoneSign(layout.receiverX+R+1.25,Math.max(R+1.6,4.0),facilityRecord.visual.matingLabel,facilityRecord.facilityClass==='documented'?'Launcher receiving area · schematic':'Launcher receiving area · planning','mating-zone');
 const aisleZ=Math.max(R+3.2,6.0);
 box(facility,(layout.ringX+layout.receiverX)/2,floor+.006,aisleZ,layout.receiverX-layout.ringX,.012,.065,zoneColor).name='Ground transfer route marking';
 const platformFront=Math.max(R*.45,h.fairing.stack[0].radiusM*1.12)*.74;
 const kit=buildBayEquipment({...ctx,floor,platformFront});
 let processing=null,last={domain:'conops',active:false,seq:null,pose:null,commBench:'sband'};
 function refreshEquipment(){
  const connected=!!(last.active&&last.seq&&last.seq.seat===0&&processing&&processing.enabled!==false);
  const state=connected?processing:null;
  kit.select(state?.domain||last.domain,last.active,state?.commBench||last.commBench,state);
  if(last.seq&&last.pose)kit.track(last.pose,last.seq);
  kit.animateProcessing(state,connected);
 }
 const eye=v(),local=v();
 function setViewFrom(camera){
  if(!facility.visible||!camera)return;
  camera.getWorldPosition(eye);facility.worldToLocal(eye);
  for(const w of walls){local.copy(eye).sub(w.position).applyAxisAngle(v(0,1,0),-w.rotation.y);w.visible=local.z>.08;}
  roof.visible=eye.y<floor+wallH-.08;
 }
 return {...kit,...rig,layout,facilityRecord,floorY:floor,get interfaceLabel(){return kit.portAnchor.name},setViewFrom,
  annotations:()=>[...annotations,...rig.rigAnnotations(),...kit.equipmentAnnotations()],
  setProcessingState(state){processing=state;refreshEquipment();},
  processingState:()=>processing?.enabled!==false&&last.active&&last.seq?.seat===0?processing:null,
  update(opening,domain,active,seq,pose,commBench){
  fixtures.forEach(({f,side})=>{f.rotation.y=active?Math.PI/2:0;f.position.set(active?layout.ringX:side*opening*R*2.25,0,active?-side*opening*R*2.25:0);});
  last={domain,active,seq,pose,commBench};refreshEquipment();if(seq&&pose)rig.update(seq,pose);

 }};
}
export function payloadFinishes(){
 const foil=painted(256,220,(g,w,h)=>{const r=rng();g.fillStyle='#aa8553';g.fillRect(0,0,w,h);const pts=[];for(let j=0;j<8;j++){pts.push([]);for(let i=0;i<10;i++)pts[j].push([i*32+(r()-.5)*18,j*34+(r()-.5)*19]);}
  for(let y=0;y<7;y++)for(let x=0;x<9;x++)for(let k=0;k<2;k++){const p=k?[pts[y][x],pts[y][x+1],pts[y+1][x+1]]:[pts[y][x],pts[y+1][x+1],pts[y+1][x]];g.fillStyle=r()>.45?'rgba(248,218,149,'+r()*.48+')':'rgba(59,48,38,'+r()*.42+')';g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();}
  g.strokeStyle='#9d8056';g.lineWidth=6;g.strokeRect(5,5,w-10,h-10);});
 const panels=painted(320,220,(g,w,h)=>{g.fillStyle='#bec6bf';g.fillRect(0,0,w,h);g.strokeStyle='#697874';g.lineWidth=2;g.strokeRect(6,6,w-12,h-12);for(let x of [13,w-13])for(let y of [15,h-15]){g.fillStyle='#52605c';g.fillRect(x-2,y-2,4,4);}g.fillStyle='#46535a';g.fillRect(13,19,42,9);g.fillStyle='#c29e6e';g.fillRect(13,32,25,4);});
 const radiators=painted(384,512,(g,w,h)=>{g.fillStyle='#aeb7b8';g.fillRect(0,0,w,h);for(let i=0;i<w;i+=5){g.fillStyle=i%15?'#a4adae':'#7e9196';g.fillRect(i,0,1,h);}
  g.fillStyle='#cad1cb';g.fillRect(0,0,w,9);g.fillRect(0,h-9,w,9);g.fillStyle='#a88d64';g.fillRect(12,10,6,h-20);g.fillRect(w-18,10,6,h-20);
  g.fillStyle='#273e47';g.fillRect(30,26,101,38);g.fillStyle='#dddcc6';g.font='600 17px monospace';g.fillText('ODC / 01',39,52);});
 return {foil,panels,radiators};
}
let launchSky;
export function padSky(){
 if(launchSky)return launchSky;
 const c=document.createElement('canvas');c.width=624;c.height=356;const g=c.getContext('2d'),frame=g.createImageData(c.width,c.height),pix=frame.data;
 function hash(x,y){let j=Math.imul(x,374761393)+Math.imul(y,668265263);j=Math.imul(j^(j>>>13),1274126177);return((j^(j>>>16))>>>0)/4294967295;}
 function noise(x,y){const i=Math.floor(x),j=Math.floor(y),u=x-i,v=y-j,s=u*u*(3-2*u),t=v*v*(3-2*v);return(1-t)*((1-s)*hash(i,j)+s*hash(i+1,j))+t*((1-s)*hash(i,j+1)+s*hash(i+1,j+1));}
 const clamp=x=>Math.max(0,Math.min(1,x));for(let y=0;y<c.height;y++){const f=y/(c.height-1),fog=clamp(f/.68)**1.23;for(let x=0;x<c.width;x++){
  const xx=x/c.width,fractal=noise(xx*5+17,f*18+3)*.57+noise(xx*11+42,f*46+4)*.26+noise(xx*28+8,f*96)*.12+noise(xx*74+3,f*195)*.05;
  const band=Math.exp(-(((f-.42)/.20)**2))*.83+.14,cloud=clamp((fractal-.47)*2.8)*band,k=(y*c.width+x)*4;
  const daylight=[46+145*fog,80+119*fog,113+82*fog];for(let i=0;i<3;i++)pix[k+i]=daylight[i]*(1-cloud)+[210,207,193][i]*cloud;pix[k+3]=255;
 }}g.putImageData(frame,0,0);launchSky=c.toDataURL('image/jpeg',.86);return launchSky;
}
