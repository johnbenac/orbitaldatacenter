// Protect two prior failures: motion with a fixed Earth photograph, and changing
// telemetry while the mounted hardware stayed at its design angle.
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {eciScene,flightFrames,configureObserver} from './dist/flight-frame.js';
import {sizeDesign,missionStarter} from './dist/design.js';
import {geometry,DEG,R} from './dist/orbit.js';
import {makeCraft} from './dist/craft.js';
import {pointingGeometry,pointingViewAllowed} from './dist/pointing-guide.js';
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
for(const [a,b,c,r,t] of [[0,-45,45,0,0],[76,-63,31,24,-49],[-123,-34,65,-70,83],[-123,-34,65,50,80]]){
 const guidance={wingPitchDeg:a,upperRadiatorPitchDeg:b,lowerRadiatorPitchDeg:c,upperRadiatorRollDeg:r,lowerRadiatorRollDeg:t};
 craft.positionPanels(1,guidance);craft.root.updateMatrixWorld(true);
 assert(Math.abs(craft.wings[0].table.rotation.x-a*DEG)<1e-12);
 for(const {surface,descriptor:d} of craft.panels){
  const pitch=d.type==='pv'?a:d.end<0?b:c,roll=d.type==='pv'?0:d.end<0?r:t;
  const expected=Y.clone().applyAxisAngle(Z,roll*DEG).applyAxisAngle(V(1,0,0),pitch*DEG);
  assert(Y.clone().transformDirection(surface.matrixWorld).distanceTo(expected)<1e-9,'actual two-axis panel pose');
 }
 assert(Math.abs(rad.knuckle.rotation.x)<1e-12);
 assert(ends.elbowPin.getWorldPosition(V()).distanceTo(ends.elbowSocket.getWorldPosition(V()))<1e-9);
 for(const p of ends.hoses)assert(p.fromPort.getWorldPosition(V()).distanceTo(p.start.getWorldPosition(V()))<1e-9);
 for(const anchor of ['radiator','solar'])assert(hardwareAnchor(anchor,craft,h,{}).toArray().every(Number.isFinite));
}
// Sample live flight solutions. Use each radiating mesh's real PlaneGeometry
// triangle normal, including its underside winding, then compare in inertial space.
for(const t of [4100,5600,6500,7900,9000]){
 const g=geometry(h.input,t),s={...g,...attitudeGuidance(h,g),deployment:1,upperRadiatorFlow:1,lowerRadiatorFlow:1};
 craft.positionPanels(1,s);craft.root.updateMatrixWorld(true);
 const axes=[s.bodyXECI,s.bodyUpECI,s.bodyZECI].map(a=>V(...a));
 for(const {surface,descriptor:d} of craft.panels){
  const expected=V(...(d.type==='pv'?s.pvNormalECI:d.end<0?s.upperRadiatorNormalECI:s.lowerRadiatorNormalECI));
  for(const skin of surface.children.filter(o=>o.geometry?.type==='PlaneGeometry')){
   const n=V().fromBufferAttribute(skin.geometry.attributes.normal,0).transformDirection(skin.matrixWorld);
   const inertial=V().addScaledVector(axes[0],n.x).addScaledVector(axes[1],n.y).addScaledVector(axes[2],n.z);
   assert(inertial.distanceTo(expected.clone().multiplyScalar(Math.sign(skin.position.y)))<1e-9);
   if(d.type==='rad')assert(Math.abs(Math.abs(inertial.dot(V(...s.sunECI)))-(d.end<0?s.upperRadiatorSunCos:s.lowerRadiatorSunCos))<1e-9);
  }
 }
 assert(pointingViewAllowed('spacecraft',s)&&!pointingViewAllowed('core',s)&&!pointingViewAllowed('launch',s,false));
 assert(!pointingViewAllowed('spacecraft',{...s,referenceBody:true}));
 const guided=(loop,patch={})=>pointingGeometry(craft,h,{...s,...patch},'software','',loop);
 const surface=guided('surfaces');
 assert.equal(surface.labels.length,3);
 assert.equal(surface.vectors.filter(v=>v.dashed).length,s.eclipse?0:3);
 assert.equal(guided('terminal').labels[0].anchor,'terminal-boresight');
 const body=guided('body');assert.equal(body.vectors.length,3);
 assert(body.vectors[0].direction.dot(body.vectors[1].direction)<-.999999);
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
