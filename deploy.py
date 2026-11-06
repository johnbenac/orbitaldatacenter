#!/usr/bin/env python3
"""Publish the supplied static release to John's Cloudflare Pages account."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent
ACCOUNT = '3c20efc51551c69eba728cdb54093b6b'
ZONE = '8bb638583199402382cb9c0611fc3f78'
PROJECT = 'orbitaldatacenter'
DOMAIN = 'orbitaldatacenter.design'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('release', nargs='?', type=Path, default=ROOT,
                        help='Release directory containing dist/ (default: this checkout)')
    args = parser.parse_args()
    release = args.release.resolve()
    if not (release / 'dist/index.html').is_file():
        parser.error('Release must contain dist/index.html')
    subprocess.run([sys.executable, str(ROOT / 'scripts/build-site.py'),
                    '--source', str(release)], check=True)
    dist = ROOT / '.build/public'
    token = Path('/root/.config/orbitaldatacenter/cloudflare-api-token').read_text().strip()

    def api(path, method='GET', body=None, missing_ok=False):
        request = urllib.request.Request(
            'https://api.cloudflare.com/client/v4' + path,
            method=method,
            headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'},
            data=None if body is None else json.dumps(body).encode(),
        )
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            if error.code == 404 and missing_ok:
                return None
            raise RuntimeError(f'Cloudflare {method} {path}: HTTP {error.code}') from None
        if not result.get('success'):
            raise RuntimeError(f'Cloudflare {method} {path}: {result.get("errors")}')
        return result.get('result')

    base = f'/accounts/{ACCOUNT}/pages/projects/{PROJECT}'
    project = api(base, missing_ok=True)
    if project is None:
        project = api(f'/accounts/{ACCOUNT}/pages/projects', 'POST', {
            'name': PROJECT, 'production_branch': 'main',
        })
        print('Created Pages project:', project['name'], flush=True)

    env = dict(os.environ)
    env.update(CLOUDFLARE_API_TOKEN=token, CLOUDFLARE_ACCOUNT_ID=ACCOUNT,
               WRANGLER_SEND_METRICS='false',
               XDG_CONFIG_HOME=str(ROOT / '.deploy-state'))
    tooling = Path('/charactum/operations/cloud-foundation/node_modules')
    command = [str(tooling / 'node/bin/node'), str(tooling / 'wrangler/bin/wrangler.js')]
    subprocess.run(command + ['pages', 'deploy', str(dist), '--project-name', PROJECT,
                             '--branch', 'main', '--commit-dirty=true'],
                   cwd=release, env=env, check=True)

    domains = api(base + '/domains')
    if DOMAIN not in {item['name'] for item in domains}:
        api(base + '/domains', 'POST', {'name': DOMAIN})
        print('Attached domain:', DOMAIN, flush=True)

    records = api(f'/zones/{ZONE}/dns_records?name={DOMAIN}')
    website_records = [item for item in records if item['type'] in ('A', 'AAAA', 'CNAME')]
    target = project['subdomain']
    if not website_records:
        api(f'/zones/{ZONE}/dns_records', 'POST', {
            'type': 'CNAME', 'name': DOMAIN, 'content': target,
            'proxied': True, 'ttl': 1,
            'comment': 'Orbital Data Center Pages production website, 2026-11-05',
        })
        print('Created production DNS record.', flush=True)
    elif any(item['type'] != 'CNAME' or item['content'] != target for item in website_records):
        raise RuntimeError('Existing website DNS conflicts with Pages; review before replacing.')

    project = api(base)
    snapshot = {
        'release': release.name,
        'source_commit': subprocess.check_output(
            ['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'index_sha256': hashlib.sha256((dist / 'index.html').read_bytes()).hexdigest(),
        'project': PROJECT,
        'deployment': project.get('canonical_deployment'),
        'domains': api(base + '/domains'),
    }
    output = ROOT / 'deployment-records'
    output.mkdir(exist_ok=True)
    (output / 'production.json').write_text(json.dumps(snapshot, indent=2) + '\n')
    print('Deployment recorded:', output / 'production.json', flush=True)


if __name__ == '__main__':
    main()
