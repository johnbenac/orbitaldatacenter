import {buildEquipmentList,filterEquipmentRows} from './equipment-list.js';
import {componentMassProperties,equipmentAllocations} from './component-stations.js';
import {entryDensity} from './entry.js';

const phaseInfo={
 A:['Mechanical design requirements','Inspect the launch manifest, structural envelope and center-of-mass datum of the selected design.'],
 B:['Installed equipment arrangement','Trace each equipment account to its body station. Mirrored units and moving appendages contribute their own signed mass moments.'],
 C:['Integrated mass properties','Compare launch, deployed and selected-time configurations. Apply a subsystem or part-number filter to calculate its contribution.'],
 D:['Launch stack and release','The separation adapter contributes until release. The panel cassette moves forward in the fairing stack, then its mass follows the deployment sequence.'],
 E:['On-orbit mass distribution','Follow liquid depletion, helium redistribution and appendage locations at the simulation clock.'],
 F:['End-of-mission mechanical assessment','Inspect the final attached hardware and its materials at disposal.']
};
const f=(v,d=2)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const vec=p=>p.map(x=>f(x,3)).join(' / ');
const massCases={launch:'Loaded on adapter',deployed:'Deployed, full tanks',current:'Mission instant'};
const sectionPhase=phase=>phase==='A'?'launch':phase==='B'?'deployed':'current';
function pose(h,s,key){
 if(key==='launch')return [h.propellantKg,0,true];
 if(key==='deployed')return [h.propellantKg,1,false];
 return [s?.propellantKg??h.propellantKg,s?.deployment??1,(s?.t??540)<540];
}
function stateFor(h,s,mode){
 const [remaining,progress,adapter]=pose(h,s,mode);
 const props=componentMassProperties(h,remaining,progress,adapter);
 return {...props,remainingKg:remaining,deployment:progress,adapterAttached:adapter};
}
function center(rows){
 const kg=rows.reduce((sum,r)=>sum+r.predictedKg,0);
 return {kg,cm:kg?rows.reduce((m,r)=>m.map((v,k)=>v+r.centroidM[k]*r.predictedKg/kg),[0,0,0]):null};
}
const methodLink='https://orbitaldebris.jsc.nasa.gov/reentry/orsat.html';
const heatingLink='https://tfaws.nasa.gov/TFAWS12/Proceedings/Aerothermodynamics%20Course.pdf';
const tankLink='https://ntrs.nasa.gov/citations/20110008637';
// Sensitivity experiment for isolated empty metal shells. Integrate stagnation
// heating and drag along a constant descent angle. Compare thermal energy supplied
// with sensible heat plus fusion; no claim about post-melt shedding or impact mass.
function shellDose(mass,radius,projected,breakupKm,flightPathDeg,releaseSpeed){
 const beta=mass/(1.2*projected);
 const sin=Math.sin(flightPathDeg*Math.PI/180),dz=100,ds=dz/sin;
 let speed=releaseSpeed,dose=0;
 for(let z=breakupKm*1000;z>1000&&speed>1000;z-=dz){
  const rho=entryDensity((z-.5*dz)/1000);
  // Exact drag-only velocity change over one constant-density segment.
  const v2=speed*Math.exp(-rho*ds/(2*beta)),v=(speed+v2)/2;
  dose+=1.7415e-4*Math.sqrt(rho/radius)*v**2*projected*ds;
  speed=v2;
 }
 return {heatMJ:dose/1e6,betaKgM2:beta};
}
const materials={
 titanium:{label:'Titanium vessel surrogate',meltK:1940,cpJkgK:650,fusionJkg:295000},
 steel:{label:'Steel rotor surrogate',meltK:1750,cpJkgK:600,fusionJkg:270000},
 aluminum:{label:'Aluminum sheet surrogate',meltK:933,cpJkgK:900,fusionJkg:397000}
};
export function demiseScreen(h,s,context={}){
 if(h.input.disposalMethod==='graveyard')return {status:'retirement orbit',rows:[]};
 if(context?.route?.feasible===false||s?.disposalStatus==='infeasible')return {status:'disposal infeasible',rows:[]};
 const supplied=context?.entrySpeedMs??s?.entryInterfaceSpeedMs??s?.entrySpeedMs;
 const hasSpeed=Number.isFinite(supplied)&&supplied>0,speed=hasSpeed?supplied:7600;
 const speedBasis=hasSpeed?'Modeled 120 km interface speed applied at release':'Assumed 7.6 km/s breakup speed';
 const parts=Object.fromEntries(equipmentAllocations(h).map(r=>[r.wbs,r.kg]));
 const cases=[[70,8],[78,5],[85,2]],rows=[];
 const add=(wbs,item,material,count,share,radius,area,shapeNote)=>{
  const modeledKg=parts[wbs]*share,unitKg=modeledKg/count,mat=materials[material];
  const thresholdMJ=unitKg*(mat.cpJkgK*(mat.meltK-300)+mat.fusionJkg)/1e6;
  const exposure=cases.map(([z,gamma])=>shellDose(unitKg,radius,area,z,gamma,speed));
  const energy=exposure.map(q=>q.heatMJ),lo=Math.min(...energy),hi=Math.max(...energy);
  rows.push({wbs,item,material:mat.label,count,share,shapeNote,modeledKg,unitKg,betaKgM2:exposure[1].betaKgM2,thresholdMJ,lowHeatMJ:lo,highHeatMJ:hi,
   outcome:hi<thresholdMJ?'Full melting energy unavailable':lo<thresholdMJ?'Sensitive to release case':'Melting energy available'});
 };
 h.propulsion.tanks.forEach((t,i)=>add(['06.03','06.04','06.05'][i],['Fuel vessel','Oxidizer vessel','Helium vessel'][i],'titanium',1,1,t.radiusM,Math.PI*t.radiusM**2,'The dry shell and mount allocation is represented by one empty titanium sphere.'));
 const rotorR=Math.min(...(h.cmg?.mechanismDimsM||[.37,.465,.5]))*.32;
 const rotorUnit=parts['04.01']*.40/4,rotorH=rotorUnit/(7850*Math.PI*rotorR**2);
 add('04.01','Gyro rotors','steel',4,.40,rotorR,Math.PI*rotorR*(rotorR+rotorH)/2,'40% of the cluster mass is assigned to four solid steel rotor proxies. Radius is 32% of the shortest mechanism side. Thickness follows density 7,850 kg/m³.');
 function plate(wbs,name,count,share,length,width){
  // Mean projected area of an isotropically tumbling convex thin plate = S/4.
  add(wbs,name,'aluminum',count,share,Math.sqrt(length*width/Math.PI),length*width*.5,'Each released leaf uses half its planform as mean projected area. Heating radius equals the radius of a disk of the same planform.');
 }
 plate('02.01','Solar substrate leaves',12,.35,h.wingLengthM/3,h.wingWidthM);
 plate('03.01','Radiator panels',6,.65,h.radiatorLengthM/3,h.radiatorWidthM);
 const modeledKg=rows.reduce((sum,r)=>sum+r.modeledKg,0),dryPhysicalKg=h.massLedger.filter(r=>r.group==='Hardware').reduce((a,r)=>a+r.kg,0);
 return {status:'conditional targeted entry',materials,releaseSpeedMs:speed,speedBasis,releaseCases:cases,modeledKg,dryPhysicalKg,unassessedKg:dryPhysicalKg-modeledKg,rows};
}
export function exportMechanical(h,s,phase,context={}){
 const k=sectionPhase(phase),p=stateFor(h,s,k);
 return {frame:'Body-fixed XYZ, origin at bus center, +Z from adapter to fairing tip',pose:massCases[k],elapsedS:s?.t??null,propellantKg:p.remainingKg,adapterAttached:p.adapterAttached,deployment:p.deployment,
  predictedTotalKg:p.massKg,listedPhysicalKg:p.equipmentKg,centerM:p.cm,
  rows:p.rows.map(r=>({wbs:r.wbs,equipmentKg:r.massKg,predictedKg:r.predictedKg,centerM:r.centroidM,stationsM:r.stationsM,stationMassFractions:r.stationShares})),...(phase==='F'?{demisability:demiseScreen(h,s,context)}:{})};
}
const tones=['#85aee3','#a4d779','#dcab7b','#b8a0e7','#8bd5ce','#df9a7d','#95a9b2','#f2ce7d','#aab8c1'];
function projection(h,rows,total,selection,axis){
 const zAxis=axis===2?1:2,a=axis===2?0:axis; // transverse coordinate across the panel; longitudinal Z vertical in side views.
 const label=['X','Y','Z'],dims=[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM],w=300,y=108,pts=[selection.all,...rows.flatMap(r=>r.stationsM)];
 const maxH=Math.max(dims[a]/2,...pts.map(p=>Math.abs(p[a]))),maxV=Math.max(dims[zAxis]/2,...pts.map(p=>Math.abs(p[zAxis])));
 const scale=Math.min(117/Math.max(maxH,.05),76/Math.max(maxV,.05)),cx=w/2,X=v=>cx+v*scale,Y=v=>y-v*scale;
 const box='<rect x="'+X(-dims[a]/2)+'" y="'+Y(dims[zAxis]/2)+'" width="'+dims[a]*scale+'" height="'+dims[zAxis]*scale+'" fill="#253641" stroke="#758b92"/>';
 const dots=rows.map(r=>r.stationsM.map((pt,j)=>'<circle cx="'+X(pt[a])+'" cy="'+Y(pt[zAxis])+'" r="'+(2+Math.min(5,Math.sqrt(r.predictedKg*r.stationShares[j]/Math.max(total,1))*12))+'" fill="'+tones[parseInt(r.wbs)-1]+'" fill-opacity=".77"><title>'+esc(r.item)+' · '+f(r.massKg*r.stationShares[j])+' kg installed · '+vec(pt)+' m</title></circle>').join('')).join('');
 const point=(p,mark)=>p?'<g transform="translate('+X(p[a])+' '+Y(p[zAxis])+')">'+(mark?'<path d="m0-6 6 6-6 6-6-6z" fill="none" stroke="#f3b463" stroke-width="2"/>':'<circle r="5" stroke="white" fill="#10161d"/><path d="M-8 0H8M0-8V8" stroke="white"/>')+'</g>':'';
 return '<svg viewBox="0 0 300 198" role="img" aria-label="'+label[a]+' and '+label[zAxis]+' mounting stations"><text x="10" y="17">'+label[a]+'–'+label[zAxis]+' plane</text>'+box+'<path d="M15 '+y+' H285M'+cx+' 26 V189" stroke="#61747a" stroke-dasharray="2 5"/>'+dots+point(selection.all,false)+point(selection.part,true)+'<text x="277" y="'+(y-5)+'">+'+label[a]+'</text><text x="'+(cx+4)+'" y="29">+'+label[zAxis]+'</text></svg>';
}
function disposal(h,s,context){
 const a=demiseScreen(h,s,context);
 if(a.status==='retirement orbit'&&context?.route?.feasible)return '<section class="panel mech-end"><h3>Graveyard orbit</h3><p>The maneuver ledger gives '+f(context.route.finalPerigeeKm)+' km perigee, '+f(context.route.finalApogeeKm)+' km apogee and '+f(context.route.usedKg)+' kg expended. Mechanical and pressure-vessel masses remain on orbit after retirement.</p></section>';
 if(a.status==='retirement orbit')return '<section class="panel mech-end"><h3>Graveyard orbit</h3><p>Retirement leaves the vehicle on orbit. Review the remaining fuel, pressurant and final center of mass above. '+(s?.disposalStatus==='infeasible'?'The selected design could not complete its planned burn.':'The atmospheric breakup screen applies to targeted reentry.')+'</p></section>';
 if(a.status==='disposal infeasible')return '<section class="panel mech-end"><h3>Disposal burn held</h3><p>The spacecraft did not achieve the targeted entry. The entry component screen requires a feasible return trajectory.</p></section>';
 const details=a.rows.map(r=>'<tr><th>'+r.item+'<small>'+r.material+' · '+r.count+' article'+(r.count===1?'':'s')+'</small></th><td>'+f(r.modeledKg)+'<small>'+f(r.share*100)+'% of '+r.wbs+'</small></td><td>'+f(r.betaKgM2)+'</td><td>'+f(r.thresholdMJ)+'</td><td>'+f(r.lowHeatMJ)+'–'+f(r.highHeatMJ)+'</td><td>'+r.outcome+'</td></tr>').join('');
 return '<section class="panel mech-end"><span class="mel-eyebrow">TARGETED REENTRY · MATERIAL SENSITIVITY</span><h3>Component demisability</h3><p>Does a released component receive enough convective energy to melt? The screen covers <strong>'+f(a.modeledKg)+' kg ('+f(100*a.modeledKg/a.dryPhysicalKg,1)+'%)</strong> of '+f(a.dryPhysicalKg)+' kg of installed dry hardware. '+f(a.unassessedKg)+' kg remains unassessed, including electronics, batteries, fluid lines and unresolved portions of mixed assemblies. Consumable fluids and the launch adapter are outside the dry hardware total.</p><div class="mel-scroll"><table class="mel-table"><thead><tr><th>Article and material proxy</th><th>Screened kg</th><th>Ballistic coefficient · kg/m²</th><th>Energy to melt one · MJ</th><th>Heat exposure per article · MJ</th><th>Thermal screen</th></tr></thead><tbody>'+details+'</tbody></table></div><details><summary>Material, release and heating assumptions</summary><p>Release speed '+f(a.releaseSpeedMs,0)+' m/s · '+a.speedBasis+'. All cases start at 300 K. Release altitude and downward flight angle pairs are 70 km / 8°, 78 km / 5° and 85 km / 2°. Drag coefficient is 1.2. Titanium and steel use 1,940 / 1,750 K melting points, 650 / 600 J/(kg·K) heat capacities and 295 / 270 kJ/kg latent heats. The aluminum surrogate uses 933 K, 900 J/(kg·K) and 397 kJ/kg.</p><p>'+a.rows[0].shapeNote+' '+a.rows[3].shapeNote+' '+a.rows[4].shapeNote+' The 35% solar substrate and 65% radiator metal fractions are study assumptions.</p><p>Convective stagnation heating is integrated over the projected area along a constant-angle, drag-only path until speed falls below 1 km/s. Radiation losses, shielding, interactions, fragmentation and shedding are unresolved. This screening result cannot predict surviving fragment mass, casualties or impact locations. <a href="'+tankLink+'" target="_blank" rel="noopener">NASA tank survivability ↗</a> · <a href="'+heatingLink+'" target="_blank" rel="noopener">NASA heating correlation ↗</a> · <a href="'+methodLink+'" target="_blank" rel="noopener">NASA ORSAT ↗</a> · <a href="https://webbook.nist.gov/cgi/cbook.cgi?ID=C7429905&amp;Mask=2" target="_blank" rel="noopener">NIST aluminum phase data ↗</a></p></details></section>';
}
function stationName(r){
 if(r.stationsM.length===1)return esc(r.item);
 const labels=r.wbs==='06.08'?['Fuel ullage','Oxidizer ullage','Helium bottle']:['01.01','01.02'].includes(r.wbs)?['Port rack group','Starboard rack group']:[];
 return '<details data-station="'+r.wbs+'"><summary>'+esc(r.item)+'</summary><small>'+r.stationsM.map((p,i)=>esc(labels[i]||'Station '+(i+1))+' · '+f(r.massKg*r.stationShares[i])+' kg · '+vec(p)+' m').join('<br>')+'</small></details>';
}
function report(h,s,phase,key,filter){
 const p=stateFor(h,s,key),reg=buildEquipmentList(h,s),meta=new Map(reg.rows.map(r=>[r.wbs,r])),chosen=new Set(filterEquipmentRows(reg.rows,filter).map(r=>r.wbs));
 const rows=p.rows.filter(r=>chosen.has(r.wbs)&&r.massKg>0).map(r=>({...r,item:meta.get(r.wbs).item})),selected=center(rows);
 const z0=h.fairing.stack.find(v=>/insulated bus/i.test(v.part))?.z0M||0;
 const cm=selected.cm;
 const tiles=[['Vehicle center of mass',vec(p.cm)+' m'],['Selected center of mass',cm?vec(cm)+' m':'—'],['Selected equipment',f(rows.reduce((a,r)=>a+r.massKg,0))+' kg'],[p.adapterAttached?'Stack CM above interface':'Remaining propellant',p.adapterAttached?f(z0+h.bodyLengthM*.5+p.cm[2])+' m':f(p.remainingKg)+' kg']];
 return '<div class="mel-cards mech-metrics">'+tiles.map(([l,v])=>'<div><small>'+l+'</small><strong>'+v+'</strong></div>').join('')+'</div><div class="mech-planes">'+[0,1,2].map(a=>projection(h,rows,p.massKg,{all:p.cm,part:cm},a)).join('')+'</div><p class="mech-legend">⊕ Entire vehicle CM &nbsp; <b>◇</b> Filtered CM &nbsp; ● Equipment mass stations &nbsp; ▭ Bus envelope</p>'
 +'<p class="mech-explain">Coordinates are metres from the bus center. +Z points from the adapter toward the fairing tip. Each WBS line contributes mass × position. The model assigns the dry budget allowance proportionally to installed hardware when calculating the predicted vehicle center. Consumables and the detachable adapter retain their own stations.</p>'
 +'<div class="mel-scroll" tabindex="0" aria-label="Filtered mechanical equipment"><table class="mel-table"><thead><tr><th>WBS / component</th><th>Reference model or part</th><th>Physical mass · kg</th><th>X · m</th><th>Y · m</th><th>Z · m</th></tr></thead><tbody>'+rows.map(r=>'<tr><th><small>'+r.wbs+'</small>'+stationName(r)+'</th><td>'+esc(meta.get(r.wbs).referenceModel)+'</td><td>'+f(r.massKg)+'</td>'+r.centroidM.map(v=>'<td>'+f(v,3)+'</td>').join('')+'</tr>').join('')+'</tbody></table>'+(!rows.length?'<p class="mel-none">No installed items match this selection.</p>':'')+'</div>';
}
export function renderMechanical(h,s,phase,context={}){
 const [title,desc]=phaseInfo[phase],key=sectionPhase(phase);
 return '<section class="mel mec" data-mechanical><header class="mel-header"><div><span class="mel-eyebrow">Mechanical design / Phase '+phase+'</span><h2>'+title+'</h2><p>'+desc+'</p></div></header><div class="mel-controls mech-filters"><label>Find component or part<input type="search" data-mech-find placeholder="Name, WBS, supplier or part number"></label><label>Subsystem<select data-mech-sub><option value="">All subsystems</option>'+buildEquipmentList(h).subsystems.map(r=>'<option>'+esc(r.name)+'</option>').join('')+'</select></label><label>Configuration viewed<select data-mech-pose>'+Object.entries(massCases).filter(([v])=>phase==='C'||v===key).map(([v,l])=>'<option value="'+v+'" '+(v===key?'selected':'')+'>'+l+'</option>').join('')+'</select></label></div><div data-mech-report>'+report(h,s,phase,key,{})+'</div></section>'+(phase==='F'?disposal(h,s,context):'');
}
const live=new WeakMap();
export function bindMechanical(container,h,s,phase){
 const el=container?.matches?.('[data-mechanical]')?container:container?.querySelector?.('[data-mechanical]');if(!el||el.dataset.bound)return;
 el.dataset.bound='1';const elFor=key=>el.querySelector('[data-mech-'+key+']'),query=elFor('find'),sub=elFor('sub'),mode=elFor('pose');
 const ctx={h,s,phase};const refresh=()=>{
  const host=elFor('report'),openWB=new Set(Array.from(host.querySelectorAll('details[open]'),e=>e.dataset.station));
  host.innerHTML=report(ctx.h,ctx.s,ctx.phase,mode.value||sectionPhase(ctx.phase),{query:query.value||'',subsystem:sub.value||''});
  for(const detail of host.querySelectorAll('[data-station]'))if(openWB.has(detail.dataset.station))detail.open=true;
 };
 query.addEventListener('input',refresh);sub.addEventListener('change',refresh);mode.addEventListener('change',refresh);live.set(el,{ctx,refresh});
}
export function updateMechanical(container,h,s,phase){
 const el=container?.matches?.('[data-mechanical]')?container:container?.querySelector?.('[data-mechanical]');const state=live.get(el);
 if(state){Object.assign(state.ctx,{h,s,phase});state.refresh()}
}
