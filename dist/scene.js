import {onSpacecraftTextureUpdate} from './spacecraft-material-render.js';
import {createHardwareDetail,detailSource,normalizeHardwareDetail} from './hardware-detail.js';
import {createScenePartMenu,describeScenePart} from './scene-part-menu.js';
import {createOrbitVectors,orbitVectorReadings,orbitVectorsAvailable,behindGlobe} from './orbit-vectors.js';
import {beginTrackball,trackballOrientation} from './orbit-trackball.js';
import {sunVelocityCameraFrame,normalizeCameraMode,cameraModeAvailable,cameraReferenceToBody} from './orbital-camera.js';
import {createTerminalWaves} from './terminal-waves.js';
import {orbitalLightingAvailable,normalizeLightingMode,effectiveLightingMode} from './orbit-lighting.js';
import {normalizeSpacecraftFocus,chassisFitHalfHeight} from './spacecraft-framing.js';
import * as T from './vendor/three.module.js';
import {flightFrames,createEarthBackdrop,eciScene as eci} from './flight-frame.js';
import {createEarthAppearance,createEarthObserverAppearance} from './earth-appearance.js';
import {createTriad} from './coordinate-triad.js';
import {padSky} from './launch-art.js';
import {createLaunchRendering} from './launch-rendering.js';
import {createLaunchSiteView} from './launch-site-view.js';
import {makeLaunch} from './launch-scene.js';
import {positionLiveCraft} from './launch-craft-placement.js';
import {makeCraft} from './craft.js';
import {buildElectricalArchitecture,reconcileRedwireInstalledMassFromCraft} from './electrical-architecture.js';
import {createPointingGuide,pointingGeometry,pointingViewAllowed} from './pointing-guide.js';
import {thermalSkin,temperatureLegend} from './thermal-view.js';
import {domainSceneSpecs,domainInstruments} from './domain-scene.js';
import {propulsionReview} from './spacecraft-architecture.js';
import {focusHardware,dataRoutes,hardwareAnchor} from './hardware-focus.js';
import {launchContextBadge} from './launch-context.js';
import {softRenderer} from './software-scene.js';
import {stablePerspectiveNear} from './camera-clipping.js';
import {obstacleFromMesh} from './routing-audit.js';
import {groundConnectionRecords} from './ground-connection-routing.js';
import {flightRoutingSnapshot,mergeRoutingObstacles,mergeServiceRoutingSnapshot} from './flight-routing-registry.js';
import {deploymentSchedule,deploymentLayout,leafPose,leafCorners,mechanismPose,leafAxes} from './deployment.js';
import {ascentTrack,launchPath} from './launch-path.js';
import {payloadFreeMET,launchClockFor,INSERTION_MET,shipEngineViewAvailable} from './launch-effects-state.js';
import {launchSiteFor} from './launch-sites.js';
import {layoutBayAnnotations,drawBayAnnotations,visibleBayObject} from './bay-annotations.js';
import {geometry,groundSites,R,DEG,MU} from './orbit.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Y=V(0,1,0),TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const cameraView=s=>/launch|fairing/i.test(s)?'launch':/earth|orbit/i.test(s)?'orbit':/core/i.test(s)?'core':'spacecraft';
const pickAliases={enclosure:"structure",pv:'solar',array:'solar',arrays:'solar',radiators:'radiator',cmgs:'cmg',antennas:'communications',tanks:'propellant',coolant:'radiator',batteries:'battery',shielding:'structure',engine:'propulsion',prop:'propellant',attitude:'cmg',battery:'battery',trays:'compute'};
const defaultPose={spacecraft:[.61,.49],core:[2.60,.47],orbit:[.54,.33],launch:[.46,.27],bay:[.40,.29]};
const redwireLayoutKeys=new WeakMap();
function redwireElectricalLayoutKey(h){
 if(h.architectureFamilyId!=='redwire-platform')return '';
 if(redwireLayoutKeys.has(h))return redwireLayoutKeys.get(h);
 const graph=buildElectricalArchitecture(h),key=JSON.stringify({
  boxes:graph.boxes.map(b=>[b.id,b.frame,b.positionM,b.dimensionsM,b.connectorPanels]),
  ports:graph.ports.map(p=>[p.id,p.boxId,p.positionM,p.normal,p.connectorTypeId,p.quantity,p.instanceOffsetsM,p.packing]),
  harnesses:graph.harnesses.map(a=>[a.id,a.quantity,a.fromPortId,a.toPortId,a.connectorTypeId,a.wire.awg,a.wire.areaMM2,a.cableDiameterM,a.bendRadiusM,a.routing])
 });
 redwireLayoutKeys.set(h,key);return key;
}
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
// Fit the initial work-area composition using the preset sightline.
export function fitBayWorkArea(points,dir,aspect,look){
 const right=Y.clone().cross(dir).normalize(),up=dir.clone().cross(right),slope=Math.tan(17*DEG);
 const tx=slope*aspect*.89,ty=slope*.83;
 let left=Infinity,bottom=Infinity,back=Infinity,rightmost=-Infinity,top=-Infinity,front=-Infinity;
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
function line(p,pts,color,opacity=1,dash=0){let g=new T.BufferGeometry().setFromPoints(pts);let m=dash?new T.LineDashedMaterial({color,dashSize:dash,gapSize:dash*.66,transparent:true,opacity}):new T.LineBasicMaterial({color,transparent:true,opacity});let l=new T.Line(g,m);if(dash)l.computeLineDistances();p.add(l);return l;}
function arrow(p,start,dir,extent,color,dash=0){const q=dir.clone().normalize(),end=start.clone().addScaledVector(q,extent);line(p,[start,end],color,.88,dash);const head=new T.Mesh(new T.ConeGeometry(extent*.02,extent*.08,8),new T.MeshBasicMaterial({color}));head.position.copy(end).addScaledVector(q,-extent*.04);head.quaternion.setFromUnitVectors(Y,q);p.add(head);}
function disposeGroup(group){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 group.traverse(obj=>{if(obj.geometry&&!obj.geometry.userData.shared)geometries.add(obj.geometry);for(const m of [].concat(obj.material||[]))if(!m.userData.shared){materials.add(m);for(const value of Object.values(m))if(value?.isTexture&&!value.userData.shared)textures.add(value);}});
 for(const item of [...geometries,...materials,...textures])item.dispose();
}
export function createScene(container,{onPick=()=>{},onOpenPart=null,getPartInfo=null,onHover=()=>{},onThermalScale=()=>{},onCameraModeChange=()=>{},onCameraFrameChange=()=>{},onDetailChange=()=>{}}={}){
 let cv=document.createElement('canvas');cv.style.cssText='display:block;position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab;outline:none';cv.setAttribute('aria-label','Interactive 3D view. Left drag rotates. Middle drag pans. Scroll zooms. Two fingers pan or pinch. Arrow keys rotate, Shift and arrows pan, plus and minus zoom. Home resets this camera.');cv.tabIndex=0;container.append(cv);let renderer,gpu=true;try{if(new URLSearchParams(globalThis.location?.search).get('renderer')==='cpu')throw Error();let context=cv.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'high-performance'})||cv.getContext('webgl',{alpha:true,antialias:true,powerPreference:'high-performance'});if(!context)throw Error();renderer=new T.WebGLRenderer({canvas:cv,context,alpha:true,antialias:true});renderer.setClearColor(0x0a1018,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;}catch{gpu=false;if(cv.getContext('2d')===null){let fresh=cv.cloneNode();cv.replaceWith(fresh);cv=fresh;}renderer=softRenderer(cv);}
 const launchRendering=createLaunchRendering(renderer,gpu),siteView=createLaunchSiteView(container);
 container.setAttribute('data-renderer',gpu?'webgl':'canvas');
 const triad=createTriad(container);
 const releaseMaterialUpdates=onSpacecraftTextureUpdate(()=>request());
 let framedDesign=null,bodyPoints=[],deploymentLens='vehicle',bayFit=null;
 const scene=new T.Scene(),craftGroup=new T.Group(),orbit=new T.Group();scene.add(craftGroup,orbit);const orthCamera=new T.OrthographicCamera(-10,10,10,-10,.001,5000),launchCamera=new T.PerspectiveCamera(34,1,.04,2000);let camera=orthCamera;const hemi=new T.HemisphereLight(0xe5f4ff,0xb8a58f,1.52),key=new T.DirectionalLight(0xffedcf,3.2),rim=new T.DirectionalLight(0xabcfff,1.95);key.position.set(-4,8,5);rim.position.set(7,2,-6);scene.add(hemi,key,rim,key.target);if(gpu){renderer.shadowMap.type=T.PCFSoftShadowMap;key.shadow.mapSize.set(2048,2048);key.shadow.normalBias=.07;key.shadow.bias=-.00008;}
 // Camera-relative floodlights are confined to the foreground render pass.
 const softbox=new T.DirectionalLight(0xfff1db,2.65),bounce=new T.DirectionalLight(0xdcecff,1.6);
 scene.add(softbox,bounce);
 let lightingMode='auto',spacecraftFocus='core',exposureEV=0,cameraMode='orbit';
 let detailMode='auto',craftDetail=null,launchDetail=null,detailFocus=null,renderCostMs=0,detailStateKey='';
 // Export appearance is scoped to one preview/capture session. App setters
 // continue to own the working view, so releasing a capture reveals that view.
 let captureAppearance=null,captureRevision=0;
 const thermalEnabled=()=>captureAppearance?.thermal??layers.includes('thermal');
 const pointingEnabled=()=>layers.includes('pointing')&&captureAppearance?.guides!==false;
 let launchLens='wide',padConnection=null,bayLens='overview',bayLabels=true,commBench='sband',processingState=null;
 let domain='',phase='',focus='',craftFocus=null,launchFocus=null,custody=null,stagingBounds=null,chapter='',launch=null,launchKey='',launchFrame=null;let view='spacecraft',size,h={},s={},craft=null,pose={spacecraft:[...defaultPose.spacecraft,1],core:[...defaultPose.core,1],orbit:[...defaultPose.orbit,1],launch:[...defaultPose.launch,1],bay:[...defaultPose.bay,1]},w=0,ht=0,selected='',layers=[],annotation=new T.Group(),selection=new T.Group(),arrowSig='',pickables=[],raf=0,alive=true,orbitSig='',stationSig='',lastPaint=0,frameKey='',meshKey='',overlayStale=true;
 const pan=Object.fromEntries(Object.keys(defaultPose).map(k=>[k,V()]));let halfAtFocus=1,zoomFloor=.25;
 const cameraTarget=V(),annotationTargets=new Map(),annotationRecords=new Map();
 const partMenu=createScenePartMenu(container,{returnFocus:cv});
 // The target/framing and the orientation reference are independent. A turn
 // stays in the selected orbital, body, or inertial frame as time advances.
 const orbitalTurns=Object.fromEntries(Object.keys(defaultPose).map(k=>[k,new T.Quaternion()]));
 // Captured bases are expressed in the selected reference frame. The name is
 // retained for compatibility with the existing six/ten/fourteen-value saves.
 const manualCameraBase={spacecraft:null,core:null},trackedCameraFrame={spacecraft:null,core:null};
 const legacyCamera=Object.fromEntries(Object.keys(defaultPose).map(k=>[k,false]));
 const pendingBodyPan={spacecraft:false,core:false},cameraPanFrame=new T.Quaternion();
 let cameraTracking='preset';
 const identityTurn=new T.Quaternion(),eyeBasis=new T.Matrix4(),eyeTurn=new T.Quaternion(),fitCameraBase=new T.Quaternion(),origin=V();
 let freeOrbit=false;
 const gestureRing=document.createElement('div');
 gestureRing.className='orbit-rotation-ring';gestureRing.hidden=true;gestureRing.setAttribute('aria-hidden','true');container.append(gestureRing);
 function syncRotationMode(){
  const next=s.t>=INSERTION_MET&&s.altitudeKm>0&&!s.referenceBody&&!s.orbitLost&&s.flightPhase!=='entry'&&
   (view!=='launch'||launchFrame?.environment==='space'&&!launchFrame.reference);
  if(next===freeOrbit)return;
  freeOrbit=next;cancelGestures();
  container.setAttribute('data-free-orbit',String(next));
  cv.setAttribute('aria-label',next
   ?'Interactive orbital view. Drag near the center to tumble. Drag around the outer edge to roll. Middle drag pans. Scroll zooms. Two fingers pan or pinch. Arrow keys turn, Q and E roll, Shift and arrows pan, plus and minus zoom. Home resets this camera.'
   :'Interactive 3D view. Drag to orbit with vertical up. Middle drag pans. Scroll zooms. Two fingers pan or pinch. Arrow keys turn, Shift and arrows pan, plus and minus zoom. Home resets this camera.');
 }

 let bayIsolate=true;
 let thermalScale='working',craftSkin=null,launchSkin=null,showLegend=true,legendMode='',hoverHit=null,selectedHit=null;
 const signals=createTerminalWaves();scene.add(signals.group);
 let signalPlaying=0,signalClock=0,signalMET=null,signalStamp=null;
 function signalFrame(){
  const now=performance.now();
  if(signalMET===null||!signalPlaying&&s.t!==signalMET)signalClock=s.t;
  else if(signalPlaying&&signalStamp!==null)signalClock+=signalPlaying*Math.min(.2,(now-signalStamp)/1000);
  signalStamp=now;signalMET=s.t;
  const visible=s.t>=INSERTION_MET&&!s.carrierAttached&&!s.referenceBody&&!s.orbitLost&&(view!=='launch'||launchFrame?.environment==='space'&&!launchFrame.reference);
  signals.update(h,s,craft,view==='orbit',visible,2*halfAtFocus/ht,signalClock,camera.quaternion);
 }
 const navigation=createOrbitVectors();scene.add(navigation.group);let showOrbitVectors=true,navReadings=[];
 const pointingGuide=createPointingGuide();let pointingLabels=[],controlLoop='executive';craftGroup.add(pointingGuide.group,annotation,selection);const spin=new T.Group();orbit.add(spin);
 const earthAppearance=createEarthAppearance({onReady:()=>request(),gpu,maxTextureSize:gpu?renderer.capabilities.maxTextureSize:4096,anisotropy:gpu?Math.min(12,renderer.capabilities.getMaxAnisotropy()):1});
 const {surface:earth,atmosphere}=earthAppearance;spin.add(earth,atmosphere);
 const earthObserver=createEarthObserverAppearance({base:earthAppearance,onReady:()=>request(),gpu,maxTextureSize:gpu?renderer.capabilities.maxTextureSize:4096,anisotropy:gpu?Math.min(12,renderer.capabilities.getMaxAnisotropy()):1});
 const earthBufferSize=new T.Vector2();
 // A capture preparation holds the requested Earth LOD while normal on-screen
 // paints continue. Returning to display LOD too early cancels high-res loads.
 let capturePreparation=null,captureInProgress=false,captureMaximum=null,recording=null;
 const earthStatus=document.createElement('div');earthStatus.className='earth-imagery-status';earthStatus.setAttribute('role','status');earthStatus.setAttribute('aria-live','polite');earthStatus.hidden=true;container.append(earthStatus);
 const backdrop=createEarthBackdrop(earthObserver.surface,earthObserver.atmosphere,request,!gpu,earthObserver);let flightFrame=null;
 function skyVisible(){return flightFrame&&view!=='orbit'&&s.altitudeKm>0&&!s.referenceBody&&(view==='launch'?launchFrame?.environment==='space':s.t>=540);}
 function bodyCamera(){return view==='core'||chapter==='commissioning'&&deploymentLens!=='vehicle';}
 function trackedCameraAvailable(){return freeOrbit&&flightFrame&&cameraModeAvailable(view,s,chapter,deploymentLens);}
 function defaultCameraFrame(key){
  const signature=[s.sunECI,s.velocityECI,s.radial,s.normal].flat().join('/');
  const previous=trackedCameraFrame[key];
  if(previous?.signature===signature)return previous.frame;
  const frame=sunVelocityCameraFrame(s,previous?.frame);
  trackedCameraFrame[key]={signature,frame};return frame;
 }
 const trace=new T.Group();orbit.add(trace);const originPin=new T.Mesh(new T.SphereGeometry(.0085,12,8),new T.MeshBasicMaterial({color:0x7ee0d9}));spin.add(originPin);originPin.visible=false;const mark=new T.Mesh(new T.SphereGeometry(.011,12,8),new T.MeshBasicMaterial({color:0xffb363,toneMapped:false}));orbit.add(mark);const ring=new T.Mesh(new T.RingGeometry(.021,.024,40),new T.MeshBasicMaterial({color:0xffb363,side:T.DoubleSide,depthWrite:false,toneMapped:false}));orbit.add(ring);const sites=new T.Group();spin.add(sites);const stationMat=new T.MeshBasicMaterial({color:0x92ddcd});stationMat.userData.shared=true;
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
 const tags=document.createElement('div');tags.className='scene-readouts';tags.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden';container.append(tags);
 const annotationTags=document.createElement('div');annotationTags.className='scene-annotations';annotationTags.style.cssText=tags.style.cssText;container.append(annotationTags);
 const legend=temperatureLegend(container,id=>{if(id!==thermalScale){setThermalScale(id);onThermalScale(id);}});
 function label(x,y,txt){const a=document.createElement('span');a.textContent=txt;a.style.cssText=`position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);font:500 9px/1.5 ui-monospace,monospace;letter-spacing:.04em;color:#d1dddf;background:#14202acc;padding:1px 4px;white-space:nowrap`;tags.append(a);}
 let backgroundState='';
 function setBg(){const next=view==='launch'&&launchFrame?.environment!=='space'?launchFrame?.environment:view==='orbit'?'orbit':s.eclipse?'shadow':'day';if(next===backgroundState)return;backgroundState=next;
   container.style.backgroundColor='#060b12';container.style.backgroundImage='radial-gradient(ellipse at 48% 43%, #101a25, #060b12 70%)';
  if(next==='hangar')container.style.backgroundImage='radial-gradient(ellipse at 52% 10%, #526674, #2a3947 43%, #14222d 75%, #0c161f)';if(next==='ground')container.style.backgroundImage='url('+padSky()+')';if(next==='sky')container.style.backgroundImage='linear-gradient(170deg,#0a182b,#184466 54%,#84aec0 90%,#c9d4d5)';container.style.backgroundSize='cover';container.style.backgroundPosition='50% 50%';
 }
 function lightScene(){
  const world=view==='orbit',displayLaunch=view==='launch'&&launchFrame&&!launchFrame.directCraft;
  const available=orbitalLightingAvailable(view,s),orbitalVehicle=available&&!world;
  const effectiveMode=effectiveLightingMode(captureAppearance?.lighting??lightingMode,s),studio=available&&effectiveMode==='studio',flood=studio&&orbitalVehicle;
  const ev=available?(captureAppearance?.exposureEV??exposureEV):null;
  scene.userData.exposureEV=backdrop.scene.userData.exposureEV=ev;
  if(gpu)renderer.toneMappingExposure=1.16*2**(ev??0);
  const lighting={ambient:.45,direct:1.06,rim:.38};
  key.target.position.set(0,0,0);
  if(orbitalVehicle){
   // In the insertion stack the foreground axes follow configureObserver's
   // launch frame. The separated spacecraft and core use spacecraft body axes.
   const direction=v=>displayLaunch&&flightFrame
    ?eci(v).applyQuaternion(flightFrame.orbital.clone().invert()).applyAxisAngle(V(1,0,0),-Math.PI/2).normalize()
    :frameDirection(v);
   const reflected=clamp(s.sunRadial??0,0,1)*Math.pow(R/(R+s.altitudeKm),2);
   key.position.copy(direction(s.sunECI));key.intensity=s.eclipse?0:3.2;
   rim.position.copy(direction(s.radial)).negate();rim.color.setHex(0xaccfff);rim.intensity=.67*reflected;
   hemi.intensity=.045+(flood?.95:0);hemi.groundColor.setHex(flood?0xb0bdca:0x71849a);
   lighting.ambient=.015+(flood?.34:0);lighting.direct=s.eclipse?0:1.12;
   lighting.rim=.27*reflected;lighting.rimDirection=rim.position;
  }else{
   const shadow=!world&&!displayLaunch&&s.eclipse;
   key.position.copy(world&&s.sunECI?eci(s.sunECI,8):displayLaunch?V(-5,7,3):frameDirection(s.sunECI).multiplyScalar(8));
   key.intensity=world?3.6:displayLaunch?2.6:shadow?0:3.2;
   hemi.intensity=world?.35:displayLaunch?.97:shadow?.95:1.52;
   hemi.groundColor.setHex(shadow?0x627f99:0xb8a58f);
   rim.position.set(7,2,-6);rim.color.setHex(0xabcfff);
   rim.intensity=world?.17:displayLaunch?1.12:shadow?.82:1.75;
   lighting.ambient=world?.21:displayLaunch?.33:shadow?.27:.45;
   lighting.direct=shadow?0:1.06;lighting.rim=world?.05:shadow?.20:.38;
  }
  lighting.sun=key.position.clone().normalize();
  softbox.visible=bounce.visible=flood;
  if(flood){
   softbox.position.set(-.65,.78,1).normalize().applyQuaternion(camera.quaternion);
   bounce.position.set(.82,.1,.55).normalize().applyQuaternion(camera.quaternion);
   lighting.softbox=softbox.position;lighting.bounce=bounce.position;
  }
  if(world){
   // At globe scale the spacecraft is represented by a locator. Change the dot
   // only; the geographic terminator, event ring and trajectory remain physical.
   mark.material.color.setHex(s.burn?(studio?0xffb08a:0xff7844):studio?0xfff5d6:available&&s.eclipse?0xa68b72:0xffb363);
  }
  if(gpu){
   const shadows=displayLaunch&&['ground','hangar'].includes(launchFrame.environment);
   renderer.shadowMap.enabled=!!shadows;key.castShadow=!!shadows;
   if(shadows){const r=launchFrame.half*1.65;key.target.position.copy(launchFrame.center);key.position.copy(key.target.position).addScaledVector(lighting.sun,r*2.6);const c=key.shadow.camera;c.left=-r;c.right=r;c.top=r;c.bottom=-r;c.near=.1;c.far=r*6;c.updateProjectionMatrix();}
  }
  scene.userData.lightState=lighting;
  const launchEnvironment=view==='launch'&&launchFrame&&!launchFrame.directCraft;
  launchRendering.update(scene,{active:launchEnvironment,environment:launchFrame?.environment,lighting:effectiveMode,studioSpacecraft:view!=='orbit',region:launch?.ground?.site?.terrain,horizonRadiusM:launch?.ground?.environment?.horizonRadiusM,cameraHeightM:launchEnvironment?camera.position.y-launch.parts.tower.localToWorld(V(0,-launch.geometry.lowerLengthM-launch.geometry.upperLengthM,0)).y:0});
 }
 const inBay=()=>view==='launch'&&phase==='D'&&s.flightPhase==='integration'&&launchFrame?.environment==='hangar'&&launch?.bay;
 const activeProcessing=()=>inBay()?launch.bay.processingState?.():null;
 const inspectingMounts=()=>inBay()&&(bayLens==='endOn'||bayLens==='sideOn');
 const poseKey=()=>inBay()?'bay':view;
 function bayWorkFit(direction,aspect,look){
  const bay=launch.bay;
  if(bayFit?.launch!==launch||bayFit.bayTime!==launchFrame.bayTime||bayFit.station!==bay.station.userData.stationId){
   bayFit={launch,bayTime:launchFrame.bayTime,station:bay.station.userData.stationId,points:bayWorkAreaPoints(launch,h)};
  }
  return fitBayWorkArea(bayFit.points,direction,aspect,look);
 }
 function setCamera(){
 if(!w||!ht||!craft)return;
 const key=poseKey(),[homeAz,homeEl]=defaultPose[key],[userAz,userEl]=pose[key];
 let az=homeAz,elevation=homeEl;
 if(view==='launch'&&h.input?.launcher==='starship'&&launchFrame&&!launchFrame.directCraft&&s.t>=-600)az+=launchLens==='ship'?.94:2.46;if(inBay()&&launch.bay.layout.star&&['overview','payload'].includes(bayLens))az=-.74;
 if(view==='launch'&&launchLens==='surroundings'&&launchFrame?.environment==='ground'){
  az=({california:1.92,hainan:-2.30,louisiana:2.94,guiana:-.86,texas:-.84,florida:-.88})[launch.ground.site.terrain]??-.88;elevation=.60;
 }
 if(view==='launch'&&launch&&h.input?.launcher==='starship'&&s.flightPhase==='insertion'){
  // Look obliquely across the rail from the free edge of the hatch. The
  // outward stroke stays legible while the opening and the near jamb are visible.
  const eye=(launchLens==='ship'?V(-1,.18,.32):V(-.28,.21,1)).transformDirection(launch.parts.stage.matrixWorld);
  az=Math.atan2(eye.x,eye.z);elevation=Math.asin(eye.y);
 }
 if(inBay()&&(activeProcessing()?.domain||focus)==='comm'&&launchFrame.bayTime<=-3000){
  // The parked optical aperture faces the aft wall of the high bay. View
  // its shrouded test head and rack from that side, clear of the bus.
  const bench=activeProcessing()?.commBench||commBench;az=bench==='optical'?-2.73:bench==='sband'?1.28:.40;
 }
 if(view==='launch'&&phase==='D'&&launchLens==='fairing'&&s.t>=-600&&s.t<100)az=h.input.launcher==='starship'?-Math.PI/2:.81;
 if(view==='launch'&&phase==='D'&&launchLens==='services'&&s.t>=-600&&s.t<35){
  const context=launch?.umbilicals?.getConnectionContext(padConnection),anchor=context?.anchor;
  if(context?.direction){const direction=context.direction.clone().transformDirection(launch.parts.tower.matrixWorld);az=Math.atan2(direction.x,direction.z);elevation=Math.asin(direction.y);}
  else if(anchor){const p=anchor.getWorldPosition(V()),center=launch.parts.stage.getWorldPosition(V());az=Math.atan2(p.x-center.x,p.z-center.z)+.38;elevation=.13;}
 }
 const inspectShipEngines=view==='launch'&&phase==='D'&&launchLens==='engines'&&launch&&shipEngineViewAvailable(h.input.launcher,s.t);
 if(inspectShipEngines){
  const aft=V(.12,-1,.31).transformDirection(launch.parts.upper.matrixWorld);
  az=Math.atan2(aft.x,aft.z);elevation=Math.asin(aft.y);
 }
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
 // Framing uses the preset orientation. Only the camera eye uses the user's rotation.
 const el=elevation-(view==='launch'&&launchFrame?.environment==='ground'?.10:0);
 const bodyOrbit=view==='core'||view==='spacecraft',viewUp=bodyOrbit?V(0,0,1):Y.clone();
 const direction=(a,e)=>bodyOrbit?V(Math.sin(a)*Math.cos(e),-Math.cos(a)*Math.cos(e),Math.sin(e)):V(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e));
 const orbitAz=az+userAz-homeAz,orbitEl=clamp(el+userEl-homeEl,-1.52,1.52);
 const presetDir=direction(az,el),dir=direction(orbitAz,orbitEl);
 if(inspectingMounts()){
  // Body axes also follow the article when a provider rotates its ground fixture.
  const frame=launch.parts.liveMount.getWorldQuaternion(new T.Quaternion()),end=bayLens==='endOn';
  const along=end?V(0,0,1):V(1,0,0),up=end?V(0,1,0):V(0,0,1),right=up.clone().cross(along);
  const yaw=userAz-homeAz,pitch=clamp(userEl-homeEl,-1.46,1.46);
  presetDir.copy(along).applyQuaternion(frame);
  dir.copy(along).multiplyScalar(Math.cos(yaw)*Math.cos(pitch)).addScaledVector(right,Math.sin(yaw)*Math.cos(pitch)).addScaledVector(up,Math.sin(pitch)).applyQuaternion(frame);
  viewUp.copy(up).applyQuaternion(frame);
 }
 if(bodyOrbit&&skyVisible()&&!bodyCamera()){
  presetDir.applyQuaternion(flightFrame.orbitalToBody);
  dir.applyQuaternion(flightFrame.orbitalToBody);
  viewUp.applyQuaternion(flightFrame.orbitalToBody);
 }
 let tracking='preset';const reference=new T.Quaternion();
 if(trackedCameraAvailable()){
  const manual=manualCameraBase[key],tracked=cameraMode==='sun-velocity'&&!legacyCamera[key]?defaultCameraFrame(key):null;
  if(legacyCamera[key])tracking='legacy';
  else if(tracked){
   // Use the exact body conversion used by the visible navigation arrows.
   presetDir.copy(frameDirection(tracked.direction.toArray()));dir.copy(presetDir);
   viewUp.copy(frameDirection(tracked.up.toArray()));tracking='sun-velocity';
  }else if(cameraMode!=='sun-velocity'){
   reference.copy(cameraReferenceToBody(cameraMode,flightFrame));
   if(manual){
    presetDir.set(0,0,1).applyQuaternion(manual).applyQuaternion(reference);dir.copy(presetDir);
    viewUp.set(0,1,0).applyQuaternion(manual).applyQuaternion(reference);
   }else{
    presetDir.copy(direction(az,el)).applyQuaternion(reference);
    dir.copy(direction(orbitAz,orbitEl)).applyQuaternion(reference);
    viewUp.set(0,0,1).applyQuaternion(reference);
   }
   tracking=cameraMode;
  }
  // Old saves stored pan in body axes. Convert once, when a physical frame is
  // available, so importing a view does not move its target on the first paint.
  if(pendingBodyPan[key]&&!legacyCamera[key]){
   pan[key].applyQuaternion(reference.clone().invert());pendingBodyPan[key]=false;
  }
 }
 cameraPanFrame.copy(reference);
 if(cameraTracking!==tracking){cameraTracking=tracking;container.setAttribute('data-camera-tracking',tracking);onCameraModeChange(tracking);}
 fitCameraBase.setFromRotationMatrix(eyeBasis.lookAt(presetDir,origin,viewUp));
 const aspect=w/ht;const launchConfig=view==='launch'&&launchFrame&&!launchFrame.directCraft,look=launchConfig?launchFrame.center.clone():V();let half;if(launchConfig)half=Math.max(launchFrame.half,launchFrame.half*.85/aspect);else if(view==='orbit')half=Math.max(1.32,1.37/aspect);else if(view==='core')half=Math.max(h.bodyHeightM*.82+h.bodyLengthM*.20,(h.bodyLengthM*.64+h.bodyWidthM*.7)/aspect);else if(size){half=Math.max(size.fitHeight*.5,size.fitWidth*.5/aspect);}else half=10;
 let navigationHalf=half;
 if(focus==='prop'&&view==='core'){look.copy(craft.root.localToWorld(V(0,0,-h.bodyLengthM*.07)));half*=1.04;}
 if(focus==='data'&&view==='core'){look.copy(craft.root.localToWorld(V(0,0,-h.bodyLengthM*.16)));half*=.88;}
 if(h.payloadLocation==='radiator'&&craft.payloadPlatformAnchor&&view==='core'){
  // The inspected payload travels with its radiator, outside the service bus.
  // This sets the initial framing only; the existing free zoom/pan remain free.
  craft.root.updateWorldMatrix(true,true);
  const g=deploymentLayout(h),desc=g.descriptors.find(d=>d.type==='rad'),p=leafPose(g,desc,s.deployment??1,h.input.solarTiltDeg,s),points=leafCorners(p,desc).map(q=>craft.root.localToWorld(V(...q)));
  if(!['compute','data','purpose'].includes(focus))for(const x of [-.55,.55])for(const y of [-.55,.55])for(const z of [-.55,.55])points.push(craft.root.localToWorld(V(x*h.bodyWidthM,y*h.bodyHeightM,z*h.bodyLengthM)));
  const right=viewUp.clone().cross(presetDir).normalize(),up=presetDir.clone().cross(right),center=points.reduce((sum,q)=>sum.add(q),V()).multiplyScalar(1/points.length);
  const ext=u=>Math.max(...points.map(p=>p.dot(u)))-Math.min(...points.map(p=>p.dot(u)));
  look.copy(center);half=Math.max(ext(right)/aspect,ext(up),.8)*.62;
 }
 if(launchConfig&&phase==='D'&&s.t>40&&focus==='launch'&&!launchFrame.reference&&['pad','ascent','insertion'].includes(s.flightPhase)){
  const ends=launch.parts.stage.localToWorld(V(0,s.flightPhase==='insertion'?-h.bodyLengthM*.45:-(launch.geometry.upperLengthM||h.stowedLengthM)*.30,0));
  const payload=launch.parts.payload.localToWorld(V(0,h.stowedLengthM*.55,0));
  const tightHalf=Math.max(h.fairing.heightM*.82,ends.distanceTo(payload)*.71,h.stowedDiameterM*1.7/aspect);
  let payloadWeight=1;
  if(h.input.launcher==='starship'&&s.flightPhase==='ascent'){
   const dt=s.t-launchClockFor('starship').stageSeparation;
   const u=clamp(Math.max((-dt-3)/5,(dt-18)/5),0,1);
   payloadWeight=u*u*(3-2*u);
  }
  look.lerp(ends.lerp(payload,.57),payloadWeight);half+=(tightHalf-half)*payloadWeight;
 }
 if(launchConfig&&!inBay()&&!launchFrame.reference&&phase==='D'&&focus&&!['launcher','launch','conops','orbit'].includes(focus)){
  craft.root.updateWorldMatrix(true,false);const coreOnly=domainSceneSpecs[focus].close;
  look.copy(craft.root.localToWorld(V(0,0,coreOnly?0:(h.stowedLengthM-h.bodyLengthM)*.32)));
  half=coreOnly?Math.max(h.bodyHeightM*1.30,h.bodyLengthM*.72/aspect):Math.max(h.stowedLengthM*.73,h.bodyWidthM*1.9/aspect);
 }
 if(launchConfig&&phase==='D'&&launchLens==='fairing'&&s.t>=-600&&s.t<100){
  const patch=launch.parts.fairingPatch,sphere=patch.geometry.boundingSphere;
  look.copy(patch.localToWorld(sphere.center.clone()));
  half=sphere.radius*1.5/Math.min(1,aspect);
 }
 if(launchConfig&&phase==='D'&&launchLens==='base'&&launch.parts.boosterBase&&s.t<100&&s.t>=-600){
  look.copy(launch.parts.boosterBase.getWorldPosition(V()));half=Math.max(launch.geometry.diameterM*.5,2)*3.9;
 }
 if(launchConfig&&phase==='D'&&launchLens==='ship'&&h.input.launcher==='starship'&&s.t>=-600){
  const geo=launch.geometry,shipHeight=geo.heightM-geo.lowerLengthM;look.copy(launch.parts.upper.localToWorld(V(0,shipHeight*.5-geo.upperLengthM,0)));
  half=Math.max(shipHeight*.56,geo.diameterM/aspect);
 }
 if(inspectShipEngines){
  look.copy(launch.parts.upper.localToWorld(V(0,-launch.geometry.upperLengthM-.65,0)));
  half=launch.geometry.diameterM*.77/Math.min(1,aspect);
 }
 if(launchConfig&&phase==='D'&&launchLens==='pad'&&s.t>=-600&&s.t<35){
  const g=launch.geometry,r=g.diameterM/2;look.copy(launch.parts.tower.localToWorld(V(0,-g.lowerLengthM-g.upperLengthM-r*1.8,0)));
  half=Math.max(12,r*6.4);
 }
 if(launchConfig&&phase==='D'&&s.t>=-600&&s.t<35&&launch.ground?.overviewBounds){
  launch.parts.tower.updateWorldMatrix(true,true);
  const box=launch.ground.overviewBounds.clone().applyMatrix4(launch.parts.tower.matrixWorld),extent=box.getSize(V());
  const projected=u=>Math.abs(u.x)*extent.x+Math.abs(u.y)*extent.y+Math.abs(u.z)*extent.z;
  const siteFit=d=>{const right=viewUp.clone().cross(d).normalize(),up=d.clone().cross(right);return Math.max(projected(right)/aspect,projected(up))*.64;};
  const siteHalf=siteFit(presetDir);
  if(['fairing','base','ship','engines','pad','services'].includes(launchLens)){
   const siteDir=direction(defaultPose.launch[0]+(h.input.launcher==='starship'?2.46:0),defaultPose.launch[1]-.10);
   navigationHalf=Math.max(navigationHalf,siteHalf,siteFit(siteDir));
  }
  if(launchLens==='site'){look.copy(box.getCenter(V()));half=siteHalf;}
 }
 if(launchConfig&&phase==='D'&&launchLens==='surroundings'&&s.t>=-600&&s.t<35){
  const geo=launch.geometry;look.copy(launch.parts.tower.localToWorld(V(0,-geo.lowerLengthM-geo.upperLengthM,0)));
  half=Math.max(920,920/aspect);
 }
 if(launchConfig&&phase==='D'&&launchLens==='services'&&s.t>=-600&&s.t<35){
  const context=launch.umbilicals?.getConnectionContext?.(padConnection);
  if(context?.anchor){look.copy(context.anchor.getWorldPosition(V()));half=Math.max(context.halfM||12,1.2)/Math.min(1,aspect);}
 }
 if(view==='spacecraft'&&(s.deployment>=.995||chapter==='commissioning')){
  if(framedDesign!==h){const layout=deploymentLayout(h);
   bodyPoints=[0,.54,.59,.77,.82,1].flatMap(u=>layout.descriptors.flatMap(d=>leafCorners(leafPose(layout,d,u,h.input.solarTiltDeg),d).map(p=>V(...p))));
   for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])bodyPoints.push(V(x*h.bodyWidthM*.6,y*h.bodyHeightM*.6,z*h.bodyLengthM*.65));
   framedDesign=h;
  }
  const right=viewUp.clone().cross(presetDir).normalize(),up=presetDir.clone().cross(right);
  const current=s.deployment>=.995?deploymentLayout(h).descriptors.flatMap(d=>leafCorners(leafPose(deploymentLayout(h),d,s.deployment,h.input.solarTiltDeg,s),d).map(p=>V(...p))):[];

  let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
  for(const point of [...bodyPoints,...current]){const q=point.clone().applyQuaternion(craft.root.quaternion),x=q.dot(right),y=q.dot(up);
   xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}
  look.copy(right).multiplyScalar((xmin+xmax)/2).addScaledVector(up,(ymin+ymax)/2);half=Math.max((xmax-xmin)/aspect,ymax-ymin)*.57;
 }
 if(stagingBounds&&chapter!=='commissioning'&&view!=='core'&&view!=='orbit'&&!launchConfig){const ext=stagingBounds.getSize(V()),right=viewUp.clone().cross(presetDir).normalize(),up=presetDir.clone().cross(right),extent=u=>Math.abs(u.x)*ext.x+Math.abs(u.y)*ext.y+Math.abs(u.z)*ext.z;look.copy(stagingBounds.getCenter(V()));half=Math.max(half,extent(right)*.53/aspect,extent(up)*.53);}
 navigationHalf=Math.max(navigationHalf,half);
 if(view==='spacecraft'&&spacecraftFocus==='core'){
  const right=viewUp.clone().cross(presetDir).normalize(),up=presetDir.clone().cross(right);
  look.copy(craft.root.position);half=chassisFitHalfHeight(h,right,up,aspect,craft.root.quaternion);
 }
 if(chapter==='commissioning'&&view==='spacecraft'&&deploymentLens!=='vehicle'){
  const g=deploymentLayout(h),m=mechanismPose(g,s.deployment,h.input.solarTiltDeg,s);
  if(deploymentLens==='wing'){
   const wing=m.wings.find(w=>w.side===1&&w.end===1);
   look.copy(craft.root.localToWorld(V(...wing.tip)));half=Math.max(g.ww*.82,g.ww*.76/aspect,.6);
  }else{
   const bank=m.banks[s.deployment>=.69?1:0]||m.banks[0];
   if(g.familyId==='redwire-platform'){
    const installation=craft.redwireHarnessInstallation,bounds=new T.Box3().setFromPoints([craft.root.localToWorld(V(...bank.root))]);
    for(const [id,part] of installation?.parts||[])if(id.startsWith('redwire:rotary:'))bounds.expandByObject(part);
    for(const anchor of installation?.inspectionPoints||[])bounds.expandByPoint(anchor.getWorldPosition(V()));
    bounds.getCenter(look);half=Math.max(bounds.getSize(V()).length()*.58/Math.min(1,aspect),.6);
   }else{look.copy(craft.root.localToWorld(V(...bank.elbow)));half=Math.max(g.r*.75,g.rw*.60/aspect,.6);}
  }
 }
 if(inBay()){
  const bay=launch.bay,cart=bay.equipmentAnchor.getWorldPosition(V()),port=bay.portAnchor.getWorldPosition(V());
  const r=h.fairing.outerDiameterM/2,lowest=bay.floorY,top=h.stowedLengthM;
  const workLook=V(),workHalf=bayWorkFit(presetDir,aspect,workLook);navigationHalf=workHalf;
  if(inspectingMounts()){
   look.copy(launch.parts.liveMount.getWorldPosition(V()));
   half=bayLens==='endOn'?h.stowedDiameterM*.61/Math.min(1,aspect):Math.max(h.stowedLengthM*.59,h.stowedDiameterM*.61/aspect);
  }else if(bayLens==='payload'){
   look.copy(launch.parts.payload.localToWorld(V(0,h.stowedLengthM*.48,0)));
   half=Math.max(h.stowedLengthM*.74,(Math.max(h.stowedDiameterM,r*1.65)*.66+.65)/aspect);
  }else if(bayLens==='equipment'){look.copy(cart);half=activeProcessing()?.id==='propellant'?Math.max(2.55,3.45/aspect):Math.max(1.22,1.38/aspect);}
  else if(bayLens==='interface'){look.copy(port);half=Math.max(.82,1.05/aspect);}
  else if(bay.layout.star||['launch','launcher','conops'].includes(focus)||launchFrame.bayTime>-3000){
   look.copy(workLook);half=workHalf;
  }else{
   look.set(.12*cart.x,lowest+.42*(top-lowest),cart.z*.26);
   half=Math.max((top-lowest)*.63,(2.25*r+1.2)/aspect,2.7);
  }
 }
 // Close presets share the surrounding view's finite zoom-out extent. A
 // one-metre interface must not become a four-metre navigation cage.
 zoomFloor=Math.min(.25,.25*half/Math.max(half,navigationHalf));
 const zoom=pose[key][2]=clamp(pose[key][2],zoomFloor,10);
 half/=zoom;halfAtFocus=half;look.add(pan[key].clone().applyQuaternion(cameraPanFrame));
 const perspective=view==='launch'&&!inspectingMounts();camera=perspective?launchCamera:orthCamera;
 const dist=perspective?half/Math.tan(17*DEG):view==='orbit'?5:Math.max(40,(size?.span??20)*4);
 if(inBay()&&!inspectingMounts()){
  const floor=launch.bay.floorY;
  look.y=Math.max(look.y,floor+.1);
  // Stop pitching at the floor while keeping the eye on its orbit sphere.
  const minY=clamp((floor+.35-look.y)/dist,-1,1);
  if(dir.y<minY){
   const horizontal=Math.sqrt(1-minY*minY);
   dir.set(Math.sin(orbitAz)*horizontal,minY,Math.cos(orbitAz)*horizontal);
  }
 }
 // Framing, range and pivot have already been chosen independently of the drag.
 if(freeOrbit&&!orbitalTurns[key].equals(identityTurn)){
  eyeTurn.setFromRotationMatrix(eyeBasis.lookAt(dir,origin,viewUp)).multiply(orbitalTurns[key]);
  dir.set(0,0,1).applyQuaternion(eyeTurn);viewUp.set(0,1,0).applyQuaternion(eyeTurn);
 }
 cameraTarget.copy(look);camera.position.copy(look).addScaledVector(dir,dist);
 camera.up.copy(viewUp);camera.lookAt(look);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;
 // Scale perspective depth precision with the eye-to-focus distance in the
 // bay and in flight too. Ground views retain their larger landscape clearance;
 // orthographic orbital and mounting views keep their existing clipping range.
 camera.near=perspective?stablePerspectiveNear(camera.position.distanceTo(look),launchConfig&&launchFrame.environment==='ground'?Math.max(.07,dist*.01):.07):.001;camera.far=dist*(launchConfig?55:4);if(launchConfig&&['ground','sky'].includes(launchFrame.environment))camera.far=Math.max(camera.far,60000);if(inspectingMounts()){const depth=.57*Math.hypot(h.stowedLengthM,h.stowedDiameterM);camera.near=Math.max(.05,dist-depth);camera.far=dist+depth;}if(perspective)camera.aspect=aspect;camera.updateProjectionMatrix();camera.updateMatrixWorld();ring.quaternion.copy(camera.quaternion);}
 function anchorFor(id){
  if(view==='orbit'){
   if(id==='orbitCraft')return mark.getWorldPosition(V());
   if(id==='station'&&s.stationECI)return eci(s.stationECI,1/R);
   if(id==='orbitGround')return s.positionECI?eci(s.positionECI,1/R).normalize():null;return null;
  }
  if(view==='launch'&&launch&&launchFrame&&!launchFrame.directCraft){const {payload,liveMount,stage,upper,shell}=launch.parts;
   if(id==='sea-level'||id==='vacuum')return upper.children.find(o=>o.userData.engineFamily===id)?.getWorldPosition(V());
   if(id==='boosterBase')return launch.parts.boosterBase?.getWorldPosition(V());
   if(id==='padWorks')return launch.parts.tower.localToWorld(V(0,-launch.geometry.upperLengthM-launch.geometry.lowerLengthM-launch.geometry.diameterM*.9,0));
   if(id==='hotstage')return launch.parts.lower.localToWorld(V(0,-launch.geometry.upperLengthM,0));
   if(id==='cargoJamb')return shell.getObjectByName('Hatch latch socket')?.getWorldPosition(V());
   if(id==='carriage')return shell.getObjectByName('Retained cargo carriage')?.getWorldPosition(V());
   if(id==='interface')return payload.localToWorld(V(0,.18,0));
   if(id==='payload')return liveMount.getWorldPosition(V());
   if(id==='thrustDeck'){const q=launch.parts.boosters?.[0];return q&&q.visible?q.localToWorld(V(0,launch.geometry.lowerLengthM*.51,0)):launch.parts.lower.localToWorld(V(0,-launch.geometry.upperLengthM-launch.geometry.lowerLengthM*.75,0));}
   if(id==='rocket')return stage.localToWorld(V(0,-(launch.geometry?.upperLengthM||h.input.fairingLengthM)*1.12,0));
   if(id==='shroud')return (shell.visible?shell:upper).localToWorld(V(0,shell.visible?(h.fairing?.heightM||12)*.43:-1,0));
  }
  return hardwareAnchor(id,craft,h,s);
 }
 function bayCaptions(){
  if(!(captureAppearance?.leaders??bayLabels))return [];
  const bay=launch.bay,process=activeProcessing(),inspect=process?.domain||focus,connected=launchFrame.bayTime<=-3000;
  const points=[...(bay.annotations?.()||[]),
   {id:'flight-article',title:'Stowed spacecraft',detail:connected?'Integrated flight article':'Article follows handling sequence',anchor:launch.parts.payload.localToWorld(V(0,h.stowedLengthM*.54,0)),kind:'flight',lens:'payload',priority:121},
   {id:'active-ground-tool',title:bay.station.name||'Ground equipment',detail:process?'Processing rehearsal · portable GSE':'Domain checkout equipment',anchor:bay.equipmentAnchor,kind:'ground',lens:'equipment',priority:120},
   {id:'flight-test-point',title:bay.interfaceLabel||'Spacecraft test point',detail:connected?'Removable ground connection':'Ground umbilicals disconnected',anchor:bay.portAnchor,kind:'ground',lens:'interface',priority:115},
   {id:'receiving-stage',title:bay.layout.star?'Starship receiving vehicle':bay.layout.horizontal?'Receiving upper stage':bay.layout.record.family==='cz5'?'Single-stage receiving core':'Receiving launch stage',detail:bay.layout.horizontal?'Horizontal mating zone':'Launcher integration zone',anchor:bay.receiverAnchor,kind:'flight',priority:85}
  ];
  const addHardware=(id,title,detail,priority=80)=>{const anchor=hardwareAnchor(id,craft,h,s);if(anchor)points.push({id:'flight-'+id,title,detail,anchor,kind:'flight',lens:'payload',priority});};
  if(!['equipment','interface'].includes(bayLens)){
   addHardware('solar','Stowed solar array','Retained for launch',90);addHardware('radiator','Folded radiator bank','Launch restraints engaged',89);
   addHardware('optic','Optical terminal','Flight communications aperture',83);addHardware('dish','Ka-band terminal','Stowed flight antenna',84);
   if(inspect==='power')addHardware('battery','Spacecraft battery','Installed flight energy storage',111);
   if(inspect==='prop'){addHardware('fuel','Spacecraft fuel tank','Flight propellant vessel',109);addHardware('oxidizer','Spacecraft oxidizer tank','Separate flight propellant vessel',108);addHardware('engine','Propulsion assembly','Flight hardware',90);}
   if(inspect==='thermal')addHardware('coolant','Flight thermal loop','Installed ammonia circuit',109);
   if(['compute','data','purpose'].includes(inspect)){addHardware('compute','Compute payload','Installed flight electronics',109);addHardware('storage','Solid-state storage','Flight data equipment',105);}
   if(['attitude','avionics','software'].includes(inspect)){addHardware('avionics','Flight avionics','Command and telemetry',109);addHardware('cmg','Attitude actuators','Flight control hardware',104);}
  }
  if(inspectingMounts())for(const [i,m] of deploymentLayout(h).mounts.filter(m=>m.side===1&&(m.kind==='radiator'||m.end===1)).entries()){
   const p=(m.supports.find(st=>st.role==='restraint')||m.supports[0]||{seat:m.root}).seat;
   points.push({id:'restraint-'+i,title:m.kind==='solar'?'Solar cassette restraint':'Folded bank hold-down',detail:'Attached launch restraint',anchor:launch.parts.liveMount.localToWorld(V(...p)),kind:'flight',priority:135});
  }
  const projected=[];
  for(const entry of points){
   const anchor=entry.anchor;if(!anchor||!anchor.isVector3&&!visibleBayObject(anchor))continue;
   const world=anchor.isVector3?anchor.clone():anchor.getWorldPosition(V());annotationTargets.set(entry.id,world.clone());annotationRecords.set(entry.id,{...entry,category:entry.kind==='flight'?'flight':'ground'});
   const eye=camera.worldToLocal(world.clone());if(eye.z>=0)continue;
   const q=world.project(camera);if(q.z< -1||q.z>1||Math.abs(q.x)>.99||Math.abs(q.y)>.95)continue;
   projected.push({...entry,x:(q.x+1)*w/2,y:(1-q.y)*ht/2,priority:entry.priority+(entry.lens===bayLens?35:0)+(process&&entry.kind==='process'?18:0)});
  }
  return layoutBayAnnotations(projected,w,ht);
 }
 function padCaptions(){
  if(view!=='launch'||phase!=='D'||s.t< -600||s.t>=35||launchFrame?.environment!=='ground'||!launch?.ground)return null;
  if(!['launcher','launch','conops','orbit'].includes(focus)&&!['site','surroundings','services','pad'].includes(launchLens))return null;
  launch.root.updateWorldMatrix(true,true);
  if(launchFrame.padCutaway){
   const badge=document.createElement('span');badge.className='pad-cutaway-badge';badge.textContent=launchFrame.padCutawayLabel||'Inspection cutaway · flight interface';tags.append(badge);
  }
  const projected=[],entries=launchLens==='surroundings'?(launch.ground.environment?.labels?.()||[]):[...(launch.ground.annotations||[]),...(launch.umbilicals?.annotations||[])];
  for(const entry of entries){
   const anchor=entry.anchor;if(!anchor||!visibleBayObject(anchor))continue;
   const world=anchor.getWorldPosition(V());annotationTargets.set(entry.id,world.clone());annotationRecords.set(entry.id,{...entry,category:'site'});
   const eye=camera.worldToLocal(world.clone());if(eye.z>=0)continue;
   const p=world.project(camera);if(p.z< -1||p.z>1||Math.abs(p.x)>.99||Math.abs(p.y)>.95)continue;
   const px=(p.x+1)*w/2,py=(1-p.y)*ht/2;if(px<Math.min(350,w*.58)&&py<142)continue;
   projected.push({...entry,pad:true,x:px,y:py,
    priority:(entry.priority||0)+(entry.connectionId===padConnection?180:0)+(launchLens==='services'&&entry.connectionId?40:0)});
  }
  if(!projected.length)return null;
  return layoutBayAnnotations(projected,w,ht);
 }
 function domainCaptions(){
  if(inBay())return bayCaptions();
  const pad=padCaptions();if(pad)return pad;
  if(!focus&&!pointingLabels.length)return [];
  const hasBadge=view==='launch'&&phase==='D'&&launchFrame&&!launchFrame.directCraft&&!['launcher','conops','orbit'].includes(focus);
  if(hasBadge){
   const badge=document.createElement('div');badge.setAttribute('data-stage-context',s.flightPhase||'');badge.style.cssText='position:absolute;left:10px;top:38px;background:#101c26ee;color:#f0d5a9;border:1px solid #526771;border-radius:4px;padding:5px 6px 3px;text-align:center;font:600 8px/1.3 ui-monospace,monospace;letter-spacing:.05em';
   badge.innerHTML='<span style="display:block">STACK CONTEXT</span>'+launchContextBadge(launch,h,s);tags.append(badge);
  }
  let entries;
  if(pointingLabels.length)entries=pointingLabels;
  else if(view==='launch'&&launchLens==='engines'&&phase==='D'&&shipEngineViewAvailable(h.input.launcher,s.t)){
   const active=s.t<launchClockFor('starship').upperCutoff;
   entries=[{anchor:'sea-level',side:'left',title:'Three sea-level Raptors',value:active?'Smaller inner bells · firing':'Smaller inner bells · off',color:'#bbd8ff'},
    {anchor:'vacuum',side:'right',title:'Three vacuum Raptors',value:active?'Larger outer bells · firing':'Larger outer bells · off',color:'#a7e2cc'}];
  }
  else if(view==='spacecraft'&&chapter==='commissioning'){
   const g=deploymentLayout(h),motion=mechanismPose(g,s.deployment,h.input.solarTiltDeg,s);
   const wing=motion.wings.find(v=>v.side===1&&v.end===1),bank=motion.banks[s.deployment>=.69?1:0]||motion.banks[0];
   const mark=(anchor,bodyPoint,side,title,value,color)=>({anchor,bodyPoint,side,title,value,color});
   const redwire=g.familyId==='redwire-platform',detail=deploymentLens==='hinge'||(deploymentLens==='vehicle'&&(redwire?s.deployment>=.06&&s.deployment<.42:s.deployment>=.46&&s.deployment<.92));
   const installation=redwire&&craft.redwireHarnessInstallation;
   if(detail&&installation){
    const local=anchor=>craft.root.worldToLocal(anchor.getWorldPosition(V())).toArray();
    entries=[mark('harness-rotary-transfer',local(installation.hingeAnchor),'left','Power and fiber rotary joint','Fixed stator · platform-carried rotor','#f1ac65'),mark('harness-platform-raceways',local(installation.panelAnchor),'right','Mounted platform harnesses','Open ladder trays · side-entry connectors','#a5d2c8')];
   }else entries=detail?(redwire?[mark('radiator-root',bank.root,'left','Platform hinge',Math.round(Math.abs(bank.rootPitch)*180/Math.PI)+'° from stow','#f1ac65')]:[mark('radiator-root',bank.root,'left','Radiator root',Math.round(Math.abs(bank.rootPitch)*180/Math.PI)+'° from stow','#f1ac65'),mark('radiator-elbow',bank.elbow,'right','Outer hinge',Math.round(180-Math.abs(bank.outerPitch-bank.rootPitch)*180/Math.PI)+'° open','#a5d2c8')]):
    [mark('solar-root',wing.root,'left','Fixed wing saddle','Body attachment','#9ed2bf'),mark('solar-tip',wing.tip,'right','Moving tip drum',wing.span.toFixed(2)+' m paid out','#94bfe5')];
  }else if(view==='launch'&&phase==='D'&&['launcher','launch','conops'].includes(focus)&&['pad','ascent'].includes(s.flightPhase)&&s.t<35){
   const site=launchSiteFor(h.input.launcher,h.input.launchSite),star=h.input.launcher==='starship',falcon=h.input.launcher==='falconHeavy';
   const caption=(anchor,side,title,value,color)=>({anchor,side,title,value,color});
   entries=launchLens==='ship'?[caption('shroud','right','Starship V3','Tiled windward face and four flaps','#a7c8d1'),caption('hotstage','left','Ship engine bay','Three sea-level and three vacuum Raptors','#e1ca9c')]:launchLens==='pad'?[caption('padWorks','left','Exhaust routing',site.name,'#9fdace')]:
    launchLens==='base'?[caption('boosterBase','right',falcon?'Landing legs':'Super Heavy',falcon?'Retracted during ascent':'Aft skirt and Raptor cluster','#cbb798')]:
    [caption('hotstage','right',star?'Hot-staging interface':falcon?'Center core':'Stage interface',star?'Ship / Super Heavy':falcon?'Three Merlin cores':h.launcherLabel,'#b8d4db'),
     caption('padWorks','left','Launch mount',site.name+' · '+site.region,'#cca874')];
  }else entries=domainInstruments(focus,h,s,{view,reference:launchFrame?.reference});
  const projected=[];
  craft.root.updateWorldMatrix(true,true);if(launch&&view==='launch')launch.root.updateWorldMatrix(true,true);
  for(const [index,el] of entries.entries()){
   const v=el.bodyPoint?craft.root.localToWorld(V(...el.bodyPoint)):anchorFor(el.anchor);if(!v)continue;
   const anchorId='instrument:'+el.anchor;annotationTargets.set(anchorId,v.clone());annotationRecords.set(anchorId,{...el,id:anchorId,instrument:el.anchor});
   if(camera.worldToLocal(v.clone()).z>=0)continue;
   const p=v.clone().project(camera),px=(p.x+1)*w/2,py=(1-p.y)*ht/2;
   if(!Number.isFinite(px+py)||p.z< -1||p.z>1||px<-3||px>w+3||py<0||py>ht)continue;
   if(hasBadge&&px<Math.min(350,w*.58)&&py<142)continue;
   projected.push({...el,id:anchorId,instrument:el.anchor,labelSide:el.side,x:px,y:py,kind:'flight',priority:el.priority??entries.length-index});
  }
  return layoutBayAnnotations(projected,w,ht);
 }
 function navigationGuides(){
  if(!(captureAppearance?.vectors??showOrbitVectors)||!navReadings.length){navigation.group.visible=false;return;}
  const globe=view==='orbit',stacked=view==='launch'&&!launchFrame?.directCraft;
  const origin=globe?mark.position:craft.root.getWorldPosition(V());
  const toScene=globe?v=>eci(v):stacked?v=>eci(v).applyQuaternion(flightFrame.orbital.clone().invert()).applyAxisAngle(V(1,0,0),-Math.PI/2):frameDirection;
  const tips=navigation.update(navReadings,origin,toScene,halfAtFocus,ht,globe,s.rangeKm);
  const towardEye=globe?camera.getWorldDirection(V()).negate():null;
  const names={velocity:'Velocity',sun:'Sun',station:s.station||'Station'};
  // Small pointer-tip chips leave magnitudes and longer definitions to the legend.
  const occupied=[];
  for(const tip of tips){
   if(globe&&behindGlobe(tip.point,towardEye))continue;
   const q=tip.point.project(camera);
   if(Math.abs(q.x)>.97||Math.abs(q.y)>.94||Math.abs(q.z)>1)continue;
   const text=names[tip.id],width=text.length*5.9+10;
   const x=clamp((q.x+1)*w/2,5+width/2,w-5-width/2);
   const at=(1-q.y)*ht/2;
   const y=[at-12,at+11,at-28,at+27].find(y=>y>10&&y<ht-9&&occupied.every(p=>Math.abs(p.x-x)>(p.width+width)/2+2||Math.abs(p.y-y)>16));
   if(y===undefined)continue;
   occupied.push({x,y,width});
   const el=document.createElement('span');el.setAttribute('data-orbit-vector',tip.id);el.textContent=text;
   el.style.cssText='position:absolute;pointer-events:none;left:'+x+'px;top:'+y+'px;transform:translate(-50%,-50%);padding:1px 4px;border:1px solid '+tip.color+'77;border-radius:3px;background:#0c151ce8;color:'+tip.color+';white-space:nowrap;font:600 10px/1.3 system-ui,sans-serif';
   tags.append(el);
  }
 }
 function updateHardwareDetail(){
  const inspect=activeProcessing()?.domain||focus;
  const parts=selected?[selected]:(inspect==='thermal'?['radiator','compute','battery','propellant']:(domainSceneSpecs[inspect]?.parts||[]));
  const objects=new Set();if(detailFocus)objects.add(detailFocus);
  if(inBay()&&launch?.bay?.station&&(bayLens==='equipment'||inspect&&!['conops','orbit','launch','launcher'].includes(inspect)))objects.add(launch.bay.station);
  const options={camera,width:w,height:ht,mode:detailMode,focusedObjects:objects,focusedParts:parts,surface:'scene',thermal:thermalEnabled(),frameMs:renderCostMs,motionKey:s.t+'/'+(processingState?.progress??'')};
  craftDetail?.update({...options,enabled:craftGroup.visible&&view!=='orbit'});
  launchDetail?.update({...options,enabled:view==='launch'&&!!launch?.root.visible});
  const states=[craftDetail?.stats(),launchDetail?.stats()].filter(Boolean),high=states.reduce((n,x)=>n+x.activeHigh,0),medium=states.reduce((n,x)=>n+x.activeMedium,0),pending=states.reduce((n,x)=>n+x.pending,0);
  const refined=high+medium,triangles=states.reduce((n,x)=>n+x.triangles,0),calls=states.reduce((n,x)=>n+x.drawCalls,0);
  container.dataset.hardwareDetail=detailMode;container.dataset.detailRefined=String(refined);container.dataset.detailTriangles=String(triangles);container.dataset.detailDrawCalls=String(calls);
  const status=thermalEnabled()?'Temperature overlay':detailMode==='low'?'Standard geometry':pending?'Refining hardware…':refined?'Detailed close-up':'Detail follows the view';
  const key=[status,detailMode].join('/');if(key!==detailStateKey){detailStateKey=key;onDetailChange({mode:detailMode,status,high,medium,pending});}
  if(pending)request();
 }
 function render(){raf=0;if(!alive||!w||!ht||!craft||!container.getClientRects().length)return;setCamera();updateHardwareDetail();signalFrame();if(captureAppearance?.signals===false)signals.group.visible=false;annotation.visible=captureAppearance?.guides!==false;selection.visible=captureAppearance?.guides!==false;if(custody&&captureAppearance?.guides===false)custody.root.visible=false;lightScene();siteView.update(launch,launchFrame,view,launchLens);if(inBay())launch.bay.setViewFrom(camera);if(view==='launch')launch?.faceLaunchClouds?.(camera);tags.replaceChildren();annotationTargets.clear();annotationRecords.clear();navigationGuides();if(view==='spacecraft'&&layers.includes('dimensions')){let p=V(0,0,Math.max(h.wingWidthM*1.15,h.bodyLengthM*.7)).applyMatrix4(craft.root.matrixWorld).project(camera);label((p.x+1)*w/2,(1-p.y)*ht/2,`PV span ${craft.wingspan.toFixed(1)} m`);}if(view==='orbit'&&orbitAxes.visible){
   for(const [id,dir] of [['+X',V(.105,0,0)],['+Y',V(0,.105,0)],['+Z',V(0,0,.105)]]){
    const world=orbitAxes.localToWorld(dir);if(world.dot(camera.position)<1)continue;
    const p=world.project(camera);label((p.x+1)*w/2,(1-p.y)*ht/2,id);
   }
  }
  if(view==='orbit'&&onPhaseF()&&phaseFGround.visible){spin.updateMatrixWorld(true);for(const {m,name} of landmarks){const v=m.getWorldPosition(V());if(v.dot(camera.position)<=.9)continue;const p=v.project(camera);label((p.x+1)*w/2,(1-p.y)*ht/2+(name==='Target'?-13:14),name);}}
 if(view!=='orbit'&&s.deployment>0&&s.deployment<1)label(w*.5,ht*.14,Math.round(s.deployment*100)+'% · '+deploymentSchedule(s.deployment,h).title);
 if(selected==='propellant'&&view!=='orbit'&&view!=='launch'){const kg=s.propellantKg??h.propellantKg;label(w*.5,ht*.81,`${kg.toFixed(1)} kg · ${(s.tankFillPct??(h.input.tankFill||0)*100).toFixed(1)}% fill`);}if(view==='launch'&&(launchFrame?.reference||launchFrame?.vehicleStudy))label(w*.5,Math.max(30,ht-30),launchFrame.vehicleStudy?'LAUNCH STACK · CONFIGURATION REFERENCE':'STOWED CONFIGURATION · DESIGN REFERENCE');if(view==='core'&&h.trays>28&&(!focus||focus==='compute'))label(w*.5,ht*.12,'COMPUTE RACKS · '+craft.trayRows.length+' INSTALLED / '+h.rackLayout.capacity+' SLOTS');if(view==='core'&&!selected&&!focus&&thermalEnabled()){const captions=[
   [V(h.bodyWidthM*.54,0,-h.bodyLengthM*.19),'Junction',s.junctionK],
   [V(-h.bodyWidthM*.45,-h.bodyHeightM*.20,h.bodyLengthM*.24),'Coolant',s.coolantK],
   [V(0,h.bodyHeightM*.14,h.bodyLengthM*.5),'Battery',s.batteryK]
  ];craft.root.updateMatrixWorld();for(const [anchor,name,value] of captions){if(!Number.isFinite(value))continue;const p=anchor.applyMatrix4(craft.root.matrixWorld).project(camera);label(clamp((p.x+1)*w/2,58,w-58),clamp((1-p.y)*ht/2,24,ht-22),name+' · '+value.toFixed(1)+' K');}}
  if(view==='launch'&&!inBay()&&phase==='D'&&focus&&!['launch','launcher','conops','orbit'].includes(focus)&&launchFrame&&!launchFrame.directCraft)label(w*.5,Math.max(25,ht-27),s.flightPhase.toUpperCase()+' · '+(s.carrierAttached?'STOWED PAYLOAD CUTAWAY':'SEPARATED PAYLOAD'));if(view==='launch'&&layers.includes('dimensions')&&launchFrame?.environment==='hangar'&&h.fairing){label(w*.5,ht*.16,'KEEP-IN Ø '+h.fairing.maxDiameterM.toFixed(2)+' m · '+h.fairing.heightM.toFixed(2)+' m HIGH');}drawBayAnnotations(annotationTags,domainCaptions(),{actions:true});const axisBody=view==='launch'&&launchFrame?.reference?launch?.parts.liveMount:craft.root;triad.update(camera,axisBody,view==='orbit');const renderStarted=performance.now();if(skyVisible()||view==='orbit'&&s.sunECI){
   if(view==='orbit'){backdrop.overview(camera,s,w/ht);earth.updateWorldMatrix(true,false);earthAppearance.prepare(camera,earth,{width:w,height:ht});}
   else{renderer.getDrawingBufferSize(earthBufferSize);backdrop.update(camera,flightFrame,s,w/ht,view==='launch'&&!launchFrame?.directCraft,capturePreparation||recording?.viewport||{width:earthBufferSize.x,height:earthBufferSize.y});}
   earthAppearance.update(eci(s.sunECI),s.t);
   if(gpu){renderer.autoClear=false;renderer.clear();renderer.render(backdrop.scene,backdrop.camera);renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=true;}
   else{renderer.render(backdrop.scene,backdrop.camera);renderer.render(scene,camera,true);}
  }else renderer.render(scene,camera);renderCostMs=performance.now()-renderStarted;const earthState=view==='orbit'?earthAppearance.state:earthObserver.state,earthLoading=(view==='orbit'||skyVisible())&&earthState.loading;earthStatus.hidden=!earthLoading;if(earthLoading){const detail=earthState.detail,message=!earthState.baseReady?'Loading Earth imagery…':detail?.requestedPages?`Refining Earth detail · ${detail.completedPages}/${detail.requestedPages} regions`:'Loading Earth surface detail…';if(earthStatus.textContent!==message)earthStatus.textContent=message;}if(hoverHit&&hoverHit.t!==s.t&&!drag)hoverPart({clientX:hoverHit.x,clientY:hoverHit.y});lastPaint=performance.now();if(recording&&!captureInProgress)recordPaint();}
 function request(feedback=false){if(!alive)return;captureRevision++;captureAppearance?.onChange?.(captureRevision);if(feedback)siteView.pending();if(raf)return;raf=requestAnimationFrame(feedback&&!gpu?()=>{raf=requestAnimationFrame(render);}:render);}
 function resize(){
  const r=container.getBoundingClientRect();w=Math.floor(r.width);ht=Math.floor(r.height);
  if(w>0&&ht>0){
   if(recording){
    const dimensions=recordingDimensions(recording);recording.viewport={width:dimensions.width,height:dimensions.height};
    if(gpu){renderer.setPixelRatio(dimensions.scale);renderer.setSize(w,ht,false);}
    else renderer.setSize(dimensions.width,dimensions.height);
   }else{if(gpu)renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));renderer.setSize(w,ht,false);}
   request();
  }
 }
 function captureSettings(){
  const vectorsAvailable=navReadings.length>0;
  const guidesAvailable=layers.includes('pointing')&&pointingViewAllowed(view,s,launchFrame?.directCraft)||annotation.children.length>0||selection.children.length>0||orbitAxes.visible||!!custody?.root.visible;
  return {view,lighting:lightingMode,lightingAvailable:orbitalLightingAvailable(view,s)&&!launchFrame?.reference,
   exposureEV,vectors:showOrbitVectors,vectorsAvailable,signals:true,
   signalsAvailable:s.t>=INSERTION_MET&&!s.carrierAttached&&!s.referenceBody&&!s.orbitLost&&(view!=='launch'||launchFrame?.environment==='space'&&!launchFrame.reference),
   guides:true,guidesAvailable,
   thermal:layers.includes('thermal'),thermalAvailable:view!=='orbit'&&!s.referenceBody&&!launchFrame?.reference,
   leaders:!inBay()||bayLabels};
 }
 function beginCaptureAppearance(options={}){
  if(captureAppearance)throw new Error('A capture preview is already open.');
  const token={};captureAppearance=token;
  const defaults=captureSettings();
  function updateAppearance(next={}){
   if(captureAppearance!==token)return;
   const oldThermal=token.thermal,oldGuides=token.guides;
   token.lighting=normalizeLightingMode(next.lighting??defaults.lighting);
   const ev=Number(next.exposureEV??defaults.exposureEV);
   token.exposureEV=Number.isFinite(ev)?clamp(ev,-2,2):defaults.exposureEV;
   token.vectors=typeof next.vectors==='boolean'?next.vectors:defaults.vectors;
   token.signals=typeof next.signals==='boolean'?next.signals:defaults.signals;
   token.leaders=typeof next.leaders==='boolean'?next.leaders:defaults.leaders;
   token.guides=typeof next.guides==='boolean'?next.guides:defaults.guides;
   token.thermal=typeof next.thermal==='boolean'?next.thermal:defaults.thermal;
   if(craft){
    if(oldGuides!==token.guides){updatePointing();if(view==='orbit')updateOrbit();}
    if(oldThermal!==token.thermal||oldGuides!==token.guides)updateThermal();
   }
   request();
  }
  function release(){
   if(captureAppearance!==token)return;token.onChange=null;captureAppearance=null;
   if(!alive)return;
   if(craft){updatePointing();if(view==='orbit')updateOrbit();updateThermal();}
   request();
  }
  try{updateAppearance(options);}catch(error){release();throw error;}
  return {update:updateAppearance,release,onChange(listener){
   token.onChange=listener;
   return ()=>{if(token.onChange===listener)token.onChange=null;};
  }};
 }
 function captureStatus(){
  if(captureMaximum===null){
   // Limit export allocations as well as respecting the actual GPU framebuffer.
   const gl=gpu?renderer.getContext():null,viewport=gl?.getParameter(gl.MAX_VIEWPORT_DIMS);
   captureMaximum=gpu?Math.max(1,Math.min(4096,renderer.capabilities.maxTextureSize,gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),viewport[0],viewport[1])):4096;
  }
  const earthVisible=view==='orbit'||!!skyVisible(),earthState=view==='orbit'?earthAppearance.state:earthObserver.state;
  const groundVisible=view==='launch'&&['ground','sky'].includes(launchFrame?.environment),ground=groundVisible?launch?.ground?.environment:null;
  const loading=!!(earthVisible&&earthState.loading||ground?.status==='loading');
  const assetError=!!(earthVisible&&earthState.error||ground?.status==='error');
  const ready=!!(alive&&craft&&w>0&&ht>0&&container.getClientRects().length&&(!gpu||!renderer.getContext().isContextLost()));
  return {ready,revision:captureRevision,width:w,height:ht,maxDimension:captureMaximum,renderer:gpu?'webgl':'canvas',
   loading,pendingCount:(earthVisible?earthState.pendingCount||0:0)+(ground?.status==='loading'?1:0),assetError,
   assetsReady:ready&&!loading&&!assetError&&(!earthVisible||earthState.baseReady),
   recording:!!recording,targetWidth:(capturePreparation||recording?.viewport)?.width||null,targetHeight:(capturePreparation||recording?.viewport)?.height||null};
 }
 function captureDimensions({width=w,height=ht}={}){
  const status=captureStatus();if(!status.ready)throw new Error('Open a 3D view before capturing it.');
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('Capture dimensions must be positive numbers.');
  const maxPixels=8388608;
  const scale=Math.min(width/w,height/ht,status.maxDimension/w,status.maxDimension/ht,Math.sqrt(maxPixels/(w*ht)));
  return {width:Math.max(1,Math.floor(w*scale)),height:Math.max(1,Math.floor(ht*scale)),scale};
 }
 function paintNow(){if(raf)cancelAnimationFrame(raf);raf=0;render();}
 function recordingDimensions({width=1920,height=1920}={}){
  const dimensions=captureDimensions({width:Math.min(1920,width),height:Math.min(1920,height)});
  // The CPU path records the picture already being displayed. Enlarging its
  // raster for every flight tick would stall both playback and the controls.
  if(!gpu&&dimensions.scale>1)return {width:w,height:ht,scale:1};
  return dimensions;
 }
 function releaseRecording(token){
  if(recording!==token)return;
  recording=null;token.onFrame=null;token.onError=null;
  if(alive)resize();
 }
 function recordPaint(){
  const token=recording;if(!token||!alive)return;
  try{
   const {canvas,context}=token;
   if(canvas.width!==cv.width)canvas.width=cv.width;
   if(canvas.height!==cv.height)canvas.height=cv.height;
   context.save();
   try{context.setTransform(1,0,0,1,0,0);context.globalAlpha=1;context.globalCompositeOperation='copy';context.drawImage(cv,0,0);}
   finally{context.restore();}
   // The caller may retain this canvas until the next callback. Copy before
   // returning from the paint, while the WebGL drawing buffer is still valid.
   token.onFrame(canvas);
  }catch(error){
   token.error=error;const onError=token.onError;releaseRecording(token);
   if(onError)onError(error);else console.error('Scene recording stopped.',error);
  }
 }
 // Frames come only from real scene paints: no recording timer and no extra
 // per-frame render or buffer resize. The returned size is the initial frame;
 // later callbacks can change size after a viewport resize (letterbox outside).
 function beginRecording({width=1920,height=1920,onFrame,onError=null}={}){
  if(recording||captureInProgress)throw new Error('A scene capture is already in progress.');
  if(typeof onFrame!=='function')throw new Error('Recording needs a frame callback.');
  const dimensions=recordingDimensions({width,height}),canvas=document.createElement('canvas');
  const context=canvas.getContext('2d',{alpha:true});if(!context)throw new Error('The recording canvas is unavailable.');
  const token={width,height,canvas,context,onFrame,onError,viewport:{width:dimensions.width,height:dimensions.height}};
  recording=token;
  try{resize();paintNow();if(token.error)throw token.error;}catch(error){releaseRecording(token);throw error;}
  return {width:dimensions.width,height:dimensions.height,release:()=>releaseRecording(token)};
 }
 // Call before waiting for captureStatus().loading to clear; release in finally.
 // This changes imagery planning only, never the displayed size or camera pose.
 function prepareCapture(options={}){
  const dimensions=captureDimensions(options),token={width:dimensions.width,height:dimensions.height};
  capturePreparation=token;
  try{paintNow();}catch(error){if(capturePreparation===token)capturePreparation=null;throw error;}
  return ()=>{if(capturePreparation===token){capturePreparation=null;request();}};
 }
 // Width and height are bounds. The output retains the current logical aspect;
 // DOM overlays stay in screen coordinates for the caller to composite at scale.
 function captureFrame({width=w,height=ht,canvas=null}={}){
  if(captureInProgress)throw new Error('A scene capture is already in progress.');
  const dimensions=captureDimensions({width,height}),output=canvas||document.createElement('canvas');
  if(output===cv)throw new Error('Use a separate canvas for the captured scene.');
  const context=output.getContext('2d',{alpha:true});if(!context)throw new Error('The capture canvas is unavailable.');
  if(output.width!==dimensions.width)output.width=dimensions.width;
  if(output.height!==dimensions.height)output.height=dimensions.height;
  const savedRatio=gpu?renderer.getPixelRatio():null,savedSize=gpu?renderer.getSize(new T.Vector2()):{x:cv.width,y:cv.height};
  const changed=gpu?savedRatio!==dimensions.scale||savedSize.x!==w||savedSize.y!==ht:cv.width!==dimensions.width||cv.height!==dimensions.height;
  captureInProgress=true;
  try{
   if(gpu){
    if(savedSize.x!==w||savedSize.y!==ht)renderer.setSize(w,ht,false);
    if(savedRatio!==dimensions.scale)renderer.setPixelRatio(dimensions.scale);
   }else if(changed)renderer.setSize(dimensions.width,dimensions.height);
   paintNow();
   // Copy before yielding: WebGL may discard its drawing buffer after this task.
   context.save();
   try{context.setTransform(1,0,0,1,0,0);context.globalAlpha=1;context.globalCompositeOperation='copy';context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(cv,0,0,cv.width,cv.height,0,0,output.width,output.height);}
   finally{context.restore();}
   return output;
  }finally{
   captureInProgress=false;
   if(changed){
    if(gpu){renderer.setPixelRatio(savedRatio);if(savedSize.x!==w||savedSize.y!==ht)renderer.setSize(savedSize.x,savedSize.y,false);}
    else renderer.setSize(savedSize.x,savedSize.y);
    // Resize clears the visible buffer. Repaint it in this task so recording
    // never flashes a blank canvas between its high-resolution sample frames.
    if(alive)paintNow();
   }
  }
 }
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
  spin.rotation.y=s.earthRotationRad||0;earthAppearance.update(eci(s.sunECI),s.t);
  ring.scale.setScalar(s.burn?1.7:1);
  orbitAxes.visible=captureAppearance?.guides!==false&&!!flightFrame&&!s.referenceBody&&s.t>=540&&(focus==='attitude'||focus==='software'||pointingEnabled());
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
 function updatePointing(){
  pointingGuide.group.visible=pointingEnabled()&&pointingViewAllowed(view,s,launchFrame?.directCraft);
  pointingLabels=[];
  if(pointingGuide.group.visible){
   const cues=pointingGeometry(craft,h,s,focus,selected,controlLoop);
   pointingGuide.update(cues.vectors);pointingLabels=cues.labels;
  }
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
 const inspect=activeProcessing()?.domain||(launchFrame?.environment==='hangar'&&!bayIsolate?'':focus);
 craft.appendages.visible=view!=='core'||h.payloadLocation==='radiator';const core=view==='core',payloadFocus=view==='launch'&&inspect&&['data','purpose','compute','thermal','comm','attitude','avionics','software','power','prop'].includes(inspect),tank=selected==='propellant'||selected==='propulsion'||inspect==='prop';craft.setCoreView?.(core);
 craft.gyroPack.visible=core||['attitude','software'].includes(inspect)||selected==='cmg';craft.skin.visible=!core&&!payloadFocus&&!tank;craft.internal.visible=core||payloadFocus||selected==='cmg'||['compute','data','purpose','attitude','avionics','software','power','thermal','mass'].includes(inspect);
 if(craft.electricalEquipment)craft.electricalEquipment.visible=craft.internal.visible;
 craft.service.visible=core||payloadFocus||tank||inspect==='mass';craft.shelf.visible=!tank;
 for(const a of craft.cells){
  a.tank.visible=!tank;a.section.visible=tank;
  const kg=s[a.id+'Kg']??h[a.id+'Kg'],frac=clamp(kg/(h.input[a.id+'Density']*a.volumeL),0,1);
  a.fluid.visible=tank&&frac>0;if(a.fluid.visible)a.fluid.scale.setScalar(a.fluidRadiusM*Math.cbrt(frac));
 }

 const standby=V(0,1,0),pointing=s.stationECI&&s.positionECI?frameDirection(s.stationECI.map((a,i)=>a-s.positionECI[i])):standby;
 const head=(real,link)=>real?V(...real).normalize():s.groundLink===link&&s.station?pointing:standby;
 craft.pointTerminals(head(s.dishBoresightBody,'Ka'),head(s.opticalBoresightBody,'Optical'));
 craft.cmgs.forEach(c=>{c.gimbal.rotation.z=s.attitudeDynamics?.gimbalAnglesRad?.[c.index]??0;c.spin.rotation.x=s.carrierAttached?0:Math.max(0,s.t-payloadFreeMET(h.input.launcher))*3;});craft.leds.forEach((a,i)=>a.visible=(i%8)/8<(s.activeFraction??.9));craft.plumes.forEach(a=>a.visible=!!s.burn);
 }
 function updateLaunch(){
  if(view!=='launch'){if(launch)launch.root.visible=false;launchFrame=null;return;}
  const signature=[meshKey,h.input.launcher,h.input.launchSite,h.input.fairingM,h.input.fairingLengthM,h.stowedLengthM].join('/');
  if(signature!==launchKey){if(launch){launchDetail?.dispose();launchDetail=null;launchSkin?.destroy();launchSkin=null;launchFocus?.destroy();launchFocus=null;scene.remove(launch.root);launch.ground?.environment?.dispose?.();disposeGroup(launch.root);}launch=makeLaunch(h,()=>request(true),new URLSearchParams(location.search).has('routing-debug')?{routingProgress:record=>console.info('Routing launch',JSON.stringify(record))}:{});launchDetail=createHardwareDetail(launch.root,{family:'launch',hardware:h,renderer,gpu,onWake:()=>request()});launchRendering.prepare(launch.root);scene.add(launch.root);launchKey=signature;}
  launch.setPadConnection?.(padConnection);
  launchFrame=launch.update(s,chapter,{domain:focus,phase,commBench,padInspect:launchLens==='services',padConnection});
  launch.bay.setProcessingState(processingState?{...processingState,enabled:processingState.enabled!==false&&s.t<=-3000&&!!inBay()}:null);
 }
 function positionVehicle(){
  positionLiveCraft(craftGroup,{view,launch,launchFrame,state:s,hardware:h,fitHalfHeight:Math.max(size.fitHeight*.5,size.fitWidth*.5/(w/Math.max(1,ht)))});
 }
 function update(hardware,snapshot){if(!hardware||!snapshot)return;const previousHardware=h;h=hardware;s=snapshot;flightFrame=flightFrames(s);let k=[redwireElectricalLayoutKey(h),h.architectureFamilyId||h.input.architectureFamily,h.physicalArchitecture?.revision,h.input.architectureSpanM,h.input.architectureHeightM,h.input.pv,h.input.coating,h.input.communicationsPackage,h.trays,h.storageTB,h.input.diskModuleTB,h.bodyLengthM,h.bodyWidthM,h.bodyHeightM,h.wingLengthM,h.wingWidthM,h.radiatorLengthM,h.radiatorWidthM,h.radiatorPanelsPerBank,h.input.kaDishM,h.input.opticalApertureM,h.tankVolumeL,h.fuelKg,h.oxidizerKg,h.input.thrustN,h.input.engine,...h.propulsion.tanks.flatMap(o=>[o.x,o.y,o.z,o.volumeL]),...h.propulsion.engines.map(o=>o.x+','+o.z)].join('/');if(k!==meshKey){partMenu.close();if(craft){craftDetail?.dispose();craftDetail=null;detailFocus=null;craftSkin?.destroy();craftSkin=null;craftFocus?.destroy();craftFocus=null;custody?.destroy();custody=null;craftGroup.remove(craft.root);disposeGroup(craft.root);}meshKey=k;craft=makeCraft(h);craftDetail=createHardwareDetail(craft.root,{family:'flight',hardware:h,renderer,gpu,onWake:()=>request()});craftGroup.add(craft.root);let span=Math.max(craft.wingspan,craft.spanZ);size={span,fitWidth:Math.max(craft.wingspan*1.05,craft.spanZ*.60),fitHeight:Math.max(craft.wingspan*.29+craft.spanZ*.36,span*.48)};pickables=[craft.root];overlayStale=true;}else if(previousHardware!==h&&h.architectureFamilyId==='redwire-platform'){reconcileRedwireInstalledMassFromCraft(h,craft);}
 updateLaunch();syncRotationMode();navReadings=orbitVectorsAvailable(view,s)&&flightFrame&&!(view==='launch'&&launchFrame?.reference)?orbitVectorReadings(s):[];actuate();stagingBounds=chapter!=='commissioning'&&s.deployment<.995&&s.deployment>.0001?new T.Box3().setFromObject(craft.root):null;if(overlayStale||layers.length||domainSceneSpecs[focus]?.vectors?.length||['attitude','prop'].includes(focus)){arrows();overlayStale=false;}if(selected)selectionBox();updateOrbit();positionVehicle();updatePointing();orbit.visible=view==='orbit';setBg();updateThermal();request();}
 function setView(v){const next=cameraView(v);if(next===view&&craft)return;partMenu.close();detailFocus=null;cancelGestures();if(hoverHit)leave({clientX:hoverHit.x,clientY:hoverHit.y});view=next;setBg();if(craft)update(h,s);else request();}
 function thermalRow(hit){return (!focus||focus==='thermal'||thermalEnabled())&&hit?.node?(s.thermalQualification||[]).find(r=>r.id===hit.node)||null:null;}
 function refreshLegend(){
  const enabled=thermalEnabled()&&showLegend;
  const hit=hoverHit||selectedHit,row=thermalRow(hit);
  legend.set(enabled,legendMode,row,Boolean(hit),thermalScale,s.thermalQualification||[]);
 }
 function setThermalScale(id){
  if((id!=='working'&&id!=='full')||thermalScale===id)return;
  thermalScale=id;if(craft)updateThermal();else refreshLegend();request();
 }
 function updateThermal(){
  const enabled=thermalEnabled(),packed=view==='launch'&&launch?.root.visible,reference=packed&&launchFrame?.reference;
  legendMode=view==='orbit'?'Choose Spacecraft or Compute Core to inspect hardware temperatures.':reference?'Stowed design reference. Switch to Spacecraft for the flight temperatures.':s.thermalQualification?.some(r=>r.status!=='unassessed'&&Number.isFinite(r.temperatureK))?'':'Temperature data unavailable for this instant.';
  const inspect=activeProcessing()?.domain||focus,active=enabled&&!legendMode,showFocus=!!inspect&&(launchFrame?.environment!=='hangar'||bayIsolate||!!activeProcessing());
  if(active&&craftGroup.visible){craftFocus?.clear();craftSkin??=thermalSkin(craft.root);craftSkin.apply(s.thermalQualification,gpu?renderer.getPixelRatio():1,thermalScale);}
  else{craftSkin?.clear();if(showFocus&&!(inBay()&&inspect==='launcher')&&!(packed&&h.input.launcher==='starship'&&['launcher','launch'].includes(inspect))){craftFocus??=focusHardware(craft.root);craftFocus.apply(inspect,selected);}else craftFocus?.clear();}
  if(active&&packed&&launchFrame.environment==='hangar'&&bayIsolate){
   // The mounted, live spacecraft owns the thermal nodes. Keep its carrier in context.
   launchSkin?.clear();launchFocus??=focusHardware(launch.parts.stage);launchFocus.apply('thermal');
  }else if(active&&packed){launchFocus?.clear();launchSkin??=thermalSkin(launch.parts.stage);launchSkin.apply(s.thermalQualification,gpu?renderer.getPixelRatio():1,thermalScale);}
  else{launchSkin?.clear();if(showFocus&&launch?.root.visible&&!(phase==='D'&&['launcher','launch'].includes(inspect)&&(['pad','ascent'].includes(s.flightPhase)||h.input.launcher==='starship'))){launchFocus??=focusHardware(launch.parts.stage);
    launchFocus.apply(inspect,selected);}else launchFocus?.clear();}
  if(['data','purpose','compute','avionics','power'].includes(inspect)&&craftGroup.visible&&view!=='orbit'&&!s.referenceBody){if(!custody){custody=dataRoutes(craft,h);craft.root.add(custody.root);}const checkout=activeProcessing();custody.update(s,true,inspect,{mode:checkout?'checkout':'operational',time:checkout?(checkout.progress||0)*10:s.t});}else if(custody)custody.update(s,false);
  refreshLegend();
 }
 const ray=new T.Raycaster(),pointer=new T.Vector2(),touches=new Map();let drag=null;
 function partAt(e){
  if(!craft||view==='orbit')return null;
  const bounds=cv.getBoundingClientRect();if(!bounds.width||!bounds.height)return null;
  pointer.set(2*(e.clientX-bounds.left)/bounds.width-1,1-2*(e.clientY-bounds.top)/bounds.height);ray.setFromCamera(pointer,camera);
  const target=view==='launch'&&launch?.root.visible?launch.root:craft.root,reference=target===launch?.root&&launchFrame?.reference;
  for(const hit of ray.intersectObjects(target===launch?.root&&craftGroup.visible?[target,craft.root]:[target],true)){
   if(!hit.object.isMesh||hit.object.material?.userData.domainGhost||hit.object.userData.sceneFlow)continue;
   const source=detailSource(hit.object);let obj=source,room=false,visible=true,surface=false;
   while(obj){if(!obj.visible){visible=false;break;}if(obj===launch?.parts.facility)room=true;if(obj.userData.bayWall||Number.isFinite(obj.userData.floorY))surface=true;obj=obj.parent;}
   if(!visible)continue;
   const selection=describeScenePart(source,{craft,launch}),point=hit.point.clone();
   if(inBay()&&room){
    // The room shell does not intercept selections of the actual support rig.
    if(surface||hit.object.material?.transparent&&hit.object.material.opacity<.5)continue;
    if(selection.bayRole)return {id:'bay:'+selection.bayRole,selection,point,object:source};
    if(selection.names.length)return {id:selection.id||'pad',selection,point,centerOnly:true,object:source};
    continue;
   }
   if(selection.id)return {id:selection.id,node:reference?null:source.userData.thermalNode,selection,point,object:source};
  }return null;
 }
 function hoverPart(e){if(partMenu.isOpen)return;const hit=partAt(e);if(hit||hoverHit)onHover(hit?.id||null,e.clientX,e.clientY,thermalRow(hit));hoverHit=hit?{...hit,x:e.clientX,y:e.clientY,t:s.t}:null;refreshLegend();cv.style.cursor=hit?'pointer':'grab';}
 const partNames={solar:'Solar array',radiator:'Radiator bank',compute:'Compute trays',storage:'Persistent storage',battery:'Battery packs',propellant:'Propellant tank',propulsion:'Chemical engine',cmg:'CMG cluster',communications:'Communications terminal',structure:'Vehicle structure',launcher:'Launch vehicle',fairing:'Payload fairing',payload:'Stowed spacecraft',adapter:'Payload adapter',pad:'Launch site hardware',avionics:'Flight avionics',torquer:'Magnetic torquer'};
 function partTitle(selection){
  return selection.title||selection.name||(selection.materialRole?selection.materialRole.replace(/(^|-)([a-z])/g,(_,gap,letter)=>(gap?' ':'')+letter.toUpperCase()):partNames[selection.id]||'Selected part');
 }
 function showPartActions(hit,e,anchor=cv){
  if(!hit)return;
  if(hit.object){detailFocus=detailSource(hit.object);request();}
  const selection={...hit.selection},record=getPartInfo?.(selection);
  if(record?.id)selection.partId=record.id;
  const title=record?.title||partTitle(selection),id=hit.id;
  const primary=hit.annotationId?{id:'center',label:'Center view on this part',run:()=>focusAnnotation(hit.annotationId,hit.point)}:
   hit.centerOnly?{id:'center',label:'Center view on this part',run:()=>focusPoint(hit.point)}:
   {id:'inspect',label:id==='bay:equipment'?'Focus ground equipment':id==='bay:interface'?'Focus service interface':'Inspect current readings',run:()=>onPick(id,thermalRow(hit))};
  const actions=[primary];if(typeof onOpenPart==='function')actions.push({id:'part',label:'Open part view',run:()=>onOpenPart(selection)});
  leave(e);const rect=anchor?.getBoundingClientRect?.();
  const keyboard=e?.type==='click'&&e.detail===0;
  const point=Number.isFinite(e?.clientX)&&!keyboard?{x:e.clientX,y:e.clientY}:{x:rect?rect.left+rect.width/2:0,y:rect?rect.top+rect.height/2:0};
  partMenu.open({title,point,anchor,actions});
 }
 function instrumentObject(id){
  if(view==='launch'&&launch&&launchFrame&&!launchFrame.directCraft){
   const p=launch.parts;
   if(id==='sea-level'||id==='vacuum')return p.upper.children.find(o=>o.userData.engineFamily===id);
   if(id==='cargoJamb')return p.shell.getObjectByName('Hatch latch socket');
   if(id==='carriage')return p.shell.getObjectByName('Retained cargo carriage');
   const object={boosterBase:p.boosterBase,padWorks:p.tower,hotstage:p.lower,interface:p.fitting,payload:p.liveMount,thrustDeck:p.boosters?.[0]?.visible?p.boosters[0]:p.lower,rocket:p.stage,shroud:p.shell.visible?p.shell:p.upper}[id];
   if(object)return object;
  }
  if(!craft)return null;
  if(['fuel','oxidizer','helium'].includes(id))return craft.tankMap[id];
  if(id==='activeTerminal'){
   const terminal=s.terminalActivity?.find(a=>a.direction==='tx'&&a.services.payload>0)?.terminal||s.groundLink;
   return terminal==='Optical'?craft.apertures.Optical:terminal==='Ka'?craft.apertures.Ka:craft.apertures.patches?.[s.stationDirectionBody?.[0]>=0?1:0];
  }
  return {storage:craft.recorder,avionics:craft.avionics,dish:craft.apertures.Ka,optic:craft.apertures.Optical,patch:craft.apertures.patches?.[s.stationDirectionBody?.[0]>=0?1:0],cmg:craft.gyroPack,torquer:craft.torquers[0],engine:craft.engines[0],body:craft.root,article:craft.root}[id]||null;
 }
 function selectAnnotation(id,e,button){
  const entry=annotationRecords.get(id),point=annotationTargets.get(id);if(!entry||!point)return;
  let object=entry.anchor?.isObject3D?entry.anchor:instrumentObject(entry.instrument||(id.startsWith('flight-')?id.slice(7):''));
  if(id==='active-ground-tool')object=launch?.bay?.station;
  if(id==='receiving-stage')object=launch?.parts.upper.visible?launch.parts.upper:launch?.parts.lower;
  const selection=describeScenePart(object,{craft,launch,annotation:entry});
  if(['active-ground-tool','flight-test-point'].includes(id))selection.stationId=launch?.bay?.station.userData.stationId||'';
  if(id==='receiving-stage')selection.category='launch';
  if(entry.instrument&&!selection.category)selection.category='flight';
  showPartActions({selection,annotationId:id,point:point.clone(),object},e,button||cv);
 }
 function leave(e){if(hoverHit){hoverHit=null;onHover(null,e.clientX,e.clientY,null);refreshLegend();}}
 function panBasis(){
  setCamera();const perPx=2*halfAtFocus/Math.max(1,ht);
  const inverse=cameraPanFrame.clone().invert();
  return {origin:pan[poseKey()].clone(),right:V().setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(-perPx).applyQuaternion(inverse),up:V().setFromMatrixColumn(camera.matrixWorld,1).multiplyScalar(perPx).applyQuaternion(inverse)};
 }
 function panTo(basis,dx,dy){pan[poseKey()].copy(basis.origin).addScaledVector(basis.right,dx).addScaledVector(basis.up,dy);}
 function focusAnnotation(id,fallback=null){return focusPoint(annotationTargets.get(id)||fallback);}
 function focusPoint(target){
  if(!target||!craft)return false;
  setCamera();
  // Store only a translation, not an object to track or a new close-up lens.
  // Later pan, zoom, rotation and ordinary redraws retain normal camera control.
  pan[poseKey()].add(target.clone().sub(cameraTarget).applyQuaternion(cameraPanFrame.clone().invert()));
  cv.focus?.({preventScroll:true});request();return true;
 }
 const annotationButton=e=>e.target?.closest?.('[data-scene-anchor]');
 function touchPair(){const pts=Array.from(touches.values()),a=pts[0],b=pts[1];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.max(2,Math.hypot(a.x-b.x,a.y-b.y))};}
 function cancelGestures(){drag=null;touches.clear();gestureRing.hidden=true;cv.style.cursor='grab';}
 function rotationDrag(id,x,y,suppressPick=false){
  const key=poseKey();setCamera();
  const ball=freeOrbit?beginTrackball(x,y,cv.getBoundingClientRect(),orbitalTurns[key]):null;
  if(ball){
   gestureRing.style.width=gestureRing.style.height=2*ball.radius+'px';
   gestureRing.textContent=ball.mode==='roll'?'Roll':'Tumble';
   gestureRing.setAttribute('data-motion',ball.mode);
  }
  return {mode:'orbit',id,x,y,az:pose[key][0],el:pose[key][1],ball,moved:false,suppressPick};
 }
 function changeCameraMode(value,duringGesture=false){
  const next=normalizeCameraMode(value);if(next===cameraMode)return false;
  if(!duringGesture)cancelGestures();
  const key=poseKey(),available=!!trackedCameraAvailable();
  if(available)setCamera();
  const heldBase=available?fitCameraBase.clone():null;
  const heldTurn=available?heldBase.clone().invert().multiply(camera.quaternion).normalize():null;
  const nextReference=available?cameraReferenceToBody(next,flightFrame):new T.Quaternion();
  const inverse=nextReference.clone().invert();
  for(const k of ['spacecraft','core']){
   const previousReference=available&&!legacyCamera[k]&&!pendingBodyPan[k]?cameraReferenceToBody(cameraMode,flightFrame):new T.Quaternion();
   pan[k].applyQuaternion(previousReference).applyQuaternion(inverse);
   pose[k][0]=defaultPose[k][0];pose[k][1]=defaultPose[k][1];
   orbitalTurns[k].identity();manualCameraBase[k]=null;legacyCamera[k]=false;pendingBodyPan[k]=false;
   trackedCameraFrame[k]=null;
  }
  cameraMode=next;
  // Standard frame changes preserve the displayed direction, roll, pan, and
  // zoom. Selecting Sun–velocity deliberately restores its computed viewpoint.
  if(available&&next!=='sun-velocity'){
   manualCameraBase[key]=inverse.clone().multiply(heldBase).normalize();
   orbitalTurns[key].copy(heldTurn);
  }
  onCameraFrameChange(cameraMode);request();return true;
 }
 function takeCameraControl(){
  const key=poseKey();if(!trackedCameraAvailable())return false;
  // Preserve the existing assisted view: rotation takes over in body axes.
  // The selector changes to Spacecraft so it always describes real behavior.
  if(cameraMode==='sun-velocity')return changeCameraMode('body',true);
  if(!legacyCamera[key])return false;
  setCamera();
  const reference=cameraReferenceToBody(cameraMode,flightFrame),inverse=reference.clone().invert();
  manualCameraBase[key]=inverse.clone().multiply(fitCameraBase).normalize();
  orbitalTurns[key].copy(fitCameraBase).invert().multiply(camera.quaternion).normalize();
  pan[key].applyQuaternion(inverse);pendingBodyPan[key]=false;
  legacyCamera[key]=false;return true;
 }
 function down(e){
  if(e.pointerType!=='touch'&&e.button!==0&&e.button!==1)return;
  partMenu.close();
  const pin=annotationButton(e),annotationId=pin?.dataset.sceneAnchor;
  if(annotationId){e.preventDefault();cv.focus?.({preventScroll:true});}
  leave(e);if(e.button===1||e.pointerType==='touch')e.preventDefault();cv.setPointerCapture(e.pointerId);
  if(e.pointerType==='touch'){
   touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(touches.size>=2){gestureRing.hidden=true;const q=touchPair();drag={mode:'touch',...q,basis:panBasis(),zoom:pose[poseKey()][2],moved:true};cv.style.cursor='grabbing';return;}
  }
  drag=e.button===1?{mode:'pan',id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,basis:panBasis()}:rotationDrag(e.pointerId,e.clientX,e.clientY);
  drag.annotationId=annotationId;drag.annotationButton=pin;
  cv.style.cursor='grabbing';
 }
 function move(e){
  if(!drag){if(e.pointerType!=='touch')hoverPart(e);return;}
  if(e.pointerType==='touch'&&touches.has(e.pointerId))touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(drag.mode==='touch'){
   if(touches.size<2)return;const q=touchPair();panTo(drag.basis,q.x-drag.x,q.y-drag.y);zoomTo(drag.zoom*q.distance/drag.distance);return;
  }
  if(e.pointerId!==drag.id)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>3)drag.moved=true;
  if(!drag.moved)return;
  if(drag.mode==='pan')panTo(drag.basis,dx,dy);
  else if(drag.ball){
   if(takeCameraControl())drag.ball.orientation.copy(orbitalTurns[poseKey()]);
   trackballOrientation(drag.ball,e.clientX,e.clientY,orbitalTurns[poseKey()]);gestureRing.hidden=false;
  }
  else{pose[poseKey()][0]=drag.az-dx*.008;pose[poseKey()][1]=clamp(drag.el+dy*.009,-1.52,1.52);}
  request();
 }
 function up(e){
  touches.delete(e.pointerId);if(!drag)return;
  if(drag.mode==='touch'&&touches.size){const [id,q]=touches.entries().next().value;drag=rotationDrag(id,q.x,q.y,true);return;}
  const pick=drag.mode==='orbit'&&!drag.moved&&!drag.suppressPick&&e.button!==1,annotationId=drag.annotationId,pin=drag.annotationButton;cancelGestures();
  if(pick&&annotationId)selectAnnotation(annotationId,e,pin);
  else if(pick){selectedHit=partAt(e);refreshLegend();if(selectedHit)showPartActions(selectedHit,e);}
 }
 function zoomTo(value){setCamera();pose[poseKey()][2]=clamp(value,zoomFloor,10);request();}
 function zoom(mult){zoomTo(pose[poseKey()][2]*mult);}
 function resetCamera(){
  partMenu.close();cancelGestures();const key=poseKey();orbitalTurns[key].identity();legacyCamera[key]=false;
  if(Object.hasOwn(manualCameraBase,key)){manualCameraBase[key]=null;pendingBodyPan[key]=false;trackedCameraFrame[key]=null;}
  pose[poseKey()]=[...defaultPose[poseKey()],1];pan[poseKey()].set(0,0,0);
  if(craft){const span=Math.max(craft.wingspan,craft.spanZ);size={span,fitWidth:Math.max(craft.wingspan*1.05,craft.spanZ*.6),fitHeight:Math.max(craft.wingspan*.29+craft.spanZ*.36,span*.48)};}request();
 }
 function keyMove(e){
  const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},d=arrows[e.key];
  if(d){if(e.shiftKey)panTo(panBasis(),d[0]*24,d[1]*24);else if(freeOrbit){takeCameraControl();orbitalTurns[poseKey()].multiply(new T.Quaternion().setFromAxisAngle(V(d[1],d[0],0),.1)).normalize();}else{pose[poseKey()][0]+=d[0]*.1;pose[poseKey()][1]=clamp(pose[poseKey()][1]-d[1]*.1,-1.52,1.52);}}
  else if(freeOrbit&&(e.key==='q'||e.key==='e')){takeCameraControl();orbitalTurns[poseKey()].multiply(new T.Quaternion().setFromAxisAngle(V(0,0,1),e.key==='q'?-.1:.1)).normalize();}
  else if(e.key==='+'||e.key==='=')zoom(1.15);else if(e.key==='-')zoom(1/1.15);else if(e.key==='Home')resetCamera();else return false;e.preventDefault();request();return true;
 }
 cv.addEventListener('pointerleave',leave);cv.addEventListener('pointerdown',down);cv.addEventListener('pointermove',move);cv.addEventListener('pointerup',up);
 cv.addEventListener('pointercancel',cancelGestures);cv.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
 const wheelMove=e=>{partMenu.close();e.preventDefault();zoom(Math.exp(clamp(-e.deltaY*.0015,-.5,.5)));};
 cv.addEventListener('wheel',wheelMove,{passive:false});cv.addEventListener('keydown',keyMove);
 // Pins are siblings of the canvas. Forward navigation starting on a pin;
 // capture remains on the stable canvas while labels are redrawn underneath.
 const pinDown=e=>{if(annotationButton(e))down(e);};
 const pinMove=e=>{if(e.target!==cv&&drag)move(e);};
 const pinUp=e=>{if(e.target!==cv&&drag)up(e);};
 const pinCancel=e=>{if(e.target!==cv)cancelGestures();};
 const overlayWheel=e=>{if(e.target!==cv)wheelMove(e);};
 const pinKey=e=>{if(annotationButton(e)&&keyMove(e))cv.focus?.({preventScroll:true});};
 const pinClick=e=>{const button=annotationButton(e);if(!button)return;e.preventDefault();e.stopPropagation();
  // Pointer/touch activation is handled on pointerup, where drag state is
  // available. Keyboard and assistive activation produce a zero-detail click.
  if(e.detail===0)selectAnnotation(button.dataset.sceneAnchor,e,button);
 };
 const pinAux=e=>{if(annotationButton(e)&&e.button===1)e.preventDefault();};
 const overlayEvents={pointerdown:pinDown,pointermove:pinMove,pointerup:pinUp,pointercancel:pinCancel,wheel:overlayWheel,keydown:pinKey,click:pinClick,auxclick:pinAux};
 for(const [type,handler] of Object.entries(overlayEvents))container.addEventListener(type,handler,type==='wheel'?{passive:false}:undefined);
 const routingHighlight=new T.Group();routingHighlight.name='Routing inspection highlight';routingHighlight.userData.engineeringGraphic=true;scene.add(routingHighlight);
 function clearRoutingHighlight(){const gs=new Set(),ms=new Set();routingHighlight.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});routingHighlight.clear();for(const g of gs)g.dispose();for(const m of ms)m.dispose();}
 function getRoutingSnapshot(){
  if(!craft)return {routes:[],obstacles:[],additionalIssues:[],obstacleLabels:{},context:{view,timeS:s.t,flightPhase:s.flightPhase}};
  let base=flightRoutingSnapshot(craft),routes=[...base.routes];const extraSolids=[],labels={...base.obstacleLabels};
  const labelMeshes=root=>root?.traverse(o=>{if(o.isMesh)labels[o.uuid]=o.name||o.userData.routingWallId||o.userData.part||'Physical mesh';});
  if(inBay()&&launch?.parts.facility.visible){
   base=mergeServiceRoutingSnapshot(base,launch.bay.routingSnapshot(),{scope:'Bay service',inventoryKey:'bay'});routes=base.routes;labelMeshes(launch.root);
  }else if(view==='launch'&&launch?.root.visible&&launch.routingSnapshot){base=mergeServiceRoutingSnapshot(base,launch.routingSnapshot(),{scope:'Launch service',inventoryKey:'launch'});routes=base.routes;labelMeshes(launch.root);}
  const electrical=h.architectureFamilyId==='redwire-platform'?buildElectricalArchitecture(h):null;
  const installedElectricalAccounting=electrical?{totalCableLengthM:electrical.totalCableLengthM,massAccounting:electrical.massAccounting,powerLossW:electrical.installedPowerLossW??electrical.harnesses.reduce((sum,line)=>sum+line.quantity*line.powerLossW,0),status:h.installedHarnessAccounting?.status,harnessCount:electrical.harnessMassRecords?.length||0,cableRunCount:electrical.harnessMassRecords?.reduce((sum,row)=>sum+row.routeIds.length,0)||0,installationHardwareMassKg:h.cableInstallationHardware?.totalMassKg||0,installationHardwareCount:h.cableInstallationHardware?.parts?.length||0,workerOptics:h.serviceArchitecture?.fabric?.workerOptics||null,dryKg:h.dryKg,wetKg:h.wetKg,launchKg:h.launchKg}:null;
  return {...base,routes,obstacles:mergeRoutingObstacles([base.obstacles,extraSolids]),obstacleLabels:labels,context:{...base.context,view,timeS:s.t,flightPhase:s.flightPhase,deployment:s.deployment,architectureFamilyId:h.architectureFamilyId,installedElectricalAccounting,rotaryElectricalAccounting:electrical?.rotaryTransferAccounting||null,rotaryFluidAccounting:h.energySystem?.thermal?.rotaryFluidAccounting||null},coverage:{...base.coverage,fluidSections:base.sections?.length||0}};
 }
 function highlightRouting(id){
  clearRoutingHighlight();if(!id){request();return true;}if(view==='orbit'){request();return false;}const route=getRoutingSnapshot().routes.find(r=>r.id===id);if(!route)return false;
  const points=route.points.map(p=>V(...p)),line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0xffc477,depthTest:false,depthWrite:false,toneMapped:false}));line.renderOrder=10000;line.name='Selected routing centreline';routingHighlight.add(line);
  const radius=Math.max(.012,route.radiusM*2.2),g=new T.SphereGeometry(radius,12,8);for(const [point,color] of [[points[0],0x8fe0d1],[points.at(-1),0xffc477]]){const marker=new T.Mesh(g,new T.MeshBasicMaterial({color,depthTest:false,depthWrite:false,toneMapped:false}));marker.position.copy(point);marker.renderOrder=10001;routingHighlight.add(marker);}request();return true;
 }
 setBg();resize();return {update,setView,getRoutingSnapshot,highlightRouting,
  setProcessingState(state){
   const old=activeProcessing()?.id;processingState=state?{...state,progress:clamp(Number(state.progress)||0,0,1)}:null;
   if(launch?.bay)launch.bay.setProcessingState(processingState?{...processingState,enabled:processingState.enabled!==false&&s.t<=-3000&&!!inBay()}:null);
   if(old!==activeProcessing()?.id&&craft){bayFit=null;actuate();updateThermal();}
   request();
  },
  setSignalPlayback(value){const next=Math.sign(Number(value))||0;if(next!==signalPlaying){signalPlaying=next;signalStamp=performance.now();request();}},
  setExposureEV(value){const next=Number.isFinite(value)?clamp(value,-2,2):0;if(next!==exposureEV){exposureEV=next;request();}},
  setLightingMode(value){const next=normalizeLightingMode(value);if(next!==lightingMode){lightingMode=next;request();}},
  setHardwareDetail(value){const next=normalizeHardwareDetail(value);if(next!==detailMode){detailMode=next;request();}},
  getHardwareDetail:()=>({mode:detailMode,craft:craftDetail?.stats(),launch:launchDetail?.stats()}),
  setSpacecraftFocus(value){const next=normalizeSpacecraftFocus(value);if(next!==spacecraftFocus){spacecraftFocus=next;request();}},
  getSpacecraftFocus:()=>spacecraftFocus,
  setCameraMode:value=>changeCameraMode(value),getCameraMode:()=>cameraMode,
  setDeploymentLens(value){if(deploymentLens===value)return;deploymentLens=value;if(craft)request();},
  setCommBench(key){
   const next=['ka','optical'].includes(key)?key:'sband';
   if(next===commBench)return;commBench=next;
   if(craft&&inBay()&&focus==='comm'){updateLaunch();request();}
  },
  setBayView(id,labels){
   const next=['equipment','interface','payload','endOn','sideOn'].includes(id)?id:'overview';
   if(next===bayLens&&bayLabels===labels)return;
   if(next!==bayLens){if(['endOn','sideOn'].includes(next)||['endOn','sideOn'].includes(bayLens))pose.bay=[...defaultPose.bay,1];else pose.bay[2]=1;pan.bay.set(0,0,0);}
   partMenu.close();bayLens=next;bayLabels=labels!==false;request();
  },
  setLaunchLens(id){partMenu.close();launchLens=['pad','site','surroundings','services','base','ship','fairing','engines'].includes(id)?id:'wide';request(true)},
  setPadConnection(id){if(padConnection===id)return;partMenu.close();padConnection=id||null;launch?.setPadConnection?.(padConnection);request();},
  setDomain(id,missionPhase){
   const next=Object.hasOwn(domainSceneSpecs,id)?id:'',nextPhase=String(missionPhase||'');
   if(domain===next&&phase===nextPhase)return;partMenu.close();detailFocus=null;domain=next;phase=nextPhase;focus=['C','D','E'].includes(phase)?domain:'';
   hoverHit=selectedHit=null;overlayStale=true;if(craft)update(h,s);else request();
  },
resetCamera,resize,captureFrame,captureStatus,captureSettings,beginCaptureAppearance,prepareCapture,beginRecording,
  captureDimensions:(options={})=>options.video?recordingDimensions(options):captureDimensions(options),
  focusAnnotation,setThermalScale,getThermalScale:()=>thermalScale,getCameraTracking:()=>cameraTracking,
  getCameraState(){return {...Object.fromEntries(Object.keys(pose).map(k=>[k,[...pose[k],...pan[k].toArray(),
   ...(manualCameraBase[k]?[...orbitalTurns[k].toArray(),...manualCameraBase[k].toArray()]:orbitalTurns[k].equals(identityTurn)?[]:orbitalTurns[k].toArray())]])),
   _camera:{version:1,mode:cameraMode,legacy:Object.keys(legacyCamera).filter(k=>legacyCamera[k]),bodyPan:Object.keys(pendingBodyPan).filter(k=>pendingBodyPan[k])}};},
  setCameraState(states){
   cancelGestures();
   const metadata=states?._camera?.version===1?states._camera:null;
   if(metadata)cameraMode=normalizeCameraMode(metadata.mode);
   else if(['spacecraft','core'].some(k=>Array.isArray(states?.[k])&&states[k].length===14))cameraMode='body';
   for(const k of Object.keys(pose)){
    const a=states?.[k];if(!Array.isArray(a)||![6,10,14].includes(a.length)||!a.every(Number.isFinite)||a.length===14&&!Object.hasOwn(manualCameraBase,k))continue;
    // Smaller multipliers are valid for a close preset's wider context. The
    // rendered view applies its actual finite extent in setCamera().
    pose[k]=[a[0],clamp(a[1],-1.52,1.52),clamp(a[2],1e-6,10)];pan[k].fromArray(a,3);
    const q=orbitalTurns[k].identity();
    if(a.length>=10){
     q.fromArray(a,6);const mag=q.length();
     if(!Number.isFinite(mag)||mag<1e-8)q.identity();else if(Math.abs(mag-1)>1e-12)q.normalize();
    }
    if(Object.hasOwn(manualCameraBase,k)){
     manualCameraBase[k]=null;
     if(a.length===14){
      const base=new T.Quaternion().fromArray(a,10),mag=base.length();
      if(Number.isFinite(mag)&&mag>=1e-8){if(Math.abs(mag-1)>1e-12)base.normalize();manualCameraBase[k]=base;}
     }
    }
    // Earlier saves have no reference-frame metadata. Preserve their customized
    // orbital/body preset; untouched views adopt the selected camera default.
    legacyCamera[k]=metadata?Array.isArray(metadata.legacy)&&metadata.legacy.includes(k):!manualCameraBase[k]&&(Math.abs(a[0]-defaultPose[k][0])>1e-10||Math.abs(a[1]-defaultPose[k][1])>1e-10||!q.equals(identityTurn));
    if(Object.hasOwn(pendingBodyPan,k))pendingBodyPan[k]=metadata?Array.isArray(metadata.bodyPan)&&metadata.bodyPan.includes(k):!legacyCamera[k];
   }
   onCameraFrameChange(cameraMode);
   request();
  },
  setLegendVisible(value){showLegend=!!value;refreshLegend();},
  setDisposalPlan(p){disposalPlan=p;if(craft&&view==='orbit'){updateOrbit();request();}},setChapter(id){const next=String(id||'');if(chapter===next)return;chapter=next;if(craft&&(view==='launch'||view==='orbit'))update(h,s);},
  setBayIsolation(enabled){const on=!!enabled;if(bayIsolate===on)return;bayIsolate=on;if(craft){actuate();updateThermal();}request();},
  setOrbitVectors(enabled){const next=enabled!==false;if(next===showOrbitVectors)return;showOrbitVectors=next;request();},
  setControlLoop(id){const next=['body','surfaces','terminal'].includes(id)?id:'executive';if(controlLoop===next)return;controlLoop=next;if(craft&&focus==='software'){updatePointing();request();}},
  setOverlays(ids=[]){const next=Array.from(ids);if(layers.length===next.length&&next.every((v,i)=>v===layers[i]))return;layers=next;if(craft){arrows();updatePointing();if(view==='orbit')updateOrbit();updateThermal();}request();},
  highlight(id){const next=pickAliases[id]??id??'';if(!next||selectedHit&&selectedHit.id!==id)selectedHit=null;if(next===selected)return;selected=next;if(craft){actuate();selectionBox();updatePointing();updateThermal();}request();},
  destroy(){alive=false;partMenu.destroy();releaseMaterialUpdates();if(recording)releaseRecording(recording);capturePreparation=null;ro.disconnect();cancelAnimationFrame(raf);for(const [type,handler] of Object.entries(overlayEvents))container.removeEventListener(type,handler);annotationTargets.clear();annotationRecords.clear();craftDetail?.dispose();launchDetail?.dispose();craftSkin?.destroy();launchSkin?.destroy();craftFocus?.destroy();launchFocus?.destroy();custody?.destroy();legend.destroy();craftGroup.remove(pointingGuide.group);pointingGuide.destroy();scene.remove(navigation.group,signals.group);navigation.destroy();signals.destroy();launch?.ground?.environment?.dispose?.();disposeGroup(scene);launchRendering.dispose();siteView.destroy();backdrop.dispose();earthObserver.dispose();earthAppearance.dispose();earthStatus.remove();stationMat.dispose();renderer.dispose();triad.remove();gestureRing.remove();cv.remove();tags.remove();annotationTags.remove();}
 };
}
