import assert from 'node:assert/strict';
import {redwireThermalSourceComparison} from './dist/reference-thermal-comparison.js';

const near=(a,b,tolerance=1e-8)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<tolerance,`${a} != ${b}`);
const comparison=redwireThermalSourceComparison();
assert.equal(comparison.status,'allocated-boundary-comparison');
near(comparison.radiatorPlanformM2,3.25**2);near(comparison.emittingAreaM2,21.125);
assert.deepEqual(comparison.sourceReported.points.map(p=>[p.payloadHeatKW,p.maximumInterfaceC]),[[8,48],[10,66]]);
assert.equal(comparison.sourceReported.busElectricalAllocationKW,2);
for(const [i,point] of comparison.modelResult.entries()){
 near(point.energyResidualKW,0);near(point.internalHeatKW,point.payloadHeatKW);
 near(point.interfaceK-point.radiatorK,point.payloadHeatKW/1.2);
 near(comparison.difference[i].interfaceMinusSourceK,point.interfaceC-comparison.sourceReported.points[i].maximumInterfaceC);
 assert.equal('junctionK' in point,false);assert.equal(point.transportValid,true);
 assert.ok(comparison.busSensitivity.modelResult[i].interfaceK>point.interfaceK);
 near(comparison.busSensitivity.modelResult[i].internalHeatKW,point.payloadHeatKW+2);
 near(comparison.busSensitivity.modelResult[i].energyResidualKW,0);
}
const weaker=redwireThermalSourceComparison({passiveTransportKWK:.6}),emptySky=redwireThermalSourceComparison({meanEarthView:0});
assert.ok(weaker.modelResult[0].interfaceK>comparison.modelResult[0].interfaceK);
assert.ok(emptySky.modelResult[0].radiatorK<comparison.modelResult[0].radiatorK);
const tooSmall=redwireThermalSourceComparison({passiveTransportCapacityKW:7});
assert.ok(tooSmall.modelResult.every(p=>!p.transportValid&&p.transportCapacityMarginKW<0));
assert.throws(()=>redwireThermalSourceComparison({meanEarthView:.8}),RangeError);
assert.match(comparison.evidenceLimit,/not a reproduction or validation/);
assert.match(comparison.sourceReported.temperatureStatistic,/interface/);
assert.ok(comparison.assumptions.some(a=>a.id==='bus-route'&&a.value===0));
console.log('Redwire source thermal comparison: source area/load/interface boundary, energy conservation, bus-route sensitivity, shared transport limits and evidence status verified.');
