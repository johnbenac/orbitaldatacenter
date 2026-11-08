import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {softRenderer} from './dist/software-scene.js';
import {canvas} from './render-test-canvas.mjs';
globalThis.document={createElement:()=>canvas()};
const output=canvas(),renderer=softRenderer(output),size=192;renderer.setSize(size,size);
const scene=new T.Scene(),camera=new T.OrthographicCamera(-1.5,1.5,1.5,-1.5,.1,100);camera.position.z=5;camera.lookAt(0,0,0);camera.updateProjectionMatrix();
const material=new T.MeshBasicMaterial({color:'#8de0dd',side:T.DoubleSide,toneMapped:false}),coarse=new T.PlaneGeometry(2,2),fine=new T.PlaneGeometry(2,2,8,8),mesh=new T.Mesh(coarse,material);scene.add(mesh);
function render(cam=camera){renderer.render(scene,cam);return Uint8ClampedArray.from(output.frame.data);}
const cyan=pixels=>{let n=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>80&&pixels[i+1]>170&&pixels[i+2]>170&&pixels[i+3]>0)n++;return n;};
const filled=render(),filledCount=cyan(filled);material.wireframe=true;const low=render(),lowCount=cyan(low);
assert(lowCount>100&&lowCount<filledCount*.2,'wireframe draws sparse triangle edges rather than a solid silhouette');
mesh.geometry=fine;const high=render(),highCount=cyan(high);assert(highCount>lowCount*2,'the high-polygon surface exposes additional actual triangle edges');assert(highCount<filledCount*.6,'high detail still leaves triangle interiors open');
material.wireframe=false;assert.deepEqual(render(),filled,'filled material rendering remains unchanged by tessellation and wireframe toggling');material.wireframe=true;

// Solid foreground hardware must occlude wire edges in either traversal order.
const wall=new T.Mesh(new T.PlaneGeometry(2.5,2.5),new T.MeshBasicMaterial({color:'#1040b0',side:T.DoubleSide,toneMapped:false}));wall.position.z=.3;
scene.remove(mesh);scene.add(wall,mesh);assert.equal(cyan(render()),0,'existing surface depth occludes later wire edges');scene.remove(wall);scene.add(wall);assert.equal(cyan(render()),0,'nearer surfaces also cover earlier wire edges');
scene.remove(mesh);scene.add(mesh);material.depthTest=false;assert(cyan(render())>100,'the occlusion check contains otherwise visible edges');material.depthTest=true;scene.remove(wall);

// A near or extreme zoom can project a long edge far outside the viewport.
// Clipping before stepping must preserve every visible segment without scanning
// thousands of invisible screen coordinates or painting the triangle interior.
const huge=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute([-2000,0,0,2000,0,0,0,2000,0],3));mesh.geometry=huge;const hugeCount=cyan(render());assert(hugeCount>size*.65&&hugeCount<size*3,'extreme projected edges are clipped to visible pixels');
const crossing=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute([-.8,-.6,-2,.8,-.6,-2,0,.8,.2],3));mesh.geometry=crossing;
const perspective=new T.PerspectiveCamera(45,1,.1,100);perspective.lookAt(0,0,-1);perspective.updateProjectionMatrix();const clipped=cyan(render(perspective));assert(clipped>40&&clipped<size*size*.25,'near-plane clipping preserves bounded wire edges');
renderer.dispose();for(const g of [coarse,fine,huge,crossing,wall.geometry])g.dispose();material.dispose();wall.material.dispose();
console.log('Software wireframe: sparse triangle edges, high/low tessellation, unchanged solid materials, depth occlusion, near-plane and viewport clipping passed.');
