#!/usr/bin/env python3
"""Acquire and bundle the launch-range GIS layers used by the static viewer.

Requires Python 3, Pillow and NumPy. No API key is used. Requests are bounded,
cached outside the repository, and only final georeferenced products are shipped.
The output images retain real aerial/satellite data; no generated imagery or
invented coastline is introduced. Rebuild with:
    python tools/build-launch-geography.py
Use --only region-id to refresh one region and its close-range aerial patches.
"""
from __future__ import annotations
import argparse, hashlib, io, json, math, os, re, time, threading, urllib.request, urllib.parse
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from datetime import datetime, timezone
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/assets/launch-sites'
CACHE=Path('/tmp/odc-launch-geography-cache')
OUT.mkdir(parents=True,exist_ok=True);CACHE.mkdir(parents=True,exist_ok=True)
ACCESSED='2026-11-07'
CATALOG_LOCK=threading.Lock()
NAIP='https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer'
CALIFORNIA='https://gis.wildlife.ca.gov/images/rest/services/Base_Remote_Sensing/NAIP_2012/ImageServer'
ELEVATION='https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer'
IGN='https://data.geopf.fr/wms-r/wms'
PC='https://planetarycomputer.microsoft.com/api/data/v1'
STAC='https://planetarycomputer.microsoft.com/api/stac/v1'

SOURCE_CATALOG={
 'naip':dict(id='naip',title='USDA NAIP / USGS National Map aerial imagery',url=NAIP,license='U.S. public domain',licenseUrl='https://www.usgs.gov/faqs/what-are-terms-uselicensing-map-services-and-data-national-map',attribution='USDA NAIP / USGS, The National Map'),
 'california-naip-2012':dict(id='california-naip-2012',title='California DFW · NAIP 2012 aerial imagery',url=CALIFORNIA,license='U.S. public-domain NAIP imagery; California DFW attribution',licenseUrl='https://wildlife.ca.gov/Data/GIS/Map-Services',attribution='USDA NAIP 2012 / California Department of Fish and Wildlife'),
 'sentinel-2':dict(id='sentinel-2',title='Copernicus Sentinel-2 L2A true color',url='https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a',license='Copernicus Sentinel free, full and open data',licenseUrl='https://dataspace.copernicus.eu/terms-and-conditions',attribution='Contains modified Copernicus Sentinel data 2026, served by Microsoft Planetary Computer'),
 'ign':dict(id='ign',title='IGN Géoplateforme · BD ORTHO aerial imagery',url='https://geoservices.ign.fr/bdortho',license='Licence Ouverte / Open Licence Etalab 2.0',licenseUrl='https://www.etalab.gouv.fr/licence-ouverte-open-licence/',attribution='© IGN · BD ORTHO · Licence Ouverte 2.0'),
 '3dep':dict(id='3dep',title='USGS 3D Elevation Program',url=ELEVATION,license='U.S. public domain',licenseUrl='https://www.usgs.gov/faqs/what-are-terms-uselicensing-map-services-and-data-national-map',attribution='Elevation: U.S. Geological Survey, National Geospatial Program'),
 'terrain-tiles':dict(id='terrain-tiles',title='Mapzen Terrain Tiles · USGS SRTM/GMTED and NOAA ETOPO1',url='https://registry.opendata.aws/terrain-tiles/',license='U.S. public-domain source data; attribution retained',licenseUrl='https://github.com/tilezen/joerd/blob/master/docs/attribution.md',attribution='Mapzen; USGS SRTM/GMTED; NOAA ETOPO1'),
 'osm':dict(id='osm',title='OpenStreetMap coastline and waterway geometry',url='https://www.openstreetmap.org/copyright',license='ODbL 1.0',licenseUrl='https://opendatacommons.org/licenses/odbl/1-0/',attribution='© OpenStreetMap contributors')
}

# The source item identifiers were selected from the public STAC response.
# Aerial acquisition dates are queried from the service and retained below.
REGIONS={
 'space-coast':dict(name='Space Coast · Florida',center=[-80.58,28.55],spanM=[24000,24000],provider='naip',sentinel='S2B_MSIL2A_20260328T155859_R097_T17RNM_20260328T200110',seawardBearingDeg=80,description='Atlantic barrier coast, wetlands and Banana River lagoons.',landmarkNames=['Banana River','Merritt Island','Cape Canaveral']),
 'starbase':dict(name='Starbase · Boca Chica, Texas',center=[-97.158,25.997],spanM=[24000,24000],provider='naip',sentinel='S2A_MSIL2A_20260313T170721_R069_T14RPP_20260314T025810',seawardBearingDeg=90,description='Boca Chica dunes, tidal flats, South Bay and the Rio Grande mouth.',landmarkNames=['South Bay','Boca Chica Beach','Rio Grande','Brazos Island']),
 'pecan-island':dict(name='Pecan Island · Louisiana coast',center=[-92.45,29.64],spanM=[24000,24000],provider='naip',sentinel='S2A_MSIL2A_20260923T164701_R126_T15RWN_20260924T023614',seawardBearingDeg=180,description='Chenier ridges, coastal marshes and White Lake. Proposed launch position remains unassigned.',landmarkNames=['White Lake','Pecan Island','Freshwater Bayou','Rockefeller Wildlife Refuge']),
 'vandenberg':dict(name='Vandenberg · California coast',center=[-120.61,34.61],spanM=[24000,24000],provider='california-naip-2012',sentinel='S2C_MSIL2A_20261017T184351_R070_T10SGD_20261017T214406',seawardBearingDeg=255,description='Pacific bluffs, Point Arguello and the coastal hills. The high-resolution aerial layer is historical (2012).',landmarkNames=['Point Arguello','Santa Ynez River','Surf Beach','Canada Honda']),
 'kourou':dict(name='Guiana Space Centre · French Guiana',center=[-52.79,5.26],spanM=[24000,24000],provider='ign',sentinel=['S2A_MSIL2A_20260810T140111_R067_T22NBL_20260810T215710','S2A_MSIL2A_20260810T140111_R067_T22NCL_20260810T215710'],seawardBearingDeg=45,description='Atlantic mudflats, tropical forest, coastal savanna and tidal creeks. The public IGN layer is provider-blurred around the launch complex.',landmarkNames=['Crique Karouabo','Malmanoury','Savane roche Nicole']),
 'wenchang':dict(name='Wenchang · Hainan',center=[110.951,19.61],spanM=[24000,24000],provider='sentinel-2',sentinel='S2A_MSIL2A_20260403T031201_R075_T49QDB_20260403T071015',seawardBearingDeg=135,description='Hainan’s northeast coast, coves, plantations and the Tonggu Ridge area.',landmarkNames=['Tonggu Ridge','铜鼓岭','Qishui Bay','淇水湾','Bamen Bay','八门湾'])
}

# Metres covered by each local texture, not an invented source resolution.
DETAILS={
 'cape-lc16':('space-coast',[-80.552,28.502],3072),
 'cape-lc36':('space-coast',[-80.539,28.476],4096),
 'ksc-lc39a':('space-coast',[-80.602,28.609],3072),
 'cape-slc37':('space-coast',[-80.57,28.53],3072),
 'cape-slc41':('space-coast',[-80.583,28.583],3072),
 'starbase':('starbase',[-97.158,25.997],3072),
 'pecan-island':('pecan-island',[-92.45,29.64],3072),
 'vandenberg-slc6':('vandenberg',[-120.627,34.581],4096),
 'vandenberg-slc3e':('vandenberg',[-120.590,34.640],4096),
 'kourou':('kourou',[-52.79,5.26],2048)
}

def log(*args):print(*args,flush=True)
def url(base,params):return base+'?'+urllib.parse.urlencode(params)
def fetch(address):
 path=CACHE/hashlib.sha256(address.encode()).hexdigest()
 if path.exists():return path.read_bytes()
 for attempt in range(3):
  try:
   request=urllib.request.Request(address,headers={'User-Agent':'Orbital-Data-Center-GIS/1.0 (public research visualization)'})
   with urllib.request.urlopen(request,timeout=55) as response:raw=response.read()
   if not raw:raise ValueError('Empty response')
   path.write_bytes(raw);return raw
  except urllib.error.HTTPError as exc:
   if exc.code<500 or attempt==2:raise
   time.sleep(1+attempt)
  except Exception:
   if attempt==2:raise
   time.sleep(1+attempt)
def json_get(address):return json.loads(fetch(address))
def bounds(center,span):
 lon,lat=center;dx=span[0]/(2*111320*math.cos(math.radians(lat)));dy=span[1]/(2*111320)
 return [round(lon-dx,9),round(lat-dy,9),round(lon+dx,9),round(lat+dy,9)]
def path_for(name):return 'assets/launch-sites/'+name
def source_image_metadata(provider,native,acquired,requests):
 s=SOURCE_CATALOG[provider]
 result=dict(nativeResolutionM=native,nativeResolutionBasis='Nominal source acquisition, not bundled display sampling',acquired=acquired,attribution=s['attribution'],sourceUrl=s['url'],license=s['license'],licenseUrl=s['licenseUrl'],requests=requests)
 if provider=='ign':
  result.update(qualityLabel='Provider-blurred imagery',qualityNote='Public IGN imagery is blurred at the launch complex. Its 20 cm nominal acquisition metadata does not describe the visible detail in the restricted area.',effectiveDetail='Provider-degraded around the launch complex; no submeter detail is claimed.',qualitySourceUrl='https://remonterletemps.ign.fr/faq')
 elif provider=='california-naip-2012':
  result.update(qualityLabel='Historical aerial · 2012',qualityNote='The available public 1 m aerial coverage is from 2012. It shows the landscape and historical buildings; current launch infrastructure is modeled separately.',effectiveDetail='1 m historical aerial imagery, acquired 2012.')
 elif provider=='sentinel-2':
  result.update(qualityLabel='10 m satellite imagery',qualityNote='Copernicus Sentinel-2 provides actual 10 m source imagery. The bundled texture sampling does not create submeter detail.',effectiveDetail='10 m native satellite data; cloud features, if visible, belong to the source observation.')
 return result

def tile_image(bb,size,get_tile):
 # Four native server requests avoid each service's single-image size limit.
 if size<=2048:return get_tile(bb,size,size)
 canvas=Image.new('RGBA',(size,size));n=size//2;w,s,e,no=bb;mx=(w+e)/2;my=(s+no)/2
 pieces=[([w,my,mx,no],0,0),([mx,my,e,no],n,0),([w,s,mx,my],0,n),([mx,s,e,my],n,n)]
 with ThreadPoolExecutor(max_workers=2) as pool:
  for (b,x,y),im in zip(pieces,pool.map(lambda q:get_tile(q[0],n,n),pieces)):canvas.paste(im,(x,y))
 return canvas

def aerial(provider,bb,size):
 requests=[]
 def part(ext,w,h):
  if provider=='ign':
   address=url(IGN,dict(SERVICE='WMS',VERSION='1.3.0',REQUEST='GetMap',LAYERS='ORTHOIMAGERY.ORTHOPHOTOS',STYLES='',FORMAT='image/png',TRANSPARENT='TRUE',CRS='CRS:84',BBOX=','.join(map(str,ext)),WIDTH=w,HEIGHT=h))
  else:
   base=CALIFORNIA if provider=='california-naip-2012' else NAIP
   p=dict(f='image',bbox=','.join(map(str,ext)),bboxSR=4326,imageSR=4326,size=f'{w},{h}',format='png32',noData='0',noDataInterpretation='esriNoDataMatchAll',adjustAspectRatio='false',interpolation='RSP_BilinearInterpolation')
   if provider=='naip':p['renderingRule']=json.dumps({'rasterFunction':'NaturalColor'})
   address=url(base+'/exportImage',p)
  requests.append(address);im=Image.open(io.BytesIO(fetch(address))).convert('RGBA')
  if im.size!=(w,h):raise ValueError(f'Unexpected aerial image size {im.size}')
  return im
 return tile_image(bb,size,part),requests

def aerial_metadata(provider,bb):
 if provider=='california-naip-2012':return 1.0,'2012',[]
 if provider=='ign':
  address=url(IGN,dict(SERVICE='WMS',VERSION='1.3.0',REQUEST='GetFeatureInfo',LAYERS='ORTHOIMAGERY.ORTHOPHOTOS',QUERY_LAYERS='ORTHOIMAGERY.ORTHOPHOTOS',STYLES='',FORMAT='image/jpeg',INFO_FORMAT='text/html',CRS='CRS:84',BBOX=','.join(map(str,bb)),WIDTH=256,HEIGHT=256,I=128,J=128))
  html=fetch(address).decode('utf8');dates=re.findall(r'<strong>([0-9]{2}-[0-9]{2}-[0-9]{4})</strong>',html)
  metres=re.findall(r'<strong>([0-9.]+) cm</strong>',html)
  acquired=datetime.strptime(dates[0],'%d-%m-%Y').strftime('%Y-%m-%d')+' (center-point metadata; regional mosaic dates vary)' if dates else 'IGN current mosaic; capture date varies'
  return float(metres[0])/100 if metres else None,acquired,[{'query':address,'metadataHtml':html}]
 address=url(NAIP+'/query',dict(f='json',geometry=','.join(map(str,bb)),geometryType='esriGeometryEnvelope',inSR=4326,spatialRel='esriSpatialRelIntersects',where='Category=1',outFields='Name,Year,acquisition_date,resolution_value,resolution_units,agency',returnGeometry='false'))
 data=json_get(address);records=[x['attributes'] for x in data.get('features',[])]
 dates=sorted(set(datetime.fromtimestamp(x['acquisition_date']/1000,timezone.utc).strftime('%Y-%m-%d') for x in records if x.get('acquisition_date')))
 resolutions=sorted(set(x['resolution_value'] for x in records if x.get('resolution_value') and x.get('resolution_units')=='METER'))
 return max(resolutions) if resolutions else None,(' to '.join([dates[0],dates[-1]]) if len(dates)>1 else dates[0] if dates else 'NAIP mosaic; date varies'),records

def sentinel(item,bb,size,asset='visual',fmt='png'):
 if isinstance(item,list):
  parts=[sentinel(i,bb,size,asset,fmt) for i in item]
  if asset=='visual':
   combined=Image.new('RGBA',(size,size))
   for im,_ in parts:combined.alpha_composite(im)
  else:
   data=np.zeros((size,size,2),dtype=np.uint8)
   for im,_ in parts:
    a=np.array(im.convert('LA'));valid=a[:,:,1]>0;data[valid]=a[valid]
   combined=Image.fromarray(data,'LA')
  return combined,[address for _,address in parts]
 address=url(PC+'/item/bbox/'+','.join(map(str,bb))+f'/{size}x{size}.{fmt}',dict(collection='sentinel-2-l2a',item=item,assets=asset,dst_crs='EPSG:4326',coord_crs='EPSG:4326',resampling='bilinear' if asset=='visual' else 'nearest',reproject='bilinear' if asset=='visual' else 'nearest'))
 im=Image.open(io.BytesIO(fetch(address)))
 return im.convert('RGBA') if asset=='visual' else im,address

def blend_open_water(key,combined,aerial_image,satellite,item,bb,bearing):
 # Different flights have different water color. Use Sentinel's actual open-
 # water field, radiometrically balanced to the overlapping aerial water,
 # beyond a softly buffered shoreline. This removes rectangular coverage seams
 # without relocating shoreline/land pixels or fabricating geographic features.
 scl,request=sentinel(item,bb,1024,asset='SCL')
 classes=np.array(scl);classes=classes[:,:,0] if classes.ndim==3 else classes
 water=(classes==6).astype(np.uint8)*255
 mask=Image.fromarray(water).resize((512,512),Image.Resampling.NEAREST)
 # Keep only connected water touching the seaward side; inland lagoons retain
 # their aerial color. Choose the dominant seaward boundary from the site.
 points=([(511,y) for y in range(0,512,16)] if 45<=bearing<135 else [(x,511) for x in range(0,512,16)] if 135<=bearing<225 else [(0,y) for y in range(0,512,16)] if 225<=bearing<315 else [(x,0) for x in range(0,512,16)])
 for point in points:
  if mask.getpixel(point)==255:ImageDraw.floodfill(mask,point,128,thresh=0)
 connected=np.asarray(mask)==128
 soft=Image.fromarray(connected.astype(np.uint8)*255).filter(ImageFilter.GaussianBlur(4))
 weight=np.clip((np.asarray(soft,dtype=np.float32)/255-.80)/.20,0,1)
 aerial_small=np.array(aerial_image.resize((512,512),Image.Resampling.BILINEAR),dtype=np.float32)
 sat_small=np.array(satellite.resize((512,512),Image.Resampling.BILINEAR),dtype=np.float32)
 overlap=connected&(aerial_small[:,:,3]>250)
 shift=np.median(aerial_small[overlap,:3],axis=0)-np.median(sat_small[overlap,:3],axis=0) if np.any(overlap) else np.zeros(3)
 shift=np.clip(shift,-55,55)
 target=np.clip(np.asarray(satellite.resize(combined.size,Image.Resampling.BILINEAR),dtype=np.float32)[:,:,:3]+shift,0,255)
 full_weight=np.array(Image.fromarray(np.uint8(weight*255)).resize(combined.size,Image.Resampling.BILINEAR),dtype=np.float32)[:,:,None]/255
 original=np.asarray(combined,dtype=np.float32)[:,:,:3]
 # IGN marks some offshore absence with opaque white. Only pixels that the
 # independent Sentinel water classification confirms are water are replaced.
 water_full=np.array(Image.fromarray(water).resize(combined.size,Image.Resampling.NEAREST))>0
 white_gap=(original.min(axis=2)>=254)&water_full
 original[white_gap]=target[white_gap]
 result=Image.fromarray(np.uint8(np.clip(original*(1-full_weight)+target*full_weight,0,255))).convert('RGBA')
 mask_name=key+'-water.png';Image.fromarray(water).save(OUT/mask_name,optimize=True)
 s=SOURCE_CATALOG['sentinel-2']
 return result,dict(url=path_for(mask_name),width=1024,height=1024,bounds=bb,resolutionM=24000/1024,nativeResolutionM=20,classification='Sentinel-2 SCL class 6 water, sampled without interpolation',sourceUrl=s['url'],requests=request if isinstance(request,list) else [request],attribution=s['attribution'],license=s['license'],licenseUrl=s['licenseUrl'])

def save_image(im,name,bb,span,meta,size):
 meta.setdefault('processing','Reprojected to EPSG:4326; bilinear display sampling; JPEG encoding. Source colors retained.')
 im=im.convert('RGB');filename=name+'.jpg';im.save(OUT/filename,quality=91,subsampling=0,optimize=True)
 preview=name+'-preview.jpg';im.resize((512,512),Image.Resampling.LANCZOS).save(OUT/preview,quality=84,optimize=True)
 return dict(url=path_for(filename),previewUrl=path_for(preview),width=size,height=size,resolutionM=round(span[0]/size,4),projection='EPSG:4326',bounds=bb,**meta)

def feather_registered_detail(im,bb,span,region,width_m=300):
 # Different observations have different color balance. Sample the exact
 # bundled regional image under this patch and blend only the edge in metres;
 # no image is moved, warped to another feature, or synthetically reconstructed.
 record=json.loads((OUT/(region+'-record.json')).read_text())
 rw,rs,re,rn=record['bounds'];w,s,e,n=bb
 if not (rw<=w<e<=re and rs<=s<n<=rn):raise ValueError('Detail is outside its geographic underlay')
 source=Image.open(ROOT/'dist'/record['image']['url']).convert('RGB')
 box=((w-rw)/(re-rw)*source.width,(rn-n)/(rn-rs)*source.height,(e-rw)/(re-rw)*source.width,(rn-s)/(rn-rs)*source.height)
 underlay=source.transform(im.size,Image.Transform.EXTENT,box,resample=Image.Resampling.BILINEAR)
 h,w_px=im.height,im.width
 x=np.minimum(np.arange(w_px),np.arange(w_px)[::-1])*span[0]/w_px
 y=np.minimum(np.arange(h),np.arange(h)[::-1])*span[1]/h
 t=np.clip(np.minimum(y[:,None],x[None,:])/width_m,0,1)
 weight=(t*t*(3-2*t))[:,:,None]
 data=np.asarray(im.convert('RGB'),dtype=np.float32)*weight+np.asarray(underlay,dtype=np.float32)*(1-weight)
 composite=Image.fromarray(np.uint8(np.rint(np.clip(data,0,255)))).convert('RGBA')
 blend=dict(widthM=width_m,method='Geographically registered smoothstep feather measured inward from each patch edge',underlayUrl=record['image']['url'],underlayBounds=record['bounds'],underlaySourceUrl=SOURCE_CATALOG['ign']['url'],underlayAcquired=record['image']['acquired'],centerSourceRetained=True)
 return composite,blend

def decode_sparse_float_tiff(raw):
 # ArcGIS emits zero-offset TIFF tiles over no-data ocean. Pillow treats those
 # offsets as TIFF-header pixels; explicitly skip them to avoid false mountains.
 im=Image.open(io.BytesIO(raw));tag=im.tag_v2;w,h=im.size
 if tag.get(259)==1 and tag.get(339)==(3,) and 324 in tag:
  tw,th=tag[322],tag[323];nx=math.ceil(w/tw);a=np.zeros((h,w),dtype=np.float32)
  endian='<' if raw[:2]==b'II' else '>'
  for j,(offset,count) in enumerate(zip(tag[324],tag[325])):
   if not offset or not count:continue
   data=np.frombuffer(raw,dtype=endian+'f4',count=tw*th,offset=offset).reshape(th,tw)
   y=(j//nx)*th;x=(j%nx)*tw;hh=min(th,h-y);ww=min(tw,w-x)
   a[y:y+hh,x:x+ww]=data[:hh,:ww]
  return a
 return np.asarray(im,dtype=np.float32)

def us_elevation(bb,n):
 w,s,e,no=bb;dx=(e-w)/(n-1);dy=(no-s)/(n-1)
 outer=[w-dx/2,s-dy/2,e+dx/2,no+dy/2]
 address=url(ELEVATION+'/exportImage',dict(f='image',bbox=','.join(map(str,outer)),bboxSR=4326,imageSR=4326,size=f'{n},{n}',format='tiff',pixelType='F32',adjustAspectRatio='false',interpolation='RSP_BilinearInterpolation',renderingRule=json.dumps({'rasterFunction':'None'})))
 a=decode_sparse_float_tiff(fetch(address))
 valid=np.isfinite(a)&(a>-1000)&(a<9000);a=np.where(valid,a,0)
 return a,[address],'3dep'

def world_elevation(bb,n):
 # Decode Mapzen Terrarium values into metres, then bilinearly sample a regular
 # geographic grid. Lat/lon samples include the region's four exact edges.
 z=12;N=2**z;w,s,e,no=bb
 xs=(np.linspace(w,e,n)+180)/360*N*256
 lat=np.radians(np.linspace(no,s,n));ys=(1-np.arcsinh(np.tan(lat))/math.pi)/2*N*256
 x0,x1=int(xs.min()//256),int(xs.max()//256);y0,y1=int(ys.min()//256),int(ys.max()//256)
 mosaic=np.zeros(((y1-y0+1)*256,(x1-x0+1)*256),dtype=np.float32);requests=[]
 jobs=[(x,y) for y in range(y0,y1+1) for x in range(x0,x1+1)]
 def part(q):
  x,y=q;address=f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
  a=np.array(Image.open(io.BytesIO(fetch(address))).convert('RGB'),dtype=np.float32)
  return x,y,a[:,:,0]*256+a[:,:,1]+a[:,:,2]/256-32768,address
 with ThreadPoolExecutor(max_workers=4) as pool:
  for x,y,a,address in pool.map(part,jobs):mosaic[(y-y0)*256:(y-y0+1)*256,(x-x0)*256:(x-x0+1)*256]=a;requests.append(address)
 xx=xs-x0*256-.5;yy=ys-y0*256-.5
 ix=np.floor(xx).astype(int);iy=np.floor(yy).astype(int);fx=xx-ix;fy=yy-iy
 ix=np.clip(ix,0,mosaic.shape[1]-2);iy=np.clip(iy,0,mosaic.shape[0]-2)
 a=(mosaic[iy[:,None],ix]*(1-fx)+mosaic[iy[:,None],ix+1]*fx)*(1-fy[:,None])+(mosaic[iy[:,None]+1,ix]*(1-fx)+mosaic[iy[:,None]+1,ix+1]*fx)*fy[:,None]
 # Below-sea ocean elevations are irrelevant to the ground mesh; retain a
 # single sea-level plane. Inland terrain remains at its measured elevation.
 return np.maximum(a,0),requests,'terrain-tiles'

def elevation(key,bb,span,usa):
 n=257;a,requests,source=us_elevation(bb,n) if usa else world_elevation(bb,n)
 if a.shape!=(n,n) or not np.isfinite(a).all():raise ValueError('Invalid elevation grid')
 values=[round(float(x),1) for x in a.ravel()]
 record=dict(width=n,height=n,bounds=bb,projection='EPSG:4326',units='m',order='north-to-south row-major',samplePlacement='grid vertices including bounding edges',values=values)
 filename=key+'-elevation.json';(OUT/filename).write_text(json.dumps(record,separators=(',',':'))+'\n')
 s=SOURCE_CATALOG[source]
 return dict(url=path_for(filename),width=n,height=n,bounds=bb,sampleSpacingM=span[0]/(n-1),minM=min(values),maxM=max(values),datum='Source orthometric elevation; terrain is displayed relative to the selected pad sample',attribution=s['attribution'],sourceUrl=s['url'],license=s['license'],licenseUrl=s['licenseUrl'],requests=requests)

def simplify(points,tolerance=.00002):
 # Geographic simplification at ~2 m preserves the visible coastline while
 # keeping the bundled vector file small; endpoints remain unchanged.
 if len(points)<3:return points
 a=np.asarray(points);u=a[-1]-a[0];den=float(u@u)
 if den==0:return [points[0],points[-1]]
 t=np.clip(((a-a[0])@u)/den,0,1);dist=np.linalg.norm(a-(a[0]+t[:,None]*u),axis=1);i=int(np.argmax(dist))
 return simplify(points[:i+1],tolerance)[:-1]+simplify(points[i:],tolerance) if dist[i]>tolerance else [points[0],points[-1]]

def vectors(key,region,bb):
 # One bounded read per range; retain only geographic features, never personal
 # addresses, user identities or changeset metadata from the API response.
 small=bounds(region['center'],[6000,6000])
 address='https://www.openstreetmap.org/api/0.6/map?bbox='+','.join(map(str,small))
 try:root=ET.fromstring(fetch(address))
 except Exception as exc:
  log('OSM region unavailable:',key,type(exc).__name__)
  small=bounds(region['center'],[3000,3000]);address='https://www.openstreetmap.org/api/0.6/map?bbox='+','.join(map(str,small))
  try:root=ET.fromstring(fetch(address))
  except Exception as fallback:
   log('OSM optional geometry omitted:',key,type(fallback).__name__);return None,[]
 nodes={x.get('id'):[float(x.get('lon')),float(x.get('lat'))] for x in root.findall('node')}
 features=[];named=[]
 preferred=region['landmarkNames']
 for element in list(root.findall('node'))+list(root.findall('way')):
  tags={t.get('k'):t.get('v') for t in element.findall('tag')}
  name=tags.get('name:en') or tags.get('name','')
  pts=[nodes[n.get('ref')] for n in element.findall('nd') if n.get('ref') in nodes] if element.tag=='way' else [nodes[element.get('id')]]
  if not pts:continue
  kind='coastline' if tags.get('natural')=='coastline' else 'waterway' if tags.get('waterway') in ['river','stream','canal'] else 'water' if tags.get('natural')=='water' else None
  ref=f'https://www.openstreetmap.org/{element.tag}/{element.get("id")}'
  if kind and len(pts)>1:
   coords=simplify(pts);polygon=kind=='water' and pts[0]==pts[-1] and len(coords)>3
   features.append(dict(type='Feature',properties=dict(kind=kind,name=name,osmId=f'{element.tag}/{element.get("id")}',sourceUrl=ref),geometry=dict(type='Polygon' if polygon else 'LineString',coordinates=[coords] if polygon else coords)))
  if name and (name in preferred or tags.get('natural') in ['peak','cape','bay']):
   inside=[p for p in pts if bb[0]<=p[0]<=bb[2] and bb[1]<=p[1]<=bb[3]]
   if not inside:continue
   center=np.mean(inside,axis=0).tolist()
   label_kind='hill' if tags.get('natural')=='peak' else 'cape' if tags.get('natural')=='cape' else 'waterway' if tags.get('waterway') else 'lagoon' if tags.get('natural') in ['bay','water'] else 'landmark'
   named.append(dict(name=name,lat=round(center[1],6),lon=round(center[0],6),kind=label_kind,sourceUrl=ref))
 # Rank only known named landmarks; geographic point labels remain approximate.
 named.sort(key=lambda f:preferred.index(f['name']) if f['name'] in preferred else 999)
 seen=set();landmarks=[]
 for f in named:
  if f['name'] not in seen:landmarks.append(f);seen.add(f['name'])
  if len(landmarks)>=3:break
 filename=key+'-geography.geojson';data=dict(type='FeatureCollection',attribution='© OpenStreetMap contributors',license='ODbL 1.0',licenseUrl=SOURCE_CATALOG['osm']['licenseUrl'],sourceUrl=address,features=features)
 (OUT/filename).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
 return dict(url=path_for(filename),attribution=SOURCE_CATALOG['osm']['attribution'],license='ODbL 1.0',sourceUrl=address),landmarks

def one_region(key):
 r=REGIONS[key];bb=bounds(r['center'],r['spanM']);provider=r['provider'];size=2048 if provider=='sentinel-2' else 4096
 log('Acquiring',key,provider)
 satellite=None;satellite_url=None;item=None;water_mask=None
 if r['sentinel']:
  satellite,satellite_url=sentinel(r['sentinel'],bb,2048)
  ids=r['sentinel'] if isinstance(r['sentinel'],list) else [r['sentinel']]
  items=[json_get(STAC+'/collections/sentinel-2-l2a/items/'+identifier) for identifier in ids];item=items[0]
  (OUT/(key+'-sentinel-item.json')).write_text(json.dumps(items if len(items)>1 else item,indent=2)+'\n')
 if provider=='sentinel-2':
  im=satellite;requests=[satellite_url];native=10;acquired=item['properties']['datetime'][:10];raw_metadata=[]
 else:
  aerial_image,requests=aerial(provider,bb,size);native,acquired,raw_metadata=aerial_metadata(provider,bb)
  if satellite:
   im=satellite.resize((size,size),Image.Resampling.BILINEAR);im.alpha_composite(aerial_image)
   im,water_mask=blend_open_water(key,im,aerial_image,satellite,r['sentinel'],bb,r['seawardBearingDeg'])
  else:im=aerial_image
  if np.asarray(im)[:,:,3].min()==0:raise ValueError(f'{key}: visible source no-data remains')
 meta=source_image_metadata(provider,native,acquired,requests)
 if satellite_url and provider!='sentinel-2':
  meta['gapFill']=dict(sourceId='sentinel-2',nativeResolutionM=10,acquired=item['properties']['datetime'][:10],request=satellite_url,attribution=SOURCE_CATALOG['sentinel-2']['attribution'])
  meta['attribution']+='; '+SOURCE_CATALOG['sentinel-2']['attribution']
  meta['license']+='; '+SOURCE_CATALOG['sentinel-2']['license']
  meta['additionalLicenseUrls']=[SOURCE_CATALOG['sentinel-2']['licenseUrl']]
 meta['processing']='Reprojected to EPSG:4326; bilinear display sampling; JPEG encoding.'+(' Open-ocean Sentinel colors balanced to aerial water and blended beyond a buffered source shoreline, removing rectangular aerial-coverage seams. Classified offshore white no-data is filled with actual Sentinel pixels. Land coordinates and pixels retained.' if water_mask else ' Source colors retained.')
 image=save_image(im,key+'-regional',bb,r['spanM'],meta,size)
 (OUT/(key+'-aerial-metadata.json')).write_text(json.dumps(raw_metadata,indent=2,ensure_ascii=False)+'\n')
 height=elevation(key,bb,r['spanM'],provider in ['naip','california-naip-2012'])
 sources=[SOURCE_CATALOG[provider],SOURCE_CATALOG['3dep' if provider in ['naip','california-naip-2012'] else 'terrain-tiles']]
 if satellite_url and provider!='sentinel-2':sources.append(SOURCE_CATALOG['sentinel-2'])
 result=dict(id=key,name=r['name'],center=r['center'],spanM=r['spanM'],bounds=bb,projection='EPSG:4326',description=r['description'],seawardBearingDeg=r['seawardBearingDeg'],image=image,elevation=height,waterMask=water_mask,features=None,landmarks=[],sources=sources,accessed=ACCESSED)
 (OUT/(key+'-record.json')).write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
 catalog()
 log('Acquired region',key,'terrain metres',height['minM'],height['maxM'])
 feature_info,landmarks=vectors(key,r,bb)
 if feature_info:
  result.update(features=feature_info,landmarks=landmarks);result['sources'].append(SOURCE_CATALOG['osm'])
  (OUT/(key+'-record.json')).write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n');catalog()
 return result

def one_detail(key):
 region,center,span=DETAILS[key];r=REGIONS[region];bb=bounds(center,[span,span]);size=4096
 log('Acquiring local context',key)
 provider=r['provider']
 if key=='kourou':
  # The public IGN launch-complex pixels are deliberately degraded. An openly
  # distributed Sentinel observation provides clearer, honest 10 m context;
  # a 512 px display texture avoids suggesting fabricated aerial precision.
  size=512;provider='sentinel-2'
  im,address=sentinel(r['sentinel'][1],bb,size);requests=[address]
  native=10;acquired='2026-08-10'
 else:
  im,requests=aerial(provider,bb,size)
  native,acquired,raw=aerial_metadata(provider,bb)
 gap_fill=None
 if np.asarray(im)[:,:,3].min()==0:
  satellite,address=sentinel(r['sentinel'],bb,512)
  full=satellite.resize((size,size),Image.Resampling.BILINEAR);full.alpha_composite(im);im=full
  if np.asarray(im)[:,:,3].min()==0:raise ValueError('Unfilled no-data in local aerial patch')
  gap_fill=dict(sourceId='sentinel-2',nativeResolutionM=10,request=address,attribution=SOURCE_CATALOG['sentinel-2']['attribution'])
 meta=source_image_metadata(provider,native,acquired,requests)
 if key=='kourou':
  im,blend=feather_registered_detail(im,bb,[span,span],region,300)
  meta['edgeBlend']=blend
  meta['attribution']+='; '+SOURCE_CATALOG['ign']['attribution']
  meta['license']+='; '+SOURCE_CATALOG['ign']['license']
  meta['additionalLicenseUrls']=[SOURCE_CATALOG['ign']['licenseUrl']]
  meta['qualityNote']='Actual 10 m Copernicus Sentinel-2 imagery provides local context where the public IGN aerial layer is blurred. A 300 m edge feather joins the registered IGN regional image. Small source clouds remain over the forest; no detail has been reconstructed.'
  meta['processing']='Reprojected to EPSG:4326; bilinear display sampling; JPEG encoding. A 300 m smoothstep edge feather blends the local Sentinel observation into the exact geographically registered bundled IGN regional crop. Center pixels retain the Sentinel source. No geographic feature is moved or invented.'
 if gap_fill:
  meta['gapFill']=gap_fill
  meta['attribution']+='; '+SOURCE_CATALOG['sentinel-2']['attribution']
  meta['license']+='; '+SOURCE_CATALOG['sentinel-2']['license']
  meta['additionalLicenseUrls']=[SOURCE_CATALOG['sentinel-2']['licenseUrl']]
 image=save_image(im,key+'-detail',bb,[span,span],meta,size)
 result=dict(id=key,regionId=region,center=center,spanM=[span,span],bounds=bb,projection='EPSG:4326',image=image)
 (OUT/(key+'-detail-record.json')).write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
 return result

def catalog():
 with CATALOG_LOCK:
  regions={k:json.loads((OUT/(k+'-record.json')).read_text()) for k in REGIONS if (OUT/(k+'-record.json')).exists()}
  details={k:json.loads((OUT/(k+'-detail-record.json')).read_text()) for k in DETAILS if (OUT/(k+'-detail-record.json')).exists()}
  head='// Generated from public GIS data by tools/build-launch-geography.py.\n'
  body='export const regions='+json.dumps(regions,ensure_ascii=False,separators=(',',':'))+';\nexport const details='+json.dumps(details,ensure_ascii=False,separators=(',',':'))+';\nexport const sourceCatalog='+json.dumps(SOURCE_CATALOG,ensure_ascii=False,separators=(',',':'))+';\n'
  pending=OUT/('catalog.pending.'+str(os.getpid())+'.js');pending.write_text(head+body);os.replace(pending,OUT/'catalog.js')
  log('Catalog:',len(regions),'regions,',len(details),'local patches')

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--only',choices=REGIONS);parser.add_argument('--detail-only',choices=DETAILS,help='Rebuild one local patch using its existing bundled region.');parser.add_argument('--catalog-only',action='store_true');parser.add_argument('--resume',action='store_true',help='Keep completed records; acquire only missing regions and detail patches.');args=parser.parse_args()
 if args.catalog_only:catalog();return
 if args.detail_only:one_detail(args.detail_only);catalog();return
 targets=[args.only] if args.only else list(REGIONS)
 # Three independent ranges, at most two simultaneous aerial requests each.
 pending=[k for k in targets if not args.resume or not (OUT/(k+'-record.json')).exists()]
 with ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(one_region,pending))
 def detail_job(key):one_detail(key);catalog()
 with ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(detail_job,[k for k,(r,_,_) in DETAILS.items() if r in targets and (not args.resume or not (OUT/(k+'-detail-record.json')).exists())]))
 catalog()

if __name__=='__main__':main()
