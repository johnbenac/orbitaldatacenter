// Engineering readback for the accepted flight state. Rendering never advances the controller.
import {componentInertia,inertiaReferences} from './attitude-inertia.js';
import {attitudeDynamicsReferences} from './attitude-dynamics.js';

const DEG=180/Math.PI;
const axes=['X','Y','Z'];
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const number=(v,d=2)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
const quantity=(v,u,d=2)=>number(v,d)+(Number.isFinite(v)?' '+u:'');
const norm=v=>Array.isArray(v)&&v.every(Number.isFinite)?Math.hypot(...v):null;
const tip=s=>' data-tip="'+esc(s)+'" title="'+esc(s)+'"';
const link=(name,url)=>'<a href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(name)+' ↗</a>';

const references=[
 ...attitudeDynamicsReferences.map(([name,url])=>({name,url})),
 {name:'Airbus CMG mounting and vibration isolation',url:'https://www.airbus.com/sites/g/files/jlcbta136/files/2022-10/AVIONICS-CMG75-75S-v7_2022.pdf'}
];

function massState(h,s){
 const a=s.attitudeDynamics;
 if(a?.inertiaKgM2?.length===9&&a?.principalKgM2?.length===3&&a?.cmM?.length===3){
  return {tensorKgM2:a.inertiaKgM2,principalKgM2:a.principalKgM2,cm:a.cmM};
 }
 return componentInertia(h,{remainingKg:s.propellantKg??h.propellantKg,deployment:s.deployment??1,adapterAttached:!!s.carrierAttached,attitude:s});
}

function mounting(h,properties){
 const stations=h.propulsion.stations?.['04.01']||[],cm=properties.cm;
 const cluster=stations.length?stations.reduce((c,p)=>c.map((v,i)=>v+p[i]/stations.length),[0,0,0]):null;
 const scale=Math.min(132/Math.max(h.bodyLengthM,2*Math.abs(cm[2]),.1),88/Math.max(h.bodyWidthM,.1));
 const x=v=>91+v*scale,y=v=>88-v*scale;
 const cmLabel=Math.min(145,Math.max(96,y(cm[2]))),gyroLabel=cluster?Math.max(24,Math.min(63,y(cluster[2]))):24;
 const width=h.bodyWidthM*scale,height=h.bodyLengthM*scale;
 const offset=cluster?Math.hypot(...cluster.map((v,i)=>v-cm[i])):null;
 const gyroMarks=stations.map(p=>'<circle cx="'+x(p[0])+'" cy="'+y(p[2])+'" r="5" class="ae-gyro-mark"/>').join('');
 const gyroLabelMarkup=cluster?'<path class="ae-gyro-leader" d="M'+x(cluster[0])+' '+y(cluster[2])+'L169 '+gyroLabel+'H180"/><text x="183" y="'+(gyroLabel-3)+'" class="ae-gyro-text">Four CMGs</text><text x="183" y="'+(gyroLabel+12)+'" class="ae-svg-value">Forward mount</text>':'';
 return '<figure class="ae-mount"><svg viewBox="0 0 290 175" role="img" aria-label="'+esc('CMG cluster and vehicle center of mass in the body X–Z plane. Cluster offset '+quantity(offset,'metres',3))+ '"><rect class="ae-body-outline" x="'+(91-width/2)+'" y="'+(88-height/2)+'" width="'+width+'" height="'+height+'" rx="3"/><path class="ae-body-axis" d="M91 12V164"/>'+gyroMarks+gyroLabelMarkup+'<path class="ae-cm-leader" d="M'+x(cm[0])+' '+y(cm[2])+'L169 '+cmLabel+'H180"/><g class="ae-cm-mark" transform="translate('+x(cm[0])+' '+y(cm[2])+')"><circle r="5"/><path d="M-9 0H9M0-9V9"/></g><text x="183" y="'+(cmLabel-3)+'" class="ae-cm-text">Center of mass</text><text x="183" y="'+(cmLabel+12)+'" class="ae-svg-value">Current inventory</text><path class="ae-axis" d="M19 150V124m-3 5 3-5 3 5M19 150h24m-5-3 5 3-5 3"/><text x="10" y="116" class="ae-svg-value">+Z</text><text x="47" y="153" class="ae-svg-value">+X</text></svg><figcaption'+tip('Distance between the four-gyro cluster centroid and the current vehicle center of mass. The mounted gyro masses also contribute to the inertia tensor.')+'><strong>'+quantity(offset,'m',3)+'</strong> cluster offset from center of mass</figcaption></figure>';
}

function inertia(properties){
 const t=properties.tensorKgM2,p=properties.principalKgM2,max=Math.max(...p,1);
 const factor=max>=1e6?1e6:max>=1e4?1000:1,unit=factor===1e6?'10⁶ kg·m²':factor===1000?'10³ kg·m²':'kg·m²';
 const bars=p.map((value,i)=>'<div class="ae-inertia-row"'+tip('Principal moment '+(i+1)+'. '+quantity(value,'kg·m²',3)+'. These directions follow the mass distribution.')+'><span>I'+['₁','₂','₃'][i]+'</span><div class="ae-inertia-track"><i style="width:'+Math.max(1,100*value/max)+'%"></i></div><b>'+number(value/factor,3)+'</b></div>').join('');
 const matrix=axes.map((axis,i)=>'<tr><th scope="row">'+axis+'</th>'+axes.map((other,j)=>'<td'+tip('I'+axis.toLowerCase()+other.toLowerCase()+' = '+quantity(t[3*i+j],'kg·m²',3))+ '>'+number(t[3*i+j]/factor,3)+'</td>').join('')+'</tr>').join('');
 return '<div class="ae-inertia"><h4'+tip('The principal moments are the eigenvalues of the symmetric inertia tensor about the instantaneous center of mass. Larger values require more torque for the same angular acceleration.')+'>Principal moments <small>'+unit+'</small></h4>'+bars+'<table class="ae-tensor"><caption>Full tensor in body axes <span>'+unit+'</span></caption><thead><tr><th scope="col">I</th>'+axes.map(a=>'<th scope="col">'+a+'</th>').join('')+'</tr></thead><tbody>'+matrix+'</tbody></table></div>';
}

function torqueChart(a){
 const requested=a.requestedTorqueNm||[],applied=a.appliedTorqueNm||[];
 const max=Math.max(1e-8,...requested.map(Math.abs),...applied.map(Math.abs));
 const width=204,origin=168,span=width/2;
 const rows=axes.map((axis,i)=>{
  const y=37+i*44,command=requested[i],actual=applied[i];
  const bar=(value,dy,cls)=>Number.isFinite(value)?'<path class="'+cls+'" d="M'+origin+' '+(y+dy)+'h'+(span*value/max)+'"/>':'';
  return '<text x="10" y="'+(y+1)+'" class="ae-chart-axis">'+axis+'</text>'+bar(command,-4,'ae-command')+bar(actual,5,'ae-achieved')+'<text x="374" y="'+(y-2)+'" text-anchor="end" class="ae-command-text">'+number(command,4)+'</text><text x="374" y="'+(y+13)+'" text-anchor="end" class="ae-achieved-text">'+number(actual,4)+'</text>';
 }).join('');
 return '<div class="ae-torque"><div class="ae-chart-key"><span class="ae-command-key">Requested</span><span class="ae-achieved-key">Applied</span><span>N·m</span></div><svg viewBox="0 0 390 154" role="img" aria-label="Requested and applied gyro torque by body axis. Both traces use the same scale."><path class="ae-chart-zero" d="M'+origin+' 15V139"/>'+rows+'<text x="'+origin+'" y="151" text-anchor="middle" class="ae-svg-value">0</text></svg></div>';
}

function gimbals(a){
 const angles=a.gimbalAnglesRad||[],rates=a.gimbalRatesRadS||[],max=a.gimbalRateLimitRadS;
 return '<div class="ae-gimbal-head"><h4>Gimbal encoders</h4><span'+tip('The installed rotor torque divided by rotor momentum sets the modeled maximum gimbal rate. The steering solution applies this finite limit.')+'>'+ (Number.isFinite(max)?quantity(max*DEG,'°/s',2)+' speed limit':'')+'</span></div><div class="ae-gimbals">'+[0,1,2,3].map(i=>{
  const degrees=Number.isFinite(angles[i])?((angles[i]*DEG+180)%360+360)%360-180:null;
  return '<div class="ae-gimbal"'+tip('Gyro '+(i+1)+'. The pointer shows its gimbal encoder wrapped to ±180°. The mechanism may rotate continuously. The lower value is its realized gimbal speed. The 3D gimbals follow these simulated angles. Rotor spin is slowed for visibility.')+'><span>Gyro '+(i+1)+'</span><svg viewBox="0 0 60 50" aria-hidden="true"><circle cx="30" cy="25" r="19"/><path class="ae-encoder-ticks" d="M30 3v7M30 40v7M8 25h7M45 25h7"/>'+ (degrees===null?'':'<g transform="rotate('+degrees+' 30 25)"><path class="ae-encoder-pointer" d="M30 25V10"/><circle cx="30" cy="25" r="3"/></g>')+'</svg><b>'+quantity(degrees,'°',1)+'</b><small>'+quantity(rates[i]*DEG,'°/s',2)+'</small></div>';
 }).join('')+'</div>';
}

function vectorRow(label,values,unit,explanation){
 return '<tr><th scope="row"'+tip(explanation)+'>'+label+'<small>'+unit+'</small></th>'+axes.map((_,i)=>'<td>'+number(values?.[i],4)+'</td>').join('')+'</tr>';
}

function actuatorState(s){
 const a=s.attitudeDynamics;
 if(!a)return '<div class="ae-wait"><h3>Follow the applied control torque</h3><p>Select a free-flight instant to inspect the gyro steering solution, body angular rate and external torques.</p></div>';
 const limited=a.rateLimited||a.momentumLimited||a.torqueLimited||a.status==='Limited steering direction';
 const names={'Tracking':'Closed-loop pointing','Carrier controlled':'Carrier pointing authority','Last controlled state':'Actuators passivated','Momentum limit':'Momentum envelope reached','Gimbal rate limit':'Gimbal-rate limit active','Torque limit':'Gyro torque limit active'};
 const status=names[a.status]||a.status||(a.momentumLimited?'Momentum envelope reached':a.rateLimited?'Gimbal-rate limit active':s.attitudeMode==='launch'?'Carrier pointing authority':s.attitudeMode==='passive'?'Actuators passivated':'Closed-loop pointing');
 const condition=Number.isFinite(a.steeringCondition)?Math.max(0,Math.min(1,a.steeringCondition)):null;
 const conditionBar=condition===null?'':'<meter min="0" max="1" value="'+condition+'" aria-label="Steering condition">'+number(condition,3)+'</meter>';
 return '<div class="ae-actuators"><header><h3>Requested and delivered torque</h3><span class="ae-status'+(limited?' ae-limit':'')+'">'+esc(status)+'</span></header><p class="ae-explain">The controller asks for a turn. The gyro steering solution shares that request among four finite-speed gimbals.</p>'+torqueChart(a)+gimbals(a)+'<dl class="ae-facts"><div class="ae-pointing"'+tip('The smallest rotation angle between the achieved body orientation and the commanded attitude reference. This is the geodesic angle between their quaternions.')+'><dt>Body pointing error</dt><dd>'+quantity(s.attitudeSlewErrorDeg,'°',5)+'</dd></div><div'+tip('The smallest singular value divided by the largest. Values approaching zero indicate a direction in which the current gimbal arrangement has little torque authority.')+'><dt>Steering condition</dt><dd>'+number(condition,3)+conditionBar+'</dd></div><div'+tip('Difference between the current feedback torque request and torque produced by the most recently held gimbal rates. Control sampling and changing geometry contribute alongside actuator limits.')+'><dt>Torque residual</dt><dd>'+quantity(a.torqueResidualNm,'N·m',5)+'</dd></div><div'+tip('Magnitude of the achieved three-axis angular velocity relative to inertial space.')+'><dt>Body angular speed</dt><dd>'+quantity(a.bodyRateRadS?norm(a.bodyRateRadS)*DEG:null,'°/s',4)+'</dd></div><div'+tip('Signed rotor angular momenta are added as vectors before taking the magnitude.')+'><dt>Cluster momentum</dt><dd>'+quantity(norm(a.cmgMomentumBodyNms),'N·m·s',2)+'</dd></div></dl><div class="ae-vector-wrap"><table class="ae-vectors"><caption>Signed body-frame vectors</caption><thead><tr><th scope="col">Quantity</th>'+axes.map(axis=>'<th scope="col">'+axis+'</th>').join('')+'</tr></thead><tbody>'+vectorRow('Gyro momentum',a.cmgMomentumBodyNms,'N·m·s','The vector sum of all four rotor momenta in the spacecraft body frame.')+vectorRow('Articulation momentum',a.mechanismMomentumBodyNms,'N·m·s','Angular momentum carried by the prescribed motion of solar arrays, radiator banks and steerable terminals about the current vehicle center of mass.')+vectorRow('Disturbance torque',a.externalTorqueNm,'N·m','Aerodynamic, solar-pressure, gravity-gradient and thrust-offset torques acting on the current spacecraft configuration.')+vectorRow('Magnetic unloading',a.magneticTorqueNm,'N·m','The cross product of commanded magnetic dipole and local magnetic field. Its direction is perpendicular to that field.')+'</tbody></table></div></div>';
}

export function renderAttitudeReadback(h,s,phase){
 const properties=massState(h,s);
 return '<div class="ae-columns" data-attitude-engineering><article class="ae-mass"><h3>Mass that must turn</h3><p class="ae-explain">Equipment, deployed surfaces and the current tank inventory determine the resistance to rotation about every axis.</p>'+mounting(h,properties)+inertia(properties)+'<p class="ae-mount-note">A gyro transmits a turning moment through its mount. Its position contributes to mass distribution and structural loading. A stiff load path carries the torque into the body.</p></article>'+actuatorState(s)+'</div>';
}

export function attitudeEngineeringBasis(s={}){
 const a=s.attitudeDynamics||{};
 const tuning=Number.isFinite(a.controlBandwidthRadS)?'The selected feedback bandwidth is '+quantity(a.controlBandwidthRadS,'rad/s',4)+'. ':'';
 const closure=a.angularMomentumResidualNms>0&&a.angularMomentumResidualNms<1e-7?'below 0.0000001 N·m·s':quantity(a.angularMomentumResidualNms,'N·m·s',7);
 const residual=Number.isFinite(a.angularMomentumResidualNms)?'<p>Angular-momentum closure at this instant <strong>'+closure+'</strong>. The momentum-form integrator enforces this balance algebraically. This readout compares the modeled body, mechanism and gyro momentum with accumulated external torque.</p>':'';
 return '<details class="ae-basis"><summary>Equations, physical assumptions and references</summary><p>Each equipment account contributes its own centroidal inertia and the parallel-axis term m[(r·r)1 − rrᵀ]. The tensor is evaluated about the current center of mass. Mass distributions use documented uniform-shape proxies. Moving surface geometry, tank depletion and the attached adapter update this calculation. Off-diagonal entries retain coupling between the body axes. <span class="ae-sources">'+inertiaReferences.map(r=>link(r.name,r.url)).join(' ')+'</span></p><p class="ae-equation"'+tip('R transforms body vectors into inertial coordinates. I is the inertia tensor, ω is body angular velocity, and h is angular momentum relative to the body. The external torque includes the environmental and thrust contributions plus magnetic unloading.')+'>d/dt [R (Iω + h<sub>gyros</sub> + h<sub>mechanisms</sub>)] = R τ<sub>external</sub></p><p>The body and joint solutions use a predictor-corrector step. An initial body rotation sets the joint targets. The body is integrated again using the resulting mass distribution and articulation momentum. Small changes in the mechanism geometry supply local translation and rotation rates for uniform moving-mass proxies.</p><p>The controller uses quaternion error, body angular velocity and a damped steering inverse. The torque residual combines finite controller sampling, changing geometry and actuator limits. '+tuning+'Controller tuning and scaled hardware are design-study assumptions. The 3D gimbals follow the simulated encoder angles, and rotor spin is slowed for visibility. <span class="ae-sources">'+references.slice(0,2).map(r=>link(r.name,r.url)).join(' ')+'</span></p>'+residual+'<p>The study assumes ideal attitude knowledge, ideal mechanism servos, rigid structural members and tank contents represented at their modeled mass stations. The servos follow prescribed, rate-limited joint motion. Mount stiffness, elastic modes, liquid slosh, internal fluid flow, exhaust angular-momentum transport, rotor imbalance and optical pointing jitter require dedicated structural, fluid and sensor models. The supplier’s vibration-isolated mounting provides a hardware reference. <span class="ae-sources">'+link(references[2].name,references[2].url)+'</span></p></details>';
}

export function renderAttitudeEngineering(h,s,phase){
 return '<section class="panel ae-panel"><header class="panelhead"><h2>Attitude engineering</h2><span class="tag">PHASE '+esc(phase)+'</span></header><div class="ae-pad">'+renderAttitudeReadback(h,s,phase)+attitudeEngineeringBasis(s)+'</div></section>';
}
