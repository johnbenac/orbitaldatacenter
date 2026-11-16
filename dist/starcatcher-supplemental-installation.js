import {starcatcherSupplementalInstallationData} from './starcatcher-supplemental-installation-data.js';

// The table contains finite construction material, never a cached clearance
// verdict. Its full physical input contract is compared before its coordinates
// enter the graph, so a changed vehicle cannot inherit the default raceways.
export function starcatcherSupplementalInstallationConfiguration(h,graph){
 return JSON.parse(JSON.stringify({
  family:h.architectureFamilyId,reference:h.input?.referenceCenterId,
  architectureRevision:graph.revision,
  connectorGeometry:graph.starcatcherSupportConnectorGeometry,
  dimensions:[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM],
  mechanism:[h.propulsion,h.solarRootCollector,h.solarRootOffsetM,h.solarTipGapM],
  rack:[h.rackLayout.slotDimensionsM,h.rackLayout.rows,h.rackLayout.columns,
   h.rackLayout.slots.map(s=>[s.index,s.column,s.row,s.bay,s.x,s.y,s.z])],
  boxes:graph.boxes.map(b=>[b.id,b.frame,b.positionM,b.dimensionsM,
   b.connectorPanels?.map(p=>[p.id,p.positionM,p.dimensionsM])]),
  ports:graph.ports.map(p=>[p.id,p.boxId,p.positionM,p.normal,p.connectorTypeId,
   p.quantity,p.instanceOffsetsM]),
  harnesses:graph.harnesses.map(a=>[a.id,a.quantity,a.fromPortId,a.toPortId,
   a.connectorTypeId,a.cableDiameterM,a.bendRadiusM,a.routing])
 }));
}
function same(a,b){
 if(typeof a!==typeof b)return false;
 if(typeof a==='number')return Number.isFinite(a)&&Number.isFinite(b)&&
  Math.abs(a-b)<=1e-10;
 if(a===b)return true;
 if(!a||!b||typeof a!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const keys=Object.keys(a);
 return keys.length===Object.keys(b).length&&keys.every(key=>
  Object.hasOwn(b,key)&&same(a[key],b[key]));
}
export function retainedStarcatcherSupplementalInstallation(h,graph){
 const data=starcatcherSupplementalInstallationData;
 if(h.architectureFamilyId!=='heatlift-study'||
   h.input?.referenceCenterId!=='star-catcher-self-powered'||
   data?.schema!=='orbital-data-center/starcatcher-supplemental-installation/1'||
   !same(starcatcherSupplementalInstallationConfiguration(h,graph),data.configuration))return null;
 return {revision:data.revision,routeIds:[...data.routeIds],
  dataRouteIds:[...data.dataRouteIds],powerRouteIds:[...data.powerRouteIds],
  serviceRouteIds:[...(data.serviceRouteIds||[])],
  payloadSupportOverrides:structuredClone(data.payloadSupportOverrides||[]),
  payloadMembership:structuredClone(data.payloadMembership||{}),
  payloadCorridors:data.payloadCorridors?applyStarcatcherPayloadSupportOverrides(
   structuredClone(data.payloadCorridors),data):null,
  corridors:structuredClone(data.corridors),basis:data.basis,
  currentSceneAssessment:'unassessed'};
}

export function applyStarcatcherPayloadSupportOverrides(corridors,installation){
 const replacements=new Map((installation?.payloadSupportOverrides||[])
  .map(row=>[row.id,row]));
 const result=corridors.map(corridor=>{
  const change=replacements.get(corridor.id);
  const members=installation?.payloadMembership?.[corridor.id]||[];
  const addMembers=value=>members.length?{...value,
   routeIds:[...new Set([...value.routeIds,...members])]}:value;
  if(!change)return addMembers(corridor);
  if(!Object.entries(change.expected).every(([key,value])=>same(corridor[key],value)))
   throw new Error('Starcatcher payload support construction changed '+corridor.id);
  replacements.delete(corridor.id);
  return addMembers({...corridor,...structuredClone(change.replacement)});
 });
 if(replacements.size)throw new Error('Starcatcher payload support owner is missing');
 return result;
}
