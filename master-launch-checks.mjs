import assert from 'node:assert/strict';
import {missionStarter,sizeDesign,applyPreset} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {exportMechanical} from './dist/mechanical-design.js';
import {masterTimeline} from './dist/master-timeline.js';
import {launchGuide,launchSequence} from './dist/launch-director.js';
import {launchFleet} from './dist/launch-fleet.js';
import {launchEffectsAt,launchClockFor} from './dist/launch-effects-state.js';
import {INTEGRATION_TIMES} from './dist/integration-sequence.js';
import {launchHold,masterLaunchEvents} from './dist/master-launch-events.js';

for(const [id,vehicle] of Object.entries(launchFleet)){
 const h=sizeDesign(applyPreset(missionStarter('text'),'launcher',id)),clock=launchClockFor(id),rows=masterLaunchEvents(h);
 const at=k=>rows.find(r=>r.id==='launch-'+k);
 assert.equal(rows.length,new Set(rows.map(r=>r.id)).size);
 assert(rows.every((r,i)=>i===0||rows[i-1].start<=r.start));
 assert.deepEqual(rows.filter(r=>r.precision==='hour'&&r.seek===null).map(r=>r.start/3600),[-6,-2]);
 assert.deepEqual(rows.filter(r=>r.precision==='day').map(r=>r.start/86400),[-21,-14,-7,-2]);
 assert(rows.filter(r=>r.precision==='day').every(r=>r.seek===null));
 assert.deepEqual(rows.filter(r=>r.id.startsWith('launch-handling-')).map(r=>r.start),INTEGRATION_TIMES);
 assert.equal(at('ignition').start,launchEffectsAt(0,id).engineStart);
 assert.equal(at('liftoff').start,0);assert(at('max-q').start>0&&at('max-q').start<clock.coreCutoff);
 assert.equal(!!at('strap-separate'),vehicle.boosters>0);
 assert.equal(!!at('stage-separate'),vehicle.stages>1);
 assert.equal(!!at('jettison'),id!=='starship');
 assert.equal(!!at('door'),id==='starship');
 assert.equal(at('orbit').start,540);assert.equal(at('release').start,clock.release);
 assert.equal(at('release').end,at('clear').start);assert(at('clear').end==null);
 if(id==='longMarch5B')assert(!at('upper-start')&&!at('upper-cutoff'));
 if(id==='starship')assert(at('hot-stage').start<at('stage-separate').start&&at('door').start<at('release').start);
}
const h=sizeDesign(missionStarter('text'));assert.equal(launchHold(h),null);
for(const held of [{...h,payloadInterface:{...h.payloadInterface,passes:false}},{...h,fairing:{...h.fairing,fit:false}},{...h,launchScreenMarginKg:-50}]){
 const rows=masterLaunchEvents(held);assert(launchHold(held));
 assert(rows.some(row=>row.status==='held'));
 assert(rows.filter(row=>row.status==='blocked').every(row=>row.seek===null));
 assert(rows.filter(row=>row.start>=0).every(row=>row.status==='conditional'));
}
console.log('Ten carrier timelines match loading, exhaust, staging, insertion and release clocks. Interface, enclosure and mass holds preserve conditional flight studies.');

for(const id of ['starship','glenn']){
 const h=sizeDesign(applyPreset(missionStarter('text'),'launcher',id)),sim=createSimulation(h);
 const release=launchClockFor(id).release,held=sim.at(release-.01),free=sim.at(release);
 const attached=exportMechanical(h,held,'D'),separated=exportMechanical(h,free,'D');
 assert(held.carrierAttached&&attached.adapterAttached);assert(!free.carrierAttached&&!separated.adapterAttached);
 assert.equal(held.attitudeMode,'launch');assert.equal(free.attitudeMode,'insertion');
 assert.equal(held.cmgKW,.005);assert(free.cmgKW>held.cmgKW);
 assert.equal(attached.rows.find(r=>r.wbs==='09.01').equipmentKg,h.input.adapterKg);
 assert.equal(separated.rows.find(r=>r.wbs==='09.01').equipmentKg,0);
 const orbit=sim.at(550),timeline=masterTimeline(sim);
 assert.equal(orbit.flightPhase,'insertion');assert.equal(orbit.carrierAttached,id==='starship');
 const guide=launchGuide(h,orbit,{},false),panel=launchSequence(h,orbit,timeline);
 assert.match(guide,id==='starship'?/cargo door opening/:/Payload separating/);assert(!guide.includes('Exhaust routing'));
 assert(panel.includes('deploy-hold'));assert(panel.includes(timeline.rows.find(r=>r.id.startsWith('ignition-trim-')||r.id==='trim-check').id));
 assert(timeline.rows.find(r=>r.id==='launch-climb').start===35);
}
console.log('Matched carrier release, adapter mass, gyro control and handover actions for conventional and retained-door payloads.');
