import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {createEarthAppearance,EARTH_STYLE as E,integrateEarthAtmosphere,earthSunTransmission,earthNightLightMask} from './dist/earth-appearance.js';

// Control real loader completion order: camera movement and disposal must not
// let late image callbacks install an unrelated region or revive a dead viewer.
const images=[];
class ImageElement{
 constructor(){this.tagName='IMG';this.events=new Map();this.width=this.height=0;this._src='';images.push(this);}
 addEventListener(name,fn){this.events.set(name,fn);}
 removeEventListener(name,fn){if(this.events.get(name)===fn)this.events.delete(name);}
 set src(value){this._src=value;}
 get src(){return this._src;}
 complete(){
  if(!this.src)return;
  this.width=this.naturalWidth=this.src.includes('day-16k')?2052:this.src.includes('1k')?1024:this.src.includes('2k')?2048:this.src.includes('8k')?8192:4096;
  this.height=this.naturalHeight=this.src.includes('day-16k')?2052:this.width/2;
  this.events.get('load')?.();
 }
}
globalThis.document={createElementNS:()=>new ImageElement()};
let redraws=0;
const visual=createEarthAppearance({gpu:false,onReady:()=>redraws++}),group=new T.Group();group.add(visual.surface,visual.atmosphere);
assert.equal(images.length,0,'Ground-only scenes must not load Earth imagery');
const camera=new T.PerspectiveCamera(49,1.7,.0001,30);camera.position.set(1.086,0,0);camera.lookAt(0,0,0);camera.updateMatrixWorld();
visual.update(new T.Vector3(1,0,0));visual.prepare(camera,visual.surface);
assert.equal(images.filter(i=>i.src.includes('day-16k')).length,2,'Only two detail transfers may run concurrently');
assert.equal(visual.state.loading,true);
assert.equal(visual.state.baseReady,false);

const preview=images.find(i=>i.src.endsWith('day-1k.jpg'));
const full=images.find(i=>i.src.endsWith('day-4k.jpg'));
full.complete();const installedDay=visual.state.maps.day;
preview.complete();assert.equal(visual.state.maps.day,installedDay,'Late low-resolution image must not replace a sharper image');
for(const image of images.filter(i=>i.src&&!i.src.includes('day-16k')&&i!==full&&i!==preview))image.complete();
assert.equal(visual.state.baseReady,true);assert.equal(visual.state.resolution,4096);

const abandoned=images.filter(i=>i.src.includes('day-16k')).map(image=>({image,callback:image.events.get('load')}));
group.rotation.y=Math.PI;visual.prepare(camera,visual.surface);
assert.ok(abandoned.every(i=>i.image.src===''),'A changed hemisphere cancels stale detail downloads');
const version=visual.state.version;
for(const old of abandoned)old.callback();
assert.equal(visual.state.version,version,'Late cancelled callbacks cannot mutate texture state');
for(let round=0;round<4;round++)for(const image of [...images])if(image.src.includes('day-16k')&&image.events.has('load'))image.complete();
assert.equal(visual.state.loading,false);
assert.ok(visual.state.detailReady>=1&&visual.state.detailReady<=4);
assert.ok(visual.state.details.filter(Boolean).every(d=>d.col===0||d.col===7),'Earth rotation selects the correct dateline region');
assert.ok(visual.state.details.filter(Boolean).every(d=>d.map.wrapS===T.ClampToEdgeWrapping),'A regional tile cannot wrap into its opposite edge during GPU filtering');

// A close orthographic globe needs the same geography detail as the perspective
// observer; an ordinary full globe continues to use the compact global map.
const overview=new T.OrthographicCamera(-1.8,1.8,1.2,-1.2,.001,30);overview.position.set(5,0,0);overview.lookAt(0,0,0);overview.updateMatrixWorld();
visual.prepare(overview,visual.surface);assert.equal(visual.state.details.filter(Boolean).length,0);
overview.left=-.4;overview.right=.4;overview.top=.25;overview.bottom=-.25;overview.updateProjectionMatrix();visual.prepare(overview,visual.surface);
assert.ok(visual.state.details.filter(Boolean).length>0,'Zoomed orthographic views retain detailed regional tiles');

const before=redraws;visual.dispose();visual.dispose();
for(const image of images)image.events.get('load')?.();
assert.equal(redraws,before,'A disposed viewer cannot request another frame');
assert.equal(visual.state.loading,false);assert.equal(visual.state.details.filter(Boolean).length,0);

// The same integration function drives the CPU atmosphere. Check meaningful
// limiting cases rather than snapshotting a chosen artistic RGB value.
const air=new Float64Array(6),sunlight=new Float64Array(3);
integrateEarthAtmosphere([0,0,2],[0,0,-1],[0,0,1],2-E.atmosphereRadius,1,air,true);
assert.ok(air[2]>air[0]&&air[0]>0,'A lit near-vertical air column preferentially scatters blue');
assert.ok(air[5]<air[3]&&air[5]>0&&air[3]<1,'Atmospheric extinction is wavelength dependent and bounded');
integrateEarthAtmosphere([0,0,2],[0,0,-1],[0,0,-1],2-E.atmosphereRadius,1,air,true);
assert.ok(air[0]+air[1]+air[2]<1e-12,'The Earth-occluded atmosphere cannot glow as though lit by a studio light');
earthSunTransmission(1,-.2,sunlight);assert.deepEqual([...sunlight],[0,0,0]);
for(const radius of [1,E.cloudRadius,E.atmosphereRadius])for(const cosine of [-1,-.02,0,.3,1]){
 earthSunTransmission(radius,cosine,sunlight);assert.ok([...sunlight].every(x=>Number.isFinite(x)&&x>=0&&x<=1));
}
const linear=byte=>{const x=byte/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;};
const nightMask=rgb=>earthNightLightMask(...rgb.map(linear));
assert.equal(nightMask([26,26,52]),0,'Gobi blue terrain context must not become emitted city light');
assert.equal(nightMask([31,32,63]),0,'Taklamakan blue terrain context must not glow');
assert.equal(nightMask([250,255,247]),1,'Beijing neutral-white urban light must be retained');
assert.equal(nightMask([108,73,21]),1,'Warm urban light must be retained');
assert.ok(nightMask([45,45,45])>0&&nightMask([45,45,45])<1,'Dim neutral light has a smooth transition');
assert.equal(nightMask([0,0,0]),0);
console.log('Earth appearance: lazy loading, progressive resolution, bounded regional transfers, stale callback cancellation, rotated/dateline and orthographic LOD, disposal, Sun-masked atmospheric scattering, and isolated night lights passed.');
