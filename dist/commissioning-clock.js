// Preliminary commanded durations are installed-family allocations, not measured flight times.
import {architectureFamily} from './architecture-families.js';
export const DEPLOY_START_S=900;
export const DEPLOY_DURATION_S=1200;
export const DEPLOY_END_S=DEPLOY_START_S+DEPLOY_DURATION_S;
export function commissioningClock(h){
 const family=architectureFamily(h),durationS=family.deploymentDurationS||DEPLOY_DURATION_S;
 return {startS:DEPLOY_START_S,durationS,endS:DEPLOY_START_S+durationS,basis:'Preliminary family-specific commanded sequence; no qualified deployment time is asserted.'};
}
export const deploymentProgress=(met,h)=>Math.max(0,Math.min(1,(met-DEPLOY_START_S)/commissioningClock(h).durationS));
export const deploymentMET=(fraction,h)=>DEPLOY_START_S+Math.max(0,Math.min(1,fraction))*commissioningClock(h).durationS;
const mechanismKW={hold:0,release:.040,rollout:.008,tension:.012,'upper-root':.060,'upper-tip':.060,'upper-latch':.008,'upper-flow':.012,'lower-root':.060,'lower-tip':.060,'lower-latch':.008,'lower-flow':.012,tracking:.012,deployed:.012};
export function deploymentPowerKW(stage,h){
 const f=architectureFamily(h);
 if(f.id==='redwire-platform'&&/flow/.test(stage))return 0;
 const scaling=f.id==='protected-core'?1:Math.max(1,(f.solarWingCount||4)/4+(f.radiatorBankCount||2)/2)/2;
 return (mechanismKW[stage]??(/release|latch/.test(stage)?.020:/deploy|unfold|swing/.test(stage)?.060:0))*scaling;
}
