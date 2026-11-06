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
// The aft inspection camera clears the separating booster's rendered envelope.
export function shipEngineViewAvailable(id,t){
 return id==='starship'&&t>=launchClockFor(id).stageSeparation+45&&t<INSERTION_MET;
}
export function payloadFreeMET(id){
 const clock=launchClockFor(id);return clock.eject??clock.release;
}
export function launchEffectsAt(t,id,siteId){
 const site=launchSiteFor(id,siteId),fuel=launchPropulsionFor(id);
 const {waterStart,engineStart,coreCutoff,boosterCutoff,hotStage,upperIgnition,upperCutoff}=launchClockFor(id);
 const downselect=hotStage!==null&&t>=hotStage;
 const ignition=t<coreCutoff?(downselect?.13:smooth((t-engineStart)/-engineStart)):0;
 const boosterPower=fuel.booster&&t<boosterCutoff?(fuel.booster==='solid'?(t>=0?1:0):smooth((t-engineStart)/-engineStart)):0;
 const upperPower=upperIgnition!==null&&t>=upperIgnition&&t<upperCutoff?smooth((t-upperIgnition)/.85):0;
 const water=site.water!=='none'?smooth((t-waterStart)/1.5)*(1-smooth((t-17)/11)):0;
 const steam=water*smooth((t-engineStart)/2)*(1-smooth((t-9)/17));
 const phase=t<waterStart&&t<engineStart?'hold':t<engineStart?'deluge':t<0?'ignition':t<5?'release':t<13?'clearance':t<35?'climb':t<coreCutoff&&!downselect?'ascent':upperPower?'upper':'coast';
 const label={hold:'Stack restrained',deluge:'Water suppression starts',ignition:'Liquid engines starting',release:'Liftoff',clearance:'Clearing the tower',climb:'Climbing downrange',ascent:'Powered ascent',upper:'Upper stage firing',coast:'Stage transition'}[phase];
 return {water,steam,waterStart,engineStart,ignition,boosterPower,upperPower,liftoffHeightM:launchRiseM(t,id),phase,label,coreFuel:fuel.core,boosterFuel:fuel.booster,upperFuel:fuel.upper};
}
