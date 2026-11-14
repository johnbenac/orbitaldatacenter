import {architectureFamily} from './architecture-families.js';

// Existing fixed equipment envelopes used while placing a packed source bank.
// These are the authored rack/rod dimensions, not invented facility clearances.
// The installed actual-buffer accommodation guard independently checks them
// and every other physical object, so later drawing changes cannot inherit a
// pass from these planning envelopes.
export function fixedCollectorBodyKeepouts(h){
 const family=architectureFamily(h),legacy=family.id==='protected-core'&&family.kaTerminalCount===1&&family.sPatchCount===2,w=h.bodyWidthM,b=h.bodyHeightM,l=h.bodyLengthM,rack=h.rackLayout,scaleZ=legacy?h.propulsion.equipmentLengthM/l:1,offsetZ=legacy?h.propulsion.equipmentCenterZ:0;
 const box=(id,center,size,kind)=>({id,kind,min:center.map((x,k)=>k===2?offsetZ+(x-size[k]/2)*scaleZ:x-size[k]/2),max:center.map((x,k)=>k===2?offsetZ+(x+size[k]/2)*scaleZ:x+size[k]/2)}),slots=family.payloadLocation==='radiator'?[]:rack.slots.map(s=>box('rack-slot-'+s.index,[s.x,s.y,s.z],rack.slotDimensionsM,'occupied-rack-slot')),rails=[],rods=[];
 if(slots.length){const [tw,th,td]=rack.slotDimensionsM,railX=legacy?rack.columns*rack.pitchM[0]/2:Math.max(...rack.slots.map(s=>Math.abs(s.x)))+tw/2,railY=legacy?rack.rows*rack.pitchM[1]/2:Math.max(...rack.slots.map(s=>Math.abs(s.y)))+th/2,lo=legacy?rack.rackZ0M:Math.min(...rack.slots.map(s=>s.z))-td/2,hi=legacy?rack.rackZ1M:Math.max(...rack.slots.map(s=>s.z))+td/2;
  for(const side of[-1,1])for(const sign of[-1,1])rails.push(box('rack-rail-'+side+'/'+sign,[side*railX,sign*railY,(lo+hi)/2],[.035,.035,hi-lo],'rack-rail'));
 }
 for(let axis=0;axis<3;axis++){
  const center=legacy?[-w*.34+(axis===0?w*.11:0),b*.29,-l*.19+axis*l*.075]:[-w*.32,b*(axis===2?.40:.25),l*(axis-1)*.14],length=legacy?Math.min(w*.31,l*.18):Math.min(w*.28,l*.25),radius=legacy?Math.min(.17,Math.min(w,b)*.052)*.33*1.10:.025,size=[radius*2,radius*2,radius*2];size[axis]=length;rods.push(box('magnetic-rod-'+axis,center,size,'magnetic-rod'));
 }
 return {rack:[...slots,...rails],rods,basis:'Current fixed rack slots,35mm rack rails and three authored body-axis magnetic rods, transformed through the actual protected internal Z scale where present. The physical-buffer interference guard remains authoritative.'};
}
