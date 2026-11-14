# Importing developer ZIP releases

Developer files stay in `dist/` and the existing root `.mjs` suites and design
documents. Our author content, metadata, assembly tooling, and deployment remain
in separate `extensions/`, `scripts/`, and other site-owned files. Building the
website assembles these inputs into `.build/public/`; never edit that output.

`upstream-files.json` records each developer-owned path and its SHA-256 checksum.
Its archive checksum identifies the source ZIP. The initial baseline is v21.
The importer refuses to replace locally changed upstream files or claim an
existing unowned file. Add independently maintained features outside `dist/`.

## Review and apply a new drop

Copy the developer's ZIP into the workspace outside the Git checkout. Work on an
import branch and review the dry-run before applying:

```sh
cd /root/orbitaldatacenter/site
git switch -c import/v22
python3 scripts/import-release.py ../orbital-data-center-v22.zip
python3 scripts/import-release.py ../orbital-data-center-v22.zip --apply
git diff --stat
git diff -- upstream-files.json
```

The default command changes no files. `--apply` validates the complete archive,
stages its contents, updates changed/new upstream files, removes obsolete
upstream-owned files, and records the new archive and file checksums. It does
not commit, push, or deploy. Reimporting the same archive produces no file changes.

Developer `README.md` and `.openai/hosting.json` are imported as
`upstream-docs/README.md` and `upstream-docs/hosting.json`; our root README and
production deployment configuration are preserved. Bundled `history.bundle`
files are skipped: a new drop never replaces this repository's Git history.
For split ZIP drops, retain both numbered parts and concatenate them in order
into the original `.zip` before importing. Record the combined checksum and each
part's checksum in `release.json`. The import size limit counts source files,
excluding the skipped history bundle; an oversized bundle need not enter Git.
The reviewed `tools/build-identity.py` generator is also upstream-owned; its
generated artwork ships in `dist/` and does not need rebuilding for deployment.
Developer repository metadata (`AGENTS.md`, `.gitignore`, `.gitattributes` and the
`.github/workflows/engineering-readiness.yml` workflow) is stored inert under
`upstream-docs/` (as `AGENTS.md`, `dot-gitignore`, `dot-gitattributes` and
`github-workflows/`), so it can never replace our files or enable CI here. Developer
`docs/**` is stored under `upstream-docs/docs/`. Two bulky provenance trees are skipped and
reported, like `history.bundle`: `docs/harnessing-work/` (upstream engineering working
evidence, about 900 MB in v73) and `__export_metadata__/`. They do not affect the website.
The static-asset list may be plain `dist/assets.json` or, from v73, the one-file
`dist/assets.json.zip`; a release must have exactly one, and the build assembles the
extension files into whichever form the release uses.
All other incoming root paths must be recognized developer files. Unexpected
layouts require reviewing the ownership rules before import. The assembled
`/_site/` and `/about/` namespaces are reserved for local features.

## Verify before merging

```sh
python3 -m unittest discover -s tests
node design-test.mjs
node engine-checks.mjs
node scene-interaction-checks.mjs
node ai-core-checks.mjs
python3 scripts/build-site.py
```

Run additional suites for changed subsystems. Check the assembled app's startup,
3D view, author links, social metadata, and mobile layout, then commit the import
and its ownership manifest together. Record checks for the new release; previous
`release.json` checks must describe the imported drop rather than a previous release.

After review, merge into `main`, push each configured remote, and run
`python3 deploy.py`. Deployment remains a separate explicit operation.

## Importer regression checks

`tests/test_import_release.py` uses standard-library `unittest` and synthetic
successive drops to verify additions, deletions, repeat imports, preserved local
features, and refusal of traversal, duplicate paths, symbolic links, missing
assets, and ownership collisions. The importer limits imports to 10,000 entries
and 500 MB of imported source uncompressed, excluding skipped Git history.
Individual deployment files must fit Pages' file-size limit; use R2 for assets
that exceed it rather than committing oversized files.
