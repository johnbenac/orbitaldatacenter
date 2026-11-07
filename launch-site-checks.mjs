import assert from 'node:assert/strict';
import {launchFleet} from './dist/launch-fleet.js';
import {launchSites,launchRanges,launchComplexes,launchSiteSources,launchSiteReviewed,launchSiteById,launchComplexFor,launchRangeFor,isLaunchSiteCompatible,launchSitesFor,launchSiteFor,launchPropulsionFor,launchReferenceFor} from './dist/launch-sites.js';

for(const [id,v] of Object.entries(launchFleet)){
 const options=launchSitesFor(id),p=launchPropulsionFor(id);
 assert.ok(options.length,id);assert.equal(new URL(launchReferenceFor(id).url).protocol,'https:');
 assert.deepEqual(launchSiteFor(id,'incompatible-site'),options[0]);
 assert.equal(p.upper===null,v.stages===1,id+' upper stage');
 assert.equal(p.booster!==null,v.boosters>0,id+' parallel boosters');
 for(const pad of options){
  assert.equal(launchSiteFor(id,pad.id),pad);assert.ok(Math.abs(pad.lat)<90&&Math.abs(pad.lon)<=180);
  assert.ok(pad.sources.length>=2&&pad.sources.every(s=>new URL(s.url).protocol==='https:'));
 }
}
assert.equal(launchSiteFor('starship').id,'starbase-pad2');
assert.equal(launchSiteFor('starship').trenchOutlets,2);
assert.equal(launchSiteFor('starship','louisiana-study').status,'planned');
assert.equal(launchSiteFor('falconHeavy','ksc-starship').id,'ksc-lc39a');
assert.equal(launchSiteFor('falconHeavy','vandenberg-slc6').trenchOutlets,1);
assert.notEqual(launchSiteFor('glenn').id,launchSiteFor('glenn9').id);
assert.equal(launchSiteFor('ariane64').trenchOutlets,2);assert.equal(launchSiteFor('longMarch5B').trenchOutlets,2);
assert.notEqual(launchSiteFor('longMarch9').id,launchSiteFor('longMarch5B').id);
assert.equal(launchPropulsionFor('longMarch9').core,'unknown');
assert.equal(launchSiteFor('unknown'),null);assert.equal(launchSiteFor('constructor','cape-lc36a'),null);

// Relationships must survive export without a renderer or implicit lookup.
assert.equal(Object.keys(launchSites).length,14);
assert.equal(Object.keys(launchComplexes).length,12);
assert.equal(Object.keys(launchRanges).length,7);
assert.equal(Object.keys(launchFleet).reduce((n,id)=>n+launchSitesFor(id).length,0),15);
const featureStates=new Set(['documented','proposed','study','unknown']);
const waterApplications=new Set(['deflector','deck-deflector','duct-injection','tunnel-deluge','exhaust-injection','pad-deluge','study','unknown']);
const assertFrozen=(value,label)=>{
 if(!value||typeof value!=='object')return;
 assert.ok(Object.isFrozen(value),label+' is immutable');
 for(const [key,child] of Object.entries(value))assertFrozen(child,label+'.'+key);
};
for(const [id,pad] of Object.entries(launchSites)){
 assert.equal(pad.id,id);assert.equal(launchSiteById(id),pad);
 assert.equal(pad.schema,'odc-launch-site/1');assert.equal(pad.reviewed,launchSiteReviewed);
 const complex=launchComplexFor(id),range=launchRangeFor(id);
 assert.equal(complex,launchComplexes[pad.complexId]);assert.ok(complex.siteIds.includes(id));
 assert.equal(range,launchRanges[pad.rangeId]);assert.equal(complex.rangeId,range.id);assert.ok(range.complexIds.includes(complex.id));
 assert.ok(pad.compatibleVehicles.length>0);
 for(const vehicle of Object.keys(launchFleet)){
  const assigned=launchSitesFor(vehicle).some(s=>s.id===id);
  assert.equal(isLaunchSiteCompatible(vehicle,id),assigned,vehicle+' / '+id);
  assert.equal(pad.compatibleVehicles.includes(vehicle),assigned);
 }
 const sources=new Map(pad.sources.map(s=>[s.id,s]));
 assert.equal(sources.size,pad.sources.length,id+' duplicate source IDs');
 for(const source of pad.sources){
  assert.ok(source.id&&source.title&&source.section);assert.equal(source.reviewed,launchSiteReviewed);
  assert.equal(new URL(source.url).protocol,'https:');assert.deepEqual(launchSiteSources[source.id],source);
 }
 for(const [name,feature] of Object.entries(pad.infrastructure)){
  const context=id+' '+name;
  assert.ok(featureStates.has(feature.status),context+' evidence state');
  assert.ok(feature.kind&&feature.label&&feature.basis&&feature.sourceIds.length,context+' provenance');
  assert.equal(feature.visual.schematic,true,context+' geometry scope');
  for(const ref of [...feature.sourceIds,...(feature.sequence?.sourceIds||[])])assert.ok(sources.has(ref),context+' unresolved source '+ref);
  if(feature.status==='unknown')assert.equal(feature.visual.render,false,context+' must not invent unknown hardware');
 }
 assert.ok(waterApplications.has(pad.infrastructure.water.visual.application));
 if(pad.infrastructure.lightning.status==='unknown'){
  assert.equal(pad.infrastructure.lightning.count,null);
  assert.equal(pad.infrastructure.lightning.heightM,null);
 }
 assert.equal(pad.acceptanceStatus,'open');assert.ok(pad.openItems.length>=3);
 assert.ok(pad.geometryBasis&&pad.portableGSEPolicy);
 const exported=JSON.parse(JSON.stringify(pad));
 assert.equal(exported.id,id);assert.equal(exported.complexId,complex.id);assert.equal(exported.rangeId,range.id);
 assert.deepEqual(exported.infrastructure,pad.infrastructure);
}
for(const catalog of [launchSites,launchComplexes,launchRanges,launchSiteSources])assertFrozen(catalog,'catalog');
for(const invalid of ['constructor','__proto__','toString','invalid']){
 assert.equal(launchSiteById(invalid),null);assert.equal(launchComplexFor(invalid),null);assert.equal(launchRangeFor(invalid),null);
 assert.equal(isLaunchSiteCompatible('starship',invalid),false);assert.deepEqual(launchSitesFor(invalid),[]);
}

// Shared geography must not merge vehicle-specific mounts or services.
assert.equal(launchComplexFor('ksc-lc39a'),launchComplexFor('ksc-starship'));
assert.notEqual(launchSiteById('ksc-lc39a'),launchSiteById('ksc-starship'));
assert.equal(isLaunchSiteCompatible('falconHeavy','ksc-starship'),false);
assert.equal(isLaunchSiteCompatible('starship','ksc-lc39a'),false);
assert.equal(launchSiteFor('terran'),launchSiteFor('terranX'));
assert.equal(launchComplexFor('cape-lc36a'),launchComplexFor('cape-lc36b'));
assert.equal(launchSiteById('louisiana-study').kind,'study-area');
assert.equal(launchSiteById('wenchang-study').kind,'study-area');

// Engineering regression cases: never reintroduce generic masts, a regional
// water tower, or study outlet counts masquerading as public physical facts.
const infra=id=>launchSiteById(id).infrastructure;
assert.equal(infra('cape-lc16').lightning.count,2);
assert.equal(infra('cape-lc16').lightning.masts[0].heightM,161.5);
assert.equal(infra('cape-lc16').lightning.masts[1].heightM,null);
assert.equal(infra('cape-lc16').water.heightM,93);
assert.equal(infra('cape-lc16').exhaust.outlets,null);assert.equal(infra('cape-lc16').exhaust.visual.outlets,1);
assert.equal(infra('cape-lc36a').lightning.status,'unknown');
assert.equal(infra('cape-lc36b').lightning.status,'proposed');assert.equal(infra('cape-lc36b').lightning.allocationStatus,'inferred');
assert.equal(infra('cape-lc36b').water.status,'study');assert.equal(infra('cape-lc36b').water.towerCount,null);
assert.equal(infra('ksc-lc39a').lightning.count,0);assert.equal(infra('ksc-lc39a').lightning.mastCount,1);
assert.equal(infra('ksc-lc39a').lightning.visual.catenary,true);
assert.equal(infra('cape-slc41').lightning.count,4);assert.equal(infra('cape-slc41').water.towerCount,0);
assert.equal(infra('cape-slc41').water.visual.kind,'ground-tanks');
assert.equal(infra('vandenberg-slc6').water.heightM,60.96);assert.equal(infra('vandenberg-slc6').water.status,'proposed');
assert.equal(infra('kourou-ela4').lightning.count,4);assert.equal(infra('kourou-ela4').water.heightM,92);
assert.equal(infra('kourou-ela4').water.sequence.startMet,-6);assert.equal(infra('kourou-ela4').exhaust.outlets,2);
assert.equal(infra('wenchang-lc101').lightning.count,4);assert.equal(infra('wenchang-lc101').lightning.heightM,null);
assert.equal(infra('wenchang-study').water.visual.render,false);assert.equal(infra('wenchang-study').water.sequence,null);
assert.equal(infra('wenchang-study').commodities.species.length,0);
for(const [id,pad] of Object.entries(launchSites))if(id!=='kourou-ela4')assert.equal(pad.infrastructure.water.sequence,null,id+' must not invent event timing');
console.log('Validated 14 immutable site entities, 12 complexes, 7 ranges and 15 compatible vehicle/site pairs. Per-feature evidence, explicit unknowns, study geometry, shared-mount separation and public infrastructure dimensions verified.');
