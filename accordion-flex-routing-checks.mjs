import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {accordionFlexAllocation,planarAccordionFlex} from './dist/accordion-flex-routing.js';
import {auditRoutes} from './dist/routing-audit.js';
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
function pointSegment(p,a,b){const v=b.map((x,i)=>x-a[i]),w=p.map((x,i)=>x-a[i]),d=v.reduce((s,x)=>s+x*x,0),t=d?Math.max(0,Math.min(1,w.reduce((s,x,i)=>s+x*v[i],0)/d)):0;return dist(p,a.map((x,i)=>x+t*v[i]));}
function separation(a,b){return Math.max(...a.map(p=>Math.min(...b.slice(1).map((q,i)=>pointSegment(p,b[i],q)))));}
export function checkAccordionFlexRouting(){
 let shapes=0,proofWindows=0;const checks=[];
 for(const hingeIndex of [1,2]){
  const p=accordionFlexAllocation({hingeIndex}),R=p.bendRadiusM,s=p.upSign,q=.045*s,a=p.virtualSetbackM+.04,c=p.reservoirDropM+((hingeIndex%2?0:-.18)+.045)*s;
  const shape=angle=>planarAccordionFlex([0,0,0],[p.reservoirWidthM+a+.9*Math.cos(angle)+q*Math.sin(angle),-p.reservoirDropM+c+.9*Math.sin(angle)-q*Math.cos(angle),0],{...p,fromTangent:[1,0,0],toTangent:[Math.cos(angle),Math.sin(angle),0],up:[0,1,0]});
  for(let k=0;k<=72;k++){const angle=Math.PI*k/72,r=shape(angle);assert.ok(r.ok,hingeIndex+': '+angle+' '+r.reason);assert.ok(Math.abs(r.developedLengthM-p.restLengthM)<2e-12);assert.ok(r.minimumCenterDistanceM>=p.minimumCenterDistanceM-1e-12);assert.ok(r.minimumBendRadiusM>=.2025);assert.ok(r.points.every(v=>Math.abs(v[2])<1e-12));const audit=auditRoutes([{id:'fold-'+hingeIndex,points:r.points,radiusM:.00675,minBendRadiusM:.2025,minimumBendRadiusM:R,bendRadiusBasis:'constructed-circular-fillets',restLengthM:p.restLengthM,lengthToleranceM:r.renderedLengthErrorM+1e-8}],[],{maxIssues:4});assert.ok(audit.ok,JSON.stringify({angle,issues:audit.issues}));shapes++;
   if(k%12===0)for(const window of r.selfWindows){const points=r.points.slice(window.startIndex,window.endIndex+1),lengthM=points.slice(1).reduce((s,p,i)=>s+dist(p,points[i]),0),proof={kind:'bounded-turn',spanId:window.id,minimumBendRadiusM:R,maximumTurnRad:Math.PI,maximumChordDeviationM:r.maximumSagittaM,maximumBufferDeviationM:2e-6,maximumArclengthErrorM:.001,radiusLowerBoundA:.00675-1e-9,radiusUpperBoundA:.00675+7e-6,basis:'Constructed adjacent subarc window with closed-interval total turn bound.'},route={id:'window',points,radiusM:.00675,motionSpans:[{id:window.id,startM:0,endM:lengthM,nominalPoints:points}]},checked=auditRoutes([route],[],{maxIssues:3,pairMotionBound:()=>10,pairSeparationLowerBound:pair=>pair.kind==='self'?proof:null});assert.ok(checked.ok,JSON.stringify({hingeIndex,angle,window:window.id,issues:checked.issues}));assert.ok(points.length<=80);proofWindows++;}
  }
  for(const [lo,hi]of [[0,Math.PI],[0,.02],[.5,.6],[1.5,1.7],[Math.PI-.01,Math.PI]]){const mid=(lo+hi)/2,m=shape(mid);for(const t of [lo,hi]){const r=shape(t),observed=Math.max(separation(r.points,m.points),separation(m.points,r.points)),bound=p.localMotionCoefficientM*Math.abs(t-mid);assert.ok(observed<=bound+1e-10,JSON.stringify({hingeIndex,lo,hi,observed,bound}));}}
  const bad=planarAccordionFlex([0,0,0],[.2,0,0],{...p,fromTangent:[1,0,0],toTangent:[0,-1,0],up:[0,1,0]});assert.equal(bad.ok,false);checks.push({hingeIndex,restLengthM:p.restLengthM,minBendRadiusM:R,minimumTangentDistanceM:p.minimumCenterDistanceM,headingMarginM:p.headingMarginM,localMotionCoefficientM:p.localMotionCoefficientM});
 }
 return {ok:true,shapes,proofWindows,checks,basis:'Analytic closed-interval tangent-family, circular curvature and required-length inequalities plus adversarial endpoint, full-fold, intermediate and motion-bound regressions. Stable overlapping subarc windows are checked by the same intrinsic nominal-geometry validator as the installed continuous gate. This component check does not replace the installed all-solid/interline continuous gate.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(checkAccordionFlexRouting()));
