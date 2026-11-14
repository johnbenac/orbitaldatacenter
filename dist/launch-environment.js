// Geographic context is independent of the schematic launch installation.
// +X is east, -Z is north; the existing launch-position pin remains the origin.
// Satellite/aerial pixels and DEM samples are bundled with their provenance.
import * as T from './vendor/three.module.js';
import {geographyForSite} from './launch-geography.js';
import {fetchJsonAsset} from './json-asset.js';

export const LOCAL_PAD_FLAT_RADIUS_M=190,LOCAL_PAD_MESH_STEP_M=18;
const DEG=Math.PI/180,EARTH_M=6378137,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const f=clamp((v-a)/(b-a));return f*f*(3-2*f);};
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const finite=v=>Number.isFinite(v);

export function localGeography(site){
 const eastM=EARTH_M*DEG*Math.cos(site.lat*DEG),northM=EARTH_M*DEG;
 return {
  point(lon,lat){return [(lon-site.lon)*eastM,-(lat-site.lat)*northM];},
  coordinate(x,z){return [site.lon+x/eastM,site.lat-z/northM];},
  rectangle(bounds){const [west,south,east,north]=bounds;return {x0:(west-site.lon)*eastM,x1:(east-site.lon)*eastM,z0:-(north-site.lat)*northM,z1:-(south-site.lat)*northM};}
 };
}

export function geographicUV(lon,lat,bounds,projection='EPSG:4326'){
 const [west,south,east,north]=bounds;
 const mercator=y=>Math.log(Math.tan(Math.PI/4+y*DEG/2));
 const v=/3857|mercator/i.test(projection)?(mercator(lat)-mercator(south))/(mercator(north)-mercator(south)):(lat-south)/(north-south);
 return [(lon-west)/(east-west),v];
}

export function sampleElevation(grid,lon,lat){
 if(!grid?.values?.length||!(grid.width>1&&grid.height>1))return 0;
 const [u,v]=geographicUV(lon,lat,grid.bounds,grid.projection);
 const x=clamp(u)*(grid.width-1),y=clamp(1-v)*(grid.height-1),x0=Math.floor(x),y0=Math.floor(y);
 const x1=Math.min(grid.width-1,x0+1),y1=Math.min(grid.height-1,y0+1),dx=x-x0,dy=y-y0;
 const read=(a,b)=>{const n=grid.values[b*grid.width+a];return finite(n)?n:0;};
 return (1-dy)*((1-dx)*read(x0,y0)+dx*read(x1,y0))+dy*((1-dx)*read(x0,y1)+dx*read(x1,y1));
}

function hash(x,y,seed=91){let n=Math.imul(x+seed,374761393)+Math.imul(y,668265263);n=Math.imul(n^n>>>13,1274126177);return ((n^n>>>16)>>>0)/4294967295;}
function rng(seed){let s=seed>>>0;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
function canvas(width,height){const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
function texture(image){const t=new T.Texture(image);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;t.needsUpdate=true;return t;}

// Small physically shaded surface maps are confined to modeled civil works;
// their seams and weathering are presentation detail, not survey features.
export function civilSurfaceMaterial(kind='concrete'){
 const c=canvas(256,256),ctx=c.getContext('2d'),im=ctx?.createImageData?.(256,256);
 if(im?.data){
  const asphalt=kind==='asphalt',burnt=kind==='burnt',base=asphalt?[75,82,83]:burnt?[73,73,68]:[173,175,169];
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
   const i=4*(y*256+x),grain=(hash(x,y)-.5)*(asphalt?24:15),mottle=(hash(x>>4,y>>4,47)-.5)*8;
   const seam=!asphalt&&!burnt&&(x<2||y<2)?-31:x===2||y===2?4:0;
   const stain=Math.max(0,Math.sin(x*.025+.3)*Math.cos(y*.039))*(burnt?22:6);
   for(let k=0;k<3;k++)im.data[i+k]=base[k]+grain+mottle+seam-stain;
   im.data[i+3]=255;
  }
  ctx.putImageData(im,0,0);
 }
 const map=texture(c);map.wrapS=map.wrapT=T.RepeatWrapping;
 const bump=map.clone();bump.colorSpace=T.NoColorSpace;bump.needsUpdate=true;
 const material=new T.MeshStandardMaterial({color:0xffffff,map,bumpMap:bump,bumpScale:kind==='asphalt'?.012:.018,roughness:kind==='asphalt'?.97:.89,metalness:.015});
 material.name=kind==='asphalt'?'Fine aggregate asphalt':kind==='burnt'?'Weathered exhaust concrete':'Jointed launch-apron concrete';
 material.userData.civilSurface=true;
 return material;
}

function rectanglesAround(outer,inner){
 if(!inner)return [outer];
 const q={x0:Math.max(outer.x0,inner.x0),x1:Math.min(outer.x1,inner.x1),z0:Math.max(outer.z0,inner.z0),z1:Math.min(outer.z1,inner.z1)};
 if(q.x1<=q.x0||q.z1<=q.z0)return [outer];
 return [
  {x0:outer.x0,x1:outer.x1,z0:outer.z0,z1:q.z0},
  {x0:outer.x0,x1:outer.x1,z0:q.z1,z1:outer.z1},
  {x0:outer.x0,x1:q.x0,z0:q.z0,z1:q.z1},
  {x0:q.x1,x1:outer.x1,z0:q.z0,z1:q.z1}
 ].filter(r=>r.x1-r.x0>.01&&r.z1-r.z0>.01);
}

function pixelSampler(image,record){
 const c=canvas(768,Math.max(1,Math.round(768*image.height/image.width))),ctx=c.getContext('2d',{willReadFrequently:true});
 if(!ctx?.drawImage||!ctx?.getImageData)return null;
 ctx.drawImage(image,0,0,c.width,c.height);
 const frame=ctx.getImageData(0,0,c.width,c.height);
 if(!frame?.data)return null;
 return {canvas:c,frame,bounds:record.bounds,projection:record.projection||record.image?.projection,
  sample(lon,lat){const [u,v]=geographicUV(lon,lat,record.bounds,record.projection||record.image?.projection);if(u<0||u>1||v<0||v>1)return null;
   const x=clamp(Math.floor(u*frame.width),0,frame.width-1),y=clamp(Math.floor((1-v)*frame.height),0,frame.height-1),i=4*(y*frame.width+x);
   return [frame.data[i],frame.data[i+1],frame.data[i+2],frame.data[i+3]];
  }
 };
}

function leafTexture(region){
 const c=canvas(256,256),g=c.getContext('2d'),rand=rng(19344),shrub=['texas','louisiana','california'].includes(region);
 // A neutral canopy atlas is tinted with vegetation pixels at each placement.
 // Crossed cards are batched, so this is a bounded number of draw calls.
 g.clearRect?.(0,0,256,256);
 g.fillStyle='#706856';g.fillRect?.(124,97,8,159);
 for(let i=0;i<1050;i++){
  const a=rand()*Math.PI*2,r=Math.sqrt(rand()),xx=128+Math.cos(a)*r*(shrub?122:103),yy=(shrub?156:106)+Math.sin(a)*r*(shrub?80:100);
  const shade=Math.floor(111+rand()*94+(128-yy)*.20),size=2+rand()*(shrub?4.5:7.0);
  g.fillStyle=`rgb(${shade},${shade+7},${Math.max(0,shade-7)})`;
  g.beginPath?.();g.ellipse?.(xx,yy,size,size*.72,rand()*Math.PI,0,Math.PI*2);g.fill?.();
 }
 const t=texture(c);t.anisotropy=4;return t;
}

function waveNormal(){
 const c=canvas(128,128),ctx=c.getContext('2d'),im=ctx?.createImageData?.(128,128);
 if(im?.data){for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const k=4*(y*128+x),u=x/128*Math.PI*2,v=y/128*Math.PI*2;
  im.data[k]=128+30*Math.cos(4*u+3*v)+12*Math.cos(11*u-7*v);
  im.data[k+1]=128+23*Math.cos(4*u+3*v)+13*Math.sin(5*u+9*v);im.data[k+2]=245;im.data[k+3]=255;
 }ctx.putImageData(im,0,0);}
 const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(260,260);t.anisotropy=8;return t;
}

export function buildLaunchEnvironment(site,{parent,grade,aperture,repaint=()=>{}}){
 const record=geographyForSite(site.id),projection=localGeography(site);
 const fallbackBounds=[site.lon-.10,site.lat-.10,site.lon+.10,site.lat+.10];
 const bounds=record?.bounds||fallbackBounds,extent=projection.rectangle(bounds),detail=record?.detail;
 const inner=detail?.bounds?projection.rectangle(detail.bounds):null;
 const group=new T.Group();group.name=(record?.name||site.range)+' · geographic surroundings';group.userData.geographicContext=true;parent.add(group);
 const terrainGroup=new T.Group(),foliageGroup=new T.Group(),waterGroup=new T.Group();
 terrainGroup.name='Georeferenced terrain and imagery';foliageGroup.name='Illustrative vegetation over image-derived cover';waterGroup.name='Coastal water surface';group.add(terrainGroup,waterGroup,foliageGroup);
 const surfaces=[],textures=new Set(),loads=new Set(),abort=typeof AbortController==='function'?new AbortController():null;
 const regionalMaterial=new T.MeshBasicMaterial({color:'#778d73',toneMapped:false});regionalMaterial.name='Regional georeferenced orthophoto';regionalMaterial.userData.globeTexture=true;
 const detailMaterial=detail?regionalMaterial.clone():regionalMaterial;if(detail)detailMaterial.name='Launch-site detailed orthophoto';
 let heightGrid=null,padElevationM=0,alive=true,started=false,regionalSampler=null,detailSampler=null,waterMaskSampler=null,water=null,foliage=null,skirt=null,skirtPoints=[],waterNormals=null,surfMap=null,displayTime=0;
 const errors=[],warnings=[],labels=(record?.landmarks||[]).map((p,i)=>{const [x,z]=projection.point(p.lon,p.lat),anchor=new T.Object3D();anchor.position.set(x,grade+12,z);anchor.name=p.name||p.title;group.add(anchor);return {id:'geography-'+record.id+'-'+i,title:p.name||p.title,kind:p.kind,sourceUrl:p.sourceUrl,position:[x,grade+12,z],anchor,priority:p.kind==='ocean'?45:65};});
 const padAnchor=new T.Object3D();padAnchor.name=site.name;padAnchor.position.set(0,grade+4,0);group.add(padAnchor);labels.unshift({id:'geography-pad-origin',title:site.name,kind:'pad',position:[0,grade+4,0],anchor:padAnchor,priority:110});
 const api={group,record,labels:()=>labels,errors,warnings,status:record?'loading':'error',extentM:extent,
  captureRadiusM:Math.min(4400,Math.max(1800,.32*Math.min(extent.x1-extent.x0,extent.z1-extent.z0))),
  horizonRadiusM:Math.min(Math.abs(extent.x0),Math.abs(extent.x1),Math.abs(extent.z0),Math.abs(extent.z1)),
  geometryBasis:'Georeferenced imagery and sampled elevation. Local pad grading, water appearance and added vegetation are illustrative.',
  geographicPoint(lon,lat){const [x,z]=projection.point(lon,lat);return V(x,heightAt(x,z),z);},
  heightAt,ensureLoaded,update(t,enabled=true){displayTime=finite(t)?t:0;if(enabled)ensureLoaded();if(waterNormals){waterNormals.offset.set(displayTime*.00032,displayTime*.00019);}if(surfMap)surfMap.offset.x=displayTime*.008;},
  faceCamera(camera){
   if(!group.visible)return;
   const eye=group.worldToLocal(camera.getWorldPosition(V()));
   foliageGroup.visible=Math.hypot(eye.x,eye.z)<16000&&eye.y-grade<4800;
  },
  dispose(){alive=false;abort?.abort();for(const img of loads){img.onload=img.onerror=null;img.src='';}loads.clear();for(const map of textures)map.dispose();textures.clear();regionalSampler=detailSampler=waterMaskSampler=null;}
 };
 if(!record)errors.push('No geographic asset record for '+site.id);

 function heightAt(x,z){
  if(!heightGrid)return grade;
  const [lon,lat]=projection.coordinate(x,z),h=sampleElevation(heightGrid,lon,lat)-padElevationM;
  // Match existing schematic civil geometry without pretending its local
  // slopes, grade or foundation levels have been surveyed.
  return grade+h*smooth(LOCAL_PAD_FLAT_RADIUS_M,460,Math.hypot(x,z));
 }
 function tag(m,name){m.name=name;m.userData.noShadow=true;m.userData.noLaunchShadow=true;m.userData.landscape=true;m.userData.receiveShadow=false;m.userData.geographicContext=true;m.castShadow=false;m.receiveShadow=false;
  // Geographic scenery is inspected with its named map chips, not subsystem
  // picking. Avoid intersecting tens of thousands of ground/leaf triangles on
  // every pointer movement while a user is selecting launch hardware.
  m.raycast=()=>{};return m;
 }
 function makeTerrain(rect,material,geoRecord,step,name){
  const nx=Math.max(1,Math.ceil((rect.x1-rect.x0)/step)),nz=Math.max(1,Math.ceil((rect.z1-rect.z0)/step));
  const positions=[],uv=[],indices=[],offsets=[];
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
   const x=rect.x0+(rect.x1-rect.x0)*i/nx,z=rect.z0+(rect.z1-rect.z0)*j/nz,[lon,lat]=projection.coordinate(x,z);
   positions.push(x,heightAt(x,z),z);offsets.push(0);uv.push(...geographicUV(lon,lat,geoRecord.bounds,geoRecord.projection||geoRecord.image?.projection));
   if(i<nx&&j<nz){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;indices.push(a,c,b,b,c,d);}
  }
  // Geographic levels use different grid spacing. Hidden downward skirts
  // close the subpixel cracks where the elevation samples meet a coarser edge.
  const edges=[Array.from({length:nx+1},(_,i)=>i),Array.from({length:nz+1},(_,j)=>j*(nx+1)+nx),Array.from({length:nx+1},(_,i)=>nz*(nx+1)+nx-i),Array.from({length:nz+1},(_,j)=>(nz-j)*(nx+1))];
  const drop=Math.min(45,Math.max(3,step*.22));
  for(const edge of edges){let prev=null;for(const top of edge){const bottom=positions.length/3;positions.push(positions[3*top],positions[3*top+1]-drop,positions[3*top+2]);uv.push(uv[2*top],uv[2*top+1]);offsets.push(-drop);if(prev)indices.push(prev.top,top,prev.bottom,top,bottom,prev.bottom);prev={top,bottom};}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('heightOffset',new T.Float32BufferAttribute(offsets,1));g.setIndex(indices);g.computeVertexNormals();
  const mesh=tag(new T.Mesh(g,material),name);terrainGroup.add(mesh);surfaces.push(mesh);return mesh;
 }
 // Separate geographic levels share exactly matching rectangle boundaries.
 // The innermost level leaves the real modeled exhaust incision open.
 const near={x0:Math.max(extent.x0,-270),x1:Math.min(extent.x1,270),z0:Math.max(extent.z0,-270),z1:Math.min(extent.z1,270)};
 const regional=record||{bounds},nearRecord=detail||regional,nearMaterial=detail?detailMaterial:regionalMaterial;
 if(inner){
  for(const rect of rectanglesAround(extent,inner))makeTerrain(rect,regionalMaterial,regional,Math.max(100,(extent.x1-extent.x0)/104),'Regional elevation surface');
  for(const rect of rectanglesAround(inner,near))makeTerrain(rect,detailMaterial,detail,Math.max(22,(inner.x1-inner.x0)/74),'Detailed geographic terrain');
 }else for(const rect of rectanglesAround(extent,near))makeTerrain(rect,regionalMaterial,regional,Math.max(70,(extent.x1-extent.x0)/112),'Regional elevation surface');
 for(const rect of rectanglesAround(near,aperture))makeTerrain(rect,nearMaterial,nearRecord,LOCAL_PAD_MESH_STEP_M,'Graded local terrain');

 function makeSkirt(){
  const pts=[],segments=32;
  for(let j=0;j<4;j++)for(let i=0;i<segments;i++){
   const f=i/segments;
   pts.push(j===0?[extent.x0+(extent.x1-extent.x0)*f,extent.z0]:j===1?[extent.x1,extent.z0+(extent.z1-extent.z0)*f]:j===2?[extent.x1-(extent.x1-extent.x0)*f,extent.z1]:[extent.x0,extent.z1-(extent.z1-extent.z0)*f]);
  }
  const positions=[],colors=[],indices=[],center=[(extent.x0+extent.x1)/2,(extent.z0+extent.z1)/2],rings=[1,1.8,5];
  for(let r=0;r<rings.length;r++)for(let i=0;i<pts.length;i++){
   const [x,z]=pts[i],f=rings[r];positions.push(center[0]+(x-center[0])*f,heightAt(x,z),center[1]+(z-center[1])*f);colors.push(.30,.40,.40);
   if(r<rings.length-1){const a=r*pts.length+i,b=r*pts.length+(i+1)%pts.length,c=a+pts.length,d=b+pts.length;indices.push(a,b,c,b,d,c);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
  const m=new T.MeshBasicMaterial({vertexColors:true,toneMapped:false,side:T.DoubleSide});
  skirt=tag(new T.Mesh(g,m),'Atmospheric horizon continuation · presentation only');skirt.userData.presentationOnly=true;group.add(skirt);skirtPoints=pts;
 }
 makeSkirt();

 function refreshHeights(){
  padElevationM=heightGrid?sampleElevation(heightGrid,site.lon,site.lat):0;
  for(const m of surfaces){const pos=m.geometry.attributes.position,offset=m.geometry.attributes.heightOffset;for(let i=0;i<pos.count;i++)pos.setY(i,heightAt(pos.getX(i),pos.getZ(i))+(offset?.getX(i)||0));pos.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingSphere();}
  for(const label of labels){label.position[1]=heightAt(label.position[0],label.position[2])+(label.kind==='pad'?4:12);label.anchor.position.fromArray(label.position);}
  refreshSkirt();
 }
 function refreshSkirt(){
  const pos=skirt.geometry.attributes.position,colors=skirt.geometry.attributes.color,col=new T.Color(),haze=new T.Color('#a8c0c9');
  for(let r=0;r<3;r++)for(let i=0;i<skirtPoints.length;i++){
   const [x,z]=skirtPoints[i],coordinate=projection.coordinate(x*.999,z*.999),pixel=regionalSampler?.sample(...coordinate),k=r*skirtPoints.length+i;
   pos.setY(k,heightAt(x,z));if(pixel)col.setRGB(pixel[0]/255,pixel[1]/255,pixel[2]/255,T.SRGBColorSpace);else col.set('#778d73');
   col.lerp(haze,r===0?0:r===1?.36:.83);colors.setXYZ(k,col.r,col.g,col.b);
  }
  pos.needsUpdate=colors.needsUpdate=true;skirt.geometry.computeBoundingSphere();
 }
 function pixelAt(x,z){const coordinate=projection.coordinate(x,z);return detailSampler?.sample(...coordinate)||regionalSampler?.sample(...coordinate);}

 function vegetation(){
  if(!regionalSampler||foliage)return;
  const shrub=['texas','louisiana','california'].includes(site.terrain),tropical=['guiana','hainan'].includes(site.terrain);
  const rand=rng(839017+Math.round(site.lat*1000)),positions=[],uv=[],colors=[],indices=[],color=new T.Color();
  const limit=shrub?1200:2300,radius=Math.min(3600,api.horizonRadiusM*.65),cutoff=245;
  let count=0;
  for(let j=0;j<26000&&count<limit;j++){
   const a=rand()*Math.PI*2,dist=cutoff+Math.sqrt(rand())*(radius-cutoff),x=Math.sin(a)*dist,z=Math.cos(a)*dist,p=pixelAt(x,z);
   if(!p||p[3]<200)continue;
   const [red,green,blue]=p,[lon,lat]=projection.coordinate(x,z),elevation=heightGrid?sampleElevation(heightGrid,lon,lat):5;
   if(green<39||green<red*1.06||green<blue*1.06||red>173||blue>150||elevation<1.3)continue;
   // Bright grass and bare verges receive scrub rather than a forest canopy.
   const forest=green<125&&green-red>8,scale=shrub?.65+rand()*2.7:forest?(tropical?12:6)+rand()*(tropical?12:8):1.0+rand()*2.8;
   const width=scale*(shrub?1.55:forest?.90:1.5),y=heightAt(x,z)-.07,offset=rand()*Math.PI;
   color.setRGB(.19+red/510,.23+green/490,.17+blue/560,T.SRGBColorSpace);
   for(let plane=0;plane<3;plane++){
    const angle=offset+plane*Math.PI/3,dx=Math.cos(angle)*width/2,dz=Math.sin(angle)*width/2,k=positions.length/3;
    positions.push(x-dx,y,z-dz,x+dx,y,z+dz,x-dx,y+scale,z-dz,x+dx,y+scale,z+dz);
    uv.push(0,0,1,0,0,1,1,1);for(let n=0;n<4;n++)colors.push(color.r,color.g,color.b);
    indices.push(k,k+1,k+2,k+1,k+3,k+2);
   }
   count++;
  }
  if(!count)return;
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
  const map=leafTexture(site.terrain);textures.add(map);
  const m=new T.MeshStandardMaterial({map,vertexColors:true,roughness:1,metalness:0,side:T.DoubleSide,alphaTest:.46});
  foliage=tag(new T.Mesh(g,m),`${count} image-guided vegetation clumps · illustrative`);foliage.userData.presentationOnly=true;foliageGroup.add(foliage);
 }

 function coastalWater(){
  if(!regionalSampler||water)return;
  const {frame}=regionalSampler,c=canvas(frame.width,frame.height),ctx=c.getContext('2d'),im=ctx?.createImageData?.(frame.width,frame.height);
  if(!im?.data)return;
  const candidate=new Uint8Array(frame.width*frame.height),ocean=new Uint8Array(candidate.length),queue=new Uint32Array(candidate.length);
  for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){
   const i=4*(y*frame.width+x),red=frame.data[i],green=frame.data[i+1],blue=frame.data[i+2];
   const lon=bounds[0]+(bounds[2]-bounds[0])*(x+.5)/frame.width,lat=bounds[3]-(bounds[3]-bounds[1])*(y+.5)/frame.height;
   const elev=heightGrid?sampleElevation(heightGrid,lon,lat):0;
   // Restrict the reflective layer to conservative ocean-color pixels at
   // coastal elevation. The source orthophoto still supplies every shoreline.
   const blueWater=blue>red*1.11&&green>red*1.07&&blue>48&&red<145;
   const darkWater=red<58&&green<95&&blue>green*.84&&blue>red*1.13;
   const classified=waterMaskSampler?.sample(lon,lat);
   candidate[y*frame.width+x]=Number((classified?classified[0]>127:blueWater||darkWater)&&elev<2.8);
  }
  // Only water connected to a geographic image edge is treated as open sea.
  // This preserves inland lake, river and wetland colors in the source image.
  let read=0,write=0;
  const seed=k=>{if(candidate[k]&&!ocean[k]){ocean[k]=1;queue[write++]=k;}};
  for(let x=0;x<frame.width;x++){seed(x);seed((frame.height-1)*frame.width+x);}
  for(let y=1;y<frame.height-1;y++){seed(y*frame.width);seed(y*frame.width+frame.width-1);}
  while(read<write){const k=queue[read++],x=k%frame.width,y=Math.floor(k/frame.width);if(x)seed(k-1);if(x<frame.width-1)seed(k+1);if(y)seed(k-frame.width);if(y<frame.height-1)seed(k+frame.width);}
  const waterCount=write;
  if(waterCount<100)return;
  // Geographic mosaics can contain different offshore acquisition dates.
  // A continuous presentation material removes tile-colored rectangles at
  // sea while retaining the real shoreline and nearshore color. Distance is
  // an appearance blend, explicitly not a bathymetric depth measurement.
  const distance=new Uint16Array(candidate.length);for(let i=0;i<distance.length;i++)distance[i]=ocean[i]?30000:0;
  for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){const k=y*frame.width+x;if(!ocean[k])continue;distance[k]=Math.min(distance[k],x?distance[k-1]+1:30000,y?distance[k-frame.width]+1:30000);}
  for(let y=frame.height-1;y>=0;y--)for(let x=frame.width-1;x>=0;x--){const k=y*frame.width+x;if(!ocean[k])continue;distance[k]=Math.min(distance[k],x<frame.width-1?distance[k+1]+1:30000,y<frame.height-1?distance[k+frame.width]+1:30000);}
  const metresPerPixel=(extent.x1-extent.x0)/frame.width;
  const samples=[[],[],[]];
  for(let y=0;y<frame.height;y+=4)for(let x=0;x<frame.width;x+=4){const k=y*frame.width+x,i=4*k;if(!ocean[k]||distance[k]*metresPerPixel<750||frame.data[i]>242&&frame.data[i+1]>242&&frame.data[i+2]>242)continue;for(let channel=0;channel<3;channel++)samples[channel].push(frame.data[i+channel]);}
  // Derive the continuous offshore tint from this image, retaining turbid
  // Guiana/Gulf water and the darker Pacific rather than imposing one blue.
  const deep=samples.map((values,i)=>values.length>64?values.sort((a,b)=>a-b)[Math.floor(values.length/2)]:[43,100,118][i]);
  for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){
   const k=y*frame.width+x,i=4*k,blend=smooth(150,1100,distance[k]*metresPerPixel),grain=(hash(x>>2,y>>2,37)-.5)*2;
   for(let channel=0;channel<3;channel++)im.data[i+channel]=frame.data[i+channel]*(1-blend)+(deep[channel]+grain)*blend;
   im.data[i+3]=ocean[k]?235*smooth(.3,3.0,distance[k]):0;
  }
  ctx.putImageData(im,0,0);const map=texture(c);textures.add(map);waterNormals=waveNormal();textures.add(waterNormals);
  const m=new T.MeshPhysicalMaterial({color:0xffffff,map,normalMap:waterNormals,normalScale:new T.Vector2(.18,.12),roughness:.31,metalness:.11,clearcoat:.58,clearcoatRoughness:.22,transparent:true,depthWrite:false,opacity:.92});
  const g=new T.PlaneGeometry(extent.x1-extent.x0,extent.z1-extent.z0,1,1);g.rotateX(-Math.PI/2);
  water=tag(new T.Mesh(g,m),'Image-masked coastal water · illustrative reflections');water.position.set((extent.x0+extent.x1)/2,grade-padElevationM+.12,(extent.z0+extent.z1)/2);water.renderOrder=1;water.userData.presentationOnly=true;waterGroup.add(water);
 }

 function coastalVectors(collection){
  if(!Array.isArray(collection?.features))return;
  const positions=[],uv=[],indices=[];
  for(const feature of collection.features){
   const properties=feature.properties||{},geometry=feature.geometry;
   const lines=geometry?.type==='LineString'?[geometry.coordinates]:geometry?.type==='MultiLineString'?geometry.coordinates:[];
   if(properties.kind==='coastline')for(const line of lines){
    let distance=0;
    for(let i=1;i<line.length;i++){
     const [ax,az]=projection.point(...line[i-1]),[bx,bz]=projection.point(...line[i]),dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);
     if(!finite(len)||len<.05)continue;
     const mx=(ax+bx)/2,mz=(az+bz)/2;if(mx<extent.x0||mx>extent.x1||mz<extent.z0||mz>extent.z1)continue;
     const nx=-dz/len*3.2,nz=dx/len*3.2,y=grade-padElevationM+.30,k=positions.length/3;
     positions.push(ax-nx,y,az-nz,ax+nx,y,az+nz,bx-nx,y,bz-nz,bx+nx,y,bz+nz);
     uv.push(distance/75,0,distance/75,1,(distance+len)/75,0,(distance+len)/75,1);indices.push(k,k+2,k+1,k+1,k+2,k+3);distance+=len;
    }
   }
   if(properties.name&&properties.kind==='waterway'&&labels.filter(p=>p.kind==='mapped-waterway').length<3&&!labels.some(l=>l.title===properties.name)){
    const line=lines[0],coordinate=line?.[Math.floor(line.length/2)];if(!coordinate)continue;const [x,z]=projection.point(...coordinate);
    if(Math.abs(x)>api.horizonRadiusM*.9||Math.abs(z)>api.horizonRadiusM*.9)continue;
    const anchor=new T.Object3D(),position=[x,heightAt(x,z)+12,z];anchor.position.fromArray(position);anchor.name=properties.name;group.add(anchor);
    labels.push({id:'mapped-waterway-'+properties.osmId,title:properties.name,kind:'mapped-waterway',position,anchor,priority:52});
   }
  }
  if(!positions.length)return;
  const c=canvas(256,64),ctx=c.getContext('2d'),im=ctx?.createImageData?.(256,64);
  if(!im?.data)return;
  for(let y=0;y<64;y++)for(let x=0;x<256;x++){
   const i=4*(y*256+x),edge=Math.sin(Math.PI*(y+.5)/64),broken=.25+.75*hash(x>>2,y>>1,31);
   im.data[i]=213;im.data[i+1]=232;im.data[i+2]=224;im.data[i+3]=150*edge*edge*broken;
  }
  ctx.putImageData(im,0,0);surfMap=texture(c);surfMap.wrapS=T.RepeatWrapping;textures.add(surfMap);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new T.MeshBasicMaterial({map:surfMap,transparent:true,opacity:.34,side:T.DoubleSide,depthWrite:false,toneMapped:false});
  const mesh=tag(new T.Mesh(geometry,material),'Surf accent along OpenStreetMap coastline · illustrative sea state');mesh.userData.presentationOnly=true;mesh.renderOrder=2;waterGroup.add(mesh);
 }

 async function loadImage(asset,material,geoRecord,isDetail){
  if(!asset?.url)throw new Error('Missing '+(isDetail?'detail':'regional')+' imagery asset');
  return new Promise((resolve,reject)=>{
   const img=new Image();loads.add(img);img.decoding='async';
   img.onload=()=>{
    loads.delete(img);if(!alive){resolve();return;}
    const map=texture(img);textures.add(map);material.map=map;material.color.set(0xffffff);material.needsUpdate=true;
    try{const sampler=pixelSampler(img,geoRecord);if(isDetail)detailSampler=sampler;else regionalSampler=sampler;}catch{/* Rendering does not depend on optional presentation detail readback. */}
    refreshSkirt();repaint();resolve();
   };
   img.onerror=()=>{loads.delete(img);reject(new Error('Unable to load '+asset.url));};img.src=asset.url;
  });
 }
 function loadWaterMask(asset){
  return new Promise((resolve,reject)=>{
   const img=new Image();loads.add(img);img.decoding='async';
   img.onload=()=>{loads.delete(img);if(alive)try{waterMaskSampler=pixelSampler(img,{bounds:asset.bounds||bounds,projection:asset.projection});}catch{/* Conservative image-color fallback remains available. */}resolve();};
   img.onerror=()=>{loads.delete(img);reject(new Error('Optional water classification unavailable'));};img.src=asset.url;
  });
 }
 function ensureLoaded(){
  if(started||!alive||!record)return;
  // Node geometry checks deliberately use a minimal canvas stub. They do not
  // create network requests or fake browser images.
  if(typeof Image!=='function'||typeof fetch!=='function')return;
  started=true;api.status='loading';
  const jobs=[loadImage(record.image,regionalMaterial,record,false)];
  if(detail)jobs.push(loadImage(detail.image,detailMaterial,detail,true));
  if(record.waterMask?.url)jobs.push(loadWaterMask(record.waterMask).catch(error=>{if(alive)warnings.push(error.message);}));
  if(record.elevation?.url)jobs.push(fetchJsonAsset(record.elevation.url,{signal:abort?.signal}).then(grid=>{
   if(!alive)return;if(!(grid.width>1&&grid.height>1)||grid.values?.length!==grid.width*grid.height||!grid.values.every(finite))throw new Error('Invalid geographic elevation grid');
   heightGrid={...grid,bounds:grid.bounds||record.elevation.bounds||bounds};refreshHeights();repaint();
  }));
  Promise.allSettled(jobs).then(results=>{
   if(!alive)return;
   for(const r of results)if(r.status==='rejected')errors.push(r.reason?.message||'Geographic asset unavailable');
   api.status=errors.length?'error':'ready';vegetation();coastalWater();repaint();
   if(record.features?.url)fetchJsonAsset(record.features.url,{signal:abort?.signal}).then(features=>{if(alive){coastalVectors(features);repaint();}}).catch(error=>{if(alive)warnings.push(error.message);});
  });
 }
 return api;
}
