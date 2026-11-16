import assert from 'node:assert/strict';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {buildElectricalArchitecture} from './dist/electrical-architecture.js';
import {matchStarcatcherConstruction} from './dist/starcatcher-construction-cache.js';
import {measureStarcatcherSupportCoverage} from './dist/starcatcher-support-coverage.js';
import {starcatcherInstallationMaterialOverlaps,
 inspectStarcatcherInstallationMaterial} from './dist/starcatcher-harness-routing.js';
import {inspectStarcatcherSupportConnectivity} from './dist/starcatcher-support-connectivity.js';

const h=sizeDesign(buildReferenceDesign('star-catcher-self-powered')),
 graph=buildElectricalArchitecture(h),asset=matchStarcatcherConstruction(h,graph);
assert(asset,'Coverage uses the complete matching native construction');
assert.equal(asset.electrical.length,537);
const corridors=graph.starcatcherHarnessInstallation.corridors;
const report=measureStarcatcherSupportCoverage(asset.electrical,corridors);
assert(report.ok,JSON.stringify({retention:report.retention.issues,
 routes:report.issues.map(({id,lengthM,fromM,toM})=>({id,lengthM,fromM,toM}))}));
assert.equal(report.physicalCuts,537);
assert.deepEqual(starcatcherInstallationMaterialOverlaps(h,graph,corridors),[],
 'Distinct shared supports do not occupy the same material volume');
const connectivity=inspectStarcatcherSupportConnectivity(h,graph,corridors);
assert(connectivity.ok,JSON.stringify({attachmentIssues:connectivity.attachmentIssues,
 disconnected:connectivity.disconnected}));
const material=inspectStarcatcherInstallationMaterial(h,graph,corridors,
 {routes:asset.electrical.map(row=>({...row,clearanceM:.002}))});
assert(material.routes.ok,JSON.stringify(material.routes.issues));

// Labels cannot conceal removal of the actual long supporting material.
const allIds=asset.electrical.map(row=>row.id);
const missingRoof=corridors.filter(c=>c.id!=='data-roof-fanout')
 .map(c=>({...c,routeIds:allIds}));
assert(measureStarcatcherSupportCoverage(asset.electrical,missingRoof).issues
 .some(row=>/^D-/.test(row.id)),'Missing roof support exposes real long data spans');
const missingRf=corridors.filter(c=>!c.id.startsWith('rf-'))
 .map(c=>({...c,routeIds:allIds}));
assert(measureStarcatcherSupportCoverage(asset.electrical,missingRf).issues
 .some(row=>/^RF-/.test(row.id)),'Missing RF ladders exposes real long service spans');

const section={id:'finite-fixture',fromM:[0,0,0],toM:[0,0,1],
 normalBody:[0,1,0],widthM:.100,depthM:.100,
 retainerStationsM:[.25,.50,.75]};
const centerline={id:'radius-fixture',radiusM:.002,points:[[.063,0,0],[.063,0,1]]};
assert(measureStarcatcherSupportCoverage([centerline],[section]).ok);
assert(!measureStarcatcherSupportCoverage([{...centerline,
 points:[[.065,0,0],[.065,0,1]]}],[section]).ok,
 'A centerline inside the keeper is insufficient when the full cable radius does not fit');
const missingKeepers=structuredClone(corridors),
 batteryWall=missingKeepers.find(c=>c.id==='power-port-battery-wall');
batteryWall.retainerStationsM=batteryWall.retainerStationsM.filter(station=>station<=4.4);
const unretained=measureStarcatcherSupportCoverage(asset.electrical,missingKeepers);
assert(!unretained.ok&&unretained.retention.issues.some(issue=>
 issue.corridorId===batteryWall.id&&issue.code==='keeper-gap-exceeds-allocation'));
assert(unretained.coveredLengthM<report.coveredLengthM,
 'A missing keeper run cannot contribute the unchanged full corridor as retained volume');
console.log('PASS Star Catcher finite support coverage:537 full curves, '+
 corridors.length+' physical sections, complete radius, absent-support negatives and material joints');
