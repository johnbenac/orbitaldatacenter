// All platform reference dimensions are rectangular installation envelopes in metres.
const airbus='https://www.airbus.com/sites/g/files/jlcbta136/files/';
const spec=(model,unitKg,rawUnitMomentumNms,rawUnitTorqueNm,mechanismDimsM,electronicsDimsM,electronicsCount,unitIdleW,unitManeuverW,sheet)=>({model,unitKg,rawUnitMomentumNms,rawUnitTorqueNm,mechanismDimsM,electronicsDimsM,electronicsCount,unitIdleW,unitManeuverW,referenceUrl:airbus+sheet});
export const gyroCatalog=[
 spec('CMG 15-45 S',18.4,15,45,[.27,.27,.35],[.31,.30,.15],1,25,75,'2022-02/AVIONICS-CMG15-45-v5-2022.pdf'),
 spec('CMG 40-60 S',38,40,60,[.37,.465,.5],[.31,.21,.175],2,55,95,'2022-10/AVIONICS-CMG40-60S-v6_2022.pdf'),
 spec('CMG 75-75 S',69,75,75,[.55,.50,.57],[.39,.25,.175],2,57,145,'2022-10/AVIONICS-CMG75-75S-v7_2022.pdf')
];
export const issGyros={
 stationKg:419725,count:4,unitKg:600*.45359237,mechanismDimsM:[45,48,54].map(i=>.0254*i),unitH:4760,unitT:258,
 massSource:'https://www.nasa.gov/international-space-station/space-station-facts-and-figures/',
 sizeSource:'https://www.nasa.gov/wp-content/uploads/2023/05/398418main-sts129-press-kit.pdf',
 performanceSource:'https://ntrs.nasa.gov/citations/20100021932'
};
const volume=v=>v.reduce((a,b)=>a*b,1),count=4,directionalFactor=.5;
// A fixed four-unit pyramid. Inputs set the operational envelope. For larger custom
// requests, geometric similarity at constant tip speed gives H ∝ L^4 and mass ∝ L^3.
// Hold reference gimbal speed (T = Hω). Engineering extrapolation only.
export function sizeGyros(d){
 const family=gyroCatalog.find(r=>count*directionalFactor*r.rawUnitMomentumNms>=d.cmgMomentumNms&&count*directionalFactor*r.rawUnitTorqueNm>=d.cmgTorqueNm)??gyroCatalog.at(-1);
 const ratio=Math.max(1,d.cmgMomentumNms/(count*directionalFactor*family.rawUnitMomentumNms),d.cmgTorqueNm/(count*directionalFactor*family.rawUnitTorqueNm));
 const length=ratio**.25,mass=length**3,scaled=a=>a.map(v=>v*length);
 const mechanismDimsM=scaled(family.mechanismDimsM),electronicsDimsM=scaled(family.electronicsDimsM);
 return {...family,count,directionalFactor,catalogMatch:ratio===1,unitKg:family.unitKg*mass,referenceUnitKg:family.unitKg,referenceManeuverW:family===gyroCatalog[0]?null:family.unitManeuverW,referenceDimsM:family.mechanismDimsM,totalKg:count*family.unitKg*mass,
  mechanismDimsM,electronicsDimsM,envelopeM3:count*volume(mechanismDimsM)+family.electronicsCount*volume(electronicsDimsM),
  rawUnitMomentumNms:family.rawUnitMomentumNms*ratio,rawUnitTorqueNm:family.rawUnitTorqueNm*ratio,
  plannedMomentumNms:count*directionalFactor*family.rawUnitMomentumNms*ratio,plannedTorqueNm:count*directionalFactor*family.rawUnitTorqueNm*ratio,
  unitIdleW:family.unitIdleW*mass,unitManeuverW:family.unitManeuverW*mass,idleW:count*family.unitIdleW*mass,maneuverW:count*family.unitManeuverW*mass};
}
export const avionics={
 suiteMassKg:12,suiteDimsM:[.30,.25,.16],operatingW:45,packetBytes:256,
 referenceUrl:'https://www.moog.com/content/dam/moog/literature/sdg/space/avionics/moog-integrated-avionics-unit-datasheet.pdf',
 nasaUrl:'https://www.nasa.gov/smallsat-institute/sst-soa/small-spacecraft-avionics/',
 functionsUrl:'https://technology.nasa.gov/patent/TOP2-239'
};
const f=(v,p=2)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:p}):'—';
const table=(headers,rows)=>'<div class="arch-scroll" role="region" tabindex="0" aria-label="'+headers[0]+' comparison"><table class="arch-table"><thead><tr>'+headers.map(x=>'<th scope="col">'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((c,i)=>i?'<td>'+c+'</td>':'<th scope="row">'+c+'</th>').join('')+'</tr>').join('')+'</tbody></table></div>';
const source=(url,name)=>'<a href="'+url+'" target="_blank" rel="noopener">'+name+' ↗</a>';
function ratios(m,h,t,v,spacecraftKg){
 return {massFraction:100*m/spacecraftKg,litresPerT:v*1e6/spacecraftKg,litresPerKg:v*1e3/m,hPerT:h*1000/spacecraftKg,tPerT:t*1000/spacecraftKg};
}
export function gyroComparison(h,s={}){
 const a=issGyros,c=h.cmg,vehicleKg=s.wetKg??h.wetKg,m=a.count*a.unitKg,v=a.count*volume(a.mechanismDimsM);
 return {massBasisKg:vehicleKg,iss:ratios(m,a.count*a.unitH,a.count*a.unitT,v,a.stationKg),installed:ratios(c.totalKg,4*c.rawUnitMomentumNms,4*c.rawUnitTorqueNm,c.envelopeM3,vehicleKg),
  scaledMassKg:vehicleKg*m/a.stationKg,scaledVolumeM3:vehicleKg*v/a.stationKg,scaledScalarMomentumNms:vehicleKg*a.count*a.unitH/a.stationKg,scaledScalarTorqueNm:vehicleKg*a.count*a.unitT/a.stationKg};
}
export function gyroCandidateDesign(input,id,hardware){
 if(id==='iss'){
  const raw=gyroComparison(hardware).scaledScalarMomentumNms;
  return {...input,cmgMomentumNms:Math.max(2,Math.min(20000,Math.round(directionalFactor*raw)))};
 }
 const g=gyroCatalog.find((_,index)=>String(index)===String(id));
 if(!g)throw Error('Unknown gyroscope candidate');
 return {...input,cmgMomentumNms:count*directionalFactor*g.rawUnitMomentumNms,cmgTorqueNm:Math.min(input.cmgTorqueNm,count*directionalFactor*g.rawUnitTorqueNm)};
}
export function renderGyroBenchmark(h,s={},day=null,phase='E'){
 const c=h.cmg,a=issGyros,{iss,installed,scaledMassKg,scaledVolumeM3,scaledScalarMomentumNms,scaledScalarTorqueNm,massBasisKg}=gyroComparison(h,s);
 const H=Math.max(0,s.momentumNms||0,day?.peakMomentumNms||0),T=Math.max(day?.peakControlTorqueNm||0,(s.torqueNm||0)+Math.abs(s.slewTorqueNm||0));
 const editable=['A','B','C'].includes(phase);
 const candidates=gyroCatalog.map((g,i)=>[source(g.referenceUrl,g.model)+(editable?' <button type="button" class="chip" data-gyro-case="'+i+'" aria-label="Review cluster of four '+g.model+' gyroscopes">Use cluster</button>':''),f(4*g.unitKg),f(4*g.rawUnitMomentumNms),f(2*g.rawUnitMomentumNms),f(2*g.rawUnitTorqueNm),f(2*g.rawUnitMomentumNms-H),f(2*g.rawUnitTorqueNm-T)]);
 const tryISS=editable?'<button type="button" class="btn" data-gyro-case="iss">Try ISS momentum per tonne</button>':'';
 const issDesignH=Math.max(2,Math.min(20000,Math.round(gyroComparison(h).scaledScalarMomentumNms*directionalFactor)));
 const metrics=[['Cluster fraction of vehicle mass (%)','massFraction'],['Cluster envelope per vehicle tonne (L/t)','litresPerT'],['Cluster envelope per gyro-system mass (L/kg)','litresPerKg'],['Scalar momentum per vehicle tonne (N·m·s/t)','hPerT'],['Scalar torque sum per vehicle tonne (N·m/t)','tPerT']];
 return '<section class="panel lowerpan"><div class="panelhead"><h2>Control moment gyroscope sizing</h2><span class="arch-stamp">FOUR ACTUATORS</span></div><div class="arch-pad"><h3>'+c.count+' × '+c.model+(c.catalogMatch?'':' · scaled study derivative')+'</h3><p>The selected cluster carries '+f(c.totalKg,1)+' kg including drive electronics. The four rotors provide '+f(4*c.rawUnitMomentumNms)+' N·m·s in scalar sum. The directional planning envelope is '+f(c.plannedMomentumNms)+' N·m·s and '+f(c.plannedTorqueNm)+' N·m. The controller is limited to '+f(h.input.cmgMomentumNms)+' N·m·s and '+f(h.input.cmgTorqueNm)+' N·m.</p><p class="arch-method">The study allocates 50% of each scalar sum to directional authority. This assumption depends on the operating gimbal configuration. A verified steering law, gimbal history and singularity analysis would refine the envelope.</p></div>'+
 table(['Sizing metric','International Space Station','Current spacecraft'],metrics.map(([name,key])=>[name,f(iss[key],3),f(installed[key],3)]))+
 '<div class="arch-pad"><p>NASA lists four double-gimbal units at about 272 kg each, 1.143 × 1.219 × 1.372 m per assembly, on a 419,725 kg station. Each stores 4,760 N·m·s and produces up to 258 N·m. Scaling those ratios to the current '+f(massBasisKg,0)+' kg spacecraft gives a cluster of '+f(scaledMassKg,1)+' kg, '+f(scaledVolumeM3*1000,1)+' L, '+f(scaledScalarMomentumNms,1)+' N·m·s and '+f(scaledScalarTorqueNm,2)+' N·m in scalar sums. At the same 50% planning factor the mass-proportional benchmark would allow '+f(scaledScalarMomentumNms/2,1)+' N·m·s, compared with '+f(H,1)+' N·m·s of modeled momentum demand in this selection. The installed cluster has '+f(c.totalKg/scaledMassKg,1)+' times the mass of that simple scaling. Actual unit dimensions and electronics set a practical lower size for a four-unit cluster.</p><p class="arch-method">The ISS momentum study sets the controller’s usable limit to '+f(issDesignH,0)+' N·m·s using the installed wet mass at launch and the 50% planning factor. The nearest adequate four-gyro package sets the hardware mass and volume.</p>'+tryISS+'<p class="arch-method">Volume uses the sum of enclosing boxes. The Airbus total includes shared electronics. The ISS reference uses the published replaceable-unit envelopes. Each reference is a different class of actuator. '+source(a.sizeSource,'NASA STS-129 press kit')+' · '+source(a.performanceSource,'NASA actuator performance')+' · '+source(a.massSource,'NASA station mass')+'</p><h3>Candidate clusters at this operating point</h3><p>Stored momentum demand is '+f(H)+' N·m·s'+(day?.peakMomentumNms!=null?' using the selected day’s peak or the current value, whichever is larger':' at the selected instant')+'. Torque demand is '+f(T,4)+' N·m including the dish slew'+(day?.peakControlTorqueNm!=null?', taking the greater of the selected-day sampled peak and the cursor value':' at the cursor')+'. The last columns show candidate hardware headroom before the controller cap. Current controller torque headroom is '+f(s.cmgTorqueMarginNm,3)+' N·m. The smallest option with positive headroom can be tried in an independent mission run. Mass, power, temperature and unloading frequency all change with the installed cluster.</p></div>'+
 table(['Four Airbus units','Mass (kg)','Scalar H (N·m·s)','Directional H (N·m·s)','Directional torque (N·m)','Momentum headroom (N·m·s)','Torque headroom (N·m)'],candidates)+
 '<div class="arch-pad"><p class="arch-method">Installed quasi-static power is '+f(c.idleW)+' W. Acquisition approaches '+f(c.maneuverW)+' W. The 15-45 S maximum-maneuver case uses a 3× standby study allowance. The larger catalog units use Airbus values. Requests beyond catalog capacity extrapolate dimensions, mass and power at constant flywheel tip speed and reference gimbal rate. '+source(c.referenceUrl,'Installed hardware reference')+'</p></div></section>';
}
const phaseNotes={
 A:['Command and health requirements','Set the average command traffic and the time between engineering samples. The ground queue bridges contact gaps. The circular recorder sets the lookback available onboard.'],
 B:['Flight computer and engineering recorder','The flight computer validates commands, executes stored sequences and reads engineering sensors. A dedicated engineering recorder preserves platform history independently of the customer workload.'],
 C:['Command path on the assembled vehicle','Check the flight computer power branch, ground command backlog and the sensor log. The S-band uplink delivers commands during direct contact. The spacecraft executes its scheduled activities autonomously.'],
 D:['Launch and checkout','The avionics are powered for checkout. Engineering recording begins at separation. The launch vehicle owns ascent control until release.'],
 E:['Flight execution','The flight computer executes the vehicle timeline during ground-contact gaps. Ground command bytes, the local health log and the power branch follow the shared flight clock.'],
 F:['Terminal sequence','The onboard timeline controls the final maneuver. The health log freezes at the modeled end of spacecraft operation. The ring records engineering history into the final powered interval.']
};
export function renderAvionics(h,s={},phase='B'){
 const a=h.cdh,d=h.input,[title,note]=phaseNotes[phase]??phaseNotes.B,packet=a.packetBytes,lookback=Math.floor(d.hkRecorderMB*1e6/packet)*d.hkPeriodS/3600;
 const logged=s.hkStoredMB??0,used=Math.min(100,100*logged/d.hkRecorderMB),commandLive=(s.commandGoodputKbps||0)>0,logging=(s.hkRateKbps||0)>0;
 const metric=(label,val)=>'<div><small>'+label+'</small><strong>'+val+'</strong></div>';
 const box=(x,y,name,detail,color)=>'<rect x="'+x+'" y="'+y+'" width="150" height="58" rx="8" fill="#182932" stroke="'+color+'"/><text x="'+(x+75)+'" y="'+(y+23)+'">'+name+'</text><text x="'+(x+75)+'" y="'+(y+42)+'" fill="'+color+'" font-size="11">'+detail+'</text>';
 const pct=f(used,1)+'%';
 return '<section class="panel lowerpan"><div class="panelhead"><h2>'+title+'</h2><span class="arch-stamp">PLATFORM AVIONICS</span></div><div class="arch-pad"><p>'+note+'</p>'+
 '<svg role="img" aria-label="Ground commands enter the flight computer. The flight computer dispatches to spacecraft subsystems. Sensors report through the flight computer to the engineering recorder." viewBox="0 0 570 170" style="display:block;width:100%;max-width:720px;margin:1rem auto;font:13px system-ui;text-anchor:middle;fill:#e5edf1"><g stroke-width="2" fill="none"><path d="M160 46h42m-7 -4 7 4 -7 4" stroke="'+(commandLive?'#7ad3bf':'#6c8090')+'"/><path d="M360 46h41m-7 -4 7 4 -7 4" stroke="#8fb3cd"/><path d="M160 127h89q12 0 12-12V79m-4 6 4-6 4 6 M310 79v37q0 11 12 11h80m-7 -4 7 4 -7 4" stroke="'+(logging?'#edc388':'#6c8090')+'"/></g>'+box(10,17,'S-band receiver',commandLive?f(s.commandGoodputKbps)+' kbit/s delivered':'Awaiting commands','#7ab8b2')+box(210,17,'Flight computer',f(1000*(s.cdhServedKW||0),1)+' W supplied','#d8c5a3')+box(410,17,'Vehicle control','Time-tagged sequence','#88a8c2')+box(10,98,'Platform sensors',packet+' B / sample','#b99055')+box(410,98,'Engineering log',pct+' of capacity','#b99055')+'</svg>'+
 '<div class="arch-metrics">'+metric('Ground command queue',f(s.uplinkQueueMB,3)+' MB')+metric('Received command data',f(1000*(s.commandUploadedGB||0),3)+' MB')+metric('Recorded locally',f(logged,3)+' MB')+metric('Engineering lookback',f(lookback,1)+' h')+'</div></div>'+
 table(['Allocation or channel','Current value','Basis'],[
 ['Flight avionics suite',f(a.suiteMassKg)+' kg · '+a.suiteDimsM.map(v=>f(v*1000)).join(' × ')+' mm','Installed envelope including mounting and remote interfaces. Moog’s integrated reference is up to 8.3 kg and 250 × 210 × 120 mm.'],
 ['Electrical draw',f((s.cdhKW||0)*1000,1)+' W requested · '+f((s.cdhServedKW||0)*1000,1)+' W supplied','45 W installed study allowance, including interfaces. Moog lists up to 37 W for its avionics unit. Counted once in auxiliary power.'],
 ['Commands offered',f(d.commandKbps)+' kbit/s','Ground traffic offered during payload service. Backlogged commands use the available S-band uplink before customer data.'],
 ['Command overflow',f(s.uplinkDroppedMB,3)+' MB','Cumulative commands discarded when the '+f(d.uplinkBufferMB)+' MB Earth-side queue fills.'],
 ['Sensor records',f(packet)+' B / '+f(d.hkPeriodS)+' s','Powered mission logging. The aggregate packet size and sampling cadence are study assumptions.'],
 ['Ring overwrite',f(s.hkOverwrittenMB,3)+' MB','When full, the recorder replaces the oldest complete packet. This ledger describes local recording. Earth receipt of the log requires a separately scheduled dump.']
 ])+'<div class="arch-pad"><p class="arch-method">'+source(a.referenceUrl,'Moog integrated avionics datasheet')+' · '+source(a.functionsUrl,'NASA LADEE flight software and interfaces')+' · '+source(a.nasaUrl,'NASA spacecraft avionics')+'</p></div></section>';
}
