import asyncio,argparse,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
async def main(args):
 async with async_playwright() as p:
  launch={'headless':True,'args':['--no-sandbox','--disable-gpu']}
  if args.chromium:launch['executable_path']=args.chromium
  browser=await p.chromium.launch(**launch);page=await browser.new_page(viewport={'width':2000,'height':2500},device_scale_factor=1);page.set_default_timeout(120000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto((ROOT/args.html).as_uri(),wait_until='load')
  if args.preview:
   await page.evaluate("document.querySelectorAll('.comparison').forEach(i=>i.src=i.src.replace('.png','-preview.png'))")
  await page.evaluate('document.fonts.ready');await page.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)')
  geometry=await page.evaluate('({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,images:document.images.length,cta:document.querySelector("footer a").href,overflow:[...document.querySelectorAll(".sizes,h2,footer")].filter(e=>e.scrollWidth>e.clientWidth).map(e=>e.textContent)})')
  assert geometry['width']==2000 and geometry['height']==2500,geometry
  assert not geometry['overflow'],geometry
  assert len(errors)==0,errors
  target=ROOT/(args.out or ('orbital-landmarks-preview.png' if args.preview else 'orbital-data-center-plans-orbit-landmarks-4x5.png'))
  await page.screenshot(path=str(target),full_page=True);(ROOT/('poster-validation.json' if args.html=='poster.html' else args.html.replace('.html','-validation.json'))).write_text(json.dumps(geometry,indent=2));print(target,geometry);await browser.close()
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--chromium');p.add_argument('--preview',action='store_true');p.add_argument('--html',default='poster.html');p.add_argument('--out');asyncio.run(main(p.parse_args()))
