import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {eciScene,flightFrames,createEarthBackdrop} from './dist/flight-frame.js';
import {solarRadiusRad} from './dist/celestial-sky.js';
import {canvas} from './render-test-canvas.mjs';
import {softRenderer} from './dist/software-scene.js';
import {R} from './dist/orbit.js';

let loaded;
globalThis.document={createElement:()=>canvas(),createElementNS:()=>({
 addEventListener(ev,fn){if(ev==='load')loaded=fn},removeEventListener(){},
})};
const globe=new T.Mesh(new T.SphereGeometry(1,48,32),new T.MeshBasicMaterial({color:0x303030}));
const atmosphericShell=new T.Group(),cam=new T.PerspectiveCamera(49,1,.0001,30);
let repaints=0;
const backdrop=createEarthBackdrop(globe,atmosphericShell,()=>{repaints++});
const field=backdrop.scene.getObjectByName('Milky Way · equatorial sky survey'),source=backdrop.scene.getObjectByName('Sun · 0.533° photosphere');
const dist=R+550,s={sunECI:[1,0,0],positionECI:[dist,0,0],radial:[1,0,0],along:[0,1,0],normal:[0,0,1],bodyXECI:[1,0,0],bodyUpECI:[0,1,0],earthRotationRad:0,eclipse:false};
const frame=flightFrames(s),origin=new T.Vector3();
assert.equal(field.material.map,null);
loaded({target:{}});assert(field.material.map);assert.equal(repaints,1);

// The source map has RA 0 at the middle, RA increasing to the left, north above.
// Intersect the actual geometry on the line to Sirius, Vega and the Galactic center.
for(const [ra,dec] of [[101.287,-16.716],[279.234,38.7837],[266.405,-28.936]]){
 const rad=Math.PI/180,lon=ra*rad,lat=dec*rad;
 const d=eciScene([Math.cos(lat)*Math.cos(lon),Math.cos(lat)*Math.sin(lon),Math.sin(lat)]);
 const hit=new T.Raycaster(origin,d).intersectObject(field)[0];
 assert(hit);assert(Math.abs(hit.uv.x-((.5-ra/360+1)%1))<.0003);
 assert(Math.abs(hit.uv.y-(.5+dec/180))<.0003);
}
field.visible=false; // Isolate the solar disk and Earth limb in this pixel test.
const observer=backdrop.camera,rendererCanvas=canvas(),renderer=softRenderer(rendererCanvas);
renderer.setSize(401,401);
const center=()=>{renderer.render(backdrop.scene,observer);const frame=rendererCanvas.frame;return frame.data.slice(4*(200*401+200),4*(200*401+200)+4)};
cam.lookAt(eciScene(s.sunECI));cam.quaternion.premultiply(frame.body.clone().invert());
backdrop.update(cam,frame,s,1,false);
let pixel=center();
assert(source.visible);assert(pixel[0]>205&&pixel[1]>190&&pixel[2]>160,'solar disk is drawn in the inertial Sun direction');
assert(observer.getWorldDirection(new T.Vector3()).distanceTo(eciScene(s.sunECI))<1e-9);
assert(Math.abs(2*solarRadiusRad*180/Math.PI-1919/3600)<1e-12);
s.positionECI=[-dist,0,0];s.eclipse=true;
backdrop.update(cam,frame,s,1,false);
pixel=center();assert(!source.visible);assert(pixel[0]<65&&pixel[3]===255,'nightside Earth occults direct disk');
cam.quaternion.premultiply(frame.body);
backdrop.overview(cam,s,1);pixel=center();
assert(source.visible&&pixel[0]>205,'spacecraft eclipse does not extinguish Sun in an external sky');
assert(source.getWorldPosition(new T.Vector3()).sub(observer.position).normalize().distanceTo(eciScene(s.sunECI))<1e-9);
backdrop.dispose();renderer.dispose();
console.log('Survey sky landmark registration, Sun beam direction, angular size, spacecraft eclipse and external-observer Sun verified.');
