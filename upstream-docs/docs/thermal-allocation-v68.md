# Thermal allocation and numerical readiness — v68

## User-visible correction

The parts navigator now supplies complete, traceable defaults for every numerical thermal setting offered by the shipped configuration matrix. Payload network fabric and host interfaces (01.04) can run its thermal-vacuum prediction immediately. Its project article allocation is 0–35 °C operational and −40–70 °C nonoperational, informed by the NVIDIA QM97xx forward-airflow environmental specification. An air-cooled supplier ambient range informs this proposed allocation; it does not establish an article's qualified vacuum capability. Supplier ratings, test approval and measured verification remain distinct records.

The model calculates initial chamber commands from article targets, local dissipation, the fixture heat path and radiation. The interface shows article targets and chamber commands separately, retains their sources and engineering basis, and updates derived commands when their inputs change. Users can edit them. Clearing a required field still blocks an incomplete run; restoring the defaults recovers readiness. Old drafts with the previous allocation revision cannot replace the completed baseline with null values.

## Cause and scope

The previous release exposed thermal settings independently of local requirement allocations and numerical-model coverage. Validation correctly rejected missing targets, but the release checks did not require every exposed setting to be runnable. The retained v67 baseline found 154 blocked settings out of 175 across the custom study and six design references.

This update adds explicit item requirement profiles, local thermal-property allocations, article and fixture models, sources and scope statements across flight hardware, launch equipment, ground support and facilities. Material samples use explicitly sized coupons. Contained fluids use vessel interfaces. Provider hardware and facilities identify representative segments rather than claiming a complete supplier or building model. Installed atmospheric analyses include air coupling; vacuum cases do not. Unknown future flight families require an allocation instead of inheriting a silent generic fallback.

The published engineering basis is available at `/thermal-allocation-basis.html`. Its tables are generated from the allocation registries used by the production models.

## Release verification

`npm run check:publish -- --output /tmp/engineering-readiness-v68-publication.json` passed on the final engineering source on 2026-11-08. The complete report is retained as `docs/engineering-readiness-v68-publication.json`.

| Coverage | Result |
| --- | --- |
| Configuration matrix | 17 configurations, including all design references, launch vehicles and engine alternatives |
| Part instances | 2,628 |
| Numerical thermal plans | 5,035 of 5,035 ready |
| Offered thermal settings | 425 with complete inputs |
| Full production predictions | 442 completed, including whole-spacecraft thermal balance |
| Required design inputs | 4,420 checked before normalization |
| Derived allocations | 1,904 checked |
| Numerical domain screens | 272 screens and 2,881 comparisons |
| Communications benches | 50 installed cases and one valid absent-hardware case |
| Blocking readiness issues | 0 |

The release command also passed 21 thermal-physics groups, four convergence groups, 11 controller groups, 12 UI/visual contract groups and ten readiness regression groups. Tests cover missing and corrupted inputs, broken source references and heat paths, configuration identity, edits and resets, finite outputs, energy conservation, prediction provenance and browser artifact size.

All 01.04 cases in the matrix completed their required thermal plateaus. The global-time refinement diagnostic is retained alongside a separate stage-relative response comparison and schedule timing differences. Stage-relative comparisons do not replace or conceal global-time warnings.

Readiness is not thermal acceptance. The audit retains 34 predictions with unmet plateaus, 196 predicted PDR shortfalls, and open physical-verification evidence. These are visible engineering results, not missing default inputs or fabricated passes. The artifact report records the relevant scenario and diagnostics.

After publication, a live browser check selected Redwire → Parts navigator → 01.04 → Thermal vacuum. Cold and hot chamber commands were populated at 272.653 K and 303.507 K; the article targets were 273.15 K and 308.15 K. Run thermal prediction recorded a 6.09-hour simulated schedule, with every hot/cold plateau and recovery dwell marked predicted-complete. The maximum energy residual was 9.855e-8 W. The global-time refinement warning (2.677 K) remained visible. The live result screenshot is retained in `docs/thermal-v68/network-fabric-live-result.jpg`.

## Prevention

The repository publication instructions require the complete release gate whenever engineering inputs change. The configuration matrix expands from the catalogs, and regression tests deliberately remove real required allocations to prove omissions block release. The same checks are included in `.github/workflows/engineering-readiness.yml` for GitHub-hosted use. Native Sites publication does not implicitly run GitHub Actions; the complete gate was executed locally before packaging this release.

## Key sources

- NVIDIA, [QM97xx specifications](https://networking-docs.nvidia.com/qm97x0hw/specifications): supplier environmental range used as a stated reference for the 01.04 project allocation.
- NASA GSFC, [General Environmental Verification Standard, GSFC-STD-7000B](https://standards.nasa.gov/sites/default/files/standards/GSFC/B/0/gsfc-std-7000b_signature_cycle_04_28_2021_fixed_links.pdf): verification tailoring, thermal test planning and article-temperature context.
- The generated allocation-basis page and `docs/thermal-default-allocation-research.md` list the additional hardware and material sources and distinguish sourced data from project engineering assumptions.
