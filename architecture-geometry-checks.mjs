import assert from 'node:assert/strict';
import {canvas} from './render-test-canvas.mjs';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign,referenceConfigurationMetadata} from './dist/reference-configurations.js';
import {architectureFamily,architectureTerminalStations,resolveArchitecture} from './dist/architecture-families.js';
import {architectureAssemblyChecks} from './dist/architecture-assessment.js';
import {payloadAccommodation} from './dist/architecture-accommodation.js';
import {communicationsPackages} from './dist/communications-packages.js';
import {deploymentLayout,mechanismPose,leafPose,leafAxes} from './dist/deployment.js';
import * as T from './dist/vendor/three.module.js';
globalThis.document={createElement:()=>canvas()};
const {makeCraft}=await import('./dist/craft.js');
const near=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-7*Math.max(1,Math.abs(a),Math.abs(b)),`${msg}: ${a} ≠ ${b}`);
const vector=(a,b,msg)=>a.forEach((v,k)=>near(v,b[k],msg));
const dot=(a,b)=>a.reduce((s,v,k)=>s+v*b[k],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const results=[];
for(const id of Object.keys(referenceConfigurationMetadata)){
 const input=buildReferenceDesign(id),h=sizeDesign(input),f=architectureFamily(h),g=deploymentLayout(h),craft=makeCraft(h);
 assert.equal(craft.wings.length,f.solarWingCount,id+' installed wing count');
 assert.equal(craft.rads.length,f.radiatorBankCount,id+' installed radiator bank count');
 assert.equal(craft.opticalTerminals.length,f.opticalTerminalCount,id+' installed optical count');
 assert.equal(Boolean(craft.dish),f.kaTerminalCount>0,id+' installed Ka mesh');
 assert.equal(craft.patches.length,f.sPatchCount,id+' installed TT&C patches');
 for(const [type,area] of [['pv',input.solarM2],['rad',input.radiatorM2]])near(g.descriptors.filter(s=>s.type===type).reduce((v,s)=>v+s.width*s.depth,0),area,id+' area conservation');
 assert.equal(h.assemblyChecks.find(c=>c.id==='deployment-clearance').actual,0,id+' sampled rigid deployment clearance');
 let partialRollChecked=false;
 for(const u of [0,.10,.23,.45,.55,.70,.85,1]){
  craft.positionPanels(u);craft.root.updateMatrixWorld(true);
  const motion=mechanismPose(g,u,input.solarTiltDeg);
  for(const wing of craft.wings){
   const pose=motion.wings.find(w=>w.side===wing.side&&w.end===wing.end),normal=pose.axes?.[1]||leafAxes({pitch:pose.pitch})[1];
   vector(wing.roll.getWorldPosition(new T.Vector3()).toArray(),pose.tip.map((v,k)=>v+pose.rollRadius*normal[k]),id+' residual roll follows translating tip');
   if(pose.span>1e-4&&pose.rolledLength>1e-4)partialRollChecked=true;
  }
  for(const {surface,descriptor} of craft.panels){
   const p=leafPose(g,descriptor,u,input.solarTiltDeg),axes=leafAxes(p),position=surface.getWorldPosition(new T.Vector3());
   vector(position.toArray(),[p.x,p.y,p.z],id+' renderer / analytical leaf center');
   vector(cross(axes[0],axes[1]),axes[2],id+' right-handed leaf frame');
   for(let k=0;k<3;k++){near(dot(axes[k],axes[k]),1,id+' normalized frame');for(let j=0;j<k;j++)near(dot(axes[k],axes[j]),0,id+' orthogonal frame');}
   const q=surface.getWorldQuaternion(new T.Quaternion()),n=new T.Vector3(0,1,0).applyQuaternion(q);vector(n.toArray(),axes[1],id+' renderer / physics face normal');
  }
  if(f.id==='starcloud-inline'){
   for(const w of motion.wings){const bank=motion.banks.find(b=>b.end===-w.side),along=bank.panelAxes.at(-1)[2];vector(w.root,bank.tip.map((v,k)=>v+g.solarTipGapM*along[k]),'Inline solar root follows actual radiator tip and finite cassette stand-off');}
  }
 }
 assert.equal(partialRollChecked,true,id+' partial rollout was checked');
 if(f.opticalTerminalCount===2){
  craft.pointTerminals(new T.Vector3(1,0,0),new T.Vector3(0,0,1));craft.root.updateMatrixWorld(true);
  const normal=head=>new T.Vector3(0,1,0).applyQuaternion(head.getWorldQuaternion(new T.Quaternion())).toArray();
  vector(normal(craft.opticalTerminals[0]),[0,0,1],'Primary optical head follows the commanded route');
  vector(normal(craft.opticalTerminals[1]),[0,1,0],'Second optical head remains parked without a separate route');
 }
 const commanded=sizeDesign({...input,solarTiltDeg:input.solarTiltDeg===0?35:0});
 assert.equal(h.physicalArchitecture.physicalId,commanded.physicalArchitecture.physicalId,id+' pointing does not change installed identity');
 assert.deepEqual(h.physicalArchitecture.surfaces,commanded.physicalArchitecture.surfaces,id+' canonical installed surfaces');
 if(f.id==='redwire-platform'){
  near(h.wingWidthM,2,'Redwire source wing width');near(h.wingLengthM,20,'Redwire source wing length');near(h.radiatorWidthM,3.25,'Redwire source radiator width');
  assert.equal(h.rackLayout.location,'radiator');assert.ok(craft.payloadPlatformAnchor&&craft.payloadRack);
  craft.setCoreView(true);assert.equal(craft.wings.every(w=>!w.surface.visible),true);assert.equal(craft.payloadPlatformAnchor.parent.visible,true);
  const overflow=payloadAccommodation(input,h,{trays:5});
  assert.deepEqual(overflow.slotDimensionsM,h.rackLayout.slotDimensionsM,'Additional Redwire packages do not shrink');
  assert.deepEqual(overflow.pitchM,[.5,.14,.5]);assert.equal(overflow.fit,false);assert.equal(overflow.overflow,1);
  assert.ok(overflow.slots[4].z+overflow.slotDimensionsM[2]/2>.5,'Overflow extends past the fixed spreader grid');
  assert.ok(h.physicalArchitecture.connections.some(c=>c.id==='allocated-bus-strap-to-platform'&&c.status==='unassessed'));
  const noStrap=resolveArchitecture({...h,energySystem:{...h.energySystem,thermal:{...h.energySystem.thermal,passive:{...h.energySystem.thermal.passive,busConductanceKWK:0}}}});
  assert.ok(!noStrap.connections.some(c=>c.id==='allocated-bus-strap-to-platform'),'Zero conductance adds no thermal strap connection');
 }
 if(f.id==='starcloud-inline'){
  const oldClearance={...h,solarRootOffsetM:.20,solarTipGapM:.20};oldClearance.physicalArchitecture=resolveArchitecture(oldClearance);
  const screen=architectureAssemblyChecks(oldClearance).find(c=>c.id==='deployment-clearance');
  assert.ok(screen.conflicts.some(c=>c.a.startsWith('solar-cassette-')||c.b.startsWith('solar-cassette-')),'Cassette sweep detects the former folded-pack/bus intersections');
 }
 if(f.id==='starmind-cross'){near(h.physicalArchitecture.dimensions.deployed.size[0],75,'AI1 source span');near(h.physicalArchitecture.dimensions.deployed.size[1],30,'AI1 source height');}
 if(f.id==='orbital-rack')near(h.physicalArchitecture.dimensions.deployed.size[0],100,'Historical Orbital source span');
 for(const mount of g.mounts){assert.ok(mount.supports.some(s=>s.role==='restraint'),id+' explicit launch restraint');assert.ok(mount.supports.every(s=>s.seat.concat(s.foot).every(Number.isFinite)),id+' finite launch stations');}
 results.push({id,wings:craft.wings.length,banks:craft.rads.length,leaves:g.descriptors.length,clearance:'meets'});
}
const legacy=sizeDesign(buildReferenceDesign('redwire-8kw',{revision:'odc-study-2026-11-r1'}));
assert.equal(architectureFamily(legacy).id,'protected-core');assert.equal(deploymentLayout(legacy).descriptors.filter(s=>s.type==='pv').length,4);
assert.equal(buildReferenceDesign('starmind-ai1').communicationsPackage,'optical-ttc','AI1 carries an explicitly allocated optical plus S-band package');
for(const base of [legacy.input,buildReferenceDesign('starmind-ai1')]){
 const ids=[];
 for(const pkg of Object.values(communicationsPackages)){
  const h=sizeDesign({...base,communicationsPackage:pkg.id}),c=makeCraft(h),family=architectureFamily(h),stations=architectureTerminalStations(h),parts=h.fairing.stack;
  assert.equal(Boolean(c.dish),pkg.kaTerminalCount>0,pkg.id+' optional reflector mesh');
  assert.equal(Boolean(c.apertures.Ka),pkg.kaTerminalCount>0,pkg.id+' optional reflector aperture');
  assert.equal(c.patches.length,pkg.sPatchCount,pkg.id+' optional TT&C meshes');
  if(family.id!=='protected-core'||pkg.id!=='full'){
   assert.equal(stations.filter(s=>s.kind==='ka').length,pkg.kaTerminalCount,pkg.id+' reflector station count');
   assert.equal(stations.filter(s=>s.kind==='s').length,pkg.sPatchCount,pkg.id+' TT&C station count');
   assert.equal(parts.some(s=>s.part.startsWith('Parked ka')),pkg.kaTerminalCount>0,pkg.id+' reflector stowed envelope');
   assert.equal(parts.filter(s=>s.part.startsWith('TT&C patch')).length,pkg.sPatchCount,pkg.id+' TT&C stowed envelope');
  }
  ids.push(h.physicalArchitecture.physicalId);
 }
 assert.equal(new Set(ids).size,4,'Every installed communications package has a distinct physical manifest identity');
}
console.table(results);console.log('Family geometry, shared renderer poses, area/envelope constraints and legacy compatibility passed.');
