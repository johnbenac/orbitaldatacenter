import {defaults,applyPreset,normalizeDesign,sizeDesign,solveModes,validateDesign} from './design.js';
import {sanitizeTargets} from './thermal-review.js';
import {icon} from './icons.js';

const schema='odc-mission-preset/1';
export const shelfKey='odc.mission-presets.v1';
const escape=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const num=(x,n=1)=>Number.isFinite(x)?x.toLocaleString('en-US',{maximumFractionDigits:n}):'—';
export const powerLabel=h=>h.itKw>=1000?num(h.itKw/1000,2)+' MW':num(h.itKw,1)+' kW';
// Historical design IDs remain loadable from saved scenarios and old ?preset= links.
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
const buildNames={
 text:'Live text inference spacecraft',
 voice:'Live voice inference spacecraft',
 batch:'Batch inference spacecraft',
 agents:'Agentic research spacecraft',
 finetune:'Fine-tuning spacecraft',
 pretrain:'Pretraining spacecraft'
};

export function designName(view,design){
 const purpose=design?.input?.aiPurpose??design?.aiPurpose??view.aiPurpose??defaults.aiPurpose;
 const namedSnapshot=typeof view.presetName==='string'&&view.presetName.trim()&&(
  /^user-/.test(view.preset)||(view.preset==='custom'&&view.presetName!=='New mission')
 );
 const name=namedSnapshot?view.presetName.trim():(buildNames[purpose]||'Mission spacecraft');
 return name+(view.modified?' · edited':'');
}

export function presetShelf(view,shelf=[],hardware){
 const name=designName(view,hardware);
 const saved=shelf.some(p=>p.id===view.preset);
 const restorable=view.preset==='starter'||saved||presetList.some(p=>p.id===view.preset);
 const discard=view.modified&&restorable?`<button type="button" data-action="resetpreset" data-tip="Review the changes before restoring this ${saved?'saved design':'starting configuration'}.">Discard edits</button>`:'';
 return `<section class="current-design-strip" aria-label="Current design and saved designs">
  <div class="current-design-id"><span>Current design</span><strong title="${escape(name)}">${escape(name)}</strong></div>
  <div class="design-file-actions">
   <button type="button" class="chip" data-action="managepresets" aria-haspopup="dialog" data-tip="Open, export or remove a design saved in this browser.">${icon('hard-drive',13)} Saved designs <b>${shelf.length}</b></button>
   <button type="button" class="chip design-save" data-action="savepreset" aria-haspopup="dialog" data-tip="Save a named copy of the current design and its sizing choices.">${icon('download',13)} Save as…</button>
   <details class="design-more"><summary aria-label="More design actions">More ${icon('chevron-down',13)}</summary><div>
    <button type="button" data-action="newpreset">New mission</button><button type="button" data-action="loadpreset">Import design</button>${discard}
   </div></details>
  </div></section>`;
}
