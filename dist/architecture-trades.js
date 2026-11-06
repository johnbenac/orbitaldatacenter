// Controlled preliminary architecture decisions. These are project allocations,
// not supplier qualifications or evidence of independent PDR acceptance.
// No sizing inputs are changed and no mission integration is performed here.
import {launchStructure} from './launch-structure.js';

const TAU=2*Math.PI,DEG=Math.PI/180,R=6378.137,MU=398600.4418,G0=9.80665,YEAR=31557600;
const finite=Number.isFinite,positive=x=>finite(x)&&x>0,nonnegative=x=>finite(x)&&x>=0;
const n=x=>finite(x)?x:null;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=(x,d=1)=>finite(x)?x.toLocaleString('en-US',{maximumFractionDigits:d}):'Unassessed';
const sum=items=>items.reduce((a,b)=>a+b,0);
const mass=(h,id)=>{const kg=h.massLedger?.find(row=>row.id===id)?.kg;return nonnegative(kg)?kg:null;};
const freeze=x=>{Object.values(x).forEach(v=>{if(v&&typeof v==='object')freeze(v);});return Object.freeze(x);};
const attempt=fn=>{try{return fn();}catch{return null;}};

export const architectureReference=freeze({
 id:'ODC-DRM-001',revision:'A',architecture:'ODC-01 Rev I',decision:'AD-01',date:'2026-11-06',
 title:'Earth AI service · reference spacecraft and study envelope',
 selected:'central-core',
 referenceMission:{purpose:'Live text inference',altitudeKm:550,eccentricity:0,inclinationDeg:53,epoch:'2026-11-04T00:00:00Z',raanDeg:30,lifeYears:5,illumination:'Eclipse-capable LEO; no continuous-sun credit',customer:'Earth customer; all required compute, power and heat rejection launched together'},
 referenceHardware:{trays:12,acceleratorKW:24,payloadPowerBasis:'24 kW accelerator allocation plus the explicitly modeled host and fabric demand',solarM2:190,radiatorPlanformM2:65,batteryKWh:40,propellantKg:450,wings:4,banks:2,panelsPerBank:2},
 decisionRationale:'Retain the protected central compute core and independently orientable pumped radiators as the integrated preliminary reference. It preserves local payload fabric, shielded equipment accommodation and cold-control flexibility under changing workload and eclipses. The matched compact-backbone and radiator-local options below quantify packaging trades; neither receives unverified hydraulic, pointing, radiation or launch-integration credit.',
 selectionGate:'Reopen AD-01 if the current configuration exceeds its study envelope, or a matched alternative demonstrates lower predicted mass and acceptable packaging with substantiated thermal, deployment, shielding and service interfaces.',
 boundary:'One complete operational spacecraft per launch. Attached deployment is allowed. Ground stations and purchased relays are explicit external services. No on-orbit assembly or other spacecraft compute/power/cooling is credited.',
 evidence:'Preliminary analytical allocations. Inside the study envelope is not qualification; current numerical capability and evidence status remain separate.',
 limits:{trays:16,installedElectronicsKW:40,wingLengthM:18,wingWidthM:4,radiatorBankLengthM:15,radiatorPanelWidthM:3.3,bodyLengthM:12,missionYears:5,densityMinKm:100,densityMaxKm:900},
 ownership:{decision:'Systems engineering',packing:'Mechanical and thermal',control:'ADCS and mechanisms',environment:'Environment and parts assurance',navigation:'Flight dynamics and propulsion'},
});

export const architectureSources=freeze([
 {id:'redwire-odc',title:'Redwire · Orbital Data Centers, May 2026',url:'https://rdw.com/wp-content/uploads/2026/05/RDW26-053-ODC-Power-Thermal-Study-White-Paper-R11-Digital.pdf',locator:'Printed pp. 7–9',use:'8 kW IT / 2 kW bus point design; compute on a heat-pipe radiator; electrical harnesses cross hinges. The approximately 1.1 m height is its Falcon 9 study configuration, at a different orbit and thermal basis.'},
 {id:'starcloud-202610',title:'Starcloud factory tour · 31 October 2026',url:'https://www.sourcery.vc/p/breaking-23b-starcloud-factory-tour',locator:'Firsthand manufacturer interview',use:'Central compute with liquid cooling is an architecture precedent. Reported SC3 mass/power are company targets; the power and wet-mass boundaries are not a closed public budget.'},
 {id:'spacex-ai1',title:'SpaceX · AI1 / Starmind',url:'https://new.spacex.com/spacexai/starmind',locator:'Published overview',use:'Peak and average compute ratings and the Starlink service route are separate interface quantities; no compatibility is inferred for the ODC terminal.'},
 {id:'reflex-202609',title:'Reflex / Orbital · September 2026',url:'https://www.reflexaerospace.com/press-releases/orbital-selects-reflex-as-exclusive-satellite-platform-partner-space-data-center-constellation',locator:'Current platform announcement',use:'Approaching-250 kW peak target and mission-specific bus work. The earlier June mass and span are not assigned to this revised configuration.'},
 {id:'gevs-structure',title:'GSFC-STD-7000B · GEVS',url:'https://standards.nasa.gov/system/files/tmp/GSFC-STD-7000B_Approved_Admn%20Ext.pdf',locator:'§2.2.5, Table 2.2-3',use:'Static metallic yield / ultimate / stability factors 1.25 / 1.4 / 1.4 with the planned qualification or protoflight test path. Random/acoustic, composites, bonded joints, pressure systems and analysis-only qualification require their own categories.'},
 {id:'mechanisms-5017',title:'NASA-STD-5017B · Mechanisms',url:'https://standards.nasa.gov/sites/default/files/standards/NASA/B//2022-12-06-NASA-STD-5017B-Approved.pdf',locator:'§4.3, Equation 4-1, Table 1',use:'Analysis-stage resisting-variable / fixed / acceleration factors 3.0 / 1.5 / 1.25. Later hardware torque-margin testing remains required.'},
 {id:'radiation-rha',title:'NESC · Avionics Radiation Hardness Assurance Guidelines',url:'https://ntrs.nasa.gov/citations/20210018053',locator:'NASA/TM-20210018053',use:'Environment, shielding and part response require mission-specific evidence. Areal mass alone establishes no dose or single-event-effect capability.'},
]);

// Limits express a controlled study boundary for the instantiated design, not a
// claim that public reference dimensions validate this hardware.
export function architectureApplicability(h={}){
 const d=h.input??{},limit=architectureReference.limits;
 const bound=(id,label,actual,minimum,maximum,unit,basis,kind='hardware')=>({id,label,actual:n(actual),minimum,maximum,unit,basis,kind,status:!finite(actual)?'unassessed':actual>=minimum&&actual<=maximum?'inside':'outside'});
 const a=R+d.altitudeKm,validOrbit=finite(d.altitudeKm)&&positive(a)&&nonnegative(d.ecc)&&d.ecc<1;
 const perigee=validOrbit?a*(1-d.ecc)-R:null,apogee=validOrbit?a*(1+d.ecc)-R:null;
 const checks=[
  bound('trays','Repeated compute trays',h.trays,1,limit.trays,'trays','Reference arrangement through 16 installed trays; additional trays require a revised module and interface assessment.'),
  bound('electronics','Installed electronics rating',h.installedElectronicsKw,0,limit.installedElectronicsKW,'kW','Controlled scale limit of the reference architecture, before mode-dependent service demand.'),
  bound('wing-span','Single-wing deployed span',h.wingLengthM,0,limit.wingLengthM,'m','18 m study bound; iROSA deployment is precedent, not qualification of these wings.'),
  bound('wing-width','Single-wing blanket width',h.wingWidthM,0,limit.wingWidthM,'m','4 m project cassette, boom and tracking-joint allocation.'),
  bound('radiator-span','Single radiator bank length',h.radiatorLengthM,0,limit.radiatorBankLengthM,'m','Two-panel bank with a 7.5 m maximum preliminary panel length.'),
  bound('radiator-width','Radiator panel width',h.radiatorWidthM,0,limit.radiatorPanelWidthM,'m','3.3 m project joint/panel allocation; passive and pumped reference panels are not interchangeable.'),
  bound('core-length','Primary spine length',h.bodyLengthM,0,limit.bodyLengthM,'m','12 m boundary for this preliminary restraint and load-path model.'),
  bound('mission-life','Requested mission life',d.missionYears,0,limit.missionYears,'yr','Five-year design-life allocation. Longer runs are allowed, with life evidence outside this allocation.','mission'),
  bound('drag-perigee','Drag source · perigee',perigee,limit.densityMinKm,limit.densityMaxKm,'km','Both apsides must remain inside the 100–900 km density source table.','analysis'),
  bound('drag-apogee','Drag source · apogee',apogee,limit.densityMinKm,limit.densityMaxKm,'km','Circular nominal drag sizing is separate from the broader orbit propagator.','analysis'),
  {...bound('drag-eccentricity','Drag sizing · eccentricity',d.ecc,0,0,'','Eccentric-orbit drag averaging is not implemented in the nominal annual sizing.','analysis')},
  {id:'cmg-catalogue',label:'CMG reference applicability',actual:typeof h.cmg?.catalogMatch==='boolean'?Number(h.cmg.catalogMatch):null,minimum:1,maximum:1,unit:'catalogue match',kind:'hardware',basis:'Geometric actuator extrapolation does not inherit a catalogue unit rating.',status:typeof h.cmg?.catalogMatch!=='boolean'?'unassessed':h.cmg.catalogMatch?'inside':'outside'},
 ];
 const outside=checks.filter(c=>c.status==='outside'),unknown=checks.filter(c=>c.status==='unassessed');
 const status=outside.length?'outside_study_envelope':unknown.length?'unassessed':'inside_study_envelope';
 return {schema:'odc-architecture-applicability/1',referenceId:architectureReference.id,revision:architectureReference.revision,status,label:status==='inside_study_envelope'?'Inside preliminary study envelope':status==='outside_study_envelope'?'Outside preliminary study envelope':'Applicability unassessed',checks,exceeded:outside.map(c=>c.id),unassessed:unknown.map(c=>c.id),evidenceStatus:'open',meaning:architectureReference.evidence};
}

function installedGeometry(h){
 const d=h.input??{},r=h.rackLayout;
 if(![h.bodyWidthM,h.bodyHeightM,h.bodyLengthM,h.radiatorLengthM,h.radiatorWidthM,h.wingWidthM,h.wingLengthM,h.stowedDiameterM,h.stowedLengthM,h.terminalStripM,h.trays,h.batteryVolumeL,d.diskModuleTB,h.propulsion?.maxRadiusM].every(positive)
  ||![h.storageTB,h.pressurantKg,h.propellantKg,d.adapterKg,d.skinKgM2,d.shieldKgM2,d.blanketKgM2,d.radKgM2].every(nonnegative)
  ||![r?.columns,r?.rows,...(r?.pitchM??[]),...(r?.slotDimensionsM??[]),...(h.cmg?.mechanismDimsM??[])].every(positive)
  ||r?.pitchM?.length!==3||r?.slotDimensionsM?.length!==3||h.cmg?.mechanismDimsM?.length!==3
  ||!Array.isArray(h.massLedger)||!h.massLedger.every(row=>nonnegative(row.kg))||!['structure','skin','shield','blanket','margin'].every(id=>nonnegative(mass(h,id))))return null;
 const w=h.bodyWidthM,b=h.bodyHeightM,l=h.bodyLengthM,wall=.024*Math.min(w,b),diam=2*h.propulsion.maxRadiusM;
 const modules=Math.ceil(h.storageTB/d.diskModuleTB),batteryRun=h.batteryVolumeL/1000/(.64*w*.66*b*.13*.80),storageRun=modules*.004/(.55*w*.66*b*.137*.80);
 const equipmentRun=Math.max(Math.ceil(h.trays/(r.columns*r.rows))*r.pitchM[2]/.60,batteryRun,storageRun);
 const ends=2*wall+.18+diam+h.cmg.mechanismDimsM[2];
 const coreLengthM=Math.min(l,ends+equipmentRun+.004),serviceCoreLengthM=Math.min(l,ends+Math.max(.5,batteryRun,storageRun)+.004);
 const rollRadiusM=Math.sqrt(.125**2+.002*h.wingLengthM/Math.PI),cassetteSpanM=2*h.wingWidthM+.90+1.1*rollRadiusM;
 const radiatorSpanM=h.radiatorLengthM/2+.50+h.terminalStripM;
 const items=[['Equipment',ends+equipmentRun+.004],['Solar cassettes',cassetteSpanM],['Folded radiators / terminals',radiatorSpanM]];
 const shellArea=L=>Math.max(0,2*(w*b+(w+b)*L)-(h.enclosure?.penetrationM2??0));
 const shellMass=L=>shellArea(L)*(d.skinKgM2+d.shieldKgM2+d.blanketKgM2);
 const frame=h.enclosure?.frameMassBreakdown??{},currentFrame=mass(h,'structure'),currentShell=mass(h,'skin')+mass(h,'shield')+mass(h,'blanket');
 const frameMass=L=>currentFrame-(frame.longeronsKg??4*l*1.8)+4*L*1.8;
 return {w,b,l,coreLengthM,serviceCoreLengthM,cassetteSpanM,radiatorSpanM,rollRadiusM,items,shellArea,shellMass,frameMass,currentFrame,currentShell,interfaceHeightM:Math.max(0,h.stowedLengthM-l)};
}

export function deriveArchitectureTrade(h={}){
 const geometry=installedGeometry(h),d=h.input??{},applicability=architectureApplicability(h);
 if(!geometry||!positive(sum((h.massLedger??[]).filter(r=>r.group==='Hardware').map(r=>r.kg))))return {schema:'odc-architecture-trade/1',reference:architectureReference,available:false,selected:'central-core',alternatives:[],applicability};
 const g=geometry,basic=sum((h.massLedger??[]).filter(r=>r.group==='Hardware').map(r=>r.kg)),growth=basic>0?mass(h,'margin')/basic:0;
 const fixedMass=h.propellantKg+h.pressurantKg+d.adapterKg,currentCompared=g.currentFrame+g.currentShell;
 const total=delta=>({basicDryKg:basic+delta,appliedGrowthKg:(basic+delta)*growth,predictedDryKg:(basic+delta)*(1+growth),launchKg:(basic+delta)*(1+growth)+fixedMass});
 const compactPanels=4,compactBackboneM=Math.max(g.coreLengthM,g.cassetteSpanM,h.radiatorLengthM/compactPanels+.5+h.terminalStripM);
 const compactFrame=g.frameMass(compactBackboneM)+4*(g.w+g.b)*1.15;
 const compactShell=g.shellMass(g.coreLengthM),extraHinges=2*(compactPanels-2),compactMechanismKg=extraHinges*4,compactFluidKg=extraHinges*2;
 const compactCompared=compactFrame+compactShell+compactMechanismKg+compactFluidKg;
 // Compare equal nominal emitting face area. Local compute masks one radiator
 // face, so the tiled candidate carries half that footprint as extra planform.
 const trayArea=h.trays*(h.rackLayout.slotDimensionsM[0]*h.rackLayout.slotDimensionsM[2]);
 const localRadiatorM2=h.radiatorM2+trayArea/2,tileCount=Math.max(1,Math.ceil(Math.max(h.trays/4,localRadiatorM2/(3.25**2))));
 const tileSideM=Math.sqrt(localRadiatorM2/tileCount),tileThicknessM=.07+h.rackLayout.slotDimensionsM[1]+.06;
 const traySurface=h.trays*2*(h.rackLayout.slotDimensionsM[0]*h.rackLayout.slotDimensionsM[1]+h.rackLayout.slotDimensionsM[0]*h.rackLayout.slotDimensionsM[2]+h.rackLayout.slotDimensionsM[1]*h.rackLayout.slotDimensionsM[2]);
 const localShieldKg=traySurface*d.shieldKgM2,localSpreaderKg=.8*localRadiatorM2,localFittingsKg=6*tileCount;
 const localExtraRadiatorKg=(localRadiatorM2-h.radiatorM2)*d.radKgM2;
 const localCompared=g.shellMass(g.serviceCoreLengthM)+g.frameMass(g.serviceCoreLengthM)+localShieldKg+localSpreaderKg+localFittingsKg+localExtraRadiatorKg;
 const tilePackWidthM=Math.max(g.w,g.b,tileSideM+.2,h.wingWidthM+.4);
 const alternatives=[
  {id:'central-core',name:'Protected core / remote banks',state:'Selected integrated reference',selected:true,bodyLengthM:g.l,packageHeightM:h.stowedLengthM,packageDiameterM:h.stowedDiameterM,comparedHardwareKg:currentCompared,massDeltaKg:0,...total(0),radiatorPlanformM2:h.radiatorM2,nominalEmittingFaceM2:2*h.radiatorM2,panelsPerBank:2,thermal:'Cold plates → pumped supply/return → moving fluid interfaces → separate radiator banks',packingBasis:'Actual shared stowed stations and tapered-fairing screen.',massBasis:'Installed MEL hardware and carried growth allocation.',advantages:['Protected central equipment and short local compute fabric.','Independent radiator pointing and controllable bus heat transport.'],constraints:['Enclosure and shielding grow around exterior deployment accommodation.','Pumps and articulated fluid interfaces carry life, pressure and cold-control requirements.'],evidence:'Integrated preliminary model; physical verification remains open.'},
  {id:'compact-backbone',name:'Compact core / external backbone',state:'Matched analytical candidate',selected:false,bodyLengthM:g.coreLengthM,backboneLengthM:compactBackboneM,packageHeightM:compactBackboneM+g.interfaceHeightM,packageDiameterM:h.stowedDiameterM+2*(compactPanels-2)*.07,comparedHardwareKg:compactCompared,massDeltaKg:compactCompared-currentCompared,...total(compactCompared-currentCompared),radiatorPlanformM2:h.radiatorM2,nominalEmittingFaceM2:2*h.radiatorM2,panelsPerBank:compactPanels,thermal:'Same central pumped loop; four panels per bank introduce two additional folds per bank.',packingBasis:'Core minimum from installed equipment; backbone spans the unchanged cassettes and four-panel radiator packs. Added fold thickness is carried. No tapered-fairing or swept-clearance closure is claimed.',massBasis:'Same wall areal masses on the compact core; retain backbone longerons, add two end frames, 4 kg per additional hinge and 2 kg per additional fluid crossing. Other equipment retained.',advantages:['Separates protected equipment volume from deployment length.','Retains central compute, storage and the selected heat-transport concept.'],constraints:['More radiator hinges, latches and fluid crossings.','New backbone modes, supports and deployment stations require verification.'],evidence:'First-order packaging and mass trade; no change to the active 3D or operational vehicle.'},
  {id:'local-radiator',name:'Attached compute / radiator modules',state:'Matched analytical candidate',selected:false,bodyLengthM:g.serviceCoreLengthM,packageHeightM:g.serviceCoreLengthM+tileCount*tileThicknessM+.15+g.interfaceHeightM,packageDiameterM:Math.SQRT2*tilePackWidthM,comparedHardwareKg:localCompared,massDeltaKg:localCompared-currentCompared,...total(localCompared-currentCompared),radiatorPlanformM2:localRadiatorM2,nominalEmittingFaceM2:2*localRadiatorM2-trayArea,tileCount,tileSideM,tileThicknessM,thermal:'Compute → local spreader / heat pipes → attached radiating module. The bus loop remains allocated.',packingBasis:'Square modules capped near 3.25 m per side, maximum four trays per module; stack each complete module above the service core. Solar cassette reorientation is a new interface. This is a geometric estimate, not a verified launch package.',massBasis:'Retain existing compute, power, storage, propulsion, terminals and bus cooling. Add local shielding at the same areal density, 0.8 kg/m² spreader allocation, 6 kg/module deployment/harness allowance and obscuration-compensating radiator area.',advantages:['Short local compute heat path; electrical/data interfaces cross module hinges.','Protected service core can be shorter when compute moves outboard.'],constraints:['Distributed shielding, fabric harnesses and higher deployed compute inertia.','Heat-pipe transport, cold protection and module deployment remain application-specific.'],evidence:'Redwire-inspired project trade; not its point design, mass budget or qualification.'},
 ];
 return {schema:'odc-architecture-trade/1',reference:architectureReference,available:true,selected:'central-core',decision:architectureReference.decisionRationale,selectionGate:architectureReference.selectionGate,
  commonBasis:{itKW:h.itKw,installedElectronicsKW:h.installedElectronicsKw,solarM2:h.solarM2,batteryKWh:h.batteryKWh,nominalEmittingFaceM2:2*h.radiatorM2,lifeYears:d.missionYears,altitudeKm:d.altitudeKm,inclinationDeg:d.inclinationDeg,epoch:d.epoch,launcher:d.launcher,propellantKg:h.propellantKg,appliedGrowthFraction:growth},
  comparedBoundary:'Walls, primary frame, shielding, MLI and candidate-specific additions. Other hardware is retained; predicted totals carry the same provisional growth fraction and consumables. Alternate ratings and mission closure remain unassessed.',
  dimensions:{protectedMinimumM:g.coreLengthM,bodyM:g.l,bodyWidthM:g.w,bodyHeightM:g.b,drivers:g.items.map(([label,value])=>({label,value,unit:'m'}))},alternatives,applicability,sources:architectureSources.slice(0,4)};
}

export const mechanicalAllocation=freeze({
 id:'ODC-MECH-001',revision:'A',basis:'Controlled preliminary analytical design; no supplier acceptance is implied.',
 factors:{variable:3,fixed:1.5,acceleration:1.25,source:'NASA-STD-5017B Table 1 · theory / analysis'},
 staticFactors:{yield:1.25,ultimate:1.4,stability:1.4,source:'GEVS Table 2.2-3 · metallic static, planned test verification'},
 longeron:{count:4,linearKgM:1.8,outerSideM:.10,densityKgM3:2700,youngPa:69e9,yieldRequirementPa:200e6,ultimateRequirementPa:260e6},
 solar:{pairEffectiveEINm2:40000,stiffnessFractionLow:.5,stiffnessFractionHigh:1.5},
 radiator:{skinYoungPa:69e9,faceSkinM:.0003,faceSeparationM:.07,jointStiffnessFraction:.25,stiffnessFractionLow:.5,stiffnessFractionHigh:1.5},
 modal:{bodyBandwidthRadS:.06,minimumSeparation:5,dampingRatioLow:.005,dampingRatioHigh:.02},
 drives:{
  solar:{count:4,minimumTorqueNm:12,rateDegS:2,rampS:2,variableResistanceNm:1.1,fixedResistanceNm:.2},
  radiatorCant:{count:2,minimumTorqueNm:50,rateDegS:.4,rampS:5,variableResistanceNm:6,fixedResistanceNm:2},
  radiatorTrim:{count:2,minimumTorqueNm:30,rateDegS:.75,rampS:2,variableResistanceNm:5,fixedResistanceNm:.4},
  radiatorFold:{count:2,minimumTorqueNm:20,rateDegS:.5,rampS:5,variableResistanceNm:3,fixedResistanceNm:1},
 },
 pointing:{sensor3SigmaArcsec:15,alignment3SigmaArcsec:20,bodyControl3SigmaArcsec:60,flexible3SigmaArcsec:30,coarseAcquisitionHalfConeDeg:.5},
});

export function structuralBounds(h={}){
 const p=mechanicalAllocation,d=h.input??{};
 if(![h.wingLengthM,h.wingWidthM,h.radiatorLengthM,h.radiatorWidthM,h.bodyWidthM,h.bodyHeightM,h.bodyLengthM,h.wetKg,mass(h,'array'),mass(h,'radiator')].every(positive))return {available:false,allocation:p,mechanisms:[],modeBounds:[],pointing:null,longerons:null};
 const wingKg=mass(h,'array')/4,bankKg=mass(h,'radiator')/2;
 const frequency=(EI,kg,L)=>positive(EI)&&positive(kg)&&positive(L)?1.875104**2/(TAU*L**2)*Math.sqrt(EI/(kg/L)):null;
 const solarEI=p.solar.pairEffectiveEINm2,radEI=p.radiator.skinYoungPa*h.radiatorWidthM*p.radiator.faceSkinM*p.radiator.faceSeparationM**2/2*p.radiator.jointStiffnessFraction;
 const mode=(id,label,lengthM,kg,EI,basis,allocation)=>{const nominal=frequency(EI,kg,lengthM);return {id,label,lengthM,massKg:kg,effectiveEINm2:EI,lowHz:nominal===null?null:nominal*Math.sqrt(allocation.stiffnessFractionLow),nominalHz:nominal,highHz:nominal===null?null:nominal*Math.sqrt(allocation.stiffnessFractionHigh),basis};};
 const modeBounds=[mode('solar','Single solar wing',h.wingLengthM,wingKg,solarEI,'Uniform equivalent cantilever, 40 kN·m² pair EI before stiffness bounds. Rollout membrane, torsion and root compliance require correlation.',p.solar),mode('radiator','Latched radiator bank',h.radiatorLengthM,bankKg,radEI,'Equivalent sandwich strip: 0.3 mm skins, 70 mm separation, 69 GPa modulus and 0.25 joint effectiveness. No measured mode is asserted.',p.radiator)];
 const usable=modeBounds.map(row=>row.lowHz).filter(positive),lowestModeHz=usable.length===modeBounds.length?Math.min(...usable):null,bodyBandwidthHz=p.modal.bodyBandwidthRadS/TAU;
 const defs=[['solar','Solar tracking drive',wingKg*h.wingWidthM**2/12],['radiatorCant','Radiator root cant',bankKg*h.radiatorLengthM**2/3],['radiatorTrim','Radiator rotary-fluid trim',bankKg*h.radiatorWidthM**2/12],['radiatorFold','Radiator outer fold',bankKg*h.radiatorLengthM**2/24]];
 const mechanisms=defs.map(([id,label,inertiaKgM2])=>{const a=p.drives[id],accelRadS2=a.rateDegS*DEG/a.rampS,accelTorqueNm=inertiaKgM2*accelRadS2;
  const factoredNm=p.factors.variable*a.variableResistanceNm+p.factors.fixed*a.fixedResistanceNm+p.factors.acceleration*accelTorqueNm;
  return {id,label,count:a.count,inertiaKgM2,rateDegS:a.rateDegS,rampS:a.rampS,accelRadS2,variableNm:a.variableResistanceNm,fixedNm:a.fixedResistanceNm,accelerationNm:accelTorqueNm,factoredNm,availableNm:a.minimumTorqueNm,margin:a.minimumTorqueNm/factoredNm-1,status:a.minimumTorqueNm>factoredNm?'meets':'shortfall',evidence:'Minimum output torque is a project equipment requirement, not a measured motor capability. Resistances are analytical allocations; cold/EOL, speed and stroke tests remain required.'};
 });
 const loads=attempt(()=>launchStructure(h));
 const A=p.longeron.linearKgM/p.longeron.densityKgM3,outer=p.longeron.outerSideM,inner=Math.sqrt(outer**2-A),I=(outer**4-inner**4)/12;
 const axial=loads?Math.abs(loads.interfaceForceN[2]):h.wetKg*6*G0;
 const mx=loads?Math.abs(loads.interfaceMomentNm[0]):0,my=loads?Math.abs(loads.interfaceMomentNm[1]):h.wetKg*2*G0*(h.bodyLengthM/2+.4);
 const maxCompressionN=axial/4+mx/(2*h.bodyHeightM)+my/(2*h.bodyWidthM),stressPa=maxCompressionN/A;
 const stations=(h.enclosure?.framePositions??[]).filter((point,i)=>h.enclosure?.frameLabels?.[i]?.startsWith('Transverse frame')&&finite(point?.[2])).map(point=>point[2]);
 const ordered=[...new Set([-h.bodyLengthM/2,...stations,h.bodyLengthM/2])].sort((a,b)=>a-b),spanM=Math.max(...ordered.slice(1).map((z,i)=>z-ordered[i]));
 const eulerN=Math.PI**2*p.longeron.youngPa*I/spanM**2;
 const longerons={sectionSideM:outer,equivalentWallM:(outer-inner)/2,areaM2:A,secondMomentM4:I,unsupportedSpanM:spanM,maxCompressionN,stressPa,
  requiredYieldPa:p.staticFactors.yield*stressPa,requiredUltimatePa:p.staticFactors.ultimate*stressPa,yieldRequirementPa:p.longeron.yieldRequirementPa,ultimateRequirementPa:p.longeron.ultimateRequirementPa,
  yieldMargin:p.longeron.yieldRequirementPa/(p.staticFactors.yield*stressPa)-1,ultimateMargin:p.longeron.ultimateRequirementPa/(p.staticFactors.ultimate*stressPa)-1,eulerN,stabilityMargin:eulerN/(p.staticFactors.stability*maxCompressionN)-1,
  basis:'Conservative four-longeron load path under the existing +6 g axial / +2 g lateral project case. Sandwich-wall load sharing is not credited. Equivalent 100 mm square tubes preserve the existing 1.8 kg/m longeron mass. Pinned inter-frame buckling excludes joint/local-shell effects.',
  evidence:'200 MPa yield / 260 MPa ultimate are minimum material-property procurement allocations at the design environment, not approved material allowables. Provider loads, material data, wall participation and joint/buckling correlation remain open.'};
 const allocatedBody3SigmaArcsec=Math.hypot(p.pointing.sensor3SigmaArcsec,p.pointing.alignment3SigmaArcsec,p.pointing.bodyControl3SigmaArcsec,p.pointing.flexible3SigmaArcsec);
 const pointing={...p.pointing,allocatedBody3SigmaArcsec,allocatedBody3SigmaUrad:allocatedBody3SigmaArcsec*Math.PI/(180*3600)*1e6,coarseAcquisitionArcsec:p.pointing.coarseAcquisitionHalfConeDeg*3600,fineJitterAllocationUrad:n(d.opticalJitterUrad),basis:'Preliminary RSS of independently allocated 3σ body terms; correlations and measured errors are unresolved. Optical terminal fine tracking is a separate loop. The runtime still uses ideal body knowledge.'};
 return {available:true,allocation:p,modeBounds,lowestModeHz,bodyBandwidthHz,modalSeparation:positive(lowestModeHz)?lowestModeHz/bodyBandwidthHz:null,mechanisms,pointing,longerons};
}

export const navigationRequirements=freeze({
 id:'ODC-NAV-001',revision:'A',architecture:'Onboard GNSS state feed, propagated between solutions; independent S-band ground tracking and maneuver reconstruction. The nominal simulator retains its exact-state propagator.',
 position3SigmaM:100,velocity3SigmaMS:.1,injectionResidualDvMS:5,executionFraction:.02,ispLowFraction:.02,dragHighMultiplier:2,gaugingFraction:.01,
 basis:'Project preliminary requirement and sensitivity allocations, not delivered provider/receiver/engine performance and not a validated statistical 3σ distribution.',
 equipmentBoundary:'GNSS receiver and antenna are allocated within the existing 12 kg flight-avionics suite and its shared auxiliary-power boundary. No second hidden mass or power allowance is added; selected-part accommodation and receiver performance remain unassessed.',
 disposal:'Protect the configured disposal maneuver once in the ledger; execute only after guidance, deployment and resource checks. Passivation follows the selected retirement sequence. Disposal acceptability remains a mission-specific review.',
 ownership:'Flight dynamics owns state, targeting and the environment; the launch provider owns insertion and dispersion delivery; propulsion owns delivered impulse, residual and gauging evidence.',
});

export function navigationAllocation(h={}){
 const d=h.input??{},a=R+d.altitudeKm,period=finite(d.altitudeKm)&&positive(a)?TAU*Math.sqrt(a**3/MU):null;
 const cycles=positive(period)&&nonnegative(d.missionYears)?Math.ceil(d.missionYears*YEAR/period):null;
 const groundTrackingCycles=100,totalCycles=cycles===null?null:cycles+groundTrackingCycles;
 return {...navigationRequirements,orbitPeriodS:period,requestedLifeYears:n(d.missionYears),trackingEquivalentCycles:cycles,groundTrackingCycles,lifeTestFactor:2,plannedTwoLifeCycles:totalCycles===null?null:2*totalCycles,safetyCriticalTestCycles:totalCycles===null?null:4*totalCycles,
  cycleBasis:'One full tracking cycle per orbit plus 100 allocated ground cycles per repetitive tracking mechanism. NASA-STD-5017B §4.19.3 uses at least 2× all service/ground cycles for other mechanisms and 4× for safety-critical mechanisms. The 2× planning count is conditional on hazard classification; actual stroke/speed/temperature, ground and spare-cycle spectra must replace these preliminary allocations.',
  injectionInterface:{owner:'Launch provider',expected:'Requested orbit elements at the chosen epoch and the residual correction bound',spacecraftCorrectionMS:n(d.trimDv),residualAllocationMS:navigationRequirements.injectionResidualDvMS},
 };
}

export function propulsionUncertaintyBound(h={},nominal={}){
 const d=h.input??{},p=navigationRequirements,ve=G0*d.isp;
 const valid=[h.wetKg,h.propellantKg,ve].every(positive)&&[nominal.drag,nominal.trim,nominal.maneuver,nominal.protectedDv,nominal.nominal,d.trimDv,d.maneuverDv,d.residualFraction].every(nonnegative)&&h.wetKg>nominal.nominal;
 if(!valid)return {available:false,requiredLoadedKg:null,nominalConsumedKg:n(nominal.nominal),status:'unassessed',basis:p.basis};
 const nominalManeuverDv=d.trimDv+d.maneuverDv+nominal.protectedDv;
 const nominalEquivalentDv=ve*Math.log(h.wetKg/(h.wetKg-nominal.nominal));
 const dragEquivalentDv=Math.max(0,nominalEquivalentDv-nominalManeuverDv);
 const allocatedInsertionDv=Math.max(d.trimDv,p.injectionResidualDvMS),highManeuverDv=(allocatedInsertionDv+d.maneuverDv+nominal.protectedDv)*(1+p.executionFraction);
 const highDv=highManeuverDv+dragEquivalentDv*p.dragHighMultiplier+p.velocity3SigmaMS;
 const lowIsp=d.isp*(1-p.ispLowFraction),consumedHighKg=h.wetKg*(-Math.expm1(-highDv/(G0*lowIsp)));
 const residualKg=h.propellantKg*d.residualFraction,gaugingKg=h.propellantKg*p.gaugingFraction,requiredLoadedKg=consumedHighKg+residualKg+gaugingKg;
 return {available:true,nominalConsumedKg:nominal.nominal,nominalEquivalentDv,nominalManeuverDv,allocatedInsertionDv,highManeuverDv,dragEquivalentDv,highDv,lowIsp,consumedHighKg,residualKg,gaugingKg,requiredLoadedKg,availableLoadedKg:h.propellantKg,headroomKg:h.propellantKg-requiredLoadedKg,additionalAboveNominalKg:consumedHighKg+gaugingKg-nominal.nominal,status:h.propellantKg>=requiredLoadedKg?'meets':'shortfall',basis:'Deterministic sensitivity: carried predicted wet mass, 2% low Isp, 2% maneuver-execution addition, 2× nominal drag-equivalent Δv and 0.1 m/s navigation allocation. Insertion correction is the greater of the configured trim and 5 m/s allocation. Retain disposal, trapped residual and 1% loading/gauging allocation once. The carried operational reserve is available to this bound, not multiplied again.',evidence:'These bounds need provider, environment, propulsion and tracking evidence and correlations before the adopted 3σ criterion can close.'};
}

export function radiationAndLife(h={}){
 const d=h.input??{},nav=navigationAllocation(h),areal=n(d.shieldKgM2);
 return {id:'ODC-RHA-001',revision:'A',strategy:'Retain protected central compute and independent flight-avionics accommodation. Assess minimum directional shielding and local vaults against the selected parts; do not credit enclosure mass as a dose result.',
  shieldArealKgM2:areal,shieldArealGCm2:areal===null?null:areal*.1,aluminiumEquivalentMm:areal===null?null:areal/2.7,installedShieldKg:n(mass(h,'shield')),doseKradsSi:null,seeRatePerYear:null,evidenceStatus:'unassessed',referenceLifeYears:architectureReference.limits.missionYears,requestedLifeYears:n(d.missionYears),lifeStatus:!nonnegative(d.missionYears)?'unassessed':d.missionYears<=architectureReference.limits.missionYears?'inside':'outside',
  radiationBasis:'Areal mass is a geometric allocation. The Al-equivalent thickness uses 2,700 kg/m³ only as a comparison; actual materials, directional paths, spectra, dose and single-event response remain to be established.',
  provisions:[
   {category:'Customer memory / storage',selection:'ECC, periodic scrubbing, checksummed checkpoints and end-to-end artifact hashes',evidence:'Device coverage, scrub cadence, undetected-error rate and recovery calibration'},
   {category:'Compute and power switching',selection:'Partitioned current limiting / isolation and watchdog-controlled restart',evidence:'Device-specific destructive SEE and latch-up susceptibility; protection response and allowable energy'},
   {category:'Flight avionics and command',selection:'Separate flight computer and S-band command path; boot-image integrity and authenticated recovery',evidence:'Parts list, TID/SEE response, single-point-failure disposition and secure recovery test'},
   {category:'Solar, storage and thermal hardware',selection:'Use separate BOL/EOL retention curves and component life allocations',evidence:'Mission environment, dose/fluence, cycling, contamination, joint/pump life and heritage differences'},
  ],life:{...nav,simulationScope:'Nominal operation and gradual degradation. Survival, isolation and recovery are architecture requirements; no failure-event simulation is introduced.'}};
}

export const deploymentInterfaces=freeze([
 {step:'Launch / separation',authority:'Launch provider → flight computer',gate:'Release confirmation, stable power and S-band command/health path',product:'Interface control document; coupled-loads and release-dynamics responsibility'},
 {step:'Four solar wings',authority:'Flight computer → release and tracking electronics',gate:'Released restraints, travel completion and tension/latch indication before normal tracking',product:'Release, encoder, limit and motor-current channels; cold/EOL force/torque test'},
 {step:'Upper then lower radiator',authority:'Flight computer → bank hinges and latches',gate:'Each root and outer hinge locked before its coolant branch is admitted',product:'Independent latch-state indication, swept clearance and fluid-joint pressure/temperature limits'},
 {step:'Energy commissioning',authority:'Power / thermal → mission executive',gate:'MPPT and storage checks, bypass/startup sequence, stable loop and pack temperatures',product:'Branch electrical/thermal interface check and acceptance criteria'},
 {step:'Service and maneuvers',authority:'Mission executive → ADCS / payload / propulsion',gate:'Attitude acquisition and terminal lock for service; completed deployment, alignment and protected resources for burns',product:'Command/readback matrix, end-to-end sequence verification and disposal authority'},
]);

function txt(x,y,text,size=13,color='#dce8ed',anchor='start'){return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${esc(text)}</text>`;}
const rect=(x,y,w,h,fill='#233744',stroke='#5c7e8d',dash='')=>`<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" rx="4" fill="${fill}" stroke="${stroke}"${dash?` stroke-dasharray="${dash}"`:''}/>`;
const line=(x,y,xx,yy,color='#89b8c8',width=2)=>`<line x1="${x}" y1="${y}" x2="${xx}" y2="${yy}" stroke="${color}" stroke-width="${width}"/>`;
const svg=(id,title,desc,body,height=440)=>`<svg data-architecture-graphic="${id}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 ${height}" role="img" aria-label="${esc(title)}" style="display:block;width:100%;height:auto;font-family:system-ui,sans-serif"><title>${esc(title)}</title><desc>${esc(desc)}</desc>${rect(0,0,960,height,'#13212b','#13212b')}${body}</svg>`;

export function architectureTradeGraphic(subject){
 const trade=subject?.input?deriveArchitectureTrade(subject):subject;
 if(!trade)return svg('trade','Architecture comparison','Installed dimensions are unavailable.',txt(30,70,'Installed geometry is required for the architecture trade.'),140);
 if(!trade.available)return svg('trade','Architecture comparison','Installed dimensions are unavailable.',txt(30,70,'Installed geometry is required for the architecture trade.'),140);
 let art=txt(25,33,'MATCHED PACKAGING TRADE',15,'#f0f4ed')+txt(25,57,`${f(trade.commonBasis.itKW)} kW IT · ${f(trade.commonBasis.lifeYears)} years · ${f(trade.commonBasis.altitudeKm)} km · same power / storage / propellant basis`,12,'#aabec9');
 const maxHeight=Math.max(...trade.alternatives.map(a=>a.packageHeightM)),maxDiameter=Math.max(...trade.alternatives.map(a=>a.packageDiameterM)),scale=Math.min(125/Math.max(1,maxHeight),218/Math.max(1,maxDiameter));
 trade.alternatives.forEach((a,i)=>{
  const x=24+i*314,cx=x+145,base=259;
  art+=rect(x,78,298,321,'#182b36',a.selected?'#7bcebb':'#4a6572',a.selected?'':'5 3')+txt(x+13,102,a.name,13,a.selected?'#9addca':'#dce8ed')+txt(x+13,123,a.state,11,'#aabec9');
  const packageHeight=a.packageHeightM*scale,packageWidth=a.packageDiameterM*scale,coreHeight=a.bodyLengthM*scale,coreWidth=trade.dimensions.bodyWidthM*scale;
  art+=rect(cx-packageWidth/2,base-packageHeight,packageWidth,packageHeight,'none','#a3b8c3','4 3');
  art+=rect(cx-coreWidth/2,base-coreHeight,coreWidth,coreHeight,'#315f5b','#8ad0bc');
  if(a.id!=='local-radiator'){
   art+=line(cx-coreWidth/2,base,cx-coreWidth/2,base-packageHeight,'#b9cbd2',2)+line(cx+coreWidth/2,base,cx+coreWidth/2,base-packageHeight,'#b9cbd2',2);
   const sideWidth=Math.max(2,(packageWidth-coreWidth)/2*.60);
   for(const side of [-1,1]){art+=rect(cx+side*(coreWidth/2+sideWidth/2)-sideWidth/2,base-packageHeight+13,sideWidth,Math.max(7,packageHeight*.28),'#355a79','#83bce6');art+=rect(cx+side*(coreWidth/2+sideWidth/2)-sideWidth/2,base-packageHeight+3,sideWidth,Math.max(7,packageHeight*.22),'#805d3b','#e6bd82');}
  }else{
   const tiles=Math.min(12,a.tileCount),totalTileHeight=a.tileCount*a.tileThicknessM*scale,tileStep=totalTileHeight/tiles,tileH=Math.max(.5,tileStep*.74),tileWidth=a.tileSideM*scale;
   for(let j=0;j<tiles;j++)art+=rect(cx-tileWidth/2,base-coreHeight-(j+1)*tileStep,tileWidth,tileH,'#805d3b','#e6bd82');
   art+=txt(cx,base-packageHeight-8,`${a.tileCount} attached modules`,10,'#e6bd82','middle');
  }
  art+=txt(cx,282,`${f(a.packageHeightM,2)} m package height`,13,'#e8eef1','middle')+txt(cx,301,`${f(a.packageDiameterM,2)} m enclosing diameter`,11,'#aabec9','middle');
  art+=txt(x+13,329,`${f(a.comparedHardwareKg,0)} kg compared hardware`,13,'#9addca');
  art+=txt(x+13,350,`${f(a.launchKg/1000,2)} t projected launch mass`,12,'#dce8ed');
  art+=txt(x+13,376,a.selected?'Actual package / MEL boundary':'Candidate estimate · interface evidence open',10,a.selected?'#9addca':'#e6bd82');
 });
 art+=txt(25,425,'Shared envelope scale; internal symbols are schematic. Only the selected layout receives the tapered-fairing check.',11,'#aabec9');
 return svg('trade','Matched central-core, compact-backbone and radiator-local architecture comparison','Same installed compute demand, mission, power, storage and propellant basis. Candidate geometry and predicted mass retain declared assumptions and do not replace the operating vehicle.',art,447);
}

export function structuralBoundsGraphic(subject){
 const bounds=subject?.input?structuralBounds(subject):subject;
 if(!bounds)return svg('bounds','Structure, mechanism and pointing bounds','An installed geometry is required.',txt(30,70,'Installed geometry is required for structural bounds.'),140);
 if(!bounds.available)return svg('bounds','Structure, mechanism and pointing bounds','An installed geometry is required.',txt(30,70,'Installed geometry is required for structural bounds.'),140);
 const b=bounds;let art=txt(25,33,'FLEXIBLE APPENDAGES / CONTROL SEPARATION',15,'#f0f4ed');
 const lower=.001,upper=Math.max(1,...b.modeBounds.map(x=>x.highHz).filter(positive)),x=v=>39+475*Math.log(Math.max(lower,v)/lower)/Math.log(upper/lower);
 art+=line(40,212,515,212,'#64818f',1);
 for(const value of [.001,.01,.1,1,10])if(value<=upper){art+=line(x(value),76,x(value),216,'#354e5c',1)+txt(x(value),235,`${f(value,3)} Hz`,10,'#9cb3c0','middle');}
 b.modeBounds.forEach((m,i)=>{const y=109+i*65;art+=txt(40,y-21,m.label,12);if(positive(m.lowHz)&&positive(m.highHz))art+=line(x(m.lowHz),y,x(m.highHz),y,'#7fc7d5',10)+line(x(m.nominalHz),y-10,x(m.nominalHz),y+10,'#f0d899',3);art+=txt(515,y-20,`${f(m.lowHz,3)}–${f(m.highHz,3)} Hz`,11,'#9addca','end');});
 art+=line(x(b.bodyBandwidthHz),69,x(b.bodyBandwidthHz),211,'#ecac81',2)+txt(40,264,`Body bandwidth ${f(b.bodyBandwidthHz,4)} Hz · first-mode ratio ${f(b.modalSeparation,1)}×`,12,'#ecac81');
 art+=txt(40,285,'Project separation target ≥5×. Gain/phase/flexible suppression still need plant evidence.',10,'#aabec9');
 art+=txt(555,65,'MECHANISM OUTPUT REQUIREMENTS',13,'#f0f4ed');
 b.mechanisms.forEach((m,i)=>{const y=95+i*48,color=m.status==='meets'?'#9addca':'#efad94';art+=txt(555,y,m.label,12)+txt(930,y,`${f(m.factoredNm,1)} / ${f(m.availableNm,0)} N·m`,12,color,'end')+txt(555,y+18,`Analysis-factor margin ${f(100*m.margin,1)}% · ${m.count} units`,10,color);});
 art+=txt(25,322,'POINTING ALLOCATION',13,'#f0f4ed')+txt(25,347,`Body RSS 3σ: ${f(b.pointing.allocatedBody3SigmaArcsec)} arcsec`,12,'#9addca')+txt(345,347,`Coarse acquisition: ±${f(b.pointing.coarseAcquisitionHalfConeDeg,2)}°`,12)+txt(650,347,`Fine residual: ${f(b.pointing.fineJitterAllocationUrad,2)} µrad`,12,'#e6bd82');
 art+=txt(25,375,'Equivalent beams and allocated errors are preliminary analytical models. They do not claim measured modes or pointing.',11,'#aabec9');
 return svg('bounds','Flexible modes, factored mechanism torque budgets and pointing allocation','The first-mode interval is compared with the current body controller bandwidth. Mechanism demands use NASA analysis-stage factors and explicit equipment torque requirements. Body and terminal pointing allocations are distinct.',art,398);
}

export function propulsionUncertaintyGraphic(bound){
 if(!bound?.available)return svg('propulsion-uncertainty','Propulsion uncertainty envelope','The nominal atmosphere and maneuver case must first be supported.',txt(25,40,'PROPULSION UNCERTAINTY ENVELOPE',15,'#f0f4ed')+txt(25,76,'A supported nominal maneuver / atmosphere case is required.',13,'#e6bd82')+txt(25,101,'The deterministic sensitivity is unassessed outside that model basis.',12,'#aabec9'),130);
 const maximum=Math.max(bound.availableLoadedKg,bound.requiredLoadedKg,1)*1.05,scale=790/maximum,x=83;
 let art=txt(25,33,'CONTROLLED PROPULSION SENSITIVITY',15,'#f0f4ed')+txt(25,58,'Deterministic bounds support preliminary sizing; statistical 3σ evidence remains open.',12,'#aabec9');
 const segments=[['Nominal consumed',bound.nominalConsumedKg,'#76afcf'],['Bound addition',Math.max(0,bound.consumedHighKg-bound.nominalConsumedKg),'#dbad6a'],['Gauging allocation',bound.gaugingKg,'#c8a2d4'],['Trapped residual',bound.residualKg,'#6f9a8e']];
 art+=txt(x,95,`Loaded ${f(bound.availableLoadedKg,1)} kg`,13,'#9addca')+rect(x,109,790,28,'#213641','#213641')+rect(x,109,bound.availableLoadedKg*scale,28,'#416b60','#416b60');
 let cursor=0;for(const [,kg,color] of segments){art+=rect(x+cursor*scale,169,kg*scale,28,color,color);cursor+=kg;}
 art+=line(x+bound.availableLoadedKg*scale,150,x+bound.availableLoadedKg*scale,209,'#9addca',2)+txt(x,226,`Bound requires ${f(bound.requiredLoadedKg,1)} kg · remaining ${f(bound.headroomKg,1)} kg`,14,bound.status==='meets'?'#9addca':'#efad94');
 segments.forEach(([label,kg,color],i)=>{const xx=25+(i%2)*465,yy=260+Math.floor(i/2)*31;art+=rect(xx,yy-10,11,11,color,color)+txt(xx+20,yy,`${label}: ${f(kg,2)} kg`,12);});
 art+=txt(25,328,`Delivered-Isp floor ${f(bound.lowIsp,1)} s · allocated high-case Δv ${f(bound.highDv,1)} m/s`,12,'#dce8ed');
 art+=txt(25,351,'Disposal is counted once. Operational reserve can cover this sensitivity; no second reserve multiplier is added.',11,'#aabec9');
 return svg('propulsion-uncertainty','Nominal consumption and the deterministic propulsion uncertainty envelope','A stacked mass budget separates nominal use, allocated high-case addition, gauging and trapped residual, compared with the fixed loaded propellant.',art,374);
}

const table=(heads,rows)=>'<div class="arch-scroll"><table class="arch-table"><thead><tr>'+heads.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(cell=>'<td>'+cell+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
export function renderArchitectureTrade(h){
 const t=deriveArchitectureTrade(h),b=structuralBounds(h),r=radiationAndLife(h),a=t.applicability;
 if(!t.available)return '<section class="panel"><div class="arch-pad"><h2>Architecture assessment</h2><p>Installed geometry is unavailable.</p></div></section>';
 const source=entry=>'<a href="'+esc(entry.url)+'" target="_blank" rel="noopener noreferrer">'+esc(entry.title)+' ↗</a>';
 const current=t.commonBasis;
 const summary='<div class="arch-review-summary"><div><small>Selected architecture</small><strong>Protected central core</strong><span>ODC-01 Rev I · AD-01</span></div><div><small>Current workload</small><strong>'+f(current.itKW)+' kW IT</strong><span>'+f(current.altitudeKm)+' km · '+f(current.lifeYears)+' years</span></div><div><small>Applicability</small><strong>'+esc(a.exceeded.length?a.exceeded.length+' bounds exceeded':a.unassessed.length?'Unassessed':'Within study bounds')+'</strong><span>Evidence status remains open</span></div></div>';
 return '<section class="panel arch-review"><header class="panelhead"><h2>Architecture decision and reference mission</h2><span class="arch-stamp">'+esc(architectureReference.id+' / REV '+architectureReference.revision)+'</span></header><div class="arch-pad"><p>'+esc(architectureReference.decisionRationale)+'</p>'+summary+'<p class="arch-method">Reference: 550 km circular, 53° inclination, epoch 4 November 2026, RAAN 30°, five-year allocation, 12 trays / 24 kW accelerators plus explicit host and fabric demand. Launch-site-aligned angles and all mission edits remain explicit mission cases. This reference claims no continuous sunlight.</p></div>'+architectureTradeGraphic(t)+'<div class="arch-pad"><p class="arch-method">'+esc(t.comparedBoundary)+'</p><details class="arch-review-detail"><summary>Trade criteria, assumptions and decision gate</summary><p>'+esc(t.selectionGate)+'</p><p>Current axial drivers: '+t.dimensions.drivers.map(driver=>esc(driver.label)+' '+f(driver.value,2)+' m').join('; ')+'. These dimensions share one launch-axis package.</p>'+t.alternatives.map(option=>'<article><h3>'+esc(option.name)+'</h3><p><b>Heat path.</b> '+esc(option.thermal)+'</p><p><b>Packaging.</b> '+esc(option.packingBasis)+'</p><p><b>Mass estimate.</b> '+esc(option.massBasis)+'</p><p><b>Benefits.</b> '+esc(option.advantages.join(' '))+'</p><p><b>Consequences.</b> '+esc(option.constraints.join(' '))+'</p></article>').join('')+'</details><details class="arch-review-detail"><summary>Reference designs and normalization</summary><p>Hold useful load, orbit, life, nominal emitting area, power/storage and service boundary constant. The current and historical competitor configurations remain separate. Public non-disclosure supplies no missing hardware value.</p>'+t.sources.map(entry=>'<article><h3>'+source(entry)+'</h3><p>'+esc(entry.use)+'</p></article>').join('')+'</details></div></section>'
 +'<section class="panel arch-review"><header class="panelhead"><h2>Hardware and model applicability</h2><span class="arch-stamp">'+esc(a.label)+'</span></header><div class="arch-pad"><p>'+esc(a.meaning)+'</p></div>'+table(['Scope','Current value','Study boundary','Basis'],a.checks.map(c=>[esc(c.label)+'<small>'+esc(c.kind+' · '+c.status)+'</small>',f(c.actual,3)+' '+esc(c.unit),c.minimum===c.maximum?f(c.minimum,3):f(c.minimum,3)+'–'+f(c.maximum,3),esc(c.basis)]))+'</section>'
 +'<section class="panel arch-review"><header class="panelhead"><h2>Mechanisms, structure and pointing</h2><span class="arch-stamp">'+esc(mechanicalAllocation.id)+'</span></header>'+structuralBoundsGraphic(b)+'<div class="arch-pad"><details class="arch-review-detail"><summary>Load paths, factors and material requirements</summary>'+(b.longerons?'<p>'+esc(b.longerons.basis)+'</p>'+table(['Four-longeron screen','Demand / allocation','Calculated margin'],[['Equivalent tube wall',f(b.longerons.equivalentWallM*1000,2)+' mm; '+f(b.longerons.unsupportedSpanM,2)+' m maximum inter-frame span','—'],['Metallic yield',f(b.longerons.requiredYieldPa/1e6,1)+' MPa required / '+f(b.longerons.yieldRequirementPa/1e6,0)+' MPa allocation',f(100*b.longerons.yieldMargin,1)+'%'],['Metallic ultimate',f(b.longerons.requiredUltimatePa/1e6,1)+' MPa required / '+f(b.longerons.ultimateRequirementPa/1e6,0)+' MPa allocation',f(100*b.longerons.ultimateMargin,1)+'%'],['Inter-frame Euler stability',f(b.longerons.eulerN/1000,1)+' kN critical / '+f(b.longerons.maxCompressionN/1000,1)+' kN limit',f(100*b.longerons.stabilityMargin,1)+'%']])+'<p>'+esc(b.longerons.evidence)+'</p>':'')+'<p>Mechanism torque margin = minimum output / (3 × variable resistance + 1.5 × fixed resistance + 1.25 × acceleration torque) − 1. Rates match the current tracking allocations; acceleration ramps are preliminary equipment requirements. These factors are controlled and are not user sliders.</p><p>'+source(architectureSources.find(s=>s.id==='mechanisms-5017'))+' · '+source(architectureSources.find(s=>s.id==='gevs-structure'))+'</p></details><details class="arch-review-detail"><summary>Commissioning interface gates</summary>'+table(['Step','Authority','Required gate / evidence'],deploymentInterfaces.map(step=>[esc(step.step),esc(step.authority),esc(step.gate)+'<small>'+esc(step.product)+'</small>']))+'</details></div></section>'
 +'<section class="panel arch-review"><header class="panelhead"><h2>Radiation, component life and navigation</h2><span class="arch-stamp">SELECTED ASSURANCE ARCHITECTURE</span></header><div class="arch-pad"><p>'+esc(r.strategy)+'</p><div class="arch-review-summary"><div><small>Carried shield areal mass</small><strong>'+f(r.shieldArealGCm2,3)+' g/cm²</strong><span>'+f(r.aluminiumEquivalentMm,2)+' mm Al-equivalent comparison</span></div><div><small>Directional dose / SEE</small><strong>Unassessed</strong><span>Environment and part response required</span></div><div><small>Tracking life allocation</small><strong>'+f(r.life.trackingEquivalentCycles,0)+' cycles</strong><span>'+f(r.life.plannedTwoLifeCycles,0)+' at the conditional 2× cycle factor</span></div></div><p class="arch-method">'+esc(r.radiationBasis)+' '+esc(r.life.cycleBasis)+'</p><details class="arch-review-detail"><summary>Part assurance and data-integrity provisions</summary>'+table(['Hardware class','Selected provision','Evidence to establish'],r.provisions.map(row=>[esc(row.category),esc(row.selection),esc(row.evidence)]))+'<p>'+source(architectureSources.find(s=>s.id==='radiation-rha'))+'</p></details><details class="arch-review-detail"><summary>Navigation, injection and disposal contract</summary><p>'+esc(navigationRequirements.architecture)+'</p><p>'+esc(navigationRequirements.equipmentBoundary)+'</p><p>Project requirements: '+navigationRequirements.position3SigmaM+' m position and '+navigationRequirements.velocity3SigmaMS+' m/s velocity at 3σ; '+navigationRequirements.injectionResidualDvMS+' m/s residual insertion-correction allocation. These are interface requirements, with receiver/provider verification open.</p><p>'+esc(navigationRequirements.ownership)+' '+esc(navigationRequirements.disposal)+'</p><p class="arch-method">The Propulsion domain computes a separate deterministic uncertainty sensitivity. That calculation does not substitute for the adopted statistical 3σ evidence.</p></details></div></section>';
}
