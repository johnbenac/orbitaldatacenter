import {roundedConnectionRoute} from './connection-routes.js';

// Explicit project allocation for the stationary part of the carried solar
// collector. It retains the original contact stage and all output circuits.
// These are continuously formed, individually insulated copper members;
// supplier voltage, thermal, process and life qualification remains open.
export const inlineCollectorMaterial=Object.freeze({
 conductorAreaMM2:53.5,copperResistivityOhmM:2.10e-8,
 copperDensityKgM3:8960,insulationThicknessM:.001,
 insulationDensityKgM3:1420,formedBendRadiusM:.025,
 conductorGapM:.002,trackRadiusM:.089,brushEndRadiusM:.103,
 trackPitchM:.014,lanePitchM:.016,radialLaneGapM:.060,
 panelWallM:.003,housingDensityKgM3:2700,
 sourceIds:['el-project','el-wire'],
 basis:'Continuous formed copper with the same 53.5 mm² section as the selected 1/0 AWG source termination; hot-copper resistivity and density use the existing harness material allocation. A 1 mm individual insulation wall and 25 mm formed centreline bend are project dimensions, not qualified supplier capability.'
});

// H12-R1 is deliberately unhooked. H14 must apply this complete placement
// contract, including the source enclosure displacement, when it installs it.
export const inlineCollectorR1=Object.freeze({
 candidateId:'r1',nativeSourcePositionM:Object.freeze([-.36727613979521917,.21632000000000015,1.3798122711875882]),
 inputPlacementState:'native',outputPlacementState:'r1-installed',repeatPlacementPolicy:'reject',stationStartXM:.340,stationPitchM:.014,returnYM:-.235,
 crossoverStartZM:1.320,sourceOutletOffsetM:Object.freeze([0,0,.360]),
 brushTerminalYM:-.103,brushWidthM:.009,trackInnerRadiusM:.086,
 trackOuterRadiusM:.092,trackAngularSegments:128,brushHalfSteps:2,
 bareBrushLengthM:.005,bareTerminalLengthM:.005,
 basis:'One declared 32-conductor stowed component hypothesis. Source outlet displacement and track repack are part of the reusable construction; no production caller is added.'
});

export function trimCollectorPolyline(points,startM,endM){
 const trim=(input,length)=>{const out=input.map(p=>[...p]);while(out.length>1&&length>0){const a=out[0],b=out[1],n=Math.hypot(...b.map((x,k)=>x-a[k]));if(n<=length){out.shift();length-=n;}else{out[0]=a.map((x,k)=>x+(b[k]-x)*length/n);length=0;}}if(length>1e-9||out.length<2)throw Error('Collector jacket trim exceeds its conductor');return out;};
 return trim(trim(points,startM).reverse(),endM).reverse();
}

export function inlineCollectorEnvelope(conductorCount){
 if(!Number.isInteger(conductorCount)||conductorCount<2||conductorCount%2)throw Error('A carried collector requires paired positive/return conductors');
 const d=inlineCollectorMaterial,rows=Math.ceil(conductorCount/2),copperRadiusM=Math.sqrt(d.conductorAreaMM2*1e-6/Math.PI),outerRadiusM=copperRadiusM+d.insulationThicknessM;
 const laneHalfHeightM=(rows-1)*d.lanePitchM/2,innerLaneRadiusM=Math.max(.175,laneHalfHeightM+.055),outerLaneRadiusM=innerLaneRadiusM+d.radialLaneGapM,trackHalfLengthM=(conductorCount-1)*d.trackPitchM/2;
 const radialEnvelopeM=outerLaneRadiusM+outerRadiusM+.020,blanketStandOffM=radialEnvelopeM+.05+.025,axialEnvelopeM=trackHalfLengthM+.060;
 return {conductorCount,rows,copperRadiusM,outerRadiusM,laneHalfHeightM,innerLaneRadiusM,outerLaneRadiusM,trackHalfLengthM,radialEnvelopeM,blanketStandOffM,axialEnvelopeM,trackPitchM:d.trackPitchM,lanePitchM:d.lanePitchM};
}

export function collectorFanoutLengthM({port,connectorType,positionM}){
 const d=inlineCollectorMaterial,ys=[];
 for(let i=0;i<port.quantity;i++)for(const polarity of[-1,1])ys.push(positionM[1]+port.positionM[1]+port.instanceOffsetsM[i][1]+polarity*connectorType.diameterM*.62);
 const distinct=[...new Set(ys)].sort((a,b)=>a-b),half=(distinct.length-1)*d.lanePitchM/2,maximumRiseM=Math.max(...distinct.map((y,i)=>Math.abs(y-(-half+i*d.lanePitchM))));
 // With slope <=.6 the16 mm launch lanes retain at least13.7 mm
 // perpendicular separation, before the individual circular fillets are
 // checked against every neighboring conductor by the component audit.
 return Math.ceil((maximumRiseM/.6+.10)*100)/100;
}

export function collectorConductorLayout({harnessId,box,port,connectorType,quantity,wireAreaMM2}){
 const d=inlineCollectorMaterial,single=port.connectorTypeId.startsWith('hv-single');
 if(harnessId!=='P-SA-1'||box.id!=='solar-root-1'||port.id!=='P-SA-1:from'||quantity!==16)throw Error('R1 layout is declared only for the32-conductor solar-root-1 bank');
 if(box.collectorPlacementState==='r1-installed'||!box.positionM?.every((x,k)=>Math.abs(x-inlineCollectorR1.nativeSourcePositionM[k])<1e-9))throw Error('R1 layout requires its native source position; already displaced or unknown placement is rejected');
 if(!single)throw Error('The carried collector allocation requires individually separated polarity source receptacles');
 if(!(Number.isFinite(wireAreaMM2)&&wireAreaMM2>0&&wireAreaMM2<=d.conductorAreaMM2))throw Error('Selected conductor exceeds the allocated collector copper section');
 const count=quantity*2,copperRadiusM=Math.sqrt(d.conductorAreaMM2*1e-6/Math.PI),envelope={conductorCount:count,rows:quantity,copperRadiusM,outerRadiusM:copperRadiusM+d.insulationThicknessM,trackPitchM:inlineCollectorR1.stationPitchM},ends=[];
 for(let instance=0;instance<quantity;instance++)for(const polarity of[-1,1]){
  const offset=port.instanceOffsetsM[instance],point=port.positionM.map((x,k)=>box.positionM[k]+x+offset[k]+(k===1?polarity*connectorType.diameterM*.62:0));
  ends.push({id:harnessId+'/'+(instance*2+(polarity>0?1:0))+'/collector',sourceCircuitId:harnessId+'/'+(instance*2+(polarity>0?1:0)),instance,polarity,point});
 }
 const xs=[...new Set(ends.map(p=>p.point[0]))].sort((a,b)=>a-b);if(xs.length!==2)throw Error('Carried collector requires its declared two-column outlet packing');
 const columns=xs.map(x=>ends.filter(p=>Math.abs(p.point[0]-x)<1e-8).sort((a,b)=>b.point[1]-a.point[1]));
 if(columns.some(c=>c.length!==envelope.rows))throw Error('Unequal carried collector column packing');
 const placement=inlineCollectorR1,records=[];
 for(let column=0;column<2;column++)for(const [row,end]of columns[column].entries()){
  const trackIndex=column*envelope.rows+row,trackX=placement.stationStartXM+trackIndex*placement.stationPitchM,crossoverZ=placement.crossoverStartZM+trackIndex*placement.stationPitchM,radial=[0,-1,0],point=end.point.map((x,k)=>x+placement.sourceOutletOffsetM[k]);
  const from=[trackX,placement.brushTerminalYM,0],to=[point[0],point[1],point[2]-.010],controls=[from,[trackX,placement.returnYM,0],[trackX,placement.returnYM,crossoverZ],[point[0],placement.returnYM,crossoverZ],[point[0],point[1],crossoverZ],to],shape=roundedConnectionRoute(controls,d.formedBendRadiusM);
  const jacketPoints=trimCollectorPolyline(shape.points,placement.bareBrushLengthM,placement.bareTerminalLengthM),jacketLengthM=shape.developedLengthM-placement.bareBrushLengthM-placement.bareTerminalLengthM;
  const developedLengthM=shape.developedLengthM,copperMassKg=developedLengthM*d.conductorAreaMM2*1e-6*d.copperDensityKgM3,insulationMassKg=developedLengthM*Math.PI*(envelope.outerRadiusM**2-envelope.copperRadiusM**2)*d.insulationDensityKgM3,resistanceOhm=d.copperResistivityOhmM*developedLengthM/(d.conductorAreaMM2*1e-6);
  records.push({...end,point,originalOutletPoint:[...end.point],harnessId,boxId:box.id,componentId:box.id+':stationary-collector',column,row,trackIndex,trackX,crossoverZ,radial,from,to,controlPoints:controls,points:shape.points,jacketPoints,jacketLengthM,minimumBendRadiusM:shape.minimumBendRadiusM,bendLimited:shape.bendLimited,developedLengthM,renderedLengthM:shape.lengthM,sectionAreaMM2:d.conductorAreaMM2,copperRadiusM:envelope.copperRadiusM,outerRadiusM:envelope.outerRadiusM,insulationThicknessM:d.insulationThicknessM,copperMassKg,insulationMassKg:insulationMassKg*jacketLengthM/developedLengthM,resistanceOhm,material:'Copper with individually modeled insulation',additionalMatedContacts:0,additionalSlidingContacts:0,sourceIds:[...d.sourceIds]});
 }
 records.sort((a,b)=>a.instance-b.instance||a.polarity-b.polarity);
 const allPoints=records.flatMap(r=>r.points);envelope.actualConductorBoundsM={min:[0,1,2].map(k=>Math.min(...allPoints.map(p=>p[k]))-envelope.outerRadiusM),max:[0,1,2].map(k=>Math.max(...allPoints.map(p=>p[k]))+envelope.outerRadiusM)};envelope.boundsBasis='Conservative union of the actual R1 conductor polylines expanded by the complete insulated radius; contact and support hardware are separately retained actual meshes.';
 return {componentId:box.id+':stationary-collector',boxId:box.id,harnessId,envelope,placement:{...placement,sourceNativePositionM:[...box.positionM],sourceInstalledPositionM:box.positionM.map((x,k)=>x+placement.sourceOutletOffsetM[k])},records,totalDevelopedLengthM:records.reduce((n,r)=>n+r.developedLengthM,0),totalCopperMassKg:records.reduce((n,r)=>n+r.copperMassKg,0),totalInsulationMassKg:records.reduce((n,r)=>n+r.insulationMassKg,0),basis:d.basis,qualificationStatus:'Supplier insulation, formed conductor process, current/temperature, contact and life evidence remains open.'};
}

export function declareCarriedCollectorConduction(graph,connectorTypes){
 graph.componentInternalConductors=[];graph.collectorConduction=[];
 for(const a of graph.harnesses.filter(a=>a.rootTransfer)){
  const box=graph.boxById[a.fromBoxId],port=graph.portById[a.fromPortId],type=connectorTypes?.[a.connectorTypeId];
  // Type dimensions are passed explicitly by the architecture entry point.
  if(!type)throw Error('Missing collector source connector dimensions');
  const allocation=collectorConductorLayout({harnessId:a.id,box,port,connectorType:type,quantity:a.quantity,wireAreaMM2:a.wire.areaMM2});box.collectorConduction=allocation;a.internalCollector=allocation;
  a.internalCollectorResistanceOhm=Math.max(...Array.from({length:a.quantity},(_,i)=>allocation.records.filter(r=>r.instance===i).reduce((n,r)=>n+r.resistanceOhm,0)));
  a.estimatedInternalCollectorKg=(allocation.totalCopperMassKg+allocation.totalInsulationMassKg)/a.quantity;
  graph.componentInternalConductors.push(...allocation.records);graph.collectorConduction.push(allocation);
 }
 return graph.collectorConduction;
}
