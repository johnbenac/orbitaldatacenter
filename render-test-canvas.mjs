// Minimal Canvas2D backing store for deterministic raster readback.
export function canvas(){
 const c={width:1,height:1,frame:null};
 const image=(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)});
 const ctx={clearRect(){},getImageData(){return c.frame||image(c.width,c.height);},createImageData:image,
 putImageData(v){c.frame=v;},drawImage(src){
  if(!src.frame){const im=image(c.width,c.height);im.data.fill(210);c.frame=im;return;}
  const w=c.width,h=c.height,from=src.frame;if(from.width===w&&from.height===h){c.frame=from;return;}
  const im=image(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=4*(y*w+x),j=4*(Math.floor(y*from.height/h)*from.width+Math.floor(x*from.width/w));for(let k=0;k<4;k++)im.data[i+k]=from.data[j+k];}c.frame=im;
 }};
 c.getContext=()=>new Proxy(ctx,{get:(o,k)=>o[k]??(['createRadialGradient','createLinearGradient'].includes(k)?()=>({addColorStop(){}}):()=>{})});
 return c;
}
