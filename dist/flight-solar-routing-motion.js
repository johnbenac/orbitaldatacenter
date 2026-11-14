import * as T from './vendor/three.module.js';
import {deploymentLayout,mechanismPose} from './deployment.js';
import {routingMotionFor} from './flight-fluid-routing.js';
import {flightRoutingSnapshot,auditFlightRoutingSnapshot} from './flight-routing-registry.js';

const V=p=>new T.Vector3(...p);
const inherited=(o,key)=>{for(let p=o;p;p=p.parent)if(p.userData?.[key])return true;return false;};
function solarMeshes(root){const out=[];root.traverse(o=>{if(o.isMesh&&o.geometry?.attributes?.position&&!o.userData.dynamicConnection&&!o.userData.routingNonPhysical&&!inherited(o,'electricalOverview')&&!inherited(o,'engineeringGraphic')&&!inherited(o,'groundEquipment')&&o.material?.userData?.physicalMaterial!==false&&routingMotionFor(o).kind==='solar'&&routingMotionFor(o).tracks!==false)out.push(o);});return out;}
// A point rotating around a fixed span axis retains its axial coordinate and
// its distance from that axis. The maximum actual vertex radius and the axial
// extrema therefore enclose every triangle at every tracking angle. These
// are closed solid cylinders; no endpoint-only or sampled-angle claim is used.
export function createSolarTrackingEnvelopes(factory,h,{attitude={},paddingM=2e-5}={}){
 const root=factory.root,g=deploymentLayout(h),pose=mechanismPose(g,1,0,{...attitude,wingPitchDeg:0}),meshes=solarMeshes(root),obstacles=[],proofs=[],issues=[],coveredMeshIds=[];
 root.updateWorldMatrix(true,true);
 for(const [index,wing] of factory.wings.entries()){
  const m=pose.wings.find(x=>x.side===wing.side&&x.end===wing.end),worldOrigin=root.localToWorld(V(m.root)),worldAxis=V(m.axes?.[0]||[1,0,0]).transformDirection(root.matrixWorld),desc=wing.descriptor;
  const members=meshes.filter(mesh=>{const motion=routingMotionFor(mesh);return motion.kind==='solar'&&(motion.wingId&&desc?.wingId?motion.wingId===desc.wingId:motion.side===wing.side&&motion.end===wing.end);});
  if(!members.length){issues.push({code:'missing-solar-tracking-geometry',wing:index});continue;}
  // Preserve each article's axial extent. Combining a wide blanket with an
  // inboard saddle would falsely fill the empty space around that saddle.
  for(const mesh of members){let lo=Infinity,hi=-Infinity,radius=0,verticesChecked=0;const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld).sub(worldOrigin),s=p.dot(worldAxis);lo=Math.min(lo,s);hi=Math.max(hi,s);radius=Math.max(radius,p.addScaledVector(worldAxis,-s).length());verticesChecked++;}
  // Endpoint-driven circular spars may choose a fresh cross-section roll
  // when aimed. Bound their complete disk, rather than treating one polygon
  // orientation as a rigidly rotating article.
  let circularSectionRadiusM=0;
  if(mesh.geometry.type==='CylinderGeometry'){
   let y0=Infinity,y1=-Infinity,radial=0;for(let i=0;i<a.count;i++){y0=Math.min(y0,a.getY(i));y1=Math.max(y1,a.getY(i));radial=Math.max(radial,Math.hypot(a.getX(i),a.getZ(i)));}
   const e=mesh.matrixWorld.elements,x=new T.Vector3(e[0],e[1],e[2]),z=new T.Vector3(e[8],e[9],e[10]),xx=x.lengthSq(),zz=z.lengthSq(),xz=x.dot(z);circularSectionRadiusM=radial*Math.sqrt((xx+zz+Math.hypot(xx-zz,2*xz))/2);
   for(const y of [y0,y1]){const p=V([0,y,0]).applyMatrix4(mesh.matrixWorld).sub(worldOrigin),s=p.dot(worldAxis);lo=Math.min(lo,s-circularSectionRadiusM);hi=Math.max(hi,s+circularSectionRadiusM);radius=Math.max(radius,p.addScaledVector(worldAxis,-s).length()+circularSectionRadiusM);}
  }
  if(!Number.isFinite(lo)||!Number.isFinite(hi)){issues.push({code:'missing-solar-tracking-geometry',wing:index,meshId:mesh.uuid});continue;}
  lo-=paddingM;hi+=paddingM;radius+=paddingM;
  const center=worldOrigin.clone().addScaledVector(worldAxis,(lo+hi)/2).toArray(),axis=worldAxis.toArray(),halfLengthM=(hi-lo)/2,bounds={min:center.map((x,i)=>x-Math.abs(axis[i])*halfLengthM-radius*Math.sqrt(Math.max(0,1-axis[i]**2))),max:center.map((x,i)=>x+Math.abs(axis[i])*halfLengthM+radius*Math.sqrt(Math.max(0,1-axis[i]**2)))},id='operational:solar-tracking:'+index+':'+mesh.uuid;
  obstacles.push({id,type:'cylinder',center,axis,halfLengthM,radiusM:radius,bounds,operationalSolarEnvelope:true,motionModel:{kind:'rigid',frameId:'body',attachment:'body'},sourceMeshIds:[mesh.uuid]});
  proofs.push({id,wing:index,origin:worldOrigin.toArray(),axis,axialRangeM:[lo,hi],radiusM:radius,circularSectionRadiusM,verticesChecked,meshIds:[mesh.uuid],angleRangeDeg:[-180,180],basis:'All-angle revolution about the analytic solar span axis, including end caps. Rigid articles use actual convex triangle vertices. Endpoint-aimed circular spars use the complete circular cross-section disk and both centerline ends, so arbitrary cross-section roll is also enclosed.'});coveredMeshIds.push(mesh.uuid);
  }
 }
 return {ok:issues.length===0,issues,obstacles,proofs,coveredMeshIds};
}

export function verifySolarTrackingContainment(factory,envelopes,{toleranceM=2e-7}={}){
 factory.root.updateWorldMatrix(true,true);const byId=new Map();factory.root.traverse(o=>{if(o.isMesh)byId.set(o.uuid,o);});let verticesChecked=0,minimumMarginM=Infinity;const issues=[];
 for(const proof of envelopes.proofs)for(const id of proof.meshIds){const mesh=byId.get(id);if(!mesh){issues.push({code:'missing-solar-envelope-mesh',meshId:id});continue;}const a=mesh.geometry.attributes.position,axis=V(proof.axis),origin=V(proof.origin);for(let i=0;i<a.count;i++){const p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld).sub(origin),s=p.dot(axis),radial=p.addScaledVector(axis,-s).length(),margin=Math.min(s-proof.axialRangeM[0],proof.axialRangeM[1]-s,proof.radiusM-radial);verticesChecked++;minimumMarginM=Math.min(minimumMarginM,margin);if(margin<-toleranceM){issues.push({code:'solar-envelope-not-containing-source',meshId:id,marginM:margin});break;}}}
 return {ok:issues.length===0,issues,verticesChecked,minimumMarginM};
}

export function certifySolarTracking(factory,h){
 factory.positionPanels(1,{wingPitchDeg:0});const envelopes=createSolarTrackingEnvelopes(factory,h),snapshot=flightRoutingSnapshot(factory);snapshot.obstacles=[...snapshot.obstacles.filter(o=>!envelopes.coveredMeshIds.includes(o.sourceMesh||o.id)),...envelopes.obstacles];
 const audit=auditFlightRoutingSnapshot(snapshot,{maxIssues:100}),containment=[];
 // Independent buffer regressions guard axis/tag/transform implementation.
 // Continuous coverage comes from the cylinder proof, not this angle list.
 for(const angle of [-180,-113,-57,0,37,109,180]){factory.positionPanels(1,{wingPitchDeg:angle});containment.push({angle,...verifySolarTrackingContainment(factory,envelopes)});}
 factory.positionPanels(1);return {ok:envelopes.ok&&audit.ok&&containment.every(x=>x.ok),issues:[...envelopes.issues,...audit.issues,...containment.flatMap(x=>x.issues)],proofs:envelopes.proofs,minimumClearanceM:audit.minimumClearanceM,containment,completeDomainDeg:[-180,180]};
}
