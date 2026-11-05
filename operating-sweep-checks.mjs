import assert from 'node:assert/strict';
import {aiPurposes} from './dist/ai-purpose.js';
import {missionStarter,sizeDesign} from './dist/design.js';
import {presetList} from './dist/mission-presets.js';
import {propulsionReview} from './dist/spacecraft-architecture.js';
import {componentMassProperties} from './dist/component-stations.js';
import {attitudeLimits,bankTrimTravel} from './dist/attitude-guidance.js';
import {auditOperatingAngles} from './deployment-checks.mjs';
const designs=[...presetList,...Object.keys(aiPurposes).map(id=>({id,h:sizeDesign(missionStarter(id))}))];
for(const {id,h} of designs){
 if(process.env.ODC_AUDIT_ONLY&&id!==process.env.ODC_AUDIT_ONLY)continue;
 const limits=attitudeLimits(h),{bankCantDeg:c,upperBankCantDeg:uc}=limits,poses=[];
 const uStop=bankTrimTravel(uc,limits,true),lStop=bankTrimTravel(c,limits);
 for(const w of [0,90,180])for(const u of [-105,-90,-45,0,45,90,105])for(const l of [-105,-90,0,90,105])
  poses.push({wingPitchDeg:w,upperRadiatorPitchDeg:-uc,lowerRadiatorPitchDeg:c,upperRadiatorRollDeg:u*uStop/105,lowerRadiatorRollDeg:l*lStop/105});
 const audit=auditOperatingAngles(h,10,5,poses);
 console.log(id,JSON.stringify(audit));
 assert.ok(audit.minGapM>0,id+' in-flight moving assembly interference');
 // Check the plume at all joint extrema. An unfavorable asymmetric radiator
 // orientation must enter the thrust-line error budget via its mass offset.
 for(const wing of [-180,-90,0,90])for(const upper of [-30,-65])for(const lower of [30,65]){
  const angles={wingPitchDeg:wing,upperRadiatorPitchDeg:upper,lowerRadiatorPitchDeg:lower};
  const p=propulsionReview(h,h.propellantKg,angles),mass=componentMassProperties(h,h.propellantKg,1,false,true,angles);
  assert.deepEqual(p.cm,mass.cm);assert.ok(p.plumeMarginM>0);
 }
 const park={wingPitchDeg:90,upperRadiatorPitchDeg:-45,lowerRadiatorPitchDeg:45};
 const offset={...park,upperRadiatorPitchDeg:-65,lowerRadiatorPitchDeg:30};
 const idle=propulsionReview(h,h.propellantKg,park),unequal=propulsionReview(h,h.propellantKg,offset);
 assert.ok(unequal.torqueNm>idle.torqueNm+1);
 if(id==='text'){assert.ok(idle.clear);assert.equal(unequal.clear,false);assert.ok(unequal.torqueNm>h.input.cmgTorqueNm);}

}
