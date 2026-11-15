# Repository Guidelines

## Source and Local Features

`dist/`, the root `.mjs` regression suites, `DESIGN.md`, `ENGINE.md`, `SCENE.md`, `src/`,
`upstream-docs/` and the developer tool scripts in `scripts/` are the application. ChatGPT and
Codex change them directly through pull requests (see Contributing below). Site-owned files keep
their own review: `extensions/` (author pages, styles, social graphics), `scripts/build-site.py`,
`deploy.py`, `tests/`, `docs/`, `graphics/`, `.github/`, `baseline.json`, `publication.json` and
`release.json`. The full list is `.github/CODEOWNERS`.

`scripts/build-site.py` assembles the application and the extensions into ignored `.build/public/`
without changing application files. It fails when the application's HTML structure no longer
matches the expected head and footer anchors; fix the structure or ask the owner.

## Contributing (ChatGPT and Codex)

1. Branch from `main` as `chatgpt/<topic>`. Never push to `main`; it is protected.
2. Change only what the task needs. Keep each deployable file under 25 MiB. Do not commit
   working evidence, exports, logs, archives or `history.bundle` files; keep them outside the repo.
3. Run these from the repository root with Node 22 and Python 3.12 before opening the pull request:

   ```sh
   python3 scripts/check-release.py
   python3 scripts/build-site.py
   python3 -m unittest discover -s tests -v
   python3 scripts/ratchet.py --lane fast
   ```

4. Open a pull request against `main`. Commit messages and the title use Conventional Commits,
   with a body that explains what changed and why, lines under 100 characters, and no email
   addresses or attribution trailers. Write what changed in plain words; do not describe who or what
   produced the change.
5. CI runs commit-message checks, unit tests, release checks, the regression ratchet and a browser
   smoke test. When all pass, the pull request merges itself (rebase merge) and the merge deploys to
   production. If a check fails, fix it on the same branch.

A pull request that touches a path listed in `.github/CODEOWNERS` also waits for the owner's
approval. Credentials, tokens and `.env` files never belong in the repository or a pull request.

### The regression ratchet

`baseline.json` records which developer suites pass. `python3 scripts/ratchet.py --lane fast` runs
`design-test.mjs`, `ai-core-checks.mjs`, `scene-interaction-checks.mjs` and `deployment-checks.mjs`
for the Pathfinder preset. A suite that passes in the baseline must keep passing. A suite that
already fails does not block, and fixing one is welcome: say so in the pull request and the owner
raises the baseline. The nightly job runs the long suites as separate jobs: `engine-checks.mjs`,
the full `deployment-checks.mjs` sweep and `npm run check:publish`.

## Development and Tests

```sh
python3 scripts/build-site.py
python3 -m http.server 8000 --directory .build/public
python3 -m unittest discover -s tests -v
node design-test.mjs
```

Run the relevant developer suites for model changes; `engine-checks.mjs` is slow. For presentation
changes, inspect desktop and mobile layouts and browser errors. Check author links, canonical URLs,
Open Graph and Twitter metadata, structured data and the social image in the assembled HTML,
including with JavaScript disabled. Use ES modules, existing JavaScript formatting, and four spaces
in Python.

## ZIP Imports

Routine work arrives as pull requests. `python3 scripts/import-release.py /path/to/release.zip`
remains for a developer ZIP drop; it reviews by default and applies with `--apply` on an import
branch. See `docs/zip-imports.md` for ownership and archive handling.

## Commits, Remotes, and Publication

Use Conventional Commits with an explanatory body, lines under 100 characters, and no email
addresses or attribution trailers in messages.

`github` is where pull requests land and the public source link points. `origin` is a private
GitLab mirror. Merging to `main` publishes production through `.github/workflows/deploy.yml`:
it deploys to Cloudflare Pages, verifies the live site, and rolls back to the previous deployment
if verification fails. `python3 deploy.py` remains for a manual publish. The Cloudflare token lives
in the `production` environment only; keep credentials outside Git and preserve third-party
licenses. The inherited `.openai/hosting.json` is export provenance, not production hosting
configuration.

The standing prohibition on the removed `tooo-enterprise-architects` plugin applies here; do not
load or follow references to its skills.
