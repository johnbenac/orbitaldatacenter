// Verify the fallback keeps the new geographic/livery texture contracts.
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {softRenderer} from './dist/software-scene.js';
import {mountLaunchDecal} from './dist/launch-livery.js';
import {canvas} from './render-test-canvas.mjs';
globalThis.document={createElement:()=>canvas()};
const output=canvas(),renderer=softRenderer(output);renderer.setSize(32,32);
const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,50);camera.position.z=2;camera.lookAt(0,0,0);camera.updateProjectionMatrix();
const source=canvas();source.width=source.height=2;
const pixels={width:2,height:2,data:new Uint8ClampedArray([255,0,0,255,0,0,255,255,255,0,0,255,0,0,255,255])};source.getContext('2d').putImageData(pixels);
const map=new T.CanvasTexture(source);map.colorSpace=T.SRGBColorSpace;map.magFilter=T.NearestFilter;map.wrapS=T.RepeatWrapping;map.repeat.x=2;
const material=new T.MeshBasicMaterial({map,side:T.DoubleSide,toneMapped:false});
const plane=new T.Mesh(new T.PlaneGeometry(2,2),material);scene.add(plane);
const pixel=(x=16,y=16)=>Array.from(output.frame.data.slice((y*32+x)*4,(y*32+x)*4+4));
renderer.render(scene,camera);
assert(pixel(3)[0]>240&&pixel(11)[2]>240&&pixel(19)[0]>240&&pixel(27)[2]>240,'Repeated textures retain UV wrapping');

// A late-loaded provider mark changes a CanvasTexture in place.
pixels.data.set([0,255,0,255],0);pixels.data.set([0,255,0,255],8);map.needsUpdate=true;
renderer.render(scene,camera);assert(pixel(3)[1]>240&&pixel(3)[0]<10,'CanvasTexture version invalidates cached pixels');

// Vegetation uses an opaque draw call with cutout alpha and vertex tint.
const behind=new T.Mesh(new T.PlaneGeometry(2,2),new T.MeshBasicMaterial({color:'#ff00ff',toneMapped:false}));behind.position.z=-.1;scene.add(behind);
pixels.data.fill(255);pixels.data[7]=pixels.data[15]=0;map.needsUpdate=true;material.alphaTest=.45;material.vertexColors=true;
plane.geometry.setAttribute('color',new T.Float32BufferAttribute(Array.from({length:4},()=>[0,1,0]).flat(),3));
renderer.render(scene,camera);assert(pixel(3)[1]>240&&pixel(3)[0]<10,'Vegetation vertex tint is retained');
assert(pixel(11)[0]>240&&pixel(11)[2]>240&&pixel(11)[1]<10,'Cutout leaves reveal the scene behind them');

// Terrain converges into atmospheric color instead of ending as a hard card.
scene.remove(behind);material.map=null;material.vertexColors=false;material.color.set('#ff0000');
const perspective=new T.PerspectiveCamera(40,1,.1,100);perspective.position.set(0,0,12);perspective.lookAt(0,0,0);perspective.updateProjectionMatrix();
scene.fog=new T.Fog('#aabbcc',3,7);renderer.render(scene,perspective);
assert.deepEqual(pixel().slice(0,3),[170,187,204],'Ground fog matches the renderer background color');

// Sky direction is tied to the camera rather than a fixed CSS photograph.
scene.remove(plane);scene.fog=null;
const sky=canvas();sky.width=4;sky.height=2;const skyData={width:4,height:2,data:new Uint8ClampedArray(32)};
for(let y=0;y<2;y++)for(let x=0;x<4;x++)skyData.data.set(x<2?[30,80,140,255]:[200,215,225,255],4*(y*4+x));
sky.getContext('2d').putImageData(skyData);scene.background=new T.CanvasTexture(sky);scene.background.mapping=T.EquirectangularReflectionMapping;
perspective.position.set(0,0,0);perspective.lookAt(0,0,-1);renderer.render(scene,perspective);const first=pixel();
perspective.lookAt(0,0,1);renderer.render(scene,perspective);assert.notDeepEqual(pixel(),first,'Panoramic sky rotates with the camera');
renderer.dispose();map.dispose();scene.background.dispose();plane.geometry.dispose();material.dispose();behind.geometry.dispose();behind.material.dispose();

// The launch camera spans a regional landscape, while printed markings sit
// only 4 mm above the hull. Quantized depth must not erase that ink at normal
// inspection distances. Exercise the real curved-decal geometry and compare
// against its unobstructed coverage, without assuming a particular pixel count.
const decalOutput=canvas(),decalRenderer=softRenderer(decalOutput);decalRenderer.setSize(768,445);
const decalScene=new T.Scene(),decalCamera=new T.PerspectiveCamera(34,768/445,.07,60000);
const hull=new T.Mesh(new T.CylinderGeometry(4,4,40,80),new T.MeshBasicMaterial({color:'#ffffff'}));decalScene.add(hull);
const ink=new T.MeshBasicMaterial({color:'#ff0000',transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
const mark=mountLaunchDecal(decalScene,[[4,-20],[4,20]],{y:0,width:3,height:15,azimuth:.74,material:ink});
const wall=new T.Mesh(new T.PlaneGeometry(10,30),new T.MeshBasicMaterial({color:'#0033ff'}));
wall.position.set(12*Math.sin(.46),0,12*Math.cos(.46));wall.rotation.y=.46;wall.visible=false;decalScene.add(wall);
function inkPixels(){
 decalRenderer.render(decalScene,decalCamera);let count=0;const p=decalOutput.frame.data;
 for(let i=0;i<p.length;i+=4)if(p[i]>120&&p[i+1]<60&&p[i+2]<60)count++;
 return count;
}
for(const distance of [150,300,600]){
 decalCamera.position.set(distance*Math.sin(.46),8,distance*Math.cos(.46));decalCamera.lookAt(0,0,0);
 ink.depthTest=false;wall.visible=false;const unobstructed=inkPixels();assert(unobstructed>35,`The ${distance} m decal reference must be visible`);
 ink.depthTest=true;const visible=inkPixels();assert(visible>=unobstructed*.97,`${distance} m hull decal retained only ${visible}/${unobstructed} pixels`);
 // A real foreground structure must still obscure the ink. Rendering the
 // marking as an unconditional overlay would pass the coverage check above.
 wall.visible=true;assert.equal(inkPixels(),0,`${distance} m foreground wall must occlude the hull decal`);
 ink.depthTest=false;assert(inkPixels()>=unobstructed*.97,'The foreground check must contain an otherwise visible marking');
}
decalRenderer.dispose();for(const o of [hull,mark,wall]){o.geometry.dispose();o.material.dispose();}
console.log('Launch rendering: texture repeats, late image updates, cutout alpha, vertex tint, distance fog, panoramic sky and depth-tested hull markings passed.');
