import assert from 'node:assert/strict';
import {defaults,sizeDesign,controls,applyPreset} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {schematicPages,renderSubsystemDiagram} from './dist/subsystem-diagrams.js';
import {cfg} from './dist/workspaces.js';

const hardware=sizeDesign(defaults),sim=createSimulation(hardware),events=sim.events(0,86400),pass=events.find(e=>e.type==='contact'),day=sim.daySummary(0);
const part=(html,id)=>html.split('data-sd-detail="'+id+'"')[1].split('data-sd-detail=')[0];
assert.deepEqual([...schematicPages].sort(),Object.keys(cfg).sort());
const inputs=new Set(controls.map(c=>c.key));
const allIds=new Set();
for(const t of [-120,1250,(pass.start+pass.end)/2,43200]){
 const state=sim.at(t),context={hardware,state,events,day};
 for(const page of schematicPages){
  const html=renderSubsystemDiagram(page,context);
  assert.ok(!/NaN|undefined|Infinity/.test(html),page+' non-finite markup');
  for(const [,id] of html.matchAll(/\bid="([^"]+)"/g)){assert.ok(!allIds.has(id),id+' unique');allIds.add(id);}
  const parts=new Set([...html.matchAll(/data-sd-detail="([^"]+)"/g)].map(m=>m[1]));
  for(const [,key] of html.matchAll(/data-sd-edit="([^"]+)"/g))assert.ok(inputs.has(key),page+' edit '+key);
  assert.ok(parts.size>=3,page);
  for(const k of parts){assert.ok(html.includes('data-sd-pick="'+k+'"'));assert.ok(html.includes('<option value="'+k+'"'))}
  assert.ok(html.includes('class="sd-clock">MET '));assert.ok(html.includes('data-sd-select'));
  if(page==='comm')assert.ok(html.includes(state.station||'No contact'));
  if(page==='mass')for(const item of hardware.massLedger)assert.ok(html.includes(item.label),'Missing allocation '+item.label);
  if(page==='thermal'){
   for(const q of state.thermalQualification){
    const body=part(html,q.id);assert.ok(body.includes(q.state+' · '+q.status));assert.ok(body.includes('sd-range'));
   }
  }
 }
}
const unfavorable=sizeDesign({...defaults,launcher:'glenn',solarM2:5000,missionYears:.025}),sim2=createSimulation(unfavorable);
const excess=renderSubsystemDiagram('launch',{hardware:unfavorable,state:sim2.at(1234),events:[],day:{}});
assert.ok(excess.includes('Envelope exceeded'));assert.ok(excess.includes('sd-bad'));
const alt=sizeDesign({...applyPreset(defaults,'compute','dgx'),trayCount:5,storageTB:32});
const sized=renderSubsystemDiagram('compute',{hardware:alt,state:createSimulation(alt).at(2500),day:{},events:[]});
assert.ok(sized.includes('5 trays / 40 accelerators'));
console.log('Fourteen schematic workspaces verified across prelaunch, powered flight, a ground pass and reboost. Confirmed unique SVG IDs, valid parameter actions, all mass allocations, thermal state/range displays and launcher fit failure.');

// Palette endpoints, midpoint interpolation, clipping and unassessed nodes are shared with the three.js view.
const {thermalScales,temperatureColor}=await import('./dist/thermal-colors.js');
const warm=sim.at((pass.start+pass.end)/2);
const tColors=(page)=>Object.fromEntries([...page.matchAll(/data-sd-thermal-node="([^"]+)" data-sd-temperature-color="([^"]+)"/g)].map(([,id,color])=>[id,color]));
for(const [scale,lo,hi] of [['working',245,305],['full',180,380]]){
 assert.equal(thermalScales[scale][0][0],lo);assert.equal(thermalScales[scale].at(-1)[0],hi);
 const make=(t)=>{const thermalQualification=warm.thermalQualification.map((row,i)=>({...row,temperatureK:[lo-12,hi+29,(lo+hi)/2,lo+(hi-lo)*.23,350,lo][i],status:['cold','hot','pass','pass','unassessed','pass'][i]}));return renderSubsystemDiagram('thermal',{hardware,state:{...warm,t,thermalQualification},day,events,thermalScale:scale})};
 const render=make(4500),colors=tColors(render);
 assert.deepEqual(colors,tColors(make(7500)),'Fixed scales are time-invariant');
 assert.equal(colors.junction,thermalScales[scale][0][1]);assert.equal(colors.coldPlate,thermalScales[scale].at(-1)[1]);
 assert.equal(colors.coolant,'#'+temperatureColor((lo+hi)/2,scale).toString(16).padStart(6,'0'));
 assert.equal(colors.battery,'#58636c');assert.equal((render.match(/class="sd-limit-flag"/g)||[]).length,2);
 assert.ok(render.includes('≤'+lo)&&render.includes('≥'+hi));assert.ok(render.includes(scale.toUpperCase()+' RANGE'));
}
console.log('Temperature fills match the fixed 3D working/full scales, including endpoint clamps, intermediate colors, neutral nodes and independent warning symbols.');
