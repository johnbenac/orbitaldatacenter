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
