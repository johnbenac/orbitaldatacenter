import assert from 'node:assert/strict';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {dirname,relative,resolve,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {parse} from 'acorn';

// Package data, never executable code. Keep authored paragraphs in src/.
// Acorn supplies exact literal ranges and JavaScript string values; source
// code, identifiers, property keys, directives and module specifiers stay code.
const root=fileURLToPath(new URL('../',import.meta.url));
const families=['flight','materials','ground','launch'];
const minimumLength=120,check=process.argv.includes('--check');
const tableName='part-knowledge-text.js',entryName='knowledge.json';
const authored=[],identifiers=new Set(),strings=[],stringIds=new Map();
const parseModule=source=>parse(source,{ecmaVersion:'latest',sourceType:'module'});

function walk(node,visit,parent=null,field=null){
 if(!node||typeof node.type!=='string')return;
 visit(node,parent,field);
 for(const [key,value] of Object.entries(node)){
  if(Array.isArray(value)){for(const child of value)walk(child,visit,node,key);}
  else if(value&&typeof value==='object')walk(value,visit,node,key);
 }
}
function expressionString(node,parent,field){
 if(node.type!=='Literal'||typeof node.value!=='string'||node.value.length<minimumLength||!parent)return false;
 if(parent.type==='ExpressionStatement'&&parent.directive)return false;
 if(/^(?:Import|Export)/.test(parent.type))return false;
 if(['Property','MethodDefinition','PropertyDefinition'].includes(parent.type)&&field==='key'&&!parent.computed)return false;
 return true;
}
function modulePath(sourcePath,outputPath,specifier){
 if(!specifier.startsWith('.'))return specifier;
 const target=resolve(dirname(sourcePath),specifier);
 let result=relative(dirname(outputPath),target).split(sep).join('/');
 if(!result.startsWith('.'))result='./'+result;
 return result;
}

for(const family of families){
 const file='part-knowledge-'+family+'.js',sourcePath=resolve(root,'src/parts-knowledge',file),outputPath=resolve(root,'dist',file);
 const source=await readFile(sourcePath,'utf8'),ast=parseModule(source),edits=[];
 walk(ast,(node,parent,field)=>{
  if(node.type==='Identifier')identifiers.add(node.name);
  if(expressionString(node,parent,field)){
   if(!stringIds.has(node.value)){stringIds.set(node.value,strings.length);strings.push(node.value);}
   edits.push({start:node.start,end:node.end,index:stringIds.get(node.value)});
  }
  if(node.type==='ImportDeclaration'||node.type==='ExportAllDeclaration'||node.type==='ExportNamedDeclaration'){
   if(node.source){const specifier=modulePath(sourcePath,outputPath,node.source.value);if(specifier!==node.source.value)edits.push({start:node.source.start,end:node.source.end,replacement:JSON.stringify(specifier)});}
  }
 });
 authored.push({file,source,outputPath,edits});
}
let alias='__kt';while(identifiers.has(alias))alias+='_';
assert(strings.length>0,'The authoring modules contain no packageable paragraph literals.');

// Use the exact vendored ZIP implementation used by the site, with fixed
// metadata so identical authoring sources produce byte-identical artifacts.
await import(pathToFileURL(resolve(root,'dist/vendor/jszip.min.js')).href);
const Zip=globalThis.JSZip,zip=new Zip(),json=JSON.stringify(strings);
zip.file(entryName,json,{date:new Date('1980-01-01T00:00:00.000Z'),createFolders:false});
const base64=await zip.generateAsync({type:'base64',compression:'DEFLATE',compressionOptions:{level:9},platform:'DOS'});
const roundtrip=await Zip.loadAsync(base64,{base64:true,checkCRC32:true});
assert.equal(await roundtrip.file(entryName).async('string'),json,'ZIP preserves every UTF-8 byte of the string-table JSON.');
assert.deepEqual(JSON.parse(await roundtrip.file(entryName).async('string')),strings,'Every JavaScript string value is preserved.');
const digest=createHash('sha256').update(json).digest('hex');
const generated=[];
for(const item of authored){
 let output=item.source;
 for(const edit of item.edits.sort((a,b)=>b.start-a.start))output=output.slice(0,edit.start)+(edit.replacement??alias+'['+edit.index+']')+output.slice(edit.end);
 output='// Generated losslessly from src/parts-knowledge/'+item.file+'.\n// Edit the authored module, then run npm run package:parts-knowledge.\nimport {knowledgeText as '+alias+'} from "./'+tableName+'";\n'+output;
 parseModule(output);
 generated.push({path:item.outputPath,content:output});
}
const loader=`// Generated lossless paragraph data. Do not edit; run npm run package:parts-knowledge.
// Authored text: src/parts-knowledge/; JSON SHA-256: ${digest}
// The payload is JSON data only. The existing local JSZip decodes it once;
// no eval, executable archive, object URL, or external service is involved.
export const knowledgeText=Object.freeze(await(async()=>{
 if(!globalThis.JSZip)await import('./vendor/jszip.min.js');
 const archive=await globalThis.JSZip.loadAsync('${base64}',{base64:true,checkCRC32:true});
 const files=Object.values(archive.files).filter(file=>!file.dir);
 if(files.length!==1||files[0].name!=='${entryName}')throw new Error('Invalid parts knowledge text archive');
 const table=JSON.parse(await files[0].async('string'));
 if(!Array.isArray(table)||table.length!==${strings.length}||table.some(value=>typeof value!=='string'))throw new Error('Invalid parts knowledge text table');
 return table;
})());
`;
parseModule(loader);
generated.push({path:resolve(root,'dist',tableName),content:loader});
for(const item of generated){
 if(check){assert.equal(await readFile(item.path,'utf8'),item.content,relative(root,item.path)+' is stale; run npm run package:parts-knowledge.');}
 else{const temporary=item.path+'.tmp';await writeFile(temporary,item.content);await rename(temporary,item.path);}
}
const sourceBytes=authored.reduce((total,item)=>total+Buffer.byteLength(item.source),0),productionBytes=generated.reduce((total,item)=>total+Buffer.byteLength(item.content),0);
console.log(JSON.stringify({mode:check?'check':'write',modules:authored.length,minimumLiteralLength:minimumLength,uniqueStrings:strings.length,replacedLiterals:authored.reduce((total,item)=>total+item.edits.filter(edit=>'index'in edit).length,0),sourceBytes,productionBytes,savedBytes:sourceBytes-productionBytes,tableJsonBytes:Buffer.byteLength(json),base64ZipBytes:base64.length,sha256:digest},null,2));
