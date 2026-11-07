import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {EARTH_DETAIL as D,earthDetailSource,planEarthDetail,createEarthDetail,sampleEarthDetail} from './dist/earth-detail.js';
import {createEarthAppearance,createEarthObserverAppearance} from './dist/earth-appearance.js';

const mesh=new T.Object3D(),camera=new T.PerspectiveCamera(49,1.685,.0001,30);
camera.position.set(1.086,0,0);camera.lookAt(0,0,0);camera.updateMatrixWorld();
const viewport={width:1348,height:800},ray=new T.Vector3(),point=new T.Vector3(),inverse=new T.Matrix4(),eye=new T.Vector3();
function visiblePixels(camera,mesh,radius=1,step=.1){
 mesh.updateWorldMatrix(true,false);camera.updateWorldMatrix(true,false);inverse.copy(mesh.matrixWorld).invert();
 eye.copy(camera.position).applyMatrix4(inverse);const samples=[];
 for(let y=-1;y<1.0001;y+=step)for(let x=-1;x<1.0001;x+=step){
  point.set(x,y,0).unproject(camera).applyMatrix4(inverse);ray.subVectors(point,eye).normalize();
  const b=eye.dot(ray),disc=b*b-eye.lengthSq()+radius*radius;if(disc<0)continue;
  const t=-b-Math.sqrt(disc);if(t<0)continue;
  point.copy(eye).addScaledVector(ray,t).normalize();
  samples.push({x,y,u:(.5+Math.atan2(-point.z,point.x)/(2*Math.PI)+1)%1,v:.5-Math.asin(point.y)/Math.PI});
 }
 return samples;
}
function contains(page,sample){return Math.floor(sample.u*D.columns*2**page.level)===page.col&&Math.floor(Math.min(1-1e-12,sample.v)*D.rows*2**page.level)===page.row;}

// Real native source geometry, including independent cloud LOD and parent edge.
assert.deepEqual(earthDetailSource('night',{level:4,col:159,row:79}),{
 key:'night-80k/39/19',url:'./vendor/earth-detail/night-80k/c39-r19.webp',col:39,row:19,level:4,x:1540,y:1540,size:512
});
assert.equal(earthDetailSource('day',{level:3,col:1,row:1}).size,1024);
assert.equal(earthDetailSource('clouds',{level:3,col:1,row:1}).size,512);
assert.equal(earthDetailSource('day',{level:3,col:1,row:1}).url,'./vendor/earth-detail/day-80k/c0-r0.avif');
assert.equal(earthDetailSource('clouds',{level:3,col:1,row:1}).url,'./vendor/earth-detail/clouds-40k/c0-r0.avif');
assert.equal(earthDetailSource('day',{level:1,col:15,row:9}).url,'./vendor/earth-detail/day-20k/c7-r4.avif');
assert.equal(earthDetailSource('clouds',{level:1,col:15,row:9}).url,'./vendor/earth-detail/clouds-20k/c7-r4.avif');
assert.equal(earthDetailSource('night',{level:0,col:7,row:4}).size,2048);
assert.equal(earthDetailSource('night',{level:1,col:15,row:9}).x,1028);
assert.equal(earthDetailSource('night',{level:2,col:31,row:19}).x,1540);

// Full viewport coverage, including the nearest lower edge, broad horizons,
// dateline, a tilted observer, a rotating Earth, and a fullscreen resize.
for(const rotation of [0,Math.PI-.001,.63])for(const tilt of [0,35,65]){
 mesh.rotation.y=rotation;camera.lookAt(1.086-Math.cos(tilt*Math.PI/180),Math.sin(tilt*Math.PI/180),0);camera.updateMatrixWorld();
 const plan=planEarthDetail(camera,mesh,{...viewport,maxPages:49});
 assert.ok(plan.pages.length<=49);
 const samples=visiblePixels(camera,mesh);assert.ok(samples.length>0);
 for(const sample of samples)assert.ok(plan.pages.some(page=>contains(page,sample)),`No selected page at rotation ${rotation}, tilt ${tilt}, pixel ${sample.x},${sample.y}`);
 if(tilt===0)for(const sample of samples)assert.equal(plan.pages.find(page=>contains(page,sample)).level,4,'A fullscreen nadir footprint resolves at native 80K detail');
}
mesh.rotation.y=0;camera.lookAt(0,0,0);camera.updateMatrixWorld();
const small=planEarthDetail(camera,mesh,{width:600,height:300,maxPages:49});
const full=planEarthDetail(camera,mesh,{width:1709,height:868,maxPages:49});
assert.ok(full.pages.reduce((n,p)=>n+p.level,0)>small.pages.reduce((n,p)=>n+p.level,0),'Screen-space demand increases when the viewer is expanded');

const requests=[],released=[];let changed=0;
function loadParent(source,done,fail){
 const item={source,done,fail,cancelled:false,completed:false};requests.push(item);
 return ()=>{item.cancelled=true;};
}
function complete(item){
 if(item.completed)return;item.completed=true;
 item.done({source:item.source,image:{tagName:'FAKE'},release:()=>released.push(item.source.key)});
}
function extractPage(record,source,page,layer){
 assert.equal(record.source.key,source.key);
 const data=new Uint8Array(D.pitch*D.pitch*4);
 for(let p=0;p<data.length;p+=4){data[p]=64+layer*24;data[p+1]=128;data[p+2]=192;data[p+3]=255;}
 return data;
}
const manager=createEarthDetail({maxTextureSize:2048,parentLimit:2,loadParent,extractPage,onReady:()=>changed++});
assert.equal(manager.state.allocated,false,'No atlas is allocated before a close observer appears');
manager.prepare(camera,mesh,{width:760,height:330});
assert.equal(manager.state.atlasGrid,3);assert.equal(manager.state.atlasSize,1560);assert.equal(manager.state.pageBudget,9);
assert.ok(requests.length<=3,'Parent image transfers are bounded');
assert.equal(manager.state.completedPages,0,'Coarse or pending imagery is not reported as completed native regions');
let rounds=0;
while(manager.state.loading&&rounds++<100){
 for(const item of [...requests])if(!item.cancelled&&!item.completed)complete(item);
 manager.prepare(camera,mesh,{width:760,height:330});
}
assert.ok(rounds<100,'All desired native windows settle without parent-cache thrash');
assert.equal(manager.state.loading,false);assert.ok(manager.state.readyPages>0);assert.ok(manager.state.loadedParents<=2);
assert.equal(manager.state.completedPages,manager.state.requestedPages,'Every exact requested LOD is complete after settlement');
const out=new Float64Array(3),toLinear=byte=>{const x=byte/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;};
for(const sample of visiblePixels(camera,mesh))for(const [layer,index] of D.layers.map((layer,index)=>[layer,index])){
 assert.equal(sampleEarthDetail(manager.state,layer,sample.u,sample.v,out),true,`Ready ${layer} detail covers the entire viewport`);
 assert.ok(Math.abs(out[0]-(index===2?(64+index*24)/255:toLinear(64+index*24)))<1e-6);
}
const stableRequests=requests.length,stableVersion=manager.state.version;
for(let i=0;i<8;i++)manager.prepare(camera,mesh,{width:760,height:330});
assert.equal(requests.length,stableRequests,'Normal redraws reuse atlas pages even after their parents leave the decode cache');
assert.equal(manager.state.version,stableVersion,'Stable maps retain the software-renderer frame cache');

camera.lookAt(3,0,0);camera.updateMatrixWorld();manager.prepare(camera,mesh,{width:760,height:330});
assert.equal(manager.state.requestedPages,0);assert.equal(manager.state.completedPages,0,'An empty Earth footprint has zero completed regions');
camera.lookAt(0,0,0);camera.updateMatrixWorld();

mesh.rotation.y=Math.PI;manager.prepare(camera,mesh,viewport);
const obsolete=requests.filter(item=>!item.cancelled&&!item.completed);
mesh.rotation.y=.7;manager.prepare(camera,mesh,viewport);
assert.ok(obsolete.every(item=>item.cancelled),'An unrelated hemisphere cancels pending parent transfers');
const versionBeforeLate=manager.state.version;
for(const item of obsolete)complete(item);
assert.equal(manager.state.version,versionBeforeLate,'Late callbacks cannot publish unrelated imagery');
const pendingAtDispose=requests.filter(item=>!item.cancelled&&!item.completed);
manager.dispose();const afterDispose=changed;
for(const item of pendingAtDispose)complete(item);
assert.equal(changed,afterDispose);assert.equal(manager.state.disposed,true);
assert.equal(sampleEarthDetail(manager.state,'day',.5,.5,out),false);
assert.ok(pendingAtDispose.every(item=>item.cancelled));

// Unsupported/corrupt regional imagery retains global fallback and terminates
// the loading state. Do not request guessed alternative-format filenames or
// retry a decode failure indefinitely on an otherwise usable viewer.
const failures=[];
const failedManager=createEarthDetail({maxTextureSize:2048,maxPages:9,loadParent(source,done,fail){
 const record={url:source.url,fail,failed:false};failures.push(record);return ()=>{};
},extractPage(){throw new Error('An undecoded image cannot enter an atlas');}});
failedManager.prepare(camera,mesh,{width:760,height:330});let failureRounds=0;
while(failedManager.state.loading&&failureRounds++<100){
 for(const record of [...failures])if(!record.failed){record.failed=true;record.fail();}
 failedManager.prepare(camera,mesh,{width:760,height:330});
}
assert.ok(failures.length>0);assert.ok(failureRounds<100);
assert.equal(failedManager.state.loading,false);assert.equal(failedManager.state.pendingCount,0);
assert.equal(failedManager.state.completedPages,0);assert.equal(failedManager.state.readyPages,0);
assert.equal(sampleEarthDetail(failedManager.state,'day',.5,.5,out),false,'Decode failures retain global imagery');
assert.equal(new Set(failures.map(record=>record.url)).size,failures.length,'Failed regional images are neither retried nor replaced with guessed formats');
const failedCount=failures.length;failedManager.prepare(camera,mesh,{width:760,height:330});assert.equal(failures.length,failedCount);
failedManager.dispose();

// The new pass starts the same global maps without touching the globe's legacy
// detail selection, state, geometry ownership, shader or local-Sun uniforms.
const images=[];
globalThis.document={createElementNS:()=>{const img={tagName:'IMG',addEventListener(){},removeEventListener(){},set src(value){this.url=value;}};images.push(img);return img;}};
const base=createEarthAppearance({gpu:false});const originalShader=base.surface.material.fragmentShader;
const observer=createEarthObserverAppearance({base,gpu:false,detailOptions:{maxPages:9,loadParent,extractPage}});
assert.equal(observer.surface.geometry,base.surface.geometry);
assert.notEqual(observer.surface.material,base.surface.material);
assert.equal(observer.surface.material.fragmentShader.match(/uniform sampler2D /g).length,8,'Observer surface stays within the minimum fragment-sampler budget');
observer.prepare(camera,observer.surface,{width:760,height:330});
assert.equal(images.length,5,'Observer starts only global maps, not the old four day tiles');
assert.ok(images.every(image=>!image.url.includes('day-16k')));
assert.equal(base.surface.material.fragmentShader,originalShader);
assert.deepEqual(base.state.details,[null,null,null,null]);
let geometryDisposed=false;base.surface.geometry.addEventListener('dispose',()=>geometryDisposed=true);
observer.dispose();assert.equal(geometryDisposed,false,'Observer disposal does not release shared globe geometry');
base.dispose();assert.equal(geometryDisposed,true);
console.log('Observer Earth: native parent mapping, complete viewport LOD, resize demand, rotated/dateline registration, bounded atlas/decode ownership, progressive parents, CPU sample transfer, stable caching, cancellation and unchanged globe isolation passed.');
