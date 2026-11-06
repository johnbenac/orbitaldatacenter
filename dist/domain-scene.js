// Pure camera and instrument definitions. Renderers read the resolved hardware
// and flight instant; switching disciplines does not change the numerical state.
import {purposeInfo,purposeId} from './purpose-display.js';
import {launchFleet} from './launch-fleet.js';
const defs={
 mechanical:{label:'Mechanical Design',camera:'spacecraft',parts:['structure','propulsion','propellant','compute','solar','radiator','cmg'],vectors:['dimensions']},
 software:{label:'Flight Software',camera:'spacecraft',parts:['avionics','solar','radiator','communications','cmg','propulsion']},
 avionics:{label:'Command & Data Handling',camera:'core',close:true,parts:['avionics','communications']},
 conops:{label:'Mission operations',camera:'spacecraft',parts:[]},
 purpose:{label:'AI Data Center Purpose',camera:'core',parts:['compute','storage','avionics','communications'],close:true},
 environment:{label:'Environmental coupling',camera:'spacecraft',parts:['solar','radiator','structure'],vectors:['sun','albedo','ir','ram']},
 orbit:{label:'Orbit & eclipse',camera:'orbit',parts:[]},
 compute:{label:'Compute & storage',camera:'core',parts:['compute','storage'],close:true},
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
 const rd=routeRates(h,s),stage=s.flightPhase||'operations',inLaunch=['integration','pad','ascent','insertion'].includes(stage);
 const link=s.station?(s.acquired?(s.groundLink||'Link')+' · '+bit(s.goodputMbps):'Acquiring · '+s.station):'Waiting for contact';
 const launchRef=reference?'Design reference':stage,fmtI=(x,u)=>met(x,u,0);
 if(view==='orbit'){
  if(key==='orbit'||key==='launch'||key==='launcher'||key==='environment'||key==='conops')return [
   item('orbitCraft','communications',inLaunch?'Insertion altitude':'Spacecraft',met(s.altitudeKm,'km')+' · '+(s.eclipse?'shadow':'sunlit'),'right'),
   item('orbitGround','solar','Orbit plane','β '+met(s.betaDeg,'°')+' · '+met(s.periodSec/60,'min'),'left')
  ];
  if(key==='attitude'||key==='software')return [item('orbitCraft','cmg','Body axes · directions',s.attitudeModeLabel||'Guided attitude','right'),item('orbitGround','solar','Nadir footprint',met(s.altitudeKm,'km above ground',0),'left')];
  if(key==='data'||key==='comm')return [item('orbitCraft','communications','Spacecraft link',link,'right'),...(s.station?[item('station','avionics',s.station,bit(s.goodputMbps)+' delivered','left')]:[])];
  return [];
 }
 if(view==='launch'&&key!=='launch'&&key!=='launcher'&&key!=='conops'&&reference)return [];
 switch(key){
 case 'mechanical':return [item('body','structure','Primary structure',met(h.bodyLengthM,'m')+' along launch axis','left'),item('solarRoot','solar','Solar bearing','Side-frame hardpoint','right'),item('radiatorRoot','radiator','Radiator root','Side-frame hardpoint','left')];
 case 'software':return [item('avionics','avionics','Flight computer',s.attitudeModeLabel||'Launch hold','left'),item('body','cmg','Body tracking error',met(s.attitudeSlewErrorDeg,'°',2),'right')];
 case 'avionics':return [item('avionics','avionics','Spacecraft flight computer',met(s.cdhKW*1000,'W'),'left'),item('activeTerminal','communications','Ground commands',met(s.commandGoodputKbps,'kbit/s'),'right')];
 case 'data':if(h.ai&&purposeId(h)!=='text')return [item('avionics','avionics','Customer input staged',bytes(s.aiInputBufferGB),'left'),item('storage','storage',purposeInfo(h).output,bytes(s.aiProductQueueGB)+' queued','left'),item('activeTerminal','communications','Returned to Earth',bytes(s.aiProductDeliveredGB),'right')];return [
  {...item('avionics','avionics','Flight data switch',bit(rd.offered)+' offered','left'),detail:'Text '+bit(rd.text)+' · bulk '+bit(rd.bulk)},
  {...item('storage','storage','Payload recorder',bytes(s.queueGB)+' queued','left'),detail:'Text '+bytes(s.textQueueGB)+' · bulk '+bytes(s.bulkQueueGB)},
  {...item('activeTerminal','communications',s.station?String(s.station):'Downlink terminal',link,'right'),detail:bytes(s.deliveredGB)+' delivered to ground'}
 ];
 case 'compute':if(h.ai&&purposeId(h)!=='text')return [item('compute','compute',purposeInfo(h).name,met(s.aiUnitRate,h.ai.unit+'/s',2),'left'),item('storage','storage','Customer input staged',bytes(s.aiInputBufferGB),'right')];return [item('compute','compute','Accelerator trays',fmtI(s.tokensPerSec,'tok/s')+' · '+met(s.itKW,'kW'),'left'),item('storage','storage','Persistent media',met(s.freeTB,'TB free',2),'right')];
 case 'power':return [item('solar','solar',(s.pvDeployment??s.deployment)===0?'Stowed solar array':s.eclipse?'Array · eclipse':'Array generation',met(s.solarKW,'kW',2),'left'),item('battery','battery','Battery pack',met(s.socPct,'%')+' · '+(s.chargeKW>.001?met(s.chargeKW,'kW in'):s.dischargeKW>.001?met(s.dischargeKW,'kW out'):'standby'),'right')];
 case 'thermal':return [item('compute','compute','Junction',met(s.junctionK,'K'),'left'),item('coolant','radiator','Coolant loop',met(s.coolantK,'K'),'right'),item(view==='core'?'battery':'radiator',view==='core'?'battery':'radiator',view==='core'?'Battery':'Radiator',met(view==='core'?s.batteryK:s.radiatorK,'K'),'right')];
 case 'comm':return [item('dish','communications','Steerable Ka reflector',s.groundLink==='Ka'&&s.station?link:met(h.input.kaDishM,'m aperture',2),'left'),item('optic','communications','Optical terminal',s.groundLink==='Optical'&&s.station?link:met(h.input.opticalApertureM,'m aperture',2),'right'),item('patch','avionics','S-band command',met(s.commandGoodputKbps,'kbit/s up',2),'left')];
 case 'attitude':if(view==='spacecraft'&&s.attitudeModeLabel)return [item('body','cmg','Body pointing',s.attitudeModeLabel,'left'),item('solar','solar','Array rotary joint',met(s.wingPitchDeg,'°',1),'right'),item('radiator','radiator','Radiator root drives',met(s.upperRadiatorPitchDeg,'°',0)+' / '+met(s.lowerRadiatorPitchDeg,'°',0),'right')];return [item('cmg','cmg','CMG cluster',met(s.momentumNms,'N·m·s')+' · '+met(s.cmgKW,'kW',2),'left'),item('torquer','torquer','Magnetic torquer',s.desat?'Unloading · '+met(s.unloadTorqueNm,'N·m',4):'Standby · '+met(s.unloadAuthorityNm,'N·m available',4),'right')];
 case 'prop':return [item('fuel','propellant','Internal fuel vessel',met(s.fuelKg,'kg',1),'left'),item('helium','propellant','Helium bottle',met(h.propulsion.heliumL,'L',1)+' · regulated feed','left'),item('oxidizer','propellant','Internal oxidizer vessel',met(s.oxidizerKg,'kg',1),'right'),item('engine','propulsion','−Z thrust deck',s.burn?'Firing · '+met(h.input.thrustN,'N'):'Idle · '+met(s.remainingDv,'m/s available'),'right')];
 case 'environment':if(s.carrierAttached)return [item('body','structure','Payload exposure','Encapsulated · '+stage,'right'),item('solar','solar','Array deployment',met((s.pvDeployment??0)*100,'% deployed',0),'left')];return [item('solar','solar','Direct illumination',s.eclipse?'Eclipse · 0 W/m²':met(s.solarIrradiance??1361,'W/m²',0),'left'),item('radiator','radiator','Absorbed environmental heat',met(s.absorbedKW,'kW',2),'right'),item('body','structure','Ram-facing area',met(s.ramAreaM2,'m²',2),'left')];
 case 'mass':{const m=id=>h.massLedger.find(r=>r.id===id)?.kg;return [item('solar','solar','Array allocation',fmtI(m('array'),'kg'),'left'),item('radiator','radiator','Radiator allocation',fmtI(m('radiator'),'kg'),'right'),item('body','structure','Flight inventory',fmtI(s.wetKg,'kg wet'),'right')];}
 case 'launch':return view==='launch'?[item('interface','adapter','Separation adapter',fmtI(h.input.adapterKg,'kg')+' · '+launchRef,'left'),item('payload','payload','Payload envelope',met(h.fairing?.radialClearanceM,'m radial margin',2),'right')]:[item('body','payload','Insertion state',met(s.altitudeKm,'km')+' · '+met(s.trimPaidDv,'m/s trim',2),'left')];
 case 'launcher':{const fleet=launchFleet[h.input.launcher];return view==='launch'?[
  item('rocket','launcher',fleet?.name||h.launcherLabel||'Launch vehicle',fmtI(h.input.referenceKg,'kg LEO reference'),'left'),
  item('shroud','fairing','Payload enclosure',met(h.input.fairingM,'m usable diameter',2),'right'),
  item('thrustDeck','booster',fleet?.boosters?'Side boosters':'Launch architecture',(fleet?.stages||0)+' axial stage'+(fleet?.stages===1?'':'s')+' · '+(fleet?.boosters||0)+' side boosters','left')
 ]:[item('body','payload','Launched stack',fmtI(h.launchKg,'kg'),'right')];}
 case 'purpose':case 'conops':{const q=h.ai||{},info=purposeInfo(h);
  if(view==='launch')return [item('payload','payload',info.name,reference?'Stowed reference':stage+' · '+met(100*(s.deployment||0),'% deployed',0),'right')];
  const execution=item('compute','compute',info.name,met(s.aiUnitRate,(q.unit||'work units')+'/s',2),'left');
  if(key==='purpose'&&q.training)return [execution,item('storage','storage','Training inputs',bytes(s.aiInputBufferGB)+' staged','left'),item('activeTerminal','communications','Artifact received on Earth',bytes(s.aiProductDeliveredGB)+' / '+bytes(q.artifactGB),'right')];
  if(key==='purpose'&&q.purposeId==='agents')return [execution,item('avionics','avionics','Onboard agent exchange',met(s.aiPeerMbps,'Mbit/s')+' · '+met(q.agentWaves,'waves/stage',0),'left'),item('activeTerminal','communications','Research product received',bytes(s.aiProductDeliveredGB),'right')];
  return [execution,item('storage','storage',info.output,bytes(s.aiProductQueueGB)+' queued','left'),item('activeTerminal','communications','Product delivered to Earth',bytes(s.aiProductDeliveredGB),'right')];}
 case 'orbit':return [item('body','structure','Flight state',fmtI(s.altitudeKm,'km')+' · '+(s.eclipse?'eclipse':'sunlit'),'right')];
 default:return [];
 }
}
