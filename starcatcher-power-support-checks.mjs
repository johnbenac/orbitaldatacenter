// Finite material checks for the default Star Catcher power support schedule.
// Full native-scene admission checks the additional data, service and fluid paths.
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {buildElectricalArchitecture} from './dist/electrical-architecture.js';
import {starcatcherPowerRoutingCases} from './dist/starcatcher-power-routing.js';
import {starcatcherHarnessInstallationHardware,createStarcatcherHarnessInstallation}
 from './dist/starcatcher-harness-installation.js';
import {cableInstallationHardware} from './dist/cable-installation-mass.js';
import {inspectStarcatcherInstallationMaterial} from './dist/starcatcher-harness-routing.js';
import {roundedConnectionRoute} from './dist/connection-routes.js';

const h=sizeDesign(buildReferenceDesign('star-catcher-self-powered')),
 graph=buildElectricalArchitecture(h),powerIds=new Set([
  'power-port-battery-wall','power-starboard-battery-wall',
  'power-port-source-roof','power-starboard-source-roof','power-aft-fan-roof',
  'power-pcdu-bank-3-drop','power-pcdu-bank-4-drop',
  'power-port-pcdu-bank-1-flat','power-port-pcdu-bank-2-flat',
  'power-port-pcdu-bank-1-oblique','power-port-forward-source-comb'
 ]),corridors=graph.starcatcherHarnessInstallation.corridors.filter(c=>powerIds.has(c.id)),
 routes=starcatcherPowerRoutingCases.map(row=>{
  let points=roundedConnectionRoute(row.controls,row.bendRadiusM).points;
  if(row.fromEscape)points=[...row.fromEscape.points,...points.slice(1)];
  if(row.toEscape)points=[...points,...[...row.toEscape.points].reverse().slice(1)];
  return {id:row.id,points,radiusM:row.radiusM,clearanceM:.002};
 });
assert.equal(corridors.length,11);
assert.equal(routes.length,88);
// A physically shared ladder may also carry a service or compressor cut.
// Its complete battery/collector inventory must still match every power cut.
const allocatedPowerIds=new Set(corridors.flatMap(c=>c.routeIds)
 .filter(id=>id.startsWith('P-BAT-')||id.startsWith('P-SA-')));
assert.deepEqual([...allocatedPowerIds].sort(),routes.map(r=>r.id).sort(),
 'All battery and collector cuts have an explicit installed support allocation');
for(const corridor of corridors){
 assert(corridor.mounts.length>0,corridor.id+' has an actual structural attachment');
 assert(corridor.retentionAllocation.maximumUnsupportedSpanM<=.25+1e-9);
 assert(corridor.retentionAllocation.maximumRungPitchM<=.25+1e-9);
 assert(corridor.rungStationsM.length&&corridor.retainerStationsM.length);
 for(const opening of corridor.railOpeningsM||[])
  assert(opening.toM>opening.fromM&&opening.basis);
}
const schedule=starcatcherHarnessInstallationHardware(h,{},corridors),
 parts=cableInstallationHardware(schedule),
 inspected=inspectStarcatcherInstallationMaterial(h,{},corridors,{routes});
assert(inspected.routes.ok,JSON.stringify(inspected.routes.issues));
const materialMass=schedule.reduce((sum,part)=>sum+
 part.materialPieces.reduce((s,p)=>s+p.dimensionsM.reduce((a,b)=>a*b,1)*
  (p.densityKgM3??part.densityKgM3),0)+
 part.massItems.reduce((s,p)=>s+p.massKg,0),0);
assert(Math.abs(materialMass-parts.reduce((sum,p)=>sum+p.massKg,0))<1e-10,
 'Every finite piece and named fastener set enters the unscaled hardware ledger');

const boundary=corridors.filter(c=>c.sideBoundary);
assert.equal(boundary.length,2);
for(const corridor of boundary){
 const part=schedule.find(p=>p.id==='starcatcher:raceway:'+corridor.id);
 assert(!part.materialPieces.some(p=>p.id.startsWith('longeron-1')),
  'The real bulkhead owns only its coincident side, without duplicate aluminium');
 assert(part.materialPieces.some(p=>p.id.startsWith('longeron--1')));
 assert(!part.materialPieces.some(p=>p.id.endsWith('-leg-1')));
 assert(part.materialPieces.some(p=>p.id.endsWith('-leg--1')));
 assert(corridor.mounts.every(m=>Math.abs(m.attachmentPointM[2]-
  (h.propulsion.forwardDeckZ+.017/2))<1e-10&&m.attachment.includes('bulkhead')));
 const shifted=structuredClone(corridor);shifted.fromM[2]+=.001;shifted.toM[2]+=.001;
 assert.throws(()=>starcatcherHarnessInstallationHardware(h,{},[shifted]),/real equipment bulkhead/);
 const wrongPlane=structuredClone(corridor);wrongPlane.sideBoundary.surfaceZM+=.001;
 assert.throws(()=>starcatcherHarnessInstallationHardware(h,{},[wrongPlane]),/real equipment bulkhead/);
 const wrongSide=structuredClone(corridor);wrongSide.sideBoundary.side=-1;
 assert.throws(()=>starcatcherHarnessInstallationHardware(h,{},[wrongSide]),/real equipment bulkhead/);
}
const closed=structuredClone(corridors.find(c=>c.id==='power-starboard-source-roof'));
closed.railOpeningsM=[];
assert(!inspectStarcatcherInstallationMaterial(h,{},[closed],{routes}).routes.ok,
 'Removing a real branch opening puts aluminium through a complete source cable');

const root=new T.Group(),rendered=createStarcatcherHarnessInstallation({
 factory:{root},h,architecture:{installationHardware:schedule},material:new T.MeshBasicMaterial()
});
root.updateMatrixWorld(true);
assert.equal(rendered.meshes.length,schedule.reduce((n,p)=>n+p.materialPieces.length,0));
for(const mesh of rendered.meshes){
 const part=parts.find(p=>p.id===mesh.userData.installationHardwareId),
  piece=part.pieces.find(p=>p.id===mesh.userData.materialPieceId),
  position=mesh.getWorldPosition(new T.Vector3()).toArray();
 assert(Math.hypot(...position.map((v,k)=>v-piece.shapePositionM[k]))<1e-9,
  mesh.name+' renders at the same material datum used by CG and inertia');
 assert.deepEqual([mesh.geometry.parameters.width,mesh.geometry.parameters.height,
  mesh.geometry.parameters.depth],piece.dimensionsM);
}

assert.deepEqual(starcatcherHarnessInstallationHardware(
 {...h,architectureFamilyId:'starmind-cross'},graph,corridors),[],
 'The Star Catcher material builder cannot add these assemblies to another reference');
console.log('PASS Star Catcher power support: '+corridors.length+' real corridors, '+
 rendered.meshes.length+' material meshes, '+materialMass.toFixed(6)+' kg, '+
 'all 88 power cuts clear, real bulkhead boundaries, closed mass and matching rendered pieces.');
