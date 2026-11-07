// Cross-domain invariants and independent closure checks for the differentiated
// reference families. These do not require every preliminary resource to pass.
import assert from 'node:assert/strict';
import {sizeDesign,sizingEnvelope,defaults} from './dist/design.js';
import {referenceCenterOrder} from './dist/reference-centers.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {designIdentity,inputRole} from './dist/design-contract.js';
import {componentMassProperties,terminalMassElements} from './dist/component-stations.js';
import {componentInertia} from './dist/attitude-inertia.js';
import {structuralBounds} from './dist/architecture-trades.js';
import {launchStructure,renderLaunchStructure} from './dist/launch-structure.js';
import {renderInterface} from './dist/interface-view.js';
import {installedCommunications,communicationsPackages} from './dist/communications-packages.js';
import {linkBudget,selectedTerminal,surfaces} from './dist/physics.js';
import {geometry} from './dist/orbit.js';
import {commissioningClock,deploymentProgress} from './dist/commissioning-clock.js';
import {comparisonEvents} from './dist/event-explorer.js';
import {phaseFromView} from './dist/lifecycle.js';
const near=(a,b,label,tol=1e-8)=>assert(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${label}: ${a} != ${b}`);
const finiteTree=x=>typeof x==='number'?Number.isFinite(x):Array.isArray(x)?x.every(finiteTree):x&&typeof x==='object'?Object.values(x).every(finiteTree):true;
const expected={
 'redwire-8kw':['redwire-platform',2,1,1,1800],
 'starcloud-3':['starcloud-inline',2,2,2,4500],
 'starmind-ai1':['starmind-cross',2,2,1,3300],
 'orbital-1-202606':['orbital-rack',2,2,1,2700],
 'orbital-1-202609':['orbital-reflex',2,2,1,3900],
 'star-catcher-self-powered':['heatlift-study',4,2,1,3900]
};
let count=0;
for(const id of referenceCenterOrder){
 const source=sizeDesign(buildReferenceDesign(id,{missionCase:'source'})),common=sizeDesign(buildReferenceDesign(id,{missionCase:'common'})),h=source,[family,wings,banks,optical,end]=expected[id],m=h.physicalArchitecture;
 assert.deepEqual(h.errors,[]);assert.equal(m.familyId,family);assert.equal(m.topology.solarWingCount,wings);assert.equal(m.topology.radiatorBankCount,banks);assert.equal(installedCommunications(h).opticalTerminalCount,optical);
 assert.equal(designIdentity(h).vehicleId,designIdentity(common).vehicleId,`${id}: environment toggle changes installed vehicle`);
 const variant=sizeDesign({...h.input,altitudeKm:h.input.altitudeKm+75,epoch:'2027-03-12T12:00:00Z',solarTiltDeg:21,duty:.31,requiredTps:h.input.requiredTps*1.7});
 assert.equal(designIdentity(h).vehicleId,designIdentity(variant).vehicleId,`${id}: mission edit changes installed vehicle`);
 assert.notEqual(designIdentity(h).missionId,designIdentity(variant).missionId);
 for(const u of [0,.17,.51,.83,1]){
  const properties=componentMassProperties(h,h.propellantKg,u),tensor=componentInertia(h,{deployment:u});
  near(properties.massKg,h.wetKg,`${id} pose mass conservation`);near(tensor.massKg,h.wetKg,`${id} inertia mass`);
  assert(tensor.principalKgM2.every(v=>Number.isFinite(v)&&v>0));
  near(tensor.tensorKgM2[1],tensor.tensorKgM2[3],'tensor symmetry');near(tensor.tensorKgM2[2],tensor.tensorKgM2[6],'tensor symmetry');near(tensor.tensorKgM2[5],tensor.tensorKgM2[7],'tensor symmetry');
 }
 const launch=launchStructure(h);assert(finiteTree(launch),`${id}: nonfinite launch load`);near(launch.stowedScMassKg,h.wetKg,'launch mass');
 assert.doesNotMatch(renderLaunchStructure(h)+renderInterface(h),/\b(?:NaN|Infinity|undefined)\b/);
 assert.equal(h.assemblyChecks.find(c=>c.id==='deployment-clearance').actual,0,`${id}: sampled deployment intersection`);
 assert(h.assemblyChecks.some(c=>c.id==='structural-deployment-verification'&&c.status==='open'));
 const clock=commissioningClock(h);assert.equal(clock.endS,end);near(deploymentProgress(end-1,h),1-1/clock.durationS,'family commissioning phase');assert.equal(deploymentProgress(end,h),1);
 const early={type:'eclipse',start:end-100,end:end-20},late={type:'eclipse',start:end+20,end:end+100};
 assert.deepEqual(comparisonEvents([early,late],0,end+200,h),[late]);assert.equal(phaseFromView({t:end-1},h),'E');
 const mechanisms=structuralBounds(h).mechanisms;assert.equal(mechanisms.find(x=>x.id==='solar').count,wings);
 assert.equal(mechanisms.find(x=>x.id==='radiatorCant').count,banks);
 if(family==='redwire-platform'||family==='starcloud-inline')assert(!mechanisms.some(x=>x.id==='radiatorTrim'));
 const sourceScreen=sizingEnvelope(h,h.input.missionYears,{basis:'source'}),commonScreen=sizingEnvelope(h);
 assert.equal(sourceScreen.environmentalBasis.id,'source-sampled');assert.equal(commonScreen.environmentalBasis.id,'common-zero-beta');
 const opticalHeads=terminalMassElements(h).filter(p=>p.wbs==='05.03'&&p.moving);assert.equal(opticalHeads.length,optical);
 if(optical===2)assert.notDeepEqual(opticalHeads[0].centroidM,opticalHeads[1].centroidM);
 count++;
}

assert.equal(inputRole('communicationsPackage'),'hardware');
for(const family of ['protected-core','starmind-cross'])for(const pkg of Object.keys(communicationsPackages)){
 const h=sizeDesign({...defaults,architectureFamily:family,communicationsPackage:pkg}),c=installedCommunications(h),parts=componentMassProperties(h).rows;
 near(h.massLedger.find(r=>r.id==='terminals').kg,c.terminalMassKg,'package terminal ledger');
 near(parts.filter(r=>r.wbs.startsWith('05.')).reduce((sum,r)=>sum+r.massKg,0),c.terminalMassKg,'package component mass');
 assert(finiteTree(componentInertia(h).tensorKgM2));
 const g={station:'Allocated test site',rangeKm:700,elevationDeg:60};
 const ka=linkBudget({...h.input,link:'ka'},g,.01,100),s=linkBudget({...h.input,link:'s'},g,0,0);
 assert.equal(ka.terminalInstalled,c.kaInstalled);assert.equal(s.terminalInstalled,c.sBandInstalled);
 if(!c.kaInstalled){assert.equal(ka.lineMbps,0);assert.equal(ka.terminalKW,0);assert(ka.unavailableReason);}
 if(!c.sBandInstalled){assert.equal(s.lineMbps,0);assert.equal(s.uplinkMbps,0);assert.equal(s.terminalKW,0);assert.equal(ka.uplinkMbps,0);}
 const automatic=selectedTerminal({...h.input,link:'auto'},0);assert(automatic!=='S-band'||c.sBandInstalled);assert(automatic!=='Ka'||c.kaInstalled);
 count++;
}
const redwire=sizeDesign(buildReferenceDesign('redwire-8kw')),sunny=geometry(redwire.input,10000),f=surfaces(redwire,sunny,1);
assert.equal(sunny.eclipse,false);assert(f.solarIncidenceCos>.99,'High-beta family solar reference must illuminate a one-axis wing');assert(f.radiatorSunCos<1e-6,'Nominal Redwire fixed radiator must remain edge-on');
const platformRow=u=>componentMassProperties(redwire,redwire.propellantKg,u).rows.find(r=>r.wbs==='01.01');
assert.notDeepEqual(platformRow(0).centroidM,platformRow(1).centroidM,'Compute mass must move with the platform');
near(platformRow(0).massKg,platformRow(1).massKg,'Moving payload conservation');
const old=sizeDesign(buildReferenceDesign('redwire-8kw',{revision:'odc-study-2026-11-r1'}));
assert.equal(old.physicalArchitecture.familyId,'protected-core');assert.notEqual(designIdentity(old).vehicleId,designIdentity(redwire).vehicleId);
console.log(`${count+2} architecture integration groups passed: mission/hardware identity, source/common cases, mass/inertia, interfaces, family clocks, actual drive counts, optional RF absence and high-beta solar pointing.`);
