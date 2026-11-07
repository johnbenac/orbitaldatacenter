// PDR resource assessments. A numerical study screen is distinct from accepted
// environmental, maturity, qualification and verification evidence.
import {sizingEnvelope,ageProperties,SOLAR} from './design.js';
import {policyValues,resolveItemGrowth} from './mission-policy.js';
import {buildEquipmentList} from './equipment-list.js';
import {thermalNodes,thermalStates,thermalNodeLabel} from './thermal-limits.js';
import {launchStructure} from './launch-structure.js';
import {radiusAt} from './fairings.js';
import {densities} from './density.js';
import {DAY,R} from './orbit.js';
import {deriveEnergySystem,energyDesignChecks,energyTemperatureLadder,thermalSizingPoint,renderEnergySingleLine,renderThermalPath} from './energy-system.js';
import {deriveArchitectureTrade,structuralBounds,radiationAndLife,architectureTradeGraphic,structuralBoundsGraphic} from './architecture-trades.js';
import {architectureFamily} from './architecture-families.js';

const finite=Number.isFinite;
const n=value=>finite(value)?value:null;
const sum=rows=>rows.reduce((total,value)=>total+(finite(value)?value:0),0);
const clamp=(value,lo,hi)=>Math.max(lo,Math.min(hi,value));
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=(value,digits=1)=>finite(value)?Math.abs(value)>0&&Math.abs(value)<.001?value.toExponential(2):value.toLocaleString('en-US',{maximumFractionDigits:digits}):'—';
const div=(a,b)=>finite(a)&&finite(b)&&b>0?a/b:null;
const times=(a,b)=>finite(a)&&finite(b)?a*b:null;
const percentage=value=>times(value,100);
const tone=status=>status==='shortfall'?'#ee9a88':status==='meets'?'#91d4b3':status==='not_applicable'?'#a9b6bd':'#e6c27e';
const label=(name,value,unit,basis)=>({label:name,value:typeof value==='number'?n(value):value,unit,basis});
const sizingCase=e=>e.environmentalBasis?.id==='source-sampled'?(e.environmentalBasis.status==='sampled'?'Source orbit sample':'Source case unavailable; common fallback'):'Common conservative comparison';
function compare(actual,required,operator){
  if(!finite(actual)||!finite(required))return 'unassessed';
  return (operator==='>'?actual>required:operator==='<'?actual<required:operator==='≤'?actual<=required:operator==='='?actual===required:actual>=required)?'meets':'shortfall';
}
function check(id,label,actual,required,unit,operator,basis,ruleIds,evidence,status){
  return {id,label,status:status||compare(actual,required,operator),actual:n(actual),required:n(required),unit,operator,basis,ruleIds,evidence};
}
const openCheck=(id,label,basis,ruleIds,evidence)=>check(id,label,null,null,'','',basis,ruleIds,evidence,'unassessed');
const alive=s=>!!s&&finite(s.t)&&!s.referenceBody&&(!finite(s.spacecraftModelEndedAt)||s.t<=s.spacecraftModelEndedAt+1e-6);
const text=(x,y,value,kind='label',extra='')=>'<text x="'+f(x,3)+'" y="'+f(y,3)+'" class="pr-'+kind+'" '+extra+'>'+esc(value)+'</text>';
const rect=(x,y,w,h,fill,extra='')=>'<rect x="'+f(x,3)+'" y="'+f(y,3)+'" width="'+f(Math.max(0,w),3)+'" height="'+f(Math.max(0,h),3)+'" fill="'+fill+'" '+extra+'/>';
const line=(x1,y1,x2,y2,color='#8196a4',extra='')=>'<line x1="'+f(x1,3)+'" y1="'+f(y1,3)+'" x2="'+f(x2,3)+'" y2="'+f(y2,3)+'" stroke="'+color+'" '+extra+'/>';
function graphic(id,title,description,body,height=400){
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 '+height+'" role="img" aria-labelledby="pdr-'+id+'-title pdr-'+id+'-desc" style="display:block;width:100%;min-width:640px;height:auto"><title id="pdr-'+id+'-title">'+esc(title)+'</title><desc id="pdr-'+id+'-desc">'+esc(description)+'</desc><defs><marker id="pr-arrow-'+id+'" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#91bac9"/></marker><pattern id="pr-hatch-'+id+'" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 7L7 0" stroke="#e6c27e" stroke-width="1.5"/></pattern></defs><style>.pr-label{font:14px system-ui,sans-serif;fill:#dce8ed}.pr-small{font:12px system-ui,sans-serif;fill:#aabec9}.pr-title{font:600 18px system-ui,sans-serif;fill:#f0f4ed}.pr-value{font:600 19px ui-monospace,monospace;fill:#f0f4ed}.pr-axis{font:11px ui-monospace,monospace;fill:#9db3bf}</style>'+rect(0,0,800,height,'#13212b','rx="12"')+body+'</svg>';
}
const arrow=(id,x1,y1,x2,y2,extra='')=>line(x1,y1,x2,y2,'#91bac9','stroke-width="2" marker-end="url(#pr-arrow-'+id+')" '+extra);

function massData(h,e,s){
  const mel=buildEquipmentList(h,s),hardware=mel.rows.filter(row=>row.classification==='Hardware');
  const growth=hardware.map(resolveItemGrowth),assigned=growth.filter(row=>row.status==='assigned');
  const basic=sum(h.massLedger.filter(row=>row.group==='Hardware').map(row=>row.kg));
  const approved=sum(assigned.map(row=>row.mgaKg)),covered=sum(assigned.map(row=>row.basicKg));
  const p=e.pdr?.mass||{},predicted=n(p.predictedDryKg)??h.dryKg;
  const allowable=n(p.allowableDryKg)??h.input.launchAllowanceKg-h.propellantKg-h.pressurantKg-h.input.adapterKg;
  const applied=n(p.appliedGrowthKg)??predicted-basic,complete=hardware.length>0&&assigned.length===hardware.length;
  const linked=complete&&Math.abs(predicted-(basic+approved))<=Math.max(1e-6,basic*1e-10);
  const margin=div(allowable-predicted,basic),required=policyValues.massPdrFraction;
  return {mel,hardware,basic,approved,covered,predicted,allowable,applied,complete,linked,margin,required,missing:hardware.length-assigned.length,consumables:h.propellantKg+h.pressurantKg,adapter:h.input.adapterKg,launch:h.launchKg,allocation:h.input.launchAllowanceKg};
}
function massGraphic(m){
  const requiredKg=m.basic*m.required,scale=690/Math.max(m.allocation,m.launch+requiredKg,1),x=v=>55+v*scale;
  const segments=[['Basic dry',m.basic,'#779cc8'],['Applied growth',m.applied,'url(#pr-hatch-mass)'],['Liquids + He',m.consumables,'#9dc9b0'],['Adapter',m.adapter,'#b6a3d2']];
  let cursor=0,body=text(28,33,'Mass growth, allocation and launch loading','title');
  body+=text(28,59,'Same kg boundary; unallocated margin is held outside the predicted mass.','small');
  body+=text(28,92,'Dry budget','label')+rect(55,112,690,34,'#233642','rx="4"');
  body+=rect(x(0),112,m.basic*scale,34,'#779cc8')+rect(x(m.basic),112,Math.max(0,m.applied)*scale,34,'url(#pr-hatch-mass)','stroke="#e6c27e"');
  body+=rect(x(m.predicted),112,Math.max(0,requiredKg)*scale,34,'#223c37','stroke="#91d4b3" stroke-dasharray="4 3"');
  const dryLimit=clamp(x(m.allowable),35,765);
  body+=line(dryLimit,99,dryLimit,156,'#f1d394','stroke-width="2"')+text(dryLimit,177,'Dry allowance '+f(m.allowable,0)+' kg','small','text-anchor="'+(dryLimit>600?'end':dryLimit<200?'start':'middle')+'"');
  body+=text(55,202,'Predicted '+f(m.predicted,0)+' kg  +  PDR margin >'+f(requiredKg,0)+' kg','label');
  body+=text(28,239,'Launch stack','label')+rect(55,258,690,34,'#233642','rx="4"');
  for(const [name,value,color] of segments){body+=rect(x(cursor),258,Math.max(0,value)*scale,34,color,'stroke="#13212b" stroke-width=".7"')+'<title>'+esc(name+' '+f(value,2)+' kg')+'</title>';cursor+=value;}
  body+=line(x(m.allocation),245,x(m.allocation),303,'#f1d394','stroke-width="2"')+text(x(m.allocation),325,f(m.allocation,0)+' kg stack allocation','small','text-anchor="end"');
  body+=segments.map(([name,value,color],i)=>rect(30+i*193,351,12,12,color)+text(48+i*193,362,name+' '+f(value,0)+' kg','small')).join('');
  body+=text(28,397,'Item MGA evidence: '+(m.complete?'complete':'open for '+m.missing+' hardware lines')+' · '+f(percentage(m.margin),2)+'% carried dry-margin screen','label');
  return graphic('mass','Dry mass growth and launch allocation','Bars separate basic dry mass, applied growth, consumables, launch adapter and mission-level margin. Applied growth remains provisional until item evidence is complete.',body,423);
}
function assessMass(ctx){
  const {h,envelope:e,s}=ctx,m=massData(h,e,s),numeric=compare(percentage(m.margin),percentage(m.required),'>');
  return {id:'mass',title:'Mass budget',designSummary:f(m.predicted,0)+' kg carried dry mass; '+f(percentage(m.margin),1)+'% on the GOLD basic-dry denominator. '+(m.complete?'Item growth assignments are present.':m.missing+' hardware growth assessments remain open.'),
    design:[label('Basic dry hardware',m.basic,'kg','Sum of physical Hardware accounts; excludes growth, propellant, pressurant and launch adapter.'),
      label('Applied dry growth',m.applied,'kg',m.linked?'Reconciled to approved item MGA.':'Carried calculation allowance; not demonstrated bottom-up MGA.'),
      label('Predicted dry mass in model',m.predicted,'kg','Basic dry hardware plus the applied growth ledger.'),
      label('Approved item MGA',m.complete?m.approved:null,'kg','Incomplete evidence is not interpreted as zero growth.'),
      label('Allowable dry mass',m.allowable,'kg','Stack allocation less loaded liquids, helium and launch-only adapter.'),
      label('Loaded spacecraft / launch stack',f(h.wetKg,1)+' / '+f(m.launch,1),'kg','The launch adapter is included only in the stack.')],
    checks:[check('mass-ledger','MEL to launch-ledger reconciliation',Math.abs(m.mel.totals.closureKg),1e-6,'kg','≤','Numerical accounting closure; tolerance is arithmetic, not resource margin.',['1.06'],'MEL and integrated model share this controlled configuration.'),
      check('mass-launch-allocation','Loaded stack within project allocation',m.allocation-m.launch,0,'kg','≥','Allocation headroom; provider-specific performance is assessed separately.',['1.06'],'Actual injection-orbit and launch-interface acceptance remains open.'),
      check('mass-pdr-screen','PDR dry-margin numerical screen',percentage(m.margin),percentage(m.required),'%','>','100 × (allowable dry − predicted dry) / basic dry.',['1.06'],m.linked?'Approved item growth is applied.':'Screen uses the carried growth estimate; it does not close MGA evidence.',numeric),
      check('mass-mga-coverage','Bottom-up MGA evidence coverage',percentage(div(m.covered,m.basic)),100,'% of basic dry','≥','Every dry-hardware line needs its category, maturity, fabrication status, source and approved growth basis.',['1.06','1.11'],m.missing+' hardware lines remain unassessed.',m.complete?'meets':'unassessed'),
      check('mass-pdr-evidence','PDR mass-margin evidence closure',m.linked?percentage(m.margin):null,percentage(m.required),'%','>','The numerical target and approved item growth must both close on one allocation boundary.',['1.06'],m.complete&&!m.linked?'Approved item growth has not reconciled to the model dry mass.':'Inherited component references do not establish installed mass maturity.',m.linked?numeric:m.complete?'shortfall':'unassessed')],
    interfaces:[{domain:'mechanical',label:'Mass stations, inertia and launch load paths'},{domain:'prop',label:'Predicted dry mass, loaded propellant and disposal'},{domain:'launcher',label:'Orbit-specific allowance and adapter boundary'}],
    pdrNow:['Reconcile each equipment mass and application-specific growth basis to the Master Equipment List.','Show the >10% mission dry margin after item MGA and retain a separate loaded launch-stack allocation.'],
    later:['Replace estimates with controlled drawing, fabrication and weighing evidence.','Track mass-property changes through integration and verify each launch manifest.'],
    limitations:['The carried global growth allowance does not establish GOLD item MGA.','A launcher catalogue performance point is not an accepted mission-specific allocation.'],
    graphic:massGraphic(m)};
}

function powerData(h,e,s,day){
  const d=h.input,p=e.pdr?.power,age=ageProperties(d,d.missionYears),sunHours=e.period*e.sunFraction/3600,energy=h.energySystem||deriveEnergySystem(h);
  const budget=n(p?.eolPowerBudgetKW)??e.meanBus*(1+(1-e.sunFraction)*(1/(d.chargeEff*d.dischargeEff)-1))/e.sunFraction;
  const available=n(p?.eolPowerAvailableKW)??budget*h.solarM2/(e.solarDemandM2??e.solarNeeded);
  const margin=available>0?(available-budget)/available:null,floor=Math.max(d.socMin,d.targetSOC);
  const eclipseDemand=e.peakBus*e.shadowHours,usable=age.battery*Math.max(0,d.socMax-floor)*d.dischargeEff;
  const dischargeLimit=Math.min(h.batteryKWh*d.dischargeC,energy.electrical.battery.dischargeBusLimitKW),chargeLimit=Math.min(h.batteryKWh*d.chargeC,energy.electrical.battery.chargeBusLimitKW);
  const chargeAvailable=Math.max(0,Math.min(chargeLimit,available-e.meanBus));
  const chargeRequired=sunHours>0?eclipseDemand/(d.dischargeEff*d.chargeEff*sunHours):null;
  const unserved=n(day?.energyKWh?.unserved)??n(day?.unmetKWh),live=alive(s);
  const residual=live&&[s.solarKW,s.dischargeKW,s.servedLoadKW,s.chargeKW,s.curtailedKW].every(finite)?Math.abs(s.solarKW+s.dischargeKW-s.servedLoadKW-s.chargeKW-s.curtailedKW):null;
  return {budget,available,margin,age,sunHours,usable,eclipseDemand,dischargeLimit,chargeLimit,chargeAvailable,chargeRequired,unserved,residual,live,floor,energy};
}
function powerGraphic(h,e,s,p){
  const current=key=>p.live?n(s?.[key]):null,maximum=Math.max(p.available,p.budget/(1-policyValues.powerPdrFraction),1),scale=700/maximum;
  let body=text(28,32,'End-of-life supply and the live electrical bus','title');
  body+=text(28,59,'Available source '+f(p.available,2)+' kW · recharge-adjusted budget '+f(p.budget,2)+' kW','small');
  body+=rect(50,78,700,30,'#233642','rx="4"')+rect(50,78,Math.max(0,p.available)*scale,30,'#46697a');
  body+=rect(50,78,Math.max(0,p.budget)*scale,30,'#b99b65');
  const limitX=50+p.available*(1-policyValues.powerPdrFraction)*scale;
  body+=line(limitX,69,limitX,120,'#91d4b3','stroke-width="2" stroke-dasharray="4 3"')+text(limitX,139,'85% of availability','small','text-anchor="middle"');
  body+=text(50,166,'Actual capacity-based margin '+f(percentage(p.margin),2)+'% · required >15%','label');
  const boxes=[[30,199,170,75,p.energy.electrical.source.solarWingCount+' solar wings',f(current('solarKW'),2)+' kW'],[297,199,185,75,'Electrical bus',f(current('servedLoadKW'),2)+' kW served'],[590,191,180,56,'Compute trays',f(current('itKW'),2)+' kW'],[590,269,180,56,'Platform + terminals',f(p.live?Math.max(0,s.servedLoadKW-s.itKW):null,2)+' kW'],[297,335,185,75,'Battery pack',f(current('batteryKWh'),2)+' kWh stored']];
  boxes.forEach(([x,y,w,height,name,value])=>{body+=rect(x,y,w,height,'#233642','rx="7" stroke="#486474"')+text(x+12,y+23,name,'label')+text(x+12,y+49,value,'value');});
  body+=arrow('power',200,236,294,236)+arrow('power',482,221,587,221)+arrow('power',482,252,587,296);
  body+=arrow('power',352,277,352,332)+arrow('power',427,332,427,277);
  body+=text(288,314,f(current('chargeKW'),2)+' kW ↓','small','text-anchor="end"')+text(443,314,'↑ '+f(current('dischargeKW'),2)+' kW','small');
  body+=text(32,310,'Curtailed '+f(current('curtailedKW'),2)+' kW','label')+text(32,337,'Unserved '+f(current('unmetKW'),3)+' kW','label');
  body+=text(32,397,'EOL usable eclipse energy','small')+text(32,422,f(p.usable,2)+' / '+f(p.eclipseDemand,2)+' kWh','value');
  body+=text(590,365,'Peak-eclipse recharge bound','small')+text(590,389,f(p.chargeAvailable,2)+' / '+f(p.chargeRequired,2)+' kW','value');
  body+=text(28,462,'Live arrows use the selected instant; the EOL bar uses the preliminary source and recharge envelope.','small');
  return graphic('power','End-of-life power budget and electrical flows','The top bar compares EOL available power with a sunlight-equivalent load including battery conversion losses. Arrows show current generation, served loads, charging and discharge. Separate energy and recharge bounds are shown.',body,482);
}
function assessPower(ctx){
  const {h,s,day,envelope:e}=ctx,d=h.input,p=powerData(h,e,s,day),a=p.energy,v=a.electrical,marginStatus=p.available===0&&p.budget>0?'shortfall':compare(percentage(p.margin),100*policyValues.powerPdrFraction,'>');
  const interfaceChecks=energyDesignChecks(h).filter(row=>row.id.startsWith('energy-')).map(row=>({...row,ruleIds:['1.06','3.13']}));
  return {id:'power',title:'Electrical power',designSummary:v.family.primaryV+' V MPPT architecture; '+v.mppt.count+' protected source channels and '+f(percentage(p.margin),1)+'% EOL source margin. Module, current, storage and recharge limits are assessed separately.',
    design:[label('Sizing case',sizingCase(e),'',e.pdr?.power?.method||'The common conservative sizing envelope is separate from live and selected-day observations.'),
      label('Primary / payload / service rails',v.family.primaryV+' / 48 / 28','V','Selected preliminary voltage domains. The 400 V family is a development architecture.'),
      label('Protected MPPT capacity',v.mppt.count+' × '+v.mppt.moduleInputKW,'kW input per channel',v.mppt.perWing+' independently protected channels on each of '+v.source.solarWingCount+' physical solar wings.'),
      label('Cell technology / string allocation',v.source.technology+' / '+v.source.seriesCells,'cells per string',v.source.stringEvidence),
      label('End-of-life available source',p.available,'kW',e.pdr?.power?.method||'Sunlight-equivalent source after array wiring, MPPT, delivery limits and cell retention.'),
      label('EOL source / recharge demand',p.budget,'kW','Mean load referred to sunlit generation, including charge and discharge losses.'),
      label('Pack charge / discharge interface',f(p.chargeLimit,1)+' / '+f(p.dischargeLimit,1),'kW','Lesser of chemistry C-rate and the installed bidirectional-converter rating. Conversion efficiency is applied once.'),
      label('Usable EOL eclipse energy',p.usable,'kWh at bus','SOC ceiling to the greater of operating floor and design target; discharge loss included.'),
      label('Primary copper per feed',v.harness.primary.areaMM2,'mm²',f(v.harness.primary.lengthM,1)+' m one-way routing; hot-wire I²R losses are included.'),
      label('Conditioning / routed harness',f(a.masses.electricalKg,1)+' / '+f(a.masses.harnessKg,1),'kg','Explicit module, conductor, insulation and termination estimates. Supplier verification remains open.')],
    checks:[check('power-eol-margin','EOL source margin numerical screen',percentage(p.margin),100*policyValues.powerPdrFraction,'%','>','100 × (available EOL source − source-equivalent budget) / available EOL source.',['1.06'],'Source properties and mode loads remain preliminary assumptions.',marginStatus),
      ...interfaceChecks,
      check('power-eclipse-energy','Peak-load eclipse energy',p.usable,p.eclipseDemand,'kWh','≥','Conservative sizing case: envelope peak bus draw sustained for the full modeled eclipse.',['1.06'],'A valid managed-load schedule can replace this bound only with traceable mode and energy evidence.'),
      check('power-peak-delivery','Installed pack delivery-rate screen',p.dischargeLimit,e.peakBus,'kW','≥','The chemistry C-rate and installed battery-converter output both limit delivery.',['1.06'],'EOL and temperature-dependent pack capability requires separate evidence.'),
      check('power-recharge','Recharge after the peak-load eclipse',p.chargeAvailable,p.chargeRequired,'kW','≥','Available source surplus above mean sunlit load, capped by charger rating; replenish eclipse energy including conversion losses.',['1.06'],'A bounding eclipse case, not a measured battery acceptance result.'),
      check('power-day-unserved','Selected-day unserved electrical energy',p.unserved,0,'kWh','≤','Time-integrated unmet demand in the selected modeled day.',['1.06'],'A clean selected day does not cover every mission mode or EOL season.'),
      check('power-day-soc','Selected-day minimum state of charge',n(day?.minSocPct),100*p.floor,'%','≥','Project design floor; no universal NASA battery-energy percentage is assumed.',['1.06'],'The configured SOC target is separate from the GOLD available-power margin.'),
      check('power-bus-balance','Selected-instant bus accounting residual',p.residual,1e-6,'kW','≤','Solar + discharge − served loads − charge − curtailment. Tolerance is numerical.',['1.06'],'Current spacecraft channels only.',p.live?undefined:s?'not_applicable':'unassessed'),
      openCheck('power-mode-evidence','BOL / EOL mode and hardware evidence','Mode-specific source, load, voltage, transient, temperature, life and recharge closure.',['1.06','1.11','3.13'],'Selected voltage, MPPT, protection, converters and harness now have preliminary allocations. Cell IV curves, supplier ratings, insulation/EMC, protection coordination and thermal/life verification remain open.')],
    interfaces:[{domain:'compute',label:'48 V protected tray/fabric feeds'},{domain:'thermal',label:'Conversion losses, architecture-specific transport and finite cold control'},{domain:'attitude',label:'Array incidence and rotary power interfaces'},{domain:'mass',label:'Module and routed-conductor estimates'}],
    pdrNow:['Review the selected electrical single-line and channel/current allocations against BOL, EOL and mode loads.','Reconcile source, peak, eclipse-energy, recharge and cold-control cases on the installed battery interface.'],
    later:['Correlate hardware loss and battery models with measured temperature, life and transient performance.','Verify source-cell voltage extremes, insulation, EMI/EMC and protective-trip coordination on the installed architecture.'],
    limitations:['The EOL source screen is a sunlight-equivalent energy budget; it does not establish every instantaneous mode margin.','Project module ratings and routed-wire estimates are preliminary; public 120 V heritage does not qualify the 400 V development family.','A current-day result is not a worst-case mission envelope.'],
    graphic:powerGraphic(h,e,s,p),supplementalGraphics:[{id:'electrical-single-line',title:'Selected electrical single-line',svg:renderEnergySingleLine(h,s)}],energyArchitecture:a};
}

const thermalCache=new WeakMap();
function thermalCoverage({h,s,sim,day,thermalSummary,view={}}){
  if(sim?.audit?.thermal)return {summary:sim.audit.thermal,name:'Chronological mission model',instant:false};
  if(day?.thermal)return {summary:day.thermal,name:'Selected-day thermal model',instant:false};
  if(thermalSummary)return {summary:thermalSummary,name:'Selected-window thermal model',instant:false};
  if(sim&&typeof sim.thermalWindow==='function'&&finite(sim.duration)){
    const start=Math.max(-3600,n(view.start)??0),span=Math.min(DAY,Math.max(0,sim.duration-start));
    if(span>0){
      const cached=thermalCache.get(sim);
      if(cached?.start===start&&cached.span===span)return cached.coverage;
      const coverage={summary:sim.thermalWindow(start,span),name:'Selected '+f(span/3600,1)+'-hour thermal model',instant:false};
      thermalCache.set(sim,{start,span,coverage});return coverage;
    }
  }
  const rows=alive(s)?(s.thermalQualification||[]).filter(row=>row.status!=='unassessed').map(row=>({id:row.id,label:row.label,state:row.state,minK:n(row.temperatureK),maxK:n(row.temperatureK),minLimitK:row.minK,maxLimitK:row.maxK,durationS:0})): [];
  return {summary:{rows,coveredSeconds:0,provenance:'Selected instant only'},name:rows.length?'Selected instant only':'No temperature coverage',instant:true};
}
function thermalData(ctx){
  const {h,s,view={}}=ctx,coverage=thermalCoverage(ctx),d=h.input;
  const nodes=thermalNodes.map(node=>{
    const rows=(coverage.summary?.rows||[]).filter(row=>row.id===node.id&&thermalStates.includes(row.state)&&finite(row.minK)&&finite(row.maxK)&&(coverage.instant||row.durationS>0)).map(row=>{
      const limits=node.keys[row.state],lower=d[limits.min],upper=d[limits.max];
      return {...row,minLimitK:lower,maxLimitK:upper,coldMargin:row.minK-lower,hotMargin:upper-row.maxK};
    });
    const cold=rows.length?Math.min(...rows.map(row=>row.coldMargin)):null,hot=rows.length?Math.min(...rows.map(row=>row.hotMargin)):null;
    const worst=rows.slice().sort((a,b)=>Math.min(a.coldMargin,a.hotMargin)-Math.min(b.coldMargin,b.hotMargin))[0]||null;
    const live=alive(s)?n(s[node.tempKey]):null,derived=Object.values(node.keys).some(keys=>Object.values(keys).some(key=>view.thermalTargets?.[key]==='derive'));
    return {...node,label:thermalNodeLabel(h,node.id),rows,cold,hot,worst,live,derived};
  });
  return {coverage,nodes,coveredStates:sum(nodes.map(node=>node.rows.length)),minimum:Math.min(...nodes.flatMap(node=>[node.cold,node.hot]).filter(finite))};
}
function thermalGraphic(h,e,s,t){
  const points=t.nodes.flatMap(node=>node.worst?[node.worst.minLimitK,node.worst.maxLimitK,node.worst.minK,node.worst.maxK]:[]);
  const low=Math.floor(Math.min(120,...points)/25)*25,high=Math.ceil(Math.max(400,...points)/25)*25,scale=440/Math.max(1,high-low),X=value=>255+(value-low)*scale;
  const current=id=>t.nodes.find(node=>node.id===id)?.live,live=alive(s);
  let body=text(28,32,'Heat path and both temperature boundaries','title')+text(28,58,t.coverage.name+' · observed ranges against carried study ratings','small');
  const kind=h.energySystem?.thermal.kind,names=[['junction','Junction'],['coldPlate','Cold plate'],['coolant',kind==='passive-local'?'Local spreader':kind==='heat-lift'?'Cold-side store':'Coolant loop'],['radiator',kind==='passive-local'?'Local platform':kind==='heat-lift'?'Hot radiator':'Radiator banks']];
  names.forEach(([id,name],i)=>{
    const x=30+i*196;body+=rect(x,83,154,65,'#233642','rx="7" stroke="#486474"')+text(x+10,106,name,'label')+text(x+10,132,f(current(id),1)+' K','value');
    if(i<3)body+=arrow('thermal',x+155,114,x+192,114);
  });
  body+=text(30,178,'Pack '+f(current('battery'),1)+' K · exchange '+f(live?s.packToLoopKW:null,2)+' kW','label');
  body+=text(30,203,'Internal heat '+f(live?s.heatInputKW:null,2)+' kW','small');
  body+=text(421,178,'Radiator net rejection '+f(live?s.netRejectionKW:null,2)+' kW','label');
  body+=text(421,203,f(h.radiatorM2,1)+' m² planform · EOL emittance '+f(ageProperties(h.input,h.input.missionYears).emissivity,3),'small');
  body+=text(28,239,'Most restrictive covered state per component','small')+text(772,239,'Nearest bound','small','text-anchor="end"');
  for(let i=0;i<=5;i++){const temp=low+(high-low)*i/5,x=X(temp);body+=line(x,267,x,508,'#2f4553','stroke-dasharray="3 4"')+text(x,260,f(temp,0)+' K','axis','text-anchor="middle"');}
  t.nodes.forEach((node,i)=>{
    const y=285+i*39,row=node.worst;
    body+=text(28,y,node.label,'label')+text(28,y+16,row?row.state:'No covered state','small');
    if(!row){body+=line(255,y,695,y,'#536a77','stroke-dasharray="4 5"')+text(773,y,'Unassessed','small','text-anchor="end"');return;}
    body+=rect(X(row.minLimitK),y-9,(row.maxLimitK-row.minLimitK)*scale,18,'#345063','rx="3"');
    const status=Math.min(row.coldMargin,row.hotMargin)>=0?'meets':'shortfall';
    body+=line(X(row.minK),y,X(row.maxK),y,tone(status),'stroke-width="5"');
    for(const value of [row.minK,row.maxK])body+=line(X(value),y-7,X(value),y+7,tone(status),'stroke-width="2"');
    body+=text(773,y+4,f(Math.min(row.coldMargin,row.hotMargin),1)+' K','label','text-anchor="end"');
  });
  body+=rect(29,532,14,10,'#345063')+text(50,542,'Carried rating', 'small')+line(209,537,239,537,'#91d4b3','stroke-width="5"')+text(247,542,'Modeled range','small')+text(445,542,'Uncertainty / flight qualification: open','small');
  return graphic('thermal','Thermal path and hot and cold component range checks','Six components are assessed against both sides of their operating or survival study ratings. The plot shows each component’s most restrictive covered state. Derived study ratings do not prove hardware capability or GEVS compliance.',body,563);
}
function assessThermal(ctx){
  const {h,s,envelope:e}=ctx,d=h.input,t=thermalData(ctx),a=h.energySystem||deriveEnergySystem(h),loop=a.thermal,checks=[],passive=loop.kind==='passive-local',lift=loop.kind==='heat-lift',fluidPath=!passive&&!lift;
  for(const node of t.nodes){
    const evidence=t.coverage.name+'. '+node.rows.map(row=>row.state+' '+f(row.minK,1)+'–'+f(row.maxK,1)+' K').join('; ')+(node.derived?'. A bound is selected for study derivation.':'')+' Carried limits are not verified hardware AFTs.';
    checks.push(check('thermal-'+node.id+'-cold',node.label+' · cold separation',node.cold,0,'K','≥','Minimum modeled temperature minus the applicable lower study limit.',['4.25'],evidence));
    checks.push(check('thermal-'+node.id+'-hot',node.label+' · hot separation',node.hot,0,'K','≥','Applicable upper study limit minus maximum modeled temperature.',['4.25'],evidence));
  }
  checks.push(...energyDesignChecks(h).filter(row=>row.id.startsWith('thermal-')).map(row=>({...row,ruleIds:['4.06','4.25']})));
  const live=alive(s),liveFlow=live?(n(s.coolantKgPerSec)??n(s.coolantFlowKgS)??0):loop.nominalFlowKgS,hotHeat=n(e.energyInterfaces?.rejectedKw)??e.peakBus,itKW=d.thermalMode==='applied'?d.appliedHeatKw:live?positiveThermal(s.itKW):h.itKw;
  const point=live?energyTemperatureLadder(h,{itKW,heatKW:positiveThermal(s.heatInputKW),loopK:finite(s.loopK)?s.loopK:s.coolantK,radiatorK:s.radiatorK,payloadColdK:s.payloadColdK,heatPumpInputKW:s.servedHeatPumpKW,pumpEnabled:passive||lift?passive||!!s.heatPumpOperating:liveFlow>0,flowKgS:liveFlow}):thermalSizingPoint(h,{itKW,heatKW:hotHeat,heatPumpInputKW:e.energyInterfaces?.peak?.heatPumpInputKW,radiatorK:e.equilibriumK});
  const pointBasis=live?'Selected modeled instant':'Preliminary steady hot-case estimate';
  if(fluidPath){
    checks.push(check('thermal-ammonia-liquid','Coolant liquid-phase pressure separation',point.liquidPressureMarginPa==null?null:point.liquidPressureMarginPa/1000,0,'kPa','≥','2.0 MPa inlet pressure less NIST Antoine vapor pressure at the hottest modeled coolant.',['4.25'],pointBasis+'; the pressure envelope, compatibility and hot/startup transients require verification.'));
    checks.push(check('thermal-ammonia-freeze','Coolant freezing separation',point.freezeSeparationK,0,'K','≥','Lowest modeled supply/panel temperature less the 194.95 K ammonia fusion temperature.',['4.25'],pointBasis+'; isolated local pockets and panel gradients remain verification items.'));
    checks.push(check('thermal-fluid-properties','Hydraulic property-model applicability',Math.min(point.coolantSupplyK-loop.fluid.propertyMinK,loop.fluid.propertyMaxK-point.coolantReturnK),0,'K inside property span','≥','Rounded constant properties are a preliminary estimate over 260–315 K; they are not a pressure/temperature property correlation.',['1.11','4.25'],pointBasis+'. '+loop.fluid.propertyBasis,point.propertyInRange?'meets':'unassessed'));
  }
  if(lift)checks.push(check('thermal-heatpump-conservation','Heat-pump energy residual',live?Math.abs((s.heatPumpHotRejectionKW||0)-(s.heatPumpColdRemovalKW||0)-(s.servedHeatPumpKW||0)):0,1e-7,'kW','≤','Hot-side heat equals removed cold-side heat plus served compressor electrical work.',['4.06','4.25'],'An accounting identity is distinct from proving compressor efficiency, material compatibility or component temperatures.'),check('thermal-heatpump-cycle','Thermodynamic applicability at assessed temperatures',point.heatPumpThermodynamicValid?1:0,1,'condition','≥','Positive absolute temperatures and allocated COP below the actual Carnot ceiling when the hot side is warmer.',['4.06','4.25'],pointBasis+'; necessary cycle feasibility does not qualify machinery or materials.'));
  checks.push(check('thermal-hot-area','Hot-case radiator sizing screen',h.radiatorM2,e.radiatorNeeded,'m²','≥','EOL optical properties, selected rejection temperature and the architecture-specific energy balance.',['4.06','4.25'],'The area screen is separate from transport capacity, component temperature and uncertainty checks.'));
  checks.push(openCheck('thermal-limits-evidence','Flight temperature and uncertainty evidence','GOLD 4.25 and GEVS §2.6 require an adequate component temperature hierarchy and justified uncertainty treatment.',['4.25','4.27','4.28'],'Supplier/application AFTs, material limits, transport data, gradients and thermal-balance correlation remain open. Solving a study bound is not verification.'));
  checks.push(openCheck('thermal-case-coverage','Bounding environment and mode coverage','BOL/EOL hot, cold, startup, standby, eclipse, maneuver and disposal cases must be justified.',['4.25','4.28'],t.coveredStates+' of '+thermalNodes.length*thermalStates.length+' model component/state combinations have observations here. Finite heat transport and cold-control authority require bounding demonstration.'));
  const design=[label('Sizing case',sizingCase(e),'',e.environmentalBasis?.thermalScope||'Common hot-flux and cold-heater bounds. Live and selected-day temperatures use the configured orbit and observed modes.'),label('Radiator planform / hot sizing demand',f(h.radiatorM2,1)+' / '+f(e.radiatorNeeded,1),'m²','Emitting faces and environmental absorption follow physical surfaces; transport controls do not hide radiator area.')];
  if(passive)design.push(
    label('Payload thermal path','Spreader / heat pipes','','Radiator-mounted payload heat reaches its local platform. No remote ammonia loop, pump, accumulator or fluid deployment crossing is installed.'),
    label('Local conductance / transport capacity',f(loop.passive.conductanceKWK,2)+' / '+f(loop.passive.capacityKW,1),'kW/K / kW',loop.passive.basis),
    label('Separate bus thermal conductance',loop.passive.busConductanceKWK,'kW/K','Bus and battery heat uses a separate finite strap path to the same platform. It is an additional project accommodation beyond the source electrical-only hinge description; deployment routing and interface evidence remain open.'),
    label('Local transport hardware',loop.loopHardwareKg,'kg','Spreader, heat-pipe allocations, bus straps and attachments. Tray cold-plate and radiator panel metal remain in their respective equipment accounts.')
  );
  else if(lift)design.push(
    label('Cold / hot design temperatures',f(loop.heatPump.coldK,2)+' / '+f(loop.heatPump.hotK,2),'K','Analytical cold-side control target and hot-side design point, not qualified component limits.'),
    label('Cooling COP / reversible ceiling',f(loop.heatPump.cop,2)+' / '+f(loop.heatPump.carnotCOP,2),'kW cold / kW electric','The Carnot bound is necessary but insufficient. Achievable compressor performance remains unverified.'),
    label('Cold capacity / nominal cold demand',f(loop.heatPump.coldCapacityKW,1)+' / '+f(loop.heatPump.requiredColdKW,1),'kW cold','Internal equipment and conversion losses enter the cold store; compressor work enters the hot side.'),
    label('Compressor input / hot rejection',f(live?s.servedHeatPumpKW:point.heatPumpInputKW,2)+' / '+f(live?s.heatPumpHotRejectionKW:point.heatPumpHotRejectionKW,2),'kW','Separate primary-bus motor drive. Work is counted once in electrical load and once in hot-side heat.'),
    label('Working fluid and materials','Unselected','','No ammonia property correlation is applied. '+loop.heatPump.materialBasis),
    label('Heat-pump assembly allocation',loop.heatPump.massKg,'kg',loop.heatPump.basis)
  );
  else design.push(
    label('Working fluid / inlet pressure','NH₃ / 2.0','MPa','Selected pressurized liquid ammonia. 3.5 MPa maximum-design-pressure allocation; material, seal and pressure-vessel verification remains open.'),
    label('Fluid circuits / installed pumps',(loop.loopCount||1)+' / '+loop.pumpsInstalled,'loops / pumps',loop.redundancy),
    label('Flow demand / pump capacity',f(loop.requiredFlowKgS,3)+' / '+f(loop.maximumFlowKgS,3),'kg/s','Eight-kelvin design rise; pump/system intersections from Darcy, local, cold-plate and panel-channel losses.'),
    label('Per-loop pressure loss / total pump draw',f(loop.nominal.totalPa/1000,1)+' / '+f(loop.pumpNominalKW,3),'kPa / kW',loop.kind==='redundant-pumped'?'Each independent circuit has its own duty/standby pair, headers and accumulator. Losing one circuit loses its allocated capacity.':'One running and one cold-standby pump share headers and an accumulator.'),
    label('Loop-to-radiator conductance',loop.nominalConductanceKWK,'kW/K','Fluid film and tube/plate bond in series; mixing controls conductance between separate stored-energy nodes.'),
    label('Transport hardware / contained fluid',f(loop.loopHardwareKg,1)+' / '+f(loop.fluidKg,1),'kg','Lines, installed pumps, contained accumulators, valves, articulated interfaces and fluid. Cold-plate and radiator metal remain in their original hardware accounts.')
  );
  design.push(label('Battery / transport / panel heater limits',[a.coldControl.batteryHeaterKW,a.coldControl.loopHeaterKW,a.coldControl.radiatorHeaterKW].map(v=>f(v,2)).join(' / '),'kW','Finite thermostat/PWM allocations charged to electrical load and deposited once at the receiving thermal node.'),label('Junction / transport interface',f(point.junctionK,1)+' / '+f(point.coolantReturnK,1),'K',pointBasis+'; architecture-specific transport plus local contact/junction temperature rise.'));
  return {id:'thermal',title:'Thermal control',designSummary:loop.topology+'. '+(finite(t.minimum)?f(t.minimum,1)+' K nearest observed component boundary.':'No component temperature coverage yet.'),design,checks,
    interfaces:[{domain:'power',label:lift?'Heat-pump drive, conversion heat and finite cold control':'Transport and cold-control electrical demand'},{domain:'compute',label:passive?'Local platform payload and cold-plate placement':'Cold-plate interfaces and local junction rise'},{domain:'environment',label:'Physical panel absorption, emission and material bounds'},{domain:'mechanical',label:passive?'Passive platform, harness hinge and thermal straps':'Transport accommodation, deployment and thermal distortion'}],
    pdrNow:['Review the selected thermal topology, finite transport capacity and temperature ladder against source-specific hot/cold and startup cases.','Keep component/material uncertainty and unobserved modes explicit; verify that electrical and thermal boundaries conserve energy.'],
    later:['Correlate the finite thermal nodes, conductances, transport capacity and controller behavior with thermal-balance/thermal-vacuum evidence.','Verify working fluids where applicable, material compatibility, interface life and supplier component flight-temperature limits.'],
    limitations:['A state that was never observed remains unassessed; it is not treated as a thermal pass.','The lumped stores do not resolve every local hot spot, branch imbalance, panel gradient or startup transient.','Conductance, machinery, controls and mass allocations are project estimates; reference publication does not qualify the modeled assembly.'],
    graphic:thermalGraphic(h,e,s,t),supplementalGraphics:[{id:'thermal-fluid-path',title:'Selected thermal transport and cold-control path',svg:renderThermalPath(h,s)}],energyArchitecture:a};
}
const positiveThermal=value=>finite(value)?Math.max(0,value):0;

function densityAt(altitudeKm,column){
  if(!finite(altitudeKm)||altitudeKm<100||altitudeKm>900)return null;
  const position=(altitudeKm-100)/20,index=Math.min(densities.length-2,Math.floor(position)),weight=position-index;
  return Math.exp(Math.log(densities[index][column])*(1-weight)+Math.log(densities[index+1][column])*weight);
}
function environmentData(h,s){
  const d=h.input,semimajor=R+d.altitudeKm,perigee=semimajor*(1-d.ecc)-R,apogee=semimajor*(1+d.ecc)-R;
  const age=ageProperties(d,d.missionYears),orbital=alive(s)&&!s.carrierAttached&&s.t>=540;
  const fluxes=orbital?[s.radiatorDirectSolarKW,s.radiatorAlbedoKW,s.radiatorEarthIRKW]:[];
  const fluxResidual=fluxes.length&&fluxes.every(finite)&&finite(s.absorbedKW)?Math.abs(s.absorbedKW-sum(fluxes)):null;
  return {perigee,apogee,age,orbital,coverage:Math.min(perigee-100,900-apogee),rhoLow:densityAt(apogee,0),rhoHigh:densityAt(perigee,3),fluxResidual};
}
function environmentGraphic(h,s,a){
  const architecture=architectureFamily(h),current=key=>a.orbital?n(s?.[key]):null,wing=clamp(48+Math.sqrt(h.solarM2)*2.6,55,120),bank=clamp(35+Math.sqrt(h.radiatorM2)*2.5,45,84);
  let body=text(28,32,'Natural forcing, receiving surfaces and life properties','title');
  body+=text(28,59,f(a.perigee,1)+'–'+f(a.apogee,1)+' km configured apsides · '+f(h.input.missionYears,2)+' years','small');
  body+='<circle cx="83" cy="126" r="30" fill="#dfbf72"/>'+text(83,177,'Sun','label','text-anchor="middle"')+text(28,201,f(current('solarIrradiance'),0)+' W/m² normal','small');
  const bx=347,by=150;
  body+=rect(bx-31,by-24,62,87,'#9aab9e','rx="4" stroke="#e3ebdb"');
  for(const side of [-1,1])for(const offset of architecture.solarWingCount>2?[-1,1]:[0]){
    const x=side<0?bx-39-wing:bx+39,y=by+offset*38;
    body+=rect(x,y,wing,20,'#315a80','stroke="#7fa9cb"');
    for(let j=1;j<5;j++)body+=line(x+wing*j/5,y,x+wing*j/5,y+20,'#527da4');
  }
  if(architecture.radiatorBankCount>1)body+=rect(bx-bank/2,by-52,bank,15,'#ba9a70','stroke="#e6c27e"');
  body+=rect(bx-bank/2,by+79,bank,15,'#ba9a70','stroke="#e6c27e"');
  if(architecture.payloadLocation==='radiator')body+=rect(bx-12,by+75,24,8,'#9aab9e','stroke="#e3ebdb"');
  body+=arrow('environment',121,124,bx-wing-48,124)+text(160,98,'PV → '+f(current('solarKW'),2)+' kW','label');
  body+='<circle cx="91" cy="308" r="38" fill="#315e79" stroke="#87b6c9"/><path d="M65 286Q105 269 117 305Q85 305 72 330" fill="none" stroke="#7aa697" stroke-width="8"/>';
  body+=text(91,363,'Earth + atmosphere','label','text-anchor="middle"');
  body+=arrow('environment',132,300,304,238)+text(158,310,'IR '+f(current('radiatorEarthIRKW'),2)+' kW','small')+text(158,333,'Albedo '+f(current('radiatorAlbedoKW'),2)+' kW','small');
  body+=text(286,279,architecture.radiatorBankCount===1?'One compute / radiator platform':architecture.radiatorBankCount+' radiator banks','small')+text(286,301,'Absorbed '+f(current('absorbedKW'),2)+' kW','label');
  body+=rect(522,83,249,251,'#1d303c','rx="8"');
  body+=text(537,108,'Configured end-of-life properties','label');
  const rows=[['PV efficiency',a.age.pv],['Radiator emittance',a.age.emissivity],['Solar absorptance',a.age.absorptivity]];
  rows.forEach(([name,value],i)=>{const y=141+i*62;body+=text(537,y,name,'small')+text(754,y,f(value,3),'label','text-anchor="end"')+rect(537,y+10,217,12,'#314855','rx="3"')+rect(537,y+10,217*clamp(value,0,1),12,i===2?'#d2ac72':'#7bafd0','rx="3"');});
  body+=text(28,399,'Unmodulated density-table span at the configured apsides','label');
  body+=text(28,425,f(a.rhoLow,3)+' to '+f(a.rhoHigh,3)+' kg/m³','value')+text(452,425,'Current '+f(current('densityKgM3'),3)+' kg/m³','label');
  body+=text(28,455,'Lookup coverage: '+(a.coverage>=0?'100–900 km':'outside the tabulated altitude range')+' · dose, charging and debris envelopes remain open.','small');
  return graphic('environment','Environmental forcing and receiving spacecraft surfaces','A schematic of '+architecture.solarWingCount+' solar wings and '+architecture.radiatorBankCount+' radiator platforms or banks shows current solar and Earth heating, the configured orbit, density-table coverage and EOL optical properties. The tabulated density family is a scenario span, not a sigma bound.',body,478);
}
function assessEnvironment(ctx){
  const {h,s}=ctx,d=h.input,a=environmentData(h,s),assurance=radiationAndLife(h),optical=[a.age.emissivity,1-a.age.emissivity,a.age.absorptivity,1-a.age.absorptivity];
  return {id:'environment',title:'Environment',designSummary:'Configured orbit '+f(a.perigee,0)+'–'+f(a.apogee,0)+' km, '+f(d.missionYears,2)+' years. '+f(assurance.shieldArealGCm2,2)+' g/cm² added shielding; five-year component life allocation. '+(a.coverage>=0?'Density lookup is inside its altitude span.':'Density extrapolation needs a supported model.')+' Mission qualification remains open.',
    design:[label('Configured perigee / apogee',f(a.perigee,1)+' / '+f(a.apogee,1),'km','Keplerian apsides from the configured semimajor axis and eccentricity.'),
      label('Direct solar forcing', '0–'+SOLAR,'W/m² normal','Existing model solar constant with geometric shadow; spacecraft incidence is separate.'),
      label('Density scenario low / high',f(a.rhoLow,3)+' / '+f(a.rhoHigh,3),'kg/m³','Unmodulated low and high-short-term table columns at apogee and perigee; not statistical confidence limits.'),
      label('Solar-activity driver',d.solarDriver==='observed'?'Historical monthly replay':'Configured nominal cycle','',d.solarDriver==='observed'?'The model replays 2009–2019 monthly values; it does not predict the flight year.':'F10.7 and Ap are scenario inputs, not an accepted mission environment.'),
      label('Radiator EOL emittance / absorptance',f(a.age.emissivity,3)+' / '+f(a.age.absorptivity,3),'','Configured life retention and optical-property evolution.'),
      label('Added shielding / Al-equivalent thickness',f(assurance.shieldArealGCm2,2)+' / '+f(assurance.aluminiumEquivalentMm,2),'g/cm² / mm',assurance.radiationBasis),
      label('Installed shielding / design-life allocation',f(assurance.installedShieldKg,1)+' / '+f(assurance.referenceLifeYears,0),'kg / years','Protected central compute and separately accommodated flight avionics; directional shielding and component response remain open.'),
      label('Recovery and life provisions','ECC · scrubbing · isolation · restart','','Selected architecture requirements, with part susceptibility, protection response and recovery evidence tracked separately.')],
    checks:[check('environment-density-coverage','Density-table altitude coverage',a.coverage,0,'km inside span','≥','Current table covers 100–900 km; the whole configured apsis range is checked.',['1.11'],'Outside-table extrapolation cannot close the environment assessment.',a.coverage>=0?'meets':'unassessed'),
      check('environment-driver-order','Nominal solar-activity bounds',d.f107Ceiling-d.f107Floor,0,'sfu','≥','Upper F10.7 scenario must not be below its lower scenario. No sigma interpretation is assigned.',[],d.solarDriver==='observed'?'Nominal-cycle bounds do not control the historical replay.':'Configured model input consistency.',d.solarDriver==='observed'?'not_applicable':undefined),
      check('environment-optical-bounds','EOL optical-property range',optical.every(finite)?Math.min(...optical):null,0,'fraction to nearest bound','≥','Emittance and absorptance must lie in [0,1]; this is a physical input screen.',['4.06'],'Actual finish validation, contamination and mission-life exposure remain open.'),
      check('environment-flux-accounting','Absorbed radiator heat accounting',a.fluxResidual,1e-6,'kW','≤','Direct Sun + albedo + Earth IR absorption equals total radiator environmental input.',['4.06','4.25'],'Numerical residual only; current spacecraft external exposure.',a.orbital?undefined:s?'not_applicable':'unassessed'),
      check('environment-life-allocation','Requested life within component planning allocation',assurance.requestedLifeYears,assurance.referenceLifeYears,'yr','≤','The selected reference carries a five-year study life. A longer mission remains configurable and exposes a new evidence requirement.',['1.11'],'Inside this allocation does not establish dose, pump/joint life, coating retention or battery-cycle qualification.'),
      openCheck('environment-envelope','Mission natural and induced environment baseline','Define bounding thermal, radiation, atmospheric, magnetic, launch and self-induced environments for the selected orbit and life.',['1.11','4.03','4.06','4.25'],'The selectable model cases do not establish an approved environmental requirements specification.'),
      openCheck('environment-radiation','Part-level radiation and charging assessment','NASA-STD-8739.10 §§5.3.2.1 / 8.1.3 and project environment requirements; no universal radiation factor.',['1.11','4.30'],'Dose, displacement damage, relevant single-event effects, charging and application-level tolerance require mission-specific analysis.'),
      openCheck('environment-debris','Debris and atomic-oxygen exposure','Define exposure and protection requirements for the actual orbit, geometry, materials and mission life.',[],'No impact, erosion or material-survival probability is inferred from the orbit animation.')],
    interfaces:[{domain:'orbit',label:'Apsides, shadow seasons and exposure duration'},{domain:'power',label:'Array illumination and life loss'},{domain:'thermal',label:'Surface heat flux and coating properties'},{domain:'prop',label:'Drag history and maintenance impulse'},{domain:'mechanical',label:'Launch, debris and material environments'}],
    pdrNow:['Baseline the natural and induced environmental cases with uncertainty, duration and responsible owners.','Carry the selected shielding, ECC/scrubbing, power isolation, watchdog recovery and flight-avionics separation into the parts and life plans.','Show how each environment enters the receiving subsystem model and identify unsupported extrapolations.'],
    later:['Refine environment / transport models and verify flight materials and components against the adopted levels.','Correlate environmental predictions and operational observations where practical.'],
    limitations:['The density family is a tabulated scenario span, not a statistical 3σ result.','A nominal or historical solar-activity replay does not establish an operational forecast.','Radiation, charging, debris and atomic-oxygen assurance are not supplied by the current flux model.'],
    graphic:environmentGraphic(h,s,a),assuranceArchitecture:assurance};
}

function mechanicalGraphic(h,loads){
  const fairing=h.fairing,stack=fairing.stack,profile=fairing.profile,zmax=Math.max(fairing.heightM,...stack.map(part=>part.z1M)),rmax=Math.max(...profile.map(point=>point[1]),...stack.map(part=>part.radiusM));
  const scale=Math.min(292/Math.max(zmax,1),180/Math.max(rmax,1)),X=value=>244+value*scale,Y=value=>390-value*scale;
  let body=text(28,32,'Stowed load path and geometric clearance','title')+text(28,58,'Circumscribed envelopes; load arrows use the current project quasi-static case.','small');
  const outline=profile.map(([z,r])=>X(-r)+','+Y(z)).concat(profile.slice().reverse().map(([z,r])=>X(r)+','+Y(z))).join(' ');
  body+='<polygon points="'+outline+'" fill="#1e3544" stroke="#92b9ca" stroke-width="2"/>';
  const colors=part=>/solar/i.test(part)?'#577ea4':/radiator/i.test(part)?'#ad946e':/adapter|stand-off/i.test(part)?'#8b7ca9':'#6b837e';
  stack.forEach(part=>{body+=rect(X(-part.radiusM),Y(part.z1M),part.radiusM*2*scale,(part.z1M-part.z0M)*scale,colors(part.part),'fill-opacity=".28" stroke="'+colors(part.part)+'" stroke-width="1.2"');});
  const bus=stack.find(part=>/Insulated bus/i.test(part.part)),origin=bus?bus.z0M+h.bodyLengthM/2:0,cmZ=origin+loads.stowedScCmM[2],cmX=loads.stowedScCmM[0];
  body+='<circle cx="'+X(cmX)+'" cy="'+Y(cmZ)+'" r="5" fill="#f0dba5"/>'+line(X(cmX)-9,Y(cmZ),X(cmX)+9,Y(cmZ),'#f0dba5')+line(X(cmX),Y(cmZ)-9,X(cmX),Y(cmZ)+9,'#f0dba5');
  body+=arrow('mechanical',X(cmX)-8,Y(cmZ),X(cmX)-80,Y(cmZ))+arrow('mechanical',X(cmX),Y(cmZ)+8,X(cmX),Y(cmZ)+71);
  body+=text(29,420,'Axial '+f(Math.abs(loads.interfaceForceN[2])/1000,1)+' kN · lateral '+f(Math.abs(loads.interfaceForceN[0])/1000,1)+' kN','label');
  body+=text(29,446,'Interface bending '+f(loads.interfaceBendingNm/1000,1)+' kN·m','label');
  const flangeY=Y(origin+loads.flangeZ);
  body+=text(28,83,'+Z','small')+line(293,flangeY,362,flangeY,'#8b7ca9')+text(370,flangeY+4,h.payloadInterface.attachmentShape==='rectangular'?'Lug plane':'Flange','small');
  const part=stack.find(part=>part.part===fairing.limitingPart)||stack[0],available=Math.max(0,radiusAt(profile,fairing.limitingZM)-fairing.radialPaddingM),sectionScale=96/Math.max(part.radiusM,available,.01),cx=647,cy=207;
  body+=text(501,91,'Limiting radial section','label')+text(501,113,'Station '+f(fairing.limitingZM,2)+' m','small');
  body+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(available*sectionScale)+'" fill="#233c4b" stroke="#90b7c8" stroke-width="2"/><circle cx="'+cx+'" cy="'+cy+'" r="'+(part.radiusM*sectionScale)+'" fill="none" stroke="'+tone(fairing.radialClearanceM>=0?'meets':'shortfall')+'" stroke-width="2.5" stroke-dasharray="6 4"/>';
  body+=line(cx,cy,cx+available*sectionScale,cy,'#d6c69a')+line(cx,cy+6,cx+part.radiusM*sectionScale,cy+6,'#e0a088');
  body+=text(647,329,f(fairing.radialClearanceM*1000,1)+' mm radial clearance','label','text-anchor="middle"');
  body+=text(501,357,f(fairing.axialClearanceM*1000,1)+' mm axial clearance','label');
  body+=text(501,385,'Case '+loads.accelerationG.map(value=>f(value,1)).join(' / ')+' g · body XYZ','small');
  body+=text(501,409,'Allocated bounds below · verification open','small');
  body+=text(28,480,'Fit is a geometric screen. GEVS factors apply to defined loads and material allowables, not to added mass.','small');
  return graphic('mechanical','Stowed spacecraft envelope, center of mass and load path','A tapered fairing section shows the loaded spacecraft envelopes and inertial load directions. The radial section compares occupied and available radius. Force and bending values are project load demands, not structural margins of safety.',body,502);
}
function assessMechanical(ctx){
  const {h}=ctx,loads=launchStructure(h),p=h.payloadInterface,bounds=structuralBounds(h),trade=deriveArchitectureTrade(h),longerons=bounds.longerons,family=architectureFamily(h);
  const preliminaryChecks=longerons?[
    check('mechanical-longeron-yield','Allocated longeron yield screen',longerons.yieldMargin,0,'margin','>','1.25 metallic static factor; four equivalent square-tube longerons under the current +6 g axial / +2 g lateral case.',['4.03','4.12'],longerons.evidence),
    check('mechanical-longeron-ultimate','Allocated longeron ultimate screen',longerons.ultimateMargin,0,'margin','>','1.4 metallic static factor; 260 MPa minimum ultimate material-property allocation.',['4.03','4.12'],longerons.evidence),
    check('mechanical-longeron-stability','Inter-frame longeron buckling screen',longerons.stabilityMargin,0,'margin','>','Pinned Euler model with 1.4 stability factor and installed frame spacing; wall load sharing is not credited.',['4.03','4.12'],longerons.basis),
    check('mechanical-flex-separation','Allocated first-mode / body bandwidth separation',bounds.modalSeparation,bounds.allocation.modal.minimumSeparation,'ratio','≥','Lower equivalent-beam mode bound divided by the body-controller bandwidth. Fivefold separation is a project preliminary design requirement.',['4.14'],'Equivalent stiffness bounds require correlation; full flexible-plant gain/phase verification remains open.'),
    ...bounds.mechanisms.map(m=>check('mechanical-drive-'+m.id,m.label+' allocated torque screen',m.margin,0,'margin','>','Minimum allocated output divided by 3.0 × variable resistance + 1.5 × fixed resistance + 1.25 × acceleration torque, minus one.',['4.15'],m.evidence))
  ]:[];
  return {id:'mechanical',title:'Mechanical design',designSummary:(h.physicalArchitecture?.label||family.label)+'; '+f(h.bodyWidthM,2)+' × '+f(h.bodyHeightM,2)+' × '+f(h.bodyLengthM,2)+' m allocated bus; '+f(h.fairing.radialClearanceM*1000,1)+' mm tightest radial clearance. '+(trade.comparisonStatus||'Explicit load, mode and drive allocations are shown below; verification evidence remains open.'),
    design:[label('Bus width / height / length',[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM].map(value=>f(value,2)).join(' / '),'m','Installed enclosure, internal equipment and structural layout.'),
      label('Stowed spacecraft-side mass',loads.stowedScMassKg,'kg','Loaded spacecraft at its selected interface; launch-only adapter excluded.'),
      label('Quasi-static body acceleration',loads.accelerationG.map(value=>f(value,1)).join(' / '),'g, XYZ','Project study case; not an accepted launcher coupled-loads envelope.'),
      label('Interface axial / lateral demand',f(Math.abs(loads.interfaceForceN[2])/1000,1)+' / '+f(Math.abs(loads.interfaceForceN[0])/1000,1),'kN','Net inertial force from the current mass and acceleration case.'),
      label('Interface bending demand',loads.interfaceBendingNm/1000,'kN·m','Moment of spacecraft inertia load about the selected attachment plane.'),
      label('Static yield / ultimate / stability factors','1.25 / 1.40 / 1.40','','GEVS Table 2.2-3 metallic static route with planned test verification; other material, load and pressure categories require their own factors.'),
      label('Longeron yield / ultimate material requirements',longerons?f(longerons.yieldRequirementPa/1e6,0)+' / '+f(longerons.ultimateRequirementPa/1e6,0):null,'MPa','Minimum property allocations for the selected temperature/environment, not approved flight material allowables.'),
      label('Mechanism factors / lowest bounded mode', '3.00 / 1.50 / 1.25 · '+f(bounds.lowestModeHz,3),'variable / fixed / acceleration · Hz','NASA-STD-5017B analysis-stage factors; the mode is an equivalent-beam estimate with bounded stiffness.')],
    checks:[check('mechanical-radial','Stowed radial envelope',h.fairing.radialClearanceM*1000,0,'mm','≥','Signed clearance after the configured radial motion allowance and tapered profile.',['4.24'],h.fairing.basis+'; '+h.fairing.limitingPart+'.'),
      check('mechanical-axial','Stowed axial envelope',h.fairing.axialClearanceM*1000,0,'mm','≥','Signed tip clearance after the configured axial allowance.',['4.24'],'Provider-approved geometry and dynamic motion are separate evidence.'),
      check('mechanical-adapter-bore',p.clearanceLabel||'Engine / adapter bore clearance',p.boreClearanceM*1000,0,'mm','≥','Installed rigid geometry at the selected spacecraft / launch adapter interface.',['4.24'],'Nominal geometry only.'),
      check('mechanical-deck','Aft deck keep-in clearance',p.deckClearanceM*1000,0,'mm','≥','Current deck and flange accommodation.',['4.24'],'Joint deflection, tolerances and verified interface drawings remain open.'),
      check('mechanical-bell-tip','Engine tip standoff clearance',p.bellTipClearanceM*1000,0,'mm','≥','Current engine-tip / support stand-off geometry.',['4.24'],'Geometry screen only.'),
      ...preliminaryChecks,
      check('mechanical-strength','Structural margin of safety',null,0,'margin of safety','>','Allowable / (applicable safety factor × limit-load effect) − 1, where this form applies.',['4.03','4.12','4.14'],'Accepted limit loads, material allowables, load combinations, joint stiffness and failure modes are not available.','unassessed'),
      check('mechanical-torque','Mechanism torque / force margin',null,0,'torque / force margin','>','Minimum available capability / sum of resisting and acceleration terms, factored for the verification stage, − 1.',['4.15'],'NASA-STD-5017B §4.3 requires environment / life effects and later test verification.','unassessed'),
      openCheck('mechanical-modal','Structural dynamics and launch environment','A geometric fit and rigid-body acceleration case do not establish modal, random, acoustic, shock or coupled-loads closure.',['4.03','4.14'],'Preliminary FEM, launcher forcing / interface data, damping basis and verification approach remain open.')],
    interfaces:[{domain:'mass',label:'Equipment masses, growth, centers and inertia'},{domain:'launcher',label:'Fairing, interface and accepted launch loads'},{domain:'thermal',label:'Thermal distortion and conduction paths'},{domain:'attitude',label:'Flexible modes, inertia growth and mechanism reactions'},{domain:'prop',label:'Tank mounts, feed routing and thrust loads'}],
    pdrNow:[family.id==='protected-core'?'Retain the protected-core comparison against its matched compact-backbone and attached radiator-module trades; reopen the decision when its stated study envelope is exceeded.':'Review the selected '+family.label+' realization against its own evidence, packaging and component interfaces. Legacy protected-core packaging alternatives do not constitute matched trades for this family.','Use the explicit longeron, inter-frame buckling, flexible-mode and factored drive requirements to direct material and mechanism selection.','Reconcile launch restraints, interface geometry, mass properties and preliminary modal behavior with the launcher.'],
    later:['Correlate modal / environmental analyses and complete structural proof, qualification and mechanism life verification.','Verify as-built tolerances, clearance, fastener preload and deployment performance.'],
    limitations:['Longeron screens conservatively omit wall load sharing and do not verify local joints, composite/bonded panels, pressure systems or all failure modes.','The matched alternatives retain the common mission and equipment basis; their packaging and additional interface masses are preliminary analytical allocations.','The circumscribed fairing screen omits elastic motion unless covered by separately justified allowances.','Reference component heritage does not qualify the scaled installed structure or mechanism.'],
    graphic:mechanicalGraphic(h,loads),supplementalGraphics:[{id:'matched-architecture-trade',title:'Matched architecture and packaging trade',svg:architectureTradeGraphic(trade)},{id:'structural-control-bounds',title:'Flexible modes, drive torque and pointing allocation',svg:structuralBoundsGraphic(bounds)}],structuralBounds:bounds,architectureTrade:trade};
}

export function assessResourceDomains(ctx){
  if(!ctx?.h?.input)throw new Error('Resource assessment requires the installed sizeDesign hardware.');
  const context={...ctx,envelope:ctx.envelope||sizingEnvelope(ctx.h),view:ctx.view||{}};
  const builders={environment:assessEnvironment,power:assessPower,thermal:assessThermal,mass:assessMass,mechanical:assessMechanical};
  return Object.fromEntries(Object.entries(builders).filter(([id])=>!ctx.domainIds||ctx.domainIds.includes(id)).map(([id,build])=>[id,build(context)]));
}
