import {roundedConnectionRoute} from './connection-routes.js';
import {auditRoutes,routeClearance} from './routing-audit.js';

// This is a project accommodation policy, not a connector rating. Banks of
// 64 or more payload feeds receive an explicit shared departure corridor.
// Smaller banks retain their separately validated installed constructions.
export const pcduPayloadCombPolicy=Object.freeze({minimumCircuits:64,minimumJacketGapM:.004,clearanceM:.002,leadRadiusFactor:2.4,leadExtraM:.015,exitStraightM:.020});
const add=(a,b,k=1)=>a.map((v,i)=>v+k*b[i]),distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));

export function allocatePcduPayloadComb(input,{minimumCircuits=pcduPayloadCombPolicy.minimumCircuits,rackLayout=null}={}){
 const lines=input.filter(l=>l.fromBoxId==='pcdu'&&/^P-PAY-/.test(l.id));
 if(lines.length<minimumCircuits)return {active:false,ok:true,count:lines.length,escapes:[],issues:[],policy:pcduPayloadCombPolicy};
 const issues=[],fail=(code,details={})=>issues.push({code,...details});
 for(const line of lines){
  if(!line.from?.every(Number.isFinite)||line.from.length!==3||!line.fromNormal?.every(Number.isFinite)||line.fromNormal.length!==3||distance(line.fromNormal,[1,0,0])>1e-8)fail('payload-comb-unsupported-source-frame',{routeId:line.id});
  if(!(line.radiusM>0&&Number.isFinite(line.radiusM)&&line.bendRadiusM>0&&Number.isFinite(line.bendRadiusM)))fail('payload-comb-invalid-radius',{routeId:line.id});
 }
 if(issues.length)return {active:true,ok:false,count:lines.length,escapes:[],issues,policy:pcduPayloadCombPolicy};
 // Rearward ports turn farther from the panel; a later forward port's
 // transverse lead ends before that longitudinal lane. Rows retain their
 // actual Y coordinates. No endpoint, polarity or port count is collapsed.
 const sourceColumns=[...new Set(lines.map(l=>l.from[2]))].sort((a,b)=>b-a),maximumRadiusM=Math.max(...lines.map(l=>l.radiusM)),maximumBendRadiusM=Math.max(...lines.map(l=>l.bendRadiusM)),pitchM=2*maximumRadiusM+pcduPayloadCombPolicy.minimumJacketGapM,leadM=pcduPayloadCombPolicy.leadRadiusFactor*maximumBendRadiusM+pcduPayloadCombPolicy.leadExtraM,exitZ=Math.max(...sourceColumns)+maximumBendRadiusM+pcduPayloadCombPolicy.exitStraightM;
 let corridor=null;
 if(rackLayout){
  const centers=[...new Set(rackLayout.slots.map(s=>s.x))].sort((a,b)=>a-b),half=rackLayout.slotDimensionsM[0]/2,spanM=(sourceColumns.length-1)*pitchM,padM=maximumRadiusM+pcduPayloadCombPolicy.clearanceM,minimumStart=Math.max(...lines.map(l=>l.from[0]+leadM)),gaps=[];
  for(let i=1;i<centers.length;i++){
   const minXM=centers[i-1]+half,maxXM=centers[i]-half,lower=Math.max(minXM+padM,minimumStart),upper=maxXM-padM-spanM;
   if(lower<=upper)gaps.push({id:'compute-column-aisle-'+i,minXM,maxXM,laneStartXM:Math.max(lower,Math.min(upper,(minXM+maxXM-spanM)/2)),widthM:maxXM-minXM});
  }
  gaps.sort((a,b)=>Math.abs(a.minXM+a.maxXM)-Math.abs(b.minXM+b.maxXM));corridor=gaps[0]||null;
  if(!corridor){fail('payload-comb-no-complete-aisle',{requiredWidthM:spanM+2*padM,minimumDepartureXM:minimumStart});return {active:true,ok:false,count:lines.length,escapes:[],issues,policy:pcduPayloadCombPolicy};}
 }
 const escapes=lines.map(line=>{
  const column=sourceColumns.indexOf(line.from[2]),departureM=(corridor?corridor.laneStartXM-line.from[0]:leadM)+column*pitchM,a=[...line.from],turn=add(a,line.fromNormal,departureM/line.fromNormal[0]),end=[turn[0],turn[1],exitZ],controlPoints=[a,turn,end],shape=roundedConnectionRoute(controlPoints,line.bendRadiusM),entryEnd=add(end,[0,0,1],pcduPayloadCombPolicy.leadRadiusFactor*line.bendRadiusM+pcduPayloadCombPolicy.leadExtraM);
  if(shape.bendLimited||shape.minimumBendRadiusM+1e-8<line.bendRadiusM)fail('payload-comb-bend-allocation',{routeId:line.id,actualM:shape.minimumBendRadiusM,requiredM:line.bendRadiusM});
  return {id:line.id,end:'from',anchor:a,points:shape.points,controlPoints,minimumBendRadiusM:shape.minimumBendRadiusM,lengthM:shape.lengthM,normal:[0,0,1],entryEnd,column,radiusM:line.radiusM,bendRadiusM:line.bendRadiusM,fromNormal:[...line.fromNormal]};
 });
 const routes=escapes.map(e=>({id:e.id,points:[...e.points,e.entryEnd],radiusM:e.radiusM,clearanceM:pcduPayloadCombPolicy.clearanceM,from:{position:e.anchor,normal:e.fromNormal}})),validation=auditRoutes(routes,[],{maxIssues:40});
 issues.push(...validation.issues.map(issue=>({...issue,code:'payload-comb-'+issue.code})));
 return {active:true,ok:issues.length===0,count:lines.length,escapes,issues,policy:pcduPayloadCombPolicy,sourceColumns,pitchM,exitZ,maximumBendRadiusM,corridor,minimumInterlineClearanceM:validation.minimumClearanceM,basis:'Every physical +X payload exit retains its normal and full bend radius. Reversed source-Z rank orders the X lanes, while actual source-Y rows remain separated. A supplied rack layout locates the complete lane bundle within a real inter-column aisle. Complete +Z planning leads are included in the pairwise proof and reserved before coolant planning.'};
}

export function inspectPcduPayloadComb(allocation,obstacles,terminalVolumes=[],{otherRoutes=[],maxIssues=40}={}){
 const issues=[...allocation.issues];let issueCount=issues.length,minimumClearanceM=Infinity;
 if(!allocation.active)return {active:false,ok:true,count:allocation.count,issues:[],issueCount:0,minimumClearanceM};
 for(const e of allocation.escapes){
  const route={id:e.id,points:[...e.points,e.entryEnd],radiusM:e.radiusM,clearanceM:pcduPayloadCombPolicy.clearanceM},screen=routeClearance(route,[...obstacles,...terminalVolumes.filter(o=>o.lineId!==e.id)],{otherRoutes});
  minimumClearanceM=Math.min(minimumClearanceM,screen.minimumClearanceM??Infinity);
  if(!screen.ok){issueCount++;if(issues.length<maxIssues)issues.push({code:'payload-comb-installed-clearance',routeId:e.id,...screen});}
 }
 return {active:true,ok:issueCount===0,count:allocation.count,issues,issueCount,minimumClearanceM,scope:'Complete source bends and the full following planning leads against actual fixed/operating solids, every other terminal reservation and any explicitly supplied occupied circuit.'};
}
