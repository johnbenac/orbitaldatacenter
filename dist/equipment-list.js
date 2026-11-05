import {equipmentAllocations,componentMassProperties} from './component-stations.js';
import {equipmentResources} from './equipment-resources.js';
import {retainFile} from './file-delivery.js';

// Sources describe the cited reference article. The installed design has its own
// mass and no assigned TRL. A reference mass is never added to the flight ledger.
const flight='Flight reference', product='Supplier reference', ground='Ground reference';
function ref(manufacturer,referenceModel,sourceUrl,evidence,heritage,referenceUnitMassKg=null,referenceMassBoundary=''){
 return {manufacturer,referenceModel,sourceUrl,evidence,heritage,referenceUnitMassKg,referenceMassBoundary};
}
const src={
 gpu:ref('NVIDIA','A100 80 GB SXM','https://www.nvidia.com/en-us/data-center/a100/',ground,'Ground accelerator performance reference. Radiation response, cold-plate integration and tray packaging require separate evidence.'),
 dgx:ref('NVIDIA','DGX H100','https://docs.nvidia.com/dgx/dgxh100-user-guide/introduction-to-dgxh100.html',ground,'Terrestrial eight-GPU server. Published maximum includes its hosts, chassis and installed devices.',130.45,'complete server, maximum'),
 tpu:ref('Google','Cloud TPU v6e · Trillium','https://docs.cloud.google.com/tpu/docs/v6e',ground,'Published v6e cloud configuration provides chip throughput and memory capacity. The study assigns its own flight tray.'),
 orbitGpu:ref('Starcloud / NVIDIA','Starcloud-1 · H100 flight demonstration','https://www.starcloud.com/starcloud-1',flight,'The operator reports an H100 GPU in orbit. This evidence covers the demonstrated payload and leaves the proposed multi-tray infrastructure unqualified.'),
 host:ref('HPE','Spaceborne Computer-2 · ProLiant DL360 / Edgeline EL4000','https://www.hpe.com/us/en/newsroom/press-release/2024/01/hpe-spaceborne-computer-2-returns-to-the-international-space-station.html',flight,'Commercial servers operated inside the ISS. A free-flying host chassis has a different thermal and radiation environment.'),
 ssd:ref('Micron','7450 PRO · MTFDKCE3T8TFR-1BC15ABYY','https://www.micron.com/products/storage/ssd/data-center-ssd/7450-ssd/part-catalog/part-detail/mtfdkce3t8tfr-1bc15abyy',ground,'3.84 TB enterprise NVMe drive. Modeled capacity, carrier mass and write budget follow the active design.'),
 rugged:ref('Curtiss-Wright','FSM-C 3U VPX flash storage carrier','https://defense-solutions.curtisswright.com/products/storage-recorders/modules-drives/fsm-c',product,'Rugged carrier packages a commercial drive. This is a packaging comparison.'),
 ssdf:ref('Kioxia','PM6, RM6 and XG6 · Spaceborne Computer-2','https://americas.kioxia.com/en-us/business/resources/tech-brief/pm6-spaceborne.html',flight,'Operated in an ISS-hosted HPE server. The cited drives have different interfaces and capacities.'),
 fabric:ref('NVIDIA','Quantum-2 QM9700 · MQM9700-NS2F','https://networking-docs.nvidia.com/qm97x0hw',ground,'400 Gbit/s per port terrestrial InfiniBand family. The study budgets its own switching, packaging and internal links.'),
 iau:ref('Moog','Integrated Avionics Unit','https://www.moog.com/content/dam/moog/literature/sdg/space/avionics/moog-integrated-avionics-unit-datasheet.pdf',product,'Supplier flight-electronics enclosure, up to 37 W. The budget includes the project-specific interfaces and mounting.',8.3,'one reference IAU, upper value'),
 avionics:ref('BAE Systems','RAD750 single-board computer','https://www.baesystems.com/en/article/gps-iii-satellite-launches-with-rad750--single-board-computers',flight,'RAD750 boards flew on GPS III. This reference covers spacecraft housekeeping avionics.'),
 power:ref('Airbus Crisa','Spacecraft PCDU family','https://www.crisa.airbus.com/en/airbus-crisas-solutions/power-electronics/power-management-and-distribution-pcdus',product,'Supplier power-conditioning and distribution equipment. Bus voltage, power class and fault protection need a mission-specific selection.'),
 battery:ref('Saft','VES16 space lithium-ion cell','https://www.nasa.gov/wp-content/uploads/2024/01/saft-ves16-cell-life-test-performance-update.pdf',flight,'Saft reports TELEOS-1 flight service for its 16 Wh NCA cell. This is a cell-level reference for the spacecraft pack. NMC and LFP pack properties are study inputs.'),
 pv:ref('Boeing Spectrolab / Redwire','XTJ Prime cells on ISS iROSA','https://rdw.com/newsroom/redwire-successfully-delivers-third-pair-of-irosa-solar-arrays-to-augment-iss-power/',flight,'iROSA uses Spectrolab triple-junction cells. ODC uses four strain-driven rollout wings with its own blanket packing and areal mass.'),
 silicon:ref('NASA / Boeing','ISS P6 silicon solar array wings','https://ntrs.nasa.gov/api/citations/20030068268/downloads/20030068268.pdf',flight,'Measured on-orbit output of crystalline-silicon ISS P6 wings. Cell performance and folding structure here are study assumptions.'),
 radiatorRotary:ref('NASA / ISS','Thermal Radiator Rotary Joint','https://www.nasa.gov/wp-content/uploads/2021/02/473486main_iss_atcs_overview.pdf',flight,'The station turns its radiator beam through a rotary fluid interface. The study assigns its own cant hinge and span-axis trim drive to each bank.'),
 drive:ref('Moog','Type 2 Solar Array Drive Assembly','https://www.moog.com/content/dam/moog/literature/sdg/space/spacecraft-mechanisms/moog-type-2-solar-array-drive-assembly-datasheet.pdf',product,'Supplier drive comparison. The boom saddles, blanket drums, radiator hinges, hold-downs and actuator drives add installation mass.',3.5,'one reference drive including harness, upper bound'),
 radiator:ref('Lockheed Martin','ISS photovoltaic and heat rejection radiators','https://news.lockheedmartin.com/2000-11-28-Lockheed-Martins-Radiators-Destined-for-Installation-on-International-Space-Station',flight,'Lockheed Martin built folding, fluid-loop radiator panels for the ISS. The selected panel construction and view factors belong to this spacecraft.'),
 osr:ref('Excelitas / Qioptiq','Space-qualified optical solar reflectors','https://www.excelitas.com/file-download/download/public/58606?filename=Qioptiq_Space-Qualified_Solar_Reflectors_Datasheet.pdf',product,'Supplier optical surface reference.'),
 paint:ref('AZ Technology','AZ-93 white inorganic silicate','https://www.aztechnology.com/product/1/az-93',product,'Supplier white thermal-control coating reference.'),
 coolant:ref('NASA / ISS program','External Active Thermal Control System','https://www.nasa.gov/wp-content/uploads/2021/02/473486main_iss_atcs_overview.pdf',flight,'Flown pumped loop, fluid lines and heat exchangers. The model treats fluid, manifolds and pump hardware as one thermal-transport allocation.'),
 ssdPower:ref('Micron','7450 product specification · table 4','https://sg.micron.com/content/dam/micron/global/public/documents/products/technical-marketing-brief/7450-nvme-ssd-tech-prod-spec.pdf',ground,'Product-mode RMS drive data. The mounted carrier is sized separately.'),
 cold:ref('Advanced Cooling Technologies','HiK plates · ISS APTx','https://www.1-act.com/resources/learning-center/case-studies/copperwater-heat-pipes-and-hik-plates-for-spacecraft-applications/',flight,'ISS thermal experiment provides a heat-spreading precedent.'),
 cmg:ref('Airbus Defence and Space','CMG 15-45S','https://www.airbus.com/sites/g/files/jlcbta136/files/2022-02/AVIONICS-CMG15-45-v5-2022.pdf',flight,'The Airbus family has orbital service. A 15-45S stores 15 N·m·s. The four-unit cluster rating in this model is a separate design assumption.',18.4,'one mechanism plus allocated electronics'),
 tracker:ref('Sodern','HYDRA Baseline star tracker','https://sodern.com/wp-content/uploads/2025/04/HYDRA_BASELINE.pdf',product,'Optical heads with a shared electronics interface. The pointing-sensor allowance also covers inertial and magnetic sensing.'),
 rod:ref('NewSpace Systems','NSS magnetorquer rod family','https://www.newspacesystems.com/products/magnetorquer-rods/',flight,'The supplier reports TRL 9 for its rod family, first flown in 2014. A three-axis system at the entered magnetic dipole requires its own sizing and qualification.'),
 sb:ref('EnduroSat','S-Band Antenna Commercial','https://www.endurosat.com/products/s-band-antenna-commercial/',flight,'Supplier reports flight service for its 2025–2110 MHz patch. A complete bidirectional tracking, telemetry and command terminal also needs a compatible downlink element, radio and RF harness.',.0774,'one receive-band patch only'),
 ka:ref('NASA JPL','NISAR high-rate Ka-band telecom','https://ntrs.nasa.gov/citations/20210008861',flight,'NISAR provides the bulk-RF service reference. Dish, gimbal and transmitter allocations follow this vehicle.'),
 optical:ref('MIT Lincoln Laboratory','TBIRD optical payload','https://www.ll.mit.edu/r-d/projects/terabyte-infrared-delivery-tbird',flight,'On-orbit high-rate laser downlink demonstration. Aperture, pointing method and transceiver packaging differ in this vehicle.'),
 tank:ref('Northrop Grumman','PMD tank · 80474-1','https://www.northropgrumman.com/what-we-do/space/mission-enabling-products/pmd-tanks',flight,'MiTEx reference lists 225.4 L at 17.2 bar. The modeled fuel vessel and mounting mass scale with the installed design.',8.4,'one 225.4 L reference tank'),
 ox:ref('Northrop Grumman','PMD tank · 80310-5','https://www.northropgrumman.com/what-we-do/space/mission-enabling-products/pmd-tanks',flight,'Eurostar reference lists 225.3 L at 17.6 bar. The modeled oxidizer vessel uses a spherical envelope and an independently sized attachment allowance.',15.4,'one 225.3 L reference tank'),
 helium:ref('Northrop Grumman','High-pressure helium vessel family','https://www.northropgrumman.com/what-we-do/space/mission-enabling-products/pressurant-tanks',flight,'Qualified gas-vessel families have flown on satellites and launch vehicles. Bottle size and installed attachment mass follow the selected liquid inventory.'),
 engine:ref('ArianeGroup','S400-15 apogee motor','https://www.space-propulsion.com/spacecraft-propulsion/apogee-motors/',flight,'400 N-class storable engine family. S400-15 reference is 425 N and 321 s. The simulation uses its entered delivered thrust and impulse.',4.3,'one engine including its bipropellant valve'),
 apollo:ref('Aerojet / NASA','Apollo AJ10-137 Service Propulsion System','https://ntrs.nasa.gov/api/citations/19740005081/downloads/19740005081.pdf',flight,'Apollo provides Aerozine-50/NTO chemistry and pressure-feed heritage. Its engine differs substantially in thrust and size from the study heads.'),
 feed:ref('Moog','Helium regulator and bipropellant isolation components','https://www.moog.com/products/propulsion/space-propulsion/spacecraft-propulsion/propulsion-components.html',product,'Separate helium branches, check valves, liquid isolation, service valves, manifolds and tubing form one installed feed assembly.'),
 skin:ref('Beyond Gravity','Satellite primary structures and panels','https://www.beyondgravity.com/en/satellites/mechanical-solutions/satellite-structures',product,'Supplier fabricates satellite structures and panels. Wall gauge, reinforcements and internal load path are specific to the study.'),
 mli:ref('Beyond Gravity','Mission-specific multilayer insulation','https://www.beyondgravity.com/en/satellites/thermal-control-solutions/satellite-insulation',flight,'Manufacturer reports insulation delivered for over 800 satellites. Installed blanket mass depends on the actual coverage and cutouts.'),
 shield:ref('Lockheed Martin / NASA JPL','Juno electronics radiation vault','https://www.jpl.nasa.gov/news/press_kits/juno/spacecraft/',flight,'Juno flew a titanium enclosure around sensitive electronics. Its Jovian dose and shielding thickness differ from this LEO area allocation.'),
 harness:ref('Glenair','GS22759 / GS27500 harness families','https://www.glenair.com/complex-cables-integrated-and-flex-assemblies/',product,'Supplier cable families and integrated harnesses. The study allocates the complete installed power/data harness.'),
 adapter:ref('Beyond Gravity','Payload adapters and separation systems','https://www.beyondgravity.com/en/launchers/separation-systems',flight,'Supplier reports over 1,200 in-orbit separations. Selected launcher interface and adapter mass are study inputs.'),
};
const subs=['Compute & storage','Electrical power','Thermal control','Attitude control','Communications','Chemical propulsion','Structure & integration','Spacecraft avionics','Launch interface'];
export function buildEquipmentList(h,s=null) {
 const d=h.input,ledger=Object.fromEntries(h.massLedger.map(item=>[item.id,item])),rows=[];
 const masses=Object.fromEntries(equipmentAllocations(h).map(r=>[r.wbs,r.kg]));
 const launch=Object.fromEntries(componentMassProperties(h,h.propellantKg,0,true).rows.map(r=>[r.wbs,r]));
 const add=(wbs,id,item,quantity,unit,basis,source,other=[])=>{
  const extendedMassKg=masses[wbs];
  const parent=wbs.split('.')[0],subsystem=subs[Number(parent)-1];
  const row={wbs,parent,subsystem,item,ledgerId:id,classification:ledger[id].group,quantity,unit,unitMassKg:extendedMassKg/quantity,extendedMassKg,massBasis:basis,...source,otherSources:other,tags:[subsystem,ledger[id].group,source.evidence],bodyCentroidM:launch[wbs].centroidM,launchStationsM:launch[wbs].stationsM};
  Object.assign(row,equipmentResources(row,h,s));rows.push(row);
 };
 const gpu=d.compute==='dgx'?src.dgx:d.compute==='trillium'?src.tpu:src.gpu;
 add('01.01','compute','Accelerator boards and cold plates',h.trays,'tray','65% of installed tray mass. Includes '+h.chips+' accelerator packages and their thermal interfaces.',gpu,[src.orbitGpu,src.cold]);
 add('01.02','host','Host electronics, memory and tray carrier',h.trays,'tray','Remaining 35% of installed tray mass. Parts integrated in a purchased reference server count once.',d.compute==='dgx'?src.dgx:src.host);
 add('01.03','storage','Solid-state storage modules',Math.ceil(d.storageTB/d.diskModuleTB),'drive','Rounded-up installed drive count × packaged module mass.',d.storage==='rugged'?src.rugged:src.ssd,d.storage==='rugged'?[src.ssdf]:[src.ssdf,src.ssdPower]);
 add('01.04','switch','Payload network fabric and host interfaces',1,'set','Mass budget for switches and avionics less the 20 kg fixed avionics and power-electronics allowance.',src.fabric);
 add('02.01','array','Solar wings with cells and substrates',4,'wing','Installed cell area × array areal mass, apportioned evenly to four wings.',d.pv==='silicon'?src.silicon:src.pv);
 add('02.02','battery','Battery enclosures, cells and BMS',4,'pack','Installed Wh ÷ pack-level Wh/kg, divided among four packs.',src.battery);
 add('02.03','switch','Power conditioning and distribution',1,'assembly','Study allocation of 8 kg from the fixed avionics/electronics allowance.',src.power);
 add('03.01','radiator','Radiator panels and surface finish',2,'bank','Two equal banks. Total planform × radiator areal mass includes the selected optical finish.',src.radiator,[d.coating==='paint'?src.paint:src.osr]);
 add('03.02','coolant','Coolant, pump and distribution lines',1,'loop','10 kg base plus 1.25 kg/kW of installed electronics. Fluids are included in the dry hardware convention.',src.coolant);
 add('03.03','blanket','Tailored exterior MLI covers',1,'set','Covered wall area × installed MLI areal mass, including openings.',src.mli);
 add('04.01','cmg','Pyramid-mounted CMGs and drive electronics',4,'CMG',"Cluster mass follows the selected gyro package and usable directional capacity at the entered momentum and torque. Four gyroscopes share the pointing load.",h.cmg?ref('Airbus Defence and Space',h.cmg.model,h.cmg.referenceUrl,'Supplier reference','The selected cluster is sized against angular momentum and torque. Data-sheet values describe the reference mechanism.',h.cmg.referenceUnitKg,'one reference unit including allocated electronics'):src.cmg);
 add('04.02','cmg','Magnetic unload rods and drive stages',3,'axis','0.0015 kg per A·m² of entered magnetic dipole, distributed over the three-axis assembly.',src.rod);
 add('04.03','cmg','Attitude sensors and electronics',1,'suite','Fixed 6 kg sensor share of the attitude allocation.',src.tracker);
 add('05.01','terminals','S-band patches and tracking, telemetry and command radio',1,'set','2 kg study allocation includes two side-facing patch locations and tracking, telemetry and command electronics.',src.sb);
 add('05.02','terminals','Ka-band reflector, positioner and RF chain',1,'terminal','10 kg base plus 10 kg/m² × reflector diameter squared.',src.ka);
 add('05.03','terminals','Optical terminal and fine pointing assembly',1,'terminal','7 kg base plus 250 kg/m² × optical aperture diameter squared.',src.optical);
 const prop=h.propulsion;
 const headNote=d.engine==='aero'?'Aerozine engine adaptation uses the 400 N-class mass relation.':prop.engineRangeOK?'Each selected head is inside the reference thrust and mixture envelope.':'Selected thrust or mixture falls outside the S400 family envelope.';
 add('06.01','engine','Aft engine heads and bipropellant valves',2,'engine','Two heads scale from 4.30 kg each at 425 N with thrust exponent 0.65. '+headNote,d.engine==='aero'?src.apollo:src.engine,d.engine==='aero'?[src.engine]:[]);
 add('06.02','engine','Pressurization and liquid feed assembly',1,'assembly','7.5 kg base + 0.016 kg per N of installed thrust for the regulator, isolation/check/service valves, manifolds, sensors and lines.',src.feed,[src.apollo]);
 add('06.03','tanks','Fuel vessel, PMD and mounts',1,'vessel','Internal '+mass(prop.tanks[0].volumeL)+' L PMD vessel. Dry tankage budget shared by pressure × volume across the three vessels.',src.tank);
 add('06.04','tanks','Oxidizer vessel, PMD and mounts',1,'vessel','Internal '+mass(prop.tanks[1].volumeL)+' L PMD vessel. Dry tankage budget shared by pressure × volume across the three vessels.',src.ox);
 add('06.05','tanks','Helium pressure bottle and mounts',1,'vessel','Internal '+mass(prop.heliumL)+' L bottle. Dry tankage budget shared by pressure × volume across the three vessels.',src.helium);
 const charge=d.engine==='aero'?src.apollo:src.engine;
 add('06.06','fuel',d.engine==='aero'?'Aerozine-50 fuel at loading':'MMH fuel at loading',1,'charge','Loaded liquid mass divided by one plus the oxidizer-to-fuel ratio. Includes reserved and residual stock.',charge);
 add('06.07','oxidizer',d.engine==='aero'?'NTO oxidizer at loading':'MON-3 oxidizer at loading',1,'charge','Loaded liquid mass less the fuel charge.',charge);
 add('06.08','pressurant','Helium charge at loading',1,'charge','Initial regulated-system gas inventory from propulsion sizing. Vessel shell counted separately.',src.helium);
 add('07.01','structure','Primary frame and tray mounts',1,'frame','Study subtotal for four axial longerons, transverse frames, launch restraint fittings, installed tray mounts and the retained aft interface. The six sandwich walls have their own mass row.',src.skin);
 add('07.02','skin','Sandwich enclosure walls',1,'set','Six unequal faces. Sum of individual structural wall masses after occupied cutouts.',src.skin);
 add('07.03','shield','Internal radiation shielding',1,'set','Net covered wall area × shielding areal mass.',src.shield);
 add('07.04','hinges','Wing and radiator deployment and tracking drives',1,'set','Four wing drives and two radiator assemblies share the area-scaled mechanism mass estimate. Each bank has a root cant drive, a latching outer hinge and a bounded span-axis trim drive with a rotary fluid interface. Installed mass and drive power are study allocations.',src.drive,[src.radiatorRotary]);
 add('07.05','cables','Power and data harness',1,'set','Study harness mass varies with enclosure surface and electronics power.',src.harness);
 add('08.01','switch','Command and data handling avionics',1,'suite','12 kg of the 20 kg fixed avionics/electronics allowance. Customer compute is in the payload group.',src.iau,[src.avionics]);
 add('09.01','adapter','Launch adapter and separation interface',1,'assembly','Active lower clamp, stand-off and launcher transition. Counted once in the launch stack. The passive upper fitting stays with the spacecraft under WBS 07.01.',src.adapter);

 const sum=(items)=>items.reduce((v,r)=>v+r.extendedMassKg,0);
 const hardwareKg=sum(rows.filter(r=>r.classification==='Hardware')),dryKg=hardwareKg+ledger.margin.kg,
  wetKg=dryKg+sum(rows.filter(r=>r.classification==='Consumables')),launchKg=wetKg+ledger.adapter.kg;
 return {schema:'orbital-data-center/mel/2',massUnit:'kg',massEpoch:'launch loading',purpose:d.aiPurpose,engine:d.engine,technology:{compute:d.compute,storage:d.storage,battery:d.battery,solar:d.pv,coating:d.coating,launcher:d.launcher},
  totals:{hardwareKg,growthKg:ledger.margin.kg,dryKg,wetKg,launchKg,closureKg:launchKg-h.launchKg},
  subsystems:subs.map((name,i)=>({wbs:String(i+1).padStart(2,'0'),name,extendedMassKg:sum(rows.filter(r=>r.subsystem===name))})),rows};
}

const quantityColumns=['wbs','parent','subsystem','item','ledgerId','classification','quantity','unit','unitMassKg','extendedMassKg','referenceUnitMassKg','referenceMassBoundary'];
const physicalColumns=['powerMode','operatingPowerW','unitOperatingPowerW','instantPowerW','dimensionsM','dimensionScope','bodyCentroidM','comparisonPowerW','comparisonDimensionsM','comparisonBoundary'];
const allColumns=[...quantityColumns,...physicalColumns,'powerBasis','powerSourceUrl','dimensionBasis','dimensionSourceUrl','massBasis','manufacturer','referenceModel','sourceUrl','evidence','heritage','otherSources','tags'];
function csv(rows,columns) {
 const quote=value=>'"'+String(Array.isArray(value)?JSON.stringify(value):value??'').replaceAll('"','""')+'"';
 return [columns.join(','),...rows.map(row=>columns.map(key=>quote(row[key])).join(','))].join('\r\n')+'\r\n';
}
// PDR receives the engineering fields; the full register carries the evidence as well.
export const equipmentMassCsv=rows=>csv(rows,[...quantityColumns,...physicalColumns,'massBasis','powerBasis','powerSourceUrl','dimensionBasis','dimensionSourceUrl','sourceUrl']);
export const equipmentCsv=rows=>csv(rows,allColumns);
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const mass=value=>value.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:value!==0&&Math.abs(value)<1?4:2});
const option=(value,text)=>'<option value="'+esc(value)+'">'+esc(text)+'</option>';
const link=(r)=>'<a href="'+esc(r.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(r.referenceModel)+' ↗</a>';
const evidenceBadge=r=>'<span class="mel-badge" data-tone="'+(r.evidence===flight?'flight':r.evidence===ground?'ground':'ref')+'">'+esc(r.evidence)+'</span>';
export function filterEquipmentRows(rows,{query='',subsystem='',evidence=''}={}) {
 const tokens=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 return rows.filter(r=>{
  if((subsystem&&subsystem!==r.subsystem)||(evidence&&evidence!==r.evidence))return false;
  const haystack=[r.wbs,r.item,r.subsystem,r.ledgerId,r.manufacturer,r.referenceModel,r.massBasis,r.heritage,...r.tags,...r.otherSources.flatMap(x=>[x.manufacturer,x.referenceModel,x.heritage])].join(' ').toLocaleLowerCase();
  return tokens.every(t=>haystack.includes(t));
 });
}
function registerTable(rows,lens){
 if(!rows.length)return '<div class="mel-none">No equipment matches these filters.</div>';
 const trace=lens==='heritage',power=lens==='power',dims=lens==='dimensions';
 const headings=power?['WBS / equipment','Design mode','Unit / total power','Supplied at instant','Power basis and references']:dims?['WBS / equipment','Dimension boundary','Envelope in metres','Launch centroid X / Y / Z','Dimension basis and references']:trace?['WBS / equipment','Benchmark and source','Reference evidence','Published mass']:['WBS / equipment','Qty','Unit kg','Total kg','Basis and reference'];
 let prior='',body='';
 for(const r of rows){
  if(r.parent!==prior){prior=r.parent;
   const subtotal=rows.filter(v=>v.parent===prior).reduce((s,v)=>s+v.extendedMassKg,0);
   body+='<tr class="mel-group"><th colspan="'+headings.length+'" scope="rowgroup"><span>'+esc(prior)+'</span> '+esc(r.subsystem)+'<small>'+mass(subtotal)+' kg</small></th></tr>';
  }
  const name='<th scope="row"><span class="mel-number">'+r.wbs+'</span><b>'+esc(r.item)+'</b><small>'+esc(r.classification)+'</small></th>';
  const basisRef=(note,url,title)=>'<p>'+esc(note)+'</p><a href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(title)+' ↗</a>';
  const metric=n=>Number.isFinite(n)?mass(n)+' W':'Unallocated';
  if(power)body+='<tr>'+name+'<td>'+esc(r.powerMode)+'</td><td>'+metric(r.unitOperatingPowerW)+' / '+metric(r.operatingPowerW)+'</td><td>'+(r.instantPowerW==null?'—':metric(r.instantPowerW))+'</td><td>'+basisRef(r.powerBasis,r.powerSourceUrl,r.powerSourceName)+(r.comparisonPowerW!=null?'<p>Reference '+metric(r.comparisonPowerW)+' · '+esc(r.comparisonBoundary)+'</p>':'')+link(r)+(r.wbs==='01.03'&&r.comparisonPowerW!=null?' · '+link(src.ssdPower):'')+'</td></tr>';
  else if(dims)body+='<tr>'+name+'<td>'+esc(r.dimensionScope)+'</td><td class="mel-value">'+r.dimensionsM.map(mass).join(' × ')+'</td><td>'+r.bodyCentroidM.map(mass).join(' / ')+'</td><td>'+basisRef(r.dimensionBasis,r.dimensionSourceUrl,r.dimensionSourceName)+(r.comparisonDimensionsM?'<p>Reference '+r.comparisonDimensionsM.map(mass).join(' × ')+' m · '+esc(r.comparisonBoundary)+'</p>':'')+link(r)+'</td></tr>';
  else if(trace)body+='<tr>'+name+'<td><strong>'+esc(r.manufacturer)+'</strong>'+link(r)+r.otherSources.map(o=>'<small class="mel-additional">'+esc(o.manufacturer)+' · '+link(o)+'<br>'+esc(o.heritage)+'</small>').join('')+'</td><td>'+evidenceBadge(r)+'<p>'+esc(r.heritage)+'</p></td><td class="mel-comparison">'+(r.referenceUnitMassKg==null?'—':'<b>'+mass(r.referenceUnitMassKg)+' kg</b><small>'+esc(r.referenceMassBoundary)+'</small>')+'</td></tr>';
  else body+='<tr>'+name+'<td class="mel-qty">'+mass(r.quantity)+'<small>'+esc(r.unit)+'</small></td><td class="mel-value">'+mass(r.unitMassKg)+'</td><td class="mel-value mel-extended">'+mass(r.extendedMassKg)+'</td><td><p>'+esc(r.massBasis)+'</p>'+link(r)+'</td></tr>';
 }
 return '<table class="mel-table"><caption class="mel-sr">'+(headings[1]+' and equipment basis')+'</caption><thead><tr>'+headings.map(h=>'<th scope="col">'+h+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table>';
}
export function renderEquipmentList(h,s=null){
 const list=buildEquipmentList(h,s),t=list.totals;
 const cards=[['Equipment',t.hardwareKg,'Dry hardware before growth'],['Dry spacecraft',t.dryKg,'Hardware plus '+mass(t.growthKg)+' kg growth'],['Wet spacecraft',t.wetKg,'Dry vehicle, liquids and helium'],['Launched mass',t.launchKg,'Wet vehicle plus adapter']];
 return '<section class="mel" data-mel><header class="mel-header"><div><div class="mel-eyebrow">Engineering reference / mass properties</div><h2>Master equipment list</h2><p>Inspect the installed mass, electrical loads, physical envelopes and supplier references for this build.</p></div><div class="mel-files"><a data-file="csv" class="btn" download="spacecraft-equipment-list.csv" title="Download every equipment row with mass basis, tags and sources">Full CSV ↓</a><a data-file="json" class="btn" download="spacecraft-equipment-list.json" title="Download the structured hierarchy and totals for this design">Full JSON ↓</a></div></header>'
 +'<div class="mel-cards">'+cards.map(([title,value,note])=>'<div><small>'+title+'</small><strong>'+mass(value)+' <em>kg</em></strong><span>'+note+'</span></div>').join('')+'</div>'
 +'<div class="mel-controls"><div role="group" aria-label="Equipment list view" class="mel-views"><button type="button" data-lens="mass" aria-pressed="true">Mass register</button><button type="button" data-lens="power" aria-pressed="false">Electrical loads</button><button type="button" data-lens="dimensions" aria-pressed="false">Dimensions</button><button type="button" data-lens="heritage" aria-pressed="false">Heritage &amp; sources</button></div>'
 +'<label>Find equipment<input data-mel-search type="search" placeholder="Component, part number, supplier…" autocomplete="off"></label>'
 +'<label>Subsystem<select data-mel-sub>'+option('','All subsystems')+subs.map(s=>option(s,s)).join('')+'</select></label>'
 +'<label>Reference evidence<select data-mel-evidence>'+option('','All references')+[flight,product,ground].map(s=>option(s,s)).join('')+'</select></label></div>'
 +'<div class="mel-caption"><span data-mel-status role="status">'+list.rows.length+' rows · '+mass(t.launchKg-t.growthKg)+' kg shown</span><button type="button" data-mel-clear hidden>Clear filters</button></div>'
 +'<div class="mel-scroll" role="region" tabindex="0" aria-label="Equipment table">'+registerTable(list.rows,'mass')+'</div>'
 +'<footer><a href="https://www.nasa.gov/centers-and-facilities/glenn/compass-lab/" target="_blank" rel="noopener">NASA Compass study products ↗</a> · <a href="https://ntrs.nasa.gov/api/citations/20200013062/downloads/TP-2020-220152.pdf" target="_blank" rel="noopener">Example master and power equipment lists, §§3.1.1–3.1.3 ↗</a><br>Design powers describe individual operating modes. Select Electrical loads for simultaneous values at the mission instant. Masses use the installed design at launch loading. Unit kg is the average for each listed quantity. A published mass describes the cited article and its stated boundary. Flight history and supplier TRL apply to that reference article only.</footer></section>';
}
export function bindEquipmentList(container,h,s=null){
 const el=container?.matches?.('[data-mel]')?container:container?.querySelector?.('[data-mel]');
 if(!el||el.dataset.melBound)return;
 el.dataset.melBound='1';
 const list=buildEquipmentList(h,s),find=sel=>el.querySelector(sel),search=find('[data-mel-search]'),sub=find('[data-mel-sub]'),evidence=find('[data-mel-evidence]'),clear=find('[data-mel-clear]');
 let lens='mass';
 for(const [ext,type,content] of [['csv','text/csv;charset=utf-8',equipmentCsv(list.rows)],['json','application/json',JSON.stringify(list,null,2)]]){
  const name='spacecraft-equipment-list.'+ext;
  find('[data-file="'+ext+'"]').href=retainFile('equipment-list-'+ext,new Blob([content],{type}),name).url;
 }
 const refresh=()=>{
  const rows=filterEquipmentRows(list.rows,{query:search.value,subsystem:sub.value,evidence:evidence.value});
  const count=rows.length,total=rows.reduce((a,r)=>a+r.extendedMassKg,0);
  find('[data-mel-status]').textContent=count+' of '+list.rows.length+' rows · '+mass(total)+' kg shown';
  find('.mel-scroll').innerHTML=registerTable(rows,lens);clear.hidden=!search.value&&!sub.value&&!evidence.value;
 };
 search.addEventListener('input',refresh);sub.addEventListener('change',refresh);evidence.addEventListener('change',refresh);
 clear.addEventListener('click',()=>{search.value='';sub.value='';evidence.value='';refresh();search.focus()});
 el.querySelectorAll('[data-lens]').forEach(btn=>btn.addEventListener('click',()=>{
  lens=btn.dataset.lens;el.querySelectorAll('[data-lens]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));refresh();
 }));
}
