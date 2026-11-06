# Public GitHub repository

The intended public source repository is
https://github.com/johnbenac/orbitaldatacenter. GitLab remains the private internal
remote; it is not a public source link. Adding the GitHub remote alone does not
create or publish the repository.

## Local remotes

| Remote | URL | Purpose |
| --- | --- | --- |
| `origin` | `https://gitlab.benac.dev/johnb/orbitaldatacenter.git` | Private internal repository; `main` tracks `origin/main` |
| `github` | `https://github.com/johnbenac/orbitaldatacenter.git` | Public source and collaboration, once published |

This checkout overrides the global GitHub SSH rewrite for `johnbenac` URLs so
the GitHub remote also uses HTTPS. Its credential helper uses the active GitHub
CLI configuration; no credentials are embedded in the remote URL. On this host,
`GH_CONFIG_DIR` normally selects `/home/johnb/.config/gh`.

## Initial publication

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

In the restricted November 5 agent session, John's configuration was unreadable.
Switching to `/root/.config/gh` did not solve authentication, and the documented
refresh failed. Publication requires a permitted execution context that can use
John's existing CLI configuration. Do not assume the account needs another login
merely because a restricted session cannot read its configuration.

Check whether the repository already exists. Only create it if GitHub reports
that it is absent; an authentication or network failure is not proof of absence.

```sh
gh repo view johnbenac/orbitaldatacenter
gh repo create johnbenac/orbitaldatacenter --public --description 'Orbital Data Center: a browser-based spacecraft engineering workbench' --homepage https://orbitaldatacenter.design
git push github main
gh repo view johnbenac/orbitaldatacenter --json url,visibility,defaultBranchRef
git ls-remote github refs/heads/main
```

After verifying that the repository is publicly accessible, set
`github_published` to `true` in `publication.json`. Assembly then enables the
public GitHub links in the workbench footer and About page. Before publication,
the site links to its own source-information section instead of a missing
repository. Commit that setting, run the assembly tests, push both remotes, and
redeploy to publish the source links.

Create an empty repository: do not initialize another README or unrelated history.
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
