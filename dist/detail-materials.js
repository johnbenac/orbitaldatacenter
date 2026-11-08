import * as T from './vendor/three.module.js';
import {spacecraftMaterial} from './spacecraft-material-render.js';

// Close inspection uses the same physical finish library as the full vehicle.
// Small printed patterns are illustrative surface detail, never specifications,
// company branding, extra MEL items, or a claim about a supplier's construction.
export const detailMaterialRevision='odc-detail-2026-11-r1';
const finishes={metal:'aluminum-anodized',steel:'stainless-tube',dark:'black-anodized-aluminum',black:'unresolved-dielectric',copper:'copper-thermal',gold:'gold-plated-contact',ceramic:'rf-dielectric',glass:'optical-glass',foil:'mli-aluminized-polyimide',white:'radiator-white-paint',carbon:'cfrp-boom'};
const MAX_DECALS=32;
let shared=null;

function makePool(){
 const borrowed=new Map(),owned=new Set(),textures=new Set(),patterns=new Map(),decals=new Map();
 const pool={users:0,materials:{},borrowed,owned,textures,decals};
 function material(name,options,fallback){
  const m=new T.MeshStandardMaterial(options);m.name='Inspection · '+name;
  m.userData={shared:true,physicalMaterial:true,detailMaterial:true,surfaceRepresentation:'Illustrative manufacturing detail',materialFallbackColor:new T.Color(fallback||options.color||'#b5bec1'),detailMaterialRevision};owned.add(m);return m;
 }
 function texture(name,width,height,pixel,draw){
  if(patterns.has(name))return patterns.get(name);
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  const image=ctx.createImageData(width,height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const c=pixel(x,y),i=(y*width+x)*4;image.data[i]=c[0];image.data[i+1]=c[1];image.data[i+2]=c[2];image.data[i+3]=255;}
  ctx.putImageData(image,0,0);draw?.(ctx,width,height);
  const map=new T.CanvasTexture(canvas);map.name='Inspection pattern · '+name;map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;map.userData={shared:true,detailMaterial:true};textures.add(map);patterns.set(name,map);return map;
 }
 const grain=(x,y)=>((x*17+y*31+(x*y)%43)%11)-5;
 function board(){
  const map=texture('board',256,256,(x,y)=>{const n=grain(x,y);return [20+n*.35,58+n,49+n*.7];},ctx=>{
   ctx.lineWidth=2;ctx.strokeStyle='#7f9756';
   for(let i=0;i<9;i++){const y=18+i*26;ctx.beginPath();ctx.moveTo(9,y);ctx.lineTo(34+i*3,y);ctx.lineTo(48+i*3,y+13);ctx.lineTo(186-i*2,y+13);ctx.lineTo(202-i*2,y-3);ctx.lineTo(247,y-3);ctx.stroke();}
   ctx.strokeStyle='#c2cdab';ctx.lineWidth=1;
   for(const [x,y,w,h] of [[60,34,48,34],[146,91,38,50],[48,169,58,32],[172,187,34,22]]){ctx.strokeRect(x,y,w,h);ctx.fillStyle='#d4d7b7';ctx.fillRect(x+3,y+3,3,3);}
   ctx.fillStyle='#bca964';for(let y=13;y<251;y+=21)for(const x of [7,249]){ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();}
  });
  const m=spacecraftMaterial('electronics-board','inspection-board').clone();m.name='Inspection · solder mask and printed traces';m.map=map||m.map;m.color.set(map?'#ffffff':'#1a3731');m.userData={...m.userData,shared:true,detailMaterial:true,surfaceRepresentation:'Illustrative PCB layout',detailMaterialRevision};owned.add(m);return m;
 }
 function decal(text,style='light'){
  const label=String(text||'COMPONENT').replace(/[^A-Za-z0-9 .:/+_-]/g,'').trim().slice(0,30)||'COMPONENT',kind=['dark','caution'].includes(style)?style:'light',key=kind+'/'+label;
  if(decals.has(key))return decals.get(key);
  // A bounded cache substitutes a neutral label after the cache fills.
  // Never evict a texture that an existing scene may still be rendering.
  if(decals.size>=MAX_DECALS)return pool.materials.label;
  const bg=kind==='dark'?[29,38,44]:kind==='caution'?[226,180,52]:[213,220,213],ink=kind==='dark'?'#d9e5df':'#1c292d';
  const map=texture('tag/'+key,256,64,()=>bg,ctx=>{ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.strokeRect(5,5,246,54);ctx.fillStyle=ink;ctx.textBaseline='middle';ctx.font='600 21px ui-monospace,monospace';ctx.fillText(label,13,32,230);});
  if(map)map.wrapS=map.wrapT=T.ClampToEdgeWrapping;
  const m=material('printed '+label,{map,color:map?'#ffffff':new T.Color(...bg.map(v=>v/255)),roughness:.88,metalness:0,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,side:T.DoubleSide},kind==='dark'?'#35424b':'#ced8d0');decals.set(key,m);return m;
 }
 const definitions={
  ...Object.fromEntries(Object.entries(finishes).map(([name,id])=>[name,()=>{if(!borrowed.has(name))borrowed.set(name,spacecraftMaterial(id,'inspection-'+name));return borrowed.get(name);} ])),
  board,
  rubber:()=>material('elastomer seals',{color:'#20282b',metalness:0,roughness:.94}),
  gasket:()=>pool.materials.rubber,
  label:()=>decal('COMPONENT'),
  caution:()=>{const map=texture('caution',128,64,(x,y)=>(x+y)%48<24?[218,172,47]:[30,36,38]);return material('caution stripes',{map,color:map?'#ffffff':'#d0a433',metalness:0,roughness:.85},'#b39544');},
  grip:()=>{const map=texture('grip',128,128,(x,y)=>{const r=x%12,n=grain(x,y)*.3,v=(r<2?18:r<5?38:29)+n;return [v,v+3,v+4];});return material('ribbed grip',{map,color:map?'#ffffff':'#222a2d',metalness:0,roughness:.96},'#222a2d');}
 };
 // Material getters allocate on first actual recipe use, not at scene creation.
 for(const [key,make] of Object.entries(definitions))Object.defineProperty(pool.materials,key,{enumerable:true,configurable:true,get(){const value=make();Object.defineProperty(pool.materials,key,{enumerable:true,value});return value;}});
 pool.decal=decal;
 // Reserve the shared fallback before user-generated labels fill the cache.
 pool.materials.label;
 return pool;
}

export function acquireDetailMaterials(){
 const pool=shared||(shared=makePool());pool.users++;let released=false;
 const palette=Object.create(pool.materials);
 palette.decal=(text,style)=>released?pool.materials.label:pool.decal(text,style);
 palette.stats=()=>({users:pool.users,materials:pool.owned.size+pool.borrowed.size,textures:pool.textures.size,decals:pool.decals.size,maxDecals:MAX_DECALS});
 palette.release=()=>{if(released)return;released=true;if(--pool.users)return;for(const m of pool.owned)m.dispose();for(const map of pool.textures)map.dispose();pool.owned.clear();pool.textures.clear();pool.decals.clear();if(shared===pool)shared=null;};
 return palette;
}
