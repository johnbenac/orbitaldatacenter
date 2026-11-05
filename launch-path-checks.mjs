import assert from 'node:assert/strict';
import {defaults,applyPreset,sizeDesign} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {launchFleet} from './dist/launch-fleet.js';
import {launchSitesFor} from './dist/launch-sites.js';
import {launchPath,ascentTrack} from './dist/launch-path.js';
import {launchRiseM} from './dist/launch-effects-state.js';
import {surfacePoint} from './dist/entry.js';
const near=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} versus ${b}`);
for(const id of Object.keys(launchFleet))for(const site of launchSitesFor(id)){
 const d={...applyPreset(defaults,'launcher',id),launchSite:site.id},p=launchPath(d);
 for(const t of [-300,0]){const anchor=surfacePoint(d,t,ascentTrack(p,t).positionECI);near(anchor.latDeg,site.lat);near(anchor.lonDeg,site.lon);}
 for(const t of [1,5,14,35])near(surfacePoint(d,t,ascentTrack(p,t).positionECI).altitudeKm*1000,launchRiseM(t,id),1e-5);
 for(const [inc,e] of [[.1,0],[53,0],[98,.02],[179,0]]){
  const goal={...d,inclinationDeg:inc,ecc:e},s=launchPath(goal),matched={...goal,...s.angles},q=launchPath(matched);
  assert.equal(s.latitudeLimited,Math.min(inc,180-inc)<Math.abs(site.lat));near(q.gapKm,0,.001);
  assert.ok(Math.abs(q.planeErrorDeg)<1e-4);
  const injection=ascentTrack(q,540);
  q.achieved.positionECI.forEach((v,i)=>near(injection.positionECI[i],v,1e-7));
  q.achieved.velocityECI.forEach((v,i)=>near(injection.velocityECI[i],v,1e-8));
 }
}
const testInput=applyPreset(defaults,'launcher','starship'),path=launchPath(testInput);
const aligned={...testInput,...path.angles},sim=createSimulation(sizeDesign(aligned)),a=sim.at(539.999),b=sim.at(540);
assert.ok(Math.hypot(...a.positionECI.map((v,i)=>v-b.positionECI[i]))<.009);
assert.ok(Math.hypot(...a.velocityECI.map((v,i)=>v-b.velocityECI[i]))<.0001);
assert.equal(sizeDesign({...aligned,launchSite:'wenchang-lc101'}).input.launchSite,'starbase-pad2');
console.log('Pad geography, Earth rotation, vehicle-specific liftoff height and continuous site-matched insertion passed for every assigned facility.');
