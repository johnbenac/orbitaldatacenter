// Six-sided dry equipment enclosure. Ports are gasketed, occupied penetrations.
// Internal radiating/cold-plate faces and external radiator banks are separate surfaces.
const SIGMA=5.670374419e-8;
export function sizeEnclosure(d,w,h,l,trays,mounts=[],rack=null){
 const pipe=.052,gland=.036,feed=.065;
 const mapping=[
  ['Port','x',-1,h*l,[gland,gland]],['Starboard','x',1,h*l,[gland,gland]],
  ['Terminal deck','y',1,w*l,[gland,pipe,pipe]],['Service wall','y',-1,w*l,[gland,pipe,pipe]],
  ['Forward equipment bulkhead','z',1,w*h,[]],['Nadir thrust deck','z',-1,w*h,[feed,feed]]
 ];
 const walls=mapping.map(([id,axis,sign,grossAreaM2,portDiametersM])=>{
  const penetrationM2=portDiametersM.reduce((sum,x)=>sum+Math.PI*x*x/4,0),coveredAreaM2=grossAreaM2-penetrationM2;
  return {id,axis,sign,grossAreaM2,coveredAreaM2,penetrationM2,portDiametersM,skinKg:coveredAreaM2*d.skinKgM2,blanketKg:coveredAreaM2*d.blanketKgM2,shieldKg:coveredAreaM2*d.shieldKgM2};
 });
 const sum=key=>walls.reduce((v,row)=>v+row[key],0),grossAreaM2=sum('grossAreaM2'),skinKg=sum('skinKg');
 // Installed-frame study allowance. Areal wall masses above are independent.
 const feet=mounts.flatMap(m=>m.supports),frameStations=[-l/2,...new Set(feet.map(p=>p.foot[2])),l/2];
 const frameMassBreakdown={endFittingsKg:42,longeronsKg:4*l*1.8,transverseFramesKg:2*(w+h)*frameStations.length*1.15,
  hardpointsKg:feet.length*.55,rackMountsKg:1.5*trays};
 const frameKg=Object.values(frameMassBreakdown).reduce((a,b)=>a+b,0);
 const groups=[
  [frameMassBreakdown.endFittingsKg,[[0,0,-l/2],[0,0,l/2]]],
  [frameMassBreakdown.longeronsKg,[-1,1].flatMap(x=>[-1,1].map(y=>[x*w/2,y*h/2,0]))],
  [frameMassBreakdown.transverseFramesKg,frameStations.map(z=>[0,0,z])],
  [frameMassBreakdown.hardpointsKg,feet.map(s=>s.foot)],
  [frameMassBreakdown.rackMountsKg,rack?rack.slots.map(s=>[s.x,s.y,s.z]):[[0,0,0]]]
 ];
 const framePositions=groups.flatMap(([,stations])=>stations),frameShares=groups.flatMap(([kg,stations])=>stations.map(()=>kg/(stations.length*frameKg)));
 return {walls,frameMassBreakdown,framePositions,frameShares,grossAreaM2,coveredAreaM2:sum('coveredAreaM2'),penetrationM2:sum('penetrationM2'),skinKg,blanketKg:sum('blanketKg'),frameKg,shieldKg:sum('shieldKg'),coupledCapacityKJK:(skinKg+.25*frameKg)*.88,innerCoupledFractionFrame:.25,effectiveEmissivity:d.blanketEffectiveEpsilon,exteriorEmissivity:d.blanketOuterEpsilon,exteriorAbsorptivity:d.blanketOuterAlpha,penetrationConductanceWK:d.penetrationWK};
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
