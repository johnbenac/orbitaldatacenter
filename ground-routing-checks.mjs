import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import * as T from './dist/vendor/three.module.js';
import {canvas} from './render-test-canvas.mjs';
import {createFacilityEquipment} from './dist/facility-geometry.js';
import {createVerificationSetting} from './dist/part-verification-scenes.js';
import {testFacilityAssets} from './dist/test-facilities.js';
import {groundConnectionRecords} from './dist/ground-connection-routing.js';
import {auditRoutes,obstacleFromMesh} from './dist/routing-audit.js';
import {makeLaunch} from './dist/launch-scene.js';
import {sizeDesign,missionStarter} from './dist/design.js';
import {groundProcessingState} from './dist/ground-processing.js';
import {bayStationFor} from './dist/bay-lessons.js';

globalThis.document={createElement:()=>canvas()};
const V=(...p)=>new T.Vector3(...p),failures=[],seenRoutes=new Set(),report={ok:false,scenarios:0,routeInstances:0,uniqueRouteIds:0,solidChecks:0,lineChecks:0,minimumClearanceM:Infinity,facilityAssets:[],connectedFacilityAssets:[],fixtureCases:0,bayDomainCases:0,continuousProofs:[],negativeRegressions:[],blockedPickupDesigns:[],scope:'Actual rendered tube buffers, full-radius intersections, real connector bores and chamber openings; preliminary geometric accommodation, not supplier bend-life or physical qualification.'};
const roomWalls=new Set(['Front wall','Rear wall','West wall','East wall','High-bay roof']);
function physicalMeshes(roots,{ignore=new Set()}={}){
 const result=[],seen=new Set();for(const root of roots){root.updateMatrixWorld(true);root.traverse(node=>{
  if(!node.isMesh||seen.has(node.uuid)||node.userData.groundConnection)return;
  for(let p=node;p;p=p.parent){if(ignore.has(p)||p.userData.engineeringGraphic||p.userData.processingCue)return;if(!p.visible&&!p.userData.inspectionWall&&!roomWalls.has(p.name))return;if(p===root.parent)break;}
  seen.add(node.uuid);result.push(node);
 });}return result;
}
function physicalObstacles(roots,options){return physicalMeshes(roots,options).map(node=>obstacleFromMesh(node,{id:node.name+':'+node.uuid}));}
function check(id,routes,obstacles,issues=[]){
 const result=auditRoutes(routes,obstacles,{maxIssues:8});report.scenarios++;report.routeInstances+=routes.length;report.solidChecks+=result.counts.solidPairs;report.lineChecks+=result.counts.linePairs;report.minimumClearanceM=Math.min(report.minimumClearanceM,result.minimumClearanceM);for(const r of routes)seenRoutes.add(r.id);
 if(!result.ok||issues.length)failures.push({scenario:id,issues:[...issues,...result.issues],issueCount:issues.length+result.issueCount});return result;
}
function articleObstacle(setting,size,ports,routes){
 const min=setting.placement.clone().add(V(-size[0]/2,0,-size[2]/2)),max=setting.placement.clone().add(V(size[0]/2,size[1],size[2]/2)),apertures=[];
 for(const port of ports){const p=port.position.clone().add(setting.placement),ids=routes.filter(r=>[r.from?.position,r.to?.position].some(q=>q&&p.distanceTo(V(...q))<2e-5)).map(r=>r.id);if(!ids.length)continue;const radius=Math.max(...routes.filter(r=>ids.includes(r.id)).map(r=>r.radiusM))+.003,b=new T.Box3().setFromPoints([p.clone().addScaledVector(port.normal,-.025),p.clone().addScaledVector(port.normal,.08)]).expandByScalar(radius);apertures.push({id:port.id,min:b.min.toArray(),max:b.max.toArray(),routeIds:ids});}
 return {id:'selected-article-envelope',type:'box',min:min.toArray(),max:max.toArray(),apertures};
}
function proveFixtureMotion(setting,label){
 setting.update(0);setting.root.updateMatrixWorld(true);const motions=[];setting.root.traverse(n=>{if(n.userData.routingMotion)motions.push(n);});
 for(const group of motions){const m=group.userData.routingMotion,axis=m.axis,localRoutes=groundConnectionRecords(group),staticObstacles=physicalObstacles([setting.root],{ignore:new Set([group])});
  assert.equal(m.kind,'sinusoidal-rigid-translation');assert(Number.isFinite(m.amplitudeM)&&m.amplitudeM>=0);
  if(localRoutes.length){
   // The rope, exit guide and hook are one rigid translating assembly. Their
   // relative geometry is checked at zero; its whole sinusoidal range lies in
   // this swept AABB. No time sampling can miss an intermediate collision.
   for(const route of localRoutes){const swept=new T.Box3().setFromPoints(route.points.map(p=>V(...p))).expandByScalar(route.radiusM);swept.min[axis]-=m.amplitudeM;swept.max[axis]+=m.amplitudeM;for(const o of staticObstacles){const b=new T.Box3(V(...o.bounds.min),V(...o.bounds.max));if(swept.intersectsBox(b))failures.push({scenario:label,issues:[{code:'unresolved-rigid-sweep',routeId:route.id,obstacleId:o.id}]});}}
   report.continuousProofs.push({scenario:label,kind:'rigid rope swept enclosure',axis,amplitudeM:m.amplitudeM});
  }else{
   // Crosshead, actuator and load cell translate together; replacing their
   // full travel by one larger solid is a conservative collision test.
   const swept=new T.Box3().setFromObject(group);swept.min[axis]-=m.amplitudeM;swept.max[axis]+=m.amplitudeM;const routes=groundConnectionRecords(setting.root),result=check(label+':full-crosshead-stroke',routes,[{id:'crosshead-complete-motion-envelope',type:'box',min:swept.min.toArray(),max:swept.max.toArray()}]);if(result.ok)report.continuousProofs.push({scenario:label,kind:'moving obstruction swept enclosure',axis,amplitudeM:m.amplitudeM});
  }
 }
}

// Inventory every dimensioned catalog asset. Unrouted measuring fixtures are
// recorded too; missing cables in a previously routed facility cannot vanish.
let piercedFixture=null;
for(const asset of testFacilityAssets.filter(a=>a.geometry)){
 const equipment=createFacilityEquipment(asset,{software:true,includeReference:false}),routes=groundConnectionRecords(equipment.root);report.facilityAssets.push({id:asset.id,routes:routes.length});
 if(equipment.servicePorts.length){assert.equal(routes.length,equipment.servicePorts.length+(routes.some(r=>r.id.endsWith(':vacuum'))?1:0),asset.id+' circuit inventory');check('facility:'+asset.id,routes,physicalObstacles([equipment.root]));}
 if(!piercedFixture&&equipment.servicePorts.length){const port=equipment.servicePorts[0],r=routes.find(r=>r.id===port.id+':external');piercedFixture={port,r};}
 equipment.dispose();
}
assert(report.facilityAssets.filter(a=>a.routes).length>=18,'Routed facility inventory shrank');

// A representative article has four independent, physically separated ports.
// All 18 chamber implementations must route them through actual wall bores.
const articleSize=[.4,.25,.3],articlePorts=[{id:'power',kind:'power',position:V(.2,.18,-.05),normal:V(1,0,0),diameterM:.02},{id:'data',kind:'data',position:V(.2,.11,.04),normal:V(1,0,0),diameterM:.02},{id:'supply',kind:'fluid',position:V(.2,.05,-.06),normal:V(1,0,0),diameterM:.02},{id:'return',kind:'fluid',position:V(.2,.05,.06),normal:V(1,0,0),diameterM:.02}];
for(const inventory of report.facilityAssets.filter(a=>a.routes)){
 const asset=testFacilityAssets.find(a=>a.id===inventory.id),s=createVerificationSetting({kind:asset.kind,facilityAsset:asset,size:articleSize,articlePorts,software:true,scaleMode:'none'}),routes=groundConnectionRecords(s.root),allocated=s.root.userData.articleServiceAllocation;
 assert.equal(allocated?.connectedPortIds.length,4,asset.id+' missing article service');assert.equal(routes.filter(r=>!r.id.endsWith(':vacuum')).length,4,asset.id+' fragmented article circuit');check('connected-facility:'+asset.id,routes,[...physicalObstacles([s.root]),articleObstacle(s,articleSize,articlePorts,routes)],s.routingIssues);report.connectedFacilityAssets.push({id:asset.id,routes:routes.length});if(piercedFixture?.port.id.startsWith(asset.id+':'))piercedFixture.connectedRoute=routes.find(r=>r.id===piercedFixture.port.id);s.dispose();
}

const sizes=[[.005,.003,.004],[.08,.045,.03],[.4,.25,.3],[1.8,1.4,1.1],[12,3,6],[150,12,20],[6,100,6],[100,.02,3],[2,.001,2]];
for(const kind of ['load-frame','pressure-bench','electrical-bench','propulsion-stand','deployment'])for(const size of sizes){
 const s=createVerificationSetting({kind,size,software:true,scaleMode:'none'}),label='fixture:'+kind+':'+size.join('x');report.fixtureCases++;for(const t of [0,.25,.75]){s.update(t);const routes=groundConnectionRecords(s.root);check(label+':'+t,routes,[...physicalObstacles([s.root]),articleObstacle(s,size,[],routes)],s.routingIssues);}proveFixtureMotion(s,label);s.dispose();
}
for(const kind of ['electrical-bench','pressure-bench']){
 const s=createVerificationSetting({kind,size:articleSize,articlePorts,software:true,scaleMode:'none'}),routes=groundConnectionRecords(s.root);check('connected-fixture:'+kind,routes,[...physicalObstacles([s.root]),articleObstacle(s,articleSize,articlePorts,routes)],s.routingIssues);s.dispose();
}
report.connectorFaceCases=0;
for(const [face,position,normal] of [['right',[.2,.12,0],[1,0,0]],['left',[-.2,.12,0],[-1,0,0]],['front',[0,.12,.15],[0,0,1]],['rear',[0,.12,-.15],[0,0,-1]],['top',[0,.25,0],[0,1,0]]])for(const kind of ['electrical-bench','pressure-bench']){
 const ports=[{id:face,kind:kind==='pressure-bench'?'fluid':'power',position:V(...position),normal:V(...normal),diameterM:.02}],s=createVerificationSetting({kind,size:articleSize,articlePorts:ports,software:true,scaleMode:'none'}),routes=groundConnectionRecords(s.root);assert.equal(routes.length,2,'Missing service at '+kind+' '+face);check('connector-face:'+kind+':'+face,routes,[...physicalObstacles([s.root]),articleObstacle(s,articleSize,ports,routes)],s.routingIssues);report.connectorFaceCases++;s.dispose();
}

const domains=['conops','purpose','environment','orbit','compute','data','comm','power','thermal','attitude','prop','mass','launch','launcher','mechanical','avionics','software'];
for(const purpose of ['text','pretrain']){
 const h=sizeDesign(missionStarter(purpose)),launch=makeLaunch(h,()=>{},{environment:false}),done=new Set();
 const run=(domain,time=-3599,commBench='sband')=>launch.update({flightPhase:'integration',t:time,altitudeKm:0},'integration',{phase:'D',domain,commBench});
 for(const domain of domains){run(domain);report.bayDomainCases++;assert.equal(launch.bay.station.userData.stationId,bayStationFor(domain));const station=launch.bay.station.children.find(n=>n.visible);assert(station);if(done.has(bayStationFor(domain)))continue;done.add(bayStationFor(domain));const routes=groundConnectionRecords(station);check('bay:'+purpose+':'+domain,routes,physicalObstacles([launch.parts.facility,launch.parts.payload,launch.parts.fitting]));}
 for(const mode of ['sband','ka','optical','propellant']){
  launch.bay.setProcessingState(mode==='propellant'?groundProcessingState(h,'propellant',0):null);run(mode==='propellant'?'prop':'comm',-3599,mode);const station=launch.bay.station.children.find(n=>n.visible),routes=groundConnectionRecords(station);assert.equal(routes.length,mode==='propellant'?6:1,mode+' route inventory');check('bay:'+purpose+':'+mode,routes,physicalObstacles([launch.parts.facility,launch.parts.payload,launch.parts.fitting]));
 }
 launch.bay.setProcessingState(null);run('thermal',-3000);const parked=groundConnectionRecords(launch.bay.station);run('thermal',-2600);const pickup=groundConnectionRecords(launch.bay.station),moved=launch.parts.payload.position.distanceTo(V())>1e-7;
 check('bay:'+purpose+':pickup',pickup,physicalObstacles([launch.parts.facility,launch.parts.payload,launch.parts.fitting]));
 const jumpers=[];launch.bay.station.traverseVisible(n=>{if(n.name==='Stand-to-spacecraft jumper')jumpers.push(n);});
 if(h.payloadInterface.passes&&h.fairing.fit)assert.equal(jumpers.length,0,purpose+' flight jumper retained during pickup');else report.blockedPickupDesigns.push({purpose,reason:'Integration controller holds the article while interface/fairing feasibility is blocked; no fictitious pickup proof.'});
 // Every retained cart/floor route is rigid and unchanged at the disconnect.
 for(const route of pickup){const before=parked.find(p=>p.id===route.id);if(before)assert.deepEqual(route.points,before.points,'Stationary ground circuit moved at pickup: '+route.id);}
 report.continuousProofs.push({scenario:'bay:'+purpose,kind:'stationary circuits; explicit flight-jumper removal at pickup event'});
 const gs=new Set(),ms=new Set();launch.root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);});for(const g of gs)g.dispose();for(const m of ms)m.dispose();
}

// Negative regressions use the same actual tube buffers and obstacle engine.
assert(piercedFixture?.r);const base=piercedFixture.r,endpoint={...base,to:{position:base.to.position.map((x,i)=>x+(i===0?.08:0))}};assert(auditRoutes([endpoint],[]).issues.some(i=>i.code==='connector-gap'));report.negativeRegressions.push('Moved physical connector detaches route');
const center=base.points[Math.floor(base.points.length/2)],wall={id:'inserted-solid-wall',type:'box',min:center.map(x=>x-.04),max:center.map(x=>x+.04)};assert(!auditRoutes([base],[wall]).ok);report.negativeRegressions.push('Inserted wall intersects actual finite-radius tube');
assert(piercedFixture.connectedRoute);const closedBore=V(...piercedFixture.port.outside.toArray()).addScaledVector(piercedFixture.port.normal,-.10),plug={id:'closed-chamber-feedthrough',type:'box',min:closedBore.toArray().map(x=>x-.04),max:closedBore.toArray().map(x=>x+.04)};assert(auditRoutes([piercedFixture.connectedRoute],[plug]).issues.some(i=>i.code==='solid-collision'));report.negativeRegressions.push('Closing an actual chamber bore blocks its connected circuit');
const crossing={...base,id:'different-circuit',points:base.points.map(p=>[...p])};assert(auditRoutes([base,crossing],[]).issues.some(i=>i.code==='line-collision'));report.negativeRegressions.push('Independent overlapping circuit fails');
report.uniqueRouteIds=seenRoutes.size;report.ok=failures.length===0;report.failures=failures;report.minimumClearanceM=Number.isFinite(report.minimumClearanceM)?report.minimumClearanceM:null;
const outputArg=process.argv.indexOf('--output');if(outputArg>=0){assert(process.argv[outputArg+1],'--output needs a file');await writeFile(process.argv[outputArg+1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({...report,facilityAssets:report.facilityAssets.length,connectedFacilityAssets:report.connectedFacilityAssets.length,continuousProofs:report.continuousProofs.length},null,2));if(!report.ok)process.exitCode=1;
