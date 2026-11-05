import {adapterEnvelopeM,spacecraftInterface} from './payload-interface.js';
import {deploymentLayout,terminalLayout,terminalStations} from './deployment.js';
// Coordinates are metres from the payload adapter interface plane, positive forward.
const terran = {
 outerDiameterM:5.4,basis:'Planning estimate',source:'Relativity Space · Terran R architecture',
 sourceUrl:'https://www.relativityspace.com/terran-r',
 note:'Relativity gives a nominal 5.4 m fairing diameter. The 4.8 m keep-in diameter, 12.5 m height and taper below are engineering assumptions for both recovery modes.',
 profile:[[0,2.4],[7.8,2.4],[9.6,2.18],[11.2,1.58],[12.5,.8]]
};
export const fairings={
 terran,terranX:terran,
 falconHeavy:{
  outerDiameterM:5.2,basis:'Standard fairing · planning contour',source:'SpaceX · Falcon User’s Guide, May 2025, §4.1.3',
  sourceUrl:'https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf',
  note:'The standard fairing shell is 5.2 m wide and 13.2 m high. This simplified 4.5 × 10.8 m fit profile is an assumption. Use the provider’s static-envelope CAD and the chosen payload adapter for a mission analysis.',
  profile:[[0,2.25],[6.5,2.25],[8.1,1.99],[9.5,1.51],[10.8,.68]]
 },
 vulcan6:{
  outerDiameterM:5.4,basis:'Guide stations · long static envelope',source:'ULA · October 2023 User’s Guide, Figure 4.3.1-2',
  sourceUrl:'https://www.ulalaunch.com/docs/default-source/rockets/2023_vulcan_user_guide.pdf',
  note:'Long 21.3 m external fairing. Heights use LV station 2596.66 in at the 1,575 mm interface as zero. Tabulated diameters from the figure are halved to obtain radii. The model interpolates the guide stations and omits negotiable extensions.',
  profile:[[0,2.4385],[6.35,2.413],[11.938,2.3305],[14.986,1.816],[18.796,.3045]]
 },
 ariane64:{
  outerDiameterM:5.4,basis:'Simplified long-fairing study profile',source:'Arianespace · Ariane 6 User’s Manual, Issue 2, Figure 5.3.1b',
  sourceUrl:'https://www.arianespace.com/app/uploads/sites/4/2024/10/Mua-6_Issue-2_Revision-0_March-2021.pdf',
  note:'Selected single-payload long fairing. A 4.6 m cylindrical keep-in and a simplified taper represent a conservative planning case inside the guide envelope. The mission-specific PAF and negotiable extensions are outside this model.',
  profile:[[0,2.3],[10.5,2.3],[13.8,1.72],[15,1.445],[16,1.165],[17.5,.28]]
 },
 longMarch5B:{
  outerDiameterM:5.2,basis:'Planning estimate · external shell known',source:'China Manned Space Agency · Long March 5B geometry',
  sourceUrl:'https://en.cmse.gov.cn/news/202005/t20200506_46488.html',
  note:'CMSA gives a 5.2 m diameter and 20.5 m external length. The 4.6 m usable diameter, 17 m usable height and taper are model assumptions.',
  profile:[[0,2.3],[10.8,2.3],[13.3,2.15],[15.5,1.55],[17,.65]]
 },
 longMarch9:{
  outerDiameterM:10,basis:'Concept assumption · no released interface',source:'CALT designer briefing · January 2023 LEO study',
  sourceUrl:'https://english.www.gov.cn/news/topnews/202301/19/content_WS63c8b4ccc6d0a757729e5d88.html',
  note:'The modeled 10 m outer fairing is based on the core diameter class. The 8.6 × 20 m usable envelope and taper are illustrative study assumptions.',
  profile:[[0,4.3],[11,4.3],[15,3.95],[18,2.8],[20,1.15]]
 },
 glenn:{
  adapterBoltCircleM:3.1699,interfaceMinKg:2300,interfaceMaxKg:37200,outerDiameterM:7,basis:'Historical dynamic envelope',source:'Blue Origin · October 2018 Rev C, Figure 5-4',
  sourceUrl:'https://yellowdragonblog.com/wp-content/uploads/2019/01/new_glenn_payload_users_guide_rev_c.pdf#page=61',
  note:'Single-manifest high-capacity adapter with 3.1699 m bolt circle. The 2018 guide gives a 2,300–37,200 kg interface range. Linear interpolation between the published stations approximates the ogive. The guide includes 25.4 mm vehicle-side dynamic clearance. Payload motion is an additional editable allowance. Optional volume below the interface is excluded.',
  profile:[[0,3.175],[7.2898,3.175],[11.430,3.11405],[13.970,2.7254],[16.510,1.95325],[18.542,1.0668]]
 },
 glenn9:{
  outerDiameterM:8.7,basis:'Planning estimate',source:'Blue Origin · New Glenn 9×4 upgrade',
  sourceUrl:'https://www.blueorigin.com/news/new-glenn-upgraded-engines-subcooled-components-drive-enhanced-performance',
  note:'Blue Origin announced an 8.7 m fairing. This planning case assumes a 7.8 m usable diameter and 20 m usable height. The tapered contour and clearances require a mission-specific interface drawing.',
  profile:[[0,3.9],[10.5,3.9],[13.5,3.74],[16.5,3.03],[18.5,2.14],[20,1.25]]
 },
 starship:{
  outerDiameterM:9,basis:'Historical concept proxy',source:'SpaceX · Starship Users Guide, March 2020, Figure 4',
  sourceUrl:'https://www.spacex.com/media/starship_users_guide_v1.pdf#page=2',
  note:'The 2020 concept specified a dynamic cargo envelope. The stations below reproduce its standard profile. Applying it to V3 is a planning assumption. V3 cargo-door sweep, payload release path and a mission-specific adapter need separate verification.',
  profile:[[0,4],[8,4],[9,3.85],[10,3.68],[11,3.49],[12,3.27],[13,3.04],[14,2.78],[15,2.51],[16,2.20],[17.24,1.80]]
 }
};

export function radiusAt(profile,z){
 if(z<=profile[0][0])return profile[0][1];
 for(let i=1;i<profile.length;i++){
  const [z1,r1]=profile[i],[z0,r0]=profile[i-1];
  if(z<=z1)return r0+(r1-r0)*(z-z0)/(z1-z0);
 }
 return profile.at(-1)[1];
}

export function packedSections(g){
 const {bodyWidthM:w,bodyHeightM:h,bodyLengthM:l,wingLengthM,wingWidthM,radiatorLengthM,radiatorWidthM,kaDishM}=g;
 let z=0;
 const sections=[];
 function add(part,widthM,heightM,lengthM,radiusM=Math.hypot(widthM,heightM)/2){
  sections.push({part,widthM,heightM,lengthM,radiusM,z0M:z,z1M:z+lengthM});z+=lengthM;
 }
 const adapterWidth=adapterEnvelopeM(g.launcher||'terran');
 add('Separation adapter',adapterWidth,adapterWidth,.36,adapterWidth/2);
 add('Launch service stand-off',spacecraftInterface.outerM,spacecraftInterface.outerM,Math.max(.30,...(g.propulsion?.engines||[]).map(e=>-e.z-l*.5+.14)),Math.max(spacecraftInterface.outerM/2,adapterWidth/2));
 const nozzles=g.propulsion?.engines||[];
 const bellEdge=Math.max(0,...nozzles.map(e=>Math.hypot(e.x,e.y)+e.exitRadiusM));
 const a=g.opticalApertureM??g.input?.opticalApertureM??0,term=terminalLayout(w,h,kaDishM,a);
 const dishEdge=Math.max(Math.hypot(w*.16+kaDishM*.52,h*.5+term.kaHeight-term.kaPin+.18*kaDishM),
  Math.hypot(w*.16+term.kaFork+.017*kaDishM,h*.5+term.kaHeight+.048*kaDishM),
  Math.hypot(w*.16+kaDishM*.063,h*.5+term.kaHeight-term.kaPin+kaDishM*.42),
  Math.hypot(w*.20+a*.89,h*.5+term.opticalHeight+Math.max(.05*a,1.04*a-term.opticalPin)));
 const k=deploymentLayout(g),spoolRadius=k.packedRollM+.019;
 const drumEnvelope=Math.hypot(k.rootX,k.packedRollM)+spoolRadius;
 const radHalfWidth=Math.max(k.rw/2+.025,k.rw*.32+.24),radHalfHeight=k.rootY+k.hingeStand+.115;
 const bodyBase=z,bodyCenter=bodyBase+l/2;
 // Each hardware group has its own axial interval. A radius is measured from
 // the vehicle axis, so a side-mounted package consumes the circular segment
 // at that face, without extruding its outermost corner along the entire bus.
 function feature(part,lo,hi,widthM,heightM,radiusM){
  const z0M=bodyCenter+lo,z1M=bodyCenter+hi;
  sections.push({part,widthM,heightM,lengthM:hi-lo,radiusM,z0M,z1M});
 }
 const panelBorder=Math.max(.032,Math.min(w,h)*.018);
 const bodyEdge=Math.hypot(w/2+panelBorder,h/2+panelBorder);
 add('Insulated bus',w+2*panelBorder,h+2*panelBorder,l,bodyEdge);
 const frameEnd=Math.max(.005*l,.25*Math.min(w,h)*.052)+.01;
 feature('Forward frame and fittings',l/2,l/2+frameEnd,w,h,bodyEdge);
 if(bellEdge>0)feature('Engine bells',Math.min(...nozzles.map(e=>e.z)),-l/2,2*bellEdge,2*bellEdge,bellEdge);
 for(const end of [-1,1]){
  const station=k.center+end*k.mountZ;
  feature('Side solar cassettes · '+(end<0?'aft':'forward'),station-k.ww/2-.17,station+k.ww/2+.17,
   2*(k.rootX+spoolRadius),2*(k.packedRollM+spoolRadius),drumEnvelope);
 }
 feature('Face-mounted radiator packs',k.radRoot-.27,k.radRoot+k.r+.13,2*radHalfWidth,2*radHalfHeight,Math.hypot(radHalfWidth,radHalfHeight));
 const {ka,optical}=terminalStations(w,l,{kaDishM,opticalApertureM:a});
 const kaZ=.62*kaDishM+.035,opZ=1.05*a+.025;
 feature('Parked terminal heads',Math.min(ka[1]-kaZ,optical[1]-opZ),Math.max(ka[1]+kaZ,optical[1]+opZ),2*Math.max(Math.abs(ka[0])+kaZ,Math.abs(optical[0])+opZ),
  2*(h*.5+Math.max(term.kaHeight+.5*kaDishM,term.opticalHeight+1.04*a)),dishEdge);
 return sections;
}

export function fairingFit(d,stack){
 const reference=fairings[d.launcher]||terran,referenceDiameterM=2*Math.max(...reference.profile.map(p=>p[1])),referenceHeightM=reference.profile.at(-1)[0];
 const maxDiameterM=d.fairingM,heightM=d.fairingLengthM,override=Math.abs(referenceDiameterM-maxDiameterM)>1e-7||Math.abs(referenceHeightM-heightM)>1e-7;
 const profile=reference.profile.map(([z,r])=>[z*heightM/referenceHeightM,r*maxDiameterM/referenceDiameterM]);
 const radialPaddingM=d.radialPaddingM,axialPaddingM=d.axialPaddingM;
 let radialClearanceM=Infinity,limitingPart='',limitingZM=0,ratio=Infinity;
 for(const section of stack){
  // A piecewise-linear profile reaches its minimum on this interval at an endpoint or profile station.
  const bottom=section.z0M,top=section.z1M+axialPaddingM;
  const stations=[bottom,top,...profile.map(p=>p[0]).filter(z=>z>bottom&&z<top)];
  for(const z of stations){
   const allowable=radiusAt(profile,z),required=section.radiusM+radialPaddingM,clearance=allowable-required;
   if(clearance<radialClearanceM){radialClearanceM=clearance;limitingPart=section.part;limitingZM=z;}
   ratio=Math.min(ratio,allowable/required);
  }
 }
 const stackHeightM=Math.max(...stack.map(section=>section.z1M));
 const axialClearanceM=heightM-stackHeightM-axialPaddingM;
 ratio=Math.min(ratio,heightM/(stackHeightM+axialPaddingM));
 const volumeM3=profile.slice(1).reduce((sum,[z,r],i)=>{const [z0,r0]=profile[i];return sum+Math.PI*(z-z0)*(r*r+r*r0+r0*r0)/3},0);
 return {...reference,profile,stack,maxDiameterM,heightM,referenceDiameterM,referenceHeightM,override,radialPaddingM,axialPaddingM,radialClearanceM,axialClearanceM,limitingPart,limitingZM,ratio,volumeM3,fit:radialClearanceM>=-1e-9&&axialClearanceM>=-1e-9};
}
