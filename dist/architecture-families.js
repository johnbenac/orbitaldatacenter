// A reference selects a physical family; mission edits never resize its installed
// areas or equipment. Public geometry and preliminary packaging allocations are
// kept separate in the resolved manifest below.
import {deploymentLayout,leafPose,leafAxes,leafCorners,deploymentStages,terminalStations} from './deployment.js';
import {installedCommunications} from './communications-packages.js';
import {redwireRootRelief,radiatorPanelNetArea} from './radiator-surface-area.js';
export const architectureGeometryRevision='odc-geometry-2026-11-r2';

const common={kaTerminalCount:1,sPatchCount:2,opticalTerminalCount:1,payloadLocation:'central-rack',radiatorBankCount:2,thermalTopology:'pumped',solarBasePitchDeg:0,radiatorTracking:'root-cant'};
export const architectureFamilies=Object.freeze({
 'protected-core':Object.freeze({...common,id:'protected-core',label:'Protected core / articulated banks',solarWingCount:4,geometryKind:'protected-core',deploymentDurationS:1200,launchInterface:'aft-circular',evidence:'Retained version-50 workbench allocation.'}),
 'redwire-platform':Object.freeze({...common,id:'redwire-platform',label:'Redwire local compute platform',solarWingCount:2,radiatorBankCount:1,payloadLocation:'radiator',thermalTopology:'passive-local',geometryKind:'flat-platform',solarBasePitchDeg:90,radiatorTracking:'fixed-after-deployment',deploymentDurationS:900,launchInterface:'flat-stack',evidence:'Redwire May 2026 point design: two ROSA wings and one heat-pipe compute/radiator platform; bus equipment and mechanism timing remain allocations.'}),
 'starcloud-inline':Object.freeze({...common,id:'starcloud-inline',label:'Starcloud paired inline appendages',solarWingCount:2,opticalTerminalCount:2,geometryKind:'paired-inline',radiatorTracking:'fixed-after-deployment',deploymentDurationS:3600,launchInterface:'flat-dispenser',evidence:'Manufacturer animation supports paired inline appendages. Radiator/PV segmentation, exact lengths and fold joints are preliminary allocations; two optical terminals follow the announced procurement scope.'}),
 'starmind-cross':Object.freeze({...common,id:'starmind-cross',label:'AI1 broad wings / opposed radiators',solarWingCount:2,geometryKind:'cross-plane',thermalTopology:'redundant-pumped',deploymentDurationS:2400,launchInterface:'flat-stack',evidence:'Dated August 2026 AI1 envelope and imagery; radiator planform convention and internal packaging are explicit allocations.'}),
 'orbital-rack':Object.freeze({...common,id:'orbital-rack',label:'Orbital historical rack spacecraft',solarWingCount:2,geometryKind:'rack-cross',deploymentDurationS:1800,launchInterface:'rack-cradle',evidence:'Historical April imagery interpreted with the separate June 2026 generation/span record. Pale appendages are interpreted as radiators.'}),
 'orbital-reflex':Object.freeze({...common,id:'orbital-reflex',label:'Orbital / Reflex allocated spacecraft',solarWingCount:2,geometryKind:'rack-cross',deploymentDurationS:3000,launchInterface:'rack-cradle',evidence:'September 2026 functional platform revision. This runnable rack-and-appendage geometry is an allocation, not a published Reflex reconstruction.'}),
 'heatlift-study':Object.freeze({...common,id:'heatlift-study',label:'Self-powered heat-lift study',solarWingCount:4,geometryKind:'protected-core',thermalTopology:'heat-lift',deploymentDurationS:3000,launchInterface:'aft-circular',evidence:'Analytical energy/thermal benchmark; protected-core packaging is an explicitly allocated geometry.'})
});
export function architectureFamily(value={}){
 const id=typeof value==='string'?value:value.architectureFamilyId||value.input?.architectureFamily||value.architectureFamily||value.architectureDefinition?.familyId||value.physicalArchitecture?.familyId;
 const family=architectureFamilies[id]||architectureFamilies['protected-core'];
 if(typeof value==='string')return family;
 const c=installedCommunications(value);
 return {...family,kaTerminalCount:c.kaTerminalCount,sPatchCount:c.sPatchCount,opticalTerminalCount:c.opticalTerminalCount,communicationsPackageId:c.id};
}
const positive=(x,fallback)=>Number.isFinite(x)&&x>0?x:fallback;
const count=(n)=>Math.max(2,Math.min(8,2*Math.round(positive(n,2)/2)));

// The old dimensions are the retained hardware accommodation bound. Changing
// appendage topology removes the old four-cassette geometry constraint, but does
// not invent a smaller equipment volume or change any installed resource.
export function architectureGeometry(input={},legacy={}){
 const f=architectureFamily(input),w=positive(legacy.bodyWidthM,1.6),b=positive(legacy.bodyHeightM,1.42),l=positive(legacy.bodyLengthM,3);
 const solar=positive(input.solarM2,positive(legacy.solarM2,1)),rad=positive(input.radiatorM2,positive(legacy.radiatorM2,1));
 const n=f.solarWingCount,banks=f.radiatorBankCount,panels=f.id==='redwire-platform'?1:count(input.radiatorPanelsPerBank??legacy.radiatorPanelsPerBank);
 const definition={schema:'odc-architecture-definition/1',familyId:f.id,evidence:f.evidence,dimensionBasis:'Installed areas and explicit preliminary accommodation; no mission-dependent resizing.',allocations:[],payloadPlatform:f.payloadLocation==='radiator'?{bankEnd:-1,spreaderWidthM:1,spreaderDepthM:1,relativeTo:'radiator-0'}:null};
 const out={...legacy,architectureFamilyId:f.id,solarWingCount:n,radiatorBankCount:banks,radiatorPanelsPerBank:panels,payloadLocation:f.payloadLocation,thermalTopology:f.thermalTopology,solarBasePitchDeg:f.solarBasePitchDeg,architectureDefinition:definition,payloadPlatform:definition.payloadPlatform};
 if(f.geometryKind==='protected-core')return out;
 let bw=w,bh=b,bl=l;
 if(f.id==='redwire-platform'){
  const side=Math.sqrt(rad);
  bw=Math.max(side,positive(legacy.propulsion?.packHalfWidth,0)*2+.28,2.4);
  bh=Math.max(side,positive(legacy.propulsion?.packHalfHeight,0)*2+.26,2.4);
  const gyro=legacy.cmg?.mechanismDimsM||[.5,.5,.5],tankDiameter=2*positive(legacy.propulsion?.maxRadiusM,.32);
  const serviceM3=positive(legacy.serviceVolumeM3,input.batteryKWh*1000/positive(input.packWhL,290)/1000+1.4);
  const serviceLengthM=Math.max(.45,serviceM3/(.62*bw*bh));
  bl=Math.max(.65,tankDiameter+gyro[2]+.18+2*.024*Math.min(bw,bh)+serviceLengthM);
  definition.allocations.push('Flat service bus dimensions are derived from service and propulsion accommodation. The source Falcon 9 ~1.1 m folded height is not assigned to other launchers.','Compute and its local shielding belong to the moving platform; no central compute rack is retained.','Platform hinge axis, clearance and deployment duration are preliminary allocations.');
 }else if(f.id==='starcloud-inline'||f.id==='starmind-cross'){
  // Flatten the equipment bay without reducing its allocated gross volume.
  bw=Math.max(w*1.18,3.2);bh=Math.max(b*.76,2*positive(legacy.propulsion?.packHalfHeight,0)+.26,.8);bl=w*b*l/(bw*bh);
  definition.allocations.push('Thin central bay aspect is a preliminary allocation conserving the existing equipment envelope volume; supplier whole-vehicle mass and packaging are not implied.');
 }else{
  definition.allocations.push('Rack-centered bus accommodation remains an engineering allocation; the historical render does not establish bus dimensions.');
 }
 const aspect=positive(input.solarWingAspect,5),span=positive(input.architectureSpanM,0),height=positive(input.architectureHeightM,0),gap=.20;
 let wl=Math.sqrt(solar*aspect/n),ww=solar/(n*wl),rw,rl,solarRootOffsetM,solarTipGapM;
 if(f.id==='starcloud-inline'){
  // The common transverse width makes the two inboard radiator / outboard PV
  // sequences area-conserving. A fixed overall span divides by installed area.
  const minimumOffsets=2*(2*.125+.24)+2*(.125+.12)+2*(panels-1)*.04;
  if(span>bw+minimumOffsets){
   ww=(solar+rad)/(span-bw-minimumOffsets);
   for(let i=0;i<24;i++){
    wl=solar/(n*ww);const roll=Math.sqrt(.125**2+.002*wl/Math.PI),available=span-bw-2*(2*roll+.24)-2*(roll+.12)-2*(panels-1)*.04;
    if(available<=0)break;ww=(solar+rad)/available;
   }
   wl=solar/(n*ww);
  }
  rw=ww;rl=rad/(banks*rw);
  const roll=Math.sqrt(.125**2+.002*wl/Math.PI);
  // The folded cassette must clear both its radiator pack and the service bus
  // throughout the root swing, not only when the solar sheet has paid out.
  solarTipGapM=roll+.12;solarRootOffsetM=2*roll+.24;
  definition.allocations.push('Inboard radiator and outboard photovoltaic roles share a deployed line. Fixed radiator normals receive no independent Sun-avoidance credit.','Each arm uses an allocated accordion radiator followed by a roll-out blanket. The two-stage root turn/roll, finite hinge spacers and subdivision are allocations, not manufacturer mechanism specifications.');
 }else{
  if(span>bw+4*gap){
   wl=(span-bw)/2;
   for(let i=0;i<18;i++)wl=Math.max(.05,(span-bw)/2-.12-Math.sqrt(.125**2+.002*wl/Math.PI));
   ww=solar/(n*wl);
  }
  solarRootOffsetM=.12+Math.sqrt(.125**2+.002*wl/Math.PI);
  if(f.id==='redwire-platform'){rw=Math.sqrt(rad);rl=rw;}
  else if(f.id==='starmind-cross'){
   rl=height>bh+2*gap?Math.max(.2,(height-bh-2*gap)/2-(panels-1)*.04):Math.sqrt(rad/(banks*.42));rw=rad/(banks*rl);
  }else{rw=Math.min(Math.max(.8,bw-.12),Math.sqrt(rad/banks/2.6));rl=rad/(banks*rw);}
 }
 Object.assign(out,{bodyWidthM:bw,bodyHeightM:bh,bodyLengthM:bl,wingWidthM:ww,wingLengthM:wl,radiatorWidthM:rw,radiatorLengthM:rl,solarRootOffsetM,solarTipGapM});
 if(f.id==='redwire-platform'){
  const relief=redwireRootRelief(rw,rl);definition.payloadPlatform.rootRelief=relief;
  Object.assign(out,{radiatorGrossM2:rad,radiatorReliefM2:relief.areaM2,radiatorNetM2:rad-relief.areaM2});
  definition.allocations.push('Gross rectangular platform area is reduced by the actual hinge-root relief for material mass and radiating area; the outer envelope is retained.');
 }
 definition.requestedSpanM=span||null;definition.requestedHeightM=height||null;
 definition.sourceDimensions=f.id==='redwire-platform'?{solarWingCount:2,referenceWingWidthM:2,referenceWingLengthM:20,referenceRadiatorSideM:3.25}:f.id==='starmind-cross'?{deployedSpanM:75,deployedHeightM:30}:{};
 if(span&&span<=bw+4*gap)definition.allocations.push('Requested span is smaller than the allocated bus/root clearance; automatic appendage dimensions are retained and this constraint is a shortfall.');
 return out;
}

function bounds(points){
 const min=[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max=[0,1,2].map(k=>Math.max(...points.map(p=>p[k])));
 return {min,max,size:max.map((x,k)=>x-min[k])};
}
export function architectureTerminalStations(h){
 const f=architectureFamily(h),legacy=f.id==='protected-core';if(legacy&&f.kaTerminalCount===1&&f.sPatchCount===2)return [];
 const d=h.input||h,w=h.bodyWidthM,b=h.bodyHeightM,l=h.bodyLengthM,flat=f.id==='redwire-platform',original=legacy?terminalStations(w,l,d):null;
 const out=[];
 if(f.kaTerminalCount)out.push({id:'ka-0',kind:'ka',positionM:original?[original.ka[0],b/2,original.ka[1]]:flat?[w*.24,-b/2,0]:[w*.16,b/2,-l*.32],normalBody:flat?[0,-1,0]:[0,1,0],evidence:'Allocated RF backup installation; aperture and interface require mission verification.'});
 for(let j=0;j<f.opticalTerminalCount;j++)out.push({id:`optical-${j}`,kind:'optical',positionM:original?[original.optical[0],b/2,original.optical[1]]:flat?[-w*.26,-b/2,0]:[(j?1:-1)*w*.30,b/2,(j?1:-1)*l*.28],normalBody:flat?[0,-1,0]:[0,1,0],evidence:f.id==='starcloud-inline'?'Two terminals follow announced procurement scope; mounting locations are allocations.':'Terminal count and installation are project allocations.'});
 for(let j=0;j<f.sPatchCount;j++)out.push({id:`s-${j}`,kind:'s',positionM:legacy?[(j?1:-1)*(w/2+Math.min(.17,Math.min(w,b)*.052)*.42),b*.26,l*.3]:[(j?1:-1)*(w/2+.035),b*.18,l*.23],normalBody:[j?1:-1,0,0],evidence:'Allocated contingency TT&C patch; not attributed to supplier hardware.'});
 return out;
}

// This is a resolved, serializable engineering manifest. The same descriptors
// and pose functions drive meshes, analysis and stowed-envelope evaluation.
export function resolveArchitecture(h){
 const f=architectureFamily(h),g=deploymentLayout(h),d=h.input||{},definition=h.architectureDefinition||architectureGeometry(d,h).architectureDefinition;
 const surfaces=g.descriptors.map((s,i)=>{const p=leafPose(g,s,1,0);return {...s,id:s.id||`${s.type}-${i}`,grossAreaM2:s.width*s.depth,areaM2:radiatorPanelNetArea(h,s),emittingFaces:s.type==='rad'?2:1,positionM:[p.x,p.y,p.z],axes:leafAxes(p),poseDescriptor:s};});
 const body=[];for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5])body.push([x*h.bodyWidthM,y*h.bodyHeightM,z*h.bodyLengthM]);
 // Installed identity and source envelope use the canonical zero-command pose.
 // Operating pointing is evaluated separately and cannot change this manifest.
 const deployed=bounds([...body,...g.descriptors.flatMap(s=>leafCorners(leafPose(g,s,1,0),s))]);
 const packedBounds=(h.fairing?.stack||[]).filter(s=>s.bodyBoundsM).flatMap(s=>[-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>[x,y,z].map((sign,i)=>s.bodyBoundsM[sign<0?'min':'max'][i])))));
 const stowed=bounds([...body,...(packedBounds.length?packedBounds:g.descriptors.flatMap(s=>leafCorners(leafPose(g,s,0,0),s)))]);
 const pv=surfaces.filter(s=>s.type==='pv'),rad=surfaces.filter(s=>s.type==='rad');
 const area=(a)=>a.reduce((sum,s)=>sum+s.areaM2,0),close=(a,b)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b));
 const terminals=architectureTerminalStations(h),parts=[{id:'service-bus',role:f.payloadLocation==='radiator'?'Service-only bus':'Protected payload and service bay',dimensionsM:[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM],evidence:'Preliminary accommodation allocation.'},...pv.map(s=>({id:s.id,role:'photovoltaic blanket',dimensionsM:[s.width,.006,s.depth],station:s.positionM})),...rad.map(s=>({id:s.id,role:f.payloadLocation==='radiator'?'Compute / radiator platform':'Radiator leaf',dimensionsM:[s.width,s.thickness,s.depth],station:s.positionM})),...terminals];
 const connections=pv.map((s,i)=>({id:`source-${i}`,from:s.id,to:'service-bus',type:'electrical',basis:'Installed source channel and harness allocation'}));
 if(f.payloadLocation==='radiator'){
  connections.push({id:'payload-harness',from:'service-bus',to:rad[0].id,type:'power-and-data',basis:'Harness crosses the platform hinge; no pumped-fluid crossing.'},{id:'payload-heat',from:'payload',to:rad[0].id,type:'passive-conduction',basis:'Local spreader and heat pipes.'});
  const conductanceKWK=h.energySystem?.thermal?.passive?.busConductanceKWK??d.passiveBusConductanceKWK??0;
  if(conductanceKWK>0)connections.push({id:'allocated-bus-strap-to-platform',from:'service-bus',to:rad[0].id,type:'passive-conduction',conductanceKWK,status:'unassessed',basis:'Additional project bus thermal-strap accommodation. The source establishes electrical harnessing at the deployment hinge; this thermal route, hinge accommodation and interface verification remain open.'});
 }
 else for(let j=0;j<f.radiatorBankCount;j++)connections.push({id:`coolant-${j}`,from:f.thermalTopology==='heat-lift'?'heat-pump-hot-side':'payload-cold-plates',to:`radiator-bank-${j}`,type:'thermal-fluid',basis:f.thermalTopology==='redundant-pumped'?'Separate allocated loop interface; common-mode hardware remains declared.':'Allocated supply/return interface.'});
 const checks=[{id:'solar-area-conservation',status:close(area(pv),h.solarM2??d.solarM2)?'meets':'shortfall',actual:area(pv),required:h.solarM2??d.solarM2,unit:'m²'},{id:'radiator-area-conservation',status:close(area(rad),h.radiatorM2??d.radiatorM2)?'meets':'shortfall',actual:area(rad),required:h.radiatorM2??d.radiatorM2,unit:'m²'},{id:'packaging-evidence',status:f.id==='protected-core'?'allocated':'open',detail:'A consistent modeled envelope does not establish supplier or launch-provider acceptance.'}];
 for(const [id,actual,required] of [['deployed-span-allocation',deployed.size[0],definition.requestedSpanM],['deployed-height-allocation',deployed.size[1],definition.requestedHeightM]])if(required)checks.push({id,status:Math.abs(actual-required)<1e-6?'meets':'shortfall',actual,required,unit:'m',operator:'='});
 const signature=[architectureGeometryRevision,f.id,h.bodyWidthM,h.bodyHeightM,h.bodyLengthM,f.kaTerminalCount,f.sPatchCount,f.opticalTerminalCount,f.kaTerminalCount?d.kaDishM:0,d.opticalApertureM,...surfaces.flatMap(s=>[s.id,s.width,s.depth,s.positionM]),...terminals.flatMap(t=>[t.id,t.positionM,t.normalBody])].join('|');let hash=2166136261;for(const char of signature)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 return {schema:'odc-physical-architecture/1',revision:architectureGeometryRevision,id:f.id,familyId:f.id,physicalId:`${f.id}-${hash.toString(16)}`,label:f.label,topology:{solarWingCount:pv.length,radiatorBankCount:f.radiatorBankCount,radiatorLeafCount:rad.length,payloadLocation:f.payloadLocation,thermalTopology:f.thermalTopology,kaTerminalCount:f.kaTerminalCount,sPatchCount:f.sPatchCount,opticalTerminalCount:f.opticalTerminalCount,communicationsPackageId:f.communicationsPackageId||'full'},dimensions:{deployed,stowed,fullSolarSpanM:deployed.size[0]},parts,surfaces,terminals,connections,payloadPlatform:definition.payloadPlatform,deployment:{durationS:f.deploymentDurationS,durationEvidence:'Preliminary commissioning allocation, not supplier timing.',stages:deploymentStages(h)},launchInterface:{kind:f.launchInterface,status:'allocated'},definition,checks,evidence:f.evidence};
}
