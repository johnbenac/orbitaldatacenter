"""Package only selected production artwork, editable sources and license evidence."""
from pathlib import Path
from PIL import Image
import hashlib,json,zipfile
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'orbit-landmarks-v5-delivery';OUT.mkdir(exist_ok=True)
IDS=['redwire-8kw','starcloud-3','starmind-ai1','orbital-1-202609','orbital-1-202606','star-catcher-self-powered']
POSTER='orbital-data-center-plans-orbit-landmarks-4x5.png'
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
def tree(directory):
 return [p.relative_to(ROOT).as_posix() for p in (ROOT/directory).rglob('*') if p.is_file() and '__pycache__' not in p.parts]
def archive(name,files):
 files=sorted(set(files));target=OUT/name
 with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for f in files:z.write(ROOT/f,f)
  z.writestr('SHA256SUMS',''.join(f'{digest(ROOT/f)}  {f}\n' for f in files))
 with zipfile.ZipFile(target) as z:assert z.testzip() is None
 return dict(file=name,bytes=target.stat().st_size,sha256=digest(target),entries=len(files)+1)
assert Image.open(ROOT/POSTER).size==(2000,2500)
for ident in IDS:assert Image.open(ROOT/'renders'/f'{ident}.png').size==(2400,1350)
checks=json.loads((ROOT/'scene-validation.json').read_text());assert len(checks)==6
base=[POSTER,'poster.html','README.md','POST-TEXT.txt','ARTWORK-LICENSE.md','LICENSE','MODEL-CREDITS.json','DIMENSION-SOURCES.json','logo-sources.json','poster-validation.json','scene-validation.json','ORIGINAL-MODEL-PROVENANCE.json','ORIGINAL-POSE-VERIFICATION.json','ORIGINAL-SCENE-VALIDATION.json','ORIGINAL-SCENE-CREDITS.txt']
base+=tree('logos')+tree('fonts')+[f'renders/{i}.png' for i in IDS]+[f'audits/{i}.json' for i in IDS]
base+=['landmarks/space-needle-printables.png','landmarks/space-needle-leg-detail.png']
source=base+[f'scenes/{i}.blend' for i in IDS]+[f'original-scenes/{i}.blend' for i in IDS]+tree('original-source')
source+=['source/'+f for f in ['render-all.py','render-orbital.py','render-poster.py','render-needle-detail.py','import-needle.py','fix-taj-materials.py','pyramid-exterior.py','validate-scenes.py','package-delivery.py']]
source+=['assets/'+f for f in ['liberty.glb','liberty.json','bigben.glb','bigben.json','eiffel.glb','taj.glb','taj-c8eb2e89098746898b94f0b556ecdefe.json','printables-needle-files.json']]
source+=tree('assets/taj-diffuse')+tree('assets/needle-printables')+['landmarks/space-needle-printables.blend','landmarks/space-needle-printables.glb']
records=[archive('orbital-landmarks-v5-artwork.zip',base),archive('orbital-landmarks-v5-full-sources.zip',source)]
import shutil
for f in [POSTER,'POST-TEXT.txt','landmarks/space-needle-leg-detail.png']:shutil.copy2(ROOT/f,OUT/Path(f).name)
records+=[dict(file=f.name,bytes=f.stat().st_size,sha256=digest(f)) for f in [OUT/POSTER,OUT/'POST-TEXT.txt',OUT/'space-needle-leg-detail.png']]
(OUT/'DELIVERY.json').write_text(json.dumps(dict(version=5,poster_size=[2000,2500],scene_size=[2400,1350],files=records),indent=2)+'\n')
(OUT/'SHA256SUMS').write_text(''.join(f"{r['sha256']}  {r['file']}\n" for r in records)+f"{digest(OUT/'DELIVERY.json')}  DELIVERY.json\n")
print(json.dumps(records,indent=2))
