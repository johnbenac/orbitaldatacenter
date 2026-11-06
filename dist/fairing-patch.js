// Artwork follows the launcher mold line. Each mesh belongs to exactly one
// separable shell or retained door, so its UVs and motion stay with that skin.
import * as T from './vendor/three.module.js';

export function missionPatchMaterial(repaint){
 const m=new T.MeshStandardMaterial({color:0xffffff,roughness:.75,transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 if(typeof Image!=='undefined'){
  m.map=new T.TextureLoader().load(new URL('./mission-patch-512.png',import.meta.url).href,()=>{
   m.opacity=1;repaint?.();
  });
  m.map.colorSpace=T.SRGBColorSpace;m.map.anisotropy=8;
 }
 return m;
}
export function mountMissionPatch(surface,profile,azimuth,height,size,material){
 const low=height-size/2,high=height+size/2;
 function radius(y){
  for(let j=1;j<profile.length;j++){
   const [r0,h0]=profile[j-1],[r1,h1]=profile[j];
   if(y<=h1&&h1>h0)return r0+(r1-r0)*(y-h0)/(h1-h0);
  }
  return profile.at(-1)[0];
 }
 const r=radius(height),stations=[low,...profile.map(p=>p[1]).filter(y=>low<y&&y<high),high];
 const xyz=[],uv=[],index=[],n=28;
 for(let j=0;j<stations.length;j++){
  const y=stations[j],ry=radius(y)+.0015;
  for(let i=0;i<=n;i++){
   const u=i/n,a=azimuth+(u-.5)*size/r;
   xyz.push(ry*Math.sin(a),y,ry*Math.cos(a));uv.push(u,(y-low)/size);
   if(j&&i){const b=j*(n+1)+i;index.push(b-n-2,b-n-1,b,b-n-2,b,b-1);}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(xyz,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();
 const decal=new T.Mesh(g,material);decal.name='Mission patch';decal.userData.missionPatch=true;
 decal.renderOrder=3;decal.receiveShadow=true;decal.castShadow=false;
 surface.add(decal);return decal;
}
