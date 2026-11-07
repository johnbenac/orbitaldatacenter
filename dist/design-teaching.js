// Worked readings use the installed design and, where stated, the current mission snapshot.
import {ageProperties,physics} from './design.js';
import {R,MU} from './orbit.js';
import {componentCentroid} from './component-stations.js';
import {guidanceSources} from './input-guidance.js';
import {integrationProfile} from './integration-profiles.js';
import {payloadInterfaceFor} from './payload-interface.js';
import {architectureFamily} from './architecture-families.js';

const references=new Map(guidanceSources.map(x=>[x.id,x]));
const page=(label,domain,phase)=>({label,domain,phase});
const edit=(label,field)=>({label,field});
function reading(label,v,unit='',digits=2){
 let value=String(v);
 if(typeof v==='number'){
  const abs=Math.abs(v);
  value=!Number.isFinite(v)?'Unavailable':abs>0&&abs<Math.min(.01,10**-digits)?v.toExponential(2):
   v.toLocaleString('en-US',{maximumFractionDigits:digits,minimumFractionDigits:0});
 }
 return {label,value:unit?value+' '+unit:value};
}
function lesson(question,explanation,evidence,action,reference){
 return {question,explanation,evidence,action,source:typeof reference==='string'?references.get(reference):reference};
}

function customer(A,h){
 const d=h.input,a=h.ai;
 if(a.training){
  const adapt=a.purposeId==='finetune';
  if(A)return lesson(adapt?'What would let the customer use the adapted model?':'When can the customer call the training run complete?',
   d.artifactKind==='adapter'&&!a.deployableArtifact?(adapt?'This order asks for an adapter, but the receiving site lacks its matching base model. Supply the base or request a full model.':'This run updates the entire model. The selected adapter-only delivery cannot reproduce that result.'):
   'The customer needs a model that meets the evaluation target and arrives on time. The return clock starts when the finished file exists. The rate below assumes uninterrupted delivery through that window.',
   [reading('File to return',a.artifactGB,'GB'),reading('Time allowed after training',d.artifactReturnHours,'h'),reading('Average return rate needed',a.artifactGB*8000/(d.artifactReturnHours*3600),'Mbit/s')],edit('Choose the return file','artifactKind'),adapt?'peft':'mlperf-training');
  return lesson('Why save restart files on the spacecraft?',
   'A local restart preserves work without waiting for an Earth contact. Saving it occupies the drives and takes time away from training. The customer receives the artifact chosen in the mission inputs.',
   [reading('Local restart file',a.restartGB,'GB'),reading('One write at installed bandwidth',a.saveTimeS,'s'),reading('Between saves',d.checkpointIntervalH,'active h')],page('Trace the files','data','B'),'optimizer');
 }
 const purpose={
  text:A?['When does a chat turn count as useful?','Start timing at the Earth user’s request. A quick first token helps only if the rest of the answer keeps arriving. These are the customer’s acceptance limits.',[
   reading('First visible token within',d.ttftTargetS,'s'),reading('Maximum stream gap',d.streamGapTargetS,'s')],edit('Inspect the first-token target','ttftTargetS'),'mlperf-inference']:
   ['Which message uses more of the link?','Compare one prompt and one answer using the chosen bytes per token. The prompt travels up before generation begins. The answer streams down as it is produced. These counts cover text alone.',[reading('Prompt sent up',a.inputBytesPerUnit,'B'),reading('Answer sent down',a.outputBytesPerUnit,'B')],page('Trace the return path','comm','B'),'mlperf-inference'],
  voice:A?['What does a caller notice during a turn?','The caller waits from the end of speech until the first audible reply. Voice activity detection, inference, playout and the return path all use part of that budget.',[reading('First audible reply within',d.voiceFirstAudioTargetS,'s'),reading('Interrupt response within',d.voiceInterruptionTargetS,'s')],edit('Inspect the reply-time target','voiceFirstAudioTargetS'),'opus']:
   ['How small is one piece of a voice call?','The codec sends short pieces of speech in both directions. A lost contact can interrupt the conversation even when the average data rate is easy to carry. These are encoded payload bytes before framing.',[reading('One audio chunk',d.voiceAudioKbps*d.audioChunkMs/8,'B'),reading('Chunks per active second',1000/d.audioChunkMs,'per direction')],page('Inspect the service route','comm','B'),'opus'],
  batch:A?['What makes a batch job late?','The item must be processed, accepted for quality and returned before its cutoff. Input staging can consume much of the time when the files arrive from Earth.',[reading('Input per job',d.batchInputMB,'MB'),reading('Result per job',d.batchResultMB,'MB'),reading('Delivery deadline',d.serviceDeadlineS,'s')],edit('Inspect the delivery deadline','serviceDeadlineS'),'mlperf-inference']:
   ['Which direction carries the bigger batch?','Follow one set of one hundred jobs through the recorder. Each input needs space before processing, and each result waits for a return opportunity.',[reading('100 inputs',100*d.batchInputMB,'MB'),reading('100 results',100*d.batchResultMB,'MB')],page('Inspect recorder space','data','B'),'mlperf-inference'],
  agents:A?['What does the customer accept after the agents finish?','The order ends with a checked result. Search and tool calls spend compute even on unsuccessful attempts. Set the allowed elapsed time and the assumed fraction of results that pass verification.',[reading('Task deadline',d.serviceDeadlineS,'s'),reading('Assumed verification rate',100*d.agentVerifyFraction,'%')],edit('Inspect the verification assumption','agentVerifyFraction'),'agent-study']:
   ['Which parts of a research assignment can overlap?','Agents in one stage can work together until the next dependent stage needs their results. A shortage of resident worker slots forces another wave. Earth-hosted tools can add a separate wait.',[reading('Agents requested per stage',a.agentFanout),reading('Resident worker slots',a.agentWorkerSlots),reading('Serial stages',d.agentSerialSteps)],page('Inspect the compute payload','compute','B'),'agent-study']
 };
 return lesson(...purpose[a.purposeId]);
}

export function designTeaching(phase,id,h,s){
 if(!h||!['A','B'].includes(phase))return null;
 const A=phase==='A',d=h.input,a=h.ai;
 switch(id){
 case 'purpose':return customer(A,h);
 case 'conops':{
  if(A){
   const offers=a.training?reading('Training budget',d.trainingBudgetDays,'days'):reading('Offered by Earth',d.serviceOffersPerHour,a.unit+'/h');
   const timing=a.training?'Once the training data are staged, workers can keep going through a gap to Earth. Save a return window for the finished model.':
    a.purposeId==='text'||a.purposeId==='voice'?'A live customer needs a path while the conversation is happening. A busy processor can still leave an Earth user waiting.':
    'The customer can queue work for a later pass. Count time waiting for input, processing and return against the delivery deadline.';
   return lesson('How much of the day can this mission spend computing?',timing+' The duty setting schedules active compute time.',[reading('Scheduled per 24 hours',24*d.duty,'h'),offers],page('See what the customer buys','purpose','A'),'seh');
  }
  return lesson('Can the planned work fit into the active hours?',
   'Compare the rate the hardware estimator can sustain while active with the continuous average the customer needs. Multiplying by the scheduled duty fraction gives a first capacity check. Power, thermal limits and contact gaps can reduce useful deliveries.',
   [reading('Estimated rate × scheduled duty',a.activeUnitsPerSec*d.duty,a.unit+'/s',3),reading('Demand averaged over elapsed time',a.requiredRate,a.unit+'/s',3)],page('Trace the compute design','compute','B'),a.training?'mlperf-training':'mlperf-inference');
 }
 case 'compute':{
  if(A)return lesson('Will the workload fit in accelerator memory?',
   (a.memoryMarginGB<0?'The working set exceeds installed device memory. ':'The working set fits the aggregate device-memory estimate. ')+(a.training?'Training keeps updated parameters, optimizer state and activations available for the next step.':'Prompt history and the model share accelerator memory. Longer contexts or larger batches leave less room for concurrent work.'),
   [reading('Estimated working set',a.modelMemoryGB,'GB'),reading('Installed on accelerators',a.installedMemoryGB,'GB')],edit('Inspect compute tray count','trayCount'),a.training?'optimizer':'perf');
  if(a.training)return lesson('Why can a faster processor spend time waiting?','Workers exchange updates after each training step. The fabric estimate includes the time spent on that exchange. A local checkpoint also occupies the drives between groups of steps.',[reading('Compute share of modeled step time',a.fabricEfficiency*100,'%'),reading('Estimated scheduled training',a.trainingDays??'No active capacity',a.trainingDays==null?'':'days')],edit('Inspect cluster bandwidth','fabricGbps'),'parallel');
  return lesson('Where does one unit of work spend its electricity?',
   'The active IT estimate includes accelerators and workload-specific support. The energy below divides this draw by completed onboard work at the installed active rate. Waits for contact and spacecraft support loads are additional.',
   [reading('Active IT load',h.itKw,'kW'),a.activeUnitsPerSec>0?reading('Active IT energy per '+a.unit,1000*h.itKw/a.activeUnitsPerSec,'J'):reading('Energy per completed unit','No active capacity')],page('Follow the heat','thermal','B'),'perf');
 }
 case 'data':{
  if(A){
   const product=a.activeUnitsPerSec*d.duty*a.outputBytesPerUnit*600/1e9;
   return lesson('How much space would a ten-minute return outage use?',
    a.training?'A finished model arrives in storage as one file. Background bulk traffic can continue accumulating while that file waits for contact.':
    'Suppose staged inputs let the processors keep working at the scheduled average and nothing can leave for ten minutes. Add customer output to the separate bulk stream to estimate new recorder demand.',
    [reading(a.training?'Finished artifact if ready':'Ten minutes of customer output',a.training?a.artifactGB:product,'GB',3),reading('Ten minutes of background bulk',d.bulkMbps*600/8000,'GB',3)],edit('Inspect raw recorder capacity','storageTB'),'ssd');
  }
  return lesson('How much recorder space is already spoken for?',
   'Weights, retained data and the input spool share the recorder with the return queue. The required allocation also counts workflow scratch or training files where the mission needs them.',
   [reading('Available after drive reserve',h.usableTB*1000,'GB'),reading('Allocated to this workload',a.requiredStorageGB,'GB'),reading('Remaining after allocation',a.storageMarginGB,'GB')],page('Inspect the mission files','purpose','B'),'ssd');
 }
 case 'comm':{
  if(A){
   const relay=d.serviceRoute==='relay',hybrid=d.serviceRoute==='hybrid';
   return lesson('How much data fits in a minute of access?',relay||hybrid?'For the assumed relay, a full minute at the contracted payload rate moves the amount shown. The terminal cap can reduce this rate. Handover gaps shorten usable time.':'At the selected payload-rate ceiling, one uninterrupted minute moves the amount shown. Acquisition uses part of a real pass, and the radio or optical budget can put goodput below this ceiling.',
    [reading(relay||hybrid?'Relay rate after terminal cap':'Payload-rate ceiling',relay||hybrid?Math.min(d.relayDownMbps,d.linkCapMbps):d.linkCapMbps,'Mbit/s'),reading('Data in 60 seconds',(relay||hybrid?Math.min(d.relayDownMbps,d.linkCapMbps):d.linkCapMbps)*60/8000,'GB',3)],edit('Inspect the payload-rate ceiling','linkCapMbps'),'rf');
  }
  const width=1.22*1.55/d.opticalApertureM;
  return lesson('Why does the optical terminal need such precise pointing?','A larger aperture narrows the outgoing beam. Compare the modeled diffraction angle at 1.55 µm with pointing jitter. The optical link budget also accounts for acquisition error, distance and atmospheric loss.',
   [reading('Beam divergence',width,'µrad'),reading('Assumed pointing jitter',d.opticalJitterUrad,'µrad')],edit('Inspect optical pointing jitter','opticalJitterUrad'),'rf');
 }
 case 'power':{
  const aged=ageProperties(d,d.missionYears);
  if(A)return lesson('How many of the installed kilowatt-hours can the bus use?','The pack operates between a charge floor and ceiling. Some energy is lost on discharge, and aging reduces the capacity inside the same charge window. These figures start each discharge at the ceiling.',
   [reading('Deliverable when new',h.batteryKWh*(d.socMax-d.socMin)*d.dischargeEff,'kWh'),reading('At '+reading('',d.missionYears,'years').value,aged.battery*(d.socMax-d.socMin)*d.dischargeEff,'kWh')],edit('Inspect the operating charge floor','socMin'),'pack');
  const energy=Math.max(0,s.batteryKWh-s.availableKWh*d.socMin)*d.dischargeEff,limit=h.batteryKWh*d.dischargeC;
  const runtime=s.loadKW>limit?'Above discharge limit':s.loadKW>0?reading('',60*energy/s.loadKW,'min').value:'No draw';
  return lesson('If sunlight dropped out now, how long could the battery carry this load?','Hold the present bus demand steady and start from the stored charge at the mission clock. The estimate ends at the pack floor. A load over the discharge-power limit cannot be fully served even with energy left.',
   [reading('Current bus demand',s.loadKW,'kW'),reading('Energy deliverable above floor',energy,'kWh'),reading('Battery-only duration',runtime)],page('Inspect an orbital interval','power','C'),'power');
 }
 case 'environment':{
  if(A){
   const aged=ageProperties(d,d.missionYears);
   return lesson('What changes as exposed surfaces age?','Cell efficiency sets the electrical share of intercepted sunlight. A radiator coating instead absorbs part of the shortwave light that reaches it. The two surfaces age on separate curves from their beginning-of-life values.',
    [reading('Cell efficiency at mission age',aged.pv*100,'%'),reading('Radiator solar absorption at mission age',aged.absorptivity*100,'%')],page('Inspect the radiator coating','thermal','A'),'coatings');
  }
  return lesson('How does thin air become a propulsion load?','Air striking the area presented to the direction of travel creates drag. A wing turn changes that projected area. Orbit maintenance must eventually replace the lost momentum.',
   [reading('Air density at mission clock',s.densityKgM3,'kg/m³'),reading('Area facing the flow',s.ramAreaM2,'m²'),reading('Modeled drag',s.dragN,'N',4)],page('Trace station keeping','prop','B'),'drag');
 }
 case 'orbit':{
  const semiMajor=R+d.altitudeKm,rp=semiMajor*(1-d.ecc)-R,ap=semiMajor*(1+d.ecc)-R;
  if(A)return lesson('Does the entered altitude describe the whole orbit?','The altitude input sets the semi-major axis above the reference Earth radius. Eccentricity spreads the low and high points apart. The low point is especially important for drag.',
   [reading('Target low point',rp,'km'),reading('Target high point',ap,'km')],edit('Inspect orbital eccentricity','ecc'),'elements');
  const threshold=Math.asin(R/semiMajor)*180/Math.PI;
  return lesson('Can an orbit miss Earth’s shadow completely?','Solar beta is the Sun’s angle above or below the orbital plane. In a circular orbit, continuous sunlight occurs when the magnitude of beta reaches the critical angle. This comparison uses the selected semi-major axis and a cylindrical shadow.',
   [reading('Signed beta at mission clock',s.betaDeg,'°'),reading('Circular critical angle',threshold,'°'),reading('Target period',2*Math.PI*Math.sqrt(semiMajor**3/MU)/60,'min')],page('Inspect shadow crossings','orbit','C'),'smad');
 }
 case 'thermal':{
  const applied=d.thermalMode==='applied',heat=applied?d.appliedHeatKw:h.itKw,aged=ageProperties(d,d.missionYears);
  if(A)return lesson('Where does heat enter this experiment?',applied?'The applied-heat setting supplies a separate test load. Compare it with the installed active IT power to see how severe the experiment is for this cooling design.':'The linked experiment converts the running electronics load into heat. Following the duty cycle changes how much heat enters the cold plates and how long the hardware cools between bursts.',
   [reading(applied?'Independent test load':'Installed active IT power',heat,'kW'),reading(applied?'Installed active IT power':'Installed idle IT power',applied?h.itKw:h.idleKw,'kW')],edit('Inspect the heat source','thermalMode'),'thermal');
  return lesson('Why can a large radiator still reject too little heat?','Both faces can emit infrared energy. Sunlight, reflected light and Earth infrared add heat back. The first figure is an ideal gross estimate at the chosen design temperature and end-age coating. The second is the signed net result at the mission clock.',
   [reading('Gross at design temperature',physics.emission(h.radiatorM2,d.radiatorDesignK,aged.emissivity,2)/1000,'kW'),reading('Net at current temperature and orientation',s.netRejectionKW,'kW')],page('Inspect the environmental heat input','environment','B'),'thermal');
 }
 case 'attitude':{
  if(A)return lesson('Why does the location of drag matter?','A force offset from the mass center produces a turning effect. The perpendicular-force example below uses a 1 N force and the selected pressure-center arm. The flight model resolves the actual area, force and direction.',
   [reading('Pressure-center offset',d.cpOffsetM,'m'),reading('Example torque for 1 N perpendicular',Math.abs(d.cpOffsetM),'N·m')],edit('Inspect the pressure-center offset','cpOffsetM'),'gnc');
  const hold=s.cmgMarginNms<=0?'At capacity':s.torqueNm>0?reading('',s.cmgMarginNms/(s.torqueNm*60),'min').value:'No accumulating torque';
  return lesson('How long could the gyros absorb this disturbance?','Divide the remaining momentum capacity by torque to estimate time to saturation. This example holds the torque magnitude and direction steady, with no further slews or magnetic unloading.',
   [reading('Disturbance now',s.torqueNm,'N·m',4),reading('Remaining momentum capacity',s.cmgMarginNms,'N·m·s'),reading('Time at steady torque',hold)],page('Inspect the disturbance source','environment','B'),'gnc');
 }
 case 'prop':{
  if(A)return lesson('How much loaded propellant can be assigned to planned burns?','Set aside trapped residual and the designated reserve before allocating trim, orbit maintenance and disposal. Increasing the load also increases the mass the engines accelerate.',
   [reading('Loaded',h.propellantKg,'kg'),reading('After reserve and residual',h.propellantKg*(1-d.reserveFraction-d.residualFraction),'kg')],edit('Inspect reserve fraction','reserveFraction'),'prop');
  const impulse=1000;
  return lesson('What do thrust and specific impulse each buy?','For an illustrative 1,000 N·s impulse, thrust sets firing time and delivered specific impulse sets propellant consumption. This calculation assumes constant thrust and specific impulse for both engines together.',
   [reading('Time at installed thrust',impulse/d.thrustN,'s',3),reading('Propellant for this impulse',1000*impulse/(9.80665*d.isp),'g')],edit('Inspect delivered specific impulse','isp'),'rocket');
 }
 case 'mass':{
  if(A){
   const limit=Math.min(d.referenceKg,d.launchAllowanceKg),left=limit-h.launchKg;
   return lesson('How much mass can this mission still add?',left>=0?'Use the tighter of the launcher reference and the mission-specific allowance. The adapter and loaded fluids count against that limit along with the dry spacecraft.':'The launched stack already exceeds the tighter of the launcher reference and mission allowance. The amount over budget identifies how much mass must come out or how much allowable capacity must increase.',
    [reading('Governing allowance',limit,'kg'),reading(left>=0?'Remaining mass allowance':'Over budget by',Math.abs(left),'kg')],edit('Inspect mission allowance','launchAllowanceKg'),'margin');
  }
  const biggest=h.massLedger.filter(r=>r.group==='Hardware').reduce((a,b)=>a.kg>b.kg?a:b);
  return lesson('Where is the most dry hardware mass installed?','The largest individual hardware allocation is a useful place to trace where kilograms come from. The share below uses total dry mass including its engineering margin.',
   [reading(biggest.label,biggest.kg,'kg'),reading('Share of dry mass',100*biggest.kg/h.dryKg,'%')],page('Locate the mass in the vehicle','mechanical','B'),'margin');
 }
 case 'launch':{
  const f=h.fairing,face=h.payloadInterface||payloadInterfaceFor(h),rectangular=face.attachmentShape==='rectangular-lugs';
  if(A)return lesson('Which protrusion comes closest to the launcher?','The enclosure can taper above its widest point. Compare spacecraft width at each height with available room at that same height, including the selected allowance for lateral motion.',
   [reading('Closest feature',f.limitingPart),reading('Height above adapter',f.limitingZM,'m'),reading('Radial clearance after motion allowance',1000*f.radialClearanceM,'mm')],edit('Inspect lateral motion allowance','radialPaddingM'),{title:f.source,url:f.sourceUrl});
  return lesson('Could the folded vehicle pass the fit check and still hit its adapter?',(rectangular?'Four allocated corner attachments leave a cradle opening around the engine exits. Check the gap to each attachment pad and the space under the bell tips.':'The spacecraft carries its engine bells through the central opening of the circular fitting. Check the side gap and the space under the bell tips.')+' A positive static clearance still needs tolerance, motion and provider acceptance evidence.',
   [reading(rectangular?'Bell-to-attachment gap':'Bell-to-bore gap',1000*face.boreClearanceM,'mm'),reading('Room under tips',1000*face.bellTipClearanceM,'mm')],page('Inspect both adapter faces','launcher','B'),'clear');
 }
 case 'launcher':{
  const native=integrationProfile(d.launcher,d.launchSite).interface,face=h.payloadInterface||payloadInterfaceFor(h),rectangular=face.attachmentShape==='rectangular-lugs';
  if(A)return lesson('Which capacity figure applies to this launch?',h.launchKg>Math.min(d.referenceKg,d.launchAllowanceKg)?'The stack exceeds at least one mass allowance. Check the reference orbit and the mission-specific allocation together before examining the fairing.':'The reference payload rating belongs to a stated orbit and launch configuration. The mission-specific allowance captures the actual ride being studied. A positive mass margin still leaves the geometry to check.',
   [reading('Published or study reference',d.referenceKg,'kg'),reading('Mission-specific allowance',d.launchAllowanceKg,'kg'),reading('Launched stack',h.launchKg,'kg')],edit('Inspect the mission allowance','launchAllowanceKg'),'trade');
  return lesson('Why does changing rockets preserve the spacecraft attachment?',
   'The adapter bridges the chosen launcher and the installed family’s attachment. '+(rectangular?'This family carries four preliminary corner attachments; fastener drilling and dispenser acceptance are unresolved. ':'The legacy circular interface has its own project bolt-circle allocation. ')+(native.status==='study'?'The lower launcher attachment is a workbench assumption.':'The lower attachment uses the provider’s published reference.'),
   [reading('Spacecraft interface',face.id),...(rectangular?[reading('Open cradle width × height',face.openWidthM.toFixed(2)+' × '+face.openHeightM.toFixed(2),'m')]:[reading('Project spacecraft bolt circle',1000*face.pcdM,'mm')]),reading(native.diameterMeaning,native.diameterMm,'mm')],page('Watch this payload being loaded','launcher','D'),native.source);
 }
 case 'mechanical':{
  const family=architectureFamily(h);
  if(A)return lesson('What must deploy from this spacecraft’s launch package?',`${family.label} carries ${family.solarWingCount} solar wings and ${family.radiatorBankCount} radiator ${family.radiatorBankCount===1?'platform':'banks'}. `+(family.payloadLocation==='radiator'?'The compute equipment moves with the passive radiator platform before the two solar blankets roll out. ':family.id==='starcloud-inline'?'Each opposed deployment line carries the allocated radiator segments and its photovoltaic blanket. ':'The selected deployment graph controls array and radiator release. ')+'Inspect the actual folded envelope, moving-equipment clearance and provider keep-in profile; a drawing alone does not verify deployment.',
   [reading('Enclosed bus length',h.bodyLengthM,'m'),reading('Stowed stack with adapter',h.stowedLengthM,'m')],page('Inspect the limiting clearance','launch','A'),'mech');
  const wet=componentCentroid(h,h.propellantKg,0,true),empty=componentCentroid(h,0,0,true);
  return lesson('How far could the mass center shift as the tanks empty?','Hold the spacecraft folded and the adapter attached in both cases, then remove the liquid propellant. Comparing their mass-weighted centers isolates the effect of propellant inventory on balance.',
   [reading('Shift between these two cases',1000*Math.hypot(...wet.map((n,i)=>n-empty[i])),'mm'),reading('Liquid removed',h.propellantKg,'kg')],page('Trace the tank inventory','prop','B'),'mech');
 }
 case 'software':
  return A?lesson('Who gets to point the spacecraft?','The nominal law governs quiet flight. Before a burn, the body must align its thrust axis. During a ground pass the terminal tries to follow the station within its travel limits.',
   [reading('Nominal law',d.attitude),reading('Installed gyro torque',d.cmgTorqueNm,'N·m')],edit('Compare nominal pointing laws','attitude'),'flightio'):
   lesson('How does software know that a command worked?','Follow the feedback arrow. A moving joint can lag its target, so power, heat and communications use the achieved orientation.',
   [reading('Body slew remaining',s.attitudeSlewErrorDeg??0,'°'),reading('Tracking drive draw',s.trackingDriveKW??0,'kW')],page('Watch the software in flight','software','E'),'flightio');
 case 'avionics':{
  const interval=d.hkPeriodS,packet=h.cdh.packetBytes,rate=8*packet/(1000*interval),count=Math.floor(d.hkRecorderMB*1e6/packet);
  if(A)return lesson('How often must a short event be sampled to leave a record?','A brief change between samples can go unseen. Shortening the sampling interval captures finer timing and fills the spacecraft health recorder faster.',
   [reading('Interval between health packets',interval,'s'),reading('Full-power logging rate',rate,'kbit/s',4)],edit('Inspect health sampling interval','hkPeriodS'),'flightio');
  return lesson('How far back could an engineer inspect the spacecraft health log?','Each sample occupies a fixed packet in the onboard engineering recorder. At continuous full-power sampling, the oldest record eventually gives way to a new one. Customer AI files use a separate store.',
   [reading('Engineering packet',packet,'B'),reading('Recorder capacity',count,'packets'),reading('Span at continuous logging',count*interval/3600,'h')],page('Compare the payload recorder','data','B'),'flightio');
 }
 default:return null;
 }
}
