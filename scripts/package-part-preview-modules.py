#!/usr/bin/env python3
"""Package the two preview modules without changing their bytes or imports."""
import argparse
import hashlib
from html.parser import HTMLParser
from io import BytesIO
import json
from pathlib import Path
import re
import sys
from zipfile import BadZipFile, ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
MODULES = ('part-model', 'part-viewer')
MAP_ID = 'part-preview-importmap'
ALIAS = re.compile(r'part-(?:model|viewer)\.[0-9a-f]{64}\.js\Z')


class Page(HTMLParser):
    """Locate actual tags without mistaking comments or script text for markup."""
    def __init__(self, text):
        super().__init__(convert_charrefs=False)
        self.text = text
        self.lines = [0]
        for line in text.splitlines(keepends=True):
            self.lines.append(self.lines[-1] + len(line))
        self.heads, self.head_ends, self.scripts, self.module_loads = [], [], [], []
        self.active_script = None
        self.has_base = False
        self.feed(text)
        self.close()
        if self.active_script is not None:
            raise ValueError('index.html contains an unclosed script')

    def text_position(self):
        line, column = self.getpos()
        return self.lines[line - 1] + column

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        start = self.text_position()
        if tag == 'head':
            self.heads.append(start + len(self.get_starttag_text()))
        if tag == 'base' and 'href' in attrs:
            self.has_base = True
        if tag == 'script':
            self.active_script = {'start': start, 'attrs': attrs}
            if (attrs.get('type') or '').lower() == 'module':
                self.module_loads.append(start)
        if tag == 'link' and 'modulepreload' in (attrs.get('rel') or '').lower().split():
            self.module_loads.append(start)

    def handle_startendtag(self, tag, attributes):
        self.handle_starttag(tag, attributes)
        if tag == 'script':
            raise ValueError('index.html contains a self-closing script')

    def handle_endtag(self, tag):
        if tag == 'head':
            self.head_ends.append(self.text_position())
        if tag == 'script' and self.active_script is not None:
            end = self.text.find('>', self.text_position())
            if end < 0:
                raise ValueError('index.html contains an unclosed script tag')
            self.active_script['end'] = end + 1
            self.scripts.append(self.active_script)
            self.active_script = None


def packaged_html(original, aliases):
    page = Page(original)
    if len(page.heads) != 1 or len(page.head_ends) != 1 or page.has_base:
        raise ValueError('index.html must have one head and no base href; review import resolution')
    maps = [s for s in page.scripts if s['attrs'].get('id') == MAP_ID or
            (s['attrs'].get('type') or '').lower() == 'importmap']
    if len(maps) > 1 or any(s['attrs'].get('id') != MAP_ID for s in maps):
        raise ValueError('index.html has another import map; merge it deliberately before packaging')
    text = original
    if maps:
        start, end = maps[0]['start'], maps[0]['end']
        # Remove only the owned script and the line breaks emitted with it.
        if start and text[start - 1] == '\n':
            start -= 1
        if end < len(text) and text[end] == '\n':
            end += 1
        text = text[:start] + text[end:]
    page = Page(text)
    position = page.heads[0]
    if position > page.head_ends[0] or any(p < position for p in page.module_loads):
        raise ValueError('index.html loads modules before its head; cannot install an early import map')
    imports = {f'./{name}.js': f'./{aliases[name]}' for name in MODULES}
    block = ('\n<script type="importmap" id="' + MAP_ID + '">\n' +
             json.dumps({'imports': imports}, indent=2) + '\n</script>\n')
    return (text[:position] + block + text[position:]).encode('utf-8')


def packed_index(assets):
    """Use the same member, timestamp, permissions and JSON format as build-site."""
    payload = (json.dumps(assets, separators=(',', ':'), ensure_ascii=False) + '\n').encode()
    info = ZipInfo('assets.json', date_time=(2026, 11, 7, 0, 0, 0))
    info.compress_type = ZIP_DEFLATED
    info.external_attr = 0o644 << 16
    output = BytesIO()
    with ZipFile(output, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
        archive.writestr(info, payload)
    return output.getvalue()


def read_regular(path):
    if path.is_symlink() or not path.is_file():
        raise ValueError(f'{path.name} must be an existing regular file')
    return path.read_bytes()


def package(dist, check=False):
    sources = {name: read_regular(dist / f'{name}.js') for name in MODULES}
    aliases = {name: f'{name}.{hashlib.sha256(data).hexdigest()}.js'
               for name, data in sources.items()}
    html = read_regular(dist / 'index.html').decode('utf-8')
    index_bytes = read_regular(dist / 'assets.json.zip')
    with ZipFile(BytesIO(index_bytes)) as archive:
        if archive.namelist() != ['assets.json']:
            raise ValueError('assets.json.zip must contain only assets.json')
        assets = json.loads(archive.read('assets.json'))
    if not isinstance(assets, list) or any(not isinstance(p, str) for p in assets):
        raise ValueError('assets.json must be a list of paths')
    if len(assets) != len(set(assets)):
        raise ValueError('assets.json contains duplicate paths')
    retained = {p for p in assets if not ALIAS.fullmatch(p)}
    retained.update(f'{name}.js' for name in MODULES)
    retained.update(aliases.values())
    desired = {aliases[name]: sources[name] for name in MODULES}
    desired['index.html'] = packaged_html(html, aliases)
    desired['assets.json.zip'] = packed_index(sorted(retained))
    generated = [p for p in dist.iterdir() if ALIAS.fullmatch(p.name)]
    for path in generated:
        read_regular(path)
    stale = [p for p in generated if p.name not in aliases.values()]
    changed = [name for name, data in desired.items()
               if not (dist / name).exists() or read_regular(dist / name) != data]
    if check and (changed or stale):
        raise ValueError('preview delivery is stale: ' + ', '.join(changed + [p.name for p in stale]))
    if not check:
        for name in changed:
            (dist / name).write_bytes(desired[name])
        for path in stale:
            path.unlink()
    action = 'Verified' if check else 'Packaged'
    print(f'{action} 2 byte-identical preview aliases, early import map and packed asset index.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist', type=Path, default=ROOT / 'dist', help='distribution directory')
    parser.add_argument('--check', action='store_true', help='verify without writing any files')
    args = parser.parse_args()
    try:
        package(args.dist.resolve(), args.check)
    except (OSError, ValueError, BadZipFile) as error:
        print(f'Preview packaging failed: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
