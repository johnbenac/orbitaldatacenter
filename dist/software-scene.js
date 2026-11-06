// Deterministic, depth-buffered triangle renderer for devices without WebGL.
// Reads the same Three.js geometry, transforms, camera and UV textures as the GPU path.
import * as T from './vendor/three.module.js';
const pixels=new WeakMap(),lut=new Uint8ClampedArray(2049);for(let i=0;i<=2048;i++){let x=i/2048;lut[i]=255*(x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055);}
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
function imageData(map,level=0){let img=map?.image;if(!img||!(img.width&&img.height))return null;if(!pixels.has(img))pixels.set(img,[]);let levels=pixels.get(img);if(levels[level])return levels[level];const c=document.createElement('canvas');c.width=Math.max(1,img.width>>level);c.height=Math.max(1,img.height>>level);let ctx=c.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(img,0,0,c.width,c.height);const r=ctx.getImageData(0,0,c.width,c.height);levels[level]=r;return r;}
const vec=new T.Vector3(),mvp=new T.Matrix4(),normMat=new T.Matrix3(),sun=new T.Vector3(-3,6,4).normalize(),rim=new T.Vector3(4,1,-3).normalize();
export function softRenderer(canvas){let width=1,height=1,depth,frame;const ctx=canvas.getContext('2d',{alpha:true}),aa=document.createElement('canvas'),raster=aa.getContext('2d',{alpha:true});return{setSize(w,h){const samples=w*h<460000?1.4:1;canvas.width=Math.round(w);canvas.height=Math.round(h);width=aa.width=Math.max(1,Math.round(w*samples));height=aa.height=Math.max(1,Math.round(h*samples));depth=new Float32Array(width*height);frame=ctx.createImageData(width,height);},render(scene,camera,keepColor=false){if(!frame)return;let img=frame.data;if(!keepColor)img.fill(0);depth.fill(Infinity);scene.updateMatrixWorld(true);camera.updateMatrixWorld();const lighting=scene.userData.lightState;
const ev=scene.userData.exposureEV,gain=Number.isFinite(ev)?(1.16/.6)*2**ev:0,encoded=[0,0,0];
const vp=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
// Lines share the same depth buffer and material order as triangle surfaces.
function drawLine(a,k,l,c,mat){
 const dx=a[l]-a[k],dy=a[l+1]-a[k+1],steps=Math.min(4000,Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy)))));
 for(let j=0;j<=steps;j++){
  const f=j/steps,x=Math.round(a[k]+dx*f),y=Math.round(a[k+1]+dy*f);
  if(x<0||x>=width||y<0||y>=height)continue;
  const i=y*width+x,z=a[k+2]+(a[l+2]-a[k+2])*f;
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
const draw=o=>{if(!o.isMesh&&!o.isLine&&!o.isPoints)return;const g=o.geometry,p=g.attributes.position,mat=o.material;if(!p||!mat||Array.isArray(mat))return;mvp.multiplyMatrices(vp,o.matrixWorld);normMat.getNormalMatrix(o.matrixWorld);const e=mvp.elements,n=p.count;// Two scratch vertices hold near-plane intersections. Use homogeneous
// clipping before dividing by w so a wall touching the eye cannot disappear.
const a=new Float32Array((n+2)*4);let crossesNear=false;
function project(i,x,y,z){
 const k=i*4,w=e[3]*x+e[7]*y+e[11]*z+e[15],clipZ=e[2]*x+e[6]*y+e[10]*z+e[14],inv=w?1/w:0;
 a[k]=((e[0]*x+e[4]*y+e[8]*z+e[12])*inv*.5+.5)*width;
 a[k+1]=(.5-(e[1]*x+e[5]*y+e[9]*z+e[13])*inv*.5)*height;
 a[k+2]=clipZ*inv;a[k+3]=w;
 return clipZ+w;
}
for(let i=0;i<n;i++)if(project(i,p.getX(i),p.getY(i),p.getZ(i))<0)crossesNear=true;
const ix=g.index?.array,total=ix?.length??n,color=mat.color??new T.Color('#78a9c9');if(o.isPoints){
 const hex=color.getHex();
 let red=hex>>16,green=hex>>8&255,blue=hex&255;
 if(gain&&mat.toneMapped!==false){filmic(encoded,color.r,color.g,color.b,gain);[red,green,blue]=encoded;}
 for(let j=0;j<n;j++){
 const k=4*j,x=Math.round(a[k]),y=Math.round(a[k+1]),z=a[k+2],i=y*width+x;
 if(a[k+3]<=0||x<0||x>=width||y<0||y>=height||z>1||z< -1||z>=depth[i])continue;
 const px=4*i;img[px]=red;img[px+1]=green;img[px+2]=blue;img[px+3]=(mat.opacity??1)*255;
 }return;}if(o.isLine){let step=o.isLineSegments?2:1;for(let j=g.drawRange.start,end=Math.min(total,g.drawRange.start+g.drawRange.count);j<end-1;j+=step){let k=(ix?ix[j]:j)*4,l=(ix?ix[j+1]:j+1)*4;if(a[k+3]>0&&a[l+3]>0)drawLine(a,k,l,color.getHex(),mat);}return;}
const uv=g.attributes.uv,normal=g.attributes.normal,baseTexture=imageData(mat.map),opacity=mat.opacity??1,smoothMap=mat.userData.globeTexture;
const intensity=normal&&mat.isMeshStandardMaterial?new Float32Array(n+2):null;
const glow=mat.userData.airglow?new Float32Array(n+2):null;
if(glow){const norm=new T.Vector3(),toEye=new T.Vector3();for(let i=0;i<n;i++){
 norm.fromBufferAttribute(normal,i).applyMatrix3(normMat).normalize();toEye.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).sub(camera.position).normalize();
 const l=Math.min(1,Math.max(0,(norm.dot(lighting?.sun??sun)+.22)/.40));
 glow[i]=Math.pow(1-Math.abs(norm.dot(toEye)),5)*(.060+.65*l*l*(3-2*l));
}}
if(intensity)for(let i=0;i<n;i++){vec.fromBufferAttribute(normal,i).applyMatrix3(normMat).normalize();intensity[i]=(lighting?.ambient??.33)+(lighting?.direct??1.05)*Math.max(0,vec.dot(lighting?.sun??sun))+(lighting?.rim??.38)*Math.max(0,vec.dot(lighting?.rimDirection??rim));
 if(lighting?.softbox)intensity[i]+=1.12*Math.max(0,vec.dot(lighting.softbox))+.68*Math.max(0,vec.dot(lighting.bounce));
}
const physical=gain&&mat.toneMapped!==false&&(mat.isMeshStandardMaterial||glow||mat.userData.celestial);
const texel=mat.map?.colorSpace===T.SRGBColorSpace?srgbBytes:linearBytes;
const nearU=[0,0],nearV=[0,0];
function triangle(ia,ib,ic){
 const A=ia*4,B=ib*4,C=ic*4,x0=a[A],y0=a[A+1],x1=a[B],y1=a[B+1],x2=a[C],y2=a[C+1],den=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2);
 if(Math.abs(den)<.02||den>0&&mat.side===T.FrontSide||den<0&&mat.side===T.BackSide)return;
 const xlo=Math.max(0,Math.ceil(Math.min(x0,x1,x2)-.5)),xhi=Math.min(width-1,Math.floor(Math.max(x0,x1,x2)-.5)),ylo=Math.max(0,Math.ceil(Math.min(y0,y1,y2)-.5)),yhi=Math.min(height-1,Math.floor(Math.max(y0,y1,y2)-.5));
 if(xlo>xhi||ylo>yhi)return;
 const la=intensity?intensity[ia]:1,lb=intensity?intensity[ib]:1,lc=intensity?intensity[ic]:1;const ca=(y1-y2)/den,cb=(y2-y0)/den,da=(x2-x1)/den,db=(x0-x2)/den,za=a[A+2],zb=a[B+2],zc=a[C+2];let ua=0,ub=0,uc=0,va=0,vb=0,vc=0;let texture=baseTexture;if(texture&&uv){ua=ia<n?uv.getX(ia):nearU[ia-n];ub=ib<n?uv.getX(ib):nearU[ib-n];uc=ic<n?uv.getX(ic):nearU[ic-n];va=ia<n?uv.getY(ia):nearV[ia-n];vb=ib<n?uv.getY(ib):nearV[ib-n];vc=ic<n?uv.getY(ic):nearV[ic-n];const footprint=Math.max(Math.abs((ua-uc)*ca+(ub-uc)*cb)*texture.width,Math.abs((ua-uc)*da+(ub-uc)*db)*texture.width,Math.abs((va-vc)*ca+(vb-vc)*cb)*texture.height,Math.abs((va-vc)*da+(vb-vc)*db)*texture.height);if(footprint>2)texture=imageData(mat.map,Math.min(9,Math.max(0,Math.round(Math.log2(footprint)))));}
for(let y=ylo;y<=yhi;y++){let w0=ca*(xlo+.5-x2)+da*(y+.5-y2),w1=cb*(xlo+.5-x2)+db*(y+.5-y2);for(let x=xlo;x<=xhi;x++,w0+=ca,w1+=cb){const w2=1-w0-w1;if(w0<-.001||w1<-.001||w2<-.001)continue;const z=za*w0+zb*w1+zc*w2,k=y*width+x;if((mat.depthTest!==false&&z>=depth[k])||z< -1||z>1)continue;const light=lc+w0*(la-lc)+w1*(lb-lc);let rr=color.r*light,gg=color.g*light,bb=color.b*light;
 let alpha=opacity;
 if(glow){
  alpha=glow[ia]*w0+glow[ib]*w1+glow[ic]*w2;if(alpha<.003)continue;
  if(physical){const tint=mat.uniforms.tint.value;rr=tint.r;gg=tint.g;bb=tint.b;}
  else{rr=115;gg=181;bb=231;}
 }else if(texture){
  const wa=w0/a[A+3],wb=w1/a[B+3],wc=w2/a[C+3],ws=wa+wb+wc,u=(ua*wa+ub*wb+uc*wc)/ws,v=(va*wa+vb*wb+vc*wc)/ws;
  const tw=texture.width,th=texture.height,data=texture.data;
  if(smoothMap){
   // Longitudes wrap at the date line. Orbital textures interpolate in linear light.
   const fx=u*tw-.5,fy=Math.min(th-1,Math.max(0,(1-v)*th-.5)),left=Math.floor(fx),y0=Math.floor(fy),dx=fx-left,dy=fy-y0;
   const x0=(left+tw)%tw,x1=(x0+1)%tw,y1=Math.min(th-1,y0+1);
   const a0=(y0*tw+x0)*4,b0=(y0*tw+x1)*4,c0=(y1*tw+x0)*4,d0=(y1*tw+x1)*4;
   const av=(1-dx)*(1-dy),bv=dx*(1-dy),cv=(1-dx)*dy,dv=dx*dy;
   if(physical){
    rr*=texel[data[a0]]*av+texel[data[b0]]*bv+texel[data[c0]]*cv+texel[data[d0]]*dv;
    gg*=texel[data[a0+1]]*av+texel[data[b0+1]]*bv+texel[data[c0+1]]*cv+texel[data[d0+1]]*dv;
    bb*=texel[data[a0+2]]*av+texel[data[b0+2]]*bv+texel[data[c0+2]]*cv+texel[data[d0+2]]*dv;
   }else{
    const illum=light**.45;
    rr=illum*(data[a0]*av+data[b0]*bv+data[c0]*cv+data[d0]*dv);
    gg=illum*(data[a0+1]*av+data[b0+1]*bv+data[c0+1]*cv+data[d0+1]*dv);
    bb=illum*(data[a0+2]*av+data[b0+2]*bv+data[c0+2]*cv+data[d0+2]*dv);
   }
  }else{
   const tx=Math.max(0,Math.min(tw-1,Math.floor(u*tw))),ty=Math.max(0,Math.min(th-1,Math.floor((1-v)*th))),q=(ty*tw+tx)*4;
   alpha*=data[q+3]/255;if(alpha<.003)continue;
   if(physical){rr*=texel[data[q]];gg*=texel[data[q+1]];bb*=texel[data[q+2]];}
   else{const illum=light**.45;rr=data[q]*illum;gg=data[q+1]*illum;bb=data[q+2]*illum;}
  }
 }else if(!physical){rr=display(rr);gg=display(gg);bb=display(bb);}
 if(physical){filmic(encoded,rr,gg,bb,gain);rr=encoded[0];gg=encoded[1];bb=encoded[2];}
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
