// Project dimensions of the two-axis inline root transfer. The construction
// and carried collector placement share these numbers; the actual-buffer
// accommodation check independently verifies the resulting envelope.
export const inlineRootElectricalDimensions=Object.freeze({
 bearingRadiusM:.205,bearingBoreM:.174,bearingLengthM:.32,
 yawBearingY:.74,rollBearingZ:-.055,
 connectorPitchM:.065,connectorGapM:.020,connectorStrokeM:.045,
 rotorFirstXM:.25,rotorSecondXM:.33,rotorFirstYM:.40,rotorFirstZM:-.24,
 fixedPortXM:.18,channelRadiusM:.014,channelInsertionM:.045,
 fixedBankClearanceM:.075,contactPitchM:.008,collectorRadiusM:.164,
 collectorTubeRadiusM:.0025
});

export function inlineRootConnectorLayout({circuitCount,connectorDiameterM,connectorLengthM}){
 const d=inlineRootElectricalDimensions;
 if(!Number.isInteger(circuitCount)||circuitCount<1||![connectorDiameterM,connectorLengthM].every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid inline root connector envelope');
 const pitchM=Math.max(d.connectorPitchM,connectorDiameterM+d.connectorGapM),lastRow=Math.floor((circuitCount-1)/4),rotorNegativeYReachM=d.rotorSecondXM+connectorLengthM*.50+d.connectorStrokeM+connectorDiameterM/2,statorTopYM=-rotorNegativeYReachM-d.fixedBankClearanceM,statorBaseYM=statorTopYM-lastRow*pitchM;
 const statorOffsetCandidatesM=[-.30,...Array.from({length:20},(_,i)=>-.30+(i%2?1:-1)*Math.ceil((i+1)/2)*.05)];
 const ports=Array.from({length:circuitCount},(_,index)=>{const side=Math.floor(index/2)%2?1:-1,lane=Math.floor(index/4)*2+index%2,row=Math.floor(lane/2),column=(side<0?0:2)+lane%2;return {side,lane,row,column,statorYM:statorBaseYM+row*pitchM,rotorPositionM:[side*(lane%2?d.rotorSecondXM:d.rotorFirstXM),d.rotorFirstYM+row*pitchM,d.rotorFirstZM+(lane%2)*pitchM]};});
 // Every body/yaw/roll member rotates about the same bank-root datum. A
 // sphere containing all real primitive corners and complete plug strokes
 // therefore bounds its projection on the carried collector's transverse
 // axis throughout root deployment. Include every allowed gland station,
 // because the constructor chooses that station against actual frame rails.
 const contributors=[];
 const box=(name,center,half)=>{let radiusM=0;for(const x of[-1,1])for(const y of[-1,1])for(const z of[-1,1])radiusM=Math.max(radiusM,Math.hypot(...center.map((v,k)=>v+[x,y,z][k]*half[k])));contributors.push({name,radiusM});};
 const capsule=(name,a,b,radius)=>contributors.push({name,radiusM:Math.max(Math.hypot(...a),Math.hypot(...b))+radius});
 const port=(name,p,n)=>{const outer=connectorDiameterM/2,lo=-(.70*connectorLengthM),hi=d.connectorStrokeM;for(const t of[lo,hi])box(name,p.map((v,k)=>v+n[k]*t),n.map(v=>Math.abs(v)>.5?0:outer));};
 box('yaw bearing',[0,d.yawBearingY-d.bearingLengthM/2,0],[d.bearingRadiusM,d.bearingLengthM/2,d.bearingRadiusM]);
 box('roll bearing',[0,0,d.rollBearingZ-d.bearingLengthM/2],[d.bearingRadiusM,d.bearingRadiusM,d.bearingLengthM/2]);
 box('yaw carrier upright',[0,.30,.25],[.0175,.30,.0175]);box('roll carrier arm',[0,0,.025],[.0175,.0175,.24]);
 for(const p of ports){
  for(const station of statorOffsetCandidatesM){const fixed=[d.fixedPortXM,p.statorYM,station+p.column*pitchM];port('fixed port and complete stroke',fixed,[-1,0,0]);capsule('fixed channel',[0,fixed[1],0],[fixed[0]+d.channelInsertionM,fixed[1],fixed[2]],d.channelRadiusM);}
  const rotating=p.rotorPositionM;port('rotating port and complete stroke',rotating,[p.side,0,0]);capsule('rotating channel',[0,0,-.30],rotating.map((v,k)=>v-(k===0?p.side*d.channelInsertionM:0)),d.channelRadiusM);
 }
 const lastContact=(circuitCount-1)*d.contactPitchM/2;
 for(const station of[-lastContact,lastContact]){
  box('yaw contact and brush',[0,.58+station,0],[d.collectorRadiusM+.006,.007,d.collectorRadiusM+d.collectorTubeRadiusM]);
  box('roll contact and brush',[0,0,-.215+station],[d.collectorRadiusM+.006,d.collectorRadiusM+d.collectorTubeRadiusM,.0025]);
 }
 const maximumRadiusM=Math.max(...contributors.map(c=>c.radiusM))+2e-6;
 return {circuitCount,pitchM,lastRow,statorTopYM,statorBaseYM,statorOffsetCandidatesM,ports,maximumRadiusM,contributors,basis:'All allocated root-transfer primitive corners and both connector stroke extremes lie within this sphere about the actual common root. Fixed, yawing and rolling members preserve that radius under their full rotations. A plane outside this sphere is a whole-deployment root-hardware separation bound; actual mesh containment is checked independently.'};
}
