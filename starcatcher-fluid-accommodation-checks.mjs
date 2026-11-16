// Bounded Loop 2 return accommodation beside the installed payload bank.
// Full-vehicle fluid and electrical planning remains a separate native check.
import assert from 'node:assert/strict';
import {canvas} from './render-test-canvas.mjs';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {buildElectricalArchitecture} from './dist/electrical-architecture.js';
import {makeCraft} from './dist/craft.js';
import {createStarcatcherHarnessInstallation} from './dist/starcatcher-harness-installation.js';
import {starcatcherLoopTwoReturnAccommodation} from './dist/starcatcher-harness-routing.js';
import {anchorInFrame,normalInFrame} from './dist/connection-geometry.js';
import {roundedConnectionRoute} from './dist/connection-routes.js';
import {obstacleFromMesh,routeFromTube,routeClearance,auditRoutes} from './dist/routing-audit.js';

globalThis.document={createElement:canvas};
const h=sizeDesign(buildReferenceDesign('star-catcher-self-powered')),g=buildElectricalArchitecture(h);
const craft=makeCraft(h,{installElectrical:false,planFluidRoutes:false});
const installation=createStarcatcherHarnessInstallation({factory:craft,h,architecture:g});
craft.root.updateWorldMatrix(true,true);
const supply=craft.routingFeedthroughs.find(p=>p.id==='coolant-2-return');
const retained=craft.routingFeedthroughs.find(p=>p.id==='coolant-2-supply');
const allocation=starcatcherLoopTwoReturnAccommodation(h,{bankIndex:1,side:-1});
assert(supply&&retained&&allocation);
assert(Math.abs(supply.center[0]+.34)<1e-10,'The real return fitting uses the outboard clear station');
assert(Math.abs(supply.center[2]-retained.center[2])<1e-10,
 'The return retains its bank station while moving clear of the left payload trunk');
assert.equal(supply.radiusM,.034,'The actual 68 mm circular aperture is retained');
const floor=craft.routingWalls.find(w=>w.axis===1&&w.sign<0);
const hole=floor.holes.find(hole=>hole.id===supply.id);
assert(hole&&Math.abs(hole.u-supply.center[0])<1e-9&&Math.abs(hole.v-supply.center[2])<1e-9,
 'The pierced floor uses the exact translated fitting datum');
assert(supply.wallMeshes.length>=3,'Core and both real floor face sheets are perforated');
const walls=supply.wallMeshes.map(mesh=>obstacleFromMesh(mesh));
const sleeve=supply.meshes.map(mesh=>obstacleFromMesh(mesh));
const supports=installation.meshes.map(mesh=>obstacleFromMesh(mesh));
const payload=g.starcatcherHarnessInstallation.payloadRouting.rows;
assert.equal(payload.length,128);
assert(g.starcatcherHarnessInstallation.supportValidation.ok,
 'The support allocation includes the actual new floor opening');

const names=['Loop 2 return supported internal pipe','Loop 2 return bulkhead passage',
 'Loop 2 return fixed union feed','Heat-lift cold return to evaporator',
 'Heat-lift cold supply from evaporator'];
const rows=[];
for(const name of names){
 const c=craft.fluidConnections.find(c=>c.id===name);assert(c,name);
 const a=anchorInFrame(c.a,c.parent),b=anchorInFrame(c.b,c.parent);
 const controls=[a,...c.via(a,b),b].map(p=>p.toArray());
 const shape=roundedConnectionRoute(controls,c.bendRadiusM);
 assert(!shape.bendLimited,name+' retains its full bend radius');
 const route=routeFromTube(c.tube,{id:name,frame:craft.root,radiusM:c.radiusM,clearanceM:.001,
  from:{position:a.toArray(),normal:normalInFrame(c.a,c.parent).toArray()},
  to:{position:b.toArray(),normal:normalInFrame(c.b,c.parent).toArray()}});
 // A straight bore has no allocated elbow; zero is not a bend requirement.
 if(c.bendRadiusM===0)delete route.minBendRadiusM;
 const endpointAudit=auditRoutes([route],[],{maxIssues:1});
 assert(endpointAudit.ok,JSON.stringify({name,issues:endpointAudit.issues}));
 const result=routeClearance(route,[...walls,...sleeve,...supports],{otherRoutes:payload});
 assert(result.ok,JSON.stringify({name,...result}));rows.push({c,route,shape});
}
const passage=rows[1].route;
assert(routeClearance(passage,[...walls,...sleeve]).ok,'Actual rendered bore stays open through every layer');
const blocked={...passage,points:passage.points.map(p=>[p[0]+.08,p[1],p[2]])};
assert(!routeClearance(blocked,walls).ok,'A pipe shifted outside the actual aperture hits real floor material');
const internal=rows[0],oldB=internal.route.to.position.map((v,k)=>v-allocation.stationOffsetM[k]);
const oldControls=starcatcherLoopTwoReturnAccommodation(h,{bankIndex:1,side:-1,
 a:internal.route.from.position,b:oldB}).controlPoints;
const oldShape=roundedConnectionRoute(oldControls,.108);
assert(!routeClearance({...internal.route,points:oldShape.points},[],{otherRoutes:payload}).ok,
 'The former floor station still collides with the installed payload bank');
assert.equal(starcatcherLoopTwoReturnAccommodation(h,{bankIndex:1,side:1}),null);
assert.equal(starcatcherLoopTwoReturnAccommodation(h,{bankIndex:0,side:1}),null);
assert.equal(starcatcherLoopTwoReturnAccommodation({...h,architectureFamilyId:'redwire-platform'},
 {bankIndex:1,side:1}),null,'Other reference families retain their own fluid stations');
console.log('PASS Starcatcher Loop 2 return: actual relocated floor aperture and sleeve, '+
 'three connected hot return sections, both cold evaporator links, full 108 mm bends, '+
 'all 128 payload paths and '+
 'installed support clearance, and blocked-aperture/former-station negatives.');
