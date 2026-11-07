// Launch presentation uses the same linear-light PBR path as the flight model.
// These skies are illustrative daylight, not weather observations or solar analysis.
import * as T from './vendor/three.module.js';

const clamp=x=>Math.max(0,Math.min(1,x));
const slots=['map','alphaMap','aoMap','bumpMap','normalMap','roughnessMap','metalnessMap','emissiveMap'];
function noise(x,y){
 const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,a=fx*fx*(3-2*fx),b=fy*fy*(3-2*fy);
 const hash=(x,y)=>{let n=Math.imul(x+117,374761393)+Math.imul(y+31,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
 return (1-b)*((1-a)*hash(ix,iy)+a*hash(ix+1,iy))+b*((1-a)*hash(ix,iy+1)+a*hash(ix+1,iy+1));
}
function daylightTexture(){
 const c=document.createElement('canvas');c.width=1024;c.height=512;
 const g=c.getContext('2d'),frame=g.createImageData(c.width,c.height),p=frame.data;
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
  const u=x/c.width,v=y/c.height,alt=Math.sin((.5-v)*Math.PI),haze=(1-clamp(alt))**3;
  const az=u*Math.PI*2,vertical=Math.max(.04,alt),nx=Math.cos(az)/vertical,ny=Math.sin(az)/vertical;
  const n=noise(nx*.72+15,ny*.72+8)*.57+noise(nx*1.71+4,ny*1.71+19)*.28+noise(nx*4.8,ny*4.8)*.15;
  const clouds=clamp((n-.53)*4.7)*clamp(alt*11)*clamp((1-alt)*3.6);
  const sun=clamp((Math.cos(az+2.13)*Math.sqrt(1-alt*alt)+alt*1.25)/1.6);
  const base=alt>=0?[47+139*haze,103+101*haze,155+56*haze]:[64,81,66];
  for(let k=0;k<3;k++)p[(y*c.width+x)*4+k]=base[k]*(1-clouds)+[238,239,232][k]*clouds+Math.pow(sun,22)*(k===2?9:23);
  p[(y*c.width+x)*4+3]=255;
 }
 g.putImageData(frame,0,0);
 const map=new T.CanvasTexture(c);map.mapping=T.EquirectangularReflectionMapping;map.colorSpace=T.SRGBColorSpace;
 map.name='Illustrative coastal daylight and cloud reflection';return map;
}
function studioScene(){
 const room=new T.Scene();
 const box=new T.Mesh(new T.BoxGeometry(12,10,12),new T.MeshBasicMaterial({color:'#82919d',side:T.BackSide}));room.add(box);
 const panel=(x,y,z,w,h,rotation,color,intensity)=>{
  const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(intensity),side:T.DoubleSide}));
  m.position.set(x,y,z);m.rotation.y=rotation;room.add(m);
 };
 panel(-4,1,2,3.5,6,Math.PI/2,'#fff3df',3.5);
 panel(4,2,-1,2.6,5,-Math.PI/2,'#d9eaff',2.6);
 panel(0,3,-5,6,2,0,'#eff5ff',2.0);return room;
}

export function createLaunchRendering(renderer,gpu){
 let sky=null,daylight=null,studio=null,generator=null;
 const prepared=new WeakSet(),fog=new T.Fog('#b9cdd3',1400,10500);
 const anisotropy=gpu?Math.min(12,renderer.capabilities.getMaxAnisotropy()):1;
 const ensure=(kind)=>{
  if(!gpu)return null;
  generator??=new T.PMREMGenerator(renderer);
  if(kind==='daylight'){
   sky??=daylightTexture();daylight??=generator.fromEquirectangular(sky);return daylight.texture;
  }
  if(!studio){
   const room=studioScene();studio=generator.fromScene(room,.06);
   room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  }
  return studio.texture;
 };
 return {
  prepare(root){
   if(!root||prepared.has(root))return;prepared.add(root);
   root.traverse(o=>{
    for(const m of [].concat(o.material||[])){
     for(const key of slots){const tex=m[key];if(!tex)continue;tex.anisotropy=anisotropy;}
     if(m.isMeshStandardMaterial)m.envMapIntensity=m.metalness>.5?.9:.42;
    }
    if(o.userData.landscape||o.userData.noLaunchShadow||o.userData.noShadow){o.castShadow=false;}
   });
  },
  update(scene,{active=false,environment,lighting='studio',studioSpacecraft=false,region,horizonRadiusM,cameraHeightM=0}={}){
   const outdoor=active&&['ground','sky'].includes(environment),interior=active&&environment==='hangar';
   // Studio reflections give material finishes a neutral lighting reference in
   // the foreground craft view as well as the launch facility. Realistic orbit
   // keeps its physical Sun/Earth lighting and has no studio environment.
   const illuminated=outdoor||interior||(active||studioSpacecraft)&&lighting==='studio';
   if(outdoor)sky??=daylightTexture();
   scene.background=outdoor?sky:null;
   if(gpu){
    scene.environment=illuminated?ensure(outdoor?'daylight':'studio'):null;
    if(outdoor){scene.backgroundIntensity=.92;scene.backgroundBlurriness=0;}
   }
   const humid=region==='guiana'||region==='hainan',altitude=Math.max(0,cameraHeightM);
   fog.near=(humid?1000:1600)+altitude*.95;
   fog.far=Math.max(6500,Math.min(humid?10500:12500,(horizonRadiusM||13000)*.93))+altitude*1.85;
   scene.fog=outdoor?fog:null;
  },
  dispose(){sky?.dispose();daylight?.dispose();studio?.dispose();generator?.dispose();}
 };
}
