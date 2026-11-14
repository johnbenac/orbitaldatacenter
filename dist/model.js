import {launchClockFor,INSERTION_MET} from './launch-effects-state.js';
import {launchCompatibility,launchProgressState} from './launch-compatibility.js';
import {ascentTrack,launchPath} from './launch-path.js';
import {commissioningClock,deploymentProgress,deploymentMET,deploymentPowerKW} from './commissioning-clock.js';
import {deploymentStages,deploymentSchedule} from './deployment.js';
import {stepTransfers,clipTransfers,terminalRuns} from './terminal-activity.js';
import {relayGate,relayTiming} from './ai-service-inputs.js';
import {energyTemperatureLadder} from './energy-system.js';
import {dispatchEnergy} from './energy-dispatch.js';
import {checkpointWriteStep} from './data-custody.js';
import {stepThermalNetwork} from './thermal-network.js';
import {qualifyNow,thermalActivityMask,accumulateThermal,newThermalSummary} from './thermal-limits.js';
import {solveOuter,enclosureHeat} from './enclosure.js';
import {entryDensity,surfacePoint} from './entry.js';
import {ENTRY_KM,disposalRequirement,disposalIgnition,planDisposal,trajectoryAt} from './trajectory.js';
import {propulsionReview} from './spacecraft-architecture.js';
import {sizeDesign} from './design.js';
import {architectureFamily} from './architecture-families.js';
import {installedCommunications} from './communications-packages.js';
import {DAY,YEAR,R,MU,TAU,DEG,geometry,clip,dot,unit} from './orbit.js';
import {availableControl,localFieldUT,magneticControl,gravityGradientTorque} from './momentum-control.js';
import {attitudeGuidance,attitudeLimits} from './attitude-guidance.js';
import {transformBodyToEci} from './attitude-dynamics.js';
import {drag,burnMass,fraction,packStep,atmosphere,surfaces,linkBudget,selectedTerminal} from './physics.js';
export const modelNotes=[
 'Two-body Kepler propagation with secular J₂ node and apsis rates, rotating spherical Earth, seasonal Sun and cylindrical umbra. Insertion and maintenance use first-order change in semimajor axis. Ascent is a kinematic Hermite loft from an inferred rotating pad to the achieved insertion state. Launch stages, ascent mass flow and ascent guidance are outside the model. Mean phase uses nominal mean motion.',
 'Density uses log interpolation of the low, moderate and high activity profiles in ECSS-E-ST-10-04C Rev.1 Table G-4 (JB-2006; 100–900 km). Beyond 900 km the last scale height is extrapolated. Activity uses an assumed 11-year F10.7 cycle, 27-day variability and adjustable Ap. Local illumination is an engineering modulation.',
 'Commissioning begins at MET 900 s with a family-specific sequence and duration, both explicit preliminary allocations. The retained protected-core comparison keeps its 20-minute clock. Installed solar blankets expose cells through their selected deployment path. Power credit uses exposed flat area, projected incidence, the array packing/mismatch factor, bounded MPPT channels and routed source losses. Detailed cell IV curves, switching transients and local shadowing remain unresolved. Installed radiator platforms or banks follow their family-specific roots, folds and latches. Pumped circuits admit flow after their latch intervals; local passive payload transport remains attached to its radiator platform. Fluid admission controls hydraulic thermal coupling. Physical exposed panel area separately controls absorption and emission. Folded exposure is a bounded geometric approximation; the common panel temperature does not resolve inter-panel radiation or isolated-bank temperature differences.',
 'Ram area unions the projected bus hull and the actual installed solar and radiator surfaces with overlap removal. The operational table samples 5° ram-direction and hinge-angle bins; partial deployment evaluates the projected union at the current mechanism pose. Small fittings are excluded and the pressure-center lever is adjustable. Solar irradiance is 1,361 W/m². Environmental heat integrates the projected finite Earth disk for both faces, using 237 W/m² diffuse infrared and a uniform day-side albedo approximation. Direct sunlight is zero in umbra. Solar wings reject their own thermal load.',
 'Electrical power flows through the installed number of protected MPPT wing groups, a regulated selected main bus, 48 V payload and 28 V service conversion, and a bounded bidirectional battery interface. Heat-lift studies add a separately limited primary-voltage motor drive. Cell string voltages and temperature screening follow the selected semiconductor technology as project allocations. Copper I²R and converter losses consume power once. Flight service has priority over payload; rail and available-energy limits clip delivered load. Subnormal service power cannot maintain terminal lock or a held hydraulic operating point. Only harvested MPPT power dissipates inside the loop; external array harness loss and unharvested PV power do not.',
 'The six-sided enclosure has a quasi-steady exterior blanket temperature. Directional box area and area-weighted finite Earth views supply absorbed irradiance. Effective blanket radiation and penetration conduction exchange heat with the shared inner thermal node. The participating skin and frame contribute heat capacity.',
 'Body attitude follows the vector angular-momentum balance H_ECI = R(Iω + h_CMG + h_mechanism). The inertia tensor is assembled from MEL masses, installation stations, geometric intrinsic-inertia proxies and parallel-axis terms about the instantaneous center of mass. Radiator and solar poses, terminal steering, propellant depletion and adapter release change the tensor. Four single-gimbal gyros use a fixed pyramid geometry with rate-limited damped least-squares steering. A quaternion feedback controller commands torque within the selected operational envelope and reports achieved torque, residual and steering condition. Gravity-gradient torque uses 3μ/r³ times r̂ × I r̂. Aerodynamic and solar torques use the configured pressure-center offsets. Magnetic unloading applies m × B against a centered dipole field. The 65% start, 25% stop and 120-second unloading time constant are study assumptions. Ideal attitude and rate feedback are assumed. Body and prescribed joint motion use a predictor-corrector step. A local geometry derivative supplies relative mechanism momentum. Ideal mechanism servos and uniform moving-mass distributions are study approximations. Structural flexibility, rotor imbalance, sensor noise, fluid flow, liquid slosh and exhaust angular-momentum transport require dedicated models.',
 'An explicit memory- and compute-bounded workload estimator schedules a burst each orbit. Lost bus power throttles compute; a full recorder flags dropped bytes. Initial recorder backlog is bulk. New output text receives first priority for recorder writes and downlink; bulk uses the remaining capacity. Text-byte delivery tracks actual delivered output tokens. The ground command buffer generates the configured kbit/s and transmits available bytes through a separately acquired S-band uplink. Buffer overflow is recorded.',
 'Thermal qualification uses six independent illustrative operating and survival bands. Accelerator and pump activity use served power above 1 W. Battery charge or discharge above 1 W selects operating. Exposed radiator banks and the post-separation blanket remain in passive service during eclipse. The battery has a finite heat capacity and conductive coupling to the main loop. Its electrical conversion losses and finite battery heaters heat the pack. The bus/equipment and radiator have separate heat capacities. A radiator-mounted payload has its own finite thermal store and capacity-limited local spreader/heat-pipe path; its compute heat and capacity are not duplicated in the bus. An active heat pump removes cold-side heat and adds compressor work at the hot side. Implicit nonlinear radiation and exchange conserve total stored energy. Pumped-loop mixing changes conductance without hiding exposed emitting area. Coolant rise follows the selected flow and heat capacity; cold-plate contact and local junction resistance add separate drops. The initial internal and pack temperatures and pre-separation outer blanket boundary are prescribed inputs. Extremes and crossing times use the integration intervals with linear interpolation, up to 60 s. The model ends at termination.',
 'Earth AI service uses separate Earth input, onboard input, customer output and unrelated bulk ledgers. Physical work requires resident state, powered duty and staged inputs. Preloaded work is distinguished from newly offered Earth requests. A corpus can be reread over epochs. Full training uses ideal sharded state, bounded fabric/collective throughput and 6 FLOPs per active parameter per token. Two local checkpoint slots retain the last complete state while the replacement drains through the installed write interface; commitment follows the final byte. A new save is deferred while that slot is occupied. Input, checkpoint and output writes share one write ledger; corpus/input reads and downlink share one read ledger. The throughput estimate still uses an averaged checkpoint-stall factor, not a cycle-accurate training scheduler. The selected final artifact enters the downlink only after training completes. Its receipt does not certify validation quality.',
 'Each powered housekeeping sample is archived locally first. While the S-band transceiver has a powered five-second lock, complete live copies have first claim on its independent downlink capacity. The archive remains a circular local history. Fresh commands and customer uplink share the receive channel. The selected outward patch uses the nearer of the opposing ±X normals, 5 dBi assumed boresight gain and a smooth broad-pattern loss of 12 (angle / 80°)² dB. Direct payload hardware uses its own acquired downlink. An optical relay peer has no modeled position. Transfer pulses and rates describe accepted data over integration intervals.',
 'Direct customer inputs share residual S-band capacity after spacecraft commands. An allocated relay interface uses its scheduled duty, a minimum 35-second acquisition and installed 1.6 Gbit/s customer caps in each direction. The selected family determines physical optical terminal count and stations. The service model retains its allocated route and acquisition schedule; two installed heads do not establish simultaneous links, make-before-break handover or guaranteed coverage. Provider compatibility, coverage and gateway service remain external evidence. Hybrid uses the relay when scheduled and a separately acquired direct transfer during relay gaps. No commercial coverage map or relay ephemeris is assumed. Earth-service capacity screening limits compute heat against the simultaneous junction, cold-plate and transport-interface study ranges, finite transport capacity and the carried sink temperature. A non-fluid path does not inherit an ammonia phase check; heat-pump material and machinery evidence remains open. It assumes linear throughput throttling within the solver interval and preserves raw out-of-range observations.',
 'An optional chronological mission audit runs each day in a local Web Worker, records actual integrated events and extrema, and seeds detailed views from these daily checkpoints. Detailed operations integrate on a 60 s maximum step with exact scheduled finite-burn boundaries and refined contact/eclipse boundaries. The view replays from a cached inventory checkpoint. The first sixty mission days are continuous detailed integrations. Later seasonal projections use a representative day per 90-day block; cumulative quantities and propagated stores are estimates. Projected attitude seeds retain a representative quaternion and physical gyro state, reconcile current inertia, and reset the guidance reference at the new epoch. External torque history between sampled days is unresolved. Detailed windows propagate forward from that representative state. Long-mission extrema are representative-day extrema and can miss events between modeled days.',
 'RF rates use aperture gain, free-space path loss, elevation-dependent atmospheric loss, receiver G/T and Eb/N₀. Optical goodput assumes clear sky, Gaussian geometric capture and 100 received photons/bit. Application goodput uses the editable coding/overhead efficiency. The 2.05 GHz command uplink has an independent ground EIRP budget. GB and TB are decimal.',
 'Hardware remains fixed throughout playback. Two regulated engines share separate internal liquid circuits. Post-separation trim waits until the selected family confirms all of its installed appendage latches. The vehicle aims its +Z thrust axis along the required velocity direction during burns. Ignition screens achieved thrust-axis alignment and body-rate authority. The finite-thrust trajectory prescribes the velocity direction once ignition is authorized. Mass stations omit liquid slosh and elastic motion. Appendages remain deployed for disposal. A 30° plume envelope plus 1° installation allowance screens rigid leaves. Burn initiation checks nozzle support, liquid keep-in, attitude torque, angular alignment and bounded burn momentum. Vessel capacities include ullage. An isothermal 293.15 K ideal-gas budget holds 1.65 MPa delivery from 30 MPa storage to a 2 MPa usable floor. Available propellant excludes reserves and residuals. Daily maintenance restores accumulated drag impulse where propellant permits. CMGs and magnetic unloading consume no chemical propellant. Finite-thrust disposal uses either a two-burn raised circular orbit with a ±5 km radial tolerance or retrograde lowering to the target perigee. The targeted route searches the final mission opportunities to minimize nominal miss; its search is limited to the last 18% of the mission and the selected search hours. After the 120 km interface a constant-ballistic-coefficient, nonlifting surviving reference body follows central gravity and drag in a co-rotating USSA76 atmosphere. The 95% impact ellipse propagates independent uncertainties in velocity, heading, density and ballistic coefficient. The atmospheric segment does not simulate spacecraft breakup or avionics. Raised LEO disposal has no implied regulatory compliance.'
];
const SEC=60,G0=9.80665;
const cache=new WeakMap();
const cachedTakeoffs=new WeakMap();
const scalar=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
function inventory(h){const d=h.input;const a=h.ai;return {aiBuilt:false,aiCompletionS:null,aiDeliveryS:null,aiBuffer:a.preloadedGB,aiEarth:a.training?Math.max(0,a.corpusGB-a.preloadedGB):0,aiOffered:0,aiUploaded:0,aiConsumed:0,aiUnits:0,aiPGenerated:0,aiPDelivered:0,aiPQueue:0,aiPDropped:0,aiPending:0,aiCheckpointGB:0,aiCheckpointPendingGB:0,aiCheckpointTargetUnits:0,aiCheckpointCommits:0,aiCheckpointCompleteUnits:0,aiCheckpointDeferred:0,aiCheckpointCommitS:null,aiActiveS:0,t:0,energy:h.batteryKWh*d.socInitial,heat:d.initialCoreK,loopK:d.initialCoreK,payloadColdK:d.initialCoreK,packK:d.initialBatteryK,queue:h.initialQueueGB,textQueue:0,textDelivered:0,textGenerated:0,textDropped:0,uplinkQueue:0,uplinkDropped:0,uplinkGenerated:0,hkPoweredS:0,hkDeliveredGB:0,delivered:0,generated:0,dropped:0,uploaded:0,tokens:0,prop:h.propellantKg,dragImpulse:0,pendingImpulse:0,usedImpulse:0,trimPaid:0,burnEnd:0,burnKind:'',contactSince:0,station:null,lastUnpoweredAt:0,momentum:0,momentumECI:[0,0,0],controlLoadNm:0,controlTorqueEciNm:[0,0,0],magneticTorqueEciNm:[0,0,0],controlPowerFraction:1,unloading:false,unmetEnergy:0,throughputKWh:0,writeGB:0,chargeBusKWh:0,dischargeBusKWh:0};}
export function createSimulation(design){
 const previous=cache.get(design);
 if(previous&&(design.input?previous.electricalMassRevision===(design.electricalMassRevision||0):cachedTakeoffs.get(design)===design.installedHarnessTakeoff))return previous;
 const h=design.input?design:sizeDesign(design),d=h.input,epoch=Date.parse(d.epoch),duration=Math.max(1,d.missionYears*YEAR),reserve=h.propellantKg*(d.reserveFraction+d.residualFraction),exhaust=G0*d.isp;
 const architecture=architectureFamily(h),communications=installedCommunications(h),clock=commissioningClock(h),DEPLOY_START_S=clock.startS,DEPLOY_END_S=clock.endS,transport=h.energySystem.thermal,passiveTransport=transport.kind==='passive-local',heatliftTransport=transport.kind==='heat-lift';
 const terminalInstalled=terminal=>terminal==='Ka'||terminal==='Ka-band'?communications.kaInstalled:terminal==='S-band'?communications.sBandInstalled:terminal==='Optical';
 const ai=h.ai,relaySchedule=relayTiming(d),relay=d.serviceRoute!=='direct',hybrid=d.serviceRoute==='hybrid',trainEnd=DEPLOY_END_S+d.trainingBudgetDays*DAY,outputCapacityGB=Math.max(0,(h.usableTB-h.weightsTB)*1000-d.retainedGB-ai.reservedStorageGB);
 const commandKbps=d.commandKbps??16,uplinkBufferGB=(d.uplinkBufferMB??128)/1000;
 const carrierClock=launchClockFor(d.launcher),launchReadiness=launchCompatibility(h),cargoAccessHeld=d.launcher==='starship'&&!launchReadiness.ok;
 // A held Phase D mechanism cannot release an article. The independently selectable
 // operating-orbit study begins at commissioning and remains explicitly conditional.
 const carrier={...carrierClock,release:!launchReadiness.ok?DEPLOY_START_S:(carrierClock.eject??carrierClock.release)};
 const period=TAU*Math.sqrt((R+d.altitudeKm)**3/MU),burnTime=43200,mainDays=new Map(),blockSeeds=new Map(),eventCache=new Map();
 const ignition=disposalIgnition(d,duration,h.wetKg-.35*h.propellantKg),terminalDay=Math.floor(ignition/DAY),targetPerigee=d.disposalTargetPerigeeKm??80,trapped=h.propellantKg*d.residualFraction;
 const nominalDisposalDv=disposalRequirement(d),protectedKg=burnMass(h.wetKg,d.isp,Math.max(nominalDisposalDv,d.disposalDv)),maintenanceFloor=reserve+protectedKg+burnMass(h.wetKg,d.isp,d.maneuverDv);
 const phase=(t,s)=>t<-600?'integration':t<0?'pad':t<INSERTION_MET?'ascent':t<DEPLOY_START_S?'insertion':t<DEPLOY_END_S?'commissioning':!s.plan?'operations':!s.plan.feasible?'infeasible':s.plan.entry!=null&&t>=s.plan.entry?'entry':'deorbit';
 const finished=(t,s)=>s.plan&&t>=s.plan.end-1e-7;
 const hardwareEnd=plan=>plan?.entry??plan?.end??Infinity;
 const hardwareStopped=(t,s)=>!!s.plan&&t>=hardwareEnd(s.plan)-1e-7;
 const activeBurn=(plan,t)=>plan?.burns?.find(b=>t>=b.start-1e-7&&t<b.end-1e-7);
 const status=(p,t)=>!p?'scheduled':!p.feasible?'infeasible':t>=p.end-1e-7?p.method==='graveyard'?'graveyard':'impact':p.entry!=null&&t>=p.entry?'descent':activeBurn(p,t)?'burn':'coast';

 let insertionState=null;
 const geo=(t,s)=>{
  const wet=h.dryKg+h.pressurantKg+s.prop,circular=Math.sqrt(MU/(R+d.altitudeKm))*1000,
   deficit=(t>=carrier.release?Math.max(0,d.trimDv-s.trimPaid):d.trimDv)+s.pendingImpulse/Math.max(1,wet);
  const delta=-2*(R+d.altitudeKm)*deficit/circular,minA=(R+120)/(1-d.ecc),low=R+d.altitudeKm+delta<minA;
  const offset=Math.max(delta,minA-R-d.altitudeKm),launchState=launchProgressState(launchReadiness,t,phase(t,s),DEPLOY_START_S);let track=null;
  if(t<INSERTION_MET||launchState.held){insertionState??=launchPath(d,offset);track=ascentTrack(insertionState,launchState.geometryTime);}
  else if(s.plan?.samples?.length)track=trajectoryAt(s.plan,t);
  const atTime=finished(t,s)?s.plan.end:t,g=geometry(d,launchState.held?launchState.geometryTime:atTime,offset,track);g.t=t;g.windowAgeYears=Math.max(0,atTime/YEAR);g.flightPhase=launchState.geometryPhase;g.launchHeld=launchState.held;g.launchHoldReason=launchState.reason;g.launchHoldIssues=launchState.issues;g.launchGeometryTime=launchState.geometryTime;g.assumedOrbit=launchState.assumedOrbit;g.cargoAccessHeld=cargoAccessHeld&&t<DEPLOY_START_S;g.carrierAttached=t<carrier.release;g.orbitLost=!launchState.held&&t>=INSERTION_MET&&low&&!s.plan?.feasible;if(g.orbitLost||s.plan||g.carrierAttached){g.station=null;g.stationECI=null;}return g;
 };
 const first=inventory(h),limits=attitudeLimits(h);
 // Budget the retrograde flip at the 65% unloading threshold. Use an
 // inertial direction tagged at ignition so the bus need not chase a
 // rotating velocity vector while turning through half a revolution.
 const retroLeadS=Math.max(limits.prepointS,Math.ceil(180*DEG*Math.max(...limits.inertiaKgM2)/(.35*d.cmgMomentumNms)+90));
 const disposalLeadS=d.disposalMethod==='reentry'?retroLeadS:limits.prepointS;
 function flightGuidance(s,t,g){
  const deployment=g.orbitLost?0:deploymentProgress(t,h),operating=t>=DEPLOY_END_S&&t<ignition-180&&!s.plan&&!g.orbitLost;
  const floor=s.burnKind==='disposal'?trapped:s.burnKind==='reboost'?maintenanceFloor:reserve;
  const burn=deployment===1&&t<s.burnEnd&&s.prop>floor;
  const disposalDir=d.disposalMethod==='reentry'?-1:1;
  const burnDirection=burn?(s.burnKind==='disposal'?disposalDir:1):0;
  const upcoming=s.plan?.burns?.find(b=>b.start>=t-1e-8);
  // Select the nearest real planned burn, including the intake hold before
  // the first trim and the second burn of a raised-orbit disposal.
  let burnAt=Infinity,direction=0,kind=null;
  if(upcoming){burnAt=upcoming.start;direction=disposalDir;kind='disposal';}
  else if(!s.plan){
   const today=Math.floor(t/DAY)*DAY+burnTime,maintenance=today>=t-1e-8?today:today+DAY;
   if(maintenance<ignition&&s.prop>maintenanceFloor){burnAt=maintenance;direction=1;kind='reboost';}
   if(ignition<burnAt){burnAt=ignition;direction=disposalDir;kind='disposal';}
   if(t<=DEPLOY_END_S&&d.trimDv>0){burnAt=DEPLOY_END_S;direction=1;kind='trim';}
  }
  const lead=burnAt-t,plannedBurnWindowS=direction<0?retroLeadS:limits.prepointS;
  const prepointGeometry=direction<0&&lead>=0&&lead<=plannedBurnWindowS?geo(burnAt,s):null;
  const contactAge=g.station?Math.max(0,t-Math.max(s.lastUnpoweredAt,s.station===g.station?s.contactSince:s.t)):0;
  const unloading=operating&&(s.unloading?s.momentum>.25*d.cmgMomentumNms:s.momentum>=.65*d.cmgMomentumNms);
  const relayActive=relay&&operating&&relayGate(t,d);
  // Relay coverage is a service assumption with no receiver ephemeris.
  // Its independent optical steering is unassessed; never aim it at Earth.
  const requestedTerminal=operating&&g.station?(!relay||hybrid&&!relayActive?selectedTerminal(d,s.queue):'S-band'):null;
  const terminal=terminalInstalled(requestedTerminal)?requestedTerminal:null;
  const controlLimits=availableControl(limits,d,s.momentum,s.controlLoadNm);
  const power=s.controlPowerFraction??1;
  const opts={deployment,remainingKg:s.prop,externalTorqueEciNm:s.controlTorqueEciNm,magneticTorqueEciNm:s.magneticTorqueEciNm,controlPowered:power>0,
   controlLimits:{maneuverTorqueNm:d.cmgTorqueNm*power,maneuverMomentumNms:d.cmgMomentumNms},loopTemperatureK:s.heat,plannedBurnWindowS,prepointGeometry,burnDirection,burnKind:burn?s.burnKind:kind,plannedBurnDirection:lead<=plannedBurnWindowS?direction:0,plannedBurnLeadS:lead,unloading,contactAge,terminal,terminalPrevious:s.attitudeAnchor,terminalElapsedS:s.attitudeAnchor?Math.max(0,t-s.attitudeAnchor.t):undefined,previous:s.attitudeState,elapsedS:Math.max(0,t-s.t),passivated:hardwareStopped(t,s)};
  const att=attitudeGuidance(h,g,opts);
  const axisDirection=burnDirection||(att.attitudeMode==='prepoint'?direction:0);
  const aimGeometry=att.attitudeMode==='prepoint'&&prepointGeometry?prepointGeometry:g;
  att.burnAxisErrorDeg=axisDirection?Math.acos(clip(axisDirection*dot(att.bodyZECI,unit(aimGeometry.velocityECI)),-1,1))/DEG:null;
  att.availableSlewMomentumNms=controlLimits.maneuverMomentumNms;
  att.availableSlewTorqueNm=controlLimits.maneuverTorqueNm;
  return att;
 }
 first.attitudeState=flightGuidance(first,0,geo(0,first)).attitudeState;

 const packMassKg=h.batteryKWh*1000/d.packWhKg,packThermalCapacity=packMassKg*d.packHeatKJkgK,packConductance=packMassKg*d.packCouplingWKkg/1000;
 function outerBoundary(t,temp,f){if(t<carrier.release)return {outerK:d.launchBoundaryK,...enclosureHeat(h.enclosure,temp,d.launchBoundaryK)};return solveOuter(h.enclosure,temp,f.enclosureSolarWm2,f.enclosureIRWm2);}
 function mask(t,b){const thermalActivity=passiveTransport?b.itKW:heatliftTransport?b.energy.heatPumpInputKW:b.energy.coolantFlowKgS>0?b.pumpKW:0;return thermalActivityMask(t,b.itKW,thermalActivity,b.f.radiatorDeployment,b.p.charge,b.p.discharge,t>=carrier.release);}

 // Screen both ends of the depletion interval. At fixed mixture ratio each
 // centroid component is fractional-linear in remaining mass, so the largest
 // thrust-line miss on a single burn occurs at an endpoint.
 function burnHold(s,kg,durationS,direction=1){
  const g=geo(s.t,s),att=flightGuidance(s,s.t,g);
  const misalignment=Math.acos(clip(direction*dot(att.bodyZECI,unit(g.velocityECI)),-1,1))/DEG;
  if(misalignment>limits.pointingToleranceDeg)return 'CMG prepoint incomplete: ignition held. Thrust axis misses the velocity target by '+misalignment.toFixed(2)+'°.';
  const orbitalRate=MU/(R+g.altitudeKm)**2/Math.max(.001,Math.hypot(...g.velocityECI))*Math.sqrt(Math.max(0,1-dot(unit(g.velocityECI),g.radial)**2))/DEG;
  const spinAxisBody=[att.bodyXECI,att.bodyUpECI,att.bodyZECI].map(v=>dot(g.normal,v));
  const tensor=att.attitudeDynamics.inertiaKgM2;
  const requiredRate=spinAxisBody.map(v=>v*orbitalRate*DEG);
  const change=att.attitudeDynamics.bodyRateRadS.map((v,i)=>v-requiredRate[i]);
  const requiredMomentum=att.attitudeDynamics.cmgMomentumBodyNms.map((v,i)=>v+tensor[3*i]*change[0]+tensor[3*i+1]*change[1]+tensor[3*i+2]*change[2]);
  if(orbitalRate>.8||Math.hypot(...requiredMomentum)>d.cmgMomentumNms)return 'Ignition held: the CMGs cannot follow the rotating burn direction.';

  if(!deploymentSchedule(deploymentProgress(s.t,h),h).allLocked)return 'Deployment has not confirmed all wing and radiator latches.';
  const a=propulsionReview(h,s.prop,att),b=propulsionReview(h,s.prop-kg,att);
  if(a.plumeMarginM<=0)return 'An appendage enters the chemical exhaust keep-out.';
  if(a.tankMarginM<0||a.engineMountMarginM<0)return 'Pressure vessel or engine exceeds its allocated envelope.';
  if(!a.clear||!b.clear)return 'Thrust alignment or CMG torque exceeds the modeled limit.';
  if(s.momentum+Math.max(a.torqueNm,b.torqueNm)*durationS>d.cmgMomentumNms)return 'Predicted chemical burn exceeds available CMG momentum storage.';
  return '';
 }
 function startBurn(s,dv,kind){const avail=Math.max(0,s.prop-(kind==='reboost'?maintenanceFloor:reserve)),mass=Math.min(avail,burnMass(h.dryKg+h.pressurantKg+s.prop,d.isp,Math.max(0,dv))),seconds=mass*exhaust/d.thrustN;
  s.burnHold=mass>0?burnHold(s,mass,seconds):'';s.burnKind=kind;s.burnEnd=s.t+(s.burnHold?0:seconds);
 }
 function boundary(s){
  if(s.plan){
   const p=s.plan,b=activeBurn(p,s.t);
   // The raised-orbit transfer has a second independent ignition at apogee.
   if(b&&b!==p.burns[0]&&Math.abs(b.start-s.t)<1e-6){
    s.burnHold=burnHold(s,b.usedKg,b.end-b.start,1);
    if(s.burnHold){
     const actual=trajectoryAt(p,s.t),flown=p.burns.filter(x=>x.end<=s.t),wet=h.dryKg+h.pressurantKg+s.prop;
     s.plan={...p,feasible:false,targetMet:false,outcome:'infeasible',reason:s.burnHold,end:s.t,cutoff:flown.at(-1)?.end??null,burns:flown,
      usedKg:p.initialWet-wet,paidDv:exhaust*Math.log(p.initialWet/wet),finalPerigeeKm:actual.perigeeKm,finalApogeeKm:actual.apogeeKm,
      groundTrack:p.groundTrack.filter(q=>q.t<=s.t),samples:p.samples.filter(q=>q.t<=s.t)};
     s.burnEnd=s.t;return;
    }
   }
   s.burnEnd=b?.end??s.t;return;
  }
  if(Math.abs(s.t-ignition)<1e-6){
   const wet=h.dryKg+h.pressurantKg+s.prop,initial=geo(s.t,s);
   let plan=planDisposal(initial,d,wet,s.prop-trapped,duration);
   if(plan.feasible){
    const firstBurn=plan.burns[0];s.burnHold=burnHold(s,firstBurn.usedKg,firstBurn.end-firstBurn.start,plan.method==='reentry'?-1:1);
    if(s.burnHold)plan={method:plan.method,target:plan.target,goal:plan.goal,start:s.t,end:s.t,initialWet:wet,outcome:'infeasible',feasible:false,targetMet:false,reason:s.burnHold,cutoff:null,entry:null,usedKg:0,paidDv:0,requiredDv:nominalDisposalDv,burns:[],samples:[],groundTrack:[],finalApogeeKm:initial.apogeeKm,finalPerigeeKm:initial.perigeeKm};
   }
   s.plan=plan;s.burnKind='disposal';s.burnEnd=plan.burns[0]?.end??s.t;return;
  }
  if(Math.abs(s.t-DEPLOY_END_S)<1e-6)startBurn(s,d.trimDv,'trim');
  if(Math.abs((s.t%DAY)-burnTime)<1e-6){const wet=h.dryKg+h.pressurantKg+s.prop;startBurn(s,s.pendingImpulse/Math.max(1,wet),'reboost');}
 }
 const deploymentEdges=deploymentStages(h).map(stage=>deploymentMET(stage.at,h));
 function nextPolicyEdge(t){let next=ai.training&&trainEnd>t+1e-7?trainEnd:Infinity;
  if(relay&&relaySchedule.usableS>0){const base=Math.floor(t/d.relayCycleS)*d.relayCycleS;for(const off of [relaySchedule.onS,relaySchedule.offS,...(hybrid?[5,20,35].map(s=>(relaySchedule.offS+s)%d.relayCycleS):[])]){const edge=base+off;next=Math.min(next,edge>t+1e-7?edge:edge+d.relayCycleS);}}
  if(t<DEPLOY_END_S)for(const x of deploymentEdges)if(x>t+1e-7){next=Math.min(next,x);break;}
  for(const x of [INSERTION_MET,carrier.release,carrier.releaseClear,ignition-disposalLeadS,ignition-180,ignition])if(x>t+1e-7)next=Math.min(next,x);
  const day=Math.floor(t/DAY),b=day*DAY+burnTime;next=Math.min(next,b>t+1e-7?b:b+DAY);const prepare=b-limits.prepointS;next=Math.min(next,prepare>t+1e-7?prepare:prepare+DAY>t+1e-7?prepare+DAY:Infinity);
  if(d.duty<=0||d.duty>=1)return next;
  const elapsed=Math.max(0,t-DEPLOY_END_S),orbit=Math.floor(elapsed/period),start=DEPLOY_END_S+orbit*period,finish=start+period*d.duty;
  if(t>=DEPLOY_END_S)next=Math.min(next,finish>t+1e-7?finish:start+period>t+1e-7?start+period:start+period+period*d.duty);
  return next;
 }
 function channels(s,t,g,dt){
  const y=Math.max(0,g.windowAgeYears),deploy=g.orbitLost?0:deploymentProgress(t,h),commission=t>=DEPLOY_END_S&&t<ignition-180&&!g.orbitLost,phase=((t-DEPLOY_END_S)%period+period)%period/period,burst=commission&&phase<d.duty;
  const floor=s.burnKind==='disposal'?trapped:s.burnKind==='reboost'?maintenanceFloor:reserve,burn=deploy>=1&&t<s.burnEnd&&s.prop>floor;
  const burnDirection=burn?(s.burnKind==='disposal'&&d.disposalMethod==='reentry'?-1:1):0;
  const att=flightGuidance(s,t,g),thrustCheck=burn?propulsionReview(h,s.prop,att):null;
  const f=surfaces(h,g,deploy,false,burnDirection,att),atm=atmosphere(d,g),dragN=t>=carrier.release&&!g.orbitLost&&!s.plan?drag(atm.densityKgM3,g.relativeSpeedMs,d.cd,f.ramAreaM2):0;
  // r_CP = +Y times the configured offset; drag and photon force point away
  // from the incident ram and Sun. Resolve r × F in the achieved body frame.
  const dragArm=dragN*d.cpOffsetM,lightArm=t<carrier.release||g.eclipse?0:4.56e-6*f.solarIncidenceCos*h.solarM2*f.pvDeployment*d.cpOffsetM*.25;
  const dragX=-dragArm*f.ramBody[2],dragZ=dragArm*f.ramBody[0];
  const lightX=-lightArm*dot(g.sunECI,f.bodyZECI),lightZ=lightArm*dot(g.sunECI,f.bodyXECI);
  const dragTorque=Math.hypot(dragX,dragZ),lightTorque=Math.hypot(lightX,lightZ);
  const radialBody=[dot(g.radial,f.bodyXECI),dot(g.radial,f.bodyUpECI),dot(g.radial,f.bodyZECI)];
  const gravity=g.carrierAttached?[0,0,0]:gravityGradientTorque(att.attitudeDynamics.inertiaKgM2,radialBody,g.altitudeKm);
  const [gravX,gravY,gravZ]=gravity,gravityTorque=Math.hypot(...gravity);
  const armY=thrustCheck?h.propulsion.engines[0].y-thrustCheck.cm[1]:0,armX=thrustCheck?(h.propulsion.engines[0].x+h.propulsion.engines[1].x)/2-thrustCheck.cm[0]:0;
  const tx=dragX+lightX+armY*d.thrustN+gravX,ty=-armX*d.thrustN+gravY,tz=dragZ+lightZ+gravZ,disturbance=Math.hypot(tx,ty,tz);
  const disturbanceECI=f.bodyXECI.map((x,i)=>tx*x+ty*f.bodyUpECI[i]+tz*f.bodyZECI[i]);
  const fieldECI=localFieldUT(g.radial,g.altitudeKm),bf=Math.hypot(...fieldECI);
  const unloadRequested=commission&&(s.unloading?s.momentum>.25*d.cmgMomentumNms:s.momentum>=.65*d.cmgMomentumNms);
  const unloadInhibit=!commission?'Outside payload operations':burn||att.attitudeMode==='prepoint'?'Propulsive maneuver has priority':att.attitudeMode==='contact'?'Ground contact has priority':'';
  const unloading=unloadRequested&&!unloadInhibit;
  const rods=magneticControl(s.momentumECI,fieldECI,d.dipoleAm2,unloading,dt),authority=rods.authority,unload=rods.removalRate;
  const same=s.station===g.station,contactAge=g.station?Math.max(0,t-Math.max(s.lastUnpoweredAt,same?s.contactSince:s.t)):0;
  const residual=Number.isFinite(att.terminalErrorDeg)?att.terminalErrorDeg:0,terminal=commission?selectedTerminal(d,s.queue):'S-band',present=terminalInstalled(terminal),steerable=present&&terminal!=='S-band';
  const servoPointingDeg=.012+.01*disturbance/Math.max(.001,d.cmgTorqueNm)+Math.max(0,s.momentum/d.cmgMomentumNms-.7)*.1;
  const fineJitterDeg=(d.opticalJitterUrad??1.5)*1e-6/DEG;
  const pointingErrorDeg=Math.hypot(terminal==='Optical'?fineJitterDeg:servoPointingDeg,steerable?residual:0);
  const patchOffAxisDeg=att.stationDirectionBody?Math.acos(clip(Math.abs(att.stationDirectionBody[0]),0,1))/DEG:0;
  const link=linkBudget(d,g,servoPointingDeg,s.queue,steerable?residual:0,patchOffAxisDeg,terminal),geometryLocked=commission&&present&&link.contact&&contactAge>=link.acquisitionSec&&(!steerable||(att.terminalReachable&&pointingErrorDeg<=link.beamwidthDeg*.5)),netCapacityMbps=geometryLocked?Math.min(link.lineMbps*d.codingEff,d.linkCapMbps??Infinity):0;
  const antennaRate=present?Math.abs(att.terminalAngularRateDegS||0):0,driveRate=Math.abs(att.wingRateDegS||0)+Math.abs(att.upperRadiatorRateDegS||0)+Math.abs(att.lowerRadiatorRateDegS||0)+Math.abs(att.upperRadiatorRollRateDegS||0)+Math.abs(att.lowerRadiatorRollRateDegS||0);
  const slewAngle=g.station?Math.acos(clip(-dot(g.radial,g.stationECI.map((v,i)=>(v-g.positionECI[i])/g.rangeKm)),-1,1)):0,slewDuration=link.acquisitionSec;
  const slewFraction=steerable?1-clip(residual/(Math.max(1e-8,slewAngle/DEG)),0,1):0,slewMomentum=4*(d.kaDishM||.6)**2*antennaRate*DEG;
  const slewTorque=4*(d.kaDishM||.6)**2*(t>s.t+1e-6?(antennaRate-(s.antennaRateDegS||0))/(t-s.t):s.antennaAccelDegS2||0)*DEG;
  const cmgDuty=clip(Math.max(...att.attitudeDynamics.gimbalRatesRadS.map(Math.abs))/Math.max(.001,att.attitudeDynamics.gimbalRateLimitRadS),0,1);
  const cmgKW=t>=carrier.release?(h.cmg.idleW+cmgDuty*(h.cmg.maneuverW-h.cmg.idleW))/1000:.005;
  const trackingDriveCount=architecture.solarWingCount+(architecture.radiatorTracking==='fixed-after-deployment'?0:architecture.radiatorBankCount),coilKW=.12*rods.driveFraction**2,trackingDriveKW=deploy===1?(.012+.024*Math.min(2,driveRate))*trackingDriveCount/6:0,jointKW=deploy===1?trackingDriveKW:deploymentPowerKW(f.deploymentStep,h);
  const computePowered=commission&&(burst||d.idleComputePolicy!=='off'),pumpRequested=(deploy>0&&deploy<1&&f.radiatorDeployment>0)||commission&&(d.pumpStandbyPolicy!=='follow'||computePowered||d.thermalMode==='applied'&&d.appliedHeatKw>0);
  const relayOn=relay&&commission&&relayGate(t,d),directSelected=!relay||(hybrid&&!relayOn);
  const fallbackAge=!hybrid||relaySchedule.usableS<=0?Infinity:((t-relaySchedule.offS)%d.relayCycleS+d.relayCycleS)%d.relayCycleS;
  // The assumed optical relay and the ground payload terminal never transmit
  // concurrently. The independent command receiver can remain active.
  const patchKW=communications.sBandInstalled?(g.station?.035:.015):0,directTerminalKW=link.terminalKW;
  if(relayOn)link.terminalKW=.24+patchKW;
  else if(!directSelected)link.terminalKW=.015+patchKW;
  else if(g.station&&(steerable||!present))link.terminalKW+=patchKW;
  link.terminalKW+=.006*Math.min(4,antennaRate);
  const storageKW=commission?h.storageKw:0,cdhKW=h.cdh.operatingW/1000,auxKW=cdhKW+(commission?.375+h.switchKw:.045)+(burn?.15:0),endpointServiceKW=cmgKW+coilKW+jointKW+storageKW+auxKW+link.terminalKW;
  const dataReady=ai.training?s.aiBuffer+1e-8>=ai.corpusGB:s.aiBuffer>0;
  const limitUnits=ai.training?(t<trainEnd?Math.max(0,ai.trainingGoalTokens-s.aiUnits):0):s.aiBuffer*1e9/ai.inputBytesPerUnit;
  const diskWorkUnitsPerSec=h.diskReadGBs*1e9/Math.max(1,ai.training?d.corpusTokenBytes:ai.inputBytesPerUnit);
  const requested=burst&&dataReady&&ai.fit?Math.min(ai.activeUnitsPerSec,diskWorkUnitsPerSec,limitUnits/dt):0,util=ai.activeUnitsPerSec>0?requested/ai.activeUnitsPerSec:0;
  const wantedIT=computePowered?(burst?h.idleKw+(h.itKw-h.idleKw)*util:h.idleKw):0,availableKWh=h.batteryKWh*fraction(d.batteryRetention,y);
  const energyArgs={solarKW:f.solarKW,energyKWh:s.energy,availableKWh,endpointServiceKW,dtS:dt,batteryK:s.packK,loopK:s.loopK??s.heat,radiatorK:s.heat,payloadColdK:passiveTransport?s.payloadColdK:undefined,sourceHeatKW:f.solarConversionLossKW,appliedPayloadHeatKW:d.thermalMode==='applied'?d.appliedHeatKw:undefined,pumpEnabled:pumpRequested};
  const dispatch=dispatchEnergy(h,{...energyArgs,wantedITKW:wantedIT}),energy=dispatch.runtime,p=dispatch.p,loadKW=dispatch.loadKW,itKW=dispatch.itKW,poweredSupport=dispatch.serviceFraction,pumpKW=energy.pumpKW;
  const supportKW=dispatch.requested.busLoadKW-wantedIT,servedFraction=wantedIT>0?itKW/wantedIT:0,scale=util*servedFraction;
  const aiRate=requested*servedFraction,work=aiRate*dt,tokensPerSec=ai.training?0:aiRate*ai.tokensPerUnit;
  // The payload terminal needs its operating allocation to hold lock. Tiny
  // fractional support near an empty battery cannot sustain an optical or RF carrier.
  const terminalPowered=poweredSupport>=1-1e-6,acquired=geometryLocked&&terminalPowered;
  const patchLocked=communications.sBandInstalled&&terminalPowered&&g.station&&contactAge>=5;
  const packetGB=h.cdh.packetBytes/1e9;
  const newPackets=t>=carrier.release?Math.floor((s.hkPoweredS+poweredSupport*dt+1e-8)/d.hkPeriodS)-Math.floor((s.hkPoweredS+1e-8)/d.hkPeriodS):0;
  const patchLink=patchLocked?(present&&terminal==='S-band'?link:linkBudget(d,g,0,0,0,patchOffAxisDeg,'S-band')):null;
  const patchLineMbps=patchLink?.lineMbps||0;
  const patchDownMbps=Math.min(patchLineMbps*d.codingEff,d.linkCapMbps??Infinity);
  const telemetryGB=packetGB*Math.min(newPackets,Math.floor(patchDownMbps*dt/8000/packetGB));
  const directCapacity=acquired?Math.max(0,netCapacityMbps-(steerable?0:telemetryGB*8000/dt)):0,terminalRate=!terminalPowered?0:relayOn?h.serviceArchitecture.route.effectiveDownMbps*poweredSupport:directSelected&&fallbackAge>=link.acquisitionSec?directCapacity:0;
  const uplinkDemand=t>=carrier.release&&!s.plan?commandKbps*dt/8e6:0,uplinkCapacity=patchLocked?(patchLink?.uplinkMbps||0)*d.codingEff*poweredSupport*dt/8000:0,uploaded=Math.min(s.uplinkQueue+uplinkDemand,uplinkCapacity),uplinkQueue=clip(s.uplinkQueue+uplinkDemand-uploaded,0,uplinkBufferGB),uplinkDropped=Math.max(0,s.uplinkQueue+uplinkDemand-uploaded-uplinkQueue);
  const directUp=commission?Math.min(d.customerUplinkMbps,Math.max(0,uplinkCapacity-uploaded)*8000/dt):0;
  const routeUp=!terminalPowered?0:relayOn?h.serviceArchitecture.route.effectiveUpMbps*poweredSupport:directSelected?directUp:0;
  const earthOffer=commission&&!ai.training?d.serviceOffersPerHour/3600*ai.inputBytesPerUnit*dt/1e9:0,consumed=ai.training?0:work*ai.inputBytesPerUnit/1e9;
  const budgetEnd=ai.training&&t>=trainEnd,incoming=commission&&!budgetEnd?Math.min(s.aiEarth+earthOffer,routeUp*dt/8000,Math.max(0,ai.inputCapacityGB-s.aiBuffer+consumed),h.diskWriteGBs*dt):0;
  const aiBuffer=clip(s.aiBuffer+incoming-consumed,0,ai.inputCapacityGB),aiEarth=Math.max(0,s.aiEarth+earthOffer-incoming);
  const ranS=ai.activeUnitsPerSec>0?work/ai.activeUnitsPerSec:0;
  const saves=ai.training?Math.floor((s.aiActiveS+ranS)/ai.checkpointIntervalS)-Math.floor(s.aiActiveS/ai.checkpointIntervalS):0;
  const writeCapacityGB=Math.max(0,h.diskWriteGBs*dt-incoming),checkpoint=checkpointWriteStep({checkpointGB:ai.restartGB,pendingGB:s.aiCheckpointPendingGB,requests:saves,targetUnits:s.aiUnits+work,pendingTargetUnits:s.aiCheckpointTargetUnits,committedCount:s.aiCheckpointCommits,lastCompleteUnits:s.aiCheckpointCompleteUnits,capacityGB:commission&&poweredSupport>=1-1e-6?writeCapacityGB:0}),checkpointWritten=checkpoint.writtenGB;
  const finishes=ai.training&&!s.aiBuilt&&work>0&&s.aiUnits<ai.trainingGoalTokens&&s.aiUnits+work>=ai.trainingGoalTokens-1e-8;
  const pending=s.aiPending+(finishes&&ai.artifactValid?ai.artifactGB:0),diskWrite=commission&&poweredSupport>=1-1e-6?Math.max(0,writeCapacityGB-checkpointWritten):0;
  const discrete=ai.purposeId==='agents'||ai.purposeId==='batch',completedUnits=discrete?Math.max(0,Math.floor(s.aiUnits+work+1e-10)-Math.floor(s.aiUnits+1e-10)):work;
  const product=ai.training?Math.min(pending,diskWrite):completedUnits*ai.outputBytesPerUnit/1e9;
  const aiPending=ai.training?Math.max(0,pending-product):0,bulk=Math.max(0,d.bulkMbps)*scale*dt/8000;
  const payloadReadGB=work*(ai.training?d.corpusTokenBytes:ai.inputBytesPerUnit)/1e9,readAvailableGB=Math.max(0,h.diskReadGBs*dt-payloadReadGB);
  const generated=bulk+product,arrived=Math.min(diskWrite,generated),delivered=Math.max(0,Math.min(s.queue+arrived,terminalRate*dt/8000,readAvailableGB)),queue=clip(s.queue+arrived-delivered,0,outputCapacityGB),dropped=Math.max(0,s.queue+generated-delivered-queue);
  const pSent=Math.min(s.aiPQueue+Math.min(product,diskWrite),delivered),pQueue=clip(s.aiPQueue+Math.min(product,diskWrite)-pSent,0,queue),pDropped=Math.max(0,s.aiPQueue+product-pSent-pQueue);
  const textGenerated=ai.text?product:0,textDelivered=ai.text?pSent:0,textQueue=ai.text?pQueue:0,textDropped=ai.text?pDropped:0,productionMbps=generated*8000/dt;
  const batteryLoss=p.charge*(1-d.chargeEff)+p.discharge*(1/d.dischargeEff-1),signalExport=(relayOn||g.station&&(present||communications.sBandInstalled)) ? .016*poweredSupport : 0,applied=d.thermalMode==='applied';
  const solarConversionLossKW=Math.max(0,f.solarKW-p.curtailed)*(1/h.energySystem.electrical.mppt.efficiency-1);
  const electricalHeat=Math.max(0,loadKW-p.unmet-signalExport-energy.batteryHeaterKW-energy.radiatorHeaterKW);
  // The diagnostic applied-load case replaces equipment dissipation only.
  // Cold-control heaters, source conversion and battery losses remain physical.
  const equipmentHeat=(applied?d.appliedHeatKw+energy.loopHeaterKW+energy.controlKW+energy.heatPumpInputKW:electricalHeat)+solarConversionLossKW;
  const payloadHeatKW=passiveTransport?(applied?d.appliedHeatKw:itKW):0,payloadCapacityKJK=passiveTransport?Math.max(1,transport.payloadHardwareCapacityKJK+h.trays*15):0;
  const loopCapacityKJK=Math.max(1,transport.loopHardwareCapacityKJK+(passiveTransport?0:h.trays*15)+h.enclosure.coupledCapacityKJK),radiatorCapacityKJK=Math.max(1,transport.radiatorCapacityKJK),capKJK=loopCapacityKJK+radiatorCapacityKJK+payloadCapacityKJK,k=t<carrier.release?0:f.emissionCoeff;
  const shell=outerBoundary(t,s.loopK??s.heat,f),loopToRadiatorKWK=energy.loopToRadiatorConductanceKWK*(passiveTransport?1:f.radiatorCoupledM2/Math.max(1e-9,h.radiatorM2));
  const thermal=stepThermalNetwork({dtS:dt,loopK:s.loopK??s.heat,radiatorK:s.heat,batteryK:s.packK,loopCapacityKJK,radiatorCapacityKJK,batteryCapacityKJK:packThermalCapacity,loopToRadiatorKWK,batteryToLoopKWK:packConductance,loopHeatKW:equipmentHeat-payloadHeatKW-energy.heatPumpInputKW,radiatorHeatKW:(t<carrier.release?0:f.absorbedKW)+energy.radiatorHeaterKW,batteryHeatKW:batteryLoss+energy.batteryHeaterKW,enclosureLeakKW:shell.outwardKW,emissionCoeff:k,payloadK:passiveTransport?(s.payloadColdK??s.heat):undefined,payloadCapacityKJK,payloadHeatKW,payloadToRadiatorKWK:energy.payloadToRadiatorConductanceKWK,payloadTransportCapacityKW:energy.payloadTransportCapacityKW,heatPumpColdRemovalKW:energy.heatPumpColdRemovalKW,heatPumpInputKW:energy.heatPumpInputKW});
  const heat=thermal.radiatorK,loopK=thermal.loopK,payloadColdK=passiveTransport?thermal.payloadK:loopK,packK=thermal.batteryK,packToLoop=thermal.packToLoopKW,heatInput=equipmentHeat+packToLoop,gross=thermal.grossEmissionKW,net=gross-(t<carrier.release?0:f.absorbedKW);
  const transportEnabled=passiveTransport||heatliftTransport?passiveTransport||energy.heatPumpOperating:energy.coolantFlowKgS>0;
  const transportHeat=Math.max(0,heatInput),ladder=energyTemperatureLadder(h,{itKW:applied?d.appliedHeatKw:itKW,heatKW:transportHeat,loopK:s.loopK??s.heat,radiatorK:s.heat,payloadColdK:passiveTransport?s.payloadColdK:undefined,heatPumpInputKW:energy.heatPumpInputKW,pumpEnabled:transportEnabled,flowKgS:energy.coolantFlowKgS}),rRise=ladder.junctionK-s.heat,chipT=ladder.junctionK;
  const remaining=Math.max(0,s.prop-floor),burnKg=burn?Math.min(remaining,d.thrustN*dt/exhaust):0,appliedImpulse=burnKg*exhaust;
  const possible=dispatchEnergy(h,{...energyArgs,wantedITKW:h.itKw}),possibleIT=possible.itKW,sink=s.loopK??s.heat,flow=possible.runtime.coolantFlowKgS;
  const baseHeat=Math.max(0,transportHeat-(applied?d.appliedHeatKw:itKW));
  const possibleTransport=passiveTransport||heatliftTransport?passiveTransport||possible.runtime.heatPumpOperating:flow>0,temperatureArgs={loopK:sink,radiatorK:s.heat,payloadColdK:passiveTransport?s.payloadColdK:undefined,heatPumpInputKW:energy.heatPumpInputKW,pumpEnabled:possibleTransport,flowKgS:flow};
  const low=energyTemperatureLadder(h,{...temperatureArgs,itKW:0,heatKW:baseHeat}),one=energyTemperatureLadder(h,{...temperatureArgs,itKW:1,heatKW:baseHeat+1});
  const slope=key=>Math.max(1e-9,one[key]-low[key]);
  const fluidPath=!passiveTransport&&!heatliftTransport,propertyMin=fluidPath?transport.fluid.propertyMinK:-Infinity,propertyMax=fluidPath?transport.fluid.propertyMaxK:Infinity;
  const minHeat=Math.max(0,(d.junctionOpMinK-low.junctionK)/slope('junctionK'),(d.coldPlateOpMinK-low.coldPlateK)/slope('coldPlateK'),(Math.max(d.coolantOpMinK,propertyMin)-low.coolantK)/slope('coolantK'));
  const maxHeat=Math.min((d.junctionLimitK-low.junctionK)/slope('junctionK'),(d.coldPlateOpMaxK-low.coldPlateK)/slope('coldPlateK'),(Math.min(d.coolantOpMaxK,propertyMax)-low.coolantK)/slope('coolantK'),fluidPath?(low.coolantSupplyK-propertyMin)/Math.max(1e-9,low.coolantSupplyK-one.coolantSupplyK):passiveTransport?transport.passive.capacityKW:Math.max(0,transport.heatPump.coldCapacityKW-Math.max(0,baseHeat-energy.heatPumpInputKW)));
  const thermalIT=applied?(d.appliedHeatKw>=minHeat&&d.appliedHeatKw<=maxHeat?possibleIT:0):Math.min(possibleIT,maxHeat)>=minHeat?Math.min(possibleIT,maxHeat):0;
  const powerOnlyUnitsPerSec=burst?Math.min(diskWorkUnitsPerSec,ai.activeUnitsPerSec*possibleIT/Math.max(1e-9,h.itKw)):0;
  const transportApplicable=passiveTransport?ladder.transportValid:heatliftTransport?possible.runtime.heatPumpThermodynamicValid&&possibleTransport&&ladder.transportValid:flow>0&&low.freezeSeparationK>0&&ladder.liquidPressureMarginPa>0;
  const capacityUnitsPerSec=burst&&transportApplicable?Math.min(diskWorkUnitsPerSec,ai.activeUnitsPerSec*Math.max(0,thermalIT)/Math.max(1e-9,h.itKw)):0;
  return {selectedPayloadTerminal:terminal,payloadColdK,payloadCapacityKJK,payloadHeatKW,payloadReadGB,readAvailableGB,checkpoint,energy,dispatch,thermal,ladder,transportApplicable,solarConversionLossKW,loopK,loopCapacityKJK,radiatorCapacityKJK,loopToRadiatorKWK,terminalPowered,telemetryGB,patchLocked,directSelected,directPayloadLock:acquired&&directSelected&&fallbackAge>=link.acquisitionSec,disturbanceECI,fieldECI,rods,unloadRequested,unloadInhibit,antennaRate,trackingDriveKW,cdhKW,finishes,powerOnlyUnitsPerSec,serviceHeatLimitKW:Math.max(0,maxHeat),capacityUnitsPerSec,aiRate,ranS,work,incoming,consumed,earthOffer,aiEarth,aiBuffer,aiPending,checkpointWritten,product,pSent,pQueue,pDropped,directTerminalKW,directUp,directCapacity,routeUp,relayOn,servedFraction,g,f,atm,shell,deploy,commission,burst,dragN,dragTorque,lightTorque,gravityTorque,tx,ty,tz,disturbance,bf,authority,unloading,unload,cmgKW,pointingErrorDeg,link,contactAge,acquired,slewAngle,slewFraction,slewMomentum,slewTorque,burn,coilKW,jointKW,pumpKW,storageKW,auxKW,supportKW,wantedIT,loadKW,availableKWh,p,itKW,scale,poweredSupport,tokensPerSec,productionMbps,terminalRate,generated,delivered,queue,dropped,textGenerated,textDelivered,textQueue,textDropped,uplinkDemand,uploaded,uplinkQueue,uplinkDropped,batteryLoss,packK,packToLoop,equipmentHeat,heatInput,capKJK,gross,net,heat,rRise,chipT,burnKg,appliedImpulse};
 }
 function advance(s,to,knownGeometry,knownChannels){let dt=to-s.t;if(dt<=1e-8)return s;if(hardwareStopped(s.t,s))return {...s,t:to};const t=s.t+dt*.5,g=knownGeometry||geo(t,s),b=knownChannels||channels(s,t,g,dt),p=b.p,imp=b.dragN*dt;
  // The endpoint has the operating law of this integration interval. A station
  // newly visible at the right edge cannot have driven its antenna beforehand.
  const tg=to-1e-8,edge=geo(tg,s);edge.eclipse=g.eclipse;
  if(edge.station!==g.station){
   edge.station=g.station;
   if(g.stationECI){const a=(tg-t)*.00007292115,c=Math.cos(a),sn=Math.sin(a),[x,y,z]=g.stationECI;edge.stationECI=[c*x-sn*y,sn*x+c*y,z];}
   else edge.stationECI=null;
  }
  const controlTorqueEciNm=b.disturbanceECI,magneticTorqueEciNm=b.rods.torque.map(v=>v*b.poweredSupport),controlPowerFraction=b.poweredSupport;
  const endpoint=flightGuidance({...s,controlTorqueEciNm,magneticTorqueEciNm,controlPowerFraction},tg,edge);
  const hBody=endpoint.attitudeDynamics.cmgMomentumBodyNms;
  const momentumECI=endpoint.bodyXECI.map((x,i)=>x*hBody[0]+endpoint.bodyUpECI[i]*hBody[1]+endpoint.bodyZECI[i]*hBody[2]);
return {lastUnpoweredAt:b.terminalPowered?s.lastUnpoweredAt:to,antennaRateDegS:endpoint.terminalAngularRateDegS,antennaAccelDegS2:(endpoint.terminalAngularRateDegS-(s.antennaRateDegS||0))/dt,attitudeState:endpoint.attitudeState,hkDeliveredGB:s.hkDeliveredGB+b.telemetryGB,hkPoweredS:s.hkPoweredS+(t>=carrier.release?b.poweredSupport*dt:0),aiBuilt:s.aiBuilt||b.finishes,aiCompletionS:s.aiCompletionS??(b.finishes?to:null),aiDeliveryS:s.aiDeliveryS??(ai.training&&ai.artifactValid&&(s.aiBuilt||b.finishes)&&s.aiPDelivered+b.pSent>=ai.artifactGB-1e-10?to:null),aiBuffer:b.aiBuffer,aiEarth:b.aiEarth,aiOffered:s.aiOffered+b.earthOffer,aiUploaded:s.aiUploaded+b.incoming,aiConsumed:s.aiConsumed+b.consumed,aiUnits:b.finishes?ai.trainingGoalTokens:ai.training?Math.min(ai.trainingGoalTokens,s.aiUnits+b.work):s.aiUnits+b.work,aiActiveS:s.aiActiveS+b.ranS,aiPending:b.aiPending,aiPQueue:b.pQueue,aiPDelivered:s.aiPDelivered+b.pSent,aiPGenerated:s.aiPGenerated+b.product,aiPDropped:s.aiPDropped+b.pDropped,aiCheckpointGB:s.aiCheckpointGB+b.checkpointWritten,aiCheckpointPendingGB:b.checkpoint.pendingGB,aiCheckpointTargetUnits:b.checkpoint.pendingTargetUnits,aiCheckpointCommits:b.checkpoint.committedCount,aiCheckpointCompleteUnits:b.checkpoint.lastCompleteUnits,aiCheckpointDeferred:s.aiCheckpointDeferred+b.checkpoint.deferredSaves,aiCheckpointCommitS:b.checkpoint.committed?to:s.aiCheckpointCommitS,plan:s.plan,t:to,energy:p.energy,heat:b.heat,loopK:b.loopK,payloadColdK:b.payloadColdK,packK:b.packK,queue:b.queue,delivered:s.delivered+b.delivered,generated:s.generated+b.generated,dropped:s.dropped+b.dropped,uploaded:s.uploaded+b.uploaded,uplinkQueue:b.uplinkQueue,uplinkGenerated:s.uplinkGenerated+b.uplinkDemand,uplinkDropped:s.uplinkDropped+b.uplinkDropped,textQueue:b.textQueue,textGenerated:s.textGenerated+b.textGenerated,textDelivered:s.textDelivered+b.textDelivered,textDropped:s.textDropped+b.textDropped,tokens:s.tokens+b.tokensPerSec*dt,prop:s.prop-b.burnKg,dragImpulse:s.dragImpulse+imp,pendingImpulse:Math.max(0,s.pendingImpulse+imp-(s.burnKind==='reboost'?b.appliedImpulse:0)),usedImpulse:s.usedImpulse+b.appliedImpulse,trimPaid:s.trimPaid+(s.burnKind==='trim'?exhaust*Math.log((h.dryKg+h.pressurantKg+s.prop)/(h.dryKg+h.pressurantKg+s.prop-b.burnKg)):0),burnEnd:s.burnEnd,burnKind:s.burnKind,burnHold:s.burnHold||'',contactSince:g.station!==s.station?s.t:s.contactSince,station:g.station,momentum:Math.hypot(...momentumECI),momentumECI,controlLoadNm:b.disturbance+Math.abs(b.slewTorque),controlTorqueEciNm,magneticTorqueEciNm,controlPowerFraction,unloading:b.unloadRequested,unmetEnergy:s.unmetEnergy+p.unmet*dt/3600,throughputKWh:s.throughputKWh+(p.charge+p.discharge)*dt/3600,writeGB:s.writeGB+Math.max(0,b.generated-b.dropped)+b.incoming+b.checkpointWritten,chargeBusKWh:s.chargeBusKWh+p.charge*dt/3600,dischargeBusKWh:s.dischargeBusKWh+p.discharge*dt/3600};
 }
 function read(s){const g=geo(s.t,s),spacecraftTime=Math.min(s.t,hardwareEnd(s.plan)),hardwareGeometry=spacecraftTime===s.t?g:geo(spacecraftTime,s),b=channels(s,spacecraftTime,hardwareGeometry,.25),f=b.f,link=b.link;const socPct=100*s.energy/Math.max(.001,b.availableKWh),fuelKg=s.prop/(1+d.mixtureRatio),oxidizerKg=s.prop-fuelKg;
  const plan=s.plan,used=plan?.feasible||plan?.usedKg>0?Math.max(0,plan.initialWet-(h.dryKg+h.pressurantKg+s.prop)):0;
  const snapshot={aiQualifiedCapacityPerSec:b.capacityUnitsPerSec,aiPowerOnlyCapacityPerSec:b.powerOnlyUnitsPerSec,aiPurpose:d.aiPurpose,aiUnitRate:b.aiRate,aiCompletedAt:s.aiCompletionS,aiReturnedAt:s.aiDeliveryS,aiUsefulTflops:b.aiRate*ai.flopsPerUnit/1e12,aiPeerMbps:b.aiRate*ai.internalBytesPerTask*8/1e6,aiPeerTrafficGB:s.aiUnits*ai.internalBytesPerTask/1e9,aiCompletedUnits:Math.floor(s.aiUnits+1e-10),aiUnitsComputed:s.aiUnits,aiTrainingTokens:ai.training?s.aiUnits:0,aiInputUploadedGB:s.aiUploaded,aiInputConsumedGB:s.aiConsumed,aiInputBufferGB:s.aiBuffer,aiEarthQueueGB:s.aiEarth,aiInputOfferedGB:s.aiOffered,aiProductGeneratedGB:s.aiPGenerated,aiProductDeliveredGB:s.aiPDelivered,aiProductQueueGB:s.aiPQueue,aiProductDroppedGB:s.aiPDropped,aiArtifactPendingGB:s.aiPending,aiCheckpointWriteGB:s.aiCheckpointGB,aiCheckpointPendingGB:s.aiCheckpointPendingGB,aiCheckpointCommits:s.aiCheckpointCommits,aiCheckpointCompleteUnits:s.aiCheckpointCompleteUnits,aiCheckpointDeferred:s.aiCheckpointDeferred,aiCheckpointCommitS:s.aiCheckpointCommitS,aiCheckpointCustodyProjected:!!s.checkpointCustodyProjected,storageReadGBs:(b.payloadReadGB+b.delivered)/.25,storageWriteGBs:(b.incoming+b.checkpointWritten+Math.max(0,b.generated-b.dropped))/.25,aiDatasetReadGB:ai.training?s.aiUnits*d.corpusTokenBytes/1e9:0,aiOutputMbps:b.pSent*8000/.25,aiHostKW:ai.hostKw*b.scale,aiFabricKW:ai.fabricKw*b.scale,aiRoute:d.serviceRoute,aiActiveRoute:b.relayOn?'relay':b.terminalRate>0||b.routeUp>0?'direct':'outage',aiRelayOn:b.relayOn,aiDirectUpMbps:b.directUp,aiDirectDownMbps:b.directCapacity,aiRouteUpMbps:b.routeUp,aiRouteDownMbps:b.terminalRate,...g,...f,...b.atm,...link,disposalStatus:status(plan,s.t),disposalMethod:d.disposalMethod,disposalBurnRole:activeBurn(plan,s.t)?.role??null,spacecraftModelEndedAt:plan?hardwareEnd(plan):null,payloadServiceEndS:ignition-180,referenceBody:plan?.entry!=null&&s.t>=plan.entry,disposalOutcome:plan?.outcome??null,disposalTargetMet:plan?.targetMet??null,disposalTargetErrorKm:plan?.targetErrorKm??null,terminatedAt:finished(s.t,s)?plan.end:null,disposalStart:ignition,disposalCutoff:plan?.cutoff??null,disposalEntry:plan?.entry??null,disposalReason:plan?.reason??null,disposalPaidDv:used>0?exhaust*Math.log(plan.initialWet/(plan.initialWet-used)):0,disposalUsedKg:used,disposalRequiredDv:plan?.requiredDv??nominalDisposalDv,disposalProtectedKg:protectedKg,disposalTargetPerigeeKm:targetPerigee,disposalPropAvailableKg:Math.max(0,s.prop-trapped),entryAltitudeKm:ENTRY_KM,enclosureOuterK:b.shell.outerK,enclosureBlanketKW:b.shell.blanketKW,enclosureBridgeKW:b.shell.bridgeKW,enclosureLeakKW:b.shell.outwardKW,textDeliveredGB:s.textDelivered,textGeneratedGB:s.textGenerated,textDroppedGB:s.textDropped,textQueueGB:s.textQueue,bulkQueueGB:Math.max(0,s.queue-s.textQueue),bulkDeliveredGB:Math.max(0,s.delivered-s.textDelivered),tokensDelivered:s.textDelivered*1e9/d.bytesPerToken,textGoodputMbps:b.textDelivered*8000/.25,bulkGoodputMbps:(b.delivered-b.textDelivered)*8000/.25,commandDemandKbps:b.uplinkDemand*8e6/.25,commandGoodputKbps:b.uploaded*8e6/.25,uplinkQueueMB:s.uplinkQueue*1000,uplinkGeneratedMB:s.uplinkGenerated*1000,uplinkDroppedMB:s.uplinkDropped*1000,epochUTC:new Date(epoch+s.t*1000).toISOString(),deployment:b.deploy,contactAgeSec:g.station?Math.max(0,s.t-(s.station===g.station?s.contactSince:s.t)):0,poweredAcquisitionAgeSec:b.contactAge,slewAngleRad:b.slewAngle,slewFraction:b.slewFraction,slewMomentumNms:b.slewMomentum,slewTorqueNm:b.slewTorque,acquired:!!b.acquired,lineMbps:link.lineMbps,goodputMbps:b.delivered*8000/.25,linkCapacityMbps:b.terminalRate,terminalKW:link.terminalKW,solarKW:f.solarKW,loadKW:b.loadKW,servedLoadKW:b.loadKW-b.p.unmet,itKW:b.itKW,pumpKW:b.pumpKW,heatPumpInputKW:b.energy.heatPumpInputKW,servedHeatPumpKW:b.energy.heatPumpInputKW,heatPumpColdRemovalKW:b.thermal.heatPumpColdRemovalKW,heatPumpHotRejectionKW:b.thermal.heatPumpHotRejectionKW,heatPumpThermodynamicValid:b.energy.heatPumpThermodynamicValid,heatPumpOperating:b.energy.heatPumpOperating,payloadColdK:passiveTransport?s.payloadColdK:s.loopK,payloadHeatKW:b.payloadHeatKW,payloadToRadiatorKW:b.thermal.payloadToRadiatorKW,payloadTransportSaturated:b.thermal.payloadTransportSaturated,payloadCapacityKJK:b.payloadCapacityKJK,thermalTopology:transport.kind,storageKW:b.storageKW,auxKW:b.auxKW,jointKW:b.jointKW,coilKW:b.coilKW,cmgKW:b.cmgKW,batteryKWh:s.energy,availableKWh:b.availableKWh,usableKWh:b.availableKWh*(d.socMax-d.socMin),socPct,chargeKW:b.p.charge,dischargeKW:b.p.discharge,curtailedKW:b.p.curtailed,unmetKW:b.p.unmet,unmetKWh:s.unmetEnergy,batteryK:s.packK,packLossKW:b.batteryLoss,packToLoopKW:b.packToLoop,packThermalCapacityKJK:packThermalCapacity,servedPumpKW:b.pumpKW,epsConversionLossKW:b.energy.conversionLossKW,harnessLossKW:b.energy.harnessLossKW,solarConversionLossKW:b.solarConversionLossKW,batteryHeaterKW:b.energy.batteryHeaterKW,loopHeaterKW:b.energy.loopHeaterKW,radiatorHeaterKW:b.energy.radiatorHeaterKW,heaterKW:b.energy.heaterKW,thermalControlKW:b.energy.controlKW,powerServiceFraction:b.poweredSupport,primaryCurrentA:b.energy.primaryCurrentA,primaryDropFraction:b.energy.primaryDropFraction,powerCapacityLimited:b.dispatch.capacityLimited,loopToRadiatorKW:b.thermal.loopToRadiatorKW,thermalResidualKW:b.thermal.residualKW,loopCapacityKJK:b.loopCapacityKJK,radiatorCapacityKJK:b.radiatorCapacityKJK,radiatorCouplingFraction:b.energy.radiatorCouplingFraction,loopBypassFraction:b.energy.bypassFraction,thermalTransportApplicable:b.transportApplicable,thermalActivityMask:mask(s.t,b),batteryThroughputKWh:s.throughputKWh,equivalentCycles:s.throughputKWh/(2*h.batteryKWh),radiatorK:s.heat,loopK:s.loopK??s.heat,coolantK:b.ladder.coolantK,coolantSupplyK:b.ladder.coolantSupplyK,coolantReturnK:b.ladder.coolantReturnK,coldPlateK:b.ladder.coldPlateK,junctionK:b.chipT,thermalMarginK:d.junctionLimitK-b.chipT,grossEmissionKW:b.gross,netRejectionKW:b.net,heatInputKW:b.heatInput,thermalCapacityKJK:b.capKJK,thermalResistanceKPerKw:d.thermalResistanceKPerKw,coolantKgPerSec:b.energy.coolantFlowKgS,fluidPropertyInRange:b.ladder.propertyInRange,liquidPressureMarginPa:b.ladder.liquidPressureMarginPa,freezeSeparationK:b.ladder.freezeSeparationK,queueGB:s.queue,freeTB:Math.max(0,h.usableTB-h.weightsTB-(s.queue+d.retainedGB+ai.reservedStorageGB)/1000),occupiedTB:Math.min(h.usableTB,h.weightsTB+(s.queue+d.retainedGB+ai.reservedStorageGB)/1000),deliveredGB:s.delivered,generatedGB:s.generated,uploadedGB:s.uploaded,commandUploadedGB:s.uploaded,totalUploadedGB:s.uploaded+s.aiUploaded,droppedGB:s.dropped,writeGB:s.writeGB,offeredMbps:b.productionMbps,tokensGenerated:s.tokens,tokensPerSec:b.tokensPerSec,prefillPerSec:h.prefillPerSec*b.scale,perUserTps:h.perUserTps*b.scale,activeFraction:b.scale,burst:b.burst,dragN:b.dragN,torqueNm:b.disturbance,torqueXNm:b.tx,torqueYNm:b.ty,torqueZNm:b.tz,dragTorqueNm:b.dragTorque,solarTorqueNm:b.lightTorque,gravityTorqueNm:b.gravityTorque,momentumNms:s.momentum,cmgMarginNms:d.cmgMomentumNms-s.momentum,cmgTorqueMarginNm:d.cmgTorqueNm-Math.hypot(...f.attitudeDynamics.requestedTorqueNm),magFieldUT:b.bf,unloadTorqueNm:b.unload,unloadAuthorityNm:b.authority,desat:b.unloading,pointingErrorDeg:b.pointingErrorDeg,dragImpulseNs:s.dragImpulse,burn:b.burn,burnKind:b.burn?s.burnKind:null,burnEnd:s.burnEnd,propellantKg:s.prop,fuelKg,oxidizerKg,propellantUsedKg:h.propellantKg-s.prop,tankFillPct:h.tankVolumeL>0?100*(fuelKg/d.fuelDensity+oxidizerKg/d.oxidizerDensity)/h.tankVolumeL:0,reserveKg:reserve,remainingDv:exhaust*Math.log((h.dryKg+h.pressurantKg+s.prop)/(h.dryKg+h.pressurantKg+Math.min(s.prop,reserve))),burnImpulseNs:s.usedImpulse,trimPaidDv:s.trimPaid,wetKg:h.dryKg+h.pressurantKg+s.prop,meanAltitudeKm:(g.apogeeKm+g.perigeeKm)/2,projected:s.t>=earlyDays*DAY&&!audited};if(snapshot.referenceBody){
   snapshot.entryReferenceDragMS2=.5*entryDensity(g.altitudeKm)*g.relativeSpeedMs**2/d.entryBallisticKgM2;snapshot.densityKgM3=entryDensity(g.altitudeKm);snapshot.densitySource='U.S. Standard Atmosphere 1976 · entry profile';Object.assign(snapshot,surfacePoint(d,Math.min(s.t,plan.end),g.positionECI));snapshot.entryDynamicPressurePa=.5*snapshot.densityKgM3*g.relativeSpeedMs**2;snapshot.t=s.t;snapshot.altitudeKm=Math.max(0,g.altitudeKm);
   for(const key of ['loadKW','servedLoadKW','itKW','storageKW','pumpKW','heatPumpInputKW','servedHeatPumpKW','heatPumpColdRemovalKW','heatPumpHotRejectionKW','payloadToRadiatorKW','auxKW','cmgKW','coilKW','jointKW','terminalKW','chargeKW','dischargeKW','heatInputKW','dragN','torqueNm','servedPumpKW','epsConversionLossKW','harnessLossKW','solarConversionLossKW','batteryHeaterKW','loopHeaterKW','radiatorHeaterKW','heaterKW','thermalControlKW','primaryCurrentA','loopToRadiatorKW','coolantKgPerSec'])snapshot[key]=0;
  }
  snapshot.patchLocked=!!b.patchLocked&&!hardwareStopped(s.t,s);
  if(!b.directSelected||!b.commission){snapshot.groundLink=g.station?'S-band':null;snapshot.acquired=snapshot.patchLocked;}
  // Circular local engineering history records one fixed-size packet per powered sample.
  const logBytes=Math.floor((s.hkPoweredS+1e-8)/d.hkPeriodS)*h.cdh.packetBytes,capacityBytes=Math.floor(d.hkRecorderMB*1e6/h.cdh.packetBytes)*h.cdh.packetBytes;
  snapshot.selectedPayloadTerminal=b.selectedPayloadTerminal;snapshot.sBandInstalled=communications.sBandInstalled;snapshot.kaInstalled=communications.kaInstalled;
  const electronicsOn=!(snapshot.referenceBody||hardwareStopped(s.t,s));
  // Readouts of the same instantaneous byte movements used by channels().
  // Available link capacity is not traffic, and local checkpoint writes are
  // distinct from the final training artifact placed in the output recorder.
  const payloadRateScale=electronicsOn?8000/.25:0;
  snapshot.aiInputMbps=b.incoming*payloadRateScale;
  snapshot.aiInputReadMbps=b.payloadReadGB*payloadRateScale;
  snapshot.aiProductGeneratedMbps=b.product*payloadRateScale;
  snapshot.aiCheckpointWriteMbps=b.checkpointWritten*payloadRateScale;
  snapshot.cdhKW=electronicsOn?b.cdhKW:0;snapshot.cdhServedKW=snapshot.cdhKW*b.poweredSupport;
  snapshot.hkRateKbps=electronicsOn&&s.t>=carrier.release?8*h.cdh.packetBytes/d.hkPeriodS*b.poweredSupport/1000:0;
  snapshot.hkDeliveredGB=s.hkDeliveredGB;
  snapshot.hkStoredMB=Math.min(logBytes,capacityBytes)/1e6;snapshot.hkOverwrittenMB=Math.max(0,logBytes-capacityBytes)/1e6;
  // Emitting area, not fluid admission, owns the outgoing radiation. Folded
  // uncoupled panels still exchange energy with space and carry finite heat.
  const upperEmissionWeight=Number.isFinite(snapshot.upperEmissionCoeff)?snapshot.upperEmissionCoeff:Math.max(0,snapshot.upperExposureFraction||0);
  const lowerEmissionWeight=Number.isFinite(snapshot.lowerEmissionCoeff)?snapshot.lowerEmissionCoeff:Math.max(0,snapshot.lowerExposureFraction||0),emissionWeight=upperEmissionWeight+lowerEmissionWeight;
  snapshot.upperRadiatorNetKW=(emissionWeight>0?snapshot.grossEmissionKW*upperEmissionWeight/emissionWeight:0)-snapshot.upperAbsorbedKW;
  snapshot.lowerRadiatorNetKW=(emissionWeight>0?snapshot.grossEmissionKW*lowerEmissionWeight/emissionWeight:0)-snapshot.lowerAbsorbedKW;
  snapshot.trackingDriveKW=b.trackingDriveKW;snapshot.antennaResidualDeg=f.terminalErrorDeg??null;
  snapshot.deploymentJointKW=snapshot.deployment<1?snapshot.jointKW:0;
  delete snapshot.attitudeState; // Compact integrator checkpoint lives in serviceSeed; snapshots carry engineering quantities.
  snapshot.burnHold=s.burnHold||'';
  snapshot.burnPermitState=b.burn?'firing':s.burnHold?'held':hardwareStopped(s.t,s)?'passivated':f.attitudeMode==='prepoint'?'prepoint':'idle';
  snapshot.storedMomentumEciNms=transformBodyToEci(f.bodyAttitudeQ,f.attitudeDynamics.cmgMomentumBodyNms);
  snapshot.momentumNms=Math.hypot(...f.attitudeDynamics.cmgMomentumBodyNms);
  snapshot.cmgMarginNms=d.cmgMomentumNms-snapshot.momentumNms;
  snapshot.magFieldEciUT=b.fieldECI;
  snapshot.magTorqueEciNm=b.rods.torque.map(v=>v*b.poweredSupport);
  snapshot.unloadRequested=b.unloadRequested;
  snapshot.unloadInhibit=b.unloadInhibit;
  snapshot.unloadTorqueNm=b.unload*b.poweredSupport;
  snapshot.directPayloadLock=!!b.directPayloadLock;
  snapshot.lockErrorDeg=f.stationDirectionBody&&f.terminalState!=='parked'?b.pointingErrorDeg:null;
  if(f.terminalState==='tracking'&&snapshot.lockErrorDeg>link.beamwidthDeg*.5)snapshot.terminalState='pointing budget exceeded';
  if(!b.terminalPowered&&f.attitudeMode==='contact')snapshot.terminalState='insufficient terminal power';
  snapshot.thermalQualification=qualifyNow(snapshot,d);
  const junction=snapshot.thermalQualification[0],governing=snapshot.thermalQualification.reduce((a,row)=>row.marginK!==null&&(a===null||row.marginK<a.marginK)?row:a,null);
  snapshot.thermalMarginK=junction.status==='unassessed'?null:junction.maxK-junction.temperatureK;snapshot.thermalMinimumMarginK=governing?.marginK??null;snapshot.thermalGoverningNode=governing?.id??null;return snapshot;
 }
 // Endpoints take the one-sided activity/load state of this interval. Do
 // not bridge a discontinuity in applied heat or external illumination.
 function thermalFrame(out,s,b,g){
  const ladder=energyTemperatureLadder(h,{itKW:d.thermalMode==='applied'?d.appliedHeatKw:b.itKW,heatKW:Math.max(0,b.heatInput),loopK:s.loopK??s.heat,radiatorK:s.heat,payloadColdK:passiveTransport?s.payloadColdK:undefined,heatPumpInputKW:b.energy.heatPumpInputKW,pumpEnabled:passiveTransport||heatliftTransport?passiveTransport||b.energy.heatPumpOperating:b.energy.coolantFlowKgS>0,flowKgS:b.energy.coolantFlowKgS});
  out[0]=ladder.junctionK;out[1]=ladder.coldPlateK;out[2]=ladder.coolantK;out[3]=s.heat;out[4]=s.packK;
  if(b.g.t<carrier.release)out[5]=d.launchBoundaryK;else{const shadow=g.eclipse;g.eclipse=b.g.eclipse;const f=surfaces(h,g,b.deploy,true,b.f.burnDirection,flightGuidance(s,g.t,g));g.eclipse=shadow;out[5]=outerBoundary(carrier.release,s.loopK??s.heat,f).outerK;}
 }
 function newEnergy(){return {radiatorDirectSolar:0,radiatorAlbedo:0,radiatorEarthIR:0,trackingDrives:0,solar:0,requestedLoad:0,served:0,it:0,pump:0,heatPump:0,heatPumpCold:0,heatPumpHot:0,payloadToRadiator:0,storage:0,auxiliary:0,joints:0,cmg:0,coils:0,terminal:0,charge:0,discharge:0,curtailed:0,unserved:0,batteryLoss:0,packToLoop:0,enclosureOutward:0,heatInput:0,absorbed:0,radiatorEmission:0,epsConversionLoss:0,harnessLoss:0,solarConversionLoss:0,batteryHeater:0,loopHeater:0,radiatorHeater:0,thermalControl:0,loopToRadiator:0};}
 function addEnergyAndMode(en,modes,b,dt){
  const eh=dt/3600;en.solar+=b.f.solarKW*eh;en.trackingDrives+=b.trackingDriveKW*eh;en.radiatorDirectSolar+=b.f.radiatorDirectSolarKW*eh;en.radiatorAlbedo+=b.f.radiatorAlbedoKW*eh;en.radiatorEarthIR+=b.f.radiatorEarthIRKW*eh;const mode=b.f.attitudeMode;modes[mode]=(modes[mode]||0)+dt;en.requestedLoad+=b.loadKW*eh;en.served+=(b.loadKW-b.p.unmet)*eh;en.it+=b.itKW*eh;en.pump+=b.pumpKW*eh;en.heatPump+=b.energy.heatPumpInputKW*eh;en.heatPumpCold+=b.thermal.heatPumpColdRemovalKW*eh;en.heatPumpHot+=b.thermal.heatPumpHotRejectionKW*eh;en.payloadToRadiator+=b.thermal.payloadToRadiatorKW*eh;en.storage+=b.storageKW*b.poweredSupport*eh;en.auxiliary+=b.auxKW*b.poweredSupport*eh;en.joints+=b.jointKW*b.poweredSupport*eh;en.cmg+=b.cmgKW*b.poweredSupport*eh;en.coils+=b.coilKW*b.poweredSupport*eh;en.terminal+=b.link.terminalKW*b.poweredSupport*eh;en.charge+=b.p.charge*eh;en.discharge+=b.p.discharge*eh;en.curtailed+=b.p.curtailed*eh;en.unserved+=b.p.unmet*eh;en.batteryLoss+=b.batteryLoss*eh;en.heatInput+=b.heatInput*eh;en.packToLoop+=b.packToLoop*eh;en.enclosureOutward+=b.shell.outwardKW*eh;en.absorbed+=b.f.absorbedKW*eh;en.radiatorEmission+=b.gross*eh;en.epsConversionLoss+=b.energy.conversionLossKW*eh;en.harnessLoss+=b.energy.harnessLossKW*eh;en.solarConversionLoss+=b.solarConversionLossKW*eh;en.batteryHeater+=b.energy.batteryHeaterKW*eh;en.loopHeater+=b.energy.loopHeaterKW*eh;en.radiatorHeater+=b.energy.radiatorHeaterKW*eh;en.thermalControl+=b.energy.controlKW*eh;en.loopToRadiator+=b.thermal.loopToRadiatorKW*eh;
 }
 function newWindowStats(seed){
  const initial=read(seed),t=seed.t;
  return {integratedDisturbance:0,environmentImpulseECI:[0,0,0],integratedAuthority:0,payloadServiceSeconds:0,activeComputeSeconds:0,
   minSocPct:initial.socPct,minSocTime:t,maxSocPct:initial.socPct,maxJunctionK:initial.junctionK,maxJunctionTime:t,maxLoadKW:initial.loadKW,
   peakQueueGB:seed.queue,peakQueueTime:t,peakMomentumNms:seed.momentum,peakMomentumTime:t,peakControlTorqueNm:0,minMomentumMarginNms:Infinity,
   shadowSeconds:0,contactSeconds:0,contactCount:0,eclipseCount:0,attitudeModeSeconds:{},energyKWh:newEnergy()};
 }
 // Installed loads/torques are held on the accepted integration interval. Clip its
 // duration and endpoint inventories when a user window cuts through that interval.
 function addWindowInterval(stats,old,s,b){
  const dt=s.t-old.t,t=old.t+.5*dt,g=b.g;
  if(!stats.firstCrossing){const limit=g.orbitLost?'Perigee reached 120 km':old.burnHold||(old.burnKind==='trim'&&t>=old.burnEnd&&d.trimDv-old.trimPaid>.001&&s.prop<=reserve+.000001?'Insertion trim propellant':b.p.unmet>.001?'Unserved electrical demand':b.dropped>.000001?'Recorder capacity or write rate':s.momentum>d.cmgMomentumNms?'CMG momentum':b.unloading&&b.disturbance>b.authority&&s.momentum>.99*d.cmgMomentumNms?'Magnetic unloading authority':t>=burnTime&&!s.plan&&s.prop<=maintenanceFloor+.000001&&s.pendingImpulse>1?'Station-keeping propellant':null);if(limit)stats.firstCrossing={limit,time:limit==='Insertion trim propellant'?old.burnEnd:t,socPct:100*s.energy/b.availableKWh,thermalMarginK:d.junctionLimitK-b.chipT,unservedKW:b.p.unmet,droppedGB:b.dropped,cmgMarginNms:d.cmgMomentumNms-s.momentum,propellantMarginKg:s.prop-reserve};}
  if(b.commission)stats.payloadServiceSeconds+=dt;
  if(b.scale>0)stats.activeComputeSeconds+=dt;
  addEnergyAndMode(stats.energyKWh,stats.attitudeModeSeconds,b,dt);
  if(s.queue>stats.peakQueueGB){stats.peakQueueGB=s.queue;stats.peakQueueTime=s.t;}
  const stored=Math.max(old.momentum,s.momentum);
  if(stored>stats.peakMomentumNms){stats.peakMomentumNms=stored;stats.peakMomentumTime=s.t;}
  stats.minMomentumMarginNms=Math.min(stats.minMomentumMarginNms,d.cmgMomentumNms-stored);
  stats.peakControlTorqueNm=Math.max(stats.peakControlTorqueNm,Math.hypot(...b.f.attitudeDynamics.requestedTorqueNm));
  stats.integratedDisturbance+=b.disturbance*dt;stats.integratedAuthority+=(b.unloadInhibit?0:b.authority)*dt;
  for(let k=0;k<3;k++)stats.environmentImpulseECI[k]+=b.disturbanceECI[k]*dt;
  const soc=100*s.energy/(h.batteryKWh*fraction(d.batteryRetention,s.t/YEAR));
  stats.maxSocPct=Math.max(soc,stats.maxSocPct);if(soc<stats.minSocPct){stats.minSocPct=soc;stats.minSocTime=s.t;}
  const oldThermalStore=passiveTransport?old.payloadColdK:heatliftTransport?old.loopK:old.heat,newThermalStore=passiveTransport?s.payloadColdK:heatliftTransport?s.loopK:s.heat;
  const localRise=passiveTransport||heatliftTransport?b.ladder.junctionK-oldThermalStore:b.rRise,peak=Math.max(oldThermalStore,newThermalStore)+localRise;
  if(peak>stats.maxJunctionK){stats.maxJunctionK=peak;stats.maxJunctionTime=oldThermalStore>newThermalStore?old.t:s.t;stats.peakThermalInterval=[old.t,s.t];stats.peakThermalSide=oldThermalStore>newThermalStore?'right':'left';}
  stats.maxLoadKW=Math.max(stats.maxLoadKW,b.loadKW);
  if(g.eclipse&&t>=INSERTION_MET)stats.shadowSeconds+=dt;
  if(g.station)stats.contactSeconds+=dt;
 }
 function windowTotals(seed,s){
  return {...classTotals(seed,s),generatedGB:s.generated-seed.generated,deliveredGB:s.delivered-seed.delivered,uploadedGB:s.uploaded-seed.uploaded,
   unmetKWh:s.unmetEnergy-seed.unmetEnergy,propellantUsedKg:seed.prop-s.prop,droppedGB:s.dropped-seed.dropped};
 }
 // The synchronous model and cooperative preparation drain the same sequence.
 // Yielding between accepted steps changes scheduling, never the integration.
 function* daySteps(seed,{step=SEC,record=true,span=DAY,qualification=false,segments=null}={}){
  const start=seed.t,end=start+span;let s={...seed},g0=geo(start+.0001,s),states=record?[s]:[],traffic=[],events=[],open={},stats=newWindowStats(seed);
  const thermal=qualification?newThermalSummary(d,start,end,'Chronological mission integration'):null;
  const frameA=qualification?new Float64Array(6):null,frameB=qualification?new Float64Array(6):null;
  if(thermal)stats.thermal=thermal;
  function mark(kind,label,when,station){const active=open[kind];if(active?.label===label)return;if(active){active.end=when;if(active.end>active.start)events.push(active);delete open[kind]};if(label){open[kind]={id:kind+'-'+Math.round(when*10)+'-'+(station||''),type:kind,label,start:when,end:when,station:station||null};}}
  while(s.t<end-1e-7){boundary(s);
   if(hardwareStopped(s.t,s)){if(!s.plan.feasible&&!stats.firstCrossing)stats.firstCrossing={limit:'Disposal infeasible',time:s.plan.start,reason:s.plan.reason,availableKg:s.prop-trapped,requiredDv:s.plan.requiredDv};
    for(const k of Object.keys(open))mark(k,null,s.t);s={...s,t:end};if(record)states.push(s);break;}
   const movingBanks=s.t>=DEPLOY_START_S&&s.t<DEPLOY_END_S;
   const nextBurn=s.plan?.burns?.find(q=>q.start>s.t+1e-7)?.start??Infinity,prepareAt=nextBurn-limits.prepointS;
   let to=Math.min(end,s.t+(movingBanks?Math.min(step,3):step),nextPolicyEdge(s.t),hardwareEnd(s.plan),nextBurn,prepareAt>s.t+1e-7?prepareAt:Infinity,s.burnEnd>s.t+1e-7?s.burnEnd:Infinity);
   if(g0.station)to=Math.min(to,s.t+(s.t-(s.station===g0.station?s.contactSince:s.t)<60?3:10));
   if(s.station){const acquiredStart=Math.max(s.contactSince,s.lastUnpoweredAt),commandAcq=acquiredStart+5;if(commandAcq>s.t+1e-7)to=Math.min(to,commandAcq);const acq=acquiredStart+linkBudget(d,g0,0,s.queue).acquisitionSec;if(acq>s.t+1e-7)to=Math.min(acq,to);}
   const signature=g=>g.eclipse+'|'+g.station;
   let gEnd=geo(to-.00001,s);
   if(signature(gEnd)!==signature(g0)&&to-s.t>.15){let a=s.t,b=to;for(let k=0;k<13&&b-a>.018;k++){const m=(a+b)/2;if(signature(geo(m,s))===signature(g0))a=m;else b=m;}
    if(b-s.t>.03){to=b;gEnd=geo(to+.02,s);}
   }
   if(to<=s.t+1e-8)throw Error(`Nonadvancing clock at ${s.t}: ${to}`);
   let dt=to-s.t,t=s.t+.5*dt,g=geo(t,s),b=channels(s,t,g,dt);
   // Split at pack energy bounds: an average charging rate for an entire
   // interval would incorrectly keep a full standby pack in operating mode.
   for(let k=0;k<2;k++){
    const surplus=b.f.solarKW-b.loadKW,availablePower=surplus>0?Math.min(surplus,h.batteryKWh*d.chargeC):Math.min(-surplus,h.batteryKWh*d.dischargeC);
    if(availablePower<=.001)break;const untilBound=dt*(surplus>0?b.p.charge:b.p.discharge)/availablePower;
    if(untilBound<.015||untilBound>=dt-.015)break;
    dt=untilBound;to=s.t+dt;t=s.t+dt/2;g=geo(t,s);gEnd=geo(to-.00001,s);b=channels(s,t,g,dt);
   }
   const old=s;s=advance(s,to,g,b);
   if(segments)segments.push(serviceSegment(old.t,to,b));
   if(thermal){thermalFrame(frameA,old,b,g0);thermalFrame(frameB,s,b,gEnd);accumulateThermal(thermal,old.t,to,mask(t,b),frameA,frameB);}
   addWindowInterval(stats,old,s,b);
   if(thermal?.firstViolation&&(!stats.firstCrossing||thermal.firstViolation.time<stats.firstCrossing.time)){const v=thermal.firstViolation;stats.firstCrossing={...v,limit:'Thermal · '+v.label+' · '+v.state+' '+v.side,thermalMarginK:v.side==='low'?v.temperatureK-v.limitK:v.limitK-v.temperatureK};}
   if(record){
    states.push(s);
    if(b.uploaded>0||b.telemetryGB>0||b.incoming>0||b.delivered>0)
     traffic.push({start:old.t,end:to,terminalActivity:stepTransfers(b,dt)});
   }
   mark('contact',g.station?g.station+' ground pass':null,old.t,g.station);mark('eclipse',g.eclipse&&t>=INSERTION_MET?'Earth eclipse':null,old.t);mark('burst',b.burst?'Compute burst':null,old.t);mark('desat',b.unloading?'Magnetic desaturation':null,old.t);mark('disposal',b.burn&&old.burnKind==='disposal'?(activeBurn(old.plan,t)?.role||'Disposal burn'):null,old.t);mark('coast',old.plan?.feasible&&!b.burn?(old.plan.method==='graveyard'?'Coast to raised apogee':'Ballistic coast to interface'):null,old.t);mark('reboost',b.burn&&old.burnKind==='reboost'?'Chemical reboost':null,old.t);mark('trim',b.burn&&old.burnKind==='trim'?'Post-deployment insertion trim':null,old.t);g0=geo(to+.025,s);
   yield s.t;
  }
  for(const k of Object.keys(open))mark(k,null,end);
  if(s.plan&&s.plan.start>=start&&s.plan.start<end&&!s.plan.feasible)events.push({id:'infeasible-'+Math.round(s.plan.start*10)+'-',type:'infeasible',label:'Disposal inhibited',start:s.plan.start,end:s.plan.start+.001,station:null});
  if(s.plan?.entry!=null&&s.plan.entry>=start&&s.plan.entry<end)events.push({id:'entry-'+Math.round(s.plan.entry*10)+'-',type:'entry',label:'Descending atmospheric interface',start:s.plan.entry,end:s.plan.entry+.001,station:null});
  if(s.plan?.outcome==='target-miss'&&s.plan.end>=start&&s.plan.end<end&&!stats.firstCrossing)stats.firstCrossing={limit:'Disposal target tolerance',time:s.plan.end,targetErrorKm:s.plan.targetErrorKm,toleranceKm:s.plan.target.toleranceKm};
  if(s.plan?.impact&&s.plan.entry<end&&s.plan.end>start)events.push({id:'descent-'+Math.round(s.plan.entry*10)+'-',type:'descent',label:'Surviving reference-body descent',start:Math.max(start,s.plan.entry),end:Math.min(end,s.plan.end),station:null});
  if(s.plan?.feasible&&s.plan.end>=start&&s.plan.end<end){const type=s.plan.method==='graveyard'?'graveyard':'impact';events.push({id:type+'-'+Math.round(s.plan.end*10)+'-',type,label:type==='impact'?'Reference-body surface intersection':'Raised circular orbit acquired',start:s.plan.end,end:s.plan.end+.001,station:null});}
  if(start===0)events.push(...[['launch','Launch ascent',0,540],['insertion','Orbital insertion and separation',540,DEPLOY_START_S],['deployment','Appendage commissioning and Sun acquisition',DEPLOY_START_S,DEPLOY_END_S]].map(([type,label,start,end])=>({type,label,start,end,id:type+'-'+start,station:null})));
  events.sort((a,b)=>a.start-b.start);stats.contactCount=events.filter(e=>e.type==='contact').length;stats.eclipseCount=events.filter(e=>e.type==='eclipse').length;
  Object.assign(stats,windowTotals(seed,s));return {seed,end:s,states,events,stats,traffic};
 }
 function finishSteps(iterator){let step;do{step=iterator.next()}while(!step.done);return step.value;}
 function makeDay(seed,options){return finishSteps(daySteps(seed,options));}
 // Long-horizon quadrature: propagate endpoint inventories and accumulated extensive quantities with a repeated representative day. Short daily history always starts at a deterministic checkpoint.
 let audited=null,auditGeneration=0,focusDay=-1,preparedCloseout='',closeoutOptions=null;
 const focused=new Map(),summaryCache=new Map(),windowCache=new Map(),missionCache=new Map(),serviceCache=new Map(),thermalCache=new Map();
 const earlyDays=60,sampleBlock=90,early=new Map([[0,first]]),blocks=new Map();
 function earlySeed(day){if(!early.has(day)){const prev=earlySeed(day-1),r=mainDays.get(day-1)||makeDay(prev,{record:false});early.set(day,r.end);}return {...early.get(day)};}
 function classTotals(a,b){return {aiUnitsComputed:b.aiUnits-a.aiUnits,aiTrainingTokens:ai.training?b.aiUnits-a.aiUnits:0,aiInputUploadedGB:b.aiUploaded-a.aiUploaded,aiInputConsumedGB:b.aiConsumed-a.aiConsumed,aiProductGeneratedGB:b.aiPGenerated-a.aiPGenerated,aiProductDeliveredGB:b.aiPDelivered-a.aiPDelivered,aiProductDroppedGB:b.aiPDropped-a.aiPDropped,aiCheckpointWriteGB:b.aiCheckpointGB-a.aiCheckpointGB,textGeneratedGB:b.textGenerated-a.textGenerated,textDeliveredGB:b.textDelivered-a.textDelivered,textDroppedGB:b.textDropped-a.textDropped,bulkDeliveredGB:(b.delivered-a.delivered)-(b.textDelivered-a.textDelivered),tokensDelivered:(b.textDelivered-a.textDelivered)*1e9/d.bytesPerToken,housekeepingTelemetryGB:b.hkDeliveredGB-a.hkDeliveredGB,commandDroppedMB:(b.uplinkDropped-a.uplinkDropped)*1000};}
 function project(seed,rep,n){if(n===0)return {...seed};if(n===1)return {...rep.end};const out={...rep.end,t:seed.t+DAY*n};for(const k of ['generated','textGenerated','uplinkGenerated','hkPoweredS','hkDeliveredGB','tokens','dragImpulse','unmetEnergy','throughputKWh','writeGB','chargeBusKWh','dischargeBusKWh'])out[k]=seed[k]+(rep.end[k]-seed[k])*n;
  const batteryCap=h.batteryKWh*fraction(d.batteryRetention,out.t/YEAR),repCap=h.batteryKWh*fraction(d.batteryRetention,rep.end.t/YEAR),saturated=rep.stats.maxSocPct>=100*d.socMax-.1||rep.stats.minSocPct<=100*d.socMin+.1;
  out.energy=clip(saturated?rep.end.energy/repCap*batteryCap:seed.energy+(rep.end.energy-seed.energy)*n,batteryCap*d.socMin,batteryCap*d.socMax);
  const storageCap=outputCapacityGB;
  const suppliedUp=seed.uplinkQueue+out.uplinkGenerated-seed.uplinkGenerated,sentUp=Math.min(suppliedUp,(rep.end.uploaded-seed.uploaded)*n);out.uploaded=seed.uploaded+sentUp;out.uplinkQueue=clip(suppliedUp-sentUp,0,uplinkBufferGB);out.uplinkDropped=seed.uplinkDropped+suppliedUp-sentUp-out.uplinkQueue;
  const dailyDrag=rep.end.dragImpulse-seed.dragImpulse,requests=Math.max(0,(seed.prop-rep.end.prop)*exhaust+dailyDrag*(n-1));
  // Reconcile the representative-day estimate against finite customer inventory.
  const delta=k=>(rep.end[k]-seed[k])*n;
  out.aiOffered=seed.aiOffered+delta('aiOffered');
  const offered=seed.aiEarth+delta('aiOffered'),usedInput=delta('aiConsumed');
  const upl=Math.min(offered,Math.max(0,ai.inputCapacityGB-seed.aiBuffer+usedInput),Math.max(0,delta('aiUploaded')));
  out.aiUploaded=seed.aiUploaded+upl;out.aiEarth=Math.max(0,offered-upl);
  const used=Math.min(seed.aiBuffer+upl,usedInput);out.aiConsumed=seed.aiConsumed+used;out.aiBuffer=clip(seed.aiBuffer+upl-used,0,ai.inputCapacityGB);
  const increment=ai.training?Math.min(Math.max(0,ai.trainingGoalTokens-seed.aiUnits),delta('aiUnits'),Math.max(0,trainEnd-seed.t)*ai.activeTrainingTps):used*1e9/ai.inputBytesPerUnit;
  out.aiUnits=seed.aiUnits+increment;out.aiActiveS=seed.aiActiveS+increment/Math.max(1e-12,ai.activeUnitsPerSec);
  const projectedSaves=ai.training?Math.max(0,Math.floor(out.aiActiveS/ai.checkpointIntervalS)-Math.floor(seed.aiActiveS/ai.checkpointIntervalS)):0;
  const projectedCheckpointWrite=Math.min(Math.max(0,delta('aiCheckpointGB')),projectedSaves*ai.restartGB+(seed.aiCheckpointPendingGB||0));
  out.aiCheckpointGB=seed.aiCheckpointGB+projectedCheckpointWrite;
  out.aiCheckpointPendingGB=Math.min(ai.restartGB,Math.max(0,(seed.aiCheckpointPendingGB||0)+projectedSaves*ai.restartGB-projectedCheckpointWrite));
  const priorProgress=seed.aiCheckpointPendingGB>0?ai.restartGB-seed.aiCheckpointPendingGB:0;
  out.aiCheckpointCommits=(seed.aiCheckpointCommits||0)+(ai.restartGB>0?Math.floor((priorProgress+projectedCheckpointWrite)/ai.restartGB):0);
  out.checkpointCustodyProjected=true; // Detailed commit epoch/state requires the chronological audit.

  const completed=ai.purposeId==='agents'||ai.purposeId==='batch'?Math.floor(out.aiUnits+1e-10)-Math.floor(seed.aiUnits+1e-10):increment;
  const produced=ai.training?Math.min(delta('aiPGenerated'),Math.max(0,ai.artifactGB-seed.aiPGenerated)):completed*ai.outputBytesPerUnit/1e9;
  const bulkGrowth=Math.max(0,delta('generated')-delta('aiPGenerated'));
  out.generated=seed.generated+bulkGrowth+produced;out.aiPGenerated=seed.aiPGenerated+produced;
  const supply=seed.queue+bulkGrowth+produced,deliv=Math.min(supply,Math.max(0,delta('delivered'))),back=supply-deliv;
  out.delivered=seed.delivered+deliv;out.queue=Math.min(storageCap,back);out.dropped=seed.dropped+Math.max(0,back-out.queue);
  const pSupply=seed.aiPQueue+produced,pSent=clip(delta('aiPDelivered'),Math.max(0,deliv-(supply-pSupply)),Math.min(deliv,pSupply));
  out.aiPDelivered=seed.aiPDelivered+pSent;out.aiPQueue=Math.min(out.queue,Math.max(0,pSupply-pSent));out.aiPDropped=seed.aiPDropped+Math.max(0,pSupply-pSent-out.aiPQueue);out.aiBuilt=seed.aiBuilt||(ai.training&&out.aiUnits>=ai.trainingGoalTokens);out.aiPending=ai.training&&out.aiBuilt&&ai.artifactValid?Math.max(0,ai.artifactGB-out.aiPGenerated):0;
  out.textGenerated=ai.text?out.aiPGenerated:0;out.textDelivered=ai.text?out.aiPDelivered:0;out.textQueue=ai.text?out.aiPQueue:0;out.textDropped=ai.text?out.aiPDropped:0;out.tokens=ai.training?0:out.aiUnits*ai.tokensPerUnit;
  out.prop=Math.max(Math.min(maintenanceFloor,seed.prop),seed.prop-requests/exhaust);out.usedImpulse=seed.usedImpulse+(seed.prop-out.prop)*exhaust;
  out.pendingImpulse=Math.max(0,rep.end.pendingImpulse+Math.max(0,requests-(seed.prop-out.prop)*exhaust));out.burnEnd=0;out.station=null;out.contactSince=out.t;
  // Unsampled days carry the representative attitude and actual rotor encoders.
  // Their intervening torque history is unresolved. Retime this estimated seed
  // and establish the current guidance reference without inventing a slew across
  // the skipped interval. The detailed window then propagates from this state.
  out.attitudeState={...rep.end.attitudeState,t:out.t,referenceRate:[0,0,0]};
  delete out.attitudeAnchor;
  const attitude=flightGuidance(out,out.t,geo(out.t,out));
  out.attitudeState=attitude.attitudeState;
  const stored=attitude.attitudeDynamics.cmgMomentumBodyNms;
  out.momentumECI=transformBodyToEci(attitude.bodyAttitudeQ,stored);
  out.momentum=Math.hypot(...out.momentumECI);
  out.unloading=out.unloading?out.momentum>.25*d.cmgMomentumNms:out.momentum>=.65*d.cmgMomentumNms;
  return out;
 }
 function block(i){if(blocks.has(i))return blocks.get(i);const seed=i===0?earlySeed(earlyDays):project(block(i-1).seed,block(i-1).rep,sampleBlock),rep=makeDay(seed,{step:180,record:false}),b={seed,rep};blocks.set(i,b);return b;}
 function seedForDay(n){
  if(audited?.seeds[n])return audited.seeds[n];
  if(n>terminalDay||n===terminalDay&&n>=earlyDays)return day(n-1,true).end;
  if(n<earlyDays)return earlySeed(n);
  const age=n-earlyDays,b=block(Math.floor(age/sampleBlock));return project(b.seed,b.rep,age%sampleBlock);
 }
 function rememberDay(n,r){if(mainDays.size>=7){const k=[...mainDays.keys()].find(x=>x>=3);if(k!==undefined)mainDays.delete(k);}mainDays.set(n,r);preparedCloseout='';return r;}
 function day(n,canonical=false){n=Math.max(0,Math.floor(n));if(!canonical&&focused.has(n))return focused.get(n);if(mainDays.has(n))return mainDays.get(n);
  return rememberDay(n,makeDay(seedForDay(n)));
 }
 function clearWindowCaches(){summaryCache.clear();windowCache.clear();missionCache.clear();serviceCache.clear();thermalCache.clear();preparedCloseout='';}
 function focusWindow(start){const n=Math.max(0,Math.floor(start/DAY));if(audited||n===focusDay)return;focusDay=n;focused.clear();eventCache.clear();runCache.clear();clearWindowCaches();if(n<earlyDays-1||n>=terminalDay-1)return;
  // Resolve a continuous trajectory across both dates in the selected 86,400-second window. A full preceding day spins up the fast thermal and power states.
  const prev=day(n-1,true),current=makeDay(prev.end);focused.set(n,current);focused.set(n+1,makeDay(current.end));
 }
 function stateAt(t){t=Number(t)||0;if(t<0)return {...first,t:Math.max(-3600,t)};t=Math.min(duration,t);const n=Math.floor(t/DAY);
  // The final point of a 24-hour chart needs the next midnight, not the following day of flight.
  if(t===n*DAY&&!focused.has(n)&&!mainDays.has(n)){const seed={...seedForDay(n)};boundary(seed);return seed;}
  const r=day(n);let l=0,u=r.states.length-1;while(l<u){const m=Math.ceil((l+u)/2);if(r.states[m].t<=t)l=m;else u=m-1;}const a=r.states[l],b=r.states[l+1];
  if(t<=a.t||!b)return advance(a,t);
  // Reintegrate the partial interval from its accepted checkpoint. Interpolated
  // gimbal angles can leave the nonlinear momentum envelope between legal ends.
  const state=advance(a,t);state.attitudeAnchor=a.attitudeState;return state;}
 // Activity is the mean accepted data rate over the half-open integration
 // interval containing t. Replaying a nearly drained queue with a new tiny
 // dt can otherwise produce a bright pulse after the accepted transfer.
 function at(t){
  const snap=read(stateAt(t));snap.terminalActivity=[];
  if(snap.t<carrier.release||snap.t>=duration||snap.referenceBody||snap.orbitLost||(!snap.station&&!snap.aiRelayOn))return snap;
  const steps=day(Math.floor(snap.t/DAY)).traffic;let lo=0,hi=steps.length;
  while(lo<hi){const mid=(lo+hi)>>>1;if(steps[mid].end<=snap.t)lo=mid+1;else hi=mid}
  const step=steps[lo];
  if(step&&step.start<=snap.t)snap.terminalActivity=step.terminalActivity;
  return snap;
 }
 const runCache=new Map();
 function terminalWindow(start=0,span=DAY){
  start=clip(start,0,duration);const end=clip(start+span,start,duration),key=start+'|'+end;
  if(end-start>31*DAY)throw Error('Terminal activity supports up to 31 consecutive days.');
  focusWindow(start);
  if(runCache.has(key))return runCache.get(key);
  const steps=[];
  for(let n=Math.floor(start/DAY);n*DAY<end;n++){
   for(const step of day(n).traffic){
    const left=Math.max(start,step.start),right=Math.min(end,step.end);
    if(right>left)steps.push(left===step.start&&right===step.end?step:{start:left,end:right,terminalActivity:clipTransfers(step.terminalActivity,right-left)});
   }
  }
  const runs=terminalRuns(steps);if(runCache.size>=4)runCache.clear();runCache.set(key,runs);return runs;
 }
 function window(start=0,span=DAY,count=180){count=clip(Math.floor(count),2,10000);const key=start+'|'+span+'|'+count,cached=windowCache.get(key);return cached?cached.map(row=>({...row})):Array.from({length:count},(_,i)=>at(start+span*i/(count-1)));}
 function events(start=0,span=DAY){const end=Math.min(duration,start+span),key=start+'|'+span;if(eventCache.has(key))return eventCache.get(key);const list=[{type:'integration',label:'Payload integration',id:'integration--3600',start:-3600,end:-600,station:null},{type:'pad',label:'Launch pad',id:'pad--600',start:-600,end:0,station:null}].filter(e=>e.end>start&&e.start<end);for(let n=Math.max(0,Math.floor(start/DAY));n<=Math.floor((end-.000001)/DAY);n++)for(const ev of day(n).events)if(ev.end>start&&ev.start<end){const prev=list.findLast(x=>x.type===ev.type);if(prev&&prev.label===ev.label&&Math.abs(prev.end-ev.start)<.025)prev.end=ev.end;else list.push({...ev});}list.sort((a,b)=>a.start-b.start);if(eventCache.size>8)eventCache.clear();eventCache.set(key,list);return list;}
 function* summarySteps(start=0){
  start=clip(start,0,duration);focusWindow(start);
  const end=Math.min(duration,start+DAY);
  if(start%DAY===0&&end-start===DAY)return {...day(start/DAY).stats};
  const initial=stateAt(start),final=stateAt(end),stats=newWindowStats(initial);
  for(let n=Math.floor(start/DAY);n*DAY<end;n++){
   const dayRecord=day(n),states=dayRecord.states;
   for(let j=1;j<states.length;j++){
    const a=states[j-1],z=states[j],left=Math.max(start,a.t),right=Math.min(end,z.t,hardwareEnd(a.plan));
    if(right<=left||hardwareStopped(a.t,a))continue;
    const dt=z.t-a.t,mid=a.t+.5*dt,b=channels(a,mid,geo(mid,a),dt);
    addWindowInterval(stats,left===a.t?a:initial,right===z.t?z:stateAt(right),b);
    yield right;
   }
   const crossing=dayRecord.stats.firstCrossing;
   if(crossing&&crossing.time>=start&&crossing.time<end&&(!stats.firstCrossing||crossing.time<stats.firstCrossing.time))stats.firstCrossing=crossing;
  }
  const visible=events(start,end-start);
  stats.contactCount=visible.filter(e=>e.type==='contact').length;
  stats.eclipseCount=visible.filter(e=>e.type==='eclipse').length;
  return Object.assign(stats,windowTotals(initial,final));
 }
 function daySummary(start=0){start=clip(start,0,duration);focusWindow(start);const cached=summaryCache.get(start);return cached?{...cached}:finishSteps(summarySteps(start));}
 function missionRow(t){const n=Math.floor(t/DAY),s=stateAt(t),stats=audited?.dayStats[Math.min(n,audited.dayStats.length-1)]||day(n).stats;
  const fields={...stats};for(const k of ['aiUnitsComputed','aiTrainingTokens','aiInputUploadedGB','aiInputConsumedGB','aiProductGeneratedGB','aiProductDeliveredGB','aiProductDroppedGB','aiCheckpointWriteGB','generatedGB','deliveredGB','uploadedGB','propellantUsedKg','unmetKWh','droppedGB','textGeneratedGB','textDeliveredGB','textDroppedGB','bulkDeliveredGB','tokensDelivered','housekeepingTelemetryGB','commandDroppedMB']){fields['day'+k[0].toUpperCase()+k.slice(1)]=fields[k];delete fields[k];}return {...read(s),...fields,projected:n>=earlyDays&&!audited};}
 function mission(count=90){count=clip(Math.floor(count),2,361);const cached=missionCache.get(count);return cached?cached.map(row=>({...row})):Array.from({length:count},(_,i)=>missionRow(duration*i/(count-1)));}
 const chapters=new Map(),chapterIds=['integration','pad','ascent','insertion','commissioning','operations','contact','reboost','desat','deorbit'];
 function disposal(){let p=stateAt(Math.min(duration,ignition+.001)).plan;if(!p)return null;if(p.burns.length>1)p=stateAt(Math.min(duration,p.burns.at(-1).start+.001)).plan;const {samples,...rest}=p;return rest;}
 function story(which){
  if(!which)return chapterIds.map(id=>story(id));
  if(chapters.has(which))return chapters.get(which);
  const mk=(id,label,type,start,end,instant,eventId,status='available')=>({id,label,type,start,end,instant,eventId,status});
  const fixed={integration:['Payload integration','integration',-3600,-600,-2100],pad:['Launch pad','pad',-600,0,-240],ascent:['Ascent','launch',0,540,270],insertion:['Orbital insertion and separation','insertion',540,DEPLOY_START_S,650],commissioning:['Deployment and Sun acquisition','deployment',DEPLOY_START_S,DEPLOY_END_S,deploymentMET(.23,h)]};
  let chapter;
  if(fixed[which]){const [label,type,start,end,instant]=fixed[which];chapter=mk(which,label,type,start,end,instant,type+'-'+start);}
  else if(which==='deorbit'){const p=disposal(),type=p?.feasible?'disposal':'infeasible';chapter=mk(which,p?.feasible?(p.method==='graveyard'?'Raised disposal orbit':'Targeted reference-body reentry'):'Disposal feasibility',type,ignition,p?.end??ignition,p?.feasible?(ignition+p.burns[0].end)/2:ignition+.001,type+'-'+Math.round(ignition*10)+'-',p?.feasible?'available':'infeasible');}
  else{
   const key={operations:['Routine compute','burst','commissioning',2],contact:['Ground station pass','contact','operations',7],reboost:['Station keeping','reboost','contact',3],desat:['Momentum unloading','desat','reboost',45]}[which];if(!key)return undefined;
   const [label,type,prev,maxDays]=key,prior=story(prev),after=prior.end??prior.searchStart??DEPLOY_END_S,limit=audited?ignition:Math.min(ignition,after+maxDays*DAY);let found;
   for(let n=Math.floor(after/DAY);n*DAY<limit;n++){if(audited&&!audited.dayStats[n]?.counts?.[type+'Count'])continue;found=day(n).events.find(e=>e.type===type&&e.start>=after&&e.start<limit);if(found)break;}
   chapter=found?mk(which,label,type,found.start,found.end,(found.start+found.end)/2,found.id):{...mk(which,label,type,null,null,null,null,'unavailable'),searchStart:after,searchEnd:limit,reason:limit<ignition?'No matching event within the preview search interval':'No matching event before disposal'};
  }
  chapters.set(which,chapter);return chapter;
 }
 function* thermalSteps(start=0,span=DAY){
  start=clip(start,-3600,duration);const end=clip(start+span,start,duration);
  if(end-start>31*DAY){if(audited&&start===0&&end===duration)return audited.result.thermal;throw Error('Select up to 31 days or use the chronological full-mission audit.');}
  const summary=newThermalSummary(d,start,end,audited?'Selected window · chronological mission checkpoints':end<=earlyDays*DAY?'Selected window · chronological from launch':'Selected window · representative-day initial inventory',true);
  const a=new Float64Array(6),b=new Float64Array(6);
  if(start<0){const v=read(stateAt(start));a.set(v.thermalQualification.map(q=>q.temperatureK));accumulateThermal(summary,start,Math.min(0,end),0,a,a);}
  if(end<=0)return summary;
  focusWindow(Math.max(0,start));
  for(let n=Math.max(0,Math.floor(start/DAY));n*DAY<end;n++){
   const states=day(n).states;for(let j=1;j<states.length;j++){
    const old=states[j-1],next=states[j],from=Math.max(start,old.t),until=Math.min(end,next.t);if(until<=from||hardwareStopped(old.t,old))continue;
    const dt=next.t-old.t,mid=old.t+dt/2,g=geo(mid,old),q=channels(old,mid,g,dt);
    thermalFrame(a,old,q,geo(old.t+.0001,old));thermalFrame(b,next,q,geo(next.t-.0001,old));
    if(from!==old.t||until!==next.t){const left=(from-old.t)/dt,right=(until-old.t)/dt;for(let k=0;k<6;k++){const v=a[k],diff=b[k]-v;a[k]=v+left*diff;b[k]=v+right*diff;}}
    accumulateThermal(summary,from,until,mask(mid,q),a,b);yield until;
   }
  }
  return summary;
 }
 function thermalWindow(start=0,span=DAY){const cached=thermalCache.get(start+'|'+span);return cached?structuredClone(cached):finishSteps(thermalSteps(start,span));}
 function serviceSegment(start,end,b){
  return {
   start,end,upMbps:b.directUp,downMbps:b.directCapacity,routeUpMbps:b.routeUp,routeDownMbps:b.terminalRate,
   rangeKm:b.g.rangeKm,station:b.g.station,relayOn:b.relayOn,scheduled:b.burst,commissioned:b.commission,
   activeFraction:b.scale,itKW:b.itKW,solarKW:b.f.solarKW,loadKW:b.loadKW,servedLoadKW:b.loadKW-b.p.unmet,unmetKW:b.p.unmet,
   aiUnitRate:b.aiRate,capacityUnitsPerSec:b.capacityUnitsPerSec,powerOnlyUnitsPerSec:b.powerOnlyUnitsPerSec,serviceHeatLimitKW:b.serviceHeatLimitKW,aiUsefulTflops:b.aiRate*ai.flopsPerUnit/1e12,
   aiInputUploadedGB:b.incoming,aiInputConsumedGB:b.consumed,aiProductGeneratedGB:b.product,aiProductDeliveredGB:b.pSent
  };
 }
 function serviceDay(seed,span=DAY){const segments=[],r=makeDay(seed??first,{record:false,span,segments});return {end:r.end,segments};}
 function* serviceSteps(start=0,span=DAY,{flightRecord=false}={}){
  start=clip(start,0,duration);const end=clip(start+span,start,duration);if(end-start>31*DAY)throw Error('Service timeline supports 31-day windows; use the chronological service worker for longer orders.');
  // A launch record reads the accepted early checkpoints without changing the visitor’s focused analysis window.
  if(!flightRecord)focusWindow(start);
  const segments=[];for(let n=Math.floor(start/DAY);n*DAY<end;n++){const states=day(n).states;
   for(let i=1;i<states.length;i++){const a=states[i-1],z=states[i],left=Math.max(start,a.t),right=Math.min(end,z.t);if(right<=left||hardwareStopped(a.t,a))continue;const dt=z.t-a.t,t=a.t+dt/2,b=channels(a,t,geo(t,a),dt),seg=serviceSegment(left,right,b),fraction=(right-left)/dt;
    for(const key of ['aiInputUploadedGB','aiInputConsumedGB','aiProductGeneratedGB','aiProductDeliveredGB'])seg[key]*=fraction;
    if(flightRecord)Object.assign(seg,{terminalActivity:clipTransfers(stepTransfers(b,dt),right-left),
     payloadTerminal:b.commission&&b.directSelected?b.link.groundLink:null,attitudeMode:b.f.attitudeMode,orbitLost:b.g.orbitLost,commandReceivedGB:b.uploaded*fraction,
     directPayloadLock:!!b.directPayloadLock,directDeliveredGB:b.g.station&&!b.relayOn?b.delivered*fraction:0,relayDeliveredGB:b.relayOn?b.delivered*fraction:0});
    segments.push(seg);yield right;}
  }return segments;
 }
 function serviceTimeline(start=0,span=DAY,{flightRecord=false}={}){const cached=serviceCache.get(start+'|'+span+'|'+flightRecord);return cached?cached.map(row=>({...row})):finishSteps(serviceSteps(start,span,{flightRecord}));}
 const preparationDesign=JSON.stringify(d);
 const preparationMaps={mainDays,early,blocks,focused,chapters,eventCache,runCache,summaryCache,windowCache,missionCache,serviceCache,thermalCache};
 const preparationCancelled=()=>new DOMException('Decommissioning preparation cancelled','AbortError');
 const preparationOptions=({start,instant,scope='day',closeout=true}={})=>({start:clip(Number.isFinite(start)?start:closeout?Math.floor(ignition/DAY)*DAY:0,0,Math.max(0,duration-DAY)),instant:clip(Number.isFinite(instant)?instant:closeout?ignition:0,0,duration),scope:['day','now','mission'].includes(scope)?scope:'day',closeout});
 const preparationKey=options=>JSON.stringify([options.start,options.instant,options.scope,options.closeout,!!audited]);
 function preparationSnapshot(options){
  let auditBasis=null;
  if(audited){
   // Send only checkpoints needed by this view, not the full mission ledger.
   const wanted=new Set(mainDays.keys());
   for(let n=Math.max(0,terminalDay-1);n<=Math.floor(duration/DAY);n++)wanted.add(n);
   for(const t of [options.start,options.start+DAY,options.instant]){const n=Math.floor(t/DAY);wanted.add(n);wanted.add(n+1);}
   if(options.scope==='mission')for(let i=0;i<48;i++)wanted.add(Math.floor(duration*i/47/DAY));
   const seeds=new Array(audited.seeds.length),dayStats=new Array(audited.dayStats.length);
   for(const n of wanted){if(audited.seeds[n])seeds[n]=audited.seeds[n];if(audited.dayStats[n])dayStats[n]=audited.dayStats[n];}
   auditBasis={seeds,dayStats,result:{}};
  }
  return {schema:'odc-prepared-model/1',design:preparationDesign,chronological:!!audited,auditBasis,focusDay,preparedCloseout,maps:Object.fromEntries(Object.entries(preparationMaps).map(([name,map])=>[name,[...map]]))};
 }
 function adoptPreparation(snapshot,workingCopy=false){
  if(snapshot?.schema!=='odc-prepared-model/1'||snapshot.design!==preparationDesign)throw Error('Prepared decommissioning data belongs to a different design.');
  if(workingCopy)audited=snapshot.auditBasis;
  if(snapshot.chronological!==!!audited)throw Error('Prepared decommissioning data uses an outdated mission basis.');
  for(const name of Object.keys(preparationMaps))if(!Array.isArray(snapshot.maps?.[name]))throw Error('Prepared decommissioning data is incomplete.');
  for(const [name,map] of Object.entries(preparationMaps)){map.clear();for(const [key,value] of snapshot.maps[name])map.set(key,value);}
  focusDay=snapshot.focusDay;preparedCloseout=snapshot.preparedCloseout||'';
 }
 function adoptAudit(data){
  audited={seeds:data.seeds,dayStats:data.dayStats,result:data.result};auditGeneration++;
  chapters.clear();focused.clear();mainDays.clear();eventCache.clear();runCache.clear();clearWindowCaches();focusDay=-1;
 }
 function preparationContext({signal,onProgress=()=>{},pause=()=>new Promise(resolve=>setTimeout(resolve,0))}={}){
  let slice=performance.now(),lastReport=-Infinity;
  const check=()=>{if(signal?.aborted)throw preparationCancelled();};
  const report=(value,force=false)=>{check();const now=performance.now();if(force||now-lastReport>=200){lastReport=now;onProgress(value);}};
  async function cooperate(){check();if(performance.now()-slice>=12){await pause();check();slice=performance.now();}}
  async function drain(iterator,progress){let step;do{check();step=iterator.next();if(!step.done){if(progress)report(progress(step.value));await cooperate();}}while(!step.done);return step.value;}
  return {check,report,cooperate,drain,phase:'disposal'};
 }
 async function prepareDay(seed,options,context,progress){
  context.report(progress,true);const span=options?.span??DAY;
  return context.drain(daySteps(seed,options),t=>({...progress,completed:(progress.completed||0)+clip((t-seed.t)/span,0,1)}));
 }
 async function earlySeedPrepared(n,context){
  if(!early.has(n)){
   const prev=await earlySeedPrepared(n-1,context);
   const result=mainDays.get(n-1)||await prepareDay(prev,{record:false},context,{stage:'history',detail:'Integrating mission history · day '+n+' of '+Math.min(earlyDays,terminalDay),completed:n-1,total:Math.min(earlyDays,terminalDay)});
   early.set(n,result.end);
  }
  return {...early.get(n)};
 }
 async function blockPrepared(i,context){
  if(blocks.has(i))return blocks.get(i);
  const prev=i===0?null:await blockPrepared(i-1,context),seed=prev?project(prev.seed,prev.rep,sampleBlock):await earlySeedPrepared(earlyDays,context);
  const rep=await prepareDay(seed,{step:180,record:false},context,{stage:'seasonal',detail:'Propagating seasonal inventory · block '+(i+1),completed:i,total:Math.max(i+1,Math.floor(Math.max(0,terminalDay-earlyDays)/sampleBlock)+1)});
  const result={seed,rep};blocks.set(i,result);return result;
 }
 async function seedPrepared(n,context){
  context.check();if(audited?.seeds[n])return audited.seeds[n];
  if(n>terminalDay||n===terminalDay&&n>=earlyDays)return (await dayPrepared(n-1,context,true)).end;
  if(n<earlyDays)return earlySeedPrepared(n,context);
  const age=n-earlyDays,b=await blockPrepared(Math.floor(age/sampleBlock),context);return project(b.seed,b.rep,age%sampleBlock);
 }
 async function dayPrepared(n,context,canonical=false){
  context.check();n=Math.max(0,Math.floor(n));if(!canonical&&focused.has(n))return focused.get(n);if(mainDays.has(n))return mainDays.get(n);
  const seed=await seedPrepared(n,context),result=await prepareDay(seed,undefined,context,{stage:context.phase,detail:context.phase==='disposal'?'Resolving the disposal trajectory and spacecraft state.':'Resolving the selected flight window.',completed:0,total:1});
  return rememberDay(n,result);
 }
 async function statePrepared(t,context){
  context.check();t=Math.min(duration,Number(t)||0);if(t<0)return {...first,t:Math.max(-3600,t)};
  const n=Math.floor(t/DAY);
  if(t===n*DAY&&!focused.has(n)&&!mainDays.has(n)){const seed={...await seedPrepared(n,context)};boundary(seed);return seed;}
  const record=await dayPrepared(n,context);let l=0,u=record.states.length-1;
  while(l<u){const m=Math.ceil((l+u)/2);if(record.states[m].t<=t)l=m;else u=m-1;}
  const a=record.states[l],b=record.states[l+1];if(t<=a.t||!b)return advance(a,t);
  const state=advance(a,t);state.attitudeAnchor=a.attitudeState;return state;
 }
 async function focusPrepared(start,context){
  const n=Math.max(0,Math.floor(start/DAY));if(audited||n===focusDay)return;
  focusDay=n;focused.clear();eventCache.clear();runCache.clear();clearWindowCaches();if(n<earlyDays-1||n>=terminalDay-1)return;
  const previous=await dayPrepared(n-1,context,true),progress={stage:'window',detail:'Preparing a continuous analysis window.',completed:0,total:1};
  const current=await prepareDay(previous.end,undefined,context,progress);focused.set(n,current);focused.set(n+1,await prepareDay(current.end,undefined,context,progress));
 }
 async function prepareWindowReads(start,span,count,context){
  const end=Math.min(duration,start+span);await statePrepared(start,context);
  // Record each displayed day before requesting its ending checkpoint. At an
  // exact midnight boundary, requesting the endpoint first would integrate the
  // same day without records, then integrate it again for the visible window.
  for(let n=Math.floor(start/DAY);n*DAY<end;n++)await dayPrepared(n,context);
  await statePrepared(end,context);
  const rows=[];for(let i=0;i<count;i++){context.check();rows.push(at(start+span*i/(count-1)));await context.cooperate();}
  windowCache.set(start+'|'+span+'|'+count,rows);
 }
 // Worker entry point and the cooperative fallback share one preparation path.
 // A working copy is populated first; the live model changes only on success.
 async function prepareDisposalSnapshot(request={},callbacks={}){
  const options=preparationOptions(request),context=preparationContext(callbacks);
  if(request.cache)adoptPreparation(request.cache,true);
  if(request.audit)adoptAudit(request.audit);
  context.report({stage:'history',detail:audited?'Loading chronological mission checkpoints.':options.closeout?'Preparing the preceding mission inventory.':'Preparing the selected mission window.'},true);
  if(options.closeout){
   let plan=(await statePrepared(Math.min(duration,ignition+.001),context)).plan;
   if(plan?.burns.length>1)plan=(await statePrepared(Math.min(duration,plan.burns.at(-1).start+.001),context)).plan;
   story('deorbit');
  }
  context.phase='window';await focusPrepared(options.start,context);
  const span=Math.min(DAY,duration-options.start);
  await prepareWindowReads(options.start,span,145,context);
  context.report({stage:'window',detail:'Preparing the power, thermal and data results for this window.'},true);
  summaryCache.set(options.start,await context.drain(summarySteps(options.start)));
  events(options.start,span);
  serviceCache.set(options.start+'|'+span+'|false',await context.drain(serviceSteps(options.start,span)));
  thermalCache.set(options.start+'|'+span,await context.drain(thermalSteps(options.start,span)));
  if(options.scope==='now'){
   const start=clip(Math.floor(options.instant/1800)*1800-900,0,Math.max(0,duration-3600)),end=Math.min(duration,start+3600);
   await prepareWindowReads(start,end-start,91,context);
  }else if(options.scope==='mission'){
   const closeoutDays=[...mainDays],rows=[];
   for(let i=0;i<48;i++){
    const t=duration*i/47,n=Math.floor(t/DAY);await statePrepared(t,context);
    if(!audited?.dayStats[Math.min(n,audited.dayStats.length-1)])await dayPrepared(n,context);
    rows.push(missionRow(t));await context.cooperate();
   }
   missionCache.set(48,rows);mainDays.clear();for(const [n,value] of closeoutDays)mainDays.set(n,value);
  }
  await statePrepared(options.instant,context);context.check();preparedCloseout=preparationKey(options);
  context.report({stage:'window',detail:options.closeout?'Decommissioning view prepared.':'Mission window prepared.'},true);
  return preparationSnapshot(options);
 }
 function prepareDisposal(request={}){
  const {signal,onProgress=()=>{}}=request,options=preparationOptions(request);closeoutOptions=options;
  if(signal?.aborted)return Promise.reject(preparationCancelled());
  if(preparedCloseout===preparationKey(options))return Promise.resolve({start:options.start,chronological:!!audited});
  const generation=auditGeneration,task={...options,design:d,cache:preparationSnapshot(options)};
  return new Promise((resolve,reject)=>{
   let worker=null,started=false,settled=false,fallback=false;
   const closeWorker=()=>{if(worker){worker.onmessage=worker.onerror=worker.onmessageerror=null;worker.terminate();worker=null;}};
   function finish(error,result){
    if(settled)return;settled=true;closeWorker();signal?.removeEventListener('abort',abort);
    if(error){reject(error);return;}
    if(generation!==auditGeneration){resolve(prepareDisposal(request));return;}
    try{adoptPreparation(result);resolve({start:options.start,chronological:!!audited});}catch(error){reject(error);}
   }
   function abort(){finish(preparationCancelled());}
   function localFallback(){
    if(settled||fallback)return;fallback=true;closeWorker();
    let copy;try{copy=structuredClone(task);}catch(error){finish(error);return;}
    createSimulation(copy.design).prepareDisposalSnapshot(copy,{signal,onProgress}).then(result=>finish(null,result),error=>finish(error));
   }
   signal?.addEventListener('abort',abort,{once:true});
   if(typeof Worker!=='function'){localFallback();return;}
   try{worker=new Worker(new URL('./model-preview-worker.js',import.meta.url),{type:'module'});}catch{localFallback();return;}
   worker.onmessage=({data})=>{
    if(settled||fallback)return;
    try{
     if(data.ready){if(!started){started=true;worker.postMessage(task);}return;}
     if(data.progress){onProgress(data.progress);return;}
     if(data.error){const error=new Error(data.error.message||data.error);if(data.error.name)error.name=data.error.name;finish(error);return;}
     if(data.result)finish(null,data.result);
    }catch(error){finish(error);}
   };
   worker.onerror=event=>{event.preventDefault?.();if(!started)localFallback();else finish(new Error(event.message||'Decommissioning preparation failed.'));};
   worker.onmessageerror=()=>finish(new Error('The decommissioning result could not be read.'));
  });
 }
 function auditStep(seed=first,span=DAY){const r=makeDay(seed,{record:false,span,qualification:true}), counts={};for(const e of r.events){let key=e.type+'Count';counts[key]=(counts[key]||0)+1;}
  const edges=r.events.filter(e=>e.start===seed.t||e.end===r.end.t).map(({type,label,start,end})=>({type,label,start,end}));return {end:r.end,stats:{...r.stats,counts,edges},state:read(r.end)};}
 function runAudit(onProgress=()=>{}, {signal}={}){if(audited)return Promise.resolve(audited.result);return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./mission-worker.js',import.meta.url),{type:'module'});
  const close=()=>{worker.terminate();signal?.removeEventListener('abort',cancel);},cancel=()=>{close();reject(new DOMException('Chronological audit cancelled','AbortError'));};if(signal?.aborted)return cancel();signal?.addEventListener('abort',cancel,{once:true});
  worker.onerror=e=>{close();reject(Error(e.message||'Mission integration failed'));};worker.onmessage=({data})=>{
   if(data.error){close();reject(Error(data.error));return;}
   if(data.progress){onProgress(data.progress);return;}
   if(data.auditReady){worker.postMessage({prepare:closeoutOptions||preparationOptions()});return;}
   if(data.preparing){const totalDays=Math.ceil(duration/DAY);onProgress({days:totalDays,totalDays,preparing:data.preparing.detail});return;}
   close();try{adoptAudit(data);if(data.preparation)adoptPreparation(data.preparation);resolve(data.result);}catch(error){reject(error);}
  };worker.postMessage(d);
 });}
 const api={hardware:h,electricalMassRevision:h.electricalMassRevision||0,serviceSeed:t=>{const seed=structuredClone(stateAt(clip(Number(t)||0,0,duration)));if(seed.attitudeAnchor){seed.attitudeState=flightGuidance(seed,seed.t,geo(seed.t,seed)).attitudeState;delete seed.attitudeAnchor;}return seed;},serviceDay,serviceTimeline,terminalRuns:terminalWindow,thermalWindow,story,disposal,ignition,focusWindow,duration,at,window,events,mission,daySummary,modelNotes,auditStep,runAudit,prepareDisposal,prepareWindow:request=>prepareDisposal({...request,closeout:false}),prepareDisposalSnapshot,get audit(){return audited?.result||null;}};cache.set(design,api);cachedTakeoffs.set(design,design.installedHarnessTakeoff);return api;
}
