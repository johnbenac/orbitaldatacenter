import {auditSweptRoutes,createRoutingCollisionCache,createRoutingStationaryCertificate} from './routing-audit.js';
import {flightRoutingSnapshot,auditFlightRoutingSnapshot} from './flight-routing-registry.js';
import {createFlightDeploymentMotion} from './flight-deployment-motion.js';
import {fluidMotionSpansForSegment} from './flight-fluid-routing.js';
import {createOperationalRoutingEnvelopes,verifyOperationalEnvelopeContainment} from './routing-operational-envelopes.js';
import {certifySolarTracking} from './flight-solar-routing-motion.js';
import {certifyConnectorMating} from './flight-connector-routing-motion.js';
import {certifyRadiatorPointing} from './flight-radiator-routing-motion.js';
import {createSolarDeploymentHalfspaces} from './flight-solar-deployment-halfspaces.js';
import {motionSpansCoverRoute} from './routing-motion-coverage.js';

export function completeBodyRigidRoute(route,models){
 return motionSpansCoverRoute(route,models)&&models.every(m=>m.kind==='rigid'&&m.frameId==='body');
}

function planarDisplacement(model,motion,a,b){
 const angles=motion.parameters(a,b).banks.get(model.bankEnd);if(!angles)return Infinity;
 const theta=angles.root;if(!theta)return 0;const rho=Math.hypot(model.normalOffsetM+model.leadM,model.spanOffsetM),r=model.bendRadiusM,roofSpeed=(Math.SQRT2*rho+r)/2,speed=Math.max(roofSpeed+rho,rho+2*r,Math.hypot(model.normalOffsetM,model.spanOffsetM)+model.leadM+r),sagitta=r*(1-Math.cos(Math.PI/(4*model.arcSteps)));
 return speed*theta+2*sagitta+4e-6;
}
function independentFlexPlanes(pair){
 if(pair.kind==='self'&&pair.sourceArcA&&pair.sourceArcB){const span=pair.routeA.motionSpans?.find(s=>s.convexSelfProof&&[pair.sourceArcA,pair.sourceArcB].every(arc=>arc[0]>=s.startM-1e-8&&arc[1]<=s.endM+1e-8));if(span)return {kind:'convex-planar',spanId:span.id,...span.convexSelfProof};}
 if(pair.kind!=='line')return null;const a=pair.routeA.flexPlaneSection,b=pair.routeB?.flexPlaneSection;if(!a||!b||a.axis.some((v,i)=>Math.abs(v-b.axis[i])>1e-8))return null;
 return {axis:a.axis,rangeA:[a.offsetM-a.toleranceM,a.offsetM+a.toleranceM],rangeB:[b.offsetM-b.toleranceM,b.offsetM+b.toleranceM],radiusUpperBoundA:a.radiusUpperBoundM,radiusUpperBoundB:b.radiusUpperBoundM,sectionA:{startLengthM:a.startLengthM,endLengthM:a.endLengthM},sectionB:{startLengthM:b.startLengthM,endLengthM:b.endLengthM},basis:'Separate fixed hinge-axis planes. The analytic planar reservoir, its two rigid lead stubs, and every circular fillet retain the declared plane through the entire quarter-turn; jacket and Float32 allowances are subtracted explicitly.'};
}

function sharedBankProjection(pair,snapshots){
 if(!['line','self'].includes(pair.kind)||!pair.sourceArcA||!pair.sourceArcB)return null;
 const selected=(route,arc)=>(route.motionSpans||[]).find(s=>s.bankTransverseRangeM&&s.transverseFrameId&&arc[0]>=s.startM-1e-8&&arc[1]<=s.endM+1e-8),left=selected(pair.routeA,pair.sourceArcA),right=selected(pair.routeB,pair.sourceArcB);
 if(!left||!right||left.transverseFrameId!==right.transverseFrameId)return null;
 const rangeA=[left.bankTransverseRangeM[0]-5e-6,left.bankTransverseRangeM[1]+5e-6],rangeB=[right.bankTransverseRangeM[0]-5e-6,right.bankTransverseRangeM[1]+5e-6],radiusA=pair.routeA.radiusM+3e-6,radiusB=pair.routeB.radiusM+3e-6;
 if(Math.max(rangeA[0]-rangeB[1],rangeB[0]-rangeA[1])<=radiusA+radiusB+Math.max(pair.routeA.clearanceM,pair.routeB.clearanceM))return null;
 const projectionFrames={};for(const position of ['start','mid','end']){
  const snapshot=snapshots[position],a=snapshot?.routes.find(r=>r.id===pair.routeA.id),b=snapshot?.routes.find(r=>r.id===pair.routeB.id),span=(r,model)=>r?.motionSpans?.find(s=>(s.id||s.sectionId)===(model.id||model.sectionId)),x=span(a,left),y=span(b,right);
  if(!x||!y||x.transverseFrameId!==y.transverseFrameId||x.transverseAxisWorld.some((v,i)=>Math.abs(v-y.transverseAxisWorld[i])>1e-8)||x.transverseOriginWorld.some((v,i)=>Math.abs(v-y.transverseOriginWorld[i])>1e-8))return null;
  projectionFrames[position]={axis:x.transverseAxisWorld,origin:x.transverseOriginWorld};
 }
 return {axis:left.transverseAxisWorld,rangeA,rangeB,radiusUpperBoundA:radiusA,radiusUpperBoundB:radiusB,sectionA:{startLengthM:left.startM,endLengthM:left.endM},sectionB:{startLengthM:right.startM,endLengthM:right.endM},projectionFrames,basis:'Both sections use the same registered bank frame. Every accordion fold rotates about its transverse axis and preserves the allocated local-X range of its straight spans and circular flexes. Common root yaw, pitch and trim rotate that axis and both ranges together. Actual points and frame projections at both ends and the midpoint are checked independently.'};
}

// IDs are case-scoped, zero-based parent/subdivision indices. The motion
// object's intervals include scene release-restraint breakpoints; retain its
// exact activity predicate, subdivision policy and floating-point arithmetic.
export function enumerateFlightDeploymentIntervals(motion){
 return motion.intervals.flatMap((interval,parentIndex)=>{const p=motion.parameters(interval.start,interval.end),active=p.pv||p.tracking||[...p.banks.values()].some(b=>b.root||b.tip),count=active?Math.max(1,Math.ceil((interval.end-interval.start)/.02)):1;return Array.from({length:count},(_,i)=>({...interval,id:'deployment:'+parentIndex+':'+i,start:interval.start+(interval.end-interval.start)*i/count,end:interval.start+(interval.end-interval.start)*(i+1)/count}));});
}

function deploymentIntervalsMatch(required,results){
 return required.length>0&&results.length===required.length&&new Set(required.map(i=>i.id)).size===required.length&&required.every(expected=>typeof expected.id==='string'&&expected.id.length>0&&typeof expected.name==='string'&&Number.isFinite(expected.start)&&Number.isFinite(expected.end)&&expected.end>expected.start&&results.filter(actual=>actual.id===expected.id&&actual.name===expected.name&&actual.start===expected.start&&actual.end===expected.end).length===1);
}
function deploymentIntervalPassed(result){
 return result.ok===true&&result.unresolvedIntervals===0&&!(result.unresolved?.length)&&Number.isInteger(result.certifiedIntervals)&&result.certifiedIntervals>0&&Array.isArray(result.issues)&&result.issues.length===0;
}
// This checks this certifier's authoritative manifest and completed results;
// it does not accept external prerequisite evidence or merge receipts.
export function hasCompleteFlightDeploymentCoverage(required,results){
 return deploymentIntervalsMatch(required,results)&&results.every(deploymentIntervalPassed);
}

export function certifyFlightDeployment(factory,h,{onProgress=()=>{},onInterval=null,maxDepth=15,maxSamples=5000,intervalId=null}={}){
 const motion=createFlightDeploymentMotion(factory,h),domains=enumerateFlightDeploymentIntervals(motion),requiredIntervalManifest=domains.map(({id,name,start,end})=>({id,name,start,end})),selected=intervalId===null?domains:domains.filter(i=>i.id===intervalId),selection={intervalId,selectedInterval:intervalId!==null&&selected.length===1?requiredIntervalManifest.find(i=>i.id===intervalId):null,requiredIntervals:domains.length,requiredIntervalManifest,completeDomain:[0,1]};
 if(intervalId!==null&&selected.length!==1)return {ok:false,executionComplete:false,selectedScopePassed:false,coverageComplete:false,...selection,issues:[{code:selected.length?'ambiguous-deployment-interval':'unknown-deployment-interval',intervalId,message:'Select exactly one ID from the required deployment interval manifest.'}],intervals:[]};
 const collisionCache=createRoutingCollisionCache(),solarHalfspaces=createSolarDeploymentHalfspaces(factory,h),issues=[...solarHalfspaces.issues],intervals=[],metadataFailures=new Map();
 function sample(progress){factory.positionPanels(progress);const snapshot=flightRoutingSnapshot(factory);for(const issue of snapshot.additionalIssues)metadataFailures.set(JSON.stringify(issue),issue);return snapshot;}
 const stationaryBaseline=createRoutingStationaryCertificate(sample(0),{auditOptions:{maxIssues:1,collisionCache}});
 if(!stationaryBaseline.ok){factory.positionPanels(1);return {ok:false,executionComplete:false,selectedScopePassed:false,coverageComplete:false,...selection,issues:[...issues,...stationaryBaseline.issues],intervals};}
 for(const interval of selected){
  let currentKey='',bounds=new Map(),groups=new Map(),segments=new WeakMap();
  const prepare=(a,b)=>{const k=a+'/'+b;if(k!==currentKey){currentKey=k;bounds=new Map();groups=new Map();segments=new WeakMap();}};
  function displacement(model,a,b){prepare(a,b);if(!bounds.has(model)){const value=model.kind==='planar-hinge'?planarDisplacement(model,motion,a,b):motion.bound(model,a,b,{radiusM:model.radiusM,fromRadiusM:model.fromRadiusM,toRadiusM:model.toRadiusM}).pointM;bounds.set(model,value);}return bounds.get(model);}
  function group(model,a,b){prepare(a,b);if(!groups.has(model))groups.set(model,model.kind==='planar-hinge'?null:motion.rigidGroup(model,a,b));return groups.get(model);}
  function spans(route,index,sourceArc){let cached=segments.get(route);if(!cached){cached=new Map();segments.set(route,cached);}if(!cached.has(index))cached.set(index,(sourceArc?(route.motionSpans||[]).filter(s=>s.endM>=sourceArc[0]-.001&&s.startM<=sourceArc[1]+.001):fluidMotionSpansForSegment(route,index)).filter(s=>!s.proofOnly));return cached.get(index);}
  function pairBound(a,b,pair){prepare(a,b);const left=spans(pair.routeA,pair.segmentA,pair.sourceArcA),right=pair.obstacle?[pair.obstacle.motionModel]:spans(pair.routeB,pair.segmentB,pair.sourceArcB);if(!left.length||!right.length||left.some(x=>!x)||right.some(x=>!x))return Infinity;
   let maximum=0;for(const x of left)for(const y of right){const same=group(x,a,b);if(same&&same===group(y,a,b))continue;maximum=Math.max(maximum,displacement(x,a,b)+displacement(y,a,b));}return maximum;
  }
  const solarRouteRanges=new WeakMap();
  function separationWitness(a,b,pair,snapshots){
   const planar=independentFlexPlanes(pair);if(planar)return planar;
   const bank=sharedBankProjection(pair,snapshots);if(bank)return bank;
   if(pair.kind!=='solid')return null;const proof=solarHalfspaces.byMeshId.get(pair.obstacle.sourceMesh||pair.obstacle.id);if(!proof)return null;
   const route=pair.routeA,kinematic=(route.motionSpans||[]).filter(s=>!s.proofOnly),fixed=completeBodyRigidRoute(route,kinematic);if(!fixed)return null;
   let ranges=solarRouteRanges.get(route);if(!ranges){ranges=new Map();solarRouteRanges.set(route,ranges);}const key=proof.axis.join(',');if(!ranges.has(key)){const projection=(route.renderedPoints||route.points).map(p=>p.reduce((sum,v,k)=>sum+v*proof.axis[k],0));ranges.set(key,[Math.min(...projection)-3e-6,Math.max(...projection)+3e-6]);}
   const rangeA=ranges.get(key);if(Math.max(rangeA[0]-proof.rangeM[1],proof.rangeM[0]-rangeA[1])<=route.radiusM+route.clearanceM+3e-6)return null;
   return {axis:proof.axis,rangeA,rangeB:proof.rangeM,radiusUpperBoundA:route.radiusM+3e-6,basis:'A complete body-fixed route retains its exact body-axis projection. '+proof.basis+' The checker verifies both declared ranges against the actual start, midpoint and end geometry.'};
  }
  const result=auditSweptRoutes({sample,start:interval.start,end:interval.end,maxDepth,maxSamples,onInterval,pairMotionBound:pairBound,pairSeparationLowerBound:separationWitness,stationaryCertificate:stationaryBaseline.certificate,stationaryMotionBound(a,b,{kind,record}){const models=kind==='route'?(record.motionSpans||[]).filter(s=>!s.proofOnly):[record.motionModel];if(!models.length||models.some(m=>!m))return Infinity;if(kind==='route'?completeBodyRigidRoute(record,models):models[0].kind==='rigid'&&models[0].frameId==='body')return 0;return Math.sqrt(3)*Math.max(...models.map(m=>displacement(m,a,b)))+4e-6;},stationaryMotionBasis:'Only globally body-fixed rigid solids and complete routes made exclusively of body-fixed rigid spans may reuse the full progress-zero baseline. Non-proof spans must cover the entire actual centreline without gaps. Their actual buffers, connector datums and inventory must remain exactly unchanged at every endpoint and midpoint. All other participants remain active even during a locally paused phase, with the existing analytic displacement bound and buffer allowance.',motionBound(a,b,{mid}){prepare(a,b);let maximum=0;for(const route of mid.routes)for(const span of route.motionSpans||[])maximum=Math.max(maximum,displacement(span,a,b));for(const obstacle of mid.obstacles){if(!obstacle.motionModel)return Infinity;maximum=Math.max(maximum,displacement(obstacle.motionModel,a,b));}return 2*Math.sqrt(3)*maximum+5e-6;},motionBoundBasis:motion.basis+' Planar payload loops use an analytic circular-fillet derivative bound. Relative invariance is used only for declared common rigid attachments; independent cable planes and complete-deployment solar halfspaces use checked projection witnesses.',auditOptions:{maxIssues:1,collisionCache}});
  intervals.push({...interval,...result,id:interval.id,name:interval.name,start:interval.start,end:interval.end});onProgress('Deployment '+interval.name+': '+(result.ok?result.certifiedIntervals+' certified intervals':JSON.stringify(result.issues[0])));if(!deploymentIntervalPassed(result)){issues.push(...result.issues);break;}
 }
 factory.positionPanels(1);issues.push(...metadataFailures.values());const executionComplete=deploymentIntervalsMatch(selected,intervals),selectedScopePassed=issues.length===0&&hasCompleteFlightDeploymentCoverage(selected,intervals),coverageComplete=intervalId===null&&issues.length===0&&hasCompleteFlightDeploymentCoverage(domains,intervals);return {ok:coverageComplete,executionComplete,selectedScopePassed,coverageComplete,...selection,issues,intervals};
}

export function certifyOperationalRoutingEnvelopes(factory){
 const envelope=createOperationalRoutingEnvelopes(factory),snapshot=flightRoutingSnapshot(factory);snapshot.obstacles=[...snapshot.obstacles.filter(o=>!o.operationalEnvelope&&!envelope.coveredMeshIds.includes(o.sourceMesh||o.id)),...envelope.obstacles];
 const audit=auditFlightRoutingSnapshot(snapshot,{maxIssues:80}),containment=verifyOperationalEnvelopeContainment(factory,envelope),issues=[...(envelope.issues||[]),...(containment.issues||[]),...audit.issues];
 return {ok:envelope.ok&&containment.ok&&audit.ok,issues,counts:envelope.counts,proofs:envelope.proofs,minimumClearanceM:audit.minimumClearanceM,basis:'Analytic enclosing spheres for rigid CMG/head rotations and hollow circumscribed solids for the full azimuth support sweep. Every represented pose is inside the audited fixed keepout; current-pose vertex containment is also checked.'};
}

// Every motion domain is explicit. Unknown/new actuators fail the publication
// gate until their analytic envelope or interval certificate is registered.
export const flightRoutingMotionPhaseIds=Object.freeze(['deployment','terminal-pointing-and-cmg-motion','solar-tracking','connector-mating','radiator-pointing']);
export async function certifyFlightRoutingMotion(factory,h,{onProgress=()=>{},phase=null,intervalId=null,activityId=null}={}){
 if(phase!==null&&!flightRoutingMotionPhaseIds.includes(phase))throw new Error('Unknown flight routing motion phase: '+phase);
 if(intervalId!==null&&activityId!==null)throw new Error('Deployment interval and connector activity selections are mutually exclusive');
 if(intervalId!==null&&(phase!=='deployment'||typeof intervalId!=='string'||!intervalId.trim()))throw new Error('A deployment interval requires an explicit deployment phase and a nonempty interval ID');
 if(activityId!==null&&(phase!=='connector-mating'||typeof activityId!=='string'||!activityId.trim()))throw new Error('A connector activity requires an explicit connector-mating phase and a nonempty activity ID');
 // The deployment certifier leaves the default pipeline fully deployed.
 // A selected operating phase needs that same starting pose without running
 // an unselected deployment certificate.
 // An explicit connector activity resolves before its certifier prepares
 // that same deployed baseline, so an invalid ID cannot change the pose.
 if(phase!==null&&phase!=='deployment'&&activityId===null)factory.positionPanels(1);
 const domains=[];
 for(const id of phase===null?flightRoutingMotionPhaseIds:[phase]){
  let result;
  switch(id){
   case 'deployment':result=certifyFlightDeployment(factory,h,{onProgress,intervalId});break;
   case 'terminal-pointing-and-cmg-motion':result=certifyOperationalRoutingEnvelopes(factory);break;
   case 'solar-tracking':result=certifySolarTracking(factory,h);break;
   case 'connector-mating':result=certifyConnectorMating(factory,h,{onProgress,activityId});break;
   case 'radiator-pointing':result=await certifyRadiatorPointing(factory,h,{onProgress});break;
  }
  domains.push({id,...result});
 }
 return {ok:domains.every(d=>d.ok),executionComplete:domains.every(d=>d.executionComplete!==false),selectedScopePassed:domains.every(d=>d.selectedScopePassed??d.ok),coverageComplete:phase===null&&domains.every(d=>d.coverageComplete!==false),domains};
}
