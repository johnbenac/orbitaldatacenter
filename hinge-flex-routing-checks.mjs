import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import * as T from './dist/vendor/three.module.js';
import {canvas} from './render-test-canvas.mjs';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {makeCraft} from './dist/craft.js';
import {deploymentLayout,deploymentSchedule} from './dist/deployment.js';
import {connectionAnchor,connectionTube} from './dist/connection-geometry.js';
import {physicalFlightMeshes} from './dist/installed-electrical-routing.js';
import {obstacleFromMesh,routeFromTube,auditRoutes,routeClearance} from './dist/routing-audit.js';
import {planarHingeFlex,redwireHingeFlexAllocation} from './dist/hinge-flex-routing.js';

globalThis.document={createElement:()=>canvas()};
const h=sizeDesign(buildReferenceDesign('redwire-8kw')),craft=makeCraft(h,{installElectrical:false,planFluidRoutes:false}),layout=deploymentLayout(h),hinge=layout.banks[0].root,platform=craft.payloadRack.parent,material=new T.MeshBasicMaterial({color:0xcc9955});
const radiusM=.0093,stations=Array.from({length:25},(_,i)=>-.55+i*.045),allocations=stations.map(stationM=>redwireHingeFlexAllocation(layout,{stationM})),solids=physicalFlightMeshes(craft.root),movingSolids=new Set(solids.filter(m=>{for(let p=m;p;p=p.parent)if(p===platform)return true;return false;}));
const lines=allocations.map((allocation,i)=>({allocation,from:connectionAnchor(craft.root,allocation.fixedClamp,allocation.fixedTangent,'Fixed hinge clamp '+i),to:connectionAnchor(craft.payloadRack,allocation.movingClampLocal,[0,1,0],'Moving hinge clamp '+i),tube:connectionTube(craft.root,{radius:radiusM,material,bendRadiusM:allocation.bendRadiusM,segments:192,name:'Planar hinge lane '+i})}));
const report={ok:false,routeLanes:lines.length,physicalSolids:solids.length,movingSolids:movingSolids.size,sampledPoses:0,certifiedIntervals:[],minimumClearanceM:Infinity,minimumCertificateMarginM:Infinity,maximumLengthErrorM:0,maximumRenderedChordDeficitM:0,maximumSagittaM:0,maximumCentrelineMismatchM:0,negativeRegressions:[],laneSeparationProof:{pitchM:.045,diameterM:radiusM*2,roundingAllowanceM:4e-6,clearanceLowerBoundM:.045-radiusM*2-4e-6},scope:'Actual Redwire platform motion with 25 separate power-size flex lanes and all physical craft solids; endpoint/static fan-out circuits are checked separately by installed-routing CI. Exact C1 circular geometry and fixed developed length are preliminary accommodation, not cable fatigue qualification.'};
const V=p=>new T.Vector3(...p),distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i])),bounds=points=>({min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))}),boxDistance=(a,b)=>Math.hypot(...[0,1,2].map(k=>Math.max(a.min[k]-b.max[k],b.min[k]-a.max[k],0)));
const snapshots=new Map(),fixedMatrices=new Map(),fixedObstacles=new Map();
function productionProgress(theta){const target=1-theta/(Math.PI/2);let lo=.06,hi=.38;for(let k=0;k<52;k++){const m=(lo+hi)/2;if(deploymentSchedule(m,'redwire-platform').upperRoot<target)lo=m;else hi=m;}return (lo+hi)/2;}
function sample(theta){
 const key=theta.toFixed(13);if(snapshots.has(key))return snapshots.get(key);
 craft.positionPanels(productionProgress(theta));craft.root.updateMatrixWorld(true);
 const q=craft.payloadRack.getWorldQuaternion(new T.Quaternion()),tangent=V([0,-1,0]).applyQuaternion(q).toArray(),actualTheta=Math.atan2(-tangent[2],-tangent[1]);assert(Math.abs(actualTheta-theta)<1e-9,'Production hinge angle mapping');
 const obstacles=solids.map(mesh=>{if(!movingSolids.has(mesh)){const current=mesh.matrixWorld.elements;if(fixedMatrices.has(mesh))assert(current.every((v,i)=>Math.abs(v-fixedMatrices.get(mesh)[i])<1e-10),'Unaccounted motion of '+mesh.name);else fixedMatrices.set(mesh,[...current]);if(fixedObstacles.has(mesh))return fixedObstacles.get(mesh);}const obstacle=obstacleFromMesh(mesh,{id:mesh.uuid});const corners=[0,1].flatMap(x=>[0,1].flatMap(y=>[0,1].map(z=>[x?obstacle.bounds.max[0]:obstacle.bounds.min[0],y?obstacle.bounds.max[1]:obstacle.bounds.min[1],z?obstacle.bounds.max[2]:obstacle.bounds.min[2]])));obstacle.angularRadiusM=movingSolids.has(mesh)?Math.max(...corners.map(p=>distance(p,hinge))):0;if(!movingSolids.has(mesh))fixedObstacles.set(mesh,obstacle);return obstacle;});
 const routes=lines.map((line,i)=>{
  const a=line.allocation,moving=line.to.getWorldPosition(new T.Vector3()).toArray(),shape=planarHingeFlex(a.fixedClamp,moving,{...a,fromTangent:a.fixedTangent,toTangent:tangent});assert(shape.ok,'Infeasible flex at '+theta+': '+JSON.stringify(shape));assert(Math.abs(shape.developedLengthM-a.restLengthM)<1e-10,'Cable developed length changed');assert(shape.tangentGaps.every(n=>n>=0),'Circular fillets overlap');
  line.tube.update(shape.points,{sampled:true,minimumBendRadiusM:shape.minimumBendRadiusM});const route=routeFromTube(line.tube,{id:'redwire-planar-flex/'+i,from:line.from,to:line.to,minBendRadiusM:a.bendRadiusM,restLengthM:a.restLengthM,lengthToleranceM:shape.renderedLengthErrorM+2e-5});route.bounds=bounds(route.points);route.shape=shape;
  assert(route.points.every(p=>Math.abs(p[0]-stations[i])<2e-6),'Lane left its independent hinge-axis plane');assert(distance(route.points[0],route.from.position)<2e-5&&distance(route.points.at(-1),route.to.position)<2e-5,'Rendered connector cap mismatch');assert(route.renderedCenterlineMismatchM<2e-5,'Rendered flex differs from circular construction');
  report.maximumLengthErrorM=Math.max(report.maximumLengthErrorM,Math.abs(shape.developedLengthM-a.restLengthM));report.maximumRenderedChordDeficitM=Math.max(report.maximumRenderedChordDeficitM,shape.renderedLengthErrorM);report.maximumSagittaM=Math.max(report.maximumSagittaM,shape.maximumSagittaM);report.maximumCentrelineMismatchM=Math.max(report.maximumCentrelineMismatchM,route.renderedCenterlineMismatchM);return route;
 });
 const snapshot={routes,obstacles,theta};if(snapshots.size<10)snapshots.set(key,snapshot);report.sampledPoses++;return snapshot;
}
// Derivative bound in metres/radian for the entire geometric curve, not an
// assumed velocity inferred from sample frames. Let rho be the rotating
// moving lead's radius. Roof height changes at no more than
// (sqrt(2)*rho + R)/2. Fixed quarter-arcs translate with that roof; the second
// translates with both roof and lead. The last rotating arc is bounded by
// rho + R*tan'(theta/2) + R <= rho + 2R. Every straight interpolates its ends.
const a=allocations[0],rho=Math.hypot(a.normalOffsetM+a.leadM,a.spanOffsetM),roofSpeed=(Math.SQRT2*rho+a.bendRadiusM)/2,routeSpeedMPerRadian=Math.max(roofSpeed+rho,rho+2*a.bendRadiusM,Math.hypot(a.normalOffsetM,a.spanOffsetM)+a.leadM+a.bendRadiusM);report.motionBound={routeSpeedMPerRadian,basis:'Analytic circular-fillet/straight-endpoint derivative bound plus exact rigid platform rotation; actual rendered chords add twice their maximum sagitta and 4 micrometres for buffer rounding.'};
function certify(lo,hi,depth=0){
 const s=sample((lo+hi)/2),half=(hi-lo)/2;let margin=Infinity;
 for(const route of s.routes)for(const obstacle of s.obstacles){
  const motion=(routeSpeedMPerRadian+obstacle.angularRadiusM)*half+2*route.shape.maximumSagittaM+4e-6,boxLower=boxDistance(route.bounds,obstacle.bounds)-route.radiusM-(route.clearanceM??0);
  if(boxLower>motion){margin=Math.min(margin,boxLower-motion);continue;}
  const result=routeClearance(route,[obstacle]);assert(result.ok,'Flex intersects '+obstacle.id+' at '+s.theta+': '+JSON.stringify(result));report.minimumClearanceM=Math.min(report.minimumClearanceM,result.minimumClearanceM);
  // The planning BVH returns a conservative lower bound for distant pairs.
  // If it is too loose for this interval, request clearance through the full
  // motion envelope so the necessary nearby geometry is examined exactly.
  // Failure of the inflated envelope causes subdivision, not a false claim
  // that the actual physical cable intersects the solid.
  const coarseMargin=result.minimumClearanceM-motion,verifiedMargin=coarseMargin>1e-7?coarseMargin:routeClearance({...route,clearanceM:(route.clearanceM??0)+motion},[obstacle]).minimumClearanceM;margin=Math.min(margin,verifiedMargin);
 }
 if(margin>1e-7){report.minimumCertificateMarginM=Math.min(report.minimumCertificateMarginM,margin);report.certifiedIntervals.push({startRad:lo,endRad:hi,clearanceLowerBoundM:margin});return;}
 assert(depth<12,'Unresolved continuous hinge clearance in '+lo+'..'+hi);const mid=(lo+hi)/2;certify(lo,mid,depth+1);certify(mid,hi,depth+1);
}
// The interval certificate covers every angle, including the endpoints; the
// explicit endpoint/quarter-state checks also exercise the actual-buffer
// connector tangency, finite radius, bend metadata, length and self checks.
for(let i=0;i<=8;i++)for(const route of sample(i*Math.PI/16).routes){const result=auditRoutes([route],[],{maxIssues:4});assert(result.ok,JSON.stringify({angle:i*Math.PI/16,issues:result.issues}));}
certify(0,Math.PI/2);
assert(report.laneSeparationProof.clearanceLowerBoundM>0);
const representative=sample(Math.PI/4).routes[12],s=representative.shape;
assert.equal(planarHingeFlex(s.points[0],s.points.at(-1),{...a,fromTangent:a.fixedTangent,toTangent:s.toTangent,restLengthM:.5}).reason,'insufficient-developed-length');report.negativeRegressions.push('Shortened developed length fails');
const displaced=s.points.at(-1).map((n,i)=>n+(i===0?.01:0));assert.equal(planarHingeFlex(s.points[0],displaced,{...a,fromTangent:a.fixedTangent,toTangent:s.toTangent}).reason,'clamps-or-headings-are-not-coplanar');report.negativeRegressions.push('Off-plane moving clamp fails');
const wrongHeading=planarHingeFlex(s.points[0],s.points.at(-1),{...a,fromTangent:a.fixedTangent,toTangent:s.toTangent.map(n=>-n)});assert.equal(wrongHeading.reason,'moving-heading-outside-quarter-turn');report.negativeRegressions.push('Reversed connector heading fails');
const corrupted={...representative,from:{...representative.from,position:representative.from.position.map((n,i)=>n+(i===2?.03:0))}};assert(auditRoutes([corrupted],[]).issues.some(i=>i.code==='connector-gap'));report.negativeRegressions.push('Moved physical connector fails');
const point=representative.points[Math.floor(representative.points.length/3)],solid={id:'injected-wall',type:'box',min:point.map(x=>x-.04),max:point.map(x=>x+.04)};assert(!routeClearance(representative,[solid]).ok);report.negativeRegressions.push('Inserted wall fails');
report.ok=true;const at=process.argv.indexOf('--output');if(at>=0)await writeFile(process.argv[at+1],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,certifiedIntervals:report.certifiedIntervals.length},null,2));
