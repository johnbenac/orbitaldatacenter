// Swept envelope regression uses production mounting coordinates, rigid leaf
// thickness and the rendered spacecraft hardware's conservative bounding boxes.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {radiusAt} from './dist/fairings.js';
import * as T from './dist/vendor/three.module.js';
import {aiPurposes} from './dist/ai-purpose.js';
import {defaults,sizeDesign,applyAIPurpose} from './dist/design.js';
import {presetList} from './dist/mission-presets.js';
import {deploymentLayout,leafPose,leafAxes,deploymentSchedule} from './dist/deployment.js';
import {makeCraft} from './dist/craft.js';
const painter=new Proxy({},{get:(_,k)=>k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});globalThis.document={createElement:()=>({getContext:()=>painter})};
const axes=[[1,0,0],[0,1,0],[0,0,1]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function box(c,a,s,id){return {c,a,s,id,halves:[0,1,2].map(k=>s.reduce((v,n,i)=>v+n*Math.abs(a[i][k]),0))};}
function separation(p,q,cap=.15){const dx=q.c.map((n,k)=>n-p.c[k]),worldGap=Math.max(...dx.map((n,k)=>Math.abs(n)-p.halves[k]-q.halves[k]));if(worldGap>=cap)return worldGap;let best=-Infinity;
 for(const v of [...p.a,...q.a,...p.a.flatMap(a=>q.a.map(b=>cross(a,b)))]){const n=Math.hypot(...v);if(n<1e-8)continue;let gap=Math.abs(dot(dx,v));for(let j=0;j<3;j++)gap-=p.s[j]*Math.abs(dot(p.a[j],v))+q.s[j]*Math.abs(dot(q.a[j],v));best=Math.max(best,gap/n);if(best>=cap)return best;}return best;}
function fixedHardware(craft){
 const src=[],v=new T.Vector3(),size=new T.Vector3();craft.internal.visible=false;craft.plumes.forEach(o=>o.visible=false);craft.appendages.visible=false;craft.root.updateMatrixWorld(true);
 craft.root.traverseVisible(o=>{if(!o.isMesh)return;let id=o;while(id&&!id.userData.part)id=id.parent;id=id?.userData.part||'structure';o.geometry.computeBoundingBox();src.push({o,id});});
 return ()=>{craft.root.updateMatrixWorld(true);return src.map(({o,id})=>{const bb=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);bb.getCenter(v);bb.getSize(size);return box(v.toArray(),axes,size.multiplyScalar(.5).toArray(),id);});};
}
export function auditDeployment(h,steps=600){
 const g=deploymentLayout(h),craft=makeCraft(h),sampleHardware=fixedHardware(craft),mins={panel:Infinity,cross:Infinity,hardware:Infinity,foreignGuide:Infinity},details={};
 function record(name,gap,what){if(gap<mins[name]){mins[name]=gap;details[name]=what;}}
 for(let k=0;k<=steps;k++){const u=k/steps;craft.positionPanels(u);const fixed=sampleHardware(),leaves=g.descriptors.map((d,i)=>{const p=leafPose(g,d,u,h.input.solarTiltDeg);const a=leafAxes(p),o=d.normalOffset;return box([p.x+o*a[1][0],p.y+o*a[1][1],p.z+o*a[1][2]],a,[d.width/2,d.thickness/2,d.depth/2],i);});
  const guides=[];for(const c of craft.carriages)for(const o of c.rails){if(!o.visible)continue;const v=new T.Vector3();const dirs=[0,1,2].map(k=>v.setFromMatrixColumn(o.matrixWorld,k).normalize().toArray());
   guides.push({...box(o.getWorldPosition(v).toArray(),dirs,[o.scale.x,o.scale.y/2,o.scale.z],'carriage'),owner:Math.floor(c.i/3)});}
  for(let i=0;i<18;i++){const cur=leaves[i];for(const item of guides){if(i===item.owner*3+(item.owner>=4?2:0))continue;record('foreignGuide',separation(cur,item),[i,item.owner,u]);}for(let j=0;j<i;j++){const gap=separation(cur,leaves[j]);record('panel',gap,[i,j,u]);if(i>=12&&j<12)record('cross',gap,[i,j,u]);}
   for(const solid of fixed){const gap=separation(cur,solid);record('hardware',gap,[i,solid.id,u,solid.c]);}
  }
 }return {mins,details};
}
function verifyRenderedLeaves(h){
 const craft=makeCraft(h),g=deploymentLayout(h),v=new T.Vector3();
 for(const u of [0,.06,.17,.25,.34,.43,.50,.565,.62,.735,.828,.96,1]){craft.positionPanels(u);craft.root.updateMatrixWorld(true);
  for(const q of craft.panels){const d=q.descriptor,p=leafPose(g,d,u,h.input.solarTiltDeg),basis=leafAxes(p);
   q.surface.traverse(o=>{if(!o.geometry)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){
    v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);const delta=[v.x-p.x,v.y-p.y,v.z-p.z];
    for(const [k,r] of [d.width/2,d.thickness/2,d.depth/2].entries())assert(Math.abs(dot(delta,basis[k])-(k===1?d.normalOffset:0))<=r+.00001,'Rendered leaf extends beyond its audited box.');
   }});
  }
 }
 craft.positionPanels(0);craft.plumes.forEach(o=>o.visible=false);craft.internal.visible=false;craft.root.updateMatrixWorld(true);
 const offset=h.fairing.stack.find(s=>s.part==='Insulated bus').z0M+h.bodyLengthM/2;let margin=Infinity;
 craft.root.traverseVisible(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){
  v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);const z=v.z+offset;
  const clearance=Math.min(radiusAt(h.fairing.profile,z)-h.fairing.radialPaddingM-Math.hypot(v.x,v.y),h.fairing.heightM-h.fairing.axialPaddingM-z,z);
  margin=Math.min(margin,clearance);
 }});assert.equal(margin>=0,h.fairing.fit,'Rendered stack and planning fit disagree');return margin;
}
if(process.argv[1]?.endsWith('deployment-checks.mjs')){
 const steps=Number(process.argv.slice(2).find(k=>/^\d+$/.test(k))||2400),rows=[],ai=process.argv.includes('--ai');
 assert(steps>0);
 const designs=ai?Object.keys(aiPurposes).map(id=>({id,h:sizeDesign(applyAIPurpose(defaults,id,true))})):presetList;
 for(const {id,h}of designs){const {mins,details}=auditDeployment(h,steps),meshFitMarginM=verifyRenderedLeaves(h);assert(Math.min(...Object.values(mins))>0,'Collision in '+id);
  const round=x=>+x.toFixed(8);const row={id,...(ai?{launcher:h.input.launcher}:{}),minLeafGapM:round(mins.panel),minSolarRadiatorGapM:round(mins.cross),minHardwareGapM:round(mins.hardware),minCarriageGapM:round(mins.foreignGuide),fit:h.fairing.fit,radialClearanceM:round(h.fairing.radialClearanceM),axialClearanceM:round(h.fairing.axialClearanceM),meshFitMarginM:round(meshFitMarginM)};rows.push(row);console.log(JSON.stringify(row));
 }
 if(process.argv.includes('--write')){assert(steps>=2400);const data={posesPerPreset:steps+1,stepSeconds:300/steps,motionModel:'Sampled nominal rigid envelopes; full-size leaves, box-bounded installed hardware, and non-attached leaf to carriage clearances. Flexure, backlash and tolerances are excluded.',rows};const path=ai?'./dist/ai-deployment-audit.js':'./dist/deployment-audit.js',name=ai?'aiDeploymentAudit':'deploymentAudit';writeFileSync(new URL(path,import.meta.url),'// Reproduce with node deployment-checks.mjs '+steps+(ai?' --ai':'')+' --write\nexport const '+name+'='+JSON.stringify(data,null,2)+';\n');}
}
