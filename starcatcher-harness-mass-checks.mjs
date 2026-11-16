// Bounded Star Catcher study mass/MEL checks. Synthetic cuts below exercise accounting,
// not geometric acceptance; actual installed routing has its own scene checks.
import assert from 'node:assert/strict';
import {sizeDesign,defaults} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {buildElectricalArchitecture,reconcileInstalledElectricalRouting,reconcileInstalledMassFromCraft,installedElectricalLayoutKey,connectorSelections} from './dist/electrical-architecture.js';
import {adoptInstalledHarnessMass,adoptRedwireHarnessMass,harnessMassRecords,installedHarnessDesignKey,installedHarnessRoutingRevision,installedHarnessRoutingRevisionFor,starcatcherHarnessRoutingRevision,rememberHarnessTakeoff,retainedHarnessTakeoff} from './dist/installed-harness-mass.js';
import {redwireHarnessTakeoff} from './dist/redwire-harness-takeoff.js';
import {starcatcherHarnessCompatibilityKey} from './dist/installed-harness-mass.js';
import {buildEquipmentList,renderEquipmentList,harnessMassCsv} from './dist/equipment-list.js';
import {componentMassProperties,componentCentroid} from './dist/component-stations.js';
import {componentInertia,movingMassElements} from './dist/attitude-inertia.js';
import {launchStructure} from './dist/launch-structure.js';
import {createSimulation} from './dist/model.js';
import {propulsionReview} from './dist/spacecraft-architecture.js';
import {energyRuntime,energySolarDelivery} from './dist/energy-system.js';

const total=values=>values.reduce((sum,value)=>sum+value,0);
const near=(actual,expected,label,tolerance=1e-8)=>assert(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),label+': '+actual+' != '+expected);
const options={connectorSelections},fixtureSource={kind:'regression-only-synthetic-cut-lengths',geometricAcceptance:false};
const h=sizeDesign(buildReferenceDesign('star-catcher-self-powered')),g=buildElectricalArchitecture(h);
const exactKey=installedHarnessDesignKey(h,g),compatibleKey=starcatcherHarnessCompatibilityKey(h,g),
 roundedHardware={...h,bodyWidthM:h.bodyWidthM+1e-14};
assert.notEqual(installedHarnessDesignKey(roundedHardware,g),exactKey,
 'The original exact provenance still records floating geometry differences');
assert.equal(starcatcherHarnessCompatibilityKey(roundedHardware,g),compatibleKey,
 'Sub-nanometre math-library roundoff does not discard the complete published cut inventory');
assert.notEqual(starcatcherHarnessCompatibilityKey({...h,bodyWidthM:h.bodyWidthM+.000001},g),compatibleKey,
 'A changed physical envelope cannot reuse the rounded-geometry fingerprint');
assert.notEqual(starcatcherHarnessCompatibilityKey({...h,input:{...h.input,
 missionYears:h.input.missionYears+1e-13}},g),compatibleKey,'Inputs remain exact');
for(const change of [
 row=>({...row,quantity:row.quantity+1}),
 row=>({...row,cableDiameterM:row.cableDiameterM+1e-13}),
 row=>({...row,bendRadiusM:row.bendRadiusM+1e-13}),
 row=>({...row,wire:{...row.wire,areaMM2:row.wire.areaMM2+1e-13}}),
 row=>({...row,connectorTypeId:row.connectorTypeId+'-changed'})
]){
 const altered={...g,harnesses:[change(g.harnesses[0]),...g.harnesses.slice(1)]};
 assert.notEqual(starcatcherHarnessCompatibilityKey(h,altered),compatibleKey,
  'Inventory, cable sizes, bends, conductors and interface identities remain exact');
}
assert(h.installedHarnessAccounting,'Production sizing must adopt the individual harness estimate');
assert.equal(g.harnessMassRecords.length,490,'Production graph supplies the individual MEL inventory');
adoptInstalledHarnessMass(h,g,options);
assert.equal(h.installedHarnessAccounting.status,'model-estimate-adopted');
assert.equal(g.harnessMassRecords.length,490,'Every individual assembly is included');
assert.equal(g.harnessMassRecords.flatMap(row=>row.routeCuts).length,537,'Each single-pole polarity has its own cut');
assert.equal(g.allocatedHarnessMassRecords.length,36,'Embedded source leads retain one allocation per MPPT circuit');
assert.equal(g.allocatedHarnessMassRecords.flatMap(row=>row.routeCuts).length,72,'Embedded source leads retain both conductors separately');
const allocatedWingKg=36*2*.60*h.wingLengthM*h.energySystem.electrical.harness.array.areaMM2*1e-6*8960*1.4;
near(h.intraArrayHarnessAllocation.totalMassKg,allocatedWingKg,'Previously allocated intra-array conductor and jacket mass is retained');
assert(g.allocatedHarnessMassRecords.every(row=>row.connectorMassKg===0&&row.frame==='solar-wing'&&row.geometryStatus==='not-individually-routed'),'Embedded allocations retain the moving frame and do not duplicate external terminals or claim routing');
const originalAggregatePaths=JSON.stringify({primary:h.energySystem.electrical.harness.primary,service:h.energySystem.electrical.harness.service});

function closure(h,graph){
 const rows=graph.harnessMassRecords;
 assert.equal(new Set(rows.map(row=>row.id)).size,rows.length);
 const cuts=rows.flatMap(row=>row.routeCuts);
 assert.equal(new Set(cuts.map(cut=>cut.id)).size,cuts.length);
 for(const parent of ['07.05','01.04']){
  const ids=new Set(graph.harnesses.filter(a=>a.parentWbs===parent).map(a=>a.id));
  const own=rows.filter(row=>ids.has(row.harnessId)),account=graph.massAccounting[parent];
  near(total(own.map(row=>row.totalMassKg)),account.allocatedKg,parent+' owns complete harness mass');
  near(account.allocatedKg,account.estimatedRequiredKg,parent+' uses the unscaled takeoff');
  near(account.allocationToEstimateRatio,1,parent+' is not scaled to the old allowance');
  near(total(graph.assemblies.filter(a=>a.parentWbs===parent).map(a=>a.allocatedMassKg))+total(graph.connectorDetails.filter(a=>a.parentWbs===parent).map(a=>a.allocatedMassKg)),account.allocatedKg,parent+' alternate details reconcile');
 }
 const basic=total(h.massLedger.filter(row=>row.group==='Hardware').map(row=>row.kg));
 near(h.dryKg,basic*(1+h.input.structureMargin),'Dry mass and growth');
 near(h.wetKg,h.dryKg+h.propellantKg+h.pressurantKg,'Wet mass');
 near(h.launchKg,total(h.massLedger.map(row=>row.kg)),'Launch ledger');
 near(componentMassProperties(h).massKg,h.wetKg,'Physical mass matches the ledger');
 near(h.massMarginKg,h.input.launchAllowanceKg-h.launchKg,'Launch allowance margin');
 near(h.launchReferenceMarginKg,h.input.referenceKg-h.launchKg,'Launcher margin');
 const allocated=graph.allocatedHarnessMassRecords||[],allRecords=[...rows,...allocated],mel=buildEquipmentList(h);
 assert.equal(mel.harnessEntries.length,allRecords.length);
 near(h.massLedger.find(row=>row.id==='array').kg,h.input.solarM2*h.input.pvKgM2+total(allocated.map(row=>row.totalMassKg)),'Wing parent owns the embedded source leads once');
 near(h.installedHarnessAccounting.totalMassKg,total(allRecords.map(row=>row.totalMassKg)),'Full harness subtotal includes external routes and allocated wing leads');
 near(mel.totals.closureKg,0,'MEL parent closure');
 for(const row of mel.harnessEntries){
  const record=allRecords.find(record=>record.id===row.id);
  near(row.totalMassKg,record.cableMassKg+record.connectorMassKg,row.id+' complete mass');
  assert.equal(row.massAccounting,'included-in-parent');
  assert.deepEqual(row.routeCuts,record.routeCuts);
 }
 return mel;
}

let mel=closure(h,g);
assert(mel.assemblyDetails.filter(row=>row.kind==='harness').every(row=>row.basis.includes('adopted without scaling')),'Model fallback is described honestly');
assert(mel.rows.find(row=>row.wbs==='07.05').massBasis.includes('each current model cut'),'The MEL distinguishes model cuts from native route takeoff');
const html=renderEquipmentList(h),csv=harnessMassCsv(mel.harnessEntries);
assert.equal((html.match(/data-harness-id=/g)||[]).length,526,'Visible external assemblies and embedded lead allocations');
assert(html.includes('Model-estimated embedded wing leads; not individually routed'),'The visible MEL identifies the internal estimation boundary');
assert.equal(csv.trimEnd().split('\r\n').length,527,'One CSV row per external assembly or embedded allocation');
assert.equal(JSON.parse(JSON.stringify(mel)).harnessEntries.length,526,'JSON retains both inventories');
for(const deployment of [0,1])near(total(movingMassElements(h,{deployment}).filter(row=>row.wbs==='02.01').map(row=>row.massKg)),(h.input.solarM2*h.input.pvKgM2+allocatedWingKg)*(1+h.input.structureMargin),'Moving solar sheet/roll model carries its embedded lead allocation');
assert.notDeepEqual(componentMassProperties(h,h.propellantKg,0).rows.find(row=>row.wbs==='02.01').stationsM,componentMassProperties(h,h.propellantKg,1).rows.find(row=>row.wbs==='02.01').stationsM,'The retained lead mass follows the actual solar-wing deployment frames');

// A hollow, body-mounted tray fixture checks shared hardware adoption without
// making the geometry test depend on one future production mounting layout.
const beforeHardware={dry:h.dryKg,total:h.cableInstallationHardware.totalMassKg};
const fixture={id:'mass-regression:tray',label:'Mass regression open tray',wbs:'07.07.9999',frame:'body',positionM:[.6,.2,.1],material:'Aluminium test allocation',densityKgM3:2700,sourceUrl:'./starcatcher-harness-mass-checks.mjs',basis:'Regression-only three-wall open tray; cable space is empty.',materialPieces:[{id:'floor',dimensionsM:[.5,.1,.002],positionM:[0,0,0]},{id:'left',dimensionsM:[.5,.002,.02],positionM:[0,-.049,.011]},{id:'right',dimensionsM:[.5,.002,.02],positionM:[0,.049,.011]}]};
g.installationHardware=[...(g.installationHardware||[]),fixture];
adoptInstalledHarnessMass(h,g,options);
const addedKg=2700*(.5*.1*.002+2*.5*.002*.02),part=h.cableInstallationHardware.parts.find(part=>part.id===fixture.id);
near(part.massKg,addedKg,'Hollow tray material, excluding empty space');
near(h.dryKg-beforeHardware.dry,addedKg*(1+h.input.structureMargin),'Hardware growth counted once');
near(h.cableInstallationHardware.totalMassKg-beforeHardware.total,addedKg,'Hardware subtotal');
assert.equal(h.massLedger.filter(row=>row.cableInstallationPartId===fixture.id).length,1);
near(buildEquipmentList(h).rows.find(row=>row.wbs===fixture.wbs).extendedMassKg,addedKg,'Dedicated hardware MEL row');
g.installationHardware=g.installationHardware.filter(part=>part.id!==fixture.id);
adoptInstalledHarnessMass(h,g,options);
near(h.dryKg,beforeHardware.dry,'Removing the fixture restores the prior total');

// Distinct physical polarity cuts expose the old longest-cut-times-quantity
// shortcut. They deliberately make no claim to have passed geometric checks.
const records=g.harnesses.flatMap((a,index)=>Array.from({length:a.quantity*(a.connectorTypeId.startsWith('hv-single')?2:1)},(_,i)=>({id:a.id+'/'+i,harnessId:a.id,lengthM:a.routeLengthM+i*.05+index*.0001,minimumBendRadiusM:a.bendRadiusM,planningPassed:null})));
function adoptCuts(h,graph,cuts){
 const mounts=JSON.stringify({tanks:h.propulsion.tanks,engines:h.propulsion.engines});
 reconcileInstalledElectricalRouting(graph,cuts,{source:fixtureSource});
 rememberHarnessTakeoff(h,graph,cuts,fixtureSource);
 adoptInstalledHarnessMass(h,graph,{...options,installed:true,source:fixtureSource});
 assert.equal(JSON.stringify({tanks:h.propulsion.tanks,engines:h.propulsion.engines}),mounts,'Native takeoff adoption cannot silently move rendered mounts');
}
assert.throws(()=>rememberHarnessTakeoff(h,g,records.slice(1),fixtureSource),/Invalid installed harness takeoff/,'Missing physical cut is rejected');
assert.throws(()=>rememberHarnessTakeoff(h,g,[...records.slice(1),records[1]],fixtureSource),/Invalid installed harness takeoff/,'Duplicate replacing a cut is rejected');
assert.throws(()=>rememberHarnessTakeoff(h,g,records.map((r,i)=>i? r:{...r,harnessId:'unrelated-harness'}),fixtureSource),/Invalid installed harness takeoff/,'Wrong assembly ownership is rejected');
for(const invalid of [{lengthM:0},{lengthM:NaN},{minimumBendRadiusM:-.001},{minimumBendRadiusM:NaN}])assert.throws(()=>rememberHarnessTakeoff(h,g,records.map((r,i)=>i?r:{...r,...invalid}),fixtureSource),/Invalid installed harness takeoff/,'Invalid measured cut data is rejected');
const failedCutId='P-PAY-1/0',unqualified=records.map(record=>record.id===failedCutId?{...record,minimumBendRadiusM:0,planningPassed:false}:record);
adoptCuts(h,g,unqualified);
assert.equal(h.installedHarnessAccounting.status,'installed-route-mass-adopted','A complete failed route inventory still carries its actual material');
assert.equal(g.harnessMassRecords.flatMap(row=>row.routeCuts).length,537,'Failed geometry cannot drop an individual cut');
assert.equal(retainedHarnessTakeoff(h,g).records.find(row=>row.id===failedCutId).minimumBendRadiusM,0,'Retained takeoff preserves the failed bend evidence');
assert.equal(g.checks.find(check=>check.id==='P-PAY-1:bend-radius').within,false,'A zero bend remains a geometric shortfall');
assert.equal(g.checks.find(check=>check.id==='P-PAY-1:installed-route-planning').within,false,'Failed native planning is never converted to acceptance by mass adoption');
closure(h,g);
adoptCuts(h,g,records);
assert.equal(h.installedHarnessAccounting.status,'installed-route-mass-adopted');
assert.equal(h.input.installedHarnessTakeoff.routingRevision,starcatcherHarnessRoutingRevision);
assert.equal(installedHarnessRoutingRevisionFor(h),starcatcherHarnessRoutingRevision);
const firstHarness=g.harnesses[0],completeCuts=firstHarness.installedRoutes;
firstHarness.installedRoutes=completeCuts.slice(1);
assert.throws(()=>harnessMassRecords(g,{...options,installed:true}),/Incomplete installed mass takeoff/,'Partial installed mass cannot be adopted');
firstHarness.installedRoutes=completeCuts;
mel=closure(h,g);
let independentlyMeasuredCableKg=0,independentTerminationsKg=0;
for(const a of g.harnesses){
 const length=total(a.installedRoutes.map(row=>row.lengthM+a.terminationAllowanceM)),type=connectorSelections[a.connectorTypeId];
 independentlyMeasuredCableKg+=a.kind==='power'?length*(a.connectorTypeId.startsWith('hv-single')?1:2)*a.wire.areaMM2*1e-6*8960*1.4:length*(a.kind==='data'?(type.cableMassKgPerM??.020):a.kind==='control'?.045:.0491);
 independentTerminationsKg+=a.quantity*a.totalMatedInterfacesPerAssembly*type.estimatedPairKg;
}
near(total(g.harnessMassRecords.map(row=>row.cableMassKg)),independentlyMeasuredCableKg,'Independent conductor/jacket sum');
near(total(g.harnessMassRecords.map(row=>row.connectorMassKg)),independentTerminationsKg,'Terminations counted once per complete assembly');

// The EPS already assumes equal-current parallel payload feeds. Using their
// mean actual loop resistance must retain the sum of individual I²R losses.
const payload=g.harnesses.find(a=>a.id==='P-PAY-1'),runtimeInput={loadKW:175,itKW:170,batteryK:294,loopK:305,radiatorK:300};
const installedPowerHardware=()=>JSON.stringify({payloadModules:h.energySystem.electrical.payload.modules,payloadCapacityKW:h.energySystem.electrical.payload.capacityKW,serviceModules:h.energySystem.electrical.service.modules,batteryModules:h.energySystem.electrical.battery.modules,heatPumpModules:h.energySystem.electrical.heatPumpDrive.modules,heatPumpCapacityKW:h.energySystem.electrical.heatPumpDrive.capacityKW,feeds:h.energySystem.electrical.distribution.feeds,busbarRatingA:h.energySystem.electrical.distribution.busbarRatingA,harnesses:g.harnesses.map(a=>[a.id,a.quantity,a.connectorTypeId,a.wire.awg,a.wire.areaMM2])});
const beforePayload={dry:h.dryKg,runtime:energyRuntime(h,runtimeInput),wingKg:h.intraArrayHarnessAllocation.totalMassKg,peakBusKW:h.energySystem.electrical.peakBusDemandKW,peakPayloadKW:h.energySystem.electrical.peakPayloadBranchKW,hardware:installedPowerHardware()};
const payloadChanged=records.map(record=>record.id==='P-PAY-1/0'?{...record,lengthM:record.lengthM+1}:record);
adoptCuts(h,g,payloadChanged);
const afterPayload=energyRuntime(h,runtimeInput),runtimeCurrentA=runtimeInput.itKW*1000/(h.energySystem.electrical.harness.payload.count*48),expectedPayloadLossDeltaKW=runtimeCurrentA**2*(2*2.10e-8/(payload.wire.areaMM2*1e-6))/1000;
near(afterPayload.payloadBranchOutputKW-beforePayload.runtime.payloadBranchOutputKW,expectedPayloadLossDeltaKW,'Actual payload conductor length reaches the runtime I²R calculation');
assert(afterPayload.harnessLossKW>beforePayload.runtime.harnessLossKW&&afterPayload.busLoadKW>beforePayload.runtime.busLoadKW,'Runtime harness loss and bus demand increase together');
near(h.energySystem.electrical.peakPayloadBranchKW-beforePayload.peakPayloadKW,payload.currentA**2*(2*2.10e-8/(payload.wire.areaMM2*1e-6))/1000,'Stored payload design demand follows the same actual length');
assert(h.energySystem.electrical.peakBusDemandKW>beforePayload.peakBusKW,'Peak bus demand increases and fixed distribution margin decreases');
near(h.energySystem.checks.find(check=>check.id==='energy-payload').required,h.energySystem.electrical.peakPayloadBranchKW,'Payload capacity check uses the refreshed required output');
near(h.energySystem.checks.find(check=>check.id==='energy-distribution').required,h.energySystem.electrical.peakBusDemandKW,'Distribution capacity check uses refreshed bus demand');
assert.equal(installedPowerHardware(),beforePayload.hardware,'Length reconciliation never resizes selected converters, feeds, contacts or gauges');
const batteryPaths=g.harnesses.filter(a=>a.id.startsWith('P-BAT-')),batteryCount=new Set(batteryPaths.map(a=>a.fromBoxId)).size;
for(const a of batteryPaths){
 near(a.currentA,h.energySystem.electrical.peakBusDemandKW*1000/h.energySystem.electrical.family.primaryV/batteryCount/a.quantity,'Battery-circuit current follows the new bus demand');
 near(a.voltageDropV,a.currentA*a.resistanceOhm,'Battery voltage-drop check retains its fixed selected gauge');
 near(g.portById[a.fromPortId].currentA,a.currentA,'Battery interface current agrees with the circuit');
}
near(h.dryKg-beforePayload.dry,2*payload.wire.areaMM2*1e-6*8960*1.4*(1+h.input.structureMargin),'The same payload detour adds conductor material once');
near(h.intraArrayHarnessAllocation.totalMassKg,beforePayload.wingKg,'External detours do not duplicate the embedded wing allocation');
assert.equal(JSON.stringify({primary:h.energySystem.electrical.harness.primary,service:h.energySystem.electrical.harness.service}),originalAggregatePaths,'Primary and mixed-voltage service approximations are not silently remapped');
adoptCuts(h,g,records);
const payloadAggregate=h.energySystem.electrical.harness.payload;
payloadAggregate.count++;
adoptInstalledHarnessMass(h,g,{...options,installed:true,source:fixtureSource});
assert.equal(payloadAggregate.installedResistanceAccounting.mapped,false,'An EPS quantity mismatch cannot claim an exact mapping');
near(payloadAggregate.resistanceOhm,payloadAggregate.installedResistanceAccounting.originalResistanceOhm,'Unmatched EPS group retains its original estimate');
assert.equal(h.energySystem.electrical.harness.installedDemandAccounting.payloadMapped,false);
near(h.energySystem.electrical.peakPayloadBranchKW,h.energySystem.electrical.harness.installedDemandAccounting.originalDemand.peakPayloadBranchKW,'A mismatched payload group retains its original demand');
assert.equal(h.energySystem.electrical.harness.installedDemandAccounting.heatPumpMapped,true,'The independently matched compressor group remains mapped');
payloadAggregate.count--;
const selectedCurrent=payload.currentA;payload.currentA+=1;
adoptInstalledHarnessMass(h,g,{...options,installed:true,source:fixtureSource});
assert.equal(payloadAggregate.installedResistanceAccounting.mapped,false,'Unequal current allocation cannot borrow the equal-feed aggregate');
payload.currentA=selectedCurrent;
adoptCuts(h,g,records);
assert.equal(payloadAggregate.installedResistanceAccounting.mapped,true);
const excessive=records.map(record=>record.id==='P-PAY-1/0'?{...record,lengthM:record.lengthM+5000}:record);
adoptCuts(h,g,excessive);
assert.equal(h.energySystem.checks.find(check=>check.id==='energy-payload').status,'shortfall','An excessive synthetic detour is flagged against installed converter capacity');
assert.equal(g.checks.find(check=>check.id==='P-PAY-1:wire-area').within,false,'The selected wire shortfall is retained');
assert.equal(installedPowerHardware(),beforePayload.hardware,'A shortfall cannot be hidden by automatic hardware resizing');
adoptCuts(h,g,records);
closure(h,g);

// Heat lift has a separate primary-voltage compressor supply. Its two actual
// polarity cuts, drive loss and fixed installed rating stay in the same account.
const compressor=g.harnesses.find(a=>a.id==='P-THERMAL'),motor=h.energySystem.electrical.heatPumpDrive;
assert.equal(compressor.quantity,3);
assert.equal(compressor.voltageV,400,'Compressor power uses the primary rail');
assert.equal(compressor.installedRoutes.length,6,'Three supply/return pairs have six physical cuts');
assert(g.harnesses.some(a=>a.id==='C-THERMAL'&&a.kind==='control'),'The separate thermal controller is retained');
assert.equal(h.energySystem.electrical.harness.heatPump.installedResistanceAccounting.mapped,true);
const motorInput={...runtimeInput,loopK:h.input.heatPumpColdK,radiatorK:h.input.heatPumpHotK,appliedPayloadHeatKW:100};
const beforeMotor={dry:h.dryKg,runtime:energyRuntime(h,motorInput),peak:motor.peakBranchKW,capacity:motor.capacityKW,modules:motor.modules,hardware:installedPowerHardware()};
const motorChanged=records.map(record=>record.id==='P-THERMAL/0'?{...record,lengthM:record.lengthM+1}:record);
adoptCuts(h,g,motorChanged);
const afterMotor=energyRuntime(h,motorInput),onePolarityResistance=2.10e-8/(compressor.wire.areaMM2*1e-6),motorCurrent=beforeMotor.runtime.heatPumpInputKW*1000/(compressor.quantity*motor.voltageV);
near(afterMotor.heatPumpInputKW,beforeMotor.runtime.heatPumpInputKW,'Fixed applied cold heat isolates compressor harness loss');
near(afterMotor.heatPumpBranchOutputKW-beforeMotor.runtime.heatPumpBranchOutputKW,motorCurrent**2*onePolarityResistance/1000,'Actual compressor polarity length reaches runtime I²R');
near(motor.peakBranchKW-beforeMotor.peak,compressor.currentA**2*onePolarityResistance/1000,'Compressor design demand uses the complete individual cut');
near(h.dryKg-beforeMotor.dry,compressor.wire.areaMM2*1e-6*8960*1.4*(1+h.input.structureMargin),'Compressor polarity material enters dry mass once');
near(h.energySystem.checks.find(check=>check.id==='energy-heatpump-drive').required,motor.peakBranchKW,'Heat-pump capacity check follows actual route loss');
assert.equal(motor.capacityKW,beforeMotor.capacity);
assert.equal(motor.modules,beforeMotor.modules);
assert.equal(installedPowerHardware(),beforeMotor.hardware,'Actual route loss does not silently resize the selected drive');
adoptCuts(h,g,records);
const motorAggregate=h.energySystem.electrical.harness.heatPump;
motorAggregate.count++;
adoptInstalledHarnessMass(h,g,{...options,installed:true,source:fixtureSource});
assert.equal(motorAggregate.installedResistanceAccounting.mapped,false,'A mismatched compressor quantity cannot claim an exact runtime mapping');
near(motor.peakBranchKW,h.energySystem.electrical.harness.installedDemandAccounting.originalDemand.heatPumpPeakBranchKW,'Unmatched compressor topology retains its explicit estimate');
motorAggregate.count--;
adoptCuts(h,g,records);
assert.equal(motorAggregate.installedResistanceAccounting.mapped,true);
const motorExcessive=records.map(record=>record.id==='P-THERMAL/0'?{...record,lengthM:record.lengthM+50000}:record);
adoptCuts(h,g,motorExcessive);
assert.equal(h.energySystem.checks.find(check=>check.id==='energy-heatpump-drive').status,'shortfall','A long compressor detour is exposed against the installed drive');
assert.equal(g.checks.find(check=>check.id==='P-THERMAL:wire-area').within,false);
assert.equal(installedPowerHardware(),beforeMotor.hardware,'Compressor shortfall never creates additional converter hardware');
adoptCuts(h,g,records);
closure(h,g);

const solar=g.harnesses.find(a=>a.id==='P-SA-1'),shortest=solar.installedRoutes[0],deltaM=.01;
assert(shortest.lengthM+deltaM<Math.max(...solar.installedRoutes.map(row=>row.lengthM)));
const before={dry:h.dryKg,revision:h.electricalMassRevision,centroid:componentCentroid(h,h.propellantKg),inertia:componentInertia(h),structure:launchStructure(h),simulation:createSimulation(h),solar:energySolarDelivery(h,100)};
const changed=records.map(record=>record.id===shortest.id?{...record,lengthM:record.lengthM+deltaM}:record);
adoptCuts(h,g,changed);
const expectedDryDelta=deltaM*solar.wire.areaMM2*1e-6*8960*1.4*(1+h.input.structureMargin);
near(h.dryKg-before.dry,expectedDryDelta,'A shorter polarity changes the carried dry mass');
const afterSolar=energySolarDelivery(h,100),sourceCurrentA=100000/(h.energySystem.electrical.harness.array.count*h.energySystem.electrical.source.nominalMppV);
near(afterSolar.arrayHarnessLossKW-before.solar.arrayHarnessLossKW,sourceCurrentA**2*2.10e-8*deltaM/(solar.wire.areaMM2*1e-6)/1000,'A shorter actual source polarity also changes runtime source loss');
near(h.energySystem.electrical.harness.array.installedResistanceAccounting.retainedIntraArrayResistanceOhm,2*2.10e-8*.60*h.wingLengthM/(h.energySystem.electrical.harness.array.areaMM2*1e-6),'Source delivery retains intra-array lead resistance once');
assert(h.electricalMassRevision>before.revision);
assert.notDeepEqual(componentCentroid(h,h.propellantKg),before.centroid,'Centroid cache refresh');
assert.notDeepEqual(componentInertia(h).tensorKgM2,before.inertia.tensorKgM2,'Inertia cache refresh');
assert.notEqual(launchStructure(h),before.structure,'Launch load cache refresh');
near(launchStructure(h).stowedScMassKg,h.wetKg,'Launch loads carry the new mass');
assert.notEqual(createSimulation(h),before.simulation,'Simulation mass cache refresh');
const revision=h.electricalMassRevision,launch=h.launchKg;
adoptCuts(h,g,changed);
assert.equal(h.electricalMassRevision,revision,'Repeated adoption is idempotent');
near(h.launchKg,launch,'Repeated adoption cannot duplicate mass');
const alignment=propulsionReview(h);
assert(alignment.alignmentDeg<=alignment.alignmentLimitDeg,'Adopted mass retains the actual engine alignment limit');
assert(alignment.torqueNm<=h.input.cmgTorqueNm,'Actual retained mounts keep the thrust torque within the allocation');

const reused=sizeDesign({...h.input,epoch:new Date(Date.parse(h.input.epoch)+7*86400000).toISOString()}),reusedGraph=buildElectricalArchitecture(reused);
const actual={electrical:{architecture:g,routing:{lines:changed.map(record=>({id:record.id,r:{spec:g.harnesses.find(a=>a.id===record.harnessId)},restLengthM:record.lengthM,minimumStaticBendM:record.minimumBendRadiusM}))}}};
assert.equal(installedElectricalLayoutKey(reusedGraph),installedElectricalLayoutKey(g),'Mission epoch change retains the physical interface layout');
const mismatched=JSON.parse(JSON.stringify(g));mismatched.boxes[0].positionM[0]+=.001;
assert.equal(reconcileInstalledMassFromCraft(reused,{electrical:{...actual.electrical,architecture:mismatched}}),false,'A moved equipment endpoint cannot borrow another physical layout');
for(const change of ['mounted-route','support-material','rotor-frame']){
 const altered=JSON.parse(JSON.stringify(g));
 if(change==='mounted-route')altered.starcatcherHarnessInstallation.payloadRouting.rows[0].controlPoints[3][2]+=.001;
 else if(change==='rotor-frame')altered.installationHardware.find(part=>part.id.startsWith('starcatcher-solar-collector-')).materialPieces.find(piece=>piece.motion).motion.originM[0]+=.001;
 else altered.installationHardware.find(part=>part.owner==='starcatcher-harness-installation').materialPieces[0].positionM[2]+=.001;
 assert.notEqual(installedElectricalLayoutKey(altered),installedElectricalLayoutKey(g),change+' invalidates persistent scene reuse');
 assert.notEqual(installedHarnessDesignKey(h,altered),installedHarnessDesignKey(h,g),change+' invalidates the retained cut fingerprint');
 assert.equal(retainedHarnessTakeoff({...h,input:{...h.input}},altered),null,change+' cannot borrow an old complete takeoff');
 assert.equal(reconcileInstalledMassFromCraft(reused,{electrical:{...actual.electrical,architecture:altered}}),false,change+' cannot adopt cuts from a different retained craft');
}
reconcileInstalledMassFromCraft(reused,actual);
near(reused.launchKg,h.launchKg,'Reused scene cuts replace the mission-only model estimate');
assert.equal(reused.installedHarnessAccounting.status,'installed-route-mass-adopted');

const roundtrip=sizeDesign(JSON.parse(JSON.stringify(h.input))),roundtripGraph=buildElectricalArchitecture(roundtrip),takeoff=retainedHarnessTakeoff(roundtrip,roundtripGraph);
assert(takeoff,'Exact serialized design retains its cut inventory');
adoptCuts(roundtrip,roundtripGraph,takeoff.records);
near(roundtrip.launchKg,h.launchKg,'Serialized model retains the carried mass');
const variant=sizeDesign({...h.input,solarM2:h.input.solarM2+1}),variantGraph=buildElectricalArchitecture(variant);
assert.equal(retainedHarnessTakeoff(variant,variantGraph),null,'A changed physical design cannot borrow the old takeoff');
assert.equal(variant.input.installedHarnessTakeoff,undefined,'Invalid takeoff removed from export inputs');

const redwire=sizeDesign(buildReferenceDesign('redwire-8kw')),redwireGraph=buildElectricalArchitecture(redwire);
assert.equal(installedHarnessRoutingRevisionFor(redwire),installedHarnessRoutingRevision);
assert.equal(installedHarnessDesignKey(redwire,redwireGraph),redwireHarnessTakeoff.designKey,'Existing Redwire seed key is unchanged');
assert.equal(redwire.installedHarnessAccounting.status,'installed-route-mass-adopted');
assert.throws(()=>rememberHarnessTakeoff(redwire,redwireGraph,redwireHarnessTakeoff.records.map((row,i)=>i?row:{...row,minimumBendRadiusM:0})),/Invalid installed harness takeoff/,'The Redwire zero-bend rejection contract is unchanged');
const redwireBefore=JSON.stringify(redwire);
adoptRedwireHarnessMass(redwire,redwireGraph,{...options,installed:true,source:redwire.installedHarnessAccounting.source});
assert.equal(JSON.stringify(redwire),redwireBefore,'Redwire compatibility entry point remains idempotent');
for(const input of [defaults,buildReferenceDesign('starcloud-3')]){
 const other=sizeDesign(input),before=JSON.stringify(other);
 assert.equal(adoptInstalledHarnessMass(other,{},options),false,'Other architectures remain outside this adoption');
 assert.equal(JSON.stringify(other),before,'Unsupported adoption is a strict no-op');
}
console.log('PASS Star Catcher harness mass: 490 external assemblies / 537 routed cuts plus 36 embedded source-lead allocations / 72 conductors, unscaled parents, individual MEL/CSV/JSON, moving wing ownership, exact polarity material and runtime I²R changes including 400 V compressor supply, failed-geometry mass retention, downstream cache refresh, serialized takeoff controls, and Redwire/other-family isolation. Synthetic length fixtures do not establish route clearance.');
