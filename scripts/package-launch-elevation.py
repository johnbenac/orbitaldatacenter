"""Package local elevation JSON without changing a single source byte.

Run after regenerating the six source grids. --verify-head additionally checks
that every input exactly matches its current Git HEAD before replacing it.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import zipfile

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'dist/assets/launch-sites'
PROOF=ROOT/'scripts/launch-elevation-integrity.json'
parser=argparse.ArgumentParser();parser.add_argument('--verify-head',action='store_true');args=parser.parse_args()
inputs=sorted(ASSETS.glob('*-elevation.json'))
if not inputs:
    proof=json.loads(PROOF.read_text())
    for row in proof['files']:
        with zipfile.ZipFile(ROOT/row['archive']) as z: raw=z.read(row['name'])
        assert hashlib.sha256(raw).hexdigest()==row['sha256']
    print('Existing elevation archives retain their recorded original bytes.');raise SystemExit(0)
assert len(inputs)==6,'Expected all six regional elevation grids'
base=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
records=[]
for source in inputs:
    raw=source.read_bytes();relative=source.relative_to(ROOT).as_posix()
    if args.verify_head:
        original=subprocess.check_output(['git','show',base+':'+relative],cwd=ROOT)
        assert raw==original,relative+' differs from Git HEAD'
    grid=json.loads(raw);assert len(grid['values'])==grid['width']*grid['height']
    target=source.with_suffix('.json.zip')
    entry=zipfile.ZipInfo(source.name,date_time=(2026,11,7,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;entry.external_attr=0o644<<16
    with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:z.writestr(entry,raw,compresslevel=9)
    with zipfile.ZipFile(target) as z: assert z.read(source.name)==raw,'ZIP changed source bytes'
    records.append(dict(name=source.name,source=relative,archive=target.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(raw).hexdigest(),sourceBytes=len(raw),archiveBytes=target.stat().st_size,width=grid['width'],height=grid['height']))
# Delete originals only after every archive passes its exact byte comparison.
for source in inputs:source.unlink()
PROOF.write_text(json.dumps(dict(schema='orbital-data-center/elevation-lossless/1',baseCommit=base,files=records),indent=2)+'\n')
for path in [ASSETS/'catalog.js',*ASSETS.glob('*-record.json')]:
    text=path.read_text();updated=text.replace('-elevation.json"','-elevation.json.zip"')
    if text!=updated:path.write_text(updated)
print('Six original-byte elevation archives; saved',sum(r['sourceBytes']-r['archiveBytes'] for r in records),'bytes.')
