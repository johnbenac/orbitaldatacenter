import {energyRuntime} from './energy-system.js';
import {packStep} from './physics.js';

// Preliminary nominal load allocation: flight service has priority, followed by
// payload. Converter outputs include their downstream harness dissipation.
// Capacity and power deficits are recorded; this function never resizes hardware.
export function dispatchEnergy(h,{solarKW=0,energyKWh=0,availableKWh=h.batteryKWh,endpointServiceKW=0,wantedITKW=0,dtS=60,batteryK=294,loopK=294,radiatorK=294,pumpEnabled=true}={}){
 const d=h.input,e=h.energySystem.electrical,dt=Math.max(1e-6,dtS),hours=dt/3600;
 const wanted=Math.max(0,wantedITKW),service=Math.max(0,endpointServiceKW);
 const at=(it,sf=1,powered=true)=>energyRuntime(h,{loadKW:service+it,itKW:it,batteryK,loopK,radiatorK,pumpEnabled,serviceFraction:sf,powered});
 const requested=at(wanted),chargeLimitKW=e.battery.chargeBusLimitKW,dischargeLimitKW=e.battery.dischargeBusLimitKW;
 const storedSupplyKW=Math.min(dischargeLimitKW,Math.max(0,energyKWh-availableKWh*d.socMin)*d.dischargeEff/hours);
 const wireCapacity=(wire,v)=>wire.count*wire.currentRatingA*v/1000;
 const mainCapacityKW=Math.min(e.distribution.capacityKW,wireCapacity(e.harness.primary,e.family.primaryV));
 const payloadCapacityKW=Math.min(e.payload.capacityKW,wireCapacity(e.harness.payload,e.payload.voltageV));
 const serviceCapacityKW=Math.min(e.service.capacityKW,wireCapacity(e.harness.service,e.service.voltageV));
 const availableBusKW=Math.max(0,Math.min(mainCapacityKW,Math.max(0,solarKW)+storedSupplyKW));
 const valid=r=>r.busLoadKW<=availableBusKW+1e-10&&r.payloadBranchOutputKW<=payloadCapacityKW+1e-10&&r.serviceBranchOutputKW<=serviceCapacityKW+1e-10;
 const bound=(hi,make)=>{let lo=0;for(let i=0;i<32;i++){const mid=(lo+hi)/2;if(valid(make(mid)))lo=mid;else hi=mid;}return lo;};
 let itKW=wanted,serviceFraction=1,runtime=requested;
 if(!valid(runtime)){
  const serviceOnly=at(0);
  if(valid(serviceOnly)){
   itKW=bound(Math.min(wanted,payloadCapacityKW),it=>at(it));runtime=at(itKW);
  }else if(valid(at(0,0))){
   itKW=0;serviceFraction=bound(1,sf=>at(0,sf));runtime=at(0,serviceFraction);
  }else{
   itKW=0;serviceFraction=0;runtime=at(0,0,false);
  }
 }
 const battery=packStep(energyKWh,Math.max(0,solarKW),runtime.busLoadKW,hours,availableKWh*d.socMin,availableKWh*d.socMax,chargeLimitKW,dischargeLimitKW,d.chargeEff,d.dischargeEff);
 // 'Unmet' is the requested bus demand minus the physically admitted demand.
 // The same equality is used by the simulation, plots, MEL and exported ledger.
 const p={...battery,unmet:Math.max(0,requested.busLoadKW-runtime.busLoadKW)+battery.unmet};
 return {requested,runtime,p,itKW,serviceFraction,loadKW:requested.busLoadKW,servedLoadKW:requested.busLoadKW-p.unmet,availableBusKW,chargeLimitKW,dischargeLimitKW,mainCapacityKW,payloadCapacityKW,serviceCapacityKW,capacityLimited:requested.payloadBranchOutputKW>payloadCapacityKW+1e-7||requested.serviceBranchOutputKW>serviceCapacityKW+1e-7||requested.busLoadKW>mainCapacityKW+1e-7};
}
