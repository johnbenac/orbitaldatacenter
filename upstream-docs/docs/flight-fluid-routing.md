# Installed fluid routing and interface accounting

The flight routing gate consumes the actual rendered tube buffers, physical
fittings, drilled wall penetrations, and installed solid meshes. Hidden cutaway
surfaces remain solid obstacles. A shortened or released article retains its
actual remaining hardware in the inventory. No whole wall, pump, connector box,
or unrelated circuit is exempted from collision checks.

## Physical connections

Each cold plate has two real tube-connected fittings. Column supply and return
headers connect those fittings to the allocated pump/manifold station. Every
propellant tank, pressure regulator, feed manifold and injector likewise has a
registered external line and a physical endpoint. Separate copper or fluid
circuits retain separate finite-radius paths.

A bulkhead passage cuts the actual face sheet, core and exterior blanket layers.
Its internal bore section and exterior conduit sections form one logical circuit
only when their named junctions actually coincide. A rotary fluid component has
two distinct external ports: its internal transfer is a declared component
channel, not an imaginary exterior tube spanning the fixed/moving gap.
For each interleaf transfer the inventory also compares the actual fixed and
rotating axis datums. Their centers must coincide within 20 micrometres and
their axes within 10 microradians. Translation, tilt, missing ports, non-finite
geometry and inflated tolerance declarations all have explicit regression cases.

All connector banks and their real wall passages are installed before final
route planning. Fluid pipes first reserve the electrical connectors' actual
approach and withdrawal volumes. Electrical routes then reserve the accepted
fluid buffers. A final combined audit checks both sets of installed lines;
planning failure retains its issue and cannot become a clearance pass.

The protected core has independent pitch and roll fluid transfer channels at
its root. The inline arm retains real fixed-length interleaf hoses. The tracked
family radiators use fixed and rotating feeder pipes at actual transverse
accordion pivots. Their 260 mm panel pitch gap reserves room for the physical
neck/housing through the complete fold; emitting panel area is unchanged.

The newly modelled family launch restraints telescope into 40 mm residual
housings before appendage motion. Their finite cylinders remain in all solid
snapshots. The deployment bound uses the declared monotone stroke and includes
its start and end times as interval boundaries.

## New rotary hardware budgets

The controlled project allocation in `dist/fluid-interface-allocation.js`
assigns each independent rotary axis:

- A 28 mm minimum internal flow diameter.
- An 8 kg installed hardware mass budget.
- A developed internal passage length of 1 m.
- A minor-loss coefficient budget K = 10.

These are project estimates. They are not measured supplier ratings. The mass
budget covers the allocated drilled aluminium enclosure/neck volume and reserve;
pressure, leakage, material compatibility, torque and thermal-vacuum life
qualification remain open.

The new interleaf feeder pipes have actual 36 mm outside and allocated 28 mm
inside diameters. Their developed lengths come from the constructed straight
legs and circular 108 mm fillets. Their steel mass, fluid volume and pressure
loss enter the loop model separately from the rotary hardware. The inventory
checks the rendered polygonal length against the exact developed length with
its explicit circular chord correction.

For pumped architectures, the pressure calculation evaluates the rotary
restriction and feeder friction at the 28 mm bore, rather than applying K to a
potentially larger main header. This pressure drop is added to the system curve
before selecting the pump operating point. Hardware mass, pipe metal and coolant
inventory enter the vehicle mass ledger and thermal capacity once. The prior
2 kg / K = 2 extra-fold hose fitting allowance is removed only where that hose
was replaced; common manifold fittings and mechanical hinge mass remain in their
original allocations.

For the heat-lift study, the new external hardware and feeder metal are included
in mass and thermal capacity. The working fluid remains unselected. Hydraulic
pressure loss, wet inventory and any secondary pump duty therefore remain
explicitly unclosed, with null pressure-drop results; no zero-loss assumption or
ammonia property correlation is inherited.

`h.energySystem.thermal.rotaryFluidAccounting` carries the configuration-level
allocation. `fluidRoutingSnapshot().interfaceAllocation` reconciles that model
with actual installed channel and axis counts. Supplier qualification stays
separate from this mass/hydraulic accounting.

### Remaining installed-length reconciliation

`fluidRoutingSnapshot().installedLengthAccounting` records every exterior
fluid section's actual buffer length and its constructed developed length when
the recipe is available. The existing common header and branch predictions use
their explicit equivalent-length allocations. Replanning a pipe around a newly
installed connector can change its physical length without changing those
allocations. The report therefore keeps as-routed hydraulic loss, wet inventory
and pipe-mass reconciliation open; it does not claim those model allocations
are exact manufacturing lengths. Closing this item requires mapping each
individual section to its actual series/parallel flow, bore, wall and minor-loss
path. A total of all exterior pipes must not be substituted for one series
branch. The new rotary feeder lengths are separately reconciled and included in
the thermal model as described above.

### Flexible hose cut lengths

The retained interleaf fluid hoses use two full-radius quarter-circle bends in
the plane perpendicular to their common hinge axis. Their existing animation
conserves the rendered polygonal centreline. The physical circular cut is longer
by the exact, constant two-arc chord deficit; eight straight chords approximate
each quarter circle. `fluidFlexLengthEvidence` records both lengths separately
and checks the actual connector axes, current construction, unit scale, complete
declared chord range and full-radius tangent budgets. The route adapter also
checks the displayed vertices against that construction.

An undeclared, skew, shortened or bend-limited hose cannot inherit this physical
cut-length proof. Its inventory fails. The ledger reports a physical hose cut
only when the proof passes; the rendered target is never relabelled as an exact
manufacturing length. The general as-routed hydraulic reconciliation above
remains open until the section-level flow and bore mapping is complete.

## Executable checks

`flight-fluid-routing-checks.mjs` validates the inventory, actual endpoints,
finite-radius self/interline/solid clearance, bend radii and length at meaningful
regression poses for every shipped configuration. Its `--fluid-only` option is a
diagnostic scope and never claims combined electrical/fluid clearance or
continuous certification.

The shared `flight-routing-checks.mjs` and `npm run check:routing` gate combine all
installed electrical and fluid sections and certify the continuous deployment,
operational pointing, solar tracking, connector withdrawal and other registered
motion domains. Unknown motion models or an unresolved interval fail the gate.
A finite set of animation snapshots is not a continuous certificate.

`energy-design-checks.mjs` verifies rotary mass, pressure and retained-fluid
accounting. `engineering-readiness-checks.mjs` rejects missing bore/K/mass/loss
inputs, zero claimed pressure loss for an installed active transfer, incorrect
axis count and a broken mass subtotal. The full publication gate remains
mandatory after any engineering input or geometry change.
