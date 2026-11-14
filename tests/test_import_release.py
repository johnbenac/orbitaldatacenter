"""Exercise imports across releases and refusal before checkout mutation."""
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import warnings
from zipfile import ZipFile, ZipInfo

SPEC = importlib.util.spec_from_file_location(
    'import_release', Path(__file__).resolve().parents[1] / 'scripts/import-release.py')
IMPORTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORTER)


class ImportTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.base = Path(self.temporary.name)
        self.repo = self.base / 'repo'
        self.repo.mkdir()
        self.old = {'dist/index.html': b'<html>old</html>',
                    'dist/assets.json': b'["index.html", "old.js"]',
                    'dist/old.js': b'export const old = true;'}
        for name, content in self.old.items():
            p = self.repo / name
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(content)
        (self.repo / 'extensions').mkdir()
        (self.repo / 'extensions/author.html').write_text('John Benac')
        (self.repo / 'README.md').write_text('Our hosting instructions')
        self.manifest = {'schema': 1,
                         'files': {name: IMPORTER.digest(data) for name, data in self.old.items()}}
        (self.repo / 'upstream-files.json').write_text(json.dumps(self.manifest))

    def archive(self, extra=None):
        p = self.base / 'v22.zip'
        files = {'dist/index.html': b'<html>new</html>',
                 'dist/assets.json': b'["index.html", "new.js"]',
                 'dist/new.js': b'export const fresh = true;',
                 'README.md': b'Developer documentation'}
        files.update(extra or {})
        with ZipFile(p, 'w') as z:
            for name, data in files.items():
                z.writestr('orbital-v22/' + name, data)
        return p

    def snapshot(self):
        return {str(p.relative_to(self.repo)): p.read_bytes()
                for p in self.repo.rglob('*') if p.is_file()}

    def test_dry_run_and_two_release_preservation(self):
        archive = self.archive()
        before = self.snapshot()
        plan = IMPORTER.plan_import(archive, self.repo)
        self.assertEqual(before, self.snapshot())
        self.assertEqual(['dist/old.js'], plan['removed'])
        IMPORTER.apply_plan(plan)
        self.assertFalse((self.repo / 'dist/old.js').exists())
        self.assertEqual('Our hosting instructions', (self.repo / 'README.md').read_text())
        self.assertEqual('John Benac', (self.repo / 'extensions/author.html').read_text())
        self.assertEqual('Developer documentation',
                         (self.repo / 'upstream-docs/README.md').read_text())
        again = IMPORTER.plan_import(archive, self.repo)
        self.assertEqual([], again['added'] + again['changed'] + again['removed'])
        IMPORTER.apply_plan(again)
        self.assertEqual(IMPORTER.digest(archive.read_bytes()),
                         json.loads((self.repo / 'upstream-files.json').read_text())['archive_sha256'])

    def test_unsafe_paths_refused_without_mutation(self):
        for name in ['../escape.txt', '/absolute.txt', 'dist/../../escape.txt', 'dist\\escape.txt']:
            with self.subTest(name=name):
                archive = self.archive({name: b'bad'})
                before = self.snapshot()
                with self.assertRaises(ValueError):
                    IMPORTER.plan_import(archive, self.repo)
                self.assertEqual(before, self.snapshot())

    def test_duplicate_archive_path(self):
        archive = self.archive()
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', UserWarning)
            with ZipFile(archive, 'a') as z:
                z.writestr('orbital-v22/dist/index.html', b'duplicate')
        with self.assertRaisesRegex(ValueError, 'Duplicate archive path'):
            IMPORTER.plan_import(archive, self.repo)

    def test_unknown_owned_feature_directory_refused(self):
        archive = self.archive({'extensions/author.html': b'overwrite'})
        before = self.snapshot()
        with self.assertRaisesRegex(ValueError, 'Unexpected developer file'):
            IMPORTER.plan_import(archive, self.repo)
        self.assertEqual(before, self.snapshot())

    def test_reviewed_identity_tool_is_owned_without_allowing_other_tools(self):
        archive = self.archive({'tools/build-identity.py': b'# upstream artwork generator'})
        IMPORTER.apply_plan(IMPORTER.plan_import(archive, self.repo))
        self.assertEqual('# upstream artwork generator',
                         (self.repo / 'tools/build-identity.py').read_text())
        with self.assertRaisesRegex(ValueError, 'Unexpected developer file'):
            IMPORTER.plan_import(self.archive({'tools/unreviewed.py': b'unknown'}), self.repo)

    def test_size_limit_excludes_skipped_history_but_limits_source(self):
        archive = self.archive({'history.bundle': b'ignored history'})
        for oversized in ['history.bundle', 'dist/new.js']:
            with self.subTest(oversized=oversized):
                def open_archive(path):
                    z = ZipFile(path)
                    for info in z.infolist():
                        if info.filename.endswith('/' + oversized):
                            info.file_size = 600_000_000
                    return z
                with patch.object(IMPORTER, 'ZipFile', open_archive):
                    if oversized == 'history.bundle':
                        plan = IMPORTER.plan_import(archive, self.repo)
                        self.assertNotIn('history.bundle', plan['files'])
                    else:
                        with self.assertRaisesRegex(ValueError, 'source-import limits'):
                            IMPORTER.plan_import(archive, self.repo)

    def test_existing_unowned_file_collision(self):
        (self.repo / 'dist/new.js').write_text('a local addition')
        with self.assertRaisesRegex(ValueError, 'outside upstream ownership'):
            IMPORTER.plan_import(self.archive(), self.repo)

    def test_locally_modified_upstream_refused(self):
        (self.repo / 'dist/old.js').write_text('local customization')
        with self.assertRaisesRegex(ValueError, 'local changes'):
            IMPORTER.plan_import(self.archive(), self.repo)

    def test_archive_symlink_refused(self):
        archive = self.archive()
        info = ZipInfo('orbital-v22/dist/link.js')
        info.create_system = 3
        info.external_attr = 0o120777 << 16
        with ZipFile(archive, 'a') as z:
            z.writestr(info, '/etc/passwd')
        with self.assertRaisesRegex(ValueError, 'Symbolic link in archive'):
            IMPORTER.plan_import(archive, self.repo)

    def test_local_symlink_refused(self):
        (self.repo / 'dist/old.js').unlink()
        (self.repo / 'dist/old.js').symlink_to(self.base / 'elsewhere')
        with self.assertRaisesRegex(ValueError, 'symbolic link'):
            IMPORTER.plan_import(self.archive(), self.repo)

    def test_asset_manifest_missing_file_refused(self):
        archive = self.archive({'dist/assets.json': b'["missing.js"]'})
        with self.assertRaisesRegex(ValueError, 'Listed asset is missing'):
            IMPORTER.plan_import(archive, self.repo)

    def test_developer_repository_metadata_stays_inert(self):
        archive = self.archive({'AGENTS.md': b'developer guide', '.gitignore': b'*',
                                '.gitattributes': b'* text=auto',
                                '.github/workflows/ci.yml': b'name: ci'})
        with self.assertRaisesRegex(ValueError, 'Unexpected developer file'):
            IMPORTER.plan_import(archive, self.repo)
        archive = self.archive({'AGENTS.md': b'developer guide', '.gitignore': b'*',
                                '.gitattributes': b'* text=auto',
                                '.github/workflows/engineering-readiness.yml': b'name: ci'})
        IMPORTER.apply_plan(IMPORTER.plan_import(archive, self.repo))
        self.assertFalse((self.repo / 'AGENTS.md').exists())
        self.assertFalse((self.repo / '.gitignore').exists())
        self.assertFalse((self.repo / '.github').exists())
        docs = self.repo / 'upstream-docs'
        self.assertEqual('developer guide', (docs / 'AGENTS.md').read_text())
        self.assertEqual('*', (docs / 'dot-gitignore').read_text())
        self.assertTrue((docs / 'dot-gitattributes').is_file())
        self.assertTrue((docs / 'github-workflows/engineering-readiness.yml').is_file())

    def test_docs_mapped_and_working_evidence_skipped(self):
        evidence = {'docs/harnessing-work/H01-receipt.md': b'work evidence',
                    '__export_metadata__/manifest.json': b'{}'}
        archive = self.archive({'docs/guide.md': b'guide', 'docs/thermal/chart.jpg': b'jpg',
                                **evidence})
        plan = IMPORTER.plan_import(archive, self.repo)
        self.assertEqual({'files': 2, 'bytes': sum(map(len, evidence.values()))}, plan['skipped'])
        self.assertIn('upstream-docs/docs/guide.md', plan['files'])
        self.assertIn('upstream-docs/docs/thermal/chart.jpg', plan['files'])
        self.assertFalse([n for n in plan['files'] if 'harnessing' in n or 'export' in n])
        IMPORTER.apply_plan(plan)
        self.assertFalse((self.repo / 'docs').exists())
        again = IMPORTER.plan_import(archive, self.repo)  # manifest entries stay recognised
        self.assertEqual([], again['added'] + again['changed'] + again['removed'])
        (self.repo / 'upstream-docs/docs/guide.md').write_text('local edit')
        with self.assertRaisesRegex(ValueError, 'local changes'):
            IMPORTER.plan_import(archive, self.repo)

    def test_skipped_evidence_does_not_count_toward_size_limit(self):
        archive = self.archive({'docs/harnessing-work/huge.json': b'x'})

        def open_archive(path):
            z = ZipFile(path)
            for info in z.infolist():
                if info.filename.endswith('huge.json'):
                    info.file_size = 900_000_000
            return z
        with patch.object(IMPORTER, 'ZipFile', open_archive):
            plan = IMPORTER.plan_import(archive, self.repo)
        self.assertEqual(900_000_000, plan['skipped']['bytes'])

    def test_unrecognised_docs_dotfiles_still_refused(self):
        with self.assertRaisesRegex(ValueError, 'Unexpected developer file'):
            IMPORTER.plan_import(self.archive({'docs/.hidden/secret.md': b'x'}), self.repo)

    def packed_index(self, names, member='assets.json', extra=None):
        buffer = io.BytesIO()
        with ZipFile(buffer, 'w') as z:
            z.writestr(member, json.dumps(names))
            for name, data in (extra or {}).items():
                z.writestr(name, data)
        return buffer.getvalue()

    def packed_archive(self, index, keep_plain=False):
        archive = self.archive({'dist/assets.json.zip': index})
        if keep_plain:
            return archive
        with ZipFile(archive) as source:
            items = [(i, source.read(i)) for i in source.infolist()
                     if not i.filename.endswith('dist/assets.json')]
        packed = self.base / 'v22-packed.zip'
        with ZipFile(packed, 'w') as z:
            for info, data in items:
                z.writestr(info.filename, data)
        return packed

    def test_packed_asset_index_accepted(self):
        archive = self.packed_archive(self.packed_index(['index.html', 'new.js']))
        plan = IMPORTER.plan_import(archive, self.repo)
        self.assertIn('dist/assets.json.zip', plan['files'])
        self.assertNotIn('dist/assets.json', plan['files'])
        IMPORTER.apply_plan(plan)
        self.assertFalse((self.repo / 'dist/assets.json').exists())
        again = IMPORTER.plan_import(archive, self.repo)
        self.assertEqual([], again['added'] + again['changed'] + again['removed'])

    def test_packed_asset_index_refusals(self):
        cases = {'wrong member name': self.packed_index(['index.html', 'new.js'], 'other.json'),
                 'extra member': self.packed_index(['index.html', 'new.js'], extra={'x.txt': 'x'}),
                 'missing listed asset': self.packed_index(['index.html', 'gone.js']),
                 'not a zip': b'not a zip file'}
        for label, index in cases.items():
            with self.subTest(label):
                before = self.snapshot()
                with self.assertRaises(ValueError):
                    IMPORTER.plan_import(self.packed_archive(index), self.repo)
                self.assertEqual(before, self.snapshot())

    def test_plain_and_packed_index_together_or_neither_refused(self):
        both = self.packed_archive(self.packed_index(['index.html', 'new.js']), keep_plain=True)
        with self.assertRaisesRegex(ValueError, 'not both'):
            IMPORTER.plan_import(both, self.repo)

    def test_production_extension_paths_reserved(self):
        for name in ['dist/_site/site.css', 'dist/about/index.html']:
            with self.subTest(name=name):
                with self.assertRaisesRegex(ValueError, 'Unexpected developer file'):
                    IMPORTER.plan_import(self.archive({name: b'collision'}), self.repo)


if __name__ == '__main__':
    unittest.main()
