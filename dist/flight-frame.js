// Vehicle geometry is in body metres. The distant Earth uses Earth radii in
// a separate perspective pass so orbit-scale distances retain depth precision.
import * as T from './vendor/three.module.js';
import {R} from './orbit.js';
import {createCelestialSky} from './celestial-sky.js';
const v=a=>new T.Vector3(...a);
export const eciScene=(a,k=1)=>new T.Vector3(a[0]*k,a[2]*k,-a[1]*k);
const orientation=(x,y,z)=>new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(eciScene(x),eciScene(y),eciScene(z)));
export function flightFrames(s){
 if(!s.along||!s.normal||!s.radial||!s.bodyXECI||!s.bodyUpECI||!s.positionECI)return null;
 const z=s.bodyZECI||v(s.bodyXECI).cross(v(s.bodyUpECI)).normalize().toArray();
 const body=orientation(s.bodyXECI,s.bodyUpECI,z),orbital=orientation(s.along,s.normal,s.radial);
 return {body,orbital,orbitalToBody:body.clone().invert().multiply(orbital)};
}
export function configureObserver(camera,foreground,frame,s,aspect,launchStack){
 const orientation=launchStack?frame.orbital.clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2)):frame.body;
 camera.position.copy(eciScene(s.positionECI,1/R));camera.quaternion.copy(orientation).multiply(foreground.quaternion);
 if(camera.aspect!==aspect){camera.aspect=aspect;camera.updateProjectionMatrix();}
 camera.updateMatrixWorld();
}
export function createEarthBackdrop(planet,atmosphere,onReady,compactTextures=false,appearance=null){
 const scene=new T.Scene(),globe=planet.clone(),air=atmosphere.clone(),skyCam=new T.PerspectiveCamera(49,1,.0001,30);
 const sky=createCelestialSky(onReady,compactTextures);
 const sun=new T.DirectionalLight(0xfff3e1,2.65),fill=new T.AmbientLight(0x91adc2,.19);
 scene.add(sky.group,globe,air,sun,fill);
 function updateSky(s,atVehicle,viewport){
  globe.visible=air.visible=atVehicle;
  globe.rotation.y=air.rotation.y=s.earthRotationRad;sun.position.copy(eciScene(s.sunECI).normalize());
  appearance?.update(sun.position,s.t);
  if(atVehicle){globe.updateWorldMatrix(true,false);appearance?.prepare(skyCam,globe,viewport);}
  sky.update(skyCam,sun.position,!atVehicle||!s.eclipse);
  scene.userData.lightState={sun:sun.position,ambient:.095,direct:1.13,rim:0};
 }
 return {scene,camera:skyCam,dispose:()=>sky.dispose(),update(camera,frame,s,aspect,launchStack,viewport){
  configureObserver(skyCam,camera,frame,s,aspect,launchStack);updateSky(s,true,viewport);
 },overview(camera,s,aspect){
  // The foreground orthographic pass draws Earth and its locator. Its
  // external camera can see the Sun while the spacecraft itself is eclipsed.
  skyCam.position.set(0,0,0);skyCam.quaternion.copy(camera.quaternion);
  if(skyCam.aspect!==aspect){skyCam.aspect=aspect;skyCam.updateProjectionMatrix();}
  skyCam.updateMatrixWorld();updateSky(s,false);
 }};
}
