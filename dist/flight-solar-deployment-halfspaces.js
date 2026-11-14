import * as T from './vendor/three.module.js';
import {deploymentLayout,mechanismPose} from './deployment.js';
import {routingMotionFor} from './flight-fluid-routing.js';

const below=(object,parent)=>{for(let p=object;p;p=p.parent)if(p===parent)return true;return false;};
const nonPhysical=object=>{for(let p=object;p;p=p.parent)if(p.userData?.engineeringGraphic||p.userData?.sceneFlow||p.userData?.electricalOverview||p.userData?.groundEquipment||p.userData?.routingNonPhysical)return true;return object.material?.userData?.physicalMaterial===false;};
const V=p=>new T.Vector3(...p);
function belowMatrix(object,ancestor){const path=[];for(let p=object;p&&p!==ancestor;p=p.parent)path.push(p);const matrix=new T.Matrix4();for(const p of path.reverse()){p.updateMatrix();matrix.multiply(p.matrix);}return matrix;}
function vertexRange(mesh,matrix,axis,origin){let lo=Infinity,hi=-Infinity;const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const q=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix).sub(origin).dot(axis);lo=Math.min(lo,q);hi=Math.max(hi,q);}return [lo,hi];}
function cylinderRadius(mesh){const p=mesh.geometry.attributes.position;let r=0;for(let i=0;i<p.count;i++)r=Math.max(r,Math.hypot(p.getX(i),p.getZ(i)));return r*Math.max(Math.abs(mesh.scale.x),Math.abs(mesh.scale.z));}

// Body-root solar blankets pay out only outward along body X. Tracking rotates
// around that same axis, so it cannot change an article's X projection. The
// rewind radius is largest while stowed. These analytic facts, plus actual
// constructor-owned geometry, give a complete-deployment projection witness
// without assigning a20m payout displacement to a stationary inboard edge.
export function createSolarDeploymentHalfspaces(factory,h,{paddingM=3e-6}={}){
 const root=factory.root,g=deploymentLayout(h),pose=mechanismPose(g,1,0,{wingPitchDeg:0}),proofs=[],issues=[],byMeshId=new Map(),bodyWingKeys=[];root.updateWorldMatrix(true,true);
 const rootScale=root.getWorldScale(new T.Vector3());if(rootScale.toArray().some(s=>Math.abs(s-1)>1e-8))return {ok:false,issues:[{code:'nonrigid-body-frame-for-solar-halfspace'}],proofs,byMeshId};
 for(const [index,wing]of factory.wings.entries()){
  const definition=g.custom?g.wings.find(w=>w.side===wing.side&&w.end===wing.end):null;if(definition?.bankEnd!=null)continue;
  const m=pose.wings.find(w=>w.side===wing.side&&w.end===wing.end),origin=root.localToWorld(V(m.root)),axis=new T.Vector3(wing.side,0,0).transformDirection(root.matrixWorld),members=[];bodyWingKeys.push(wing.descriptor?.wingId||'solar:'+wing.side+'/'+wing.end);
  root.traverse(mesh=>{if(!mesh.isMesh||!mesh.geometry?.attributes?.position||mesh.userData.dynamicConnection||nonPhysical(mesh))return;const model=routingMotionFor(mesh);if(model.kind==='solar'&&(model.wingId&&wing.descriptor?.wingId?model.wingId===wing.descriptor.wingId:model.side===wing.side&&model.end===wing.end))members.push(mesh);});
  for(const mesh of members){let range,basis,constructorRole;const surface=wing.surface,legacy=!!wing.reel;
   if(below(mesh,surface)){
    const relative=belowMatrix(mesh,surface),localAxis=new T.Vector3(wing.side,0,0),coefficients=vertexRange(mesh,relative,localAxis,new T.Vector3()).map(x=>x+.5);
    range=[Math.min(0,g.wl*coefficients[0]),Math.max(0,g.wl*coefficients[1])];constructorRole='paid-out blanket';basis='Actual normalized surface vertices; each outward coordinate is span*(1/2+side*localX), with span in[0,wingLength]. Thickness and tracking are perpendicular to body X.';
   }else if(!legacy&&(mesh===wing.roll||wing.discs?.includes(mesh))){
    const p=mesh.geometry.attributes.position;let radial=0;for(let i=0;i<p.count;i++)radial=Math.max(radial,Math.hypot(p.getX(i),p.getZ(i)));const radius=radial*(g.packedRollM+(wing.discs.includes(mesh)?.012:0));range=[-radius,g.wl+radius];constructorRole='carried circular reel';basis='Reel centre translates from root to fully paid-out tip; its depth axis remains perpendicular to body X. The complete circular cross-section at the maximum analytic wound radius bounds every polygon orientation.';
   }else if(wing.booms?.includes(mesh)||wing.axles?.includes(mesh)){
    const radius=cylinderRadius(mesh);range=[-radius,g.wl+radius];constructorRole='endpoint-aimed circular spar';basis='Both spar endpoints have outward coordinate in[0,wingLength]. Its complete circular cross-section disk bounds arbitrary aiming roll, including the collapsed finite-radius cap.';
   }else if(legacy&&below(mesh,wing.reel)){
    let local=mesh.matrix.clone();const scale=mesh.scale.clone(),position=mesh.position.clone();if(mesh===wing.roll)scale.set(g.packedRollM,scale.y,g.packedRollM);else if(wing.discs.includes(mesh))scale.set(g.packedRollM+.009,scale.y,g.packedRollM+.009);else if(mesh===wing.stripe)position.y=g.packedRollM;
    local.compose(position,mesh.quaternion,scale);const parent=wing.reel.matrixWorld.clone().invert().multiply(mesh.parent.matrixWorld),matrix=parent.multiply(local),p=mesh.geometry.attributes.position;let radial=0;for(let i=0;i<p.count;i++){const q=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix);radial=Math.max(radial,Math.hypot(q.x,q.y));}range=[-radial,g.wl+radial];constructorRole='rotating carried reel article';basis='Actual vertices with maximum wound-radius scaling. Arbitrary spool rotation preserves each vertex radius in its X/Y section; tip translation is always outward.';
   }else if(wing.saddles?.some(s=>below(mesh,s))){
    const saddle=wing.saddles.find(s=>below(mesh,s)),relative=saddle.matrixWorld.clone().invert().multiply(mesh.matrixWorld),ranges=[];for(const sx of [.04,1]){const scale=saddle.scale.clone();scale.x=sx;const matrix=saddle.parent.matrixWorld.clone().multiply(new T.Matrix4().compose(saddle.position,saddle.quaternion,scale)).multiply(relative);ranges.push(vertexRange(mesh,matrix,axis,origin));}range=[Math.min(...ranges.map(x=>x[0])),Math.max(...ranges.map(x=>x[1]))];constructorRole='release saddle';basis='Actual saddle vertices. Their only deployment change is affine local-X scale from1 to.04; endpoint extrema enclose the complete monotone release interval.';
   }else if(below(mesh,wing.tip)){
    const tipOrigin=wing.tip.getWorldPosition(new T.Vector3()),localRange=vertexRange(mesh,mesh.matrixWorld,axis,tipOrigin);range=[localRange[0],g.wl+localRange[1]];constructorRole='tip rigid article';basis='Actual axial extrema relative to the tip. Tracking about body X preserves them; tip translation has range[0,wingLength].';
   }else if(below(mesh,wing.base||wing.table)){
    range=vertexRange(mesh,mesh.matrixWorld,axis,origin);constructorRole='root rigid article';basis='Actual axial extrema of the root-mounted article. Its sole solar motion is rotation about body X, which preserves the complete projection.';
   }else{issues.push({code:'unclassified-solar-deployment-article',wing:index,meshId:mesh.uuid,name:mesh.name});continue;}
   if(!range.every(Number.isFinite)||range[0]>range[1]){issues.push({code:'invalid-solar-deployment-halfspace',meshId:mesh.uuid});continue;}
   range=[range[0]-paddingM,range[1]+paddingM];const originProjection=origin.dot(axis),proof={meshId:mesh.uuid,sourceGeometryId:mesh.geometry.uuid,sourceVertexCount:mesh.geometry.attributes.position.count,wing:index,wingId:wing.descriptor?.wingId||'solar:'+wing.side+'/'+wing.end,axis:axis.toArray(),origin:origin.toArray(),outwardRangeM:range,rangeM:range.map(x=>x+originProjection),completeDeploymentDomain:[0,1],completeTrackingDomainDeg:[-180,180],constructorRole,basis};proofs.push(proof);byMeshId.set(mesh.uuid,proof);
  }
 }
 return {ok:issues.length===0,issues,proofs,byMeshId,bodyWingKeys,basis:'Per-article complete-deployment projection bounds from the actual registered body-root wing constructors. Carried inline wings require their articulated-bank proof and are deliberately not assigned body-root halfspaces.'};
}

export function verifySolarDeploymentHalfspaces(factory,halfspaces,{toleranceM=3e-7}={}){
 const issues=[];let verticesChecked=0,minimumMarginM=Infinity;factory.root.updateWorldMatrix(true,true);
 const declared=new Set(halfspaces.proofs.map(p=>p.meshId)),keys=new Set(halfspaces.bodyWingKeys||[]);factory.root.traverse(mesh=>{if(!mesh.isMesh||!mesh.geometry?.attributes?.position||mesh.userData.dynamicConnection||nonPhysical(mesh))return;const model=routingMotionFor(mesh),key=model.wingId||'solar:'+model.side+'/'+model.end;if(model.kind==='solar'&&keys.has(key)&&!declared.has(mesh.uuid))issues.push({code:'missing-solar-halfspace-proof',meshId:mesh.uuid});});
 for(const proof of halfspaces.proofs){if(!Array.isArray(proof.axis)||proof.axis.length!==3||!proof.axis.every(Number.isFinite)||Math.abs(Math.hypot(...proof.axis)-1)>1e-8||!Array.isArray(proof.rangeM)||proof.rangeM.length!==2||!proof.rangeM.every(Number.isFinite)||proof.rangeM[0]>proof.rangeM[1]){issues.push({code:'invalid-solar-halfspace-proof',meshId:proof.meshId});continue;}const mesh=factory.root.getObjectByProperty('uuid',proof.meshId);if(!mesh){issues.push({code:'missing-solar-halfspace-source',meshId:proof.meshId});continue;}const axis=V(proof.axis),p=mesh.geometry.attributes.position;if(mesh.geometry.uuid!==proof.sourceGeometryId||p.count!==proof.sourceVertexCount){issues.push({code:'changed-solar-halfspace-source',meshId:proof.meshId});continue;}for(let i=0;i<p.count;i++){const x=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).dot(axis),margin=Math.min(x-proof.rangeM[0],proof.rangeM[1]-x);verticesChecked++;if(!Number.isFinite(margin)){issues.push({code:'invalid-solar-halfspace-source-vertex',meshId:proof.meshId,vertex:i});break;}minimumMarginM=Math.min(minimumMarginM,margin);if(margin<-toleranceM){issues.push({code:'solar-halfspace-not-containing-source',meshId:proof.meshId,marginM:margin,constructorRole:proof.constructorRole});break;}}}
 return {ok:issues.length===0,issues,verticesChecked,minimumMarginM};
}
