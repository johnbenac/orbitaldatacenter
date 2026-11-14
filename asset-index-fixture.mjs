import {readFileSync} from 'node:fs';
import {readJsonResponse} from './dist/json-asset.js';
export async function readStaticAssetIndex(){
 const path=new URL('./dist/assets.json.zip',import.meta.url);
 return readJsonResponse(new Response(readFileSync(path)),path.href);
}
