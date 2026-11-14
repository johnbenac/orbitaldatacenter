import * as T from './vendor/three.module.js';
import {launchClockFor} from './launch-effects-state.js';
import {DEPLOY_START_S} from './commissioning-clock.js';

const clamp=x=>Math.max(0,Math.min(1,x));

// The viewport and geometric CI must place the live, fully wired spacecraft
// with the same transform. The launcher carries a reference drawing as well;
// that drawing never substitutes for this actual spacecraft installation.
export function positionLiveCraft(group,{view='launch',launch,launchFrame,state,hardware,fitHalfHeight=null}={}){
 if(!group?.isObject3D||!state||!hardware)throw new Error('Live craft placement requires the actual group, state and sized hardware');
 group.position.set(0,0,0);group.quaternion.identity();
 const packing=view==='launch'&&launchFrame&&!launchFrame.directCraft&&!launchFrame.reference;
 let handoffFraction=0;
 if(packing){
  const mount=launch?.parts?.liveMount;
  if(!mount)throw new Error('Live craft placement is missing the launcher attachment datum');
  launch.root.updateMatrixWorld(true);mount.getWorldPosition(group.position);mount.getWorldQuaternion(group.quaternion);
  if((launchFrame.phase||state.flightPhase)==='insertion'&&hardware.input.launcher!=='starship'){
   const clear=launchClockFor(hardware.input.launcher).releaseClear,k=clamp(((launchFrame.geometryTime??state.t)-clear)/(DEPLOY_START_S-clear));
   handoffFraction=k*k*(3-2*k);group.position.multiplyScalar(1-handoffFraction);group.quaternion.slerp(new T.Quaternion(),handoffFraction);
   launchFrame.center.lerp(new T.Vector3(),handoffFraction);
   if(fitHalfHeight!==null){if(!Number.isFinite(fitHalfHeight)||fitHalfHeight<=0)throw new Error('Invalid live-craft camera fit');launchFrame.half+=handoffFraction*(fitHalfHeight-launchFrame.half);}
  }
 }
 group.visible=view!=='orbit'&&(view!=='launch'||!launchFrame?.reference&&!launchFrame?.cargoHeld);
 group.updateMatrixWorld(true);
 return {packing:!!packing,handoffFraction,visible:group.visible,position:group.position.toArray(),quaternion:group.quaternion.toArray()};
}
