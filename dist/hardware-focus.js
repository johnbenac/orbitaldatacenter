import * as T from './vendor/three.module.js';
import {domainSceneSpecs,sceneColors,routeRates} from './domain-scene.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const clamp=x=>Math.max(0,Math.min(1,x));
export function hardwarePart(o){while(o&&!o.userData.part)o=o.parent;return o?.userData.part||'structure';}
function focusColor(part,domain,o){
 if(domain==='data'&&part==='compute'&&o.userData.dataSource)return '#578990';
 if(domain==='thermal')return o.userData.thermalNode?'native':null;
 if(part==='pad'&&o.geometry?.type==='PlaneGeometry'&&o.material.map)return 'native';
 if(domain==='launch'&&part==='pad')return 'native';
 if(domain==='launch'&&['launcher','booster'].includes(part))return '#779599';
 if(domain==='launch'&&part==='fairing'&&o.isMesh)return null;
 const spec=domainSceneSpecs[domain];
 if(!spec?.parts.includes(part))return null;
 if(domain==='launch'||domain==='launcher')return 'native';
 if(domain==='mass'&&part==='structure')return 'native';
 if(o.isLine||part==='solar'&&o.material.map||part==='radiator'&&o.material.map||domain==='environment')return 'native';
 if(domain==='prop'&&part==='propellant')return 'native';
 return sceneColors[part]||'native';
}
export function focusHardware(root){
 const items=[],tints=new Map(),native=new Map(),ghostLine=new T.LineBasicMaterial({color:0x70909f,transparent:true,opacity:.10,depthWrite:false});
 const carrier=new T.MeshBasicMaterial({color:0x8197a1,transparent:true,opacity:.28,depthWrite:false,side:T.FrontSide,toneMapped:false});
 const ghost=new T.MeshBasicMaterial({color:0x92a6b4,transparent:true,opacity:.13,depthWrite:false,side:T.FrontSide,toneMapped:false});
 for(const material of [ghost,ghostLine,carrier]){material.userData.shared=true;material.userData.domainGhost=true;}
 root.traverse(o=>{if((o.isLine||o.isMesh)&&o.material&&!Array.isArray(o.material))items.push({o,original:o.material,part:hardwarePart(o),order:o.renderOrder});});
 let last='';
 function clear(){if(!last)return;for(const {o,original,order}of items){o.material=original;o.renderOrder=order;}last='';}
 return {apply(domain,selected=''){
  if(!domain||['conops','orbit'].includes(domain)||!domainSceneSpecs[domain]){clear();return;}const isolated=domain==='mass'?selected:'',signature=domain+'/'+isolated;if(signature===last)return;
  if(last)clear();last=signature;
  for(const {o,part,original,order}of items){const color=isolated&&part!==isolated?null:focusColor(part,domain,o);
   if(!color){o.material=o.isLine?ghostLine:['launcher','booster','fairing'].includes(part)?carrier:ghost;o.renderOrder=order+1;}
   else if(color==='native'&&!o.isLine){
    if(!native.has(original)){const m=original.clone();m.transparent=true;m.userData.shared=true;m.userData.domainFront=true;native.set(original,m);}
    o.material=native.get(original);o.renderOrder=order+4;
   }else if(color!=='native'){
    const base=original.color,lum=base?clamp(Math.sqrt(.2126*base.r+.7152*base.g+.0722*base.b)):1;
    const level=Math.round(lum*14)/14,key=color+'/'+original.side+'/'+level;
    if(!tints.has(key)){const m=new T.MeshStandardMaterial({color,roughness:.55,metalness:.28,side:original.side,emissive:color,emissiveIntensity:.075});m.color.multiplyScalar(.18+.89*level);m.userData.shared=true;m.userData.domainFront=true;m.transparent=true;tints.set(key,m);}
    o.material=tints.get(key);o.renderOrder=order+4;
   }
  }
 },clear,destroy(){clear();ghost.dispose();ghostLine.dispose();carrier.dispose();for(const m of [...native.values(),...tints.values()])m.dispose();}};
}
const materials={text:0x91d7cb,bulk:0xd7ad75,write:0x83d3c3,down:0x99bff2};
export function dataRoutes(craft,h){
 const root=new T.Group();root.name='Modeled data routes';const routes=[],w=h.bodyWidthM,b=h.bodyHeightM,l=h.bodyLengthM;
 const P=(x,y,z)=>V(x*w,y*b,z*l);
 const cpu=P(.24,.13,-.24),bulk=P(-.44,-.13,-.27),sw=craft.avionics.position.clone(),ssd=craft.recorder.position.clone(),top=P(-.27,.54,-.35);
 const targets={Ka:craft.dish,Optical:craft.optic,'S-band':craft.patches[0]};
 const smoothPath=points=>new T.CatmullRomCurve3(points,false,'centripetal');
 function add(key,points,channel=key,terminal=null){
  const path=smoothPath(points),color=materials[channel],tube=new T.Mesh(new T.TubeGeometry(path,28,w*.008,8,false),new T.MeshBasicMaterial({color,toneMapped:false}));tube.userData.sceneFlow=true;root.add(tube);
  const pulse=new T.Mesh(new T.SphereGeometry(w*.026,14,9),new T.MeshBasicMaterial({color,toneMapped:false}));pulse.userData.sceneFlow=true;root.add(pulse);
  routes.push({key,path,tube,pulse,terminal});
 }
 add('text',[cpu,P(-.08,.20,-.24),P(-.28,.19,-.30),sw]);
 add('bulk',[bulk,P(-.38,-.14,-.33),sw]);
 add('write',[sw,P(-.23,-.14,-.43),P(-.14,-.14,-.44),ssd]);
 // Each physical terminal has its own routing branch. All endpoints are fixed
 // in the bus frame at the gimbal hardpoints; the terminal head points separately.
 craft.root.updateMatrixWorld(true);
 for(const [name,obj]of Object.entries(targets)){const at=craft.root.worldToLocal(obj.getWorldPosition(V()));add('down',[ssd,P(.18,.24,-.43),P(-.16,.31,-.38),sw,P(-.28,.38,-.35),top,V(at.x,top.y+.06*b,at.z),at],'down',name);}
 // The purpose cutaway traces customer input through local staging. A relay
 // contract has no located spacecraft endpoint, so its cue ends at the switch.
 add('consume',[ssd,P(-.14,-.11,-.4),sw,P(-.16,.1,-.30),cpu],'bulk');
 add('produce',[cpu,P(.23,.22,-.28),P(.09,.20,-.34),ssd],'write');
 add('relay',[ssd,P(.01,.25,-.38),sw],'down');
 return {root,routes,update(s,visible,kind='data'){
  root.visible=visible;if(!visible)return;const rates=routeRates(h,s);
  for(const r of routes){let on;if(kind==='purpose'){
    const q=h.ai||{},relay=s.aiRoute==='relay',service=s.aiUnitRate>0;
    on=r.terminal?!relay&&r.terminal===s.groundLink&&s.aiOutputMbps>0:r.key==='consume'?service&&q.inputBytesPerUnit>0:r.key==='produce'?service&&q.outputBytesPerUnit>0:r.key==='relay'?relay&&s.aiRelayOn&&s.aiOutputMbps>0:false;
   }else on=r.terminal?r.terminal===s.groundLink&&rates.down>0:rates[r.key]>0;
   r.tube.visible=on;r.pulse.visible=on;
   if(on){const progress=((s.t*.19+(r.key==='write'?.31:r.key==='down'?.61:.12))%1+1)%1;r.pulse.position.copy(r.path.getPointAt(progress));}
  }
 },destroy(){root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});root.removeFromParent();}};
}
export function hardwareAnchor(id,c,h,s){
 const w=h.bodyWidthM,y=h.bodyHeightM,l=h.bodyLengthM,P=(x,yy,z)=>V(w*x,y*yy,l*z);
 const centre=o=>o?.getWorldPosition(V());
 switch(id){
 case 'storage':return centre(c.recorder);case 'avionics':return centre(c.avionics);
 case 'dish':return centre(c.dish);case 'optic':return centre(c.optic);case 'patch':return centre(c.patches[0]);
 case 'activeTerminal':return centre(s.groundLink==='Optical'?c.optic:s.groundLink==='S-band'?c.patches[0]:c.dish);
 case 'cmg':return centre(c.cmgs[0].g);case 'torquer':return centre(c.torquers[0]);
 case 'fuel':return centre(c.cells[0].tank);case 'oxidizer':return centre(c.cells[1].tank);
 case 'solar':case 'radiator':{const p=c.panels[id==='solar'?4:13];return p.surface.localToWorld(V(p.cx,0,p.cz));}
 default:{const pts={body:P(0,0,0),compute:P(.22,.20,-.17),battery:P(.2,.15,.435),coolant:P(.41,.18,.28),engine:P(.28,-.21,-.57)};
  return pts[id]?c.root.localToWorld(pts[id]):null;}
 }
}
