// NASA SVS Deep Star Maps 2020, equatorial plate carrée, RA increases left.
// UVs reference the inside of the sphere; its +X meridian is RA 0 in scene axes.
import * as T from './vendor/three.module.js';

export const solarRadiusRad=1919/7200*Math.PI/180; // NASA Sun Fact Sheet, apparent diameter at 1 AU.
const glareRadiusRad=2*Math.PI/180;
const sunDistance=12;

// Separate the photosphere from a display-only camera glow. The radial coordinate
// is tangent-plane distance, so the solid disk subtends its physical angle.
function solarImage(){
 const c=document.createElement('canvas');c.width=c.height=256;
 const ctx=c.getContext('2d'),im=ctx.createImageData(c.width,c.height);
 const limb=Math.tan(solarRadiusRad)/Math.tan(glareRadiusRad);
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
  const r=Math.hypot((x+.5)/128-1,(y+.5)/128-1),j=(y*c.width+x)*4;
  const photosphere=T.MathUtils.clamp((limb-r)*128+.5,0,1);
  const halo=Math.max(0,1-r)**3*Math.exp(-3.5*r)*.40;
  im.data[j]=255;im.data[j+1]=204+50*photosphere;im.data[j+2]=132+109*photosphere;
  im.data[j+3]=255*(photosphere+(1-photosphere)*halo);
 }
 ctx.putImageData(im,0,0);
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return texture;
}
export function createCelestialSky(onReady){
 const group=new T.Group();group.name='Inertial celestial sphere';
 const shell=new T.SphereGeometry(16,80,40),uv=shell.attributes.uv;
 for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));
 const fieldMaterial=new T.MeshBasicMaterial({color:0x0c141d,side:T.BackSide,depthWrite:false});
 const field=new T.Mesh(shell,fieldMaterial);field.name='Milky Way · equatorial sky survey';
 field.renderOrder=-20;fieldMaterial.userData.celestial=true;fieldMaterial.userData.globeTexture=true;
 const survey=new T.TextureLoader().load(new URL('./vendor/sky-equatorial.jpg',import.meta.url).href,texture=>{
  texture.colorSpace=T.SRGBColorSpace;texture.wrapS=T.RepeatWrapping;
  fieldMaterial.color.setScalar(2.1);fieldMaterial.map=texture;fieldMaterial.needsUpdate=true;onReady?.();
 });
 const glow=solarImage(),size=2*sunDistance*Math.tan(glareRadiusRad);
 const solarMaterial=new T.MeshBasicMaterial({map:glow,transparent:true,depthWrite:false});
 solarMaterial.userData.celestial=true;solarMaterial.color.setScalar(3.6);
 const source=new T.Mesh(new T.PlaneGeometry(size,size),solarMaterial);
 source.name='Sun · 0.533° photosphere';source.renderOrder=-10;
 group.add(field,source);
 const forward=new T.Vector3(0,0,1),towardEye=new T.Vector3();
 return {group,source,field,update(observer,sunDirection,showSun){
  // Neither the annual orbit nor camera translation introduces stellar parallax.
  group.position.copy(observer.position);source.visible=showSun;
  source.position.copy(sunDirection).normalize().multiplyScalar(sunDistance);
  towardEye.copy(source.position).negate().normalize();source.quaternion.setFromUnitVectors(forward,towardEye);
 },dispose(){
  survey.dispose();glow.dispose();fieldMaterial.dispose();solarMaterial.dispose();field.geometry.dispose();source.geometry.dispose();
 }};
}
