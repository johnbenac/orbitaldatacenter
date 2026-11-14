import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const repository=fileURLToPath(new URL('..',import.meta.url));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const code=/\.(?:mjs|cjs|js)$/i;
const publicSource=/\.(?:mjs|cjs|js|json|geojson|json\.zip|geojson\.zip)$/i;

/** Exact public source identity; never reads .git, credentials or hosting state. */
export function routingSourceFingerprint({entries=[],includeAllSources=false,root=repository}={}){
 root=path.resolve(root);const files=new Set(),pending=entries.map(entry=>path.resolve(root,entry));
 const within=file=>{const relative=path.relative(root,file);return relative&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);};
 function walk(directory,predicate){if(!fs.existsSync(directory))return;for(const item of fs.readdirSync(directory,{withFileTypes:true})){if(item.name.startsWith('.'))continue;const file=path.join(directory,item.name);if(item.isDirectory())walk(file,predicate);else if(item.isFile()&&predicate(file))pending.push(file);}}
 if(includeAllSources){
  for(const item of fs.readdirSync(root,{withFileTypes:true}))if(item.isFile()&&!item.name.startsWith('.')&&publicSource.test(item.name))pending.push(path.join(root,item.name));
  walk(path.join(root,'dist'),file=>publicSource.test(file));walk(path.join(root,'scripts'),file=>publicSource.test(file));
 }
 // Data catalogs may be passed to a loader rather than imported directly.
 // Include every public JSON/archive asset even for an entrypoint closure.
 walk(path.join(root,'dist'),file=>/\.(?:json|geojson)(?:\.zip)?$/i.test(file));
 while(pending.length){
  const file=pending.pop();if(files.has(file))continue;if(!within(file))throw new Error('Routing source dependency leaves the repository: '+file);if(!fs.statSync(file).isFile())throw new Error('Routing source dependency is not a file: '+file);files.add(file);
  // The complete-source mode already includes the declared public trees.
  // Build scripts can contain quoted imports intended for generated files;
  // treating those strings as dependencies of the build script is incorrect.
  if(!code.test(file)||includeAllSources)continue;const source=fs.readFileSync(file,'utf8');
  const imports=source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["'](\.[^"']+)["']/g);
  for(const match of imports)pending.push(path.resolve(path.dirname(file),match[1]));
  for(const match of source.matchAll(/new\s+URL\(\s*["'](\.[^"']+)["']\s*,\s*import\.meta\.url\s*\)/g)){
   const target=path.resolve(path.dirname(file),match[1]);if(fs.existsSync(target)&&fs.statSync(target).isFile())pending.push(target);
  }
 }
 if(!files.size)throw new Error('Routing source fingerprint needs at least one source entrypoint');
 const manifest=[...files].sort().map(file=>({path:path.relative(root,file).split(path.sep).join('/'),sha256:digest(fs.readFileSync(file))}));
 return {algorithm:'sha256',value:digest(JSON.stringify(manifest)),files:manifest};
}

export function sameRoutingSourceFingerprint(a,b){return a?.algorithm==='sha256'&&b?.algorithm==='sha256'&&a.value===b.value&&JSON.stringify(a.files)===JSON.stringify(b.files);}
