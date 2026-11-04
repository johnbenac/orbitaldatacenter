// Coordinates are metres from the payload adapter interface plane, positive forward.
const terran = {
 outerDiameterM:5.4,basis:'Planning estimate',source:'Relativity Space · Terran R architecture',
 sourceUrl:'https://www.relativityspace.com/terran-r',
 note:'Relativity gives a nominal 5.4 m fairing diameter. The 4.8 m keep-in diameter, 12.5 m height and taper below are engineering assumptions for both recovery modes.',
 profile:[[0,2.4],[7.8,2.4],[9.6,2.18],[11.2,1.58],[12.5,.8]]
};
export const fairings={
 terran,terranX:terran,
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
 const adapterWidth=g.launcher==='glenn'?3.30:1.52;
 add('Separation adapter',adapterWidth,adapterWidth,.36,adapterWidth/2);
 add('Engine recess',w*.8,h*.8,.48);
 add('Insulated bus',w+.12,h+.12,l);
 const solarShort=Math.min(wingLengthM/3,wingWidthM),solarLong=Math.max(wingLengthM/3,wingWidthM);
 const radiatorShort=Math.min(radiatorLengthM/3,radiatorWidthM),radiatorLong=Math.max(radiatorLengthM/3,radiatorWidthM);
 // Rails on both sides, plus allowances for hinges, latches and fluid loops.
 const cassetteHeight=12*.05+6*.08+.18;
 add('Folded wing and radiator cassette',Math.max(solarShort,radiatorShort)+.12,cassetteHeight,Math.max(solarLong,radiatorLong)+.12);
 add('Parked terminals',Math.max(kaDishM,.45)+.12,.52,.30);
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
 const axialClearanceM=heightM-stack.at(-1).z1M-axialPaddingM;
 ratio=Math.min(ratio,heightM/(stack.at(-1).z1M+axialPaddingM));
 const volumeM3=profile.slice(1).reduce((sum,[z,r],i)=>{const [z0,r0]=profile[i];return sum+Math.PI*(z-z0)*(r*r+r*r0+r0*r0)/3},0);
 return {...reference,profile,stack,maxDiameterM,heightM,referenceDiameterM,referenceHeightM,override,radialPaddingM,axialPaddingM,radialClearanceM,axialClearanceM,limitingPart,limitingZM,ratio,volumeM3,fit:radialClearanceM>=-1e-9&&axialClearanceM>=-1e-9};
}
