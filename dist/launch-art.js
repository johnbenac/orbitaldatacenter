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
function wallTexture(){return painted(1400,550,(g,w,h)=>{
 const rand=rng(),grad=g.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#12212a');grad.addColorStop(.38,'#364650');grad.addColorStop(1,'#1d2d33');g.fillStyle=grad;g.fillRect(0,0,w,h);
 for(let k=0;k<w;k+=9){g.fillStyle='rgba(169,181,178,.13)';g.fillRect(k,0,1,h);g.fillStyle='rgba(4,11,17,.30)';g.fillRect(k+4,0,2,h);}
 for(let k=0;k<10;k++){let x=k*146;g.fillStyle='#111b23';g.fillRect(x,0,6,h);g.fillStyle='#5c6d73';g.fillRect(x+6,0,2,h);}
 for(let k=0;k<20;k++){let x=k*75;const tint=180+rand()*40;g.fillStyle='#15242a';g.fillRect(x+5,28,62,60);g.fillStyle='rgb(116,143,'+Math.round(tint)+')';g.fillRect(x+8,31,56,53);g.fillStyle='rgba(39,60,73,.7)';g.fillRect(x+33,29,3,55);g.fillRect(x+6,55,59,3);}
 g.fillStyle='#18262e';g.fillRect(442,192,522,358);for(let i=0;i<38;i++){g.fillStyle=i%3===0?'#3c4c52':'#324249';g.fillRect(451,198+i*9,504,7);}
 g.fillStyle='#acbabb';g.font='600 24px monospace';g.fillText('HIGH BAY    01',226,137);g.fillStyle='#c08b4d';g.fillRect(226,151,43,3);
 for(const x of [152,381,1102,1227]){g.fillStyle='#24363d';g.fillRect(x,392,48,158);g.fillStyle='#82908b';g.fillRect(x+3,398,42,143);g.fillStyle='#33474c';g.fillRect(x+9,412,30,36);g.fillStyle='#cfa666';g.fillRect(x-6,383,58,5);}
});}
export function fitOutBay(ctx){
 const {facility,tower,halves,unit:u,R,baseR,baseY,maxH,h,profile,box,tube,mesh,cylinder,mat,steel,rib,dark,gold,black}=ctx;
 const floor=-u*.125,gy=u*1.22,wx=u*2.65,wz=-u*1.17,fixtures=[],iron=mat('#4c6067',.45),mark=mat('#cc9760'),graphite=mat('#29383f'),glow=new T.MeshBasicMaterial({color:0xe9dfc5}),cool=new T.MeshBasicMaterial({color:0xc3dce7});
 function plane(p,x,y,z,w,b,material,rotation=0){const m=mesh(p,new T.PlaneGeometry(w,b,rotation&&w>u*2?Math.min(128,Math.max(24,Math.ceil(w/u))):1,rotation&&b>u*2?Math.min(128,Math.max(20,Math.ceil(b/u))):1),material,x,y,z,'pad');m.rotation.x=rotation;return m;}
 const deck=plateTexture(),wall=wallTexture();plane(facility,0,floor,0,u*7,u*4.5,deck,-Math.PI/2);plane(facility,0,floor+u*.90,wz,u*6.0,u*1.8,wall);
 const sidewall=plane(facility,-wx,floor+u*.90,.1*u,u*4.0,u*1.8,wall);sidewall.rotation.y=Math.PI/2;
 for(let x=-3;x<=3;x++){
  const xx=x*u*.76;
  box(facility,xx,floor+u*.77,wz+.06*u,u*.031,u*1.54,u*.042,graphite);
  box(facility,xx,floor+u*.77,wz+.084*u,u*.077,u*1.54,u*.012,iron);
  box(facility,xx+u*.37,floor+u*1.02,wz+.083*u,u*.7,u*.038,u*.025,iron);
  tube(facility,v(xx,floor+u*1.07,wz+.07*u),v(xx+.35*u,floor+u*1.32,wz+.07*u),u*.008,graphite);
  tube(facility,v(xx+.35*u,floor+u*1.32,wz+.07*u),v(xx+.7*u,floor+u*1.07,wz+.07*u),u*.008,graphite);
  box(facility,xx+.35*u,floor+u*1.10,wz+.092*u,u*.29,u*.017,u*.025,cool);
  if(x%2===0){box(facility,xx+u*.14,floor+u*.16,wz+.11*u,u*.13,u*.30,u*.10,steel);for(let j=0;j<5;j++)box(facility,xx+u*.14,floor+u*(.10+j*.033),wz+.17*u,u*.094,u*.009,u*.011,graphite);}
 }
 // Load-bearing trolley and runway. Two rails carry the bridge; a paired cable falls to the rigging yoke.
 const span=u*1.18,zBridge=-R*.26;
 for(const side of [-1,1]){
  const x=side*span;box(facility,x,gy*.5+floor*.5,-u*.64,u*.044,gy-floor,u*.068,graphite);
  box(facility,x,gy,-u*.09,u*.062,u*.077,u*2.15,iron);box(facility,x,gy+.041*u,-u*.09,u*.022,u*.016,u*2.15,rib);
 }
 for(const zz of [-1,1]){const z=zBridge+zz*u*.060;box(facility,0,gy+u*.070,z,span*2,u*.075,u*.038,mark);box(facility,0,gy+u*.114,z,span*2,u*.012,u*.047,gold);box(facility,0,gy+.03*u,z,span*2,u*.013,u*.05,graphite);}
 box(facility,.012*u,gy+u*.12,zBridge,u*.14,u*.09,u*.195,graphite);for(const j of [-1,1]){const drive=cylinder(facility,j*u*.059,gy+u*.115,zBridge,u*.034,u*.034,u*.17,iron,'pad',28);drive.rotation.x=Math.PI/2;}
 const yoke=h.stowedLengthM+u*.122;
 for(let side of [-1,1]){const x=side*u*.027;tube(facility,v(x,gy+.07*u,zBridge),v(x,yoke,zBridge),u*.0028,black);tube(facility,v(x,yoke,zBridge),v(side*h.bodyWidthM*.44,h.stowedLengthM*.96,zBridge),u*.0039,iron);}
 box(facility,0,yoke,zBridge,u*.089,u*.044,u*.038,mark);
 // The adapter sits on a triangulated wheeled ground fixture with leveling pads.
 function stand(p,cx,cz,size,top){
  const deckH=u*.033,d=top-floor;box(p,cx,top-deckH*.5,cz,size*2,deckH,size*1.48,iron);
  for(const side of [-1,1]){
   box(p,cx,top-deckH*1.05,cz+side*size*.67,size*2.1,deckH*.55,deckH*.51,gold);
   for(const end of [-1,1]){const x=cx+side*size*.79,z=cz+end*size*.51;box(p,x,(floor+top)/2,z,u*.033,d,u*.033,graphite);cylinder(p,x,floor+.012*u,z,u*.060,u*.069,.023*u,dark);box(p,x+.04*u,floor+.02*u,z,u*.055,.037*u,u*.050,iron);}
   tube(p,v(cx-side*size*.79,floor+.035*u,cz+side*size*.52),v(cx+side*size*.79,top-.030*u,cz+side*size*.52),u*.013,steel);
  }
 }
 const shadowMat=(function(){const m=painted(256,256,(g,w,h)=>{const d=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w*.49);d.addColorStop(0,'rgba(4,10,14,.88)');d.addColorStop(.33,'rgba(4,11,16,.71)');d.addColorStop(.72,'rgba(5,13,18,.30)');d.addColorStop(1,'rgba(5,13,18,0)');g.fillStyle=d;g.fillRect(0,0,w,h);});m.transparent=true;m.depthWrite=false;m.polygonOffset=true;m.polygonOffsetFactor=-1;return m;})();
 const shadow=(p,x,z,dx,dz)=>plane(p,x,floor+.005*u,z,dx,dz,shadowMat,-Math.PI/2);
 shadow(facility,0,0,R*3.4,R*2.65);stand(facility,0,0,Math.max(R*.45,h.bodyWidthM*.70),-.005*u);
 for(const side of [-1,1]){const f=new T.Group();facility.add(f);fixtures.push({f,side});shadow(f,side*R*.34,0,R*2.7,R*2.8);stand(f,side*R*.42,0,R*.77,-.015*u);
  for(const z of [-1,1]){const x=side*R*.54;box(f,x,.011*u,z*R*.62,R*.19,u*.061,R*.21,dark);}
 }
 // Off-axis service cabinets and a grated platform at the hall wall give the floor physical scale.
 for(let j=0;j<4;j++){const x=(j*.16+.57)*u,z=-u*.67;box(facility,x,floor+u*.086,z,u*.12,u*.17,u*.094,graphite);box(facility,x,floor+u*.085,z+u*.052,u*.104,u*.142,u*.011,steel);box(facility,x,floor+u*.115,z+u*.064,u*.088,u*.024,u*.006,black);box(facility,x-.029*u,floor+u*.11,z+u*.068,u*.016,u*.007,u*.005,glow);}
 return opening=>fixtures.forEach(({f,side})=>{f.position.x=side*opening*R*2.25;});
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
