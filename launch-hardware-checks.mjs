import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {applyPreset,defaults,sizeDesign} from './dist/design.js';
import {makeLaunch} from './dist/launch-scene.js';
import {launchNozzles} from './dist/launch-hardware.js';
import {spacexSilhouette} from './dist/launch-recognition.js';
const painter=new Proxy({},{get:(_,k)=>k==='createImageData'?(w,h)=>({data:new Uint8ClampedArray(w*h*4)}):['createLinearGradient','createRadialGradient'].includes(k)?()=>({addColorStop(){}}):()=>{}});
globalThis.document={createElement:()=>({getContext:()=>painter})};
const byName=(group,name)=>{const found=[];group.traverse(o=>{if(o.name===name)found.push(o)});return found;};
const near=(n,v)=>assert.ok(Math.abs(n-v)<1e-7,n+' vs '+v);
const load=id=>makeLaunch(sizeDesign(applyPreset(defaults,'launcher',id)));
const star=load('starship'),p=star.parts;
const update=(model,t,phase='ascent')=>model.update({t,flightPhase:phase,altitudeKm:0},phase,{phase:'D',domain:'launcher'});
update(star,-10,'pad');near(star.geometry.lowerLengthM,72.3);near(star.geometry.heightM,124.4);near(star.geometry.heightM-star.geometry.lowerLengthM,52.1);
assert.equal(byName(p.lower,'V3 lowered grid fin').length,3);assert.equal(byName(p.lower,'Booster chine').length,4);assert.equal(byName(p.lower,'Raptor 3').length,33);
assert.equal(byName(p.upper,'Raptor 3').length,3);assert.equal(byName(p.upper,'Raptor Vacuum').length,3);
assert.equal(byName(p.upper,'Aft body flap').length,2);assert.equal(byName(p.shell,'Forward body flap').length,2);
for(const [kind,num,r] of [['superHeavy',33,4.5],['starship',6,4.5],[null,9,1.83]]){
 const bells=launchNozzles(num,r,kind);assert.equal(bells.length,num);for(const [index,b] of bells.entries()){
  assert.ok(Math.hypot(b.x,b.z)+b.diam<r);for(const c of bells.slice(index+1))assert.ok(Math.hypot(b.x-c.x,b.z-c.z)>b.diam+c.diam,kind+' nozzle collision');}
}
update(star,141);near(p.lower.position.y,0);update(star,145);assert(p.lower.position.y<0);update(star,270);assert(p.shell.visible&&!p.lower.visible);
const door=p.shell.getObjectByName('Retained cargo door');
update(star,545,'insertion');assert(door.rotation.y<0&&p.payload.position.x===0);const pivot=door.position.clone();
update(star,590,'insertion');assert(door.rotation.y< -1.8&&door.position.equals(pivot)&&p.payload.position.x<0);assert(p.upper.visible&&p.shell.visible);
const falcon=load('falconHeavy'),f=falcon.parts;update(falcon,-10,'pad');assert.equal(f.boosters.length,2);
for(const core of [f.lower,...f.boosters]){assert.equal(byName(core,'Falcon landing leg').length,4);assert.equal(byName(core,'Stowed Falcon grid fin').length,4);assert.equal(byName(core,'Merlin 1D').length,9);}
assert.equal(f.boosterBase.parent,f.boosters[0]);update(falcon,145);near(f.boosters[0].rotation.z,0);update(falcon,155);assert(f.boosters[0].rotation.z>0);assert.equal(byName(f.boosters[0],'Falcon landing leg').filter(o=>o.visible).length,4);
update(falcon,232);near(f.lower.position.y,0);update(falcon,242);assert(f.lower.position.y<0);update(falcon,310);assert(!f.shell.visible);
assert.notEqual(spacexSilhouette('starship'),spacexSilhouette('falconHeavy'));
// A reusable ship retains its painted door. Two opposing conventional
// graphics belong to their own jettisonable skins and stay inside each seam.
const doorPatch=byName(door,'Mission patch');assert.deepEqual(doorPatch,[p.fairingPatch]);assert.equal(doorPatch[0].parent.userData.cargoWall,true);
const halves=f.shell.children.filter(o=>o.userData.halfSide);
assert.equal(halves.length,2);
for(const half of halves){
 const decals=byName(half,'Mission patch');assert.equal(decals.length,1);
 const decal=decals[0],pos=decal.geometry.attributes.position,uv=decal.geometry.attributes.uv;
 assert.equal(decal.parent.name,'Fairing half shell');
 let low=Infinity,high=-Infinity;
 for(let i=0;i<pos.count;i++){
  assert(pos.getX(i)*half.userData.halfSide>0);
  if(uv.getY(i)===0)low=Math.min(low,pos.getY(i));
  if(uv.getY(i)===1)high=Math.max(high,pos.getY(i));
 }
 assert(high-low>2,'A physically sized, right-side-up badge on each Falcon fairing half');
 const tangent=new T.Vector3().subVectors(new T.Vector3().fromBufferAttribute(pos,1),new T.Vector3().fromBufferAttribute(pos,0));
 const radial=new T.Vector3(pos.getX(0),0,pos.getZ(0));
 assert(tangent.cross(new T.Vector3(0,1,0)).dot(radial)>0,'Texture reads left-to-right on the exterior');
}

const geo=new Set(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),n=new T.Vector3(),sum=new T.Vector3();
for(const root of [p.lower,p.upper,p.shell,f.lower,...f.boosters])root.traverse(o=>{if(o.isMesh&&!o.material.transparent)geo.add(o.geometry)});
for(const g of geo){const pos=g.attributes.position,norm=g.attributes.normal,ix=g.index;if(!pos||!norm)continue;
 for(let i=0;i<(ix?.count??pos.count);i+=3){const ids=[0,1,2].map(j=>ix?ix.getX(i+j):i+j);[a,b,c].forEach((p,j)=>p.fromBufferAttribute(pos,ids[j]));b.sub(a).cross(c.sub(a));assert.ok(b.lengthSq()>1e-21,'Degenerate '+g.type+' triangle');sum.set(0,0,0);for(const j of ids)sum.add(n.fromBufferAttribute(norm,j));assert.ok(b.dot(sum)>-1e-10,'Winding '+g.type);}
}
console.log('Verified Starship V3 staged hardware, retained hinged bay door and clearance sequencing, Falcon Heavy core-synchronous landing hardware, non-overlapping engine clusters and hardware mesh winding.');
