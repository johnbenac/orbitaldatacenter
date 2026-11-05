// Decimal storage and line rates. User-editable design scenarios, not benchmarks.
const profile=(id,label,unit,description,fields,suggestedBuild)=>Object.freeze({
 id,label,unit,description,fields:Object.freeze(fields.split(' ')),suggestedBuild:Object.freeze(suggestedBuild)
});
export const aiPurposes=Object.freeze({
 text:profile('text','Live text inference','request','Earth users send prompts and receive decoded text. First-token delay, cadence and return-path availability matter.','requiredTps promptTokens outputTokens context batch bytesPerToken customerUplinkMbps',{workload:'llama8',compute:'flight',launcher:'glenn',launchAllowanceKg:20000,trayCount:12,solarM2:190,radiatorM2:65,batteryKWh:40,storageTB:8,serviceOffersPerHour:3600,serviceConcurrency:32,initialInputGB:16}),
 voice:profile('voice','Live voice inference','turn','Compressed audio travels in both directions. One turn includes acoustic processing, language inference and speech synthesis.','voiceAudioKbps voiceTurnSeconds audioChunkMs batch serviceConcurrency customerUplinkMbps',{workload:'llama8',compute:'flight',trayCount:8,hostCores:96,fabricGbps:50,solarM2:160,radiatorM2:48,batteryKWh:32,storageTB:8,batch:2,promptTokens:192,outputTokens:96,voiceAudioKbps:24,voiceTurnSeconds:4,audioChunkMs:20,serviceOffersPerHour:1800,serviceConcurrency:16,serviceRoute:'relay',initialInputGB:.5}),
 batch:profile('batch','Batch inference','job','Queued files traverse ground access and local staging storage. Completed output objects return within the batch deadline.','batchInputMB batchResultMB batch diskRead diskWrite inputSpoolGB serviceDeadlineS',{workload:'llama8',compute:'trillium',launcher:'glenn',launchAllowanceKg:20000,trayCount:16,hostCores:64,fabricGbps:50,solarM2:270,radiatorM2:95,batteryKWh:60,storageTB:24,batch:24,bulkMbps:.05,batchInputMB:2,batchResultMB:.1,serviceOffersPerHour:240,serviceConcurrency:48,serviceDeadlineS:86400,initialInputGB:.5,inputSpoolGB:80}),
 agents:profile('agents','Agentic research or engineering','task','Serial model calls alternate with tools, local I/O and possible Earth interactions before a final research result is returned.','agentSerialSteps agentFanout agentMessageKB toolsPerTask toolCpuSeconds toolIOMB earthToolFraction hostCores fabricGbps context',{workload:'llama70',compute:'flight',launcher:'glenn9',launchAllowanceKg:40000,trayCount:24,hostCores:384,fabricGbps:200,solarM2:470,radiatorM2:165,batteryKWh:120,storageTB:32,context:16384,batch:4,agentSerialSteps:8,agentFanout:12,agentMessageKB:64,toolsPerTask:6,toolCpuSeconds:1,toolIOMB:8,serviceOffersPerHour:1,serviceConcurrency:1,serviceDeadlineS:7200,initialInputGB:.1}),
 finetune:profile('finetune','Fine-tuning','training token','A resident base is adapted to customer data. The order ends with an adapter or other selected artifact delivered to Earth.','trainableFraction fineTuneTokensM trainingBudgetDays artifactReturnHours datasetGB artifactKind artifactBits baseCompatible trainingStateBytes fabricGbps',{workload:'llama8',compute:'flight',trayCount:4,hostCores:32,fabricGbps:100,solarM2:95,radiatorM2:31,batteryKWh:24,storageTB:8,trainableFraction:.001,fineTuneTokensM:5,datasetGB:.02,initialInputGB:.02,inputSpoolGB:1,trainingBudgetDays:30,serviceDeadlineS:2592000,artifactBits:16,artifactKind:'adapter',baseCompatible:'yes',bulkMbps:0,initialQueueGB:0,duty:.75}),
 pretrain:profile('pretrain','Pretraining or continued training','training token','All parameters and optimizer shards must fit. Compute scales with active parameters. The complete trained artifact must be returned to Earth.','pretrainParamsB activeParamFraction trainingTokensB trainingBudgetDays artifactReturnHours datasetGB trainingStepTokens fabricGbps artifactBits checkpointBytesPerParam',{compute:'dgx',launcher:'glenn9',trayCount:40,hostCores:640,fabricGbps:400,solarM2:4200,radiatorM2:1450,batteryKWh:1100,storageTB:96,propellantKg:5500,launchAllowanceKg:60000,pretrainParamsB:1000,activeParamFraction:1,trainingStateBytes:18,activationFraction:.25,trainingTokensB:1000,trainingStepTokens:262144,trainingBudgetDays:60,serviceDeadlineS:5184000,datasetGB:4000,initialInputGB:4000,artifactKind:'restart',artifactBits:16,checkpointBytesPerParam:14,bulkMbps:0,initialQueueGB:0,link:'optical',duty:.90})
});
const inputs=[
 ['voiceAudioKbps','Encoded audio per direction','kbit/s',2,512,1,24],['voiceTurnSeconds','Audio duration per direction per turn','s',.1,600,.1,4],
 ['batchInputMB','Input file per batch job','MB',.001,1e5,.01,2],['batchResultMB','Result file per batch job','MB',.001,1e5,.01,.1],
 ['agentFanout','Agents per stage of one assignment','agents',1,65536,1,4],['agentMessageKB','Internal traffic per agent per stage','kB',0,1e6,1,64],
 ['toolsPerTask','Tool calls per agent per assignment','calls',0,200,1,6],['toolCpuSeconds','CPU core time per tool call','core·s',.001,1000,.1,.5],['toolIOMB','Local read/write per tool call','MB',0,1e5,.1,4],
 ['hostCores','Installed host CPU cores','cores',1,65536,1,96],['fabricGbps','Usable collective bandwidth per worker','Gbit/s',.01,3200,1,25],
 ['trainingStateBytes','Training state per updated parameter','B/param',4,64,.5,18],['trainableFraction','Adapter parameters / base parameters','fraction',.00001,1,.0001,.001],['activationFraction','Activation reserve / training state','fraction',.01,3,.01,.25],
 ['pretrainParamsB','Pretraining total parameters','billion',.001,4000,1,1000],['activeParamFraction','Active / total parameters per token','fraction',.001,1,.01,1],
 ['trainingTokensB','Pretraining token order','billion tokens',.000001,1e6,.001,1000],['fineTuneTokensM','Fine-tuning token order','million tokens',.001,1e7,.01,5],['trainingStepTokens','Global tokens per optimizer step','tok',128,8388608,128,32768],
 ['artifactReturnHours','Maximum post-release artifact return time','h',.01,8760,.25,24],['trainingBudgetDays','Customer training budget','days',.01,3650,1,30],['datasetGB','Required local training corpus','GB',.00001,1e7,.01,4000],
 ['checkpointIntervalH','Local restart save interval','active h',.05,168,.5,6],['artifactBits','Full-model export precision','bit/param',2,32,1,16],
 ['customerUplinkMbps','Customer uplink rate cap','Mbit/s',.001,1e5,.1,2],['initialInputGB','Customer input preloaded at launch','GB',0,1e7,.1,16],['inputSpoolGB','Reserved input spool','GB',.01,1e7,.1,32]
];
export const aiControls=[{group:'AI mission',key:'aiPurpose',label:'Earth customer service',options:Object.fromEntries(Object.entries(aiPurposes).map(([k,p])=>[k,p.label])),value:'text'},...inputs.map(([key,label,unit,min,max,step,value])=>({group:'AI service hardware',key,label,unit,min,max,step,value}))];
export function purposeSizing(d,g){
 const p=aiPurposes[d.aiPurpose]||aiPurposes.text,training=['finetune','pretrain'].includes(p.id),pre=p.id==='pretrain',P=pre?d.pretrainParamsB:d.paramsB;
 const activeP=P*d.activeParamFraction,trainableP=P*(pre?1:d.trainableFraction),totalWeightGB=P*d.artifactBits/8,adapterGB=P*d.trainableFraction*2;
 const residentWeights=pre?2*P:g.modelGB,restartGB=pre?P*d.checkpointBytesPerParam:trainableP*d.checkpointBytesPerParam;
 const stateGB=pre?P*d.trainingStateBytes:g.modelGB+trainableP*d.trainingStateBytes;
 const modelMemoryGB=training?stateGB*(1+d.activationFraction):g.modelGB+g.kvGB+2;
 const memoryMarginGB=g.memoryGB-modelMemoryGB,trainingGoalTokens=training?(pre?d.trainingTokensB*1e9:d.fineTuneTokensM*1e6):0;
 const artifactGB=d.artifactKind==='restart'?restartGB:d.artifactKind==='adapter'?adapterGB:totalWeightGB;
 const corpusGB=training?d.datasetGB:0,requestedInputGB=training?corpusGB:d.inputSpoolGB;
 const scratchGB=p.id==='agents'?d.toolsPerTask*d.toolIOMB*Math.min(g.sessions,d.serviceConcurrency*d.agentFanout)/1000:0;
 const inputCapacityGB=Math.min(requestedInputGB,Math.max(0,g.usableTB*1000-residentWeights-d.retainedGB-scratchGB-(training?restartGB:0))),preloadedGB=Math.min(inputCapacityGB,d.initialInputGB);
 const reservedStorageGB=requestedInputGB+scratchGB+(training?restartGB:0),requiredStorageGB=residentWeights+reservedStorageGB+d.retainedGB+(training?artifactGB:0);
 const storageMarginGB=g.usableTB*1000-requiredStorageGB,fit=memoryMarginGB>=0&&storageMarginGB>=0;
 const shardCount=Math.max(1,Math.ceil(modelMemoryGB/d.chipGB)),workers=training?g.trays:Math.ceil(shardCount/d.chipsPerTray),portGBs=d.fabricGbps/8;
 const trainComputeS=6*activeP*1e9*d.trainingStepTokens/(g.tflops*1e12);
 const collectiveS=training&&workers>1?2*(1-1/workers)*(trainableP*2)/portGBs:0;
 const fabricEfficiency=training?trainComputeS/(trainComputeS+collectiveS):1/(1+.12*Math.max(0,workers-1)*100/d.fabricGbps);
 const optimizerTps=training&&fit?Math.min(d.trainingStepTokens/(trainComputeS+collectiveS),g.readGBs*1e9/d.corpusTokenBytes):0;
 const saveTimeS=restartGB/g.writeGBs,activeTrainingTps=optimizerTps/(1+saveTimeS/(d.checkpointIntervalH*3600));
 const hostKw=({text:0,voice:.3,batch:.14,agents:1,finetune:.36,pretrain:.7}[p.id])*d.hostCores*.012;
 const fabricKw=(training||p.id==='agents')?Math.max(0,g.trays-1)*(.025+.00025*d.fabricGbps):0;
 const agents=p.id==='agents',steps=agents?Math.max(1,d.agentSerialSteps):1,fanout=agents?Math.max(1,Math.ceil(d.agentFanout)):1,codec=p.id==='voice'?1.35:1;
 const workerSlots=g.sessions,waves=workerSlots>0?Math.ceil(fanout/workerSlots):0,calls=steps*fanout,toolCalls=agents?Math.ceil(d.toolsPerTask*fanout):0;
 const callsPerSec=g.tokensPerSec*fabricEfficiency/(d.outputTokens*codec);
 const serialModelSeconds=callsPerSec>0?steps*waves*workerSlots/callsPerSec:null;
 const internalBytesPerTask=agents?fanout*steps*d.agentMessageKB*1000:0,fabricSecondsPerTask=internalBytesPerTask/(portGBs*1e9);
 const modelOnlyUnitsPerSec=training?activeTrainingTps:Math.min(callsPerSec/calls,agents&&serialModelSeconds>0?d.serviceConcurrency/serialModelSeconds:Infinity);
 const localTools=toolCalls*(1-d.earthToolFraction),cpuSeconds=localTools*d.toolCpuSeconds/d.hostCores,ioSeconds=localTools*d.toolIOMB/(g.readGBs*1000);
 const singleCampaignSeconds=serialModelSeconds===null?null:serialModelSeconds+fabricSecondsPerTask+cpuSeconds+ioSeconds;
 let activeUnitsPerSec=modelOnlyUnitsPerSec;
 if(agents)activeUnitsPerSec=Math.min(activeUnitsPerSec,cpuSeconds>0?1/cpuSeconds:Infinity,ioSeconds>0?1/ioSeconds:Infinity,fabricSecondsPerTask>0?1/fabricSecondsPerTask:Infinity,singleCampaignSeconds>0?d.serviceConcurrency/singleCampaignSeconds:0);
 if(p.id==='batch')activeUnitsPerSec=Math.min(activeUnitsPerSec,g.readGBs*1000/d.batchInputMB,g.writeGBs*1000/d.batchResultMB);
 if(!fit)activeUnitsPerSec=0;
 const text=p.id==='text'||p.id==='agents',inputBytesPerUnit=training?d.corpusTokenBytes:p.id==='voice'?d.voiceAudioKbps*125*d.voiceTurnSeconds:p.id==='batch'?d.batchInputMB*1e6:d.promptTokens*d.bytesPerToken;
 const outputBytesPerUnit=training?0:p.id==='voice'?d.voiceAudioKbps*125*d.voiceTurnSeconds:p.id==='batch'?d.batchResultMB*1e6:d.outputTokens*d.bytesPerToken;
 const tokensPerUnit=training?0:d.outputTokens*calls,flopsPerUnit=(training?6:2)*activeP*1e9*(training?1:calls*(d.outputTokens+d.promptTokens)*codec),requiredRate=training?trainingGoalTokens/(d.trainingBudgetDays*86400):d.serviceOffersPerHour/3600;
 return {purposeId:p.id,label:p.label,training,unit:p.unit,agentFanout:fanout,agentWorkerSlots:workerSlots,agentWaves:waves,agentCallsPerTask:calls,agentToolCalls:toolCalls,internalBytesPerTask,fabricSecondsPerTask,serialModelSeconds,singleCampaignSeconds,modelOnlyUnitsPerSec,activeUnitsPerSec,activeTrainingTps,optimizerTps,modelParamsB:P,activeParamsB:activeP,modelMemoryGB,installedMemoryGB:g.memoryGB,memoryMarginGB,reservedStorageGB,requiredStorageGB,storageMarginGB,fabricEfficiency,hostKw,fabricKw,inputBytesPerUnit,outputBytesPerUnit,tokensPerUnit,text,trainingGoalTokens,artifactGB,artifactValid:!(pre&&d.artifactKind==='adapter'),flopsPerUnit,usefulTflops:activeUnitsPerSec*flopsPerUnit/1e12,deployableArtifact:(d.artifactKind!=='adapter'||(!pre&&d.baseCompatible==='yes')),adapterGB,totalWeightGB,residentWeights,restartGB,corpusGB,uniqueCorpusGB:trainingGoalTokens*d.corpusTokenBytes/1e9,epochEquivalents:training?trainingGoalTokens*d.corpusTokenBytes/1e9/d.datasetGB:0,inputCapacityGB,preloadedGB,requiredRate,minimumTrays:Math.max(1,Math.ceil(shardCount/d.chipsPerTray)),trainingDays:activeTrainingTps*d.duty>0?trainingGoalTokens/(activeTrainingTps*d.duty*86400):null,saveTimeS,checkpointIntervalS:d.checkpointIntervalH*3600,fit};
}
