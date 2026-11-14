import * as T from './vendor/three.module.js';
import {routingMatrix} from './routing-audit.js';
import {routingContactBox} from './routing-frame.js';

// Capture each physical shell's bore datum at the installed, mated pose.
// The cable exit belongs to the removable plug. Reading its current position
// on every snapshot would incorrectly move the fixed receptacle's opening.
// A local datum follows only the solid that actually owns that opening.
export function createConnectorBoreDatums(){
 const shells=new WeakMap();
 function localPoint(mesh,scopeId,installedCableExit){
  mesh.updateWorldMatrix(true,false);installedCableExit.updateWorldMatrix(true,false);
  let scopes=shells.get(mesh);if(!scopes){scopes=new Map();shells.set(mesh,scopes);}
  if(!scopes.has(scopeId)){
   const point=mesh.worldToLocal(installedCableExit.getWorldPosition(new T.Vector3()));
   if(!point.toArray().every(Number.isFinite))throw Error('Nonfinite installed connector bore datum: '+scopeId);
   scopes.set(scopeId,point.clone());
  }
  return scopes.get(scopeId);
 }
 function borePoint(mesh,scopeId,installedCableExit,frame=null){
  const point=localPoint(mesh,scopeId,installedCableExit).clone().applyMatrix4(routingMatrix(mesh,frame));
  if(!point.toArray().every(Number.isFinite))throw Error('Nonfinite transformed connector bore datum: '+scopeId);
  return point.toArray();
 }
 borePoint.contactBox=(mesh,scopeId,installedCableExit,{id=scopeId,routeIds=[scopeId],halfSizeM,frame=null}={})=>routingContactBox(mesh,{id,routeIds,position:localPoint(mesh,scopeId,installedCableExit).toArray(),halfSizeM},frame);
 return borePoint;
}
