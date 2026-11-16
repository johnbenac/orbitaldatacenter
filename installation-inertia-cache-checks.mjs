// A flight step must not reconstruct body-fixed cable hardware for every pose.
// Check the material schedule, frame behavior and revision boundary directly;
// elapsed-time limits would vary with the host running the regression suite.
import assert from 'node:assert/strict';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {componentMassProperties} from './dist/component-stations.js';
import {componentInertia,movingMassElements} from './dist/attitude-inertia.js';
import {cableInstallationMassElements,workerOpticsMassElements} from './dist/cable-installation-mass.js';

const h=sizeDesign(buildReferenceDesign('starmind-ai1'));
assert(h.cableInstallationHardware.parts.reduce((n,part)=>n+part.pieces.length,0)>1000,
 'The regression includes the complete installed SpaceX hardware schedule');
assert(h.cableInstallationHardware.parts.every(part=>part.frame==='body'));
const opticalFixture={massKg:.4,moduleDimensionsM:[.02,.03,.04],placements:[
 {id:'fixed-module',frame:'body',positionM:[.2,.1,.3],axes:[[1,0,0],[0,1,0],[0,0,1]],dimensionsM:[.02,.03,.04],massKg:.4}
]};
const opticalHardware={electricalMassRevision:0,serviceArchitecture:{fabric:{workerOptics:opticalFixture}}};

// Count accesses to actual source geometry, rather than timing an implementation.
// After its one-time adoption, changing a flight pose cannot move this material.
let reads=0;
const piece=h.cableInstallationHardware.parts[0].pieces[0],position=piece.positionM;
Object.defineProperty(piece,'positionM',{configurable:true,enumerable:true,
 get(){reads++;return position;}});
h.electricalMassRevision++;
const motion=movingMassElements(h,{deployment:.51,attitude:{wingPitchDeg:12}});
assert(motion.length>0);
assert(!motion.some(part=>part.kind==='cableInstallationHardware'||part.kind==='workerOptics'));
assert.equal(reads,0,'Motion-only evaluation does not even read fixed material geometry');

const first=cableInstallationMassElements(h),firstOptics=workerOpticsMassElements(opticalHardware);
assert(reads>0,'Full mass evaluation includes the actual installed material');
const mass=componentMassProperties(h),inertia=componentInertia(h);
reads=0;
for(let i=0;i<12;i++){
 const options={deployment:i/11,attitude:{wingPitchDeg:i*3,upperRadiatorPitchDeg:i}};
 assert.equal(cableInstallationMassElements(h,options.deployment,options.attitude),first);
 assert.equal(workerOpticsMassElements(opticalHardware,options.deployment,options.attitude),firstOptics);
 assert.deepEqual(cableInstallationMassElements(h,options.deployment,options.attitude,{movingOnly:true}),[]);
 assert.deepEqual(workerOpticsMassElements(opticalHardware,options.deployment,options.attitude,{movingOnly:true}),[]);
 movingMassElements(h,options);
 const pose=componentInertia(h,options);
 assert.equal(pose.massKg,inertia.massKg);
}
assert.equal(reads,0,'Repeated inertial poses reuse fixed material geometry');

// A real nested geometry change becomes visible when its mass revision changes.
// The full cache, grouped stations and per-piece tensors must all be invalidated.
const originalCenter=[...first[0].centroidM],offset=.21;
position[0]+=offset;h.electricalMassRevision++;
const changed=cableInstallationMassElements(h);
assert.notEqual(changed,first);
assert.equal(changed[0].centroidM[0],originalCenter[0]+offset);
assert.deepEqual(first[0].centroidM,originalCenter,'Prior returned centroids remain stable');
const revisedMass=componentMassProperties(h),revisedInertia=componentInertia(h);
assert.equal(revisedMass.massKg,mass.massKg,'A translation changes moments, not mass');
assert.notDeepEqual(revisedMass.cm,mass.cm,'Revised material reaches the vehicle centroid');
assert.notDeepEqual(revisedInertia.tensorKgM2,inertia.tensorKgM2,'Revised material reaches the vehicle tensor');

// Replacing an adopted schedule also invalidates fixed geometry independently
// of the version, including replacement of the worker-module placement list.
const schedule=h.cableInstallationHardware;
h.cableInstallationHardware=structuredClone(schedule);
h.cableInstallationHardware.parts[0].pieces[0].positionM[0]+=.07;
assert.equal(cableInstallationMassElements(h)[0].centroidM[0],changed[0].centroidM[0]+.07);
const optics=opticalHardware.serviceArchitecture.fabric.workerOptics;
optics.placements=structuredClone(optics.placements);
optics.placements[0].positionM[1]+=.13;
assert.equal(workerOpticsMassElements(opticalHardware)[0].centroidM[1],firstOptics[0].centroidM[1]+.13);

// Redwire has real payload-frame material. Its mass must retain both fixed and
// moving elements, and the movement-only path must preserve those articulated
// elements and their order at every selected deployment pose.
const redwire=sizeDesign(buildReferenceDesign('redwire-8kw'));
const movingOptics={...redwire,serviceArchitecture:{fabric:{workerOptics:{...opticalFixture,massKg:.8,
 placements:[...opticalFixture.placements,{...opticalFixture.placements[0],id:'moving-module',frame:'payload'}]}}}};
const payloadPoses=[];
for(const deployment of [0,.37,1]){
 const attitude={upperRadiatorPitchDeg:deployment*23},all=cableInstallationMassElements(redwire,deployment,attitude),
  moving=cableInstallationMassElements(redwire,deployment,attitude,{movingOnly:true}),
  optics=workerOpticsMassElements(movingOptics,deployment,attitude);
 assert(moving.length>0&&all.length>moving.length);
 assert.deepEqual(moving,all.filter(part=>part.moving));
 assert.deepEqual(workerOpticsMassElements(movingOptics,deployment,attitude,{movingOnly:true}),optics.filter(part=>part.moving));
 payloadPoses.push(moving.map(part=>part.centroidM));
}
assert.notDeepEqual(payloadPoses[0],payloadPoses.at(-1),'Payload material follows the full deployment');
console.log('Installed material inertia retains fixed/moving frames, complete mass, revision invalidation and body-geometry reuse.');
