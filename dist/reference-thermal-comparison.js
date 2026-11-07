// A reproducible boundary comparison, not a reconstruction of the unpublished
// spatial thermal model. The reported module interface is never a chip junction.
import {passiveThermalDesign,nonFluidTemperatureLadder} from './architecture-thermal.js';

const SIGMA=5.670374419e-8,EARTH_RADIUS_KM=6378.137;
const source=Object.freeze({
 id:'redwire-202605',
 url:'https://rdw.com/wp-content/uploads/2026/05/RDW26-053-ODC-Power-Thermal-Study-White-Paper-R11-Digital.pdf',
 location:'Printed page 9, Figures 7–8; spacecraft electrical allocation on printed page 7',
 altitudeKm:1500,betaDeg:90,radiatorWidthM:3.25,radiatorHeightM:3.25,emittingFaces:2,spreaderAreaM2:1,emissivity:.85,absorptivity:.15,
 busElectricalAllocationKW:2,busHeatRouting:'The source does not specify the fraction of the separate 2 kW spacecraft allocation deposited on this radiator.',
 temperatureStatistic:'Maximum compute-module interface temperature in the source spatial steady-state analysis',
 points:Object.freeze([{payloadHeatKW:8,maximumInterfaceC:48},{payloadHeatKW:10,maximumInterfaceC:66}].map(Object.freeze))
});
const finite=(v,f)=>Number.isFinite(v)?v:f;

export function redwireThermalSourceComparison(options={}){
 const areaM2=source.radiatorWidthM*source.radiatorHeightM,emittingAreaM2=areaM2*source.emittingFaces;
 const maximumMeanEarthView=.5*(EARTH_RADIUS_KM/(EARTH_RADIUS_KM+source.altitudeKm))**2;
 const boundary={
  earthIRWm2:finite(options.earthIRWm2,237),meanEarthView:finite(options.meanEarthView,.25),
  meanAlbedoIrradianceWm2:finite(options.meanAlbedoIrradianceWm2,0),solarIrradianceWm2:1361,
  solarProjectedFraction:finite(options.solarProjectedFraction,0),spaceTemperatureK:finite(options.spaceTemperatureK,3),
  busHeatToPlatformKW:finite(options.busHeatToPlatformKW,0)
 };
 if(boundary.earthIRWm2<0||boundary.meanEarthView<0||boundary.meanEarthView>maximumMeanEarthView||boundary.meanAlbedoIrradianceWm2<0||boundary.solarProjectedFraction<0||boundary.solarProjectedFraction>1||boundary.spaceTemperatureK<0||boundary.busHeatToPlatformKW<0)throw RangeError('Invalid allocated Redwire thermal comparison boundary.');
 const h={input:{architectureFamily:'redwire-platform',passiveTransportKWK:finite(options.passiveTransportKWK,1.2),passiveTransportCapacityKW:finite(options.passiveTransportCapacityKW,12),passiveBusConductanceKWK:finite(options.passiveBusConductanceKWK,.2),radKgM2:3.6,thermalResistanceKPerKw:4},trays:4,radiatorM2:areaM2};
 const t=passiveThermalDesign(h,10);
 if(t.passive.conductanceKWK<=0||t.passive.busConductanceKWK<=0||t.passive.capacityKW<=0)throw RangeError('Positive allocated passive conductance and transport capacity are required.');
 const earthAbsorbedKW=emittingAreaM2*source.emissivity*boundary.earthIRWm2*boundary.meanEarthView/1000;
 const albedoAbsorbedKW=emittingAreaM2*source.absorptivity*boundary.meanAlbedoIrradianceWm2/1000;
 const directSolarAbsorbedKW=areaM2*source.absorptivity*boundary.solarIrradianceWm2*boundary.solarProjectedFraction/1000;
 const absorbedKW=earthAbsorbedKW+albedoAbsorbedKW+directSolarAbsorbedKW,radiationCoefficient=source.emissivity*SIGMA*emittingAreaM2/1000;
 const evaluate=(payloadHeatKW,busHeatToPlatformKW)=>{
  const internalHeatKW=payloadHeatKW+busHeatToPlatformKW;
  const radiatorK=((internalHeatKW+absorbedKW)/radiationCoefficient+(1-boundary.meanEarthView)*boundary.spaceTemperatureK**4)**.25;
  const loopK=radiatorK+busHeatToPlatformKW/t.passive.busConductanceKWK;
  const ladder=nonFluidTemperatureLadder(h,t,{itKW:payloadHeatKW,heatKW:internalHeatKW,radiatorK,loopK,payloadColdK:radiatorK+payloadHeatKW/t.passive.conductanceKWK});
  const netRadiatedKW=radiationCoefficient*(radiatorK**4-(1-boundary.meanEarthView)*boundary.spaceTemperatureK**4)-absorbedKW;
  return {payloadHeatKW,busHeatToPlatformKW,radiatorK,radiatorC:radiatorK-273.15,interfaceK:ladder.payloadColdK,interfaceC:ladder.payloadColdK-273.15,busThermalStoreK:loopK,internalHeatKW,absorbedKW,earthAbsorbedKW,albedoAbsorbedKW,directSolarAbsorbedKW,netRadiatedKW,energyResidualKW:netRadiatedKW-internalHeatKW,transportCapacityMarginKW:t.passive.capacityKW-payloadHeatKW,transportValid:ladder.transportValid,interfaceStatistic:'Lumped spreader hot-interface temperature; spatial maximum unresolved'};
 };
 const modelResult=source.points.map(point=>evaluate(point.payloadHeatKW,boundary.busHeatToPlatformKW));
 const difference=modelResult.map((point,i)=>({payloadHeatKW:point.payloadHeatKW,sourceMaximumInterfaceC:source.points[i].maximumInterfaceC,modelInterfaceC:point.interfaceC,interfaceMinusSourceK:point.interfaceC-source.points[i].maximumInterfaceC}));
 const assumptions=[
  {id:'bus-route',label:'Bus heat deposited on the platform',value:boundary.busHeatToPlatformKW,unit:'kW',basis:'Allocated comparison boundary. Default zero isolates the stated 8/10 kWt payload input; the separate 2 kW bus power is documented, but its thermal route is unpublished.'},
  {id:'earth-ir',label:'Earth longwave radiance equivalent',value:boundary.earthIRWm2,unit:'W/m²',basis:'Project diffuse-Earth flux allocation; not an extracted condition from the source thermal solver.'},
  {id:'earth-view',label:'Mean Earth view across both emitting faces',value:boundary.meanEarthView,unit:'fraction',basis:'Allocated geometry, bounded by '+maximumMeanEarthView.toFixed(4)+' for a planar two-sided panel at 1,500 km. Exact source attitude, obstructions and spatial view factors are unavailable.'},
  {id:'solar',label:'Direct-solar projected fraction',value:boundary.solarProjectedFraction,unit:'fraction of planform',basis:'Default edge-on radiator at the stated beta = 90° reference point. This is a steady orientation allocation, not seasonal continuous-sun certification.'},
  {id:'albedo',label:'Mean albedo irradiance',value:boundary.meanAlbedoIrradianceWm2,unit:'W/m² of emitting area',basis:'Default zero is an idealized terminator boundary. Actual Earth albedo and geometry require a dedicated environmental case.'},
  {id:'space',label:'Deep-space background',value:boundary.spaceTemperatureK,unit:'K',basis:'Allocated black background on the fraction of view outside Earth.'},
  {id:'conductance',label:'Local spreader / heat-pipe conductance',value:t.passive.conductanceKWK,unit:'kW/K',basis:'Same passive transport allocation used by the design model; not fitted to the published temperatures or claimed as Redwire hardware data.'},
  {id:'transport',label:'Local heat-pipe capacity',value:t.passive.capacityKW,unit:'kW',basis:'Same finite transport allocation used by the design model. Detailed heat-pipe network, wick/fluid and capacity evidence remain open.'},
  {id:'interface',label:'Compared temperature',value:'Spreader hot interface',unit:'',basis:'Mapped to the compute-module interface, never to semiconductor junction temperature. Uniform panel and lumped conductance cannot reproduce a reported spatial maximum.'},
  {id:'losses',label:'Additional EPS / harness dissipation',value:0,unit:'kW',basis:'Excluded from this isolated source-load comparison because their deposition into the published thermal figure is unspecified. Full spacecraft analysis retains its electrical and thermal loss ledger.'}
 ];
 return {id:'redwire-thermal-source-point',revision:'odc-reference-thermal-2026-11-r1',status:'allocated-boundary-comparison',sourceReported:source,modelResult,assumptions,difference,boundary,radiatorPlanformM2:areaM2,emittingAreaM2,busSensitivity:{busHeatToPlatformKW:source.busElectricalAllocationKW,modelResult:source.points.map(point=>evaluate(point.payloadHeatKW,source.busElectricalAllocationKW)),basis:'Sensitivity only: routes the full separate 2 kW bus allocation into the shared platform; this route is not established by the source.'},method:'Solve epsilon × sigma × emitting area × (T^4 − space-view × Tspace^4) = payload + allocated bus heat + absorbed environment; interface = radiator + payload / allocated local conductance.',evidenceLimit:'This is a reproducible comparison under declared allocations, not a reproduction or validation of the source spatial model. The source does not provide its full environmental boundary, detailed conductance network, bus heat routing, obstruction model or temperature mesh. Agreement would not qualify the hardware; a difference identifies model and evidence work rather than a source error.'};
}
