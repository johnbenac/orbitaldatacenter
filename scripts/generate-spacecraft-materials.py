"""Reproducible illustrative spacecraft surface maps (no vendor-image claims).

Generate shared, seamless PBR tiles for the material register. Dimensions are
visualization pitches, not vendor cell, OSR, honeycomb, or winding specifications.
Normal and roughness maps are stored losslessly and have no baked illumination.
Run with Python + Pillow + NumPy; source assets require no network or license.
"""
from pathlib import Path
import json
import math
import numpy as np
from PIL import Image, ImageDraw

DEST = Path(__file__).resolve().parents[1] / 'dist' / 'assets' / 'materials'
DEST.mkdir(parents=True, exist_ok=True)
RNG = np.random.default_rng(20261107)
MANIFEST = {}


def periodic_noise(n, waves=24, low=1, high=16):
    y, x = np.mgrid[0:n, 0:n] / n
    z = np.zeros((n, n))
    for _ in range(waves):
        kx, ky = RNG.integers(low, high + 1, 2)
        phase = RNG.uniform(0, 2 * np.pi)
        z += np.sin(2 * np.pi * (kx*x + ky*y) + phase) / math.sqrt(kx*kx+ky*ky)
    return z / max(1e-9, np.std(z))


def emit(ident, base, roughness, height, pitch, normal_strength=.5):
    n = base.shape[0]
    base = np.uint8(np.clip(base, 0, 255))
    roughness = np.uint8(np.clip(roughness, 0, 255))
    # Tangent normal +Y matches Three's WebGL convention. All edges wrap.
    dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * normal_strength
    dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * normal_strength
    normal = np.stack([-dx, dy, np.ones_like(height)], axis=-1)
    normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
    normal = np.uint8(np.clip((normal*.5+.5)*255, 0, 255))
    Image.fromarray(base).save(DEST / f'{ident}-base.webp', lossless=True, method=6)
    Image.fromarray(roughness).save(DEST / f'{ident}-roughness.webp', lossless=True, method=6)
    Image.fromarray(normal).save(DEST / f'{ident}-normal.webp', lossless=True, method=6)
    # Thumbnail is explicitly a surface sample; no simulated flight photograph.
    preview = Image.fromarray(base).resize((256, 256), Image.Resampling.LANCZOS)
    preview.save(DEST / f'{ident}-preview.webp', lossless=True, method=6)
    MANIFEST[ident] = dict(id='texture-'+ident, resolutionPx=[n,n],
        tileSizeM=pitch, baseColorPath=f'assets/materials/{ident}-base.webp',
        normalPath=f'assets/materials/{ident}-normal.webp',
        roughnessPath=f'assets/materials/{ident}-roughness.webp',
        previewPath=f'assets/materials/{ident}-preview.webp',
        representation='Deterministic illustrative PBR tile; pattern dimensions are visual allocations, not supplier specifications.')


def grain(ident, color, rough, pitch=(.25,.25), n=256, brushed=False):
    y, x = np.mgrid[0:n, 0:n] / n
    noise = periodic_noise(n, 16, 9, 72)
    brushed_noise = np.sin(y*2*np.pi*64) + .6*np.sin(y*2*np.pi*93+.4)
    fine = noise*.6 + (brushed_noise if brushed else 0)
    rgb = np.array(color)[None,None,:] + fine[:,:,None]*1.4
    emit(ident, rgb, np.full((n,n),rough)+fine*3, fine*.08, pitch, .3)


grain('aluminum-structure', [193,200,204], 155, brushed=True)
grain('aluminum-anodized', [173,182,188], 194, brushed=True)
grain('black-anodized-aluminum', [38,44,49], 205)
grain('titanium-tank', [150,154,157], 196, pitch=(.35,.35), brushed=True)
grain('stainless-tube', [178,185,189], 146, pitch=(.12,.12), brushed=True)
grain('refractory-nozzle', [89,91,93], 213, pitch=(.25,.25))
grain('copper-thermal', [180,111,66], 163, pitch=(.15,.15), brushed=True)
grain('gold-plated-contact', [201,168,88], 136, pitch=(.08,.08))
grain('rf-dielectric', [224,220,205], 224, pitch=(.12,.12))
grain('radiator-white-paint', [231,232,225], 239, pitch=(.16,.16))
grain('coverglass', [180,193,199], 70, pitch=(.08,.08))
grain('optical-glass', [34,53,65], 67, pitch=(.12,.12))
grain('harness-polyimide', [153,109,51], 216, pitch=(.06,.06))
grain('solar-blanket-backing', [92,71,42], 208, pitch=(.16,.16))
grain('unresolved-dielectric', [41,45,48], 234, pitch=(.10,.10))

# Smooth wrinkles in aluminized polyimide. The normals carry folds, instead of
# painting triangle-shaped highlights into the color map as the old foil did.
n=1024
y,x=np.mgrid[0:n,0:n]/n
wave = periodic_noise(n, 40, 1, 13)
crease = np.zeros((n,n))
for i in range(17):
    kx, ky = RNG.integers(-9, 10, 2)
    if not kx and not ky: kx=1
    path=np.sin(2*np.pi*(kx*x+ky*y)+RNG.uniform(0,2*np.pi))
    crease += np.exp(-path*path*RNG.uniform(70,250))*RNG.uniform(.18,.55)
height=wave*2.1+crease*4
rgb=np.array([184,135,56])[None,None,:]+wave[:,:,None]*1.6
emit('mli-aluminized-polyimide',rgb,199+wave*8+crease*12,height,[.8,.8],1.25)

# White beta-cloth weave. The actual blanket outer-layer selection remains an
# allocation in the MEL. Fine weave disappears normally through mipmaps.
n=512
y,x=np.mgrid[0:n,0:n]/n
warp=np.cos(2*np.pi*x*32); weft=np.cos(2*np.pi*y*32)
weave=(warp+weft)*.5+.3*warp*weft
rgb=np.array([227,226,216])[None,None,:]+weave[:,:,None]*4
emit('white-beta-cloth',rgb,238+weave*6,weave*.35,[.04,.04],.55)

# Unidirectional composite boom: no invented woven fabric. The pressure-vessel
# winding is a distinct illustrative crossed-fiber pattern, not this surface.
n=512
y,x=np.mgrid[0:n,0:n]/n
fiber=np.sin(x*2*np.pi*129)+.5*np.sin(x*2*np.pi*59+.3)
fiber*=.75+.25*np.cos(y*2*np.pi*2)
rgb=np.array([48,53,57])[None,None,:]+fiber[:,:,None]*2.2
emit('cfrp-boom',rgb,201+fiber*12,fiber*.12,[.08,.32],.55)
a=np.sin(2*np.pi*(48*x+32*y)); b=np.sin(2*np.pi*(48*x-32*y))
winding=(a+b)*.5
rgb=np.array([44,49,53])[None,None,:]+winding[:,:,None]*3
emit('copv-carbon',rgb,188+winding*12,winding*.15,[.18,.18],.55)

# Exposed honeycomb section only. Front face sheets and outer finishes are
# separate meshes; this tile must never cover a closed spacecraft exterior.
n=512
im=Image.new('RGB',(n,n),(66,70,72)); hi=Image.new('L',(n,n),0)
di=ImageDraw.Draw(im); dh=ImageDraw.Draw(hi)
r=n/12
pitch_y=math.sqrt(3)*r
for col in range(-2,10):
    for row in range(-2,10):
        cx=col*1.5*r; cy=(row+.5*(col%2))*pitch_y
        vertices=[(cx+r*math.cos(k*math.pi/3),cy+r*math.sin(k*math.pi/3)) for k in range(6)]
        di.polygon(vertices,fill=(88,94,97),outline=(187,194,198),width=3)
        dh.polygon(vertices,fill=0,outline=220,width=3)
# Correct periodic dimensions by sampling a complete rectangular tessellation.
# Four columns by four rows is periodic; anisotropic resize is documented pitch.
tile=im.crop((0,0,round(6*r),round(4*pitch_y))).resize((n,n),Image.Resampling.LANCZOS)
ht=hi.crop((0,0,round(6*r),round(4*pitch_y))).resize((n,n),Image.Resampling.LANCZOS)
emit('aluminum-honeycomb',np.array(tile),np.full((n,n),195),np.array(ht,dtype=float)/40,[.024,.02771],.6)

# OSR glass mirrors: 40 mm illustrative pitch. Narrow joints, no radiator-fins
# drawn into the thermal-control surface. Specular highlights come from PBR.
n=1024
yy,xx=np.mgrid[0:n,0:n]
pitch=n//8
fx=xx%pitch;fy=yy%pitch
seam=(fx<2)|(fy<2)
tilevar=((xx//pitch)*3+(yy//pitch)*7)%5-2
rgb=np.array([206,216,220])[None,None,:]+tilevar[:,:,None]*.7
rgb=np.broadcast_to(rgb,(n,n,3)).copy();rgb[seam]=[133,144,149]
rough=np.full((n,n),124.);rough[seam]=210
height=np.zeros((n,n));height[seam]=-.7
emit('radiator-osr',rgb,rough,height,[.32,.32],.7)

# PV cell grids retain the good existing cell/readout structure, with a stable
# physical pitch under deployment and a distinct semiconductor choice. Contact
# fingers are fine; they no longer become huge decorative radiator-like bars.
for ident, pitch_m, color, square in [
    ('pv-multijunction',[.64,.32],[25,45,75],False),
    ('pv-silicon',[.64,.64],[31,46,57],True),
]:
    n=1024;cell=n//8
    im=Image.new('RGB',(n,n),(23,27,30));hi=Image.new('L',(n,n),30)
    di=ImageDraw.Draw(im);dh=ImageDraw.Draw(hi)
    for row in range(8):
        for col in range(8):
            xx=col*cell;yy=row*cell
            k=((col*13+row*29)%11)-5
            cc=tuple(c+int(k*(.35 if square else .8)) for c in color)
            cut=4 if square else 10
            pts=[(xx+cut,yy+3),(xx+cell-cut,yy+3),(xx+cell-3,yy+cut),
                 (xx+cell-3,yy+cell-cut),(xx+cell-cut,yy+cell-3),
                 (xx+cut,yy+cell-3),(xx+3,yy+cell-cut),(xx+3,yy+cut)]
            di.polygon(pts,fill=cc,outline=tuple(c+8 for c in cc))
            dh.polygon(pts,fill=55)
            for finger in range(1,19):
                yf=yy+6+finger*(cell-12)/20
                di.line((xx+6,yf,xx+cell-6,yf),fill=tuple(c+16 for c in cc),width=1)
            for dx in [cell*.31,cell*.69]:
                di.line((xx+dx,yy+5,xx+dx,yy+cell-5),fill=(130,141,148),width=1)
            di.rectangle((xx+cell*.47,yy,xx+cell*.53,yy+3),fill=(147,154,149))
    rough=np.full((n,n),137.)
    emit(ident,np.array(im),rough,np.array(hi,dtype=float)/150,pitch_m,.35)

# Board surface only; recognizable copper traces do not purport to reproduce
# an NVIDIA/HPE board layout or a radiation-qualified avionics design.
n=512
im=Image.new('RGB',(n,n),(26,55,49));di=ImageDraw.Draw(im)
for row in range(12):
    yy=12+row*41
    for col in range(4):
        xx=col*128+10;offset=(row*7+col*19)%24
        di.line([(xx,yy),(xx+35,yy),(xx+48,yy+12),(xx+88+offset,yy+12)],fill=(61,81,64),width=2)
        di.ellipse((xx+88+offset-2,yy+10,xx+88+offset+2,yy+14),fill=(126,129,92))
emit('electronics-board',np.array(im),np.full((n,n),228),np.zeros((n,n)),[.24,.24],.1)

manifest=dict(schema='orbital-data-center/material-textures/1',
    revision='spacecraft-materials-2026-11-r1',
    source='scripts/generate-spacecraft-materials.py',
    license='Original project procedural assets; no third-party raster source.',
    maps=MANIFEST)
(DEST/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'{len(MANIFEST)} material texture sets; {sum(p.stat().st_size for p in DEST.glob("*.webp"))/1024/1024:.2f} MiB')
