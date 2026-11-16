// Bounded checks of all complete mounted payload paths and their hardware.
// Other vehicle routing is inspected separately; this does not certify a sweep.
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {buildElectricalArchitecture,electricalCircuitExitPose,connectorSelections} from './dist/electrical-architecture.js';
import {createStarcatcherHarnessInstallation,starcatcherHarnessInstallationHardware}
 from './dist/starcatcher-harness-installation.js';
import {allocateStarcatcherPayloadDeparture,declareStarcatcherHarnessInstallation} from './dist/starcatcher-harness-routing.js';
import {roundedConnectionRoute,routeLength} from './dist/connection-routes.js';
import {obstacleFromMesh,routeClearance,auditRoutes} from './dist/routing-audit.js';
import {retainedStarcatcherSupplementalInstallation}
 from './dist/starcatcher-supplemental-installation.js';
import {inspectStarcatcherRetentionStations} from './dist/starcatcher-support-coverage.js';

const h=sizeDesign(buildReferenceDesign('star-catcher-self-powered')),g=buildElectricalArchitecture(h);
const allocation=g.starcatcherHarnessInstallation,comb=allocation.comb;
assert.equal(allocation.payloadSupportConstruction,'guarded-fixed-material',
 'Unchanged default sizing uses the guarded24-section construction without support search');
const retention=inspectStarcatcherRetentionStations(allocation.corridors);
assert(retention.ok,JSON.stringify(retention.issues));
const incompleteKeepers=structuredClone(allocation.corridors),
 batteryWall=incompleteKeepers.find(c=>c.id==='power-port-battery-wall');
batteryWall.retainerStationsM=batteryWall.retainerStationsM.filter(station=>station<=4.4);
assert(inspectStarcatcherRetentionStations(incompleteKeepers).issues.some(issue=>
 issue.corridorId===batteryWall.id&&issue.code==='keeper-gap-exceeds-allocation'),
 'Deleting the end keeper run fails despite unchanged corridor bounds and allocation labels');
const supplemental=retainedStarcatcherSupplementalInstallation(h,g);
assert(supplemental,'Default Star Catcher retains its complete guarded material construction');
assert.equal(supplemental.dataRouteIds.length,273);
assert.equal(supplemental.powerRouteIds.length,88);
assert.equal(supplemental.serviceRouteIds.length,48);
const firstCoordinate=supplemental.corridors[0].fromM[0];
supplemental.corridors[0].fromM[0]+=1;
assert.equal(retainedStarcatcherSupplementalInstallation(h,g).corridors[0].fromM[0],
 firstCoordinate,'A scene annotation cannot change the retained material construction');
const changedBox=structuredClone(g);changedBox.boxes[0].dimensionsM[0]+=.001;
assert.equal(retainedStarcatcherSupplementalInstallation(h,changedBox),null,
 'A changed physical equipment envelope rejects the retained support layout');
const changedConnector=structuredClone(g);
changedConnector.starcatcherSupportConnectorGeometry[0][1]+=.001;
assert.equal(retainedStarcatcherSupplementalInstallation(h,changedConnector),null,
 'A changed connector envelope rejects the retained support layout');
assert.equal(retainedStarcatcherSupplementalInstallation({...h,propulsion:{...h.propulsion,
 forwardDeckZ:h.propulsion.forwardDeckZ+.001}},g),null,
 'A changed real equipment bulkhead rejects the retained support layout');
assert(comb.active&&comb.ok);
assert.equal(comb.escapes.length,128,'Every physical payload feed retains its departure');
assert.equal(comb.pitchM,comb.underRack.pitchM,'Published lane pitch matches the actual nested departure');
assert.equal(comb.corridor.id,'under-rack-payload-plenum','Metadata identifies the installed plenum');
assert.deepEqual(comb.sourceColumns,[...new Set(comb.escapes.map(e=>e.anchor[2]))].sort((a,b)=>a-b));
const factory={root:new T.Group()},installation=createStarcatcherHarnessInstallation({factory,h,architecture:g});
factory.root.updateWorldMatrix(true,true);
const obstacles=installation.meshes.map(m=>obstacleFromMesh(m,
 {id:m.userData.installationHardwareId+':'+m.userData.materialPieceId,frame:factory.root}));
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
allocateStarcatcherPayloadDeparture(h,comb);
assert.equal(JSON.stringify(comb),retained,'Applying the mounted departure twice does not lengthen it');
const foreign=structuredClone(comb);
allocateStarcatcherPayloadDeparture({architectureFamilyId:'redwire-platform'},foreign);
assert.equal(JSON.stringify(foreign),retained,'Other reference families retain their own departure');

// A finite obstruction in an actual allocated path remains an obstruction.
const owned=routes.find(row=>row.id==='P-PAY-9/0');
const middle=owned.points[Math.floor(owned.points.length/2)];
const inserted={id:'blocked-mounted-route',type:'box',min:middle.map(v=>v-.02),max:middle.map(v=>v+.02)};
assert(!routeClearance(owned,[inserted]).ok,
 'A physical solid inserted into the mounted route is not exempted');

const parts=h.cableInstallationHardware.parts.filter(p=>p.id.startsWith('starcatcher:raceway:'));
assert.equal(parts.filter(p=>p.id.startsWith('starcatcher:raceway:payload-')).length,24,
 'Payload source ladder, fanout tray, three trunks and nineteen occupied bay risers');
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
assert.equal(installation.materialMeshCount,allocation.corridors.reduce((n,c)=>n+g.installationHardware.find(p=>p.id==='starcatcher:raceway:'+c.id).materialPieces.length,0));
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
for(const mesh of installation.meshes){
 const bounds=new T.Box3().setFromObject(mesh),
  minimum=bounds.min.toArray(),maximum=bounds.max.toArray();
 for(const [axis,dimension]of[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM].entries())
  assert(minimum[axis]>=-dimension/2+wall-1e-8&&
   maximum[axis]<=dimension/2-wall+1e-8,
   mesh.userData.installationHardwareId+' material remains inside the actual sandwich faces');
}
const roofCovered=allocation.corridors.find(c=>c.retentionBoundary==='inner-top-sandwich');
assert(roofCovered,'The guarded default has its real roof-covered shared data tray');
const displacedRoof=structuredClone(roofCovered);
displacedRoof.fromM[1]-=.020;displacedRoof.toM[1]-=.020;
assert.throws(()=>starcatcherHarnessInstallationHardware(h,g,[displacedRoof]),
 /actual inner roof/,'A missing front cap is valid only at the actual roof plane');
assert.throws(()=>starcatcherHarnessInstallationHardware(h,g,
 [{...roofCovered,normalBody:[0,-1,0]}]),/actual inner roof/,
 'The real roof must close the open side of the tray');
const pointOnMesh=(mesh,point)=>{
 mesh.geometry.computeBoundingBox();
 return mesh.geometry.boundingBox.distanceToPoint(mesh.worldToLocal(point.clone()))<1e-8;
};
const footSeparation=(mesh,anchor,normal)=>{
 const vertices=mesh.geometry.attributes.position;
 let minimum=Infinity;
 for(let i=0;i<vertices.count;i++)minimum=Math.min(minimum,
  new T.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld)
   .sub(anchor).dot(normal));
 return minimum;
};
for(const c of allocation.corridors){
 const length=Math.hypot(...c.toM.map((value,axis)=>value-c.fromM[axis]));
 assert(c.mounts.length>=(length>.25?2:1),
  'A short cuff has a real attachment; a long ladder has at least two');
 const meshes=installation.meshes.filter(m=>m.userData.installationHardwareId==='starcatcher:raceway:'+c.id);
 for(const [i,mount] of c.mounts.entries()){
  const anchor=new T.Vector3(...mount.attachmentPointM),
   normal=new T.Vector3(...mount.attachmentNormalBody).normalize();
  if(mount.attachmentPartId){
   const parentMeshes=installation.meshes.filter(m=>
    m.userData.installationHardwareId===mount.attachmentPartId&&
    !m.userData.materialPieceId.startsWith('mount-'));
   assert(parentMeshes.some(mesh=>pointOnMesh(mesh,anchor)),
    c.id+' mounting foot reaches actual shared tray material');
  }else{
   const planes=[
    {axis:0,coordinate:-h.bodyWidthM/2+wall+.0002,inward:1},
    {axis:0,coordinate:h.bodyWidthM/2-wall-.0002,inward:-1},
    {axis:1,coordinate:floor,inward:1},{axis:1,coordinate:ceiling,inward:-1},
    {axis:2,coordinate:-h.bodyLengthM/2+wall+.0002,inward:1},
    {axis:2,coordinate:h.bodyLengthM/2-wall-.0002,inward:-1},
    {axis:2,coordinate:h.propulsion.forwardDeckZ+.0085,inward:1}];
   assert(planes.some(p=>Math.abs(mount.attachmentPointM[p.axis]-p.coordinate)<1e-8&&
    Math.abs(mount.attachmentNormalBody[p.axis]-p.inward)<1e-8),
    c.id+' mounting foot has an actual sandwich or equipment-bulkhead datum');
  }
  assert(new T.Vector3(...mount.trayPointM).sub(anchor).dot(normal)>0,
   'The support extends into the free side of its attachment');
  const foot=meshes.find(m=>m.userData.materialPieceId==='mount-'+i+'-foot');
  assert(Math.abs(footSeparation(foot,anchor,normal))<1e-8,
   'The rendered foot reaches its structural attachment plane');
  const local=foot.position.clone(),lift=normal.clone().multiplyScalar(.05)
   .applyQuaternion(foot.parent.getWorldQuaternion(new T.Quaternion()).invert());
  foot.position.add(lift);factory.root.updateWorldMatrix(true,true);
  assert(Math.abs(footSeparation(foot,anchor,normal))>.001,
   'A displaced physical foot is not an attached installation');
  foot.position.copy(local);factory.root.updateWorldMatrix(true,true);
  const target=new T.Vector3(...mount.trayPointM);
  assert(meshes.some(m=>!/mount-/.test(m.userData.materialPieceId)&&
   pointOnMesh(m,target)),c.id+' stand ends on actual ladder material');
 }
}
// Identical physical construction may be reused, but the scene and mass
// ledger must never share mutable control points or material records.
const rebuild=()=>{
 const graph={...g,installationHardware:[]};
 const installation=declareStarcatcherHarnessInstallation(h,graph,{circuitExitPose:electricalCircuitExitPose,connectorTypes:connectorSelections});
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
const h64=sizeDesign({...buildReferenceDesign('star-catcher-self-powered'),trayCount:64}),g64=buildElectricalArchitecture(h64),a64=g64.starcatcherHarnessInstallation;
assert.equal(a64.payloadSupportConstruction,'allocated-material',
 'A changed physical inventory does not inherit the default support coordinates');
assert(a64.comb.ok&&a64.comb.issues.length===0,'The 64-tray reference has a valid installed departure');
assert.equal(a64.comb.escapes.length,64);
const ladder64=a64.corridors.find(c=>c.id==='payload-drop-ladder');
assert(ladder64.retentionAllocation.stations.length>0&&ladder64.retentionAllocation.stations.every(row=>row.ok),'The smaller source ladder retains clear physical bridges');
assert(ladder64.retentionAllocation.maximumUnsupportedSpanM<=.25+1e-9);
const factory64={root:new T.Group()},hardware64=createStarcatcherHarnessInstallation({factory:factory64,h:h64,architecture:g64});
factory64.root.updateWorldMatrix(true,true);
const routes64=a64.comb.escapes.map(e=>({id:e.id,points:e.points,radiusM:e.radiusM,clearanceM:.002,
 from:{position:e.anchor,normal:e.fromNormal},minBendRadiusM:e.bendRadiusM}));
const audit64=auditRoutes(routes64,hardware64.meshes.filter(m=>m.userData.installationHardwareId.endsWith(':payload-drop-ladder')).map(m=>obstacleFromMesh(m,{id:m.name,frame:factory64.root})),{maxIssues:8});
assert(audit64.ok,JSON.stringify(audit64.issues));
console.log('PASS Starcatcher mounted installation: all 128 complete full-radius payload paths, '+
 allocation.corridors.length+' common retained raceways, actual material clearance and attachments, '+
 'obstruction/lifted-foot negatives, and smaller-bank source retention.');
