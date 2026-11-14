// A planar rolling service loop for a single-axis, quarter-turn hinge.
// All positions are metres. The two upper corners and the moving lead use
// tangent circular arcs, so the centreline is C1 and never tightens below the
// allocated radius. This is geometric accommodation, not a cable life rating.
const add=(a,b,k=1)=>a.map((x,i)=>x+k*b[i]),sub=(a,b)=>add(a,b,-1),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),length=a=>Math.hypot(...a),unit=a=>a.map(x=>x/(length(a)||1)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],finite=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const clamp=x=>Math.max(-1,Math.min(1,x));
function polylineLength(points){let n=0;for(let i=1;i<points.length;i++)n+=length(sub(points[i],points[i-1]));return n;}

// Unlike a half-segment allowance, the actual sum of adjacent tangent trims
// permits a short final straight when the moving corner approaches zero.
function circularFillets(controls,radius,steps){
 const corners=controls.slice(1,-1).map((p,i)=>{const incoming=unit(sub(p,controls[i])),outgoing=unit(sub(controls[i+2],p)),angle=Math.acos(clamp(dot(incoming,outgoing))),trim=angle<1e-10?0:radius*Math.tan(angle/2);return {p,incoming,outgoing,angle,trim};});
 let developedLengthM=polylineLength(controls),maximumSagittaM=0;const points=[[...controls[0]]];
 for(let i=0;i<corners.length;i++){
  const c=corners[i];if(c.angle<1e-10){c.entryIndex=points.length;points.push([...c.p]);c.exitIndex=points.length-1;continue;}
  const entry=add(c.p,c.incoming,-c.trim),exit=add(c.p,c.outgoing,c.trim),normal=unit(sub(c.outgoing,c.incoming.map(x=>x*Math.cos(c.angle)))),center=add(entry,normal,radius),axis=unit(cross(c.incoming,c.outgoing)),start=sub(entry,center);
  c.entryIndex=points.length;points.push(entry);for(let j=1;j<steps;j++){const a=c.angle*j/steps,p=add(add(start.map(x=>x*Math.cos(a)),cross(axis,start),Math.sin(a)),axis,dot(axis,start)*(1-Math.cos(a)));points.push(add(center,p));}points.push(exit);c.exitIndex=points.length-1;
  developedLengthM+=radius*c.angle-2*c.trim;maximumSagittaM=Math.max(maximumSagittaM,radius*(1-Math.cos(c.angle/(2*steps))));
 }
 points.push([...controls.at(-1)]);
 return {points,developedLengthM,lengthM:polylineLength(points),maximumSagittaM,corners};
}

/**
 * Make a constant-developed-length service loop in the plane of up/span.
 * `fromTangent` is the outgoing direction at the fixed clamp. `toTangent`
 * is the arriving direction at the moving clamp, and must rotate with that
 * clamp. The latter turns from -up toward -span through at most 90 degrees.
 *
 * `points` are sampled circular fillets for connectionTube.update(...,
 * {sampled:true,minimumBendRadiusM}). `developedLengthM` is the exact line+
 * arc length. `lengthM` measures the rendered chords; their documented
 * approximation error must not be confused with stretching the cable.
 */
export function planarHingeFlex(from,to,{fromTangent=[0,1,0],toTangent,spanDirection=[0,0,1],restLengthM,bendRadiusM=.278,leadM=.4,straightLeadM=.015,arcSteps=48}={}){
 const bad=reason=>({ok:false,reason,points:[],controlPoints:[],bendLimited:true,restLengthM});
 if(!finite(from)||!finite(to)||!finite(fromTangent)||!finite(toTangent)||!finite(spanDirection)||![restLengthM,bendRadiusM,leadM,straightLeadM,arcSteps].every(Number.isFinite)||restLengthM<=0||bendRadiusM<=0||leadM<=0||straightLeadM<=0||arcSteps<4||[fromTangent,toTangent,spanDirection].some(p=>length(p)<1e-8))return bad('missing-or-invalid-flex-allocation');
 const up=unit(fromTangent),span=unit(spanDirection),inbound=unit(toTangent),normal=unit(cross(up,span));
 if(Math.abs(dot(up,span))>1e-7||Math.abs(dot(inbound,normal))>1e-7||Math.abs(dot(sub(to,from),normal))>1e-7)return bad('clamps-or-headings-are-not-coplanar');
 if(dot(inbound,up)>1e-7||dot(inbound,span)>1e-7)return bad('moving-heading-outside-quarter-turn');
 const endLead=add(to,inbound,-leadM),delta=sub(endLead,from),width=dot(delta,span),heightDelta=dot(delta,up),angle=Math.acos(clamp(-dot(inbound,up))),trim=bendRadiusM*Math.tan(angle/2),minimumHeight=Math.max(bendRadiusM+straightLeadM,heightDelta+bendRadiusM+trim+straightLeadM);
 if(width<2*bendRadiusM+straightLeadM-1e-8)return bad('insufficient-reservoir-width');
 if(leadM<trim+straightLeadM-1e-8)return bad('insufficient-moving-straight-lead');
 const shortening=2*bendRadiusM*(2-Math.PI/2)+2*trim-bendRadiusM*angle,minimumLengthM=2*minimumHeight+width-heightDelta+leadM-shortening;
 if(restLengthM<minimumLengthM-1e-8)return {...bad('insufficient-developed-length'),minimumLengthM};
 const height=minimumHeight+(restLengthM-minimumLengthM)/2,controls=[from,add(from,up,height),add(endLead,up,height-heightDelta),endLead,to].map(p=>[...p]),shape=circularFillets(controls,bendRadiusM,Math.floor(arcSteps));
 const tangentGaps=controls.slice(1).map((p,i)=>length(sub(p,controls[i]))-(shape.corners[i-1]?.trim||0)-(shape.corners[i]?.trim||0));
 if(tangentGaps.some(x=>x<-1e-7))return {...bad('overlapping-circular-fillets'),minimumLengthM,tangentGaps};
 return {ok:true,points:shape.points,controlPoints:controls,cornerRanges:shape.corners.map(c=>({entryIndex:c.entryIndex,exitIndex:c.exitIndex,angleRad:c.angle})),minimumBendRadiusM:bendRadiusM,bendRadiusBasis:'constructed-circular-fillets',bendLimited:false,restLengthM,developedLengthM:shape.developedLengthM,lengthM:shape.lengthM,renderedLengthErrorM:shape.developedLengthM-shape.lengthM,maximumSagittaM:shape.maximumSagittaM,minimumLengthM,reservoirHeightM:height,fromTangent:up,toTangent:inbound,planeNormal:normal,tangentGaps,arcSteps:Math.floor(arcSteps)};
}

/** Redwire preliminary clamp allocation; lane stations are separate X planes. */
export function redwireHingeFlexAllocation(layout,{stationM=0,bendRadiusM=.278}={}){
 const hinge=layout?.banks?.[0]?.root;if(layout?.familyId!=='redwire-platform'||!finite(hinge))throw new Error('A Redwire platform hinge layout is required');
 // The moving clamp also leaves a full static bend below it: the .08 m
 // platform surface + .278 m power bend + diameter/clearance fit in .43 m.
 // The fixed station is over the bus roof footprint, so its incoming +Y
 // lead can pass through a real top-wall feedthrough before this clamp.
 const fixedOffset=[stationM,-.10,-.28],normalOffsetM=.43,spanOffsetM=.60,leadM=.40,straightLeadM=.015;
 // For these declared offsets the upper bounds of both required-length
 // branches occur at their sole derivative zero or at a range endpoint.
 // Both derivatives decrease through their root on [0, pi/2].
 const radial=normalOffsetM+leadM,C=radial+spanOffsetM,D=spanOffsetM-radial,r=bendRadiusM;
 function root(fn){let lo=0,hi=Math.PI/2;if(fn(lo)<=0)return lo;if(fn(hi)>=0)return hi;for(let k=0;k<64;k++){const m=(lo+hi)/2;if(fn(m)>0)lo=m;else hi=m;}return (lo+hi)/2;}
 const candidates=[0,Math.PI/2,root(t=>-D*Math.sin(t)+C*Math.cos(t)-r*Math.tan(t/2)**2),root(t=>-C*Math.sin(t)-D*Math.cos(t)+r)];
 const a=fixedOffset,required=t=>{const b=[stationM,normalOffsetM*Math.cos(t)-spanOffsetM*Math.sin(t),normalOffsetM*Math.sin(t)+spanOffsetM*Math.cos(t)],tb=[0,-Math.cos(t),-Math.sin(t)],s=planarHingeFlex(a,b,{toTangent:tb,restLengthM:100,bendRadiusM,leadM,straightLeadM,arcSteps:4});if(!s.ok)throw new Error('Redwire hinge allocation infeasible: '+s.reason);return s.minimumLengthM;};
 const minimumRestLengthM=Math.max(...candidates.map(required)),restLengthM=Math.ceil((minimumRestLengthM+.015)/.05)*.05;
 const panelNormalOffsetM=layout.descriptors.find(d=>d.type==='rad')?.normalOffset||0;
 return {fixedClamp:add(hinge,fixedOffset),movingClampLocal:[stationM,normalOffsetM-.06-panelNormalOffsetM,-layout.r/2+spanOffsetM],fixedTangent:[0,1,0],movingTangentLocal:[0,-1,0],spanDirection:[0,0,1],restLengthM,minimumRestLengthM,bendRadiusM,leadM,straightLeadM,arcSteps:48,lanePitchM:.045,normalOffsetM,spanOffsetM,panelNormalOffsetM,hingeAngleRangeRad:[0,Math.PI/2],basis:'Preliminary geometric clamp and service-loop allocation; cable-specific dynamic bend and fatigue qualification remain required.'};
}
