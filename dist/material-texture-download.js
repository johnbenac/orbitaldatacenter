// Assemble the bank from the exact maps used by the renderer. Keeping a second
// copy of every image in a deployed ZIP wastes the static asset budget.
export const textureBankReadme='SPACECRAFT MATERIAL AND TEXTURE BANK\n\nOriginal procedural visual representations for PDR studies.\nOpen material-library.json for composition, finish, sources and limitations.\nOpen texture-manifest.json for illustrative physical repeat scales.\nThe active spacecraft assignments and parent mass accounting are exported separately from the Materials & finishes page and MEL.\n\nFiles: color in sRGB; normal and roughness as linear data.\nSurface finish is not a thermal property, structural allowable, measured BRDF, vendor selection or material qualification.\nMaps use assets/materials/ paths to match the source catalog. Primary documents are linked, not redistributed.\n';

export async function buildTextureBank({load=globalThis.fetch,Zip=globalThis.JSZip,onProgress=()=>{}}={}){
 if(!Zip){await import('./vendor/jszip.min.js');Zip=globalThis.JSZip;}
 const read=async path=>{const response=await load(new URL('./'+path,import.meta.url));if(!response.ok)throw new Error('Could not load '+path+' ('+response.status+').');return response;};
 const [manifest,library]=await Promise.all([
  read('assets/materials/manifest.json').then(r=>r.json()),
  read('assets/materials/material-library.json').then(r=>r.json())
 ]);
 const paths=[...new Set(Object.values(manifest.maps).flatMap(m=>[m.baseColorPath,m.normalPath,m.roughnessPath,m.previewPath]))].sort();
 if(paths.length!==96||paths.some(p=>!/^assets\/materials\/[a-z0-9-]+\.webp$/.test(p)))throw new Error('The texture manifest is incomplete.');
 const zip=new Zip(),options={date:new Date('2026-11-07T00:00:00Z')};
 zip.file('README.txt',textureBankReadme,options);
 zip.file('texture-manifest.json',JSON.stringify(manifest,null,2)+'\n',options);
 zip.file('material-library.json',JSON.stringify(library,null,2)+'\n',options);
 let next=0,done=0,stopped=false;onProgress({stage:'maps',done,total:paths.length});
 await Promise.all(Array.from({length:6},async()=>{try{while(!stopped&&next<paths.length){const path=paths[next++],data=await (await read(path)).arrayBuffer();if(stopped)return;zip.file(path,data,options);onProgress({stage:'maps',done:++done,total:paths.length});}}catch(error){stopped=true;throw error;}}));
 onProgress({stage:'zip',done,total:paths.length});
 return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
}
