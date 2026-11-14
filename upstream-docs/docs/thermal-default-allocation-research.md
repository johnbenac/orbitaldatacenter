# Thermal study allocation research

Prepared for the Orbital Data Center Lab thermal-default repair, 8 November 2026.

## Purpose and disposition

A part offered a thermal prediction needs a complete, traceable starting case. Unknown procurement or qualification evidence should not prevent a project from making a bounded engineering allocation. The allocation must remain visibly distinct from a supplier rating, an approved physical test procedure, measured evidence, and verification closure.

The recommendations below are project study allocations. Manufacturer examples constrain or inform them where appropriate; an ambient air specification does not become a vacuum case-temperature qualification by copying its numbers. Parent-assembly temperature context also does not, by itself, establish an independent child-part rating.

Keep four statuses separate:

1. Prediction readiness: the numerical model, targets and boundary history are complete.
2. Supplier capability: the exact configuration, measurement boundary and supporting vendor evidence.
3. Physical test readiness: the identified article, approved procedure, calibrated instrumentation, safety limits and facility configuration.
4. Verification completion: reviewed evidence establishes compliance with the allocated requirement.

Completing a synthetic dwell advances none of the last three statuses automatically.

## WBS 01.04: payload network fabric and host interfaces

The equipment-list reference is NVIDIA Quantum-2 QM9700, order code MQM9700-NS2F. The official QM97xx hardware manual identifies the forward-airflow ordering configuration and specifies operating ambient 0 to 35 °C for forward airflow; reverse-airflow versions have a different 0 to 40 °C ambient range. The nonoperating specification is −40 to 70 °C.

For this study, use an operating article allocation of **0 to 35 °C (273.15 to 308.15 K)** and a nonoperating allocation of **−40 to 70 °C (233.15 to 343.15 K)**, while labeling the allocation as a conservative controlled-article inference from the air-cooled reference. It does not establish that the commercial switch operates in vacuum, that its enclosure may be maintained anywhere in this band at full load, or that its semiconductor junctions share this limit.

The development-case additional test margin can be explicitly allocated as 0 K. That is a stated development choice, not a qualification margin or missing value. The target is the article boundary; the shroud/fixture command is a separate quantity. The powered hot command will usually be colder than the article target because heat must flow through finite mounting and radiation paths.

Sources:

- [NVIDIA QM97xx hardware user manual](https://networking-docs.nvidia.com/qm97x0hw)
- [NVIDIA QM97xx specifications](https://networking-docs.nvidia.com/qm97x0hw/specifications)

## Reference-specific temperature evidence

These examples must be selected by the actual catalog/reference variant. Do not use a convenient family brochure as evidence that every configuration has the same qualification.

| Reference | Published context | Bounded study use and limitation |
| --- | --- | --- |
| HPE ProLiant DL360 Gen10 | Operating inlet 10 to 35 °C; nonoperating −30 to 60 °C; operating temperature-change limit 20 °C/hour | Use 10 to 35 °C as an inlet-informed project article allocation, not a supplier case rating. A 0.25 K/min development boundary ramp is below the cited 20 °C/hour change rate, but article rate still needs assessment. |
| HPE Edgeline EL4000 | Standard operating range 10 to 35 °C; higher-temperature support is configuration dependent | Do not adopt an extended 55 °C headline for all installed options without configuration evidence. |
| NVIDIA DGX H100/H200 | Ambient operating range 5 to 30 °C | This supports an ambient-informed allocation, not GPU-junction temperature. A proposed −20 to 60 °C survival study band is project judgment; the cited operating source does not establish that storage rating. |
| Micron 7450 NVMe SSD | Commercial operating temperature 0 to 70 °C | A 0 to 60 °C project operating allocation retains 10 K below the cited upper value. Proposed −20 to 70 °C survival is a project allocation; a nonoperating supplier rating was not established in this review. Confirm which product temperature sensor/boundary the selected configuration uses. |
| Airbus CMG 75-75S | Operating −20 to 40 °C; storage −30 to 60 °C; startup −25 °C | These belong to this CMG model. Preserve the startup distinction; do not substitute CMG 15-45 numbers. |
| Airbus CMG 15-45 | Mechanism qualification −20 to 55 °C; electronics qualification −25 to 60 °C | A narrower proposed mechanism operating band −10 to 45 °C and survival −20 to 55 °C are project choices informed by, but not identical to, the separate qualification envelopes. No CMG 15 storage rating was established by this source. |
| Sodern HYDRA family, 2025 brochure | Operating −30 to 60 °C; storage −40 to 70 °C | A proposed −20 to 50 °C operating allocation leaves 10 K inside the cited range. The family/version must match; an earlier HYDRA Access brochure has a different upper operating value. This evidence does not qualify other optical sensors. |
| Moog Type 2 solar-array drive assembly | Operating −50 to 80 °C | A proposed −40 to 70 °C operating allocation is conservative within that range. A proposed −50 to 80 °C survival envelope remains a project study assumption unless nonoperating evidence supports it. Other Moog drive variants have different envelopes. |
| Historical Hubble flexible solar array, NASA TM-108373 | Approximately −100 to 100 °C orbital thermal cycling | This is an application analogy for an exposed flexible array. It does not qualify iROSA, the current study blanket, or any present supplier cell/interconnect configuration. ±120 °C survival is extra project judgment. |

### Manufacturer and mission sources

- [HPE DL360 Gen10 environmental specifications](https://support.hpe.com/hpesc/public/docDisplay?docId=a00115362en_us&docLocale=en_US&page=GUID-F3AAB60A-8A77-40E2-8DB6-B4D1B52ABFB9.html)
- [NVIDIA DGX H100/H200 introduction and system specifications](https://docs.nvidia.com/dgx/dgxh100-user-guide/introduction-to-dgxh100.html)
- [Micron 7450 technical product specification](https://www.micron.com/content/dam/micron/global/public/documents/products/technical-marketing-brief/7450-nvme-ssd-tech-prod-spec.pdf)
- [Micron 7450 official part catalog example](https://www.micron.com/products/storage/ssd/data-center-ssd/7450-ssd/part-catalog/part-detail/mtfdkcc15t3tfr-1bc15abyy)
- [Airbus CMG 75-75S, 2022](https://www.airbus.com/sites/g/files/jlcbta136/files/2022-10/AVIONICS-CMG75-75S-v7_2022.pdf)
- [Airbus CMG 15-45, 2022](https://www.airbus.com/sites/g/files/jlcbta136/files/2022-02/AVIONICS-CMG15-45-v5-2022.pdf)
- [Sodern HYDRA family, 2025](https://sodern.com/wp-content/uploads/2025/02/HYDRA_FAMILY.pdf)
- [Moog Type 2 solar-array drive assembly](https://www.moog.com/content/dam/moog/literature/sdg/space/spacecraft-mechanisms/moog-type-2-solar-array-drive-assembly-datasheet.pdf)
- [Moog Integrated Avionics Unit](https://www.moog.com/content/dam/moog/literature/sdg/space/avionics/moog-integrated-avionics-unit-datasheet.pdf)
- [NASA TM-108373 solar-array thermal-cycle study](https://ntrs.nasa.gov/citations/19930001621)

The Micron PDF endpoint did not provide a fully inspectable nonoperating specification during this research. The operating commercial range was supported by official indexed material. Do not claim a storage rating on that basis.

## Bounded fallback families

The following are engineering starting allocations, not generic manufacturer capability claims and not numerical limits mandated by GEVS. The implemented allocation registry is the controlled record of the selected bands; these ranges document the reasoning space reviewed.

| Family | Proposed operating study band, °C | Proposed nonoperating study band, °C | Rationale and tailoring |
| --- | ---: | ---: | --- |
| Protected avionics, PCDU and active communications | −20 to 50 | −30 to 60, or explicitly allocated −40 to 70 | Controlled enclosure/interface environment. Apply actual selected supplier and installation restrictions when available. |
| Dry passive structure and brackets | −40 to 80 | −50 to 90, or explicitly allocated −60 to 100 | A bounded structural coupon/segment study. Stress, CTE mismatch, adhesives and composite glass-transition limits require separate analysis and evidence. |
| Indoor GSE | 10 to 35, or allocated 5 to 40 | −20 to 60 | Controlled facility exposure. This does not establish a whole-building HVAC model or the temperature capability of every internal device. |
| Outdoor GSE and site equipment | −20 to 50 | −30 to 60, or allocated −40 to 70 | A representative exterior/interface article. Local solar load, shelter, humidity, ingress and actual site climate need separate treatment. |
| Contained storable propellant | 5 to 40 | 0 to 50 | Keep a moderate liquid-phase study envelope. Use composition-specific fluid data and a container/interface model; do not expose the fluid directly to chamber vacuum in the radiation network. |
| Exposed solar blanket | −100 to 100 | −120 to 120 | Historical application analogy only; distinguish cell, adhesive, blanket, interconnect and deployment mechanism allocations. |
| Mechanism informed by Type 2 SADA | −40 to 70 | −50 to 80 | Conservative operating inference for the reference mechanism. Lubrication, startup torque and life are not verified by a thermal trace. |

Battery limits, pumped-fluid limits, compute-junction limits, and high-temperature heat-lift/radiator designs need their own existing design-dependent allocations. Do not replace these with a universal −40/+85 °C default. Flowing an owning hardware band down to a child is an explicit project allocation with a defined boundary, not a discovery of that child's supplier rating.

Large launcher, site and facility records may need a declared representative segment rather than a lumped model of the entire displayed object. Thin finishes may need a specified substrate coupon. Show that scope beside both the plan and the result.

## GEVS: what the standard supports

[GSFC-STD-7000B, General Environmental Verification Standard](https://standards.nasa.gov/sites/default/files/standards/GSFC/B/0/gsfc-std-7000b_signature_cycle_04_28_2021_fixed_links.pdf) provides a framework for environmental verification, tailoring and traceability. Its temperature-verification provisions distinguish allowable article temperatures from predicted mission environments and chamber conditions. The commonly applicable protoflight thermal-vacuum margin is at least 10 K beyond allowable flight temperatures above 120 K, with specific tailoring provisions. Physical thermal-vacuum pressure is addressed separately; the cited criterion is below 1.33 × 10⁻³ Pa.

The standard does not supply a universal temperature rating for every part in this catalog. It also does not turn a two-cycle, 30-minute development simulation into a qualification or acceptance test. Changing a UI approach label must not silently invent a new approved margin, cycle count or procedure.

For the study implementation:

- Allocate development margin explicitly, including 0 K where justified.
- Keep each article's target and allowable boundary separate from the commanded shroud/fixture temperatures.
- Require the modeled article to attain its target, stabilize over the stated window and complete continuous dwell.
- Preserve failed or incomplete dwells instead of adjusting the result to imply success.
- Treat measured temperatures, calibrated sensor uncertainty and functional checks as future evidence, not simulated facts.

[Official NASA standard landing page](https://standards.nasa.gov/standard/gsfc/gsfc-std-7000)

## Local thermal-model properties

A complete numerical model also needs capacitance, dissipation, area, emissivity, absorptivity, mounting conductance and fixture conditions. Visual PBR materials are not thermal property measurements.

For a lumped article, thermal capacitance is mass times equivalent specific heat. A composite electronics assembly needs an explicitly approximate effective specific heat; a pure-material source does not establish the exact assembly value. Constant near-ambient heat capacities are study approximations over broad temperature excursions.

| Material / approximation | Near-ambient study value, J/(kg·K) | Primary basis and limits |
| --- | ---: | --- |
| Aluminum | ~900 | NIST solid heat capacity near 300 K; alloy and temperature variation remain approximations. |
| Copper | ~385 | NIST molar heat capacity divided by molar mass. |
| Titanium | ~527; rounded 520 may be used as a stated study approximation | NIST solid near-ambient value. |
| 304 stainless steel | ~500 | NIST 304 correlation near 300 K; the cited fit's temperature domain must not be presented as validating a broad extrapolation. |
| Kapton HN | ~1090 | DuPont material data; not an effective specific heat for an entire multilayer insulation blanket. |
| Helium in a rigid closed vessel | ~3116 | Use constant-volume specific heat, derived from ideal-gas molar cp minus R; ~5193 is cp and is not the rigid closed-vessel energy coefficient. |
| Monomethylhydrazine | ~2931; a rounded 2900 estimate may be used | NOAA/USCG reference gives .700 Btu/(lb·°F) near 70 °F. |
| Nitrogen tetroxide | ~1537 | NOAA/USCG reference gives .367 Btu/(lb·°F) near room temperature. MON composition needs a stated mixture approximation. |
| Aerozine 50 | ~2900 as a mixture estimate | Equal-mass hydrazine/UDMH approximation from component data, not an MMH measurement. |

Primary property references:

- [NIST aluminum](https://webbook.nist.gov/cgi/cbook.cgi?ID=C7429905&Table=on&Type=JANAFS)
- [NIST copper](https://webbook.nist.gov/cgi/cbook.cgi?ID=C7440508&Mask=2&Type=JANAFS&Table=on)
- [NIST titanium](https://webbook.nist.gov/cgi/cbook.cgi?ID=C7440326&Mask=2&Type=JANAFS&Table=on)
- [NIST 304 stainless steel](https://trc.nist.gov/cryogenics/materials/304Stainless/304Stainless_rev.htm)
- [DuPont Kapton HN](https://www.dupont.com/content/dam/dupont/amer/us/en/ei-transformation/public/documents/en/EI-10206-Kapton-HN-Data-Sheet.pdf)
- [NIST/JANAF helium](https://janaf.nist.gov/tables/He-001.html)
- [NOAA/USCG monomethylhydrazine](https://cameochemicals.noaa.gov/chris/MHZ.pdf)
- [NOAA/USCG nitrogen tetroxide](https://cameochemicals.noaa.gov/chris/NOX.pdf)
- [NOAA/USCG hydrazine](https://cameochemicals.noaa.gov/chris/HDZ.pdf)
- [NOAA/USCG unsymmetrical dimethylhydrazine](https://cameochemicals.noaa.gov/chris/DMH.pdf)

For a contained fluid, set the fluid's direct exposed radiation area to zero and transport heat through the modeled mounting/container interface. That simplified model does not predict phase change, ullage pressure, slosh, venting or detailed tank-wall gradients. Container/interface capacity must remain identified as an approximation unless actual vessel dry mass and material data are used.

## Contact paths and test correlation

[NASA Passive Thermal Control Engineering Guidebook, version 5.1](https://ntrs.nasa.gov/api/citations/20220006584/downloads/NASAPassiveThermalGuidebookv5%201Public.pdf?attachment=true), §4.2.4.1, discusses a broad contact-conductance range of about 10 to 5000 W/(m²·K), with a representative metal contact value around 250 W/(m²·K). Actual conductance depends on contact area, finish, preload, interface materials and environment. These are sensitivity-study inputs, not a reason to assign one universal W/K value to all hardware.

Use a declared contact area when converting an areal coefficient into conductance. For a two-store model with article-to-interface G1 and interface-to-fixture G2, steady series conductance is G1·G2/(G1+G2). Deriving a provisional chamber command by balancing heat against this path and radiation is a planning operation; the transient must still reach the target and establish dwell independently.

The guidebook's test/model guidance also supports retaining test configuration, electrical loads, boundary conditions and sensor data for correlation. A correlation tolerance from a particular mission example must not be advertised as a universal acceptance criterion.

## Numerical checks and limitations

The retained run should include configuration, model, plan and case identities; source IDs; parameter allocations; node/fixture scope; energy-balance diagnostics; integration step; plot sampling; target/dwell outcomes; and refinement results.

A half-step comparison at equal global elapsed time can include schedule drift when stabilization determines stage duration. Keep that diagnostic and its status. A separate same-stage, same-elapsed-time response comparison helps distinguish thermal-response error from event timing. Report stage-duration and end-time differences independently; do not use stage alignment to hide a global-time failure or different plateau-completion outcome.

Runnable defaults establish a defensible starting analysis, not hardware compliance. The model must continue to reveal unreachable targets, poor coupling, overtemperature, missing supplier evidence and numerical sensitivity.

