# V31 upstream validation memo

Date: 2026-11-06
Release: orbital-data-center-v31.zip
SHA-256: 504cfc0fb46f9c8c8a30c6678bb67c8b4298aa17b6c9f4f40ce00ddfc60afdc6

## Issue for the upstream development team

Running `node engine-checks.mjs` against the unmodified v31 ZIP fails at line 13:

```js
assert.ok(transfer.goodputMbps > 0 &&
          transfer.terminalKW > pre.terminalKW &&
          transfer.cmgKW > pre.cmgKW);
```

The default simulation's first contact after deployment produces:

| State | Goodput (Mbps) | Terminal power (kW) | CMG power (kW) | Delivered (GB) |
| --- | ---: | ---: | ---: | ---: |
| Before contact | 0 | 0.015 | 0.22809091078313762 | 0 |
| Contact +90 seconds | 390 | 0.24140185887259863 | 0.22808808229097008 | 3.4125 |
| After contact | 0 | 0.039 | 0.26371746690075876 | 14.29212890625 |

Acquisition and data delivery succeed; the CMG power comparison fails. In
`dist/model.js`, CMG power now follows normalized gimbal-rate duty. That may
invalidate the previous assumption that contact always increases CMG power.
Please determine the intended physical behavior and update the model or its
regression test upstream, then provide a new release ZIP.

Reproduction: Node v20.19.6, run `node engine-checks.mjs` from the ZIP's root.

## Additional validation observations

`ai-service-test.mjs` exceeded a 600-second validation limit. A retry reached its
initial success message but was stopped before completion when investigation
was handed back upstream. Some other long simulation suites were also stopped;
these interruptions are not evidence of assertion failures.

The site assembly's 15 tests, 162 asset manifest entries, and 123 JavaScript
syntax checks passed. Desktop and mobile startup, 3D rendering, fixed author
links, and social metadata checks passed with no browser errors or failed asset
requests. Numerous application suites passed; this was not a fully passing
60-suite run.

## Deployment boundary

Production is deploying the upstream v31 application unchanged, with the existing
separate local author/footer/SEO extensions. No application or test patch is
included in the deployment or this handoff. The upstream team owns the fix.
