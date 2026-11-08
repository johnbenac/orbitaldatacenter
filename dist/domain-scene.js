// Pure camera and instrument definitions. Renderers read the resolved hardware
// and flight instant; switching disciplines does not change the numerical state.
import {purposeInfo,purposeId} from './purpose-display.js';
import {launchFleet} from './launch-fleet.js';
import {launchClockFor} from './launch-effects-state.js';
const defs={
 mechanical:{label:'Mechanical Design',camera:'spacecraft',parts:['structure','propulsion','propellant','compute','solar','radiator','cmg'],vectors:['dimensions']},
 software:{label:'Flight Software',camera:'spacecraft',parts:['avionics','solar','radiator','communications','cmg','propulsion']},
 avionics:{label:'Command & Data Handling',camera:'core',close:true,parts:['avionics','communications']},
 conops:{label:'Mission operations',camera:'spacecraft',parts:[]},
 environment:{label:'Environmental coupling',camera:'spacecraft',parts:['solar','radiator','structure'],vectors:['sun','albedo','ir','ram']},
 orbit:{label:'Orbit & eclipse',camera:'orbit',parts:[]},
 compute:{label:'Payload Operations',camera:'core',parts:['compute','storage','avionics','communications'],close:true},
 data:{label:'Data & delivery',camera:'core',parts:['storage','avionics','communications'],close:true},
 comm:{label:'Communications',camera:'spacecraft',parts:['communications'],close:true},
 power:{label:'Electrical Power',camera:'spacecraft',parts:['solar','battery']},
 thermal:{label:'Thermal',camera:'core',parts:[],close:true},
 attitude:{label:'Attitude control',camera:'spacecraft',parts:['cmg','torquer','solar','radiator','communications']},
 prop:{label:'Propulsion',camera:'core',parts:['propellant','propulsion'],close:true},
 mass:{label:'Mass budget',camera:'spacecraft',parts:['solar','radiator','structure','compute','storage','avionics','battery','cmg','torquer','propellant','propulsion','communications']},
 launch:{label:'Launch & insertion',camera:'launch',parts:['fairing','adapter','payload','solar','radiator','structure']},
 launcher:{label:'Launch vehicle',camera:'launch',parts:['launcher','booster','fairing']}
};
Object.defineProperty(defs,'purpose',{value:defs.compute,enumerable:false});
export const domainSceneSpecs=defs;
export function recommendedDomainCamera(phase,domain){
 if(phase==='F')return 'orbit';
 if(phase==='D')return domain==='orbit'?'orbit':'launch';
 return defs[domain]?.camera||'spacecraft';
}
export const sceneColors={
 compute:'#68a0c5',storage:'#edbd76',avionics:'#6cd5c2',communications:'#85baf5',solar:'#6aa6c8',
 radiator:'#a9b8c4',structure:'#b6c6cc',battery:'#8dcfa3',cmg:'#d3ad70',torquer:'#89bfbc',
 propellant:'#b9a77c',propulsion:'#e6a56e',launcher:'#c6cfd4',booster:'#ce956b',fairing:'#cdc3a4',adapter:'#72bbac',payload:'#9ab6c0'
};
const f=(n,d=1)=>Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
const met=(x,unit,d=1)=>Number.isFinite(x)?f(x,d)+' '+unit:'—';
const bit=x=>!Number.isFinite(x)?'—':x>=1000?met(x/1000,'Gbit/s',2):x>0&&x<1?met(x*1000,'kbit/s',2):met(x,'Mbit/s',2);
const bytes=x=>!Number.isFinite(x)?'—':x>=1000?met(x/1000,'TB',2):met(x,'GB',2);
function item(anchor,part,title,value,side){return {anchor,part,title,value,side,color:sceneColors[part]||'#d2d4c4'};}
export function routeRates(h,s){
 const ai=h.ai,customer=ai&&ai.purposeId!=='text'?(s.aiUnitRate||0)*ai.outputBytesPerUnit*8/1e6:(s.tokensPerSec||0)*h.input.bytesPerToken*8/1e6;
 const text=Math.max(0,Math.min(s.offeredMbps||0,customer)),bulk=Math.max(0,(s.offeredMbps||0)-text);
 return {text,bulk,offered:s.offeredMbps||0,write:Math.min(Math.max(0,s.offeredMbps||0),Math.max(0,h.diskWriteGBs)*8000),down:Math.max(0,s.goodputMbps||0),up:Math.max(0,s.commandGoodputKbps||0)/1000};
}
export function domainInstruments(key,h,s,{view='spacecraft',reference=false}={}){
 key=key==='purpose'?'compute':key;
 const rd=routeRates(h,s),stage=s.flightPhase||'operations',inLaunch=['integration','pad','ascent','insertion'].includes(stage);
 const flows=s.terminalActivity||[],payload=flows.find(f=>f.direction==='tx'&&f.services.payload>0);
 const down=flows.filter(f=>f.route==='direct'&&f.direction==='tx').reduce((n,f)=>n+f.mbps,0);
 const link=payload?(payload.route==='relay'?'Relay':payload.terminal)+' · '+bit(payload.mbps):s.station?'Visible · '+s.station:'Waiting for contact';
 const launchRef=reference?'Design reference':stage,fmtI=(x,u)=>met(x,u,0);
 if(view==='orbit'){
  if(key==='orbit'||key==='launch'||key==='launcher'||key==='environment'||key==='conops')return [
   item('orbitCraft','communications',inLaunch?'Insertion altitude':'Spacecraft',met(s.altitudeKm,'km')+' · '+(s.eclipse?'shadow':'sunlit'),'right'),
   item('orbitGround','solar','Orbit plane','β '+met(s.betaDeg,'°')+' · '+met(s.periodSec/60,'min'),'left')
  ];
  if(key==='attitude'||key==='software')return [item('orbitCraft','cmg','Body axes · directions',s.attitudeModeLabel||'Guided attitude','right'),item('orbitGround','solar','Nadir footprint',met(s.altitudeKm,'km above ground',0),'left')];
  if(key==='data'||key==='comm')return [item('orbitCraft','communications','Spacecraft link',link,'right'),...(s.station?[item('station','avionics',s.station,bit(down)+' to station','left')]:[])];
  return [];
 }
 if(view==='launch'&&stage==='ascent'&&h.input.launcher==='starship'&&['launcher','launch','conops'].includes(key)){
  const clock=launchClockFor('starship');
  if(s.t>=clock.stageSeparation&&s.t<clock.boostbackCutoff)return [
   item('shroud','launcher','Starship','Six Raptors firing','right'),
   item('thrustDeck','booster','Super Heavy',s.t<clock.boostbackStart?'Turning for boostback':'Boostback burn','left')
  ];
 }
 if(view==='launch'&&key!=='launch'&&key!=='launcher'&&key!=='conops'&&reference)return [];
 switch(key){
 case 'mechanical':return [item('body','structure','Primary structure',met(h.bodyLengthM,'m')+' along launch axis','left'),item('solarRoot','solar','Solar bearing','Side-frame hardpoint','right'),item('radiatorRoot','radiator','Radiator root','Side-frame hardpoint','left')];
 case 'software':return [item('avionics','avionics','Flight computer',s.attitudeModeLabel||'Launch hold','left'),item('body','cmg','Body tracking error',met(s.attitudeSlewErrorDeg,'°',2),'right')];
 case 'avionics':{
  const command=flows.find(f=>f.services.command>0),rate=command?command.services.command*8000/command.seconds:0;
  return [item('avionics','avionics','Spacecraft flight computer',met(s.cdhKW*1000,'W'),'left'),item('patch','communications','Ground commands',bit(rate)+' received','right')];
 }
 case 'data':if(h.ai&&purposeId(h)!=='text')return [item('avionics','avionics','Customer input staged',bytes(s.aiInputBufferGB),'left'),item('storage','storage',purposeInfo(h).output,bytes(s.aiProductQueueGB)+' queued','left'),item('activeTerminal','communications','Returned to Earth',bytes(s.aiProductDeliveredGB),'right')];return [
  {...item('avionics','avionics','Flight data switch',bit(rd.offered)+' offered','left'),detail:'Text '+bit(rd.text)+' · bulk '+bit(rd.bulk)},
  {...item('storage','storage','Payload recorder',bytes(s.queueGB)+' queued','left'),detail:'Text '+bytes(s.textQueueGB)+' · bulk '+bytes(s.bulkQueueGB)},
  {...item('activeTerminal','communications',payload?.peer||s.station||'Downlink terminal',link,'right'),detail:bytes(s.deliveredGB)+' delivered to ground'}
 ];
 case 'power':return [item('solar','solar',(s.pvDeployment??s.deployment)===0?'Stowed solar array':s.eclipse?'Array · eclipse':'Array generation',met(s.solarKW,'kW',2),'left'),item('battery','battery','Battery pack',met(s.socPct,'%')+' · '+(s.chargeKW>.001?met(s.chargeKW,'kW in'):s.dischargeKW>.001?met(s.dischargeKW,'kW out'):'standby'),'right')];
 case 'thermal':return [item('compute','compute','Junction',met(s.junctionK,'K'),'left'),item('coolant','radiator','Coolant loop',met(s.coolantK,'K'),'right'),item(view==='core'?'battery':'radiator',view==='core'?'battery':'radiator',view==='core'?'Battery':'Radiator',met(view==='core'?s.batteryK:s.radiatorK,'K'),'right')];
 case 'comm':return [['S-band','patch','S-band patch','#74e3cf'],['Ka','dish','Ka reflector','#ffd18c'],['Optical','optic','Optical terminal','#c4b2ff']].map(([terminal,anchor,name,color],i)=>{
  const traffic=flows.filter(f=>f.terminal===terminal),tx=traffic.find(f=>f.direction==='tx'),rx=traffic.find(f=>f.direction==='rx');
  const status=f=>(f.direction==='tx'?'Send ':'Receive ')+bit(f.mbps)+(f.route==='relay'?' · relay':'');
  const idle=!s.carrierAttached&&s.station&&s.groundLink===terminal&&s.terminalState==='acquiring'?'Acquiring '+s.station:'Idle';
  return {...item(anchor,'communications',name,tx?status(tx):rx?status(rx):idle,i===2?'right':'left'),color,...(rx&&tx?{detail:status(rx)}:{})};
 });
 case 'attitude':if(view==='spacecraft'&&s.attitudeModeLabel)return [item('body','cmg','Body pointing',s.attitudeModeLabel,'left'),item('solar','solar','Array rotary joint',met(s.wingPitchDeg,'°',1),'right'),item('radiator','radiator','Radiator root drives',met(s.upperRadiatorPitchDeg,'°',0)+' / '+met(s.lowerRadiatorPitchDeg,'°',0),'right')];return [item('cmg','cmg','CMG cluster',met(s.momentumNms,'N·m·s')+' · '+met(s.cmgKW,'kW',2),'left'),item('torquer','torquer','Magnetic torquer',s.desat?'Unloading · '+met(s.unloadTorqueNm,'N·m',4):'Standby · '+met(s.unloadAuthorityNm,'N·m available',4),'right')];
 case 'prop':return [item('fuel','propellant','Internal fuel vessel',met(s.fuelKg,'kg',1),'left'),item('helium','propellant','Helium bottle',met(h.propulsion.heliumL,'L',1)+' · regulated feed','left'),item('oxidizer','propellant','Internal oxidizer vessel',met(s.oxidizerKg,'kg',1),'right'),item('engine','propulsion','−Z thrust deck',s.burn?'Firing · '+met(h.input.thrustN,'N'):'Idle · '+met(s.remainingDv,'m/s available'),'right')];
 case 'environment':if(s.carrierAttached)return [item('body','structure','Payload exposure','Encapsulated · '+stage,'right'),item('solar','solar','Array deployment',met((s.pvDeployment??0)*100,'% deployed',0),'left')];return [item('solar','solar','Direct illumination',s.eclipse?'Eclipse · 0 W/m²':met(s.solarIrradiance??1361,'W/m²',0),'left'),item('radiator','radiator','Absorbed environmental heat',met(s.absorbedKW,'kW',2),'right'),item('body','structure','Ram-facing area',met(s.ramAreaM2,'m²',2),'left')];
 case 'mass':{const m=id=>h.massLedger.find(r=>r.id===id)?.kg;return [item('solar','solar','Array allocation',fmtI(m('array'),'kg'),'left'),item('radiator','radiator','Radiator allocation',fmtI(m('radiator'),'kg'),'right'),item('body','structure','Flight inventory',fmtI(s.wetKg,'kg wet'),'right')];}
 case 'launch':
 case 'launcher':if(view==='launch'&&s.flightPhase==='insertion'&&h.fairing?.cargoAccess){
  const a=h.fairing.cargoAccess;
  return [item('cargoJamb','fairing','Side hatch',met(a.widthM,'m clear width',2),'right'),
   item('carriage','adapter','Retained carriage',met(a.strokeM,'m stroke',2),'left'),
   ...(!s.cargoAccessHeld?[item('payload','payload','Stowed data center',s.carrierAttached?'Supported by ship':'In free drift','left')]:[])];
 }
 if(key==='launch')return view==='launch'?[item('interface','adapter','Separation adapter',fmtI(h.input.adapterKg,'kg')+' · '+launchRef,'left'),item('payload','payload','Payload envelope',met(h.fairing?.radialClearanceM,'m radial margin',2),'right')]:[item('body','payload','Insertion state',met(s.altitudeKm,'km')+' · '+met(s.trimPaidDv,'m/s trim',2),'left')];
 {const fleet=launchFleet[h.input.launcher];return view==='launch'?[
  item('rocket','launcher',fleet?.name||h.launcherLabel||'Launch vehicle',fmtI(h.input.referenceKg,'kg LEO reference'),'left'),
  item('shroud','fairing','Payload enclosure',met(h.input.fairingM,'m usable diameter',2),'right'),
  item('thrustDeck','booster',fleet?.boosters?'Side boosters':'Launch architecture',(fleet?.stages||0)+' axial stage'+(fleet?.stages===1?'':'s')+' · '+(fleet?.boosters||0)+' side boosters','left')
 ]:[item('body','payload','Launched stack',fmtI(h.launchKg,'kg'),'right')];}
 case 'compute':case 'conops':{const info=purposeInfo(h);
  if(view==='launch')return [item('payload','payload',info.name,reference?'Stowed reference':stage+' · '+met(100*(s.deployment||0),'% deployed',0),'right')];
  // Workload and delivery metrics belong in their panels, not as objects
  // pinned over the spacecraft. Keep the general flight view unobstructed.
  return [];}
 case 'orbit':return [item('body','structure','Flight state',fmtI(s.altitudeKm,'km')+' · '+(s.eclipse?'eclipse':'sunlit'),'right')];
 default:return [];
 }
}
