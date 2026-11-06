import assert from 'node:assert/strict';
import {missionStarter,sizeDesign} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {siteApproach} from './dist/launch-director.js';
import {clipTransfers,terminalPattern,terminalRuns} from './dist/terminal-activity.js';
import {linkBudget} from './dist/physics.js';

const day=86400,base=missionStarter('text');
Object.assign(base,siteApproach(base).angles);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,a,b),a+' != '+b);
const sum=(rows,select)=>rows.reduce((n,row)=>n+select(row),0);
const same=(a,b)=>a.terminal===b.terminal&&a.direction===b.direction&&a.peer===b.peer&&a.route===b.route;
for(const changes of [{link:'ka'},{link:'optical'},{link:'s'},{serviceRoute:'relay'},{serviceRoute:'hybrid',relayAvailability:.5}]){
 const d={...base,...changes},h=sizeDesign(d),sim=createSimulation(h);
 const runs=sim.terminalRuns(0,day),trace=sim.serviceTimeline(0,day,{flightRecord:true}),expected=terminalRuns(trace),final=sim.at(day),stats=sim.daySummary(0);
 assert.equal(runs.length,expected.length);
 for(let i=0;i<runs.length;i++){
  const r=runs[i],s=sim.at(r.seek);
  near(expected[i].gb,r.gb);assert.ok(same(r,expected[i])&&s.terminalActivity.some(f=>same(f,r)));
  near(sum(Object.values(r.services),x=>x),r.gb);near(r.mbps,r.gb*8000/r.seconds);
  assert.ok(r.mbps>0&&r.seconds>0&&r.start<=r.seek&&r.seek<r.end);
  if(r.route==='direct'){
   assert.equal(r.peer,s.station);if(r.direction==='rx')assert.equal(r.terminal,'S-band');
  }else{assert.equal(r.terminal,'Optical');assert.equal(r.peer,'Assumed relay')}
 }
 for(const [service,total] of Object.entries({telemetry:final.hkDeliveredGB,command:final.commandUploadedGB,input:final.aiInputUploadedGB,payload:final.deliveredGB})){
  near(sum(runs,r=>r.services[service]||0),total);
 }
 near(stats.housekeepingTelemetryGB,final.hkDeliveredGB);
 for(const step of trace){
  if(!step.terminalActivity.length)continue;
  for(const flow of step.terminalActivity){
   if(flow.route==='direct'&&flow.services.payload)assert.equal(step.directPayloadLock,true);
   if(flow.terminal==='S-band'&&flow.direction==='tx'&&flow.services.payload){
    const snapshot=sim.at((step.start+step.end)/2);
    assert.ok(flow.mbps<=Math.min(snapshot.lineMbps*d.codingEff,d.linkCapMbps)+.011);
   }
  }
 }
 assert.ok(runs.some(r=>r.terminal==='S-band'&&r.services.command)&&runs.some(r=>r.services.telemetry));
 const early=runs.find(r=>r.start<2100);assert.ok(early&&early.terminal==='S-band');
 assert.ok(sim.at(early.seek).terminalActivity.every(r=>r.terminal==='S-band'&&!r.services.payload&&!r.services.input));
 assert.deepEqual(sim.at(0).terminalActivity,[]);
 const edge=trace.find(step=>step.terminalActivity.length),length=(edge.end-edge.start)/4;
 const cropped=sim.terminalRuns(edge.start+length,2*length);
 for(const flow of clipTransfers(edge.terminalActivity,2*length))near(cropped.find(r=>same(flow,r)).gb,flow.gb);
 if(d.serviceRoute==='direct')assert.ok(runs.some(r=>r.terminal===({ka:'Ka',s:'S-band',optical:'Optical'})[d.link]&&r.services.payload));
 if(d.serviceRoute==='relay'){assert.ok(runs.some(r=>r.route==='relay'&&r.direction==='rx'));assert.ok(!runs.some(r=>r.route==='direct'&&r.services.payload))}
}
const g={station:'Example',rangeKm:1400,elevationDeg:45};
const boresight=linkBudget(base,g,0,0,0,0,'S-band'),half=linkBudget(base,g,0,0,0,40,'S-band');
near(half.patchLossDb,3);near(boresight.linkMarginDb-half.linkMarginDb,3);
near(terminalPattern(base,'Ka').fullWidthRad*180/Math.PI,70*299792458/(26e9*base.kaDishM));
near(terminalPattern(base,'Optical').fullWidthRad,2*1.22*1.55e-6/base.opticalApertureM);
console.log('Directional terminal intervals match replay and integrated command, telemetry, customer-input and payload ledgers for S-band, Ka, optical, relay and hybrid. Clipped volumes and aperture-dependent beam widths verified.');
