// RF wavefronts and laser packet tracers are slowed to inspection speed. Geometry
// is static; each frame moves/scales a small pool shared by the two renderers.
import * as T from './vendor/three.module.js';
import {terminalPattern} from './terminal-activity.js';
import {eciScene} from './flight-frame.js';
import {R} from './orbit.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),up=V(0,1,0),tau=2*Math.PI;
const colors={'S-band':0x68e8c8,Ka:0xffc477,Optical:0xc8b8ff};
function ringGeometry(){
 return new T.BufferGeometry().setFromPoints(Array.from({length:49},(_,i)=>V(Math.cos(i*tau/48),0,Math.sin(i*tau/48))));
}
function capGeometry(){
 const vertices=[],spherical=(theta,phi)=>V(Math.sin(theta)*Math.cos(phi),Math.cos(theta),Math.sin(theta)*Math.sin(phi));
 // The front is limited to the exposed half-space. The 40° contour is
 // the S-band pattern's nominal half-power angle; gain falls toward the limb.
 for(const deg of [40,68,87])for(let i=0;i<48;i++)
  vertices.push(spherical(deg*Math.PI/180,i*tau/48),spherical(deg*Math.PI/180,(i+1)*tau/48));
 for(let j=0;j<6;j++)for(let i=0;i<12;i++)
  vertices.push(spherical(i*Math.PI/24,j*tau/6),spherical((i+1)*Math.PI/24,j*tau/6));
 return new T.BufferGeometry().setFromPoints(vertices);
}
export function createTerminalWaves(){
 const group=new T.Group(),streams=new Map(),materials=[],geometries=[];
 group.name='Direct terminal traffic';group.visible=false;
 const ring=ringGeometry(),cap=capGeometry(),line=new T.BufferGeometry().setFromPoints([V(),V(0,1,0)]);
 const dart=new T.ConeGeometry(1,1,10),flash=new T.CylinderGeometry(.74,1,1,8);
 geometries.push(ring,cap,line,dart,flash);
 const vec=V(),target=V(),origin=V(),axis=V(),q=new T.Quaternion();
 function stream(terminal,direction,globe){
  const key=[terminal,direction,globe].join('/');if(streams.has(key))return streams.get(key);
  const sband=terminal==='S-band',optical=terminal==='Optical',tx=direction==='tx';
  const color=sband&&!tx?0xbfffee:colors[terminal];
  function material(kind,alpha){
   const m=new kind({color,transparent:true,opacity:alpha,depthWrite:false,toneMapped:false});materials.push(m);return m;
  }
  const faint=material(T.LineBasicMaterial,.29),lit=material(T.LineBasicMaterial,.91),bright=material(T.MeshBasicMaterial,.94);
  const afterglow=optical?material(T.LineBasicMaterial,.47):null;
  const node=new T.Group(),route=new T.Group(),pattern=new T.Group();
  node.name=(tx?'Transmit':'Receive')+' · '+terminal;node.userData={terminal,direction,globe,sceneFlow:true};
  node.add(route,pattern);group.add(node);
  const ray=new T.Line(line,faint);route.add(ray);
  const base=!globe&&!sband?new T.Line(ring,faint):null;if(base)pattern.add(base);
  // The Ka outline starts at the reflector rim and opens at half of the
  // link budget's full HPBW. Use four generators rather than an opaque cone.
  const edges=[];
  if(!globe&&!sband)for(let i=0;i<(optical?2:4);i++){const edge=new T.Line(line,faint);edges.push(edge);pattern.add(edge);}
  const shell=!globe&&sband&&!tx?new T.LineSegments(cap,material(T.LineBasicMaterial,.28)):null;
  if(shell)pattern.add(shell);
  const pulses=Array.from({length:sband&&!globe?2:3},()=>{
   const front=globe||optical?null:sband&&tx?new T.LineSegments(cap,lit):new T.Line(ring,lit);
   if(front)(tx?pattern:route).add(front);
   const head=new T.Mesh(optical?flash:dart,bright);
   head.rotation.z=tx?0:Math.PI;route.add(head);
   const tail=optical?new T.Line(line,afterglow):null;
   if(tail)route.add(tail);
   return {front,head,tail};
  });
  node.traverse(o=>{o.renderOrder=6});
  const item={node,route,pattern,ray,edges,shell,base,pulses};streams.set(key,item);return item;
 }
 function relayIndicator(transfer,craft,pixel,clock,cameraQ){
  // No relay ephemeris: show a screen-facing activity lamp at the aperture.
  // The semicircles expand/contract in the indicator plane, never along a ray.
  const tx=transfer.direction==='tx',key='relay/'+transfer.direction;
  let item=streams.get(key);
  if(!item){
   const node=new T.Group(),side=tx?1:-1;
   const arc=new T.BufferGeometry().setFromPoints(Array.from({length:33},(_,i)=>{
    const a=(i/32-.5)*Math.PI*.85;return V(side*Math.cos(a),Math.sin(a),0);
   }));
   const m=new T.LineBasicMaterial({color:colors.Optical,toneMapped:false,transparent:true,opacity:.92,depthWrite:false});
   const cm=new T.MeshBasicMaterial({color:tx?colors.Optical:0xe5ddff,toneMapped:false,transparent:true,opacity:.95,depthWrite:false});
   geometries.push(arc);materials.push(m,cm);const wave=new T.Line(arc,m),arrow=new T.Mesh(dart,cm);
   arrow.rotation.z=-Math.PI/2;node.add(wave,arrow);
   node.name='Optical relay activity · '+transfer.direction;node.userData={terminal:'Optical',direction:transfer.direction,globe:false,relay:true};
   node.traverse(o=>o.renderOrder=7);group.add(node);
   item={node,wave,arrow,side};streams.set(key,item);
  }
  const {node,wave,arrow,side}=item;group.visible=node.visible=true;
  craft.apertures.Optical.getWorldPosition(node.position);
  if(cameraQ)node.quaternion.copy(cameraQ);
  const p=((clock*.38)%1+1)%1,r=(tx?p:1-p)*.50+.5;
  const size=Math.max(pixel*9,craft.bw*.05);
  wave.scale.setScalar(size*r);arrow.scale.set(size*.16,size*.38,size*.16);
  arrow.position.x=side*size*r;
 }
 function update(h,s,craft,globe,visible,pixel,clock,cameraQ){
  group.visible=false;for(const item of streams.values())item.node.visible=false;
  if(!visible||!s.terminalActivity?.length)return;
  if(!globe)for(const f of s.terminalActivity)if(f.route==='relay'&&f.terminal==='Optical'&&f.mbps>0)relayIndicator(f,craft,pixel,clock,cameraQ);
  if(!s.station||!s.positionECI||!s.stationECI)return;
  const dir=s.stationDirectionBody;
  if(!dir&&!globe)return;
  const side=dir?.[0]>=0?1:0;
  if(globe)target.copy(eciScene(s.stationECI,1/R));
  else{target.fromArray(dir).normalize().multiplyScalar(s.rangeKm*1000);craft.root.localToWorld(target);}
  for(const transfer of s.terminalActivity){
   const {terminal,direction,route:kind,peer,mbps}=transfer;
   if(kind!=='direct'||peer!==s.station||!(mbps>0)||!Object.hasOwn(colors,terminal))continue;
   const tx=direction==='tx',sband=terminal==='S-band',optical=terminal==='Optical';
   const item=stream(terminal,direction,globe),{node,route,pattern,ray,edges,base,shell,pulses}=item;
   const model=terminalPattern(h.input,terminal);
   if(globe)origin.copy(eciScene(s.positionECI,1/R));
   else{
    const aperture=sband?craft.apertures.patches[side]:craft.apertures[terminal];
    aperture.getWorldPosition(origin);pattern.quaternion.copy(aperture.getWorldQuaternion(q));
   }
   axis.copy(target).sub(origin);
   const range=axis.length();if(!range)continue;
   group.visible=node.visible=true;node.position.copy(origin);
   route.quaternion.setFromUnitVectors(up,axis.divideScalar(range));
   const extent=globe?range:Math.min(range,Math.max(h.bodyLengthM*.93,h.bodyWidthM*2.4));
   const waveRadius=Math.min(extent*.48,h.bodyWidthM*.86);
   const mouth=model.apertureM*.5,slope=Math.tan(model.fullWidthRad*.5);
   ray.scale.y=extent;
   if(base)base.scale.setScalar(mouth);
   if(shell){
    shell.visible=!s.terminalActivity.some(f=>f.route==='direct'&&f.terminal==='S-band'&&f.direction==='tx');
    shell.scale.setScalar(waveRadius*.9);
   }
   for(let i=0;i<edges.length;i++){
    const a=tau*i/edges.length,x=Math.cos(a),z=Math.sin(a),edge=edges[i];
    edge.position.set(x*mouth,0,z*mouth);
    vec.set(slope*x,1,slope*z);edge.scale.y=extent*vec.length();edge.quaternion.setFromUnitVectors(up,vec.normalize());
   }
   const glyph=Math.min(extent*.048,Math.max(pixel*2.8,globe?0:Math.min(.11,h.bodyWidthM*.045)));
   for(let i=0;i<pulses.length;i++){
    const p=((clock*(sband?.24:optical?.38:.29)+i/pulses.length+(tx?.08:.27))%1+1)%1;
    const fraction=tx?p:1-p,{front,head,tail}=pulses[i],distance=extent*fraction;
    if(optical){
     const width=Math.min(extent*.01,pixel*.7),room=tx?distance:extent-distance;
     const length=Math.min(pixel*7,extent*.07,room),trail=Math.min(pixel*13,extent*.14,room-length);
     const sign=tx?1:-1;
     head.scale.set(width,length,width);head.position.y=distance-sign*length*.5;
     tail.position.y=distance-sign*(length+trail);tail.scale.y=sign*trail;
    }else{
     head.position.y=distance;head.scale.set(glyph,glyph*2.8,glyph);
    }
    if(!front)continue;
    if(sband&&tx)front.scale.setScalar(Math.max(.018,waveRadius*p));
    else{
     // At reception the distant wave is almost planar across the spacecraft.
     // Rings approach on the actual incoming ray and terminate at the patch.
     const radius=sband?Math.max(pixel*3,h.bodyWidthM*.18):mouth+distance*slope;
     front.position.y=distance;front.scale.setScalar(radius);
    }
   }
  }
 }
 return {group,update,destroy(){group.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());streams.clear();}};
}
