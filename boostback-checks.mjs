// Exercise the geometry and actual exhaust groups in the ship-following launch view.
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {sizeDesign,missionStarter,applyPreset} from './dist/design.js';
import {launchClockFor} from './dist/launch-effects-state.js';
import {makeLaunch} from './dist/launch-scene.js';
import {canvas} from './render-test-canvas.mjs';

globalThis.document={createElement:canvas};
const vector=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const almost=(a,b,eps=1e-7)=>assert(Math.abs(a-b)<eps,`${a} != ${b}`);
const make=id=>makeLaunch(sizeDesign(applyPreset(missionStarter('text'),'launcher',id)));
const ship=make('starship'),clock=launchClockFor('starship'),t0=clock.stageSeparation;
const {lower,upper,stage}=ship.parts,{lowerLengthM:length,upperLengthM:top,diameterM:diam}=ship.geometry;
const boosterCenter=vector(0,-top-length/2,0);
const nozzles=group=>group.children.filter(j=>j.userData.fuel&&!j.userData.mergedJet);
const boosterJets=nozzles(lower),shipJets=nozzles(upper);
assert.equal(boosterJets.length,33);assert.equal(shipJets.length,6);

function show(rocket,t){
 const frame=rocket.update({t,altitudeKm:75,flightPhase:'ascent'},'ascent',{phase:'D',domain:'launcher'});
 rocket.root.updateMatrixWorld(true);return frame;
}
function sample(t){
 const frame=show(ship,t),center=lower.localToWorld(boosterCenter.clone());
 const direction=vector(0,1,0).transformDirection(lower.matrixWorld);
 const shipDirection=vector(0,1,0).transformDirection(upper.matrixWorld);
 const displacement=stage.worldToLocal(center.clone()).sub(boosterCenter);
 const active=boosterJets.filter(j=>j.visible).length;
 const angle=direction.angleTo(shipDirection);
 const nose=lower.localToWorld(vector(0,-top,0)),tail=lower.localToWorld(vector(0,-top-length,0)),base=upper.localToWorld(vector(0,-top,0));
 // Axial support of both circular ends against the upper stage's aft plane.
 // Beyond broadside the aft end can be closer than the hot-stage ring.
 const rimClearance=base.dot(shipDirection)-Math.max(nose.dot(shipDirection),tail.dot(shipDirection))-diam*.5*Math.sin(angle);
 return {angle,active,displacement,center,rimClearance,frame};
}

const joined=sample(t0);
almost(joined.angle,0);almost(joined.displacement.length(),0);
assert.deepEqual(upper.position.toArray(),[0,0,0]);
assert.equal(sample(t0-.5).active,5,'The few engines retained through hot staging continue to emit');
const start=sample(clock.boostbackStart);
assert(start.angle>Math.PI/9,'A visible turn has already begun at boostback ignition');
assert(start.displacement.length()>5);
assert(lower.visible&&upper.visible);
assert(shipJets.every(j=>j.visible));
// Project the two hulls from the standard ship-following overview. The booster
// remains legible through broadside, then leaves the view of the advancing ship.
const camera=new T.PerspectiveCamera(34,1.65,.07,16000),az=.46+2.46,el=.27;
const eyeDirection=vector(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el));
function view(frame){
 camera.position.copy(frame.center).addScaledVector(eyeDirection,frame.half/Math.tan(17*Math.PI/180));
 camera.lookAt(frame.center);camera.updateMatrixWorld();
 const inside=p=>{const q=p.project(camera);return Math.abs(q.x)<=1&&Math.abs(q.y)<=1&&Math.abs(q.z)<=1};
 const boosterInFrame=[-.45,0,.45].some(k=>inside(lower.localToWorld(boosterCenter.clone().add(vector(0,k*length,0)))));
 const shipMidY=(ship.geometry.heightM-length)*.5-top;
 return {boosterInFrame,shipInFrame:inside(upper.localToWorld(vector(0,shipMidY,0)))};
}
assert.deepEqual(view(start.frame),{boosterInFrame:true,shipInFrame:true});
const broadside=sample(t0+8);assert(broadside.angle>Math.PI/3);
assert.deepEqual(view(broadside.frame),{boosterInFrame:true,shipInFrame:true});
const departed=sample(t0+20);
assert.deepEqual(view(departed.frame),{boosterInFrame:false,shipInFrame:true});

let prevDistance=0;
for(let i=1;i<=20*10;i++){
 const state=sample(t0+i/10),distance=state.displacement.length();
 assert(distance>prevDistance,'The escaping booster must fall progressively behind');prevDistance=distance;
 assert(state.rimClearance>=-.02,`Rotating booster rim enters ship plane at ${t0+i/10} by ${-state.rimClearance} m`);
 assert.deepEqual(upper.position.toArray(),[0,0,0],'Booster recovery must not translate the ship');
}
const turned=sample(t0+14);
assert(turned.angle>Math.PI*.65,'Super Heavy should have turned well past broadside');
assert(turned.displacement.length()>length,'The separation should grow beyond a booster length');
const exhaustAxis=jet=>vector(0,-1,0).transformDirection(jet.matrixWorld);
const stillFiring=boosterJets.find(j=>j.visible);
assert(stillFiring&&exhaustAxis(stillFiring).dot(exhaustAxis(shipJets[0]))<-.25,
 'The boostback plume must rotate with its parent stage, opposite the ascending ship plume');
const full=sample((clock.boostbackStart+clock.boostbackCutoff)/2);
assert(full.angle>Math.PI*.75);assert.equal(full.active,33,'The boostback cluster stages back in');
assert.equal(sample(clock.boostbackCutoff+.1).active,0,'Boostback cutoff extinguishes booster thrust');
assert(shipJets.every(j=>j.visible));
const replay=sample(clock.boostbackStart);almost(replay.center.distanceTo(start.center),0);almost(replay.angle,start.angle);assert.equal(replay.active,start.active);
const pad=ship.update({t:-2,flightPhase:'pad',altitudeKm:0},'pad',{phase:'D',domain:'launcher'});
assert.equal(pad.phase,'pad');almost(lower.rotation.z,0);almost(lower.position.length(),0);
assert.deepEqual(sample(t0+14).displacement.toArray(),turned.displacement.toArray());

// The other staged launchers retain their existing separation choreography.
const falcon=make('falconHeavy'),fclock=launchClockFor('falconHeavy'),fraction=10/45;
show(falcon,fclock.stageSeparation+10);
almost(falcon.parts.lower.rotation.z,.15*fraction);
almost(falcon.parts.lower.position.y,-falcon.geometry.lowerLengthM*.75*fraction);
console.log('Ship-relative staging, visible boostback ignition, rotating rim clearance, widening stage separation, engine phases, deterministic rewind and unchanged Falcon Heavy choreography passed.');
