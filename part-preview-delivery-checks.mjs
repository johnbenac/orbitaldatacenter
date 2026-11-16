// Check the browser delivery boundary independently of the packaging implementation.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,readdirSync,rmSync,statSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=dirname(fileURLToPath(import.meta.url));
const packager=join(root,'scripts/package-part-preview-modules.py');
const names=['part-model','part-viewer'],mapId='part-preview-importmap';
const aliasPattern=/^part-(?:model|viewer)\.[0-9a-f]{64}\.js$/;
const hash=data=>createHash('sha256').update(data).digest('hex');
const zipRead=String.raw`
import json,sys
from zipfile import ZipFile
with ZipFile(sys.argv[1]) as z:
    i=z.getinfo('assets.json')
    p=z.read('assets.json').decode('utf-8')
    print(json.dumps({'names':z.namelist(),'date':i.date_time,'mode':i.external_attr>>16,
                      'compression':i.compress_type,'payload':p,'assets':json.loads(p)}))
`;
const zipWrite=String.raw`
import json,sys
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
info=ZipInfo('assets.json',date_time=(2026,11,7,0,0,0))
info.compress_type=ZIP_DEFLATED
info.external_attr=0o644<<16
with ZipFile(sys.argv[1],'w',compression=ZIP_DEFLATED,compresslevel=9) as z:
    z.writestr(info,(json.dumps(json.loads(sys.argv[2]),separators=(',',':'))+'\n').encode())
`;
const python=(code,args)=>execFileSync('python3',['-c',code,...args],
 {encoding:'utf8',timeout:10000});
function attrs(text){
 const result={};
 for(const match of text.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)){
  const key=match[1].toLowerCase();assert(!(key in result),'duplicate HTML attribute '+key);
  result[key]=match[2]??match[3]??match[4]??'';
 }
 return result;
}
function inspect(dist){
 const html=readFileSync(join(dist,'index.html'),'utf8').replace(/<!--[\s\S]*?-->/g,
  value=>value.replace(/[^\n]/g,' '));
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
  .map(match=>({attrs:attrs(match[1]),body:match[2],start:match.index,end:match.index+match[0].length}));
 const maps=scripts.filter(s=>s.attrs.id===mapId||s.attrs.type?.toLowerCase()==='importmap');
 assert.equal(maps.length,1,'exactly one preview import map must exist');
 const map=maps[0];
 assert.deepEqual(map.attrs,{type:'importmap',id:mapId},'map must be inline and owned');
 const heads=[...html.matchAll(/<head\b[^>]*>/gi)];
 assert.equal(heads.length,1);
 const headEnd=html.search(/<\/head\s*>/i);
 assert(map.start>=heads[0].index+heads[0][0].length&&map.end<headEnd,'map is inside head');
 assert.equal(html.slice(heads[0].index+heads[0][0].length,map.start).trim(),'',
  'map must precede every head resource');
 assert(!/<base\b[^>]*\bhref\s*=/i.test(html),'a base href requires an import resolution review');
 for(const script of scripts.filter(s=>s.attrs.type?.toLowerCase()==='module'))
  assert(map.end<script.start,'import map precedes module execution');
 for(const link of html.matchAll(/<link\b([^>]*)>/gi))
  if(attrs(link[1]).rel?.toLowerCase().split(/\s+/).includes('modulepreload'))
   assert(map.end<link.index,'import map precedes modulepreload');
 const parsed=JSON.parse(map.body);
 assert.deepEqual(Object.keys(parsed),['imports']);
 assert.deepEqual(Object.keys(parsed.imports),names.map(name=>'./'+name+'.js'),'exact mapping keys');
 const aliases=[];
 for(const name of names){
  const source=readFileSync(join(dist,name+'.js'));
  const alias=name+'.'+hash(source)+'.js';aliases.push(alias);
  assert.equal(parsed.imports['./'+name+'.js'],'./'+alias,'map uses full content hash');
  assert(readFileSync(join(dist,alias)).equals(source),'alias bytes match '+name+'.js');
 }
 assert.deepEqual(readdirSync(dist).filter(name=>aliasPattern.test(name)).sort(),aliases.sort(),
  'no stale generated aliases');
 const packed=JSON.parse(python(zipRead,[join(dist,'assets.json.zip')]));
 assert.deepEqual(packed.names,['assets.json']);
 assert.deepEqual(packed.date,[2026,11,7,0,0,0]);
 assert.equal(packed.mode,0o644);assert.equal(packed.compression,8);
 assert(Array.isArray(packed.assets)&&packed.assets.every(path=>typeof path==='string'));
 assert.deepEqual(packed.assets,[...new Set(packed.assets)].sort(),'sorted unique asset index');
 assert.equal(packed.payload,JSON.stringify(packed.assets)+'\n','compact packed JSON');
 assert.deepEqual(packed.assets.filter(name=>aliasPattern.test(name)),aliases);
 for(const name of names)assert(packed.assets.includes(name+'.js'),'original stays indexed');
 assert(/\bfrom\s*['"]\.\/part-model\.js['"]/.test(
  readFileSync(join(dist,'part-viewer.js'),'utf8')),'viewer retains its relative model import');
 for(const base of ['https://delivery.invalid/',
  'https://delivery.invalid/tools/orbital/index.html?center=star-catcher-self-powered']){
  const normalized=new Map(Object.entries(parsed.imports)
   .map(([key,value])=>[new URL(key,base).href,new URL(value,base).href]));
  const resolveImport=(specifier,importer)=>{
   const url=new URL(specifier,importer).href;return normalized.get(url)??url;
  };
  const viewer=resolveImport('./part-viewer.js',new URL('./parts-ui.js',base));
  assert.equal(viewer,new URL(parsed.imports['./part-viewer.js'],base).href);
  assert.equal(resolveImport('./part-model.js',viewer),
   new URL(parsed.imports['./part-model.js'],base).href,'nested hashed viewer resolves hashed model');
  assert.equal(resolveImport('./vendor/three.module.js',viewer),
   new URL('./vendor/three.module.js',base).href,'other relative dependencies stay unchanged');
 }
 return {html,aliases};
}
function runPackager(dist,check=false){
 return spawnSync('python3',[packager,'--dist',dist,...(check?['--check']:[])],
  {encoding:'utf8',timeout:10000});
}
function snapshot(dist){
 return readdirSync(dist).sort().map(name=>{
  const file=join(dist,name),stat=statSync(file,{bigint:true});
  return [name,hash(readFileSync(file)),String(stat.mtimeNs)];
 });
}
function fixtures(){
 const dist=mkdtempSync(join(tmpdir(),'odc-preview-delivery-'));
 try{
  const originals={
   'part-model.js':"export const model='preview';\n",
   'part-viewer.js':"import {model} from './part-model.js';\nexport const viewer=model;\n",
   'index.html':'<!doctype html><html><head><meta charset="utf-8"></head><body>'+
    '<script type="module" src="./bootstrap.js"></script></body></html>\n',
   'part-model.keep.js':'unrelated file stays untouched\n'
  };
  for(const [name,data] of Object.entries(originals))writeFileSync(join(dist,name),data);
  const obsolete='part-viewer.'+'0'.repeat(64)+'.js';
  writeFileSync(join(dist,obsolete),'obsolete generated alias\n');
  python(zipWrite,[join(dist,'assets.json.zip'),JSON.stringify([...Object.keys(originals),obsolete].sort())]);
  assert.equal(runPackager(dist).status,0,'writer packages the fixture');
  inspect(dist);
  assert.deepEqual(JSON.parse(python(zipRead,[join(dist,'assets.json.zip')])).assets
   .filter(name=>!aliasPattern.test(name)),Object.keys(originals).sort(),
   'every unrelated asset-index entry survives packaging');
  assert.equal(readFileSync(join(dist,'part-model.keep.js'),'utf8'),originals['part-model.keep.js']);
  for(const name of names)assert.equal(readFileSync(join(dist,name+'.js'),'utf8'),originals[name+'.js']);
  const stable=snapshot(dist);
  assert.equal(runPackager(dist).status,0);assert.deepEqual(snapshot(dist),stable,'writer is idempotent');
  assert.equal(runPackager(dist,true).status,0);assert.deepEqual(snapshot(dist),stable,'check is read-only');
  const goodHtml=readFileSync(join(dist,'index.html'),'utf8');
  const bad=(label,mutate,restore)=>{
   mutate();const before=snapshot(dist),result=runPackager(dist,true);
   assert.equal(result.status,1,label+' rejected by packager');
   assert.match(result.stderr,/preview delivery is stale:/);
   assert.deepEqual(snapshot(dist),before,label+' check remains read-only');
   assert.throws(()=>inspect(dist),undefined,label+' rejected independently');
   restore();inspect(dist);
  };
  bad('changed source',()=>writeFileSync(join(dist,'part-model.js'),originals['part-model.js']+'// changed\n'),
   ()=>writeFileSync(join(dist,'part-model.js'),originals['part-model.js']));
  const modelAlias='part-model.'+hash(originals['part-model.js'])+'.js';
  bad('changed alias',()=>writeFileSync(join(dist,modelAlias),'wrong bytes\n'),
   ()=>writeFileSync(join(dist,modelAlias),originals['part-model.js']));
  bad('missing alias',()=>rmSync(join(dist,modelAlias)),
   ()=>writeFileSync(join(dist,modelAlias),originals['part-model.js']));
  bad('stale map',()=>writeFileSync(join(dist,'index.html'),goodHtml.replace(modelAlias,'part-model.js')),
   ()=>writeFileSync(join(dist,'index.html'),goodHtml));
  bad('missing map',()=>writeFileSync(join(dist,'index.html'),originals['index.html']),
   ()=>writeFileSync(join(dist,'index.html'),goodHtml));
  const late=goodHtml.replace(/\n<script type="importmap"[\s\S]*?<\/script>\n/,
   '<script type="module" src="./early.js"></script>\n$&');
  bad('late map',()=>writeFileSync(join(dist,'index.html'),late),
   ()=>writeFileSync(join(dist,'index.html'),goodHtml));
  const goodIndex=readFileSync(join(dist,'assets.json.zip'));
  bad('stale index',()=>python(zipWrite,[join(dist,'assets.json.zip'),JSON.stringify(Object.keys(originals).sort())]),
   ()=>writeFileSync(join(dist,'assets.json.zip'),goodIndex));
  bad('stale alias file',()=>writeFileSync(join(dist,obsolete),'stale\n'),
   ()=>rmSync(join(dist,obsolete)));
 }finally{rmSync(dist,{recursive:true,force:true});}
}

const args=process.argv.slice(2);
assert(args.length===0||(args.length===2&&args[0]==='--dist'),
 'usage: node part-preview-delivery-checks.mjs [--dist DIRECTORY]');
inspect(args.length?resolve(args[1]):join(root,'dist'));
fixtures();
console.log('Part preview delivery: exact SHA-256 aliases, early import map, packed index, '+
 'root/subdirectory and nested imports, idempotence and eight negative fixtures passed.');
