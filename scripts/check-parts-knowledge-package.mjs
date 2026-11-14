import assert from 'node:assert/strict';
import {sizeDesign,missionStarter} from '../dist/design.js';
import {buildReferenceDesign,referenceConfigurationMetadata} from '../dist/reference-configurations.js';
import {launchFleet} from '../dist/launch-fleet.js';
import {buildPartsCatalog} from '../dist/parts-catalog.js';

const families=['flight','materials','ground','launch'],pairs=[];
let registries=0,registryEntries=0;
for(const family of families){
 const source=await import('../src/parts-knowledge/part-knowledge-'+family+'.js');
 const generated=await import('../dist/part-knowledge-'+family+'.js');
 assert.deepEqual(Object.keys(generated),Object.keys(source),family+' exports remain unchanged');
 for(const name of Object.keys(source)){
  if(typeof source[name]==='function'){assert.equal(typeof generated[name],'function');pairs.push({family,name,source:source[name],generated:generated[name]});}
  else{assert.deepEqual(generated[name],source[name],family+'/'+name+' source registry is exactly preserved');registries++;registryEntries+=Object.keys(source[name]).length;}
 }
}
// Match the existing parts-knowledge-checks.mjs fixtures, including each
// reference configuration, launcher and the alternate propulsion setting.
const seed=missionStarter('text');
const inputs=[...Object.keys(referenceConfigurationMetadata).map(buildReferenceDesign),...Object.keys(launchFleet).map(launcher=>({...seed,launcher})),{...seed,engine:'aero'}];
let pages=0,comparisons=0;const distinct=new Set(),categories=new Set();
for(const input of inputs){
 const hardware=sizeDesign(input),catalog=buildPartsCatalog(hardware),before=JSON.stringify({hardware,catalog});
 for(const record of catalog.records){
  for(const pair of pairs){
   assert.deepEqual(pair.generated(record,catalog,hardware),pair.source(record,catalog,hardware),(input.referenceCenterId||input.launcher)+'/'+record.id+'/'+pair.name+' preserves the full article value');
   comparisons++;
  }
  pages++;distinct.add(record.id);categories.add(record.category);
 }
 assert.equal(JSON.stringify({hardware,catalog}),before,'Packaging cannot change the catalog, configuration, or engineering mass ledger');
}
console.log(JSON.stringify({configurations:inputs.length,pages,distinctPartIds:distinct.size,categories:[...categories],functionComparisons:comparisons,registries,registryEntries},null,2));
console.log('Lossless article packaging: all authored/generated function outputs and source registries are deeply equal.');
