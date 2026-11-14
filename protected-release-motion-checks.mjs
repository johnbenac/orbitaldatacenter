import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {canvas} from './render-test-canvas.mjs';
import {sizeDesign,missionStarter} from './dist/design.js';
import {makeCraft} from './dist/craft.js';
import {createFlightDeploymentMotion} from './dist/flight-deployment-motion.js';

globalThis.document={createElement:()=>canvas()};
const h=sizeDesign(missionStarter('text')),factory=makeCraft(h,{installElectrical:false,planFluidRoutes:false}),releases=[];
factory.root.traverse(o=>{if(o.userData.routingMotion?.kind==='release-restraint')releases.push({frame:o,model:o.userData.routingMotion});});
assert.equal(releases.length,12,'Every solar and radiator launch plunger has its own declared release law');
const motion=createFlightDeploymentMotion(factory,h),distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));let verticesChecked=0,intervals=0,minimumMarginM=Infinity;
function vertices(frame,t){factory.positionPanels(t);factory.root.updateWorldMatrix(true,true);const result=[];frame.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)result.push(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).toArray());});return result;}
for(const {frame,model} of releases){
 assert.equal(model.attachment,'body');assert(model.strokeM>0);
 for(const [lo,hi] of [[0,1],[0,.31],[.31,.82],[.82,1]]){
  const a=model.startProgress+(model.endProgress-model.startProgress)*lo,b=model.startProgress+(model.endProgress-model.startProgress)*hi,m=(a+b)/2,A=vertices(frame,a),M=vertices(frame,m),B=vertices(frame,b),bound=motion.bound(model,a,b);
  assert(bound.verified);assert.equal(A.length,M.length);assert.equal(B.length,M.length);
  const observed=Math.max(...M.flatMap((p,i)=>[distance(p,A[i]),distance(p,B[i])]));assert(observed<=bound.pointM+1e-9,'Actual shrinking plunger vertices must be covered throughout the declared linear stroke');minimumMarginM=Math.min(minimumMarginM,bound.pointM-observed);verticesChecked+=A.length*3;intervals++;
  if(lo===0&&hi===1)assert(observed>motion.bound({...model,strokeM:model.strokeM/2},a,b).pointM+1e-6,'A falsely small release allocation is detected by actual-buffer displacement');
 }
 assert.equal(motion.bound({...model,strokeM:undefined},model.startProgress,model.endProgress).verified,false);
 assert(motion.intervals.some(i=>i.start===model.startProgress)&&motion.intervals.some(i=>i.end===model.endProgress),'The global sweep splits exactly at each release boundary');
}
console.log(JSON.stringify({ok:true,releasePlungers:releases.length,intervals,verticesChecked,minimumMarginM,negativeRegressions:['Half-sized stroke understates actual movement','Missing release allocation fails closed']}));
