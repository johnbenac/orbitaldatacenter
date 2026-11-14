// Protected-core recorder accommodation in body metres. This allocation uses
// the complete retained drawing (rails and front controls as well as sleds).
// It consumes empty compute bays; it never creates capacity or shrinks hardware.
export function protectedStorageAccommodation(g,input=g.input||{},propulsion=g.propulsion){
 const w=g.bodyWidthM,h=g.bodyHeightM,l=g.bodyLengthM,rack=g.rackLayout,p=propulsion;
 const beam=Math.min(.17,Math.min(w,h)*.052),modules=Math.max(1,Math.ceil(input.storageTB/input.diskModuleTB)),shown=Math.min(12,modules),driveStep=Math.min(h*.145,h*.66/shown),rackHeight=driveStep*shown,scaleZ=p.equipmentLengthM/l;
 const localMin=[-.2775*w,-(rackHeight+beam*.55)/2,-.074*p.equipmentLengthM-beam*.06*scaleZ],localMax=[.2775*w,(rackHeight+beam*.55)/2,.0685*p.equipmentLengthM];
 const envelopeM={min:localMin,max:localMax,size:localMin.map((x,i)=>localMax[i]-x)},occupiedEnd=Math.max(rack.rackZ0M,...rack.slots.map(s=>s.z+rack.slotDimensionsM[2]/2)),serviceGapM=.10;
 const positionM=[0,0,occupiedEnd+serviceGapM-localMin[2]],min=localMin.map((x,i)=>x+positionM[i]),max=localMax.map((x,i)=>x+positionM[i]);
 const railInnerX=rack.columns*rack.pitchM[0]/2-.025/2,roofInnerY=rack.rows*rack.pitchM[1]/2-.035/2,railGapM=railInnerX-localMax[0],roofGapM=roofInnerY-localMax[1],longitudinalMarginM=rack.rackZ1M-max[2],issues=[];
 if(railGapM<.005)issues.push({code:'storage-rack-upright-clearance',marginM:railGapM,requiredM:.005});
 if(roofGapM<.005)issues.push({code:'storage-rack-roof-clearance',marginM:roofGapM,requiredM:.005});
 if(longitudinalMarginM<.005)issues.push({code:'storage-bay-unavailable',requiredEndM:max[2]+.005,availableEndM:rack.rackZ1M,message:'The complete recorder does not fit behind the installed compute trays. More equipment volume or an independently checked allocation is required.'});
 if(modules>shown)issues.push({code:'storage-module-realization-incomplete',installedModules:modules,renderedModules:shown,message:'The retained recorder drawing supports at most twelve discrete drive sleds.'});
 const occupiedBays=new Set(rack.slots.map(s=>s.bay)),reservedBays=[];
 for(let bay=0;bay<rack.bays;bay++){
  const z0=rack.rackZ0M+bay*rack.pitchM[2],z1=z0+rack.pitchM[2];
  if(z1>min[2]-serviceGapM+1e-9&&z0<max[2]+serviceGapM-1e-9&&!occupiedBays.has(bay))reservedBays.push(bay);
 }
 const physicalComputeCapacity=rack.physicalCapacity??rack.capacity,reservedComputeSlots=reservedBays.length*rack.columns*rack.rows,availableComputeCapacity=Math.max(0,physicalComputeCapacity-reservedComputeSlots);
 return {ok:issues.length===0,positionM,envelopeM,boundsM:{min,max},modules,shownModules:shown,serviceGapM,railGapM,roofGapM,longitudinalMarginM,reservedBays,reservedComputeSlots,physicalComputeCapacity,availableComputeCapacity,issues,basis:'Project allocation: the complete existing storage sleds, rails and front controls occupy a centered bay after the actually installed compute trays, separated by 100 mm. The reserved empty longitudinal bays are removed from available compute capacity. All dimensions remain those of the retained hardware; no supplier capability or full-rack accommodation is inferred.'};
}
