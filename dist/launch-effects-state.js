// Mission elapsed time zero is release. Heights describe an illustrative local
// vertical departure. They join the mission ascent interpolation at +35 s.
import {launchPropulsionFor,launchSiteFor} from './launch-sites.js';
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const u=clamp(x);return u*u*(3-2*u);};
const riseAcceleration={starship:3.2,falconHeavy:4.7,ariane64:6.8,vulcan6:6.2,longMarch5B:4,glenn:2.3,glenn9:2.6,terran:3.1,terranX:3.1,longMarch9:3};
export function launchRiseM(t,id){
 const time=Math.min(35,Math.max(0,t)),a=riseAcceleration[id]??3;
 return a*(time*time/2+.0018*time**3);
}
// Events shared by the stage geometry, exhaust, flight-director cues and master timeline.
// MET zero is liftoff from the pad. All carrier variants use the nine-minute reference ascent.
export const INSERTION_MET=540;
const clockCache=new Map();
export function launchClockFor(id){
 if(clockCache.has(id))return clockCache.get(id);
 const star=id==='starship',falcon=id==='falconHeavy',single=id==='longMarch5B';
 const clock=Object.freeze({
  waterStart:star?-17:-6,engineStart:id==='ariane64'?-7:falcon?-6:-3,
  coreCutoff:star?142:falcon?231:single?INSERTION_MET:170,
  stageSeparation:single?null:star?142:falcon?234:170,
  boosterCutoff:falcon?144:128,boosterSeparation:falcon?147:128,
  hotStage:star?140:null,
  ...(star?{boostbackStart:147,boostbackCutoff:187}:{}),
  upperIgnition:single?null:star?140:falcon?240:177,
  upperCutoff:single?null:star?491:INSERTION_MET,
  fairingJettison:star?null:falcon?257:230,doorOpen:star?INSERTION_MET:null,
  hatchClear:star?552:null,eject:star?585:null,release:star?575:INSERTION_MET,releaseClear:star?635:600,
  carriageHome:star?660:null,hatchLatched:star?680:null
 });
 clockCache.set(id,clock);return clock;
}
// V3 ship-following ascent animation. Flight 14's published clock places
// separation at 142 s and boostback at 147–187 s. Flight 13 webcast frames
// show a prompt directional turn, five pilot engines, and a 33-engine high-
// thrust portion. Angles, group ramps and accelerations approximate that
// visual sequence; SpaceX has not published relative-position telemetry.
function recoveryCommand(dt,c){
 const ignite=c.boostbackStart-c.stageSeparation,cutoff=c.boostbackCutoff-c.stageSeparation;
 const ramp=(a,b)=>smooth((dt-a)/(b-a));
 const pilot=.82*(1-ramp(cutoff-1,cutoff));
 const middle=ramp(ignite,ignite+3)*(1-ramp(cutoff-7,cutoff-2));
 const outer=ramp(ignite+2,ignite+7)*(1-ramp(cutoff-17,cutoff-12));
 return {angleRad:150*Math.PI/180*ramp(0,14),coreThrottle:pilot,middleThrottle:middle,outerThrottle:outer};
}
export function superHeavyDeparture(t){
 const c=launchClockFor('starship'),elapsed=Math.max(0,t-c.stageSeparation);
 // Integrate the difference in thrust accelerations in the local staging
 // plane. Shared velocity and local gravity cancel at release. +Y is along
 // the ascending ship; +Z rotation tips the booster nose toward −X.
 const end=Math.min(elapsed,c.boostbackCutoff-c.stageSeparation);
 let sideM=0,axialM=0,vx=0,vy=0;
 for(let u=0;u<end;u+=.25){
  const dt=Math.min(.25,end-u),cmd=recoveryCommand(u+dt*.5,c);
  const accel=47*(5*cmd.coreThrottle+8*cmd.middleThrottle+20*cmd.outerThrottle)/33;
  const ax=-Math.sin(cmd.angleRad)*accel,ay=Math.cos(cmd.angleRad)*accel-10.5;
  sideM+=(vx+ax*dt*.5)*dt;axialM+=(vy+ay*dt*.5)*dt;
  vx+=ax*dt;vy+=ay*dt;
 }
 return {...recoveryCommand(elapsed,c),sideM,axialM};
}

// A continuous enclosure of the exact piecewise midpoint integrator above.
// Within a 0.25 s step, the already accumulated position/velocity are fixed;
// only h and the command at u+h/2 vary. Interval products enclose that entire
// partial step. The result therefore covers every real time, not just a list
// of sampled departure poses. Used by finite-radius launch routing proofs.
export function superHeavyDepartureEnvelope(start,end){
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)throw new Error('Invalid departure envelope interval');
 const c=launchClockFor('starship'),duration=c.boostbackCutoff-c.stageSeparation,lo=Math.max(0,Math.min(duration,start-c.stageSeparation)),hi=Math.max(0,Math.min(duration,end-c.stageSeparation)),ignite=c.boostbackStart-c.stageSeparation;
 const product=(a,b)=>[Math.min(a[0]*b[0],a[0]*b[1],a[1]*b[0],a[1]*b[1]),Math.max(a[0]*b[0],a[0]*b[1],a[1]*b[0],a[1]*b[1])],rampRange=(a,b,x,y)=>[smooth((x-a)/(b-a)),smooth((y-a)/(b-a))],complement=r=>[1-r[1],1-r[0]];
 const angleRange=[recoveryCommand(lo,c).angleRad,recoveryCommand(hi,c).angleRad],side=[Infinity,-Infinity],axial=[Infinity,-Infinity];let x=0,y=0,vx=0,vy=0;
 function accelerationRange(a,b){
  const pilot=complement(rampRange(duration-1,duration,a,b)).map(v=>v*.82),middle=product(rampRange(ignite,ignite+3,a,b),complement(rampRange(duration-7,duration-2,a,b))),outer=product(rampRange(ignite+2,ignite+7,a,b),complement(rampRange(duration-17,duration-12,a,b))),accel=[0,1].map(i=>47*(5*pilot[i]+8*middle[i]+20*outer[i])/33),angle=[recoveryCommand(a,c).angleRad,recoveryCommand(b,c).angleRad],s=[Math.min(Math.sin(angle[0]),Math.sin(angle[1])),angle[0]<=Math.PI/2&&angle[1]>=Math.PI/2?1:Math.max(Math.sin(angle[0]),Math.sin(angle[1]))],co=[Math.cos(angle[1]),Math.cos(angle[0])],sa=product(s,accel),ca=product(co,accel);
  return {x:[-sa[1],-sa[0]],y:ca.map(v=>v-10.5)};
 }
 for(let u=0;u<=hi;u+=.25){
  const h0=Math.max(0,lo-u),h1=Math.min(.25,hi-u);
  if(h1>=0&&h0<=h1){const a=accelerationRange(u+h0*.5,u+h1*.5),squared=[h0*h0*.5,h1*h1*.5];for(const [range,p,v,acc]of [[side,x,vx,a.x],[axial,y,vy,a.y]]){const velocity=product([v,v],[h0,h1]),acceleration=product(acc,squared);range[0]=Math.min(range[0],p+velocity[0]+acceleration[0]);range[1]=Math.max(range[1],p+velocity[1]+acceleration[1]);}}
  const cmd=recoveryCommand(u+.125,c),accel=47*(5*cmd.coreThrottle+8*cmd.middleThrottle+20*cmd.outerThrottle)/33,ax=-Math.sin(cmd.angleRad)*accel,ay=Math.cos(cmd.angleRad)*accel-10.5;x+=(vx+ax*.125)*.25;y+=(vy+ay*.125)*.25;vx+=ax*.25;vy+=ay*.25;
 }
 return {sideM:side.map((v,i)=>v+(i?1:-1)*1e-8),axialM:axial.map((v,i)=>v+(i?1:-1)*1e-8),angleRad:angleRange,basis:'Interval arithmetic over every partial 0.25 s midpoint-integration step, sharing the renderer’s exact command law.'};
}
// The aft inspection camera clears the separating booster's rendered envelope.
export function shipEngineViewAvailable(id,t){
 return id==='starship'&&t>=launchClockFor(id).stageSeparation+45&&t<INSERTION_MET;
}
export function payloadFreeMET(id){
 const clock=launchClockFor(id);return clock.eject??clock.release;
}
export function launchWaterSequence(id,siteId){
 const site=launchSiteFor(id,siteId),water=site?.infrastructure?.water;
 const enabled=water?water.status!=='unknown'&&water.visual?.render!==false:!!site&&site.water!=='none';
 return {enabled,startMet:Number.isFinite(water?.sequence?.startMet)?water.sequence.startMet:launchClockFor(id).waterStart,
  status:water?.status||'study',basis:water?.sequence?.basis||'Illustrative water-system cue on the mission clock; provider operating sequence remains open.'};
}
export function launchEffectsAt(t,id,siteId){
 const site=launchSiteFor(id,siteId),fuel=launchPropulsionFor(id);
 const {engineStart,coreCutoff,boosterCutoff,hotStage,upperIgnition,upperCutoff}=launchClockFor(id),waterSequence=launchWaterSequence(id,siteId),waterStart=waterSequence.startMet;
 const downselect=hotStage!==null&&t>=hotStage;
 const ignition=t<coreCutoff?(downselect?.13:smooth((t-engineStart)/-engineStart)):0;
 const boosterPower=fuel.booster&&t<boosterCutoff?(fuel.booster==='solid'?(t>=0?1:0):smooth((t-engineStart)/-engineStart)):0;
 const upperPower=upperIgnition!==null&&t>=upperIgnition&&t<upperCutoff?smooth((t-upperIgnition)/.85):0;
 const water=waterSequence.enabled?smooth((t-waterStart)/1.5)*(1-smooth((t-17)/11)):0;
 const steam=water*smooth((t-engineStart)/2)*(1-smooth((t-9)/17));
 const phase=t<engineStart?waterSequence.enabled&&t>=waterStart?'deluge':'hold':t<0?'ignition':t<5?'release':t<13?'clearance':t<35?'climb':t<coreCutoff&&!downselect?'ascent':upperPower?'upper':'coast';
 const label={hold:'Stack restrained',deluge:'Water suppression starts',ignition:'Liquid engines starting',release:'Liftoff',clearance:'Clearing the tower',climb:'Climbing downrange',ascent:'Powered ascent',upper:'Upper stage firing',coast:'Stage transition'}[phase];
 return {water,steam,waterStart,waterEnabled:waterSequence.enabled,waterBasis:waterSequence.basis,engineStart,ignition,boosterPower,upperPower,liftoffHeightM:launchRiseM(t,id),phase,label,coreFuel:fuel.core,boosterFuel:fuel.booster,upperFuel:fuel.upper};
}
