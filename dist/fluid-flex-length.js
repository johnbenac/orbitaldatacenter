import * as T from './vendor/three.module.js';
import {anchorInFrame,normalInFrame} from './connection-geometry.js';
import {roundedConnectionRoute} from './connection-routes.js';

// The retained fluid U has two quarter-circle fillets. Its renderer conserves
// the chordal centreline length; the exact physical cut adds this fixed arc
// deficit. This declaration is valid only while both ends share a transverse
// axis and the complete declared chord domain retains the allocated radius.
export function fluidFlexLengthEvidence(connection){
 if(!connection.restLengthM)return null;
 const c=connection,m=c.motionModel||{},issues=[],issue=(code,message,details={})=>issues.push({code,routeId:c.id||c.name,message,...details});
 const basis='perpendicular-two-quarter-fillets',steps=8,R=c.bendRadiusM,L=c.restLengthM,lo=m.minimumChordM,hi=m.maximumChordM;
 if(m.kind!=='constant-length-u'||m.physicalLengthBasis!==basis||m.arcSteps!==steps)issue('fluid-flex-length-basis','A conserved physical hose cut requires the declared two-quarter-circle construction and its actual eight-segment arc tessellation.');
 if(![R,L,lo,hi].every(x=>Number.isFinite(x)&&x>0)||lo>hi)issue('fluid-flex-length-domain','The physical hose length proof requires finite radius, rendered target and ordered positive chord bounds.');
 if(!c.parent||!c.a||!c.b||!c.tube?.route)issue('fluid-flex-length-construction','The actual hose construction or connector frames are missing.');
 if(issues.length)return {ok:false,basis,issues,renderedTargetLengthM:L,physicalCutLengthM:null};
 const a=anchorInFrame(c.a,c.parent),b=anchorInFrame(c.b,c.parent),na=normalInFrame(c.a,c.parent),nb=normalInFrame(c.b,c.parent),chord=b.clone().sub(a),d=chord.length(),scale=c.parent.getWorldScale(new T.Vector3()),route=c.tube.route;
 const axisError=Math.abs(chord.dot(na)),normalError=na.distanceTo(nb),unitScaleError=Math.max(Math.abs(scale.x-1),Math.abs(scale.y-1),Math.abs(scale.z-1));
 if(![d,axisError,normalError,unitScaleError].every(Number.isFinite)||axisError>1e-8||normalError>1e-8||unitScaleError>1e-8)issue('fluid-flex-length-geometry','The actual hose endpoints must share a unit-scale transverse axis; a skew or scaled loop needs a different physical length proof.',{axialOffsetM:axisError,normalError,unitScaleError});
 if(!Number.isFinite(d)||d<lo-1e-6||d>hi+1e-6)issue('fluid-flex-length-chord-domain','The actual hose chord lies outside its declared full-motion domain.',{chordM:d,minimumChordM:lo,maximumChordM:hi});
 const quarterChordM=2*steps*R*Math.sin(Math.PI/(4*steps)),chordDeficitM=2*(R*Math.PI/2-quarterChordM),physicalCutLengthM=L+chordDeficitM,minimumLeadM=(L-hi+4*R-2*quarterChordM)/2,bridgeTrimMarginM=.98*lo-2*R,leadTrimMarginM=.98*minimumLeadM-R;
 if(bridgeTrimMarginM<-1e-10||leadTrimMarginM<-1e-10)issue('fluid-flex-length-tangent-budget','The declared motion domain cannot retain both full-radius quarter-circle fillets.',{bridgeTrimMarginM,leadTrimMarginM,minimumLeadM});
 const lead=(L-d+4*R-2*quarterChordM)/2,expected=roundedConnectionRoute([a,a.clone().addScaledVector(na,lead),b.clone().addScaledVector(na,lead),b].map(p=>p.toArray()),R,steps),actual=route.points||[];
 const constructionMismatchM=actual.length===expected.points.length?actual.reduce((worst,p,i)=>Math.max(worst,Math.hypot(...p.map((v,k)=>v-expected.points[i][k]))),0):Infinity;
 if(!Number.isFinite(constructionMismatchM)||constructionMismatchM>2e-7||route.bendLimited||!Number.isFinite(route.minimumBendRadiusM)||Math.abs(route.minimumBendRadiusM-R)>1e-7)issue('fluid-flex-length-construction','The current rendered construction must match the declared full-radius transverse U.',{constructionMismatchM,minimumBendRadiusM:route.minimumBendRadiusM,requiredBendRadiusM:R});
 const developedLengthM=route.developedLengthM,renderedConstructionLengthM=route.lengthM;
 if(!Number.isFinite(developedLengthM)||Math.abs(developedLengthM-physicalCutLengthM)>2e-7||!Number.isFinite(renderedConstructionLengthM)||Math.abs(renderedConstructionLengthM-L)>2e-7)issue('fluid-flex-physical-length','The actual circular-fillet developed length must equal the declared physical hose cut.',{developedLengthM,physicalCutLengthM,renderedConstructionLengthM,renderedTargetLengthM:L});
 return {ok:issues.length===0,basis,issues,arcSteps:steps,renderedTargetLengthM:L,renderedConstructionLengthM,developedLengthM,physicalCutLengthM,chordDeficitM,minimumChordM:lo,maximumChordM:hi,minimumLeadM,bridgeTrimMarginM,leadTrimMarginM,constructionMismatchM,proof:'Both endpoint axes are parallel and perpendicular to the complete chord domain. Two full-radius quarter circles have a fixed exact arc/chord deficit; actual tube-buffer correspondence is independently checked by the route adapter.'};
}
