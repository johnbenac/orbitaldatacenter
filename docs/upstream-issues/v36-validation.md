# V36 upstream validation memo

Date: 2026-11-06
Release: orbital-data-center-v36.zip

## Issue for the upstream development team

The supplied ZIP fails `node interface-checks.mjs` with Node v20.19.6:

```text
AssertionError [ERR_ASSERTION]: agents
at interface-checks.mjs:22:85
actual: false
expected: true
```

Please review and resolve this assertion upstream and supply a subsequent ZIP.
No local application or upstream test changes are proposed or included.

## Deployment checks

The 15 local assembly/import tests passed. All 184 manifest assets exist, and
all 142 application JavaScript files passed syntax checks. The input-guidance
suite passed. The developer's validation documents and screenshots are retained
under `upstream-docs/`; their results are upstream evidence, not local test runs.

Per the requested deployment boundary, full numerical regression and model
investigation remain with the upstream team. This deployment preserves the
supplied application and adds only the existing independent site extensions.
