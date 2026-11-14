#!/usr/bin/env python3
"""Regression ratchet for the developer check suites.

Runs the suites in a lane and compares each result with baseline.json. A run fails only when a
suite that passed in the baseline no longer passes. Suites that were already failing, or that are
not in the baseline yet, are reported and do not block. Run with --update to record the current
results as the new baseline.

    python3 scripts/ratchet.py --lane fast
    python3 scripts/ratchet.py --lane extended --update
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
SUITES = {
    'design': dict(lane='fast', cmd=['node', 'design-test.mjs'], timeout=900),
    'ai-core': dict(lane='fast', cmd=['node', 'ai-core-checks.mjs'], timeout=1800),
    'scene-interaction': dict(lane='fast', cmd=['node', 'scene-interaction-checks.mjs'], timeout=1800),
    'deployment': dict(lane='fast', cmd=['node', 'deployment-checks.mjs'], timeout=3000),
    'engine': dict(lane='extended', cmd=['node', 'engine-checks.mjs'], timeout=5400),
    'upstream-publish': dict(lane='extended', cmd=['npm', 'run', 'check:publish'], timeout=21000),
}


def run_suite(name, repo):
    spec = SUITES[name]
    started = time.time()
    try:
        result = subprocess.run(spec['cmd'], cwd=repo, capture_output=True, text=True,
                                timeout=spec['timeout'])
        status, tail = ('pass' if result.returncode == 0 else 'fail'), result.stdout + result.stderr
    except subprocess.TimeoutExpired as error:
        status, tail = 'timeout', str(error.stdout or '') + str(error.stderr or '')
    return name, dict(status=status, seconds=round(time.time() - started), tail=tail[-600:])


def compare(baseline, results):
    """Return (regressions, improvements, new) for a mapping of suite -> status."""
    regressions, improvements, new = [], [], []
    for name, status in results.items():
        before = baseline.get(name)
        if before is None:
            new.append(name)
        elif before == 'pass' and status != 'pass':
            regressions.append(name)
        elif before != 'pass' and status == 'pass':
            improvements.append(name)
    return regressions, improvements, new


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument('--lane', choices=['fast', 'extended'], required=True)
    parser.add_argument('--repo', type=Path, default=ROOT)
    parser.add_argument('--baseline', type=Path, default=ROOT / 'baseline.json')
    parser.add_argument('--jobs', type=int, default=2)
    parser.add_argument('--only', action='append', help='Run only the named suite (repeatable)')
    parser.add_argument('--update', action='store_true', help='Record these results as the baseline')
    args = parser.parse_args()

    names = [n for n, s in SUITES.items() if s['lane'] == args.lane and (not args.only or n in args.only)]
    baseline_doc = json.loads(args.baseline.read_text()) if args.baseline.exists() else {'schema': 1, 'suites': {}}
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        outcomes = dict(pool.map(lambda n: run_suite(n, args.repo), names))
    statuses = {n: o['status'] for n, o in outcomes.items()}
    regressions, improvements, new = compare(baseline_doc['suites'], statuses)

    lines = [f'## Regression ratchet ({args.lane} lane)', '', '| Suite | Baseline | Now | Seconds |', '|---|---|---|---|']
    for name, outcome in outcomes.items():
        lines.append(f"| {name} | {baseline_doc['suites'].get(name, 'none')} | {outcome['status']} | {outcome['seconds']} |")
    if regressions:
        lines += ['', '**Regressions (passed in the baseline, not passing now):** ' + ', '.join(regressions)]
        for name in regressions:
            lines += ['', f'`{name}` output tail:', '```', outcomes[name]['tail'], '```']
    if improvements:
        lines += ['', 'Now passing and previously failing (raise the baseline): ' + ', '.join(improvements)]
    if new:
        lines += ['', 'Not in the baseline yet: ' + ', '.join(new)]
    report = '\n'.join(lines)
    print(report)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
            summary.write(report + '\n')

    if args.update:
        baseline_doc['schema'] = 1
        baseline_doc['suites'].update(statuses)
        args.baseline.write_text(json.dumps(baseline_doc, indent=2, sort_keys=True) + '\n')
        print(f'Baseline updated: {args.baseline}')
        return 0
    return 1 if regressions else 0


if __name__ == '__main__':
    sys.exit(main())
