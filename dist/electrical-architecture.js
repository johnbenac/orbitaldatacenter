// Controlled preliminary electrical interfaces. This register owns endpoints,
// proposed wiring and procurement definitions; it does not claim vendor flight
// qualification or add a second set of masses to the spacecraft ledger.
import {architectureFamily,architectureTerminalStations} from './architecture-families.js';
import {deploymentLayout,leafPose,leafAxes,mechanismPose,terminalStations as legacyTerminalStations} from './deployment.js';
import {roundedConnectionRoute,routeLength} from './connection-routes.js';
import {fixedCollectorBodyKeepouts} from './fixed-collector-layout.js';
import {accommodateFabricRows,accommodateRackServiceControls,redwirePayloadServiceFace,redwirePayloadServicePlate,redwirePayloadInterfacePolicy} from './fabric-equipment-layout.js';
import {carriedCollectorPackingLimits,accommodateCarriedSolarCollectors} from './carried-solar-collector.js';
import {adoptRedwireHarnessMass,harnessDesignInputs,retainedHarnessTakeoff,rememberHarnessTakeoff} from './installed-harness-mass.js';
import {redwirePayloadTransferPolicy,redwirePayloadTransferAllocation,redwireOpticalLinkBudget} from './redwire-payload-transfer.js';
import {redwireHarnessInstallationHardware,redwirePlatformHarnessLocalRoute} from './redwire-harness-installation.js';

export const electricalArchitectureRevision='electrical-interfaces-2026-11-r4-redwire-mounted-transfer';
export const electricalSources=Object.freeze({
 'el-project':{id:'el-project',title:'ODC preliminary electrical interface register',url:null,kind:'project-allocation',section:electricalArchitectureRevision,description:'Controlled project allocations and proposed build definitions; supplier and as-built acceptance remain separate.'},
 'el-nasa-avionics':{id:'el-nasa-avionics',title:'NASA Small Spacecraft Technology — Avionics',url:'https://www.nasa.gov/smallsat-institute/sst-soa/small-spacecraft-avionics/',kind:'reference',section:'Command and data handling; avionics architectures'},
 'el-nasa-workmanship':{id:'el-nasa-workmanship',title:'NASA-STD-8739.4 A Change 4 — Cable and harness workmanship',url:'https://standards.nasa.gov/sites/default/files/standards/NASA/A/4/nasa-std-87394a_w_change_4_0.pdf',kind:'standard',section:'Connector selection, routing, shields, workmanship and verification; §7.2.6 high voltage'},
 'el-gevs':{id:'el-gevs',title:'GSFC-STD-7000B — GEVS',url:'https://standards.nasa.gov/standard/gsfc/gsfc-std-7000',kind:'standard',section:'Electrical functional checks; EMC and environmental verification'},
 'el-nasa-perseverance':{id:'el-nasa-perseverance',title:'NASA Perseverance rover components — computing',url:'https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/',kind:'flight-reference',section:'RAD750 up to200 MHz,256 MB DRAM and 2 GB flash are architecture precedents, not an ODC selection'},
 'el-bae-rad750':{id:'el-bae-rad750',title:'BAE RAD7503U CompactPCI datasheet2025',url:'https://www.baesystems.com/en-us/dam/jcr%3Ae2c04c2e-8dea-425c-8460-96a509a95111/16-f76-RAD750-3U-CompactPCI-datasheet-2025-web.2025-06-25-21-58-21.pdf',kind:'supplier-reference',section:'200 MHz processor,1 GB EDAC SDRAM and PCI2.2 on current3U reference board'},
 'el-moog-iau':{id:'el-moog-iau',title:'Moog Integrated Avionics Unit',url:'https://www.moog.com/content/dam/moog/literature/sdg/space/avionics/moog-integrated-avionics-unit-datasheet.pdf',kind:'supplier-reference',section:'Reference avionics packaging and interfaces; ODC cards are an allocated implementation'},
 'el-powertrip':{id:'el-powertrip',title:'Glenair 970 PowerTrip product specification',url:'https://www.glenair.com/powertrip/pdf/product-specification.pdf',kind:'supplier-reference',section:'Copper-contact current ratings; insert arrangements; electrical test ratings'},
 'el-powertrip-space':{id:'el-powertrip-space',title:'Glenair PowerTrip connectors for space flight',url:'https://www.glenair.com/powertrip/pdf/powertrip-connectors-for-space-flight.pdf',kind:'supplier-reference',section:'Material, finish, screening and bakeout options'},
 'el-wire':{id:'el-wire',title:'Glenair integrated cable and flex assemblies',url:'https://www.glenair.com/complex-cables-integrated-and-flex-assemblies/',kind:'supplier-reference',section:'GS22759 / GS27500 cable construction and built harness capability'},
 'el-spacewire':{id:'el-spacewire',title:'ECSS-E-ST-50-12C Rev.1 — SpaceWire',url:'https://ecss.nl/wp-content/uploads/2019/05/ECSS-E-ST-50-12C-Rev.1%2815May2019%29.pdf',kind:'standard',section:'2019 Type A cable/connector, LVDS signal pairs and crossover wiring'},
 'el-spacewire-connector':{id:'el-spacewire-connector',title:'Omnetics SpaceWire cable and Micro-D interfaces',url:'https://www.omnetics.com/wp-content/uploads/2025/07/Spacewire.pdf',kind:'supplier-reference',section:'Type A preferred for new designs; pin 3 unpopulated; shield termination at shells'},
 'el-fabric':{id:'el-fabric',title:'NVIDIA QM97xx hardware specifications',url:'https://networking-docs.nvidia.com/qm97x0hw/specifications',kind:'supplier-reference',section:'Network-fabric reference only; the installed line-card implementation is project allocated'},
 'el-fiber':{id:'el-fiber',title:'Corning AEN151 — 100GBASE-SR4 cabling',url:'https://www.corning.com/content/dam/corning/catalog/coc/documents/application-engineering-notes/AEN151.pdf',kind:'supplier-reference',section:'OM4 MTP Type B assemblies for SR4, including J757512QEZ-NB003M 3 m reference'},
 'el-optical-100':{id:'el-optical-100',title:'NVIDIA MMA1B00-C100D 100GbE SR4 QSFP28',url:'https://networking-docs.nvidia.com/mma1b00c100dspec',kind:'supplier-reference',section:'MPO12 UPC, 100GbE, four 25G lanes, 3.3 V, 2.5 W maximum; terrestrial reference'},
 'el-optical-400':{id:'el-optical-400',title:'NVIDIA MFP7E10-Nxxx 400G optical cable',url:'https://docs.nvidia.com/nvidia-mfp7e10-nxxx-optical-multimode-fiber-cable-product-specifications.pdf',kind:'supplier-reference',section:'MPO12 APC, Type B multimode, 400G per branch, 30 mm bend radius; terrestrial reference'},
 'el-optical-lr4':{id:'el-optical-lr4',title:'NVIDIA MMA1L10-CR 100GbE QSFP28 LR4',url:'https://networking-docs.nvidia.com/mma1l10crspec/specifications',kind:'supplier-reference',section:'100GbE LR4 over duplex LC/UPC single-mode fiber; 3.5 W maximum revision A2 onward. Terrestrial reference; spacecraft adaptation is not qualified.'},
 'el-optical-lr4-budget':{id:'el-optical-lr4-budget',title:'TIA FOTC — 100GBASE-LR4 channel characteristics',url:'https://www.tiafotc.org/ieee-802-3-ethernet-standards-update/singlemode-standards-update/100gbase-lr4/',kind:'standards-reference',section:'6.3 dB complete-channel insertion loss at 1310 nm; duplex OS2 fiber maximum attenuation 0.4 dB/km.'},
 'el-fiber-sm':{id:'el-fiber-sm',title:'Corning 040402G5120003M duplex LC/UPC OS2 jumper',url:'https://ecatalog.corning.com/optical-communications/US/en/generate-product-specsheet/040402G5120003M.pdf',kind:'supplier-reference',section:'Two single-mode fibers, duplex LC/UPC, 2 mm zipcord legs and 4 mm nominal overall envelope. The installed 4 mm envelope, 60 mm bend radius and 20 g/m mass are conservative project cable allocations; spacecraft jacket and route-compatible length require supplier approval.'},
 'el-hybrid-rotary':{id:'el-hybrid-rotary',title:'Moog hybrid fiber-optic rotary joints',url:'https://www.moog.com/products/fiber-optic-rotary-joints/hybrid-forj.html',kind:'supplier-capability-reference',section:'Models 173/176 capability class: up to 52 SM/MM optical channels, 720 A total electrical capability. Maximums are not necessarily simultaneous; ODC assigns a custom flight package and requirements.'},
 'el-hybrid-path':{id:'el-hybrid-path',title:'Moog Model 173 electrical passes',url:'https://www.moog.com/products/fluid-rotary-union/marine-fluid-rotary-unions/model-173.html',kind:'supplier-capability-reference',section:'20 A electrical pass capability class. ODC allocates 15 A per path, four parallel paths per supply and return conductor, with project resistance/life/environment requirements.'},
 'el-service-connector':{id:'el-service-connector',title:'Glenair SuperNine 233-205',url:'https://www.glenair.com/supernine/environmental/pdf/233-205.pdf',kind:'supplier-reference',section:'G6 plug and 00 wall receptacle, ME finish, keying and contact options'},
 'el-service-insert':{id:'el-service-insert',title:'Glenair MIL-STD-1560 contact arrangements',url:'https://www.glenair.com/supernine/reference/pdf/mil-std-1560-and-other-standard-contact-arrangements.pdf',kind:'supplier-reference',section:'11-2, two #16 contacts, 13 A maximum; AWG 16–20 accommodation'},
 'el-hv-connector':{id:'el-hv-connector',title:'Glenair PowerPlay 973-001 G6',url:'https://www.glenair.com/powerplay/supernine/series-iii/pdf/973-001-g6-plug.pdf',kind:'supplier-reference',section:'17-1 single 1/0 contact, ME finish, complementary contacts and keying; published DWV is not a working rating'},
 'el-hv-receptacle':{id:'el-hv-receptacle',title:'Glenair PowerPlay 973-001 panel receptacle',url:'https://www.glenair.com/powerplay/supernine/series-iii/pdf/973-001-00-d0-cs-panel-mount-receptacles.pdf',kind:'supplier-reference',section:'Mating 00 panel receptacle family'},
 'el-hv-wire':{id:'el-hv-wire',title:'Glenair wire and cable',url:'https://www.glenair.com/wire-and-cable/',kind:'supplier-reference',section:'967-048 PFA / nickel-copper and 967-028 XL-ETFE 1000 V constructions; actual gauge/jacket order subject to supplier confirmation'},
 'el-rf':{id:'el-rf',title:'Amphenol RF 132100 SMA cable plug',url:'https://www.amphenolrf.com/en-us/part/132100/705/',kind:'supplier-reference',section:'50 Ω,18 GHz,compatible with TFlex402 / RG402; terrestrial catalog connector'},
 'el-rf-jack':{id:'el-rf-jack',title:'Amphenol RF 132106 SMA bulkhead jack',url:'https://www.amphenolrf.com/en-us/part/132106/679/',kind:'supplier-reference',section:'50 Ω,18 GHz matched cable/connector family;3.40g supplier mass'},
 'el-rf-cable':{id:'el-rf-cable',title:'Times Microwave TFlex402',url:'https://timesmicrowave.com/wp-content/uploads/2024/04/tflex-brochure-web.pdf',kind:'supplier-reference',section:'4.19 mm max OD,0.0491 kg/m,12.7 mm minimum bend; conservative−55…125 °C assembly envelope pending product-page/brochure clarification'},
 'el-verification':{id:'el-verification',title:'NASA Systems Engineering Handbook — Product Verification',url:'https://www.nasa.gov/reference/5-3-product-verification/',kind:'reference',section:'Analysis, test, inspection and demonstration; configuration and evidence'},
 'el-gold':{id:'el-gold',title:'GSFC-STD-1000 — Rules for the Design, Development, Verification, and Operation of Flight Systems',url:'https://standards.nasa.gov/standard/gsfc/gsfc-std-1000',kind:'standard',section:'Electrical interfaces, grounding, end-to-end verification and software resources'}
});

const finite=Number.isFinite,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),sum=a=>a.reduce((x,y)=>x+y,0);
const add=(a,b)=>a.map((x,i)=>x+b[i]),scale=(a,s)=>a.map(x=>x*s),distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const v3=p=>Array.isArray(p)&&p.length===3&&p.every(finite)?[...p]:[0,0,0];
const center=p=>Array.isArray(p?.[0])?p.reduce((a,q)=>add(a,scale(q,1/p.length)),[0,0,0]):v3(p);
const canonical=v=>v===null?'null':typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
export function electricalFingerprint(value){let n=2166136261;for(const c of canonical(value)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return (n>>>0).toString(16).padStart(8,'0');}
export const electricalKinds=Object.freeze({
 power:{label:'Power',color:'#edb55c',pattern:'solid',description:'Directional energy transfer; paired supply and dedicated current return.'},
 control:{label:'Commands & housekeeping',color:'#75c8cb',pattern:'short-dash',description:'Bidirectional spacecraft control, time and engineering telemetry.'},
 data:{label:'Payload data',color:'#b39be7',pattern:'packet',description:'Customer input, workload exchange, storage and returned products.'},
 rf:{label:'RF coax',color:'#8aadd5',pattern:'long-dash',description:'RF path to the antenna; cable impedance and shield are part of the interface.'},
 fluid:{label:'Fluid',color:'#7ebc94',pattern:'paired',description:'Supply and return fluid paths; fittings and fluid compatibility are reviewed separately.'}
});

// Real families and published contact currents are separated from the project
// design envelope. DWV is a proof-test level, never a working-voltage rating.
export const connectorSelections=Object.freeze({
 'power-18-2':{id:'power-18-2',label:'Glenair 970 PowerTrip · 18-2',manufacturer:'Glenair',family:'970 PowerTrip',arrangement:'18-2 · two #8 copper contacts',contacts:2,populated:2,acceptedWireAWG:['8'],supplierContactCurrentA:60,allocatedCurrentA:30,projectMaxV:300,workingVoltageSupplierV:null,contactResistanceBudgetOhm:.003,diameterM:.041,lengthM:.055,estimatedPairKg:.16,materialId:'aluminum-structure',sourceIds:['el-powertrip','el-powertrip-space'],procurement:'970 matched plug/panel receptacle, 18-2 insert, #8 copper contacts and AWG 8 wire, ME finish and complementary P2/S2 contacts. Final key, backshell and screening are on the approved order specification.',qualification:'Supplier 60 A contact maximum; project 30 A allocation. Wire current density can impose a lower limit. No working-voltage or space qualification is inferred from the DWV test.'},
 'power-24-2':{id:'power-24-2',label:'Glenair 970 PowerTrip · 24-2',manufacturer:'Glenair',family:'970 PowerTrip',arrangement:'24-2 · two #4 copper contacts',contacts:2,populated:2,acceptedWireAWG:['4'],supplierContactCurrentA:100,allocatedCurrentA:50,projectMaxV:300,workingVoltageSupplierV:null,contactResistanceBudgetOhm:.002,diameterM:.054,lengthM:.065,estimatedPairKg:.23,materialId:'aluminum-structure',sourceIds:['el-powertrip','el-powertrip-space'],procurement:'970 plug and panel receptacle, insert 24-2, complementary pin/socket contacts, ME finish with gold-plated copper contacts; keyed and serialized to the interface schedule. Order suffixes and selected-lot screening require supplier quotation.',qualification:'Current rating is supplier data; 50% current allocation and ≤300 V project interface are design choices. Environment-specific working-voltage, outgassing, plating and vacuum evidence remain open.'},
 'power-36-2':{id:'power-36-2',label:'Glenair 970 PowerTrip · 36-2',manufacturer:'Glenair',family:'970 PowerTrip',arrangement:'36-2 · two 2/0 copper contacts',contacts:2,populated:2,acceptedWireAWG:['2/0'],supplierContactCurrentA:205,allocatedCurrentA:102.5,projectMaxV:300,workingVoltageSupplierV:null,contactResistanceBudgetOhm:.001,diameterM:.079,lengthM:.08,estimatedPairKg:.50,materialId:'aluminum-structure',sourceIds:['el-powertrip','el-powertrip-space'],procurement:'Matched 970 plug/panel receptacle, 36-2 insert with 2/0 copper contacts; ME finish and space-screening/bakeout option to the supplier-approved order specification.',qualification:'A 100 A project primary feed uses the 205 A copper contact with a project 50% current allocation. No 400 V capability is inferred from DWV.'},
 'service-16':{id:'service-16',label:'Glenair SuperNine 233-205 · 11-2',manufacturer:'Glenair',family:'233-205 / MIL-DTL-38999 Series III',arrangement:'11-2 · two #16 contacts',contacts:2,populated:2,acceptedWireAWG:['20','18','16'],supplierContactCurrentA:13,allocatedCurrentA:6.5,projectMaxV:60,workingVoltageSupplierV:null,contactResistanceBudgetOhm:.010,diameterM:.0265,lengthM:.045,estimatedPairKg:.09,materialId:'aluminum-structure',sourceIds:['el-service-connector','el-service-insert'],procurement:'233-205-G6 cable plug and 233-205-00 wall receptacle, ME electroless nickel, 11-2 insert and complementary P/S contacts; N key for 28 V and A key for 48 V. Select AWG 16–20 contacts and compatible backshell/jacket diameter. Final suffix and screening are supplier-approved purchase items.',qualification:'13 A contact rating and AWG 16–20 acceptance are supplier data. 6.5 A contact allocation, 3 A/mm² wire screen and 22–34 V avionics envelope are project choices. Vacuum, material and environment approval remain open.'},
 'hv-single-8':{id:'hv-single-8',label:'Glenair PowerPlay 973 · 11-1 single pole',manufacturer:'Glenair',family:'973-001 PowerPlay SuperNine',arrangement:'11-1 · one #8 contact per separately keyed polarity',contacts:1,populated:1,acceptedWireAWG:['8'],acceptedWireJacketODMM:[5.31,7.04],supplierContactCurrentA:null,allocatedCurrentA:25.11,projectMaxV:1000,workingVoltageSupplierV:null,contactResistanceBudgetOhm:.003,diameterM:.0265,lengthM:.050,estimatedPairKg:.10,materialId:'aluminum-structure',sourceIds:['el-nasa-workmanship','el-hv-connector','el-hv-receptacle','el-hv-wire'],procurement:'973-001-G6 cable plug and 973-001-00 wall receptacle, ME finish,11-1 single #8 contact, complementary P/S contacts; N key positive and A key return. AWG 8 conductor with5.31–7.04 mm jacket OD. The 1000 VDC application needs written supplier approval; no DWV-to-working-voltage inference.',qualification:'Real single-contact family;25.11 A is the project 3 A/mm² limit on AWG 8, not a published PowerPlay current rating. Working voltage, material vacuum compatibility and environmental derating remain supplier application-review items.'},
 'hv-single':{id:'hv-single',label:'Glenair PowerPlay 973 · 17-1 single pole',manufacturer:'Glenair',family:'973-001 PowerPlay SuperNine',arrangement:'17-1 · one 1/0 contact per separately keyed polarity',contacts:1,populated:1,acceptedWireAWG:['1/0'],acceptedWireJacketODMM:[12.34,14.53],supplierContactCurrentA:null,allocatedCurrentA:100,projectMaxV:1000,workingVoltageSupplierV:null,contactResistanceBudgetOhm:.001,diameterM:.042,lengthM:.065,estimatedPairKg:.25,materialId:'aluminum-structure',sourceIds:['el-nasa-workmanship','el-hv-connector','el-hv-receptacle','el-hv-wire'],procurement:'973-001-G6 cable plug plus 973-001-00 wall receptacle, ME finish, 17-1 single 1/0 contact, complementary P/S, N key for positive and A key for return. Select compatible 12.34–14.53 mm jacket OD. Separate single-pole mating pairs at both ends; the 1000 VDC / 100 A application needs written supplier approval.',qualification:'Real supplier connector family and geometry; 1000 VDC / 100 A is the project application requirement, not a published PowerPlay working-voltage or contact-current rating. Sea-level DWV does not close vacuum/pressure arcing, outgassing or flight qualification.'},
 'spacewire-a':{id:'spacewire-a',label:'Omnetics Micro-D · SpaceWire Type A',manufacturer:'Omnetics',family:'SpaceWire Micro-D Type A',arrangement:'9 positions, eight signal contacts; position 3 unpopulated',contacts:9,populated:8,supplierContactCurrentA:null,allocatedCurrentA:.1,projectMaxV:5,workingVoltageSupplierV:null,contactResistanceBudgetOhm:.050,diameterM:.023,lengthM:.035,estimatedPairKg:.035,materialId:'aluminum-structure',sourceIds:['el-spacewire','el-spacewire-connector'],procurement:'Omnetics JUM metal Micro-D pin-to-pin, 08 conductors, WC wired cable, 6 = 26 AWG, X = ESCC cable, route-derived length in inches, N = electroless nickel, 08 non-removable jackscrews, A = 2019 Type A and M53 space-grade level 2. A 115042-001 is the characterized 1 m reference, not an arbitrary-length order code. Mate to socket panel connectors.',qualification:'100 Mbit/s LVDS is the ODC interface allocation within the SpaceWire design. Demonstrate eye mask, link startup and error-free traffic on the actual as-built harness.'},
 'mtp-optical':{id:'mtp-optical',label:'Corning OM4 MTP/UPC · 100G SR4',manufacturer:'Corning / NVIDIA',family:'OM4 MTP Type B / MMA1B00-C100D',arrangement:'MPO12 UPC, eight active fibers; four center positions inactive',contacts:12,populated:8,lineRateMbps:100000,fiberCount:12,ferrulePolish:'UPC',supplierContactCurrentA:0,allocatedCurrentA:0,projectMaxV:0,workingVoltageSupplierV:null,contactResistanceBudgetOhm:0,diameterM:.016,lengthM:.045,estimatedPairKg:.025,materialId:'aluminum-structure',sourceIds:['el-fiber','el-optical-100'],procurement:'Corning J757512QEZ-NB003M is the real 3 m OM4 non-pinned Type B MTP jumper reference. Procure the route-compatible vendor length and pair with NVIDIA MMA1B00-C100D QSFP28 100GbE SR4, MPO12/UPC. Length variants need a confirmed manufacturer part number; no placeholder is an orderable item.',qualification:'Authentic terrestrial cable/optics reference. 50 Gbit/s allocated demand uses a 100 Gbit/s physical link; no unsupported native 50G mode or flight qualification is claimed.'},
 'mtp-optical-400':{id:'mtp-optical-400',label:'NVIDIA MFP7E10 · MPO/APC 400G branch',manufacturer:'NVIDIA',family:'MFP7E10-Nxxx',arrangement:'MPO12 APC, Type B, eight active multimode fibers',contacts:12,populated:8,lineRateMbps:400000,fiberCount:8,ferrulePolish:'APC',supplierContactCurrentA:0,allocatedCurrentA:0,projectMaxV:0,workingVoltageSupplierV:null,contactResistanceBudgetOhm:0,diameterM:.016,lengthM:.045,estimatedPairKg:.025,materialId:'aluminum-structure',sourceIds:['el-optical-400','el-fabric'],procurement:'Select the shortest supported MFP7E10 cable length no shorter than cut length: documented examples N003/N005/N007/N010. MPO12/APC ends mate only to matching APC optics; 800G twin-port OSFP uses two 400G branches. A manufacturer-confirmed length/optic combination is required.',qualification:'400G per branch, 3±0.2 mm cable OD, 30 mm minimum bend, 0–70 °C supplier range. Terrestrial family; thermal/radiation/outgassing adaptation remains open. APC and UPC interfaces cannot be intermated.'},
 'sma-rf':{id:'sma-rf',label:'Amphenol 132100 /132106 · SMA50 Ω',manufacturer:'Amphenol RF / Times Microwave',family:'132100 plug +132106 bulkhead jack / TFlex402',arrangement:'SMA center contact and coaxial shell',contacts:2,populated:2,supplierContactCurrentA:null,allocatedCurrentA:1,projectMaxV:60,workingVoltageSupplierV:null,contactResistanceBudgetOhm:.020,diameterM:.014,lengthM:.027,estimatedPairKg:.00546,materialId:'aluminum-structure',sourceIds:['el-rf','el-rf-jack','el-rf-cable'],procurement:'Amphenol 132100 straight SMA plug and 132106 bulkhead jack,50 Ω,with compatible Times Microwave TFlex402 flexible coax. Supplier masses2.06g+3.40g. Restrict this selected assembly to GNSS/S-band; no26GHzKa capability is inferred. Retention torque and strain relief follow released drawings.',qualification:'Real active catalog parts, rated to18 GHz as connectors. No military/space qualification is claimed. Cable assembly loss, radiation, vacuum materials, solder workmanship and environmental qualification remain application-specific evidence.'},
 'lc-sm-100g-lr4':{id:'lc-sm-100g-lr4',label:'Duplex LC/UPC OS2 · 100G LR4',manufacturer:'Corning / NVIDIA capability references',family:'Duplex LC/UPC OS2 / MMA1L10-CR rev A2+',arrangement:'Two single-mode fibers; one WDM transmit and one WDM receive',contacts:2,populated:2,lineRateMbps:100000,fiberCount:2,activeFibers:2,ferrulePolish:'UPC',fiberType:'single-mode OS2',cableDiameterM:.004,minimumBendRadiusM:.060,cableMassKgPerM:.020,supplierContactCurrentA:0,allocatedCurrentA:0,projectMaxV:0,workingVoltageSupplierV:null,contactResistanceBudgetOhm:0,diameterM:.016,lengthM:.045,estimatedPairKg:.025,materialId:'aluminum-structure',sourceIds:['el-fiber-sm','el-optical-lr4','el-optical-lr4-budget'],procurement:'Duplex LC/UPC OS2 jumper compatible with G.652.D and the allocated 100GbE LR4 interface. Corning 040402G5120003M is a documented 3 m reference; order a manufacturer-confirmed route-compatible length and spacecraft-approved jacket. NVIDIA MMA1L10-CR revision A2 or later is the 3.5 W terrestrial optics reference. Complete connector shell, cable jacket, polarization, radiation and vacuum adaptation require supplier release.',qualification:'100GBASE-LR4 physical interface retains the configured worker rate and provides a 6.3 dB total-channel insertion-loss allocation. The 4 mm cable envelope, 60 mm minimum radius, 20 g/m cable and 25 g external mating-pair masses are explicit conservative project installation allowances. No supplier flight qualification is implied.'}
});

export function electricalBoxLayout(h){
 const w=h.bodyWidthM,b=h.bodyHeightM,l=h.bodyLengthM,e=h.energySystem.electrical,station=center(h.propulsion?.stations?.switch),rack=h.rackLayout,family=architectureFamily(h),terminalStations=architectureTerminalStations(h),boxes=[];
 const addBox=(id,wbs,label,positionM,dimensionsM,extra={})=>{const box={id,itemId:'flight:'+wbs,wbs,label,positionM:v3(positionM),dimensionsM:v3(dimensionsM),frame:'body',hostKey:id,geometry:'new',...extra};boxes.push(box);return box;};
 const legacy=family.id==='protected-core'&&family.kaTerminalCount===1&&family.sPatchCount===2,beam=Math.min(.17,Math.min(w,b)*.052),shown=Math.min(12,Math.max(1,Math.ceil(h.storageTB/h.input.diskModuleTB))),driveH=Math.min(.075,b*.30/shown),driveStep=Math.min(b*.145,b*.66/shown);
 if(legacy&&!terminalStations.length){const t=legacyTerminalStations(w,l,h.input);terminalStations.push({id:'ka-0',kind:'ka',positionM:[t.ka[0],b/2,t.ka[1]],normalBody:[0,1,0]},{id:'optical-0',kind:'optical',positionM:[t.optical[0],b/2,t.optical[1]],normalBody:[0,1,0]});}
 const moduleCount=e.mppt.count+e.payload.modules+e.service.modules+e.battery.modules;
 const pcduDims=[Math.min(.52,.22*w),Math.min(.55,.25*b),Math.min(.55,.24+moduleCount*.003)];
 addBox('avionics','08.01','Flight avionics & GNSS',add(station,[0,.23,0]),h.cdh?.suiteDimsM||[.30,.25,.16],{massKg:12});
 addBox('pcdu','02.03','Power conditioning & distribution',add(station,[0,-.22,0]),pcduDims,{moduleCount,voltageV:e.family.primaryV});
 const switches=h.serviceArchitecture.fabric.switchCount,switchRows=Math.ceil(Math.sqrt(switches)),switchDims=[.34,.055,.24];
 for(let i=0;i<switches;i++)addBox('fabric-'+(i+1),'01.04',(i<h.serviceArchitecture.fabric.leafCount?'Leaf ':'Spine ')+(i<h.serviceArchitecture.fabric.leafCount?i+1:i-h.serviceArchitecture.fabric.leafCount+1),[Math.min(.14*w,station[0]+.55)+(i%switchRows)*.36,Math.min(.22*b,.38)-Math.floor(i/switchRows)*.085,station[2]],switchDims,{hostKey:'fabric',fabricIndex:i,scope:'Proposed separated switch cassette, not a supplier QM9700 chassis'});
 addBox('recorder','01.03','Payload recorder',center(legacy?h.propulsion?.storageAccommodation?.positionM||h.propulsion?.stations?.storage:h.propulsion?.stations?.storage),legacy?[w*.512,(shown-.20)*driveStep,h.propulsion.equipmentLengthM*.132]:[Math.min(.55,w*.3),(shown-.22)*driveH,.25],{geometry:'existing',hostKey:'recorder'});
 for(const slot of rack.slots)addBox('compute-'+(slot.index+1),'01.01','Compute tray '+(slot.index+1),[slot.x,slot.y-(legacy?.16:.12)*rack.slotDimensionsM[1],slot.z],[rack.slotDimensionsM[0],rack.slotDimensionsM[1]*(legacy?.68:.64),rack.slotDimensionsM[2]],{geometry:'existing',hostKey:'payloadRack',frame:h.payloadLocation==='radiator'?'payload':'body',instance:slot.index});
 const batteryPoints=h.propulsion?.stations?.['02.02']||[];
 batteryPoints.forEach((p,i)=>addBox('battery-'+(i+1),'02.02','Battery pack '+(i+1),p,legacy?[w*.185,b*.64,h.propulsion.equipmentLengthM*.13]:[w*.185,b*.30,Math.max(.15,l*.06)],{geometry:'existing',hostKey:'battery',instance:i}));
 addBox('attitude','04.03','Attitude sensor interface',[station[0],Math.min(b*.36,station[1]+.5),station[2]+.10],[.18,.12,.12]);
 addBox('cmg-control','04.01','CMG drive interface',center(h.propulsion?.stations?.cmg),[.22,.12,.16],{geometry:'new',hostKey:'cmgControl'});
 addBox('prop-control','06.02','Propulsion valve interface',add(center(h.propulsion?.stations?.['06.02']),[.20,0,0]),[.18,.12,.16],{geometry:'new',hostKey:'propControl'});
 addBox('deployment-control','07.04','Deployment interface',[w*.30,-b*.26,0],[.20,.12,.14]);
 if(family.sPatchCount>0){
  addBox('sband-radio','05.01','S-band command radio',[station[0]+.38,-.27,station[2]+.10],[.20,.12,.16]);
  const stations=terminalStations.filter(t=>t.kind==='s');
  for(let i=0;i<family.sPatchCount;i++){
   const normal=stations[i]?.normalBody||[i%2?1:-1,0,0],position=legacy?[(i%2?1:-1)*(w*.5+beam*.42),b*.26,l*.3]:add(stations[i].positionM,scale(normal,.012));
   addBox('sband-patch-'+(i+1),'05.01','S-band patch '+(i+1),position,legacy?[beam*.35,b*.14,w*.21]:[.17,.024,.17],{geometry:'existing',hostKey:'patches',instance:i,...(!legacy?{mountNormal:normal}:{})});
  }
 }
 const terminalCounts={ka:0,optical:0};
 for(const terminal of terminalStations){const kind=terminal.kind;if(!Object.hasOwn(terminalCounts,kind))continue;const i=terminalCounts[kind]++;addBox(kind+'-'+(i+1),kind==='ka'?'05.02':'05.03',(kind==='ka'?'Ka-band':'Optical')+' terminal '+(i+1),add(terminal.positionM,scale(terminal.normalBody||[0,1,0],legacy?-.12:.055)),[.18,.10,.18],{geometry:'existing',hostKey:kind==='ka'?'dish':'optic',instance:i,mountNormal:terminal.normalBody||[0,1,0],baseInterfaceInsideBus:legacy,scope:legacy?'Fixed terminal stator interface beneath the roof mounting face, clear of the entire yawing support. A real open roof gland carries the enclosed device transfer into the pedestal; external harnesses terminate on the stationary interior connector bank.':'Stationary terminal base interface'});}
 // Keep the protected terminal stator modules on the equipment side of the
 // aft support deck, beneath the fixed pedestal footprint. The displaced roof
 // gland is modeled explicitly; no cable is allowed through the deck.
 for(const box of boxes.filter(b=>b.baseInterfaceInsideBus))box.positionM[2]=Math.max(box.positionM[2],h.propulsion.forwardDeckZ+.25);
 const solarCount=family.solarWingCount,solarPose=mechanismPose(deploymentLayout(h),1,0,{wingPitchDeg:0});
 for(let i=0;i<solarCount;i++){
  const carried=family.id==='starcloud-inline',wing=solarPose.wings[i],root=wing.root,axes=wing.axes||leafAxes({pitch:wing.pitch}),side=Math.sign(root[0])||1,inboardOffsetM=carried?0:Math.abs(root[0])-w/2+.20,collector=root.map((v,k)=>v+.095*axes[1][k]),bodyPosition=[side*(w/2-.20),b*(family.id==='redwire-platform'?.20:root[2]>0?.12:.32),collector[2]],delta=bodyPosition.map((v,k)=>v-root[k]),position=carried?[0,.095,0]:axes.map(axis=>sum(axis.map((v,k)=>v*delta[k]))),normalAxis=[0,1,2].reduce((a,k)=>Math.abs(axes[k][2])>Math.abs(axes[a][2])?k:a,0),sourceFace=normalAxis===0?(axes[0][2]>0?'right':'left'):normalAxis===1?(axes[1][2]>0?'top':'bottom'):(axes[2][2]>0?'front':'back');
  addBox('solar-root-'+(i+1),'02.01','Solar root '+(i+1)+' stator outlet',position,[.14,.09,.14],{geometry:'existing',hostKey:'wings',frame:'solar-root',instance:i,deploymentMotion:carried,statorInboardOffsetM:inboardOffsetM,statorBodyPositionM:carried?null:bodyPosition,sourceFace:carried?'front':family.id==='redwire-platform'?sourceFace:({front:'back',back:'front',left:'right',right:'left',top:'bottom',bottom:'top'}[sourceFace]),rotaryTransfer:true,scope:'Allocated multi-circuit rotary electrical transfer at the array root. Body-mounted outlets sit inside the bus on a fixed insulated collector rail through a real shaft feedthrough, clear of the rolled blanket and tracking sweep. Current, voltage, contact loss, life and supplier qualification remain controlled joint requirements.'});
 }
 if(h.energySystem.thermal.kind!=='passive-local')addBox('thermal-drive','03.02',h.energySystem.thermal.kind==='heat-lift'?'Heat-pump motor drive':'Pump control',[w*.28,-b*.29,-l*.10],[.24,.18,.20]);
 addBox('egse','07.05','Ground electrical checkout port',[station[0],-.1,Math.max(-l*.5+.025,station[2]-.30)],[.14,.10,.035],{scope:'Flight-side test interface; ground fixture is excluded from spacecraft mass'});
 addBox('gnss-antenna','08.01.16','GNSS antenna',[0,b*.5+.025,l*.18],[.10,.035,.10],{hostKey:'gnssAntenna',scope:'Preliminary antenna envelope within the existing avionics suite; vendor performance and sky-view analysis remain open'});
 const deck=h.propulsion.forwardDeckZ+.017/2;
 for(const box of boxes){
  if(box.frame!=='body'||box.id.startsWith('compute-')||box.id.startsWith('sband-patch-')||box.id.startsWith('ka-')||box.id.startsWith('optical-')||box.id==='gnss-antenna')continue;
  box.positionM[2]=Math.max(box.positionM[2],deck+box.dimensionsM[2]/2+.04);
  if(box.id==='pcdu')box.positionM[0]=-w*.20;
  if(box.id==='avionics')box.positionM[1]+=.06;
  if(box.id==='cmg-control'){box.positionM[0]=w*.29;box.positionM[1]=b*.31;}
  if(box.id==='prop-control'){box.positionM[0]=w*.29;box.positionM[1]=b*.18;}
  if(box.id==='sband-radio'){box.positionM[0]=-w*.15;box.positionM[1]=-b*.35;}
  if(box.id==='egse'){box.positionM[0]=-w*.36;box.positionM[1]=b*.33;}
  if(box.id==='recorder'&&!legacy)box.positionM[1]=b*.29;
  if(box.id.startsWith('fabric-'))box.positionM[1]+=b*.18;
  box.accommodationBasis='Equipment and connector approaches lie fully forward of the tank support deck; service clearances are modeled explicitly.';
 }
 accommodateFabricRows(boxes,h);
 accommodateRackServiceControls(boxes,h,{thermal:family.id!=='orbital-rack'||h.input.referenceCenterId==='orbital-1-202606'});
 if(family.id==='redwire-platform'&&rack.slots.length){
  const p=redwirePayloadTransferPolicy;
  addBox(p.statorBoxId,'07.08.01','Payload rotary transfer · fixed terminal bank',[0,b/2-.165,l/2-.30],p.statorDimensionsM,{payloadTransferRole:'stator',scope:'Fixed electrical/optical terminal enclosure. A mounted insulated neck and hinge-axis rotary module carry the internal transfer; external body harnesses end at these side ports.'});
  const platform=deploymentLayout(h).descriptors.find(s=>s.type==='rad'),position=[...p.rotorPositionM];position[2]=-platform.depth/2+.235;
  addBox(p.rotorBoxId,'07.08.02','Payload rotary transfer · moving terminal bank',position,p.rotorDimensionsM,{frame:'payload',payloadTransferRole:'rotor',scope:'Moving terminal enclosure carried by the payload platform. Separate fixed-to-platform harness sections terminate here; no exposed cable spans the hinge.'});
 }
 return boxes;
}

// Every route begins and ends at a connector datum. The shared polyline avoids
// a diagonal shortcut across the occupied bay; the renderer may round corners
// without moving these endpoints. Offsets are physical metres, never screen units.
export function routeElectricalHarness(from,to,{fromNormal=[1,0,0],toNormal=[-1,0,0],lane=0,kind='power',bendRadiusM=.05,bodyBoundsM=null}={}){
 const a=v3(from),z=v3(to),r=Math.max(.002,bendRadiusM),dot=(u,v)=>sum(u.map((x,i)=>x*v[i])),cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],unit=v=>scale(v,1/(Math.hypot(...v)||1));
 const na=unit(fromNormal),nz=unit(toNormal),crossed=cross(na,nz),directions=Math.hypot(...crossed)>.0001?[unit(crossed)]:[[0,0,1],[0,1,0],[1,0,0]].map(v=>add(v,scale(na,-dot(v,na)))).filter(v=>Math.hypot(...v)>.1).map(unit);
 let best=null;
 // A single endpoint fillet needs just over one bend radius of straight lead.
 // The two middle fillets share each rail segment, so those segments reserve
 // at least 2.1 radii. Search compact alternatives instead of pushing a 7r
 // backshell lead through a neighbouring enclosure or outside the fairing.
 for(const direction of directions)for(const leadA of [1.08,1.4,2.2,3.3])for(const leadB of [1.08,1.4,2.2,3.3]){
  const pa=add(a,scale(na,leadA*r+.003)),pz=add(z,scale(nz,leadB*r+.003)),da=dot(pa,direction),dz=dot(pz,direction),gap=2.1*r+.005+lane*.002;
  for(const side of [Math.min(da,dz)-gap,Math.max(da,dz)+gap]){
   const qa=add(pa,scale(direction,side-da)),qz=add(pz,scale(direction,side-dz)),pts=[a,pa,qa,qz,pz,z];
   // The rail is perpendicular to both endpoint normals, so all four
   // corners are right angles. Test the straight shared-segment allowance
   // analytically; constructing dozens of sampled arcs per candidate made
   // large payload configurations needlessly expensive.
   const fits=distance(qa,qz)>=r/.49+1e-8;
   const lengthM=distance(a,pa)+distance(pa,qa)+distance(qa,qz)+distance(qz,pz)+distance(pz,z)-(8-2*Math.PI)*r;
   let spill=0;for(const p of pts)for(let i=0;i<3;i++){const half=bodyBoundsM?.[i]/2,lo=Number.isFinite(half)?Math.min(-half,a[i],z[i]):Math.min(a[i],z[i])-2.2*r,hi=Number.isFinite(half)?Math.max(half,a[i],z[i]):Math.max(a[i],z[i])+2.2*r;spill+=Math.max(0,lo-p[i],p[i]-hi);}
   const score=(fits?0:1000)+spill*50+lengthM;
   if(!best||score<best.score)best={points:pts,score};
  }
 }
 return best?.points||[a,z];
}
export const electricalRouteLength=points=>sum(points.slice(1).map((p,i)=>distance(p,points[i])));

function frameTransform(h,box,pose={}){
 if(box.frame==='payload'){
  const g=deploymentLayout(h),leaf=g.descriptors.find(d=>d.type==='rad');
  if(leaf){const p=leafPose(g,leaf,pose.deployment??1,h.input.solarTiltDeg,pose.attitude),axes=leafAxes(p);return {origin:[p.x,p.y,p.z],axes,offset:[0,.06,0]};}
 }
 if(box.frame==='solar-root'){
  const p=mechanismPose(deploymentLayout(h),pose.deployment??1,0,{...pose.attitude,wingPitchDeg:0}),wing=p.wings[box.instance];
  if(wing)return {origin:wing.root,axes:wing.axes||leafAxes({pitch:wing.pitch}),offset:[0,0,0]};
 }
 if(box.mountNormal){
  const n=box.mountNormal,m=Math.hypot(...n),normal=n.map(v=>v/m);let axes;
  if(normal[1]<-1+1e-10)axes=[[-1,0,0],[0,-1,0],[0,0,1]];
  else{const q=[normal[2],0,-normal[0],1+normal[1]],norm=Math.hypot(...q);for(let i=0;i<4;i++)q[i]/=norm;const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],v=q.slice(0,3);axes=[[1,0,0],[0,1,0],[0,0,1]].map(a=>{const t=scale(cross(v,a),2);return add(add(a,scale(t,q[3])),cross(v,t));});}
  return {origin:box.positionM,axes,offset:[0,0,0],localPositionM:[0,0,0]};
 }
 return {origin:[0,0,0],axes:[[1,0,0],[0,1,0],[0,0,1]],offset:[0,0,0]};
}
export function electricalPortPose(h,graph,portId,pose={}){
 const port=graph.portById[portId],box=port&&graph.boxById[port.boxId];if(!port||!box)return null;
 const f=frameTransform(h,box,pose),local=add(add(f.localPositionM||box.positionM,port.positionM),f.offset),point=f.origin.map((v,i)=>v+sum(local.map((q,k)=>q*f.axes[k][i]))),normal=[0,1,2].map(i=>sum(port.normal.map((q,k)=>q*f.axes[k][i])));
 const type=connectorSelections[port.connectorTypeId],cableExitM=add(point,scale(normal,.018+.92*type.lengthM));return {positionM:point,cableExitM,normal,portId,boxId:box.id};
}
export function electricalCircuitExitPose(h,graph,portId,{instance=0,polarity=0,...pose}={}){
 const datum=electricalPortPose(h,graph,portId,pose),port=graph.portById[portId];if(!datum)return null;
 if(!Number.isInteger(instance)||instance<0||instance>=port.quantity)throw new Error('Unknown connector circuit '+portId+'/'+instance);
 const box=graph.boxById[port.boxId],f=frameTransform(h,box,pose),n=port.normal,type=connectorSelections[port.connectorTypeId],single=port.connectorTypeId.startsWith('hv-single');
 if(single?![-1,1].includes(polarity):polarity!==0)throw new Error('Invalid circuit polarity '+portId+'/'+polarity);
 // This is the connector's local +Y after the same shortest-arc +Z->normal
 // rotation used to install its real keyed receptacle and plug.
 let q=n[2]<-1+1e-10?[0,-1,0,0]:[-n[1],n[0],0,1+n[2]],qn=Math.hypot(...q);q=q.map(x=>x/qn);
 const [qx,qy,qz,qw]=q,localY=[2*(qx*qy-qz*qw),1-2*(qx*qx+qz*qz),2*(qy*qz+qx*qw)],offset=add(port.instanceOffsetsM?.[instance]||[0,0,0],scale(localY,polarity*type.diameterM*.62)),worldOffset=[0,1,2].map(i=>sum(offset.map((v,k)=>v*f.axes[k][i])));
 return {...datum,instance,polarity,positionM:add(datum.positionM,worldOffset),cableExitM:add(datum.cableExitM,worldOffset)};
}
export const electricalBoxMoves=box=>box.frame==='payload'||box.frame==='solar-root'&&box.deploymentMotion===true;
export function resolveElectricalRoutes(h,{deployment=1,attitude=null,graph=buildElectricalArchitecture(h)}={}){
 return graph.harnesses.map(a=>{
  const from=electricalPortPose(h,graph,a.fromPortId,{deployment,attitude}),to=electricalPortPose(h,graph,a.toPortId,{deployment,attitude}),local=a.payloadTransferSegment==='platform'?redwirePlatformHarnessLocalRoute(graph,a,connectorSelections[a.connectorTypeId].lengthM):null;
  let controls;
  if(local){const frame=frameTransform(h,graph.boxById[a.fromBoxId],{deployment,attitude});controls=local.map(point=>{const q=add(point,frame.offset);return frame.origin.map((v,i)=>v+sum(q.map((n,k)=>n*frame.axes[k][i])));});}
  else controls=routeElectricalHarness(from.cableExitM,to.cableExitM,{fromNormal:from.normal,toNormal:to.normal,...a.routing});
  return {...a,from,to,pointsM:roundedConnectionRoute(controls,a.bendRadiusM).points};
 });
}

const awg=[['30',.0509],['28',.0804],['26',.129],['24',.205],['22',.326],['20',.518],['18',.823],['16',1.31],['14',2.08],['12',3.31],['10',5.26],['8',8.37],['6',13.3],['4',21.2],['2',33.6],['1',42.4],['1/0',53.5],['2/0',67.4],['3/0',85],['4/0',107]];
function conductorFor(currentA,voltageV,lengthM,minimumArea=.205,acceptedWireAWG=null){
 const required=Math.max(minimumArea,currentA/3,2*2.10e-8*lengthM*currentA/Math.max(.001,voltageV*.02)*1e6),available=acceptedWireAWG?awg.filter(([g])=>acceptedWireAWG.includes(g)):awg,selected=available.find(([,a])=>a>=required)||available.at(-1);
 return {awg:selected[0],areaMM2:selected[1],requiredAreaMM2:required,supported:required<=selected[1],acceptedWireAWG:acceptedWireAWG||awg.map(([g])=>g),terminationCompatible:!acceptedWireAWG||acceptedWireAWG.includes(selected[0]),resistanceOhm:2*2.10e-8*lengthM/(selected[1]*1e-6)};
}

const groups=[
 ['array','07.05.10','07.05','Solar-array source harnesses','power'],['primary','07.05.11','07.05','Primary and battery power harnesses','power'],['payload','07.05.12','07.05','48 V payload power harnesses','power'],['service','07.05.13','07.05','28 V avionics and service harnesses','power'],['control','07.05.14','07.05','Command and housekeeping harnesses','control'],['rf','07.05.15','07.05','RF antenna coaxial assemblies','rf'],['egse','07.05.16','07.05','Electrical ground-checkout harness interface','control'],['thermal','07.05.17','07.05','Thermal-control drive harnesses','power'],['fabric','01.04.10','01.04','Payload optical fabric harnesses','data']
];
// Pack real connector banks in physical metres. Repeated circuits retain their
// own positions; an overview may batch their solids but cannot share a datum.
function packElectricalPorts(graph,h){
 graph.packing=[];
 graph.installationHardware=(graph.installationHardware||[]).filter(part=>part.owner!=='payload-service-panel');
 const faceAxes={left:[0,-1,2,1],right:[0,1,2,1],front:[2,1,0,1],back:[2,-1,0,1],top:[1,1,0,2],bottom:[1,-1,0,2]};
 for(const box of graph.boxes){
  const carriedCollector=box.frame==='solar-root'&&box.deploymentMotion,carriedLimits=carriedCollector?carriedCollectorPackingLimits(h):null;
  box.connectorPanels=[];
  for(const [face,[axis,sign,u,v]] of Object.entries(faceAxes)){
   const ports=graph.ports.filter(p=>p.boxId===box.id&&p.face===face);if(!ports.length)continue;
   const margin=.008,baseW=box.dimensionsM[u],baseH=box.dimensionsM[v];
   const makeLayout=(width)=>{
    let x=margin,y=margin,rowHeight=0;const positions=[];
    for(const port of [...ports].sort((a,b)=>connectorSelections[b.connectorTypeId].diameterM-connectorSelections[a.connectorTypeId].diameterM)){
     const type=connectorSelections[port.connectorTypeId],pitch=type.diameterM+.012,cellW=pitch,cellH=port.connectorTypeId.startsWith('hv-single')?2.24*type.diameterM+.012:pitch;
     const cols=Math.max(1,Math.min(port.quantity,Math.floor((width-2*margin)/cellW))),rows=Math.ceil(port.quantity/cols),w=cols*cellW,hh=rows*cellH;
     if(x+w>width-margin+1e-8&&x>margin){x=margin;y+=rowHeight;rowHeight=0;}
     positions.push({port,x,y,w,h:hh,cols,rows,pitch,cellH});x+=w+.004;rowHeight=Math.max(rowHeight,hh+.004);
    }
    return {width,height:y+rowHeight+margin,positions};
   };
   let width=Math.max(baseW,...ports.map(p=>connectorSelections[p.connectorTypeId].diameterM+.028)),layout=makeLayout(width);
   const minimumRowH=Math.max(...ports.map(p=>{const t=connectorSelections[p.connectorTypeId];return p.connectorTypeId.startsWith('hv-single')?2.24*t.diameterM+.012:t.diameterM+.012;}))+2*margin+.004;
   const targetH=Math.max(baseH,minimumRowH,box.id==='pcdu'?Math.min(h.bodyHeightM*.65,1.8):box.id.startsWith('fabric-')?.30:box.id==='thermal-drive'&&box.routingAccommodation?.interfaceFace?.match(/front|back/)? .32:baseH);
   // The carried collector's width is axial: widening it enters the rotating
   // reel. Retain the existing narrow case and add rows within the free gap.
   for(let i=0;i<20&&!carriedCollector&&layout.height>targetH+1e-8;i++){width*=1.18;layout=makeLayout(width);}
   const payloadService=redwirePayloadServiceFace(box,h)===face,expanded=payloadService||layout.height>baseH+1e-8||width>baseW+1e-8,depth=expanded?(payloadService?redwirePayloadInterfacePolicy.plateThicknessM:.035):0,panelPosition=[0,0,0],panelDims=[...box.dimensionsM];panelPosition[axis]=sign*(box.dimensionsM[axis]/2+depth/2);panelDims[axis]=depth||.006;panelDims[u]=width;panelDims[v]=Math.max(baseH,layout.height);
   if(expanded){const panel={id:box.id+':'+face,face,positionM:panelPosition,dimensionsM:panelDims,hostRelative:true,reason:'Physical connector bank sized to contact count, diameter and 12 mm centre-pitch allowance; attached to the allocated equipment enclosure.'};if(payloadService){const hardware=redwirePayloadServicePlate(box,panel);graph.installationHardware.push(hardware);panel.installationHardwareId=hardware.id;panel.itemId=hardware.itemId;panel.reason=hardware.basis;}box.connectorPanels.push(panel);}
   for(const a of layout.positions){const port=a.port,normal=[0,0,0];normal[axis]=sign;port.normal=normal;port.positionM=[0,0,0];port.positionM[axis]=sign*(box.dimensionsM[axis]/2+depth);port.positionM[u]=a.x+a.pitch/2-width/2;port.positionM[v]=payloadService&&a.rows===1&&layout.positions.every(q=>q.y===margin)?0:a.y+a.cellH/2-panelDims[v]/2;
    port.instanceOffsetsM=Array.from({length:port.quantity},(_,i)=>{const p=[0,0,0];p[u]=(i%a.cols)*a.pitch;p[v]=Math.floor(i/a.cols)*a.cellH;return p;});
    port.packing={count:port.quantity,rows:a.rows,columns:a.cols,pitchM:a.pitch,widthM:a.w,heightM:a.h,representative:true,withinFace:true,panelId:expanded?box.id+':'+face:null};
   }
   const allowed=[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM],withinAllocatedEnvelope=box.frame!=='body'||panelDims.every((d,i)=>d<=allowed[i]);
   graph.packing.push({id:box.id+':'+face,itemId:box.itemId,boxId:box.id,face,quantity:sum(ports.map(p=>p.quantity)),expandedPanel:expanded,dimensionsM:panelDims,withinAllocatedEnvelope:withinAllocatedEnvelope&&(!carriedCollector||panelDims[0]<=carriedLimits.availableAxialWidthM+1e-9),basis:carriedCollector?'Every original conductor is retained in a tall bank; axial width is bounded by the actual last-leaf tip cap and complete reel/contact sweep. Full installed-route and neighboring-equipment checks remain required.':'Connector footprints and declared repeated-circuit count are physically separated. Panel-to-neighbor keepout and harness-tray accommodation still require the mechanical interference review.'});
  }
  box.connectorPanel=box.connectorPanels[0]||null;
 }
 accommodateRedwirePayloadTransferPorts(graph,h);
 accommodateFixedSolarCollectors(graph,h);
 accommodateCarriedSolarCollectors(graph,h,connectorSelections);
}

// Terminal-bank positions implement nested planar branches in the platform
// raceways. The connector axes lie in one horizontal plane; the upstream
// order is reversed relative to destination order so branches do not cross.
function accommodateRedwirePayloadTransferPorts(graph,h){
 if(architectureFamily(h).id!=='redwire-platform')return;
 for(const box of graph.boxes.filter(b=>b.payloadTransferRole))for(const face of ['left','right']){
  const ports=graph.ports.filter(p=>p.boxId===box.id&&p.face===face&&p.payloadDestinationId),destinations=[...new Set(ports.map(p=>p.payloadDestinationId))].sort((a,b)=>graph.boxById[a].positionM[2]-graph.boxById[b].positionM[2]||graph.boxById[a].instance-graph.boxById[b].instance);
  const rotor=box.payloadTransferRole==='rotor',firstZ=rotor?.23:.14,pitch=rotor?.12:.08;
  for(const port of ports){
   const rank=destinations.indexOf(port.payloadDestinationId)*2+(port.kind==='data'?1:0),type=connectorSelections[port.connectorTypeId];
   // Repeated feeds retain physically separated port instances; a request
   // exceeding the selected bank envelope becomes an explicit fit failure.
   port.positionM=[(face==='left'?-1:1)*box.dimensionsM[0]/2,0,firstZ-rank*pitch];
   port.instanceOffsetsM=Array.from({length:port.quantity},(_,i)=>[0,i*(type.diameterM+.012),0]);
   const withinFace=Math.abs(port.positionM[2])+type.diameterM/2+.008<=box.dimensionsM[2]/2+1e-9&&(port.quantity-1)*(type.diameterM+.012)+type.diameterM/2+.008<=box.dimensionsM[1]/2+1e-9;
   port.packing={...port.packing,withinFace,payloadDestinationId:port.payloadDestinationId,bankRole:box.payloadTransferRole,nestedBranchRank:rank,axisPlaneY:box.positionM[1]};
   const packing=graph.packing.find(p=>p.boxId===box.id&&p.face===face);if(packing)packing.withinAllocatedEnvelope&&=withinFace;
  }
 }
}

// A packed collector can be wider than its original140mm junction enclosure.
// Place the complete fixed bank inside the actual side-wall inner face, after
// packing has resolved every shell, polarity and repeated-circuit position.
// Carried inline roots retain their separately articulated interface design.
export function accommodateFixedSolarCollectors(graph,h,{wallClearanceM=.012}={}){
 if(!Number.isFinite(wallClearanceM)||wallClearanceM<0)throw new Error('Invalid fixed collector wall clearance');
 const dimensions=[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM],family=architectureFamily(h),wallThicknessM=family.id==='protected-core'?Math.min(...dimensions)*.024:Math.max(.018,Math.min(...dimensions)*.024),innerHalf=dimensions.map(d=>d/2-wallThicknessM-.0002),bodyKeepouts=fixedCollectorBodyKeepouts(h),reports=[];
 const dot=(a,b)=>sum(a.map((v,i)=>v*b[i]));
 for(const box of graph.boxes.filter(b=>b.frame==='solar-root'&&!b.deploymentMotion&&b.statorBodyPositionM)){
  const nominal=box.statorNominalBodyPositionM||[...box.statorBodyPositionM];box.statorNominalBodyPositionM=[...nominal];const f=frameTransform(h,box),side=Math.sign(nominal[0])||1;
  const setPosition=position=>{box.statorBodyPositionM=[...position];box.positionM=f.axes.map(axis=>dot(position.map((v,i)=>v-f.origin[i]),axis));box.statorInboardOffsetM=Math.abs(f.origin[0]-position[0]);};setPosition(nominal);
  const vertices=[],portEnvelopes=[],bodyVector=local=>[0,1,2].map(i=>sum(local.map((v,k)=>v*f.axes[k][i]))),bodyPoint=local=>add(nominal,bodyVector(local));
  const addBox=(center,size)=>{for(const x of[-1,1])for(const y of[-1,1])for(const z of[-1,1])vertices.push(bodyPoint(center.map((v,i)=>v+[x,y,z][i]*size[i]/2)));};
  addBox([0,0,0],box.dimensionsM);for(const panel of box.connectorPanels||[])addBox(panel.positionM,panel.dimensionsM);
  for(const port of graph.ports.filter(p=>p.boxId===box.id)){
   const type=connectorSelections[port.connectorTypeId],harness=graph.harnesses.find(a=>a.fromPortId===port.id||a.toPortId===port.id),n=port.normal,single=port.connectorTypeId.startsWith('hv-single');let q=n[2]<-1+1e-10?[0,-1,0,0]:[-n[1],n[0],0,1+n[2]],qn=Math.hypot(...q);q=q.map(v=>v/qn);const [qx,qy,qz,qw]=q,u=bodyVector([1-2*(qy*qy+qz*qz),2*(qx*qy+qz*qw),2*(qx*qz-qy*qw)]),v=bodyVector([2*(qx*qy-qz*qw),1-2*(qx*qx+qz*qz),2*(qy*qz+qx*qw)]),normal=bodyVector(n),radiusM=(harness?.cableDiameterM||type.diameterM)/2+.002,approachM=(harness?.bendRadiusM||.035)*2.4+.015;
   for(let instance=0;instance<port.quantity;instance++)for(const polarity of single?[-1,1]:[0]){
    const datum=electricalCircuitExitPose(h,graph,port.id,{instance,polarity}),start=datum.positionM,end=add(start,scale(normal,.018+.92*type.lengthM+.045)),approachEnd=add(datum.cableExitM,scale(normal,approachM));
    for(const p of[start,end])for(const a of[-1,1])for(const b of[-1,1])vertices.push(add(add(p,scale(u,a*type.diameterM/2)),scale(v,b*type.diameterM/2)));
    for(const p of[datum.cableExitM,approachEnd])for(let axis=0;axis<3;axis++)for(const sign of[-1,1])vertices.push(p.map((x,i)=>x+(i===axis?sign*radiusM:0)));
    portEnvelopes.push({portId:port.id,instance,polarity,positionM:datum.positionM,cableExitM:datum.cableExitM,approachEndM:approachEnd,normal,radiusM,approachM,matingTravelM:.045});
   }
  }
  const before={min:[0,1,2].map(i=>Math.min(...vertices.map(p=>p[i]))),max:[0,1,2].map(i=>Math.max(...vertices.map(p=>p[i])))},outboard=side>0?before.max[0]:-before.min[0],shiftInboardM=Math.max(0,outboard-(innerHalf[0]-wallClearanceM)),translation=[-side*shiftInboardM,0,0];
  // A wide bank can reach inward above an occupied top-row tray. Reserve the
  // complete slot envelope, including its cold plate and installed package,
  // before choosing the overhead collector station. The available roof still
  // bounds the result; an overfull request remains an accommodation failure.
  const zCandidates=[0,...bodyKeepouts.rods.flatMap(o=>[o.min[2]-wallClearanceM-before.max[2],o.max[2]+wallClearanceM-before.min[2]])].sort((a,b)=>Math.abs(a)-Math.abs(b)),overlap=(a,o,axes=[0,1,2])=>axes.every(k=>a.min[k]<o.max[k]+wallClearanceM-1e-10&&a.max[k]>o.min[k]-wallClearanceM+1e-10);let placement=null;
  for(const shiftZ of zCandidates){const move=[translation[0],0,shiftZ],candidate={min:add(before.min,move),max:add(before.max,move)},rackRows=bodyKeepouts.rack.filter(o=>overlap(candidate,o,[0,2])),rackTopM=rackRows.length?Math.max(...rackRows.map(o=>o.max[1])):-Infinity;move[1]=rackRows.length?Math.max(0,rackTopM+wallClearanceM-before.min[1]):0;candidate.min[1]+=move[1];candidate.max[1]+=move[1];if(bodyKeepouts.rods.some(o=>overlap(candidate,o))||candidate.min.some((v,k)=>v< -innerHalf[k]+wallClearanceM-1e-9)||candidate.max.some((v,k)=>v>innerHalf[k]-wallClearanceM+1e-9))continue;placement={move,rackRows,rackTopM};break;}
  const slotRows=placement?.rackRows||[],rackTopM=placement?.rackTopM??-Infinity,shiftUpM=placement?.move[1]||0,shiftAxialM=placement?.move[2]||0;translation[1]=shiftUpM;translation[2]=shiftAxialM;
  const position=add(nominal,translation),bounds={min:add(before.min,translation),max:add(before.max,translation)};setPosition(position);
  const margins=[0,1,2].flatMap(i=>[bounds.min[i]+innerHalf[i],innerHalf[i]-bounds.max[i]]),issues=[];if(!vertices.every(p=>p.every(Number.isFinite))||!margins.every(Number.isFinite))issues.push({code:'invalid-fixed-collector-envelope',boxId:box.id});else if(margins.some(m=>m+1e-9<wallClearanceM))issues.push({code:'fixed-collector-outside-equipment-bay',boxId:box.id,bounds,innerHalfM:innerHalf,minimumWallGapM:Math.min(...margins),requiredWallGapM:wallClearanceM});if(!placement)issues.push({code:'unresolved-fixed-collector-body-accommodation',boxId:box.id,bounds,basis:bodyKeepouts.basis});
  const report={boxId:box.id,itemId:box.itemId,ok:issues.length===0,issues,physicalConnectorCount:portEnvelopes.length,packedPanels:(box.connectorPanels||[]).map(p=>({id:p.id,dimensionsM:p.dimensionsM,positionM:p.positionM})),nominalPositionM:[...nominal],positionM:position,shiftInboardM,shiftUpM,shiftAxialM,overlappingRackSlots:slotRows.map(slot=>slot.id),rackEnvelopeClearanceM:slotRows.length?bounds.min[1]-rackTopM:null,bodyKeepoutBasis:bodyKeepouts.basis,wallThicknessM,requiredWallGapM:wallClearanceM,minimumWallGapM:Math.min(...margins),bounds,portEnvelopes:portEnvelopes.map(p=>({...p,positionM:add(p.positionM,translation),cableExitM:add(p.cableExitM,translation),approachEndM:add(p.approachEndM,translation)})),massStationBasis:'The corrected junction datum is explicit here and on the installed part. Connector quantities retain their existing harness mass allocation. The solar material mass remains along the PV blanket and the drive/joint lump remains at its actual pivot; a separately measured collector enclosure/busbar mass split is still open.',basis:'Actual packed connector panels, every separate polarity/instance flange and backshell, complete45mm plug stroke, and each allocated straight cable approach are enclosed in body metres. The bank moves inward by the measured wall shortfall, above overlapping occupied rack slots/rails, and to the nearest free axial station around fixed magnetic rods.12mm is a project accommodation clearance; actual neighboring hardware and continuous route clearances remain separately checked.'};box.collectorAccommodation=report;reports.push(report);
  for(const p of graph.packing||[])if(p.boxId===box.id){p.withinAllocatedEnvelope=p.withinAllocatedEnvelope&&report.ok;p.collectorAccommodation=report.boxId;}
 }
 graph.collectorAccommodations=reports;return reports;
}
export function updateRedwirePayloadTransferAccounting(graph){
 const accounting=graph.rotaryTransferAccounting;if(!accounting)return null;
 const byId=Object.fromEntries(graph.harnesses.map(a=>[a.id,a]));
 for(const circuit of accounting.powerCircuits){
  const up=byId[circuit.upstreamHarnessId],down=byId[circuit.downstreamHarnessId],segments=[up,down];
  circuit.requiredCurrentA=up.currentA;circuit.allocatedCurrentA=accounting.allocatedCurrentPerBranchA;
  circuit.currentMarginA=circuit.allocatedCurrentA-circuit.requiredCurrentA;
  circuit.wireResistanceOhm=sum(segments.map(a=>a.wire.resistanceOhm));
  circuit.matingContactResistanceOhm=sum(segments.map(a=>(a.matedContactCount??4)*connectorSelections[a.connectorTypeId].contactResistanceBudgetOhm));
  circuit.rotaryResistanceOhm=sum(segments.map(a=>a.additionalRotaryResistanceOhm||0));
  circuit.contactLoopResistanceOhm=accounting.contactLoopResistanceOhm;circuit.internalLeadLoopResistanceOhm=accounting.internalLeadLoopResistanceOhm;
  circuit.resistanceOhm=circuit.wireResistanceOhm+circuit.matingContactResistanceOhm+circuit.rotaryResistanceOhm;
  circuit.voltageDropV=circuit.requiredCurrentA*circuit.resistanceOhm;circuit.voltageDropAllocationV=Math.min(...segments.map(a=>a.operatingVoltageMinV))*.02;
  circuit.voltageDropWithin=circuit.voltageDropV<=circuit.voltageDropAllocationV+1e-9;
  circuit.powerLossW=circuit.requiredCurrentA**2*circuit.resistanceOhm;circuit.rotaryLossW=circuit.requiredCurrentA**2*circuit.rotaryResistanceOhm;
  circuit.contactLossW=circuit.requiredCurrentA**2*circuit.contactLoopResistanceOhm;circuit.internalLeadLossW=circuit.requiredCurrentA**2*circuit.internalLeadLoopResistanceOhm;
  circuit.wireCurrentLimitA=Math.min(...segments.map(a=>a.wire.areaMM2*3));circuit.connectorCurrentLimitA=Math.min(...segments.map(a=>connectorSelections[a.connectorTypeId].allocatedCurrentA));
  circuit.internalLeadCurrentLimitA=accounting.internalLeadCopperAreaMM2*3;circuit.completeCurrentLimitA=Math.min(circuit.allocatedCurrentA,circuit.wireCurrentLimitA,circuit.connectorCurrentLimitA,circuit.internalLeadCurrentLimitA);
  circuit.currentWithin=circuit.requiredCurrentA<=circuit.completeCurrentLimitA+1e-9;
 }
 for(const link of accounting.opticalLinks){
  const segments=[byId[link.upstreamHarnessId],byId[link.downstreamHarnessId]],cutLengthM=sum(segments.map(a=>a.cutLengthM)),matingPairs=sum(segments.map(a=>a.totalMatedInterfacesPerAssembly));
  Object.assign(link,redwireOpticalLinkBudget({cutLengthM,matingPairs}));
  link.lineRateWithin=segments.every(a=>a.rateMbps<=connectorSelections[a.connectorTypeId].lineRateMbps);
 }
 accounting.allocatedResistanceOhm=accounting.loopResistanceOhm;
 accounting.rotaryLossW=sum(accounting.powerCircuits.map(c=>c.quantity*c.rotaryLossW));
 accounting.contactLossW=sum(accounting.powerCircuits.map(c=>c.quantity*c.contactLossW));accounting.internalLeadLossW=sum(accounting.powerCircuits.map(c=>c.quantity*c.internalLeadLossW));
 accounting.totalPowerCircuitLossW=sum(accounting.powerCircuits.map(c=>c.quantity*c.powerLossW));
 accounting.maximumPowerCircuitDropV=Math.max(0,...accounting.powerCircuits.map(c=>c.voltageDropV));
 accounting.opticalTotalLinkLossDb=Math.max(0,...accounting.opticalLinks.map(l=>l.totalLossDb));
 accounting.opticalLinkBudgetDb=redwirePayloadTransferPolicy.opticalLinkBudgetDb;
 accounting.opticalMarginDb=accounting.opticalLinkBudgetDb-accounting.opticalTotalLinkLossDb;
 accounting.currentWithin=accounting.powerCircuits.every(c=>c.currentWithin);
 accounting.voltageDropWithin=accounting.powerCircuits.every(c=>c.voltageDropWithin);
 accounting.opticalWithin=accounting.opticalLinks.every(l=>l.within&&l.lineRateWithin)&&accounting.opticalChannelsWithin;
 accounting.sourceIds=['el-hybrid-rotary','el-hybrid-path','el-optical-lr4','el-optical-lr4-budget','el-fiber-sm'];
 accounting.status=accounting.currentWithin&&accounting.voltageDropWithin&&accounting.opticalWithin&&accounting.aggregateWithin?'preliminary-allocation-within-budget':'preliminary-allocation-shortfall';
 return accounting;
}

function refreshHarnessGeometry(h,graph,a){
 const type=connectorSelections[a.connectorTypeId],from=electricalPortPose(h,graph,a.fromPortId),to=electricalPortPose(h,graph,a.toPortId),moving=!!a.dynamicAllowanceM;
 let wire=a.wire,rounded,cut=a.cutLengthM;
 for(let i=0;i<3;i++){
  if(a.kind==='power')wire=conductorFor(a.currentA,a.operatingVoltageMinV,cut,.205,type.acceptedWireAWG);
  a.cableDiameterM=a.kind==='power'?(a.connectorTypeId.startsWith('hv-single')?(a.connectorTypeId==='hv-single-8'?.0062:.0135):Math.max(.004,Math.sqrt(wire.areaMM2*4/Math.PI)*.002)):a.kind==='data'?(type.cableDiameterM||.003):a.kind==='rf'?.00419:.005;
  a.bendRadiusM=Math.max(a.kind==='data'?(type.minimumBendRadiusM||.030):a.kind==='rf'?.045:.035,(moving?15:10)*a.cableDiameterM);a.routing.bendRadiusM=a.bendRadiusM;
  const carriedControls=a.payloadTransferSegment==='platform'?redwirePlatformHarnessLocalRoute(graph,a,type.lengthM):null;
  if(carriedControls){const frame=frameTransform(h,graph.boxById[a.fromBoxId]),localRoute=roundedConnectionRoute(carriedControls,a.bendRadiusM);a.nominalLocalRoutePointsM=localRoute.points.map(p=>[...p]);a.nominalLocalRouteFrame='payloadRack';rounded={...localRoute,points:localRoute.points.map(point=>{const local=add(point,frame.offset);return frame.origin.map((v,i)=>v+sum(local.map((q,k)=>q*frame.axes[k][i])));})};a.routingBasis='Mounted platform raceway; shared rigid local construction';}
  else rounded=roundedConnectionRoute(routeElectricalHarness(from.cableExitM,to.cableExitM,{fromNormal:from.normal,toNormal:to.normal,...a.routing}),a.bendRadiusM);
  cut=rounded.lengthM*(1+a.slackFraction)+a.terminationAllowanceM+a.dynamicAllowanceM;
 }
 a.routeLengthM=rounded.lengthM;a.cutLengthM=cut;a.minimumRenderedBendRadiusM=rounded.minimumBendRadiusM;a.routeBendLimited=rounded.bendLimited;a.nominalRoutePointsM=rounded.points;
 a.wire={...a.wire,...wire,jacketODMM:a.cableDiameterM*1000};
 if(a.kind==='control')Object.assign(a.wire,{awg:'26',areaMM2:.129,acceptedWireAWG:['26'],requiredAreaMM2:.129,supported:true,terminationCompatible:true,resistanceOhm:2*2.10e-8*cut/(.129e-6)});
 if(a.kind==='data')Object.assign(a.wire,{awg:null,areaMM2:null,requiredAreaMM2:null,acceptedWireAWG:null,resistanceOhm:0,supported:true,terminationCompatible:true,conductorCount:0,fiberCount:type.fiberCount,activeFibers:type.activeFibers||8,ferrulePolish:type.ferrulePolish,fiberType:type.fiberType||'OM4 multimode',sourceIds:type.fiberType?['el-fiber-sm','el-optical-lr4']:['el-fiber'],construction:type.fiberType?'G.652.D / OS2 duplex single-mode zipcord; two 2 mm legs in a 4 mm overall envelope, LC/UPC at both ends':'OM4 50/125 μm multimode optical cable, '+type.fiberCount+' installed fibers, MPO12 '+type.ferrulePolish+' Type B'});
 if(a.kind==='rf')Object.assign(a.wire,{awg:null,areaMM2:null,requiredAreaMM2:null,acceptedWireAWG:null,resistanceOhm:null,supported:true,terminationCompatible:true,impedanceOhm:50,construction:'Times Microwave TFlex402 flexible coax; compatible Amphenol 132100/132106 terminations'});
 if(a.kind==='power'){
  a.wire.resistanceOhm=2*2.10e-8*cut/(a.wire.areaMM2*1e-6);a.resistanceOhm=a.wire.resistanceOhm+(a.matedContactCount??4)*type.contactResistanceBudgetOhm+(a.additionalRotaryResistanceOhm||0);a.voltageDropV=a.currentA*a.resistanceOhm;a.powerLossW=a.currentA*a.currentA*a.resistanceOhm;
  a.estimatedCableKg=2*cut*a.wire.areaMM2*1e-6*8960*1.4;
  a.pinout.forEach(p=>p.conductor=p.net==='Supply'?'Positive conductor; '+a.wire.awg+' AWG copper':'Dedicated return; '+a.wire.awg+' AWG copper');
  a.wire.construction=a.voltageV>300?'Glenair 967-048 / 967-028 1000 V construction candidate or supplier-approved equivalent, '+a.wire.awg+' AWG, contact-compatible jacket OD; actual construction and environmental derating require supplier approval':'GS22759-family stranded copper, '+a.wire.awg+' AWG; selected contact-compatible gauge and application-approved insulation class';
 }else a.estimatedCableKg=cut*(a.kind==='data'?(type.cableMassKgPerM||.020):a.kind==='control'?.045:.0491);
 if(a.kind==='rf'){a.rfFrequencyMHz=a.id==='RF-GNSS'?1575.42:2290;a.insertionLossDb=(.011844*Math.sqrt(a.rfFrequencyMHz)+.000033*a.rfFrequencyMHz)*cut+.30;a.rfLossAllocationDb=6;a.sourceIds=[...new Set([...a.sourceIds,'el-rf-cable','el-rf-jack'])];}
 a.physicalLineRateMbps=a.kind==='data'?type.lineRateMbps:a.kind==='control'?100:0;
 a.procurement={connectorFamily:type.family,arrangement:type.arrangement,assemblyQuantity:a.quantity,cutLengthM:a.cutLengthM,contactCompatibleWireAWG:a.wire.awg,shield:a.shieldTermination,matingPairs:a.totalMatedInterfacesPerAssembly,key:a.kind==='power'?(a.voltageV<=34?'N — 28 V':a.voltageV<=60?'A — 48 V':'separate source/bus and polarity keys'):a.kind==='data'?type.ferrulePolish:null,orderSpecification:type.procurement,releaseStatus:'supplier-application-approval-required'};
 if(a.kind==='data'){const options=[3,5,7,10,15,20,30,50,100],length=options.find(n=>n>=cut)||null;a.procurement.catalogLengthM=length;a.procurement.partNumber=a.connectorTypeId==='mtp-optical'&&length===3?'J757512QEZ-NB003M':a.connectorTypeId==='mtp-optical-400'&&[3,5,7,10].includes(length)?'MFP7E10-N'+String(length).padStart(3,'0'):null;a.procurement.lengthBasis=a.procurement.partNumber?'Exact documented cable reference; excess length needs a supported service loop.':'Manufacturer-confirmed route-compatible length/order suffix required; no invented part number.';}
}

const cache=new WeakMap(),graphOwners=new WeakMap();
export function buildElectricalArchitecture(h){
 if(cache.has(h))return cache.get(h);
 const e=h.energySystem.electrical,f=h.serviceArchitecture.fabric,af=architectureFamily(h),boxes=electricalBoxLayout(h),boxById=Object.fromEntries(boxes.map(b=>[b.id,b])),ports=[],harnesses=[],connectors=[],cards=[],portCounters={},groupMap=Object.fromEntries(groups.map(([id,wbs,parentWbs,label,kind])=>[id,{id,wbs,itemId:'flight:'+wbs,parentWbs,parentId:'flight:'+parentWbs,label,kind,harnessIds:[],connectorIds:[],quantity:0,allocatedMassKg:0,estimatedMassKg:0}]));
 const graph={schema:'orbital-data-center/electrical-architecture/1',revision:electricalArchitectureRevision,configurationId:'ELC:'+electricalFingerprint({revision:electricalArchitectureRevision,input:harnessDesignInputs(h.input)}),sources:electricalSources,boxes,boxById,cards,ports,portById:{},harnesses,connectors,assemblies:[],connectorDetails:[],massAccounting:{},checks:[],basis:'Preliminary ODC interface/build allocation, separate from reference-provider internals and supplier-qualified hardware.'};
 const connect=(id,groupId,fromId,toId,{kind=groupMap[groupId].kind,voltageV=0,currentA=0,rateMbps=0,quantity=1,connectorTypeId=null,operatingVoltageMinV=null,fromFace='right',toFace='left',signal=null,notes='',minimumAreaMM2=.205}={})=>{
  const group=groupMap[groupId];if(!boxById[fromId]||!boxById[toId]||quantity<1)return;
  const typeId=connectorTypeId||(kind==='data'?(rateMbps>100000?'mtp-optical-400':'mtp-optical'):kind==='control'?'spacewire-a':kind==='rf'?'sma-rf':voltageV>300?(currentA<=25.11?'hv-single-8':'hv-single'):currentA<=3.93?'service-16':currentA<=25.11?'power-18-2':currentA<=50?'power-24-2':'power-36-2'),type=connectorSelections[typeId];
  const makePort=(boxId,suffix,face)=>{const b=boxById[boxId],n=portCounters[boxId]||0;portCounters[boxId]=n+1;
   // Reserve usable backshell approaches. The former blanket left/right rule
   // put connectors in 60 mm package gaps and through neighbouring batteries.
   if(boxId.startsWith('compute-'))face=redwirePayloadServiceFace(b,h)||(b.frame==='payload'?'top':['orbital-rack','protected-core'].includes(af.id)&&b.positionM[0]<0?'left':'right');
   else if(boxId.startsWith('battery-'))face=af.id!=='redwire-platform'?'back':'front';
   else if(boxId==='pcdu'&&['primary','array'].includes(groupId)&&af.id!=='redwire-platform')face='front';
   else if(boxId.startsWith('fabric-')||boxId==='recorder')face='front';
   else if(boxId.startsWith('solar-root-'))face=b.sourceFace||'front';
   else if(boxId.startsWith('sband-patch-'))face=b.mountNormal?'bottom':b.positionM[0]<0?'right':'left';
   else if(boxId==='gnss-antenna'&&af.id==='protected-core')face='bottom';
   if(b.routingAccommodation?.interfaceFace)face=b.routingAccommodation.interfaceFace;
   if(boxId==='pcdu'&&groupId==='array'&&af.id!=='redwire-platform'&&boxById[fromId].statorBodyPositionM?.[0]>0)face='right';
   // Inline arm root banks approach from opposite bus faces. Their PCDU
   // receptacles face the matching side service aisle, retaining space along
   // Z for an independently conserved mating reservoir for every conductor.
   if(boxId==='pcdu'&&groupId==='array'&&af.id==='starcloud-inline')face=deploymentLayout(h).wings[boxById[fromId].instance]?.side<0?'left':'right';
   // The rack's forward connector face looks directly into the compute core.
   // Battery feeders use the unobstructed lower service tray instead.
   if(boxId==='pcdu'&&groupId==='primary'&&af.id==='orbital-rack')face='bottom';
   const axis=face==='left'||face==='right'?0:face==='front'||face==='back'?2:1,sign=['left','back','bottom'].includes(face)?-1:1,normal=[0,0,0];normal[axis]=sign;const local=[0,0,0];local[axis]=sign*b.dimensionsM[axis]/2;const other=[0,1,2].filter(x=>x!==axis);local[other[0]]=(((n%4)+.5)/4-.5)*b.dimensionsM[other[0]]*.78;local[other[1]]=(((Math.floor(n/4)%4)+.5)/4-.5)*b.dimensionsM[other[1]]*.70;const port={id:id+':'+suffix,boxId,itemId:b.itemId,label:(suffix==='from'?'J':'P')+'-'+id,positionM:local,normal,face,connectorTypeId:typeId,connectorItemId:null,kind,signal:signal||(kind==='power'?'Dedicated supply and return':kind==='control'?'SpaceWire Type A / LVDS':kind==='data'?'Optical payload packet lane group':'50 Ω RF'),voltageV,currentA,rateMbps,quantity,proposedPinout:true};ports.push(port);graph.portById[port.id]=port;return port;};
  const from=makePort(fromId,'from',fromFace),to=makePort(toId,'to',toFace),fromPose=electricalPortPose(h,graph,from.id),toPose=electricalPortPose(h,graph,to.id);
  const routing={kind,bodyBoundsM:[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM],lane:{power:0,control:2,data:4,rf:6}[kind]||0,bendRadiusM:kind==='data'?.06:kind==='rf'?.045:.035};
  const route=routeElectricalHarness(fromPose.positionM,toPose.positionM,{fromNormal:fromPose.normal,toNormal:toPose.normal,...routing}),routeLengthM=electricalRouteLength(route),moving=!(boxById[fromId].frame==='payload'&&boxById[toId].frame==='payload')&&(electricalBoxMoves(boxById[fromId])||electricalBoxMoves(boxById[toId])),cutLengthM=routeLengthM*1.15+.30+(moving?.40:0),wire=conductorFor(currentA,operatingVoltageMinV||voltageV,cutLengthM,minimumAreaMM2,type.acceptedWireAWG),cableDiameterM=kind==='power'?Math.max(.004,Math.sqrt(wire.areaMM2*4/Math.PI)*.003):kind==='data'?.006:kind==='rf'?.0036:.005;
  routing.bendRadiusM=Math.max(routing.bendRadiusM,(moving?15:10)*cableDiameterM);
  const pinout=kind==='power'?typeId.startsWith('hv-single')?[{from:'HV+',to:'HV+',net:'Supply',conductor:'1 dedicated positive conductor'},{from:'HV−',to:'HV−',net:'Return',conductor:'1 independent return conductor'}]:[{from:'A',to:'A',net:'Supply',conductor:'Red identifier; '+wire.awg+' AWG copper'},{from:'B',to:'B',net:'Return',conductor:'Black identifier; '+wire.awg+' AWG copper'}]:kind==='control'?[{from:'1',to:'9',net:'DIN+ / DOUT+',conductor:'Differential data pair'},{from:'6',to:'5',net:'DIN− / DOUT−',conductor:'Differential data pair'},{from:'2',to:'8',net:'SIN+ / SOUT+',conductor:'Differential strobe pair'},{from:'7',to:'4',net:'SIN− / SOUT−',conductor:'Differential strobe pair'},{from:'9',to:'1',net:'DOUT+ / DIN+',conductor:'Differential data pair'},{from:'5',to:'6',net:'DOUT− / DIN−',conductor:'Differential data pair'},{from:'8',to:'2',net:'SOUT+ / SIN+',conductor:'Differential strobe pair'},{from:'4',to:'7',net:'SOUT− / SIN−',conductor:'Differential strobe pair'},{from:'3',to:'3',net:'UNPOPULATED',conductor:'No contact or wire'},{from:'Shell',to:'Shell',net:'Shield / chassis',conductor:'Inner and outer shields to connector shells; no shield used as power return'}]:kind==='data'?type.fiberType?[{from:'Tx fiber',to:'Rx fiber',net:'WDM transmit to receive',conductor:'One OS2 single-mode fiber carries the four LR4 wavelengths; duplex polarity is retained through the mapped rotary channel'},{from:'Rx fiber',to:'Tx fiber',net:'WDM receive from transmit',conductor:'Independent reverse-direction OS2 fiber; no electrical return or ground path'}]:[{from:'Fibers 1–4',to:'Fibers 12–9',net:'Transmit to receive',conductor:'OM4, Type B polarity; transceiver lane map is a controlled ICD item'},{from:'Fibers 9–12',to:'Fibers 4–1',net:'Receive from transmit',conductor:'OM4; center positions5–8 unused; installed fiber count follows the selected cable assembly'}]:[{from:'Center',to:'Center',net:'RF',conductor:'50 Ω coax inner conductor'},{from:'Shell',to:'Shell',net:'RF shield',conductor:'Continuous coax shield'}];
  const resistanceOhm=kind==='power'?wire.resistanceOhm+4*type.contactResistanceBudgetOhm:kind==='control'?2*2.10e-8*cutLengthM/(.129e-6)+4*type.contactResistanceBudgetOhm:0;
  const estimatedCableKg=kind==='power'?2*cutLengthM*wire.areaMM2*1e-6*8960*1.4:cutLengthM*(kind==='data'?.020:kind==='control'?.045:.035),connectorPairs=kind==='power'&&typeId.startsWith('hv-single')?2:1;
  const harness={id,itemId:group.itemId,wbs:group.wbs,parentWbs:group.parentWbs,label:boxById[fromId].label+' → '+boxById[toId].label,kind,groupId,fromPortId:from.id,toPortId:to.id,fromBoxId:fromId,toBoxId:toId,quantity,connectorTypeId:typeId,connectorPairsPerAssembly:connectorPairs,totalMatedInterfacesPerAssembly:2*connectorPairs,voltageV,operatingVoltageMinV:operatingVoltageMinV||voltageV,currentA,rateMbps,wire:{...wire,conductorCount:kind==='power'?2:kind==='control'?8:kind==='data'?12:1,construction:kind==='power'?(voltageV>300?'Supplier-selected ≥1 kV insulated stranded copper; independent polarity jackets':'GS22759-family stranded copper, selected gauge and verified temperature/voltage class'):kind==='control'?'Four individually shielded 100 Ω differential twisted pairs; outer braid, SpaceWire Type A':kind==='data'?'OM4 50/125 μm multimode optical cable, 12 fibers':'Times Microwave TFlex40250 Ω flexible coax',sourceIds:[kind==='control'?'el-spacewire':kind==='data'?'el-fiber':kind==='rf'?'el-rf':'el-wire']},pinout,routeLengthM,cutLengthM,slackFraction:.15,terminationAllowanceM:.30,dynamicAllowanceM:moving?.40:0,cableDiameterM,bendRadiusM:routing.bendRadiusM,routing,minimumBendRatio:moving?15:10,shieldTermination:kind==='power'?'Dedicated paired return; chassis is not a current return':kind==='data'?'Dielectric fibers; connector mechanical shell bonded as applicable':'360° shield-to-shell; both ends to declared chassis scheme',strainRelief:'Support cable near each backshell; preserve accessible mating and unmating clearance; clamp spans and dynamic-life test enter the controlled build drawing.',mating:'Complementary mating interfaces with unique harness and endpoint identifiers; torque/retention per the selected supplier drawing',resistanceOhm,voltageDropV:currentA*resistanceOhm,powerLossW:currentA*currentA*resistanceOhm,estimatedCableKg,estimatedConnectorKg:2*connectorPairs*type.estimatedPairKg,allocatedCableKg:0,allocatedConnectorKg:0,sourceIds:[...new Set(['el-project','el-nasa-workmanship',...type.sourceIds,kind==='data'?'el-fabric':kind==='control'?'el-spacewire':'el-wire'])],status:'proposed-build-definition',supplierApproval:'open',notes:notes+(moving?' Moving interface: final life-qualified flex-loop/slip-ring selection and travel limits require hardware evidence.':''),buildChecks:{polarity:true,pointToPoint:true,shield:true,continuity:kind!=='data',insulation:kind==='power'||kind==='control',opticalPolarity:kind==='data',mating:true},procurementRelease:'Engineering build specification; supplier-approved order suffixes, environmental qualification and as-built release remain open.'};
  harnesses.push(harness);group.harnessIds.push(id);group.quantity+=quantity;
  for(const port of [from,to]){const c={id:'C-'+port.id,portId:port.id,harnessId:id,typeId,itemId:null,label:port.label,role:port===from?'source interface':'destination interface',quantity:quantity*connectorPairs,connectorPairsPerAssembly:connectorPairs,fromItemId:boxById[port.boxId].itemId,gender:port===from?'panel receptacle + cable plug':'panel receptacle + cable plug',sourceIds:type.sourceIds};connectors.push(c);group.connectorIds.push(c.id);}
  return harness;
 };
 // Each physically distinct endpoint is retained. Repeated parallel circuits
 // have a declared quantity, avoiding an unbounded forest of identical meshes.
 const primaryCurrent=e.distribution.feedRatingA,primaryType=e.family.primaryV>300?'hv-single':'power-36-2';
 const batteryBoxes=boxes.filter(b=>b.id.startsWith('battery-'));
 batteryBoxes.forEach((b,i)=>connect('P-BAT-'+(i+1),'primary',b.id,'pcdu',{voltageV:e.family.primaryV,currentA:e.peakBusDemandKW*1000/e.family.primaryV/Math.max(1,batteryBoxes.length)/Math.max(1,Math.ceil(e.peakBusDemandKW*1000/e.family.primaryV/Math.max(1,batteryBoxes.length)/primaryCurrent)),quantity:Math.max(1,Math.ceil(e.peakBusDemandKW*1000/e.family.primaryV/Math.max(1,batteryBoxes.length)/primaryCurrent)),connectorTypeId:primaryType}));
 for(let i=0;i<af.solarWingCount;i++)connect('P-SA-'+(i+1),'array','solar-root-'+(i+1),'pcdu',{voltageV:e.source.estimatedColdVocV,operatingVoltageMinV:e.family.sourceMinV,currentA:e.mppt.jointCircuitRatingA,quantity:e.mppt.perWing,connectorTypeId:e.source.estimatedColdVocV>300?(e.mppt.jointCircuitRatingA<=25.11?'hv-single-8':'hv-single'):'power-18-2',notes:'Voltage field is cold open-circuit allocation; MPPT input/current rating remains a separate operating condition.'});
 const rotary=af.id==='redwire-platform'&&boxById[redwirePayloadTransferPolicy.rotorBoxId],payloadCurrentA=e.installedElectronicsKW*1000/(Math.max(1,h.trays)*e.payload.feedsPerTray*48);
 if(rotary)graph.rotaryTransferAccounting={...redwirePayloadTransferAllocation({trayCount:h.trays,feedsPerTray:e.payload.feedsPerTray,branchCurrentA:payloadCurrentA,endpointPortGbps:f.endpointPortGbps}),componentId:redwirePayloadTransferPolicy.id,componentLabel:'Hinge-axis hybrid power / optical transfer',statorBoxId:redwirePayloadTransferPolicy.statorBoxId,rotorBoxId:redwirePayloadTransferPolicy.rotorBoxId,powerCircuits:[],opticalLinks:[],internalChannelMapping:[],qualification:'Custom spacecraft allocation using published capability classes. Procurement, vacuum/radiation suitability, hot contact resistance, life and optical loss require supplier evidence; no flight qualification is claimed.'};
 const markTransferSegment=(a,b,logicalCircuitId,segment)=>{
  a.payloadRotaryTransferId=redwirePayloadTransferPolicy.id;a.logicalCircuitId=logicalCircuitId;a.payloadTransferSegment=segment;a.payloadDestinationId=b.id;a.dynamicAllowanceM=0;a.minimumBendRatio=10;
  a.sourceIds=[...new Set([...a.sourceIds,'el-hybrid-rotary','el-hybrid-path'])];
  for(const portId of[a.fromPortId,a.toPortId]){const port=graph.portById[portId];port.payloadDestinationId=b.id;port.logicalCircuitId=logicalCircuitId;port.payloadTransferSegment=segment;}
  return a;
 };
 for(const b of boxes.filter(b=>b.id.startsWith('compute-'))){
  const id='P-PAY-'+(b.instance+1),options={voltageV:48,currentA:payloadCurrentA,quantity:e.payload.feedsPerTray};
  if(!rotary){connect(id,'payload','pcdu',b.id,options);continue;}
  const side=redwirePayloadServiceFace(b,h),up=markTransferSegment(connect(id,'payload','pcdu',redwirePayloadTransferPolicy.statorBoxId,{...options,toFace:side,notes:'Fixed body section of a split payload power circuit; its mapped supply and return traverse the actual hinge-axis rotary component.'}),b,id,'body'),down=markTransferSegment(connect(id+'-PLATFORM','payload',redwirePayloadTransferPolicy.rotorBoxId,b.id,{...options,fromFace:side,notes:'Rigid platform section from the rotor terminal bank to the computer side interface, supported in the mounted cable raceway.'}),b,id,'platform');
  up.additionalRotaryResistanceOhm=graph.rotaryTransferAccounting.loopResistanceOhm;up.rotaryLossAccounting='The complete supply-plus-return transfer resistance (sliding contacts plus declared contained leads) is charged on this upstream section only.';
  const circuit={id,kind:'power',quantity:up.quantity,loadBoxId:b.id,upstreamHarnessId:up.id,downstreamHarnessId:down.id,statorPortId:up.toPortId,rotorPortId:down.fromPortId,currentA:up.currentA,conductors:2,parallelPathsPerConductor:redwirePayloadTransferPolicy.parallelPathsPerConductor,loopResistanceOhm:up.additionalRotaryResistanceOhm,voltageV:48};
  graph.rotaryTransferAccounting.powerCircuits.push(circuit);
  for(let instance=0;instance<circuit.quantity;instance++)for(const conductor of['supply','return'])graph.rotaryTransferAccounting.internalChannelMapping.push({id:id+':'+instance+':'+conductor,kind:'power',logicalCircuitId:id,instance,conductor,fromPortId:up.toPortId,toPortId:down.fromPortId,parallelPaths:redwirePayloadTransferPolicy.parallelPathsPerConductor,powerContactIds:Array.from({length:redwirePayloadTransferPolicy.parallelPathsPerConductor},(_,path)=>'power-contact-'+((b.instance*circuit.quantity+instance)*8+(conductor==='return'?4:0)+path+1)),fromContact:conductor==='supply'?'A':'B',toContact:conductor==='supply'?'A':'B',currentDirection:conductor==='supply'?'stator-to-rotor':'rotor-to-stator',allocatedCurrentA:graph.rotaryTransferAccounting.allocatedCurrentPerBranchA,requiredCurrentA:up.currentA,polarityPreserved:true});
 }
 const serviceLoads=[['avionics',h.cdh?.operatingW||45],['attitude',12],['cmg-control',h.cmg?.maneuverW||300],['prop-control',150],['deployment-control',60],['recorder',Math.max(1,h.storageKw*1000)],...boxes.filter(b=>b.id.startsWith('fabric-')).map(b=>[b.id,f.activeKW*1000/Math.max(1,f.switchCount)]),...boxes.filter(b=>b.id.startsWith('ka-')||b.id.startsWith('optical-')).map(b=>[b.id,b.id.startsWith('ka-')?205:240]),...(boxById['sband-radio']?[['sband-radio',35]]:[])];
 for(const [boxId,powerW] of serviceLoads){const voltageV=boxId.startsWith('fabric-')||boxId==='recorder'?48:28,current=powerW/voltageV,q=Math.max(1,Math.ceil(current/25.11));connect('P-SVC-'+boxId,'service','pcdu',boxId,{voltageV,operatingVoltageMinV:voltageV===28?22:43.2,currentA:current/q,quantity:q,notes:'22 V service and 43.2 V payload minimums are preliminary project interface allocations. Current is the allocated peak load at nominal voltage; reduced-voltage constant-power behavior requires a separate sensitivity case. Load is included in its existing MEL equipment allocation; this harness creates no second equipment load.'});}
 for(const b of boxes.filter(b=>['attitude','cmg-control','prop-control','deployment-control','pcdu','sband-radio'].includes(b.id)||b.id.startsWith('ka-')||b.id.startsWith('optical-')))connect('C-'+b.id,'control','avionics',b.id,{rateMbps:100,signal:'SpaceWire Type A / LVDS; adapter electronics allocated at the equipment boundary',notes:'Project gateway/adapter implementation, not a claim that a cited supplier box already exposes this interface.'});
 connect('C-PAYLOAD-MGMT','control','avionics','fabric-1',{rateMbps:100,notes:'Protected management gateway carries commands/status only; bulk customer traffic stays in the payload fabric.'});
 connect('C-EGSE','egse','egse','avionics',{rateMbps:100,notes:'Flight-side checkout port and bounded internal harness. The removable external EGSE cable is ground equipment, excluded from flight mass.'});
 connect('RF-GNSS','rf','gnss-antenna','avionics',{signal:'50 Ω GNSS L-band RF; 1 PPS/time stays inside avionics',notes:'Antenna/receiver matching, noise figure and sky-view analysis are open; the coax path and physical antenna are explicit.'});
 for(const b of boxes.filter(b=>b.id.startsWith('sband-patch-')))connect('RF-S-'+(b.instance+1),'rf','sband-radio',b.id,{signal:'50 Ω S-band RF',notes:'S-band antenna feeder only; optical payload traffic never traverses the command-radio coax.'});
 if(boxById['thermal-drive']){const hp=e.heatPumpDrive,kw=hp.peakEndpointKW||h.energySystem.thermal.pumpNominalKW,voltageV=hp.peakEndpointKW>0?hp.voltageV:28,q=Math.max(1,Math.ceil(kw*1000/(voltageV*50)));connect('P-THERMAL','thermal','pcdu','thermal-drive',{voltageV,currentA:kw*1000/(voltageV*q),quantity:q});connect('C-THERMAL','control','avionics','thermal-drive',{rateMbps:100});}
 const leafIds=boxes.filter(b=>b.fabricIndex<f.leafCount).map(b=>b.id),spineIds=boxes.filter(b=>b.fabricIndex>=f.leafCount).map(b=>b.id),workers=boxes.filter(b=>b.id.startsWith('compute-'));
 workers.forEach((b,i)=>{
  const id='D-WORKER-'+(i+1),leaf=leafIds[Math.floor(i/f.leafEndpointPorts)]||leafIds.at(-1),options={rateMbps:f.endpointPortGbps*1000};
  if(!rotary){connect(id,'fabric',leaf,b.id,{...options,notes:'One complete optical lane group per payload endpoint. Card-level chip/NVLink or PCIe interconnects remain in the tray.'});return;}
  const side=redwirePayloadServiceFace(b,h),type=redwirePayloadTransferPolicy.opticalConnectorTypeId,up=markTransferSegment(connect(id,'fabric',leaf,redwirePayloadTransferPolicy.statorBoxId,{...options,connectorTypeId:type,toFace:side,notes:'Fixed single-mode worker link section. LR4 endpoint optics carry all four WDM lanes over one transmit and one receive fiber.'}),b,id,'body'),down=markTransferSegment(connect(id+'-PLATFORM','fabric',redwirePayloadTransferPolicy.rotorBoxId,b.id,{...options,connectorTypeId:type,fromFace:side,notes:'Rigid duplex OS2 platform section, supported beside the power circuit. Optical loss is assessed over both sections and the mapped rotary channels together.'}),b,id,'platform');
  graph.rotaryTransferAccounting.opticalLinks.push({id,kind:'data',loadBoxId:b.id,upstreamHarnessId:up.id,downstreamHarnessId:down.id,statorPortId:up.toPortId,rotorPortId:down.fromPortId,channels:[2*i+1,2*i+2],physicalLineRateMbps:redwirePayloadTransferPolicy.opticalLineRateMbps,allocatedRateMbps:options.rateMbps,transceiverReference:'NVIDIA MMA1L10-CR revision A2+',interface:redwirePayloadTransferPolicy.opticalInterface});
  for(const [j,direction]of['transmit','receive'].entries())graph.rotaryTransferAccounting.internalChannelMapping.push({id:id+':'+direction,kind:'data',logicalCircuitId:id,channel:2*i+j+1,direction,fromPortId:j===0?up.toPortId:down.fromPortId,toPortId:j===0?down.fromPortId:up.toPortId,fromContact:'Rx fiber',toContact:'Tx fiber',fiberType:'OS2 single-mode',wavelengthsNm:[1295.56,1300.05,1304.58,1309.14],polarityPreserved:true});
 });
 let gateway=workers.length;
 for(const id of ['recorder',...boxes.filter(b=>b.id.startsWith('ka-')||b.id.startsWith('optical-')).map(b=>b.id)]){const leaf=leafIds[Math.floor(gateway++/f.leafEndpointPorts)]||leafIds.at(-1);connect('D-'+id,'fabric',leaf,id,{rateMbps:f.endpointPortGbps*1000,notes:'The physical fabric link capacity is independent of Earth contact, modem rate and customer goodput.'});}
 for(let i=0;i<leafIds.length;i++)for(let j=0;j<spineIds.length;j++)connect('D-L'+(i+1)+'-S'+(j+1),'fabric',leafIds[i],spineIds[j],{rateMbps:f.endpointPortGbps*1000,quantity:f.linksPerLeafSpine||1});
 const cardDefs=[['processor','08.01.10','Flight processor',2.4,14,'Execute time-tagged commands, flight modes and safety interlocks.',['SpaceWire router / I/O','Engineering recorder','Backplane time and reset']],['converter','08.01.11','Avionics input converter',1.6,5,'Convert the protected 28 V service input to isolated low-voltage card rails.',['28 V input','5 V / 3.3 V allocated rails','Power-good / reset']],['io','08.01.12','Command and remote I/O card',1.6,8,'Bridge the command radio, sensors, actuator gateways and spacecraft time.',['100 Mbit/s SpaceWire Type A','Discrete inhibit / enable','1 PPS / time-tag']],['recorder','08.01.13','Engineering recorder card',1.2,6,'Retain spacecraft housekeeping independently from customer bulk storage.',['Backplane packet stream',h.input.hkRecorderMB+' MB allocated ring','Readback / dump interface']],['gnss','08.01.14','GNSS receiver and time interface',1,7,'Provide navigation/time observations through the flight computer interface.',['GNSS RF input','1 PPS','10 Hz proposed state interface']],['backplane','08.01.15','Avionics backplane and enclosure',3.9,5,'Distribute protected card power, clock, reset and chassis bonding.',['Card connectors','Chassis bond','Protected service return']]];
 cardDefs.forEach(([id,wbs,label,massKg,powerW,purpose,interfaces],i)=>cards.push({id:'card-'+id,itemId:'flight:'+wbs,wbs,parentId:'flight:08.01',parentBoxId:'avionics',label,massKg,powerW,positionM:[0,-.08+i*.032,0],dimensionsM:[.22,.018,.12],purpose,interfaces,sourceIds:['el-project','el-nasa-avionics','el-moog-iau'],basis:'Project functional/card decomposition within the existing 12 kg / 45 W suite; not a Moog internal board drawing or purchased card specification.'}));
 cards.push({id:'antenna-gnss',itemId:'flight:08.01.16',wbs:'08.01.16',parentId:'flight:08.01',parentBoxId:'gnss-antenna',external:true,label:'GNSS antenna and mount',massKg:.3,powerW:0,positionM:[0,0,0],dimensionsM:[.10,.035,.10],purpose:'Receive navigation RF with a visible body-mounted antenna and declared coax feeder.',interfaces:['50 Ω GNSS RF','Chassis mounting/bond'],sourceIds:['el-project','el-nasa-avionics'],basis:'0.30 kg preliminary allocation transferred from the suite enclosure share; receiver capability and supplier antenna selection remain open.'});
 // Select a buildable contact/conductor combination against the resolved
 // route, not only the load current. Repacking follows a changed shell size.
 for(let pass=0;pass<4;pass++){
  packElectricalPorts(graph,h);for(const a of harnesses)refreshHarnessGeometry(h,graph,a);
  updateRedwirePayloadTransferAccounting(graph);
  const failedTransferSegments=new Set((graph.rotaryTransferAccounting?.powerCircuits||[]).filter(c=>!c.voltageDropWithin).flatMap(c=>[c.upstreamHarnessId,c.downstreamHarnessId]));
  let changed=false;
  for(const a of harnesses){if(a.kind!=='power'||(a.wire.supported&&a.voltageDropV<=a.operatingVoltageMinV*.02&&!failedTransferSegments.has(a.id)))continue;
   const order=a.voltageV>300?['hv-single-8','hv-single']:['service-16','power-18-2','power-24-2','power-36-2'],next=order[order.indexOf(a.connectorTypeId)+1];if(!next)continue;
   a.connectorTypeId=next;const type=connectorSelections[next];a.estimatedConnectorKg=2*a.connectorPairsPerAssembly*type.estimatedPairKg;a.sourceIds=[...new Set([...a.sourceIds,...type.sourceIds])];
   for(const id of [a.fromPortId,a.toPortId])graph.portById[id].connectorTypeId=next;
   for(const c of connectors.filter(c=>c.harnessId===a.id)){c.typeId=next;c.sourceIds=type.sourceIds;}
   changed=true;
  }
  if(!changed)break;
 }
 packElectricalPorts(graph,h);for(const a of harnesses)refreshHarnessGeometry(h,graph,a);
 declareInlineRootRouting(h,graph);
 updateRedwirePayloadTransferAccounting(graph);
 if(rotary)graph.installationHardware.push(...redwireHarnessInstallationHardware(h,graph));
 const connectorGroups=new Map();
 for(const c of connectors){const a=harnesses.find(h=>h.id===c.harnessId),parent=a.parentWbs,key=parent+'|'+c.typeId;let g=connectorGroups.get(key);if(!g){const index=Object.keys(connectorSelections).indexOf(c.typeId),wbs=parent+'.'+(parent==='01.04'?50+index:60+index);g={id:key,itemId:'flight:'+wbs,wbs,parentId:'flight:'+parent,parentWbs:parent,label:connectorSelections[c.typeId].label,typeId:c.typeId,portIds:[],connectorIds:[],quantity:0,allocatedMassKg:0,estimatedMassKg:0,exemplarPortId:c.portId};connectorGroups.set(key,g);}g.portIds.push(c.portId);g.connectorIds.push(c.id);g.quantity+=c.quantity;g.estimatedMassKg+=c.quantity*connectorSelections[c.typeId].estimatedPairKg;c.itemId=g.itemId;graph.portById[c.portId].connectorItemId=g.itemId;}
 const budgets={'07.05':h.massLedger.find(r=>r.id==='cables')?.kg||0,'01.04':f.cableMassKg||0};
 for(const parent of Object.keys(budgets)){
  const hs=harnesses.filter(a=>a.parentWbs===parent),required=sum(hs.map(a=>a.quantity*(a.estimatedCableKg+a.estimatedConnectorKg))),factor=required>0?budgets[parent]/required:0;
  for(const a of hs){a.allocatedCableKg=a.estimatedCableKg*factor;a.allocatedConnectorKg=a.estimatedConnectorKg*factor;groupMap[a.groupId].estimatedMassKg+=a.quantity*a.estimatedCableKg;groupMap[a.groupId].allocatedMassKg+=a.quantity*a.allocatedCableKg;}
  for(const g of connectorGroups.values())if(g.parentWbs===parent)g.allocatedMassKg=g.estimatedMassKg*factor;
  graph.massAccounting[parent]={parentId:'flight:'+parent,allocatedKg:budgets[parent],estimatedRequiredKg:required,allocationToEstimateRatio:factor,marginKg:budgets[parent]-required,basis:parent==='01.04'?'Existing payload fabric cable allowance, including its terminations; switch/NIC hardware remains in the parent.':'Existing installed cable/harness allocation, distributed across wire and termination details; no additional spacecraft mass is added.'};
 }
 graph.assemblies=Object.values(groupMap).filter(g=>g.quantity>0).map(g=>({...g,exemplarHarnessId:g.harnessIds[0],scope:'One representative assembly shown; quantity and the build list retain every installed endpoint.',sourceIds:[...new Set(g.harnessIds.flatMap(id=>harnesses.find(h=>h.id===id).sourceIds))]}));
 graph.connectorDetails=[...connectorGroups.values()];
 graph.totalHarnessAssemblies=sum(harnesses.map(a=>a.quantity));graph.totalCableLengthM=sum(harnesses.map(a=>a.quantity*a.cutLengthM));graph.totalConnectorInterfaces=sum(connectors.map(c=>c.quantity));graph.totalPhysicalCableSections=sum(harnesses.map(a=>a.physicalRouteSections?.length||a.quantity*(a.connectorTypeId.startsWith('hv-single')?2:1)));graph.totalRotaryContactInterfaces=sum((graph.rotaryTransfers||[]).map(t=>graph.harnesses.find(a=>a.id===t.harnessId).quantity*t.slidingContactsPerAssembly))+(graph.rotaryTransferAccounting?.powerPasses||0);
 graph.groundHarnesses=[groundElectricalLead(graph)];
 cache.set(h,graph);graphOwners.set(graph,h);
 if(af.id==='redwire-platform'){
  const takeoff=retainedHarnessTakeoff(h,graph);
  if(takeoff)reconcileInstalledElectricalRouting(graph,takeoff.records,{source:takeoff.source});
  else adoptRedwireHarnessMass(h,graph,{connectorSelections});
 }
 graph.checks=inspectElectricalArchitecture(graph);
 return graph;
}

// A paired inline arm has an explicit two-axis electrical root transfer.
// Every original conductor therefore has two physical cable sections. These
// interface records are separate from the ordinary equipment-panel packing:
// the root transfer adapter owns their real, independently checked datums.
function declareInlineRootRouting(h,graph){
 if(architectureFamily(h).id!=='starcloud-inline')return;
 graph.routingPorts=[];graph.rotaryTransfers=[];const layout=deploymentLayout(h);
 for(const a of graph.harnesses.filter(a=>a.groupId==='array')){
  const type=connectorSelections[a.connectorTypeId],polarities=a.connectorTypeId.startsWith('hv-single')?2:1,count=a.quantity*polarities,wing=layout.wings[graph.boxById[a.fromBoxId].instance],componentId='inline-root-transfer:'+wing.bankEnd;
  a.routingArchitecture='two-axis-root-transfer-and-articulated-arm';a.physicalRouteSections=[];
  const interfaces={};for(const role of ['stator','rotor']){
   const id=a.id+':root-'+role,port={id,boxId:componentId,itemId:a.itemId,harnessId:a.id,label:a.label+' root '+role,kind:a.kind,connectorTypeId:a.connectorTypeId,quantity:a.quantity,physicalConductorCount:count,interfaceRole:role,bankEnd:wing.bankEnd,frame:role==='stator'?'body':'radiator-first-leaf',datumProvider:'inline-root-electrical-transfer',interfaceBasis:'Explicit allocated rotary-root receptacle bank; positions are registered against the actual adapter anchors.'};graph.routingPorts.push(port);graph.portById[id]=port;interfaces[role]=id;
   graph.connectors.push({id:'C-'+id,portId:id,harnessId:a.id,typeId:a.connectorTypeId,itemId:null,label:port.label,role:'Rotary root '+role+' termination',quantity:a.quantity*a.connectorPairsPerAssembly,connectorPairsPerAssembly:a.connectorPairsPerAssembly,fromItemId:'flight:02.01',gender:'panel receptacle + cable plug',sourceIds:[...type.sourceIds,'el-project']});
  }
  for(let i=0;i<count;i++){const circuitId=a.id+'/'+i;a.physicalRouteSections.push({id:circuitId+'/arm',circuitId,section:'arm',fromPortId:a.fromPortId,fromInstance:i,toPortId:interfaces.rotor,toInstance:i},{id:circuitId+'/body',circuitId,section:'body',fromPortId:interfaces.stator,fromInstance:i,toPortId:a.toPortId,toInstance:i});}
  a.rootTransfer={componentId,bankEnd:wing.bankEnd,statorPortId:interfaces.stator,rotorPortId:interfaces.rotor,rotaryStages:2,physicalConductorCount:count,slidingContactsPerAssembly:4,projectContactResistanceBudgetOhm:.001,basis:'Four sliding contacts in each positive/return circuit across two axes. One milliohm per sliding contact is a project loss budget to verify, not a supplier capability or measured resistance.',qualification:'Supplier voltage/current, isolation, loss, wear and life evidence remains open.'};
  a.matedContactCount=8;a.additionalRotaryResistanceOhm=4*a.rootTransfer.projectContactResistanceBudgetOhm;a.totalMatedInterfacesPerAssembly=4*a.connectorPairsPerAssembly;a.estimatedConnectorKg=a.totalMatedInterfacesPerAssembly*type.estimatedPairKg;a.procurement.matingPairs=a.totalMatedInterfacesPerAssembly;a.procurement.physicalSectionsPerConductor=2;a.procurement.rotaryTransfer=a.rootTransfer;
  a.resistanceOhm=a.wire.resistanceOhm+a.matedContactCount*type.contactResistanceBudgetOhm+a.additionalRotaryResistanceOhm;a.voltageDropV=a.currentA*a.resistanceOhm;a.powerLossW=a.currentA*a.currentA*a.resistanceOhm;a.additionalRotaryLossW=a.currentA*a.currentA*a.additionalRotaryResistanceOhm;
  graph.rotaryTransfers.push({id:componentId,harnessId:a.id,partId:'flight:02.01',...a.rootTransfer});
 }
}

// Reconcile the build list with the installed geometry. Longer detours must
// change resistance, loss and material take-off as well as the displayed cut
// length. This never silently changes the gauge/connector of an existing mesh.
export function reconcileInstalledElectricalRouting(graph,records,{source={kind:'native-installed-routing'}}={}){
 for(const a of graph.harnesses){
  const rows=records.filter(r=>r.harnessId===a.id);if(!rows.length)throw new Error('Missing installed harness '+a.id);
  if(rows.some(r=>!Number.isFinite(r.lengthM)||r.lengthM<=0))throw new Error('Invalid installed length '+a.id);
  a.installedRoutes=rows.map(r=>({...r,cutLengthM:r.lengthM+a.terminationAllowanceM}));
  a.routeLengthM=Math.max(...rows.map(r=>r.lengthM));a.installedRouteLengthM=a.routeLengthM;a.cutLengthM=a.routeLengthM+a.terminationAllowanceM;
  a.minimumRenderedBendRadiusM=Math.min(...rows.map(r=>r.minimumBendRadiusM));a.routeBendLimited=rows.some(r=>r.minimumBendRadiusM+1e-7<a.bendRadiusM);
  a.routeBasis='Installed collision-routed centreline, including explicit flex reservoirs; termination allowance remains inside the build assembly. See individual circuit cuts.';
  a.procurement.cutLengthM=a.cutLengthM;a.procurement.individualCuts=a.installedRoutes.map(r=>({id:r.id,lengthM:r.cutLengthM}));
  const type=connectorSelections[a.connectorTypeId],cut=a.cutLengthM;
  if(a.kind==='power'){
   const required=conductorFor(a.currentA,a.operatingVoltageMinV,cut,.205,type.acceptedWireAWG);a.wire.requiredAreaMM2=required.requiredAreaMM2;a.wire.supported=a.wire.areaMM2>=required.requiredAreaMM2;
   a.wire.resistanceOhm=2*2.10e-8*cut/(a.wire.areaMM2*1e-6);a.resistanceOhm=a.wire.resistanceOhm+(a.matedContactCount??4)*type.contactResistanceBudgetOhm+(a.additionalRotaryResistanceOhm||0);a.voltageDropV=a.currentA*a.resistanceOhm;a.powerLossW=a.currentA*a.currentA*a.resistanceOhm;a.estimatedCableKg=2*cut*a.wire.areaMM2*1e-6*8960*1.4;
  }else{
   a.estimatedCableKg=cut*(a.kind==='data'?(type.cableMassKgPerM||.020):a.kind==='control'?.045:.0491);
   if(a.kind==='control'){a.wire.resistanceOhm=2*2.10e-8*cut/(.129e-6);a.resistanceOhm=a.wire.resistanceOhm+4*type.contactResistanceBudgetOhm;}
   if(a.kind==='rf')a.insertionLossDb=(.011844*Math.sqrt(a.rfFrequencyMHz)+.000033*a.rfFrequencyMHz)*cut+.30;
   if(a.kind==='data'){a.procurement.catalogLengthM=[3,5,7,10,15,20,30,50,100].find(n=>n>=cut)||null;a.procurement.partNumber=null;a.procurement.lengthBasis='Supplier-confirmed individual cut lengths; longer catalogue stock requires separately modeled slack storage.';}
  }
 }
 for(const group of graph.assemblies){group.estimatedMassKg=0;group.allocatedMassKg=0;group.scope='Every installed circuit has a physical route and individual cut record.';}
 for(const [parent,m] of Object.entries(graph.massAccounting)){
  const hs=graph.harnesses.filter(a=>a.parentWbs===parent),required=sum(hs.map(a=>a.quantity*(a.estimatedCableKg+a.estimatedConnectorKg))),factor=required?m.allocatedKg/required:0;
  Object.assign(m,{estimatedRequiredKg:required,allocationToEstimateRatio:factor,marginKg:m.allocatedKg-required});
  for(const a of hs){a.allocatedCableKg=a.estimatedCableKg*factor;a.allocatedConnectorKg=a.estimatedConnectorKg*factor;const g=graph.assemblies.find(g=>g.id===a.groupId);g.estimatedMassKg+=a.quantity*a.estimatedCableKg;g.allocatedMassKg+=a.quantity*a.allocatedCableKg;}
  for(const g of graph.connectorDetails)if(g.parentWbs===parent)g.allocatedMassKg=g.estimatedMassKg*factor;
 }
 graph.totalCableLengthM=sum(graph.harnesses.map(a=>a.quantity*a.cutLengthM));graph.installedRoutingRevision='installed-routing-r1';
 const h=graphOwners.get(graph);
 if(h?.architectureFamilyId==='redwire-platform'){
  rememberHarnessTakeoff(h,graph,records,source);
  adoptRedwireHarnessMass(h,graph,{installed:true,source,connectorSelections});
 }
 updateRedwirePayloadTransferAccounting(graph);
 graph.checks=inspectElectricalArchitecture(graph);return graph;
}

// The scene may retain the same physical craft across a mission-only change.
// Reuse its real circuit cuts for the new sized hardware only after the caller
// has confirmed an unchanged physical layout. Interface checks here prevent a
// topology/gauge change from borrowing the retained craft's material takeoff.
export function reconcileRedwireInstalledMassFromCraft(h,craft){
 if(h.architectureFamilyId!=='redwire-platform'||!craft?.electrical?.routing?.lines)return false;
 const graph=buildElectricalArchitecture(h),actual=craft.electrical.architecture;
 const key=g=>canonical(g.harnesses.map(a=>[a.id,a.quantity,a.connectorTypeId,a.wire.areaMM2,a.cableDiameterM,a.bendRadiusM]));
 if(key(graph)!==key(actual))return false;
 const before=h.electricalMassRevision||0;
 const records=craft.electrical.routing.lines.map(line=>({id:line.id,harnessId:line.r.spec.id,lengthM:line.restLengthM,minimumBendRadiusM:line.minimumStaticBendM,planningPassed:!line.planningIssues&&!line.servicePlanningIssues}));
 reconcileInstalledElectricalRouting(graph,records,{source:{kind:'current-scene-installed-route-takeoff'}});
 return h.electricalMassRevision!==before;
}

export function groundElectricalLead(graph){
 const a=graph.harnesses.find(a=>a.id==='C-EGSE'),fromBox={id:'ground-egse',itemId:'ground:avionics',label:'Isolated ground checkout adapter',scope:'Ground-only interface'},toBox=graph.boxById.egse;
 const fromPort={id:'G-EGSE:from',boxId:fromBox.id,itemId:fromBox.itemId,connectorTypeId:'spacewire-a',connectorItemId:graph.portById[a.fromPortId].connectorItemId,label:'Ground checkout plug',scope:'ground'},toPort={id:'G-EGSE:to',boxId:'egse',itemId:'flight:07.05.16',connectorTypeId:'spacewire-a',connectorItemId:graph.portById[a.fromPortId].connectorItemId,label:'Flight-side checkout mating plug',scope:'ground'};
 // Ground entries are lookup-only companions, never installed flight boxes,
 // ports, route quantities or mass-accounting rows.
 graph.boxById[fromBox.id]=fromBox;graph.portById[fromPort.id]=fromPort;graph.portById[toPort.id]=toPort;
 const type=connectorSelections['spacewire-a'];return {...a,id:'G-EGSE',itemId:'ground:egse-cable',wbs:null,parentWbs:null,label:fromBox.label+' → '+toBox.label,fromBoxId:fromBox.id,toBoxId:toBox.id,fromPortId:fromPort.id,toPortId:toPort.id,quantity:1,routeLengthM:3,cutLengthM:3,slackFraction:0,terminationAllowanceM:0,dynamicAllowanceM:0,estimatedCableKg:3*.045,estimatedConnectorKg:2*type.estimatedPairKg,allocatedCableKg:0,allocatedConnectorKg:0,scope:'Removable 3 m finished bench cable, excluded from every flight quantity and mass total',procurement:{...a.procurement,cutLengthM:3,assemblyQuantity:1,scope:'Ground-only finished lead; manufacturer quote length3 m'},wire:{...a.wire,resistanceOhm:2*2.10e-8*3/(.129e-6)},notes:'A separate ground checkout lead. The flight-side internal harness is C-EGSE; ground isolation and safe-to-mate verification require the released adapter/procedure.'};
}

export function inspectElectricalArchitecture(graph){
 const checks=[],issue=(id,within,actual,limit,unit,basis,itemId,kind='analysis')=>checks.push({id,within,actual,limit,unit,basis,itemId,kind,status:within?'predicted-within-allocation':'predicted-shortfall',verificationStatus:'open'});
 for(const a of graph.harnesses){
  const type=connectorSelections[a.connectorTypeId],endpoints=!!graph.portById[a.fromPortId]&&!!graph.portById[a.toPortId];
  issue(a.id+':endpoints',endpoints,endpoints?2:0,2,'endpoints','Both ends resolve to declared equipment ports.',a.itemId,'inspection');
  if(a.kind==='power'){
   issue(a.id+':contact-current',a.currentA<=type.allocatedCurrentA,a.currentA,type.allocatedCurrentA,'A','Project contact current allocation; supplier rating and derating rationale are retained separately.',a.itemId);
   issue(a.id+':wire-area',a.wire.supported,a.wire.requiredAreaMM2,a.wire.areaMM2,'mm²','Copper area screen includes 3 A/mm² project current density and 2% wire-drop allocation; bundle/vacuum thermal derating requires characterization.',a.itemId);
   issue(a.id+':voltage-drop',a.voltageDropV<=a.operatingVoltageMinV*.02,a.voltageDropV,a.operatingVoltageMinV*.02,'V',a.rootTransfer?'Two-conductor hot-copper route, eight mated contact resistances and the declared four-contact rotary loss budget; criterion uses minimum operating voltage.':'Two-conductor hot-copper route plus four allocated single-contact resistances; criterion uses minimum operating voltage, not solar open-circuit voltage.',a.itemId);
   issue(a.id+':hv-separation',a.voltageV<=300||a.connectorTypeId.startsWith('hv-single'),a.voltageV,300,'V','NASA-STD-8739.4 A §7.2.6 high-voltage interface selection is kept distinct from DWV.',a.itemId,'inspection');
   checks.at(-1).criterionText='Single-contact interfaces above 300 V DC';
  }
  issue(a.id+':bend-radius',!a.routeBendLimited,a.minimumRenderedBendRadiusM,a.bendRadiusM,'m','Rounded cable centreline retains actual endpoints and the allocated bend radius.',a.itemId);
  if(a.kind==='power')issue(a.id+':termination',a.wire.terminationCompatible,a.wire.awg,type.acceptedWireAWG.join(' / '),'AWG','Selected conductor is accepted by the selected crimp-contact size; no unsupported wire reducer is assumed.',a.itemId,'inspection');
  if(a.kind==='rf')issue(a.id+':rf-loss',a.insertionLossDb<=a.rfLossAllocationDb,a.insertionLossDb,a.rfLossAllocationDb,'dB','Times Microwave published cable-loss relation at GNSS L1/S-band upper frequency plus 0.15 dB per cable-end connector;6 dB is a project feeder allocation.',a.itemId);
  if(a.kind==='data')issue(a.id+':line-capacity',a.rateMbps<=type.lineRateMbps,a.rateMbps,type.lineRateMbps,'Mbit/s','Selected 100G SR4/LR4 or 400G physical interface; polish, fiber type, protocol and endpoint optics must agree. Connector shape alone does not establish capability.',a.itemId);
 }
 if(graph.rotaryTransferAccounting){
  const t=graph.rotaryTransferAccounting,itemId='flight:07.08';
  issue('payload-transfer:power-pass-count',t.aggregateWithin,t.sourceClassAggregateCurrentA,t.supplierAggregateCurrentA,'A','Sum of the selected 20 A power-path capability classes remains within the cited 720 A aggregate; per-path 15 A continuous allocation is checked separately. Source maximum capabilities are not a qualified concurrent operating point.',itemId);
  issue('payload-transfer:optical-channels',t.opticalChannelsWithin,t.opticalChannels,t.maximumOpticalChannels,'channels','One transmit and one receive single-mode WDM fiber per preserved logical LR4 worker link; all internal channel mappings remain explicit.',itemId);
  for(const c of t.powerCircuits){
   issue(c.id+':rotary-current',c.currentWithin,c.requiredCurrentA,c.completeCurrentLimitA,'A','Complete current limit is the minimum of parallel rotary paths, external connector allocation and the 3 A/mm² conductor screen.',itemId);
   issue(c.id+':end-to-end-drop',c.voltageDropWithin,c.voltageDropV,c.voltageDropAllocationV,'V','Both physical harness sections, eight external mated contact resistances, the rotary contacts and contained internal leads share the same 2% supply/return drop allocation.',itemId);
  }
  for(const link of t.opticalLinks)issue(link.id+':complete-optical-link',link.within&&link.lineRateWithin,link.totalLossDb,link.linkBudgetDb,'dB','Complete LR4 path includes both harness cut lengths, all four external mating pairs, 3 dB rotary loss and 0.5 dB aging/contamination. Margin is against the 6.3 dB channel limit at the selected 100G physical rate.',itemId);
 }
 for(const p of graph.packing||[]){issue('packing:'+p.id,p.withinAllocatedEnvelope,Math.max(...p.dimensionsM),null,'m','Connector panel has unique diameter-aware physical positions; local bay and mating-tool access require mechanical review.',p.itemId,'inspection');checks.at(-1).criterionText='Fits the supported connector panel';}
 for(const c of graph.collectorAccommodations||[]){issue('collector:'+c.boxId,c.ok,c.minimumWallGapM,c.requiredWallGapM,'m',c.basis+(c.installedHardware?' '+c.installedHardware.basis:' Actual material inspection remains required when the scene is installed.'),c.itemId,'inspection');checks.at(-1).criterionText=c.installedHardware?'Complete fixed collector bank, connector strokes and approaches clear the allocated bay and installed neighbors':'Complete fixed collector bank, connector strokes and approaches fit the declared equipment envelopes';}
 for(const c of graph.carriedCollectorAccommodations||[]){issue('collector:'+c.boxId,c.ok,c.minimumAxialGapM,c.limits.clearanceM,'m',c.basis,c.itemId,'inspection');checks.at(-1).criterionText='Complete carried collector bank fits the actual root gap throughout payout and tracking';}
 for(const [parent,m] of Object.entries(graph.massAccounting))issue('mass:'+parent,m.estimatedRequiredKg<=m.allocatedKg,m.estimatedRequiredKg,m.allocatedKg,'kg','Preliminary route-based material estimate compared with the retained parent allowance; a shortfall is not hidden by suballocation.',m.parentId);
 return checks;
}

export const electricalReadinessContract=Object.freeze({
 schema:'orbital-data-center/electrical-readiness/1',
 architecture:[{path:'configurationId',type:'string'},{path:'revision',type:'string'},{path:'boxes',type:'array',minLength:1},{path:'harnesses',type:'array',minLength:1},{path:'ports',type:'array',minLength:1},{path:'cards',type:'array',minLength:1}],
 harness:[{path:'id',type:'string'},{path:'itemId',type:'string'},{path:'fromPortId',type:'string'},{path:'toPortId',type:'string'},{path:'connectorTypeId',type:'string'},{path:'quantity',type:'number',min:1,integer:true},...['routeLengthM','cutLengthM','cableDiameterM','bendRadiusM'].map(path=>({path,type:'number',exclusiveMin:0})),...['voltageV','operatingVoltageMinV','currentA','rateMbps','allocatedCableKg','allocatedConnectorKg'].map(path=>({path,type:'number',min:0})),{path:'pinout',type:'array',minLength:1},{path:'sourceIds',type:'array',minLength:1}],
 port:[{path:'id',type:'string'},{path:'boxId',type:'string'},{path:'connectorTypeId',type:'string'},{path:'positionM',type:'array',minLength:3,length:3,finiteElements:true},{path:'normal',type:'array',minLength:3,length:3,finiteElements:true},{path:'quantity',type:'number',min:1,integer:true},{path:'instanceOffsetsM',type:'array',minLength:1}],
 power:[{path:'wire.awg',type:'string'},{path:'wire.areaMM2',type:'number',exclusiveMin:0},{path:'wire.resistanceOhm',type:'number',exclusiveMin:0},{path:'wire.requiredAreaMM2',type:'number',exclusiveMin:0}],
 card:[{path:'itemId',type:'string'},{path:'massKg',type:'number',exclusiveMin:0},{path:'powerW',type:'number',min:0},{path:'interfaces',type:'array',minLength:1},{path:'sourceIds',type:'array',minLength:1}]
});
function contractErrors(value,fields,prefix=''){
 const errors=[];for(const f of fields){const v=f.path.split('.').reduce((o,k)=>o?.[k],value),path=prefix+f.path;let message=null;
 if(f.type==='number'&&(!finite(v)||f.min!==undefined&&v<f.min||f.exclusiveMin!==undefined&&v<=f.exclusiveMin||f.integer&&!Number.isInteger(v)))message='Required finite numerical allocation is missing or outside its input domain';
 if(f.type==='string'&&(typeof v!=='string'||!v.trim()))message='Required identifier or engineering basis is missing';
 if(f.type==='array'&&(!Array.isArray(v)||v.length<(f.minLength||0)||f.length!==undefined&&v.length!==f.length||f.finiteElements&&v.some(x=>!finite(x))))message='Required nonempty engineering record is missing';
 if(message)errors.push({path,message});
 }return errors;
}

export function validateElectricalArchitecture(graph){
 const errors=contractErrors(graph,electricalReadinessContract.architecture),fail=(path,message)=>errors.push({path,message}),ids=new Set();
 for(const a of graph?.harnesses||[])errors.push(...contractErrors(a,[...electricalReadinessContract.harness,...(a.kind==='power'?electricalReadinessContract.power:[])],'harnesses.'+a.id+'.'));
 for(const c of graph?.cards||[])errors.push(...contractErrors(c,electricalReadinessContract.card,'cards.'+c.id+'.'));
 for(const key of ['boxById','portById','sources','massAccounting'])if(!graph?.[key]||typeof graph[key]!=='object')fail(key,'Required electrical registry is missing');
 if(errors.length)return errors;
 for(const p of graph.ports)errors.push(...contractErrors(p,electricalReadinessContract.port,'ports.'+p.id+'.'));
 for(const a of graph.harnesses)if(!connectorSelections[a.connectorTypeId])fail('harnesses.'+a.id+'.connectorTypeId','Unknown selected connector family');
 if(errors.length)return errors;
 for(const p of graph.ports){if(ids.has(p.id))fail('ports.'+p.id,'Duplicate port identifier');ids.add(p.id);if(!graph.boxById[p.boxId])fail('ports.'+p.id+'.boxId','Missing owning equipment');if(!p.positionM.every(finite)||!p.normal.every(finite)||Math.abs(Math.hypot(...p.normal)-1)>1e-6)fail('ports.'+p.id,'Invalid connector datum/normal');if(!connectorSelections[p.connectorTypeId])fail('ports.'+p.id+'.connectorTypeId','Unknown selected connector');}
 for(const a of graph.harnesses){if(!graph.portById[a.fromPortId]||!graph.portById[a.toPortId])fail('harnesses.'+a.id,'Both endpoints must exist');if(!Number.isInteger(a.quantity)||a.quantity<1)fail('harnesses.'+a.id+'.quantity','Invalid assembly count');for(const key of ['routeLengthM','cutLengthM','cableDiameterM','bendRadiusM','voltageV','currentA','rateMbps','allocatedCableKg','allocatedConnectorKg'])if(!finite(a[key])||a[key]<0)fail('harnesses.'+a.id+'.'+key,'A complete finite allocation is required');if(a.cutLengthM<a.routeLengthM)fail('harnesses.'+a.id+'.cutLengthM','Cut length cannot be shorter than the route');if(!a.pinout.length||!a.sourceIds.length)fail('harnesses.'+a.id,'Wiring and source basis are required');for(const id of a.sourceIds)if(!graph.sources[id])fail('harnesses.'+a.id+'.sourceIds','Unresolved source '+id);}
 const datums=new Map();
 for(const p of graph.ports){
  if(!graph.portById[p.id]||graph.portById[p.id].boxId!==p.boxId)fail('ports.'+p.id,'Port array and lookup registry disagree');
  if(!Array.isArray(p.instanceOffsetsM)||p.instanceOffsetsM.length!==p.quantity)fail('ports.'+p.id+'.instanceOffsetsM','Every repeated physical circuit needs a separated connector datum');
  for(const offset of p.instanceOffsetsM||[]){if(!Array.isArray(offset)||offset.length!==3||!offset.every(finite)){fail('ports.'+p.id+'.instanceOffsetsM','Finite3D connector instance offsets required');continue;}const point=add(p.positionM,offset),key=p.boxId+'|'+p.normal.join(',')+'|'+point.map(v=>v.toFixed(7)).join(',');if(datums.has(key))fail('ports.'+p.id+'.positionM','Coincident connector datum with '+datums.get(key));datums.set(key,p.id);}
 }
 const cross={'1':'9','6':'5','2':'8','7':'4','9':'1','5':'6','8':'2','4':'7'};
 for(const a of graph.harnesses){
  if(graph.portById[a.fromPortId]?.boxId!==a.fromBoxId||graph.portById[a.toPortId]?.boxId!==a.toBoxId)fail('harnesses.'+a.id,'Endpoint ownership does not match declared equipment');
  if(!finite(a.operatingVoltageMinV)||a.operatingVoltageMinV<0)fail('harnesses.'+a.id+'.operatingVoltageMinV','Minimum operating voltage is required separately from withstand selection voltage');
  if(a.kind==='power'){for(const key of ['areaMM2','resistanceOhm','requiredAreaMM2'])if(!finite(a.wire?.[key])||a.wire[key]<=0)fail('harnesses.'+a.id+'.wire.'+key,'Positive finite conductor allocation required');if(!a.wire?.awg||!a.wire.terminationCompatible)fail('harnesses.'+a.id+'.wire.awg','Selected gauge must fit the selected contact');}
  const active=(a.pinout||[]).filter(p=>p.net!=='UNPOPULATED'),fromPins=new Set(active.map(p=>p.from));if(fromPins.size!==active.length||active.some(p=>!p.from||!p.to||!p.net))fail('harnesses.'+a.id+'.pinout','Populated source terminals must each have one explicit destination and net');
  if(a.kind==='control'){
   if(Object.entries(cross).some(([from,to])=>a.pinout.filter(p=>p.from===from&&p.to===to).length!==1)||!a.pinout.some(p=>p.from==='3'&&p.net==='UNPOPULATED'))fail('harnesses.'+a.id+'.pinout','2019 SpaceWire Type A crossover and unpopulated cable pin3 are required');
   if(a.wire.awg!=='26'||a.wire.conductorCount!==8)fail('harnesses.'+a.id+'.wire','Selected Omnetics order option requires eight 26 AWG signal wires');
  }
  if(a.kind==='data'&&a.wire.ferrulePolish!==connectorSelections[a.connectorTypeId].ferrulePolish)fail('harnesses.'+a.id+'.wire.ferrulePolish','APC and UPC optical connectors cannot be intermated');
 }
 if(graph.boxes.some(b=>b.payloadTransferRole)){
  const t=graph.rotaryTransferAccounting,byId=Object.fromEntries(graph.harnesses.map(a=>[a.id,a]));
  if(!t||!Array.isArray(t.powerCircuits)||!Array.isArray(t.opticalLinks)||!Array.isArray(t.internalChannelMapping))fail('rotaryTransferAccounting','The split payload interfaces require their complete internal component channel map');
  else{
   for(const c of[...t.powerCircuits,...t.opticalLinks]){
    const up=byId[c.upstreamHarnessId],down=byId[c.downstreamHarnessId];
    if(!up||!down||up.toBoxId!==t.statorBoxId||down.fromBoxId!==t.rotorBoxId||down.toBoxId!==c.loadBoxId||up.quantity!==down.quantity)fail('rotaryTransferAccounting.'+c.id,'Upstream, rotary component and downstream harness must preserve the same load endpoint and physical quantity');
    if(c.kind==='power'&&up&&down&&Math.abs((up.additionalRotaryResistanceOhm||0)+(down.additionalRotaryResistanceOhm||0)-t.loopResistanceOhm)>1e-12)fail('rotaryTransferAccounting.'+c.id+'.loopResistanceOhm','The complete internal transfer resistance must be charged exactly once per power circuit');
   }
   const paths=t.internalChannelMapping.filter(c=>c.kind==='power').flatMap(c=>c.powerContactIds||[]),optical=t.internalChannelMapping.filter(c=>c.kind==='data').map(c=>c.channel);
   if(paths.length!==t.powerPasses||new Set(paths).size!==paths.length)fail('rotaryTransferAccounting.internalChannelMapping','Every installed power pass requires one unique contact identifier');
   if(optical.length!==t.opticalChannels||new Set(optical).size!==optical.length)fail('rotaryTransferAccounting.internalChannelMapping','Every active optical fiber requires one unique channel identifier');
   for(const c of t.internalChannelMapping)if(!graph.portById[c.fromPortId]||!graph.portById[c.toPortId]||!c.polarityPreserved)fail('rotaryTransferAccounting.internalChannelMapping.'+c.id,'An internal transfer channel must resolve both ports and preserve declared polarity');
  }
 }
 for(const [wbs,m] of Object.entries(graph.massAccounting)){const detail=sum(graph.assemblies.filter(a=>a.parentWbs===wbs).map(a=>a.allocatedMassKg))+sum(graph.connectorDetails.filter(a=>a.parentWbs===wbs).map(a=>a.allocatedMassKg));if(Math.abs(detail-m.allocatedKg)>1e-8*Math.max(1,m.allocatedKg))fail('massAccounting.'+wbs,'Suballocated harness and connector details do not close to the existing mass boundary');}
 return errors;
}

export function electricalBuildCsv(graph){
 const columns=['id','wbs','itemId','label','quantity','kind','scope','includedInFlightTotals','fromPortId','toPortId','logicalCircuitId','payloadTransferSegment','payloadRotaryTransferId','connectorTypeId','voltageV','operatingVoltageMinV','currentA','rateMbps','physicalLineRateMbps','routeLengthM','cutLengthM','cableDiameterM','bendRadiusM','wire','pinout','resistanceOhm','powerLossW','additionalRotaryResistanceOhm','rotaryLossAccounting','rotaryTransferMapping','completeTransferCircuitBudget','shieldTermination','strainRelief','allocatedCableKg','allocatedConnectorKg','procurementRelease','procurement','sourceIds'];
 const q=v=>'"'+String(typeof v==='object'?JSON.stringify(v):v??'').replaceAll('"','""')+'"';return [columns.join(','),...[...graph.harnesses.map(a=>({...a,scope:'Installed flight harness; non-additive child of '+a.parentWbs,includedInFlightTotals:true,rotaryTransferMapping:a.logicalCircuitId?graph.rotaryTransferAccounting?.internalChannelMapping.filter(c=>c.logicalCircuitId===a.logicalCircuitId):null,completeTransferCircuitBudget:a.logicalCircuitId?[...(graph.rotaryTransferAccounting?.powerCircuits||[]),...(graph.rotaryTransferAccounting?.opticalLinks||[])].find(c=>c.id===a.logicalCircuitId):null})),...(graph.groundHarnesses||[]).map(a=>({...a,includedInFlightTotals:false}))].map(a=>columns.map(k=>q(a[k])).join(','))].join('\r\n')+'\r\n';
}
