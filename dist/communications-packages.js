// Installed communications equipment, independent of selected traffic policy.
// RF omission changes mass, geometry and available service; it never silently
// substitutes an unmodeled command route. Keep this helper free of family imports.
export const communicationsPackages=Object.freeze({
 full:Object.freeze({id:'full',label:'Optical + Ka payload + S-band TT&C',kaTerminalCount:1,sPatchCount:2}),
 'optical-ttc':Object.freeze({id:'optical-ttc',label:'Optical + S-band TT&C',kaTerminalCount:0,sPatchCount:2}),
 'optical-ka':Object.freeze({id:'optical-ka',label:'Optical + Ka payload · no S-band',kaTerminalCount:1,sPatchCount:0}),
 'optical-only':Object.freeze({id:'optical-only',label:'Optical only · RF command path open',kaTerminalCount:0,sPatchCount:0})
});
const positive=(v,fallback)=>Number.isFinite(v)&&v>0?v:fallback;
export function installedCommunications(value={}){
 const d=value?.input||value||{},familyId=value?.architectureFamilyId||d.architectureFamily||value?.architectureDefinition?.familyId||value?.physicalArchitecture?.familyId||'protected-core';
 const selected=communicationsPackages[d.communicationsPackage]||communicationsPackages.full,opticalTerminalCount=familyId==='starcloud-inline'?2:1;
 const kaInstalled=selected.kaTerminalCount>0,sBandInstalled=selected.sPatchCount>0;
 const kaUnitKg=10+10*positive(d.kaDishM,1.2)**2,opticalUnitKg=7+250*positive(d.opticalApertureM,.12)**2;
 const masses={sBandKg:sBandInstalled?2:0,kaKg:selected.kaTerminalCount*kaUnitKg,opticalKg:opticalTerminalCount*opticalUnitKg,kaUnitKg,opticalUnitKg};
 return {...selected,familyId,opticalTerminalCount,kaInstalled,sBandInstalled,masses,terminalMassKg:masses.sBandKg+masses.kaKg+masses.opticalKg,
  peakKW:sBandInstalled?.299:.264,
  powerBasis:'One active optical payload route (240 W), a 24 W steering allocation and, when installed, a 35 W independent S-band channel. Multiple optical heads receive no simultaneous transmission credit.',
  massBasis:'S-band pair and radio electronics: 2 kg. Each Ka assembly: 10 + 10 D² kg. Each optical assembly: 7 + 250 A² kg, with D and A in metres. These are project allocations, not supplier flight masses.',
  commandPath:sBandInstalled?'Allocated independent S-band TT&C':'No modeled independent RF command/telemetry path; optical or Ka TT&C implementation remains open.',
  qualificationStatus:'unassessed'};
}
