import assert from 'node:assert/strict';
import {missionStarter} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {flightLoops,renderFlightConsole,sunNormalAngle} from './dist/flight-software.js';
import {modeRules} from './dist/attitude-guidance.js';

const sim=createSimulation(missionStarter('text')),h=sim.hardware;
const sunlit=sim.at(88590),shadow=sim.at(92500),restrained=sim.at(-300);
assert.equal(sunNormalAngle(0),90);
assert.equal(sunNormalAngle(-1),0);
assert.equal(sunNormalAngle(null),null);
assert.equal(sunlit.modeRuleId,'nominal');
assert.equal(shadow.modeRuleId,'eclipse');
assert.equal(restrained.modeRuleId,'launch');
assert.equal(shadow.radiatorDirectSolarKW,0);
assert(sunlit.upperRadiatorSunCos<.001&&sunlit.lowerRadiatorSunCos<.001);
assert(sunlit.solarKW>60);
const active=renderFlightConsole(h,sunlit,'E','executive');
assert(active.includes('In control')&&active.includes(modeRules.at(-1).label));
assert.equal((active.match(/class="fs-winning"/g)||[]).length,1);
assert.match(renderFlightConsole(h,restrained,'D','surfaces'),/Mechanisms restrained/);
for(const s of [sunlit,shadow,restrained])for(const loop of Object.keys(flightLoops)){
 const html=renderFlightConsole(h,s,'E',loop);assert.doesNotMatch(html,/undefined|NaN|Infinity/);
 assert(html.includes(s.attitudeModeLabel));
}
const qs={t:12000,station:'Test site',eclipse:true,flightPhase:'operations'};
const base={deployment:1,unloading:true,terminal:'Ka',plannedBurnDirection:0};
const winner=o=>modeRules.find(r=>r.test(h.input,qs,{...base,...o},{prepointS:90})).id;
assert.equal(winner({}),'contact');
assert.equal(winner({plannedBurnDirection:1,plannedBurnLeadS:15}),'prepoint');
assert.equal(winner({burnDirection:-1,passivated:true}),'passive');
assert.equal(winner({deployment:.6}),'deployment');
console.log('Flight control authority, software console, eclipse and two-bank Sun exposure regressions passed.');
