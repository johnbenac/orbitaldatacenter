# Avionics, electrical interfaces and harness engineering basis

Research date: 8 November 2026. This note supplies implementable preliminary design allocations for the Orbital Data Center workbench. Supplier facts, project allocations, numerical predictions, and completed hardware verification are separate evidence classes. Selecting a real connector family is not a claim that a reference company's actual spacecraft uses it.

## 1. Domain partition and architectural responsibility

Retain domain 15 **Command & Data Handling**, with **Avionics and electrical interfaces** as its descriptive subtitle. Rename domain 05 **Payload Data Handling**. Keep 04 **Payload Operations** and 16 **Flight Software**. These are project workspaces, not a NASA-prescribed list of sixteen subsystems.

| Domain | Owns | Principal interfaces |
| --- | --- | --- |
| 04 Payload Operations | Workload admission, AI execution, model selection, customer latency and completion criteria | Payload compute; data staging; power/thermal availability; customer acceptance |
| 05 Payload Data Handling | Input custody, resident model inventory, payload fabric, working storage, checkpoint I/O, recorder queues, product handover | Compute hosts; storage; communications gateway; Earth receipt ledger |
| 15 Command & Data Handling | Flight computer, spacecraft commands, housekeeping, time, health/fault handling, engineering recorder, avionics I/O and electrical interface register | Every spacecraft subsystem; EGSE; launch interfaces; communications command/telemetry |
| 16 Flight Software | Software functions, scheduling, boot/recovery, command validation, state machines, software assurance and resource/timing evidence | C&DH hardware allocations and subsystem control interfaces |

NASA's [2026 Small Spacecraft Avionics chapter, §8.1](https://www.nasa.gov/smallsat-institute/sst-soa/small-spacecraft-avionics/) treats avionics as encompassing C&DH, flight software, and payload/subsystem avionics. Its description supports this functional partition; it does not dictate the workbench's exact numbering or payload workflow.

Electrical Power retains ownership of generation, battery storage, conversion, distribution and protection. C&DH owns the shared register that identifies what connects to what. A harness can therefore belong to EPS in the MEL while appearing in the C&DH electrical diagram. Do not count its mass twice.

### Card-level view

Use a functional card allocation for the modeled 12 kg/45 W avionics suite: input protection/DC conversion; flight SBC with boot memory and EDAC RAM; command/time/communications I/O; housekeeping ADC and discrete I/O; subsystem bus interfaces; engineering recorder. Show backplane power, internal data, external connectors, and which requirement belongs to each card. Clearly identify this as the workbench allocation, not an unpublished Moog schematic.

[NASA's LRO C&DH description](https://ntrs.nasa.gov/citations/20120007619) provides a useful implemented precedent: a backplane, low-voltage converter, SBC, communication-interface card, storage boards, housekeeping/DIO and ADC cards. Its mission-specific capacity is not a requirement for this study. The [Moog IAU datasheet](https://www.moog.com/content/dam/moog/literature/sdg/space/avionics/moog-integrated-avionics-unit-datasheet.pdf) supports a modular 3U C&DH/EPS reference, 28 V distribution, SpaceWire, 1553, Ethernet, RS-422/LVDS, discretes and analog/temperature inputs. It does not publish this workbench's pinout or a complete input-voltage tolerance.

## 2. Electrical allocations derived from the current model

At inspection, `dist/energy-system.js` defines these actual architecture values. Preserve them in interfaces rather than treating every line as 28 V:

| Architecture | Primary / payload / service | Solar operating range | Solar open-circuit limit |
| --- | --- | --- | --- |
| `reference120` | 120 / 48 / 28 V | 160–320 V | 360 V |
| `highPower400` | 400 / 48 / 28 V | 450–850 V | 900 V |

Existing primary feed allocation is 100 A; payload feeds are 50 A. Existing copper sizing uses 80°C resistivity of 2.10e−8 Ω·m, route length, current-density screening and voltage drop. The interface model should consume these results, identify the conductor/contact it selected, and reject a mismatch between conductor cross-section, contact barrel and allowable insulation diameter.

**Recommended complete preliminary defaults**—project allocations, not supplier guarantees:

| Interface | Initial allocation | Evidence/check |
| --- | --- | --- |
| Avionics service | Protected 28 V branch; modeled suite demand 45 W; operating envelope 25.2–30.8 V (±10%); 5 A branch rating | Power sweep and startup/inrush analysis. Nominal steady current 1.61 A; at 25.2 V, 1.79 A before separately modeled conversion losses. Supplier input acceptance still needs confirmation. |
| Payload power | 48 V nominal; 50 A per physical pair | Number of parallel circuits follows maximum modeled demand and derating; show the actual pair count and protection per branch. |
| C&DH network | SpaceWire, 100 Mb/s signaling after 10±1 Mb/s startup | Verify startup, routing, flow control, recovery and byte counters. 100 Mb/s signaling is at most 80 Mb/s normal-character payload before additional overhead. |
| Payload network | 100 GbE physical links for demands up to 100 Gb/s; 400 Gb/s optical branches above that, allocated per equipment | A 50 Gb/s workload allocation does not imply a particular transceiver supports native 50G. Track physical rate, demand, overhead and effective goodput separately. |
| Route model | Centreline from connector backshell to connector backshell; explicit bends and slack | Recompute electrical length and mass from that route; never infer length from a straight line through equipment. |
| Preliminary current margin | At most 50% of the cited contact continuous rating | This is a project screening choice. Wire ampacity, ambient/bundle heating, vacuum heat rejection, insertion resistance and connector temperature remain separate checks. |

For power-feed sizing, use `ceil(required current / allocated current per circuit)` and retain each feed/return pair. Do not multiply one rendered cable's current capacity by hidden circuits. An independently protected service branch remains operational when the payload branch trips; a numerical fault-isolation check should verify that assumption.

## 3. Real connector and cable selections

### 3.1 Low-voltage power: Glenair Series 970 PowerTrip

Use the [970-001 cable plug](https://www.glenair.com/powertrip/pdf/970-001.pdf) with the [970-003 square-flange receptacle](https://www.glenair.com/powertrip/pdf/970-003.pdf). Specify identical insert and key, opposite contact sex, ME electroless-nickel aluminum shells, P2/S2 gold contacts, and a selected backshell/strain clamp. The flange receptacle also needs N through-hole or T clinch-nut mounting. Store these supplier ordering fields individually; do not present a made-up project identifier as a supplier part number. Prefer socket contacts on the exposed powered source side, with the mating cable arrangement following it.

The [supplier insert/current table](https://www.glenair.com/powertrip/pdf/insert-arrangements-current-rating-wire-diagram-sealing-range.pdf) gives:

| Real insert | Contact arrangement | Environmental copper rating | At project 50% allocation |
| --- | --- | --- | --- |
| 18-2 | Two #8 | 60 A/contact | 30 A |
| 24-2 | Two #4 | 100 A/contact | 50 A |
| 32-2 | Two 1/0 | 175 A/contact | 87.5 A |
| 36-2 | Two 2/0 | 205 A/contact | 102.5 A |

Thus 24-2 serves a modeled 50 A payload pair; 36-2 can serve a 100 A primary pair within this current screen. Hermetic contact ratings differ. Size 2/0 insulation OD must fit 14.99–16.00 mm; #4 accepts 7.11–8.13 mm. A conductor selected only by copper area is insufficient.

The [space-flight modification note](https://www.glenair.com/powertrip/pdf/powertrip-connectors-for-space-flight.pdf) identifies material/finish restrictions, bakeout and screening options. A concrete preliminary procurement specification can request level-2 screening plus bakeout (`-429A`) with the selected materials. Neither this option nor the catalogue's 2000 VAC dielectric-withstand test proves the interface's working voltage in its mission environment.

For small service branches, do **not** invent a two-contact #16 PowerTrip insert. Use [Glenair SuperNine 233-205](https://www.glenair.com/supernine/environmental/pdf/233-205.pdf), G6 cable plug and 00 wall receptacle, ME finish, complementary P/S contacts, identical key, and actual 11-2 arrangement. The [manufacturer's arrangement table](https://www.glenair.com/supernine/reference/pdf/mil-std-1560-and-other-standard-contact-arrangements.pdf) specifies two #16 contacts, 13 A maximum, accepting AWG16–20. With the workbench's 3 A/mm² conductor screen, AWG16 permits 3.93 A, so branch splitting must honor this stricter limit even though 50% of the contact rating is 6.5 A. Select distinct keying for 28 V and 48 V branches. A complete service wiring selection also includes seals, backshell and the actual selected wire OD.

### 3.2 High voltage: distinguish candidate selection from application qualification

NASA-STD-8739.4A §7.2.6 addresses single-contact HV connectors for circuits above 200 VAC RMS or 300 VDC in environments supporting arcing. **The 360 V open-circuit solar allocation in `reference120` is included**, as are the 400 V primary and 900 V solar limits in `highPower400`.

Provide separate keyed feed/return single-pole connector objects for those paths. Two authentic candidates illustrate the trade:

| Candidate | Verified supplier information | Application limitation |
| --- | --- | --- |
| [Glenair PowerPlay 973](https://www.glenair.com/powerplay/supernine/series-iii/pdf/973-001-g6-plug.pdf) | `973-001-G6` cable plug and matching `973-001-00/D0/CS` receptacle families; single-pole 13-1 #4, 15-1 #2, 17-1 1/0. The 17-1 plug is up to 35.71 mm diameter and 53.34 mm long. | Published [DWV/partial-discharge tests](https://www.glenair.com/powerplay/pdf/performance-specifications-and-test-summary.pdf) are not a 900 V vacuum operating rating. Current requires application assessment. |
| [Amphenol Voltarius](https://www.amphenol-aerospace.com/resources/literature/view/voltarius-data-sheet.pdf) | Single-pole option; 1000 VDC at sea level; 250 A or 450 A contact/cable configurations; interlock option; real ordering fields VT, 02P/06R/09R, service class, poles, wire size, termination and key. | Sea-level rating does not establish launch-pressure/vacuum performance. Future 1700 VDC altitude capability is a development target, not today's rating. |

Keep numerical 900 V/100 A analyses runnable while the chosen candidate's flight application review is explicitly open. That is different from omitting a voltage or current. No reviewed public source establishes an off-the-shelf, vacuum-qualified 900 V/100 A pair with all relevant temperatures and pressure transitions for this study.

For the much lower current of individual solar/MPPT circuits, PowerPlay **11-1 has one #8 contact**, avoiding a needlessly large 1/0 conductor. Its seal accepts 5.31–7.04 mm wire jacket OD; the G6 plug is at most 24.99 mm in diameter and 43.69 mm long. The [matching 00 panel receptacle](https://www.glenair.com/powerplay/supernine/series-iii/pdf/973-001-00-d0-cs-panel-mount-receptacles.pdf) has a 26.49 mm maximum flange width and 40.64 mm maximum length. With the project conductor screen, AWG8 supports 25.11 A; that is a project allocation, not a claimed PowerPlay current rating. Keep feed and return separately keyed. The same supplier drawing gives the 17-1 wire-seal range as 12.34–14.53 mm.

Common 600 V wire is also insufficient for a 900 V allocation. [Gore's space HV cable family](https://kr.gore.com/system/files/2019-10/GORE%20Space%20Cables%20-%20Catalog%20%28Traditional%20Space%29_10-28-2019%20%28A4%20Electronic%29_0.pdf), p32, covers PTFE/ePTFE high-voltage constructions and solar-array applications. [Glenair 967-048 and 967-028](https://www.glenair.com/wire-and-cable/) are real 1000 V families, but 900 V is 90% of that rating and still needs an explicit derating decision. Procurement must specify gauge, insulation construction, temperature, pressure, bend/flex life and application voltage together.

### 3.3 SpaceWire control and engineering data

[Omnetics' SpaceWire assembly guide](https://www.omnetics.com/wp-content/uploads/2025/07/Spacewire.pdf) provides an actual orderable construction: JUM metal Micro-D pin-to-pin, eight signal conductors, WC cable, 26 AWG, ESCC cable, length in inches, electroless-nickel aluminum shell, captured jackscrews, Type A wiring and M53 level-2 space screening. Its documented example is `JUM-MMDP-MMDP-08-WC6X18.0-N01-AM50`; use the selected length/options rather than copying that example indiscriminately. The source also identifies characterized 1 m assembly `A115042-001`. Published operation extends to 400 Mb/s and −55 to +125°C; the workbench's 100 Mb/s is its chosen allocation.

[ECSS-E-ST-50-12C Rev.1](https://ecss.nl/wp-content/uploads/2019/05/ECSS-E-ST-50-12C-Rev.1%2815May2019%29.pdf), Table 5-7/Figure 5-4, supplies the signal mapping:

| Contact | Signal |
| --- | --- |
| 1 / 6 | Din+ / Din− |
| 2 / 7 | Sin+ / Sin− |
| 4 / 8 | Sout− / Sout+ |
| 5 / 9 | Dout− / Dout+ |
| 3 | Unconnected in the Type A cable; unit-side circuitry can connect its contact to circuit ground as specified by the standard |

Cable crossover is 1↔9, 6↔5, 2↔8 and 7↔4. Type A bonds inner and outer shields to connector shells. Do not substitute legacy Type AL pin-3 shield wiring for a new assembly. Signal definitions come from the standard; port destinations and command protocol come from the project ICD.

An alternative qualified-build cable reference is [Glenair 963-080-26](https://cdn.glenair.com/speedline/pdf/963-080-26.pdf): four 100±6 Ω shielded pairs, 26 AWG, FEP jacket, 6.05 mm maximum OD and 28.575 mm supplier minimum bend radius. Its polyimide is part of the pair shield construction; do not render every outside jacket as Kapton. A separate connector plus this cable does not automatically inherit an assembled cable's signal-integrity qualification.

### 3.4 AI payload fabric: two different optical interfaces

For a 100 GbE baseline, [NVIDIA MMA1B00-C100D](https://networking-docs.nvidia.com/mma1b00c100dspec) is a real QSFP28 SR4 device using four 25 Gb/s channels, MPO/UPC, 3.3 V and up to 2.5 W. [Corning AEN151](https://www.corning.com/content/dam/corning/catalog/coc/documents/application-engineering-notes/AEN151.pdf) specifies Type-B non-pinned MTP-to-MTP OM4 jumpers for direct 100GBASE-SR4 connections; the real family is `J757512QE8-NBxxxF`. Corning also lists the exact 3 m LSZH item `J757512QEZ-NB003M` in its [catalogue](https://ecatalog.corning.com/optical-communications/CALA/en/Fiber-Optic-Cable-Assemblies/Indoor-Cable-Assemblies/Multifiber-Indoor-Cable-Assemblies/12-Fiber-MTP%C2%AE-PRO-Jumper/p/12-fiber-mtp-jumper?variant=connector-type-a-mtp-non-pinned).

For 400 Gb/s branches, [NVIDIA MFP7E10-Nxxx](https://docs.nvidia.com/nvidia-mfp7e10-nxxx-optical-multimode-fiber-cable-product-specifications.pdf) is an authentic MPO12/APC multimode cable, female at both ends, Type-B crossover, eight active fibers, 3±0.2 mm OD and 30 mm minimum bend radius. Actual lengths include `MFP7E10-N003` and `-N005`. Its operating range is 0–70°C. Two 400G branches support the relevant twin-port 800G OSFP architecture; one branch is not 800G. APC and UPC interfaces must not be mated.

These optical products are terrestrial equipment references. Flight use needs retention, thermal conduction, radiation/outgassing and environmental verification. Cable length must be the selected manufactured length, with excess retained as routed slack, not a fictitious continuously variable catalogue product.

### 3.5 S-band and GNSS RF feeders

A concrete coax pair is [Amphenol RF 132100](https://www.amphenolrf.com/en-us/part/132100/705/) straight SMA cable plug and [132106](https://www.amphenolrf.com/en-us/part/132106/679/) bulkhead jack. Both are current 50 Ω, 18 GHz products with solder termination and PTFE insulation, listed for RG402, TFlex-402 and compatible conformable cable. Published unit masses are 2.06 g and 3.40 g. Their listed −65 to +165°C range does not make the assembled harness flight qualified; the catalogue explicitly says they are not military qualified. Eighteen GHz is adequate for these S-band/GNSS feeders, not the modeled 26 GHz Ka feed.

[Times Microwave TFlex-402](https://timesmicrowave.com/cables/tflex-402-coax-cables/) is an explicitly compatible flexible cable, with FEP jacket, nominal 4.064 mm OD, 0.0491 kg/m and 12.7 mm minimum bend. The [current brochure](https://timesmicrowave.com/wp-content/uploads/2024/04/tflex-brochure-web.pdf), pp6–7, provides a 4.19 mm maximum OD, so use 4.19 mm for route clearance. Its −65 to +125°C brochure range differs from the −55 to +125°C product page; use the conservative −55 to +125°C envelope until the supplier resolves the discrepancy. A project 10×OD static bend is 41.9 mm and exceeds the published minimum. The brochure's cable insertion loss per metre is `0.011844 × sqrt(f_MHz) + 0.000033 × f_MHz` dB, before connector loss; its end-to-end value remains a prediction until the finished assembly is measured.

### 3.6 Card capability precedents and project timing allocations

The [2025 BAE RAD750 3U CompactPCI data sheet](https://www.baesystems.com/en-us/dam/jcr:e2c04c2e-8dea-425c-8460-96a509a95111/16-f76-RAD750-3U-CompactPCI-datasheet-2025-web.2025-06-25-21-58-21.pdf) specifies 1 GB SDRAM, EDAC across the memories, 256 KB EEPROM or 64 KB PROM boot memory, 435 DMIPS at 198 MHz, 3.3 V ±5% input and 12.2 W at that clock. Its 100×160 mm card has approximately 550 g mass. The ODC 14 W processor allocation can use this as a capability comparator; the complete project's packaging and card interfaces remain its own allocation. Clock speed and benchmark throughput alone do not prove a control-loop deadline.

[NASA's Perseverance computer description](https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/) gives a separate real flight precedent: RAD750 up to 200 MHz, 256 MB DRAM, 2 GB flash and 256 KB EEPROM. Do not attribute these memory quantities to the current 1 GB BAE card. [Moog's IAU](https://www.moog.com/products/avionics/spacecraft-avionics/bus-avionics/Integrated-avionics-unit.html) provides the interface precedent for ±10 V analog inputs, AD590 and PRT/thermistor inputs, LVDS/RS-422, CMOS discretes and GPS receiver inputs. Its public page does not establish the number of channels, ADC resolution or sampling performance for this project.

Reasonable **project-selected** starting requirements are a 50 Hz flight executive (20 ms frame), 10 ms maximum allocated CPU execution per frame, 50% memory occupancy at PDR, 10 Hz navigation observations, 1 PPS time input and 1 ms correlation budget. An I/O card can begin with 32 analog channels at 12-bit resolution and 100 samples/s per channel, plus 32 discretes, provided the ICD explicitly allocates filtering, accuracy, multiplex timing, thresholds and fault containment. Those counts and timing choices are engineering allocations, not values quoted from NASA or Moog. Target-hardware WCET, memory peaks, timestamp accuracy and stimulated I/O response require measured verification.

## 4. Build records, routes and verification

A harness record should contain configuration/reference ID; source/load ports; connector family and ordering fields at each end; mated interface; contact/cavity and net mapping; return and shielding treatment; wire/fiber specification; route and physical length; service slack; supports; mass-accounting owner; limits; source provenance; applicable requirements; fabrication and acceptance plan; evidence state. A netlist is insufficient if it omits the mating halves and mechanical attachment.

[NASA-STD-8739.4A Change 4](https://standards.nasa.gov/sites/default/files/standards/NASA/A/4/nasa-std-87394a_w_change_4_0.pdf), §§7–8 and 18, supplies workmanship/routing/acceptance guidance. Relevant minimum bend multipliers are 3×OD for plain small-wire bundles, 6×OD where coax or AWG8-and-larger conductors are present, and 10×OD for polyimide-insulated constructions. Require strain relief, chafe protection, mismating prevention and route documentation. Before mating electronics, perform traceable harness continuity, dielectric-withstand and insulation-resistance tests using test adapters. Default DWV is 1050±50 VAC or 1500±75 VDC, limited by component ratings; IR uses 500+50/−0 VDC and must exceed 100 MΩ. Apply the standard's full procedure and its exclusions, not these values alone. Never apply harness hipot indiscriminately to connected electronics.

[NASA-STD-8739.5A Change 2](https://standards.nasa.gov/sites/default/files/standards/NASA/A/1/nasa-std-87395A-Change-2.pdf), §§11–12, governs optical workmanship. Specify short/long-term bend and tensile limits, keep fibers separately managed, inspect/clean end faces before mating, use dust caps, and avoid pinching ties. The standard recommends long-term radius at least 10×OD; use the more restrictive supplier/project value. Optical performance is measured, temperature-cycled, remeasured and inspected with retained records.

### Complete preliminary checks suitable for CI

These are project software checks, not certification tests:

1. Every physical interface resolves to two existing parts and two compatible, uniquely identified ports; every active net has an intended mate. Include all design references and configuration variants.
2. Contact occupancy, signal direction, polarity, allowed connector key and fiber polish agree. Reject source-to-source power joins and APC-to-UPC joins.
3. Every powered load has a supply, return and protection allocation. Current and voltage checks use the installed architecture and worst relevant case, including solar open circuit.
4. Conductor gauge fits its contact barrel and insulation seal. Every route has a length, OD, bend criterion and material definition. Optical paths retain transmit-to-receive mapping.
5. A proposed 3D tolerance of 2 mm checks displayed route endpoints against their backshell anchors. This is a visualization tolerance, not a manufacturing alignment tolerance. Validate local anchors after articulation; connector mating faces and backshell cable exits are different planes.
6. Route extrema are checked over the full deployment/articulation range, not just the initial frame. Dynamic flex loops have their own life requirement. A schematic intersection test alone cannot prove full solid-body clearance.
7. Requirements have criteria, methods, applicable modes/configurations, planned phase and evidence ownership. Simulated results are typed as predictions; imported hardware results need traceable article/procedure/calibration identifiers.

## 5. What GEVS contributes

The current NASA catalogue lists [GSFC-STD-7000B](https://standards.nasa.gov/standard/gsfc/gsfc-std-7000), with administrative extension through April 2027. The [official PDF](https://standards.nasa.gov/system/files/tmp/GSFC-STD-7000B_Approved_Admn%20Ext.pdf), §2.3, calls for interface tests before integration, harness checks before mating, comprehensive functional tests at each assembly level, and hot/cold testing at minimum/maximum input voltage. Limited performance tests bracket exposures. Section 2.5.2.5 covers integrated power quality, radiated emissions/susceptibility and system self-compatibility.

GEVS therefore informs **when and how the specified electrical functions are verified in environments**. The electrical ICD still supplies bus ranges, signal thresholds, timing, loads, grounding, connector pins and acceptable outputs. A chamber-door animation does not provide this evidence. Electrical checkout should display the applied voltage/temperature corner, stimulated input, expected response, measured or predicted output, tolerance and result origin.

### GOLD rule mapping checked against current Rev I

Use [GSFC-STD-1000I](https://standards.nasa.gov/system/files/tmp/GSFC-STD-1000RevI_Approved_0.pdf) rules 2.05 (grounding), 2.06 (fusing), 2.13 (connector mating), 2.22 (HV corona-region testing) and 2.25 (electrical interface verification), supported by 1.07 (polarity), 1.08 (end-to-end testing) and 1.44 (early interfaces). Rule **3.15 is reserved**. Rule 3.13 concerns preserving critical operational capability during updates, not a general electrical-interface requirement. Rule 2.25 addresses copper-path verification after final mating. Rule 2.22's >150 V HV-supply scope differs from the harness standard's >300 VDC connector criterion: if the HV supply is not tested through the corona region, venting/outgassing analysis establishes safe turn-on conditions.

## 6. Payload coherence, diagrams and mission phases

Recommended project data flow is Earth input → ingress gateway → staged dataset/model → host scheduler → accelerator memory/compute → retained checkpoint or output recorder → communications gateway → Earth receipt and customer acceptance. Accelerator collectives remain local fabric traffic. Checkpoints consume storage bandwidth/endurance without automatically becoming downlink products. Training rereads a retained corpus; inference consumes admitted requests. Engineering telemetry has a separate protected path and capacity from customer bulk products.

Use three linked views: an electrical block diagram across boxes, a functional card diagram within avionics, and the harness netlist/mating view for selected parts. Show voltage and physical data rate on links; flow animations need a legend and a statement that motion is illustrative, not measured propagation speed. Distinguish power, command/telemetry, customer input, collective traffic and returned products with line patterns as well as color.

| Phase | Workbench evidence and activity |
| --- | --- |
| A | Functional allocation, service modes, power/data budgets, topology trades and interface risks |
| B / PDR | Selected preliminary connectors/wire, explicit pin/net allocations, routing envelopes, voltage/signal requirements, derating analyses, verification matrix and planned facilities |
| C | Released harness drawings/BOM, interface and card definitions, assembly instructions, materials/screening requirements, tolerances and qualified procedures |
| D | Receiving inspection, fabrication records, continuity/isolation/optical tests, mate logs, fit checks, functional checkout, EMC and hot/cold voltage-corner evidence |
| E | Flight telemetry, link/error counters, isolation/recovery demonstrations, configuration history and comparison against prelaunch baselines |
| F | Commandability for disposal, retained power and telemetry, data custody/erasure decisions, final configuration and evidence archive |

These activities extend the existing `mission-policy.js` controlled baseline and the identity/provenance/criteria/plan/evidence pattern in `thermal-program.js`. Each design reference receives explicit instances. Reusable templates do not imply identical installed boxes, cable lengths or workload traffic.

## Retrieval index for implementation review

Primary source retrieval references are recorded for the coordinating agent; public UI citations should use the URLs above.

| Source | Retrieval reference |
| --- | --- |
| NASA Avionics 2026 | `turn4070018search1`, `turn8306818view1` |
| NASA LRO C&DH | `turn8306818view2` |
| Moog IAU | `turn8907786view1`, `turn2151733view4` |
| NASA harness standard | `turn1381918view3`, `turn4444428view4` |
| NASA fiber standard | `turn3697646view0`, `turn5148978view0` |
| GEVS status / PDF | `turn2151733search1`, `turn2151733search5`; PDF read directly, pp49 and 140 |
| PowerTrip insert/current | `turn1881913view0` |
| PowerTrip plug / receptacle | `turn1881913view1`, `turn1881913view2` |
| PowerTrip space options | `turn4444428view0` |
| SuperNine service connector / contact table | `turn2274843view0`, `turn3231282view1` |
| PowerPlay dimensions / tests | `turn4355450view1`, `turn4355450view0` |
| Voltarius official datasheet | `turn7063996view0` |
| ECSS SpaceWire | `turn8907786view3`, `turn2151733view2`, `turn2151733view3` |
| Omnetics assembly guide | `turn8907786view2`, `turn7719946view0` |
| Glenair SpaceWire cable | `turn8943939view2` |
| NVIDIA 100G optics | `turn2151733search2` |
| Corning 100G cables | `turn1490333search27`, `turn1490333search3` |
| NVIDIA 400G branch cable | `turn2472022view1` |
| Gore space HV cable | `turn8967351search8` |
| Glenair wire families | `turn8967351search5` |
| GOLD Rev I and electrical rule scope | `turn7559716view0`, `turn5930371view0`, `turn5930371view1`, `turn5930371view2` |
| PowerPlay 11-1 plug / receptacle, wire seals | `turn4683639view0`, `turn4683639view1` |
| Amphenol RF SMA 132100 / 132106 | `turn9234152view0`, `turn9409391view0` |
| TFlex-402 brochure / product page | `turn2094784view0`, `turn2094784view1` |
| BAE RAD750 2025 / NASA Perseverance computer | `turn2798012view1`, `turn2798012view0` |
| Moog IAU interface capabilities | `turn7542622search1`, `turn7542622search6` |
