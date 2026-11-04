import assert from 'node:assert/strict';
import {defaults} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {ramSilhouette} from './dist/silhouette.js';
import {chronologicalAudit} from './dist/mission-worker.js';
import {groundSites,DAY,YEAR} from './dist/orbit.js';
import {atmosphere,burnMass,packStep} from './dist/physics.js';
const near=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<=tol,`${a} vs ${b} (tolerance ${tol})`);
const sim=createSimulation(defaults),pass=sim.events(0,DAY).find(e=>e.type==='contact'),pre=sim.at(pass.start-2),transfer=sim.at(pass.start+90),post=sim.at(pass.end+2);
assert.ok(pre.station===null&&transfer.acquired&&post.station===null);assert.ok(transfer.goodputMbps>0&&transfer.terminalKW>pre.terminalKW&&transfer.cmgKW>pre.cmgKW);assert.ok(post.deliveredGB>pre.deliveredGB);
for(const t of [0,600,1201,pass.start,pass.start+90,pass.end,43200,DAY,2*DAY]){const x=sim.at(t);near(sim.hardware.initialQueueGB+x.generatedGB,x.queueGB+x.deliveredGB+x.droppedGB,1e-6); near(x.wetKg,sim.hardware.dryKg+sim.hardware.pressurantKg+x.propellantKg);near(x.fuelKg+x.oxidizerKg,x.propellantKg);}
const reboost=sim.events(0,DAY).find(e=>e.type==='reboost'),before=sim.at(reboost.start),after=sim.at(reboost.end+.01);assert.ok(after.propellantKg<before.propellantKg&&after.meanAltitudeKm>before.meanAltitudeKm);
const h=sim.hardware;near(ramSilhouette(h,[0,1,0],1),h.solarM2+h.bodyWidthM*h.bodyLengthM);near(ramSilhouette(h,[1,0,0],1),h.radiatorM2+h.bodyHeightM*h.bodyLengthM);near(ramSilhouette(h,[0,0,1],1),h.bodyWidthM*h.bodyHeightM);
for(const [n,k] of [['polar',3],['svalbard',1],['global',6]])assert.equal(groundSites(n).length,k);
near(burnMass(1e3,300,15),1000*(1-Math.exp(-15/(9.80665*300))));near(packStep(50,10,20,1,0,100,20,20,.90,.8).energy,37.5);
const table=atmosphere({...defaults,solarCyclePhase:0,f107Floor:140,f107Ceiling:140,ap:15},{windowAgeYears:0,t:0,altitudeKm:500,sunRadial:0});near(table.densityKgM3/8.60e-13,1);
const observed=atmosphere({...defaults,solarCyclePhase:0,solarDriver:'observed'},{windowAgeYears:0,t:0,altitudeKm:500,sunRadial:0});near(observed.f107Daily,69.8);
const long=createSimulation({...defaults,missionYears:30}),profile=long.mission(11);for(const point of profile)for(const key of ['altitudeKm','socPct','propellantKg','queueGB','junctionK','momentumNms','deliveredGB'])assert.ok(Number.isFinite(point[key]),key);assert.ok(profile.at(-1).deliveredGB>profile.at(-1).dayDeliveredGB);
for(const x of [...profile,pre,transfer,post]){near(x.textGeneratedGB,x.textQueueGB+x.textDroppedGB+x.textDeliveredGB,1e-4);near(x.deliveredGB,x.textDeliveredGB+x.bulkDeliveredGB,1e-5);near(x.uplinkGeneratedMB,x.uplinkQueueMB+x.uplinkDroppedMB+x.uploadedGB*1000,.0001);assert.ok(x.tokensDelivered<=x.tokensGenerated+1);assert.ok(x.textDroppedGB<=x.droppedGB+.00001);}
assert.ok(post.bulkDeliveredGB>0 && post.tokensDelivered<post.deliveredGB*1e9/defaults.bytesPerToken);
const start=120*DAY+.6*DAY;long.daySummary(start);for(const [field,tol] of [['queueGB',.001],['propellantKg',.001],['socPct',.001],['momentumNms',.01],['junctionK',.01]])near(long.at(121*DAY-.001)[field],long.at(121*DAY+.001)[field],tol);
const shorter=createSimulation({...defaults,missionYears:1});near(shorter.at(.5*YEAR).propellantKg,long.at(.5*YEAR).propellantKg);
const audit=chronologicalAudit({...defaults,missionYears:.008}),ae=sim.at(.008*YEAR);near(audit.result.finalState.propellantKg,ae.propellantKg);near(audit.result.finalState.deliveredGB,ae.deliveredGB,.0001);assert.ok(audit.result.contactCount>0&&audit.result.eclipseCount>0&&audit.result.maxJunctionK>=ae.junctionK);assert.ok(audit.result.dayStats.length===3);
console.log('Operational checks passed: contact, CMG and RF traces; propellant, burn and byte closure; ECSS and observed solar baselines; 30-year finite preview; continuous selected window; age independence; chronological event and inventory audit.');
