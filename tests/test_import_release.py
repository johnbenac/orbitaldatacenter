"""Exercise imports across releases and refusal before checkout mutation."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
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

    def test_production_extension_paths_reserved(self):
        for name in ['dist/_site/site.css', 'dist/about/index.html']:
            with self.subTest(name=name):
                with self.assertRaisesRegex(ValueError, 'Unexpected developer file'):
                    IMPORTER.plan_import(self.archive({name: b'collision'}), self.repo)


if __name__ == '__main__':
    unittest.main()
