// Bounded register checks: material hierarchy must not create additive hardware,
// and absent equipment must not acquire a rendered finish through the MEL.
import assert from 'node:assert/strict';
import {sizeDesign,defaults} from './dist/design.js';
import {referenceCenterOrder} from './dist/reference-centers.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {buildEquipmentList,filterEquipmentRows,renderEquipmentList,bindEquipmentList,materialAssignmentsCsv,equipmentCsv,equipmentMassCsv} from './dist/equipment-list.js';
import {spacecraftSurfaceAssignments,getSpacecraftMaterial,materialEvidenceLabels,materialLibraryRevision} from './dist/spacecraft-materials.js';
import {materialSources} from './dist/material-evidence.js';
import {releaseFiles} from './dist/file-delivery.js';

const near=(a,b,label)=>assert(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${label}: ${a} != ${b}`);
const counts=[];
for(const id of referenceCenterOrder){
 const h=sizeDesign(buildReferenceDesign(id)),before=JSON.stringify({input:h.input,massLedger:h.massLedger});
 const list=buildEquipmentList(h),parents=new Map(list.rows.map(row=>[row.wbs,row]));
 assert.equal(list.schema,'orbital-data-center/mel/4');assert.equal(list.materialLibraryRevision,materialLibraryRevision);
 assert.equal(new Set(list.surfaceDetails.map(detail=>detail.id)).size,list.surfaceDetails.length);
 for(const detail of list.surfaceDetails){
  assert(parents.has(detail.parentWbs),`${id}: orphan detail ${detail.id}`);
  assert.equal(detail.massAccounting,'included-in-parent');assert(!Object.hasOwn(detail,'extendedMassKg'));
  assert(detail.accountedInWbs.length&&detail.accountedInWbs.every(wbs=>parents.has(wbs)),`${id}: unaccounted material ${detail.id}`);
  assert.equal(getSpacecraftMaterial(detail.materialId)?.textureId,detail.textureId);
  assert(materialEvidenceLabels[detail.evidence.status]);assert(detail.evidence.basis&&detail.coverage&&detail.visibility);
  assert(detail.evidence.sourceIds.every(sourceId=>materialSources[sourceId]),`${id}: unknown material source`);
  assert(detail.selectionSourceUrls.every(url=>new URL(url).protocol==='https:'));
 }
 for(const row of list.rows){
  assert(row.materialDescription,`${id}: material identity missing from ${row.wbs}`);
  assert.deepEqual(row.materialAssignments,list.surfaceDetails.filter(detail=>detail.parentWbs===row.wbs));
  assert.deepEqual(row.surfaceDetailIds,row.materialAssignments.map(detail=>detail.id));
  if(row.classification==='Consumables'){
   assert(row.bulkMaterial?.composition);assert.equal(row.bulkMaterial.textureId,null);
   assert.equal(row.materialAssignments.length,0);assert.equal(row.materialIds.length,0);
  }else assert(row.materialAssignments.length>0,`${id}: uncovered equipment ${row.wbs}`);
 }
 near(list.totals.hardwareKg,h.massLedger.filter(row=>row.group==='Hardware').reduce((sum,row)=>sum+row.kg,0),'hardware mass');
 near(list.totals.wetKg,h.wetKg,'wet mass');near(list.totals.launchKg,h.launchKg,'launch mass');near(list.totals.closureKg,0,'MEL closure');
 assert.equal(JSON.stringify({input:h.input,massLedger:h.massLedger}),before,'Building material descriptions mutated hardware');
 assert(materialAssignmentsCsv(list.surfaceDetails).startsWith('designReferenceId,'));
 assert(equipmentCsv(list.rows).includes('materialAssignments'));assert(equipmentMassCsv(list.rows).includes('materialDescription'));
 assert.doesNotMatch(renderEquipmentList(h),/\b(?:NaN|undefined)\b/);
 counts.push([id,list.rows.length,list.surfaceDetails.length]);
}

const redwireInput=buildReferenceDesign('redwire-8kw'),redwire=sizeDesign(redwireInput),base=buildEquipmentList(redwire);
const materialAt=(list,role)=>list.surfaceDetails.find(detail=>detail.role===role);
assert.equal(materialAt(base,'solar-active').materialId,'pv-silicon');
assert.equal(materialAt(base,'solar-active').evidence.status,'documented');
const changed=buildEquipmentList(sizeDesign({...redwireInput,pv:'multijunction',coating:'paint'}));
assert.equal(materialAt(changed,'solar-active').materialId,'pv-multijunction');
assert.equal(materialAt(changed,'solar-active').evidence.status,'allocated');
assert.equal(materialAt(changed,'radiator-finish').materialId,'radiator-white-paint');
assert.deepEqual(spacecraftSurfaceAssignments(sizeDesign({...redwireInput,altitudeKm:redwireInput.altitudeKm+100,duty:.3})),spacecraftSurfaceAssignments(redwire),'Mission changes must not select new spacecraft materials');
for(const family of ['protected-core','starmind-cross']){
 const optical=buildEquipmentList(sizeDesign({...defaults,architectureFamily:family,communicationsPackage:'optical-only'}));
 assert(!optical.rows.some(row=>['05.01','05.02'].includes(row.wbs)));
 assert(!optical.surfaceDetails.some(detail=>['05.01','05.02'].includes(detail.parentWbs)));
 assert(optical.surfaceDetails.some(detail=>detail.parentWbs==='05.03'));
}
const aero=buildEquipmentList(sizeDesign({...defaults,engine:'aero'}));
assert.equal(aero.rows.find(row=>row.wbs==='06.06').bulkMaterial.name,'Aerozine-50');
assert.equal(aero.rows.find(row=>row.wbs==='06.07').bulkMaterial.name,'NTO');
assert.equal(aero.rows.find(row=>row.wbs==='06.08').bulkMaterial.name,'Helium');
assert.equal(filterEquipmentRows(base.rows,{query:'texture-mli-aluminized-polyimide'})[0].wbs,'03.03');
assert(filterEquipmentRows(base.rows,{query:'titanium'}).some(row=>row.wbs==='06.03'));
assert(filterEquipmentRows(base.rows,{materialEvidence:'unresolved'}).every(row=>row.materialAssignments.some(detail=>detail.evidence.status==='unresolved')));

class Control{
 value='';innerHTML='';dataset={};attrs={};handlers={};hidden=false;
 addEventListener(event,fn){this.handlers[event]=fn}
 setAttribute(key,value){this.attrs[key]=value}
 focus(){this.focused=true}
}
const selectors=['[data-mel-search]','[data-mel-sub]','[data-mel-evidence]','[data-mel-material-evidence]','[data-mel-clear]','[data-file="csv"]','[data-file="json"]','[data-file="materials"]','[data-mel-status]','.mel-scroll','[data-mel-material-note]','[data-mel-material-filter]','[data-mel-reference-filter]'];
const controls=Object.fromEntries(selectors.map(selector=>[selector,new Control()]));
const lenses=['mass','materials','power'].map(lens=>Object.assign(new Control(),{dataset:{lens}}));
const element={dataset:{},matches:selector=>selector==='[data-mel]',querySelector:selector=>controls[selector],querySelectorAll:()=>lenses};
bindEquipmentList(element,redwire);
controls['[data-mel-evidence]'].value='Flight reference';
lenses[1].handlers.click();
const table=controls['.mel-scroll'];
assert.match(table.innerHTML,/Selection basis/);assert.match(table.innerHTML,/Included in WBS 03\.03/);
assert.match(table.innerHTML,/data-material-id="mli-aluminized-polyimide"/);
assert.match(table.innerHTML,/data-tone="documented"/);
assert(controls['[data-mel-reference-filter]'].hidden);assert(!controls['[data-mel-material-filter]'].hidden);
const materialFilter=controls['[data-mel-material-evidence]'];materialFilter.value='unresolved';materialFilter.handlers.change();
assert.match(table.innerHTML,/data-tone="unresolved"/);assert.doesNotMatch(table.innerHTML,/data-tone="(?:allocated|documented|inferred)"/);
lenses[0].handlers.click();assert(controls['[data-mel-material-filter]'].hidden);assert(!controls['[data-mel-reference-filter]'].hidden);
assert.match(table.innerHTML,/Total kg/);
controls['[data-mel-clear]'].handlers.click();lenses[1].handlers.click();
assert.equal(materialFilter.value,'');assert.match(table.innerHTML,/MMH/);
const json=await (await fetch(controls['[data-file="json"]'].href)).json();
const detailCsv=await (await fetch(controls['[data-file="materials"]'].href)).text();
assert.equal(json.surfaceDetails.length,base.surfaceDetails.length);assert.equal(json.rows.length,base.rows.length);
assert(detailCsv.includes('selectionSourceUrls'));assert(detailCsv.includes('https://'));
assert.equal(detailCsv.split('\r\n').length,base.surfaceDetails.length+2);
releaseFiles();
console.log('Material MEL: all six references retain parent mass closure, material provenance, optional-equipment boundaries and chemistry; materials lens/filter/download checks passed.');
console.table(counts.map(([reference,equipment,details])=>({reference,equipment,details})));

// WBS query must match its hierarchy, not a coincidental middle substring.
{const list=buildEquipmentList(sizeDesign(buildReferenceDesign('redwire-8kw')));assert.deepEqual(filterEquipmentRows(list.rows,{query:'03.03'}).map(r=>r.wbs),['03.03']);assert.deepEqual(filterEquipmentRows(list.rows,{query:'05.03.03'}).map(r=>r.wbs),['05.03']);}
