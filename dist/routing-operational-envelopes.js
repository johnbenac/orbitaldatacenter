import * as T from './vendor/three.module.js';
import {segmentSegmentDistance,segmentTriangleDistance,routingMatrix,objectMatrixInFrame} from './routing-audit.js';

// Conservative all-angle keepouts, constructed from the actual installed
// vertex buffers. Joint angle samples are a regression check, not the proof.
const V=p=>new T.Vector3(...p),finite=n=>Number.isFinite(n),distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const boxOf=points=>({min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))});
const inherited=(o,key)=>{for(let p=o;p;p=p.parent)if(p.userData?.[key])return true;return false;};
function physicalMeshes(root){const out=[];root.traverse(o=>{if(o.isMesh&&o.geometry?.attributes?.position&&!o.userData.dynamicConnection&&!o.userData.routingNonPhysical&&!inherited(o,'engineeringGraphic')&&!inherited(o,'electricalOverview')&&o.material?.userData?.physicalMaterial!==false)out.push(o);});return out;}
function vertices(mesh,matrix){const a=mesh.geometry.attributes.position,out=[];for(let i=0;i<a.count;i++)out.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(matrix).toArray());return out;}
function triangles(mesh,points){const ix=mesh.geometry.index,rows=[];for(let i=0,n=ix?.count??points.length;i+2<n;i+=3)rows.push([0,1,2].map(k=>points[ix?ix.getX(i+k):i+k]));return rows;}
function descendant(node,parent){for(let p=node;p;p=p.parent)if(p===parent)return true;return false;}
function spectralUpper(matrix){const e=matrix.elements,c=[[e[0],e[1],e[2]],[e[4],e[5],e[6]],[e[8],e[9],e[10]]],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);return Math.sqrt(Math.max(...c.map(a=>c.reduce((s,b)=>s+Math.abs(dot(a,b)),0))));}
const maxScale=o=>Math.max(Math.abs(o.scale.x),Math.abs(o.scale.y),Math.abs(o.scale.z));
function rigidMotion(factory){return {kind:'rigid',frameId:factory.root.userData.routingMotion?.frameId||'body',attachment:'body',operationalEnvelope:true};}

function sphereRecord({id,center,radiusM,sourceMeshes,motionModel,basis,detail}){
 const obstacle={id,type:'capsule',a:[...center],b:[...center],radiusM,bounds:{min:center.map(v=>v-radiusM),max:center.map(v=>v+radiusM)},sourceMeshIds:sourceMeshes.map(m=>m.uuid),motionModel,operationalEnvelope:true};
 return {obstacle,proof:{id,kind:'sphere',center,radiusM,meshIds:obstacle.sourceMeshIds,basis,...detail}};
}

// Closed annular frusta. Outer polygons circumscribe their analytical
// circles; inner polygons are inscribed, preserving a real central void.
// Linear profiles are split where their inner radius reaches zero.
function annularMesh(profile,world,id,sourceMeshId,motionModel,sectors=64){
 const rows=profile.map(p=>({...p,outer:p.outer/Math.cos(Math.PI/sectors)})),tris=[],point=(row,inside,i)=>new T.Vector3((inside?row.inner:row.outer)*Math.cos(2*Math.PI*i/sectors),row.y,(inside?row.inner:row.outer)*Math.sin(2*Math.PI*i/sectors)).applyMatrix4(world).toArray();
 const add=(a,b,c)=>{const u=V(b).sub(V(a)),v=V(c).sub(V(a));if(u.cross(v).lengthSq()>1e-24)tris.push([a,b,c]);};
 for(let j=1;j<rows.length;j++)for(let i=0;i<sectors;i++){
  const a=point(rows[j-1],false,i),b=point(rows[j-1],false,i+1),c=point(rows[j],false,i+1),d=point(rows[j],false,i);add(a,b,c);add(a,c,d);
  const e=point(rows[j-1],true,i),f=point(rows[j-1],true,i+1),g=point(rows[j],true,i+1),h=point(rows[j],true,i);add(e,g,f);add(e,h,g);
 }
 for(const [j,flip]of [[0,true],[rows.length-1,false]])for(let i=0;i<sectors;i++){
  const a=point(rows[j],false,i),b=point(rows[j],false,i+1),c=point(rows[j],true,i+1),d=point(rows[j],true,i);if(flip){add(a,c,b);add(a,d,c);}else{add(a,b,c);add(a,c,d);}
 }
 return {id,type:'mesh',triangles:tris,bounds:boxOf(tris.flat()),closed:true,sourceMeshIds:[sourceMeshId],motionModel,operationalEnvelope:true};
}

function radialProfile(mesh,canonical,paddingM){
 const points=vertices(mesh,canonical),yMin=Math.min(...points.map(p=>p[1]))-paddingM,yMax=Math.max(...points.map(p=>p[1]))+paddingM,origin=[0,0,0],flat=points.map(p=>[p[0],0,p[2]]),radialMin=Math.max(0,Math.min(...triangles(mesh,flat).map(t=>segmentTriangleDistance(origin,origin,t)))-paddingM),radialMax=Math.max(...flat.map(p=>Math.hypot(p[0],p[2])))+paddingM;
 if(!(yMax>yMin))throw new Error('A finite-height terminal support is required: '+mesh.uuid);
 const p=mesh.geometry.parameters;
 if(mesh.geometry.type==='CylinderGeometry'&&p){
  const a=V([0,-p.height/2,0]).applyMatrix4(canonical).toArray(),b=V([0,p.height/2,0]).applyMatrix4(canonical).toArray(),r=Math.max(p.radiusTop,p.radiusBottom),e=canonical.elements,x=[e[0],e[1],e[2]],z=[e[8],e[9],e[10]],xx=x.reduce((s,v)=>s+v*v,0),zz=z.reduce((s,v)=>s+v*v,0),xz=x.reduce((s,v,i)=>s+v*z[i],0),transverse=Math.sqrt((xx+zz+Math.sqrt((xx-zz)**2+4*xz*xz))/2),capsuleR=r*transverse+paddingM;
  const radialA=Math.hypot(a[0],a[2]),radialB=Math.hypot(b[0],b[2]),radialCross=a[0]*b[2]-a[2]*b[0],radialDot=a[0]*b[0]+a[2]*b[2];
  const primitiveVerified=points.every(q=>segmentSegmentDistance(q,q,a,b).distanceM<=capsuleR+1e-9);
  if(primitiveVerified&&Math.abs(b[1]-a[1])>1e-8&&Math.abs(radialCross)<1e-8&&radialDot>=-1e-10&&Math.abs(radialA-radialB)>1e-8){
   // A capsule around this radial strut contains every triangle by
   // convexity. Its revolution fits between these two sloping lines.
   const slope=(radialB-radialA)/(b[1]-a[1]),intercept=radialA-slope*a[1],pad=capsuleR*Math.hypot(1,slope),ys=[yMin,yMax];for(const y of [(radialMin+pad-intercept)/slope,(radialMax-pad-intercept)/slope])if(y>yMin&&y<yMax)ys.push(y);ys.sort((a,b)=>a-b);
   return {profile:ys.map(y=>({y,inner:Math.max(radialMin,intercept+slope*y-pad),outer:Math.min(radialMax,intercept+slope*y+pad)})),kind:'annular-frustum',points,basis:'Every rendered strut triangle lies in a verified capsule. Revolving its radial centreline gives r(y) ± capsuleRadius·sqrt(1+slope²); intersecting with exact projected-triangle radial limits preserves the finite end caps and central void.',capsule:{a,b,radiusM:capsuleR,slope,intercept},primitiveVerified};
  }
 }
 // General finite meshes use the exact distance of each projected triangle
 // from the yaw axis, so a triangle cutting across the axis cannot leave a
 // fictitious central hole merely because its vertices miss the axis.
 return {profile:[{y:yMin,inner:radialMin,outer:radialMax},{y:yMax,inner:radialMin,outer:radialMax}],kind:'annular-cylinder',points,basis:'Exact projected-triangle minimum radius, convex vertex maximum radius and actual vertex height bounds. A full yaw changes azimuth only.'};
}

function radiusAt(profile,y){let i=1;while(i<profile.length-1&&profile[i].y<y)i++;const a=profile[i-1],b=profile[i],t=Math.max(0,Math.min(1,(y-a.y)/(b.y-a.y)));return {inner:a.inner+(b.inner-a.inner)*t,outer:a.outer+(b.outer-a.outer)*t};}

/** Return actual-mesh all-angle CMG and terminal keepouts for one craft pose. */
export function createOperationalRoutingEnvelopes(factory,{paddingM=2e-5,sectors=64,frame=null}={}){
 if(!factory?.root||!finite(paddingM)||paddingM<0||!Number.isInteger(sectors)||sectors<12)throw new Error('Invalid operational envelope inputs');
 factory.root.updateWorldMatrix(true,true);const obstacles=[],proofs=[],issues=[],covered=new Set(),motionModel=rigidMotion(factory),push=record=>{obstacles.push(record.obstacle);proofs.push(record.proof);for(const id of record.obstacle.sourceMeshIds)covered.add(id);};
 for(const c of factory.cmgs||[]){
  const id='operational:cmg:'+c.index,meshes=physicalMeshes(c.gimbal),zero=c.gimbal.position.length()<1e-9&&c.spin.position.length()<1e-9;
  if(!zero){issues.push({code:'unsupported-cmg-pivot-offset',id,gimbal:c.gimbal.position.toArray(),spin:c.spin.position.toArray()});continue;}
  const localRadius=Math.max(0,...meshes.flatMap(m=>vertices(m,objectMatrixInFrame(m,c.gimbal))).map(p=>Math.hypot(...p))),scaleBound=spectralUpper(routingMatrix(c.gimbal.parent,frame))*maxScale(c.gimbal),center=new T.Vector3().applyMatrix4(routingMatrix(c.gimbal,frame)).toArray(),radiusM=localRadius*scaleBound+paddingM;
  if(!meshes.length||!finite(radiusM)||radiusM<=0){issues.push({code:'missing-cmg-envelope-geometry',id});continue;}
  push(sphereRecord({id,center,radiusM,sourceMeshes:meshes,motionModel,basis:'Both gimbal and spin pivots coincide. Rotations preserve radius; the maximum actual vertex radius bounds every triangle and every angle. Parent scale uses a conservative matrix norm.',detail:{gimbalId:c.gimbal.uuid,spinId:c.spin.uuid,localRadiusM:localRadius,scaleBound,angleRange:'All gimbal and rotor angles'}}));
 }
 const terminals=factory.terminalGimbals||[factory.dish,factory.optic,...(factory.opticalTerminals||[])].filter((h,i,a)=>h&&a.indexOf(h)===i).map(head=>({head,turntable:head.parent,mount:head.parent.parent}));
 for(const [i,g]of terminals.entries()){
  const {head,turntable}=g,id='operational:terminal:'+(g.spec?.id||i);if(!head||!turntable){issues.push({code:'missing-terminal-gimbal',id});continue;}
  if(new T.Vector3(0,1,0).applyQuaternion(turntable.quaternion).distanceTo(new T.Vector3(0,1,0))>1e-8){issues.push({code:'unsupported-terminal-yaw-axis',id});continue;}
  const neutral=routingMatrix(turntable.parent,frame).clone().multiply(new T.Matrix4().makeTranslation(...turntable.position.toArray())),headMeshes=physicalMeshes(head),localRadius=Math.max(0,...headMeshes.flatMap(m=>vertices(m,objectMatrixInFrame(m,head))).map(p=>Math.hypot(...p))),yawScale=maxScale(turntable),scaleBound=spectralUpper(neutral),headScale=maxScale(head),orbit=Math.hypot(head.position.x*turntable.scale.x,head.position.z*turntable.scale.z),center=new T.Vector3(0,head.position.y*turntable.scale.y,0).applyMatrix4(neutral).toArray(),radiusM=(localRadius*headScale*yawScale+orbit)*scaleBound+paddingM;
  if(headMeshes.length)push(sphereRecord({id:id+':head',center,radiusM,sourceMeshes:headMeshes,motionModel,basis:'The pitch pivot lies on the yaw axis (any offset is added to the radius). The maximum actual head vertex radius contains all pitch and azimuth rotations, including parent scaling.',detail:{headId:head.uuid,turntableId:turntable.uuid,localRadiusM:localRadius,scaleBound,orbitRadiusM:orbit,angleRange:'Full azimuth and all head pitch angles'}}));else issues.push({code:'missing-terminal-head-geometry',id});
  for(const mesh of physicalMeshes(turntable).filter(m=>!descendant(m,head))){
   const canonical=new T.Matrix4().makeScale(...turntable.scale.toArray()).multiply(objectMatrixInFrame(mesh,turntable)),spec=radialProfile(mesh,canonical,paddingM),obstacle=annularMesh(spec.profile,neutral,id+':support:'+mesh.uuid,mesh.uuid,motionModel,sectors);
   push({obstacle,proof:{id:obstacle.id,kind:spec.kind,meshIds:[mesh.uuid],profile:spec.profile,worldMatrix:[...neutral.elements],inverseWorldMatrix:[...neutral.clone().invert().elements],basis:spec.basis,capsule:spec.capsule,primitiveVerified:spec.primitiveVerified,sectors,outerPolygonScale:1/Math.cos(Math.PI/sectors),angleRange:'Full azimuth'}});
  }
 }
 const result={ok:issues.length===0,obstacles,proofs,issues,coveredMeshIds:[...covered],counts:{cmgs:(factory.cmgs||[]).length,terminals:terminals.length,envelopes:obstacles.length,coveredMeshes:covered.size},scope:'Conservative continuous operational keepouts for the supplied CMG/terminal geometry. Deployment and static cable accommodation remain separate checks.'};
 const containment=verifyOperationalEnvelopeContainment(factory,result,{toleranceM:paddingM+2e-7,frame});result.containment=containment;if(!containment.ok){result.ok=false;result.issues.push(...containment.issues);}return result;
}

/** Check current actual buffers against a previously constructed envelope. */
export function verifyOperationalEnvelopeContainment(factory,envelopes,{toleranceM=2e-5,frame=null}={}){
 factory.root.updateWorldMatrix(true,true);const meshById=new Map();factory.root.traverse(o=>{if(o.isMesh)meshById.set(o.uuid,o);});const issues=[];let verticesChecked=0,minimumMarginM=Infinity;
 for(const proof of envelopes.proofs){const inverse=proof.inverseWorldMatrix?new T.Matrix4().fromArray(proof.inverseWorldMatrix):null;
  for(const id of proof.meshIds){const mesh=meshById.get(id);if(!mesh){issues.push({code:'missing-envelope-source-mesh',envelopeId:proof.id,meshId:id});continue;}const matrix=routingMatrix(mesh,frame),points=vertices(mesh,inverse?inverse.clone().multiply(matrix):matrix);
   for(const p of points){verticesChecked++;let margin;if(proof.kind==='sphere')margin=proof.radiusM-distance(p,proof.center);else{const r=Math.hypot(p[0],p[2]),at=radiusAt(proof.profile,p[1]);margin=Math.min(p[1]-proof.profile[0].y,proof.profile.at(-1).y-p[1],r-at.inner,at.outer-r);}minimumMarginM=Math.min(minimumMarginM,margin);if(margin<-toleranceM){issues.push({code:'operational-envelope-not-containing-source',envelopeId:proof.id,meshId:id,marginM:margin});break;}}
  }
 }
 return {ok:issues.length===0,issues,verticesChecked,minimumMarginM};
}
