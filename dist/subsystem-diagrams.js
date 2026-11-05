import {DEPLOY_END_S} from './commissioning-clock.js';
// Interactive engineering plates. Geometry is schematic except where dimensions are marked.
import {aiPurposes} from './ai-purpose.js';
import {purposeInfo,purposeId} from './purpose-display.js';
import {launchFleet} from './launch-fleet.js';
import {launchSiteFor} from './launch-sites.js';
import {launcherSilhouette} from './launch-fleet-ui.js';
import {presets} from './design.js';
import {thermalNodes,qualifyNow} from './thermal-limits.js';
import {thermalScales,temperatureColor} from './thermal-colors.js';
import {R, MU, dot, cross, unit, groundSites} from './orbit.js';

const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const nf=new Intl.NumberFormat('en-US',{maximumFractionDigits:1});
const num=(x,digits=1)=>!Number.isFinite(x)?'—':digits===1?nf.format(x):x.toLocaleString('en-US',{maximumFractionDigits:digits});
const val=(n,u,p=1)=>num(n,p)+(u?' '+u:'');
const frac=x=>Math.min(1,Math.max(0,x||0));
const each=(n,fn)=>Array.from({length:n},(_,i)=>fn(i)).join('');
const P=(id,title,description,edit,inspect,details=[],event=null)=>({id,title,description,edit,inspect,details,event});
const row=(name,v)=>[name,v];
const tech=(d,key)=>presets[key]?.[d[key]]?.label?.split(' · ')[0]||String(d[key]??'');
const T=(x,y,v,cl='sd-value',a='middle')=>`<text x="${x}" y="${y}" class="${cl}" text-anchor="${a}">${esc(v)}</text>`;
const path=(d,cl)=>`<path d="${d}" class="${cl}"/>`;
const rect=(x,y,w,h,cl,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" class="${cl}"/>`;
const circle=(x,y,r,cl)=>`<circle cx="${x}" cy="${y}" r="${r}" class="${cl}"/>`;
const ellipse=(x,y,rx,ry,cl)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" class="${cl}"/>`;
const named=(x,y,head,value)=>T(x,y,head,'sd-name')+T(x,y+19,value);
const pick=(p,x,y,w,h,art)=>`<g class="sd-pick" data-sd-pick="${esc(p.id)}" role="button" tabindex="0" aria-label="${esc('Select '+p.title)}"><title>${esc(p.title)}</title>${rect(x,y,w,h,'sd-hit',6)}${art}</g>`;
const flow=(id,d,color='cyan',live=true,arrow=true)=>`<path d="${d}" class="sd-wire sd-${color}${live?' is-flow':' is-idle'}" ${arrow?`marker-end="url(#${id}-${color})"`:''}/>`;
const legend=(color,label)=>({color,label});
const info=(title,subtitle,parts,art,legends,status)=>({title,subtitle,parts,art,legends,status});
const safeId=v=>String(v).replace(/[^A-Za-z0-9_-]/g,'');
let sequence=0;

function defs(id){
 const colors={cyan:'#76d9da',amber:'#f7b76a',violet:'#baa7ee',green:'#8bd5a6',steel:'#98aeba',red:'#ec967d'};
 return `<defs>${Object.entries(colors).map(([name,color])=>`<marker id="${id}-${name}" orient="auto-start-reverse" markerUnits="userSpaceOnUse" refX="6" refY="3.5" markerWidth="7" markerHeight="7"><path d="M0 0L7 3.5L0 7Z" fill="${color}"/></marker>`).join('')}<pattern id="${id}-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#365463" opacity=".32" stroke-width=".65"/></pattern><linearGradient id="${id}-earth" x1="0" x2="1"><stop stop-color="#111e2c"/><stop offset=".48" stop-color="#25536a"/><stop offset="1" stop-color="#428598"/></linearGradient></defs>`;
}
function glyph(type,x,y,size=1,level=.5){
 const X=(d,c='sd-hardware')=>path(d,c);
 let out='';
 switch(type){
 case 'chip':out=rect(-23,-21,46,42,'sd-metal',5)+rect(-16,-14,32,28,'sd-device',3)+rect(-10,-8,20,16,'sd-core',1)+each(6,i=>X(`M${-15+i*6} -27v5m0 44v5M-29 ${-15+i*6}h6m46 0h6`,'sd-trace'));break;
 case 'ssd':out=each(3,i=>rect(-26,-21+i*14,52,11,'sd-metal',2)+circle(-17,-15+i*14,1.8,'sd-led')+X(`M-10 ${-15+i*14}h25`,'sd-line'));break;
 case 'rack':out=rect(-24,-29,48,56,'sd-metal',3)+each(4,i=>rect(-18,-24+i*12,36,9,'sd-device',1)+circle(-12,-19+i*12,1.5,'sd-led')+X(`M-5 ${-19+i*12}h16`,'sd-line'));break;
 case 'solar':out=X('M-34 -18L29 -23L34 12L-29 19Z','sd-array')+each(5,i=>X(`M${-23+i*10} ${-19-i*.75}l5 35`,'sd-cells'))+X('M-32 -6l63 -6m-61 17l63 -6','sd-cells')+X('M-4 18v7h20','sd-hardware');break;
 case 'fourWings':{
  out=X('M-35 -12H35M-35 12H35','sd-hardware')+rect(-7,-20,14,40,'sd-metal',3);
  for(const sign of [-1,1])for(const y of [-18,5]){
   const x=sign<0?-49:13;
   out+=`<g data-solar-wing="true">${rect(x,y,36,13,'sd-array',1)}${each(2,i=>X(`M${x+12*(i+1)} ${y}v13`,'sd-trace'))}${X(`M${x} ${y+6.5}h36`,'sd-cells')}</g>`;
  }break;
 }
 case 'battery':out=rect(-14,-30,28,55,'sd-metal',3)+rect(-6,-34,12,5,'sd-terminal',1)+each(5,i=>rect(-9,15-i*8,18,5,i<Math.round(frac(level)*5)?'sd-charge':'sd-unfilled',1));break;
 case 'dish':out=X('M-28 -20Q-31 12 3 15L23 -14Q-1 -6 -28 -20Z','sd-metal')+X('M-27 -19L8 -29L22 -14M-8 11L-13 26m-7 1h29m-15 -16l6 14','sd-hardware')+circle(8,-29,2.3,'sd-led');break;
 case 'patch':out=X('M-25 -13l38 -8 13 26 -39 10Z','sd-metal')+X('M-15 -8l21 -5 8 13 -21 6Z','sd-gold')+X('M-15 18v7m7 -8v9','sd-hardware');break;
 case 'optic':out=X('M-25 9l29 -27 17 15 -27 27Z','sd-metal')+ellipse(12,-12,12,6,'sd-lens')+X('M-9 20v7m-10 0H5','sd-hardware');break;
 case 'radiator':out=X('M-29 -16L20 -24L31 14L-18 22Z','sd-rad')+each(7,i=>X(`M${-23+i*6} ${-15-i}l9 31`,'sd-rib'))+X('M-22 17l-7 5m5 0l-6 6','sd-hardware');break;
 case 'cold':out=X('M-27 -8l34 -11 20 12 -34 13Z','sd-metal')+X('M-27 -8v13l20 12L27 5V-7M-7 6v11','sd-hardware')+X('M-16 -6l18 -6 8 4 -17 6','sd-liquid');break;
 case 'pump':out=circle(0,0,21,'sd-metal')+circle(0,0,5,'sd-led')+each(4,i=>`<g transform="rotate(${i*90})">${X('M0 -7Q-12 -8 -11 -14Q-2 -20 4 -12Z','sd-pumpblade')}</g>`)+X('M-28 0h8m42 0h8','sd-hardware');break;
 case 'wheel':out=ellipse(0,0,27,23,'sd-metal')+ellipse(0,0,20,16,'sd-device')+X('M-30 2Q0 -27 30 -2Q0 24 -30 2Z','sd-gimbal')+circle(0,0,4,'sd-led');break;
 case 'torquer':out=X('M-30 -8h60v16h-60Z','sd-metal')+each(9,i=>X(`M${-22+i*5} -10q8 10 1 20`,'sd-winding'));break;
 case 'engine':out=X('M-16 -21h32l-7 15 6 18 6 10h-42l7 -10 7 -18Z','sd-metal')+X('M-13 -17h26m-22 9h18m-19 15h20m-25 12h30','sd-line');break;
 case 'blanket':out=each(3,i=>X(`M-24 ${-5+i*7}l29 -12 21 10 -28 13Z`,'sd-metal'))+X('M-14 -6l12 -5 13 5 -12 6Z','sd-gold');break;
 case 'earth':out=circle(0,0,18,'sd-planet')+ellipse(0,0,8,18,'sd-meridian')+ellipse(0,0,18,6,'sd-meridian');break;
 default:out=rect(-24,-15,48,30,'sd-metal',4)+X('M-15 -4h30m-30 8h30','sd-line');
 }
 return `<g transform="translate(${x} ${y}) scale(${size})">${out}</g>`;
}
function compute({h,d,s},id){
 const parts=[
 P('compute','Accelerator trays','Prompt prefill and token decoding share accelerator time. The estimator checks both compute and memory bandwidth.','trayCount','compute',[row('Installed',h.trays+' trays / '+h.chips+' accelerators'),row('Model',tech(d,'workload')),row('Decode on board',val(s.tokensPerSec,'tok/s',0)),row('Aggregate memory',val(h.memoryGB,'GB',0))]),
 P('memory','High-bandwidth memory','Weights, context and KV cache occupy accelerator memory for every active model replica.','context','compute',[row('Weight precision',val(d.bits,'bit')),row('Weights per replica',val(h.modelGB,'GB')),row('KV per replica',val(h.kvGB,'GB')),row('Batch',d.batch+' streams / replica')]),
 P('storage','Solid-state recorder','Output text and bulk products share the recorder. Delivered bytes leave the queue when the terminal has a ground pass.','storageTB','storage',[row('Media',tech(d,'storage')),row('Installed / free',val(h.storageTB,'TB')+' / '+val(s.freeTB,'TB')),row('Queued text',val(s.textQueueGB,'GB')),row('Queued bulk data',val(s.bulkQueueGB,'GB'))]),
 P('cooling','Cold plate','Power dissipated in the trays enters a pumped loop through the cold plates.','thermalResistanceKPerKw','radiator',[row('Cold plate',val(s.coldPlateK,'K')),row('Tray resistance',val(d.thermalResistanceKPerKw,'K/kW')),row('Compute draw',val(s.itKW,'kW'))])];
 if(h.ai&&purposeId(h)!=='text'){
  const q=h.ai,profile=purposeInfo(h);
  parts[0]=P('compute','Accelerator trays',profile.phases[2],'trayCount','compute',[row('Installed',h.trays+' trays / '+h.chips+' accelerators'),row('Workload',q.label),row('Onboard work rate',val(s.aiUnitRate,q.unit+'/s',2)),row('Fabric efficiency',val(q.fabricEfficiency*100,'%'))]);
  parts[1]=P('memory','High-bandwidth memory and model state','Installed accelerator memory must hold the selected workload’s resident model and execution state.',q.training?'trainingStateBytes':'context','compute',[row('Model state',val(q.modelMemoryGB,'GB')),row('Installed memory',val(q.installedMemoryGB,'GB')),row('Headroom',val(q.memoryMarginGB,'GB'))]);
  parts[2]=P('storage','Staging and output','Customer inputs and returned products share the recorder with persistent model files.','storageTB','storage',[row('Staged customer input',val(s.aiInputBufferGB,'GB')),row('Queued customer product',val(s.aiProductQueueGB,'GB')),row('Earth receipt',val(s.aiProductDeliveredGB,'GB'))]);
 }
 parts[0].details.push(row('Geometric tray capacity',h.rackLayout.capacity+' positions'),row('Empty positions',h.rackLayout.spare));
 const art=path('M57 40H369V219H57Z','sd-boundary')+T(69,58,'COMPUTE ENCLOSURE','sd-over','start')+
 flow(id,'M154 115H239','cyan',(s.aiUnitRate??s.tokensPerSec)>0)+flow(id,'M318 115H444','cyan',s.offeredMbps>0)+flow(id,'M279 146V183h77','amber',s.itKW>0)+
 pick(parts[1],65,70,113,109,glyph('chip',121,101,.7)+T(121,139,'High-bandwidth','sd-name')+T(121,153,'memory','sd-name')+T(121,169,val(h.memoryGB,'GB',0)))+
 pick(parts[0],218,66,115,100,glyph('rack',274,106,.94)+named(274,152,'Accelerators',h.trays+' trays'))+
 pick(parts[2],424,76,105,96,glyph('ssd',477,111,1)+named(477,154,'Recorder',val(s.queueGB,'GB queued'))) +
 pick(parts[3],355,166,84,65,glyph('cold',391,184,.72)+T(391,221,val(s.coldPlateK,'K'),'sd-value'))+
 T(181,101,'READ','sd-over')+T(380,101,'WRITE','sd-over')+T(247,207,'Waste heat','sd-name');
 return info('Compute payload','Accelerator memory, output storage and tray cooling',parts,art,[legend('cyan','Data'),legend('amber','Heat')],s.burst?'Burst active':'Standby');
}

function power({h,d,s},id){
 const parts=[
 P('array','Solar wings','The four wings feed the regulated bus. Generation depends on orientation, eclipse and elapsed cell age.','solarM2','solar',[row('Technology',tech(d,'pv')),row('Installed area',val(h.solarM2,'m²')),row('Generation',val(s.solarKW,'kW')),row('Curtailed',val(s.curtailedKW,'kW'))]),
 P('battery','Battery pack','Surplus generation charges the pack. During a deficit the pack supplies demand within its energy and discharge limits.','batteryKWh','battery',[row('Chemistry',tech(d,'battery')),row('Available / installed',val(s.availableKWh,'kWh')+' / '+val(h.batteryKWh,'kWh')),row('Bus charge',val(s.chargeKW,'kW')),row('Bus discharge',val(s.dischargeKW,'kW'))]),
 P('bus','Regulated bus','The bus balances solar generation, battery exchange and served electrical load.','socMin','battery',[row('Requested',val(s.loadKW,'kW')),row('Served',val(s.servedLoadKW,'kW')),row('Unserved',val(s.unmetKW,'kW')),row('Minimum SOC setting',val(d.socMin*100,'%'))]),
 P('loads','Load branches','IT, communications and platform hardware draw from the same bus at the current mission instant.','duty','compute',[row('IT',val(s.itKW,'kW')),row('Terminal',val(s.terminalKW,'kW')),row('Pump and storage',val(s.pumpKW+s.storageKW,'kW')),row('CMGs and torquers',val(s.cmgKW+s.coilKW,'kW'))])];
 const discharge=s.dischargeKW>.0001,charge=s.chargeKW>.0001;
 const art=flow(id,'M141 86H264','amber',s.solarKW>0)+flow(id,discharge?'M144 183H218V142H262':'M263 143H218V183H145','green',discharge||charge)+path('M277 65V195','sd-busbar')+
 pick(parts[0],39,43,130,102,glyph('fourWings',103,81,1.02)+named(103,121,'Four solar wings',val(s.solarKW,'kW'))) +
 pick(parts[1],52,151,109,93,glyph('battery',101,181,.83,s.socPct/100)+named(101,223,'Battery',val(s.socPct,'% SOC')))+
 pick(parts[2],239,43,78,165,rect(268,62,17,138,'sd-conductor',4)+T(278,32,'DC BUS','sd-over')+T(276,221,val(s.servedLoadKW,'kW'),'sd-value'))+
 pick(parts[3],412,39,125,177,[[71,'Compute',s.itKW],[129,'Terminal',s.terminalKW],[188,'Platform',Math.max(0,s.loadKW-s.itKW-s.terminalKW)]].map(([y,n,v])=>flow(id,`M287 ${y}H412`,'amber',v>.001)+circle(421,y,5,'sd-node')+T(435,y-2,n,'sd-name','start')+T(435,y+15,val(v,'kW'),'sd-value','start')).join(''))+T(179,172,discharge?'DISCHARGE':charge?'CHARGE':'IDLE','sd-over');
 return info('Electrical distribution','Source, storage and load paths at the selected instant',parts,art,[legend('amber','Bus power'),legend('green','Pack exchange')],s.eclipse?'Eclipse':'Sunlit');
}

function comm({h,d,s,events},id){
 const active=!!s.station,next=events.find(e=>e.type==='contact'&&e.end>=s.t)||events.find(e=>e.type==='contact');
 const parts=[
 P('payload','Payload downlink','The queue feeds the selected payload terminal after acquisition. Line rate and application goodput have separate budgets.','link','communications',[row('Terminal',s.groundLink||d.link),row('Line rate',val(s.lineMbps,'Mbit/s')),row('Application goodput',val(s.goodputMbps,'Mbit/s')),row('Queued payload',val(s.queueGB,'GB'))]),
 P('command','Tracking, telemetry and command','Ground commands use the independent S-band uplink. The command channel has its own link budget and queue.','network','communications',[row('Ground command demand',val(s.commandDemandKbps,'kbit/s')),row('Delivered commands',val(s.commandGoodputKbps,'kbit/s')),row('Uplink physical rate',val(s.uplinkMbps,'Mbit/s')),row('Queued commands',val(s.uplinkQueueMB,'MB'))]),
 P('station','Ground endpoint','The beam terminates at the visible station selected by the geometry solver. The elevation mask defines access.','elevationDeg','communications',[row('Network',tech(d,'network')),row('Current endpoint',s.station||'No contact'),row('Slant range',active?val(s.rangeKm,'km'):'—'),row('Elevation',active?val(s.elevationDeg,'°'):'—')],next)];
 const art=path('M40 38H215V212H40Z','sd-boundary')+T(52,58,'SPACE SEGMENT','sd-over','start')+
 pick(parts[0],49,66,157,71,glyph(s.groundLink==='Optical'||(!active&&d.link==='optical')?'optic':'dish',86,94,.68)+T(123,92,'Payload','sd-name','start')+T(123,112,s.groundLink||'Standby','sd-value','start'))+
 pick(parts[1],49,139,168,68,glyph('patch',86,165,.66)+T(122,163,'S-band','sd-name','start')+T(122,180,'Tracking, telemetry','sd-over','start')+T(122,192,'and command','sd-over','start'))+
 flow(id,'M211 87Q355 52 470 109','cyan',s.goodputMbps>0)+flow(id,'M471 130Q363 188 213 167','violet',s.commandGoodputKbps>0)+T(330,49,val(s.goodputMbps,'Mbit/s'),'sd-value')+T(329,197,val(s.commandGoodputKbps,'kbit/s'),'sd-value')+
 path('M400 190Q500 153 571 188','sd-horizon')+
 pick(parts[2],433,83,120,137,glyph('dish',498,125,1.0)+named(498,202,s.station||'Ground network',active?val(s.rangeKm,'km'):groundSites(d.network).length+' sites'));
 return info('Ground link geometry','Separate application downlink and S-band command uplink',parts,art,[legend('cyan','Downlink → ground'),legend('violet','Uplink → vehicle')],active?(s.acquired?'Link acquired':'Acquiring'):'Out of view');
}

function thermal({h,d,s,qualificationWindow,thermalScale},id){
 const assessments=s.thermalQualification||qualifyNow(s,d),scale=thermalScale==='full'?'full':'working',stops=thermalScales[scale];
 const nodes=[['junction','Junction','chip','junctionK','compute','junctionLimitK'],['coldPlate','Cold plate','cold','coldPlateK','radiator','thermalResistanceKPerKw'],['coolant','Coolant','pump','coolantK','radiator','thermalMode'],['radiator','Radiator','radiator','radiatorK','radiator','radiatorM2'],['battery','Battery','battery','batteryK','battery','batteryKWh'],['enclosure','Enclosure','blanket','enclosureOuterK','enclosure','blanketEffectiveEpsilon']];
 const positions=[[75,92],[222,92],[370,92],[510,92],[124,191],[389,191]];
 const parts=nodes.map(([key,label,,field,inspect,edit])=>{
  const q=assessments.find(q=>q.id===key),meta=thermalNodes.find(n=>n.id===key),bounds=meta.keys[q.state],exposure=qualificationWindow?.rows?.find(r=>r.id===key&&r.state===q.state);
  const description={junction:'The compute junction is the hot end of the linked path. Heat generated in the trays crosses the cold-plate interface.',coldPlate:'The cold plate couples the electronics to the pumped loop. Interface resistance raises the junction above radiator temperature.',coolant:'The pump carries heat from the cold plates to the radiator. Electrical pump losses enter the bus and thermal ledgers.',radiator:'Both radiator faces emit thermal radiation and absorb environmental heat. Net rejection drives the thermal state.',battery:'The pack is assessed at its modeled temperature and current operating or survival state.',enclosure:'The outer blanket exchanges heat with space. Occupied feedthroughs also conduct heat across the insulation.'}[key];
  return {...P(key,label,description,edit,inspect,[row('Temperature',q.status==='unassessed'?'Unassessed':val(q.temperatureK,'K')),row('State',q.state+' · '+q.status),row('Currently',q.activity),row('Permitted range',num(q.minK)+'–'+val(q.maxK,'K')),row('Signed margin',val(q.marginK,'K')),...(exposure?[row('Time outside limits in window',val(exposure.lowSeconds+exposure.highSeconds,'s'))]:[])]),editLabel:edit===bounds.max?'Edit maximum':undefined,range:q,extraEdits:[[bounds.min,'Edit minimum'],[bounds.max,'Edit maximum']]};
 });
 const art=flow(id,'M112 92H185','amber',s.heatInputKW>0)+flow(id,'M257 92H329','amber',s.heatInputKW>0)+flow(id,'M409 92H472','cyan',s.coolantKgPerSec>0)+
 path('M180 192H334','sd-boundary-line')+T(257,184,'BUS THERMAL NODE','sd-over')+
 nodes.map(([key,label,type],i)=>{
  const [x,y]=positions[i],q=assessments.find(q=>q.id===key),status=q.status;
  const color=status==='unassessed'?null:temperatureColor(q.temperatureK,scale);
  const fill=color===null?'#58636c':'#'+color.toString(16).padStart(6,'0');
  const warning=status==='hot'||status==='cold';
  const glyphMarkup=`<g class="sd-thermal-glyph" data-sd-thermal-node="${key}" data-sd-temperature-color="${fill}" style="--sd-temp:${fill}">${glyph(type,x,y,.72)}</g>`;
  const flag=warning?`<g class="sd-limit-flag" aria-label="${status} excursion"><path d="M${x+21} ${y-15}l7 -12 7 12z" fill="#fff0c8" stroke="#18212a"/>${T(x+28,y-16,'!','sd-limit-symbol')}</g>`:'';
  return pick(parts[i],x-53,y-43,106,92,glyphMarkup+flag+named(x,y+36,label,color===null?'Unassessed':val(q.temperatureK,'K')));
 }).join('')+
 T(294,31,d.thermalMode==='applied'?'INDEPENDENT HEAT EXPERIMENT':'PUMPED HEAT TRANSPORT','sd-over');
 const violations=assessments.filter(q=>q.status==='hot'||q.status==='cold').length;
 const key=`<div class="sd-temp-key" aria-label="Fixed temperature scale"><span class="sd-caption">TEMPERATURE · ${scale.toUpperCase()} RANGE</span><div class="sd-temp-ramp"><i style="background:linear-gradient(to right,${stops.map(([k,color],i)=>color+' '+(100*i/(stops.length-1))+'%').join(',')})"></i><div>${stops.map(([k],i)=>`<span>${i===0?'≤':i===stops.length-1?'≥':''}${k}</span>`).join('')}</div></div><span class="sd-temp-unit">K</span><span class="sd-temp-flag"><b>⚠</b> Outside active limits</span><span class="sd-temp-neutral"><i></i> Unassessed</span></div>`;
 return {...info('Thermal circuit','Select a node to compare its temperature with the applicable design range',parts,art,[legend('amber','Equipment heat'),legend('cyan','Coolant transport')],violations?violations+' outside range':assessments.some(q=>q.status==='unassessed')?'Unassessed interval':'Within current ranges'),temperatureKey:key};
}

function orbit({d,s,day,events},id){
 const parts=[
 P('orbit','Orbital path','This cross-section looks along the orbit normal. The selected position and Sun vector are projected into that plane.','altitudeKm',null,[row('Semi-major altitude',val(d.altitudeKm,'km')),row('Eccentricity',num(d.ecc,4)),row('Inclination',val(d.inclinationDeg,'°')),row('Period',val(s.periodSec/60,'min'))]),
 P('shadow','Earth shadow','The cylindrical umbra intersects the orbit plane on the anti-solar side. At a high beta angle, the orbit can miss the shadow entirely.','raanDeg',null,[row('Instant',s.eclipse?'Umbra':'Sunlight'),row('Solar beta',val(s.betaDeg,'°')),row('Eclipses in window',String(day.eclipseCount??'—')),row('Shadow duration',val(day.shadowSeconds/60,'min'))],events.find(e=>e.type==='eclipse'&&e.end>=s.t)||events.find(e=>e.type==='eclipse')),
 P('vehicle','Spacecraft ephemeris','Perigee, apogee and the present vehicle position share the current propagation state.','meanAnomalyDeg',null,[row('Altitude',val(s.altitudeKm,'km')),row('Perigee / apogee',val(s.perigeeKm,'km')+' / '+val(s.apogeeKm,'km')),row('Ram velocity',val(s.relativeSpeedMs,'m/s',0)),row('Drag force',val(s.dragN,'N',5))])];
 const pos=s.positionECI||[R+d.altitudeKm,0,0],vel=s.velocityECI||[0,7.5,0],normal=unit(cross(pos,vel)),sun=s.sunECI||[1,0,0],sd=dot(sun,normal),pr=sun.map((v,i)=>v-sd*normal[i]),ex=Math.hypot(...pr)>1e-6?unit(pr):unit(pos),ey=unit(cross(normal,ex));
 const rr=Math.hypot(...pos),vp=dot(vel,vel),pd=dot(pos,vel),ev=pos.map((r,i)=>((vp-MU/rr)*r-pd*vel[i])/MU),ecc=Math.hypot(...ev),semi=1/(2/rr-vp/MU),scale=83/Math.max(R+250,semi>0&&ecc<.5?semi*(1+ecc):rr),cx=205,cy=127,re=R*scale,displayOrbit=s.t>=540&&ecc<.8&&semi>0;
 const chart=(vec)=>[cx+scale*dot(vec,ex),cy-scale*dot(vec,ey)];
 const orbitPath=displayOrbit?Array.from({length:121},(_,i)=>{const a=i*Math.PI/60,xx=Math.cos(a),yy=Math.sin(a),r=semi*(1-ecc*ecc)/(1+dot(ev,ex)*xx+dot(ev,ey)*yy);return (i?'L':'M')+(cx+scale*r*xx).toFixed(2)+' '+(cy-scale*r*yy).toFixed(2)}).join('')+'Z':'';
 const [sx,sy]=chart(pos);
 const shadowRx=re/Math.max(.0001,Math.abs(sd));
 const art=`<defs><clipPath id="${id}-night"><rect x="23" y="29" width="${cx-23}" height="194"/></clipPath><clipPath id="${id}-globe"><circle cx="${cx}" cy="${cy}" r="${re}"/></clipPath></defs>`+
 pick(parts[1],23,34,103,181,`<ellipse cx="${cx}" cy="${cy}" rx="${shadowRx}" ry="${re}" clip-path="url(#${id}-night)" class="sd-shadow"/>`+T(71,51,'UMBRA','sd-over'))+
 pick(parts[0],cx-91,cy-92,182,184,`<circle cx="${cx}" cy="${cy}" r="${re}" fill="url(#${id}-earth)" stroke="#61919e"/>`+
 `<g clip-path="url(#${id}-globe)">${[-.64,-.27,.16,.55].map(o=>ellipse(cx+o*re,cy,re*.35,re*1.1,'sd-meridian')).join('')}${[-.56,-.16,.25,.64].map(o=>ellipse(cx,cy+o*re,re*1.1,re*.16,'sd-meridian')).join('')}</g>`+path(orbitPath,'sd-orbit')+T(cx,cy+4,'EARTH','sd-world'))+
 pick(parts[2],sx-15,sy-15,30,30,circle(sx,sy,7,'sd-satellite')+circle(sx,sy,2,'sd-white'))+
 each(3,i=>flow(id,`M370 ${101+i*25}H307`,'amber',false))+T(340,81,'SUNLIGHT','sd-over')+
 T(406,81,'SOLAR BETA','sd-over','start')+T(406,113,val(s.betaDeg,'°'),'sd-large','start')+
 T(406,158,'24 H SHADOW','sd-over','start')+T(406,188,val(day.shadowSeconds/60,'min'),'sd-large','start')+
 T(206,237,displayOrbit?'VIEW ALONG ORBIT NORMAL':'PRE-INSERTION POSITION','sd-over');
 return info('Orbital plane','Earth-centered section through the flight path and eclipse geometry',parts,art,[legend('amber','Sun direction'),legend('cyan','Orbital path'),legend('violet','Umbra')],s.t<540?'Pre-insertion':s.eclipse?'In eclipse':'In sunlight');
}

function attitude({h,d,s},id){
 const parts=[
 P('torque','Disturbance torque','Aerodynamic drag, solar radiation pressure and gravity gradients load the attitude-control cluster.','cpOffsetM','cmg',[row('Ram silhouette',val(s.ramAreaM2,'m²')),row('Aerodynamic',val(s.dragTorqueNm,'N·m',5)),row('Solar / gravity',val(s.solarTorqueNm,'N·m',5)+' / '+val(s.gravityTorqueNm,'N·m',5)),row('CP offset',val(d.cpOffsetM,'m',3))]),
 P('cmg','Four-CMG pyramid','Four spinning rotors exchange angular momentum with the spacecraft during pointing and acquisition. The cluster model tracks a reduced-order momentum envelope.','cmgMomentumNms','cmg',[row('Stored momentum',val(s.momentumNms,'N·m·s')),row('Cluster capacity',val(d.cmgMomentumNms,'N·m·s')),row('Pointing error',val(s.pointingErrorDeg,'°',4)),row('Electrical draw',val(s.cmgKW,'kW',3))]),
 P('unload','Magnetic unloading','The torquers apply an external torque perpendicular to the local magnetic field. Available authority changes along the orbit.','dipoleAm2','cmg',[row('Coil state',s.desat?'Unloading':'Standby'),row('Local field',val(s.magFieldUT,'µT')),row('Available torque',val(s.unloadAuthorityNm,'N·m',5)),row('Applied unload',val(s.unloadTorqueNm,'N·m',5))])];
 const art=pick(parts[0],26,43,143,155,path('M82 142V73M82 142L133 151M82 142L46 162','sd-axes')+flow(id,'M89 137L126 103','amber',s.torqueNm>.0001)+T(82,63,'Z','sd-over')+T(142,155,'X','sd-over')+T(39,178,'Y','sd-over')+named(102,201,'Disturbance',val(s.torqueNm,'N·m',4)))+
 flow(id,'M164 119H213','amber',s.torqueNm>0)+
 pick(parts[1],211,44,155,161,path('M284 56L338 111L287 161L232 114Z','sd-chassis')+[[284,76],[323,112],[287,151],[248,113]].map(([x,y])=>glyph('wheel',x,y,.65)).join('')+named(285,201,'CMG pyramid',val(s.momentumNms,'N·m·s'))) +
 flow(id,'M362 118H420','violet',s.desat)+
 pick(parts[2],425,54,127,155,glyph('torquer',490,115,1.05)+each(3,i=>path(`M${447+i*4} ${98-i*10}Q490 ${46-i*9} ${527-i*3} ${96-i*9}`,'sd-field'))+named(490,201,'Torquer coils',val(s.unloadTorqueNm,'N·m',4)))+T(286,29,'ROTOR CLUSTER · BODY FRAME','sd-over');
 return info('Attitude actuators','Disturbance loading, momentum storage and external unloading',parts,art,[legend('amber','Torque input'),legend('violet','Magnetic unloading')],s.desat?'Desaturating':s.slewFraction>0?'Slewing':'Pointing');
}

function prop({h,d,s},id){
 const model=h.propulsion;
 const parts=model.tanks.filter(t=>t.id!=='helium').map(t=>{
  const fuel=t.id==='fuel',density=d[t.id+'Density'],kg=s[t.id+'Kg'];
  return P(t.id,fuel?'Fuel vessel':'Oxidizer vessel','An internal spherical vessel supplies its own isolated liquid circuit. The inventory glyph represents occupied volume in microgravity.',fuel?'propellantKg':'mixtureRatio','propellant',[
   row('Remaining',val(kg,'kg')),row('Tank internal volume',val(t.volumeL,'L')),row('Liquid volume',val(kg/density,'L')),row('Occupied volume',val(100*kg/density/t.volumeL,'%'))]);
 });
 const he=model.tanks.find(t=>t.id==='helium');
 parts.push(P('pressure','Pressurant and regulator','A separate helium bottle feeds a regulator. A check valve on each gas branch isolates the two tank ullages.',null,'propellant',[row('Helium load',val(h.pressurantKg,'kg',3)),row('Bottle volume',val(he.volumeL,'L',2)),row('Charge / feed pressure',val(model.bottlePa/1e5,'bar')+' / '+val(model.feedPa/1e5,'bar'))]),
  P('engine','Twin thrust chambers','Separate filtered liquid feeds meet at each engine injector. Two parallel engines mounted on the thrust deck fire together along the body +Z axis.','engine','propulsion',[row('Engine package',tech(d,'engine')),row('Operating thrust',val(d.thrustN,'N')),row('Delivered Isp',val(d.isp,'s')),row('Integrated impulse',val(s.burnImpulseNs,'N·s',0))]),
  P('disposal','Disposal allocation','The disposal ledger reserves liquid for the selected terminal maneuver.','disposalDv','propellant',[row('Disposal state',s.disposalStatus||'Scheduled'),row('Protected inventory',val(s.disposalProtectedKg,'kg')),row('Disposal used',val(s.disposalUsedKg,'kg'))]));
 const tank=(x,i,col)=>{
  const t=model.tanks.find(t=>t.id===parts[i].id),kg=s[t.id+'Kg'],r=25,fill=Math.cbrt(frac(kg/d[t.id+'Density']/t.volumeL));
  return pick(parts[i],x-35,92,70,99,circle(x,120,r,'sd-tank')+circle(x,120,r*fill,'sd-fill-'+col)+path('M'+(x-r*.75)+' 132h'+r*1.5,'sd-tankline')+named(x,167,i?'Oxidizer':'Fuel',val(kg,'kg')));
 };
 const valve=(x,y)=>path(`M${x-6} ${y-4}l12 8v-8l-12 8z`,'sd-metal');
 const art=path('M22 27H444V198H22Z','sd-boundary')+T(34,44,'INTERNAL PROPULSION BAY','sd-over','start')+
 pick(parts[2],41,53,121,107,circle(83,92,20,'sd-tank')+T(83,97,'He','sd-name')+named(90,138,'Helium bottle',val(h.pressurantKg,'kg',2)))+
 flow(id,'M104 92h26V66h72','steel',s.burn)+valve(160,66)+T(159,53,'REGULATOR','sd-over')+
 path('M202 66h115v28m-115-28v28','sd-wire sd-steel')+valve(202,83)+valve(317,83)+tank(202,0,'amber')+tank(317,1,'cyan')+
 flow(id,'M227 120v-20h155v-27h147v23','amber',s.burn)+flow(id,'M478 73v23','amber',s.burn)+
 flow(id,'M342 120h55V84h144v12','cyan',s.burn)+flow(id,'M490 84v12','cyan',s.burn)+
 T(393,146,'ISOLATION','sd-over')+T(393,162,'+ FILTERS','sd-over')+valve(367,100)+valve(367,120)+
 pick(parts[3],461,97,105,91,glyph('engine',484,111,.70)+glyph('engine',535,111,.70)+named(509,160,'Thrust deck',s.burn?val(d.thrustN,'N'):'Valves closed'))+
 pick(parts[4],296,204,274,39,rect(298,207,269,32,'sd-reserve',5)+T(311,226,'Disposal allocation','sd-name','start')+T(554,226,val(s.disposalProtectedKg,'kg'),'sd-value','end'));
 return info('Pressure-fed bipropellant system','Separate liquid paths from internal vessels to the twin engines',parts,art,[legend('steel','Regulated helium'),legend('amber','Fuel'),legend('cyan','Oxidizer')],s.burn?(s.burnKind||'Chemical')+' burn':'Valves closed');
}

function mass({h,s},id){
 const groups=[['compute','Compute',['compute','host','storage','switch'],'trayCount','compute'],['power','Power',['array','battery'],'batteryKWh','battery'],['thermal','Thermal',['radiator','coolant','blanket'],'radiatorM2','radiator'],['vehicle','Vehicle',['hinges','cmg','terminals','engine','tanks','shield','cables','structure','skin'],'structureMargin','structure'],['margin','Dry margin',['margin'],'structureMargin','structure'],['fluids','Fluids',['fuel','oxidizer','pressurant'],'propellantKg','propellant'],['adapter','Adapter',['adapter'],'adapterKg','adapter']];
 const rows=groups.map(([id,title,keys,edit,inspect])=>{const items=h.massLedger.filter(r=>keys.includes(r.id)),kg=items.reduce((n,r)=>n+r.kg,0);return {id,title,items,kg,edit,inspect}});
 const parts=rows.map(r=>P(r.id,r.title+' allocation','The launched stack includes all dry hardware, dry engineering margin, fuel, oxidizer, pressurant and the launch adapter exactly once.',r.edit,r.inspect,[row('Group mass',val(r.kg,'kg')),row('Stack fraction',val(100*r.kg/h.launchKg,'%')),...r.items.map(item=>row(item.label,val(item.kg,'kg')))]));
 const cs=['violet','amber','cyan','steel','red','green','steel'];
 const width=495, left=47, stripY=94;let x=left;
 const seg=rows.map((r,i)=>{const w=width*r.kg/h.launchKg;const bar=rect(x,stripY,w,32,'sd-bar-'+cs[i]);x+=w;return pick(parts[i],x-w,stripY,w,32,bar);}).join('');
 const labels=rows.map((r,i)=>{const xx=48+(i%4)*130,yy=168+Math.floor(i/4)*35;return pick(parts[i],xx-4,yy-14,123,28,rect(xx,yy-7,7,7,'sd-bar-'+cs[i],1)+T(xx+12,yy,r.title,'sd-name','start')+T(xx+12,yy+14,val(r.kg,'kg',0),'sd-value','start'));}).join('');
 const dryX=left+width*h.dryKg/h.launchKg,wetX=left+width*h.wetKg/h.launchKg;
 const art=path(`M${left} 75v-7H${dryX}v7M${wetX} 85v-8H542v8`,'sd-dim')+T((left+dryX)/2,57,val(h.dryKg,'kg dry'),'sd-name')+path(`M${left} 131v5H${wetX}v-5`,'sd-dim')+
 T(left,27,'INSTALLED LAUNCH MASS','sd-over','start')+T(543,35,val(h.launchKg,'kg'),'sd-large','end')+seg+labels;
 return info('Stack composition','Mass-proportional allocation of installed flight and launch hardware',parts,art,[legend('steel','Bar width ∝ mass'),legend('green','Loaded fluids')],val(s.wetKg,'kg in vehicle',0));
}

function launch({h,d,s},id){
 const f=h.fairing,pad=launchSiteFor(d.launcher,d.launchSite);
 const parts=[
 P('fairing','Payload keep-in','The selected profile gives the available radius at each axial station. Mission overrides scale the source contour.','launcher','adapter',[row('Vehicle',h.launcherLabel),row('Launch complex',pad.name+' · '+pad.range),row('Basis',f.basis),row('Usable diameter',val(f.maxDiameterM,'m')),row('Usable height',val(f.heightM,'m'))]),
 P('stack','Stowed assembly','Each folded section is tested at both ends and every intersecting taper station. The launch envelope includes the rolled solar wings along the ±X walls and the folded radiator banks on the ±Y faces.','solarM2','structure',[row('Stack length / diameter',val(h.stowedLengthM,'m')+' / '+val(h.stowedDiameterM,'m')),row('Limiting section',f.limitingPart),row('Minimum lateral gap',val(f.radialClearanceM,'m',3)),row('Axial gap',val(f.axialClearanceM,'m',3))]),
 P('adapter','Launch interface','The adapter remains on the launch stack at separation. The payload allowance is independently editable for the target mission.','launchAllowanceKg','adapter',[row('Adapter',val(d.adapterKg,'kg')),row('Launcher reference',val(d.referenceKg,'kg',0)),row('Mission allowance',val(d.launchAllowanceKg,'kg',0)),row('Launch mass margin',val(h.massMarginKg,'kg',0))]),
 P('trim','Insertion trim','The spacecraft uses its chemical engines to close the trim budget after separation. The mission clock drives achieved orbit and paid delta-v.','trimDv','propulsion',[row('Target altitude',val(d.altitudeKm,'km')),row('Achieved altitude',val(s.altitudeKm,'km')),row('Required trim',val(d.trimDv,'m/s')),row('Delivered trim',val(s.trimPaidDv,'m/s'))])];
 const x=61,y=117,k=Math.min(330/Math.max(f.heightM,h.stowedLengthM),100/Math.max(f.maxDiameterM,h.stowedDiameterM)),xm=z=>x+z*k;
 const prof=f.profile.map(([z,r])=>[xm(z),y-r*k]).concat(f.profile.slice().reverse().map(([z,r])=>[xm(z),y+r*k]));
 const art=pick(parts[0],29,32,384,164,`<polygon points="${prof.map(p=>p.join(',')).join(' ')}" class="sd-profile"/>`+T(52,41,'KEEP-IN CROSS SECTION','sd-over','start'))+
 path(`M40 ${y}H420`,'sd-centerline')+
 f.stack.map((r,i)=>pick(i===0?parts[2]:parts[1],xm(r.z0M),y-r.radiusM*k,Math.max(9,r.lengthM*k),Math.max(12,2*r.radiusM*k),rect(xm(r.z0M),y-r.radiusM*k,r.lengthM*k,2*r.radiusM*k,'sd-stack-outline')+rect(xm(r.z0M),y-r.heightM*k/2,r.lengthM*k,r.heightM*k,'sd-stack-'+(r.part.includes('terminal')?4:/roll|radiator|blanket/i.test(r.part)?3:r.part.includes('bus')?2:0)))).join('')+
 path(`M${x} 178v8H${xm(h.stowedLengthM)}v-8`,'sd-dim')+T((x+xm(h.stowedLengthM))/2,209,val(h.stowedLengthM,'m stack'),'sd-name')+
 T(437,56,'LATERAL MARGIN','sd-over','start')+T(437,83,val(f.radialClearanceM,'m',2),f.radialClearanceM<0?'sd-large sd-bad':'sd-large','start')+
 T(437,119,'AXIAL MARGIN','sd-over','start')+T(437,145,val(f.axialClearanceM,'m',2),f.axialClearanceM<0?'sd-large sd-bad':'sd-large','start')+
 pick(parts[3],422,172,144,55,T(437,189,'INSERTION TRIM','sd-over','start')+T(437,214,val(s.trimPaidDv,'m/s'),'sd-name','start'));
 return info('Stowed launch envelope',pad.name+' · '+pad.region+' · measured forward from the adapter plane',parts,art,[legend('cyan','Tapered keep-in'),legend('steel','Folded hardware'),legend('amber','Terminal cap')],f.fit?'Fits modeled profile':'Envelope exceeded');
}

function launcher({h,d,s}){
 const vehicle=launchFleet[d.launcher],reference=vehicle.referenceKg,stack=h.launchKg,pad=launchSiteFor(d.launcher,d.launchSite);
 const parts=[
  P('carrier','Carrier propulsion',vehicle.architecture,'launcher','launcher',[row('Provider',vehicle.provider),row('Status',vehicle.status),row('Axial stages',String(vehicle.stages)),row('Strap-on boosters',String(vehicle.boosters)),row('Recovery',vehicle.recovery)]),
  P('delivery','Payload delivery stage',vehicle.stages===1?'The direct-injection core releases its payload.':'The upper stage carries the payload adapter to injection. The illustrative mission clock places release at MET 540 s.','trimDv','adapter',[row('Service boundary',s.t<540?'Spacecraft attached':'Spacecraft released'),row('Initial spacecraft wet mass',val(h.wetKg,'kg',0)),row('Launch-only adapter',val(d.adapterKg,'kg',0)),row('Target altitude',val(d.altitudeKm,'km'))]),
  P('benchmark','Provider payload reference',vehicle.description,'launcher','launcher',[row('LEO reference',val(reference,'kg',0)),row('Reference conditions',vehicle.referenceOrbit),row('Reference headroom',val(h.launchReferenceMarginKg,'kg',0))]),
  P('allowance','Mission allowance','The current manifest must meet the entered allowance, the catalogue reference mass screen and the tapered fairing fit.','launchAllowanceKg','payload',[row('Entered allowance',val(d.launchAllowanceKg,'kg',0)),row('Integrated stack',val(stack,'kg',0)),row('Governing mass headroom',val(h.launchScreenMarginKg,'kg',0)),row('Fairing fit',h.fit?'Fits profile':'Exceeds profile')]),
  P('launchpad','Launch complex',pad.siteNote,'launchSite','launcher',[row('Launch complex',pad.name),row('Range',pad.range),row('Location',pad.region+' · '+pad.country),row('Evidence',pad.statusLabel),row('Coordinate basis',pad.pinBasis)])
 ];
 const max=Math.max(reference,d.launchAllowanceKg,stack),x=278,w=244,bar=(p,y,label,kg,cl)=>pick(p,x,y-23,w,48,
  T(x,y-7,label,'sd-over','start')+T(x+w,y-7,val(kg/1000,'t',2),'sd-name','end')+rect(x,y,w,8,'sd-unfilled',2)+rect(x,y,w*kg/max,8,cl,2));
 const art='<g transform="translate(46,3) scale(1.50)">'+launcherSilhouette(d.launcher)+'</g>'+
  pick(parts[0],50,113,197,91,path('M100 171h40l14 -8h92','sd-dim')+T(152,153,'CORE + BOOSTERS','sd-over','start')+T(152,177,vehicle.boosters+' strap-ons','sd-name','start'))+
  pick(parts[1],60,31,181,77,path('M100 70h39l15 -9h92','sd-dim')+T(152,50,vehicle.stages===1?'CORE RELEASE':'UPPER STAGE','sd-over','start')+T(152,77,s.t<540?'Attached':'Released','sd-name','start'))+
  pick(parts[4],35,195,211,40,T(50,209,'LAUNCH COMPLEX','sd-over','start')+T(50,227,pad.name.split(' · ')[0],'sd-name','start'))+
  T(x,27,'PAYLOAD MASS COMPARISON','sd-over','start')+bar(parts[2],65,'LEO REFERENCE',reference,'sd-bar-steel')+
  bar(parts[3],119,'MISSION ALLOWANCE',d.launchAllowanceKg,'sd-bar-violet')+bar(parts[3],173,'LAUNCHED STACK',stack,h.launchScreenMarginKg<0?'sd-bar-red':'sd-bar-green')+
  T(x,212,'GOVERNING MARGIN','sd-over','start')+T(x+w,214,val(h.launchScreenMarginKg,'kg',0),h.launchScreenMarginKg<0?'sd-bad':'sd-name','end');
 return info('Carrier architecture and payload capacity',vehicle.name+' · '+vehicle.status,parts,art,[legend('steel','Provider LEO reference'),legend('violet','Entered allowance'),legend('green','Integrated payload')],h.launchScreenFeasible?'Passes nominal launch screens':'Launch screen exceeded');
}

function purpose({h,d,s,events},id){
 const profile=purposeInfo(h),q=h.ai||{},u=q.unit||'work unit',p=aiPurposes[purposeId(h)],contact=events.find(e=>e.type==='contact'&&e.end>=s.t);
 const parts=[
  P('customer','Earth customer',profile.goal,q.training?'trainingBudgetDays':'serviceDeadlineS',null,[row('Recipient',profile.customer),row('Requested deliverable',profile.product),row('Required mean pace',val(q.requiredRate,u+'/s',3)),row('Route',d.serviceRoute==='relay'?'Assumed relay':'Direct contacts')]),
  P('input','Input staging','The spacecraft must receive or preload the input before it can process it.','initialInputGB','storage',[row('Input',profile.input),row('Staged inventory',val(s.aiInputBufferGB,'GB',3)),row('Consumed',val(s.aiInputConsumedGB,'GB',3)),row('Allocated buffer',val(d.inputSpoolGB,'GB'))]),
  P('work','Payload work',profile.phases[1],p.fields[0],'compute',[row('Installed peak estimate',val(q.activeUnitsPerSec,u+'/s',2)),row('Current work rate',val(s.aiUnitRate,u+'/s',2)),row('Memory headroom',val(q.memoryMarginGB,'GB')),row('Completed onboard',val(s.aiUnitsComputed,u,1))]),
  P('product','Earth product',profile.product+'. The transfer ledger credits bytes received at the Earth endpoint.','serviceRoute','communications',[row('Output',profile.output),row('Generated onboard',val(s.aiProductGeneratedGB,'GB',3)),row('Queued',val(s.aiProductQueueGB,'GB',3)),row('Received on Earth',val(s.aiProductDeliveredGB,'GB',3))],contact)];
 const review={
  text:['Text service gate','First-token time and stream cadence are measured at the Earth endpoint. A complete turn must meet its return deadline.','ttftTargetS','TTFT ≤ '+val(d.ttftTargetS,'s')+'  ·  stream ≥ '+val(d.targetStreamTps,'tok/s'),[row('First token target',val(d.ttftTargetS,'s')),row('Minimum stream rate',val(d.targetStreamTps,'tok/s')),row('Maximum gap',val(d.streamGapTargetS,'s')),row('Return deadline',val(d.serviceDeadlineS,'s'))],path('M0 15h7v-9h3v9h9v-6h3v6h9v-6h3v6h9v-6h3v6h7','sd-trace')],
  voice:['Conversation gate','First audible reply, playout continuity and interruption handling are assessed against the caller’s timing requirements.','voiceFirstAudioTargetS','First audio ≤ '+val(d.voiceFirstAudioTargetS,'s')+'  ·  barge-in ≤ '+val(d.voiceInterruptionTargetS,'s'),[row('Encoded packet',val(d.audioChunkMs,'ms')),row('Playout buffer',val(d.voicePlaybackBufferMs,'ms')),row('Interruption to silence',val(d.voiceInterruptionTargetS,'s'))],path('M0 12h6l3-8 4 16 4-20 5 24 4-14 3 6 4-5h7l3-3 3 5h7','sd-trace')],
  batch:['Delivery cutoff','Queued items qualify after their result files return within deadline, weighted by the stated acceptance assumption.','batchQualityFraction','Deadline '+val(d.serviceDeadlineS,'s',0)+'  ·  acceptance '+val(d.batchQualityFraction*100,'%'),[row('Input object',val(d.batchInputMB,'MB')),row('Result object',val(d.batchResultMB,'MB')),row('Acceptance assumption',val(d.batchQualityFraction*100,'%'))],each(4,j=>rect(j*11,7,8,12,'sd-metal',1))+path('M47 2v20','sd-trace')],
  agents:['Parallel research and verification','Within each assignment, workers exchange messages on the spacecraft. Successive stages, Earth tools and human review contribute to the time before a verified task reaches Earth.','agentFanout',val(d.agentFanout,'agents/stage')+'  ·  '+val(q.agentWaves,'waves/stage')+'  ·  '+val(d.serviceConcurrency,'Earth slots'),[row('Serial stages per assignment',val(d.agentSerialSteps,'stages')),row('Peer message per agent per stage',val(d.agentMessageKB,'kB')),row('Internal traffic per assignment',val(q.internalBytesPerTask/1e6,'MB',3)),row('Resident worker slots',val(q.agentWorkerSlots,'slots')),row('Live peer traffic',val(s.aiPeerMbps,'Mbit/s')),row('Earth tool share',val(100*d.earthToolFraction,'%')),row('Remote tool time',val(d.toolRttS,'s')),row('Verifier credit',val(100*d.agentVerifyFraction,'%'))],path('M7 12h5l9-8h11l8 8h7M12 12l9 8h11l8-8M12 12h28','sd-trace')+each(3,j=>rect(22,1+8*j,8,6,'sd-metal',1))],
  finetune:['Adapter acceptance','Earth needs the selected artifact, matching validation evidence and a compatible base to use an adapter delta.','trainingCalibration','Artifact '+String(d.artifactKind)+'  ·  '+(d.baseCompatible==='yes'?'base compatible':'base unavailable'),[row('Export size',val(q.artifactGB,'GB',3)),row('Allowed delay after release',val(d.artifactReturnHours,'h')),row('Trainable fraction',val(100*d.trainableFraction,'%',3)),row('Validation target',val(d.validationTarget,'score',3)),row('Calibration',d.trainingCalibration)],rect(0,6,21,15,'sd-metal',2)+path('M25 13h8m-4-4v8','sd-line')+rect(38,9,13,9,'sd-device',2)],
  pretrain:['Distributed training and return','The campaign needs resident optimizer state, sustained fabric capacity, a returned artifact and a calibrated quality target.','trainingTokensB',val(d.trainingTokensB,'billion tok')+'  ·  export '+val(q.artifactGB/1000,'TB'),[row('Model size',val(q.modelParamsB,'B parameters')),row('Fabric efficiency',val(q.fabricEfficiency*100,'%')),row('Restart package',val(q.restartGB,'GB')),row('Allowed delay after release',val(d.artifactReturnHours,'h')),row('Calibration',d.trainingCalibration)],path('M3 5h40M3 18h40M7 4v16m15-16v16m15-16v16','sd-trace')+each(6,j=>rect(3+j%3*15,2+Math.floor(j/3)*12,8,7,'sd-metal',1))]
 }[p.id];
 parts.push(P('qualification',review[0],review[1],review[2],null,review[4]));
 const gate=pick(parts[4],30,186,530,48,rect(36,190,518,40,'sd-boundary',5)+'<g transform="translate(54,198)">'+review[5]+'</g>'+T(125,206,review[0].toUpperCase(),'sd-over','start')+T(125,223,review[3],'sd-value','start'));
 const art=T(27,30,'EARTH CUSTOMER','sd-over','start')+T(183,30,'ORBITAL WORKLOAD','sd-over','start')+T(481,30,'EARTH RECEIPT','sd-over','start')+
  path('M150 47H429V197H150Z','sd-boundary')+
  flow(id,'M104 111H180','cyan',s.aiInputUploadedGB>0)+flow(id,'M245 111H303','cyan',s.aiUnitRate>0)+flow(id,'M364 111H475','violet',s.goodputMbps>0&&s.aiProductQueueGB>0)+
  pick(parts[0],24,69,110,106,glyph('earth',76,109,.8)+named(76,157,'Demand',q.training?'Campaign':'Offers'))+
  pick(parts[1],156,69,115,110,glyph('ssd',212,108,.83)+named(212,157,'Staged input',val(s.aiInputBufferGB,'GB',2)))+
  pick(parts[2],284,69,125,110,glyph('rack',347,108,.82)+named(347,157,'Processing',val(s.aiUnitRate,u+'/s',1)))+
  pick(parts[3],450,69,120,110,glyph('dish',508,106,.78)+named(508,157,'Delivered',val(s.aiProductDeliveredGB,'GB',2)))+
  gate;
 return info('AI customer service chain',profile.goal,parts,art,[legend('cyan','Inputs and execution'),legend('violet','Earth product')],profile.name);
}

function conops({h,d,s,day,events},id){
 const profile=purposeInfo(h),q=h.ai||{},u=q.unit||'work unit';
 const current=events.filter(e=>e.start<=s.t&&e.end>s.t).sort((a,b)=>(a.end-a.start)-(b.end-b.start))[0],next=events.find(e=>e.start>s.t);
 const parts=[
 P('schedule','Operating schedule','The orbit clock schedules compute bursts. Eclipse, access, periodic burns and CMG unloading change the available resources.','duty','compute',[row('Mission horizon',val(d.missionYears,'yr')),row('Scheduled duty',val(d.duty*100,'%')),row('Operating interval',val(s.periodSec*d.duty/60,'min/orbit')),row('Active episode',current?.label||'Between scheduled episodes')],current),
 P('service',profile.name,profile.goal,q.training?'trainingBudgetDays':'serviceDeadlineS','compute',[row('Customer',profile.customer),...(q.purposeId==='agents'?[row('Parallel agents per assignment stage',val(d.agentFanout,'agents')),row('Internal peer traffic',val(s.aiPeerMbps,'Mbit/s')),row('Earth service concurrency',val(d.serviceConcurrency,'slots'))]:[]),row('Peak work estimate',val(q.activeUnitsPerSec,u+'/s',2)),row('Computed onboard',val(s.aiUnitsComputed,u)),row('Product returned',val(s.aiProductDeliveredGB,'GB',3))]),
 P('access','Transfer opportunity','Ground visibility and acquisition start a transfer from the queued recorder. The shareable clock preserves the event and design state.','network','communications',[row('Access mask',val(d.elevationDeg,'°')),row('Windows today',String(day.contactCount??'—')),row('Transfer backlog',val(s.queueGB,'GB')),row('Next scheduled event',next?.label||'Outside this window')],events.find(e=>e.type==='contact'&&e.end>=s.t)),
 P('retirement','Retirement plan','Chemical control protects disposal inventory. The selected retirement method sets the terminal maneuver and final state.','disposalDv','propulsion',[row('Disposal method',(d.disposalMethod||'reentry')),row('Protected stock',val(s.disposalProtectedKg,'kg')),row('Orbit-maintenance allocation',val(d.yearsSupply,'yr')),row('Mission state',s.disposalStatus||'Scheduled')])];
 const art=T(42,37,'NOMINAL SPACECRAFT SERVICE','sd-over','start')+flow(id,'M102 95H200','cyan',s.t>=DEPLOY_END_S)+flow(id,'M266 95H362','cyan',s.aiUnitRate>0)+flow(id,'M421 95H487','violet',s.t>=s.disposalStart)+
 pick(parts[0],34,57,105,115,circle(80,94,23,'sd-device')+path('M80 76v18l12 9','sd-hardware')+named(80,145,'Schedule',val(d.duty*100,'% duty')))+
 pick(parts[1],179,53,107,115,glyph('rack',233,94,.8)+named(233,145,'Compute',val(s.itKW,'kW')))+
 pick(parts[2],330,53,112,115,glyph('dish',386,91,.84)+named(386,145,'Transfer',val(s.goodputMbps,'Mbit/s')))+
 pick(parts[3],463,53,100,115,glyph('engine',513,92,.76)+named(513,145,'Retire',s.disposalStatus||'Planned'))+
 path('M80 185v10h432v-10','sd-dim')+T(296,220,'MISSION DURATION   '+num(d.missionYears,2)+' YEARS','sd-over');
 return info('Concept of operations',profile.goal,parts,art,[legend('cyan','Routine service'),legend('violet','Retirement')],current?.type||s.flightPhase||'Mission sequence');
}

function environment({h,d,s,day},id){
 if(s.referenceBody){
  const parts=[
   P('ambient','Entry atmosphere','The descent model uses altitude-dependent atmospheric density along the surviving reference trajectory.','entryDensitySigmaPct',null,[row('Altitude',val(s.altitudeKm,'km')),row('Density',Number.isFinite(s.densityKgM3)?s.densityKgM3.toExponential(3)+' kg/m³':'—'),row('Density uncertainty',val(d.entryDensitySigmaPct,'% · 1σ'))]),
   P('body','Reference body','The non-lifting reference body is propagated after the spacecraft model ends. Drag deceleration uses the selected ballistic coefficient.','entryBallisticKgM2',null,[row('Ballistic coefficient',val(d.entryBallisticKgM2,'kg/m²')),row('Relative speed',val(s.relativeSpeedMs,'m/s')),row('Dynamic pressure',val(s.entryDynamicPressurePa,'Pa')),row('Drag deceleration',val(s.entryReferenceDragMS2,'m/s²'))]),
   P('ground','Entry target','The modeled terminal ground intersection is compared to the selected target on a rotating Earth.','targetToleranceKm',null,[row('Target latitude',val(d.targetLatDeg,'°')),row('Target longitude',val(d.targetLonDeg,'°')),row('Acceptance radius',val(d.targetToleranceKm,'km')),row('Target error',val(s.disposalTargetErrorKm,'km'))])
  ];
  const art=pick(parts[0],30,57,144,129,path('M60 85h65m-57 14h65m-61 14h62','sd-atmos-lines')+named(99,152,'Atmosphere',val(s.altitudeKm,'km altitude'))) +
   flow(id,'M168 103H251','cyan',true)+pick(parts[1],219,60,144,130,glyph('blanket',291,99,1)+named(291,152,'Reference body',val(s.entryDynamicPressurePa,'Pa'))) +
   flow(id,'M353 103H438','amber',true)+pick(parts[2],412,57,138,133,glyph('earth',484,98,1.25)+named(484,152,'Target area',val(d.targetToleranceKm,'km radius'))) +
   T(290,218,'SPACECRAFT EQUIPMENT MODEL ENDED AT INTERFACE','sd-over');
  return info('Atmospheric entry environment','Local air density, dynamic pressure and target location for the surviving reference body',parts,art,[legend('cyan','Relative flow'),legend('amber','Ground approach')],'Reference-body descent');
 }
 const exposed=s.t>=540&&!s.referenceBody,projected=s.radiatorCoupledM2/1000;
 const parts=[
 P('sun','Solar and Earth flux','Direct sunlight reaches the wings and radiator. Earth-reflected sunlight and longwave infrared enter the surface heat balance separately.','solarTiltDeg','solar',[row('Normal solar flux',exposed?val(s.solarIrradiance,'W/m²'):'Encapsulated'),row('Radiator albedo',exposed?val(s.albedoIrradiance,'W/m²'):'—'),row('Radiator IR',exposed?val(s.earthIRIrradiance,'W/m²'):'—'),row('Absorbed sunlight',exposed?val(projected*s.absorptivity*s.solarIrradiance*s.radiatorSunCos,'kW'):'—')]),
 P('flow','Relative atmosphere','Density and atmospheric-relative speed act on the ram-facing silhouette, producing drag and a torque about the spacecraft mass center.','solarCyclePhase','structure',[row('Daily F10.7 proxy',val(s.f107Daily,'sfu')),row('81-day F10.7 proxy',val(s.f107Mean,'sfu')),row('Density',exposed&&Number.isFinite(s.densityKgM3)?s.densityKgM3.toExponential(3)+' kg/m³':'—'),row('Silhouette / drag',val(s.ramAreaM2,'m²')+' / '+val(s.dragN,'N',5))]),
 P('field','Geomagnetic field','Magnetic torque depends on local field direction and the commanded spacecraft dipole. Unloading changes stored momentum.','dipoleAm2','cmg',[row('Local field',val(s.magFieldUT,'µT')),row('Installed dipole',val(d.dipoleAm2,'A·m²')),row('Unloading authority',val(s.unloadAuthorityNm,'N·m',4)),row('Coil input',val(s.coilKW,'kW'))]),
 P('loads','Induced environment','Serving electrical demand heats the equipment. Battery conversion losses enter the pack, and moving joints and terminals draw from the same bus.','attitude','enclosure',[row('Equipment and pack to loop',val(s.heatInputKW,'kW')),row('Pack conversion loss',val(s.packLossKW,'kW')),row('Joint and terminal draw',val(s.jointKW+s.terminalKW,'kW')),row('Torque to CMGs',val(s.torqueNm,'N·m',5))])];
 const art=T(39,33,'NATURAL DRIVERS','sd-over','start')+T(385,33,'SPACECRAFT RESPONSE','sd-over','start')+
 pick(parts[0],35,46,139,49,circle(55,70,10,'sd-sun')+T(80,65,'Sun + Earth IR','sd-name','start')+T(80,85,val(s.earthIRIrradiance,'W/m² IR'),'sd-value','start'))+
 pick(parts[1],35,108,156,51,path('M40 124h28m-20 6h22m-28 7h24','sd-atmos-lines')+T(80,124,'Thermosphere','sd-name','start')+T(80,144,val(s.relativeSpeedMs/1000,'km/s'),'sd-value','start'))+
 pick(parts[2],35,175,148,52,glyph('torquer',54,193,.45)+T(80,190,'Local field','sd-name','start')+T(80,210,val(s.magFieldUT,'µT'),'sd-value','start'))+
 flow(id,'M190 71H228L256 102','amber',s.solarKW>0)+flow(id,'M190 130H253','cyan',s.dragN>0)+flow(id,'M190 195H223L257 156','violet',s.unloadTorqueNm>0)+
 pick(parts[3],249,85,111,99,glyph('chip',303,125,.94)+T(301,171,'Vehicle','sd-name'))+
 flow(id,'M341 113H379L397 75H420','amber',s.solarKW>0)+flow(id,'M341 130H420','cyan',s.heatInputKW>0)+flow(id,'M341 149H376L398 193H420','violet',s.torqueNm>0)+
 T(432,70,'Generation','sd-name','start')+T(432,89,val(s.solarKW,'kW'),'sd-value','start')+
 T(432,127,'Loop heat','sd-name','start')+T(432,146,val(s.heatInputKW,'kW'),'sd-value','start')+
 T(432,189,'Disturbance','sd-name','start')+T(432,208,val(s.torqueNm,'N·m',4),'sd-value','start');
 return info('Environmental coupling','Natural forcing and onboard response at the shared mission instant',parts,art,[legend('amber','Radiation / generation'),legend('cyan','Flow / heat'),legend('violet','Field / torque')],s.referenceBody?'Reference-body descent':s.t<540?'Launch boundary':s.eclipse?'Earth shadow':'Sunlit orbit');
}

function data({h,d,s,day,events},id){
 if(h.ai&&purposeId(h)!=='text')return purpose({h,d,s,events},id);
 const parts=[
 P('text','Output text','The tokenizer traffic model converts generated tokens to transmitted bytes before communication overhead.','bytesPerToken','compute',[row('Serialization',val(d.bytesPerToken,'B/tok')),row('Instantaneous generated text',val(s.tokensPerSec*d.bytesPerToken*8/1e6,'Mbit/s',4)),row('Text waiting',val(s.textQueueGB,'GB',4)),row('Text received',val(s.textDeliveredGB,'GB',4))]),
 P('bulk','Bulk products','Imagery, checkpoints and model packages occupy the bulk recorder queue independently of text token rates.','bulkMbps','storage',[row('Bulk offered when active',val(d.bulkMbps,'Mbit/s')),row('Initial payload',val(d.initialQueueGB,'GB')),row('Bulk waiting',val(s.bulkQueueGB,'GB')),row('Bulk received',val(s.bulkDeliveredGB,'GB'))]),
 P('recorder','Onboard recorder','Incoming products are limited by write rate and available capacity. The live queue gives the amount still awaiting offload.','storageTB','storage',[row('Raw / usable',val(h.storageTB,'TB')+' / '+val(h.usableTB,'TB')),row('Free capacity',val(s.freeTB,'TB')),row('Dropped bytes',val(s.droppedGB,'GB')),row('Current queue',val(s.queueGB,'GB'))]),
 P('received','Ground receipt','Separate ground-received output from on-board generation. Transfers cannot deliver more bytes than the queued and newly arrived data.','linkCapMbps','communications',[row('Text goodput',val(s.textGoodputMbps,'Mbit/s')),row('Bulk goodput',val(s.bulkGoodputMbps,'Mbit/s')),row('Received output tokens',val(s.tokensDelivered,'tok',0)),row('Window downlink',val(day.deliveredGB,'GB'))],events.find(e=>e.type==='contact'&&e.end>=s.t))];
 const art=T(37,36,'ONBOARD PRODUCTS','sd-over','start')+T(426,36,'GROUND RECEIPT','sd-over','start')+
 pick(parts[0],32,51,110,79,glyph('chip',86,78,.63)+named(86,113,'Text',val(s.textQueueGB,'GB',3)))+
 pick(parts[1],32,146,110,85,glyph('ssd',86,169,.67)+named(86,204,'Bulk',val(s.bulkQueueGB,'GB')))+
 flow(id,'M139 81H179L204 107H238','cyan',s.tokensPerSec>0)+flow(id,'M139 172H179L204 144H238','violet',s.burst&&d.bulkMbps>0)+
 pick(parts[2],234,77,102,127,glyph('rack',284,125,1.02)+named(284,176,'Recorder',val(s.queueGB,'GB')))+
 flow(id,'M322 114H432','cyan',s.textGoodputMbps>0)+flow(id,'M322 139H432','violet',s.bulkGoodputMbps>0)+
 pick(parts[3],431,81,120,123,glyph('dish',487,120,.92)+named(487,178,s.station||'Ground site',val(s.deliveredGB,'GB received')))+
 T(379,99,'TEXT','sd-over')+T(379,162,'BULK','sd-over');
 return info('Payload custody','Separate text and bulk queues from completed ground deliveries',parts,art,[legend('cyan','Output text'),legend('violet','Bulk payload')],s.goodputMbps>0?'Delivering':'Buffering');
}

function mechanical({h,d,s},id){
 const parts=[
 P('adapter','Separation interface','Launch loads pass through the adapter ring into the base of the bus. Mechanical coordinates use this plane when reporting launch height.','adapterKg','adapter',[row('Adapter',val(d.adapterKg,'kg')),row('Launch stack',val(h.launchKg,'kg'))]),
 P('frame','Primary frame','Transverse frames back the side fittings. Four longitudinal members connect them to the aft thrust and separation deck.','skinKgM2','structure',[row('Width × height',val(h.bodyWidthM,'m',2)+' × '+val(h.bodyHeightM,'m',2)),row('Length along +Z',val(h.bodyLengthM,'m',2))]),
 P('mounts','Equipment and appendages','Equipment mounts connect the flight computer, compute trays, pressure vessels and deployable hardware to the structure.','trayCount','compute',[row('Installed trays',h.trays),row('Vacant geometric tray positions',h.rackLayout.spare),row('Remaining propellant',val(s.propellantKg,'kg'))])];
 const art=T(295,40,'LAUNCH LOAD PATH','sd-over')+flow(id,'M169 122H220','steel',false)+flow(id,'M371 122H419','steel',false)+
 pick(parts[0],20,67,149,116,ellipse(94,109,31,9,'sd-metal')+ellipse(94,108,19,4,'sd-device')+named(94,147,'Adapter ring',val(d.adapterKg,'kg')))+
 pick(parts[1],220,67,151,116,path('M269 94h52v32h-52zM269 94l52 32m0-32l-52 32','sd-hardware')+named(295,147,'Primary frame',val(h.bodyLengthM,'m body',2)))+
 pick(parts[2],419,67,150,116,glyph('rack',494,108,.7)+named(494,147,'Installed equipment',h.trays+' compute trays'));
 return info('Structural interfaces','From the separation ring to equipment attachments',parts,art,[legend('steel','Mechanical connection')],'Fixed load path');
}
function avionics({d,s},id){
 const parts=[
 P('uplink','Ground command queue','S-band passes carry spacecraft commands to the flight computer. The queue can grow during loss of contact.','commandKbps','communications',[row('Offered',val(d.commandKbps,'kbit/s')),row('Earth backlog',val(s.uplinkQueueMB,'MB'))]),
 P('flight','Spacecraft flight computer','The computer runs command sequences and supervises spacecraft subsystems. AI workloads execute on the separate payload trays.',null,'avionics',[row('Flight electronics demand',val(s.cdhKW,'kW',3)),row('Commands received',val(s.commandGoodputKbps,'kbit/s'))]),
 P('health','Housekeeping recorder','Stores time-tagged spacecraft health records between ground contacts. Capacity limits determine when older samples are overwritten.','hkRecorderMB','avionics',[row('Sample cadence',val(d.hkPeriodS,'s')),row('Recorder occupancy',val(s.hkStoredMB,'MB',3)),row('Overwritten',val(s.hkOverwrittenMB,'MB',3))])];
 const art=flow(id,'M169 120H218','cyan',s.commandGoodputKbps>0)+flow(id,'M369 120H416','green',s.hkRateKbps>0)+
 pick(parts[0],22,62,147,119,glyph('patch',96,104,.83)+named(95,149,'Ground commands',val(s.commandGoodputKbps,'kbit/s')))+
 pick(parts[1],218,62,151,119,glyph('chip',292,105,.86)+named(294,149,'Flight computer',val(s.cdhKW*1000,'W')))+
 pick(parts[2],416,62,151,119,glyph('ssd',492,105,.81)+named(492,149,'Health recorder',val(s.hkStoredMB,'MB',2)));
 return info('Spacecraft avionics','Command execution and spacecraft health records',parts,art,[legend('cyan','Commands from Earth'),legend('green','Housekeeping telemetry')],s.flightPhase);
}
function software({s},id){
 const parts=[
  P('estimate','Navigation state','Guidance reads the propagated position, velocity, Sun direction and achieved body attitude. This study assumes ideal knowledge of the simulated state.',null,'avionics',[row('Flight phase',s.flightPhase),row('Body rate',val(s.bodyRateDegS,'°/s',3))]),
  P('executive','Mode executive','Restraints, maneuvers, contact and eclipse can supersede the nominal body reference. Each mechanism receives a reachable command.','attitude','avionics',[row('Active mode',s.attitudeModeLabel),row('Objective',s.attitudeObjective)]),
  P('actuate','Actuators and interlocks','Gyros turn the body. Joint drives move wings, radiator banks and terminals. The next step uses their achieved pose.',null,'cmg',[row('Body error',val(s.attitudeSlewErrorDeg,'°',3)),row('RF / optical steering',s.terminalState)])];
 const art=flow(id,'M175 112H214','cyan')+flow(id,'M377 112H415','cyan')+flow(id,'M494 163V204H99V164','green')+
  [[17,97,'earth','Navigation','Orbit and attitude'],[215,295,'chip','Guidance','Mode and reference'],[416,495,'wheel','Control','Achieved motion']].map(([x,c,g,a,b],i)=>pick(parts[i],x,50,157,113,glyph(g,c,91,.84)+named(c,130,a,b))).join('')+
  T(297,225,'Achieved pose and joint angles feed the next update','sd-name');
 return info('From command to motion','Select a stage to follow the feedback loop.',parts,art,[legend('cyan','State and commands'),legend('green','Feedback')],s.attitudeModeLabel||s.flightPhase);
}
const builders={conops,purpose,environment,orbit,compute,data,comm,power,thermal,attitude,prop,mass,launch,launcher,mechanical,avionics,software};
export const schematicPages=Object.keys(builders);
const indexes=Object.fromEntries(schematicPages.map((k,i)=>[k,String(i+1).padStart(2,'0')]));
const norm=({hardware:h,state:s,day={},events=[],selected,instance,qualificationWindow,thermalScale})=>({h,d:h.input,s,day,events,selected,instance,qualificationWindow,thermalScale});
function rangeBand(q){
 if(!q||!Number.isFinite(q.minK)||!Number.isFinite(q.maxK)||q.minK>=q.maxK)return '';
 const span=q.maxK-q.minK,padding=Math.max(10,span*.14),lo=q.minK-padding,hi=q.maxK+padding;
 const pos=v=>100*frac((v-lo)/(hi-lo)),known=Number.isFinite(q.temperatureK)&&q.status!=='unassessed';
 return `<div class="sd-range"><div class="sd-rangehead"><span>${esc(q.state)} range</span><b>${known?val(q.temperatureK,'K'):'Unassessed'}</b></div><div class="sd-rangetrack"><i style="left:${pos(q.minK)}%;right:${100-pos(q.maxK)}%"></i>${known?`<b class="${q.status==='pass'?'':'sd-outside'}" style="left:${pos(q.temperatureK)}%"></b>`:''}</div><div class="sd-rangeends"><span>${val(q.minK,'K')}</span><span>${val(q.maxK,'K')}</span></div></div>`;
}
function detail(part,selected){
 const editText=part.editLabel||(part.edit?'Edit '+({trayCount:'tray count',batteryKWh:'pack size',solarM2:'array size',radiatorM2:'radiator area',launchAllowanceKg:'allowance',link:'terminal',isp:'specific impulse'}[part.edit]||'design input'):'');
 return `<div class="sd-detail" data-sd-detail="${esc(part.id)}" ${selected?'':'hidden'}><div class="sd-description"><span class="sd-caption">SELECTED COMPONENT</span><h4>${esc(part.title)}</h4><p>${esc(part.description)}</p>${rangeBand(part.range)}<div class="sd-actions">${part.edit?`<button type="button" data-sd-edit="${esc(part.edit)}">${esc(editText)} <span aria-hidden="true">↗</span></button>`:''}${(part.extraEdits||[]).filter(([key])=>key!==part.edit).map(([key,label])=>`<button type="button" data-sd-edit="${esc(key)}">${esc(label)} <span aria-hidden="true">↗</span></button>`).join('')}${part.inspect?`<button type="button" data-sd-inspect="${esc(part.inspect)}">Inspect hardware <span aria-hidden="true">↗</span></button>`:''}${part.event?`<button type="button" data-sd-event="${esc(part.event.id)}">Select ${esc(part.event.type==='contact'?'pass':part.event.type==='eclipse'?'eclipse':'event')} <span aria-hidden="true">→</span></button>`:''}</div></div><dl class="sd-readings">${part.details.map(([n,v])=>`<div><dt>${esc(n)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>`;
}
export function renderSubsystemDiagram(page,context){
 if(!builders[page])return '';
 const c=norm(context),id='odc-sd-'+safeId(page)+'-'+(++sequence),model=builders[page](c,id),selected=model.parts.find(p=>p.id===c.selected)?.id??model.parts[0].id;
 const statusTone=/exceeded|outside range|failed/i.test(model.status)?' sd-status-alert':/standby|out of view|unassessed|eclipse|closed|pre-insertion/i.test(model.status)?' sd-status-idle':'';
 const t=Number.isFinite(c.s.t)?Math.abs(c.s.t):0,clock=(c.s.t<0?'−':'+')+Math.floor(t/86400)+'d '+[Math.floor(t%86400/3600),Math.floor(t/60)%60,Math.floor(t)%60].map(x=>String(x).padStart(2,'0')).join(':');
 return `<section class="sd-sheet" data-sd-sheet="${page}" data-sd-selected="${selected}" aria-labelledby="${id}-title"><header class="sd-heading"><div><span class="sd-caption">SYSTEM PLATE &nbsp; / &nbsp; ${indexes[page]}</span><h3 id="${id}-title">${esc(model.title)}</h3><p>${esc(model.subtitle)}</p></div><span class="sd-status${statusTone}">${esc(model.status)}</span></header><div class="sd-figure"><svg class="sd-art" viewBox="0 0 590 250" role="group" aria-labelledby="${id}-svg-title"><title id="${id}-svg-title">${esc(model.title)} schematic. Select a component to inspect it or edit its design.</title>${defs(id)}<rect width="590" height="250" fill="url(#${id}-grid)"/>${model.art.replaceAll(`data-sd-pick="${selected}"`,`data-sd-pick="${selected}" aria-pressed="true"`)}</svg></div>${model.temperatureKey||''}<div class="sd-key"><div>${model.legends.map(l=>`<span class="sd-legend sd-${l.color}"><i></i>${esc(l.label)}</span>`).join('')}</div><span class="sd-clock">MET ${clock}</span></div><div class="sd-bottom"><div class="sd-selector"><span class="sd-caption">EXPLORE</span><div class="sd-tabs" role="group" aria-label="Select schematic component">${model.parts.map(p=>`<button type="button" data-sd-pick="${p.id}" aria-pressed="${p.id===selected}">${esc(p.title.replace(' allocation',''))}</button>`).join('')}</div><select aria-label="Select schematic component" data-sd-select>${model.parts.map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${esc(p.title)}</option>`).join('')}</select></div>${model.parts.map(p=>detail(p,p.id===selected)).join('')}</div></section>`;
}
function selectPart(sheet,id){
 if(!Array.from(sheet.querySelectorAll('[data-sd-detail]')).some(el=>el.dataset.sdDetail===id))return;
 sheet.dataset.sdSelected=id;
 sheet.querySelectorAll('[data-sd-pick]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.sdPick===id)));
 sheet.querySelectorAll('[data-sd-detail]').forEach(el=>{el.hidden=el.dataset.sdDetail!==id});
 const field=sheet.querySelector('[data-sd-select]');if(field)field.value=id;
}
export function bindSubsystemDiagram(container,{onEdit,onInspect,onEvent,onSelect}={}){
 const choose=(sheet,key)=>{selectPart(sheet,key);onSelect?.(key,sheet.dataset.sdSheet)};
 const click=e=>{
  const el=e.target.closest('[data-sd-pick],[data-sd-edit],[data-sd-inspect],[data-sd-event]'),sheet=el?.closest('[data-sd-sheet]');
  if(!sheet||!container.contains(sheet))return;
  if(el.hasAttribute('data-sd-pick'))choose(sheet,el.dataset.sdPick);
  else if(el.hasAttribute('data-sd-edit'))onEdit?.(el.dataset.sdEdit);
  else if(el.hasAttribute('data-sd-inspect'))onInspect?.(el.dataset.sdInspect);
  else if(el.hasAttribute('data-sd-event'))onEvent?.(el.dataset.sdEvent);
 };
 const keydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('g[data-sd-pick]')){e.preventDefault();choose(e.target.closest('[data-sd-sheet]'),e.target.dataset.sdPick)}};
 const change=e=>{if(e.target.matches('[data-sd-select]'))choose(e.target.closest('[data-sd-sheet]'),e.target.value)};
 container.addEventListener('click',click);container.addEventListener('keydown',keydown);container.addEventListener('change',change);
 return ()=>{container.removeEventListener('click',click);container.removeEventListener('keydown',keydown);container.removeEventListener('change',change)};
}
export function updateSubsystemDiagram(container,page,context){
 const current=container.matches('[data-sd-sheet]')?container:container.querySelector('[data-sd-sheet]');
 const samePage=current?.dataset.sdSheet===page,selected=context.selected??(samePage?current.dataset.sdSelected:null);
 const focused=current?.contains(document.activeElement)?document.activeElement:null,focusAttr=focused?.getAttributeNames().find(n=>n.startsWith('data-sd-')),key=focusAttr&&focused.getAttribute(focusAttr),tag=focused?.tagName;
 const html=renderSubsystemDiagram(page,{...context,selected});let sheet;
 if(current){const holder=document.createElement('template');holder.innerHTML=html;sheet=holder.content.firstElementChild;if(sheet)current.replaceWith(sheet);else current.remove();}
 else{container.innerHTML=html;sheet=container.querySelector('[data-sd-sheet]');}
 if(sheet&&samePage&&focusAttr){Array.from(sheet.querySelectorAll('['+focusAttr+']')).find(el=>el.tagName===tag&&el.getAttribute(focusAttr)===key)?.focus({preventScroll:true});}
 return sheet;
}
