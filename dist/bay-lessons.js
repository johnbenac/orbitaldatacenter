// The bay layout and the visitor guide resolve the same station for each discipline.
const stations = {
 conops:'checkout', purpose:'compute', environment:'environment', orbit:'orbit',
 compute:'compute', data:'data', comm:'rf', power:'power', thermal:'thermal',
 attitude:'attitude', prop:'propulsion', mass:'mass', launch:'fit', launcher:'adapter',
 mechanical:'alignment', avionics:'avionics', software:'avionics'
};
export const bayStationFor=domain=>stations[domain]??stations.conops;

import {componentCentroid} from './component-stations.js';
import {DEPLOY_END_S} from './commissioning-clock.js';
import {MU,R,TAU} from './orbit.js';
import {launchFleet} from './launch-fleet.js';
import {terminalPattern} from './terminal-activity.js';

const ref=(title,url)=>({title,url});
const resources={
 gevs:ref('NASA Goddard · environmental verification standard','https://standards.nasa.gov/standard/gsfc/gsfc-std-7000'),
 rehearsal:ref('NASA · day-in-the-life testing','https://s3vi.ndc.nasa.gov/ssri-kb/topics/36/'),
 hardware:ref('NASA · electrical checkout of Orion','https://www.nasa.gov/reference/testing/'),
 clean:ref('NASA · how cleanrooms monitor particles','https://www.nasa.gov/organizations/osi/setmo/cleanroom-tech-key-to-success-in-space/'),
 orbit:ref('NASA · simulation with flight hardware','https://www.nasa.gov/reference/jsc-simulation-modeling/'),
 hat:ref('NASA · EO-1 antenna test hat in a cleanroom','https://ntrs.nasa.gov/api/citations/20030093738/downloads/20030093738.pdf'),
 optical:ref('MIT Lincoln Laboratory · TBIRD optical pointing tests','https://ntrs.nasa.gov/citations/20210026049'),
 radio:ref('NASA · radio and ground-station compatibility testing','https://www.nasa.gov/smallsat-institute/sst-soa/ground-data-systems-and-mission-operations/'),
 power:ref('NASA · ground testing spacecraft power systems','https://www.nasa.gov/reference/jsc-power-subsystems/'),
 coolant:ref('NASA · Orion ground cooling system, §3.2.8','https://www.nasa.gov/wp-content/uploads/2016/08/contract_80ksc019c0013.pdf'),
 attitude:ref('ESA · a simulated sky for CHEOPS','https://www.esa.int/ESA_Multimedia/Images/2017/12/Simulating_stars_in_the_cleanroom'),
 service:ref('NASA Kennedy · propulsion servicing and leak detection','https://www.nasa.gov/kennedy/partnerships/propellanthandlingandservicing/'),
 weigh:ref('ESA · measuring spacecraft mass properties','https://www.esa.int/Enabling_Support/Space_Engineering_Technology/Physical_Properties_Machines'),
 alignment:ref('ESA · aligning GOCE before flight','https://www.esa.int/Applications/Observing_the_Earth/FutureEO/GOCE/Entry_4_GOCE_unpacked_and_alignment_check_complete'),
 mating:ref('NASA · fitting PACE to its launch adapter','https://science.nasa.gov/blogs/pace/2024/01/29/nasas-pace-spacecraft-mated-to-payload-adapter/'),
 inference:ref('MLCommons · inference performance and quality','https://mlcommons.org/benchmarks/inference-datacenter/'),
 training:ref('MLCommons · training time to target quality','https://mlcommons.org/benchmarks/training/')
};
export const commFixtures={
 sband:{name:'Command and telemetry rack',label:'S-BAND CHECKOUT',point:'Shielded patch test hat',color:'#60b6ad'},
 ka:{name:'Ka receiver and bit comparator',label:'KA RECEIVER',point:'Conducted RF test port',color:'#d2a564'},
 optical:{name:'Optical alignment bench',label:'OPTICAL ALIGNMENT',point:'Shrouded optical test head',color:'#aaa1d5'}
};
const stationNames={
 checkout:'Checkout console',compute:'Payload test rack',environment:'Cleanroom monitor',orbit:'Orbit simulator',
 data:'File-transfer test set',rf:'Radio test set',power:'Ground power cart',thermal:'Coolant service cart',
 attitude:'Attitude test bench',propulsion:'Propulsion service cart',mass:'Weighing equipment',fit:'Fairing clearance gauge',
 adapter:'Adapter inspection fixture',alignment:'Alignment telescope',avionics:'Spacecraft command console'
};
const wording=(title,question,explanation,procedure,refs)=>({title,question,explanation,procedure,sources:refs.map(k=>resources[k])});
const guides={
 conops:wording('Rehearse the first minutes in orbit','How do you rehearse liftoff with the spacecraft standing still?',
  'The checkout console can send a separation signal while the spacecraft sits on its stand. Engineers can follow the same chain of commands the flight computer will issue in orbit.',
  'Replay separation and the latch signals through the test harness. Check that each command waits for its prerequisite before enabling the payload.',['rehearsal','gevs']),
 environment:wording('Keep the exposed surfaces clean','Why count dust beside a spacecraft?',
  'A particle that settles on an optical window can scatter light. While the covers are open, a sampling probe counts airborne particles near the work. A separate thermal test later recreates the cold vacuum of space.',
  'Check the sampling location and log particle counts during open work. Inspect witness samples for material that actually reached exposed surfaces.',['clean','gevs']),
 orbit:wording('Give the flight computer an orbit','How can a computer see sunrise inside a building?',
  'The orbit simulator sends a time-ordered record of sunlight and shadow through the test harness. A whole orbit can pass on the console while the spacecraft stays on the floor.',
  'Replay the selected orbit. Compare the times of shadow entry and exit with the events the flight computer records. Include a continuously sunlit orbit when the geometry permits it.',['orbit','rehearsal']),
 compute:wording('Load the payload hardware','Will the model fit when the processors are running?',
  'Weights are only part of the load. An inference service also keeps working data for its users. Training keeps optimizer and gradient data. The payload test rack exercises the selected workload on the installed hardware.',
  'Load the selected model and precision. Run a representative input and record peak accelerator memory and electrical demand at the specified workload.',['inference','hardware']),
 data:wording('Follow a file all the way back','How can you tell that every byte survived the trip?',
  'The test set writes a known file to the spacecraft recorder and reads it back. A checksum lets the team catch a single changed bit even when the two files have exactly the same length.',
  'Write a test file, interrupt the transfer, then resume it and compare the returned file with the original. Repeat with the recorder near its allocated limit.',['hardware','rehearsal']),
 comm:wording('Close the command loop','How do you talk to a spacecraft that is still inside the building?',
  'A shielded test hat fits over the starboard patch. It couples the radio to a ground rack by coax. The rack can act like a ground station while the spacecraft sits on its stand.',
  'Send a harmless command and listen for the flight computer’s acknowledgement in the returned telemetry. A carrier lock alone cannot show that the command reached the computer.',['radio','hat','gevs']),
 power:wording('Rehearse the loss of sunlight','What keeps the computer alive when the solar wings go dark?',
  'A ground power cart supplies the spacecraft while its wings are folded. Engineers can reduce the simulated solar supply and watch the battery take the load, then restore illumination and check the recharge.',
  'Run a scripted loss and return of solar input. Record bus voltage and pack current at the handover and compare the energy used with the planned battery operating range.',['power','rehearsal']),
 thermal:wording('Give the heat a path out','Where does processor heat go with the radiators folded?',
  'Inside the bay, a service cart can carry heat away through a ground cooling connection. In orbit, the spacecraft has to move that heat to its own radiators and emit it into space.',
  'Trace the supply and return lines. Under a known load, measure coolant flow and the temperature rise across the payload to determine how much heat the cart removes.',['coolant','gevs']),
 attitude:wording('Check the direction of a turn','How do you test a turn while the spacecraft stands still?',
  'A projector shows a star pattern to the reference sensor under the black sleeve. The pattern can drift as if the spacecraft were turning. The sleeve keeps the room lights out so the sensor sees only its little patch of sky.',
  'Project a known sky and compare the reported orientation with the reference. Shift the pattern and check that the flight computer requests a correction in the expected direction.',['attitude','orbit']),
 prop:wording('Check the two propellant paths','How do you check a feed line before loading its propellant?',
  'An inert-gas service cart lets specialists isolate valves and look for leaks. In flight, helium pushes fuel and oxidizer through separate circuits so they meet at the engines.',
  'Identify each service connection against the feed drawing. The approved leak test uses specified conditions and calibrated instruments. Final propellant loading belongs in a designated servicing facility.',['service','gevs']),
 mass:wording('Weigh what will actually fly','Why does a spacecraft need more than one weighing point?',
  'Separate supports share the weight. Their readings add up to the total, and the differences between them reveal which way the load is offset. The stand’s own weight must be removed from the readings.',
  'Establish the empty fixture weight, then repeat with the stowed spacecraft and its flight adapter. Compare the measured mass with the launch manifest.',['weigh','gevs']),
 launch:wording('Check the fit under the fairing','Could a single protruding fitting keep the fairing from closing?',
  'The rocket’s nose tapers. Teams compare the widest point at each height with the space available there and leave room for motion during launch. A clearance gauge makes the tightest section easier to see.',
  'Inspect the closest approach in the stowed design. On hardware, survey that feature and check the result against the launcher’s controlled payload envelope.',['mating','gevs']),
 launcher:wording('Match the spacecraft to its ride','Where does the rocket carry the weight of the spacecraft?',
  'The adapter carries the launch loads into the rocket. The fixture lets technicians check access to the mating interface before the flight hardware is joined. The adapter itself also uses part of the launch allowance.',
  'Check the mating surfaces, alignment features and connector access against the provider’s interface drawing. Verify that the adopted mass allowance applies to the intended orbit.',['mating']),
 mechanical:wording('Survey the attachment stations','Where do the folded wings and radiators send their launch loads?',
  'At each cassette the release fittings and bearing transfer load into the side frame. Each folded radiator has support at its root and near its free end. The alignment telescope surveys the fitting stations against the spacecraft datum.',
  'Choose End-on to inspect the four mounting faces, then Side elevation to see how far apart the restraints are. The survey would check these positions before mating the vehicle to the adapter.',['alignment','gevs']),
 software:wording('Rehearse the release sequence','How can engineers test flight logic on the floor?',
  'The flight computer can receive synthetic orbit and sensor inputs from a checkout console. Engineers exercise transitions while hardware remains restrained.',
  'Replay a separation indication with deployment inhibited. Verify the expected command history, then repeat with a simulated latch release.',['orbit','rehearsal']),
 avionics:wording('Ask the spacecraft to answer back','Which computer listens when Earth sends a command?',
  'The spacecraft flight computer can run while the customer’s AI processors are idle. A ground console sends a command and checks the returned spacecraft status to confirm the right equipment acted.',
  'Send a harmless test command with a known expected response. Check the returned status, packet timing and command history through the flight computer.',['hardware','rehearsal']),
 purpose:wording('Try the customer’s order','What would count as a successful result for the customer on Earth?',
  'A flight computer can be healthy even when the AI service returns an unusable result. This rack exercises the customer payload with a representative order and checks what the Earth user would receive.',
  'Run the reference order and compare its returned product with the customer acceptance condition.',['rehearsal','inference'])
};
const fact=(label,value,unit,basis,precision=1)=>({label,value,unit,basis,precision});
const result=(facts,interpretation,status='info')=>({facts,interpretation,status});
const fitFlag=pass=>pass?'within':'exceeds';
const n=(x,d=1)=>x.toLocaleString('en-US',{maximumFractionDigits:d});
const time=(label,value,basis)=>fact(label,value,'s',basis,2);
const gb=(label,value,basis)=>fact(label,value,'GB',basis,2);
const mm=(label,metres,basis)=>fact(label,metres*1000,'mm',basis,1);
const kg=(label,value,basis)=>fact(label,value,'kg',basis,1);
const power=(label,value,basis)=>fact(label,value,'kW',basis,2);
function customerTest(h){
 const a=h.ai,d=h.input;
 if(a.training){
  const adapted=d.aiPurpose==='finetune',artifact=d.artifactKind==='adapter'?'adapter':d.artifactKind==='restart'?'restart checkpoint':'model weights';
  const receive=d.artifactKind==='adapter'?'Load the adapter with its exact base model at the receiving end.':d.artifactKind==='restart'?'Restore the saved training state and reproduce the next step.':'Load the returned weights and run the agreed evaluation.';
  const mismatch=d.artifactKind==='adapter'&&(!a.artifactValid||d.baseCompatible!=='yes');
  return {...result([gb('Expected return file',a.artifactGB,'Selected artifact format and parameter count before packaging.'),fact('Allowed return time',d.artifactReturnHours,'h','Customer delivery window after the artifact is ready.'),fact('Training budget',d.trainingBudgetDays,'days','Elapsed campaign time allowed by the selected workload.')],
   mismatch?'The proposed adapter cannot meet the selected return contract. Review the artifact format and the base model at the receiver.':`For this ${adapted?'adaptation':'training run'}, the customer must receive a usable ${artifact} within ${n(d.artifactReturnHours)} hours after it is ready.`,mismatch?'exceeds':'info'),
   procedure:`Train on a small reference set and return the selected ${artifact}. ${receive}`,sources:[resources.training,resources.rehearsal]};
 }
 if(d.aiPurpose==='voice')return {...result([time('First audible reply goal',d.voiceFirstAudioTargetS,'Customer limit from end of speech to audible reply.'),time('Interruption goal',d.voiceInterruptionTargetS,'Customer limit from interruption to silence.'),fact('Audio per direction',d.voiceAudioKbps,'kbit/s','Encoded speech during an active stream, before transport overhead.')],
  'Play a recording of someone interrupting mid-sentence. Measure when the returned voice actually stops.'),procedure:'Replay timed speech and an interruption through the test rack. Compare the returned audio timing with the two customer limits.'};
 if(d.aiPurpose==='batch')return {...result([fact('Input per item',d.batchInputMB,'MB','Selected job file size.'),fact('Typical output per item',d.batchResultMB,'MB','Mean result size before the selected batch-size variation.'),fact('Delivery deadline',d.serviceDeadlineS/3600,'h','Time allowed from the offer to receipt on Earth.')],
  'A batch finishes for the customer when the requested items arrive and pass their quality check.'),procedure:'Stage a labeled test batch, include a gap in the return link, then count how many correct results arrive by the cutoff.'};
 if(d.aiPurpose==='agents')return {...result([fact('Serial model stages',d.agentSerialSteps,'stages','Stages on one task’s dependent chain.',0),fact('Workers per stage',d.agentFanout,'agents','Selected parallel search breadth.',0),fact('Tool calls sent to Earth',100*d.earthToolFraction,'%','Assumed share of tool calls that requires an Earth connection.')],
  'A task can stall on one remote tool call while other workers continue. Trace the waiting time along the chain that produces the final answer.'),procedure:'Run a reference task with a known verifier. Interrupt access to one Earth-side tool and check when the verified result can be returned.'};
 return {...result([time('First visible token goal',d.ttftTargetS,'Maximum customer wait from request to the first displayed token.'),time('Longest stream gap goal',d.streamGapTargetS,'Maximum pause in a stream after the first token.'),fact('Offered concurrency',d.serviceConcurrency,'slots','Customer sessions specified for the service design.',0)],
  'Time the request at the Earth-side console. Prompt upload and the return link both contribute to the first visible token.'),procedure:'Submit a known prompt from the test console and record the first token and the gaps in the stream at the receiving end.'};
}

function readings(domain,h) {
 const d=h.input, ai=h.ai;
 switch(domain){
  case 'purpose':return customerTest(h);
  case 'conops':return result([
   fact('Wings to deploy',4,'wings','Four independent roll-out assemblies in the fixed architecture.',0),
   fact('Radiator banks to release',2,'banks','Each bank latches and admits coolant separately.',0),
   fact('Planned end of deployment',DEPLOY_END_S/60,'min after liftoff','Nominal end of the commissioning sequence on the mission clock.',0)
  ],'A released panel and a working cooling loop are two different milestones. The flight sequence waits for the latches before admitting coolant.');
  case 'environment':return result([
   fact('Optical aperture',d.opticalApertureM*100,'cm','Clear diameter selected for the flight optical terminal.'),
   fact('Radiator surface to protect',h.radiatorM2,'m²','Combined planform of the two deployable banks, before counting both emitting faces.'),
   fact('Thermal boundary before release',d.launchBoundaryK,'K','Prescribed pre-separation enclosure boundary in the thermal model.')
  ],'The optical window and radiator coating have different jobs, but both depend on clean surfaces. Airborne particle concentration requires a measurement in the facility.');
  case 'orbit':{
   const a=R+d.altitudeKm, minutes=TAU*Math.sqrt(a**3/MU)/60;
   return result([fact('Target orbit period',minutes,'min','Keplerian period from the selected semi-major axis.'),fact('Orbital inclination',d.inclinationDeg,'°','Angle of the target orbital plane to Earth’s equator.'),fact('Target perigee altitude',a*(1-d.ecc)-R,'km','Lowest target radius minus the reference Earth radius.')],
    `One full orbit in this test script takes about ${n(minutes)} minutes of mission time. The initial orbit orientation and the date determine how much of it is in shadow.`);
  }
  case 'compute':return result([
   gb('Installed accelerator memory',ai.installedMemoryGB,'Aggregate device memory across the installed accelerator trays.'),
   gb('Workload memory estimate',ai.modelMemoryGB,'Model state and workspace for the selected precision and workload.'),
   gb('Memory headroom',ai.memoryMarginGB,'Installed device memory minus modeled workload memory.')
  ],ai.memoryMarginGB<0?`The workload needs ${n(-ai.memoryMarginGB)} GB more accelerator memory than this build carries. Revisit the tray count, model size or precision.`:
   'The selected workload fits the aggregate memory estimate. A representative run also exercises how data are divided among processors and moved between them.',fitFlag(ai.memoryMarginGB>=0));
  case 'data':return result([
   fact('Usable recorder space',h.usableTB,'TB','Installed storage after the selected disk reserve.'),
   fact('Installed write bandwidth',h.diskWriteGBs,'GB/s','Installed drive count times each selected drive’s write bandwidth.'),
   gb('Recorder allocation headroom',ai.storageMarginGB,'Usable recorder space minus resident weights, retained files, staging, and any scratch, restart and return files required by this workload.')
  ],ai.storageMarginGB<0?`The planned files exceed usable storage by ${n(-ai.storageMarginGB)} GB. Reduce the files kept aboard or increase recorder capacity.`:
   'The planned allocations fit the recorder. Sending a test file checks whether the right bytes can be recovered after an interruption.',fitFlag(ai.storageMarginGB>=0));
  case 'comm':return result([
   fact('Command traffic',d.commandKbps,'kbit/s','Design demand on the S-band command channel.'),
   fact('Health packet',h.cdh.packetBytes,'bytes','Flight computer housekeeping packet size, before radio framing and coding.',0),
   fact('Health sample interval',d.hkPeriodS,'s','Configured interval between flight housekeeping packets.')
  ],'A decoded test message checks the radio chain. Deliverable bytes on orbit also depend on pointing, station visibility and how long the pass lasts.');
  case 'power':{
   const usable=h.batteryKWh*(d.socMax-d.socMin),initial=h.batteryKWh*d.socInitial;
   return result([fact('Nameplate capacity',h.batteryKWh,'kWh','Installed beginning-of-life battery rating.'),fact('Usable operating band',usable,'kWh','Nameplate energy times the permitted state-of-charge range.'),fact('Energy at launch',initial,'kWh','Nameplate capacity times the chosen initial state of charge.')],
    `The flight controller reserves the bottom ${n(d.socMin*100)}% of the pack. A checkout that starts with a full charge can hide a problem that appears near that floor.`);
  }
  case 'thermal':return result([
   power('Installed active IT load',h.itKw,'Active electrical input for the installed payload including its compute support.'),
   power('Flight pump design load',h.pumpKw,'Installed electrical demand of the spacecraft coolant pump.'),
   fact('Flight radiator area',h.radiatorM2,'m²','Combined radiator planform. Both faces can emit heat after deployment.')
  ],d.thermalMode==='applied'?`The independent heat experiment specifies ${n(d.appliedHeatKw)} kW. The cart would need a measured heat-removal curve to run that case on the ground.`:
   'Use the active payload load when planning a heat-removal trial. The cart’s flow and cooling capacity must be established separately from the flight pump rating.');
  case 'attitude':return result([
   fact('Control moment gyros',h.cmg.count,'gyros','Installed gyro units in the spacecraft cluster.',0),
   fact('Commanded torque limit',d.cmgTorqueNm,'N·m','Selected control-system limit for the gyro cluster.'),
   fact('Usable momentum setting',d.cmgMomentumNms,'N·m·s','Modeled momentum limit of the controller for the full cluster.')
  ],'The optical check exercises the pointing estimate. In orbit the gyros act on that estimate. Their torque limits how quickly they can turn the spacecraft, and their stored momentum limits how long they can resist a steady disturbance.');
  case 'prop':{
   const p=h.propulsion;
   return result([fact('Fuel tank volume',p.tanks[0].volumeL,'L','Fuel capacity includes the selected unfilled volume.'),fact('Oxidizer tank volume',p.tanks[1].volumeL,'L','Oxidizer capacity includes the same fill-fraction allowance.'),fact('Regulated flight feed pressure',p.feedPa/1e6,'MPa abs','Nominal absolute flight feed pressure. Ground leak-test pressure is set by a separate approved procedure.',2)],
    `The design fills each liquid tank to ${n(d.tankFill*100)}% at loading. Helium occupies the remaining space and maintains feed pressure as propellant is used.`);
  }
  case 'mass':{
   const cap=Math.min(d.launchAllowanceKg,d.referenceKg),room=cap-h.launchKg;
   return result([kg('Fueled spacecraft',h.wetKg,'Installed spacecraft at loading including propellant and pressurant.'),kg('Launch adapter',d.adapterKg,'The adapter is counted in the launched stack and separates from the spacecraft.'),kg('Total launched mass',h.launchKg,'Modeled wet spacecraft plus adapter. Ground fixtures are excluded.')],
    room>=0?`The stack is ${n(room,0)} kg inside the tighter of the mission allowance and the launcher’s reference rating. Stowed size has its own check.`:
    `The stack exceeds the tighter launch mass allowance by ${n(-room,0)} kg. Inspect the mass budget before planning a mate.`,fitFlag(room>=0));
  }
  case 'launch':{
   const f=h.fairing,good=f.fit;
   const place=f.limitingPart.charAt(0).toLowerCase()+f.limitingPart.slice(1);
   let line=`The tightest radial point is at the ${place}. `;
   line+=good?'The modeled stack clears both the side and the top of the adopted envelope. The provider’s interface drawing supplies the final fit criteria.':
    f.radialClearanceM<0&&f.axialClearanceM<0?'The installed package crosses both the side and the top of the adopted envelope.':
    f.radialClearanceM<0?'The folded stack crosses the available side clearance. Try a wider envelope or reduce the folded width.':'The top of the stack extends beyond the available height. Review the adapter height and folded stack length.';
   return result([mm('Closest side clearance',f.radialClearanceM,'Minimum radial gap across the adopted profile after the lateral motion allowance.'),mm('Clearance above the stack',f.axialClearanceM,'Usable height minus stowed stack length and axial motion allowance.'),fact('Height of tightest side fit',f.limitingZM,'m','Axial station measured upward from the adapter reference plane.',2)],line,fitFlag(good));
  }
  case 'launcher':{
   const v=launchFleet[d.launcher];const room=Math.min(h.massMarginKg,h.launchReferenceMarginKg);
   return {...result([kg('Launch stack',h.launchKg,'Wet spacecraft including the flight adapter.'),kg('Mission allowance',d.launchAllowanceKg,'Editable allowance for the selected launch mission.'),kg('Launcher reference rating',d.referenceKg,'Published or study-case low Earth orbit payload value for this configuration.')],
    room>=0?`${v.name} has ${n(room,0)} kg of headroom on the tighter mass screen. The interface still needs a documented mechanical and electrical fit check.`:
    `The launch stack exceeds the tighter mass screen by ${n(-room,0)} kg. Check both the vehicle reference and the mission-specific allowance.`,fitFlag(room>=0)),
    sources:[resources.mating,ref(v.sourceTitle,v.sourceUrl)]};
  }
  case 'mechanical':{
   const cm=componentCentroid(h,h.propellantKg,0,true);
   return result([mm('Lateral mass offset',Math.hypot(cm[0],cm[1]),'Distance of the stowed, fueled stack’s calculated mass center from the body Z axis. Includes the flight adapter.'),fact('Mass center along Z',cm[2],'m','Signed distance from the bus center along the launch axis, with adapter attached.',3),fact('Enclosed bus length',h.bodyLengthM,'m','Structural body dimension along the same axis.',2)],
    'The survey and the mass budget share a body reference. Surveyed mount positions can update the equipment coordinates used to predict the balance point.');
  }
  case 'software':return result([
   fact('Nominal gyro torque authority',d.cmgTorqueNm,'N·m','Installed torque capacity used by the simulated body controller.'),
   fact('Stored angular momentum capacity',d.cmgMomentumNms,'N·m·s','Installed cluster allocation before maneuver reserve.'),
   fact('Magnetic dipole authority',d.dipoleAm2,'A·m²','Upper dipole command in flight. The local magnetic field determines the torque.')
  ],'A checkout can exercise interlocks without rotating the vehicle. The in-flight rate response depends on the real mass distribution and available actuator authority.');
  case 'avionics':{
   const seconds=Math.floor(d.hkRecorderMB*1e6/h.cdh.packetBytes)*d.hkPeriodS;
   return result([fact('Flight computer design load',h.cdh.operatingW,'W','Operating allocation for the installed command and data handling suite.',0),time('Health sample interval',d.hkPeriodS,'Time between successive spacecraft health packets.'),fact('Health log capacity',d.hkRecorderMB,'MB','Dedicated onboard housekeeping ring buffer, in decimal megabytes.',0)],
    `At one ${h.cdh.packetBytes}-byte packet per sample, that buffer holds about ${n(seconds/3600)} hours of health history before older records are overwritten, assuming no offload.`);
  }
 }
}
export function bayLesson(domain,hardware,bench='sband'){
 const key=Object.hasOwn(stations,domain)?domain:'conops',station=bayStationFor(key);
 const lesson={domain:key,station,stationName:stationNames[station],...guides[key],...readings(key,hardware)};
 if(key==='comm'){
  const d=hardware.input,selected=Object.hasOwn(commFixtures,bench)?bench:'sband';
  lesson.stationName=commFixtures[selected].name;
  if(selected==='ka')Object.assign(lesson,wording('Receive a known bit sequence','Can the station recover the exact bits the Ka transmitter sent?',
   'The bench taps the transmitter through a test port. A calibrated attenuator reduces the signal before the station receiver compares the decoded bits with the known sequence.',
   'Try raising the path loss on the bench. A completed receiver comparison exercises the modem and data path. Engineers measure the reflector pattern separately on an antenna range.',['radio','gevs']),
   result([fact('Reflector diameter',d.kaDishM,'m','Installed flight reflector. The conducted test taps the feed upstream of this aperture.'),
    fact('Flight beamwidth',terminalPattern(d,'Ka').fullWidthRad*180/Math.PI,'°','Calculated full half-power beamwidth at 26 GHz. A range or chamber characterizes this angle.',2)],
   'A strong conducted result establishes receiver compatibility for the tested conditions. An antenna-pattern measurement is separate evidence.'));
  else if(selected==='optical')Object.assign(lesson,wording('Find the optical boresight','Where does the returning spot fall when the beacon is centered?',
   'A light-tight boot encloses the flight aperture and a small collimator. The bench presents a distant-looking beacon and observes the downlink direction on a focal-plane sensor.',
   'Introduce a pointing offset and compare the returned spot with the target center. Spacecraft motion and atmospheric fading require additional testing.',['optical']),
   result([mm('Flight aperture',d.opticalApertureM,'Clear optical diameter used by this mission’s diffraction estimate.'),
    fact('Reference half-angle',terminalPattern(d,'Optical').fullWidthRad*5e5,'µrad','Diffraction angle for the installed aperture at the modeled 1,550 nm wavelength.',1),
    fact('Flight jitter assumption',d.opticalJitterUrad,'µrad','Study fine-pointing residual, separate from the adjustable static test offset.')],
   'A small bias uses part of the available pointing budget before jitter, thermal drift or on-orbit motion are added.'));
 }
 if(key==='launch'&&hardware.input.launcher==='starship'){
  lesson.question='How much room does the data center have inside Starship?';
  lesson.explanation='The stowed spacecraft must fit inside the tapering cargo volume. A clearance check compares the installed vehicle at each height with the adopted envelope inside the intact ship. The side hatch also has its own width, height and extraction limits.';
  lesson.procedure='Survey the limiting feature, the sill and the frame above the hatch. Confirm the carriage can carry the full stowed load through the opening before release.';
  lesson.stationName='Cargo-envelope clearance gauge';
  lesson.sources=[{title:'SpaceX · Starship Users Guide, Figure 4',url:'https://www.spacex.com/media/starship_users_guide_v1.pdf#page=3'},resources.gevs];
 }
 return lesson;
}
