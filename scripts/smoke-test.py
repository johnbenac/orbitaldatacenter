#!/usr/bin/env python3
"""Browser smoke test for the assembled site (.build/public).

Serves the directory locally, then at desktop and mobile sizes checks that the landing page and
the about page load with the right metadata and no console errors, failed requests or HTTP
errors, and that the workbench opens with a live WebGL canvas. Needs Playwright with Chromium.
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import sys
import threading

from playwright.sync_api import sync_playwright

VIEWS = {'desktop': dict(width=1440, height=900), 'mobile': dict(width=390, height=844)}
CHROME_ARGS = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
               '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
WEBGL = """() => { for (const c of document.querySelectorAll('canvas')) {
  try { if (c.getContext('webgl2') || c.getContext('webgl')) return true; } catch (e) {} } return false; }"""
PAGE_INFO = """() => ({title: document.title,
  canonical: (document.querySelector('link[rel=canonical]') || {}).href,
  og: (document.querySelector('meta[property="og:image"]') || {}).content,
  jsonld: document.querySelectorAll('script[type="application/ld+json"]').length,
  author: !!document.querySelector('a[href*="linkedin.com/in/johnbenac"]'),
  overflow: document.documentElement.scrollWidth > window.innerWidth + 1})"""


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def check_view(playwright, base, name, size, timeout_s):
    problems = []
    browser = playwright.chromium.launch(args=CHROME_ARGS)
    context = browser.new_context(viewport=size, is_mobile=(name == 'mobile'))
    page = context.new_page()
    page.on('pageerror', lambda e: problems.append(f'{name}: page error: {str(e)[:200]}'))
    page.on('console', lambda m: problems.append(f'{name}: console error: {m.text[:200]}')
            if m.type == 'error' else None)
    page.on('requestfailed', lambda r: problems.append(f'{name}: request failed: {r.url[-100:]}'))
    page.on('response', lambda r: problems.append(f'{name}: HTTP {r.status}: {r.url[-100:]}')
            if r.status >= 400 else None)
    page.goto(base + '/about/', wait_until='load')
    about = page.evaluate(PAGE_INFO)
    if not about['canonical'] or not about['canonical'].endswith('/about/'):
        problems.append(f'{name}: about page canonical is wrong: {about["canonical"]}')
    page.goto(base + '/', wait_until='load')
    info = page.evaluate(PAGE_INFO)
    for key in ('canonical', 'og'):
        if not info[key]:
            problems.append(f'{name}: landing page is missing {key}')
    if not info['jsonld'] or not info['author']:
        problems.append(f'{name}: landing page is missing structured data or the author link')
    if info['overflow']:
        problems.append(f'{name}: landing page scrolls horizontally')
    opened = False
    for _ in range(timeout_s // 5):
        page.wait_for_timeout(5000)
        if page.evaluate("document.querySelectorAll('canvas').length") > 0:
            opened = True
            break
    if not opened:
        problems.append(f'{name}: the workbench did not open a canvas within {timeout_s}s')
    elif not page.evaluate(WEBGL):
        problems.append(f'{name}: no WebGL context on the workbench')
    page.wait_for_timeout(5000)  # let late errors surface
    browser.close()
    return problems


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dir', type=Path, default=Path(__file__).resolve().parents[1] / '.build/public')
    parser.add_argument('--timeout', type=int, default=300, help='Seconds to wait for the workbench')
    parser.add_argument('--views', nargs='+', default=list(VIEWS), choices=list(VIEWS))
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(args.dir)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    problems = []
    with sync_playwright() as playwright:
        for name in args.views:
            problems += check_view(playwright, base, name, VIEWS[name], args.timeout)
    server.shutdown()
    print(json.dumps({'views': args.views, 'problems': problems}, indent=2))
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
