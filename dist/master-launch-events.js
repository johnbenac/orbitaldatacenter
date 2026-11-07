// The days before the simulated hour are planning allowances. Negative seconds
// in the simulated hour and all positive seconds share the flight animation clock.
import {DAY,R} from './orbit.js';
import {entryDensity} from './entry.js';
import {integrationProfile} from './integration-profiles.js';
import {processingFacility} from './processing-facilities.js';
import {processingSources} from './ground-processing-sources.js';
import {INTEGRATION_TIMES} from './integration-sequence.js';
import {loadingEnd,loadingHoldText,loadingStages} from './payload-loading.js';
import {launchSiteFor,launchPropulsionFor} from './launch-sites.js';
import {launchFleet} from './launch-fleet.js';
import {launchClockFor,launchWaterSequence,INSERTION_MET} from './launch-effects-state.js';
import {launchPath,ascentTrack} from './launch-path.js';

const receiving={title:'NASA · GOES-U receipt and processing',url:'https://www.nasa.gov/directorates/smd/joint-agency-satellite-division/noaa/noaas-goes-u-arrives-in-florida-for-processing-ahead-of-launch/'};
const campaign={title:'Arianespace · VA263 launch kit, campaign and flight sequence',url:'https://www.arianespace.com/app/uploads/sites/4/2025/03/PRESS_KIT_VA263_EN_FINAL_6_March.pdf'};
const falconCount={title:'NASA · Europa Clipper countdown and ascent milestones',url:'https://science.nasa.gov/blogs/europa-clipper/2024/10/14/key-milestones-for-todays-europa-clipper-launch-2/'};
const glennCount={title:'Blue Origin · New Glenn Payload User’s Guide (2018), §7.2.4, pp. 96–97',url:'https://yellowdragonblog.com/wp-content/uploads/2019/01/new_glenn_payload_users_guide_rev_c.pdf'};
const pressure={title:'NASA Glenn · dynamic pressure',url:'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/dynamic-pressure/'};
const number=(v,p=0)=>v.toLocaleString('en-US',{maximumFractionDigits:p});
const launchBasis='Workbench ascent sequence';
const planningBasis='Planning allowance · approximate day';
const countBasis='Planned call · workbench schedule';

export function launchHold(h){
 if(h.payloadInterface?.passes===false||!h.fairing.fit)return loadingHoldText(h);
 if(h.launchScreenMarginKg<0)return 'The stowed launch stack exceeds the tighter mission allowance or launcher reference by '+number(-h.launchScreenMarginKg)+' kg. Launch authorization is held in this baseline.';
 return null;
}

// Estimate the pressure peak on this particular trajectory, independent of
// the published example times. Velocity is relative to a co-rotating atmosphere.
export function peakAscentPressure(path){
 let peak={t:0,pa:0,altitude:0};
 for(let t=0;t<=INSERTION_MET;t++){
  const {positionECI:p,velocityECI:v}=ascentTrack(path,t),altitude=Math.hypot(...p)-R;
  const speed2=(v[0]+.00007292115*p[1])**2+(v[1]-.00007292115*p[0])**2+v[2]**2;
  const pa=.5*entryDensity(altitude)*speed2*1e6;
  if(pa>peak.pa)peak={t,pa,altitude};
 }
 return peak;
}
function countdownCalls(id){
 if(id==='falconHeavy')return [
  [-420,'engine-chill','Chill the Merlin engines','Propulsion','Liquid oxygen cools the engine hardware ahead of ignition.'],
  [-59,'startup','Flight computer starts final checks','Launch vehicle avionics','The flight computer takes over the last sequence of checks.'],
  [-45,'commit','Launch director’s final go','Launch director','The director confirms that the vehicle can continue toward release.'],
  [-20,'tank-press','Pressurize the flight tanks','Propulsion','Tank pressure is raised for flight before the engine controllers start ignition.']
 ].map(r=>[...r,'Reference call · NASA’s Europa Clipper countdown',falconCount]);
 if(id==='glenn'||id==='glenn9')return [
  [-120,'auto-sequence','Automatic launch sequence','Launch vehicle avionics','Tank pressurization begins. The vehicle switches to onboard supplies and puts navigation in flight mode.'],
  [-30,'final-hold','Final customer hold opportunity','Payload operations','The payload team has a final opportunity to call a hold before launch commit.']
 ].map(r=>[...r,'Reference call · 2018 New Glenn guide',glennCount]);
 return [
  [-300,'readiness','Poll the launch team','Launch director','The payload, range and vehicle teams report readiness for the final count.'],
  [-60,'startup','Confirm terminal sequence readiness','Launch vehicle avionics','The countdown team reviews the onboard sequencer and the vehicle’s flight-power configuration.'],
  [-20,'commit','Review final commit conditions','Launch director','The planned call covers the pad, vehicle and range immediately before engine start.']
 ].map(r=>[...r,countBasis,null]);
}

export function masterLaunchEvents(h){
 const d=h.input,id=d.launcher,site=launchSiteFor(id,d.launchSite),fleet=launchFleet[id];
 const facility=processingFacility(h),profile=integrationProfile(id,site.id),clock=launchClockFor(id),fuel=launchPropulsionFor(id);
 const path=launchPath(d),rows=[],hold=launchHold(h),groundEnd=loadingEnd(h);
 const sourceForGround=profile.evidence[0]?.source??profile.interface.source;
 const star=id==='starship',single=fleet.stages===1;
 function add(segment,key,start,title,owner,description,{basis=launchBasis,major=false,source,end,precision,seek=start,chapter=segment==='ground'?'integration':segment==='countdown'?'pad':segment,domain='launcher',status,measurements}={}){
  if(!status&&hold&&segment!=='ground')status='conditional';
  const row={id:'launch-'+key,start,segment,title,owner,description,basis,major,phase:'D',chapter,domain,camera:'launch',seek};
  if(end!=null)row.end=end;
  if(status)row.status=status;
  if(precision)row.precision=precision;
  if(measurements)row.measurements=measurements;
  if(source){row.sourceTitle=source.title;row.sourceUrl=source.url;}
  rows.push(row);
 }
 const plan=(day,key,title,owner,description,source,major=false)=>add('ground',key,day*DAY,title,owner,description,{basis:planningBasis,precision:'day',seek:null,source,major});
 plan(-21,'receipt','Receive the spacecraft','Ground processing','Receive the verified spacecraft through '+facility.name+'. Review the pre-shipment verification release, transport history, cleanliness and limited health checks before servicing. This date is a planning allowance.',processingSources.gevs,true);
 add('ground','functional',-14*DAY,'Rehearse the spacecraft communications links','Communications and mission operations','Plan the end-to-end command and telemetry checkout, Ka data comparison and optical alignment check while the flight interfaces are accessible. The bench lets you rehearse these procedures on the selected design.',{
  basis:planningBasis,precision:'day',seek:null,domain:'comm',major:true,status:'planned',
  source:{title:'NASA · Ground Data Systems and Mission Operations, §11.7',url:'https://www.nasa.gov/smallsat-institute/sst-soa/ground-data-systems-and-mission-operations/'}
 });
 plan(-7,'service','Service and verify the propulsion system','Propulsion','Plan compatible fuel and oxidizer equipment for the spacecraft’s '+number(h.propellantKg)+' kg propellant inventory, measured-load reconciliation and approved leak/isolation checks. Coolant servicing requires its own compatibility review. Battery charging and RF work occupy separate approved work windows. The flight model starts with the configured inventory aboard.',processingSources.propellant);
 plan(-2,'payload-review','Review payload readiness for integration','Mission integration','Review mass properties, mating interfaces, charge and fluid records, inhibits, removed GSE and accepted verification evidence for '+fleet.family+' at '+site.name+'. Resolve or disposition open items before joint handover. Rehearsal completion does not release the spacecraft.',campaign,true);

 // Launch-control work can proceed while the payload team is still processing its spacecraft.
 // Keep these planning calls outside the accelerated facility/pad playback.
 const crewBasis='ODC planning allowance · approximate hour';
 const rundown={title:'NASA · launch countdown roles and clocks',url:'https://www.nasa.gov/missions/artemis/orion/artemis-i-launch-countdown-101/'};
 add('countdown','staff',-6*3600,'Staff the launch control consoles','Launch control','Open the launch-day communications loops. The payload, vehicle and range teams begin reporting to the launch director. Six hours is the planning allowance for this study.',{basis:crewBasis,source:rundown,major:true,seek:null,precision:'hour',status:'planned'});
 add('countdown','range',-2*3600,'Review weather and range availability','Range operations','Review weather and tracking coverage for the selected site. The team can report a constraint even while payload processing is in progress. This schedule assigns the review an approximate time.',{basis:crewBasis,source:rundown,seek:null,precision:'hour',status:'planned'});
 const steps=loadingStages(h);
 for(let i=0;i<steps.length;i++){
  const start=INTEGRATION_TIMES[i],blocked=start>groundEnd;
  add('ground','handling-'+i,start,steps[i][0],i===0?'Spacecraft test':'Payload integration',steps[i][1],{
   source:sourceForGround,basis:'Compressed integration animation',major:[0,3,6].includes(i),
   status:blocked?'blocked':undefined,seek:blocked?null:start
  });
 }
 if(groundEnd<INTEGRATION_TIMES.at(-1))add('ground','load-hold',groundEnd,'Payload integration hold','Mission integration',hold,{basis:'Calculated interface or fairing check',major:true,status:'held'});
 else if(hold)add('ground','mass-hold',groundEnd,'Launch mass hold','Mission integration',hold,{basis:'Calculated launch mass screen',major:true,status:'held'});

 const launchDayReference=id==='glenn'||id==='glenn9'?' The 2018 New Glenn guide illustrated five to six hours from the beginning of rollout to launch, including preplanned holds.':
  id==='falconHeavy'?' For Europa Clipper, the published Falcon Heavy countdown called for propellant-loading authorization at T−53 min and first-stage kerosene loading at T−50 min.':'';
 add('countdown','pad',-600,'Final countdown at '+site.name,'Launch control','The assembled vehicle stands on the launch mount at '+site.range+'. The workbench animates the final ten minutes of the count.'+launchDayReference,{basis:'Pad chapter boundary',major:true,source:(id==='glenn'||id==='glenn9')?glennCount:id==='falconHeavy'?falconCount:site.sources[0]});
 for(const [t,key,title,owner,description,basis,source] of countdownCalls(id))add('countdown',key,t,title,owner,description,{basis,source,major:key==='auto-sequence'||key==='commit'});
 const waterSequence=launchWaterSequence(id,site.id),simultaneous=waterSequence.enabled&&waterSequence.startMet===clock.engineStart;
 if(waterSequence.enabled&&!simultaneous)add('countdown','water',waterSequence.startMet,'Activate pad water suppression','Ground systems','Water begins flowing through the selected pad’s exhaust works. Exhaust heats the water as the engines build thrust.',{basis:waterSequence.basis});
 const engineName=star?'Super Heavy engines':id==='falconHeavy'?'Merlin engines':id==='ariane64'?'Vulcain main engine':id==='glenn'||id==='glenn9'?'BE-4 engines':'core engines';
 add('countdown','ignition',clock.engineStart,(simultaneous?'Start water suppression and ':'Start ')+engineName,'Launch propulsion','The core ignition sequence starts while the launch mount still restrains the vehicle.'+(fuel.booster==='solid'?' The solid boosters ignite at liftoff.':''),{basis:'Engine and pad effects clock',major:true});
 add('ascent','liftoff',0,'Liftoff','Launch control','The hold-downs release at '+site.name+'. This physical release defines T zero for every clock in the workbench.'+(fuel.booster==='solid'?' The '+fleet.boosters+' solid motors ignite.':''),{basis:'Release datum',major:true});
 add('ascent','tower',14,'Clear the tower','Launch vehicle guidance','The vehicle climbs above the pad structure. The pad-camera guide uses this instant to inspect exhaust routing and tower clearance.',{basis:'Illustrative pad-camera cue'});
 add('ascent','climb',35,'Climb downrange','Launch vehicle guidance','The pad camera yields to the ascent trajectory. The spacecraft stays restrained as the carrier continues downrange.',{basis:'Illustrative ascent-camera cue'});
 const q=peakAscentPressure(path);
 add('ascent','max-q',q.t,'Estimated maximum dynamic pressure','Flight dynamics','Atmospheric density falls while air-relative speed rises. On this ascent their combined effect peaks at '+number(q.pa/1000,1)+' kPa near '+number(q.altitude,1)+' km altitude.',{basis:'Calculated · 1 s trajectory samples, USSA76 density',source:pressure,major:true,measurements:{dynamic_pressure_pa:q.pa,altitude_km:q.altitude}});
 if(fleet.boosters){
  add('ascent','strap-cutoff',clock.boosterCutoff,fuel.booster==='solid'?'Strap-on motors burn out':'Side boosters cut off','Launch propulsion','Thrust from the '+fleet.boosters+' strap-on boosters ends. The central core continues under power.');
  add('ascent','strap-separate',clock.boosterSeparation,'Separate '+fleet.boosters+' side boosters','Launch vehicle','The side boosters move away from the central core. Their shared separation time is the workbench staging cue.',{major:true});
 }
 if(star){
  add('ascent','hot-stage',clock.hotStage,'Starship hot staging begins','Launch propulsion','Most booster engines shut down. The retained pilot engines keep firing as the six ship engines start.',{major:true});
 }else{
  add(single?'insertion':'ascent','core-cutoff',clock.coreCutoff,single?'Core engine cutoff at insertion':'Main engine cutoff','Launch propulsion','Main-stage thrust ends.'+(single?' The Long March 5B core delivers the payload directly to the insertion state.':' The launch vehicle prepares to pass flight to its upper stage.'),{major:true});
 }
 if(!single){
  add('ascent','stage-separate',clock.stageSeparation,star?'Starship separates from Super Heavy':'Separate the core stage','Launch vehicle',star?'Starship accelerates clear on six engines while Super Heavy starts its directional flip toward the return path.':'The spent first stage falls away and the payload remains attached to the upper stage.',{major:true});
  if(star)add('ascent','boostback',clock.boostbackStart,'Super Heavy boostback ignition','Launch propulsion','The booster is already turning as its return burn builds. The camera continues with Starship. Relative distances and the turn profile are illustrative.',{end:clock.boostbackCutoff,major:true,basis:'SpaceX Flight 14 event clock · nominal V3 animation',source:{title:'SpaceX · Flight 14 mission and timeline',url:'https://www.spacex.com/launches/starship-flight-14'}});
  if(!star)add('ascent','upper-start',clock.upperIgnition,'Upper-stage ignition','Launch propulsion','The upper-stage engine sequence begins. The upper stage carries the spacecraft toward its insertion conditions.');
  add(clock.upperCutoff===INSERTION_MET?'insertion':'ascent','upper-cutoff',clock.upperCutoff,star?'Starship engine cutoff':'Upper-stage engine cutoff','Launch propulsion',star?'The ship coasts with its cargo enclosed until the insertion handoff.':'Upper-stage thrust ends as the reference ascent reaches the insertion boundary.');
 }
 if(!star)add('ascent','jettison',clock.fairingJettison,'Begin fairing separation','Launch vehicle','The two fairing halves move apart. The payload remains on the carrier until commanded release.',{major:true});
 const altitudeKm=Math.hypot(...path.achieved.positionECI)-R;
 add('insertion','orbit',INSERTION_MET,'Reach the insertion handoff','Flight dynamics','The nine-minute site-derived trajectory reaches '+number(altitudeKm,1)+' km. '+(path.gapKm>.02?'The requested orbit begins '+number(path.gapKm)+' km from the site-derived endpoint. The workbench permits this independent orbit study.':'The site-derived endpoint joins the requested insertion state.'),{basis:'Calculated ascent endpoint',major:true,domain:'launch',measurements:{altitude_km:altitudeKm,endpoint_gap_km:path.gapKm,plane_error_deg:path.planeErrorDeg}});
 if(star){
  const a=h.fairing.cargoAccess,allowed=h.fairing.fit&&h.payloadInterface?.passes!==false;
  const basis='ODC reusable side-loading concept · illustrative clock';
  if(!allowed)add('insertion','cargo-hold',clock.doorOpen,'Hold the cargo mechanism','Payload deployment',loadingHoldText(h),{basis,major:true,status:'held',domain:'launch'});
  else{
   const step=(key,met,title,description,measurements,end)=>add('insertion',key,met,title,'Payload deployment',description,{basis,major:true,measurements,end});
   step('door',clock.doorOpen,'Open the retained side hatch','The hinge opens the leeward aperture below the fixed forward flaps. The windward thermal shield stays attached.',{width_m:a.widthM,height_m:a.heightM},clock.hatchClear);
   step('carriage-out',clock.hatchClear,'Extend the loaded carriage','The fully open hatch clears the path. Rails carry the upright spacecraft outward to its release station.',{stroke_m:a.strokeM},clock.release);
   step('fitting-release',clock.release,'Release clamps and clear the fitting','At full extension the guides separate the spacecraft from the adapter before it begins lateral free drift.',{stroke_m:a.strokeM},clock.eject);
   step('release',clock.eject,'Release spacecraft sideways','The stowed vehicle leaves the guided fitting outside the hull and drifts away from the ship.',{release_margin_m:a.depthMarginM},clock.releaseClear);
   step('clear',clock.releaseClear,'Spacecraft clears the carrier','The free spacecraft has moved clear of the retained mechanism. The empty carriage now retracts.');
   step('carriage-home',clock.carriageHome,'Carriage home · close the hatch','The empty carriage is inboard. The side hatch closes against its frame.',null,clock.hatchLatched);
   step('hatch-latched',clock.hatchLatched,'Hatch latched','The cargo opening is closed with the carriage and adapter retained. Both forward flaps stay on the fixed hull.');
  }
 }else{
  add('insertion','release',clock.release,'Release the spacecraft','Payload deployment','The spacecraft begins separating from its launch fitting. The adapter remains with the carrier.',{end:clock.releaseClear,basis:'Separation animation',major:true});
  add('insertion','clear',clock.releaseClear,'Complete initial separation','Spacecraft operations','The spacecraft and carrier have reached the end of the modeled clearance maneuver. Solar wings and radiator packs remain stowed until commissioning.',{basis:'Separation animation'});
 }
 return rows.sort((a,b)=>a.start-b.start);
}
