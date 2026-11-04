import * as T from './vendor/three.module.js';
import {surfaces} from './physics.js';
import {padSky} from './launch-art.js';
import {makeLaunch} from './launch-scene.js';
import {makeCraft} from './craft.js';
import {thermalSkin,temperatureLegend} from './thermal-view.js';
import {domainSceneSpecs,domainInstruments} from './domain-scene.js';
import {focusHardware,dataRoutes,hardwareAnchor} from './hardware-focus.js';
import {launchContextBadge} from './launch-context.js';
import {softRenderer} from './software-scene.js';
import {deploymentSchedule} from './deployment.js';
import {ascentTrack} from './trajectory.js';
import {geometry,groundSites,R,DEG,MU} from './orbit.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Y=V(0,1,0),TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),eci=(a,k=1)=>V(a[0]*k,a[2]*k,-a[1]*k);
const cameraView=s=>/launch|fairing/i.test(s)?'launch':/earth|orbit/i.test(s)?'orbit':/core/i.test(s)?'core':'spacecraft';
const pickAliases={enclosure:"structure",pv:'solar',array:'solar',arrays:'solar',radiators:'radiator',cmgs:'cmg',antennas:'communications',tanks:'propellant',coolant:'radiator',batteries:'battery',shielding:'structure',engine:'propulsion',prop:'propellant',attitude:'cmg',battery:'battery',trays:'compute'};
const defaultPose={spacecraft:[.61,.49],core:[.62,.47],orbit:[.54,.33],launch:[.46,.27]};
function line(p,pts,color,opacity=1,dash=0){let g=new T.BufferGeometry().setFromPoints(pts);let m=dash?new T.LineDashedMaterial({color,dashSize:dash,gapSize:dash*.66,transparent:true,opacity}):new T.LineBasicMaterial({color,transparent:true,opacity});let l=new T.Line(g,m);if(dash)l.computeLineDistances();p.add(l);return l;}
function arrow(p,start,dir,extent,color,dash=0){const q=dir.clone().normalize(),end=start.clone().addScaledVector(q,extent);line(p,[start,end],color,.88,dash);const head=new T.Mesh(new T.ConeGeometry(extent*.02,extent*.08,8),new T.MeshBasicMaterial({color}));head.position.copy(end).addScaledVector(q,-extent*.04);head.quaternion.setFromUnitVectors(Y,q);p.add(head);}
function disposeGroup(group){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 group.traverse(obj=>{if(obj.geometry&&!obj.geometry.userData.shared)geometries.add(obj.geometry);for(const m of [].concat(obj.material||[]))if(!m.userData.shared){materials.add(m);if(m.map)textures.add(m.map);}});
 for(const item of [...geometries,...materials,...textures])item.dispose();
}
export function createScene(container,{onPick=()=>{},onHover=()=>{},onThermalScale=()=>{}}={}){
 let cv=document.createElement('canvas');cv.style.cssText='display:block;position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab;outline:none';cv.setAttribute('aria-label','Interactive 3D view. Left drag rotates. Middle drag pans. Scroll zooms. Two fingers pan or pinch. Arrow keys rotate, Shift and arrows pan, plus and minus zoom. Home resets this camera.');cv.tabIndex=0;container.append(cv);let renderer,gpu=true;try{let context=cv.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'})||cv.getContext('webgl',{alpha:true,antialias:true});if(!context)throw Error();renderer=new T.WebGLRenderer({canvas:cv,context,alpha:true,antialias:true});renderer.setClearColor(0x0a1018,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;}catch{gpu=false;if(cv.getContext('2d')===null){let fresh=cv.cloneNode();cv.replaceWith(fresh);cv=fresh;}renderer=softRenderer(cv);}
 const scene=new T.Scene(),craftGroup=new T.Group(),orbit=new T.Group();scene.add(craftGroup,orbit);const orthCamera=new T.OrthographicCamera(-10,10,10,-10,.001,5000),launchCamera=new T.PerspectiveCamera(34,1,.04,2000);let camera=orthCamera;const hemi=new T.HemisphereLight(0xe5f4ff,0xb8a58f,1.52),key=new T.DirectionalLight(0xffedcf,3.2),rim=new T.DirectionalLight(0xabcfff,1.95);key.position.set(-4,8,5);rim.position.set(7,2,-6);scene.add(hemi,key,rim,key.target);if(gpu){renderer.shadowMap.type=T.PCFSoftShadowMap;key.shadow.mapSize.set(1024,1024);key.shadow.normalBias=.028;}
 let domain='',phase='',focus='',craftFocus=null,launchFocus=null,custody=null,stagingBounds=null,chapter='',launch=null,launchKey='',launchFrame=null;let view='spacecraft',size,h={},s={},craft=null,pose={spacecraft:[...defaultPose.spacecraft,1],core:[...defaultPose.core,1],orbit:[...defaultPose.orbit,1],launch:[...defaultPose.launch,1]},w=0,ht=0,selected='',layers=[],annotation=new T.Group(),selection=new T.Group(),beamGroup=new T.Group(),arrowSig='',pickables=[],raf=0,alive=true,orbitSig='',stationSig='',texture=null, lastPaint=0,frameKey='',meshKey='',overlayStale=true;
 const pan=Object.fromEntries(Object.keys(defaultPose).map(k=>[k,V()]));let halfAtFocus=1;
 let thermalScale='working',craftSkin=null,launchSkin=null,showLegend=true,legendMode='',hoverHit=null,selectedHit=null;
 craftGroup.add(annotation,selection,beamGroup);const spin=new T.Group();orbit.add(spin);const earth=new T.Mesh(new T.SphereGeometry(1,96,56),new T.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0}));spin.add(earth);texture=new T.TextureLoader().load('./vendor/earth-atmos.jpg',()=>request());texture.colorSpace=T.SRGBColorSpace;earth.material.map=texture;
 const atmosphere=new T.Mesh(new T.SphereGeometry(1.017,64,40),new T.ShaderMaterial({uniforms:{tint:{value:new T.Color('#548faf')}},vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;uniform vec3 tint;void main(){float f=pow(1.-abs(dot(normalize(n),normalize(v))),8.);gl_FragColor=vec4(tint,.47*f);}',transparent:true,side:T.FrontSide,depthWrite:false}));if(gpu)orbit.add(atmosphere);
 const trace=new T.Group();orbit.add(trace);const mark=new T.Mesh(new T.SphereGeometry(.011,12,8),new T.MeshBasicMaterial({color:0xffb363}));orbit.add(mark);const ring=new T.Mesh(new T.RingGeometry(.021,.024,40),new T.MeshBasicMaterial({color:0xffb363,side:T.DoubleSide,depthWrite:false}));orbit.add(ring);const sites=new T.Group();spin.add(sites);const stationMat=new T.MeshBasicMaterial({color:0x92ddcd});stationMat.userData.shared=true;const trackBeam=line(orbit,[V(),V()],0x7dedd4,.9);
 const phaseFGround=new T.Group(),phaseFOrbit=new T.Group(),thrustCue=new T.Group();spin.add(phaseFGround);orbit.add(phaseFOrbit,thrustCue);
 let disposalPlan=null,graveFocus=null,phaseFKey='',landmarks=[];
 const onPhaseF=()=>chapter==='deorbit'||chapter==='disposal'||['deorbit','entry','graveyard'].includes(s.flightPhase);
 const surface=(p,r=1.003)=>{const lat=p.latDeg*DEG,lon=p.lonDeg*DEG;return V(Math.cos(lat)*Math.cos(lon),Math.sin(lat),-Math.cos(lat)*Math.sin(lon)).multiplyScalar(r);};
 function plotPhaseF(){
  const p=disposalPlan,visible=!!p&&onPhaseF();phaseFGround.visible=phaseFOrbit.visible=visible;if(!visible)return;
  const key=[p.method,p.start,p.end,p.target?.latDeg,p.target?.lonDeg,p.impact?.lonDeg,p.footprint?.semiMajorKm,h.input.epoch].join('/');
  if(phaseFKey===key)return;phaseFKey=key;clear(phaseFGround);clear(phaseFOrbit);landmarks=[];graveFocus=null;
  const track=p.groundTrack||[];if(track.length>1){
   line(phaseFGround,track.map(q=>surface(q)),0x67bebd,.85);
   const path=track.map(q=>surface(q,(R+q.altitudeKm)/R).applyAxisAngle(Y,geometry(h.input,q.t).earthRotationRad));
   line(phaseFOrbit,path,0xf4ae67,1);
   if(p.method==='graveyard'){// The final plane is recovered from two propagated position vectors.
    const n=V().crossVectors(path.at(-2),path.at(-1)).normalize(),u=path.at(-1).clone().normalize(),v=V().crossVectors(n,u),rad=1+(p.finalApogeeKm+p.finalPerigeeKm)/(2*R);
    const facing=n.clone();if(s.sunECI&&facing.dot(eci(s.sunECI))<0)facing.negate();graveFocus=u.clone().multiplyScalar(.64).addScaledVector(facing,.92).normalize();
    line(phaseFOrbit,Array.from({length:145},(_,i)=>u.clone().multiplyScalar(rad*Math.cos(TAU*i/144)).addScaledVector(v,rad*Math.sin(TAU*i/144))),0x9ed99c,.9);
   }
  }
  if(p.footprint?.points?.length)line(phaseFGround,p.footprint.points.map(q=>surface(q,1.004)),0xcd98f0,1);
  function pin(q,color,name){if(!q||!Number.isFinite(q.latDeg))return;const m=new T.Mesh(new T.SphereGeometry(.006,14,9),new T.MeshBasicMaterial({color}));m.position.copy(surface(q,1.005));phaseFGround.add(m);landmarks.push({m,name});}
  pin(p.target,0xfab15d,'Target');pin(p.impact,0xd9b6ff,'Impact');
  if(p.target&&p.impact){const center=surface(p.target,1).normalize(),east=V(-Math.sin(p.target.lonDeg*DEG),0,-Math.cos(p.target.lonDeg*DEG)),north=V().crossVectors(center,east).normalize(),r=(p.target.toleranceKm||0)/R;
   if(r>0)line(phaseFGround,Array.from({length:97},(_,i)=>center.clone().multiplyScalar(Math.cos(r)).addScaledVector(east,Math.sin(r)*Math.cos(i*TAU/96)).addScaledVector(north,Math.sin(r)*Math.sin(i*TAU/96)).multiplyScalar(1.004)),0xf4b268,.92);}
 }
 function clear(group){disposeGroup(group);group.clear();}
 const tags=document.createElement('div');tags.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden';container.append(tags);const legend=temperatureLegend(container,id=>{if(id!==thermalScale){setThermalScale(id);onThermalScale(id);}});
 function label(x,y,txt){const a=document.createElement('span');a.textContent=txt;a.style.cssText=`position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);font:500 9px/1.5 ui-monospace,monospace;letter-spacing:.04em;color:#d1dddf;background:#14202acc;padding:1px 4px;white-space:nowrap`;tags.append(a);}
 let backgroundState='';
 function setBg(){const next=view==='launch'&&launchFrame?.environment!=='space'?launchFrame?.environment:view==='orbit'?'orbit':s.eclipse?'shadow':'day';if(next===backgroundState)return;backgroundState=next;
  const bg="url('./vendor/orbital-limb.jpg')";
  container.style.backgroundColor='#050a10';container.style.backgroundImage=next==='orbit'?'radial-gradient(ellipse at 47% 45%,#111e2a 0%,#050b13 57%,#04080f 100%)':next==='shadow'?'linear-gradient(160deg,rgba(3,10,23,.20),rgba(0,4,12,.67)), '+bg:bg;
  if(next==='hangar')container.style.backgroundImage='radial-gradient(ellipse at 52% 10%, #526674, #2a3947 43%, #14222d 75%, #0c161f)';if(next==='ground')container.style.backgroundImage='url('+padSky()+')';if(next==='sky')container.style.backgroundImage='linear-gradient(170deg,#0a182b,#184466 54%,#84aec0 90%,#c9d4d5)';container.style.backgroundSize='cover';container.style.backgroundPosition='50% 50%';
 }
 function lightScene(){
   const world=view==='orbit',displayLaunch=view==='launch'&&launchFrame&&!launchFrame.directCraft, shadow=!world&&!displayLaunch&&s.eclipse;
   key.position.copy(displayLaunch?V(-5,7,3):world&&s.sunECI?eci(s.sunECI,8):frameDirection(s.sunECI).multiplyScalar(8));
   key.intensity=shadow?0:world?3.6:3.2;
   hemi.intensity=world?.35:shadow?.95:1.52;hemi.groundColor.setHex(shadow?0x627f99:0xb8a58f);
   rim.intensity=world?.17:shadow?.82:1.75;
   const illumination=key.position.clone().normalize();
   if(displayLaunch){key.intensity=2.6;hemi.intensity=.97;rim.intensity=1.12;}
   if(gpu){const shadows=displayLaunch&&['ground','hangar'].includes(launchFrame.environment);renderer.shadowMap.enabled=!!shadows;key.castShadow=!!shadows;key.target.position.set(0,0,0);
    if(shadows){const r=launchFrame.half*1.65;key.target.position.copy(launchFrame.center);key.position.copy(key.target.position).addScaledVector(illumination,r*2.6);const c=key.shadow.camera;c.left=-r;c.right=r;c.top=r;c.bottom=-r;c.near=.1;c.far=r*6;c.updateProjectionMatrix();}}
   scene.userData.lightState={sun:illumination,ambient:world?.21:displayLaunch?.33:shadow?.27:.45,direct:shadow?0:1.06,rim:world?.05:shadow?.20:.38};
 }
 function setCamera(){if(!w||!ht)return;let [az,elevation,zoom]=pose[view];if(view==='orbit'&&onPhaseF()&&disposalPlan?.feasible){
  const pt=disposalPlan.method==='reentry'?(disposalPlan.impact||disposalPlan.target):disposalPlan.groundTrack?.at(-1);
  if(pt){const d=disposalPlan.method==='graveyard'&&graveFocus?graveFocus:surface(pt,1).applyAxisAngle(Y,s.earthRotationRad||0);az+=Math.atan2(d.x,d.z)-defaultPose.orbit[0];elevation=clamp(elevation+Math.asin(d.y)-defaultPose.orbit[1],-1.48,1.48);}
 }
 if(view==='orbit'&&focus==='orbit'&&!onPhaseF()&&s.positionECI&&s.normal){
  const aim=eci(s.positionECI).normalize().addScaledVector(eci(s.normal).normalize(),.55).normalize();
  az+=Math.atan2(aim.x,aim.z)-defaultPose.orbit[0];elevation=clamp(elevation+Math.asin(aim.y)-defaultPose.orbit[1],-1.48,1.48);
 }
 const offset=focus&&['core','spacecraft'].includes(view)?({data:[3.71,.37],comm:[.15,.21],attitude:[.23,.22],prop:[-.37,-.25],compute:[.42,-.05],power:[-.18,.06]})[focus]:null;
 if(offset){az+=offset[0];elevation=clamp(elevation+offset[1],-1.48,1.48);}
 const el=elevation-(view==='launch'&&launchFrame?.environment==='ground'?.31:0);const dir=V(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el));const aspect=w/ht;const launchConfig=view==='launch'&&launchFrame&&!launchFrame.directCraft,look=launchConfig?launchFrame.center.clone():V();let half;if(launchConfig)half=Math.max(launchFrame.half,launchFrame.half*.85/aspect);else if(view==='orbit')half=Math.max(1.32,1.37/aspect);else if(view==='core'||view==='spacecraft'&&domainSceneSpecs[focus]?.close)half=Math.max(h.bodyHeightM*.82+h.bodyLengthM*.20,(h.bodyLengthM*.64+h.bodyWidthM*.7)/aspect);else if(size){half=Math.max(size.fitHeight*.5,size.fitWidth*.5/aspect);}else half=10;
 if(focus==='data'&&view!=='launch'&&view!=='orbit'){look.copy(craft.root.localToWorld(V(0,0,-h.bodyLengthM*.16)));half*=.88;}
 if(launchConfig&&phase==='D'&&focus==='launch'&&!launchFrame.reference&&['pad','ascent','insertion'].includes(s.flightPhase)){
  const ends=launch.parts.stage.localToWorld(V(0,s.flightPhase==='insertion'?-h.bodyLengthM*.45:-(launch.geometry.upperLengthM||h.stowedLengthM)*.30,0));
  const payload=launch.parts.payload.localToWorld(V(0,h.stowedLengthM*.55,0));look.copy(ends).lerp(payload,.57);
  half=Math.max(h.fairing.heightM*.82,ends.distanceTo(payload)*.71,h.stowedDiameterM*1.7/aspect);
 }
 if(launchConfig&&!launchFrame.reference&&phase==='D'&&focus&&!['launcher','launch','conops','orbit'].includes(focus)){
  craft.root.updateWorldMatrix(true,false);const coreOnly=domainSceneSpecs[focus].close;
  look.copy(craft.root.localToWorld(V(0,0,coreOnly?0:(h.stowedLengthM-h.bodyLengthM)*.32)));
  half=coreOnly?Math.max(h.bodyHeightM*1.30,h.bodyLengthM*.72/aspect):Math.max(h.stowedLengthM*.73,h.bodyWidthM*1.9/aspect);
 }
 if(stagingBounds&&view!=='core'&&view!=='orbit'&&!launchConfig){const ext=stagingBounds.getSize(V()),right=V(0,1,0).cross(dir).normalize(),up=dir.clone().cross(right),extent=u=>Math.abs(u.x)*ext.x+Math.abs(u.y)*ext.y+Math.abs(u.z)*ext.z;look.copy(stagingBounds.getCenter(V()));half=Math.max(half,extent(right)*.53/aspect,extent(up)*.53);}
 half/=zoom;halfAtFocus=half;look.add(pan[view]);const perspective=view==='launch';camera=perspective?launchCamera:orthCamera;const dist=perspective?half/Math.tan(17*DEG):view==='orbit'?5:Math.max(40,(size?.span??20)*4);camera.position.copy(dir).multiplyScalar(dist).add(look);camera.up.set(0,1,0);camera.lookAt(look);if(view==='spacecraft')camera.rotateZ(.13);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.near=perspective?.07:.001;camera.far=dist*(launchConfig?55:4);if(perspective)camera.aspect=aspect;camera.updateProjectionMatrix();camera.updateMatrixWorld();ring.quaternion.copy(camera.quaternion);}
 function anchorFor(id){
  if(view==='orbit'){
   if(id==='orbitCraft')return mark.getWorldPosition(V());
   if(id==='station'&&s.stationECI)return eci(s.stationECI,1/R);
   if(id==='orbitGround')return s.positionECI?eci(s.positionECI,1/R).normalize():null;return null;
  }
  if(view==='launch'&&launch&&launchFrame&&!launchFrame.directCraft){const {payload,liveMount,stage,upper,shell}=launch.parts;
   if(id==='interface')return payload.localToWorld(V(0,.18,0));
   if(id==='payload')return liveMount.getWorldPosition(V());
   if(id==='thrustDeck'){const q=launch.parts.boosters?.[0];return q&&q.visible?q.localToWorld(V(0,launch.geometry.lowerLengthM*.51,0)):launch.parts.lower.localToWorld(V(0,-launch.geometry.upperLengthM-launch.geometry.lowerLengthM*.75,0));}
   if(id==='rocket')return stage.localToWorld(V(0,-(launch.geometry?.upperLengthM||h.input.fairingLengthM)*1.12,0));
   if(id==='shroud')return (shell.visible?shell:upper).localToWorld(V(0,shell.visible?(h.fairing?.heightM||12)*.43:-1,0));
  }
  return hardwareAnchor(id,craft,h,s);
 }
 function domainCaptions(){
  if(!focus)return;
  if(view==='launch'&&phase==='D'&&launchFrame&&!launchFrame.directCraft&&!['launcher','conops','orbit'].includes(focus)){
   const badge=document.createElement('div');badge.setAttribute('data-stage-context',s.flightPhase||'');badge.style.cssText='position:absolute;left:10px;top:38px;background:#101c26ee;color:#f0d5a9;border:1px solid #526771;border-radius:4px;padding:5px 6px 3px;text-align:center;font:600 8px/1.3 ui-monospace,monospace;letter-spacing:.05em';
   badge.innerHTML='<span style="display:block">STACK CONTEXT</span>'+launchContextBadge(launch,h,s);tags.append(badge);
  }
  const entries=domainInstruments(focus,h,s,{view,reference:launchFrame?.reference}),slots={left:[],right:[]};
  craft.root.updateWorldMatrix(true,true);if(launch&&view==='launch')launch.root.updateWorldMatrix(true,true);
  for(const el of entries){
   const v=anchorFor(el.anchor);if(!v)continue;
   const p=v.project(camera),px=(p.x+1)*w/2,py=(1-p.y)*ht/2;
   if(!Number.isFinite(px+py)||p.z< -1||p.z>1||px<-3||px>w+3||py<0||py>ht)continue;
   slots[el.side].push({...el,px,py});
  }
  const width=Math.min(w<470?128:159,w*.37),pad=w<470?7:13,sep=43;
  for(const side of ['left','right']){
   const ordered=slots[side].sort((a,b)=>a.py-b.py),x=side==='left'?pad:w-pad-width,edge=side==='left'?x+width:x;
   ordered.forEach((el,i)=>{
    const hasBadge=view==='launch'&&phase==='D'&&launchFrame&&!launchFrame.directCraft&&!['launcher','conops','orbit'].includes(focus),lo=(side==='left'&&hasBadge?138:43)+i*sep,hi=Math.max(lo,ht-58-(ordered.length-i-1)*sep),y=clamp(el.py,Math.max(lo,i?ordered[i-1].y+sep:lo),hi);el.y=y;
    const dx=el.px-edge,dy=el.py-y,leader=document.createElement('i');leader.style.cssText='position:absolute;left:'+edge+'px;top:'+y+'px;width:'+Math.hypot(dx,dy)+'px;height:1px;background:'+el.color+';opacity:.64;transform-origin:left center;transform:rotate('+Math.atan2(dy,dx)+'rad)';tags.append(leader);
    const dot=document.createElement('i');dot.style.cssText='position:absolute;left:'+(el.px-2)+'px;top:'+(el.py-2)+'px;width:5px;height:5px;box-shadow:0 0 0 2px #0a1418aa;background:'+el.color+';border-radius:50%';tags.append(dot);
    const card=document.createElement('span'),title=document.createElement('span'),value=document.createElement('span');
    card.setAttribute('data-scene-instrument',el.anchor);
    card.style.cssText='position:absolute;box-sizing:border-box;left:'+x+'px;top:'+y+'px;transform:translateY(-50%);width:'+width+'px;border-left:2px solid '+el.color+';background:rgba(13,22,31,.92);padding:4px 7px;text-align:left;border-radius:2px';
    title.style.cssText='display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 9px/1.35 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.045em;color:'+el.color;
    value.style.cssText='display:block;font:500 '+(w<470?'10':'11')+'px/1.4 system-ui,sans-serif;color:#e6f0f1';title.textContent=el.title;value.textContent=el.value;card.append(title,value);if(el.detail){const detail=document.createElement('span');detail.textContent=el.detail;detail.style.cssText='display:block;font:9px/1.35 system-ui,sans-serif;color:#a8b9c3';card.append(detail);}tags.append(card);
   });
  }
 }
 function render(){raf=0;if(!alive||!w||!ht||!craft||!container.getClientRects().length)return;setCamera();tags.replaceChildren();if(view==='spacecraft'&&layers.includes('dimensions')){let p=V(0,0,Math.max(h.wingWidthM*1.15,h.bodyLengthM*.7)).applyMatrix4(craft.root.matrixWorld).project(camera);label((p.x+1)*w/2,(1-p.y)*ht/2,`PV span ${craft.wingspan.toFixed(1)} m`);}if(view==='orbit'&&s.station&&s.stationECI){let p=eci(s.stationECI,1/R).project(camera);label((p.x+1)*w/2,(1-p.y)*ht/2+12,s.station);}if(view==='orbit'&&onPhaseF()&&phaseFGround.visible){spin.updateMatrixWorld(true);for(const {m,name} of landmarks){const v=m.getWorldPosition(V());if(v.dot(camera.position)<=.9)continue;const p=v.project(camera);label((p.x+1)*w/2,(1-p.y)*ht/2+(name==='Target'?-13:14),name);}}
 if(view!=='orbit'&&s.deployment>0&&s.deployment<1)label(w*.5,ht*.14,Math.round(s.deployment*100)+'% · '+deploymentSchedule(s.deployment).title);
 if(selected==='propellant'&&view!=='orbit'&&view!=='launch'){const kg=s.propellantKg??h.propellantKg;label(w*.5,ht*.81,`${kg.toFixed(1)} kg · ${(s.tankFillPct??(h.input.tankFill||0)*100).toFixed(1)}% fill`);}if(view==='launch'&&(launchFrame?.reference||launchFrame?.vehicleStudy))label(w*.5,Math.max(30,ht-30),launchFrame.vehicleStudy?'LAUNCH STACK · CONFIGURATION REFERENCE':'STOWED CONFIGURATION · DESIGN REFERENCE');if(view==='core'&&h.trays>28&&(!focus||focus==='compute'))label(w*.5,ht*.12,'GROUPED RACK VIEW · '+craft.trayRows.length+' ROWS REPRESENT '+h.trays+' TRAYS');if(view==='core'&&!selected&&!focus&&layers.includes('thermal')){const captions=[
   [V(h.bodyWidthM*.54,0,-h.bodyLengthM*.19),'Junction',s.junctionK],
   [V(-h.bodyWidthM*.45,-h.bodyHeightM*.20,h.bodyLengthM*.24),'Coolant',s.coolantK],
   [V(0,h.bodyHeightM*.14,h.bodyLengthM*.5),'Battery',s.batteryK]
  ];craft.root.updateMatrixWorld();for(const [anchor,name,value] of captions){if(!Number.isFinite(value))continue;const p=anchor.applyMatrix4(craft.root.matrixWorld).project(camera);label(clamp((p.x+1)*w/2,58,w-58),clamp((1-p.y)*ht/2,24,ht-22),name+' · '+value.toFixed(1)+' K');}}
  if(view==='launch'&&phase==='D'&&focus&&!['launch','launcher','conops','orbit'].includes(focus)&&launchFrame&&!launchFrame.directCraft)label(w*.5,Math.max(25,ht-27),s.flightPhase.toUpperCase()+' · '+(s.t<540?'STOWED PAYLOAD CUTAWAY':'SEPARATED PAYLOAD'));if(view==='launch'&&layers.includes('dimensions')&&launchFrame?.environment==='hangar'&&h.fairing){label(w*.5,ht*.16,'KEEP-IN Ø '+h.fairing.maxDiameterM.toFixed(2)+' m · '+h.fairing.heightM.toFixed(2)+' m HIGH');}domainCaptions();renderer.render(scene,camera);if(hoverHit&&hoverHit.t!==s.t&&!drag)hoverPart({clientX:hoverHit.x,clientY:hoverHit.y});lastPaint=performance.now();}
 function request(){if(!alive||raf)return;raf=requestAnimationFrame(render);}
 function resize(){let r=container.getBoundingClientRect();w=Math.floor(r.width);ht=Math.floor(r.height);if(w>0&&ht>0){if(gpu)renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));renderer.setSize(w,ht,false);request();}}
 const ro=new ResizeObserver(resize);ro.observe(container);
 function plotOrbit(){
  const flight=s.flightPhase,ascent=['integration','pad','ascent'].includes(flight),returning=['deorbit','entry'].includes(flight),instant=returning?Math.floor(s.t/5):Math.floor(s.t/3600);
  const stamp=[meshKey,h.input.epoch,h.input.altitudeKm,h.input.ecc,h.input.raanDeg,h.input.meanAnomalyDeg,h.input.argPeriDeg,h.input.inclinationDeg,flight,instant].join('/');
  if(stamp===orbitSig)return;orbitSig=stamp;clear(trace);
  if(ascent){
   const insertion=geometry(h.input,540),pts=Array.from({length:91},(_,i)=>eci(ascentTrack(insertion,i*6).positionECI,1/R));
   line(trace,pts,0xefc07a,.94);return;
  }
  if(returning&&s.positionECI&&s.velocityECI){
   const r=V(...s.positionECI),v=V(...s.velocityECI),mom=V().crossVectors(r,v),p=mom.lengthSq()/MU;
   const ev=V().crossVectors(v,mom).divideScalar(MU).sub(r.clone().normalize()),e=ev.length(),ex=ev.normalize(),ey=V().crossVectors(mom.normalize(),ex),here=Math.atan2(r.dot(ey),r.dot(ex));
   let points=[];for(let i=0;i<=360;i++){const f=here-Math.PI+Math.PI*i/180,rr=p/(1+e*Math.cos(f));if(rr<R+120){if(points.length>1)line(trace,points,0xffa56b,.94);points=[];continue;}points.push(eci(ex.clone().multiplyScalar(rr*Math.cos(f)).addScaledVector(ey,rr*Math.sin(f)).toArray(),1/R));}
   if(points.length>1)line(trace,points,0xffa56b,.94);return;
  }
  let points=[],last=null;const period=s.periodSec??5700;for(let j=0;j<=180;j++){const f=geometry(h.input,s.t+j*period/180),p=eci(f.positionECI,1/R),shade=f.eclipse;if(last!==null&&last!==shade){points.push(p);line(trace,points,last?0x70879a:0xe4aa6a,.94,last?.024:0);points=[p];}points.push(p);last=shade;}if(points.length>1)line(trace,points,last?0x70879a:0xe4aa6a,.94,last?.024:0);
 }
 function setupStations(){if(stationSig===h.input.network)return;stationSig=h.input.network;clear(sites);for(const st of groundSites(h.input.network)){let a=st.lat*DEG,b=st.lon*DEG;let m=new T.Mesh(new T.SphereGeometry(.006,8,5),stationMat);m.position.set(Math.cos(a)*Math.cos(b),Math.sin(a),-Math.cos(a)*Math.sin(b)).multiplyScalar(1.004);sites.add(m);}}
 function updateOrbit(){if(view!=='orbit')return;setupStations();plotPhaseF();plotOrbit();trace.visible=!(onPhaseF()&&disposalPlan?.feasible);if(s.positionECI){mark.position.copy(eci(s.positionECI,1/R));ring.position.copy(mark.position);}spin.rotation.y=s.earthRotationRad||0;trackBeam.visible=!!s.stationECI;if(s.stationECI)trackBeam.geometry.setFromPoints([mark.position,eci(s.stationECI,1/R)]);if(s.sunECI)key.position.copy(eci(s.sunECI,8));mark.material.color.setHex(s.burn?0xff7844:0xffb363);ring.scale.setScalar(s.burn?1.7:1);
 clear(thrustCue);if(onPhaseF()&&disposalPlan?.feasible&&s.burn&&s.velocityECI){const thrust=eci(s.velocityECI).normalize().multiplyScalar(disposalPlan.method==='graveyard'?1:-1);arrow(thrustCue,mark.position,thrust,.13,0xf7c38e);}
 }
 function frameDirection(vec){
  if(!vec||!s.radiatorNormalECI||!s.pvNormalECI)return V(0,1,0);
  const tilt=(h.input.solarTiltDeg||0)*DEG*deploymentSchedule(s.deployment??1).tracking,roll=(h.input.rollDeg||0)*DEG,axis=V(...s.radiatorNormalECI),pv=V(...s.pvNormalECI);
  let base=pv.addScaledVector(axis,-Math.sin(tilt));
  if(base.lengthSq()<1e-10){const d={...h.input,solarTiltDeg:0};base=V(...surfaces({...h,input:d},s,1).pvNormalECI);}else{base.normalize();if(Math.cos(tilt)<0)base.negate();}
  const normal=V().crossVectors(axis,base).normalize(),target=V(...vec);
  return V(target.dot(axis),target.dot(base),target.dot(normal)).normalize().applyAxisAngle(V(0,0,1),-roll);
 }
 function arrows(){const keys=[...layers,...(domainSceneSpecs[focus]?.vectors||[])];clear(annotation);if(!craft)return;let span=craft.wingspan,length=span*.21,step=length*.10,a=frameDirection(s.sunECI);if(a.length()<.3)a=V(-.5,.8,.4).normalize();let radialDir=frameDirection(s.radial),ramDir=s.ramBody?V(...s.ramBody).applyAxisAngle(V(0,0,1),-(h.input.rollDeg||0)*DEG).negate():V(0,0,-1);if(keys.includes('sun')&&!s.eclipse)for(let j of [-1,0,1])arrow(annotation,V(j*step,0,0).addScaledVector(a,length*1.6),a.clone().negate(),length,0xf7b862);if(keys.includes('albedo')&&!s.eclipse)arrow(annotation,V(h.bodyWidthM*.75,-length,0),radialDir,length*.7,0x9ed9ec,step*.22);if(keys.includes('ir'))arrow(annotation,V(-h.bodyWidthM*.75,-length,0),radialDir,length*.7,0xee9a7d,step*.33);if(keys.includes('radiator'))for(let j of [-1,1])arrow(annotation,V(0,0,j*(h.bodyLengthM*.60+h.radiatorLengthM*.55)),frameDirection(s.radiatorNormalECI),length*.55,0xf18b91);if(keys.includes('ram'))arrow(annotation,V(0,h.bodyHeightM*.7,0).addScaledVector(ramDir,-length*1.15),ramDir,length*.7,0x98b3f0);if(keys.includes('pressure'))arrow(annotation,V(h.bodyWidthM*.48,0,h.bodyLengthM*.45),ramDir,length*.65,0xe7a383);if(keys.includes('thrust')&&s.burn)arrow(annotation,V(0,h.bodyHeightM*.85,-h.bodyLengthM*.5),V(0,0,1),length*.9,0x82d7bf);if(focus==='attitude'){const tau=V(s.torqueXNm||0,s.torqueYNm||0,s.torqueZNm||0);if(tau.lengthSq()>1e-18)arrow(annotation,V(0,h.bodyHeightM*.36,0),tau.normalize(),h.bodyWidthM*.53,0xf0b769);}
 if(keys.includes('dimensions')){const xx=span*.5,zz=Math.max(h.wingWidthM*1.15,h.bodyLengthM*.7);line(annotation,[V(-xx,0,zz-.23),V(-xx,0,zz+.23)],0xc9d5d3);line(annotation,[V(xx,0,zz-.23),V(xx,0,zz+.23)],0xc9d5d3);line(annotation,[V(-xx,0,zz),V(xx,0,zz)],0xc9d5d3,.85);}}
 function selectionBox(){clear(selection);if(!selected||!craft)return;let boxes=[];craft.root.updateMatrixWorld(true);craft.root.traverseVisible(o=>{if(!o.isMesh)return;let a=o;while(a&&!a.userData.part)a=a.parent;if(a?.userData.part!==selected)return;let bb=new T.Box3().setFromObject(o);if(!bb.isEmpty())boxes.push(bb);});if(!boxes.length)return;let box=boxes[0];boxes.slice(1).forEach(b=>box.union(b));box.expandByScalar(.06);selection.add(new T.Box3Helper(box,0xecba75));}
 function actuate(){const depl=clamp(s.deployment??1,0,1),roll=(h.input.rollDeg||0)*DEG,tilt=(h.input.solarTiltDeg||0)*DEG;craft.root.rotation.set(0,0,-roll*Math.min(1,depl/.05));
 if(onPhaseF()&&disposalPlan?.feasible&&s.velocityECI&&['deorbit','entry'].includes(s.flightPhase)&&s.t>=disposalPlan.start){const thrust=frameDirection(s.velocityECI).multiplyScalar(disposalPlan.method==='graveyard'?1:-1);craft.root.quaternion.setFromUnitVectors(V(0,0,1),thrust);}
for(const r of craft.rads)r.bank.rotation.z=-Math.PI*.5;craft.positionPanels(depl);
 craft.appendages.visible=view!=='core';const core=view==='core',payloadFocus=view==='launch'&&focus&&['data','compute','thermal','comm','attitude','power','prop'].includes(focus),tank=selected==='propellant'||focus==='prop';craft.skin.visible=!core&&!payloadFocus;craft.internal.visible=core||payloadFocus||selected==='cmg'||['compute','data','attitude','power','thermal','mass'].includes(focus);for(let a of craft.cells){a.tank.visible=!tank;a.fluid.visible=tank;const frac=clamp((s.tankFillPct??100*h.input.tankFill)/100,0,1);a.fluid.scale.copy(a.tank.scale).multiplyScalar(Math.cbrt(frac));}if(core){for(let w of craft.wings)w.fold.parent.visible=false;for(let r of craft.rads)r.bank.parent.visible=false;}else{for(let w of craft.wings)w.fold.parent.visible=true;for(let r of craft.rads)r.bank.parent.visible=true;}
 const pointing=V(.36,.82,.29).normalize();if(s.stationECI&&s.positionECI){const sight=s.stationECI.map((a,i)=>a-s.positionECI[i]);pointing.copy(frameDirection(sight));}const localPoint=pointing.clone().applyAxisAngle(V(0,0,1),roll);const standby=V(.36,.82,.29).normalize(),slew=clamp(s.slewFraction??1,0,1),aim=new T.Quaternion().setFromUnitVectors(Y,localPoint);
 craft.dish.quaternion.setFromUnitVectors(Y,standby);craft.optic.quaternion.identity();
 if(s.groundLink==='Ka')craft.dish.quaternion.slerp(aim,slew);
 if(s.groundLink==='Optical')craft.optic.quaternion.slerp(aim,slew);craft.cmgs.forEach(c=>{c.g.rotation.x=c.a*.22+(s.momentumNms??0)/Math.max(1,h.input.cmgMomentumNms)*.7+(s.desat?.15:0);c.rotor.rotation.y=(s.t??0)*3+c.a;});craft.leds.forEach((a,i)=>a.visible=(i%8)/8<(s.activeFraction??.9));craft.plumes.forEach(a=>a.visible=!!s.burn);
 clear(beamGroup);if(s.station&&s.goodputMbps>0&&(!core||['data','comm'].includes(focus))){craft.root.updateMatrixWorld(true);const terminal=s.groundLink==='Optical'?craft.optic:s.groundLink==='S-band'?craft.patches[localPoint.x>0?1:0]:craft.dish,origin=terminal.getWorldPosition(V()),end=origin.clone().addScaledVector(pointing,core?h.bodyLengthM*1.10:craft.wingspan*.7);line(beamGroup,[origin,end],s.groundLink==='Optical'?0xffb989:0x8ceada,.91);const c=new T.Mesh(new T.ConeGeometry(Math.max(.025,h.input.kaDishM*.14),origin.distanceTo(end),14,1,true),new T.MeshBasicMaterial({color:0x6edac4,transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide}));c.position.copy(origin).lerp(end,.5);c.quaternion.setFromUnitVectors(Y,pointing.clone().negate());beamGroup.add(c);}
 }
 function updateLaunch(){
  if(view!=='launch'){if(launch)launch.root.visible=false;launchFrame=null;return;}
  const signature=[meshKey,h.input.launcher,h.input.fairingM,h.input.fairingLengthM,h.stowedLengthM].join('/');
  if(signature!==launchKey){if(launch){launchSkin?.destroy();launchSkin=null;launchFocus?.destroy();launchFocus=null;scene.remove(launch.root);disposeGroup(launch.root);}launch=makeLaunch(h);scene.add(launch.root);launchKey=signature;}
  launchFrame=launch.update(s,chapter,{domain:focus,phase});
 }
 function positionVehicle(){
  craftGroup.position.set(0,0,0);craftGroup.quaternion.identity();
  const packing=view==='launch'&&launchFrame&&!launchFrame.directCraft&&!launchFrame.reference;
  if(packing){const mount=launch.parts.liveMount;launch.root.updateMatrixWorld(true);mount.getWorldPosition(craftGroup.position);mount.getWorldQuaternion(craftGroup.quaternion);
   if(s.flightPhase==='insertion'){const k=clamp((s.t-620)/280,0,1),f=k*k*(3-2*k);craftGroup.position.multiplyScalar(1-f);craftGroup.quaternion.slerp(new T.Quaternion(),f);launchFrame.center.lerp(V(),f);const fit=Math.max(size.fitHeight*.5,size.fitWidth*.5/(w/Math.max(1,ht)));launchFrame.half+=f*(fit-launchFrame.half);}
  }
  craftGroup.visible=view!=='orbit'&&(view!=='launch'||!launchFrame?.reference);
 }
 function update(hardware,snapshot){if(!hardware||!snapshot)return;h=hardware;s=snapshot;let k=[h.trays,h.storageTB,h.input.diskModuleTB,h.bodyLengthM,h.bodyWidthM,h.bodyHeightM,h.wingLengthM,h.wingWidthM,h.radiatorLengthM,h.radiatorWidthM,h.input.kaDishM,h.input.opticalApertureM,h.tankVolumeL].join('/');if(k!==meshKey){if(craft){craftSkin?.destroy();craftSkin=null;craftFocus?.destroy();craftFocus=null;custody?.destroy();custody=null;craftGroup.remove(craft.root);disposeGroup(craft.root);}meshKey=k;craft=makeCraft(h);craftGroup.add(craft.root);let span=Math.max(craft.wingspan,craft.spanZ);if(!size)size={span,fitWidth:Math.max(craft.wingspan*1.05,craft.spanZ*.60),fitHeight:Math.max(craft.wingspan*.29+craft.spanZ*.36,span*.48)};pickables=[craft.root];overlayStale=true;}
 updateLaunch();actuate();stagingBounds=s.deployment<.995&&s.deployment>.0001?new T.Box3().setFromObject(craft.root):null;if(overlayStale||layers.length||domainSceneSpecs[focus]?.vectors?.length||focus==='attitude'){arrows();overlayStale=false;}if(selected)selectionBox();updateOrbit();positionVehicle();orbit.visible=view==='orbit';setBg();lightScene();updateThermal();request();}
 function setView(v){const next=cameraView(v);if(next===view&&craft)return;cancelGestures();if(hoverHit)leave({clientX:hoverHit.x,clientY:hoverHit.y});view=next;setBg();if(view!=='orbit'){key.position.set(-4,8,5);rim.position.set(7,2,-6);rim.intensity=1.95;hemi.intensity=1.52;}if(craft)update(h,s);else request();}
 function thermalRow(hit){return (!focus||focus==='thermal'||layers.includes('thermal'))&&hit?.node?(s.thermalQualification||[]).find(r=>r.id===hit.node)||null:null;}
 function refreshLegend(){
  const enabled=layers.includes('thermal')&&showLegend;
  const hit=hoverHit||selectedHit,row=thermalRow(hit);
  legend.set(enabled,legendMode,row,Boolean(hit),thermalScale,s.thermalQualification||[]);
 }
 function setThermalScale(id){
  if((id!=='working'&&id!=='full')||thermalScale===id)return;
  thermalScale=id;if(craft)updateThermal();else refreshLegend();request();
 }
 function updateThermal(){
  const enabled=layers.includes('thermal'),packed=view==='launch'&&launch?.root.visible,reference=packed&&launchFrame?.reference;
  legendMode=view==='orbit'?'Choose Spacecraft or Compute Core to inspect hardware temperatures.':reference?'Stowed design reference. Switch to Spacecraft for the flight temperatures.':s.thermalQualification?.some(r=>r.status!=='unassessed'&&Number.isFinite(r.temperatureK))?'':'Temperature data unavailable for this instant.';
  const active=enabled&&!legendMode;
  if(active&&craftGroup.visible){craftFocus?.clear();craftSkin??=thermalSkin(craft.root);craftSkin.apply(s.thermalQualification,gpu?renderer.getPixelRatio():1,thermalScale);}
  else{craftSkin?.clear();if(focus){craftFocus??=focusHardware(craft.root);craftFocus.apply(focus,selected);}else craftFocus?.clear();}
  if(active&&packed){launchFocus?.clear();launchSkin??=thermalSkin(launch.root);launchSkin.apply(s.thermalQualification,gpu?renderer.getPixelRatio():1,thermalScale);}
  else{launchSkin?.clear();if(focus&&launch?.root.visible){launchFocus??=focusHardware(launch.root);launchFocus.apply(focus,selected);}else launchFocus?.clear();}
  if(focus==='data'&&craftGroup.visible&&view!=='orbit'&&!s.referenceBody){if(!custody){custody=dataRoutes(craft,h);craft.root.add(custody.root);}custody.update(s,true);}else if(custody)custody.update(s,false);
  refreshLegend();
 }
 const ray=new T.Raycaster(),pointer=new T.Vector2(),touches=new Map();let drag=null;
 function partAt(e){
  if(!craft||view==='orbit')return null;
  const bounds=cv.getBoundingClientRect();pointer.set(2*(e.clientX-bounds.left)/bounds.width-1,1-2*(e.clientY-bounds.top)/bounds.height);ray.setFromCamera(pointer,camera);
  const target=view==='launch'&&launch?.root.visible?launch.root:craft.root,reference=target===launch?.root&&launchFrame?.reference;
  for(const hit of ray.intersectObjects(target===launch?.root&&craftGroup.visible?[target,craft.root]:[target],true)){
   if(!hit.object.isMesh||hit.object.material?.userData.domainGhost||hit.object.userData.sceneFlow)continue;let obj=hit.object,id=null,visible=true;
   while(obj){if(!obj.visible){visible=false;break;}if(!id&&obj.userData.part)id=obj.userData.part;obj=obj.parent;}
   if(visible&&id)return {id,node:reference?null:hit.object.userData.thermalNode};
  }return null;
 }
 function hoverPart(e){const hit=partAt(e);if(hit||hoverHit)onHover(hit?.id||null,e.clientX,e.clientY,thermalRow(hit));hoverHit=hit?{...hit,x:e.clientX,y:e.clientY,t:s.t}:null;refreshLegend();cv.style.cursor=hit?'pointer':'grab';}
 function leave(e){if(hoverHit){hoverHit=null;onHover(null,e.clientX,e.clientY,null);refreshLegend();}}
 function panBasis(){
  setCamera();const perPx=2*halfAtFocus/Math.max(1,ht);
  return {origin:pan[view].clone(),right:V().setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(-perPx),up:V().setFromMatrixColumn(camera.matrixWorld,1).multiplyScalar(perPx)};
 }
 function panTo(basis,dx,dy){pan[view].copy(basis.origin).addScaledVector(basis.right,dx).addScaledVector(basis.up,dy);}
 function touchPair(){const pts=Array.from(touches.values()),a=pts[0],b=pts[1];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.max(2,Math.hypot(a.x-b.x,a.y-b.y))};}
 function cancelGestures(){drag=null;touches.clear();cv.style.cursor='grab';}
 function down(e){
  if(e.pointerType!=='touch'&&e.button!==0&&e.button!==1)return;
  leave(e);if(e.button===1||e.pointerType==='touch')e.preventDefault();cv.setPointerCapture(e.pointerId);
  if(e.pointerType==='touch'){
   touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(touches.size>=2){const q=touchPair();drag={mode:'touch',...q,basis:panBasis(),zoom:pose[view][2],moved:true};cv.style.cursor='grabbing';return;}
  }
  const middle=e.button===1;drag={mode:middle?'pan':'orbit',id:e.pointerId,x:e.clientX,y:e.clientY,az:pose[view][0],el:pose[view][1],moved:false,basis:middle?panBasis():null};cv.style.cursor='grabbing';
 }
 function move(e){
  if(!drag){if(e.pointerType!=='touch')hoverPart(e);return;}
  if(e.pointerType==='touch'&&touches.has(e.pointerId))touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(drag.mode==='touch'){
   if(touches.size<2)return;const q=touchPair();panTo(drag.basis,q.x-drag.x,q.y-drag.y);pose[view][2]=clamp(drag.zoom*q.distance/drag.distance,.25,10);request();return;
  }
  if(e.pointerId!==drag.id)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>3)drag.moved=true;
  if(drag.moved){if(drag.mode==='pan')panTo(drag.basis,dx,dy);else{pose[view][0]=drag.az-dx*.008;pose[view][1]=clamp(drag.el+dy*.009,-1.52,1.52);}request();}
 }
 function up(e){
  touches.delete(e.pointerId);if(!drag)return;
  if(drag.mode==='touch'&&touches.size){const [id,q]=touches.entries().next().value;drag={mode:'orbit',id,x:q.x,y:q.y,az:pose[view][0],el:pose[view][1],moved:true};return;}
  const pick=drag.mode==='orbit'&&!drag.moved&&e.button!==1;cancelGestures();
  if(pick){selectedHit=partAt(e);refreshLegend();if(selectedHit)onPick(selectedHit.id,thermalRow(selectedHit));}
 }
 function zoom(mult){pose[view][2]=clamp(pose[view][2]*mult,.25,10);request();}
 function resetCamera(){
  pose[view]=[...defaultPose[view],1];pan[view].set(0,0,0);
  if(craft){const span=Math.max(craft.wingspan,craft.spanZ);size={span,fitWidth:Math.max(craft.wingspan*1.05,craft.spanZ*.6),fitHeight:Math.max(craft.wingspan*.29+craft.spanZ*.36,span*.48)};}request();
 }
 function keyMove(e){
  const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},d=arrows[e.key];
  if(d){if(e.shiftKey)panTo(panBasis(),d[0]*24,d[1]*24);else{pose[view][0]+=d[0]*.1;pose[view][1]=clamp(pose[view][1]-d[1]*.1,-1.52,1.52);}}
  else if(e.key==='+'||e.key==='=')zoom(1.15);else if(e.key==='-')zoom(1/1.15);else if(e.key==='Home')resetCamera();else return;e.preventDefault();request();
 }
 cv.addEventListener('pointerleave',leave);cv.addEventListener('pointerdown',down);cv.addEventListener('pointermove',move);cv.addEventListener('pointerup',up);
 cv.addEventListener('pointercancel',cancelGestures);cv.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
 cv.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(clamp(-e.deltaY*.0015,-.5,.5)));},{passive:false});cv.addEventListener('keydown',keyMove);
 setBg();resize();return {update,setView,
  setDomain(id,missionPhase){
   const next=Object.hasOwn(domainSceneSpecs,id)?id:'',nextPhase=String(missionPhase||'');
   if(domain===next&&phase===nextPhase)return;domain=next;phase=nextPhase;focus=['C','D','E'].includes(phase)?domain:'';
   hoverHit=selectedHit=null;overlayStale=true;if(craft)update(h,s);else request();
  },
resetCamera,resize,setThermalScale,getThermalScale:()=>thermalScale,
  getCameraState(){return Object.fromEntries(Object.keys(pose).map(k=>[k,[...pose[k],...pan[k].toArray()]]));},
  setCameraState(states){for(const k of Object.keys(pose)){const a=states?.[k];if(!Array.isArray(a)||a.length!==6||!a.every(Number.isFinite))continue;pose[k]=[a[0],clamp(a[1],-1.52,1.52),clamp(a[2],.25,10)];pan[k].set(...a.slice(3));}request();},
  setLegendVisible(value){showLegend=!!value;refreshLegend();},
  setDisposalPlan(p){disposalPlan=p;if(craft&&view==='orbit'){updateOrbit();request();}},setChapter(id){const next=String(id||'');if(chapter===next)return;chapter=next;if(craft&&(view==='launch'||view==='orbit'))update(h,s);},
  setOverlays(ids=[]){const next=Array.from(ids);if(layers.length===next.length&&next.every((v,i)=>v===layers[i]))return;layers=next;if(craft){arrows();updateThermal();}request();},
  highlight(id){const next=pickAliases[id]??id??'';if(!next||selectedHit&&selectedHit.id!==id)selectedHit=null;if(next===selected)return;selected=next;if(craft){actuate();selectionBox();updateThermal();}request();},
  destroy(){alive=false;ro.disconnect();cancelAnimationFrame(raf);craftSkin?.destroy();launchSkin?.destroy();craftFocus?.destroy();launchFocus?.destroy();custody?.destroy();legend.destroy();disposeGroup(scene);if(!gpu){atmosphere.material.dispose();atmosphere.geometry.dispose();}stationMat.dispose();renderer.dispose();cv.remove();tags.remove();}
 };
}
