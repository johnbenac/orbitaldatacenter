import * as T from './vendor/three.module.js';
import {roundedConnectionRoute,sampleConnectionRoute,routeLength} from './connection-routes.js';
import {tagMaterial} from './spacecraft-material-render.js';
import {objectMatrixInFrame} from './routing-audit.js';

// Fixed buffers: moving hinges update vertices, never allocate a TubeGeometry
// every frame. Circular fillets cannot overshoot through a box as a free spline
// can. Both ends are exactly the supplied physical connector exit positions.
export function connectionTube(parent,{radius=.006,material,part='harness',segments=48,radialSegments=8,name='Connected harness',bendRadiusM=.03}={}){
 segments=Math.max(96,segments);
 const rings=segments+1,stride=radialSegments+1,count=rings*stride+2,positions=new Float32Array(count*3),normals=new Float32Array(count*3),uv=new Float32Array(count*2),indices=[];
 for(let i=0;i<rings;i++)for(let j=0;j<=radialSegments;j++){const n=i*stride+j;uv[n*2]=j/radialSegments;uv[n*2+1]=i/segments;if(i<segments&&j<radialSegments){const a=n,b=n+stride;indices.push(a,a+1,b,b,a+1,b+1);}}
 const cap0=rings*stride,cap1=cap0+1;for(let j=0;j<radialSegments;j++){indices.push(cap0,j+1,j);const n=segments*stride+j;indices.push(cap1,n,n+1);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('normal',new T.BufferAttribute(normals,3));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.setIndex(indices);geometry.userData.dynamicConnection=true;
 const mesh=tagMaterial(new T.Mesh(geometry,material));mesh.name=name;mesh.userData.part=part;mesh.userData.dynamicConnection=true;mesh.userData.hardwareDetailExclude=true;mesh.userData.physicalRadiusM=radius;mesh.userData.connectionSegments=segments;mesh.userData.connectionRadialSegments=radialSegments;geometry.userData.bendRadiusM=bendRadiusM;parent.add(mesh);
 const tangent=new T.Vector3(),normal=new T.Vector3(),binormal=new T.Vector3(),p=new T.Vector3(),offset=new T.Vector3(),curve=[];
 let key='',route={points:[],lengthM:0,minimumBendRadiusM:Infinity,bendLimited:false};
 function update(input,{sampled=false,minimumBendRadiusM=null}={}){
  const next=input.map(q=>q.isVector3?q.toArray():q);if(next.some(q=>q.length!==3||q.some(x=>!Number.isFinite(x))))throw new Error('Non-finite connection point: '+name);const value=(sampled?'sampled:':'rounded:')+next.map(q=>q.map(x=>x.toFixed(9)).join(',')).join(';');if(value===key)return false;key=value;
  route=sampled?{points:next,lengthM:routeLength(next),minimumBendRadiusM:minimumBendRadiusM??Infinity,bendLimited:minimumBendRadiusM!=null&&minimumBendRadiusM+1e-7<bendRadiusM}:roundedConnectionRoute(next,bendRadiusM);const samples=sampleConnectionRoute(route.points,segments,{preserveVertices:true});if(samples.length<2){mesh.visible=false;return false;}mesh.visible=route.lengthM>1e-7;curve.length=0;curve.push(...samples.map(q=>new T.Vector3(...q)));
  for(let i=0;i<rings;i++){
   p.copy(curve[i]);tangent.copy(curve[Math.min(segments,i+1)]).sub(curve[Math.max(0,i-1)]).normalize();
   if(i===0){normal.set(Math.abs(tangent.y)<.9?0:1,Math.abs(tangent.y)<.9?1:0,0);normal.addScaledVector(tangent,-normal.dot(tangent)).normalize();}else{normal.addScaledVector(tangent,-normal.dot(tangent)).normalize();if(normal.lengthSq()<.5)normal.set(1,0,0).addScaledVector(tangent,-tangent.x).normalize();}
   binormal.crossVectors(tangent,normal).normalize();
   for(let j=0;j<=radialSegments;j++){const n=i*stride+j,angle=j/radialSegments*Math.PI*2;offset.copy(normal).multiplyScalar(Math.cos(angle)).addScaledVector(binormal,Math.sin(angle));positions.set([p.x+offset.x*radius,p.y+offset.y*radius,p.z+offset.z*radius],n*3);normals.set(offset.toArray(),n*3);uv[n*2+1]=route.lengthM*i/segments/.06;}
  }
  positions.set(curve[0].toArray(),cap0*3);positions.set(curve.at(-1).toArray(),cap1*3);normals.set(curve[0].clone().sub(curve[1]).normalize().toArray(),cap0*3);normals.set(curve.at(-1).clone().sub(curve.at(-2)).normalize().toArray(),cap1*3);
  geometry.attributes.position.needsUpdate=true;geometry.attributes.normal.needsUpdate=true;geometry.attributes.uv.needsUpdate=true;geometry.computeBoundingBox();geometry.computeBoundingSphere();mesh.userData.connectionLengthM=route.lengthM;return true;
 }
 function pointAt(t,target=new T.Vector3()){if(!curve.length)return target.set(0,0,0);const n=Math.max(0,Math.min(1,t))*segments,i=Math.min(segments-1,Math.floor(n));return target.copy(curve[i]).lerp(curve[i+1],n-i);}
 // Read centres back out of the rendered rings; validation must detect a
 // corrupted displayed buffer rather than merely trusting the route recipe.
 function sampledPoints(){const out=[];for(let i=0;i<rings;i++){const c=new T.Vector3();for(let j=0;j<radialSegments;j++)c.add(new T.Vector3().fromBufferAttribute(geometry.attributes.position,i*stride+j));out.push(c.multiplyScalar(1/radialSegments));}return out;}
 return {mesh,update,pointAt,sampledPoints,radiusM:radius,bendRadiusM,get route(){return route;},get endpoints(){return curve.length?[new T.Vector3().fromBufferAttribute(geometry.attributes.position,cap0),new T.Vector3().fromBufferAttribute(geometry.attributes.position,cap1)]:[];}};
}

export function connectionAnchor(parent,position=[0,0,0],normal=[0,0,1],name='Interface'){
 const anchor=new T.Object3D();anchor.name=name;anchor.position.set(...position);anchor.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...normal).normalize());parent.add(anchor);return anchor;
}
export function anchorInFrame(anchor,frame,target=new T.Vector3()){
 return target.set(0,0,0).applyMatrix4(objectMatrixInFrame(anchor,frame));
}
export function normalInFrame(anchor,frame,target=new T.Vector3()){
 return target.set(0,0,1).transformDirection(objectMatrixInFrame(anchor,frame));
}
