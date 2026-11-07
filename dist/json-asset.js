// Local JSON assets may be packaged as a one-file ZIP. Compression preserves
// the original UTF-8 bytes and numeric precision. The existing ZIP library is
// loaded only when a compressed asset is requested; plain JSON remains valid.
let zipPromise;
async function zipLibrary(){
 if(globalThis.JSZip)return globalThis.JSZip;
 zipPromise??=import('./vendor/jszip.min.js').then(()=>globalThis.JSZip);
 return zipPromise;
}
export async function extractJsonArchive(bytes,name){
 const Zip=await zipLibrary(),archive=await Zip.loadAsync(bytes,{checkCRC32:true});
 const files=Object.values(archive.files).filter(file=>!file.dir);
 if(files.length!==1||files[0].name!==name||!name.endsWith('.json'))throw new Error('Invalid JSON asset archive');
 return files[0].async('uint8array');
}
export async function readJsonResponse(response,url){
 if(!response.ok)throw new Error('Unable to load JSON asset: '+url);
 if(!/\.json\.zip(?:[?#]|$)/i.test(String(url)))return response.json();
 const name=String(url).split(/[?#]/)[0].split('/').at(-1).replace(/\.zip$/i,'');
 const bytes=await extractJsonArchive(await response.arrayBuffer(),name);
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export async function fetchJsonAsset(url,options){return readJsonResponse(await fetch(url,options),url);}
