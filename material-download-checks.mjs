import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {buildTextureBank} from './dist/material-texture-download.js';

const module={exports:{}};
runInNewContext(await readFile(new URL('./dist/vendor/jszip.min.js',import.meta.url),'utf8'),{module,exports:module.exports,require:name=>{throw Error(name)},Buffer,Promise,setImmediate,clearImmediate,setTimeout,clearTimeout,ArrayBuffer,Uint8Array,Blob,TextEncoder,TextDecoder});
const Zip=module.exports,progress=[];
const load=async url=>new Response(await readFile(url));
const blob=await buildTextureBank({load,Zip,onProgress:p=>progress.push(p)});
const zip=await Zip.loadAsync(await blob.arrayBuffer());
const paths=Object.keys(zip.files).filter(path=>!zip.files[path].dir);
assert.equal(paths.length,99,'96 image assets, catalog, manifest and README');
for(const path of paths.filter(p=>p.endsWith('.webp'))){
 assert.deepEqual(Buffer.from(await zip.file(path).async('uint8array')),await readFile(new URL('./dist/'+path,import.meta.url)),path+' retains original pixels and encoding');
}
const library=JSON.parse(await zip.file('material-library.json').async('string'));
assert.equal(library.materials.length,24);
assert.equal(library.sources.length,29);
assert.equal(progress.filter(p=>p.stage==='maps').at(-1).done,96);
assert.equal(progress.at(-1).stage,'zip');
await assert.rejects(()=>buildTextureBank({Zip,load:async url=>url.pathname.endsWith('aluminum-anodized-base.webp')?new Response('',{status:404}):load(url)}),/Could not load.*404/,'A missing asset produces a retryable failure rather than an incomplete ZIP');
console.log(JSON.stringify({status:'pass',archiveFiles:paths.length,mapsUnchanged:96,materials:24,sources:29,downloadBytes:blob.size,progressAndFailureHandling:'pass'}));
