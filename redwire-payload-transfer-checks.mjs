import assert from 'node:assert/strict';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {buildElectricalArchitecture,connectorSelections,validateElectricalArchitecture,reconcileInstalledElectricalRouting,resolveElectricalRoutes} from './dist/electrical-architecture.js';
import {redwirePayloadTransferPolicy as policy,redwirePayloadTransferAllocation} from './dist/redwire-payload-transfer.js';
import {redwirePlatformHarnessLocalRoute} from './dist/redwire-harness-installation.js';
import {roundedConnectionRoute,routeLength} from './dist/connection-routes.js';
import {segmentSegmentDistance} from './dist/routing-audit.js';

const close=(a,b,label,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${label}: ${a} vs ${b}`);
const h=sizeDesign(buildReferenceDesign('redwire-8kw')),graph=buildElectricalArchitecture(h),transfer=graph.rotaryTransferAccounting;
assert.deepEqual(validateElectricalArchitecture(graph),[]);
assert.deepEqual(graph.checks.filter(c=>!c.within).map(c=>c.id),[]);
assert.equal(transfer.powerCircuits.length,4);
assert.equal(transfer.opticalLinks.length,4);
assert.equal(graph.totalHarnessAssemblies,54);
assert.equal(graph.totalPhysicalCableSections,62);
assert.equal(transfer.powerPasses,32);
assert.equal(transfer.opticalChannels,8);
assert.equal(transfer.allocatedCurrentPerBranchA,60);
assert.equal(transfer.workerOpticsCount,8);
close(transfer.workerOpticsPowerW,28,'Named LR4 module power');
close(transfer.workerOpticsMassKg,.4,'Named LR4 module mass');
const harness=id=>graph.harnesses.find(a=>a.id===id);

// Every original worker remains connected through two physical cable
// assemblies and an explicitly mapped functional component. Only one section
// receives the rotary contact resistance in the independent I²R summation.
for(const circuit of transfer.powerCircuits){
 const up=harness(circuit.upstreamHarnessId),down=harness(circuit.downstreamHarnessId);
 assert.equal(up.fromBoxId,'pcdu');assert.equal(up.toBoxId,policy.statorBoxId);
 assert.equal(down.fromBoxId,policy.rotorBoxId);assert.equal(down.toBoxId,circuit.loadBoxId);
 assert.equal(up.quantity,down.quantity);
 close(circuit.contactLoopResistanceOhm,.002,'Contact-only rotary loop');
 close(circuit.internalLeadLoopResistanceOhm,2*2.10e-8*1.90/(50e-6),'Declared internal lead resistance');
 close(up.additionalRotaryResistanceOhm,.003596,'Complete rotary loop');
 assert.equal(down.additionalRotaryResistanceOhm,undefined);
 close(circuit.voltageDropV,up.voltageDropV+down.voltageDropV,'Shared complete-circuit drop');
 close(circuit.rotaryLossW,up.currentA**2*.003596,'Complete rotary transfer loss charged once');
 assert.ok(circuit.currentWithin&&circuit.voltageDropWithin);
 assert.equal(up.dynamicAllowanceM,0);assert.equal(down.dynamicAllowanceM,0);
 assert.equal(graph.boxById[down.fromBoxId].frame,'payload');assert.equal(graph.boxById[down.toBoxId].frame,'payload');
}
const powerPaths=transfer.internalChannelMapping.filter(c=>c.kind==='power').flatMap(c=>c.powerContactIds);
assert.equal(powerPaths.length,32);assert.equal(new Set(powerPaths).size,32);
const opticalChannels=transfer.internalChannelMapping.filter(c=>c.kind==='data').map(c=>c.channel);
assert.deepEqual(opticalChannels,[1,2,3,4,5,6,7,8]);
for(const link of transfer.opticalLinks){
 const up=harness(link.upstreamHarnessId),down=harness(link.downstreamHarnessId);
 assert.equal(up.toBoxId,policy.statorBoxId);assert.equal(down.fromBoxId,policy.rotorBoxId);assert.equal(down.toBoxId,link.loadBoxId);
 for(const a of[up,down]){
  assert.equal(a.connectorTypeId,'lc-sm-100g-lr4');assert.equal(a.wire.fiberCount,2);assert.equal(a.wire.activeFibers,2);
  assert.equal(a.wire.ferrulePolish,'UPC');assert.equal(a.cableDiameterM,.004);assert.equal(a.bendRadiusM,.06);
  assert.equal(a.physicalLineRateMbps,100000);assert.ok(a.rateMbps<=a.physicalLineRateMbps);
 }
 assert.equal(link.matingPairs,4);close(link.linkBudgetDb,6.3,'LR4 complete-channel budget');
 close(link.totalLossDb,3+4*.35+.5+(up.cutLengthM+down.cutLengthM)*.4/1000,'Both sections in optical budget');
 assert.ok(link.marginDb>1.3&&link.lineRateWithin);
}

// This bounded check inspects the shared planar construction, not the full
// installed obstacle scene. Every carried branch retains its actual endpoints
// and bend radius, and the eight flat paths remain separated from each other.
const routes=graph.harnesses.filter(a=>a.payloadTransferSegment==='platform').map(a=>{
 const controls=redwirePlatformHarnessLocalRoute(graph,a,connectorSelections[a.connectorTypeId].lengthM),route=roundedConnectionRoute(controls,a.bendRadiusM);
 assert.ok(!route.bendLimited);close(route.minimumBendRadiusM,a.bendRadiusM,a.id+' bend');
 for(const point of route.points)close(point[1],.1056,a.id+' connector/raceway plane');
 assert.deepEqual(route.points[0],controls[0]);assert.deepEqual(route.points.at(-1),controls.at(-1));
 assert.deepEqual(a.nominalLocalRoutePointsM,route.points);
 return {a,points:route.points};
});
let minimumSurfaceGapM=Infinity;
for(let i=0;i<routes.length;i++)for(let j=i+1;j<routes.length;j++){
 const a=routes[i],b=routes[j];
 for(let m=1;m<a.points.length;m++)for(let n=1;n<b.points.length;n++)minimumSurfaceGapM=Math.min(minimumSurfaceGapM,segmentSegmentDistance(a.points[m-1],a.points[m],b.points[n-1],b.points[n]).distanceM-(a.a.cableDiameterM+b.a.cableDiameterM)/2);
}
assert.ok(minimumSurfaceGapM>.003,`Planar branch clearance ${minimumSurfaceGapM}`);
for(const deployment of[0,.5,1])for(const a of resolveElectricalRoutes(h,{graph,deployment}).filter(a=>a.payloadTransferSegment==='platform')){
 close(routeLength(a.pointsM),routeLength(a.nominalLocalRoutePointsM),a.id+' rigid carried length');
 for(let axis=0;axis<3;axis++){close(a.pointsM[0][axis],a.from.cableExitM[axis],a.id+' source pose');close(a.pointsM.at(-1)[axis],a.to.cableExitM[axis],a.id+' destination pose');}
}
const missingChannel=structuredClone(graph);missingChannel.rotaryTransferAccounting.internalChannelMapping.pop();
assert.ok(validateElectricalArchitecture(missingChannel).some(e=>e.path==='rotaryTransferAccounting.internalChannelMapping'),'A missing internal fiber cannot disappear behind valid external cable endpoints');

// Actual-cut reconciliation must recompute the complete optical budget and
// the shared voltage-drop criterion, not leave an optimistic nominal value.
// These are synthetic perturbation inputs only, never saved as a takeoff.
const copy=structuredClone(graph),records=copy.harnesses.flatMap(a=>Array.from({length:a.quantity*(a.connectorTypeId.startsWith('hv-single')?2:1)},(_,i)=>({id:a.id+'/'+i,harnessId:a.id,lengthM:a.routeLengthM,minimumBendRadiusM:a.bendRadiusM,planningPassed:true})));
reconcileInstalledElectricalRouting(copy,records,{source:{kind:'test-synthetic-route-basis'}});
const before=copy.rotaryTransferAccounting.opticalLinks[0].marginDb;
const extended=records.map(r=>({...r,lengthM:r.lengthM+(r.harnessId==='D-WORKER-1-PLATFORM'?10:r.harnessId==='P-PAY-1-PLATFORM'?100:0)}));
reconcileInstalledElectricalRouting(copy,extended,{source:{kind:'test-synthetic-route-perturbation'}});
close(before-copy.rotaryTransferAccounting.opticalLinks[0].marginDb,.004,'Additional fiber changes complete-link margin');
assert.equal(copy.rotaryTransferAccounting.powerCircuits[0].voltageDropWithin,false);
assert.equal(copy.checks.find(c=>c.id==='P-PAY-1:end-to-end-drop').within,false);
const overload=redwirePayloadTransferAllocation({trayCount:4,feedsPerTray:1,branchCurrentA:61,endpointPortGbps:200});
assert.equal(overload.currentWithin,false);assert.equal(overload.lineRateWithin,false);

console.log(JSON.stringify({status:'passed',powerCircuits:4,workerLinks:4,powerPasses:32,opticalChannels:8,physicalHarnessAssemblies:54,physicalCuts:62,minimumPlanarCableSurfaceGapM:minimumSurfaceGapM,opticalMarginDb:transfer.opticalMarginDb,rotaryLossW:transfer.rotaryLossW}));
