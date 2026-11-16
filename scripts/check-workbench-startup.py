#!/usr/bin/env python3
"""Check first spacecraft paint and interaction for fresh reference studies.

Unlike the metadata smoke test, an allocated canvas is not a successful startup.
The startup cover must close, the selected spacecraft must reach a completed scene
render, and a camera control must remain responsive. Serve .build/public locally,
or use --url to check an already deployed build. Needs Playwright and the selected
browser binaries; this script does not install them.
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import threading
import time

from playwright.sync_api import Error, TimeoutError, sync_playwright

VIEWS = {'desktop': dict(width=1440, height=900), 'mobile': dict(width=390, height=844)}
CASES = {
    'default': ('/', 'redwire-8kw'),
    'spacex': ('/?center=starmind-ai1&play=0', 'starmind-ai1'),
}
CHROME_ARGS = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
               '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
SCENE_CANVAS = '#scene > canvas'
READY = """center => {
  const host = document.getElementById('scene');
  const cover = document.getElementById('startup');
  const canvas = host?.querySelector('canvas');
  return !!(cover?.hidden && !document.body.hasAttribute('data-starting') &&
    host?.dataset.renderedReferenceCenter === center &&
    (center !== 'starmind-ai1' || host.dataset.renderedRouting === 'compiled-native') &&
    Number(host.dataset.renderedFrames) > 0 && canvas?.width > 0 &&
    canvas.height > 0 && canvas.getBoundingClientRect().width > 0 &&
    canvas.getBoundingClientRect().height > 0);
}"""
STATE = """() => {
  const host = document.getElementById('scene');
  const canvas = host?.querySelector('canvas');
  const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
  return {
    startupHidden: !!document.getElementById('startup')?.hidden,
    starting: document.body.hasAttribute('data-starting'),
    renderedFrames: Number(host?.dataset.renderedFrames || 0),
    firstRenderMs: Number(host?.dataset.firstRenderMs || 0),
    renderedReferenceCenter: host?.dataset.renderedReferenceCenter || null,
    renderedRouting: host?.dataset.renderedRouting || null,
    renderer: host?.dataset.renderer || null,
    webglAvailable: !!gl, contextLost: gl ? gl.isContextLost() : null,
    workStatus: document.getElementById('work-status')?.innerText || '',
    sceneStatus: document.getElementById('scene-loading')?.innerText || '',
    cameraMode: document.querySelector('[data-camera-mode][aria-pressed="true"]')
      ?.getAttribute('data-camera-mode') || null
  };
}"""


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def remaining_ms(deadline):
    return max(1, int((deadline - time.monotonic()) * 1000))


def check_case(playwright, base, browser_name, view_name, case_name, timeout_s):
    path, center = CASES[case_name]
    label = f'{browser_name}/{view_name}/{case_name}'
    result = {'case': label, 'url': base + path, 'expectedReferenceCenter': center,
              'problems': []}
    problems = result['problems']
    browser = None
    page = None
    metrics = None
    listeners = {}
    started = time.monotonic()
    deadline = started + timeout_s
    try:
        browser_type = getattr(playwright, browser_name)
        browser = browser_type.launch(args=CHROME_ARGS if browser_name == 'chromium' else [])
        context_options = {'viewport': VIEWS[view_name], 'reduced_motion': 'reduce'}
        # Firefox supports the small viewport but not Chromium's mobile emulation flag.
        if browser_name == 'chromium':
            context_options['is_mobile'] = view_name == 'mobile'
        context = browser.new_context(**context_options)
        page = context.new_page()
        listeners = {
            'pageerror': lambda error: problems.append(f'Page error: {str(error)[:300]}'),
            'console': lambda message: problems.append(f'Console error: {message.text[:300]}')
            if message.type == 'error' else None,
            'requestfailed': lambda request: problems.append(
                f'Request failed: {request.url[-160:]}'),
            'response': lambda response: problems.append(
                f'HTTP {response.status}: {response.url[-160:]}')
            if response.status >= 400 else None,
        }
        for event, listener in listeners.items():
            page.on(event, listener)
        if browser_name == 'chromium':
            metrics = context.new_cdp_session(page)
            metrics.send('Performance.enable')
        page.goto(base + path, wait_until='domcontentloaded', timeout=remaining_ms(deadline))
        page.wait_for_function(READY, arg=center, timeout=remaining_ms(deadline))
        result['firstFrameSeconds'] = round(time.monotonic() - started, 3)
        state = page.evaluate(STATE)
        result['firstFrame'] = state
        if state['renderer'] != 'webgl' or not state['webglAvailable'] or state['contextLost']:
            problems.append('The spacecraft did not paint into an available WebGL context.')

        # Exercise the real camera controls on a paused study. Checking both the
        # selected control and a subsequent paint rejects a merely allocated canvas.
        target = 'body' if state['cameraMode'] != 'body' else 'orbit'
        interaction_started = time.monotonic()
        frames = state['renderedFrames']
        page.locator(f'#camera-mode-{target}').click(timeout=10000)
        page.wait_for_function("""({center, frames, target}) => {
          const host = document.getElementById('scene');
          return host?.dataset.renderedReferenceCenter === center &&
            (center !== 'starmind-ai1' || host.dataset.renderedRouting === 'compiled-native') &&
            Number(host.dataset.renderedFrames) > frames &&
            document.getElementById('camera-mode-' + target)?.getAttribute('aria-pressed')
              === 'true';
        }""", arg={'center': center, 'frames': frames, 'target': target}, timeout=10000)
        frames = page.evaluate("Number(document.getElementById('scene').dataset.renderedFrames)")
        page.locator(SCENE_CANVAS).press('ArrowRight', timeout=10000)
        page.wait_for_function("""frames =>
          Number(document.getElementById('scene')?.dataset.renderedFrames) > frames
        """, arg=frames, timeout=10000)
        result['interactionSeconds'] = round(time.monotonic() - interaction_started, 3)
        result['afterInteraction'] = page.evaluate(STATE)
        page.wait_for_timeout(1000)
    except TimeoutError as error:
        problems.append(f'Startup or interaction deadline exceeded: {str(error)[:400]}')
    except Error as error:
        problems.append(f'Browser check failed: {str(error)[:400]}')
    finally:
        if not problems and page is not None and not page.is_closed():
            try:
                result['finalState'] = page.evaluate(STATE)
            except Error:
                result['finalState'] = 'Main thread unavailable after the deadline.'
        if not problems and metrics is not None:
            try:
                values = {item['name']: item['value']
                          for item in metrics.send('Performance.getMetrics')['metrics']}
                # These are renderer-main-thread values, not browser/worker totals
                # or a peak-RAM measurement. Report them without a machine-specific gate.
                result['rendererMainThreadMetrics'] = {
                    key: values[key] for key in ('TaskDuration', 'ScriptDuration',
                                                'JSHeapUsedSize', 'JSHeapTotalSize', 'Nodes')
                    if key in values}
            except Error:
                result['rendererMainThreadMetrics'] = 'Unavailable after the deadline.'
        if browser is not None:
            # Closing the test context intentionally aborts optional image loads.
            # Those teardown cancellations are not application request failures.
            if page is not None:
                for event, listener in listeners.items():
                    page.remove_listener(event, listener)
            browser.close()
        result['elapsedSeconds'] = round(time.monotonic() - started, 3)
    return result


def bounded_case(base, browser, view, case, timeout_s):
    # Playwright's selector deadlines do not bound a raw Runtime.evaluate when a
    # renderer is wedged. Run each complete check in its own process group, with
    # a wall deadline that also covers diagnostic reads and browser shutdown.
    command = [sys.executable, str(Path(__file__).resolve()), '--single-case',
               '--url', base, '--browsers', browser, '--views', view, '--cases', case,
               '--timeout', str(timeout_s)]
    started = time.monotonic()
    child = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                             text=True, start_new_session=os.name == 'posix')
    try:
        stdout, stderr = child.communicate(timeout=timeout_s + 45)
    except subprocess.TimeoutExpired:
        if os.name == 'posix':
            os.killpg(child.pid, signal.SIGKILL)
        else:
            child.kill()
        child.communicate()
        return {'case': f'{browser}/{view}/{case}', 'url': base + CASES[case][0],
                'elapsedSeconds': round(time.monotonic() - started, 3),
                'problems': ['Browser process exceeded the complete case deadline '
                             f'({timeout_s}s startup + 45s interaction/cleanup).']}
    try:
        result = json.loads(stdout)
        if child.returncode and not result.get('problems'):
            result.setdefault('problems', []).append(f'Check process exited {child.returncode}.')
        return result
    except (json.JSONDecodeError, AttributeError):
        return {'case': f'{browser}/{view}/{case}', 'url': base + CASES[case][0],
                'elapsedSeconds': round(time.monotonic() - started, 3),
                'problems': [f'Check process exited {child.returncode} without a result.',
                             (stderr or stdout)[-1200:]]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dir', type=Path,
                        default=Path(__file__).resolve().parents[1] / '.build/public')
    parser.add_argument('--url', help='Use an existing site instead of the local build.')
    parser.add_argument('--timeout', type=int, default=300,
                        help='Startup deadline per fresh browser context, in seconds.')
    parser.add_argument('--views', nargs='+', choices=list(VIEWS), default=list(VIEWS))
    parser.add_argument('--cases', nargs='+', choices=list(CASES), default=list(CASES))
    parser.add_argument('--browsers', nargs='+', choices=['chromium', 'firefox'],
                        default=['chromium'])
    parser.add_argument('--single-case', action='store_true', help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.timeout <= 0:
        parser.error('--timeout must be positive')
    if args.single_case:
        if not args.url or any(len(values) != 1 for values in
                               (args.browsers, args.views, args.cases)):
            parser.error('--single-case requires --url and one browser, view and case')
        with sync_playwright() as playwright:
            result = check_case(playwright, args.url.rstrip('/'), args.browsers[0],
                                args.views[0], args.cases[0], args.timeout)
        print(json.dumps(result))
        return int(bool(result['problems']))
    server = None
    if args.url:
        base = args.url.rstrip('/')
    else:
        server = ThreadingHTTPServer(('127.0.0.1', 0),
                                     partial(Quiet, directory=str(args.dir)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{server.server_address[1]}'
    try:
        results = [bounded_case(base, browser, view, case, args.timeout)
                   for browser in args.browsers for view in args.views for case in args.cases]
    finally:
        if server is not None:
            server.shutdown()
            server.server_close()
    print(json.dumps({'checks': results}, indent=2))
    return int(any(result['problems'] for result in results))


if __name__ == '__main__':
    sys.exit(main())
