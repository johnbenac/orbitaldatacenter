import {obstacleFromMesh,routingMatrix} from './routing-audit.js';

const add=(a,b,k=1)=>a.map((v,i)=>v+k*b[i]),distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const inFrame=(node,frame)=>{const m=routingMatrix(node,frame).elements;return {position:[m[12],m[13],m[14]],normal:[m[8],m[9],m[10]].map(v=>v/Math.hypot(m[8],m[9],m[10]))};};
const present=node=>{for(let p=node;p;p=p.parent)if(p.userData.routingPresent===false)return false;return true;};

// Hoist lines are drawn as straight, taut cylinders rather than tube rings.
// The cylinder adapter independently verifies every actual vertex before
// exposing its finite end planes, axis and radius. A changed buffer which no
// longer describes that primitive fails; metadata cannot replace it.
export function hoistRoutingSnapshot(records,{frame=null}={}){
 const active=records.filter(r=>present(r.mesh)),routes=[],issues=[];
 for(const record of active){
  const solid=obstacleFromMesh(record.mesh,{id:record.id+':drawn-line',frame}),from=inFrame(record.from,frame),to=inFrame(record.to,frame);
  if(solid.type!=='cylinder'){issues.push({code:'invalid-hoist-line-buffer',routeId:record.id});continue;}
  let points=[add(solid.center,solid.axis,-solid.halfLengthM),add(solid.center,solid.axis,solid.halfLengthM)];if(distance(points[1],from.position)<distance(points[0],from.position))points.reverse();
  const lengthM=distance(...points),toleranceM=2e-5,radiusM=Math.max(record.radiusM,solid.radiusM);
  if(!Number.isFinite(radiusM)||Math.abs(radiusM-record.radiusM)>1e-6)issues.push({code:'hoist-line-radius-mismatch',routeId:record.id,measuredRadiusM:radiusM,allocatedRadiusM:record.radiusM});
  const route={id:record.id,points,from,to,radiusM,clearanceM:.002,minBendRadiusM:record.minimumBendRadiusM,minimumBendRadiusM:Infinity,lengthM,motion:{...record.motion,kind:record.kind},scope:'Ground lifting line'};
  if(record.kind==='fixed-sling'){
   route.restLengthM=record.cutLengthM;route.lengthToleranceM=toleranceM;
   if(!Number.isFinite(record.cutLengthM)||Math.abs(lengthM-record.cutLengthM)>toleranceM)issues.push({code:'hoist-sling-cut-length',routeId:record.id,measuredLengthM:lengthM,allocatedLengthM:record.cutLengthM});
  }else if(record.kind==='winch-payout'){
   const payoutM=record.reel.rotation.x*record.reelRadiusM,remainingM=record.installedLengthM-payoutM;
   route.maximumLengthM=record.installedLengthM;route.lengthModel={kind:record.kind,installedLengthM:record.installedLengthM,paidOutLengthM:payoutM,remainingOnReelM:remainingM,reelRadiusM:record.reelRadiusM};
   if(![payoutM,remainingM,record.installedLengthM].every(Number.isFinite)||remainingM<0||payoutM<0||Math.abs(lengthM-payoutM)>toleranceM||record.reelRadiusM<record.minimumBendRadiusM)issues.push({code:'hoist-payout-length',routeId:record.id,measuredLengthM:lengthM,...route.lengthModel});
  }else issues.push({code:'unverified-hoist-length-model',routeId:record.id});
  routes.push(route);
 }
 return {routes,expectedRouteIds:active.map(r=>r.id),additionalIssues:issues,additionalIssueCount:issues.length,inventory:{registeredLineMeshes:active.length},basis:'Straight taut free spans recovered from every actual cylinder vertex; constant-cut load slings and finite installed winch lines with measured reel payout. These are project geometric allocations, not lifting qualification.'};
}
