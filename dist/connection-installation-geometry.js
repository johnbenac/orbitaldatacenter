// Shared panel apertures and fixed-length U geometry used by launch and flight.
import * as T from './vendor/three.module.js';
import {roundedConnectionRoute} from './connection-routes.js';

const V=(p=[0,0,0])=>new T.Vector3(...p);
function rectangle(w,h){return new T.Shape().moveTo(-w/2,-h/2).lineTo(w/2,-h/2).lineTo(w/2,h/2).lineTo(-w/2,h/2).closePath();}
function holePath(h){const p=new T.Path();if(h.radiusM){p.absarc(h.u,h.v,h.radiusM,0,-Math.PI*2,true);}else{const x=h.u-h.widthM/2,y=h.v-h.heightM/2;p.moveTo(x,y).lineTo(x,y+h.heightM).lineTo(x+h.widthM,y+h.heightM).lineTo(x+h.widthM,y).closePath();}return p;}
function bounds(h){const u=h.radiusM||h.widthM/2,v=h.radiusM||h.heightM/2;return [h.u-u,h.v-v,h.u+u,h.v+v];}
function mergeHoles(holes){const result=[];for(const source of holes){let h={...source},b=bounds(h);for(let i=0;i<result.length;){const q=bounds(result[i]);if(Math.min(q[2],b[2])>Math.max(q[0],b[0])-1e-8&&Math.min(q[3],b[3])>Math.max(q[1],b[1])-1e-8){b=[Math.min(b[0],q[0]),Math.min(b[1],q[1]),Math.max(b[2],q[2]),Math.max(b[3],q[3])];h={u:(b[0]+b[2])/2,v:(b[1]+b[3])/2,widthM:b[2]-b[0],heightM:b[3]-b[1],ids:[...(h.ids||[h.id]),...(result[i].ids||[result[i].id])]};result.splice(i,1);i=0;}else i++;}result.push(h);}return result;}
export function perforatedPanelGeometry(widthM,heightM,thicknessM,holes=[]){
 const merged=mergeHoles(holes),edge=merged.some(h=>{const b=bounds(h);return b[0]<=-widthM/2||b[2]>=widthM/2||b[1]<=-heightM/2||b[3]>=heightM/2;});
 if(edge){
  const rectangles=merged.map(bounds).filter(b=>b[2]>-widthM/2&&b[0]<widthM/2&&b[3]>-heightM/2&&b[1]<heightM/2),xs=[...new Set([-widthM/2,widthM/2,...rectangles.flatMap(b=>[Math.max(-widthM/2,b[0]),Math.min(widthM/2,b[2])])])].sort((a,b)=>a-b),ys=[...new Set([-heightM/2,heightM/2,...rectangles.flatMap(b=>[Math.max(-heightM/2,b[1]),Math.min(heightM/2,b[3])])])].sort((a,b)=>a-b),positions=[],normals=[],uv=[],indices=[];
  for(let i=1;i<xs.length;i++)for(let j=1;j<ys.length;j++){const x=(xs[i]+xs[i-1])/2,y=(ys[j]+ys[j-1])/2;if(rectangles.some(b=>x>b[0]&&x<b[2]&&y>b[1]&&y<b[3]))continue;const g=thicknessM>1e-7?new T.BoxGeometry(xs[i]-xs[i-1],ys[j]-ys[j-1],thicknessM):new T.PlaneGeometry(xs[i]-xs[i-1],ys[j]-ys[j-1]);g.translate(x,y,0);const offset=positions.length/3;positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);uv.push(...g.attributes.uv.array);indices.push(...Array.from(g.index.array,i=>i+offset));g.dispose();}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);return g;
 }
 const shape=rectangle(widthM,heightM);for(const h of merged)shape.holes.push(holePath(h));
 const geometry=thicknessM>1e-7?new T.ExtrudeGeometry(shape,{depth:thicknessM,bevelEnabled:false,curveSegments:24}):new T.ShapeGeometry(shape,24);if(thicknessM>1e-7)geometry.translate(0,0,-thicknessM/2);return geometry;
}

// A developable U-loop outside the hinge envelope. Both end tangents follow
// the fitting axes. The rail moves smoothly to conserve its developed length;
// no shortest-route optimization changes sides during an animation.
// 'developed' solves the physical circular-fillet cut length. The compatibility
// default retains the rendered polygon length; perpendicular constant-angle
// loops then have a constant, separately reportable arc/chord deficit.
export function constantLengthHingeRoute(a,b,{outward,restLengthM,bendRadiusM=.08,lengthMetric='polyline'}={}){
 if(!['polyline','developed'].includes(lengthMetric))throw new Error('Unknown U-loop length metric: '+lengthMetric);
 const lengthField=lengthMetric==='developed'?'developedLengthM':'lengthM';
 const p=a.isVector3?a.clone():V(a),q=b.isVector3?b.clone():V(b),n=outward.isVector3?outward.clone().normalize():V(outward).normalize(),delta=q.clone().sub(p),axial=delta.dot(n);
 // Ports mounted on the same hinge-axis station keep the rail perpendicular.
 // A small real axial offset is retained, never erased by endpoint snapping.
 const middle=delta.length(),lead=Math.max(bendRadiusM*2.1,(restLengthM-middle+(4-Math.PI)*bendRadiusM)/2);
 let points=[p,p.clone().addScaledVector(n,lead),q.clone().addScaledVector(n,lead),q].map(x=>x.toArray());
 if(Math.abs(axial)>1e-6){let lo=bendRadiusM*2.1,hi=Math.max(restLengthM,lo);for(let i=0;i<28;i++){const x=(lo+hi)/2,pts=[p,p.clone().addScaledVector(n,x),q.clone().addScaledVector(n,x),q].map(v=>v.toArray());if(roundedConnectionRoute(pts,bendRadiusM)[lengthField]<restLengthM)lo=x;else hi=x;}const x=(lo+hi)/2;points=[p,p.clone().addScaledVector(n,x),q.clone().addScaledVector(n,x),q].map(v=>v.toArray());}
 else {let lo=Math.max(bendRadiusM*1.02,.001),hi=Math.max(restLengthM,lo);for(let i=0;i<28;i++){const x=(lo+hi)/2,pts=[p,p.clone().addScaledVector(n,x),q.clone().addScaledVector(n,x),q].map(v=>v.toArray());if(roundedConnectionRoute(pts,bendRadiusM)[lengthField]<restLengthM)lo=x;else hi=x;}const x=(lo+hi)/2;points=[p,p.clone().addScaledVector(n,x),q.clone().addScaledVector(n,x),q].map(v=>v.toArray());}
 return points;
}

export {bounds as routingHoleBounds};
