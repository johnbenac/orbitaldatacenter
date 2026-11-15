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
