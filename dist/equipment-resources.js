// Every power number is an electrical load at the equipment boundary. Generation,
// charging and discharge are energy transfers and are excluded from consumption.
import {architectureFamily} from './architecture-families.js';
import {electricalBoxLayout} from './electrical-architecture.js';
const electricalLayouts=new WeakMap();
function electricalEnvelope(h,wbs){let boxes=electricalLayouts.get(h);if(!boxes){boxes=electricalBoxLayout(h);electricalLayouts.set(h,boxes);}const parts=boxes.filter(b=>b.wbs===wbs);return parts.length?[0,1,2].map(axis=>Math.max(...parts.map(p=>p.positionM[axis]+p.dimensionsM[axis]/2))-Math.min(...parts.map(p=>p.positionM[axis]-p.dimensionsM[axis]/2))):null;}
const model=(file,label)=>({url:'./'+file,label});
const sizing=model('design.js','Installed sizing equations'),flight=model('model.js','Mission load equations'),geometry=model('craft.js','Vehicle installation drawing'),terminal=model('physics.js','Terminal load model');
const prop=model('spacecraft-architecture.js','Pressure vessel and engine sizing'),packing=model('deployment.js','Rigid-panel envelope');
const energy=model('energy-system.js','Selected power and thermal interfaces'),service=model('service-architecture.js','Installed compute and fabric architecture');
const n=v=>Number.isFinite(v)?v:0;
export function equipmentResources(r,h,s){
 const d=h.input,w=h.bodyWidthM,b=h.bodyHeightM,l=h.bodyLengthM,p=h.propulsion,q=r.quantity,id=r.wbs,architecture=architectureFamily(h);
 const pkg=p.installDims?.[id],zdepth=p.equipmentLengthM??Math.max(.25,l/2-(p.forwardDeckZ??-.25*l));
 const tray=h.rackLayout.slotDimensionsM;
 const shell=[w,b,l],smallBox=[w*.20,b*.28,zdepth*.14],vessel=p.tanks[Math.max(0,Math.min(2,Number(id.slice(3))-3))];
 const tankDims=t=>Array(3).fill(2*t.radiusM);
 const serviceFraction=Number.isFinite(s?.powerServiceFraction)?Math.max(0,Math.min(1,s.powerServiceFraction)):s?1:0;
 const installed=h.serviceArchitecture,eps=h.energySystem,memW=1000*h.acceleratorKw,hostW=1000*n(installed?.compute.extraHostActiveKW),fabricW=1000*n(installed?.fabric.activeKW),actualITW=1000*n(s?.itKW);
 const idle=[h.trays*d.trayIdleKw,n(installed?.compute.extraHostIdleKW),n(installed?.fabric.idleKW)].map(x=>1000*x),active=[memW,1000*h.ai.hostKw,1000*h.ai.fabricKw].map((x,i)=>Math.max(idle[i],x)),idleW=idle.reduce((a,b)=>a+b,0),activeW=active.reduce((a,b)=>a+b,0);
 const activity=activeW>idleW?Math.max(0,Math.min(1,(actualITW-idleW)/(activeW-idleW))):0;
 const shares=idle.map((x,i)=>x+(active[i]-x)*activity),shareSum=shares.reduce((a,b)=>a+b,0),computeNow=shares.map((x,i)=>shareSum>0?actualITW*x/shareSum:i===0?actualITW:0);
 const workerOptics=installed?.fabric?.workerOptics,opticsW=workerOptics?.powerW||0,opticsNow=shareSum>0?actualITW*Math.min(opticsW,shares[2])/shareSum:0;
 const auxW=1000*n(s?.auxKW)*serviceFraction,burnW=s?.burn?Math.min(150*serviceFraction,auxW):0,houseW=auxW-burnW;
 const cdhW=Math.min(houseW,(Number.isFinite(s?.cdhKW)?1000*s.cdhKW:h.cdh?.operatingW??45)*serviceFraction),allocatedHotelW=Math.max(0,houseW-cdhW);
 const rfW=1000*n(s?.terminalKW)*serviceFraction,hasRelay=s?.aiRelayOn||s?.aiActiveRoute==='relay';
 let kaW=s?.groundLink==='Ka'?Math.min(205*serviceFraction,rfW):0;
 let opticalW=s?.groundLink==='Optical'||hasRelay?Math.min(240*serviceFraction,rfW-kaW):0;
 // Without the optional S-band assembly, its former residual row does not
 // exist. Payload-terminal steering/standby belongs to the selected installed
 // payload head; it cannot disappear from the served-load ledger.
 if(architecture.sPatchCount===0){
  const kaSelected=architecture.kaTerminalCount>0&&!hasRelay&&(s?.selectedPayloadTerminal==='Ka'||s?.groundLink==='Ka');
  kaW=kaSelected?rfW:0;opticalW=rfW-kaW;
 }
 let power=0,now=0,mode='Passive',powBasis='Passive allocation. No separately powered equipment is assigned to this row.',powSrc=flight;
 let dims=pkg||shell,scope='Distributed installation',basis='Body envelope bounding this distributed allocation. Assemblies sharing this envelope overlap spatially.',dimSrc=geometry;
 function electric(W,instant,label,note,ref=flight){power=W;now=instant;mode=label;powBasis=note;powSrc=ref;}
 function envelope(size,label,note,ref=geometry){dims=pkg||size;scope=label;basis=pkg?'Body-axis installation envelope from the common spacecraft layout. '+note:note;dimSrc=ref;}
 if(id==='01.01'||id==='01.02'){
  const gpu=id==='01.01',W=gpu?memW:hostW;
  electric(W,computeNow[gpu?0:1],'Active compute',gpu?'Installed tray rating includes embedded hosts. Actual served IT power is apportioned across tray, additional-host and external-fabric idle/active allocations.':'Installed additional-host module rating. Embedded hosts remain inside the tray electrical allocation; current draw uses the shared actual IT-power boundary.',service);
  envelope(tray,'Shared tray envelope',d.compute==='dgx'?'Published DGX H100 chassis dimensions. The flight and thermal integration is a study assumption.':'Study tray envelope shared by boards, host and cold plate. A separate pitch reserves installation and service clearance.',d.compute==='dgx'?{label:'NVIDIA · DGX H100/H200 chassis',url:'https://docs.nvidia.com/dgx/dgxh100-user-guide/introduction-to-dgxh100.html'}:model('rack-layout.js','Installed rack lattice'));
  if(architecture.payloadLocation==='radiator'){scope='Tray on local radiator platform';basis+=' Payload tray stations follow the moving radiator platform; additional host modules remain separately allocated in the bus.';}
 }
 if(id==='01.03'){
  electric(h.storageKw*1000,n(s?.storageKW)*1000*serviceFraction,'Recorder operating','Installed drive count × selected module draw. The current column applies the admitted service-power fraction.',sizing);
  envelope([w*.512,b*.12,zdepth*.132],'Recorder bank','Shared bank envelope holding all installed drives. Individual drive packaging depends on the selected carrier.');
 }
 if(id==='01.04'){electric(fabricW-opticsW,computeNow[2]-opticsNow,'Fabric active','Installed switch, NIC and storage-controller electronics/cages. The separately named LR4 modules are excluded from this row. Actual idle/active allocation is a share of served IT power; fixed platform interfaces remain in spacecraft auxiliary loads.',service);envelope(smallBox,'Electronics allowance','Shared electronics mounting volume. Final line-card arrangement is open.');}
 if(id==='01.05'&&workerOptics){electric(opticsW,opticsNow,'Powered optical interface',workerOptics.powerBasis+' Current draw is its share of the actual served IT boundary, counted once.',{url:workerOptics.sourceUrls[0],label:'NVIDIA LR4 module maximum power'});envelope(workerOptics.moduleDimensionsM,'One allocated LR4 module','20 × 15 × 80 mm preliminary module envelope, inserted at each allocated switch/computer optical port.',model('redwire-payload-transfer.js','LR4 endpoint project allocation'));}
 if(id==='02.01'){envelope([h.wingLengthM,.002,h.wingWidthM],'One deployed flexible blanket','Length × packed blanket gauge allowance × width at zero tilt. The boom cross-section, drum and saddle are additional.',packing);powBasis='Generation appears in the solar power budget. Drive consumption is on 07.04.';}
 if(id==='02.02'){const vol=h.batteryKWh/d.packWhL/q;const c=Math.cbrt(vol);envelope([c,c,c],'Equivalent pack envelope','One quarter of battery volume from Wh/pack volumetric energy density, expressed as an equal-volume cube.',sizing);powBasis='Charge/discharge is energy transfer. Battery management electronics are inside the shared auxiliary budget.';}
 if(id==='02.03'){electric(Math.max(0,420+1000*h.switchKw-(h.cdh?.operatingW??45))+1000*n(eps?.electrical.peakConversionLossKW),allocatedHotelW+1000*n(s?.epsConversionLossKW),'Conversion and bus support','Installed peak DC/DC and quiescent losses plus the residual platform auxiliary allocation. Current conversion loss is already served and is counted once. MPPT source loss and pack transfer loss are outside bus consumption.',energy);envelope(smallBox,'Shared power-conversion mounting volume','Modular PCDU and converter allocation within the service electronics envelope.');}
 if(id==='03.01'){const count=h.radiatorPanelsPerBank||2,stand=count>2?.060:.082;envelope([h.radiatorWidthM,.07+4*stand*Math.max(0,count/2-1),h.radiatorLengthM+.14*count],architecture.radiatorBankCount===1?'One local radiator platform':'One deployed bank',`${count} panels per assembly; ${architecture.radiatorBankCount} installed assemblies. Radiating planform excludes hinge gaps. Platform-mounted compute is accounted separately.`,packing);}
 if(id==='03.02'){
  const t=eps.thermal,passive=t.kind==='passive-local',lift=t.kind==='heat-lift';
  electric(1000*(h.pumpKw+n(t.heatPumpDesignKW)+n(eps.coldControl.totalHeaterKW)+n(eps.coldControl.controlKW)),1000*(n(s?.pumpKW)+n(s?.servedHeatPumpKW??s?.heatPumpInputKW)+n(s?.batteryHeaterKW)+n(s?.loopHeaterKW)+n(s?.radiatorHeaterKW)+n(s?.thermalControlKW)),passive?'Passive transport / cold control':lift?'Heat pump and cold control':'Pumps and cold control',passive?'Local spreader/heat-pipe transport consumes no pump power. Only finite battery cold control and thermal electronics draw electrical load.':lift?'Compressor work uses the separate primary-bus motor drive. It is charged once to electrical load and added once to hot-side rejection; battery cold control remains at the pack. Drive conversion and wiring losses are in their EPS rows.':`${t.pumpsOperating} operating and ${t.pumpsInstalled} installed pumps across ${t.loopCount||1} fluid loop(s), plus finite cold-control authority. Current values are served loads; each heater deposits heat once at its receiving node.`,energy);
  if(passive){dims=[1,.03,1];scope='Local spreader packaging allowance';basis='Published 1 m square spreader footprint with a 30 mm installation-depth allocation. Distributed heat pipes, bus straps and battery heaters have separate locations; this is not an all-up transport envelope.';dimSrc=energy;}
  if(lift){scope='Unresolved heat-pump accommodation';basis='Allocated service-bay envelope only. Compressor, heat exchangers, drive and pressure-containment geometry remain open; the mass allocation does not establish packaging closure.';dimSrc=energy;}
 }
 if(id==='04.01'){const c=h.cmg;electric(c?.maneuverW??320,n(s?.cmgKW)*1000*serviceFraction,'Maneuver','Four powered control moment gyroscopes. The command profile selects idle or maneuvering electrical demand.');envelope(c?.mechanismDimsM??[.30,.28,.30],'One gyro mechanism','Mechanism envelope per unit. Shared electronics are carried separately within this WBS allocation.',c?.referenceUrl?{url:c.referenceUrl,label:c.model}:geometry);}
 if(id==='04.02'){electric(120,n(s?.coilKW)*1000*serviceFraction,'Magnetic unloading','Three-axis rod cluster draws 120 W during a scheduled unload.');envelope([w*.31,.047,.047],'One rod envelope','Length and transverse envelope of a modeled rod with its winding.');}
 if(id==='04.03'){electric(null,0,'Shared bus load','Sensor electrical demand is included in auxiliary bus support. Its independent draw is unresolved.');envelope(smallBox,'Sensor suite allocation','Shared electronics accommodation for the sensor suite. Optical head mounting is mission-specific.');}
 if(id==='05.01'){electric(35,rfW-kaW-opticalW,'Command radio active','S-band uses 15 W in standby and 35 W in contact. Residual command/standby channels are assigned here.',terminal);envelope([.025,b*.14,w*.21],'One patch envelope','Two opposing body-mounted patches. The separate transceiver is in the electronics allocation.');}
 if(id==='05.02'){electric(205+(architecture.sPatchCount===0?24:0),kaW,'Ka-band in contact','Active RF chain and pointing allocation on a direct Ka-band contact. When no S-band assembly is present, this row also carries its own standby/steering draw.',terminal);envelope([d.kaDishM,.42*d.kaDishM,d.kaDishM],'Reflector and feed','Aperture diameter × mounted feed height × diameter. Positioner base is separate.');}
 if(id==='05.03'){electric(240*architecture.opticalTerminalCount+(architecture.sPatchCount===0?24:0),opticalW,'Optical link active','240 W per allocated terminal for acquisition, tracking and transmission. A no-S-band package carries the shared 24 W payload-steering allowance here. Current draw follows the actual active route; two installed heads alone do not establish simultaneous service or continuous coverage.',terminal);envelope([d.opticalApertureM*1.6,d.opticalApertureM*1.1,d.opticalApertureM*1.6],'One optical head','Head barrel and aperture shroud as a multiple of the selected clear aperture.');}
 if(id==='06.01'){const e=p.engines[0];envelope([2*e.exitRadiusM,2*e.exitRadiusM,Math.abs(e.throatZ!=null?e.throatZ-e.z:e.throatY-e.y)],'One engine bell','Exit diameter × exit diameter × bell length, from the fitted thruster geometry.',prop);powBasis='Chamber power is chemical. Valve electrical demand is assigned to the feed assembly.';}
 if(id==='06.02')electric(150,burnW,'Valves open during burn','Electrical increment on the auxiliary bus during chemical firing.');
 if(/^06\.0[3-5]$/.test(id))envelope(tankDims(vessel),'Installed vessel diameter','Outer spherical envelope includes shell and mounting allowance. Internal volume is in the propulsion register.',prop);
 if(/^06\.0[678]$/.test(id)){const ti=Number(id.slice(3))-6;envelope(tankDims(p.tanks[ti]),ti===2?'Helium bottle at loading':'Shared vessel envelope','Contained fluid occupies its vessel. Do not add this envelope to its shell volume.',prop);}
 if(id==='07.04')electric(60,1000*n(s?.jointKW)*serviceFraction,'Deployment / rotary tracking','60 W is the single deployment-motor reference. The live power column follows release, unfolding, wing pointing and both radiator cant and trim drive loads.');
 if(id==='07.05')electric(1000*n(eps?.electrical.peakHarnessLossKW),1000*n(s?.harnessLossKW),'Distribution dissipation','Primary, 48 V payload and 28 V service I²R losses at installed peak / actual admitted load. Array wiring losses occur upstream of the bus and are excluded from bus consumption.',energy);
 if(id==='08.01'){electric(h.cdh?.operatingW??45,cdhW,'Flight avionics active','Flight computer, GNSS receiver/antenna interface, command interfaces and spacecraft recorder are carried within the existing flight-avionics power and 12 kg mass allocation.');envelope(h.cdh?.suiteDimsM??smallBox,'Flight avionics suite','Bounding installation allocation including GNSS, interfaces and mounts. The Moog unit retains its own comparison dimensions; it does not qualify this integrated suite.');}
 if(id==='09.01'){const a=h.fairing?.stack?.[0];if(a)envelope([a.widthM,a.heightM,h.payloadInterface.upperFaceStationM],'Active adapter and stand-off','Bounding diameter of launcher transition and stack height up to the spacecraft mounting face.',model('fairings.js','Fairing interface model'));}
 if(['01.04','02.03','08.01'].includes(id)){
  const installedEnvelope=electricalEnvelope(h,id);if(installedEnvelope){dims=installedEnvelope;scope=id==='01.04'?'Installed switch cassette group':'Separate electrical enclosure';basis='Physical box positions and dimensions from the controlled electrical interface layout, shared with harness endpoints and the 3D installation. Supplier reference dimensions remain a comparison.';dimSrc=model('electrical-architecture.js','Electrical box and connector layout');}
 }
 const comparison={
  '01.01':d.compute==='dgx'?[10200,[.4823,.356,.8971],'Complete DGX H100 server, maximum input and chassis']:d.compute==='flight'?[400,null,'A100 80 GB SXM standard chip thermal design power']:[],
  '01.03':d.storage==='rugged'?[]:[14,null,'Micron 7450 PRO 3.84 TB U.3 drive, maximum RMS active write. Table 4.'],
  '04.01':[h.cmg?.referenceManeuverW??null,h.cmg?.referenceDimsM??null,'One supplier reference gyro. Electronics occupy an additional shared enclosure.'],
  '06.03':[null,[.757,.757,.757],'80474-1 published inside diameter, distinct from the installed outside envelope'],
  '06.04':[null,[.584,.584,1.016],'80310-5 published 584 mm inside diameter and 1,016 mm length'],
  '08.01':[37,[.25,.21,.12],'Moog integrated avionics unit, upper reference limits'],
 }[id]||[];
 return {powerMode:mode,operatingPowerW:power,unitOperatingPowerW:power==null?null:power/q,instantPowerW:s?now:null,powerBasis:powBasis,powerSourceUrl:powSrc.url,powerSourceName:powSrc.label,
  dimensionsM:dims,dimensionScope:scope,dimensionBasis:basis,dimensionSourceUrl:dimSrc.url,dimensionSourceName:dimSrc.label,
  comparisonPowerW:comparison[0]??null,comparisonDimensionsM:comparison[1]??null,comparisonBoundary:comparison[2]||''};
}
