// Deterministic, depth-buffered triangle renderer for devices without WebGL.
// Reads the same Three.js geometry, transforms, camera and UV textures as the GPU path.
import * as T from './vendor/three.module.js';
import {renderEarthSoftware} from './earth-software.js';
const pixels=new WeakMap(),vertexBuffers=new WeakMap(),backgrounds=new WeakMap(),lut=new Uint8ClampedArray(2049);for(let i=0;i<=2048;i++){let x=i/2048;lut[i]=255*(x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055);}
// Linear-light texture decoding and the same ACES fit used by Three r160. Physical
// radiance can exceed 1 until the final display transform. Diagnostic colors bypass it.
const srgbBytes=Float32Array.from({length:256},(_,i)=>{
 const x=i/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
});
const linearBytes=Float32Array.from({length:256},(_,i)=>i/255);
const fit=x=>(x*(x+.0245786)-.000090537)/(x*(.983729*x+.432951)+.238081);
const display=x=>lut[Math.round(2048*Math.max(0,Math.min(1,x)))];
function filmic(out,r,g,b,gain){
 const x=fit(gain*(.59719*r+.35458*g+.04823*b));
 const y=fit(gain*(.076*r+.90834*g+.01566*b));
 const z=fit(gain*(.0284*r+.13383*g+.83777*b));
 out[0]=display(1.60475*x-.53108*y-.07367*z);
 out[1]=display(-.10208*x+1.10813*y-.00605*z);
 out[2]=display(-.00327*x-.07276*y+1.07602*z);
}
// Read the source once. Halve cached pixels in memory so a first frame never
// resamples the full sky survey through multiple synchronous canvas readbacks.
function imageData(map,level=0){
 const img=map?.image;if(!img?.width||!img.height)return null;
 let cached=pixels.get(map),levels=cached?.levels;
 if(!cached||cached.version!==map.version||cached.image!==img){
  // Keep full bundled resolution on WebGL. Bound the fallback's decoded mip
  // chain so two 4K terrain layers cannot consume hundreds of MB of CPU pixels.
  const scale=Math.min(1,2048/Math.max(img.width,img.height)),c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));
  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,0,0,c.width,c.height);
  levels=[ctx.getImageData(0,0,c.width,c.height)];pixels.set(map,{image:img,version:map.version,levels});c.width=c.height=1;
 }
 while(levels.length<=level){
  const src=levels.at(-1),width=Math.max(1,src.width>>1),height=Math.max(1,src.height>>1);
  if(width===src.width&&height===src.height)return src;
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const a=4*(2*y*src.width+2*x),b=a+(src.width>1?4:0),c=a+(src.height>1?4*src.width:0),d=c+(b-a);
   for(let ch=0;ch<4;ch++)data[4*(y*width+x)+ch]=(src.data[a+ch]+src.data[b+ch]+src.data[c+ch]+src.data[d+ch]+2)>>2;
  }
  levels.push({width,height,data});
 }
 return levels[level];
}
// Equirectangular skies follow the camera on the fallback path too. Cache the
// background while only the mission clock or camera position changes.
function paintBackground(target,map,camera,width,height){
 const source=imageData(map);if(!source||!camera.isPerspectiveCamera)return;
 const q=camera.quaternion,projection=camera.projectionMatrix.elements;
 const key=[width,height,map.version,projection[0],projection[5],q.x,q.y,q.z,q.w].join('/');
 let entry=backgrounds.get(map);
 if(entry?.key===key){target.set(entry.data);return;}
 const data=new Uint8ClampedArray(target.length),m=camera.matrixWorld.elements,sw=source.width,sh=source.height,bytes=source.data;
 for(let y=0;y<height;y++){
  const dy=(1-(y+.5)/height*2)/projection[5];
  for(let x=0;x<width;x++){
   const dx=((x+.5)/width*2-1)/projection[0],wx=m[0]*dx+m[4]*dy-m[8],wy=m[1]*dx+m[5]*dy-m[9],wz=m[2]*dx+m[6]*dy-m[10];
   const u=Math.atan2(wz,wx)/(2*Math.PI)+.5,v=.5-Math.asin(wy/Math.hypot(wx,wy,wz))/Math.PI;
   const fx=u*sw-.5,fy=Math.max(0,Math.min(sh-1,v*sh-.5)),left=Math.floor(fx),sx=(left+sw)%sw,sy=Math.floor(fy),tx=(sx+1)%sw,ty=Math.min(sh-1,sy+1),blendX=fx-left,blendY=fy-sy;
   const a=(sy*sw+sx)*4,b=(sy*sw+tx)*4,c=(ty*sw+sx)*4,d=(ty*sw+tx)*4,t=(y*width+x)*4;
   for(let ch=0;ch<3;ch++)data[t+ch]=(bytes[a+ch]*(1-blendX)+bytes[b+ch]*blendX)*(1-blendY)+(bytes[c+ch]*(1-blendX)+bytes[d+ch]*blendX)*blendY;
   data[t+3]=255;
  }
 }
 backgrounds.set(map,{key,data});target.set(data);
}
const vec=new T.Vector3(),eye=new T.Vector3(),half=new T.Vector3(),mvp=new T.Matrix4(),normMat=new T.Matrix3(),sun=new T.Vector3(-3,6,4).normalize(),rim=new T.Vector3(4,1,-3).normalize();
export function softRenderer(canvas){let width=1,height=1,depth,frame;const ctx=canvas.getContext('2d',{alpha:true}),aa=document.createElement('canvas'),raster=aa.getContext('2d',{alpha:true});return{getDrawingBufferSize(target){return target.set(width,height);},setSize(w,h){const samples=w*h<200000?1.4:1;canvas.width=Math.round(w);canvas.height=Math.round(h);width=aa.width=Math.max(1,Math.round(w*samples));height=aa.height=Math.max(1,Math.round(h*samples));depth=new Float64Array(width*height);frame=ctx.createImageData(width,height);},render(scene,camera,keepColor=false){if(!frame)return;let img=frame.data;if(!keepColor)img.fill(0);depth.fill(Infinity);scene.updateMatrixWorld(true);camera.updateMatrixWorld();const lighting=scene.userData.lightState;
if(!keepColor&&scene.background?.isTexture)paintBackground(img,scene.background,camera,width,height);
const ev=scene.userData.exposureEV,gain=Number.isFinite(ev)?(1.16/.6)*2**ev:0,encoded=[0,0,0];
const vp=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
const frustum=new T.Frustum().setFromProjectionMatrix(vp),fog=scene.fog;
const fogHex=fog?.color.getHex(),fogColor=fog?[fogHex>>16,fogHex>>8&255,fogHex&255]:null;
// Lines share the same depth buffer and material order as triangle surfaces.
function drawLine(a,k,l,c,mat){
 const dx=a[l]-a[k],dy=a[l+1]-a[k+1],dz=a[l+2]-a[k+2];let from=0,to=1;
 // Clip before stepping: near-clipped wire edges may project far beyond the
 // viewport. Work stays proportional to the visible segment, with full depth.
 for(let axis=0;axis<3;axis++){
  const start=a[k+axis],delta=a[l+axis]-start,lo=axis===2?-1:0,hi=axis===0?width-1:axis===1?height-1:1;
  if(Math.abs(delta)<1e-12){if(start<lo||start>hi)return;continue;}
  const t0=(lo-start)/delta,t1=(hi-start)/delta;from=Math.max(from,Math.min(t0,t1));to=Math.min(to,Math.max(t0,t1));if(from>to)return;
 }
 const steps=Math.min(4000,Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))*(to-from))));
 for(let j=0;j<=steps;j++){
  const f=from+(to-from)*j/steps,x=Math.round(a[k]+dx*f),y=Math.round(a[k+1]+dy*f);
  if(x<0||x>=width||y<0||y>=height)continue;
  const i=y*width+x,z=a[k+2]+dz*f;
  if(z< -1||z>1||(mat.depthTest&&z>depth[i]+1e-7))continue;
  const px=4*i,alpha=mat.opacity,dst=img[px+3]/255,coverage=alpha+dst*(1-alpha);
  if(!coverage)continue;
  const weight=alpha/coverage;
  for(let channel=0;channel<3;channel++){
   const src=(c>>(16-8*channel))&255;
   img[px+channel]+=weight*(src-img[px+channel]);
  }
  img[px+3]=255*coverage;if(mat.depthWrite&&mat.depthTest)depth[i]=z;
 }
}
const draw=o=>{if(!o.isMesh&&!o.isLine&&!o.isPoints)return;const g=o.geometry,p=g.attributes.position,mat=o.material;if(!p||!mat||Array.isArray(mat))return;
// The Earth surface pass includes its continuous atmosphere. Analytic ray
// intersections retain geography and a smooth limb even in close LEO views.
if(mat.userData.earthAtmosphere)return;
if(mat.userData.earthSurface){renderEarthSoftware({object:o,state:mat.userData.earthSurface,camera,width,height,pixels:img,depth,exposureEV:ev});return;}
if(o.frustumCulled&&!frustum.intersectsObject(o))return;mvp.multiplyMatrices(vp,o.matrixWorld);normMat.getNormalMatrix(o.matrixWorld);const e=mvp.elements,n=p.count;// Two scratch vertices hold near-plane intersections. Use homogeneous
// clipping before dividing by w so a wall touching the eye cannot disappear.
// Retain depth precision across kilometre-scale terrain. Float32 normalized
// depth rounds a centimetre-separated coastal surface onto the terrain and
// exposes alternating ground triangles through an otherwise continuous sea.
let scratch=vertexBuffers.get(o);if(!scratch||scratch.a.length<(n+2)*4){scratch={a:new Float64Array((n+2)*4),intensity:new Float32Array(n+2),glow:new Float32Array(n+2),colors:new Float32Array((n+2)*3)};vertexBuffers.set(o,scratch);}const a=scratch.a;let crossesNear=false;
function project(i,x,y,z){
 const k=i*4,w=e[3]*x+e[7]*y+e[11]*z+e[15],clipZ=e[2]*x+e[6]*y+e[10]*z+e[14],inv=w?1/w:0;
 a[k]=((e[0]*x+e[4]*y+e[8]*z+e[12])*inv*.5+.5)*width;
 a[k+1]=(.5-(e[1]*x+e[5]*y+e[9]*z+e[13])*inv*.5)*height;
 a[k+2]=clipZ*inv;a[k+3]=w;
 return clipZ+w;
}
for(let i=0;i<n;i++)if(project(i,p.getX(i),p.getY(i),p.getZ(i))<0)crossesNear=true;
const ix=g.index?.array,total=ix?.length??n,baseTexture=o.isMesh?imageData(mat.map):null;
// A missing/not-yet-decoded image must retain its material color, rather than
// exposing the white multiplier used with a loaded sRGB base-color texture.
const color=mat.map&&!baseTexture&&mat.userData.materialFallbackColor?mat.userData.materialFallbackColor:mat.color??new T.Color('#78a9c9');if(o.isPoints){
 const hex=color.getHex();
 let red=hex>>16,green=hex>>8&255,blue=hex&255;
 if(gain&&mat.toneMapped!==false){filmic(encoded,color.r,color.g,color.b,gain);[red,green,blue]=encoded;}
 for(let j=0;j<n;j++){
 const k=4*j,x=Math.round(a[k]),y=Math.round(a[k+1]),z=a[k+2],i=y*width+x;
 if(a[k+3]<=0||x<0||x>=width||y<0||y>=height||z>1||z< -1||z>=depth[i])continue;
 const px=4*i;img[px]=red;img[px+1]=green;img[px+2]=blue;img[px+3]=(mat.opacity??1)*255;
 }return;}if(o.isLine){let step=o.isLineSegments?2:1;for(let j=g.drawRange.start,end=Math.min(total,g.drawRange.start+g.drawRange.count);j<end-1;j+=step){let k=(ix?ix[j]:j)*4,l=(ix?ix[j+1]:j+1)*4;if(a[k+3]>0&&a[l+3]>0)drawLine(a,k,l,color.getHex(),mat);}return;}
const tintR=display(color.r)/255,tintG=display(color.g)/255,tintB=display(color.b)/255;
const uv=g.attributes.uv,normal=g.attributes.normal,opacity=mat.opacity??1,smoothMap=mat.map?.magFilter!==T.NearestFilter;
if(mat.map?.matrixAutoUpdate)mat.map.updateMatrix();const tm=mat.map?.matrix.elements;
const wrap=(v,type)=>type===T.RepeatWrapping?v-Math.floor(v):type===T.MirroredRepeatWrapping?(Math.floor(v)%2?1-(v-Math.floor(v)):v-Math.floor(v)):Math.max(0,Math.min(1,v));
const intensity=normal&&mat.isMeshStandardMaterial?scratch.intensity:null;
const glow=mat.userData.airglow?scratch.glow:null;
const vertexColor=mat.vertexColors&&g.attributes.color?scratch.colors:null;
if(vertexColor){const attribute=g.attributes.color;for(let i=0;i<n;i++){vertexColor[i*3]=attribute.getX(i);vertexColor[i*3+1]=attribute.getY(i);vertexColor[i*3+2]=attribute.getZ(i);}}
if(glow){const norm=new T.Vector3(),toEye=new T.Vector3();for(let i=0;i<n;i++){
 norm.fromBufferAttribute(normal,i).applyMatrix3(normMat).normalize();toEye.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).sub(camera.position).normalize();
 const l=Math.min(1,Math.max(0,(norm.dot(lighting?.sun??sun)+.22)/.40));
 glow[i]=Math.pow(1-Math.abs(norm.dot(toEye)),5)*(.060+.65*l*l*(3-2*l));
}}
if(intensity)for(let i=0;i<n;i++){vec.fromBufferAttribute(normal,i).applyMatrix3(normMat).normalize();intensity[i]=(lighting?.ambient??.33)+(lighting?.direct??1.05)*Math.max(0,vec.dot(lighting?.sun??sun))+(lighting?.rim??.38)*Math.max(0,vec.dot(lighting?.rimDirection??rim));
 if(lighting?.softbox)intensity[i]+=1.12*Math.max(0,vec.dot(lighting.softbox))+.68*Math.max(0,vec.dot(lighting.bounce));
 // The material library uses real metalness. Treating a 70%-metal surface as
 // a full Lambertian diffuser washes aluminum almost white under the studio
 // fills. A bounded vertex specular approximation retains diffuse/metal
 // separation and roughness on Canvas devices. WebGL still uses full PBR;
 // this branch does not change Earth, terrain, or legacy launch materials.
 if(mat.userData.materialId&&mat.metalness>0){
  const metal=Math.max(0,Math.min(1,mat.metalness)),power=8+64*(1-Math.max(.08,Math.min(1,mat.roughness??.5)))**2;
  eye.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);eye.subVectors(camera.position,eye).normalize();
  const specular=(direction,strength)=>{half.copy(direction).add(eye).normalize();return strength*Math.max(0,vec.dot(direction))*Math.max(0,vec.dot(half))**power;};
  let spec=specular(lighting?.sun??sun,lighting?.direct??1.05)+specular(lighting?.rimDirection??rim,lighting?.rim??.38);
  if(lighting?.softbox)spec+=specular(lighting.softbox,1.12)+specular(lighting.bounce,.68);
  intensity[i]=intensity[i]*(1-metal)+metal*((lighting?.ambient??.33)+.5*spec);
 }
}
const physical=gain&&mat.toneMapped!==false&&(mat.isMeshStandardMaterial||glow||mat.userData.celestial);
const texel=mat.map?.colorSpace===T.SRGBColorSpace?srgbBytes:linearBytes;
const wireColor=mat.wireframe?color.getHex():0;
const nearU=[0,0],nearV=[0,0];
function triangle(ia,ib,ic){
 const A=ia*4,B=ib*4,C=ic*4,x0=a[A],y0=a[A+1],x1=a[B],y1=a[B+1],x2=a[C],y2=a[C+1],den=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2);
 if(Math.abs(den)<.02||den>0&&mat.side===T.FrontSide||den<0&&mat.side===T.BackSide)return;
 if(mat.wireframe){drawLine(a,A,B,wireColor,mat);drawLine(a,B,C,wireColor,mat);drawLine(a,C,A,wireColor,mat);return;}
 const xlo=Math.max(0,Math.ceil(Math.min(x0,x1,x2)-.5)),xhi=Math.min(width-1,Math.floor(Math.max(x0,x1,x2)-.5)),ylo=Math.max(0,Math.ceil(Math.min(y0,y1,y2)-.5)),yhi=Math.min(height-1,Math.floor(Math.max(y0,y1,y2)-.5));
 if(xlo>xhi||ylo>yhi)return;
 const la=intensity?intensity[ia]:1,lb=intensity?intensity[ib]:1,lc=intensity?intensity[ic]:1;const ca=(y1-y2)/den,cb=(y2-y0)/den,da=(x2-x1)/den,db=(x0-x2)/den,za=a[A+2],zb=a[B+2],zc=a[C+2];let ua=0,ub=0,uc=0,va=0,vb=0,vc=0;let texture=baseTexture;if(texture&&uv){ua=ia<n?uv.getX(ia):nearU[ia-n];ub=ib<n?uv.getX(ib):nearU[ib-n];uc=ic<n?uv.getX(ic):nearU[ic-n];va=ia<n?uv.getY(ia):nearV[ia-n];vb=ib<n?uv.getY(ib):nearV[ib-n];vc=ic<n?uv.getY(ic):nearV[ic-n];const footprint=Math.max(Math.abs((ua-uc)*ca+(ub-uc)*cb)*texture.width,Math.abs((ua-uc)*da+(ub-uc)*db)*texture.width,Math.abs((va-vc)*ca+(vb-vc)*cb)*texture.height,Math.abs((va-vc)*da+(vb-vc)*db)*texture.height);if(footprint*Math.max(Math.abs(tm[0]),Math.abs(tm[4]))>2)texture=imageData(mat.map,Math.min(9,Math.max(0,Math.round(Math.log2(footprint*Math.max(Math.abs(tm[0]),Math.abs(tm[4])))))));}
// Match polygon offset in normalized depth; markings remain on the hull.
const depthOffset=mat.polygonOffset?mat.polygonOffsetFactor*Math.max(Math.abs((za-zc)*ca+(zb-zc)*cb),Math.abs((za-zc)*da+(zb-zc)*db))+mat.polygonOffsetUnits/8388608:0;
for(let y=ylo;y<=yhi;y++){let w0=ca*(xlo+.5-x2)+da*(y+.5-y2),w1=cb*(xlo+.5-x2)+db*(y+.5-y2);for(let x=xlo;x<=xhi;x++,w0+=ca,w1+=cb){const w2=1-w0-w1;if(w0<-.001||w1<-.001||w2<-.001)continue;const z=za*w0+zb*w1+zc*w2+depthOffset,k=y*width+x;if((mat.depthTest!==false&&z>=depth[k])||z< -1||z>1)continue;const light=lc+w0*(la-lc)+w1*(lb-lc);let rr=color.r*light,gg=color.g*light,bb=color.b*light;
 let alpha=opacity;
 if(glow){
  alpha=glow[ia]*w0+glow[ib]*w1+glow[ic]*w2;if(alpha<.003)continue;
  if(physical){const tint=mat.uniforms.tint.value;rr=tint.r;gg=tint.g;bb=tint.b;}
  else{rr=115;gg=181;bb=231;}
 }else if(texture){
  const wa=w0/a[A+3],wb=w1/a[B+3],wc=w2/a[C+3],ws=wa+wb+wc,rawU=(ua*wa+ub*wb+uc*wc)/ws,rawV=(va*wa+vb*wb+vc*wc)/ws;
  const u=wrap(tm[0]*rawU+tm[3]*rawV+tm[6],mat.map.wrapS),uvV=wrap(tm[1]*rawU+tm[4]*rawV+tm[7],mat.map.wrapT),v=mat.map.flipY?uvV:1-uvV;
  const tw=texture.width,th=texture.height,data=texture.data;
  if(smoothMap){
   // Longitudes wrap at the date line. Orbital textures interpolate in linear light.
   const fx=u*tw-.5,fy=Math.min(th-1,Math.max(0,(1-v)*th-.5)),left=Math.floor(fx),y0=Math.floor(fy),dx=fx-left,dy=fy-y0;
   const repeat=mat.map.wrapS===T.RepeatWrapping,x0=repeat?(left+tw)%tw:Math.max(0,Math.min(tw-1,left)),x1=repeat?(x0+1)%tw:Math.min(tw-1,Math.max(0,left+1)),y1=Math.min(th-1,y0+1);
   const a0=(y0*tw+x0)*4,b0=(y0*tw+x1)*4,c0=(y1*tw+x0)*4,d0=(y1*tw+x1)*4;
   const av=(1-dx)*(1-dy),bv=dx*(1-dy),cv=(1-dx)*dy,dv=dx*dy;
   alpha*=(data[a0+3]*av+data[b0+3]*bv+data[c0+3]*cv+data[d0+3]*dv)/255;if(alpha<Math.max(.003,mat.alphaTest||0))continue;
   if(physical){
    rr*=texel[data[a0]]*av+texel[data[b0]]*bv+texel[data[c0]]*cv+texel[data[d0]]*dv;
    gg*=texel[data[a0+1]]*av+texel[data[b0+1]]*bv+texel[data[c0+1]]*cv+texel[data[d0+1]]*dv;
    bb*=texel[data[a0+2]]*av+texel[data[b0+2]]*bv+texel[data[c0+2]]*cv+texel[data[d0+2]]*dv;
   }else{
    const illum=light**.45;
    rr=illum*(data[a0]*av+data[b0]*bv+data[c0]*cv+data[d0]*dv)*tintR;
    gg=illum*(data[a0+1]*av+data[b0+1]*bv+data[c0+1]*cv+data[d0+1]*dv)*tintG;
    bb=illum*(data[a0+2]*av+data[b0+2]*bv+data[c0+2]*cv+data[d0+2]*dv)*tintB;
   }
  }else{
   const tx=Math.max(0,Math.min(tw-1,Math.floor(u*tw))),ty=Math.max(0,Math.min(th-1,Math.floor((1-v)*th))),q=(ty*tw+tx)*4;
   alpha*=data[q+3]/255;if(alpha<Math.max(.003,mat.alphaTest||0))continue;
   if(physical){rr*=texel[data[q]];gg*=texel[data[q+1]];bb*=texel[data[q+2]];}
   else{const illum=light**.45;rr=data[q]*illum*tintR;gg=data[q+1]*illum*tintG;bb=data[q+2]*illum*tintB;}
  }
 }else if(!physical){rr=display(rr);gg=display(gg);bb=display(bb);}
 if(vertexColor){
  const red=vertexColor[ia*3]*w0+vertexColor[ib*3]*w1+vertexColor[ic*3]*w2,green=vertexColor[ia*3+1]*w0+vertexColor[ib*3+1]*w1+vertexColor[ic*3+1]*w2,blue=vertexColor[ia*3+2]*w0+vertexColor[ib*3+2]*w1+vertexColor[ic*3+2]*w2;
  rr*=physical?red:display(red)/255;gg*=physical?green:display(green)/255;bb*=physical?blue:display(blue)/255;
 }
 if(physical){filmic(encoded,rr,gg,bb,gain);rr=encoded[0];gg=encoded[1];bb=encoded[2];}
 if(fog&&mat.fog!==false&&camera.isPerspectiveCamera){
  const distance=1/(w0/a[A+3]+w1/a[B+3]+w2/a[C+3]);
  const f=fog.isFogExp2?1-Math.exp(-fog.density*fog.density*distance*distance):Math.max(0,Math.min(1,(distance-fog.near)/(fog.far-fog.near)));
  const weight=fog.isFogExp2?f:f*f*(3-2*f);rr+=(fogColor[0]-rr)*weight;gg+=(fogColor[1]-gg)*weight;bb+=(fogColor[2]-bb)*weight;
 }
 if(mat.userData.hatch?.value){const phase=((x+y)*canvas.width/width)%9,stripe=phase<1?.72:phase<2?(2-phase)*.72:0;rr+=(255-rr)*stripe;gg+=(255-gg)*stripe;bb+=(255-bb)*stripe;}const kk=k*4,dst=img[kk+3]/255,coverage=alpha+dst*(1-alpha);
 if(coverage>0&&alpha<1){const w=alpha/coverage,v=1-w;rr=img[kk]*v+rr*w;gg=img[kk+1]*v+gg*w;bb=img[kk+2]*v+bb*w;}
 img[kk]=rr;img[kk+1]=gg;img[kk+2]=bb;img[kk+3]=255*coverage;if(mat.depthWrite!==false&&mat.depthTest!==false)depth[k]=z;}}}
 function distance(i){
  return (e[2]+e[3])*p.getX(i)+(e[6]+e[7])*p.getY(i)+(e[10]+e[11])*p.getZ(i)+e[14]+e[15];
 }
 function intersection(q,left,right,f){
  const u=1-f;project(n+q,u*p.getX(left)+f*p.getX(right),u*p.getY(left)+f*p.getY(right),u*p.getZ(left)+f*p.getZ(right));
  a[(n+q)*4+2]=-1;
  if(uv){nearU[q]=u*uv.getX(left)+f*uv.getX(right);nearV[q]=u*uv.getY(left)+f*uv.getY(right);}
  if(intensity)intensity[n+q]=u*intensity[left]+f*intensity[right];
  if(glow)glow[n+q]=u*glow[left]+f*glow[right];
  if(vertexColor)for(let channel=0;channel<3;channel++)vertexColor[(n+q)*3+channel]=u*vertexColor[left*3+channel]+f*vertexColor[right*3+channel];
  return n+q;
 }
 for(let j=g.drawRange.start,end=Math.min(total,g.drawRange.start+g.drawRange.count);j+2<end;j+=3){
  const i=ix?ix[j]:j,b=ix?ix[j+1]:j+1,c=ix?ix[j+2]:j+2;
  if(!crossesNear||a[4*i+3]>0&&a[4*b+3]>0&&a[4*c+3]>0&&a[4*i+2]>=-1&&a[4*b+2]>=-1&&a[4*c+2]>=-1){triangle(i,b,c);continue;}
  const polygon=[];let prev=c,d0=distance(c),cut=0;
  for(const curr of [i,b,c]){
   const d1=distance(curr);
   if((d0<0)!==(d1<0))polygon.push(intersection(cut++,prev,curr,d0/(d0-d1)));
   if(d1>=0)polygon.push(curr);
   prev=curr;d0=d1;
  }
  for(let k=2;k<polygon.length;k++)triangle(polygon[0],polygon[k-1],polygon[k]);
 }
};

 // The room, ground equipment and solid subsystem parts establish depth.
 // All translucent geometry uses Three.js's render order and far-to-near ordering.
 const translucent=[];
 scene.traverseVisible(o=>{
  const m=o.material;if(!m||!o.geometry)return;
  if(!m.transparent){draw(o);return;}
  const g=o.geometry;if(!g.boundingSphere)g.computeBoundingSphere();
  const z=vec.copy(g.boundingSphere.center).applyMatrix4(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse).z;
  translucent.push({o,z});
 });
 translucent.sort((a,b)=>a.o.renderOrder-b.o.renderOrder||a.z-b.z||a.o.id-b.o.id);
 for(const {o} of translucent)draw(o);
raster.putImageData(frame,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(aa,0,0,canvas.width,canvas.height);},dispose(){depth=null;frame=null;}};}
