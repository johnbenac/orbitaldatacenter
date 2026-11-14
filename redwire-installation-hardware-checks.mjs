// Bounded material/ledger/mass-property checks for the actual added Redwire
// hardware. The small synthetic part below probes idempotence and cache updates;
// it is not flight hardware or native routing evidence.
import assert from 'node:assert/strict';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {buildElectricalArchitecture,connectorSelections} from './dist/electrical-architecture.js';
import {adoptRedwireHarnessMass} from './dist/installed-harness-mass.js';
import {cableInstallationHardware,cableInstallationMassElements} from './dist/cable-installation-mass.js';
import {componentMassProperties} from './dist/component-stations.js';
import {componentInertia,movingMassElements} from './dist/attitude-inertia.js';
import {buildEquipmentList,equipmentCsv} from './dist/equipment-list.js';

const near=(actual,expected,label)=>assert(Math.abs(actual-expected)<1e-8*Math.max(1,Math.abs(expected)),label+': '+actual+' != '+expected);
const sum=values=>values.reduce((total,value)=>total+value,0);
const fixture={id:'regression:annular-contact-carrier',wbs:'07.08.99',label:'Regression annular contact carrier',frame:'body',positionM:[.4,.2,.1],material:'Aluminum',densityKgM3:2700,materialPieces:[{shape:'annulus',axis:'x',outerRadiusM:.10,innerRadiusM:.09,lengthM:.20,positionM:[0,0,0]}],massItems:[{id:'internal',label:'Declared internal test component',massKg:.3,positionM:[.02,0,0],dimensionsM:[.02,.03,.03],basis:'Synthetic regression estimate only'}]};
const normalized=cableInstallationHardware([fixture])[0],expectedMetal=Math.PI*(.10**2-.09**2)*.20*2700;
near(normalized.materialMassKg,expectedMetal,'Hollow annulus material mass');
near(normalized.allocatedInternalMassKg,.3,'Internal functional allocation remains explicit');
near(normalized.massKg,expectedMetal+.3,'Material plus separately named internals');
near(normalized.centroidM[0],.4+.02*.3/(expectedMetal+.3),'Material-weighted center');
assert(normalized.materialMassKg<Math.PI*.10**2*.20*2700,'Empty bore is not charged as metal');
const sector=cableInstallationHardware([{...fixture,massItems:[],materialPieces:[{...fixture.materialPieces[0],startAngleRad:-Math.PI/2,angleRad:Math.PI}]}])[0];
const halfRingOffset=4*(.10**3-.09**3)/(3*Math.PI*(.10**2-.09**2));
near(sector.massKg,expectedMetal/2,'Open casing sector retains only its actual material');
near(sector.centroidM[2],.1-halfRingOffset,'Sector centroid follows the renderer angle convention');
near(sector.pieces[0].intrinsicTensorPerKg[0],(.10**2+.09**2)/2-halfRingOffset**2,'Sector central inertia excludes the missing wall');

const h=sizeDesign(buildReferenceDesign('redwire-8kw')),graph=buildElectricalArchitecture(h),parts=h.cableInstallationHardware.parts;
assert(parts.length>0,'Redwire must include its actual side plates and installation hardware');
assert.equal(new Set(parts.map(part=>part.id)).size,parts.length);
assert.equal(new Set(parts.map(part=>part.wbs)).size,parts.length);
const independent=sum(parts.flatMap(part=>part.pieces.map(piece=>{
 if(piece.massBasis==='declared-functional-component'){assert(piece.basis);return piece.massKg;}
 if(piece.materialTakeoff)return sum(piece.materialTakeoff.map(row=>row.quantity*row.cutLengthM*row.areaMM2*1e-6*row.densityKgM3));
 const volume=piece.shape==='annulus'||piece.shape==='cylinder'?(piece.angleRad??2*Math.PI)/2*(piece.outerRadiusM**2-piece.innerRadiusM**2)*piece.lengthM:piece.dimensionsM[0]*piece.dimensionsM[1]*piece.dimensionsM[2];
 near(piece.volumeM3,volume,part.id+' material volume');
 return volume*piece.densityKgM3;
})));
near(h.cableInstallationHardware.totalMassKg,independent,'Complete explicit installation hardware');
near(sum(h.massLedger.filter(row=>row.cableInstallationPartId).map(row=>row.kg)),independent,'Hardware ledger owns every assembly once');
const mel=buildEquipmentList(h),csv=equipmentCsv(mel.rows);
for(const part of parts){
 const row=mel.rows.find(row=>row.wbs===part.wbs);
 assert(row&&row.item===part.label,'Identifiable hardware MEL row '+part.id);
 near(row.extendedMassKg,part.massKg,part.id+' MEL mass');assert(csv.includes(part.id));
 assert.equal(h.massLedger.filter(row=>row.id===part.ledgerId).length,1);
}
near(mel.totals.closureKg,0,'MEL closes with added hardware');
for(const deployment of [0,.21,1]){
 const properties=componentMassProperties(h,h.propellantKg,deployment),inertia=componentInertia(h,{deployment});
 near(properties.massKg,h.wetKg,'Pose '+deployment+' wet mass');
 const elements=cableInstallationMassElements(h,deployment);
 for(const part of parts){
  const row=properties.rows.find(row=>row.wbs===part.wbs),members=elements.filter(piece=>piece.partId===part.id);
  for(let axis=0;axis<3;axis++)near(row.centroidM[axis],sum(members.map(piece=>piece.massKg*piece.centroidM[axis]))/part.massKg,part.id+' centroid');
  near(inertia.contributions.find(row=>row.wbs===part.wbs).massKg,part.massKg*(1+h.input.structureMargin),part.id+' inertia mass');
 }
 const moving=movingMassElements(h,{deployment}).filter(part=>part.kind==='cableInstallationHardware');
 near(sum(moving.map(part=>part.massKg)),sum(parts.filter(part=>part.frame==='payload').map(part=>part.massKg))*(1+h.input.structureMargin),'Moving installation mass');
}
const installed=h.installedHarnessAccounting.status==='installed-route-mass-adopted',adopt=()=>adoptRedwireHarnessMass(h,graph,{installed,connectorSelections});
const before={wetKg:h.wetKg,revision:h.electricalMassRevision,properties:componentMassProperties(h),inertia:componentInertia(h)};
adopt();near(h.wetKg,before.wetKg,'Repeated installation adoption is idempotent');assert.equal(h.electricalMassRevision,before.revision);
graph.installationHardware.push(fixture);adopt();
near(h.wetKg-before.wetKg,normalized.massKg*(1+h.input.structureMargin),'Added material flows through dry growth and wet mass');
assert(h.electricalMassRevision>before.revision);assert.notEqual(componentMassProperties(h),before.properties);assert.notEqual(componentInertia(h),before.inertia);
graph.installationHardware.pop();adopt();near(h.wetKg,before.wetKg,'Removing a part removes its ledger mass');
assert(!h.massLedger.some(row=>row.cableInstallationPartId===fixture.id));
console.log('PASS Redwire installation hardware: explicit solid/annular material and named internals, individual MEL rows, no duplicate mass, pose-aware c.g./inertia/articulation, growth, revision refresh, and removal/idempotence.');
