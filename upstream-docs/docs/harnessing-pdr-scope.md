# Harnessing scope for the living preliminary design

**Active direction: 14 November 2026.** This replaces the old harness-recovery
dependency chain as the project's working plan. The user reset the scope to
preliminary design: fix harnesses crossing intact walls, occupying unintended
space, missing connections or interfering with the depicted mechanisms.

The site is a living preliminary design and its visitors are reviewers. There
is no formal PDR closure. The current authorized trial is **PDR-1 through PDR-3
for Redwire only** (`redwire-8kw` / `redwire-platform`). Other concepts remain
queued until requested, even if Redwire's trial is successful.

The canonical [Harnessing Plan](https://chatgpt.com/library?file_id=libfile_fde3_f-0f515944425c8191b5830d023851c0b1_0cb434008e808191ac4277e8c6f9d899&account_id=personal)
contains the full revised plan and disposition of the old tasks. This note is
the repository's operating instruction. It supersedes old task-card sequencing
for PDR work; it does not alter historical results or detailed checker semantics.

## What the preliminary layout needs

Review actual displayed routes, with their real diameters and neighboring
hardware present. Each route must have identifiable endpoints, an intended
installation corridor, deliberate wall passages, no unresolved major clash,
plausible bends/slack and a credible accommodation for the movements shown.
Record preliminary assumptions and what has not been reviewed.

A collision check cannot establish intended placement: an entirely exterior
cable can miss all walls yet still be wrongly installed. Inspect the corridor
explicitly. Conversely, a declared external array or antenna run is legitimate.
Do not substitute a universal central-bus bounding box for that distinction.
Do not hide cables or obstacles, shrink radii or add blanket contact exemptions
to make a defective route appear acceptable.

## Active work

| Step | Deliverable |
| --- | --- |
| **PDR-1: inspect Redwire** | Inspect the actual `redwire-8kw` routes and identify wall, endpoint, corridor or major-interference defects. Start with the compute-platform deployment/wall problem. Keep a short issue/pose record. |
| **PDR-2: repair and install Redwire** | Correct demonstrated route, endpoint, passage and major-clash defects; install the chosen geometry in the scene and retain useful before/after views. |
| **PDR-3: Redwire movement and estimates** | Inspect stowed, deployed and mechanism-critical intermediate states. Review slack, bends and length. Include individual harnesses and their cable/termination mass in the master equipment list; carry the calculated mass through the vehicle totals and affected estimates without double counting. |

Keep the inspected scope, changes, findings and remaining uncertainty visible
as ongoing design status for visitors. This is not a fourth formal closure
task, and it does not authorize work on another concept.

The user explicitly included the harness mass-accounting correction in this
trial. Replace the old coarse allowance with the calculated installed
cable/termination takeoff and include each harness in the master equipment
list. Preserve the before-state for comparison, but do not leave the resulting
mass mismatch as work for a later reviewer. A heavier preliminary vehicle is
the correct result when its routed harnesses require more mass.

The user's later screenshot demonstrates that the exposed panel branches and
bus-to-panel hoop still lack a credible physical installation. The current
direction explicitly authorizes redesigning these runs, adding or removing
MEL components as needed, and deploying the latest result within the 256 MiB
Sites archive limit. Mounted raceways, connector placement, and the moving
electrical/optical interface are part of this assignment. Account for their
hardware, current capacity, losses, optical budget and mass effects; a
collision-free unsupported loop is not a completed installation.

**Active assignment: complete PDR-1 through PDR-3 for Redwire as a trial.**
Execution findings belong in the implementation status and evidence; this scope
instruction does not claim any result. The twelve IDs in `routingCraftCatalog()`
remain the wider inventory, but only Redwire is active. June Orbital, Starmind,
Starcloud and the other concepts are queued, not implied passes or automatic
next tasks. Reuse prior evidence only where installed routing and relevant poses
are genuinely equivalent.

Animation and selected poses support preliminary movement accommodation, not a
continuous-motion or fatigue certificate. Ground, TVAC, bay and launch scenes
enter the current work only if needed to understand a demonstrated Redwire
routing problem. The former all-facility campaign and all 180
spacecraft/launcher/site outcomes are not prerequisites. Major routing defects
remain visible issues in the declared scope; incomplete coverage is explicit.

## Reuse the existing work

Use `dist/routing-inspector.js` for selection, pose inspection and route evidence;
`dist/flight-routing-registry.js` for actual tubes and connectors;
`dist/routing-audit.js` for focused geometry checks; and
`dist/routing-configurations.js` for the inventory. Build new tooling only to
answer a concrete question those tools cannot answer.

Preserve H05–H09's installed June repairs and H11's integrated Starmind
`P-SA-1/2` repair. H11 retained 109 other native planning failures; those remain
queued with Starmind until that concept is requested. It did not accept the
whole spacecraft.

The H12 detailed internal collector proposal remains unhooked and outside this
Redwire trial. If collector work is later requested, preliminary design may use an
explicitly preliminary functional junction/enclosure with real external
connections, circuit identity, intended passages and an allocated support/cable
envelope. Detailed copper, insulation and contact interfaces are not required
to establish that external layout. Do not install the unfinished internal
proposal merely to complete an old task number.

H12/J1–J11 records remain historical engineering evidence. H12 is incomplete
under its original contract and **deferred from PDR**. Do not automatically
continue its negative-edge, exact-patch, containment, orientation, exposed-union
or seam-proof branches. Treat an actual major geometry defect as a PDR issue;
retain a fine numerical ambiguity as later analysis with its original status.

## Work records and publication

Use one practical issue list and a short result record per repair. Keep route,
configuration and pose identity, changed source, useful views and relevant
check results. Ordinary layout work does not require a new proof-card tree,
repeated inherited-evidence reconciliation or universal omission/corruption
campaign. Run focused checks for the actual regression risk. A documentation
change alone does not require a geometry or numerical test campaign.

A future **preliminary-design snapshot** records the scope actually inspected,
changes and remaining findings for visitors. Use affected functional checks
and normal application/build checks, with remaining engineering limitations
visible. Publication of the current Redwire redesign is explicitly requested.
Ongoing preliminary review and
detailed engineering verification have separate dispositions: existing
validators retain their predicates, failures and unknowns. Never describe a
PDR review as a pass of the full engineering gate.

The full gate remains required for a release claiming complete engineering
verification and for engineering changes outside this harnessing PDR scope,
including thermal models and other numerical capabilities. See `AGENTS.md`.
The active Redwire assignment authorizes implementation and focused checks for
steps 1–3. This document records scope, not completed execution or deployment.

See [implementation status](routing-implementation-status.md) for current work
and [H12 history](harnessing-work/H12-status.md) for the deferred campaign.
