// Versioned runnable realizations, separate from the immutable public evidence.
// A whole-reference opening proposes a complete snapshot. Changing a mission
// case never sizes hardware. Resource shortfalls are valid study outcomes.
import {normalizeDesign,defaults,sizingEnvelope,sizingLabel,meetsSizingRequirement} from './design.js';
import {getReferenceCenter,defaultReferenceCenterId} from './reference-centers.js';
import {energyDesignChecks} from './energy-system.js';
import {legacyReferenceSnapshots,legacyReferenceConfigurationRevision,legacyReferenceConfigurationMetadata} from './reference-configurations-r1.js';
import {referenceMissionInputs,referenceMissionDescription,normalizeReferenceMissionCase,sampledSourceEnvironmentalCase} from './reference-missions.js';
import {referenceEvidenceRevision,referenceEvidenceFor,referenceEvidenceSummary} from './reference-evidence.js';
import {redwireThermalSourceComparison} from './reference-thermal-comparison.js';

export const referenceConfigurationRevision='odc-study-2026-11-r2';
export const referenceConfigurationRevisions=Object.freeze([referenceConfigurationRevision,legacyReferenceConfigurationRevision]);
const sharedAssumptions=Object.freeze([
 'One complete self-contained spacecraft is the modeled unit. The selected physical family supplies its payload locations, deployed surfaces and thermal connections.',
 'Unpublished battery, propulsion, compute implementation, bus equipment, relay contract, folded interfaces and mission details remain declared project allocations. Generic compute trays do not become supplier flight hardware.',
 'The NASA-tailored margin policy is unchanged. The standard resource screen retains EOL electrical performance and the conservative zero-beta eclipse; a separately labeled seasonal source-environment screen uses the same margins.',
 'Source and common mission cases use identical installed hardware. Orbit, epoch or mission-duration changes evaluate that equipment and never increase arrays, radiators, storage, propellant or actuator ratings.',
 'Reported vehicle mass and source dimensions remain separate from model estimates. A numerical pass does not qualify deployment, structural/control response, radiation lifetime, launch performance or purchased relay service.'
]);
const descriptions={
 'redwire-8kw':{
  architectureId:'redwire-platform',architectureFamily:'redwire-platform',
  adaptation:'Flat-stack bus with two 2 m × 20 m ROSA wings and one 3.25 m square radiator-mounted compute platform. Passive payload transport replaces the old remote pumped-loop adaptation.',
  powerBasis:'Preserve 8 kW installed IT. The source allocates 2 kW spacecraft services; the modeled bus computes its own demand and can exceed that allocation.',
  assumptions:[
   '80 m² photovoltaic blanket and 10.5625 m² radiator planform are source dimensions. Two emitting faces provide 21.125 m²; no area increase is applied to make a budget pass.',
   'The passive path uses allocated 1.2 kW/K conductance and 12 kW capacity; the auxiliary bus path is 0.2 kW/K. The bus thermal strap and its unverified hinge route are an additional project accommodation, distinct from the paper’s electrical-only payload-platform hinge. These ratings and the spreader/heat-pipe mass model are preliminary allocations.',
   'The source mission is 1,500 km SSO. Three years, the epoch and 18:00 LTAN are allocated; the paper’s beta 90° steady thermal point is a separate source comparison.',
   'The retained 12 kWh battery, 250 kg propellant and New Glenn carrier are allocated bus hardware. The approximately 1.1 m Falcon 9 stack height is not transferred to the New Glenn envelope.'
  ]
 },
 'starcloud-3':{
  architectureId:'starcloud-inline',architectureFamily:'starcloud-inline',
  adaptation:'Thin central equipment bay with two inline deployable sequences, interpreted as inboard radiator and outboard solar sections, plus two allocated optical terminal stations.',
  powerBasis:'Retain 235 kW continuous IT as an explicit stress-case interpretation. The October company statement does not resolve whether 235 kW is IT, generation, average or peak.',
  assumptions:[
   '1,721 m² PV and 431 m² radiator planform remain controlled engineering allocations. Solar wing aspect 10 gives a more compact paired-inline layout than the old aspect 40; neither ratio is a manufacturer dimension. Installed areas are unchanged.',
   'The public 400 ft (121.92 m) deployable statement has an unresolved wing/full-span boundary. The actual derived full spacecraft span is shown alongside it without treating those boundaries as equivalent.',
   'Segment widths, hinge counts, fluid type and folded package are allocations. Inline radiators share the appendage orientation; they do not inherit independent Sun avoidance.',
   'The 400 V bus, 128 generic trays, 266 kWh battery and 2,938 kg propellant are conservative study hardware retained from r1, not a reconstruction of the company’s approximately 2 t mass.',
   'Two Mini Laser stations map the initial procurement to this study. Up to 25 Gbit/s is terminal capability, separate from allocated relay service and acquisition; simultaneous guaranteed service is not asserted.',
   '700 km SSO is selected inside the 600–850 km proposed envelope. Five years, the epoch, 18:00 LTAN and Starship integration details remain allocations. The May 200 kW / 3 t source revision is kept separately.'
  ]
 },
 'starmind-ai1':{
  architectureId:'starmind-cross',architectureFamily:'starmind-cross',
  adaptation:'Compact central structure with broad paired solar wings and opposed tall radiator blades inside the published 75 m × 30 m deployed envelope.',
  powerBasis:'Preserve 250 kW peak and 175 kW mean IT with the retained generic tray/fabric duty allocation. The archived array rating is 210 kW at 250 W/m².',
  assumptions:[
   '840 m² collecting area is derived from 210,000 W / 250 W/m², conditional on matched source rating conditions. Silicon technology is a project allocation; efficiency 0.225 and delivery 250/(1,361 × 0.225) reproduce that aggregate BOL density without claiming supplier cell or string qualification.',
   'The source’s 160 m² radiator has an unresolved face convention. This recipe explicitly allocates 160 m² planform and 320 m² two-face emission. If the source means total emitting area, an 80 m² planform sensitivity is required.',
   'Two independent half-duty liquid loops each have a duty and standby pump. Published redundancy does not establish full-load capability after loss of one complete loop.',
   '128 generic study trays remain a performance proxy; the planned optimized Vera Rubin NVL72 is not modeled as an unchanged terrestrial rack. The optical + S-band TT&C package is an explicit allocation, with no large Ka payload reflector installed. The package can be changed as an installed-hardware review; no source terminal count or supplier RF design is implied. Propulsion, battery and fold schedule are also allocations.',
   '550 km SSO, five years, epoch and 18:00 LTAN complete the allocated mission. A source-intent orbit and seasonal screen do not establish continuous sunlight.'
  ]
 },
 'orbital-1-202609':{
  architectureId:'orbital-reflex',architectureFamily:'orbital-reflex',
  adaptation:'Separate Reflex-led revision with a preliminary rectangular bus and paired deployables. Exact September geometry remains allocated rather than inherited from June.',
  powerBasis:'Retain 250 kW peak IT and 78% active duty as an explicit stress case. The published approaching-250 kW peak target does not establish its electrical accounting boundary.',
  assumptions:[
   '1,505 m² PV, 455 m² radiator planform, 128 generic trays, 284 kWh battery and 2,758 kg propellant are engineering allocations; source geometry and whole mass remain unresolved.',
   'Passive radiation to space does not mean pump-free internal transport. This runnable revision selects a preliminary pumped circuit, with qualification and working-fluid applicability kept visible.',
   'June’s 2 t mass and 100 m span are not imported, and the April image is not represented as this September spacecraft.',
   '650 km SSO lies inside the program filing’s 500–850 km band. Mapping it to the Reflex revision, five years, LTAN, epoch and a candidate Starship package are allocated.'
  ]
 },
 'orbital-1-202606':{
  architectureId:'orbital-rack',architectureFamily:'orbital-rack',
  adaptation:'Rack-centered rectangular bus with a 100 m full solar-axis span and a separate radiator axis, informed by the historical April company render.',
  powerBasis:'Keep approximately 100 kW as solar generation. Allocated 285 m² triple-junction PV produces approximately 100.07 kW BOL before MPPT; installed IT remains a separate 35 kW study load.',
  assumptions:[
   'The published one-rack / approximately eight-server description is a functional accommodation, not a dimensional equipment drawing. The generic 24-tray implementation remains a capacity proxy.',
   '100 m constrains the full deployed solar-axis span while conserving 285 m² installed collecting area. Interpreting the April image’s pale appendages as radiators is qualitative and predates the June configuration.',
   '66 m² radiator planform, 41 kWh battery, 550 kg propellant, pumped transport and New Glenn integration remain allocations. The independent model mass does not replace the source’s approximately 2 t statement.',
   '650 km SSO, five years, epoch and 18:00 LTAN are a selected case inside the program filing envelope. The June continuous-sun intent is evaluated rather than guaranteed.'
  ]
 },
 'star-catcher-self-powered':{
  architectureId:'heatlift-study',architectureFamily:'heatlift-study',
  adaptation:'Analytical self-powered node with distinct cold-side transport, a powered heat pump and hot-side radiators. Geometry is a study layout, not a claimed manufacturer vehicle.',
  powerBasis:'Keep 250 / 1.3 = 192.3077 kW continuous IT. The modeled heat-pump work and all other bus loads are computed explicitly; total modeled power can exceed the source’s 250 kW allocation.',
  assumptions:[
   'Restore the source’s approximately 1,100 m² PV allocation. The 351 m² radiator planform and 217 kWh battery remain engineering choices; no resource is resized to force closure.',
   'Cold side 373.15 K, hot side 423.15 K, cooling COP 4, 200 kW cold-side capacity and 625 kg heat-pump/drive mass are analytical allocations. The Carnot bound is a physical limit, not a qualification certificate.',
   'The source’s 41.1 kg/kW × 250 kW = 10.275 t remains a derived comparison mass. Compressor, fluids, seals, pressure, materials and temperature-qualified payload hardware are unresolved.',
   'The source does not specify a unique flight orbit or shape; 550 km / 53°, five years and a candidate Starship package are allocated. Beamed power and the 81-node cluster remain outside this single-node case.'
  ]
 }
};
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value)}return value;};
const hardwarePatches=freeze({
 'redwire-8kw':{architectureFamily:'redwire-platform',communicationsPackage:'full',architectureSpanM:0,architectureHeightM:0,solarM2:80,solarWingAspect:10,radiatorM2:10.5625,passiveTransportKWK:1.2,passiveTransportCapacityKW:12,passiveBusConductanceKWK:.2,absorptivity:.15,emissivity:.85},
 'starcloud-3':{architectureFamily:'starcloud-inline',communicationsPackage:'full',architectureSpanM:0,architectureHeightM:0,solarWingAspect:10},
 'starmind-ai1':{architectureFamily:'starmind-cross',communicationsPackage:'optical-ttc',architectureSpanM:75,architectureHeightM:30,solarM2:840,radiatorM2:160,pv:'silicon',pvEfficiency:.225,solarDelivery:250/(1361*.225)},
 'orbital-1-202609':{architectureFamily:'orbital-reflex',communicationsPackage:'full',architectureSpanM:0,architectureHeightM:0},
 'orbital-1-202606':{architectureFamily:'orbital-rack',communicationsPackage:'full',architectureSpanM:100,architectureHeightM:0},
 'star-catcher-self-powered':{architectureFamily:'heatlift-study',communicationsPackage:'full',architectureSpanM:0,architectureHeightM:0,solarM2:1100,heatPumpCOP:4,heatPumpColdK:373.15,heatPumpHotK:423.15,heatPumpColdCapacityKW:200,heatPumpMassKg:625,radiatorDesignK:423.15}
});
export const referenceConfigurationMetadata=freeze(Object.fromEntries(Object.entries(descriptions).map(([id,item])=>[id,{id,revision:referenceConfigurationRevision,previousRevision:legacyReferenceConfigurationRevision,evidenceRevision:referenceEvidenceRevision,realization:'reference-family-study',...item,assumptions:[item.powerBasis,...item.assumptions,...sharedAssumptions],changes:Object.keys(hardwarePatches[id]).map(key=>({field:key,previous:legacyReferenceSnapshots[id][key]??(key==='architectureFamily'?'protected-core':null),current:hardwarePatches[id][key],kind:'installed-hardware'}))}])));

const recipes=new Map();
export function buildReferenceDesign(id=defaultReferenceCenterId,options={}){
 if(!getReferenceCenter(id)||!Object.hasOwn(legacyReferenceSnapshots,id))throw Error('Unknown design reference orbital data center: '+id);
 const revision=options.revision||referenceConfigurationRevision;
 if(!referenceConfigurationRevisions.includes(revision))throw Error('Unknown reference recipe revision: '+revision);
 const archived=revision===legacyReferenceConfigurationRevision,missionCase=archived?'common':normalizeReferenceMissionCase(options.missionCase??'source');
 const key=[id,revision,missionCase].join('|');
 if(!recipes.has(key)){
  const raw=archived?{...legacyReferenceSnapshots[id],architectureFamily:'protected-core',referenceMissionCase:'common'}:{...legacyReferenceSnapshots[id],...hardwarePatches[id],...referenceMissionInputs(id,missionCase),referenceCenterRevision:revision};
  recipes.set(key,Object.freeze(normalizeDesign(raw)));
 }
 return {...recipes.get(key)};
}
export function referenceMetadata(id,revision=referenceConfigurationRevision){return revision===legacyReferenceConfigurationRevision?legacyReferenceConfigurationMetadata[id]||null:referenceConfigurationMetadata[id]||null}
const associationCache=new WeakMap();
export function referenceAssociation(hOrInput={}){
 const input=hOrInput.input||hOrInput,reference=getReferenceCenter(input.referenceCenterId);if(!reference)return null;
 const normalized=normalizeDesign(input),revision=input.referenceCenterRevision||null,knownRevision=referenceConfigurationRevisions.includes(revision),missionCase=normalizeReferenceMissionCase(normalized.referenceMissionCase);
 const signature=JSON.stringify(normalized),cached=associationCache.get(hOrInput);if(cached?.signature===signature)return cached.value;
 const recipe=knownRevision?buildReferenceDesign(reference.id,{revision,missionCase}):null;
 const modified=!knownRevision||Object.keys(defaults).some(key=>!Object.is(normalized[key],recipe[key]));
 const metadata=referenceMetadata(reference.id,revision),family=normalized.architectureFamily||'protected-core';
 const value=Object.freeze({id:reference.id,revision,name:reference.name,modified,archived:revision===legacyReferenceConfigurationRevision,currentRevision:referenceConfigurationRevision,missionCase,architectureFamily:family,architectureId:family==='protected-core'?`odc-central-core-${normalized.radiatorPanelsPerBank}panel`:family,referenceArchitectureId:metadata?.architectureId||null,evidenceRevision:metadata?.evidenceRevision||null,realization:metadata?.realization||'study-adaptation'});
 associationCache.set(hOrInput,{signature,value});return value;
}
const assessmentCache=new WeakMap();
function envelopeChecks(envelope){return Object.entries(envelope.rates).map(([id,ratio])=>({id,label:sizingLabel(id),ratio,status:meetsSizingRequirement(ratio,id)?'meets':'shortfall'}))}
export function assessReferenceDesign(h){
 if(!h?.input||!Array.isArray(h.massLedger))throw Error('Reference assessment requires sized hardware');
 if(assessmentCache.has(h))return assessmentCache.get(h);
 const association=referenceAssociation(h),metadata=association?referenceMetadata(association.id,association.revision):null,d=h.input,envelope=sizingEnvelope(h);
 const checks=envelopeChecks(envelope);
 for(const check of energyDesignChecks(h)){const ratio=check.status==='unassessed'?null:check.operator==='≤'?(check.actual>0?check.required/check.actual:Infinity):(check.required>0?check.actual/check.required:Infinity);checks.push({...check,ratio});}
 if(h.errors.length)checks.push({id:'validInputs',label:'Input validation',ratio:0,status:'shortfall',detail:h.errors.join('; ')});
 const idle=d.idleComputePolicy==='off'?0:h.idleKw,feasible=envelope.feasible&&checks.every(check=>check.status==='meets');
 const sourceEnvironment=sampledSourceEnvironmentalCase(h),sourceEnvelope=sourceEnvironment.status==='sampled'?sizingEnvelope(h,d.missionYears,{basis:'source'}):null;
 const sourceChecks=sourceEnvelope?envelopeChecks(sourceEnvelope).filter(c=>['solar','battery','powerDistribution','thermal','coolantTransport'].includes(c.id)):[];
 const architecture=h.physicalArchitecture||null,emittingArea=architecture?.surfaces?.filter(s=>s.type==='rad').reduce((sum,s)=>sum+s.areaM2*s.emittingFaces,0);
 const result={referenceId:association?.id||null,association,adaptation:association?.modified?`Modified study variant of ${association.name}. Active inputs and the resolved physical family are authoritative; the archived starting recipe remains provenance.`:metadata?.adaptation||'Custom spacecraft configuration.',resourceStatus:feasible?'meets':'shortfall',feasible,checks,shortfalls:checks.filter(check=>check.status!=='meets'),applicability:h.applicability,evidenceStatus:'open',scope:'Conservative zero-beta preliminary resource and launch-envelope screen. Seasonal source conditions, chronological service, structural/control limits and PDR acceptance remain separate.',
  missionCase:normalizeReferenceMissionCase(d.referenceMissionCase),missionDescription:association?referenceMissionDescription(association.id,d.referenceMissionCase):null,sourceEnvironment,sourceEnvironmentChecks:sourceChecks,sourceEnvironmentStatus:sourceChecks.length&&sourceChecks.every(c=>c.status==='meets')?'meets':sourceChecks.length?'shortfall':'unassessed',sourcePointComparison:association?.id==='redwire-8kw'?redwireThermalSourceComparison():null,fieldEvidence:association?referenceEvidenceFor(association.id):[],evidenceSummary:association?referenceEvidenceSummary(association.id):null,
  modelMetrics:{communicationsPackage:h.serviceArchitecture.terminal.installedPackage,communicationsPackageLabel:h.serviceArchitecture.terminal.installedPackageLabel,opticalTerminalCount:h.serviceArchitecture.terminal.payloadOpticalTerminals,kaTerminalCount:h.serviceArchitecture.terminal.payloadRFReflectors,sPatchCount:h.serviceArchitecture.terminal.flightPatchLocations,terminalMassKg:h.serviceArchitecture.terminal.installedMassKg,itPowerKW:h.itKw,peakItPowerKW:h.itKw,meanItPowerKW:h.itKw*d.duty+idle*(1-d.duty),meanBusPowerKW:envelope.meanBus,peakBusPowerKW:envelope.peakBus,bolGenerationPowerKW:h.energySystem.electrical.bolArrayKW,eolAvailablePowerKW:envelope.pdr.power.eolPowerAvailableKW,launchMassKg:h.launchKg,dryMassKg:h.dryKg,stowedDiameterM:h.stowedDiameterM,stowedLengthM:h.stowedLengthM,solarAreaM2:h.solarM2,radiatorPlanformM2:h.radiatorM2,radiatingAreaM2:Number.isFinite(emittingArea)?emittingArea:2*h.radiatorM2,batteryKWh:h.batteryKWh,propellantKg:h.propellantKg,storageTB:h.storageTB,trayCount:h.trays,solarWingLengthM:h.wingLengthM,solarWingWidthM:h.wingWidthM,radiatorPanelsPerBank:h.radiatorPanelsPerBank||2,orbitAltitudeKm:d.altitudeKm,inclinationDeg:d.inclinationDeg,raanDeg:d.raanDeg,missionYears:d.missionYears,architectureFamily:d.architectureFamily||'protected-core',deployedSpanM:architecture?.dimensions?.fullSolarSpanM??(d.architectureSpanM||null),deployedHeightM:architecture?.dimensions?.deployed?.size?.[1]??(d.architectureHeightM||null)},
  assumptionsContext:metadata?'versioned-reference-recipe':'custom-model-basis',nominalRecipeContext:metadata?{id:metadata.id,revision:metadata.revision,evidenceRevision:metadata.evidenceRevision||null,adaptation:metadata.adaptation,changes:metadata.changes||[],assumptions:metadata.assumptions}:null,assumptions:association?.modified?['These assumptions describe the starting recipe. This variant is modified; its saved inputs and model metrics are authoritative.',...metadata.assumptions]:metadata?.assumptions||sharedAssumptions};
 assessmentCache.set(h,result);return result;
}
