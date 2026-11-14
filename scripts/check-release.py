#!/usr/bin/env python3
"""Static checks for the deployable dist/ directory.

Verifies that the asset index (dist/assets.json.zip or dist/assets.json) is well formed and lists
only files that exist, that no file exceeds the Cloudflare Pages per-file limit, that there are no
symbolic links, and that every JavaScript file parses.
"""
import argparse
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess
import sys
from zipfile import BadZipFile, ZipFile

PAGES_FILE_LIMIT = 25 * 1024 * 1024


def read_index(dist):
    """Return the list of static assets, or raise ValueError."""
    packed, plain = dist / 'assets.json.zip', dist / 'assets.json'
    if packed.is_file() == plain.is_file():
        raise ValueError('dist must contain exactly one of assets.json.zip and assets.json')
    try:
        if packed.is_file():
            with ZipFile(packed) as archive:
                if archive.namelist() != ['assets.json']:
                    raise ValueError('assets.json.zip must contain only assets.json')
                data = archive.read('assets.json')
        else:
            data = plain.read_bytes()
    except BadZipFile as error:
        raise ValueError(f'assets.json.zip is not a valid ZIP: {error}') from error
    assets = json.loads(data)
    if not isinstance(assets, list) or not all(isinstance(name, str) for name in assets):
        raise ValueError('The asset index must be an array of relative filenames')
    return assets


def syntax_error(path):
    result = subprocess.run(['node', '--check', str(path)], capture_output=True, text=True)
    return None if result.returncode == 0 else f'{path}: {result.stderr.strip().splitlines()[-1:]}'


def check(dist, syntax=True):
    dist = Path(dist)
    problems = []
    if not (dist / 'index.html').is_file():
        return ['dist/index.html is missing']
    try:
        assets = read_index(dist)
    except (ValueError, OSError) as error:
        return [str(error)]
    for name in assets:
        parts = name.split('/')
        if name.startswith('/') or '\\' in name or any(p in ('', '.', '..') for p in parts):
            problems.append(f'unsafe asset path: {name}')
        elif not (dist / name).is_file():
            problems.append(f'listed asset is missing: {name}')
    files = [p for p in dist.rglob('*') if p.is_file() or p.is_symlink()]
    for path in files:
        if path.is_symlink():
            problems.append(f'symbolic link: {path.relative_to(dist)}')
        elif path.stat().st_size > PAGES_FILE_LIMIT:
            problems.append(f'over the 25 MiB Pages limit: {path.relative_to(dist)}')
    if syntax:
        scripts = [p for p in files if p.suffix == '.js' and not p.is_symlink()]
        with ThreadPoolExecutor(max_workers=4) as pool:
            problems += [m for m in pool.map(syntax_error, scripts) if m]
    return problems


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist', type=Path, default=Path(__file__).resolve().parents[1] / 'dist')
    parser.add_argument('--no-syntax', action='store_true', help='Skip the node --check pass')
    args = parser.parse_args()
    problems = check(args.dist, syntax=not args.no_syntax)
    for problem in problems:
        print('FAIL', problem)
    print(f'{len(problems)} problem(s)' if problems else 'dist checks passed')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
