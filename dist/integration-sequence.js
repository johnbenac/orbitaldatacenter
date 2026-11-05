// Illustrative ground operations on the existing mission clock, seconds from liftoff.
// Real integration can take days. Geometry, playback and milestone selection use the same values.
export const INTEGRATION_TIMES=Object.freeze([-3600,-3000,-2400,-1920,-1500,-960,-660]);
const ramp=(t,start,end)=>{
 const f=Math.min(1,Math.max(0,(t-start)/(end-start)));
 return f*f*(3-2*f);
};
export function integrationState(t){
 const times=INTEGRATION_TIMES;
 let step=0;
 while(step<times.length-1&&t>=times[step+1])step++;
 return {step,progress:Math.min(1,Math.max(0,(t-times[0])/(times[6]-times[0]))),
  seat:ramp(t,times[1],times[2]),close:ramp(t,times[2],times[3]),
  lift:ramp(t,times[3],times[4]),transfer:ramp(t,times[4],times[5]),mate:ramp(t,times[5],times[6])};
}
