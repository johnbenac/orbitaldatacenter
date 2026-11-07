// Shared Earth appearance for the orbital globe and the spacecraft's distant
// perspective pass. Satellite composites supply the geography and cloud field.
// The shading is a single-scattering visual model, not a weather observation or
// a replacement for the mission's independently calculated radiation budgets.
import * as T from './vendor/three.module.js';
import {R} from './orbit.js';
import {createEarthDetail,earthDetailShader,EARTH_DETAIL} from './earth-detail.js';

export const EARTH_STYLE=Object.freeze({
 cloudRadius:1+8/R,atmosphereRadius:1+80/R,
 rayleighHeight:8/R,mieHeight:1.2/R,
 rayleigh:Object.freeze([.0058*R,.0135*R,.0331*R]),mie:.003*R,
 // The phase functions integrate to one over solid angle. Their solar factor
 // is therefore incident irradiance; a Lambertian surface receives E / pi.
 // Keep scattering and surfaceDirect on that same scale instead of lifting
 // the air independently and washing out the satellite's surface contrast.
 solarRadiance:Math.PI*1.55,mieG:.76,atmosphereSteps:6,
 surfaceAmbient:.0015,surfaceDirect:1.55,
 cloudLow:.08,cloudHigh:.88,cloudAmbient:.0015,cloudWrap:.085,cloudDirect:1.52,
 cloudShadow:.34,nightGain:2.8,nightStart:-.16,nightEnd:.04,
 nightBlueWeight:.7,nightMaskLow:.001,nightMaskHigh:.02,
 glintGain:.62,glintPower:120,
 tileColumns:8,tileRows:4,tileInterior:2048,tileBorder:2,tileSize:2052
});
const E=EARTH_STYLE,TAU=Math.PI*2,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const earthSmoothstep=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*(3-2*u);};
export const earthCloudCoverage=value=>earthSmoothstep(E.cloudLow,E.cloudHigh,value);
// Black Marble's cool cartographic context is not emitted light. Separate it
// in linear RGB before applying the solar-night gate, retaining neutral and
// warm city lights and a smooth transition for their dim antialiased edges.
export const earthNightLightMask=(r,g,b)=>earthSmoothstep(E.nightMaskLow,E.nightMaskHigh,Math.max(r,g)-E.nightBlueWeight*b);

// Approximate spherical slant column. The expression approaches H / cos(z)
// overhead and the finite tangent column sqrt(pi*R*H/2) at the horizon.
export function earthAirMass(radius,cosine,height){
 return 2*height/Math.max(1e-7,Math.sqrt(cosine*cosine+8*height/(Math.PI*radius))+cosine);
}
export function earthSunTransmission(radius,cosine,out){
 const altitude=Math.max(0,radius-1);
 if(cosine<0&&cosine*cosine>1-1/(radius*radius)){out[0]=out[1]=out[2]=0;return out;}
 const ray=Math.exp(-altitude/E.rayleighHeight)*earthAirMass(radius,cosine,E.rayleighHeight);
 const mie=Math.exp(-altitude/E.mieHeight)*earthAirMass(radius,cosine,E.mieHeight)*E.mie;
 for(let c=0;c<3;c++)out[c]=Math.exp(-E.rayleigh[c]*ray-mie);
 return out;
}

// Allocation-free CPU equivalent of the atmosphere shader. All distances are
// Earth radii and all vectors are unit / Earth-local as appropriate. `out`
// receives linear in-scattered radiance RGB followed by view transmittance RGB.
// start/end are already clipped to the atmosphere and the visible surface.
export function integrateEarthAtmosphere(origin,dir,sun,start,end,out,groundHit=false){
 out[0]=out[1]=out[2]=0;out[3]=out[4]=out[5]=1;
 const length=end-start;if(!(length>0))return out;
 const mu=dir[0]*sun[0]+dir[1]*sun[1]+dir[2]*sun[2];
 const rayPhase=3*(1+mu*mu)/(16*Math.PI),g=E.mieG;
 const miePhase=(1-g*g)/(4*Math.PI*Math.pow(1+g*g-2*g*mu,1.5));
 let viewR=0,viewM=0;
 for(let i=0;i<E.atmosphereSteps;i++){
  let a=i/E.atmosphereSteps,b=(i+1)/E.atmosphereSteps;
  if(groundHit){a=1-(1-a)*(1-a);b=1-(1-b)*(1-b);}
  const dt=(b-a)*length,t=start+(a+b)*.5*length;
  const px=origin[0]+dir[0]*t,py=origin[1]+dir[1]*t,pz=origin[2]+dir[2]*t;
  const radius=Math.hypot(px,py,pz),altitude=Math.max(0,radius-1);
  const densityR=Math.exp(-altitude/E.rayleighHeight),densityM=Math.exp(-altitude/E.mieHeight);
  const midwayR=viewR+densityR*dt*.5,midwayM=viewM+densityM*dt*.5;
  const solarDot=px*sun[0]+py*sun[1]+pz*sun[2];
  if(solarDot>=0||solarDot*solarDot<radius*radius-1){
   const cosine=solarDot/radius;
   const sunR=densityR*earthAirMass(radius,cosine,E.rayleighHeight);
   const sunM=densityM*earthAirMass(radius,cosine,E.mieHeight);
   const mieDepth=E.mie*(midwayM+sunM);
   for(let c=0;c<3;c++){
    const trans=Math.exp(-E.rayleigh[c]*(midwayR+sunR)-mieDepth);
    out[c]+=trans*(E.rayleigh[c]*densityR*rayPhase+E.mie*densityM*miePhase)*dt*E.solarRadiance;
   }
  }
  viewR+=densityR*dt;viewM+=densityM*dt;
 }
 for(let c=0;c<3;c++)out[c+3]=Math.exp(-E.rayleigh[c]*viewR-E.mie*viewM);
 return out;
}

const number=x=>Number(x).toPrecision(12);
const constants=`
const float PI=3.141592653589793;
const float TAU=6.283185307179586;
const float CLOUD_RADIUS=${number(E.cloudRadius)};
const float AIR_RADIUS=${number(E.atmosphereRadius)};
const float HR=${number(E.rayleighHeight)};
const float HM=${number(E.mieHeight)};
const vec3 BETA_R=vec3(${E.rayleigh.map(number).join(',')});
const float BETA_M=${number(E.mie)};
const float SUN_RADIANCE=${number(E.solarRadiance)};
const float MIE_G=${number(E.mieG)};
`;
const vertexShader=`
varying vec3 worldPoint;
void main(){
 vec4 p=modelMatrix*vec4(position,1.0);
 worldPoint=p.xyz;
 gl_Position=projectionMatrix*viewMatrix*p;
}`;
const sharedShader=`
${constants}
varying vec3 worldPoint;
uniform mat4 earthInverse;
uniform vec3 earthEye;
uniform vec3 earthDirection;
uniform vec3 sunLocal;
uniform bool parallelView;
uniform sampler2D cloudsMap;
vec2 earthUV(vec3 n){return vec2(fract(.5+atan(-n.z,n.x)/TAU),.5+asin(clamp(n.y,-1.0,1.0))/PI);}
vec2 sphereHit(vec3 origin,vec3 ray,float radius){
 float b=dot(origin,ray),disc=b*b-dot(origin,origin)+radius*radius;
 if(disc<0.0)return vec2(-1.0);
 float h=sqrt(disc);return vec2(-b-h,-b+h);
}
void viewingRay(out vec3 origin,out vec3 ray){
 vec3 point=(earthInverse*vec4(worldPoint,1.0)).xyz;
 ray=parallelView?earthDirection:normalize(point-earthEye);
 origin=parallelView?point-ray*dot(point-earthEye,ray):earthEye;
}
float cloudCoverage(vec3 n){return smoothstep(${number(E.cloudLow)},${number(E.cloudHigh)},texture2D(cloudsMap,earthUV(n)).r);}
float airMass(float radius,float mu,float height){
 return 2.0*height/max(1e-7,sqrt(mu*mu+8.0*height/(PI*radius))+mu);
}
vec3 sunTransmission(float radius,float mu){
 if(mu<0.0&&mu*mu>1.0-1.0/(radius*radius))return vec3(0.0);
 float h=max(0.0,radius-1.0);
 float r=exp(-h/HR)*airMass(radius,mu,HR);
 float m=exp(-h/HM)*airMass(radius,mu,HM);
 return exp(-BETA_R*r-BETA_M*m);
}
void integrateAir(vec3 origin,vec3 ray,float start,float end,bool groundHit,out vec3 scatter,out vec3 transmission){
 scatter=vec3(0.0);transmission=vec3(1.0);
 float pathLength=end-start;if(pathLength<=0.0)return;
 float mu=dot(ray,sunLocal);
 float phaseR=3.0*(1.0+mu*mu)/(16.0*PI);
 float phaseM=(1.0-MIE_G*MIE_G)/(4.0*PI*pow(1.0+MIE_G*MIE_G-2.0*MIE_G*mu,1.5));
 float viewR=0.0,viewM=0.0;
 for(int i=0;i<${E.atmosphereSteps};i++){
  float a=float(i)/${E.atmosphereSteps}.0,b=float(i+1)/${E.atmosphereSteps}.0;
  if(groundHit){a=1.0-(1.0-a)*(1.0-a);b=1.0-(1.0-b)*(1.0-b);}
  float dt=(b-a)*pathLength,t=start+(a+b)*.5*pathLength;
  vec3 point=origin+ray*t;
  float radius=length(point),h=max(0.0,radius-1.0);
  float densityR=exp(-h/HR),densityM=exp(-h/HM);
  float midwayR=viewR+densityR*dt*.5,midwayM=viewM+densityM*dt*.5;
  float solarDot=dot(point,sunLocal);
  if(solarDot>=0.0||solarDot*solarDot<radius*radius-1.0){
   float solarMu=solarDot/radius;
   float sunR=densityR*airMass(radius,solarMu,HR),sunM=densityM*airMass(radius,solarMu,HM);
   vec3 trans=exp(-BETA_R*(midwayR+sunR)-BETA_M*(midwayM+sunM));
   scatter+=trans*(BETA_R*densityR*phaseR+BETA_M*densityM*phaseM)*dt*SUN_RADIANCE;
  }
  viewR+=densityR*dt;viewM+=densityM*dt;
 }
 transmission=exp(-BETA_R*viewR-BETA_M*viewM);
}
vec3 cloudRadiance(vec3 normal){
 float mu=dot(normal,sunLocal),day=smoothstep(-.14,.04,mu);
 vec3 light=sunTransmission(CLOUD_RADIUS,mu);
 return vec3(${number(E.cloudAmbient)})+light*day*(${number(E.cloudWrap)}+${number(E.cloudDirect)}*max(0.0,mu));
}
`;

const surfaceShader=`
${sharedShader}
uniform sampler2D dayMap;
uniform sampler2D nightMap;
uniform sampler2D oceanMap;
uniform sampler2D detailMap0;
uniform sampler2D detailMap1;
uniform sampler2D detailMap2;
uniform sampler2D detailMap3;
uniform vec3 detailTile0;
uniform vec3 detailTile1;
uniform vec3 detailTile2;
uniform vec3 detailTile3;
vec3 dayDetail(vec3 base,vec2 uv,sampler2D tile,vec3 slot){
 vec2 p=uv*vec2(8.0,4.0)-vec2(slot.x,3.0-slot.y);
 if(slot.z<.5||p.x<0.0||p.x>1.0||p.y<0.0||p.y>1.0)return base;
 // The overlap is geographic data, not repeated edge pixels. Fade the last
 // two interior pixels into the base until an adjacent tile is resident.
 float edge=min(min(p.x,1.0-p.x),min(p.y,1.0-p.y));
 float blend=smoothstep(0.0,2.0/2048.0,edge);
 vec2 tileUV=(vec2(2.0)+p*2048.0)/2052.0;
 return mix(base,texture2D(tile,tileUV).rgb,blend);
}
vec3 dayColor(vec2 uv){
 vec3 c=texture2D(dayMap,uv).rgb;
 c=dayDetail(c,uv,detailMap0,detailTile0);
 c=dayDetail(c,uv,detailMap1,detailTile1);
 c=dayDetail(c,uv,detailMap2,detailTile2);
 return dayDetail(c,uv,detailMap3,detailTile3);
}
float nightLightMask(vec3 c){
 return smoothstep(${number(E.nightMaskLow)},${number(E.nightMaskHigh)},max(c.r,c.g)-${number(E.nightBlueWeight)}*c.b);
}
void main(){
 vec3 origin,ray;viewingRay(origin,ray);
 vec2 surfaceHit=sphereHit(origin,ray,1.0);
 float ground=surfaceHit.x>=0.0?surfaceHit.x:surfaceHit.y;
 if(ground<0.0)discard;
 vec3 normal=normalize(origin+ray*ground);vec2 uv=earthUV(normal);
 float mu=dot(normal,sunLocal),direct=max(0.0,mu);
 vec3 incident=sunTransmission(1.0,max(0.0,mu));
 float shellDistance=-mu+sqrt(mu*mu+CLOUD_RADIUS*CLOUD_RADIUS-1.0);
 float shadow=cloudCoverage(normalize(normal+sunLocal*shellDistance));
 vec3 albedo=dayColor(uv);
 vec3 color=albedo*(${number(E.surfaceAmbient)}+${number(E.surfaceDirect)}*direct*incident*(1.0-${number(E.cloudShadow)}*shadow));
 // The geographic water mask includes sea ice; a bright ice albedo suppresses
 // the liquid-water highlight without inventing a live seasonal ice product.
 float ocean=texture2D(oceanMap,uv).r*(1.0-smoothstep(.20,.55,dot(albedo,vec3(.2126,.7152,.0722))));
 vec3 halfVector=normalize(sunLocal-ray);
 float fresnel=.02+.98*pow(1.0-max(0.0,dot(normal,-ray)),5.0);
 float glint=${number(E.glintGain)}*pow(max(0.0,dot(normal,halfVector)),${number(E.glintPower)})*(.18+2.0*fresnel)*direct*ocean;
 color+=incident*glint;
 float night=1.0-smoothstep(${number(E.nightStart)},${number(E.nightEnd)},mu);
 vec3 nightColor=texture2D(nightMap,uv).rgb;
 color+=nightColor*(${number(E.nightGain)}*night*nightLightMask(nightColor));
 vec2 cloudHit=sphereHit(origin,ray,CLOUD_RADIUS);
 float cloud=cloudHit.x>=0.0?cloudHit.x:cloudHit.y;
 float coverage=0.0;
 if(cloud>=0.0&&cloud<ground){
  vec3 cloudNormal=normalize(origin+ray*cloud);coverage=cloudCoverage(cloudNormal);
  color=mix(color,cloudRadiance(cloudNormal),coverage);
 }
 vec2 air=sphereHit(origin,ray,AIR_RADIUS);
 vec3 scatter,transmission;
 integrateAir(origin,ray,max(0.0,air.x),mix(ground,cloud,coverage),true,scatter,transmission);
 gl_FragColor=vec4(color*transmission+scatter,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

const atmosphereShader=`
${sharedShader}
void main(){
 vec3 origin,ray;viewingRay(origin,ray);
 vec2 ground=sphereHit(origin,ray,1.0);
 if(ground.y>0.0)discard;
 vec2 air=sphereHit(origin,ray,AIR_RADIUS);if(air.y<=0.0)discard;
 vec2 cloud=sphereHit(origin,ray,CLOUD_RADIUS);
 float coverage=0.0,end=air.y;vec3 color=vec3(0.0);
 if(cloud.x>=0.0){
  vec3 n=normalize(origin+ray*cloud.x);coverage=cloudCoverage(n);
  color=cloudRadiance(n)*coverage;end=mix(end,cloud.x,coverage);
 }
 vec3 scatter,transmission;
 integrateAir(origin,ray,max(0.0,air.x),end,coverage>.0,scatter,transmission);
 color=color*transmission+scatter;
 float alpha=coverage+(1.0-coverage)*(1.0-dot(transmission,vec3(.2126,.7152,.0722)));
 if(alpha<.0001)discard;
 gl_FragColor=vec4(color/max(alpha,.0001),alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

function solidTexture(bytes,srgb=false){
 const map=new T.DataTexture(new Uint8Array(bytes),1,1,T.RGBAFormat);
 map.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;map.needsUpdate=true;
 map.userData.shared=true;return map;
}

/**
 * Geography stays Earth-fixed. Call update with the inertial Sun transformed
 * into scene axes, then prepare with the actual mesh/camera before its pass.
 * The meshes can be cloned: their materials, texture state and shaders remain
 * shared, while prepare supplies the current pass's local observer transform.
 */
export function createEarthAppearance({onReady=()=>{},gpu=true,maxTextureSize=8192,anisotropy=8}={}){
 const capability=Math.max(1,Number(maxTextureSize)||4096);
 const compact=!gpu||capability<8192||((globalThis.navigator?.deviceMemory||8)<=4)||!!globalThis.matchMedia?.('(max-width: 800px)').matches;
 const textureAnisotropy=gpu?Math.max(1,Math.min(12,anisotropy||1)):1;
 const fallback={day:solidTexture([12,30,51,255],true),clouds:solidTexture([0,0,0,255]),night:solidTexture([0,0,0,255],true),ocean:solidTexture([0,0,0,255])};
 const state={maps:{...fallback},details:[null,null,null,null],sun:new T.Vector3(1,0,0),
  cloudRadius:E.cloudRadius,atmosphereRadius:E.atmosphereRadius,style:E,
  version:0,loading:false,pendingCount:0,baseReady:false,detailReady:0,resolution:0,error:false};
 const uniforms={
  earthInverse:{value:new T.Matrix4()},earthEye:{value:new T.Vector3(0,0,5)},earthDirection:{value:new T.Vector3(0,0,-1)},
  sunLocal:{value:new T.Vector3(1,0,0)},parallelView:{value:false},
  dayMap:{value:state.maps.day},cloudsMap:{value:state.maps.clouds},nightMap:{value:state.maps.night},oceanMap:{value:state.maps.ocean}
 };
 for(let i=0;i<4;i++){uniforms['detailMap'+i]={value:fallback.day};uniforms['detailTile'+i]={value:new T.Vector3(-1,-1,0)};}
 const material=new T.ShaderMaterial({uniforms,vertexShader,fragmentShader:surfaceShader});
 const airMaterial=new T.ShaderMaterial({uniforms,vertexShader,fragmentShader:atmosphereShader,transparent:true,side:T.BackSide,depthWrite:false});
 material.name='NASA Earth surface, cloud field and night lights';airMaterial.name='Sunlit atmospheric slant path';
 material.userData={shared:true,earthSurface:state};airMaterial.userData={shared:true,earthAtmosphere:state};
 const geometry=new T.SphereGeometry(1,256,160),airGeometry=new T.SphereGeometry(E.atmosphereRadius,256,160);
 geometry.userData.shared=airGeometry.userData.shared=true;
 const surface=new T.Mesh(geometry,material),atmosphere=new T.Mesh(airGeometry,airMaterial);
 surface.name='Earth · NASA satellite composites';atmosphere.name='Earth · atmospheric limb';atmosphere.renderOrder=1;
 let alive=true,started=false,basePending=0,tick=0;
 const cache=new Map(),pending=new Map(),failed=new Set(),baseLoads=new Set(),owned=new Set(Object.values(fallback));
 let wanted=[],detailKey='';
 const inverse=new T.Matrix4(),point=new T.Vector3(),ray=new T.Vector3(),origin=new T.Vector3(),eye=new T.Vector3(),toward=new T.Vector3();
 const notify=()=>{if(alive){state.version++;onReady();}};
 function status(){
  const count=basePending+pending.size,loading=count>0;
  if(count!==state.pendingCount||loading!==state.loading){state.pendingCount=count;state.loading=loading;notify();}
 }
 function release(map){
  if(!map||!owned.has(map))return;
  owned.delete(map);map.dispose();
  if(map.image?.tagName==='IMG')map.image.src='';
  if(map.image?.tagName==='CANVAS')map.image.width=map.image.height=1;
  map.image=null;
 }
 function loadImage(path,srgb,onLoad,onError){
  const image=document.createElementNS('http://www.w3.org/1999/xhtml','img');
  image.decoding='async';image.fetchPriority=path.startsWith('day-')?'high':'low';
  let active=true;
  const cleanup=()=>{image.removeEventListener('load',loaded);image.removeEventListener('error',errored);};
  function loaded(){
   cleanup();if(!active||!alive){image.src='';return;}
   active=false;
   let decoded=image;
   if(gpu&&Math.max(image.naturalWidth||image.width,image.naturalHeight||image.height)>capability){
    const canvas=document.createElement('canvas'),scale=capability/Math.max(image.naturalWidth||image.width,image.naturalHeight||image.height);
    canvas.width=Math.max(1,Math.round((image.naturalWidth||image.width)*scale));canvas.height=Math.max(1,Math.round((image.naturalHeight||image.height)*scale));
    const context=canvas.getContext('2d');context.imageSmoothingQuality='high';context.drawImage(image,0,0,canvas.width,canvas.height);image.src='';decoded=canvas;
   }
   const map=new T.Texture(decoded);map.name=path;map.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;
   map.flipY=true;map.wrapS=path.startsWith('day-16k/')?T.ClampToEdgeWrapping:T.RepeatWrapping;
   map.wrapT=T.ClampToEdgeWrapping;map.anisotropy=textureAnisotropy;
   map.magFilter=T.LinearFilter;map.minFilter=gpu?T.LinearMipmapLinearFilter:T.LinearFilter;
   map.generateMipmaps=!!gpu;map.needsUpdate=true;map.userData.shared=true;owned.add(map);onLoad(map);
  }
  function errored(){cleanup();if(!active)return;active=false;if(alive)onError();}
  image.addEventListener('load',loaded);image.addEventListener('error',errored);image.src='./vendor/earth/'+path;
  return ()=>{if(!active)return;active=false;cleanup();image.src='';};
 }
 function baseMap(key,path,srgb,final=false){
  basePending++;status();
  let cancel;
  cancel=loadImage(path,srgb,map=>{
   baseLoads.delete(cancel);basePending--;
   // A very fast full map must not be overwritten by a late preview decode.
   if(key==='day'&&!final&&state.baseReady){release(map);status();return;}
   const old=state.maps[key];state.maps[key]=map;uniforms[(key==='clouds'?'clouds':key)+'Map'].value=map;
   if(key==='day'){state.resolution=map.image.width;if(final)state.baseReady=true;}
   if(old!==fallback[key])release(old);
   notify();status();
  },()=>{baseLoads.delete(cancel);basePending--;state.error=true;notify();status();});
  baseLoads.add(cancel);
 }
 function start(){
  if(started||!alive)return;started=true;
  baseMap('day','day-1k.jpg',true);
  baseMap('day','day-4k.jpg',true,true);
  baseMap('clouds',compact?'clouds-4k.jpg':'clouds-8k.jpg',false);
  baseMap('night','night-4k.jpg',true);
  baseMap('ocean','ocean-2k.png',false);
 }
 function syncDetails(){
  let count=0;
  for(let i=0;i<4;i++){
   const record=cache.get(wanted[i]);state.details[i]=record?{col:record.col,row:record.row,map:record.map}:null;
   uniforms['detailMap'+i].value=record?.map||fallback.day;
   uniforms['detailTile'+i].value.set(record?.col??-1,record?.row??-1,record?1:0);
   if(record){record.used=++tick;count++;}
  }
  state.detailReady=count;
 }
 function prune(){
  const limit=compact?4:8;
  const stale=[...cache.entries()].filter(([key])=>!wanted.includes(key)).sort((a,b)=>a[1].used-b[1].used);
  while(cache.size>limit&&stale.length){const [key,item]=stale.shift();cache.delete(key);release(item.map);}
 }
 function pump(){
  if(!alive)return;
  for(const key of wanted){
   if(pending.size>=2)break;
   if(cache.has(key)||pending.has(key)||failed.has(key))continue;
   const [col,row]=key.split('/').map(Number),record={cancel:null};pending.set(key,record);
   record.cancel=loadImage(`day-16k/c${col}-r${row}.jpg`,true,map=>{
    pending.delete(key);
    if(!wanted.includes(key)){release(map);pump();status();return;}
    cache.set(key,{col,row,map,used:++tick});syncDetails();prune();notify();pump();status();
   },()=>{pending.delete(key);failed.add(key);pump();status();});
  }
  status();
 }
 function selectDetails(camera){
  const span=camera.isOrthographicCamera?(camera.top-camera.bottom)/(camera.zoom||1):Infinity;
  const close=camera.isPerspectiveCamera?eye.length()<2.8:span<1.65;
  if(!close||capability<E.tileSize)return [];
  const scores=new Map();
  for(let y=-3;y<=3;y++)for(let x=-4;x<=4;x++){
   const nx=x/4*.94,ny=y/3*.94;
   point.set(nx,ny,camera.isOrthographicCamera?-1:0).unproject(camera).applyMatrix4(inverse);
   if(camera.isOrthographicCamera){origin.copy(point);ray.copy(uniforms.earthDirection.value);}
   else{origin.copy(eye);ray.subVectors(point,origin).normalize();}
   const b=origin.dot(ray),disc=b*b-origin.lengthSq()+1;if(disc<0)continue;
   const t=-b-Math.sqrt(disc);if(t<=0)continue;
   point.copy(origin).addScaledVector(ray,t).normalize();
   const u=(.5+Math.atan2(-point.z,point.x)/TAU+1)%1,v=.5-Math.asin(clamp(point.y,-1,1))/Math.PI;
   const col=Math.min(7,Math.floor(u*8)),row=Math.min(3,Math.floor(v*4)),key=col+'/'+row;
   scores.set(key,(scores.get(key)||0)+1/(.35+nx*nx+ny*ny));
  }
  return [...scores.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4).map(([key])=>key);
 }
 return {surface,atmosphere,state,ensureLoaded:start,
  update(sunVector){
   if(sunVector?.isVector3&&sunVector.lengthSq()>0)state.sun.copy(sunVector).normalize();
  },
  prepare(camera,planetMesh=surface){
   if(!alive)return;start();
   planetMesh.updateWorldMatrix(true,false);camera.updateWorldMatrix(true,false);
   inverse.copy(planetMesh.matrixWorld).invert();uniforms.earthInverse.value.copy(inverse);
   camera.getWorldPosition(eye).applyMatrix4(inverse);uniforms.earthEye.value.copy(eye);
   camera.getWorldDirection(toward).transformDirection(inverse);uniforms.earthDirection.value.copy(toward);
   uniforms.sunLocal.value.copy(state.sun).transformDirection(inverse);uniforms.parallelView.value=!!camera.isOrthographicCamera;
   const next=selectDetails(camera),key=next.join(';');
   if(key===detailKey)return;detailKey=key;wanted=next;
   for(const [old,record] of pending)if(!wanted.includes(old)){record.cancel?.();pending.delete(old);}
   syncDetails();prune();notify();pump();
  },
  dispose(){
   if(!alive)return;alive=false;
   for(const cancel of baseLoads)cancel();for(const record of pending.values())record.cancel?.();
   baseLoads.clear();pending.clear();cache.clear();state.details.fill(null);
   for(const map of [...owned])release(map);
   geometry.dispose();airGeometry.dispose();material.dispose();airMaterial.dispose();
   state.loading=false;state.pendingCount=0;
  }
 };
}

// Keep the overview shader byte-for-byte unchanged. The observer pass uses the
// same surface radiometry, cloud shading and atmosphere, replacing only its
// imagery lookup with the independently managed regional day/night/cloud LOD.
const observerSharedShader=sharedShader.replace(
 `float cloudCoverage(vec3 n){return smoothstep(${number(E.cloudLow)},${number(E.cloudHigh)},texture2D(cloudsMap,earthUV(n)).r);}`,
 `${earthDetailShader}\nfloat cloudCoverage(vec3 n){vec2 uv=earthUV(n);return smoothstep(${number(E.cloudLow)},${number(E.cloudHigh)},earthDetailCloudAt(uv,texture2D(cloudsMap,uv).r));}`
);
const observerDayLookup=`
vec3 dayColor(vec2 uv){
 vec4 detail=earthDetailDayAt(uv);
 return detail.a>.5?detail.rgb:texture2D(dayMap,uv).rgb;
}
`;
let observerSurfaceShader=surfaceShader.replace(sharedShader,observerSharedShader);
observerSurfaceShader=observerSurfaceShader.slice(0,observerSurfaceShader.indexOf('uniform sampler2D detailMap0;'))+observerDayLookup+
 observerSurfaceShader.slice(observerSurfaceShader.indexOf('float nightLightMask'));
observerSurfaceShader=observerSurfaceShader.replace(
 `vec3 nightColor=texture2D(nightMap,uv).rgb;\n color+=nightColor*(${number(E.nightGain)}*night*nightLightMask(nightColor));`,
 `vec4 detailNight=earthDetailNightAt(uv);\n vec3 nightColor;\n if(detailNight.a>.5)nightColor=vec3(detailNight.r)*vec3(${EARTH_DETAIL.nightTint.map(number).join(',')});\n else{nightColor=texture2D(nightMap,uv).rgb;nightColor*=nightLightMask(nightColor);}\n color+=nightColor*(${number(E.nightGain)}*night);`
);
const observerAtmosphereShader=atmosphereShader.replace(sharedShader,observerSharedShader);

/**
 * Independent close-observer appearance. The base owns the global maps and
 * sphere geometry; this controller owns only its materials and detail atlases.
 * It never calls base.prepare, selects legacy globe tiles, or edits globe state.
 * Supply actual rendered width/height (or CSS size plus pixelRatio) for LOD.
 */
export function createEarthObserverAppearance({base,onReady=()=>{},gpu=true,maxTextureSize=4096,anisotropy=1,detailOptions={}}={}){
 if(!base?.surface||!base?.state)throw new TypeError('Earth observer appearance requires a base Earth appearance');
 let alive=true,lastBaseVersion=-1,lastDetailVersion=-1;
 const state={maps:base.state.maps,details:[],sun:base.state.sun.clone(),cloudRadius:E.cloudRadius,atmosphereRadius:E.atmosphereRadius,
  style:E,observer:true,version:0,loading:false,pendingCount:0,baseReady:false,detailReady:0,resolution:0,error:false,detail:null};
 const syncState=()=>{
  if(!alive)return;
  state.loading=!!(base.state.loading||state.detail?.loading);
  state.pendingCount=(base.state.pendingCount||0)+(state.detail?.pendingCount||0);
  state.baseReady=base.state.baseReady;state.resolution=base.state.resolution;
  state.error=!!(base.state.error||state.detail?.error);state.detailReady=state.detail?.readyPages||0;
  if(lastBaseVersion!==base.state.version||lastDetailVersion!==state.detail?.version){
   lastBaseVersion=base.state.version;lastDetailVersion=state.detail?.version;state.version++;
  }
 };
 const detail=createEarthDetail({...detailOptions,gpu,maxTextureSize,cloudRadius:E.cloudRadius,onReady:()=>{syncState();if(alive)onReady();}});
 state.detail=detail.state;
 const uniforms={
  earthInverse:{value:new T.Matrix4()},earthEye:{value:new T.Vector3(0,0,5)},earthDirection:{value:new T.Vector3(0,0,-1)},
  sunLocal:{value:new T.Vector3(1,0,0)},parallelView:{value:false},
  dayMap:{value:state.maps.day},cloudsMap:{value:state.maps.clouds},nightMap:{value:state.maps.night},oceanMap:{value:state.maps.ocean},
  ...detail.uniforms
 };
 const material=new T.ShaderMaterial({uniforms,vertexShader,fragmentShader:observerSurfaceShader});
 const airMaterial=new T.ShaderMaterial({uniforms,vertexShader,fragmentShader:observerAtmosphereShader,transparent:true,side:T.BackSide,depthWrite:false});
 material.name='Earth observer · regional surface, cloud field and city lights';airMaterial.name='Earth observer · atmospheric slant path';
 material.userData={shared:true,earthSurface:state};airMaterial.userData={shared:true,earthAtmosphere:state};
 const surface=new T.Mesh(base.surface.geometry,material),atmosphere=new T.Mesh(base.atmosphere.geometry,airMaterial);
 surface.name='Earth observer · native satellite detail';atmosphere.name='Earth observer · atmospheric limb';atmosphere.renderOrder=1;
 const inverse=new T.Matrix4(),eye=new T.Vector3(),toward=new T.Vector3();
 return {surface,atmosphere,state,
  update(sunVector){if(sunVector?.isVector3&&sunVector.lengthSq()>0)state.sun.copy(sunVector).normalize();},
  prepare(camera,planetMesh=surface,viewport={}){
   if(!alive)return;base.ensureLoaded();
   planetMesh.updateWorldMatrix(true,false);camera.updateWorldMatrix(true,false);
   inverse.copy(planetMesh.matrixWorld).invert();uniforms.earthInverse.value.copy(inverse);
   camera.getWorldPosition(eye).applyMatrix4(inverse);uniforms.earthEye.value.copy(eye);
   camera.getWorldDirection(toward).transformDirection(inverse);uniforms.earthDirection.value.copy(toward);
   uniforms.sunLocal.value.copy(state.sun).transformDirection(inverse);uniforms.parallelView.value=!!camera.isOrthographicCamera;
   for(const layer of ['day','clouds','night','ocean'])uniforms[layer+'Map'].value=state.maps[layer];
   detail.prepare(camera,planetMesh,viewport);syncState();
  },
  dispose(){
   if(!alive)return;alive=false;detail.dispose();material.dispose();airMaterial.dispose();
   state.loading=false;state.pendingCount=0;
  }
 };
}
