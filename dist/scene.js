import * as T from './vendor/three.module.js';
import {flightFrames,createEarthBackdrop,eciScene as eci} from './flight-frame.js';
import {createTriad} from './coordinate-triad.js';
import {padSky} from './launch-art.js';
import {makeLaunch} from './launch-scene.js';
import {makeCraft} from './craft.js';
import {thermalSkin,temperatureLegend} from './thermal-view.js';
import {domainSceneSpecs,domainInstruments} from './domain-scene.js';
import {propulsionReview} from './spacecraft-architecture.js';
import {focusHardware,dataRoutes,hardwareAnchor} from './hardware-focus.js';
import {launchContextBadge} from './launch-context.js';
import {softRenderer} from './software-scene.js';
import {deploymentSchedule,deploymentLayout,leafPose,leafCorners,mechanismPose,leafAxes} from './deployment.js';
import {ascentTrack,launchPath} from './launch-path.js';
import {launchSiteFor} from './launch-sites.js';
import {geometry,groundSites,R,DEG,MU} from './orbit.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Y=V(0,1,0),TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const cameraView=s=>/launch|fairing/i.test(s)?'launch':/earth|orbit/i.test(s)?'orbit':/core/i.test(s)?'core':'spacecraft';
const pickAliases={enclosure:"structure",pv:'solar',array:'solar',arrays:'solar',radiators:'radiator',cmgs:'cmg',antennas:'communications',tanks:'propellant',coolant:'radiator',batteries:'battery',shielding:'structure',engine:'propulsion',prop:'propellant',attitude:'cmg',battery:'battery',trays:'compute'};
const defaultPose={spacecraft:[.61,.49],core:[2.60,.47],orbit:[.54,.33],launch:[.46,.27],bay:[.40,.29]};
export function bayWorkAreaPoints(launch,h){
 const {shell,payload,upper,lower}=launch.parts,{station,floorY,layout}=launch.bay,r=h.stowedDiameterM/2;
 const boxes=[];
 const article=new T.Box3(V(-r,0,-r),V(r,h.stowedLengthM,r)).applyMatrix4(payload.matrixWorld);
 boxes.push(article,new T.Box3(V(-r,floorY,-r),V(r,0,r)));
 const halves=shell.children.filter(o=>o.userData.halfSide);
 for(const part of halves.length?halves:[shell]){
  const bounds=new T.Box3().setFromObject(part);
  bounds.expandByScalar(.15);boxes.push(bounds);
 }
 // Exclude stage exhaust effects from the camera bounds. The cold receiver
 // includes its visible propellant barrel, flaps, engine bells and support.
 const receiver=upper.visible?upper:lower;
 if(receiver.visible){
  const extent=layout.star?8.2:Math.max(layout.radius,launch.geometry.diameterM/2)+.15;
  boxes.push(new T.Box3(V(-extent,-layout.stage2-2.8,-extent),V(extent,0,extent)).applyMatrix4(receiver.matrixWorld));
  boxes.push(new T.Box3(V(layout.receiverX-extent,floorY,-extent),V(layout.receiverX+extent,floorY+.1,extent)));
 }
 boxes.push(new T.Box3(V(layout.ringX-layout.radius,floorY,-layout.radius),V(layout.ringX+layout.radius,0,layout.radius)));
 for(const item of station.children)if(item.visible)boxes.push(new T.Box3().setFromObject(item));
 return boxes.flatMap(({min,max})=>[min.x,max.x].flatMap(x=>[min.y,max.y].flatMap(y=>[min.z,max.z].map(z=>V(x,y,z)))));
}
export function fitBayWorkArea(points,dir,aspect,look,minEyeY,zoom=1){
 const right=Y.clone().cross(dir).normalize(),up=V(),slope=Math.tan(17*DEG);
 const tx=slope*aspect*.89,ty=slope*.83;
 function fit(){
  up.copy(dir).cross(right);
  let left=Infinity,bottom=Infinity,back=Infinity,rightmost=-Infinity,top=-Infinity,front=-Infinity;
  // A nearby shell rim appears larger than an equal rim at the target plane.
  for(const p of points){
   const x=p.dot(right),y=p.dot(up),z=p.dot(dir);
   left=Math.min(left,x-tx*z);rightmost=Math.max(rightmost,x+tx*z);
   bottom=Math.min(bottom,y-ty*z);top=Math.max(top,y+ty*z);
   back=Math.min(back,z);front=Math.max(front,z);
  }
  const centerZ=(back+front)/2;
  look.copy(right).multiplyScalar((left+rightmost)/2).addScaledVector(up,(bottom+top)/2).addScaledVector(dir,centerZ);
  return (Math.max((rightmost-left)/(2*tx),(top-bottom)/(2*ty))-centerZ)*slope;
 }
 let half=fit();
 if(dir.y<0&&look.y+dir.y*half/(slope*zoom)<minEyeY){
  // Settle the camera at floor height while preserving orbit azimuth, viewing
  // distance and fit. Lifting only the eye after fitting would clip the nose.
  let low=Math.asin(dir.y),high=0;
  const horizontal=V(dir.x,0,dir.z).normalize();
  function pitch(angle){dir.copy(horizontal).multiplyScalar(Math.cos(angle));dir.y=Math.sin(angle);return fit();}
  for(let i=0;i<10;i++){
   const mid=(low+high)/2;
   half=pitch(mid);
   if(look.y+dir.y*half/(slope*zoom)<minEyeY)low=mid;else high=mid;
  }
  half=pitch(high);
 }
 return half;
}
function line(p,pts,color,opacity=1,dash=0){let g=new T.BufferGeometry().setFromPoints(pts);let m=dash?new T.LineDashedMaterial({color,dashSize:dash,gapSize:dash*.66,transparent:true,opacity}):new T.LineBasicMaterial({color,transparent:true,opacity});let l=new T.Line(g,m);if(dash)l.computeLineDistances();p.add(l);return l;}
function arrow(p,start,dir,extent,color,dash=0){const q=dir.clone().normalize(),end=start.clone().addScaledVector(q,extent);line(p,[start,end],color,.88,dash);const head=new T.Mesh(new T.ConeGeometry(extent*.02,extent*.08,8),new T.MeshBasicMaterial({color}));head.position.copy(end).addScaledVector(q,-extent*.04);head.quaternion.setFromUnitVectors(Y,q);p.add(head);}
function disposeGroup(group){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 group.traverse(obj=>{if(obj.geometry&&!obj.geometry.userData.shared)geometries.add(obj.geometry);for(const m of [].concat(obj.material||[]))if(!m.userData.shared){materials.add(m);if(m.map)textures.add(m.map);}});
 for(const item of [...geometries,...materials,...textures])item.dispose();
}
export function createScene(container,{onPick=()=>{},onHover=()=>{},onThermalScale=()=>{}}={}){
 let cv=document.createElement('canvas');cv.style.cssText='display:block;position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab;outline:none';cv.setAttribute('aria-label','Interactive 3D view. Left drag rotates. Middle drag pans. Scroll zooms. Two fingers pan or pinch. Arrow keys rotate, Shift and arrows pan, plus and minus zoom. Home resets this camera.');cv.tabIndex=0;container.append(cv);let renderer,gpu=true;try{let context=cv.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'})||cv.getContext('webgl',{alpha:true,antialias:true});if(!context)throw Error();renderer=new T.WebGLRenderer({canvas:cv,context,alpha:true,antialias:true});renderer.setClearColor(0x0a1018,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;}catch{gpu=false;if(cv.getContext('2d')===null){let fresh=cv.cloneNode();cv.replaceWith(fresh);cv=fresh;}renderer=softRenderer(cv);}
 const triad=createTriad(container);
 let framedDesign=null,bodyPoints=[],deploymentLens='vehicle',bayFit=null;
 const scene=new T.Scene(),craftGroup=new T.Group(),orbit=new T.Group();scene.add(craftGroup,orbit);const orthCamera=new T.OrthographicCamera(-10,10,10,-10,.001,5000),launchCamera=new T.PerspectiveCamera(34,1,.04,2000);let camera=orthCamera;const hemi=new T.HemisphereLight(0xe5f4ff,0xb8a58f,1.52),key=new T.DirectionalLight(0xffedcf,3.2),rim=new T.DirectionalLight(0xabcfff,1.95);key.position.set(-4,8,5);rim.position.set(7,2,-6);scene.add(hemi,key,rim,key.target);if(gpu){renderer.shadowMap.type=T.PCFSoftShadowMap;key.shadow.mapSize.set(1024,1024);key.shadow.normalBias=.028;}
 let launchLens='wide',bayLens='overview',bayLabels=true;
 let domain='',phase='',focus='',craftFocus=null,launchFocus=null,custody=null,stagingBounds=null,chapter='',launch=null,launchKey='',launchFrame=null;let view='spacecraft',size,h={},s={},craft=null,pose={spacecraft:[...defaultPose.spacecraft,1],core:[...defaultPose.core,1],orbit:[...defaultPose.orbit,1],launch:[...defaultPose.launch,1],bay:[...defaultPose.bay,1]},w=0,ht=0,selected='',layers=[],annotation=new T.Group(),selection=new T.Group(),beamGroup=new T.Group(),arrowSig='',pickables=[],raf=0,alive=true,orbitSig='',stationSig='',texture=null, lastPaint=0,frameKey='',meshKey='',overlayStale=true;
 const pan=Object.fromEntries(Object.keys(defaultPose).map(k=>[k,V()]));let halfAtFocus=1;
 let bayIsolate=true;
 let thermalScale='working',craftSkin=null,launchSkin=null,showLegend=true,legendMode='',hoverHit=null,selectedHit=null;
 craftGroup.add(annotation,selection,beamGroup);const spin=new T.Group();orbit.add(spin);const earth=new T.Mesh(new T.SphereGeometry(1,96,56),new T.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0}));spin.add(earth);texture=new T.TextureLoader().load('./vendor/earth-atmos.jpg',()=>request());texture.colorSpace=T.SRGBColorSpace;earth.material.map=texture;earth.material.userData.globeTexture=true;
 const atmosphere=new T.Mesh(new T.SphereGeometry(1.017,64,40),new T.ShaderMaterial({uniforms:{tint:{value:new T.Color('#73b5e7')},solar:{value:V(1,0,0)}},vertexShader:'varying vec3 n;varying vec3 v;varying vec3 worldNormal;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);worldNormal=normalize(mat3(modelMatrix)*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;varying vec3 worldNormal;uniform vec3 tint;uniform vec3 solar;void main(){float f=pow(1.-abs(dot(normalize(n),normalize(v))),5.);float daylight=smoothstep(-.22,.18,dot(normalize(worldNormal),solar));gl_FragColor=vec4(tint,f*(.060+.65*daylight));}',transparent:true,side:T.FrontSide,depthWrite:false}));atmosphere.material.userData.airglow=true;atmosphere.renderOrder=1;orbit.add(atmosphere);
 const backdrop=createEarthBackdrop(earth,atmosphere);let flightFrame=null;
 function skyVisible(){return flightFrame&&view!=='orbit'&&s.altitudeKm>0&&!s.referenceBody&&(view==='launch'?launchFrame?.environment==='space':s.t>=540);}
 function bodyCamera(){return view==='core'||chapter==='commissioning'&&deploymentLens!=='vehicle';}
 const trace=new T.Group();orbit.add(trace);const originPin=new T.Mesh(new T.SphereGeometry(.0085,12,8),new T.MeshBasicMaterial({color:0x7ee0d9}));spin.add(originPin);originPin.visible=false;const mark=new T.Mesh(new T.SphereGeometry(.011,12,8),new T.MeshBasicMaterial({color:0xffb363}));orbit.add(mark);const ring=new T.Mesh(new T.RingGeometry(.021,.024,40),new T.MeshBasicMaterial({color:0xffb363,side:T.DoubleSide,depthWrite:false}));orbit.add(ring);const sites=new T.Group();spin.add(sites);const stationMat=new T.MeshBasicMaterial({color:0x92ddcd});stationMat.userData.shared=true;const trackBeam=line(orbit,[V(),V()],0x7dedd4,.9);
 const groundTrail=new T.Group(),orbitAxes=new T.Group();let trailStamp='';
 spin.add(groundTrail);orbit.add(orbitAxes);
 for(const [dir,color] of [[V(1,0,0),0xf79d89],[V(0,1,0),0xa2db96],[V(0,0,1),0x8dc8ff]])arrow(orbitAxes,V(),dir,.10,color);
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
   container.style.backgroundColor='#060b12';container.style.backgroundImage='radial-gradient(ellipse at 48% 43%, #101a25, #060b12 70%)';
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
 const inBay=()=>view==='launch'&&phase==='D'&&s.flightPhase==='integration'&&launchFrame?.environment==='hangar'&&launch?.bay;
 const poseKey=()=>inBay()?'bay':view;
 function setCamera(){if(!w||!ht)return;let [az,elevation,zoom]=pose[poseKey()];if(view==='launch'&&h.input?.launcher==='starship'&&launchFrame&&!launchFrame.directCraft&&s.t>=-600)az+=launchLens==='ship'?.94:2.46;if(inBay()&&launch.bay.layout.star&&['overview','payload'].includes(bayLens))az+=2.44;
 if(chapter==='commissioning'&&view==='spacecraft')az+=1.68;if(view==='orbit'&&onPhaseF()&&disposalPlan?.feasible){
  const pt=disposalPlan.method==='reentry'?(disposalPlan.impact||disposalPlan.target):disposalPlan.groundTrack?.at(-1);
  if(pt){const d=disposalPlan.method==='graveyard'&&graveFocus?graveFocus:surface(pt,1).applyAxisAngle(Y,s.earthRotationRad||0);az+=Math.atan2(d.x,d.z)-defaultPose.orbit[0];elevation=clamp(elevation+Math.asin(d.y)-defaultPose.orbit[1],-1.48,1.48);}
 }
 if(view==='orbit'&&!onPhaseF()&&s.positionECI&&s.normal){
  const aim=eci(s.positionECI).normalize().addScaledVector(eci(s.normal).normalize(),.55).normalize();
  az+=Math.atan2(aim.x,aim.z)-defaultPose.orbit[0];elevation=clamp(elevation+Math.asin(aim.y)-defaultPose.orbit[1],-1.48,1.48);
 }
 const offset=focus&&['core','spacecraft'].includes(view)?({data:[-.27,.31],comm:[.15,.21],attitude:[.23,.22],prop:[.18,-.38],compute:[.42,-.05],power:[-.18,.06]})[focus]:null;
 if(offset){az+=offset[0];elevation=clamp(elevation+offset[1],-1.48,1.48);}
 const el=elevation-(view==='launch'&&launchFrame?.environment==='ground'?.10:0);const bodyOrbit=view==='core'||view==='spacecraft',viewUp=bodyOrbit?V(0,0,1):Y;const dir=bodyOrbit?V(Math.sin(az)*Math.cos(el),-Math.cos(az)*Math.cos(el),Math.sin(el)):V(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el));if(bodyOrbit&&skyVisible()&&!bodyCamera()){dir.applyQuaternion(flightFrame.orbitalToBody);viewUp.applyQuaternion(flightFrame.orbitalToBody);}
 const aspect=w/ht;const launchConfig=view==='launch'&&launchFrame&&!launchFrame.directCraft,look=launchConfig?launchFrame.center.clone():V();let half;if(launchConfig)half=Math.max(launchFrame.half,launchFrame.half*.85/aspect);else if(view==='orbit')half=Math.max(1.32,1.37/aspect);else if(view==='core'||view==='spacecraft'&&domainSceneSpecs[focus]?.close)half=Math.max(h.bodyHeightM*.82+h.bodyLengthM*.20,(h.bodyLengthM*.64+h.bodyWidthM*.7)/aspect);else if(size){half=Math.max(size.fitHeight*.5,size.fitWidth*.5/aspect);}else half=10;
 if(focus==='prop'&&view==='core'){look.copy(craft.root.localToWorld(V(0,0,-h.bodyLengthM*.07)));half*=1.04;}
 if(focus==='data'&&view!=='launch'&&view!=='orbit'){look.copy(craft.root.localToWorld(V(0,0,-h.bodyLengthM*.16)));half*=.88;}
 if(launchConfig&&phase==='D'&&s.t>40&&focus==='launch'&&!launchFrame.reference&&['pad','ascent','insertion'].includes(s.flightPhase)){
  const ends=launch.parts.stage.localToWorld(V(0,s.flightPhase==='insertion'?-h.bodyLengthM*.45:-(launch.geometry.upperLengthM||h.stowedLengthM)*.30,0));
  const payload=launch.parts.payload.localToWorld(V(0,h.stowedLengthM*.55,0));look.copy(ends).lerp(payload,.57);
  half=Math.max(h.fairing.heightM*.82,ends.distanceTo(payload)*.71,h.stowedDiameterM*1.7/aspect);
 }
 if(launchConfig&&!inBay()&&!launchFrame.reference&&phase==='D'&&focus&&!['launcher','launch','conops','orbit'].includes(focus)){
  craft.root.updateWorldMatrix(true,false);const coreOnly=domainSceneSpecs[focus].close;
  look.copy(craft.root.localToWorld(V(0,0,coreOnly?0:(h.stowedLengthM-h.bodyLengthM)*.32)));
  half=coreOnly?Math.max(h.bodyHeightM*1.30,h.bodyLengthM*.72/aspect):Math.max(h.stowedLengthM*.73,h.bodyWidthM*1.9/aspect);
 }
 if(launchConfig&&phase==='D'&&launchLens==='base'&&launch.parts.boosterBase&&s.t<100&&s.t>=-600){
  look.copy(launch.parts.boosterBase.getWorldPosition(V()));half=Math.max(launch.geometry.diameterM*.5,2)*3.9;
 }
 if(launchConfig&&phase==='D'&&launchLens==='ship'&&h.input.launcher==='starship'&&s.t>=-600){
  const geo=launch.geometry,shipHeight=geo.heightM-geo.lowerLengthM;look.copy(launch.parts.upper.localToWorld(V(0,shipHeight*.5-geo.upperLengthM,0)));
  half=Math.max(shipHeight*.56,geo.diameterM/aspect);
 }
 if(launchConfig&&phase==='D'&&launchLens==='pad'&&s.t>=-600&&s.t<35){
  const g=launch.geometry,r=g.diameterM/2;look.copy(launch.parts.tower.localToWorld(V(0,-g.lowerLengthM-g.upperLengthM-r*1.8,0)));
  half=Math.max(12,r*6.4);
 }
 if(view==='spacecraft'&&!domainSceneSpecs[focus]?.close&&(s.deployment>=.995||chapter==='commissioning')){
  if(framedDesign!==h){const layout=deploymentLayout(h);
   bodyPoints=[0,.54,.59,.77,.82,1].flatMap(u=>layout.descriptors.flatMap(d=>leafCorners(leafPose(layout,d,u,h.input.solarTiltDeg),d).map(p=>V(...p))));
   for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])bodyPoints.push(V(x*h.bodyWidthM*.6,y*h.bodyHeightM*.6,z*h.bodyLengthM*.65));
   framedDesign=h;
  }
  const right=viewUp.clone().cross(dir).normalize(),up=dir.clone().cross(right);
  const current=s.deployment>=.995?deploymentLayout(h).descriptors.flatMap(d=>leafCorners(leafPose(deploymentLayout(h),d,s.deployment,h.input.solarTiltDeg,s),d).map(p=>V(...p))):[];

  let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
  for(const point of [...bodyPoints,...current]){const q=point.clone().applyQuaternion(craft.root.quaternion),x=q.dot(right),y=q.dot(up);
   xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}
  look.copy(right).multiplyScalar((xmin+xmax)/2).addScaledVector(up,(ymin+ymax)/2);half=Math.max((xmax-xmin)/aspect,ymax-ymin)*.57;
 }
 if(stagingBounds&&chapter!=='commissioning'&&view!=='core'&&view!=='orbit'&&!launchConfig){const ext=stagingBounds.getSize(V()),right=viewUp.clone().cross(dir).normalize(),up=dir.clone().cross(right),extent=u=>Math.abs(u.x)*ext.x+Math.abs(u.y)*ext.y+Math.abs(u.z)*ext.z;look.copy(stagingBounds.getCenter(V()));half=Math.max(half,extent(right)*.53/aspect,extent(up)*.53);}
 if(chapter==='commissioning'&&view==='spacecraft'&&deploymentLens!=='vehicle'){
  const g=deploymentLayout(h),m=mechanismPose(g,s.deployment,h.input.solarTiltDeg,s);
  if(deploymentLens==='wing'){
   const wing=m.wings.find(w=>w.side===1&&w.end===1);
   look.copy(craft.root.localToWorld(V(...wing.tip)));half=Math.max(g.ww*.82,g.ww*.76/aspect,.6);
  }else{
   const bank=m.banks[s.deployment>=.69?1:0];
   look.copy(craft.root.localToWorld(V(...bank.elbow)));half=Math.max(g.r*.75,g.rw*.60/aspect,.6);
  }
 }
 if(inBay()){
  const bay=launch.bay,cart=bay.equipmentAnchor.getWorldPosition(V()),port=bay.portAnchor.getWorldPosition(V());
  const r=h.fairing.outerDiameterM/2,lowest=bay.floorY,top=h.stowedLengthM;
  if(bayLens==='payload'){
   look.copy(launch.parts.payload.localToWorld(V(0,h.stowedLengthM*.48,0)));
   half=Math.max(h.stowedLengthM*.74,(Math.max(h.stowedDiameterM,r*1.65)*.66+.65)/aspect);
  }else if(bayLens==='equipment'){look.copy(cart);half=Math.max(1.22,1.38/aspect);}
  else if(bayLens==='interface'){look.copy(port);half=Math.max(.82,1.05/aspect);}
  else if(bay.layout.star||['launch','launcher','conops'].includes(focus)||launchFrame.bayTime>-3000){
   if(bayFit?.launch!==launch||bayFit.bayTime!==launchFrame.bayTime||bayFit.station!==bay.station.userData.stationId){
    bayFit={launch,bayTime:launchFrame.bayTime,station:bay.station.userData.stationId,points:bayWorkAreaPoints(launch,h)};
   }
   half=fitBayWorkArea(bayFit.points,dir,aspect,look,bay.floorY+.35-pan.bay.y,zoom);
  }else{
   look.set(.12*cart.x,lowest+.42*(top-lowest),cart.z*.26);
   half=Math.max((top-lowest)*.63,(2.25*r+1.2)/aspect,2.7);
  }
 }
 half/=zoom;halfAtFocus=half;look.add(pan[poseKey()]);const perspective=view==='launch';camera=perspective?launchCamera:orthCamera;const dist=perspective?half/Math.tan(17*DEG):view==='orbit'?5:Math.max(40,(size?.span??20)*4);camera.position.copy(dir).multiplyScalar(dist).add(look);if(inBay()){camera.position.y=Math.max(camera.position.y,launch.bay.floorY+.35);look.y=Math.max(look.y,launch.bay.floorY+.1);}camera.up.copy(viewUp);camera.lookAt(look);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.near=perspective?.07:.001;camera.far=dist*(launchConfig?55:4);if(perspective)camera.aspect=aspect;camera.updateProjectionMatrix();camera.updateMatrixWorld();ring.quaternion.copy(camera.quaternion);}
 function anchorFor(id){
  if(view==='orbit'){
   if(id==='orbitCraft')return mark.getWorldPosition(V());
   if(id==='station'&&s.stationECI)return eci(s.stationECI,1/R);
   if(id==='orbitGround')return s.positionECI?eci(s.positionECI,1/R).normalize():null;return null;
  }
  if(view==='launch'&&launch&&launchFrame&&!launchFrame.directCraft){const {payload,liveMount,stage,upper,shell}=launch.parts;
   if(id==='boosterBase')return launch.parts.boosterBase?.getWorldPosition(V());
   if(id==='padWorks')return launch.parts.tower.localToWorld(V(0,-launch.geometry.upperLengthM-launch.geometry.lowerLengthM-launch.geometry.diameterM*.9,0));
   if(id==='hotstage')return launch.parts.lower.localToWorld(V(0,-launch.geometry.upperLengthM,0));
   if(id==='interface')return payload.localToWorld(V(0,.18,0));
   if(id==='payload')return liveMount.getWorldPosition(V());
   if(id==='thrustDeck'){const q=launch.parts.boosters?.[0];return q&&q.visible?q.localToWorld(V(0,launch.geometry.lowerLengthM*.51,0)):launch.parts.lower.localToWorld(V(0,-launch.geometry.upperLengthM-launch.geometry.lowerLengthM*.75,0));}
   if(id==='rocket')return stage.localToWorld(V(0,-(launch.geometry?.upperLengthM||h.input.fairingLengthM)*1.12,0));
   if(id==='shroud')return (shell.visible?shell:upper).localToWorld(V(0,shell.visible?(h.fairing?.heightM||12)*.43:-1,0));
  }
  return hardwareAnchor(id,craft,h,s);
 }
 function bayCaptions(){
  if(!bayLabels)return;
  const bay=launch.bay,equipment=bay.equipmentAnchor,tool=bay.station.name||'Ground equipment';
  const points=bayLens==='overview'?[[bay.vehicleAnchor,'Stowed spacecraft','payload'],[equipment,tool,'equipment']]:bayLens==='payload'?[[bay.vehicleAnchor,'Stowed spacecraft','payload']]:bayLens==='equipment'?[[equipment,tool,'equipment']]:[[bay.portAnchor,bay.interfaceLabel||'Test point','interface']];
  if(bayLens==='overview'&&['launcher','launch','conops'].includes(focus)){
   points.push([bay.receiverAnchor,bay.layout.star?'Starship tanks and Raptors':bay.layout.horizontal?'Upper stage on cradle':bay.layout.record.family==='cz5'?'Single-stage core':'Receiving stage',null]);
  }
  for(const [anchor,name,lens] of points){
   const q=anchor.getWorldPosition(V()).project(camera);
   if(q.z< -1||q.z>1||Math.abs(q.x)>.97||Math.abs(q.y)>.94)continue;
   const x=(q.x+1)*w/2,y=(1-q.y)*ht/2,right=x<.64*w;
   const pin=document.createElement(lens?'button':'span');if(lens)pin.type='button';pin.className='bay-pin'+(right?'':' bay-pin-left');
   if(lens){pin.dataset.bayLens=lens;pin.setAttribute('aria-label','Inspect '+name.toLowerCase())}else pin.style.pointerEvents='none';pin.textContent=name;pin.style.left=x+'px';pin.style.top=y+'px';
   const available=Math.max(45,(right?w-x:x)-26);pin.style.maxWidth=Math.min(184,available)+'px';tags.append(pin);
  }
 }
 function domainCaptions(){
  if(inBay()){bayCaptions();return;}
  if(!focus)return;
  if(view==='launch'&&phase==='D'&&launchFrame&&!launchFrame.directCraft&&!['launcher','conops','orbit'].includes(focus)){
   const badge=document.createElement('div');badge.setAttribute('data-stage-context',s.flightPhase||'');badge.style.cssText='position:absolute;left:10px;top:38px;background:#101c26ee;color:#f0d5a9;border:1px solid #526771;border-radius:4px;padding:5px 6px 3px;text-align:center;font:600 8px/1.3 ui-monospace,monospace;letter-spacing:.05em';
   badge.innerHTML='<span style="display:block">STACK CONTEXT</span>'+launchContextBadge(launch,h,s);tags.append(badge);
  }
  let entries;
  if(view==='spacecraft'&&chapter==='commissioning'){
   const g=deploymentLayout(h),motion=mechanismPose(g,s.deployment,h.input.solarTiltDeg,s);
   const wing=motion.wings.find(v=>v.side===1&&v.end===1),bank=motion.banks[s.deployment>=.69?1:0];
   const mark=(anchor,bodyPoint,side,title,value,color)=>({anchor,bodyPoint,side,title,value,color});
   const detail=deploymentLens==='hinge'||(deploymentLens==='vehicle'&&s.deployment>=.46&&s.deployment<.92);
   entries=detail?[mark('radiator-root',bank.root,'left','Radiator root',Math.round(Math.abs(bank.rootPitch)*180/Math.PI)+'° from stow','#f1ac65'),mark('radiator-elbow',bank.elbow,'right','Outer hinge',Math.round(180-Math.abs(bank.outerPitch-bank.rootPitch)*180/Math.PI)+'° open','#a5d2c8')]:
    [mark('solar-root',wing.root,'left','Fixed wing saddle','Body attachment','#9ed2bf'),mark('solar-tip',wing.tip,'right','Moving tip drum',wing.span.toFixed(2)+' m paid out','#94bfe5')];
  }else if(view==='launch'&&phase==='D'&&['launcher','launch','conops'].includes(focus)&&['pad','ascent'].includes(s.flightPhase)&&s.t<35){
   const site=launchSiteFor(h.input.launcher,h.input.launchSite),star=h.input.launcher==='starship',falcon=h.input.launcher==='falconHeavy';
   const caption=(anchor,side,title,value,color)=>({anchor,side,title,value,color});
   entries=launchLens==='ship'?[caption('shroud','right','Starship V3','Tiled windward face and four flaps','#a7c8d1'),caption('hotstage','left','Ship engine bay','Three sea-level and three vacuum Raptors','#e1ca9c')]:launchLens==='pad'?[caption('padWorks','left','Exhaust routing',site.name,'#9fdace')]:
    launchLens==='base'?[caption('boosterBase','right',falcon?'Landing legs':'Super Heavy',falcon?'Retracted during ascent':'Aft skirt and Raptor cluster','#cbb798')]:
    [caption('hotstage','right',star?'Hot-staging interface':falcon?'Center core':'Stage interface',star?'Ship / Super Heavy':falcon?'Three Merlin cores':h.launcherLabel,'#b8d4db'),
     caption('padWorks','left','Launch mount',site.name+' · '+site.region,'#cca874')];
  }else entries=domainInstruments(focus,h,s,{view,reference:launchFrame?.reference});
  const slots={left:[],right:[]};
  craft.root.updateWorldMatrix(true,true);if(launch&&view==='launch')launch.root.updateWorldMatrix(true,true);
  for(const el of entries){
   const v=el.bodyPoint?craft.root.localToWorld(V(...el.bodyPoint)):anchorFor(el.anchor);if(!v)continue;
   const p=v.project(camera),px=(p.x+1)*w/2,py=(1-p.y)*ht/2;
   if(!Number.isFinite(px+py)||p.z< -1||p.z>1||px<-3||px>w+3||py<0||py>ht)continue;
   slots[el.side].push({...el,px,py});
  }
  const width=Math.min(w<470?128:159,w*.37),pad=w<470?7:13,sep=43;
  for(const side of ['left','right']){
   const ordered=slots[side].sort((a,b)=>a.py-b.py),x=side==='left'?pad:w-pad-width,edge=side==='left'?x+width:x;
   ordered.forEach((el,i)=>{
    const hasBadge=view==='launch'&&phase==='D'&&launchFrame&&!launchFrame.directCraft&&!['launcher','conops','orbit'].includes(focus),lo=(side==='left'&&hasBadge?138:side==='right'?(w<470?110:132):43)+i*sep,hi=Math.max(lo,ht-58-(ordered.length-i-1)*sep),y=clamp(el.py,Math.max(lo,i?ordered[i-1].y+sep:lo),hi);el.y=y;
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
 function render(){raf=0;if(!alive||!w||!ht||!craft||!container.getClientRects().length)return;setCamera();if(inBay())launch.bay.setViewFrom(camera);if(view==='launch')launch?.faceLaunchClouds?.(camera);tags.replaceChildren();if(view==='spacecraft'&&layers.includes('dimensions')){let p=V(0,0,Math.max(h.wingWidthM*1.15,h.bodyLengthM*.7)).applyMatrix4(craft.root.matrixWorld).project(camera);label((p.x+1)*w/2,(1-p.y)*ht/2,`PV span ${craft.wingspan.toFixed(1)} m`);}if(view==='orbit'&&orbitAxes.visible){
   for(const [id,dir] of [['+X',V(.105,0,0)],['+Y',V(0,.105,0)],['+Z',V(0,0,.105)]]){
    const world=orbitAxes.localToWorld(dir);if(world.dot(camera.position)<1)continue;
    const p=world.project(camera);label((p.x+1)*w/2,(1-p.y)*ht/2,id);
   }
  }
  if(view==='orbit'&&s.station&&s.stationECI&&eci(s.stationECI,1/R).dot(camera.position)>1){let p=eci(s.stationECI,1/R).project(camera);label((p.x+1)*w/2,(1-p.y)*ht/2+12,s.station);}if(view==='orbit'&&onPhaseF()&&phaseFGround.visible){spin.updateMatrixWorld(true);for(const {m,name} of landmarks){const v=m.getWorldPosition(V());if(v.dot(camera.position)<=.9)continue;const p=v.project(camera);label((p.x+1)*w/2,(1-p.y)*ht/2+(name==='Target'?-13:14),name);}}
 if(view!=='orbit'&&s.deployment>0&&s.deployment<1)label(w*.5,ht*.14,Math.round(s.deployment*100)+'% · '+deploymentSchedule(s.deployment).title);
 if(selected==='propellant'&&view!=='orbit'&&view!=='launch'){const kg=s.propellantKg??h.propellantKg;label(w*.5,ht*.81,`${kg.toFixed(1)} kg · ${(s.tankFillPct??(h.input.tankFill||0)*100).toFixed(1)}% fill`);}if(view==='launch'&&(launchFrame?.reference||launchFrame?.vehicleStudy))label(w*.5,Math.max(30,ht-30),launchFrame.vehicleStudy?'LAUNCH STACK · CONFIGURATION REFERENCE':'STOWED CONFIGURATION · DESIGN REFERENCE');if(view==='core'&&h.trays>28&&(!focus||focus==='compute'))label(w*.5,ht*.12,'GROUPED RACK VIEW · '+craft.trayRows.length+' ROWS REPRESENT '+h.trays+' TRAYS');if(view==='core'&&!selected&&!focus&&layers.includes('thermal')){const captions=[
   [V(h.bodyWidthM*.54,0,-h.bodyLengthM*.19),'Junction',s.junctionK],
   [V(-h.bodyWidthM*.45,-h.bodyHeightM*.20,h.bodyLengthM*.24),'Coolant',s.coolantK],
   [V(0,h.bodyHeightM*.14,h.bodyLengthM*.5),'Battery',s.batteryK]
  ];craft.root.updateMatrixWorld();for(const [anchor,name,value] of captions){if(!Number.isFinite(value))continue;const p=anchor.applyMatrix4(craft.root.matrixWorld).project(camera);label(clamp((p.x+1)*w/2,58,w-58),clamp((1-p.y)*ht/2,24,ht-22),name+' · '+value.toFixed(1)+' K');}}
  if(view==='launch'&&!inBay()&&phase==='D'&&focus&&!['launch','launcher','conops','orbit'].includes(focus)&&launchFrame&&!launchFrame.directCraft)label(w*.5,Math.max(25,ht-27),s.flightPhase.toUpperCase()+' · '+(s.t<540?'STOWED PAYLOAD CUTAWAY':'SEPARATED PAYLOAD'));if(view==='launch'&&layers.includes('dimensions')&&launchFrame?.environment==='hangar'&&h.fairing){label(w*.5,ht*.16,'KEEP-IN Ø '+h.fairing.maxDiameterM.toFixed(2)+' m · '+h.fairing.heightM.toFixed(2)+' m HIGH');}domainCaptions();const axisBody=view==='launch'&&launchFrame?.reference?launch?.parts.liveMount:craft.root;triad.update(camera,axisBody,view==='orbit');if(skyVisible()){
   backdrop.update(camera,flightFrame,s,w/ht,view==='launch'&&!launchFrame?.directCraft);atmosphere.material.uniforms.solar.value.copy(eci(s.sunECI));
   if(gpu){renderer.autoClear=false;renderer.clear();renderer.render(backdrop.scene,backdrop.camera);renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=true;}
   else{renderer.render(backdrop.scene,backdrop.camera);renderer.render(scene,camera,true);}
  }else renderer.render(scene,camera);if(hoverHit&&hoverHit.t!==s.t&&!drag)hoverPart({clientX:hoverHit.x,clientY:hoverHit.y});lastPaint=performance.now();}
 function request(){if(!alive||raf)return;raf=requestAnimationFrame(render);}
 function resize(){let r=container.getBoundingClientRect();w=Math.floor(r.width);ht=Math.floor(r.height);if(w>0&&ht>0){if(gpu)renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));renderer.setSize(w,ht,false);request();}}
 const ro=new ResizeObserver(resize);ro.observe(container);
 function plotOrbit(){
  const flight=s.flightPhase,ascent=['integration','pad','ascent'].includes(flight),returning=['deorbit','entry'].includes(flight),instant=returning?Math.floor(s.t/5):Math.floor(s.t/3600);
  const stamp=[meshKey,h.input.launcher,h.input.launchSite,h.input.epoch,h.input.altitudeKm,h.input.ecc,h.input.raanDeg,h.input.meanAnomalyDeg,h.input.argPeriDeg,h.input.inclinationDeg,flight,instant].join('/');
  if(stamp===orbitSig)return;orbitSig=stamp;clear(trace);
  if(ascent){
   const insertion=launchPath(h.input),pts=Array.from({length:91},(_,i)=>eci(ascentTrack(insertion,i*6).positionECI,1/R));
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
 function updateOrbit(){
  if(view!=='orbit')return;
  setupStations();plotPhaseF();plotOrbit();
  originPin.visible=phase==='D';if(originPin.visible){const loc=launchSiteFor(h.input.launcher,h.input.launchSite);originPin.position.copy(surface({latDeg:loc.lat,lonDeg:loc.lon},1.003));}trace.visible=!(onPhaseF()&&disposalPlan?.feasible);
  if(s.positionECI){mark.position.copy(eci(s.positionECI,1/R));ring.position.copy(mark.position);}
  spin.rotation.y=s.earthRotationRad||0;atmosphere.material.uniforms.solar.value.copy(eci(s.sunECI));trackBeam.visible=!!s.stationECI;
  if(s.stationECI){trackBeam.geometry.setFromPoints([mark.position,eci(s.stationECI,1/R)]);trackBeam.material.color.setHex(s.goodputMbps>0?0x79edd3:0x7e8e98);trackBeam.material.opacity=s.goodputMbps>0?.98:.50;}
  mark.material.color.setHex(s.burn?0xff7844:0xffb363);ring.scale.setScalar(s.burn?1.7:1);
  orbitAxes.visible=!!flightFrame&&s.t>=540&&focus==='attitude';
  if(orbitAxes.visible){orbitAxes.position.copy(mark.position);orbitAxes.quaternion.copy(flightFrame.body);}
  groundTrail.visible=!onPhaseF()&&s.t>=550&&s.periodSec>0;
  if(groundTrail.visible){
   const slot=Math.floor(s.t/20)*20,stamp=[orbitSig,slot].join('/');
   if(stamp!==trailStamp){trailStamp=stamp;clear(groundTrail);
    const start=Math.max(540,slot-Math.min(900,s.periodSec*.18)),points=[];
    for(let i=0;i<=45;i++){
     const o=geometry(h.input,start+(slot-start)*i/45);
     points.push(eci(o.radial,1.002).applyAxisAngle(Y,-o.earthRotationRad));
    }
    line(groundTrail,points,0x7ecbc9,.75);
   }
  }
 clear(thrustCue);if(onPhaseF()&&disposalPlan?.feasible&&s.burn&&s.velocityECI){const thrust=eci(s.velocityECI).normalize().multiplyScalar(disposalPlan.method==='graveyard'?1:-1);arrow(thrustCue,mark.position,thrust,.13,0xf7c38e);}
 }
 function frameDirection(vec){
  if(!vec||!s.bodyXECI||!s.bodyUpECI)return V(0,1,0);
  const axis=V(...s.bodyXECI),base=V(...s.bodyUpECI),normal=V().crossVectors(axis,base).normalize(),target=V(...vec);
  return V(target.dot(axis),target.dot(base),target.dot(normal)).normalize();

 }
 function arrows(){const keys=[...layers,...(domainSceneSpecs[focus]?.vectors||[])];clear(annotation);if(!craft)return;let span=craft.wingspan,length=span*.21,step=length*.10,a=frameDirection(s.sunECI);if(a.length()<.3)a=V(-.5,.8,.4).normalize();let radialDir=frameDirection(s.radial),ramDir=s.ramBody?V(...s.ramBody).negate():V(0,0,-1);if(keys.includes('sun')&&!s.eclipse)for(let j of [-1,0,1])arrow(annotation,V(j*step,0,0).addScaledVector(a,length*1.6),a.clone().negate(),length,0xf7b862);if(keys.includes('albedo')&&!s.eclipse)arrow(annotation,V(h.bodyWidthM*.75,-length,0),radialDir,length*.7,0x9ed9ec,step*.22);if(keys.includes('ir'))arrow(annotation,V(-h.bodyWidthM*.75,-length,0),radialDir,length*.7,0xee9a7d,step*.33);if(keys.includes('radiator')){
 const g=deploymentLayout(h);
 for(const d of g.descriptors.filter(d=>d.type==='rad')){
  const flow=d.end<0?s.upperRadiatorFlow:s.lowerRadiatorFlow;if(!(flow>0))continue;
  const pos=leafPose(g,d,s.deployment,h.input.solarTiltDeg,s),origin=V(pos.x,pos.y,pos.z).applyQuaternion(craft.root.quaternion);
  const outward=V(...leafAxes(pos)[1]).applyQuaternion(craft.root.quaternion);
  for(const side of [-1,1])arrow(annotation,origin,outward.clone().multiplyScalar(side),length*.28*flow,0xf18b91);
 }
}if(keys.includes('ram'))arrow(annotation,V(0,h.bodyHeightM*.7,0).addScaledVector(ramDir,-length*1.15),ramDir,length*.7,0x98b3f0);if(keys.includes('pressure'))arrow(annotation,V(h.bodyWidthM*.48,0,h.bodyLengthM*.45),ramDir,length*.65,0xe7a383);if(keys.includes('thrust')&&s.burn){const e=h.propulsion.engines[0];arrow(annotation,V((e.x+h.propulsion.engines[1].x)/2,e.y,e.throatZ).applyQuaternion(craft.root.quaternion),V(0,0,1).applyQuaternion(craft.root.quaternion),length*.9,0x82d7bf);}if(focus==='attitude'){const tau=V(s.torqueXNm||0,s.torqueYNm||0,s.torqueZNm||0);if(tau.lengthSq()>1e-18)arrow(annotation,V(0,h.bodyHeightM*.36,0),tau.normalize(),h.bodyWidthM*.53,0xf0b769);}
 if(focus==='prop'&&view!=='orbit'){
  const a=h.propulsion.engines[0],b=h.propulsion.engines[1],mid=(a.x+b.x)/2,q=craft.root.quaternion;
  const cg=V(...propulsionReview(h,s.propellantKg,s).cm).applyQuaternion(q),r=Math.min(.055,h.bodyWidthM*.025);
  for(const dir of [V(r,0,0),V(0,r,0),V(0,0,r)])line(annotation,[cg.clone().sub(dir),cg.clone().add(dir)],0xe9efce,.95);
  line(annotation,[V(mid,a.y,a.z).applyQuaternion(q),V(mid,a.y,h.bodyLengthM*.48).applyQuaternion(q)],0x9dd29e,.7,.06);
 }
 if(keys.includes('dimensions')){const xx=span*.5,zz=Math.max(h.wingWidthM*1.15,h.bodyLengthM*.7);line(annotation,[V(-xx,0,zz-.23),V(-xx,0,zz+.23)],0xc9d5d3);line(annotation,[V(xx,0,zz-.23),V(xx,0,zz+.23)],0xc9d5d3);line(annotation,[V(-xx,0,zz),V(xx,0,zz)],0xc9d5d3,.85);}}
 function selectionBox(){clear(selection);if(!selected||!craft)return;let boxes=[];craft.root.updateMatrixWorld(true);craft.root.traverseVisible(o=>{if(!o.isMesh)return;let a=o;while(a&&!a.userData.part)a=a.parent;if(a?.userData.part!==selected)return;let bb=new T.Box3().setFromObject(o);if(!bb.isEmpty())boxes.push(bb);});if(!boxes.length)return;let box=boxes[0];boxes.slice(1).forEach(b=>box.union(b));box.expandByScalar(.06);selection.add(new T.Box3Helper(box,0xecba75));}
 function actuate(){const depl=clamp(s.deployment??1,0,1);
 craft.positionPanels(depl,s);
 const inspect=launchFrame?.environment==='hangar'&&!bayIsolate?'':focus;
 craft.appendages.visible=view!=='core';const core=view==='core',payloadFocus=view==='launch'&&inspect&&['data','purpose','compute','thermal','comm','attitude','power','prop'].includes(inspect),tank=selected==='propellant'||selected==='propulsion'||inspect==='prop';
 craft.gyroPack.visible=core||inspect==='attitude'||selected==='cmg';craft.skin.visible=!core&&!payloadFocus&&!tank;craft.internal.visible=core||payloadFocus||selected==='cmg'||['compute','data','purpose','attitude','power','thermal','mass'].includes(inspect);
 craft.service.visible=core||payloadFocus||tank||inspect==='mass';craft.shelf.visible=!tank;
 for(const a of craft.cells){
  a.tank.visible=!tank;a.section.visible=tank;
  const kg=s[a.id+'Kg']??h[a.id+'Kg'],frac=clamp(kg/(h.input[a.id+'Density']*a.volumeL),0,1);
  a.fluid.visible=tank&&frac>0;if(a.fluid.visible)a.fluid.scale.setScalar(a.fluidRadiusM*Math.cbrt(frac));
 }

 const standby=V(0,1,0),pointing=s.stationECI&&s.positionECI?frameDirection(s.stationECI.map((a,i)=>a-s.positionECI[i])):standby;
 const localPoint=pointing,head=(real,link)=>real?V(...real).normalize():s.groundLink===link&&s.station?pointing:standby;
 craft.pointTerminals(head(s.dishBoresightBody,'Ka'),head(s.opticalBoresightBody,'Optical'));
 craft.cmgs.forEach(c=>{c.g.rotation.x=c.a*.22+(s.momentumNms??0)/Math.max(1,h.input.cmgMomentumNms)*.7+(s.desat?.15:0);c.rotor.rotation.y=(s.t??0)*3+c.a;});craft.leds.forEach((a,i)=>a.visible=(i%8)/8<(s.activeFraction??.9));craft.plumes.forEach(a=>a.visible=!!s.burn);
 clear(beamGroup);if(s.station&&s.goodputMbps>0&&(!core||['data','comm'].includes(focus))){craft.root.updateMatrixWorld(true);const terminal=s.groundLink==='Optical'?craft.optic:s.groundLink==='S-band'?craft.patches[localPoint.x>0?1:0]:craft.dish,origin=terminal.getWorldPosition(V()),end=origin.clone().addScaledVector(pointing,core?h.bodyLengthM*1.10:craft.wingspan*.7);line(beamGroup,[origin,end],s.groundLink==='Optical'?0xffb989:0x8ceada,.91);const c=new T.Mesh(new T.ConeGeometry(Math.max(.025,h.input.kaDishM*.14),origin.distanceTo(end),14,1,true),new T.MeshBasicMaterial({color:0x6edac4,transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide}));c.position.copy(origin).lerp(end,.5);c.quaternion.setFromUnitVectors(Y,pointing.clone().negate());beamGroup.add(c);}
 }
 function updateLaunch(){
  if(view!=='launch'){if(launch)launch.root.visible=false;launchFrame=null;return;}
  const signature=[meshKey,h.input.launcher,h.input.launchSite,h.input.fairingM,h.input.fairingLengthM,h.stowedLengthM].join('/');
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
 function update(hardware,snapshot){if(!hardware||!snapshot)return;h=hardware;s=snapshot;flightFrame=flightFrames(s);let k=[h.trays,h.storageTB,h.input.diskModuleTB,h.bodyLengthM,h.bodyWidthM,h.bodyHeightM,h.wingLengthM,h.wingWidthM,h.radiatorLengthM,h.radiatorWidthM,h.input.kaDishM,h.input.opticalApertureM,h.tankVolumeL,h.fuelKg,h.oxidizerKg,h.input.thrustN,h.input.engine,...h.propulsion.tanks.flatMap(o=>[o.x,o.y,o.z,o.volumeL]),...h.propulsion.engines.map(o=>o.x+','+o.z)].join('/');if(k!==meshKey){if(craft){craftSkin?.destroy();craftSkin=null;craftFocus?.destroy();craftFocus=null;custody?.destroy();custody=null;craftGroup.remove(craft.root);disposeGroup(craft.root);}meshKey=k;craft=makeCraft(h);craftGroup.add(craft.root);let span=Math.max(craft.wingspan,craft.spanZ);size={span,fitWidth:Math.max(craft.wingspan*1.05,craft.spanZ*.60),fitHeight:Math.max(craft.wingspan*.29+craft.spanZ*.36,span*.48)};pickables=[craft.root];overlayStale=true;}
 updateLaunch();actuate();stagingBounds=chapter!=='commissioning'&&s.deployment<.995&&s.deployment>.0001?new T.Box3().setFromObject(craft.root):null;if(overlayStale||layers.length||domainSceneSpecs[focus]?.vectors?.length||['attitude','prop'].includes(focus)){arrows();overlayStale=false;}if(selected)selectionBox();updateOrbit();positionVehicle();orbit.visible=view==='orbit';setBg();lightScene();updateThermal();request();}
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
  const active=enabled&&!legendMode,showFocus=!!focus&&(launchFrame?.environment!=='hangar'||bayIsolate);
  if(active&&craftGroup.visible){craftFocus?.clear();craftSkin??=thermalSkin(craft.root);craftSkin.apply(s.thermalQualification,gpu?renderer.getPixelRatio():1,thermalScale);}
  else{craftSkin?.clear();if(showFocus&&!(inBay()&&focus==='launcher')){craftFocus??=focusHardware(craft.root);craftFocus.apply(focus,selected);}else craftFocus?.clear();}
  if(active&&packed&&launchFrame.environment==='hangar'&&bayIsolate){
   // The mounted, live spacecraft owns the thermal nodes. Keep its carrier in context.
   launchSkin?.clear();launchFocus??=focusHardware(launch.parts.stage);launchFocus.apply('thermal');
  }else if(active&&packed){launchFocus?.clear();launchSkin??=thermalSkin(launch.parts.stage);launchSkin.apply(s.thermalQualification,gpu?renderer.getPixelRatio():1,thermalScale);}
  else{launchSkin?.clear();if(showFocus&&launch?.root.visible&&!(phase==='D'&&['launcher','launch'].includes(focus)&&['pad','ascent'].includes(s.flightPhase))){launchFocus??=focusHardware(launch.parts.stage);const exposeCargo=inBay()&&launch.bay.layout.star&&h.fairing.fit&&s.t>=-2400;
    launchFocus.apply(exposeCargo&&focus==='conops'?'launcher':focus,selected,exposeCargo);}else launchFocus?.clear();}
  if((focus==='data'||focus==='purpose')&&craftGroup.visible&&view!=='orbit'&&!s.referenceBody){if(!custody){custody=dataRoutes(craft,h);craft.root.add(custody.root);}custody.update(s,true,focus);}else if(custody)custody.update(s,false);
  refreshLegend();
 }
 const ray=new T.Raycaster(),pointer=new T.Vector2(),touches=new Map();let drag=null;
 function partAt(e){
  if(!craft||view==='orbit')return null;
  const bounds=cv.getBoundingClientRect();pointer.set(2*(e.clientX-bounds.left)/bounds.width-1,1-2*(e.clientY-bounds.top)/bounds.height);ray.setFromCamera(pointer,camera);
  const target=view==='launch'&&launch?.root.visible?launch.root:craft.root,reference=target===launch?.root&&launchFrame?.reference;
  for(const hit of ray.intersectObjects(target===launch?.root&&craftGroup.visible?[target,craft.root]:[target],true)){
   if(!hit.object.isMesh||hit.object.material?.userData.domainGhost||hit.object.userData.sceneFlow)continue;let obj=hit.object,id=null,bayRole=null,room=false,visible=true;
   while(obj){if(!obj.visible){visible=false;break;}if(obj===launch?.parts.facility)room=true;if(obj.userData.bayRole)bayRole=obj.userData.bayRole;if(!id&&obj.userData.part)id=obj.userData.part;obj=obj.parent;}
   if(visible&&inBay()&&room){
    if(bayRole)return {id:'bay:'+bayRole};
    if(hit.object.material?.transparent&&hit.object.material.opacity<.5)continue;
    return null;
   }
   if(visible&&id)return {id,node:reference?null:hit.object.userData.thermalNode};
  }return null;
 }
 function hoverPart(e){const hit=partAt(e);if(hit||hoverHit)onHover(hit?.id||null,e.clientX,e.clientY,thermalRow(hit));hoverHit=hit?{...hit,x:e.clientX,y:e.clientY,t:s.t}:null;refreshLegend();cv.style.cursor=hit?'pointer':'grab';}
 function leave(e){if(hoverHit){hoverHit=null;onHover(null,e.clientX,e.clientY,null);refreshLegend();}}
 function panBasis(){
  setCamera();const perPx=2*halfAtFocus/Math.max(1,ht);
  return {origin:pan[poseKey()].clone(),right:V().setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(-perPx),up:V().setFromMatrixColumn(camera.matrixWorld,1).multiplyScalar(perPx)};
 }
 function panTo(basis,dx,dy){pan[poseKey()].copy(basis.origin).addScaledVector(basis.right,dx).addScaledVector(basis.up,dy);}
 function touchPair(){const pts=Array.from(touches.values()),a=pts[0],b=pts[1];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.max(2,Math.hypot(a.x-b.x,a.y-b.y))};}
 function cancelGestures(){drag=null;touches.clear();cv.style.cursor='grab';}
 function down(e){
  if(e.pointerType!=='touch'&&e.button!==0&&e.button!==1)return;
  leave(e);if(e.button===1||e.pointerType==='touch')e.preventDefault();cv.setPointerCapture(e.pointerId);
  if(e.pointerType==='touch'){
   touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(touches.size>=2){const q=touchPair();drag={mode:'touch',...q,basis:panBasis(),zoom:pose[poseKey()][2],moved:true};cv.style.cursor='grabbing';return;}
  }
  const middle=e.button===1;drag={mode:middle?'pan':'orbit',id:e.pointerId,x:e.clientX,y:e.clientY,az:pose[poseKey()][0],el:pose[poseKey()][1],moved:false,basis:middle?panBasis():null};cv.style.cursor='grabbing';
 }
 function move(e){
  if(!drag){if(e.pointerType!=='touch')hoverPart(e);return;}
  if(e.pointerType==='touch'&&touches.has(e.pointerId))touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(drag.mode==='touch'){
   if(touches.size<2)return;const q=touchPair();panTo(drag.basis,q.x-drag.x,q.y-drag.y);pose[poseKey()][2]=clamp(drag.zoom*q.distance/drag.distance,.25,10);request();return;
  }
  if(e.pointerId!==drag.id)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>3)drag.moved=true;
  if(drag.moved){if(drag.mode==='pan')panTo(drag.basis,dx,dy);else{pose[poseKey()][0]=drag.az-dx*.008;pose[poseKey()][1]=clamp(drag.el+dy*.009,-1.52,1.52);}request();}
 }
 function up(e){
  touches.delete(e.pointerId);if(!drag)return;
  if(drag.mode==='touch'&&touches.size){const [id,q]=touches.entries().next().value;drag={mode:'orbit',id,x:q.x,y:q.y,az:pose[poseKey()][0],el:pose[poseKey()][1],moved:true};return;}
  const pick=drag.mode==='orbit'&&!drag.moved&&e.button!==1;cancelGestures();
  if(pick){selectedHit=partAt(e);refreshLegend();if(selectedHit)onPick(selectedHit.id,thermalRow(selectedHit));}
 }
 function zoom(mult){pose[poseKey()][2]=clamp(pose[poseKey()][2]*mult,.25,10);request();}
 function resetCamera(){
  pose[poseKey()]=[...defaultPose[poseKey()],1];pan[poseKey()].set(0,0,0);
  if(craft){const span=Math.max(craft.wingspan,craft.spanZ);size={span,fitWidth:Math.max(craft.wingspan*1.05,craft.spanZ*.6),fitHeight:Math.max(craft.wingspan*.29+craft.spanZ*.36,span*.48)};}request();
 }
 function keyMove(e){
  const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},d=arrows[e.key];
  if(d){if(e.shiftKey)panTo(panBasis(),d[0]*24,d[1]*24);else{pose[poseKey()][0]+=d[0]*.1;pose[poseKey()][1]=clamp(pose[poseKey()][1]-d[1]*.1,-1.52,1.52);}}
  else if(e.key==='+'||e.key==='=')zoom(1.15);else if(e.key==='-')zoom(1/1.15);else if(e.key==='Home')resetCamera();else return;e.preventDefault();request();
 }
 cv.addEventListener('pointerleave',leave);cv.addEventListener('pointerdown',down);cv.addEventListener('pointermove',move);cv.addEventListener('pointerup',up);
 cv.addEventListener('pointercancel',cancelGestures);cv.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
 cv.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(clamp(-e.deltaY*.0015,-.5,.5)));},{passive:false});cv.addEventListener('keydown',keyMove);
 setBg();resize();return {update,setView,
  setDeploymentLens(value){if(deploymentLens===value)return;deploymentLens=value;if(craft)request();},
  setBayView(id,labels){
   const next=['equipment','interface','payload'].includes(id)?id:'overview';
   if(next===bayLens&&bayLabels===labels)return;
   if(next!==bayLens){pose.bay[2]=1;pan.bay.set(0,0,0);}
   bayLens=next;bayLabels=labels!==false;request();
  },
  setLaunchLens(id){launchLens=['pad','base','ship'].includes(id)?id:'wide';request()},
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
  setBayIsolation(enabled){const on=!!enabled;if(bayIsolate===on)return;bayIsolate=on;if(craft){actuate();updateThermal();}request();},
  setOverlays(ids=[]){const next=Array.from(ids);if(layers.length===next.length&&next.every((v,i)=>v===layers[i]))return;layers=next;if(craft){arrows();updateThermal();}request();},
  highlight(id){const next=pickAliases[id]??id??'';if(!next||selectedHit&&selectedHit.id!==id)selectedHit=null;if(next===selected)return;selected=next;if(craft){actuate();selectionBox();updateThermal();}request();},
  destroy(){alive=false;ro.disconnect();cancelAnimationFrame(raf);craftSkin?.destroy();launchSkin?.destroy();craftFocus?.destroy();launchFocus?.destroy();custody?.destroy();legend.destroy();disposeGroup(scene);backdrop.dispose();stationMat.dispose();renderer.dispose();triad.remove();cv.remove();tags.remove();}
 };
}
