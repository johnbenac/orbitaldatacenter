import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {createVerificationSetting} from './dist/part-verification-scenes.js';
import {getFacilityAsset} from './dist/test-facilities.js';

const kinds=['studio','installed','review','vibration','thermal-vacuum','thermal-cycle','acoustic','rf-chamber','optical-bench','load-frame','mass-properties','pressure-bench','electrical-bench','clean-inspection','deployment','fit-check','propulsion-stand','site-commissioning'];
const sizes=[[.005,.003,.004],[.08,.045,.03],[.4,.25,.3],[1.8,1.4,1.1],[12,3,6],[150,12,20],[6,100,6],[100,.02,3],[2,.001,2]];
const modes=['auto','none','banana','person','ruler','container'];
const finite=v=>v.toArray().every(Number.isFinite);
let checked=0,maxDraws=0,maxTriangles=0;
const shapes=new Map();

function check(kind,size,software,scaleMode){
 const s=createVerificationSetting({kind,size,software,scaleMode});
 assert.equal(s.kind,kind);assert(finite(s.placement));assert(finite(s.fitBounds.min));assert(finite(s.fitBounds.max));assert(!s.fitBounds.isEmpty());
 const part=new T.Box3(new T.Vector3(s.placement.x-size[0]/2,s.placement.y,s.placement.z-size[2]/2),new T.Vector3(s.placement.x+size[0]/2,s.placement.y+size[1],s.placement.z+size[2]/2));
 assert(s.fitBounds.containsBox(part),`${kind}: item escaped fit bounds`);
 assert(s.stats.drawCalls<=150,`${kind}: ${s.stats.drawCalls} draw calls`);assert(s.stats.triangles<=15000,`${kind}: ${s.stats.triangles} triangles`);
 maxDraws=Math.max(maxDraws,s.stats.drawCalls);maxTriangles=Math.max(maxTriangles,s.stats.triangles);
 for(const ref of s.references){const metric=ref.bounds.getSize(new T.Vector3());if(ref.type==='person')assert(Math.abs(metric.y-1.75)<1e-5);if(ref.type==='banana')assert(Math.abs(metric.x-.18)<1e-5);if(ref.type==='ruler')assert(Math.abs(metric.x-.3)<1e-5);if(ref.type==='container')assert(Math.abs(metric.x-12.192)<1e-5);assert(s.fitBounds.containsBox(ref.bounds));}
 for(const label of s.labels){assert(label.text.length>0);assert(finite(label.position));}
 const geometry=new Set(),material=new Set();const names=[];
 s.root.traverse(o=>{if(o.isMesh||o.isLine){names.push(o.name);assert(!o.isInstancedMesh);assert(!Array.isArray(o.material));assert(o.geometry);geometry.add(o.geometry);material.add(o.material);o.geometry.computeBoundingBox();assert(finite(o.geometry.boundingBox.min));assert(finite(o.geometry.boundingBox.max));}});
 if(size===sizes[2]&&!software&&scaleMode==='auto')shapes.set(kind,names.sort().join('|'));
 for(const t of [0,.25,.5,1]){s.update(t);assert(finite(s.contentOffset));s.root.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite));});}
 let disposedG=0,disposedM=0;for(const g of geometry)g.addEventListener('dispose',()=>disposedG++);for(const m of material)m.addEventListener('dispose',()=>disposedM++);
 s.dispose();s.dispose();assert.equal(s.root.children.length,0);assert.equal(disposedG,geometry.size);assert.equal(disposedM,material.size);
 checked++;
}

for(const software of [false,true])for(const kind of kinds)for(const size of sizes)check(kind,size,software,'auto');
for(const software of [false,true])for(const kind of kinds.filter(k=>!['studio','installed'].includes(k)))for(const mode of modes)check(kind,sizes[2],software,mode);
const named=[...shapes.entries()].filter(([kind])=>!['studio','installed'].includes(kind));assert.equal(new Set(named.map(([,value])=>value)).size,named.length,'All facility settings must have different visible geometry');

// Surface orientation must be physically outward. Agreement between generated
// normals and triangles alone does not catch an entirely inside-out banana.
let artifactCases=0;
for(const software of [false,true]){
 const s=createVerificationSetting({kind:'review',size:[.115,.105,.1083],software}),peel=s.root.getObjectByName('Banana peel'),p=peel.geometry.attributes.position,ix=peel.geometry.index;
 for(let i=0;i<ix.count;i+=3){const [a,b,c]=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix.getX(i+j))),centroid=a.clone().add(b).add(c).multiplyScalar(1/3),t=(centroid.x+.081)/.162;if(t<=.1||t>=.9)continue;const radial=new T.Vector3(0,centroid.y-.025*Math.sin(t*Math.PI),centroid.z).normalize(),face=b.sub(a).cross(c.sub(a)).normalize();assert(face.dot(radial)>.8,'Banana near skin must face outward');}
 const b=new T.Box3().setFromObject(peel),origin=b.getCenter(new T.Vector3());origin.y=b.max.y+.1;const hits=new T.Raycaster(origin,new T.Vector3(0,-1,0)).intersectObject(peel);assert(hits.length&&hits[0].point.y>b.getCenter(new T.Vector3()).y,'Banana must show its near skin, not its far interior');s.dispose();artifactCases++;
 const chamber=createVerificationSetting({kind:'thermal-vacuum',size:[2.55,1.02,.157],software});chamber.root.traverse(o=>{if(o.name!=='Published chamber boundary')return;const p=o.geometry.attributes.position,n=o.geometry.attributes.normal,ix=o.geometry.index;for(let i=0;i<ix.count;i+=3){const [a,b,c]=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix.getX(i+j))),face=b.sub(a).cross(c.sub(a)).normalize(),normal=new T.Vector3().fromBufferAttribute(n,ix.getX(i));assert(face.dot(normal)>.98,'Chamber normals and face winding must agree');}});chamber.dispose();artifactCases++;
 const rf=createVerificationSetting({kind:'rf-chamber',size:[.4,.25,.3],software});rf.root.traverse(o=>{if(o.name==='Schematic side-wall absorber')assert(new T.Vector3(0,1,0).applyQuaternion(o.quaternion).dot(new T.Vector3(1,0,0))>.999999,'Absorber must point perpendicular to its side wall');});rf.dispose();artifactCases++;
}

const clearances={
 'load-frame':['Moving crosshead','Loading actuator','In-line load cell','Upper reaction beam','Load frame column'],
 'pressure-bench':['Facility wall panel','Protective side panel','Pressure manifold','Pressure gauge case','Gauge face'],
 'electrical-bench':['Bench instrument','Breakout and test connector panel','Fixture connector','Test harness'],
 'optical-bench':['Optic mount','Optical post base','Collimator barrel','Collimator optical element'],
 'fit-check':['Illustrative fixture datum pin']
};
for(const software of [false,true])for(const [kind,names] of Object.entries(clearances))for(const size of [...sizes,[10,12,150],[.003,30,.002]]){
 const s=createVerificationSetting({kind,size,software,scaleMode:'none'}),part=new T.Box3(new T.Vector3(s.placement.x-size[0]/2,s.placement.y,s.placement.z-size[2]/2),new T.Vector3(s.placement.x+size[0]/2,s.placement.y+size[1],s.placement.z+size[2]/2));
 for(const t of [0,.25,.5,.75,1]){s.update(t);s.root.traverse(o=>{if(!names.includes(o.name))return;const b=new T.Box3().setFromObject(o),overlap=b.clone().intersect(part);assert(overlap.isEmpty()||Math.min(...overlap.getSize(new T.Vector3()).toArray())<1e-5,`${kind}: ${o.name} intersects ${size} article at ${t}`);});}
 s.dispose();artifactCases++;
}

// Inspection cutaways preserve equipment dimensions. Orthographic panning
// must not change which outward-facing wall is opened for inspection.
for(const software of [false,true]){
 const s=createVerificationSetting({kind:'rf-chamber',size:[1,1,1],software,facilityAsset:getFacilityAsset('ral-nstf/emc-room')}),back=s.root.getObjectByName('RF chamber back wall'),side=s.root.getObjectByName('RF chamber side wall'),unchanged=new Map();
 s.root.traverse(o=>{if(o.material&&!o.userData.inspectionWall)unchanged.set(o.material,[o.material.opacity,o.material.depthWrite,o.material.transparent]);});
 const camera=new T.PerspectiveCamera(40,1,.01,100),aim=new T.Vector3(0,s.placement.y+.5,0);
 for(const [position,expected] of [[[0,aim.y,3],[1,1]],[[0,aim.y,-3],[.10,1]],[[-3,aim.y,0],[1,.10]],[[0,aim.y,3],[1,1]]]){camera.position.fromArray(position);camera.lookAt(aim);camera.updateMatrixWorld(true);s.updateCamera(camera);assert.deepEqual([back.material.opacity,side.material.opacity],expected,'The wall facing the viewing direction should open');}
 for(const [m,values] of unchanged)assert.deepEqual([m.opacity,m.depthWrite,m.transparent],values,'Cutaway mutated equipment or reference material');assert.notEqual(back.material,side.material,'Independent walls need independent opacity state');
 const ortho=new T.OrthographicCamera(-5,5,5,-5,.01,100);for(const pan of [-4,0,4]){ortho.position.set(pan,aim.y,3);ortho.lookAt(pan,aim.y,0);ortho.updateMatrixWorld(true);s.updateCamera(ortho);assert.equal(back.material.opacity,1);assert.equal(side.material.opacity,1,'Orthographic lateral pan must preserve parallel rays');}
 s.root.position.set(17,-9,8);s.root.rotation.set(.2,.65,0);s.root.updateMatrixWorld(true);camera.position.copy(s.root.localToWorld(new T.Vector3(0,aim.y,-3)));camera.lookAt(s.root.localToWorld(aim.clone()));camera.updateMatrixWorld(true);s.updateCamera(camera);assert.equal(back.material.opacity,.10,'Cutaway survives stage transforms');assert.equal(side.material.opacity,1);
 s.dispose();assert.equal(s.updateCamera(camera),false);artifactCases++;
}
for(const size of [[.005,.003,.004],[.4,.25,.3],[2.55,1.02,.157]]){const s=createVerificationSetting({kind:'review',size,scaleMode:'person'}),figure=s.references.find(r=>r.type==='person').bounds,worktop=s.root.getObjectByName('Worktop edge')||s.root.getObjectByName('Fixture mounting plate');assert(figure.min.x>new T.Box3().setFromObject(worktop).max.x,'Scale figure must stand beside the support');s.dispose();artifactCases++;}
console.log(JSON.stringify({passed:checked,artifactCases,distinctPhysicalSettings:named.length,maxDrawCalls:maxDraws,maxTriangles},null,2));
