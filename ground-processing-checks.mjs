import assert from 'node:assert/strict';
import {sizeDesign} from './dist/design.js';
import {GROUND_OPERATIONS,groundOperation,groundOperationForDomain,groundProcessingState,groundProcessingEnabled,PROCESSING_VERIFICATION,processingSources} from './dist/ground-processing.js';
import {renderGroundProcessing} from './dist/ground-processing-ui.js';

const h=sizeDesign(),before=JSON.stringify(h),near=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),msg||`${a} != ${b}`);

// Rehearsal quantity endpoints agree with the installed design for different
// hardware sizes. Fuel and oxidizer are separate liquids; pressurant is separate.
for(const design of [h,sizeDesign({propellantKg:1200,batteryKWh:150,socMin:.2,socInitial:.8,socMax:.9})]){
 const a=groundProcessingState(design,'propellant',0),b=groundProcessingState(design,'propellant',1);
 near(a.quantities.illustratedFuelKg+a.quantities.illustratedOxidizerKg,0);
 near(b.quantities.illustratedFuelKg,design.fuelKg);
 near(b.quantities.illustratedOxidizerKg,design.oxidizerKg);
 near(b.quantities.illustratedFuelKg+b.quantities.illustratedOxidizerKg,design.propellantKg);
 near(b.quantities.pressurantKg,design.pressurantKg);
 const c=groundProcessingState(design,'battery',0),d=groundProcessingState(design,'battery',1);
 near(c.quantities.socIllustrated,design.input.socMin);
 near(d.quantities.socIllustrated,design.input.socInitial);
 near(d.quantities.energyAddedKWh,design.batteryKWh*(design.input.socInitial-design.input.socMin));
 near(d.quantities.storedKWh,design.batteryKWh*design.input.socInitial);
 assert.ok(d.quantities.primaryV>0);
 assert.equal(d.quantities.primaryV,design.energySystem.electrical.family.primaryV);
}
const highVoltage=sizeDesign({powerArchitecture:'highPower400'});
assert.equal(groundProcessingState(highVoltage,'battery',.5).quantities.primaryV,400);

// All playback positions remain bounded and deterministic, with no simultaneous
// fuel/oxidizer depiction and no motion interpreted as completed verification.
let previousFuel=0,previousOx=0;
for(let i=0;i<=200;i++){
 const s=groundProcessingState(h,'propellant',i/200);
 assert.ok(s.fill.fuel>=previousFuel&&s.fill.oxidizer>=previousOx);
 assert.ok(!(s.flow.fuel>0&&s.flow.oxidizer>0),'Separate fluid circuits must not depict concurrent transfer');
 previousFuel=s.fill.fuel;previousOx=s.fill.oxidizer;
}
for(const op of GROUND_OPERATIONS){
 assert.ok(processingSources[op.source],`Missing primary source for ${op.id}`);
 for(const p of [-1,0,.251,.5,.749,1,2,NaN]){
  const s=groundProcessingState(h,op.id,p);
  assert.ok(s.progress>=0&&s.progress<=1);
  assert.ok(s.stageIndex>=0&&s.stageIndex<op.stages.length);
  assert.equal(s.verificationStatus,'planned');
  Object.values(s.flow).forEach(v=>assert.ok(v>=0&&v<=1));
  Object.values(s.fill).forEach(v=>assert.ok(v>=0&&v<=1));
 }
 const html=renderGroundProcessing(h,{t:-3600},{processingOperation:op.id,processingProgress:.5});
 assert.ok(!html.includes('undefined')&&!html.includes('NaN'),`${op.id} UI has a missing design value`);
 assert.ok(html.includes('viewBox="0 0 670 260"'));
 assert.ok(html.includes('max="100" step="0.5" value="50"'));
}
assert.equal(JSON.stringify(h),before,'The rehearsal must never alter installed hardware or its evidence');

// Moved spacecraft cannot remain connected to servicing GSE; no missing time
// or invalid time may accidentally enable the work area.
assert.equal(groundProcessingEnabled({t:-3600}),true);
assert.equal(groundProcessingEnabled({t:-3000}),true);
assert.equal(groundProcessingEnabled({t:-2999.99}),false);
assert.equal(groundProcessingEnabled({t:0}),false);
assert.equal(groundProcessingEnabled({}),false);
assert.equal(groundProcessingEnabled(null),false);
const disconnected=renderGroundProcessing(h,{t:-2400},{processingOperation:'propellant',processingPlaying:true});
assert.ok(disconnected.includes('data-processing-play aria-pressed="false" disabled'));
assert.ok(disconnected.includes('data-loading-at="-3600"'));

// The PDR matrix is a separate source-linked planning artifact. Running each
// operation to the end supplies no fabricated laboratory record or release.
const matrix=JSON.stringify(PROCESSING_VERIFICATION);
for(const op of GROUND_OPERATIONS)groundProcessingState(h,op.id,1);
assert.equal(JSON.stringify(PROCESSING_VERIFICATION),matrix);
for(const row of PROCESSING_VERIFICATION){
 assert.equal(row.status,'Planned · evidence open');
 assert.ok(processingSources[row.source]);
 assert.ok(row.method&&row.venue&&row.evidence&&row.section);
}
assert.equal(groundOperationForDomain('comm','optical'),'optical');
assert.equal(groundOperationForDomain('comm','ka'),'rf');
const kaState=groundProcessingState(h,'rf',.6,'ka'),kaHtml=renderGroundProcessing(h,{t:-3600},{processingOperation:'rf',processingProgress:.6,commBench:'ka'});
assert.equal(kaState.commBench,'ka');
assert.equal(kaState.stage.title,'Compare decoded frames');
assert.equal(groundOperation('rf','ka').title,'Ka-band payload downlink checkout');
assert.ok(kaHtml.includes('Flight recorder')&&kaHtml.includes('Ground receiver &amp; decoder'));
assert.ok(!kaHtml.includes('Ground command rack')&&!kaHtml.includes('Command stimulus'));
assert.equal(groundProcessingState(h,'rf',.6).commBench,'sband','Existing RF API remains S-band by default');
assert.equal(groundOperationForDomain('power'),'battery');
assert.equal(groundOperationForDomain('thermal'),'coolant');
assert.equal(groundProcessingState(h,'coolant',.5).quantities.coolantName,h.energySystem.thermal.fluid.name);
near(groundProcessingState(h,'coolant',.5).quantities.coolantKg,h.energySystem.thermal.fluidKg);
console.log('Ground processing checks passed: installed inventory, charge energy, separate fluid paths, bounded shared rehearsal, pickup disconnect, source-linked PDR evidence, all eight SVG views.');
