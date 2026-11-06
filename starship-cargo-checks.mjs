import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {canvas} from './render-test-canvas.mjs';
import {applyPreset,missionStarter,sizeDesign} from './dist/design.js';
import {makeCraft} from './dist/craft.js';
import {makeLaunch} from './dist/launch-scene.js';
import {launchClockFor} from './dist/launch-effects-state.js';
import {cargoBay,starshipCargoFlight} from './dist/starship-cargo.js';
globalThis.document={createElement:canvas};
const c=launchClockFor('starship'),near=(v,w)=>assert(Math.abs(v-w)<1e-8,v+' vs '+w);
const V=(...v)=>new T.Vector3(...v);
const isDatum=o=>o.name==='Closed cargo deck'||o.name.includes('Fixed cargo shell')||o.name.includes('Fixed nose crown')||o.name.includes('Sill structure');
function actualArticleBounds(h){
 const ship=makeCraft(h);ship.positionPanels(0);ship.root.rotation.x=-Math.PI/2;
 ship.root.position.y=h.fairing.stack.find(r=>r.part==='Insulated bus').z0M+h.bodyLengthM/2;
 ship.root.updateMatrixWorld(true);const bounds=new T.Box3(),v=V();
 ship.root.traverseVisible(m=>{if(!m.isMesh)return;const pts=m.geometry.attributes.position;
  for(let i=0;i<pts.count;i++)bounds.expandByPoint(v.fromBufferAttribute(pts,i).applyMatrix4(m.matrixWorld));
 });return bounds;
}
function trianglesMiss(bounds,objects,toShip,label){
 const a=V(),b=V(),d=V(),tri=new T.Triangle(a,b,d);
 for(const m of objects){
  const g=m.geometry,tf=new T.Matrix4().multiplyMatrices(toShip,m.matrixWorld);
  if(!g.boundingBox)g.computeBoundingBox();
  if(!bounds.intersectsBox(g.boundingBox.clone().applyMatrix4(tf)))continue;
  const pos=g.attributes.position,ix=g.index;
  for(let i=0;i<(ix?.count??pos.count);i+=3){
   a.fromBufferAttribute(pos,ix?ix.getX(i):i).applyMatrix4(tf);
   b.fromBufferAttribute(pos,ix?ix.getX(i+1):i+1).applyMatrix4(tf);
   d.fromBufferAttribute(pos,ix?ix.getX(i+2):i+2).applyMatrix4(tf);
   assert(!bounds.intersectsTriangle(tri),label+' intersects '+(m.name||m.parent.name));
  }
 }
}
const ref=sizeDesign(applyPreset(missionStarter('text'),'launcher','starship')),L=makeLaunch(ref),p=L.parts,door=p.shell.getObjectByName('Retained cargo door');
const solids=[],flaps=[],leaf=[];p.shell.traverse(o=>{if(o.isMesh&&isDatum(o)||o.name==='Fixed longitudinal door jamb')solids.push(o);if(o.name==='Forward body flap')o.traverse(b=>{if(b.isMesh)flaps.push(b)})});door.traverse(o=>{if(o.isMesh)leaf.push(o)});
const flight=t=>{L.update({t,flightPhase:'insertion',altitudeKm:550},'insertion',{phase:'D',domain:'launcher'});L.root.updateMatrixWorld(true);return p.shell.matrixWorld.clone().invert()};
// The fixed forward flap roots and their complete panels start above the
// hatch cut. Rotation about its longitudinal hinge cannot change leaf Y.
const toShip=flight(c.hatchClear),boxAcross=items=>items.reduce((b,m)=>{
 if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();
 return b.union(m.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(toShip,m.matrixWorld)));
},new T.Box3());
const flapGap=boxAcross(flaps).min.y-boxAcross(leaf).max.y;
assert(flapGap>1,flapGap+' m gap above open door');console.log('Forward flap to hatch vertical clearance:',flapGap.toFixed(3),'m');
for(const purpose of ['text','batch','voice','finetune']){
 const h=sizeDesign(applyPreset(missionStarter(purpose),'launcher','starship')),fit=h.fairing.cargoAccess;
 assert(h.fairing.fit&&fit.fits,purpose);
 const meshBox=actualArticleBounds(h).translate(V(0,cargoBay.deckM,0));
 // A moving axis-aligned box overbounds every parked vertex. At full hatch
 // travel its union with the end box encloses every intermediate rail pose.
 const swept=meshBox.clone().union(meshBox.clone().translate(V(-cargoBay.strokeM,0,0))).expandByScalar(.018);
 let toShip=flight(c.hatchClear);trianglesMiss(swept,[...solids,...leaf,...flaps],toShip,purpose+' through hatch');
 // The parked article stays put while the hatch sweeps. Check the actual
 // triangles at each degree plus additional padding for intervening motion.
 for(let j=0;j<=120;j++){
  toShip=flight(c.doorOpen+(c.hatchClear-c.doorOpen)*j/120);
  trianglesMiss(meshBox.clone().expandByScalar(.17),leaf,toShip,'hinge swing near '+purpose);
 }
 const travel=h.fairing.stack.find(s=>s.part==='Engine bells');
 assert(h.payloadInterface.upperFaceStationM-travel.z0M+.09<fit.liftStrokeM,'Bells clear stationary adapter before drift');
}
for(let t=c.doorOpen;t<=c.hatchLatched;t+=.5){
 const q=starshipCargoFlight(t,c,true,ref.fairing.cargoAccess.liftStrokeM);flight(t);
 near(p.payload.position.x,-q.payloadM);near(p.payload.position.y,cargoBay.deckM+q.liftM);near(p.fitting.position.x,-q.carriageM);near(p.upper.position.distanceTo(p.shell.position),0);
 if(q.carriageM>.0001)near(q.hatch,1);
 if(t>c.release&&t<=c.eject)near(q.payloadM,cargoBay.strokeM);
 if(q.hatch<.9999&&t>c.releaseClear)near(q.carriageM,0);
}
flight(c.hatchLatched);near(door.rotation.y,0);near(p.fitting.position.x,0);
for(const purpose of ['pretrain','agents']){
 const h=sizeDesign(applyPreset(missionStarter(purpose),'launcher','starship'));
 assert(!h.fairing.fit);const ship=makeLaunch(h);
 for(const t of [-1920,c.eject,c.releaseClear]){
  ship.update({t,flightPhase:t<0?'integration':'insertion',altitudeKm:0},'integration',{phase:'D',domain:'launcher'});
  near(ship.parts.payload.position.x,0);near(ship.parts.shell.getObjectByName('Retained cargo door').rotation.y,0);
 }
}
console.log('Actual stowed spacecraft vertex envelopes clear the fixed hull, jambs, forward flaps and opened door for all four compatible mission presets. Hinge sweep, outboard stroke, axial bell clearance, separation, retained return, relatch and two blocked missions passed.');
