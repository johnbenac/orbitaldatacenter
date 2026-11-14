import * as T from './vendor/three.module.js';
import {routingMatrix} from './routing-audit.js';

const V=p=>new T.Vector3(...(p||[0,0,0]));
export const routingPointInFrame=(object,point,frame)=>V(point).applyMatrix4(routingMatrix(object,frame)).toArray();
export const routingDirectionInFrame=(object,direction,frame)=>V(direction).transformDirection(routingMatrix(object,frame)).toArray();

// A contact volume is a physical local box. Keep its three face normals
// through a rigid coordinate change; using its enclosing AABB would permit
// a line to enter the extra corners created by that coordinate change.
export function routingContactBox(object,{id,routeIds,position=[0,0,0],halfSizeM},frame){
 const matrix=routingMatrix(object,frame),e=matrix.elements,axes=[[e[0],e[1],e[2]],[e[4],e[5],e[6]],[e[8],e[9],e[10]]].map(a=>V(a).normalize().toArray()),halfSize=Array.isArray(halfSizeM)?[...halfSizeM]:[halfSizeM,halfSizeM,halfSizeM];
 if(!halfSize.every(v=>Number.isFinite(v)&&v>0)||axes.some((a,i)=>Math.abs(Math.hypot(...a)-1)>1e-7||axes.some((b,j)=>i!==j&&Math.abs(a.reduce((s,v,k)=>s+v*b[k],0))>1e-7)))throw new Error('Contact box requires finite orthogonal physical axes: '+id);
 return {id,routeIds:[...routeIds],center:V(position).applyMatrix4(matrix).toArray(),axes,halfSize};
}
