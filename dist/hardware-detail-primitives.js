// Optional visual geometry. Work in metres after the source's local scale, then
// return geometry to that source's coordinate system. The engineering mesh,
// articulation, analytical areas and shared resources remain authoritative.
import * as T from './vendor/three.module.js';

const V=x=>x?.isVector3?x.clone():new T.Vector3(...(x||[0,0,0]));
const axisVector=a=>a?.isVector3?a.clone().normalize():Array.isArray(a)?V(a).normalize():new T.Vector3(a==='x'?1:0,a==='y'?1:0,a==='z'?1:0);
const axes=['x','y','z'];
const fallback=new Map();
const aliases={paint:'white',insulator:'gasket',circuit:'board',brass:'gold',black:'dark',rubber:'gasket'};
const colors={metal:0xa9b3bd,steel:0x8f9ca6,dark:0x242d35,gold:0xc4a059,copper:0xa66a40,white:0xe2e7e6,gasket:0x151b22,glass:0x467b91,board:0x154c41,carbon:0x202b30,label:0xd4dbd8};
function materialFor(key,materials,source){
 if(key?.isMaterial)return key;
 key=aliases[key]||key||'metal';
 if(materials?.[key]?.isMaterial)return materials[key];
 if(!fallback.has(key)){
  const m=new T.MeshStandardMaterial({color:colors[key]??colors.metal,roughness:key==='glass'?.20:key==='gasket'?.92:.46,metalness:['metal','steel','gold','copper'].includes(key)?.72:.08});
  m.name='Illustrative hardware detail / '+key;m.userData={shared:true,physicalMaterial:true,hardwareDetailMaterial:true};fallback.set(key,m);
 }
 return fallback.get(key)||source.material;
}

export function physicalBounds(source){
 const geometry=source?.geometry,position=geometry?.getAttribute('position');if(!position)return null;
 const local=geometry.boundingBox?.clone()||new T.Box3().setFromBufferAttribute(position);
 const scale=source.scale.clone(),a=local.min.clone().multiply(scale),b=local.max.clone().multiply(scale);
 const bounds=new T.Box3(a.clone().min(b),a.clone().max(b));
 return {bounds,min:bounds.min.clone(),max:bounds.max.clone(),center:bounds.getCenter(new T.Vector3()),size:bounds.getSize(new T.Vector3()),scale};
}

// A small local merger deliberately strips incidental attributes. Each detail
// material becomes one draw call, regardless of the number of screws or ribs.
export function mergeDetailGeometries(geometries){
 if(!geometries.length)return null;
 let count=0,indexCount=0;for(const g of geometries){count+=g.attributes.position.count;indexCount+=g.index?.count||g.attributes.position.count;}
 const positions=new Float32Array(count*3),normals=new Float32Array(count*3),uvs=new Float32Array(count*2),indices=new (count>65535?Uint32Array:Uint16Array)(indexCount);
 let offset=0,io=0;
 for(const g of geometries){
  if(!g.attributes.normal)g.computeVertexNormals();const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){positions.set([p.getX(i),p.getY(i),p.getZ(i)],(offset+i)*3);normals.set([n.getX(i),n.getY(i),n.getZ(i)],(offset+i)*3);if(uv)uvs.set([uv.getX(i),uv.getY(i)],(offset+i)*2);}
  const length=g.index?.count||p.count;for(let i=0;i<length;i++)indices[io++]=offset+(g.index?g.index.getX(i):i);offset+=p.count;
 }
 const out=new T.BufferGeometry();out.setAttribute('position',new T.BufferAttribute(positions,3));out.setAttribute('normal',new T.BufferAttribute(normals,3));out.setAttribute('uv',new T.BufferAttribute(uvs,2));out.setIndex(new T.BufferAttribute(indices,1));out.computeBoundingBox();out.computeBoundingSphere();out.userData={shared:false,hardwareDetail:true};return out;
}

/** Builders take metre coordinates in the scaled local frame; add consumes its
 * geometry. finish() returns a tagged Group, including when it is empty. */
export function createDetailKit(source,context={}){
 const b=physicalBounds(source);if(!b)throw new Error('Hardware details need a bounded mesh');
 const {size,center,min,max,scale}=b,high=context.tier!=='medium',segments=high?20:12;
 const inverse=new T.Matrix4().makeScale(1/(scale.x||1),1/(scale.y||1),1/(scale.z||1)),buckets=new Map();
 const thickness=Math.max(.00006,Math.min(.004,Math.max(size.x,size.y,size.z)*.004));
 function add(geometry,key='metal',position=[0,0,0],rotation=null){
  if(!geometry?.attributes.position)return;
  const p=V(position),q=rotation?.isQuaternion?rotation.clone():rotation?.isEuler?new T.Quaternion().setFromEuler(rotation):Array.isArray(rotation)?new T.Quaternion().setFromEuler(new T.Euler(...rotation)):new T.Quaternion();
  geometry.applyMatrix4(new T.Matrix4().compose(p,q,new T.Vector3(1,1,1))).applyMatrix4(inverse);
  const material=materialFor(key,context.materials,source);if(!buckets.has(material))buckets.set(material,[]);buckets.get(material).push(geometry);
 }
 const orient=(from,axis)=>new T.Quaternion().setFromUnitVectors(from,axisVector(axis));
 function box(position,dimensions,key='metal',rotation=null){const d=V(dimensions);if(Math.min(d.x,d.y,d.z)<=0)return;add(new T.BoxGeometry(d.x,d.y,d.z),key,position,rotation);}
 function cylinder(position,radius,height,key='metal',axis='y',radialSegments=segments){if(!(radius>0&&height>0))return;add(new T.CylinderGeometry(radius,radius,height,Math.max(6,radialSegments),1),key,position,orient(new T.Vector3(0,1,0),axis));}
 function sphere(position,radius,key='metal'){if(radius>0)add(new T.SphereGeometry(radius,segments,Math.max(8,segments/2)),key,position);}
 function torus(position,radius,tubeRadius,key='metal',axis='y'){if(radius>0&&tubeRadius>0)add(new T.TorusGeometry(radius,tubeRadius,high?8:6,high?40:24),key,position,orient(new T.Vector3(0,0,1),axis));}
 function tube(points,radius,key='dark'){
  const vertices=points.map(V);if(vertices.length<2||radius<=0)return;
  const path=new T.CatmullRomCurve3(vertices,false,'centripetal');add(new T.TubeGeometry(path,Math.min(48,Math.max(4,(vertices.length-1)*(high?6:4))),radius,high?8:6,false),key);
 }
 function bolt(position,radius,key='metal',axis='y'){
  if(!(radius>0))return;const p=V(position),dir=axisVector(axis);
  cylinder(p,radius*1.22,radius*.15,key,dir,high?16:10);
  cylinder(p.clone().addScaledVector(dir,radius*.25),radius,radius*.44,key,dir,6);
  // The dark hexagonal socket sits just above the cap, giving it a readable
  // center at close range without a Boolean mesh or six separate screws.
  if(high)cylinder(p.clone().addScaledVector(dir,radius*.48),radius*.39,radius*.025,'dark',dir,6);
 }
 function boltRow(start,end,count,radius,key='metal',axis='y'){const a=V(start),b=V(end);for(let i=0;i<count;i++)bolt(a.clone().lerp(b,count===1?.5:i/(count-1)),radius,key,axis);}
 function finish(){
  const group=new T.Group();group.name='High-detail hardware';group.userData={hardwareDetail:true,detailSourceId:source.id,detailTier:context.tier||'high'};group.hardwareDetailSource=source;
  for(const [material,gs] of buckets){
   const geometry=mergeDetailGeometries(gs);for(const g of gs)g.dispose();if(!geometry)continue;
   const mesh=new T.Mesh(geometry,material);mesh.name=material.name||'Hardware detail';mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;
   mesh.userData={hardwareDetail:true,detailSourceId:source.id,part:source.userData.part,materialRole:source.userData.materialRole,materialId:material.userData.materialId,physicalMaterial:true};mesh.hardwareDetailSource=source;group.add(mesh);
  }
  buckets.clear();return group;
 }
 return {source,high,size,center,min,max,scale,thickness,add,box,cylinder,sphere,torus,tube,bolt,boltRow,finish};
}

function uvRange(g,start=0,count=g.attributes.uv?.count||0){const a=g.attributes.uv,range=[Infinity,-Infinity,Infinity,-Infinity];if(!a)return [0,1,0,1];for(let i=start;i<Math.min(a.count,start+count);i++){range[0]=Math.min(range[0],a.getX(i));range[1]=Math.max(range[1],a.getX(i));range[2]=Math.min(range[2],a.getY(i));range[3]=Math.max(range[3],a.getY(i));}return range.every(Number.isFinite)?range:[0,1,0,1];}
function mapUV(g,range,start=0,count=g.attributes.uv.count){const a=g.attributes.uv;for(let i=start;i<start+count;i++)a.setXY(i,range[0]+a.getX(i)*(range[1]-range[0]),range[2]+a.getY(i)*(range[3]-range[2]));}
function roundedBox(source,high){
 const b=physicalBounds(source),s=b.size,bevel=Math.min(Math.min(s.x,s.y,s.z)*.12,.012);if(!(bevel>1e-7))return null;
 const steps=high?3:1,n=steps*2+1,g=new T.BoxGeometry(s.x,s.y,s.z,n,n,n),p=g.attributes.position,normal=g.attributes.normal;
 const q=new T.Vector3(),point=new T.Vector3(),half=s.clone().multiplyScalar(.5),inner=half.clone().addScalar(-bevel);
 for(let i=0;i<p.count;i++){
  point.fromBufferAttribute(p,i);
  for(const axis of axes){const v=point[axis],h=half[axis],t=Math.round((v/h+1)*n/2);point[axis]=t<=steps?-h+bevel*t/steps:h-bevel*(n-t)/steps;}
  q.copy(point).clamp(inner.clone().negate(),inner);const outward=point.clone().sub(q).normalize();point.copy(q).addScaledVector(outward,bevel).add(b.center);p.setXYZ(i,point.x,point.y,point.z);normal.setXYZ(i,outward.x,outward.y,outward.z);
 }
 // Project the old face's two UV basis vectors onto the rounded vertices.
 // Uniform subdivision UVs would stretch most of a texture into the bevel.
 const faceCount=(n+1)*(n+1),oldP=source.geometry.attributes.position,oldUV=source.geometry.attributes.uv,uv=g.attributes.uv;
 for(let f=0;f<6;f++){
  if(oldUV?.count!==24){mapUV(g,uvRange(source.geometry),f*faceCount,faceCount);continue;}
  const first=f*4,o=new T.Vector3().fromBufferAttribute(oldP,first).multiply(b.scale),u=new T.Vector3().fromBufferAttribute(oldP,first+1).multiply(b.scale).sub(o),v=new T.Vector3().fromBufferAttribute(oldP,first+2).multiply(b.scale).sub(o);
  const uu=u.lengthSq(),vv=v.lengthSq();for(let j=f*faceCount;j<(f+1)*faceCount;j++){const d=new T.Vector3().fromBufferAttribute(p,j).sub(o),du=d.dot(u)/uu,dv=d.dot(v)/vv;uv.setXY(j,oldUV.getX(first)+du*(oldUV.getX(first+1)-oldUV.getX(first))+dv*(oldUV.getX(first+2)-oldUV.getX(first)),oldUV.getY(first)+du*(oldUV.getY(first+1)-oldUV.getY(first))+dv*(oldUV.getY(first+2)-oldUV.getY(first)));}
 }
 g.applyMatrix4(new T.Matrix4().makeScale(1/(b.scale.x||1),1/(b.scale.y||1),1/(b.scale.z||1)));return g;
}

/** Preserve the source's envelope and UV coverage. Custom meshes, cut walls,
 * planes, lathes and merged trays are handled with features, never subdivision. */
export function refinePrimitiveGeometry(source,tier='high'){
 const original=source?.geometry,p=original?.parameters;if(!p)return null;const high=tier!=='medium';let g=null;
 if(original.type==='BoxGeometry')g=roundedBox(source,high);
 else if(original.type==='CylinderGeometry'){
  const segments=Math.max(p.radialSegments||8,high?64:32);if(segments===(p.radialSegments||8))return null;
  g=new T.CylinderGeometry(p.radiusTop,p.radiusBottom,p.height,segments,p.heightSegments,p.openEnded,p.thetaStart,p.thetaLength);
  g.userData.hardwareCylinderUV=Float32Array.from(g.attributes.uv.array);
  const [u,v]=source.material?.userData?.textureTileM||[],params=source.userData.materialCylinderKey?.split('/').map(Number);
  if(u&&v&&params?.length===2){const [radius,height]=params,uv=g.attributes.uv,n=g.attributes.normal;for(let i=0;i<uv.count;i++){const cap=Math.abs(n.getY(i))>.999;uv.setXY(i,uv.getX(i)*(cap?2*radius:2*Math.PI*radius)/u,uv.getY(i)*(cap?2*radius:height)/v);}}
  else mapUV(g,uvRange(original));
 }
 else if(original.type==='SphereGeometry'){
  const w=Math.max(p.widthSegments||8,high?64:32),h=Math.max(p.heightSegments||6,high?40:20);if(w===(p.widthSegments||8)&&h===(p.heightSegments||6))return null;
  g=new T.SphereGeometry(p.radius,w,h,p.phiStart,p.phiLength,p.thetaStart,p.thetaLength);mapUV(g,uvRange(original));
 }
 else if(original.type==='TorusGeometry'){
  const radial=Math.max(p.radialSegments||8,high?16:10),tubular=Math.max(p.tubularSegments||24,high?80:48);if(radial===p.radialSegments&&tubular===p.tubularSegments)return null;
  g=new T.TorusGeometry(p.radius,p.tube,radial,tubular,p.arc);mapUV(g,uvRange(original));
 }
 if(!g)return null;
 g.userData={...g.userData,shared:false,hardwareDetail:true};g.computeBoundingBox();g.computeBoundingSphere();return g;
}
