import {Vector3} from './vendor/three.module.js';

export const SUN_VELOCITY_TILT_DEG=22.5;
const tilt=SUN_VELOCITY_TILT_DEG*Math.PI/180;
const cosTilt=Math.cos(tilt),sinTilt=Math.sin(tilt);
// At opposition the internal bisector has no unique direction. During the last
// six degrees, pass through a maintained pole instead of reversing
// the camera when Sun + velocity changes sign.
const oppositionBand=2*Math.sin(3*Math.PI/180),epsilon=1e-8;
const axes=[new Vector3(1,0,0),new Vector3(0,1,0),new Vector3(0,0,1)];

function unit(value){
 const a=value?.isVector3?[value.x,value.y,value.z]:value;
 if(!a||a.length!==3||!Array.from(a).every(Number.isFinite))return null;
 const scale=Math.max(...Array.from(a,Math.abs));
 if(!scale)return null;
 return new Vector3(a[0]/scale,a[1]/scale,a[2]/scale).normalize();
}

function perpendicular(value,axis){
 const result=unit(value);
 if(!result)return null;
 result.addScaledVector(axis,-result.dot(axis));
 return result.lengthSq()>epsilon*epsilon?result.normalize():null;
}

function sparePerpendicular(axis){
 const leastAligned=axes.reduce((a,b)=>Math.abs(a.dot(axis))<=Math.abs(b.dot(axis))?a:b);
 return perpendicular(leastAligned,axis);
}

// Inputs and outputs use physical ECI axes. The renderer converts this frame to
// its body coordinates in the same way as the Sun and velocity arrows. Previous
// state selects continuous hemispheres/fallbacks; there is no per-render easing.
export function sunVelocityCameraFrame(snapshot,previous=null){
 const sun=unit(snapshot?.sunECI),velocity=unit(snapshot?.velocityECI);
 if(!sun||!velocity)return null;
 const radial=unit(snapshot.radial)||unit(snapshot.positionECI);
 const orbitalNormal=unit(snapshot.normal)||
  (radial?unit(radial.clone().cross(velocity)):null);
 const previousNormal=unit(previous?.normal);
 let normal=sun.clone().cross(velocity);
 if(normal.lengthSq()>epsilon*epsilon)normal.normalize();
 else normal=perpendicular(previousNormal,velocity)||
  perpendicular(orbitalNormal,velocity)||sparePerpendicular(velocity);
 // Either side of the Sun/velocity plane gives the same useful lighting. Keep
 // the chosen side when the oriented cross product reverses at an alignment.
 const normalReference=previousNormal||orbitalNormal;
 if(normalReference&&normal.dot(normalReference)<-epsilon)normal.negate();

 const sum=sun.clone().add(velocity),length=sum.length();
 const proximity=Math.max(0,1-length/oppositionBand);
 const bias=oppositionBand*proximity*proximity*(3-2*proximity);
 // Keep the pole chosen on entry into this band. In a very close miss of
 // opposition, the instantaneous plane normal itself can rotate by a half-turn
 // over a tiny orbital step; using that moving normal for the bias would turn
 // a finite fallback into another camera jump. Projection transports this
 // pole geometrically and is idempotent for repeated identical snapshots.
 const oppositionNormal=bias?perpendicular(previous?.oppositionNormal,velocity)||
  perpendicular(previousNormal,velocity)||perpendicular(orbitalNormal,velocity)||
  normal.clone():null;
 const bisector=sum.clone();
 if(oppositionNormal)bisector.addScaledVector(oppositionNormal,bias);
 bisector.normalize();
 const direction=sum.multiplyScalar(cosTilt)
  .addScaledVector(normal,length*sinTilt);
 if(oppositionNormal)direction.addScaledVector(oppositionNormal,bias);
 direction.normalize();

 // Project radial up onto the image plane. Near its pole, transport the last
 // up direction; selecting its closest hemisphere prevents a sudden half-roll
 // as the radial projection passes through zero.
 const transportedUp=perpendicular(previous?.up,direction);
 const up=perpendicular(radial,direction)||transportedUp||
  perpendicular(normal,direction)||perpendicular(velocity,direction)||
  sparePerpendicular(direction);
 if(transportedUp&&up.dot(transportedUp)<-epsilon)up.negate();
 return {direction,up,normal,bisector,oppositionNormal};
}
