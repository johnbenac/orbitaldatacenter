import * as T from './vendor/three.module.js';
import {softRenderer} from './software-scene.js';
import {createLaunchRendering} from './launch-rendering.js';
import {createFacilityEquipment} from './facility-geometry.js';
import {stablePerspectiveNear} from './camera-clipping.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const presets={iso:[.78,.42],front:[0,.08],side:[Math.PI/2,.08],top:[0,Math.PI/2-.001]};

// One demand-rendered, disposable viewer. Switching campuses never accumulates
// render loops or WebGL contexts. Equipment geometry accepts no article size.
export function createFacilityViewer(container,{onChange=()=>{}}={}){
 let alive=true,frame=0,visible=true,asset=null,model=null,w=800,h=460,gpu=true,canvas=document.createElement('canvas'),renderer;
 try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;}
 catch{canvas=document.createElement('canvas');renderer=softRenderer(canvas);gpu=false;}
 canvas.className='fa-scene-canvas';canvas.style.cssText='display:block;width:100%;height:100%;touch-action:none';canvas.tabIndex=0;
 canvas.setAttribute('aria-label','Facility equipment in metres. Drag to rotate, shift-drag or right-drag to pan, scroll to zoom. Arrow keys rotate, plus and minus zoom, Home fits.');
 const labels=document.createElement('div');labels.className='fa-scene-labels';labels.setAttribute('aria-hidden','true');container.append(canvas,labels);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.01,1e5),target=V();
 const hemi=new T.HemisphereLight(0xe3f2ff,0x637883,2.0),key=new T.DirectionalLight(0xffedcf,3.7),fill=new T.DirectionalLight(0xaecfff,2.0);scene.add(hemi,key,fill,key.target,fill.target);
 const rendering=createLaunchRendering(renderer,gpu),savedMaterials=new Map();
 const state={mode:'materials',cutaway:true,dimensions:true,person:true,renderer:gpu?'webgl':'canvas'};
 let yaw=.78,pitch=.42,distance=8,radius=2,labelNodes=[];
 const snapshot=()=>({...state,assetId:asset?.id,available:!!model?.available,stats:model?.stats,dimensionsM:model?.size?.toArray?.()});
 function request(){if(alive&&!frame&&visible&&!document.hidden)frame=requestAnimationFrame(paint);}
 function changed(){onChange(snapshot());request();}
 function updateCamera(){
  camera.aspect=Math.max(.05,w/h);camera.near=stablePerspectiveNear(distance,Math.max(.001,distance-radius*2.4));camera.far=Math.max(distance+radius*8,100);
  camera.position.copy(target).add(V(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(distance));camera.up.set(0,1,0);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  key.position.copy(target).add(V(-1.1,1.6,1).multiplyScalar(radius*2));fill.position.copy(target).add(V(1.2,.7,-1).multiplyScalar(radius*2));key.target.position.copy(target);fill.target.position.copy(target);
  model?.updateCamera(camera);
 }
 function paint(){
  frame=0;if(!alive)return;updateCamera();renderer.render(scene,camera);
  const occupied=[];
  for(const {el,label} of labelNodes){
   const point=label.position.clone();model.root.localToWorld(point);point.project(camera);
   const show=state.dimensions&&(state.person||label.type!=='scale')&&point.z>=-1&&point.z<=1&&Math.abs(point.x)<1.07&&Math.abs(point.y)<1.07;
   el.hidden=!show;if(!show)continue;
   const x=clamp((point.x*.5+.5)*w,10,w-10),y=clamp((-.5*point.y+.5)*h,12,h-15),bw=Math.min(w-20,el.offsetWidth||170),left=clamp(x-bw/2,8,w-bw-8);let yy=y;
   for(let tries=0;tries<5&&occupied.some(b=>left<b.right&&left+bw>b.left&&Math.abs(yy-b.y)<27);tries++)yy+=27;
   if(yy>h-18){el.hidden=true;continue;}occupied.push({left,right:left+bw,y:yy});el.style.left=left+'px';el.style.top=yy+'px';
  }
 }
 function applyAppearance(){
  if(!model)return;
  model.root.traverse(o=>{for(const m of [].concat(o.material||[])){
   if(!savedMaterials.has(m))savedMaterials.set(m,{color:m.color?.clone(),metalness:m.metalness,roughness:m.roughness,wireframe:m.wireframe});
   const original=savedMaterials.get(m);if(m.isMeshStandardMaterial||m.isMeshBasicMaterial){m.wireframe=state.mode==='wireframe';if(m.color)m.color.copy(state.mode==='materials'?original.color:new T.Color(state.mode==='wireframe'?0x83d3d3:0xaac2cd));if(m.isMeshStandardMaterial){m.metalness=state.mode==='materials'?original.metalness:.08;m.roughness=state.mode==='materials'?original.roughness:.78;}m.needsUpdate=true;}
  }});
 }
 function fit(reset=false){
  if(!model?.available)return;if(reset)[yaw,pitch]=presets.iso;
  const b=model.fitBounds;b.getCenter(target);radius=Math.max(.25,b.getSize(V()).length()/2);
  const fov=camera.fov*Math.PI/180,aspect=Math.max(.05,w/h),limited=Math.min(fov,2*Math.atan(Math.tan(fov/2)*aspect));distance=radius/Math.sin(limited/2)*1.08;request();
 }
 function drop(){if(model){scene.remove(model.root);model.dispose();model=null;}savedMaterials.clear();labels.replaceChildren();labelNodes=[];}
 function build(reset=true){
  drop();if(!asset?.geometry){changed();return;}
  model=createFacilityEquipment(asset,{software:!gpu,cutaway:state.cutaway,includeReference:state.person});scene.add(model.root);rendering.prepare(model.root);rendering.update(scene,{active:true,environment:'hangar',lighting:'studio'});scene.background=new T.Color(model.background||0x101b25);applyAppearance();
  for(const label of model.labels){const el=document.createElement('span');el.className='fa-dimension-label '+(label.type==='scale'?'fa-scale-label':'');el.textContent=label.text;labels.append(el);labelNodes.push({el,label});}
  if(reset)fit(true);changed();
 }
 function resize(){if(!alive)return;const rect=container.getBoundingClientRect();if(rect.width<1||rect.height<1)return;w=Math.max(1,rect.width);h=Math.max(1,rect.height);renderer.setPixelRatio?.(Math.min(gpu?1.6:1,devicePixelRatio||1));renderer.setSize(w,h,false);request();}
 let drag=null;
 const down=e=>{if(e.button>2)return;drag={x:e.clientX,y:e.clientY,id:e.pointerId,pan:e.button===2||e.shiftKey};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});};
 const move=e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
  if(drag.pan){const scale=2*distance*Math.tan(camera.fov*Math.PI/360)/h,right=V().setFromMatrixColumn(camera.matrixWorld,0),up=V().setFromMatrixColumn(camera.matrixWorld,1);target.addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);}
  else{yaw-=dx*.006;pitch=clamp(pitch+dy*.006,-Math.PI/2+.002,Math.PI/2-.002);}request();};
 const up=e=>{if(drag?.id===e.pointerId)drag=null;};
 const wheel=e=>{e.preventDefault();distance=clamp(distance*Math.exp(clamp(e.deltaY,-200,200)*.0015),Math.max(.02,radius*.08),radius*60);request();};
 const keyboard=e=>{let handled=true;switch(e.key){case'ArrowLeft':yaw-=.08;break;case'ArrowRight':yaw+=.08;break;case'ArrowUp':pitch=clamp(pitch+.08,-1.56,1.56);break;case'ArrowDown':pitch=clamp(pitch-.08,-1.56,1.56);break;case'+':case'=':distance=Math.max(radius*.08,distance*.88);break;case'-':distance=Math.min(radius*60,distance/ .88);break;case'Home':fit(true);break;default:handled=false;}if(handled){e.preventDefault();request();}};
 const context=e=>e.preventDefault(),visibility=()=>{if(!document.hidden)request();};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',keyboard);canvas.addEventListener('contextmenu',context);document.addEventListener('visibilitychange',visibility);
 const observer=new ResizeObserver(resize);observer.observe(container);const intersection=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting!==false;if(visible)request();});intersection.observe(container);resize();
 return {setAsset(value){asset=value;build();},setMode(value){if(!['materials','solid','wireframe'].includes(value))return;state.mode=value;applyAppearance();changed();},setCutaway(value){state.cutaway=!!value;model?.setCutaway(state.cutaway);changed();},setDimensions(value){state.dimensions=!!value;changed();},setPerson(value){state.person=!!value;build(false);},setView(value){if(presets[value]){[yaw,pitch]=presets[value];request();}},fit,getState:snapshot,destroy(){if(!alive)return;alive=false;if(frame)cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('keydown',keyboard);canvas.removeEventListener('contextmenu',context);drop();rendering.dispose();renderer.dispose?.();renderer.forceContextLoss?.();canvas.remove();labels.remove();}};
}
