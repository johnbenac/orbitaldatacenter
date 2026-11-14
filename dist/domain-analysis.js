// All quantities originate in the installed design, sizing envelope or time-resolved model.
import {propulsionReview} from './spacecraft-architecture.js';
import {aiPurposes} from './ai-purpose.js';
import {purposeId,purposeInfo} from './purpose-display.js';
import {payloadDataStage} from './payload-data-handling.js';
import {sizingEnvelope,ageProperties,sizingLabel} from './design.js';
import {launchFleet} from './launch-fleet.js';
import {launchReferenceFor,launchSiteFor} from './launch-sites.js';
import {launchPath} from './launch-path.js';
import {groundSites} from './orbit.js';

const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const list=s=>s.split(' ').filter(Boolean);
const phases=['A','B','C','D','E','F'];
function spec(label,icon,summary,inputs,tradeKeys,curves,entries,eventTypes){
 const stages=Object.fromEntries(entries.map(([title,description,keys],i)=>[phases[i],{title,description,keys:list(keys)}]));
 return {label,icon,summary,inputs:list(inputs),tradeKeys:list(tradeKeys),curves:list(curves),phaseTitles:Object.fromEntries(phases.map(p=>[p,stages[p].title])),stages,eventTypes:list(eventTypes)};
}
export const domains={
 conops:spec('Mission CONOPS','orbit','Mission objectives, operating schedule and delivered service.',
  'missionYears duty serviceRoute disposalMethod','duty missionYears trayCount','aiUnitRate loadKW',[
  ['Customer mission requirements','Define the Earth customer, useful product, service target, activity schedule and closing condition.','aiPurpose aiGoal requiredWorkRate duty lifetime'],
  ['Mission operating sequence','Connect the customer’s input, scheduled compute and flight-to-ground product handover.','aiPurpose aiDeliverable orbitMinutes periodOn nSites servicePath'],
  ['Mission value and resource limits','Compare useful work for the selected mission against memory, energy, contact capacity and launch allowance.','aiPurpose activeWorkRate requiredWorkRate aiMemoryMargin meanBus launchMargin'],
  ['Service commissioning','Follow input availability, processor power and commissioning before admitting customer work.','aiPurpose phase deploymentPct aiInputBufferGB itKW'],
  ['Customer work and receipt','Trace the selected customer workload through onboard processing to the Earth endpoint.','aiPurpose aiUnitRate aiProductQueueGB aiProductDeliveredGB station'],
  ['Customer service closeout','Reconcile the intended customer deliverable and received product with shutdown and disposal.','aiPurpose aiDeliverable aiUnitsComputed aiProductDeliveredGB disposalStatus closureReason']
 ],'launch insertion deployment burst contact reboost desat maneuver disposal coast impact entry graveyard'),
 environment:spec('Environment','sun','External forcing, spacecraft-induced loads and receiving subsystems.',
  'solarDriver solarCyclePhase f107Floor f107Ceiling ap altitudeKm attitude solarTiltDeg entryBallisticKgM2','solarTiltDeg ap solarCyclePhase altitudeKm','densityKgM3 absorbedKW',[
  ['Environmental assumptions','Choose the thermospheric driver and the attitude that sets intercepted flux and atmospheric cross-section.','solarDriver ap betaDeg solarTilt'],
  ['Sources and receiving surfaces','Separate external irradiation, atmospheric drag and magnetic forcing from onboard electrical and thermal loads.','sunFlux albedoFlux earthIR densityKgM3 magFieldUT'],
  ['Environmental coupling','Wing incidence changes power and heating while the ram silhouette drives torque and annual reboost. Compare the same orbit and mission instant.','solarKW absorbedKW dragN torqueNm annualImpulse annualProp'],
  ['Ascent exposure','The launch enclosure sets the spacecraft thermal boundary until insertion. Orbital flux and drag apply after exposure.','phase launchBoundary enclosureOuterK ramAreaM2 dragN'],
  ['Sun, atmosphere and spacecraft','Read the instantaneous environmental fluxes alongside the onboard loads and surfaces receiving them.','betaDeg shadowMin f107Daily densityKgM3 absorbedKW packLossKW'],
  ['Terminal environment','Inspect the evolving orbit and the boundary between the spacecraft model and a propagated reference body.','disposalMode altitudeKm perigeeKm densityKgM3 relSpeed dragN']
 ],'launch insertion eclipse deployment burst contact desat reboost disposal coast entry impact graveyard'),
 orbit:spec('Flight Dynamics','orbit','Orbit geometry, shadow access, insertion and transfer trajectories.',
  'altitudeKm ecc inclinationDeg raanDeg argPeriDeg meanAnomalyDeg trimDv','altitudeKm inclinationDeg raanDeg ecc','altitudeKm betaDeg',[
  ['Orbit at epoch','Set the six elements and verify the resulting apsides, inclination and period.','targetAlt ecc inclination raan argPeri meanAnomaly'],
  ['Flight dynamics design','Assess the orbit, maintenance and disposal allocations, then inspect eclipse geometry and the modeled flight path.','orbitMinutes perigeeKm apogeeKm betaDeg shadowMin'],
  ['Orbit maintenance balance','Compare illumination and station access with drag impulse and propellant demand.','orbitMinutes shadowMin accessPct annualImpulse annualProp supplyYears'],
  ['Insertion state','Compare insertion geometry and accumulated trim against the operating orbit.','targetAlt altitudeKm perigeeKm apogeeKm reqTrim trimPaidDv'],
  ['Propagation and eclipses','Use actual eclipse intervals, illumination and cumulative impulse at the selected age.','orbitNumber perigeeKm apogeeKm betaDeg shadowMin dragImpulseNs'],
  ['Terminal trajectory','Read the target and achieved apsides, paid delta-v and the terminal event.','disposalMode disposalStatus finalPerigee finalApogee disposalPaidDv endpointMET']
 ],'launch insertion trim eclipse reboost maneuver disposal coast entry impact graveyard'),
 compute:spec('Payload Operations','cpu','Customer workloads, accelerator capacity, storage and useful results received on Earth.',
  'compute workload trayCount bits context batch latencyTargetS storageTB','trayCount batch context duty','tokensPerSec junctionK',[
  ['Payload workload and acceptance','Choose the work to run on this data center and define the product, latency and capacity it requires.','aiPurpose aiDeliverable chips sessions modelGB kvGB memoryGB reqTps'],
  ['Payload execution design','Connect the selected workload to accelerator memory, hosts, fabric, recorder and Earth delivery.','aiPurpose trays memoryGB usefulTF rawStorage diskRead diskWrite'],
  ['Useful payload performance','Compare delivered work and customer acceptance with installed compute, memory, storage, power and thermal headroom.','dutyTps serviceMargin usefulTF ttf latencyMargin tokenEfficiency'],
  ['Payload checkout','Compare installed memory and trays with their supply and survival temperatures before service.','trays memoryGB itKW junctionK coolantK'],
  ['Payload work and Earth receipt','Follow input staging, estimated execution, recorder occupancy and useful output received by the customer.','aiPurpose burst tokensPerSec prefillPerSec perUserTps junctionK freeTB'],
  ['Payload closeout','Reconcile completed work, delivered products and retained recorder contents before shutdown.','itKW tokensPerSec tokensGenerated tokensDelivered occupiedTB freeTB']
 ],'launch deployment burst eclipse contact disposal'),
 data:spec('Payload Data Handling','database','Customer input staging, payload fabric, model and checkpoint storage, product queues and Earth receipt.',
  'aiPurpose initialInputGB inputSpoolGB serviceRoute bytesPerToken bulkMbps initialQueueGB retainedGB diskReserve codingEff contactFraction storageTB','bulkMbps initialInputGB storageTB contactFraction','aiProductQueueGB aiProductDeliveredGB',[
  ['Data products','Define customer inputs, resident model state, local recovery checkpoints and the returned deliverable for the selected workload.','aiPurpose aiDeliverable aiInputBytes aiOutputBytes aiRequiredStorage'],
  ['Data custody','Follow input staging, payload-fabric exchange, local storage and the product recorder to Earth receipt.','aiInputBufferGB aiProductQueueGB aiProductDeliveredGB diskRead diskWrite'],
  ['End-to-end data budget','Compare workload storage, input and output throughput, contact capacity and independently tracked supplemental transfers.','aiRequiredStorage aiStorageMargin requiredGoodput accessGoodput aiMemoryMargin'],
  ['Initial recorder contents','Inventory the preloaded inputs, persistent execution state and allocated storage before powered payload checkout.','phase aiInputBufferGB aiProductGeneratedGB aiProductDeliveredGB storageKW'],
  ['Delivery accounting','Reconcile admitted input, generated customer products, queued records and confirmed Earth receipt.','aiInputConsumedGB aiProductGeneratedGB aiProductQueueGB aiProductDeliveredGB goodputMbps'],
  ['Residual data disposition','Retain delivered product identity and identify unrecovered records and local checkpoints at closeout.','aiInputConsumedGB aiProductGeneratedGB aiProductQueueGB aiProductDeliveredGB disposalStatus']
 ],'burst contact disposal coast entry impact graveyard'),
 comm:spec('Communications','radio','Command uplink and payload downlink budgets, access and acquisition.',
  'communicationsPackage network link kaDishM opticalApertureM elevationDeg codingEff linkCapMbps opticalJitterUrad','elevationDeg kaDishM opticalApertureM codingEff','goodputMbps lineMbps',[
  ['Link requirements','Select payload and command endpoints, elevation mask, terminal hardware and application overhead.','communicationsPackage nSites linkPolicy dishDiameter optAperture elevationMask codingPct'],
  ['Uplink and downlink architecture','The two directions have separate budgets and independent ground queues.','uplinkMbps commandGoodputKbps lineMbps goodputMbps terminalKW'],
  ['Access and throughput','Relate the entered access fraction and physical budget to actual selected-day service and data margin.','accessPct contactMin requiredGoodput accessGoodput linkMargin dailyDownGB'],
  ['Acquisition readiness','Check the installed ground network, antenna geometry and acquisition time.','linkPolicy nSites acquisitionSec station elevationDeg'],
  ['Active ground terminal','Acquisition connects the spacecraft beam to the actual receiving terminal.','station groundLink rangeKm lineMbps goodputMbps commandGoodputKbps'],
  ['Last payload handoff','Read the terminal link state and separate received payload bytes from pending ground commands.','station terminalKW deliveredGB uploadedGB uplinkQueueMB queueGB']
 ],'deployment contact disposal coast impact graveyard'),
 power:spec('Electrical Power','battery-charging','Array production, itemized demand and continuous charge balance.',
  'powerArchitecture battery pv solarM2 solarWingAspect batteryKWh socMin socMax targetSOC chargeC dischargeC','solarM2 batteryKWh solarTiltDeg duty','solarKW socPct',[
  ['Power subsystem requirements','Select installed sources and storage, the reserve floor and pack charge/discharge limits.','arrayArea solarWingAspect packSize chargeLimit dischargeLimit floorPct targetPct'],
  ['Bus distribution','Compare requested and served demand, including finite heaters and downstream electrical losses.','solarKW loadKW servedLoadKW unmetKW heaterKW thermalControlKW epsConversionLossKW harnessLossKW'],
  ['Generation and storage margins','Compare the end-of-service generation and pack requirements against installed hardware.','meanBus solarRequired arrayMargin batteryNeeded packMargin eolCapacity'],
  ['Launch power boundary','Track initial pack charge, stowed generation and commissioning demand.','initialEnergy batteryKWh socPct deploymentPct solarKW loadKW'],
  ['Bus state and stored energy','Check daily floor, stored energy, charge direction and any unserved demand.','socPct batteryKWh solarKW servedLoadKW dailyFloor unmetKWh'],
  ['Terminal energy','Review power drawdown and the energy inventory during shutdown, transfer and passivation.','phase solarKW servedLoadKW batteryKWh socPct unmetKWh']
 ],'deployment eclipse burst contact desat reboost disposal coast entry impact graveyard'),
 thermal:spec('Thermal Control','thermometer-sun','Heat production, enclosure leakage, rejection and component temperature limits.',
  'thermalMode radiatorM2 radiatorPanelsPerBank coating appliedHeatKw thermalResistanceKPerKw radiatorDesignK junctionLimitK initialBatteryK','radiatorM2 emissivity appliedHeatKw thermalResistanceKPerKw','junctionK thermalMinimumMarginK',[
  ['Thermal boundary conditions','Set heat sources, transport resistance, rejection surfaces and operating limits. Extra radiator folds are a study allocation requiring deployment, plumbing and structural evidence.','radiatorArea radiatorPanelsPerBank heatMode resistance targetRadiator maxJunction initialPackK'],
  ['Temperature and heat transport','Track the battery, equipment loop and radiator stores, with finite heaters and controlled loop exchange.','batteryK loopK radiatorK heatInputKW loopToRadiatorKW heaterKW loopBypassFraction thermalMinimumMarginK'],
  ['Integrated thermal balance','Compare installed radiator area, design transport rise, estimated junction temperature and time-resolved margin to the carried temperature ratings.','radRequired radMargin transportRise designJunction thermalMinimumMarginK eolEmissivity'],
  ['Encapsulated thermal state','The launch thermal boundary applies before orbital environmental exchange begins.','launchBoundary enclosureOuterK batteryK coldPlateK junctionK thermalMinimumMarginK'],
  ['Operating temperatures','Follow junction and fluid temperatures through the loop to the radiator, with a separate battery store.','junctionK coolantSupplyK coolantReturnK loopK radiatorK batteryK packToLoopKW thermalMinimumMarginK'],
  ['Closeout thermal boundary','Review hardware survival temperatures until the modeled spacecraft thermal interval ends.','disposalStatus enclosureOuterK coolantK batteryK thermalMinimumMarginK modelBoundary']
 ],'launch deployment burst eclipse contact disposal coast entry impact graveyard'),
 attitude:spec('Attitude Determination & Control','crosshair','Disturbances, pointing, reaction momentum and magnetic unloading.',
  'attitude rollDeg pitchDeg yawDeg cpOffsetM cmgMomentumNms cmgTorqueNm dipoleAm2','attitude solarTiltDeg rollDeg cpOffsetM dipoleAm2 cmgMomentumNms','solarKW netRejectionKW',[
  ['Attitude requirements','Choose the attitude law, pressure-center lever arm, torque capacity and unloading authority.','attitudeLaw cpOffset cmgCapacity cmgRating dipole'],
  ['Momentum management','Trace external torques into the four-CMG cluster and the commanded external unload.','dragTorqueNm solarTorqueNm gravityTorqueNm momentumNms unloadAuthorityNm'],
  ['Pointing versus drag','Compare the selected orientation with projected ram area, torque authority, pointing and electrical demand.','attitudeModeLabel bodyRateDegS attitudeSlewErrorDeg ramAreaM2 dragTorqueNm cmgTorqueMarginNm cmgMarginNms pointingErrorDeg cmgKW'],
  ['Attitude commissioning','Inspect deployment fraction, joint power, cluster state and external disturbances.','deploymentPct jointKW cmgKW torqueNm cmgMarginNms'],
  ['Pointing and unloading','Track slews, stored momentum and the available external magnetic torque.','attitudeModeLabel bodyRateDegS attitudeSlewErrorDeg slewTorqueNm momentumNms cmgMarginNms magFieldUT unloadTorqueNm coilKW'],
  ['Transfer attitude loads','Inspect stored momentum and actuator power up to the spacecraft simulation boundary.','disposalStatus deploymentPct momentumNms cmgKW coilKW modelBoundary']
 ],'deployment contact desat maneuver reboost disposal coast entry graveyard'),
 prop:spec('Propulsion','fuel','Chemical feed system, station keeping and retirement reserve.',
  'engine propellantKg yearsSupply isp thrustN mixtureRatio reserveFraction disposalMethod disposalDv graveyardAltitudeKm targetLatDeg targetLonDeg targetToleranceKm','propellantKg isp yearsSupply reserveFraction','propellantKg remainingDv',[
  ['Propulsion allocations','Choose an engine package and separate the maneuver, station-keeping and disposal allowances.','propLoad reqTrim maneuverDv yearsSupply disposalFloor mixture'],
  ['Propellant inventory','Reconcile separate liquid masses, pressurant inventory, installed thrust and protected propellant.','fuelKg oxidizerKg pressurant tankVolume thrust reserveKg'],
  ['Fuel and impulse budget','Compare moderate-density annual drag and trim demand against usable stock and end-of-life reserves.','annualProp propRequired propMargin supplyYears trimBudget disposalBudget'],
  ['Post-separation trim','Track actual trim impulse and propellant against the insertion allocation.','reqTrim trimPaidDv burnImpulseNs propellantUsedKg fuelKg oxidizerKg'],
  ['Station keeping','Separate actual chemical consumption from projected years of station-keeping supply.','dragImpulseNs burnKind burnImpulseNs propellantKg remainingDv disposalProtectedKg'],
  ['Terminal burn ledger','Compare protected and available propellant with the required and delivered disposal impulse.','disposalMode disposalStatus disposalProtectedKg disposalUsedKg disposalRequiredDv disposalPaidDv']
 ],'trim reboost maneuver disposal burn coast entry impact graveyard'),
 mass:spec('Mass budget','chart-no-axes-column-increasing','Additive dry, wet and launched mass with flight inventory and mass margins.',
  'structureMargin shieldKgM2 skinKgM2 blanketKgM2 adapterKg propellantKg launchAllowanceKg','structureMargin propellantKg packWhKg skinKgM2','wetKg propellantKg',[
  ['Mass assumptions','Inspect carried growth and configure shielding, enclosure skin and allowable launch mass. Required margins follow the shared design rules.','dryMarginPct shieldDensity skinDensity blanketDensity adapterMass allowance'],
  ['Hardware allocations','Review the additive mass boundaries from dry frame to launched stack.','dryMass initialWet launchMass pressurant propLoad adapterMass'],
  ['Integrated mass closure','Track launch allowance, dry growth margin and consumable mass as the launcher fit changes.','dryMass dryGrowth initialWet launchMass launchMargin massResidual'],
  ['Manifest and separation','Distinguish launched hardware and adapter from spacecraft wet mass after separation.','launchMass attachedAdapter carriedMass wetKg launchMargin'],
  ['Consumable mass balance','Installed dry hardware and pressurant remain fixed while burns deplete the two liquids.','dryMass pressurant fuelKg oxidizerKg wetKg wetResidual'],
  ['Terminal flight mass','Reconcile the final vehicle mass, protected stock and actual disposal consumption.','dryMass pressurant propellantKg wetKg disposalUsedKg wetResidual']
 ],'launch insertion trim reboost maneuver disposal impact graveyard'),
 launch:spec('Launch & insertion','rocket','Tapered payload keep-in, manifest allowance and achieved injection orbit.',
  'launcher launchSite launchAllowanceKg fairingM fairingLengthM radialPaddingM axialPaddingM adapterKg trimDv','fairingM fairingLengthM launchAllowanceKg radialPaddingM','altitudeKm trimPaidDv',[
  ['Launcher and interface','Select the launcher and enter the mission-specific payload mass and geometry limits.','launcherName padName padLocation padStatus referenceMass allowance profileD profileH reqTrim'],
  ['Stowed geometry','Compare actual hardware sections with the usable profile from the adapter plane forward.','padName stackLength stackDiameter radialClearance axialClearance limitingPart fitBasis'],
  ['Single-launch feasibility','Check lateral and axial clearances independently of mass allowance and insertion trim.','padName padHeading padPlaneGap padPositionGap launchMass launchMargin radialClearance axialClearance trimBudget requiredOrbit'],
  ['Integration and injection','Follow the payload from stowed fit through separation and insertion trim.','phase padName padLocation padHeading padPlaneGap stackLength radialClearance launchMass altitudeKm trimPaidDv'],
  ['Achieved operating orbit','Use the delivered state to compare the specified operating orbit and the post-injection mass.','targetAlt perigeeKm apogeeKm padName trimPaidDv wetKg launchMargin'],
  ['Mission delivery and terminal orbit','Compare original insertion parameters with the selected retirement trajectory.','targetAlt reqTrim trimPaidDv padName disposalMode finalPerigee finalApogee']
 ],'integration pad launch insertion trim deployment disposal coast entry impact graveyard'),
 launcher:spec('Launch vehicle','rocket','Compare carrier architectures, provider-rated payloads, and the spacecraft mass each option can accept.',
  'launcher launchSite launchAllowanceKg fairingM fairingLengthM radialPaddingM axialPaddingM adapterKg altitudeKm inclinationDeg','launcher launchAllowanceKg fairingM fairingLengthM','lvBenchmarkMargin lvScreenMargin',[
  ['Choose the launch service','Select a flight-proven carrier or a development concept and compare its LEO reference with the mission allowance.','launcherName padName padStatus lvStatus referenceMass lvReferenceOrbit allowance'],
  ['Carrier configuration','Inspect the core, strap-on propulsion and upper-stage arrangement that deliver the spacecraft.','launcherName padName padLocation padStatus lvStages lvBoosters lvRecovery lvArchitecture fitBasis'],
  ['Launcher trade and manifest','Evaluate the same folded spacecraft against both mass screens and the selected fairing profile.','padName referenceMass allowance launchMass lvBenchmarkMargin launchMargin lvScreenMargin radialClearance axialClearance'],
  ['Ascent and payload release','The launch vehicle carries the adapter and spacecraft through ascent. The spacecraft performs its own trim after separation.','phase launcherName padName padLocation padStatus padHeading lvHandoff attachedAdapter carriedMass altitudeKm'],
  ['Delivered spacecraft record','The original launch manifest stays fixed while the spacecraft consumes propellant in orbit.','launcherName padName launchMass initialWet adapterMass wetKg lvCarrierService'],
  ['Carrier delivery closeout','Reconcile the original selected launch service with the spacecraft mass delivered at release and its recorded retirement outcome.','launcherName padName referenceMass launchMass initialWet adapterMass lvScreenMargin closureReason']
 ],'integration pad launch insertion deployment disposal coast entry impact graveyard'),
 mechanical:spec('Mechanical Design','box','Equipment accommodation, structure, mechanisms, mass properties and atmospheric entry.',
  'trayCount propellantKg batteryKWh solarWingAspect radiatorPanelsPerBank shieldKgM2 skinKgM2','trayCount propellantKg batteryKWh solarWingAspect radiatorPanelsPerBank skinKgM2','wetKg propellantKg',[
  ['Mechanical design drivers','Set installed equipment, wing proportions and radiator folds against the launch envelope. Extra folds are an extrapolated study allocation; they do not extend the structural or deployment qualification basis.','trays solarWingAspect radiatorPanelsPerBank initialWet launchMass'],
  ['Equipment accommodation','Inspect each installed item at its body station and follow its contribution to the mass center.','dryMass initialWet radialClearance axialClearance'],
  ['Integrated mass properties','Compare dry, wet, deployed and adapter-supported configurations using the equipment register.','dryMass initialWet launchMass propellantKg'],
  ['Stack balance and separation','Inspect the launch center of mass from the adapter datum and the stowed payload envelope.','launchMass attachedAdapter carriedMass stackLength radialClearance axialClearance'],
  ['Changing mass distribution','Follow the center of mass as appendages move, liquid is consumed and the adapter separates.','deploymentPct wetKg fuelKg oxidizerKg'],
  ['Mechanical disposition','Inspect retained hardware for a raised orbit or screen individual items for survival during targeted reentry.','disposalMode disposalStatus disposalUsedKg finalPerigee finalApogee']
 ],'launch insertion deployment trim reboost maneuver disposal entry impact graveyard'),
 avionics:spec('Command & Data Handling','panels-top-left','Avionics architecture, electrical interfaces, connector and harness definition, command and telemetry processing, and verification.',
  'commandKbps hkPeriodS hkRecorderMB uplinkBufferMB','hkPeriodS hkRecorderMB commandKbps','hkStoredMB cdhKW',[
  ['Spacecraft command and telemetry requirements','Set the ground command traffic and cadence of spacecraft health measurements.','commandKbps hkPeriodS hkRateKbps hkRecorderMB'],
  ['Avionics and electrical interface design','Inspect box and card diagrams, protected power, signaling, connector pin allocations and routed harness schedules.','cdhKW commandDemandKbps hkRateKbps hkRecorderMB'],
  ['Integrated electrical interfaces','Check route endpoints, mating compatibility, branch voltage drop, signaling capacity and interface evidence on the assembled vehicle.','cdhKW hkRateKbps hkStoredMB uplinkQueueMB'],
  ['Harness and avionics checkout','Verify workmanship, continuity and isolation before powered command, telemetry, time and launch-inhibit tests.','phase cdhKW hkRateKbps hkStoredMB'],
  ['Spacecraft housekeeping','Watch command backlog, ground contact and the housekeeping recorder at the mission instant.','cdhKW commandGoodputKbps uplinkQueueMB hkStoredMB hkOverwrittenMB'],
  ['Avionics closeout','Keep command authority, timing and health telemetry available through the disposal sequence; reconcile final records before shutdown.','disposalStatus cdhKW commandUploadedGB hkStoredMB']
 ],'launch insertion deployment contact disposal entry impact graveyard'),
 software:spec('Flight Software','workflow','Follow the onboard decisions that point the chassis, steer appendages, establish a link and permit a burn.',
  'attitude solarTiltDeg cmgTorqueNm cmgMomentumNms dipoleAm2','attitude solarTiltDeg cmgTorqueNm dipoleAm2','attitudeSlewErrorDeg radiatorDirectSolarKW',[
  ['Define the pointing policy','Choose a nominal pointing law and the actuator authority the onboard controller can use. Scheduled events take precedence over the nominal law.','attitudeLaw cmgRating cmgCapacity dipole'],
  ['Design the closed loop','Trace a motion request from the mode executive to an actuator, then follow the achieved pointing and the permit for the next action.','attitudeModeLabel bodyRateDegS trackingDriveKW terminalState'],
  ['Test competing pointing requests','At the same instant, compare the remaining body error and direct solar heat as the spacecraft follows a changed attitude law.','attitudeModeLabel attitudeSlewErrorDeg bodyRateDegS radiatorDirectSolarKW'],
  ['Release and enable drives','Follow the handover from the carrier through separation, sequential release and enablement of the flight drives.','phase deploymentPct attitudeModeLabel burnPermitState terminalState'],
  ['Observe the onboard controller','Compare the command with achieved motion. Watch a pass, eclipse or slew change which controller has authority.','attitudeModeLabel burnPermitState terminalState trackingDriveKW radiatorDirectSolarKW'],
  ['Retire the control system','Follow pointing authorization through the retirement maneuver and coast to the end of spacecraft control.','disposalStatus attitudeModeLabel burnPermitState terminalState disposalUsedKg']
 ],'launch insertion deployment contact eclipse maneuver trim reboost desat disposal coast entry impact graveyard passivation')
};

// Saved links may still name the former purpose domain. It now belongs to
// Payload Operations; the alias is deliberately absent from navigation lists.
export const canonicalDomainId=id=>id==='purpose'?'compute':id;
export const visibleDomainIds=Object.freeze(Object.keys(domains));
Object.defineProperty(domains,'purpose',{value:domains.compute,enumerable:false});

const serviceFields={
 text:['serviceOffersPerHour','serviceConcurrency','ttftTargetS','targetStreamTps','streamGapTargetS','liveQualityFraction','serviceDeadlineS'],
 voice:['serviceOffersPerHour','voiceFirstAudioTargetS','voiceInterruptionTargetS','voicePlaybackBufferMs','vadEndpointMs','liveQualityFraction','serviceDeadlineS'],
 batch:['serviceOffersPerHour','serviceDeadlineS','batchQualityFraction','serviceConcurrency'],
 agents:['agentFanout','agentMessageKB','agentSerialSteps','serviceConcurrency','serviceOffersPerHour','serviceDeadlineS','agentVerifyFraction','humanSteeringS','toolRttS'],
 finetune:['trainingBudgetDays','artifactReturnHours','validationTarget','trainingCalibration','validationObserved','validationBaseline','baseCompatible'],
 pretrain:['trainingBudgetDays','artifactReturnHours','validationTarget','trainingCalibration','validationObserved','artifactKind','trainingStateBytes']
};
const tradeByPurpose={text:['ttftTargetS','serviceOffersPerHour','trayCount','duty'],voice:['serviceRoute','voiceAudioKbps','serviceConcurrency','trayCount'],batch:['serviceOffersPerHour','serviceDeadlineS','batchInputMB','storageTB'],agents:['agentFanout','agentMessageKB','agentSerialSteps','earthToolFraction','hostCores','serviceDeadlineS'],finetune:['fineTuneTokensM','trainableFraction','fabricGbps','trayCount'],pretrain:['pretrainParamsB','trainingTokensB','fabricGbps','trayCount']};
export function purposeDomainFields(id,input){
 id=canonicalDomainId(id);
 const p=purposeId(input),prof=aiPurposes[p]||aiPurposes.text,meta=domains[id];if(!meta)return [];
 if(id==='conops')return [...new Set([...serviceFields[prof.id],...prof.fields,'serviceRoute',...(input.serviceRoute==='relay'?['relayAvailability','relayRttMs','relayUpMbps','relayDownMbps']:['network','elevationDeg','customerUplinkMbps']),'missionYears','duty','idleComputePolicy','pumpStandbyPolicy','disposalMethod'])];
 if(id==='compute')return [...new Set(['aiPurpose','compute','workload','trayCount','bits','hostCores','fabricGbps',...prof.fields,...serviceFields[prof.id],'duty','storageTB'])];
 if(id==='data')return [...new Set(['inputSpoolGB','initialInputGB','storageTB','customerUplinkMbps','serviceRoute','link',...prof.fields,'retainedGB','diskReserve'])];
 return meta.inputs;
}
export function purposeTradeKeys(id,input){id=canonicalDomainId(id);const p=purposeId(input);
 return (id==='compute'||id==='conops'||id==='data')?tradeByPurpose[p]||tradeByPurpose.text:domains[id]?.tradeKeys||[];}
export function purposeStageDescription(id,phase,h){id=canonicalDomainId(id);const index='ABCDEF'.indexOf(phase);return id==='data'?payloadDataStage(phase,h).description:id==='conops'&&index>=0?purposeInfo(h).phases[index]:domains[id]?.stages[phase]?.description||'';}
const registry={};
function fields(source,defs,note=''){
 for(const [id,label,unit='',key=id] of defs)registry[id]={label,unit,note,read:c=>c[source]?.[key],source};
}
fields('d',[['solarWingAspect','Solar wing length / width','ratio'],['radiatorPanelsPerBank','Radiator panels per bank','panels']], 'Installed geometry allocation; additional radiator folds require separate mechanism, plumbing and structural evidence.');
fields('d',[['commandKbps','Ground command traffic','kbit/s'],['hkPeriodS','Housekeeping sample period','s'],['hkRecorderMB','Housekeeping recorder capacity','MB']]);
fields('s',[['burnPermitState','Engine authorization']]);
fields('s',[['attitudeModeLabel','Active pointing mode'],['bodyRateDegS','Achieved body rate','°/s'],['attitudeSlewErrorDeg','Remaining body slew','°'],['wingPitchDeg','Wing drive angle','°'],['upperRadiatorPitchDeg','Upper radiator drive','°'],['lowerRadiatorPitchDeg','Lower radiator drive','°'],['spaceViewFactor','Radiator view to space',''],['trackingDriveKW','Tracking drive power','kW'],['terminalState','Terminal steering'],['radiatorDirectSolarKW','Absorbed direct Sun','kW'],['radiatorAlbedoKW','Absorbed Earth albedo','kW'],['radiatorEarthIRKW','Absorbed Earth infrared','kW'],['cdhKW','Spacecraft avionics demand','kW'],['hkRateKbps','Housekeeping production','kbit/s'],['hkStoredMB','Retained housekeeping','MB'],['hkOverwrittenMB','Housekeeping overwritten','MB'],['commandUploadedGB','Ground commands received','GB'],['commandDemandKbps','Ground command demand','kbit/s'],
 ['phase','Flight state','','flightPhase'],['disposalStatus','Retirement state'],['entryDynamicPressurePa','Reference-body dynamic pressure','Pa'],['entryReferenceDragMS2','Reference-body drag deceleration','m/s²'],['tokensGenerated','Onboard decode tokens','tok'],['tokensDelivered','Ground-received decode tokens','tok'],['tokensPerSec','Instantaneous aggregate decode','tok/s'],['prefillPerSec','Aggregate prefill','tok/s'],['perUserTps','Decode per active stream','tok/s'],['generatedGB','Payload generated since launch','GB'],['deliveredGB','Payload delivered since launch','GB'],['droppedGB','Payload dropped since launch','GB'],['queueGB','Current payload backlog','GB'],['textQueueGB','Queued output text','GB'],['bulkQueueGB','Queued bulk data','GB'],['textDeliveredGB','Text delivered since launch','GB'],['bulkDeliveredGB','Bulk delivered since launch','GB'],['uploadedGB','Command uplink since launch','GB'],['uplinkQueueMB','Queued ground commands','MB'],['occupiedTB','Occupied persistent storage','TB'],['freeTB','Free persistent storage','TB'],
 ['itKW','IT power','kW'],['solarKW','Solar supply at bus','kW'],['loadKW','Requested bus demand','kW'],['servedLoadKW','Served bus demand','kW'],['unmetKW','Unserved demand','kW'],['unmetKWh','Cumulative unserved energy','kWh'],['curtailedKW','Curtailed power','kW'],['chargeKW','Pack charging at bus','kW'],['dischargeKW','Pack discharging at bus','kW'],['socPct','Current pack SOC','%'],['batteryKWh','Stored battery energy','kWh'],['terminalKW','Requested terminal power','kW'],['jointKW','Requested joint power','kW'],['coilKW','Requested coil power','kW'],['cmgKW','Requested CMG power','kW'],['pumpKW','Served pump draw','kW'],['heaterKW','Served heater draw','kW'],['thermalControlKW','Served thermal control','kW'],['epsConversionLossKW','Load conversion loss','kW'],['harnessLossKW','Bus load harness loss','kW'],['powerServiceFraction','Flight service admitted','fraction'],['solarConversionLossKW','Upstream solar conversion loss','kW'],['solarHarnessLossKW','Upstream solar harness loss','kW'],['heatInputKW','Heat entering equipment loop','kW'],['packLossKW','Battery transfer heat','kW'],['packToLoopKW','Pack-to-loop exchange','kW'],['netRejectionKW','Net radiator heat rejection','kW'],['grossEmissionKW','Gross radiator emission','kW'],['absorbedKW','Radiator environmental absorption','kW'],['enclosureLeakKW','Outward enclosure heat','kW'],
 ['thermalMinimumMarginK','Tightest live thermal limit','K'],['junctionK','Junction temperature','K'],['batteryK','Battery temperature','K'],['coldPlateK','Cold plate temperature','K'],['coolantK','Coolant return temperature','K'],['loopK','Equipment loop store','K'],['radiatorK','Radiator store','K'],['coolantSupplyK','Coolant supply','K'],['coolantReturnK','Coolant return','K'],['loopToRadiatorKW','Loop-to-radiator heat','kW'],['loopBypassFraction','Radiator bypass','fraction'],['batteryHeaterKW','Battery heater','kW'],['loopHeaterKW','Loop heater','kW'],['radiatorHeaterKW','Radiator heater','kW'],['thermalResidualKW','Thermal balance residual','kW'],['enclosureOuterK','Outer boundary temperature','K'],['betaDeg','Signed solar beta','°'],['f107Daily','Previous-day F10.7 proxy','sfu'],['densityKgM3','Neutral density','kg/m³'],['magFieldUT','Local magnetic field','µT'],['ramAreaM2','Ram-facing silhouette','m²'],['dragN','Atmospheric drag','N'],['torqueNm','Disturbance torque','N·m'],['dragTorqueNm','Aerodynamic torque','N·m'],['gravityTorqueNm','Gravity-gradient torque','N·m'],['solarTorqueNm','Radiation-pressure torque','N·m'],['pointingErrorDeg','Pointing error','°'],['momentumNms','Stored cluster momentum','N·m·s'],['cmgMarginNms','Momentum headroom','N·m·s'],['cmgTorqueMarginNm','Steering torque headroom','N·m'],['unloadTorqueNm','Applied unloading torque','N·m'],['unloadAuthorityNm','Available unloading torque','N·m'],['slewTorqueNm','Commanded slew torque','N·m'],
 ['altitudeKm','Instantaneous altitude','km'],['perigeeKm','Current perigee','km'],['apogeeKm','Current apogee','km'],['orbitNumber','Orbit number'],['dragImpulseNs','Integrated drag impulse','N·s'],['rangeKm','Slant range','km'],['elevationDeg','Ground elevation','°'],['acquisitionSec','Acquisition interval','s'],['uplinkMbps','Uplink physical rate','Mbit/s'],['lineMbps','Downlink physical rate','Mbit/s'],['goodputMbps','Delivered payload rate','Mbit/s'],['commandGoodputKbps','Delivered command rate','kbit/s'],['trimPaidDv','Delivered trim Δv','m/s'],['propellantKg','Loaded liquid remaining','kg'],['fuelKg','Fuel remaining','kg'],['oxidizerKg','Oxidizer remaining','kg'],['wetKg','Spacecraft wet mass','kg'],['burnImpulseNs','Cumulative engine impulse','N·s'],['remainingDv','Remaining usable Δv','m/s'],['reserveKg','Reserve and residual','kg'],['propellantUsedKg','Consumed since launch','kg'],['disposalProtectedKg','Disposal allocation','kg'],['disposalUsedKg','Expended on disposal','kg'],['disposalRequiredDv','Disposal Δv requirement','m/s'],['disposalPaidDv','Disposal Δv delivered','m/s']
],'Selected mission instant');
fields('d',[
 ['reqTps','Required active decode','tok/s','requiredTps'],['lifetime','Requested mission duration','yr','missionYears'],['latencyTarget','TTFT requirement','s','latencyTargetS'],['solarDriver','Solar-cycle driver','','solarDriver'],['ap','Geomagnetic activity','Ap'],['solarTilt','Wing tracking bias','°','solarTiltDeg'],['targetAlt','Operating semi-major altitude','km','altitudeKm'],['requiredOrbit','Target inclination','°','inclinationDeg'],['ecc','Eccentricity'],['inclination','Inclination','°','inclinationDeg'],['raan','Ascending node','°','raanDeg'],['argPeri','Argument of perigee','°','argPeriDeg'],['meanAnomaly','Mean anomaly','°','meanAnomalyDeg'],
 ['bytesPerToken','Serialized bytes per output token','B/tok'],['bulkOffer','Bulk arrival rate while computing','Mbit/s','bulkMbps'],['initialQueue','Initial bulk backlog','GB','initialQueueGB'],['retained','Retained files','GB','retainedGB'],['communicationsPackage','Installed communications package','','communicationsPackage'],['linkPolicy','Payload terminal policy','','link'],['dishDiameter','Ka reflector diameter','m','kaDishM'],['optAperture','Optical aperture','m','opticalApertureM'],['elevationMask','Elevation mask','°','elevationDeg'],['heatMode','Thermal experiment','','thermalMode'],['resistance','Junction-to-cold-plate resistance','K/kW per tray','thermalResistanceKPerKw'],['targetRadiator','Design radiator temperature','K','radiatorDesignK'],['maxJunction','Junction operating maximum','K','junctionLimitK'],['initialPackK','Initial pack temperature','K','initialBatteryK'],['launchBoundary','Launch enclosure boundary','K','launchBoundaryK'],['attitudeLaw','Attitude law','','attitude'],['cpOffset','Pressure-center offset','m','cpOffsetM'],['cmgCapacity','Cluster momentum capacity','N·m·s','cmgMomentumNms'],['cmgRating','Cluster torque rating','N·m','cmgTorqueNm'],['dipole','Installed magnetic dipole','A·m²','dipoleAm2'],
 ['reqTrim','Allocated post-separation trim','m/s','trimDv'],['maneuverDv','Allocated operational maneuver','m/s'],['yearsSupply','Requested station-keeping coverage','yr'],['disposalFloor','Minimum disposal allocation','m/s','disposalDv'],['mixture','Oxidizer/fuel mass ratio','','mixtureRatio'],['thrust','Installed thrust','N','thrustN'],['shieldDensity','Shielding areal density','kg/m²','shieldKgM2'],['skinDensity','Enclosure wall areal density','kg/m²','skinKgM2'],['blanketDensity','MLI areal density','kg/m²','blanketKgM2'],['adapterMass','Launch-only adapter','kg','adapterKg'],['allowance','Mission-specific launch allowance','kg','launchAllowanceKg'],['referenceMass','Published reference allowance','kg','referenceKg'],['profileD','Usable envelope diameter','m','fairingM'],['profileH','Usable envelope height','m','fairingLengthM']
],'Design input');
fields('h',[
 ['chips','Installed accelerators'],['trays','Installed compute trays'],['sessions','Concurrent streams'],['modelGB','Weights per replica','GB'],['kvGB','KV cache per replica','GB'],['memoryGB','Accelerator memory','GB'],['rawStorage','Installed raw storage','TB','storageTB'],['diskRead','Aggregate disk read limit','GB/s','diskReadGBs'],['diskWrite','Aggregate disk write limit','GB/s','diskWriteGBs'],['usefulTF','Useful active compute','TFLOP/s','tflops'],['dutyTps','Planned time-averaged decode','tok/s','sustainedTps'],['ttf','Estimated onboard TTFT','s','ttfSeconds'],['tokenEfficiency','Active IT efficiency','tok/J','tokensPerJouleActive'],['packSize','Installed pack energy','kWh','batteryKWh'],['arrayArea','Solar aperture','m²','solarM2'],['radiatorArea','Physical radiator planform','m²','radiatorM2'],['propLoad','Launch propellant load','kg','propellantKg'],['pressurant','Pressurant inventory','kg','pressurantKg'],['tankVolume','Internal tank volume','L','tankVolumeL'],['dryMass','Initial dry mass','kg','dryKg'],['initialWet','Initial wet spacecraft','kg','wetKg'],['launchMass','Launched stack','kg','launchKg'],['launchMargin','Single-launch mass margin','kg','massMarginKg'],['launcherName','Selected launch vehicle','','launcherLabel'],['stackLength','Stowed length','m','stowedLengthM'],['stackDiameter','Stowed bounding diameter','m','stowedDiameterM'],['radialClearance','Minimum lateral clearance','m','radialClearanceM'],['axialClearance','Axial clearance','m','axialClearanceM']
],'Installed hardware');
fields('e',[
 ['meanBus','Planning mean bus demand','kW'],['annualProp','Station-keeping propellant','kg/yr','propAnnual'],['annualImpulse','Annual drag impulse','N·s/yr','yearlyImpulse'],['supplyYears','Station-keeping coverage','yr'],['meanTraffic','Planning payload production','Mbit/s','traffic'],['requiredGoodput','Required goodput during access','Mbit/s','goodputNeeded'],['accessGoodput','Planned in-contact capacity','Mbit/s','linkGoodput'],['solarRequired','End-of-service array requirement','m²','solarNeeded'],['batteryNeeded','End-of-service pack requirement','kWh'],['radRequired','End-of-service radiator requirement','m²','radiatorNeeded'],['transportRise','Design junction transport rise','K','transportRiseK'],['designJunction','Design-state junction estimate','K','thermalK'],['propRequired','Propellant for allocated years','kg','propForCoverage'],['trimBudget','Ideal insertion trim consumption','kg','trimKg'],['disposalBudget','Protected disposal Δv','m/s','disposalBudgetDv'],['planLimit','Binding design constraint','','binding']
],'Planning envelope at requested mission age');
registry.planLimit.read=c=>sizingLabel(c.e?.binding);
function calc(id,label,unit,read,note='Calculated from model channels'){registry[id]={label,unit,note,read}}
const primaryKeys={text:'slaTurns',voice:'audibleTurns',batch:'qualifiedItems',agents:'verifiedTasks',finetune:'deliveredRun',pretrain:'deliveredRun'};
calc('aiPurpose','Payload workload','',c=>purposeInfo(c.h).name,'Selected Earth-customer mission');
calc('aiCustomer','Beneficiary','',c=>purposeInfo(c.h).customer,'Mission definition');
calc('aiGoal','Primary goal','',c=>purposeInfo(c.h).goal,'Mission definition');
calc('aiDeliverable','Earth deliverable','',c=>purposeInfo(c.h).product,'Mission definition');
calc('aiUnit','Unit of onboard work','',c=>c.h.ai?.unit||'request','Workload estimator');
calc('servicePath','Earth service route','',c=>c.d.serviceRoute==='relay'?'Assumed relay':'Direct contact','Selected route');
for(const [key,label,unit,field] of [
 ['activeWorkRate','Installed active work rate','ai/s','activeUnitsPerSec'],['requiredWorkRate','Required mean work rate','ai/s','requiredRate'],['aiMemoryMargin','Accelerator memory headroom','GB','memoryMarginGB'],['aiStorageMargin','Persistent storage headroom','GB','storageMarginGB'],['aiRequiredStorage','Required persistent storage','GB','requiredStorageGB'],['aiInputBytes','Input per work unit','B','inputBytesPerUnit'],['aiOutputBytes','Stream product per work unit','B','outputBytesPerUnit'],['aiArtifactGB','Requested model artifact','GB','artifactGB'],['aiTrainingGoal','Training target','training tok','trainingGoalTokens']])calc(key,label,unit,c=>c.h.ai?.[field],'Installed workload estimate');
calc('agentWidth','Parallel agents per assignment stage','agents',c=>c.d.agentFanout,'Customer workflow design');
calc('agentResidentSlots','Resident worker slots on the vehicle','slots',c=>c.h.ai?.agentWorkerSlots,'Installed workload estimate');
calc('aiPeerMbps','Onboard peer traffic rate','Mbit/s',c=>c.s.aiPeerMbps,'Internal fabric · mission instant');
calc('aiPeerTrafficGB','Cumulative onboard peer traffic','GB',c=>c.s.aiPeerTrafficGB,'Internal fabric ledger');
calc('aiFabricEfficiency','Fabric efficiency','%',c=>100*(c.h.ai?.fabricEfficiency??0),'Installed workload estimate');
fields('s',[
 ['aiUnitRate','Instantaneous work rate','ai/s'],['aiUnitsComputed','Cumulative onboard computation','ai'],['aiInputBufferGB','Staged customer input','GB'],['aiInputConsumedGB','Customer input consumed','GB'],['aiProductGeneratedGB','Customer product generated','GB'],['aiProductDeliveredGB','Customer product received on Earth','GB'],['aiProductQueueGB','Customer product in recorder','GB'],['aiOutputMbps','Customer product return rate','Mbit/s'],['aiTrainingTokens','Training tokens processed','tok'],['storageKW','Recorder draw','kW']
],'Mission instant · conserved service channels');
function effectiveUnit(unit,c){return unit==='ai/s'?(c.h.ai?.unit||'work unit')+'/s':unit==='ai'?(c.h.ai?.unit||'work unit'):unit;}
function serviceRows(c){
 const r=c.service;if(!r?.metrics||r.purpose&&r.purpose!==purposeId(c.h))return [];
 const id=purposeId(c.h),extra=id==='agents'?['agentWorkers','agentWaves','peerTrafficPerTask','agentCriticalS']:c.h.ai?.training?['artifactReturnDelay','artifactGoodputRequired']:[];
 const primary=primaryKeys[id],rows=r.metrics.filter(x=>x.key===primary||extra.includes(x.key)),status=r.status;
 return [...rows.map(q=>({key:'service-'+q.key,label:q.label,unit:q.unit||'',value:q.value??null,note:q.note||'Earth service replay · selected window'})),{key:'service-status',label:'Earth service assessment',unit:'',value:status,note:'Selected offer window · Earth receipt and qualification'}];
}
const lv=c=>launchFleet[c.d.launcher];
const selectedPad=c=>launchSiteFor(c.d.launcher,c.d.launchSite);
const paths=new WeakMap();
function ascent(c){if(!paths.has(c.h))paths.set(c.h,launchPath(c.d));return paths.get(c.h);}
calc('padName','Launch complex','',c=>{const p=selectedPad(c);return p.name+' · '+p.range;},'Vehicle-specific pad assignment or labeled site study');
calc('padLocation','Launch-site geography','',c=>{const p=selectedPad(c);return p.region+' · '+p.country+' · '+Math.abs(p.lat).toFixed(2)+'° '+(p.lat<0?'S':'N')+' / '+Math.abs(p.lon).toFixed(2)+'° '+(p.lon<0?'W':'E');},'Approximate pad or regional map reference');
calc('padStatus','Pad and vehicle status','',c=>selectedPad(c).statusLabel,'Evidence for the selected vehicle and launch complex');
calc('padHeading','Direct-ascent heading','°',c=>ascent(c).headingDeg,'Inertial tangent at the rotating pad, clockwise from local north');
calc('padPlaneGap','Target-plane mismatch','°',c=>ascent(c).planeErrorDeg,'Angle between the site-derived insertion plane and the requested orbit');
calc('padPositionGap','Target position mismatch at insertion','km',c=>ascent(c).gapKm,'Distance between the site-derived and requested positions at MET 540 s');
calc('lvStatus','Programme status','',c=>lv(c).status,'Provider and agency references in the vehicle catalogue');
calc('lvReferenceOrbit','Capacity reference conditions','',c=>lv(c).referenceOrbit,'Cited LEO reference');
calc('lvStages','Axial propulsion stages','stages',c=>lv(c).stages);
calc('lvBoosters','Strap-on boosters','boosters',c=>lv(c).boosters);
calc('lvArchitecture','Carrier arrangement','',c=>lv(c).architecture);
calc('lvRecovery','Recovery configuration','',c=>lv(c).recovery);
calc('lvBenchmarkMargin','LEO reference minus launch stack','kg',c=>c.h.launchReferenceMarginKg,'Nominal provider-reference screen; mission orbit can differ');
calc('lvScreenMargin','Governing launch mass headroom','kg',c=>c.h.launchScreenMarginKg,'Smaller of mission allowance and LEO reference, less launched mass');
calc('lvHandoff','Launch service state','',c=>c.s.t<0?'Integrated on the ground':c.s.carrierAttached?'Payload rides the carrier':'Payload released','At the selected carrier’s payload release, the spacecraft takes pointing authority and leaves the adapter behind.');
calc('attachedAdapter','Adapter attached to payload','kg',c=>c.s.carrierAttached?c.d.adapterKg:0,'The adapter is removed from the payload mass at the carrier-specific release event.');
calc('carriedMass','Spacecraft and attached fittings','kg',c=>c.s.wetKg+(c.s.carrierAttached?c.d.adapterKg:0),'Current wet spacecraft plus the adapter while attached.');
calc('lvCarrierService','Post-release carrier contribution','',()=>'Spacecraft propulsion and power after release','Carrier pointing authority ends at the selected payload release event');
const pc=(id,label,key,basis='Design input')=>calc(id,label,'%',c=>100*c.d[key],basis);
pc('duty','Scheduled compute duty','duty');pc('reservePct','Spare SSD capacity','diskReserve');pc('codingPct','Application efficiency','codingEff');pc('dryMarginPct','Carried dry growth','structureMargin','Study assumption; item growth basis unassessed');pc('floorPct','SOC operating floor','socMin');pc('targetPct','Design minimum SOC','targetSOC');
const ratio=(a,b)=>b>0?100*a/b:null;
calc('nSites','Ground sites in network','sites',c=>groundSites(c.d.network).length);
calc('orbitMinutes','Current orbit period','min',c=>c.s.periodSec/60);
calc('periodOn','Nominal active interval per orbit','min',c=>c.s.periodSec*c.d.duty/60);
calc('serviceMargin','Active throughput minus requirement','tok/s',c=>c.h.tokensPerSec-c.d.requiredTps);
calc('latencyMargin','Onboard latency headroom','s',c=>c.d.latencyTargetS-c.h.ttfSeconds);
calc('weightsGB','Persistent model image','GB',c=>c.h.weightsTB*1000);
calc('byteResidual','Payload byte closure residual','GB',c=>c.d.initialQueueGB+c.s.generatedGB-c.s.deliveredGB-c.s.droppedGB-c.s.queueGB,'Initial queue + generated − delivered − dropped − still queued');
calc('deliveryFraction','Text delivered / generated in window','%',c=>ratio(c.day.tokensDelivered,c.day.textGeneratedGB*1e9/c.d.bytesPerToken),'Window flows can include text queued earlier');
calc('deliveredFraction','Payload delivered / offered to date','%',c=>ratio(c.s.deliveredGB,c.d.initialQueueGB+c.s.generatedGB));
calc('dailyTokens','Output received in selected 24 h','tok',c=>c.day.tokensDelivered,'Window total');
calc('dailyDownGB','Payload received in selected 24 h','GB',c=>c.day.deliveredGB,'Window total');
calc('dutyDelivery','Mean delivered decode in window','tok/s',c=>c.day.tokensDelivered/86400,'Selected 86,400-second interval');
calc('shadowMin','Shadow in selected 24 h','min',c=>c.day.shadowSeconds/60,'Integrated window');
calc('contactMin','Visibility in selected 24 h','min',c=>c.day.contactSeconds/60,'Integrated window');
calc('accessPct','Measured window access fraction','%',c=>c.day.contactSeconds/864,'Integrated window');
calc('dailyFloor','Lowest SOC in selected 24 h','%',c=>c.day.minSocPct,'Integrated window');
calc('initialEnergy','Initial stored pack energy','kWh',c=>c.d.socInitial*c.h.batteryKWh);
calc('chargeLimit','Installed charge rate limit','kW',c=>c.d.chargeC*c.h.batteryKWh);
calc('dischargeLimit','Installed discharge rate limit','kW',c=>c.d.dischargeC*c.h.batteryKWh);
calc('packMargin','Installed pack minus requirement','kWh',c=>c.h.batteryKWh-c.e.batteryNeeded);
calc('arrayMargin','Installed array minus requirement','m²',c=>c.h.solarM2-c.e.solarNeeded);
calc('radMargin','Radiator area headroom','m²',c=>c.h.radiatorM2-c.e.radiatorNeeded);
calc('storageMargin','Installed raw storage minus required','TB',c=>c.h.storageTB-c.e.storageNeeded);
calc('linkMargin','Planned capacity minus required goodput','Mbit/s',c=>c.e.linkGoodput-c.e.goodputNeeded);
calc('propMargin','Loaded minus required for allocation','kg',c=>c.h.propellantKg-c.e.propForCoverage);
calc('eolCapacity','Pack nameplate at mission end','kWh',c=>ageProperties(c.d,c.d.missionYears).battery);
calc('eolEmissivity','Radiator emittance at mission end','',c=>ageProperties(c.d,c.d.missionYears).emissivity);
calc('deploymentPct','Appendage deployment','%',c=>100*c.s.deployment);
calc('sunFlux','Sunlight normal irradiance','W/m²',c=>c.s.solarIrradiance);
calc('albedoFlux','Earth-reflected irradiance at radiator','W/m²',c=>c.s.albedoIrradiance);
calc('earthIR','Earth IR irradiance at radiator','W/m²',c=>c.s.earthIRIrradiance);
calc('relSpeed','Atmosphere-relative velocity','km/s',c=>c.s.relativeSpeedMs/1000);
calc('station','Receiving ground site','',c=>c.s.station??'No contact');
calc('lastContact','Selected-time link state','',c=>c.s.station??'Out of view');
calc('groundLink','Payload terminal','',c=>c.s.groundLink??'Standby');
calc('burst','Workload state','',c=>c.s.burst?'Scheduled burst':c.s.itKW>0?'Idle trays powered':'Powered down');
calc('burnKind','Firing mode','',c=>c.s.burnKind??'Valves closed');
calc('dryGrowth','Allocated dry growth mass','kg',c=>c.h.massLedger.find(x=>x.id==='margin').kg);
calc('massResidual','Launched ledger closure residual','kg',c=>c.h.launchKg-c.h.massLedger.reduce((sum,r)=>sum+r.kg,0));
calc('wetResidual','Wet mass closure residual','kg',c=>c.s.wetKg-c.h.dryKg-c.h.pressurantKg-c.s.fuelKg-c.s.oxidizerKg);
calc('limitingPart','Tightest stowed section','',c=>c.h.fairing.limitingPart);
calc('fitBasis','Fit-profile provenance','',c=>c.h.fairing.override?'Mission-scaled profile':c.h.fairing.basis);
calc('disposalMode','Retirement method','',c=>(c.disposal?.method??c.d.disposalMethod)==='graveyard'?'Graveyard transfer':'Atmospheric reentry');
calc('closureReason','Modeled endpoint','',c=>c.disposal?.outcome??c.s.disposalReason??'Pending disposal solution');
calc('finalPerigee','Final planned perigee','km',c=>c.disposal?.finalPerigeeKm??null);
calc('finalApogee','Final planned apogee','km',c=>c.disposal?.finalApogeeKm??null);
calc('endpointMET','Planned endpoint MET','s',c=>c.disposal?.end??null);
calc('modelBoundary','Thermal coverage','',c=>c.s.referenceBody?'Reference-body descent; equipment channels unassessed':c.s.terminatedAt!=null?'At modeled endpoint':'Spacecraft model active');

const memo=new WeakMap();
function context(ctx,needEnvelope=false){
 const h=ctx.hardware,s=ctx.state,d=h.input,day=ctx.day??{};
 let e;
 if(needEnvelope){const massRevision=h.electricalMassRevision||0,cached=memo.get(h);e=ctx.envelope??(cached?.massRevision===massRevision?cached.envelope:null);if(!e){e=sizingEnvelope(h);memo.set(h,{massRevision,envelope:e})}}
 return {...ctx,h,d,s,day,e:e??{},audit:ctx.audit??ctx.sim?.audit??null};
}
const numberValue=x=>typeof x==='number'&&!Number.isFinite(x)?null:x??null;
const nonSpacecraftFields=new Set(['aiUnitsComputed','aiProductGeneratedGB','aiProductDeliveredGB','aiInputConsumedGB','aiTrainingTokens','lvStatus','lvReferenceOrbit','lvStages','lvBoosters','lvRecovery','lvArchitecture','lvBenchmarkMargin','lvScreenMargin','lvHandoff','lvCarrierService','phase','disposalStatus','altitudeKm','perigeeKm','apogeeKm','densityKgM3','dragN','t','disposalMode','closureReason','modelBoundary','endpointMET','finalPerigee','finalApogee','relSpeed','entryDynamicPressurePa','entryReferenceDragMS2','reqTrim','requiredOrbit','targetAlt','disposalPaidDv','disposalUsedKg','disposalRequiredDv','disposalProtectedKg','propellantUsedKg','tokensGenerated','tokensDelivered','generatedGB','deliveredGB','droppedGB','textDeliveredGB','bulkDeliveredGB','uploadedGB','burnImpulseNs']);
function readMetric(code,c){
 const metric=registry[code];if(!metric)throw new Error('Missing domain quantity '+code);
 const beyond=c.s.spacecraftModelEndedAt!=null&&c.s.t>c.s.spacecraftModelEndedAt+1e-6;
 const inOrbitalEnvironment=!c.s.carrierAttached;
 const unavailablePrelaunch=!inOrbitalEnvironment&&['f107Daily','densityKgM3','magFieldUT','sunFlux','earthIR','albedoFlux','betaDeg','ramAreaM2','dragN'].includes(code);
 const closed=(c.s.referenceBody||beyond)&&!nonSpacecraftFields.has(code)&&(metric.source==='s'||['burst','groundLink','station','burnKind','deploymentPct','earthIR','albedoFlux','sunFlux','wetResidual','byteResidual','lastContact'].includes(code));
 return {key:code,label:metric.label,unit:effectiveUnit(metric.unit,c),value:closed||unavailablePrelaunch?null:numberValue(metric.read(c)),note:closed?'Spacecraft channel outside propagation interval':unavailablePrelaunch?'Orbital environment begins at insertion':metric.note};
}
const F=(source,receiver,quantity,value,unit,kind='Induced')=>({source,receiver,quantity,value:numberValue(value),unit,kind});
export function environmentFlows({hardware:h,state:s}){
 const d=h.input,open=!s.carrierAttached&&!s.referenceBody;
 const heatRows=[
  F('Sun','Solar-wing surface','Normal irradiance',!s.carrierAttached?s.solarIrradiance:null,'W/m²','Natural'),
  F('Sun','Radiator coating','Absorbed direct shortwave',!s.carrierAttached?s.radiatorDirectSolarKW:null,'kW','Natural'),
  F('Illuminated Earth','Radiator coating','Absorbed albedo',!s.carrierAttached?s.radiatorAlbedoKW:null,'kW','Natural'),
  F('Earth thermal IR','Radiator faces','Absorbed longwave',!s.carrierAttached?s.radiatorEarthIRKW:null,'kW','Natural'),
  F('Earth and Sun','Enclosure exterior','Area-weighted shortwave',open?s.enclosureSolarWm2:null,'W/m²','Natural'),
  F('Thermosphere','Ram-facing silhouette','Local neutral density',s.t>=540?s.densityKgM3:null,'kg/m³','Natural'),
  F('Solar activity','Density scenario','81-day F10.7 proxy',s.t>=540?s.f107Mean:null,'sfu','Natural'),
  F('Local magnetic field','Torquer rods','Field strength',open?s.magFieldUT:null,'µT','Natural'),
  F('Orbital shadow','Solar wings','Direct solar visibility',open?(s.eclipse?0:100):null,'%','Natural')
 ];
 if(s.referenceBody||s.spacecraftModelEndedAt!=null&&s.t>s.spacecraftModelEndedAt+1e-6)return [F('Atmosphere','Reference body','Atmospheric density',s.densityKgM3,'kg/m³','Natural'),F('Relative flow','Reference body','Speed',s.relativeSpeedMs,'m/s','Natural'),F('Airflow','Reference body','Dynamic pressure',s.entryDynamicPressurePa,'Pa','Natural'),F('Aerodynamic resistance','Reference trajectory','Drag deceleration',s.entryReferenceDragMS2,'m/s²','Induced')];

 return [...heatRows,
  F('Articulated surfaces','Relative flow','Projected ram area',open?s.ramAreaM2:null,'m²'),
  F('Relative flow','Spacecraft bus','Drag force',s.dragN,'N'),
  F('Pressure center','CMG cluster','Drag torque',s.dragTorqueNm,'N·m'),
  F('Engine thrust line','CMG cluster','Torque from thrust offset',s.burn?propulsionReview(h,s.propellantKg,s).torqueNm:0,'N·m'),
  F('Sunlit surfaces','CMG cluster','Solar-pressure torque',s.solarTorqueNm,'N·m'),
  F('Mass distribution','CMG cluster','Gravity-gradient torque',s.gravityTorqueNm,'N·m'),
  F('Sun-facing cells','Regulated bus','Delivered generation',s.solarKW,'kW'),
  F('Regulated bus','Compute trays','Served IT power',s.itKW,'kW'),
  F('Regulated bus','Persistent storage','Requested storage power',s.storageKW,'kW'),
  F('Regulated bus','RF / optical terminal','Requested terminal power',s.terminalKW,'kW'),
  F('Regulated bus','Coolant pump','Served pump power',s.servedPumpKW,'kW'),
  F('Regulated bus','Drive joints','Requested joint power',s.jointKW,'kW'),
  F('Regulated bus','CMG electronics','Requested CMG draw',s.cmgKW,'kW'),
  F('Regulated bus','Magnetic rods','Requested coil draw',s.coilKW,'kW'),
  F('Regulated bus','Avionics / valve auxiliaries','Requested auxiliary draw',s.auxKW,'kW'),
  F('Pack conversion','Battery thermal mass','Conversion loss',s.packLossKW,'kW'),
  F('Pack','Equipment loop','Signed conducted heat',s.packToLoopKW,'kW'),
  F('Equipment and pack','Equipment loop','Applied loop heat',s.heatInputKW,'kW'),
  F('Outer blanket','Surroundings','Signed outward heat',s.enclosureLeakKW,'kW'),
  F('Radiator faces','Space','Gross emission',s.grossEmissionKW,'kW')
 ];
}
function linkedFlows(id,c){
 const h=c.h,s=c.s,d=c.d;
 if(id==='environment')return environmentFlows(c);
 const all={
 mechanical:[F('Pressure vessels','Spacecraft mass properties','Remaining liquid mass',s.propellantKg,'kg'),F('Integrated structure','Launcher','Launched stack',h.launchKg,'kg')],
 software:[F('Body reference','Gyro cluster','Achieved body rate',s.bodyRateDegS,'°/s'),F('Mechanism drives','Electrical bus','Tracking demand',s.trackingDriveKW,'kW'),F('Realized panel normals','Thermal loop','Absorbed direct sunlight',s.radiatorDirectSolarKW,'kW')],
 avionics:[F('Electrical bus','Flight computer','Avionics draw',s.cdhKW,'kW'),F('Spacecraft sensors','Housekeeping recorder','Source rate',s.hkRateKbps,'kbit/s'),F('S-band receiver','Flight computer','Ground command delivery',s.commandGoodputKbps,'kbit/s')],
 conops:[F('Customer input','Onboard processing','Customer input consumed',s.aiInputConsumedGB,'GB'),F('Payload recorder',purposeInfo(h).customer,'Products received on Earth',s.aiProductDeliveredGB,'GB')],
 orbit:[F('Relative atmosphere','Exposed silhouette','Drag impulse since launch',s.dragImpulseNs,'N·s'),F('Chemical engines','Trajectory','Cumulative applied impulse',s.burnImpulseNs,'N·s')],
 compute:[F('Regulated bus','Compute trays','IT draw',s.itKW,'kW'),F('Compute trays','Recorder','Serialized text offered',s.tokensPerSec*d.bytesPerToken*8/1e6,'Mbit/s'),F(purposeInfo(h).customer,'Staged input','Input held onboard',s.aiInputBufferGB,'GB'),F('Recorder',purposeInfo(h).customer,'Returned product',s.aiProductDeliveredGB,'GB')],
 data:[F('Decode output','Recorder','Serialized text generated',s.textGeneratedGB,'GB'),F('Recorder','Ground','Text delivered',s.textDeliveredGB,'GB'),F('Recorder','Ground','Bulk delivered',s.bulkDeliveredGB,'GB')],
 comm:[F('Ground network','S-band command receiver','Command goodput',s.commandGoodputKbps,'kbit/s'),F('Payload terminal',s.station??'Ground network','Payload goodput',s.goodputMbps,'Mbit/s')],
 power:[F('Solar wings','Regulated bus','Generation',s.solarKW,'kW'),F('Regulated bus','Pack','Charging',s.chargeKW,'kW'),F('Pack','Regulated bus','Discharging',s.dischargeKW,'kW'),F('Regulated bus','Equipment','Served demand',s.servedLoadKW,'kW')],
 thermal:[F('Equipment and pack','Equipment loop','Applied loop heat',s.heatInputKW,'kW'),F('Pack','Equipment loop','Signed conduction',s.packToLoopKW,'kW'),F('Equipment loop','Radiator store','Controlled heat exchange',s.loopToRadiatorKW,'kW'),F('Earth / Sun','Radiator','Absorbed external heat',s.absorbedKW,'kW'),F('Radiator','Space','Gross emission',s.grossEmissionKW,'kW')],
 attitude:[F('Relative flow','Bus','Ram torque',s.dragTorqueNm,'N·m'),F('Moving reflector','CMGs','Slew torque',s.slewTorqueNm,'N·m'),F('Torquer coils','Magnetic field','Unloading torque',s.unloadTorqueNm,'N·m')],
 prop:[F('Fuel / oxidizer','Engines','Mass consumed since launch',s.propellantUsedKg,'kg'),F('Engines','Spacecraft','Cumulative impulse',s.burnImpulseNs,'N·s'),F('Disposal allocation','Terminal maneuver','Mass consumed in retirement',s.disposalUsedKg,'kg')],
 mass:[F('Dry allocations','Flight vehicle','Dry mass',h.dryKg,'kg'),F('Propulsion stores','Flight vehicle','Current consumables',s.propellantKg+h.pressurantKg,'kg'),F('Launch adapter','Stack at integration','Launch-only mass',d.adapterKg,'kg')],
 launcher:[F('Provider reference','Stack comparison','LEO reference headroom',h.launchReferenceMarginKg,'kg'),F('Mission allowance','Integrated stack','Mass headroom',h.massMarginKg,'kg'),F('Launch manifest','Released vehicle','Initial spacecraft wet mass',h.wetKg,'kg')],
 launch:[F('Flight vehicle','Payload interface','Initial wet mass',h.wetKg,'kg'),F('Launcher allowance','Manifest','Mass allowance less stack',h.massMarginKg,'kg'),F('Spacecraft engines','Injection orbit','Delivered trim',s.trimPaidDv,'m/s')]
 };
 if(purposeId(h)!=='text'){
  if(id==='compute')all.compute=[F('Regulated bus','Installed workload','Served IT demand',s.itKW,'kW'),F('Accelerators','Execution ledger','Onboard work completed',s.aiUnitsComputed,h.ai?.unit||'work units'),F(purposeInfo(h).customer,'Staged input','Input held onboard',s.aiInputBufferGB,'GB'),F('Recorder',purposeInfo(h).customer,'Returned product',s.aiProductDeliveredGB,'GB')];
 }
 if(id==='data')all.data=[F('Customer','Input staging','Received onboard',s.aiInputUploadedGB,'GB'),F('Compute','Recorder','Customer product generated',s.aiProductGeneratedGB,'GB'),F('Recorder',purposeInfo(h).customer,'Customer product received',s.aiProductDeliveredGB,'GB')];
 return (s.referenceBody||s.spacecraftModelEndedAt!=null&&s.t>s.spacecraftModelEndedAt)?[]:(all[id]??[]);
}
const isRelevant=(domain,e)=>domain.eventTypes.includes(e.type)||(/disposal|graveyard|entry|impact|coast|passiv|retire/.test(e.type)&&domain.eventTypes.some(k=>['disposal','graveyard'].includes(k)));
const phaseTypes={D:['integration','pad','launch','insertion','trim','deployment'],E:['burst','contact','eclipse','reboost','desat','maneuver','deployment'],F:['disposal','coast','entry','impact','graveyard','passivation','retirement','graveyard-burn']};
function eventList(id,phase,c){
 let all=c.events??[];
 if(phase==='F'&&Array.isArray(c.disposal?.burns)){
  const p=c.disposal;
  all=[...all,...p.burns.map((b,i)=>({id:'review-disposal-'+i,type:'disposal',label:b.role||'Retirement maneuver',start:b.start,end:b.end,readOnly:true})),...[['entry','Atmospheric interface',p.entry],['impact','Reference impact',p.impact?.t],['graveyard','Graveyard arrival',p.outcome==='graveyard'?p.end:null]].filter(([, ,t])=>Number.isFinite(t)).map(([type,label,t])=>({id:'review-'+type,type,label,start:t,end:t,readOnly:true}))];
 }
 return all.filter(e=>isRelevant(domains[id],e)&&(!phaseTypes[phase]||phaseTypes[phase].includes(e.type)||phase==='F'&&/disposal|graveyard|impact|entry|passiv|descent/.test(e.type))).sort((a,b)=>a.start-b.start);
}
function auditRows(id,a){
 if(!a)return [];
 const end=a.finalState??{},E=a.energyKWh??{};
 const map={
 mechanical:[['Liquid mass expended',end.propellantUsedKg,'kg'],['Final vehicle mass',end.wetKg,'kg']],
 software:[['Integrated joint energy',E.joints,'kWh'],['Final stored momentum',end.momentumNms,'N·m·s']],
 avionics:[['Command data received',end.commandUploadedGB,'GB'],['Housekeeping overwritten',end.hkOverwrittenMB,'MB']],
 conops:[['Thermally evaluated interval',a.thermal?.coveredSeconds,'s'],['Returned customer product',end.aiProductDeliveredGB,'GB'],['First in-flight limit',a.firstCrossing?.time,'s']],
 environment:[['Accumulated drag impulse',end.dragImpulseNs,'N·s'],['Environmental heat absorbed',E.absorbed,'kWh'],['Cumulative joint energy',E.joints,'kWh']],
 orbit:[['Eclipse events',a.eclipseCount,'events'],['Terminal perigee',end.perigeeKm,'km'],['Accumulated atmospheric impulse',end.dragImpulseNs,'N·s']],
 compute:[['Returned customer product',end.aiProductDeliveredGB,'GB'],['Campaign input consumed',end.aiInputConsumedGB,'GB'],['Customer product remaining',end.aiProductQueueGB,'GB'],['Integrated IT energy',E.it,'kWh'],['Integrated writes',end.writeGB,'GB']],
 data:[['Text delivered over mission',end.textDeliveredGB,'GB'],['Bulk delivered over mission',end.bulkDeliveredGB,'GB'],['Payload dropped over mission',end.droppedGB,'GB']],
 comm:[['Visibility intervals',a.contactCount,'passes'],['Ground-received payload',end.deliveredGB,'GB'],['Spacecraft-received command data',end.uploadedGB,'GB']],
 power:[['Minimum integrated SOC',a.minSocPct,'%'],['Integrated solar generation',E.solar,'kWh'],['Integrated unserved demand',end.unmetKWh,'kWh']],
 thermal:[['Maximum integrated junction',a.maxJunctionK,'K'],['First thermal violation MET',a.thermal?.firstViolation?.time,'s'],['Radiator gross emission',E.radiatorEmission,'kWh']],
 attitude:[['Magnetic unload episodes',a.desatCount,'events'],['CMG energy',E.cmg,'kWh'],['Magnetorquer energy',E.coils,'kWh']],
 prop:[['Propellant expended',end.propellantUsedKg,'kg'],['Terminal liquid inventory',end.propellantKg,'kg'],['Chemical burns',a.burnCount,'events']],
 mass:[['Terminal wet mass',end.wetKg,'kg'],['Terminal liquid inventory',end.propellantKg,'kg']],
 launcher:[['Audited spacecraft propellant expended',end.propellantUsedKg,'kg']],
 launch:[['Integrated insertion trim',end.trimPaidDv,'m/s'],['Entered thermal interval',a.thermal?.coveredSeconds,'s']]
 };
 return map[id].filter(([,v])=>Number.isFinite(v)).map(([label,value,unit],i)=>({key:'audit-'+id+'-'+i,label,value,unit,note:'Full chronological mission'}));
}
function terminalRows(id,c){
 const x=c.disposal;if(!x)return [];
 let r=[];
 if(x.method==='graveyard'){
  if(['conops','environment','orbit','prop','mass','launch','attitude'].includes(id))r=[['Graveyard final perigee',x.finalPerigeeKm,'km'],['Graveyard final apogee',x.finalApogeeKm,'km'],['Transfer burns',x.burns?.length,'burns']];
 }else if(['conops','environment','orbit','prop','launch'].includes(id)){
  r=[['Target latitude',x.target?.latDeg,'°'],['Target longitude',x.target?.lonDeg,'°'],['Target error',x.targetErrorKm,'km'],['Reference impact speed',x.impact?.speedMs,'m/s'],['95% modeled footprint semimajor axis',x.footprint?.semiMajorKm,'km']];
 }
 return r.filter(([,v])=>Number.isFinite(v)).map(([label,value,unit],i)=>({key:'end-'+i,label,value,unit,note:'Terminal solution'}));
}
export function domainReadout(id,phase,ctx){
 id=canonicalDomainId(id);
 const domain=domains[id];if(!domain||!domain.stages[phase])throw new Error('Unknown mission domain or phase');
 const c=context(ctx,phase==='C'),stage=domain.stages[phase];
 // Terminal trajectory propagation is requested solely inside the retirement phase.
 if(phase==='F'&&c.disposal===undefined)c.disposal=c.sim?.disposal?.();
 let keys=stage.keys;
 if(purposeId(c.h)!=='text'&&id==='compute')keys={
   A:['aiPurpose','aiUnit','aiRequiredStorage','aiMemoryMargin','trays','memoryGB'],B:['aiPurpose','activeWorkRate','aiFabricEfficiency','aiMemoryMargin','diskRead','diskWrite'],C:['activeWorkRate','requiredWorkRate','aiMemoryMargin','aiFabricEfficiency','meanBus','launchMargin'],D:['phase','trays','memoryGB','aiInputBufferGB','itKW'],E:['aiUnitRate','aiUnitsComputed','aiInputConsumedGB','itKW','aiProductGeneratedGB','aiProductQueueGB'],F:['aiUnitsComputed','aiInputConsumedGB','aiProductGeneratedGB','aiProductDeliveredGB','disposalStatus']}[phase];
 if(id==='data')keys={
   A:['aiPurpose','aiDeliverable','aiInputBytes','aiOutputBytes','aiRequiredStorage'],B:['aiInputBufferGB','aiProductQueueGB','aiProductDeliveredGB','diskRead','diskWrite'],C:['aiRequiredStorage','aiStorageMargin','requiredGoodput','accessGoodput','aiMemoryMargin'],D:['phase','aiInputBufferGB','aiProductGeneratedGB','aiProductDeliveredGB','storageKW'],E:['aiInputConsumedGB','aiProductGeneratedGB','aiProductQueueGB','aiProductDeliveredGB','goodputMbps'],F:['aiInputConsumedGB','aiProductGeneratedGB','aiProductQueueGB','aiProductDeliveredGB','disposalStatus']}[phase];
 if(phase==='F'&&id==='environment'&&c.s.referenceBody)keys=['disposalMode','altitudeKm','relSpeed','densityKgM3','entryDynamicPressurePa','entryReferenceDragMS2'];
 if(phase==='F'&&c.disposal?.method==='reentry'&&(id==='orbit'||id==='launch'))keys=keys.filter(k=>!['finalPerigee','finalApogee'].includes(k));
 if(id==='compute'&&phase==='B'&&c.h.ai?.training)keys=[...keys,'aiTrainingGoal','aiArtifactGB','servicePath'];
 if(id==='conops'&&phase==='E'&&c.h.ai?.training)keys=['aiPurpose','aiTrainingTokens','aiInputBufferGB','aiArtifactGB','aiProductDeliveredGB'];
 if(purposeId(c.h)==='agents'&&['conops','compute'].includes(id))keys=[...keys,'agentWidth','agentResidentSlots','aiPeerMbps','aiPeerTrafficGB'];
 const rows=[...new Set(keys)].map(key=>readMetric(key,c));if(['compute','conops'].includes(id)&&['A','C','E','F'].includes(phase))rows.push(...serviceRows(c));
 if(phase==='C')rows.push(...auditRows(id,c.audit));
 if(phase==='F')rows.push(...terminalRows(id,c));
 return {title:id==='data'?payloadDataStage(phase,c.h).title:stage.title,description:purposeStageDescription(id,phase,c.h),basis:phase==='A'?'Mission requirements and installed configuration':phase==='C'?'Installed design and end-of-service sizing envelope. Window and audited mission quantities are labeled separately.':phase==='F'?'Retirement trajectory and spacecraft channels within their modeled interval':'Shared mission clock · quantities at the selected instant unless labeled as window totals',rows,flows:linkedFlows(id,c),events:eventList(id,phase,c)};
}
function series(code,ctx){
 const data=ctx.samples??[];
 return data.map(s=>({t:s.t,v:readMetric(code,{...ctx,s}).value})).filter(r=>Number.isFinite(r.t)&&Number.isFinite(r.v)).sort((a,b)=>a.t-b.t);
}
// Chronological day bins are reduced by minimum, maximum, incremental rate or cumulative stock.
// A shared bin width gives both integrations a common horizontal time scale even if life differs.
const missionTrend={
 mechanical:['Spacecraft wet mass','kg','stock',r=>r.propellantUsedKg],
 software:['Mean joint power','kW','power',r=>r.energyKWh?.joints],
 avionics:['Ground commands received','GB','sum',r=>r.commandUploadedGB??r.uploadedGB],
 conops:['Returned customer product','Mbit/s','rate',r=>r.aiProductDeliveredGB*8000],
 environment:['Mean absorbed environmental heat','kW','power',r=>r.energyKWh?.absorbed],
 orbit:['Shadow fraction','%','percent',r=>r.shadowSeconds],
 compute:['Mean IT power','kW','power',r=>r.energyKWh?.it],
 data:['Peak queued payload','GB','max',r=>r.peakQueueGB],
 comm:['Delivered downlink average','Mbit/s','rate',r=>r.deliveredGB*8000],
 power:['Lowest pack charge','%','min',r=>r.minSocPct],
 thermal:['Hottest junction','K','max',r=>r.maxJunctionK],
 attitude:['Minimum momentum headroom','N·m·s','min',r=>r.minMomentumMarginNms],
 prop:['Remaining propellant','kg','stock',r=>r.propellantUsedKg],
 mass:['Remaining spacecraft wet mass','kg','stock',r=>r.propellantUsedKg],
 launcher:['Carried spacecraft mass after release','kg','stock',r=>r.propellantUsedKg],
 launch:['Cumulative propulsion expenditure','kg','sum',r=>r.propellantUsedKg]
};
function missionSeries(c,id,width){
 const [, ,rule,get]=missionTrend[id],rows=c.audit.dayStats,end=c.audit.finalState?.t??c.d.missionYears*YEAR_SECONDS;
 const points=[];let cumulative=0;
 for(let start=0;start<rows.length;start+=width){
  const finish=Math.min(rows.length,start+width),to=Math.min(end,finish*86400),span=to-start*86400;
  if(span<=0)break;
  const values=rows.slice(start,finish).map(get).filter(Number.isFinite);if(!values.length)continue;
  const sum=values.reduce((a,b)=>a+b,0);cumulative+=sum;
  let v;if(rule==='min')v=Math.min(...values);else if(rule==='max')v=Math.max(...values);
  else if(rule==='stock')v=((id==='mass'||id==='mechanical'||id==='launcher')?c.h.wetKg:c.h.propellantKg)-cumulative;
  else if(rule==='sum')v=cumulative;else v=sum/span*(rule==='power'?3600:rule==='percent'?100:1);
  points.push({t:to,v});
 }
 return points;
}
const YEAR_SECONDS=365.25*86400;
export function domainTrade(id,baselineContext,editedContext){
 id=canonicalDomainId(id);
 const a=context(baselineContext,true),b=context(editedContext,true),keys=purposeId(b.h)!=='text'&&['compute','data'].includes(id)?domainReadout(id,'C',{...editedContext,audit:null,sim:null}).rows.filter(r=>!r.key.startsWith('audit-')).map(r=>r.key):domains[id].stages.C.keys;
 const rows=keys.map(key=>{const m=readMetric(key,a),n=readMetric(key,b);return {key,label:m.label,unit:m.unit,note:m.note,baseline:m.value,edited:n.value,delta:Number.isFinite(m.value)&&Number.isFinite(n.value)?n.value-m.value:null}});
 if(a.audit&&b.audit){const left=auditRows(id,a.audit),right=auditRows(id,b.audit);for(const r of left){const s=right.find(x=>x.label===r.label);if(s)rows.push({key:r.key,label:r.label,unit:r.unit,note:r.note,baseline:r.value,edited:s.value,delta:s.value-r.value})}}
 const curveKeys=purposeId(b.h)!=='text'&&id==='compute'?['aiUnitRate','itKW']:id==='data'?['aiProductQueueGB','aiProductDeliveredGB']:domains[id].curves;
 const curves=curveKeys.map(key=>({key,label:registry[key].label,unit:effectiveUnit(registry[key].unit,b),baseline:series(key,a),edited:series(key,b)}));
 const missionCurves=[];
 if(a.audit?.dayStats?.length&&b.audit?.dayStats?.length){
  const width=Math.max(1,Math.ceil(Math.max(a.audit.dayStats.length,b.audit.dayStats.length)/120)),[label,unit]=missionTrend[id];
  missionCurves.push({key:'mission-'+id,label:'Mission history · '+label,unit,baseline:missionSeries(a,id,width),edited:missionSeries(b,id,width)});
 }
 return {rows,curves,missionCurves,changedInputs:Object.keys(b.d).filter(k=>a.d[k]!==b.d[k])};
}

function fmt(v){
 if(v===null||v===undefined||typeof v==='number'&&!Number.isFinite(v))return '—';
 if(typeof v!=='number')return String(v);
 if(v!==0&&(Math.abs(v)<.0005||Math.abs(v)>=1e11))return v.toExponential(2);
 return v.toLocaleString('en-US',{maximumFractionDigits:Math.abs(v)<1?4:Math.abs(v)<100?2:1});
}
function met(t){if(!Number.isFinite(t))return '—';const a=Math.abs(t),days=Math.floor(a/86400),hours=Math.floor(a/3600)%24,mins=Math.floor(a/60)%60;return (t<0?'−':'+')+(days?days+'d ':'')+String(hours).padStart(2,'0')+':'+String(mins).padStart(2,'0')+':'+String(Math.floor(a)%60).padStart(2,'0')}
function flowTable(rows){
 const body=rows.map(r=>`<tr><td>${esc(r.source)}</td><td>${esc(r.receiver)}</td><td>${esc(r.quantity)}</td><td>${esc(fmt(r.value))} <small>${esc(r.unit)}</small></td></tr>`).join('');
 return `<div class="da-scroll"><table class="da-table da-flows"><thead><tr><th scope="col">Source</th><th scope="col">Receiver</th><th scope="col">Transfer or coupling</th><th scope="col">Magnitude</th></tr></thead><tbody>${body}</tbody></table></div>`;
}
function flowPanel(id,flows){
 if(!flows.length)return '';
 if(id!=='environment')return `<details class="da-fold"><summary>Subsystem connections <small>${flows.length} transfers</small></summary>${flowTable(flows)}</details>`;
 return ['Natural','Induced'].map((type,i)=>{const rows=flows.filter(f=>f.kind===type);return rows.length?`<details class="da-fold" ${i===0?'open':''}><summary>${type==='Natural'?'Natural environment':'Spacecraft-induced environment'} <small>${rows.length} channels</small></summary>${flowTable(rows)}</details>`:''}).join('');
}
function metricTable(rows){
 return `<dl class="da-measures">${rows.map(r=>`<div><dt>${esc(r.label)}<small>${esc(r.note)}</small></dt><dd>${esc(fmt(r.value))} <small>${r.value==null?'':esc(r.unit)}</small></dd></div>`).join('')}</dl>`;
}
export function renderDomainReadout(id,phase,ctx){
 id=canonicalDomainId(id);
 const m=domainReadout(id,phase,ctx),events=m.events;
 const ref=['launch','launcher'].includes(id)?launchReferenceFor(ctx.hardware.input.launcher):null;
 const schedule=['D','E','F'].includes(phase)?`<details class="da-fold"><summary>Relevant modeled intervals <small>${events.length} in view</small></summary>${events.length?`<div class="da-scroll"><table class="da-table"><thead><tr><th>Episode</th><th>Start MET</th><th>End MET</th><th>Duration</th></tr></thead><tbody>${events.map(e=>`<tr><td>${esc(e.label??e.type)}</td><td>${met(e.start)}</td><td>${met(e.end)}</td><td>${fmt(e.end-e.start)} s</td></tr>`).join('')}</tbody></table></div>`:'<p class="da-empty">No matching interval in the selected window.</p>'}</details>`:'';
 return `<section class="da-review" aria-label="${esc(m.title)}"><header><small>PHASE ${phase} &nbsp;/&nbsp; ${esc(domains[id].label.toUpperCase())}</small><h3>${esc(m.title)}</h3><p>${esc(m.description)}</p></header>${metricTable(m.rows)}${flowPanel(id,m.flows)}${schedule}<footer>${esc(m.basis)}${ref?` <a href="${esc(ref.url)}" target="_blank" rel="noopener noreferrer">${esc(ref.title)} ↗</a>`:''}</footer></section>`;
}
function tradePlot(curve){
 const values=[...curve.baseline,...curve.edited];if(!values.length)return '';
 const x0=Math.min(...values.map(p=>p.t)),x1=Math.max(...values.map(p=>p.t)),y0=Math.min(...values.map(p=>p.v)),y1=Math.max(...values.map(p=>p.v));
 const project=list=>list.map(({t,v},i)=>(i?'L':'M')+((t-x0)/(x1-x0||1)*430+5).toFixed(2)+' '+(y1>y0?65-(v-y0)/(y1-y0)*55:38).toFixed(2)).join(' ');
 return `<figure class="da-plot"><figcaption>${esc(curve.label)} <small>${esc(curve.unit)}</small></figcaption><div class="da-plotbounds"><span>${fmt(y1)}</span><span>${fmt(y0)}</span></div><svg role="img" aria-label="${esc(curve.label)} baseline and edited histories on the same scale" viewBox="0 0 440 76" preserveAspectRatio="none"><path d="M5 10H435M5 38H435M5 65H435" class="da-grid"/><path class="da-curve-edit" d="${project(curve.edited)}"/><path class="da-curve-base" d="${project(curve.baseline)}"/></svg><div class="da-ticks"><span>MET ${met(x0)}</span><span>${met(x1)}</span></div></figure>`;
}
export function renderDomainTrade(id,baselineContext,editedContext){
 id=canonicalDomainId(id);
 const r=domainTrade(id,baselineContext,editedContext);
 return `<section class="da-review da-comparison"><header><small>CONTROLLED TRADE &nbsp;/&nbsp; ${esc(domains[id].label.toUpperCase())}</small><h3>Baseline and edited design</h3><p>Compare both configurations on the same mission clock. Δ is edited minus baseline.</p></header><div class="da-scroll"><table class="da-table"><thead><tr><th>Response</th><th>Baseline</th><th>Edited</th><th>Δ</th></tr></thead><tbody>${r.rows.map(x=>`<tr><td>${esc(x.label)} <small>${esc(x.unit)}</small></td><td>${esc(fmt(x.baseline))}</td><td>${esc(fmt(x.edited))}</td><td>${Number.isFinite(x.delta)&&x.delta>0?'+':''}${esc(fmt(x.delta))}</td></tr>`).join('')}</tbody></table></div><div class="da-curves">${[...r.curves,...r.missionCurves].map(tradePlot).join('')}</div><footer><span class="da-series-base">┄ Baseline</span><span class="da-series-edit">━ Edited</span><span>Common MET and vertical units per plot</span></footer></section>`;
}
