"""Build static display sizes and launch screens from the two editable SVG masters.

Run from any directory with Python, Pillow and Inkscape. The browser serves the
generated files directly. The icon master is the optical reduction for tiny sizes.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile
import subprocess
import xml.etree.ElementTree as ET

from PIL import Image

DIST = Path(__file__).resolve().parents[1] / 'dist'
SVG = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG)


def raster(source, output, size):
    subprocess.run([
        'inkscape', str(source), '--export-filename=' + str(output),
        '--export-width=' + str(size), '--export-height=' + str(size),
    ], check=True, stdout=subprocess.DEVNULL)


def launch_art(portrait):
    width, height = (720, 800) if portrait else (1280, 620)
    x, y, size = (198, 85, 324) if portrait else (120, 110, 400)
    text_x = width / 2 if portrait else 580
    baseline = 486 if portrait else 218
    align = 'middle' if portrait else 'start'
    title_size = 66 if portrait else 74
    source = ET.parse(DIST / 'mission-patch.svg').getroot()
    drawing = ''.join(ET.tostring(child, encoding='unicode') for child in source if child.tag != f'{{{SVG}}}title')
    # A few deliberately small stars leave clear space around the insignia and type.
    stars = ''.join(
        f'<circle cx="{(i*193+49)%width}" cy="{(i*157+37)%(height-100)}" r="{1 if i%5 else 1.6}"/>'
        for i in range(53)
    )
    arcs = ''.join(
        f'<path d="M{-width*.2:.0f} {height+92+j*12} Q{width*.46:.0f} {height-245+j*9} {width*1.16:.0f} {height-95+j*9}"/>'
        for j in range(15)
    )
    return f'''<svg xmlns="{SVG}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="cover-title">
<title id="cover-title">Orbital Data Center · Mission engineering workbench</title>
<defs><radialGradient id="cover-light" cx=".32" cy=".42" r=".88"><stop stop-color="#203c49"/><stop offset=".67" stop-color="#112733"/><stop offset="1" stop-color="#0a1c27"/></radialGradient></defs>
<rect width="100%" height="100%" fill="url(#cover-light)"/>
<g fill="#a7c3c9" opacity=".40">{stars}</g>
<g fill="none" stroke="#63979a" stroke-width="1.2" opacity=".19">{arcs}</g>
<path d="M0 {height*.20:.0f}Q{width*.32:.0f} {-height*.12:.0f} {width} {height*.11:.0f}" stroke="#ad9d76" opacity=".25" fill="none"/>
<g transform="translate({x} {y}) scale({size/512:.8f})">{drawing}</g>
<g text-anchor="{align}" font-family="DejaVu Sans, system-ui, sans-serif">
 <text x="{text_x}" y="{baseline}" fill="#ebbf79" font-size="17" font-weight="600" letter-spacing="4">ODC–01</text>
 <text x="{text_x}" y="{baseline+83}" fill="#f6eddb" font-size="{title_size}" font-weight="700" letter-spacing="-2.5">Orbital</text>
 <text x="{text_x}" y="{baseline+160}" fill="#f6eddb" font-size="{title_size}" font-weight="700" letter-spacing="-2.5">Data Center</text>
 <text x="{text_x}" y="{baseline+209}" fill="#a4ccc8" font-size="{16 if portrait else 19}" letter-spacing="1">Mission engineering workbench</text>
</g></svg>'''


def build():
    master = DIST / 'mission-patch.svg'
    texture = DIST / 'mission-patch-512.png'
    raster(master, texture, 512)
    with TemporaryDirectory() as temp:
        reduction = Path(temp) / 'reduction.png'
        raster(DIST / 'mark.svg', reduction, 256)
        with Image.open(reduction).convert('RGBA') as icon:
            icon.save(DIST / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
            icon.resize((32, 32), Image.Resampling.LANCZOS).save(DIST / 'favicon-32.png')
    with Image.open(texture).convert('RGBA') as patch:
        for name, pixels, fraction in [('apple-touch-icon.png', 180, .91), ('icon-192.png', 192, .96), ('icon-maskable-512.png', 512, .78)]:
            width = round(pixels * fraction)
            icon = Image.new('RGB', (pixels, pixels), '#12242e')
            art = patch.resize((width, width), Image.Resampling.LANCZOS)
            icon.paste(art, ((pixels-width)//2, (pixels-width)//2), art)
            icon.save(DIST / name, optimize=True)
    for aspect in ['portrait', 'landscape']:
        (DIST / f'splash-{aspect}.svg').write_text(launch_art(aspect == 'portrait') + '\n')
    names = ['mission-patch.svg', 'mission-patch-512.png', 'mark.svg', 'favicon.ico', 'favicon-32.png',
             'icon-192.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'splash-portrait.svg', 'splash-landscape.svg']
    with ZipFile(DIST / 'orbital-data-center-identity.zip', 'w', ZIP_DEFLATED) as archive:
        for name in names:
            archive.write(DIST / name, name)


if __name__ == '__main__':
    build()
