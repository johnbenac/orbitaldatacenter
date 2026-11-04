// Test the same meshes, render-material substitutions, logical bus routes and
// per-domain measurements used in the interactive WebGL/software scene.
import assert from 'node:assert/strict';
import {sizeDesign,defaults,applyPreset} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {makeCraft} from './dist/craft.js';
import {makeLaunch} from './dist/launch-scene.js';
import {launchFleet} from './dist/launch-fleet.js';
import {domainSceneSpecs,recommendedDomainCamera,domainInstruments,routeRates} from './dist/domain-scene.js';
import {focusHardware,hardwarePart,dataRoutes} from './dist/hardware-focus.js';
const painter=new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):['createLinearGradient','createRadialGradient'].includes(k)?()=>({addColorStop(){}}):()=>{},set:()=>true});
globalThis.document={createElement:()=>({getContext:()=>painter})};
const h=sizeDesign({...defaults,link:'auto',initialQueueGB:18000,storageTB:32,bulkMbps:160}),sim=createSimulation(h),active=sim.at(31065),idle=sim.at(7800),packed=sim.at(-300);
assert(active.station&&active.goodputMbps>0);assert(!idle.station);assert.equal(packed.deployment,0);
const craft=makeCraft(h),skin=focusHardware(craft.root),normal=new Map();
craft.root.traverse(o=>{if(o.isMesh)normal.set(o,o.material);});
for(const domain of Object.keys(domainSceneSpecs))for(const phase of ['C','D','E']){
 const view=recommendedDomainCamera(phase,domain),s=phase==='D'?packed:active;skin.apply(domain);
 const marks=domainInstruments(domain,h,s,{view});assert(marks.length>=1,phase+'/'+domain+' empty instruments');
 assert(!marks.some(q=>/undefined|NaN/.test(q.title+' '+q.value)));if(domain!=='thermal')assert(!marks.some(q=>/\bjunction|cold plate|coolant|\d K\b/i.test(q.title+' '+q.value)),domain+' stray temperature');
 if(phase==='D')assert.equal(view,domain==='orbit'?'orbit':'launch');
 if(domain==='data'){for(const [o] of normal){if(['storage','avionics','communications'].includes(hardwarePart(o)))assert(!o.material.userData.domainGhost);if(['battery','cmg','solar','radiator'].includes(hardwarePart(o)))assert(o.material.userData.domainGhost);}}
}
skin.clear();for(const [o,m] of normal)assert.equal(o.material,m);
assert.equal(craft.driveCount,8);assert.equal(craft.torquers.length,3);
const ribbon=dataRoutes(craft,h),rates=routeRates(h,active);assert.equal(rates.text,active.tokensPerSec*h.input.bytesPerToken*8/1e6);assert.equal(rates.down,active.goodputMbps);
for(const s of [packed,idle,active]){ribbon.update(s,true);const down=ribbon.routes.filter(r=>r.key==='down'&&r.tube.visible);assert.equal(down.length,s.goodputMbps>0?1:0);if(down.length)assert.equal(down[0].terminal,s.groundLink);if(s.t<0)assert(ribbon.routes.every(r=>!r.pulse.visible));}
ribbon.destroy();skin.destroy();
for(const [id,item] of Object.entries(launchFleet)){
 const hw=sizeDesign(applyPreset(defaults,'launcher',id)),rocket=makeLaunch(hw);
 assert.equal(rocket.geometry.sideBoosters,item.boosters,id+' side boosters');assert.equal(rocket.geometry.stages,item.stages,id+' axial stages');
 assert(Math.abs(rocket.geometry.heightM-item.heightM)<1e-5,id+' height');assert.equal(rocket.geometry.diameterM,item.diameterM);
 const view=rocket.update(active,'operations',{domain:'launcher',phase:'C'});assert(view.reference&&view.vehicleStudy&&rocket.parts.lower.visible);assert.equal(rocket.parts.boosters.filter(x=>x.visible).length,item.boosters);
 rocket.update(packed,'pad',{domain:'data',phase:'D'});assert(rocket.parts.payload.visible);assert(rocket.parts.shell.visible);
 rocket.update({...active,t:175,flightPhase:'ascent'},'ascent',{domain:'launcher',phase:'D'});assert(!rocket.parts.boosters.some(x=>x.visible));if(item.stages===1)assert(!rocket.parts.upper.visible);
}
console.log('13 domains × C/D/E, per-part material ghosting and restoration, stage-preserving Phase D cameras, exact data routes and ten fleet configurations passed.');
