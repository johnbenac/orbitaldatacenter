import * as T from './vendor/three.module.js';
import {launchEffectsAt,launchRiseM} from './launch-effects-state.js';
export {launchEffectsAt,launchRiseM};
const V=(x,y,z)=>new T.Vector3(x,y,z),clamp=x=>Math.max(0,Math.min(1,x));
const style={
 methalox:{length:25,wide:1.5,colors:['#e1f5ff','#9aa5ff','#e4a8c8'],opacity:.82},
 kerolox:{length:24,wide:1.8,colors:['#fffbe4','#ffce70','#f47735'],opacity:1},
 hydrolox:{length:16,wide:1.2,colors:['#d6e8ff','#90afec','#a0bacd'],opacity:.33},
 solid:{length:29,wide:2.7,colors:['#fff9d8','#ffe7a8','#fba657'],opacity:1},
 unknown:{length:14,wide:1.6,colors:['#c9d1cb','#aeb9b9','#a1afae'],opacity:.55}
};
const noise=(x,y,seed)=>{const i=Math.floor(x),j=Math.floor(y),u=x-i,w=y-j;
 const hash=(a,b)=>{let n=Math.imul(a+seed,374761393)+Math.imul(b,668265263);n=Math.imul(n^n>>>13,1274126177);return ((n^n>>>16)>>>0)/4294967295;};
 const m=u*u*(3-2*u),l=w*w*(3-2*w);return (1-l)*((1-m)*hash(i,j)+m*hash(i+1,j))+l*((1-m)*hash(i,j+1)+m*hash(i+1,j+1));};
function generatedTexture(n,paint){
 const c=document.createElement('canvas');c.width=c.height=n;const ctx=c.getContext('2d'),img=ctx.createImageData(n,n);
 if(img?.data){for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4;paint(img.data,i,(x+.5)/n,(y+.5)/n);}ctx.putImageData(img,0,0);}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
}
const sRGB=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
// UVs run from the nozzle lip to the tail. Each material carries a plume
// texture so the exact same shear layer and blue shock cells reach Canvas2D.
export function exhaustFactory(){
 const cache=new Map();
 return (parent,x,y,z,r,fuel,merged=false)=>{
  const g=new T.Group(),type=style[fuel]?fuel:'unknown',s=style[type];g.position.set(x,y,z);parent.add(g);g.name=type+' engine exhaust';g.userData.fuel=type;
  let entry=cache.get(type);
  if(!entry){
   const palette=s.colors.map(sRGB),texture=generatedTexture(96,(out,i,u,v)=>{
    const a=noise(u*12,v*18,17),b=noise(u*33,v*27,93),mix=Math.min(1,1.7*v),tail=clamp((v-.45)*1.85);
    const cell=(.5+.5*Math.cos(v*46))**5*(type==='hydrolox'||type==='methalox'?.32:.12)*(1-v);
    for(let k=0;k<3;k++){const base=palette[0][k]*(1-mix)+palette[1][k]*mix;out[i+k]=(base*(1-tail)+palette[2][k]*tail)*(.89+.14*a)+cell*40;}
    out[i+3]=255*s.opacity*(.62+.38*a)*(1-smoothTail(v))*(.78+.22*b);
   });
   const shape=[[.032,-1],[s.wide*.78,-.86],[s.wide,-.70],[s.wide*.79,-.5],[1.17,-.23],[.96,-.08],[.91,0]].map(([x,y])=>new T.Vector2(x,y*s.length));
   const geom=new T.LatheGeometry(shape,12);geom.normalizeNormals();const mat=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:T.FrontSide,toneMapped:false});
   entry={geom,mat};cache.set(type,entry);
  }
  const m=new T.Mesh(entry.geom,merged?entry.mat.clone():entry.mat);m.scale.setScalar(r);if(merged){m.material.opacity=.51;m.scale.y*=.72;g.name=type+' merged exhaust shear layer';g.userData.mergedJet=true;}m.renderOrder=2;g.add(m);return g;
 };
}
function smoothTail(v){return clamp(v*.75+v**4*.25);}
function cloudTexture(seed,warm=false){
 return generatedTexture(96,(out,i,u,v)=>{
  const x=2*u-1,y=2*v-1;
  const a=noise(3*u,3*v,seed),b=noise(9*u,9*v,seed+1),c=noise(23*u,23*v,seed+2);
  const n=.60*a+.31*b+.09*c;
  const density=clamp((.73+(.62*n-.31)-Math.sqrt(x*x*.92+y*y))/.28);
  const light=clamp(.50+.28*n-.24*y-.08*x+.16*b);
  const dark=warm?[99,91,77]:[123,139,147],hi=warm?[231,215,190]:[251,252,245];
  for(let k=0;k<3;k++)out[i+k]=dark[k]+(hi[k]-dark[k])*light;
  out[i+3]=255*density*density*(.75+.25*b);
 });
}
// Close-field particulate trail. Individual nozzle jets carry the hot gas;
// wider packets represent entrained soot or booster particles farther downstream.
export function buildAscentWake(mounts){
 const plane=new T.PlaneGeometry(1,1),maps=[cloudTexture(26),cloudTexture(95,true)],parents=[];
 for(const [parent,y,r,fuel,channel] of mounts){
  if(fuel!=='solid'&&fuel!=='kerolox')continue;
  const root=new T.Group();root.name='Particulate exhaust trail';parent.add(root);root.position.y=y;const particles=[];
  for(let i=0;i<9;i++){
   const mat=new T.MeshBasicMaterial({map:maps[fuel==='solid'?0:1],transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide});
   const m=new T.Mesh(plane,mat);m.renderOrder=2;m.castShadow=false;m.receiveShadow=false;root.add(m);particles.push(m);
  }
  parents.push({root,particles,r,fuel,channel});
 }
 const q=new T.Quaternion(),inv=new T.Quaternion();
 return {update(t,fx,on){
  for(const {root,particles,r,fuel,channel} of parents){
   root.visible=!!(on&&t>2&&fx[channel]>0);
   if(!root.visible)continue;
   for(let i=0;i<particles.length;i++){
    const p=particles[i],f=((t*.49+i/particles.length)%1),spread=r*(1.1+f*(fuel==='solid'?5.8:4.2));
    const distance=r*(3.1+f*(fuel==='solid'?68:49));
    p.position.set(r*.75*Math.sin(6*f+i)*f,-distance,r*.42*Math.cos(i)*f);
    p.scale.set(spread*2,spread*2.9,1);
    p.material.opacity=(fuel==='solid'?.77:.24)*Math.sin(Math.PI*f)**.68*clamp((t-2)/5)*clamp((fx.liftoffHeightM+3*r-distance)/(4*r));
   }
  }
 },faceClouds(camera){camera.getWorldQuaternion(q);for(const {root,particles} of parents){if(!root.visible)continue;root.getWorldQuaternion(inv).invert().multiply(q);for(const m of particles)m.quaternion.copy(inv);}}};
}
// Regional coastal scenery is illustrative. A single continuous georeferenced
// surface avoids intersecting flat water and land cards at the horizon.
function terrainMaterial(region){
 const dry=region==='texas'||region==='california',tropical=region==='guiana'||region==='hainan';
 const grass=dry?[123,135,102]:tropical?[69,101,75]:[91,119,91];
 const inverse=p=>{const k=Math.max(-.999,Math.min(.999,(p-.5)/.5));return 350*k/(1-Math.abs(k));};
 const map=generatedTexture(512,(out,i,u,v)=>{
  const x=inverse(u),z=inverse(v),coast=-400+145*Math.sin(x/415)+86*Math.sin(x/133+1.9)+73*Math.sin(x/642-.41);
  const broad=noise(x/75,z/58,47),patch=noise(x/17,z/28,85),grain=noise(x/4,z/7,15);
  const wet=clamp((coast-z)/19),sand=clamp(1-Math.abs(z-coast-14)/35);
  const marsh=clamp(.74*(.76-broad)+.43*(patch-.55));
  const shallow=clamp(1-(coast-z)/340);
  const haze=clamp((Math.hypot(x,z)-470)/3100)*.85;
  const field=[grass[0]+42*marsh,grass[1]+16*marsh,grass[2]+13*marsh],beach=[178,174,145],water=[69+14*shallow,108+30*shallow,127+20*shallow];
  const variation=.83+.22*broad+.15*patch+.06*grain;
  for(let k=0;k<3;k++){
   const land=(field[k]*(1-sand)+beach[k]*sand)*variation;
   const c=land*(1-wet)+water[k]*(.95+.08*broad+.026*grain)*wet;
   out[i+k]=c*(1-haze)+[167,185,190][k]*haze;
  }
  out[i+3]=255;
 });
 const m=new T.MeshBasicMaterial({map,toneMapped:false});m.userData.globeTexture=true;return m;
}
export function buildLaunchGround(site,{tower,coreMounts,baseR:r,baseY,allH:H,fleet,box,tube,mesh,cylinder,mat,steel,rib,dark,gold,black}){
 const deckY=baseY-r*.63-1,depth=site.exhaust==='split-trench'?Math.max(10,.15*H):Math.max(7,.10*H),grade=deckY-depth*.62;
 const w=Math.max(9,2.5*r+fleet.boosters*.38*r),length=site.exhaust==='split-trench'?4.8*w:3.8*w;
 const concrete=mat('#acaaa2',.10,.91),wall=mat('#989b98',.17,.87),burnt=mat('#494c4e',.14,.93),cool=mat('#aebfc0',.45,.6),pipe=mat('#b9ced1',.45),charcoal=mat('#4a5960',.46);
 const countryGround=terrainMaterial(site.terrain),asphalt=mat('#656d6e'),white=mat('#deded1'),signal=mat('#c68046'),mast=mat(site.tower==='catch'?'#4b575f':site.tower==='swing-arms'?'#b66857':'#849294');
 const g=(p,name)=>{const o=new T.Group();o.name=name;p.add(o);return o;};
 const land=g(tower,'Graded launch site'),civil=g(tower,'Launch table and exhaust works'),gantry=g(tower,'Pad service tower');
 const pad=(p,x,y,z,dx,dy,dz,m)=>box(p,x,y,z,dx,dy,dz,m,'pad');
 const shaft=(p,a,b,rad,m)=>tube(p,V(...a),V(...b),rad,m,'pad');
 const post=(p,x,z,bottom,h,rad,m)=>cylinder(p,x,bottom+h/2,z,rad,rad,h,m,'pad',14);
 const floorY=deckY-depth,channelStart=-(site.trenchOutlets>1?length:1.55*w),channelEnd=length;
 // The grade has a real incision. Retaining walls and a sloped center
 // deflector are visible below the launch table from the open exhaust mouths.
 function tile(x,z,dx,dz,height,material){
  const ground=material===countryGround,n=ground?80:32;
  const geom=new T.PlaneGeometry(dx,dz,Math.max(2,Math.min(n,Math.ceil(dx/14))),Math.max(2,Math.min(n,Math.ceil(dz/14))));
  if(ground){
   const pos=geom.attributes.position,uv=geom.attributes.uv,project=p=>.5+.5*p/(Math.abs(p)+350);
   for(let i=0;i<pos.count;i++){
    const xx=x+pos.getX(i),zz=z-pos.getY(i);uv.setXY(i,project(xx),1-project(zz));
    // Low topography beyond the pad, with the ocean side below the distant horizon.
    const inland=clamp((zz+220)/320),dist=clamp((Math.hypot(xx,zz)-110)/850);
    const hills=site.terrain==='california'?66:site.terrain==='hainan'?32:site.terrain==='guiana'?20:6;
    pos.setZ(i,hills*dist*inland*(noise(xx/243,zz/135,47)-.3));
   }
   geom.computeVertexNormals();
  }
  const o=mesh(land,geom,material,x,height,z,'pad');o.rotation.x=-Math.PI/2;return o;
 }
 // Subdivide the area nearest the camera separately, preserving the opening
 // in the launch apron and the same terrain UVs across all four boundaries.
 const near=235,far=4100;
 for(const s of [-1,1]){
  tile(0,s*(near+w)/2,2*near,near-w,grade,countryGround);
  tile(0,s*(far+near)/2,2*far,far-near,grade,countryGround);
  tile(s*(far+near)/2,0,far-near,2*near,grade,countryGround);
 }
 tile((-near+channelStart)/2,0,near+channelStart,w*2,grade,countryGround);
 tile((near+channelEnd)/2,0,near-channelEnd,2*w,grade,countryGround);
 tile(0,0,channelEnd-channelStart,2*w,floorY-.1,burnt).position.x=(channelEnd+channelStart)/2;
 for(const s of [-1,1]){
  tile(0,s*(w+16),2*(length+29),32,grade+.18,concrete);
  pad(civil,(channelEnd+channelStart)/2,(floorY+grade)/2,s*(w+.52),channelEnd-channelStart,grade-floorY+1,1.04,wall);
  pad(civil,0,(floorY+deckY)/2,s*(w+1.5),2.55*w,depth,3,wall);
  pad(civil,0,deckY-.36,s*(w+1.15),3.1*w,.72,3.7,cool);
  shaft(civil,[channelStart+1,grade+.6,s*(w+1.2)],[channelEnd-1,grade+.6,s*(w+1.2)],.26,pipe);
 }
 // Elevated mount bears on piers around an open aperture. A low ridge of
 // water-cooled inclined steel beneath the engine plane turns exhaust sideways.
 const outlets=site.trenchOutlets===2?[-1,1]:[1];
 for(const sign of outlets){
  let prev=[0,deckY-1.8];
  for(const [a,fall] of [[.25,.12],[.60,.48],[1,.80],[1.5,.95]]){
   const next=[a*w,deckY-1.8-(depth-2.5)*fall],dx=next[0]-prev[0],dy=next[1]-prev[1];
   const q=pad(civil,sign*(next[0]+prev[0])*.5,(next[1]+prev[1])*.5,0,Math.hypot(dx,dy),.45,w*1.76,burnt);
   q.rotation.z=Math.atan2(dy,dx)*sign;prev=next;
  }
 }
 if(site.exhaust==='duct-trench'){
  for(const s of outlets)pad(civil,s*length*.66,grade+.95,0,length*.39,1.65,w*2.2,concrete);
 }
 // Pad service equipment. Its widths and offsets are illustrative. Families
 // preserve each site's support concept and mast/vehicle relationship.
 const mastX=-w*(site.tower==='catch'?1.22:1.35),mastZ=-w*.88,top=H*(site.tower==='strongback'?.84:1.04);
 const span=Math.max(3,site.tower==='catch'?H*.103:site.tower==='swing-arms'?H*.19:H*.074);
 const darkWing=site.tower==='catch',gantryColor=darkWing?charcoal:mast;
 for(const x of [-1,1])for(const z of [-1,1])pad(gantry,mastX+x*span/2,grade+top/2,mastZ+z*span/2,span*.135,top,span*.135,gantryColor);
 const levels=darkWing?11:8;
 for(let i=0;i<levels;i++){
  const y=grade+i*top/levels;pad(gantry,mastX,y,mastZ,span*1.05,span*.11,span*1.07,gantryColor);
  for(const s of [-1,1]){
   shaft(gantry,[mastX-s*span*.46,y,mastZ+span*.45],[mastX+s*span*.46,y+top/levels,mastZ+span*.45],span*.048,gantryColor);
   shaft(gantry,[mastX+span*.45,y,mastZ-s*span*.46],[mastX+span*.45,y+top/levels,mastZ+s*span*.46],span*.048,gantryColor);
  }
 }
 const swing=[];
 function arm(y,z,xEnd,thickness,m){
  const pivot=g(gantry,'Retractable service arm');pivot.position.set(mastX,y,z);const len=xEnd-mastX;
  pad(pivot,len/2,0,0,len,thickness,thickness*1.3,m);shaft(pivot,[0,-1.3*thickness,0],[len,0,0],thickness*.21,m);swing.push(pivot);return pivot;
 }
 if(darkWing){
  // Twin chopsticks straddle the booster when parked; a separate QD arm
  // reaches the ship. The main tower has an enclosed crown and a guide rail.
  pad(gantry,mastX,grade+top+span*.22,mastZ,span*1.04,span*.5,span*1.04,charcoal);
  for(const z of [-1,1]){const yy=baseY+H*.30;shaft(gantry,[mastX,yy,mastZ],[mastX+.4*w,yy,z*r*1.75],span*.13,charcoal);arm(yy,z*r*1.75,r*1.55,span*.24,charcoal);}
  arm(baseY+H*.65,mastZ*.63,-r,span*.17,steel);
 }else if(site.tower==='swing-arms'){
  for(const portion of [.23,.44,.66,.81])arm(baseY+H*portion,mastZ*.73,-r*.89,span*.25,mast);
  pad(gantry,mastX,grade+top*.9,mastZ,span*1.65,top*.1,span*1.35,white);
 }else if(site.tower==='mobile-gantry'){
  arm(baseY+H*.62,mastZ*.56,-r*.8,span*.17,signal);arm(baseY+H*.26,mastZ*.56,-r*.8,span*.15,signal);
  // Mobile building shown withdrawn for flight, beyond the launch apron.
  const p=g(land,'Retracted mobile service building');p.position.set(H*.89,grade,-H*.94);
  for(const s of [-1,1])pad(p,s*H*.17,H*.50,0,H*.105,H,H*.49,white);
  pad(p,0,H*.96,0,H*.43,H*.13,H*.50,white);pad(p,0,H*.53,-H*.23,H*.40,H*.98,H*.04,steel);
 }else{
  for(const portion of (site.tower==='strongback'?[.23,.65]:[.26,.59,.77]))arm(baseY+H*portion,mastZ*.65,-r*.93,span*.19,steel);
  if(site.tower==='fixed-service')pad(gantry,mastX,grade+top*.75,mastZ,span*1.4,top*.40,span*1.35,charcoal);
 }
 // The lift-off table transfers each aft-skirt interface to the concrete
 // trench walls. Its pierced steel deck has a separate open exhaust passage
 // under every core. Falcon has three Octaweb exit clusters on this table.
 const table=g(civil,'Launcher bearing table'),falc=fleet.family==='Falcon Heavy',star=fleet.family==='Starship';
 const deckT=Math.max(.45,r*.23),ax=Math.max(...coreMounts.map(k=>Math.abs(k.x)+k.r))+r*.66,az=Math.max(...coreMounts.map(k=>Math.abs(k.z)+k.r))+r*.60;
 const shape=new T.Shape();shape.moveTo(-ax,-az);shape.lineTo(ax,-az);shape.lineTo(ax,az);shape.lineTo(-ax,az);shape.closePath();
 for(const c of coreMounts){const hole=new T.Path();
  for(let j=0;j<48;j++){const a=-2*Math.PI*j/48,xx=c.x+.99*c.r*Math.cos(a),yy=-c.z+.99*c.r*Math.sin(a);if(j)hole.lineTo(xx,yy);else hole.moveTo(xx,yy);}
  hole.closePath();shape.holes.push(hole);}
 const plate=new T.ExtrudeGeometry(shape,{depth:deckT,bevelEnabled:false,curveSegments:24});plate.rotateX(-Math.PI/2);
 const deck=mesh(table,plate,charcoal,0,deckY-deckT,0,'pad');deck.name='Pierced exhaust deck';deck.userData.apertures=coreMounts.map(k=>({x:k.x,z:k.z,r:k.r*.99}));
 for(const side of [-1,1]){
  const gx=side*(ax-r*.27);
  pad(table,gx,deckY-deckT-r*.16,0,r*.51,r*.36,2*w+4,steel);
  for(const sz of [-1,1]){
   const zz=sz*(w+1.5),top=deckY-deckT,hh=top-floorY;
   pad(table,gx,floorY+hh*.5,zz,r*.9,hh,r*.94,wall);
   pad(table,gx,top-r*.17,zz,r*1.12,r*.36,r*1.16,steel);
  }
 }
 const restraints=[];
 for(const [i,c] of coreMounts.entries()){
  const size=c.r,clear=c.r*.995;
  // Bearing stations on the Falcon's front/rear skirt quadrants give all
  // three cores a visible path to the trench structure without crossing a bell.
  const angles=falc?[-.48,.48,Math.PI-.48,Math.PI+.48]:i===0?
   Array.from({length:star?12:4},(_,j)=>(j+.5)*2*Math.PI/(star?12:4)):
   [-.40,.40].map(delta=>Math.atan2(c.x,c.z)+delta);
  for(const angle of angles){
   const dx=Math.sin(angle),dz=Math.cos(angle);
   const lugY=star?.59:.22*size,location=g(c.part,'Aft skirt bearing lug');location.position.set(dx*(clear+.04*size),c.localBase+lugY,dz*(clear+.04*size));location.rotation.y=angle;
   const lug=box(location,0,0,0,size*.30,.14*size,.17*size,dark);lug.name='Vehicle hold-down lug';
   const bearing=g(table,'Launch restraint');bearing.position.set(c.x+dx*clear,deckY,c.z+dz*clear);bearing.rotation.y=angle;
   const seatHeight=baseY+lugY-.07*size-deckY;pad(bearing,0,seatHeight*.50,.115*size,.4*size,seatHeight,.22*size,charcoal);
   pad(bearing,0,seatHeight-.055*size,.085*size,.41*size,.11*size,.18*size,cool).name='Skirt bearing seat';
   pad(bearing,0,.07*size,.20*size,.52*size,.14*size,.42*size,steel);
   const pivot=g(bearing,'Hydraulic release jaw');pivot.position.set(0,seatHeight*.47,.32*size);
   const armH=seatHeight*.53+.14*size;
   shaft(pivot,[0,0,0],[0,armH,-.12*size],.086*size,steel);
   const toe=pad(pivot,0,armH+.055*size,-.17*size,.26*size,.11*size,.25*size,rib);toe.name='Jaw over lug';
   const pins=post(bearing,0,.32*size,seatHeight*.47-.22*size,.44*size,.105*size,gold);pins.rotation.z=Math.PI/2;
   pivot.userData.contactY=baseY+lugY+.07*size;restraints.push(pivot);
  }
 }
 // Cryogenic tank farm with spherical heads and a service road.
 tile(-95,42,180,7,grade+.19,asphalt);
 for(let j=0;j<5;j++){const radius=3.6+j%2*.7,hh=radius*(2+j%3*.7),x=(j-2)*12+H*.30,z=-H*.92;
  post(land,x,z,grade-2,2.25,radius*1.12,wall);post(land,x,z,grade+.18,hh,radius,white);const dome=mesh(land,new T.SphereGeometry(1,16,10),white,x,grade+hh,z,'pad');dome.scale.set(radius,radius*.60,radius);
  shaft(land,[x,grade+.7,z],[x,grade+.7,z+.22*H],.23,pipe);}
 const waterTower=site.water!=='none'&&['guiana','florida'].includes(site.terrain);
 if(waterTower){const x=H*.94,z=-H*1.8,ht=site.terrain==='guiana'?90:H*.59;
  post(land,x,z,grade-2,2.26,ht*.079,wall);post(land,x,z,grade+.19,ht,ht*.035,white);const tank=mesh(land,new T.SphereGeometry(1,20,14),white,x,grade+ht*.94,z,'pad');tank.scale.set(ht*.125,ht*.105,ht*.125);}
 // Lightning protection masts and cable stays are visually separate from the stack.
 for(const [xx,zz] of [[-1.3,-1.05],[1.25,-1.11]]){
  const x=xx*H,z=zz*H,ht=H*.77;post(land,x,z,grade,ht,.47,white);post(land,x,z,grade+ht,ht*.17,.19,signal);
  shaft(land,[x,grade+ht*.78,z],[x+H*.21,grade,z+H*.14],.09,steel);
 }
 const sprays=g(tower,'Water curtain'),jetMat=new T.MeshBasicMaterial({color:'#b4e1e7',transparent:true,opacity:.66,depthWrite:false});
 for(const sgn of [-1,1])for(let i=0;i<8;i++){
  const x=(i-3.5)*w*.32,z=sgn*w*1.08,y=grade+.79;
  post(civil,x,z,grade,.77,.20,cool);
  let origin=[x,y,z];
  for(let step=1;step<=4;step++){
   const f=step/4,target=[x+.12*w*f,y+1.3*w*f-2.15*w*f*f,z-sgn*w*.85*f];
   shaft(sprays,origin,target,.078+.13*f,jetMat);origin=target;
  }
 }
 const clouds=g(tower,'Pad water and exhaust effluent'),mist=[];
 const puffGeom=new T.PlaneGeometry(1,1),cloudMaps=[cloudTexture(3),cloudTexture(176),cloudTexture(42,true)];
 for(let i=0;i<40;i++){
  const m=new T.MeshBasicMaterial({map:cloudMaps[i%3===2&&fleet.boosters>0?2:i%2],transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false});
  const o=mesh(clouds,puffGeom,m,0,grade,0,'pad');o.renderOrder=2;o.castShadow=false;o.receiveShadow=false;o.name='Steam and entrained exhaust';mist.push(o);
 }
 // Fixed pool with analytic particle age: replay or an arbitrary seek reconstructs identical parcels.
 function update(t,fx,enabled){
  const release=enabled?clamp(t/.45):0;for(const jaw of restraints)jaw.rotation.x=.97*release*release*(3-2*release);
  const deploy=clamp((t+1)/5);
  for(const a of swing)a.rotation.y=(darkWing?-.18:-.58)*deploy;
  sprays.visible=enabled&&fx.water>.001;jetMat.opacity=.68*fx.water;
  clouds.visible=enabled&&fx.water>.001;
  if(!clouds.visible)return;
  const first=fx.steam>.012?1:0,split=outlets.length===2;
  for(let i=0;i<mist.length;i++){
   const p=mist[i],dir=split?outlets[i%2]:1,rand=noise(i+.32,2.4,17),life=5+rand*4;
   const elapsed=t-(first?fx.engineStart:fx.waterStart),age=(elapsed+(i*.381966%1)*life)%life;
   const f=age/life;p.visible=elapsed>0&&age>=0&&age<=elapsed;if(!p.visible)continue;
   const power=first?fx.steam:fx.water*.24,k=first?1:.38;
   const near=i%4===0,origin=near?.74*w:Math.max(1.5*w,length*.76);
   // Keep a thick rolling head at the mouth while older parcels drift and rise.
   const anchored=i%5<2,travel=w*(anchored?.35:.79)*(1+rand*.48)*age*k;
   const z=(rand-.5)*w*2.3+(noise(i,f,12)-.5)*travel*.30;
   const rise=k*(anchored?.55:.97)*(1.8+rand)*age**1.31+w*.22;
   p.position.set(dir*(origin+travel)+age*age*.085,grade+rise,z);
   const size=w*(first?2.7+f*5.5:1.6+f*2.2)*k*(.87+rand*.45)*clamp(.56+elapsed*.24);
   p.scale.set(size*(1.14+.38*rand),size*(1.0+.18*rand),1);
   p.material.opacity=clamp(power*(.87+.1*(1-f))*(1-f**3)*clamp(age*4));

  }
 }
 return {update,faceClouds(camera){if(!tower.visible||!clouds.visible)return;const q=camera.getWorldQuaternion(new T.Quaternion());for(const p of mist)if(p.visible)p.quaternion.copy(q);},clouds,site};
}
