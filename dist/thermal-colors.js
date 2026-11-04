// Fixed sRGB stops shared by scene materials, the software renderer and subsystem diagrams.
export const palette=['#27338c','#2972cd','#38cee0','#d7dc85','#ff9850','#e63d45'];
const range=(lo,step)=>palette.map((color,i)=>[lo+i*step,color]);
export const thermalScales={working:range(245,12),full:range(180,40)};
export function temperatureColor(k,scale='working'){
 if(!Number.isFinite(k))return null;
 const stops=thermalScales[scale],n=stops.length-1,lo=stops[0][0],hi=stops[n][0];
 const p=Math.min(n,Math.max(0,(k-lo)*n/(hi-lo))),i=Math.min(Math.floor(p),n-1),t=p-i;
 const a=parseInt(stops[i][1].slice(1),16),b=parseInt(stops[i+1][1].slice(1),16);
 let rgb=0;for(const shift of [16,8,0]){const lo=(a>>shift)&255,hi=(b>>shift)&255;rgb|=Math.round(lo+(hi-lo)*t)<<shift;}
 return rgb;
}
