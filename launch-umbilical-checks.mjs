import assert from 'node:assert/strict';
import {launchFleet} from './dist/launch-fleet.js';
import {launchSitesFor,launchPropulsionFor} from './dist/launch-sites.js';
import {launchUmbilicalDesign,launchUmbilicalState,UMBILICAL_MEDIA} from './dist/launch-umbilicals.js';
import {renderPadSystems,refreshPadSystems} from './dist/pad-systems-ui.js';

let routes=0;
for(const [launcher,vehicle] of Object.entries(launchFleet))for(const site of launchSitesFor(launcher)){
 routes++;
 const d=launchUmbilicalDesign(launcher,site.id),before=JSON.stringify(d),p=launchPropulsionFor(launcher);
 assert.equal(d.launcherId,launcher);assert.equal(d.siteId,site.id);assert.equal(d.schema,'odc-launch-umbilical-design/1');
 assert.equal(d.connections.length,new Set(d.connections.map(c=>c.id)).size,'Unique functional circuit IDs');
 assert.equal(d.groups.length,new Set(d.groups.map(g=>g.id)).size,'Unique assembly IDs');
 for(const c of d.connections){
  assert.ok(d.groups.some(g=>g.id===c.groupId),'Every circuit belongs to an assembly');
  assert.ok(UMBILICAL_MEDIA[c.medium]);assert.equal(c.interfaceStatus,'open');
  assert.ok(c.chain.length>=3&&c.chain.every(s=>s.length),'Every circuit has an end-to-end functional path');
  assert.ok(c.sourceIds.length&&c.sourceIds.every(id=>d.sources.some(s=>s.id===id)),'Every basis resolves to a reference');
 }
 for(const g of d.groups){
  assert.ok(g.visual.heightFraction>=0&&g.visual.heightFraction<=1);
  assert.ok(g.release.motionEnd>g.release.motionStart);
  if(g.release.event!=='payload-release')assert.ok(g.release.met<=0,'No ground connection follows the rising stack');
  if(g.visual.target==='booster'){assert.ok(p.booster&&p.booster!=='solid');assert.ok(g.visual.boosterIndex>=0&&g.visual.boosterIndex<vehicle.boosters);}
 }
 if(!p.upper)assert.equal(d.groups.some(g=>g.visual.target==='upper'),false,'No invented upper-stage interface');
 if(p.booster==='solid')assert.equal(d.connections.some(c=>c.groupId.startsWith('booster-')&&UMBILICAL_MEDIA[c.medium].fluid),false,'No liquid feed to a solid booster');
 assert.equal(d.requirements.every(r=>r.status==='open'),true);
 const onPad=launchUmbilicalState(d,-20),atLift=launchUmbilicalState(d,.5),afterRelease=launchUmbilicalState(d,1000);
 assert.equal(onPad.groundConnectedCount,d.groups.length-1);
 assert.equal(atLift.groundConnectedCount,0);assert.equal(atLift.flightConnectedCount,1);
 assert.equal(afterRelease.flightConnectedCount,0);
 assert.equal(atLift.connections.find(c=>c.id==='payload-flight-power').serviceState,'Ground source removed');
 assert.equal(atLift.connections.find(c=>c.id==='payload-flight-power').connected,true,'Retained conductor is not ongoing ground power');
 assert.equal(atLift.connections.find(c=>c.id==='payload-flight-data').serviceState,'Ground link ended');
 assert.deepEqual(launchUmbilicalState(d,-20),onPad,'Seeking reconstructs the same state');
 assert.equal(JSON.stringify(d),before,'Playback does not mutate the controlled design or its evidence');
 for(const c of d.connections){
  const html=renderPadSystems({launcher,launchSite:site.id},{t:.5},{phase:'D',padConnection:c.id});
  assert.ok(html.includes('data-ps-selected="'+c.id+'"'));assert.ok(html.includes('data-pad-inspect="'+c.id+'"'));
  assert.equal((html.match(/data-pad-connection=/g)||[]).length,d.connections.length,'Every service circuit is inspectable');
  assert.ok(html.includes('data-ps-feature="lightning"')&&html.includes('data-ps-feature="water"'));
  assert.ok(html.includes('<svg')&&html.includes('Interface verification plan'));
  assert.doesNotMatch(html,/="undefined"|>undefined<|NaN/,'No unresolved values in generated markup');
 }
}
assert.equal(routes,15);
const star=launchUmbilicalDesign('starship'),ari=launchUmbilicalDesign('ariane64'),falc=launchUmbilicalDesign('falconHeavy'),lm5=launchUmbilicalDesign('longMarch5B'),lm9=launchUmbilicalDesign('longMarch9');
assert.notEqual(star.connections.find(c=>c.id==='core-fuel').groupId,star.connections.find(c=>c.id==='core-oxidizer').groupId,'V3 separate physical booster QDs');
assert.notEqual(ari.connections.find(c=>c.id==='upper-fuel').groupId,ari.connections.find(c=>c.id==='upper-oxidizer').groupId,'Ariane upper cryogenic arms');
assert.equal(falc.groups.filter(g=>g.visual.target==='booster').length,2);
assert.equal(lm5.groups.filter(g=>g.visual.target==='booster').length,4);
assert.equal(lm9.connections.filter(c=>c.medium==='unknown-fuel').length,2);assert.equal(lm9.connections.filter(c=>c.medium==='unknown-oxidizer').length,2);
assert.equal(lm9.connections.some(c=>['lox','hydrogen','methane','rp1'].includes(c.medium)),false,'Unknown study propellants stay unknown');
assert.equal(falc.options.find(o=>o.id==='payload-gn2').selected,false,'Nonstandard purge is not silently connected');
assert.equal(falc.options.find(o=>o.id==='payload-cryo').selected,false,'Launcher fuel is not connected to spacecraft tanks');
assert.equal(launchUmbilicalDesign('not-a-vehicle'),null);assert.equal(launchUmbilicalDesign('constructor'),null);
const h={input:{launcher:'ariane64',launchSite:'kourou-ela4'},energySystem:{electrical:{family:{primaryV:400}}}},inputBefore=JSON.stringify(h),mission=launchUmbilicalDesign(h);
assert.equal(mission.spacecraftInterface.flightBusV,400);assert.equal(mission.spacecraftInterface.groundInputV,null);assert.equal(mission.spacecraftInterface.groundPowerW,null);assert.equal(JSON.stringify(h),inputBefore);
assert.ok(renderPadSystems(h,{t:7800},{phase:'B'}).includes('Prelaunch design preview'));
assert.ok(renderPadSystems(h,{t:7800},{phase:'B'}).includes('T−00:20'));
assert.equal(renderPadSystems({launcher:'unknown'},{t:0},{}),'');

// Exercise incremental selection and playback using retained DOM node identities.
class Node{
 constructor(dataset={}){this.dataset=dataset;this.attributes=new Map();this.textContent='';this.innerHTML='';this.style={};}
 setAttribute(k,v){this.attributes.set(k,String(v));}
}
const d=launchUmbilicalDesign('starship'),shell=new Node({psDesign:d.id,psSelected:'payload-power'}),nodes=new Map();
const node=s=>{if(!nodes.has(s))nodes.set(s,new Node());return nodes.get(s);};
const buttons=d.connections.map(c=>new Node({padConnection:c.id})),states=d.connections.map(c=>new Node({psConnectionState:c.id}));
shell.querySelector=node;shell.querySelectorAll=s=>s==='[data-pad-connection]'?buttons:s==='[data-ps-connection-state]'?states:[];
const host={querySelector:()=>shell,innerHTML:'original host'},selection=buttons.find(n=>n.dataset.padConnection==='core-oxidizer');
globalThis.document={activeElement:selection};
refreshPadSystems(host,{launcher:'starship'},{t:-20},{phase:'D',padConnection:'core-oxidizer'});
assert.equal(host.innerHTML,'original host','Selection does not replace the host');assert.equal(document.activeElement,selection,'Focused circuit button is retained');
assert.equal(selection.attributes.get('aria-pressed'),'true');assert.ok(node('[data-ps-detail]').innerHTML.includes('Super Heavy oxygen'));
const selectedHTML=node('[data-ps-detail]').innerHTML;
refreshPadSystems(host,{launcher:'starship'},{t:1},{phase:'D',padConnection:'core-oxidizer',padPlaying:true});
assert.equal(node('[data-ps-detail]').innerHTML,selectedHTML,'Playback does not rebuild detail markup');
assert.equal(node('[data-ps-selected-state]').textContent,'Withdrawing');assert.equal(node('[data-ps-ground-count]').textContent,'0 / '+(d.groups.length-1));
assert.equal(document.activeElement,selection);assert.equal(shell.dataset.playing,'true');
const fallback={querySelector:()=>null,innerHTML:''};refreshPadSystems(fallback,{launcher:'starship'},{t:0},{phase:'D'});assert.ok(fallback.innerHTML.includes('ps-shell'),'Missing shell uses a bounded non-recursive render');
console.log('Umbilical design: 15 vehicle/site routes; full stage/payload circuit coverage, separate release boundaries, unknowns, power-handover semantics and incremental UI refresh validated.');
