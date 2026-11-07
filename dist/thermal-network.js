// The legacy three stores are unchanged. A radiator-mounted payload adds its
// own finite store and capacity-limited passive path. An active heat pump moves
// cold-side heat and adds electrical work at the hot side; exchange terms cancel
// in the total balance, while compressor work remains an external input.
export function stepThermalNetwork({dtS,loopK,radiatorK,batteryK,loopCapacityKJK,radiatorCapacityKJK,batteryCapacityKJK,loopToRadiatorKWK,batteryToLoopKWK,loopHeatKW,radiatorHeatKW,batteryHeatKW,enclosureLeakKW=0,emissionCoeff=0,payloadK,payloadCapacityKJK=0,payloadHeatKW=0,payloadToRadiatorKWK=0,payloadTransportCapacityKW=Infinity,heatPumpColdRemovalKW=0,heatPumpInputKW=0}){
 const dt=Math.max(1e-6,dtS),cl=Math.max(.001,loopCapacityKJK),cr=Math.max(.001,radiatorCapacityKJK),cb=Math.max(.001,batteryCapacityKJK),gl=Math.max(0,loopToRadiatorKWK),gb=Math.max(0,batteryToLoopKWK),k=Math.max(0,emissionCoeff);
 const hasPayload=Number.isFinite(payloadK)&&payloadCapacityKJK>0,cp=hasPayload?Math.max(.001,payloadCapacityKJK):0,gp=hasPayload?Math.max(0,payloadToRadiatorKWK):0,powerPayload=hasPayload?payloadHeatKW:0;
 const qp=Math.max(0,heatPumpColdRemovalKW),wp=Math.max(0,heatPumpInputKW),hotPumpKW=qp+wp;
 const ge=gb/(1+dt*gb/cb),a=cl/dt+gl+ge,rhs=cl/dt*loopK+loopHeatKW-qp-enclosureLeakKW+ge*(batteryK+dt*batteryHeatKW/cb);
 const payloadAt=r=>{
  if(!hasPayload)return {temperatureK:null,heatKW:0,derivative:0};
  const thermalRate=cp/dt,unlimited=gp*((thermalRate*payloadK+powerPayload)/(thermalRate+gp)-thermalRate*r/(thermalRate+gp)),cap=Math.max(0,payloadTransportCapacityKW),q=Math.max(-cap,Math.min(cap,unlimited));
  return {temperatureK:(thermalRate*payloadK+powerPayload-q)/thermalRate,heatKW:q,derivative:Math.abs(unlimited)<cap?-gp*thermalRate/(thermalRate+gp):0};
 };
 let r=Math.max(3,radiatorK),l=loopK;
 for(let i=0;i<24;i++){
  l=(rhs+gl*r)/a;
  const p=payloadAt(r),residual=cr/dt*(r-radiatorK)-radiatorHeatKW-hotPumpKW-gl*(l-r)-p.heatKW+k*r**4;
  const derivative=cr/dt+gl-gl*gl/a-p.derivative+4*k*r**3,next=Math.max(3,r-residual/derivative);
  if(Math.abs(next-r)<1e-9){r=next;break;}r=next;
 }
 l=(rhs+gl*r)/a;
 const b=(batteryK+dt*(batteryHeatKW+gb*l)/cb)/(1+dt*gb/cb),p=payloadAt(r),packToLoopKW=gb*(b-l),loopToRadiatorKW=gl*(l-r)+qp,grossEmissionKW=k*r**4;
 const storedKW=(cl*(l-loopK)+cr*(r-radiatorK)+cb*(b-batteryK)+(hasPayload?cp*(p.temperatureK-payloadK):0))/dt;
 const suppliedKW=loopHeatKW+radiatorHeatKW+batteryHeatKW+powerPayload+wp-enclosureLeakKW-grossEmissionKW;
 return {loopK:l,radiatorK:r,batteryK:b,payloadK:p.temperatureK,payloadToRadiatorKW:p.heatKW,payloadTransportSaturated:hasPayload&&Math.abs(p.heatKW)>=payloadTransportCapacityKW-1e-9,packToLoopKW,loopToRadiatorKW,heatPumpColdRemovalKW:qp,heatPumpInputKW:wp,heatPumpHotRejectionKW:hotPumpKW,grossEmissionKW,storedKW,residualKW:storedKW-suppliedKW};
}
