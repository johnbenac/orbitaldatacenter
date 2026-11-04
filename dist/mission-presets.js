import {defaults,applyPreset,normalizeDesign,sizeDesign,inverseSolve,solveModes,validateDesign} from './design.js';
import {sanitizeTargets} from './thermal-review.js';
import {icon} from './icons.js';

const schema='odc-mission-preset/1';
export const shelfKey='odc.mission-presets.v1';
const escape=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const num=(x,n=1)=>Number.isFinite(x)?x.toLocaleString('en-US',{maximumFractionDigits:n}):'—';
export const powerLabel=h=>h.itKw>=1000?num(h.itKw/1000,2)+' MW':num(h.itKw,1)+' kW';
export const presetList=[
 {id:'pathfinder',name:'Pathfinder',type:'Compact demonstrator',icon:'satellite',design:{...defaults,trayCount:4,solarM2:66,radiatorM2:23,batteryKWh:16,storageTB:4,propellantKg:220}},
 {id:'reference',name:'Reference node',type:'Balanced compute',icon:'cpu',design:{...defaults}},
 {id:'optical',name:'Optical downlink',type:'Bulk downlink',icon:'radio',design:{...defaults,link:'auto',initialQueueGB:18000,storageTB:32,bulkMbps:160}},
 {id:'carrier',name:'Compute carrier',type:'High-duty compute',icon:'layers-3',design:{...applyPreset(defaults,'launcher','glenn'),trayCount:26,solarM2:390,radiatorM2:132.6,batteryKWh:104,propellantKg:850,storageTB:32,launchAllowanceKg:32000}},
 {id:'scale',name:'10 MW study',type:'Launch-limit case',icon:'rocket',design:{...applyPreset(applyPreset(defaults,'launcher','starship'),'compute','dgx'),trayCount:981,solarM2:86000,radiatorM2:31000,batteryKWh:15000,storageTB:512,propellantKg:45000,launchAllowanceKg:85000}}
].map(p=>({...p,h:sizeDesign(p.design)}));
export const customId=()=> 'user-'+crypto.randomUUID();
export function missionPreset({id=customId(),name,description='',design,solver='installed',thermalTargets={},thermalPadding=0,thermalScope='window'}){
 const title=String(name||'').trim();if(!title||title.length>64)throw Error('Give the preset a name between 1 and 64 characters.');
 if(typeof description!=='string'||description.length>320)throw Error('Keep the preset description to 320 characters.');
 if(typeof design!=='object'||!design||Array.isArray(design)||!Object.keys(design).length)throw Error('A preset needs its mission design inputs.');
 for(const [k,v] of Object.entries(design))if(Object.hasOwn(defaults,k)&&typeof defaults[k]==='number'&&!Number.isFinite(v))throw Error('Invalid numeric preset input: '+k);
 const d=normalizeDesign(design),errors=validateDesign(d);if(errors.length)throw Error(errors[0]);if(!Object.hasOwn(solveModes,solver))throw Error('Unknown sizing method in preset.');
 return {schema,id:/^user-[a-zA-Z0-9-]{1,96}$/.test(id)?id:customId(),name:title,description:description.trim(),design:d,solver,thermalTargets:sanitizeTargets(thermalTargets),thermalScope:thermalScope==='mission'?'mission':'window',thermalPadding:Math.min(100,Math.max(0,Number(thermalPadding)||0))};
}
export function parsePreset(text){
 if(typeof text!=='string'||text.length>750000)throw Error('Choose a mission preset JSON under 750 kB.');
 let obj;try{obj=JSON.parse(text)}catch{throw Error('This file is not valid JSON.')}
 if(obj?.schema!==schema)throw Error('Choose an ODC mission preset JSON. Scenario and PDR files open through Export & import.');
 return missionPreset(obj);
}
export const presetFileName=name=>(String(name).normalize('NFKD').replace(/[^A-Za-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)||'mission')+'.odc-preset.json';
export function addToShelf(existing,record){
 const same=existing.find(p=>p.id===record.id);
 if(same&&JSON.stringify(same)===JSON.stringify(record))return {shelf:existing,record:same};
 if(existing.length>=50)throw Error('Unload a preset before adding another. This shelf holds 50.');
 const item=same?{...record,id:customId()}:record;return {shelf:[...existing,item],record:item};
}
export function readShelf(storage){
 const saved=storage?.getItem(shelfKey);if(!saved)return [];
 const data=JSON.parse(saved);if(!Array.isArray(data)||data.length>50)throw Error('Preset shelf could not be read.');
 return data.map(item=>parsePreset(JSON.stringify(item)));
}
export const writeShelf=(storage,shelf)=>storage.setItem(shelfKey,JSON.stringify(shelf));
export function designName(view){
 const builtin=presetList.find(p=>p.id===view.preset);
 return (builtin?.name||view.presetName||'New mission')+(view.modified?' · edited':'');
}
function card(p,view,custom=false){
 const selected=view.preset===p.id,hw=p.h||inverseSolve(p.design,p.solver).hardware;
 return `<button class="designcard ${selected?'active':''}" data-design="${escape(p.id)}" aria-pressed="${selected}" data-tip="${escape((p.description||p.type||'Saved mission')+' · '+hw.ai.label+' · '+hw.trays+' trays, '+num(hw.batteryKWh)+' kWh and '+num(hw.storageTB)+' TB. Load this configuration into the same design cell.')}"><span class="designicon">${icon(custom?'hard-drive':p.icon,17)}</span><span><strong>${escape(p.name)}</strong><small>${powerLabel(hw)} <b>·</b> ${num(hw.storageTB,0)} TB</small></span><i></i></button>`;
}
export function presetShelf(view,shelf=[]){
 return `<section class="presetbank" aria-label="Mission presets"><div class="bankheading"><span class="guideflag">MISSION DESIGN PRESETS</span><button class="guide-hint" data-guide-key="missionPreset" aria-label="How to choose a mission preset">?</button><span class="bankcaption">${escape(designName(view))}</span><div class="shelf-actions">${view.modified&&(presetList.some(p=>p.id===view.preset)||shelf.some(p=>p.id===view.preset))?'<button class="chip" data-action="resetpreset" data-tip="Reload the selected preset’s saved inputs and discard this temporary edit.">Reload saved values</button>':''}<button class="chip" data-action="newpreset">New mission</button><button class="chip" data-action="loadpreset">${icon('upload',12)} Load preset</button><button class="chip primary-chip" data-action="savepreset">${icon('download',12)} Save as preset</button></div></div><div class="designstrip">${presetList.map(p=>card(p,view)).join('')}</div>${shelf.length?`<div class="loaded-row"><div class="bankheading"><span class="guideflag">YOUR PRESETS</span><button class="bankedit" data-action="managepresets">Manage shelf ${icon('chevron-right',12)}</button></div><div class="loaded-presets">${shelf.map(p=>card(p,view,true)).join('')}</div></div>`:''}</section>`;
}

