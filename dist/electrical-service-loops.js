import {roundedConnectionRoute,routeLength} from './connection-routes.js';
import {routeClearance,auditRoutes,simplifyCollisionPolyline} from './routing-audit.js';
import {serviceRoutingPresets} from './routing-service-presets.js';
const presets=new Map(serviceRoutingPresets.map(x=>[x.key,x.allocation]));
export const serviceRoutingObservations=new Map();

const add=(a,b,k=1)=>a.map((x,i)=>x+k*b[i]),sub=(a,b)=>add(a,b,-1),norm=a=>Math.hypot(...a),unit=a=>a.map(x=>x/(norm(a)||1)),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
function compact(input){const points=[];for(const p of input){if(points.length&&norm(sub(p,points.at(-1)))<1e-8)continue;while(points.length>1&&dot(unit(sub(points.at(-1),points.at(-2))),unit(sub(p,points.at(-1))))>1-1e-12)points.pop();points.push([...p]);}return points;}

// A reservoir is a translated middle portion between two opposite parallel
// legs. Translating it by d/2 lengthens the legs by d. A connector withdrawal
// shortens its straight lead by d, so every circular fillet, its angle and the
// developed cable length remain unchanged. This is an allocated free service
// loop, not an elastic cable or a telescoping tube.
export function matingReservoirCandidates(input){
 const controls=compact(input),edges=controls.slice(1).map((p,i)=>unit(sub(p,controls[i]))),candidates=[];
 for(let first=0;first<edges.length;first++)for(let last=first+2;last<edges.length;last++)if(dot(edges[first],edges[last])<-1+1e-12)candidates.push({controls,first:first+1,last,axis:edges[first]});
 return candidates.sort((a,b)=>(a.last-a.first)-(b.last-b.first));
}

export function sampleMatingReservoir(allocation,{fromWithdrawalM=0,toWithdrawalM=0}={}){
 const {controls,first,last,axis,bendRadiusM,fromNormal,toNormal,fromPrefixLast=0,toSuffixFirst=controls.length-1}=allocation,points=controls.map(p=>[...p]),shift=(fromWithdrawalM+toWithdrawalM)/2;
 for(let i=first;i<=last;i++)points[i]=add(points[i],axis,shift);
 for(let i=0;i<=fromPrefixLast;i++)points[i]=add(points[i],fromNormal,fromWithdrawalM);
 for(let i=toSuffixFirst;i<points.length;i++)points[i]=add(points[i],toNormal,toWithdrawalM);
 return {...roundedConnectionRoute(points,bendRadiusM),controlPoints:points};
}

// Grid proposals may differ by a few nanometres at an otherwise parallel
// leg. Correct the actual controls, rather than relaxing the affine proof.
// Fixed endpoint positions and the supplied physical normals remain exact.
export function alignedMatingReservoirCandidates(allocation,{maxAdjustmentM=1e-7}={}){
 const original=allocation.controls;if(!Array.isArray(original)||original.length<3||!Number.isFinite(maxAdjustmentM)||maxAdjustmentM<=0)return[];
 const firstEdge=unit(sub(original[allocation.first],original[allocation.first-1])),lastEdge=unit(sub(original[allocation.last+1],original[allocation.last])),axes=[allocation.axis,lastEdge.map(x=>-x),allocation.fromNormal,allocation.toNormal].filter(a=>Array.isArray(a)&&norm(a)>0).map(a=>{const u=unit(a);return dot(u,firstEdge)<0?u.map(x=>-x):u;}).filter(a=>norm(sub(a,firstEdge))<1e-5),results=[],seen=new Set();
 for(const axis of axes){const key=axis.map(x=>x.toPrecision(16)).join(',');if(seen.has(key))continue;seen.add(key);const points=original.map(p=>[...p]),constraints=new Map(),fromCut=allocation.fromPrefixLast??0,toCut=allocation.toSuffixFirst??(points.length-1),coefficients=points.map((_,i)=>{const middle=i>=allocation.first&&i<=allocation.last?axis.map(x=>x/2):[0,0,0];return {from:add(middle,i<=fromCut?allocation.fromNormal:[0,0,0]),to:add(middle,i>=toCut?allocation.toNormal:[0,0,0])};});let compatible=true;
  const constrain=(i,d)=>{if(norm(d)<1e-12)return;let u=unit(d);if(dot(u,sub(original[i+1],original[i]))<0)u=u.map(x=>-x);const prior=constraints.get(i);if(prior&&norm(sub(prior,u))>2e-10){compatible=false;return;}constraints.set(i,u);};
  for(let i=0;i<points.length-1;i++){constrain(i,sub(coefficients[i+1].from,coefficients[i].from));constrain(i,sub(coefficients[i+1].to,coefficients[i].to));}
  constrain(0,allocation.fromNormal);constrain(points.length-2,allocation.toNormal.map(x=>-x));if(!compatible)continue;
  for(let pass=0;pass<96;pass++){let largest=0;for(const [i,u]of constraints){const edge=sub(points[i+1],points[i]),error=sub(edge,u.map(x=>x*dot(edge,u))),m=norm(error);largest=Math.max(largest,m);if(m<1e-15)continue;const leftFixed=i===0,rightFixed=i+1===points.length-1;if(leftFixed&&rightFixed){compatible=false;break;}if(leftFixed)points[i+1]=add(points[i+1],error,-1);else if(rightFixed)points[i]=add(points[i],error);else{points[i]=add(points[i],error,.5);points[i+1]=add(points[i+1],error,-.5);}}
   if(!compatible||Math.max(...points.map((p,i)=>norm(sub(p,original[i]))))>maxAdjustmentM){compatible=false;break;}if(largest<1e-14)break;
  }
  const maximumAdjustmentM=Math.max(...points.map((p,i)=>norm(sub(p,original[i]))));if(!compatible||maximumAdjustmentM>maxAdjustmentM||constraints.size===0)continue;
  if([...constraints].some(([i,u])=>norm(sub(sub(points[i+1],points[i]),u.map(x=>x*dot(sub(points[i+1],points[i]),u))))>Math.max(2e-14,norm(sub(points[i+1],points[i]))*1e-12)))continue;
  results.push({...allocation,controls:points,axis,controlAlignment:{maximumAdjustmentM,limitM:maxAdjustmentM,basis:'Bounded geometric projection onto common reservoir and physical terminal directions; both endpoint positions are fixed. Original affine, bend, length and full current-geometry checks remain mandatory.'}});
 }
 return results;
}

/** Planning solids for the complete two-plug withdrawal rectangle.
 * Every control is affine in the two strokes. Parallel edge increments and
 * an all-domain tangent budget keep every circular fillet rigid; each drawn
 * segment therefore stays in the hull of its eight endpoint extrema.
 */
export function matingReservoirSweptObstacles(allocation,{id,radiusM,clearanceM=.002,bufferToleranceM=2e-5}={}){
 const fail=(reason,detail={})=>({ok:false,obstacles:[],issues:[{code:'unresolved-service-reservoir-sweep',routeId:id,reason,...detail}]});
 const c=allocation?.controls,R=allocation?.bendRadiusM,F=allocation?.fromTravelM??0,T=allocation?.toTravelM??0,first=allocation?.first,last=allocation?.last,fromCut=allocation?.fromPrefixLast??0,toCut=allocation?.toSuffixFirst??(c?.length-1),axis=allocation?.axis,fromNormal=allocation?.fromNormal,toNormal=allocation?.toNormal;
 const finitePoint=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite),unitDirection=p=>finitePoint(p)&&Math.abs(norm(p)-1)<1e-8;
 if(typeof id!=='string'||!id||!Array.isArray(c)||c.length<3||!c.every(finitePoint)||![R,radiusM,clearanceM,bufferToleranceM,F,T].every(Number.isFinite)||R<=0||radiusM<=0||clearanceM<0||bufferToleranceM<=0||F<0||T<0||!unitDirection(axis)||!unitDirection(fromNormal)||!unitDirection(toNormal)||![first,last,fromCut,toCut].every(Number.isInteger)||first<1||last<first||last>=c.length-1||fromCut<0||fromCut>=c.length||toCut<0||toCut>=c.length)return fail('invalid-allocation-domain');
 const coordinateRoundoffM=64*Number.EPSILON*(1+Math.max(...c.map(norm))+F+T),coefficients=c.map((_,i)=>{const middle=i>=first&&i<=last?axis.map(x=>x/2):[0,0,0];return {from:add(middle,i<=fromCut?fromNormal:[0,0,0]),to:add(middle,i>=toCut?toNormal:[0,0,0])};}),edges=[],trims=c.map(()=>0);let fromLengthSlope=0,toLengthSlope=0,maximumNumericalErrorM=coordinateRoundoffM,minimumTangentBudgetM=Infinity;
 for(let i=0;i<c.length-1;i++){
  const edge=sub(c[i+1],c[i]),length=norm(edge);if(length<=1e-8)return fail('collapsed-control-edge',{edge:i});const u=unit(edge),da=sub(coefficients[i+1].from,coefficients[i].from),db=sub(coefficients[i+1].to,coefficients[i].to),a=dot(da,u),b=dot(db,u),ra=norm(sub(da,u.map(x=>x*a))),rb=norm(sub(db,u.map(x=>x*b)));
  // Larger transverse increments are a changing-angle mechanism, not an
  // affine reservoir. Tiny Float64 projection residuals are explicitly
  // bounded below and included in the final enclosure padding.
  if(ra>1e-10||rb>1e-10)return fail('non-affine-edge-direction',{edge:i,fromResidual:ra,toResidual:rb});
  const minimumLengthM=length+Math.min(0,a*F)+Math.min(0,b*T);if(minimumLengthM<=1e-8)return fail('control-edge-reverses-within-stroke',{edge:i,minimumLengthM});
  const transverseM=ra*F+rb*T,directionError=2*(transverseM+coordinateRoundoffM)/minimumLengthM+32*Number.EPSILON;edges.push({u,minimumLengthM,directionError});fromLengthSlope+=a;toLengthSlope+=b;
 }
 if(Math.abs(fromLengthSlope)*F+Math.abs(toLengthSlope)*T>1e-8)return fail('developed-length-not-conserved',{fromLengthSlope,toLengthSlope});
 for(let i=1;i<c.length-1;i++){
  const before=edges[i-1],after=edges[i],angle=Math.acos(Math.max(-1,Math.min(1,dot(before.u,after.u)))),variation=2*(before.directionError+after.directionError)+16*Number.EPSILON/Math.max(1e-8,Math.sin(angle));
  if(angle+variation<1e-5)continue;
  if(angle-variation<1e-5||angle+variation>Math.PI-1e-4)return fail('unresolved-turn-topology',{corner:i,angle,variation});
  const tangent=Math.tan((angle+variation)/2);trims[i]=R*tangent;
  const steps=a=>Math.max(2,Math.ceil(8*a/(Math.PI/2)-1e-10));if(steps(angle-variation)!==steps(angle+variation))return fail('non-affine-fillet-subdivision',{corner:i});
  const minSine=Math.min(Math.sin(angle-variation),Math.sin(angle+variation)),normalError=2*(before.directionError+after.directionError+variation)/minSine,axisError=2*(before.directionError+after.directionError+before.directionError*after.directionError)/minSine,trimError=R*.5*(1+tangent*tangent)*variation;
  maximumNumericalErrorM=Math.max(maximumNumericalErrorM,trimError+trims[i]*before.directionError+2*R*normalError+4*R*axisError+R*variation);
 }
 for(let i=0;i<edges.length;i++){const budget=.98*edges[i].minimumLengthM-trims[i]-trims[i+1];minimumTangentBudgetM=Math.min(minimumTangentBudgetM,budget);if(budget<0)return fail('fillet-radius-would-change-within-stroke',{edge:i,minimumTangentBudgetM:budget});}
 if(!Number.isFinite(maximumNumericalErrorM)||maximumNumericalErrorM>bufferToleranceM/4)return fail('roundoff-enclosure-unresolved',{maximumNumericalErrorM,bufferToleranceM});
 const strokes=[[0,0],[F,0],[0,T],[F,T]],shapes=strokes.map(([fromWithdrawalM,toWithdrawalM])=>sampleMatingReservoir(allocation,{fromWithdrawalM,toWithdrawalM})),base=shapes[0].points;
 if(shapes.some(s=>s.bendLimited||s.points.length!==base.length||!s.points.every(finitePoint)))return fail('sampled-construction-is-not-affine');
 let maximumCornerResidualM=0;for(let i=0;i<base.length;i++)maximumCornerResidualM=Math.max(maximumCornerResidualM,norm(sub(shapes[3].points[i],add(shapes[1].points[i],sub(shapes[2].points[i],base[i])))));
 const midpoint=sampleMatingReservoir(allocation,{fromWithdrawalM:F/2,toWithdrawalM:T/2});if(midpoint.points.length!==base.length)return fail('sampled-construction-topology-changes');for(let i=0;i<base.length;i++)maximumCornerResidualM=Math.max(maximumCornerResidualM,norm(sub(midpoint.points[i],add(base[i],add(sub(shapes[1].points[i],base[i]),sub(shapes[2].points[i],base[i])),.5))));
 if(maximumCornerResidualM>Math.max(1e-9,maximumNumericalErrorM*4))return fail('sampled-construction-disagrees-with-affine-proof',{maximumCornerResidualM,maximumNumericalErrorM});
 // Three's jacket vertices are Float32. Their quantization is bounded from
 // the largest all-domain centreline coordinate plus jacket radius. Ordinary
 // spacecraft coordinates retain the configured20um floor; a large absolute
 // coordinate cannot silently receive a smaller-than-one-ulp reservation.
 const maximumCoordinateM=[0,1,2].map(k=>Math.max(...shapes.flatMap(s=>s.points.map(p=>Math.abs(p[k]))))+radiusM+maximumNumericalErrorM+maximumCornerResidualM),bufferQuantizationBoundM=Math.hypot(...maximumCoordinateM.map(x=>x*2**-23+2**-149)),bufferPaddingM=Math.max(bufferToleranceM,bufferQuantizationBoundM);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],coordinateAxes=[[1,0,0],[0,1,0],[0,0,1]],paddingM=radiusM+clearanceM+bufferPaddingM+maximumNumericalErrorM+maximumCornerResidualM,obstacles=[];let stationarySegments=0,maximumDisplacementM=0;
 for(let i=0;i<base.length-1;i++){
  const points=shapes.flatMap(s=>[s.points[i],s.points[i+1]]),a=base[i],b=base[i+1],movement=Math.max(...shapes.flatMap(s=>[norm(sub(s.points[i],a)),norm(sub(s.points[i+1],b))]));maximumDisplacementM=Math.max(maximumDisplacementM,movement);const common={id:id+':service-sweep:'+i,lineId:id,ownerRouteId:id,sourceSegment:i,serviceReservoirSweep:true};
  if(movement<=1e-10){const radius=paddingM+movement;obstacles.push({...common,type:'capsule',a:[...a],b:[...b],radiusM:radius,bounds:{min:a.map((v,k)=>Math.min(v,b[k])-radius),max:a.map((v,k)=>Math.max(v,b[k])+radius)}});stationarySegments++;continue;}
  const u=norm(sub(b,a))>1e-12?unit(sub(b,a)):[1,0,0];let perpendicular=[0,0,0];for(const p of points){const d=sub(p,a),candidate=sub(d,u.map(x=>x*dot(d,u)));if(norm(candidate)>norm(perpendicular))perpendicular=candidate;}
  if(norm(perpendicular)<1e-10){const reference=coordinateAxes.slice().sort((x,y)=>Math.abs(dot(x,u))-Math.abs(dot(y,u)))[0];perpendicular=sub(reference,u.map(x=>x*dot(reference,u)));}
  const w=unit(cross(u,unit(perpendicular))),v=unit(cross(w,u)),axes=[u,v,w],low=axes.map(axis=>Math.min(...points.map(p=>dot(p,axis)))),high=axes.map(axis=>Math.max(...points.map(p=>dot(p,axis)))),halfSize=low.map((x,k)=>(high[k]-x)/2+paddingM),center=[0,1,2].map(k=>axes.reduce((s,axis,j)=>s+axis[k]*(low[j]+high[j])/2,0)),extent=[0,1,2].map(k=>axes.reduce((s,axis,j)=>s+Math.abs(axis[k])*halfSize[j],0));obstacles.push({...common,type:'obb',center,axes,halfSize,bounds:{min:sub(center,extent),max:add(center,extent)}});
 }
 return {ok:true,issues:[],obstacles,proof:{fromTravelM:F,toTravelM:T,sourceSegments:base.length-1,stationarySegments,movingSegments:obstacles.length-stationarySegments,maximumDisplacementM,minimumTangentBudgetM,maximumNumericalErrorM,maximumCornerResidualM,coordinateRoundoffM,bufferQuantizationBoundM,bufferPaddingM,paddingM,basis:'Analytic affine control coefficients, constant edge directions and full-stroke tangent budgets keep every fillet at its allocated radius. Every centreline segment lies in the convex hull of its two endpoints at the four withdrawal extremes; oriented boxes enclose that hull plus jacket, allocated clearance and bounded Float64/Float32 numerical padding. Fixed segments retain capsules. No isotropic stroke inflation is used.'}};
}

export function allocateMatingReservoir(input,{id,bendRadiusM,radiusM,fromNormal,toNormal,fromTravelM=0,toTravelM=0,obstacles=[],otherRoutes=[],clearanceM=.002,allowNewLoop=true,allowEndpointExtension=true}={}){
 const originalOtherRoutes=otherRoutes;otherRoutes=otherRoutes.map(r=>({...r,points:simplifyCollisionPolyline(r.points,2e-6),radiusM:r.radiusM+2e-6}));
 const controls=compact(input),candidates=matingReservoirCandidates(controls),axes=[[1,0,0],[0,1,0],[0,0,1]];
 const cacheKey=JSON.stringify([controls,bendRadiusM,radiusM,unit(fromNormal),unit(toNormal),fromTravelM,toTravelM,clearanceM]),legacyKey=JSON.stringify([controls,bendRadiusM,radiusM,unit(sub(controls[1],controls[0])),unit(sub(controls.at(-2),controls.at(-1))),fromTravelM,toTravelM,clearanceM]),cached=[...new Set([cacheKey,legacyKey])].map(key=>serviceRoutingObservations.get(key)?.allocation||presets.get(key)).filter(Boolean);
 const cornerTrim=index=>{if(index<=0)return fromTravelM;if(index>=controls.length-1)return toTravelM;const before=unit(sub(controls[index],controls[index-1])),after=unit(sub(controls[index+1],controls[index]));return bendRadiusM*Math.tan(Math.acos(Math.max(-1,Math.min(1,dot(before,after))))/2);};
 if(allowNewLoop)for(let i=0;i<controls.length-1;i++){
  const a=controls[i],b=controls[i+1],u=unit(sub(b,a)),length=norm(sub(b,a)),R=bendRadiusM;
  // Oblique corners consume different tangent lengths at the two ends.
  // Reserve those actual trims before adding the two 90-degree loop corners.
  const tangentLeads=[Math.max(R*2.1,cornerTrim(i)+R+.005),Math.max(R*2.1,cornerTrim(i+1)+R+.005)],leads=[... [2.1,3.2,4.5].map(f=>[R*f,R*f]),tangentLeads],available=length-tangentLeads[0]-tangentLeads[1];
  // A long tray span does not need a loop along its entire length. Allocate
  // a compact reservoir inside a free local bay, with the same full-radius
  // tangent and constant-length construction. This is especially important
  // when plumbing crosses above a different part of the straight run.
  for(const width of [2.2,3.2,4.5].map(f=>R*f))if(width<available-1e-8)for(const fraction of [0,1,.5,.25,.75]){const leadA=tangentLeads[0]+(available-width)*fraction;leads.push([leadA,length-leadA-width]);}
  for(const [leadA,leadB] of leads){
  if(length<leadA+leadB+R*2.1)continue;
  const perpendicular=axes.map(v=>sub(v,u.map(x=>x*dot(v,u)))).filter(v=>norm(v)>1e-6).map(unit);
  for(const v of perpendicular)for(const sign of [-1,1])for(const height of [R*2.15,R*3,R*4]){
   const x=add(a,u,leadA),y=add(b,u,-leadB),direction=v.map(x=>x*sign),insert=[...controls.slice(0,i+1),x,add(x,direction,height),add(y,direction,height),y,...controls.slice(i+1)];
   candidates.push(...matingReservoirCandidates(insert).filter(c=>dot(c.axis,direction)>.999999));
  }
  }
 }
 let failure={reason:'no-clear-service-reservoir'};
 const variants=[...cached,...candidates,...[-.03,-.06,.03,.06,.12].flatMap(offset=>candidates.map(candidate=>({...candidate,controls:candidate.controls.map((p,i)=>i>=candidate.first&&i<=candidate.last?add(p,candidate.axis,offset):[...p]),allocatedRoofOffsetM:offset})))];
 for(const candidate of variants){
  if(norm(sub(candidate.controls[0],controls[0]))>1e-9||norm(sub(candidate.controls.at(-1),controls.at(-1)))>1e-9)continue;
  const c=candidate.controls,edges=c.slice(1).map((p,i)=>unit(sub(p,c[i]))),fromCuts=fromTravelM?edges.flatMap((v,i)=>dot(v,unit(fromNormal))>1-1e-12?[i]:[]):[0],toCuts=toTravelM?edges.flatMap((v,i)=>dot(v,unit(toNormal))<-1+1e-12?[i+1]:[]).reverse():[c.length-1];
  // The installed baseline is identical for every endpoint cut pair. Screen
  // it once before considering how the two plugs consume its slack.
  const candidateBaseline=roundedConnectionRoute(c,bendRadiusM);
  if(candidateBaseline.bendLimited){failure={reason:'reservoir-bend-or-length'};continue;}
  const baselineClearance=routeClearance({id,points:candidateBaseline.points,radiusM,clearanceM},obstacles,{otherRoutes});if(!baselineClearance.ok){failure={reason:'reservoir-clearance',...baselineClearance};continue;}
  const baselineAudit=auditRoutes([{id,points:candidateBaseline.points,radiusM,from:{position:candidateBaseline.points[0],normal:unit(fromNormal)},to:{position:candidateBaseline.points.at(-1),normal:unit(toNormal)}}],[],{maxIssues:1});if(!baselineAudit.ok){failure={reason:'reservoir-bend-or-length',issues:baselineAudit.issues};continue;}
  for(const fromPrefixLast of fromCuts)for(const toSuffixFirst of toCuts){
  const originalAllocation={...candidate,bendRadiusM,fromNormal:unit(fromNormal),toNormal:unit(toNormal),fromTravelM,toTravelM,fromPrefixLast,toSuffixFirst},originalSweep=matingReservoirSweptObstacles(originalAllocation,{id,radiusM,clearanceM});
  for(const allocation of [originalAllocation,...(!originalSweep.ok?alignedMatingReservoirCandidates(originalAllocation):[])]){
  const baseline=allocation===originalAllocation?candidateBaseline:roundedConnectionRoute(allocation.controls,bendRadiusM),restLengthM=baseline.lengthM;
  if(allocation!==originalAllocation){const screen=routeClearance({id,points:baseline.points,radiusM,clearanceM},obstacles,{otherRoutes}),self=auditRoutes([{id,points:baseline.points,radiusM,from:{position:baseline.points[0],normal:allocation.fromNormal},to:{position:baseline.points.at(-1),normal:allocation.toNormal}}],[],{maxIssues:1});if(baseline.bendLimited||!screen.ok||!self.ok){failure={reason:'aligned-reservoir-clearance-or-bend',screen,issues:self.issues};continue;}}
  // A few construction poses cannot establish fixed-angle behaviour over
  // both independent plug strokes. Reject non-affine cuts here, while later
  // cut pairs and reservoir placements are still available to the search.
  // The returned enclosure is only a planning reservation; actual motion
  // clearance is independently certified against the rendered geometry.
  const swept=allocation===originalAllocation?originalSweep:matingReservoirSweptObstacles(allocation,{id,radiusM,clearanceM});
  if(!swept.ok){failure={reason:'reservoir-sweep-unresolved',issues:swept.issues};continue;}
  let ok=true;
  // These are construction screens. The publication certificate separately
  // proves the complete motion interval with the linear displacement bound.
  for(const [fa,ta] of [[.5,0],[1,0],[0,.5],[0,1],[1,1]]){
   if((fa&&!fromTravelM)||(ta&&!toTravelM))continue;
   const shape=sampleMatingReservoir(allocation,{fromWithdrawalM:fa*fromTravelM,toWithdrawalM:ta*toTravelM}),endpointAudit=auditRoutes([{id,points:shape.points,radiusM,minBendRadiusM:bendRadiusM,minimumBendRadiusM:shape.minimumBendRadiusM,bendRadiusBasis:'constructed-circular-fillets',renderedCenterlineMismatchM:0,restLengthM,lengthToleranceM:1e-6,from:{position:shape.points[0],normal:allocation.fromNormal},to:{position:shape.points.at(-1),normal:allocation.toNormal}}],[],{maxIssues:1});
   if(shape.bendLimited||!endpointAudit.ok||Math.abs(shape.lengthM-restLengthM)>1e-6){failure={reason:'reservoir-bend-or-length',issues:endpointAudit.issues};ok=false;break;}
   const clearance=routeClearance({id,points:shape.points,radiusM,clearanceM},obstacles,{otherRoutes});if(!clearance.ok){failure={reason:'reservoir-clearance',...clearance};ok=false;break;}
  }
  // Retain every neighboring installed route throughout the full two-plug
  // stroke rectangle. The affine enclosure already includes this cable's
  // jacket and the allocated clearance; the retained route contributes its
  // own conservative jacket radius. A few clear poses cannot replace this
  // reservation, especially when service loops are allocated after routing.
  if(ok)for(const route of otherRoutes){const screen=routeClearance({...route,clearanceM:0},swept.obstacles);if(!screen.ok){failure={reason:'service-sweep-crosses-retained-route',otherRouteId:route.id,...screen};ok=false;break;}}
  if(ok){serviceRoutingObservations.set(cacheKey,{key:cacheKey,allocation});return {ok:true,...allocation,restLengthM,baseline,sweepProof:swept.proof,linearDisplacementSpeedM:1.5*(fromTravelM+toTravelM),basis:'Opposed parallel service-loop legs. Endpoint translation consumes exactly the length released by translating the intervening fixed-angle circular-fillet span.'};}
  }
  }
 }
 // An oblique last corner may consume more than one bend radius of its
 // straight lead. Allocate additional physical lead before giving up: this
 // changes the installed cut length once, then the same constant-length
 // reservoir construction and complete clearance checks apply to its stroke.
 if(allowEndpointExtension&&controls.length>=4&&(fromTravelM||toTravelM))for(const factor of [1,2]){
  const extended=controls.map(p=>[...p]);extended[1]=add(extended[1],unit(fromNormal),fromTravelM*factor);extended[extended.length-2]=add(extended.at(-2),unit(toNormal),toTravelM*factor);
  const result=allocateMatingReservoir(extended,{id,bendRadiusM,radiusM,fromNormal,toNormal,fromTravelM,toTravelM,obstacles,otherRoutes:originalOtherRoutes,clearanceM,allowNewLoop,allowEndpointExtension:false});
  if(result.ok){const allocation={controls:result.controls,first:result.first,last:result.last,axis:result.axis,bendRadiusM,fromNormal:result.fromNormal,toNormal:result.toNormal,fromTravelM,toTravelM,fromPrefixLast:result.fromPrefixLast,toSuffixFirst:result.toSuffixFirst,endpointLeadExtensionM:[fromTravelM*factor,toTravelM*factor]};serviceRoutingObservations.set(cacheKey,{key:cacheKey,allocation});return {...result,endpointLeadExtensionM:allocation.endpointLeadExtensionM};}
 }
 return {ok:false,...failure,candidates:variants.length};
}
