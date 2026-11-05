// Keep the commissioning drives, collector, cooling valves, mass and flight interlock
// tied to the same event clock used by the actual mesh.
import assert from 'node:assert/strict';
import {defaults,sizeDesign} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {deploymentMET,DEPLOY_END_S} from './dist/commissioning-clock.js';
import {deploymentLayout,deploymentSchedule,mechanismPose,leafAxes,leafPose} from './dist/deployment.js';
import {surfaces} from './dist/physics.js';
import {geometry,dot} from './dist/orbit.js';
import {componentMassProperties} from './dist/component-stations.js';
const close=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const d={...defaults,solarTiltDeg:30},h=sizeDesign(d),g=deploymentLayout(h),sim=createSimulation(h);
for(const u of [0,.025,.17,.42,.61,.68,.72,.901,.97,1]){
 const t=deploymentMET(u),s=sim.at(t),motion=deploymentSchedule(u),parts=mechanismPose(g,u,d.solarTiltDeg);
 const orbit={...geometry(d,t),eclipse:false},f=surfaces(h,orbit,u);
 close(f.solarDeployedM2,h.solarM2*parts.wings[0].span/g.wl);close(f.radiatorCoupledM2,h.radiatorM2*(motion.upperFlow+motion.lowerFlow)/2);
 const radNormals=[f.upperRadiatorNormalECI,f.lowerRadiatorNormalECI];
 for(const [i,bank] of parts.banks.entries()){
  const n=leafAxes(leafPose(g,g.descriptors.find(p=>p.type==='rad'&&p.end===bank.end),u,30))[1];
  for(const [axis,v] of [f.bodyXECI,f.bodyUpECI,f.bodyZECI].entries())close(dot(radNormals[i],v),n[axis]);
 }
 close(f.solarKW,1.361*f.solarDeployedM2*d.pvEfficiency*d.solarDelivery*Math.max(0,dot(f.pvNormalECI,orbit.sunECI))*d.pvRetention**orbit.windowAgeYears);
 close(s.upperRadiatorNetKW+s.lowerRadiatorNetKW,s.netRejectionKW);
 assert.ok(!motion.upperFlow||motion.upperLocked);assert.ok(!motion.lowerFlow||motion.lowerLocked);
 if(u<.665)close(s.netRejectionKW,0);if(u<.895)close(s.lowerRadiatorNetKW,0);
 if(u>0&&u<.42){const solar=componentMassProperties(h,s.propellantKg,u).rows.find(r=>r.wbs==='02.01');
  const wing=parts.wings[0],frac=wing.span/g.wl;
  close(solar.stationsM[0][0],wing.tip[0]+(wing.root[0]-wing.tip[0])*frac/2);
 }
 if(u<1){assert.equal(s.burn,false);assert.equal(s.itKW,0);close(s.propellantKg,h.propellantKg);}
}
const on=createSimulation(defaults).at(DEPLOY_END_S+.25);
assert.equal(on.burn,true);assert.ok(on.propellantKg<defaults.propellantKg);
const before=sim.at(deploymentMET(.04)),paid=sim.at(deploymentMET(.42));assert.ok(paid.batteryKWh<before.batteryKWh);assert.equal(paid.eclipse,true);close(paid.solarKW,0);assert.equal(paid.pvDeployment,1);
console.log('Flight commissioning: bound solar material, hinge-to-flux normals, separate loop admission, signed bank heat closure, eclipse pack energy and post-lock ignition verified.');
