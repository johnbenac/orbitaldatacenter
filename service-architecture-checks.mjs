// Focused selected-interface checks. Numerical allocations are project design
// requirements; these tests do not claim supplier qualification or provider access.
import assert from 'node:assert/strict';
import {missionStarter,normalizeDesign,sizeDesign} from './dist/design.js';
import {serviceArchitecture,allocatedRelayRates,renderComputeFabric,renderEarthServiceRoute} from './dist/service-architecture.js';
import {relayTiming,relayGate,relayBoundaries} from './dist/ai-service-inputs.js';
import {assessServiceDomains} from './dist/pdr-service.js';
import {assessServiceSegments} from './dist/ai-service.js';
import {checkpointWriteStep} from './dist/data-custody.js';

let passed=0;
const failures=[];
function check(name,run){try{run();passed++;console.log('PASS '+name);}catch(error){failures.push(name);console.error('FAIL '+name+'\n'+error.stack);}}
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<=Math.max(1,Math.abs(expected))*1e-10,message||`${actual} != ${expected}`);
function seed(changes={}){
 const input=normalizeDesign({...missionStarter('text'),...changes}),trays=Math.ceil(input.trayCount),chips=trays*input.chipsPerTray;
 const modules=Math.ceil(input.storageTB/input.diskModuleTB),storageTB=modules*input.diskModuleTB;
 return {input,trays,chips,modules,storageTB,usableTB:storageTB*(1-input.diskReserve),memoryGB:chips*input.chipGB,acceleratorKw:trays*input.trayKw};
}
const find=(reports,domain,id)=>reports[domain].checks.find(c=>c.id===id);
const baseSeed=seed(),base=serviceArchitecture(baseSeed);

check('installed compute and fabric are invariant under mission and workload edits',()=>{
 const before=JSON.stringify(baseSeed);
 for(const changes of [{aiPurpose:'pretrain',pretrainParamsB:1000},{missionYears:19.5,altitudeKm:2500},{duty:.02,serviceOffersPerHour:36000},{serviceRoute:'relay',relayUpMbps:200000,relayCycleS:35},{link:'optical',network:'svalbard'}]){
  const a=serviceArchitecture({...baseSeed,input:{...baseSeed.input,...changes}});
  assert.deepEqual(a.compute,base.compute);
  assert.deepEqual(a.fabric,base.fabric);
  assert.deepEqual(a.accounting,base.accounting);
 }
 assert.equal(JSON.stringify(baseSeed),before,'Derivation mutated its input');
});

check('embedded hosts are counted once and excess requested cores install complete modules',()=>{
 const embedded=serviceArchitecture(seed({trayCount:2,hostCores:16}));
 assert.equal(embedded.compute.extraHostModules,0);
 assert.equal(embedded.compute.extraHostActiveKW,0);
 const extra=serviceArchitecture(seed({trayCount:2,hostCores:33}));
 assert.equal(extra.compute.extraHostModules,2);
 assert.equal(extra.compute.installedHostCores,48);
 close(extra.compute.extraHostMassKg,4.8);
 const dgxInput=normalizeDesign({compute:'dgx',trayCount:2,hostCores:224});
 const dgx=serviceArchitecture({...seed(),input:dgxInput,trays:2,chips:16,memoryGB:1280,acceleratorKw:20.4});
 assert.equal(dgx.compute.embeddedHostCores,224);
 assert.equal(dgx.compute.hostRamGB,4000);
 assert.equal(dgx.compute.extraHostModules,0);
 assert.equal(dgx.fabric.endpointNICMassKg,0,'Reference chassis NICs must not be charged twice');
 assert.equal(dgx.compute.referenceMatch,true);
});

check('both cable ends and per-spine radix constrain the physical topology',()=>{
 const small=serviceArchitecture(seed({trayCount:12,storageTB:8,fabricGbps:100})).fabric;
 assert.equal(small.switchCount,1);
 assert.equal(small.spineCount,0);
 assert.equal(small.usedSwitchPorts,15);
 const large=serviceArchitecture(seed({trayCount:40,storageTB:8,fabricGbps:100})).fabric;
 assert.equal(large.leafCount,3);assert.equal(large.spineCount,2);
 assert.equal(large.interswitchLinks,48);
 assert.equal(large.usedSwitchPorts,43+2*48);
 assert.equal(large.maxSpinePortDemand,24);
 assert.equal(large.topologySupported,true);
 const beyond=serviceArchitecture(seed({trayCount:2000,storageTB:8,fabricGbps:100})).fabric;
 assert.equal(beyond.topologySupported,false);
 assert.ok(beyond.maxSpinePortDemand>32);
 assert.ok(beyond.effectivePerWorkerGbps<beyond.requestedPerWorkerGbps);
});

check('requested bandwidth above the largest port remains a shortfall without inventing hardware',()=>{
 const at=serviceArchitecture(seed({fabricGbps:320})).fabric;
 const over=serviceArchitecture(seed({fabricGbps:3200})).fabric;
 assert.equal(at.endpointPortGbps,400);assert.equal(over.endpointPortGbps,400);
 assert.equal(over.effectivePerWorkerGbps,320);
 assert.equal(over.fabricLineSupported,false);
 assert.equal(over.massKg,at.massKg);
 assert.equal(over.activeKW,at.activeKW);
 assert.equal(over.oneWayBisectionGbps,at.oneWayBisectionGbps);
 const storage=serviceArchitecture(seed({storageTB:32,fabricGbps:320,diskRead:32,diskWrite:32})).fabric;
 assert.equal(storage.storageControllers,1);
 assert.equal(storage.storageLinkGBs,10);
 assert.equal(storage.storageReadGBs,10);assert.equal(storage.storageWriteGBs,10);
 assert.equal(storage.sharedStorageDuplexGBs,20);
});

check('local assignment uses complete replicas and real accelerator slots',()=>{
 const h=seed({trayCount:4,chipsPerTray:2,chipGB:80});
 const fit=serviceArchitecture({...h,replicas:2,ai:{training:false,modelMemoryGB:180}}).placement;
 assert.equal(fit.shardsPerReplica,3);assert.equal(fit.occupiedDevices,6);
 assert.equal(fit.maxTraySpan,2);assert.equal(fit.largestShardGB,60);
 assert.equal(fit.localMemoryFits,true);
 const over=serviceArchitecture({...h,replicas:3,ai:{training:false,modelMemoryGB:180}}).placement;
 assert.equal(over.occupiedDevices,9);assert.equal(over.localMemoryFits,false);
 const unknown=serviceArchitecture({...h,memoryGB:NaN,ai:{training:false,modelMemoryGB:180}}).placement;
 assert.equal(unknown.status,'unassessed');assert.equal(unknown.localMemoryFits,null);
 const training=serviceArchitecture({...h,input:{...h.input,aiPurpose:'pretrain'},ai:{training:true,modelMemoryGB:320,modelParamsB:8}});
 assert.equal(training.placement.occupiedDevices,8);
 close(training.placement.collectiveLowerBoundS,2*(1-1/4)*16/(training.fabric.effectivePerWorkerGbps/8));
});

check('relay acquisition, gating and split boundaries share one physical schedule',()=>{
 const d={relayCycleS:600,relayAvailability:.95,relayHandoverS:0};
 const timing=relayTiming(d);
 assert.equal(timing.onS,35);assert.equal(timing.usableS,535);
 close(timing.usableFraction,535/600);assert.equal(timing.longestOutageS,65);
 assert.equal(relayGate(34.999,d),false);assert.equal(relayGate(35,d),true);
 assert.equal(relayGate(569.999,d),true);assert.equal(relayGate(570,d),false);
 assert.equal(relayGate(600,d),false);assert.equal(relayGate(635,d),true);
 assert.deepEqual(relayBoundaries(0,1200,d),[35,570,635,1170]);
 assert.deepEqual(relayBoundaries(-600,0,d),[-565,-30]);
 const short={...d,relayCycleS:30,relayAvailability:1};
 assert.equal(relayTiming(short).usableFraction,0);assert.equal(relayTiming(short).longestOutageS,null);
 assert.equal(relayGate(36,short),false);assert.deepEqual(relayBoundaries(0,1200,short),[]);
 assert.equal(relayTiming({...d,relayCycleS:0}).status,'unassessed');
 assert.deepEqual(relayBoundaries(0,Infinity,d),[]);
});

check('terminal and gateway allocations cap both relay directions without provider credit',()=>{
 const h=seed({serviceRoute:'relay',relayUpMbps:200000,relayDownMbps:200000,relayHandoverS:0});
 const a=serviceArchitecture(h);
 assert.equal(a.route.effectiveUpMbps,1600);assert.equal(a.route.effectiveDownMbps,1600);
 assert.equal(a.terminal.gatewayCapMbps,8000);
 assert.equal(a.route.requestedRatesFit,false);
 assert.equal(a.route.providerStatus,'unassessed');
 assert.match(a.terminal.makeBeforeBreak,/Unassessed/);
 assert.equal(allocatedRelayRates(h,34).upMbps,0);
 assert.equal(allocatedRelayRates(h,35).upMbps,1600);
 assert.equal(allocatedRelayRates(h,35).downMbps,1600);
 close(a.route.meanRelayDownMbps,1600*535/600);
});

check('service replay cannot bypass terminal caps, commissioning or electrical lock',()=>{
 const h=sizeDesign({...missionStarter('text'),serviceRoute:'relay',relayUpMbps:200000,relayDownMbps:200000});
 const segment={start:40,end:140,commissioned:true,station:'Synthetic interface fixture',rangeKm:1000,upMbps:200000,downMbps:200000,routeUpMbps:200000,routeDownMbps:200000,activeFraction:1,itKW:24,loadKW:26,servedLoadKW:26};
 const window={start:40,end:140};
 const full=assessServiceSegments(h,[segment],window);
 close(full.network.upGB,20);close(full.network.downGB,20);
 for(const changes of [{routePoweredFraction:.5},{poweredSupport:.9},{commissioned:false}]){
  const off=assessServiceSegments(h,[{...segment,...changes}],window);
  assert.equal(off.network.upGB,0);assert.equal(off.network.downGB,0);
  assert.equal(off.completed,0);
 }
 const direct=sizeDesign({...h.input,serviceRoute:'direct',link:'optical'});
 const optical=assessServiceSegments(direct,[segment],window);
 close(optical.network.upGB,1.56*100/8000);
 close(optical.network.downGB,1560*100/8000);
});

check('optical weather applicability and long-life qualification remain explicit',()=>{
 const optical=sizeDesign({...missionStarter('text'),serviceRoute:'direct',link:'optical',missionYears:9});
 const reports=assessServiceDomains({h:optical});
 assert.equal(optical.serviceArchitecture.route.weatherStatus,'clear_sky_only');
 assert.equal(find(reports,'comm','comm-optical-weather').status,'unassessed');
 assert.equal(find(reports,'comm','comm-relay-pointing').status,'not_applicable');
 assert.equal(find(reports,'compute','compute-life-envelope').status,'shortfall');
 const rf=sizeDesign({...optical.input,link:'ka'}),rfReports=assessServiceDomains({h:rf});
 assert.equal(find(rfReports,'comm','comm-optical-weather').status,'not_applicable');
 assert.doesNotMatch(renderEarthServiceRoute(rf),/Optical case: clear sky only/);
 assert.equal(find(rfReports,'comm','comm-provider').status,'unassessed');
});

check('two-slot checkpoint custody and bounded physical I/O are integrated into sizing',()=>{
 const h=sizeDesign(missionStarter('finetune'));
 assert.equal(h.ai.checkpointSlots,2);
 close(h.ai.checkpointReserveGB,2*h.ai.restartGB);
 assert.ok(h.ai.reservedStorageGB>=h.ai.checkpointReserveGB);
 assert.ok(h.diskReadGBs<=h.serviceArchitecture.fabric.storageLinkGBs);
 assert.ok(h.diskWriteGBs<=h.serviceArchitecture.fabric.storageLinkGBs);
 assert.equal(find(assessServiceDomains({h}),'data','data-checkpoint-commit').status,'meets');
});

check('partial checkpoints retain the prior complete state and commit only at full receipt',()=>{
 const start=checkpointWriteStep({checkpointGB:10,requests:1,targetUnits:200,committedCount:1,lastCompleteUnits:100,capacityGB:3});
 assert.equal(start.writtenGB,3);assert.equal(start.pendingGB,7);
 assert.equal(start.committed,false);assert.equal(start.committedCount,1);
 assert.equal(start.lastCompleteUnits,100);assert.equal(start.pendingTargetUnits,200);
 assert.equal(start.activeSlot,1);assert.equal(start.completeSlot,0);
 const second=checkpointWriteStep({...start,checkpointGB:10,requests:1,targetUnits:300,capacityGB:2});
 assert.equal(second.writtenGB,2);assert.equal(second.pendingGB,5);
 assert.equal(second.deferredSaves,1,'A save request cannot overwrite an occupied alternate slot');
 assert.equal(second.pendingTargetUnits,200);assert.equal(second.lastCompleteUnits,100);
 assert.equal(second.committedCount,1);assert.equal(second.completeSlot,0);
 const finish=checkpointWriteStep({...second,checkpointGB:10,requests:0,capacityGB:20});
 assert.equal(finish.writtenGB,5);assert.equal(finish.pendingGB,0);
 assert.equal(finish.committed,true);assert.equal(finish.committedCount,2);
 assert.equal(finish.lastCompleteUnits,200);assert.equal(finish.completeSlot,1);assert.equal(finish.activeSlot,0);
 assert.equal(start.writtenGB+second.writtenGB+finish.writtenGB,10,'The whole checkpoint crosses the write interface exactly once');
});

check('all six Earth purposes retain seven domains and two valid supplemental drawings',()=>{
 for(const purpose of ['text','voice','batch','agents','finetune','pretrain']){
  const h=sizeDesign(missionStarter(purpose)),reports=assessServiceDomains({h});
  assert.deepEqual(Object.keys(reports),['conops','purpose','compute','data','comm','avionics','software']);
  for(const domain of ['compute','comm']){
   assert.equal(reports[domain].supplementalGraphics.length,1);
   const svg=reports[domain].supplementalGraphics[0].svg;
   assert.match(svg,/^<svg\b/);assert.match(svg,/viewBox="0 0 850 (510|500)"/);
   assert.match(svg,/<title\b/);assert.match(svg,/<desc\b/);assert.match(svg,/<rect\b/);
   assert.doesNotMatch(svg,/\b(?:NaN|Infinity|undefined)\b/);
   assert.equal((svg.match(/<svg\b/g)||[]).length,1,'Supplemental diagram must not nest the original SVG');
  }
  assert.ok(reports.software.checks.every(c=>c.status==='unassessed'&&c.actual===null));
  assert.equal(find(reports,'comm','comm-provider').status,'unassessed');
  assert.doesNotThrow(()=>JSON.stringify(reports));
 }
 const empty=assessServiceDomains();
 assert.ok(Object.values(empty).every(r=>r.checks.every(c=>c.status==='unassessed')));
 for(const svg of [renderComputeFabric(),renderEarthServiceRoute()])assert.doesNotMatch(svg,/\b(?:NaN|Infinity|undefined)\b/);
});

if(failures.length){console.error(`Service architecture: ${passed} groups passed; ${failures.length} failed.`);process.exitCode=1;}
else console.log(`Service architecture: all ${passed} focused groups passed.`);
