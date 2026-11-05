// Nominal design sequence in mission elapsed seconds. Flight footage establishes
// a speed comparison; these durations describe this vehicle's assumed commands.
export const DEPLOY_START_S=900;
export const DEPLOY_DURATION_S=1200;
export const DEPLOY_END_S=DEPLOY_START_S+DEPLOY_DURATION_S;
export const deploymentProgress=met=>Math.max(0,Math.min(1,(met-DEPLOY_START_S)/DEPLOY_DURATION_S));
export const deploymentMET=fraction=>DEPLOY_START_S+Math.max(0,Math.min(1,fraction))*DEPLOY_DURATION_S;

// Requested kW. Each value is an ODC electrical allocation for the named interval.
// The blanket extends under stored strain energy; rollout draw is instrumentation.
const mechanismKW={hold:0,release:.040,rollout:.008,tension:.012,'upper-root':.060,'upper-tip':.060,'upper-latch':.008,'upper-flow':.012,'lower-root':.060,'lower-tip':.060,'lower-latch':.008,'lower-flow':.012,tracking:.012,deployed:.012};
export const deploymentPowerKW=stage=>mechanismKW[stage]??0;
