// Verify the actual effects assemblies and MET reversibility, including pads
// with different outlet geometry and vehicles with mixed propellants.
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {defaults,sizeDesign,applyPreset} from './dist/design.js';
import {launchSiteFor,launchPropulsionFor} from './dist/launch-sites.js';
import {makeLaunch} from './dist/launch-scene.js';
import {launchRiseM,launchEffectsAt} from './dist/launch-effects-state.js';
const brush=new Proxy({},{get:(_,k)=>['createRadialGradient','createLinearGradient'].includes(k)?()=>({addColorStop(){}}):()=>{}});
globalThis.document={createElement:()=>({getContext:()=>brush})};
const camera=new T.PerspectiveCamera();camera.rotation.set(.25,-.12,.1);camera.updateMatrixWorld();
for(const id of ['starship','falconHeavy','ariane64','vulcan6','longMarch5B','glenn','glenn9','terran','terranX','longMarch9']){
 const d=applyPreset(defaults,'launcher',id),lv=makeLaunch(sizeDesign(d)),site=launchSiteFor(id),fuel=launchPropulsionFor(id);
 const ground=lv.parts.tower,cloud=ground.getObjectByName('Pad water and exhaust effluent'),jets=ground.getObjectByName('Water curtain');assert(cloud&&jets&&ground.getObjectByName('Launch table and exhaust works'));
 function sample(t){
  const frame=lv.update({t,altitudeKm:launchRiseM(t,id)/1000,flightPhase:t<0?'pad':'ascent'},'ascent',{phase:'D',domain:'launcher'});
  lv.faceLaunchClouds(camera);lv.root.updateWorldMatrix(true,true);
  const colors=[],visible=new Set();
  lv.root.traverseVisible(o=>{if(o.userData.fuel){visible.add(o.userData.fuel);colors.push(o.scale.toArray())}});
  const parcels=[];if(cloud.visible&&ground.visible)for(const m of cloud.children)if(m.visible&&m.material.opacity>.01)parcels.push([m.position.toArray(),m.scale.toArray(),m.material.opacity]);
  return {fx:frame.launchFX,visible:[...visible],colors,parcels,ground:ground.position.y,stage:lv.parts.stage.position.y};
 }
 const standby=sample(-45);assert(!standby.visible.length&&!standby.parcels.length);assert(!jets.visible);
 const deck=ground.getObjectByName('Pierced exhaust deck'),jaws=[],lugs=[],seats=[];
 lv.root.traverse(o=>{if(o.name==='Hydraulic release jaw')jaws.push(o);if(o.name==='Vehicle hold-down lug')lugs.push(o);if(o.name==='Skirt bearing seat')seats.push(o);});
 assert.equal(deck.userData.apertures.length,1+lv.parts.boosters.length);
 if(id==='falconHeavy')assert.equal(jaws.length,12);
 assert.equal(jaws.length,lugs.length);assert.equal(jaws.length,seats.length);assert(jaws.every(j=>j.rotation.x===0));
 const above=new T.Vector3(0,1,0),below=new T.Vector3(0,-1,0);
 for(const lug of lugs){
  const box=new T.Box3().setFromObject(lug),v=box.getCenter(new T.Vector3());v.y=box.min.y+.01;
  const hits=new T.Raycaster(v,below).intersectObjects(seats,false);assert(hits.length,id+' unsupported skirt lug');assert(Math.abs(hits[0].distance-.01)<1e-5,id+' visible bearing gap');
 }
 for(const bore of deck.userData.apertures){
  for(let i=0;i<24;i++){
   const a=2*Math.PI*i/24,v=new T.Vector3(bore.x+.98*bore.r*Math.cos(a),-500,bore.z+.98*bore.r*Math.sin(a));
   assert.equal(new T.Raycaster(v,above).intersectObject(deck,false).length,0,id+' exhaust opening blocked');
  }
 }
 const ignition=sample(-2);assert(ignition.fx.ignition>0);assert(ignition.visible.includes(fuel.core));assert(!ignition.visible.includes('solid'));
 assert(jaws.every(j=>j.rotation.x===0));
 const lift=sample(4.5);assert(jaws.every(j=>j.rotation.x>.9));assert(lift.fx.water>.5);assert(lift.parcels.length>10);assert(Math.abs(lift.stage-lift.ground-launchRiseM(4.5,id))<1e-8);
 if(fuel.booster)assert(lift.visible.includes(fuel.booster));
 const first=JSON.stringify(lift);sample(78);assert(!ground.visible);sample(-50);assert.equal(JSON.stringify(sample(4.5)),first);
 for(const p of cloud.children.filter(x=>x.visible))assert(Math.abs(p.getWorldQuaternion(new T.Quaternion()).dot(camera.quaternion))>1-1e-10);
 if(id==='starship'){assert.equal(sample(141).colors.length,3+6,'Three booster engines continue to fire while the six ship engines start before separation');assert.equal(site.trenchOutlets,2);assert(launchEffectsAt(-10,id).water>0);assert(launchEffectsAt(-10,id).ignition===0);}
 if(id==='ariane64'){assert(launchEffectsAt(-6.5,id).ignition>0);assert.equal(launchEffectsAt(-6.5,id).boosterPower,0);assert.equal(launchEffectsAt(0,id).boosterPower,1);}
 assert.equal(launchEffectsAt(540,id).upperPower,0);assert.equal(launchEffectsAt(540,id).ignition,0);
}
console.log('Ten launch stacks: site-specific ground works, fuel/stage visibility, water-before-release, steam release and drift, camera-facing cloud parcels, pad-to-booster displacement and deterministic rewind passed.');
