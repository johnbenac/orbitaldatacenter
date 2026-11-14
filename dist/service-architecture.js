import {architectureFamily} from './architecture-families.js';
import {installedCommunications} from './communications-packages.js';
import {redwirePayloadTransferPolicy,redwirePayloadTransferAllocation} from './redwire-payload-transfer.js';
// ODC payload and Earth-service interfaces. All installation quantities below
// depend on installed inputs only; mission demand is evaluated in placement/route.
// Mass, power and 80% usable-rate factors are controlled preliminary allocations.
// They are not supplier flight qualifications or universal resource margins.
import {relayTiming,relayGate} from './ai-service-inputs.js';

export const serviceArchitectureRevision='ODC-SA-001 Rev A';
export const serviceDesignSources=Object.freeze([
 {id:'sa-fabric',name:'NVIDIA Quantum-2 QM97xx hardware manual',url:'https://networking-docs.nvidia.com/qm97x0hw',note:'Terrestrial 400 Gbit/s InfiniBand precedent. ODC selects a 32-port flight packaging allocation; its mass, cooling, radiation and firmware require separate evidence.'},
 {id:'sa-tray',name:'NVIDIA DGX H100/H200 hardware overview',url:'https://docs.nvidia.com/dgx/dgxh100-user-guide/introduction-to-dgxh100.html',note:'The H100 reference includes eight GPUs, 112 CPU cores, host memory and network cards in its complete chassis and power boundary. These embedded resources are not added a second time.'},
 {id:'sa-optical',name:'NASA / MIT Lincoln Laboratory TBIRD architecture',url:'https://ntrs.nasa.gov/citations/20230005711',note:'1550 nm direct-to-ground optical transport precedent with buffered data and retransmission. It does not establish compatibility with a relay provider.'},
 {id:'sa-field',name:'SpaceX Starmind architecture overview',url:'https://new.spacex.com/spacexai/starmind',note:'Public precedent for integrating the compute unit and its Earth-service route. ODC has no committed provider or compatible terminal certification.'}
]);

export const serviceDesignBasis=Object.freeze({
 id:serviceArchitectureRevision,
 status:'Selected preliminary design allocations; verification open',
 switchPorts:32,
 leafEndpointPorts:16,
 leafUplinkPorts:16,
 maxLeaves:32,
 maxSpines:16,
 portClassesGbps:Object.freeze([25,50,100,200,400]),
 usableLineFraction:.80,
 cableRunM:6,
 interswitchRunM:2,
 maxCoreLengthM:12,
 drivesPerController:8,
 storageControllerPortGbps:100,
 extraHostModuleCores:16,
 extraHostModuleRamGB:64,
 extraHostModuleKg:2.4,
 extraHostModuleIdleKW:.030,
 extraHostModuleActiveKW:.192,
 opticalModemLineMbps:2000,
 opticalCustomerAllocationMbps:1600,
 gatewayLineMbps:10000,
 referenceLifeYears:5,
 commandHoldRequirementH:24,
 engineeringHistoryRequirementH:72
});

const finite=Number.isFinite;
const nn=(v,fallback=0)=>finite(v)?Math.max(0,v):fallback;
const integer=(v,fallback=0)=>Math.ceil(nn(v,fallback));
const choosePort=requested=>serviceDesignBasis.portClassesGbps.find(p=>p*serviceDesignBasis.usableLineFraction>=requested)??400;
const powerOfTwo=n=>2**Math.ceil(Math.log2(Math.max(1,n)));
const gcd=(a,b)=>{while(b){const t=b;b=a%b;a=t;}return a;};
const esc=v=>String(v??'Unassessed').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const fmt=(v,d=1)=>finite(v)?v.toLocaleString('en-US',{maximumFractionDigits:d}):'Unassessed';

function payloadPlacement(h,compute,fabric){
 const d=h.input||{},a=h.ai||{},training=typeof a.training==='boolean'?a.training:['finetune','pretrain'].includes(d.aiPurpose);
 const totalMemory=compute.acceleratorMemoryGB,deviceGB=compute.memoryPerAcceleratorGB;
 const state=finite(a.modelMemoryGB)?a.modelMemoryGB:null;
 if(state===null||!finite(totalMemory)||deviceGB<=0||compute.acceleratorCount<=0)return {status:'unassessed',training,modelMemoryGB:state,largestShardGB:null,shardsPerReplica:null,replicas:null,occupiedDevices:null,totalResidentGB:null,localMemoryFits:null,runtimeEvidence:'Open: application partition, allocator peaks and transport measurements are required.'};
 // A contiguous, evenly balanced placement is an explicit preliminary mapping.
 // Kernel/allocator peaks and the actual application's supported partition are
 // still separate evidence; aggregate capacity cannot close those conditions.
 const shards=training?compute.acceleratorCount:Math.max(1,Math.ceil(state/deviceGB));
 const replicas=training?1:finite(h.replicas)?Math.max(0,Math.floor(h.replicas)):Math.floor(compute.acceleratorCount/shards);
 const reservedReplicas=Math.max(1,replicas),occupiedDevices=shards*reservedReplicas;
 const perTray=Math.max(1,compute.acceleratorsPerTray);
 let maxTraySpan=training?compute.trayCount:0;
 if(!training){
  const alignments=Math.min(reservedReplicas,perTray/gcd(perTray,shards));
  for(let k=0;k<alignments;k++)maxTraySpan=Math.max(maxTraySpan,Math.floor(((k*shards)%perTray+shards-1)/perTray)+1);
 }
 const largestShardGB=state/shards,totalResidentGB=state*reservedReplicas;
 const localMemoryFits=largestShardGB<=deviceGB&&occupiedDevices<=compute.acceleratorCount&&totalResidentGB<=totalMemory;
 const usefulGBs=fabric.effectivePerWorkerGbps/8;
 const trainableP=nn(a.modelParamsB,nn(d.pretrainParamsB,d.paramsB))*(d.aiPurpose==='pretrain'?1:nn(d.trainableFraction,1));
 const gradientGB=training?2*trainableP:0,workers=Math.max(1,compute.trayCount);
 const ringBytesPerWorkerGB=training&&workers>1?2*(1-1/workers)*gradientGB:0;
 return {status:localMemoryFits?'allocated':'shortfall',training,modelMemoryGB:state,largestShardGB,shardsPerReplica:shards,replicas,reservedReplicas,occupiedDevices,totalResidentGB,localMemoryFits,maxTraySpan,
  mapping:training?'Even state shards across all installed devices; local shards remain on this spacecraft.':'Contiguous accelerator ranges for each replica; each range maps to installed trays.',
  workerBoundary:'One tray is one inter-tray collective worker; devices inside a tray use its included local interconnect.',
  gradientGB,ringBytesPerWorkerGB,collectiveLowerBoundS:ringBytesPerWorkerGB===0?0:usefulGBs>0?ringBytesPerWorkerGB/usefulGBs:null,
  effectiveWorkerGBs:usefulGBs,runtimeEvidence:'Open: the chosen application must support this partition and measured local allocator/kernel peaks within each device.'};
}

export function serviceArchitecture(h={}){
 const d=h.input||{},b=serviceDesignBasis;
 const trays=integer(h.trays,nn(d.trayCount)),perTray=integer(d.chipsPerTray),chips=integer(h.chips,trays*perTray);
 const modules=integer(h.modules,nn(d.diskModuleTB)>0?Math.ceil(nn(d.storageTB)/d.diskModuleTB):0);
 const deviceGB=nn(d.chipGB),memoryGB=Object.hasOwn(h,'memoryGB')?(finite(h.memoryGB)?Math.max(0,h.memoryGB):null):chips*deviceGB,storageTB=nn(h.storageTB,modules*nn(d.diskModuleTB));
 const dgx=d.compute==='dgx',knownProfile=['flight','trillium','dgx'].includes(d.compute);
 const embeddedCoresPerTray=dgx?112:8,embeddedHostCores=trays*embeddedCoresPerTray,allocatedHostCores=integer(d.hostCores);
 const extraHostModules=Math.ceil(Math.max(0,allocatedHostCores-embeddedHostCores)/b.extraHostModuleCores);
 const embeddedHostRamGBPerTray=dgx?2000:32;
 const compute={
  trayId:dgx?'ODC-DGX-H100 adaptation':d.compute==='trillium'?'ODC-TPU tray':'ODC-ACC tray',
  trayCount:trays,acceleratorsPerTray:perTray,acceleratorCount:chips,memoryPerAcceleratorGB:deviceGB,acceleratorMemoryGB:memoryGB,
  embeddedCoresPerTray,embeddedHostCores,allocatedHostCores,extraHostModules,installedHostCores:embeddedHostCores+extraHostModules*b.extraHostModuleCores,
  embeddedHostRamGBPerTray,extraHostRamGB:extraHostModules*b.extraHostModuleRamGB,hostRamGB:trays*embeddedHostRamGBPerTray+extraHostModules*b.extraHostModuleRamGB,
  extraHostMassKg:extraHostModules*b.extraHostModuleKg,extraHostIdleKW:extraHostModules*b.extraHostModuleIdleKW,extraHostActiveKW:extraHostModules*b.extraHostModuleActiveKW,
  trayElectricalKW:nn(d.trayKw),trayIdleKW:nn(d.trayIdleKw),totalTrayElectricalKW:nn(h.acceleratorKw,trays*nn(d.trayKw)),
  trayPowerBoundary:dgx?'Complete reference server including its embedded CPUs, memory and internal NICs. The DC/cold-plate conversion is an unqualified adaptation.':'Accelerator boards, embedded 8-core/32 GB host, local interconnect and tray carrier. External fabric and additional host modules are separate.',
  powerInterface:'48 V regulated payload branch; conversion is owned by the electrical architecture.',
  thermalInterface:'Conduction through individual tray cold plates to the selected fluid manifold.',
  coldPlateLimitK:finite(d.coldPlateOpMaxK)?d.coldPlateOpMaxK:null,
  mountingInterface:'Repeated carrier in the common rack lattice; one disconnectable electrical/data/coolant interface set per tray.',
  storageModules:modules,storageTB,usableStorageTB:nn(h.usableTB,storageTB*(1-nn(d.diskReserve))),
  knownProfile,referenceMatch:!dgx||perTray===8&&deviceGB===80&&Math.abs(nn(d.trayKw)-10.2)<1e-8,
  evidence:dgx?'Terrestrial server reference. Flight power, radiation and liquid-cooling adaptation remain open.':'Controlled project allocation. Source devices do not qualify the complete flight tray.'
 };
 const requested=nn(d.fabricGbps),endpointPortGbps=choosePort(requested),storageControllers=trays>0?Math.max(1,Math.ceil(modules/b.drivesPerController)):0;
 const gatewayPorts=trays>0?2:0,endpointCount=trays+storageControllers+gatewayPorts;
 const single=endpointCount<=b.switchPorts;
 const leafCount=endpointCount===0?0:single?1:Math.ceil(endpointCount/b.leafEndpointPorts);
 const spineCount=single?0:Math.min(b.maxSpines,powerOfTwo(Math.ceil(leafCount/2)));
 const linksPerLeafSpine=spineCount>0?Math.floor(b.leafUplinkPorts/spineCount):0;
 const uplinksPerLeaf=spineCount*linksPerLeafSpine,interswitchLinks=leafCount*uplinksPerLeaf;
 const maxSpinePortDemand=leafCount*linksPerLeafSpine,switchCount=leafCount+spineCount;
 const usedSwitchPorts=endpointCount+2*interswitchLinks,availableSwitchPorts=switchCount*b.switchPorts;
 const topologyRatio=spineCount>0?Math.min(1,spineCount*b.switchPorts/Math.max(1,interswitchLinks)):1;
 const portUsableGbps=endpointPortGbps*b.usableLineFraction,effectivePerWorkerGbps=Math.min(requested,portUsableGbps*topologyRatio);
 const fabricLineSupported=requested<=portUsableGbps+1e-9;
 const topologySupported=trays>0&&leafCount<=b.maxLeaves&&spineCount<=b.maxSpines&&maxSpinePortDemand<=b.switchPorts&&usedSwitchPorts<=availableSwitchPorts;
 const storagePortGbps=Math.min(endpointPortGbps,b.storageControllerPortGbps);
 const storageLinkGBs=storageControllers*storagePortGbps*b.usableLineFraction/8;
 const diskReadGBs=nn(h.diskReadGBs,modules*nn(d.diskRead)),diskWriteGBs=nn(h.diskWriteGBs,modules*nn(d.diskWrite));
 const cablesM=endpointCount*b.cableRunM+interswitchLinks*b.interswitchRunM;
 const endpointNICs=dgx?0:trays; // The DGX reference already includes its NICs.
 const rotaryOptics=architectureFamily(h).id==='redwire-platform'?redwirePayloadTransferAllocation({trayCount:trays,endpointPortGbps}):null;
 const workerOptics=rotaryOptics?{id:'redwire-lr4-endpoints',wbs:'01.05',moduleCount:rotaryOptics.workerOpticsCount,unitMassKg:redwirePayloadTransferPolicy.workerOpticsMassKgPerModule,massKg:rotaryOptics.workerOpticsMassKg,powerW:rotaryOptics.workerOpticsPowerW,powerWPerModule:redwirePayloadTransferPolicy.workerOpticsPowerWPerModule,moduleDimensionsM:[.020,.015,.080],interface:redwirePayloadTransferPolicy.opticalInterface,sourceUrls:redwirePayloadTransferPolicy.sourceUrls.filter(url=>url.includes('nvidia.com')),massBasis:redwirePayloadTransferPolicy.opticsMassBasis,powerBasis:'Full 3.5 W maximum per powered LR4 module is carried at idle and active load. Existing switch/NIC allocations retain their electronics and cages; no historical transceiver credit is subtracted.'}:null;
 const switchMassKg=switchCount*5+usedSwitchPorts*.025,endpointNICMassKg=endpointNICs*.18,controllerMassKg=storageControllers*.7,cableMassKg=cablesM*.020;
 const idleKW=(switchCount*35+usedSwitchPorts*(1+.0125*endpointPortGbps)+endpointNICs*3+storageControllers*8+(workerOptics?.powerW||0))/1000;
 const activeKW=(switchCount*70+usedSwitchPorts*(1.8+.035*endpointPortGbps)+endpointNICs*(5+.05*endpointPortGbps)+storageControllers*25+(workerOptics?.powerW||0))/1000;
 const fabric={
  id:'ODC-FAB-32',topology:single?'Single-stage switched fabric':'Three-stage leaf–spine fabric',protocol:'RDMA-capable packet fabric; flight implementation and firmware qualification open',
  requestedPerWorkerGbps:requested,endpointPortGbps,usableFraction:b.usableLineFraction,portUsableGbps,effectivePerWorkerGbps,
  switchPorts:b.switchPorts,leafEndpointPorts:single?b.switchPorts:b.leafEndpointPorts,leafCount,spineCount,switchCount,linksPerLeafSpine,uplinksPerLeaf,interswitchLinks,
  edgePortCount:endpointCount,computePorts:trays,storageControllers,gatewayPorts,usedSwitchPorts,availableSwitchPorts,maxSpinePortDemand,
  oneWayBisectionGbps:Math.floor(trays/2)*portUsableGbps*topologyRatio,allocatedBisectionGbps:Math.floor(trays/2)*effectivePerWorkerGbps,
  switchMassKg,endpointNICMassKg,controllerMassKg,cableMassKg,workerOptics,massKg:switchMassKg+endpointNICMassKg+controllerMassKg+cableMassKg+(workerOptics?.massKg||0),
  idleKW,activeKW,incrementalActiveKW:Math.max(0,activeKW-idleKW),storageLinkGBs,storageReadGBs:Math.min(diskReadGBs,storageLinkGBs),storageWriteGBs:Math.min(diskWriteGBs,storageLinkGBs),
  storagePerDirectionGBs:storageLinkGBs,sharedStorageDuplexGBs:2*storageLinkGBs,cableAllocationM:cablesM,maxEdgeCableM:b.cableRunM,topologySupported,fabricLineSupported,
  geometrySupported:finite(h.bodyLengthM)?h.bodyLengthM<=b.maxCoreLengthM:null,
  supported:topologySupported&&fabricLineSupported&&(!finite(h.bodyLengthM)||h.bodyLengthM<=b.maxCoreLengthM),
  marginMeaning:'80% is a payload/protocol efficiency allocation, not a NASA percentage margin.',
  massPowerBasis:'Per switch: 5 kg plus 0.025 kg per populated switch port. External NIC: 0.18 kg. Storage controller: 0.7 kg. Installed cable: 0.020 kg/m. Electrical curves are project allocations.'+(workerOptics?' Switch/NIC rows own electronics and cages; named LR4 endpoint optics add their complete 50 g/module project mass and 3.5 W/module sourced maximum separately, with zero baseline credit.':''),
  singlePointDisposition:'One active fabric plane. Loss of a common switch can interrupt customer service. Flight command/control remains separate; reliability acceptance is open.',
  limits:[
   {id:'fabric-port',label:'Usable per-worker link allocation',actual:requested,limit:portUsableGbps,unit:'Gbit/s',within:fabricLineSupported},
   {id:'fabric-leaves',label:'Leaf count in selected topology',actual:leafCount,limit:b.maxLeaves,unit:'leaves',within:leafCount<=b.maxLeaves},
   {id:'fabric-spine-ports',label:'Maximum port demand per spine',actual:maxSpinePortDemand,limit:b.switchPorts,unit:'ports',within:maxSpinePortDemand<=b.switchPorts},
   {id:'fabric-cable',label:'Core length within routing allocation',actual:finite(h.bodyLengthM)?h.bodyLengthM:null,limit:b.maxCoreLengthM,unit:'m',within:finite(h.bodyLengthM)?h.bodyLengthM<=b.maxCoreLengthM:null}
  ]
 };
 const family=architectureFamily(h),communications=installedCommunications(h),starcloud=family.id==='starcloud-inline',terminalCount=communications.opticalTerminalCount,lineMbps=starcloud?25000:b.opticalModemLineMbps,customerCap=starcloud?lineMbps*b.usableLineFraction:b.opticalCustomerAllocationMbps;
 const terminal={
  id:'ODC-COM-ICD-01',installedPackage:communications.id,installedPackageLabel:communications.label,payloadOpticalTerminals:terminalCount,payloadRFReflectors:communications.kaTerminalCount,flightPatchLocations:communications.sPatchCount,kaInstalled:communications.kaInstalled,sBandInstalled:communications.sBandInstalled,installedMassKg:communications.terminalMassKg,installedPeakKW:communications.peakKW,singlePayloadRoute:terminalCount===1,
  opticalModemLineMbps:lineMbps,relayUpCapMbps:customerCap,relayDownCapMbps:customerCap,
  gatewayCapMbps:b.gatewayLineMbps*b.usableLineFraction,directUpLineMbps:communications.sBandInstalled?2:0,directSLineMbps:communications.sBandInstalled?4:0,directKaLineMbps:communications.kaInstalled?500:0,directOpticalLineMbps:b.opticalModemLineMbps,
  directOpticalBasis:'The direct-Earth optical link retains the separate allocated 2 Gbit/s ground receiver model. An intersatellite terminal line rating does not establish ground compatibility or the direct-link rate.',
  duplex:'Full-duplex relay is a required interface allocation; terminal/provider demonstration is open.',
  pointing:'Body pointing, coarse terminal steering and fine-pointing residual are separate allocations. Relay receiver ephemeris and field-of-regard proof remain open.',
  hardwareBasis:(starcloud?'Two terminals with up-to-25 Gbit/s published line capability; customer fraction, gateway and physical placement remain project allocations. Procurement applicability, waveform and flight interface remain open.':'2 Gbit/s optical modem and 1.6 Gbit/s customer allocation per direction are selected project interfaces. They are not a Starlink service claim.')+' Installed RF package: '+communications.label+'. Omitted equipment has no mass or service credit.',
  rfCommandBasis:communications.commandPath,kaFunction:'The current Ka model is a payload downlink. It does not implement or qualify a backup Ka command/telemetry channel.',
  protocol:'Buffered payload objects with sequence, integrity check and acknowledged custody; provider waveform, beacon and link protocol unselected.',
  externalProvider:'Unselected; no contracted capacity or compatible optical-terminal certification',
  makeBeforeBreak:terminalCount>1?'Two installed terminals permit a simultaneous-link trade. Provider support and receiver fields of regard remain unassessed; no continuous-service credit is added.':'Unassessed: one payload optical terminal cannot be credited with simultaneous independently pointed links.',
  directWeather:'Clear-sky propagation reference only. No site-weather or statistical availability credit is assigned.'
 };
 const timing=relayTiming(d),requestedUp=nn(d.relayUpMbps),requestedDown=nn(d.relayDownMbps);
 const effectiveUpMbps=Math.min(requestedUp,terminal.relayUpCapMbps,terminal.gatewayCapMbps),effectiveDownMbps=Math.min(requestedDown,terminal.relayDownCapMbps,terminal.gatewayCapMbps);
 const usesRelay=d.serviceRoute==='relay'||d.serviceRoute==='hybrid',direct=d.serviceRoute==='direct'||d.serviceRoute==='hybrid';
 const opticalDirect=direct&&(d.link==='optical'||d.link==='auto');
 const route={
  id:d.serviceRoute||'unselected',label:d.serviceRoute==='relay'?'Allocated optical relay':d.serviceRoute==='hybrid'?'Relay with scheduled direct fallback':d.serviceRoute==='direct'?'Direct ground contacts':'Unselected route',
  usesRelay,direct,opticalDirect,directPayloadTerminalInstalled:d.link==='ka'?communications.kaInstalled:d.link==='s'?communications.sBandInstalled:true,requestedUpMbps:requestedUp,requestedDownMbps:requestedDown,effectiveUpMbps,effectiveDownMbps,
  acquisitionS:timing.acquisitionS,configuredHandoverS:timing.configuredHandoverS,effectiveHandoverS:timing.onS,cycleS:timing.cycleS,
  handoverSensitivity:{installedTerminals:terminalCount,assessed:false,credited:false,possibleUsableFraction:terminalCount>1?timing.scheduledAvailability:timing.usableFraction,remainingScheduledGapS:timing.cycleS*(1-timing.scheduledAvailability),basis:'Conditional upper bound if independent pointing and make-before-break support are verified; hardware count alone gives no service credit.'},scheduledAvailability:timing.scheduledAvailability,effectiveAvailability:timing.usableFraction,longestScheduledOutageS:timing.longestOutageS,
  meanRelayUpMbps:effectiveUpMbps*timing.usableFraction,meanRelayDownMbps:effectiveDownMbps*timing.usableFraction,
  relayRoundTripMs:finite(d.relayRttMs)?d.relayRttMs:null,gatewayOneWayMs:finite(d.groundEdgeMs)?d.groundEdgeMs:null,
  directCustomerUplinkCapMbps:Math.min(nn(d.customerUplinkMbps),terminal.directUpLineMbps*Math.max(0,Math.min(1,nn(d.codingEff)))),
  providerStatus:'unassessed',receiverGeometryStatus:'unassessed',weatherStatus:opticalDirect?'clear_sky_only':'not_applicable',
  requestedRatesFit:requestedUp<=terminal.relayUpCapMbps&&requestedDown<=terminal.relayDownCapMbps,
  scenario:'Repeatable periodic access allocation; acquisition consumes access time. It is not a measured availability or an orbit-derived relay track.',
  outageCases:opticalDirect?['Clear-sky geometry and pointing reference','Single-site cloud interruption with buffered custody and latency replay','Correlated weather across candidate sites; diversity credit requires weather data and concurrent site access']:usesRelay?['Nominal planned access and gateway delay','Acquisition and handover interruption with buffered custody','Receiver/relay outage envelope supplied by the selected provider']:['Orbit-derived RF ground contact and acquisition windows','Gateway interruption with buffered custody and latency replay','Station access, environment and maintenance envelope supplied by the ground-network operator'],
  requiredEvidence:['Named provider and ground endpoints; booked duplex capacity and gateway behavior','Compatible waveform, beacon/acquisition protocol, optical duplex and mechanical interface','Receiver ephemeris, occultation and simultaneous pointing envelope','Measured or supplied service interruptions, handovers and latency; direct optical weather/site-diversity basis where used']
 };
 const autonomy={
  referenceLifeYears:b.referenceLifeYears,selectedMissionLifeYears:finite(d.missionYears)?d.missionYears:null,
  withinReferenceLife:finite(d.missionYears)?d.missionYears<=b.referenceLifeYears:null,
  lifeBasis:'Five-year design-reference allocation. A different mission duration is evaluated; component life and environment qualification remain open at every duration.',
  commandHoldRequirementH:b.commandHoldRequirementH,engineeringHistoryRequirementH:b.engineeringHistoryRequirementH,
  flightBoundary:communications.sBandInstalled?'Flight computer, installed S-band command/telemetry and protected electrical priorities are independent of the customer payload.':'The flight computer and protected electrical priorities remain installed, but this package has no independent RF command/telemetry implementation. Removing S-band creates an explicit assurance gap; an optical or Ka replacement is not assumed.',
  independentTTCInstalled:communications.sBandInstalled,commandPathStatus:communications.sBandInstalled?'allocated':'unassessed',
  payloadRecovery:'Per-tray power isolation, supervised restart and acknowledged object/checkpoint recovery. No uninterrupted service credit is assumed for an isolated tray or a fabric loss.',
  bootUpdate:'Watchdog-supervised flight restart, two retained boot-image banks, integrity-checked update and explicit rollback authority. Memory/timing sizing and representative-platform verification remain open.',
  dataCustody:'A complete verified checkpoint is retained until its successor commits. Earth receipt requires a complete integrity-checked artifact and acknowledgement; partial bytes do not transfer custody.',
  disposalAuthority:'The flight executive retains maneuver inhibition, propellant protection and disposal authority independently of payload software.',
  redundancy:[
   {item:'Flight command/control chain',selection:'Single selected processor allocation with watchdog and recovery architecture',disposition:'Critical single-point review and independent survival implementation remain open.'},
   {item:'Payload compute trays',selection:'Individually isolatable repeated units; no dedicated spare is silently added',disposition:'Checkpoint/restart and degraded-throughput requirements require representative tests.'},
   {item:'Payload fabric',selection:'One active switched plane',disposition:'Common-fabric service interruption retained in the assurance register.'},
   {item:'Payload optical terminal',selection:terminalCount+' installed optical terminal'+(terminalCount===1?'':'s')+'; selected route uses the declared access schedule',disposition:'No simultaneous-relay or make-before-break availability credit.'}
  ],
  verification:['Representative tray/fabric application, memory, collective and I/O tests','Radiation and data-integrity evidence for selected parts and shielding','Autonomous survival, reboot/update, checkpoint and custody procedure tests','Component-life evidence for mission duration and operating environment'],
  simulationScope:'Nominal service and gradual degradation; assurance decisions do not add off-nominal events to playback.'
 };
 const placement=payloadPlacement(h,compute,fabric);
 return {schema:'odc-service-architecture/1',revision:serviceArchitectureRevision,basis:serviceDesignBasis,compute,fabric,terminal,route,placement,autonomy,sources:serviceDesignSources,
  accounting:{additionalHardwareKg:compute.extraHostMassKg+fabric.massKg,payloadSupportIdleKW:compute.extraHostIdleKW+fabric.idleKW,payloadSupportActiveKW:compute.extraHostActiveKW+fabric.activeKW,
   boundary:'Embedded host and NIC resources remain inside the tray reference. Extra host modules and external fabric are counted once outside tray mass/power. Storage drive mass/power remains in its own account.'}};
}

// Runtime route limits share the installed terminal allocation with the PDR
// interface sheet. The return values are application-rate caps, not raw line rates.
export function allocatedRelayRates(h,t=null){
 const a=h.serviceArchitecture||serviceArchitecture(h),r=a.route,d=h.input||{};
 const on=t===null?true:relayGate(t,d);
 return {on,upMbps:on?r.effectiveUpMbps:0,downMbps:on?r.effectiveDownMbps:0,availability:r.effectiveAvailability,providerStatus:r.providerStatus};
}

const col={ink:'#e6eef2',muted:'#a8bdc9',teal:'#80cdb9',blue:'#8cbae1',gold:'#dfc285',red:'#efa18c',panel:'#182c37',line:'#456170'};
function txt(x,y,value,size=13,color=col.ink,anchor='start'){return '<text x="'+x+'" y="'+y+'" font-size="'+size+'" fill="'+color+'" text-anchor="'+anchor+'">'+esc(value)+'</text>';}
function block(x,y,w,title,lines,color=col.teal,height=102){
 return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+height+'" rx="9" fill="'+col.panel+'" stroke="'+color+'"/>'+txt(x+13,y+25,title,14,color)+lines.map((v,i)=>txt(x+13,y+48+i*18,v,12)).join('');
}
function arrow(x1,y1,x2,y2,color=col.teal){
 const a=Math.atan2(y2-y1,x2-x1),bx=x2-7*Math.cos(a),by=y2-7*Math.sin(a);
 return '<path d="M'+x1+' '+y1+'L'+x2+' '+y2+'" fill="none" stroke="'+color+'" stroke-width="2"/><path d="M'+(bx+4*Math.sin(a))+' '+(by-4*Math.cos(a))+'L'+x2+' '+y2+'L'+(bx-4*Math.sin(a))+' '+(by+4*Math.cos(a))+'" fill="none" stroke="'+color+'" stroke-width="2"/>';
}
function frame(id,title,description,height,body){
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 '+height+'" role="img" aria-labelledby="'+id+'-title '+id+'-desc" style="display:block;width:100%;height:auto;font-family:system-ui,sans-serif"><title id="'+id+'-title">'+esc(title)+'</title><desc id="'+id+'-desc">'+esc(description)+'</desc><rect width="850" height="'+height+'" rx="12" fill="#101f29"/>'+txt(28,32,title,18)+body+'</svg>';
}
function capacity(y,label,capacityValue,demandValue,unit){
 const known=finite(capacityValue)&&finite(demandValue),max=known?Math.max(capacityValue,demandValue,1e-12):1;
 const cap=known?790*Math.max(0,capacityValue)/max:790,use=known?790*Math.min(capacityValue,demandValue)/max:0,excess=known?790*Math.max(0,demandValue-capacityValue)/max:0;
 return txt(28,y,label,13)+txt(818,y,known?fmt(demandValue,2)+' / '+fmt(capacityValue,2)+' '+unit:'Assignment requires a complete design',12,col.muted,'end')+
  '<rect x="28" y="'+(y+12)+'" width="'+cap+'" height="14" rx="3" fill="'+col.panel+'" stroke="'+col.line+'"/>'+
  (known?'<rect x="28" y="'+(y+12)+'" width="'+use+'" height="14" rx="3" fill="'+col.teal+'"/><rect x="'+(28+use)+'" y="'+(y+12)+'" width="'+excess+'" height="14" fill="'+col.red+'"/>':'');
}

export function renderComputeFabric(h={}){
 const a=h.serviceArchitecture||serviceArchitecture(h),c=a.compute,f=a.fabric,p=a.placement,d=h.input||{},ai=h.ai||{};
 const massStatus=h.installedHarnessAccounting?.status;
 const cableBasis=massStatus==='installed-route-mass-adopted'?'Installed cuts + terminations in vehicle mass':massStatus==='model-estimate-adopted'?'Modeled lengths + terminations in vehicle mass':fmt(f.maxEdgeCableM,0)+' m endpoint cable allocation';
 const local=p.largestShardGB===null?'Local partition not evaluated':fmt(p.largestShardGB,2)+' / '+fmt(c.memoryPerAcceleratorGB,0)+' GB per device';
 const title='Installed compute, local shards and onboard fabric';
 let body=txt(28,59,f.topology+' · one spacecraft · selected hardware allocations',12,col.muted);
 body+=block(28,81,230,fmt(c.trayCount,0)+' repeated compute trays',[
  fmt(c.acceleratorsPerTray,0)+' accelerators / tray · '+fmt(c.memoryPerAcceleratorGB,0)+' GB each',
  fmt(c.embeddedCoresPerTray,0)+' embedded host cores / tray',
  fmt(c.trayElectricalKW,2)+' kW / tray at its interface'
 ]);
 body+=arrow(258,132,306,132)+block(306,81,232,fmt(f.leafCount,0)+' leaf switch'+(f.leafCount===1?'':'es'),[
  fmt(f.computePorts,0)+' compute + '+fmt(f.storageControllers,0)+' storage ports',
  fmt(f.gatewayPorts,0)+' terminal gateway ports',
  fmt(f.endpointPortGbps,0)+' Gbit/s selected physical ports'
 ]);
 if(f.spineCount>0)body+=arrow(538,132,588,132)+block(588,81,234,fmt(f.spineCount,0)+' spine switch'+(f.spineCount===1?'':'es'),[
  fmt(f.uplinksPerLeaf,0)+' uplinks per leaf',
  fmt(f.linksPerLeafSpine,0)+' link(s) / leaf–spine pair',
  fmt(f.maxSpinePortDemand,0)+' / 32 ports used per spine'
 ],f.topologySupported?col.blue:col.red);
 else body+=arrow(538,132,588,132)+block(588,81,234,'Internal switching capacity',[
  fmt(f.usedSwitchPorts,0)+' / '+fmt(f.availableSwitchPorts,0)+' switch ports used',
  fmt(f.oneWayBisectionGbps,0)+' Gbit/s one-way bisection',
  'No external compute dependency'
 ],col.blue);
 body+=block(28,231,230,'Local placement',[
  p.training?'Even shards across '+fmt(c.acceleratorCount,0)+' devices':fmt(p.replicas,0)+' complete resident replicas',
  local,
  p.maxTraySpan!=null?'Up to '+fmt(p.maxTraySpan,0)+' tray(s) / replica':'Application mapping remains open'
 ],p.localMemoryFits===false?col.red:col.teal);
 body+=block(306,231,232,'Storage and local I/O',[
  fmt(c.storageModules,0)+' drives / '+fmt(f.storageControllers,0)+' controller(s)',
  fmt(c.usableStorageTB,2)+' TB usable media',
  fmt(f.storageLinkGBs,2)+' GB/s fabric ceiling'
 ],col.gold);
 body+=arrow(422,231,422,184,col.gold);
 body+=block(588,231,234,'Host and support allocation',[
  fmt(c.allocatedHostCores,0)+' allocated host cores',
  fmt(c.extraHostModules,0)+' additional host modules',
  fmt(f.massKg,1)+' kg external fabric / cabling'
 ],col.blue);
 body+=capacity(370,'Usable collective rate per tray',f.portUsableGbps,f.requestedPerWorkerGbps,'Gbit/s');
 body+=capacity(427,'Scheduled application work',finite(ai.activeUnitsPerSec)&&finite(d.duty)?ai.activeUnitsPerSec*d.duty:null,ai.requiredRate,ai.unit?ai.unit+'/s':'work/s');
 body+=txt(28,485,cableBasis+' · 80% usable-rate allocation · qualification open',12,col.muted);
 return frame('odc-compute-fabric',title,'A repeatable compute tray connects through explicitly counted fabric ports, leaf and optional spine switches, local storage controllers and terminal gateways. Bars compare usable link allocation and selected-workload demand; device-level placement is a preliminary mapping.',510,body);
}

export function renderEarthServiceRoute(h={},snapshot={}){
 const a=h.serviceArchitecture||serviceArchitecture(h),d=h.input||{},r=a.route,t=a.terminal;
 const relay=r.usesRelay,routeDetail=relay?'Allocated relay; provider unselected':'Geometric contacts; operator open';
 const capacityText=relay?fmt(r.effectiveUpMbps,0)+' up / '+fmt(r.effectiveDownMbps,0)+' down Mbit/s':'Range / pointing set rate';
 const interfaceTitle=relay?t.payloadOpticalTerminals+' optical payload terminal'+(t.payloadOpticalTerminals===1?'':'s'):!r.directPayloadTerminalInstalled?'Selected terminal not installed':d.link==='optical'?'Optical payload downlink':d.link==='s'?'S-band payload service':d.link==='auto'?'Installed terminal selection':'Ka payload downlink';
 const wait=relay?(r.longestScheduledOutageS===null?'No usable scheduled access':fmt(r.longestScheduledOutageS,1)+' s maximum scheduled gap'):'Ground access sets transfer windows';
 let body=txt(28,59,r.label+' · rates are allocated goodput; service commitment remains open',12,col.muted);
 body+=block(28,82,245,'Earth customer endpoint',[
  'Requests, files or training corpus',
  'Verified result / artifact receipt',
  fmt(d.groundEdgeMs,0)+' ms gateway processing / way'
 ],col.teal);
 body+=arrow(273,133,301,133)+block(301,82,245,'Ground / relay gateway',[
  routeDetail,
  capacityText,
  wait
 ],col.blue);
 body+=arrow(546,133,574,133)+block(574,82,248,interfaceTitle,[
  relay?fmt(r.effectiveHandoverS,0)+' s acquisition / handover floor':'Acquisition and visibility required',
  relay?fmt(r.effectiveAvailability*100,1)+'% time in the allocated schedule':r.opticalDirect?'Optical case: clear sky only':'RF environment / EOL basis open',
  'One selected payload route at a time'
 ],col.gold);
 body+=block(28,248,245,'Mission control',[
  fmt(d.commandKbps,1)+' kbit/s command offering',
  t.sBandInstalled?'Direct S-band access':'Independent RF TT&C not installed',
  t.sBandInstalled?'Independent of customer routing':'Replacement command path unresolved'
 ],t.sBandInstalled?col.blue:col.red);
 body+=(t.sBandInstalled?arrow(273,299,301,299,col.blue):'')+block(301,248,245,'Flight control and health',[
  'Dedicated flight computer / recorder',
  fmt(a.autonomy.commandHoldRequirementH,0)+' h command-hold requirement',
  fmt(a.autonomy.engineeringHistoryRequirementH,0)+' h history requirement'
 ],col.blue);
 body+=block(574,248,248,'Onboard customer data',[
  'Input staging → local computation',
  'Checkpoint / result → custody queue',
  'Receipt requires the complete object'
 ],col.teal)+arrow(698,184,698,248,col.teal);
 body+=txt(28,390,'Current accepted route: '+(snapshot.aiActiveRoute||'not evaluated at a mission instant'),13,col.teal);
 body+=txt(28,418,relay?'Requested relay: '+fmt(r.requestedUpMbps,0)+' up / '+fmt(r.requestedDownMbps,0)+' down Mbit/s; installed customer cap '+fmt(t.relayDownCapMbps,0)+' each.':'Direct terminal capacity is evaluated with the actual range, pointing, acquisition and command priority.',12,col.muted);
 body+=txt(28,445,relay?'Receiver ephemeris, optical compatibility, gateway outages and service terms need provider evidence.':r.opticalDirect?'Clear-sky output carries no weather availability credit; cloud outages and site diversity require cases.':'Ground-network access, site environment, gateway interruptions and service terms require operator evidence.',12,col.gold);
 body+=txt(28,473,'Survival and disposal stay with the flight executive. Checkpoint / restart does not imply uninterrupted service.',12,col.muted);
 return frame('odc-earth-service', 'Earth service, optical handover and flight control','Customer requests and acknowledged result custody use the installed terminal and gateway allocation. '+(t.sBandInstalled?'Mission command and health traffic use the independent S-band installation.':'No independent RF command/telemetry installation is modeled in this package; a replacement remains unresolved.')+' Relay acquisition consumes access time, and provider compatibility and direct optical weather remain unverified.',500,body);
}
