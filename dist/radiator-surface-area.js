import {redwirePayloadTransferPolicy} from './redwire-payload-transfer.js';

// The control specifies the gross rectangular platform. The real hinge relief
// removes material and both radiating faces while retaining the outer envelope.
export function redwireRootRelief(widthM,depthM){
 const width=Math.min(redwirePayloadTransferPolicy.rootReliefWidthM,Math.max(0,widthM-.04));
 const depth=Math.min(redwirePayloadTransferPolicy.rootReliefDepthM,Math.max(0,depthM-.04));
 return {widthM:width,depthM:depth,areaM2:width*depth,edge:'hinge',basis:'Actual root-edge opening for the 0.20 m rotary interface; dimensions are bounded by the remaining custom panel edges.'};
}
export function radiatorPanelNetArea(h,descriptor){
 const gross=Math.max(0,descriptor.width*descriptor.depth),relief=h.payloadPlatform?.rootRelief;
 return descriptor.type==='rad'&&h.architectureFamilyId==='redwire-platform'&&(descriptor.j??0)===0?Math.max(0,gross-(relief?.areaM2||0)):gross;
}
export function radiatorPanelFrontBlockedArea(h,descriptor){
 return descriptor.type==='rad'&&h.architectureFamilyId==='redwire-platform'&&(descriptor.j??0)===0?h.radiatorFrontBlockedAreaM2||0:0;
}
export function radiatorPanelMaterialRectangles(h,descriptor){
 const relief=h.payloadPlatform?.rootRelief;
 if(h.architectureFamilyId!=='redwire-platform'||descriptor.type!=='rad'||(descriptor.j??0)!==0||!relief?.areaM2)return [{widthM:descriptor.width,depthM:descriptor.depth,centerM:[0,0,0],areaM2:descriptor.width*descriptor.depth}];
 const sideWidth=(descriptor.width-relief.widthM)/2,rootZ=-descriptor.depth/2+relief.depthM/2;
 return [{widthM:descriptor.width,depthM:descriptor.depth-relief.depthM,centerM:[0,0,relief.depthM/2],areaM2:descriptor.width*(descriptor.depth-relief.depthM)},...[-1,1].map(side=>({widthM:sideWidth,depthM:relief.depthM,centerM:[side*(descriptor.width+relief.widthM)/4,0,rootZ],areaM2:sideWidth*relief.depthM}))].filter(piece=>piece.areaM2>0);
}
const intersection=(a,b)=>{const r=[Math.max(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[2],b[2]),Math.min(a[3],b[3])];return r[1]>r[0]&&r[3]>r[2]?r:null;};
function unionArea(rectangles){
 const xs=[...new Set(rectangles.flatMap(r=>r.slice(0,2)))].sort((a,b)=>a-b);let area=0;
 for(let i=1;i<xs.length;i++){
  const midpoint=(xs[i-1]+xs[i])/2,intervals=rectangles.filter(r=>r[0]<midpoint&&r[1]>midpoint).map(r=>r.slice(2)).sort((a,b)=>a[0]-b[0]);
  let covered=0,start=null,end=null;
  for(const interval of intervals){if(start===null){[start,end]=interval;}else if(interval[0]<=end)end=Math.max(end,interval[1]);else{covered+=end-start;[start,end]=interval;}}
  if(start!==null)covered+=end-start;area+=(xs[i]-xs[i-1])*covered;
 }
 return area;
}
function footprint(piece){
 const axes=piece.axes||[[1,0,0],[0,1,0],[0,0,1]],position=piece.shapePositionM||piece.positionM;
 const half=axis=>piece.shape==='annulus'||piece.shape==='cylinder'?Math.abs(axes[piece.axisIndex][axis])*piece.lengthM/2+piece.outerRadiusM*Math.sqrt(Math.max(0,1-axes[piece.axisIndex][axis]**2)):piece.dimensionsM.reduce((total,dimension,index)=>total+dimension*Math.abs(axes[index][axis])/2,0);
 const x=half(0),z=half(2);return [position[0]-x,position[0]+x,position[2]-z,position[2]+z];
}
export function updateRedwireRadiatorExposure(h,graph){
 if(h.architectureFamilyId!=='redwire-platform')return;
 const width=h.radiatorWidthM,depth=h.radiatorLengthM,bounds=[-width/2,width/2,-depth/2,depth/2],relief=h.payloadPlatform?.rootRelief||redwireRootRelief(width,depth);
 const opening=[-relief.widthM/2,relief.widthM/2,-depth/2,-depth/2+relief.depthM];
 const rectangles=[],add=rectangle=>{const clipped=intersection(rectangle,bounds);if(clipped)rectangles.push(clipped);};
 const spreader=h.payloadPlatform||{};add([-(spreader.spreaderWidthM||1)/2,(spreader.spreaderWidthM||1)/2,-(spreader.spreaderDepthM||1)/2,(spreader.spreaderDepthM||1)/2]);
 for(const box of graph.boxes.filter(box=>box.frame==='payload'))add([box.positionM[0]-box.dimensionsM[0]/2,box.positionM[0]+box.dimensionsM[0]/2,box.positionM[2]-box.dimensionsM[2]/2,box.positionM[2]+box.dimensionsM[2]/2]);
 for(const part of h.cableInstallationHardware?.parts||[])if(part.frame==='payload')for(const piece of part.pieces)if(piece.occlusion!=='contained')add(footprint(piece));
 let mountedCableCount=0,cableSegmentCount=0;
 for(const harness of graph.harnesses||[]){
  const points=harness.nominalLocalRoutePointsM;if(harness.nominalLocalRouteFrame!=='payloadRack'||!points?.length)continue;
  mountedCableCount++;const radius=harness.cableDiameterM/2;
  for(let index=1;index<points.length;index++){
   const a=points[index-1],b=points[index];add([Math.min(a[0],b[0])-radius,Math.max(a[0],b[0])+radius,Math.min(a[2],b[2])-radius,Math.max(a[2],b[2])+radius]);cableSegmentCount++;
  }
 }
 const inOpening=rectangles.map(rectangle=>intersection(rectangle,opening)).filter(Boolean),blocked=Math.max(0,Math.min(h.radiatorM2,unionArea(rectangles)-unionArea(inOpening)));
 h.radiatorFrontBlockedAreaM2=blocked;h.radiatorFrontOpenAreaM2=Math.max(0,h.radiatorM2-blocked);
 h.radiatorEmissionAreaM2=h.radiatorM2+h.radiatorFrontOpenAreaM2;
 h.radiatorSurfaceAccounting={grossPlanformM2:h.radiatorGrossM2??width*depth,reliefM2:relief.areaM2,netPlanformM2:h.radiatorM2,frontBlockedAreaM2:blocked,frontOpenAreaM2:h.radiatorFrontOpenAreaM2,backOpenAreaM2:h.radiatorM2,emissionAreaM2:h.radiatorEmissionAreaM2,projectedFootprints:rectangles.length,mountedCableCount,cableSegmentCount,basis:'Union of opaque front-face footprints from the spreader, payload equipment, service plates, actual ladder/retainer material, and finite-radius projected segments of the shared nominal mounted cable paths. Overlapping footprints and the root opening are counted once. Segment bounding rectangles conservatively cover cable-jacket projection. Covered radiator face receives no emission credit; thermal reradiation from installation hardware is not credited. Absorbed environmental heat retains the full net panel footprint as a conservative allocation for the panel and attached hardware. This is a preliminary normal-projection screen, not detailed angle-dependent shadowing or a thermal view-factor solution.'};
}
