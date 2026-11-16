design.js exports defaults (flat editable input object); controls (array of {key,label,unit,min,max,step,group} or {key,label,group,options:{id:label}}); presets (category -> id -> {label,...}); applyPreset(input,key,id) -> new input; sizeDesign(input=defaults) -> sized hardware object h; inverseSolve(input,mode) -> {input,hardware,achieved,target,unit,margin,feasible,binding,mode}; checks() -> [{name,expected,actual,unit,pass}]; sources -> [{name,url,note}]; assumptions -> [{name,equation,note}].
Sizing h includes input (normalized flat d), trays, itKw, idleKw, solarM2, radiatorM2, batteryKWh, storageTB, usableTB, weightsTB, initialQueueGB, tokensPerSec, prefillPerSec, perUserTps, sessions, memoryGB, modelGB, kvGB, ttfSeconds, diskReadGBs, diskWriteGBs, storageKw, pumpKw, propellantKg, dryKg, wetKg, launchKg, massMarginKg, massLedger:[{id,label,kg,group}], bodyLengthM, bodyWidthM, bodyHeightM, wingLengthM, wingWidthM, radiatorLengthM,radiatorWidthM, tankVolumeL, fuelKg, oxidizerKg, launcherLabel. Architecture 4 PV wings + 2 radiator banks (2 faces), 1 gimbaled Ka reflector, optical + two S patches, 4 CMGs, 2 propellant tanks, 2 pressure-fed engines.
Core d fields: epoch (ISO UTC), altitudeKm (semi-major axis minus Earth radius), ecc, inclinationDeg,raanDeg,argPeriDeg,meanAnomalyDeg, missionYears, trayCount, solarM2,radiatorM2,batteryKWh,storageTB,propellantKg, launchAllowanceKg, pvEfficiency,pvRetention,batteryRetention,emissivity,emissivityRetention,absorptivity,alphaGrowth,chargeEff,dischargeEff,socMin,socMax,socInitial,chargeC,dischargeC,isp,thrustN (total),mixtureRatio,fuelDensity,oxidizerDensity (kg/L),reserveFraction,residualFraction,trimDv, duty,solarTiltDeg,rollDeg,attitude,cmgMomentumNms,cmgTorqueNm,dipoleAm2,cpOffsetM,cd,network,link,bulkMbps,bytesPerToken,kaDishM,opticalApertureM,elevationDeg, yearsSupply,thermalMode,appliedHeatKw, junctionLimitK,thermalResistanceKPerKw,solarCyclePhase,ap. Defaults approx 12 trays x 2 kW, 190 m² PV, 65 m² radiator, 40 kWh, 8 TB, 450 kg propellant, 550 km. Sizing mode driven by explicit inverseSolve, so sizeDesign always honors the input's installed quantities.
Implementation available. New exports estimateLife(h,horizon=30), solveModes (mode -> string), sizingEnvelope(h,years), enumeratePresets(input,key) showing all options and each margin. Use all cases to enable user-selected inverse modes and solve targets. Controls group strings as supplied by registry. checks() returns 28 numerical records grouped 1–9. `estimateLife` and `inverseSolve('lifetime')` are reduced-order sizing-envelope estimates (not flight certification); refer to assumptions and model notes. Defaults: 12 two-chip 2 kW trays, 24 kW, 190 m² array, 65 m² radiator, 40 kWh, 8 TB raw storage, 450 kg propellant.

## Launch vehicle catalogue

The launch vehicle domain covers ten configurations in eight families. Each catalogue record keeps the provider, recovery mode, dated programme status, LEO payload benchmark and available orbit conditions alongside its source. The two-stage Long March 9 study preserves its January 2023 assumptions. Provider interface data and explicitly modeled fairing profiles are identified separately.

Changing the carrier keeps the mission-specific payload allowance and selects the new carrier’s reference profile. The model screens launched stack mass against both the allowance and the LEO reference, then evaluates the actual folded stack against the tapered keep-in. A positive reference margin does not calculate orbit-specific launch performance. The separate insertion workspace follows the payload stack and spacecraft trim. The shared 540 s ascent-to-release interval is an illustrative mission timeline.

Run `node launch-fleet-checks.mjs` for the independent mass screens, option persistence, cross-fleet fit comparison, source records, and phase-specific selection controls.
<!-- These preliminary design notes remain open to ongoing review. -->

## Protected-core solar electrical collectors

Each solar root has a complete electrical cassette inboard of its wound blanket and mechanical
bearing. The stationary case and brushes attach to the body; the copper contacts and dielectric
carrier rotate with the wing. Contact count determines the bay length, with 12 mm allocated
material clearance at the bearing and body pedestal. This clearance is a design dimension.

Four separate MEL assemblies, WBS 07.08.01–04, own the cassette and added hollow support
extensions. The same material pieces supply rendered geometry, mass, center of gravity and
inertia. Their stations enter the tank and engine alignment calculation before installation.
Existing bearing and launch-lock rods retain their lengths, and body connector datums stay fixed.

Run `node protected-solar-collector-checks.mjs` for the bounded material, motion, mass and
thrust-alignment checks. Run `ODC_AUDIT_ONLY=pathfinder node deployment-checks.mjs` for the
2,401-pose Pathfinder deployment sweep. These are preliminary geometric checks; they do not
establish continuous-motion clearance or structural qualification.

## SpaceX reference harness installation

`starmind-ai1` is the project's preliminary SpaceX reference, with 128 compute trays in the
central body. Its equipment harnesses are body-fixed; no payload electrical cut crosses a
radiator hinge. This is a project installation proposal, not a provider's internal wiring design.

The PCDU's right-hand payload bank is grouped by rack column and bay. Empty positions in
partially populated bays remain within their own bank row. The 128 feeds descend in the aft
equipment bay and use coordinated transverse lanes below the rack. Four longitudinal trunks
serve staggered risers beside each bay. Full cable diameters, individual endpoints and prescribed
bend radii are retained. Service and pump outlets occupy the opposite PCDU face.

The complete paths are reserved before fluid and unrelated electrical routing. Their installation
has 26 raceways: a source ladder, a broad floor-supported fanout, four under-rack trunks and twenty
bay risers. Rails, rungs, retention bridges, mounting feet and stands are real material in the
scene and MEL. The broad fanout has intermediate floor supports; narrow risers fit the equipment
service aisles. Attachment and neighboring-material checks accompany cable clearance checks.

The second radiator loop's supply fitting moves 40 mm outboard and 300 mm forward,
beyond the transverse payload ribbon. The actual 68 mm floor hole, sleeve and connected
internal/external pipe sections use the same station. The pipe retains its 108 mm bends and
still undergoes ordinary fluid-planning checks against the current installation.

The reviewed configuration is the 128-tray reference. Changed geometry retains its own reported
fit and bend findings; it does not borrow acceptance from this configuration. The physical
construction cache is limited to four exact layouts and returns independent copies. Current
spacecraft solids, fluid routes, foreign terminals and installed acceptance are always rechecked.

Payload connector withdrawal requires releasing the retainers. That service sequence is not
modeled in this preliminary installation. The inspector keeps those plugs seated and explains
the restriction, including when a nominal mating animation would otherwise be offered. The real
45 mm connector travel and backshell reservations remain in the model. Service assessment is
unassessed, while any actual static routing failure remains a failure; cable mass is retained in
both cases. The detailed service and motion checks are not converted into passes.

Each solar root has an inboard electrical cassette and a physical rotating drive connected to
the original root crossbar. Both assemblies retain 18 contact tracks, the fixed collector rail,
and the original bearing and launch-lock rods. Added hollow extensions provide the cassette
bay. The slightly shorter, wider blankets preserve the reference's 75 m deployed span and
840 m² photovoltaic area. The shared schedule owns the visible material, mass, CG and inertia.

### Individual harness accounting

The MEL contains 470 external harness assemblies, comprising 496 physical cable cuts, plus
18 individually listed embedded solar source-lead pairs. Those 36 embedded conductor lengths
retain the existing allocation of 0.60 times blanket length per conductor and remain explicitly
model-estimated. Their copper and jacket material belongs to the moving solar-wing parent,
separately from its cell/substrate allocation. No additional external connectors are charged
to those internal leads. The combined register contains 488 individual harness entries.

External cable and termination mass replaces the former parent allowances without scaling it
back to those allowances. Every physical cut is counted, including both separately routed
polarities. Installation hardware is additional, with hollow cable space excluded from its
material mass. The ledger, MEL, CG, inertia and launch mass use the same quantities. The
constructed payload paths already set their own model cut lengths, with the existing
0.30 m termination allowance and no invented 15% detour. A complete native takeoff refines the
remaining model lengths; incomplete or stale inventories cannot replace them.
Measured positive cable length still carries mass when its bend or planning check fails, and
that failed geometric evidence remains visible rather than crashing the scene or becoming a pass.

Array and payload I²R use the current individual loop resistances when circuit quantities,
current allocation and endpoint topology match the existing equal-load runtime model. Array
resistance retains its embedded wing-lead allowance once. Primary distribution and mixed-voltage
service/pump paths keep their existing aggregate estimates; the detailed battery-to-PCDU cuts
are not substituted for a different distribution topology. Peak payload/bus demand and battery
branch checks follow the refreshed losses. Installed converters, contacts and conductor gauges
stay fixed, so insufficient ratings remain reported shortfalls.

### Bounded verification and ongoing review

`design-test.mjs` runs the bounded Starmind checks below in separate Node processes. This keeps
synthetic accounting fixtures out of other models and follows PR #10's bounded fast-gate pattern.

- `starmind-harness-installation-checks.mjs`: all 128 complete payload paths against actual
  support material, floor/ceiling attachments, retention spans and physical negative controls.
- `starmind-payload-routing-checks.mjs`: all physical endpoints, bends, individual cut lengths,
  interline clearance, inner-body placement, reservation ownership and obstruction rejection.
- `starmind-mounted-service-checks.mjs`: seated physical plugs, unchanged travel requirements,
  explicit unassessed status and rejection of both direct and nominal withdrawal animation.
- `starmind-battery-aisle-checks.mjs`: three guarded battery-aisle proposals, full bends,
  real connector straights, mutual clearance and obstruction rejection.
- `starmind-interior-route-checks.mjs`: the relocated service feed and three worker leads,
  complete body containment, terminal straights, full bends and ordinary obstruction rejection.
- `starmind-fluid-accommodation-checks.mjs`: the real relocated floor aperture and sleeve,
  three connected pipe sections, all payload paths/supports and blocked-aperture negatives.
- `starmind-solar-collector-checks.mjs`: 77 selected deployment/release/tracking poses, complete
  material ownership, retained rods and contacts, cassette clearance and drive attachments.
- `starmind-harness-mass-checks.mjs`: every external and embedded MEL entry, parent closure,
  serialization, failed-geometry evidence, actual-length loss/demand response and fixed ratings.

These checks address the changed preliminary installation. The complete native route planner
and detailed motion validators retain their own results; the mounted payload checks are not
an acceptance of every other vehicle cable or continuous mechanism motion. The existing thermal
flow shortfall is unchanged by this harness work. The website remains a living preliminary
design open to review, with no formal PDR closure asserted.


## Star Catcher reference harness installation

`star-catcher-self-powered` is the project's self-powered, heat-lift reference based on the
Star Catcher analytical study. Its 128 compute trays are inside the central body. The installed
wiring and service-bay arrangement are workbench allocations, not supplier flight drawings.

The payload bank is grouped by the actual three rack columns and seven longitudinal bays.
All 128 feeds have individual connector endpoints and complete full-radius paths. The
source ladder and transverse fanout feed three under-rack trunks and staggered bay risers.
The payload raceways contain explicit rails, rungs, retaining bridges, mounting feet and
stands. The same schedule supplies the visible geometry and material mass.

Power, data and service wiring use the body equipment aisles and installed network corridors.
The data installation combines a shared roof fan with source-drop, rack-entry and lower-aisle
frames. Battery, collector, compressor, control and RF wiring have finite support sections for
their long runs. Short seated connector approaches and bends connect those retained sections.
Where one support crosses another, mounting feet attach to the existing rail or the finite
members end at a shared support. Overlapping material is not counted as two independent parts.
The radio floor installation, for example, mounts on actual payload rails where a new floor
post would otherwise pass through them. Existing roof and bulkhead material closes selected
trays only at its real surface; no duplicate plate or invisible restraint is added.

The default installation has 108 support sections: 24 payload sections and 84 shared power,
data and service sections. Their 4,063 finite material pieces and purchased-fastener allowances
add 95.718 kg to the vehicle. All 76 connected material groups have geometric load paths to
441 actual shell, floor, roof or bulkhead attachment roots. Shared feet must touch the declared
parent's real material, and that parent must itself connect to structure. Disconnected rail
remnants are removed from both the model and its mass rather than retained as floating parts.

The complete cable radius must fit within an actual keeper interior to count as retained.
The preliminary allocation permits up to 0.85 m of continuous connector or bend transition
between retained sections; the default layout's longest is 0.796 m. These geometric checks
establish installation coverage, while attachment loads and vibration remain qualification
work beyond this preliminary model. Removing a real roof or RF support fails the coverage
check even if other records claim to support those same routes. Actual keeper and end spacing
must also match the retention allocation; an empty keeper tail cannot count as retained space.

The solar roots terminate on stationary electrical collectors; external equipment cables do
not follow the rotating blanket. The four complete cassettes retain 18 contact tracks each.
The two starboard PCDU banks turn toward the aft service bay, separating the power fanout
from the forward data corridors. Their nested tail order matches that direction; each
polarity pair and the original collector circuit assignments and positions are retained. Added
hollow support extensions and rotor drives move the electrical material clear of the wound
blankets while retaining the original bearing and restraint rods. The allocated
photovoltaic area remains 1,100 square metres. The resulting deployed envelope is an explicit
preliminary design consequence of accommodating the collector hardware.

The aft starboard PCDU bank turns 100 mm closer to the enclosure, clearing the actual recorder
stack. Its shortest transverse reach remains 190 mm: a full 135 mm bend plus a 55 mm straight
at the seated plug, exceeding the 45 mm mating stroke. The other right-hand bank reaches
200 mm farther out below the recorder, giving the two return banks separate transverse bands.
Both banks turn forward of the actual equipment bulkhead. The recorder and conductor sizes
retain their allocated positions and dimensions; the cable paths change to fit the hardware.
The limiting aft tail retains 48.6 mm of straight cable beyond its full-radius bend, clearing
the allocated 45 mm connector stroke. The roof fan also remains aft of the Ka terminal case.

The heat-pump assembly occupies the upper forward service bay, ahead of the compute rack,
with four real roof attachments. Its primary and control connectors belong to the actual
motor-drive face. Cold evaporator links connect to the compute circuit; separate hot manifold
ports connect to the two radiator loops. The complete 625 kg package is counted once at its
installed station, with the remaining rotary hardware at its existing allocation. Its COP,
capacity and fluid-selection assumptions retain their original analytical limits.

The second radiator return uses a relocated 68 mm floor aperture and sleeve at x = −0.34 m.
Its connected internal pipe, bulkhead passage and external union feed use that same physical
station. The 108 mm pipe bends and full material radii are retained. Ka and optical stationary
connectors are inside the body, connected through actual hollow roof necks and pedestals.
The GNSS lead enters through its own roof passage. No free cable loop follows a pointing head.

### Individual cuts and vehicle accounting

The reference has 490 external harness assemblies comprising 537 physical cuts, plus 36
individually listed embedded solar source-lead pairs. The resulting MEL has 526 individual
harness entries. The embedded 72 conductors keep the explicit allocation of 0.60 times blanket
length per conductor; they belong to the moving solar wings and do not acquire duplicate
external connectors. They remain model estimates rather than measured body routes.

Every external cut, termination and installation part carries its calculated material mass.
The native construction compiler also emits a separate complete 537-cut takeoff for sizing,
so the default model can adopt actual installed lengths before opening the scene. The takeoff
has exact design/interface identity and source provenance. Missing, duplicated or stale cuts
cannot silently replace the current inventory. A failed geometric assessment still carries
its measured positive cable length and mass; it does not become an accepted route.

The ledger, MEL, center of gravity, inertia and launch mass use the same inventory. Array,
payload and primary-voltage compressor-drive losses use the matching individual loop
resistances and the existing equal-load circuit model. Embedded array resistance is counted
once. Other distribution and mixed-voltage service estimates retain their original topology.
Installed gauges, contact ratings and converter counts remain fixed, so increased demand can
still expose a rating shortfall instead of silently resizing the spacecraft.

The compiled default contains 2,496.351 m of measured fixed centerline routing. Its external
cut inventory is 2,657.451 m including termination allowances. The shipped mass result is:

| Item | Mass (kg) | Basis |
| --- | ---: | --- |
| External cable material | 930.485 | Individual installed cuts |
| External terminations | 128.873 | Actual connector inventory |
| Embedded solar source leads | 1,420.876 | Explicit 72-conductor length allocation |
| All harnesses | 2,480.234 | External cuts plus embedded leads |
| Installation hardware | 163.748 | 95.718 kg of raceways plus 68.029 kg of collectors |
| Vehicle dry mass | 18,464.357 | Complete updated vehicle ledger |
| Vehicle launch mass | 21,103.419 | Complete updated launch ledger |

Dry and launch mass each increase by 812.218 kg from the preceding reference allocation.
The complete MEL reconciles with the vehicle ledger to numerical roundoff. The native default
admits all 537 fixed electrical cuts and all 25 fixed pipes with their full material radii;
all 273 retained data-route controls agree exactly with the compiled installation. These are
static installation results, with the qualification limits below still applying.

### Preliminary review and startup

The bounded Star Catcher checks cover payload endpoints, bends and material clearance,
physical attachments, the four collector installations at 77 selected movement poses,
terminal passages, the heat-pump installation, individual MEL accounting and runtime
construction reuse. They run through the existing fast regression suite. They do not claim
continuous-motion, fatigue, attachment-strength or connector-withdrawal qualification.
Mounted payload connectors stay seated until a retainer-release service sequence is modeled.

The browser uses a compact, losslessly packed native construction only for its matching
physical configuration. It verifies every stored electrical and fluid interface before use.
Known planner failures stay failures, and unassessed clearance/service states remain visible.
Loading the scene does not run a new route search or change an already sized vehicle's mass.
The site remains a living preliminary design with ongoing public review.
