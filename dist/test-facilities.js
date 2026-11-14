import {usFacilities} from './facility-data-us.js';
import {internationalFacilities} from './facility-data-international.js';

export const facilityKinds=Object.freeze({'thermal-vacuum':'Thermal vacuum','thermal-cycle':'Temperature cycling',vibration:'Vibration',acoustic:'Acoustics','rf-chamber':'RF / EMC','optical-bench':'Optical metrology','mass-properties':'Mass properties','load-frame':'Structural loads','pressure-bench':'Pressure / leak','electrical-bench':'Electrical checkout','clean-inspection':'Clean integration',deployment:'Deployment','propulsion-stand':'Propulsion'});
export const facilityOwnership=Object.freeze({government:'Government',commercial:'Commercial',academic:'Academic','public-private':'Public / commercial operation'});
export const testFacilities=Object.freeze([...usFacilities,...internationalFacilities]);
export const testFacilityAssets=Object.freeze(testFacilities.flatMap(f=>f.assets.map(a=>Object.freeze({...a,id:f.id+'/'+a.id,localId:a.id,facilityId:f.id,facilityName:f.shortName||f.name,facility:f}))));
export const facilityAtlasRevision='public-test-facilities-2026-11-r1';
export const getTestFacility=id=>testFacilities.find(f=>f.id===id)||null;
export const getFacilityAsset=id=>testFacilityAssets.find(a=>a.id===id)||null;
export const facilityAssetsForSetting=kind=>testFacilityAssets.filter(a=>a.kind===kind&&a.geometry&&a.facility.status!=='closed'&&a.facility.status!=='historical');
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const permutations=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
export function facilitySources(facility,ids){const requested=new Set(ids||facility.sources.map(s=>s.id));return facility.sources.filter(s=>requested.has(s.id));}
export function facilityGeometrySize(asset){
 const g=asset?.geometry,d=g?.dimensions||{};
 if(!g)return null;
 if(g.type==='cylinder-horizontal')return [d.diameterM,d.diameterM,d.lengthM];
 if(g.type==='cylinder-vertical')return [d.diameterM,d.heightM??d.lengthM,d.diameterM];
 if(g.type==='shaker-round')return [d.diameterM,d.heightM??.9,d.diameterM];
 if(g.type==='shaker-square')return [d.widthM,d.heightM??.9,d.depthM];
 return [d.widthM,d.heightM,d.depthM];
}
export function facilityEnvelopeSize(asset){
 const e=asset?.envelope;if(!e)return null;
 if(e.shape==='box')return [e.widthM,e.heightM,e.depthM];
 if(e.shape==='cylinder')return e.axis==='y'?[e.diameterM,e.lengthM,e.diameterM]:[e.diameterM,e.diameterM,e.lengthM];
 return null;
}
function envelopeContains(envelope,size){
 if(!envelope||!size?.every(positive))return null;
 if(envelope.shape==='box')return size.every((n,i)=>n<=[envelope.widthM,envelope.heightM,envelope.depthM][i]+1e-8);
 if(envelope.shape==='cylinder'){
  const axis=envelope.axis==='y'?1:2,across=[0,1,2].filter(i=>i!==axis);
  return size[axis]<=envelope.lengthM+1e-8&&Math.hypot(size[across[0]],size[across[1]])<=envelope.diameterM+1e-8;
 }
 return null;
}
/** Conservative AABB screen, not a handling path, adapter design or qualification. */
export function assessFacilityFit(asset,article={}){
 const size=Array.isArray(article.sizeM)?article.sizeM.slice():article.sizeM?.toArray?.(),validSize=size?.length===3&&size.every(positive),massKnown=finite(article.massKg)&&article.massKg>=0,checks=[],notes=[];
 if(!asset)return {status:'unassessed',label:'No documented system selected',checks,notes,sizeM:validSize?size:null};
 let envelopeVerdict='unassessed',rotation=null;
 if(validSize&&asset.envelope){
  const asShown=envelopeContains(asset.envelope,size);
  rotation=permutations.find(p=>envelopeContains(asset.envelope,p.map(i=>size[i])))||null;
  envelopeVerdict=asShown?'within':rotation?'orientation-required':'outside';
  checks.push({id:'working-envelope',status:envelopeVerdict,label:'Published working envelope',actual:size,limit:facilityEnvelopeSize(asset),sourceIds:asset.envelope.sourceIds,basis:asset.envelope.basis||'Conservative bounding-box comparison; chamber shell is not used as thermal working space.'});
 }else notes.push(validSize?'No published usable article envelope is recorded for this system.':'An article with independently modeled dimensions is needed for a fit screen.');
 let massVerdict='unassessed';
 if(positive(asset.limits?.payloadKg)&&massKnown){massVerdict=article.massKg<=asset.limits.payloadKg?'within':'outside';checks.push({id:'article-mass',status:massVerdict,label:'Published article payload limit',actual:article.massKg,limit:asset.limits.payloadKg,unit:'kg',sourceIds:asset.limitSourceIds?.payloadKg||asset.sourceIds,basis:'Fixture, adapter and moving hardware masses must be included in the test campaign load budget.'});}
 else notes.push('Article-plus-fixture load and dynamic qualification require facility review.');
 let doorVerdict='unassessed';
 if(validSize&&positive(asset.door?.widthM)&&positive(asset.door?.heightM)){
  const possible=permutations.some(p=>size[p[0]]<=asset.door.widthM&&size[p[1]]<=asset.door.heightM);
  doorVerdict=possible?'orientation-review':'outside';checks.push({id:'access-opening',status:doorVerdict,label:'Access opening',actual:[size[0],size[1]],limit:[asset.door.widthM,asset.door.heightM],unit:'m',sourceIds:asset.door.sourceIds,basis:'Opening screen only. Trolley, rigging, turning space and transport path are separate constraints.'});
 }
 if(asset.kind==='vibration')notes.push('A shaker tabletop is a mounting interface, not the permitted outer envelope of a spacecraft. Adapter loads, overturning moment and stowed test configuration need a test-specific review.');
 const unavailable=['announced','closed','historical'].includes(asset.facility?.status);
 const failed=envelopeVerdict==='outside'||massVerdict==='outside'||doorVerdict==='outside';
 const status=unavailable?'not-operational':failed?'outside-limits':envelopeVerdict==='orientation-required'?'orientation-required':envelopeVerdict==='within'?'envelope-screened':asset.kind==='vibration'?'interface-review':'unassessed';
 const labels={'not-operational':'Operational availability is not established','outside-limits':massVerdict==='outside'?'Exceeds the published article payload limit':doorVerdict==='outside'?'Article bounds exceed the screened access opening':'Article bounds exceed the screened working envelope','orientation-required':'A different article orientation is required','envelope-screened':'Within the published geometric envelope','interface-review':'Mounting-interface review required',unassessed:'Usable-envelope fit is not established'};
 notes.push('Envelope checks use conservative axis-aligned article bounds and axis permutations. Detailed packing, other orientations and handling paths require a separate review.');
 notes.push('Equipment remains at its documented size. This dimensional screen does not certify a test campaign.');
 return {assetId:asset.id,facilityId:asset.facilityId,status,label:labels[status],sizeM:validSize?size:null,massKg:massKnown?article.massKg:null,envelopeVerdict,massVerdict,doorVerdict,rotation,envelopeSizeM:facilityEnvelopeSize(asset),checks,notes};
}
export function chooseFacilityAsset(kind,article={},requestedId=null){
 const all=facilityAssetsForSetting(kind),requested=all.find(a=>a.id===requestedId);
 if(requested)return requested;
 const volume=a=>{const s=facilityEnvelopeSize(a)||facilityGeometrySize(a);return s?.every(positive)?s.reduce((x,y)=>x*y,1):Infinity;};
 const operational=all.filter(a=>a.facility.status==='operational');
 const candidates=operational.length?operational:all;
 const fitting=candidates.filter(a=>assessFacilityFit(a,article).status==='envelope-screened').sort((a,b)=>volume(a)-volume(b));
 if(fitting.length)return fitting[0];
 // A sensible mounting-scale illustration is useful even when a shaker's
 // allowable article envelope is unpublished. This is never a fit verdict.
 if(kind==='vibration'){
  const size=Array.isArray(article.sizeM)?article.sizeM:article.sizeM?.toArray?.();
  if(size?.length===3&&size.every(positive)){
   const tables=candidates.filter(a=>{
    if(assessFacilityFit(a,article).massVerdict==='outside')return false;
    const g=a.geometry,d=g?.dimensions||{};
    return g.type==='shaker-round'?Math.hypot(size[0],size[2])<=d.diameterM:g.type==='shaker-square'?size[0]<=d.widthM&&size[2]<=d.depthM:false;
   }).sort((a,b)=>{const area=x=>x.geometry.type==='shaker-round'?Math.PI*x.geometry.dimensions.diameterM**2/4:x.geometry.dimensions.widthM*x.geometry.dimensions.depthM;return area(a)-area(b);});
   if(tables.length)return tables[0];
  }
 }
 // Oversized articles retain an actual large system and an explicit failed screen.
 // No equipment dimension is inferred from the requested article size.
 return candidates.slice().sort((a,b)=>(Number.isFinite(volume(b))?volume(b):-1)-(Number.isFinite(volume(a))?volume(a):-1))[0]||null;
}
export function facilityMapUrls(facility){
 const {lat,lon}=facility.location,delta=.018,bbox=[lon-delta,lat-delta,lon+delta,lat+delta].map(n=>n.toFixed(6)).join(',');
 return {embed:'https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent(bbox)+'&layer=mapnik&marker='+lat+','+lon,map:'https://www.openstreetmap.org/?mlat='+lat+'&mlon='+lon+'#map=15/'+lat+'/'+lon,directions:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(facility.address)};
}
export function validateTestFacilities(records=testFacilities){
 const errors=[],seen=new Set();
 for(const f of records){
  const fail=m=>errors.push(f.id+': '+m);if(!f.id||seen.has(f.id))fail('missing or duplicate facility identity');seen.add(f.id);
  for(const key of ['name','operator','country','countryCode','city','address','status','reviewed','url'])if(typeof f[key]!=='string'||!f[key].trim())fail('missing '+key);
  if(!facilityOwnership[f.ownership])fail('unknown ownership');
  if(!['operational','announced','closed','historical'].includes(f.status))fail('unknown status');
  if(!finite(f.location?.lat)||Math.abs(f.location.lat)>90||!finite(f.location?.lon)||Math.abs(f.location.lon)>180)fail('invalid geographic locator');
  if(!f.location?.precision||!f.location?.note)fail('location precision is not documented');
  const ids=new Set((f.sources||[]).map(s=>s.id)),refs=(arr,where)=>{if(!arr?.length)fail('missing sources for '+where);for(const id of arr||[])if(!ids.has(id))fail('unresolved source '+id+' for '+where);};
  if(ids.size!==(f.sources||[]).length)fail('duplicate source identity');for(const s of f.sources||[])if(!/^https:\/\//.test(s.url)||!s.title)fail('invalid source '+s.id);
  refs(f.addressSourceIds,'address');refs(f.location?.sourceIds,'map location');
  if(!f.assets?.some(a=>a.geometry))fail('campus has no dimensioned reconstruction');const assets=new Set();
  for(const a of f.assets||[]){
   if(!a.id||assets.has(a.id))fail('duplicate asset identity');assets.add(a.id);if(!facilityKinds[a.kind])fail(a.id+' has unsupported capability');refs(a.sourceIds,a.id);
   if(a.geometry){const g=a.geometry;refs(g.sourceIds,a.id+' dimensions');if(!['cylinder-horizontal','cylinder-vertical','box-room','shaker-round','shaker-square','bench'].includes(g.type))fail(a.id+' has unknown geometry type');
    for(const [k,v]of Object.entries(g.dimensions||{}))if(!positive(v))fail(a.id+' has invalid '+k);
    const needs=g.type==='cylinder-horizontal'?['diameterM','lengthM']:g.type==='cylinder-vertical'?['diameterM']:g.type==='shaker-round'?['diameterM']:g.type==='shaker-square'?['widthM','depthM']:['widthM','heightM','depthM'];
    for(const k of needs)if(!positive(g.dimensions?.[k]))fail(a.id+' omits required geometry '+k);
    if(g.type==='cylinder-vertical'&&!positive(g.dimensions.heightM??g.dimensions.lengthM))fail(a.id+' omits chamber height');
    if(!g.dimensionRole||!g.notes)fail(a.id+' lacks dimension meaning');
   }
   if(a.envelope){refs(a.envelope.sourceIds,a.id+' working envelope');const e=facilityEnvelopeSize(a);if(!e?.every(positive))fail(a.id+' has invalid usable envelope');if(a.kind==='vibration'&&a.geometry?.dimensionRole==='table-surface'&&a.envelope.basis?.toLowerCase().includes('tabletop'))fail(a.id+' confuses mounting table and article envelope');}
   if(a.door){refs(a.door.sourceIds,a.id+' access opening');if(!positive(a.door.widthM)||!positive(a.door.heightM))fail(a.id+' has invalid opening');}
   for(const [key,value] of Object.entries(a.limits||{})){if(!finite(value)||value<0)fail(a.id+' has invalid limit '+key);refs(a.limitSourceIds?.[key],a.id+' '+key);}
   for(const s of a.specifications||[])refs(s.sourceIds,a.id+' specification '+s.label);
  }
 }
 return {passed:!errors.length,errors,facilities:records.length,assets:records.reduce((n,f)=>n+(f.assets?.length||0),0),modeledAssets:records.reduce((n,f)=>n+(f.assets||[]).filter(a=>a.geometry).length,0)};
}
