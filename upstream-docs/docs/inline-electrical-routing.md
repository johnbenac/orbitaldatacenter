# Inline arm electrical routing

The inline architecture represents the complete source-to-PCDU connection as
physical cable sections and an explicit two-axis rotary component. In the
shipped high-voltage configuration there are two banks of 32 individual polarity
conductors. Each conductor has one body cable and one articulated arm cable,
giving 128 independently registered physical cable sections. The original
logical conductor identity remains attached to both sections.

## Fixed and rotating interfaces

`inline-root-electrical-transfer.js` installs separate fixed stator and carried
rotor receptacles on the actual deployment frames. A conductor terminates at
each receptacle. Its connection across the yaw and roll joints is a declared
two-stage sliding-contact component; there is no exterior wire spanning an
imaginary gap between those two cable sections. The electrical model retains
the extra mating interfaces and sliding-contact loss allocation. Supplier
voltage, current, isolation, torque, wear and environmental-life evidence remain
open project requirements.

The fixed stator bank sits below the root rotor's swept band. A real rectangular
gland passes through every wall and blanket layer between the structural rails.
Each individual conductor has its own finite-radius approach through that
gland. The routing check includes the rails, both connector shells and the
remaining pierced wall geometry.

The PCDU retains its real connector identities and packed circuit positions.
Each body cable has an explicit outward approach, an aft-facing circular bend,
and an open bored guide. The shipped construction uses a 540 mm control lead,
80 mm of straight cable beyond the bend before the guide, and successive port
columns nested by 26 mm. Those dimensions are increased if
the selected cable's radius or bend allocation requires it. Source and
destination fanouts enter the planning reservations before any fluid or
electrical route is selected.

The body guides allow the allocated axial service travel through their bores.
They are not locked material clamps. The conserved-length service construction
therefore does not assume cable can stretch between a locked guide and a
withdrawn plug. Guide friction, wear and final retention design remain hardware
qualification work; geometric clearance alone does not establish those
capabilities.

## Articulated arm and service length

`inline-arm-routing.js` provides a separate lane for every conductor at every
fold. The rigid leaf routes connect real open supports. The interleaf sections
use the circular, constant-developed-length construction in
`accordion-flex-routing.js`, with a dedicated transverse plane and explicit
minimum bend radius. The model carries the construction's chord error and
Float32 buffer error when checking the actual tube mesh.

The root lead, articulated chain and source lead form one continuous arm cable.
The body cable comprises the actual stator fanout, its free service route, and
the complete reversed PCDU fanout. No fixed tail is omitted from the drawn cable,
length reconciliation, collision checks or procurement record. The two full
cable lengths are aggregated back to the original conductor in
`reconciliationRecords()`.

Every removable endpoint has a 45 mm allocated withdrawal stroke in this
installation. A reservoir translates a fixed-angle middle section while the
connector consumes the corresponding lead length. The allocator requires a
conservative affine proof over the entire two-end withdrawal rectangle. A
changing angle, insufficient tangent budget, changing fillet radius or unresolved
construction prevents acceptance.

## Planning and verification

The installer lays out every complete static cable with the fixed fanouts and
guide departure corridors reserved. It then allocates each service reservoir
against all other static cables and every previously accepted full withdrawal
envelope. An early service loop cannot consume an unplanned cable's corridor.
The arm's root and source service envelopes are reserved as well. These
envelopes are planning volumes; they do not appear as fabricated spacecraft
solids in the physical inventory.

`serviceSweepVolumes` exposes those reservations to the ordinary electrical
planner and the final fluid replan. `snapshotRoutes()` supplies the actual tube
buffers, endpoint identities, section lengths and motion spans to the combined
flight gate. The fixed and moving connector shells keep independent local bore
datums, so moving a plug cannot move an opening in a fixed receptacle.

The publication gate separately requires actual-buffer static clearance,
endpoint closure, section inventory, bend and length checks, and conservative
continuous certificates for deployment, enabled operational motion and mating.
A successful design proposal or a finite set of poses is not a completed flight
certificate. The machine-readable gate report is the authority for which
configurations and motion domains have passed.
