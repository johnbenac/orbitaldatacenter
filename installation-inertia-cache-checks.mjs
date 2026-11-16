// A flight step must not reconstruct body-fixed cable hardware for every pose.
// Check the material schedule, frame behavior and revision boundary directly;
// elapsed-time limits would vary with the host running the regression suite.
import assert from 'node:assert/strict';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {componentMassProperties,componentCentroid} from './dist/component-stations.js';
import {componentInertia,movingMassElements} from './dist/attitude-inertia.js';
import {cableInstallationMassElements,cableInstallationMassGroups,workerOpticsMassElements} from './dist/cable-installation-mass.js';
import {deploymentLayout,mechanismPose,leafAxes} from './dist/deployment.js';

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

// Star Catcher combines thousands of fixed support pieces with four real solar
// rotors. A new flat array for each pose must not defeat the downstream station,
// grouping and intrinsic-tensor caches of the much larger fixed installation.
const star=sizeDesign(buildReferenceDesign('star-catcher-self-powered'));
assert(star.cableInstallationHardware.parts.every(part=>part.frame==='body'));
const sourceCount=star.cableInstallationHardware.parts.reduce((n,part)=>n+part.pieces.length,0),
 movingCount=star.cableInstallationHardware.parts.reduce((n,part)=>n+part.pieces.filter(piece=>piece.motion).length,0);
assert(sourceCount>4500,'Exercise the complete Star material schedule');
assert.equal(movingCount,100,'All four collector rotors remain articulated');
star.electricalMassRevision++;
const initialGroups=cableInstallationMassGroups(star),fixedElements=[...initialGroups.values()].flatMap(group=>group.fixed);
assert.equal(fixedElements.length,sourceCount-movingCount);
const expectedOrder=star.cableInstallationHardware.parts.flatMap(part=>part.pieces.map(piece=>part.id+':'+piece.id));
assert.deepEqual(cableInstallationMassElements(star).map(part=>part.id),expectedOrder,
 'The public flat API preserves every physical piece and its original order');

// Watch the adopted fixed elements, not just the source schedule. The old
// fresh-array behavior reused source geometry but reread these values to group
// every piece, rebuild its station and rotate its tensor at every flight step.
const access={group:0,geometry:0},descriptors=[];
for(const part of fixedElements)for(const key of ['partId','centroidM','axes','dimensionsM','intrinsicTensorPerKg']){
 const descriptor=Object.getOwnPropertyDescriptor(part,key),value=part[key];
 descriptors.push({part,key,descriptor});
 Object.defineProperty(part,key,{configurable:true,enumerable:true,get(){access[key==='partId'?'group':'geometry']++;return value;}});
}
componentMassProperties(star);componentInertia(star);
assert(access.geometry>0,'The initial fixed-group calculation includes actual material geometry');
access.group=0;access.geometry=0;
const starPoses=Array.from({length:9},(_,i)=>({deployment:i/8,
 attitude:{wingPitchDeg:-57+i*14,upperRadiatorPitchDeg:i*2.5,lowerRadiatorPitchDeg:-i*1.5}}));
for(const pose of starPoses){
 const groups=cableInstallationMassGroups(star,pose.deployment,pose.attitude);
 for(const [id,initial]of initialGroups){
  assert.equal(groups.get(id).fixed,initial.fixed,'Fixed material arrays survive changing poses');
  assert.equal(groups.get(id).order,initial.order,'Original piece-order mapping is adopted once');
  if(!initial.moving.length)assert.equal(groups.get(id),initial,'A wholly fixed group is reused');
 }
 componentMassProperties(star,star.propellantKg,pose.deployment,false,true,pose.attitude);
 componentInertia(star,pose);
 movingMassElements(star,pose);
}
assert.deepEqual(access,{group:0,geometry:0},
 'Distinct uncached poses do no fixed-piece regrouping, station or tensor reconstruction');
for(const {part,key,descriptor}of descriptors){
 if(descriptor)Object.defineProperty(part,key,descriptor);else delete part[key];
}

const near=(actual,expected,label)=>assert(Math.abs(actual-expected)<=1e-10+1e-12*Math.abs(expected),
 label+': '+actual+' != '+expected);
const nearArray=(actual,expected,label)=>{assert.equal(actual.length,expected.length,label);actual.forEach((value,i)=>near(value,expected[i],label+' ['+i+']'));};
const rotate=(point,axes)=>[0,1,2].map(axis=>point.reduce((sum,value,k)=>sum+value*axes[k][axis],0));
const shiftTensor=(mass,p)=>Array.from({length:9},(_,k)=>{
 const i=Math.floor(k/3),j=k%3;return mass*((i===j?p.reduce((sum,value)=>sum+value*value,0):0)-p[i]*p[j]);
});
const addTensor=(target,source)=>source.forEach((value,i)=>{target[i]+=value;});

// Independent material integration reads the normalized source schedule. It
// does not use the grouped station/tensor caches being tested. Rotation and
// the parallel-axis theorem preserve each box/annular sector's full tensor.
function expectedStarMaterial(pose){
 const wings=mechanismPose(deploymentLayout(star),pose.deployment,star.input.solarTiltDeg,pose.attitude).wings;
 return star.cableInstallationHardware.parts.flatMap(part=>part.pieces.map(piece=>{
  let centroidM=[...piece.positionM],axes=piece.axes;
  if(piece.motion){
   const wing=wings[piece.motion.wingInstance],origin=piece.motion.originM,frame=wing.axes||leafAxes({pitch:wing.pitch});
   nearArray(wing.root,origin,'Rotor root remains its physical installation datum');
   centroidM=rotate(centroidM.map((value,i)=>value-origin[i]),frame).map((value,i)=>value+origin[i]);
   axes=axes.map(axis=>rotate(axis,frame));
  }
  const intrinsic=piece.intrinsicTensorPerKg||Array.from({length:9},(_,k)=>k%4?0:
   piece.dimensionsM.reduce((sum,dimension,i)=>sum+(i===k/4?0:dimension*dimension),0)/12);
  const massKg=piece.massKg*(1+star.input.structureMargin),tensor=Array.from({length:9},(_,k)=>{
   const i=Math.floor(k/3),j=k%3;let value=0;
   for(let a=0;a<3;a++)for(let b=0;b<3;b++)value+=axes[a][i]*intrinsic[3*a+b]*axes[b][j];
   return massKg*value;
  });
  return {id:part.id+':'+piece.id,partId:part.id,wbs:part.wbs,centroidM,axes,massKg,
   equipmentKg:piece.massKg,intrinsicTensorKgM2:tensor,moving:!!piece.motion};
 }));
}
const movingCenters=[],installationTensors=[];
for(const pose of starPoses){
 const expected=expectedStarMaterial(pose),actual=cableInstallationMassElements(star,pose.deployment,pose.attitude),
  mass=componentMassProperties(star,star.propellantKg,pose.deployment,false,true,pose.attitude),
  inertia=componentInertia(star,pose),moving=movingMassElements(star,pose).filter(part=>part.kind==='cableInstallationHardware');
 assert.deepEqual(actual.map(part=>part.id),expected.map(part=>part.id));
 assert.deepEqual(moving.map(part=>part.id),expected.filter(part=>part.moving).map(part=>part.id));
 assert.equal(new Set(actual.map(part=>part.id)).size,sourceCount,'No fixed or rotor material is duplicated');
 actual.forEach((part,i)=>{
  nearArray(part.centroidM,expected[i].centroidM,'Posed material centroid '+part.id);
  nearArray(part.axes.flat(),expected[i].axes.flat(),'Posed material axes '+part.id);
 });
 const expectedMoving=new Map(expected.filter(part=>part.moving).map(part=>[part.id,part]));
 for(const part of moving){
  const reference=expectedMoving.get(part.id);
  near(part.massKg,reference.massKg,'Rotor mass '+part.id);
  nearArray(part.intrinsicTensorKgM2,reference.intrinsicTensorKgM2,'Rotor tensor '+part.id);
 }
 const aboutOrigin=Array(9).fill(0);
 for(const definition of star.cableInstallationHardware.parts){
  const pieces=expected.filter(part=>part.partId===definition.id),row=mass.rows.find(row=>row.installationPartId===definition.id),
   contribution=inertia.contributions.find(row=>row.wbs===definition.wbs),total=pieces.reduce((sum,part)=>sum+part.massKg,0),
   center=[0,1,2].map(axis=>pieces.reduce((sum,part)=>sum+part.massKg*part.centroidM[axis],0)/total),tensor=Array(9).fill(0);
  assert(row&&contribution,'Every installed assembly has one mass and inertia contribution');
  near(row.massKg,definition.massKg,'Equipment mass '+definition.id);
  near(row.predictedKg,total,'Growth-scaled mass '+definition.id);
  nearArray(row.centroidM,center,'Assembly centroid '+definition.id);
  nearArray(contribution.centroidM,center,'Inertia assembly centroid '+definition.id);
  for(const piece of pieces){
   addTensor(tensor,piece.intrinsicTensorKgM2);
   addTensor(tensor,shiftTensor(piece.massKg,piece.centroidM.map((value,i)=>value-inertia.cm[i])));
   addTensor(aboutOrigin,piece.intrinsicTensorKgM2);addTensor(aboutOrigin,shiftTensor(piece.massKg,piece.centroidM));
  }
  nearArray(contribution.tensorKgM2,tensor,'Complete installation tensor '+definition.id);
 }
 nearArray(inertia.cm,mass.cm,'Vehicle mass/inertia centroid parity');
 assert.equal(inertia.massKg,mass.massKg,'No material mass disappears during pose evaluation');
 movingCenters.push(moving.map(part=>part.centroidM));installationTensors.push(aboutOrigin);
}
assert.notDeepEqual(movingCenters[0],movingCenters.at(-1),'Rotor centroids really move');
assert.notDeepEqual(installationTensors[0],installationTensors.at(-1),
 'The articulated installation changes the actual tensor, not just displayed metadata');

// Translate one genuinely fixed material piece. Its analytically known change
// in first and second moments must reach every high-level cache at the SAME
// pose. Replacement without a revision and nested mutation with a revision are
// both supported adoption boundaries; previously returned results stay intact.
const fixedDefinition=star.cableInstallationHardware.parts.find(part=>part.pieces.some(piece=>!piece.motion)),
 fixedPieceId=fixedDefinition.pieces.find(piece=>!piece.motion).id;
function translatedPiece(axis,offset,replace){
 const before=componentInertia(star),beforeCm=[...componentCentroid(star,star.propellantKg)],
  oldGroups=cableInstallationMassGroups(star),oldFixed=oldGroups.get(fixedDefinition.id).fixed,
  oldElement=oldFixed.find(piece=>piece.id===fixedDefinition.id+':'+fixedPieceId),oldCenter=[...oldElement.centroidM];
 if(replace==='hardware')star.cableInstallationHardware=structuredClone(star.cableInstallationHardware);
 if(replace==='parts')star.cableInstallationHardware.parts=structuredClone(star.cableInstallationHardware.parts);
 const source=star.cableInstallationHardware.parts.find(part=>part.id===fixedDefinition.id).pieces.find(piece=>piece.id===fixedPieceId),
  oldPosition=[...source.positionM],massKg=source.massKg*(1+star.input.structureMargin);
 source.positionM[axis]+=offset;if(!replace)star.electricalMassRevision++;
 const after=componentInertia(star),properties=componentMassProperties(star),center=componentCentroid(star,star.propellantKg),
  expectedCenter=beforeCm.map((value,i)=>value+(i===axis?massKg*offset/before.massKg:0));
 assert.notEqual(after,before,'A real installation change invalidates the recent-pose result');
 assert.notEqual(cableInstallationMassGroups(star).get(fixedDefinition.id).fixed,oldFixed,
  'A changed schedule invalidates fixed groups');
 nearArray(oldElement.centroidM,oldCenter,'Earlier returned material remains stable');
 assert.equal(after.massKg,before.massKg,'Moving one piece changes moments, not mass');
 nearArray(after.cm,expectedCenter,'Revised full-vehicle centroid');
 nearArray(properties.cm,expectedCenter,'Revised station-cache centroid');
 nearArray(center,expectedCenter,'Revised interpolated centroid cache');
 const expectedTensor=[...before.tensorKgM2];
 addTensor(expectedTensor,shiftTensor(before.massKg,beforeCm));
 addTensor(expectedTensor,shiftTensor(massKg,oldPosition).map(value=>-value));
 addTensor(expectedTensor,shiftTensor(massKg,source.positionM));
 addTensor(expectedTensor,shiftTensor(after.massKg,expectedCenter).map(value=>-value));
 nearArray(after.tensorKgM2,expectedTensor,'Revised full-vehicle tensor');
 assert.notDeepEqual(after.tensorKgM2,before.tensorKgM2,'The changed physical station influences inertia');
}
translatedPiece(0,.027,null);
translatedPiece(1,.019,'hardware');
translatedPiece(2,-.011,'parts');
console.log('Installed inertia: SpaceX/Redwire frames and Star '+(sourceCount-movingCount)+' fixed + '+movingCount+
 ' moving pieces; nine distinct poses, independent full material tensors, zero repeated fixed work, and all revision/replacement caches pass.');
