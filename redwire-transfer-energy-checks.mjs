import assert from 'node:assert/strict';
import {defaults,sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {energyRuntime,energyDesignChecks} from './dist/energy-system.js';

const near=(a,b,label)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-9*Math.max(1,Math.abs(a),Math.abs(b)),label+': '+a+' != '+b);
const h=sizeDesign(buildReferenceDesign('redwire-8kw')),e=h.energySystem.electrical,t=h.energySystem.thermal,c=h.energySystem.coldControl;
const p=e.payloadRotaryTransfer;
assert(p,'Redwire must include its physical rotary interface in EPS.');
assert.equal(p.powerCircuitCount,4);assert.equal(p.powerPasses,32);
assert.equal(p.allocatedCurrentPerBranchA,60);
const contactLoopR=2*.004/4,leadLoopR=2*2.10e-8*(1.10+.80)/(50e-6);
near(p.loopResistanceOhm,contactLoopR+leadLoopR,'Contacts plus declared contained copper cuts');
const endpointService=e.peakServiceKW-t.pumpNominalKW-c.totalHeaterKW-c.controlKW;
const peak={loadKW:e.installedElectronicsKW+endpointService,itKW:e.installedElectronicsKW,batteryK:260,loopK:260,radiatorK:200};
const expected=4*(e.installedElectronicsKW*1000/(4*48))**2*(contactLoopR+leadLoopR)/1000;
const full=energyRuntime(h,peak);
near(full.rotaryTransferLossKW,expected,'Four parallel-fed complete circuit I²R loss');
near(e.peakRotaryTransferLossKW,expected,'Peak sizing uses the same interface loss');
near(full.busLoadKW,e.peakBusDemandKW,'Installed peak and runtime close');
near(full.harnessLossKW,e.peakHarnessLossKW,'Transfer loss included once in peak harness loss');
near(full.busLoadKW,full.payloadDemandKW+full.serviceDemandKW+full.conversionLossKW+full.harnessLossKW,'Power conservation');

const noContact={...h,energySystem:{...h.energySystem,electrical:{...e,payloadRotaryTransfer:null}}};
const without=energyRuntime(noContact,peak);
near(full.payloadBranchOutputKW-without.payloadBranchOutputKW,expected,'Output modules supply complete transfer dissipation');
near(full.conversionLossKW-without.conversionLossKW,expected*(1/e.payload.efficiency-1),'Conversion loss follows contact demand');
const primaryCurrent=full.primaryPowerKW*1000/(e.family.primaryV*e.harness.primary.count);
const priorCurrent=without.primaryPowerKW*1000/(e.family.primaryV*e.harness.primary.count);
const extraPrimary=e.harness.primary.count*(primaryCurrent**2-priorCurrent**2)*e.harness.primary.resistanceOhm/1000;
near(full.harnessLossKW-without.harnessLossKW,expected+extraPrimary,'Transfer counted once plus induced primary wire loss');

const half=energyRuntime(h,{...peak,itKW:peak.itKW/2,loadKW:peak.itKW/2+endpointService});
near(half.rotaryTransferLossKW,expected/4,'Transfer dissipation scales with served current squared');
assert.equal(energyRuntime(h,{...peak,powered:false}).rotaryTransferLossKW,0);
assert.equal(energyRuntime(h,{loadKW:1,itKW:0}).rotaryTransferLossKW,0);
const bounds=energyDesignChecks(h).filter(r=>r.id.startsWith('energy-payload-rotary-'));
assert.equal(bounds.length,2);assert(bounds.every(r=>r.status==='meets'),'Default contact allocation must meet continuous and aggregate bounds.');

const other=sizeDesign(defaults);
assert.equal(other.energySystem.electrical.payloadRotaryTransfer,null);
assert.equal(other.energySystem.electrical.peakRotaryTransferLossKW,0);
assert.equal(energyRuntime(other,{loadKW:3,itKW:2}).rotaryTransferLossKW,0);
console.log(JSON.stringify({check:'Redwire rotary EPS sizing, runtime current scaling, capacity and energy conservation',rotaryLossW:expected*1000,peakBusKW:full.busLoadKW,powerCircuits:p.powerCircuitCount,powerPasses:p.powerPasses,currentPerBranchA:p.requiredCurrentPerBranchA,allocatedCurrentPerBranchA:p.allocatedCurrentPerBranchA},null,2));
