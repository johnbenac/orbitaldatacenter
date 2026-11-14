# Current harnessing scope — living preliminary design

Read `docs/harnessing-pdr-scope.md` before continuing harnessing work. The user
reset the scope on 14 November 2026 to a credible preliminary layout: intended
corridors, correct connectors/passages, no major interference and plausible
movement. This site is a living preliminary design; its visitors are reviewers.
There is no formal PDR closure to achieve.

The current authorized work is steps PDR-1 through PDR-3 for Redwire only
(`redwire-8kw` / `redwire-platform`): inspect its actual displayed routes,
repair/install the demonstrated defects, and check movement and materially
affected estimates. Account for individual installed harnesses in the master
equipment list and carry their calculated cable and termination mass into the
vehicle totals, replacing the earlier allowances without double counting.
The user explicitly included this mass-accounting implementation in the
Redwire assignment; an underweight allowance is work to correct now.
The later screenshot and direction on the same date explicitly authorize a
physical redesign of the exposed Redwire installation, changes to its MEL,
and deployment of the corrected latest source within the 256 MiB Sites
archive limit. Replace unsupported panel and hinge loops with real mounted
runs and an accounted interface; collision-free free space alone is not an
acceptable installation. Include the changed interface's electrical and
optical allocations and the installation's geometry-derived radiator area in
the affected functional checks. This authorization
applies to the Redwire preliminary-design snapshot, not other concepts.
Start with the original compute-platform deployment/wall
problem. Treat this as a trial before other concepts. All other concepts remain
queued until the user requests them; do not expand the assignment automatically.

H12's material-proof campaign and the old exhaustive facility/launcher/motion
dependency chain are deferred from PDR. Do not automatically resume the next
H12 proof stage. Preserve useful installed repairs and historical results;
old task cards do not override this scope reset. Ordinary repairs need a short
record and focused checks for the actual regression risk. Document-only work
does not require a numerical or geometry campaign.

## Harnessing PDR publication profile

Publish only when requested; the current Redwire redesign is explicitly
authorized for deployment. A preliminary-design snapshot records the scope
actually inspected, the changes made and the remaining findings for visitors.
Use affected functional checks and normal application/build checks, with
remaining engineering limitations visible; no formal review closure or review
of every other concept is required. It does not claim the
full engineering publication gate passed. Existing detailed validators retain
their predicates, failures and unknowns; never change or hide a result to turn
it into a PDR pass. No implementation of a weaker engineering validator is
authorized by this plan.

This tailored profile applies to harnessing PDR layout work only. A release
claiming complete engineering verification, or engineering changes outside
this scope (including thermal models and other numerical capabilities), uses
the full publication profile below. Applicable checks still cover any changed
electrical or other numerical assumptions within a harness repair.

# Full engineering publication profile

For full engineering publications, and for engineering changes outside the
harnessing PDR scope above, including changes to engineering defaults,
installed hardware, the parts catalog, requirements, thermal properties,
numerical models or executable procedures:

1. Run `npm run check:publish` against the source that will be published. This
   first runs `npm run check:routing` for actual tube-buffer inventory, connector
   closure, finite-radius solid/self/interline clearance, bends, developed length
   and conservative continuous motion certificates. Missing or unresolved motion
   coverage is a failure. It then checks thermal physics, convergence, controller/UI integration, missing-input
   regression detection and every shipped configuration's numerical readiness,
   then executes the full thermal schedules offered by the parts navigator.
2. Treat a nonzero result as a release blocker. Fix the allocation, mapping,
   model or procedure and retain its engineering basis. Do not bypass a failure
   by removing validation, hiding a supported activity or introducing an
   unexplained universal fallback.
3. Keep run readiness separate from performance and physical verification. A
   sourced project allocation can support a runnable prediction without being
   a supplier capability rating. A predicted shortfall, an uncorrelated model
   and open measured evidence remain visible; they are not fabricated passes.
4. When adding a numerical capability, declare its required inputs in the
   readiness contract and add an omission/corruption regression case. New
   references, launcher catalogs and engine presets enter the matrix
   automatically; new part families need explicit thermal allocations.

To retain the complete machine-readable publication report, run:

```sh
npm run check:publish -- --output /tmp/engineering-readiness-publication.json
```

Use the same command in the Sites source-helper checks before packaging, or
reuse a successful check only while its engineering inputs remain unchanged.
The GitHub Actions workflow runs when this repository is hosted on GitHub;
the native Sites repository does not implicitly execute GitHub Actions.
Further details and failure codes are in `docs/engineering-readiness.md`.
