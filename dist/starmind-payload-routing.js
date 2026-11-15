import {roundedConnectionRoute} from './connection-routes.js';
const unique=values=>[...new Set(values)].sort((a,b)=>a-b);
// Coordinate the complete body-fixed payload star before any unrelated route
// is placed. The source bank is grouped by rack column and bay. Transverse
// lanes nest below the rack; each later bay peels inward only after the earlier
// bay has ended. Oblique, row-staggered risers retain every actual endpoint.
// These are physical controls, not a clearance acceptance or a service proof.
export function allocateStarmindPayloadRoutes(h,lines,comb){
 const empty={applicable:false,rows:[],issues:[]};
 if(h.input?.referenceCenterId!=='starmind-ai1'||h.architectureFamilyId!=='starmind-cross'||!comb?.active)return empty;
 if(!comb.ok)return {...empty,applicable:true,issues:[...comb.issues]};
 const point=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite),
  plusX=n=>point(n)&&Math.hypot(n[0]-1,n[1],n[2])<1e-8;
 if(lines.length!==comb.escapes.length||new Set(lines.map(l=>l.id)).size!==lines.length||
  lines.some(l=>!point(l.from)||!point(l.to)||!plusX(l.fromNormal)||!plusX(l.toNormal)||
   !comb.escapes.some(e=>e.id===l.id)||!(l.radiusM>0&&l.bendRadiusM>0)))
  return {...empty,applicable:true,issues:[{code:'starmind-payload-interface-mismatch'}]};
 const R=Math.max(...lines.map(line=>line.bendRadiusM)),r=Math.max(...lines.map(line=>line.radiusM));
 const fanPitchM=2*r+.006,commonReachM=.18,bayPitchM=2*r+.004;
 const riseOffsetM=-.25,shiftLengthM=.35,riseRowPitchM=.02;
 const bays=unique(lines.map(line=>line.to[2])),columns=unique(lines.map(line=>line.to[0])),targetRows=unique(lines.map(line=>line.to[1]));
 const groups=unique(comb.escapes.map(escape=>escape.controlPoints[2][0]));
 const sourceZs=unique(comb.escapes.map(escape=>escape.anchor[2])), sourceMaxZ=Math.max(...sourceZs);
 const firstFanZ=sourceMaxZ+2*R/.98+.003;
 const bases=lines.map(line=>{const escape=comb.escapes.find(escape=>escape.id===line.id),start=escape.controlPoints[2],bay=bays.indexOf(line.to[2]),column=columns.indexOf(line.to[0]),commonX=line.to[0]+commonReachM,trunkX=commonX+bay*bayPitchM;return {line,escape,start,bay,column,commonX,trunkX,group:groups.indexOf(start[0]),sign:Math.sign(trunkX-start[0])};});
 const positive=unique(bases.filter(b=>b.sign>0).map(b=>b.group)),negative=unique(bases.filter(b=>b.sign<0).map(b=>b.group));
 const rows=[],issues=[];
 for(const base of bases){
  const {line,escape,start,bay,column,commonX,trunkX,group,sign}=base;
  const order=sign>0?positive.length-1-positive.indexOf(group):negative.indexOf(group);
  const targetRowRank=targetRows.indexOf(line.to[1]), sourceRowRank=sourceZs.indexOf(escape.anchor[2]);
  const fanZ=firstFanZ+order*fanPitchM+(sourceZs.length-1-sourceRowRank)*.03;
  const controls=escape.controlPoints.slice(0,3).map(point=>[...point]);
  controls.push([start[0],start[1],fanZ],[trunkX,start[1],fanZ]);
  let riseZ=Math.max(line.to[2]+riseOffsetM+(targetRows.length-1-targetRows.indexOf(line.to[1]))*riseRowPitchM,fanZ+2*R/.98+.006+(bay?shiftLengthM:0));
  if(bay){controls.push([trunkX,start[1],riseZ-shiftLengthM],[commonX,start[1],riseZ]);}
  else if(sign<0)controls.push([commonX,start[1],riseZ]);
  else riseZ=fanZ;
  controls.push([commonX,line.to[1],line.to[2]],[...line.to]);
  const shape=roundedConnectionRoute(controls,line.bendRadiusM);
  if(shape.bendLimited)issues.push({code:'bend-limited',id:line.id,actual:shape.minimumBendRadiusM,required:line.bendRadiusM});
  rows.push({id:line.id,controlPoints:controls,points:shape.points,lengthM:shape.lengthM,minimumBendRadiusM:shape.minimumBendRadiusM,bendLimited:shape.bendLimited,radiusM:line.radiusM,clearanceM:.002,from:{position:line.from,normal:line.fromNormal},to:{position:line.to,normal:line.toNormal},laneMetadata:{column,bay,group,sign,targetRowRank,sourceRowRank,fanZ,commonX,trunkX,riseZ,underY:start[1],target:line.to}});
 }
 return {applicable:true,ok:issues.length===0,rows,issues,parameters:{R,r,fanPitchM,commonReachM,bayPitchM,riseOffsetM,shiftLengthM,riseRowPitchM,firstFanZ}};
}
