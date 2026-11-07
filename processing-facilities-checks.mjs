import assert from 'node:assert/strict';
import {launchFleet} from './dist/launch-fleet.js';
import {launchSitesFor} from './dist/launch-sites.js';
import {processingFacility,PROCESSING_FACILITIES,FACILITY_REFERENCES} from './dist/processing-facilities.js';
import {integrationProfile} from './dist/integration-profiles.js';
import {sizeDesign,defaults,applyPreset} from './dist/design.js';
import {GROUND_OPERATIONS,groundProcessingState} from './dist/ground-processing.js';
import {groundProcessingPlan,processingPlanHtml} from './dist/processing-plan.js';
import {baselineRecord,baselineHtml} from './dist/mission-baseline.js';

const cap=(record,id)=>record.capabilities.find(c=>c.id===id);
const matched=new Set();
for(const launcher of Object.keys(launchFleet)){
 for(const site of launchSitesFor(launcher)){
  const facility=processingFacility(launcher,site.id);matched.add(facility.id);
  assert.equal(processingFacility({input:{launcher,launchSite:site.id}}),facility);
  assert.equal(processingFacility({launcher,launchSite:site.id}),facility);
  assert.equal(processingFacility({design:{launcher,launchSite:site.id}}),facility);
  assert.ok(facility.name&&facility.location&&facility.roles.length>=2);
  assert.ok(facility.sources.every(s=>new URL(s.url).protocol==='https:'&&s.section));
  assert.equal(facility.missionApproval,'open','A sourced facility must not imply mission acceptance');
  assert.equal(facility.schematic,true,'No route may imply an as-built 3D model');
  assert.equal(cap(facility,'environmental-test').status,'offsite','A processing bay is not automatically a qualification laboratory');
  assert.equal(cap(facility,'battery-charging').status,'planned','A charge animation is not a completed hardware test');
  assert.equal(cap(facility,'rf-checkout').status,'planned');
  assert.ok(facility.portableGSE.find(g=>g.id==='fluid-servicing'));
  assert.ok(facility.requiredApprovals.find(a=>a.id==='facility-fit'));
  assert.ok(Object.isFrozen(facility)&&Object.isFrozen(facility.capabilities));
 }
}
assert.equal(matched.size,Object.keys(PROCESSING_FACILITIES).length,'Every catalog facility has a supported launch route');
assert.equal(processingFacility('terran'),processingFacility('terranX'));
assert.notEqual(processingFacility('glenn'),processingFacility('glenn9'));
assert.equal(processingFacility('glenn').status,'planned');
assert.equal(processingFacility('glenn9').status,'planned');
assert.equal(processingFacility('longMarch9').status,'study');
assert.notEqual(processingFacility('falconHeavy','ksc-lc39a'),processingFacility('falconHeavy','vandenberg-slc6'));
assert.notEqual(processingFacility('vulcan6','cape-slc41'),processingFacility('vulcan6','vandenberg-slc3e'));
assert.equal(new Set(launchSitesFor('starship').map(s=>processingFacility('starship',s.id).id)).size,4);
for(const site of launchSitesFor('starship')){
 const facility=processingFacility('starship',site.id);
 assert.equal(facility.status,'study');
 assert.equal(cap(facility,'hazardous-fluid-servicing').status,'unconfirmed');
}
assert.equal(cap(processingFacility('vulcan6'),'hazardous-fluid-servicing').status,'documented');
assert.equal(cap(processingFacility('vulcan6','vandenberg-slc3e'),'hazardous-fluid-servicing').status,'unconfirmed');
assert.match(processingFacility('falconHeavy','vandenberg-slc6').limitations.join(' '),/Building 398/);
assert.deepEqual(processingFacility('ariane64').roles.map(r=>r.id),['prepare','service','encapsulate','integrate']);
assert.equal(FACILITY_REFERENCES.wallops.launchAssignment,false);
assert.ok([...matched].every(id=>!id.includes('wallops')));
assert.equal(processingFacility('falconHeavy','starbase-pad2'),processingFacility('falconHeavy'),'Stale site selection follows the existing compatible-site fallback');
assert.throws(()=>processingFacility('constructor'),RangeError);
assert.throws(()=>processingFacility('unknown'),RangeError);
assert.throws(()=>processingFacility(null),RangeError);
assert.match(integrationProfile('ariane64').interface.source.url,/\/app\/uploads\//,'Use the current official manual path');
assert.equal(integrationProfile('vulcan6').interface.diameterMm,1575.05,'Facility work must not change the launcher interface');
assert.equal(integrationProfile('ariane64').interface.diameterMm,1780);

for(const [launcher,launchSite] of [['vulcan6','vandenberg-slc3e'],['starship','louisiana-study'],['ariane64','kourou-ela4']]){
 const h=sizeDesign({...applyPreset(defaults,'launcher',launcher),launchSite});
 const before=JSON.stringify(h),plan=groundProcessingPlan(h),savedPlan=JSON.stringify(plan);
 assert.equal(plan.launcher,launcher);assert.equal(plan.launchSite,launchSite);
 assert.equal(plan.facility,processingFacility(launcher,launchSite));
 assert.equal(plan.designTargets.fuelKg,h.fuelKg);assert.equal(plan.designTargets.oxidizerKg,h.oxidizerKg);
 assert.ok(Object.keys(plan.designTargets).every(key=>!/illustrated|storedKWh|energyAdded/i.test(key)),'Export targets must exclude rehearsal-derived readings');
 for(const operation of GROUND_OPERATIONS){
  for(const progress of [0,.5,1])assert.equal(groundProcessingState(h,operation.id,progress).verificationStatus,'planned');
 }
 assert.equal(JSON.stringify(h),before,'Rehearsal must not mutate the hardware or flight targets');
 assert.equal(JSON.stringify(groundProcessingPlan(h)),savedPlan,'Playback must not close or change the PDR plan');
 assert.ok(plan.verification.every(v=>v.status==='Planned · evidence open'&&v.reference.url));
 assert.ok(plan.operations.every(o=>o.evidenceStatus==='Planned · evidence open'&&o.reference.url));
 assert.equal(plan.facility.missionApproval,'open');
 assert.match(plan.facility.portableGSE.find(g=>g.id==='cooling').description,/isolating heat exchanger/);
 assert.match(plan.facility.portableGSE.find(g=>g.id==='cooling').description,/ammonia.*separate/);
 const html=processingPlanHtml(plan),embedded=JSON.parse(html.match(/<script type="application\/json" id="odc-ground-processing-plan">([\s\S]*?)<\/script>/)[1]);
 assert.equal(embedded.facility.id,plan.facility.id);
 assert.equal(embedded.launchSite,launchSite);
 assert.equal(embedded.status,'Planned · evidence open');
 assert.doesNotMatch(html,/undefined|NaN/);
 if(launcher==='vulcan6'){
  const baseline=baselineRecord(h),report=baselineHtml(baseline);
  assert.equal(baseline.groundProcessing.facility.id,plan.facility.id);
  assert.equal(baseline.groundProcessing.launchSite,launchSite);
  assert.ok(report.includes(plan.facility.name));
  assert.ok(report.includes('Planned · evidence open'));
 }
}
console.log('Launcher-specific processing routes, source boundaries, unchanged flight targets, evidence-open rehearsals and Mission Baseline/export integration validated.');
