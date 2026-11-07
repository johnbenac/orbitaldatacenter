// The planet is sampled analytically on the Canvas path. Its geographic detail
// and curved horizon do not depend on the tessellation of a nearby globe mesh.
import * as T from './vendor/three.module.js';
import {EARTH_STYLE,earthCloudCoverage,earthNightLightMask,earthSunTransmission,integrateEarthAtmosphere} from './earth-appearance.js';
import {EARTH_DETAIL,sampleEarthDetail} from './earth-detail.js';

const TAU=2*Math.PI,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const E=EARTH_STYLE;
const smooth=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*(3-2*u);};
const imageCache=new WeakMap(),frameCache=new WeakMap(),solarTables=new Map();
const linear=Float32Array.from({length:256},(_,i)=>{const x=i/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});
const encoded=Uint8ClampedArray.from({length:4097},(_,i)=>{const x=i/4096;return 255*(x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055);});
const display=x=>encoded[Math.round(4096*clamp(x))];
const fit=x=>(x*(x+.0245786)-.000090537)/(x*(.983729*x+.432951)+.238081);

function filmic(out,index,r,g,b,gain,alpha){
 const x=fit(gain*(.59719*r+.35458*g+.04823*b));
 const y=fit(gain*(.076*r+.90834*g+.01566*b));
 const z=fit(gain*(.0284*r+.13383*g+.83777*b));
 out[index]=display(1.60475*x-.53108*y-.07367*z);
 out[index+1]=display(-.10208*x+1.10813*y-.00605*z);
 out[index+2]=display(-.00327*x-.07276*y+1.07602*z);
 out[index+3]=255*alpha;
}

// Geographic image coordinates: Greenwich is the centre column, north is up.
// The Three.js scene maps east longitude toward -Z.
export function earthGeographicUV(x,y,z,out=[0,0]){
 const radius=Math.hypot(x,y,z)||1;
 out[0]=((Math.atan2(-z,x)/TAU+.5)%1+1)%1;
 out[1]=.5-Math.asin(clamp(y/radius,-1,1))/Math.PI;
 return out;
}
function unitUV(x,y,z,out){
 const u=Math.atan2(-z,x)/TAU+.5;out[0]=u>=1?u-1:u;
 out[1]=.5-Math.asin(clamp(y,-1,1))/Math.PI;return out;
}

// Surface and cloud illumination vary smoothly with the solar angle. Cache
// the shared physical transmission function without reducing image detail.
function solarTable(radius){
 if(solarTables.has(radius))return solarTables.get(radius);
 const values=new Float32Array(8193*3),out=new Float64Array(3);
 for(let i=0;i<=8192;i++){earthSunTransmission(radius,i/4096-1,out);values.set(out,3*i);}
 solarTables.set(radius,values);return values;
}
function solarAt(table,mu,out){
 const index=clamp((mu+1)*4096,0,8192),low=Math.min(8191,Math.floor(index)),f=index-low,a=3*low;
 for(let c=0;c<3;c++)out[c]=table[a+c]+(table[a+c+3]-table[a+c])*f;
 return out;
}

function sourcePixels(map,mono=false){
 const image=map?.image,w=image?.naturalWidth||image?.width,h=image?.naturalHeight||image?.height;
 if(!w||!h||image.complete===false)return null;
 let entry=imageCache.get(map);
 if(entry?.image===image&&entry.version===map.version&&entry.mono===mono)return entry;
 let data;
 if(image.data?.length===w*h*4)data=image.data;
 else{
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,0,0,w,h);data=ctx.getImageData(0,0,w,h).data;
  canvas.width=canvas.height=1;
 }
 // Cloud and water masks need one channel, not four copies of each texel.
 if(mono){const one=new Uint8Array(w*h);for(let i=0;i<one.length;i++)one[i]=data[4*i];data=one;}
 entry={image,version:map.version,width:w,height:h,data,mono};imageCache.set(map,entry);
 if(!map.userData.earthSoftwareDisposal){
  map.userData.earthSoftwareDisposal=true;map.addEventListener('dispose',()=>imageCache.delete(map));
 }
 return entry;
}

function sample(source,u,v,out,repeat=true){
 if(!source){out[0]=out[1]=out[2]=0;return out;}
 const {width:w,height:h,data,mono}=source;
 const fx=u*w-.5,fy=clamp(v*h-.5,0,h-1),ix=Math.floor(fx),iy=Math.floor(fy),dx=fx-ix,dy=fy-iy;
 const x0=repeat?((ix%w)+w)%w:clamp(ix,0,w-1),x1=repeat?(x0+1)%w:clamp(ix+1,0,w-1),y1=Math.min(h-1,iy+1);
 const a=(1-dx)*(1-dy),b=dx*(1-dy),c=(1-dx)*dy,d=dx*dy;
 if(mono){out[0]=(data[iy*w+x0]*a+data[iy*w+x1]*b+data[y1*w+x0]*c+data[y1*w+x1]*d)/255;return out;}
 const p=4*(iy*w+x0),q=4*(iy*w+x1),r=4*(y1*w+x0),s=4*(y1*w+x1);
 for(let ch=0;ch<3;ch++)out[ch]=linear[data[p+ch]]*a+linear[data[q+ch]]*b+linear[data[r+ch]]*c+linear[data[s+ch]]*d;
 return out;
}

function preparedMaps(state){
 const maps=state.maps||{};
 return {day:sourcePixels(maps.day),clouds:sourcePixels(maps.clouds,true),night:sourcePixels(maps.night),ocean:sourcePixels(maps.ocean,true),detail:state.detail,
  details:(state.details||[]).map(tile=>tile?.map?{...tile,source:sourcePixels(tile.map)}:null)};
}

function dayAt(maps,u,v,out){
 if(maps.detail&&sampleEarthDetail(maps.detail,'day',u,v,out))return out;
 const col=Math.min(E.tileColumns-1,Math.floor(u*E.tileColumns)),row=Math.min(E.tileRows-1,Math.floor(v*E.tileRows));
 let detail=null,localU=0,localV=0,blend=0;
 for(const tile of maps.details){
  if(!tile?.source||tile.col!==col||tile.row!==row)continue;
  detail=tile.source;localU=u*E.tileColumns-col;localV=v*E.tileRows-row;
  blend=smooth(0,E.tileBorder/E.tileInterior,Math.min(localU,1-localU,localV,1-localV));break;
 }
 if(detail&&blend===1)return sample(detail,(E.tileBorder+localU*E.tileInterior)/E.tileSize,(E.tileBorder+localV*E.tileInterior)/E.tileSize,out,false);
 if(maps.day)sample(maps.day,u,v,out);else{out[0]=.014;out[1]=.055;out[2]=.10;}
 if(detail&&blend>0){
  const r=out[0],g=out[1],b=out[2];sample(detail,(E.tileBorder+localU*E.tileInterior)/E.tileSize,(E.tileBorder+localV*E.tileInterior)/E.tileSize,out,false);
  out[0]=r+(out[0]-r)*blend;out[1]=g+(out[1]-g)*blend;out[2]=b+(out[2]-b)*blend;
 }
 return out;
}
function cloudAt(maps,u,v,out){
 if(maps.detail&&sampleEarthDetail(maps.detail,'clouds',u,v,out))return out;
 return sample(maps.clouds,u,v,out);
}

// Exported for geographic/detail registration checks; rendering prepares the
// image sources once per frame, rather than reading them for every sample.
export function sampleEarthDay(state,u,v,out=[0,0,0]){return dayAt(preparedMaps(state),u-Math.floor(u),clamp(v),out);}

function mapStamp(map){return map?[map.id,map.version,map.image?.width||0,map.image?.height||0].join(':'):'-';}
function frameStamp(object,state,camera,width,height,exposureEV){
 return [width,height,exposureEV??0,...object.matrixWorld.elements,...camera.matrixWorld.elements,...camera.projectionMatrix.elements,
  state.sun?.x??1,state.sun?.y??0,state.sun?.z??0,state.cloudRadius,state.atmosphereRadius,state.detail?.version??0,
  ...['day','clouds','night','ocean'].map(k=>mapStamp(state.maps?.[k])),
  ...(state.details||[]).map(t=>t?[t.col,t.row,mapStamp(t.map)].join(':'):'-')].join('/');
}

function composite(layer,pixels,depth){
 const image=layer.pixels,z=layer.depth;
 for(let i=0;i<z.length;i++){
  const k=4*i,alpha=image[k+3]/255;if(!alpha||z[i]>=depth[i]&&Number.isFinite(z[i]))continue;
  if(alpha===1){pixels[k]=image[k];pixels[k+1]=image[k+1];pixels[k+2]=image[k+2];pixels[k+3]=255;}
  else{
   const old=pixels[k+3]/255,coverage=alpha+old*(1-alpha),weight=alpha/coverage;
   for(let c=0;c<3;c++)pixels[k+c]+=weight*(image[k+c]-pixels[k+c]);pixels[k+3]=255*coverage;
  }
  if(layer.solid[i])depth[i]=z[i];
 }
}

// Air is a smooth radiance field. Integrate it on an 8px grid and interpolate
// only cells whose corners all hit solid Earth well inside its limb. The limb,
// cloud sliver and exterior atmosphere retain exact per-pixel integration.
// Ground and cloud-height columns are independent so native-resolution cloud
// edges keep their own altitude. Geography is never sampled on this grid.
function atmosphereField(m,p,perspective,width,height,sun,cloudRadius,atmosphereRadius){
 const step=8,cols=Math.ceil((width-1)/step)+1,rows=Math.ceil((height-1)/step)+1;
 const data=new Float32Array(cols*rows*12),valid=new Uint8Array(cols*rows),origin=[0,0,0],ray=[0,0,0],out=new Float64Array(6);
 const ar2=atmosphereRadius*atmosphereRadius,cr2=cloudRadius*cloudRadius;
 for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
  const x=Math.min(width-1,gx*step),y=Math.min(height-1,gy*step),sx=((x+.5)/width*2-1+(perspective?p[8]:-p[12]))/p[0],sy=(1-(y+.5)/height*2+(perspective?p[9]:-p[13]))/p[5];
  let ax=m[12],ay=m[13],az=m[14],dx=-m[8],dy=-m[9],dz=-m[10];
  if(perspective){dx+=m[0]*sx+m[4]*sy;dy+=m[1]*sx+m[5]*sy;dz+=m[2]*sx+m[6]*sy;}
  else{ax+=m[0]*sx+m[4]*sy;ay+=m[1]*sx+m[5]*sy;az+=m[2]*sx+m[6]*sy;}
  const length=Math.sqrt(dx*dx+dy*dy+dz*dz);dx/=length;dy/=length;dz/=length;
  const b=ax*dx+ay*dy+az*dz,r2=ax*ax+ay*ay+az*az,disc=b*b-r2+1;if(disc<.012)continue;
  const ground=-b-Math.sqrt(disc);if(ground<=0)continue;
  const start=Math.max(0,-b-Math.sqrt(b*b-r2+ar2)),cloud=-b-Math.sqrt(b*b-r2+cr2);
  origin[0]=ax;origin[1]=ay;origin[2]=az;ray[0]=dx;ray[1]=dy;ray[2]=dz;
  const i=gy*cols+gx;valid[i]=1;
  integrateEarthAtmosphere(origin,ray,sun,start,ground,out,true);data.set(out,12*i);
  integrateEarthAtmosphere(origin,ray,sun,start,cloud>0?cloud:ground,out,true);data.set(out,12*i+6);
 }
 const indices=new Uint16Array(width),fractions=new Float32Array(width);
 for(let x=0;x<width;x++){const gx=Math.min(cols-2,Math.floor(x/step));indices[x]=gx;fractions[x]=(x-gx*step)/Math.min(step,width-1-gx*step);}
 return {data,valid,cols,rows,step,width,height,indices,fractions,line:new Float64Array(cols*12),delta:new Float64Array(cols*12),lineValid:new Uint8Array(cols)};
}
function fieldRow(field,y){
 const {step,cols,rows,data,valid,height,line,delta,lineValid}=field,gy=Math.min(rows-2,Math.floor(y/step)),fy=(y-gy*step)/Math.min(step,height-1-gy*step),a=gy*cols,b=a+cols;
 for(let col=0;col<cols;col++){
  lineValid[col]=valid[a+col]&&valid[b+col];const p=12*(a+col),q=12*(b+col),k=12*col;
  for(let ch=0;ch<12;ch++)line[k+ch]=data[p+ch]+(data[q+ch]-data[p+ch])*fy;
 }
 for(let i=0;i<(cols-1)*12;i++)delta[i]=line[i+12]-line[i];
}
function fieldAt(field,x,cloud,out){
 const {indices,fractions,line,delta,lineValid}=field,gx=indices[x];if(!(lineValid[gx]&&lineValid[gx+1]))return false;
 const fx=fractions[x],index=12*gx;
 for(let ch=0;ch<6;ch++){
  const ground=line[index+ch]+delta[index+ch]*fx;
  if(cloud>0){const elevated=line[index+ch+6]+delta[index+ch+6]*fx;out[ch]=ground+(elevated-ground)*cloud;}
  else out[ch]=ground;
 }
 return true;
}

export function renderEarthSoftware({object,state,camera,width,height,pixels,depth,exposureEV,exactAtmosphere=false}){
 const key=frameStamp(object,state,camera,width,height,exposureEV)+'/'+exactAtmosphere;let layer=frameCache.get(object);
 if(layer?.key===key){composite(layer,pixels,depth);return;}
 if(!layer||layer.pixels.length!==pixels.length){
  layer={pixels:new Uint8ClampedArray(pixels.length),depth:new Float64Array(width*height),solid:new Uint8Array(width*height),key:null};frameCache.set(object,layer);
  if(!object.userData.earthSoftwareDisposal){object.userData.earthSoftwareDisposal=true;object.material.addEventListener('dispose',()=>frameCache.delete(object));}
 }
 layer.pixels.fill(0);layer.depth.fill(Infinity);layer.solid.fill(0);
 const maps=preparedMaps(state),inverse=new T.Matrix4().copy(object.matrixWorld).invert(),toLocal=new T.Matrix4().multiplyMatrices(inverse,camera.matrixWorld),m=toLocal.elements,p=camera.projectionMatrix.elements;
 const solar=(state.sun||new T.Vector3(1,0,0)).clone().transformDirection(inverse),sun=[solar.x,solar.y,solar.z];
 const cloudRadius=state.cloudRadius??E.cloudRadius,atmosphereRadius=state.atmosphereRadius??E.atmosphereRadius;
 const ar2=atmosphereRadius*atmosphereRadius,cr2=cloudRadius*cloudRadius,perspective=camera.isPerspectiveCamera;
 const ox=m[12],oy=m[13],oz=m[14],step=2/(width*p[0]),first=(1/width-1+(perspective?p[8]:-p[12]))/p[0];
 const gain=(1.16/.6)*2**(Number.isFinite(exposureEV)?exposureEV:0),uv=[0,0],day=[0,0,0],mask=[0,0,0],night=[0,0,0],air=new Float64Array(6),direction=[0,0,0];
 const origin=[0,0,0],incident=new Float64Array(3),cloudLight=new Float64Array(3);
 const surfaceSun=solarTable(1),cloudSun=solarTable(cloudRadius);
 const field=!exactAtmosphere&&width*height>50000?atmosphereField(m,p,perspective,width,height,sun,cloudRadius,atmosphereRadius):null;
 for(let y=0;y<height;y++){
  if(field)fieldRow(field,y);
  const sy=(1-(y+.5)/height*2+(perspective?p[9]:-p[13]))/p[5];
  let xCamera=first;
  for(let x=0;x<width;x++,xCamera+=step){
   let ax=ox,ay=oy,az=oz,dx=-m[8],dy=-m[9],dz=-m[10];
   if(perspective){dx+=m[0]*xCamera+m[4]*sy;dy+=m[1]*xCamera+m[5]*sy;dz+=m[2]*xCamera+m[6]*sy;}
   else{ax+=m[0]*xCamera+m[4]*sy;ay+=m[1]*xCamera+m[5]*sy;az+=m[2]*xCamera+m[6]*sy;}
   const rayLength=Math.sqrt(dx*dx+dy*dy+dz*dz);dx/=rayLength;dy/=rayLength;dz/=rayLength;
   const b=ax*dx+ay*dy+az*dz,r2=ax*ax+ay*ay+az*az,discAir=b*b-r2+ar2;
   if(discAir<=0)continue;
   const rootAir=Math.sqrt(discAir),enter=Math.max(0,-b-rootAir),exit=-b+rootAir;if(exit<=0)continue;
   const disc=b*b-r2+1,groundDistance=disc>=0?-b-Math.sqrt(disc):Infinity;
   const groundHit=groundDistance>=0&&Number.isFinite(groundDistance);let end=groundHit?Math.min(exit,groundDistance):exit;
   let rr=0,gg=0,bb=0,coverage=groundHit?1:0,cloudOpacity=0;
   const pixel=y*width+x,index=4*pixel;
   if(groundHit){
    const nx=ax+dx*groundDistance,ny=ay+dy*groundDistance,nz=az+dz*groundDistance,mu=nx*sun[0]+ny*sun[1]+nz*sun[2];
    unitUV(nx,ny,nz,uv);const groundU=uv[0],groundV=uv[1];dayAt(maps,groundU,groundV,day);
    const direct=Math.max(0,mu);solarAt(surfaceSun,direct,incident);let shadow=0;
    if(maps.clouds&&mu>0){
     const distance=-mu+Math.sqrt(mu*mu+cr2-1);unitUV((nx+sun[0]*distance)/cloudRadius,(ny+sun[1]*distance)/cloudRadius,(nz+sun[2]*distance)/cloudRadius,uv);
     cloudAt(maps,uv[0],uv[1],mask);shadow=earthCloudCoverage(mask[0]);
    }
    const sunlight=E.surfaceDirect*direct*(1-E.cloudShadow*shadow);
    rr=day[0]*(E.surfaceAmbient+sunlight*incident[0]);gg=day[1]*(E.surfaceAmbient+sunlight*incident[1]);bb=day[2]*(E.surfaceAmbient+sunlight*incident[2]);
    if(maps.ocean&&mu>0){
     sample(maps.ocean,groundU,groundV,mask);const water=mask[0]*(1-smooth(.20,.55,.2126*day[0]+.7152*day[1]+.0722*day[2]));
     if(water>.01){
      const hx=sun[0]-dx,hy=sun[1]-dy,hz=sun[2]-dz,hl=Math.hypot(hx,hy,hz)||1;
      const fresnel=.02+.98*Math.pow(1-Math.max(0,-nx*dx-ny*dy-nz*dz),5);
      const glint=E.glintGain*water*direct*Math.pow(Math.max(0,(nx*hx+ny*hy+nz*hz)/hl),E.glintPower)*(.18+2*fresnel);
      rr+=glint*incident[0];gg+=glint*incident[1];bb+=glint*incident[2];
     }
    }
    if(maps.night&&mu<E.nightEnd){
     const detailed=maps.detail&&sampleEarthDetail(maps.detail,'night',groundU,groundV,night);
     if(detailed){night[1]=night[0]*EARTH_DETAIL.nightTint[1];night[2]=night[0]*EARTH_DETAIL.nightTint[2];}else sample(maps.night,groundU,groundV,night);
     const emission=E.nightGain*(1-smooth(E.nightStart,E.nightEnd,mu))*(detailed?1:earthNightLightMask(night[0],night[1],night[2]));
     rr+=night[0]*emission;gg+=night[1]*emission;bb+=night[2]*emission;
    }
    const t=groundDistance/rayLength;layer.depth[pixel]=(-p[10]*t+p[14])/(-p[11]*t+p[15]);layer.solid[pixel]=1;
   }
   const discCloud=b*b-r2+cr2;
   if(maps.clouds&&discCloud>0){
    const distance=-b-Math.sqrt(discCloud);
    if(distance>=0&&(!groundHit||distance<=groundDistance)){
     const cx=(ax+dx*distance)/cloudRadius,cy=(ay+dy*distance)/cloudRadius,cz=(az+dz*distance)/cloudRadius;
     unitUV(cx,cy,cz,uv);cloudAt(maps,uv[0],uv[1],mask);
     const opacity=earthCloudCoverage(mask[0]),mu=cx*sun[0]+cy*sun[1]+cz*sun[2],light=smooth(-.14,.04,mu)*(E.cloudWrap+E.cloudDirect*Math.max(0,mu));
     solarAt(cloudSun,mu,cloudLight);
     rr=rr*(1-opacity)+(E.cloudAmbient+cloudLight[0]*light)*opacity;
     gg=gg*(1-opacity)+(E.cloudAmbient+cloudLight[1]*light)*opacity;
     bb=bb*(1-opacity)+(E.cloudAmbient+cloudLight[2]*light)*opacity;
     coverage=opacity+coverage*(1-opacity);
     cloudOpacity=opacity;
     end+=(distance-end)*opacity;
    }
   }
   origin[0]=ax;origin[1]=ay;origin[2]=az;direction[0]=dx;direction[1]=dy;direction[2]=dz;
   if(!groundHit||!field||!fieldAt(field,x,cloudOpacity,air))integrateEarthAtmosphere(origin,direction,sun,enter,end,air,groundHit||coverage>0);
   rr=rr*air[3]+air[0];gg=gg*air[4]+air[1];bb=bb*air[5]+air[2];
   const airAlpha=clamp(1-(.2126*air[3]+.7152*air[4]+.0722*air[5]));coverage=coverage+airAlpha*(1-coverage);
   if(coverage<.001)continue;
   // Outside the solid globe retain the sky behind the translucent air. The
   // cached layer is independent of that sky and any animated foreground.
   if(!groundHit){const t=enter/rayLength;layer.depth[pixel]=(-p[10]*t+p[14])/(-p[11]*t+p[15]);rr/=coverage;gg/=coverage;bb/=coverage;}
   filmic(layer.pixels,index,rr,gg,bb,gain,coverage);
  }
 }
 layer.key=key;composite(layer,pixels,depth);
}
