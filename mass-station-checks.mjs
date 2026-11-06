import assert from 'node:assert/strict';
import {missionStarter,sizeDesign} from './dist/design.js';
import {exportMechanical,renderMassReport,renderMechanical} from './dist/mechanical-design.js';

const hardware=sizeDesign(missionStarter('text'));
const stationId=(wbs,index)=>'mech-station-'+wbs.replace('.','-')+'-'+(index+1);
const wholeCM='mech-cm-all',filteredCM='mech-cm-filtered';
function checkProjections(html,rows){
 const stations=rows.flatMap(r=>r.stationsM.map((_,index)=>stationId(r.wbs,index)));
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
 const expected=[...stations,wholeCM,...(stations.length?[filteredCM]:[])].sort();
 for(const target of expected)assert.equal(ids.filter(id=>id===target).length,1,'Unique destination for '+target);
 const planes=new Map();
 for(const match of html.matchAll(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/g)){
  const axis=match[1].match(/\bdata-mech-plane="(\d)"/)?.[1];
  if(axis==null)continue;
  assert.ok(!planes.has(axis),'Duplicate plane '+axis);
  const groups=[...match[2].matchAll(/<g\b([^>]*\bdata-mount\b[^>]*)>/g)].map(group=>{
   const members=group[1].match(/\bdata-members="([^"]+)"/)?.[1];
   assert.ok(members,'Hit target must identify its members');
   return members.split(/\s+/);
  });
  assert.deepEqual(groups.flat().sort(),expected,'Every displayed station and center has exactly one hit target in plane '+axis);
  planes.set(axis,groups);
 }
 assert.deepEqual([...planes.keys()].sort(),['0','1','2']);
 return planes;
}
const stowed={t:0,deployment:0,propellantKg:hardware.propellantKg};
const released={t:541,deployment:0,propellantKg:hardware.propellantKg};
const depleted={t:100_000,deployment:1,propellantKg:0};
for(const [phase,snapshot,hasAdapter] of [['A',depleted,true],['B',stowed,false],['E',stowed,true],['E',released,false],['E',depleted,false]]){
 const rows=exportMechanical(hardware,snapshot,phase).rows.filter(r=>r.equipmentKg>0);
 assert.equal(rows.some(r=>r.wbs==='09.01'),hasAdapter);
 assert.equal(rows.some(r=>r.wbs==='06.06'),phase!=='E'||snapshot.propellantKg>0);
 const planes=checkProjections(renderMechanical(hardware,snapshot,phase),rows);
 const board=stationId('01.01',0),host=stationId('01.02',0);
 for(const groups of planes.values())assert.ok(groups.some(g=>g.includes(board)&&g.includes(host)),'Co-located board and host are both selectable at the same mark');
 const nextTray=stationId('01.01',1);
 assert.ok(planes.get('0').find(g=>g.includes(board)).includes(nextTray),'Two trays separated along Y coincide in the X–Z projection');
 assert.ok(!planes.get('2').find(g=>g.includes(board)).includes(nextTray),'The same trays separate in the X–Y projection');
}

const launchRows=exportMechanical(hardware,stowed,'A').rows.filter(r=>r.equipmentKg>0);
for(const [filter,remaining] of [
 [{subsystem:'Chemical propulsion'},launchRows.filter(r=>r.wbs.startsWith('06.'))],
 [{query:'05.03'},launchRows.filter(r=>r.wbs==='05.03')],
 [{query:'unobtanium'},[]]
]){
 const html=renderMassReport(hardware,stowed,'A','launch',filter);
 checkProjections(html,remaining);
 assert.ok(!html.includes('id="'+stationId('01.01',0)+'"'),'Filtered-out board has no stale destination');
}
console.log('Mass station jumps cover three projections, coincident equipment, centers of mass, filters, fixed poses, separation and empty tanks.');
