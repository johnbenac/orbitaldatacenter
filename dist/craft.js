import * as T from './vendor/three.module.js';
import {deploymentLayout,leafPose} from './deployment.js';
import {thermalMesh} from './thermal-view.js';
const v=(x,y,z)=>new T.Vector3(x,y,z);
const solid=(c,m=.24,r=.49)=>new T.MeshStandardMaterial({color:c,metalness:m,roughness:r});
const dark=solid('#26303a'),silver=solid('#c4cdd0',.48,.35),white=solid('#d8d4c7',.25,.52),ivory=solid('#f4ede0',.22,.58),bronze=solid('#92764d',.43),gold=solid('#c3a16b',.47),black=solid('#0f171d'),amber=solid('#f0a044'),navy=solid('#223853'),steel=solid('#6f8489',.4),aqua=solid('#74b3af'),blue=solid('#3d77ad');
const copper=solid('#b87c50',.4),lit=solid('#b3ffe7');lit.emissive.setHex(0x42b594);lit.emissiveIntensity=.65;
const cellMat=solid('#fff',.20,.43),finMat=solid('#fff',.28,.58),foilMat=solid('#fff',.37,.52);
const boxG=new T.BoxGeometry(1,1,1);boxG.userData.shared=true;
const sharedMaterials=[dark,silver,white,ivory,bronze,gold,black,amber,navy,steel,aqua,blue,copper,lit,cellMat,finMat,foilMat];
for(const material of sharedMaterials)material.userData.shared=true;
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
function obj(p,g,m,x,y,z,id){const a=new T.Mesh(g,m);a.position.set(x,y,z);if(id)a.userData.part=id;p.add(a);return a;}
function box(p,x,y,z,w,h,d,m,id){let a=obj(p,boxG,m,x,y,z,id);a.scale.set(w,h,d);return a;}
function cyl(p,x,y,z,rTop,rBot,height,m,id,n=16,open=false){const radius=Math.max(rTop,rBot,.00001),geom=cylinderGeom(+(rTop/radius).toFixed(5),+(rBot/radius).toFixed(5),n,open);let a=obj(p,geom,m,x,y,z,id);a.scale.set(radius,height,radius);return a;}
const sphereG=new T.SphereGeometry(1,48,28);sphereG.userData.shared=true;
function ell(p,x,y,z,a,b,c,m,id){let o=obj(p,sphereG,m,x,y,z,id);o.scale.set(a,b,c);return o;}
function pipe(p,a,b,r,m,id){const d=b.clone().sub(a),c=a.clone().add(b).multiplyScalar(.5);let o=cyl(p,c.x,c.y,c.z,r,r,d.length(),m,id,6);o.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());if(id==='radiator')thermalMesh(o,'coolant');return o;}
function strokes(p,segments,color,id,opacity=1){let points=[];for(const [a,b] of segments)points.push(...a,...b);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));const lines=new T.LineSegments(geo,new T.LineBasicMaterial({color,opacity,transparent:opacity<1}));if(id)lines.userData.part=id;p.add(lines);return lines;}
function canvas(w,h){let c=document.createElement('canvas');c.width=w;c.height=h;return[c,c.getContext('2d')];}
function tex(c){let t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;}
function textures(){if(cellMat.map)return;let [c,g]=canvas(768,384);g.fillStyle='#142034';g.fillRect(0,0,c.width,c.height);const nx=12,ny=6,sx=c.width/nx,sy=c.height/ny;
for(let col=0;col<nx;col++)for(let row=0;row<ny;row++){let x=col*sx+1.9,y=row*sy+1.9,k=(col*13+row*29)%17;let gradient=g.createLinearGradient(x,y,x+sx,y+sy);gradient.addColorStop(0,`rgb(${27+k},${52+k},${86+k*2})`);gradient.addColorStop(.52,`rgb(${20+k},${40+k},${76+k*2})`);gradient.addColorStop(1,`rgb(${34+k},${64+k},${101+k*2})`);g.fillStyle=gradient;g.beginPath();g.moveTo(x+4,y);g.lineTo(x+sx-8,y);g.lineTo(x+sx-4,y+4);g.lineTo(x+sx-4,y+sy-8);g.lineTo(x+sx-8,y+sy-4);g.lineTo(x+4,y+sy-4);g.lineTo(x,y+sy-8);g.lineTo(x,y+4);g.closePath();g.fill();g.strokeStyle='rgba(133,163,182,.44)';g.lineWidth=.75;g.stroke();g.fillStyle='rgba(167,189,216,.30)';for(let i=1;i<15;i++)g.fillRect(x+1,y+i*(sy-4)/15,sx-6,.7);g.fillStyle='rgba(186,177,149,.65)';g.fillRect(x+sx*.32,y+1,1.2,sy-6);g.fillRect(x+sx*.68,y+1,1.2,sy-6);}
cellMat.map=tex(c);[c,g]=canvas(512,256);g.fillStyle='#d9d8cf';g.fillRect(0,0,512,256);for(let i=0;i<=64;i++){g.fillStyle=i%8===0?'#747d7c':'#b1b8b3';g.fillRect(i*8,0,i%8===0?1.8:.8,256);}for(let j=0;j<4;j++){g.fillStyle='#919792';g.fillRect(0,j*64,512,.9);}finMat.map=tex(c);[c,g]=canvas(256,128);g.fillStyle='#ac884d';g.fillRect(0,0,256,128);let seed=24;const rand=()=>((seed=1664525*seed+1013904223>>>0)/4294967296);let pts=[];for(let j=0;j<=8;j++){let row=[];for(let i=0;i<=16;i++)row.push([i*16+(rand()-.5)*12,j*16+(rand()-.5)*13]);pts.push(row);}for(let j=0;j<8;j++)for(let i=0;i<16;i++)for(let k=0;k<2;k++){let tri=k?[pts[j][i],pts[j+1][i],pts[j+1][i+1]]:[pts[j][i],pts[j][i+1],pts[j+1][i+1]],a=rand()*.35;g.fillStyle=`rgba(${rand()<.5?'30,22,10':'255,238,165'},${a})`;g.beginPath();tri.forEach(([x,y],n)=>n?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();}foilMat.map=tex(c);}
function face(p,x,y,z,w,d,m,id){const a=obj(p,new T.PlaneGeometry(w,d),m,x,y,z,id);a.rotation.x=-Math.PI/2;a.userData.texturePlane=true;return a;}
function join(p,x,y,z,id){let g=new T.Group();g.position.set(x,y,z);g.userData.part=id;p.add(g);return g;}
function labelPlate(p,x,y,z,w,d,caption){const [c,g]=canvas(512,112);g.fillStyle='#e3e1d7';g.fillRect(0,0,512,112);g.fillStyle='#26343b';g.font='bold 60px monospace';g.fillText(caption,18,74);g.fillStyle='#bd6b21';g.fillRect(0,0,7,112);let m=solid('#fff');m.map=tex(c);return face(p,x,y,z,w,d,m,'structure');}
export function makeCraft(h){textures();const root=new T.Group(),internal=new T.Group(),skin=new T.Group();root.add(skin,internal);let bw=h.bodyWidthM,bh=h.bodyHeightM,bl=h.bodyLengthM;const panelL=h.wingLengthM,panelW=h.wingWidthM,radL=h.radiatorLengthM,radW=h.radiatorWidthM;let wings=[],rads=[],panels=[],trayRows=[],cmgs=[],cells=[],leds=[],plumes=[];const gleam=[];const w=bw,hgt=bh,l=bl,beam=Math.min(w,hgt)*.052;const y0=hgt*.5,kin=deploymentLayout(h),appendages=new T.Group();root.add(appendages);
// Six dedicated, finite-thickness walls. Positive-axis covers lift away for the core section.
const enclosure=new T.Group(),walls=[];root.add(enclosure);
const wallT=Math.min(w,hgt,l)*.024,flexLoops=[];
function wall(parent,axis,sign,width,height,depth,x,y,z){
 const spec=h.enclosure?.walls?.find(p=>p.axis===axis&&p.sign===sign);
 const apertures=spec?.portDiametersM??(axis==='x'?[.036,.036]:axis==='y'?[.036]:sign>0?[.052,.052]:[.052,.052,.065,.065]);
 const u=axis==='x'?depth:width,vv=axis==='y'?depth:height;
 const holes=apertures.map((diameter,i)=>{
  if(axis==='x')return {u:(i?1:-1)*u*.28,v:vv*.07,d:diameter};
  if(axis==='y')return {u:-.18*w,v:.27*vv,d:diameter};
  return {u:(i%2?1:-1)*(i<2?.225:.28)*w*sign,v:hgt*(i<2?-.115:-.21),d:diameter};
 });
 const shape=new T.Shape().moveTo(-u/2,-vv/2).lineTo(u/2,-vv/2).lineTo(u/2,vv/2).lineTo(-u/2,vv/2).closePath();
 for(const q of holes){const cut=new T.Path();cut.absarc(q.u,q.v,q.d*.5,0,Math.PI*2,true);shape.holes.push(cut);}
 const g=new T.ExtrudeGeometry(shape,{depth:wallT,bevelEnabled:false,curveSegments:18});g.translate(0,0,-wallT/2);
 const shell=obj(parent,g,steel,x,y,z,'structure');if(axis==='x')shell.rotation.y=sign*Math.PI/2;else if(axis==='y')shell.rotation.x=-sign*Math.PI/2;else if(sign<0)shell.rotation.y=Math.PI;
 shell.name=spec?.id||axis+(sign>0?'+':'−')+' thermal wall';shell.userData.wall={axis,sign,holes};walls.push(shell);
 // Metal gland sleeves fill the bores. Dielectric gaskets seat against the dry shell and carry the blankets around the cable or pipe.
 for(const q of holes){const a=join(shell,q.u,q.v,0,axis==='z'?'radiator':'structure'),r=q.d*.5;
  const sleeve=cyl(a,0,0,0,r*.986,r*.986,wallT+beam*1.12,axis==='z'?copper:dark,undefined,30);sleeve.rotation.x=Math.PI/2;
  const gasket=new T.Mesh(new T.TorusGeometry(r*1.15,r*.25,10,36),black);gasket.position.z=wallT*.50+beam*.08;a.add(gasket);
  const flange=cyl(a,0,0,wallT*.5+beam*.36,r*1.50,r*1.50,beam*.14,steel,undefined,30);flange.rotation.x=Math.PI/2;
 }
 return shell;
}
for(const side of [-1,1]){
 const cover=side>0?skin:enclosure;
 wall(cover,'x',side,wallT,hgt-2*wallT,l-2*wallT,side*(w-wallT)/2,0,0);
 wall(cover,'y',side,w,wallT,l-2*wallT,0,side*(hgt-wallT)/2,0);
 wall(cover,'z',side,w,hgt,wallT,0,0,side*(l-wallT)/2);
}
// The structural ring at each bay stays in the section. Six insulated exterior surfaces close the envelope.
for(let side of [-1,1])for(let y of [-1,1])box(root,side*w*.488,y*y0,0,beam*.6,beam*.65,l*1.008,silver,'structure');
for(let side of [-1,1]){
 const cover=side>0?skin:enclosure,x=side*(w*.5+beam*.12),y=side*(y0+beam*.11),z=side*(l*.5+beam*.11);
 for(let k=0;k<4;k++){const cz=l*((k+.5)/4-.5);
  thermalMesh(box(cover,x,0,cz,beam*.18,hgt*.86,l*.232,k===1||k===3?foilMat:ivory,'structure'),'enclosure');
  thermalMesh(box(cover,0,y,cz,w*.90,beam*.17,l*.232,(k+side)%2?foilMat:white,'structure'),'enclosure');
  for(let edge of [-1,1]){box(cover,x+side*beam*.12,edge*hgt*.392,cz,beam*.052,beam*.15,l*.208,dark,'structure');box(cover,edge*w*.416,y+side*beam*.116,cz,beam*.14,beam*.052,l*.210,bronze,'structure');}
  for(let i=0;i<3;i++)box(cover,x+side*beam*.125,hgt*(.10-.11*i),cz+l*.04,beam*.058,beam*.12,l*.082,silver,'structure');
 }
 // End bulkhead insulation cartridges surround service feedthroughs and a latched equipment access door.
 for(let edge of [-1,1])thermalMesh(box(cover,edge*w*.285,0,z,w*.41,hgt*.88,beam*.18,edge===side?foilMat:ivory,'structure'),'enclosure');
 box(cover,0,0,z+side*beam*.12,w*.16,hgt*.66,beam*.09,dark,'structure');
 for(let j=0;j<6;j++)box(cover,0,(j-2.5)*hgt*.102,z+side*beam*.21,w*.14,beam*.19,beam*.12,silver,'structure');
 for(let j of [-1,1]){
  const zf=side*(l*.5+beam*.27),yf=-hgt*.115,xp=j*w*.225;
  const flange=cyl(cover,xp,yf,zf,beam*.88,beam*.88,beam*.32,dark,'radiator',32);flange.rotation.x=Math.PI/2;
  const gland=cyl(cover,xp,yf,zf+side*beam*.23,beam*.56,beam*.62,beam*.40,silver,'radiator',28);gland.rotation.x=Math.PI/2;
  const flex=join(cover,0,0,zf,'radiator');flexLoops.push({flex,side});pipe(flex,v(xp,yf,0),v(xp,yf,side*beam*1.2),beam*.29,j<0?blue:copper,'radiator');
  pipe(flex,v(xp,yf,side*beam*1.2),v(j*w*.08,-y0*.45,side*(l*.5+w*.26)-zf),beam*.29,j<0?blue:copper,'radiator');
 }
}
for(let iz=0;iz<5;iz++){const z=(iz/4-.5)*l;for(let side of [-1,1])box(root,side*(w*.5+beam*.09),0,z,beam*.52,hgt+beam*.30,beam*.42,silver,'structure');box(root,0,-y0-beam*.07,z,w+beam*.42,beam*.43,beam*.38,silver,'structure');}
labelPlate(skin,0,y0+beam*.235,-l*.12,w*.59,l*.09,'ODC / 01');
// Four articulated solar wings. Each wing has three folding leaves, cell strings and a visible wiring spine.
const mounts=new T.Group(),guide=new T.Group();root.add(mounts,guide);const mountZ=kin.mountZ;for(let side of [-1,1])for(let aft of [-1,1]){const z=aft*mountZ;const y=beam*.2;for(const a of [-1,1])pipe(mounts,v(side*w*.47,a*y0*.60,aft*l*.43),v(side*w*.57,a*y*.85,z),beam*.29,silver,'structure');
const pivot=join(mounts,side*w*.50,y0*.02,z,'solar');box(pivot,side*w*.20,0,0,w*.40,beam*1.25,beam*1.8,steel,'solar');for(let ring=-1;ring<=1;ring++){let a=cyl(pivot,side*w*(.24+ring*.06),0,0,beam*1.25,beam*1.25,beam*.42,ring===0?gold:silver,'solar');a.rotation.z=Math.PI/2;}
const fold=join(pivot,side*w*.43,0,0,'solar');const bank=join(fold,0,0,0,'solar');const leaves=[];let previous=bank;wings.push({fold,bank,side,aft,leaves});
const seg=panelL/3, depth=.024;for(let tile=0;tile<3;tile++){const leaf=join(previous,side*(tile?seg:0),0,0,'solar');leaves.push(leaf);previous=leaf;const x=side*.5*seg;box(leaf,x,0,0,seg*.978,depth,panelW,bronze,'solar');face(leaf,x,depth*.55,0,seg*.97,panelW*.968,cellMat,'solar');const lower=face(leaf,x,-depth*.55,0,seg*.97,panelW*.968,navy,'solar');lower.rotation.x=Math.PI/2;
const grid=[];for(let k=1;k<=5;k++)grid.push([[x-seg*.477+k*seg*.159,depth*.59,-panelW*.48],[x-seg*.477+k*seg*.159,depth*.59,panelW*.48]]);for(let k=1;k<3;k++)grid.push([[x-seg*.48,depth*.59,-panelW*.48+k*panelW*.32],[x+seg*.48,depth*.59,-panelW*.48+k*panelW*.32]]);strokes(leaf,grid,'#bdab84','solar',.37);
for(let q of [-1,1])box(leaf,x,-depth*.4,q*panelW*.49,seg,depth*.86,Math.max(depth*.35,.019),silver,'solar');box(leaf,x,-depth*.85,0,seg,depth,depth*.82,silver,'solar');const surface=new T.Group();surface.add(...leaf.children.slice());leaf.add(surface);panels.push({surface,anchor:leaf,cx:x,cz:0,alongX:seg>panelW});}
pipe(pivot,v(side*w*.1,-beam,0),v(side*w*.44,-beam*.15,panelW*.26),beam*.33,gold,'solar');}
// Two double-sided radiator banks run fore and aft from independent roots.
for(let sign of [-1,1]){const pivot=join(root,0,-y0*.45,sign*l*.50,'radiator');const bank=join(pivot,0,0,0,'radiator');bank.rotation.z=-Math.PI/2;const leaves=[];rads.push({bank,sign,leaves});const stem=kin.radRoot-l*.5;box(bank,0,0,sign*stem*.5,beam*1.65,beam,stem,steel,'radiator');for(let k=0;k<3;k++){let z=sign*radL/6,wid=radW;const previous=k?leaves[k-1]:bank,leaf=join(previous,0,0,sign*(k?radL/3:stem),'radiator'),surface=new T.Group();leaf.add(surface);leaves.push(leaf);panels.push({surface,anchor:leaf,cx:0,cz:z,alongX:radW>radL/3});thermalMesh(box(surface,0,0,z,wid,beam*.49,radL/3*.98,steel,'radiator'),'radiator');thermalMesh(face(surface,0,beam*.257,z,wid*.981,radL/3*.961,finMat,'radiator'),'radiator');let f=thermalMesh(face(surface,0,-beam*.257,z,wid*.981,radL/3*.961,finMat,'radiator'),'radiator');f.rotation.x=Math.PI/2;let grid=[];for(let j=1;j<10;j++)grid.push([[-wid*.49+j*wid*.098,beam*.262,z-radL*.158],[-wid*.49+j*wid*.098,beam*.262,z+radL*.158]]);strokes(surface,grid,'#8a9799','radiator',.53);for(let x of [-1,1])box(surface,wid*.49*x,0,z,beam*.20,beam*.55,radL/3,white,'radiator');}for(let s of [-1,1])pipe(bank,v(s*w*.20,0,0),v(s*radW*.42,0,sign*(stem-.10)),beam*.25,copper,'radiator');}
// Tank pair with external bands, pressure domes and dedicated feed lines.
const tankR=Math.min(w*.24,Math.cbrt(Math.max(.02,h.tankVolumeL/1000)/2/(4*Math.PI/3))*.9);for(let sign of [-1,1]){let x=sign*(w*.50+tankR*.68),uc=join(root,x,-hgt*.21,0,'propellant');ell(uc,0,0,0,tankR,tankR,tankR*1.32,gold,'propellant');for(let z of [-.49,.49]){let ring=new T.Mesh(new T.TorusGeometry(tankR*.93,beam*.13,10,48),dark);ring.position.z=z*tankR;uc.add(ring);}let fluid=ell(uc,0,0,0,tankR*.92,tankR*.92,tankR*1.22,sign<0?blue:copper,'propellant');fluid.visible=false;cells.push({fluid,tank:uc.children[0],sign});pipe(uc,v(0,0,-tankR*1.29),v(-sign*tankR*1.2,-beam,-l*.45),beam*.21,copper,'propellant');}
// Reflector is a shallow paraboloid with crossed support rods and a feed horn.
const dishD=Math.max(.3,h.input.kaDishM),base=join(root,w*.16,y0+beam,-l*.35,'communications');cyl(base,0,beam*.6,0,dishD*.18,dishD*.24,beam*1.3,steel,'communications');const dish=join(base,0,beam*2,0,'communications');// The continuous finite-thickness shell runs from inner rim to axis and back along the outer skin.
const parab=[],dishT=Math.max(.007,dishD*.014),profile=(i,dy)=>{const r=dishD*.5*i/16;return new T.Vector2(r,(r/dishD)**2*dishD*.65+dy);};
for(let i=0;i<=16;i++)parab.push(profile(i,-dishT));for(let i=16;i>=0;i--)parab.push(profile(i,0));
const reflector=obj(dish,trimPoleTriangles(new T.LatheGeometry(parab,64)),solid('#dcdacb',.55,.38),0,0,0,'communications');reflector.name='Closed reflector shell';const rim=new T.Mesh(new T.TorusGeometry(dishD*.499,Math.max(.014,dishD*.014),12,64),bronze);rim.rotation.x=Math.PI/2;rim.position.y=dishD*.162;dish.add(rim);for(let j=0;j<3;j++){let a=j*2*Math.PI/3;pipe(dish,v(dishD*.44*Math.cos(a),dishD*.12,dishD*.44*Math.sin(a)),v(0,dishD*.37,0),dishD*.013,steel,'communications');}cyl(dish,0,dishD*.37,0,dishD*.035,dishD*.063,dishD*.10,gold,'communications');
const optic=join(root,-w*.2,y0+beam*1.8,l*.35,'communications');let ap=Math.max(.15,h.input.opticalApertureM);cyl(optic,0,ap*.45,0,ap*.68,ap*.8,ap,ivory,'communications');cyl(optic,0,ap*.98,0,ap*.63,ap*.63,beam*.2,black,'communications');cyl(optic,0,ap*1.01,0,ap*.46,ap*.46,beam*.12,blue,'communications');const patches=[-1,1].map(side=>box(skin,side*w*.49,y0*.52,l*.3,beam*.35,hgt*.14,w*.21,bronze,'communications'));
// Liquid-cooled tray section with cold plates, rack manifolds, supply/return branches and end-wall penetrations.
for(let side of [-1,1]){
 const rack=join(internal,side*w*.225,0,0,'compute'),rx=side*w*.175;
 box(rack,-rx*.90,-hgt*.04,0,beam*.35,hgt*.72,l*.62,navy,'compute');
 for(const z of [-1,1])pipe(rack,v(rx,-hgt*.37,z*l*.295),v(rx,hgt*.34,z*l*.295),beam*.31,z>0?blue:copper,'radiator');
 const rackTrays=side<0?Math.ceil(h.trays/2):Math.floor(h.trays/2),rows=Math.min(14,rackTrays);
 for(let k=0;k<rows;k++){const pitch=hgt*.68/Math.max(1,rows),y=-hgt*.36+(k+.18)*pitch;

  const tray=box(rack,0,y,0,w*.36,Math.min(beam*.35,pitch*.22),l*.62,silver,'compute');tray.userData.installedTrayRow=true;trayRows.push(tray);
  thermalMesh(box(rack,0,y+Math.min(beam*.30,pitch*.27),0,w*.33,Math.min(beam*.16,pitch*.13),l*.57,copper,'compute'),'coldPlate');
  for(let j=0;j<4;j++){const z=(j-1.5)*l*.13;thermalMesh(box(rack,0,y+Math.min(beam*.53,pitch*.48),z,w*.28,Math.min(beam*.26,pitch*.19),l*.115,navy,'compute'),'junction');const lamp=box(rack,side*w*.154,y+beam*.54,z+l*.024,beam*.14,beam*.17,beam*.28,lit,'compute');leds.push(lamp);}
  for(const z of [-1,1])pipe(rack,v(side*w*.12,y+beam*.32,z*l*.23),v(rx,y+beam*.32,z*l*.295),beam*.14,z>0?blue:copper,'radiator');
 }
 for(const z of [-1,1]){const p=v(side*w*.40,-hgt*.26,z*l*.295),bend=v(side*w*.40,-hgt*.26,z*l*.40),end=v(side*w*.225,-hgt*.115,z*l*.505);pipe(internal,p,bend,beam*.26,z>0?blue:copper,'radiator');pipe(internal,bend,end,beam*.26,z>0?blue:copper,'radiator');}
}
for(let j=0;j<4;j++){const x=(j-1.5)*w*.20;thermalMesh(box(internal,x,-hgt*.06,l*.408,w*.185,hgt*.64,l*.13,black,'battery'),'battery');box(internal,x,hgt*.277,l*.408,w*.177,beam*.4,l*.128,bronze,'battery');thermalMesh(box(internal,x,hgt*.02,l*.48,w*.1,hgt*.40,beam*.2,aqua,'battery'),'battery');}for(let j=0;j<5;j++)box(internal,0,-hgt*.33+j*hgt*.13,-l*.41,w*.76,beam*.7,l*.105,silver,'storage');
for(let i=0;i<4;i++){let a=i*Math.PI/2+Math.PI/4,r=w*.22,g=join(internal,r*Math.cos(a),hgt*.45,r*Math.sin(a),'cmg');g.rotation.z=Math.sin(a)*.55;let rotor=cyl(g,0,0,0,w*.103,w*.103,beam*.7,bronze,'cmg');let ring=new T.Mesh(new T.TorusGeometry(w*.114,beam*.19,10,48),ivory);ring.rotation.x=.4;g.add(ring);cmgs.push({g,rotor,a});}for(let s of [-1,1]){const engine=join(root,s*w*.28,-hgt*.21,-l*.53,'propulsion');let bell=cyl(engine,0,0,-w*.10,w*.080,w*.15,w*.25,dark,'propulsion',24,true);bell.rotation.x=Math.PI/2;const inner=cyl(engine,0,0,-w*.10,w*.072,w*.141,w*.245,solid('#232327',.22,.68),'propulsion',32,true);inner.rotation.x=Math.PI/2;inner.geometry=inner.geometry.clone();inner.geometry.userData.shared=false;
const innerIdx=inner.geometry.index,innerNormals=inner.geometry.attributes.normal;
for(let k=0;k<innerIdx.count;k+=3){const j=innerIdx.getX(k+1);innerIdx.setX(k+1,innerIdx.getX(k+2));innerIdx.setX(k+2,j);}
for(let k=0;k<innerNormals.count;k++)innerNormals.setXYZ(k,-innerNormals.getX(k),-innerNormals.getY(k),-innerNormals.getZ(k));
const throat=cyl(engine,0,0,w*.018,w*.071,w*.071,beam*.06,black,'propulsion',32);throat.rotation.x=Math.PI/2;
let rim=cyl(engine,0,0,-w*.236,w*.151,w*.151,beam*.22,bronze,'propulsion',24,true);rim.rotation.x=Math.PI/2;const plume=new T.Mesh(trimPoleTriangles(new T.ConeGeometry(w*.125,w*1.7,32,1,true)),new T.MeshBasicMaterial({color:0x6ccaff,transparent:true,opacity:.43,side:T.FrontSide,depthWrite:false}));plume.position.z=-w*1.06;plume.rotation.x=-Math.PI/2;engine.add(plume);plumes.push(plume);}
// A longitudinal frame spaces the cassette away from both wing saddles. Its
// rails run along the cassette sides; the frame retracts after the last packet clears.
const cassette=h.fairing?.stack.find(q=>/cassette/i.test(q.part)),cassStart=kin.center-(cassette?.lengthM||0)/2;
guide.position.z=l/2;
for(const x of [-1,1])pipe(guide,v(x*w*.20,0,0),v(x*w*.20,0,Math.max(.06,cassStart-l/2-.08)),.024,steel,'structure');
for(const o of wings){const x1=w*.93,x2=kin.rootX-.022;
 pipe(o.fold,v(0,0,0),v(o.side*(x2-x1),0,0),.024,steel,'solar');}
const rz=v(0,0,1),ry=v(0,1,0),qY=new T.Quaternion(),offset=v(0,0,0);
for(const [i,p] of panels.entries()){
 p.descriptor=kin.descriptors[i];appendages.add(p.surface);p.surface.userData.leafIndex=i;
 const solar=p.descriptor.type==='pv';p.surface.scale.set(solar?p.descriptor.width/kin.p:1,solar?1:Math.min(1,.113/beam),solar?1:p.descriptor.depth/kin.r);
}
// Six telescoping transfer carriages remain attached to the leading leaf
// during extraction. PV carriages turn on outboard rails; radiator lift masts
// carry their packets above the electronics deck before the roots dock.
const carriages=[];
for(let i=0;i<18;i+=3){
 const d=panels[i].descriptor,id=d.type==='pv'?'solar':'radiator',rails=[];
 for(let j=0;j<(d.type==='pv'?3:4);j++){const o=cyl(appendages,0,0,0,.015,.015,1,j===1?silver:bronze,id,12);o.userData.carriage=Math.floor(i/3);rails.push(o);}
 carriages.push({i,rails});
}
const setSegment=(o,a,b)=>{const delta=b.clone().sub(a),len=delta.length();o.visible=len>.002;if(!o.visible)return;o.position.copy(a).lerp(b,.5);o.quaternion.setFromUnitVectors(v(0,1,0),delta.multiplyScalar(1/len));o.scale.y=len;};
function positionGuides(progress){
 for(const {i,rails}of carriages){const p=panels[i>=12?i+2:i],d=p.descriptor,pose=leafPose(kin,d,progress,h.input.solarTiltDeg),c=v(pose.x,pose.y,pose.z),pts=[];
  const localX=v(1,0,0).applyQuaternion(p.surface.quaternion),localZ=v(0,0,1).applyQuaternion(p.surface.quaternion);
  if(d.type==='pv'){
   const initialRail=Math.min(kin.rootX,.44*(cassette?.widthM||kin.rootX*2)),x=d.side*(initialRail+(kin.rootX-initialRail)*Math.min(1,progress/.12)),z=d.end*Math.min(.38*l,kin.mountZ),from=v(x,c.y,c.z),dir=from.clone().sub(c),a=dir.dot(localX),b=dir.dot(localZ);
   const scale=Math.min(Math.abs(a)>1e-8?d.width/(2*Math.abs(a)):1000,Math.abs(b)>1e-8?d.depth/(2*Math.abs(b)):1000);
   const dock=c.clone().addScaledVector(localX,a*scale).addScaledVector(localZ,b*scale);
   pts.push(v(d.side*w*.50,c.y,z),v(x,c.y,z),from,dock);
  }else{
   const start=d.end<0?.46:.69,q=Math.max(0,Math.min(1,(progress-start)/.23)),lift=Math.max(0,Math.min(1,(progress-start+.04)/.04)),lower=Math.max(0,Math.min(1,(q-.85)/.15)),reach=lift*(1-lower);
   const seat=v(d.end*w*.28,.5*hgt+.12,0),base=v(d.end*(.55*Math.hypot(kin.rw,kin.r)+.20),seat.y,0),up=c.clone().addScaledVector(localX,localX.y>0?d.width/2:-d.width/2);
   const head=Math.max(hgt*.50+h.input.kaDishM+.35,up.y+.24);const dock=v(up.x,up.y,up.z),mast=v(base.x,head,base.z),boom=v(dock.x,head,dock.z);
   const seg=(a,b)=>{const q=Math.min(1,Math.max(0,(reach-a)/(b-a)));return q*q*(3-2*q);};
   const foot=seat.clone().lerp(base,seg(0,.20)),onMast=foot.clone().lerp(mast,seg(.20,.45)),arm=onMast.clone().lerp(boom,seg(.45,.75));pts.push(seat,foot,onMast,arm,arm.clone().lerp(dock,seg(.75,1)));
  }
  rails.forEach((o,j)=>setSegment(o,pts[j],pts[j+1]));
 }
}
let installedAt=null;
function positionPanels(progress){
 if(progress===installedAt)return;installedAt=progress;
 const approach=Math.min(1,Math.max(0,(progress-.746)/.07));mounts.scale.set(.505+.495*approach,1,Math.min(1,l*.40/(mountZ+.28*panelW))+(1-Math.min(1,l*.40/(mountZ+.28*panelW)))*approach);
 for(const item of [...flexLoops,...rads.map(r=>({side:r.sign,flex:r.bank.parent}))]){
  const t=Math.min(1,Math.max(0,(progress-(item.side<0?.585:.815))/.065));item.flex.scale.z=.025+.975*t*t*(3-2*t);
 }
 guide.scale.z=Math.max(.018,1-Math.min(1,Math.max(0,(progress-.87)/.05)));

 for(const p of panels){const pose=leafPose(kin,p.descriptor,progress,h.input.solarTiltDeg);
  p.surface.quaternion.setFromAxisAngle(rz,pose.roll).multiply(qY.setFromAxisAngle(ry,pose.yaw));offset.set(p.cx*p.surface.scale.x,0,p.cz*p.surface.scale.z).applyQuaternion(p.surface.quaternion);
  p.surface.position.set(pose.x,pose.y,pose.z).sub(offset);
 }positionGuides(progress);
}
positionPanels(1);
return{root,internal,skin,enclosure,walls,wings,panels,carriages,appendages,trayRows,positionPanels,rads,cmgs,cells,leds,dish,optic,patches,plumes,bw,bh,bl,wingspan:2*(panelL+kin.rootX),spanZ:2*(radL+kin.radRoot)};}
