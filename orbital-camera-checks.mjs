import assert from 'node:assert/strict';
import {Quaternion,Vector3} from './dist/vendor/three.module.js';
import {SUN_VELOCITY_TILT_DEG,sunVelocityCameraFrame} from './dist/orbital-camera.js';

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
