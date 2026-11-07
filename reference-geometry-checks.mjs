// Bounded checks of the actual Three.js realization against the resource model.
// No chronological mission integration, qualification or full swept-clearance claim.
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {referenceCenterOrder} from './dist/reference-centers.js';
import {buildReferenceDesign,assessReferenceDesign} from './dist/reference-configurations.js';
import {sizeDesign,missionStarter,sizingEnvelope} from './dist/design.js';
import {buildEquipmentList} from './dist/equipment-list.js';
import {deploymentLayout,mechanismPose,leafPose,leafAxes} from './dist/deployment.js';
import {makeCraft} from './dist/craft.js';
import {radiusAt} from './dist/fairings.js';
import {surfaces} from './dist/physics.js';
import {geometry} from './dist/orbit.js';
const painter=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});
globalThis.document={createElement:()=>({getContext:()=>painter})};
const V=(...a)=>new T.Vector3(...a),world=o=>V().setFromMatrixPosition(o.matrixWorld);
const near=(a,b,label,tol=2e-6)=>assert(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),label+': '+a+' vs '+b);
function bounds(h,craft){
 craft.positionPanels(0);craft.root.updateMatrixWorld(true);craft.plumes.forEach(o=>o.visible=false);
 const bus=h.fairing.stack.find(row=>row.part==='Insulated bus'),z0=bus.z0M+h.bodyLengthM/2,p=V();let radial=Infinity,axial=Infinity,base=Infinity;
 craft.root.traverseVisible(mesh=>{
  if(!mesh.isMesh)return;const a=mesh.geometry.attributes.position;
  for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);const z=p.z+z0;radial=Math.min(radial,radiusAt(h.fairing.profile,z)-h.input.radialPaddingM-Math.hypot(p.x,p.y));axial=Math.min(axial,h.fairing.heightM-h.input.axialPaddingM-z);base=Math.min(base,z);}
 });
 assert(h.fairing.radialClearanceM<=radial+2e-6,'Analytical fairing screen exceeds actual rendered clearance');
 assert(h.fairing.axialClearanceM<=axial+2e-6,'Analytical height exceeds rendered clearance');
 assert(!h.fit||Math.min(radial,axial,base)>=-2e-6,'A resource-closed case has an out-of-envelope mesh');
 return Math.min(radial,axial,base);
}
function separation(a,b){
 const delta=b.center.clone().sub(a.center),directions=[...a.axes,...b.axes,...a.axes.flatMap(x=>b.axes.map(y=>x.clone().cross(y)))];let gap=-Infinity;
 for(const axis of directions){if(axis.lengthSq()<1e-16)continue;axis.normalize();const support=q=>q.half.reduce((sum,v,i)=>sum+v*Math.abs(q.axes[i].dot(axis)),0);gap=Math.max(gap,Math.abs(delta.dot(axis))-support(a)-support(b));}
 return gap;
}
function verifyPose(h,craft,g,progress,attitude){
 craft.positionPanels(progress,attitude);craft.root.updateMatrixWorld(true);
 const state=mechanismPose(g,progress,h.input.solarTiltDeg,attitude),boxes=[];
 for(const {surface,descriptor:d} of craft.panels){
  if(d.type!=='rad')continue;
  const p=leafPose(g,d,progress,h.input.solarTiltDeg,attitude),expected=V(p.x,p.y,p.z),actual=world(surface);
  near(actual.distanceTo(expected),0,'Rendered/analytical panel center',2e-5);
  const axes=leafAxes(p).map(a=>V(...a)),box={center:expected,axes,half:[d.width/2,d.thickness/2,d.depth/2],label:`${d.end}/${d.j}`};boxes.push(box);
  for(let k=0;k<3;k++)near(V().setFromMatrixColumn(surface.matrixWorld,k).normalize().dot(axes[k]),1,'Rendered/analytical panel axis');
 }
 let minimum=Infinity;
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)minimum=Math.min(minimum,separation(boxes[i],boxes[j]));
 assert(minimum>=-2e-6,`Radiator leaves overlap at ${progress}: ${minimum}`);
 for(const [i,bank] of craft.mechanismAudit.banks.entries()){
  near(world(bank.tip).distanceTo(V(...state.banks[i].tip)),0,'Last-panel tip');
  assert.equal(bank.foldJoints.length,g.panelCount-1);
  assert.equal(bank.hoses.length,2*g.panelCount);
  for(const joint of [{pin:bank.rootPin,socket:bank.rootSocket},...bank.foldJoints])near(world(joint.pin).distanceTo(world(joint.socket)),0,'Physical hinge connection');
  for(const hose of bank.hoses){let end=world(hose.fromPort),length=0;
   for(const segment of hose.seg){const a=V(0,-.5,0).applyMatrix4(segment.matrixWorld),b=V(0,.5,0).applyMatrix4(segment.matrixWorld);near(a.distanceTo(end),0,'Physical hose segment connection');length+=a.distanceTo(b);end=b;}
   near(end.distanceTo(world(hose.toPort)),0,'Physical hose endpoint');near(length,hose.restLength,'Developed flexible line length',1e-5);
  }
 }
 return minimum;
}
for(const id of referenceCenterOrder){
 // Retain the archived common-family regression; r2 physical families have
 // their own geometry checks and intentionally retain resource shortfalls.
 const h=sizeDesign(buildReferenceDesign(id,{revision:'odc-study-2026-11-r1'})),assessment=assessReferenceDesign(h),g=deploymentLayout(h),mel=buildEquipmentList(h),craft=makeCraft(h);
 assert.equal(assessment.feasible,true,id+' static resource screen');assert.equal(mel.reference.id,id);near(mel.totals.closureKg,0,'MEL mass closure');
 assert.equal(g.descriptors.filter(d=>d.type==='rad').length,2*h.radiatorPanelsPerBank);
 near(g.descriptors.filter(d=>d.type==='rad').reduce((a,d)=>a+d.width*d.depth,0),h.radiatorM2,'Radiating planform conserved');
 const thermal=h.energySystem.thermal;
 assert.equal(thermal.layout.radiatorSectionsPerBank,h.radiatorPanelsPerBank/2);
 assert.equal(thermal.layout.additionalCrossings,2*(h.radiatorPanelsPerBank-2));
 assert.equal(thermal.accumulator.count,h.radiatorPanelsPerBank/2);
 assert(thermal.accumulator.unitL<=thermal.accumulator.unitCapacityLimitL);
 near(thermal.accumulator.installedL,thermal.accumulator.count*thermal.accumulator.unitL,'Accumulator bank capacity');
 const exposure=surfaces(h,{...geometry(h.input,600),carrierAttached:false},0);
 near(exposure.radiatorExposedM2,h.radiatorM2/(2*h.radiatorPanelsPerBank),'Folded radiator exposed area');
 const expectedHinges=12+.15*(h.solarM2+h.radiatorM2)+4*thermal.layout.additionalCrossings;
 near(h.massLedger.find(row=>row.id==='hinges').kg,expectedHinges,'Additional mechanism mass');
 const packingMargin=bounds(h,craft);let leafGap=Infinity;
 for(let i=0;i<=32;i++)leafGap=Math.min(leafGap,verifyPose(h,craft,g,i/32));
 for(const roll of [-30,0,30])leafGap=Math.min(leafGap,verifyPose(h,craft,g,1,{wingPitchDeg:15,upperRadiatorPitchDeg:-45,lowerRadiatorPitchDeg:45,upperRadiatorRollDeg:roll,lowerRadiatorRollDeg:-roll}));
 console.log(id,JSON.stringify({resource:'meets',panelsPerBank:g.panelCount,stowedMeshMarginM:packingMargin,sampledRadiatorGapM:leafGap,massClosureKg:mel.totals.closureKg}));
}
// Preserve the original two-panel flight-tray physics exactly at the existing starter.
const original=sizeDesign(missionStarter('text'));
assert.equal(original.radiatorPanelsPerBank,2);assert.equal(original.solarWingAspect,3.4);
assert.equal(original.launchKg,4589.744587583598);assert.equal(sizingEnvelope(original).feasible,true);
console.log('Reference geometry and resource checks passed.');
