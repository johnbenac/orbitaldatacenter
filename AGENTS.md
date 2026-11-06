# Repository Guidelines

## Source and Local Features

`dist/`, root `.mjs` regression suites, and developer design documents come from
ZIP releases. `upstream-files.json` records their ownership and checksums.
Keep independently maintained pages, styles, and social graphics in `extensions/`.
`scripts/build-site.py` assembles both into ignored `.build/public/` without
changing developer files. Keep integration changes explicit and fail the build
when the developer's HTML structure no longer matches expected anchors.

## Development and Tests

Run from this checkout:

```sh
python3 scripts/build-site.py
python3 -m http.server 8000 --directory .build/public
python3 -m unittest discover -s tests -v
node design-test.mjs
```

Run relevant developer suites for model changes; `engine-checks.mjs` is slower.
For presentation changes, inspect desktop/mobile layouts and browser errors.
Check author links, canonical URLs, Open Graph/Twitter metadata, structured data,
and the social image in assembled HTML, including with JavaScript disabled.
Use ES modules, existing JavaScript formatting, and four spaces in Python.

## ZIP Imports

Use `python3 scripts/import-release.py /path/to/release.zip` to review an import.
Apply with `--apply` on an import branch. Review additions, updates, and deletions,
then run assembly and relevant tests before merging. Never extract a drop over
the whole checkout. See `docs/zip-imports.md` for ownership and archive handling.

## Commits, Remotes, and Publication

Use Conventional Commits with an explanatory body, lines under 100 characters,
and no email addresses or attribution trailers in messages. Include validation
and screenshots for visual changes in merge requests.

`origin` is private GitLab over HTTPS; `github` is the intended public GitHub
remote. Verify public availability before setting `github_published` in
`publication.json`. Push reviewed source to each available remote explicitly.
`python3 deploy.py` assembles and publishes production; Git pushes do not deploy.
Keep credentials outside Git and preserve third-party licenses. The inherited
`.openai/hosting.json` is export provenance, not production hosting configuration.

The standing prohibition on the removed `tooo-enterprise-architects` plugin
applies here; do not load or follow references to its skills.
