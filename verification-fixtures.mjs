import {defaults, missionStarter, sizeDesign} from './dist/design.js';
import {siteApproach} from './dist/launch-director.js';
import {createSimulation} from './dist/model.js';
import {DAY, DEG, geometry} from './dist/orbit.js';

const sun=geometry(defaults,0).sunECI;
const terminatorNode=(360+Math.atan2(sun[0],-sun[1])/DEG)%360;

// A site-aligned, launchable vehicle with a complete directly integrated
// campaign, including maintenance, desaturation and a targeted disposal burn.
export function nominalCheckoutDesign(){
 const d=missionStarter('text');
 return {...d,...siteApproach(d).angles,missionYears:14/365.25};
}

export const scenarios=[
 {id:'compute-burst',label:'Compute burst',note:'Sixteen trays draw 32 kW during a 22% duty cycle. Inspect the cold plate during the second burst, then advance into cooldown.',design:{...defaults,trayCount:16,solarM2:240,radiatorM2:82,duty:.22},instant:8470,camera:'core',eventType:'burst'},
 {id:'bulk-optical',label:'Bulk optical pass',note:'An 18 TB initial backlog selects the optical terminal automatically. The 32 TB recorder supplies the Madrid transfer.',design:{...defaults,link:'auto',initialQueueGB:18000,storageTB:32,bulkMbps:160},instant:31065,camera:'spacecraft',eventType:'contact'},
 {id:'dawn-dusk',label:'Dawn–dusk orbit',note:'A 97.6° orbit has its plane normal aligned near the epoch Sun direction. The first 24 hours have continuous sunlight.',design:{...defaults,inclinationDeg:97.6,raanDeg:terminatorNode},instant:21600,camera:'orbit',eventType:null}
];

export function loadScenario(id){
 const scenario=scenarios.find(x=>x.id===id);
 if(!scenario)throw new Error('Unknown scenario');
 const design={...scenario.design},sim=createSimulation(sizeDesign(design));
 const event=scenario.eventType?sim.events(0,DAY).find(e=>e.type===scenario.eventType&&e.start<=scenario.instant&&e.end>scenario.instant):null;
 return {...scenario,design,event:event||null};
}
