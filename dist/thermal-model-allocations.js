// Preliminary analysis properties belong to the identified article scope.
// They do not add mass to the MEL, establish supplier ratings or close evidence.
import {buildEquipmentList} from './equipment-list.js';

export const thermalModelAllocationRevision='thermal-properties-2026-11-r4';
const source=(id,title,url,section)=>({id,title,url,section});
export const thermalModelAllocationSources={
 'th-model-properties':source('th-model-properties','ODC thermal property and test-boundary allocations','https://orbital-data-center-lab.kda44d.chatgpt.site/thermal-allocation-basis.html#model-properties','Reduced-order property register and equations'),
 'th-nist-aluminum':source('th-nist-aluminum','NIST aluminum solid heat capacity','https://webbook.nist.gov/cgi/cbook.cgi?ID=C7429905&Units=SI&Mask=2','Solid phase thermochemistry; nominal alloy properties remain a project estimate'),
 'th-nist-copper':source('th-nist-copper','NIST copper solid heat capacity','https://webbook.nist.gov/cgi/cbook.cgi?ID=C7440508&Units=SI&Mask=2','Solid phase thermochemistry'),
 'th-nist-titanium':source('th-nist-titanium','NIST titanium solid heat capacity','https://webbook.nist.gov/cgi/cbook.cgi?ID=C7440326&Units=SI&Mask=2','Solid phase thermochemistry'),
 'th-nist-steel':source('th-nist-steel','NIST 304 stainless steel material properties','https://trc.nist.gov/cryogenics/materials/304Stainless/304Stainless_rev.htm','Specific heat; constant near-room-temperature reduction is a project estimate'),
 'th-mmh-properties':source('th-mmh-properties','NOAA CHRIS — monomethylhydrazine','https://cameochemicals.noaa.gov/chris/MHZ.pdf','Liquid specific heat near room temperature'),
 'th-nto-properties':source('th-nto-properties','NOAA CHRIS — nitrogen tetroxide','https://cameochemicals.noaa.gov/chris/NOX.pdf','Liquid specific heat; MON mixture reduction remains inferred'),
 'th-hydrazine-properties':source('th-hydrazine-properties','NOAA CHRIS — hydrazine','https://cameochemicals.noaa.gov/chris/HDZ.pdf','Liquid specific heat; component of equal-mass Aerozine-50 estimate'),
 'th-udmh-properties':source('th-udmh-properties','NOAA CHRIS — unsymmetrical dimethylhydrazine','https://cameochemicals.noaa.gov/chris/DMH.pdf','Liquid specific heat; component of equal-mass Aerozine-50 estimate'),
 'th-helium-properties':source('th-helium-properties','NIST-JANAF — helium gas heat capacity','https://janaf.nist.gov/tables/He-001.html','Ideal monatomic gas; closed rigid vessel uses cv = (cp − R) / molar mass'),
 'th-kapton':source('th-kapton','DuPont Kapton HN data sheet','https://www.dupont.com/content/dam/dupont/amer/us/en/ei-transformation/public/documents/en/EI-10206-Kapton-HN-Data-Sheet.pdf','Typical specific heat 1.09 J/(g·K); not a blanket-level measured property'),
 'th-sodern-hydra':source('th-sodern-hydra','Sodern HYDRA star tracker','https://sodern.com/en/ranges/hydra','Sensor architecture context; the 12 W local suite heat allowance is a project allocation')
};
const finite=Number.isFinite,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),sum=a=>a.reduce((a,b)=>a+b,0);
const flightRows=new Set('01.01 01.02 01.03 01.04 02.01 02.02 02.03 03.01 03.02 03.03 04.01 04.02 04.03 05.01 05.02 05.03 06.01 06.02 06.03 06.04 06.05 06.06 06.07 06.08 07.01 07.02 07.03 07.04 07.05 08.01 09.01'.split(' '));
const materialProperties={
 'aluminum-structure':[900,2700,.2,.2,'th-nist-aluminum'],
 'aluminum-anodized':[900,2700,.8,.3,'th-nist-aluminum'],
 'black-anodized-aluminum':[900,2700,.8,.8,'th-nist-aluminum'],
 'aluminum-honeycomb':[900,80,.2,.2,'th-nist-aluminum'],
 'copper-thermal':[385,8960,.1,.3,'th-nist-copper'],
 'gold-plated-contact':[385,8960,.05,.3,'th-nist-copper'],
 'titanium-tank':[520,4500,.3,.4,'th-nist-titanium'],
 'stainless-tube':[500,8000,.3,.4,'th-nist-steel'],
 'electronics-board':[900,1850,.85,.6],
 'pv-multijunction':[500,5300,.85,.9],
 'pv-silicon':[700,2330,.85,.9],
 'coverglass':[750,2500,.85,.1],
 'optical-glass':[750,2500,.85,.1],
 'solar-blanket-backing':[1090,1420,.8,.4,'th-kapton'],
 'mli-aluminized-polyimide':[1090,1420,.03,.15,'th-kapton'],
 'harness-polyimide':[1090,1420,.8,.4,'th-kapton'],
 'white-beta-cloth':[800,1500,.85,.2],
 'cfrp-boom':[800,1600,.8,.8],
 'copv-carbon':[800,1600,.8,.8],
 'radiator-osr':[750,2500,.85,.08],
 'radiator-white-paint':[1000,1500,.9,.2],
 'rf-dielectric':[1000,1850,.8,.4],
 'unresolved-dielectric':[1000,1850,.8,.4],
 'refractory-nozzle':[500,8200,.8,.8]
};
const detailShares={
 'cold-plate':.30,'compute-board':.60,'compute-chassis':.80,'electronics-case':.30,
 'solar-boom':.15,'battery-case':.15,'electrical-busbar':.08,'radiator-face-sheet':.35,
 'radiator-core':.20,'radiator-passage':.25,'coolant-tube':.25,'passive-heat-pipe':.60,
 'heat-pump-case':.20,'attitude-hardware':.75,'magnetic-rod':.65,'electrical-winding':.30,
 'rf-radome':.20,'rf-reflector':.50,'optical-support':.20,'sensor-baffle':.05,
 'optical-housing':.30,'nozzle':.70,'propellant-feed':.70,'propellant-tank':.85,
 'pressurant-tank':.85,'primary-frame':.80,'launch-interface':.15,
 'enclosure-face-sheet':.70,'sandwich-core':.25,'deployment-hardware':.80,'harness':.70
};
const couponRoles=new Set(['solar-active','solar-coverglass','solar-backing','radiator-finish','mli-outer','mli-white-outer','mli-inner','rf-contact','optical-aperture','feedthrough-seal','radiation-shield']);
const couponMaterials=new Set(['radiator-white-paint','radiator-osr','mli-aluminized-polyimide','harness-polyimide','solar-blanket-backing','white-beta-cloth','coverglass']);
const groundProfile={
 checkout:'instrument',compute:'rack',data:'rack',power:'power',thermal:'fluid',attitude:'instrument',propulsion:'fluid',mass:'bench',alignment:'instrument',fit:'bench',adapter:'bench',environment:'instrument',orbit:'instrument',avionics:'instrument',rf:'instrument','rf-ka':'instrument','rf-optical':'instrument','propellant-loading':'fluid',
 facility:'facility','checkout-stand':'bench','adapter-stand':'bench','bridge-crane':'passive','crane-hoist':'passive','lifting-yoke':'passive','lifting-frame':'passive','receiving-cradle':'bench','gse-storage':'rack','fairing-carrier':'bench','transfer-support':'bench','cargo-load-bridge':'passive','cooling-pump':'fluid','cooling-reservoir':'fluid','heat-exchanger':'fluid','power-converter':'power','alignment-telescope':'instrument','rf-test-hat':'instrument','ka-test-port':'instrument','optical-test-head':'instrument'
};
const providerIds=new Set('vehicle core core-engines upper upper-engines fairing fairing-shells payload-bay payload-doors booster landing-legs grid-fins cargo-door cargo-carriage cargo-tracks body-flaps'.split(' '));
const siteProfile={'launch-position':'facility','launch-table':'civil',restraints:'passive','exhaust-path':'civil','pad-support':'civil','water-supply':'pipe','lightning-protection':'passive','commodity-services':'pipe','utility-distribution':'power'};
const profiles={
 rack:{mass:30,cp:900,area:1.5,load:100,scope:'Representative equipment rack module'},
 instrument:{mass:5,cp:900,area:.3,load:40,scope:'Representative checkout instrument'},
 power:{mass:25,cp:900,area:1.5,load:200,scope:'Representative power-service module'},
 fluid:{mass:15,cp:500,area:1,load:50,scope:'Representative closed fluid-conditioning hardware segment'},
 bench:{mass:100,cp:500,area:4,load:0,scope:'Representative integration fixture segment'},
 passive:{mass:10,cp:500,area:1,load:0,scope:'Representative passive support hardware segment'},
 facility:{mass:1000,cp:880,area:20,load:200,scope:'Representative facility envelope and services segment'},
 provider:{mass:100,cp:900,area:5,load:0,scope:'Representative launch-provider structural interface segment'},
 connector:{mass:.5,cp:500,area:.04,load:0,scope:'Representative umbilical connector and local mounting'},
 pipe:{mass:10,cp:500,area:.5,load:0,scope:'Representative service-pipe hardware segment'},
 civil:{mass:1000,cp:880,area:10,load:0,scope:'Representative civil-structure surface segment'}
};
function nonflightProfile(r){
 const short=r.id.split(':').slice(1).join(':');
 if(r.category==='ground')return groundProfile[short];
 if(r.render?.connectionId||short.startsWith('connection-'))return 'connector';
 if(r.render?.umbilicalGroup||short.startsWith('umbilical-'))return 'pipe';
 if(r.category==='launch'&&(providerIds.has(short)||/^booster(?:-\d+)?(?:-engines)?$/.test(short)))return 'provider';
 if(r.category==='site')return siteProfile[short]||(/^commodity-(?:lox|lng|lh2|rp1|kerosene|nitrogen|n2|helium|he|hydrogen|methane)$/.test(short)?'pipe':null);
 return null;
}
export function thermalModelAllocation(record,hardware,{parentRecord=null}={}){
 const r=record||{},h=hardware||{},d=h.input||{},t=h.energySystem?.thermal||{},e=h.enclosure||{};
 const values={},fieldMeta={},sourceIds=['th-model-properties','th-nasa-guide'],assumptions=[];
 const out={revision:thermalModelAllocationRevision,itemId:r.id,profileId:'unallocated',coverage:'unallocated',values,fieldMeta,sourceIds,assumptions,scope:'Article scope requires allocation',articleKind:'unallocated',externalExposure:false};
 const set=(key,value,basis,ids=[],status='engineering-estimate')=>{values[key]=value;fieldMeta[key]={status,basis,sourceIds:[...new Set(['th-model-properties',...ids])]};sourceIds.push(...ids);};
 const addCommon=()=>{
  if(!finite(values.conductanceWPerK)){
   const contactArea=Math.max(.0002,(values.areaM2||0)*.02),g=Math.max(.05,250*contactArea,(values.loadW||0)/5);
   set('conductanceWPerK',g,'Preliminary mounting path: max(0.05 W/K, 250 W/(m²·K) × 2% of exposed area with 2 cm² minimum contact, dissipated heat / 5 K). The 250 coefficient is a nominal contact estimate; the 5 K design budget is project judgment. Characterize the actual joint and fixture.',['th-nasa-guide']);
  }
  set('fixtureCapacityJPerK',clamp(values.massKg*.1,.05,100)*900,'Aluminum fixture mass is 10% of the scoped article, bounded to 0.05–100 kg, at 900 J/(kg·K). This is an explicit temporary-fixture allocation.',['th-nist-aluminum']);
  set('fixtureConductanceWPerK',Math.max(1,5*values.conductanceWPerK),'Fixture conditioning conductance is five times article contact conductance, with 1 W/K minimum. This is a planning boundary for an actively conditioned fixture.');
  set('convectionWPerM2K',5,'5 W/(m²·K) is a still-air planning coefficient, active only in atmospheric/installed-environment cases. Vacuum cases exclude convection.',['th-nasa-guide']);
  assumptions.push('Thermal optical coefficients and equivalent heat capacity are analysis allocations, independent of the display material. They require characterization and correlation before hardware verification.');
  out.sourceIds=[...new Set(sourceIds)];out.coverage=Object.values(values).every(finite)&&values.massKg>0&&values.specificHeatJPerKgK>0?'explicit':'unallocated';return out;
 };
 if(r.electricalThermalModel){
  const model=r.electricalThermalModel;out.profileId='electrical-'+model.kind;out.articleKind=model.kind;out.scope=model.scope;out.externalExposure=model.kind==='antenna';
  for(const key of ['massKg','specificHeatJPerKgK','areaM2','loadW','emissivity','absorptivity'])if(finite(model[key]))set(key,model[key],model.basis,['th-nasa-guide']);
  assumptions.push('The electrical article uses its explicitly declared mass, route/envelope and dissipation. It is not silently replaced by a100mm coupon or by the entire parent allocation.','Route-derived material mass and retained resource allocation can differ; this physical prediction preserves the independent estimate and does not change spacecraft mass totals.');
  return addCommon();
 }
 if(r.category!=='flight'){
  const key=nonflightProfile(r),p=profiles[key];if(!p){assumptions.push('No registered equipment/interface property profile exists for this item.');return out;}
  out.profileId='interface-'+key;out.articleKind='representative-interface';out.scope=p.scope+'; not the complete launcher or facility';
  for(const [id,val] of [['massKg',p.mass],['specificHeatJPerKgK',p.cp],['areaM2',p.area],['loadW',p.load],['emissivity',.8],['absorptivity',.3]])set(id,val,'Project '+key+' interface model: '+p.mass+' kg, '+p.area+' m², '+p.load+' W. Properties describe only the stated representative segment, not a supplier-certified or whole-system model.',id==='specificHeatJPerKgK'?(p.cp===900?['th-nist-aluminum']:p.cp===500?['th-nist-steel']:[]):[]);
  assumptions.push('Provider drawings, detailed geometry, commodity flow and operational loads are not established. This identified local segment permits environmental sensitivity studies without assigning a whole launcher or facility an invented mass.','Pipe/commodity interfaces model dry surrounding hardware. Cryogenic boiling, pressure, fluid phase change, propulsion combustion and exhaust are outside this model.');
  return addCommon();
 }
 const rows=buildEquipmentList(h).rows,w=(r.wbs||r.id?.slice(7)||'').split('.').slice(0,2).join('.'),row=rows.find(x=>x.wbs===w);
 if(!row||!flightRows.has(w)){assumptions.push('No registered MEL thermal property allocation exists for this item.');return out;}
 const detail=r.massAccounting==='included-in-parent'||(r.wbs||'').split('.').length>2;
 const box=Array.isArray(row.dimensionsM)&&row.dimensionsM.length===3?2*(row.dimensionsM[0]*row.dimensionsM[1]+row.dimensionsM[0]*row.dimensionsM[2]+row.dimensionsM[1]*row.dimensionsM[2])*Math.max(1,row.quantity):null;
 let area=box,cp=900,eps=.8,alpha=.2,cpSource=['th-nist-aluminum'],areaBasis='Sum of exposed faces of the allocated MEL equipment envelope × row quantity; attachment occlusion and local shadowing are unresolved.';
 if(w==='02.01'){cp=800;cpSource=[];area=2*h.solarM2;eps=.85;alpha=.9;areaBasis='Two faces of installed photovoltaic blanket area from the active design; equivalent laminate heat capacity is a project estimate.';}
 if(w==='02.02'){cp=d.packHeatKJkgK*1000;cpSource=['th-workbench'];}
 if(w==='03.01'){area=finite(h.radiatorEmissionAreaM2)?h.radiatorEmissionAreaM2:2*h.radiatorM2;eps=d.emissivity;alpha=d.absorptivity;areaBasis=finite(h.radiatorEmissionAreaM2)?'Remaining two-sided radiator material after the hinge relief, less the union of opaque front-side equipment and cable-installation footprints. Open ladder gaps remain exposed; no radiator-finish credit is assigned to the obstructing hardware.':'Two radiating faces of the active radiator planform; selected thermal finish from the active architecture.';}
 if(w==='03.02'){cp=t.loopHardwareCapacityKJK>0?t.loopHardwareCapacityKJK*1000/row.extendedMassKg:900;cpSource=['th-workbench'];area=2*row.extendedMassKg/(8000*.0015);areaBasis='Equivalent two-sided 1.5 mm stainless tube-wall area from allocated transport hardware mass, not the spacecraft bounding box.';}
 if(w==='03.03'||w==='07.02'||w==='07.03'){area=e.coveredAreaM2;areaBasis='Covered enclosure wall area from the active design, rather than a solid distributed-installation box.';if(w==='03.03'){eps=e.exteriorEmissivity;alpha=e.exteriorAbsorptivity;}if(w==='07.03'){cp=520;cpSource=['th-nist-titanium'];}}
 if(w==='06.02'){area=2*row.extendedMassKg/(8000*.0015);cp=500;cpSource=['th-nist-steel'];areaBasis='Equivalent two-sided 1.5 mm stainless feed-system wall area; the routed installation bounding box is not a solid article.';}
 if(w==='06.03'||w==='06.04'){cp=520;cpSource=['th-nist-titanium'];area=Math.PI*(row.dimensionsM?.[0]||0)**2;areaBasis='Spherical installed vessel surface from its allocated diameter.';}
 if(w==='06.05'){cp=800;cpSource=[];area=Math.PI*(row.dimensionsM?.[0]||0)**2;areaBasis='Spherical bottle surface from its allocated diameter; equivalent carbon-overwrap/liner capacity is inferred.';}
 if(w==='07.01'){area=2*row.extendedMassKg/(2700*.004);areaBasis='Equivalent two-sided 4 mm aluminum structural wall area from allocated mass; not the full distributed bounding box.';}
 if(w==='07.04'){area=6*(row.extendedMassKg/2700)**(2/3);areaBasis='Equivalent compact aluminum mechanism area derived from allocated mass; actual bearings, gears and flexible contacts are unresolved.';}
 if(w==='07.05'){area=4*row.extendedMassKg/(3500*.012);cp=600;cpSource=[];areaBasis='Equivalent 12 mm diameter distributed cable with 3500 kg/m³ bulk conductor/insulation density; surface = 4m/(ρd).';}
 out.profileId='mel-'+w;out.scope='Complete selected MEL row plus mounting interface';out.articleKind='mel-row';out.externalExposure=['02.01','03.01','03.03','05.01','05.02','05.03','06.01'].includes(w);
 let mass=row.extendedMassKg,load=row.operatingPowerW,loadBasis='Dissipated operating watts allocated to this MEL row in the active design; not an extra load added to the spacecraft budget.';
 if(w==='04.03'&&!finite(load)){load=12;loadBasis='12 W preliminary attitude-sensor suite allocation within the existing auxiliary-power budget; not an additional spacecraft load or a published HYDRA rating.';sourceIds.push('th-sodern-hydra');}
 if(w==='02.02'){load=h.itKw*1000*(1/d.dischargeEff-1);loadBasis='Representative pack discharge loss: selected IT load × (1/discharge efficiency − 1). This is not electrochemistry or thermal-runaway simulation.';}
 if(['06.06','06.07','06.08'].includes(w)){
  const alternate=d.engine!=='mmh';cp=w==='06.08'?3116:w==='06.07'?1600:2900;area=0;eps=0;alpha=0;load=0;out.articleKind='contained-inventory';out.scope='Contained inventory and a prescribed vessel interface';out.externalExposure=false;
  cpSource=w==='06.08'?['th-helium-properties']:w==='06.07'?['th-nto-properties']:alternate?['th-hydrazine-properties','th-udmh-properties']:['th-mmh-properties'];
  areaBasis='Contained fluid has no direct exposed radiating area. Heat crosses an allocated vessel interface; no bare-fluid vacuum article is implied.';
  set('conductanceWPerK',Math.max(1,.5*mass),'Preliminary contained inventory-to-vessel conductance: 0.5 W/(kg·K) × inventory mass, with 1 W/K minimum. This is an explicit wall-coupling sensitivity allocation, not a resolved fluid film or mixing model.');
  assumptions.push(w==='06.08'?'Closed rigid helium bottle uses ideal-gas cv ≈3116 J/(kg·K), not constant-pressure cp. Real-gas pressure/work effects are unresolved.':w==='06.07'?'1600 J/(kg·K) is a rounded liquid NTO/MON estimate. The reduced model does not resolve freezing, evaporation or mixture composition.':alternate?'2900 J/(kg·K) is an explicitly estimated equal-mass hydrazine/UDMH heat-capacity average for Aerozine-50.':'2900 J/(kg·K) is a rounded near-room-temperature liquid MMH estimate.');
 }
 if(detail){
  const material=r.materials?.[0]?.id,materialP=materialProperties[material],role=r.render?.roles?.[0]||({'02.01.02':'solar-coverglass','03.03.03':'mli-inner','07.03.01':'radiation-shield','09.01.01':'launch-interface'}[r.wbs]);
  if(!materialP){assumptions.push('No registered material property model exists for this detail.');return out;}
  [cp,,eps,alpha]=materialP;cpSource=materialP[4]?[materialP[4]]:[];load=0;loadBasis='Unpowered isolated detail; no parent electronics or survival-heater dissipation is silently inherited.';out.externalExposure=['solar-active','solar-coverglass','solar-backing','radiator-finish','mli-outer','mli-white-outer','rf-reflector','optical-aperture','optical-housing','nozzle'].includes(role);
  if(couponRoles.has(role)||couponMaterials.has(material)||!role||!Object.hasOwn(detailShares,role)){
   const thickness=/mli|polyimide|backing/.test(material)?.00005:/paint/.test(material)?.0001:/glass|osr/.test(material)?.00015:.001;
   mass=.1*.1*thickness*materialP[1];area=.02;out.articleKind='representative-coupon';out.profileId='coupon-'+material;out.scope='Representative 100 × 100 mm '+material+' coupon, '+(thickness*1000)+' mm thick';
   areaBasis='Two exposed faces of the explicitly scoped 100 × 100 mm coupon; it does not stand in for the full parent mass.';
   assumptions.push('The surrounding 3D assembly is context. The numerical article is the stated coupon with allocated density and thickness; coating, substrate, adhesive and through-thickness gradients require a detailed correlated model.');
  }else{
   const share=detailShares[role];mass=row.extendedMassKg*share;area=finite(area)?area*share:null;out.articleKind='isolated-detail';out.profileId='detail-'+role;out.scope='Isolated '+(r.title||role)+' detail within the selected parent MEL row';
   assumptions.push('Detail thermal mass and area use an explicit '+(100*share)+'% participation of the active parent row. This analysis partition does not create an additional MEL mass or establish separate supplier capability.');
   areaBasis+=' Detail participation is '+(100*share)+'% of that parent analysis area.';
  }
 }
 set('massKg',mass,detail?'Mass of the explicitly scoped isolated detail or coupon, using the stated partition/density/thickness; parent mass is not duplicated.':'Active MEL extended mass, including the allocated quantity.',['th-workbench'],detail?'engineering-estimate':'design-derived');
 set('specificHeatJPerKgK',cp,'Constant equivalent specific heat for the stated '+out.articleKind+'. '+(cpSource.length?'Referenced material/active-design context is rounded for a reduced model.':'A project estimate for this mixed or uncharacterized material; supplier data and temperature dependence remain to be established.'),cpSource);
 set('areaM2',area,areaBasis,['th-workbench'],'design-derived');set('loadW',load,loadBasis,['th-workbench'],detail?'engineering-estimate':'design-derived');
 set('emissivity',eps,'IR emittance of the stated analysis surface; active radiator/blanket finish where allocated, otherwise an explicit material-family study estimate.',['th-nasa-guide']);
 set('absorptivity',alpha,'Solar absorptance of the stated analysis surface; active radiator/blanket finish where allocated, otherwise an explicit material-family study estimate.',['th-nasa-guide']);
 if(!detail&&w==='02.02')set('conductanceWPerK',mass*d.packCouplingWKkg,'Active pack-to-structure coupling × installed pack mass.',['th-workbench'],'design-derived');
 if(!detail&&w==='01.01')set('conductanceWPerK',Math.max(1,h.trays)*1000/Math.max(.01,t.junctionToColdPlateKPerKWPerTray||d.thermalResistanceKPerKw),'Active tray count divided by the allocated junction-to-cold-plate thermal resistance.',['th-workbench'],'design-derived');
 assumptions.push('The model contains a single lumped article store and a finite mounting-interface store. Internal gradients, local electronics hotspots and temperature-dependent material properties are unresolved.');
 return addCommon();
}
