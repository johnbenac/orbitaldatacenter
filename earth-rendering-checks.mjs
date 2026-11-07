// Protect geographic registration, actual detail retention and scene depth,
// rather than the choice of shaders or the number of sphere triangles.
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {earthGeographicUV,sampleEarthDay,renderEarthSoftware} from './dist/earth-software.js';
import {EARTH_STYLE} from './dist/earth-appearance.js';
import {EARTH_DETAIL} from './dist/earth-detail.js';
import {softRenderer} from './dist/software-scene.js';
import {canvas} from './render-test-canvas.mjs';

globalThis.document={createElement:()=>canvas()};
const close=(a,b,message,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${message}: ${a} vs ${b}`);
const rgb=(r,g,b)=>[r,g,b,255];
function texture(width,height,at){
 const data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)data.set(at(x,y),4*(y*width+x));
 const t=new T.Texture({width,height,data});t.colorSpace=T.SRGBColorSpace;t.needsUpdate=true;return t;
}
const constant=color=>texture(8,4,()=>color);
const linear=n=>{const x=n/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;};

// Reference locations expressed in the actual Earth-centred scene convention.
for(const [longitude,latitude] of [[0,0],[90,0],[-90,0],[179.9,-55],[-179.9,45],[20,70]]){
 const lon=longitude*Math.PI/180,lat=latitude*Math.PI/180;
 const uv=earthGeographicUV(Math.cos(lat)*Math.cos(lon),Math.sin(lat),-Math.cos(lat)*Math.sin(lon));
 close(uv[0],(longitude+180)/360,'east longitude');close(uv[1],(90-latitude)/180,'north-up image row');
}

// A source above the old 2048px cap retains alternating individual texels.
// Bilinear sampling at their centres must not turn all of them into grey.
const stripes=texture(4096,2,x=>x%2?rgb(245,20,10):rgb(10,30,230));
const stripeState={maps:{day:stripes},details:[]};
for(const x of [37,38,2047,2048,4094,4095]){
 const sampled=sampleEarthDay(stripeState,(x+.5)/4096,.5),expected=x%2?rgb(245,20,10):rgb(10,30,230);
 for(let c=0;c<3;c++)close(sampled[c],linear(expected[c]),'full-resolution geographic texel',1e-6);
}
const seamA=sampleEarthDay(stripeState,-.0001,.5),seamB=sampleEarthDay(stripeState,.9999,.5);
for(let c=0;c<3;c++)close(seamA[c],seamB[c],'longitude wrap',1e-6);

// NASA detail rows run north-to-south. Padding surrounds a 2048px interior;
// its magenta sentinel must not replace geography near an interior edge.
const global=constant(rgb(12,30,70));
const north=texture(2052,2052,(x,y)=>x<2||y<2||x>=2050||y>=2050?rgb(255,0,255):rgb(180,100,20));
const south=texture(2052,2052,(x,y)=>x<2||y<2||x>=2050||y>=2050?rgb(255,0,255):rgb(20,170,80));
const detailed={maps:{day:global},details:[{col:4,row:1,map:north},{col:4,row:2,map:south}]};
for(const [u,v,color] of [[4.5/8,1.5/4,rgb(180,100,20)],[4.5/8,2.5/4,rgb(20,170,80)],[(4+3/2048)/8,(1+3/2048)/4,rgb(180,100,20)],[.2,.1,rgb(12,30,70)]]){
 const actual=sampleEarthDay(detailed,u,v);for(let c=0;c<3;c++)close(actual[c],linear(color[c]),'detail tile registration',1e-6);
}

const day=constant(rgb(18,90,130)),night=constant(rgb(180,85,24)),black=constant(rgb(0,0,0)),white=constant(rgb(255,255,255));
const state={maps:{day,night:black,clouds:black,ocean:black},details:[],sun:new T.Vector3(1,0,0),cloudRadius:EARTH_STYLE.cloudRadius,atmosphereRadius:EARTH_STYLE.atmosphereRadius};
const material=new T.MeshBasicMaterial();material.userData.earthSurface=state;
// Deliberately crude mesh: the final silhouette must still be a smooth sphere.
const globe=new T.Mesh(new T.SphereGeometry(1,8,4),material),camera=new T.OrthographicCamera(-1.1,1.1,1.1,-1.1,.1,20);
camera.position.set(3,0,0);camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();globe.updateMatrixWorld();
const width=81,height=81,pixels=new Uint8ClampedArray(width*height*4),depth=new Float64Array(width*height);
function draw(){pixels.fill(0);depth.fill(Infinity);renderEarthSoftware({object:globe,state,camera,width,height,pixels,depth,exposureEV:0});return Array.from(pixels.slice(4*(40*width+40),4*(40*width+40)+4));}
const sunny=draw();assert.equal(sunny[3],255);
state.maps.night=night;assert.deepEqual(draw(),sunny,'city lights must remain off on the daylight side');
state.sun.set(-1,0,0);const litNight=draw();state.maps.night=black;const darkNight=draw();
assert.ok(litNight[0]>darkNight[0]+60&&litNight[1]>darkNight[1]+25,'emissive cities appear only on the night side');
const nightContext=constant(rgb(26,26,52));state.maps.night=nightContext;
assert.deepEqual(draw(),darkNight,'the night composite’s blue terrain context must not emit city light');nightContext.dispose();
state.maps.night=night;state.maps.clouds=white;const covered=draw();assert.ok(covered[0]<litNight[0]-20,'clouds attenuate cities below them');
state.maps.night=black;state.maps.clouds=black;state.sun.set(1,0,0);
const noGlint=draw();state.maps.ocean=white;const glint=draw();assert.ok(glint[0]>noGlint[0]+15,'water mask permits solar glint');state.maps.ocean=black;

// Changing illumination must invalidate the cached planet, and ordinary redraws
// must retain exactly the same result when no relevant state has changed.
const first=draw(),cached=draw();assert.deepEqual(cached,first);
const forward=new T.Vector3(1,0,0).project(camera).z;
close(depth[40*width+40],forward,'analytic surface NDC depth',1e-12);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const across=((x+.5)/width*2-1)*1.1,up=(1-(y+.5)/height*2)*1.1,inside=across*across+up*up<1;
 assert.equal(Number.isFinite(depth[y*width+x]),inside,'continuous globe silhouette independent of mesh facets');
}

// Perspective close views use the same real observer position. At nadir the
// nearest Earth point must remain exactly one physical planet radius away.
const closeCamera=new T.PerspectiveCamera(49,1,.0001,30);closeCamera.position.set(1+550/6371,0,0);closeCamera.lookAt(0,0,0);closeCamera.updateMatrixWorld();closeCamera.updateProjectionMatrix();
depth.fill(Infinity);pixels.fill(0);renderEarthSoftware({object:globe,state,camera:closeCamera,width,height,pixels,depth,exposureEV:0});
close(depth[40*width+40],new T.Vector3(1,0,0).project(closeCamera).z,'LEO surface depth',1e-12);

// The close-observer renderer must consume newly resident virtual imagery, not
// just expose a sampler that works in isolation. Constant pages deliberately
// reuse one physical slot so this fixture isolates integration/cache behavior;
// geographic slot addressing has its own CPU and native GPU checks.
const atlasSize=EARTH_DETAIL.pitch,atlasData=Array.from({length:3},()=>new Uint8Array(atlasSize*atlasSize*4));
let atlasReads=0;
const observerDetail={allocated:true,disposed:false,version:0,atlasSize,
 tableData:new Uint8Array(EARTH_DETAIL.tableColumns*EARTH_DETAIL.tableRows*3*4),
 get atlasData(){atlasReads++;return atlasData;}};
const observerState={...state,maps:{...state.maps},sun:state.sun.clone(),observer:true,details:[],detail:observerDetail};
const observerMaterial=new T.MeshBasicMaterial();observerMaterial.userData.earthSurface=observerState;
const observer=new T.Mesh(globe.geometry,observerMaterial);observer.updateMatrixWorld();
const observerPixels=new Uint8ClampedArray(pixels.length),observerDepth=new Float64Array(depth.length);
function observerFrame(){
 observerPixels.fill(0);observerDepth.fill(Infinity);
 renderEarthSoftware({object:observer,state:observerState,camera:closeCamera,width,height,pixels:observerPixels,depth:observerDepth,exposureEV:0});
 return observerPixels.slice();
}
const observerCenter=frame=>Array.from(frame.slice(4*(40*width+40),4*(40*width+40)+4));
function residentPage(layer,color){
 for(let p=0;p<atlasData[layer].length;p+=4)atlasData[layer].set(color,p);
 const cells=EARTH_DETAIL.tableColumns*EARTH_DETAIL.tableRows,start=layer*cells*4;
 for(let p=start;p<start+cells*4;p+=4)observerDetail.tableData.set([0,0,1,255],p);
 observerDetail.version++;
}
const observerBase=observerCenter(observerFrame());
residentPage(0,rgb(220,35,12));const observerRed=observerFrame(),redCenter=observerCenter(observerRed);
assert.ok(redCenter[0]>observerBase[0]+40&&redCenter[0]>redCenter[2]+40,'resident observer day pixels reach the actual software surface pass');
const readsBeforeCache=atlasReads;
assert.deepEqual(observerFrame(),observerRed,'unchanged observer redraw preserves all rendered pixels');
assert.equal(atlasReads,readsBeforeCache,'unchanged observer redraw composites its cached frame without resampling the atlas');
residentPage(0,rgb(12,40,220));const blueCenter=observerCenter(observerFrame());
assert.ok(blueCenter[2]>redCenter[2]+40&&blueCenter[0]<redCenter[0]-40,'detail.version invalidates the frame after atlas bytes change in place');
assert.ok(atlasReads>readsBeforeCache,'a new detail version resamples resident imagery');

observerState.sun.set(-1,0,0);const observerDark=observerCenter(observerFrame());
residentPage(1,rgb(190,3,245));const observerCities=observerFrame(),cityCenter=observerCenter(observerCities);
assert.ok(cityCenter[0]>observerDark[0]+60&&cityCenter[0]>cityCenter[1]&&cityCenter[1]>cityCenter[2],'resident night intensity produces the fixed warm city-light tint');
residentPage(1,rgb(190,250,0));
assert.deepEqual(observerFrame(),observerCities,'fine night emission uses its red intensity and fixed tint even when source green/blue differ');
residentPage(2,rgb(255,0,0));const observerClouds=observerFrame(),cloudCenter=observerCenter(observerClouds);
assert.ok(cloudCenter[0]<cityCenter[0]-40,'newly resident cloud coverage obscures detailed night lights');
const cloudReads=atlasReads;
assert.deepEqual(observerFrame(),observerClouds,'unchanged cloud-detail frame remains stable');
assert.equal(atlasReads,cloudReads,'resident cloud imagery shares the unchanged-frame cache');
observerMaterial.dispose();

// The dispatch participates in the normal renderer's depth buffer: an object
// behind the planet is hidden, while a nearer object remains visible.
const output=canvas(),renderer=softRenderer(output);renderer.setSize(449,449);
const scene=new T.Scene();scene.userData.exposureEV=0;scene.add(globe);
const marker=new T.Mesh(new T.PlaneGeometry(.3,.3),new T.MeshBasicMaterial({color:'#ff00ff',side:T.DoubleSide,toneMapped:false}));marker.rotation.y=Math.PI/2;marker.position.x=-1.2;scene.add(marker);
const center=()=>Array.from(output.frame.data.slice(4*(224*449+224),4*(224*449+224)+4));
renderer.render(scene,camera);assert.deepEqual(center(),first,'far-side geometry is occluded by analytic Earth');
marker.position.x=1.2;renderer.render(scene,camera);assert.deepEqual(center(),[255,0,255,255],'foreground geometry remains in front of Earth');

for(const texture of [stripes,global,north,south,day,night,black,white])texture.dispose();
globe.geometry.dispose();material.dispose();marker.geometry.dispose();marker.material.dispose();renderer.dispose();
console.log('Earth rendering: geographic/16K tile registration, full-resolution texels, dateline wrapping, night/cloud/water masks, continuous limb, cache and orbital depth; observer resident day/night/cloud imagery, fixed night tint and detail-version cache invalidation passed.');
