#!/usr/bin/env python3
"""Review or apply a developer ZIP without overwriting site-owned features."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import stat
import tempfile
from zipfile import BadZipFile, ZipFile

MANIFEST = 'upstream-files.json'
ROOT_DOCS = {'DESIGN.md', 'ENGINE.md', 'SCENE.md', 'requirements.txt', 'package.json'}
UPSTREAM_TOOLS = {'tools/build-identity.py'}
MAPPED = {'README.md': 'upstream-docs/README.md',
          '.openai/hosting.json': 'upstream-docs/hosting.json'}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe_name(name):
    if '\\' in name or name.startswith('/'):
        raise ValueError(f'Unsafe archive path: {name}')
    parts = name.rstrip('/').split('/')
    if not parts or any(part in ('', '.', '..') for part in parts):
        raise ValueError(f'Unsafe archive path: {name}')
    return PurePosixPath(*parts)


def destination(name):
    if name in UPSTREAM_TOOLS:
        return name
    if name in MAPPED:
        return MAPPED[name]
    path = PurePosixPath(name)
    if (path.parts[0] == 'dist' and len(path.parts) > 1
            and not any(part.startswith('.') for part in path.parts)
            and path.parts[1] not in ('_site', 'about')):
        return name
    if len(path.parts) == 1 and (name in ROOT_DOCS or name.endswith('.mjs')):
        return name
    raise ValueError(f'Unexpected developer file; review ownership first: {name}')


def checked_path(repo, name):
    relative = safe_name(name)
    path = repo
    for part in relative.parts:
        path = path / part
        if path.is_symlink():
            raise ValueError(f'Refusing symbolic link in destination: {name}')
    return path


def read_drop(archive):
    files = {}
    with ZipFile(archive) as z:
        entries = z.infolist()
        if len(entries) > 10000 or sum(item.file_size for item in entries) > 500_000_000:
            raise ValueError('Archive exceeds source-import limits; keep large assets outside Git.')
        names = [safe_name(item.filename) for item in entries]
        # Exports may wrap the complete release in one directory.
        roots = {p.parts[0] for p in names}
        prefix = next(iter(roots)) if len(roots) == 1 and all(len(p.parts) > 1 or item.is_dir()
                   for p, item in zip(names, entries)) else None
        seen = set()
        for item, path in zip(entries, names):
            if stat.S_IFMT(item.external_attr >> 16) == stat.S_IFLNK:
                raise ValueError(f'Symbolic link in archive: {item.filename}')
            if item.is_dir():
                continue
            name = str(PurePosixPath(*path.parts[1:])) if prefix else str(path)
            if name in seen:
                raise ValueError(f'Duplicate archive path: {name}')
            seen.add(name)
            if name == 'history.bundle':
                continue
            target = destination(name)
            if target in files:
                raise ValueError(f'Duplicate destination: {target}')
            files[target] = z.read(item)
    if 'dist/index.html' not in files or 'dist/assets.json' not in files:
        raise ValueError('Release must contain dist/index.html and dist/assets.json.')
    assets = json.loads(files['dist/assets.json'])
    if not isinstance(assets, list) or not all(isinstance(name, str) for name in assets):
        raise ValueError('dist/assets.json must be an array of relative filenames.')
    for name in assets:
        safe_name(name)
        if 'dist/' + name not in files:
            raise ValueError(f'Listed asset is missing: {name}')
    return files


def plan_import(archive, repo):
    archive, repo = Path(archive).resolve(), Path(repo).resolve()
    manifest_path = checked_path(repo, MANIFEST)
    old = json.loads(manifest_path.read_text())
    if old.get('schema') != 1 or not isinstance(old.get('files'), dict):
        raise ValueError('Unsupported upstream ownership manifest.')
    previous = old['files']
    for name, expected in previous.items():
        # A corrupt manifest must not claim independent feature directories.
        if name not in MAPPED.values() and destination(name) != name:
            raise ValueError(f'Invalid ownership entry: {name}')
        path = checked_path(repo, name)
        if not path.is_file() or digest(path.read_bytes()) != expected:
            raise ValueError(f'Upstream file has local changes; commit/reconcile first: {name}')
    files = read_drop(archive)
    for name in files:
        path = checked_path(repo, name)
        if path.exists() and name not in previous:
            raise ValueError(f'Import would overwrite a file outside upstream ownership: {name}')
        for parent in path.parents:
            if parent == repo:
                break
            if parent.exists() and not parent.is_dir():
                raise ValueError(f'Destination parent is not a directory: {name}')
    added = sorted(set(files) - set(previous))
    removed = sorted(set(previous) - set(files))
    changed = sorted(name for name in set(files) & set(previous)
                     if digest(files[name]) != previous[name])
    manifest = {'schema': 1, 'archive': archive.name,
                'archive_sha256': digest(archive.read_bytes()),
                'files': {name: digest(data) for name, data in sorted(files.items())}}
    return {'archive': archive.name, 'archive_sha256': manifest['archive_sha256'],
            'added': added, 'changed': changed, 'removed': removed,
            'files': files, 'manifest': manifest, 'repo': repo}


def apply_plan(plan):
    repo = plan['repo']
    # Prepare every incoming byte before changing the checkout.
    with tempfile.TemporaryDirectory(prefix='odc-import-') as temporary:
        staged = Path(temporary)
        for name, data in plan['files'].items():
            path = staged / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        for name in plan['added'] + plan['changed']:
            target = checked_path(repo, name)
            target.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as output:
                output.write((staged / name).read_bytes())
                replacement = Path(output.name)
            replacement.chmod(0o644)
            replacement.replace(target)
        for name in plan['removed']:
            checked_path(repo, name).unlink()
        checked_path(repo, MANIFEST).write_text(json.dumps(plan['manifest'], indent=2) + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--apply', action='store_true', help='Apply the validated import; default is dry-run')
    args = parser.parse_args()
    try:
        plan = plan_import(args.archive, args.repo)
        if args.apply:
            apply_plan(plan)
    except (ValueError, OSError, KeyError, BadZipFile) as error:
        parser.exit(1, f'Import refused: {error}\n')
    summary = {key: plan[key] for key in ('archive', 'archive_sha256', 'added', 'changed', 'removed')}
    summary['applied'] = args.apply
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
