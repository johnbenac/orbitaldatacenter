import * as T from './vendor/three.module.js';
import {getSpacecraftMaterial,materialForRole,materialLibraryRevision} from './spacecraft-materials.js';

// These are display parameters, not thermal optical coefficients or an alloy
// specification. The MEL owns the evidence status for every material choice.
// All geometry shares one decoded map set per material, including across
// launch/integration and orbital views. No per-object image or texture clones.
const profiles={
 'aluminum-structure':{color:'#c1c8cc',metalness:.70,roughness:.55,tile:[.25,.25],normal:.25},
 'aluminum-anodized':{color:'#adb6bc',metalness:.42,roughness:.61,tile:[.25,.25],normal:.20},
 'black-anodized-aluminum':{color:'#262c31',metalness:.32,roughness:.66,tile:[.25,.25],normal:.18},
 'aluminum-honeycomb':{color:'#777f83',metalness:.56,roughness:.73,tile:[.024,.02771],normal:.60},
 'cfrp-boom':{color:'#303539',metalness:.06,roughness:.67,tile:[.08,.32],normal:.25},
 'mli-aluminized-polyimide':{color:'#b88738',metalness:.58,roughness:.48,tile:[.8,.8],normal:.72,clearcoat:.23,clearcoatRoughness:.25},
 'white-beta-cloth':{color:'#e3e2d8',metalness:0,roughness:.94,tile:[.04,.04],normal:.22},
 'radiator-osr':{color:'#ced8dc',metalness:.42,roughness:.49,tile:[.32,.32],normal:.22,clearcoat:1,clearcoatRoughness:.13},
 'radiator-white-paint':{color:'#e7e8e1',metalness:0,roughness:.94,tile:[.16,.16],normal:.16},
 'pv-silicon':{color:'#1f2e39',metalness:.12,roughness:.51,tile:[.64,.64],normal:.12,clearcoat:.72,clearcoatRoughness:.25},
 'pv-multijunction':{color:'#192d4b',metalness:.16,roughness:.51,tile:[.64,.32],normal:.12,clearcoat:.75,clearcoatRoughness:.23},
 'coverglass':{color:'#b4c1c7',metalness:.05,roughness:.32,tile:[.08,.08],normal:.08,clearcoat:1,clearcoatRoughness:.12},
 'solar-blanket-backing':{color:'#5c472a',metalness:.08,roughness:.72,tile:[.16,.16],normal:.16},
 'titanium-tank':{color:'#969a9d',metalness:.62,roughness:.65,tile:[.35,.35],normal:.18},
 'copv-carbon':{color:'#2c3135',metalness:.04,roughness:.64,tile:[.18,.18],normal:.22,clearcoat:.14,clearcoatRoughness:.35},
 'stainless-tube':{color:'#b2b9bd',metalness:.77,roughness:.52,tile:[.12,.12],normal:.16},
 'refractory-nozzle':{color:'#595b5d',metalness:.44,roughness:.73,tile:[.25,.25],normal:.16},
 'harness-polyimide':{color:'#996d33',metalness:.03,roughness:.79,tile:[.06,.06],normal:.14},
 'optical-glass':{color:'#223541',metalness:.05,roughness:.25,tile:[.12,.12],normal:.03,clearcoat:1,clearcoatRoughness:.08},
 'copper-thermal':{color:'#b46f42',metalness:.78,roughness:.54,tile:[.15,.15],normal:.18},
 'electronics-board':{color:'#1a3731',metalness:.04,roughness:.84,tile:[.24,.24],normal:.08},
 'gold-plated-contact':{color:'#c9a858',metalness:.81,roughness:.47,tile:[.08,.08],normal:.10},
 'rf-dielectric':{color:'#e0dccd',metalness:0,roughness:.86,tile:[.12,.12],normal:.10},
 'unresolved-dielectric':{color:'#292d30',metalness:0,roughness:.88,tile:[.10,.10],normal:.10},
};
const materialCache=new Map(),textureCache=new Map(),listeners=new Set(),pending=new Set(),failed=new Set();
let notificationQueued=false;
function notify(){
 if(notificationQueued)return;notificationQueued=true;
 queueMicrotask(()=>{notificationQueued=false;for(const listener of listeners)listener();});
}
export function onSpacecraftTextureUpdate(listener){listeners.add(listener);return ()=>listeners.delete(listener);}
export const spacecraftTextureStatus=()=>({pending:pending.size,failed:[...failed],loaded:textureCache.size-pending.size-failed.size});

function texture(path,kind,profile){
 if(textureCache.has(path))return textureCache.get(path);
 // Numerical geometry checks use a tiny canvas stub. They do not need image
 // loading; color fallbacks keep their material metadata identical to WebGL.
 if(typeof document==='undefined'||typeof document.createElementNS!=='function')return null;
 const source=document.createElement('canvas');source.width=source.height=2;
 const ctx=source.getContext('2d');ctx.fillStyle=kind==='base'?profile.color:kind==='normal'?'#8080ff':'#d8d8d8';ctx.fillRect(0,0,2,2);
 const map=new T.Texture(source);map.name=path;map.colorSpace=kind==='base'?T.SRGBColorSpace:T.NoColorSpace;
 map.wrapS=map.wrapT=T.RepeatWrapping;map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;
 map.anisotropy=8;map.userData.shared=true;map.needsUpdate=true;textureCache.set(path,map);pending.add(path);
 new T.ImageLoader().load(new URL(path,import.meta.url).href,image=>{map.image=image;map.needsUpdate=true;pending.delete(path);notify();},undefined,()=>{pending.delete(path);failed.add(path);notify();});
 return map;
}

export function spacecraftMaterial(id,role=''){
 const key=id+'/'+role;if(materialCache.has(key))return materialCache.get(key);
 const record=getSpacecraftMaterial(id),p=profiles[id];if(!record||!p)throw new Error('Unknown spacecraft rendering material: '+id);
 const maps=record.texture||{},base=texture(maps.baseColorUrl||'assets/materials/'+id+'-base.webp','base',p),normal=texture(maps.normalUrl||'assets/materials/'+id+'-normal.webp','normal',p),rough=texture(maps.roughnessUrl||'assets/materials/'+id+'-roughness.webp','roughness',p);
 const options={color:base?'#ffffff':p.color,metalness:p.metalness,roughness:p.roughness,map:base,normalMap:normal,normalScale:new T.Vector2(p.normal,p.normal),roughnessMap:rough};
 const material=p.clearcoat!=null?new T.MeshPhysicalMaterial({...options,clearcoat:p.clearcoat,clearcoatRoughness:p.clearcoatRoughness}):new T.MeshStandardMaterial(options);
 material.name=record.name+(role?' · '+role:'');material.userData={shared:true,materialId:id,materialRole:role,textureId:record.textureId,textureTileM:[...(maps.tileSizeM||p.tile)],materialLibraryRevision,physicalMaterial:true,materialFallbackColor:new T.Color(p.color)};
 materialCache.set(key,material);return material;
}
export function roleMaterial(h,role){const id=materialForRole(h,role);if(!id)throw new Error('Unknown spacecraft rendering role: '+role);return spacecraftMaterial(id,role);}
export function tagMaterial(mesh){
 const m=mesh.material;if(m?.userData?.physicalMaterial===false)return engineeringGraphic(mesh,m.userData.surfaceRepresentation||'Engineering graphic');
 if(m?.userData?.materialId){
  for(const key of ['materialId','materialRole','textureId','materialLibraryRevision','physicalMaterial'])mesh.userData[key]=m.userData[key];
 }return mesh;
}
export function engineeringGraphic(mesh,kind){mesh.userData.physicalMaterial=false;mesh.userData.surfaceRepresentation=kind;return mesh;}
export const materialTileM=mesh=>mesh.material?.userData?.textureTileM||[1,1];

function ownUV(mesh){
 if(!mesh.geometry?.attributes.uv)return null;
 // Three's BufferGeometry.copy shares userData by reference. Detach that
 // object as well as the UV buffer or the cached source loses its shared flag,
 // and later spacecraft rebuilds repeatedly scale the same UV coordinates.
 if(mesh.geometry.userData.shared){const source=mesh.geometry;mesh.geometry=source.clone();mesh.geometry.userData={...source.userData,shared:false};}
 return mesh.geometry.attributes.uv;
}
export function boxMaterialUV(mesh,w,h,d){
 if(!mesh.material?.userData?.materialId)return mesh;
 const uv=ownUV(mesh);if(!uv||uv.count!==24)return mesh;
 const [u,v]=materialTileM(mesh),sizes=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
 for(let f=0;f<6;f++)for(let j=0;j<4;j++)uv.setXY(4*f+j,(j%2?sizes[f][0]:0)/u,(j<2?sizes[f][1]:0)/v);
 uv.needsUpdate=true;return mesh;
}
export function planeMaterialUV(mesh,width,depth,sign=1){
 if(!mesh.material?.userData?.materialId)return mesh;
 const uv=ownUV(mesh);if(!uv||uv.count!==4)return mesh;const [u,v]=materialTileM(mesh);
 for(let j=0;j<4;j++)uv.setXY(j,(sign<0?(j%2?0:width):(j%2?width:0))/u,(j<2?depth:0)/v);
 uv.needsUpdate=true;return mesh;
}
export function cylinderMaterialUV(mesh,radius,height){
 if(!mesh.material?.userData?.materialId)return mesh;
 const key=radius+'/'+height;if(mesh.userData.materialCylinderKey===key)return mesh;mesh.userData.materialCylinderKey=key;
 const uv=ownUV(mesh);if(!uv)return mesh;const [u,v]=materialTileM(mesh),n=mesh.geometry.attributes.normal;
 const seed=mesh.userData.materialCylinderUV||(mesh.userData.materialCylinderUV=Float32Array.from(uv.array));
 for(let j=0;j<uv.count;j++){const cap=Math.abs(n.getY(j))>.999;uv.setXY(j,seed[2*j]*(cap?2*radius:2*Math.PI*radius)/u,seed[2*j+1]*(cap?2*radius:height)/v);}
 uv.needsUpdate=true;return mesh;
}
export function sphereMaterialUV(mesh,radius){
 if(!mesh.material?.userData?.materialId)return mesh;
 const uv=ownUV(mesh);if(!uv)return mesh;const [u,v]=materialTileM(mesh);
 for(let j=0;j<uv.count;j++)uv.setXY(j,uv.getX(j)*2*Math.PI*radius/u,uv.getY(j)*Math.PI*radius/v);
 uv.needsUpdate=true;return mesh;
}
export function finalizeCraftMaterials(root){
 const counts={physical:0,illustrative:0,unassigned:0,byMaterial:{},byRole:{}};
 root.traverse(mesh=>{
  if(mesh.isLine||mesh.isLineSegments){engineeringGraphic(mesh,'Engineering line or seam');return;}
  if(!mesh.isMesh)return;
  tagMaterial(mesh);
  if(mesh.userData.physicalMaterial===false){counts.illustrative++;return;}
  if(!mesh.userData.materialId){counts.unassigned++;return;}
  counts.physical++;counts.byMaterial[mesh.userData.materialId]=(counts.byMaterial[mesh.userData.materialId]||0)+1;counts.byRole[mesh.userData.materialRole]=(counts.byRole[mesh.userData.materialRole]||0)+1;
 });
 root.userData.materialCoverage=counts;root.userData.materialLibraryRevision=materialLibraryRevision;return root;
}
