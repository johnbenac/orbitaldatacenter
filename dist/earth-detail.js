// Observer-only virtual imagery. The polished overview globe intentionally
// keeps its original maps and renderer. These pages follow actual screen-space
// demand in the spacecraft / ascent camera, using genuine regional imagery.
import * as T from './vendor/three.module.js';

export const EARTH_DETAIL=Object.freeze({
 pageSize:512,border:4,pitch:520,columns:10,rows:5,maxLevel:4,
 tableColumns:160,tableRows:80,sourceSize:2048,sourceBorder:4,sourcePitch:2056,
 layers:Object.freeze(['day','night','clouds']),
 extensions:Object.freeze({day:'avif',night:'webp',clouds:'avif'}),
 nightTint:Object.freeze([1,.82,.61]),
 levels:Object.freeze({day:4,night:4,clouds:3}),
 // The imagery is a historical composite, not a live observation. Grayscale
 // night pixels are display-encoded light intensity with no terrain backdrop.
 sources:Object.freeze({day:'day-80k',night:'night-80k',clouds:'clouds-40k'})
});
const D=EARTH_DETAIL,TAU=2*Math.PI,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const keyOf=p=>`${p.level}/${p.col}/${p.row}`;
const wrap=x=>x-Math.floor(x);
const linear=new Float32Array(256);
for(let i=0;i<256;i++){const c=i/255;linear[i]=c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}

/** Native parent file and the exact window that supplies one virtual page. */
export function earthDetailSource(layer,page,medium=false){
 const level=page.level,high=!medium&&level>2;
 const nativeLevel=high?D.levels[layer]:2;
 const pagesPerParent=4/2**(nativeLevel-level),col=Math.floor(page.col/pagesPerParent),row=Math.floor(page.row/pagesPerParent);
 const window=D.sourceSize/pagesPerParent;
 const name=high?D.sources[layer]:`${layer}-20k`;
 return {key:`${name}/${col}/${row}`,url:`./vendor/earth-detail/${name}/c${col}-r${row}.${D.extensions[layer]}`,
  col,row,level:nativeLevel,x:D.sourceBorder+(page.col-col*pagesPerParent)*window,
  y:D.sourceBorder+(page.row-row*pagesPerParent)*window,size:window};
}

function pageBounds(level,col,row,radius,extra=0){
 const columns=D.columns*2**level,rows=D.rows*2**level;
 const longitude=(col+.5)/columns*TAU-Math.PI,latitude=Math.PI/2-(row+.5)/rows*Math.PI;
 const halfLon=Math.PI/columns,halfLat=Math.PI/(2*rows),s=Math.sin(latitude),c=Math.cos(latitude);
 const normal=new T.Vector3(c*Math.cos(longitude),s,-c*Math.sin(longitude));
 let cosine=1;
 for(const phi of [latitude-halfLat,latitude+halfLat])cosine=Math.min(cosine,s*Math.sin(phi)+c*Math.cos(phi)*Math.cos(halfLon));
 const angle=Math.acos(clamp(cosine,-1,1)),visibilityAngle=Math.min(Math.PI/2,angle+extra);
 const latitudes=[latitude-halfLat,latitude+halfLat],longitudes=[longitude-halfLon,longitude+halfLon];
 if(latitude-halfLat<0&&latitude+halfLat>0)latitudes.push(0);
 for(let k=-2;k<=2;k++){const q=k*Math.PI/2;if(q>longitude-halfLon&&q<longitude+halfLon)longitudes.push(q);}
 const box=new T.Box3();
 for(const phi of latitudes)for(const lambda of longitudes)box.expandByPoint(new T.Vector3(radius*Math.cos(phi)*Math.cos(lambda),radius*Math.sin(phi),-radius*Math.cos(phi)*Math.sin(lambda)));
 if(extra)box.expandByScalar(2*radius*Math.sin(extra/2));
 return {normal,angle,longitude,latitude,box,
  sphere:new T.Sphere(normal.clone().multiplyScalar(radius*Math.cos(visibilityAngle)),radius*Math.sin(visibilityAngle))};
}

/**
 * Conservative geographic quadtree selection. Every chosen branch retains its
 * coarser ancestor until all required children are resident. Frustum and horizon
 * bounds operate on the actual Earth-fixed transform, not camera altitude or a
 * small handful of central rays. The priority is projected source-texel pitch.
 */
export function planEarthDetail(camera,mesh,{width=1024,height=768,pixelRatio=1,maxPages=49,maxLevel=4,radius=1,shadowPadding=0,targetTexel=.85}={}){
 mesh.updateWorldMatrix(true,false);camera.updateWorldMatrix(true,false);
 const inverse=mesh.matrixWorld.clone().invert(),eye=camera.getWorldPosition(new T.Vector3()).applyMatrix4(inverse);
 const eyeLength=eye.length(),eyeNormal=eye.clone().normalize();
 const view=new T.Matrix4().multiplyMatrices(camera.matrixWorldInverse,mesh.matrixWorld);
 const projection=camera.projectionMatrix.clone();
 // A small overscan makes tile transitions stable at the viewport boundary.
 projection.elements[0]/=1.06;projection.elements[5]/=1.06;
 const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(projection,view));
 const screenHeight=Math.max(1,height*pixelRatio),screenWidth=Math.max(1,width*pixelRatio);
 const focal=screenHeight*Math.abs(camera.projectionMatrix.elements[5])*.5;
 const position=new T.Vector3();let examined=0;
 function describe(level,col,row){
  examined++;
  const bounds=pageBounds(level,col,row,radius,shadowPadding);
  if(!frustum.intersectsSphere(bounds.sphere)||!frustum.intersectsBox(bounds.box))return null;
  const separation=Math.acos(clamp(bounds.normal.dot(eyeNormal),-1,1));
  if(eyeLength>radius&&eyeLength*Math.cos(Math.max(0,separation-bounds.angle-shadowPadding))<radius-1e-8)return null;
  // The unpadded cap supplies a conservative nearest projected distance. Cloud
  // shadow padding changes visibility, not the apparent texel size of a patch.
  const geometricRadius=radius*Math.sin(bounds.angle);
  position.copy(bounds.normal).multiplyScalar(radius*Math.cos(bounds.angle)).applyMatrix4(view);
  const e=view.elements,boundsForError=shadowPadding?pageBounds(level,col,row,radius).box:bounds.box;
  const farthestZ=e[2]*(e[2]>=0?boundsForError.max.x:boundsForError.min.x)+e[6]*(e[6]>=0?boundsForError.max.y:boundsForError.min.y)+e[10]*(e[10]>=0?boundsForError.max.z:boundsForError.min.z)+e[14];
  const nearest=Math.max(.00002,-farthestZ);
  const texelAngle=Math.PI/(D.rows*2**level*D.pageSize);
  const error=camera.isOrthographicCamera?focal*radius*texelAngle:focal*radius*texelAngle/nearest;
  const projectedRadius=camera.isOrthographicCamera?focal*geometricRadius:focal*geometricRadius/nearest;
  const area=Math.min(screenWidth*screenHeight,Math.PI*projectedRadius*projectedRadius);
  return {level,col,row,key:`${level}/${col}/${row}`,error,priority:error*Math.pow(Math.max(1,area),.15),area};
 }
 let pages=[];
 for(let row=0;row<D.rows;row++)for(let col=0;col<D.columns;col++){
  const page=describe(0,col,row);if(page)pages.push(page);
 }
 const rootCount=pages.length;
 // A very distant full disc can exceed a tiny device's page budget. Its global
 // 4K fallback already resolves those small pixels; reserve regional pages for
 // the greatest projected error rather than allowing an unbounded allocation.
 if(pages.length>maxPages)pages=pages.sort((a,b)=>b.priority-a.priority).slice(0,maxPages);
 const candidates=new Map();
 function children(page){
  if(candidates.has(page.key))return candidates.get(page.key);
  const result=[];
  for(let y=0;y<2;y++)for(let x=0;x<2;x++){
   const child=describe(page.level+1,page.col*2+x,page.row*2+y);if(child)result.push(child);
  }
  candidates.set(page.key,result);return result;
 }
 while(true){
  let best=null,next=null;
  for(const page of pages){
   if(page.level>=maxLevel||page.error<=targetTexel)continue;
   const child=children(page);
   if(pages.length-1+child.length>maxPages)continue;
   if(!best||page.priority>best.priority){best=page;next=child;}
  }
  if(!best)break;
  pages.splice(pages.indexOf(best),1,...next);
 }
 pages.sort((a,b)=>b.priority-a.priority);
 return {pages,examined,rootCount,maxError:pages.reduce((m,p)=>Math.max(m,p.error),0),budgetLimited:pages.some(p=>p.level<maxLevel&&p.error>targetTexel)};
}

function texture(data,width,height,srgb=false,nearest=false){
 const map=new T.DataTexture(data,width,height,T.RGBAFormat);
 map.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;map.flipY=false;
 map.magFilter=map.minFilter=nearest?T.NearestFilter:T.LinearFilter;
 map.generateMipmaps=false;map.wrapS=map.wrapT=T.ClampToEdgeWrapping;
 map.userData.shared=true;map.needsUpdate=true;return map;
}

/**
 * Allocation-free CPU lookup, matching the GPU page table and bilinear samples.
 * u is west-to-east in [0,1), vTop is north-to-south in [0,1]. A false result
 * means use the existing global fallback. Day/night output is linear RGB;
 * cloud output is an untransformed coverage scalar copied into all channels.
 */
export function sampleEarthDetail(detail,layer,u,vTop,out){
 if(!detail?.allocated||detail.disposed)return false;
 const index=typeof layer==='number'?layer:D.layers.indexOf(layer);if(index<0||index>2)return false;
 u=wrap(u);vTop=clamp(vTop,0,1-1e-12);
 const cell=((index*D.tableRows+Math.floor(vTop*D.tableRows))*D.tableColumns+Math.floor(u*D.tableColumns))*4;
 const table=detail.tableData;if(!table[cell+3])return false;
 const level=table[cell+2]-1,columns=D.columns*2**level,rows=D.rows*2**level;
 const width=detail.atlasSize,map=detail.atlasData[index];
 const x=table[cell]*D.pitch+D.border+wrap(u*columns)*D.pageSize-.5;
 const y=table[cell+1]*D.pitch+D.border+wrap(vTop*rows)*D.pageSize-.5;
 const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
 const a=(y0*width+x0)*4,b=a+4,c=a+width*4,d=c+4;
 const wa=(1-fx)*(1-fy),wb=fx*(1-fy),wc=(1-fx)*fy,wd=fx*fy;
 if(index===2){
  const value=(map[a]*wa+map[b]*wb+map[c]*wc+map[d]*wd)/255;out[0]=out[1]=out[2]=value;
 }else for(let channel=0;channel<3;channel++)out[channel]=linear[map[a+channel]]*wa+linear[map[b+channel]]*wb+linear[map[c+channel]]*wc+linear[map[d+channel]]*wd;
 return true;
}

// Eight samplers total in the observer surface: four global maps, three detail
// atlases, and this single small nearest-filtered page table. Data atlas rows
// are top-down deliberately, identical to CPU bytes (DataTexture flipY=false).
export const earthDetailShader=`
uniform sampler2D earthDetailDay;
uniform sampler2D earthDetailNight;
uniform sampler2D earthDetailClouds;
uniform sampler2D earthDetailTable;
uniform float earthDetailSize;
vec3 earthDetailAddress(vec2 uv,float layer){
 vec2 top=vec2(fract(uv.x),clamp(1.0-uv.y,0.0,.9999999));
 vec2 cell=floor(top*vec2(160.0,80.0));
 vec4 entry=texture2D(earthDetailTable,(cell+vec2(.5,layer*80.0+.5))/vec2(160.0,240.0));
 if(entry.a<.5)return vec3(0.0);
 vec2 slot=floor(entry.rg*255.0+.5);
 float level=floor(entry.b*255.0+.5)-1.0;
 vec2 p=fract(top*vec2(10.0,5.0)*exp2(level));
 return vec3((slot*520.0+vec2(4.0)+p*512.0)/earthDetailSize,1.0);
}
vec4 earthDetailDayAt(vec2 uv){vec3 p=earthDetailAddress(uv,0.0);return vec4(texture2D(earthDetailDay,p.xy).rgb,p.z);}
vec4 earthDetailNightAt(vec2 uv){vec3 p=earthDetailAddress(uv,1.0);return vec4(texture2D(earthDetailNight,p.xy).rgb,p.z);}
float earthDetailCloudAt(vec2 uv,float fallback){vec3 p=earthDetailAddress(uv,2.0);return p.z>.5?texture2D(earthDetailClouds,p.xy).r:fallback;}
`;

/** Bounded parent decode cache + visible virtual pages for all three layers. */
export function createEarthDetail({onReady=()=>{},maxTextureSize=4096,maxPages,cloudRadius=1.001255,gpu=true,loadParent,extractPage,parentLimit=8,concurrency=3}={}){
 const capability=Math.max(1,Number(maxTextureSize)||4096),maximumGrid=Math.min(7,Math.floor(capability/D.pitch));
 const blank=texture(new Uint8Array(4),1,1),tableData=new Uint8Array(D.tableColumns*D.tableRows*3*4);
 const table=texture(tableData,D.tableColumns,D.tableRows*3,false,true);
 const state={version:0,allocated:false,disposed:false,atlasSize:1,atlasGrid:0,pageBudget:0,
  atlasData:[null,null,null],atlases:[blank,blank,blank],tableData,table,
  loading:false,pendingCount:0,readyPages:0,completedPages:0,requestedPages:0,error:false,budgetLimited:false,
  plans:[null,null,null],maxLevel:D.levels,loadedParents:0};
 const uniforms={earthDetailDay:{value:blank},earthDetailNight:{value:blank},earthDetailClouds:{value:blank},earthDetailTable:{value:table},earthDetailSize:{value:1}};
 const cache=new Map(),pending=new Map(),failed=new Set(),resident=[new Map(),new Map(),new Map()];
 let wantedParents=new Map(),desired=[[],[],[]],tick=0,alive=true,selectionKey='',planningKey='',contentDirty=false,canvas=null,context=null;
 const notify=()=>{if(alive)onReady();};
 function status(){
  // Coverage may be supplied by a coarse ancestor while its requested native
  // window is still loading. Count only the exact selected LOD for progress.
  const completed=desired.reduce((count,pages,layer)=>count+pages.filter(page=>resident[layer].has(page.key)).length,0);
  const count=pending.size,loading=count>0||[...wantedParents.keys()].some(key=>!cache.has(key)&&!failed.has(key)&&!parentIsResolved(key));
  if(state.completedPages!==completed||state.pendingCount!==count||state.loading!==loading){state.completedPages=completed;state.pendingCount=count;state.loading=loading;notify();}
 }
 function allocate(viewport){
  if(state.allocated||!maximumGrid)return;
  // Allocate the bounded capability budget once. A viewer first opened in a
  // small panel must retain the same detail capacity when expanded fullscreen.
  const preferred=maxPages?Math.floor(Math.sqrt(maxPages)):maximumGrid;
  const grid=Math.max(1,Math.min(maximumGrid,preferred));
  state.atlasGrid=grid;state.pageBudget=grid*grid;state.atlasSize=grid*D.pitch;
  for(let i=0;i<3;i++){
   const data=new Uint8Array(state.atlasSize*state.atlasSize*4);
   state.atlasData[i]=data;state.atlases[i]=texture(data,state.atlasSize,state.atlasSize,i!==2);
   state.atlases[i].name=`Earth observer ${D.layers[i]} detail atlas`;
   uniforms[['earthDetailDay','earthDetailNight','earthDetailClouds'][i]].value=state.atlases[i];
  }
  uniforms.earthDetailSize.value=state.atlasSize;state.allocated=true;state.version++;
 }
 function releaseParent(record){record?.release?.();if(record?.image?.tagName==='IMG')record.image.src='';record.image=null;}
 function nativeLoad(source,onLoad,onError){
  const image=document.createElementNS('http://www.w3.org/1999/xhtml','img');image.decoding='async';image.fetchPriority=source.medium?'high':'low';
  let active=true;
  const cleanup=()=>{image.removeEventListener('load',loaded);image.removeEventListener('error',errored);};
  function loaded(){cleanup();if(!active||!alive){image.src='';return;}active=false;onLoad({image});}
  function errored(){cleanup();if(!active)return;active=false;image.src='';onError();}
  image.addEventListener('load',loaded);image.addEventListener('error',errored);image.src=source.url;
  return ()=>{if(!active)return;active=false;cleanup();image.src='';};
 }
 function nativeExtract(record,source){
  if(!canvas){canvas=document.createElement('canvas');canvas.width=canvas.height=D.pitch;context=canvas.getContext('2d',{willReadFrequently:true});}
  context.clearRect(0,0,D.pitch,D.pitch);context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
  const scale=source.size/D.pageSize,sx0=source.x-D.border*scale,sy0=source.y-D.border*scale;
  const image=record.image,w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;
  const sx=Math.max(0,sx0),sy=Math.max(0,sy0),ex=Math.min(w,sx0+D.pitch*scale),ey=Math.min(h,sy0+D.pitch*scale);
  const dx=(sx-sx0)/scale,dy=(sy-sy0)/scale,dw=(ex-sx)/scale,dh=(ey-sy)/scale;
  context.drawImage(image,sx,sy,ex-sx,ey-sy,dx,dy,dw,dh);
  const pixels=context.getImageData(0,0,D.pitch,D.pitch).data;
  // Lower LODs consume the native 4px parent border at a smaller scale. Extend
  // only the extra outer gutter; interior pixels and their true neighbor pixel
  // remain geographic samples, avoiding seams and transparent-black filtering.
  const left=Math.max(0,Math.ceil(dx)),right=Math.min(D.pitch-1,Math.floor(dx+dw)-1),top=Math.max(0,Math.ceil(dy)),bottom=Math.min(D.pitch-1,Math.floor(dy+dh)-1);
  if(left||top||right<D.pitch-1||bottom<D.pitch-1)for(let y=0;y<D.pitch;y++)for(let x=0;x<D.pitch;x++){
   if(x>=left&&x<=right&&y>=top&&y<=bottom)continue;
   const from=(clamp(y,top,bottom)*D.pitch+clamp(x,left,right))*4,to=(y*D.pitch+x)*4;
   pixels[to]=pixels[from];pixels[to+1]=pixels[from+1];pixels[to+2]=pixels[from+2];pixels[to+3]=255;
  }
  return pixels;
 }
 function parentIsResolved(key){
  const request=wantedParents.get(key);if(!request)return true;
  return request.pages.every(({layer,page,fallback})=>{
   if(!fallback)return resident[layer].has(page.key);
   // A previously loaded native page also satisfies the medium parent used
   // only for first paint. Do not redownload an evicted coarse image forever.
   return desired[layer].filter(leaf=>Math.floor(leaf.col/2**leaf.level)===page.col&&Math.floor(leaf.row/2**leaf.level)===page.row).every(leaf=>{
    for(let level=leaf.level;level>=0;level--){const shift=2**(leaf.level-level);if(resident[layer].has(`${level}/${Math.floor(leaf.col/shift)}/${Math.floor(leaf.row/shift)}`))return true;}
    return false;
   });
  });
 }
 function trimCache(){
  const sorted=[...cache.entries()].sort((a,b)=>a[1].used-b[1].used);
  while(cache.size>parentLimit&&sorted.length){const [key,item]=sorted.shift();cache.delete(key);releaseParent(item);}
  state.loadedParents=cache.size;
 }
 function paint(layer,page,slot,source,record){
  const data=(extractPage||nativeExtract)(record,source,page,layer);
  const target=state.atlasData[layer],x=(slot%state.atlasGrid)*D.pitch,y=Math.floor(slot/state.atlasGrid)*D.pitch;
  for(let row=0;row<D.pitch;row++)target.set(data.subarray(row*D.pitch*4,(row+1)*D.pitch*4),((y+row)*state.atlasSize+x)*4);
  resident[layer].set(page.key,{...page,slot,used:++tick});record.used=++tick;
 }
 function rebuild(){
  if(!state.allocated||!alive)return;
  let changed=false,ready=0;
  for(let layer=0;layer<3;layer++){
   const selected=new Map();let atlasChanged=false;
   for(const leaf of desired[layer]){
    for(let level=leaf.level;level>=0;level--){
     const shift=2**(leaf.level-level),page={level,col:Math.floor(leaf.col/shift),row:Math.floor(leaf.row/shift)};page.key=keyOf(page);
     const source=earthDetailSource(D.layers[layer],page),record=cache.get(source.key),existing=resident[layer].get(page.key);
     if(existing||record){selected.set(page.key,{page,source,record,existing});break;}
    }
   }
   const used=new Set();for(const item of selected.values())if(item.existing)used.add(item.existing.slot);
   for(const item of selected.values()){
    if(item.existing){item.existing.used=++tick;continue;}
    let slot=0;while(used.has(slot))slot++;used.add(slot);
    for(const [key,old] of resident[layer])if(old.slot===slot)resident[layer].delete(key);
    paint(layer,item.page,slot,item.source,item.record);changed=true;atlasChanged=true;
   }
   // Only selected resident pages enter the table. A ready parent covers every
   // not-yet-ready descendant; its slot cannot be recycled until the new cut
   // has complete geographic coverage. Unselected pages remain a bounded LRU.
   const planeStart=layer*D.tableRows*D.tableColumns*4,planeEnd=planeStart+D.tableRows*D.tableColumns*4;
   const next=new Uint8Array(planeEnd-planeStart);
   const entries=[...selected.values()].sort((a,b)=>a.page.level-b.page.level);
   for(const {page} of entries){
    const residentPage=resident[layer].get(page.key),span=2**(D.maxLevel-page.level),x=page.col*span,y=page.row*span;
    for(let row=y;row<y+span;row++)for(let col=x;col<x+span;col++){
     const p=(row*D.tableColumns+col)*4;next[p]=residentPage.slot%state.atlasGrid;next[p+1]=Math.floor(residentPage.slot/state.atlasGrid);next[p+2]=page.level+1;next[p+3]=255;
    }
   }
   for(let i=0;i<next.length;i++)if(tableData[planeStart+i]!==next[i]){changed=true;break;}
   tableData.set(next,planeStart);ready+=selected.size;
   if(atlasChanged)state.atlases[layer].needsUpdate=true;
  }
  state.readyPages=ready;
  if(changed){table.needsUpdate=true;state.version++;notify();}
  contentDirty=false;trimCache();
 }
 function pump(){
  if(!alive)return;
  const requests=[...wantedParents.values()].sort((a,b)=>b.priority-a.priority);
  for(const source of requests){
   if(pending.size>=concurrency)break;
   if(cache.has(source.key)||pending.has(source.key)||failed.has(source.key)||parentIsResolved(source.key))continue;
   const pendingRecord={cancel:null};pending.set(source.key,pendingRecord);
   pendingRecord.cancel=(loadParent||nativeLoad)(source,record=>{
    if(!alive||pending.get(source.key)!==pendingRecord){releaseParent(record);return;}
    pending.delete(source.key);
    if(!wantedParents.has(source.key)){releaseParent(record);pump();status();return;}
    record.used=++tick;cache.set(source.key,record);contentDirty=true;
    // A new frame installs decoded pages and updates both render paths together.
    // Keep the cache alive until that cut has consumed the parent image.
    notify();status();
   },()=>{
    if(!alive||pending.get(source.key)!==pendingRecord)return;
    pending.delete(source.key);failed.add(source.key);state.error=true;notify();pump();status();
   });
  }
  status();
 }
 function requestsForPlans(){
  const requests=new Map();
  function add(layer,page,priority,medium=false){
   const source=earthDetailSource(D.layers[layer],page,medium),old=requests.get(source.key);
   if(old){old.priority=Math.max(old.priority,priority);old.pages.push({layer,page,fallback:medium});return;}
   requests.set(source.key,{...source,medium,priority,pages:[{layer,page,fallback:medium}]});
  }
  for(let layer=0;layer<3;layer++)for(const page of desired[layer]){
   // The medium parent is small enough for a useful first frame and supplies
   // L0, L1 and L2 without repeated downloads. Native parents then refine it.
   const root={level:0,col:Math.floor(page.col/2**page.level),row:Math.floor(page.row/2**page.level)};root.key=keyOf(root);
   const hasCover=resident[layer].has(page.key)||resident[layer].has(root.key);
   if(!hasCover)add(layer,root,1e9+page.priority,true);
   add(layer,page,page.priority);
  }
  wantedParents=requests;
  for(const [key,record] of pending)if(!wantedParents.has(key)){record.cancel?.();pending.delete(key);}
 }
 return {state,uniforms,
  prepare(camera,mesh,viewport={}){
   if(!alive)return;allocate(viewport);if(!state.allocated)return;
   mesh.updateWorldMatrix(true,false);camera.updateWorldMatrix(true,false);
   const nextPlanningKey=[...camera.matrixWorld.elements,...camera.projectionMatrix.elements,...mesh.matrixWorld.elements,viewport.width||1024,viewport.height||768,viewport.pixelRatio||1].join(',');
   if(nextPlanningKey!==planningKey){
    planningKey=nextPlanningKey;const plans=[];
    for(let layer=0;layer<3;layer++)plans.push(planEarthDetail(camera,mesh,{...viewport,maxPages:state.pageBudget,maxLevel:D.levels[D.layers[layer]],
     radius:layer===2?cloudRadius:1,shadowPadding:layer===2?Math.sqrt(2*(cloudRadius-1)):0}));
    const nextKey=plans.map(plan=>plan.pages.map(page=>page.key).sort().join(',')).join(';');
    state.plans=plans;state.budgetLimited=plans.some(plan=>plan.budgetLimited);state.requestedPages=plans.reduce((n,plan)=>n+plan.pages.length,0);
    if(nextKey!==selectionKey){selectionKey=nextKey;desired=plans.map(plan=>plan.pages);requestsForPlans();contentDirty=true;}
   }
   if(contentDirty)rebuild();
   // Rebuild can turn all virtual windows of a decoded parent into resident
   // pages, so completed files no longer need to stay in the download queue.
   pump();
  },
  dispose(){
   if(!alive)return;alive=false;state.disposed=true;
   for(const record of pending.values())record.cancel?.();pending.clear();wantedParents.clear();
   for(const record of cache.values())releaseParent(record);cache.clear();
   for(const pages of resident)pages.clear();
   for(const map of new Set([...state.atlases,blank,table]))map.dispose();
   state.atlasData=[null,null,null];state.tableData=new Uint8Array(0);state.loading=false;state.pendingCount=0;
   state.readyPages=state.completedPages=state.requestedPages=0;
   if(canvas)canvas.width=canvas.height=1;canvas=context=null;
  }
 };
}
