// Focused regression checks for the controlled PDR baseline.
// Run: node mission-baseline-checks.mjs
// Imports and source references are checked locally; no network or browser is used.
import assert from 'node:assert/strict';
import {defaults,sizeDesign} from './dist/design.js';
import {massMargin,capacityMargin,resolveItemGrowth,baselineSources,marginRules} from './dist/mission-policy.js';
import {goldRules,reservedRules,goldInventory} from './dist/mission-gold-rules.js';
import {baselineRecord,baselineHtml} from './dist/mission-baseline.js';

const failures=[];
let passed=0;
function check(name,run){
  try{run();passed++;console.log('PASS '+name);}
  catch(error){failures.push(name);console.error('FAIL '+name+'\n'+error.stack);}
}
const close=(actual,expected,label)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<1e-12,`${label}: expected ${expected}, received ${actual}`);
const nonempty=(value,label)=>assert.ok(typeof value==='string'&&value.trim(),label+' must be nonempty');
const httpsUrl=(value,label)=>{
  nonempty(value,label);
  const url=new URL(value);
  assert.equal(url.protocol,'https:',label+' must be an HTTPS source');
  assert.ok(url.hostname,label+' must identify a host');
  return url;
};

check('dry-mass denominator and strict PDR boundary',()=>{
  // 1,000 kg basic + 120 kg growth; 1,270 kg allocation leaves 150 kg.
  // The independently calculated margin is 150/1,000 = 15%.
  const result=massMargin(1000,1120,1270);
  assert.equal(result.kg,150);
  close(result.fraction,.15,'Dry mass margin');
  assert.equal(result.status,'meets');
  assert.equal(massMargin(1000,1120,1220).status,'below','Exactly 10% must not pass a >10% requirement');
  assert.equal(massMargin(1000,1120,1220.0001).status,'meets','An unrounded result above 10% must pass');
  assert.equal(massMargin(1000,1120,1219.9999).status,'below');
  close(massMargin(1000,1120,1100).fraction,-.02,'Negative mass headroom');
});

check('capacity denominator and strict PDR boundary',()=>{
  // 200 units available and 160 demanded leaves 40/200 = 20%, not 40/160.
  const result=capacityMargin(200,160);
  close(result.fraction,.20,'Capacity margin');
  assert.equal(result.status,'meets');
  assert.equal(capacityMargin(200,170).status,'below','Exactly 15% must not pass a >15% requirement');
  assert.equal(capacityMargin(200,169.9999).status,'meets');
  assert.equal(capacityMargin(200,170.0001).status,'below');
  close(capacityMargin(200,0).fraction,1,'Known zero demand');
});

check('unknown or invalid physical inputs remain unassessed',()=>{
  const massCases=[[undefined,1120,1270],[1000,null,1270],[1000,1120,NaN],[1000,1120,Infinity],[0,1120,1270],[1000,999,1270]];
  for(const args of massCases){
    const result=massMargin(...args);
    assert.equal(result.status,'unassessed','Unknown/invalid mass basis must not pass');
    assert.equal(result.fraction,null);
    assert.equal(result.kg,null);
  }
  const capacityCases=[[undefined,160],[200,null],[200,NaN],[Infinity,160],[0,0],[200,-1],[200,160,NaN]];
  for(const args of capacityCases){
    const result=capacityMargin(...args);
    assert.equal(result.status,'unassessed','Unknown/invalid capacity basis must not pass');
    assert.equal(result.fraction,null);
  }
});

check('item MGA requires classified hardware and documented approved evidence',()=>{
  const basis={approved:true,mgaFraction:.25,source:'Controlled equipment growth allocation Rev A',evidenceIds:['MGA-EVIDENCE-004'],hardwareCategory:'Battery assembly',designMaturity:'Application-specific design assessed',fabricationStatus:'Production design released'};
  const hardware={classification:'Hardware',extendedMassKg:120,marginEvidence:basis};
  const assigned=resolveItemGrowth(hardware);
  assert.equal(assigned.status,'assigned');
  assert.equal(assigned.basicKg,120);
  assert.equal(assigned.mgaKg,30,'120 kg at an independently specified 25% allowance adds 30 kg');
  for(const classification of ['Consumables','Launch only',undefined]){
    const result=resolveItemGrowth({...hardware,classification});
    assert.notEqual(result.status,'assigned','A non-hardware row cannot receive dry-hardware MGA');
    assert.equal(result.mgaKg,null);
  }
  const missing=[
    ['no basis',{...hardware,marginEvidence:undefined}],
    ['approval absent',{...hardware,marginEvidence:{...basis,approved:false}}],
    ['source absent',{...hardware,marginEvidence:{...basis,source:' '}}],
    ['evidence absent',{...hardware,marginEvidence:{...basis,evidenceIds:[]}}],
    ['blank evidence identifier',{...hardware,marginEvidence:{...basis,evidenceIds:[' ']}}],
    ['category absent',{...hardware,marginEvidence:{...basis,hardwareCategory:undefined}}],
    ['maturity absent',{...hardware,marginEvidence:{...basis,designMaturity:undefined}}],
    ['fabrication status absent',{...hardware,marginEvidence:{...basis,fabricationStatus:undefined}}],
    ['mass unknown',{...hardware,extendedMassKg:NaN}]
  ];
  const incorrectlyAssigned=missing.filter(([,record])=>{
    const result=resolveItemGrowth(record);
    return result.status!=='unassessed'||result.mgaKg!==null;
  }).map(([reason])=>reason);
  assert.deepEqual(incorrectlyAssigned,[],'Incomplete evidence must not generate assigned growth');
});

check('all 136 GOLD slots are active XOR reserved, with no gaps or duplicates',()=>{
  // Independent source-contents inventory: sections 1–5 end at these rule numbers.
  const sectionSizes=[48,27,15,31,15];
  const expected=sectionSizes.flatMap((count,index)=>Array.from({length:count},(_,n)=>`${index+1}.${String(n+1).padStart(2,'0')}`));
  const active=new Set(goldRules.map(rule=>rule.id)),reserved=new Set(reservedRules);
  assert.equal(goldRules.length,77);
  assert.equal(reservedRules.length,59);
  assert.equal(active.size,77,'Duplicate active rule ID');
  assert.equal(reserved.size,59,'Duplicate reserved rule ID');
  assert.equal(expected.length,136);
  for(const id of expected)assert.notEqual(active.has(id),reserved.has(id),id+' must be active or reserved, exactly once');
  assert.deepEqual([...new Set([...active,...reserved])].sort(),expected.sort(),'Unexpected or missing numbered slot');
  assert.deepEqual([goldInventory.activeCount,goldInventory.reservedCount,goldInventory.totalSlots],[77,59,136]);
});

check('all active rules have complete evidence, owner and resolvable static source references',()=>{
  const sources=new Map();
  for(const source of baselineSources){
    assert.ok(!sources.has(source.id),'Duplicate source ID: '+source.id);
    for(const key of ['id','title','revision','locator','use'])nonempty(source[key],`Source ${source.id}: ${key}`);
    httpsUrl(source.url,'Source '+source.id);
    sources.set(source.id,source);
  }
  assert.equal(sources.get('gold')?.url,goldInventory.sourceUrl,'GOLD inventory and source register must identify the same edition');
  for(const rule of goldRules){
    for(const key of ['title','discipline','disposition','rationale','pdrEvidence','laterEvidence','owner','closure'])nonempty(rule[key],`Rule ${rule.id}: ${key}`);
    assert.ok(['adopt','tailor','not_applicable','conditional'].includes(rule.disposition),rule.id+' has no defined disposition');
    assert.ok(Number.isInteger(rule.sourcePage)&&rule.sourcePage>0,rule.id+' needs a source page');
    const url=httpsUrl(goldInventory.sourceUrl+'#page='+rule.sourcePage,'Rule '+rule.id);
    assert.equal(url.hash,'#page='+rule.sourcePage);
  }
  for(const rule of marginRules){
    assert.ok(sources.has(rule.source),'Margin rule '+rule.id+' has an unresolved source ID');
    assert.ok(Number.isInteger(rule.page)&&rule.page>0,'Margin rule '+rule.id+' has no source page');
  }
});

// This fixture intentionally supplies generous numerical mass/power headroom.
// It does not purport to close launch feasibility, verification or review evidence.
const hardware=sizeDesign({...defaults,missionYears:2.75,epoch:'2031-03-04T05:06:07Z',altitudeKm:575,trayCount:2,solarM2:800,radiatorM2:80,batteryKWh:48,storageTB:12.3,launchAllowanceKg:25000});
const record=baselineRecord(hardware);
const jsonRecord=JSON.parse(JSON.stringify(record));
const html=baselineHtml(record);
const decode=value=>value.replace(/&quot;/g,'"').replace(/&#39;|&#x27;/gi,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');

check('JSON and complete offline HTML retain every active rule and the actual normalized configuration',()=>{
  assert.deepEqual(jsonRecord.configuration.designInputs,hardware.input,'JSON must preserve every actual design input, at full precision');
  const snapshots=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter(([,attributes])=>/\btype\s*=\s*["']application\/json["']/i.test(attributes))
    .map(([, ,body])=>JSON.parse(body));
  const embedded=snapshots.find(snapshot=>snapshot.schema===jsonRecord.schema&&snapshot.baseline?.id===jsonRecord.baseline.id);
  assert.ok(embedded,'Offline HTML must contain the complete machine-readable review record');
  assert.deepEqual(embedded,jsonRecord,'HTML and JSON must identify exactly the same review package');
  assert.deepEqual(embedded.configuration.designInputs,hardware.input,'HTML must preserve the actual configuration');
  const expectedIds=goldRules.map(rule=>rule.id).sort();
  assert.deepEqual(jsonRecord.goldRules.rules.map(rule=>rule.id).sort(),expectedIds,'JSON rule inventory is incomplete');
  const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'');
  const visibleIds=new Set([...visible.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)].flatMap(([,row])=>{
    const first=row.match(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]\s*>/i);
    const text=first?decode(first[1].replace(/<[^>]*>/g,' ')).trim():'';
    const id=text.match(/^([1-5]\.\d{2})\b/);
    return id?[id[1]]:[];
  }));
  const links=new Set([...visible.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)].map(([,url])=>decode(url)));
  for(const rule of goldRules){
    assert.ok(visibleIds.has(rule.id),'HTML readable register is missing '+rule.id);
    assert.ok(links.has(goldInventory.sourceUrl+'#page='+rule.sourcePage),'HTML source citation is missing for '+rule.id);
  }
});

check('generous numerical headroom never changes open engineering evidence into PDR acceptance',()=>{
  assert.equal(record.currentAssessment.mass.screen.status,'meets','Fixture needs positive mass screening headroom');
  assert.equal(record.currentAssessment.power.screen.status,'meets','Fixture needs positive power screening headroom');
  for(const key of ['mass','power','propulsion'])assert.equal(record.currentAssessment[key].status,'open',key+' evidence must remain open');
  assert.match(record.reviewStatus,/^open\b/i,'Numerical headroom must not accept the review');
  assert.ok(record.currentAssessment.unassessedGrowthItems>0,'The fixture has no approved item-level MGA evidence');
  assert.ok(record.currentAssessment.maturity.filter(row=>row.classification==='Hardware').every(row=>row.status==='unassessed'),'Heritage references must not silently assign installed-item MGA');
});

if(failures.length){
  console.error(`Mission baseline: ${passed} groups passed, ${failures.length} failed.`);
  process.exitCode=1;
}else console.log(`Mission baseline: all ${passed} focused regression groups passed (77 active rules; 136 numbered slots).`);
