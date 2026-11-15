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
GUARD = load('pages-guard')


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

    def test_suite_environment_is_passed_to_the_command(self):
        spec = dict(lane='fast', timeout=60, env={'ODC_PROBE': 'seen'},
                    cmd=[sys.executable, '-c', 'import os,sys; sys.exit(0 if os.environ.get("ODC_PROBE")=="seen" else 1)'])
        with patch.object(RATCHET, 'SUITES', {'probe': spec}):
            self.assertEqual('pass', RATCHET.run_suite('probe', ROOT)[1]['status'])

    def test_fast_lane_runs_one_deployment_preset_and_the_full_sweep_is_extended(self):
        self.assertEqual('pathfinder', RATCHET.SUITES['deployment']['env']['ODC_AUDIT_ONLY'])
        self.assertEqual('extended', RATCHET.SUITES['deployment-full']['lane'])
        self.assertNotIn('ODC_AUDIT_ONLY', RATCHET.SUITES['deployment-full'].get('env', {}))

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


class PagesGuardTests(unittest.TestCase):
    INDEX = b'<html><link rel="canonical" href="https://example.test/"></html>'
    SHA = __import__('hashlib').sha256(INDEX).hexdigest()

    def problems(self, pages):
        def fetch(url):
            return pages.get(url, (404, b''))
        ok = (200, b'')
        base = {'https://example.test/about/': ok, 'https://example.test/assets.json.zip': ok,
                'https://example.test/robots.txt': ok}
        base.update(pages)
        with patch.object(GUARD, 'fetch', lambda url: base.get(url, (404, b''))):
            return GUARD.site_problems('https://example.test', self.SHA, 'https://x.pages.dev')

    def test_edge_injected_script_on_the_custom_domain_is_accepted(self):
        injected = self.INDEX.replace(b'</html>', b'<script src="https://cf.example/beacon.js"></script></html>')
        self.assertEqual([], self.problems({'https://x.pages.dev/': (200, self.INDEX),
                                            'https://example.test/': (200, injected)}))

    def test_stale_deployment_is_detected_on_the_untouched_address(self):
        result = self.problems({'https://x.pages.dev/': (200, b'old build'),
                                'https://example.test/': (200, self.INDEX)})
        self.assertTrue(any('not the freshly built' in p for p in result))

    def test_missing_pages_and_canonical_are_detected(self):
        result = self.problems({'https://x.pages.dev/': (200, self.INDEX),
                                'https://example.test/': (200, b'<html></html>'),
                                'https://example.test/about/': (500, b'')})
        self.assertTrue(any('canonical' in p for p in result))
        self.assertTrue(any('/about/' in p for p in result))


if __name__ == '__main__':
    unittest.main()
