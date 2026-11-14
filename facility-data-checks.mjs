import {formatFacilityNumber} from './dist/facilities-ui.js';
import assert from 'node:assert/strict';
import {
 testFacilities,testFacilityAssets,facilityKinds,getTestFacility,getFacilityAsset,
 facilitySources,facilityGeometrySize,facilityEnvelopeSize,assessFacilityFit,
 chooseFacilityAsset,validateTestFacilities
} from './dist/test-facilities.js';

// Pure catalog and dimensional-screen contracts. Geometry construction, camera
// placement and rendering belong to the separate facility geometry checks.
const failures=[];
let passed=0,negativeCases=0,provenanceReferences=0;
function check(name,run){
 try{run();passed++;}
 catch(error){failures.push({name,message:error.message});}
}
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const modelSnapshot=JSON.stringify(testFacilities);
const requiredAsset=id=>{const value=getFacilityAsset(id);assert.ok(value,'Required source-backed fixture is missing: '+id);return value;};
const rejectedRecord=(name,mutate,facilityId='esa-estec')=>{
 check('Reject malformed catalog: '+name,()=>{
  const copy=structuredClone(getTestFacility(facilityId));assert.ok(copy);
  mutate(copy);const result=validateTestFacilities([copy]);negativeCases++;
  assert.equal(result.passed,false,'Malformed fixture passed validation: '+name);
  assert.ok(result.errors.length,'A failed record must give a reason');
 });
};

check('Catalog validates with a dimensioned system at every campus',()=>{
 const result=validateTestFacilities();
 assert.equal(result.passed,true,result.errors.join('\n'));
 assert.ok(result.facilities>0&&result.assets>0&&result.modeledAssets>0);
 assert.equal(result.facilities,testFacilities.length);
 assert.equal(result.assets,testFacilityAssets.length);
 for(const f of testFacilities)assert.ok(f.assets.some(a=>a.geometry),f.id+' has no dimensioned system');
});

check('Every published metric, access statement and locator resolves to evidence',()=>{
 for(const f of testFacilities){
  const ids=new Set(f.sources.map(s=>s.id));
  assert.equal(ids.size,f.sources.length,f.id+' has duplicate sources');
  for(const s of f.sources){
   assert.ok(s.id&&s.title&&s.publisher&&s.note,f.id+' has incomplete source metadata');
   assert.match(s.accessed,/^\d{4}-\d{2}-\d{2}$/);
   const url=new URL(s.url);assert.equal(url.protocol,'https:');assert.ok(url.hostname);
  }
  const refs=(list,context)=>{
   assert.ok(Array.isArray(list)&&list.length,f.id+' has no evidence for '+context);
   for(const id of list){assert.ok(ids.has(id),f.id+' has an unresolved '+context+' source: '+id);provenanceReferences++;}
  };
  refs(f.addressSourceIds,'address');refs(f.location.sourceIds,'map locator');
  if(f.access)refs(f.accessSourceIds,'access');
  assert.ok(Number.isFinite(f.location.lat)&&Number.isFinite(f.location.lon));
  assert.ok(f.location.precision&&f.location.note);
  for(const a of f.assets){
   refs(a.sourceIds,a.id);
   if(a.geometry){
    refs(a.geometry.sourceIds,a.id+' geometry');
    assert.ok(a.geometry.dimensionRole&&a.geometry.notes,a.id+' does not explain its dimensions');
    assert.ok(Object.values(a.geometry.dimensions).every(positive),a.id+' has an unknown/nonpositive metric');
    assert.ok(facilityGeometrySize(a)?.every(positive),a.id+' cannot supply a complete display extent');
   }
   if(a.envelope){
    refs(a.envelope.sourceIds,a.id+' working envelope');assert.ok(a.envelope.basis);
    assert.ok(facilityEnvelopeSize(a)?.every(positive),a.id+' has an incomplete working envelope');
    if(a.envelope.shape==='cylinder')assert.ok(['y','z'].includes(a.envelope.axis),a.id+' lacks a cylinder axis');
   }
   if(a.door){refs(a.door.sourceIds,a.id+' door');assert.ok(positive(a.door.widthM)&&positive(a.door.heightM));}
   for(const [key,value] of Object.entries(a.limits||{})){
    assert.ok(typeof value==='number'&&Number.isFinite(value)&&value>=0,a.id+' has an unknown '+key);
    refs(a.limitSourceIds?.[key],a.id+' '+key);
   }
   for(const s of a.specifications||[])refs(s.sourceIds,a.id+' '+s.label);
  }
 }
});

check('Source selection preserves only requested evidence',()=>{
 const f=getTestFacility('esa-estec');
 assert.deepEqual(facilitySources(f,['phenix']).map(s=>s.id),['phenix']);
 assert.deepEqual(facilitySources(f,['not-a-source']),[]);
 assert.equal(facilitySources(f).length,f.sources.length);
});

check('Realistic spacecraft and instrument boxes pass explicitly published volumes',()=>{
 const cases=[
  ['esa-estec/phenix',[1.5,2,3]],
  ['ral-nstf/large-space-test-chamber',[2,3,6]],
  ['ral-nstf/dfan',[2,5,2]],
  ['csl-liege/focal65',[3,3,3]],
  ['experior-oxnard/tvac-3',[.3,.4,.4]]
 ];
 for(const [id,sizeM] of cases){
  const a=requiredAsset(id),result=assessFacilityFit(a,{sizeM});
  assert.equal(result.status,'envelope-screened',id);
  assert.equal(result.envelopeVerdict,'within');
  assert.deepEqual(result.checks.find(c=>c.id==='working-envelope').sourceIds,a.envelope.sourceIds);
 }
});

check('Oversized articles fail the recorded geometric screen without enlarging it',()=>{
 for(const id of ['esa-estec/phenix','ral-nstf/large-space-test-chamber','ral-nstf/dfan','csl-liege/focal65']){
  const result=assessFacilityFit(requiredAsset(id),{sizeM:[100,100,100]});
  assert.equal(result.status,'outside-limits',id);assert.equal(result.envelopeVerdict,'outside');
 }
});

check('A cylindrical envelope checks rectangular cross-section corners, not width alone',()=>{
 const a=requiredAsset('ral-nstf/dfan');
 assert.equal(assessFacilityFit(a,{sizeM:[2,5,2]}).status,'envelope-screened');
 // Every side fits its bounding box, but a 4 × 4 m square cannot fit a Ø4 m circle.
 assert.equal(assessFacilityFit(a,{sizeM:[4,5,4]}).status,'outside-limits');
});

check('Phenix fit uses the thermal tent instead of the larger vacuum vessel',()=>{
 const a=requiredAsset('esa-estec/phenix');
 assert.deepEqual(a.geometry.dimensions,{diameterM:4.5,lengthM:11.8});
 assert.deepEqual(facilityEnvelopeSize(a),[2.5,3,4.2]);
 // 3 × 3 × 10 m can fit the nominal Ø4.5 × 11.8 m vessel but not the thermal tent.
 assert.ok(Math.hypot(3,3)<4.5&&10<11.8);
 assert.equal(assessFacilityFit(a,{sizeM:[3,3,10]}).status,'outside-limits');
});

check('A different axis orientation is explicit and does not silently rotate the article',()=>{
 const article={sizeM:[4,2,2]},before=structuredClone(article);
 const result=assessFacilityFit(requiredAsset('esa-estec/phenix'),article);
 assert.equal(result.status,'orientation-required');assert.equal(result.envelopeVerdict,'orientation-required');
 assert.ok(result.rotation&&result.rotation.join(',')!=='0,1,2');
 assert.deepEqual(article,before);
 assert.deepEqual(result.sizeM,[4,2,2],'The displayed article orientation must stay unchanged');
 const rotated=result.rotation.map(i=>article.sizeM[i]);
 assert.equal(assessFacilityFit(requiredAsset('esa-estec/phenix'),{sizeM:rotated}).status,'envelope-screened');
});

check('Vessel and room geometry without a published working envelope never passes fit',()=>{
 const unassessed=testFacilityAssets.filter(a=>!a.envelope);
 assert.ok(unassessed.length);
 for(const a of unassessed){
  const result=assessFacilityFit(a,{sizeM:[.1,.1,.1]});
  assert.equal(result.envelopeVerdict,'unassessed',a.id);
  assert.ok(!['envelope-screened','orientation-required'].includes(result.status),a.id);
  assert.equal(result.checks.some(c=>c.id==='working-envelope'),false,a.id);
 }
});

check('Shaker mounting areas do not become spacecraft envelopes',()=>{
 const shakers=testFacilityAssets.filter(a=>a.kind==='vibration'&&a.geometry?.dimensionRole==='table-surface');
 assert.ok(shakers.length);
 for(const a of shakers){
  assert.equal(a.envelope,undefined,a.id+' has fabricated a volume from its tabletop');
  for(const sizeM of [[.1,.1,.1],[100,100,100]]){
   const result=assessFacilityFit(a,{sizeM});
   assert.equal(result.envelopeVerdict,'unassessed',a.id);
   assert.equal(result.status,'interface-review',a.id);
  }
 }
});

check('Payload limits reject overweight articles independently of tabletop size',()=>{
 const a=requiredAsset('esa-estec/hydra');assert.equal(a.limits.payloadKg,23000);
 const within=assessFacilityFit(a,{sizeM:[1,1,1],massKg:23000});
 assert.equal(within.massVerdict,'within');assert.equal(within.status,'interface-review');
 const outside=assessFacilityFit(a,{sizeM:[1,1,1],massKg:23001});
 assert.equal(outside.massVerdict,'outside');assert.equal(outside.status,'outside-limits');
 assert.deepEqual(outside.checks.find(c=>c.id==='article-mass').sourceIds,a.limitSourceIds.payloadKg);
 assert.match(outside.checks.find(c=>c.id==='article-mass').basis,/fixture|adapter/i);
});

check('Unknown or invalid article masses remain unassessed',()=>{
 for(const massKg of [undefined,null,NaN,Infinity,-1,'100']){
  const result=assessFacilityFit(requiredAsset('esa-estec/hydra'),{sizeM:[1,1,1],massKg});
  assert.equal(result.massVerdict,'unassessed');assert.equal(result.massKg,null);
  assert.equal(result.checks.some(c=>c.id==='article-mass'),false);
 }
});

check('Missing, incomplete or nonphysical article dimensions cannot get a geometric pass',()=>{
 const invalid=[undefined,null,[],[1],[1,2],[0,1,1],[-1,1,1],[1,NaN,1],[1,Infinity,1],['1',1,1],{}];
 for(const sizeM of invalid){
  const result=assessFacilityFit(requiredAsset('esa-estec/phenix'),{sizeM});
  assert.equal(result.envelopeVerdict,'unassessed','Accepted malformed dimensions: '+String(sizeM));
  assert.equal(result.status,'unassessed');assert.equal(result.sizeM,null);negativeCases++;
 }
 const noAsset=assessFacilityFit(null,{sizeM:[1,1,1]});
 assert.equal(noAsset.status,'unassessed');assert.equal(noAsset.checks.length,0);
});

check('An extra dimension is rejected instead of silently truncating article input',()=>{
 const result=assessFacilityFit(requiredAsset('esa-estec/phenix'),{sizeM:[1,1,1,99]});negativeCases++;
 assert.equal(result.envelopeVerdict,'unassessed');assert.equal(result.sizeM,null);
});

check('Vector-like three-dimensional inputs remain supported',()=>{
 const result=assessFacilityFit(requiredAsset('esa-estec/phenix'),{sizeM:{toArray:()=>[1,1,1]}});
 assert.equal(result.status,'envelope-screened');assert.deepEqual(result.sizeM,[1,1,1]);
});

check('Closed, historical and announced facilities never receive an operational fit verdict',()=>{
 const original=requiredAsset('esa-estec/phenix');
 for(const status of ['closed','historical','announced']){
  const a={...original,facility:{...original.facility,status}};
  assert.equal(assessFacilityFit(a,{sizeM:[1,1,1]}).status,'not-operational');
 }
});

check('Working-volume records remain distinct from physical rooms and vessel shells',()=>{
 for(const id of ['ral-nstf/dfan','csl-liege/focal65']){
  const a=requiredAsset(id);
  assert.equal(a.geometry.dimensionRole,'working-envelope');assert.ok(a.envelope?.basis);
  assert.deepEqual(facilityGeometrySize(a),facilityEnvelopeSize(a));
 }
 const inpe=requiredAsset('inpe-lit/cvt-6x8');
 assert.equal(inpe.geometry.representation,'wireframe-volume');assert.equal(inpe.envelope,undefined);
 const bench=requiredAsset('iabg-ottobrunn/cco-bench');
 assert.equal(bench.geometry,null,'A surface specification must not invent a missing bench height');
 assert.equal(facilityGeometrySize(bench),null);
});

// Omission/corruption checks target the public validator rather than reproducing
// its implementation. A missing source or metric must block publication.
for(const [name,mutate] of [
 ['facility identity',f=>delete f.id],
 ['postal address',f=>delete f.address],
 ['address source',f=>f.addressSourceIds=[]],
 ['map latitude',f=>f.location.lat=NaN],
 ['map source',f=>f.location.sourceIds=[]],
 ['geometry object dimensions',f=>delete f.assets[0].geometry.dimensions],
 ['geometry diameter',f=>delete f.assets[0].geometry.dimensions.diameterM],
 ['geometry length',f=>delete f.assets[0].geometry.dimensions.lengthM],
 ['geometry diameter null',f=>f.assets[0].geometry.dimensions.diameterM=null],
 ['geometry diameter zero',f=>f.assets[0].geometry.dimensions.diameterM=0],
 ['geometry diameter NaN',f=>f.assets[0].geometry.dimensions.diameterM=NaN],
 ['geometry diameter infinity',f=>f.assets[0].geometry.dimensions.diameterM=Infinity],
 ['geometry diameter string',f=>f.assets[0].geometry.dimensions.diameterM='4.5'],
 ['geometry sources',f=>f.assets[0].geometry.sourceIds=[]],
 ['unresolved geometry source',f=>f.assets[0].geometry.sourceIds=['missing-evidence']],
 ['geometry measurement meaning',f=>delete f.assets[0].geometry.dimensionRole],
 ['geometry type',f=>f.assets[0].geometry.type='made-up-vessel'],
 ['working-envelope height',f=>delete f.assets[0].envelope.heightM],
 ['working-envelope source',f=>f.assets[0].envelope.sourceIds=[]],
 ['working-envelope width null',f=>f.assets[0].envelope.widthM=null],
 ['asset sources',f=>f.assets[0].sourceIds=[]],
 ['source URL',f=>f.sources[0].url='javascript:untrusted()'],
 ['all dimensioned systems',f=>f.assets.forEach(a=>a.geometry=null)],
 ['specification source',f=>f.assets[0].specifications[0].sourceIds=[]]
])rejectedRecord(name,mutate);

rejectedRecord('vertical cylinder height',f=>delete f.assets.find(a=>a.id==='lss').geometry.dimensions.lengthM);
rejectedRecord('box-room height',f=>delete f.assets.find(a=>a.id==='leaf').geometry.dimensions.heightM);
rejectedRecord('shaker interface depth',f=>delete f.assets.find(a=>a.id==='hydra').geometry.dimensions.depthM);
rejectedRecord('payload value',f=>f.assets.find(a=>a.id==='hydra').limits.payloadKg=null);
rejectedRecord('payload evidence',f=>delete f.assets.find(a=>a.id==='hydra').limitSourceIds.payloadKg);
rejectedRecord('bench height',f=>{
 const a=f.assets.find(a=>a.id==='cco-bench');
 a.geometry={type:'bench',dimensions:{widthM:2.6,depthM:6.8},dimensionRole:'table-surface',sourceIds:['cco'],notes:'Only surface dimensions are published.'};
},'iabg-ottobrunn');

check('Selection retains a real fixed-size asset when the requested article is too large',()=>{
 const a=requiredAsset('esa-estec/phenix');
 for(const sizeM of [[.2,.2,.2],[100,100,100],[1000,1000,1000]]){
  const article={sizeM},before=structuredClone(article),selected=chooseFacilityAsset('thermal-vacuum',article,a.id);
  assert.equal(selected,a,'Explicit system selection must stay fixed');assert.deepEqual(article,before);
  assert.deepEqual(selected.geometry.dimensions,{diameterM:4.5,lengthM:11.8});
 }
 const huge=chooseFacilityAsset('thermal-vacuum',{sizeM:[1000,1000,1000]});
 assert.ok(testFacilityAssets.includes(huge),'Fallback must be an existing documented system');
 assert.ok(!['envelope-screened','orientation-required'].includes(assessFacilityFit(huge,{sizeM:[1000,1000,1000]}).status));
 assert.equal(chooseFacilityAsset('not-a-capability',{sizeM:[1,1,1]}),null);
});

check('All fit and selection calls leave catalog measurements and evidence unchanged',()=>{
 for(const kind of Object.keys(facilityKinds)){
  for(const sizeM of [[.1,.1,.1],[1000,1000,1000]])chooseFacilityAsset(kind,{sizeM,massKg:1e9});
 }
 assert.equal(JSON.stringify(testFacilities),modelSnapshot,'Fit/selection must never resize or rewrite source data');
});

check('Small components start on a proportionate real shaker without claiming a qualified fit',()=>{
 const article={sizeM:[.1,.1,.1],massKg:1},a=chooseFacilityAsset('vibration',article);
 assert.equal(a.id,'dtb-bohemia/t5500');
 assert.equal(assessFacilityFit(a,article).status,'interface-review');
 const explicit=requiredAsset('nasa-armstrong-sec/mvf');assert.equal(chooseFacilityAsset('vibration',article,explicit.id),explicit);
 const huge=chooseFacilityAsset('vibration',{sizeM:[150,.02,30],massKg:1});assert.ok(testFacilityAssets.includes(huge));assert.notEqual(assessFacilityFit(huge,{sizeM:[150,.02,30]}).status,'envelope-screened');
});
check('Published small vacuum pressures remain visibly positive',()=>{
 assert.equal(formatFacilityNumber(.0000133),'1.33e-5');
 assert.equal(formatFacilityNumber(.000133322),'1.33e-4');
 assert.equal(formatFacilityNumber(4.5),'4.5');
});

const catalog=validateTestFacilities();
for(const failure of failures)console.error('FAIL '+failure.name+'\n  '+failure.message);
console.log('Facility data checks: '+passed+' passed, '+failures.length+' failed; '+catalog.facilities+' campuses, '+catalog.assets+' capabilities, '+catalog.modeledAssets+' dimensioned models; '+negativeCases+' negative cases, '+provenanceReferences+' evidence references checked.');
if(failures.length)process.exitCode=1;
