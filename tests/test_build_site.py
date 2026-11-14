import hashlib
import io
import importlib.util
import json
from pathlib import Path
import shutil
import struct
import tempfile
import unittest
from html.parser import HTMLParser
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build_site', ROOT / 'scripts/build-site.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def read_index(root):
    """Static-asset list from plain assets.json or the packed assets.json.zip."""
    packed = Path(root) / 'assets.json.zip'
    if packed.is_file():
        with ZipFile(packed) as archive:
            assert archive.namelist() == ['assets.json']
            return json.loads(archive.read('assets.json'))
    return json.loads((Path(root) / 'assets.json').read_text())


class Head(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.tags = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


class AssemblyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.release = self.root / 'release'
        shutil.copytree(ROOT / 'dist', self.release / 'dist')
        self.output = self.root / 'public'

    def build(self, **kwargs):
        return builder.build(self.release, self.output, **kwargs)

    def test_metadata_authorship_and_export_assets(self):
        self.build(github_published=True)
        for path, canonical in [('index.html', builder.ORIGIN + '/'),
                                ('about/index.html', builder.ORIGIN + '/about/')]:
            text = (self.output / path).read_text()
            tags = Head(text).tags
            links = [a for tag, a in tags if tag == 'link' and a.get('rel') == 'canonical']
            self.assertEqual([a['href'] for a in links], [canonical])
            for attr, key in [('name', 'description'), ('property', 'og:title'),
                              ('property', 'og:url'), ('property', 'og:image'),
                              ('property', 'og:image:alt'), ('name', 'twitter:card')]:
                values = [a for tag, a in tags if tag == 'meta' and a.get(attr) == key]
                self.assertEqual(len(values), 1, key)
            self.assertIn(builder.LINKEDIN, text)
            self.assertIn(builder.GITHUB, text)
            self.assertIn('application/ld+json', text)
        self.assertIn(builder.ORIGIN + '/sitemap.xml', (self.output / 'robots.txt').read_text())
        self.assertIn(builder.ORIGIN + '/about/', (self.output / 'sitemap.xml').read_text())
        assets = read_index(self.output)
        self.assertIn('_site/social-card.png', assets)
        self.assertIn('about/index.html', assets)
        self.assertTrue(all((self.output / name).is_file() for name in assets))
        data = (self.output / '_site/social-card.png').read_bytes()
        self.assertEqual(data[:8], b'\x89PNG\r\n\x1a\n')
        self.assertEqual(struct.unpack('>II', data[16:24]), (1200, 630))

    def test_packed_asset_index_is_extended_in_place_and_repeatable(self):
        dist = self.release / 'dist'
        listed = read_index(dist)
        if (dist / 'assets.json.zip').exists():
            (dist / 'assets.json.zip').unlink()
        (dist / 'assets.json').unlink(missing_ok=True)
        with ZipFile(dist / 'assets.json.zip', 'w') as archive:
            archive.writestr('assets.json', json.dumps(listed))
        self.build()
        self.assertFalse((self.output / 'assets.json').exists())
        assets = read_index(self.output)
        self.assertEqual(set(listed) | {'about/index.html', '_site/site.css', '_site/social-card.png',
                                        'robots.txt', 'sitemap.xml', '404.html'}, set(assets))
        self.assertTrue(all((self.output / name).is_file() for name in assets))
        first = (self.output / 'assets.json.zip').read_bytes()
        self.build()
        self.assertEqual(first, (self.output / 'assets.json.zip').read_bytes())

    def test_source_is_untouched_and_assembly_is_repeatable(self):
        def hashes(root):
            return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
                    for p in root.rglob('*') if p.is_file()}
        original = hashes(self.release)
        self.build()
        first = hashes(self.output)
        self.build()
        self.assertEqual(first, hashes(self.output))
        self.assertEqual(original, hashes(self.release))
        self.assertEqual((self.output / 'app.js').read_bytes(),
                         (self.release / 'dist/app.js').read_bytes())

    def test_changed_integration_point_preserves_previous_build(self):
        self.build()
        previous = (self.output / 'index.html').read_bytes()
        source = self.release / 'dist/index.html'
        source.write_text(source.read_text().replace('class="pagefoot"', 'class="changed-footer"'))
        with self.assertRaisesRegex(ValueError, 'integration changed'):
            self.build()
        self.assertEqual(previous, (self.output / 'index.html').read_bytes())

    def test_unpublished_repository_is_not_a_dead_link(self):
        self.build(github_published=False)
        for path in ['index.html', 'about/index.html']:
            self.assertNotIn('href="' + builder.GITHUB + '"', (self.output / path).read_text())
        self.assertIn('being prepared', (self.output / 'about/index.html').read_text())


if __name__ == '__main__':
    unittest.main()
