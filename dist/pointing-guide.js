// Inspection geometry uses the encoders already applied to the Three.js model.
// All coordinates below are body metres. Optical effects and control remain independent.
import * as T from './vendor/three.module.js';
const V=(...a)=>new T.Vector3(...a),Y=V(0,1,0),D=180/Math.PI;
const colors={sun:'#f0b665',pv:'#8ce8ba',upper:'#84cfff',lower:'#beb2ff',target:'#f1bc7f',beam:'#85ebcb',thrust:'#8be8c5',exhaust:'#f0ac76'};
export function pointingViewAllowed(view,s,directCraft=false){
 return !!(s?.bodyXECI&&s.sunECI&&!s.referenceBody&&s.altitudeKm>0&&s.t>=540&&
  (view==='spacecraft'||view==='launch'&&directCraft));
}
export function pointingGeometry(craft,h,s,focus='',selected='',loop='executive'){
 const vectors=[],labels=[],{root}=craft;
 root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert();
 const pos=o=>o.getWorldPosition(V()).applyMatrix4(inverse);
 const normal=o=>Y.clone().transformDirection(o.matrixWorld).transformDirection(inverse);
 const vec=(at,direction,length,color,dashed=false)=>vectors.push({at,direction,length,color,dashed});
 const mark=(id,at,title,value,detail,color,side)=>labels.push({anchor:id,bodyPoint:at.toArray(),title,value,detail,color,side});
 const sun=V(...s.sunECI),sunB=V(...[s.bodyXECI,s.bodyUpECI,s.bodyZECI].map(a=>sun.dot(V(...a)))).normalize();
 const span=Math.max(h.bodyWidthM*.8,Math.min(craft.wingspan*.19,craft.spanZ*.34));
 const explicit=focus==='software'&&loop!=='executive';
 const inspectTerminal=explicit?loop==='terminal':selected==='communications'||!selected&&(focus==='comm'||focus==='data'||s.station&&s.attitudeMode==='contact'&&!['power','thermal','environment'].includes(focus));
 const inspectThrust=explicit?loop==='body':selected==='propulsion'||!selected&&(focus==='prop'||['prepoint','trim','reboost','disposal'].includes(s.attitudeMode)&&!['power','thermal','environment'].includes(focus));
 if(inspectThrust){
  const e=h.propulsion.engines,base=V((e[0].x+e[1].x)/2,e[0].y,e[0].z);
  const forward=V(base.x,base.y,h.bodyLengthM*.53);
  vec(forward,V(0,0,1),span,colors.thrust);vec(base,V(0,0,-1),span,colors.exhaust,!s.burn);
  let error=s.burnAxisErrorDeg;
  if(s.bodyReferenceQ&&s.bodyAttitudeQ){
   const q=new T.Quaternion().fromArray(s.bodyAttitudeQ).invert().multiply(new T.Quaternion().fromArray(s.bodyReferenceQ));
   const command=V(0,0,1).applyQuaternion(q);
   vec(forward,command,span*1.45,colors.target,true);
   if(!Number.isFinite(error))error=D*Math.acos(T.MathUtils.clamp(command.z,-1,1));
  }
  mark('thrust-axis',forward,'Thrust axis · +Z',Number.isFinite(error)?error.toFixed(2)+'° from target':'Axial engine pair','Solid shows body +Z. Gold dashes show commanded +Z.',colors.thrust,'right');
  mark('exhaust-axis',base,'Exhaust axis · −Z',s.burn?'Engines firing':'Engines idle',s.burn?'Gas leaves through the aft bells.':'Dashed arrow shows the exhaust direction.',colors.exhaust,'left');
 }else if(inspectTerminal){
  if(s.groundLink==='S-band'&&s.station){
   const at=pos(craft.patches[s.stationDirectionBody?.[0]>0?1:0]);
   if(s.stationDirectionBody)vec(at,V(...s.stationDirectionBody),1.25*span,colors.target,true);
   mark('patch-sight',at,'S-band patch',s.station,'The fixed patch uses its broad field of view.',colors.target,'right');
  }else{
   const optical=s.groundLink==='Optical',terminal=optical?craft.optic:craft.dish,at=pos(terminal);
   const los=s.stationDirectionBody&&V(...s.stationDirectionBody);
   vec(at,normal(terminal),span,colors.beam);
   if(los)vec(at,los,1.44*span,colors.target,true);
   const error=los?D*Math.acos(T.MathUtils.clamp(normal(terminal).dot(los),-1,1)):null;
   mark('terminal-boresight',at,(optical?'Optical':'Ka-band')+' boresight',error!=null?error.toFixed(2)+'° from '+s.station:'Parked · no station in view',los?'Solid shows the measured axis. Dashes lead toward the receiver.':'The head points along its measured gimbal axis.',colors.beam,'right');
  }
 }else{
  // One of four common-drive wings suffices; both radiator banks are independent.
  const panels=craft.panels.filter(({descriptor:d,surface})=>d.type==='pv'?d.side===1&&d.end===1&&surface.visible:d.j===0);
  for(const {descriptor:d,surface} of panels){
   const pv=d.type==='pv',upper=d.end<0;
   if(!pv&&!(upper?s.upperRadiatorFlow:s.lowerRadiatorFlow))continue;
   const at=pos(surface),n=normal(surface),dot=T.MathUtils.clamp(n.dot(sunB),-1,1);
   const id=pv?'solar':upper?'upper':'lower',color=pv?colors.pv:colors[id];
   vec(at,n,span*(pv?.69:.54),color);
   if(!pv)vec(at,n.clone().negate(),span*.54,color);
   if(!s.eclipse){
    // Put the ray beside the normal when they coincide. In grazing light its
    // end clears the panel skin so a tangent ray stays visible above the face.
    const along=V(0,0,1).transformDirection(surface.matrixWorld).transformDirection(inverse);
    const near=at.clone().addScaledVector(along,Math.min(d.depth*.24,span*.18)).addScaledVector(n,(dot<0?-1:1)*(d.thickness*.5+.012));
    vec(near.addScaledVector(sunB,span),sunB.clone().negate(),span,colors.sun,true);
   }
   const incidence=pv?Math.max(0,dot):Math.abs(dot);
   const value=s.eclipse?'Eclipse · no direct sunlight':pv?(D*Math.acos(dot)).toFixed(1)+'° off cell normal':(D*Math.acos(incidence)).toFixed(1)+'° to face normal';
   const sideNote=pv?'Solar cell face':dot>=0?'Face A':'Face B';
   const detail=s.eclipse?'Solid arrows mark the surface normals.':(incidence<.001&&!pv?'Edge-on':sideNote)+' · '+Math.round(100*incidence)+'% of face-on sunlight';
   mark('guide-'+id,at,pv?'Solar wing · cell side':(upper?'Upper':'Lower')+' radiator · two faces',value,detail,color,pv?'left':'right');
  }
 }
 return {vectors,labels};
}
export function createPointingGuide(){
 const group=new T.Group(),nodes=[];
 const head=new T.ConeGeometry(.063,.16,12),shaft=new T.CylinderGeometry(.016,.016,.90,8);
 shaft.translate(0,.45,0);
 // A solid silhouette keeps the arrows legible on the bright Earth limb in
 // both renderers. Broken rays identify references even without color.
 const profile=[];
 for(let i=0;i<6;i++){
  const y=i*.15;
  profile.push(new T.Vector2(0,y),new T.Vector2(.016,y),new T.Vector2(.016,y+.096),new T.Vector2(0,y+.096));
 }
 const dash=new T.LatheGeometry(profile,8);
 const materials=new Map();
 const material=color=>{
  if(!materials.has(color))materials.set(color,new T.MeshBasicMaterial({color,toneMapped:false}));
  return materials.get(color);
 };
 function update(vectors){
  for(let i=0;i<Math.max(nodes.length,vectors.length);i++){
   const v=vectors[i];if(!v){nodes[i].visible=false;continue;}
   const m=material(v.color);let g=nodes[i];
   if(!g){g=new T.Group();const line=new T.Mesh(shaft,m),tip=new T.Mesh(head,m);tip.position.y=.92;g.add(line,tip);nodes.push(g);group.add(g);}
   g.visible=true;g.position.copy(v.at);g.quaternion.setFromUnitVectors(Y,v.direction);
   g.scale.setScalar(v.length);g.children[0].geometry=v.dashed?dash:shaft;g.children[0].material=m;g.children[1].material=m;
  }
 }
 return {group,update,destroy(){head.dispose();shaft.dispose();dash.dispose();for(const m of materials.values())m.dispose();group.clear();}};
}
