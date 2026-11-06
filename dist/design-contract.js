// The mission is evaluated against an installed vehicle. Resizing is an
// explicit proposal, never an effect of changing an orbit or service demand.
export const designContractRevision='ODC-DC-001 Rev B';
const words=value=>new Set(value.trim().split(/\s+/));
const hardware=words(`powerArchitecture compute storage battery pv coating engine trayCount solarM2 radiatorM2 batteryKWh storageTB propellantKg hostCores fabricGbps cmgMomentumNms cmgTorqueNm dipoleAm2 kaDishM opticalApertureM opticalTxW linkCapMbps uplinkBufferMB hkRecorderMB trayKw trayIdleKw chipsPerTray chipTF chipGB chipBW trayKg diskModuleTB diskModuleKg diskWrite diskRead diskWatts dwpd diskReserve pvEfficiency solarDelivery pvRetention batteryRetention packWhKg packWhL pvKgM2 chargeEff dischargeEff chargeC dischargeC socMin socMax emissivity absorptivity emissivityRetention alphaGrowth thermalResistanceKPerKw radiatorDesignK radKgM2 skinKgM2 blanketKgM2 blanketEffectiveEpsilon blanketOuterEpsilon blanketOuterAlpha penetrationWK isp thrustN fuelDensity oxidizerDensity mixtureRatio residualFraction tankFill shieldKgM2 adapterKg cd cpOffsetM packHeatKJkgK packCouplingWKkg opticalJitterUrad`);
const mission=words(`aiPurpose workload launcher network launchSite epoch altitudeKm ecc inclinationDeg raanDeg argPeriDeg meanAnomalyDeg missionYears yearsSupply launchAllowanceKg referenceKg requiredTps requiredLineMbps targetSOC attitude rollDeg pitchDeg yawDeg solarTiltDeg solarDriver solarCyclePhase ap f107Floor f107Ceiling duty idleComputePolicy pumpStandbyPolicy thermalMode appliedHeatKw initialCoreK initialBatteryK launchBoundaryK socInitial link elevationDeg contactFraction codingEff trimDv maneuverDv disposalDv disposalMethod graveyardAltitudeKm disposalTargetPerigeeKm targetLatDeg targetLonDeg targetToleranceKm targetSearchHours fairingM fairingLengthM paramsB bits context batch promptTokens outputTokens latencyTargetS bytesPerToken bulkMbps initialQueueGB retainedGB commandKbps hkPeriodS voiceAudioKbps voiceTurnSeconds batchInputMB batchResultMB agentFanout agentMessageKB toolsPerTask toolCpuSeconds toolIOMB trainingStateBytes trainableFraction activationFraction pretrainParamsB activeParamFraction trainingTokensB fineTuneTokensM trainingStepTokens artifactReturnHours trainingBudgetDays datasetGB checkpointIntervalH artifactBits customerUplinkMbps initialInputGB inputSpoolGB serviceOffersPerHour serviceConcurrency serviceDeadlineS ttftTargetS streamGapTargetS targetStreamTps liveQualityFraction voiceFirstAudioTargetS voiceInterruptionTargetS audioChunkMs vadEndpointMs voicePlaybackBufferMs batchResultSwing batchQualityFraction agentVerifyFraction agentSerialSteps earthToolFraction toolRttS humanSteeringS validationTarget baseCompatible artifactKind checkpointBytesPerParam corpusTokenBytes serviceRoute relayUpMbps relayDownMbps relayAvailability relayCycleS relayHandoverS relayRttMs groundEdgeMs earthITKw earthUsefulPerHour earthPUE earthQualityFraction earthDeadlineFraction earthEnergyPrice spaceEnergyPrice`);
const policy=words('structureMargin reserveFraction radialPaddingM axialPaddingM');
export const roleLabels=Object.freeze({hardware:'Installed design',mission:'Mission case',assumption:'Analysis basis',policy:'Controlled allowance'});
export function inputRole(key){
  if(policy.has(key))return 'policy';
  if(hardware.has(key)||/^(junction|coldPlate|coolant|radiator|battery|enclosure)(Op|Surv|Survival)|^junctionLimitK$/.test(key))return 'hardware';
  return mission.has(key)?'mission':'assumption';
}
export const isPolicyInput=key=>policy.has(key);
export function groupDesignInputs(keys){
  const groups={mission:[],hardware:[],assumption:[],policy:[]};
  for(const key of keys)groups[inputRole(key)].push(key);
  return groups;
}
const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}':JSON.stringify(value);
const digest=value=>{
  const source=canonical(value);let n=2166136261;
  for(let i=0;i<source.length;i++){n^=source.charCodeAt(i);n=Math.imul(n,16777619);}
  return (n>>>0).toString(16).padStart(8,'0').toUpperCase();
};
export function designIdentity(h){
  const split={hardware:{},mission:{},assumption:{},policy:{}};
  for(const [key,value] of Object.entries(h.input))split[inputRole(key)][key]=value;
  // Derived installation properties expose accidental mission-to-hardware
  // coupling even if an input was misclassified. They contain no workload rate.
  const installed={interfaceVersion:'ODC-01 Rev I / model 21.0',energyInterfaces:h.energySystem?{electrical:h.energySystem.electrical,thermal:h.energySystem.thermal,coldControl:h.energySystem.coldControl}:null,computeInterfaces:h.serviceArchitecture?{trays:h.serviceArchitecture.compute.trayCount,extraHostModules:h.serviceArchitecture.compute.extraHostModules,hostRamGB:h.serviceArchitecture.compute.hostRamGB,fabric:h.serviceArchitecture.fabric}:null,inputs:split.hardware,topology:'ODC-01 · four wings / two radiators / two engines / four CMGs',trays:h.trays,chips:h.chips,memoryGB:h.memoryGB,storageTB:h.storageTB,solarM2:h.solarM2,radiatorM2:h.radiatorM2,batteryKWh:h.batteryKWh,propellantKg:h.propellantKg,bodyM:[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM],dryKg:h.dryKg,tankVolumeL:h.tankVolumeL,massLedger:h.massLedger.filter(r=>r.group!=='Launch only').map(r=>({id:r.id,kg:r.kg}))};
  return {schema:'odc-design-contract/1',revision:designContractRevision,vehicleId:'VEH-'+digest(installed),missionId:'MIS-'+digest(split.mission),analysisId:'ANA-'+digest({assumption:split.assumption,policy:split.policy}),installed,mission:split.mission,analysisBasis:split.assumption,controlledAllowances:split.policy};
}
export function classifyChanges(before,after){
  const out={hardware:[],mission:[],assumption:[],policy:[]};
  for(const key of new Set([...Object.keys(before),...Object.keys(after)]))if(before[key]!==after[key])out[inputRole(key)].push(key);
  return out;
}
