import {rackSection,rackLayout} from './rack-layout.js';
// A packaging allocation is reported even when it does not fit. It never resizes
// the selected physical vehicle to hide a shortfall.
export function payloadAccommodation(d,g,{trays,mid,halfRun}){
 if(g.payloadLocation==='radiator'){
  const columns=2,rows=2,widthM=g.payloadPlatform?.spreaderWidthM||1,depthM=g.payloadPlatform?.spreaderDepthM||1,pitchX=.5,pitchZ=.5;
  return {location:'radiator',relativeTo:'radiator-platform',columns,rows,requiredRows:Math.ceil(trays/columns),bays:1,usedBays:1,capacity:4,availableCapacity:4,installed:trays,spare:Math.max(0,4-trays),overflow:Math.max(0,trays-4),slotDimensionsM:[.44,.12,.44],pitchM:[pitchX,.14,pitchZ],rackZ0M:-depthM/2,rackZ1M:depthM/2,fit:trays<=4,basis:'Four fixed 0.44 m packages on a 2 × 2 grid at 0.5 m pitch are the allocation on the published 1 m spreader. Additional packages retain their size and extend beyond that grid, exposing an accommodation shortfall; package internals remain assumed.',slots:Array.from({length:trays},(_,i)=>({index:i,column:i%columns,row:Math.floor(i/columns),bay:0,x:(i%columns-(columns-1)/2)*pitchX,y:.12,z:(Math.floor(i/columns)-(rows-1)/2)*pitchZ}))};
 }
 const section=rackSection(d.compute,g.bodyWidthM,g.bodyHeightM),z0=mid-halfRun,z1=mid+halfRun;
 if(!g.architectureFamilyId||g.architectureFamilyId==='protected-core')return rackLayout(section,trays,z0,z1);
 const availableBays=Math.max(0,Math.floor((z1-z0+1e-7)/section.pitchM[2])),capacity=availableBays*section.rows*section.columns;
 const needed=Math.ceil(trays/(section.rows*section.columns));
 const run=Math.max(z1-z0,needed*section.pitchM[2]+.001);
 const rack=rackLayout(section,trays,mid-run/2,mid+run/2);
 return {...rack,location:'core',fit:capacity>=trays,availableCapacity:capacity,overflow:Math.max(0,trays-capacity),basis:'Allocated flight tray envelopes at installed stations; insufficient bay volume remains a packaging shortfall.'};
}
