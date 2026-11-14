import {mechanismPose} from './deployment.js';
import {roundedConnectionRoute} from './connection-routes.js';

import {protectedFluidAllocation,protectedUnionOutletControls} from './protected-fluid-allocation.js';
const add=(a,b,k=1)=>a.map((x,i)=>x+k*b[i]);
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));

// Both ninety-degree turns use the same eight chords as the production pure
// fillet constructor. Their exact chord length closes the installed U length.
function restrainedU(a,b,outward){
 const f=protectedFluidAllocation,d=distance(a,b),arc=32*f.flexBendM*Math.sin(Math.PI/32),lead=(f.flexLengthM-d+4*f.flexBendM-arc)/2;
 if(Math.abs(a[0]-b[0])>1e-8||.49*d<f.flexBendM||.98*lead<f.flexBendM)throw Error('Protected fluid launch allocation cannot retain its specified bend and length');
 return roundedConnectionRoute([a,add(a,[outward,0,0],lead),add(b,[outward,0,0],lead),b],f.flexBendM).points;
}

/** Conservative capsule envelopes of the actual restrained fluid paths. */
export function protectedStowedFluidFeatures(layout){
 const f=protectedFluidAllocation,k=layout,pose=mechanismPose(k,0,0),features=[];
 if(k.custom)return features;
 const emit=(part,points,paddingM=f.pipeRadiusM+2e-6)=>features.push({part,points,paddingM});
 for(const bank of pose.banks){
  const end=bank.end,sign=-end,off=end*Math.max(k.hingeStand,f.minimumHeaderOffsetM),root=[0,sign*k.rootY,k.radRoot];
  const world=(j,p)=>{const a=bank.panelPitches[j],o=bank.panelRoots[j];return [o[0]+p[0],o[1]+Math.cos(a)*p[1]-Math.sin(a)*p[2],o[2]+Math.sin(a)*p[1]+Math.cos(a)*p[2]];};
  const rootPoint=p=>add(root,p),last=k.panelCount-1;
  for(const side of [-1,1]){
   const x=side*(k.rw/2+f.headerMarginM),ap=k.rw*f.rootClampWidthFraction,fixed=[side*(ap+f.pitchStatorOffsetM),0,0],moving=[side*(ap+f.pitchRotorOffsetM),0,f.pitchElbowZM],delivery=[side*f.rollDeliveryXM,0,f.rollDeliveryElbowZM];
   emit(`Root ${end}/${side} pitch-transfer stator`,[rootPoint(fixed)],Math.hypot(f.pitchTransferRadiusM,.025)+2e-6);
   emit(`Root ${end}/${side} pitch-transfer rotor`,[world(0,[moving[0],0,0])],Math.hypot(f.pitchTransferRadiusM,.025)+2e-6);
   const feedStart=[side*(k.w/2-.30),sign*(.052-f.rootStandOffM),-f.fixedFeedBackM],feedEnd=[fixed[0],0,f.pitchTransferPortZM];
   emit(`Root ${end}/${side} fixed bulkhead-to-transfer pipe`,roundedConnectionRoute([feedStart,[feedStart[0],0,feedStart[2]],[feedEnd[0],0,feedStart[2]],feedEnd],f.pipeBendM).points.map(rootPoint));
   emit(`Root ${end}/${side} coolant elbows`,[world(0,moving),world(0,delivery)],f.socketContainmentRadiusM);
   const neckStart=[moving[0],0,f.pitchTransferPortZM],neckEnd=add(moving,[0,0,f.socketHalfM]);
   emit(`Root ${end}/${side} pitch-transfer outlet neck`,[world(0,neckStart),world(0,neckEnd)]);
   const pipeStart=add(moving,[0,sign*f.socketHalfM,0]),stator=[side*f.unionPortXM,sign*f.unionPortYM,f.statorPortZM],rotor=[side*f.rollDeliveryXM,0,f.rollDeliveryPortZM];
   const inlet=[pipeStart,[pipeStart[0],sign*f.pitchPipeYM,pipeStart[2]],[stator[0],sign*f.pitchPipeYM,stator[2]],stator];
   emit(`Root ${end}/${side} pitch-union coolant pipe`,roundedConnectionRoute(inlet,f.pipeBendM).points.map(p=>world(0,p)));
   emit(`Root ${end}/${side} roll delivery neck`,[world(0,rotor),world(0,add(delivery,[0,0,-f.socketHalfM]))]);
   const headerEnd=[x,off,k.r-.40-f.socketHalfM],deliveryStart=add(delivery,[side*f.socketHalfM,0,0]),outlet=[deliveryStart,...protectedUnionOutletControls(deliveryStart,x,off,side,sign),headerEnd];
   emit(`Root ${end}/${side} roll-union coolant pipe`,roundedConnectionRoute(outlet,f.pipeBendM).points.map(p=>world(0,p)));
   for(let j=0;j<k.panelCount;j++){
    const exit=[x,off,k.r-.40];emit(`Leaf ${end}/${j}/${side} outlet fitting`,[world(j,exit)],f.socketContainmentRadiusM);
    if(j){const entry=[x,off,.16];emit(`Leaf ${end}/${j}/${side} inlet fitting`,[world(j,entry)],f.socketContainmentRadiusM);
     emit(`Leaf ${end}/${j}/${side} coolant header`,[world(j,add(entry,[0,0,f.socketHalfM])),world(j,add(exit,[0,0,-f.socketHalfM]))]);
     const from=world(j-1,[x+side*f.socketHalfM,off,k.r-.40]),to=world(j,[x+side*f.socketHalfM,off,.16]);
     emit(`Leaf ${end}/${j}/${side} restrained coolant hose`,restrainedU(from,to,side),f.flexRadiusM+2e-6);
    }
   }
  }
  const x=k.rw/2+f.returnOuterMarginM,y=off+end*f.returnStandOffM,z=k.r-f.returnTipInsetM,portX=k.rw/2+f.headerMarginM+f.socketHalfM;
  const start=[portX,off,k.r-.40],finish=[-portX,off,k.r-.40],controls=[start,[x,start[1],start[2]],[x,y,start[2]],[x,y,z],[-x,y,z],[-x,y,finish[2]],[-x,finish[1],finish[2]],finish];
  emit(`Bank ${end} restrained return manifold`,roundedConnectionRoute(controls,f.pipeBendM).points.map(p=>world(last,p)));
 }
 return features;
}
