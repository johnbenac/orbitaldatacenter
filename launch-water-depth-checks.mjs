// Regression for alternating opaque terrain triangles showing through a water
// overlay when a very large landscape was projected into Float32 depth.
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {softRenderer} from './dist/software-scene.js';
import {canvas} from './render-test-canvas.mjs';

globalThis.document={createElement:()=>canvas()};
let totalSamples=0;
for(const {zoom,fixedNear} of [{zoom:1,fixedNear:.07},{zoom:1},{zoom:.25},{zoom:10}]){
 const output=canvas(),renderer=softRenderer(output);renderer.setSize(480,320);
 const scene=new T.Scene();
 const floorGeometry=new T.PlaneGeometry(24000,24000,104,104);floorGeometry.rotateX(-Math.PI/2);
 scene.add(new T.Mesh(floorGeometry,new T.MeshBasicMaterial({color:'#203040'})));
 const waterGeometry=new T.PlaneGeometry(24000,24000,1,1);waterGeometry.rotateX(-Math.PI/2);
 const water=new T.Mesh(waterGeometry,new T.MeshBasicMaterial({color:'#a0b0c0',transparent:true,opacity:.9,depthWrite:false}));water.position.y=.12;scene.add(water);
 const camera=new T.PerspectiveCamera(34,1.5,.07,60000);camera.position.set(-2200/zoom,2300/zoom,3500/zoom);
 camera.near=fixedNear??Math.max(.07,camera.position.length()*.01);camera.updateProjectionMatrix();camera.lookAt(0,0,0);
 renderer.render(scene,camera);let leaks=0,samples=0;const image=output.frame.data;
 for(let y=20;y<300;y++)for(let x=20;x<460;x++){
  const p=4*(y*480+x);if(image[p+3]<255)continue;samples++;
  if(image[p]===32&&image[p+1]===48&&image[p+2]===64)leaks++;
 }
 assert.equal(leaks,0,'Terrain triangles leaked through water at zoom '+zoom+' / near '+camera.near);totalSamples+=samples;
 // Place the tower above the water surface so depth-tested foreground
 // occlusion is tested independently of an intentional waterline crossing.
 const tower=new T.Mesh(new T.BoxGeometry(30,120,30),new T.MeshBasicMaterial({color:'#e64b33'}));tower.position.y=61;scene.add(tower);
 water.visible=false;renderer.render(scene,camera);const foreground=[];
 for(let p=0;p<output.frame.data.length;p+=4)if(output.frame.data[p]===230&&output.frame.data[p+1]===75&&output.frame.data[p+2]===51)foreground.push(p);
 assert(foreground.length,'The near plane clipped the foreground tower');water.visible=true;renderer.render(scene,camera);
 for(const p of foreground)assert.deepEqual(Array.from(output.frame.data.slice(p,p+3)),[230,75,51],'Water incorrectly covered foreground hardware');
 renderer.dispose();scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
}
console.log(`24 km landscape / 0.12 m water separation: zero terrain leaks across ${totalSamples} interior pixels; foreground occlusion preserved at minimum and maximum finite zoom, with original and scaled ground near planes.`);
