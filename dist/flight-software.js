// The console reads a single accepted simulation snapshot. Its controls change the view only.
import {attitudeLimits,modeRules} from './attitude-guidance.js';

export const flightLoops={executive:'Mode executive',surfaces:'Solar & thermal',body:'Body & engines',terminal:'Antenna & optics'};
const esc=s=>String(s??'—').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const value=(v,u='',p=1)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:p})+(u?' '+u:''):'—';
const angle=(x,d=1)=>value(x,'°',d);
const watts=kw=>Number.isFinite(kw)&&Math.abs(kw)<.1?value(kw*1000,'W',2):value(kw,'kW',2);
const pct=x=>Number.isFinite(x)?value(100*Math.min(1,Math.max(0,x)),'%',1):'—';
export const sunNormalAngle=cos=>Number.isFinite(cos)?Math.acos(Math.min(1,Math.abs(cos)))*180/Math.PI:null;
const row=(name,v)=>'<div><dt>'+esc(name)+'</dt><dd>'+esc(v)+'</dd></div>';
const standby=s=>s.referenceBody||s.spacecraftModelEndedAt!=null&&s.t>=s.spacecraftModelEndedAt;
const sources=[
 ['ISS thermal control','NASA describes edge-to-Sun radiator tracking in sunlight and Earth-facing operation for cold protection.','https://www.nasa.gov/wp-content/uploads/2021/02/473486main_iss_atcs_overview.pdf'],
 ['Space station motion control','The ISS provides a flight reference for controlling a large spacecraft with a gyro cluster and external torques.','https://ntrs.nasa.gov/citations/20240003654'],
 ['Hubble pointing and determination','Rate gyros and absolute attitude observations serve different purposes in a flight pointing system.','https://science.nasa.gov/mission/hubble/observatory/design/pointing-control/'],
 ['Hubble antenna pointing','High-gain antennas track the communications target while the observatory performs its pointing task.','https://science.nasa.gov/mission/hubble/observatory/design/design-communications/'],
 ['Goddard core Flight System','Flight software can separate scheduling, command sequences, housekeeping and threshold monitoring.','https://etd.gsfc.nasa.gov/capabilities/core-flight-system/catalog/']
];
export const softwareSources=()=>sources.map(([title,note,url])=>'<li><a href="'+url+'" target="_blank" rel="noopener">'+esc(title)+' ↗</a><span>'+esc(note)+'</span></li>').join('');
const modeClass={
 launch:['Carrier authority','Launch restraints keep the spacecraft folded.'],
 insertion:['Separation hold','Use the velocity direction for the body reference while the drives remain restrained.'],
 deployment:['Commissioning','The deployment sequence owns the hinges. Tracking joints hand over when the banks latch.'],
 prepoint:['Upcoming maneuver','Rotate toward the planned thrust direction. Park the two banks for the burn.'],
 reboost:['Orbit maintenance','Track the prograde maneuver direction as the engines restore orbital energy.'],
 trim:['Insertion trim','Track the maneuver direction as the engines correct the insertion orbit.'],
 disposal:['Disposal maneuver','Use the signed burn direction required by the selected retirement maneuver.'],
 coast:['Disposal coast','The spacecraft follows its retirement trajectory between powered maneuvers.'],
 contact:['Visible ground terminal','The communications deck points toward the station and the selected terminal attempts acquisition.'],
 desat:['Scheduled momentum unload','Magnetic rods exchange angular momentum with Earth’s field.'],
 eclipse:['Earth shadow','Direct solar power is zero. The wings follow the predicted Sun and the radiator controller reads the loop temperature.'],
 passive:['Passivated','The controller holds the final encoders.']
};
const phases={
 A:'Choose the reference attitude and size the actuators it will rely on.',
 B:'Trace the motion command through the loop and inspect its feedback.',
 C:'Compare the pointing solution with the hardware and environment at this instant.',
 D:'Follow the transfer of authority from the launch vehicle to the spacecraft.',
 E:'Observe the commands the onboard controller is issuing at this flight instant.',
 F:'Trace the final thrust command, coast and termination of vehicle control.'
};
function stateHeader(s){
 if(standby(s))return '<div class="fs-mode"><span class="fs-symbol">■</span><div><small>END OF VEHICLE TELEMETRY</small><h3>Flight control record closed</h3><p>The trajectory display continues beyond the last spacecraft control state.</p></div></div>';
 const [why,desc]=modeClass[s.attitudeMode]||['Nominal policy',s.attitudeObjective||'The selected nominal body law supplies the reference attitude.'];
 return '<div class="fs-mode"><span class="fs-symbol" aria-hidden="true">◎</span><div><small>'+esc(why)+'</small><h3>'+esc(s.attitudeModeLabel||'Awaiting vehicle state')+'</h3><p>'+esc(desc)+'</p></div></div>';
}
// Side section through the Sun vector and panel normal. Rotating the sketch around
// the incoming beam would give the same projected area. The render is illustrative in eclipse.
function incidencePlate(label,cos,shadow){
 const a=sunNormalAngle(cos);if(a===null)return '';
 return '<figure class="fs-incidence"><figcaption>'+esc(label)+'</figcaption><svg viewBox="0 0 148 72" role="img" aria-label="'+esc(label+' normal is '+angle(a)+' from the Sun')+'"><g class="fs-rays'+(shadow?' fs-shadow':'')+'"><path d="M4 20h40m-5-4 5 4-5 4M4 36h40m-5-4 5 4-5 4M4 52h40m-5-4 5 4-5 4"/></g><g transform="rotate('+a.toFixed(2)+' 91 36)"><path class="fs-panel-edge" d="M91 9v54"/><path class="fs-normal" d="M90 36H62m6-4-6 4 6 4"/></g></svg><strong>'+angle(a)+'</strong><span>'+pct(cos)+' of broadside area</span></figure>';
}
function surfaces(s){
 if(s.t<540)return '<h4>Mechanisms restrained</h4><p>The launcher owns pointing. The stowed wings and radiator banks are inside the payload accommodation. The flight drives wait for separation and the deployment sequence.</p><dl class="fs-facts">'+row('Body control',s.attitudeModeLabel)+row('Radiator command',s.radiatorControlLaw)+row('Wing encoder',angle(s.wingPitchDeg))+row('Solar generation',value(s.solarKW,'kW'))+'</dl>';
 const atStop=(a,l)=>Number.isFinite(a)&&Number.isFinite(l)&&Math.abs(Math.abs(a)-l)<.11;
 const limited=[['upper',s.upperRadiatorRollDeg,s.upperRadiatorTrimLimitDeg],['lower',s.lowerRadiatorRollDeg,s.lowerRadiatorTrimLimitDeg]].filter(([,a,l])=>atStop(a,l)).map(([bank])=>bank).join(' and ');
 const clearance=Number.isFinite(s.upperRadiatorTrimLimitDeg)?'<p class="fs-clearance">Available trim about each span &nbsp; Upper ±'+angle(s.upperRadiatorTrimLimitDeg)+' · Lower ±'+angle(s.lowerRadiatorTrimLimitDeg)+'.'+(limited?' The '+limited+' bank is at its travel limit.':'')+'</p>':'';
 const rows=[['Solar wing pitch',s.wingTargetDeg,s.wingPitchDeg],['Upper bank cant',s.upperRadiatorTargetDeg,s.upperRadiatorPitchDeg],['Upper bank trim',s.upperRadiatorTargetRollDeg,s.upperRadiatorRollDeg],['Lower bank cant',s.lowerRadiatorTargetDeg,s.lowerRadiatorPitchDeg],['Lower bank trim',s.lowerRadiatorTargetRollDeg,s.lowerRadiatorRollDeg]];
 return '<div class="fs-surface"><div><h4>Which faces catch sunlight?</h4><p>'+esc(s.radiatorControlLaw||'Waiting for the drive executive')+'. '+(s.eclipse?'Earth blocks the direct beam. The angles show where the Sun would be visible outside shadow.':'At 0° the face meets the Sun broadside. At 90° light grazes the edge. Either face of a radiator can absorb sunlight.')+'</p><div class="fs-plates">'+incidencePlate('Upper radiator',s.upperRadiatorSunCos,s.eclipse)+incidencePlate('Lower radiator',s.lowerRadiatorSunCos,s.eclipse)+'</div></div><div class="fs-table-wrap"><table class="fs-readback"><caption>Joint readback</caption><thead><tr><th>Mechanism</th><th>Command</th><th>Achieved</th></tr></thead><tbody>'+rows.map(([n,c,m])=>'<tr><th>'+esc(n)+'</th><td>'+angle(c)+'</td><td>'+angle(m)+'</td></tr>').join('')+'</tbody></table>'+clearance+'</div></div><dl class="fs-facts">'+row('Array generation',value(s.solarKW,'kW'))+row('Direct heat absorbed by radiators',watts(s.radiatorDirectSolarKW))+row('Loop cold-end feedback',value(s.radiatorControlTemperatureK,'K'))+row('Cold-protection threshold',value(s.radiatorColdThresholdK,'K'))+'</dl>';
}
const quaternion=q=>Array.isArray(q)&&q.length===4?q.map(v=>Number(v).toFixed(3)).join(', '):'—';
function body(s){
 const reason=s.burnHold||({idle:'No maneuver scheduled at this instant.',prepoint:'Aligning the body before ignition.',firing:'Ignition authorized. The engine is firing.',passivated:'Propulsion has been passivated.'})[s.burnPermitState]||'The maneuver executive evaluates alignment, available control torque, tank inventory and plume clearance.';
 return '<h4>Can the spacecraft turn and fire?</h4><p>Guidance builds a target rotation in inertial space. The gyro cluster slews the body within its torque and momentum limits. The fixed engines accelerate the vehicle along body +Z and exhaust along −Z.</p><dl class="fs-facts">'+row('Body pointing residual',angle(s.attitudeSlewErrorDeg,3))+row('Realized body rate',value(s.bodyRateDegS,'°/s',3))+row('Available slew momentum',value(s.availableSlewMomentumNms,'N·m·s'))+row('Engine authorization',s.burnPermitState??'Idle')+'</dl><div class="fs-callout"><b>Ignition gate</b><span>'+esc(reason)+'</span></div><dl class="fs-details">'+row('Thrust-axis error during maneuver',angle(s.burnAxisErrorDeg,3))+row('Magnetic unloading',s.unloadInhibit||(s.desat?'Active':'Available when scheduled'))+row('Applied magnetic torque',value(s.unloadTorqueNm,'N·m',4))+row('Reference quaternion [x, y, z, w]',quaternion(s.bodyReferenceQ))+row('Achieved quaternion [x, y, z, w]',quaternion(s.bodyAttitudeQ))+'</dl>';
}
function executive(s,l){
 const active=modeRules.findIndex(r=>r.id===s.modeRuleId);
 return '<h4>Which request has priority?</h4><p>On each update the executive tests the guards in order. The first match sets the body reference. Lower-priority requests wait for another update.</p><ol class="fs-rules">'+modeRules.map((r,i)=>'<li class="'+(i===active?'fs-winning':'')+'"><span>'+String(i+1).padStart(2,'0')+'</span><div><b>'+esc(r.label)+'</b><small>'+esc(r.guard)+'</small></div><em>'+(i===active?'In control':i<active?'Passed over':'Lower priority')+'</em></li>').join('')+'</ol><dl class="fs-facts">'+row('Planned maneuver lead time',value(s.prepointLeadWindowS??l.prepointS,'s',0))+row('Reference supplied by',s.attitudeModeLabel)+row('Mechanism thermal policy',s.radiatorControlLaw)+'</dl>';
}
function terminal(s,l){
 const dir=s.stationDirectionBody,active=['Ka','Optical'].includes(s.groundLink),read=v=>Array.isArray(v)?v.map(x=>x.toFixed(3)).join(', '):'—';
 return '<h4>Does a visible station have a usable beam?</h4><p>The terminal transforms the station line of sight into body coordinates, limits the command to the steering cone, then slews and acquires. Direct customer data can leave once the pointing and link conditions permit transfer.</p><dl class="fs-facts">'+row('Ground station',s.station||'None in view')+row('Terminal state',s.terminalState)+row('Steering half-cone',angle(l.terminalConeDeg))+row('Direct payload lock',s.directPayloadLock?'Locked':'No lock')+'</dl><dl class="fs-details">'+row('Station direction in body axes',read(dir))+row('Achieved terminal boresight in body axes',active?read(s.groundLink==='Optical'?s.opticalBoresightBody:s.dishBoresightBody):'—')+row('Travel margin to station',angle(s.terminalConeMarginDeg,3))+row('Error including modeled jitter',angle(s.lockErrorDeg,6))+row('Beam half-angle',angle(s.terminalBeamHalfDeg,6))+row('Achieved goodput',value(s.goodputMbps,'Mbit/s',2))+'</dl>';
}
export function renderFlightConsole(h,s,p,key='surfaces'){
 const l=attitudeLimits(h),ended=standby(s);
 const main=ended?'':(key==='executive'?executive(s,l):key==='body'?body(s):key==='terminal'?terminal(s,l):surfaces(s));
 return stateHeader(s)+main;
}
export function flightSoftware(h,s,p,key){
 const limit=attitudeLimits(h);
 return '<section class="panel fs-console"><header class="panelhead"><h2>Flight control console</h2><span class="tag">PHASE '+p+'</span></header><div class="fs-pad"><p class="fs-intro">'+phases[p]+'</p><div class="fs-tabs" role="group" aria-label="Control loop">'+Object.entries(flightLoops).map(([k,n])=>'<button class="chip" type="button" data-flight-loop="'+k+'" aria-pressed="'+(key===k)+'">'+n+'</button>').join('')+'</div><div data-flight-readback>'+renderFlightConsole(h,s,p,key)+'</div><details class="fs-basis"><summary>Control laws, assumptions and flight references</summary><p>Navigation supplies the propagated orbit, calculated Sun and station directions, and ideal knowledge of the achieved body attitude. A quaternion describes the rotation from body axes to inertial space. The model uses rate- and authority-limited rigid-body motion. Sensor outages, gyro bias estimation, structural vibration and detailed servo stability remain outside this simulation.</p><p>The study allocates '+value(limit.wingRateDegS,'°/s')+' to the wings and '+value(limit.radiatorTrimRateDegS,'°/s')+' to radiator trim. The two-sided banks unfold, latch, then rotate about their span. In sunlight they seek grazing incidence. In eclipse the controller reads the integrated radiator temperature as the loop’s cold-end sensor. A cold loop seeks Earth infrared and a warm loop reduces exposure. A temperature deadband prevents repeated switching. Travel, clearance, parking and slew time can all leave a bank exposed.</p><ul>'+softwareSources()+'</ul></details></div></section>';
}
