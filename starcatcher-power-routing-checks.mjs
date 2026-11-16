// Bounded physical checks for Star Catcher's guarded power-bank controls.
// Complete native scene admission is assessed separately with current hardware.
import assert from 'node:assert/strict';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {buildElectricalArchitecture} from './dist/electrical-architecture.js';
import {starcatcherPowerRouteHint,starcatcherPowerRoutingCases} from './dist/starcatcher-power-routing.js';
import {roundedConnectionRoute,routeLength} from './dist/connection-routes.js';
import {auditRoutes} from './dist/routing-audit.js';
import {planElectricalRoute} from './dist/electrical-routing.js';

const h=sizeDesign(buildReferenceDesign('star-catcher-self-powered')),
 graph=buildElectricalArchitecture(h),layout={familyId:'heatlift-study'},routes=[];
const near=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]))<=1e-10;
const lineFor=row=>({id:row.id,radiusM:row.radiusM,bendRadiusM:row.bendRadiusM,
 fromEscape:row.fromEscape&&structuredClone(row.fromEscape),
 toEscape:row.toEscape&&structuredClone(row.toEscape),r:{
  spec:structuredClone(graph.harnesses.find(spec=>spec.id===row.id.split('/')[0])),
  from:{matingTravel:.045,plug:{position:{x:0,y:0,z:0}}},
  to:{matingTravel:.045,plug:{position:{x:0,y:0,z:0}}}
 }});
const endpoint=(row,end)=>row[end+'Escape']?.points.at(-1)||row[end];
const normal=(row,end)=>row[end+'Escape']?.normal||row[end+'Normal'];
const invoke=(row,{hardware=h,frame=layout,line=lineFor(row),from=endpoint(row,'from'),
 to=endpoint(row,'to'),fromNormal=normal(row,'from'),toNormal=normal(row,'to'),
 waypoints=[]}={})=>starcatcherPowerRouteHint(hardware,frame,line,from,to,
 fromNormal,toNormal,waypoints);
assert.equal(starcatcherPowerRoutingCases.length,88);
assert.equal(starcatcherPowerRoutingCases.filter(row=>row.id.startsWith('P-BAT-')).length,16);
assert.equal(starcatcherPowerRoutingCases.filter(row=>row.id.startsWith('P-SA-')).length,72);
assert.equal(new Set(starcatcherPowerRoutingCases.map(row=>row.id)).size,
 starcatcherPowerRoutingCases.length);
for(const row of starcatcherPowerRoutingCases){
 const controls=invoke(row),a=endpoint(row,'from'),b=endpoint(row,'to'),
  na=normal(row,'from'),nb=normal(row,'to');
 assert(controls,row.id+' default input and physical interfaces select the bank route');
 assert(near(controls[0],a)&&near(controls.at(-1),b),row.id+' effective exits');
 const shape=roundedConnectionRoute(controls,row.bendRadiusM);
 assert(!shape.bendLimited&&shape.minimumBendRadiusM>=row.bendRadiusM-1e-10,
  row.id+' retains the complete 135 mm cable bend radius');
 let points=shape.points;
 if(row.fromEscape)points=[...row.fromEscape.points,...points.slice(1)];
 if(row.toEscape)points=[...points,...[...row.toEscape.points].reverse().slice(1)];
 assert(Math.hypot(...points[0].map((v,k)=>v-points[1][k]))>=.045-1e-9,
  row.id+' source has the real 45 mm straight withdrawal stroke');
 assert(Math.hypot(...points.at(-1).map((v,k)=>v-points.at(-2)[k]))>=.045-1e-9,
  row.id+' destination has the real 45 mm straight withdrawal stroke');
 const bounds=[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM];
 assert(points.every(point=>point.every((v,k)=>Math.abs(v)+row.radiusM<bounds[k]/2)),
  row.id+' cable remains inside the body envelope');
 if(/^P-SA-[34]\//.test(row.id)){
  const bulkheadFront=h.propulsion.forwardDeckZ+.017/2;
  assert(points.every(point=>point[2]-row.radiusM>=bulkheadFront+.002),
   row.id+' remains forward of the actual solid equipment bulkhead');
  assert.deepEqual(row.toEscape.normal,[0,0,-1],
   row.id+' uses the deliberately allocated aft-facing PCDU fanout');
  assert(row.toEscape.minimumBendRadiusM>=row.bendRadiusM-1e-10,
   row.id+' fixed PCDU lead retains the same full cable bend radius');
 }
 const route={id:row.id,points,radiusM:row.radiusM,clearanceM:.002,
  minBendRadiusM:row.bendRadiusM,minimumBendRadiusM:shape.minimumBendRadiusM,
  from:{position:row.from,normal:row.fromNormal},
  to:{position:row.to,normal:row.toNormal}};
 const admission={id:row.id,fromNormal:na,toNormal:nb,radiusM:row.radiusM,
  bendRadiusM:row.bendRadiusM,clearanceM:.002,candidateControls:controls,
  otherRoutes:routes,maxAttempts:0,maxGridNodes:0};
 const accepted=planElectricalRoute(a,b,admission);
 assert(accepted.ok&&accepted.constructionHintAccepted,
  row.id+' ordinary planner admits the complete bank with its existing neighbors');
 const middle=shape.points[Math.floor(shape.points.length/2)],obstruction={
  id:'real-bank-obstruction',type:'box',min:middle.map(v=>v-.015),max:middle.map(v=>v+.015)};
 assert(!planElectricalRoute(a,b,{...admission,obstacles:[obstruction]}).constructionHintAccepted,
  row.id+' an obstruction rejects the proposed controls');
 assert(!auditRoutes([route],[obstruction]).ok,row.id+' physical audit sees the same obstruction');
 assert(routeLength(points)>0);
 routes.push(route);

 // Configuration matching never substitutes for current-scene admission.
 assert.equal(invoke(row,{hardware:{...h,input:{...h.input,missionYears:h.input.missionYears+.01}}}),null);
 assert.equal(invoke(row,{hardware:{...h,input:{...h.input,referenceCenterId:'starmind-ai1'}}}),null);
 assert.equal(invoke(row,{hardware:{...h,architectureFamilyId:'protected-core'}}),null);
 assert.equal(invoke(row,{hardware:{...h,bodyLengthM:h.bodyLengthM+.001}}),null);
 assert.equal(invoke(row,{frame:{familyId:'redwire-platform'}}),null);
 assert.equal(invoke(row,{from:a.map((v,k)=>v+(k===0?.001:0))}),null);
 assert.equal(invoke(row,{to:b.map((v,k)=>v+(k===2?.001:0))}),null);
 assert.equal(invoke(row,{fromNormal:[1,0,0]}),null);
 assert.equal(invoke(row,{toNormal:[0,1,0]}),null);
 assert.equal(invoke(row,{waypoints:[[0,0,0]]}),null);
 for(const mutate of [
  line=>{line.id+='-other';},line=>{line.radiusM+=.0001;},
  line=>{line.bendRadiusM+=.001;},line=>{line.fromPortal={};},
  line=>{line.r.from.plug.position.z=.001;},line=>{line.r.to.matingTravel=.05;},
  line=>{line.r.spec.fromBoxId='wrong-equipment';},
  line=>{line.r.spec.toPortId='wrong-port';},line=>{line.r.spec.quantity++;},
  line=>{line.r.spec.wire.areaMM2=67.4;},line=>{line.r.spec.connectorTypeId='other';},
  line=>{line.r.spec.terminationAllowanceM=.25;}
 ]){const line=lineFor(row);mutate(line);assert.equal(invoke(row,{line}),null);}
 if(row.toEscape){const line=lineFor(row);line.toEscape.points[1][0]+=.001;
  assert.equal(invoke(row,{line}),null,'An edited real PCDU fanout invalidates the hint');}
 const copy=invoke(row);copy[1][0]+=100;
 assert.deepEqual(invoke(row),controls,'Returned controls cannot mutate the retained design');
 assert.deepEqual(invoke(row,{hardware:{...h,input:{...h.input,installedHarnessTakeoff:{ignoredMassFeedback:true}}}}),controls,
  'A retained measured cut inventory cannot create a geometry/mass selection cycle');
}
const result=auditRoutes(routes,[],{maxIssues:8});
assert(result.ok,JSON.stringify(result.issues));
console.log('PASS Star Catcher power banks: '+routes.length+' physical cuts, full bend radii, '+
 '45 mm terminal straights, solid bulkhead clearance, internal bounds, mutual clearance, '+
 'ordinary rejection and exact guards.');
