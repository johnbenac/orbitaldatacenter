// Recognition geometry in metres. Hardware arrangement follows the SpaceX V3
// update, Starship vehicle page, Falcon User's Guide and mission imagery.
// Local +Y is up. Surface detail and installation dimensions are visual estimates.
import * as T from './vendor/three.module.js';
import {mountMissionPatch} from './fairing-patch.js';
const TAU=2*Math.PI,V=(...n)=>new T.Vector3(...n);
const mat=(color,metalness=.2,roughness=.55)=>new T.MeshStandardMaterial({color,metalness,roughness});
const add=(p,g,m,x=0,y=0,z=0)=>{const a=new T.Mesh(g,m);a.position.set(x,y,z);p.add(a);return a;};
function node(parent,name){const g=new T.Group();g.name=name;parent.add(g);return g;}
function rod(p,a,b,r,m){const v=b.clone().sub(a),mid=b.clone().add(a).multiplyScalar(.5);const t=add(p,new T.CylinderGeometry(r,r,v.length(),9),m,...mid);t.quaternion.setFromUnitVectors(V(0,1,0),v.normalize());return t;}
function block(p,x,y,z,w,h,l,m){return add(p,new T.BoxGeometry(w,h,l),m,x,y,z);}
function plate(parent,points,depth,material){const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 const geom=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false});geom.translate(0,0,-depth/2);return add(parent,geom,material);}
function finish(kind){
 const c=document.createElement('canvas');c.width=768;c.height=1536;const ctx=c.getContext('2d');
 if(kind==='steel'){
  const g=ctx.createLinearGradient(0,0,c.width,0);
  for(const [x,s] of [[0,'#a6b0b7'],[.12,'#bec8cf'],[.28,'#e3e7df'],[.45,'#b4bdc1'],[.63,'#d7dad8'],[.83,'#8e9aa1'],[1,'#a6b0b7']])g.addColorStop(x,s);
  ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);
  for(let j=0;j<36;j++){const y=j*c.height/36;ctx.fillStyle='rgba(36,52,61,.26)';ctx.fillRect(0,y,768,2);ctx.fillStyle='rgba(255,255,255,.43)';ctx.fillRect(0,y+2,768,1);ctx.fillStyle='rgba(49,66,71,.18)';ctx.fillRect((j*223)%768,y,1,42);}
 }else{
  ctx.fillStyle='#303b40';ctx.fillRect(0,0,c.width,c.height);const a=7,dy=a*1.5,dx=Math.sqrt(3)*a;
  for(let j=-1;j<c.height/dy+1;j++)for(let i=-1;i<c.width/dx+1;i++){
   const x=dx*(i+(j&1)*.5),y=j*dy,l=46+((i*37+j*23)%11+11)%11;ctx.fillStyle=`rgb(${l},${l+3},${l+5})`;ctx.beginPath();
   for(let n=0;n<6;n++){const phi=(n+.5)*Math.PI/3,px=x+Math.cos(phi)*(a-.30),py=y+Math.sin(phi)*(a-.30);if(n)ctx.lineTo(px,py);else ctx.moveTo(px,py);}ctx.closePath();ctx.fill();}
 }
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=T.RepeatWrapping;tex.anisotropy=8;
 return new T.MeshStandardMaterial({color:0xffffff,map:tex,metalness:kind==='steel'?.34:.05,roughness:kind==='steel'?.46:.89});
}
// All bays use the same external mold line, regardless of edits to the payload keep-in.
import {cargoBay,shipNose,noseRadius} from './starship-cargo.js';
export {shipNose};
function skin(parent,stations,start,sweep,m,ymap=0){
 const g=new T.LatheGeometry(stations.map(([r,y])=>new T.Vector2(r,y)),Math.max(6,Math.ceil(80*sweep/TAU)),start,sweep);
 g.normalizeNormals();
 const uv=g.attributes.uv,pos=g.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,(start+sweep*uv.getX(i))/TAU,(pos.getY(i)+ymap)/72);
 return add(parent,g,m);
}
function lattice(p,w,h,d,m,rows=6,cols=6){
 const edge=Math.max(.045,w*.044);for(const s of [-1,1]){block(p,s*(w-edge)/2,0,0,edge,h,d,m);block(p,0,s*(h-edge)/2,0,w-2*edge,edge,d,m);}
 for(let j=1;j<cols;j++)block(p,w*(j/cols-.5),0,0,edge*.5,h-2*edge,d*.78,m);
 for(let j=1;j<rows;j++)block(p,0,h*(j/rows-.5),0,w-2*edge,edge*.5,d*.78,m);
}
function flap(p,theta,y,r,points,width,metal,black){
 const flap=node(p,y>0?'Forward body flap':'Aft body flap');flap.position.set(Math.sin(theta)*r,y,Math.cos(theta)*r);flap.rotation.y=theta-Math.PI/2;if(y>0)flap.rotateZ(.25);
 flap.userData.sideOutline={role:'appendage',xyz:points.map(([x,y])=>[x,y,0])};
 const panel=plate(flap,points,width,metal);
 const coated=plate(flap,points,.014,black);coated.position.z=width*.50+.008;
 const ends=points.filter(([x])=>x<=.05).map(q=>q[1]),min=Math.min(...ends),max=Math.max(...ends);
 rod(flap,V(0,min,0),V(0,max,0),width*.78,metal);
 for(let j=0;j<3;j++){const k=min+(max-min)*(j+.5)/3;rod(flap,V(0,k-.24,0),V(0,k+.24,0),width*.93,black);}
 return panel;
}
export function buildStarship({lower,upper,shell,baseY,stage1,stage2,patch}){
 const steel=finish('steel'),tile=finish('tile'),dark=mat('#344049',.35),nickel=mat('#b4bec2',.44),edge=mat('#697981',.39);
 const r=4.5,hot=baseY+stage1,skirt=.36,ventHeight=2.25;
 lower.name='Super Heavy V3';upper.name='Starship V3';shell.name='Integrated cargo bay';
 // The nozzles terminate at the lower face of the thrust plate. The engine
 // skirt surrounds the outer ring without obscuring the bell exits below it.
 const engineDeck=add(lower,new T.CylinderGeometry(r-.04,r-.07,.20,64),dark,0,baseY+r*.136*1.30+.10,0);engineDeck.name='Super Heavy thrust deck';
 add(upper,new T.CylinderGeometry(r-.04,r-.04,.14,64),dark,0,-stage2+.07,0).name='Starship thrust deck';
 skin(lower,[[4.47,baseY+skirt],[r,baseY+9],[r,hot-ventHeight]],0,TAU,steel,-baseY);
 // Integrated vent openings expose the pressure dome. The ring remains on Super Heavy.
 const dome=add(lower,new T.SphereGeometry(r-.10,48,12,0,TAU,0,Math.PI/2),edge,0,hot-ventHeight-.20,0);dome.scale.y=.36;
 for(const y of [hot-ventHeight,hot-.17])skin(lower,[[r+.025,y],[r+.025,y+.16]],0,TAU,edge);
 for(let j=0;j<18;j++){const a=j*TAU/18;skin(lower,[[r,hot-ventHeight+.13],[r,hot-.16]],a,.085,steel,-baseY);}
 // Four long-chord engine-chine fairings terminate in tapered forward caps.
 for(let i=0;i<4;i++){
  const a=i*TAU/4+.3,g=node(lower,'Booster chine');g.position.set(Math.sin(a)*(r-.21),baseY+1.0,Math.cos(a)*(r-.21));g.rotation.y=a;
  const body=add(g,new T.CylinderGeometry(.54,.66,17,14),steel,0,9,0);body.scale.x=1.55;
  const nose=add(g,new T.CylinderGeometry(.012,.54,4,14),steel,0,19.49,0);nose.scale.x=1.55;
 }
 for(let i=0;i<3;i++){const a=i*TAU/3+.51,p=node(lower,'V3 lowered grid fin');p.rotation.y=a;p.position.y=hot-8.3;
  const fin=node(p,'Grid fin lattice');fin.position.z=r+1.83;fin.rotation.x=Math.PI/2;lattice(fin,3.17,3.45,.42,dark,8,8);
  rod(p,V(0,0,r-.17),V(0,0,r+.47),.33,edge);
 }
 const windAngle=Math.PI/2,thermalSpan=Math.PI*.91,first=windAngle-thermalSpan/2,last=first+thermalSpan;
 const barrel=[[r,-stage2],[r,0]];
 skin(upper,barrel,first,thermalSpan,tile,stage2);skin(upper,barrel,last,TAU-thermalSpan,steel,stage2);
 // The upper tank's closed dome sits below the forward-section mating ring.
 const forwardDome=add(upper,new T.SphereGeometry(r-.08,48,16,0,TAU,0,Math.PI/2),edge,0,-1.81,0);
 forwardDome.name='Forward propellant tank dome';forwardDome.scale.y=.4;
 skin(upper,[[r-.09,-.22],[r-.09,0],[r,0]],0,TAU,nickel,stage2);
 // A retained, side-opening large-cargo door is an ODC integration assumption.
 // The flown V3 satellite dispenser has a different opening. A fixed shell
 // preserves the windward heat shield and no flight phase jettisons the nose.
 const {sillM,headerM,angleRad,hingeX,hingeZ}=cargoBay,center=1.5*Math.PI,a0=center-angleRad,a1=center+angleRad;
 const liner=mat('#657480',.29,.66),rail=mat('#bd9456',.41);
 const between=(a,b)=>[[noseRadius(a),a],...shipNose.filter(([,y])=>y>a&&y<b),[noseRadius(b),b]];
 const mid=between(sillM,headerM),crown=between(headerM,shipNose.at(-1)[1]),base=between(0,sillM),inset=.065;
 shell.userData.sideOutline={role:'shell',xyz:shipNose.map(([r,y])=>[r,y,0])};
 const noseOutline=node(shell,'Leeward nose outline');noseOutline.userData.sideOutline={role:'shell',xyz:crown.map(([r,y])=>[-r,y,0])};
 // A separate opaque liner faces the bay. Section faces close the exposed cut
 // edges so a grazing view sees the jamb thickness as well as the inner skin.
 function wall(p,profile,a,b,finish,name){
  const inner=profile.map(([r,y])=>[Math.max(.008,r-inset),y]),span=b-a;
  const outside=skin(p,profile,a,span,finish,stage2);outside.name=name;
  skin(p,inner.slice().reverse(),a,span,liner,stage2).name=name+' liner';
  return outside;
 }
 function jamb(p,profile,angle,sign){
  const coords=[],tri=[],sn=Math.sin(angle),cs=Math.cos(angle);
  for(const [r,y] of profile){coords.push(r*sn,y,r*cs,(r-inset)*sn,y,(r-inset)*cs);}
  for(let i=0;i<profile.length-1;i++){const j=i*2;tri.push(...(sign<0?[j,j+2,j+1,j+1,j+2,j+3]:[j,j+1,j+2,j+1,j+3,j+2]));}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(coords,3));g.setIndex(tri);g.computeVertexNormals();add(p,g,edge);
 }
 for(const [a,b,finish] of [[first,last,tile],[last,a0,steel],[a1,first+TAU,steel]]){
  wall(shell,shipNose,a,b,finish,'Fixed cargo shell');
 }
 wall(shell,base,a0,a1,steel,'Sill structure');wall(shell,crown,a0,a1,steel,'Fixed nose crown');
 for(const [y,fromInside] of [[sillM,false],[headerM,true]]){
  const r=noseRadius(y),prof=[[r,y],[r-inset,y]];skin(shell,fromInside?prof.reverse():prof,a0,a1,edge,stage2);
 }
 jamb(shell,mid,a0,1);jamb(shell,mid,a1,-1);
 for(const phi of [a0,a1])for(let j=1;j<mid.length;j++){
  const point=([r,y])=>V((r-inset)*Math.sin(phi),y,(r-inset)*Math.cos(phi));
  rod(shell,point(mid[j-1]),point(mid[j]),.075,nickel).name='Fixed longitudinal door jamb';
 }
 for(const y of [sillM-.07,headerM+.08])skin(shell,[[noseRadius(y)-.13,y-.075],[noseRadius(y)-.13,y+.075]],0,TAU,edge);
 add(shell,new T.CylinderGeometry(.020,.022,.025,32),steel,0,shipNose.at(-1)[1]+.0125,0).name='Fixed nose tip cap';
 const door=node(shell,'Retained cargo door');door.position.set(hingeX,0,hingeZ);
 const leaf=node(door,'Cargo door skin');leaf.position.set(-hingeX,0,-hingeZ);
 leaf.userData.sideOutline={role:'shell',xyz:mid.map(([r,y])=>[-r,y,0])};
 const doorSkin=wall(leaf,mid,a0,a1,steel,'Leeward plug door');doorSkin.userData.cargoWall=true;
 jamb(leaf,mid,a0,-1);jamb(leaf,mid,a1,1);
 for(const [y,top] of [[sillM,false],[headerM,true]]){
  const r=noseRadius(y),prof=[[r,y],[r-inset,y]];skin(leaf,top?prof:prof.reverse(),a0,a1,edge,stage2);
 }
 if(patch)mountMissionPatch(doorSkin,mid,center,(headerM+sillM)*.5,4.85,patch);
 for(const y of [1.35,5.3,9.3,13.85]){
  const bearing=node(shell,'Side hatch hinge');bearing.position.set(hingeX,y,hingeZ);rod(bearing,V(0,-.25,0),V(0,.25,0),.095,dark);
  const rr=noseRadius(y);rod(leaf,V(hingeX,y,hingeZ),V((rr-.13)*Math.sin(a0+.06),y,(rr-.13)*Math.cos(a0+.06)),.07,nickel);
  const ribR=rr-inset-.05;skin(leaf,[[ribR,y-.05],[ribR,y+.05]],a0+.06,a1-a0-.12,edge);
  const latch=node(shell,'Hatch latch socket');latch.position.set(rr*Math.sin(a1),y,rr*Math.cos(a1));block(latch,0,0,0,.17,.22,.15,nickel);
 }
 add(shell,new T.CylinderGeometry(4.42,4.42,.13,80),liner,0,.12,0).name='Closed cargo deck';
 // Four nested box sections overlap even at maximum travel. The crosshead
 // supports the flight adapter; the two outer guides are fixed to the deck.
 const slides=[],g=cargoBay;
 for(let i=0;i<=3;i++){
  const slide=node(shell,i?'Telescoping retained guide':'Fixed cargo tracks');slides.push(slide);
  for(const z of [-.91,.91])block(slide,-.20,.56,z,3.8,.21-i*.025,.25-i*.035,i===0?dark:i===3?rail:nickel);
 }
 const car=node(shell,'Retained cargo carriage');
 block(car,0,g.deckM-.075,0,2.85,.15,2.55,rail);
 for(const z of [-.91,.91])block(car,0,.66,z,2.75,.12,.19,dark);
 for(const x of [-1.20,1.20])block(car,x,g.deckM+.015,0,.075,.03,2.40,nickel);
 // Forward flaps sit aft of the nose tip and aft flaps hinge at the ship skirt.
 // Windward coatings occupy the forward-facing side of each opposed flap.
 for(const s of [-1,1]){
  const aftAngle=windAngle+s*1.57,forwardAngle=windAngle+s*1.97;
  flap(upper,aftAngle,-stage2+.28,r-.14,[[0,0],[3.55,-.12],[3.55,3.4],[2.9,6.5],[.55,12.8],[0,13.4]],.28,edge,tile);
  flap(shell,forwardAngle,16.4,4.00,[[0,-.15],[2.12,-.32],[2.14,.9],[1.80,3.7],[.22,6.65],[0,6.9]],.19,steel,tile);
 }
 return {door,car,openDoor(fraction,travelM=0){
  door.rotation.y=-fraction*cargoBay.travelRad;car.position.x=-travelM;
  slides.forEach((slide,i)=>slide.position.x=-travelM*i/3);
 }};
}

export function falconRecovery(parent,r,base,height){
 const carbon=mat('#24292d',.14,.74),shoulder=mat('#3b4144',.17),pin=mat('#9aabb0',.49),rubber=mat('#181e22',.05),tubeMetal=mat('#737f84',.54);
 for(let i=0;i<4;i++){
  // Legs are clocked between side-core attach planes. Each is retained flush
  // against its own barrel for the whole ascent. Feet travel with that core.
  const a=Math.PI/4+i*Math.PI/2,g=node(parent,'Falcon landing leg');g.position.set(Math.sin(a)*r*.97,base+.42,Math.cos(a)*r*.97);g.rotation.y=a;
  const length=r*4.95,half=r*.43;
  g.userData.sideOutline={role:'appendage',xyz:[[-half,.18,.17],[-.12,length,.17],[.12,length,.17],[half,.18,.17]]};
  const body=plate(g,[[-half,.18],[-half*.83,length*.32],[-.22,length*.90],[-.12,length],[.12,length],[.22,length*.90],[half*.83,length*.32],[half,.18]],.11,carbon);body.position.z=.125;
  // Recessed telescoping stay and clevises run inside the hollow folded leg.
  rod(g,V(0,length*.48,.185),V(0,length*.76,.205),.113,shoulder);
  rod(g,V(0,length*.76,.205),V(0,length*.88,.22),.079,tubeMetal);
  for(const s of [-1,1]){
   rod(g,V(s*half,.18,.20),V(s*.13,length-.24,.255),.082,shoulder);
   const lug=add(g,new T.CylinderGeometry(.16,.16,.25,14),pin,s*half,.21,.19);lug.rotation.z=Math.PI/2;
   block(g,s*half,.18,.002,.24,.44,.28,carbon);
  }
  const shoe=plate(g,[[-.28,-.16],[.28,-.16],[.38,-.035],[.24,.31],[-.24,.31],[-.38,-.035]],.20,rubber);shoe.position.set(0,length+.05,.23);
  block(g,0,length-.23,.205,.38,.22,.18,pin);
  const finRoot=node(parent,'Stowed Falcon grid fin');finRoot.position.set(Math.sin(a)*r,base+height*.824,Math.cos(a)*r);finRoot.rotation.y=a;
  const fins=node(finRoot,'Folded fin lattice');fins.position.set(0,-r*.71,.13);lattice(fins,r*1.03,r*1.36,r*.16,shoulder,5,5);
  rod(finRoot,V(-.30,0,.16),V(.30,0,.16),.094,pin);
 }
}
export function launchNozzles(count,r,stage){
 const bells=[];
 function ring(n,radius,bellRadius,phase=0,kind='engine'){for(let j=0;j<n;j++){const a=phase+j*TAU/n;bells.push({x:radius*Math.sin(a),z:radius*Math.cos(a),diam:bellRadius,kind});}}
 if(stage==='superHeavy'){ring(3,.18*r,.136*r);ring(10,.49*r,.135*r,.16);ring(20,.847*r,.131*r,.08);return bells;}
 if(stage==='starship'){ring(3,.23*r,.13*r);ring(3,.625*r,.245*r,Math.PI/3,'Raptor Vacuum');return bells;}
 if(count>6){ring(1,0,r*.15);ring(count-1,r*.66,r*(count===9?.222:.155));}
 else ring(count??0,count===1?0:(count===2?.42:.60)*r,r*(count>2?.22:.33));
 return bells;
}
