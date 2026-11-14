// JSON has no representation for Infinity or NaN. A straight tube legitimately
// has an infinite bend radius; invalid numeric inputs must also remain invalid
// after a report is exported. Only explicitly tagged paths are restored.
export const routingExportSchema='orbital-routing-export-v1';
const numberEncoding='path-tagged-json-numbers-v1';
const tokenFor=n=>Number.isNaN(n)?'NaN':n===Infinity?'Infinity':n===-Infinity?'-Infinity':Object.is(n,-0)?'-0':null;
const valueFor=token=>({Infinity:Infinity,'-Infinity':-Infinity,NaN:NaN,'-0':-0})[token];
const tokens=new Set(['Infinity','-Infinity','NaN','-0']);
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);

export function encodeRoutingExport(payload){
 const specialNumbers=[],ancestors=new Set();
 function encode(value,path){
  if(typeof value==='number'){const token=tokenFor(value);if(token){specialNumbers.push({path:[...path],value:token});return null;}return value;}
  if(['undefined','function','symbol'].includes(typeof value))return undefined;
  if(typeof value==='bigint')throw new TypeError('Routing export requires JSON-compatible numbers');
  if(!value||typeof value!=='object')return value;
  if(ancestors.has(value))throw new TypeError('Routing export contains a circular object');ancestors.add(value);
  if(typeof value.toJSON==='function'){const result=encode(value.toJSON(path.at(-1)||''),path);ancestors.delete(value);return result;}
  const result=Array.isArray(value)?value.map((item,index)=>encode(item,[...path,index])??null):Object.fromEntries(Object.entries(value).map(([key,item])=>[key,encode(item,[...path,key])]).filter(([,item])=>item!==undefined));ancestors.delete(value);return result;
 }
 return {schema:routingExportSchema,numberEncoding,payload:encode(payload,[]),specialNumbers};
}

export function serializeRoutingExport(payload,space=2){return JSON.stringify(encodeRoutingExport(payload),null,space);}

export function parseRoutingExport(input){
 const envelope=typeof input==='string'?JSON.parse(input):input;
 if(!envelope||envelope.schema!==routingExportSchema||envelope.numberEncoding!==numberEncoding||!own(envelope,'payload')||!Array.isArray(envelope.specialNumbers))throw new TypeError('Unsupported routing export schema or number encoding');
 // Copy JSON data without normalizing negative zero or accepting an untagged
 // overflow literal such as1e999. The caller's document is never mutated.
 const ancestors=new Set();function copy(value){if(value===null||typeof value==='string'||typeof value==='boolean')return value;if(typeof value==='number'){if(!Number.isFinite(value))throw new TypeError('Routing export contains an untagged non-finite number');return value;}if(!value||typeof value!=='object')throw new TypeError('Routing export payload must be JSON data');if(ancestors.has(value))throw new TypeError('Routing export contains a circular object');ancestors.add(value);const result=Array.isArray(value)?value.map(copy):Object.fromEntries(Object.entries(value).map(([key,item])=>[key,copy(item)]));ancestors.delete(value);return result;}
 let payload=copy(envelope.payload);const restored=new Set();
 for(const marker of envelope.specialNumbers){
  if(!marker||!Array.isArray(marker.path)||!tokens.has(marker.value))throw new TypeError('Invalid routing special-number marker');const key=JSON.stringify(marker.path);if(restored.has(key))throw new TypeError('Duplicate routing special-number path');restored.add(key);
  if(!marker.path.length){if(payload!==null)throw new TypeError('A routing number marker must replace its own null placeholder');payload=valueFor(marker.value);continue;}
  let parent=payload;for(let i=0;i<marker.path.length;i++){const part=marker.path[i],array=Array.isArray(parent);if(!parent||typeof parent!=='object'||(array?!(Number.isInteger(part)&&part>=0&&part<parent.length):typeof part!=='string')||!own(parent,part))throw new TypeError('Routing special-number path does not exist');if(i===marker.path.length-1){if(parent[part]!==null)throw new TypeError('A routing number marker cannot overwrite a finite value');Object.defineProperty(parent,part,{value:valueFor(marker.value),writable:true,enumerable:true,configurable:true});}else parent=parent[part];}
 }
 return payload;
}
