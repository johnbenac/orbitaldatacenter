import {connectionAnchor} from './connection-geometry.js';
import {hollowFluidFitting} from './flight-fluid-routing.js';
import {declareRotaryFluidChannel} from './fluid-interface-allocation.js';

// A true transverse hinge transfer replaces a hose that otherwise sweeps
// through the folded panel. Both exterior tubes remain rigid on their own
// leaf. The internal drilled/sealed passage is an explicitly allocated
// component, with two real ports and open supplier performance evidence.
export function installRadiatorFluidTransfer({root,layout,previous,current,previousFrame,currentFrame,side,name,kit}={}){
 const {join,cyl,material,tubeMaterial,v}=kit,g=layout,stackSign=Math.sign(previous.normalOffset||previous.end),normalOffset=g.custom?previous.normalOffset:previous.end*g.hingeStand,pitch=g.r,gap=pitch-previous.depth,x=side*previous.width*.18,faceY=stackSign*.070,i=current.j;
 const pivotA=[x,(i%2===0?4*stackSign*g.hingeStand:0)-normalOffset,g.custom?pitch-previous.depth/2:g.r/2],pivotB=[x,-(g.custom?current.normalOffset:current.end*g.hingeStand),-(g.custom?current.depth:g.r)/2];
 const stator=join(previousFrame,...pivotA,'radiator'),rotor=join(currentFrame,...pivotB,'radiator');stator.name=name+' stator';rotor.name=name+' rotor';
 const bearing=connectionAnchor(stator,[side*.07,0,0],[side,0,0],name+' coaxial housing');hollowFluidFitting(bearing,{outerRadiusM:.065,boreRadiusM:.029,lengthM:.14,material,name:name+' open coaxial housing'});
 const collar=connectionAnchor(rotor,[side*.10,0,0],[side,0,0],name+' rotating collar');hollowFluidFitting(collar,{outerRadiusM:.027,boreRadiusM:.014,lengthM:.06,material,name:name+' bored rotating collar'});
 const fixedPosition=[x-side*.14,faceY,previous.depth/2+.05],movingPosition=[x+side*.14,faceY,-current.depth/2-.05];
 const fixed=connectionAnchor(previousFrame,fixedPosition,[side,0,0],name+' fixed inlet'),moving=connectionAnchor(currentFrame,movingPosition,[side,0,0],name+' rotating outlet');
 for(const [port,owner]of[[fixed,stator],[moving,rotor]]){port.userData.routingOwnerId=owner.uuid;port.userData.routingOwnerIds=[owner.uuid,port.uuid];hollowFluidFitting(port,{outerRadiusM:.026,boreRadiusM:.020,lengthM:.030,material:tubeMaterial,name:port.name+' open fitting'});}
 function neck(parent,a,b,label){const p=v(...a),q=v(...b),delta=q.clone().sub(p),mesh=cyl(parent,...p.clone().add(q).multiplyScalar(.5).toArray(),.024,.024,delta.length(),material,'radiator',16);mesh.quaternion.setFromUnitVectors(v(0,1,0),delta.normalize());mesh.name=label;}
 const fixedBack=fixedPosition.map((n,k)=>n-pivotA[k]-(k===0?side*.030:0)),movingBack=movingPosition.map((n,k)=>n-pivotB[k]-(k===0?side*.030:0));
 // The radial portion crosses the panel's face plane only inside the real
 // gap. The rotor's 50 mm setback and 195 mm normal offset stay inside the
 // independently reserved hinge region through the entire half-turn.
 const fixedAxis=[fixedBack[0],0,0],fixedElbow=[fixedBack[0],0,fixedBack[2]],movingAxis=[movingBack[0],0,0],movingElbow=[movingBack[0],0,movingBack[2]];
 for(const [parent,points,label]of[[stator,[[0,0,0],fixedAxis,fixedElbow,fixedBack],'stator'],[rotor,[[side*.04,0,0],movingAxis,movingElbow,movingBack],'rotor']])for(let j=1;j<points.length;j++)if(v(...points[j]).distanceTo(v(...points[j-1]))>1e-8)neck(parent,points[j-1],points[j],name+' '+label+' drilled neck '+j);
 const channel=declareRotaryFluidChannel(root,{componentId:stator.uuid,name,portIds:[fixed.uuid,moving.uuid],axes:1,bankEnd:current.end,hingeIndex:i,basis:'Coaxial X-axis transfer at the actual accordion pivot; separate exterior pipes terminate on the fixed and rotating fittings.'});
 channel.jointDatums={fixedId:stator.uuid,movingId:rotor.uuid,axis:[1,0,0],positionToleranceM:2e-5,axisToleranceRad:1e-5};
 return {fixed,moving,stator,rotor,channel,pivotA,pivotB};
}
