// Bounded checks of the actual Star Catcher reference cassette/stand buffers.
// No electrical or fluid route search runs here. The negative witness is a
// point on the former stator triangle inside the actual stowed blanket polygon.
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {canvas} from './render-test-canvas.mjs';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {buildElectricalArchitecture} from './dist/electrical-architecture.js';
import {makeCraft} from './dist/craft.js';
import {installProtectedSolarCollectorGeometry} from './dist/protected-solar-collector.js';
import {componentMassProperties} from './dist/component-stations.js';
import {componentInertia,movingMassElements} from './dist/attitude-inertia.js';
import {cableInstallationMassElements} from './dist/cable-installation-mass.js';
import {obstacleFromMesh,segmentObstacleClearance} from './dist/routing-audit.js';

const tolerance=2e-6,V=(...p)=>new T.Vector3(...p);
const near=(a,b,label)=>assert(Math.abs(a-b)<tolerance,label+': '+a+' != '+b);
function extent(mesh,side=1){
 const vertices=mesh.geometry.attributes.position,p=V(),box=new T.Box3();let min=Infinity,max=-Infinity;
 for(let i=0;i<vertices.count;i++){p.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);box.expandByPoint(p);min=Math.min(min,side*p.x);max=Math.max(max,side*p.x);}
 return {min,max,box};
}
const endpoints=mesh=>[-.5,.5].map(y=>V(0,y,0).applyMatrix4(mesh.matrixWorld));
const boundsGap=(a,b)=>Math.hypot(...[0,1,2].map(k=>Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])));
function edges(mesh){
 const p=mesh.geometry.attributes.position,index=mesh.geometry.index,vertices=Array.from({length:p.count},(_,i)=>V().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).toArray()),found=new Map();
 for(let i=0;i<(index?.count??p.count);i+=3){const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);for(let j=0;j<3;j++){const a=vertices[ids[j]],b=vertices[ids[(j+1)%3]],key=[a.join(','),b.join(',')].sort().join(';');if(!found.has(key))found.set(key,[a,b]);}}
 return [...found.values()];
}
function actualSolid(mesh){
 const o=obstacleFromMesh(mesh);if(o.triangles)o.triangles=Object.freeze(o.triangles.map(t=>Object.freeze(t.map(p=>Object.freeze([...p])))));
 return {mesh,obstacle:o,edges:edges(mesh)};
}
// A positive box bound is already a conservative separation certificate.
// Nearby pairs use both sets of actual material edges against solid buffers,
// including containment. No collector/blanket pair is exempted.
function materialGap(a,b,boundLimit=.012){
 const broad=boundsGap(a.obstacle.bounds,b.obstacle.bounds);if(broad>=boundLimit)return broad;
 let minimum=Infinity;
 for(const [from,to]of a.edges){minimum=Math.min(minimum,segmentObstacleClearance(from,to,b.obstacle));if(minimum<tolerance)return minimum;}
 for(const [from,to]of b.edges){minimum=Math.min(minimum,segmentObstacleClearance(from,to,a.obstacle));if(minimum<tolerance)return minimum;}
 return minimum;
}
function oldStatorWitness(wing,root,coreRadiusM){
 const old=new T.TorusGeometry(.115,.012,8,24);old.rotateY(Math.PI/2);const point=V();
 for(let k=0;k<3;k++)point.add(V().fromBufferAttribute(old.attributes.position,old.index.getX(k)).multiplyScalar(1/3));
 point.add(V(...root));const local=wing.roll.worldToLocal(point.clone()),radius=Math.hypot(local.x,local.z)*wing.roll.scale.x,
  inscribedRadius=wing.roll.scale.x*Math.cos(Math.PI/wing.roll.geometry.parameters.radialSegments),insideM=inscribedRadius-radius,outsideCoreM=radius-coreRadiusM;
 assert(Math.abs(local.y)<.5&&insideM>.005&&outsideCoreM>.005,'Former stator triangle must lie in wound material, outside the mandrel core');
 old.dispose();return {triangle:0,bodyPointM:point.toArray(),insideActualPolygonM:insideM,outsideCoreM};
}

export function auditStarcatcherSolarCollectors({steps=48}={}){
 const h=sizeDesign(buildReferenceDesign('star-catcher-self-powered')),graph=buildElectricalArchitecture(h),a=h.solarRootCollector;
 assert(a&&a.hardwareSchedule.length===4,'Four complete material-owned source cassettes');
 near(h.wingLengthM*h.wingWidthM*4,1100,'Retain all installed photovoltaic area');
 near(h.wingLengthM,Math.sqrt(h.input.solarM2*h.input.solarWingAspect/4),'Retain original blanket length');
 near(h.wingWidthM,Math.sqrt(h.input.solarM2/4/h.input.solarWingAspect),'Retain original blanket width');
 assert.equal(a.contactCount,18,'Nine positive/return channels on each of four wings');
 assert.equal(graph.collectorAccommodations.length,4,'Four actual source connector banks');
 assert(graph.collectorAccommodations.every(bank=>bank.ok),'All source banks fit their declared equipment envelopes');
 for(const bank of graph.collectorAccommodations){
  const box=graph.boxById[bank.boxId],port=graph.ports.find(p=>
   p.boxId===bank.boxId&&p.id.startsWith('P-SA-')&&p.id.endsWith(':from')),
   offsets=port.instanceOffsetsM;
  assert.equal(offsets.length,9);
  assert.deepEqual(offsets.map(p=>p[0]).sort((a,b)=>a-b),
   Array.from({length:9},(_,i)=>i*port.packing.pitchM),
   'Every original physical connector column is retained');
  assert(offsets.every(p=>p[1]===0&&p[2]===0),'Polarity-row and axial datums stay fixed');
  near(offsets[1][0]-offsets[0][0],port.packing.pitchM,
   'Collector circuit order follows its PCDU fanout orientation');
 }
 const craft=makeCraft(h,{installElectrical:false,planFluidRoutes:false}),material=new T.MeshBasicMaterial(),supports=[],cassettes=[],couplings=[],movingMaterial=[];
 for(const [i,part]of a.hardwareSchedule.entries()){
  const stator=new T.Group();stator.position.set(...part.positionM);craft.root.add(stator);
  installProtectedSolarCollectorGeometry({T,part,stator,rotor:craft.wings[i].base,materials:{metal:material,contact:material,insulator:material}});
 }
 craft.positionPanels(0,{wingPitchDeg:0});craft.root.updateMatrixWorld(true);
 const mass=componentMassProperties(h),inertia=componentInertia(h),rods=[];
 craft.root.traverse(o=>{if(o.isMesh&&['Appendage root support','Allocated telescoping launch restraint'].includes(o.name))rods.push(o);});
 let materialKg=0;const negatives=[];
 for(const [i,definition]of a.hardwareSchedule.entries()){
  const meshes=[];craft.root.traverse(o=>{if(o.isMesh&&o.userData.installationHardwareId===definition.id)meshes.push(o);});
  assert.equal(meshes.length,definition.materialPieces.length,'Every owned material piece is rendered once');
  const part=h.cableInstallationHardware.parts.find(p=>p.id===definition.id),row=mass.rows.find(p=>p.installationPartId===definition.id),contribution=inertia.contributions.find(p=>p.wbs===definition.wbs);
  assert(part&&row&&contribution,'Cassette and supports must enter mass and inertia');near(part.massKg,row.massKg,'Material mass ownership');near(part.massKg,contribution.equipmentKg,'Inertia mass ownership');materialKg+=part.massKg;
  for(const piece of part.pieces){
   const mesh=meshes.find(m=>m.userData.materialPieceId===piece.id),original=definition.materialPieces.find(p=>p.id===piece.id);
   assert(extent(mesh).box.getCenter(V()).distanceTo(V(...piece.positionM))<tolerance,'Actual material centroid must match its mass station');
   const volume=original.shape==='annulus'?Math.PI*(original.outerRadiusM**2-original.innerRadiusM**2)*original.lengthM:original.dimensionsM.reduce((n,x)=>n*x,1);
   near(piece.massKg,volume*original.densityKgM3,'Hollow support/cassette material takeoff');
   if(original.role==='rotor'){
    assert.equal(original.motion?.kind,'solar-rotor','Every rotating material piece carries its actual mass frame');
    assert.equal(original.motion.wingInstance,i,'Rotor material belongs to its own wing');
    movingMaterial.push({mesh,original,id:definition.id+':'+piece.id,massKg:piece.massKg});
   }else assert(!original.motion,'Fixed case, brushes and stands stay body-fixed');
   if(original.role!=='support')continue;
   const matches=rods.filter(rod=>endpoints(rod).some(p=>p.distanceTo(V(...original.rodFootM))<tolerance));
   assert.equal(matches.length,1,'Retained rod starts at the end of its fixed extension');
   const rod=matches[0],ends=endpoints(rod),length=ends[0].distanceTo(ends[1]),radius=Math.max(...Array.from({length:rod.geometry.attributes.position.count},(_,k)=>Math.hypot(rod.geometry.attributes.position.getX(k)*rod.scale.x,rod.geometry.attributes.position.getZ(k)*rod.scale.z)));
   near(length,original.originalRodLengthM,'Retain original rod length');near(radius,original.rodRadiusM,'Retain original rod radius');
   supports.push({mesh,position:mesh.position.clone(),matrix:[...mesh.matrix.elements],rod,piece:original,length,role:a.originalSolarSupports[i][+piece.id.split('-').at(-1)].role,releaseStart:.015,releaseEnd:.04});
  }
  const cassette=meshes.filter(m=>!m.userData.materialPieceId.startsWith('support-extension-')&&!m.userData.materialPieceId.startsWith('rotor-coupling-')),
   barrel=extent(meshes.find(m=>m.userData.materialPieceId==='case'),definition.side),caps=meshes.filter(m=>m.userData.materialPieceId.startsWith('end-cap-')).map(m=>extent(m,definition.side)).sort((x,y)=>x.min-y.min);
  near(barrel.min,caps[0].max,'Inboard closed butt joint');near(barrel.max,caps[1].min,'Outboard closed butt joint');
  assert.equal(cassette.filter(m=>m.userData.rotaryElectricalCircuitId&&m.userData.materialPieceId.startsWith('contact-')).length,a.contactCount,'Every supply/return track remains present');
  const coupling=definition.rotorCoupling;assert(coupling,'The carrier has a material-owned drive to its root crossbar');
  const drive=meshes.filter(m=>m.userData.materialPieceId.startsWith('rotor-coupling-'));assert.equal(drive.length,6,'Complete bonded finger, offset strap and root shoe');
  const byId=new Map(drive.map(m=>[m.userData.materialPieceId.replace('rotor-coupling-',''),m]));
  const atRoot=p=>V(...p).applyMatrix4(craft.wings[i].base.matrixWorld),onSurface=(mesh,p,label)=>{const q=atRoot(p).toArray();assert(segmentObstacleClearance(q,q,obstacleFromMesh(mesh))<tolerance,label);};
  for(const [left,right,p]of coupling.joints){onSurface(byId.get(left),p,'Coupling first joint face exists');onSurface(byId.get(right),p,'Coupling second joint face exists');}
  const carrier=meshes.find(m=>m.userData.materialPieceId==='contact-carrier'),crossbar=craft.wings[i].base.children.find(m=>m.isMesh&&m.geometry.type==='BoxGeometry');
  onSurface(carrier,coupling.carrierContactM,'Drive film meets actual dielectric carrier');onSurface(byId.get('bond'),coupling.carrierContactM,'Drive film closes the carrier interface');
  onSurface(crossbar,coupling.rootContactM,'Drive shoe meets actual root crossbar');onSurface(byId.get('shoe'),coupling.rootContactM,'Drive shoe closes the root interface');
  const fixed=meshes.filter(m=>definition.materialPieces.find(p=>p.id===m.userData.materialPieceId)?.role==='stator').map(actualSolid);
  const finger=byId.get('finger'),savedY=finger.position.y;finger.position.y=-.116;craft.root.updateMatrixWorld(true);
  assert(fixed.some(part=>materialGap(actualSolid(finger),part)<tolerance),'Actual finger displaced into the end cap must fail');
  finger.position.y=savedY;craft.root.updateMatrixWorld(true);
  couplings.push({meshes:drive,fixed,wing:craft.wings[i],localMatrices:drive.map(m=>[...m.matrix.elements]),minimumRollGapM:Infinity,minimumFixedGapM:Infinity});
  negatives.push(oldStatorWitness(craft.wings[i],definition.positionM,.125));cassettes.push({meshes:cassette,side:definition.side,wing:craft.wings[i],minRollGapM:Infinity});
 }
 assert.equal(supports.length,12,'One root and two restraint extensions per wing');
 const poses=Array.from({length:steps+1},(_,i)=>({progress:i/steps})).concat([.015,.0275,.04].map(progress=>({progress})),Array.from({length:25},(_,i)=>({progress:1,attitude:{wingPitchDeg:-180+15*i}})));
 for(const {progress,attitude}of poses){
  craft.positionPanels(progress,attitude);craft.root.updateMatrixWorld(true);
  const materialMass=new Map(cableInstallationMassElements(h,progress,attitude,{movingOnly:true}).map(piece=>[piece.id,piece]));
  const inertiaMass=new Map(movingMassElements(h,{deployment:progress,attitude}).filter(piece=>piece.kind==='cableInstallationHardware').map(piece=>[piece.id,piece]));
  for(const {mesh,original,id,massKg}of movingMaterial){
   const element=materialMass.get(id),inertial=inertiaMass.get(id);
   assert(element?.moving&&inertial,'Moving collector material reaches mass and inertia queries');
   const center=extent(mesh).box.getCenter(V()),axes=[V(1,0,0),V(0,1,0),V(0,0,1)].map(axis=>axis.transformDirection(mesh.matrixWorld).toArray());
   assert(center.distanceTo(V(...element.centroidM))<tolerance,'Moving material centroid follows its actual rendered buffer');
   axes.flat().forEach((value,k)=>near(value,element.axes.flat()[k],'Moving material axes follow the rendered frame'));
   const mass=massKg*(1+h.input.structureMargin),principal=original.shape==='annulus'?[
    mass*(original.outerRadiusM**2+original.innerRadiusM**2)/2,
    mass*((original.outerRadiusM**2+original.innerRadiusM**2)/4+original.lengthM**2/12),
    mass*((original.outerRadiusM**2+original.innerRadiusM**2)/4+original.lengthM**2/12)
   ]:original.dimensionsM.map((_,axis)=>mass*original.dimensionsM.reduce((sum,value,k)=>sum+(axis===k?0:value*value),0)/12);
   for(let i=0;i<3;i++)for(let j=0;j<3;j++)near(inertial.intrinsicTensorKgM2[3*i+j],principal.reduce((sum,value,k)=>sum+value*axes[k][i]*axes[k][j],0),'Moving material tensor follows actual shape and orientation');
  }
  for(const support of supports){
   assert(support.mesh.position.distanceTo(support.position)<tolerance,'Extension stays fixed during restraint release and wing tracking');
   const fraction=support.role==='restraint'?Math.max(0,Math.min(1,(progress-support.releaseStart)/(support.releaseEnd-support.releaseStart))):0,expected=support.length+fraction*(.04-support.length),ends=endpoints(support.rod);
   near(ends[0].distanceTo(ends[1]),expected,'Only the retained rod retracts');
  }
  for(const row of cassettes){const outer=Math.max(...row.meshes.map(mesh=>extent(mesh,row.side).max));for(const moving of[row.wing.roll,...row.wing.discs])row.minRollGapM=Math.min(row.minRollGapM,extent(moving,row.side).min-outer);}
  for(const row of couplings){
   const moving=[row.wing.roll,...row.wing.discs].map(actualSolid);
   for(const [i,mesh]of row.meshes.entries()){
    assert.equal(mesh.parent,row.wing.base,'Drive and original crossbar share the wing frame');
    mesh.matrix.elements.forEach((value,k)=>near(value,row.localMatrices[i][k],'Drive joints remain fixed in the rotating frame'));
    const current=actualSolid(mesh);
    for(const obstacle of moving)row.minimumRollGapM=Math.min(row.minimumRollGapM,materialGap(current,obstacle));
    for(const obstacle of row.fixed)row.minimumFixedGapM=Math.min(row.minimumFixedGapM,materialGap(current,obstacle));
   }
  }
 }
 for(const row of cassettes)assert(row.minRollGapM>=.012-tolerance,'Installed cassette must clear actual rolled blanket and disc buffers');
 for(const row of couplings){assert(row.minimumRollGapM>=.012-tolerance,'Rotating drive must clear the rolled blanket and discs');assert(row.minimumFixedGapM>tolerance,'Rotating drive must clear every fixed cassette material piece');}
 return {ok:true,poses:poses.length,spanM:h.physicalArchitecture.dimensions.deployed.size[0],photovoltaicAreaM2:1100,materialKg,contactCountPerWing:a.contactCount,supportExtensions:supports.length,movingMaterialPieces:movingMaterial.length,rootStandOffM:a.rootStandOffM,rodRadiusM:a.originalSupportRodRadiusM,minimumRollGapM:Math.min(...cassettes.map(r=>r.minRollGapM)),rotorDrive:{pieces:couplings.reduce((n,r)=>n+r.meshes.length,0),minimumRollGapM:Math.min(...couplings.map(r=>r.minimumRollGapM)),minimumFixedGapM:Math.min(...couplings.map(r=>r.minimumFixedGapM)),basis:'Conservative separation bounds or two-sided actual material-edge checks at each sampled pose; both endpoint interfaces and all five internal joints close. Every rotating material centroid, axes and intrinsic inertia tensor follow the rendered wing frame.'},negativeWitnesses:negatives};
}

if(process.argv[1]?.endsWith('starcatcher-solar-collector-checks.mjs')){
 globalThis.document={createElement:()=>canvas()};console.log(JSON.stringify(auditStarcatcherSolarCollectors(),null,2));
}
