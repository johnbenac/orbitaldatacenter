import assert from 'node:assert/strict';
import {sizeDesign,missionStarter,applyPreset,defaults} from './dist/design.js';
import {buildEquipmentList,renderEquipmentList,bindEquipmentList,equipmentMassCsv,equipmentCsv,filterEquipmentRows} from './dist/equipment-list.js';
import {releaseFiles} from './dist/file-delivery.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),a+' ≠ '+b);
const purposes=['text','voice','batch','agents','finetune','pretrain'];
const inputs=purposes.map(id=>missionStarter(id));
inputs.push({...applyPreset(applyPreset(applyPreset(defaults,'engine','aero'),'compute','dgx'),'pv','silicon'),storage:'rugged',battery:'lfp',coating:'paint',trayCount:981,storageTB:512,propellantKg:9500});
inputs.push({...defaults,propellantKg:1,trayCount:1,adapterKg:0,structureMargin:0,shieldKgM2:0,cmgMomentumNms:2,dipoleAm2:10,kaDishM:.2,opticalApertureM:.025,thrustN:20000});
for(const d of inputs){
 const h=sizeDesign(d),list=buildEquipmentList(h);
 assert.equal(new Set(list.rows.map(v=>v.wbs)).size,list.rows.length);
 for(const r of list.rows){
  assert.ok(list.subsystems.some(s=>s.wbs===r.parent&&s.name===r.subsystem));
  assert.ok(r.quantity>0&&r.extendedMassKg>=0);
  near(r.unitMassKg*r.quantity,r.extendedMassKg);
  assert.ok(r.massBasis&&r.manufacturer&&r.heritage&&r.referenceModel);
  assert.equal(new URL(r.sourceUrl).protocol,'https:');
 }
 for(const row of h.massLedger){
  const matches=list.rows.filter(r=>r.ledgerId===row.id);
  assert.ok(matches.length,'Unrepresented ledger item '+row.id);
  near(matches.reduce((a,b)=>a+b.extendedMassKg,0),row.kg);
 }
 near(list.totals.dryKg,h.dryKg);near(list.totals.wetKg,h.wetKg);near(list.totals.launchKg,h.launchKg);
 near(list.subsystems.reduce((a,b)=>a+b.extendedMassKg,0),h.launchKg);
 assert.equal(list.rows.find(r=>r.ledgerId==='compute').quantity,h.trays);
 assert.ok(equipmentMassCsv(list.rows).includes('extendedMassKg'));
 assert.ok(!equipmentMassCsv(list.rows).includes('heritage'));
 assert.ok(equipmentCsv(list.rows).includes('sourceUrl'));
 assert.equal(equipmentCsv(list.rows).split('\r\n').length,list.rows.length+2);
 const engines=filterEquipmentRows(list.rows,{query:'aft engine',subsystem:'Chemical propulsion'});
 assert.equal(engines.length,1);assert.equal(engines[0].quantity,2);
 assert.equal(filterEquipmentRows(list.rows,{query:'80474-1'}).length,1);
 assert.equal(filterEquipmentRows(list.rows,{query:'kioxia'}).length,1);
 assert.equal(filterEquipmentRows(list.rows,{query:'unobtanium'}).length,0);
 assert.equal(filterEquipmentRows(list.rows,{evidence:'Accounting'}).length,1);
 assert.ok(renderEquipmentList(h).includes('Helium pressure bottle and mounts'));
}
class Control {
 value='';innerHTML='';dataset={};attrs={};handlers={};
 addEventListener(ev,fn){this.handlers[ev]=fn}
 setAttribute(k,v){this.attrs[k]=v}
 focus(){this.focused=true}
}
const names=['[data-mel-search]','[data-mel-sub]','[data-mel-evidence]','[data-mel-clear]','[data-file="csv"]','[data-file="json"]','[data-mel-status]','.mel-scroll'];
const controls=Object.fromEntries(names.map(k=>[k,new Control()]));
const lenses=['mass','heritage'].map(lens=>Object.assign(new Control(),{dataset:{lens}}));
const root={dataset:{},matches:s=>s==='[data-mel]',querySelector:s=>controls[s],querySelectorAll:()=>lenses};
bindEquipmentList(root,sizeDesign(inputs[0]));
const search=controls['[data-mel-search]'],sub=controls['[data-mel-sub]'],clear=controls['[data-mel-clear]'],output=controls['.mel-scroll'];
lenses[1].handlers.click();assert.equal(lenses[1].attrs['aria-pressed'],'true');
assert.match(output.innerHTML,/Published mass/);assert.match(output.innerHTML,/MiTEx/);
sub.value='Chemical propulsion';sub.handlers.change();assert.ok(!output.innerHTML.includes('HPE'));
search.value='fictional';search.handlers.input();assert.match(output.innerHTML,/No equipment/);
clear.handlers.click();assert.ok(search.focused&&clear.hidden);
const json=await (await fetch(controls['[data-file="json"]'].href)).json();
const csv=await (await fetch(controls['[data-file="csv"]'].href)).text();
assert.equal(json.rows.length,32);assert.ok(csv.includes('80474-1'));releaseFiles();
console.log('MEL: '+json.rows.length+' unique equipment allocations in '+json.subsystems.length+' subsystem rollups; eight designs close per account, mass lenses and two download formats verified.');
