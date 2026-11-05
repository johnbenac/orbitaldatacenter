import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {makeLaunch} from './dist/launch-scene.js';
import {bayWorkAreaPoints,fitBayWorkArea} from './dist/scene.js';
import {sizeDesign,defaults,applyPreset} from './dist/design.js';
import {launchFleet} from './dist/launch-fleet.js';
import {canvas} from './render-test-canvas.mjs';
globalThis.document={createElement:canvas};
const V=(...v)=>new T.Vector3(...v),slope=Math.tan(17*Math.PI/180);
let cases=0;
for(const id of Object.keys(launchFleet)){
 const h=sizeDesign(applyPreset(defaults,'launcher',id)),launch=makeLaunch(h);
 for(const [domain,t] of [['launch',-3599],['launcher',-1880],['conops',-601]]){
  launch.update({t,flightPhase:'integration',altitudeKm:0},'integration',{phase:'D',domain});
  launch.root.updateMatrixWorld(true);
  const points=bayWorkAreaPoints(launch,h),parts=launch.parts,bay=launch.bay,sample=[];
  // Check independently against physical outer meshes and active equipment.
  function corners(mesh){
   if(!mesh.isMesh||mesh.material.map&&mesh.geometry.type==='PlaneGeometry')return;
   mesh.geometry.computeBoundingBox();const {min,max}=mesh.geometry.boundingBox;
   for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])
    sample.push(V(x,y,z).applyMatrix4(mesh.matrixWorld));
  }
  parts.shell.traverseVisible(corners);bay.station.traverseVisible(corners);
  for(const item of parts.facility.children)if(item.name==='Fairing half carrier'||item.name==='Adapter bearing plate')item.traverseVisible(corners);
  sample.push(V(0,h.stowedLengthM,0),bay.equipmentAnchor.getWorldPosition(V()),bay.portAnchor.getWorldPosition(V()));
  for(const aspect of [.62,1.47,2.4])for(const [az,el] of [[.4,.29],[-1.15,.72],[2.7,.12],[.4,-1.1],[-1.15,-.72],[2.7,-.22]]){
   const camera=new T.PerspectiveCamera(34,aspect,.07,2100),dir=V(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el));
   const look=V(),half=fitBayWorkArea(points,dir,aspect,look,bay.floorY+.35);
   camera.position.copy(look).addScaledVector(dir,half/slope);
   assert.ok(camera.position.y>=bay.floorY+.35-1e-6,'Work area eye must be above the actual floor stop');
   camera.lookAt(look);camera.updateMatrixWorld();
   let extentX=0,extentY=0;
   for(const p of sample){
    const ndc=p.clone().project(camera);
    assert.ok(ndc.z>0&&ndc.z<1);
    extentX=Math.max(extentX,Math.abs(ndc.x));extentY=Math.max(extentY,Math.abs(ndc.y));
   }
   assert.ok(extentX<.915&&extentY<.86,`${id} ${domain} at ${aspect} clips the inspected work area: ${extentX} × ${extentY}`);
   assert.ok(Math.max(extentX,extentY)>.51,`${id} leaves the assembly too small`);
   cases++;
  }
 }
}
console.log(`Full enclosure, stowed payload, stand and cart stay framed in ${cases} launcher/station/angle/aspect combinations.`);
