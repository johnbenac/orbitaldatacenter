// Verify packaged geographic evidence, geographic registration and lifecycle
// behavior. No network services or browser/GPU are needed for these checks.
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import * as T from './dist/vendor/three.module.js';
import {launchSites} from './dist/launch-sites.js';
import {geographyForSite} from './dist/launch-geography.js';
import {buildLaunchEnvironment,geographicUV,localGeography,sampleElevation,civilSurfaceMaterial} from './dist/launch-environment.js';
import {canvas} from './render-test-canvas.mjs';
import {readJsonResponse} from './dist/json-asset.js';

const dist=resolve('dist'),assets=new Set(),aerialDetails=new Set(),regionHashes=new Map(),grids=new Map();
function localFile(url){
 assert.equal(typeof url,'string');assert(!/^https?:/i.test(url),'Displayed geography must be bundled, not a third-party runtime dependency.');
 const path=resolve(dist,url.replace(/^\.\//,'').replace(/^\//,''));assert(path.startsWith(dist+'/assets/launch-sites/'));assert(statSync(path).size>0);return path;
}
function imageSize(bytes){
 if(bytes.subarray(1,4).toString()==='PNG')return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
 if(bytes[0]===0xff&&bytes[1]===0xd8){
  let at=2;
  while(at<bytes.length){while(bytes[at]===0xff)at++;const marker=bytes[at++];if(marker===0xd9||marker===0xda)break;if(marker===0x01||marker>=0xd0&&marker<=0xd8)continue;
   const n=bytes.readUInt16BE(at);if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return [bytes.readUInt16BE(at+5),bytes.readUInt16BE(at+3)];at+=n;
  }
 }
 if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'){
  const type=bytes.subarray(12,16).toString();
  if(type==='VP8X')return [1+bytes.readUIntLE(24,3),1+bytes.readUIntLE(27,3)];
  if(type==='VP8 ')return [bytes.readUInt16LE(26)&16383,bytes.readUInt16LE(28)&16383];
  if(type==='VP8L'){const b=bytes.readUInt32LE(21);return [(b&16383)+1,((b>>>14)&16383)+1];}
 }
 throw Error('Unsupported or invalid geographic image');
}
function validBounds(b){assert.equal(b.length,4);assert(b.every(Number.isFinite));assert(b[0]<b[2]&&b[1]<b[3]);assert(b[0]>=-180&&b[2]<=180&&b[1]>=-90&&b[3]<=90);}
function contains(b,lon,lat){return lon>=b[0]&&lon<=b[2]&&lat>=b[1]&&lat<=b[3];}
function checkImage(image,bounds){
 assert(image?.url&&image.attribution&&image.sourceUrl&&image.license,'Imagery must retain provenance and reuse terms.');
 assert(image.resolutionM>0,'Display sampling must be declared.');validBounds(bounds);
 const path=localFile(image.url);if(!assets.has(path)){
  const bytes=readFileSync(path);assert.deepEqual(imageSize(bytes),[image.width,image.height],path+' dimensions differ from provenance');assert(image.width>=512&&image.height>=512);assets.add(path);
 }
 return createHash('sha256').update(readFileSync(path)).digest('hex');
}

for(const site of Object.values(launchSites)){
 const g=geographyForSite(site.id);assert(g,site.id+' missing geographic assignment');validBounds(g.bounds);assert(contains(g.bounds,site.lon,site.lat),site.id+' pin outside geographic raster');
 const hash=checkImage(g.image,g.bounds);regionHashes.set(g.id,hash);
 if(g.id==='wenchang'){
  assert.equal(g.detail,null,'Do not present resampled 10 m satellite imagery as new close detail.');assert.equal(g.image.nativeResolutionM,10);
  assert.match(g.image.qualityLabel,/10 m satellite/);assert.match(g.image.qualityNote,/10 m.*does not create submeter/);
 }else if(g.id==='kourou'){
  assert(g.detail,'Kourou needs the actual satellite context patch where public aerial imagery is blurred.');assert.equal(g.detail.image.nativeResolutionM,10);assert.deepEqual([g.detail.image.width,g.detail.image.height],[512,512]);
  assert.match(g.detail.image.qualityLabel,/10 m satellite/);assert.match(g.detail.image.qualityNote,/IGN.*blurred/);assert.match(g.detail.image.effectiveDetail,/10 m native/);
  assert.match(g.image.qualityLabel,/blurred/);assert.match(g.image.qualityNote,/nominal.*does not describe the visible detail/);
 }else{
  assert(g.detail,site.id+' missing planned close-area aerial patch');assert(g.detail.image.resolutionM<=1,site.id+' aerial display sampling exceeds one metre');assert(g.detail.image.nativeResolutionM<=1,site.id+' aerial source cannot support claimed close detail');
  assert.deepEqual([g.detail.image.width,g.detail.image.height],[4096,4096]);aerialDetails.add(g.detail.image.url);
 }
 if(g.detail){checkImage(g.detail.image,g.detail.bounds);assert(contains(g.detail.bounds,site.lon,site.lat),site.id+' outside detailed image');}
 if(g.waterMask?.url){const path=localFile(g.waterMask.url);assert.deepEqual(imageSize(readFileSync(path)),[g.waterMask.width,g.waterMask.height]);validBounds(g.waterMask.bounds);assert(g.waterMask.attribution&&g.waterMask.license);}
 assert(g.elevation?.url&&g.elevation.attribution,site.id+' missing elevation provenance');
 const path=localFile(g.elevation.url),grid=await readJsonResponse(new Response(readFileSync(path)),g.elevation.url);validBounds(grid.bounds);
 assert(grid.width>16&&grid.height>16);assert.equal(grid.values.length,grid.width*grid.height);assert(grid.values.every(Number.isFinite));assert(grid.values.every(v=>v>=-440&&v<9000));assert(contains(grid.bounds,site.lon,site.lat));
 assert.equal(grid.width,g.elevation.width);assert.equal(grid.height,g.elevation.height);grids.set(g.id,grid);
 if(g.features?.url){const features=await readJsonResponse(new Response(readFileSync(localFile(g.features.url))),g.features.url);assert.equal(features.type,'FeatureCollection');assert(Array.isArray(features.features));assert(g.features.attribution&&g.features.license);}
 const map=localGeography(site),east=map.point(site.lon+.001,site.lat),north=map.point(site.lon,site.lat+.001);
 assert(east[0]>80&&east[0]<112&&Math.abs(east[1])<1e-8,site.id+' east registration');assert(north[1]<-111&&north[1]>-112&&Math.abs(north[0])<1e-8,site.id+' north registration');
 const projected=map.coordinate(...map.point(site.lon+.013,site.lat-.009));assert(Math.abs(projected[0]-site.lon-.013)<1e-11);assert(Math.abs(projected[1]-site.lat+.009)<1e-11);
 assert.deepEqual(geographicUV(g.bounds[0],g.bounds[1],g.bounds),[0,0]);assert.deepEqual(geographicUV(g.bounds[2],g.bounds[3],g.bounds),[1,1]);
}
assert.equal(regionHashes.size,6,'Expected six distinct geographic environments.');
assert.equal(aerialDetails.size,9,'Expected nine actual 4K U.S. aerial patches, independently of the two 10 m satellite environments.');
assert.equal(new Set(regionHashes.values()).size,regionHashes.size,'A regional image was reused for a geographically different site.');
const california=grids.get('vandenberg'),relief=california.values.reduce((a,n)=>[Math.min(a[0],n),Math.max(a[1],n)],[Infinity,-Infinity]);assert(relief[1]-relief[0]>150,'Vandenberg must preserve its actual coastal relief.');

// A known artificial elevation ramp makes north/south reversal and datum
// mistakes visible independently of any provider dataset.
const ramp={width:2,height:2,bounds:[10,20,12,22],values:[100,200,300,400]};
assert.equal(sampleElevation(ramp,10,22),100);assert.equal(sampleElevation(ramp,12,20),400);assert.equal(sampleElevation(ramp,11,21),250);assert.equal(sampleElevation(ramp,10,21),200);
assert(geographicUV(0,60,[-1,0,1,80],'EPSG:3857')[1]<.75,'Mercator source must not silently use linear latitude.');

globalThis.document={createElement:()=>canvas()};
const terrain=new T.Group(),site=launchSites['ksc-lc39a'],aperture={x0:-20,x1:55,z0:-10,z1:10};
const environment=buildLaunchEnvironment(site,{parent:terrain,grade:25,aperture});terrain.updateMatrixWorld(true);
// Production scenery is intentionally excluded from pointer picking. Test its
// physical surface using ordinary Mesh raycasting over the same geometries.
const surfaces=environment.group.getObjectByName('Georeferenced terrain and imagery').children.map(m=>new T.Mesh(m.geometry,m.material));for(const m of surfaces)m.updateMatrixWorld(true);
const ray=new T.Raycaster(new T.Vector3(0,200,0),new T.Vector3(0,-1,0));
assert.equal(ray.intersectObjects(surfaces,false).length,0,'Terrain must preserve the physical exhaust incision.');
ray.ray.origin.set(75,200,75);assert(Math.abs(ray.intersectObjects(surfaces,false)[0].point.y-25)<1e-8,'Near pad grading must meet existing civil work.');
assert.equal(ray.intersectObject(environment.group,true).length,0,'Decorative geographic triangles must not slow subsystem picking.');
assert(environment.labels().some(l=>l.kind==='pad'&&l.anchor.isObject3D));assert(environment.horizonRadiusM>2000);environment.dispose();
const concrete=civilSurfaceMaterial();assert.equal(concrete.map.colorSpace,T.SRGBColorSpace);assert.equal(concrete.bumpMap.colorSpace,T.NoColorSpace);assert.notEqual(concrete.map,concrete.bumpMap);concrete.map.dispose();concrete.bumpMap.dispose();concrete.dispose();

// Delayed local resources must keep the loading indicator truthful, and a
// removed scene must not accept late terrain or imagery callbacks.
const imageQueue=[],fetchQueue=[];
globalThis.Image=class{
 constructor(){this.width=this.height=4;}
 set src(value){this._src=value;if(value)imageQueue.push(this);}
 get src(){return this._src;}
};
globalThis.fetch=(url,options={})=>new Promise((resolve,reject)=>{
 // Release real compressed response bytes so the delayed-resource test also
 // exercises the production lazy ZIP extraction path.
 const item={url,resolve:json=>resolve(new Response(/\.(?:geo)?json\.zip$/.test(url)?readFileSync(localFile(url)):JSON.stringify(json))),reject};fetchQueue.push(item);
 options.signal?.addEventListener('abort',()=>reject(new Error('Aborted')),{once:true});
});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function settled(environment){
 for(let n=0;n<200&&environment.status==='loading';n++)await new Promise(resolve=>setTimeout(resolve,2));
 assert.notEqual(environment.status,'loading','Deferred resource decoding did not settle.');
}
let paints=0;
const active=buildLaunchEnvironment(site,{parent:new T.Group(),grade:25,aperture,repaint:()=>paints++});active.ensureLoaded();assert.equal(active.status,'loading');assert(imageQueue.length>=2);
imageQueue.shift().onload();await flush();assert.equal(active.status,'loading','Regional image alone is not a complete environment.');
fetchQueue.shift().resolve(grids.get('space-coast'));await flush();assert.equal(active.status,'loading','Detail image must finish before ready.');
while(imageQueue.length)imageQueue.shift().onload();await settled(active);assert.equal(active.status,'ready');
while(fetchQueue.length)fetchQueue.shift().resolve({type:'FeatureCollection',features:[]});await flush();
assert.equal(active.heightAt(0,0),25,'Absolute DEM height must be registered to local launch grade.');active.dispose();

const failed=buildLaunchEnvironment(site,{parent:new T.Group(),grade:25,aperture});failed.ensureLoaded();imageQueue.shift().onload();imageQueue.shift().onerror();while(imageQueue.length)imageQueue.shift().onload();fetchQueue.shift().resolve(grids.get('space-coast'));await settled(failed);assert.equal(failed.status,'error');assert(failed.errors.length);failed.dispose();while(fetchQueue.length)fetchQueue.shift().resolve({type:'FeatureCollection',features:[]});await flush();

const removed=buildLaunchEnvironment(site,{parent:new T.Group(),grade:25,aperture,repaint:()=>paints++});removed.ensureLoaded();const staleImages=imageQueue.splice(0),before=paints;removed.dispose();
for(const image of staleImages){assert.equal(image.onload,null);assert.equal(image.src,'');}await flush();assert.equal(paints,before,'A disposed environment caused a late repaint.');
delete globalThis.Image;
console.log(`${Object.keys(launchSites).length} launch positions / ${regionHashes.size} geographic regions: bundled imagery and DEM provenance, native dimensions, map registration, elevation orientation, real relief, open exhaust terrain, loading/error states and disposal passed.`);
