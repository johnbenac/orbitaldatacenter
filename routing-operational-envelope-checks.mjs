import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import * as T from './dist/vendor/three.module.js';
import {canvas} from './render-test-canvas.mjs';
import {sizeDesign,defaults} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {makeCraft} from './dist/craft.js';
import {createOperationalRoutingEnvelopes,verifyOperationalEnvelopeContainment} from './dist/routing-operational-envelopes.js';
import {routeClearance} from './dist/routing-audit.js';
globalThis.document={createElement:()=>canvas()};
const report={ok:false,designs:[],negativeRegressions:[],scope:'Analytic all-angle CMG/head spheres and hollow yaw-support frusta from actual mesh buffers; arbitrary angle grids and deliberately corrupted geometry validate the implementation.'};
for(const [id,input]of [['protected-core',defaults],['redwire-8kw',buildReferenceDesign('redwire-8kw')],['starcloud-3',buildReferenceDesign('starcloud-3')]]){
 const c=makeCraft(sizeDesign(input),{installElectrical:false,planFluidRoutes:false}),envelopes=createOperationalRoutingEnvelopes(c);assert(envelopes.ok,JSON.stringify({id,issues:envelopes.issues}));assert(envelopes.counts.cmgs===4);assert(envelopes.counts.terminals>=2);let poses=0,verticesChecked=0;
 const check=()=>{const result=verifyOperationalEnvelopeContainment(c,envelopes);assert(result.ok,JSON.stringify({id,issues:result.issues}));poses++;verticesChecked+=result.verticesChecked;};
 for(const a of [0,.37,1.6,3.2,5.7])for(const b of [0,.23,1.2,3.7,5.3]){for(const m of c.cmgs){m.gimbal.rotation.z=a;m.spin.rotation.x=b;}check();}
 for(let y=0;y<=12;y++)for(let p=0;p<=8;p++){for(const g of c.terminalGimbals){g.turntable.rotation.y=y*Math.PI/6;g.head.rotation.x=p*Math.PI/8;}check();}
 const support=envelopes.proofs.find(p=>p.kind==='annular-frustum'&&p.profile.every(r=>r.inner>.001));assert(support,'No hollow strut envelope');const world=new T.Matrix4().fromArray(support.worldMatrix),first=support.profile[0],last=support.profile.at(-1),radius=Math.min(...support.profile.map(r=>r.inner))/4,axisRoute={id:'base-axis-clearance',points:[[0,first.y,0],[0,last.y,0]].map(p=>new T.Vector3(...p).applyMatrix4(world).toArray()),radiusM:radius};const obstacle=envelopes.obstacles.find(o=>o.id===support.id);assert(routeClearance(axisRoute,[obstacle]).ok,'Hollow support sweep incorrectly fills the base connector axis');
 const y=(first.y+last.y)/2,t=(y-first.y)/(last.y-first.y),inner=first.inner+(last.inner-first.inner)*t,outer=first.outer+(last.outer-first.outer)*t,r=(inner+outer)/2,point=new T.Vector3(r,y,0).applyMatrix4(world).toArray(),inside={id:'strut-interference',points:[point,point.map((n,k)=>n+(k===1?.0001:0))],radiusM:.001};assert(!routeClearance(inside,[obstacle]).ok,'Strut sweep collision missed');
 const cmg=envelopes.proofs.find(p=>p.kind==='sphere'),center=cmg.center,through={id:'cmg-interference',points:[center.map((n,i)=>n+(i===0?-cmg.radiusM*2:0)),center.map((n,i)=>n+(i===0?cmg.radiusM*2:0))],radiusM:.001};assert(!routeClearance(through,[envelopes.obstacles.find(o=>o.id===cmg.id)]).ok,'CMG continuous sweep collision missed');
 if(id==='protected-core'){
  const mesh=c.root.getObjectByProperty('uuid',cmg.meshIds[0]),position=mesh.geometry.attributes.position,old=position.getX(0);position.setX(0,old+20);assert(!verifyOperationalEnvelopeContainment(c,envelopes).ok,'Corrupted moving geometry escaped containment gate');position.setX(0,old);report.negativeRegressions.push('Expanded CMG buffer fails containment');
  const parent=mesh.parent;mesh.removeFromParent();assert(verifyOperationalEnvelopeContainment(c,envelopes).issues.some(i=>i.code==='missing-envelope-source-mesh'));parent.add(mesh);report.negativeRegressions.push('Removed moving hardware fails source inventory');
  c.root.scale.set(1.7,.8,1.2);const scaled=createOperationalRoutingEnvelopes(c);assert(scaled.ok);for(const a of [.1,1.2,2.7]){for(const m of c.cmgs){m.gimbal.rotation.z=a;m.spin.rotation.x=a*3;}for(const g of c.terminalGimbals){g.turntable.rotation.y=a;g.head.rotation.x=a/2;}assert(verifyOperationalEnvelopeContainment(c,scaled).ok,'Nonuniform parent scale escaped rotational keepout');}c.root.scale.set(1,1,1);
  const g=c.terminalGimbals[0],saved=g.turntable.quaternion.clone();g.turntable.rotation.x=.2;assert(createOperationalRoutingEnvelopes(c).issues.some(i=>i.code==='unsupported-terminal-yaw-axis'));g.turntable.quaternion.copy(saved);report.negativeRegressions.push('Unmodeled yaw-axis tilt fails the analytic contract');
 }
 report.designs.push({id,...envelopes.counts,angleGridPoses:poses,verticesChecked,analyticalProofs:envelopes.proofs.map(p=>({id:p.id,kind:p.kind,meshCount:p.meshIds.length,basis:p.basis}))});
}
report.negativeRegressions.push('Route inside strut swept material fails','Route through CMG rotational sphere fails','Central base-connector void stays open');report.ok=true;const at=process.argv.indexOf('--output');if(at>=0)await writeFile(process.argv[at+1],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,designs:report.designs.map(({analyticalProofs,...r})=>r)},null,2));
