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
export function launchEffectsAt(t,id,siteId){
 const site=launchSiteFor(id,siteId),fuel=launchPropulsionFor(id);
 const solid=fuel.booster==='solid',star=id==='starship',fh=id==='falconHeavy',ariane=id==='ariane64';
 const waterStart=star?-17:-6,engineStart=ariane?-7:fh?-6:-3;
 const mainOff=star?140:fh?231:id==='longMarch5B'?540:170,upperOn=star?142:fh?240:177,boostOff=fh?144:128;
 const ignition=t<mainOff?smooth((t-engineStart)/-engineStart):star&&t<142?.13:0;
 const boosterPower=fuel.booster&&t<boostOff?(solid?(t>=0?1:0):smooth((t-engineStart)/-engineStart)):0;
 const upperPower=fuel.upper&&t>=upperOn&&t<(star?491:540)?smooth((t-upperOn)/.85):0;
 const water=site.water!=='none'?smooth((t-waterStart)/1.5)*(1-smooth((t-17)/11)):0;
 const steam=water*smooth((t-engineStart)/2)*(1-smooth((t-9)/17));
 const phase=t<waterStart&&t<engineStart?'hold':t<engineStart?'deluge':t<0?'ignition':t<5?'release':t<13?'clearance':t<35?'climb':t<mainOff?'ascent':upperPower?'upper':'coast';
 const label={hold:'Stack restrained',deluge:'Water suppression starts',ignition:'Liquid engines starting',release:'Liftoff',clearance:'Clearing the tower',climb:'Climbing downrange',ascent:'Powered ascent',upper:'Upper stage firing',coast:'Stage transition'}[phase];
 return {water,steam,waterStart,engineStart,ignition,boosterPower,upperPower,liftoffHeightM:launchRiseM(t,id),phase,label,coreFuel:fuel.core,boosterFuel:fuel.booster,upperFuel:fuel.upper};
}
