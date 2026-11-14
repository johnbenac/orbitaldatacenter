#!/usr/bin/env python3
"""Review or apply a developer ZIP without overwriting site-owned features."""
import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import stat
import tempfile
from zipfile import BadZipFile, ZipFile

MANIFEST = 'upstream-files.json'
ROOT_DOCS = {'DESIGN.md', 'ENGINE.md', 'SCENE.md', 'requirements.txt', 'package.json',
             'package-lock.json'}
# Large upstream working evidence and export bookkeeping are provenance, not source: like the
# bundled Git history, they are skipped (and reported) rather than committed.
SKIPPED_PREFIXES = ('docs/harnessing-work/', '__export_metadata__/')
UPSTREAM_TOOLS = {'tools/build-identity.py', 'earth-gpu-checks.py',
                  'scripts/generate-launch-surfaces.py', 'scripts/prepare-earth-assets.py',
                  'scripts/prepare-earth-cloud-details.py', 'scripts/prepare-earth-day-detail.py',
                  'scripts/prepare-earth-detail-night.py', 'tools/build-launch-geography.py',
                  'scripts/generate-spacecraft-materials.py',
                  'scripts/launch-elevation-integrity.json',
                  'scripts/package-launch-elevation.py', 'scripts/package-material-library.mjs',
                  'build-asset-index.py',
                  'scripts/capture-redwire-harness-takeoff.mjs',
                  'scripts/check-engineering-readiness.mjs', 'scripts/check-lossless-jpeg.py',
                  'scripts/check-parts-knowledge-package.mjs', 'scripts/check-routing.mjs',
                  'scripts/engineering-readiness-audit.mjs', 'scripts/flight-routing-receipts.mjs',
                  'scripts/generate-thermal-allocation-basis.mjs',
                  'scripts/lossless-jpeg-optimize.c', 'scripts/package-parts-knowledge.mjs',
                  'scripts/plot-redwire-pdr-routes.py', 'scripts/render-redwire-installation.mjs',
                  'scripts/routing-source-fingerprint.mjs',
                  'src/parts-knowledge/part-knowledge-flight.js',
                  'src/parts-knowledge/part-knowledge-ground.js',
                  'src/parts-knowledge/part-knowledge-launch.js',
                  'src/parts-knowledge/part-knowledge-materials.js'}
MAPPED = {'README.md': 'upstream-docs/README.md',
          '.openai/hosting.json': 'upstream-docs/hosting.json',
          'VALIDATION-v21.0.md': 'upstream-docs/VALIDATION-v21.0.md',
          'VALIDATION-v32.md': 'upstream-docs/VALIDATION-v32.md',
          'validation-power-interface-1793995613763.jpg':
              'upstream-docs/validation-power-interface-1793995613763.jpg',
          'validation-ui-work.jpg': 'upstream-docs/validation-ui-work.jpg',
          'validation-facility-labels.jpg': 'upstream-docs/validation-facility-labels.jpg',
          'validation-processing-workbench.jpg': 'upstream-docs/validation-processing-workbench.jpg',
          # Developer repository metadata stays inert: dotfiles and workflows must not take
          # effect in this repository, and the developer's AGENTS.md must not replace ours.
          'AGENTS.md': 'upstream-docs/AGENTS.md',
          '.gitignore': 'upstream-docs/dot-gitignore',
          '.gitattributes': 'upstream-docs/dot-gitattributes',
          '.github/workflows/engineering-readiness.yml':
              'upstream-docs/github-workflows/engineering-readiness.yml',
          'RENDERING-REPAIR-QA.md': 'upstream-docs/RENDERING-REPAIR-QA.md'}
MAPPED.update({name: 'upstream-docs/' + name for name in (
    'artifacts/spacecraft-texture-bank.zip',
    'docs/adaptive-hardware-detail-2026-11-07.md',
    'docs/orbital-camera-modes-20261107.jpg',
    'docs/orbital-capture-options-20261107.jpg',
    'docs/orbital-capture-preview-20261107.jpg',
    'docs/orbital-graphics-gallery-20261107.jpg',
    'docs/orbital-graphics-startup-20261107.jpg',
    'docs/orbital-hardware-high-20261107.jpg',
    'docs/orbital-hardware-low-20261107.jpg',
    'docs/orbital-hardware-pump-final-20261107.jpg',
    'docs/orbital-part-actions-20261107.jpg',
    'docs/orbital-parts-navigator-20261107.jpg',
    'docs/orbital-reference-branding-20261107.jpg',
    'docs/orbital-view-cleared-20261107.jpg',
    'docs/parts-navigator-2026-11-07.md',
    'docs/reference-graphics-2026-11-07.md',
    'docs/architecture-differentiation-r2.md', 'docs/architecture-r2-ai1-review.jpg',
    'docs/focus-auto-review.jpg', 'docs/material-evidence-notes.md',
    'docs/material-library-review.jpg', 'docs/orbital-camera-default-20261107.jpg',
    'docs/spacecraft-materials-r1.md', 'docs/unified-orbital-leaders-20261107.jpg')})


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe_name(name):
    if '\\' in name or name.startswith('/'):
        raise ValueError(f'Unsafe archive path: {name}')
    parts = name.rstrip('/').split('/')
    if not parts or any(part in ('', '.', '..') for part in parts):
        raise ValueError(f'Unsafe archive path: {name}')
    return PurePosixPath(*parts)


def skipped(name):
    return name == 'history.bundle' or name.startswith(SKIPPED_PREFIXES)


def destination(name):
    if name in UPSTREAM_TOOLS:
        return name
    if name in MAPPED:
        return MAPPED[name]
    path = PurePosixPath(name)
    if (path.parts[0] == 'docs' and len(path.parts) > 1
            and not any(part.startswith('.') for part in path.parts)):
        return 'upstream-docs/' + name
    if (path.parts[0] == 'dist' and len(path.parts) > 1
            and not any(part.startswith('.') for part in path.parts)
            and path.parts[1] not in ('_site', 'about')):
        return name
    if len(path.parts) == 1 and (name in ROOT_DOCS or name.endswith('.mjs')):
        return name
    raise ValueError(f'Unexpected developer file; review ownership first: {name}')


def owned(name):
    """True when an ownership-manifest entry is a path this importer can produce."""
    if name in MAPPED.values() or name.startswith('upstream-docs/docs/'):
        return True
    try:
        return destination(name) == name
    except ValueError:
        return False


def checked_path(repo, name):
    relative = safe_name(name)
    path = repo
    for part in relative.parts:
        path = path / part
        if path.is_symlink():
            raise ValueError(f'Refusing symbolic link in destination: {name}')
    return path


def asset_index(files):
    """Return the static-asset list from dist/assets.json or its one-file ZIP package."""
    plain, packed = files.get('dist/assets.json'), files.get('dist/assets.json.zip')
    if (plain is None) == (packed is None):
        raise ValueError('Release must contain dist/assets.json or dist/assets.json.zip, not both.')
    if packed is not None:
        try:
            with ZipFile(io.BytesIO(packed)) as z:
                members = [item for item in z.infolist() if not item.is_dir()]
                if len(members) != 1 or members[0].filename != 'assets.json':
                    raise ValueError('dist/assets.json.zip must contain only assets.json.')
                if members[0].file_size > 50_000_000:
                    raise ValueError('dist/assets.json.zip index is too large.')
                plain = z.read(members[0])  # verifies the CRC-32
        except BadZipFile as error:
            raise ValueError(f'dist/assets.json.zip is not a valid ZIP: {error}') from error
    return json.loads(plain)


def read_drop(archive):
    files = {}
    with ZipFile(archive) as z:
        entries = z.infolist()
        if len(entries) > 10000:
            raise ValueError('Archive exceeds source-import limits; keep large assets outside Git.')
        names = [safe_name(item.filename) for item in entries]
        # Exports may wrap the complete release in one directory.
        roots = {p.parts[0] for p in names}
        prefix = next(iter(roots)) if len(roots) == 1 and all(len(p.parts) > 1 or item.is_dir()
                   for p, item in zip(names, entries)) else None
        seen = set()
        source_bytes = 0
        omitted = {'files': 0, 'bytes': 0}
        for item, path in zip(entries, names):
            if stat.S_IFMT(item.external_attr >> 16) == stat.S_IFLNK:
                raise ValueError(f'Symbolic link in archive: {item.filename}')
            if item.is_dir():
                continue
            name = str(PurePosixPath(*path.parts[1:])) if prefix else str(path)
            if name in seen:
                raise ValueError(f'Duplicate archive path: {name}')
            seen.add(name)
            if skipped(name):
                omitted['files'] += 1
                omitted['bytes'] += item.file_size
                continue
            source_bytes += item.file_size
            if source_bytes > 500_000_000:
                raise ValueError('Archive exceeds source-import limits; keep large assets outside Git.')
            target = destination(name)
            if target in files:
                raise ValueError(f'Duplicate destination: {target}')
            files[target] = z.read(item)
    if 'dist/index.html' not in files:
        raise ValueError('Release must contain dist/index.html.')
    assets = asset_index(files)
    if not isinstance(assets, list) or not all(isinstance(name, str) for name in assets):
        raise ValueError('The asset index must be an array of relative filenames.')
    for name in assets:
        safe_name(name)
        if 'dist/' + name not in files:
            raise ValueError(f'Listed asset is missing: {name}')
    return files, omitted


def plan_import(archive, repo):
    archive, repo = Path(archive).resolve(), Path(repo).resolve()
    manifest_path = checked_path(repo, MANIFEST)
    old = json.loads(manifest_path.read_text())
    if old.get('schema') != 1 or not isinstance(old.get('files'), dict):
        raise ValueError('Unsupported upstream ownership manifest.')
    previous = old['files']
    for name, expected in previous.items():
        # A corrupt manifest must not claim independent feature directories.
        if not owned(name):
            raise ValueError(f'Invalid ownership entry: {name}')
        path = checked_path(repo, name)
        if not path.is_file() or digest(path.read_bytes()) != expected:
            raise ValueError(f'Upstream file has local changes; commit/reconcile first: {name}')
    files, omitted = read_drop(archive)
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
    with archive.open('rb') as stream:
        archive_sha256 = hashlib.file_digest(stream, 'sha256').hexdigest()
    manifest = {'schema': 1, 'archive': archive.name,
                'archive_sha256': archive_sha256,
                'files': {name: digest(data) for name, data in sorted(files.items())}}
    return {'archive': archive.name, 'archive_sha256': manifest['archive_sha256'],
            'added': added, 'changed': changed, 'removed': removed,
            'skipped': omitted, 'files': files, 'manifest': manifest, 'repo': repo}


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
    summary = {key: plan[key] for key in ('archive', 'archive_sha256', 'added', 'changed', 'removed',
                                          'skipped')}
    summary['applied'] = args.apply
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
