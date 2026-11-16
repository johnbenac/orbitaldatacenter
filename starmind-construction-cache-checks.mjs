// Cross-runtime rounding may vary; physical identity and discrete counts may not.
import assert from 'node:assert/strict';
import {starmindConstructionKey,starmindConstructionConfiguration,
 sameStarmindConstructionConfiguration as same} from './dist/starmind-construction-cache.js';

const hardware={architectureFamilyId:'starmind-cross',bodyWidthM:4.25,bodyHeightM:2.5,
 bodyLengthM:10.25,trays:128,radiatorPanelsPerBank:2,
 physicalArchitecture:{physicalId:'starmind-cross-native-hash',
  dimensionsM:[4.25,2.5,10.25],trayCount:128},
 input:{referenceCenterId:'starmind-ai1',architectureFamily:'starmind-cross',solarTiltDeg:.125},
 energySystem:{thermal:{kind:'redundant-pumped',limit:Infinity}},
 solarRootCollector:{rootStandOffM:.125,originalSolarSupports:[{foot:[.25,.375,.5]}]},
 solarRootOffsetM:.25,solarTipGapM:.375};
const graph={boxes:[{id:'box-1',frame:'body',positionM:[.125,.25,.375],
 dimensionsM:[.25,.5,.75],connectorPanels:[]}],ports:[],
 harnesses:[{id:'harness-1',quantity:1,fromPortId:'from',toPortId:'to',
  connectorTypeId:'connector',wire:{awg:12,areaMM2:3.31},cableDiameterM:.01,bendRadiusM:.04}],
 starmindHarnessInstallation:{payloadRouting:{rows:[]}},
 installationHardware:[{id:'support-1',frame:'body',positionM:[0,.125,.25],
  axes:[[1,0,0],[0,1,0],[0,0,1]],dimensionsM:[.5,.125,.25],
  materialPieces:[{id:'foot-1',shape:'box',positionM:[.125,.25,0],
   dimensionsM:[.25,.125,.5]}]}]};
const expected=starmindConstructionConfiguration(hardware,graph);
const clone=()=>structuredClone(expected);
assert(same(expected,JSON.parse(JSON.stringify(expected))),'Asset serialization preserves the contract');
assert(same(expected,Object.fromEntries(Object.entries(expected).reverse())),
 'Object key order is irrelevant; key membership remains exact');
assert.equal(expected.thermal.limit,'Infinity','Nonfinite analytical metadata is normalized');
assert.equal(expected.input.solarTiltDeg,.125);
assert.deepEqual(expected.solarRootCollector,hardware.solarRootCollector);
assert(!Object.hasOwn(expected.physicalArchitecture,'physicalId'));
assert.equal(hardware.physicalArchitecture.physicalId,'starmind-cross-native-hash',
 'Removing the redundant comparison hash does not mutate the sized hardware');
const rehashed=structuredClone(hardware);
rehashed.physicalArchitecture.physicalId='starmind-cross-browser-hash';
assert(same(starmindConstructionConfiguration(rehashed,graph),expected),
 'A derived hash alone cannot reject identical physical geometry');
assert.notEqual(starmindConstructionKey(rehashed,graph),starmindConstructionKey(hardware,graph),
 'The exact provenance key still retains the derived physical hash');
rehashed.physicalArchitecture.dimensionsM[0]+=.001;
assert(!same(starmindConstructionConfiguration(rehashed,graph),expected),
 'Underlying physical geometry remains checked after omitting its derived hash');

let actual=clone();actual.bodyWidthM+=5e-11;
assert(same(actual,expected),'Sub-tolerance geometry roundoff does not reject the capture');
actual=clone();actual.bodyWidthM+=2e-10;
assert(!same(actual,expected),'A real geometry change outside the datum tolerance rejects reuse');
actual=clone();actual.trays+=1e-12;
assert(!same(actual,expected),'Integer counts never borrow the continuous-number tolerance');
actual=clone();actual.radiatorPanelsPerBank++;
assert(!same(actual,expected));
assert(!same(0,1e-12));assert(!same(1,1+1e-12));
assert(!same(NaN,NaN));assert(!same(Infinity,Infinity));
assert(!same(.125,'.125'));assert(!same(true,1));

actual=clone();actual.electrical.installationHardware[0][5][0][2][2]=-1.1102230246251565e-16;
assert(same(actual,expected)&&same(expected,actual),
 'A material coordinate may round through zero within the existing datum tolerance');
actual.electrical.installationHardware[0][5][0][2][2]=2e-10;
assert(!same(actual,expected),'A material coordinate outside tolerance rejects reuse');
actual=clone();actual.electrical.installationHardware[0][2][0]=5e-11;
assert(same(actual,expected),'A support position uses the same geometric tolerance');
actual=clone();actual.electrical.installationHardware[0][3][0][0]+=5e-11;
assert(same(actual,expected),'A support orientation may round near an integer component');
actual=clone();actual.electrical.harnesses[0][1]+=1e-12;
assert(!same(actual,expected),'Harness quantities remain exact outside geometric fields');
actual=clone();actual.physicalArchitecture.trayCount+=1e-12;
assert(!same(actual,expected),'Physical inventory counts remain exact');
actual=clone();actual.electrical.installationHardware[0][5].push(
 structuredClone(actual.electrical.installationHardware[0][5][0]));
assert(!same(actual,expected),'Material piece inventory length remains exact');
actual=clone();actual.electrical.installationHardware[0][5][0][0]='changed-foot';
assert(!same(actual,expected),'Material piece identity remains exact');

actual=clone();actual.architectureFamilyId='different-family';assert(!same(actual,expected));
actual=clone();delete actual.bodyLengthM;assert(!same(actual,expected));
actual=clone();actual.additionalField=true;assert(!same(actual,expected));
actual=clone();actual.electrical.boxes.push(structuredClone(actual.electrical.boxes[0]));
assert(!same(actual,expected),'Inventory length is exact');
actual=clone();actual.electrical.boxes[0][0]='different-box';assert(!same(actual,expected));
actual=clone();actual.electrical.boxes[0][2].reverse();assert(!same(actual,expected),
 'Vector order cannot change');

const provenance=starmindConstructionKey(hardware,graph);
const tilted={...hardware,input:{...hardware.input,solarTiltDeg:.25}};
assert.equal(starmindConstructionKey(tilted,graph),provenance,
 'The original checksum remains unchanged for capture provenance');
assert(!same(starmindConstructionConfiguration(tilted,graph),expected),
 'The new contract explicitly guards the construction tilt omitted by the original checksum');
const shifted=structuredClone(hardware);
shifted.solarRootCollector.originalSolarSupports[0].foot[0]+=.001;
assert(!same(starmindConstructionConfiguration(shifted,graph),expected),
 'A changed collector support cannot inherit the captured routes');
actual=clone();actual.solarRootOffsetM+=.001;assert(!same(actual,expected));
actual=clone();actual.solarTipGapM+=.001;assert(!same(actual,expected));
console.log('PASS Starmind construction matching: bounded continuous roundoff, exact '+
 'counts/types/topology, explicit installation geometry, derived-hash exclusion, '+
 'JSON normalization, solar tilt/support guards and retained provenance.');
