import {readFile,writeFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {textureBankReadme} from '../dist/material-texture-download.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),assets=resolve(root,'dist/assets/materials');
const manifest=JSON.parse(await readFile(resolve(assets,'manifest.json'),'utf8'));
const metadata=Object.fromEntries(Object.entries(manifest.maps).map(([id,m])=>[id,{resolutionPx:m.resolutionPx,tileSizeM:m.tileSizeM}]));
await writeFile(resolve(root,'dist/material-texture-metadata.js'),'// Generated from assets/materials/manifest.json by scripts/package-material-library.mjs.\nexport const materialTextureMetadata='+JSON.stringify(metadata)+';\n');
const {spacecraftMaterials,materialLibraryRevision}=await import('../dist/spacecraft-materials.js');
const {materialSources}=await import('../dist/material-evidence.js');
const files=new Set(await readdir(assets));
for(const material of Object.values(spacecraftMaterials)){
 if(!manifest.maps[material.id])throw new Error('Texture metadata missing: '+material.id);
 for(const url of [material.texture.baseColorUrl,material.texture.normalUrl,material.texture.roughnessUrl,material.texture.previewUrl])if(!files.has(url.split('/').at(-1)))throw new Error('Texture missing: '+url);
 for(const id of material.sourceIds)if(!materialSources[id])throw new Error('Material source missing: '+id);
}
const record={schema:'orbital-data-center/material-library/1',revision:materialLibraryRevision,scope:'PDR material library; active assignment evidence and mass boundaries are in the spacecraft material register and master equipment list.',representation:'Original deterministic procedural maps. No vendor photographs, measured BRDF or qualification claims. Nominal pattern dimensions are illustrative visual allocations.',physicsBoundary:'RGB, roughness and normals are visual parameters. They do not set thermal optical coefficients, conductivity, strength, thickness or mass.',materials:Object.values(spacecraftMaterials),sources:Object.values(materialSources)};
await writeFile(resolve(assets,'material-library.json'),JSON.stringify(record,null,2)+'\n');
execFileSync('python3',['-c',String.raw`
import pathlib,zipfile,sys
p=pathlib.Path(sys.argv[1]); out=p.parents[2]/'artifacts'/'spacecraft-texture-bank.zip'; out.parent.mkdir(exist_ok=True)
readme=sys.argv[2]
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 def add(name,data):
  i=zipfile.ZipInfo(name,date_time=(2026,11,7,0,0,0));i.compress_type=zipfile.ZIP_DEFLATED;i.external_attr=0o644<<16;z.writestr(i,data)
 add('README.txt',readme)
 add('material-library.json',(p/'material-library.json').read_bytes())
 add('texture-manifest.json',(p/'manifest.json').read_bytes())
 for f in sorted(p.glob('*.webp')):add('assets/materials/'+f.name,f.read_bytes())
print(str(out)+' ('+str(out.stat().st_size)+' bytes)')
`,assets,textureBankReadme],{stdio:'inherit'});
console.log(Object.keys(spacecraftMaterials).length+' materials with complete texture sets and source records.');
