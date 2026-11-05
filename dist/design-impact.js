import {controls,defaults,inverseSolve,presets,validateDesign} from './design.js';

const fields=Object.fromEntries(controls.map(c=>[c.key,c]));
const rateNames={solar:'Solar generation',battery:'Eclipse energy',thermal:'Heat rejection',storage:'Storage capacity',downlink:'Link capacity',compute:'Compute service',propellant:'Propellant supply',diskLife:'Storage endurance',launcherReference:'Vehicle reference capacity',mass:'Launch allowance',fairing:'Stowed fit'};
const dependencies={
 hkPeriodS:['Command & Data Handling','Electrical Power'],hkRecorderMB:['Command & Data Handling','Mechanical Design'],
 commandKbps:['Communications','Command & Data Handling'],cmgMomentumNms:['Attitude Determination & Control','Mechanical Design','Electrical Power','Mass Budget'],cmgTorqueNm:['Attitude Determination & Control','Propulsion','Electrical Power'],
 aiPurpose:['AI Data Center Purpose','Mission CONOPS','Compute & Storage','Data & Delivery','Communications','Electrical Power','Thermal','Mass Budget'],
 launcher:['Launch Vehicle','Launch & Insertion','Mass Budget','Orbit & Eclipse'],battery:['Electrical Power','Thermal','Mass Budget','Mechanical Design','Launch & Insertion'],
 compute:['Compute & Storage','Data & Delivery','Electrical Power','Thermal','Mass Budget'],workload:['Compute & Storage','Data & Delivery','Communications','Electrical Power'],
 storage:['Compute & Storage','Data & Delivery','Electrical Power','Mass Budget'],pv:['Electrical Power','Environment','Attitude Determination & Control','Mass Budget'],coating:['Thermal','Environment','Electrical Power'],
 engine:['Propulsion','Orbit & Eclipse','Mass Budget','Mission CONOPS'],network:['Communications','Data & Delivery','Attitude Determination & Control','Electrical Power'],
 link:['Communications','Data & Delivery','Electrical Power','Attitude Determination & Control'],disposalMethod:['Mission CONOPS','Propulsion','Orbit & Eclipse','Mass Budget'],
 attitude:['Environment','Attitude Determination & Control','Electrical Power','Propulsion'],thermalMode:['Thermal','Electrical Power','Environment'],solarDriver:['Environment','Orbit & Eclipse','Propulsion']
};
// Each item is an independently entered requirement whose validity can change
// even when the preset does not supply a replacement value.
const validationLinks={
 aiPurpose:[['compute','Check accelerator memory and sustainable performance for this workload.'],['storageTB','Reserve capacity for the new input, scratch data and customer artifacts.'],['serviceRoute','Recheck Earth availability, return bandwidth and delivery deadlines.'],['fabricGbps','Verify the cluster interconnect against model sharding, tool traffic or training synchronization.']],
 launcher:[['launchAllowanceKg','Confirm delivered performance for the target orbit and the selected recovery mode.'],['inclinationDeg','Verify injection inclination with the provider.'],['adapterKg','Reconcile adapter and separation hardware with the interface drawing.'],['trimDv','Recheck the separation dispersion and spacecraft trim allocation.']],
 battery:[['batteryKWh','Check the number of series and parallel cells that realize this pack energy.'],['batteryOpMinK','Check the pack-level operating limits, including low-temperature charging.'],['batterySurvMinK','Verify the selected pack’s storage and survival limits.'],['socMin','Confirm the usable SOC window and cycle-life assumptions for this chemistry.']],
 pv:[['solarM2','Recheck peak and end-of-life bus supply using the installed planform.'],['solarDelivery','Check harness, regulator and array operating-point losses.']],
 compute:[['thermalResistanceKPerKw','Match the tray cold plate and transport path to the selected hardware.'],['junctionLimitK','Confirm the junction rating against the installed processor and packaging.'],['batch','Check memory headroom and the representative workload benchmark.']],
 workload:[['context','Recheck KV-cache memory against the model, precision and batch.'],['latencyTargetS','Compare first-token latency with the workload requirement.']],
 storage:[['storageTB','Check usable capacity after module rounding and reserved space.'],['retainedGB','Verify room for retained data, model files and the transfer queue.']],
 coating:[['radiatorM2','Recheck end-of-life heat rejection for the installed radiator area.'],['radiatorDesignK','Check environmental absorption and the selected radiator operating point.']],
 engine:[['propellantKg','Recheck propellant volume, protected inventory and achievable maneuvers.'],['trimDv','Verify finite-burn duration against the available insertion window.']],
 network:[['contactFraction','Reconcile the sizing contact fraction with actual station visibility.'],['bulkMbps','Compare offered traffic with delivery and queue growth in the selected window.']],
 link:[['requiredLineMbps','Compare payload goodput after acquisition and pointing losses with the traffic requirement.']],
 disposalMethod:[['propellantKg','Verify that the selected route can be paid for after the operating mission.']],
 attitude:[['solarTiltDeg','Check illumination, effective radiator area and exposed silhouette.']],thermalMode:[['radiatorM2','Recheck the thermal balance for the selected applied or compute heat.']]
};
const metrics=[
 ['Accelerator trays','trays',r=>r.hardware.trays],['Accelerator memory headroom','GB',r=>r.hardware.ai?.memoryMarginGB],['Required local storage','GB',r=>r.hardware.ai?.requiredStorageGB],['Active host CPU load','kW',r=>r.hardware.ai?.hostKw],['Active cluster fabric load','kW',r=>r.hardware.ai?.fabricKw],['Enclosed bus length','m',r=>r.hardware.bodyLengthM],
 ['Launch stack','kg',r=>r.hardware.launchKg],['Payload mass margin','kg',r=>r.hardware.massMarginKg],['Reference vehicle headroom','kg',r=>r.hardware.input.referenceKg-r.hardware.launchKg],
 ['Minimum radial clearance','m',r=>r.hardware.radialClearanceM],['Axial clearance','m',r=>r.hardware.axialClearanceM],
 ['Battery pack mass','kg',r=>r.hardware.massLedger.find(x=>x.id==='battery').kg],['Battery pack volume','L',r=>r.hardware.batteryVolumeL],
 ['Required nameplate energy','kWh',r=>r.envelope.batteryNeeded],['Required solar area','m²',r=>r.envelope.solarNeeded],
 ['Required radiator area','m²',r=>r.envelope.radiatorNeeded],['Design junction temperature','K',r=>r.envelope.thermalK],
 ['Active compute power','kW',r=>r.hardware.itKw],['Decode capacity','tok/s',r=>r.hardware.ai?.training?null:r.hardware.tokensPerSec],
 ['Usable storage','TB',r=>r.hardware.usableTB],['Required goodput','Mbit/s',r=>r.envelope.goodputNeeded],
 ['Sizing link goodput','Mbit/s',r=>r.envelope.linkGoodput],['Station-keeping coverage','yr',r=>r.envelope.supplyYears],
 ['Required propellant','kg',r=>r.envelope.propForCoverage],['Disposal velocity allocation','m/s',r=>r.envelope.disposalBudgetDv],
 ['Predicted solar fraction at zero beta','%',r=>100*r.envelope.sunFraction],['Model memory headroom','GB',r=>r.hardware.memoryGB-r.hardware.modelGB-r.hardware.kvGB]
];
const unequal=(a,b)=>typeof a==='number'&&typeof b==='number'?Math.abs(a-b)>1e-8*Math.max(1,Math.abs(a),Math.abs(b)):a!==b;
export function impactOfChange(before,after,mode='installed',nextMode=mode,current=inverseSolve(before,mode),family=null){
 const errors=validateDesign(after),keys=Object.keys(defaults).filter(k=>unequal(before[k],after[k]));
 const changes=keys.map(key=>{const f=fields[key],group=Object.keys(presets).find(g=>(before[g]!==after[g]||family===g)&&Object.hasOwn(presets[g][before[g]]||{},key));return {key,label:f?.label||key,before:before[key],after:after[key],unit:f?.unit||'',overwritesOverride:!!group&&unequal(before[key],presets[group][before[group]][key])}});
 const domains=[...new Set(keys.flatMap(k=>dependencies[k]||[]))];
 if(errors.length)return {changes,domains,errors,deltas:[],margins:[],newFailures:[],review:true};
 const retained=[...new Map(keys.flatMap(k=>validationLinks[k]||[]).filter(([key])=>Object.hasOwn(after,key)&&!keys.includes(key)).map(([key,note])=>[key,{key,label:fields[key]?.label||key,value:after[key],unit:fields[key]?.unit||'',note}])).values()];
 const proposed=inverseSolve(after,nextMode),deltas=metrics.map(([label,unit,f])=>({label,unit,before:f(current),after:f(proposed)})).filter(r=>Number.isFinite(r.before)&&Number.isFinite(r.after)&&unequal(r.before,r.after));
 const margins=Object.keys(rateNames).map(k=>({key:k,label:rateNames[k],before:current.envelope.rates[k],after:proposed.envelope.rates[k]})).filter(r=>Number.isFinite(r.before)&&Number.isFinite(r.after));
 const newFailures=margins.filter(r=>r.after<1-1e-7&&r.before>=1-1e-7);
 const review=mode!==nextMode||keys.some(k=>fields[k]?.options)||newFailures.length>0||current.feasible&&!proposed.feasible;
 return {changes,domains,errors,deltas,margins,newFailures,retained,review,proposed};
}
export function displaySetting(key,value){return fields[key]?.options?.[value]??value}
