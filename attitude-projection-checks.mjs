import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {defaults} from './dist/design.js';
import {DAY} from './dist/orbit.js';
import {clusterState,tensorVector,transformBodyToEci} from './dist/attitude-dynamics.js';

// Exercise the production projection after one representative day. Reducing
// only the exact-history warm-up in this isolated module avoids a 60-day test.
const modelUrl=new URL('./dist/model.js',import.meta.url);
let source=await readFile(modelUrl,'utf8');
assert.ok(source.includes('const earlyDays=60,sampleBlock=90'));
source=source.replace('const earlyDays=60,sampleBlock=90','const earlyDays=0,sampleBlock=90');
source=source.replace(/from '(\.\/[^']+)'/g,(_,path)=>`from '${new URL(path,modelUrl).href}'`);
const {createSimulation}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const sim=createSimulation({...defaults,missionYears:.5});
const representative=sim.serviceSeed(DAY);
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} versus ${b}`);
const nearVector=(a,b,tolerance=1e-8)=>a.forEach((v,i)=>near(v,b[i],tolerance));

function checkMomentum(seed){
 const dynamics=seed.attitudeState.dynamics;
 const rotors=clusterState(dynamics.cmgAnglesRad,sim.hardware.cmg.rawUnitMomentumNms).momentumBodyNms;
 const actual=transformBodyToEci(dynamics.q,rotors);
 nearVector(seed.momentumECI,actual);
 near(seed.momentum,Math.hypot(...actual));
 const body=tensorVector(dynamics.inertiaKgM2,dynamics.omegaBodyRadS);
 const total=body.map((v,i)=>v+rotors[i]+dynamics.mechanismMomentumBodyNms[i]);
 nearVector(transformBodyToEci(dynamics.q,total),dynamics.totalMomentumEciNms);
 assert.ok(dynamics.omegaBodyRadS.every(Number.isFinite));
}

for(const days of [2,60]){
 const projected=sim.serviceSeed(days*DAY),state=projected.attitudeState;
 near(projected.t,days*DAY);
 near(state.t,projected.t);
 nearVector(state.q,representative.attitudeState.q);
 nearVector(state.dynamics.cmgAnglesRad,representative.attitudeState.dynamics.cmgAnglesRad);
 nearVector(state.dynamics.totalMomentumEciNms,representative.attitudeState.dynamics.totalMomentumEciNms);
 nearVector(state.referenceQ,state.dynamics.referenceQ);
 nearVector(state.referenceRate,[0,0,0]);
 checkMomentum(projected);
 const snapshot=sim.at(projected.t);
 nearVector(state.referenceQ,snapshot.bodyReferenceQ);
 near(snapshot.momentumNms,Math.hypot(...snapshot.attitudeDynamics.cmgMomentumBodyNms));
 assert.ok(snapshot.attitudeDynamics.angularMomentumResidualNms<1e-8);
 const continued=sim.serviceDay(projected,600).end;
 near(continued.t,projected.t+600);
 checkMomentum(continued);
}
assert.deepEqual(sim.serviceSeed(DAY),representative);
console.log('Projected attitude epochs, reference reseeding, real rotor momentum, total-momentum closure, immutable representative state and resumed integration passed.');
