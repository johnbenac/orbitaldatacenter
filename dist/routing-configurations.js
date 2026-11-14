import {aiPurposes} from './ai-purpose.js';
import {missionStarter} from './design.js';
import {buildReferenceDesign,referenceConfigurationMetadata} from './reference-configurations.js';

// The navigation exposes every purpose's complete starting spacecraft, as
// well as every reference study. Keep one source of truth for their geometry
// gates; checking only the default text mission misses five distinct buses.
export function routingCraftCatalog(){
 const starters=Object.entries(aiPurposes).map(([purpose,record])=>({
  id:purpose==='text'?'protected-core':'mission-'+purpose,
  kind:'mission-starter',purpose,label:record.label,input:missionStarter(purpose)
 }));
 const references=Object.entries(referenceConfigurationMetadata).map(([id,record])=>({
  id,kind:'reference-study',label:record.name||record.label||id,input:buildReferenceDesign(id)
 }));
 const result=[...starters,...references],ids=new Set(result.map(r=>r.id));
 if(ids.size!==result.length)throw new Error('Duplicate shipped routing configuration ID');
 return result;
}

// Preserve the existing [id, input] interface used by the flight gates.
export const routingCraftConfigurations=()=>routingCraftCatalog().map(({id,input})=>[id,input]);
