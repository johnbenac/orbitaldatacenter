import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {launchPath} from './dist/launch-path.js';
import {defaults} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {DEPLOY_END_S} from './dist/commissioning-clock.js';
import {deploymentLayout} from './dist/deployment.js';
import {ramSilhouette} from './dist/silhouette.js';
import {chronologicalAudit} from './dist/mission-worker.js';
import {groundSites,DAY,YEAR} from './dist/orbit.js';
import {atmosphere,burnMass,packStep} from './dist/physics.js';
const near=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<=tol,`${a} vs ${b} (tolerance ${tol})`);
const sim=createSimulation(defaults);
const pass=sim.events(0,DAY).find(e=>e.type==='contact'&&e.start>DEPLOY_END_S);
assert.ok(pass,'The default mission has a ground contact after deployment.');
const pre=sim.at(pass.start-2),acquisition=sim.at(pass.start+1);
const transfer=sim.at(pass.start+90),post=sim.at(pass.end+2);
assert.ok(pre.station===null&&transfer.acquired&&post.station===null);
assert.ok(transfer.goodputMbps>0&&transfer.terminalKW>pre.terminalKW);
assert.ok(post.deliveredGB>pre.deliveredGB);

// A parked terminal slews during acquisition and returns after contact. Its
// reaction enters mechanism momentum. CMG power follows the achieved gimbal
// rates throughout those transients and steady tracking. The power ordering at
// any two samples depends on their actual actuator motion.
assert.ok(!acquisition.acquired&&acquisition.terminalAngularRateDegS>0);
const mechanismChange=acquisition.attitudeDynamics.mechanismMomentumBodyNms.map((value,i)=>
 value-pre.attitudeDynamics.mechanismMomentumBodyNms[i]);
assert.ok(Math.hypot(...mechanismChange)>.1,'Acquisition changes relative mechanism momentum.');
const contactSamples=[pre,acquisition,transfer,sim.at((pass.start+pass.end)/2),post];
for(const sample of contactSamples){
 const dynamics=sample.attitudeDynamics,rates=dynamics.gimbalRatesRadS;
 assert.equal(rates.length,4);
 assert.ok(rates.every(Number.isFinite),'CMG gimbal rates are finite.');
 assert.ok(Number.isFinite(dynamics.gimbalRateLimitRadS)&&dynamics.gimbalRateLimitRadS>0);
 const maximumRate=Math.max(...rates.map(Math.abs));
 assert.ok(maximumRate<=dynamics.gimbalRateLimitRadS+1e-10,'Each gimbal obeys its speed limit.');
 const duty=Math.min(1,maximumRate/Math.max(.001,dynamics.gimbalRateLimitRadS));
 const expectedKW=(sim.hardware.cmg.idleW+duty*(sim.hardware.cmg.maneuverW-sim.hardware.cmg.idleW))/1000;
 near(sample.cmgKW,expectedKW,1e-12);
 assert.ok(sample.cmgKW>=sim.hardware.cmg.idleW/1000-1e-12&&sample.cmgKW<=sim.hardware.cmg.maneuverW/1000+1e-12);
 assert.ok(dynamics.angularMomentumResidualNms<1e-8,'Internal actuation preserves the angular-momentum balance.');
}
for(const t of [0,600,1201,pass.start,pass.start+90,pass.end,43200,DAY,2*DAY]){const x=sim.at(t);near(sim.hardware.initialQueueGB+x.generatedGB,x.queueGB+x.deliveredGB+x.droppedGB,1e-6); near(x.wetKg,sim.hardware.dryKg+sim.hardware.pressurantKg+x.propellantKg);near(x.fuelKg+x.oxidizerKg,x.propellantKg);}
const reboost=sim.events(0,DAY).find(e=>e.type==='reboost'),before=sim.at(reboost.start),after=sim.at(reboost.end+.01);assert.ok(after.propellantKg<before.propellantKg&&after.meanAltitudeKm>before.meanAltitudeKm);
const h=sim.hardware,plateArea=type=>deploymentLayout(h).descriptors.filter(v=>v.type===type).reduce((a,v)=>a+v.width*v.depth,0);const rad=plateArea('rad'),bodyY=h.bodyWidthM*h.bodyLengthM,bodyZ=h.bodyWidthM*h.bodyHeightM;
near(ramSilhouette(h,[1,0,0],1),h.bodyHeightM*h.bodyLengthM);
// Along Y the two parked banks project onto each other. Their shared width
// fits inside the spine, so only the projection beyond its forward end adds drag.
const k=deploymentLayout(h),proj=Math.SQRT1_2,overhang=[0,1].reduce((sum,j)=>{
 const start=k.radRoot+(k.r*j+.07+k.hingeStand)*proj,end=k.radRoot+(k.r*(j+1)-.07+k.hingeStand)*proj;
 return sum+Math.max(0,end-Math.max(h.bodyLengthM/2,start));
},0);
near(ramSilhouette(h,[0,1,0],1),plateArea('pv')+bodyY+k.rw*overhang);
const axialArea=ramSilhouette(h,[0,0,1],1);
assert.ok(axialArea>=Math.max(bodyZ,rad*Math.SQRT1_2-.01)&&axialArea<=bodyZ+rad*Math.SQRT1_2+.01);

for(const [n,k] of [['polar',3],['svalbard',1],['global',6]])assert.equal(groundSites(n).length,k);
near(burnMass(1e3,300,15),1000*(1-Math.exp(-15/(9.80665*300))));near(packStep(50,10,20,1,0,100,20,20,.90,.8).energy,37.5);
const table=atmosphere({...defaults,solarCyclePhase:0,f107Floor:140,f107Ceiling:140,ap:15},{windowAgeYears:0,t:0,altitudeKm:500,sunRadial:0});near(table.densityKgM3/8.60e-13,1);
const observed=atmosphere({...defaults,solarCyclePhase:0,solarDriver:'observed'},{windowAgeYears:0,t:0,altitudeKm:500,sunRadial:0});near(observed.f107Daily,69.8);
console.log('Production contact, CMG power, burn, inventory, geometry and atmosphere checks passed.');

// Exercise the production projection through the full 30-year horizon. This
// isolated fixture begins with one representative day and retains the 90-day
// block size. The chronological mission cases use the unmodified model.
const modelUrl=new URL('./dist/model.js',import.meta.url);
let projectionSource=await readFile(modelUrl,'utf8');
assert.ok(projectionSource.includes('const earlyDays=60,sampleBlock=90'));
projectionSource=projectionSource.replace('const earlyDays=60,sampleBlock=90','const earlyDays=0,sampleBlock=90');
projectionSource=projectionSource.replace(/from '(\.\/[^']+)'/g,(_,path)=>`from '${new URL(path,modelUrl).href}'`);
const {createSimulation:createProjectedSimulation}=await import('data:text/javascript;base64,'+Buffer.from(projectionSource).toString('base64'));
console.log('Starting 30-year projection with 90-day representative blocks.');
const long=createProjectedSimulation({...defaults,missionYears:30}),profile=long.mission(11);for(const point of profile)for(const key of ['altitudeKm','socPct','propellantKg','queueGB','junctionK','momentumNms','deliveredGB'])assert.ok(Number.isFinite(point[key]),key);assert.ok(profile.at(-1).deliveredGB>profile.at(-1).dayDeliveredGB);
for(const x of [...profile,pre,transfer,post]){near(x.textGeneratedGB,x.textQueueGB+x.textDroppedGB+x.textDeliveredGB,1e-4);near(x.deliveredGB,x.textDeliveredGB+x.bulkDeliveredGB,1e-5);near(x.uplinkGeneratedMB,x.uplinkQueueMB+x.uplinkDroppedMB+x.uploadedGB*1000,.0001);assert.ok(x.tokensDelivered<=x.tokensGenerated+1);assert.ok(x.textDroppedGB<=x.droppedGB+.00001);}
assert.ok(post.bulkDeliveredGB>0 && post.tokensDelivered<post.deliveredGB*1e9/defaults.bytesPerToken);
console.log('30-year finite preview and traffic-ledger closure passed.');
const start=120*DAY+.6*DAY;long.daySummary(start);for(const [field,tol] of [['queueGB',.001],['propellantKg',.001],['socPct',.001],['momentumNms',.01],['junctionK',.01]])near(long.at(121*DAY-.001)[field],long.at(121*DAY+.001)[field],tol);
const shorter=createProjectedSimulation({...defaults,missionYears:1});near(shorter.at(.5*YEAR).propellantKg,long.at(.5*YEAR).propellantKg);
console.log('Selected-window continuity and six-month age independence passed. Starting chronological audit and disposal checks.');
const audit=chronologicalAudit({...defaults,missionYears:.008}),ae=createSimulation({...defaults,missionYears:.008}).at(.008*YEAR);near(audit.result.finalState.propellantKg,ae.propellantKg);near(audit.result.finalState.deliveredGB,ae.deliveredGB,.0001);assert.ok(audit.result.contactCount>0&&audit.result.eclipseCount>0&&audit.result.maxJunctionK>=ae.junctionK);assert.ok(audit.result.dayStats.length===3);
const siteMission=createSimulation({...defaults,...launchPath(defaults).angles}),t0=siteMission.at(0),insert=siteMission.at(540);near(t0.altitudeKm,0,1e-8);near(siteMission.at(-120).altitudeKm,0,1e-8);near(siteMission.at(539.999).altitudeKm,insert.altitudeKm,.001);
for(let i=0;i<3;i++){near(siteMission.at(539.999).positionECI[i],insert.positionECI[i],.009);near(siteMission.at(539.999).velocityECI[i],insert.velocityECI[i],.0001);}
const missionModel=createSimulation({...defaults,missionYears:.008}),plan=missionModel.disposal(),beforeIgn=missionModel.at(plan.start),cut=missionModel.at(plan.cutoff),entry=missionModel.at(plan.entry),final=missionModel.at(missionModel.duration);
assert.ok(plan.feasible&&plan.cutoff>plan.start&&plan.entry>plan.cutoff);near(cut.perigeeKm,plan.goal,.0001);near(entry.altitudeKm,120,.0001);near(cut.propellantKg,entry.propellantKg);near(entry.propellantKg,final.propellantKg);near(beforeIgn.propellantKg-cut.propellantKg,plan.usedKg,.00001);near(cut.disposalPaidDv,9.80665*defaults.isp*Math.log(beforeIgn.wetKg/cut.wetKg),.000001);near((plan.cutoff-plan.start)*defaults.thrustN,plan.usedKg*9.80665*defaults.isp,.001);
assert.equal(entry.flightPhase,'entry');assert.ok(entry.velocityECI.reduce((a,v,i)=>a+v*entry.positionECI[i],0)<0);assert.equal(cut.tokensPerSec,0);
const bad=createSimulation({...defaults,missionYears:.007,propellantKg:1,trimDv:0}),bf=bad.at(bad.duration);assert.equal(bf.disposalStatus,'infeasible');near(bf.disposalUsedKg,0);near(bf.propellantKg,1);assert.equal(bad.disposal().entry,null);assert.equal(bad.at(bad.ignition+1).burn,false);
for(const c of missionModel.story().filter(c=>c.status==='available')){const ev=missionModel.events(c.start-1,c.end-c.start+2).find(e=>e.id===c.eventId);assert.ok(ev,c.id);}
const guide=missionModel.story();let last=-Infinity;for(const c of guide.filter(c=>c.status==='available')){assert.ok(c.start>=last,c.id);last=c.end;}
const unload=sim.story('desat');if(unload.status==='available'){sim.focusWindow(Math.floor(unload.start/DAY)*DAY);assert.ok(sim.at(unload.instant).desat);assert.ok(sim.events(unload.start-1,unload.end-unload.start+2).some(e=>e.id===unload.eventId));}
console.log('Operational checks passed: contact, CMG and RF traces; propellant, burn and byte closure; ECSS and observed solar baselines; 30-year finite preview; continuous selected window; age independence; chronological event and inventory audit.');
