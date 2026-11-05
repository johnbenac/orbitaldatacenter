// Protect two prior failures: motion with a fixed Earth photograph, and changing
// telemetry while the mounted hardware stayed at its design angle.
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {eciScene,flightFrames,configureObserver} from './dist/flight-frame.js';
import {sizeDesign,missionStarter} from './dist/design.js';
import {geometry,DEG,R} from './dist/orbit.js';
import {makeCraft} from './dist/craft.js';
import {hardwareAnchor} from './dist/hardware-focus.js';
import {attitudeGuidance} from './dist/attitude-guidance.js';

const V=(...a)=>new T.Vector3(...a),Y=V(0,1,0),Z=V(0,0,1);
const brush=new Proxy({},{get:(_,k)=>k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});
globalThis.document={createElement:()=>({getContext:()=>brush})};
const h=sizeDesign(missionStarter('text'));
function shot(t){
 const g=geometry(h.input,t),s={...g,...attitudeGuidance(h,g)},frames=flightFrames(s);
 assert(frames.body.length()>.999999);
 const foreground=new T.OrthographicCamera(),sky=new T.PerspectiveCamera();
 // Sight a fixed point at nadir. A rotating camera can only remain on nadir if
 // the attitude transform and the actual spacecraft motion agree.
 foreground.quaternion.copy(frames.orbitalToBody);
 configureObserver(sky,foreground,frames,s,1.8,false);
 const dir=sky.getWorldDirection(V()),nadir=eciScene(s.radial).negate();
 assert(dir.distanceTo(nadir)<1e-9);
 const surface=sky.position.clone().addScaledVector(dir,s.altitudeKm/R);
 assert(Math.abs(surface.length()-1)<1e-9);
 const fixed=surface.applyAxisAngle(Y,-s.earthRotationRad);
 const dot=V(...s.bodyXECI).cross(V(...s.bodyUpECI)).dot(V(...s.bodyZECI));assert(Math.abs(dot-1)<1e-9);
 return fixed;
}
assert(shot(4200).distanceTo(shot(5100))>.2,'orbit advances across the ground in the close camera');
const craft=makeCraft(h),rad=craft.rads[0],ends=craft.mechanismAudit.banks[0];
for(const [a,b,c] of [[0,-45,45],[76,-63,31],[-123,-34,65]]){
 const guidance={wingPitchDeg:a,upperRadiatorPitchDeg:b,lowerRadiatorPitchDeg:c};
 craft.positionPanels(1,guidance);craft.root.updateMatrixWorld(true);
 assert(Math.abs(craft.wings[0].table.rotation.x-a*DEG)<1e-12);
 assert(Math.abs(rad.bank.rotation.x-b*DEG)<1e-12&&Math.abs(craft.rads[1].bank.rotation.x-c*DEG)<1e-12);
 assert(Math.abs(rad.knuckle.rotation.x)<1e-12);
 assert(ends.elbowPin.getWorldPosition(V()).distanceTo(ends.elbowSocket.getWorldPosition(V()))<1e-9);
 for(const p of ends.hoses)assert(p.fromPort.getWorldPosition(V()).distanceTo(p.start.getWorldPosition(V()))<1e-9);
 for(const anchor of ['radiator','solar'])assert(hardwareAnchor(anchor,craft,h,{}).toArray().every(Number.isFinite));
}
for(const d of [.2,1.2,4]){
 const custom=sizeDesign({...h.input,kaDishM:d,opticalApertureM:d===4?.5:.12}),c=makeCraft(custom);
 let clearance=Infinity;
 for(const az of [-110,-45,0,90,160])for(const el of [0,20,45,60,75]){
  const a=el*DEG,b=az*DEG,to=V(Math.sin(a)*Math.sin(b),Math.cos(a),Math.sin(a)*Math.cos(b));
  c.pointTerminals(to,to);c.root.updateMatrixWorld(true);
  for(const head of [c.dish,c.optic]){
   const q=head.getWorldQuaternion(new T.Quaternion());assert(Y.clone().applyQuaternion(q).distanceTo(to)<1e-8);
   head.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,pos=V();for(let i=0;i<p.count;i++){
    pos.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);clearance=Math.min(clearance,pos.y-custom.bodyHeightM/2);
   }});
  }
 }
 assert(clearance>.020,'head intersects the +Y mounting deck for '+d+' m: '+clearance);
 console.log(d.toFixed(1)+' m Ka, '+custom.input.opticalApertureM.toFixed(2)+' m optical: '+(clearance*1000).toFixed(1)+' mm minimum sampled moving-head clearance above the +Y deck.');
}
console.log('Orbital observer, ground rotation, physical axes, actual radiator + solar joints, flexible hose endpoints, terminal boresights and deck clearance passed.');
