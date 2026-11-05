import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {sizeDesign,missionStarter} from './dist/design.js';
import {makeLaunch} from './dist/launch-scene.js';
import {bayStationFor} from './dist/bay-lessons.js';

const brush=new Proxy({},{get:(_,key)=>key.includes('Gradient')?()=>({addColorStop(){}}):()=>{}});
globalThis.document={createElement:()=>({getContext:()=>brush})};
const near=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} versus ${b}`);
const V=(...v)=>new T.Vector3(...v),cartMeshes=group=>{const out=[];group.traverseVisible(o=>{if(o.isMesh)out.push(o)});return out;};
const domains=['conops','purpose','environment','orbit','compute','data','comm','power','thermal','attitude','prop','mass','launch','launcher','mechanical','avionics'];
for(const purpose of ['text','pretrain']){
 const launch=makeLaunch(sizeDesign(missionStarter(purpose))),{bay,parts}=launch;
 const step=(phase,t,domain)=>launch.update({flightPhase:phase,t,altitudeKm:0},phase,{phase:'D',domain});
 for(const domain of domains){
  const state=step('integration',-3599,domain);
  assert.equal(state.environment,'hangar');assert.equal(parts.tower.visible,false,domain+' pad leak');
  assert.equal(parts.facility.visible,true);assert.equal(bay.station.userData.stationId,bayStationFor(domain));
  assert.equal(bay.station.children.filter(x=>x.visible).length,1,domain+' shows another station');
  launch.root.updateMatrixWorld(true);const meshes=cartMeshes(bay.station);
  const soles=meshes.filter(m=>m.name==='Grounded caster');assert.equal(soles.length,4,domain);
  for(const wheel of soles){const bounds=new T.Box3().setFromObject(wheel);near(bounds.min.y,bay.floorY);}
  const leads=meshes.filter(m=>m.name==='Ground service lead');
  if(domain==='thermal')assert.equal(leads.length,2);
  if(['launch','launcher','mechanical','comm','environment'].includes(domain))assert.equal(leads.length,0);
  for(const lead of leads){
   const pos=lead.geometry.attributes.position;for(let i=0;i<pos.count;i++){
    const v=lead.localToWorld(V().fromBufferAttribute(pos,i));assert.ok(v.y>=bay.floorY-.001,'Cable below floor in '+domain+' by '+(bay.floorY-v.y));
   }
   const nearest=(point,candidates)=>Math.min(...candidates.map(o=>point.distanceTo(o.getWorldPosition(V()))));
   const from=lead.geometry.parameters.path.getPoint(0),to=lead.geometry.parameters.path.getPoint(1);
   assert.ok(nearest(from,meshes.filter(m=>m.name==='Cart connector'))<.031,domain+' lead detached at cart');
   const plate=parts.facility.getObjectByName('Ground interface on the support stand');
   assert.ok(to.distanceTo(plate.getWorldPosition(V()))<.18,domain+' lead detached at service plate');
  }
  const jumpers=meshes.filter(m=>m.name==='Stand-to-spacecraft jumper');
  assert.equal(jumpers.length,['launch','launcher','mechanical','comm','environment','mass'].includes(domain)?0:domain==='thermal'?2:1);
  for(const lead of jumpers){
   const outlet=meshes.filter(m=>m.name==='Pedestal manifold outlet'),coupling=meshes.filter(m=>m.name==='Spacecraft umbilical coupling');
   const path=lead.geometry.parameters.path,from=path.getPoint(0),to=path.getPoint(1);
   assert.ok(outlet.some(o=>o.getWorldPosition(V()).distanceTo(from)<.027));
   assert.ok(coupling.some(o=>o.getWorldPosition(V()).distanceTo(to)<.040));
   assert.ok(to.distanceTo(bay.portAnchor.position)<.09);
   // During positive-height launch-axis travel the only intersection with the
   // flight article is its intended service fitting. Keep clear of the deck,
   // nozzle exits and central separation adapter.
   const hw=sizeDesign(missionStarter(purpose)),adapterR=hw.fairing.stack[0].radiusM;
   for(let i=0;i<=60;i++){const v=path.getPoint(i/60);if(v.y>=-.14&&v.y<=.15){
    assert.ok(v.z>Math.max(hw.bodyHeightM*.5,adapterR)+.06,'Ground pigtail entered deck/propulsion corridor');}}
  }
  const active=bay.station.children.find(o=>o.visible);
  if(['launch','mechanical','comm'].includes(domain)){
   const axis=active.getObjectByProperty('name',domain==='comm'?'Radio horn pointing axis':domain==='launch'?'Survey head pointing axis':'Telescope pointing axis');
   const sight=bay.vehicleAnchor.getWorldPosition(V()).sub(axis.getWorldPosition(V())).normalize();
   near(sight.dot(V(0,1,0).applyQuaternion(axis.getWorldQuaternion(new T.Quaternion()))),1);
  }
 }
 const camera=new T.PerspectiveCamera();
 for(const [eye,hidden,shown] of [
  [[0,3,200],'Front wall','Rear wall'],[[0,3,-200],'Rear wall','Front wall'],
  [[-200,2,0],'West wall','East wall'],[[200,2,0],'East wall','West wall'],[[0,300,0],'High-bay roof','Rear wall']
 ]){
  camera.position.set(...eye);bay.setViewFrom(camera);
  assert.equal(parts.facility.getObjectByName(hidden).visible,false,hidden);assert.equal(parts.facility.getObjectByName(shown).visible,true,shown);
  assert.equal(parts.facility.getObjectByName('High-bay floor').material.transparent,false);
 }
 step('pad',-5,'power');assert.equal(parts.facility.visible,false);assert.equal(bay.station.visible,false);
 step('ascent',4,'comm');assert.equal(parts.facility.visible,false);assert.equal(bay.station.visible,false);
}
console.log('All 16 bay domains: tool selection, grounded casters and leads, connector contact, three sighted instruments, opaque room cutaways and ground-hardware isolation passed.');
