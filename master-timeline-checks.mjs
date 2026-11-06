import assert from 'node:assert/strict';
import {missionStarter} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {masterTimeline} from './dist/master-timeline.js';
import {DEPLOY_END_S,deploymentMET} from './dist/commissioning-clock.js';
import {DEPLOYMENT_STAGES} from './dist/deployment.js';
import {DAY} from './dist/orbit.js';

const design=missionStarter('text'),sim=createSimulation(design),nominal=masterTimeline(sim);
function sanity(m){
 assert(m.rows.length&&m.rows[0].start===m.start&&m.rows.at(-1).start===m.end);
 assert.equal(new Set(m.rows.map(r=>r.id)).size,m.rows.length);
 for(const [i,r] of m.rows.entries()){
  assert(Number.isFinite(r.start)&&r.start>=m.start&&r.start<=m.end,r.id);
  if(i)assert(r.start>=m.rows[i-1].start);
  if(r.end!=null)assert(r.end>=r.start&&r.end<=m.end,r.id);
  if(r.seek!=null)assert(r.seek>=m.start&&r.seek<=m.end,r.id);
  assert(r.owner&&r.title&&r.description&&r.basis,r.id);
 }
}
sanity(nominal);assert.equal(masterTimeline(sim),nominal);
const pass=sim.events(0,DAY).find(e=>e.type==='contact'&&e.start>=DEPLOY_END_S);
assert.equal(nominal.end,pass.end);assert(nominal.endReason.includes(pass.station));
for(const stage of DEPLOYMENT_STAGES)assert.equal(nominal.rows.find(r=>r.id==='deploy-'+stage.id).start,deploymentMET(stage.at));
const aos=nominal.rows.find(r=>r.id==='aos-'+pass.id),lock=nominal.rows.find(r=>r.id==='lock-'+pass.id),los=nominal.rows.find(r=>r.id==='los-'+pass.id);
assert.equal(aos.start,pass.start);assert.equal(los.start,pass.end);assert(lock.start>aos.start);assert(sim.at(lock.seek).directPayloadLock);
const delta=sim.at(pass.end).deliveredGB-sim.at(pass.start).deliveredGB;
assert(los.description.includes(delta.toFixed(2)+' GB'));
assert(Math.abs(los.measurements.direct_payload_gb-delta)<1e-6);
const {received_commands_gb}=los.measurements;assert(Math.abs(received_commands_gb-(sim.at(pass.end).commandUploadedGB-sim.at(pass.start).commandUploadedGB))<1e-9);
const duringDeployment=nominal.rows.find(r=>r.id.startsWith('los-contact')&&r.start<DEPLOY_END_S);
assert.match(duringDeployment.description,/delivered 0 bytes of payload/);

const relay=masterTimeline(createSimulation({...design,serviceRoute:'relay'}));sanity(relay);
assert(!relay.rows.some(r=>r.id.startsWith('lock-contact')));
assert(relay.rows.filter(r=>r.id.startsWith('los-contact')).every(r=>r.description.includes('0 bytes of payload')));
const missing=masterTimeline(createSimulation({...design,network:'svalbard',inclinationDeg:0,elevationDeg:75}));sanity(missing);
assert.equal(missing.end,DEPLOY_END_S+DAY);assert(!missing.rows.some(r=>r.id.startsWith('aos-contact')));assert.match(missing.endReason,/No complete/);
const held=masterTimeline(createSimulation({...design,cmgMomentumNms:30,trimDv:15,fairingM:1}));sanity(held);
assert(held.launchHold&&held.rows.some(r=>r.id==='trim-check'&&r.status==='conditional'));assert(!held.rows.some(r=>r.id.startsWith('ignition-trim')));
const lost=masterTimeline(createSimulation({...design,trimDv:300,altitudeKm:160,ecc:0}));sanity(lost);
assert.equal(lost.end,540);assert.match(lost.endReason,/altitude limit/);assert(!lost.rows.some(r=>r.id==='deploy-deployed'));
console.log('Master timeline verified against deployment commands, mode handovers, station lock/bytes, relay-only service, contactless checkout limit, inhibited trim and orbital-loss boundary.');
