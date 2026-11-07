// Focused checks for the six service / flight-computing PDR assessments.
// Synthetic service intervals below isolate access and accounting; they are test
// fixtures, not measured benchmarks or claims about an operational spacecraft.
import assert from 'node:assert/strict';
import {sizeDesign,missionStarter,sizingEnvelope} from './dist/design.js';
import {assessServiceSegments} from './dist/ai-service.js';
import {assessServiceDomains} from './dist/pdr-service.js';
import {domains} from './dist/domain-analysis.js';
import {goldRules} from './dist/mission-gold-rules.js';

let passed=0;
const failures=[];
function check(name,run){try{run();passed++;console.log('PASS '+name);}catch(error){failures.push(name);console.error('FAIL '+name+'\n'+error.stack);}}
const find=(reports,domain,id)=>reports[domain].checks.find(c=>c.id===id);
const reportIds=['conops','compute','data','comm','avionics','software'];
const activeRules=new Set(goldRules.map(r=>r.id));
const base=sizeDesign({...missionStarter('text'),serviceOffersPerHour:12,missionYears:2.75});
const identity=h=>({trays:h.trays,chips:h.chips,memoryGB:h.memoryGB,storageTB:h.storageTB,solarM2:h.solarM2,radiatorM2:h.radiatorM2,batteryKWh:h.batteryKWh,propellantKg:h.propellantKg,tankVolumeL:h.tankVolumeL,body:[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM],dryKg:h.dryKg,launchKg:h.launchKg,installedElectronicsKw:h.installedElectronicsKw,massLedger:h.massLedger.map(({id,kg,group})=>({id,kg,group}))});
const shape=reports=>{
  assert.deepEqual(Object.keys(reports),reportIds);
  const checkIds=new Set();
  for(const report of Object.values(reports)){
    assert.ok(report.title&&report.designSummary&&report.design.length&&report.checks.length);
    for(const list of ['pdrNow','later','limitations'])assert.ok(report[list].length&&report[list].every(x=>typeof x==='string'&&x.length));
    for(const link of report.interfaces)assert.ok(Object.hasOwn(domains,link.domain),report.id+' has unknown interface '+link.domain);
    for(const c of report.checks){
      assert.ok(!checkIds.has(c.id),'Duplicate check ID '+c.id);checkIds.add(c.id);
      assert.ok(['meets','shortfall','unassessed','not_applicable'].includes(c.status));
      for(const field of ['actual','required'])assert.ok(c[field]===null||Number.isFinite(c[field]),c.id+' has a nonfinite '+field);
      assert.equal(typeof c.evidence,'string');assert.ok(c.evidence.length);
      assert.ok(c.ruleIds.every(id=>activeRules.has(id)),c.id+' cites an unknown rule');
    }
    assert.match(report.graphic,/^<svg\b/);assert.match(report.graphic,/role="img"/);assert.match(report.graphic,/<title\b/);assert.match(report.graphic,/<desc\b/);
    assert.doesNotMatch(report.graphic,/\b(?:NaN|Infinity|undefined)\b/,'Invalid SVG quantity in '+report.id);
  }
};

check('all payload purposes retain the same hardware and provide valid h-only reports',()=>{
  for(const aiPurpose of ['text','voice','batch','agents','finetune','pretrain']){
    const h=sizeDesign({...base.input,aiPurpose});
    assert.deepEqual(identity(h),identity(base),aiPurpose+' silently changed installed hardware');
    const reports=assessServiceDomains({h,envelope:sizingEnvelope(h)});shape(reports);
    assert.equal(find(reports,'comm','comm-rf-eol').status,'unassessed');
    assert.ok(reports.software.checks.every(c=>c.status==='unassessed'&&c.actual===null));
  }
  for(const changes of [{missionYears:9.5},{context:16384},{serviceOffersPerHour:2400},{serviceRoute:'relay'}]){
    assert.deepEqual(identity(sizeDesign({...base.input,...changes})),identity(base),'Mission/workload edit resized installed hardware');
  }
});

check('replicated memory uses a complete installed-memory denominator',()=>{
  const h={...base,memoryGB:64,replicas:4,ai:{...base.ai,modelMemoryGB:12}};
  const reports=assessServiceDomains({h});
  const memory=find(reports,'compute','compute-memory');
  assert.equal(memory.actual,64);assert.equal(memory.required,48);assert.equal(memory.status,'meets');
  assert.equal(reports.compute.design.find(r=>r.label==='Payload memory headroom').value,25,'Four 12 GB replicas in 64 GB leave 25%, not a one-copy margin');
  const noFit=assessServiceDomains({h:{...h,memoryGB:8,replicas:0}});
  assert.equal(find(noFit,'compute','compute-memory').required,12,'At least one complete model must fit even when replica allocation is zero');
  assert.equal(find(noFit,'compute','compute-memory').status,'shortfall');
});

check('offered-load changes affect demand and graphics without resizing hardware',()=>{
  const high=sizeDesign({...base.input,serviceOffersPerHour:base.ai.activeUnitsPerSec*base.input.duty*7200});
  assert.deepEqual(identity(high),identity(base));
  const lo=assessServiceDomains({h:base}),hi=assessServiceDomains({h:high});
  assert.equal(find(hi,'compute','compute-offered-rate').status,'shortfall');
  assert.notEqual(lo.compute.graphic,hi.compute.graphic,'Capacity/load graphic ignored changed offered workload');
  assert.ok(hi.software.checks.every(c=>c.actual===null&&c.status==='unassessed'),'Payload activity must not invent flight CPU or memory evidence');
});

check('a preliminary electrical allocation cannot imply a qualified hardware rating',()=>{
  for(const aiPurpose of ['text','agents','finetune']){
    const h=sizeDesign({...base.input,aiPurpose}),reports=assessServiceDomains({h});
    const allocation=find(reports,'compute','compute-electrical-allocation');
    assert.equal(allocation.status,'unassessed',aiPurpose+' needs a documented electrical capability');
    assert.equal(allocation.actual,null,'Installation sizing proxy must not be presented as rated available power');
    assert.equal(allocation.required,h.itKw,'Known active workload demand must remain visible');
    assert.equal(reports.compute.design.find(r=>r.label==='Installation electronics sizing basis').value,h.installedElectronicsKw);
    assert.ok(h.itKw<=h.installedElectronicsKw+1e-10,'Workload draw must fit the installed tray, host and fabric allocation');
    assert.equal(h.installedElectronicsKw,h.acceleratorKw+h.serviceArchitecture.compute.extraHostActiveKW+h.serviceArchitecture.fabric.activeKW,'Installation contains each physical electrical account once');
  }
});

check('complete storage and byte custody avoid clipping and artifact double counting',()=>{
  const h={...base,storageTB:1,usableTB:.9,initialQueueGB:10,input:{...base.input,retainedGB:50},ai:{...base.ai,residentWeights:100,reservedStorageGB:200,requiredStorageGB:650}};
  const s={queueGB:35,generatedGB:50,deliveredGB:20,droppedGB:5};
  const reports=assessServiceDomains({h,s,day:{peakQueueGB:400,droppedGB:0}});
  const allocation=find(reports,'data','data-allocation'),peak=find(reports,'data','data-peak');
  assert.equal(allocation.actual,900);assert.equal(allocation.required,650);
  assert.equal(peak.required,750,'100 resident + 200 reserved + 50 retained + 400 queued; no second artifact allocation');
  assert.equal(find(reports,'data','data-custody').actual,0);
  assert.equal(find(reports,'data','data-custody').status,'meets');
  const broken=assessServiceDomains({h,s:{...s,queueGB:36}});
  assert.equal(find(broken,'data','data-custody').status,'shortfall');
  const incomplete=assessServiceDomains({h:{...h,ai:{...h.ai,requiredStorageGB:undefined}},day:{peakQueueGB:400}});
  assert.equal(find(incomplete,'data','data-peak').status,'unassessed');
});

function accessCase(route){
  const h=sizeDesign({...base.input,serviceRoute:route,relayAvailability:1,relayHandoverS:0});
  const start=3000,end=6600;
  const segment={start,end,commissioned:true,station:null,rangeKm:700,upMbps:0,downMbps:0,capacityUnitsPerSec:h.ai.activeUnitsPerSec,aiUnitRate:h.ai.activeUnitsPerSec,activeFraction:1,loadKW:h.itKw+1,servedLoadKW:h.itKw+1,itKW:h.itKw};
  const service=assessServiceSegments(h,[segment],{start,end,provenance:'Synthetic access regression fixture'});
  return {h,service,reports:assessServiceDomains({h,service,envelope:sizingEnvelope(h)})};
}
const direct=accessCase('direct'),relay=accessCase('relay');
check('direct and relay cases assess actual offers, receipt and contact delay',()=>{
  assert.equal(direct.service.completed,0);assert.ok(direct.service.offers>0);
  assert.ok(relay.service.completed>0,'The usable relay windows should return offered work');
  assert.equal(find(direct.reports,'conops','conops-outage').status,'shortfall');
  assert.equal(relay.service.network.maxOutageS,35,'One terminal must reacquire even with a requested zero handover');
  assert.equal(find(relay.reports,'conops','conops-outage').status,'shortfall','A 35 s acquisition gap exceeds the interactive response budget');
  assert.equal(find(direct.reports,'compute','purpose-ttft').status,'unassessed','No response cannot be counted as zero latency');
  assert.notEqual(direct.reports.compute.supplementalGraphics.find(g=>g.id==='payload-acceptance').svg,relay.reports.compute.supplementalGraphics.find(g=>g.id==='payload-acceptance').svg,'Outcome graphic must show physically returned work');
  assert.equal(find(relay.reports,'compute','purpose-quality-evidence').status,'unassessed','Expected acceptance is not measured quality');
  const wrongPurpose=assessServiceDomains({h:sizeDesign({...base.input,aiPurpose:'voice'}),service:relay.service});
  assert.equal(find(wrongPurpose,'conops','conops-outage').status,'unassessed','Stale workload replay must not be reused');
});

check('current RF, optical goodput and EOL RF evidence remain distinct',()=>{
  const baseState={contact:true,groundLink:'Ka',linkMarginDb:12,lineMbps:500,goodputMbps:2};
  const rf=assessServiceDomains({h:base,s:baseState});
  assert.equal(find(rf,'comm','comm-rf-cursor').status,'meets');
  assert.equal(find(rf,'comm','comm-rf-eol').status,'unassessed');
  const noContact=assessServiceDomains({h:base,s:{contact:false,groundLink:null,linkMarginDb:0}});
  assert.equal(find(noContact,'comm','comm-rf-cursor').status,'unassessed','Placeholder zero outside contact is not a link budget');
  const optical=assessServiceDomains({h:sizeDesign({...base.input,link:'optical'}),s:{...baseState,groundLink:'Optical',linkMarginDb:30}});
  assert.equal(find(optical,'comm','comm-rf-cursor').status,'not_applicable');
  assert.equal(find(optical,'comm','comm-rf-eol').status,'unassessed','Independent flight command/telemetry still needs an RF basis');
});

check('omitted RF equipment cannot claim independent command availability',()=>{
  const h=sizeDesign({...base.input,communicationsPackage:'optical-only'});
  const reports=assessServiceDomains({h,s:{contact:true,uplinkMbps:2,codingEff:.78,commandGoodputKbps:0}});
  assert.equal(find(reports,'comm','comm-command-installation').status,'shortfall');
  assert.equal(find(reports,'avionics','avionics-command-throughput').actual,0,'An inherited cursor rate cannot create an absent receiver.');
  assert.equal(find(reports,'avionics','avionics-command-hold').status,'not_applicable');
  assert.match(reports.comm.graphic,/RF hardware omitted/);
  assert.match(reports.avionics.graphic,/RF telemetry not installed/);
  shape(reports);
});

check('partial training windows and undeclared quality cannot pass an order',()=>{
  const h=sizeDesign({...base.input,aiPurpose:'finetune',trainingCalibration:'none'});
  const service={purpose:'finetune',offers:1,completed:0,expired:0,window:{start:0,end:3600,span:3600},artifact:{physicalReceipt:false,withinOrder:false,receivedGB:0},staging:{availableGB:0},metrics:[]};
  const partial=assessServiceDomains({h,service});
  assert.equal(find(partial,'compute','purpose-order-deadline').status,'unassessed');
  assert.equal(find(partial,'compute','purpose-validation').status,'unassessed');
  const end=h.input.trainingBudgetDays*86400+1;
  const expired=assessServiceDomains({h,service:{...service,expired:1,window:{start:0,end,span:end}}});
  assert.equal(find(expired,'compute','purpose-order-deadline').status,'shortfall');
});

check('unknown inputs stay unassessed, evidence is serializable, and no simulation is invoked',()=>{
  const empty=assessServiceDomains();shape(empty);
  assert.ok(Object.values(empty).every(r=>r.checks.every(c=>c.status==='unassessed')));
  const sim=new Proxy({}, {get(){throw new Error('Assessment attempted to run the simulation');}});
  const bad=assessServiceDomains({h:{...base,memoryGB:NaN,ai:{...base.ai,requiredRate:undefined}},sim,s:{linkMarginDb:Infinity}});
  shape(bad);
  assert.equal(find(bad,'compute','compute-memory').status,'unassessed');
  assert.equal(find(bad,'compute','compute-offered-rate').status,'unassessed');
  assert.doesNotThrow(()=>JSON.stringify(bad));
  const separate=assessServiceDomains({h:base,s:{cdhKW:.045,cdhServedKW:.045,aiUnitRate:100000,activeFraction:1,hkStoredMB:12,uplinkDroppedMB:0}});
  assert.equal(find(separate,'avionics','avionics-power').status,'meets');
  assert.ok(separate.software.checks.every(c=>c.actual===null&&c.status==='unassessed'));
});

if(failures.length){console.error(`Service PDR: ${passed} groups passed; ${failures.length} failed.`);process.exitCode=1;}
else console.log(`Service PDR: all ${passed} focused groups passed across six domains and six payload purposes.`);
