// Interpret existing flight-model channels. The lesson never advances the clock.
const standard=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
const fine=new Intl.NumberFormat('en-US',{maximumSignificantDigits:3});
const format=x=>Number.isFinite(x)?(x!==0&&Math.abs(x)<.01?fine:standard).format(x):'—';
const fact=(label,value,unit='')=>({label,value:typeof value==='number'?format(value)+(unit?' '+unit:''):String(value??'—')});
const card=(question,explanation,evidence,action)=>({question,explanation,evidence,action});
const link=(label,domain)=>({label,domain});
const chapter=(label,id)=>({label,chapter:id});
const rate=h=>h.ai.unit+'/s';

function customer(h,s){
 const route=s.aiActiveRoute,open=s.aiRouteDownMbps>0,p=h.ai.purposeId;
 const routeFact=fact('Earth return path',open?(route==='relay'?'Relay':'Ground station'):'Unavailable');
 if(h.ai.training){
  const complete=s.aiCompletedAt!=null,delivered=s.aiReturnedAt!=null;
  return card('When can Earth use the trained model?', delivered?'Earth has received the requested artifact. Its usefulness still depends on the customer’s evaluation and, for an adapter, access to the matching base model.':
   complete?'The training run has reached its token goal. Writing the artifact and delivering its bytes to Earth take additional time.':
   'Workers can reread a staged training corpus through a contact gap. The final artifact only becomes available after the run reaches its token goal.',
   [fact('Training goal completed',100*s.aiTrainingTokens/h.ai.trainingGoalTokens,'%'),fact('Requested artifact',h.ai.artifactGB,'GB'),fact('Artifact received on Earth',s.aiProductDeliveredGB,'GB')],link('Inspect the return path','comm'));
 }
 const explanation={
  text:open?'A return path is open. A live turn succeeds only when the user gets its first token and the rest of the stream within the service limits.':'The processors can finish work on staged prompts during a link gap. A waiting user can see the answer only after a return path opens.',
  voice:open?'Two-way speech needs a timely uplink for the user’s next words and downlink for the reply. Even a brief handover can interrupt an otherwise fast turn.':'A waiting audio reply can occupy storage during this gap. Delivering it later cannot recover the timing of a live conversation.',
  batch:'Staged jobs can finish between contacts. An order meets its deadline when the required results have arrived on Earth, so both the queue and the next transfer window matter.',
  agents:'A local tool call can continue through a link gap. A dependent call to an Earth tool must wait for a route, even when accelerator capacity is available.'
 }[p];
 return card({text:'Can the user see the answer yet?',voice:'Can a conversation continue through this instant?',batch:'When does a finished batch count as delivered?',agents:'Which part of a research task needs Earth?'}[p],
  explanation,[routeFact,fact('Onboard work rate',s.aiUnitRate,rate(h)),fact('Customer output waiting',s.aiProductQueueGB,'GB')],link('Follow outbound data','data'));
}
function electrical(h,s){
 const minimum=s.availableKWh*h.input.socMin;
 if(s.unmetKW>.001)return card('What happens when the bus cannot supply the requested load?','The arrays and permitted battery discharge fall short of demand. Compare requested and served power before crediting the payload with its full work rate.',
  [fact('Requested',s.loadKW,'kW'),fact('Served',s.servedLoadKW,'kW'),fact('Shortfall',s.unmetKW,'kW')],link('Inspect compute throughput','compute'));
 if(s.dischargeKW>.001){
  const mins=Math.max(0,s.batteryKWh-minimum)*h.input.dischargeEff/s.dischargeKW*60;
  return card('How long could the battery sustain this deficit?',(s.eclipse?'Earth blocks direct sunlight. ':'Generation is below the bus demand. ')+
   'Holding this discharge rate constant, the usable energy above the charge floor sets the time available. The next change in sunlight or workload changes this estimate.',
   [fact('Battery to bus',s.dischargeKW,'kW'),fact('Energy above floor',Math.max(0,s.batteryKWh-minimum),'kWh'),fact('At this discharge rate',mins,'min')],link('Inspect illumination','environment'));
 }
 if(s.chargeKW>.001)return card('Where does the spare sunlight go?','The arrays supply the bus first. Leftover power can charge the pack up to its charge-rate and energy limits. Conversion losses reduce the energy that reaches storage.',
  [fact('Array generation',s.solarKW,'kW'),fact('Bus demand',s.loadKW,'kW'),fact('Sent to charger',s.chargeKW,'kW')],link('Trace heat from the pack','thermal'));
 return card('Can the battery accept more power?',s.curtailedKW>.001?'The bus already has the power it needs. The pack cannot accept all the surplus at this instant, so the power system curtails generation.':'Energy can stay nearly steady while the bus supplies its loads. Read generation and battery flow together to see which source carries them.',
  [fact('Array generation',s.solarKW,'kW'),fact('Battery charge',s.socPct,'%'),fact('Curtailed surplus',s.curtailedKW,'kW')],link('Inspect the array orientation','attitude'));
}
function radio(s){
 if(s.aiRelayOn)return card('How can data reach Earth between direct passes?','The selected relay supplies a modeled route to Earth. Its allocated capacity and handover schedule determine when queued bytes can leave the spacecraft.',
  [fact('Customer downlink capacity',s.aiRouteDownMbps,'Mbit/s'),fact('Customer output flowing',s.aiOutputMbps,'Mbit/s')],link('Inspect the recorder','data'));
 if(!s.station)return card('What does a faster antenna buy during a gap?','A direct transfer needs a station above its elevation mask. More link capacity helps during contact. Staged work and recorder space determine how the spacecraft uses the gap.',
  [fact('Direct stations in view','None'),fact('Data waiting',s.queueGB,'GB')],chapter('Inspect a ground pass','contact'));
 if(!s.acquired)return card('The station is visible. Is the link ready?','A pass begins when the station rises into view. Acquisition time and pointing clearance can delay payload transfer after that instant.',
  [fact('Visible station',s.station),fact('Time in view',s.contactAgeSec,'s'),fact('Acquisition setting',s.acquisitionSec,'s')],link('Inspect pointing','attitude'));
 return card('How much of the link is moving files?','Coding overhead, the service allocation, and the available queue all affect delivery. The application rate measures the bytes actually leaving the recorder.',
  [fact('Physical line rate',s.lineMbps,'Mbit/s'),fact('Payload delivered per second',s.goodputMbps,'Mbit/s'),fact('Terminal draw',s.terminalKW,'kW')],link('Follow the queue','data'));
}
function thermal(h,s){
 const row=s.thermalQualification?.find(n=>n.id===s.thermalGoverningNode);
 if(row&&row.marginK<0)return card('Which component has crossed its temperature limit?',row.label+' is outside its '+row.state+' band. Its signed margin measures the distance to the nearer boundary, so the sign and the component’s activity both matter.',
  [fact(row.label,row.temperatureK,'K'),fact('Applicable band',format(row.minK)+'–'+format(row.maxK)+' K'),fact('Margin',row.marginK,'K')],link('Check the power being consumed','power'));
 const applied=h.input.thermalMode==='applied';
 return card('How much cooling does the radiator actually provide?',(applied?'The loop is running the independent applied-heat experiment. ':'The loop carries heat from the working hardware. ')+
  'Subtract absorbed sunlight, reflected light and Earth infrared from gross emission to get net rejection. In eclipse, Earth still radiates infrared.',
  [fact('Emitted',s.grossEmissionKW,'kW'),fact('Absorbed',s.absorbedKW,'kW'),fact('Net rejected',s.netRejectionKW,'kW')],link('Trace the environmental heating','environment'));
}
function operating(id,h,s){
 const d=h.input;
 switch(id){
 case 'purpose':case 'conops':return customer(h,s);
 case 'power':return electrical(h,s);
 case 'comm':return radio(s);
 case 'thermal':return thermal(h,s);
 case 'environment':return card(s.eclipse?'What still reaches the radiator in eclipse?':'Why does turning a panel change its heat load?',s.eclipse?'Earth blocks the direct solar beam. The warm planet still fills part of each radiator’s view, so the panels keep absorbing infrared while they emit heat.':'A radiator sees a changing mix of Sun, Earth and deep space as it turns. Its orientation changes the absorbed heat as well as the area facing the oncoming atmosphere.',
  [fact('Direct Sun on radiators',s.radiatorDirectSolarKW,'kW'),fact('Earth-reflected light',s.radiatorAlbedoKW,'kW'),fact('Earth infrared',s.radiatorEarthIRKW,'kW')],link('Read the heat balance','thermal'));
 case 'orbit':return card('Why can two orbits at the same height have different shadow times?','Solar beta is the Sun’s angle above or below the orbital plane. As its magnitude grows, the spacecraft can pass clear of Earth’s shadow. Orbit period alone cannot tell you how long the pack must supply the bus.',
  [fact('Solar beta angle',s.betaDeg,'°'),fact('Current period',s.periodSec/60,'min'),fact('Direct sunlight',s.eclipse?'Blocked by Earth':'Available')],link('Read battery draw','power'));
 case 'data':return card('Which bytes are waiting for a ride?',s.goodputMbps>.0001?'Compare production with delivery to tell whether the recorder is filling or draining. Even during a transfer, a busy payload can add data faster than the link removes it.':s.aiRouteDownMbps>0&&s.queueGB<.001?'A return path is available and the queue is empty at this instant. Link capacity describes the traffic it could carry, while delivery measures what the recorder actually sent.':'Data generated without a usable route stay on the recorder while space remains. The link can move a backlog faster than new results arrive once contact opens.',
  [fact('Queued onboard',s.queueGB,'GB'),fact('Offered by payload',s.offeredMbps,'Mbit/s'),fact('Delivered downlink',s.goodputMbps,'Mbit/s')],link('Inspect the link','comm'));
 case 'compute':return card('What sets the useful work rate right now?',!h.ai.fit?'The workload exceeds the installed memory or storage allocation. Adding electrical power alone cannot make its working set fit.':s.aiUnitRate>0?'The payload is consuming staged input and using the installed accelerators. Useful throughput depends on the chosen workload, its data movement and the electrical power the bus can deliver.':!s.burst?'This instant is outside a scheduled compute burst. Idle processors may still draw electricity under the chosen standby policy.':'The burst is scheduled. Input staging, remaining campaign work and available bus power determine whether it can produce results.',
  [fact('Workload',h.ai.label),fact('Working payload draw',s.itKW,'kW'),fact('Useful work rate',s.aiUnitRate,rate(h))],link('Follow the customer result','purpose'));
 case 'attitude':return card(s.desat?'Where does stored angular momentum go?':'Why can a steady spacecraft load its gyroscopes?',s.desat?'The magnetic coils push against Earth’s field and exchange angular momentum with the spacecraft. Their torque depends on field strength and direction, and they draw electrical power.':'Environmental torque accumulates angular momentum in the actuators, even while the body tracks steadily. Slewing the body or pointing the antenna also uses momentum capacity.',
  s.desat?[fact('Unloading torque',s.unloadTorqueNm,'N·m'),fact('Coil power',s.coilKW*1000,'W'),fact('Stored momentum',s.momentumNms,'N·m·s')]:
   [fact('Mode',s.attitudeModeLabel),fact('Momentum used',s.momentumNms,'N·m·s'),fact('Capacity remaining',s.cmgMarginNms,'N·m·s')],link('Inspect the ram-facing area','mechanical'));
 case 'prop':return card(s.burn?'What is this burn buying?':'Why does the tank level change in steps?',s.burnKind==='trim'?'The first spacecraft burn pays down the insertion trim after deployment. Expelling propellant changes the orbit and reduces the mass carried into the next burn.':s.burn?'The engine returns momentum lost to atmospheric drag. Watch accumulated impulse rise during firing and the propellant inventory fall.':'The atmosphere takes momentum away continuously. Scheduled burns spend propellant in short intervals to restore it. Part of the load is protected for retirement.',
  [fact('Propellant consumed',s.propellantUsedKg,'kg'),fact('Still in tanks',s.propellantKg,'kg'),fact('Disposal protection',s.disposalProtectedKg,'kg')],link('Inspect orbit maintenance','orbit'));
 case 'mass':return card('Which mass actually changes in orbit?','The dry structure and equipment stay aboard. Expelled propellant reduces the current wet mass, while the launch adapter was charged to the launch manifest.',
  [fact('Launched stack',h.launchKg,'kg'),fact('Current vehicle',s.wetKg,'kg'),fact('Propellant expelled',s.propellantUsedKg,'kg')],link('Inspect the tank inventory','prop'));
 case 'mechanical':return card('How can air twist a spacecraft in orbit?','The atmosphere acts on the silhouette facing the flight path. A force acting away from the center of mass also produces torque. The workbench multiplies drag force by the assumed pressure-center offset.',
  [fact('Ram-facing area',s.ramAreaM2,'m²'),fact('Pressure-center offset',d.cpOffsetM,'m'),fact('Aerodynamic torque',s.dragTorqueNm,'N·m')],link('Follow the torque into the gyros','attitude'));
 case 'avionics':return card('How does the spacecraft keep a history between contacts?','The flight computer records housekeeping packets whenever the recorder is powered. Its circular log retains the newest samples after it fills. AI output uses separate storage.',
  [fact('Health packet',h.cdh.packetBytes,'bytes'),fact('Sample interval',d.hkPeriodS,'s'),fact('Old log data overwritten',s.hkOverwrittenMB,'MB')],link('Compare payload storage','data'));
 case 'launch':return card('Who pays for an imperfect insertion?','Spacecraft propellant is budgeted for the trim after separation. Completing it early leaves later burns to replace drag losses and execute disposal.',
  [fact('Requested trim',d.trimDv,'m/s'),fact('Trim delivered',s.trimPaidDv,'m/s')],link('Inspect propulsion','prop'));
 case 'launcher':return card('What part of the launch decision still matters in orbit?','The launcher constrained the mass and folded size that could reach space. The spacecraft now carries its own propellant and power system. Its unfolded dimensions can exceed the launch envelope.',
  [fact('Launcher',h.launcherLabel),fact('Stowed spacecraft diameter',h.stowedDiameterM,'m'),fact('Installed solar area',h.solarM2,'m²')],link('Inspect the flight mass','mass'));
 }
}

function commissioning(id,h,s){
 if(['conops','purpose','compute','data','comm','avionics'].includes(id))return card('Why wait before admitting the first customer job?',
  'The spacecraft computer sequences the releases while the AI payload waits. A visible array or radiator can still be moving toward its commanded position. The work schedule opens after commissioning.',
  [fact('Current operation',s.deploymentTitle),fact('Spacecraft computer draw',s.cdhServedKW*1000,'W'),fact('AI work rate',s.aiUnitRate,rate(h))],link('Follow the power handoff','power'));
 if(['thermal','environment'].includes(id))return card('When does a radiator start carrying heat?','Opening a panel exposes its surface. Opening the coolant path connects that surface to the spacecraft’s heat source. Watch the connected area grow as each bank latches.',
  [fact('Connected panel area',s.radiatorCoupledM2,'m²'),fact('Installed panel area',h.radiatorM2,'m²'),fact('Served pump draw',s.servedPumpKW*1000,'W')],link('Follow the deployment mechanism','mechanical'));
 if(id==='power')return card('Can a wing generate power before the others finish deploying?','A wing can begin contributing as its blanket unrolls. The illuminated fraction and angle to the Sun govern its output. Loads can still draw on the battery during the sequence.',
  [fact('Area unrolled',s.solarDeployedM2,'m²'),fact('Array output',s.solarKW,'kW'),fact('Battery to bus',s.dischargeKW,'kW')],link('Inspect the Sun geometry','environment'));
 return card('Why are the appendages released in sequence?','The four wings and two radiator banks have distinct swept paths. Sequencing them gives each mechanism room to move and lets the flight computer confirm a latch before the next operation.',
  [fact('Current operation',s.deploymentTitle),fact('Deployment motor draw',s.deploymentJointKW*1000,'W')],link('Trace the coolant connection','thermal'));
}

function launch(id,h,s){
 const d=h.input,insertion=s.flightPhase==='insertion',ground=s.t<0;
 if(['launcher','launch','conops'].includes(id)){
  if(s.flightPhase==='integration')return card('Which fit check can stop a lift?',!h.payloadInterface.passes?'The lower spacecraft deck or an engine bell conflicts with the fixed adapter geometry. The crane holds the spacecraft at checkout.':!h.fairing.fit?'The spacecraft can reach its adapter, but its folded outline crosses the allowed envelope. The rehearsal stops before enclosure closure.':'The adapter must clear the engine bells, and the folded vehicle must fit inside the enclosure at every height. Passing one screen leaves the other to check.',
   [fact('Clearance around bells',h.payloadInterface.boreClearanceM*1000,'mm'),fact('Closest radial fit',h.fairing.radialClearanceM*1000,'mm'),fact('Overhead fit',h.fairing.axialClearanceM*1000,'mm')],{label:'Inspect the adapter in Phase B',phase:'B',domain:'launcher'});
  if(s.flightPhase==='pad')return card('Whose engines lift the stack off the pad?','The launch vehicle carries the wet spacecraft and its adapter. The spacecraft keeps its own liquid propellant for trim, drag compensation and retirement after separation.',
   [fact('Launch vehicle',h.launcherLabel),fact('Payload and adapter',h.launchKg,'kg'),fact('Spacecraft propellant',s.propellantKg,'kg')],chapter('Follow ascent','ascent'));
  return card(insertion?'What is left to do after injection?':'Does reaching space mean reaching orbit?',insertion?'The upper stage has supplied the injection energy. Compare the low and high points of the injected orbit with the mission target. The spacecraft can trim the remaining mismatch once deployment is complete.':'An ascending rocket also has to build sideways speed. The altitude trace shows the climb. The injection orbit describes the path the payload will follow after launch thrust ends.',
   insertion?[fact('Low point',s.perigeeKm,'km'),fact('High point',s.apogeeKm,'km'),fact('Requested trim',d.trimDv,'m/s')]:
   [fact('Height now',s.altitudeKm,'km'),fact('Target operating altitude',d.altitudeKm,'km')],link('Inspect the orbit','orbit'));
 }
 if(['orbit','attitude','prop'].includes(id))return card(insertion?'When can the spacecraft’s engines perform trim?':'Who determines the vehicle’s motion here?',insertion?'Separation changes who controls the flight. The deployed and latched spacecraft checks its pointing and available propellant before its trim burn.':'The launcher carries the restrained spacecraft. The spacecraft’s chemical trim and autonomous pointing take effect later in the flight sequence.',
  [fact('Pointing mode',s.attitudeModeLabel),fact('Allocated trim',d.trimDv,'m/s'),fact('Delivered trim',s.trimPaidDv,'m/s')],chapter(insertion?'Visit commissioning':'Inspect separation',insertion?'commissioning':'insertion'));
 if(id==='mechanical')return card('Why support the ends of a folded appendage?','The cassette end restraints and folded radiator hold-downs transfer launch inertia into side-frame stations. After separation the release sequence frees the drives. The end-on view shows the four attached faces and the side elevation separates the support stations.',[fact('Body length along launch axis',h.bodyLengthM,'m'),fact('Occupied tray positions',h.rackLayout.installed),fact('Total geometric tray positions',h.rackLayout.capacity)],link('Check the launch envelope','launch'));
 if(id==='mass')return card('Which parts cross the separation plane?','The launch allowance includes the mission adapter as well as the fueled spacecraft. At separation the lower adapter stays with the launcher, and the passive attachment ring stays with the spacecraft.',
  [fact('Launch stack',h.launchKg,'kg'),fact('Adapter allocation',d.adapterKg,'kg'),fact('Fueled spacecraft',h.wetKg,'kg')],{label:'Inspect both faces in Phase B',phase:'B',domain:'launcher'});
 if(['power','thermal','environment'].includes(id)){
  if(ground)return card('What should the ground team reproduce?',id==='thermal'?'The coolant cart can impose a load and measure the heat carried away. The installed radiator area becomes available in orbit only after deployment and coolant admission.':'The folded spacecraft cannot use its full solar or radiator area in the bay. A ground trial supplies the electrical or thermal boundary conditions that flight hardware will later encounter.',
   [fact('Solar area unrolled',s.solarDeployedM2,'m²'),fact('Connected radiator area',s.radiatorCoupledM2,'m²'),fact('Ground boundary assumption',d.launchBoundaryK,'K')],chapter('Compare with deployment','commissioning'));
  return card('What powers the spacecraft before its arrays open?','The solar wings are restrained, and the battery supplies the spacecraft bus in the flight model. Opening arrays later changes the energy source. Circulating coolant through latched radiators changes the heat path.',
   [fact('Array generation',s.solarKW,'kW'),fact('Battery to bus',s.dischargeKW,'kW'),fact('Spacecraft bus served',s.servedLoadKW,'kW')],chapter('Watch deployment','commissioning'));
 }
 if(id==='avionics'||id==='comm')return card('How does a checkout differ from a customer transfer?','Engineers can command spacecraft electronics and read their health before the customer payload starts. In flight the housekeeping recorder and command channel remain separate from the AI product queue.',
  [fact('Health sample size',h.cdh.packetBytes,'bytes'),fact('Engineering recorder',d.hkRecorderMB,'MB'),fact('Customer output on board',s.aiProductQueueGB,'GB')],link('Inspect the customer recorder','data'));
 return card('What can launch with the data center before it computes anything?','Model weights and staged input can travel in storage. Having the input on board allows the payload to begin work after commissioning even if the next upload must wait for contact.',
  [fact('Resident model weights',h.weightsTB,'TB'),fact('Staged AI input',s.aiInputBufferGB,'GB'),fact('Current work rate',s.aiUnitRate,rate(h))],chapter('Follow commissioning','commissioning'));
}

function closeout(id,h,s,plan){
 const d=h.input,raised=d.disposalMethod==='graveyard',status=s.disposalStatus;
 if(status==='infeasible'||plan?.feasible===false)return card('What stopped the retirement plan?',(status==='infeasible'?s.disposalReason:plan?.reason)||'The requested retirement maneuver exceeds one of the modeled constraints. Inspect the terminal burn ledger to see which condition was reached.',
  [fact('Usable propellant at this instant',s.disposalPropAvailableKg,'kg'),fact('Disposal propellant spent',s.disposalUsedKg,'kg'),fact('Velocity change delivered',s.disposalPaidDv,'m/s')],id==='prop'?link('Inspect the orbit','orbit'):link('Inspect the burn ledger','prop'));
 if(['purpose','data','compute','comm','avionics'].includes(id)){
  if(id==='avionics')return card('How far can the engineering log follow the spacecraft?',raised?'The recorder accumulates powered housekeeping samples through the modeled maneuver. The model closes the hardware record at the final orbit.':'The recorder history ends at the modeled hardware boundary. The descent trace below the atmospheric interface follows a single reference body.',
   [fact('Engineering log retained',s.hkStoredMB,'MB'),fact('Older log overwritten',s.hkOverwrittenMB,'MB')],link('Inspect the modeled boundary','mechanical'));
  return card('What did Earth actually receive by retirement?',h.ai.training?'Finishing the training budget and transferring the requested artifact are separate milestones. Compare returned bytes with the requested artifact size and inspect the paused customer ledger.':'Customer processing ends before the disposal maneuver. Outputs already delivered count toward the Earth-side ledger. Bytes still aboard are unfinished delivery.',
   h.ai.training?[fact('Requested artifact',h.ai.artifactGB,'GB'),fact('Product received',s.aiProductDeliveredGB,'GB'),fact('Artifact receipt',s.aiReturnedAt==null?'Pending':'Completed')]:
   [fact('Customer output produced',s.aiProductGeneratedGB,'GB'),fact('Customer output received',s.aiProductDeliveredGB,'GB'),fact('Customer output queued',s.aiProductQueueGB,'GB')],{label:'Review operating service in Phase E',phase:'E',domain:'purpose'});
 }
 if(id==='prop'||id==='mass')return card('How much propellant has the retirement maneuver actually used?',raised?'The orbit-raising and circularization burns draw from the same tanks, with a coast between them. The cumulative disposal spend can increase again at the second ignition.':'The retrograde burn spends propellant to lower perigee. After cutoff the spacecraft can still be losing altitude with no additional chemical expenditure.',
  [fact('Protected allocation',s.disposalProtectedKg,'kg'),fact('Disposal spend to date',s.disposalUsedKg,'kg'),fact('Still in tanks',s.propellantKg,'kg')],link('Follow the trajectory','orbit'));
 if(['thermal','power','attitude'].includes(id))return card('At what point do the hardware readings end?',raised?'Flight hardware is modeled through the terminal maneuver and the endpoint of the raised orbit. Values at the endpoint describe the last modeled condition.':'Hardware temperatures, power flow and actuator state cover the flight to the atmospheric interface. The entry trajectory below it uses a separate reference-body model.',
  [fact('Hardware telemetry',s.referenceBody?'Ends at interface':status==='graveyard'?'At endpoint':'Within flight model'),fact('Disposal status',status),fact('Current altitude',s.altitudeKm,'km')],link('Inspect the disposal trajectory','orbit'));
 if(raised)return card('Why does reaching the target height take two burns?',status==='graveyard'?'The first burn raised the high point. The second raised the low point near the target. Comparing both endpoints with the requested altitude tests how nearly circular the achieved orbit is.':'The first burn raises apogee, the high point of the orbit. After coasting to that region, a second forward burn raises perigee, the low point, toward the same altitude.',
  [fact('Requested circle',d.graveyardAltitudeKm,'km'),fact('Perigee now',s.perigeeKm,'km'),fact('Apogee now',s.apogeeKm,'km')],link('Inspect the two-burn ledger','prop'));
 if(['mechanical','environment'].includes(id))return card('What does the landing ellipse describe?','The ellipse encloses 95% of modeled impacts under the assumed entry and drag uncertainties for one surviving, non-lifting body. Predicting which real components survive breakup requires their materials and a separate demise analysis.',
  plan?.footprint?[fact('Major semiaxis',plan.footprint.semiMajorKm,'km'),fact('Minor semiaxis',plan.footprint.semiMinorKm,'km'),fact('Ballistic coefficient',d.entryBallisticKgM2,'kg/m²')]:
   [fact('Ballistic coefficient',d.entryBallisticKgM2,'kg/m²'),fact('Entry interface',s.entryAltitudeKm,'km')],link('Compare the commanded target','orbit'));
 const miss=plan?.targetErrorKm??s.disposalTargetErrorKm,tol=d.targetToleranceKm;
 return card('Will the nominal impact fall inside the target circle?',Number.isFinite(miss)?
  'The target circle is the allowed miss distance. The predicted impact '+(miss<=tol?'falls inside':'falls outside')+' that circle. The separate ellipse shows spread about the predicted impact, even when the center misses the target.':
  'The retrograde burn brings perigee into the atmosphere. Burn timing and Earth’s rotation determine where the reference body meets the surface. The target radius is the allowed miss distance.',
  Number.isFinite(miss)?[fact('Nominal miss',miss,'km'),fact('Allowed miss',tol,'km')]:[fact('Target perigee',d.disposalTargetPerigeeKm,'km'),fact('Allowed miss',tol,'km')],
  link('Interpret the landing ellipse','mechanical'));
}
const thermalSource={title:'NASA · thermal control and environmental heating',url:'https://www.nasa.gov/smallsat-institute/sst-soa/thermal-control/'};
const attitudeSource={title:'NASA · spacecraft pointing and momentum control',url:'https://www.nasa.gov/smallsat-institute/sst-soa/guidance-navigation-and-control/'};
const demiseSource={title:'NASA · how component survival is assessed',url:'https://orbitaldebris.jsc.nasa.gov/reentry/orsat.html'};
export function flightTeaching(phase,id,h,s,view,disposalPlan){
 if(id==='software'){
  const ended=s.referenceBody||s.spacecraftModelEndedAt!=null&&s.t>=s.spacecraftModelEndedAt;
  return card(phase==='D'?'Who owns pointing during launch?':phase==='F'?'When does onboard control end?':'What is the controller trying to do right now?',
   ended?'The vehicle control record ends here. The atmospheric trajectory continues as a reference body.':
   s.attitudeObjective||'The launcher carries the restrained vehicle until the modeled handover.',
   [fact('Controller',ended?'Control ended':s.attitudeModeLabel||'Carrier control'),fact('Engine authorization',ended?'Closed':s.burnPermitState||'Idle')],link('Inspect the actuators','attitude'));
 }
 if(phase==='F'){
  const lesson=closeout(id,h,s,disposalPlan);
  if((id==='mechanical'||id==='environment')&&h.input.disposalMethod==='reentry'&&s.disposalStatus!=='infeasible'&&disposalPlan?.feasible!==false)lesson.source=demiseSource;
  return lesson;
 }
 if(phase==='D')return launch(id,h,s);
 const lesson=s.flightPhase==='commissioning'?commissioning(id,h,s):operating(id,h,s);
 if(id==='environment'||id==='thermal')lesson.source=thermalSource;
 if(id==='attitude'&&s.flightPhase!=='commissioning')lesson.source=attitudeSource;
 return lesson;
}
