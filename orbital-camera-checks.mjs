import assert from 'node:assert/strict';
import {Quaternion,Vector3} from './dist/vendor/three.module.js';
import {CAMERA_MODES,normalizeCameraMode,cameraModeAvailable,cameraReferenceToBody,SUN_VELOCITY_TILT_DEG,sunVelocityCameraFrame} from './dist/orbital-camera.js';
import {flightFrames} from './dist/flight-frame.js';
import {INSERTION_MET} from './dist/launch-effects-state.js';

const V=(...a)=>new Vector3(...a),DEG=Math.PI/180;
const close=(actual,expected,message,tolerance=1e-10)=>
 assert(Math.abs(actual-expected)<tolerance,`${message}: ${actual} versus ${expected}`);
const project=(vector,direction)=>vector.clone().addScaledVector(direction,-vector.dot(direction));
function validFrame(frame){
 assert(frame,'valid vectors produce a frame');
 for(const key of ['direction','up','normal','bisector']){
  assert(frame[key].isVector3,`${key} is a THREE.Vector3`);
  assert(frame[key].toArray().every(Number.isFinite),`${key} remains finite`);
  close(frame[key].length(),1,`${key} is normalized`);
 }
 close(frame.direction.dot(frame.up),0,'up lies in the image plane');
}
const snapshot={sunECI:[1,0,0],velocityECI:[0,7.5,0],radial:[0,0,1],normal:[1,0,0],along:[0,0,1]};
const initial=sunVelocityCameraFrame(snapshot);
validFrame(initial);
const bisector=V(1,1,0).normalize(),sun=V(1,0,0),velocity=V(0,1,0);
close(initial.direction.dot(bisector),Math.cos(SUN_VELOCITY_TILT_DEG*DEG),'eye is close to the actual Sun/velocity bisector');
close(initial.direction.dot(sun),initial.direction.dot(velocity),'eye sees the two vector directions at equal angles');
assert(Math.abs(initial.direction.z)>.3,'eye is outside the vector plane');
const sunOnScreen=project(sun,initial.direction).normalize(),velocityOnScreen=project(velocity,initial.direction).normalize();
assert(sunOnScreen.clone().cross(velocityOnScreen).length()>.6,'visible arrows no longer collapse into one straight line');
assert(initial.up.dot(project(V(...snapshot.radial),initial.direction).normalize())>.999999,'radial projects upward initially');

// Magnitude is irrelevant, and the actual velocity must take precedence over
// the deliberately different orbital along-axis above.
const scaled=sunVelocityCameraFrame({...snapshot,sunECI:[100,0,0],velocityECI:[0,.25,0]});
assert(initial.direction.distanceTo(scaled.direction)<1e-12);
const changed=sunVelocityCameraFrame({...snapshot,velocityECI:[-3,6,2]},initial);
validFrame(changed);
assert(changed.direction.distanceTo(initial.direction)>.1,'new physical vectors move the automatic camera');

// Rotating the physical coordinate system rotates the whole camera frame.
for(let i=1;i<=12;i++){
 const rotation=new Quaternion().setFromAxisAngle(V(Math.sin(i),Math.cos(i*2),Math.sin(i*3)).normalize(),i*.179);
 const rotate=a=>V(...a).applyQuaternion(rotation).toArray();
 const rotated=sunVelocityCameraFrame(Object.fromEntries(Object.entries(snapshot).map(([key,value])=>[key,rotate(value)])));
 for(const key of ['direction','up','normal','bisector'])
  assert(rotated[key].distanceTo(initial[key].clone().applyQuaternion(rotation))<1e-10,`${key} is expressed in physical ECI coordinates`);
}

for(const patch of [null,{}, {sunECI:[0,0,0]}, {velocityECI:[0,0,0]},
 {sunECI:[NaN,0,0]}, {velocityECI:[Infinity,1,0]}, {sunECI:[1,0]}, {velocityECI:'bad'}]){
 const input=patch===null?null:Object.keys(patch).length?{...snapshot,...patch}:{};
 assert.equal(sunVelocityCameraFrame(input),null,'missing, zero, or nonfinite input directions are rejected');
}

for(const s of [
 {sunECI:[1,0,0],velocityECI:[1,0,0]},
 {sunECI:[-1,0,0],velocityECI:[1,0,0]},
 {sunECI:[1,0,0],velocityECI:[1,0,0],radial:[1,0,0],normal:[1,0,0]},
 {sunECI:[-1,0,0],velocityECI:[1,0,0],radial:[0,0,1],normal:[0,0,1]},
 {sunECI:[1e-300,0,0],velocityECI:[0,1e300,0],radial:[NaN,0,0]}
])validFrame(sunVelocityCameraFrame(s));

// Sweep through both alignments from both directions. Sun moves smoothly;
// neither the eye nor its roll may arbitrarily jump to another hemisphere.
for(const center of [0,180])for(const sign of [-1,1]){
 let previous=null;
 for(let step=0;step<=800;step++){
  const angle=(center+sign*(-10+step*.025))*DEG;
  const input={sunECI:[Math.cos(angle),Math.sin(angle),0],velocityECI:[1,0,0],radial:[0,1,0],normal:[0,0,1]};
  const frame=sunVelocityCameraFrame(input,previous);validFrame(frame);
  if(previous){
   assert(frame.direction.dot(previous.direction)>.999,'small changes through alignment move the eye continuously');
   assert(frame.up.dot(previous.up)>.995,'small changes through alignment preserve continuous roll');
   assert(frame.normal.dot(previous.normal)>.999,'cross-product sign changes do not reverse the tilt');
  }
  const same=sunVelocityCameraFrame(input,frame);
  for(const key of ['direction','up','normal','bisector'])
   assert(same[key].distanceTo(frame[key])<1e-10,'repeated identical snapshots never advance camera interpolation');
  previous=frame;
 }
}

// A tiny out-of-plane miss is more demanding than exact opposition: the
// instantaneous plane normal can swing by 90 degrees in a single small step.
// The camera must retain its opposition pole instead of inheriting that jump.
for(const beta of [1e-6,.001,1,-1e-6,-.001,-1]){
 let previous=null;
 for(let step=0;step<=640;step++){
  const a=(-8+step*.025)*DEG,b=beta*DEG;
  const input={sunECI:[-Math.cos(a)*Math.cos(b),Math.sin(a)*Math.cos(b),Math.sin(b)],velocityECI:[1,0,0],radial:[0,1,0],normal:[0,0,1]};
  const frame=sunVelocityCameraFrame(input,previous);validFrame(frame);
  if(previous){
   assert(frame.direction.dot(previous.direction)>.999,'a near miss of opposition must not produce a camera jump');
   assert(frame.up.dot(previous.up)>.9,'a near miss must not flip the camera roll');
  }
  const same=sunVelocityCameraFrame(input,frame);
  for(const key of ['direction','up','normal','bisector'])
   assert(same[key].distanceTo(frame[key])<1e-10,'opposition pole does not drift on repeated snapshots');
  previous=frame;
 }
}

// Radial up also has a pole. Crossing it should preserve the roll already in
// use rather than flip the camera as the projected radial vector reverses.
let previous=initial;
const across=V().crossVectors(initial.direction,initial.up).normalize();
for(let step=0;step<=200;step++){
 const angle=(-1+step*.01)*DEG;
 const radial=initial.direction.clone().multiplyScalar(Math.cos(angle)).addScaledVector(across,Math.sin(angle));
 const frame=sunVelocityCameraFrame({...snapshot,radial:radial.toArray()},previous);validFrame(frame);
 if(step)assert(frame.up.dot(previous.up)>.999,'passing through the radial pole does not introduce a half-roll');
 previous=frame;
}

// The helper owns its vectors and never mutates snapshots or a cached frame.
const frameArrays=frame=>Object.fromEntries(Object.entries(frame).map(([key,v])=>[key,v?.toArray()??null]));
const savedSnapshot=JSON.stringify(snapshot),savedFrame=frameArrays(initial);
sunVelocityCameraFrame(snapshot,initial);
assert.equal(JSON.stringify(snapshot),savedSnapshot);
assert.deepEqual(frameArrays(initial),savedFrame);
console.log('Orbital default camera: bisector tilt, arrow separation, physical ECI transforms, moving vectors, singular continuity, radial-up transport and repeatability passed.');

assert.deepEqual(CAMERA_MODES,['orbit','body','inertial','sun-velocity']);
for(const mode of CAMERA_MODES)assert.equal(normalizeCameraMode(mode),mode);
for(const value of [undefined,null,'','Orbit','earth',{}])assert.equal(normalizeCameraMode(value),'orbit');
for(const mode of CAMERA_MODES){
 assert(cameraReferenceToBody(mode,null).equals(new Quaternion()),'missing flight frame safely supplies identity');
 assert(cameraReferenceToBody(mode,undefined).equals(new Quaternion()),'uninitialized flight frame safely supplies identity');
}

const orbitSnapshot={t:INSERTION_MET,altitudeKm:550,flightPhase:'insertion'};
for(const view of ['spacecraft','core']){
 assert(cameraModeAvailable(view,orbitSnapshot),'camera modes become available at orbital insertion');
 assert(cameraModeAvailable(view,{...orbitSnapshot,t:9000,flightPhase:'operations'}));
 assert(cameraModeAvailable(view,{...orbitSnapshot,flightPhase:'deorbit'}),'an orbiting deorbit view remains available before entry');
 for(const patch of [{t:INSERTION_MET-1},{t:NaN},{t:Infinity},{altitudeKm:0},{altitudeKm:-1},
  {altitudeKm:NaN},{altitudeKm:Infinity},{referenceBody:true},{orbitLost:true},{flightPhase:'entry'}])
  assert(!cameraModeAvailable(view,{...orbitSnapshot,...patch}),'non-orbital or invalid snapshots must not expose camera modes');
 for(const input of [null,undefined,{}])assert(!cameraModeAvailable(view,input));
}
for(const view of ['orbit','launch','bay',''])assert(!cameraModeAvailable(view,orbitSnapshot),'camera modes are limited to close spacecraft/core views');
assert(cameraModeAvailable('spacecraft',orbitSnapshot,'commissioning','vehicle'));
for(const lens of ['wing','radiator'])assert(!cameraModeAvailable('spacecraft',orbitSnapshot,'commissioning',lens),'dedicated commissioning lenses keep their own camera');
assert(cameraModeAvailable('core',orbitSnapshot,'commissioning','wing'));
assert(cameraModeAvailable('spacecraft',orbitSnapshot,'operations','wing'));

// Use independently constructed physical ECI axes rather than the render-space
// conversion to check transform direction and quaternion multiplication order.
const orbitPlane=new Quaternion().setFromAxisAngle(V(.3,.8,-.4).normalize(),.71);
const cameraOffset=new Quaternion().setFromAxisAngle(V(.4,-.3,.7).normalize(),1.17)
 .multiply(new Quaternion().setFromAxisAngle(V(0,1,0),-.29));
const localEye=V(0,0,1).applyQuaternion(cameraOffset),localUp=V(0,1,0).applyQuaternion(cameraOffset);
const expectedNadir=V(0,0,-1).applyQuaternion(cameraOffset.clone().invert());
const bodyEyeDirections=[];
function intoBody(vector,s){return V(vector.dot(V(...s.bodyXECI)),vector.dot(V(...s.bodyUpECI)),vector.dot(V(...s.bodyZECI)));}
function intoECI(vector,s){return V(...s.bodyXECI).multiplyScalar(vector.x).addScaledVector(V(...s.bodyUpECI),vector.y).addScaledVector(V(...s.bodyZECI),vector.z);}
for(let sample=0;sample<16;sample++){
 const angle=sample*Math.PI/7;
 const radial=V(Math.cos(angle),Math.sin(angle),0).applyQuaternion(orbitPlane);
 const along=V(-Math.sin(angle),Math.cos(angle),0).applyQuaternion(orbitPlane);
 const normal=V(0,0,1).applyQuaternion(orbitPlane);
 // Body attitude changes independently of orbital phase, including roll.
 const attitude=new Quaternion().setFromAxisAngle(V(.2,.5,.8).normalize(),sample*.43)
  .multiply(new Quaternion().setFromAxisAngle(V(1,0,0),.61-sample*.17));
 const s={...orbitSnapshot,radial:radial.toArray(),along:along.toArray(),normal:normal.toArray(),
  positionECI:radial.clone().multiplyScalar(7000).toArray(),
  bodyXECI:V(1,0,0).applyQuaternion(attitude).toArray(),
  bodyUpECI:V(0,1,0).applyQuaternion(attitude).toArray(),
  bodyZECI:V(0,0,1).applyQuaternion(attitude).toArray()};
 const frame=flightFrames(s);
 const original=Object.fromEntries(Object.entries(frame).map(([key,q])=>[key,q.toArray()]));
 const orbitCamera=cameraReferenceToBody('orbit',frame).multiply(cameraOffset);
 const actualNadir=intoBody(radial.clone().negate(),s).applyQuaternion(orbitCamera.clone().invert());
 assert(actualNadir.distanceTo(expectedNadir)<1e-10,'nadir keeps the same camera direction through an orbit despite body attitude changes and a fixed arbitrary drag offset');
 const orbitEyeECI=intoECI(V(0,0,1).applyQuaternion(orbitCamera),s);
 const expectedEye=along.clone().multiplyScalar(localEye.x).addScaledVector(normal,localEye.y).addScaledVector(radial,localEye.z);
 assert(orbitEyeECI.distanceTo(expectedEye)<1e-10,'orbit frame is along-track, orbit-normal, radial-outward in that order');

 const inertialCamera=cameraReferenceToBody('inertial',frame).multiply(cameraOffset);
 assert(intoECI(V(0,0,1).applyQuaternion(inertialCamera),s).distanceTo(localEye)<1e-10,'inertial eye direction remains fixed in physical ECI');
 assert(intoECI(V(0,1,0).applyQuaternion(inertialCamera),s).distanceTo(localUp)<1e-10,'inertial roll/up remains fixed in physical ECI');

 const bodyCamera=cameraReferenceToBody('body',frame).multiply(cameraOffset);
 assert(V(0,0,1).applyQuaternion(bodyCamera).distanceTo(localEye)<1e-10,'body mode retains the same chassis-relative viewing angle');
 assert(V(0,1,0).applyQuaternion(bodyCamera).distanceTo(localUp)<1e-10,'body mode retains chassis-relative roll');
 bodyEyeDirections.push(intoECI(V(0,0,1).applyQuaternion(bodyCamera),s));
 assert(cameraReferenceToBody('sun-velocity',frame).equals(new Quaternion()),'Sun–velocity retains its existing separately computed body-space basis');
 assert.deepEqual(Object.fromEntries(Object.entries(frame).map(([key,q])=>[key,q.toArray()])),original,'composing a camera offset never mutates the shared flight frames');
}
assert(bodyEyeDirections.some(direction=>direction.distanceTo(bodyEyeDirections[0])>.5),'body mode follows spacecraft attitude rather than accidentally staying inertial');
console.log('Camera modes: availability, orbit-relative nadir stability, independent body attitude, constant inertial ECI orientation and frame immutability passed.');
