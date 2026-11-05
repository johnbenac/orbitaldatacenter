import assert from 'node:assert/strict';
import {launchFleet} from './dist/launch-fleet.js';
import {launchSitesFor,launchSiteFor,launchPropulsionFor,launchReferenceFor} from './dist/launch-sites.js';

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
console.log('All fleet entries have compatible, cited launch sites and stage-specific propellants. Alternative pads, invalid imports and study facilities validated.');
