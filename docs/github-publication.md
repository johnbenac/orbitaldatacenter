# Public GitHub repository

The public source repository is
https://github.com/johnbenac/orbitaldatacenter. GitLab remains the private internal
remote; it is not a public source link. The public repository was created and its
history pushed on 2026-11-05 using the existing GitHub CLI authentication.

## Local remotes

| Remote | URL | Purpose |
| --- | --- | --- |
| `origin` | `https://gitlab.benac.dev/johnb/orbitaldatacenter.git` | Private internal repository; `main` tracks `origin/main` |
| `github` | `https://github.com/johnbenac/orbitaldatacenter.git` | Public source and collaboration |

This checkout overrides the global GitHub SSH rewrite for `johnbenac` URLs so
the GitHub remote also uses HTTPS. Its credential helper uses the active GitHub
CLI configuration; no credentials are embedded in the remote URL. On this host,
`GH_CONFIG_DIR` normally selects `/home/johnb/.config/gh`.

## Authentication and verification

Run from `/root/orbitaldatacenter/site`. First verify GitHub CLI authentication:

```sh
gh auth status
gh api user --jq .login
```

The account must be `johnbenac` with repository-creation and push access. Local
Claude histories confirm successful repository creation for AudioBoard and
Characters using ordinary `gh repo create` commands, and a November 2 auth check
identifies `/home/johnb/.config/gh/hosts.yml` as the working credential store.
The separately stored root credential is older and returns HTTP 401.

John's existing configuration works when the execution environment permits
reading it. Do not substitute the stale root configuration or assume another
login is needed because a restricted session cannot read the active configuration.

The repository already exists; inspect its state with:

```sh
gh repo view johnbenac/orbitaldatacenter
gh repo view johnbenac/orbitaldatacenter --json url,visibility,defaultBranchRef
git ls-remote github refs/heads/main
```

`github_published` is `true` in `publication.json` after verification of public
access. Assembly enables public GitHub links in the workbench footer and About
page. If publication is withdrawn, disable that setting and redeploy.

Preserve the existing commit history. A project-wide license has not been chosen;
retain all bundled third-party license notices.

## Subsequent updates

Push reviewed changes to both services explicitly:

```sh
git push origin main
git push github main
```

Neither push deploys the website. Do not configure GitHub Actions to contact the
private GitLab host; no automatic mirroring is configured. Record and resolve a
failed push to either remote before reporting both synchronized.

Before initial publication, all 701 historical blobs were checked for common
credential formats and the saved GitLab and Cloudflare token values; none were
found. Repeat the relevant review when new ZIPs or deployment configuration are
added. Keep provider credentials, local state, and archives outside Git.
