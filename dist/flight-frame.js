// Vehicle geometry is in body metres. The distant Earth uses Earth radii in
// a separate perspective pass so orbit-scale distances retain depth precision.
import * as T from './vendor/three.module.js';
import {R} from './orbit.js';
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
export function createEarthBackdrop(planet,atmosphere){
 const scene=new T.Scene(),globe=planet.clone(),skyCam=new T.PerspectiveCamera(49,1,.0001,5);
 // Same projection, ephemeris, texture meridian and lights for both render paths.
 scene.add(globe,atmosphere.clone());
 // A fixed, illustrative star field supplies an inertial reference when a
 // body-following inspection camera turns away from Earth. It has no parallax.
 const positions=[];let seed=27183;
 const next=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
 for(let i=0;i<1900;i++){
  const y=2*next()-1,r=Math.sqrt(1-y*y),a=2*Math.PI*next();
  positions.push(4*r*Math.cos(a),4*y,4*r*Math.sin(a));
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 const stars=new T.Points(g,new T.PointsMaterial({color:0x94afc7,opacity:.47,transparent:true,size:1,sizeAttenuation:false,depthWrite:false}));stars.renderOrder=-1;scene.add(stars);
 const sun=new T.DirectionalLight(0xfff3e1,2.65),fill=new T.AmbientLight(0x91adc2,.19);scene.add(sun,fill);
 return {scene,camera:skyCam,dispose(){g.dispose();stars.material.dispose();},update(camera,frame,s,aspect,launchStack){
  configureObserver(skyCam,camera,frame,s,aspect,launchStack);
  stars.position.copy(skyCam.position);globe.rotation.y=s.earthRotationRad;sun.position.copy(eciScene(s.sunECI).normalize());
  scene.userData.lightState={sun:sun.position,ambient:.095,direct:1.13,rim:0};
 }};
}
