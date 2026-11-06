import {Quaternion,Vector3} from './vendor/three.module.js';

export const TRACKBALL_RADIUS=.40;
const screenBack=new Vector3(0,0,1);

// Equal angular spacing from the pole to the rim keeps drag sensitivity finite
// at the silhouette. Distances use CSS pixels, independent of device pixel ratio.
function spherePoint(x,y){
 const r=Math.hypot(x,y);
 if(!r)return screenBack.clone();
 const angle=Math.min(r,1)*Math.PI/2,scale=Math.sin(angle)/r;
 return new Vector3(x*scale,y*scale,Math.cos(angle));
}

export function beginTrackball(clientX,clientY,bounds,cameraOrientation){
 const cx=bounds.left+bounds.width/2,cy=bounds.top+bounds.height/2;
 const radius=Math.max(1,TRACKBALL_RADIUS*Math.min(bounds.width,bounds.height));
 const x=(clientX-cx)/radius,y=(cy-clientY)/radius;
 return {cx,cy,radius,mode:Math.hypot(x,y)>=1?'roll':'tumble',
  start:spherePoint(x,y),orientation:cameraOrientation.clone().normalize(),lastX:x,lastY:y,roll:0};
}

// Invert the screen-space rotation so that the visible object follows the drag.
export function trackballOrientation(gesture,clientX,clientY,out=new Quaternion()){
 const {cx,cy,radius,start,orientation}=gesture;
 const x=(clientX-cx)/radius,y=(cy-clientY)/radius;
 if(gesture.mode==='roll'){
  const {lastX,lastY}=gesture,dead=.12;
  const cross=lastX*y-lastY*x,dot=lastX*x+lastY*y;
  // Re-anchor strokes crossing the pivot: its bearing is undefined and a
  // straight swipe through the center must not introduce a sudden half-turn.
  if(Math.hypot(x,y)>dead&&Math.hypot(lastX,lastY)>dead&&
     (dot>=0||Math.abs(cross)>dead*Math.hypot(x-lastX,y-lastY)))gesture.roll+=Math.atan2(cross,dot);
  gesture.lastX=x;gesture.lastY=y;
  out.setFromAxisAngle(screenBack,-gesture.roll);
 }else{
  out.setFromUnitVectors(spherePoint(x,y),start);
 }
 return out.premultiply(orientation).normalize();
}
