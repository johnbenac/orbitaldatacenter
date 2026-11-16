import {roundedConnectionRoute} from './connection-routes.js';
import {auditRoutes,routeClearance,segmentSegmentDistance,
 simplifyCollisionPolyline} from './routing-audit.js';
import {starcatcherDataRouteProposals} from './starcatcher-data-route-proposals.js';

const axes=[0,1,2],point=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const distance=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]));
const parallel=(a,b)=>point(a)&&distance(a,b)<1e-8;
const compact=points=>points.filter((p,i)=>!i||distance(p,points[i-1])>1e-9);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const overlap=(a,b)=>axes.every(k=>a.max[k]>=b.min[k]&&a.min[k]<=b.max[k]);
const bounds=(points,pad=0)=>({min:axes.map(k=>Math.min(...points.map(p=>p[k]))-pad),
 max:axes.map(k=>Math.max(...points.map(p=>p[k]))+pad)});
const validBounds=b=>point(b?.min)&&point(b?.max)&&b.min.every((v,k)=>v<=b.max[k]);
const retainedProposals=new Map(starcatcherDataRouteProposals.map(row=>[row.id,row]));

export function retainedStarcatcherDataProposal(line,a,b,na,nb){
 const row=retainedProposals.get(line?.id);
 if(!row||!parallel(a,row.from)||!parallel(b,row.to)||
    !parallel(na,row.fromNormal)||!parallel(nb,row.toNormal)||
    Math.abs(line.radiusM-row.radiusM)>1e-12||
    Math.abs(line.bendRadiusM-row.bendRadiusM)>1e-12)return null;
 return row.controlPoints.map(p=>[...p]);
}

function occupiedIndex(routes){
 const segments=[];
 for(const route of routes){
  if(!Array.isArray(route.points)||!route.points.every(point)||
     !Number.isFinite(route.radiusM)||route.radiusM<0)return null;
  const deviationM=2e-6,points=simplifyCollisionPolyline(route.points,deviationM);
  for(let i=1;i<points.length;i++)segments.push({a:points[i-1],b:points[i],
   route,index:i-1,deviationM,bounds:bounds([points[i-1],points[i]],
    route.radiusM+(route.clearanceM||0)+deviationM)});
 }
 function build(rows){
  if(!rows.length)return null;
  const bb={min:axes.map(k=>Math.min(...rows.map(s=>s.bounds.min[k]))),
   max:axes.map(k=>Math.max(...rows.map(s=>s.bounds.max[k])))};
  if(rows.length<=8)return {bounds:bb,rows};
  const axis=axes.reduce((a,b)=>bb.max[b]-bb.min[b]>bb.max[a]-bb.min[a]?b:a,0);
  rows.sort((a,b)=>a.bounds.min[axis]+a.bounds.max[axis]-
   b.bounds.min[axis]-b.bounds.max[axis]);
  const middle=Math.floor(rows.length/2);
  return {bounds:bb,left:build(rows.slice(0,middle)),right:build(rows.slice(middle))};
 }
 return build(segments);
}

// Exact occupied-tube rejection before the complete normal planning screen.
// One immutable interval index per selection avoids rebuilding thousands of
// previously installed cable intervals for every bounded proposal. It can
// reject a candidate; only routeClearance below may accept one.
function occupiedFailure(route,tree){
 if(!tree)return null;
 for(let i=1;i<route.points.length;i++){
  const a=route.points[i-1],b=route.points[i],bb=bounds([a,b],route.radiusM+.002),stack=[tree];
  while(stack.length){
   const node=stack.pop();if(!overlap(bb,node.bounds))continue;
   if(!node.rows){stack.push(node.left,node.right);continue;}
   for(const segment of node.rows){
    if(!overlap(bb,segment.bounds))continue;
    const required=route.radiusM+segment.route.radiusM+segment.deviationM+
     Math.max(.002,segment.route.clearanceM||0),
     margin=segmentSegmentDistance(a,b,segment.a,segment.b).distanceM-required;
    if(margin<-1e-7)return {ok:false,minimumClearanceM:margin,clearanceM:margin,
     otherRouteId:segment.route.id,segments:[i-1,segment.index]};
   }
  }
 }
 return null;
}

export const starcatcherDataRoutingPolicy=Object.freeze({
 revision:'starcatcher-mounted-data-proposals-r1',clearanceM:.002,
 maximumCandidates:768,minimumTerminalStraightM:.045,
 roofLayerPitchM:.006,sourceFanPitchM:.008,
 scope:'Body-fixed worker and leaf/spine data routes. Complete proposals retain real exits, '+
  'full cable bend radii and ordinary current-solid/foreign-route admission. Connector '+
  'withdrawal and deployment are separate assessments.'
});

// These are bounded construction proposals, never qualified route records.
// The roof equipment has +Z plugs. Its forward face opens into an under-roof
// routing layer above the rack. Compute plugs are on +X, so worker routes
// descend in the actual inter-column side aisles and finish along -X. Lower
// target rows occupy the farther-out vertical lanes, clearing upper plugs.
export function starcatcherDataRouteCandidates(h,line,a,b,na,nb,{includeRetained=true}={}){
 if(h?.architectureFamilyId!=='heatlift-study'||
    h.input?.referenceCenterId!=='star-catcher-self-powered')return [];
 const worker=/^D-WORKER-(\d+)\/0$/.exec(line?.id||''),
  fabric=/^D-L(\d+)-S(\d+)\/([01])$/.exec(line?.id||''),
  recorder=line?.id==='D-recorder/0';
 if(!worker&&!fabric&&!recorder||!point(a)||!point(b)||
    !parallel(na,[0,0,1])||!parallel(nb,worker?[1,0,0]:[0,0,1])||
    !(line.radiusM>0&&line.bendRadiusM>0))return [];
 const rack=h.rackLayout;if(!rack?.slots?.length)return [];
 const slot=worker?rack.slots[Number(worker[1])-1]:null;
 if(worker&&(!slot||slot.index!==Number(worker[1])-1))return [];
 const R=line.bendRadiusM,r=line.radiusM,wall=Math.max(.018,
  Math.min(h.bodyWidthM,h.bodyHeightM,h.bodyLengthM)*.024),
  inner=[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM].map(v=>v/2-wall),
  rackTop=Math.max(...rack.slots.map(s=>s.y))+rack.slotDimensionsM[1]/2,
  lowerY=rackTop+.028,upperY=inner[1]-.31,
  row=slot?.row||0,bay=slot?.bay||0,leaf=fabric?Number(fabric[1])-1:
   worker?Math.floor((Number(worker[1])-1)/16):8,
  fiber=fabric?Number(fabric[3]):0,spine=fabric?Number(fabric[2])-1:0,
  sourceRank=clamp(Math.round((a[1]-(inner[1]-.225))/.032),0,5),
  baseLead=Math.max(2.7*R+.015,.09)+sourceRank*.033,
  trunkY=rackTop+.035+bay*.018,
  baseY=worker?upperY-.016:clamp(rackTop+.04+leaf*.010,lowerY,upperY),
  baseAisle=worker?b[0]+Math.max(.09,2.5*R+.015)+(rack.rows-1-row)*.008:0,
  proposals=[],seen=new Set();
 if(upperY-lowerY<2*r+.004)return [];
 const add=(controls,description)=>{
  controls=compact(controls);
  if(controls.some(p=>p.some((v,k)=>Math.abs(v)+r+.002>inner[k]+1e-9)))return;
  const key=controls.map(p=>p.map(v=>v.toFixed(9)).join(',')).join(';');
  if(seen.has(key)||proposals.length>=starcatcherDataRoutingPolicy.maximumCandidates)return;
  seen.add(key);proposals.push({controlPoints:controls,description});
 };
 const retained=includeRetained?retainedStarcatcherDataProposal(line,a,b,na,nb):null;
 if(retained)add(retained,{kind:'exact-interface-retained-proposal'});
 // The first candidates follow the bay/row allocation; later candidates stay
 // inside the same roof layer and side aisle. Their actual curved tubes, not
 // their control polygons or a guessed free corridor, are screened below.
 const shifts=[0,...Array.from({length:22},(_,i)=>(i+1)*.006)
   .flatMap(value=>[value,-value])],
  leadShifts=worker?[.078-baseLead,.084-baseLead,.096-baseLead,0,.024,.048]:
   [0,.096,.048,.12,.024,.072],aisleShifts=[0,.010,-.006],
  // Try the short source turns at each available height before lengthening
  // every neighboring lead. A long axial lead can be trapped by a previously
  // installed fan-out even when an earlier full-radius turn remains clear.
  // Interleaving keeps the finite budget from exhausting one lead family.
  choices=worker?shifts.flatMap(layerShift=>leadShifts.map(leadShift=>
   ({leadShift,layerShift}))):leadShifts.flatMap(leadShift=>shifts.map(layerShift=>
   ({leadShift,layerShift})));
 for(const {leadShift,layerShift} of choices){
  const y=baseY+layerShift;if(y<lowerY||y>upperY)continue;
  const za=a[2]+baseLead+leadShift;
  if(worker){
   for(const aisleShift of aisleShifts){
    const x=baseAisle+aisleShift;
    // The first fan-out may also be a shallow diagonal from the actual +Z
    // connector lead. This uses the open space in front of the switch bank
    // and avoids forcing every crossing through one horizontal comb plane.
    const diagonalStart=za+.23,diagonalFinish=za+.45;
    if(diagonalFinish<b[2]-2.2*R)add([a,[a[0],a[1],za],
     [x,y,diagonalStart],[x,trunkY,diagonalFinish],
     [x,trunkY,b[2]],[x,b[1],b[2]],b],
    {kind:'worker-sloping-source-fan',layerYM:y,trunkYM:trunkY,
     aisleXM:x,sourceFanZM:za,row,bay});
    const handoffStart=za+.12,handoffEnd=za+.34;
    if(handoffEnd<b[2]-2.2*R)add([a,[a[0],a[1],za],[a[0],y,za],[x,y,za],
     [x,y,handoffStart],[x,trunkY,handoffEnd],
     [x,trunkY,b[2]],[x,b[1],b[2]],b],
    {kind:'worker-roof-side-aisle',layerYM:y,trunkYM:trunkY,
     aisleXM:x,sourceFanZM:za,row,bay});
    // A shallow transfer accommodates sources close to a target aisle without
    // shortening either of two adjacent 30 mm fillets on a tiny X segment.
    const zTurn=za+.18,diagonalEnd=za+.40;
    if(diagonalEnd<b[2]-2.2*R)add([a,[a[0],a[1],za],[a[0],y,za],
     [x,y,zTurn],[x,trunkY,diagonalEnd],[x,trunkY,b[2]],
     [x,b[1],b[2]],b],
    {kind:'worker-oblique-roof-transfer',layerYM:y,trunkYM:trunkY,aisleXM:x,
     sourceFanZM:za,row,bay});
   }
  }else{
   const targetRank=clamp(Math.round((b[1]-(inner[1]-.225))/.032),0,5),
    zb=b[2]+Math.max(2.7*R+.015,.09)+targetRank*.033+
     (fabric?(leaf%3)*.008+fiber*.008:0)+leadShift;
   for(const fanShift of [0,.024,-.024]){
    const zFan=za+fanShift;
    if(Math.abs(a[2]-b[2])<1e-8){
     const zFront=Math.max(zFan,zb);
     add([a,[a[0],a[1],zFront],[a[0],y,zFront],
      [b[0],y,zFront],[b[0],b[1],zFront],b],
     {kind:'fabric-common-front-return',layerYM:y,sourceFanZM:zFront,
      targetFanZM:zFront,leaf,spine,fiber});
    }
    add([a,[a[0],a[1],zFan],[a[0],y,zFan],
     [b[0],y,zFan],[b[0],y,zb],[b[0],b[1],zb],b],
    {kind:recorder?'recorder-roof-return':'fabric-roof-transfer',
     layerYM:y,sourceFanZM:zFan,targetFanZM:zb,leaf,spine,fiber});
    if(Math.hypot(b[0]-a[0],zb-zFan)>2.2*R)add([a,[a[0],a[1],zFan],[a[0],y,zFan],
     [b[0],y,zb],[b[0],b[1],zb],b],
    {kind:'fabric-oblique-roof-transfer',layerYM:y,
     sourceFanZM:zFan,targetFanZM:zb,leaf,spine,fiber});
   }
  }
 }
 return proposals;
}

// This helper proposes a route only after screening current finite solids and
// occupied tubes. The caller still passes it through planElectricalRoute's
// normal admission. Failure retains diagnostics and supplies no fallback path.
export function selectStarcatcherDataRoute(h,line,a,b,na,nb,
 {obstacles=[],otherRoutes=[],maximumCandidates=starcatcherDataRoutingPolicy.maximumCandidates,
  includeRetained=true}={}){
 const candidates=starcatcherDataRouteCandidates(h,line,a,b,na,nb,{includeRetained}),
  diagnostics={id:line?.id,generated:candidates.length,attempted:0,
   rejected:{bend:0,endpointOrSelf:0,solid:0,occupied:0},lastFailure:null};
 if(!candidates.length)return {applicable:false,ok:false,controlPoints:null,diagnostics};
 if(!Array.isArray(obstacles)||!Array.isArray(otherRoutes)||
    !Number.isInteger(maximumCandidates)||maximumCandidates<1)return {
  applicable:true,ok:false,controlPoints:null,diagnostics:{...diagnostics,
   lastFailure:{reason:'invalid-data-planning-context'}}};
 const selectionEnvelope=bounds(candidates.flatMap(row=>row.controlPoints),line.radiusM+.002),
  selectionObstacles=obstacles.filter(o=>!validBounds(o.bounds||o)||
   overlap(selectionEnvelope,o.bounds||o)),
  foreign=otherRoutes.filter(r=>r.id!==line.id).map(route=>({route,
  bounds:Array.isArray(route.points)&&route.points.every(point)?
   bounds(route.points,(route.radiusM||0)+(route.clearanceM||0)):null}))
   .filter(row=>!validBounds(row.bounds)||overlap(selectionEnvelope,row.bounds)),
  occupiedTree=occupiedIndex(foreign.map(row=>row.route));
 for(const proposal of candidates.slice(0,maximumCandidates)){
  diagnostics.attempted++;
  const shape=roundedConnectionRoute(proposal.controlPoints,line.bendRadiusM);
  if(shape.bendLimited){diagnostics.rejected.bend++;continue;}
  if(distance(shape.points[0],shape.points[1])<starcatcherDataRoutingPolicy.minimumTerminalStraightM-1e-9||
     distance(shape.points.at(-1),shape.points.at(-2))<starcatcherDataRoutingPolicy.minimumTerminalStraightM-1e-9){
   diagnostics.rejected.endpointOrSelf++;
   diagnostics.lastFailure={reason:'insufficient-seated-connector-straight',requiredM:
    starcatcherDataRoutingPolicy.minimumTerminalStraightM};continue;
  }
  const route={id:line.id,points:shape.points,radiusM:line.radiusM,clearanceM:.002,
   from:{position:a,normal:na},to:{position:b,normal:nb}};
  const ends=auditRoutes([route],[],{maxIssues:1,stopAfterFirstIssue:true});
  if(!ends.ok){diagnostics.rejected.endpointOrSelf++;diagnostics.lastFailure=ends.issues[0];continue;}
  const occupiedHit=occupiedFailure(route,occupiedTree);
  if(occupiedHit){diagnostics.rejected.occupied++;
   diagnostics.lastFailure=occupiedHit;continue;}
  const envelope=bounds(shape.points,line.radiusM+.002),
   near=selectionObstacles.filter(o=>!validBounds(o.bounds||o)||overlap(envelope,o.bounds||o)),
   occupied=foreign.filter(row=>!validBounds(row.bounds)||overlap(envelope,row.bounds)).map(row=>row.route),
   screen=routeClearance(route,near,{otherRoutes:occupied});
  if(!screen.ok){diagnostics.rejected[screen.otherRouteId?'occupied':'solid']++;
   diagnostics.lastFailure=screen;continue;}
  return {applicable:true,ok:true,controlPoints:proposal.controlPoints,
   points:shape.points,lengthM:shape.lengthM,minimumBendRadiusM:shape.minimumBendRadiusM,
   minimumClearanceM:screen.minimumClearanceM,description:proposal.description,diagnostics};
 }
 return {applicable:true,ok:false,controlPoints:null,diagnostics};
}
