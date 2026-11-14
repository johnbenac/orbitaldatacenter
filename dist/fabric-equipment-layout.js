// Geometric allocations for the proposed cassette installation. These are
// project service-bay envelopes, not dimensions or qualification claims for
// a supplier switch chassis. Every actual panel, plug and lead is checked
// again after the complete connector population has been constructed.
export const fabricEquipmentPolicy=Object.freeze({panelWidthM:.34,panelHeightM:.30,caseDepthM:.24,sideGapM:.10,frontServiceReserveM:.54,rowGapM:.020,wallGapM:.012});

// The exposed Redwire computers connect sideways into supported platform
// raceways. A top-facing outlet would require a tall free-space return loop.
// These are project interface plates, not a change to the supplier connector
// envelope or the wire's bend requirement. Full plate volume is conservative:
// small connector/fastener holes are not credited as a mass reduction.
export const redwirePayloadInterfacePolicy=Object.freeze({plateThicknessM:.004,densityKgM3:2700,materialId:'aluminum-structure'});
export function redwirePayloadServiceFace(box,h){
 return h.architectureFamilyId==='redwire-platform'&&box.frame==='payload'&&box.id.startsWith('compute-')?(box.positionM[0]<0?'left':'right'):null;
}
export function redwirePayloadServicePlate(box,panel){
 const p=redwirePayloadInterfacePolicy,wbs='07.06.'+String(box.instance+1).padStart(2,'0'),dimensionsM=[...panel.dimensionsM],volumeM3=dimensionsM.reduce((n,x)=>n*x,1);
 return {id:'redwire:'+box.id+':service-plate',itemId:'flight:'+wbs,wbs,parentWbs:'07.06',label:box.label+' side service interface plate',owner:'payload-service-panel',frame:'payload',positionM:box.positionM.map((x,i)=>x+panel.positionM[i]),dimensionsM,materialPieces:[{dimensionsM:[...dimensionsM],positionM:[0,0,0]}],materialId:p.materialId,material:'Aluminum alloy plate',densityKgM3:p.densityKgM3,volumeM3,massKg:volumeM3*p.densityKgM3,wallThicknessM:p.plateThicknessM,quantity:1,basis:'Solid 4 mm aluminum service plate attached to the computer side face. Connector footprints and service clearance follow the selected interfaces; mounted platform raceways carry the external cables. Full plate volume is counted without subtracting small holes.'};
}

export function accommodateFabricRows(boxes,h){
 const fabric=boxes.filter(b=>b.id.startsWith('fabric-')),columns=Math.ceil(Math.sqrt(fabric.length)),rows=Math.ceil(fabric.length/columns);
 if(rows<=1)return {active:false,boxes:[]};
 const p=fabricEquipmentPolicy,dims=[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM],wallM=Math.max(.018,Math.min(...dims)*.024),inner=dims.map(d=>d/2-wallM-.0002),pitchX=p.panelWidthM+p.sideGapM,pitchZ=p.caseDepthM+p.frontServiceReserveM+p.rowGapM,firstZ=Math.min(...fabric.map(b=>b.positionM[2])),y=inner[1]-p.panelHeightM/2-p.wallGapM,allocations=[];
 for(const [i,box] of fabric.entries()){
  const column=i%columns,row=Math.floor(i/columns),position=[(column-(columns-1)/2)*pitchX,y,firstZ+row*pitchZ],bounds={min:[position[0]-p.panelWidthM/2,position[1]-p.panelHeightM/2,position[2]-p.caseDepthM/2],max:[position[0]+p.panelWidthM/2,position[1]+p.panelHeightM/2,position[2]+p.caseDepthM/2+p.frontServiceReserveM]},issues=[];
  for(let axis=0;axis<3;axis++)if(bounds.min[axis]<-inner[axis]+p.wallGapM-1e-9||bounds.max[axis]>inner[axis]-p.wallGapM+1e-9)issues.push({code:'fabric-bay-outside-wall',boxId:box.id,axis,bounds,innerHalfM:inner[axis]});
  for(const slot of h.rackLayout.slots){const half=h.rackLayout.slotDimensionsM.map(v=>v/2),rack={min:[slot.x-half[0],slot.y-half[1]-.0175,slot.z-half[2]],max:[slot.x+half[0],slot.y+half[1]+.0175,slot.z+half[2]]};if(bounds.min.every((v,k)=>v<rack.max[k]+p.wallGapM&&bounds.max[k]>rack.min[k]-p.wallGapM))issues.push({code:'fabric-bay-intersects-compute-allocation',boxId:box.id,slotIndex:slot.index});}
  const allocation={kind:'separated-fabric-bay',boxId:box.id,positionM:position,column,row,columns,rows,pitchXM:pitchX,pitchZM:pitchZ,bounds,policy:p,ok:issues.length===0,issues,basis:'Complete connector banks occupy separate overhead bays. Rows are separated along body Z, with the complete forward connector/service corridor retained. The original 85 mm Y row pitch cannot accommodate the packed front panels. Rendered positions and the existing equal-cassette mass-station distribution use this same allocation; no additional mass is created.'};
  box.positionM=position;box.routingAccommodation=allocation;box.accommodationBasis=allocation.basis;allocations.push(allocation);
 }
 return {active:true,boxes:allocations,ok:allocations.every(a=>a.ok)};
}

export function accommodateRackServiceControls(boxes,h,{thermal=true}={}){
 const junePump=thermal&&h.input?.referenceCenterId==='orbital-1-202606'&&h.input?.architectureFamily==='orbital-rack';
 if((h.rackLayout.installed<64&&!junePump)||h.payloadLocation==='radiator')return [];
 const dims=[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM],wallM=Math.max(.018,Math.min(...dims)*.024),inner=dims.map(d=>d/2-wallM-.0002),halfSlot=h.rackLayout.slotDimensionsM.map(v=>v/2),allocations=[];
 for(const box of boxes.filter(b=>h.rackLayout.installed>=64&&b.id==='deployment-control'||thermal&&b.id==='thermal-drive')){
  const hits=h.rackLayout.slots.filter(slot=>{const p=[slot.x,slot.y,slot.z];return box.positionM.every((v,k)=>v-box.dimensionsM[k]/2<p[k]+halfSlot[k]+.002&&v+box.dimensionsM[k]/2>p[k]-halfSlot[k]-.002);});
  if(!hits.length)continue;
  const originalPositionM=[...box.positionM],side=Math.sign(box.positionM[0])||1;box.positionM[0]=side*(inner[0]-box.dimensionsM[0]/2-.012);
  const allocation={kind:'rack-side-service-pocket',boxId:box.id,positionM:[...box.positionM],originalPositionM,displacedSlotIndices:hits.map(s=>s.index),wallGapM:.012,interfaceFace:box.id==='thermal-drive'?'back':undefined,ok:true,issues:[],basis:'The original controller envelope intersects occupied compute slots. Its actual enclosure moves into the side service pocket, with 12 mm enclosure-to-wall clearance. The high-current drive uses a tall rear-facing bank so its full connector approach follows the side aisle. Every material, neighboring component, plug stroke and cable lead still requires the installed accommodation guard.',massStationBasis:'The interface remains within the existing thermal or deployment electronics allocation. An independently measured controller mass split remains open; pump, hinge, radiator and complete subsystem mass stations are not reassigned to this interface.'};
  box.routingAccommodation=allocation;box.accommodationBasis=allocation.basis;allocations.push(allocation);
 }
 return allocations;
}
