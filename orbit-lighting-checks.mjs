import assert from 'node:assert/strict';
import {defaults} from './dist/design.js';
import {geometry} from './dist/orbit.js';
import {normalizeLightingMode,effectiveLightingMode,orbitalLightingAvailable} from './dist/orbit-lighting.js';

// Existing saved explicit preferences remain explicit. Missing or obsolete
// preferences receive the new default when a view is restored or shared.
for(const mode of ['auto','realistic','studio'])assert.equal(normalizeLightingMode(mode),mode);
for(const value of [undefined,null,'',false,'obsolete'])assert.equal(normalizeLightingMode(value),'auto');

// Exercise the same propagated eclipse states that drive electrical and thermal
// calculations, including both umbra boundaries in one complete orbital period.
const first=geometry(defaults,540),states=[];
for(let i=0;i<=360;i++)states.push(Object.freeze(geometry(defaults,540+i*first.periodSec/360)));
const original=JSON.stringify(states),resolved=states.map(s=>effectiveLightingMode('auto',s));
assert(states.some(s=>s.eclipse)&&states.some(s=>!s.eclipse),'The test orbit must contain sunlight and eclipse');
let crossings=0;
for(let i=0;i<states.length;i++){
 const s=states[i];
 assert.equal(resolved[i],s.eclipse?'studio':'realistic');
 assert.equal(effectiveLightingMode('studio',s),'studio');
 assert.equal(effectiveLightingMode('realistic',s),'realistic');
 assert.equal(effectiveLightingMode(undefined,s),resolved[i]);
 assert(orbitalLightingAvailable('spacecraft',s));
 if(i&&states[i-1].eclipse!==s.eclipse){crossings++;assert.notEqual(resolved[i-1],resolved[i]);}
}
assert.equal(crossings,2,'Auto changes only at the two modeled shadow boundaries');
assert.equal(JSON.stringify(states),original,'Lighting selection cannot change physical geometry or mission state');

// Presentation controls continue to exclude ground processing and parked
// spacecraft references, and retain the existing ascent altitude gate.
assert.equal(orbitalLightingAvailable('launch',{t:12,altitudeKm:94,flightPhase:'ascent'}),false);
assert.equal(orbitalLightingAvailable('launch',{t:120,altitudeKm:95,flightPhase:'ascent'}),true);
assert.equal(orbitalLightingAvailable('launch',{t:-300,altitudeKm:1,flightPhase:'pad'}),false);
assert.equal(orbitalLightingAvailable('spacecraft',{...first,referenceBody:true}),false);
assert.equal(orbitalLightingAvailable('spacecraft',null),false);
console.log(JSON.stringify({status:'pass',orbitSamples:states.length,eclipseBoundaries:crossings,defaultMode:'auto',explicitPreferencesPreserved:true,physicalStateUnchanged:true}));
