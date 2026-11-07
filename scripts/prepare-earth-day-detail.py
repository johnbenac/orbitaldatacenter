#!/usr/bin/env python3
"""Prepare genuine close-orbit day detail from NASA's 86,400px September map.

Raw originals and disk-backed mosaics stay outside the source checkout. Requires
Pillow and NumPy. No source is upscaled and no detail is generated or sharpened.
"""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor
import gc
import hashlib
import json
import mmap
from pathlib import Path
import urllib.request
import numpy as np
from PIL import Image, ImageCms

ROOT=Path(__file__).resolve().parents[1]
Image.MAX_IMAGE_PIXELS=500_000_000
BASE='https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/september/'
SECTORS=[f'{letter}{row}' for row in (1,2) for letter in 'ABCD']
CORE=2048
BORDER=4
QUALITY=55
SPEED=6
# An ordinary SDR sRGB profile describes the NASA RGB visualization.  It does
# not convert or reinterpret the source pixels as physical radiance or HDR.
SRGB_PROFILE=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()

def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()

def acquire(sector,cache,download):
 name=f'world.200409.3x21600x21600.{sector}.jpg';path=cache/name;url=BASE+name
 if not path.exists():
  if not download:raise RuntimeError(f'Missing {path}; use --download')
  partial=path.with_suffix('.part')
  with urllib.request.urlopen(url,timeout=60) as response,partial.open('wb') as f:
   if response.status!=200:raise RuntimeError(f'Incomplete source response: {response.status}')
   for chunk in iter(lambda:response.read(1024*1024),b''):f.write(chunk)
  partial.replace(path)
 with Image.open(path) as im:
  if im.size!=(21600,21600):raise RuntimeError(f'Unexpected source dimensions {path}: {im.size}')
 info={'sector':sector,'url':url,'path':name,'width':21600,'height':21600,'bytes':path.stat().st_size,'sha256':digest(path)}
 print(f'Source {sector}: {info["bytes"]:,} bytes verified',flush=True)
 return info

def drop_pages(a):
 a.flush()
 if hasattr(a._mmap,'madvise'):a._mmap.madvise(mmap.MADV_DONTNEED)

def build_mosaics(cache,sources):
 arrays={}
 for label,w,h in [('80k',81920,40960),('20k',20480,10240)]:
  path=cache/f'day-{label}.rgb';complete=cache/f'day-{label}.complete'
  arrays[label]=np.memmap(path,dtype=np.uint8,mode='r+' if complete.exists() else 'w+',shape=(h,w,3))
 if all((cache/f'day-{s}.complete').exists() for s in arrays):return arrays
 for info in sources:
  sector=info['sector'];cx='ABCD'.index(sector[0]);cy=int(sector[1])-1
  with Image.open(cache/info['path']) as source:
   source.load()
   for label,a in arrays.items():
    if (cache/f'day-{label}.complete').exists():continue
    side=a.shape[1]//4
    with source.resize((side,side),Image.Resampling.LANCZOS) as reduced:
     for y in range(0,side,512):
      band=np.asarray(reduced.crop((0,y,side,min(side,y+512))))
      a[cy*side+y:cy*side+y+len(band),cx*side:(cx+1)*side]=band
     del band
    drop_pages(a)
  gc.collect();print(f'Geographic mosaics: {sector}',flush=True)
 for label,a in arrays.items():
  drop_pages(a);(cache/f'day-{label}.complete').write_text('NASA September 2004; Lanczos downsample only\n')
 return arrays

def prepare(args):
 cache=Path(args.source_dir);cache.mkdir(parents=True,exist_ok=True)
 output=Path(args.output);output.mkdir(parents=True,exist_ok=True)
 with ThreadPoolExecutor(max_workers=3) as pool:sources=list(pool.map(lambda s:acquire(s,cache,args.download),SECTORS))
 arrays=build_mosaics(cache,sources)
 files=[]
 for label,a in arrays.items():
  h,w=a.shape[:2];folder=output/f'day-{label}';folder.mkdir(exist_ok=True)
  def encode(position):
   col,row=position;path=folder/f'c{col}-r{row}.avif'
   if args.resume and path.exists():
    with Image.open(path) as check:
     if check.size!=(CORE+2*BORDER,CORE+2*BORDER) or check.mode!='RGB' or not check.info.get('icc_profile') or check.info.get('exif'):
      raise RuntimeError(f'Invalid previously encoded day AVIF: {path}')
     check.load()
    return {'path':str(path.relative_to(output)),'width':CORE+2*BORDER,'height':CORE+2*BORDER,'bytes':path.stat().st_size,'sha256':digest(path)}
   ys=np.clip(np.arange(row*CORE-BORDER,(row+1)*CORE+BORDER),0,h-1)
   xs=np.mod(np.arange(col*CORE-BORDER,(col+1)*CORE+BORDER),w)
   tile=np.asarray(a[ys[:,None],xs[None,:]])
   partial=path.with_suffix('.avif.part')
   with Image.fromarray(tile) as im:
    im.save(partial,format='AVIF',quality=QUALITY,speed=SPEED,max_threads=2,
            subsampling='4:2:0',range='full',icc_profile=SRGB_PROFILE)
   with Image.open(partial) as check:
    if check.size!=(CORE+2*BORDER,CORE+2*BORDER) or check.mode!='RGB':
     raise RuntimeError(f'Invalid day AVIF: {partial}')
    if check.info.get('exif') or not check.info.get('icc_profile'):
     raise RuntimeError(f'Unexpected day color/orientation metadata: {partial}')
    check.load()
   partial.replace(path)
   return {'path':str(path.relative_to(output)),'width':CORE+2*BORDER,'height':CORE+2*BORDER,'bytes':path.stat().st_size,'sha256':digest(path)}
  with ThreadPoolExecutor(max_workers=args.workers) as pool:
   for row in range(h//CORE):
    files.extend(pool.map(encode,[(col,row) for col in range(w//CORE)]))
    drop_pages(a);print(f'Day {label}: row {row+1}/{h//CORE}; encoded {sum(f["bytes"] for f in files)/1024**2:.2f} MiB',flush=True)
 manifest={'dataset':'NASA Blue Marble Next Generation, September 2004','page':'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/','retrieved':'2026-11-07','sourceGlobalDimensions':[86400,43200],'sources':sources,'layers':{'day-80k':{'width':81920,'height':40960,'columns':40,'rows':20},'day-20k':{'width':20480,'height':10240,'columns':10,'rows':5}},'tileInterior':CORE,'gutter':BORDER,'projection':'north-up equirectangular; west -180, east +180; north +90, south -90','colorSpace':'8-bit SDR RGB, sRGB display-encoded visualization, embedded sRGB ICC profile; full-range YUV 4:2:0 AVIF; no HDR or EXIF orientation metadata','encoding':{'format':'AVIF','quality':QUALITY,'speed':SPEED,'maxThreadsPerImage':2,'subsampling':'4:2:0','range':'full','bitsPerChannel':8,'iccProfile':'sRGB'},'processing':'Lanczos downsample; geographic wrapped/clamped padding; AVIF quality 55, speed 6, encoded directly from native-source RGB mosaics. No intermediate lossy re-encoding, upscaling, generated detail, recoloring, or sharpening.','credit':'NASA Earth Observatory / NASA GSFC / Reto Stoeckli','license':'https://www.nasa.gov/nasa-brand-center/images-and-media/','totalBytes':sum(f['bytes'] for f in files),'files':files}
 (output/'day-provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print(f'Day detail ready: {len(files)} files, {manifest["totalBytes"]/1024**2:.2f} MiB',flush=True)

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--source-dir',required=True);p.add_argument('--download',action='store_true');p.add_argument('--output',default=str(ROOT/'dist/vendor/earth-detail'))
 p.add_argument('--workers',type=int,default=4,help='Concurrent images; each AVIF encoder uses at most two threads')
 p.add_argument('--resume',action='store_true',help='Reuse fully decoded existing AVIF files from the same preparation settings')
 prepare(p.parse_args())
