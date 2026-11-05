// Body metres. Tray envelopes include the accelerator board, host and cold plate.
// The DGX case uses NVIDIA's published chassis. Flight trays and keep-outs are study dimensions.
export function rackSection(compute,w,h){
 const slotDimensionsM=compute==='dgx'?[.4823,.356,.8971]:[.48,.18,.70];
 const [x,y,z]=slotDimensionsM,pitchM=[x+.065,y+.045,z+.10];
 // Wall-side plumbing zones and top/bottom bus services stay outside this rectangular lattice.
 const columns=Math.max(1,Math.floor(.82*w/pitchM[0])),rows=Math.max(1,Math.floor(.68*h/pitchM[1]));
 return {slotDimensionsM,pitchM,columns,rows};
}
export function rackLayout(section,trays,z0,z1){
 const {columns,rows,pitchM}=section,bays=Math.floor((z1-z0+1e-7)/pitchM[2]),capacity=bays*rows*columns;
 if(capacity<trays)throw Error('Compute tray allocation exceeds the reserved bay');
 const usedBays=Math.ceil(trays/(rows*columns)),slots=[];
 // Load the aft bays first and install trays in diametrically opposite pairs.
 // This keeps a partly populated transverse frame close to the thrust centreline.
 const perBay=columns*rows,half=Math.ceil(perBay/2);
 const radius=i=>Math.hypot((i%columns-(columns-1)/2)*pitchM[0],(Math.floor(i/columns)-(rows-1)/2)*pitchM[1]);
 const order=Array.from({length:half},(_,i)=>i).sort((a,b)=>radius(a)-radius(b))
  .flatMap(i=>i===perBay-1-i?[i]:[i,perBay-1-i]);
 for(let i=0;i<trays;i++){
  const at=order[i%perBay],column=at%columns,row=Math.floor(at/columns),bay=Math.floor(i/perBay);
  slots.push({index:i,column,row,bay,x:(column-(columns-1)/2)*pitchM[0],y:(row-(rows-1)/2)*pitchM[1],z:z0+(bay+.5)*pitchM[2]});
 }
 return {...section,capacity,installed:trays,spare:capacity-trays,bays,usedBays,slots,rackZ0M:z0,rackZ1M:z1};
}
