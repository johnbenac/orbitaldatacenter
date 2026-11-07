import assert from 'node:assert/strict';
import {workspaceHistory} from './dist/workspace-history.js';
import {entryRoute,tabCheckpoint} from './dist/workspace-route.js';
import {buildReferenceDesign,referenceAssociation} from './dist/reference-configurations.js';
import {missionPreset,parsePreset} from './dist/mission-presets.js';

// Exercise the actual history/checkpoint modules without a browser or mission
// replay. History owns the location; the active design belongs to the workspace.
function harness(search='?center=redwire-8kw&phase=E&domain=conops&chapter=operations'){
 const location=new URL('https://example.test/'+search);
 const listeners=new Map(),storage=new Map();
 const entries=[{state:null,url:location.href}];
 let index=0,navigationType='navigate';
 const history={
  get state(){return entries[index].state},
  replaceState(state,_title,url){
   entries[index]={state:structuredClone(state),url:url?String(url):location.href};
   location.href=entries[index].url;
  },
  pushState(state,_title,url){
   entries.splice(++index);
   entries.push({state:structuredClone(state),url:String(url)});
   location.href=String(url);
  }
 };
 const win={history,location,scrollX:0,scrollY:0,scrollTo(){},
  performance:{getEntriesByType:()=>[{type:navigationType}]},
  sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  addEventListener(type,listener){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(listener)}
 };
 const saved=Object.fromEntries(['window','location','document'].map(key=>[key,globalThis[key]]));
 globalThis.window=win;globalThis.location=location;
 globalThis.document={querySelectorAll:()=>[],querySelector:()=>null,body:{},activeElement:null};
 let view={phase:'E',domain:'conops',chapter:'operations',reference:null,referenceCenterId:'redwire-8kw',referencePreview:'redwire-8kw',referenceCompared:[],referenceMissionCase:'source'};
 let input={referenceCenterId:'redwire-8kw',solarM2:96};
 const snapshot=()=>({schema:'odc-scenario/1',design:{...input},view:{...view}});
 const checkpoint=tabCheckpoint(win,location,snapshot);
 let navigation;
 function draw(){navigation.sync();checkpoint.schedule([view.phase,view.reference||view.domain,view.chapter].join('/'))}
 navigation=workspaceHistory(()=>({...view}),async place=>{
  Object.assign(view,place);
  draw();
  return true;
 },()=>'',()=>checkpoint.save());
 draw();
 return {
  location,entries,history,checkpoint,
  get input(){return input},get view(){return view},
  visit(reference){view.reference=reference;draw()},
  install(referenceCenterId,solarM2){
   input={referenceCenterId,solarM2};
   view={...view,referenceCenterId,reference:null};
   draw();checkpoint.save();
  },
  installDesign(design){
   input={...design};view={...view,referenceCenterId:input.referenceCenterId,reference:null};draw();checkpoint.save();
  },
  previewCase(missionCase){view.referenceMissionCase=missionCase;draw();checkpoint.save()},
  async back(){
   assert.ok(index>0,'A preceding history entry must exist');
   location.href=entries[--index].url;
   for(const listener of listeners.get('popstate')||[])listener({state:history.state});
   await Promise.resolve();await Promise.resolve();
  },
  reloadSnapshot(){navigationType='reload';return checkpoint.read()},
  cleanup(){checkpoint.save();for(const [key,value] of Object.entries(saved))value===undefined?delete globalThis[key]:globalThis[key]=value}
 };
}

const tests=[];
async function test(name,run){await run();tests.push(name)}

await test('Back preserves the active variant and rewrites its checkpoint entry',async()=>{
 const h=harness();
 try{
  h.visit('designs');
  h.install('starcloud-3',9999);
  await h.back();
  assert.equal(h.location.searchParams.get('center'),'starcloud-3');
  assert.equal(h.view.reference,'designs');
  assert.equal(h.input.solarM2,9999);
  const restored=h.reloadSnapshot();
  assert.ok(restored,'Reload must accept the checkpoint after the history URL is rewritten');
  assert.deepEqual(restored.design,h.input,'Reload must restore edited inputs, not rebuild the reference recipe');
 }finally{h.cleanup()}
});

await test('Same-place reference changes update the URL without adding a visit',async()=>{
 const h=harness();
 try{
  const count=h.entries.length;
  h.install('starcloud-3',1800);
  assert.equal(h.entries.length,count);
  assert.equal(h.location.searchParams.get('center'),'starcloud-3');
  assert.deepEqual(h.reloadSnapshot()?.design,h.input);
  h.install(null,321);
  assert.equal(h.entries.length,count);
  assert.equal(h.location.searchParams.has('center'),false,'An unassociated design must remove a stale reference selector');
  assert.deepEqual(h.reloadSnapshot()?.design,h.input);
 }finally{h.cleanup()}
});

await test('Canonical navigation retires consumed legacy design selectors',async()=>{
 const h=harness('?preset=pathfinder&purpose=pretrain&build=suggested&launcher=glenn&site=cape-lc36a&link=ka&disposal=graveyard&phase=E&domain=conops');
 try{
  h.install('starcloud-3',1800);
  h.visit('designs');
  assert.equal(h.location.searchParams.get('center'),'starcloud-3');
  for(const key of ['preset','purpose','build','launcher','site','link','disposal']){
   assert.equal(h.location.searchParams.has(key),false,'Stale '+key+' must not override the newly selected reference in a fresh tab');
  }
 }finally{h.cleanup()}
});

await test('Legacy purpose links enter Payload Operations',async()=>{
 assert.deepEqual(entryRoute(new URLSearchParams('domain=purpose&phase=B')),{phase:'B',domain:'compute',chapter:'operations'});
 assert.deepEqual(entryRoute(new URLSearchParams()),{phase:'E',domain:'conops',chapter:'operations'});
});

await test('Catalog mission preview preserves the installed family and saved mission',async()=>{
 const h=harness();
 try{
  const source=buildReferenceDesign('starmind-ai1',{missionCase:'source'});
  h.installDesign(source);h.visit('designs');h.previewCase('common');
  assert.deepEqual(h.input,source,'Changing the catalog comparison case is not a spacecraft installation.');
  const restored=h.reloadSnapshot();
  assert.deepEqual(restored.design,source,'Reload restores the actual source-case spacecraft despite a common-case catalog preview.');
  assert.equal(restored.design.architectureFamily,'starmind-cross');
  assert.equal(restored.design.referenceMissionCase,'source');
  assert.equal(restored.view.referenceMissionCase,'common');
 }finally{h.cleanup()}
});

await test('Earlier recipes and edited source variants survive save/import without migration',async()=>{
 const legacy=buildReferenceDesign('redwire-8kw',{revision:'odc-study-2026-11-r1'});
 const oldSaved=parsePreset(JSON.stringify(missionPreset({name:'Earlier Redwire study',design:legacy})));
 assert.deepEqual(oldSaved.design,legacy);
 assert.equal(oldSaved.design.architectureFamily,'protected-core');
 assert.equal(oldSaved.design.solarM2,96);
 assert.equal(referenceAssociation(oldSaved.design).archived,true);
 assert.equal(referenceAssociation(oldSaved.design).modified,false);
 const variant={...buildReferenceDesign('starcloud-3',{missionCase:'source'}),altitudeKm:825,batteryKWh:271};
 const saved=parsePreset(JSON.stringify(missionPreset({name:'Starcloud source mission variant',design:variant})));
 assert.deepEqual(saved.design,variant);
 assert.equal(referenceAssociation(saved.design).modified,true);
 assert.equal(saved.design.architectureFamily,'starcloud-inline');
 assert.equal(saved.design.solarM2,1721,'A save/import never replaces edited hardware from a refreshed reference recipe.');
 const h=harness();
 try{
  h.visit('designs');h.installDesign(saved.design);await h.back();
  assert.deepEqual(h.input,variant,'Browser Back restores navigation without replacing the installed variant.');
  assert.deepEqual(h.reloadSnapshot().design,variant);
 }finally{h.cleanup()}
});

console.log(JSON.stringify({passed:tests.length,tests},null,2));
