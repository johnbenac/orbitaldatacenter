// Phase A engineering rationale. All prose is local and available on a static host.
// A source's locator identifies the relevant method, benchmark or product boundary.
import {controls,defaults,presets,solveModes} from './design.js';
import {thermalNodes} from './thermal-limits.js';
import {fairings} from './fairings.js';
import {launchFleet} from './launch-fleet.js';
import {serviceSources} from './ai-service.js';

const GOLD='https://standards.nasa.gov/system/files/tmp/GSFC-STD-1000RevI_Approved_0.pdf';
const GEVS='https://standards.nasa.gov/sites/default/files/standards/GSFC/B/0/gsfc-std-7000b_signature_cycle_04_28_2021_fixed_links.pdf';
const SOA='https://www.nasa.gov/smallsat-institute/sst-soa/';
const refs=new Map();
function source(id,title,url,locator,kind='Technical reference'){
 const record={id,title,url,locator,kind};
 refs.set(id,record);
 return record;
}
source('seh','NASA Systems Engineering Handbook','https://www.nasa.gov/reference/4-0-system-design-processes/','Rev 2, §§4.1–4.4 · stakeholder expectations, requirements, logical decomposition and design solution');
source('trade','NASA Systems Engineering Handbook','https://www.nasa.gov/reference/6-0-crosscutting-technical-management/','Rev 2, §6.8 · decision analysis and comparison of alternatives');
source('smad','Larson & Wertz · Space Mission Analysis and Design','https://link.springer.com/book/9780792359012','3rd ed., 1999 · ISBN 978-0-7923-5901-2 · publisher catalog, print and licensed library access','Published handbook');
source('smadprint','Space Technology Series · SMAD III','https://spacetechnologyseries.com/books/Space-Mission-Analysis-and-Design.html','Publisher series catalog · printed third edition and ordering information','Authorized access');
source('gevs','GSFC-STD-7000B · GEVS',GEVS,'Rev B, 28 Apr 2021 · §§2.2, 2.3 and 2.9 · applicability, electrical performance and end-to-end tests','Verification guidance');
source('gevst','GSFC-STD-7000B · thermal verification',GEVS,'Rev B · §§2.6.1, 2.6.3.2, 2.6.4 · terms, thermal-vacuum test parameters and thermal balance','Verification guidance');
source('gevsm','GSFC-STD-7000B · mechanical verification',GEVS,'Rev B · §2.4 · structural and mechanical verification of flight hardware','Verification guidance');
source('gold','GSFC-STD-1000I · GOLD Rules',GOLD,'Rev I, 19 Aug 2025 · Introduction and Rules 1.08–1.09 · system-level testing in representative configurations','Design guidance');
source('margin','GSFC GOLD · resource margins',GOLD+'#page=12','Rev I · Rule 1.06, Table 1.06-1 and notes · resource boundaries and milestone-dependent margins','Design guidance');
source('actuator','GSFC GOLD · actuator selection',GOLD+'#page=27','Rev I · Rule 1.31 · anticipated mass-property growth in actuator sizing','Design guidance');
source('coatings','GSFC GOLD · coating validation',GOLD+'#page=67','Rev I · Rule 4.06 · establish and verify optical properties over mission life','Design guidance');
source('clear','GSFC GOLD · mechanisms and clearances',GOLD+'#page=77','Rev I · Rules 4.18 and 4.24 · articulation tests and final as-built clearance verification','Design guidance');
source('thermalrules','GSFC GOLD · thermal margins',GOLD+'#page=78','Rev I · Rules 4.25, 4.27, 4.28 · design headroom, test margins and thermal-balance verification','Design guidance');
source('critical','GSFC GOLD · command and telemetry',GOLD+'#page=17','Rev I · Rules 1.14 and 1.40 · command authority and mission-critical telemetry','Design guidance');
source('power','NASA Small Spacecraft Technology · power',SOA+'power-subsystems/','Ch. 3, §§3.2 and 3.4 · solar power generation and rechargeable energy storage');
source('thermal','NASA Small Spacecraft Technology · thermal control',SOA+'thermal-control/','Ch. 7, §§7.2–7.3 · passive surfaces, interfaces, radiators and active thermal transport');
source('mech','NASA Small Spacecraft Technology · structures',SOA+'structures-materials-and-mechanisms/','Ch. 6 · primary structures, materials and deployable mechanisms');
source('gnc','NASA Small Spacecraft Technology · attitude control',SOA+'guidance-navigation-and-control/','Ch. 5 · attitude determination, torque actuators and momentum management');
source('rf','NASA Small Spacecraft Technology · communications',SOA+'soa-communications/','Ch. 9 · RF and optical links, antenna hardware, ground links and pointing');
source('ground','NASA Small Spacecraft Technology · ground segment',SOA+'ground-data-systems-and-mission-operations/','Ch. 11 · ground segment, network selection and operations');
source('prop','NASA Small Spacecraft Technology · propulsion',SOA+'in-space_propulsion/','Ch. 4 · chemical propulsion, performance and integration tradeoffs');
source('rocket','NASA Glenn · ideal rocket equation','https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/','Propellant-mass ratio, specific impulse and ideal velocity increment');
source('atv','ESA · Automated Transfer Vehicle service module','https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/ATV/ATV_Service_Module','Propulsion architecture · flight reference for orbit reboost','Flight precedent');
source('drag','NASA Glenn · drag equation','https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/','Coefficient and reference area in D = ½ρv²CᴅA');
source('elements','JPL NAIF · osculating orbital elements','https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/oscelt_c.html','Detailed Output and Particulars · element definitions, epoch, inertial frame and singularities');
source('transfer','NASA Basics of Space Flight · trajectories','https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/','Chapter 4 · orbital trajectories and changes of orbit');
source('thermosphere','ECSS-E-ST-10-04C Rev.1 · space environment','https://ecss.nl/standard/ecss-e-st-10-04c-rev-1-space-environment-15-june-2020/','15 June 2020 · Annex G, Table G-4 · altitude-dependent JB-2006 total density for four activity levels','Model input reference');
source('radioflux','NOAA SWPC · F10.7 radio flux','https://www.spaceweather.gov/phenomena/f107-cm-radio-emissions','10.7 cm solar radio flux, solar flux units and atmospheric applications');
source('fluxarchive','NOAA PSL · monthly solar flux','https://psl.noaa.gov/data/correlation/solar.data','Monthly 10.7 cm flux sequence · workbench replays 2009–2019','Measured series');
source('density','U.S. Standard Atmosphere, 1976','https://ntrs.nasa.gov/citations/19770009539','NOAA/NASA/USAF · atmospheric properties versus altitude','Reference atmosphere');
source('debris','NASA · orbital debris mitigation process','https://standards.nasa.gov/sites/default/files/standards/NASA/C/0/nasa-std-871914c.pdf','NASA-STD-8719.14C, §§4.6–4.7 · postmission disposal and reentry · project applicability and current requirements require separate review');
source('orsat','NASA Orbital Debris Program Office · ORSAT','https://orbitaldebris.jsc.nasa.gov/reentry/orsat.html','Object Reentry Survival Analysis Tool · trajectories, breakup and component demise');
source('entry','ESA · reentry and collision avoidance','https://www.esa.int/Space_Safety/Space_Debris/Reentry_and_collision_avoidance','Reentry prediction and trajectory uncertainty');
source('perf','MLCommons · MLPerf Inference Datacenter','https://mlcommons.org/benchmarks/inference-datacenter/','Datacenter inference workloads, test scenarios and performance metrics','Benchmark methodology');
source('llama','Meta · Llama 3.1 family model card','https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct','Model information and architecture · 8B / 70B variants, grouped-query attention and context support','Model reference');
source('gemma','Google · Gemma 2 model card','https://ai.google.dev/gemma/docs/core/model_card_2','Model sizes, inputs and outputs, context and model architecture','Model reference');
source('dgx','NVIDIA · DGX H100/H200 User Guide','https://docs.nvidia.com/dgx/dgxh100-user-guide/introduction-to-dgxh100.html','DGX H100 system specifications and weight · maximum system rating and installed GPU count','Terrestrial hardware');
source('h100','NVIDIA · H100 Tensor Core GPU','https://www.nvidia.com/en-us/data-center/h100/','H100 specifications · distinguish SXM / PCIe and dense / sparsity-enabled tensor throughput','Terrestrial hardware');
source('tpu','Google Cloud · TPU v6e','https://docs.cloud.google.com/tpu/docs/v6e','System architecture and specifications · 918 peak BF16 TFLOP/s per chip','Terrestrial hardware');
source('ssd','Micron · 7450 SSD Technical Product Specification','https://assets.micron.com/adobe/assets/urn%3Aaaid%3Aaem%3Ad133a40b-b36c-4b17-b768-659acc4d4bca/renditions/original/as/7450-nvme-ssd-tech-prod-spec.pdf','Product features, performance and endurance · PRO 1 DWPD and MAX 3 DWPD configurations','Terrestrial hardware');
source('ccsds','CCSDS · Space Link Services publications','https://ccsds.org/publications/sls/','TM Synchronization and Channel Coding · coding changes physical-to-information bit rate');
source('nisar','NASA/JPL · NISAR observatory','https://nisar.jpl.nasa.gov/mission/observatory/overview/','Observatory overview · 3.5 Gbit/s Ka-band telecom and approximately 9 Tbit end-of-life recorder','Flight precedent');
source('tbird','NASA NTRS · TBIRD optical downlink','https://ntrs.nasa.gov/citations/20230007959','Operations and Results from the 200 Gbps TBIRD Laser Communication Mission · flight demonstration','Flight precedent');
source('shield','NASA · Radiation Effects and EEE Parts Selection','https://www.nasa.gov/wp-content/uploads/2024/02/radiation-and-parts-selection.pdf','Shielding discussion · mass thickness, device sensitivity and dose versus depth');
source('pvtest','Spectrolab · XTE-HF high-fluence cell','https://www.spectrolab.com/photovoltaics/XTE-HF_Data_Sheet.pdf','Manufacturer data sheet · post-1 MeV electron efficiency retention under the US and ECSS test methods, AM0 at 28 °C','Component test data');
source('pack','NASA · lithium-ion battery use in space','https://ntrs.nasa.gov/citations/20090023862','NASA/TM-2009-215751 · cell selection, design, operation and qualification');
source('passive','NASA Passive Thermal Control Engineering Guidebook','https://ntrs.nasa.gov/citations/20230013900','Rev 4.0 (2023) · thermal modeling, surface finishes, multilayer insulation and integration');
source('painttest','NASA · lifetime of Z-93 radiator coating','https://ntrs.nasa.gov/citations/19920048673','Space Station Freedom case study · predicted end-of-life solar absorptance and thermal emittance under a defined exposure','Exposure-specific example');

const missionBasis='Mission requirement chosen by the designer. Public references give the engineering method.';
const assume='Editable engineering assumption for this spacecraft.';
const material='Preset material estimate. Use characterization for the selected material, installation and exposure history.';
const estimate='Workload estimator input. Calibration requires the same model, precision, context, batch and service objective.';
const hardware='Installed-hardware estimate. Use the specific module or integrated assembly data sheet and its test conditions.';
const codeInput='Workbench operating policy or model control.';
const controlByKey=new Map(controls.map(c=>[c.key,c]));
const catalog={};
function group(ids,basis,rows){for(const [key,advice,example] of rows)catalog[key]={ids:ids.split(' '),basis,advice,example}}
const format=v=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:6}):String(v??'');
group('seh smad',missionBasis,[
 ['missionYears','Choose the service duration needed by the users. Compare beginning, intermediate and terminal eclipse seasons before accepting the duration.','Five Julian years represent 157,788,000 s. The material retention at year three stays fixed when the requested mission is extended.'],
 ['requiredTps','Estimate simultaneous users × required decode tokens per second per user during an active burst. Account for prompt handling, context and contact delay separately.','100 concurrent users × 100 output tok/s per user = 10,000 active tok/s.'],
 ['latencyTargetS','Specify the largest acceptable onboard time to first output token. Budget ground wait, uplink, prompt prefill and delivery separately for an end-to-end service objective.'],
 ['requiredLineMbps','Set an application-level contact goodput objective from bytes to deliver and the time actually available after acquisition.','75 decimal GB in 600 s requires 1,000 Mbit/s of net payload goodput.']
]);
group('power margin',assume,[
 ['solarM2','Sum the physical planform of all four photovoltaic wings. Size at elapsed age with eclipse recharge, pointing, packing and bus conversion losses.','At 1,361 W/m² and 30% efficiency, 1 m² yields 408.3 W before bus losses.'],
 ['batteryKWh','Enter installed beginning-of-life nameplate energy for the full pack. Check both peak discharge power and usable energy through the longest deficit.'],
 ['targetSOC','Set the design reserve at the most demanding discharge. Choose a value above the operating floor that leaves useful energy for the following interval.'],
 ['chargeC','Use the allowable sustained pack charge rate across the intended temperature range. The cap applies on the bus side in this model.','1 C on a 40 kWh nameplate pack gives a 40 kW charge cap.'],
 ['dischargeC','Use the pack’s sustained bus-discharge rating over the expected state of charge and temperature. Check eclipse and slewing demand together.','2 C on a 40 kWh pack gives an 80 kW discharge cap.'],
 ['socMin','Use the lowest operational fraction allowed by the pack and mission policy. Energy at this floor remains unavailable to the modeled bus.'],
 ['socMax','Set the charge ceiling below the cell-management maximum when the operating plan calls for reduced upper SOC.'],
 ['socInitial','Enter stored energy at launch as a fraction of initial installed capacity, between the operating floor and ceiling.','A starting SOC of 0.90 in a 40 kWh pack gives 36 kWh at the epoch.'],
 ['chargeEff','Use stored energy divided by energy entering the pack at the bus. Characterize it at the expected temperature and charge rate.','10 kWh from the bus at 0.95 charge efficiency stores 9.5 kWh.'],
 ['dischargeEff','Use energy delivered to the bus divided by the corresponding decrease in stored energy.','A 9 kWh bus load at 0.90 discharge efficiency removes 10 kWh from storage.'],
 ['packWhKg','Use installed nameplate Wh per kilogram including pack structure, protection electronics and interconnects.','100 kWh at 150 Wh/kg gives about 667 kg of installed pack.'],
 ['packWhL','Use pack-level volumetric energy density including packaging, restraints and protection electronics.','40 kWh at 200 Wh/L occupies 200 L.'],
 ['batteryRetention','Convert a life-test result for comparable temperature, cycle depth and throughput to an equivalent annual capacity retention.','80% remaining after 8 years gives an annual multiplier of 0.8^(1/8) ≈ 0.9725.'],
 ['pvEfficiency','Enter beginning-of-life cell electrical efficiency at the assumed illumination and temperature. Account for panel packing and bus losses in the delivery factor.'],
 ['solarDelivery','Multiply packing fraction and downstream electrical efficiencies once. Include harness and regulated conversion in this combined factor.','0.90 active coverage × 0.95 electrical delivery gives 0.855.'],
 ['pvRetention','Derive an elapsed-year multiplier from radiation or flight degradation at a stated reference dose, orbit and duration.','90% output after five reference years gives 0.9^(1/5) ≈ 0.9791 per year.'],
 ['pvKgM2','Enter cell and substrate mass per square metre of installed wing planform. The hinge, carriage and joint ledger is separate.']
]);
group('perf dgx',estimate,[
 ['trayCount','Count whole installed compute trays. Check model replicas, memory fit, power, launch fit and heat rejection together.'],
 ['trayKw','Use the active electrical input to one installed tray, including its host and accelerator boundary. Pump, storage and bus loads have separate ledger entries.'],
 ['trayIdleKw','Measure one powered tray during idle periods with the same host, memory and power policy. The off policy removes this baseline during idle intervals.'],
 ['chipsPerTray','Count accelerators physically installed in each packaged tray. Use the allocated memory and bandwidth per accelerator when estimating throughput.'],
 ['chipTF','Enter the peak BF16 arithmetic throughput per accelerator using consistent dense/sparse counting. The workload-efficiency input converts the ceiling into an estimate.'],
 ['chipGB','Enter accessible accelerator memory per chip in decimal GB. Include weights, reserved runtime memory and KV cache before counting replicas.'],
 ['chipBW','Enter per-chip memory bandwidth in decimal GB/s. Apply the separate realized-bandwidth factor when modeling decode under the selected batch.'],
 ['trayKg','Weigh the complete tray boundary used for the mass ledger, including host and cold-plate allocation. External switches and the pumped loop are separately budgeted.'],
 ['computeEfficiency','Calibrate useful model work against a measured prefill workload at the selected context and precision. Kernel and scheduling losses reduce the attainable peak.'],
 ['bwEfficiency','Infer sustained bandwidth from a decode trace or hardware counters at the intended batch size. Larger batches reuse weights but add KV traffic.']
]);
group('llama gemma perf',estimate,[
 ['paramsB','Use the parameter count of the specific model revision to estimate weight capacity and per-token arithmetic. Enter billions of parameters.'],
 ['bits','Enter average stored bits per weight for the selected checkpoint. Activation, KV and scale metadata occupy separate memory.','An ideal 8 billion parameter checkpoint at 4 bits/weight needs 4 decimal GB before runtime overhead.'],
 ['context','Enter the tokens retained per concurrent stream. Longer contexts enlarge KV memory and affect the number of independent model copies that fit.'],
 ['batch','Set the number of simultaneous streams sharing a model replica. Sweep it while checking time to first token and per-user response speed.'],
 ['promptTokens','Use a representative input prompt length within the configured context. Prefill shares compute time with output generation.'],
 ['outputTokens','Set the expected generated response length. Longer responses move service time from prefill toward decode for each request.'],
 ['kvKB','Use the model’s decoder layer count, KV heads, head dimension and cache precision to estimate KV storage in decimal kB per token per stream.','For 32 layers, 8 KV heads, head dimension 128 and two-byte cache entries, K and V require 131.072 kB/token.']
]);
group('perf seh',missionBasis,[
 ['duty','Choose the intended active share of each orbit from the mission schedule. A short active interval lowers average work while preserving its peak hardware demand.','At 50% duty, 550 active TFLOP/s yields 275 TFLOP/s averaged over time.'],
 ['bytesPerToken','Measure serialized payload bytes against output token count for the chosen language, encoding and message format. Add link coding and packet overhead separately.','10,000 output tok/s × 4 B/tok × 8 bit/B = 0.32 Mbit/s before overhead.'],
 ['bulkMbps','Estimate the rate of checkpoint, imagery and other bulk products during active compute. Use average bytes per product and generation cadence.','One 6 GB checkpoint per 10 active minutes averages 80 Mbit/s during active time.'],
 ['initialQueueGB','Enter undelivered bulk data already present at launch. It competes with newly generated outputs for recorder space and contact time.'],
 ['retainedGB','Reserve occupied storage for persistent datasets and files. Model weights and the downlink queue are tracked separately.']
]);
group('ssd gold',hardware,[
 ['storageTB','Choose raw installed SSD capacity, including oversizing to whole modules. Account for model image, retained files, reserved space and maximum queued products.'],
 ['diskReserve','Choose the fraction of physical storage unavailable to mission data for overprovisioning or operational reserve.','8 TB raw with 12% reserved leaves 7.04 TB before weights and retained files.'],
 ['diskWatts','Use active electrical input per storage module at the required read/write mix, bus voltage and temperature.'],
 ['dwpd','Use the rated drive writes per day with its warranted term and workload. The analytic planning model uses a five-year endurance basis.','A 4 TB module rated 1 DWPD for five years corresponds to about 7,300 TB written.'],
 ['diskModuleTB','Enter the raw decimal TB supplied by one installed module. The sizing solver rounds module count upward.'],
 ['diskModuleKg','Include installed SSD carrier and mounting mass within each module boundary. Keep main body structure in its own allocation.'],
 ['diskWrite','Use sustained write throughput per module at the target fill level and duty cycle. Incoming payload may be lost when writes cannot keep up.'],
 ['diskRead','Use sustained per-module read throughput with concurrent writes present. SSD reads can limit an otherwise faster optical contact.']
]);
group('elements transfer',missionBasis,[
 ['epoch','Set the UTC instant to which all six elements refer. A different epoch changes the Sun direction and rotating ground-station locations for the same elements.'],
 ['altitudeKm','Enter semi-major axis minus the model Earth radius of 6,378.137 km. In an eccentric orbit, compare the computed perigee and apogee against the environment and insertion budgets.','At e = 0, a 550 km entry gives a = 6,928.137 km.'],
 ['ecc','Choose eccentricity from the planned or measured state. Check perigee clearance at a(1 − e) and access/drag changes along the ellipse.','At a = 7,000 km and e = 0.01, apsis radii are 6,930 and 7,070 km.'],
 ['inclinationDeg','Use the orbit-plane inclination to the equator. Inspect station access and reachable ground latitudes, then the mass allowance for that inclination.'],
 ['raanDeg','Set the inertial longitude of the ascending node at the epoch. Together with inclination and seasonal Sun geometry it controls solar beta and eclipse seasons.'],
 ['argPeriDeg','Specify the direction of periapsis within the orbital plane. For a circular orbit use a consistent zero convention and describe the initial position with mean anomaly.'],
 ['meanAnomalyDeg','Place the spacecraft along its orbit at epoch using mean anomaly. The solver computes true anomaly through Kepler’s equation.']
]);
group('gnc actuator drag',assume,[
 ['rollDeg','Choose roll with the active attitude law. Compare wing incidence, radiator exposure, projected drag and torque in the same state.'],
 ['pitchDeg','In manual attitude, use pitch to turn the commanded body reference away from the local radial direction toward the orbit normal. Review heat, power and ram area together.'],
 ['yawDeg','In manual attitude, vary yaw in the local orbit frame. Inspect the resulting body-normal vectors and the footprint projected into the relative flow.'],
 ['solarTiltDeg','Enter the commanded solar-wing tracking offset. Greater obliquity reduces generation and changes the projected silhouette.','For an unshadowed ideal single face, 60° off normal receives half the normal direct flux.'],
 ['cd','Use a drag coefficient consistent with the atmospheric regime, attitude and the model’s projected reference area. Vary it with density when examining uncertainty.'],
 ['cpOffsetM','Use a perpendicular effective lever arm between mass center and pressure center. The reduced-order aerodynamic torque is drag force × lever arm.','0.05 N of drag at 0.1 m effective offset produces 0.005 N·m.'],
 ['cmgMomentumNms','Specify usable cluster momentum storage including geometry and steering reserve. Check integrated disturbance momentum between unloading opportunities.'],
 ['cmgTorqueNm','Specify the available clustered torque for the commanded axis and envelope. Assess slew transients with projected inertia growth and gimbal limitations.'],
 ['dipoleAm2','Use the combined commanded magnetic dipole and verify authority against the field component perpendicular to it.','1,000 A·m² perpendicular to 30 µT gives 0.030 N·m. Parallel alignment gives zero.']
]);
group('thermosphere radioflux fluxarchive',assume,[
 ['solarCyclePhase','Choose where the selected orbit begins within the repeated eleven-year activity history. Phase changes density, accumulated drag and reboost consumption.'],
 ['ap','Select an Ap geomagnetic activity scenario consistent with the density analysis. Compare low, nominal and disturbed cases across an identical orbit.'],
 ['f107Floor','Set the quiet end of the nominal 10.7 cm radio-flux cycle, in solar flux units, at or below the ceiling. The observed replay uses archived monthly values.'],
 ['f107Ceiling','Set the active end of the nominal radio-flux envelope using an observed or scenario-defined solar cycle. Compare annual drag impulse across the range.']
]);
group('rf ground',assume,[
 ['kaDishM','Size the Ka-band reflector clear aperture and include its stowed envelope. A larger dish raises gain and tightens the pointing tolerance.'],
 ['opticalApertureM','Choose the transmit telescope’s clear aperture. Compare the resulting divergence, jitter loss and acquisition time with the selected station geometry.','For the model wavelength of 1,550 nm and D = 0.12 m, 1.22λ/D is about 15.8 µrad.'],
 ['opticalJitterUrad','Enter fine pointing residual in microradians. Use the same angular convention as the modeled beam divergence and budget tracking error during acquisition.'],
 ['opticalTxW','Use emitted optical beam power in watts, after laser and optical losses appropriate to the terminal boundary. Total terminal electrical draw is budgeted separately.'],
 ['linkCapMbps','Set the payload application-rate ceiling imposed by the modem, backend or network contract. Link physics, storage reads and available bytes can each further limit delivery.'],
 ['elevationDeg','Set the minimum station elevation above the local horizon using terrain or link constraints. A higher mask shortens contacts and changes the slant-range distribution.'],
 ['contactFraction','For quick inverse sizing, divide mission-usable contact seconds by total elapsed seconds. Compare the assumption against simulated access for the actual orbit and network.','600 usable seconds per 86,400 s day gives a fraction of 0.00694.']
]);
group('ccsds rf',assume,[
 ['codingEff','Set the payload fraction remaining after link coding, framing and protocol overhead. Use the selected modulation/coding configuration and avoid counting overhead twice.','A 500 Mbit/s physical channel at 0.78 end-to-end efficiency can carry up to 390 Mbit/s application data.']
]);
group('thermal gevst thermalrules',assume,[
 ['radiatorM2','Enter total physical radiator planform. Both faces emit in this architecture. Include absorbed direct sunlight, reflected light and Earth IR in the net-rejection balance.','At 300 K and ε = 0.90, one emitting face radiates about 413 W/m² before environmental absorption.'],
 ['appliedHeatKw','Choose an independent heat experiment in kilowatts to isolate thermal response. Linked mode derives heat from the operating electrical system instead.'],
 ['thermalResistanceKPerKw','Use a per-tray effective resistance from junction to the shared radiator node. Estimate it from the stack-up or measured temperature rise at known transported power.','A 2 kW tray and 4 K/kW interface give an 8 K model rise above the rejection node.'],
 ['radiatorDesignK','Use a radiator design temperature that leaves adequate cold-plate and junction headroom at peak heat transport. Compare the sizing target with time-resolved temperatures.'],
 ['radKgM2','Use installed radiator bank mass per physical planform, including its panel construction. Coolant, pumps, external hinges and frame have separate mass boundaries.'],
 ['initialCoreK','Initialize the modeled core/loop temperature from the prelaunch soak condition. Inspect commissioning transients before using a steady operating result.'],
 ['initialBatteryK','Enter a separate initial pack temperature consistent with launch conditioning, battery charge policy and the intended first power cycle.'],
 ['launchBoundaryK','Use the temperature presented by the launch enclosure or payload conditioning interface until the spacecraft is exposed to the orbital environment.'],
 ['packHeatKJkgK','Use effective pack heat capacity per installed kilogram. Include cells, structure and participating hardware on the relevant transient timescale.','A 200 kg pack at 0.9 kJ/(kg·K) stores 180 kJ for a 1 K temperature change.'],
 ['packCouplingWKkg','Use the thermal conductance to the shared loop per installed kilogram. Estimate it from the actual mounting path or a measured thermal time constant.'],
 ['penetrationWK','Sum thermal bridges through fasteners, harnesses and sealed fluid feedthroughs. This is total conductance across the enclosure.','A 0.2 W/K aggregate bridge at 50 K temperature difference carries 10 W.']
]);
group('thermal coatings',material,[
 ['emissivity','Use beginning-of-life hemispherical infrared emittance of the installed radiator finish at its temperature. Review both IR absorption and outward emission.'],
 ['absorptivity','Use measured beginning-of-life solar absorptance for the selected coating/substrate stack. Direct and reflected shortwave flux use this coefficient.'],
 ['emissivityRetention','Fit an annual multiplicative IR emittance retention to a mission-relevant dose or time reference. Re-evaluate at actual elapsed age.'],
 ['alphaGrowth','Use an absolute annual increment in solar absorptance, fitted to relevant contamination and radiation exposures.','Starting at 0.09 with growth 0.004 per year gives 0.11 after five years.'],
 ['blanketEffectiveEpsilon','Use an effective through-blanket emittance from the installed layer count, seams, compression and vacuum thermal test.'],
 ['blanketOuterEpsilon','Use the outer cover’s infrared emittance for its environmental heat balance. The internal layer performance is specified separately.'],
 ['blanketOuterAlpha','Use outer-layer solar absorptance, including the actual exposed finish and contamination state, to compute shortwave heat input.']
]);
group('mech gevsm clear',hardware,[
 ['skinKgM2','Allocate structural sandwich wall mass per covered square metre. Cutouts reduce wall area, and the separate frame carries its own mass.'],
 ['blanketKgM2','Use multilayer blanket areal mass with outer cover, fasteners and seams included. Subtract occupied penetrations from covered area.'],
 ['adapterKg','Enter the launch-only adapter and separation-hardware allocation at the chosen interface. It contributes to launched mass and stays with the launcher on separation.'],
 ['fairingM','Use an approved payload keep-in diameter for this exact fairing and adapter, not the rocket’s advertised outside diameter. The control scales all radial profile stations.'],
 ['fairingLengthM','Measure usable keep-in height from the payload adapter plane. Tapered nose stations may bind before the stated axial height.'],
 ['radialPaddingM','Budget one-sided payload lateral motion and clearance at each axial station. Check the provider envelope’s allowance for fairing motion before adding project deflections.'],
 ['axialPaddingM','Allow for axial motion, integration tolerances and separation geometry. A forward shift in a tapered fairing can also consume lateral clearance.']
]);
group('shield mech',hardware,[
 ['shieldKgM2','Choose added shielding mass per covered wall area from a mission-specific dose/transport study and component tolerance. This input adds hardware mass.','At 2,700 kg/m³ density, a uniform 1 mm aluminium layer adds 2.7 kg/m² before fasteners and cutouts.']
]);
group('margin seh',assume,[
 ['structureMargin','Apply the editable growth factor once to modeled dry hardware. Record launch headroom separately as allowable minus predicted stack mass. GOLD Table 1.06-1 distinguishes milestone mass margin from item growth allowance.','At 15% modeled growth, 2,000 kg of basic dry hardware receives 300 kg of added dry allocation.'],
 ['launchAllowanceKg','Enter the accepted mission-specific stack allowance for the target insertion and recovery mode, including the launch-only adapter on the same mass boundary.'],
 ['referenceKg','Use the provider’s specified reference orbit, mass boundary and recovery configuration when interpreting the published performance point.']
]);
group('prop atv rocket',hardware,[
 ['propellantKg','Specify the combined fuel and oxidizer load. Budget trim, accumulated drag, planned maneuvers, retirement, reserves and inaccessible residuals.'],
 ['yearsSupply','Choose the required station-keeping coverage independently of the requested analysis duration. Inspect coverage after protecting other chemical allocations.'],
 ['isp','Use delivered specific impulse at representative pulse duration, mixture ratio and feed conditions. Propellant mass flow equals thrust divided by g₀Isp.'],
 ['thrustN','Enter total operating thrust of the paired engines. Test whether a finite burn can deliver the required impulse within its scheduled interval.'],
 ['fuelDensity','Use the fuel’s bulk liquid density at modeled tank temperature. Convert kg to litres before sizing the fuel vessel and ullage.'],
 ['oxidizerDensity','Use the oxidizer’s liquid density at the selected temperature and composition. Check the oxidizer tank capacity independently.'],
 ['mixtureRatio','Use delivered oxidizer-to-fuel mass ratio from the engine map over its permitted inlet conditions.','O/F = 2 makes 300 kg of loaded liquid equal to 100 kg fuel and 200 kg oxidizer.'],
 ['reserveFraction','Protect an explicitly allocated fraction of loaded liquid for operational contingency. Keep trapped residuals and disposal allocation separate.'],
 ['residualFraction','Estimate inaccessible liquid using tank/PMD geometry, feed-line volume and shutdown conditions. Express it as a fraction of the initial total liquid load.'],
 ['trimDv','Budget post-separation velocity correction from the launch dispersion envelope and spacecraft maneuver plan. Compare requested and delivered trim.'],
 ['maneuverDv','Allocate additional chemical velocity change for a nominated operational maneuver, independently of daily drag compensation.'],
 ['disposalDv','Set the minimum protected disposal delta-v. The model also evaluates the selected terminal orbit transfer and protects the larger requirement.'],
 ['tankFill','Set maximum launch liquid volume divided by internal tank volume, leaving room for pressurant and thermal expansion.','For 86 L liquid and 0.86 maximum fill, the pressure vessel needs 100 L of internal volume.']
]);
group('debris transfer orsat',missionBasis,[
 ['disposalTargetPerigeeKm','For the reentry case, choose a transfer perigee that crosses the modeled 120 km atmospheric interface on descent. Verify that the available impulse reaches it.'],
 ['graveyardAltitudeKm','Choose the intended raised circular disposal altitude and verify both transfer burns, final apsides and propellant use. A modeled altitude alone cannot establish suitability or compliance.'],
 ['targetLatDeg','Set the nominal reference-body impact latitude within the reachable orbit ground-track band. Check achieved error relative to the chosen tolerance.'],
 ['targetLonDeg','Specify the reference ground target longitude in degrees east, with west negative. Timing and Earth rotation determine reachable longitudes.'],
 ['targetToleranceKm','Define an allowed surface-distance error for evaluating this study’s nominal target. Assess the separately computed reference-body uncertainty footprint.'],
 ['targetSearchHours','Choose a pre-end-of-mission search interval long enough to cover multiple ground-track opportunities. An extended search trades timing flexibility against remaining service time.']
]);
group('orsat entry density',assume,[
 ['entryBallisticKgM2','Enter surviving reference-body mass divided by drag coefficient × frontal area. The simplified trajectory follows one non-lifting, non-ablating body.','A 120 kg body with Cᴅ = 1.5 and 0.8 m² frontal area has β = 100 kg/m².'],
 ['entryDensitySigmaPct','Estimate one-standard-deviation fractional density uncertainty over the descent regime from atmospheric ensembles or project data.'],
 ['entryBallisticSigmaPct','Estimate one-standard-deviation ballistic-coefficient variation from plausible surviving mass, aerodynamic shape and projected area.'],
 ['entryVelocitySigmaMs','Use the entry speed uncertainty at the atmospheric interface. Estimate it from the maneuver and orbit-determination covariance.'],
 ['entryAzimuthSigmaDeg','Use the one-sigma entry heading uncertainty in degrees, consistent with the assumed interface velocity errors. It principally changes cross-track dispersion.']
]);
const nodeAdvice={
 junction:'Use the accelerator junction rating at the intended power and package conditions. Translate a board or case measurement through the validated junction thermal path.',
 coldPlate:'Use limits for the plate, seals, interface stack and attached electronics at their stated reference point.',
 coolant:'Use the working-fluid, line, seal and pump envelope at the loop pressure and required flow. Include freezing, viscosity or boiling limits where relevant.',
 radiator:'Use the permissible temperature of the panels, bonding, fluid path and installed coating.',
 battery:'Use the complete pack qualification and cell-management limits. Charging may have a narrower permitted range than discharge.',
 enclosure:'Use the exposed outer-layer, adhesive and seam temperature allowance. The modeled point is the exterior blanket surface.'
};
for(const node of thermalNodes)for(const state of ['operating','survival'])for(const side of ['min','max']){
 const key=node.keys[state][side],extent=side==='min'?'coldest':'hottest',limit=side==='min'?'lower':'upper';
 catalog[key]={ids:['gevst','thermalrules'],basis:'Editable component requirement. Establish the actual rating from the supplier or project qualification record.',
  advice:nodeAdvice[node.id]+' Enter the '+limit+' '+state+' bound in kelvin. Compare it with the '+extent+' temperature while the component is in that state.',
  example:'The reference '+node.label.toLowerCase()+' uses '+format(defaults[key])+' K as its '+state+' '+limit+' bound. This is a workbench example.'};
}
const selectFields={
 compute:['Choose the tray boundary first, then compare power, mass, model fit and useful output on the same workload.','dgx tpu perf'],
 workload:['Choose the exact model family and checkpoint. Set weight precision, context, prompt length and batch to match the intended service.','llama gemma perf'],
 storage:['Choose the device capacity, sustained read/write mix, endurance and thermal mounting as a complete package.','ssd gevst'],
 battery:['Choose chemistry together with pack-level energy density, allowable rates, thermal envelope and life-test retention.','power gevst'],
 pv:['Compare beginning-of-life conversion, EOL retention and deployed mass at the same temperature, incidence and exposure assumptions.','power margin'],
 coating:['Compare solar absorptance and IR emittance at launch and after mission exposure. Use installed-finish data from comparable samples.','thermal coatings'],
 engine:['Select a compatible fuel, oxidizer, mixture ratio and pressure-fed engine set. Keep thrust, delivered Isp, fluid density and feed constraints together.','prop atv rocket'],
 launcher:['Compare payload allowance, tapered keep-in profile, recovery mode and maturity for the specified orbit. Set a separate mission-specific mass allowance.','clear margin'],
 network:['Choose sites that the orbit can see above the elevation mask. Compare actual contact durations with the planning access fraction.','ground critical'],
 solarDriver:['Use a nominal solar-cycle sensitivity case or replay the historical flux series. Both drive atmospheric density independently of photovoltaic irradiance.','radioflux fluxarchive thermosphere'],
 attitude:['Choose the commanded body reference and inspect solar incidence, radiator exposure, ram silhouette and pointing in the same interval.','gnc actuator drag'],
 link:['Choose a terminal from the traffic and contact budget. Evaluate uplink separately from spacecraft-to-ground delivery.','rf nisar tbird'],
 thermalMode:['Use linked IT and bus heat to size the mission. Use a known applied heat load to characterize the transport and rejection boundary.','thermal gevst'],
 idleComputePolicy:['Decide whether idle intervals retain powered trays. Check output, initial warm-up assumptions, survival bands and the energy balance.','perf thermalrules'],
 pumpStandbyPolicy:['Select pump dispatch for idle intervals and assess component temperatures and their active qualification states.','thermal gevst'],
 disposalMethod:['Choose a terminal objective early so allocation protects its propellant. Compare the achieved route and footprint or transfer apsides in Phase F.','debris transfer orsat']
};
for(const [key,[advice,ids]] of Object.entries(selectFields))catalog[key]={advice,ids:ids.split(' '),basis:codeInput};
const opts={};
function options(key,rows){opts[key]=Object.fromEntries(rows.map(([id,advice,ids,basis=assume])=>[id,{advice,ids:ids.split(' '),basis}]))}
options('compute',[
 ['flight','Start here for a generic conduction-cooled flight-tray study. Replace power, mass and throughput with measurements for the proposed flight assembly.','perf gevst',hardware],
 ['dgx','Use this point to compare a complete terrestrial DGX enclosure. The NVIDIA H100 system uses eight GPUs and is rated up to 10.2 kW and 130.45 kg. The modeled idle load and space integration are engineering assumptions.','dgx h100 perf','Published terrestrial chassis ratings plus workbench integration assumptions.'],
 ['trillium','Use TPU v6e as a terrestrial silicon reference. Google publishes 918 BF16 TFLOP/s and 32 GB HBM per chip. The workbench assumes four chips per flight tray and supplies its own tray power and mass.','tpu perf','Published chip specifications plus an assumed flight-tray package.']
]);
options('workload',[
 ['llama8','Use the smaller grouped-query model for a memory-efficient service. The preset assumes four-bit stored weights. Measure overhead and KV precision for your chosen checkpoint.','llama perf',estimate],
 ['llama70','Use the larger model to test memory fit and multi-chip replication. Validate the four-bit checkpoint, communication overhead and user latency at the requested batch.','llama perf',estimate],
 ['gemma','Use the Gemma 2 9B family with the preset BF16 storage assumption. Confirm cache format, context and model revision before calibrating decode.','gemma perf',estimate]
]);
options('storage',[
 ['enterprise','The generic enterprise TLC case favors density and throughput. Compare actual controller power, sustained mixed I/O and the supplier endurance term.','ssd',hardware],
 ['rugged','Use this illustrative conduction-cooled module to examine packaging and endurance costs. Confirm shock/vibration, vacuum cooling and media derating on the flight assembly.','ssd gevsm gevst',hardware]
]);
options('battery',[
 ['nmc','The example nickel-manganese-cobalt pack trades higher specific energy against this study’s capacity-retention estimate. Check supplier charge limits and thermal conditions.','power gevst',material],
 ['lfp','The example lithium-iron-phosphate pack uses lower specific energy and different charge-rate and retention assumptions. Compare at equal delivered eclipse energy.','power gevst',material]
]);
options('pv',[
 ['multijunction','Use the multijunction example to trade a smaller area for the required bus watts. Enter measured beginning-of-life efficiency and dose-specific degradation for the selected cells.','power',material],
 ['silicon','Compare the silicon example at the same EOL output requirement. Additional deployed area affects stowed fit, drag torque, mass and recharge.','power clear',material]
]);
options('coating',[
 ['osr','Use the optical solar reflector example for a low-solar-absorption radiator. Check panel seams, backing, view factors and EOL optical measurements.','thermal coatings',material],
 ['paint','Use the white silicate example to compare increased solar absorption with the assumed IR emittance. Measure the finish on the actual substrate and track contamination exposure.','thermal coatings',material]
]);
options('engine',[
 ['mmh','Pair the MMH fuel with MON-3 oxidizer and the corresponding engine assumptions. Use delivered engine-test values and fluid densities at the planned storage temperature.','prop atv rocket',hardware],
 ['aero','Pair Aerozine-50 fuel with nitrogen tetroxide oxidizer. Preserve separate compatible tanks and lines, and replace the illustrative performance with supplier data for the chosen engine.','prop rocket',hardware]
]);
options('network',[
 ['global','Model access to Svalbard, Fairbanks, Haleakalā, Canberra, Madrid and Punta Arenas. Availability, receiver capability and contracted capacity must be established for each site.','ground rf',codeInput],
 ['polar','Model three sites at high absolute latitude: Svalbard, Fairbanks and Punta Arenas. Inspect actual visibility, handover and transfer time for the chosen inclination.','ground elements',codeInput],
 ['svalbard','Model one northern site. Look for long gaps between usable passes, the necessary queue capacity and any orbit geometry that eliminates access.','ground rf',codeInput]
]);
options('solarDriver',[
 ['nominal','Set flux floor, ceiling and phase for a repeatable eleven-year design sensitivity. The 27-day variation and relation to tabulated density are simplified.','radioflux thermosphere',codeInput],
 ['observed','Replay the archived 2009–2019 monthly flux sequence. The workbench forms daily and smoothed proxies from the monthly data. Real daily/81-day indices require finer observations.','fluxarchive radioflux','Observed monthly radio flux with modeled interpolation and periodic replay.']
]);
options('attitude',[
 ['tracking','Use a Sun-referenced nominal body orientation and compare generation against radiator incidence and projected drag during the orbit.','gnc power',codeInput],
 ['nadir','Use the radial orbit reference for the nominal body orientation. Examine sunlight incidence and Earth IR exposure through a complete orbit.','gnc thermal',codeInput],
 ['inertial','Hold the modeled base axis on the inertial X direction. Sun and ram angles then evolve with season and orbital position.','gnc elements',codeInput],
 ['lowdrag','Use the orbit-normal reference to examine reduced ram cross-section. Compare generated power and net cooling with the Sun-referenced case.','drag gnc',codeInput],
 ['manual','Set roll, pitch, yaw and wing offset explicitly in the model’s local orbit frame. Inspect body axes and compare all subsystem responses at matched times.','gnc elements',codeInput]
]);
options('link',[
 ['auto','Use the scenario’s queue-based selection: S-band through 1 GB, Ka above 1 GB and optical above 10,000 GB. The thresholds are fixed dispatch assumptions in this model.','rf nisar tbird',codeInput],
 ['ka','Use the gimbaled RF reflector for a routine bulk downlink. Check range, elevation loss, gain and pointing margin over each contact. NISAR is a flight comparison.','rf nisar',codeInput],
 ['optical','Use the optical terminal for large queues with a sufficiently precise pointing loop. Goodput assumes model receiver losses and clear-sky access. TBIRD is a flight comparison.','rf tbird',codeInput],
 ['s','Use wide-beam patches for short, low-throughput payloads. Independent command uplink and downlink rates still need separate budgets.','rf critical',codeInput]
]);
options('thermalMode',[
 ['linked','Use actual served equipment draw, battery heat exchange, changing exposure and enclosure heat flow to follow the operating mission.','thermal gevst',codeInput],
 ['applied','Apply a known independent thermal input. Sweep load to characterize cold-plate rise, equilibrium and cooldown without changing the installed tray count.','thermal gevst',codeInput]
]);
options('idleComputePolicy',[
 ['powered','Keep idle tray electronics powered outside scheduled bursts during commissioning-complete service. Include idle draw in power and heat balance.','perf thermal',codeInput],
 ['off','Power down the compute trays between bursts. Evaluate the survival limits reached during the resulting cooldown.','gevst thermal',codeInput]
]);
options('pumpStandbyPolicy',[
 ['continuous','Run the nominal pump throughout service and include its electrical draw during idle intervals. Check battery margin at eclipse.','thermal power',codeInput],
 ['follow','Run the pump when IT or the independent heat experiment needs circulation. Inspect the modeled loop’s survival state during idle intervals.','thermal gevst',codeInput]
]);
options('disposalMethod',[
 ['reentry','Target the return site and tolerance, then inspect the feasible burn, atmosphere crossing, ground miss and reference-body footprint. ORSAT treats more detailed breakup and demise physics.','debris orsat entry','Simplified single-body ballistic study with project-specified target and uncertainty.'],
 ['graveyard','Set a raised circular target. Check both finite burns, protected propellant and achieved apsides. Select the actual disposal region using the applicable mission rules and environment.','transfer debris','Two-burn planning case with a user-defined disposal orbit.']
]);
opts.launcher={};
for(const [key,fleet] of Object.entries(launchFleet)){
 const refId='launcher-'+key,pkgId='profile-'+key,profile=fairings[key];
 source(refId,fleet.sourceTitle,fleet.sourceUrl,fleet.referenceOrbit+' · vehicle performance reference','Launcher reference');
 const ids=[refId];
 if(profile){source(pkgId,profile.source,profile.sourceUrl,profile.basis+' · payload profile assumptions and station geometry','Interface reference');ids.push(pkgId)}
 if(fleet.evidenceUrl){const id='vehicle-'+key;source(id,fleet.evidenceTitle,fleet.evidenceUrl,'Configuration or flight evidence for '+fleet.name,'Configuration evidence');ids.push(id)}
 opts.launcher[key]={advice:fleet.description+' Compare the design against the mission allowance and stowed profile.',basis:fleet.status+' · published/reference capacity '+format(fleet.referenceKg)+' kg. '+(profile?.basis??'Mission profile required')+'.',ids};
}
const choices={
 installed:'Specify installed quantities directly. Check achievable service, physical margins and launch fit for this fixed design.',
 workload:'Hold required active decode rate and workload assumptions fixed. Size whole trays and their supporting hardware, then check the achieved rate.',
 launch:'Set the orbit-specific stack allowance. Solve for whole-tray computing capacity under mass, fairing, power and thermal constraints.',
 lifetime:'Hold installed hardware fixed. Locate the first limiting envelope and use chronological analysis to evaluate time-resolved thermal and operating limits.',
 solar:'Solve installed PV planform from EOL demand, recharge and the assumed sunlight/incidence envelope.',
 radiator:'Solve physical radiator planform from heat load, emitting faces, surface properties, environmental absorption and transport margin.',
 battery:'Solve initial nameplate kWh from the selected SOC reserve, aging, charge/discharge efficiency and eclipse demand.',
 propellant:'Solve the liquid load that supports the allocated maintenance years while protecting other burn allocations.',
 supply:'Hold loaded propellant fixed and estimate the maintenance years left after protected allocations and residuals.',
 storage:'Solve required whole-module recorder capacity from the planning access gap, generated payload, reserved and retained bytes.',
 link:'Solve required application goodput during contact from mean offered traffic divided by assumed access fraction.',
 throughput:'Hold installed accelerators fixed. Estimate achievable active decode with memory fit and mixed prefill/decode constraints.'
};
const specials={
 solve:['Sizing method','Choose the independent mission constraint first. The solver derives the dependent quantity within the workbench limits and reports the achieved margin.','seh trade smad'],
 missionPreset:['Mission designs','Choose the Earth customer service to start from its spacecraft and workload. Save a named design to revisit your own configuration.','seh smad'],
 newPreset:['Choose a customer mission','Preview the service and starting spacecraft. Review the changes, then apply the mission and customize its design.','seh trade'],
 presetName:['Saved design name','Use a short, distinctive configuration name that identifies the workload and maturity of the hardware baseline.','trade'],
 presetDescription:['Saved design description','Record the design intent, distinguishing feature and assumptions that make this baseline useful for comparison.','trade'],
 savePreset:['Save a named design','Store the current design, solver choice and thermal requirement settings as a reusable baseline. Give experimental variants distinct names.','seh trade'],
 loadPreset:['Import a saved design','Load a workbench design file and inspect the solver, units, technology selections and mission scope before comparing results.','seh trade'],
 managePresets:['Saved designs','Open a named copy, download it as JSON or unload it from this browser. Import a downloaded copy to use it again.','trade'],
 thermalRole:['Temperature rating or derived requirement','Use a supplier/project rating to evaluate hardware. Derive a required limit from the coldest or hottest covered state plus the chosen padding when specifying new hardware.','gevst thermalrules'],
 thermalScope:['Temperature coverage','Choose a selected 24-hour operating window for a local transient or an integrated whole mission for a design requirement. Confirm coverage of each activity state.','gevst thermalrules'],
 thermalPadding:['Requirement padding','Specify project uncertainty headroom in kelvin. Subtract it from the observed cold extreme or add it to the hot extreme for a derived requirement.','gevst thermalrules'],
 thermalNode:['Thermal hardware node','Select the physical reference point to assess. Compare temperatures from that point with its own operating or survival rating.','gevst thermalrules'],
 thermalScale:['Thermal color scale','Use the narrow working span for small temperature differences or the wider span for boundary excursions. Qualification uses the full numerical temperature against rated limits.','gevst thermal'],
 adoptRating:['Adopt a derived temperature','Review the evaluated state, time span and padding, then explicitly adopt the derived limit as a new study input if this defines the requirement.','gevst thermalrules'],
 technologyCompare:['Compare compatible technology presets','Hold the other design assumptions fixed. Compare the achievable integer hardware sizes, mass, throughput and limiting margins for each compatible package.','seh trade smad'],
 independentTarget:['Independent sizing target','Select the quantity to solve after declaring the measured or constrained inputs. Recheck compatible materials, whole units and any negative margins.','seh trade'],
 referenceOrbit:['Reference orbit','Compare published payload points only after identifying altitude, inclination, recovery mode and interface boundary. Use the mission-specific allowance for the actual design.','elements margin'],
 launcherMaturity:['Launcher maturity','Distinguish demonstrated flight configurations, provider projections and dated concept studies. Track the interface revision used to size this payload.','trade clear'],
 launcherEnvelope:['Launcher keep-in profile','Use dimensioned interior keep-in stations from the mission interface drawing. External fairing diameter gives a separate vehicle dimension.','clear gevsm']
};
for(const [key,[title,advice,ids]] of Object.entries(specials))catalog[key]={title,advice,ids:ids.split(' '),basis:key.startsWith('thermal')?'Project requirement or workbench assessment choice.':'Workbench configuration decision.'};
for(const [key,title,advice,ids,example] of [
 ['conceptCompute','Installed active IT power','Read the installed tray count multiplied by active electrical input per tray. This rating describes simultaneous active compute before separate storage, pump, communications and platform loads.','dgx perf power','12 trays × 2 kW/tray = 24 kW installed active IT power.'],
 ['conceptMass','Launched stack mass','Add dry hardware and its engineering growth allowance, liquid fuel, oxidizer, pressurant and the launch-only adapter. Compare this predicted total with the mission allowance and the selected launcher reference.','margin mech clear','A 2,400 kg dry spacecraft plus 450 kg of liquids, 2 kg pressurant and a 180 kg adapter totals 3,032 kg on the launch manifest.'],
 ['conceptSolar','Installed solar wing planform','Read the total physical planform across all four solar wings in the current design. Electrical output also depends on active cell coverage, cell efficiency, illumination, incidence, elapsed age and delivery losses.','power pvtest','Four equal 47.5 m² wings provide 190 m² total planform.'],
 ['conceptDecode','Estimated active aggregate decode capacity','Read estimated simultaneous output tokens per second across the installed accelerators. The estimator checks model memory fit, sustained bandwidth, arithmetic capacity and the share of time spent on prompt prefill. Ground delivery is reported separately.','perf llama gemma','A measured 50 output tok/s per user across 100 simultaneous users would yield 5,000 aggregate tok/s at those workload settings.']
])catalog[key]={title,advice,ids:ids.split(' '),basis:'Current installed-design result or explicit workload estimator. Published references describe the component or performance boundary.',example};
catalog.epoch.title='Epoch (UTC)';catalog.kvKB.title='KV cache per token (decimal kB)';catalog.diskModuleKg.title='Installed storage module mass';catalog.referenceKg.title='Provider reference payload';
options('solve',Object.entries(choices).map(([id,advice])=>[id,advice,'seh trade smad','Workbench inverse-sizing method.']));

options('missionPreset',[
 ['starter','Start with the spacecraft, workload and operating assumptions defined for the chosen Earth service.','seh trade',assume],
 ['custom','Reopen an exact named design to reuse its saved hardware, workload and thermal requirements.','seh trade',missionBasis]
]);
options('thermalRole',[
 ['input','Specify the allowable rating for this hardware and state. The current temperature and all modeled excursions are assessed against this rating.','gevst thermalrules',missionBasis],
 ['derive','Infer a requirement from observed extremes and study padding. Review state coverage before adopting that requirement as an input.','gevst thermalrules',codeInput]
]);
options('thermalScope',[
 ['window','Resolve extrema and state transitions across the selected consecutive 86,400 seconds.','gevst',codeInput],
 ['mission','Integrate the entire mission chronologically to capture the most restrictive covered temperature in each state.','gevst thermalrules',codeInput]
]);
options('thermalScale',[
 ['working','Use the fixed 245–305 K display span for near-operating temperatures. The endpoints saturate outside that span.','thermal',codeInput],
 ['full','Use the fixed 180–380 K span for a broader view of temperature variation. Read the numeric node rating for qualification.','thermal',codeInput]
]);
opts.thermalNode=Object.fromEntries(thermalNodes.map(n=>[n.id,{advice:nodeAdvice[n.id],basis:'Modeled hardware temperature point.',ids:['thermal','gevst']}]));
// Distinguish component assumptions from published verification and resource-margin practice.
catalog.structureMargin.advice+=' GOLD gives a PDR mission mass margin above 10% using basic dry mass as its denominator. The workbench growth factor is a separate dry-ledger input.';
catalog.solarM2.advice+=' For applicable GSFC Phase A reviews, GOLD Table 1.06-1 gives more than 20% EOL power margin, calculated against available power. Size this mission’s own margin from its loads and uncertainties.';
catalog.reserveFraction.ids.push('margin');
catalog.reserveFraction.advice+=' GOLD Table 1.06-1 frames propellant uncertainty as a 3σ budget. Enter the fraction derived for this mission rather than treating 3σ as 3%.';
catalog.f107Floor.example='The workbench nominal cycle uses 70–180 sfu. The ECSS lookup’s low, moderate and long-term high F10.7 reference cases are 65, 140 and 250 sfu.';
catalog.solarDriver.example='The observed option repeats 132 monthly samples beginning in 2009. The nominal option repeats once per eleven Julian years.';
catalog.pvRetention.ids.unshift('pvtest');catalog.pvEfficiency.ids.unshift('pvtest');opts.pv.multijunction.ids.unshift('pvtest');
catalog.pvRetention.example='Spectrolab’s XTE-HF AM0 table gives 0.85 efficiency retention at a fluence of 10¹⁵ one-MeV electrons/cm² under its US test basis. Convert to elapsed years only after estimating the mission-equivalent exposure.';
catalog.pvEfficiency.example='Spectrolab reports 32.1% BOL efficiency for its XTE-HF cell at AM0, 28 °C and 27 cm². The workbench reference uses 30% as a different illustrative cell input.';
catalog.alphaGrowth.example='A Space Station Freedom Z-93 study predicted solar absorptance rising from 0.15 to 0.36 over 30 years of the studied LEO exposure, equivalent to 0.007 per year under a linear fit.';
catalog.emissivityRetention.example='The same Z-93 exposure study predicted infrared emittance changing from 0.92 to 0.90 in 30 years, an equivalent multiplier of (0.90/0.92)^(1/30) per year.';
catalog.storageTB.ids.unshift('nisar');catalog.storageTB.example='NISAR’s approximately 9 Tbit end-of-life recorder holds 1.125 decimal TB. Retained and undelivered data consume the available capacity.';
catalog.linkCapMbps.example='NISAR’s 3.5 Gbit/s Ka system is a flight scale comparison. An application cap needs its own coding, framing and backend budget.';catalog.linkCapMbps.ids.push('nisar');
opts.link.optical.advice+=' TBIRD demonstrated 200 Gbit/s and transferred as much as 4.8 TB in one pass.';

for(const key of ['batteryKWh','battery','chargeC','dischargeC','socMin','socMax','socInitial','chargeEff','dischargeEff','batteryRetention','packWhKg','packWhL'])catalog[key].ids.unshift('pack');
for(const key of ['blanketKgM2','blanketEffectiveEpsilon','blanketOuterEpsilon','blanketOuterAlpha','penetrationWK','packCouplingWKkg','packHeatKJkgK','thermalResistanceKPerKw','radiatorDesignK','radKgM2'])catalog[key].ids.unshift('passive');
for(const key of ['emissivityRetention','alphaGrowth'])catalog[key].ids.unshift('painttest');
const aliases={'phase-solve':'solve',solver:'solve',sizingMethod:'solve',designFrom:'solve',preset:'missionPreset',presetSelection:'missionPreset',presets:'missionPreset',newpreset:'newPreset',savepreset:'savePreset',loadpreset:'loadPreset',managepresets:'managePresets',presetname:'presetName',presetdescription:'presetDescription',thermalTargets:'thermalRole','bound-role':'thermalRole','thermal-node':'thermalNode','thermal-scope':'thermalScope','thermal-padding':'thermalPadding',thermalTarget:'thermalRole','thermal-scale':'thermalScale',solverTarget:'independentTarget',compare:'technologyCompare',disposal:'disposalMethod',launcherProfile:'launcherEnvelope'};
const numericExtras={kvKB:['kB/tok'],diskModuleKg:['kg'],referenceKg:['kg']};
// Service goals, hardware sizing and customer acceptance have separate evidence.
for(const r of serviceSources)source(r.id,r.title,r.url,r.locator,r.kind);
group('mlperf-inference seh',missionBasis,[
 ['serviceOffersPerHour','Enter external offers per wall-clock hour. Every arrival, including one made during an outage, belongs in the service denominator.'],
 ['serviceConcurrency','Set the number of runnable user slots whose data and model state can coexist on the installed hardware. Excess arrivals remain queued.'],
 ['serviceDeadlineS','Measure the receipt deadline from the Earth-side request or job offer. For a training order the dedicated training budget in days sets the deadline.'],
 ['targetStreamTps','Choose a sustained generation target per simultaneous Earth stream. Inspect achieved rate alongside first-response delay and interruptions; ingress and protocol overhead have separate budgets.','10,000 streams × 50 tok/s × 4 B/token × 8 bits/B = 16 Mbit/s of text payload.'],
 ['liveQualityFraction','Estimate the share of SLA-qualified replies that pass a named answer-quality or voice intelligibility/effectiveness test. Multiply by the count received by deadline, keeping every Earth offer in the denominator.'],
 ['ttftTargetS','Choose the maximum delay from the Earth prompt offer until the first returned output token, including acquisition, input transfer, waiting, prefill and return propagation.'],
 ['streamGapTargetS','Set the longest acceptable gap between returned text tokens. Evaluate outage gaps and cadence independently of mean decode throughput.'],
 ['batchResultSwing','Set the deterministic fractional variation above and below mean object size. Alternating small and large results make storage spikes and contact return times visible without changing average production.','At 10 MB per result and a 0.4 swing, alternating objects are 6 MB and 14 MB.'],
 ['batchQualityFraction','Supply the acceptance fraction from validation on the intended dataset and test. This parameter converts on-time returned items to expected accepted items.'],
 ['batchInputMB','Measure the actual staged input file in decimal MB. Large inputs compete for uplink and recorder capacity.'],
 ['batchResultMB','Measure the encoded output object. Change this input to test text-sized output, images, embeddings or larger generated products.'],
 ['customerUplinkMbps','Set an explicit customer-traffic cap. Direct spacecraft ingress also depends on station contact, acquisition and the S-band channel left after commands.'],
 ['initialInputGB','Specify customer data already aboard at the epoch. Preloaded examples or a resident training corpus can be processed without crediting new Earth utterances as uploaded.'],
 ['inputSpoolGB','Reserve persistent storage for uploaded inference requests and file inputs waiting for compute. Check space for outputs and other retained files separately.']
]);
group('opus mlperf-inference',missionBasis,[
 ['voiceAudioKbps','Enter the encoded speech bitrate per direction. Include the actual codec and packet overhead in the service budget.'],
 ['voiceTurnSeconds','Set the duration of the input speech and modeled audible reply. The bidirectional byte budget is independent of serialized text bytes.'],
 ['audioChunkMs','Set the modeled audio packet duration. Compare packetization delay and buffering with the first-audio and interruption objectives.'],
 ['vadEndpointMs','Estimate the delay to recognize that speech has ended, from a measured turn-taking trace. Network and inference time are added afterward.'],
 ['voicePlaybackBufferMs','Provide the receiving client’s jitter buffer and playout delay. A larger buffer can mask short gaps and increases interruption-to-silence delay.'],
 ['voiceFirstAudioTargetS','Set the maximum time from speech end on Earth to the first audible reply, after voice processing, return transit and buffering.'],
 ['voiceInterruptionTargetS','Set the acceptable interruption-to-silence time. The counterfactual probe includes sending a cancellation, receiving the response and clearing the modeled playout buffer.']
]);
group('agent-study claude-study mlperf-inference',estimate,[
 ['agentFanout','Set the number of search agents commissioned inside one assignment at each serial stage. Limited model slots force parallel branches into successive waves. Only one verifier-qualified result can be returned per assignment.'],
 ['agentMessageKB','Specify the total decimal kB exchanged by each participating agent per stage. These peer messages consume onboard fabric bandwidth separately from the customer-facing result.'],
 ['agentVerifyFraction','Enter an evidence-backed verification acceptance fraction for the assigned task class. Compare completed, tested results with all Earth task offers.'],
 ['agentSerialSteps','Count model stages that depend sequentially on previous outputs. Tool round trips can block each stage.'],
 ['toolsPerTask','Estimate the typical number of tool executions per task, including verification steps when they consume resources.'],
 ['toolCpuSeconds','Measure local tool CPU core-seconds per call under the selected task and verification workload. Parallel cores affect aggregate throughput.'],
 ['toolIOMB','Budget per-call input/output bytes. The service model splits the modeled remote transfer into request and response.'],
 ['hostCores','Enter installed usable CPU cores available for tool execution, staging and service. Check host power and fabric load with the active purpose.'],
 ['earthToolFraction','Allocate tool calls between Earth-hosted tools and onboard tools. Earth calls wait for usable downlink and uplink in the model.'],
 ['toolRttS','Enter remote tool processing and gateway delay in addition to the actual Earth-path round trip.'],
 ['humanSteeringS','Add the Earth-side human review time for each task requiring steering. The request and response still need contact opportunities.']
]);
group('optimizer parallel mlperf-training',estimate,[
 ['fabricGbps','Use sustained useful collective bandwidth per worker at the selected topology. Gradients, optimizer steps and communication overhead affect attainable training throughput.'],
 ['trainingStateBytes','Enter device memory bytes per updated parameter, including the relevant weights, gradients and optimizer state at actual precision.'],
 ['trainableFraction','For parameter-efficient tuning, enter updated parameters divided by total base parameters. The resident base and activation workspace still need memory.'],
 ['activationFraction','Reserve activation and temporary workspace memory as a fraction of modeled training state. Use measurements at the selected batch, context and recomputation settings.'],
 ['pretrainParamsB','Enter the complete model parameter count in billions. All stored parameters contribute to model size.'],
 ['activeParamFraction','Set the portion of total parameters active per training token. Sparse activation reduces arithmetic under a specified model architecture while stored state still occupies memory.'],
 ['trainingTokensB','Set the pretraining token budget in billions. A token count determines compute work; quality requires a matched validation calibration.'],
 ['fineTuneTokensM','Set the customer tuning budget in millions of optimizer input tokens, including repeated epochs.'],
 ['trainingStepTokens','Set global tokens processed for an optimizer update. Communication per step interacts with compute and fabric bandwidth.'],
 ['trainingBudgetDays','Set the customer’s wall-clock order deadline, allowing time for staging, training, validation and complete transfer to Earth.'],
 ['datasetGB','Enter unique corpus bytes that must be resident for this run. Multiple epochs can reuse these data without adding new unique tokens.'],
 ['checkpointIntervalH','Set scheduled restart-save spacing in active hours. Compare exposed work between saves against I/O overhead.'],
 ['checkpointBytesPerParam','Use measured serialized restart state per relevant trained parameter; architecture, precision and optimizer change this number.','At 14 bytes per parameter, a full one-trillion-parameter restart package occupies 14 decimal TB.'],
 ['artifactReturnHours','Set the Earth delivery budget starting only after the final artifact has been trained and serialized. An order must meet this handoff and the separate end-to-end training deadline.','Returning 2 TB in 6 h takes an average 741 Mbit/s of net goodput, compared with about 3.09 Mbit/s over 60 days. Intermittent access requires higher in-contact rates.'],
 ['artifactBits','Choose the packed precision of the exported full weights. Record configuration, tokenizer and any quantization metadata separately.','One trillion full weights occupy 2 decimal TB at 16 bits, or 500 GB at packed four-bit precision, before metadata.'],
 ['corpusTokenBytes','Set the serialized pretokenized bytes per unique stored token. Account for metadata or independently staged source data if appropriate.','One trillion distinct uint32 token IDs occupy 4 decimal TB before metadata.'],
 ['validationTarget','Set the required higher-is-better score on a named held-out task. Use the same validation protocol for both hardware options.'],
 ['validationObserved','Enter the calibration result obtained at this order’s token budget, model revision and training recipe. The estimator does not generate validation evidence.'],
 ['validationBaseline','Enter the base model’s evaluation score on the same task and protocol. The achieved gain is the calibrated tuned score less the baseline.']
]);
group('laser filing suncatcher',assume,[
 ['relayUpMbps','Use contract-level customer uplink goodput after routing and overhead. Hardware intersatellite line rates do not establish customer access.'],
 ['relayDownMbps','Specify the customer downlink separately from uplink, ground access and the laser hardware line rate.'],
 ['relayAvailability','Specify the available share of a repeatable service cycle. The experiment applies an additional handover blackout each cycle.'],
 ['relayCycleS','Choose the period of the assumed relay availability pattern. This scheduling sensitivity stands in for a signed service trace.'],
 ['relayHandoverS','Reserve a blackout at the start of each relay cycle. Direct-plus-relay falls back to the ground link only if the station is acquired.'],
 ['relayRttMs','Enter the complete relay-path round trip including switching and gateway legs. The model uses half of this value per direction.'],
 ['groundEdgeMs','Add Earth-side gateway processing one way. This is separate from slant-range propagation or contracted relay RTT.']
]);
group('mlperf-inference mlperf-training',assume,[
 ['earthITKw','Measure Earth IT power for a hardware configuration running the same task, quality test and service objective.'],
 ['earthUsefulPerHour','Enter Earth hardware throughput for comparable completed orders before the separate quality and deadline acceptance factors.'],
 ['earthPUE','Use facility electricity divided by IT electricity for the workload location and measurement interval.'],
 ['earthQualityFraction','Supply independently measured acceptance among completed Earth jobs using the same quality criterion as the spacecraft.'],
 ['earthDeadlineFraction','Enter the fraction of quality-accepted Earth completions meeting the same wall-clock service deadline.'],
 ['earthEnergyPrice','Enter the electricity tariff per facility kWh for an energy-only operating-cost comparison.'],
 ['spaceEnergyPrice','Optionally assign a cost per spacecraft bus kWh. Launch, manufacturing, ground and relay contract charges are outside this accounting boundary.']
]);
for(const [key,advice,ids] of [
 ['aiPurpose','Select the customer deliverable before choosing spacecraft hardware. Compare Earth-returned useful work under its own acceptance criteria.','mlperf-inference mlperf-training'],
 ['serviceRoute','Choose direct contacts, an assumed relay path, or relay with direct fallback. One path supplies the payload in an interval.','laser filing'],
 ['trainingCalibration','Declare whether a measured validation result maps this model, data, recipe and token budget to the specified quality target.','mlperf-training'],
 ['baseCompatible','Record whether the Earth recipient has the exact base model, revision, tokenizer and adapter configuration required to load the update.','peft'],
 ['artifactKind','Choose the deliverable the customer needs to open on Earth. Adapter updates, complete weights and restartable training states have different byte counts and dependencies.','peft optimizer']
])catalog[key]={advice,ids:ids.split(' '),basis:codeInput};
options('aiPurpose',[
 ['text','Count on-time turns that meet Earth first-token delay and streaming cadence.','mlperf-inference'],['voice','Count audible turns with acceptable response, gap and cancellation delay.','opus'],['batch','Count quality-accepted objects received by deadline.','mlperf-inference'],['agents','Count verified tasks with their entire tool and steering chain.','agent-study claude-study'],['finetune','Require a matched validation and usable adapter or full-model receipt.','peft mlperf-training'],['pretrain','Require an attainable training state, matched target quality, and final artifact return.','mlperf-training parallel optimizer']
]);
options('serviceRoute',[['direct','Serve Earth work through actual ground visibility, acquisition and directional net rate.','rf ground'],['relay','Use an explicitly assumed periodic relay customer service contract.','laser filing'],['hybrid','Prefer the available relay and switch to acquired ground during outages; never add the two rates.','laser rf']]);
options('trainingCalibration',[['none','Report physical training and transfer forecasts with quality still unassessed.','mlperf-training'],['measured','Use the specified matched evaluation score at the full training-token budget.','mlperf-training']]);
options('baseCompatible',[['yes','The receiving site already holds the declared compatible base.','peft'],['no','An adapter alone cannot reconstruct the requested model at the recipient.','peft']]);
options('artifactKind',[['adapter','Return trainable adapter weights and their configuration against a compatible base.','peft'],['full','Return the complete updated model at export precision.','peft optimizer'],['restart','Return training state required for restart under this implementation, including optimizer state as configured.','optimizer parallel']]);

export const guidanceSources=Array.from(refs.values());
function records(ids){return [...new Set(ids)].map(id=>{const r=refs.get(id);if(!r)throw Error('Unregistered guidance source '+id);return r})}
function resolvedKey(key){return aliases[key]||key}
function optionList(key,ctrl){
 const rows=opts[key];
 if(!rows)return null;
 return Object.entries(rows).map(([value,opt])=>{
  const label=ctrl?.options?.[value]??(key==='solve'?solveModes[value]:undefined)??value;
  const example=optionExample(key,value);
  return {value,label,advice:opt.advice,basis:opt.basis,sources:records(opt.ids),...(example?{example}:{})};
 });
}
function optionExample(key,option){
 const tech=presets[key]?.[option];
 if(key==='launcher'&&launchFleet[option]){
  const f=launchFleet[option];return format(f.referenceKg)+' kg reference: '+f.referenceOrbit+'. Recovery or staging: '+f.recovery+'.';
 }
 if(!tech)return undefined;
 const q=(field,unit)=>format(tech[field])+' '+unit;
 switch(key){
 case 'compute':return q('chipsPerTray','chips/tray')+', '+q('trayKw','kW active/tray')+' and '+q('trayKg','kg/tray')+' in this configuration.';
 case 'workload':return q('paramsB','billion parameters')+' at '+q('bits','bits/weight')+' with '+q('kvKB','kB of KV cache/token/stream')+' assumed.';
 case 'storage':return q('diskModuleTB','TB/module')+', '+q('diskWrite','GB/s writes')+' and '+q('dwpd','drive writes/day')+' assumed.';
 case 'battery':return q('packWhKg','Wh/kg')+' at pack level, '+q('chargeC','C charge')+' and '+q('dischargeC','C discharge')+' assumed.';
 case 'pv':return format(100*tech.pvEfficiency)+'% beginning-of-life cell efficiency and '+q('pvKgM2','kg/m²')+' assumed.';
 case 'coating':return 'Illustrative BOL optical properties: solar absorptance '+format(tech.absorptivity)+', infrared emittance '+format(tech.emissivity)+'. Both are dimensionless.';
 case 'engine':return q('thrustN','N paired thrust')+', '+q('isp','s delivered Isp')+' and '+format(tech.mixtureRatio)+' kg oxidizer/kg fuel assumed.';
 default:return undefined;
 }
}
function numericExample(key,c,d){
 for(const [family,entries] of Object.entries(presets)){
  const record=entries[d[family]];if(!Number.isFinite(record?.[key]))continue;
  const unit=c?.unit||numericExtras[key]?.[0]||'';
  return 'Selected preset starting value: '+format(record[key])+(unit?' '+unit:'')+'.';
 }
 const value=defaults[key];if(!Number.isFinite(value))return undefined;
 const unit=c?.unit||numericExtras[key]?.[0]||'';
 return 'Reference design input: '+format(value)+(unit?' '+unit:'')+'.';
}
function packSource(key,d){
 if(['trayKw','trayKg','chipsPerTray','chipTF','chipGB','chipBW'].includes(key)&&['dgx','trillium'].includes(d.compute)){
  const isDgx=d.compute==='dgx',published=isDgx?['trayKw','trayKg','chipsPerTray','chipGB']:['chipTF','chipGB','chipBW'];
  const ids=isDgx?['dgx','h100']:['tpu'];
  const reference=presets.compute[d.compute][key],isRef=reference===d[key]&&published.includes(key);
  return {ids,basis:isRef?'Matches the selected terrestrial product reference. Verify the installed flight configuration separately.':'Editable tray/installation assumption or override. Check the cited product variant and measurement boundary.'};
 }
 return null;
}
export function fieldGuidance(rawKey,design=defaults,context={}){
 const key=resolvedKey(rawKey),entry=catalog[key];
 if(!entry)return null;
 const d=design?.input??design??defaults,ctx=typeof context==='string'?{option:context}:context??{},ctrl=controlByKey.get(key),choices=optionList(key,ctrl);
 let option=ctx.option??(key==='solve'?ctx.solve:key==='missionPreset'?ctx.preset:undefined)??d[key];
 if(key==='missionPreset'&&option&&!opts.missionPreset[option])option='custom';
 const choice=opts[key]?.[option],pick=packSource(key,d);
 let advice=choice?entry.advice+' '+choice.advice:entry.advice;
 if(key==='thermalRole'&&ctx.key&&controlByKey.has(ctx.key))advice+=' Selected limit: '+controlByKey.get(ctx.key).label+'.';
 const ids=[...(choice?.ids??[]),...(pick?.ids??[]),...entry.ids],basis=pick?.basis??choice?.basis??entry.basis;
 if(['fairingM','fairingLengthM','radialPaddingM','axialPaddingM','adapterKg','launchAllowanceKg','referenceKg','referenceOrbit','launcherMaturity','launcherEnvelope'].includes(key)){
  const which=launchFleet[d.launcher]?d.launcher:defaults.launcher,pkg=fairings[which];
  ids.unshift('launcher-'+which);if(pkg)ids.unshift('profile-'+which);
  if(pkg&&['fairingM','fairingLengthM','launcherEnvelope'].includes(key))advice+=' '+pkg.note;
 }
 const example=entry.example??optionExample(key,option)??numericExample(key,ctrl,d);
 const bounds=ctrl&&!ctrl.options?{min:ctrl.min,max:ctrl.max,step:ctrl.step,unit:ctrl.unit||'',note:'Workbench input range. Hardware qualification and mission acceptance use separate evidence.'}:null;
 return {title:entry.title??ctrl?.label??key,advice,basis,sources:records(ids),...(example?{example}:{}),...(bounds?{bounds}:{}),...(choices?{options:choices}:{}),...(choice?{selectedOption:option}:{})};
}
