"""Cover the CI gate scripts: the regression ratchet and the static release checks."""
import importlib.util
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), ROOT / 'scripts' / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


RATCHET = load('ratchet')
RELEASE = load('check-release')


class RatchetTests(unittest.TestCase):
    def test_compare_blocks_only_pass_to_not_pass(self):
        baseline = {'a': 'pass', 'b': 'pass', 'c': 'fail', 'd': 'fail'}
        results = {'a': 'pass', 'b': 'fail', 'c': 'fail', 'd': 'pass', 'e': 'fail'}
        regressions, improvements, new = RATCHET.compare(baseline, results)
        self.assertEqual(['b'], regressions)
        self.assertEqual(['d'], improvements)
        self.assertEqual(['e'], new)

    def test_timeout_counts_as_a_regression(self):
        self.assertEqual(['a'], RATCHET.compare({'a': 'pass'}, {'a': 'timeout'})[0])

    def run_main(self, suites, baseline, *extra):
        temp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, temp)
        path = temp / 'baseline.json'
        path.write_text(json.dumps({'schema': 1, 'suites': baseline}))
        argv = ['ratchet.py', '--lane', 'fast', '--repo', str(temp), '--baseline', str(path), *extra]
        with patch.object(RATCHET, 'SUITES', suites), patch.object(sys, 'argv', argv):
            code = RATCHET.main()
        return code, json.loads(path.read_text())

    @staticmethod
    def suite(exit_code):
        return dict(lane='fast', cmd=[sys.executable, '-c', f'raise SystemExit({exit_code})'], timeout=60)

    def test_exit_codes_follow_the_baseline(self):
        suites = {'ok': self.suite(0), 'bad': self.suite(1)}
        self.assertEqual(0, self.run_main(suites, {'ok': 'pass', 'bad': 'fail'})[0])
        self.assertEqual(1, self.run_main(suites, {'ok': 'pass', 'bad': 'pass'})[0])
        self.assertEqual(0, self.run_main(suites, {})[0])  # suites not in the baseline never block

    def test_update_records_results_and_never_fails(self):
        suites = {'ok': self.suite(0), 'bad': self.suite(1)}
        code, written = self.run_main(suites, {'ok': 'pass', 'bad': 'pass'}, '--update')
        self.assertEqual(0, code)
        self.assertEqual({'ok': 'pass', 'bad': 'fail'}, written['suites'])

    def test_repository_baseline_covers_every_fast_suite(self):
        baseline = json.loads((ROOT / 'baseline.json').read_text())['suites']
        fast = [n for n, s in RATCHET.SUITES.items() if s['lane'] == 'fast']
        self.assertEqual([], [n for n in fast if n not in baseline])


class ReleaseCheckTests(unittest.TestCase):
    def setUp(self):
        self.temp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.temp)
        self.dist = self.temp / 'dist'
        self.dist.mkdir()
        (self.temp / 'package.json').write_text('{"type": "module"}')  # as in the repository root
        (self.dist / 'index.html').write_text('<html></html>')
        (self.dist / 'app.js').write_text('export const ok = 1;\n')
        self.index(['index.html', 'app.js'])

    def index(self, names, packed=True):
        for old in ('assets.json', 'assets.json.zip'):
            (self.dist / old).unlink(missing_ok=True)
        if packed:
            with ZipFile(self.dist / 'assets.json.zip', 'w') as z:
                z.writestr('assets.json', json.dumps(names))
        else:
            (self.dist / 'assets.json').write_text(json.dumps(names))

    def test_valid_packed_and_plain_indexes_pass(self):
        self.assertEqual([], RELEASE.check(self.dist, syntax=False))
        self.index(['index.html', 'app.js'], packed=False)
        self.assertEqual([], RELEASE.check(self.dist, syntax=False))

    def test_missing_listed_asset_and_unsafe_paths_fail(self):
        self.index(['index.html', 'gone.js', '../escape.js', '/abs.js'])
        problems = ' '.join(RELEASE.check(self.dist, syntax=False))
        self.assertIn('gone.js', problems)
        self.assertIn('../escape.js', problems)
        self.assertIn('/abs.js', problems)

    def test_both_or_neither_index_fails(self):
        (self.dist / 'assets.json').write_text('[]')
        self.assertTrue(RELEASE.check(self.dist, syntax=False))
        (self.dist / 'assets.json').unlink()
        (self.dist / 'assets.json.zip').unlink()
        self.assertTrue(RELEASE.check(self.dist, syntax=False))

    def test_wrong_member_name_in_packed_index_fails(self):
        with ZipFile(self.dist / 'assets.json.zip', 'w') as z:
            z.writestr('other.json', '[]')
        self.assertTrue(RELEASE.check(self.dist, syntax=False))

    def test_oversize_file_and_symlink_fail(self):
        with patch.object(RELEASE, 'PAGES_FILE_LIMIT', 5):
            self.assertTrue(any('25 MiB' in p for p in RELEASE.check(self.dist, syntax=False)))
        (self.dist / 'link.js').symlink_to(self.dist / 'app.js')
        self.assertTrue(any('symbolic link' in p for p in RELEASE.check(self.dist, syntax=False)))

    @unittest.skipUnless(shutil.which('node'), 'node is required for the syntax pass')
    def test_javascript_syntax_error_fails(self):
        self.assertEqual([], RELEASE.check(self.dist))
        (self.dist / 'app.js').write_text('export const = ;\n')
        self.assertTrue(any('app.js' in p for p in RELEASE.check(self.dist)))


if __name__ == '__main__':
    unittest.main()
