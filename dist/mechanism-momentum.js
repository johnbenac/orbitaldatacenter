// Relative angular momentum from prescribed mechanism encoders. A small
// backward geometry probe evaluates the local velocity at the current pose.
// Motor elasticity and detailed blanket deployment dynamics are separate models.
import {movingMassElements,tensorVector} from './attitude-inertia.js';
import {cross,dot,unit} from './orbit.js';

function earlierDirection(current,previous,dt,probeS){
 const axis=cross(previous,current),sine=Math.hypot(...axis);
 if(sine<1e-10)return current;
 const angle=Math.atan2(sine,dot(previous,current))*probeS/dt;
 const tangent=cross(axis.map(v=>v/sine),current);
 return unit(current.map((v,i)=>v*Math.cos(angle)-tangent[i]*Math.sin(angle)));
}

export function mechanismMomentum(h,previous,current,dt,properties){
 if(!previous||dt<=0)return previous?.dynamics?.mechanismMomentumBodyNms??[0,0,0];
 const probeS=Math.min(.001,dt),fraction=probeS/dt;
 const earlier={};
 for(const [output,input] of [
  ['wingPitchDeg','wing'],['upperRadiatorPitchDeg','upper'],['lowerRadiatorPitchDeg','lower'],
  ['upperRadiatorRollDeg','upperRoll'],['lowerRadiatorRollDeg','lowerRoll']
 ])earlier[output]=current[input]-(current[input]-(previous[input]??current[input]))*fraction;
 earlier.dishBoresightBody=earlierDirection(current.dish,previous.dish??current.dish,dt,probeS);
 earlier.opticalBoresightBody=earlierDirection(current.optic,previous.optic??current.optic,dt,probeS);
 const deployment=current.deployment-(current.deployment-(previous.deployment??current.deployment))*fraction;
 const before=movingMassElements(h,{deployment,attitude:earlier});
 const momentum=[0,0,0];
 for(const part of properties.movingElements){
  const old=before.find(p=>p.id===part.id);
  if(!old||part.massKg===0)continue;
  const velocity=part.centroidM.map((v,i)=>(v-old.centroidM[i])/probeS);
  const offset=part.centroidM.map((v,i)=>v-properties.cm[i]);
  const translation=cross(offset,velocity).map(v=>v*part.massKg);
  let omega=[0,0,0];
  const indices=part.symmetryAxis==null?[0,1,2]:[part.symmetryAxis];
  for(const i of indices){
   const derivative=part.axes[i].map((v,j)=>(v-old.axes[i][j])/probeS);
   const rotation=cross(part.axes[i],derivative);
   for(let j=0;j<3;j++)omega[j]+=rotation[j]*(indices.length===3?.5:1);
  }
  if(part.spinAngleRad!=null){
   const spin=(part.spinAngleRad-old.spinAngleRad)/probeS;
   omega=omega.map((v,i)=>v+part.axes[part.symmetryAxis][i]*spin);
  }
  const rotation=tensorVector(part.intrinsicTensorKgM2,omega);
  for(let i=0;i<3;i++)momentum[i]+=translation[i]+rotation[i];
 }
 return momentum;
}
