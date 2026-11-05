// Deterministic, depth-buffered triangle renderer for devices without WebGL.
// Reads the same Three.js geometry, transforms, camera and UV textures as the GPU path.
import * as T from './vendor/three.module.js';
const pixels=new WeakMap(),lut=new Uint8ClampedArray(2049);for(let i=0;i<=2048;i++){let x=i/2048;lut[i]=255*(x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055);}
function imageData(map,level=0){let img=map?.image;if(!img||!(img.width&&img.height))return null;if(!pixels.has(img))pixels.set(img,[]);let levels=pixels.get(img);if(levels[level])return levels[level];const c=document.createElement('canvas');c.width=Math.max(1,img.width>>level);c.height=Math.max(1,img.height>>level);let ctx=c.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(img,0,0,c.width,c.height);const r=ctx.getImageData(0,0,c.width,c.height);levels[level]=r;return r;}
const vec=new T.Vector3(),mvp=new T.Matrix4(),normMat=new T.Matrix3(),sun=new T.Vector3(-3,6,4).normalize(),rim=new T.Vector3(4,1,-3).normalize();
export function softRenderer(canvas){let width=1,height=1,depth,frame;const ctx=canvas.getContext('2d',{alpha:true}),aa=document.createElement('canvas'),raster=aa.getContext('2d',{alpha:true});return{setSize(w,h){const samples=w*h<460000?1.4:1;canvas.width=Math.round(w);canvas.height=Math.round(h);width=aa.width=Math.max(1,Math.round(w*samples));height=aa.height=Math.max(1,Math.round(h*samples));depth=new Float32Array(width*height);frame=ctx.createImageData(width,height);},render(scene,camera,keepColor=false){if(!frame)return;let img=frame.data;if(!keepColor)img.fill(0);depth.fill(Infinity);scene.updateMatrixWorld(true);camera.updateMatrixWorld();const lighting=scene.userData.lightState;const vp=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),lines=[];
const draw=o=>{if(!o.isMesh&&!o.isLine&&!o.isPoints)return;const g=o.geometry,p=g.attributes.position,mat=o.material;if(!p||!mat||Array.isArray(mat))return;mvp.multiplyMatrices(vp,o.matrixWorld);normMat.getNormalMatrix(o.matrixWorld);const e=mvp.elements,n=p.count;let a=new Float32Array(n*4);for(let i=0;i<n;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i),cw=e[3]*x+e[7]*y+e[11]*z+e[15],k=i*4;a[k]=((e[0]*x+e[4]*y+e[8]*z+e[12])/cw*.5+.5)*width;a[k+1]=(.5-(e[1]*x+e[5]*y+e[9]*z+e[13])/cw*.5)*height;a[k+2]=(e[2]*x+e[6]*y+e[10]*z+e[14])/cw;a[k+3]=cw;}
const ix=g.index?.array,total=ix?.length??n,color=mat.color??new T.Color('#78a9c9');if(o.isPoints){for(let j=0;j<n;j++){
 const k=4*j,x=Math.round(a[k]),y=Math.round(a[k+1]),z=a[k+2],i=y*width+x;
 if(a[k+3]<=0||x<0||x>=width||y<0||y>=height||z>1||z< -1||z>=depth[i])continue;
 const px=4*i,c=color.getHex();img[px]=c>>16;img[px+1]=c>>8&255;img[px+2]=c&255;img[px+3]=(mat.opacity??1)*255;
 }return;}if(o.isLine){let step=o.isLineSegments?2:1;for(let j=g.drawRange.start,end=Math.min(total,g.drawRange.start+g.drawRange.count);j<end-1;j+=step){let k=(ix?ix[j]:j)*4,l=(ix?ix[j+1]:j+1)*4;if(a[k+3]>0&&a[l+3]>0)lines.push([a[k],a[k+1],a[k+2],a[l],a[l+1],a[l+2],color.getHex(),mat.opacity]);}return;}
const uv=g.attributes.uv,normal=g.attributes.normal,baseTexture=imageData(mat.map),opacity=mat.opacity??1,smoothMap=mat.userData.globeTexture;
const intensity=normal&&mat.isMeshStandardMaterial?new Float32Array(n):null;
const glow=mat.userData.airglow?new Float32Array(n):null;
if(glow){const norm=new T.Vector3(),toEye=new T.Vector3();for(let i=0;i<n;i++){
 norm.fromBufferAttribute(normal,i).applyMatrix3(normMat).normalize();toEye.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).sub(camera.position).normalize();
 const l=Math.min(1,Math.max(0,(norm.dot(lighting?.sun??sun)+.22)/.40));
 glow[i]=Math.pow(1-Math.abs(norm.dot(toEye)),5)*(.060+.65*l*l*(3-2*l));
}}
if(intensity)for(let i=0;i<n;i++){vec.fromBufferAttribute(normal,i).applyMatrix3(normMat).normalize();intensity[i]=(lighting?.ambient??.33)+(lighting?.direct??1.05)*Math.max(0,vec.dot(lighting?.sun??sun))+(lighting?.rim??.38)*Math.max(0,vec.dot(rim));}
for(let j=0;j<total;j+=3){let ia=ix?ix[j]:j,ib=ix?ix[j+1]:j+1,ic=ix?ix[j+2]:j+2;let A=ia*4,B=ib*4,C=ic*4;if(a[A+3]<=0||a[B+3]<=0||a[C+3]<=0)continue;const x0=a[A],y0=a[A+1],x1=a[B],y1=a[B+1],x2=a[C],y2=a[C+1],den=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2);if(Math.abs(den)<.02||den>0&&mat.side===T.FrontSide||den<0&&mat.side===T.BackSide)continue;
const xlo=Math.max(0,Math.ceil(Math.min(x0,x1,x2)-.5)),xhi=Math.min(width-1,Math.floor(Math.max(x0,x1,x2)-.5)),ylo=Math.max(0,Math.ceil(Math.min(y0,y1,y2)-.5)),yhi=Math.min(height-1,Math.floor(Math.max(y0,y1,y2)-.5));if(xlo>xhi||ylo>yhi)continue;const la=intensity?intensity[ia]:1,lb=intensity?intensity[ib]:1,lc=intensity?intensity[ic]:1;const ca=(y1-y2)/den,cb=(y2-y0)/den,da=(x2-x1)/den,db=(x0-x2)/den,za=a[A+2],zb=a[B+2],zc=a[C+2];let ua=0,ub=0,uc=0,va=0,vb=0,vc=0;let texture=baseTexture;if(texture&&uv){ua=uv.getX(ia);ub=uv.getX(ib);uc=uv.getX(ic);va=uv.getY(ia);vb=uv.getY(ib);vc=uv.getY(ic);const footprint=Math.max(Math.abs((ua-uc)*ca+(ub-uc)*cb)*texture.width,Math.abs((ua-uc)*da+(ub-uc)*db)*texture.width,Math.abs((va-vc)*ca+(vb-vc)*cb)*texture.height,Math.abs((va-vc)*da+(vb-vc)*db)*texture.height);if(footprint>2)texture=imageData(mat.map,Math.min(9,Math.max(0,Math.round(Math.log2(footprint)))));}
for(let y=ylo;y<=yhi;y++){let w0=ca*(xlo+.5-x2)+da*(y+.5-y2),w1=cb*(xlo+.5-x2)+db*(y+.5-y2);for(let x=xlo;x<=xhi;x++,w0+=ca,w1+=cb){const w2=1-w0-w1;if(w0<-.001||w1<-.001||w2<-.001)continue;const z=za*w0+zb*w1+zc*w2,k=y*width+x;if(z>=depth[k]||z< -1||z>1)continue;const light=lc+w0*(la-lc)+w1*(lb-lc);let rr=lut[Math.min(2048,Math.round(color.r*light*2048))],gg=lut[Math.min(2048,Math.round(color.g*light*2048))],bb=lut[Math.min(2048,Math.round(color.b*light*2048))];let alpha=opacity;if(glow){rr=115;gg=181;bb=231;alpha=glow[ia]*w0+glow[ib]*w1+glow[ic]*w2;if(alpha<.003)continue;}if(texture){const wa=w0/a[A+3],wb=w1/a[B+3],wc=w2/a[C+3],ws=wa+wb+wc,u=(ua*wa+ub*wb+uc*wc)/ws,v=(va*wa+vb*wb+vc*wc)/ws;
 const tw=texture.width,th=texture.height,data=texture.data,illum=light**.45;
 if(smoothMap){
  // Longitude repeats across the date line. Sample at texel centers so a
  // several-pixel ground texel advances continuously under a near-orbit view.
  const fx=u*tw-.5,fy=Math.min(th-1,Math.max(0,(1-v)*th-.5)),left=Math.floor(fx),y0=Math.floor(fy),dx=fx-left,dy=fy-y0;
  const x0=(left+tw)%tw,x1=(x0+1)%tw,y1=Math.min(th-1,y0+1);
  const a0=(y0*tw+x0)*4,b0=(y0*tw+x1)*4,c0=(y1*tw+x0)*4,d0=(y1*tw+x1)*4;
  const av=(1-dx)*(1-dy)*illum,bv=dx*(1-dy)*illum,cv=(1-dx)*dy*illum,dv=dx*dy*illum;
  rr=data[a0]*av+data[b0]*bv+data[c0]*cv+data[d0]*dv;
  gg=data[a0+1]*av+data[b0+1]*bv+data[c0+1]*cv+data[d0+1]*dv;
  bb=data[a0+2]*av+data[b0+2]*bv+data[c0+2]*cv+data[d0+2]*dv;
 }else{
  const tx=Math.max(0,Math.min(tw-1,Math.floor(u*tw))),ty=Math.max(0,Math.min(th-1,Math.floor((1-v)*th))),q=(ty*tw+tx)*4;
  alpha*=data[q+3]/255;if(alpha<.003)continue;rr=data[q]*illum;gg=data[q+1]*illum;bb=data[q+2]*illum;
 }}if(mat.userData.hatch?.value){const phase=((x+y)*canvas.width/width)%9,stripe=phase<1?.72:phase<2?(2-phase)*.72:0;rr+=(255-rr)*stripe;gg+=(255-gg)*stripe;bb+=(255-bb)*stripe;}let kk=k*4;if(alpha<1){if(img[kk+3]){rr=img[kk]*(1-alpha)+rr*alpha;gg=img[kk+1]*(1-alpha)+gg*alpha;bb=img[kk+2]*(1-alpha)+bb*alpha;}}img[kk]=rr;img[kk+1]=gg;img[kk+2]=bb;img[kk+3]=Math.max(img[kk+3],alpha*255);if(mat.depthWrite!==false)depth[k]=z;}}}}
;const context=[],focused=[];scene.traverseVisible(o=>{if(o.material?.userData.domainGhost){context.push(o);return;}if(o.material?.userData.domainFront){focused.push(o);return;}draw(o);});for(const o of context)draw(o);for(const o of focused)draw(o);
for(const [x0,y0,z0,x1,y1,z1,c,opacity] of lines){let dx=x1-x0,dy=y1-y0,steps=Math.min(4000,Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy)))));for(let j=0;j<=steps;j++){let f=j/steps,x=Math.round(x0+dx*f),y=Math.round(y0+dy*f);if(x<0||x>=width||y<0||y>=height)continue;let i=y*width+x,kk=i*4;if(z0+(z1-z0)*f>depth[i]+.00007)continue;let op=opacity??1,af=img[kk+3]?op:1;img[kk]=img[kk]*(1-af)+(c>>16)*af;img[kk+1]=img[kk+1]*(1-af)+(c>>8&255)*af;img[kk+2]=img[kk+2]*(1-af)+(c&255)*af;img[kk+3]=Math.max(img[kk+3],op*255);}}
raster.putImageData(frame,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(aa,0,0,canvas.width,canvas.height);},dispose(){depth=null;frame=null;}};}
