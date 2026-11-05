import assert from 'node:assert/strict';
import {sizeDesign,missionStarter,applyPreset,defaults} from './dist/design.js';
import {buildEquipmentList,renderEquipmentList,bindEquipmentList,equipmentMassCsv,equipmentCsv,filterEquipmentRows} from './dist/equipment-list.js';
import {componentCentroid,componentMassProperties} from './dist/component-stations.js';
import {demiseScreen,renderMechanical,exportMechanical} from './dist/mechanical-design.js';
import {createSimulation} from './dist/model.js';
import {releaseFiles} from './dist/file-delivery.js';

// Physical growth must exhaust a row of real, non-overlapping slots before it lengthens the core.
const {rackLayout:rack,input:rInput,...baseHull}=sizeDesign(missionStarter('text'));
const filled=sizeDesign({...rInput,trayCount:rack.capacity});
assert.equal(filled.bodyLengthM,baseHull.bodyLengthM);assert.equal(filled.bodyWidthM,baseHull.bodyWidthM);assert.equal(filled.bodyHeightM,baseHull.bodyHeightM);
assert.equal(filled.rackLayout.slots.length,rack.capacity);
assert.equal(new Set(filled.rackLayout.slots.map(q=>[q.x,q.y,q.z].join(','))).size,rack.capacity);
assert.deepEqual(filled.propulsion.stations['01.02'],filled.rackLayout.slots.map(q=>[q.x,q.y,q.z]));
assert(sizeDesign({...rInput,trayCount:rack.capacity+1}).bodyLengthM>filled.bodyLengthM);
for(const q of filled.rackLayout.slots){
 const [x,y,z]=filled.rackLayout.slotDimensionsM;
 assert(Math.abs(q.x)+x/2<filled.bodyWidthM/2&&Math.abs(q.y)+y/2<filled.bodyHeightM/2);
 assert(q.z-z/2>=rack.rackZ0M&&q.z+z/2<=rack.rackZ1M);
}
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
  assert.ok(r.powerBasis&&r.powerSourceUrl&&r.dimensionBasis&&r.dimensionSourceUrl);
  assert.ok(r.dimensionsM.every(x=>Number.isFinite(x)&&x>0));
  assert.ok(r.bodyCentroidM.every(Number.isFinite));
 }
 for(const row of h.massLedger.filter(r=>r.id!=='margin')){
  const matches=list.rows.filter(r=>r.ledgerId===row.id);
  assert.ok(matches.length,'Unrepresented ledger item '+row.id);
  near(matches.reduce((a,b)=>a+b.extendedMassKg,0),row.kg);
 }
 near(list.totals.dryKg,h.dryKg);near(list.totals.wetKg,h.wetKg);near(list.totals.launchKg,h.launchKg);
 near(list.subsystems.reduce((a,b)=>a+b.extendedMassKg,0)+list.totals.growthKg,h.launchKg);
 assert.equal(list.rows.find(r=>r.ledgerId==='compute').quantity,h.trays);
 assert.ok(equipmentMassCsv(list.rows).includes('extendedMassKg'));
 assert.ok(!equipmentMassCsv(list.rows).includes('heritage'));
 assert.ok(equipmentCsv(list.rows).includes('sourceUrl'));
 assert.equal(equipmentCsv(list.rows).split('\r\n').length,list.rows.length+2);
 const engines=filterEquipmentRows(list.rows,{query:'aft engine heads',subsystem:'Chemical propulsion'});
 assert.equal(engines.length,1);assert.equal(engines[0].quantity,2);
 assert.equal(filterEquipmentRows(list.rows,{query:'80474-1'}).length,1);
 assert.equal(filterEquipmentRows(list.rows,{query:'kioxia'}).length,1);
 assert.equal(filterEquipmentRows(list.rows,{query:'unobtanium'}).length,0);
 assert.equal(filterEquipmentRows(list.rows,{evidence:'Accounting'}).length,0);
 assert.ok(renderEquipmentList(h).includes('Helium pressure bottle and mounts'));
 for(const [kg,progress,attached] of [[0,1,false],[h.propellantKg*.37,.42,false],[h.propellantKg,0,true]]){
  const props=componentMassProperties(h,kg,progress,attached),target=h.dryKg+h.pressurantKg+kg+(attached?d.adapterKg:0),fast=componentCentroid(h,kg,progress,attached);
  near(props.massKg,target);for(let k=0;k<3;k++)near(props.cm[k],fast[k]);
  for(const row of props.rows){near(row.stationShares.reduce((n,v)=>n+v,0),1);for(let k=0;k<3;k++)near(row.stationsM.reduce((n,pt,j)=>n+pt[k]*row.stationShares[j],0),row.centroidM[k]);}
 }
 assert.equal(componentMassProperties(h,h.propellantKg,1).rows.filter(r=>r.wbs==='09.01'&&r.massKg>0).length,0);
 const dem=demiseScreen(h,{}, {entrySpeedMs:7111});if(h.input.disposalMethod==='reentry'){near(dem.modeledKg+dem.unassessedKg,list.totals.hardwareKg);assert.equal(dem.releaseSpeedMs,7111);assert.ok(dem.rows.every(r=>r.thresholdMJ>=0&&r.highHeatMJ>=r.lowHeatMJ));}
 const snap={t:10,deployment:0,propellantKg:h.propellantKg};
 for(const phase of 'ABCDEF'){const out=renderMechanical(h,snap,phase);assert.ok(out.includes('data-mech-find')&&!out.includes('NaN'));assert.equal(exportMechanical(h,snap,phase).rows.length,31);}

}
class Control {
 value='';innerHTML='';dataset={};attrs={};handlers={};
 addEventListener(ev,fn){this.handlers[ev]=fn}
 setAttribute(k,v){this.attrs[k]=v}
 focus(){this.focused=true}
}
const names=['[data-mel-search]','[data-mel-sub]','[data-mel-evidence]','[data-mel-clear]','[data-file="csv"]','[data-file="json"]','[data-mel-status]','.mel-scroll'];
const controls=Object.fromEntries(names.map(k=>[k,new Control()]));
const lenses=['mass','heritage','power','dimensions'].map(lens=>Object.assign(new Control(),{dataset:{lens}}));
const root={dataset:{},matches:s=>s==='[data-mel]',querySelector:s=>controls[s],querySelectorAll:()=>lenses};
bindEquipmentList(root,sizeDesign(inputs[0]));
const search=controls['[data-mel-search]'],sub=controls['[data-mel-sub]'],clear=controls['[data-mel-clear]'],output=controls['.mel-scroll'];
lenses[1].handlers.click();assert.equal(lenses[1].attrs['aria-pressed'],'true');
assert.match(output.innerHTML,/Published mass/);assert.match(output.innerHTML,/MiTEx/);
lenses[2].handlers.click();assert.match(output.innerHTML,/Power basis and references/);
lenses[3].handlers.click();assert.match(output.innerHTML,/Dimension basis and references/);
sub.value='Chemical propulsion';sub.handlers.change();assert.ok(!output.innerHTML.includes('HPE'));
search.value='fictional';search.handlers.input();assert.match(output.innerHTML,/No equipment/);
clear.handlers.click();assert.ok(search.focused&&clear.hidden);
const json=await (await fetch(controls['[data-file="json"]'].href)).json();
const csv=await (await fetch(controls['[data-file="csv"]'].href)).text();
assert.equal(json.rows.length,31);assert.ok(csv.includes('80474-1'));releaseFiles();
console.log('MEL: '+json.rows.length+' unique equipment allocations in '+json.subsystems.length+' subsystem rollups; eight designs close per account, mass lenses and two download formats verified.');

const study=sizeDesign({...missionStarter('text'),solarM2:5,batteryKWh:1}),sim=createSimulation(study);
for(const t of [0,539,700,995,1201,3600,5400,7840,12000]){
 const s=sim.at(t),list=buildEquipmentList(study,s);near(list.rows.reduce((v,r)=>v+r.instantPowerW,0),s.servedLoadKW*1000);
}
console.log('Deployed and stowed centroids, adapter release, fuel-dependent first moments, supplied power, entry sensitivity and phase-specific mechanical tables passed.');
