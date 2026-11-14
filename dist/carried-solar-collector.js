import {deploymentLayout} from './deployment.js';
import {familyAppendageDimensions as D} from './family-appendage-dimensions.js';
import {inlineRootConnectorLayout} from './inline-root-electrical-dimensions.js';

export function carriedCollectorPackingLimits(h,{clearanceM=D.carriedCollectorClearanceM}={}){
 if(!(Number.isFinite(clearanceM)&&clearanceM>0))throw Error('Invalid carried collector clearance');
 const layout=deploymentLayout(h),contacts=2*h.energySystem.electrical.mppt.jointCircuitsPerWing,contactInboardM=(contacts-1)*D.solarContactAxialPitchM/2+D.solarContactTubeRadiusM,maximumSolarInboardM=Math.max(layout.packedRollM+D.solarReelDiscRadialOverhangM,D.solarRootAxialHalfM,contactInboardM),lastLeafEndM=-layout.solarTipGapM+layout.foldedTipReachM,maximumBankX=-maximumSolarInboardM-clearanceM,minimumBankX=lastLeafEndM+clearanceM;
 return {clearanceM,maximumSolarInboardM,contactInboardM,lastLeafEndM,minimumBankX,maximumBankX,availableAxialWidthM:maximumBankX-minimumBankX,tipGapM:layout.solarTipGapM,packedReelRadiusM:layout.packedRollM,source:'Actual family root support, reel-disc radial overhang, contact-stack pitch and radiator tip-cap dimensions; solar payout is outward and tracking preserves the span-axis projection.'};
}

// Keep the packed outlet in the existing root gap. Choosing a tall bank uses
// the same contact count and root-transfer component; it does not bridge the
// swept blanket with an invented free cable or extra rotary joint.
export function accommodateCarriedSolarCollectors(graph,h,connectorSelections){
 const reports=[];
 for(const box of graph.boxes.filter(b=>b.frame==='solar-root'&&b.deploymentMotion)){
  const limits=carriedCollectorPackingLimits(h),layout=deploymentLayout(h),nominal=box.carriedNominalPositionM||[...box.positionM];box.carriedNominalPositionM=[...nominal];const vertices=[],ports=[],types=[];
  const addBox=(center,size)=>{for(const x of[-1,1])for(const y of[-1,1])for(const z of[-1,1])vertices.push(center.map((v,k)=>v+[x,y,z][k]*size[k]/2));};
  addBox([0,0,0],box.dimensionsM);for(const panel of box.connectorPanels||[])addBox(panel.positionM,panel.dimensionsM);
  for(const port of graph.ports.filter(p=>p.boxId===box.id)){
   const type=connectorSelections[port.connectorTypeId],single=port.connectorTypeId.startsWith('hv-single'),harness=graph.harnesses.find(a=>a.fromPortId===port.id||a.toPortId===port.id),approachM=(harness?.bendRadiusM||.035)*2.4+.06;types.push(type);
   if(port.face!=='front'||port.normal.some((v,k)=>Math.abs(v-[0,0,1][k])>1e-10))throw Error('Carried collector requires its declared front-face terminal packing');
   for(let instance=0;instance<port.quantity;instance++)for(const polarity of single?[-1,1]:[0]){
    const offset=port.instanceOffsetsM?.[instance]||[0,0,0],p=port.positionM.map((v,k)=>v+offset[k]+(k===1?polarity*type.diameterM*.62:0)),depth=.018+.92*type.lengthM+.045+approachM;
    addBox([p[0],p[1],p[2]+(depth-.012)/2],[type.diameterM,type.diameterM,depth+.012]);ports.push({portId:port.id,instance,polarity});
   }
  }
  const rootTransfer=inlineRootConnectorLayout({circuitCount:ports.length,connectorDiameterM:Math.max(...types.map(t=>t.diameterM)),connectorLengthM:Math.max(...types.map(t=>t.lengthM))}),before={min:[0,1,2].map(k=>Math.min(...vertices.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...vertices.map(p=>p[k])))},foldedFluidNormalMaxM=4*layout.hingeStand*(layout.panelCount/2-1)-(D.inlineRootFluidOutletYM-layout.hingeStand)+D.inlineRootFluidManifoldHalfYM,position=[limits.maximumBankX-before.max[0],Math.max(nominal[1],foldedFluidNormalMaxM+limits.clearanceM-before.min[1]),Math.max(nominal[2],rootTransfer.maximumRadiusM+limits.clearanceM-before.min[2])],bounds={min:before.min.map((v,k)=>v+position[k]),max:before.max.map((v,k)=>v+position[k])},solarGapM=-limits.maximumSolarInboardM-bounds.max[0],radiatorGapM=bounds.min[0]-limits.lastLeafEndM,issues=[];
  if(!vertices.every(p=>p.every(Number.isFinite))||!position.every(Number.isFinite)||!Number.isFinite(limits.availableAxialWidthM))issues.push({code:'invalid-carried-collector-envelope',boxId:box.id});
  if(!(limits.availableAxialWidthM>0)||solarGapM+1e-9<limits.clearanceM||radiatorGapM+1e-9<limits.clearanceM)issues.push({code:'carried-collector-outside-root-gap',boxId:box.id,bounds,limits,solarGapM,radiatorGapM});
  box.positionM=position;const report={boxId:box.id,itemId:box.itemId,ok:issues.length===0,issues,positionM:[...position],nominalPositionM:[...nominal],physicalConnectorCount:ports.length,packedPanels:(box.connectorPanels||[]).map(p=>({id:p.id,dimensionsM:[...p.dimensionsM]})),bounds,limits,rootTransferKeepout:{radiusM:rootTransfer.maximumRadiusM,contributors:rootTransfer.contributors,basis:rootTransfer.basis},foldedFluidNormalMaxM,minimumAxialGapM:Math.min(solarGapM,radiatorGapM),solarGapM,radiatorGapM,qualificationStatus:'Existing allocated multi-circuit root transfer; supplier internal conductor, insulation, contact-loss and life evidence remains open.',basis:'Complete packed panel, every polarity flange, full45mm plug withdrawal and each cable approach fit between the maximum inboard reel/contact sweep and the real last-leaf tip cap. The bank is also outside a root-centered sphere containing every two-axis root-transfer member and complete plug stroke. Its stowed normal station clears the actual root coolant manifold. The packing retains every connector and the original tracking range. Other equipment and every routed cable remain subject to the actual-buffer and continuous-motion gates.'};box.collectorAccommodation=report;reports.push(report);
  for(const p of graph.packing||[])if(p.boxId===box.id){p.withinAllocatedEnvelope=p.withinAllocatedEnvelope&&report.ok;p.collectorAccommodation=box.id;}
 }
 graph.carriedCollectorAccommodations=reports;return reports;
}
