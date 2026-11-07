// Opening a fresh link and reloading an existing tab are different operations.
// Query parameters describe a starting point. A tab checkpoint restores the actual design.
import {chapters} from './flight-chapters.js';
import {phases,chapterPhase} from './lifecycle.js';
import {domains,canonicalDomainId} from './domain-analysis.js';
import {DEPLOY_START_S} from './commissioning-clock.js';
import {DAY} from './orbit.js';

export function entryRoute(query){
 // A fresh visit opens the operating mission; explicit links retain their own starting point.
 if(!query.toString())return {phase:'E',domain:'conops',chapter:'operations'};
 const selected=chapters.find(item=>item.id===query.get('chapter'));
 const domain=canonicalDomainId(query.get('domain')||query.get('subsystem'));
 const requestedPhase=(query.get('phase')||'').toUpperCase();
 const phase=Object.hasOwn(phases,requestedPhase)?requestedPhase:selected?chapterPhase(selected.id):query.has('center')?'E':'A';
 const compatible=selected&&(!['D','E','F'].includes(phase)||phase===chapterPhase(selected.id));
 const chapter=compatible?selected.id:({D:'integration',F:'deorbit'}[phase]||'operations');
 return {phase,domain:Object.hasOwn(domains,domain)?domain:'conops',chapter};
}

export function entryClock(view,query,sim){
 const met=query.get('met');
 if(met!==null&&met.trim()&&Number.isFinite(Number(met))){
  const lo=view.phase==='F'?sim.ignition:view.phase==='E'?DEPLOY_START_S:-3600;
  const hi=view.phase==='D'?DEPLOY_START_S:sim.duration;
  return Math.max(lo,Math.min(hi,Number(met)));
 }
 const stage=sim.story(view.chapter);
 if(view.phase==='D')return view.chapter==='pad'?-8:stage.start;
 if(view.phase==='F'||view.chapter==='commissioning')return stage.start;
 return stage?.instant??3438;
}

// Dynamic chapters search simulated events. Warm the first operating window
// before resolving them so a fresh reference link does not integrate on the UI
// thread merely to choose its initial clock. Explicit times and fixed launch
// chapters already have cheap, deterministic clocks.
export function entryPreparationClock(view,query,sim){
 const met=query.get('met');
 if(met!==null&&met.trim()&&Number.isFinite(Number(met)))return entryClock(view,query,sim);
 if(['integration','pad','ascent','insertion','commissioning'].includes(view.chapter))return entryClock(view,query,sim);
 return view.phase==='F'?sim.ignition:Math.min(sim.duration,3438);
}

// Keep the visitor's study interval until the cursor crosses its boundary.
export function windowStartFor(cursor,start,duration){
 const shift=Math.floor((cursor-start)/DAY);
 return Math.max(0,Math.min(Math.max(0,duration-DAY),start+shift*DAY));
}

const checkpointKey='odc-workspace-v1';

export function tabCheckpoint(win,location,snapshot){
 // Each history entry owns its snapshot. A clean visit or a newly opened design
 // link still uses its own inputs. Storage is optional in a sandboxed iframe.
 const entry=()=>location.pathname+location.search+(location.hash.startsWith('#design=')?location.hash:'');
 const valid=record=>record?.entry===entry()&&record.scenario?.schema==='odc-scenario/1';
 let pending=null,lastWorkspace;
 function read(){
  try{
   const type=win.performance?.getEntriesByType?.('navigation')[0]?.type;
   if(type==='reload'){
    const r=JSON.parse(win.sessionStorage.getItem(checkpointKey));if(valid(r))return r.scenario;
   }
  }catch{}
  try{const r=win.history?.state?.[checkpointKey];if(valid(r))return r.scenario}catch{}
  return null;
 }
 function save(){
  clearTimeout(pending);pending=null;
  const record={entry:entry(),scenario:snapshot()};
  try{win.history?.replaceState({...win.history.state,[checkpointKey]:record},'')}catch{}
  try{win.sessionStorage?.setItem(checkpointKey,JSON.stringify(record))}catch{}
 }
 function schedule(workspace){
  if(workspace!==lastWorkspace){lastWorkspace=workspace;save()}
  else if(pending===null)pending=setTimeout(save,180);
 }
 return {read,save,schedule};
}
