import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {softRenderer} from './dist/software-scene.js';
import {canvas} from './render-test-canvas.mjs';

globalThis.document={createElement:()=>canvas()};
const output=canvas(),renderer=softRenderer(output),size=256;
renderer.setSize(size,size);
const scene=new T.Scene(),camera=new T.OrthographicCamera(-1.5,1.5,1.5,-1.5,.1,100);
camera.position.z=5;camera.lookAt(0,0,0);camera.updateProjectionMatrix();
const material=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.2,depthWrite:false,side:T.DoubleSide,toneMapped:false});
const coarse=new T.PlaneGeometry(2,2),fine=new T.PlaneGeometry(2,2,8,8),pane=new T.Mesh(coarse,material);
scene.add(pane);
function render(cam=camera){renderer.render(scene,cam);return Uint8ClampedArray.from(output.frame.data);}
function occupied(frame){let count=0;for(let i=3;i<frame.length;i+=4)if(frame[i])count++;return count;}
function uniformCoverage(frame,label){
 let count=0;
 for(let i=3;i<frame.length;i+=4)if(frame[i]){count++;assert.equal(frame[i],51,label+': one pane must contribute exactly one 20%-opacity layer, including its shared edges');}
 assert(count>1000,label+': the pane is visibly in frame');
 return count;
}

// The two triangles in a single pane must not expose their diagonal through
// duplicate blending. Tessellation also must not change its opacity or fill.
const original=render();uniformCoverage(original,'coarse pane');
pane.geometry=fine;assert.deepEqual(render(),original,'subdividing a flat pane does not create extra translucent seams or missing pixels');
pane.rotation.z=.37;uniformCoverage(render(),'rotated pane');
pane.rotation.y=.63;uniformCoverage(render(),'tilted pane');
pane.scale.x=-1;uniformCoverage(render(),'reflected translucent pane');
pane.rotation.set(0,0,0);pane.scale.x=1;pane.geometry=coarse;

// A translucent near-clipped quad is triangulated after clipping. Its new fan
// edge must have exactly the same single-layer coverage as an ordinary pane.
const nearGeometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute([-.8,-.6,-2,.8,-.6,-2,0,.8,.2],3));
const perspective=new T.PerspectiveCamera(45,1,.1,100);perspective.lookAt(0,0,-1);perspective.updateProjectionMatrix();
pane.geometry=nearGeometry;uniformCoverage(render(perspective),'near-clipped translucent triangle');
pane.geometry=coarse;

// A negative scale is a reflection of the object, not a request to invert its
// material side. This matches WebGL's determinant-based front-face selection.
material.transparent=false;material.opacity=1;material.depthWrite=true;material.side=T.FrontSide;
const front=render();assert(occupied(front)>20000,'front-facing reference pane is visible');
pane.scale.x=-1;assert.deepEqual(render(),front,'mirroring the object preserves its visible front face');
pane.scale.x=1;const group=new T.Group();scene.remove(pane);group.add(pane);scene.add(group);group.scale.y=-1;
assert.deepEqual(render(),front,'a reflected ancestor also preserves front-face selection');
material.side=T.BackSide;assert.equal(occupied(render()),0,'a reflected front face does not incorrectly become BackSide');
material.side=T.DoubleSide;assert.deepEqual(render(),front,'DoubleSide remains visible through a reflected ancestor');
scene.remove(group);

// A two-sided physical surface must face its lighting normal toward the
// rendered side, exactly as Three's normal_fragment_begin shader does.
// Rotating the camera and its inspection light together gives the same image.
const litMaterial=new T.MeshStandardMaterial({color:0xffffff,side:T.DoubleSide}),litPane=new T.Mesh(coarse,litMaterial);
scene.add(litPane);scene.userData.exposureEV=0;
function lightFromSide(sign){
 camera.position.z=sign*5;camera.lookAt(0,0,0);camera.updateProjectionMatrix();
 scene.userData.lightState={ambient:0,direct:1,rim:0,sun:new T.Vector3(0,0,sign)};
 return render();
}
const litFront=lightFromSide(1),litBack=lightFromSide(-1),middle=(128*size+128)*4;
assert(litFront[middle]>200,'front face is strongly lit by its inspection light');
assert.deepEqual(litBack,litFront,'turning a DoubleSide surface and light together does not create a black back face');
litMaterial.side=T.BackSide;assert.deepEqual(lightFromSide(-1),litFront,'BackSide lighting also uses the reversed normal');
assert.equal(occupied(lightFromSide(1)),0,'BackSide material still culls its front face');
litMaterial.side=T.DoubleSide;litMaterial.metalness=.7;litMaterial.userData.materialId='raster-test-metal';
assert.deepEqual(lightFromSide(-1),lightFromSide(1),'metallic vertex-lighting approximation preserves front/back symmetry');
scene.remove(litPane);delete scene.userData.exposureEV;delete scene.userData.lightState;camera.position.z=5;camera.lookAt(0,0,0);

// A native line/grid edge that crosses the eye plane must keep the segment
// between the near plane and the viewport; reversing its endpoints is neutral.
const lineMaterial=new T.LineBasicMaterial({color:0xffffff,toneMapped:false}),lineGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(-.3,0,-1),new T.Vector3(.3,0,.3)]);
const line=new T.Line(lineGeometry,lineMaterial);scene.add(line);
const cross=render(perspective),linePixels=occupied(cross);assert(linePixels>100&&linePixels<size*3,'line crossing behind the eye retains a bounded visible segment');
lineGeometry.setFromPoints([new T.Vector3(.3,0,.3),new T.Vector3(-.3,0,-1)]);assert.deepEqual(render(perspective),cross,'line clipping is independent of endpoint order');
lineGeometry.setFromPoints([new T.Vector3(-.3,0,.2),new T.Vector3(.3,0,.3)]);assert.equal(occupied(render(perspective)),0,'line entirely behind the near plane is clipped');
lineGeometry.setFromPoints([new T.Vector3(-.3,0,-.05),new T.Vector3(.3,0,-.05)]);assert.equal(occupied(render(perspective)),0,'line entirely in front of the near plane is clipped');

renderer.dispose();for(const geometry of [coarse,fine,nearGeometry,lineGeometry])geometry.dispose();material.dispose();litMaterial.dispose();lineMaterial.dispose();
console.log(JSON.stringify({passed:true,checks:['single translucent edge coverage','tessellation invariance','rotation and reflection','near-clipped translucent fan','negative-scale front/back sides','two-sided physical lighting','eye-crossing line clipping'],visiblePanePixels:occupied(front),visibleClippedLinePixels:linePixels},null,2));
