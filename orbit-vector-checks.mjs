import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {geometry,R} from './dist/orbit.js';
import {defaults} from './dist/design.js';
import {eciScene} from './dist/flight-frame.js';
import {createOrbitVectors,orbitVectorReadings,orbitVectorsAvailable,behindGlobe} from './dist/orbit-vectors.js';

const d={...defaults,ecc:.035,meanAnomalyDeg:64},s=geometry(d,540);
const v=orbitVectorReadings(s).find(r=>r.id==='velocity'),mag=Math.hypot(...s.velocityECI);
assert.equal(v.value,mag.toFixed(2)+' km/s');
assert(Math.abs(v.directionECI.reduce((a,n,i)=>a+n*s.radial[i],0))>.01,'An eccentric orbit must retain its radial velocity component');
assert(Math.abs(mag-s.relativeSpeedMs/1000)>.01);
assert.equal(orbitVectorReadings({...s,eclipse:true}).find(r=>r.id==='sun').value,'Earth shadow');
let pass;
for(let t=2200;t<86400;t+=90){const g=geometry(defaults,t);if(g.station){pass=g;break}}
assert(pass);
const tracks=orbitVectorReadings({...pass,goodputMbps:0,acquired:false}),station=tracks.find(r=>r.id==='station');
assert(station.label.includes(pass.station));
for(let i=0;i<3;i++)assert(Math.abs(pass.positionECI[i]+station.directionECI[i]*pass.rangeKm-pass.stationECI[i])<1e-7);
assert(!orbitVectorReadings({...pass,station:null,stationECI:null}).some(v=>v.id==='station'));
assert(orbitVectorsAvailable('spacecraft',s));assert(orbitVectorsAvailable('orbit',s));assert(orbitVectorsAvailable('core',s));
assert(orbitVectorsAvailable('launch',{...s,flightPhase:'insertion'}));assert(!orbitVectorsAvailable('launch',{...s,flightPhase:'operations'}));
for(const view of ['launch','spacecraft','orbit','core']){
 assert(!orbitVectorsAvailable(view,{...s,t:539}));assert(!orbitVectorsAvailable(view,{...s,referenceBody:true}));
}
const layer=createOrbitVectors(),origin=eciScene(pass.positionECI,1/R);
const tips=layer.update(tracks,origin,eciScene,1,500,true,pass.rangeKm);
assert(tips.find(t=>t.id==='station').point.distanceTo(eciScene(pass.stationECI,1/R))<1e-8);
assert.equal(layer.group.children.filter(n=>n.visible).length,3);
layer.update(tracks.filter(t=>t.id!=='station'),origin,eciScene,1,500,true,0);
assert.equal(layer.group.children.filter(n=>n.visible).length,2);
assert(behindGlobe(new T.Vector3(0,0,-1.1),new T.Vector3(0,0,1)));
assert(!behindGlobe(new T.Vector3(1.05,0,-.3),new T.Vector3(0,0,1)));
const intoEarth=layer.update([{id:'sun',color:'#ffc671',directionECI:[-1,0,0]}],new T.Vector3(1.09,0,0),eciScene,1,500,true,0);
assert(intoEarth[0].point.x>1&&intoEarth[0].point.x<1.09,'Shadowed reference terminates just above the near Earth surface');
layer.destroy();
console.log('Inertial eccentric-orbit speed and direction, eclipsed Sun, exact station endpoint without a link, globe occultation and flight-camera gates passed.');
