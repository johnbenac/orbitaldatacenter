import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {createConnectorBoreDatums} from './dist/connector-bore-datums.js';
import {obstacleFromMesh,routeClearance,routeFromTube,auditRoutes,auditSweptRoutes} from './dist/routing-audit.js';
import {connectionTube,connectionAnchor} from './dist/connection-geometry.js';
import {routingContactBox} from './dist/routing-frame.js';

const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const close=(a,b,label)=>assert.ok(distance(a,b)<1e-12,label);
let poses=0;
for(const normal of[[0,0,1],[1,0,0],[-1,0,0],[0,1,0]]){
 const root=new T.Group(),frame=new T.Group(),plug=new T.Group(),exit=new T.Object3D();
 root.position.set(.43,-.27,.61);root.rotation.set(.23,-.44,.71);
 frame.position.set(.11,.07,-.13);frame.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...normal));root.add(frame);
 const fixed=new T.Mesh(new T.BoxGeometry(.08,.08,.08)),moving=new T.Mesh(new T.BoxGeometry(.06,.06,.04));
 frame.add(fixed,plug);plug.add(moving,exit);exit.position.set(.006,-.004,0);root.updateWorldMatrix(true,true);
 const bore=createConnectorBoreDatums(),scope='test-circuit',initialExit=exit.getWorldPosition(new T.Vector3()).toArray(),fixedLocal=fixed.worldToLocal(new T.Vector3(...initialExit)),movingLocal=moving.worldToLocal(new T.Vector3(...initialExit));
 close(bore(fixed,scope,exit),initialExit,'Initial fixed bore is the installed cable datum');close(bore(moving,scope,exit),initialExit,'Initial plug bore is the installed cable datum');
 for(const withdrawal of[0,.0225,.045]){
  plug.position.z=withdrawal;root.updateWorldMatrix(true,true);
  close(bore(fixed,scope,exit),fixed.localToWorld(fixedLocal.clone()).toArray(),'Fixed shell bore cannot follow withdrawn exit');
  close(bore(moving,scope,exit),moving.localToWorld(movingLocal.clone()).toArray(),'Moving plug bore follows its own actual shell');
  if(withdrawal)assert.ok(distance(bore(fixed,scope,exit),exit.getWorldPosition(new T.Vector3()).toArray())>withdrawal*.999,'A live-exit aperture would measurably corrupt the fixed datum');
  root.position.x+=.017;root.rotation.y+=.09;root.updateWorldMatrix(true,true);
  close(bore(fixed,scope,exit),fixed.localToWorld(fixedLocal.clone()).toArray(),'Fixed bore follows shared rigid-body motion');
  close(bore(moving,scope,exit),moving.localToWorld(movingLocal.clone()).toArray(),'Plug bore follows shared rigid-body motion and its withdrawal');poses++;
 }
}

// A scoped opening on an actual finite box stays at its physical installed
// throat. A cable through a different part of the same wall remains blocked.
const wall=new T.Mesh(new T.BoxGeometry(.30,.30,.04)),plug=new T.Group(),exit=new T.Object3D();plug.add(exit);const root=new T.Group();root.add(wall,plug);root.updateWorldMatrix(true,true);
const bore=createConnectorBoreDatums(),point=bore(wall,'circuit',exit),aperture={id:'fixed-bore',routeIds:['circuit'],min:point.map((v,i)=>v-(i===2?.06:.025)),max:point.map((v,i)=>v+(i===2?.06:.025))},solid={...obstacleFromMesh(wall,{id:'actual-receptacle'}),apertures:[aperture]};
assert.equal(routeClearance({id:'circuit',points:[[0,0,-.10],[0,0,.10]],radiusM:.006},[solid]).ok,true,'Installed cable clears its finite scoped throat');
assert.equal(routeClearance({id:'circuit',points:[[.06,0,-.10],[.06,0,.10]],radiusM:.006},[solid]).ok,false,'Same circuit cannot use a remote point on its own shell');
assert.equal(routeClearance({id:'foreign-circuit',points:[[0,0,-.10],[0,0,.10]],radiusM:.006},[solid]).ok,false,'Another circuit cannot inherit the scoped throat');
plug.position.z=.045;root.updateWorldMatrix(true,true);close(bore(wall,'circuit',exit),point,'Normal withdrawal leaves the finite physical throat unchanged');
wall.position.x=NaN;assert.throws(()=>bore(wall,'circuit',exit),/Nonfinite transformed connector bore datum/);

// This is the actual protected-fluid stator/port dimensional arrangement.
// Its tube, stator and finite throat share one pitch frame. A world-axis cube
// changes the allowed contact shape during that common rotation and creates
// a false nonzero relative-clearance change; the physical local OBB must not.
const pitch=new T.Group(),stator=new T.Mesh(new T.CylinderGeometry(.19,.19,.14,32));
stator.rotation.x=Math.PI/2;stator.position.z=-.14;pitch.add(stator);
const fluidPort=connectionAnchor(pitch,[-.13,.15,-.18],[0,1,0]),fluidTube=connectionTube(pitch,{radius:.018,bendRadiusM:.108,segments:96}),fluidId='rigid-fluid-stator-regression';
fluidTube.update([[-.13,.55,-.18],[-.13,.15,-.18]]);
function rigidFluidSnapshot(t,oldWorldCube=false){
 pitch.rotation.x=-.08168141379180768*t;pitch.updateWorldMatrix(true,true);
 const route=routeFromTube(fluidTube,{id:fluidId,minBendRadiusM:.108}),aperture=routingContactBox(fluidPort,{id:'actual-stator-throat',routeIds:[fluidId],halfSizeM:.0416});
 if(oldWorldCube){aperture.min=aperture.center.map(x=>x-.0416);aperture.max=aperture.center.map(x=>x+.0416);delete aperture.axes;delete aperture.center;delete aperture.halfSize;}
 return {routes:[route],obstacles:[obstacleFromMesh(stator,{id:'actual-stator',apertures:[aperture]})]};
}
const rigidClearances=[0,.5,1].map(t=>{const s=rigidFluidSnapshot(t);return auditRoutes(s.routes,s.obstacles,{collectMotionPairs:true,pairMotionBound:()=>0,selfCollision:false}).motionPairs[0].lowerM;});
assert(Math.max(...rigidClearances)-Math.min(...rigidClearances)<1e-12,'A shared rigid fluid pair must retain its exact physical throat clearance');
const sweepOptions={start:0,end:1,motionBound:()=>.2,motionBoundBasis:'The tube and stator fit inside a 0.7 m sphere about their shared origin. The entire interval rotates by less than 0.082 rad; twice radius times angle is below 0.2 m. Relative motion is exactly zero only because tube, stator and physical local throat share that frame.',pairMotionBound:()=>0,auditOptions:{selfCollision:false},maxDepth:4};
assert.equal(auditSweptRoutes({...sweepOptions,sample:t=>rigidFluidSnapshot(t)}).ok,true,'The actual local throat supports the zero relative-motion certificate');
assert(auditSweptRoutes({...sweepOptions,sample:t=>rigidFluidSnapshot(t,true)}).issues.some(i=>i.code==='understated-pair-motion-bound'),'Replacing a rotating physical throat with a world-axis cube must fail the same certificate');
console.log(JSON.stringify({ok:true,transformPoses:poses,finiteThroatChecks:3,nonfiniteCorruptionChecks:1,rigidFluidContactPoses:3,worldCubeCorruptionChecks:1}));
