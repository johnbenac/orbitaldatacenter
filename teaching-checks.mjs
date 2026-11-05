import assert from 'node:assert/strict';
import {missionStarter} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {domainIds} from './dist/matrix-ui.js';
import {designTeaching} from './dist/design-teaching.js';
import {tradeTeaching} from './dist/trade-teaching.js';
import {flightTeaching} from './dist/flight-teaching.js';
import {comparisonEvents,chooseComparison,compareMoments} from './dist/event-explorer.js';

const design={...missionStarter('text'),missionYears:.014};
const sim=createSimulation(design),h=sim.hardware,s=sim.at(6402);
const ctx={hardware:h,state:s,day:sim.daySummary(0),samples:sim.window(0,86400,13),service:null,windowStart:0,windowEnd:86400};
for(const id of domainIds){
 const lessons=[...['A','B'].map(p=>designTeaching(p,id,h,s)),tradeTeaching(id,ctx,ctx,{key:'solarM2',label:'Solar array area',same:true}),
  ...['D','E','F'].map(p=>flightTeaching(p,id,h,p==='D'?sim.at(-2000):p==='F'?sim.at(sim.ignition):s,{},p==='F'?sim.disposal():null))];
 for(const l of lessons){assert.ok(l.question&&l.explanation&&l.evidence.length>=1,id);assert.doesNotMatch(JSON.stringify(l),/NaN|undefined|Infinity/)}
}
const ev=comparisonEvents(sim.events(0,86400),0,86400);
const dark=chooseComparison(ev,'',6402,'power'),night=compareMoments(sim,dark);
assert.equal(dark.type,'eclipse');assert.deepEqual(night.states.map(x=>x.eclipse),[false,true,false]);assert.equal(night.states[1].solarKW,0);
assert.ok(night.states[1].dischargeKW>0&&night.states[2].chargeKW>0);assert.ok(night.states[0].batteryKWh>night.states[2].batteryKWh);
const contact=chooseComparison(ev,'',2110,'comm'),pass=compareMoments(sim,contact);
assert.equal(contact.type,'contact');assert.equal(pass.states[1].station,contact.station);assert.equal(pass.states[0].station,null);assert.equal(pass.states[2].station,null);
assert.ok(pass.states[1].goodputMbps>0&&pass.states[2].deliveredGB>pass.states[0].deliveredGB);
assert.equal(chooseComparison(ev,contact.id,6402,'power'),contact);
assert.equal(comparisonEvents([contact],contact.start,contact.end).length,0);assert.equal(chooseComparison([],'',6402,'power'),null);
console.log('Phase A–F notes for all domains, a battery discharge/recharge crossing, a transmitting pass, and partial/empty comparison windows passed.');
