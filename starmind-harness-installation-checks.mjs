// Bounded checks of all complete mounted payload paths and their hardware.
// Other vehicle routing is inspected separately; this does not certify a sweep.
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {buildElectricalArchitecture,electricalCircuitExitPose,connectorSelections} from './dist/electrical-architecture.js';
import {createStarmindHarnessInstallation} from './dist/starmind-harness-installation.js';
import {allocateStarmindPayloadDeparture,declareStarmindHarnessInstallation} from './dist/starmind-harness-routing.js';
import {roundedConnectionRoute,routeLength} from './dist/connection-routes.js';
import {obstacleFromMesh,routeClearance,auditRoutes} from './dist/routing-audit.js';

const h=sizeDesign(buildReferenceDesign('starmind-ai1')),g=buildElectricalArchitecture(h);
const allocation=g.starmindHarnessInstallation,comb=allocation.comb;
assert(comb.active&&comb.ok);
assert.equal(comb.escapes.length,128,'Every physical payload feed retains its departure');
assert.equal(comb.pitchM,comb.underRack.pitchM,'Published lane pitch matches the actual nested departure');
assert.equal(comb.corridor.id,'under-rack-payload-plenum','Metadata identifies the installed plenum');
assert.deepEqual(comb.sourceColumns,[...new Set(comb.escapes.map(e=>e.anchor[2]))].sort((a,b)=>a-b));
const factory={root:new T.Group()},installation=createStarmindHarnessInstallation({factory,h,architecture:g});
factory.root.updateWorldMatrix(true,true);
const obstacles=installation.meshes.map(m=>obstacleFromMesh(m,{id:m.name,frame:factory.root}));
const routes=allocation.payloadRouting.rows;
assert.equal(routes.length,128);
assert(allocation.supportValidation.ok,JSON.stringify(allocation.supportValidation));
const audit=auditRoutes(routes,obstacles,{maxIssues:8});
assert(audit.ok,JSON.stringify(audit.issues));
for(const row of routes){
 const spec=g.harnesses.find(a=>row.id.startsWith(a.id+'/'));
 assert.deepEqual(row.points[0],row.from.position);
 assert.deepEqual(row.points.at(-1),row.to.position);
 assert(row.minimumBendRadiusM+1e-9>=spec.bendRadiusM);
 assert(Math.abs(routeLength(row.points)-row.lengthM)<1e-10);
}
const retained=JSON.stringify(comb);
allocateStarmindPayloadDeparture(h,comb);
assert.equal(JSON.stringify(comb),retained,'Applying the mounted departure twice does not lengthen it');
const foreign=structuredClone(comb);
allocateStarmindPayloadDeparture({architectureFamilyId:'redwire-platform'},foreign);
assert.equal(JSON.stringify(foreign),retained,'Other reference families retain their own departure');

// A finite obstruction in an actual allocated path remains an obstruction.
const owned=routes.find(row=>row.id==='P-PAY-9/0');
const middle=owned.points[Math.floor(owned.points.length/2)];
const inserted={id:'blocked-mounted-route',type:'box',min:middle.map(v=>v-.02),max:middle.map(v=>v+.02)};
assert(!routeClearance(owned,[inserted]).ok,
 'A physical solid inserted into the mounted route is not exempted');

const parts=h.cableInstallationHardware.parts.filter(p=>p.id.startsWith('starmind:raceway:'));
assert.equal(parts.length,26,'Source ladder, fanout tray, four trunks and twenty bay risers');
const ladder=allocation.corridors.find(c=>c.id==='payload-drop-ladder');
assert(ladder.retainerStationsM.length>=5,'The branch ladder has real front retention bridges');
assert(ladder.retentionAllocation.maximumUnsupportedSpanM<=.25+1e-9,'Retained spans stay within 250 mm');
assert.equal(ladder.retentionAllocation.screenedPhysicalCircuits,128);
for(const row of ladder.retentionAllocation.stations){
 assert(row.ok&&row.minimumMarginM>=-1e-8,'Every selected finite bridge clears every physical prefix');
 assert(ladder.retentionAllocation.sourceRowYM.some((y,i,rows)=>i>0&&Math.abs((rows[i-1]+y)/2-row.bodyYM)<1e-9),'Bridge planes lie between actual connector rows');
}
const ladderHardware=installation.schedule.find(p=>p.id.endsWith(':payload-drop-ladder'));
assert.equal(ladderHardware.materialPieces.filter(p=>p.id.endsWith('-cap')).length,ladder.retainerStationsM.length);
assert.equal(installation.materialMeshCount,allocation.corridors.reduce((n,c)=>n+g.installationHardware.find(p=>p.id==='starmind:raceway:'+c.id).materialPieces.length,0));
const expectedPieces=parts.flatMap(p=>p.pieces.filter(piece=>piece.massBasis!=='declared-functional-component'));
for(const mesh of installation.meshes){
 const part=parts.find(p=>p.id===mesh.userData.installationHardwareId);
 const piece=part.pieces.find(p=>p.id===mesh.userData.materialPieceId);
 assert(piece,'Every actual material mesh has a mass owner');
 const p=new T.Vector3().setFromMatrixPosition(mesh.matrixWorld);
 assert(p.distanceTo(new T.Vector3(...piece.positionM))<1e-8,'Material centroid follows the visible transform');
}
assert.equal(installation.meshes.length,expectedPieces.length);
const wall=Math.max(.018,Math.min(h.bodyWidthM,h.bodyHeightM,h.bodyLengthM)*.024);
const floor=-h.bodyHeightM/2+wall+.0002,ceiling=h.bodyHeightM/2-wall-.0002;
for(const c of allocation.corridors){
 assert(c.mounts.length>=2,'A long ladder has two structural attachments');
 const meshes=installation.meshes.filter(m=>m.userData.installationHardwareId==='starmind:raceway:'+c.id);
 for(const [i,mount] of c.mounts.entries()){
  const upper=mount.attachmentNormalBody[1]<0,surface=upper?ceiling:floor;
  assert(Math.abs(mount.attachmentPointM[1]-surface)<1e-10,'The mounting foot seats on its actual sandwich surface');
  assert(upper?mount.trayPointM[1]<surface:mount.trayPointM[1]>surface,'The support extends into the bay');
  const foot=meshes.find(m=>m.userData.materialPieceId==='mount-'+i+'-foot');
  const footSurface=()=>{const box=new T.Box3().setFromObject(foot);return upper?box.max.y:box.min.y;};
  assert(Math.abs(footSurface()-surface)<1e-8,'The rendered foot reaches its structural attachment');
  const local=foot.position.clone(),lift=new T.Vector3(0,.05,0)
   .applyQuaternion(foot.parent.getWorldQuaternion(new T.Quaternion()).invert());
  foot.position.add(lift);factory.root.updateWorldMatrix(true,true);
  assert(Math.abs(footSurface()-surface)>.001,'A displaced physical foot is not an attached installation');
  foot.position.copy(local);factory.root.updateWorldMatrix(true,true);
  const target=new T.Vector3(...mount.trayPointM);
  assert(meshes.some(m=>!/mount-/.test(m.userData.materialPieceId)&&
   new T.Box3().setFromObject(m).distanceToPoint(target)<1e-8),'The stand ends on actual ladder material');
 }
}
// Identical physical construction may be reused, but the scene and mass
// ledger must never share mutable control points or material records.
const rebuild=()=>{
 const graph={...g,installationHardware:[]};
 const installation=declareStarmindHarnessInstallation(h,graph,{circuitExitPose:electricalCircuitExitPose,connectorTypes:connectorSelections});
 return {graph,installation};
};
const first=rebuild(),retainedInstallation=JSON.stringify(first.installation),
 retainedHardware=JSON.stringify(first.graph.installationHardware);
first.installation.comb.issues.push({code:'test-only-mutation'});
first.installation.payloadRouting.rows[0].controlPoints[1][0]+=.01;
first.graph.installationHardware[0].materialPieces[0].positionM[0]+=.01;
const second=rebuild();
assert.equal(JSON.stringify(second.installation),retainedInstallation,'Construction cache returns an independent installation');
assert.equal(JSON.stringify(second.graph.installationHardware),retainedHardware,'Construction cache returns independent material');

// A smaller valid source bank leaves real straight ladder below the final
// connector row. It still needs retained material, without a sizing exception.
const h64=sizeDesign({...buildReferenceDesign('starmind-ai1'),trayCount:64}),g64=buildElectricalArchitecture(h64),a64=g64.starmindHarnessInstallation;
assert(a64.comb.ok&&a64.comb.issues.length===0,'The 64-tray reference has a valid installed departure');
assert.equal(a64.comb.escapes.length,64);
const ladder64=a64.corridors.find(c=>c.id==='payload-drop-ladder');
assert(ladder64.retentionAllocation.stations.length>0&&ladder64.retentionAllocation.stations.every(row=>row.ok),'The smaller source ladder retains clear physical bridges');
assert(ladder64.retentionAllocation.maximumUnsupportedSpanM<=.25+1e-9);
const factory64={root:new T.Group()},hardware64=createStarmindHarnessInstallation({factory:factory64,h:h64,architecture:g64});
factory64.root.updateWorldMatrix(true,true);
const routes64=a64.comb.escapes.map(e=>({id:e.id,points:e.points,radiusM:e.radiusM,clearanceM:.002,
 from:{position:e.anchor,normal:e.fromNormal},minBendRadiusM:e.bendRadiusM}));
const audit64=auditRoutes(routes64,hardware64.meshes.filter(m=>m.userData.installationHardwareId.endsWith(':payload-drop-ladder')).map(m=>obstacleFromMesh(m,{id:m.name,frame:factory64.root})),{maxIssues:8});
assert(audit64.ok,JSON.stringify(audit64.issues));
console.log('PASS Starmind mounted installation: all 128 complete full-radius paths, 26 retained raceways, actual material clearance and attachments, obstruction/lifted-foot negatives, and smaller-bank source retention.');
