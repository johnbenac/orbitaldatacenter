import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {missionStarter,sizeDesign} from './dist/design.js';
import {componentInertia} from './dist/attitude-inertia.js';
import {renderAttitudeEngineering,renderAttitudeReadback,attitudeEngineeringBasis} from './dist/attitude-engineering.js';
import {renderFlightConsole,flightSoftware} from './dist/flight-software.js';

const h=sizeDesign(missionStarter('text'));
const snapshot={
 t:3600,deployment:1,propellantKg:h.propellantKg,carrierAttached:false,
 attitudeMode:'tracking',attitudeModeLabel:'Solar tracking',bodyRateDegS:.025,attitudeSlewErrorDeg:.014,
 attitudeDynamics:{
  inertiaKgM2:[12000,-125.25,80,-125.25,18000,-310,80,-310,9000],
  principalKgM2:[8990,11990,18020],cmM:[.01,.02,-.1],
  bodyRateRadS:[.001,-.002,.003],requestedTorqueNm:[.125,-.25,.375],appliedTorqueNm:[.12,-.24,.37],
  externalTorqueNm:[-.012,.034,-.056],magneticTorqueNm:[.005,-.006,.007],
  cmgMomentumBodyNms:[-12.5,34.5,-56.5],gimbalAnglesRad:[0,Math.PI/2,-Math.PI/2,Math.PI],
  mechanismMomentumBodyNms:[-.875,.0025,1.125],
  gimbalRatesRadS:[.01,-.02,0,.03],gimbalRateLimitRadS:1,steeringCondition:.562,
  torqueResidualNm:.012247,rateLimited:false,momentumLimited:false,
  controlBandwidthRadS:.04,angularMomentumResidualNms:3e-8
 }
};
const view=renderAttitudeEngineering(h,snapshot,'C');
assert.doesNotMatch(view,/undefined|NaN|Infinity/);
assert.match(view,/Principal moments/);
assert.match(view,/Full tensor in body axes/);
assert.match(view,/10³ kg·m²/);
assert.match(view,/Ixy = -125\.25 kg·m²/);
assert.match(view,/Iyz = -310 kg·m²/);
assert.equal((view.match(/class="ae-gimbal"/g)||[]).length,4);
assert.match(view,/−?90 °|\-90 °/);
assert.match(view,/>-34\.5<|>34\.5</);
assert.match(view,/>-56\.5</);
assert.match(view,/Disturbance torque/);
assert.match(view,/Articulation momentum/);
assert.match(view,/<td>-0\.875<\/td><td>0\.0025<\/td><td>1\.125<\/td>/);
assert.match(view,/Environmental|Aerodynamic, solar-pressure, gravity-gradient and thrust-offset/);
assert.match(view,/0\.562/);
assert.match(view,/0\.01225 N·m/);
assert.match(view,/<dt>Torque residual<\/dt>/);
assert.match(view,/Control sampling and changing geometry contribute alongside actuator limits/);
assert.match(view,/<dt>Body pointing error<\/dt><dd>0\.014 °<\/dd>/);
assert.match(view,/geodesic angle between their quaternions/);
assert.match(renderAttitudeReadback(h,{...snapshot,attitudeSlewErrorDeg:.00001},'E'),/0\.00001 °/);
assert.match(view,/below 0\.0000001 N·m·s/);
assert.match(view,/enforces this balance algebraically/);
assert.match(view,/parallel-axis/);
assert.match(view,/uniform-shape proxies/);
assert.match(view,/19870019449/);
assert.match(view,/Mount stiffness/);
assert.match(view,/predictor-corrector step/);
assert.match(view,/ideal mechanism servos/);
assert.match(view,/exhaust angular-momentum transport/);
assert.match(view,/rotor spin is slowed for visibility/);

const limited={...snapshot,attitudeDynamics:{...snapshot.attitudeDynamics,rateLimited:true}};
assert.match(renderAttitudeReadback(h,limited,'E'),/Gimbal-rate limit active/);
assert.match(renderAttitudeReadback(h,{...limited,attitudeDynamics:{...limited.attitudeDynamics,momentumLimited:true}},'E'),/Momentum envelope reached/);
const incomplete={...snapshot,attitudeDynamics:undefined};
assert.match(renderAttitudeReadback(h,incomplete,'B'),/Select a free-flight instant/);
assert.doesNotMatch(renderAttitudeReadback(h,incomplete,'B'),/undefined|NaN|Infinity/);

const actual=componentInertia(h,{remainingKg:h.propellantKg,deployment:1,adapterAttached:false});
const actualSnapshot={...snapshot,attitudeDynamics:{...snapshot.attitudeDynamics,inertiaKgM2:actual.tensorKgM2,principalKgM2:actual.principalKgM2,cmM:actual.cm}};
const live=renderAttitudeEngineering(h,actualSnapshot,'E');
assert.match(live,/PHASE E/);
assert.doesNotMatch(live,/undefined|NaN|Infinity/);
for(const [i,axis] of ['x','y','z'].entries()){
 const magnitude=actual.tensorKgM2[4*i].toLocaleString('en-US',{maximumFractionDigits:3});
 assert(live.includes('I'+axis+axis+' = '+magnitude+' kg·m²'));
}
const consoleView=renderFlightConsole(h,actualSnapshot,'E','body');
assert.match(consoleView,/data-attitude-engineering/);
assert.match(consoleView,/Ixy = /);
assert.match(consoleView,/Ignition gate/);
assert.doesNotMatch(consoleView,/undefined|NaN|Infinity/);
assert.doesNotMatch(attitudeEngineeringBasis({}),/undefined|NaN|Infinity/);

// Exercise the real refresh function with the disclosure state that a DOM rewrite resets.
const appSource=readFileSync(new URL('./dist/app.js',import.meta.url),'utf8');
const refreshSource=appSource.slice(appSource.indexOf('function renderDiscipline('),appSource.indexOf('let attitudeChart='));
for(const domain of ['attitude','software'])for(const open of [false,true])for(const liveRefresh of [false,true]){
 const engineeringDisclosure={open,setAttribute(){this.open=true;}},softwareDisclosure={open,setAttribute(){this.open=true;}};
 const readback={set innerHTML(html){assert.match(html,/data-attitude-engineering/);engineeringDisclosure.open=false;}};
 const host={
  hidden:false,matches:()=>false,
  querySelector(selector){return selector==='.ae-basis'?engineeringDisclosure:selector==='.fs-basis'?softwareDisclosure:readback;},
  set innerHTML(html){assert.match(html,/data-attitude-engineering/);engineeringDisclosure.open=false;softwareDisclosure.open=false;}
 };
 runInNewContext(refreshSource+'\nrenderDiscipline('+liveRefresh+');',{
  view:{domain,phase:'E',flightLoop:'body'},referencePage:null,integrating:()=>false,
  $:id=>id==='discipline-host'?host:{previousElementSibling:host},
  hardware:h,snap:actualSnapshot,day:{},renderAttitudeEngineering,renderFlightConsole,flightSoftware,
  renderGyroBenchmark:()=>''
 });
 assert.equal(engineeringDisclosure.open,open,domain+' engineering disclosure across refresh');
 if(domain==='software')assert.equal(softwareDisclosure.open,open,'Flight Software methods disclosure across refresh');
}
console.log('Engineering readback preserves signed tensor and actuator vectors, unit scaling, finite telemetry, gimbal limits, physical assumptions and live flight-console reuse.');
