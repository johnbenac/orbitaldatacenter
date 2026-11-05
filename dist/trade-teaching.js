// Phase C already owns both simulations and their matched samples. This layer
// interprets their existing evidence and never edits either design or moves the clock.
import {componentCentroid} from './component-stations.js';

function format(n,unit){
 if(typeof n==='string')return n;
 if(!Number.isFinite(n))return 'Unavailable';
 const magnitude=Math.abs(n);
 const text=magnitude>0&&magnitude<.001?n.toExponential(1):
  n.toLocaleString('en-US',{maximumFractionDigits:magnitude>=100?1:magnitude>=1?2:3});
 return unit?text+' '+unit:text;
}
function reading(label,unit,get){return {label,unit,get}}
const stack=reading('Mass at launch','kg',c=>c.hardware.launchKg);
const fit=reading('Tightest side clearance','mm',c=>1000*c.hardware.radialClearanceM);
const massRoom=reading('Spare launch mass','kg',c=>c.hardware.launchScreenMarginKg);
const memory=reading('Accelerator memory remaining','GB',c=>c.hardware.ai.memoryMarginGB);
const disk=reading('Space after workload allocations','GB',c=>c.hardware.ai.storageMarginGB);
const buses=reading('Installed active IT draw','kW',c=>c.hardware.itKw);
const pair=(question,mechanism,readings)=>({question,mechanism,readings});

const customerGoals={
 text:['Can more of the offered conversations get a timely reply?','The order replay counts a turn after it satisfies the quality, first-token and streaming limits at the Earth customer. A prompt that arrives during a link outage still counts as an offer.','Expected accepted turns'],
 voice:['Will the customer hear the reply in time?','The clock starts at the end of speech and stops at the first audible reply. Duplex coverage, processing time and gaps in the returning audio all affect turn acceptance.','Expected accepted voice turns'],
 batch:['How many results arrive before the batch deadline?','Jobs can wait aboard through a contact gap. The customer earns credit for quality-qualified items received by the cutoff, so faster processing helps only if there is also time to return them.','Expected on-time items'],
 agents:['Does extra search yield a checked result in time?','Work on parallel branches can overlap. Serial tool calls on Earth still wait for a usable route, and the final result must pass verification and arrive before the deadline.','Expected verified tasks'],
 finetune:['Can Earth use the adaptation this run produces?','The order must finish training, write the requested artifact and deliver it to a compatible receiver. Acceptance also requires a measured validation result.','Accepted adaptations'],
 pretrain:['Does a completed training run reach its customer?','The exported weights or restart package become available after training and the local write. Receipt and the measured validation target both count toward an accepted run.','Accepted training runs']
};
function customer(c){
 const [q,why,name]=customerGoals[c.hardware.ai.purposeId]||customerGoals.text,training=c.hardware.ai.training;
 const timing=training?reading('Artifact received in replay','GB',v=>v.service?.metrics?.find(m=>m.key==='artifactReturned')?.value):
  reading('Earth-side offers in replay','',v=>v.service?.offers);
 return pair(q,why,[reading(name+' in replay','',v=>training&&v.service?.onTime===null?'Needs measured validation':v.service?.onTime),timing]);
}

function evidenceFor(id,c,key,fullDay){
 const h=c.hardware,s=c.state,d=h.input;
 switch(id){
 case 'conops':case 'purpose':return customer(c);
 case 'power':{
  const charge=fullDay?reading('Lowest charge above target','percentage points',v=>v.day.minSocPct-100*v.hardware.input.targetSOC):
   reading('Charge above target now','percentage points',v=>v.state.socPct-100*v.hardware.input.targetSOC);
  const when=fullDay?'At the deepest discharge this day':'At this instant';
  const room=charge.get(c);
  const result=room<0?`${when}, charge is ${format(-room,'percentage points')} below the requested reserve.`:
   room===0?`${when}, charge just reaches the requested reserve.`:`${when}, charge stays above the requested reserve.`;
  return pair('How much charge can the mission spare?',
   result+' '+(key==='batteryKWh'?'A larger pack spreads the same energy withdrawal over more capacity and adds launch mass.':s.eclipse?'At this instant Earth blocks the Sun. Array area can change how much the pack recharges before the crossing.':'The wings supply current loads in sunlight. Surplus generation can recharge the pack for the next shadow crossing.'),
   [charge,key==='batteryKWh'?stack:reading('Array output now','kW',v=>v.state.solarKW)]);
 }
 case 'thermal':{
  const temp=fullDay?reading('Hottest junction this day','K',v=>v.day.maxJunctionK):reading('Junction temperature now','K',v=>v.state.junctionK);
  const room=reading('Room to design ceiling','K',v=>v.hardware.input.junctionLimitK-temp.get(v));
  const mode=d.thermalMode==='applied';
  return pair('Can heat leave the processors fast enough?',
   (room.get(c)<0?'The junction exceeds the design ceiling. ':'The headroom is the design ceiling minus the modeled junction temperature. ')+
    (key==='appliedHeatKw'&&!mode?'The linked compute case takes heat from the operating payload. The applied-heat input acts in the independent experiment.':
     key==='thermalResistanceKPerKw'?'More resistance raises the chip temperature needed to drive the same heat into the loop.':
     'The radiator must emit both the heat carried to it and the heat it absorbs from the environment.'),
   [temp,room]);
 }
 case 'orbit':
  return pair('How does changing the orbit change the working day?',
   'The orientation of the orbital plane relative to the Sun governs shadow. The station locations, Earth’s rotation and elevation mask govern contact. Each can change independently.',
   fullDay?[reading('Time in shadow this day','min',v=>v.day.shadowSeconds/60),reading('Station visibility this day','min',v=>v.day.contactSeconds/60)]:
    [reading('Orbital period now','min',v=>v.state.periodSec/60),reading('Solar beta angle now','°',v=>v.state.betaDeg)]);
 case 'environment':
  return pair('How much air does the moving spacecraft meet?',
   'The drag model combines local atmospheric density, speed relative to the air and the area facing into the flow. The same wing angle also determines how much sunlight the cells intercept.',
   [reading('Area facing the airflow','m²',v=>v.state.ramAreaM2),reading('Drag at this instant','mN',v=>1000*v.state.dragN)]);
 case 'compute':{
  const a=h.ai,training=a.training;
  return pair(training?'How quickly can the cluster perform training steps?':a.purposeId==='text'?'Can faster decoding serve a longer context?':'How much of the selected work fits on the cluster?',
   a.memoryMarginGB<0?'The selected model and its working state exceed aggregate accelerator memory. A throughput estimate alone cannot establish that the job will run.':
    training?'Training includes synchronization between workers and room for model state. Compare the active training rate with the mission’s energy and return budgets.':
    a.purposeId==='text'?'Longer contexts consume cache memory. Changing batch size also changes how much useful work the accelerators can process together.':
    'Onboard capacity measures work while the payload is active. Scheduling, tool waits and delivery determine how much of that work the customer can use.',
   [training?reading('Active training rate','tok/s',v=>v.hardware.ai.activeTrainingTps):
    reading('Active work capacity',a.unit+'/s',v=>v.hardware.ai.activeUnitsPerSec),memory]);
 }
 case 'data':{
  const generated=fullDay?reading('Output bytes generated this day','GB',v=>v.day.aiProductGeneratedGB):reading('Result queue now','GB',v=>v.state.aiProductQueueGB);
  const reserve=reading('Peak payload backlog this day','GB',v=>v.day.peakQueueGB);
  return pair('Can the recorder hold the work between downlinks?',
   key==='contactFraction'?'The entered contact fraction sizes the planning link. The simulated recorder fills and drains on actual station passes, which are set by orbit and ground network.':
    'Resident files and scratch space occupy part of the recorder before any results are queued. A short high-rate downlink can empty the queue even when it grew for hours.',
   [h.ai.purposeId==='text'&&fullDay?reserve:generated,disk]);
 }
 case 'comm':{
  const service=fullDay?reading('Payload received this day','GB',v=>v.day.deliveredGB):reading('Payload goodput now','Mbit/s',v=>v.state.goodputMbps);
  return pair('How many bytes reach the ground?',
   key==='elevationDeg'?'The elevation mask sets when a station can see the vehicle. Raising it can remove low-elevation time while improving the geometry of the remaining contact.':
    'Antenna size and coding change the usable rate during a pass. The receiver can only collect bytes that are queued while a link is available.',
   [service,fullDay?reading('Station visibility this day','min',v=>v.day.contactSeconds/60):reading('Downlink line rate now','Mbit/s',v=>v.state.lineMbps)]);
 }
 case 'attitude':{
  const momentum=fullDay?reading('Least momentum headroom this day','N·m·s',v=>v.day.minMomentumMarginNms):reading('Momentum headroom now','N·m·s',v=>v.state.cmgMarginNms);
  return pair('Can the vehicle hold its orientation through the disturbance?',
   key==='dipoleAm2'?'A magnetic torquer unloads momentum when its commanded dipole acts across the local field. Increasing its rating can help during an unload even if the coils are idle at the selected instant.':
    'Steering torque measures how hard the gyroscopes can turn now. Momentum headroom measures how much disturbance they can absorb before unloading is needed. A negative margin flags an exceeded limit.',
   [momentum,reading('Steering torque headroom now','N·m',v=>v.state.cmgTorqueMarginNm)]);
 }
 case 'prop':
  return pair('How much maneuvering is left after the earlier burns?',
   key==='yearsSupply'?'Years of station keeping sets the allocation in the planning budget. In flight, actual chemical consumption follows the burns scheduled by the model.':
    'Increasing the fuel load adds launch mass. The engine’s specific impulse sets how much impulse it can deliver per kilogram consumed.',
   [reading('Remaining velocity change now','m/s',v=>v.state.remainingDv),stack]);
 case 'mass':
  return pair('What does this change cost at launch?',
   (h.launchScreenMarginKg<0?'The assembled stack exceeds the tighter launch allowance. ':'The adapter and loaded propellant both count against launch capacity. ')+'Spare launch mass uses the tighter of the launcher reference and the allowance for this mission.',
   [stack,massRoom]);
 case 'launch':case 'launcher':{
  const axial=reading('Clearance above the stack','mm',v=>1000*v.hardware.axialClearanceM);
  const side=h.radialClearanceM<0,top=h.axialClearanceM<0;
  const why=side||top?
   `The stowed spacecraft exceeds the ${side&&top?'side and upper':side?'side':'upper'} boundary of the adopted envelope. The launch adapter counts toward the stack dimensions.`:
   h.launchScreenMarginKg<0?'The stack clears the enclosure but exceeds the governing mass allowance. A larger fairing alone leaves the mass conflict in place.':
   'The usable envelope narrows toward the nose. Check side clearance at the tightest section and clearance above the stack separately from the launcher’s mass rating.';
  return pair('Will the folded spacecraft fit this ride?',why,[key==='fairingLengthM'||top?axial:fit,massRoom]);
 }
 case 'mechanical':
  return pair('Where will the loaded assembly balance?',
   'The center of mass weights each equipment station by the mass installed there. These values include the fueled spacecraft with appendages stowed and its adapter attached.',
   [reading('Stowed center along body Z','m',v=>componentCentroid(v.hardware,v.hardware.propellantKg,0,true)[2]),stack]);
 case 'avionics':{
  const commands=key==='commandKbps';
  const lookback=reading('Health history at full logging','h',v=>Math.floor(v.hardware.input.hkRecorderMB*1e6/v.hardware.cdh.packetBytes)*v.hardware.input.hkPeriodS/3600);
  return pair(commands?'Can commands wait for the next uplink?':'How much spacecraft health history fits aboard?',
   commands?'Commands accumulate in a ground buffer between usable uplinks. More command traffic can grow that queue while leaving the housekeeping packet size unchanged.':
    'A shorter sample period records a more detailed history and consumes the circular recorder sooner. The oldest records are then overwritten.',
   commands?[reading('Ground command queue now','MB',v=>v.state.uplinkQueueMB),reading('Commands received to date','GB',v=>v.state.commandUploadedGB)]:
    [lookback,reading('Recorder capacity','MB',v=>v.hardware.input.hkRecorderMB)]);
 }
 }
}

// The comparison restores the selected input to its pinned value while keeping
// other live settings (and the existing preset/solver coupling).
export function tradeTeaching(id,base,live,{key,label,same}){
 const fullDay=live.windowEnd-live.windowStart>=86400&&base.windowEnd-base.windowStart>=86400&&
  live.day&&base.day&&live.windowStart===base.windowStart;
 const study=evidenceFor(id,live,key,fullDay);if(!study)return null;
 const evidence=study.readings.map(r=>{
  const a=r.get(base),b=r.get(live),left=format(a,''),right=format(b,'');
  const changed=!same&&left!==right,values=changed?left+' → '+right:right;
  const numeric=(Number.isFinite(b)||changed&&Number.isFinite(a));
  return {label:r.label,value:values+(numeric&&r.unit?' '+r.unit:'')};
 });
 let cue;
 if(same)cue='Change '+label.toLowerCase()+' to compare with the pinned case.';
 else if(evidence.some(r=>r.value.includes(' → ')))cue='Paired values run from pinned to current.';
 else cue='These readings match at the precision shown.';
 return {question:study.question,explanation:study.mechanism+' '+cue,evidence};
}
