import {spacecraftInterface as ring,interfaceHoles} from './payload-interface.js';

// Local +Z runs into the vehicle. The flat mating face is at local z=0.
export function flightInterfaceGeometry(T){
 function contour(path,x,y,r,count,reverse=false){
  for(let i=0;i<count;i++){
   const angle=(reverse?-1:1)*(i+.13)*2*Math.PI/count;
   const px=x+r*Math.cos(angle),py=y+r*Math.sin(angle);
   if(i)path.lineTo(px,py);else path.moveTo(px,py);
  }
  return path.closePath();
 }
 const profile=contour(new T.Shape(),0,0,ring.outerM/2,96);
 profile.holes.push(contour(new T.Path(),0,0,ring.boreM/2,96,true));
 for(const [x,y] of interfaceHoles())profile.holes.push(contour(new T.Path(),x,y,ring.holeM/2,10,true));
 return new T.ExtrudeGeometry(profile,{depth:ring.thicknessM,bevelEnabled:false});
}
