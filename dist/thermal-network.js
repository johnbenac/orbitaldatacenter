// Three finite thermal stores. The fluid/equipment node exchanges heat with the
// battery and radiator; only the radiator emits to space. All exchange terms
// cancel exactly in the total energy balance. Radiation is solved implicitly.
export function stepThermalNetwork({dtS,loopK,radiatorK,batteryK,loopCapacityKJK,radiatorCapacityKJK,batteryCapacityKJK,loopToRadiatorKWK,batteryToLoopKWK,loopHeatKW,radiatorHeatKW,batteryHeatKW,enclosureLeakKW=0,emissionCoeff=0}){
 const dt=Math.max(1e-6,dtS),cl=Math.max(.001,loopCapacityKJK),cr=Math.max(.001,radiatorCapacityKJK),cb=Math.max(.001,batteryCapacityKJK),gl=Math.max(0,loopToRadiatorKWK),gb=Math.max(0,batteryToLoopKWK),k=Math.max(0,emissionCoeff);
 const ge=gb/(1+dt*gb/cb),a=cl/dt+gl+ge,rhs=cl/dt*loopK+loopHeatKW-enclosureLeakKW+ge*(batteryK+dt*batteryHeatKW/cb);
 let r=Math.max(3,radiatorK),l=loopK;
 for(let i=0;i<24;i++){
  l=(rhs+gl*r)/a;
  const residual=cr/dt*(r-radiatorK)-radiatorHeatKW-gl*(l-r)+k*r**4;
  const derivative=cr/dt+gl-gl*gl/a+4*k*r**3,next=Math.max(3,r-residual/derivative);
  if(Math.abs(next-r)<1e-9){r=next;break;}r=next;
 }
 l=(rhs+gl*r)/a;
 const b=(batteryK+dt*(batteryHeatKW+gb*l)/cb)/(1+dt*gb/cb),packToLoopKW=gb*(b-l),loopToRadiatorKW=gl*(l-r),grossEmissionKW=k*r**4;
 const storedKW=(cl*(l-loopK)+cr*(r-radiatorK)+cb*(b-batteryK))/dt;
 const suppliedKW=loopHeatKW+radiatorHeatKW+batteryHeatKW-enclosureLeakKW-grossEmissionKW;
 return {loopK:l,radiatorK:r,batteryK:b,packToLoopKW,loopToRadiatorKW,grossEmissionKW,storedKW,residualKW:storedKW-suppliedKW};
}
