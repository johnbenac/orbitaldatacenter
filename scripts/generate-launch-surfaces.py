"""Generate original launch-surface textures (Pillow / numpy; no network).

Color is sRGB. The second texture packs linear bump height in R and physical
roughness in G; B is reserved. No directional lighting is baked into albedo.
These are presentation materials, not measured thermal/optical properties.
"""
from pathlib import Path
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parents[1] / 'dist/assets/launch-vehicles'
OUT.mkdir(parents=True, exist_ok=True)
RNG = np.random.default_rng(41956)

def save(name, albedo, height, roughness):
    albedo.convert('RGB').save(OUT / (name + '-albedo.webp'), quality=92, method=6)
    data = Image.merge('RGB', (height.convert('L'), roughness.convert('L'), Image.new('L', albedo.size, 128)))
    data.save(OUT / (name + '-surface.png'), optimize=True)

def grain(width, height, rgb, amount=1.5, long_grain=False):
    noise = RNG.normal(0, amount, (height, width))
    if long_grain:
        noise += RNG.normal(0, amount * .7, (height, 1))
    arr = np.clip(np.array(rgb)[None, None, :] + noise[..., None], 0, 255).astype('uint8')
    return Image.fromarray(arr)

def painted():
    w, h = 1024, 2048
    color = grain(w, h, (231, 232, 228), .65)
    height = Image.new('L', (w, h), 128)
    rough = Image.new('L', (w, h), 157)
    c, b, r = ImageDraw.Draw(color), ImageDraw.Draw(height), ImageDraw.Draw(rough)
    # Fine circumferential lap seams and restrained inspection-panel details.
    for y in range(0, h, 256):
        c.line((0, y, w, y), fill=(203, 209, 207), width=2)
        c.line((0, y+2, w, y+2), fill=(239, 239, 235), width=1)
        b.line((0, y, w, y), fill=97, width=2)
        b.line((0, y+2, w, y+2), fill=166, width=1)
        r.line((0, y, w, y), fill=183, width=4)
        for x in range(12, w, 32):
            c.ellipse((x, y+6, x+2, y+8), fill=(177, 187, 188))
            b.ellipse((x, y+6, x+2, y+8), fill=171)
    for x, y in [(127, 438), (640, 1456), (904, 876)]:
        c.rounded_rectangle((x, y, x+37, y+68), radius=6, outline=(179, 190, 191), width=2)
        b.rounded_rectangle((x, y, x+37, y+68), radius=6, outline=81, width=2)
        for dx in [4, 32]:
            for dy in [8, 60]:
                c.ellipse((x+dx, y+dy, x+dx+2, y+dy+2), fill=(127, 143, 146))
    save('paint', color, height, rough)

def metal(name, base, roughness):
    w, h = 2048, 2048
    color = grain(w, h, base, 1.2, True)
    height = Image.new('L', (w, h), 128)
    rr = np.clip(np.round((RNG.normal(roughness, 2, (h, w)) + RNG.normal(0, 3, (h, 1)))/4)*4, 0, 255).astype('uint8')
    rough = Image.fromarray(rr)
    c, b, r = ImageDraw.Draw(color), ImageDraw.Draw(height), ImageDraw.Draw(rough)
    rings = 40 if name == 'stainless' else 22
    for k in range(rings):
        y = round(k*h/rings)
        # Subtle weld heat tint and a narrow raised seam, not a painted stripe.
        tint = tuple(max(0, int(v)-14) for v in base)
        c.line((0, y, w, y), fill=tint, width=2)
        c.line((0, y+2, w, y+2), fill=tuple(min(255, int(v)+11) for v in base), width=1)
        b.line((0, y-1, w, y-1), fill=108, width=1)
        b.line((0, y, w, y), fill=177, width=2)
        r.line((0, y, w, y), fill=roughness+21, width=5)
        x = (k*311) % w
        c.line((x, y+4, x, y+int(h/rings)-2), fill=tuple(int(v)-9 for v in base), width=1)
        b.line((x, y+4, x, y+int(h/rings)-2), fill=149, width=1)
    save(name, color, height, rough)

def ceramic():
    w, h = 1024, 2048
    color = Image.new('RGB', (w, h), (15, 20, 24))
    height = Image.new('L', (w, h), 35)
    rough = Image.new('L', (w, h), 245)
    c, b, r = ImageDraw.Draw(color), ImageDraw.Draw(height), ImageDraw.Draw(rough)
    radius = 4.2
    dx, dy = math.sqrt(3)*radius, radius*1.5
    for row in range(-1, math.ceil(h/dy)+1):
        for col in range(-1, math.ceil(w/dx)+1):
            x, y = dx*(col+.5*(row&1)), row*dy
            points = [(x+math.cos((k+.5)*math.pi/3)*(radius-.24), y+math.sin((k+.5)*math.pi/3)*(radius-.24)) for k in range(6)]
            value = 42+int(RNG.integers(0, 12))
            c.polygon(points, fill=(value, value+4, value+6))
            b.polygon(points, fill=132+int(RNG.integers(-3, 4)))
            r.polygon(points, fill=218+int(RNG.integers(-9, 10)))
    save('ceramic', color, height, rough)

def composite():
    w, h = 512, 1024
    y, x = np.mgrid[0:h, 0:w]
    weave = (np.sin(x*.92) * np.cos(y*.92))
    v = 32 + weave*3 + RNG.normal(0, .45, (h, w))
    color = Image.fromarray(np.clip(np.stack([v, v+3, v+6], -1), 0, 255).astype('uint8'))
    height = Image.fromarray((128+weave*11).astype('uint8'))
    rough = Image.fromarray((184+weave*12).astype('uint8'))
    save('composite', color, height, rough)

def star(cx, cy, radius, angle=-math.pi/2):
    return ' '.join(f'{cx+math.cos(angle+k*math.pi/5)*(radius if k%2==0 else radius*.382):.3f},{cy+math.sin(angle+k*math.pi/5)*(radius if k%2==0 else radius*.382):.3f}' for k in range(10))

def flags():
    us = ['<rect width="190" height="100" fill="#fff"/>']
    us += [f'<rect y="{j*100/13}" width="190" height="{100/13}" fill="#b31942"/>' for j in range(0, 13, 2)]
    us += ['<rect width="76" height="53.846" fill="#0a3161"/>']
    for row in range(9):
        count = 6 if row%2==0 else 5
        us += [f'<polygon points="{star(6.3+col*12.65+(0 if count==6 else 6.3),5.1+row*5.45,2.35)}" fill="#fff"/>' for col in range(count)]
    (OUT/'flag-us.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="950" height="500" viewBox="0 0 190 100">'+''.join(us)+'</svg>')
    cn = ['<rect width="150" height="100" fill="#de2910"/>', f'<polygon points="{star(25,25,15)}" fill="#ffde00"/>']
    for x, y in [(50,10),(60,20),(60,35),(50,45)]:
        cn.append(f'<polygon points="{star(x,y,5,math.atan2(25-y,25-x))}" fill="#ffde00"/>')
    (OUT/'flag-cn.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="750" height="500" viewBox="0 0 150 100">'+''.join(cn)+'</svg>')
    eu = ['<rect width="150" height="100" fill="#003399"/>']
    eu += [f'<polygon points="{star(75+math.sin(k*math.pi/6)*31,50-math.cos(k*math.pi/6)*31,5)}" fill="#ffcc00"/>' for k in range(12)]
    (OUT/'flag-eu.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="750" height="500" viewBox="0 0 150 100">'+''.join(eu)+'</svg>')

def relativity_pattern():
    # Geometric diamond motif visible in the provider's Terran R reference.
    paths=[]
    for row in range(9):
        for col in range(8):
            size=16*(1-row/10)
            x=col*46+(row%2)*23
            y=460-row*48
            paths.append(f'<path d="M{x} {y-size}l{size} {size}l{-size} {size}l{-size} {-size}Z" fill="none" stroke="#26343c" stroke-width="{max(1,3-row*.22):.2f}"/>')
    (OUT/'relativity-diamonds.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="-23 0 384 512">'+''.join(paths)+'</svg>')

if __name__ == '__main__':
    painted()
    metal('aluminium', (193, 199, 201), 123)
    metal('stainless', (178, 185, 190), 98)
    ceramic()
    composite()
    flags()
    relativity_pattern()
    print('Generated five paired launch surfaces, three flags and the Terran R reference motif.')
