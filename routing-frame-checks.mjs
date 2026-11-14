import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {connectionAnchor,connectionTube,anchorInFrame,normalInFrame} from './dist/connection-geometry.js';
import {routingMatrix,obstacleFromMesh,routeFromTube,auditRoutes,createRoutingStationaryCertificate,auditSweptRoutes} from './dist/routing-audit.js';
import {routingContactBox} from './dist/routing-frame.js';
import {createConnectorBoreDatums} from './dist/connector-bore-datums.js';
import {flightFluidSnapshot} from './dist/flight-fluid-routing.js';
import {flightRoutingSnapshot,auditFlightRoutingSnapshot} from './dist/flight-routing-registry.js';
import {addGroundTube,groundConnectionRecords} from './dist/ground-connection-routing.js';
import {createOperationalRoutingEnvelopes,verifyOperationalEnvelopeContainment} from './dist/routing-operational-envelopes.js';
import {positionLiveCraft} from './dist/launch-craft-placement.js';
import {launchClockFor} from './dist/launch-effects-state.js';
import {DEPLOY_START_S} from './dist/commissioning-clock.js';
import {routingCraftCatalog} from './dist/routing-configurations.js';
import {aiPurposes} from './dist/ai-purpose.js';
import {referenceConfigurationMetadata} from './dist/reference-configurations.js';

const material=new T.MeshBasicMaterial(),V=p=>new T.Vector3(...p),near=(a,b,tolerance=1e-11)=>assert(Math.max(...a.map((x,i)=>Math.abs(x-b[i])))<tolerance,JSON.stringify({a,b}));
const common=new T.Group(),root=new T.Group();common.add(root);root.userData.routingMotion={kind:'rigid',frameId:'body',attachment:'body'};
const source=new T.Mesh(new T.BoxGeometry(.002,.10,.10),material),target=source.clone();source.position.x=-.8;target.position.x=.8;root.add(source,target);
const a=connectionAnchor(root,[-.8,0,0],[1,0,0]),b=connectionAnchor(root,[.8,0,0],[-1,0,0]);a.userData.routingOwnerId=source.uuid;b.userData.routingOwnerId=target.uuid;
const tube=connectionTube(root,{radius:.006,bendRadiusM:.08,material,name:'Frame-regression physical fluid line'});tube.update([[-.8,0,0],[.8,0,0]]);tube.mesh.userData.fluidConnectionId='frame-fluid';
const connection={id:'frame-fluid',name:'Frame fixture',tube,a,b,parent:root,radiusM:.006,bendRadiusM:.08};
const fluid=()=>flightFluidSnapshot(root,[connection],{frame:root}),before=fluid();assert(before.sectionValidation.ok);const initialAudit=auditRoutes(before.routes,before.obstacles);assert(initialAudit.ok,JSON.stringify(initialAudit.issues));
const groundRoot=new T.Group();root.add(groundRoot);groundRoot.position.z=.4;
addGroundTube(groundRoot,{id:'frame-ground',points:[[-.8,0,0],[.8,0,0]],radiusM:.004,bendRadiusM:.04,material});
const groundBefore=groundConnectionRecords(groundRoot,{frame:root});
const bore=createConnectorBoreDatums(),boreBefore=bore.contactBox(source,'frame-fluid',a,{halfSizeM:.02,frame:root});
const anchorBefore=anchorInFrame(a,root).toArray(),normalBefore=normalInFrame(a,root).toArray();
for(let i=0;i<17;i++){
 common.position.set(100.125*i,-14.6*i,80-i);common.rotation.set(.1*i,.071*i,-.13*i);root.position.set(.31,-.27,.15);root.rotation.set(.2,-.4,.7);common.updateMatrixWorld(true);
 const after=fluid();assert.deepEqual(after.routes,before.routes);assert.deepEqual(after.obstacles.filter(o=>o.id===source.uuid||o.id===target.uuid),before.obstacles);
 assert.deepEqual(groundConnectionRecords(groundRoot,{frame:root}),groundBefore);assert.deepEqual(bore.contactBox(source,'frame-fluid',a,{halfSizeM:.02,frame:root}),boreBefore);
 assert.deepEqual(anchorInFrame(a,root).toArray(),anchorBefore);assert.deepEqual(normalInFrame(a,root).toArray(),normalBefore);
 const world=routeFromTube(tube,{id:'world',from:a,to:b});near(world.points[0],V(before.routes[0].points[0]).applyMatrix4(root.matrixWorld).toArray(),1e-9);
 const sibling=new T.Group();sibling.position.set(-2,.7,1);common.add(sibling);const actual=routingMatrix(source,sibling),oracle=sibling.matrixWorld.clone().invert().multiply(source.matrixWorld);sibling.updateWorldMatrix(true,false);near(actual.elements,sibling.matrixWorld.clone().invert().multiply(source.matrixWorld).elements);common.remove(sibling);
}
// The registry forwards the requested frame through both real snapshot APIs.
let electricalFrame=null,fluidFrame=null;
const factory={root,electrical:{architecture:{harnesses:[]},routing:{lines:[],snapshot(options){electricalFrame=options.frame;return {routes:[],obstacles:[]};}}},fluidRoutingSnapshot(options){fluidFrame=options.frame;return flightFluidSnapshot(root,[connection],options);}};
const combined=flightRoutingSnapshot(factory,{frame:root});assert.equal(electricalFrame,root);assert.equal(fluidFrame,root);assert(auditFlightRoutingSnapshot(combined).ok);
// Unrelated wall material still participates after conversion to body space.
const hiddenWall=new T.Mesh(new T.BoxGeometry(.002,1,1),material);hiddenWall.visible=false;root.add(hiddenWall);assert(!auditFlightRoutingSnapshot(flightRoutingSnapshot(factory,{frame:root})).ok);root.remove(hiddenWall);
const baseline=flightRoutingSnapshot(factory,{frame:root}),token=createRoutingStationaryCertificate(baseline);assert(token.ok,JSON.stringify(token.issues));
const sweep=auditSweptRoutes({start:0,end:1,sample:t=>{common.position.set(t*9000,-t*70,t*20);common.rotation.set(t*.8,t*2.1,-t*.5);common.updateMatrixWorld(true);return flightRoutingSnapshot(factory,{frame:root});},motionBound:()=>0,motionBoundBasis:'Only a shared outer rigid coordinate transform changes; the actual local installation is fixed.',stationaryCertificate:token.certificate,stationaryMotionBound:()=>0,stationaryMotionBasis:'Exact common-ancestor extraction retains every local buffer, connector, physical solid and inventory.'});assert(sweep.ok,JSON.stringify(sweep.issues));
const raw=tube.mesh.geometry.attributes.position,saved=raw.getY(40);raw.setY(40,saved+.20);const corrupted=flightRoutingSnapshot(factory,{frame:root});assert(!auditFlightRoutingSnapshot(corrupted).ok);raw.setY(40,saved);
root.scale.x=2;assert.throws(()=>fluid(),/rigid and metre-preserving/);root.scale.x=1;

// A rotated throat is its exact oriented box, never the extra space in the
// corners of its world AABB. Scope remains one named circuit and one solid.
const port=new T.Object3D();port.rotation.z=Math.PI/4;port.updateMatrixWorld(true);
const aperture=routingContactBox(port,{id:'rotated-throat',routeIds:['lead'],halfSizeM:[.1,.02,.08]}),wall={id:'wall',type:'box',min:[-1,-1,-.02],max:[1,1,.02],apertures:[aperture]},line=(x,y,id='lead')=>({id,points:[[x,y,-1],[x,y,1]],radiusM:.005});
assert(auditRoutes([line(.05,.05)],[wall]).ok);assert(!auditRoutes([line(.07,-.07)],[wall]).ok);assert(!auditRoutes([line(.05,.05,'foreign')],[wall]).ok);
assert(!auditRoutes([line(.05,.05)],[wall,{id:'unrelated-wall',type:'box',min:[-.2,-.2,.3],max:[.2,.2,.31]}]).ok);
for(const invalid of [{...aperture,axes:[[1,0,0],[1,0,0],[0,0,1]]},{...aperture,halfSize:[.1,NaN,.08]},{...aperture,center:[Infinity,0,0]}])assert(!auditRoutes([line(.05,.05)],[{...wall,apertures:[invalid]}]).ok);
const throatSweep=auditSweptRoutes({sample:t=>({routes:[line(.05,.05+.06*Math.sin(2*Math.PI*t))],obstacles:[wall]}),motionBound:(a,b)=>.06*2*Math.PI*(b-a)/2,motionBoundBasis:'The complete sinusoidal transverse speed is at most 0.12*pi metres per normalized time.'});assert(!throatSweep.ok,'A moving lead must not leave a rotated local throat between clear endpoint poses.');

// All-angle envelopes use the requested frame for both proof construction
// and the independent actual-buffer containment check.
const envelopeRoot=new T.Group(),cmgMount=new T.Group(),gimbal=new T.Group(),spin=new T.Group();common.add(envelopeRoot);envelopeRoot.add(cmgMount);cmgMount.position.set(1,.8,-.5);cmgMount.add(gimbal);gimbal.add(spin);spin.add(new T.Mesh(new T.BoxGeometry(.2,.3,.4),material));
const envelopeFactory={root:envelopeRoot,cmgs:[{index:0,gimbal,spin}],terminalGimbals:[]},envelopeBefore=createOperationalRoutingEnvelopes(envelopeFactory,{frame:envelopeRoot});assert(envelopeBefore.ok);
common.rotation.set(-.71,.38,1.2);common.position.set(1000,-42,83);common.updateMatrixWorld(true);const envelopeAfter=createOperationalRoutingEnvelopes(envelopeFactory,{frame:envelopeRoot});assert.deepEqual(envelopeAfter.obstacles,envelopeBefore.obstacles);assert(verifyOperationalEnvelopeContainment(envelopeFactory,envelopeBefore,{frame:envelopeRoot}).ok);

// Preserve the exact viewport placement, including the camera handoff and
// preexisting visibility/compatibility choices, in the extracted helper.
const launcherRoot=new T.Group(),mount=new T.Group();launcherRoot.add(mount);mount.position.set(1.2,8,-.6);mount.rotation.set(-Math.PI/2,.2,.1);launcherRoot.position.set(-3,2,4);launcherRoot.rotation.z=.35;
for(const launcher of ['glenn','starship'])for(const flightPhase of ['integration','pad','ascent','insertion'])for(const t of [-3000,0,600,700,899,900]){
 const launch={root:launcherRoot,parts:{liveMount:mount}},hardware={input:{launcher}},state={flightPhase,t},launchFrame={center:new T.Vector3(3,4,5),half:20,directCraft:false,reference:false,cargoHeld:false},expected=new T.Group(),actual=new T.Group();launcherRoot.updateMatrixWorld(true);mount.getWorldPosition(expected.position);mount.getWorldQuaternion(expected.quaternion);let f=0;if(flightPhase==='insertion'&&launcher!=='starship'){const clear=launchClockFor(launcher).releaseClear,k=Math.max(0,Math.min(1,(t-clear)/(DEPLOY_START_S-clear)));f=k*k*(3-2*k);expected.position.multiplyScalar(1-f);expected.quaternion.slerp(new T.Quaternion(),f);}
 const result=positionLiveCraft(actual,{launch,launchFrame,state,hardware,fitHalfHeight:7});assert.deepEqual(actual.position.toArray(),expected.position.toArray());assert.deepEqual(actual.quaternion.toArray(),expected.quaternion.toArray());assert.equal(result.handoffFraction,f);near(launchFrame.center.toArray(),[3*(1-f),4*(1-f),5*(1-f)]);assert.equal(launchFrame.half,20+f*(7-20));
}
for(const key of ['reference','cargoHeld']){const group=new T.Group(),launchFrame={center:new T.Vector3(),half:2,[key]:true};positionLiveCraft(group,{launch:{root:launcherRoot,parts:{liveMount:mount}},launchFrame,state:{flightPhase:'integration',t:-3000},hardware:{input:{launcher:'glenn'}}});assert.equal(group.visible,false);}
const catalog=routingCraftCatalog();assert.equal(catalog.length,Object.keys(aiPurposes).length+Object.keys(referenceConfigurationMetadata).length);assert.equal(catalog.filter(r=>r.id==='protected-core'&&r.purpose==='text').length,1);assert.equal(new Set(catalog.map(r=>r.id)).size,catalog.length);
console.log('Routing frames: actual tube/solid/port/ground buffers invariant across 17 arbitrary rigid placements; all-angle envelope containment, silent corruption, rotated-throat exclusions and between-pose exit, 48 viewport placement cases, and '+catalog.length+' complete shipped inputs passed.');
