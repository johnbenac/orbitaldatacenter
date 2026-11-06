// Exercise the actual buffer geometry and transforms consumed by both renderers.
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {makeCraft} from './dist/craft.js';
import {createTerminalWaves} from './dist/terminal-waves.js';
import {terminalPattern} from './dist/terminal-activity.js';
import {missionStarter,sizeDesign} from './dist/design.js';
import {siteApproach} from './dist/launch-director.js';
import {createSimulation} from './dist/model.js';
import {eciScene} from './dist/flight-frame.js';
import {R} from './dist/orbit.js';

const painter=new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):['createLinearGradient','createRadialGradient'].includes(k)?()=>({addColorStop(){}}):()=>{},set:()=>true});
globalThis.document={createElement:()=>({getContext:()=>painter})};
const seed=missionStarter('text'),h=sizeDesign({...seed,...siteApproach(seed).angles}),sim=createSimulation(h);
const s=sim.at(7361.682),craft=makeCraft(h),waves=createTerminalWaves(),V=()=>new T.Vector3();
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} ≠ ${b}`);
const active=()=>waves.group.children.filter(o=>o.visible);
const update=(state,clock,globe=false)=>waves.update(h,state,craft,globe,true,.012,clock);
const node=(name,direction)=>active().find(n=>n.userData.terminal===name&&n.userData.direction===direction);
craft.pointTerminals(V().fromArray(s.dishBoresightBody),V().fromArray(s.opticalBoresightBody));
update(s,0);assert.equal(active().length,3);
for(const [name,dir] of [['S-band','tx'],['S-band','rx'],['Ka','tx']])assert(node(name,dir));
const ka=node('Ka','tx'),rx=node('S-band','rx');
near(ka.position.distanceTo(craft.apertures.Ka.getWorldPosition(V())),0);
const patch=craft.apertures.patches[s.stationDirectionBody[0]>=0?1:0];
near(rx.position.distanceTo(patch.getWorldPosition(V())),0);
const axis=V().set(0,1,0).applyQuaternion(rx.children[1].quaternion);near(axis.x,s.stationDirectionBody[0]>=0?1:-1);
const route=ka.children[0],pattern=ka.children[1],base=pattern.children[0],edge=pattern.children[1],tip=V().set(0,1,0);
near(base.scale.x,h.input.kaDishM/2);
const end=edge.localToWorld(tip),endLocal=pattern.worldToLocal(end);
near(Math.hypot(endLocal.x,endLocal.z),h.input.kaDishM/2+endLocal.y*Math.tan(terminalPattern(h.input,'Ka').fullWidthRad/2));
const outgoing=route.children.find(o=>o.isMesh),incoming=rx.children[0].children.find(o=>o.isMesh),old=[outgoing.position.y,incoming.position.y];
update(s,.1);assert(outgoing.position.y>old[0]);assert(incoming.position.y<old[1]);
const optical={...s,terminalActivity:[{terminal:'Optical',direction:'tx',route:'direct',peer:s.station,mbps:20}]};
update(optical,.2);near(node('Optical','tx').position.distanceTo(craft.apertures.Optical.getWorldPosition(V())),0);
const laser=node('Optical','tx').children[0],laserHead=laser.children.find(o=>o.isMesh),laserTail=laser.children[2];
assert(laserHead.scale.x*2<=.012*1.5);assert(laserTail.isLine&&laserTail.scale.y>laserHead.scale.y);
update(s,.2,true);for(const entry of active()){
 const path=entry.children[0].children[0];
 near(path.localToWorld(V().set(0,1,0)).distanceTo(eciScene(s.stationECI,1/R)),0);
}
update({...s,terminalActivity:[]},.3);assert(!waves.group.visible);
const relay={...optical,station:null,stationECI:null,terminalActivity:['rx','tx'].map(direction=>({...optical.terminalActivity[0],direction,route:'relay',peer:'Assumed relay'}))};
update(relay,.4);assert.equal(active().length,2);assert(active().every(n=>n.userData.relay));
for(const n of active())near(n.position.distanceTo(craft.apertures.Optical.getWorldPosition(V())),0);
update(relay,.4,true);assert(!waves.group.visible);
waves.destroy();console.log('Physical apertures, patch face, Ka widening, opposing wave travel, globe endpoints and relay/idle suppression verified.');
