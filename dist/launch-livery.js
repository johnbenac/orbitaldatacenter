// The artwork identifies the real carrier and its manufacturer. Placement on
// this configurable vehicle is a visual study, not a flight-specific paint plan.
// Source artwork and the reproducible surface-map recipe are documented beside
// the assets. Every GPU resource belongs to one makeLaunch() assembly.
import * as T from './vendor/three.module.js';

const TAU=2*Math.PI,root=new URL('./assets/launch-vehicles/',import.meta.url);
const families={
 terran:{provider:'Relativity Space',vehicle:'TERRAN R',manufacturer:'Relativity Space',finish:'aluminium',ink:'#25323b',mark:'relativity.svg',aspect:4.33,country:'us',source:'https://www.relativityspace.com/terran-r/'},
 glenn:{provider:'Blue Origin',vehicle:'NEW GLENN',manufacturer:'Blue Origin',finish:'paint',ink:'#123b72',mark:'blue-origin.svg',aspect:5.91,country:'us',source:'https://www.blueorigin.com/new-glenn'},
 starship:{provider:'SpaceX',vehicle:'STARSHIP',manufacturer:'SpaceX',finish:'stainless',ink:'#1b2730',mark:'spacex.svg',aspect:8,country:'us',source:'https://www.spacex.com/vehicles/starship/'},
 falconHeavy:{provider:'SpaceX',vehicle:'FALCON HEAVY',manufacturer:'SpaceX',finish:'paint',ink:'#142434',mark:'spacex.svg',aspect:8,country:'us',source:'https://www.spacex.com/vehicles/falcon-heavy/'},
 vulcan6:{provider:'United Launch Alliance',vehicle:'VULCAN',manufacturer:'United Launch Alliance',finish:'paint',ink:'#163e69',mark:'ula.png',aspect:2.82,country:'us',source:'https://www.ulalaunch.com/explore/downloads'},
 ariane64:{provider:'Arianespace',vehicle:'ARIANE 6',manufacturer:'ArianeGroup',finish:'paint',ink:'#17326b',mark:'arianespace.svg',aspect:5.97,country:'eu',source:'https://www.ariane.group/en/news/ariane-6-designed-to-go-far-in-high-style/'},
 longMarch5B:{provider:'CASC',vehicle:'CZ-5B',manufacturer:'CALT',finish:'paint',ink:'#14394f',mark:'casc-official.jpg',aspect:1,country:'cn',source:'https://english.spacechina.com/n17138/n2357695/index.html'},
 longMarch9:{provider:'CASC',vehicle:'CZ-9',manufacturer:'CALT',finish:'paint',ink:'#14394f',mark:'casc-official.jpg',aspect:1,country:'cn',source:'https://english.spacechina.com/n17138/n2357695/index.html'}
};
export function launchLiveryRecord(id){
 const key=id==='terranX'?'terran':id==='glenn9'?'glenn':id,record=families[key]||families.terran;
 return {...record,variant:id,identityBasis:'Provider and manufacturer artwork; illustrative placement on the parametric vehicle.',surfaceBasis:'Generated physically based paint, metal, composite and ceramic surface detail; not measured flight hardware.'};
}

// A rectangular decal conforms to the actual radius stations and belongs to one
// retained or separable component. No flat billboard, halo or screen-space text.
export function mountLaunchDecal(parent,profile,{azimuth=.8,y,width,height,material,vertical=false,name='Provider marking'}){
 const low=y-height/2,high=y+height/2;
 const radius=yy=>{
  for(let i=1;i<profile.length;i++)if(yy<=profile[i][1]){
   const [a,h0]=profile[i-1],[b,h1]=profile[i];return a+(b-a)*(yy-h0)/Math.max(1e-8,h1-h0);
  }
  return profile.at(-1)[0];
 };
 const stations=[low,...profile.map(q=>q[1]).filter(v=>v>low&&v<high),high];
 // Long markings need longitudinal subdivisions for correct perspective and
// for the deterministic software rasterizer, not only triangles at the ends.
 for(let i=1;i<12;i++)stations.push(low+(high-low)*i/12);
 stations.sort((a,b)=>a-b);
 const rows=[...new Set(stations)],xyz=[],uv=[],ix=[],centerRadius=radius(y),n=Math.max(24,Math.ceil(width/centerRadius*24));
 for(let j=0;j<rows.length;j++){
  const yy=rows[j],rr=radius(yy)+.004;
  for(let i=0;i<=n;i++){
   const u=i/n,v=(yy-low)/height,a=azimuth+(u-.5)*width/centerRadius;
   xyz.push(rr*Math.sin(a),yy,rr*Math.cos(a));
   uv.push(...(vertical?[v,1-u]:[u,v]));
   if(j&&i){const b=j*(n+1)+i;ix.push(b-n-2,b-n-1,b,b-n-2,b,b-1);}
  }
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(xyz,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(ix);geometry.computeVertexNormals();
 const decal=new T.Mesh(geometry,material);decal.name=name;decal.renderOrder=3;decal.castShadow=false;decal.receiveShadow=true;
 decal.userData.launchMarking=true;decal.userData.noShadow=true;parent.add(decal);return decal;
}

export function createLaunchLivery(id,repaint){
 const record=launchLiveryRecord(id),textures=new Map(),materials=new Map();
 function imageMap(file,color=true,fallback='#eeeeea'){
  const key=file+'/'+color;if(textures.has(key))return textures.get(key);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2;const ctx=canvas.getContext('2d');ctx.fillStyle=fallback;ctx.fillRect(0,0,2,2);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;
  texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=8;
  texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;
  texture.userData.launchTexture=file;let alive=true;
  texture.addEventListener('dispose',()=>{alive=false;});
  if(typeof Image!=='undefined'){
   const image=new Image();image.decoding='async';image.onload=()=>{
    if(!alive)return;texture.image=image;texture.needsUpdate=true;repaint?.();
   };image.src=new URL(file,root).href;
  }
  textures.set(key,texture);return texture;
 }
 function surface(kind,tint='#ffffff'){
  const key=kind+'/'+tint;if(materials.has(key))return materials.get(key);
  const settings={paint:{metalness:.025,roughness:1,bumpScale:.008,fallback:'#e8e8e2'},aluminium:{metalness:.82,roughness:1,bumpScale:.006,fallback:'#bfc6cc'},stainless:{metalness:.88,roughness:1,bumpScale:.008,fallback:'#b8c0c4'},ceramic:{metalness:0,roughness:1,bumpScale:.012,fallback:'#30353a'},composite:{metalness:.03,roughness:1,bumpScale:.003,fallback:'#23292e'}}[kind]||{};
  const {fallback,...properties}=settings;
  const map=imageMap(kind+'-albedo.webp',true,fallback),data=imageMap(kind+'-surface.webp',false,'#80b080');
  const material=new T.MeshStandardMaterial({color:tint,map,roughnessMap:data,bumpMap:data,envMapIntensity:.85,...properties});
  material.name=kind+' launch surface';material.userData.launchSurface=kind;materials.set(key,material);return material;
 }
 function artwork(file,tint='#ffffff',fallbackText=''){
  const key='mark/'+file+'/'+tint;if(materials.has(key))return materials.get(key);
  const material=new T.MeshStandardMaterial({color:tint,roughness:.71,metalness:0,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  // Transparent placeholder prevents rectangles flashing before a mark decodes.
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d');
  if(fallbackText){ctx.fillStyle='#ffffff';ctx.font='600 150px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(fallbackText,512,128,990);}
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;material.map=texture;
  texture.userData.launchTexture=file;let alive=true;texture.addEventListener('dispose',()=>{alive=false;});
  if(typeof Image!=='undefined'){
   const image=new Image();image.decoding='async';image.onload=()=>{
    if(!alive)return;
    if(file==='blue-feather.png'){
     // The provider distributes this exact feather as white on blue. Derive
     // its ink mask for a hull decal; keep the downloaded source untouched.
     const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0);
     const data=g.getImageData(0,0,c.width,c.height),background=data.data[0];let x0=c.width,y0=c.height,x1=0,y1=0;
     for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
      const p=(y*c.width+x)*4,alpha=Math.max(0,Math.min(255,(data.data[p]-background)*255/(255-background)));
      data.data[p]=data.data[p+1]=data.data[p+2]=255;data.data[p+3]=alpha;
      if(alpha>4){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
     }
     g.putImageData(data,0,0);const cropped=document.createElement('canvas');cropped.width=x1-x0+5;cropped.height=y1-y0+5;
     cropped.getContext('2d').drawImage(c,x0-2,y0-2,cropped.width,cropped.height,0,0,cropped.width,cropped.height);texture.image=cropped;
    }else texture.image=image;
    texture.needsUpdate=true;repaint?.();
   };image.src=new URL(file,root).href;
  }
  materials.set(key,material);return material;
 }
 function lettering(text,color=record.ink){
  const key='text/'+text+'/'+color;if(materials.has(key))return materials.get(key);
  const c=document.createElement('canvas');c.width=2048;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.font='600 155px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,c.height/2,c.width*.95);
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
  const m=new T.MeshStandardMaterial({color,map:texture,roughness:.7,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});m.userData.launchArtwork=text;materials.set(key,m);return m;
 }
 const logo=()=>artwork(record.mark,['spacex.svg','ula.png','casc-official.jpg'].includes(record.mark)?'#ffffff':record.ink,record.provider);
 const band=(parent,r,y,height,color)=>{
  const geometry=new T.CylinderGeometry(r+.003,r+.003,height,80,1,true),mesh=new T.Mesh(geometry,surface('paint',color));mesh.position.y=y;parent.add(mesh);mesh.name='Carrier livery band';return mesh;
 };
 function fairing(parent,profile,begin,maxH,R){
  const center=begin+.86,radius=y=>{for(let i=1;i<profile.length;i++){const [a,low]=profile[i-1],[b,high]=profile[i];if(y<=high)return a+(b-a)*(y-low)/(high-low);}return profile.at(-1)[0];};
  const place=(file,y,width,aspect,color,name)=>{width=Math.min(width,radius(y)*1.60);return mountLaunchDecal(parent,profile,{azimuth:center,y,width,height:width/aspect,material:artwork(file,color),name});};
  const chinese=id==='longMarch5B'||id==='longMarch9';
  const providerWidth=R*(chinese?.77:1.55),providerY=maxH*(chinese?.20:.18);
  place(record.mark,providerY,providerWidth,record.aspect,['spacex.svg','ula.png','casc-official.jpg'].includes(record.mark)?'#ffffff':record.ink,record.provider+' · launch provider');
  if(id==='ariane64')place('arianegroup.svg',maxH*.105,R*1.55,6,record.ink,'ArianeGroup · vehicle manufacturer');
  if(chinese)place('calt.png',maxH*.095,R*1.50,400/116,'#ffffff','CALT · vehicle manufacturer');
  const familyMaterial=id==='falconHeavy'?artwork('falcon-heavy.svg','#ffffff'):lettering(record.vehicle);
  const familyWidth=Math.min(R*1.57,radius(maxH*.73)*1.60);
  mountLaunchDecal(parent,profile,{azimuth:center,y:maxH*.73,width:familyWidth,height:familyWidth/(id==='falconHeavy'?1.51:5.6),material:familyMaterial,name:record.vehicle+' · vehicle name'});
  place('flag-'+record.country+'.svg',maxH*.30,R*.50,record.country==='us'?1.9:1.5,'#ffffff','National identification');
 }
 function core(parent,r,base,height,{booster=false}={}){
  const profile=id==='starship'?[[r,base],[r,base+height]]:booster?[[r*.99,base],[r,base+height*.88],[r*.043,base+height]]:[[r*.985,base],[r,base+height]],phi=.74;
  const draw=(azimuth,y,width,h,material,name,vertical=false)=>mountLaunchDecal(parent,profile,{azimuth,y,width,height:h,material,name,vertical});
  if(id==='vulcan6'){
   const wrap=draw(phi,base+height*.47,TAU*r*.997,height*.91,artwork('vulcan-wrap.png'),'Vulcan flame livery');wrap.renderOrder=2;
  }
  for(const angle of [phi,phi+Math.PI]){
   const length=Math.min(height*.32,r*6.6),width=length/record.aspect;
   if(id==='starship'){
    draw(angle,base+height*.60,r*1.6,r*.20,logo(),'SpaceX · Super Heavy');
    draw(angle,base+height*.65,r*.53,r*.28,artwork('flag-us.svg'),'United States flag');
   }else if(id==='vulcan6'){
    draw(angle,base+height*.70,r*1.38,r*1.43,artwork('vulcan.svg'),'Vulcan launch vehicle emblem');
    draw(angle,base+height*.89,r*1.35,r*1.35/2.82,logo(),'United Launch Alliance · manufacturer');
   }else if(id==='ariane64'){
    draw(angle,base+height*.67,r*1.63,r*1.63/6,artwork('arianegroup.svg',record.ink),'ArianeGroup · vehicle manufacturer');
    draw(angle,base+height*.43,r*.50,r*3.9,lettering(record.vehicle),record.vehicle+' · core identification',true);
   }else if(id==='longMarch5B'||id==='longMarch9'){
    draw(angle,base+height*.68,r*.98,r*.98,logo(),'CASC · launch provider');
    draw(angle,base+height*.87,r*1.45,r*.42,artwork('calt.png'),'CALT · vehicle manufacturer');
    draw(angle,base+height*.43,r*.65,r*3.9,lettering(record.vehicle),record.vehicle+' · core identification',true);
   }else{
    draw(angle,base+height*.51,width,length,logo(),record.provider+' · core marking',true);
    if(record.provider==='Blue Origin')draw(angle,base+height*.80,r*1.62,r*.86,artwork('blue-feather.png',record.ink),'Blue Origin feather');
    else draw(angle,base+height*.76,r*.54,r*.54/1.9,artwork('flag-'+record.country+'.svg'),'National identification');
   }
   // Small access and handling stencils enrich close views without invented
   // serial numbers, acceptance stamps, or fictitious qualification labels.
   if(!booster&&id!=='starship')draw(angle+.72,base+height*.36,r*.49,r*.10,lettering('ACCESS',record.ink),'Access-panel stencil');
  }
  if(record.provider==='Blue Origin'){band(parent,r,base+height*.105,height*.21,'#172e50');band(parent,r,base+height*.965,height*.066,'#203f63');}
  if(record.provider==='Relativity Space'){
   const pattern=artwork('relativity-diamonds.svg','#ffffff');
   for(let i=0;i<4;i++)draw(phi+i*Math.PI/2,base+height*.115,r*1.5,height*.19,pattern,'Relativity aft livery pattern');
  }
 }
 function upper(parent,profile,stage2){
  if(stage2<3||id==='starship')return;
  const y=-stage2*.42,r=profile[0][0],w=r*1.44;
  for(const azimuth of [.74,.74+Math.PI]){
   mountLaunchDecal(parent,profile,{azimuth,y,width:w,height:w/record.aspect,material:logo(),name:record.provider+' · upper-stage marking'});
  }
 }
 return {record,surface,artwork,lettering,fairing,core,upper};
}
