// Shared physical datums for the Star Catcher service-bay installation.
// These are workbench allocations, not a supplier terminal or compressor ICD.
export function heatliftTerminalTransfer(h){
 if(h.architectureFamilyId!=='heatlift-study')return null;
 return {revision:'starcatcher-enclosed-terminal-transfer-r1',boreRadiusM:.014,
  neckOuterRadiusM:.020,statorOffsetM:-.12,statorDimensionsM:[.18,.10,.18],
  enclosureWallM:.003,pedestalHeightM:.05,
  basis:'Stationary service connectors terminate inside the bus. A continuous hollow roof neck and pedestal enclose the terminal assembly internal transfer; no external cable follows the pointing head.'};
}

// Closed annular material in the local X/Z plane, with its bore along +Y.
// The tapered outer profile preserves the allocated pedestal footprint.
export function heatliftTerminalAnnulusGeometry(T,{innerRadiusM,outerBottomRadiusM,
 outerTopRadiusM=outerBottomRadiusM,bottomM,topM}){
 const profile=[[innerRadiusM,bottomM],[outerBottomRadiusM,bottomM],
  [outerTopRadiusM,topM],[innerRadiusM,topM],[innerRadiusM,bottomM]];
 return new T.LatheGeometry(profile.map(([x,y])=>new T.Vector2(x,y)),48);
}

export function heatliftPackageAllocation(h){
 if(h.architectureFamilyId!=='heatlift-study')return null;
 const wallM=Math.max(.018,Math.min(h.bodyWidthM,h.bodyHeightM,h.bodyLengthM)*.024),
  rackForwardM=Math.max(...h.rackLayout.slots.map(s=>s.z))+h.rackLayout.slotDimensionsM[2]/2;
 return {revision:'starcatcher-forward-service-package-r1',
  positionM:[h.bodyWidthM*.14,h.bodyHeightM/2-wallM-.35,rackForwardM+.62],
  dimensionsM:[.65,.40,.60],caseDimensionsM:[.55,.40,.60],
  roofInnerM:h.bodyHeightM/2-wallM,rackForwardM,mountRiseM:.15,
  assemblyMassKg:h.energySystem?.thermal?.heatPump?.massKg??h.input.heatPumpMassKg,
  basis:'The allocated compressor, motor drive, cold/hot interfaces and four roof mounts form one assembly in the upper forward service bay. Its 625 kg reference allocation is retained once; cold and hot fluid channels remain physically separate.'};
}

// Three hot-side pipes leave the real condenser face along -X. The lower
// return uses the separately allocated outboard aisle/floor-gland helper.
export function heatliftHotPipeControls(h,{bankIndex,side,a,b}={}){
 const allocation=heatliftPackageAllocation(h);
 if(!allocation||!a||!b||bankIndex===1&&side<0)return null;
 const [ax,ay,az]=a,[bx,by,bz]=b,left=-h.bodyWidthM/2,
  high=allocation.roofInnerM-.028;
 if(bankIndex===0&&side<0){
  const aisle=left+.30,z=bz-.28;
  return [a,[aisle,ay,az],[aisle,ay,z],[bx,ay,z],[bx,ay,bz],b];
 }
 if(bankIndex===0){
  const lead=ax-.35,aisle=left+.27,z=bz-.24,y=by-.26;
  return [a,[lead,ay,az],[lead,high,az],[aisle,high,az],
   [aisle,high,z],[bx,high,z],[bx,y,z],[bx,y,bz],b];
 }
 const lead=ax-.35,aisle=h.bodyWidthM/2-.20,
  z=allocation.rackForwardM+.32,y=ay-.44,low=-h.bodyHeightM/2+.34;
 return [a,[lead,ay,az],[lead,y,az],[lead,y,z],[aisle,y,z],
  [aisle,low,z],[aisle,low,bz],[bx,low,bz],b];
}
