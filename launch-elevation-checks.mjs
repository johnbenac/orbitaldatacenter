import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractJsonArchive,readJsonResponse} from './dist/json-asset.js';
import {regions} from './dist/assets/launch-sites/catalog.js';
const proof=JSON.parse(readFileSync('scripts/launch-elevation-integrity.json','utf8'));
assert.equal(proof.files.length,6);
for(const row of proof.files){
 const zipped=readFileSync(row.archive),bytes=await extractJsonArchive(zipped,row.name),original=execFileSync('git',['show',proof.baseCommit+':'+row.source]);
 assert.deepEqual(Buffer.from(bytes),original,row.name+' exact original JSON bytes');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);
 const grid=await readJsonResponse(new Response(zipped),row.archive),reference=JSON.parse(original.toString('utf8'));
 assert.deepEqual(grid,reference,row.name+' all coordinates, samples, values and metadata');
 assert.equal(grid.values.length,row.width*row.height);
 assert(Object.values(regions).some(region=>region.elevation.url===row.archive.replace(/^dist\//,'')),row.name+' active catalog URL');
}
const plain={width:2,height:2,values:[1.125,2.25,3.5,4.75]};
assert.deepEqual(await readJsonResponse(new Response(JSON.stringify(plain)),'legacy-elevation.json'),plain,'Plain JSON compatibility');
console.log('Six compressed elevation grids match every original Git byte and parsed value; lazy ZIP extraction, active catalog URLs and plain JSON compatibility passed.');
