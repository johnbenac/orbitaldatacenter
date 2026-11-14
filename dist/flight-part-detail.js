// Close inspection recipes for existing flight hardware. Features are visual
// interpretations of fasteners, finishes and construction, not supplier CAD or
// extra equipment. They never participate in mass, power, areas or clearance.
import * as T from './vendor/three.module.js';
import {createDetailKit,refinePrimitiveGeometry} from './hardware-detail-primitives.js';

const axes=['x','y','z'],TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const FLIGHT_ROLES=new Set(['primary-frame','launch-interface','enclosure-face-sheet','sandwich-core','mli-outer','mli-inner','mli-white-outer','solar-active','solar-coverglass','solar-backing','solar-boom','deployment-hardware','radiator-finish','radiator-face-sheet','radiator-core','coolant-tube','radiator-passage','passive-heat-pipe','cold-plate','compute-chassis','compute-board','battery-case','electronics-case','propellant-tank','pressurant-tank','propellant-feed','nozzle','optical-support','optical-housing','optical-aperture','rf-reflector','rf-contact','rf-radome','harness','attitude-hardware','magnetic-rod','electrical-winding','electrical-busbar','radiation-shield','sensor-baffle','feedthrough-seal','heat-pump-case']);
export const flightDetailRoles=Object.freeze([...FLIGHT_ROLES]);
const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
function face(k,axis=null,sign=1){
 const n=axis||axes.reduce((a,b)=>k.size[a]<k.size[b]?a:b),[u,w]=axes.filter(a=>a!==n),W=k.size[u],H=k.size[w];
 const point=(a=0,b=0,depth=0)=>{const p=k.center.clone();p[u]+=a;p[w]+=b;p[n]=(sign>0?k.max[n]:k.min[n])+sign*depth;return p;};
 const size=(a,b,depth)=>{const s=v();s[u]=a;s[w]=b;s[n]=depth;return s;};
 const normal=v();normal[n]=sign;
 return {n,u,w,W,H,normal,point,size,plate:(a,b,width,height,depth,mat='metal',lift=0)=>k.box(point(a,b,lift+depth/2),size(width,height,depth),mat)};
}
function screws(k,f,count=4,material='metal'){
 const radius=Math.min(.005,Math.min(f.W,f.H)*.025),inset=radius*3;if(radius<.0001)return;
 for(const x of [-1,1])for(const y of [-1,1])k.bolt(f.point(x*(f.W/2-inset),y*(f.H/2-inset),radius*.08),radius,material,f.normal);
 if(count>4)for(const x of [-1,1])k.bolt(f.point(x*(f.W/2-inset),0,radius*.08),radius,material,f.normal);
}
function seam(k,f,material='dark',margin=.04){
 const t=Math.min(k.thickness*.5,Math.min(f.W,f.H)*.006),W=f.W*(1-margin*2),H=f.H*(1-margin*2);if(t<=0)return;
 for(const s of [-1,1]){f.plate(s*W/2,0,t,H,t,material);f.plate(0,s*H/2,W,t,t,material);}
}
function connector(k,f,u,w,width,height){
 const depth=Math.min(.009,Math.min(width,height)*.18);f.plate(u,w,width,height,depth,'dark');
 const count=k.high?6:3,pin=Math.min(height*.11,.0018);
 for(let i=0;i<count;i++){const p=f.point(u+width*.7*((i+.5)/count-.5),w,depth+pin*.25);k.cylinder(p,pin,depth*.35,'gold',f.normal,8);}
 for(const s of [-1,1])k.bolt(f.point(u+s*width*.43,w,depth),height*.10,'metal',f.normal);
}
function tag(k,f,context,text){
 const material=context.materials?.decal?.(text,'light')||context.materials?.label;
 if(!material)return;const W=Math.min(f.W*.28,.11),H=Math.min(f.H*.12,W*.28);
 if(W>.012&&H>.004)f.plate(-f.W*.20,-f.H*.20,W,H,k.thickness*.13,material,k.thickness*.30);
}
function axial(k,at,radius,material='metal',width=0){
 const p=k.center.clone();p.y=at;
 if(width>0)k.cylinder(p,radius,width,material,'y');else k.torus(p,radius,Math.min(radius*.025,k.thickness*.8),material,'y');
}
function collar(k,fraction=.38,material='metal'){
 const r=Math.min(k.size.x,k.size.z)/2;
 for(const sign of [-1,1])axial(k,k.center.y+sign*k.size.y*fraction,r*1.012,material,Math.min(r*.12,k.size.y*.055));
}
function boltCircle(k,axis,radius,height,count=8,boltRadius=null){
 const [a,b]=axes.filter(s=>s!==axis),dir=v();dir[axis]=1;
 const r=boltRadius||Math.min(radius*.045,.005);
 for(let i=0;i<count;i++){const theta=TAU*i/count,p=k.center.clone();p[a]+=radius*Math.cos(theta);p[b]+=radius*Math.sin(theta);p[axis]=height;k.bolt(p,r,'metal',dir);}
}
function boxAssembly(k,context,kind){
 const f=face(k),thin=Math.min(k.size.x,k.size.y,k.size.z),t=Math.max(.0002,Math.min(.003,thin*.045));
 seam(k,f);screws(k,f,k.high?6:4);
 // End rails and a lid lip are shallow, preserving the allocated package.
 for(const s of [-1,1])f.plate(s*f.W*.46,0,Math.min(f.W*.025,.008),f.H*.86,t,'metal');
 if(kind==='battery'){
  const front=face(k,'z');if(!k.source.userData.explicitElectricalPorts)for(const sign of [-1,1])connector(k,front,sign*front.W*.25,0,front.W*.16,Math.min(front.H*.18,.03));
  for(const s of [-1,1])f.plate(s*f.W*.22,0,Math.min(f.W*.025,.009),f.H*.83,t,'dark');tag(k,f,context,'BATTERY');
 }else{
  const front=face(k,thin===k.size.z?'z':'z'),n=k.high?3:2;
  if(!k.source.userData.explicitElectricalPorts)for(let i=0;i<n;i++)connector(k,front,(i-(n-1)/2)*front.W*.26,0,front.W*.19,Math.min(front.H*.38,.036));
  const finCount=k.high?7:3;
  if(thin>Math.max(k.size.x,k.size.y,k.size.z)*.12)for(let i=0;i<finCount;i++)f.plate((i-(finCount-1)/2)*f.W*.055,f.H*.14,Math.min(f.W*.015,.004),f.H*.32,t,'dark');
  tag(k,f,context,kind==='compute'?'COMPUTE':kind==='pump'?'THERMAL':'ELECTRONICS');
 }
}
function board(k){
 const f=face(k),height=Math.min(.008,Math.min(f.W,f.H)*.025),nx=k.high?4:2,ny=k.high?3:2;
 f.plate(0,0,f.W*.985,f.H*.985,Math.min(.00005,height*.02),'board');
 for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
  const x=((i+.5)/nx-.5)*f.W*.74,y=((j+.5)/ny-.5)*f.H*.74,W=f.W*.48/nx,H=f.H*.44/ny;
  f.plate(x,y,W,H,height,'dark');
  if(k.high){f.plate(x,y,W*.70,H*.60,height*.09,'metal',height);for(const s of [-1,1])for(let pin=0;pin<3;pin++)f.plate(x+s*W*.57,y+(pin-1)*H*.22,W*.10,H*.06,height*.2,'gold');}
 }
 for(let i=0;i<(k.high?12:6);i++){const x=((i+.5)/(k.high?12:6)-.5)*f.W*.8;f.plate(x,-f.H*.44,f.W*.018,f.H*.065,height*.18,'gold');}
 screws(k,f);
}
function coldPlate(k){
 const f=face(k),radius=Math.min(.002,Math.min(f.W,f.H)*.009),rows=k.high?6:3;
 // Shallow channel covers and manifolds visualize the existing thermal plate.
 for(let i=0;i<rows;i++){const x=(i-(rows-1)/2)*f.W*.12;f.plate(x,0,radius*2,f.H*.74,radius*.7,'metal');}
 for(const s of [-1,1]){f.plate(0,s*f.H*.37,f.W*.70,radius*3,radius,'metal');connector(k,f,s*f.W*.31,s*f.H*.39,f.W*.07,Math.min(f.H*.08,.025));}
 screws(k,f);
}
function frameDetail(k,context,role){
 if(k.source.geometry.type==='CylinderGeometry'){tubeDetail(k,role);return;}
 if(k.source.geometry.type==='SphereGeometry'||k.source.geometry.type==='TorusGeometry')return;
 const f=face(k);if(Math.min(f.W,f.H)<.004)return;
 if(role==='launch-interface'){screws(k,f,k.high?6:4);seam(k,f,'metal',.14);}
 else if(role==='enclosure-face-sheet'||role==='radiation-shield'){screws(k,f,k.high?6:4);seam(k,f,'dark',.035);}
 else{
  const long=axes.reduce((a,b)=>k.size[a]>k.size[b]?a:b),short=axes.filter(a=>a!==long).sort((a,b)=>k.size[a]-k.size[b])[0],ff=face(k,short);
  seam(k,ff,'dark',.15);screws(k,ff);
 }
}
function coreDetail(k){
 const f=face(k),depth=k.size[f.n];if(depth<=.001)return;
 const side=face(k,f.u),r=Math.min(depth*.22,.012),length=Math.min(f.W*.008,r*.45),n=k.high?16:6;
 // A few real hexagonal cell walls at exposed edges, not across intact skins.
 for(const sign of [-1,1])for(let i=0;i<n;i++){
  const p=k.center.clone();p[f.u]=(sign>0?k.max[f.u]:k.min[f.u])+sign*.0001;p[f.w]=k.center[f.w]+((i+.5)/n-.5)*f.H*.90;
  const axis=v();axis[f.u]=1;const q=new T.Quaternion().setFromUnitVectors(v(0,1,0),axis);
  k.add(new T.CylinderGeometry(r,r,Math.max(.0001,length),6,1,true),'metal',p,q);
 }
 for(const s of [-1,1])f.plate(s*f.W*.495,0,Math.min(f.W*.01,.004),f.H,Math.min(depth*.05,.002),'metal');
}
function blanket(k,white=false){
 const f=face(k),t=Math.min(k.thickness*.45,.0015),tape=white?'white':'gold';
 const width=Math.min(.012,Math.min(f.W,f.H)*.025);
 for(const sign of [-1,1]){f.plate(sign*(f.W/2-width*.6),0,width,f.H*.98,t,tape);f.plate(0,sign*(f.H/2-width*.6),f.W*.98,width,t,tape);}
 if(k.high)for(const s of [-1,1]){
  f.plate(s*f.W*.18,0,width*.35,f.H*.88,t*.5,tape);
  for(let i=0;i<8;i++)f.plate(s*f.W*.18,(i-3.5)*f.H*.105,width*1.7,width*.16,t*.8,white?'dark':'metal');
 }
}
function solarSurface(k,back=false){
 const f=face(k),width=Math.min(.012,Math.min(f.W,f.H)*.012),t=Math.min(.0008,k.thickness*.3),material=back?'dark':'metal';
 for(const side of [-1,1])f.plate(side*(f.W*.5-width),0,width,f.H*.99,t,material);
 if(back){for(const s of [-1,1])f.plate(0,s*f.H*.32,f.W*.98,width*.35,t,'gold');return;}
 const count=k.high?18:8;
 for(const side of [-1,1])for(let i=0;i<count;i++){const y=((i+.5)/count-.5)*f.H*.94;f.plate(side*(f.W*.5-width*1.4),y,width*2.4,Math.min(width*.8,f.H/count*.10),t*1.3,'gold');}
 for(const s of [-1,1])f.plate(0,s*f.H*.485,f.W*.94,width*.4,t*.7,'copper');
}
function radiatorFace(k){
 const f=face(k),t=Math.min(.0015,k.thickness*.3),rim=Math.min(.006,Math.min(f.W,f.H)*.008);
 for(const sign of [-1,1]){f.plate(sign*(f.W*.5-rim),0,rim,f.H*.99,t,'metal');f.plate(0,sign*(f.H*.5-rim),f.W*.99,rim,t,'metal');}
 // Small bonded edge tabs stay off the working radiator finish.
 for(const sign of [-1,1])for(let i=0;i<(k.high?6:3);i++)f.plate(sign*f.W*.485,((i+.5)/(k.high?6:3)-.5)*f.H*.88,rim*2,rim*3,t,'metal');
}
function tubeDetail(k,role){
 const r=Math.min(k.size.x,k.size.z)/2;if(r<=.0001)return;
 collar(k,.40,role==='harness'?'dark':'metal');
 if(role==='harness')for(let i=0;i<(k.high?7:3);i++)axial(k,k.center.y+((i+.5)/(k.high?7:3)-.5)*k.size.y*.76,r*1.01,'gold');
 if(role==='magnetic-rod'){
  for(const sign of [-1,1]){const p=k.center.clone();p.y+=sign*k.size.y*.44;k.box(p,[r*2.2,Math.min(r*.4,k.size.y*.06),r*.5],'metal');}
 }else if(role==='electrical-winding'){
  const n=k.high?10:4;for(let i=0;i<n;i++)axial(k,k.center.y+((i+.5)/n-.5)*k.size.y*.9,r*1.006,'copper');
 }else if(role==='solar-boom'){
  const p=k.center.clone();p.z+=r*.99;k.box(p,[r*.035,k.size.y*.9,r*.025],'dark');
 }
}
function mechanism(k,source,role){
 const type=source.geometry.type;
 if(type==='CylinderGeometry'){
  const r=Math.min(k.size.x,k.size.z)/2,top=k.max.y;
  collar(k,.42,'metal');
  const motor=role==='attitude-hardware'||/actuator|rotor|bearing|motor|cradle|union/i.test(source.name);
  if(motor){axial(k,top,r*.73,'dark');boltCircle(k,'y',r*.78,top,k.high?8:4,Math.min(r*.045,.004));axial(k,top+Math.min(k.size.y*.015,.001),r*.20,'metal',Math.min(k.size.y*.025,.003));}
  else if(k.size.y<r*1.4)boltCircle(k,'y',r*.78,top,k.high?8:4,Math.min(r*.04,.004));
 }else if(type==='TorusGeometry'){
  const p=source.geometry.parameters,r=p.radius*Math.min(Math.abs(source.scale.x),Math.abs(source.scale.y)),height=k.center.z+p.tube*Math.abs(source.scale.z)*.92;
  boltCircle(k,'z',r,height,k.high?8:4,Math.min(p.tube*Math.abs(source.scale.z)*.25,.004));
 }else frameDetail(k,{},role);
}
function tankDetail(k,source,pressurant){
 const r=Math.min(k.size.x,k.size.z)/2,ry=k.size.y/2,band=Math.min(.003,r*.009);
 for(const sign of [-1,1]){const y=k.center.y+sign*ry*.30,p=k.center.clone();p.y=y;k.torus(p,r*Math.sqrt(1-.3*.3),band,pressurant?'dark':'metal','y');}
 const p=k.center.clone();p.y=k.max.y;const boss=Math.min(r*.12,.035);
 k.cylinder(p,boss,Math.min(ry*.015,.004),'metal','y');boltCircle(k,'y',boss*.72,p.y+Math.min(ry*.009,.002),k.high?6:3,boss*.095);
 if(!pressurant){const equator=k.center.clone();k.torus(equator,r*.999,band*.36,'metal','y');}
}
function optical(k,source,role){
 if(role==='optical-aperture')return;
 if(source.geometry.type!=='CylinderGeometry'){mechanism(k,source,role);return;}
 const r=Math.min(k.size.x,k.size.z)/2,p=source.geometry.parameters,scale=Math.abs(source.scale.x),rt=(p.radiusTop||0)*scale,rb=(p.radiusBottom||0)*scale;
 axial(k,k.max.y,Math.max(rt*.97,.0001),role==='sensor-baffle'?'dark':'metal');
 if(role!=='sensor-baffle'){axial(k,k.min.y,Math.max(rb*.97,.0001),'metal');boltCircle(k,'y',rt*.86,k.max.y,k.high?8:4,Math.min(r*.025,.003));}
 if(role==='optical-housing'){
  for(let i=0;i<(k.high?10:5);i++){const theta=i*TAU/(k.high?10:5),p=k.center.clone();p.x+=r*Math.cos(theta)*.99;p.z+=r*Math.sin(theta)*.99;k.cylinder(p,Math.min(r*.008,.0015),k.size.y*.66,'white','y',6);}
 }
}
function latheDetail(k,source,role){
 const points=source.geometry.parameters?.points;if(!points?.length)return;
 if(role==='rf-reflector'){
  const radius=k.size.x/2,depth=k.size.y;
  // The original paraboloid and its aperture remain untouched. Back ribs follow
  // its measured profile, stopping short of the rim and center feed support.
  const profile=points.slice(0,Math.floor(points.length/2)+1).filter(p=>p.x>radius*.10&&p.x<radius*.94);
  for(let i=0;i<(k.high?8:4);i++){
   const theta=TAU*i/(k.high?8:4),path=profile.map(p=>v(p.x*Math.cos(theta)*source.scale.x,p.y*source.scale.y-Math.min(.002,depth*.025),p.x*Math.sin(theta)*source.scale.z));
   if(path.length>1)k.tube(path,Math.min(radius*.005,.003),'metal');
  }
 }else if(role==='nozzle'){
  const rim=points.reduce((a,b)=>a.x>b.x?a:b),p=k.center.clone();p.y=rim.y*source.scale.y;
  k.torus(p,rim.x*Math.abs(source.scale.x)*.996,Math.min(.0015,k.size.x*.004),'dark','y');
  const throat=points.reduce((a,b)=>a.y>b.y?a:b);axial(k,throat.y*source.scale.y,throat.x*Math.abs(source.scale.x), 'metal');
 }
}

// The render factories intentionally batch identical rack boxes. Detail the
// bounded sample of actual boxes, never the empty bounding volume of the rack.
function batchKits(source,k){
 const g=source.geometry,p=g.attributes.position;if(g.type!=='BufferGeometry'||p.count%24||!g.index||g.index.count!==p.count/24*36)return [k];
 const total=p.count/24,max=k.high?12:4,ids=Array.from({length:Math.min(max,total)},(_,i)=>Math.round(i*(total-1)/Math.max(1,Math.min(max,total)-1)));
 return ids.map(id=>{
  const bounds=new T.Box3();for(let j=0;j<24;j++)bounds.expandByPoint(v().fromBufferAttribute(p,id*24+j).multiply(source.scale));
  return {...k,center:bounds.getCenter(v()),size:bounds.getSize(v()),min:bounds.min,max:bounds.max};
 });
}

export function buildFlightPartDetail(source,context={}){
 if(!source?.isMesh||!source.geometry||source.userData.hardwareDetail||source.userData.physicalMaterial===false||source.userData.engineeringGraphic)return null;
 const role=source.userData.materialRole||source.material?.userData?.materialRole;if(!FLIGHT_ROLES.has(role))return null;
 const k=createDetailKit(source,context);if(Math.max(k.size.x,k.size.y,k.size.z)<.002)return null;
 const type=source.geometry.type,geometry=refinePrimitiveGeometry(source,context.tier||'high');
 if(['compute-chassis','compute-board','cold-plate'].includes(role)){
  for(const part of batchKits(source,k)){if(role==='compute-board')board(part);else if(role==='cold-plate')coldPlate(part);else boxAssembly(part,context,'compute');}
 }else if(['electronics-case','battery-case','heat-pump-case'].includes(role))boxAssembly(k,context,role==='battery-case'?'battery':role==='heat-pump-case'?'pump':'electronics');
 else if(['mli-outer','mli-inner','mli-white-outer'].includes(role))blanket(k,role==='mli-white-outer');
 else if(['solar-active','solar-coverglass'].includes(role))solarSurface(k);
 else if(role==='solar-backing'){
  if(type==='CylinderGeometry'){collar(k,.47,'dark');for(let i=0;i<(k.high?6:3);i++)axial(k,k.center.y+((i+.5)/(k.high?6:3)-.5)*k.size.y*.87,Math.min(k.size.x,k.size.z)*.501,'dark');}
  else solarSurface(k,true);
 }else if(role==='radiator-finish')radiatorFace(k);
 else if(['sandwich-core','radiator-core'].includes(role))coreDetail(k);
 else if(['solar-boom','coolant-tube','propellant-feed','radiator-passage','passive-heat-pipe','harness','magnetic-rod','electrical-winding'].includes(role)){
  if(type==='CylinderGeometry')tubeDetail(k,role);else if(role==='propellant-feed')boxAssembly(k,context,'pump');else frameDetail(k,context,role);
 }else if(['propellant-tank','pressurant-tank'].includes(role)){
  if(type==='SphereGeometry'&&(source.geometry.parameters.phiLength??TAU)>TAU*.99)tankDetail(k,source,role==='pressurant-tank');
 }else if(['attitude-hardware','deployment-hardware','optical-support'].includes(role))mechanism(k,source,role);
 else if(['optical-housing','optical-aperture','sensor-baffle'].includes(role))optical(k,source,role);
 else if(['rf-reflector','nozzle'].includes(role)){
  if(type==='LatheGeometry')latheDetail(k,source,role);else if(type==='CylinderGeometry')mechanism(k,source,role);
 }else if(role==='rf-contact'){
  if(type==='CylinderGeometry')collar(k,.38,'gold');else frameDetail(k,context,role);
 }else if(role==='rf-radome'){const f=face(k);screws(k,f);seam(k,f,'white',.06);}
 else if(role==='feedthrough-seal'){
  if(type==='TorusGeometry'){}else if(type==='CylinderGeometry')collar(k,.35,'gasket');else seam(k,face(k),'gasket',.05);
 }else if(role==='electrical-busbar'){const f=face(k);screws(k,f,4,'metal');}
 else if(role==='launch-interface'&&['CylinderGeometry','TorusGeometry'].includes(type))mechanism(k,source,role);
 else frameDetail(k,context,role);
 const group=k.finish();if(!geometry&&!group.children.length)return null;
 return {geometry:geometry||undefined,group:group.children.length?group:undefined,label:role.replaceAll('-',' ')+' detail'};
}
