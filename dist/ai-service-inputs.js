// Independent of the spacecraft model so the simulator and service replay share one route policy.
const number=(key,label,unit,min,max,step,value)=>({group:'Earth service',key,label,unit,min,max,step,value});
const select=(key,label,options,value)=>({group:'Earth service',key,label,options,value});
export const serviceControls=[
 number('serviceOffersPerHour','Offered Earth requests or jobs','/h',.001,36000,.1,120),
 number('serviceConcurrency','Concurrent service slots','slots',1,65536,1,32),
 number('serviceDeadlineS','Earth receipt deadline from offer','s',.05,7776000,.1,30),
 number('ttftTargetS','Earth time-to-first-token objective','s',.01,86400,.05,2),
 number('streamGapTargetS','Maximum Earth streaming gap','s',.005,3600,.005,.2),
 number('targetStreamTps','Minimum sustained text rate per Earth stream','tok/s',.01,10000,.1,15),
 number('liveQualityFraction','Expected useful text or intelligible voice fraction','fraction',0,1,.01,.95),
 number('voiceFirstAudioTargetS','Speech end to first audible reply','s',.02,300,.02,.8),
 number('voiceInterruptionTargetS','Interruption to silence objective','s',.02,60,.02,.35),
 number('audioChunkMs','Encoded voice packet duration','ms',2.5,120,2.5,20),
 number('vadEndpointMs','Voice end-of-speech detection','ms',0,5000,10,180),
 number('voicePlaybackBufferMs','Audio playout buffer','ms',0,2000,5,60),
 number('batchResultSwing','Alternating batch result size ± about mean','fraction',0,.99,.01,.4),
 number('batchQualityFraction','Expected accepted batch fraction','fraction',0,1,.01,.95),
 number('agentVerifyFraction','Expected verifier acceptance','fraction',0,1,.01,.8),
 number('agentSerialSteps','Serial model stages per task','stages',1,200,1,4),
 number('earthToolFraction','Fraction of tools on Earth','fraction',0,1,.05,.5),
 number('toolRttS','Remote tool execution and gateway time','s',0,86400,.05,.4),
 number('humanSteeringS','Human review per agent task','s',0,2592000,1,0),
 select('trainingCalibration','Validation evidence',{none:'No matched calibration',measured:'Matched validation at token budget'},'none'),
 number('validationTarget','Required validation score (higher is better)','score',0,1,.001,.8),
 number('validationObserved','Calibrated score at target budget','score',0,1,.001,0),
 number('validationBaseline','Base model validation score','score',0,1,.001,0),
 select('baseCompatible','Earth receiver has exact base',{yes:'Compatible version present',no:'Base absent or incompatible'},'yes'),
 select('artifactKind','Earth artifact',{adapter:'Adapter delta',full:'Updated model weights',restart:'Restartable training checkpoint'},'adapter'),
 number('checkpointBytesPerParam','Full restart state size','B/parameter',.5,64,.5,14),
 number('corpusTokenBytes','Pretokenized corpus size','B/token',1,32,1,4),
 select('serviceRoute','Earth service path',{direct:'Direct ground contacts',relay:'Allocated relay interface',hybrid:'Relay with direct fallback'},'direct'),
 number('relayUpMbps','Allocated relay uplink goodput','Mbit/s',.001,200000,1,50),
 number('relayDownMbps','Allocated relay downlink goodput','Mbit/s',.001,200000,1,200),
 number('relayAvailability','Scheduled relay availability','fraction',0,1,.005,.95),
 number('relayCycleS','Relay service repeat period','s',10,86400,1,600),
 number('relayHandoverS','Handover outage per relay cycle','s',0,86400,.1,35),
 number('relayRttMs','Relay path round-trip delay','ms',.1,10000,1,80),
 number('groundEdgeMs','Earth gateway processing one way','ms',0,10000,1,15),
 number('earthITKw','Comparable Earth system IT input','kW',.001,1e7,.1,24),
 number('earthUsefulPerHour','Earth completions at same task size','/h',.000001,1e9,.01,100),
 number('earthPUE','Earth facility PUE','ratio',1,5,.01,1.2),
 number('earthQualityFraction','Earth quality acceptance','fraction',0,1,.01,.95),
 number('earthDeadlineFraction','Earth on-time fraction among accepted','fraction',0,1,.01,.99),
 number('earthEnergyPrice','Earth electricity tariff','USD/kWh',0,10,.01,.12),
 number('spaceEnergyPrice','Assigned flight-energy price','USD/kWh',0,1000,.01,0)
];
export const serviceDefaults=Object.fromEntries(serviceControls.map(c=>[c.key,c.value]));
// The one optical payload terminal must reacquire before each scheduled relay
// window. This uses the existing 35 s optical acquisition allocation in the
// link model. A provider-qualified make-before-break interface has not been
// selected, so a shorter user handover cannot silently remove acquisition.
export const relayAcquisitionS=35;
export function relayTiming(d={}){
 const cycleS=Number.isFinite(d.relayCycleS)&&d.relayCycleS>0?d.relayCycleS:null;
 const scheduledAvailability=Number.isFinite(d.relayAvailability)?Math.max(0,Math.min(1,d.relayAvailability)):0;
 const configuredHandoverS=Number.isFinite(d.relayHandoverS)?Math.max(0,d.relayHandoverS):0;
 const onS=Math.max(relayAcquisitionS,configuredHandoverS),offS=cycleS===null?0:cycleS*scheduledAvailability;
 const usableS=Math.max(0,offS-onS),usableFraction=cycleS===null?0:usableS/cycleS;
 return {cycleS,scheduledAvailability,configuredHandoverS,acquisitionS:relayAcquisitionS,onS,offS,usableS,usableFraction,
  longestOutageS:usableS>0?cycleS-usableS:null,
  status:cycleS===null?'unassessed':usableS>0?'allocated':'no_access'};
}
export function relayGate(t,d){
 const {cycleS:T,onS,offS}=relayTiming(d);
 if(T===null||!Number.isFinite(t)||onS>=offS)return false;
 const phase=((t%T)+T)%T;
 return phase>=onS&&phase<offS;
}
export function relayBoundaries(start,end,d){
 const out=[],{cycleS:T,onS:on,offS:off}=relayTiming(d);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||!Number.isFinite(T)||T<=0||on>=off||on===0&&off===T)return out;
 for(let n=Math.floor(start/T);n<=Math.floor(end/T);n++)for(const x of [n*T+on,n*T+off])if(x>start&&x<end)out.push(x);
 return out;
}
