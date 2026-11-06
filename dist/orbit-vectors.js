// All three directions originate at the spacecraft, in Earth-centred inertial axes.
// A finite display length keeps unit directions readable at spacecraft and planetary scales.
import * as T from './vendor/three.module.js';
import {R} from './orbit.js';

const axes={velocity:'#68d8f0',sun:'#ffc671',station:'#c5a9ff'};
const valid=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
const rotateFrom=new T.Vector3(0,1,0);
export function orbitVectorsAvailable(view,s){
 if(!s||s.t<540||!(s.altitudeKm>0)||s.referenceBody||s.orbitLost||!valid(s.velocityECI)||!valid(s.sunECI))return false;
 if(view==='launch')return ['insertion','commissioning','deorbit','infeasible'].includes(s.flightPhase);
 return ['spacecraft','orbit','core'].includes(view);
}
export function orbitVectorReadings(s){
 const out=[];
 function add(id,label,value,a){
  if(!valid(a))return;
  const n=Math.hypot(...a);
  if(n>0)out.push({id,label,value,color:axes[id],directionECI:a.map(x=>x/n)});
 }
 if(valid(s?.velocityECI))add('velocity','Velocity',Math.hypot(...s.velocityECI).toFixed(2)+' km/s',s.velocityECI);
 if(valid(s?.sunECI))add('sun','To Sun',s.eclipse?'Earth shadow':'Sunlit',s.sunECI);
 if(s?.station&&valid(s.stationECI)&&valid(s.positionECI)){
  const ray=s.stationECI.map((n,i)=>n-s.positionECI[i]);
  add('station','To '+s.station,Math.round(Math.hypot(...ray)).toLocaleString('en-US')+' km',ray);
 }
 return out;
}

// The navigation overlay is drawn over the close-up hardware; the globe occludes
// vectors in Earth Orbit. Tip radius and shaft width follow the on-screen scale.
export function createOrbitVectors(){
 const group=new T.Group(),shaft=new T.CylinderGeometry(1,1,1,8),tip=new T.ConeGeometry(1,1,12);
 shaft.translate(0,.5,0);tip.translate(0,-.5,0);
 const nodes=new Map();
 for(const [id,color] of Object.entries(axes)){
  const node=new T.Group(),material=new T.MeshBasicMaterial({color,toneMapped:false,transparent:true,depthWrite:false});
  const body=new T.Mesh(shaft,material),head=new T.Mesh(tip,material);
  node.name='Navigation vector · '+id;node.add(body,head);group.add(node);nodes.set(id,{node,material,body,head});
 }
 const tips=[];
 function update(readings,origin,toScene,halfHeight,viewportHeight,globe,rangeKm){
  tips.length=0;group.visible=readings.length>0;if(!group.visible)return tips;
  group.position.copy(origin);
  const px=2*halfHeight/viewportHeight;
  for(const {node} of nodes.values())node.visible=false;
  for(const r of readings){
   const {node,material,body,head}=nodes.get(r.id),direction=toScene(r.directionECI);
   let extent=globe&&r.id==='station'?rangeKm/R:halfHeight*(globe?.32:.58);
   if(globe&&r.id!=='station'){
    // An eclipse arrow points into Earth's shadowing disc. Fit its tip into
    // the real space between the vehicle and the limb so it remains legible.
    const towardCenter=-origin.dot(direction),discriminant=towardCenter**2-origin.lengthSq()+1;
    if(towardCenter>0&&discriminant>=0){
     const hit=towardCenter-Math.sqrt(discriminant);
     if(hit>0)extent=Math.min(extent,.95*hit);
    }
   }
   if(!(extent>0))continue;
   const headLength=Math.min(extent*.30,px*10);
   node.visible=true;node.quaternion.setFromUnitVectors(rotateFrom,direction);
   material.depthTest=globe;body.renderOrder=head.renderOrder=globe?3:100;
   // Start at the rim of the spacecraft locator on the overview. In a
   // close-up all reference arrows share the vehicle origin itself.
   const start=globe?Math.min(Math.max(.024,px*3),extent*.32):0;
   body.position.y=start;
   body.scale.set(px*.95,extent-headLength-start,px*.95);
   head.position.y=extent;head.scale.set(headLength*.42,headLength,headLength*.42);
   tips.push({id:r.id,color:r.color,point:origin.clone().addScaledVector(direction,extent)});
  }
  return tips;
 }
 return {group,update,destroy(){
  shaft.dispose();tip.dispose();for(const {material} of nodes.values())material.dispose();group.clear();
 }};
}

// The overview camera is orthographic. A unit Earth sphere blocks distant
// markers even on rays passing just beyond the observer-side hemisphere.
export function behindGlobe(point,towardEye){
 const z=point.dot(towardEye);
 const b2=point.lengthSq()-z*z;
 return b2<1&&z+2e-3<Math.sqrt(Math.max(0,1-b2));
}
