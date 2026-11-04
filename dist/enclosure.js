// Six-sided dry equipment enclosure. Ports are gasketed, occupied penetrations.
// Internal radiating/cold-plate faces and external radiator banks are separate surfaces.
const SIGMA=5.670374419e-8;
export function sizeEnclosure(d,w,h,l,trays){
 const pipe=.052,gland=.036,feed=.065;
 const mapping=[
  ['Port','x',-1,h*l,[gland,gland]],['Starboard','x',1,h*l,[gland,gland]],
  ['Zenith deck','y',1,w*l,[gland]],['Thrust deck','y',-1,w*l,[gland,feed,feed]],
  ['Forward bulkhead','z',1,w*h,[pipe,pipe]],['Aft bulkhead','z',-1,w*h,[pipe,pipe]]
 ];
 const walls=mapping.map(([id,axis,sign,grossAreaM2,portDiametersM])=>{
  const penetrationM2=portDiametersM.reduce((sum,x)=>sum+Math.PI*x*x/4,0),coveredAreaM2=grossAreaM2-penetrationM2;
  return {id,axis,sign,grossAreaM2,coveredAreaM2,penetrationM2,portDiametersM,skinKg:coveredAreaM2*d.skinKgM2,blanketKg:coveredAreaM2*d.blanketKgM2,shieldKg:coveredAreaM2*d.shieldKgM2};
 });
 const sum=key=>walls.reduce((v,row)=>v+row[key],0),grossAreaM2=sum('grossAreaM2'),skinKg=sum('skinKg'),frameKg=42+grossAreaM2*3.6+1.5*trays;
 return {walls,grossAreaM2,coveredAreaM2:sum('coveredAreaM2'),penetrationM2:sum('penetrationM2'),skinKg,blanketKg:sum('blanketKg'),frameKg,shieldKg:sum('shieldKg'),coupledCapacityKJK:(skinKg+.25*frameKg)*.88,innerCoupledFractionFrame:.25,effectiveEmissivity:d.blanketEffectiveEpsilon,exteriorEmissivity:d.blanketOuterEpsilon,exteriorAbsorptivity:d.blanketOuterAlpha,penetrationConductanceWK:d.penetrationWK};
}

export function enclosureHeat(e,interiorK,outerK){
 const blanketKW=e.effectiveEmissivity*SIGMA*e.coveredAreaM2*(interiorK**4-outerK**4)/1000;
 const bridgeKW=e.penetrationConductanceWK*(interiorK-outerK)/1000;
 return {blanketKW,bridgeKW,outwardKW:blanketKW+bridgeKW};
}

export function solveOuter(e,interiorK,incidentSolarWm2,incidentIRWm2){
 const area=e.coveredAreaM2,absorption=area*(e.exteriorAbsorptivity*incidentSolarWm2+e.exteriorEmissivity*incidentIRWm2);
 const c=SIGMA*area*(e.exteriorEmissivity+e.effectiveEmissivity),g=e.penetrationConductanceWK;
 const rhs=absorption+e.effectiveEmissivity*SIGMA*area*interiorK**4+g*interiorK+e.exteriorEmissivity*SIGMA*area*3**4;
 let outerK=Math.max(3,(rhs/c)**.25);
 for(let n=0;n<4;n++)outerK-=(c*outerK**4+g*outerK-rhs)/(4*c*outerK**3+g);
 return {outerK,...enclosureHeat(e,interiorK,outerK)};
}
