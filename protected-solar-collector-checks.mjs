// Bounded material/installation regression for the protected-core solar roots.
// The CLI uses the production mechanical constructor and cassette installer,
// without route planning. deployment-checks also applies these assertions to
// its fully installed craft before its unchanged 2,401-pose sweep.
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {makeCraft} from './dist/craft.js';
import {presetList} from './dist/mission-presets.js';
import {componentMassProperties} from './dist/component-stations.js';
import {componentInertia} from './dist/attitude-inertia.js';
import {installProtectedSolarCollectorGeometry} from './dist/protected-solar-collector.js';
import {sizePropulsion,installPropulsion,propulsionReview} from './dist/spacecraft-architecture.js';

const V=()=>new T.Vector3(),tolerance=2e-6;
function range(mesh,side){
 const vertices=mesh.geometry.attributes.position,p=V();let min=Infinity,max=-Infinity;
 for(let i=0;i<vertices.count;i++){p.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);const x=side*p.x;min=Math.min(min,x);max=Math.max(max,x);}
 return {min,max};
}
function union(meshes,side){const ranges=meshes.map(mesh=>range(mesh,side));return {min:Math.min(...ranges.map(r=>r.min)),max:Math.max(...ranges.map(r=>r.max))};}

export function auditProtectedSolarCollectors(h,craft,steps=240){
 const allocation=h.solarRootCollector;if(!allocation)return null;
 craft.positionPanels(0);craft.root.updateMatrixWorld(true);
 const rows=[],parts=h.cableInstallationHardware.parts,properties=componentMassProperties(h),inertia=componentInertia(h);
 assert.equal(parts.length,4,'One mass-owned cassette/support assembly per wing');
 assert(Math.abs(properties.massKg-h.wetKg)<1e-7*Math.max(1,h.wetKg),'Cassette mass must enter wet mass once');
 const thrustLine=[0,.25,.5,.75,1].map(fraction=>{const review=propulsionReview(h,fraction*h.propellantKg);assert(review.missM<1e-7,'Propulsion installation must align against the final cassette mass stations through propellant depletion');assert(review.tankMarginM>=0&&review.engineMountMarginM>=0,'Alignment must retain physical tank and engine mount clearance');return {remainingFraction:fraction,missM:review.missM,torqueNm:review.torqueNm};});
 // Reproduce the propagation defect: ledger rows survive, but the temporary
 // installation object loses their piece/station metadata. Re-solving that
 // incomplete model must not satisfy final-hardware thrust alignment.
 const omitted={...h,propulsion:sizePropulsion(h.input),rackLayout:structuredClone(h.rackLayout)};
 installPropulsion(omitted.propulsion,h.input,{...omitted,cableInstallationHardware:undefined},h.massLedger);
 const omittedCM=componentMassProperties(omitted,h.propellantKg,1,false,false).cm,
  omittedThrustMissM=Math.hypot(...[0,1].map((axis)=>omittedCM[axis]-omitted.propulsion.engines.reduce((sum,e)=>sum+e[axis?'y':'x'],0)/2));
 assert(omittedThrustMissM>1e-6,'Missing installation station metadata must reproduce a measurable thrust-line defect');
 for(const [instance,definition]of allocation.hardwareSchedule.entries()){
  const wing=craft.wings[instance],meshes=[];craft.root.traverse(node=>{if(node.isMesh&&node.userData.installationHardwareId===definition.id)meshes.push(node);});
  assert.equal(meshes.length,definition.materialPieces.length,'Every counted cassette/extension piece must be rendered exactly once');
  assert.equal(meshes.filter(m=>m.userData.materialPieceId.startsWith('contact-')&&m.userData.rotaryElectricalCircuitId).length,allocation.contactCount,'Keep every positive/return track');
  const part=parts.find(p=>p.id===definition.id),massRow=properties.rows.find(r=>r.installationPartId===definition.id),contribution=inertia.contributions.find(r=>r.wbs===definition.wbs);
  assert(part&&massRow&&contribution,'Cassette needs a MEL allocation and inertia contribution');
  assert(Math.abs(part.massKg-massRow.massKg)<1e-9&&Math.abs(part.massKg-contribution.equipmentKg)<1e-9,'Unscaled material mass enters both mass and inertia');
  for(const piece of part.pieces){
   const mesh=meshes.find(m=>m.userData.materialPieceId===piece.id);assert(mesh,'Missing material piece '+piece.id);
   mesh.geometry.computeBoundingBox();const center=mesh.geometry.boundingBox.getCenter(V()).applyMatrix4(mesh.matrixWorld);
   assert(center.distanceTo(new T.Vector3(...piece.positionM))<tolerance,'Rendered material centroid differs from mass station: '+piece.id);
   const original=definition.materialPieces.find(p=>p.id===piece.id);
   const volume=original.shape==='annulus'?Math.PI*(original.outerRadiusM**2-original.innerRadiusM**2)*original.lengthM:original.dimensionsM.reduce((a,b)=>a*b,1);
   assert(Math.abs(piece.massKg-volume*original.densityKgM3)<1e-9,'Open bores must not be charged as solid material');
  }
  const cassette=meshes.filter(m=>!m.userData.materialPieceId.startsWith('support-extension-')),envelope=union(cassette,wing.side),root=wing.table.getWorldPosition(V());
  // Measure the installed material buffers, independently of their sizing
  // formula. The barrel and both end caps must meet without a gap or a
  // shared axial volume; summing overlapping pieces would overstate mass.
  const barrel=range(meshes.find(m=>m.userData.materialPieceId==='case'),wing.side),
   caps=meshes.filter(m=>m.userData.materialPieceId.startsWith('end-cap-')).map(m=>range(m,wing.side)).sort((a,b)=>a.min-b.min);
  assert.equal(caps.length,2,'Cassette needs both physical end caps');
  assert(Math.abs(barrel.min-caps[0].max)<tolerance&&Math.abs(caps[1].min-barrel.max)<tolerance,'Cassette barrel and end caps must form closed butt joints without overlapping material');
  const bearing=wing.table.parent.children.find(m=>m.isMesh&&Math.abs(m.position.x+wing.side*.1)<1e-8);
  assert(bearing,'Missing original outboard root bearing');
  let pedestal;craft.appendages.traverse(node=>{if(node.name==='Bearing pedestal'){const p=node.getWorldPosition(V());if(Math.abs(p.z-root.z)<1e-8&&Math.abs(p.y)<1e-8&&Math.sign(p.x)===wing.side)pedestal=node;}});
  assert(pedestal,'Missing original body-side pedestal');
  const bearingGap=range(bearing,wing.side).min-envelope.max,pedestalGap=envelope.min-range(pedestal,wing.side).max;
  assert(bearingGap>=.012-tolerance&&pedestalGap>=.012-tolerance,'Full electrical cassette must clear both actual bearing housings');
  // Moving the fixed case back to the old root datum must be rejected. This
  // control catches a lost inboard transform without altering any tolerance.
  const caseMesh=meshes.find(m=>m.userData.materialPieceId==='case'),saved=caseMesh.position.x;
  caseMesh.position.x=0;craft.root.updateMatrixWorld(true);
  assert(range(wing.roll,wing.side).min-range(caseMesh,wing.side).max<0,'Old at-root placement must fail the rolled-blanket screen');
  caseMesh.position.x=saved;craft.root.updateMatrixWorld(true);
  rows.push({instance,contactCount:allocation.contactCount,materialKg:part.massKg,bearingGapM:bearingGap,pedestalGapM:pedestalGap,minRollGapM:Infinity,cassette,wing});
 }
 const poses=steps?Array.from({length:steps+1},(_,i)=>({progress:i/steps})).concat(Array.from({length:25},(_,i)=>({progress:1,attitude:{wingPitchDeg:-180+15*i}}))):[{progress:0}];
 for(const {progress,attitude}of poses){
  craft.positionPanels(progress,attitude);craft.root.updateMatrixWorld(true);
  for(const row of rows){
   const outer=union(row.cassette,row.wing.side).max;
   for(const moving of [row.wing.roll,...row.wing.discs])row.minRollGapM=Math.min(row.minRollGapM,range(moving,row.wing.side).min-outer);
  }
 }
 for(const row of rows)assert(row.minRollGapM>=.012-tolerance,'Cassette enters actual wound-blanket or reel-disc buffers');
 craft.positionPanels(0);craft.root.updateMatrixWorld(true);
 return {poses:poses.length,contactCount:allocation.contactCount,rootStandOffM:allocation.rootStandOffM,supportExtensionM:allocation.supportExtensionM,materialKg:h.cableInstallationHardware.totalMassKg,dryKg:h.dryKg,fit:h.fairing.fit,radialClearanceM:h.fairing.radialClearanceM,axialClearanceM:h.fairing.axialClearanceM,thrustLine,omittedThrustMissM,rows:rows.map(({cassette,wing,...row})=>row)};
}

if(process.argv[1]?.endsWith('protected-solar-collector-checks.mjs')){
 const painter=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});globalThis.document={createElement:()=>({getContext:()=>painter})};
 for(const{id,h}of presetList.filter(p=>['pathfinder','reference','carrier','scale'].includes(p.id))){
  const craft=makeCraft(h,{installElectrical:false,planFluidRoutes:false}),material=new T.MeshBasicMaterial();
  for(const [instance,part]of h.solarRootCollector.hardwareSchedule.entries()){
   const stator=new T.Group();stator.position.set(...part.positionM);craft.root.add(stator);
   installProtectedSolarCollectorGeometry({T,part,stator,rotor:craft.wings[instance].table,materials:{metal:material,contact:material,insulator:material}});
  }
  console.log(JSON.stringify({id,...auditProtectedSolarCollectors(h,craft)}));
 }
}
