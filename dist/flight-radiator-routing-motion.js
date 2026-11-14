import * as T from './vendor/three.module.js';
import {architectureFamily} from './architecture-families.js';
import {deploymentLayout,mechanismPose,leafPose,leafAxes} from './deployment.js';
import {attitudeLimits,bankTrimTravel} from './attitude-guidance.js';
import {routingMotionFor,fluidMotionSpansForSegment} from './flight-fluid-routing.js';
import {flightRoutingSnapshot,auditFlightRoutingSnapshot} from './flight-routing-registry.js';
import {auditRoutes,createRoutingCollisionCache,createRoutingStationaryCertificate} from './routing-audit.js';
import {motionSpansCoverRoute} from './routing-motion-coverage.js';
import {createOperationalRoutingEnvelopes,verifyOperationalEnvelopeContainment} from './routing-operational-envelopes.js';
import {createSolarTrackingEnvelopes,verifySolarTrackingContainment} from './flight-solar-routing-motion.js';

const DEG=Math.PI/180,V=p=>new T.Vector3(...p),distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const corners=(lo,hi)=>Array.from({length:8},(_,i)=>lo.map((v,k)=>i&(1<<k)?hi[k]:v));
const maxRadius=(points,origin)=>Math.max(0,...points.map(p=>distance(p,origin)));
function sineCosineRange(A,B,lo,hi){const angles=[lo,hi],phase=Math.atan2(A,B);for(let k=-2;k<=2;k++){const angle=phase+k*Math.PI;if(angle>=lo&&angle<=hi)angles.push(angle);}const values=angles.map(c=>A*Math.sin(c)+B*Math.cos(c));return [Math.min(...values),Math.max(...values)];}
function obstaclePoints(o){
 if(o.type==='mesh')return o.triangles.flat();
 if(o.type==='obb')return Array.from({length:8},(_,i)=>o.center.map((v,k)=>v+o.axes.reduce((s,a,d)=>s+(i&(1<<d)?1:-1)*a[k]*o.halfSize[d],0)));
 if(o.type==='box')return corners(o.min,o.max);
 // AABB corners enclose the complete closed circular article; the angular
 // displacement estimate is conservative even when that enclosure is loose.
 if(o.bounds)return corners(o.bounds.min,o.bounds.max);
 if(o.type==='capsule')return [o.a,o.b].flatMap(p=>corners(p.map(v=>v-o.radiusM),p.map(v=>v+o.radiusM)));
 return [];
}
function rigidRoot(root){
 const e=root.matrixWorld.elements,axes=[0,1,2].map(i=>new T.Vector3(e[4*i],e[4*i+1],e[4*i+2]));
 return axes.every(a=>Math.abs(a.length()-1)<1e-7)&&axes.every((a,i)=>axes.every((b,j)=>i===j||Math.abs(a.dot(b))<1e-7));
}

/**
 * Independent upper/lower pitch and roll, including the controller's 105°
 * roll branch. A cell is a Cartesian product of pitch and normalized trim;
 * all four parameters can vary simultaneously. Acceptance requires a strictly
 * positive finite-radius separation after subtracting an analytic rotational
 * displacement bound for every solid, interline and self pair. Sampling alone
 * never accepts a cell; an exhausted budget remains a release blocker.
 */
export function certifyRadiatorPointing(factory,h,{onProgress=()=>{},onCell=null,maxDepth=22,maxCells=4096,maxIssues=40,getSnapshot=flightRoutingSnapshot,minimumMarginM=1e-7}={}){
 const root=factory.root,g=deploymentLayout(h),family=architectureFamily(h),limits=attitudeLimits(h),tracking=family.radiatorTracking==='root-cant',cache=createRoutingCollisionCache(),issues=[],accepted=[],models=new Map(),frames=new Map();
 let evaluatedCells=0,minimumCertificateMarginM=Infinity,minimumClearanceM=Infinity,maximumDepth=0,baselineCounts=null;
 root.updateWorldMatrix(true,true);
 if(!rigidRoot(root))return {ok:false,issues:[{code:'radiator-proof-root-transform',message:'The metre-based angular certificate requires a rigid root transform.'}],completeDomain:null};
 root.traverse(o=>{const m=o.userData?.routingMotion;if(!m?.frameId)return;models.set(m.frameId,m);if(m.frameId==='body')frames.set(m.frameId,root);else if(o.uuid===m.frameId)frames.set(m.frameId,o);});
 // bankDrive commands postdeployment cant between 45° and its nominal cant.
 // Retain the older 30°..65° engineering articulation envelope as well. The
 // lower deployment angles have a locked zero roll and a separate certificate.
 const bankDefinitions=g.custom?g.banks:[{end:-1},{end:1}],domain=bankDefinitions.map(b=>({bankEnd:b.end,pitchMagnitudeDeg:[30,Math.max(65,b.end<0?limits.upperBankCantDeg:limits.bankCantDeg)],normalizedTrim:[-1,1],trimStopDeg:limits.radiatorTrimStopDeg,upperTrimEnabled:b.end<0?limits.upperTrimEnabled:true}));
 const resolve=m=>typeof m==='string'?models.get(m):m;
 function wingDefinition(m){return g.custom?g.wings.find(w=>w.id===m.wingId||(w.side===m.side&&w.end===m.end)):null;}
 const groupCache=new WeakMap();
 function group(model,visited){const m=resolve(model);if(!m)return null;if(groupCache.has(m))return groupCache.get(m);const result=uncachedGroup(m,visited||new Set());groupCache.set(m,result);return result;}
 function uncachedGroup(m,visited){
  if(visited.has(m))return null;visited.add(m);
  if(m.kind==='rigid'&&m.frameId==='body')return 'body';
  if(m.kind==='release-restraint')return m.attachment==='body'&&[m.startProgress,m.endProgress,m.strokeM].every(Number.isFinite)&&m.startProgress>=0&&m.startProgress<m.endProgress&&m.endProgress<=1&&m.strokeM>=0?'body':null; // every snapshot is at fully deployed progress 1
  if(m.kind==='root-gimbal'&&m.axis==='yaw')return 'body'; // yaw has completed before this operating domain
  if(m.kind==='rigid'&&Number.isFinite(m.bankEnd))return (m.attachment==='radiator-pitch'?'pitch:':'bank:')+m.bankEnd;
  if(m.kind==='solar'||m.kind==='solar-stator'){const w=wingDefinition(m);return w?.bankEnd!=null?'bank:'+w.bankEnd:'body';}
  if(m.kind==='constant-length-u'||m.kind==='planar-accordion'){
   const a=group(m.fromFrameId,new Set(visited)),b=group(m.toFrameId,new Set(visited));return a&&a===b?a:null;
  }
  return null;
 }
 function trimAt(cant,d,branch){if(d.bankEnd<0&&!limits.upperTrimEnabled)return 0;if(branch==='limited')return Math.asin(Math.max(0,Math.min(1,limits.bankClearanceY/(limits.bankHalfWidthM*Math.cos(cant*DEG)))))/DEG;if(branch==='free')return limits.radiatorTrimStopDeg;return bankTrimTravel(cant,limits,d.bankEnd<0);}
 function attitudeFor(values,cell){const attitude={wingPitchDeg:0};for(const [i,d] of domain.entries()){const cant=values[2*i],roll=values[2*i+1]*trimAt(cant,d,cell?.trimBranches?.[d.bankEnd]),prefix=d.bankEnd<0?'upper':'lower';attitude[prefix+'RadiatorPitchDeg']=d.bankEnd*cant;attitude[prefix+'RadiatorRollDeg']=roll;}return attitude;}
 function validateKinematics(attitude){
  const errors=[];root.updateWorldMatrix(true,true);
  for(const panel of factory.panels||[]){const d=panel.descriptor;if(d?.type!=='rad'||!panel.surface)continue;const p=leafPose(g,d,1,h.input?.solarTiltDeg||0,attitude),expected=root.localToWorld(V([p.x,p.y,p.z])),actual=panel.surface.getWorldPosition(new T.Vector3());if(actual.distanceTo(expected)>2e-5){errors.push({code:'radiator-pointing-kinematics',bankEnd:d.end,leaf:d.j,gapM:actual.distanceTo(expected)});continue;}
   const axes=leafAxes(p),matrix=panel.surface.matrixWorld;for(let i=0;i<3;i++){const a=V(axes[i]).transformDirection(root.matrixWorld),b=new T.Vector3().setFromMatrixColumn(matrix,i).normalize();if(a.dot(b)<1-1e-8)errors.push({code:'radiator-pointing-axis',bankEnd:d.end,leaf:d.j,axis:i});}
  }
  return errors;
 }
 function snapshot(values,cell){
  const attitude=attitudeFor(values,cell);factory.positionPanels(1,attitude);factory.electrical?.routing?.update?.();root.updateWorldMatrix(true,true);
  const s=getSnapshot(factory),operational=createOperationalRoutingEnvelopes(factory),solar=createSolarTrackingEnvelopes(factory,h,{attitude}),covered=new Set([...operational.coveredMeshIds,...solar.coveredMeshIds]);
  for(const obstacle of solar.obstacles){const proof=solar.proofs.find(p=>p.id===obstacle.id),wing=factory.wings[proof?.wing],source=wing?.descriptor||wing,definition=g.custom?g.wings.find(w=>w.id===source?.wingId||w.side===wing?.side&&w.end===wing?.end):null;obstacle.motionModel=definition?.bankEnd!=null?{kind:'rigid',frameId:'solar-envelope:'+proof.wing,bankEnd:definition.bankEnd,attachment:'radiator-leaf'}:{kind:'rigid',frameId:'body',attachment:'body'};}
  const containment=verifyOperationalEnvelopeContainment(factory,operational),solarContainment=verifySolarTrackingContainment(factory,solar),extra=[...(s.additionalIssues||[]),...operational.issues,...solar.issues,...containment.issues,...solarContainment.issues,...validateKinematics(attitude)];
  return {...s,attitude,values:[...values],obstacles:[...s.obstacles.filter(o=>!o.operationalEnvelope&&!o.operationalSolarEnvelope&&!covered.has(o.sourceMesh||o.id)),...operational.obstacles,...solar.obstacles],additionalIssues:extra,additionalIssueCount:(s.additionalIssueCount||0)+extra.length-(s.additionalIssues||[]).length};
 }
 let independentBankProof=null;
 function bankProjectionProof(s){
  const pose=mechanismPose(g,1,h.input?.solarTiltDeg||0,s.attitude),ranges=new Map(),basis=new Map(),axis=new T.Vector3(0,1,0).transformDirection(root.matrixWorld).toArray(),origin=root.getWorldPosition(new T.Vector3()).toArray();
  for(const d of domain){const p=pose.banks.find(b=>b.end===d.bankEnd),normal=leafAxes({pitch:p.rootPitch,roll:p.roll}),yaw=p.yaw||0,rotate=a=>new T.Vector3(...a).applyAxisAngle(new T.Vector3(0,1,0),yaw).transformDirection(root.matrixWorld),worldOrigin=root.localToWorld(V(p.root));basis.set(d.bankEnd,{worldOrigin,axes:normal.map(rotate),pitchAxes:leafAxes({pitch:p.rootPitch,roll:0}).map(rotate),bodyY:p.root[1],domain:d});ranges.set(d.bankEnd,{range:[Infinity,-Infinity],radiusM:0,objects:0});}
  function include(points,m,radiusM=0){const id=group(m);if(!id||id==='body')return;const [kind,end]=id.split(':'),b=basis.get(Number(end));if(!b)return;const d=b.domain,lo=d.pitchMagnitudeDeg[0]*DEG,hi=d.pitchMagnitudeDeg[1]*DEG,c0=Math.cos(lo),c1=Math.cos(hi),s0=Math.sin(lo),s1=Math.sin(hi),trim=d.upperTrimEnabled?limits.radiatorTrimStopDeg*DEG:0,rollCos=kind==='pitch'?1:Math.cos(trim),factors=[c0,c1,c0*rollCos,c1*rollCos],factorLo=Math.min(...factors),factorHi=Math.max(...factors),C=kind==='pitch'?0:Math.min(c0,limits.bankClearanceY/limits.bankHalfWidthM),sign=-Number(end),row=ranges.get(Number(end));row.radiusM=Math.max(row.radiusM,radiusM);row.objects++;
   for(const p of points){const delta=V(p).sub(b.worldOrigin),axes=kind==='pitch'?b.pitchAxes:b.axes,[x,y,z]=axes.map(a=>delta.dot(a)),y0=sign*y*factorLo,y1=sign*y*factorHi,z0=z*s0,z1=z*s1,u0=sign*b.bodyY-Math.abs(x)*C+Math.min(y0,y1)+Math.min(z0,z1),u1=sign*b.bodyY+Math.abs(x)*C+Math.max(y0,y1)+Math.max(z0,z1),a=sign*u0,c=sign*u1;row.range[0]=Math.min(row.range[0],a,c);row.range[1]=Math.max(row.range[1],a,c);}
  }
  for(const r of s.routes)for(const m of r.motionSpans||[])if(!m.proofOnly)include(r.points,m,r.radiusM+3e-6);
  for(const o of s.obstacles)include(obstaclePoints(o),o.motionModel);
  const rows=[...ranges].filter(([,r])=>r.objects),pairs=[];let ok=true;for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const [a,ra]=rows[i],[b,rb]=rows[j],gap=Math.max(ra.range[0]-rb.range[1],rb.range[0]-ra.range[1])-ra.radiusM-rb.radiusM-4e-5;pairs.push({banks:[a,b],minimumClearanceM:gap});if(gap<=minimumMarginM)ok=false;}
  return {ok,ranges,axis,origin,pairs,basis:'The shared trim law enforces cos(cant)·|sin(roll)|≤bankClearanceY/bankHalfWidthM, including the 105° branch. Independent interval bounds for the remaining cosine/sine terms enclose every actual vertex and finite-radius centreline throughout the complete pitch/roll domain. Opposite banks occupy disjoint projections on body Y.'};
 }
 function motionContext(cell,snapshot){
  const values=cell.lo.map((v,i)=>(v+cell.hi[i])/2),pose=mechanismPose(g,1,h.input?.solarTiltDeg||0,snapshot.attitude),byEnd=new Map(),radii=new WeakMap(),spanCache=new WeakMap(),solidPointsCache=new WeakMap(),projectionCache=new WeakMap(),projectionOrigin=root.getWorldPosition(new T.Vector3()),rootInverse=root.matrixWorld.clone().invert(),projectionAxes=[new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1)].map(a=>a.transformDirection(root.matrixWorld));
  for(const [i,d]of domain.entries()){
   const lo=cell.lo[2*i],hi=cell.hi[2*i],qlo=cell.lo[2*i+1],qhi=cell.hi[2*i+1],p=values[2*i],q=values[2*i+1],branch=cell.trimBranches?.[d.bankEnd],limitLo=trimAt(lo,d,branch),limitHi=trimAt(hi,d,branch),current=q*trimAt(p,d,branch),rolls=[qlo*limitLo,qlo*limitHi,qhi*limitLo,qhi*limitHi],anglePitch=(hi-lo)*DEG/2,angleRoll=Math.max(...rolls.map(v=>Math.abs(v-current)))*DEG,bank=pose.banks.find(b=>b.end===d.bankEnd),origin=root.localToWorld(V(bank.root)).toArray();
   const yaw=bank.yaw||0,axes=roll=>leafAxes({pitch:bank.rootPitch,roll}).map(a=>V(a).applyAxisAngle(new T.Vector3(0,1,0),yaw).transformDirection(root.matrixWorld));
   byEnd.set(d.bankEnd,{anglePitch,angleRoll,origin,axes:axes(bank.roll),pitchAxes:axes(0),yaw,bodyRoot:bank.root,domain:d});
  }
  function spans(route,index,arc){let rows=spanCache.get(route);if(!rows){rows=new Map();spanCache.set(route,rows);}const key=index??'all';if(!rows.has(key))rows.set(key,(arc?(route.motionSpans||[]).filter(s=>s.endM>=arc[0]-.001&&s.startM<=arc[1]+.001):fluidMotionSpansForSegment(route,index)).filter(s=>!s.proofOnly));return rows.get(key);}
  function pointsFor(route,index){return index===null?route.points:[route.points[index],route.points[index+1]];}
  function solidPoints(obstacle){if(!solidPointsCache.has(obstacle))solidPointsCache.set(obstacle,obstaclePoints(obstacle));return solidPointsCache.get(obstacle);}
  function displacement(model,points,object,segmentKey='all'){
   const identity=group(model);if(identity==='body')return 0;if(!identity)return Infinity;
   const [kind,endText]=identity.split(':'),p=byEnd.get(Number(endText));if(!p)return Infinity;
   let map=radii.get(object);if(!map){map=new Map();radii.set(object,map);}const key=identity+'/'+segmentKey;let radius=map.get(key);if(radius===undefined){radius=maxRadius(points,p.origin);map.set(key,radius);}
   return radius*Math.min(2,p.anglePitch+(kind==='pitch'?0:p.angleRoll));
  }
  function bound(pair){
   const left=spans(pair.routeA,pair.segmentA,pair.sourceArcA),right=pair.obstacle?[pair.obstacle.motionModel]:spans(pair.routeB,pair.segmentB,pair.sourceArcB);if(!left.length||!right.length)return Infinity;
   let pa,pb,maximum=0;
   for(const a of left)for(const b of right){const ga=group(a),gb=group(b);if(ga&&ga===gb)continue;pa??=pointsFor(pair.routeA,pair.segmentA);pb??=pair.obstacle?solidPoints(pair.obstacle):pointsFor(pair.routeB,pair.segmentB);if(ga&&gb&&ga!=='body'&&gb!=='body'&&ga.split(':')[1]===gb.split(':')[1]){const p=byEnd.get(Number(ga.split(':')[1])),moving=ga.startsWith('bank:')?pa:pb;maximum=Math.max(maximum,maxRadius(moving,p.origin)*Math.min(2,p.angleRoll));continue;}maximum=Math.max(maximum,displacement(a,pa,pair.routeA,pair.segmentA)+displacement(b,pb,pair.obstacle||pair.routeB,pair.segmentB));}return maximum;
  }
  function projection(points,rows,object,segmentKey,axisIndex){
   let saved=projectionCache.get(object);if(!saved){saved=new Map();projectionCache.set(object,saved);}const key=segmentKey+'/'+axisIndex+'/'+rows.map(m=>group(m)).join(',');if(saved.has(key))return saved.get(key);let lower=Infinity,upper=-Infinity;
   for(const model of rows){const identity=group(model);if(!identity){saved.set(key,null);return null;}if(identity==='body'){for(const p of points){const value=V(p).sub(projectionOrigin).dot(projectionAxes[axisIndex]);lower=Math.min(lower,value);upper=Math.max(upper,value);}continue;}
    const [kind,endText]=identity.split(':'),end=Number(endText),b=byEnd.get(end),d=b.domain,low=d.pitchMagnitudeDeg[0]*DEG,high=d.pitchMagnitudeDeg[1]*DEG,c0=Math.cos(low),c1=Math.cos(high),s0=Math.sin(low),s1=Math.sin(high),trim=d.upperTrimEnabled?limits.radiatorTrimStopDeg*DEG:0,axes=kind==='pitch'?b.pitchAxes:b.axes;
    if(axisIndex===0&&Math.abs(Math.sin(b.yaw))>1e-8){saved.set(key,null);return null;}
    for(const p of points){const delta=V(p).sub(V(b.origin)),[x,y,z]=axes.map(a=>delta.dot(a));let lo,hi;
     if(axisIndex===0){if(kind==='pitch')lo=hi=x;else{const A=x,B=-y,angles=[-trim,trim],phase=Math.atan2(B,A);for(let k=-2;k<=2;k++){const angle=phase+k*Math.PI;if(angle>=-trim&&angle<=trim)angles.push(angle);}const values=angles.map(r=>A*Math.cos(r)+B*Math.sin(r));lo=Math.min(...values);hi=Math.max(...values);}const a=b.bodyRoot[0]+Math.cos(b.yaw)*lo,c=b.bodyRoot[0]+Math.cos(b.yaw)*hi;lo=Math.min(a,c);hi=Math.max(a,c);}
     else if(axisIndex===1){const sign=-end,rollCos=kind==='pitch'?1:Math.cos(trim),factors=[c0,c1,c0*rollCos,c1*rollCos],C=kind==='pitch'?0:Math.min(c0,limits.bankClearanceY/limits.bankHalfWidthM),ys=factors.map(c=>sign*y*c),u0=sign*b.bodyRoot[1]-Math.abs(x)*C+Math.min(...ys)+Math.min(z*s0,z*s1),u1=sign*b.bodyRoot[1]+Math.abs(x)*C+Math.max(...ys)+Math.max(z*s0,z*s1);lo=Math.min(sign*u0,sign*u1);hi=Math.max(sign*u0,sign*u1);}
     else if(kind==='pitch'){const range=sineCosineRange(Math.cos(b.yaw)*end*y,Math.cos(b.yaw)*z,low,high),offset=b.bodyRoot[2]-Math.sin(b.yaw)*x;lo=offset+range[0];hi=offset+range[1];}
     else{const xr=sineCosineRange(-y,x,-trim,trim),yr=sineCosineRange(x,y,-trim,trim),xs=xr.map(v=>-Math.sin(b.yaw)*v),ys=[yr[0]*s0,yr[0]*s1,yr[1]*s0,yr[1]*s1].map(v=>Math.cos(b.yaw)*end*v),zs=[z*c0,z*c1].map(v=>Math.cos(b.yaw)*v);lo=b.bodyRoot[2]+Math.min(...xs)+Math.min(...ys)+Math.min(...zs);hi=b.bodyRoot[2]+Math.max(...xs)+Math.max(...ys)+Math.max(...zs);}
     lower=Math.min(lower,lo);upper=Math.max(upper,hi);
    }
   }
   const range=[lower-2e-5,upper+2e-5];saved.set(key,range);return range;
  }
  function pitchProjection(points,rows,object,segmentKey,end){
   let saved=projectionCache.get(object);if(!saved){saved=new Map();projectionCache.set(object,saved);}const key=segmentKey+'/pitch-z/'+end+'/'+rows.map(m=>group(m)).join(',');if(saved.has(key))return saved.get(key);
   const b=byEnd.get(end);if(!b)return null;let lower=Infinity,upper=-Infinity;
   for(const model of rows){const identity=group(model);if(!identity||identity!=='body'&&Number(identity.split(':')[1])!==end){saved.set(key,null);return null;}
    if(object.type==='cylinder'){
     let centers,cosines;
     if(identity==='body'){const delta=V(object.center).applyMatrix4(rootInverse).sub(V(b.bodyRoot)),axis=V(object.axis).transformDirection(rootInverse),lo=b.domain.pitchMagnitudeDeg[0]*DEG,hi=b.domain.pitchMagnitudeDeg[1]*DEG;centers=sineCosineRange(-end*delta.y,Math.sin(b.yaw)*delta.x+Math.cos(b.yaw)*delta.z,lo,hi);cosines=sineCosineRange(-end*axis.y,Math.sin(b.yaw)*axis.x+Math.cos(b.yaw)*axis.z,lo,hi);}
     else{const value=V(object.center).sub(V(b.origin)).dot(b.pitchAxes[2]),cosine=V(object.axis).dot(b.pitchAxes[2]);centers=[value,value];cosines=[cosine,cosine];}
     const q0=cosines[0]<=0&&cosines[1]>=0?0:Math.min(...cosines.map(Math.abs)),q1=Math.min(1,Math.max(...cosines.map(Math.abs))),optimal=object.halfLengthM/Math.hypot(object.halfLengthM,object.radiusM),candidates=[q0,q1,...(optimal>=q0&&optimal<=q1?[optimal]:[])],extent=Math.max(...candidates.map(q=>object.halfLengthM*q+object.radiusM*Math.sqrt(Math.max(0,1-q*q))));
     lower=Math.min(lower,centers[0]-extent);upper=Math.max(upper,centers[1]+extent);continue;
    }
    for(const point of points){let values;
     if(identity==='body'){
      const delta=V(point).applyMatrix4(rootInverse).sub(V(b.bodyRoot)),A=-end*delta.y,B=Math.sin(b.yaw)*delta.x+Math.cos(b.yaw)*delta.z,lo=b.domain.pitchMagnitudeDeg[0]*DEG,hi=b.domain.pitchMagnitudeDeg[1]*DEG;values=sineCosineRange(A,B,lo,hi);
     }else values=[V(point).sub(V(b.origin)).dot(b.pitchAxes[2])];
     lower=Math.min(lower,...values);upper=Math.max(upper,...values);
    }
   }
   const range=[lower-2e-5,upper+2e-5];saved.set(key,range);return range;
  }
  function witness(pair){
   const left=spans(pair.routeA,pair.segmentA,pair.sourceArcA),right=pair.obstacle?[pair.obstacle.motionModel]:spans(pair.routeB,pair.segmentB,pair.sourceArcB);if(!left.length||!right.length)return null;const groups=new Set([...left,...right].map(m=>group(m)));if(groups.size===1)return null;
   const pa=pointsFor(pair.routeA,pair.segmentA),pb=pair.obstacle?solidPoints(pair.obstacle):pointsFor(pair.routeB,pair.segmentB),radiusA=pair.routeA.radiusM+3e-6,radiusB=pair.routeB?pair.routeB.radiusM+3e-6:0;
   for(const axisIndex of [1,0,2]){const A=projection(pa,left,pair.routeA,pair.segmentA,axisIndex),B=projection(pb,right,pair.obstacle||pair.routeB,pair.segmentB,axisIndex);if(!A||!B||Math.max(A[0]-B[1],B[0]-A[1])-radiusA-radiusB-Math.max(pair.routeA.clearanceM||0,pair.routeB?.clearanceM||0)<=minimumMarginM)continue;const axis=projectionAxes[axisIndex].toArray();return {axis,rangeA:A,rangeB:B,radiusUpperBoundA:radiusA,...(pair.routeB?{radiusUpperBoundB:radiusB}:{}),...(pair.sourceArcA?{sectionA:{startLengthM:pair.sourceArcA[0],endLengthM:pair.sourceArcA[1]}}:{}),...(pair.sourceArcB?{sectionB:{startLengthM:pair.sourceArcB[0],endLengthM:pair.sourceArcB[1]}}:{}),projectionFrames:{mid:{axis,origin:projectionOrigin.toArray()}},basis:'Whole operating-domain projection bounds of this actual segment/solid. Body X uses extrema of x·cos(trim)−y·sin(trim); body Y uses the analytic coupled trim constraint cos(cant)·|sin(trim)|≤clearance/halfwidth. Body Z uses exact sine/cosine extrema for pitch attachments and interval products of the complete pitch/roll rotation for bank attachments. All rendered vertices lie in the stated range; tube radii are subtracted separately.'};}
   const ends=new Set([...groups].filter(x=>x&&x!=='body').map(x=>Number(x.split(':')[1])));
   if(ends.size===1){const end=[...ends][0],b=byEnd.get(end),A=pitchProjection(pa,left,pair.routeA,pair.segmentA,end),B=pitchProjection(pb,right,pair.obstacle||pair.routeB,pair.segmentB,end);if(A&&B&&Math.max(A[0]-B[1],B[0]-A[1])-radiusA-radiusB-Math.max(pair.routeA.clearanceM||0,pair.routeB?.clearanceM||0)>minimumMarginM){const axis=b.pitchAxes[2].toArray();return {axis,rangeA:A,rangeB:B,radiusUpperBoundA:radiusA,...(pair.routeB?{radiusUpperBoundB:radiusB}:{}),...(pair.sourceArcA?{sectionA:{startLengthM:pair.sourceArcA[0],endLengthM:pair.sourceArcA[1]}}:{}),...(pair.sourceArcB?{sectionB:{startLengthM:pair.sourceArcB[0],endLengthM:pair.sourceArcB[1]}}:{}),projectionFrames:{mid:{axis,origin:b.origin}},basis:'The projection frame rotates with the bank pitch. Every pitch-attached or roll-attached point retains its local Z because roll is about that same Z axis. Body-fixed vertices have local projection A·sin(cant)+B·cos(cant); endpoints and stationary extrema bound the complete cant interval. Circular solids use their exact analytic support L·|axis·n|+R·sqrt(1−(axis·n)^2), maximized over that same interval, rather than a larger rectangular cross-section. Finite tube radii are subtracted separately.'};}}
   return null;
  }
  function stationaryBound({kind,record}){
   const rows=kind==='route'?(record.motionSpans||[]).filter(s=>!s.proofOnly):[record.motionModel];if(!rows.length||rows.some(m=>!group(m)))return Infinity;
   if(rows.every(m=>group(m)==='body')&&(kind==='obstacle'||motionSpansCoverRoute(record,rows)))return 0;
   const points=kind==='route'?record.points:solidPoints(record);return Math.max(...rows.map(m=>displacement(m,points,record)))+4e-6;
  }
  return {bound,witness,byEnd,stationaryBound};
 }
 const neutral=domain.flatMap(d=>[45,0]);
 try{
  if(!tracking){
   // This architecture explicitly has no postdeployment radiator actuator.
   // Confirm that its installed panels and routing stay identical under all
   // command extrema; the continuous zero-motion basis is familyBankPose's
   // fixed-after-deployment branch, not the finite regression angle list.
   const s=snapshot(neutral),audit=auditFlightRoutingSnapshot(s,{maxIssues}),ids=new Map(s.routes.map(r=>[r.id,r.points]));issues.push(...audit.issues);for(const values of [domain.flatMap(d=>[0,-1]),domain.flatMap(d=>[d.pitchMagnitudeDeg[1],1])]){const q=snapshot(values);issues.push(...q.additionalIssues);for(const r of q.routes){const a=ids.get(r.id);if(!a||a.length!==r.points.length||a.some((p,i)=>distance(p,r.points[i])>2e-5))issues.push({code:'fixed-radiator-domain-moved',routeId:r.id});}}
   return {ok:issues.length===0,issues,mode:'fixed-after-deployment',completeDomain:domain,counts:audit.counts,minimumClearanceM:audit.minimumClearanceM,certifiedCells:1,evaluatedCells:1,basis:'The installed architecture has no operating radiator root-cant/trim motion. Full-angle solar, CMG and terminal swept solids are audited simultaneously; route/kinematic regressions confirm the fixed family branch.'};
  }
  const initial=snapshot(neutral);independentBankProof=bankProjectionProof(initial);
  const unknown=[];for(const r of initial.routes){const rows=(r.motionSpans||[]).filter(s=>!s.proofOnly);if(!rows.length||rows.some(m=>!group(m)))unknown.push({code:'unverified-radiator-operating-motion',routeId:r.id,models:rows});}for(const o of initial.obstacles)if(!group(o.motionModel))unknown.push({code:'unverified-radiator-operating-motion',obstacleId:o.id,model:o.motionModel});
  if(initial.additionalIssueCount||unknown.length)return {ok:false,issues:[...initial.additionalIssues,...unknown],completeDomain:domain,evaluatedCells:0,certifiedCells:0};
  const stationaryBaseline=createRoutingStationaryCertificate(initial,{auditOptions:{maxIssues,collisionCache:cache}});
  if(!stationaryBaseline.ok)return {ok:false,issues:stationaryBaseline.issues,completeDomain:domain,evaluatedCells:0,certifiedCells:0};
  // The law jumps from a 90° limiting arc to the 105° stop when the panel
  // reaches its full-clearance cant. Split that boundary explicitly: the
  // lower closed cell covers |roll|≤90°, the upper covers the complete stop.
  const critical=Math.acos(Math.max(0,Math.min(1,limits.bankClearanceY/limits.bankHalfWidthM)))/DEG,parts=d=>{const [a,b]=d.pitchMagnitudeDeg;if(d.bankEnd<0&&!limits.upperTrimEnabled)return [{lo:a,hi:b,branch:'limited'}];const out=[];if(a<Math.min(b,critical))out.push({lo:a,hi:Math.min(b,critical),branch:'limited'});if(b>=Math.max(a,critical))out.push({lo:Math.max(a,critical),hi:b,branch:'free'});return out;};
  let pending;
  if(independentBankProof.ok)pending=domain.flatMap((d,index)=>parts(d).map(p=>{const lo=[...neutral],hi=[...neutral];lo[2*index]=p.lo;hi[2*index]=p.hi;lo[2*index+1]=-1;hi[2*index+1]=1;return {lo,hi,depth:0,bankEnd:d.bankEnd,trimBranches:{[d.bankEnd]:p.branch}};}));
  else{pending=[{lo:[],hi:[],depth:0,trimBranches:{}}];for(const d of domain)pending=pending.flatMap(cell=>parts(d).map(p=>({...cell,lo:[...cell.lo,p.lo,-1],hi:[...cell.hi,p.hi,1],trimBranches:{...cell.trimBranches,[d.bankEnd]:p.branch}})));}
  while(pending.length){
   if(evaluatedCells>=maxCells){issues.push({code:'radiator-pointing-cell-budget',maxCells,pendingCells:pending.length,message:'Uncertified operating cells remain a release blocker.'});break;}
   const cell=pending.pop(),values=cell.lo.map((v,i)=>(v+cell.hi[i])/2),s=snapshot(values,cell),motion=motionContext(cell,s),audit=auditRoutes(s.routes,s.obstacles,{maxIssues,collisionCache:cache,collectMotionPairs:true,pairMotionBound:motion.bound,pairSeparationLowerBound:motion.witness,stationaryCertificate:stationaryBaseline.certificate,stationaryMotionBound:motion.stationaryBound,stationaryMotionBasis:'Every snapshot is fully deployed. Only complete route spans and physical solids whose registered operating group is body-fixed may reuse the full neutral-attitude baseline. Their actual geometry, connector datums and inventory must match it exactly. Every radiator-carried participant remains active under its complete cell pitch/roll displacement bound.',snapshotEvidence:s,expectedRouteIds:s.expectedRouteIds,expectedObstacleIds:s.expectedObstacleIds});evaluatedCells++;maximumDepth=Math.max(maximumDepth,cell.depth);baselineCounts??=audit.counts;minimumClearanceM=Math.min(minimumClearanceM,audit.minimumClearanceM);
   onCell?.({cell,attitude:s.attitude,minimumCertificateMarginM:audit.minimumCertificateMarginM,worstPairs:audit.motionPairs.filter(p=>p.certificateLowerM<=minimumMarginM).sort((a,b)=>a.certificateLowerM-b.certificateLowerM).slice(0,8)});
   if(s.additionalIssueCount||!audit.ok){issues.push(...s.additionalIssues,...audit.issues.map(i=>({...i,attitude:s.attitude})));break;}
   if(audit.minimumCertificateMarginM>minimumMarginM){minimumCertificateMarginM=Math.min(minimumCertificateMarginM,audit.minimumCertificateMarginM);accepted.push({lo:cell.lo,hi:cell.hi,bankEnd:cell.bankEnd,trimBranches:cell.trimBranches,minimumMarginM:audit.minimumCertificateMarginM});}
   else if(cell.depth>=maxDepth){issues.push({code:'unresolved-radiator-pointing-cell',cell:{lo:cell.lo,hi:cell.hi},minimumCertificateMarginM:audit.minimumCertificateMarginM,worstPairs:audit.motionPairs.filter(p=>p.certificateLowerM<=minimumMarginM).sort((a,b)=>a.certificateLowerM-b.certificateLowerM).slice(0,8)});break;}
   else{let split=0,weight=-Infinity;for(const [j,d]of domain.entries()){const a=cell.lo[2*j],b=cell.hi[2*j],q0=cell.lo[2*j+1],q1=cell.hi[2*j+1],branch=cell.trimBranches?.[d.bankEnd],low=trimAt(a,d,branch),high=trimAt(b,d,branch),weights=[b-a+Math.max(Math.abs(q0),Math.abs(q1))*(high-low),(q1-q0)*high];for(let k=0;k<2;k++)if(weights[k]>weight){weight=weights[k];split=2*j+k;}}const middle=(cell.lo[split]+cell.hi[split])/2,left={...cell,lo:[...cell.lo],hi:[...cell.hi],depth:cell.depth+1},right={...cell,lo:[...cell.lo],hi:[...cell.hi],depth:cell.depth+1};left.hi[split]=middle;right.lo[split]=middle;pending.push(right,left);}
   if(evaluatedCells===1||evaluatedCells%10===0)onProgress('Radiator pointing: '+accepted.length+' certified cells, '+pending.length+' unresolved cells.');
  }
  return {ok:issues.length===0&&!pending.length,issues,completeDomain:domain,independentBankProof:{ok:independentBankProof.ok,pairs:independentBankProof.pairs,ranges:[...independentBankProof.ranges],basis:independentBankProof.basis},certifiedCells:accepted.length,evaluatedCells,maximumDepth,minimumCertificateMarginM,minimumClearanceM,counts:baselineCounts,cells:accepted,basis:'Independent pitch × normalized-roll parameter cells for every installed bank. For any vector of radius r, displacement is at most r·min(2,|Δpitch|+|Δroll|); continuous monotone trim limits bound each cell, including the discontinuous 90°→105° branch. Shared rigid attachments retain exact relative separation; unknown/deforming cross-frame metadata fails. Full solar tracking and CMG/terminal swept solids remain in every cell. Independent two-dimensional scans are used only when a global projection proof separates every pair of moving banks; otherwise the complete Cartesian product is subdivided.'};
 }finally{factory.positionPanels(1);}
}
