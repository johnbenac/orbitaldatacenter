// Controlled environmental cases. These change the mission, never the installed
// areas, storage, mechanisms or equipment. Published orbit intent is separate
// from the project epoch, LTAN, selected altitude and analysis duration.
import {geometry,DAY,YEAR,R,MU,DEG} from './orbit.js';

export const referenceMissionRevision='odc-reference-missions-2026-11-r1';
export const referenceMissionCases=Object.freeze({
 source:{id:'source',label:'Source mission',shortLabel:'Source mission',description:'Published mission intent with explicit allocations where epoch, altitude or LTAN is unpublished. A seasonal environmental screen accompanies the common conservative budget.'},
 common:{id:'common',label:'Common comparison',shortLabel:'Common comparison',description:'550 km circular, 53° inclination, five years, and the same epoch for every reference. Installed hardware stays identical to the source case.'}
});
const epoch='2026-11-04T00:00:00Z';
const sourceCases={
 'redwire-8kw':{altitudeKm:1500,missionYears:3,sso:true,ltanHours:18,sourceIds:['redwire-202605'],orbitEvidence:'Published 1,500 km sun-synchronous reference. The paper’s beta = 90° thermal point is a separate steady-state comparison.',allocations:'Three years, the analysis epoch and 18:00 LTAN are project allocations. A seasonal SSO case does not hold beta at 90°.'},
 'starcloud-3':{altitudeKm:700,missionYears:5,sso:true,ltanHours:18,altitudeRangeKm:[600,850],sourceIds:['starcloud-fcc-2026'],orbitEvidence:'Proposed 600–850 km sun-synchronous operating envelope in the FCC notice; an application does not establish a licensed or final flight orbit.',allocations:'700 km within the filing envelope, five years, epoch and 18:00 LTAN are project allocations for this Starcloud-3 interpretation.'},
 'starmind-ai1':{altitudeKm:550,missionYears:5,sso:true,ltanHours:18,sourceIds:['spacex-ai1','spacex-ai1-archive-20260804'],orbitEvidence:'Sun-synchronous solar-powered mission intent; the retained AI1 snapshot does not prescribe one exact altitude, epoch or LTAN.',allocations:'550 km, five years, epoch and 18:00 LTAN are project allocations. Continuous sunlight is evaluated, not assumed.'},
 'orbital-1-202606':{altitudeKm:650,missionYears:5,sso:true,ltanHours:18,altitudeRangeKm:[500,850],sourceIds:['orbital-20260630','orbital-fcc-2026'],orbitEvidence:'June continuous-sun mission intent and the 500–850 km SSO filing envelope are retained together; the filing is not a flight qualification.',allocations:'650 km within the filing envelope, five years, epoch and 18:00 LTAN are project allocations.'},
 'orbital-1-202609':{altitudeKm:650,missionYears:5,sso:true,ltanHours:18,altitudeRangeKm:[500,850],sourceIds:['orbital-reflex-20260910','orbital-fcc-2026'],orbitEvidence:'Program-level 500–850 km SSO filing envelope. Mapping it to the September Reflex-led revision is an explicit study interpretation.',allocations:'650 km, five years, epoch and 18:00 LTAN are project allocations. June mass and span are not imported.'},
 'star-catcher-self-powered':{altitudeKm:550,missionYears:5,sso:false,sourceIds:['starcatcher-20260331'],orbitEvidence:'The selected analytical node includes eclipse energy storage; no unique flight orbit is established.',allocations:'550 km circular at 53°, five years and epoch are project allocations. There is no source-specific continuous-sun credit.'}
};
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value)}return value;};
export const referenceSourceMissions=freeze(sourceCases);
export function normalizeReferenceMissionCase(value){return value==='source'?'source':'common'}

export function ssoInclinationDeg(altitudeKm,ecc=0){
 const a=R+altitudeKm,n=Math.sqrt(MU/a**3),j2=1.5*.00108262668*(R/(a*(1-ecc*ecc)))**2*n;
 const cosine=-(360/365.2422*DEG/DAY)/j2;
 return Math.abs(cosine)<=1?Math.acos(cosine)/DEG:null;
}
export function referenceMissionInputs(id,missionCase='source'){
 const c=normalizeReferenceMissionCase(missionCase),source=sourceCases[id];
 if(!source)throw Error('Unknown reference mission: '+id);
 const d={epoch,altitudeKm:550,ecc:0,inclinationDeg:53,raanDeg:30,argPeriDeg:0,meanAnomalyDeg:10,missionYears:5,yearsSupply:5,referenceMissionCase:c};
 if(c==='source'){
  d.altitudeKm=source.altitudeKm;d.missionYears=source.missionYears;d.yearsSupply=source.missionYears;
  if(source.sso){
   d.inclinationDeg=ssoInclinationDeg(d.altitudeKm);
   const sun=geometry(d,0).sunECI,sunRa=Math.atan2(sun[1],sun[0])/DEG;
   d.raanDeg=((sunRa+15*(source.ltanHours-12))%360+360)%360;
  }
 }
 return d;
}
export function referenceMissionDescription(id,missionCase='source'){
 const kind=normalizeReferenceMissionCase(missionCase),source=sourceCases[id];
 if(!source)return null;
 const inputs=referenceMissionInputs(id,kind);
 return {id:kind,label:referenceMissionCases[kind].label,revision:referenceMissionRevision,inputs,sourceIds:kind==='source'?source.sourceIds:[],sourceOrbit:kind==='source'?source.orbitEvidence:'Common project comparison, independent of supplier mission intent.',allocations:kind==='source'?source.allocations:'550 km / 53°, five years, RAAN 30° and the common epoch are controlled comparison assumptions.',ltanHours:kind==='source'&&source.sso?source.ltanHours:null,altitudeRangeKm:kind==='source'?source.altitudeRangeKm||null:null,budgetBasis:'The standard resource screen retains the beta = 0 circular eclipse bound. The source environmental screen is separately labeled and uses the same margin policy.'};
}

// No design.js dependency: sizingEnvelope can call this sampler without a
// reference/configuration import cycle. Sample both mission endpoints and one
// seasonal cycle at each endpoint. No installed resource is changed here.
const sampleCache=new WeakMap();
export function sampledSourceEnvironmentalCase(hOrInput,years){
 const d=hOrInput?.input||hOrInput||{},duration=Number.isFinite(years)?Math.max(0,years):Math.max(0,d.missionYears||0);
 const signature=[d.epoch,d.altitudeKm,d.ecc,d.inclinationDeg,d.raanDeg,d.argPeriDeg,d.meanAnomalyDeg,duration].join('|');
 const old=sampleCache.get(d);if(old?.signature===signature)return old.value;
 const circular=Number.isFinite(d.ecc)&&Math.abs(d.ecc)<1e-6,valid=Number.isFinite(Date.parse(d.epoch))&&Number.isFinite(d.altitudeKm)&&d.altitudeKm>0&&Number.isFinite(d.inclinationDeg)&&Number.isFinite(d.raanDeg);
 if(!valid||!circular)return {schema:'odc-source-environment/1',status:'unassessed',sunFraction:null,minSunFraction:null,longestEclipseS:null,samples:[],scope:'Circular-orbit seasonal screen only; invalid or eccentric inputs require the full chronological environment analysis.',continuousSunClaim:false};
 const a=R+d.altitudeKm,periodS=2*Math.PI*Math.sqrt(a**3/MU),spanS=Math.min(YEAR,duration*YEAR),starts=[0,Math.max(0,duration*YEAR-spanS)],sampled=new Set(),samples=[];
 const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
 for(let season=0;season<=24;season++)for(const start of starts){
  const t=540+start+spanS*season/24,key=t.toFixed(6);if(sampled.has(key))continue;sampled.add(key);
  const g=geometry(d,t),beta=g.betaDeg*DEG,critical=Math.asin(clip(R/a,0,1));
  const shadowFraction=Math.abs(beta)>=critical?0:Math.acos(clip(Math.sqrt(1-(R/a)**2)/Math.cos(beta),-1,1))/Math.PI;
  samples.push({elapsedDays:(t-540)/DAY,epoch:new Date(Date.parse(d.epoch)+t*1000).toISOString(),betaDeg:g.betaDeg,sunFraction:1-shadowFraction,eclipseS:shadowFraction*periodS});
 }
 const minSunFraction=Math.min(...samples.map(s=>s.sunFraction)),longestEclipseS=Math.max(...samples.map(s=>s.eclipseS));
 const sun=geometry(d,0).sunECI,sunRaDeg=Math.atan2(sun[1],sun[0])/DEG,ltanAtEpochHours=(((d.raanDeg-sunRaDeg)/15+12)%24+24)%24;
 const value={schema:'odc-source-environment/1',status:'sampled',sunFraction:minSunFraction,minSunFraction,sampledMeanSunFraction:samples.reduce((s,x)=>s+x.sunFraction,0)/samples.length,longestEclipseS,periodS,ltanAtEpochHours,ssoInclinationDeg:ssoInclinationDeg(d.altitudeKm),samples,conservativeEclipseS:Math.asin(R/a)/Math.PI*periodS,method:'Cylindrical-shadow analytic eclipse duration at 25 seasonal dates in the first and last mission year; existing secular J2 and seasonal Sun model. The minimum sampled sun fraction sets this separate demand case.',scope:'Preliminary environmental sensitivity. Dates between samples, injection dispersion, maneuvers, penumbra, failures and attitude interruptions require chronological verification. Zero sampled eclipse does not establish a continuous-sun guarantee.',continuousSunClaim:false};
 sampleCache.set(d,{signature,value});return value;
}
