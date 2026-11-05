import {DEPLOY_END_S} from './dist/commissioning-clock.js';
import assert from 'node:assert/strict';
import {defaults,applyPreset,normalizeDesign,sizeDesign} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {chronologicalAudit} from './dist/mission-worker.js';
import {R,MU,YEAR,DAY} from './dist/orbit.js';
import {entryDensity,distanceKm,surfacePoint} from './dist/entry.js';
const near=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<=t,`${a} vs ${b} ± ${t}`);
near(entryDensity(0),1.225);near(entryDensity(80),1.846e-5,1e-10);near(distanceKm({latDeg:0,lonDeg:179.9},{latDeg:0,lonDeg:-179.9}),R*Math.PI*.2/180);
const base=createSimulation(defaults),p=base.disposal();assert.equal(p.outcome,'impact');assert.equal(p.method,'reentry');assert.equal(p.target.latDeg,-48.9);assert.equal(p.target.lonDeg,-123.4);assert.ok(p.targetErrorKm<p.target.toleranceKm);assert.ok(p.start<p.cutoff&&p.cutoff<p.entry&&p.entry<p.end);
near(base.at(p.entry).altitudeKm,120,.0001);near(base.at(p.end).altitudeKm,0,.0001);assert.ok(p.impact.speedMs>0&&p.impact.speedMs<100);assert.equal(base.at(p.end).disposalStatus,'impact');near(base.at(p.entry).propellantKg,base.at(p.end).propellantKg);near(base.at(p.entry).disposalUsedKg,p.usedKg);
const middle=base.at((p.entry+p.end)/2);assert.ok(middle.altitudeKm<120&&middle.altitudeKm>0);assert.ok(middle.referenceBody&&middle.entryReferenceDragMS2>0&&middle.entryDynamicPressurePa>0);assert.ok(middle.thermalQualification.every(r=>r.status==='unassessed'));near(middle.tokensGenerated,base.at(p.end).tokensGenerated);
const final=base.at(p.end);near(distanceKm(surfacePoint(defaults,p.end,final.positionECI),p.impact),0,.001);near(distanceKm(p.target,p.impact),p.targetErrorKm);assert.ok(p.footprint.points.length>=73);assert.ok(p.footprint.semiMajorKm>=p.footprint.semiMinorKm&&p.footprint.semiMinorKm>0);near(distanceKm(p.impact,p.footprint.points[0]),p.footprint.semiMajorKm);near(distanceKm(p.impact,p.footprint.points[24]),p.footprint.semiMinorKm);near(p.footprint.confidence,.95);assert.equal(base.story('deorbit').end,p.end);
const d={...defaults,missionYears:3.25*DAY/YEAR},g=createSimulation({...d,disposalMethod:'graveyard'}),q=g.disposal();assert.ok(q.feasible&&q.targetMet);assert.equal(q.burns.length,2);assert.equal(q.entry,null);assert.ok(!q.impact&&!q.footprint);near(q.finalPerigeeKm,d.graveyardAltitudeKm,5);near(q.finalApogeeKm,d.graveyardAltitudeKm,5);
let mass=0;for(const burn of q.burns){const a=g.at(burn.start),b=g.at(burn.end);assert.ok(g.at((burn.start+burn.end)/2).burn);near(a.propellantKg-b.propellantKg,burn.usedKg,.0001);near(burn.dvMs,9.80665*d.isp*Math.log(a.wetKg/b.wetKg),.0001);near(burn.usedKg*9.80665*d.isp,(burn.end-burn.start)*d.thrustN,.001);mass+=burn.usedKg;}
near(q.usedKg,mass,.0001);near(g.at(q.burns[0].end).propellantKg,g.at(q.burns[1].start).propellantKg);assert.equal(g.at(q.end).disposalStatus,'graveyard');assert.equal(g.events(q.start-.1,q.end-q.start+1).filter(e=>e.type==='disposal').length,2);
const {result:verified}=chronologicalAudit(g.hardware.input);near(verified.terminal.usedKg,verified.finalState.disposalUsedKg,.0001);near(verified.terminal.finalPerigeeKm,q.finalPerigeeKm,.001);assert.equal(verified.disposalCount,2);near(verified.payloadServiceSeconds,q.start-180-DEPLOY_END_S,.1);
const bad=createSimulation({...d,targetLatDeg:89,targetToleranceKm:10});assert.equal(bad.disposal().outcome,'infeasible');near(bad.at(bad.duration).disposalUsedKg,0);assert.equal(bad.disposal().entry,null);
const fuel=createSimulation({...d,disposalMethod:'graveyard',propellantKg:1,trimDv:0});assert.equal(fuel.disposal().feasible,false);near(fuel.at(fuel.duration).disposalUsedKg,0);
const tighter=createSimulation({...d,targetToleranceKm:1,entryVelocitySigmaMs:0,entryDensitySigmaPct:0,entryAzimuthSigmaDeg:0,entryBallisticSigmaPct:0}),miss=tighter.disposal();assert.equal(miss.outcome,'target-miss');near(miss.footprint.semiMajorKm,0);near(miss.footprint.semiMinorKm,0);assert.ok(miss.targetErrorKm>1);
const shift=createSimulation({...d,targetLatDeg:10,targetLonDeg:105}).disposal();assert.notEqual(shift.start,miss.start);const beta=createSimulation({...d,entryBallisticKgM2:300}).disposal();assert.ok(Math.abs(beta.impact.speedMs-miss.impact.speedMs)>5);
assert.equal(normalizeDesign({}).disposalMethod,'reentry');assert.equal(sizeDesign(JSON.parse(JSON.stringify(g.hardware.input))).input.disposalMethod,'graveyard');
console.log('Disposal checks passed: fixed reachable target, miss and unreachable latitude; two finite prograde burns and low-propellant inhibition; approach and rotating-atmosphere descent; uncertainty propagation, zero-dispersion limit, map geometry, mission closure and equipment-service stop.');

if(process.argv.includes('--five-year')){
 for(const method of ['reentry','graveyard']){
  const h=sizeDesign({...applyPreset(defaults,'launcher','glenn'),disposalMethod:method});
  assert.ok(h.fit);const {result}=chronologicalAudit(h.input),p=result.terminal;
  assert.equal(p.targetMet,true);near(result.finalState.disposalUsedKg,p.usedKg);
  near(p.initialWet-result.finalState.wetKg,p.usedKg);
  near(p.initialWet*(-Math.expm1(-p.paidDv/(h.input.isp*9.80665))),p.usedKg,.001);
  near(result.payloadServiceSeconds,p.start-180-DEPLOY_END_S,.01);
  near(result.thermal.coveredSeconds,p.entry??p.end,.01);
  // Regression anchors for the 4.03 t elongated reference spacecraft on New Glenn.
  if(method==='reentry'){
   near(p.targetErrorKm,32.16,2);near(p.usedKg,172.94,.5);near(p.impact.speedMs,49.28,.5);near(p.footprint.semiMajorKm,426.9,2);assert.equal(result.impactCount,1);
  }else{
   near(p.finalPerigeeKm,898.83,1);near(p.finalApogeeKm,901.17,1);near(p.usedKg,233.63,.5);assert.equal(result.disposalCount,2);
  }
  console.log(method,JSON.stringify({usedKg:p.usedKg,paidDv:p.paidDv,targetErrorKm:p.targetErrorKm,finalPerigeeKm:p.finalPerigeeKm,finalApogeeKm:p.finalApogeeKm,actualSurfacePoint:p.impact,remainingKg:result.finalState.propellantKg}));
 }
}
