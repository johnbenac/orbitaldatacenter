// Exact circular-arc/straight-line accommodation for a 0–180 degree fold.
// The LSR tangent family stays nondegenerate over the entire allocated angle.
// A separate rectangular slack reservoir changes height to conserve exact
// developed length. Every bend is a constructed circle, including at the
// fully folded endpoint; no interpolating spline can reverse or kink.
const add=(a,b,k=1)=>a.map((v,i)=>v+k*b[i]),sub=(a,b)=>add(a,b,-1),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),norm=a=>Math.hypot(...a),unit=a=>a.map(v=>v/(norm(a)||1)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],clamp=x=>Math.max(-1,Math.min(1,x));
const distance=(a,b)=>norm(sub(a,b));
const length=points=>points.slice(1).reduce((s,p,i)=>s+distance(p,points[i]),0);
const turn=(v,a)=>[v[0]*Math.cos(a)-v[1]*Math.sin(a),v[0]*Math.sin(a)+v[1]*Math.cos(a)];
function appendArc(points,center,start,angle,step,parts=1){const ranges=[];for(let k=0;k<parts;k++){const entryIndex=points.length-1,n=Math.abs(angle)<1e-12?0:Math.max(1,Math.ceil(Math.abs(angle)/(parts*step)-1e-10));for(let j=1;j<=n;j++)points.push(add(center,turn(start,angle*(k+j/n)/parts)));ranges.push({entryIndex,exitIndex:points.length-1,angleRad:angle/parts});}return ranges;}
function roundedRectangle(controls,R,step){
 const out=[[...controls[0]]],ranges=[];for(let i=1;i<controls.length-1;i++){const p=controls[i],a=unit(sub(p,controls[i-1])),b=unit(sub(controls[i+1],p)),angle=Math.acos(clamp(dot(a,b))),signed=(a[0]*b[1]-a[1]*b[0])<0?-angle:angle,trim=R*Math.tan(angle/2),entry=add(p,a,-trim),left=[-a[1],a[0]],center=add(entry,left,Math.sign(signed)*R);out.push(entry);ranges.push(...appendArc(out,center,sub(entry,center),signed,step));}out.push([...controls.at(-1)]);return {points:out,ranges};
}
export function accordionFlexAllocation({bendRadiusM=.2025,hingeIndex=1,normalOffsetM=-.045,pitchGapM=.04,cradleM=-.18}={}){
 const R=Math.max(.22,bendRadiusM),upSign=hingeIndex%2?1:-1,widthM=Math.max(1,4*R+.08),virtualSetbackM=.05,movingSetbackM=.90,dropM=hingeIndex%2?.25:.16,a=virtualSetbackM+pitchGapM,q=-normalOffsetM*upSign,c=dropM+((hingeIndex%2?0:cradleM)-normalOffsetM)*upSign,d0=Math.hypot(a,c-R),movingCircleRadiusM=Math.hypot(movingSetbackM,q+R),minimumCenterDistanceM=movingCircleRadiusM-d0,headingMarginM=R-q-d0;
 if(!(minimumCenterDistanceM>2*R+.02&&headingMarginM>.01&&movingSetbackM>d0+.02))throw Error('Accordion fold requires a larger independently allocated circular reservoir');
 const minimumReservoirHeightM=dropM+2*R+.015,shorteningM=4*(2-Math.PI/2)*R,maximumConnectorLengthM=movingCircleRadiusM+d0+2*Math.PI*R,minimumReservoirLengthM=widthM+2*minimumReservoirHeightM-dropM-shorteningM,restLengthM=Math.ceil((maximumConnectorLengthM+minimumReservoirLengthM+.04)/.05)*.05,straightMinimumM=Math.sqrt(minimumCenterDistanceM**2-4*R**2),betaRate=(2/minimumCenterDistanceM+2*R/(minimumCenterDistanceM*straightMinimumM))*movingCircleRadiusM,lengthRate=((movingCircleRadiusM+d0)/straightMinimumM*movingCircleRadiusM+2*R*betaRate+R),localMotionCoefficientM=Math.max(lengthRate/2,movingCircleRadiusM+R*Math.max(betaRate,1));
 return {bendRadiusM:R,requiredBendRadiusM:bendRadiusM,hingeIndex,upSign,reservoirWidthM:widthM,reservoirDropM:dropM,exitSetbackM:widthM+virtualSetbackM,movingSetbackM,virtualSetbackM,straightLeadM:.015,restLengthM,arcStepRad:Math.PI/64,minimumCenterDistanceM,maximumConnectorLengthM,minimumReservoirHeightM,headingMarginM,movingCircleRadiusM,localMotionCoefficientM,basis:'LSR external cable path with opposite-side rectangular slack reservoir; analytic distance-to-tangency, heading-family and maximum required developed-length bounds cover the closed0–180degree fold interval.'};
}
export function planarAccordionFlex(from,to,{fromTangent,toTangent,up,reservoirWidthM,reservoirDropM,bendRadiusM,restLengthM,straightLeadM=.015,arcStepRad=Math.PI/64}={}){
 const bad=reason=>({ok:false,reason,points:[],restLengthM});if(![from,to,fromTangent,toTangent,up].every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))||![reservoirWidthM,reservoirDropM,bendRadiusM,restLengthM].every(x=>Number.isFinite(x)&&x>0))return bad('invalid-accordion-flex-allocation');
 const span=unit(fromTangent),vertical=unit(up),inbound=unit(toTangent),axis=unit(cross(span,vertical)),delta=sub(to,from),R=bendRadiusM,W=reservoirWidthM,drop=reservoirDropM;
 if(Math.abs(dot(span,vertical))>1e-7||Math.abs(dot(delta,axis))>1e-6||Math.abs(dot(inbound,axis))>1e-7||dot(inbound,vertical)<-1e-7)return bad('accordion-clamps-or-headings-outside-allocated-plane');
 const psi=Math.acos(clamp(dot(span,inbound))),Q=[dot(delta,span),dot(delta,vertical)],C=[W,-drop],CA=add(C,[0,R]),CB=add(Q,[Math.sin(psi),-Math.cos(psi)],R),D=sub(CB,CA),d=norm(D);if(d<=2*R+1e-9)return bad('degenerate-LSR-tangent');
 let beta=Math.atan2(D[1],D[0])+Math.asin(2*R/d);if(beta<-1e-7||beta-psi<-1e-7||beta>Math.PI*1.5+1e-7)return bad('LSR-heading-family-changed');beta=Math.max(psi,beta,0);const second=beta-psi,straight=Math.sqrt(d*d-4*R*R),connectorLengthM=R*(beta+second)+straight,shortening=4*(2-Math.PI/2)*R,H=(restLengthM-connectorLengthM-W+drop+shortening)/2,lead=R+straightLeadM;
 if(H<drop+2*R+straightLeadM-1e-7||W-2*lead<2*R+straightLeadM-1e-7)return bad('insufficient-accordion-slack-reservoir');
 const controls=[[0,0],[lead,0],[lead,-H],[W-lead,-H],[W-lead,-drop],C],rectangle=roundedRectangle(controls,R,arcStepRad),points2=rectangle.points,turnRanges=[...rectangle.ranges,...appendArc(points2,CA,[0,-R],beta,arcStepRad,4)];const Bentry=add(CB,[-Math.sin(beta),Math.cos(beta)],R);points2.push(Bentry);turnRanges.push(...appendArc(points2,CB,sub(Bentry,CB),-second,arcStepRad,4));if(distance(points2.at(-1),Q)>1e-8)return bad('accordion-circle-endpoint-closure');points2[points2.length-1]=Q;
 const points=points2.map(p=>add(add(from,span,p[0]),vertical,p[1])),lengthM=length(points),developedLengthM=W+2*H-drop-shortening+connectorLengthM,renderedLengthErrorM=developedLengthM-lengthM;
 // Each rectangular turn is pi/2. Each variable circle has total turn at
 // most3*pi/2 and is split into four fixed indexed parts. Two consecutive
 // parts therefore have absolute tangent variation <=pi for EVERY allowed
 // fold, including zero-angle endpoints. Overlapping windows include the
 // adjacent straight tangents; the audit checks actual buffer correspondence.
 const selfWindows=turnRanges.slice(0,-1).map((_,i)=>({id:'turn-window-'+i,startIndex:i?turnRanges[i-1].exitIndex:0,endIndex:i+2<turnRanges.length?turnRanges[i+2].entryIndex:points.length-1,maximumTurnRad:Math.PI})).filter(w=>w.endIndex>w.startIndex);
 return {ok:true,points,turnRanges,selfWindows,minimumBendRadiusM:R,bendRadiusBasis:'constructed-circular-fillets',restLengthM,developedLengthM,lengthM,renderedLengthErrorM,maximumSagittaM:R*(1-Math.cos(arcStepRad/2)),reservoirHeightM:H,minimumCenterDistanceM:d,connectorLengthM,foldAngleRad:psi,firstArcRad:beta,secondArcRad:second,planeNormal:axis,fromTangent:span,toTangent:inbound};
}
