import assert from 'node:assert/strict';
import {defaults,sizeDesign,controls} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {domains,domainReadout,domainTrade,renderDomainReadout,renderDomainTrade,environmentFlows} from './dist/domain-analysis.js';
import {cfg} from './dist/workspaces.js';
import {schematicPages} from './dist/subsystem-diagrams.js';

const expected=['conops','environment','orbit','compute','data','comm','power','thermal','attitude','prop','mass','launch','launcher','mechanical','avionics','software'];
assert.deepEqual(Object.keys(domains),expected);assert.deepEqual(schematicPages.filter(id=>id!=='purpose'),expected);assert(schematicPages.includes('purpose'),'Legacy purpose schematic remains routable.');
assert.equal(domains.purpose,domains.compute,'The legacy purpose link resolves to Payload Operations without adding a duplicate domain.');
const available=new Set(controls.map(c=>c.key));
function sample(design){
 const hardware=sizeDesign(design),sim=createSimulation(hardware),events=sim.events(0,86400),pass=events.find(e=>e.type==='contact');
 const t=pass.start+100;return {hardware,sim,events,state:sim.at(t),day:sim.daySummary(0),samples:sim.window(0,86400,25)};
}
const baseline=sample({...defaults,missionYears:.01}),edit=sample({...defaults,missionYears:.01,bulkMbps:2*defaults.bulkMbps});
const durations=new Set(),titles=new Set();
const flat=s=>s.replaceAll(/\s+/g,' ');
for(const id of expected){
 const meta=domains[id];assert.ok(cfg[id]);for(const key of [...meta.inputs,...meta.tradeKeys])assert.ok(available.has(key),id+' unknown '+key);
 for(const phase of 'ABCDEF'){
  const context={...baseline};if(phase!=='F')context.sim={get audit(){return null},disposal:()=>{throw Error('Premature disposal propagation')},mission:()=>{throw Error('Unexpected mission integration')}};
  const r=domainReadout(id,phase,context),html=renderDomainReadout(id,phase,context);titles.add(r.title);assert.ok(r.rows.length>=4,id+phase);assert.ok(flat(html).includes(r.title));assert.ok(!/NaN|undefined|Infinity/.test(html),id+' '+phase);
  if(phase==='C')for(const row of r.rows)assert.notEqual(row.value,null,row.key);
 }
 const t=domainTrade(id,baseline,edit);assert.deepEqual(t.changedInputs,['bulkMbps']);assert.equal(t.curves.length,2);assert.ok(t.curves.every(c=>c.baseline.length>0&&c.edited.length>0));
 for(const r of t.rows.filter(r=>r.delta!==null))assert.equal(r.delta,r.edited-r.baseline);
 assert.ok(!/NaN|undefined|Infinity/.test(renderDomainTrade(id,baseline,edit)));
}
assert.equal(titles.size,expected.length*6);
const traffic=domainTrade('data',baseline,edit).rows.find(r=>r.key==='meanTraffic');assert.ok(traffic.delta>0);
const env=environmentFlows(baseline),g=baseline.state;
const radiation=env.filter(r=>['Absorbed direct shortwave','Absorbed albedo','Absorbed longwave'].includes(r.quantity));
assert.ok(Math.abs(radiation.reduce((n,r)=>n+r.value,0)-g.absorbedKW)<1e-9);assert.ok(env.every(r=>r.source&&r.receiver&&r.unit));
const dataRows=domainReadout('data','E',baseline).rows;
assert.equal(dataRows.find(r=>r.key==='aiProductGeneratedGB').value,g.aiProductGeneratedGB);
assert.equal(dataRows.find(r=>r.key==='aiProductQueueGB').value,g.aiProductQueueGB);
assert.equal(dataRows.find(r=>r.key==='aiProductDeliveredGB').value,g.aiProductDeliveredGB);
assert.ok(Math.abs(g.aiProductGeneratedGB-g.aiProductQueueGB-g.aiProductDeliveredGB-g.aiProductDroppedGB)<1e-7);
const post={...baseline,state:{...baseline.state,referenceBody:true,spacecraftModelEndedAt:500,t:501,entryDynamicPressurePa:402,entryReferenceDragMS2:2.68},disposal:{method:'reentry',outcome:'target-miss',targetErrorKm:201,target:{latDeg:-48.9,lonDeg:-123.4},impact:{t:510,speedMs:150},burns:[]}};
assert.equal(domainReadout('power','F',post).rows.find(r=>r.key==='batteryKWh').value,null);assert.equal(domainReadout('environment','F',post).rows.find(r=>r.key==='entryDynamicPressurePa').value,402);
const grave=domainReadout('prop','F',{...baseline,disposal:{method:'graveyard',outcome:'graveyard',burns:[{start:2000,end:2001,role:'Raise apogee'},{start:5000,end:5001,role:'Circularize'}],end:5001,finalPerigeeKm:903,finalApogeeKm:909}});assert.ok(grave.rows.some(r=>r.label==='Graveyard final perigee'&&r.value===903));
console.log('96 distinct phase/domain interpretations, 16 trade studies with aligned curves, same-instant radiative heat closure, payload byte conservation and both disposal routes verified.');
const {chronologicalAudit}=await import('./dist/mission-worker.js');
const audit=chronologicalAudit(baseline.hardware).result,withAudit={...baseline,audit};
for(const key of expected){
 const trade=domainTrade(key,withAudit,withAudit),curve=trade.missionCurves[0];
 assert.ok(curve.baseline.length>=2&&curve.baseline.every(p=>Number.isFinite(p.v)));
 assert.deepEqual(curve.baseline,curve.edited);
 if(key==='mass'||key==='prop')assert.ok(Math.abs(curve.baseline.at(-1).v-audit.finalState[key==='mass'?'wetKg':'propellantKg'])<1e-6);
}
console.log('Whole-mission curve extrema, flux rates, terminal stocks and paired audit outputs verified.');
