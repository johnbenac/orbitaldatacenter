// Exercise actual plume meshes on the CPU rendering path. A small backing
// store implements the image copy/resample operations the rasterizer uses.
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {softRenderer} from './dist/software-scene.js';
import {sizeDesign,defaults,applyPreset} from './dist/design.js';
import {makeLaunch} from './dist/launch-scene.js';
import {launchRiseM} from './dist/launch-effects-state.js';
import {canvas} from './render-test-canvas.mjs';
globalThis.document={createElement:canvas};
const cv=canvas(),renderer=softRenderer(cv);renderer.setSize(400,240);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,400/240,.07,9000);
const lv=makeLaunch(sizeDesign(applyPreset(defaults,'launcher','starship')));scene.add(lv.root);
const t=4,s={t,flightPhase:'ascent',altitudeKm:launchRiseM(t,'starship')/1000};
const f=lv.update(s,'ascent',{phase:'D',domain:'conops'});
const dir=new T.Vector3(Math.sin(.46)*Math.cos(.17),Math.sin(.17),Math.cos(.46)*Math.cos(.17));
camera.position.copy(f.center).addScaledVector(dir,f.half/Math.tan(17*Math.PI/180));camera.lookAt(f.center);camera.updateMatrixWorld();lv.faceLaunchClouds(camera);
const fires=[];lv.root.traverseVisible(o=>{if(o.userData.fuel==='methalox')fires.push(o);});assert.equal(fires.length,34);assert(fires.some(o=>o.userData.mergedJet));
function render(){renderer.render(scene,camera);return cv.frame.data.slice();}
const full=render();fires.forEach(o=>o.visible=false);const without=render();
// The daytime surface, launch structure, water curtain and steam all remain
// present in the comparison. Count genuinely visible optical differences.
let affected=0,cool=0;
for(let i=0;i<full.length;i+=4){
 const delta=Math.max(...[0,1,2].map(k=>Math.abs(full[i+k]-without[i+k])));
 if(delta>10){affected++;if(full[i+2]>full[i]+10)cool++;}
}
assert(affected>85,`Insufficient visible Raptor plume, only ${affected} pixels changed`);assert(cool>15,`Only ${cool} blue/violet plume pixels`);
console.log(`Starbase at MET +4 s, 400×240 software composition: ${affected} plume pixels above threshold, including ${cool} blue/violet pixels with terrain, pad and steam present.`);
const cloud=lv.parts.tower.getObjectByName('Pad water and exhaust effluent');
for(const t of [27.9,28,34.9,35.1]){const frame=lv.update({t,flightPhase:'ascent',altitudeKm:launchRiseM(t,'starship')/1000},'ascent');assert(frame.launchFX.steam<.001);if(t>=28)assert.equal(cloud.visible,false);}
