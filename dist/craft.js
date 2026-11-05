import * as T from './vendor/three.module.js';
import {deploymentLayout,mechanismPose,deploymentSchedule} from './deployment.js';
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
export function makeCraft(h){textures();const root=new T.Group(),internal=new T.Group(),skin=new T.Group();root.add(skin,internal);let bw=h.bodyWidthM,bh=h.bodyHeightM,bl=h.bodyLengthM;const panelL=h.wingLengthM,panelW=h.wingWidthM,radL=h.radiatorLengthM,radW=h.radiatorWidthM;let wings=[],rads=[],panels=[],trayRows=[],cmgs=[],cells=[],leds=[],plumes=[],engines=[];const propulsion=h.propulsion;const gleam=[];const w=bw,hgt=bh,l=bl,beam=Math.min(w,hgt)*.052;const y0=hgt*.5,kin=deploymentLayout(h),appendages=new T.Group();root.add(appendages);
// Six dedicated, finite-thickness walls. Positive-axis covers lift away for the core section.
const enclosure=new T.Group(),walls=[];root.add(enclosure);
const wallT=Math.min(w,hgt,l)*.024,flexLoops=[];
function wall(parent,axis,sign,width,height,depth,x,y,z){
 const spec=h.enclosure?.walls?.find(p=>p.axis===axis&&p.sign===sign);
 const apertures=spec?.portDiametersM??(axis==='x'?[.036,.036]:axis==='y'?[.036]:sign>0?[.052,.052]:[.052,.052,.065,.065]);
 const u=axis==='x'?depth:width,vv=axis==='y'?depth:height;
 const holes=apertures.map((diameter,i)=>{
  if(axis==='x')return {u:(i?1:-1)*u*.28,v:vv*.07,d:diameter};
  if(axis==='z'&&sign<0){const exit=propulsion.engines[i];return {u:-exit.x,v:exit.y,d:diameter,engine:true};}
  if(axis==='y')return {u:-.18*w,v:.27*vv,d:diameter};
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
 const shell=obj(parent,g,steel,x,y,z,'structure');if(axis==='x')shell.rotation.y=sign*Math.PI/2;else if(axis==='y')shell.rotation.x=-sign*Math.PI/2;else if(sign<0)shell.rotation.y=Math.PI;
 shell.name=spec?.id||axis+(sign>0?'+':'−')+' thermal wall';shell.userData.wall={axis,sign,holes};walls.push(shell);
 // Metal gland sleeves fill the bores. Dielectric gaskets seat against the dry shell and carry the blankets around the cable or pipe.
 for(const q of holes){const a=join(shell,q.u,q.v,0,q.engine?'propulsion':axis==='z'?'radiator':'structure'),r=q.d*.5;
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
  const panelMat=(k+side)%2?foilMat:white,halfTile=l*.116;
  thermalMesh(box(cover,0,y,cz,w*.90,beam*.17,2*halfTile,panelMat,'structure'),'enclosure');
  for(let edge of [-1,1]){box(cover,x+side*beam*.12,edge*hgt*.392,cz,beam*.052,beam*.15,l*.208,dark,'structure');box(cover,edge*w*.416,y+side*beam*.116,cz,beam*.14,beam*.052,l*.210,bronze,'structure');}
  for(let i=0;i<3;i++)box(cover,x+side*beam*.125,hgt*(.10-.11*i),cz+l*.04,beam*.058,beam*.12,l*.082,silver,'structure');
 }
 // End bulkhead insulation cartridges surround service feedthroughs and a latched equipment access door.
 if(side<0){
  // Keep injector penetrations and nozzle bases exposed through the blanket.
  for(const sy of [-1,1])thermalMesh(box(cover,0,sy*hgt*.38,z,w*.9,hgt*.18,beam*.18,ivory,'structure'),'enclosure');
 }else{
  for(let edge of [-1,1])thermalMesh(box(cover,edge*w*.29,0,z,w*.39,hgt*.86,beam*.18,ivory,'structure'),'enclosure');

 }
}
for(let iz=0;iz<5;iz++){const z=(iz/4-.5)*l;for(let side of [-1,1])box(root,side*(w*.5+beam*.09),0,z,beam*.52,hgt+beam*.30,beam*.42,silver,'structure');box(root,0,-y0-beam*.07,z,w+beam*.42,beam*.43,beam*.38,silver,'structure');}
labelPlate(skin,0,y0+beam*.235,-l*.12,w*.59,l*.09,'ODC / 01');
// Each wing is attached to a fixed tracking saddle. The web pays out over
// the mandrel while its two strain-energy slit-tube booms recover their shape.
const mechanismAudit={wings:[],banks:[]};
const frameRadius=Math.min(.065,.022*w);
const yAxis=v(0,1,0),xAxis=v(1,0,0);
function pin(parent,x,y,z,r,len,mat,axis,id){
 const o=cyl(parent,x,y,z,r,r,len,mat,id,32);if(axis==='x')o.rotation.z=-Math.PI/2;if(axis==='z')o.rotation.x=Math.PI/2;return o;
}
function marker(parent,x,y,z){const o=new T.Object3D();o.position.set(x,y,z);parent.add(o);return o;}
function beamTo(o,a,b){const delta=b.clone().sub(a);o.position.copy(a).add(b).multiplyScalar(.5);o.scale.y=delta.length();o.visible=o.scale.y>.000001;if(o.visible)o.quaternion.setFromUnitVectors(yAxis,delta.normalize());}
for(const d of kin.descriptors.filter(q=>q.type==='pv')){
 const start=appendages.children.length;
 const {side,end}=d,z=kin.center+end*kin.mountZ,rx=side*kin.rootX,id='solar';
 const base=join(appendages,rx,0,z,id),table=join(base,0,0,0,id);
 for(const j of [-1,1]){
  pipe(appendages,v(side*w*.47,j*hgt*.21,Math.min(l*.42,Math.max(-l*.42,z+j*.28*l))),v(rx-side*.08,0,z+j*.19),frameRadius,silver,'structure');
 }
 pin(base,-side*.10,0,0,.105,.18,dark,'x',id);pin(base,0,0,0,.072,.18,gold,'x',id);
 box(table,0,0,0,.11,.08,panelW+.18,steel,id);
 const tip=join(table,0,0,0,id),reel=join(tip,0,0,0,id);
 const roll=pin(reel,0,0,0,1,panelW+.04,navy,'z',id);roll.name='Wound photovoltaic blanket';
 const discs=[];
 for(const j of [-1,1]){
  discs.push(pin(reel,0,0,j*(panelW*.5+.055),1,.035,silver,'z',id));
  pin(reel,0,0,j*(panelW*.5+.078),.075,.027,bronze,'z',id);
 }
 const stripe=box(reel,0,0,0,.022,.012,panelW*.98,bronze,id);
 const surface=join(table,0,0,0,id),front=face(surface,0,.003,0,1,panelW,cellMat,id),back=face(surface,0,-.003,0,1,panelW,navy,id);back.rotation.x=Math.PI/2;
 const grid=new T.BufferGeometry(),gridPts=new Float32Array((Math.ceil(kin.wl/.31)+Math.ceil(panelW/.23)+6)*6);
 grid.setAttribute('position',new T.BufferAttribute(gridPts,3));const lines=new T.LineSegments(grid,new T.LineBasicMaterial({color:'#778c99',transparent:true,opacity:.65}));lines.frustumCulled=false;table.add(lines);
 const booms=[],axles=[],saddles=[];
 for(const j of [-1,1]){
  const zc=j*(panelW*.5+.035);
  const boom=cyl(table,0,0,zc,.033,.033,1,bronze,id,24);booms.push(boom);
  axles.push(cyl(tip,0,0,zc,.029,.029,1,steel,id,12));
  const bracket=join(base,side*.008,.068,j*(panelW*.5+.10),id);
  box(bracket,0,kin.packedRollM*.5,-j*.022,.046,kin.packedRollM+.036,.045,gold,id);saddles.push(bracket);
 }
 wings.push({side,end,table,tip,reel,roll,front,back,discs,stripe,surface,booms,axles,grid,gridPts,lines,saddles});
 for(const o of appendages.children.slice(start))o.userData.assembly='wing '+side+'/'+end;
 panels.push({surface,descriptor:d});mechanismAudit.wings.push({root:table,tip,mandrel:reel,blanket:front,booms,side,end});
}
// Two root-actuated folding radiator banks. The pin at each root belongs to
// the fixed yoke; the second pin belongs to the inboard panel's distal frame.
const hoses=[];
function flexible(fromPort,toPort,side,mat,owner){
 const group=join(appendages,0,0,0,'radiator'),n=10,start=marker(group,0,0,0),end=marker(group,0,0,0);
 const seg=Array.from({length:n},()=>cyl(group,0,0,0,.014,.014,1,mat,'radiator',10));
 const h={fromPort,toPort,start,end,side,seg,group,restLength:.60};hoses.push(h);owner.push(h);
}
for(const end of [-1,1]){
 const start=appendages.children.length;
 const sign=-end,id='radiator',ry=sign*kin.rootY,rz=kin.radRoot;
 const mount=join(appendages,0,ry,rz,id),bank=join(mount,0,0,0,id),knuckle=join(bank,0,0,kin.r,id);
 const ap=kin.rw*.32;
 for(const j of [-1,1]){
  pipe(appendages,v(j*w*.34,sign*hgt*.29,l*.48),v(j*ap,ry,rz),frameRadius,steel,'structure');
  pin(mount,j*ap,0,0,.074,.20,bronze,'x',id);
  pin(knuckle,j*ap,0,0,.060,.16,bronze,'x',id);
 }
 const motor=pin(mount,ap+.12,0,0,.106,.13,navy,'x',id);
 motor.name='Radiator deployment actuator';
 const owner=[],rootPin=marker(mount,0,0,0),rootSocket=marker(bank,0,0,0),elbowPin=marker(bank,0,0,kin.r),elbowSocket=marker(knuckle,0,0,0);
 for(const [j,frame] of [bank,knuckle].entries()){
  const d=kin.descriptors.find(q=>q.type==='rad'&&q.end===end&&q.j===j),off=end*kin.hingeStand;
  const p=join(frame,0,off,kin.r/2,id);box(p,0,0,0,d.width,d.thickness-.008,d.depth,steel,id);
  for(const side of [-1,1]){const skin=thermalMesh(face(p,0,side*(d.thickness*.5-.002),0,d.width,d.depth,finMat,id),'radiator');if(side<0)skin.rotation.x=Math.PI/2;}
  for(const k of [-1,1]){
   const xa=k*ap,mat=k<0?blue:copper;
   pipe(frame,v(xa,0,.012),v(xa,off,.085),.031,steel,id);
   pipe(frame,v(xa,off,.085),v(xa,off,kin.r-.085),.018,mat,id);
   pipe(frame,v(xa,off,kin.r-.085),v(xa,0,kin.r-.012),.031,steel,id);
   const src=marker(j?bank:mount,xa,off,j?kin.r-.16:-.16),dst=marker(frame,xa,off,.16);
   flexible(src,dst,k,mat,owner);
   if(!j)pipe(appendages,v(k*w*.22,sign*hgt*.20,l*.51),v(xa,ry+off,rz-.16),.021,mat,id);
  }
  panels.push({surface:p,descriptor:d});
 }
 // Tip-end hold-downs on a stationary spine support launch loads. Release
 // fingers retract before either radiator hinge starts moving.
 const clips=[];
 for(const j of [-1,1]){
  const xx=j*ap;pipe(appendages,v(xx,ry-sign*.19,rz),v(xx,ry-sign*.19,rz+kin.r-.18),frameRadius*.69,silver,'structure');
  const latch=join(appendages,xx,ry-sign*.19,rz+kin.r-.18,id);box(latch,0,sign*.055,0,.068,.17,.085,gold,id);clips.push(latch);
 }
 for(const o of appendages.children.slice(start))o.userData.assembly='bank '+end;
 rads.push({end,bank,knuckle,clips});
 mechanismAudit.banks.push({end,rootPin,rootSocket,elbowPin,elbowSocket,tip:marker(knuckle,0,0,kin.r),hoses:owner});
}
// The two liquid vessels and high-pressure helium bottle sit within the dry bus.
const service=join(root,0,0,0,'propellant'),tankMap={},regulatorParts=[];service.visible=false;
service.name='Aft pressure-fed tank installation';
for(const t of propulsion.tanks){
 const liquid=t.id!=='helium',r=t.radiusM,g=join(service,t.x,t.y,t.z,'propellant');
 const shell=ell(g,0,0,0,r,r,r,liquid?gold:silver,'propellant');
 shell.name=t.id+' pressure vessel';tankMap[t.id]=g;
 // Separate replaceable half-shell and an equivalent-volume inventory glyph for inspection.
 if(liquid){
  const section=obj(g,new T.SphereGeometry(r,40,24,Math.PI*1.5,Math.PI),gold,0,0,0,'propellant');section.visible=false;
  const fluid=ell(g,0,0,0,r,r,r,t.id==='fuel'?copper:blue,'propellant');fluid.visible=false;
  cells.push({id:t.id,fluid,tank:shell,section,volumeL:t.volumeL,fluidRadiusM:Math.cbrt(.001*t.volumeL*3/(4*Math.PI))});
 }
 for(const z of [-.34,.34]){const rad=r*Math.sqrt(1-z*z),ring=new T.Mesh(new T.TorusGeometry(rad,Math.min(r*.021,.014),10,44),steel);ring.position.z=z*r;g.add(ring);}
 const height=Math.max(.012,(t.z-r*.80)-(-l/2+wallT));
 for(const sign of [-1,1])box(g,sign*r*.48,0,-r*.80-height/2,Math.min(.038,r*.15),r*.40,height,steel,'propellant');
 box(g,0,0,-r*.83,r*1.35,r*.77,Math.min(r*.10,.036),steel,'propellant');
}
// Separate regulated gas and liquid rails on opposite bay walls. Each liquid
// circuit stays isolated all the way to the twin injector valve packages.
const gas=propulsion.tanks.find(q=>q.id==='helium'),liquids=propulsion.tanks.filter(q=>q.id!=='helium');
const feedR=Math.min(.018,w*.008),deck=-l/2;
function tubeRun(points,r,mat){for(let i=1;i<points.length;i++)if(points[i-1].distanceToSquared(points[i])>1e-9)pipe(service,points[i-1],points[i],r,mat,'propulsion');}
function fitting(p,kind,mat){
 const body=box(service,p.x,p.y,p.z,feedR*4.4,feedR*4.0,feedR*5.8,mat,'propulsion');body.name=kind;
 cyl(service,p.x,p.y+feedR*2.5,p.z,feedR*1.65,feedR*1.65,feedR*2.5,dark,'propulsion',16);return body;
}
const reg=v(gas.x,gas.y,gas.z-gas.radiusM-.034);tubeRun([v(gas.x,gas.y,gas.z-gas.radiusM),reg],feedR,silver);
regulatorParts.push(fitting(reg,'Helium isolation and pressure regulator',aqua));
for(const [idx,t] of liquids.entries()){
 const color=idx?blue:copper,side=idx?1:-1,y=t.y+t.radiusM*.85,z=t.z-t.radiusM*.86;
 const tap=v(t.x,y,reg.z);tubeRun([reg,v(reg.x,y,reg.z),tap,v(t.x,t.y+t.radiusM,t.z)],feedR*.8,silver);fitting(tap,'Pressurant check valve',steel);
 const port=v(t.x,t.y,z),man=v(t.x,t.y+side*.065,deck+.06+idx*.04);
 tubeRun([port,man],feedR,color);fitting(man,'Liquid latch and filter assembly',color);
 for(const e of propulsion.engines){const x=e.x+side*.014;tubeRun([man,v(x,man.y,man.z),v(x,e.y,man.z),v(x,e.y,e.throatZ+.01)],feedR*.72,color);}
}
// Reflector is a shallow paraboloid with crossed support rods and a feed horn.
const dishD=Math.max(.3,h.input.kaDishM),base=join(root,w*.16,y0+beam,-l*.35,'communications');cyl(base,0,beam*.6,0,dishD*.18,dishD*.24,beam*1.3,steel,'communications');const dish=join(base,0,beam*2,0,'communications');// The continuous finite-thickness shell runs from inner rim to axis and back along the outer skin.
const parab=[],dishT=Math.max(.007,dishD*.014),profile=(i,dy)=>{const r=dishD*.5*i/16;return new T.Vector2(r,(r/dishD)**2*dishD*.65+dy);};
for(let i=0;i<=16;i++)parab.push(profile(i,-dishT));for(let i=16;i>=0;i--)parab.push(profile(i,0));
const reflector=obj(dish,trimPoleTriangles(new T.LatheGeometry(parab,64)),solid('#dcdacb',.55,.38),0,0,0,'communications');reflector.name='Closed reflector shell';const rim=new T.Mesh(new T.TorusGeometry(dishD*.499,Math.max(.014,dishD*.014),12,64),bronze);rim.rotation.x=Math.PI/2;rim.position.y=dishD*.162;dish.add(rim);for(let j=0;j<3;j++){let a=j*2*Math.PI/3;pipe(dish,v(dishD*.44*Math.cos(a),dishD*.12,dishD*.44*Math.sin(a)),v(0,dishD*.37,0),dishD*.013,steel,'communications');}cyl(dish,0,dishD*.37,0,dishD*.035,dishD*.063,dishD*.10,gold,'communications');
const optic=join(root,-w*.2,y0+beam*1.8,l*.35,'communications');let ap=Math.max(.15,h.input.opticalApertureM);cyl(optic,0,ap*.45,0,ap*.68,ap*.8,ap,ivory,'communications');cyl(optic,0,ap*.98,0,ap*.63,ap*.63,beam*.2,black,'communications');cyl(optic,0,ap*1.01,0,ap*.46,ap*.46,beam*.12,blue,'communications');const patches=[-1,1].map(side=>box(root,side*w*.49,y0*.52,l*.3,beam*.35,hgt*.14,w*.21,bronze,'communications'));
// Liquid-cooled tray section with cold plates, rack manifolds, supply/return branches and end-wall penetrations.
for(let side of [-1,1]){
 const rack=join(internal,side*w*.225,0,0,'compute'),rx=side*w*.175;
 box(rack,-rx*.90,-hgt*.04,0,beam*.35,hgt*.72,l*.62,navy,'compute');
 for(const z of [-1,1])pipe(rack,v(rx,-hgt*.37,z*l*.295),v(rx,hgt*.34,z*l*.295),beam*.31,z>0?blue:copper,'radiator');
 const rackTrays=side<0?Math.ceil(h.trays/2):Math.floor(h.trays/2),rows=Math.min(14,rackTrays);
 for(let k=0;k<rows;k++){const pitch=hgt*.68/Math.max(1,rows),y=-hgt*.36+(k+.18)*pitch;

  const tray=box(rack,0,y,0,w*.36,Math.min(beam*.35,pitch*.22),l*.62,silver,'compute');tray.userData.installedTrayRow=true;trayRows.push(tray);
  thermalMesh(box(rack,0,y+Math.min(beam*.30,pitch*.27),0,w*.33,Math.min(beam*.16,pitch*.13),l*.57,copper,'compute'),'coldPlate');
  for(let j=0;j<4;j++){const z=(j-1.5)*l*.13;const chip=thermalMesh(box(rack,0,y+Math.min(beam*.53,pitch*.48),z,w*.28,Math.min(beam*.26,pitch*.19),l*.115,navy,'compute'),'junction');if(side===1&&k===rows-1&&j===0)chip.userData.dataSource=true;const lamp=box(rack,side*w*.154,y+beam*.54,z+l*.024,beam*.14,beam*.17,beam*.28,lit,'compute');leds.push(lamp);}
  for(const z of [-1,1])pipe(rack,v(side*w*.12,y+beam*.32,z*l*.23),v(rx,y+beam*.32,z*l*.295),beam*.14,z>0?blue:copper,'radiator');
 }
 for(const z of [-1,1]){const p=v(side*w*.40,-hgt*.26,z*l*.295),bend=v(side*w*.40,-hgt*.26,z*l*.40),end=v(side*w*.225,-hgt*.115,z*l*.505);pipe(internal,p,bend,beam*.26,z>0?blue:copper,'radiator');pipe(internal,bend,end,beam*.26,z>0?blue:copper,'radiator');}
}
for(let j=0;j<4;j++){const x=(j-1.5)*w*.20;thermalMesh(box(internal,x,-hgt*.06,l*.408,w*.185,hgt*.64,l*.13,black,'battery'),'battery');box(internal,x,hgt*.277,l*.408,w*.177,beam*.4,l*.128,bronze,'battery');thermalMesh(box(internal,x,hgt*.02,l*.48,w*.1,hgt*.40,beam*.2,aqua,'battery'),'battery');}// Model storage modules as removable drive sleds beside their independent data switch.
const recorder=join(internal,w*.10,-hgt*.025,-l*.407,'storage'),avionics=join(internal,-w*.313,hgt*.05,-l*.401,'avionics');
const driveCount=Math.max(1,Math.ceil(h.storageTB/h.input.diskModuleTB)),shownDrives=Math.min(12,driveCount),driveStep=Math.min(hgt*.145,hgt*.66/shownDrives),rackHeight=driveStep*shownDrives;
for(const side of [-1,1])box(recorder,side*w*.269,0,0,w*.017,rackHeight+beam*.55,l*.137,steel,'storage');
for(let j=0;j<shownDrives;j++){const y=(j+.5-shownDrives/2)*driveStep;
 box(recorder,0,y,0,w*.512,driveStep*.80,l*.132,dark,'storage');box(recorder,0,y,-l*.069,w*.515,driveStep*.85,beam*.13,ivory,'storage');
 box(recorder,-w*.14,y,-l*.074,w*.123,driveStep*.29,beam*.12,black,'storage');box(recorder,w*.205,y,-l*.074,beam*.30,driveStep*.27,beam*.12,aqua,'storage');
 for(const k of [-1,0,1])box(recorder,k*w*.052,y,-l*.074,w*.022,driveStep*.29,beam*.10,bronze,'storage');
}
box(avionics,0,0,0,w*.20,hgt*.37,l*.13,navy,'avionics');
for(let i=0;i<4;i++){const y=hgt*(.12-.080*i);box(avionics,0,y,-l*.066,w*.198,beam*.29,beam*.17,silver,'avionics');for(let j=0;j<3;j++)box(avionics,w*(j-1)*.056,y,-l*.070,w*.032,beam*.14,beam*.16,black,'avionics');}
for(let i=0;i<3;i++){const y=hgt*(.055-i*.037);pipe(internal,v(-w*.214,y,-l*.38),v(-w*.165,y,-l*.38),beam*.078,i===1?copper:dark,'avionics');}
// Three body-axis magnetic bars implement the installed torquer cluster.
const torquers=[];
for(let axis=0;axis<3;axis++){const p=join(internal,-w*.34+(axis===0?w*.11:0),hgt*.29,-l*.19+axis*l*.075,'torquer');
 const len=Math.min(w*.31,l*.18),r=beam*.33,bar=cyl(p,0,0,0,r,r,len,bronze,'torquer',24);for(let n=0;n<4;n++)cyl(p,0,len*(n-1.5)*.19,0,r*1.10,r*1.10,len*.13,copper,'torquer',24);
 if(axis===0)p.rotation.z=Math.PI/2;if(axis===2)p.rotation.x=Math.PI/2;torquers.push(p);
}
// Four physical mechanisms occupy a transverse forward face outside the rack allocation.
const gyroPack=join(root,0,0,0,'cmg');gyroPack.visible=false;
const dims=propulsion.installDims['04.01'];
for(const [i,station] of propulsion.stations['04.01'].entries()){
 const g=join(gyroPack,...station,'cmg'),a=i*Math.PI/2+Math.PI/4,r=.46*Math.min(dims[0],dims[1]);
 const rotor=cyl(g,0,0,0,r*.73,r*.73,dims[2]*.45,bronze,'cmg');rotor.rotation.x=Math.PI/2;
 const ring=new T.Mesh(new T.TorusGeometry(r,r*.075,12,48),ivory);g.add(ring);
 box(g,0,-dims[1]*.43,0,dims[0]*.89,dims[1]*.08,dims[2]*.96,steel,'cmg');
 cmgs.push({g,rotor,a});
}
for(const e of propulsion.engines){
 const engine=join(root,e.x,e.y,e.z,'propulsion'),r=e.exitRadiusM,ht=e.throatZ-e.z;engine.rotation.x=Math.PI/2;
 engine.name='Thrust-deck engine';engines.push(engine);
 const flange=cyl(engine,0,deck-e.z,0,r*.93,r*.93,Math.min(.025,ht*.12),steel,'propulsion',36);
 const chamber=cyl(engine,0,(deck-e.z+ht)/2,0,r*.48,r*.42,Math.max(.008,deck-e.z-ht),silver,'propulsion',36);chamber.name='Injector and combustion chamber';
 cyl(engine,0,ht*.99,0,r*.25,r*.25,ht*.14,black,'propulsion',32);
 // Continuous two-sided bell section with inner wall winding facing the bore.
 const profile=[[r,0],[r*.978,0],[r*.61,ht*.46],[r*.305,ht*.83],[r*.24,ht],[r*.28,ht],[r*.34,ht*.83],[r*.65,ht*.46],[r,0]].map(([x,y])=>new T.Vector2(x,y));
 // Lathe normals point outward when following the outer face upward.
 const bell=obj(engine,new T.LatheGeometry(profile.reverse(),48),dark,0,0,0,'propulsion');bell.name='Engine nozzle';
 const lip=new T.Mesh(new T.TorusGeometry(r*.989,r*.018,8,48),bronze);lip.rotation.x=Math.PI/2;engine.add(lip);
 const len=Math.min(w*1.05,r*9),end=r+len*Math.tan(propulsion.plumeHalfAngleDeg*Math.PI/180);
 const plume=cyl(engine,0,-len/2,0,r,end,len,new T.MeshBasicMaterial({color:0x82cfff,transparent:true,opacity:.26,side:T.FrontSide,depthWrite:false}),'propulsion',40,true);
 plume.visible=false;plumes.push(plume);
}
internal.scale.z=propulsion.equipmentLengthM/l;internal.position.z=propulsion.equipmentCenterZ;
const shelf=box(root,0,0,propulsion.forwardDeckZ,w*.94,hgt*.94,.017,steel,'structure');shelf.name='Aft tank support bulkhead';
function updateHose(h){
 const p=appendages.worldToLocal(h.fromPort.getWorldPosition(v())),q=appendages.worldToLocal(h.toPort.getWorldPosition(v()));
 h.start.position.copy(p);h.end.position.copy(q);
 // Both fittings have the same x. A lateral service loop with constant
 // developed length bends as the hinge turns; only its curvature changes.
 const delta=q.clone().sub(p),n=h.seg.length,spacing=delta.length()/n;
 let lo=0,hi=h.restLength*.5;
 for(let k=0;k<18;k++){
  const height=(lo+hi)*.5;let length=0;
  for(let i=0;i<n;i++)length+=Math.hypot(spacing,height*(Math.sin(Math.PI*(i+1)/n)-Math.sin(Math.PI*i/n)));
  if(length<h.restLength)lo=height;else hi=height;
 }
 let last=p;
 for(let i=1;i<=n;i++){const t=i/n,next=p.clone().addScaledVector(delta,t);next.x+=h.side*(hi+lo)*.5*Math.sin(Math.PI*t);beamTo(h.seg[i-1],last,next);last=next;}
}
let installedAt=null;
function positionPanels(progress){
 if(progress===installedAt)return;installedAt=progress;
 const k=mechanismPose(kin,progress,h.input.solarTiltDeg),s=deploymentSchedule(progress);
 wings.forEach((w,i)=>{
  const m=k.wings[i],side=w.side;w.table.rotation.x=m.pitch;w.tip.position.x=side*m.span;
  w.reel.position.y=m.rollRadius;w.reel.rotation.z=m.rollAngle;
  w.roll.scale.set(m.rollRadius,panelW+.04,m.rollRadius);w.stripe.position.y=m.rollRadius;
  w.discs.forEach(o=>o.scale.set(m.rollRadius+.009,.035,m.rollRadius+.009));
  w.surface.position.x=side*m.span*.5;w.surface.scale.x=m.span;w.surface.visible=m.span>.000001;w.lines.visible=w.surface.visible;
  // Crop the texture at the payout point. Printed cells keep constant pitch.
  const uv=w.front.geometry.attributes.uv;
  for(let j=0;j<4;j++)uv.setX(j,side>0?(j%2?m.span/kin.wl:0):(j%2?1:1-m.span/kin.wl));uv.needsUpdate=true;
  const arr=w.gridPts;let at=0;const segment=(x,y,z,xx,yy,zz)=>{arr.set([x,y,z,xx,yy,zz],at);at+=6;};
  for(let x=.31;x<m.span;x+=.31)segment(side*x,.009,-panelW/2,side*x,.009,panelW/2);
  for(let z=-panelW/2+.23;z<panelW/2;z+=.23)segment(0,.009,z,side*m.span,.009,z);
  w.grid.setDrawRange(0,at/3);w.grid.attributes.position.needsUpdate=true;
  for(const [j,boom] of w.booms.entries()){const z=(j?1:-1)*(panelW*.5+.035);
   beamTo(boom,v(0,0,z),v(side*m.span,0,z));beamTo(w.axles[j],v(0,0,z),v(0,m.rollRadius,z));
   w.saddles[j].rotation.x=(j?1:-1)*Math.PI*.45*Math.min(1,Math.max(0,(progress-.015)/.025));
  }
 });
 rads.forEach((r,i)=>{const m=k.banks[i];r.bank.rotation.x=m.rootPitch;r.knuckle.rotation.x=m.outerPitch-m.rootPitch;
  for(const clip of r.clips)clip.rotation.x=-r.end*1.2*Math.min(1,Math.max(0,(progress-(r.end<0?.42:.665))/.025));
 });
 appendages.updateWorldMatrix(true,true);hoses.forEach(updateHose);
}
positionPanels(1);
return{root,internal,skin,enclosure,service,shelf,tankMap,engines,regulator:regulatorParts[0],walls,wings,panels,mechanismAudit,appendages,recorder,avionics,torquers,driveCount,shownDrives,trayRows,positionPanels,rads,cmgs,cells,leds,dish,optic,patches,plumes,gyroPack,bw,bh,bl,wingspan:2*(panelL+kin.rootX),spanZ:kin.radRoot+2*kin.r*Math.SQRT1_2+Math.max(bl/2,-kin.center+kin.mountZ+panelW/2)};}
