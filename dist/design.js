import {terminalStations,deploymentLayout} from './deployment.js';
import {rackSection,rackLayout} from './rack-layout.js';
import {checkPayloadInterface,spacecraftInterface} from './payload-interface.js';
import {sizeGyros,avionics} from './flight-electronics.js';
/** Orbital Data Center • design and reference model. Units use SI and decimal GB. */
import {surfaces,packStep,linkBudget,drag as flightDrag,burnMass} from './physics.js';
import {aiPurposes,aiControls,purposeSizing} from './ai-purpose.js';
import {serviceControls} from './ai-service-inputs.js';
import {thermalControls,validateThermalLimits} from './thermal-limits.js';
import {geometry} from './orbit.js';
import {densities} from './density.js';
import {launchSites,launchSiteFor} from './launch-sites.js';
import {launchFleet} from './launch-fleet.js';
import {fairings,packedSections,fairingFit, radiusAt} from './fairings.js';
import {sizePropulsion,installPropulsion,propulsionReview,propulsionSources} from './spacecraft-architecture.js';
import {sizeEnclosure,solveOuter} from './enclosure.js';
import {disposalRequirement} from './trajectory.js';
export const G0=9.80665, SIGMA=5.670374419e-8, SOLAR=1361, YEAR=31557600;
const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
const rad=x=>x*Math.PI/180;
export const sources=[
 ['NASA Systems Engineering Handbook · Phase D','https://www.nasa.gov/reference/3-7-project-phase-d-system-assembly-integration-and-test-launch/','Phase D covers assembly, integration, verification, validation and launch. The bench reproduces selected ground procedures using the current design.'],
 ['NASA · Ground network compatibility tests, §11.7','https://www.nasa.gov/smallsat-institute/sst-soa/ground-data-systems-and-mission-operations/','The ground station and mission operations center take part in an end-to-end command and telemetry exchange. A local ground-system replica and a controlled RF connection are possible test configurations.'],
 ['NASA Glenn · SCaN Testbed receiver comparison','https://ntrs.nasa.gov/api/citations/20200002144/downloads/20200002144.pdf','A known pseudorandom bit sequence allows comparison of the transmitted and recovered data. The Ka bench uses a project-specific conducted connection.'],
 ['MIT Lincoln Laboratory · TBIRD preflight pointing and alignment','https://ntrs.nasa.gov/citations/20210026049','The team characterized pointing feedback and transmit/receive alignment through environmental testing. The optical bench uses the installed ODC aperture and its own study limits.'],
 ['NASA Scientific Visualization Studio · Deep Star Maps 2020','https://svs.gsfc.nasa.gov/4851/','The orbital sky uses the celestial-coordinate survey map. Right ascension and declination fix the Milky Way and stars in inertial space. The simulator places the Sun separately from its orbital ephemeris.'],
 ...propulsionSources,
 ['NASA · iROSA deployed in orbit','https://www.nasa.gov/blogs/spacestation/2021/06/20/spacewalkers-successfully-deploy-solar-arrays/','Approximately 18 m of roll-out solar array deployed in six minutes on June 20, 2021. The ODC model uses four smaller/equivalently scaled blanket wings and a selected timeline.'],
 ['NASA · iROSA second deployment','https://www.nasa.gov/blogs/spacestation/2021/06/25/second-of-the-new-solar-arrays-successfully-deployed/','The second ISS installation rolled out in about ten minutes. Its deployment mechanism supplies the precedent for elastic boom drive.'],
 ['NASA · ISS thermal control system, pp. 8–12','https://www.nasa.gov/wp-content/uploads/2021/02/473486main_iss_atcs_overview.pdf','Flight hardware reference for radiator tubes, flexible interpanel hoses and separate coolant flow control. The ODC fixed root and folding hinges use a different deployment mechanism.'],
 ['Hoffmann et al. · Training Compute-Optimal Large Language Models','https://arxiv.org/abs/2203.15556','Approximate dense-transformer training compute is 6 × active parameters × training tokens.'],
 ['Transformers · model memory anatomy','https://huggingface.co/docs/transformers/v4.37.0/en/model_memory_anatomy','Mixed-precision Adam training can require 18 bytes per parameter plus activations. State layout, checkpoint size and activation reserve are separate inputs.'],
 ['Hu et al. · LoRA','https://arxiv.org/abs/2106.09685','Low-rank adaptation freezes base weights and trains added parameters. The modeled adapter fraction and service rates are assumptions.'],
 ['U.S. Standard Atmosphere, 1976','https://ntrs.nasa.gov/citations/19770009539','Reference spherical-entry density profile, log-interpolated at 10 km intervals. The actual atmosphere varies.'],
 ['NASA Orbital Debris Program Office · Debris Reentry','https://orbitaldebris.jsc.nasa.gov/reentry/','Real vehicles can fragment or demise. The modeled ellipse describes one assumed surviving ballistic body. The simulation does not perform a breakup, casualty or compliance assessment.'],
 ['NASA Goddard GEVS','https://standards.nasa.gov/standard/gsfc/gsfc-std-7000','Thermal verification distinguishes operational and nonoperational requirements. The numerical limits in this calculator are editable example requirements, separate from measured or supplier-qualified ratings.'],
 ...[...new Set(Object.values(fairings))].map(f=>[f.source,f.sourceUrl,f.note]),
 ['NVIDIA DGX H100','https://docs.nvidia.com/dgx-superpod/design-guides/dgx-superpod-data-center-design-h100/latest/planning.html','Terrestrial comparison, including chassis, hosts and switches outside the chassis separately. 10.2 kW maximum and 130.45 kg per chassis. 981 chassis provide 10.0062 MW and weigh 127.97 t.'],
 ['Cloud TPU v6e','https://docs.cloud.google.com/tpu/docs/v6e','Terrestrial peak of 918 BF16 TFLOP/s per chip. Direct flight performance and tray properties are engineering assumptions.'],
 ['Google Project Suncatcher','https://blog.google/innovation-and-ai/models-and-research/google-research/project-suncatcher-satellite-response/','The supplied November 2026 brief reports Gemma 4 inference and a response downlinked over Svalbard. The simulation uses a separate analytic workload estimator.'],
 ['Project Suncatcher launch','https://blog.google/innovation-and-ai/models-and-research/google-research/project-suncatcher-prototype/','Prototype launch reference in the supplied 4 November 2026 design brief.'],
 ['Suncatcher ground testing','https://blog.google/innovation-and-ai/models-and-research/google-research/google-project-suncatcher-facts/','Ground radiation and thermal-vacuum campaign, separate from the onboard demonstration.'],
 ['TBIRD optical architecture','https://ntrs.nasa.gov/citations/20230005711','Near-infrared 1,550 nm flight architecture and fine pointing.'],
 ['Relativity 200 km reference','https://www.relativityspace.com/press-release/2025/3/7/rycbar123','Reference orbit for 23.5 t downrange recovery rating.'],
 ['ECSS space environment','https://ecss.nl/standard/ecss-e-st-10-04c-rev-1-space-environment-15-june-2020/','Table G-4 provides four JB-2006 total-density profiles from 100 to 900 km. The sizing envelope uses the moderate profile with logarithmic interpolation.'],
 ['NASA CCMC NRLMSIS','https://ccmc.gsfc.nasa.gov/models/NRLMSIS~2.0/','Higher-fidelity neutral-atmosphere comparison model. The onboard estimator uses a simplified atmospheric scenario.'],
 ['NOAA PSL solar flux archive','https://psl.noaa.gov/data/correlation/solar.data','Monthly 10.7 cm solar radio flux, replayed from 2009–2019 as a repeating measured scenario. Short- and long-term flux inputs are proxies derived from monthly data.'],
 ['NOAA solar cycle','https://www.spaceweather.gov/products/solar-cycle-progression','Observed and predicted space-weather indices.'],
 ['NASA spacecraft power','https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/','Technology survey. Pack-level masses, C-rates, delivery losses and retention percentages in the presets are adjustable assumptions.'],
 ['NASA thermal control','https://www.nasa.gov/smallsat-institute/sst-soa/thermal-control/','Radiative exchange and coating technologies. Coating parameters and mounting are design assumptions.'],
 ['NISAR telecom','https://www.jpl.nasa.gov/press-kits/nisar/quick-facts/','Flight reference: up to 3.5 Gbit/s Ka-band, 9 Tbit recorder = 1.125 decimal TB.'],
 ['NASA TBIRD','https://ntrs.nasa.gov/citations/20230007959','Flight reference: 200 Gbit/s laser downlink, 4.8 TB in one pass. Terminal rates in this model are calculated separately.'],
 ['NASA communications','https://www.nasa.gov/smallsat-institute/sst-soa/soa-communications/','S-band tracking, telemetry and command, RF payload and optical terminal survey.'],
 ['NASA attitude control','https://www.nasa.gov/smallsat-institute/sst-soa/guidance-navigation-and-control/','Actuator and sensor technologies. Sizing and motor loads in this model are estimates.'],
 ['ESA ATV propulsion','https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/ATV/ATV_Service_Module','Storable pressure-fed chemical reboost precedent. Engine packages and tank design are illustrative.'],
 ...Object.values(launchFleet).flatMap(v=>[[v.sourceTitle,v.sourceUrl,v.description],...(v.evidenceUrl?[[v.evidenceTitle,v.evidenceUrl,v.status]]:[]),...(v.orbitSourceUrl?[[v.orbitSourceTitle,v.orbitSourceUrl,v.referenceOrbit]]:[])]).filter((row,i,all)=>all.findIndex(r=>r[1]===row[1])===i),
 ['NOAA thermospheric drag','https://www.spaceweather.gov/impacts/satellite-drag','Solar activity and atmospheric drag. Simplified scenario estimates retain strong density uncertainty.'],
 ['MLCommons endpoints','https://mlcommons.org/benchmarks/endpoints/','Metric definitions for throughput and time to first token. The analytic estimates are not measured benchmark results.']
].map(([name,url,note])=>({name,url,note}));
export const presets={
 compute:{flight:{label:'Flight accelerator tray · 2 kW',trayKw:2,trayIdleKw:.32,trayKg:23,chipsPerTray:2,chipTF:312,chipGB:80,chipBW:2039},dgx:{label:'DGX H100 · terrestrial comparison',trayKw:10.2,trayIdleKw:2.2,trayKg:130.45,chipsPerTray:8,chipTF:989,chipGB:80,chipBW:3350},trillium:{label:'Trillium v6e · assumed flight tray',trayKw:1.8,trayIdleKw:.29,trayKg:22,chipsPerTray:4,chipTF:918,chipGB:32,chipBW:1638}},
 workload:{llama8:{label:'Llama 3.1 8B · Q4',paramsB:8.03,bits:4,kvKB:131.072},llama70:{label:'Llama 3.1 70B · Q4',paramsB:70.6,bits:4,kvKB:327.68},gemma:{label:'Gemma 2 9B · BF16',paramsB:9.24,bits:16,kvKB:344.064}},
 storage:{enterprise:{label:'Enterprise TLC SSD',diskModuleTB:4,diskModuleKg:.42,diskRead:6.8,diskWrite:3.7,diskWatts:22,dwpd:1},rugged:{label:'Rugged conduction-cooled SSD',diskModuleTB:2,diskModuleKg:.65,diskRead:3,diskWrite:1.8,diskWatts:15,dwpd:3}},
 battery:{nmc:{label:'Lithium nickel manganese cobalt',packWhKg:160,packWhL:290,chargeC:1,dischargeC:2,chargeEff:.95,dischargeEff:.94,batteryRetention:.975},lfp:{label:'Lithium iron phosphate',packWhKg:110,packWhL:190,chargeC:.8,dischargeC:1.5,chargeEff:.96,dischargeEff:.95,batteryRetention:.983}},
 pv:{multijunction:{label:'Triple-junction III–V',pvEfficiency:.30,pvRetention:.98,pvKgM2:2.6},silicon:{label:'Crystalline silicon',pvEfficiency:.225,pvRetention:.968,pvKgM2:2.2}},
 coating:{osr:{label:'Optical solar reflector',emissivity:.85,absorptivity:.09,emissivityRetention:.997,alphaGrowth:.004},paint:{label:'White silicate paint',emissivity:.90,absorptivity:.17,emissivityRetention:.994,alphaGrowth:.008}},
 engine:{mmh:{label:'MMH / MON-3 · pressure-fed',isp:305,thrustN:880,mixtureRatio:1.65,fuelDensity:.88,oxidizerDensity:1.44},aero:{label:'Aerozine-50 / NTO · pressure-fed',isp:296,thrustN:890,mixtureRatio:1.60,fuelDensity:.903,oxidizerDensity:1.443}},
 launcher:Object.fromEntries(Object.entries(launchFleet).map(([id,v])=>{const p=fairings[id].profile;return [id,{label:v.name,launchSite:launchSiteFor(id).id,referenceKg:v.referenceKg,fairingM:2*Math.max(...p.map(s=>s[1])),fairingLengthM:p.at(-1)[0]}]})),
 network:{global:{label:'Global · six ground sites'},polar:{label:'Polar · three high-latitude sites'},svalbard:{label:'Single site · Svalbard'}},
};
const numeric=(group,rows)=>rows.map(([key,label,unit,min,max,step,value])=>({group,key,label,unit,min,max,step,value}));
const select=(key,label,group,options,value)=>({key,label,group,options,value});
export const controls=[...aiControls,...serviceControls,...Object.entries(presets).map(([key,entries])=>select(key,({pv:'Solar cells',engine:'Engine package',compute:'Compute tray',workload:'Language model',storage:'Storage module',battery:'Battery chemistry',coating:'Radiator finish',launcher:'Launch vehicle',network:'Ground network'})[key],'Technology',Object.fromEntries(Object.entries(entries).map(([id,v])=>[id,v.label])),Object.keys(entries)[0])),
 select('launchSite','Launch site and pad','Launch and insertion',Object.fromEntries(Object.values(launchSites).map(s=>[s.id,s.range+' · '+s.name])),launchSiteFor('terran').id),
 ...numeric('Flight avionics',[
 ['commandKbps','Ground command offering','kbit/s',0,256,1,16],['uplinkBufferMB','Ground command queue','MB',1,8192,1,128],
 ['hkPeriodS','Housekeeping sample period','s',.1,60,.1,1],['hkRecorderMB','Onboard housekeeping recorder','MB',1,8192,1,256]]),
 ...numeric('Installed hardware',[
 ['trayCount','Compute trays','trays',1,2000,1,12],['solarM2','Solar array area','m²',5,150000,1,190],['radiatorM2','Radiator planform','m²',2,90000,1,65],['batteryKWh','Installed battery','kWh',1,25000,1,40],['storageTB','Requested raw storage','TB',.1,10000,.1,8],['propellantKg','Propellant load','kg',1,200000,1,450],['launchAllowanceKg','Mission-specific allowance','kg',100,200000,100,20000],['missionYears','Analysis duration','yr',.003,30,.1,5],['yearsSupply','Station-keeping allocation','yr',0,30,.1,5],['requiredTps','Required active decode throughput','tok/s',1,5e7,100,10000],['requiredLineMbps','Required downlink goodput','Mbit/s',.01,200000,1,100],['targetSOC','Minimum design SOC','fraction',.02,.8,.01,.2]]),
 ...numeric('Orbit & attitude',[
 ['altitudeKm','Semi-major altitude (a − R⊕)','km',180,3500,1,550],['ecc','Eccentricity','',0,.25,.0001,0],['inclinationDeg','Inclination','°',0,180,.1,53],['raanDeg','Ascending node (RAAN)','°',0,360,.1,30],['argPeriDeg','Argument of periapsis','°',0,360,.1,0],['meanAnomalyDeg','Mean anomaly at epoch','°',0,360,.1,10],['rollDeg','Body roll','°',-180,180,1,0],['pitchDeg','Body pitch','°',-90,90,1,0],['yawDeg','Body yaw','°',-180,180,1,0],['solarTiltDeg','Wing tracking offset','°',-90,90,1,0],['cd','Drag coefficient','',1,4,.05,2.2],['cpOffsetM','Pressure center offset','m',0,1,.005,.045],['cmgMomentumNms','Cluster usable momentum','N·m·s',2,20000,1,150],['cmgTorqueNm','Cluster rated torque','N·m',.1,500,.1,16],['dipoleAm2','Magnetic dipole','A·m²',10,1e6,100,12000],['solarCyclePhase','11-year solar-cycle phase','cycles',0,1,.01,.2],['ap','Geomagnetic activity Ap','',0,200,1,9],['f107Floor','Nominal F10.7 minimum','sfu',65,250,1,70],['f107Ceiling','Nominal F10.7 maximum','sfu',65,250,1,180]]),
 select('solarDriver','Solar flux history','Orbit & attitude',{nominal:'Parameterized 11-year cycle',observed:'NOAA monthly replay · 2009–2019'},'nominal'),
 select('attitude','Attitude law','Orbit & attitude',{tracking:'Sun and radiator tracking',nadir:'Nadir pointing',inertial:'Inertial hold',lowdrag:'Minimum drag',manual:'Manual body angles'},'tracking'),
 ...numeric('Compute & storage',[
 ['paramsB','Model parameters','billion',.1,1000,.1,8.03],['bits','Weight precision','bit',2,32,1,4],['context','Context per stream','tok',128,131072,128,4096],['batch','Streams per accelerator','streams',1,128,1,8],['promptTokens','Prompt length','tok',16,65536,16,512],['outputTokens','Response length','tok',1,32768,1,256],['latencyTargetS','Maximum time to first token','s',.01,60,.01,2],['computeEfficiency','Compute utilization','fraction',.01,1,.01,.42],['bwEfficiency','Memory bandwidth utilization','fraction',.01,1,.01,.54],['duty','Compute duty cycle','fraction',0,1,.01,.78],['bytesPerToken','Serialized output size','B/tok',1,64,1,4],['bulkMbps','Bulk data arrivals','Mbit/s',0,3000,.1,1.2],['initialQueueGB','Initial downlink queue','GB',0,100000,1,50],['diskReserve','SSD spare fraction','fraction',0,.5,.01,.12],['retainedGB','Retained files','GB',0,100000,1,100],['trayKw','Active tray draw','kW',.01,80,.01,2],['trayIdleKw','Idle tray draw','kW',.005,35,.005,.32],['chipsPerTray','Accelerators per tray','chips',1,32,1,2],['chipTF','Peak BF16 per accelerator','TFLOP/s',10,10000,1,312],['chipGB','Accelerator memory','GB',1,768,1,80],['chipBW','Accelerator memory bandwidth','GB/s',20,32000,10,2039],['diskWatts','Storage module draw','W',1,150,1,22],['dwpd','Rated writes per day','DWPD',.05,20,.05,1],['trayKg','Tray hardware mass','kg',1,300,.1,23],['diskModuleTB','Raw module capacity','TB',.1,100,.1,4],['diskWrite','Module write bandwidth','GB/s',.01,32,.01,3.7],['diskRead','Module read bandwidth','GB/s',.01,32,.01,6.8]]),
 select('link','Payload terminal','Communications',{auto:'Automatic traffic policy',ka:'Ka-band reflector',optical:'Optical telescope',s:'S-band patches'},'ka'),
 ...numeric('Communications',[
 ['kaDishM','Ka reflector diameter','m',.2,4,.01,1.2],['opticalApertureM','Optical aperture','m',.025,.5,.005,.12],['opticalJitterUrad','Fine-pointing residual','µrad',.1,80,.1,1.5],['opticalTxW','Optical transmit power','W',.05,10,.05,1],['linkCapMbps','Application rate cap','Mbit/s',.001,200000,1,200000],['elevationDeg','Ground elevation mask','°',0,60,1,10],['contactFraction','Sizing access duty assumption','fraction',.0001,1,.001,.035],['codingEff','Application efficiency','fraction',.01,1,.01,.78]]),
 ...numeric('Power & aging',[
 ['pvEfficiency','PV cell conversion','fraction',.05,.45,.005,.3],['solarDelivery','Packing and bus delivery','fraction',.01,1,.005,.86],['pvRetention','Annual PV retention','fraction/yr',.85,1,.001,.98],['batteryRetention','Annual battery retention','fraction/yr',.85,1,.001,.975],['packWhKg','Pack-level specific energy','Wh/kg',30,400,1,160],['socMin','Operational SOC floor','fraction',0,.7,.01,.15],['socMax','Operational SOC ceiling','fraction',.25,1,.01,.95],['socInitial','Launch SOC','fraction',0,1,.01,.9],['chargeEff','Charge efficiency','fraction',.5,1,.01,.95],['dischargeEff','Discharge efficiency','fraction',.5,1,.01,.94],['packWhL','Pack-level energy density','Wh/L',40,550,1,290],['pvKgM2','PV areal mass','kg/m²',.2,25,.1,2.6],['chargeC','Pack charge C-rate','1/h',.05,5,.05,1],['dischargeC','Pack discharge C-rate','1/h',.05,8,.05,2]]),
 select('thermalMode','Experiment','Thermal',{linked:'Linked electrical heat',applied:'Independent applied heat'},'linked'),
 ...numeric('Thermal',[
 ['appliedHeatKw','Applied heat input','kW',0,20000,.5,24],['emissivity','BOL IR emissivity','fraction',.1,1,.01,.85],['absorptivity','BOL solar absorptivity','fraction',0,1,.01,.09],['emissivityRetention','Annual emissivity retention','fraction/yr',.9,1,.001,.997],['alphaGrowth','Annual absorptivity growth','fraction/yr',0,.05,.001,.004],['thermalResistanceKPerKw','Tray junction-to-radiator resistance','K/kW',.05,20,.05,4],['radiatorDesignK','Sizing radiator temperature','K',230,390,1,305],['radKgM2','Radiator construction','kg/m²',.5,20,.1,3.6]]),
 ...thermalControls,
 select('idleComputePolicy','Compute between bursts','Thermal experiment',{powered:'Powered idle',off:'Power down accelerators'},'powered'),
 select('pumpStandbyPolicy','Coolant circulation','Thermal experiment',{continuous:'Circulate whenever commissioned',follow:'Follow powered compute or applied heater'},'continuous'),
 ...numeric('Thermal experiment',[
 ['initialCoreK','Initial internal thermal node','K',100,700,.1,294],['initialBatteryK','Initial pack temperature','K',100,700,.1,294],['launchBoundaryK','Pre-separation blanket boundary','K',100,700,.1,293],['packHeatKJkgK','Pack specific heat','kJ/(kg·K)',.1,3,.01,.9],['packCouplingWKkg','Pack to loop conductance per kg','W/(K·kg)',.01,20,.01,.6]]),
 ...numeric('Enclosure & fairing',[
 ['skinKgM2','Sandwich wall structural mass','kg/m²',1,45,.1,8],['blanketKgM2','MLI blanket mass','kg/m²',.05,4,.01,.4],['blanketEffectiveEpsilon','Installed blanket effective emittance','fraction',.002,.25,.001,.025],['blanketOuterEpsilon','Outer blanket IR emittance','fraction',.1,.98,.01,.8],['blanketOuterAlpha','Outer blanket solar absorptance','fraction',.03,.95,.01,.22],['penetrationWK','Total feedthrough thermal conductance','W/K',0,40,.02,.18],
 ['fairingM','Mission profile maximum diameter','m',1,12,.01,4.8],['fairingLengthM','Mission profile height','m',1,40,.01,12.5],['radialPaddingM','Payload lateral motion allowance','m',0,.5,.01,.05],['axialPaddingM','Payload axial motion allowance','m',0,.5,.01,.1]
 ]),
 select('disposalMethod','End-of-life route','Disposal architecture',{reentry:'Targeted atmospheric reentry',graveyard:'Raise to a disposal orbit'},'reentry'),
 ...numeric('Disposal architecture',[
 ['graveyardAltitudeKm','Target raised circular altitude','km',200,40000,1,900],['targetLatDeg','Target latitude','°',-90,90,.1,-48.9],['targetLonDeg','Target longitude','°',-180,180,.1,-123.4],['targetToleranceKm','Target acceptance radius','km',1,3000,1,200],['targetSearchHours','Search before end of mission','h',1,72,1,36],['entryBallisticKgM2','Surviving body ballistic coefficient','kg/m²',10,1500,1,150],['entryDensitySigmaPct','Atmosphere density uncertainty · 1σ','%',0,50,.5,15],['entryBallisticSigmaPct','Ballistic coefficient uncertainty · 1σ','%',0,50,.5,15],['entryVelocitySigmaMs','Entry speed uncertainty · 1σ','m/s',0,100,.1,2],['entryAzimuthSigmaDeg','Entry heading uncertainty · 1σ','°',0,3,.01,.08]]),
 ...numeric('Propulsion & structure',[
 ['isp','Delivered specific impulse','s',130,380,1,305],['thrustN','Paired engine thrust','N',10,20000,10,880],['fuelDensity','Liquid fuel density','kg/L',.3,2,.001,.88],['oxidizerDensity','Liquid oxidizer density','kg/L',.5,3,.001,1.44],['mixtureRatio','Oxidizer/fuel mass ratio','',.8,3,.01,1.65],['reserveFraction','Operational reserve','fraction',0,.4,.01,.1],['residualFraction','Trapped residual','fraction',0,.1,.005,.025],['trimDv','Post-separation trim','m/s',0,200,.5,2],['maneuverDv','Maneuver allocation','m/s',0,200,.5,2],['disposalTargetPerigeeKm','Disposal target perigee altitude','km',30,100,1,80],['disposalDv','Minimum disposal reserve','m/s',0,250,1,15],['tankFill','Maximum liquid fill','fraction',.5,.98,.01,.86],['structureMargin','Dry engineering margin','fraction',0,.5,.01,.15],['shieldKgM2','Shielding areal mass','kg/m²',0,30,.1,2.1],['adapterKg','Payload adapter','kg',0,5000,10,180]])];
export const defaults=Object.fromEntries(controls.map(c=>[c.key,c.value]));
for(const [key,entries] of Object.entries(presets)){const {label,...values}=entries[defaults[key]];Object.assign(defaults,values)}
Object.assign(defaults,{epoch:'2026-11-04T00:00:00Z'});
export function applyPreset(input,key,id){const preset=presets[key]?.[id];if(!preset)throw Error('Unknown '+key+' preset');const {label,...data}=preset;return {...input,...data,[key]:id}}
// A starter specifies the whole spacecraft and service. Only the orbit, its
// environment, the requested duration and the disposal mission carry forward.
export const missionStarterContextKeys=Object.freeze([
 'epoch','altitudeKm','ecc','inclinationDeg','raanDeg','argPeriDeg','meanAnomalyDeg',
 'solarDriver','solarCyclePhase','f107Floor','f107Ceiling','ap','missionYears','yearsSupply',
 'disposalMethod','graveyardAltitudeKm','disposalTargetPerigeeKm','targetLatDeg','targetLonDeg',
 'targetToleranceKm','targetSearchHours','entryBallisticKgM2','entryDensitySigmaPct',
 'entryBallisticSigmaPct','entryVelocitySigmaMs','entryAzimuthSigmaDeg'
]);
// Expand the sparse recipe directly. Passing a previous full design here
// would overwrite the selected technology's density, power or fairing data.
const starterDesigns=Object.freeze(Object.fromEntries(Object.entries(aiPurposes).map(([id,p])=>
 [id,Object.freeze(normalizeDesign({...p.suggestedBuild,aiPurpose:id}))]
)));
export function missionStarter(id,mission={}){
 if(!Object.hasOwn(starterDesigns,id))throw Error('Unknown AI purpose');
 const design={...starterDesigns[id]};
 for(const key of missionStarterContextKeys)if(Object.hasOwn(mission,key))design[key]=mission[key];
 return design;
}
export function applyAIPurpose(input,id,withBuild=false){
 if(withBuild)return missionStarter(id,input);
 if(!Object.hasOwn(aiPurposes,id))throw Error('Unknown AI purpose');
 return {...input,aiPurpose:id};
}
export function normalizeDesign(input={}){let out={...defaults};for(const key of Object.keys(presets)){if(input[key]&&presets[key][input[key]])out=applyPreset(out,key,input[key])}for(const [key,value] of Object.entries(input)){if(key in defaults && (typeof defaults[key]==='number'?Number.isFinite(value):typeof value==='string'))out[key]=value}if(launchFleet[out.launcher]){out.referenceKg=launchFleet[out.launcher].referenceKg;out.launchSite=launchSiteFor(out.launcher,out.launchSite).id;}return out}
export function validateDesign(d){const errors=validateThermalLimits(d);for(const c of controls){if(c.options){if(!(d[c.key] in c.options))errors.push(c.label+' is unknown')}else if(!Number.isFinite(d[c.key])||d[c.key]<c.min||d[c.key]>c.max)errors.push(`${c.label} requires ${c.min}–${c.max} ${c.unit}`)}if((6378.137+d.altitudeKm)*(1-d.ecc)<=6378.137)errors.push('Perigee intersects Earth');if(d.socMax<=d.socMin)errors.push('SOC ceiling must exceed the floor');if(d.socInitial<d.socMin||d.socInitial>d.socMax)errors.push('Launch SOC must be between the operating limits');if(d.f107Floor>d.f107Ceiling)errors.push('Minimum solar flux must be at or below the maximum');if(d.trayIdleKw>d.trayKw)errors.push('Idle tray draw exceeds active draw');if(d.promptTokens>d.context)errors.push('Prompt exceeds configured context');if(!Number.isFinite(Date.parse(d.epoch)))errors.push('Epoch must be a valid UTC date');return errors}
export const ageProperties=(d,y)=>({pv:d.pvEfficiency*d.pvRetention**y,battery:d.batteryKWh*d.batteryRetention**y,emissivity:d.emissivity*d.emissivityRetention**y,absorptivity:Math.min(1,d.absorptivity+d.alphaGrowth*y)});
export const physics={solarPower:(area,eff,angle,visible=1,delivery=1)=>SOLAR*area*eff*Math.max(0,Math.cos(rad(angle)))*visible*delivery, emission:(area,t,em,faces=1)=>area*faces*em*SIGMA*t**4,battery:(initial,charge,discharge,ec,ed)=>initial+ec*charge-discharge/ed,deliverGB:(queueGB,goodputMbps,seconds)=>Math.min(queueGB,goodputMbps*seconds/8000),drag:(rho,v,cd,area)=>.5*rho*v*v*cd*area,rocket:(kg,isp,dv)=>kg*(-Math.expm1(-dv/(G0*isp))),chipCount:(required,peak,eff)=>Math.ceil(required/(peak*eff))};
export function sizeDesign(input={}){
 const d=normalizeDesign(input),trays=Math.ceil(d.trayCount),chips=trays*d.chipsPerTray,acceleratorKw=trays*d.trayKw,idleKw=trays*d.trayIdleKw,modules=Math.ceil(d.storageTB/d.diskModuleTB),storageTB=modules*d.diskModuleTB,usableTB=storageTB*(1-d.diskReserve),storageKw=modules*d.diskWatts/1000;
 const modelGB=d.paramsB*d.bits/8*1.07,kvGB=d.kvKB*1e-6*d.context*d.batch,memoryGB=d.chipGB*chips,replicasPerModel=Math.max(1,Math.ceil((modelGB+kvGB+2)/d.chipGB)),replicas=Math.floor(chips/replicasPerModel),sessions=replicas*d.batch;
 const tflops=chips*d.chipTF*d.computeEfficiency,flopsPerToken=2*d.paramsB*d.activeParamFraction*1e9,peakPrefill=tflops*1e12/flopsPerToken;
 const bandwidthDecode=replicas*d.batch*d.chipBW*d.bwEfficiency*replicasPerModel/(modelGB+kvGB), decodeBound=Math.min(replicas?peakPrefill:0,bandwidthDecode);
 // A stream alternates prefill and decode on the same accelerator pool.
 const prefillFraction=(d.promptTokens/Math.max(peakPrefill,1))/(d.promptTokens/Math.max(peakPrefill,1)+d.outputTokens/Math.max(decodeBound,1));
 const inferenceTps=decodeBound*(1-prefillFraction),prefillPerSec=replicas?peakPrefill*prefillFraction:0,ttfSeconds=sessions*d.promptTokens/Math.max(peakPrefill,.001)+1/Math.max(decodeBound/Math.max(sessions,1),.001);
 const ai=purposeSizing(d,{trays,chips,modelGB,kvGB,memoryGB,sessions,tflops,tokensPerSec:inferenceTps,usableTB,readGBs:modules*d.diskRead,writeGBs:modules*d.diskWrite});
 const tokensPerSec=ai.training?0:ai.activeUnitsPerSec*ai.tokensPerUnit,itKw=acceleratorKw+ai.hostKw+ai.fabricKw;
 const cmg=sizeGyros(d);
 const propulsion=sizePropulsion(d),{fuelKg,oxidizerKg,tankVolumeL,pressurantKg}=propulsion;
 const batteryVolumeL=d.batteryKWh*1000/d.packWhL,diam=2*propulsion.maxRadiusM;
 const serviceM3=batteryVolumeL/1000+modules*.004+1.4;
 // Dimension the primary box around both an internal rack lattice and the
 // actual axial extent of the exterior launch packages. Its cross-section
 // belongs to the spacecraft and is independent of the selected fairing.
 const cross=Math.cbrt(serviceM3/1.6);
 const bodyWidthM=Math.max(1.60,2*(cmg.mechanismDimsM[0]+.06)/.952,cross,2*(propulsion.packHalfWidth+.14)/.952,Math.sqrt(d.radiatorM2/(4*2.55))+.12);
 const bodyHeightM=Math.max(spacecraftInterface.outerM+.02,2*(cmg.mechanismDimsM[1]+.06)/.952,cross*.80,2*(propulsion.packHalfHeight+.13)/.952,.64*bodyWidthM);
 const wingWidthM=Math.sqrt(d.solarM2/4/3.4),wingLengthM=d.solarM2/(4*wingWidthM);
 const radiatorWidthM=Math.min(bodyWidthM-.12,Math.sqrt(d.radiatorM2/2/2.6)),radiatorLengthM=d.radiatorM2/(2*radiatorWidthM);
 const rollRadius=Math.sqrt(.125**2+.002*wingLengthM/Math.PI),cassetteSpanM=2*wingWidthM+.90+1.1*rollRadius;
 const heads=terminalStations(bodyWidthM,0,d);
 const terminalStripM=Math.max(heads.ka[1]+.61*d.kaDishM+.065,heads.optical[1]+1.05*d.opticalApertureM+.065)+radiatorWidthM/2+.48;
 const radiatorSpanM=radiatorLengthM/2+.14+.16+terminalStripM+.20;
 const section=rackSection(d.compute,bodyWidthM,bodyHeightM),wall=.024*Math.min(bodyWidthM,bodyHeightM);
 const baysNeeded=Math.ceil(trays/(section.columns*section.rows));
 const exclusiveEndsM=2*wall+.18+diam+cmg.mechanismDimsM[2];
 const equipmentRunM=Math.max(baysNeeded*section.pitchM[2]/.60,
  batteryVolumeL/1000/(.64*bodyWidthM*.66*bodyHeightM*.13*.80),modules*.004/(.55*bodyWidthM*.66*bodyHeightM*.137*.80));
 const bodyLengthM=Math.max(cassetteSpanM,radiatorSpanM,exclusiveEndsM+equipmentRunM+.004);
 const aftEquipmentZ=-bodyLengthM/2+wall+diam+.12,forwardEquipmentZ=bodyLengthM/2-wall-cmg.mechanismDimsM[2]-.06;
 const mid=(aftEquipmentZ+forwardEquipmentZ)/2,halfRun=.30*(forwardEquipmentZ-aftEquipmentZ);
 const rack=rackLayout(section,trays,mid-halfRun,mid+halfRun),skinArea=2*(bodyWidthM*bodyHeightM+bodyLengthM*(bodyWidthM+bodyHeightM));
 const installedElectronicsKw=acceleratorKw+Math.max(0,d.hostCores-8*trays)*.012+trays*Math.max(0,d.fabricGbps-25)*.00025;
 const pumpKw=.026*installedElectronicsKw+.08, switchKw=.015*installedElectronicsKw+.09,hotelKw=.42+switchKw+storageKw+pumpKw;
 const installGeometry={bodyWidthM,bodyHeightM,bodyLengthM,wingWidthM,wingLengthM,radiatorWidthM,radiatorLengthM};
 const enclosure=sizeEnclosure(d,bodyWidthM,bodyHeightM,bodyLengthM,trays,deploymentLayout(installGeometry).mounts,rack);
 const ledger=[];function add(id,label,kg,group='Hardware'){ledger.push({id,label,kg,group})}
 add('compute','Accelerators and cold plates',trays*d.trayKg*.65);add('host','Hosts and compute trays',trays*d.trayKg*.35);add('storage','Solid-state storage',modules*d.diskModuleKg);add('switch','Switches and avionics',20+trays*.9+Math.max(0,d.fabricGbps-25)*.003*trays+Math.max(0,d.hostCores-8*trays)*.035);add('battery','Battery packs',d.batteryKWh*1000/d.packWhKg);add('array','Solar cells and wing substrate',d.solarM2*d.pvKgM2);add('hinges','Drive joints and hinges',12+.15*(d.solarM2+d.radiatorM2));add('radiator','Radiator banks',d.radiatorM2*d.radKgM2);add('coolant','Coolant, pumps and lines',10+installedElectronicsKw*1.25);add('cmg','CMGs, sensors and torquers',cmg.totalKg+6+.0015*d.dipoleAm2);add('terminals','RF and optical terminals',19+10*d.kaDishM**2+250*d.opticalApertureM**2);add('engine','Engine heads, valves, filters and lines',propulsion.massKg.engineHeads+propulsion.massKg.feedAssembly);add('tanks','Two liquid vessels and helium bottle',propulsion.tanks.reduce((kg,t)=>kg+t.shellKg,0));add('shield','Radiation shielding',enclosure.shieldKg);add('cables','Harness and cable jacketing',14+.12*skinArea+.22*installedElectronicsKw);add('skin','Six structural sandwich walls',enclosure.skinKg);add('blanket','Exterior multilayer insulation',enclosure.blanketKg);add('structure','Primary frame and tray mounts',enclosure.frameKg);add('margin','Dry engineering margin',ledger.reduce((a,b)=>a+b.kg,0)*d.structureMargin,'Margin');const dryKg=ledger.reduce((a,b)=>a+b.kg,0);add('pressurant','Helium pressurant',pressurantKg,'Consumables');add('fuel','Fuel',fuelKg,'Consumables');add('oxidizer','Oxidizer',oxidizerKg,'Consumables');add('adapter','Launch adapter',d.adapterKg,'Launch only');const wetKg=dryKg+pressurantKg+d.propellantKg,launchKg=wetKg+d.adapterKg;
 installPropulsion(propulsion,d,{cmg,enclosure,rackLayout:rack,terminalStripM,bodyWidthM,bodyHeightM,bodyLengthM,wingWidthM,wingLengthM,radiatorWidthM,radiatorLengthM,trays},ledger);
 const stack=packedSections({propulsion,terminalStripM,bodyWidthM,bodyHeightM,bodyLengthM,wingWidthM,wingLengthM,radiatorWidthM,radiatorLengthM,tankVolumeL,kaDishM:d.kaDishM,opticalApertureM:d.opticalApertureM,launcher:d.launcher});
 const stowedDiameterM=2*Math.max(...stack.map(s=>s.radiusM)),stowedLengthM=Math.max(...stack.map(s=>s.z1M)),fairing=fairingFit(d,stack);
 const payloadInterface=checkPayloadInterface({propulsion,bodyWidthM,bodyHeightM,bodyLengthM},stack);
 const launchReferenceMarginKg=d.referenceKg-launchKg,launchScreenMarginKg=Math.min(d.launchAllowanceKg,d.referenceKg)-launchKg;
 return {input:d,ai,cmg,rackLayout:rack,terminalStripM,cdh:avionics,propulsion,payloadInterface,acceleratorKw,installedElectronicsKw,launchReferenceMarginKg,launchScreenMarginKg,launchScreenFeasible:fairing.fit&&payloadInterface.passes&&launchScreenMarginKg>=0,trays,chips,itKw,idleKw,solarM2:d.solarM2,radiatorM2:d.radiatorM2,batteryKWh:d.batteryKWh,storageTB,usableTB,weightsTB:Math.min(usableTB,ai.residentWeights/1000),initialQueueGB:Math.min(d.initialQueueGB,Math.max(0,usableTB*1000-ai.residentWeights-ai.reservedStorageGB-d.retainedGB)),tokensPerSec,prefillPerSec:ai.training||!ai.fit?0:prefillPerSec*ai.fabricEfficiency,sustainedTps:tokensPerSec*d.duty,sustainedPrefillPerSec:ai.training||!ai.fit?0:prefillPerSec*ai.fabricEfficiency*d.duty,sustainedTflops:tflops*d.duty,tokensPerJouleActive:tokensPerSec/(itKw*1000),perUserTps:tokensPerSec/Math.max(1,sessions),sessions:ai.training?0:sessions,memoryGB,modelGB:ai.residentWeights,kvGB:ai.training?0:kvGB,replicas:ai.training?Number(ai.fit):replicas,replicasPerModel:ai.training?ai.minimumTrays*d.chipsPerTray:replicasPerModel,ttfSeconds:ai.training?0:ttfSeconds,tflops,peakTflops:chips*d.chipTF,requestsPerSec:ai.training?0:ai.activeUnitsPerSec,diskReadGBs:modules*d.diskRead,diskWriteGBs:modules*d.diskWrite,storageKw,pumpKw,switchKw,hotelKw,propellantKg:d.propellantKg,dryKg,wetKg,launchKg,massMarginKg:d.launchAllowanceKg-launchKg,massLedger:ledger,bodyLengthM,bodyWidthM,bodyHeightM,wingLengthM,wingWidthM,radiatorLengthM,radiatorWidthM,tankVolumeL,fuelKg,oxidizerKg,pressurantKg,batteryVolumeL,stowedDiameterM,stowedLengthM,enclosure,fairing,radialClearanceM:fairing.radialClearanceM,axialClearanceM:fairing.axialClearanceM,fit:fairing.fit,launcherLabel:presets.launcher[d.launcher]?.label||d.launcher,errors:validateDesign(d)};
}

// Design bounds use the longest cylindrical shadow in the specified orbit, at β=0.
// Network access is an explicit sizing assumption. The timeline calculates real passes independently.
function moderateDensity(altitudeKm){
 const coordinate=(altitudeKm-100)/20,index=clamp(Math.floor(coordinate),0,densities.length-2);
 const low=densities[index][1],high=densities[index+1][1];
 return low*(high/low)**(coordinate-index);
}
const designIllumination=new WeakMap();
function deployedIncidence(h,period){
 if(designIllumination.has(h))return designIllumination.get(h);
 let count=0,pv=0,radHot=0;
 for(let i=0;i<24;i++){
  const g=geometry(h.input,540+period*(i+.5)/24);
  if(g.eclipse)continue;
  const f=surfaces(h,g,1,true);count++;pv+=f.solarIncidenceCos;radHot=Math.max(radHot,f.radiatorSunCos);
 }
 const summary={pv:count?pv/count:0,radHot};designIllumination.set(h,summary);return summary;
}
const sizingLabels={
 solar:'Solar generation',battery:'Eclipse energy',thermal:'Heat rejection',storage:'Recorder capacity',downlink:'Earth return-link capacity',
 decodeThroughput:'Active onboard decode throughput',onboardLatency:'Onboard time to first token',compute:'Workload processing rate',
 residentMemory:'Accelerator memory',serviceStorage:'Workload storage',inputLink:'Earth input uplink',artifact:'Earth artifact compatibility',
 chemicalBurnClearance:'Engine clearance and thrust alignment',propellant:'Station-keeping supply',diskLife:'Recorder endurance',
 mass:'Mission launch allowance',launcherReference:'Launch vehicle mass capacity',fairing:'Stowed fairing envelope',launchInterface:'Payload adapter interface'
};
export const sizingLabel=key=>sizingLabels[key]??key;
export const meetsSizingRequirement=ratio=>ratio>=1-1e-9;
export function sizingMargin(key,ratio){
 if(ratio==null)return '—';
 if(key==='chemicalBurnClearance'||key==='artifact')return meetsSizingRequirement(ratio)?'Pass':'Fails check';
 if(ratio===Infinity)return 'No limiting demand';
 return Number.isFinite(ratio)?(100*(ratio-1)).toLocaleString('en-US',{maximumFractionDigits:2})+'%':'—';
}
export function sizingEnvelope(h,years=h.input.missionYears){
 const d=h.input,R=6378.137,a=R+d.altitudeKm,period=2*Math.PI*Math.sqrt(a**3/398600.4418),sunFraction=1-Math.asin(R/a)/Math.PI,shadowHours=(1-sunFraction)*period/3600;
 const aging=ageProperties(d,years),angles=deployedIncidence(h,period),incidence=angles.pv,actuatorKw=h.cmg.maneuverW/1000+.12+.012,terminalKw=.24,peakBus=h.itKw+h.hotelKw+actuatorKw+terminalKw;
 const idleIt=d.idleComputePolicy==='off'?0:h.idleKw,meanHotel=h.hotelKw-(d.pumpStandbyPolicy==='follow'&&idleIt===0&&d.thermalMode!=='applied'?h.pumpKw*(1-d.duty):0);
 const meanBus=(h.itKw*d.duty+idleIt*(1-d.duty))+meanHotel+(h.cmg.idleW+(h.cmg.maneuverW-h.cmg.idleW)*d.contactFraction)/1000+.012+.12*.25+terminalKw*d.contactFraction,solarPerM=SOLAR*aging.pv*d.solarDelivery*incidence/1000;
 const solarNeeded=meanBus*(1+(1-sunFraction)*(1/(d.chargeEff*d.dischargeEff)-1))/(sunFraction*Math.max(1e-9,solarPerM));
 const batteryNeeded=Math.max(peakBus*shadowHours/(Math.max(.001,d.socMax-Math.max(d.targetSOC,d.socMin))*d.dischargeEff),peakBus/d.dischargeC,meanBus*(1-sunFraction)/(sunFraction*d.chargeC*d.chargeEff*d.dischargeEff))/d.batteryRetention**years;
 // Sizing uses a uniform 200 W/m² shortwave and 100 W/m² IR exterior on the insulated box.
 const rejectedKw=d.thermalMode==='applied'?d.appliedHeatKw:peakBus,transportRiseK=d.thermalResistanceKPerKw*(d.thermalMode==='applied'?d.appliedHeatKw:h.itKw)/h.trays;
 const radiatorK=clamp(Math.min(d.radiatorDesignK,d.junctionLimitK-transportRiseK),3,1000);
 const radAbsorbedWm2=aging.emissivity*237*.5+aging.absorptivity*1361*(angles.radHot+.3*.5);
 const netWm2=2*aging.emissivity*SIGMA*radiatorK**4-radAbsorbedWm2;
 const enclosureDesignLeakKw=solveOuter(h.enclosure,radiatorK,200,100).outwardKW;
 const radiatorNeeded=1000*Math.max(.001,rejectedKw-enclosureDesignLeakKw)/Math.max(.001,netWm2);
 const ai=h.ai,relayDuty=clamp(d.relayAvailability-d.relayHandoverS/d.relayCycleS,0,1),directDuty=d.serviceRoute==='direct'?d.contactFraction:d.serviceRoute==='hybrid'?(1-relayDuty)*d.contactFraction:0;
 const relayAccess=d.serviceRoute==='direct'?0:relayDuty,access=Math.max(.000001,relayAccess+directDuty);
 const productMbps=ai.training?ai.artifactGB*8000/(d.artifactReturnHours*3600):d.duty*ai.activeUnitsPerSec*ai.outputBytesPerUnit*8/1e6;
 const traffic=d.bulkMbps+(Number.isFinite(productMbps)?productMbps:0),goodputNeeded=traffic/access,longestAssumedGapS=d.serviceRoute==='relay'?d.relayCycleS*(1-access):86400*(1-access);
 const queuePeakGB=d.initialQueueGB+(ai.training?d.bulkMbps:traffic)*longestAssumedGapS/8000,storageNeeded=(queuePeakGB+ai.requiredStorageGB)/(1000*(1-d.diskReserve));
 const ram=h.bodyHeightM*h.bodyWidthM+.36*h.solarM2+.40*h.radiatorM2,rho=moderateDensity(d.altitudeKm),v=Math.sqrt(398600.4418/a)*1000,yearlyImpulse=physics.drag(rho,v,d.cd,ram)*YEAR;
 const trimKg=physics.rocket(h.wetKg,d.isp,d.trimDv),postTrim=h.wetKg-trimKg,disposalBudgetDv=Math.max(d.disposalDv,disposalRequirement(d)),otherKg=physics.rocket(postTrim,d.isp,disposalBudgetDv+d.maneuverDv),propAnnual=yearlyImpulse/(G0*d.isp),unusableFrac=d.reserveFraction+d.residualFraction;
 const propForCoverage=(trimKg+otherKg+propAnnual*d.yearsSupply)/(1-unusableFrac),supplyYears=Math.max(0,(h.propellantKg*(1-unusableFrac)-trimKg-otherKg)/Math.max(1e-12,propAnnual));
 let equilibriumK=((rejectedKw*1000/h.radiatorM2+radAbsorbedWm2)/(2*aging.emissivity*SIGMA))**.25;
 for(let n=0;n<5;n++){
  const shell=solveOuter(h.enclosure,equilibriumK,200,100),radNetW=h.radiatorM2*(2*aging.emissivity*SIGMA*equilibriumK**4-radAbsorbedWm2);
  const derivative=8*h.radiatorM2*aging.emissivity*SIGMA*equilibriumK**3+4*h.enclosure.coveredAreaM2*h.enclosure.effectiveEmissivity*SIGMA*equilibriumK**3+h.enclosure.penetrationConductanceWK;
  equilibriumK=Math.max(3,equilibriumK-(radNetW+1000*(shell.outwardKW-rejectedKw))/derivative);
 }
 const thermalK=equilibriumK+transportRiseK;
 const diskTBday=traffic*.0108, endurYears=h.storageTB*d.dwpd*365*5/Math.max(.0000001,diskTBday*365.25);
 const term=d.link==='auto'?(d.initialQueueGB>1e4?'optical':d.initialQueueGB>1?'ka':'s'):d.link;
 const directGoodput=Math.min(d.linkCapMbps,(term==='optical'?2000:term==='s'?4:500)*d.codingEff);
 const linkGoodput=(directDuty*directGoodput+relayAccess*Math.min(d.linkCapMbps,d.relayDownMbps))/access;
 const meanInputMbps=ai.training?Math.max(0,ai.corpusGB-ai.preloadedGB)*8000/(d.trainingBudgetDays*86400):d.serviceOffersPerHour/3600*ai.inputBytesPerUnit*8/1e6;
 const meanUpMbps=directDuty*Math.min(d.customerUplinkMbps,Math.max(0,2*d.codingEff-.016))+relayAccess*d.relayUpMbps;
 const propulsionClear=propulsionReview(h).clear&&propulsionReview(h,h.propellantKg*d.residualFraction).clear;
 const rates={chemicalBurnClearance:propulsionClear?Infinity:0,solar:h.solarM2/solarNeeded,battery:h.batteryKWh/batteryNeeded,thermal:Math.min(h.radiatorM2/radiatorNeeded,d.junctionLimitK/thermalK),storage:h.storageTB/storageNeeded,downlink:linkGoodput/goodputNeeded,...(d.aiPurpose==='text'?{decodeThroughput:h.tokensPerSec/d.requiredTps,onboardLatency:h.replicas?d.latencyTargetS/h.ttfSeconds:0}:{compute:ai.activeUnitsPerSec*d.duty/Math.max(1e-12,ai.requiredRate)}),residentMemory:h.memoryGB/ai.modelMemoryGB,serviceStorage:h.usableTB*1000/Math.max(.001,ai.requiredStorageGB),inputLink:meanInputMbps>0?meanUpMbps/meanInputMbps:Infinity,artifact:ai.training&&!ai.deployableArtifact?0:Infinity,propellant:years>0?supplyYears/years:(h.propellantKg*(1-unusableFrac)>=trimKg+otherKg?Infinity:0),diskLife:years>0?endurYears/years:Infinity,mass:d.launchAllowanceKg/h.launchKg,launcherReference:d.referenceKg/h.launchKg,fairing:h.fairing.ratio,launchInterface:h.payloadInterface.ratio};
 const binding=Object.keys(rates).reduce((a,b)=>rates[a]<rates[b]?a:b), feasible=meetsSizingRequirement(rates[binding])&&!h.errors.length;
 return {meanInputMbps,meanUpMbps,period,sunFraction,shadowHours,solarNeeded,batteryNeeded,radiatorNeeded,thermalK,equilibriumK,transportRiseK,enclosureDesignLeakKw,storageNeeded,goodputNeeded,traffic,linkGoodput,meanBus,peakBus,propForCoverage,propAnnual,trimKg,otherKg,disposalBudgetDv,unusableFrac,supplyYears,yearlyImpulse,ram,rho,endurYears,rates,binding,feasible};
}
export function estimateLife(h,horizon=30,audit=null){
 if(audit?.thermal){
  const initial=h.errors.length?h.errors[0]:!h.fit?'Stowed fairing fit':h.launchKg>h.input.launchAllowanceKg?'Launch mass allowance':h.launchReferenceMarginKg<0?'Published launcher reference screen':h.ai.memoryMarginGB<0?'Required resident accelerator state':h.ai.storageMarginGB<0?'Required local model, corpus and checkpoint storage':!h.replicas?'Operating model fit':null;
  const start=sizingEnvelope(h,0);
  // Time-invariant payload and installation limits apply before chronological aging starts.
  const unmet=['launchInterface','artifact','decodeThroughput','onboardLatency','compute'].find(k=>Object.hasOwn(start.rates,k)&&!meetsSizingRequirement(start.rates[k]));
  if(initial||unmet)return {years:0,binding:initial||unmet,lowerBound:false,method:'Installed hardware at launch',ratios:start.rates};
  const yearLimit=horizon*YEAR,observed=Math.min(audit.physicalLifetimeSeconds,yearLimit),cross=audit.firstCrossing&&audit.firstCrossing.time<=yearLimit;
  return {years:observed/YEAR,binding:cross?audit.firstCrossing.limit:'Audited horizon',lowerBound:!cross,method:'Chronological mission integration',ratios:sizingEnvelope(h,observed/YEAR).rates};
 }
 const evalAt=y=>sizingEnvelope(h,y);let r=evalAt(0);if(!r.feasible)return {years:0,binding:r.binding,lowerBound:false,ratios:r.rates};r=evalAt(horizon);if(r.feasible)return {years:horizon,binding:'Search horizon',lowerBound:true,ratios:r.rates};let lo=0,hi=horizon;for(let i=0;i<32;i++){const mid=(lo+hi)/2;if(evalAt(mid).feasible)lo=mid;else hi=mid}r=evalAt(hi);return {years:lo,binding:r.binding,lowerBound:false,ratios:r.rates}}
export const solveModes={installed:'Installed hardware',workload:'Size hardware from a workload',launch:'Maximum throughput within a launch',lifetime:'Service life of installed hardware',solar:'Required solar array',radiator:'Required radiator area',battery:'Required battery capacity',propellant:'Propellant for allocated years',supply:'Years of station-keeping supply',storage:'Required storage capacity',link:'Required downlink goodput',throughput:'Decode throughput from hardware'};
export function enumeratePresets(input,key){return Object.entries(presets[key]??{}).map(([id,entry])=>{const h=sizeDesign(applyPreset(input,key,id)),e=sizingEnvelope(h);return {id,label:entry.label,feasible:e.feasible,binding:e.binding,marginKg:h.launchScreenMarginKg,allowanceMarginKg:h.massMarginKg,referenceMarginKg:h.launchReferenceMarginKg,marginPercent:100*(e.rates[e.binding]-1),lifeYears:estimateLife(h).years,referenceKg:entry.referenceKg}})}
// Round discrete modules upward, iterating because new storage, arrays and tankage add load and mass.
function closeSupport(input){
 let h=sizeDesign(input);
 for(let k=0;k<7;k++){
  const e=sizingEnvelope(h),d=h.input;
  const sized={solarM2:clamp(Math.ceil(e.solarNeeded),5,150000),radiatorM2:clamp(Math.ceil(e.radiatorNeeded),2,90000),batteryKWh:clamp(Math.ceil(e.batteryNeeded),1,25000),storageTB:clamp(Math.ceil(e.storageNeeded/d.diskModuleTB)*d.diskModuleTB,.1,10000),propellantKg:clamp(Math.ceil(e.propForCoverage),1,200000)};
  if(Object.entries(sized).every(([key,value])=>value===d[key]))break;
  h=sizeDesign({...d,...sized});
 }
 return h;
}
export function inverseSolve(input={},mode='installed'){
 let d=normalizeDesign(input),h=sizeDesign(d),e=sizingEnvelope(h), achieved=0,target=0,unit='',margin=0,binding='Installed quantities',feasible=!h.errors.length,lowerBound=false;
 const setHardware=(patch)=>{d={...d,...patch};h=sizeDesign(d);e=sizingEnvelope(h)};
 if(mode==='installed')return {mode,input:d,hardware:h,achieved:h.itKw,target:h.itKw,unit:'kW',margin:h.launchScreenMarginKg,binding:e.binding,feasible:e.feasible,envelope:e};
 if(mode==='workload'){
  const training=h.ai.training,needs=training?h.ai.requiredRate/Math.max(d.duty,1e-9):d.aiPurpose==='text'?d.requiredTps:d.serviceOffersPerHour/3600/Math.max(d.duty,1e-9);
  const rate=x=>training?x.ai.activeTrainingTps:d.aiPurpose==='text'?x.tokensPerSec:x.ai.activeUnitsPerSec;
  // First fit weights, optimizer and a local restart on recorder. Find the
  // least tray count that reaches the target, including collective overhead.
  if(h.ai.requiredStorageGB>h.usableTB*1000)setHardware({storageTB:clamp(Math.ceil(h.ai.requiredStorageGB/(1000*(1-d.diskReserve))/d.diskModuleTB)*d.diskModuleTB,.1,10000)});
  let lo=Math.min(2000,h.ai.minimumTrays),hi=2000;
  while(lo<hi){const mid=Math.floor((lo+hi)/2);if(rate(sizeDesign({...d,trayCount:mid}))>=needs)hi=mid;else lo=mid+1;}
  setHardware({trayCount:lo});setHardware(closeSupport(d).input);achieved=rate(h);target=needs;unit=training?'training tok/s':d.aiPurpose==='text'?'tok/s':h.ai.unit+'/s';margin=achieved-target;feasible=e.feasible&&margin>=0;binding=e.binding;
 }else if(mode==='launch'){
  const minimumTrays=h.ai.minimumTrays;
  let best=null,lo=minimumTrays,hi=2000,nextLimit='Tray-count bound';
  const outputGoal=d.aiPurpose==='text'?'decodeThroughput':'compute';
  while(lo<=hi){
   const mid=Math.floor((lo+hi)/2),candidate=closeSupport({...d,trayCount:mid}),env=sizingEnvelope(candidate);
   // The requested output is compared with the maximum after the physical launch envelope is closed.
   const limiting=Object.keys(env.rates).filter(k=>k!==outputGoal).reduce((a,b)=>env.rates[a]<env.rates[b]?a:b);
   if(!candidate.errors.length&&meetsSizingRequirement(env.rates[limiting])){best=candidate;lo=mid+1}else{nextLimit=limiting;hi=mid-1}
  }
  const fitted=best??closeSupport({...d,trayCount:minimumTrays});setHardware(fitted.input);
  achieved=best?(d.aiPurpose==='text'?h.sustainedTps:h.ai.activeUnitsPerSec*d.duty):0;
  target=d.aiPurpose==='text'?d.requiredTps*d.duty:h.ai.requiredRate;unit=d.aiPurpose==='text'?'tok/s duty-average':h.ai.unit+'/s duty-average';
  margin=h.launchScreenMarginKg;feasible=!!best&&e.feasible;binding=best&&!e.feasible?e.binding:nextLimit;
 }else if(mode==='lifetime'){const result=estimateLife(h);achieved=result.years;target=d.missionYears;unit='yr';binding=result.binding;lowerBound=result.lowerBound;margin=achieved-target;feasible=achieved>0;if(achieved>=.003)setHardware({missionYears:achieved});
 }else if(mode==='supply'){achieved=e.supplyYears;target=d.yearsSupply;unit='yr';binding='Available propellant after protected allocations';margin=achieved-target;setHardware({yearsSupply:Math.min(30,achieved)});
 }else if(mode==='link'){achieved=e.goodputNeeded;target=d.requiredLineMbps;unit='Mbit/s';margin=e.linkGoodput-achieved;binding='Mean traffic divided by assumed contact fraction';feasible=margin>=0;setHardware({requiredLineMbps:clamp(achieved,.01,200000)});
 }else if(mode==='throughput'){achieved=d.aiPurpose==='text'?h.tokensPerSec:h.ai.activeUnitsPerSec;target=d.aiPurpose==='text'?d.requiredTps:h.ai.requiredRate/Math.max(1e-9,d.duty);unit=d.aiPurpose==='text'?'tok/s':h.ai.unit+'/s';margin=achieved-target;binding=!e.feasible?e.binding:h.ai.training?'Resident state, collective fabric and dataset I/O':'Mixed prefill + bandwidth-limited decode';feasible=margin>=0&&e.feasible;
 }else{const row={solar:['solarM2','solarNeeded','m²'],radiator:['radiatorM2','radiatorNeeded','m²'],battery:['batteryKWh','batteryNeeded','kWh'],propellant:['propellantKg','propForCoverage','kg'],storage:['storageTB','storageNeeded','TB']}[mode];if(!row)throw Error('Unknown sizing target: '+mode);const [key,req,units]=row;unit=units;const bound=controls.find(c=>c.key===key);for(let i=0;i<(mode==='propellant'?6:1);i++){const val=e[req];setHardware({[key]:clamp(mode==='storage'?Math.ceil(val/d.diskModuleTB)*d.diskModuleTB:Math.ceil(val*100)/100,bound.min,bound.max)})}achieved=d[key];target=e[req];margin=achieved-target;binding=mode+' sizing envelope';feasible=margin>=-.01&&h.errors.length===0;}
 return {mode,input:d,hardware:h,achieved,target,unit,margin,binding,feasible,lowerBound,envelope:e};
}
export const assumptions=[
 {name:'Raised disposal orbit',equation:'Δv ≈ Δv₁ + Δv₂; each burn integrates a = −μr/r³ + (T/m) v̂',note:'Finite prograde thrust raises apogee at the initial perigee. A second burn around transfer apogee circularizes the orbit. Controlled terminal accuracy is ±5 km in achieved apsides. A raised LEO orbit is an engineering alternative, not a statement of regulatory compliance.'},
 {name:'Targeted reentry and impact spread',equation:'aD = −ρ |vrel| vrel /(2β), β = m/(CD A); CEN = J diag(σ²) Jᵀ',note:'The fixed target can be edited. Trial retrograde burn times span the final search hours, bounded by the final 18% of the mission. Guidance screens nominal trajectories using a flight mass including 65% of the initial propellant load. Actual propagation uses the carried inventory. The conditional 95% surface ellipse follows a zero-lift surviving reference body in a rotating USSA76 atmosphere, with independent uncertainties in density, ballistic coefficient, interface speed and heading. It does not represent breakup or casualty risk.'},
 {name:'Battery thermal balance',equation:'Cpack dTpack/dt = Ploss − Gpack (Tpack − Tloop)',note:'Pack mass sets heat capacity and conductance. Charge and discharge conversion losses enter the pack, and conductive exchange enters the loop with the opposite sign. The initial pack temperature and shroud boundary are independent inputs.'},
 {name:'Component thermal limits',equation:'Tmin(i, state) ≤ Ti(t) ≤ Tmax(i, state)',note:'Six component nodes have separate operating and survival bands. Actual powered service, current flow or exposure selects the applicable range. Counts and durations use linearly interpolated crossings over solver intervals up to 60 seconds. A derived minimum extends below the observed minimum by the chosen margin. A derived maximum extends above the observed maximum. Fixed neighboring bounds constrain each single-parameter solution.'},
 {name:'Payload keep-in geometry',equation:'cᵣ = min[r(z) − rstack(z) − lateral allowance], cₐ = H − Lstack − axial allowance',note:'From the adapter plane forward, the stack contains a separation adapter, launch-service stand-off, primary box with four restrained solar cassettes along ±X, two folded two-leaf radiator packs along ±Y, and the parked terminals. At each station compare the circumscribed radius to each linear keep-in segment, including payload axial motion. Overriding diameter or height scales the selected contour. Release-door sweep and vehicle-specific coupled loads need the provider interface drawing.'},
 {name:'Insulated equipment enclosure',equation:'Qout = εeff σ Acovered (Tin⁴ − Tout⁴) + Gfeed (Tin − Tout)',note:'Six sandwich walls support MLI and radiation shielding. Occupied sleeved penetrations subtract from wall, blanket and shield area. Fluid sleeves and cable glands conduct through the blanket. The outer-surface balance includes directional shortwave absorption, Earth IR, outward leakage and radiation to space. The pumped cold plates carry IT heat to separate radiator banks. Blanket properties, areal masses and 25% frame thermal participation are engineering assumptions.'},
 {name:'Reference architecture',equation:'4 PV wings · 2 radiator banks · 2 engines · 2 liquid tanks · 1 He bottle · 4 CMGs',note:'Four strain-energy roll-out blankets extend from fixed port and starboard roots. Two radiator banks extend together toward +Z on a two-branch yoke. Two parallel engines fire away from the −Z deck. A regulated internal helium vessel supplies the separate internal fuel and oxidizer tanks. A gimbaled Ka dish, optical telescope and two opposing S patches share the avionics end. Dimensional estimates maintain constant planform aspect ratios.'},
 {name:'Solar power',equation:'P = 1,361 A ηcell ηdelivery cos θ × illumination × rʸ',note:'BOL material retention uses elapsed Julian years. Packing and delivery are a single multiplicative coefficient.'},
 {name:'Radiation and heat flow',equation:'Q = A [2εσT⁴ − α(G☉ + Galbedo) − εGIR]',note:'Physical panel planform is counted once and both faces emit. The sizing envelope uses a half-Earth view, 0.3 albedo and edge-on direct solar incidence at the radiator. The insulated enclosure sees assumed area-averaged shortwave and IR fluxes of 200 and 100 W/m²; its outward leak reduces the pumped radiator duty. Flight uses the instantaneous orientation.'},
 {name:'Battery energy',equation:'ΔE = (ηc Pcharge − Pdischarge/ηd) Δt',note:'Charge and discharge powers are bus-side values. Pack mass and volume include packaging. Chemical retention here is an assumed annual calendar factor.'},
 {name:'Compute estimator',equation:'decode ≤ min(Fusable/(2N), Beff × batch/(weights + KV)); prefill and decode share time',note:'Replica groups shard across chips when model weights, KV and 2 GB runtime overhead exceed device capacity. Weights include 7% metadata. Rates are analytic, without measured flight latency, attention FLOPs, inter-chip contention or scheduler effects.'},
 {name:'Data handling',equation:'Rtext = tokens/s × serialized bytes/token × 8',note:'Decimal GB = 10⁹ bytes and TB = 10¹² bytes. Required goodput includes bulk arrivals. Worst-gap sizing assumes one contiguous daily access window. Flight visibility uses actual ground geometry.'},
 {name:'Rocket and mass flow',equation:'Δm = m₀(1 − exp[−Δv/(g₀ Isp)]); ṁ = T/(g₀ Isp)',note:'Two internal liquid vessels, a separate regulated helium bottle and two pressure-fed engines. kg/L densities. Protected maneuver/disposal allocations, reserve and residuals are separate from actual expenditure.'},
 {name:'Launch vehicle reference screen',equation:'mstack ≤ min(mission allowance, cited LEO reference), with independent radial and axial fit tests',note:'Provider capacities describe different conditions and dates. The mission-specific allowance is independently editable. Passing the nominal reference screen gives a planning comparison. Orbit-specific delivered performance requires provider analysis.'},
 {name:'Mass closure',equation:'mstack = (Σ mdry × (1 + margin)) + mpressurant + mfuel + moxidizer + madapter',note:'Mass margin is applied only to dry components. Shielding is body skin area × areal density. Launcher reference capacity and the editable mission-specific mass allowance are separate. The stowed array drums and folded radiator banks remain attached to their operating pivots. Six structural walls, an exterior blanket and the internal frame each appear once in the ledger.'},
 {name:'Inverse sizing and life',equation:'Find the first envelope margin ≤ 0 across 0…30 years',note:'Analytic planning envelope assumes worst circular shadow at β=0, mean ram projection, moderate ECSS/JB-2006 atmospheric density, entered access fraction and design-state heat balance. Life bounds cover generation, SOC, thermal transfer, initial queue, link, latency, propellant, SSD write budget (5-year DWPD rating), mass and fairing. Ground-contact dynamics, CMG singularity and cumulative thermal transients require independent review of dispatch traces. The resolved flight timeline is a separate fidelity level.'}
];
export function checks(){
 const records=[];function check(group,name,expected,actual,unit,tol=1e-6){records.push({group,name,expected,actual,unit,tolerance:tol,pass:Math.abs(actual-expected)<=tol})}
 const p=physics,h=sizeDesign(defaults),twice=sizeDesign({...defaults,solarM2:h.solarM2*2}),hi=1e6,area=hi/p.solarPower(1,.30,0),radArea=hi/p.emission(1,300,.9);
 check(1,'Normal-incidence PV for 1 MW',2449,area,'m²',1);check(1,'PV at 60°',.5,p.solarPower(1,.3,60)/p.solarPower(1,.3,0),'fraction');check(1,'PV in eclipse',0,p.solarPower(1,.3,0,0),'W');check(1,'Wing linear scale at double area',Math.SQRT2,twice.wingLengthM/h.wingLengthM,'ratio');
 check(2,'One-sided 300 K radiator for 1 MW',2419,radArea,'m²',1);check(2,'Two-sided physical area',radArea/2,hi/p.emission(1,300,.9,2),'m²');check(2,'Aged radiator emission ratio',.90,p.emission(1,300,.81)/p.emission(1,300,.9),'fraction');check(2,'Lumped node initial heating',.2,1000/(10*500),'K/s');
 check(3,'Bus-side battery discharge',10,p.battery(20,0,9,1,.9),'kWh');check(3,'Bus-side battery charge',19,p.battery(10,10,0,.9,1),'kWh');check(3,'100 kWh pack at 150 Wh/kg',667,sizeDesign({...defaults,batteryKWh:100,packWhKg:150}).massLedger.find(r=>r.id==='battery').kg,'kg',1);
 check(4,'Output text from 10,000 tok/s',.32,10000*defaults.bytesPerToken*8/1e6,'Mbit/s');check(4,'600 s contact at 1 Gbit/s',75,p.deliverGB(1000,1000,600),'GB');check(4,'Queue-limited downlink',20,p.deliverGB(20,1000,600),'GB');check(4,'9 Tbit recorder',1.125,9/8,'TB');
 const D=p.drag(1e-12,7500,2,1000);check(5,'1,000 m² projected drag',.05625,D,'N');check(5,'Drag torque with 2 m arm',.1125,D*2,'N·m');check(5,'Co-located pressure and mass centers',0,D*0,'N·m');
 const m=p.rocket(10000,300,10);check(6,'Rocket equation propellant',33.93,m,'kg',.01);check(6,'Oxidizer at 2:1',22.62,m*2/3,'kg',.01);check(6,'Fuel at 2:1',11.31,m/3,'kg',.01);check(6,'Launch ledger closure',h.launchKg,h.massLedger.reduce((s,v)=>s+v.kg,0),'kg');
 const chips=p.chipCount(510,100,.5);check(7,'Whole chips for active target',11,chips,'chips');check(7,'Sustained capacity at 50% duty',275,chips*100*.5*.5,'TFLOP/s');
 check(8,'PV retention after five years',defaults.pvRetention**5,ageProperties(defaults,5).pv/defaults.pvEfficiency,'fraction');check(8,'Duration-independent selected age',ageProperties(defaults,3).pv,ageProperties({...defaults,missionYears:25},3).pv,'fraction');
 check(9,'25 t versus 23.5 t shortfall',1500,25000-presets.launcher.terran.referenceKg,'kg');const serialized=sizeDesign(JSON.parse(JSON.stringify(h.input)));check(9,'Design JSON round trip',h.wetKg,serialized.wetKg,'kg');
 const full=packStep(95,20,0,1,15,95,100,100,1,1),empty=packStep(15,0,20,1,15,95,100,100,1,1);
 check(3,'Full battery surplus curtailed',20,full.curtailed,'kW');check(3,'Empty usable battery unmet demand',20,empty.unmet,'kW');
 check(3,'Flight integrator charge efficiency',19,packStep(10,10,0,1,0,100,100,100,.9,.9).energy,'kWh');
 check(4,'Integrated queue drainage average',6.9444,p.deliverGB(1000,1000,600)*8000/86400,'Mbit/s',.001);
 const g={station:'Reference station',rangeKm:700,elevationDeg:60},u=linkBudget({...defaults,link:'ka'},g,.01,100);check(4,'Independent uplink is slower than bulk Ka',1,Number(u.uplinkMbps>0&&u.uplinkMbps<u.lineMbps),'bool');
 check(5,'Flight drag routine agrees with analytic result',.05625,flightDrag(1e-12,7500,2,1000),'N');check(5,'Magnetic authority parallel to B',0,12000*40e-6*Math.sin(0),'N·m');
 check(6,'Finite engine mass flow × burn duration',m,(defaults.thrustN/(G0*300))*(m*G0*300/defaults.thrustN),'kg');check(6,'Flight impulse approximation',33.93,burnMass(10000,300,10),'kg',.01);
 check(7,'Insufficient aggregate high-bandwidth memory prevents model execution',0,sizeDesign({...defaults,trayCount:1,chipGB:1,chipsPerTray:1}).tokensPerSec,'tok/s');
 const aged=ageProperties({...defaults,batteryRetention:1,pvRetention:1,emissivityRetention:1,alphaGrowth:0},12);check(8,'Zero annual fade preserves BOL PV efficiency',defaults.pvEfficiency,aged.pv,'fraction');
 const g0=geometry(defaults,0),sun=g0.sunECI,inc=Math.acos(sun[2])*180/Math.PI,raan=Math.atan2(sun[0],-sun[1])*180/Math.PI;
 const dawn={...defaults,inclinationDeg:inc,raanDeg:(raan+360)%360};let dawnShadow=0,normalShadow=0;for(let t=0;t<86400;t+=240){dawnShadow+=Number(geometry(dawn,t).eclipse);normalShadow+=Number(geometry(defaults,t).eclipse)}
 check(8,'Sun-normal orbit all-day shadow samples',0,dawnShadow,'samples');check(8,'Baseline orbit has shadow crossings',1,Number(normalShadow>0&&normalShadow<360),'bool');
 const enclosure=h.enclosure;
 check(2,'Six enclosing walls',6,enclosure.walls.length,'walls');
 check(2,'Shell area including occupied penetrations',enclosure.grossAreaM2,enclosure.coveredAreaM2+enclosure.penetrationM2,'m²');
 const shell=solveOuter(enclosure,300,185,100),absorbed=enclosure.coveredAreaM2*(185*enclosure.exteriorAbsorptivity+100*enclosure.exteriorEmissivity);
 check(2,'Exterior blanket radiative balance',0,absorbed+1000*shell.outwardKW-enclosure.coveredAreaM2*SIGMA*enclosure.exteriorEmissivity*(shell.outerK**4-3**4),'W',1e-6);
 check(9,'New Glenn high-capacity keep-in at 13.97 m',2.7254,radiusAt(fairings.glenn.profile,13.97),'m');
 check(9,'Starship historical keep-in at station 13',3.04,radiusAt(fairings.starship.profile,13),'m');
 const upper=fairingFit({...defaults,launcher:'glenn',fairingM:6.35,fairingLengthM:18.542},[{part:'High-mounted test article',z0M:14,z1M:17,radiusM:2.7}]);
 check(9,'High-mounted load fails the tapered nose',0,Number(upper.fit),'bool');
 return records;
}
