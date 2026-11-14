#!/usr/bin/env python3
"""Production guard for Cloudflare Pages: record the live deployment, verify a new one, roll back.

    pages-guard.py current                   print the live production deployment (JSON)
    pages-guard.py verify --previous-id ID   check the live site; on failure roll back to ID

Reads CLOUDFLARE_API_TOKEN from the environment.
"""
import argparse
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request

ACCOUNT = '3c20efc51551c69eba728cdb54093b6b'
PROJECT = 'orbitaldatacenter'
BASE = f'/accounts/{ACCOUNT}/pages/projects/{PROJECT}'


def api(path, method='GET'):
    request = urllib.request.Request(
        'https://api.cloudflare.com/client/v4' + path, method=method,
        headers={'Authorization': 'Bearer ' + os.environ['CLOUDFLARE_API_TOKEN'],
                 'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=45) as response:
        result = json.load(response)
    if not result.get('success'):
        raise RuntimeError(f'Cloudflare {method} {path}: {result.get("errors")}')
    return result['result']


def current():
    deployment = api(BASE).get('canonical_deployment') or {}
    metadata = (deployment.get('deployment_trigger') or {}).get('metadata') or {}
    return {'id': deployment.get('id', ''), 'commit_hash': metadata.get('commit_hash', '')}


def fetch(url):
    request = urllib.request.Request(url, headers={'Cache-Control': 'no-cache', 'User-Agent': 'odc-guard'})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, b''


def site_problems(url, index_sha256):
    problems = []
    status, body = fetch(url + '/')
    if status != 200:
        problems.append(f'/ returned {status}')
    elif index_sha256 and hashlib.sha256(body).hexdigest() != index_sha256:
        problems.append('/ is not the freshly built index.html')
    for path in ('/about/', '/assets.json.zip', '/robots.txt'):
        status, _ = fetch(url + path)
        if status != 200:
            problems.append(f'{path} returned {status}')
    return problems


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('current')
    verify = sub.add_parser('verify')
    verify.add_argument('--url', default='https://orbitaldatacenter.design')
    verify.add_argument('--index-sha256', default='')
    verify.add_argument('--previous-id', default='')
    verify.add_argument('--wait', type=int, default=240, help='Seconds to allow for edge propagation')
    args = parser.parse_args()
    if args.command == 'current':
        print(json.dumps(current()))
        return 0
    deadline, problems = time.time() + args.wait, ['not checked']
    while problems and time.time() < deadline:
        problems = site_problems(args.url, args.index_sha256)
        if problems:
            time.sleep(15)
    if not problems:
        print('Production verified.')
        return 0
    print('Production verification failed:', *problems, sep='\n  ')
    if args.previous_id:
        api(f'{BASE}/deployments/{args.previous_id}/rollback', 'POST')
        print(f'Rolled back to deployment {args.previous_id}.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
