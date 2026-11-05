// Only actual flight views get inspection lights. The launch camera also has
// a parked design-reference view at the same mission instant as an orbital pass.
export function orbitalLightingAvailable(camera,s){
 if(!s||s.referenceBody||!(s.altitudeKm>0))return false;
 if(camera==='launch'){
  if(s.flightPhase==='ascent')return s.altitudeKm>=95;
  return ['insertion','commissioning','deorbit','infeasible'].includes(s.flightPhase);
 }
 return s.t>=540&&['spacecraft','core','orbit'].includes(camera);
}

// The camera uses half-stop increments and shares only valid exposure settings.
export function cameraExposure(value){
 const level=Number(value);
 return Number.isFinite(level)?Math.max(-2,Math.min(2,Math.round(level*2)/2)):0;
}
