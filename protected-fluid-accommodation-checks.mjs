import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as T from './dist/vendor/three.module.js';
import {defaults,sizeDesign} from './dist/design.js';
import {makeCraft} from './dist/craft.js';
import {protectedFluidAllocation as F} from './dist/protected-fluid-allocation.js';
import {protectedStowedFluidFeatures} from './dist/protected-fluid-accommodation.js';
import {deploymentLayout} from './dist/deployment.js';
import {attitudeLimits,bankTrimTravel} from './dist/attitude-guidance.js';
import {canvas} from './render-test-canvas.mjs';

globalThis.document={createElement:()=>canvas()};
function containment(h,craft){
 craft.positionPanels(0);craft.root.updateMatrixWorld(true);
 const base=h.fairing.stack.find(s=>s.part==='Insulated bus').z0M+h.bodyLengthM/2,point=new T.Vector3(),issues=[];let vertices=0;
 const meshes=new Set(craft.fluidConnections.map(c=>c.tube.mesh));for(const channel of craft.root.userData.fluidComponentChannels||[])for(const id of [channel.componentId,channel.rotorId]){const object=id&&craft.root.getObjectByProperty('uuid',id);object?.traverse(o=>{if(o.isMesh)meshes.add(o);});}
 for(const mesh of meshes){
  const p=mesh.geometry.attributes.position;
  for(let i=0;i<p.count;i++){
   point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);const z=base+point.z,r=Math.hypot(point.x,point.y);vertices++;
   if(!h.fairing.stack.some(s=>z>=s.z0M-3e-6&&z<=s.z1M+3e-6&&r<=s.radiusM+3e-6)){issues.push({code:'rendered-buffer-outside-launch-allocation',meshId:mesh.uuid,name:mesh.name,vertex:i,positionM:point.toArray()});break;}
  }
 }
 return {ok:issues.length===0,issues,vertices};
}
const rows=[];
for(const panels of [2,4,8]){
 const h=sizeDesign({...defaults,radiatorPanelsPerBank:panels}),layout=deploymentLayout(h),craft=makeCraft(h,{installElectrical:false,planFluidRoutes:false}),features=protectedStowedFluidFeatures(layout),audit=containment(h,craft),limits=attitudeLimits(h);
 assert(audit.ok,JSON.stringify(audit.issues));
 assert(Math.abs(layout.rootY-h.bodyHeightM/2-F.rootPlumbingReserveM-.24)<1e-10,'New fluid accommodation must preserve the original unreserved operating clearance');
 const oldClearance=Math.max(.02,.24-.135-.25*Math.min(.40,.052*Math.min(h.bodyWidthM,h.bodyHeightM)));
 assert(Math.abs(limits.bankClearanceY-oldClearance)<1e-10,'Plumbing stand-off must not silently change allowed trim commands');
 for(const angle of [30,45,65,limits.bankCantDeg]){
  const old=oldClearance/(limits.bankHalfWidthM*Math.cos(angle*Math.PI/180)),expected=old>=1?limits.radiatorTrimStopDeg:Math.asin(old)*180/Math.PI;
  assert(Math.abs(bankTrimTravel(angle,limits)-expected)<1e-9,'Trim-domain regression');
 }
 const tube=craft.fluidConnections.find(c=>c.restLengthM).tube.mesh,saved=tube.position.clone();tube.position.x+=10;
 const defect=containment(h,craft);assert(!defect.ok&&defect.issues.some(i=>i.meshId===tube.uuid),'Unmodeled hose movement must fail launch containment');tube.position.copy(saved);
 rows.push({panels,ok:true,fluidFeatures:features.length,sections:craft.fluidConnections.length,verticesChecked:audit.vertices,launchFit:h.fairing.fit,radialClearanceM:h.fairing.radialClearanceM});
}
const report={ok:true,rows,scope:'Actual restrained fluid tube and allocated interface buffers contained by the shared protected-core launch allocation; unchanged commanded trim domain. This is an accommodation check, not supplier qualification.',negativeRegression:'Moving an actual hose buffer outside the allocated launch envelope fails.'};
const index=process.argv.indexOf('--output');if(index>=0)writeFileSync(process.argv[index+1],JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
