import assert from 'node:assert/strict';
import {missionStarter,sizeDesign} from './dist/design.js';
import {componentMassProperties} from './dist/component-stations.js';
import {launchStructure,mountLedger,renderLaunchStructure} from './dist/launch-structure.js';

const close=(a,b,scale=1)=>assert.ok(Math.abs(a-b)<Math.max(1e-7,scale*1e-8),a+' versus '+b);
for(const purpose of ['text','voice','batch','agents','finetune','pretrain']){
 const h=sizeDesign(missionStarter(purpose)),q=launchStructure(h),ledger=mountLedger(h),props=componentMassProperties(h,h.propellantKg,0,false);
 assert.equal(ledger.length,6);
 const expected=Object.fromEntries(props.rows.map(r=>[r.wbs,r]));
 for(const id of ['02.01','03.01']){
  const packages=ledger.filter(p=>p.MEL===id);
  close(packages.reduce((n,p)=>n+p.physical_kg,0),expected[id].massKg);
  for(const p of packages){
   assert.equal(p.restraints,2);assert(p.support_span_Z_m>0);
   for(const s of p.feet_and_seats_body_m){
    const x=p.face.endsWith('X')?0:1;
    close(Math.abs(s.foot[x]),(x?h.bodyHeightM:h.bodyWidthM)/2);
    assert(Math.abs(s.foot[2])<=h.bodyLengthM/2+1e-9,p.package+' requires a load-carrying wall behind this support');
   }
   const [fx,fy,fz]=p.inertial_force_N;close(fx,-2*q.gravityMS2*p.physical_kg);close(fy,0);close(fz,-6*q.gravityMS2*p.physical_kg);
   const [dx,dy,dz]=p.mass_center_body_m.map((c,i)=>c-p.support_foot_centroid_m[i]);
   [dy*fz-dz*fy,dz*fx-dx*fz,dx*fy-dy*fx].forEach((v,i)=>close(v,p.support_group_moment_Nm[i],Math.abs(v)));
  }
 }
 close(props.massKg,q.stowedScMassKg);close(q.interfaceForceN[2],-6*q.gravityMS2*props.massKg,props.massKg);
 assert(q.flangeZ<-h.bodyLengthM/2);assert(q.interfaceBendingNm>0);
 const html=renderLaunchStructure(h);assert(!/NaN|Infinity|undefined/.test(html));assert(html.includes('data-inspect-mounts'));
}
console.log('Stowed mounting figures, wall attachment coordinates, assembly mass, resultant force/couple and interface datum checks passed on all six mission purposes.');
