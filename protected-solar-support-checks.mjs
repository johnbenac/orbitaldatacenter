// Bounded rendered-material checks for both protected-core renderer paths.
// Production mechanics and the shared cassette installer are exercised without
// electrical/fluid route planning. No deployment tolerance is relaxed here.
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {defaults,sizeDesign} from './dist/design.js';
import {makeCraft} from './dist/craft.js';
import {deploymentLayout} from './dist/deployment.js';
import {componentMassProperties} from './dist/component-stations.js';
import {componentInertia} from './dist/attitude-inertia.js';
import {installProtectedSolarCollectorGeometry} from './dist/protected-solar-collector.js';

const tolerance=2e-6,V=(...values)=>new T.Vector3(...values);
function bounds(mesh){
 const out=new T.Box3(),point=V(),vertices=mesh.geometry.attributes.position;
 for(let i=0;i<vertices.count;i++)out.expandByPoint(point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld));
 return out;
}
function signedRange(mesh,side){const b=bounds(mesh);return side>0?[b.min.x,b.max.x]:[-b.max.x,-b.min.x];}
function rodRadius(mesh){
 const center=bounds(mesh).getCenter(V()),vertices=mesh.geometry.attributes.position,point=V();let radius=0;
 for(let i=0;i<vertices.count;i++){point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld).sub(center);radius=Math.max(radius,Math.hypot(point.y,point.z));}
 return radius;
}
function assertAnnulus(mesh,piece){
 const b=bounds(mesh),center=b.getCenter(V()),vertices=mesh.geometry.attributes.position,point=V();
 assert(center.distanceTo(V(...piece.positionM))<tolerance,'Support material centroid differs from its mass station');
 assert(Math.abs(b.max.x-b.min.x-piece.lengthM)<tolerance,'Support material axial extent differs from its allocation');
 let inner=Infinity,outer=0;
 for(let i=0;i<vertices.count;i++){point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld).sub(center);const radius=Math.hypot(point.y,point.z);inner=Math.min(inner,radius);outer=Math.max(outer,radius);}
 assert(Math.abs(inner-piece.innerRadiusM)<tolerance&&Math.abs(outer-piece.outerRadiusM)<tolerance,'Support must render its actual hollow material, not a solid or undersized substitute');
}
function assertRod(rod,support,lengthM){
 const range=signedRange(rod,support.side),start=support.side*support.rodFoot[0];
 assert(Math.abs(range[0]-start)<tolerance&&Math.abs(range[1]-start-lengthM)<tolerance,'Retained support rod must start at the extension end and retain its measured length');
 assert(Math.abs(rodRadius(rod)-support.rodRadiusM)<tolerance,'Retraction must not change the physical rod radius');
}

export function auditProtectedSolarSupportVariants(){
 const results=[];
 for(const communicationsPackage of ['optical-ttc','optical-ka','optical-only','full']){
  const h=sizeDesign({...defaults,communicationsPackage}),g=deploymentLayout(h),craft=makeCraft(h,{installElectrical:false,planFluidRoutes:false}),material=new T.MeshBasicMaterial();
  for(const [instance,part]of h.solarRootCollector.hardwareSchedule.entries()){
   const stator=new T.Group();stator.position.set(...part.positionM);craft.root.add(stator);
   installProtectedSolarCollectorGeometry({T,part,stator,rotor:craft.wings[instance].table||craft.wings[instance].base,materials:{metal:material,contact:material,insulator:material}});
  }
  craft.positionPanels(0);craft.root.updateMatrixWorld(true);
  const legacy=Boolean(craft.wings[0].table),solarMounts=g.mounts.filter(m=>m.kind==='solar'),supports=[],cassettes=[],mass=componentMassProperties(h),inertia=componentInertia(h);
  assert.equal(legacy,communicationsPackage==='full','Exercise both production renderer paths');
  for(const [instance,definition]of h.solarRootCollector.hardwareSchedule.entries()){
   const meshes=[];craft.root.traverse(node=>{if(node.isMesh&&node.userData.installationHardwareId===definition.id)meshes.push(node);});
   assert.equal(meshes.length,definition.materialPieces.length,'Every counted cassette/support piece must be rendered exactly once for '+communicationsPackage);
   const part=h.cableInstallationHardware.parts.find(p=>p.id===definition.id),massRow=mass.rows.find(p=>p.installationPartId===definition.id),contribution=inertia.contributions.find(p=>p.wbs===definition.wbs);
   assert(part&&massRow&&contribution,'Rendered assembly needs its existing mass and inertia ownership');
   assert(Math.abs(part.massKg-massRow.massKg)<1e-9&&Math.abs(part.massKg-contribution.equipmentKg)<1e-9,'Assembly material must enter mass and inertia once');
   for(const piece of part.pieces){
    const matches=meshes.filter(m=>m.userData.materialPieceId===piece.id);assert.equal(matches.length,1,'One physical mesh per material piece');
    assert(bounds(matches[0]).getCenter(V()).distanceTo(V(...piece.positionM))<tolerance,'Rendered piece differs from its mass centroid');
   }
   const mount=solarMounts[instance];
   for(const [index,support]of mount.supports.entries()){
    const id='support-extension-'+index,piece=part.pieces.find(p=>p.id===id),original=definition.materialPieces.find(p=>p.id===id),mesh=meshes.find(m=>m.userData.materialPieceId===id);
    assert(piece&&original&&mesh,'Every allocated support extension must be physically installed');
    const physical={...original,positionM:piece.positionM};assertAnnulus(mesh,physical);
    const rodFoot=[support.foot[0]+mount.side*original.lengthM,support.foot[1],support.foot[2]],rodNames=legacy?['Face-mounted bearing','Retracting launch lock']:['Appendage root support','Allocated telescoping launch restraint'],rods=[];
    craft.root.traverse(node=>{if(!node.isMesh||!rodNames.includes(node.name))return;const c=bounds(node).getCenter(V());if(Math.sign(c.x)===mount.side&&Math.abs(c.y-support.foot[1])<tolerance&&Math.abs(c.z-support.foot[2])<tolerance)rods.push(node);});
    assert.equal(rods.length,1,'No duplicate full-length rod may remain behind the extension');
    const retainedLengthM=Math.abs(support.seat[0]-rodFoot[0]),entry={...support,side:mount.side,rodFoot,retainedLengthM,rod:rods[0],rodRadiusM:rodRadius(rods[0]),mesh,piece:physical};
    assert(Math.abs(retainedLengthM-h.solarRootCollector.originalStandOffM)<tolerance,'Retain the original support rod length');
    if(support.role==='root')assert(entry.rodRadiusM>original.innerRadiusM,'Root rod must meet the annular extension material at the retained axial joint');
    else assert(entry.rodRadiusM<original.innerRadiusM,'The sliding restraint must fit inside its allocated guide bore');
    assertRod(entry.rod,entry,retainedLengthM);
    if(!legacy&&support.role==='restraint')assert(Math.abs(entry.rod.userData.routingMotion.strokeM-(retainedLengthM-.04))<tolerance,'Reserved restraint motion must use the retained rod stroke');
    supports.push(entry);
   }
   cassettes.push({wing:craft.wings[instance],side:mount.side,meshes:meshes.filter(m=>!m.userData.materialPieceId.startsWith('support-extension-'))});
  }
  assert.equal(supports.length,12,'Three material-owned extensions per solar wing');
  const poses=Array.from({length:241},(_,i)=>({progress:i/240})).concat([.015,.0275,.04].map(progress=>({progress})),Array.from({length:25},(_,i)=>({progress:1,attitude:{wingPitchDeg:-180+15*i}})));
  let minRollGapM=Infinity;
  for(const {progress,attitude}of poses){
   craft.positionPanels(progress,attitude);craft.root.updateMatrixWorld(true);
   for(const support of supports){
    assertAnnulus(support.mesh,support.piece);
    if(!legacy){const q=support.role==='restraint'?Math.max(0,Math.min(1,(progress-.015)/.025)):0,lengthM=support.retainedLengthM+q*(.04-support.retainedLengthM);assertRod(support.rod,support,lengthM);}
   }
   for(const cassette of cassettes){const outer=Math.max(...cassette.meshes.map(m=>signedRange(m,cassette.side)[1]));for(const moving of [cassette.wing.roll,...cassette.wing.discs])minRollGapM=Math.min(minRollGapM,signedRange(moving,cassette.side)[0]-outer);}
  }
  assert(minRollGapM>=.012-tolerance,'Both renderer paths must keep the cassette clear of actual roll/disc buffers');
  const supportMassKg=h.cableInstallationHardware.parts.reduce((sum,part)=>sum+part.pieces.filter(p=>p.id.startsWith('support-extension-')).reduce((kg,p)=>kg+p.massKg,0),0);
  const rootRodRadiusM=supports.find(s=>s.role==='root').rodRadiusM,restraintRodRadiusM=supports.find(s=>s.role==='restraint').rodRadiusM;
  for(const support of supports)assert(Math.abs(support.rodRadiusM-(support.role==='root'?rootRodRadiusM:restraintRodRadiusM))<tolerance,'Equivalent support rods must retain their common physical radius');
  results.push({communicationsPackage,renderer:legacy?'legacy':'family',poses:poses.length,supportPieces:supports.length,supportMassKg,minRollGapM,retainedRodLengthM:h.solarRootCollector.originalStandOffM,rootRodRadiusM,restraintRodRadiusM,restraintBoreClearanceM:Math.min(...supports.filter(s=>s.role==='restraint').map(s=>s.piece.innerRadiusM-s.rodRadiusM)),maximumNumericalToleranceM:tolerance});
 }
 const legacy=results.find(row=>row.renderer==='legacy');
 for(const row of results)for(const key of ['rootRodRadiusM','restraintRodRadiusM'])assert(Math.abs(row[key]-legacy[key])<tolerance,'Communications selection must not substitute thinner rods than the existing legacy mechanisms');
 return results;
}

if(process.argv[1]?.endsWith('protected-solar-support-checks.mjs')){
 const painter=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});globalThis.document={createElement:()=>({getContext:()=>painter})};
 console.log(JSON.stringify({ok:true,rows:auditProtectedSolarSupportVariants()},null,2));
}
